import { requireExistingUser } from "@/server/auth/actors";
import {
  withRouteErrorHandling,
  jsonCreated,
  jsonOk,
  parseJsonBody,
  parseOptionalDateQueryParam
} from "@/server/http/route";
import { serializeConversationSummary } from "@/server/http/serializers";
import { createConversationSchema } from "@/server/schemas/api";
import { chatService } from "@/server/services/chat-service";
import { historyService } from "@/server/services/history-service";
import { db } from "@/server/db/client";

export const GET = withRouteErrorHandling(async (request) => {
  const user = await requireExistingUser(request);

  const subject = request.nextUrl.searchParams.get("subject") ?? undefined;
  const topic = request.nextUrl.searchParams.get("topic") ?? undefined;
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const role = request.nextUrl.searchParams.get("role") ?? undefined;
  const grade = request.nextUrl.searchParams.get("grade");
  const parsedGrade = grade ? Number(grade) : undefined;
  const dateFromRaw = request.nextUrl.searchParams.get("date_from");
  const dateToRaw = request.nextUrl.searchParams.get("date_to");

  const result = await historyService.listChats(user.id, {
    month,
    role,
    grade: Number.isFinite(parsedGrade) ? parsedGrade : undefined,
    subject,
    topic,
    dateFrom: parseOptionalDateQueryParam(dateFromRaw, "date_from"),
    dateTo: parseOptionalDateQueryParam(dateToRaw, "date_to")
  });

  return jsonOk(result);
});

export const POST = withRouteErrorHandling(async (request) => {
  const user = await requireExistingUser(request);
  const payload = createConversationSchema.parse(await parseJsonBody(request));
  const userWithChildren = await db.user.findUnique({
    where: { id: user.id },
    include: {
      childProfiles: true
    }
  });

  const chat = await chatService.createRegisteredChat({
    userId: user.id,
    childProfileId: userWithChildren?.childProfiles[0]?.id ?? null,
    grade: payload.grade,
    subject: payload.subject,
    topic: payload.topic,
    title: payload.title
  });

  return jsonCreated({
    conversation: serializeConversationSummary(chat)
  });
});
