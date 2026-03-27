import crypto from "node:crypto";
import prisma from "./prisma.js";
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const SCRYPT_KEYLEN = 64;
let membershipTablesEnsurePromise = null;
function getAuthSecret() {
    const fromEnv = process.env.DEALER_AUTH_SECRET?.trim();
    if (fromEnv)
        return fromEnv;
    const fromAdminKey = process.env.ADMIN_API_KEY?.trim();
    if (fromAdminKey)
        return fromAdminKey;
    const fromDatabaseUrl = process.env.DATABASE_URL?.trim();
    if (fromDatabaseUrl)
        return fromDatabaseUrl;
    return "dealer_auth_fallback_secret_change_me";
}
function hashPassword(secret, salt) {
    const finalSalt = salt ?? crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.scryptSync(secret, finalSalt, SCRYPT_KEYLEN).toString("hex");
    return { passwordSalt: finalSalt, passwordHash };
}
function safeEquals(left, right) {
    const a = Buffer.from(left, "utf8");
    const b = Buffer.from(right, "utf8");
    if (a.length !== b.length)
        return false;
    return crypto.timingSafeEqual(a, b);
}
function signTokenBody(body) {
    return crypto.createHmac("sha256", getAuthSecret()).update(body).digest("base64url");
}
export async function ensureDealerMembershipTables() {
    if (!membershipTablesEnsurePromise) {
        membershipTablesEnsurePromise = (async () => {
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "DealerRegistrationSettings" (
          "companyId" TEXT PRIMARY KEY REFERENCES "Company"("id") ON DELETE CASCADE,
          "enabled" BOOLEAN NOT NULL DEFAULT false,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "DealerAuthCredentials" (
          "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
          "passwordSalt" TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserAuthCredentials" (
          "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
          "passwordSalt" TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
        })();
    }
    await membershipTablesEnsurePromise;
}
export async function getDealerRegistrationEnabled(companyId) {
    await ensureDealerMembershipTables();
    const rows = await prisma.$queryRawUnsafe(`SELECT "companyId", "enabled"
     FROM "DealerRegistrationSettings"
     WHERE "companyId" = $1
     LIMIT 1`, companyId);
    return Boolean(rows[0]?.enabled ?? false);
}
export async function setDealerRegistrationEnabled(companyId, enabled) {
    await ensureDealerMembershipTables();
    await prisma.$executeRawUnsafe(`INSERT INTO "DealerRegistrationSettings" ("companyId", "enabled", "updatedAt")
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT ("companyId")
     DO UPDATE SET
       "enabled" = EXCLUDED."enabled",
       "updatedAt" = CURRENT_TIMESTAMP`, companyId, enabled);
}
export async function listDealerRegistrationCompanies() {
    await ensureDealerMembershipTables();
    return prisma.$queryRawUnsafe(`SELECT
        c."id" AS "companyId",
        c."name" AS "companyName",
        COALESCE(s."enabled", false) AS "enabled"
      FROM "Company" c
      LEFT JOIN "DealerRegistrationSettings" s
        ON s."companyId" = c."id"
      ORDER BY c."name" ASC`);
}
export async function upsertDealerAuthCredential(db, userId, plainPassword) {
    await upsertUserAuthCredential(db, userId, plainPassword);
    const { passwordSalt, passwordHash } = hashPassword(plainPassword);
    await db.$executeRawUnsafe(`INSERT INTO "DealerAuthCredentials" ("userId", "passwordSalt", "passwordHash", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId")
     DO UPDATE SET
       "passwordSalt" = EXCLUDED."passwordSalt",
       "passwordHash" = EXCLUDED."passwordHash",
       "updatedAt" = CURRENT_TIMESTAMP`, userId, passwordSalt, passwordHash);
}
export async function upsertUserAuthCredential(db, userId, plainPassword) {
    const { passwordSalt, passwordHash } = hashPassword(plainPassword);
    await db.$executeRawUnsafe(`INSERT INTO "UserAuthCredentials" ("userId", "passwordSalt", "passwordHash", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId")
     DO UPDATE SET
       "passwordSalt" = EXCLUDED."passwordSalt",
       "passwordHash" = EXCLUDED."passwordHash",
       "updatedAt" = CURRENT_TIMESTAMP`, userId, passwordSalt, passwordHash);
}
export async function verifyDealerAuthCredential(userId, plainPassword) {
    await ensureDealerMembershipTables();
    const rows = await prisma.$queryRawUnsafe(`SELECT "userId", "passwordSalt", "passwordHash"
     FROM "UserAuthCredentials"
     WHERE "userId" = $1
     LIMIT 1`, userId);
    const userCredential = rows[0];
    if (userCredential) {
        const candidate = hashPassword(plainPassword, userCredential.passwordSalt).passwordHash;
        return safeEquals(candidate, userCredential.passwordHash);
    }
    const legacyRows = await prisma.$queryRawUnsafe(`SELECT "userId", "passwordSalt", "passwordHash"
     FROM "DealerAuthCredentials"
     WHERE "userId" = $1
     LIMIT 1`, userId);
    const credential = legacyRows[0];
    if (!credential)
        return false;
    const candidate = hashPassword(plainPassword, credential.passwordSalt).passwordHash;
    return safeEquals(candidate, credential.passwordHash);
}
export async function hasDealerAuthCredential(userId) {
    await ensureDealerMembershipTables();
    const rows = await prisma.$queryRawUnsafe(`SELECT "userId"
     FROM "UserAuthCredentials"
     WHERE "userId" = $1
     LIMIT 1`, userId);
    if (rows.length)
        return true;
    const legacyRows = await prisma.$queryRawUnsafe(`SELECT "userId"
     FROM "DealerAuthCredentials"
     WHERE "userId" = $1
     LIMIT 1`, userId);
    return legacyRows.length > 0;
}
export async function verifyUserAuthCredential(userId, plainPassword) {
    await ensureDealerMembershipTables();
    const rows = await prisma.$queryRawUnsafe(`SELECT "userId", "passwordSalt", "passwordHash"
     FROM "UserAuthCredentials"
     WHERE "userId" = $1
     LIMIT 1`, userId);
    const credential = rows[0];
    if (!credential)
        return false;
    const candidate = hashPassword(plainPassword, credential.passwordSalt).passwordHash;
    return safeEquals(candidate, credential.passwordHash);
}
export async function hasUserAuthCredential(userId) {
    await ensureDealerMembershipTables();
    const rows = await prisma.$queryRawUnsafe(`SELECT "userId"
     FROM "UserAuthCredentials"
     WHERE "userId" = $1
     LIMIT 1`, userId);
    return rows.length > 0;
}
export function createDealerAuthToken(payload, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
        userId: payload.userId,
        dealerId: payload.dealerId,
        companyId: payload.companyId,
        role: "DEALER",
        iat: now,
        exp: now + ttlSeconds
    };
    const body = Buffer.from(JSON.stringify(tokenPayload), "utf8").toString("base64url");
    const signature = signTokenBody(body);
    return `${body}.${signature}`;
}
export function verifyDealerAuthToken(token) {
    const [body, signature] = token.split(".");
    if (!body || !signature)
        return null;
    const expected = signTokenBody(body);
    if (!safeEquals(expected, signature))
        return null;
    let parsed = null;
    try {
        parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== "object")
        return null;
    const input = parsed;
    if (typeof input.userId !== "string" ||
        typeof input.dealerId !== "string" ||
        typeof input.companyId !== "string" ||
        typeof input.exp !== "number" ||
        typeof input.iat !== "number") {
        return null;
    }
    if (input.exp <= Math.floor(Date.now() / 1000))
        return null;
    return {
        userId: input.userId,
        dealerId: input.dealerId,
        companyId: input.companyId,
        role: "DEALER",
        iat: input.iat,
        exp: input.exp
    };
}
export function createAdminAuthToken(payload, ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS) {
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
        userId: payload.userId,
        companyId: payload.companyId ?? null,
        role: payload.role,
        kind: "ADMIN",
        iat: now,
        exp: now + ttlSeconds
    };
    const body = Buffer.from(JSON.stringify(tokenPayload), "utf8").toString("base64url");
    const signature = signTokenBody(body);
    return `${body}.${signature}`;
}
export function verifyAdminAuthToken(token) {
    const [body, signature] = token.split(".");
    if (!body || !signature)
        return null;
    const expected = signTokenBody(body);
    if (!safeEquals(expected, signature))
        return null;
    let parsed = null;
    try {
        parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== "object")
        return null;
    const input = parsed;
    const allowedRoles = new Set(["OWNER", "ADMIN", "WAREHOUSE", "ACCOUNTING"]);
    if (typeof input.userId !== "string" ||
        (input.companyId !== null && typeof input.companyId !== "string") ||
        typeof input.role !== "string" ||
        !allowedRoles.has(input.role) ||
        input.kind !== "ADMIN" ||
        typeof input.exp !== "number" ||
        typeof input.iat !== "number") {
        return null;
    }
    if (input.exp <= Math.floor(Date.now() / 1000))
        return null;
    return {
        userId: input.userId,
        companyId: input.companyId ?? null,
        role: input.role,
        kind: "ADMIN",
        iat: input.iat,
        exp: input.exp
    };
}
