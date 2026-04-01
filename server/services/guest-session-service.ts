import { addDays } from "@/server/utils/time";
import { db } from "@/server/db/client";
import { notFound } from "@/server/errors/api-error";

export class GuestSessionService {
  async createSession(input: {
    utmSource?: string | null;
    utmCampaign?: string | null;
    locale?: string | null;
    fingerprintHash?: string | null;
  }) {
    return db.guestSession.create({
      data: {
        expiresAt: addDays(new Date(), 7),
        utmSource: input.utmSource ?? null,
        utmCampaign: input.utmCampaign ?? null,
        locale: input.locale ?? null,
        fingerprintHash: input.fingerprintHash ?? null,
        lastSeenAt: new Date()
      }
    });
  }

  async requireSession(id: string) {
    const session = await db.guestSession.findUnique({
      where: { id }
    });

    if (!session) {
      throw notFound("Guest session not found.");
    }

    return session;
  }
}

export const guestSessionService = new GuestSessionService();
