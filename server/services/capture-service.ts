import { db } from "@/server/db/client";
import { badRequest, conflict, notFound, unprocessable } from "@/server/errors/api-error";
import { auditLogger } from "@/server/logging/audit";
import { hashValue } from "@/server/utils/hash";

const PERSONAL_DATA_PROCESSING = "PERSONAL_DATA_PROCESSING" as const;
const MARKETING_MESSAGES = "MARKETING_MESSAGES" as const;

export function hasValueMoment(assistantMessagesCount: number) {
  return assistantMessagesCount >= 1;
}

export function buildCaptureAuditMetadata(input: {
  guestSessionId: string;
  userId: string;
  role: "parent" | "student";
  policyVersion: string;
  marketingAccepted: boolean;
}) {
  return {
    capture: {
      guestSessionId: input.guestSessionId,
      userId: input.userId,
      role: input.role
    },
    consent: {
      guestSessionId: input.guestSessionId,
      userId: input.userId,
      policyVersion: input.policyVersion,
      marketingAccepted: input.marketingAccepted
    }
  };
}

type CaptureDb = typeof db;
type UserRoleValue = "PARENT" | "STUDENT" | "ADMIN";
type CaptureTriggerValue =
  | "SAVE_CHAT"
  | "OPEN_HISTORY"
  | "QUOTA_LIMIT"
  | "UNLOCK_MODALITY"
  | "PARENT_CHEATSHEET";

export class CaptureService {
  constructor(
    private readonly database: CaptureDb = db,
    private readonly logger: typeof auditLogger = auditLogger
  ) {}

  async register(input: {
    guestSessionId: string;
    role: "parent" | "student";
    name: string;
    email?: string | null;
    phone?: string | null;
    childGrade?: number | null;
    studentAge?: number | null;
    trigger?: CaptureTriggerValue;
    consents: {
      personalDataProcessing: boolean;
      marketingMessages: boolean;
    };
    ipAddress?: string | null;
    userAgent?: string | null;
    policyVersion: string;
  }) {
    if (!input.consents.personalDataProcessing) {
      throw unprocessable("Personal data processing consent is required.");
    }

    if (!input.email && !input.phone) {
      throw unprocessable("Either email or phone is required for capture.");
    }

    if (input.role === "parent" && !input.childGrade) {
      throw unprocessable("Parent capture requires `child_grade`.");
    }

    if (input.role === "student" && !input.studentAge) {
      throw unprocessable("Student capture requires `student_age`.");
    }

    const guestSession = await this.database.guestSession.findUnique({
      where: { id: input.guestSessionId },
      include: {
        chats: {
          include: {
            messages: {
              where: {
                role: "ASSISTANT"
              }
            }
          }
        }
      }
    });

    if (!guestSession) {
      throw notFound("Guest session not found.");
    }

    if (guestSession.upgradedToUserId) {
      throw conflict("Guest session has already been upgraded.");
    }

    const assistantMessagesCount = guestSession.chats.reduce(
      (count, chat) => count + chat.messages.length,
      0
    );

    if (!hasValueMoment(assistantMessagesCount)) {
      throw badRequest("Capture is available only after the first value moment.");
    }

    const existingUser =
      input.email != null
        ? await this.database.user.findUnique({ where: { email: input.email } })
        : null;

    if (existingUser) {
      throw conflict("A user with this email already exists.");
    }

    const userRole: UserRoleValue = input.role === "parent" ? "PARENT" : "STUDENT";

    const result = await this.database.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: userRole,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          studentAge: input.role === "student" ? input.studentAge ?? null : null,
          isGuestConverted: true
        }
      });

      const childProfile =
        input.role === "parent"
          ? await tx.childProfile.create({
              data: {
                parentId: user.id,
                grade: input.childGrade!,
                firstName: null
              }
            })
          : null;

      await tx.captureEvent.create({
        data: {
          guestSessionId: guestSession.id,
          registeredUserId: user.id,
          trigger: input.trigger ?? "SAVE_CHAT",
          status: "COMPLETED",
          metadataJson: {
            role: input.role,
            migratedChats: guestSession.chats.length
          }
        }
      });

      await tx.consentLog.createMany({
        data: [
          {
            userId: user.id,
            guestSessionId: guestSession.id,
            consentType: PERSONAL_DATA_PROCESSING,
            accepted: true,
            ipHash: hashValue(input.ipAddress),
            userAgentHash: hashValue(input.userAgent),
            policyVersion: input.policyVersion
          },
          {
            userId: user.id,
            guestSessionId: guestSession.id,
            consentType: MARKETING_MESSAGES,
            accepted: input.consents.marketingMessages,
            ipHash: hashValue(input.ipAddress),
            userAgentHash: hashValue(input.userAgent),
            policyVersion: input.policyVersion
          }
        ]
      });

      await tx.chat.updateMany({
        where: {
          guestSessionId: guestSession.id
        },
        data: {
          ownerUserId: user.id,
          guestSessionId: null,
          childProfileId: childProfile?.id ?? null
        }
      });

      await tx.usageEvent.updateMany({
        where: {
          guestSessionId: guestSession.id
        },
        data: {
          userId: user.id,
          guestSessionId: null
        }
      });

      await tx.guestSession.update({
        where: { id: guestSession.id },
        data: {
          upgradedToUserId: user.id,
          upgradedAt: new Date()
        }
      });

      return {
        user,
        childProfile
      };
    });

    const auditMetadata = buildCaptureAuditMetadata({
      guestSessionId: input.guestSessionId,
      userId: result.user.id,
      role: input.role,
      policyVersion: input.policyVersion,
      marketingAccepted: input.consents.marketingMessages
    });

    this.logger.capture("register", auditMetadata.capture);
    this.logger.consent("capture_register", auditMetadata.consent);

    return {
      user: {
        id: result.user.id,
        role: input.role,
        name: result.user.name
      },
      conversion: {
        guest_session_id: input.guestSessionId,
        history_migrated: true
      }
    };
  }
}

export const captureService = new CaptureService();
