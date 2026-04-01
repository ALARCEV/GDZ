type ApiErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export async function readJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? payload?.message ?? fallbackMessage);
  }

  return payload as T;
}

export function createJsonHeaders(extraHeaders?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    ...extraHeaders
  };
}
