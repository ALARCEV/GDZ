import { withRouteErrorHandling, jsonCreated, parseJsonBody } from "@/server/http/route";
import { guestSessionRequestSchema } from "@/server/schemas/api";
import { guestSessionService } from "@/server/services/guest-session-service";
import { quotaService } from "@/server/services/quota-service";

export const POST = withRouteErrorHandling(async (request) => {
  const payload = guestSessionRequestSchema.parse(await parseJsonBody(request));
  const session = await guestSessionService.createSession({
    utmSource: payload.utm_source,
    utmCampaign: payload.utm_campaign,
    locale: payload.locale,
    fingerprintHash: payload.fingerprint_hash
  });
  const snapshot = await quotaService.getSnapshot({
    guestSessionId: session.id
  });

  return jsonCreated({
    guest_session_id: session.id,
    expires_at: session.expiresAt.toISOString(),
    limits: {
      messages_remaining: snapshot.remaining.messages,
      images_remaining: snapshot.remaining.images,
      voice_minutes_remaining: snapshot.remaining.voiceMinutes
    }
  });
});
