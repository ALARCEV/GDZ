import { describe, expect, it } from "vitest";

import { evaluateQuota, summarizeUsage } from "../server/services/quota-service";

describe("quota-service", () => {
  it("computes remaining guest limits and capture trigger", () => {
    const usage = summarizeUsage(
      [
        {
          eventType: "message.sent",
          quantity: 1,
          createdAt: new Date("2026-04-01T08:00:00.000Z")
        },
        {
          eventType: "message.sent",
          quantity: 1,
          createdAt: new Date("2026-04-01T09:00:00.000Z")
        },
        {
          eventType: "attachment.image",
          quantity: 1,
          createdAt: new Date("2026-04-01T09:30:00.000Z")
        }
      ],
      new Date("2026-04-01T10:00:00.000Z")
    );

    const snapshot = evaluateQuota(
      {
        name: "guest_default",
        userSegment: "guest",
        dailyMessages: 5,
        dailyImages: 2,
        dailyVoiceMinutes: 3,
        monthlyMessages: null,
        saveHistoryEnabled: false,
        captureAfterValue: 1,
        softLimit: true,
        billingPlanCode: null
      },
      usage
    );

    expect(snapshot.remaining.messages).toBe(3);
    expect(snapshot.remaining.images).toBe(1);
    expect(snapshot.shouldCapture).toBe(true);
  });
});
