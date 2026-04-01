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

export function AdminExperienceClean() {
  const [data, setData] = useState<AdminPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = readStoredUserId();

    if (!userId) {
      setError("Admin access requires a signed-in user with the ADMIN role.");
      return;
    }

    const headers = createUserAuthHeaders(userId);

    void Promise.all([
      fetch("/api/admin/overview", { headers }).then((response) =>
        readJsonOrThrow<AdminOverviewPayload>(response, "Failed to load the admin overview.")
      ),
      fetch("/api/admin/users", { headers }).then((response) =>
        readJsonOrThrow<AdminUsersPayload>(response, "Failed to load users.")
      ),
      fetch("/api/admin/usage", { headers }).then((response) =>
        readJsonOrThrow<AdminUsagePayload>(response, "Failed to load usage.")
      ),
      fetch("/api/admin/capture", { headers }).then((response) =>
        readJsonOrThrow<AdminCapturePayload>(response, "Failed to load capture analytics.")
      ),
      fetch("/api/admin/quotas", { headers }).then((response) =>
        readJsonOrThrow<AdminQuotasPayload>(response, "Failed to load quotas.")
      ),
      fetch("/api/admin/prompts", { headers }).then((response) =>
        readJsonOrThrow<AdminPromptsPayload>(response, "Failed to load prompt profiles.")
      ),
      fetch("/api/admin/segments", { headers }).then((response) =>
        readJsonOrThrow<AdminSegmentsPayload>(response, "Failed to load segments.")
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
        setError(getErrorMessage(loadError, "Failed to load the admin panel."));
      });
  }, []);

  if (error) {
    return (
      <div className="section-card">
        <h2>Access limited</h2>
        <p className="page-copy">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="section-card">
        <h2>Loading admin panel</h2>
        <p className="page-copy">
          Fetching quotas, prompt profiles, usage, and capture analytics.
        </p>
      </div>
    );
  }

  return <AdminPanel data={data} />;
}
