"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  type MeResponsePayload,
  type UsageResponsePayload
} from "@/lib/api/types";
import {
  createJsonHeaders,
  getErrorMessage,
  readJsonOrThrow
} from "@/lib/client/api";
import { createUserAuthHeaders, readStoredUserId } from "@/lib/client/session";

type ProfileFormState = {
  name: string;
  phone: string;
  childGrade: string;
  studentAge: string;
};

export function ProfileExperience() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [profile, setProfile] = useState<MeResponsePayload | null>(null);
  const [usage, setUsage] = useState<UsageResponsePayload | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    phone: "",
    childGrade: "4",
    studentAge: "10"
  });

  useEffect(() => {
    const userId = readStoredUserId();

    if (!userId) {
      setLoading(false);
      return;
    }

    const headers = createUserAuthHeaders(userId);

    void Promise.all([
      fetch("/api/me", { headers }).then((response) =>
        readJsonOrThrow<MeResponsePayload>(response, "Не удалось загрузить профиль.")
      ),
      fetch("/api/usage", { headers }).then((response) =>
        readJsonOrThrow<UsageResponsePayload>(response, "Не удалось загрузить использование.")
      )
    ])
      .then(([me, usagePayload]) => {
        setProfile(me);
        setUsage(usagePayload);
        setForm({
          name: me.user.name,
          phone: me.user.phone ?? "",
          childGrade: String(me.user.child_grade ?? 4),
          studentAge: String(me.user.student_age ?? 10)
        });
      })
      .catch((loadError) => {
        setError(getErrorMessage(loadError, "Не удалось загрузить профиль."));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userId = readStoredUserId();

    if (!userId || !profile) {
      return;
    }

    setSaveState("Сохраняем изменения...");

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: createJsonHeaders(createUserAuthHeaders(userId)),
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          ...(profile.user.role === "parent"
            ? { child_grade: Number(form.childGrade) }
            : { student_age: Number(form.studentAge) })
        })
      });
      const payload = await readJsonOrThrow<MeResponsePayload>(
        response,
        "Не удалось сохранить профиль."
      );

      setProfile(payload);
      setSaveState("Профиль обновлен.");
    } catch (saveError) {
      setSaveState(getErrorMessage(saveError, "Не удалось сохранить профиль."));
    }
  }

  if (loading) {
    return (
      <section className="section-card">
        <h2>Загружаем профиль</h2>
        <p className="page-copy">Подтягиваем имя, лимиты и текущий статус доступа.</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <section className="page-header">
          <div>
            <p className="eyebrow">Профиль</p>
            <h1>Сохраненный доступ появится после capture</h1>
            <p className="page-copy">
              Сначала можно спокойно получить полезный ответ в чате, а затем сохранить прогресс и
              открыть историю без хаоса.
            </p>
          </div>
          <div className="hero-links">
            <Link className="button-primary" href="/chat">
              Перейти в чат
            </Link>
            <Link className="button-secondary" href="/history">
              Посмотреть историю
            </Link>
          </div>
        </section>
        {error ? (
          <div className="state-banner error">{error}</div>
        ) : (
          <section className="section-card">
            <h2>Пока вы в гостевом режиме</h2>
            <p className="page-copy">
              После короткого сохранения здесь появятся имя, роль, лимиты и доступный тариф.
            </p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="profile-page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Профиль</p>
          <h1>Все важное по доступу в одном месте</h1>
          <p className="page-copy">
            Здесь видно роль, текущие лимиты и что еще осталось в этом периоде. Без лишних
            настроек и без перегруженного кабинета.
          </p>
        </div>
        <div className="profile-actions">
          <Link className="button-primary" href="/chat">
            Вернуться в чат
          </Link>
          <Link className="button-secondary" href="/history">
            Открыть историю
          </Link>
        </div>
      </section>

      <section className="profile-grid">
        <article className="section-card">
          <h2>Кто вы</h2>
          <div className="profile-stat-list">
            <div>
              <span>Роль</span>
              <strong>{profile.user.role === "parent" ? "Родитель" : "Ученик"}</strong>
            </div>
            <div>
              <span>Имя</span>
              <strong>{profile.user.name}</strong>
            </div>
            <div>
              <span>Контакт</span>
              <strong>{profile.user.email ?? profile.user.phone ?? "Не указан"}</strong>
            </div>
            <div>
              <span>{profile.user.role === "parent" ? "Класс ребенка" : "Возраст"}</span>
              <strong>
                {profile.user.role === "parent"
                  ? `${profile.user.child_grade ?? "—"} класс`
                  : `${profile.user.student_age ?? "—"} лет`}
              </strong>
            </div>
          </div>
        </article>

        <article className="section-card">
          <h2>Остаток лимитов</h2>
          <div className="profile-stat-list">
            <div>
              <span>Сообщения</span>
              <strong>{profile.quota.messages_remaining ?? "Без лимита"}</strong>
            </div>
            <div>
              <span>Фото</span>
              <strong>{profile.quota.images_remaining ?? "Без лимита"}</strong>
            </div>
            <div>
              <span>Голосовые минуты</span>
              <strong>{profile.quota.voice_minutes_remaining ?? "Без лимита"}</strong>
            </div>
            <div>
              <span>План</span>
              <strong>{profile.plan.status === "free" ? "Бесплатный" : "Платный"}</strong>
            </div>
          </div>
        </article>

        <article className="section-card">
          <h2>Использование</h2>
          <div className="profile-stat-list">
            <div>
              <span>Сообщений использовано</span>
              <strong>{usage?.current_period.messages_used ?? 0}</strong>
            </div>
            <div>
              <span>Фото использовано</span>
              <strong>{usage?.current_period.images_used ?? 0}</strong>
            </div>
            <div>
              <span>Голосовых минут</span>
              <strong>{usage?.current_period.voice_minutes_used ?? 0}</strong>
            </div>
            <div>
              <span>Политика квот</span>
              <strong>{profile.quota.policy}</strong>
            </div>
          </div>
        </article>

        <form className="section-card profile-form-card" onSubmit={handleSubmit}>
          <h2>Обновить данные</h2>
          <div className="field-grid">
            <label className="field">
              <span>Имя</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                value={form.name}
              />
            </label>
            <label className="field">
              <span>Телефон</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                value={form.phone}
              />
            </label>
            {profile.user.role === "parent" ? (
              <label className="field">
                <span>Класс ребенка</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({ ...current, childGrade: event.target.value }))
                  }
                  value={form.childGrade}
                >
                  {Array.from({ length: 7 }, (_, index) => String(index + 1)).map((item) => (
                    <option key={item} value={item}>
                      {item} класс
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>Возраст</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({ ...current, studentAge: event.target.value }))
                  }
                  value={form.studentAge}
                >
                  {Array.from({ length: 9 }, (_, index) => String(index + 9)).map((item) => (
                    <option key={item} value={item}>
                      {item} лет
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {saveState ? <div className="state-banner success">{saveState}</div> : null}
          <button className="button-primary" type="submit">
            Сохранить изменения
          </button>
        </form>
      </section>
    </div>
  );
}
