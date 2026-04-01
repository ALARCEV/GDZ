# API Specification

## Version Header
- Version: 1.0
- Last updated: 2026-04-01
- Product: Школьный ассистент
- Scope: MVP API
- Source of truth: `docs-source/school_assistant_mvp_funnel_spec_v2.json`, `docs-source/school_assistant_mvp_funnel_brief_v2.md`, `docs-source/school_assistant_mvp_tz_v1.md`
- Supporting context: `AGENTS.md`, `PLANS.md`

## API Conventions
- API style: JSON over HTTPS
- Auth modes: guest session or authenticated user session
- Time format: ISO 8601
- Resource identifiers: opaque string UUID/ULID format is acceptable
- Error format: stable JSON object with machine-readable `code` and human-readable `message`

Example error payload:
```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Daily image limit reached for current session."
  }
}
```

## Authentication and Session Model
### Guest
- guest requests use `guest_session_id` issued by `POST /api/guest/session`
- session may also be backed by cookie/device fingerprinting for abuse control

### Registered User
- authenticated requests use application auth session bound to `user_id`
- admin routes require admin role

## Public / Guest APIs
### POST /api/guest/session
Creates or refreshes anonymous guest session.

Request:
```json
{
  "utm_source": "optional",
  "utm_campaign": "optional",
  "locale": "ru-RU"
}
```

Response:
```json
{
  "guest_session_id": "gs_123",
  "expires_at": "2026-04-08T12:00:00Z",
  "limits": {
    "messages_remaining": 5,
    "images_remaining": 2,
    "voice_minutes_remaining": 3
  }
}
```

### POST /api/chat/message
Sends a chat message in guest or authenticated mode.

Request:
```json
{
  "conversation_id": "conv_123",
  "guest_session_id": "gs_123",
  "response_mode": "simple_explanation",
  "subject": "math",
  "grade": 4,
  "topic": "fractions",
  "message": {
    "type": "text",
    "content_text": "Объясни дроби простыми словами"
  }
}
```

Response:
```json
{
  "conversation_id": "conv_123",
  "message_id": "msg_123",
  "assistant_message": {
    "role": "assistant",
    "content_text": "..."
  },
  "math_render": {
    "has_math": false,
    "html": null
  },
  "limits": {
    "messages_remaining": 4,
    "images_remaining": 2,
    "voice_minutes_remaining": 3
  },
  "capture_prompt": {
    "should_show": false,
    "trigger": null
  }
}
```

Behavior notes:
- backend must check quota before AI execution;
- conversation may belong either to guest session or to authenticated user;
- if `conversation_id` is omitted, backend may create a new conversation;
- if limit is exceeded, response returns soft CTA semantics rather than only a hard failure.

### POST /api/chat/upload-image
Registers uploaded image for chat usage.

Request:
```json
{
  "guest_session_id": "gs_123",
  "conversation_id": "conv_123",
  "file_name": "homework.jpg",
  "mime_type": "image/jpeg",
  "size_bytes": 245000
}
```

Response:
```json
{
  "attachment_id": "att_123",
  "upload_url": "signed-or-proxied-url",
  "expires_at": "2026-04-01T12:15:00Z"
}
```

### POST /api/chat/upload-voice
Registers uploaded voice note for chat usage.

Request:
```json
{
  "guest_session_id": "gs_123",
  "conversation_id": "conv_123",
  "file_name": "question.m4a",
  "mime_type": "audio/mp4",
  "size_bytes": 88000,
  "duration_seconds": 24
}
```

Response:
```json
{
  "attachment_id": "att_456",
  "upload_url": "signed-or-proxied-url",
  "expires_at": "2026-04-01T12:15:00Z"
}
```

### GET /api/chat/conversation/:id
Returns one conversation visible to current guest session or authenticated user.

Response:
```json
{
  "conversation": {
    "id": "conv_123",
    "title": "Дроби",
    "grade": 4,
    "subject": "math",
    "topic": "fractions",
    "messages": []
  }
}
```

### POST /api/capture/register
Converts a guest into a registered account after value moment.

Request:
```json
{
  "guest_session_id": "gs_123",
  "role": "parent",
  "name": "Анна",
  "email": "anna@example.com",
  "phone": "+79990000000",
  "child_grade": 4,
  "student_age": null,
  "consents": {
    "personal_data_processing": true,
    "marketing_messages": false
  }
}
```

Response:
```json
{
  "user": {
    "id": "usr_123",
    "role": "parent",
    "name": "Анна"
  },
  "conversion": {
    "guest_session_id": "gs_123",
    "history_migrated": true
  }
}
```

Validation rules:
- personal data consent is required;
- role must be `parent` or `student`;
- parent flow expects child grade;
- student flow expects age;
- account creation must preserve guest conversation access.

## Authenticated User APIs
### GET /api/me
Returns current user profile, plan and quota summary.

Response:
```json
{
  "user": {
    "id": "usr_123",
    "role": "parent",
    "name": "Анна",
    "email": "anna@example.com",
    "phone": "+79990000000",
    "child_grade": 4,
    "student_age": null
  },
  "quota": {
    "policy": "registered_free",
    "messages_remaining": 30,
    "images_remaining": 5,
    "voice_minutes_remaining": 10
  },
  "plan": {
    "status": "free"
  }
}
```

### PATCH /api/me
Updates editable profile fields.

Allowed fields:
- `name`
- `phone`
- `child_grade`
- `student_age`

### GET /api/conversations
Returns saved conversations list with filters.

Query params:
- `date_from`
- `date_to`
- `month`
- `subject`
- `topic`
- `role`
- `grade`

Response:
```json
{
  "items": [
    {
      "id": "conv_123",
      "title": "Дроби",
      "grade": 4,
      "subject": "math",
      "topic": "fractions",
      "updated_at": "2026-04-01T12:00:00Z"
    }
  ]
}
```

### GET /api/conversations/:id
Returns one saved conversation for authenticated user.

### POST /api/conversations
Creates an empty conversation shell for authenticated flow.

Request:
```json
{
  "grade": 4,
  "subject": "math",
  "topic": "fractions",
  "title": "Дроби"
}
```

### PATCH /api/conversations/:id
Updates mutable conversation metadata.

Allowed fields:
- `title`
- `subject`
- `topic`
- `archived_at`

### GET /api/history/filters
Returns available filter facets for current user history.

Response:
```json
{
  "grades": [1, 2, 3, 4],
  "subjects": ["math", "russian"],
  "topics": ["fractions", "spelling"],
  "months": ["2026-04"],
  "roles": ["parent"]
}
```

### GET /api/usage
Returns quota usage and recent activity summary.

Response:
```json
{
  "current_period": {
    "messages_used": 12,
    "images_used": 1,
    "voice_minutes_used": 4
  },
  "limits": {
    "messages": 30,
    "images": 5,
    "voice_minutes": 10
  }
}
```

### GET /api/plans
Lists active payment plans visible to end user.

Response:
```json
{
  "items": [
    {
      "id": "plan_10d",
      "name": "10 дней",
      "kind": "time_access",
      "price": 300,
      "currency": "RUB",
      "quota_days": 10,
      "quota_messages": null
    }
  ]
}
```

### POST /api/payments/create
Creates payment intent/order for selected plan.

Request:
```json
{
  "plan_id": "plan_10d"
}
```

Response:
```json
{
  "payment_id": "pay_123",
  "status": "pending",
  "provider": "tbd",
  "checkout_url": "provider-url"
}
```

## Admin APIs
### GET /api/admin/overview
Returns aggregated product and business metrics.

### GET /api/admin/users
Returns paginated users and CRM attributes.

Query params may include:
- `role`
- `status`
- `grade`
- `segment`
- `has_marketing_consent`

### GET /api/admin/usage
Returns usage, cost and modality breakdowns.

### GET /api/admin/segments
Returns segment definitions or user counts by segment.

### GET /api/admin/prompts
Returns prompt profiles.

### PATCH /api/admin/prompts/:id
Updates prompt profile.

Editable fields:
- `active`
- `grade_from`
- `grade_to`
- `mode`
- `system_prompt`
- `parent_overlay_prompt`
- `subject_overrides_json`

### GET /api/admin/quotas
Returns quota policies and assignment stats.

### PATCH /api/admin/quotas/:id
Updates quota policy.

Editable fields:
- `daily_messages`
- `daily_images`
- `daily_voice_minutes`
- `monthly_messages`
- `save_history_enabled`
- `active`

### GET /api/admin/payments
Returns payments list with statuses and totals.

### GET /api/admin/feature-flags
Returns feature flags.

### PATCH /api/admin/feature-flags/:id
Updates feature flag.

Editable fields:
- `enabled`
- `payload_json`

### POST /api/admin/broadcasts
Creates a broadcast campaign.

Request:
```json
{
  "title": "Напоминание",
  "audience_segment": "parents_grade_4",
  "channel": "email",
  "content": "..."
}
```

### GET /api/admin/exports/contacts
Exports collected contacts and consent metadata.

## Cross-Cutting API Rules
- quota failures should preserve opportunity for capture or upgrade CTA;
- guest resources must not leak across guest sessions;
- authenticated user cannot access another user's conversations;
- admin endpoints require strict role check;
- all consent-capturing operations must persist consent logs;
- usage-generating operations must create usage events for cost tracking.

## Open Questions
1. Источники перечисляют `GET /api/chat/conversation/:id` для guest/public и `GET /api/conversations/:id` для authenticated user. В текущем API они сохранены как два маршрута, но при реализации стоит подтвердить, нужен ли раздельный namespace или можно унифицировать доступную модель.
2. JSON-спека фиксирует `phone_optional` для parent capture, а ТЗ допускает `email или телефон`. Схема запроса `POST /api/capture/register` пока допускает оба поля, но бизнес-валидацию контактного канала нужно подтвердить.
3. Спецификация платежей не называет payment provider. В API оставлен абстрактный `provider` и `checkout_url`, но конкретный контракт провайдера остается открытым вопросом MVP.
