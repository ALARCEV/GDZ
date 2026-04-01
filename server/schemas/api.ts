import { z } from "zod";

export const guestSessionRequestSchema = z.object({
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
  locale: z.string().optional(),
  fingerprint_hash: z.string().optional()
});

export const chatMessageRequestSchema = z.object({
  conversation_id: z.string().optional(),
  guest_session_id: z.string().optional(),
  response_mode: z.string().optional(),
  subject: z.string().optional(),
  grade: z.number().int().min(1).max(7).optional(),
  topic: z.string().optional(),
  message: z.object({
    type: z.string(),
    content_text: z.string().min(1),
    duration_seconds: z.number().int().min(1).optional(),
    attachment_id: z.string().optional()
  })
});

const uploadRegistrationSchema = z.object({
  conversation_id: z.string().optional(),
  guest_session_id: z.string().optional(),
  file_name: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().positive(),
  duration_seconds: z.number().int().min(1).optional()
});

export const uploadImageSchema = uploadRegistrationSchema.extend({
  mime_type: z.string().startsWith("image/")
});

export const uploadVoiceSchema = uploadRegistrationSchema.extend({
  mime_type: z.string().startsWith("audio/"),
  duration_seconds: z.number().int().min(1)
});

export const captureRegisterSchema = z.object({
  guest_session_id: z.string(),
  role: z.enum(["parent", "student"]),
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(5).optional().nullable(),
  child_grade: z.number().int().min(1).max(7).optional().nullable(),
  student_age: z.number().int().min(5).max(18).optional().nullable(),
  trigger: z
    .enum(["SAVE_CHAT", "OPEN_HISTORY", "QUOTA_LIMIT", "UNLOCK_MODALITY", "PARENT_CHEATSHEET"])
    .optional(),
  consents: z.object({
    personal_data_processing: z.boolean(),
    marketing_messages: z.boolean()
  })
});

export const createConversationSchema = z.object({
  grade: z.number().int().min(1).max(7).optional(),
  subject: z.string().optional(),
  topic: z.string().optional(),
  title: z.string().optional()
});

export const patchConversationSchema = z.object({
  title: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  archived_at: z.string().datetime().nullable().optional()
});

export const patchQuotaPolicySchema = z.object({
  daily_messages: z.number().int().min(0).nullable().optional(),
  daily_images: z.number().int().min(0).nullable().optional(),
  daily_voice_minutes: z.number().int().min(0).nullable().optional(),
  monthly_messages: z.number().int().min(0).nullable().optional(),
  save_history_enabled: z.boolean().optional(),
  capture_after_value: z.number().int().min(0).optional(),
  soft_limit: z.boolean().optional(),
  active: z.boolean().optional()
});

export const patchMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).nullable().optional(),
  child_grade: z.number().int().min(1).max(7).nullable().optional(),
  student_age: z.number().int().min(5).max(18).nullable().optional()
});

export const patchPromptProfileSchema = z.object({
  active: z.boolean().optional(),
  grade_from: z.number().int().min(1).max(7).optional(),
  grade_to: z.number().int().min(1).max(7).optional(),
  mode: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  system_prompt: z.string().min(1).optional(),
  parent_overlay_prompt: z.string().nullable().optional(),
  subject_overrides_json: z.record(z.string(), z.string()).nullable().optional()
});
