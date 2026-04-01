import { requireAdminUser } from "@/server/auth/actors";
import { jsonOk, withRouteErrorHandling } from "@/server/http/route";
import { getAdminSegments } from "@/server/services/admin-service";

export const GET = withRouteErrorHandling(async (request) => {
  await requireAdminUser(request);
  const segments = await getAdminSegments();
  return jsonOk({
    exported_at: new Date().toISOString(),
    items: segments.items.map((segment) => ({
      key: segment.key,
      label: segment.label,
      count: segment.count,
      csv: segment.csv
    }))
  });
});
