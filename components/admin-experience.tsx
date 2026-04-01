"use client";

import { useEffect, useState } from "react";

import {
  type AdminCapturePayload,
  type AdminOverviewPayload,
  type AdminPanelData,
  type AdminPromptsPayload,
  type AdminQuotasPayload,
  type AdminSegmentsPayload,
  type AdminUsagePayload,
  type AdminUsersPayload
} from "@/lib/api/types";
import { getErrorMessage, readJsonOrThrow } from "@/lib/client/api";
import { createUserAuthHeaders, readStoredUserId } from "@/lib/client/session";

import { AdminPanel } from "@/components/admin-panel";

export function AdminExperience() {
  const [data, setData] = useState<AdminPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = readStoredUserId();

    if (!userId) {
      setError("Для входа в админку нужен авторизованный пользователь с ролью ADMIN.");
      return;
    }

    const headers = createUserAuthHeaders(userId);

    void Promise.all([
      fetch("/api/admin/overview", { headers }).then((response) =>
        readJsonOrThrow<AdminOverviewPayload>(response, "Не удалось загрузить обзор админки.")
      ),
      fetch("/api/admin/users", { headers }).then((response) =>
        readJsonOrThrow<AdminUsersPayload>(response, "Не удалось загрузить пользователей.")
      ),
      fetch("/api/admin/usage", { headers }).then((response) =>
        readJsonOrThrow<AdminUsagePayload>(response, "Не удалось загрузить использование.")
      ),
      fetch("/api/admin/capture", { headers }).then((response) =>
        readJsonOrThrow<AdminCapturePayload>(response, "Не удалось загрузить capture-аналитику.")
      ),
      fetch("/api/admin/quotas", { headers }).then((response) =>
        readJsonOrThrow<AdminQuotasPayload>(response, "Не удалось загрузить квоты.")
      ),
      fetch("/api/admin/prompts", { headers }).then((response) =>
        readJsonOrThrow<AdminPromptsPayload>(response, "Не удалось загрузить prompt-профили.")
      ),
      fetch("/api/admin/segments", { headers }).then((response) =>
        readJsonOrThrow<AdminSegmentsPayload>(response, "Не удалось загрузить сегменты.")
      )
    ])
      .then(([overview, users, usage, capture, quotas, prompts, segments]) => {
        setData({
          overview,
          users,
          usage,
          capture,
          quotas,
          prompts,
          segments
        });
      })
      .catch((loadError) => {
        setError(getErrorMessage(loadError, "Не удалось загрузить админку."));
      });
  }, []);

  if (error) {
    return (
      <div className="section-card">
        <h2>Доступ ограничен</h2>
        <p className="page-copy">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="section-card">
        <h2>Загружаем админку</h2>
        <p className="page-copy">Подтягиваем квоты, prompt-профили, использование и capture-аналитику.</p>
      </div>
    );
  }

  return <AdminPanel data={data} />;
}
