import { requireExistingUser } from "@/server/auth/actors";
import { withRouteErrorHandling, jsonOk, parseJsonBody } from "@/server/http/route";
import { patchMeSchema } from "@/server/schemas/api";
import { profileService } from "@/server/services/profile-service";

export const GET = withRouteErrorHandling(async (request) => {
  const user = await requireExistingUser(request);
  const profile = await profileService.getMe(user.id);

  return jsonOk(profile);
});

export const PATCH = withRouteErrorHandling(async (request) => {
  const user = await requireExistingUser(request);
  const payload = patchMeSchema.parse(await parseJsonBody(request));
  const profile = await profileService.updateMe(user.id, payload);

  return jsonOk(profile);
});
