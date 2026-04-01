import { requireExistingUser } from "@/server/auth/actors";
import { withRouteErrorHandling, jsonOk } from "@/server/http/route";
import { historyService } from "@/server/services/history-service";

export const GET = withRouteErrorHandling(async (request) => {
  const user = await requireExistingUser(request);
  const filters = await historyService.getFilterFacets(user.id, user.role);

  return jsonOk(filters);
});
