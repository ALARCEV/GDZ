import { requireExistingUser } from "@/server/auth/actors";
import {
  withRouteErrorHandling,
  jsonOk,
  parseJsonBody,
  requireRouteParam
} from "@/server/http/route";
import {
  serializeConversationDetail,
  serializeConversationSummary
} from "@/server/http/serializers";
import { patchConversationSchema } from "@/server/schemas/api";
import { chatService } from "@/server/services/chat-service";

export const GET = withRouteErrorHandling(async (request, context) => {
  const user = await requireExistingUser(request);
  const chatId = await requireRouteParam(context, "id");

  const chat = await chatService.getChatForActor({
    chatId,
    userId: user.id
  });

  return jsonOk({
    conversation: serializeConversationDetail(chat)
  });
});

export const PATCH = withRouteErrorHandling(async (request, context) => {
  const user = await requireExistingUser(request);
  const chatId = await requireRouteParam(context, "id");

  const payload = patchConversationSchema.parse(await parseJsonBody(request));
  const chat = await chatService.updateRegisteredChat({
    chatId,
    userId: user.id,
    title: payload.title,
    subject: payload.subject,
    topic: payload.topic,
    archivedAt:
      payload.archived_at === undefined
        ? undefined
        : payload.archived_at === null
          ? null
          : new Date(payload.archived_at)
  });

  return jsonOk({
    conversation: serializeConversationSummary({
      ...chat,
      archivedAt: chat.archivedAt
    })
  });
});
