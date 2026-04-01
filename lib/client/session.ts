export const sessionStorageKeys = {
  guestSessionId: "school-assistant.guest-session-id",
  userId: "school-assistant.user-id"
} as const;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readSessionValue(key: string) {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function writeSessionValue(key: string, value: string | null) {
  if (!canUseStorage()) {
    return;
  }

  if (value == null) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

export function readStoredGuestSessionId() {
  return readSessionValue(sessionStorageKeys.guestSessionId);
}

export function readStoredUserId() {
  return readSessionValue(sessionStorageKeys.userId);
}

export function createUserAuthHeaders(userId?: string | null) {
  const headers: Record<string, string> = {};

  if (userId) {
    headers["x-user-id"] = userId;
  }

  return headers;
}
