import { UserRole } from "@prisma/client";

import { db } from "@/server/db/client";
import { badRequest, forbidden, notFound } from "@/server/errors/api-error";
import { enforceRateLimit } from "@/server/rate-limit/hooks";
import { quotaService } from "@/server/services/quota-service";

function assertSingleChatOwner(input: {
  ownerUserId?: string | null;
  guestSessionId?: string | null;
}) {
  const ownerCount = [input.ownerUserId, input.guestSessionId].filter(Boolean).length;

  if (ownerCount !== 1) {
    throw badRequest("Chat must belong to exactly one actor: guest session or registered user.");
  }
}

export function buildAssistantReply(text: string) {
  return `MVP ответ: ${text}`;
}

export function buildAssistantReplyWithMode(text: string, responseMode?: string | null) {
  const modeLabel =
    responseMode === "step_by_step_solution"
      ? "Разберем по шагам"
      : responseMode === "answer_with_reasoning"
        ? "Коротко объясню логику"
        : responseMode === "multiple_solution_paths"
          ? "Покажу несколько подходов"
          : responseMode === "parent_help_mode"
            ? "Подскажу, как помочь ребенку"
            : "Объясню простыми словами";

  return `${modeLabel}: ${text}`;
}

export function buildChatTitle(subject: string | null | undefined, topic: string | null | undefined) {
  if (topic) {
    return topic;
  }

  if (subject) {
    return `Чат по предмету ${subject}`;
  }

  return "Новый чат";
}

type MessageInput = {
  chatId?: string | null;
  guestSessionId?: string | null;
  userId?: string | null;
  role?: UserRole | null;
  responseMode?: string | null;
  subject?: string | null;
  topic?: string | null;
  grade?: number | null;
  message: {
    type: string;
    contentText: string;
    durationSeconds?: number | null;
    attachmentId?: string | null;
  };
};

function getVoiceMinutesFromSeconds(durationSeconds?: number | null) {
  if (!durationSeconds || durationSeconds <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(durationSeconds / 60));
}

export class ChatService {
  async sendMessage(input: MessageInput) {
    if (!input.guestSessionId && !input.userId) {
      throw badRequest("Either `guest_session_id` or authenticated user is required.");
    }

    await enforceRateLimit({
      key: input.userId ?? input.guestSessionId ?? "anonymous",
      scope: "chat.message"
    });

    await quotaService.assertCanSendMessage({
      userId: input.userId,
      guestSessionId: input.guestSessionId,
      role: input.role ?? null,
      messageType: input.message.type,
      voiceMinutesRequested:
        input.message.type === "voice"
          ? getVoiceMinutesFromSeconds(input.message.durationSeconds)
          : undefined
    });

    const actorWhere = input.userId
      ? { ownerUserId: input.userId }
      : { guestSessionId: input.guestSessionId ?? undefined };

    assertSingleChatOwner({
      ownerUserId: input.userId,
      guestSessionId: input.guestSessionId
    });

    const chat =
      input.chatId != null
        ? await db.chat.findFirst({
            where: {
              id: input.chatId,
              ...actorWhere
            }
          })
        : await db.chat.create({
            data: {
              ownerUserId: input.userId ?? null,
              guestSessionId: input.guestSessionId ?? null,
              grade: input.grade ?? null,
              subject: input.subject ?? null,
              topic: input.topic ?? null,
              title: buildChatTitle(input.subject, input.topic)
            }
          });

    if (!chat) {
      throw notFound("Chat not found for current actor.");
    }

    if (
      (chat.ownerUserId && chat.ownerUserId !== input.userId) ||
      (chat.guestSessionId && chat.guestSessionId !== input.guestSessionId)
    ) {
      throw forbidden("Current actor does not have access to this chat.");
    }

    const assistantText = buildAssistantReplyWithMode(
      input.message.contentText,
      input.responseMode
    );

    const result = await db.$transaction(async (tx) => {
      const userMessage = await tx.message.create({
        data: {
          chatId: chat.id,
          role: "USER",
          messageType: input.message.type,
          contentText: input.message.contentText
        }
      });

      if (input.message.attachmentId) {
        await tx.attachment.update({
          where: { id: input.message.attachmentId },
          data: {
            messageId: userMessage.id,
            status: "READY"
          }
        });
      }

      const assistantMessage = await tx.message.create({
        data: {
          chatId: chat.id,
          role: "ASSISTANT",
          messageType: "text",
          contentText: assistantText
        }
      });

      await tx.chat.update({
        where: { id: chat.id },
        data: {
          updatedAt: new Date(),
          grade: input.grade ?? chat.grade,
          subject: input.subject ?? chat.subject,
          topic: input.topic ?? chat.topic,
          title:
            chat.title ??
            buildChatTitle(input.subject ?? chat.subject, input.topic ?? chat.topic)
        }
      });

      await tx.usageEvent.create({
        data: {
          userId: input.userId ?? null,
          guestSessionId: input.guestSessionId ?? null,
          chatId: chat.id,
          eventType: "message.sent",
          quantity: 1,
          unit: "message"
        }
      });

      if (input.message.type === "image" || input.message.type === "voice") {
        const quantity =
          input.message.type === "voice"
            ? getVoiceMinutesFromSeconds(input.message.durationSeconds)
            : 1;

        await tx.usageEvent.create({
          data: {
            userId: input.userId ?? null,
            guestSessionId: input.guestSessionId ?? null,
            chatId: chat.id,
            eventType:
              input.message.type === "image" ? "attachment.image" : "attachment.voice",
            quantity,
            unit: input.message.type === "image" ? "image" : "minute"
          }
        });
      }

      return {
        userMessage,
        assistantMessage
      };
    });

    const refreshedSnapshot = await quotaService.getSnapshot({
      userId: input.userId,
      guestSessionId: input.guestSessionId,
      role: input.role ?? null
    });

    return {
      chatId: chat.id,
      userMessageId: result.userMessage.id,
      assistantMessage: {
        id: result.assistantMessage.id,
        role: "assistant",
        content_text: result.assistantMessage.contentText
      },
      limits: {
        messages_remaining: refreshedSnapshot.remaining.messages,
        images_remaining: refreshedSnapshot.remaining.images,
        voice_minutes_remaining: refreshedSnapshot.remaining.voiceMinutes
      },
      capturePrompt: {
        should_show: refreshedSnapshot.shouldCapture,
        trigger: refreshedSnapshot.shouldCapture ? "value_moment" : null
      }
    };
  }

  async getChatForActor(input: { chatId: string; userId?: string | null; guestSessionId?: string | null }) {
    const chat = await db.chat.findFirst({
      where: input.userId
        ? {
            id: input.chatId,
            ownerUserId: input.userId
          }
        : {
            id: input.chatId,
            guestSessionId: input.guestSessionId ?? undefined
          },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc"
          },
          include: {
            attachments: true
          }
        }
      }
    });

    if (!chat) {
      throw notFound("Chat not found for current actor.");
    }

    return chat;
  }

  async createRegisteredChat(input: {
    userId: string;
    childProfileId?: string | null;
    grade?: number | null;
    subject?: string | null;
    topic?: string | null;
    title?: string | null;
  }) {
    assertSingleChatOwner({
      ownerUserId: input.userId,
      guestSessionId: null
    });

    return db.chat.create({
      data: {
        ownerUserId: input.userId,
        childProfileId: input.childProfileId ?? null,
        grade: input.grade ?? null,
        subject: input.subject ?? null,
        topic: input.topic ?? null,
        title: input.title ?? buildChatTitle(input.subject, input.topic)
      }
    });
  }

  async updateRegisteredChat(input: {
    chatId: string;
    userId: string;
    title?: string | null;
    subject?: string | null;
    topic?: string | null;
    archivedAt?: Date | null;
  }) {
    const chat = await db.chat.findFirst({
      where: {
        id: input.chatId,
        ownerUserId: input.userId
      }
    });

    if (!chat) {
      throw notFound("Chat not found for current user.");
    }

    return db.chat.update({
      where: { id: chat.id },
      data: {
        title: input.title ?? chat.title,
        subject: input.subject ?? chat.subject,
        topic: input.topic ?? chat.topic,
        archivedAt: input.archivedAt === undefined ? chat.archivedAt : input.archivedAt
      }
    });
  }
}

export const chatService = new ChatService();
