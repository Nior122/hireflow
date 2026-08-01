import { PrismaClient, Prisma } from "@prisma/client";

export { Prisma, PrismaClient };

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

// Lazy singleton — only constructed on first property access, never at import time.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalThis.__prisma) {
      globalThis.__prisma = createPrismaClient();
    }
    const value = (globalThis.__prisma as any)[prop];
    return typeof value === "function" ? value.bind(globalThis.__prisma) : value;
  },
});
