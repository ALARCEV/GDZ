import { requireAdminUser } from "@/server/auth/actors";
import { jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { getAdminPrompts } from "@/server/services/admin-service";

export const GET = withRouteErrorHandling(async (request) => {
  await requireAdminUser(request);
  const prompts = await getAdminPrompts();
  return jsonOk(prompts);
});
