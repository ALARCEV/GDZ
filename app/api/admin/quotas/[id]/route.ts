import { requireAdminUser } from "@/server/auth/actors";
import { parseJsonBody, jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { patchQuotaPolicySchema } from "@/server/schemas/api";
import { updateQuotaPolicy } from "@/server/services/admin-service";

export const PATCH = withRouteErrorHandling(async (request, context) => {
  await requireAdminUser(request);
  const params = await context.params;
  const payload = patchQuotaPolicySchema.parse(await parseJsonBody(request));
  const quota = await updateQuotaPolicy(params.id ?? "", payload);

  return jsonOk({ item: quota });
});
