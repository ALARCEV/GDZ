import { db } from "@/server/db/client";
import { notFound } from "@/server/errors/api-error";

const DAY_MS = 24 * 60 * 60 * 1000;
const USER_ROLE_PARENT = "PARENT" as const;
const USER_ROLE_ADMIN = "ADMIN" as const;
const CAPTURE_STATUS_COMPLETED = "COMPLETED" as const;
const CAPTURE_TRIGGERS = [
  "SAVE_CHAT",
  "OPEN_HISTORY",
  "QUOTA_LIMIT",
  "UNLOCK_MODALITY",
  "PARENT_CHEATSHEET"
] as const;

type SegmentExport = {
  key: string;
  label: string;
  description: string;
  count: number;
  csv: string;
};

type AdminUserWithLeadStats = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  status: string;
  grade: number | null;
  isGuestConverted: boolean;
  convertedSessions: number;
  marketingConsent: boolean;
  lastActivityAt: Date | null;
  messagesUsed: number;
};

type AdminDbUser = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  status: string;
  studentAge: number | null;
  isGuestConverted: boolean;
  childProfiles: Array<{ grade: number | null }>;
  usageEvents: Array<{ createdAt: Date; eventType: string; quantity: number }>;
  consentLogs: Array<{ consentType: string; accepted: boolean }>;
  convertedSessions: Array<unknown>;
};

type GuestSessionSummary = {
  upgradedToUserId: string | null;
  usageEvents?: Array<unknown>;
};

type RegisteredUserSummary = {
  id: string;
  usageEvents: Array<unknown>;
};

type UsageEventSummary = {
  createdAt: Date;
  quantity: number;
  eventType: string;
  estimatedCost?: { toString(): string } | number | null;
};

type CaptureEventSummary = {
  id: string;
  createdAt: Date;
  trigger: string;
  status: string;
  guestSessionId: string;
  guestSession: {
    utmSource: string | null;
  };
  registeredUser?: {
    name: string | null;
  } | null;
};

type ChatOwnerSummary = {
  ownerUserId: string | null;
};

type ConsentLogSummary = {
  consentType: string;
  accepted: boolean;
};

type QuotaPolicySummary = {
  id: string;
  name: string;
  userSegment: string;
  dailyMessages: number | null;
  dailyImages: number | null;
  dailyVoiceMinutes: number | null;
  monthlyMessages: number | null;
  billingPlanCode: string | null;
  saveHistoryEnabled: boolean;
  captureAfterValue: number;
  softLimit: boolean;
  active: boolean;
};

type PromptProfileSummary = {
  id: string;
  active: boolean;
  label: string;
  gradeFrom: number;
  gradeTo: number;
  mode: string;
  systemPrompt: string;
  parentOverlayPrompt: string | null;
  subjectOverridesJson: Record<string, string> | null;
};

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function toIsoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function decimalToNumber(value: { toString(): string } | number | null | undefined) {
  return value == null ? 0 : Number(value);
}

function formatCsvRow(values: Array<string | number | boolean | null | undefined>) {
  return values
    .map((value) => {
      if (value == null) {
        return "";
      }

      const normalized = String(value).replace(/"/g, "\"\"");
      return `"${normalized}"`;
    })
    .join(",");
}

function aggregateSeries(events: Array<{ createdAt: Date; quantity: number }>, days: number) {
  const today = startOfDay(new Date());
  const start = addDays(today, -(days - 1));
  const map = new Map<string, number>();

  for (let offset = 0; offset < days; offset += 1) {
    map.set(toIsoDay(addDays(start, offset)), 0);
  }

  for (const event of events) {
    if (event.createdAt < start) {
      continue;
    }

    const key = toIsoDay(startOfDay(event.createdAt));
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + (event.quantity || 1));
    }
  }

  return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
}

async function getUsersWithLeadStats() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      childProfiles: true,
      usageEvents: {
        orderBy: { createdAt: "desc" }
      },
      consentLogs: true,
      convertedSessions: true
    }
  });

  return users.map((user: AdminDbUser): AdminUserWithLeadStats => {
    const lastActivityAt = user.usageEvents[0]?.createdAt ?? null;
    const messagesUsed = user.usageEvents
      .filter((event: { eventType: string }) => event.eventType === "message.sent")
      .reduce((sum: number, event: { quantity: number }) => sum + event.quantity, 0);
    const marketingConsent = user.consentLogs.some(
      (log: { consentType: string; accepted: boolean }) =>
        log.consentType === "MARKETING_MESSAGES" && log.accepted
    );

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      status: user.status,
      grade:
        user.childProfiles[0]?.grade ??
        (user.role === USER_ROLE_PARENT ? null : user.studentAge),
      isGuestConverted: user.isGuestConverted,
      convertedSessions: user.convertedSessions.length,
      marketingConsent,
      lastActivityAt,
      messagesUsed
    };
  });
}

export async function getAdminOverview() {
  const today = startOfDay(new Date());
  const last30Days = addDays(today, -29);
  const [guestSessions, usageEvents, registeredUsers, captureEvents, chats] = await Promise.all([
    db.guestSession.findMany({
      where: { createdAt: { gte: last30Days } },
      include: {
        usageEvents: true
      }
    }),
    db.usageEvent.findMany({
      where: { createdAt: { gte: addDays(today, -13) } },
      orderBy: { createdAt: "asc" }
    }),
    db.user.findMany({
      where: { role: { not: USER_ROLE_ADMIN } },
      include: {
        usageEvents: {
          where: { createdAt: { gte: addDays(today, -6) } }
        }
      }
    }),
    db.captureEvent.findMany({
      where: { createdAt: { gte: last30Days } }
    }),
    db.chat.findMany({
      where: { updatedAt: { gte: addDays(today, -6) }, ownerUserId: { not: null } },
      distinct: ["ownerUserId"]
    })
  ]);

  const convertedGuests = guestSessions.filter(
    (session: GuestSessionSummary) => session.upgradedToUserId != null
  ).length;
  const activeUsers = new Set(
    registeredUsers
      .filter((user: RegisteredUserSummary) => user.usageEvents.length > 0)
      .map((user: RegisteredUserSummary) => user.id)
      .concat(
        chats.map((chat: ChatOwnerSummary) => chat.ownerUserId).filter(Boolean) as string[]
      )
  ).size;

  const messageEvents = usageEvents.filter(
    (event: UsageEventSummary) => event.eventType === "message.sent"
  );
  const photoEvents = usageEvents.filter(
    (event: UsageEventSummary) => event.eventType === "attachment.image"
  );
  const voiceEvents = usageEvents.filter(
    (event: UsageEventSummary) => event.eventType === "attachment.voice"
  );

  const quotaOverrunEvents = usageEvents.filter((event: UsageEventSummary) =>
    event.eventType.startsWith("quota.overrun.")
  );

  return {
    metrics: {
      guestToRegisteredConversion: guestSessions.length
        ? Number(((convertedGuests / guestSessions.length) * 100).toFixed(1))
        : 0,
      activeUsers,
      messagesToday: messageEvents
        .filter((event: UsageEventSummary) => startOfDay(event.createdAt).getTime() === today.getTime())
        .reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0),
      photoRequestsToday: photoEvents
        .filter((event: UsageEventSummary) => startOfDay(event.createdAt).getTime() === today.getTime())
        .reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0),
      voiceRequestsToday: voiceEvents
        .filter((event: UsageEventSummary) => startOfDay(event.createdAt).getTime() === today.getTime())
        .reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0),
      quotaOverrunsToday: quotaOverrunEvents
        .filter((event: UsageEventSummary) => startOfDay(event.createdAt).getTime() === today.getTime())
        .reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0)
    },
    trends: {
      messagesPerDay: aggregateSeries(
        messageEvents.map((event: UsageEventSummary) => ({ createdAt: event.createdAt, quantity: event.quantity })),
        14
      ),
      photoRequestsPerDay: aggregateSeries(
        photoEvents.map((event: UsageEventSummary) => ({ createdAt: event.createdAt, quantity: event.quantity })),
        14
      ),
      voiceRequestsPerDay: aggregateSeries(
        voiceEvents.map((event: UsageEventSummary) => ({ createdAt: event.createdAt, quantity: event.quantity })),
        14
      )
    },
    capture: {
      totalGuestSessions: guestSessions.length,
      convertedGuests,
      completedCaptures: captureEvents.filter(
        (event: CaptureEventSummary) => event.status === CAPTURE_STATUS_COMPLETED
      )
        .length,
      triggers: CAPTURE_TRIGGERS.map((trigger) => ({
        trigger,
        count: captureEvents.filter((event: CaptureEventSummary) => event.trigger === trigger).length
      }))
    }
  };
}

export async function getAdminUsers() {
  const users = await getUsersWithLeadStats();

  return {
    items: users.map((user: AdminUserWithLeadStats) => ({
      ...user,
      lastActivityAt: user.lastActivityAt?.toISOString() ?? null,
      segment: user.marketingConsent
        ? "broadcast-ready"
        : user.lastActivityAt == null
          ? "captured-no-usage"
          : user.messagesUsed >= 10
            ? "power-user"
            : "active"
    }))
  };
}

export async function getAdminUsage() {
  const [usageEvents, users] = await Promise.all([
    db.usageEvent.findMany({
      where: { createdAt: { gte: addDays(startOfDay(new Date()), -29) } },
      orderBy: { createdAt: "asc" }
    }),
    db.user.findMany({
      where: { role: { not: USER_ROLE_ADMIN } },
      include: {
        usageEvents: {
          where: { createdAt: { gte: addDays(startOfDay(new Date()), -29) } }
        }
      }
    })
  ]);

  const messageEvents = usageEvents.filter(
    (event: UsageEventSummary) => event.eventType === "message.sent"
  );
  const imageEvents = usageEvents.filter(
    (event: UsageEventSummary) => event.eventType === "attachment.image"
  );
  const voiceEvents = usageEvents.filter(
    (event: UsageEventSummary) => event.eventType === "attachment.voice"
  );
  const totalCost = usageEvents.reduce(
    (sum: number, event: UsageEventSummary) => sum + decimalToNumber(event.estimatedCost),
    0
  );
  const activeUsers =
    users.filter((user: RegisteredUserSummary) => user.usageEvents.length > 0).length || 1;

  return {
    totals: {
      messages: messageEvents.reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0),
      imageRequests: imageEvents.reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0),
      voiceRequests: voiceEvents.reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0),
      totalCost,
      avgCostPerActiveUser: Number((totalCost / activeUsers).toFixed(4))
    },
    modalityBreakdown: [
      {
        key: "text",
        label: "Text",
        value: messageEvents.reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0)
      },
      {
        key: "image",
        label: "Photo",
        value: imageEvents.reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0)
      },
      {
        key: "voice",
        label: "Voice",
        value: voiceEvents.reduce((sum: number, event: UsageEventSummary) => sum + event.quantity, 0)
      }
    ],
    dailyMessages: aggregateSeries(
        messageEvents.map((event: UsageEventSummary) => ({ createdAt: event.createdAt, quantity: event.quantity })),
        30
      )
  };
}

export async function getAdminCaptureAnalytics() {
  const [captureEvents, guestSessions, consentLogs] = await Promise.all([
    db.captureEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        guestSession: true,
        registeredUser: true
      }
    }),
    db.guestSession.findMany({
      where: { createdAt: { gte: addDays(startOfDay(new Date()), -29) } }
    }),
    db.consentLog.findMany({
      where: { accepted: true, acceptedAt: { gte: addDays(startOfDay(new Date()), -29) } }
    })
  ]);

  const marketingAccepted = consentLogs.filter(
    (log: ConsentLogSummary) => log.consentType === "MARKETING_MESSAGES"
  ).length;
  const personalAccepted = consentLogs.filter(
    (log: ConsentLogSummary) => log.consentType === "PERSONAL_DATA_PROCESSING"
  ).length;
  const convertedGuests = guestSessions.filter(
    (session: GuestSessionSummary) => session.upgradedToUserId != null
  ).length;

  return {
    summary: {
      guestToRegisteredConversion: guestSessions.length
        ? Number(((convertedGuests / guestSessions.length) * 100).toFixed(1))
        : 0,
      marketingConsentRate: personalAccepted
        ? Number(((marketingAccepted / personalAccepted) * 100).toFixed(1))
        : 0,
      totalCaptureEvents: captureEvents.length
    },
    recentEvents: captureEvents.map((event: CaptureEventSummary) => ({
      id: event.id,
      createdAt: event.createdAt.toISOString(),
      trigger: event.trigger,
      status: event.status,
      guestSessionId: event.guestSessionId,
      registeredUserName: event.registeredUser?.name ?? null,
      utmSource: event.guestSession.utmSource ?? null
    }))
  };
}

export async function getAdminQuotas() {
  const [policies, users] = await Promise.all([
    db.quotaPolicy.findMany({
      orderBy: [{ userSegment: "asc" }, { name: "asc" }]
    }),
    db.user.findMany({
      where: { role: { not: USER_ROLE_ADMIN } }
    })
  ]);

  return {
    items: policies.map((policy: QuotaPolicySummary) => ({
      id: policy.id,
      name: policy.name,
      userSegment: policy.userSegment,
      dailyMessages: policy.dailyMessages,
      dailyImages: policy.dailyImages,
      dailyVoiceMinutes: policy.dailyVoiceMinutes,
      monthlyMessages: policy.monthlyMessages,
      billingPlanCode: policy.billingPlanCode,
      saveHistoryEnabled: policy.saveHistoryEnabled,
      captureAfterValue: policy.captureAfterValue,
      softLimit: policy.softLimit,
      active: policy.active,
      assignedUsers:
        policy.userSegment === "guest"
          ? null
          : policy.userSegment === "registered_free"
            ? users.length
            : null
    }))
  };
}

export async function updateQuotaPolicy(
  id: string,
  input: {
    daily_messages?: number | null;
    daily_images?: number | null;
    daily_voice_minutes?: number | null;
    monthly_messages?: number | null;
    save_history_enabled?: boolean;
    capture_after_value?: number;
    soft_limit?: boolean;
    active?: boolean;
  }
) {
  const existing = await db.quotaPolicy.findUnique({ where: { id } });

  if (!existing) {
    throw notFound("Quota policy was not found.");
  }

  return db.quotaPolicy.update({
    where: { id },
    data: {
      dailyMessages: input.daily_messages ?? existing.dailyMessages,
      dailyImages: input.daily_images ?? existing.dailyImages,
      dailyVoiceMinutes: input.daily_voice_minutes ?? existing.dailyVoiceMinutes,
      monthlyMessages: input.monthly_messages ?? existing.monthlyMessages,
      saveHistoryEnabled: input.save_history_enabled ?? existing.saveHistoryEnabled,
      captureAfterValue: input.capture_after_value ?? existing.captureAfterValue,
      softLimit: input.soft_limit ?? existing.softLimit,
      active: input.active ?? existing.active
    }
  });
}

export async function getAdminPrompts() {
  const profiles = await db.promptProfile.findMany({
    orderBy: [{ gradeFrom: "asc" }, { mode: "asc" }]
  });

  return {
    items: profiles.map((profile: PromptProfileSummary) => ({
      id: profile.id,
      active: profile.active,
      label: profile.label,
      gradeFrom: profile.gradeFrom,
      gradeTo: profile.gradeTo,
      mode: profile.mode,
      systemPrompt: profile.systemPrompt,
      parentOverlayPrompt: profile.parentOverlayPrompt,
      subjectOverridesJson: profile.subjectOverridesJson
    }))
  };
}

export async function updatePromptProfile(
  id: string,
  input: {
    active?: boolean;
    grade_from?: number;
    grade_to?: number;
    mode?: string;
    label?: string;
    system_prompt?: string;
    parent_overlay_prompt?: string | null;
    subject_overrides_json?: Record<string, string> | null;
  }
) {
  const existing = await db.promptProfile.findUnique({ where: { id } });

  if (!existing) {
    throw notFound("Prompt profile was not found.");
  }

  return db.promptProfile.update({
    where: { id },
    data: {
      active: input.active ?? existing.active,
      gradeFrom: input.grade_from ?? existing.gradeFrom,
      gradeTo: input.grade_to ?? existing.gradeTo,
      mode: input.mode ?? existing.mode,
      label: input.label ?? existing.label,
      systemPrompt: input.system_prompt ?? existing.systemPrompt,
      parentOverlayPrompt:
        input.parent_overlay_prompt === undefined
          ? existing.parentOverlayPrompt
          : input.parent_overlay_prompt,
      subjectOverridesJson:
        input.subject_overrides_json === undefined
          ? existing.subjectOverridesJson
          : input.subject_overrides_json
    }
  });
}

export async function getAdminSegments() {
  const users = await getUsersWithLeadStats();
  const now = new Date();
  const sevenDaysAgo = addDays(startOfDay(now), -6);

  const segments: Array<Omit<SegmentExport, "count" | "csv"> & { users: typeof users }> = [
    {
      key: "marketing-consented",
      label: "Marketing consented",
      description: "Готовый сегмент для broadcast export: есть контакт и маркетинговое согласие.",
      users: users.filter(
        (user: AdminUserWithLeadStats) => user.marketingConsent && (user.email || user.phone)
      )
    },
    {
      key: "active-parents",
      label: "Active parents",
      description: "Родители с активностью за последние 7 дней.",
      users: users.filter(
        (user: AdminUserWithLeadStats) =>
          user.role === USER_ROLE_PARENT &&
          user.lastActivityAt != null &&
          user.lastActivityAt >= sevenDaysAgo
      )
    },
    {
      key: "dormant-leads",
      label: "Dormant leads",
      description: "Есть capture, но нет недавней активности.",
      users: users.filter(
        (user: AdminUserWithLeadStats) =>
          user.lastActivityAt == null || user.lastActivityAt < addDays(startOfDay(now), -13)
      )
    }
  ];

  return {
    items: segments.map((segment: Omit<SegmentExport, "count" | "csv"> & { users: AdminUserWithLeadStats[] }) => {
      const csv = [
        formatCsvRow(["user_id", "name", "role", "email", "phone", "grade", "last_activity_at"]),
        ...segment.users.map((user: AdminUserWithLeadStats) =>
          formatCsvRow([
            user.id,
            user.name,
            user.role,
            user.email,
            user.phone,
            user.grade,
            user.lastActivityAt?.toISOString() ?? null
          ])
        )
      ].join("\n");

      return {
        key: segment.key,
        label: segment.label,
        description: segment.description,
        count: segment.users.length,
        csv
      };
    })
  };
}

export async function getAdminPanelData() {
  const [overview, users, quotas, prompts, capture, usage, segments] = await Promise.all([
    getAdminOverview(),
    getAdminUsers(),
    getAdminQuotas(),
    getAdminPrompts(),
    getAdminCaptureAnalytics(),
    getAdminUsage(),
    getAdminSegments()
  ]);

  return {
    overview,
    users,
    quotas,
    prompts,
    capture,
    usage,
    segments
  };
}
