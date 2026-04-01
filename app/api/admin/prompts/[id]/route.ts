import { requireAdminUser } from "@/server/auth/actors";
import { parseJsonBody, jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { patchPromptProfileSchema } from "@/server/schemas/api";
import { updatePromptProfile } from "@/server/services/admin-service";

export const PATCH = withRouteErrorHandling(async (request, context) => {
  await requireAdminUser(request);
  const params = await context.params;
  const payload = patchPromptProfileSchema.parse(await parseJsonBody(request));
  const prompt = await updatePromptProfile(params.id ?? "", payload);

  return jsonOk({ item: prompt });
});
