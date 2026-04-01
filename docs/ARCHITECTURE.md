# Architecture

## Version Header
- Version: 1.0
- Last updated: 2026-04-01
- Product: Школьный ассистент
- Scope: MVP architecture
- Source of truth: `docs-source/school_assistant_mvp_funnel_spec_v2.json`, `docs-source/school_assistant_mvp_funnel_brief_v2.md`, `docs-source/school_assistant_mvp_tz_v1.md`
- Supporting context: `AGENTS.md`, `PLANS.md`

## Architecture Goals
- обеспечить guest-first вход без регистрации;
- поддержать text, image и voice сценарии в едином chat flow;
- сохранить четкие границы между guest и registered access;
- дать администратору контроль над лимитами, prompt profiles и cost usage;
- не выходить за пределы MVP и не строить сложные отдельные подсистемы вне spec.

## Recommended Stack
- Frontend: Next.js
- UI layer: Next.js React components with shared CSS tokens and global styles
- Server routes / app backend: в экосистеме Next.js
- Database: PostgreSQL
- ORM: Prisma
- File storage: S3-compatible object storage
- AI provider: OpenAI API
- Speech-to-text: OpenAI transcription pipeline
- Math rendering: KaTeX или MathJax, с выводом в HTML/SVG и при необходимости PNG
- Internal analytics/admin: внутренний dashboard

## High-Level System Layout
Система состоит из следующих модулей:
- web application для landing, chat, capture, history, profile и admin;
- application backend для session handling, chat orchestration, capture, quota checks и admin APIs;
- relational database для пользователей, сессий, диалогов, usage, consent и платежных сущностей;
- object storage для image и voice вложений;
- AI integration layer для vision, text generation и voice transcription;
- math rendering layer для точного отображения математических выражений.

## App Structure
### Public Layer
- landing page;
- guest chat entry;
- guest session bootstrap;
- capture flow после value moment.

### Authenticated User Layer
- saved conversations;
- history and filters;
- profile and usage;
- payment plan browsing;
- purchase initiation.

### Admin Layer
- overview dashboard;
- user CRM;
- quota management;
- prompt profile management;
- feature flags;
- payments monitoring;
- broadcast management;
- exports.

## Frontend / Backend Boundaries
### Frontend Responsibilities
- отображение landing, chat, capture, history, profile и admin экранов;
- сбор пользовательского ввода text/image/voice;
- переключение response mode;
- показ статусов загрузки, ошибок, лимитов и capture CTA;
- визуализация math output;
- рендер дерева истории и фильтров.

### Backend Responsibilities
- создание и поддержка guest sessions;
- аутентификация зарегистрированных пользователей;
- прием chat requests и их оркестрация;
- проверка квот до выполнения AI-запроса;
- сохранение conversations, messages, attachments и usage events;
- привязка guest data к user account при capture;
- управление prompt profiles, feature flags, quotas и admin reports.

## Session Model
### Guest Session
Guest session опирается на:
- `anonymous_session_id`;
- browser/device cookie;
- временную историю;
- эвристики по session + IP/device для лимитов и abuse control.

Guest session должна позволять:
- продолжать диалог в рамках сессии;
- сохранять минимально необходимый контекст до capture;
- конвертироваться в user account без потери диалога.

### Registered Session
Registered session опирается на:
- `user_id`;
- persistent auth session;
- стабильные access rules;
- долговременную историю и usage tracking.

## AI Pipeline
### Input Routing
- text input отправляется напрямую в LLM orchestration;
- image input отправляется в vision model без отдельной OCR-цепочки в MVP;
- voice input сначала проходит speech-to-text, затем попадает в LLM orchestration как текст.

### Prompt Orchestration
Системный prompt должен учитывать:
- роль пользователя;
- класс или возраст;
- предмет;
- response mode;
- ограничения по школьной программе;
- требование упрощать без искажения;
- требование объяснять логику, а не только итог.

Prompt profiles управляются по классам и могут иметь subject overrides.

### Output Rules
AI-ответ должен:
- оставаться в рамках школьной программы;
- быть понятным ребенку и полезным родителю;
- избегать сухого ответа без объяснения;
- при необходимости поддерживать несколько путей решения.

## Chat and Storage Model
### Conversation Ownership
Каждый conversation принадлежит либо:
- guest session;
- зарегистрированному пользователю.

После capture возможна миграция связи conversation с guest session на user account с сохранением истории.

### Message Model
Каждое сообщение хранит:
- текстовый контент;
- тип сообщения;
- usage metadata;
- при необходимости ссылку на math-rendered output;
- связь с attachment.

### Attachment Model
Вложения хранятся в S3-compatible storage.

Поддерживаемые виды:
- image;
- voice.

В базе хранятся только metadata и URL/ключ доступа к объекту.

## Quota Model
### Principles
- квоты задаются политиками, управляемыми из админки;
- учет ведется отдельно для messages, images и voice minutes;
- quota checks происходят до выполнения дорогой AI-операции;
- quota usage логируется в usage events и user quota state;
- при исчерпании лимита пользователь получает мягкий CTA на capture или upgrade path, а не тупиковую ошибку.

### Segments
Архитектура должна поддерживать как минимум:
- guest;
- registered free;
- paid.

Политики могут различаться по daily и monthly лимитам.

## Math Rendering Model
- Математический контент не должен полагаться только на plain text.
- Для точных формул используется deterministic math rendering pipeline.
- Основной вывод: HTML/SVG.
- Допустимый fallback: PNG.
- Генеративные изображения для точной математики не используются.

## Capture and Identity Conversion
Capture flow должен:
- срабатывать только после value moment или лимитного триггера;
- сохранять consent logs;
- создавать user account по выбранной роли;
- переносить guest conversations и дальнейшие usage события под user identity;
- фиксировать факт guest-to-user conversion.

## Consent and Communications Model
- обязательное согласие: обработка персональных данных;
- отдельное согласие: маркетинговые сообщения;
- сохранение consent type, версии текста, времени и источника;
- возможность связать согласие как с guest session, так и с user account.

## Admin Model
### Core Modules
- dashboard;
- quota control;
- prompt profiles;
- user CRM;
- content messages / broadcasts;
- manual request crediting;
- abuse control.

### Core Metrics
- DAU и WAU;
- guest-to-lead conversion;
- lead-to-active conversion;
- usage by subject;
- usage by grade;
- cost by user.

## Data Flow Summary
1. Пользователь входит как guest.
2. Backend создает или восстанавливает guest session.
3. Frontend отправляет text/image/voice request.
4. Backend проверяет quota policy.
5. Backend при необходимости сохраняет attachment.
6. AI layer обрабатывает запрос через prompt profile.
7. Backend сохраняет message, usage и metadata рендера.
8. При достижении value moment frontend показывает capture CTA.
9. После capture backend создает account, логирует consent и связывает историю с user.

## Non-Goals for MVP Architecture
- отдельный OCR service;
- сложный graph knowledge layer;
- multi-child domain model;
- school tenancy model;
- отдельный Pro-export subsystem;
- advanced academic analytics subsystem.

## Open Questions
1. В JSON-спеке фигурирует сущность `child_profile`, а в MVP ТЗ отдельная таблица для нее не перечислена. В текущей архитектуре child data трактуется как поля в user/account модели MVP; если нужен отдельный child entity уже в первой версии, это надо подтвердить.
2. Источники фиксируют Yandex login как future capability, но не включают его в MVP. Архитектурно он не обязателен в первой версии, однако потребуется подтвердить, надо ли заранее закладывать расширяемый auth abstraction или достаточно email-based account flow.
3. Для image и voice upload endpoints спецификация не уточняет, идут ли файлы через backend proxy или прямую загрузку в object storage через signed URLs. В архитектуре это оставлено открытым implementation decision внутри MVP.
