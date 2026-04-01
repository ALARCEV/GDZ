import { quotaExceeded } from "@/server/errors/api-error";

export type RateLimitContext = {
  key: string;
  scope: string;
  limitHint?: number | null;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export interface RateLimiter {
  check(context: RateLimitContext): Promise<RateLimitResult>;
}

class NoopRateLimiter implements RateLimiter {
  async check(): Promise<RateLimitResult> {
    return { allowed: true };
  }
}

export const rateLimiter: RateLimiter = new NoopRateLimiter();

export async function enforceRateLimit(context: RateLimitContext) {
  const result = await rateLimiter.check(context);

  if (!result.allowed) {
    throw quotaExceeded("Too many requests for the current actor.", {
      retry_after_seconds: result.retryAfterSeconds ?? null,
      scope: context.scope
    });
  }
}
