export type AttachmentPayload = {
  id: string;
  kind: string;
  file_url: string;
  mime_type: string;
};

export type UploadRegistrationPayload = {
  attachment_id: string;
  conversation_id: string;
  upload_url: string;
  file_url: string;
  expires_at: string;
};

export type ConversationMessagePayload = {
  id: string;
  role: string;
  message_type: string;
  content_text: string;
  created_at?: string;
  attachments?: AttachmentPayload[];
};

export type ConversationPayload = {
  id: string;
  title: string | null;
  grade: number | null;
  subject: string | null;
  topic: string | null;
  updated_at?: string;
  archived_at?: string | null;
  messages?: ConversationMessagePayload[];
};

export type ChatMessageResponsePayload = {
  conversation_id: string;
  message_id: string;
  assistant_message: {
    id: string;
    role: "assistant";
    content_text: string;
  };
  math_render: {
    has_math: boolean;
    html: string | null;
  };
  limits: {
    messages_remaining: number | null;
    images_remaining: number | null;
    voice_minutes_remaining: number | null;
  };
  capture_prompt: {
    should_show: boolean;
    trigger: string | null;
  };
};

export type ChatConversationResponsePayload = {
  conversation: ConversationPayload;
};

export type HistoryListItemPayload = {
  id: string;
  title: string | null;
  grade: number | null;
  subject: string | null;
  topic: string | null;
  updated_at: string;
};

export type HistoryGroupsPayload = Array<{
  grade: number | null;
  subjects: Array<{
    subject: string | null;
    topics: Array<{
      topic: string | null;
      chats: Array<{
        id: string;
        title: string | null;
        updatedAt: string;
      }>;
    }>;
  }>;
}>;

export type ConversationsListResponsePayload = {
  items: HistoryListItemPayload[];
  groups: HistoryGroupsPayload;
};

export type HistoryFiltersPayload = {
  grades: number[];
  subjects: string[];
  topics: string[];
  months: string[];
  roles: string[];
};

export type MeResponsePayload = {
  user: {
    id: string;
    role: string;
    name: string;
    email: string | null;
    phone: string | null;
    child_grade: number | null;
    student_age: number | null;
  };
  quota: {
    policy: string;
    messages_remaining: number | null;
    images_remaining: number | null;
    voice_minutes_remaining: number | null;
  };
  plan: {
    status: string;
    code: string;
  };
};

export type UsageResponsePayload = {
  current_period: {
    messages_used: number;
    images_used: number;
    voice_minutes_used: number;
  };
  limits: {
    messages: number | null;
    images: number | null;
    voice_minutes: number | null;
  };
};

export type AdminOverviewPayload = {
  metrics: {
    guestToRegisteredConversion: number;
    activeUsers: number;
    messagesToday: number;
    photoRequestsToday: number;
    voiceRequestsToday: number;
    quotaOverrunsToday: number;
  };
  trends: {
    messagesPerDay: Array<{ date: string; value: number }>;
    photoRequestsPerDay: Array<{ date: string; value: number }>;
    voiceRequestsPerDay: Array<{ date: string; value: number }>;
  };
  capture: {
    totalGuestSessions: number;
    convertedGuests: number;
    completedCaptures: number;
    triggers: Array<{ trigger: string; count: number }>;
  };
};

export type AdminUsersPayload = {
  items: Array<{
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
    lastActivityAt: string | null;
    messagesUsed: number;
    segment: string;
  }>;
};

export type AdminUsagePayload = {
  totals: {
    messages: number;
    imageRequests: number;
    voiceRequests: number;
    totalCost: number;
    avgCostPerActiveUser: number;
  };
  modalityBreakdown: Array<{ key: string; label: string; value: number }>;
  dailyMessages: Array<{ date: string; value: number }>;
};

export type AdminCapturePayload = {
  summary: {
    guestToRegisteredConversion: number;
    marketingConsentRate: number;
    totalCaptureEvents: number;
  };
  recentEvents: Array<{
    id: string;
    createdAt: string;
    trigger: string;
    status: string;
    guestSessionId: string;
    registeredUserName: string | null;
    utmSource: string | null;
  }>;
};

export type AdminQuotasPayload = {
  items: Array<{
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
    assignedUsers: number | null;
  }>;
};

export type AdminPromptsPayload = {
  items: Array<{
    id: string;
    active: boolean;
    label: string;
    gradeFrom: number;
    gradeTo: number;
    mode: string;
    systemPrompt: string;
    parentOverlayPrompt: string | null;
    subjectOverridesJson: Record<string, string> | null;
  }>;
};

export type AdminSegmentsPayload = {
  items: Array<{
    key: string;
    label: string;
    description: string;
    count: number;
    csv: string;
  }>;
};

export type AdminPanelData = {
  overview: AdminOverviewPayload;
  users: AdminUsersPayload;
  usage: AdminUsagePayload;
  capture: AdminCapturePayload;
  quotas: AdminQuotasPayload;
  prompts: AdminPromptsPayload;
  segments: AdminSegmentsPayload;
};
