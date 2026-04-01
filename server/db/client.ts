import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

export function getDb() {
  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = createPrismaClient();
  }

  return globalThis.__prisma__;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  }
});
