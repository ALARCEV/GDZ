import { withRouteErrorHandling, jsonOk } from "@/server/http/route";
import { listPlans } from "@/server/services/plans-service";

export const GET = withRouteErrorHandling(async () => jsonOk(listPlans()));
