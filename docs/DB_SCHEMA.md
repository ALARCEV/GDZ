# Database Schema

## Version Header
- Version: 1.0
- Last updated: 2026-04-01
- Product: Школьный ассистент
- Scope: MVP schema
- Source of truth: `docs-source/school_assistant_mvp_funnel_spec_v2.json`, `docs-source/school_assistant_mvp_funnel_brief_v2.md`, `docs-source/school_assistant_mvp_tz_v1.md`
- Supporting context: `AGENTS.md`, `PLANS.md`

## Schema Principles
- PostgreSQL as primary relational store
- Prisma-compatible relational model
- schema covers only entities explicitly present in source materials
- attachment binaries are stored outside the database in object storage
- consent and usage are first-class entities because they are central to MVP funnel and cost control

## Entity Map
- `users`
- `guest_sessions`
- `conversations`
- `messages`
- `attachments`
- `usage_events`
- `quota_policies`
- `user_quota_state`
- `consent_logs`
- `payment_plans`
- `payments`
- `broadcasts`
- `feature_flags`
- `prompt_profiles`

## users
Stores registered parent, student and admin accounts.

Columns:
- `id` PK
- `created_at` timestamptz not null
- `updated_at` timestamptz not null
- `role` varchar not null
- `name` varchar not null
- `email` varchar null
- `phone` varchar null
- `auth_provider` varchar null
- `status` varchar not null
- `parent_child_grade` integer null
- `student_age` integer null
- `is_guest_converted` boolean not null default false

Constraints:
- `role` in (`parent`, `student`, `admin`)
- at least one contact field should be present if business rule requires it
- `parent_child_grade` is only used for parent flow
- `student_age` is only used for student flow

Indexes:
- unique index on normalized `email` where not null
- index on `role`
- index on `status`
- index on `parent_child_grade`

## guest_sessions
Stores anonymous sessions before registration.

Columns:
- `id` PK
- `created_at` timestamptz not null
- `expires_at` timestamptz not null
- `fingerprint_hash` varchar null
- `utm_source` varchar null
- `utm_campaign` varchar null
- `locale` varchar null
- `last_seen_at` timestamptz not null

Indexes:
- index on `expires_at`
- index on `fingerprint_hash`
- index on `last_seen_at`

## conversations
Stores chat threads for guest or registered user.

Columns:
- `id` PK
- `owner_user_id` FK -> `users.id` null
- `guest_session_id` FK -> `guest_sessions.id` null
- `grade` integer null
- `subject` varchar null
- `topic` varchar null
- `title` varchar null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null
- `archived_at` timestamptz null

Constraints:
- exactly one of `owner_user_id` or `guest_session_id` should be set at a time

Indexes:
- index on `owner_user_id`
- index on `guest_session_id`
- index on `grade`
- index on `subject`
- index on `topic`
- index on `updated_at`

## messages
Stores user and assistant messages inside conversation.

Columns:
- `id` PK
- `conversation_id` FK -> `conversations.id` not null
- `role` varchar not null
- `message_type` varchar not null
- `content_text` text not null
- `rendered_math_html` text null
- `token_in` integer null
- `token_out` integer null
- `cost_estimate` numeric(12,6) null
- `created_at` timestamptz not null

Constraints:
- `role` in (`user`, `assistant`, `system`)
- `message_type` should distinguish at least text, image, voice and system-derived messages

Indexes:
- index on `conversation_id`
- index on `created_at`
- index on `role`

## attachments
Stores metadata for uploaded image and voice files.

Columns:
- `id` PK
- `message_id` FK -> `messages.id` not null
- `kind` varchar not null
- `file_url` text not null
- `mime_type` varchar not null
- `size_bytes` bigint not null
- `created_at` timestamptz not null

Constraints:
- `kind` in (`image`, `voice`)

Indexes:
- index on `message_id`
- index on `kind`

## usage_events
Stores product usage and cost accounting events.

Columns:
- `id` PK
- `user_id` FK -> `users.id` null
- `guest_session_id` FK -> `guest_sessions.id` null
- `conversation_id` FK -> `conversations.id` null
- `event_type` varchar not null
- `model_name` varchar null
- `token_in` integer null
- `token_out` integer null
- `estimated_cost` numeric(12,6) null
- `created_at` timestamptz not null

Constraints:
- at least one of `user_id` or `guest_session_id` should be present

Indexes:
- index on `user_id`
- index on `guest_session_id`
- index on `conversation_id`
- index on `event_type`
- index on `created_at`

## quota_policies
Stores configurable quota rules by user segment.

Columns:
- `id` PK
- `name` varchar not null
- `user_segment` varchar not null
- `daily_messages` integer null
- `daily_images` integer null
- `daily_voice_minutes` integer null
- `monthly_messages` integer null
- `save_history_enabled` boolean not null default false
- `active` boolean not null default true

Indexes:
- unique index on `name`
- index on `user_segment`
- index on `active`

## user_quota_state
Stores per-user or per-period quota consumption snapshot.

Columns:
- `id` PK
- `user_id` FK -> `users.id` not null
- `policy_id` FK -> `quota_policies.id` not null
- `period_start` timestamptz not null
- `period_end` timestamptz not null
- `used_messages` integer not null default 0
- `used_images` integer not null default 0
- `used_voice_minutes` integer not null default 0

Indexes:
- index on `user_id`
- index on `policy_id`
- index on (`user_id`, `period_start`, `period_end`)

## consent_logs
Stores legal consents from guest or registered user.

Columns:
- `id` PK
- `user_id` FK -> `users.id` null
- `guest_session_id` FK -> `guest_sessions.id` null
- `consent_type` varchar not null
- `accepted` boolean not null
- `accepted_at` timestamptz not null
- `ip_hash` varchar null
- `user_agent_hash` varchar null
- `policy_version` varchar not null

Constraints:
- `consent_type` in (`personal_data_processing`, `marketing_messages`)
- at least one of `user_id` or `guest_session_id` should be present

Indexes:
- index on `user_id`
- index on `guest_session_id`
- index on `consent_type`
- index on `accepted_at`

## payment_plans
Stores active cost-based plans available to users.

Columns:
- `id` PK
- `name` varchar not null
- `kind` varchar not null
- `price` numeric(12,2) not null
- `currency` varchar not null
- `quota_messages` integer null
- `quota_days` integer null
- `is_active` boolean not null default true

Indexes:
- index on `kind`
- index on `is_active`

## payments
Stores payment attempts and successful purchases.

Columns:
- `id` PK
- `user_id` FK -> `users.id` not null
- `plan_id` FK -> `payment_plans.id` not null
- `status` varchar not null
- `amount` numeric(12,2) not null
- `currency` varchar not null
- `provider` varchar not null
- `provider_payment_id` varchar null
- `created_at` timestamptz not null
- `paid_at` timestamptz null

Indexes:
- index on `user_id`
- index on `plan_id`
- index on `status`
- index on `created_at`

## broadcasts
Stores outbound communication campaigns.

Columns:
- `id` PK
- `title` varchar not null
- `audience_segment` varchar not null
- `channel` varchar not null
- `content` text not null
- `status` varchar not null
- `created_at` timestamptz not null
- `sent_at` timestamptz null

Indexes:
- index on `audience_segment`
- index on `channel`
- index on `status`

## feature_flags
Stores runtime product switches.

Columns:
- `id` PK
- `key` varchar not null
- `enabled` boolean not null
- `payload_json` jsonb null
- `updated_at` timestamptz not null

Indexes:
- unique index on `key`
- index on `enabled`

## prompt_profiles
Stores prompt configurations by grade range and mode.

Columns:
- `id` PK
- `active` boolean not null default true
- `grade_from` integer not null
- `grade_to` integer not null
- `mode` varchar not null
- `system_prompt` text not null
- `parent_overlay_prompt` text null
- `subject_overrides_json` jsonb null
- `updated_at` timestamptz not null

Indexes:
- index on `active`
- index on (`grade_from`, `grade_to`)
- index on `mode`

## Relationship Notes
- `users` 1:N `conversations`
- `guest_sessions` 1:N `conversations`
- `conversations` 1:N `messages`
- `messages` 1:N `attachments`
- `users` 1:N `payments`
- `payment_plans` 1:N `payments`
- `quota_policies` 1:N `user_quota_state`

## Mapping to Product Requirements
- guest funnel: `guest_sessions`, `conversations`, `messages`, `usage_events`
- capture and consent: `users`, `consent_logs`
- history and filters: `conversations`
- cost and limits: `usage_events`, `quota_policies`, `user_quota_state`
- admin and operations: `payments`, `broadcasts`, `feature_flags`, `prompt_profiles`

## Open Questions
1. JSON-спека перечисляет сущность `child_profile`, но MVP ТЗ задает только поля `parent_child_grade` и `student_age` внутри `users`. В текущей схеме отдельная таблица `child_profiles` не добавлялась, чтобы не расширять scope beyond spec.
2. В ТЗ у guests есть временная история и session-based лимиты, но в явном виде отдельное состояние квот для guest не выделено. Сейчас предполагается, что guest quota учитывается через `usage_events` и policy logic, а `user_quota_state` применяется только к зарегистрированным пользователям.
3. Для `attachments.file_url` не зафиксировано, хранится ли полный URL или object key. На уровне схемы поле оставлено универсальным.
