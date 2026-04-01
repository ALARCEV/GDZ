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

export function ProfileExperienceClean() {
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
        readJsonOrThrow<MeResponsePayload>(response, "Failed to load the profile.")
      ),
      fetch("/api/usage", { headers }).then((response) =>
        readJsonOrThrow<UsageResponsePayload>(response, "Failed to load usage.")
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
        setError(getErrorMessage(loadError, "Failed to load the profile."));
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

    setSaveState("Saving changes...");

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
        "Failed to save the profile."
      );

      setProfile(payload);
      setSaveState("Profile updated.");
    } catch (saveError) {
      setSaveState(getErrorMessage(saveError, "Failed to save the profile."));
    }
  }

  if (loading) {
    return (
      <section className="section-card">
        <h2>Loading profile</h2>
        <p className="page-copy">Fetching your name, limits, and current access status.</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <section className="page-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h1>Saved access appears after the first capture</h1>
            <p className="page-copy">
              Start with a helpful answer in chat, then save progress and unlock a calmer
              history flow.
            </p>
          </div>
          <div className="hero-links">
            <Link className="button-primary" href="/chat">
              Open chat
            </Link>
            <Link className="button-secondary" href="/history">
              Open history
            </Link>
          </div>
        </section>
        {error ? (
          <div className="state-banner error">{error}</div>
        ) : (
          <section className="section-card">
            <h2>You are in guest mode for now</h2>
            <p className="page-copy">
              After a quick save, this page will show your role, limits, and available plan.
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
          <p className="eyebrow">Profile</p>
          <h1>Everything important about access in one place</h1>
          <p className="page-copy">
            See your role, current limits, and what is still available in the current period
            without extra clutter.
          </p>
        </div>
        <div className="profile-actions">
          <Link className="button-primary" href="/chat">
            Back to chat
          </Link>
          <Link className="button-secondary" href="/history">
            Open history
          </Link>
        </div>
      </section>

      <section className="profile-grid">
        <article className="section-card">
          <h2>Who you are</h2>
          <div className="profile-stat-list">
            <div>
              <span>Role</span>
              <strong>{profile.user.role === "parent" ? "Parent" : "Student"}</strong>
            </div>
            <div>
              <span>Name</span>
              <strong>{profile.user.name}</strong>
            </div>
            <div>
              <span>Contact</span>
              <strong>{profile.user.email ?? profile.user.phone ?? "Not set"}</strong>
            </div>
            <div>
              <span>{profile.user.role === "parent" ? "Child grade" : "Age"}</span>
              <strong>
                {profile.user.role === "parent"
                  ? `${profile.user.child_grade ?? "-"} grade`
                  : `${profile.user.student_age ?? "-"} years`}
              </strong>
            </div>
          </div>
        </article>

        <article className="section-card">
          <h2>Remaining limits</h2>
          <div className="profile-stat-list">
            <div>
              <span>Messages</span>
              <strong>{profile.quota.messages_remaining ?? "Unlimited"}</strong>
            </div>
            <div>
              <span>Images</span>
              <strong>{profile.quota.images_remaining ?? "Unlimited"}</strong>
            </div>
            <div>
              <span>Voice minutes</span>
              <strong>{profile.quota.voice_minutes_remaining ?? "Unlimited"}</strong>
            </div>
            <div>
              <span>Plan</span>
              <strong>{profile.plan.status === "free" ? "Free" : "Paid"}</strong>
            </div>
          </div>
        </article>

        <article className="section-card">
          <h2>Usage</h2>
          <div className="profile-stat-list">
            <div>
              <span>Messages used</span>
              <strong>{usage?.current_period.messages_used ?? 0}</strong>
            </div>
            <div>
              <span>Images used</span>
              <strong>{usage?.current_period.images_used ?? 0}</strong>
            </div>
            <div>
              <span>Voice minutes used</span>
              <strong>{usage?.current_period.voice_minutes_used ?? 0}</strong>
            </div>
            <div>
              <span>Quota policy</span>
              <strong>{profile.quota.policy}</strong>
            </div>
          </div>
        </article>

        <form className="section-card profile-form-card" onSubmit={handleSubmit}>
          <h2>Update details</h2>
          <div className="field-grid">
            <label className="field">
              <span>Name</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                value={form.name}
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                value={form.phone}
              />
            </label>
            {profile.user.role === "parent" ? (
              <label className="field">
                <span>Child grade</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({ ...current, childGrade: event.target.value }))
                  }
                  value={form.childGrade}
                >
                  {Array.from({ length: 7 }, (_, index) => String(index + 1)).map((item) => (
                    <option key={item} value={item}>
                      {item} grade
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>Age</span>
                <select
                  onChange={(event) =>
                    setForm((current) => ({ ...current, studentAge: event.target.value }))
                  }
                  value={form.studentAge}
                >
                  {Array.from({ length: 9 }, (_, index) => String(index + 9)).map((item) => (
                    <option key={item} value={item}>
                      {item} years
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {saveState ? <div className="state-banner success">{saveState}</div> : null}
          <button className="button-primary" type="submit">
            Save changes
          </button>
        </form>
      </section>
    </div>
  );
}
