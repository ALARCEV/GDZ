"use client";

import { useState } from "react";

type OverviewPayload = {
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

type UsersPayload = {
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

type UsagePayload = {
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

type CapturePayload = {
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

type QuotasPayload = {
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

type PromptsPayload = {
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

type SegmentsPayload = {
  items: Array<{
    key: string;
    label: string;
    description: string;
    count: number;
    csv: string;
  }>;
};

type AdminPanelProps = {
  data: {
    overview: OverviewPayload;
    users: UsersPayload;
    usage: UsagePayload;
    capture: CapturePayload;
    quotas: QuotasPayload;
    prompts: PromptsPayload;
    segments: SegmentsPayload;
  };
};

function MiniBars({ points }: { points: Array<{ date: string; value: number }> }) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="admin-mini-bars" aria-hidden="true">
      {points.map((point) => (
        <div className="admin-mini-bar-item" key={point.date}>
          <span
            className="admin-mini-bar"
            style={{ height: `${Math.max((point.value / max) * 100, point.value > 0 ? 10 : 4)}%` }}
          />
          <small>{point.date.slice(5)}</small>
        </div>
      ))}
    </div>
  );
}

function parseNumberField(formData: FormData, key: string) {
  const rawValue = String(formData.get(key) ?? "").trim();
  return rawValue === "" ? null : Number(rawValue);
}

async function readJsonOrThrow(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Request failed.");
  }

  return payload;
}

function getAdminHeaders() {
  if (typeof window === "undefined") {
    return { "Content-Type": "application/json" };
  }

  const userId = window.localStorage.getItem("school-assistant.user-id");

  return {
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {})
  };
}

export function AdminPanel({ data }: AdminPanelProps) {
  const [quotas, setQuotas] = useState(data.quotas.items);
  const [prompts, setPrompts] = useState(data.prompts.items);
  const [saveState, setSaveState] = useState<string | null>(null);

  async function handleQuotaSave(id: string, formData: FormData) {
    setSaveState("Сохраняем квоты...");

    try {
      const response = await fetch(`/api/admin/quotas/${id}`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          daily_messages: parseNumberField(formData, "daily_messages"),
          daily_images: parseNumberField(formData, "daily_images"),
          daily_voice_minutes: parseNumberField(formData, "daily_voice_minutes"),
          monthly_messages: parseNumberField(formData, "monthly_messages"),
          capture_after_value: Number(formData.get("capture_after_value")),
          save_history_enabled: formData.get("save_history_enabled") === "on",
          soft_limit: formData.get("soft_limit") === "on",
          active: formData.get("active") === "on"
        })
      });

      const payload = await readJsonOrThrow(response);
      setQuotas((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                dailyMessages: payload.item.dailyMessages,
                dailyImages: payload.item.dailyImages,
                dailyVoiceMinutes: payload.item.dailyVoiceMinutes,
                monthlyMessages: payload.item.monthlyMessages,
                captureAfterValue: payload.item.captureAfterValue,
                saveHistoryEnabled: payload.item.saveHistoryEnabled,
                softLimit: payload.item.softLimit,
                active: payload.item.active
              }
            : item
        )
      );
      setSaveState("Квоты обновлены.");
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : "Не удалось сохранить квоты.");
    }
  }

  async function handlePromptSave(id: string, formData: FormData) {
    setSaveState("Сохраняем prompt policy...");

    try {
      const overridesText = String(formData.get("subject_overrides_json") || "").trim();
      const response = await fetch(`/api/admin/prompts/${id}`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          active: formData.get("active") === "on",
          label: String(formData.get("label") || ""),
          grade_from: Number(formData.get("grade_from")),
          grade_to: Number(formData.get("grade_to")),
          mode: String(formData.get("mode") || ""),
          system_prompt: String(formData.get("system_prompt") || ""),
          parent_overlay_prompt: String(formData.get("parent_overlay_prompt") || "") || null,
          subject_overrides_json: overridesText ? JSON.parse(overridesText) : null
        })
      });

      const payload = await readJsonOrThrow(response);
      setPrompts((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                active: payload.item.active,
                label: payload.item.label,
                gradeFrom: payload.item.gradeFrom,
                gradeTo: payload.item.gradeTo,
                mode: payload.item.mode,
                systemPrompt: payload.item.systemPrompt,
                parentOverlayPrompt: payload.item.parentOverlayPrompt,
                subjectOverridesJson: payload.item.subjectOverridesJson
              }
            : item
        )
      );
      setSaveState("Prompt policy обновлён.");
    } catch (error) {
      setSaveState(error instanceof Error ? error.message : "Не удалось сохранить prompt profile.");
    }
  }

  return (
    <div className="admin-layout">
      <section className="section-card admin-kpis">
        {[
          {
            label: "Гость -> регистрация",
            value: `${data.overview.metrics.guestToRegisteredConversion}%`
          },
          { label: "Активные пользователи", value: data.overview.metrics.activeUsers },
          { label: "Сообщений сегодня", value: data.overview.metrics.messagesToday },
          { label: "Фото-запросы", value: data.overview.metrics.photoRequestsToday },
          { label: "Голосовые запросы", value: data.overview.metrics.voiceRequestsToday },
          { label: "Превышения квот", value: data.overview.metrics.quotaOverrunsToday }
        ].map((item) => (
          <article className="admin-kpi" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <div className="admin-grid">
        <section className="section-card">
          <h2>Обзор</h2>
          <p className="page-copy">
            Ключевые продуктовые сигналы: конверсия, дневной usage и триггеры capture.
          </p>
          <MiniBars points={data.overview.trends.messagesPerDay} />
          <div className="admin-inline-stats">
            {data.overview.capture.triggers.map((item) => (
              <div className="admin-chip" key={item.trigger}>
                <strong>{item.count}</strong>
                <span>{item.trigger}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card">
          <h2>Capture-аналитика</h2>
          <div className="admin-inline-stats">
            <div className="admin-chip">
              <strong>{data.capture.summary.guestToRegisteredConversion}%</strong>
              <span>Конверсия</span>
            </div>
            <div className="admin-chip">
              <strong>{data.capture.summary.marketingConsentRate}%</strong>
              <span>Маркетинговое согласие</span>
            </div>
            <div className="admin-chip">
              <strong>{data.capture.summary.totalCaptureEvents}</strong>
              <span>События</span>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Когда</th>
                  <th>Триггер</th>
                  <th>Статус</th>
                  <th>Пользователь</th>
                </tr>
              </thead>
              <tbody>
                {data.capture.recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td>{event.trigger}</td>
                    <td>{event.status}</td>
                    <td>{event.registeredUserName ?? event.guestSessionId.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-card admin-span-2">
          <h2>Пользователи и лиды</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th>Контакт</th>
                  <th>Сегмент</th>
                  <th>Сообщения</th>
                  <th>Последняя активность</th>
                </tr>
              </thead>
              <tbody>
                {data.users.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.email ?? user.phone ?? "Нет контакта"}</td>
                    <td>{user.segment}</td>
                    <td>{user.messagesUsed}</td>
                    <td>
                      {user.lastActivityAt
                        ? new Date(user.lastActivityAt).toLocaleDateString("ru-RU")
                        : "Без активности"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-card">
          <h2>Использование</h2>
          <div className="admin-inline-stats">
            <div className="admin-chip">
              <strong>{data.usage.totals.messages}</strong>
              <span>Сообщения / 30д</span>
            </div>
            <div className="admin-chip">
              <strong>{data.usage.totals.totalCost.toFixed(3)}</strong>
              <span>Оценка стоимости</span>
            </div>
            <div className="admin-chip">
              <strong>{data.usage.totals.avgCostPerActiveUser.toFixed(3)}</strong>
              <span>Стоимость на активного</span>
            </div>
          </div>
          <MiniBars points={data.usage.dailyMessages.slice(-14)} />
          <div className="admin-inline-stats">
            {data.usage.modalityBreakdown.map((item) => (
              <div className="admin-chip" key={item.key}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card admin-span-2">
          <h2>Квоты</h2>
          <p className="page-copy">
            Free limits и paid pack limits редактируются здесь и сохраняются в БД.
          </p>
          {saveState ? <div className="state-banner success">{saveState}</div> : null}
          <div className="admin-form-grid">
            {quotas.map((quota) => (
              <form
                className="admin-editor"
                key={quota.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleQuotaSave(quota.id, new FormData(event.currentTarget));
                }}
              >
                <div className="admin-editor-header">
                  <div>
                    <strong>{quota.name}</strong>
                    <p className="page-copy">
                      {quota.userSegment}
                      {quota.billingPlanCode ? ` · ${quota.billingPlanCode}` : ""}
                    </p>
                  </div>
                  <span className="admin-badge">
                    {quota.assignedUsers == null ? "по сессиям" : `${quota.assignedUsers} пользователей`}
                  </span>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Сообщений в день</span>
                    <input defaultValue={quota.dailyMessages ?? ""} name="daily_messages" type="number" />
                  </label>
                  <label className="field">
                    <span>Фото в день</span>
                    <input defaultValue={quota.dailyImages ?? ""} name="daily_images" type="number" />
                  </label>
                  <label className="field">
                    <span>Голосовых минут</span>
                    <input
                      defaultValue={quota.dailyVoiceMinutes ?? ""}
                      name="daily_voice_minutes"
                      type="number"
                    />
                  </label>
                  <label className="field">
                    <span>Сообщений в месяц</span>
                    <input defaultValue={quota.monthlyMessages ?? ""} name="monthly_messages" type="number" />
                  </label>
                  <label className="field">
                    <span>Capture после пользы</span>
                    <input defaultValue={quota.captureAfterValue} name="capture_after_value" type="number" />
                  </label>
                </div>
                <label className="checkbox-row">
                  <input defaultChecked={quota.saveHistoryEnabled} name="save_history_enabled" type="checkbox" />
                  <span>Разрешать историю</span>
                </label>
                <label className="checkbox-row">
                  <input defaultChecked={quota.softLimit} name="soft_limit" type="checkbox" />
                  <span>Мягкий CTA вместо жесткой блокировки</span>
                </label>
                <label className="checkbox-row">
                  <input defaultChecked={quota.active} name="active" type="checkbox" />
                  <span>Политика активна</span>
                </label>
                <button className="button-primary" type="submit">
                  Сохранить квоту
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="section-card admin-span-2">
          <h2>Prompt-профили по классам</h2>
          <div className="admin-form-grid">
            {prompts.map((prompt) => (
              <form
                className="admin-editor"
                key={prompt.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  void handlePromptSave(prompt.id, new FormData(event.currentTarget));
                }}
              >
                <div className="admin-editor-header">
                  <strong>{prompt.label}</strong>
                  <span className="admin-badge">
                    {prompt.gradeFrom}-{prompt.gradeTo}
                  </span>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Название</span>
                    <input defaultValue={prompt.label} name="label" />
                  </label>
                  <label className="field">
                    <span>Класс от</span>
                    <input defaultValue={prompt.gradeFrom} name="grade_from" type="number" />
                  </label>
                  <label className="field">
                    <span>Класс до</span>
                    <input defaultValue={prompt.gradeTo} name="grade_to" type="number" />
                  </label>
                  <label className="field">
                    <span>Режим</span>
                    <input defaultValue={prompt.mode} name="mode" />
                  </label>
                  <label className="field field-full">
                    <span>Системный prompt</span>
                    <textarea defaultValue={prompt.systemPrompt} name="system_prompt" rows={5} />
                  </label>
                  <label className="field field-full">
                    <span>Подсказка для родителя</span>
                    <textarea
                      defaultValue={prompt.parentOverlayPrompt ?? ""}
                      name="parent_overlay_prompt"
                      rows={3}
                    />
                  </label>
                  <label className="field field-full">
                    <span>Переопределения по предметам JSON</span>
                    <textarea
                      defaultValue={JSON.stringify(prompt.subjectOverridesJson ?? {}, null, 2)}
                      name="subject_overrides_json"
                      rows={5}
                    />
                  </label>
                </div>
                <label className="checkbox-row">
                  <input defaultChecked={prompt.active} name="active" type="checkbox" />
                  <span>Профиль активен</span>
                </label>
                <button className="button-primary" type="submit">
                  Сохранить prompt-профиль
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="section-card admin-span-2">
          <h2>Сегменты для выгрузки</h2>
          <p className="page-copy">
            Без встроенной рассылки: только готовые сегменты и CSV для выгрузки.
          </p>
          <div className="admin-form-grid">
            {data.segments.items.map((segment) => (
              <article className="admin-editor" key={segment.key}>
                <div className="admin-editor-header">
                  <div>
                    <strong>{segment.label}</strong>
                    <p className="page-copy">{segment.description}</p>
                  </div>
                  <span className="admin-badge">{segment.count}</span>
                </div>
                <textarea className="admin-export-box" readOnly value={segment.csv} rows={8} />
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
