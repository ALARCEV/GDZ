import { getIpAddress, getUserAgent } from "@/server/auth/actors";
import { withRouteErrorHandling, jsonCreated, parseJsonBody } from "@/server/http/route";
import { captureRegisterSchema } from "@/server/schemas/api";
import { captureService } from "@/server/services/capture-service";

export const POST = withRouteErrorHandling(async (request) => {
  const payload = captureRegisterSchema.parse(await parseJsonBody(request));
  const result = await captureService.register({
    guestSessionId: payload.guest_session_id,
    role: payload.role,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    childGrade: payload.child_grade,
    studentAge: payload.student_age,
    trigger: payload.trigger,
    consents: {
      personalDataProcessing: payload.consents.personal_data_processing,
      marketingMessages: payload.consents.marketing_messages
    },
    ipAddress: getIpAddress(request),
    userAgent: getUserAgent(request),
    policyVersion: "mvp-v1"
  });

  return jsonCreated(result);
});
