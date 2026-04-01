import { db } from "@/server/db/client";
import { notFound } from "@/server/errors/api-error";
import { withRouteErrorHandling, jsonCreated, parseJsonBody } from "@/server/http/route";
import { uploadImageSchema } from "@/server/schemas/api";
import { uploadService } from "@/server/services/upload-service";

export const POST = withRouteErrorHandling(async (request) => {
  const payload = uploadImageSchema.parse(await parseJsonBody(request));
  const userId = request.headers.get("x-user-id");
  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;

  if (userId && !user) {
    throw notFound("Authenticated user was not found.");
  }

  const result = await uploadService.registerUpload({
    kind: "image",
    conversationId: payload.conversation_id,
    guestSessionId: payload.guest_session_id,
    userId,
    role: user?.role ?? null,
    fileName: payload.file_name,
    mimeType: payload.mime_type,
    sizeBytes: payload.size_bytes
  });

  return jsonCreated(result);
});
