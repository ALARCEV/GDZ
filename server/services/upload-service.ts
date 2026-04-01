import { AttachmentKind, UserRole } from "@prisma/client";

import { db } from "@/server/db/client";
import { badRequest, forbidden, notFound } from "@/server/errors/api-error";
import { objectStorage } from "@/server/storage/object-storage";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export class UploadService {
  async registerUpload(input: {
    kind: "image" | "voice";
    conversationId?: string | null;
    guestSessionId?: string | null;
    userId?: string | null;
    role?: UserRole | null;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds?: number;
  }) {
    if (!input.userId && !input.guestSessionId) {
      throw badRequest("Upload registration requires a guest session or authenticated user.");
    }

    const conversation =
      input.conversationId != null
        ? await db.chat.findFirst({
            where: input.userId
              ? { id: input.conversationId, ownerUserId: input.userId }
              : { id: input.conversationId, guestSessionId: input.guestSessionId ?? undefined }
          })
        : await db.chat.create({
            data: {
              ownerUserId: input.userId ?? null,
              guestSessionId: input.guestSessionId ?? null,
              title: input.kind === "image" ? "Фото-вопрос" : "Голосовой вопрос"
            }
          });

    if (!conversation) {
      throw notFound("Conversation was not found for current actor.");
    }

    if (
      (conversation.ownerUserId && conversation.ownerUserId !== input.userId) ||
      (conversation.guestSessionId && conversation.guestSessionId !== input.guestSessionId)
    ) {
      throw forbidden("Current actor does not have access to this conversation.");
    }

    const signedUpload = await objectStorage.createSignedUpload(
      `chat/${conversation.id}/${Date.now()}-${sanitizeFileName(input.fileName)}`,
      input.mimeType
    );

    const attachment = await db.attachment.create({
      data: {
        chatId: conversation.id,
        kind: input.kind === "image" ? AttachmentKind.IMAGE : AttachmentKind.VOICE,
        status: "PENDING",
        fileKey: signedUpload.key,
        fileUrl: signedUpload.publicUrl,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        durationSeconds: input.durationSeconds ?? null
      }
    });

    return {
      attachment_id: attachment.id,
      conversation_id: conversation.id,
      upload_url: signedUpload.uploadUrl,
      file_url: signedUpload.publicUrl,
      expires_at: signedUpload.expiresAt
    };
  }
}

export const uploadService = new UploadService();
