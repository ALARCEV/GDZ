import { QuotaPolicy, UsageEvent, UserRole } from "@prisma/client";

import { db } from "@/server/db/client";
import { quotaExceeded } from "@/server/errors/api-error";

export type UsageTotals = {
  messages: number;
  images: number;
  voiceMinutes: number;
};

export type QuotaSnapshot = {
  policy: Pick<
    QuotaPolicy,
    | "name"
    | "userSegment"
    | "dailyMessages"
    | "dailyImages"
    | "dailyVoiceMinutes"
    | "monthlyMessages"
    | "saveHistoryEnabled"
    | "captureAfterValue"
    | "softLimit"
    | "billingPlanCode"
  >;
  used: UsageTotals;
  remaining: {
    messages: number | null;
    images: number | null;
    voiceMinutes: number | null;
  };
  shouldCapture: boolean;
};

function remaining(limit: number | null, used: number) {
  return limit == null ? null : Math.max(limit - used, 0);
}

function isSameUtcDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function isSameUtcMonth(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth()
  );
}

export function summarizeUsage(
  events: Pick<UsageEvent, "eventType" | "quantity" | "createdAt">[],
  now = new Date()
) {
  return events.reduce(
    (summary, event) => {
      const quantity = event.quantity ?? 1;
      const isDay = isSameUtcDay(event.createdAt, now);
      const isMonth = isSameUtcMonth(event.createdAt, now);

      if (event.eventType === "message.sent") {
        if (isDay) {
          summary.daily.messages += quantity;
        }
        if (isMonth) {
          summary.monthly.messages += quantity;
        }
      }

      if (event.eventType === "attachment.image") {
        if (isDay) {
          summary.daily.images += quantity;
        }
      }

      if (event.eventType === "attachment.voice") {
        if (isDay) {
          summary.daily.voiceMinutes += quantity;
        }
      }

      return summary;
    },
    {
      daily: {
        messages: 0,
        images: 0,
        voiceMinutes: 0
      },
      monthly: {
        messages: 0
      }
    }
  );
}

export function evaluateQuota(
  policy: Pick<
    QuotaPolicy,
    | "name"
    | "userSegment"
    | "dailyMessages"
    | "dailyImages"
    | "dailyVoiceMinutes"
    | "monthlyMessages"
    | "saveHistoryEnabled"
    | "captureAfterValue"
    | "softLimit"
    | "billingPlanCode"
  >,
  usage: ReturnType<typeof summarizeUsage>
): QuotaSnapshot {
  const dailyMessageRemaining = remaining(policy.dailyMessages, usage.daily.messages);
  const monthlyMessageRemaining = remaining(policy.monthlyMessages, usage.monthly.messages);
  const remainingMessages =
    dailyMessageRemaining == null
      ? monthlyMessageRemaining
      : monthlyMessageRemaining == null
        ? dailyMessageRemaining
        : Math.min(dailyMessageRemaining, monthlyMessageRemaining);
  const remainingImages = remaining(policy.dailyImages, usage.daily.images);
  const remainingVoiceMinutes = remaining(policy.dailyVoiceMinutes, usage.daily.voiceMinutes);

  return {
    policy,
    used: {
      messages: usage.daily.messages,
      images: usage.daily.images,
      voiceMinutes: usage.daily.voiceMinutes
    },
    remaining: {
      messages: remainingMessages,
      images: remainingImages,
      voiceMinutes: remainingVoiceMinutes
    },
    shouldCapture:
      policy.userSegment === "guest" && usage.daily.messages >= Math.max(policy.captureAfterValue, 1)
  };
}

export function resolveUserSegment(params: {
  role: UserRole | null;
  guestSessionId?: string | null;
  billingPlanCode?: string | null;
}) {
  if (params.role === "ADMIN") {
    return "admin";
  }

  if (params.guestSessionId) {
    return "guest";
  }

  if (params.billingPlanCode) {
    return "paid_pack";
  }

  return "registered_free";
}

export class QuotaService {
  async logQuotaOverrun(params: {
    userId?: string | null;
    guestSessionId?: string | null;
    eventType: "quota.overrun.message" | "quota.overrun.image" | "quota.overrun.voice";
  }) {
    await db.usageEvent.create({
      data: {
        userId: params.userId ?? null,
        guestSessionId: params.guestSessionId ?? null,
        eventType: params.eventType,
        quantity: 1,
        unit: "overrun"
      }
    });
  }

  async getPolicy(input: { userSegment: string; billingPlanCode?: string | null }) {
    const policy = await db.quotaPolicy.findFirst({
      where: {
        userSegment: input.userSegment,
        ...(input.billingPlanCode ? { billingPlanCode: input.billingPlanCode } : {}),
        active: true
      },
      orderBy: {
        name: "asc"
      }
    });

    if (!policy) {
      throw quotaExceeded(`No active quota policy configured for segment \`${input.userSegment}\`.`);
    }

    return policy;
  }

  async getSnapshot(params: {
    userId?: string | null;
    guestSessionId?: string | null;
    role?: UserRole | null;
    now?: Date;
  }) {
    const user =
      params.userId != null
        ? await db.user.findUnique({
            where: { id: params.userId },
            select: { billingPlanCode: true, role: true }
          })
        : null;
    const userSegment = resolveUserSegment({
      role: params.role ?? user?.role ?? null,
      guestSessionId: params.guestSessionId,
      billingPlanCode: user?.billingPlanCode ?? null
    });
    const policy = await this.getPolicy({
      userSegment,
      billingPlanCode: user?.billingPlanCode ?? null
    });
    const events = await db.usageEvent.findMany({
      where: params.userId
        ? { userId: params.userId }
        : { guestSessionId: params.guestSessionId ?? undefined }
    });
    const summary = summarizeUsage(events, params.now);

    return evaluateQuota(policy, summary);
  }

  async assertCanSendMessage(params: {
    userId?: string | null;
    guestSessionId?: string | null;
    role?: UserRole | null;
    now?: Date;
    messageType?: string | null;
    voiceMinutesRequested?: number;
  }) {
    const snapshot = await this.getSnapshot(params);

    if (snapshot.remaining.messages === 0) {
      await this.logQuotaOverrun({
        userId: params.userId,
        guestSessionId: params.guestSessionId,
        eventType: "quota.overrun.message"
      });

      throw quotaExceeded("Daily or monthly message limit reached for the current actor.", {
        limits: snapshot.remaining,
        policy: snapshot.policy.name,
        should_capture: snapshot.shouldCapture
      });
    }

    if (params.messageType === "image" && snapshot.remaining.images === 0) {
      await this.logQuotaOverrun({
        userId: params.userId,
        guestSessionId: params.guestSessionId,
        eventType: "quota.overrun.image"
      });

      throw quotaExceeded("Daily image limit reached for the current actor.", {
        limits: snapshot.remaining,
        policy: snapshot.policy.name,
        should_capture: snapshot.shouldCapture
      });
    }

    if (
      params.messageType === "voice" &&
      snapshot.remaining.voiceMinutes != null &&
      snapshot.remaining.voiceMinutes < (params.voiceMinutesRequested ?? 1)
    ) {
      await this.logQuotaOverrun({
        userId: params.userId,
        guestSessionId: params.guestSessionId,
        eventType: "quota.overrun.voice"
      });

      throw quotaExceeded("Daily voice limit reached for the current actor.", {
        limits: snapshot.remaining,
        policy: snapshot.policy.name,
        should_capture: snapshot.shouldCapture
      });
    }

    return snapshot;
  }
}

export const quotaService = new QuotaService();
