type SerializableAttachment = {
  id: string;
  kind: { toLowerCase(): string } | string;
  fileUrl: string;
  mimeType: string;
};

type SerializableMessage = {
  id: string;
  role: { toLowerCase(): string } | string;
  messageType: string;
  contentText: string;
  createdAt: Date;
  attachments?: SerializableAttachment[];
};

type SerializableConversation = {
  id: string;
  title: string | null;
  grade: number | null;
  subject: string | null;
  topic: string | null;
  updatedAt: Date;
  archivedAt?: Date | null;
  messages?: SerializableMessage[];
};

function normalizeLowercaseEnum(value: { toLowerCase(): string } | string) {
  return value.toString().toLowerCase();
}

export function serializeAttachment(attachment: SerializableAttachment) {
  return {
    id: attachment.id,
    kind: normalizeLowercaseEnum(attachment.kind),
    file_url: attachment.fileUrl,
    mime_type: attachment.mimeType
  };
}

export function serializeConversationMessage(message: SerializableMessage) {
  return {
    id: message.id,
    role: normalizeLowercaseEnum(message.role),
    message_type: message.messageType,
    content_text: message.contentText,
    created_at: message.createdAt.toISOString(),
    ...(message.attachments
      ? {
          attachments: message.attachments.map(serializeAttachment)
        }
      : {})
  };
}

export function serializeConversationSummary(conversation: SerializableConversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    grade: conversation.grade,
    subject: conversation.subject,
    topic: conversation.topic,
    updated_at: conversation.updatedAt.toISOString(),
    ...(conversation.archivedAt !== undefined
      ? {
          archived_at: conversation.archivedAt?.toISOString() ?? null
        }
      : {})
  };
}

export function serializeConversationDetail(conversation: SerializableConversation) {
  return {
    ...serializeConversationSummary(conversation),
    messages: (conversation.messages ?? []).map(serializeConversationMessage)
  };
}
