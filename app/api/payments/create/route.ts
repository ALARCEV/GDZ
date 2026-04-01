import { badRequest } from "@/server/errors/api-error";
import { withRouteErrorHandling, jsonCreated, parseJsonBody } from "@/server/http/route";
import { getPlanById } from "@/server/services/plans-service";

export const POST = withRouteErrorHandling(async (request) => {
  const payload = (await parseJsonBody<{ plan_id?: string }>(request)) ?? {};

  if (!payload.plan_id) {
    throw badRequest("`plan_id` is required.");
  }

  const plan = getPlanById(payload.plan_id);

  if (!plan) {
    throw badRequest("Selected plan was not found.");
  }

  return jsonCreated({
    payment_id: `pay_${Date.now()}`,
    status: "pending",
    provider: "tbd",
    checkout_url: `/payments/checkout?plan=${plan.id}`
  });
});
