import { withRouteErrorHandling, jsonOk, parseJsonBody } from "@/server/http/route";
import { chatMessageRequestSchema } from "@/server/schemas/api";
import { chatService } from "@/server/services/chat-service";
import { db } from "@/server/db/client";
import { ApiError } from "@/server/errors/api-error";
import { notFound } from "@/server/errors/api-error";

export const POST = withRouteErrorHandling(async (request) => {
  const payload = chatMessageRequestSchema.parse(await parseJsonBody(request));
  const userId = request.headers.get("x-user-id");
  const user = userId
    ? await db.user.findUnique({
        where: { id: userId }
      })
    : null;

  if (userId && !user) {
    throw notFound("Authenticated user was not found.");
  }

  try {
    const result = await chatService.sendMessage({
      chatId: payload.conversation_id,
      guestSessionId: payload.guest_session_id,
      userId,
      role: user?.role ?? null,
      responseMode: payload.response_mode,
      subject: payload.subject,
      topic: payload.topic,
      grade: payload.grade,
      message: {
        type: payload.message.type,
        contentText: payload.message.content_text,
        durationSeconds: payload.message.duration_seconds,
        attachmentId: payload.message.attachment_id
      }
    });

    return jsonOk({
      conversation_id: result.chatId,
      message_id: result.userMessageId,
      assistant_message: result.assistantMessage,
      math_render: {
        has_math: false,
        html: null
      },
      limits: result.limits,
      capture_prompt: result.capturePrompt
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === "quota_exceeded") {
      const details = (error.details ?? {}) as {
        limits?: {
          messages: number | null;
          images: number | null;
          voiceMinutes: number | null;
        };
        should_capture?: boolean;
      };

      return jsonOk({
        conversation_id: payload.conversation_id ?? "",
        message_id: "soft-limit",
        assistant_message: {
          id: "soft-limit",
          role: "assistant" as const,
          content_text:
            "Лимит на этот режим уже исчерпан. Можно сохранить прогресс, открыть историю и продолжить без потери разборов."
        },
        math_render: {
          has_math: false,
          html: null
        },
        limits: {
          messages_remaining: details.limits?.messages ?? null,
          images_remaining: details.limits?.images ?? null,
          voice_minutes_remaining: details.limits?.voiceMinutes ?? null
        },
        capture_prompt: {
          should_show: details.should_capture ?? true,
          trigger: "quota_limit"
        }
      });
    }

    throw error;
  }
});
