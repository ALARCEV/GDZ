import { withRouteErrorHandling, jsonOk, requireRouteParam } from "@/server/http/route";
import { serializeConversationDetail } from "@/server/http/serializers";
import { chatService } from "@/server/services/chat-service";

export const GET = withRouteErrorHandling(async (request, context) => {
  const chatId = await requireRouteParam(context, "id");

  const userId = request.headers.get("x-user-id");
  const guestSessionId = request.nextUrl.searchParams.get("guest_session_id");

  const chat = await chatService.getChatForActor({
    chatId,
    userId,
    guestSessionId
  });

  return jsonOk({
    conversation: serializeConversationDetail(chat)
  });
});
