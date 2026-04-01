import { describe, expect, it } from "vitest";

import {
  buildCaptureAuditMetadata,
  CaptureService,
  hasValueMoment
} from "../server/services/capture-service";

describe("capture-service", () => {
  it("allows capture only after at least one assistant answer", () => {
    expect(hasValueMoment(0)).toBe(false);
    expect(hasValueMoment(1)).toBe(true);
  });

  it("builds audit payload for capture and consent logging", () => {
    expect(
      buildCaptureAuditMetadata({
        guestSessionId: "gs_1",
        userId: "usr_1",
        role: "parent",
        policyVersion: "mvp-v1",
        marketingAccepted: false
      })
    ).toEqual({
      capture: {
        guestSessionId: "gs_1",
        userId: "usr_1",
        role: "parent"
      },
      consent: {
        guestSessionId: "gs_1",
        userId: "usr_1",
        policyVersion: "mvp-v1",
        marketingAccepted: false
      }
    });
  });

  it("upgrades guest session, migrates chats, and persists consent logs", async () => {
    const calls: string[] = [];
    const loggerCalls: string[] = [];
    const fakeTx = {
      user: {
        create: async () => {
          calls.push("user.create");
          return { id: "usr_1", name: "Anna" };
        }
      },
      childProfile: {
        create: async () => {
          calls.push("childProfile.create");
          return { id: "child_1" };
        }
      },
      captureEvent: {
        create: async () => {
          calls.push("captureEvent.create");
          return {};
        }
      },
      consentLog: {
        createMany: async () => {
          calls.push("consentLog.createMany");
          return { count: 2 };
        }
      },
      chat: {
        updateMany: async () => {
          calls.push("chat.updateMany");
          return { count: 1 };
        }
      },
      usageEvent: {
        updateMany: async () => {
          calls.push("usageEvent.updateMany");
          return { count: 1 };
        }
      },
      guestSession: {
        update: async () => {
          calls.push("guestSession.update");
          return {};
        }
      }
    };

    const service = new CaptureService(
      {
        guestSession: {
          findUnique: async () => ({
            id: "gs_1",
            upgradedToUserId: null,
            chats: [{ messages: [{ id: "m1" }] }]
          })
        },
        user: {
          findUnique: async () => null
        },
        $transaction: async (callback: (tx: typeof fakeTx) => Promise<unknown>) => callback(fakeTx)
      } as never,
      {
        capture: () => {
          loggerCalls.push("capture");
        },
        consent: () => {
          loggerCalls.push("consent");
        }
      }
    );

    const result = await service.register({
      guestSessionId: "gs_1",
      role: "parent",
      name: "Anna",
      email: "anna@example.com",
      childGrade: 4,
      consents: {
        personalDataProcessing: true,
        marketingMessages: false
      },
      policyVersion: "mvp-v1"
    });

    expect(result.conversion.history_migrated).toBe(true);
    expect(calls).toEqual([
      "user.create",
      "childProfile.create",
      "captureEvent.create",
      "consentLog.createMany",
      "chat.updateMany",
      "usageEvent.updateMany",
      "guestSession.update"
    ]);
    expect(loggerCalls).toEqual(["capture", "consent"]);
  });
});
