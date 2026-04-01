import { requireExistingUser } from "@/server/auth/actors";
import { withRouteErrorHandling, jsonOk } from "@/server/http/route";
import { profileService } from "@/server/services/profile-service";

export const GET = withRouteErrorHandling(async (request) => {
  const user = await requireExistingUser(request);
  const usage = await profileService.getUsage(user.id, user.role);

  return jsonOk(usage);
});
