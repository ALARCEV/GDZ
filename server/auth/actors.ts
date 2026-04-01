import { NextRequest } from "next/server";

import { db } from "@/server/db/client";
import { forbidden, notFound, unauthorized } from "@/server/errors/api-error";

export function requireUserId(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    throw unauthorized("Missing `x-user-id` header for authenticated route.");
  }

  return userId;
}

export async function requireExistingUser(request: NextRequest) {
  const userId = requireUserId(request);
  return requireExistingUserById(userId);
}

export async function requireExistingUserById(userId: string | null | undefined) {
  if (!userId) {
    throw unauthorized("Missing `x-user-id` header for authenticated route.");
  }

  const user = await db.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw notFound("Authenticated user was not found.");
  }

  return user;
}

export async function requireAdminUser(request: NextRequest) {
  const user = await requireExistingUser(request);

  if (user.role !== "ADMIN") {
    throw forbidden("Admin access is required.");
  }

  return user;
}

export async function requireAdminUserById(userId: string | null | undefined) {
  const user = await requireExistingUserById(userId);

  if (user.role !== "ADMIN") {
    throw forbidden("Admin access is required.");
  }

  return user;
}

export function getIpAddress(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") ?? null;
}
