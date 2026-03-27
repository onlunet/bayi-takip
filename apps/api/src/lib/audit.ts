import { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function normalizeUserId(userId: string | null | undefined) {
  if (!userId) return undefined;
  if (userId === "bootstrap-owner" || userId === "env-admin") return undefined;
  return userId;
}

function toJsonSafe(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => {
      const safe = toJsonSafe(item);
      return safe === undefined ? "" : safe;
    }) as Prisma.InputJsonValue;
  }
  if (typeof value === "object") {
    const output: Record<string, Prisma.InputJsonValue> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      const safe = toJsonSafe(val);
      if (safe !== undefined) {
        output[key] = safe;
      }
    });
    return output as Prisma.InputJsonValue;
  }
  return String(value) as Prisma.InputJsonValue;
}

export async function writeAuditLog(
  db: PrismaLike,
  input: {
    companyId: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }
) {
  try {
    await db.auditLog.create({
      data: {
        companyId: input.companyId,
        userId: normalizeUserId(input.userId),
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValue: toJsonSafe(input.oldValue),
        newValue: toJsonSafe(input.newValue)
      }
    });
  } catch {
    // Audit yazimi is akislarini kesmesin.
  }
}
