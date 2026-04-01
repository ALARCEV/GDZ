import { requireAdminUser } from "@/server/auth/actors";
import { jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { getAdminUsage } from "@/server/services/admin-service";

export const GET = withRouteErrorHandling(async (request) => {
  await requireAdminUser(request);
  const usage = await getAdminUsage();
  return jsonOk(usage);
});
