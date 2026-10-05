import type { Prisma } from '@prisma/client';

/** Turn validated application data into a plain JSON tree accepted by Prisma JSON columns. */
export function prismaJson(value: object): Prisma.InputJsonValue {
  // Removes browser prototype data and undefined properties before persistence.
  // JSON.parse returns any; assign to unknown first so the assertion is explicit.
  const serialized: unknown = JSON.parse(JSON.stringify(value));
  return serialized as Prisma.InputJsonValue;
}
