# ТЗ MVP: ассистент для школьников и родителей

## 1. Суть MVP

Сервис помогает родителям и ученикам 1–7 классов разбирать школьные задания простым языком.  
Главная задача MVP: дать быструю пользу без регистрации, затем мягко перевести пользователя в сохраненный аккаунт после момента ценности.

## 2. Бизнес-цель MVP

1. Набрать базу родителей через полезный бесплатный сервис.
2. Собрать качественные контакты после первых успешных сессий.
3. Удержать пользователя за счет истории, фильтров и понятной структуры чатов.
4. Через 1–3 месяца ввести оплату по себестоимости.
5. Позже развить продукт в Pro-режим с расширенными функциями.

## 3. Основные роли

### 3.1 Гость
Может:
- открыть сервис без регистрации
- задать текстовый вопрос
- загрузить фото задания
- отправить голосовое сообщение
- получить ограниченное число ответов
- увидеть предложение сохранить историю

Не может:
- смотреть полную историю
- пользоваться расширенными лимитами
- накапливать дерево знаний
- получать долгосрочное хранение данных

### 3.2 Родитель
Primary user MVP.

Может:
- вести одного ребенка
- указать класс ребенка
- получать ответы “для ребенка” и “для родителя”
- сохранять историю
- фильтровать чаты по дате, предмету, теме
- получать лимиты и уведомления
- позже покупать пакеты запросов

### 3.3 Ученик
Secondary user.

Может:
- пользоваться сервисом сам
- зарегистрироваться через email
- указать возраст и роль “ученик”
- получать понятные ответы и визуальные разборы

### 3.4 Администратор
Может:
- управлять лимитами
- видеть пользователей и сегменты
- менять промпты по классам
- включать/выключать функции
- видеть расходы и usage
- управлять тарифами и trial-периодом
- экспортировать контакты и сегменты

## 4. Ценность продукта

### 4.1 Основная ценность
Ассистент объясняет школьные темы просто, спокойно и наглядно.

### 4.2 Формат ответа
Каждый ответ должен:
- объяснять простыми словами
- давать пошаговый разбор
- при необходимости показывать 2–3 способа решения
- отдельно подсказывать родителю, как помочь ребенку самому
- избегать сухого “правильный ответ: X” без объяснения

### 4.3 Визуальная математика
Формулы, уравнения, степени, дроби, логарифмы и иные математические конструкции нельзя отдавать только plain text.  
Нужен точный рендер через математический движок, например KaTeX/MathJax, с выводом в HTML/SVG и при необходимости PNG.

## 5. Ограничения MVP

В MVP НЕ ДЕЛАЕМ:
- загрузку учебников в базу
- OCR-пайплайн собственного уровня
- отдельные кабинеты для школы
- multi-child аккаунт
- Pro-экспорт в Obsidian
- сложный календарь учебного плана
- сложную аналитику успеваемости
- маркетплейс репетиторов

## 6. Предметный охват MVP

Поддерживаются все основные школьные предметы, актуальные для 1–7 классов:
- математика
- русский язык
- литературное чтение
- окружающий мир
- английский язык
- история
- обществознание
- биология
- география
- физика
- информатика
- другие школьные темы в рамках общего школьного запроса

Ограничение через prompt layer:
- не уводить ответ в университетский уровень без запроса
- держаться школьной логики объяснения
- не превращать сервис в общий “умный чат обо всем”

## 7. Воронка MVP

### 7.1 Вход
Пользователь заходит без регистрации.

### 7.2 Первый момент ценности
Пользователь:
- пишет вопрос
или
- загружает фото задания
или
- отправляет voice note

Сервис дает сильный полезный ответ.

### 7.3 Capture после пользы
После 1–2 качественных ответов сервис предлагает:
- сохранить чат
- открыть историю
- продолжить без потери прогресса
- получить больше попыток

После этого запрашиваются:
- роль: родитель / ученик
- email или телефон
- имя
- класс ребенка либо возраст ученика
- согласие на обработку персональных данных
- отдельное согласие на маркетинговые рассылки

### 7.4 Retention
После регистрации пользователь получает:
- дерево истории
- фильтры
- стабильный доступ к ранее решенным темам
- накопление базы полезных объяснений

### 7.5 Monetization
Через 1–3 месяца:
- лимиты free-режима сохраняются
- вводятся пакеты по себестоимости
- позднее появляется Pro

## 8. UX/UI принципы

### 8.1 Визуальный стиль
- сверхминимализм
- белый фон / светлая тема как базовая
- чистая типографика
- минимум декоративных элементов
- mobile-first
- легко сворачивается в Android/iOS оболочку

### 8.2 Основные UX-принципы
- минимум трения на входе
- один главный сценарий на экране
- история без хаоса
- friendly tone
- понятные CTA после пользы
- интерфейс для родителя и ребенка читается одинаково легко

### 8.3 Friendly-design элементы
- мягкие карточки
- спокойные акценты
- доброжелательные подписи
- аккуратные onboarding-подсказки
- теплый, но не “детсадовский” стиль

## 9. Основные экраны MVP

### 9.1 Главный экран
Содержит:
- логотип
- короткое обещание ценности
- поле чата
- кнопки: “Объяснить задачу”, “Разобрать фото”, “Надиктовать голосом”
- мягкий баннер о бесплатном тестовом периоде

### 9.2 Экран чата
Содержит:
- сообщения
- прикрепления
- voice input
- фото input
- режим ответа
- CTA на сохранение после value moment

### 9.3 Экран capture
Содержит:
- email/телефон
- роль
- имя
- класс/возраст
- чекбокс согласия на ПД
- отдельный чекбокс согласия на рассылки

### 9.4 Экран истории
Структура:
- класс
- предмет
- тема
- чаты

Фильтры:
- по дате
- по предмету
- по теме

### 9.5 Экран профиля
Содержит:
- имя
- роль
- класс ребенка
- лимиты
- остаток запросов
- статус тарифа

### 9.6 Экран оплаты
Содержит:
- пакеты запросов
- период доступа
- прозрачное описание модели “по себестоимости”
- история покупок

### 9.7 Админка
Разделы:
- overview
- users
- usage
- quotas
- prompts
- segments
- payments
- feature flags
- broadcasts
- exports

## 10. Логика ответа

### 10.1 Режимы ответа
- Объясни просто
- Помоги решить шаг за шагом
- Дай готовый ответ с разбором
- Объясни родителю, как помочь ребенку самому

### 10.2 Режимы входа
- text
- image
- voice

### 10.3 Prompt orchestration
Системный промпт должен учитывать:
- роль пользователя
- класс
- возрастной уровень речи
- предмет
- режим ответа
- запрет на лишнюю сложность
- требование давать понятные аналогии и метафоры
- требование объяснять ход мысли в безопасной учебной форме
- требование предлагать более одного пути решения, если это уместно

## 11. Техническая архитектура MVP

## 11.1 Рекомендуемый стек
- Frontend: Next.js
- UI: Tailwind + shadcn/ui
- State/Auth/Server routes: в экосистеме Next.js
- DB: PostgreSQL
- ORM: Prisma
- Files: S3-compatible object storage
- AI: OpenAI API
- Speech-to-text: OpenAI voice / transcription pipeline
- Math render: KaTeX или MathJax
- Analytics/admin: internal dashboard

## 11.2 Сессии
Для guest-режима:
- anonymous_session_id
- device/browser cookie
- temp history
- лимиты на уровне session + IP/device heuristics

Для registered user:
- user_id
- persistent session
- usage tracking
- access rules

## 12. Таблицы БД

### 12.1 users
- id
- created_at
- updated_at
- role
- name
- email
- phone
- auth_provider
- status
- parent_child_grade
- student_age
- is_guest_converted

### 12.2 guest_sessions
- id
- created_at
- expires_at
- fingerprint_hash
- utm_source
- utm_campaign
- locale
- last_seen_at

### 12.3 conversations
- id
- owner_user_id nullable
- guest_session_id nullable
- grade
- subject
- topic
- title
- created_at
- updated_at
- archived_at nullable

### 12.4 messages
- id
- conversation_id
- role
- message_type
- content_text
- rendered_math_html nullable
- token_in
- token_out
- cost_estimate
- created_at

### 12.5 attachments
- id
- message_id
- kind
- file_url
- mime_type
- size_bytes
- created_at

### 12.6 usage_events
- id
- user_id nullable
- guest_session_id nullable
- conversation_id nullable
- event_type
- model_name
- token_in
- token_out
- estimated_cost
- created_at

### 12.7 quota_policies
- id
- name
- user_segment
- daily_messages
- daily_images
- daily_voice_minutes
- monthly_messages
- save_history_enabled
- active

### 12.8 user_quota_state
- id
- user_id
- policy_id
- period_start
- period_end
- used_messages
- used_images
- used_voice_minutes

### 12.9 consent_logs
- id
- user_id nullable
- guest_session_id nullable
- consent_type
- accepted
- accepted_at
- ip_hash
- user_agent_hash
- policy_version

### 12.10 payment_plans
- id
- name
- kind
- price
- currency
- quota_messages
- quota_days
- is_active

### 12.11 payments
- id
- user_id
- plan_id
- status
- amount
- currency
- provider
- provider_payment_id
- created_at
- paid_at nullable

### 12.12 broadcasts
- id
- title
- audience_segment
- channel
- content
- status
- created_at
- sent_at nullable

### 12.13 feature_flags
- id
- key
- enabled
- payload_json
- updated_at

### 12.14 prompt_profiles
- id
- active
- grade_from
- grade_to
- mode
- system_prompt
- parent_overlay_prompt
- subject_overrides_json
- updated_at

## 13. API endpoints MVP

### 13.1 Public / Guest
- POST /api/guest/session
- POST /api/chat/message
- POST /api/chat/upload-image
- POST /api/chat/upload-voice
- GET /api/chat/conversation/:id
- POST /api/capture/register

### 13.2 Authenticated user
- GET /api/me
- PATCH /api/me
- GET /api/conversations
- GET /api/conversations/:id
- POST /api/conversations
- PATCH /api/conversations/:id
- GET /api/history/filters
- GET /api/usage
- GET /api/plans
- POST /api/payments/create

### 13.3 Admin
- GET /api/admin/overview
- GET /api/admin/users
- GET /api/admin/usage
- GET /api/admin/segments
- GET /api/admin/prompts
- PATCH /api/admin/prompts/:id
- GET /api/admin/quotas
- PATCH /api/admin/quotas/:id
- GET /api/admin/payments
- GET /api/admin/feature-flags
- PATCH /api/admin/feature-flags/:id
- POST /api/admin/broadcasts
- GET /api/admin/exports/contacts

## 14. Лимиты MVP

На старте должны быть управляемыми только из админки.

Примеры:
- guest: 3–5 сообщений в день
- guest: 1–2 фото в день
- guest: ограничение по минутам voice
- registered free: повышенный лимит
- paid: пакетные лимиты

Важно:
- лимиты должны считаться отдельно по типам входа
- лимиты должны логироваться
- превышение лимита должно вести в мягкий CTA, а не в “жесткий тупик”

## 15. Монетизация

### 15.1 На старте
- полностью бесплатный тестовый период 1–3 месяца

### 15.2 Затем
Пакеты:
- 10 дней доступа
- 50 запросов
- 100 запросов

### 15.3 Формула цены
Не показывать пользователю “стоимость токенов”.
Показывать:
- понятный пакет
- честное объяснение: сервис работает почти по себестоимости
- небольшой запас на курсы, инфраструктуру и поддержку

## 16. Согласия и персональные данные

Минимальный набор для capture:
- email или телефон
- имя
- роль
- класс/возраст
- согласие на обработку ПД
- отдельное согласие на рассылки

Не собирать на старте:
- лишние данные о ребенке
- лишние паспортные/адресные данные
- школу без необходимости

## 17. Метрики MVP

### 17.1 Product
- first useful answer rate
- guest-to-capture conversion
- capture-to-return conversion
- weekly retained parents
- avg sessions per user
- cost per active user
- subject distribution
- share of image and voice usage

### 17.2 Business
- contacts collected
- consented marketing contacts
- free-to-paid conversion
- CAC by traffic channel
- payback of free period

## 18. Roadmap

### V1
- guest mode
- text/image/voice
- history
- filters
- capture
- admin quotas
- prompt profiles
- usage tracking

### V1.5
- Yandex login
- more refined segmentation
- better parent mode
- better topic auto-tagging

### V2
- Pro features
- export to Obsidian
- learning plan
- richer knowledge structure
- family mode
- multiple children
