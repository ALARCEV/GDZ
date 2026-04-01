import { requireAdminUser } from "@/server/auth/actors";
import { jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { getAdminSegments } from "@/server/services/admin-service";

export const GET = withRouteErrorHandling(async (request) => {
  await requireAdminUser(request);
  const segments = await getAdminSegments();
  return jsonOk(segments);
});
