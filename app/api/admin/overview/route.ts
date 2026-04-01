import { requireAdminUser } from "@/server/auth/actors";
import { jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { getAdminOverview } from "@/server/services/admin-service";

export const GET = withRouteErrorHandling(async (request) => {
  await requireAdminUser(request);
  const overview = await getAdminOverview();
  return jsonOk(overview);
});
