import { requireAdminUser } from "@/server/auth/actors";
import { jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { getAdminUsers } from "@/server/services/admin-service";

export const GET = withRouteErrorHandling(async (request) => {
  await requireAdminUser(request);
  const users = await getAdminUsers();
  return jsonOk(users);
});
