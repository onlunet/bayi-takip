import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { FastifyInstance } from "fastify";
import { z } from "zod";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type ProtectionMode = "STANDARD" | "ENHANCED_FAMILY_LINK";

type DailyLimitByDay = Record<DayKey, number>;
type BedtimeByDay = Record<DayKey, { start: string; end: string }>;

type ChildPolicy = {
  dailyLimitMinutes: DailyLimitByDay;
  bedtime: BedtimeByDay;
  appLimitsMinutes: Record<string, number>;
  webFilter: {
    safeSearch: boolean;
    blockedDomains: string[];
    allowDomains: string[];
  };
};

type ParentSession = {
  token: string;
  createdAt: string;
};

type ChildSession = {
  token: string;
  expiresAt: string;
};

type PairingCode = {
  codeSalt: string;
  codeHash: string;
  codeMask: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

type ParentVerificationCode = {
  codeSalt: string;
  codeHash: string;
  codeMask: string;
  childId: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
};

type UsageEvent = {
  id: string;
  childId: string;
  appName: string;
  minutes: number;
  startedAt: string;
  recordedAt: string;
};

type LocationEvent = {
  id: string;
  childId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  source: "CHILD_APP";
  capturedAt: string;
  recordedAt: string;
};

type ChildRecord = {
  id: string;
  name: string;
  deviceId: string;
  passwordSalt: string;
  passwordHash: string;
  childPasswordUpdatedAt: string | null;
  disclosureAckAt: string | null;
  policy: ChildPolicy;
  sessions: ChildSession[];
  createdAt: string;
  lastSeenAt: string;
};

type FamilyCompliance = {
  privacyPolicyVersion: string;
  termsVersion: string;
  protectionMode: ProtectionMode;
  prominentDisclosureAcceptedAt: string;
  childMonitoringDisclosureAcceptedAt: string;
  countryCode: string | null;
  dataRetentionDays: number;
  accountDeletionAvailable: boolean;
  updatedAt: string;
};

type FamilyRecord = {
  id: string;
  parent: {
    name: string;
    email: string | null;
    phone: string | null;
    pinSalt: string;
    pinHash: string;
    createdAt: string;
  };
  compliance: FamilyCompliance;
  lastPairingCodeIssuedAt: string | null;
  lastParentVerificationCodeIssuedAt: string | null;
  parentSessions: ParentSession[];
  pairingCodes: PairingCode[];
  parentVerificationCodes: ParentVerificationCode[];
  children: ChildRecord[];
  usageEvents: UsageEvent[];
  locationEvents: LocationEvent[];
};

type ParentalControlStore = {
  families: FamilyRecord[];
};

const STORE_FILE = path.resolve(process.cwd(), "apps/api/data/parental-control.json");
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DEFAULT_DATA_RETENTION_DAYS = 90;
const MIN_SECONDS_BETWEEN_CODE_ISSUE = 20;
const CHILD_PASSWORD_MIN_LENGTH = 6;
const DEFAULT_ADMIN_ANALYTICS_DAYS = 7;
const MAX_ADMIN_ANALYTICS_DAYS = 30;
const ACTIVE_CHILD_WINDOW_HOURS = 24;

const daySchema = z.object({
  mon: z.number().int().min(0).max(1440),
  tue: z.number().int().min(0).max(1440),
  wed: z.number().int().min(0).max(1440),
  thu: z.number().int().min(0).max(1440),
  fri: z.number().int().min(0).max(1440),
  sat: z.number().int().min(0).max(1440),
  sun: z.number().int().min(0).max(1440)
});

const bedtimeWindowSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM formatinda olmali"),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM formatinda olmali")
});

const bedtimeByDaySchema = z.object({
  mon: bedtimeWindowSchema,
  tue: bedtimeWindowSchema,
  wed: bedtimeWindowSchema,
  thu: bedtimeWindowSchema,
  fri: bedtimeWindowSchema,
  sat: bedtimeWindowSchema,
  sun: bedtimeWindowSchema
});

const consentSchema = z.object({
  privacyPolicyVersion: z.string().min(1),
  termsVersion: z.string().min(1),
  prominentDisclosureAccepted: z.literal(true),
  childMonitoringDisclosureAccepted: z.literal(true)
});

const registerParentSchema = z.object({
  parentName: z.string().min(2),
  parentPin: z.string().min(4).max(32),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().min(5).max(32).optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  consent: consentSchema
});

const pairingCodeSchema = z.object({
  expiresInMinutes: z.number().int().min(3).max(30).optional()
});

const linkChildSchema = z.object({
  familyId: z.string().min(1),
  pairingCode: z.string().regex(/^\d{6}$/, "6 haneli kod olmali"),
  childName: z.string().min(2),
  deviceId: z.string().min(3).max(128),
  childDisclosureExplained: z.literal(true)
});

const childLoginSchema = z.object({
  familyId: z.string().min(1),
  childId: z.string().min(1),
  childPassword: z.string().min(CHILD_PASSWORD_MIN_LENGTH).max(64),
  deviceId: z.string().min(3).max(128)
});

const setChildPasswordSchema = z.object({
  childPassword: z.string().min(CHILD_PASSWORD_MIN_LENGTH).max(64)
});

const setProtectionModeSchema = z.object({
  protectionMode: z.enum(["STANDARD", "ENHANCED_FAMILY_LINK"])
});

const parentVerificationCodeRequestSchema = z.object({
  childId: z.string().min(1)
});

const verifyParentCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "6 haneli kod olmali")
});

const childDisclosureAckSchema = z.object({
  acknowledged: z.literal(true)
});

const policySchema = z.object({
  dailyLimitMinutes: daySchema,
  bedtime: bedtimeByDaySchema,
  appLimitsMinutes: z.record(z.number().int().min(0).max(1440)),
  webFilter: z.object({
    safeSearch: z.boolean(),
    blockedDomains: z.array(z.string().min(1)).max(500),
    allowDomains: z.array(z.string().min(1)).max(500)
  })
});

const usageEventSchema = z.object({
  appName: z.string().min(1).max(128),
  minutes: z.number().int().min(1).max(480),
  startedAt: z.string().datetime().optional()
});

const locationEventSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(100000).optional(),
  source: z.enum(["CHILD_APP"]).optional(),
  capturedAt: z.string().datetime().optional()
});

const locationHistoryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date YYYY-MM-DD formatinda olmali").optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
});

const parentDeleteSchema = z.object({
  parentPin: z.string().min(4).max(32),
  confirmation: z.literal("DELETE")
});

const publicDeleteSchema = z.object({
  familyId: z.string().min(1),
  parentPin: z.string().min(4).max(32),
  confirmation: z.literal("DELETE")
});

const adminOverviewQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date YYYY-MM-DD formatinda olmali").optional(),
  days: z.coerce.number().int().min(1).max(MAX_ADMIN_ANALYTICS_DAYS).optional()
});

function defaultPolicy(): ChildPolicy {
  return {
    dailyLimitMinutes: {
      mon: 150,
      tue: 150,
      wed: 150,
      thu: 150,
      fri: 150,
      sat: 210,
      sun: 210
    },
    bedtime: {
      mon: { start: "21:30", end: "07:00" },
      tue: { start: "21:30", end: "07:00" },
      wed: { start: "21:30", end: "07:00" },
      thu: { start: "21:30", end: "07:00" },
      fri: { start: "21:30", end: "07:00" },
      sat: { start: "22:30", end: "08:00" },
      sun: { start: "22:30", end: "08:00" }
    },
    appLimitsMinutes: {},
    webFilter: {
      safeSearch: true,
      blockedDomains: [],
      allowDomains: []
    }
  };
}

function ensureStoreFile() {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ families: [] }, null, 2), "utf8");
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createToken(prefix: string) {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function createSixDigitCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashSecret(secret: string, salt?: string) {
  const finalSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(secret, finalSalt, 64).toString("hex");
  return { salt: finalSalt, hash: digest };
}

function verifySecret(secret: string, salt: string, expectedHash: string) {
  const candidate = hashSecret(secret, salt).hash;
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function safeDateMs(value: string | null | undefined) {
  const ms = new Date(value ?? "").getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function maskCode(code: string) {
  return `${code.slice(0, 2)}****`;
}

function issueSecureCode() {
  const plainCode = createSixDigitCode();
  const hashed = hashSecret(plainCode);
  return {
    plainCode,
    codeSalt: hashed.salt,
    codeHash: hashed.hash,
    codeMask: maskCode(plainCode)
  };
}

function canIssueCode(lastIssuedAt: string | null) {
  if (!lastIssuedAt) return true;
  return Date.now() - safeDateMs(lastIssuedAt) >= MIN_SECONDS_BETWEEN_CODE_ISSUE * 1000;
}

function normalizePairingCode(raw: any): PairingCode | null {
  if (!raw || typeof raw !== "object") return null;

  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : nowIso();
  const expiresAt =
    typeof raw.expiresAt === "string"
      ? raw.expiresAt
      : new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const usedAt = typeof raw.usedAt === "string" ? raw.usedAt : null;

  if (typeof raw.codeHash === "string" && typeof raw.codeSalt === "string") {
    return {
      codeSalt: raw.codeSalt,
      codeHash: raw.codeHash,
      codeMask: typeof raw.codeMask === "string" ? raw.codeMask : "**legacy**",
      createdAt,
      expiresAt,
      usedAt
    };
  }

  if (typeof raw.code === "string" && raw.code.length === 6) {
    const hashed = hashSecret(raw.code);
    return {
      codeSalt: hashed.salt,
      codeHash: hashed.hash,
      codeMask: maskCode(raw.code),
      createdAt,
      expiresAt,
      usedAt
    };
  }

  return null;
}

function normalizeParentVerificationCode(raw: any): ParentVerificationCode | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.childId !== "string") return null;

  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : nowIso();
  const expiresAt =
    typeof raw.expiresAt === "string"
      ? raw.expiresAt
      : new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const usedAt = typeof raw.usedAt === "string" ? raw.usedAt : null;

  if (typeof raw.codeHash === "string" && typeof raw.codeSalt === "string") {
    return {
      codeSalt: raw.codeSalt,
      codeHash: raw.codeHash,
      codeMask: typeof raw.codeMask === "string" ? raw.codeMask : "**legacy**",
      childId: raw.childId,
      createdAt,
      expiresAt,
      usedAt
    };
  }

  if (typeof raw.code === "string" && raw.code.length === 6) {
    const hashed = hashSecret(raw.code);
    return {
      codeSalt: hashed.salt,
      codeHash: hashed.hash,
      codeMask: maskCode(raw.code),
      childId: raw.childId,
      createdAt,
      expiresAt,
      usedAt
    };
  }

  return null;
}

function normalizeChildRecord(raw: any): ChildRecord {
  const id = typeof raw?.id === "string" ? raw.id : createId("child");
  const name = typeof raw?.name === "string" ? raw.name : "Child";
  const deviceId = typeof raw?.deviceId === "string" ? raw.deviceId : `device-${id}`;
  const passwordSalt =
    typeof raw?.passwordSalt === "string" ? raw.passwordSalt : hashSecret("child-pass").salt;
  const passwordHash =
    typeof raw?.passwordHash === "string"
      ? raw.passwordHash
      : typeof raw?.password === "string" && raw.password.length > 0
        ? hashSecret(raw.password, passwordSalt).hash
        : hashSecret("child-pass", passwordSalt).hash;
  const policy = raw?.policy ? (policySchema.safeParse(raw.policy).data ?? defaultPolicy()) : defaultPolicy();
  const sessions = Array.isArray(raw?.sessions)
    ? raw.sessions
        .filter((entry: any) => typeof entry?.token === "string" && typeof entry?.expiresAt === "string")
        .map((entry: any) => ({ token: entry.token, expiresAt: entry.expiresAt }))
    : [];
  const createdAt = typeof raw?.createdAt === "string" ? raw.createdAt : nowIso();
  const lastSeenAt = typeof raw?.lastSeenAt === "string" ? raw.lastSeenAt : createdAt;
  const disclosureAckAt = typeof raw?.disclosureAckAt === "string" ? raw.disclosureAckAt : null;
  const childPasswordUpdatedAt =
    typeof raw?.childPasswordUpdatedAt === "string"
      ? raw.childPasswordUpdatedAt
      : typeof raw?.password === "string"
        ? createdAt
        : null;

  return {
    id,
    name,
    deviceId,
    passwordSalt,
    passwordHash,
    childPasswordUpdatedAt,
    disclosureAckAt,
    policy,
    sessions,
    createdAt,
    lastSeenAt
  };
}

function normalizeUsageEvent(raw: any): UsageEvent | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.childId !== "string" || typeof raw.appName !== "string") return null;
  if (typeof raw.minutes !== "number" || !Number.isFinite(raw.minutes)) return null;

  const startedAt = typeof raw.startedAt === "string" ? raw.startedAt : nowIso();
  const recordedAt = typeof raw.recordedAt === "string" ? raw.recordedAt : startedAt;
  return {
    id: typeof raw.id === "string" ? raw.id : createId("usage"),
    childId: raw.childId,
    appName: raw.appName,
    minutes: Math.max(1, Math.min(480, Math.floor(raw.minutes))),
    startedAt,
    recordedAt
  };
}

function normalizeLocationEvent(raw: any): LocationEvent | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.childId !== "string") return null;
  if (typeof raw.latitude !== "number" || !Number.isFinite(raw.latitude)) return null;
  if (typeof raw.longitude !== "number" || !Number.isFinite(raw.longitude)) return null;

  const latitude = Math.max(-90, Math.min(90, raw.latitude));
  const longitude = Math.max(-180, Math.min(180, raw.longitude));
  const capturedAt = typeof raw.capturedAt === "string" ? raw.capturedAt : nowIso();
  const recordedAt = typeof raw.recordedAt === "string" ? raw.recordedAt : capturedAt;
  const accuracyRaw = typeof raw.accuracyMeters === "number" && Number.isFinite(raw.accuracyMeters) ? raw.accuracyMeters : null;

  return {
    id: typeof raw.id === "string" ? raw.id : createId("loc"),
    childId: raw.childId,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    accuracyMeters: accuracyRaw === null ? null : Math.max(0, Math.min(100000, Math.floor(accuracyRaw))),
    source: raw.source === "CHILD_APP" ? "CHILD_APP" : "CHILD_APP",
    capturedAt,
    recordedAt
  };
}

function normalizeFamilyRecord(raw: any): FamilyRecord {
  const createdAt = typeof raw?.parent?.createdAt === "string" ? raw.parent.createdAt : nowIso();
  const parentPinSalt =
    typeof raw?.parent?.pinSalt === "string" ? raw.parent.pinSalt : hashSecret("1234").salt;
  const parentPinHash =
    typeof raw?.parent?.pinHash === "string"
      ? raw.parent.pinHash
      : typeof raw?.parent?.pin === "string" && raw.parent.pin.length > 0
        ? hashSecret(raw.parent.pin, parentPinSalt).hash
        : hashSecret("1234", parentPinSalt).hash;
  const parent = {
    name: typeof raw?.parent?.name === "string" ? raw.parent.name : "Parent",
    email: typeof raw?.parent?.email === "string" ? raw.parent.email : null,
    phone: typeof raw?.parent?.phone === "string" ? raw.parent.phone : null,
    pinSalt: parentPinSalt,
    pinHash: parentPinHash,
    createdAt
  };

  const consentUpdatedAt = typeof raw?.compliance?.updatedAt === "string" ? raw.compliance.updatedAt : nowIso();
  const compliance: FamilyCompliance = {
    privacyPolicyVersion:
      typeof raw?.compliance?.privacyPolicyVersion === "string"
        ? raw.compliance.privacyPolicyVersion
        : "v1",
    termsVersion: typeof raw?.compliance?.termsVersion === "string" ? raw.compliance.termsVersion : "v1",
    protectionMode:
      raw?.compliance?.protectionMode === "ENHANCED_FAMILY_LINK"
        ? "ENHANCED_FAMILY_LINK"
        : "STANDARD",
    prominentDisclosureAcceptedAt:
      typeof raw?.compliance?.prominentDisclosureAcceptedAt === "string"
        ? raw.compliance.prominentDisclosureAcceptedAt
        : createdAt,
    childMonitoringDisclosureAcceptedAt:
      typeof raw?.compliance?.childMonitoringDisclosureAcceptedAt === "string"
        ? raw.compliance.childMonitoringDisclosureAcceptedAt
        : createdAt,
    countryCode: typeof raw?.compliance?.countryCode === "string" ? raw.compliance.countryCode : null,
    dataRetentionDays:
      typeof raw?.compliance?.dataRetentionDays === "number" &&
      raw.compliance.dataRetentionDays >= 30 &&
      raw.compliance.dataRetentionDays <= 365
        ? Math.floor(raw.compliance.dataRetentionDays)
        : DEFAULT_DATA_RETENTION_DAYS,
    accountDeletionAvailable:
      typeof raw?.compliance?.accountDeletionAvailable === "boolean"
        ? raw.compliance.accountDeletionAvailable
        : true,
    updatedAt: consentUpdatedAt
  };

  const parentSessions = Array.isArray(raw?.parentSessions)
    ? raw.parentSessions
        .filter((entry: any) => typeof entry?.token === "string")
        .map((entry: any) => ({
          token: entry.token,
          createdAt: typeof entry.createdAt === "string" ? entry.createdAt : nowIso()
        }))
    : [];

  const pairingCodes = Array.isArray(raw?.pairingCodes)
    ? raw.pairingCodes.map(normalizePairingCode).filter(Boolean)
    : [];
  const parentVerificationCodes = Array.isArray(raw?.parentVerificationCodes)
    ? raw.parentVerificationCodes.map(normalizeParentVerificationCode).filter(Boolean)
    : [];
  const children = Array.isArray(raw?.children) ? raw.children.map(normalizeChildRecord) : [];
  const usageEvents = Array.isArray(raw?.usageEvents)
    ? raw.usageEvents.map(normalizeUsageEvent).filter(Boolean)
    : [];
  const locationEvents = Array.isArray(raw?.locationEvents)
    ? raw.locationEvents.map(normalizeLocationEvent).filter(Boolean)
    : [];

  return {
    id: typeof raw?.id === "string" ? raw.id : createId("family"),
    parent,
    compliance,
    lastPairingCodeIssuedAt:
      typeof raw?.lastPairingCodeIssuedAt === "string" ? raw.lastPairingCodeIssuedAt : null,
    lastParentVerificationCodeIssuedAt:
      typeof raw?.lastParentVerificationCodeIssuedAt === "string"
        ? raw.lastParentVerificationCodeIssuedAt
        : null,
    parentSessions,
    pairingCodes,
    parentVerificationCodes,
    children,
    usageEvents,
    locationEvents
  };
}

function readStore(): ParentalControlStore {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_FILE, "utf8");
  const parsed = JSON.parse(raw) as { families?: unknown };
  if (!parsed.families || !Array.isArray(parsed.families)) {
    return { families: [] };
  }
  return {
    families: parsed.families.map(normalizeFamilyRecord)
  };
}

function writeStore(store: ParentalControlStore) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function cleanupExpired(store: ParentalControlStore) {
  const now = Date.now();
  for (const family of store.families) {
    family.pairingCodes = family.pairingCodes.filter((code) => safeDateMs(code.expiresAt) > now || code.usedAt);
    family.parentVerificationCodes = family.parentVerificationCodes.filter(
      (code) => safeDateMs(code.expiresAt) > now || code.usedAt
    );
    for (const child of family.children) {
      child.sessions = child.sessions.filter((session) => safeDateMs(session.expiresAt) > now);
    }

    const retentionMs = Math.max(30, Math.min(365, family.compliance.dataRetentionDays)) * 24 * 60 * 60 * 1000;
    const oldestAllowed = now - retentionMs;
    family.usageEvents = family.usageEvents.filter((event) => safeDateMs(event.recordedAt) >= oldestAllowed);
    family.locationEvents = family.locationEvents.filter((event) => safeDateMs(event.recordedAt) >= oldestAllowed);
  }
}

function mutateStore<T>(updater: (store: ParentalControlStore) => T): T {
  const store = readStore();
  cleanupExpired(store);
  const result = updater(store);
  writeStore(store);
  return result;
}

function readStoreSnapshot<T>(reader: (store: ParentalControlStore) => T): T {
  const store = readStore();
  cleanupExpired(store);
  return reader(store);
}

function findFamilyByParentToken(store: ParentalControlStore, token: string) {
  return store.families.find((family) => family.parentSessions.some((session) => session.token === token)) ?? null;
}

function findFamilyAndChildByChildToken(store: ParentalControlStore, childId: string, token: string) {
  for (const family of store.families) {
    const child = family.children.find((item) => item.id === childId);
    if (!child) continue;
    const session = child.sessions.find((entry) => entry.token === token);
    if (!session) continue;
    return { family, child };
  }
  return null;
}

function sameUtcDate(isoString: string, date: string) {
  const parsed = new Date(isoString);
  if (!Number.isFinite(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === date;
}

function summarizeUsage(events: UsageEvent[], date: string) {
  const byApp = new Map<string, number>();
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 }));
  let totalMinutes = 0;

  for (const event of events) {
    if (!sameUtcDate(event.startedAt, date)) continue;
    totalMinutes += event.minutes;
    byApp.set(event.appName, (byApp.get(event.appName) ?? 0) + event.minutes);
    const hour = new Date(event.startedAt).getUTCHours();
    byHour[hour].minutes += event.minutes;
  }

  const byAppList = Array.from(byApp.entries())
    .map(([appName, minutes]) => ({ appName, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    date,
    totalMinutes,
    byApp: byAppList,
    byHour
  };
}

function getLatestLocationEvent(events: LocationEvent[], childId: string) {
  let latest: LocationEvent | null = null;
  let latestMs = 0;
  for (const event of events) {
    if (event.childId !== childId) continue;
    const eventMs = safeDateMs(event.capturedAt || event.recordedAt);
    if (!latest || eventMs > latestMs) {
      latest = event;
      latestMs = eventMs;
    }
  }
  return latest;
}

function summarizeLocationHistory(events: LocationEvent[], childId: string, date: string, limit: number) {
  const sameDayEvents = events
    .filter((event) => event.childId === childId && sameUtcDate(event.capturedAt, date))
    .sort((a, b) => safeDateMs(b.capturedAt) - safeDateMs(a.capturedAt));

  const points = sameDayEvents.slice(0, limit).map((event) => ({
    id: event.id,
    latitude: event.latitude,
    longitude: event.longitude,
    accuracyMeters: event.accuracyMeters,
    source: event.source,
    capturedAt: event.capturedAt,
    recordedAt: event.recordedAt
  }));

  return {
    date,
    totalPoints: sameDayEvents.length,
    points
  };
}

function toUtcDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toSafeUtcDateKey(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function buildRecentDateKeys(endDate: string, days: number) {
  const safeDays = Math.max(1, Math.min(MAX_ADMIN_ANALYTICS_DAYS, Math.floor(days)));
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(end.getTime())) {
    return [toUtcDateKey(new Date())];
  }

  const list: string[] = [];
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const current = new Date(end);
    current.setUTCDate(end.getUTCDate() - offset);
    list.push(toUtcDateKey(current));
  }
  return list;
}

function isWithinLastHours(isoDate: string, hours: number) {
  const timestamp = safeDateMs(isoDate);
  if (!timestamp) return false;
  return Date.now() - timestamp <= hours * 60 * 60 * 1000;
}

function getConfiguredParentalAdminKey() {
  const specific = (process.env.PARENTAL_ADMIN_KEY ?? "").trim();
  if (specific) return specific;
  const fallback = (process.env.ADMIN_API_KEY ?? "").trim();
  if (fallback) return fallback;
  return null;
}

function getParentalAdminKeyFromRequest(request: any) {
  const parentKey = request.headers["x-parental-admin-key"];
  if (parentKey) return Array.isArray(parentKey) ? parentKey[0] : parentKey;
  const generic = request.headers["x-admin-key"];
  if (!generic) return null;
  return Array.isArray(generic) ? generic[0] : generic;
}

function authorizeParentalAdminRequest(request: any) {
  const configuredKey = getConfiguredParentalAdminKey();
  if (!configuredKey) {
    return { ok: true as const, insecureMode: true };
  }

  const suppliedKey = getParentalAdminKeyFromRequest(request);
  if (!suppliedKey || suppliedKey !== configuredKey) {
    return { ok: false as const, statusCode: 401, message: "x-parental-admin-key gerekli veya gecersiz" };
  }

  return { ok: true as const, insecureMode: false };
}

function buildAdminOverview(store: ParentalControlStore, endDate: string, days: number) {
  const dateKeys = buildRecentDateKeys(endDate, days);
  const dateSet = new Set(dateKeys);
  const today = dateKeys[dateKeys.length - 1] ?? toUtcDateKey(new Date());
  const allChildren = store.families.flatMap((family) => family.children.map((child) => ({ family, child })));

  const topAppsMap = new Map<string, number>();
  const trendMap = new Map<string, { date: string; minutes: number; events: number }>();
  for (const date of dateKeys) {
    trendMap.set(date, { date, minutes: 0, events: 0 });
  }

  let todayMinutes = 0;
  let todayEvents = 0;
  let totalMinutesInRange = 0;
  let totalEventsInRange = 0;

  for (const family of store.families) {
    for (const event of family.usageEvents) {
      const eventDate = toSafeUtcDateKey(event.startedAt);
      if (!eventDate) continue;
      if (!dateSet.has(eventDate)) continue;

      totalMinutesInRange += event.minutes;
      totalEventsInRange += 1;

      const trend = trendMap.get(eventDate);
      if (trend) {
        trend.minutes += event.minutes;
        trend.events += 1;
      }

      if (eventDate === today) {
        todayMinutes += event.minutes;
        todayEvents += 1;
      }

      topAppsMap.set(event.appName, (topAppsMap.get(event.appName) ?? 0) + event.minutes);
    }
  }

  const topApps = Array.from(topAppsMap.entries())
    .map(([appName, minutes]) => ({ appName, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  const families = store.families
    .map((family) => {
      const childIds = new Set(family.children.map((child) => child.id));
      let minutesInRange = 0;
      let eventsInRange = 0;
      let minutesToday = 0;
      let eventsToday = 0;

      for (const event of family.usageEvents) {
        const eventDate = toSafeUtcDateKey(event.startedAt);
        if (!eventDate) continue;
        if (!dateSet.has(eventDate)) continue;
        minutesInRange += event.minutes;
        eventsInRange += 1;
        if (eventDate === today) {
          minutesToday += event.minutes;
          eventsToday += 1;
        }
      }

      const activeChildren24h = family.children.filter((child) =>
        isWithinLastHours(child.lastSeenAt, ACTIVE_CHILD_WINDOW_HOURS)
      ).length;

      const lastSeenAt = family.children
        .map((child) => child.lastSeenAt)
        .sort((a, b) => safeDateMs(b) - safeDateMs(a))[0] ?? null;

      return {
        familyId: family.id,
        parentName: family.parent.name,
        parentEmail: family.parent.email,
        childCount: family.children.length,
        activeChildren24h,
        minutesToday,
        eventsToday,
        minutesInRange,
        eventsInRange,
        lastSeenAt,
        children: family.children.map((child) => ({
          childId: child.id,
          name: child.name,
          deviceId: child.deviceId,
          lastSeenAt: child.lastSeenAt,
          disclosureAckAt: child.disclosureAckAt
        })),
        hasUsageEventWithoutChild: family.usageEvents.some((event) => !childIds.has(event.childId)),
        hasLocationEventWithoutChild: family.locationEvents.some((event) => !childIds.has(event.childId))
      };
    })
    .sort((a, b) => b.minutesInRange - a.minutesInRange);

  const activeChildren24h = allChildren.filter(({ child }) =>
    isWithinLastHours(child.lastSeenAt, ACTIVE_CHILD_WINDOW_HOURS)
  ).length;

  const parentSessionsActive = store.families.reduce((total, family) => total + family.parentSessions.length, 0);
  const enhancedFamilies = store.families.filter(
    (family) => family.compliance.protectionMode === "ENHANCED_FAMILY_LINK"
  ).length;
  const standardFamilies = Math.max(0, store.families.length - enhancedFamilies);
  const trend = dateKeys.map((date) => trendMap.get(date) ?? { date, minutes: 0, events: 0 });

  return {
    summary: {
      totalFamilies: store.families.length,
      standardFamilies,
      enhancedFamilies,
      totalChildren: allChildren.length,
      activeChildren24h,
      parentSessionsActive,
      today,
      todayMinutes,
      todayEvents,
      totalMinutesInRange,
      totalEventsInRange,
      days: dateKeys.length
    },
    trend,
    topApps,
    families
  };
}

function getParentToken(request: any) {
  const header = request.headers["x-parent-token"];
  if (!header) return null;
  return Array.isArray(header) ? header[0] : header;
}

function getChildToken(request: any) {
  const header = request.headers["x-child-token"];
  if (!header) return null;
  return Array.isArray(header) ? header[0] : header;
}

function buildComplianceStatus(family: FamilyRecord) {
  const childDisclosurePendingCount = family.children.filter((child) => !child.disclosureAckAt).length;
  return {
    familyId: family.id,
    protectionMode: family.compliance.protectionMode,
    dataRetentionDays: family.compliance.dataRetentionDays,
    privacyPolicyVersion: family.compliance.privacyPolicyVersion,
    termsVersion: family.compliance.termsVersion,
    prominentDisclosureAcceptedAt: family.compliance.prominentDisclosureAcceptedAt,
    childMonitoringDisclosureAcceptedAt: family.compliance.childMonitoringDisclosureAcceptedAt,
    childDisclosurePendingCount,
    accountDeletionAvailable: family.compliance.accountDeletionAvailable,
    accountDeletionPagePath: "/account-deletion.html"
  };
}

export async function registerParentalControlRoutes(app: FastifyInstance) {
  app.post("/parental-control/parent/register", async (request, reply) => {
    const parsed = registerParentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const data = parsed.data;
    const result = mutateStore((store) => {
      const familyId = createId("family");
      const parentToken = createToken("parent");
      const now = nowIso();
      const pin = hashSecret(data.parentPin);

      const family: FamilyRecord = {
        id: familyId,
        parent: {
          name: data.parentName,
          email: data.parentEmail ?? null,
          phone: data.parentPhone ?? null,
          pinSalt: pin.salt,
          pinHash: pin.hash,
          createdAt: now
        },
        compliance: {
          privacyPolicyVersion: data.consent.privacyPolicyVersion,
          termsVersion: data.consent.termsVersion,
          protectionMode: "STANDARD",
          prominentDisclosureAcceptedAt: now,
          childMonitoringDisclosureAcceptedAt: now,
          countryCode: data.countryCode ?? null,
          dataRetentionDays: DEFAULT_DATA_RETENTION_DAYS,
          accountDeletionAvailable: true,
          updatedAt: now
        },
        lastPairingCodeIssuedAt: null,
        lastParentVerificationCodeIssuedAt: null,
        parentSessions: [{ token: parentToken, createdAt: now }],
        pairingCodes: [],
        parentVerificationCodes: [],
        children: [],
        usageEvents: [],
        locationEvents: []
      };

      store.families.push(family);
      return { familyId, parentToken, compliance: buildComplianceStatus(family) };
    });

    reply.send({
      ok: true,
      ...result
    });
  });

  app.post("/parental-control/parent/pairing-code", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const parsed = pairingCodeSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };
      if (!canIssueCode(family.lastPairingCodeIssuedAt)) {
        return { error: "Cok sik kod uretiliyor. Lutfen kisa bir sure bekleyin." as const };
      }

      const now = new Date();
      const expiresInMinutes = parsed.data.expiresInMinutes ?? 10;
      const issued = issueSecureCode();
      const code: PairingCode = {
        codeSalt: issued.codeSalt,
        codeHash: issued.codeHash,
        codeMask: issued.codeMask,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + expiresInMinutes * 60_000).toISOString(),
        usedAt: null
      };
      family.pairingCodes.push(code);
      family.lastPairingCodeIssuedAt = now.toISOString();
      return {
        pairingCode: issued.plainCode,
        codeMask: code.codeMask,
        expiresAt: code.expiresAt
      };
    });

    if ("error" in result) {
      reply.status(400).send({ message: result.error });
      return;
    }

    reply.send({
      ok: true,
      ...result
    });
  });

  app.put("/parental-control/parent/protection-mode", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const parsed = setProtectionModeSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      family.compliance.protectionMode = parsed.data.protectionMode;
      family.compliance.updatedAt = nowIso();
      return { compliance: buildComplianceStatus(family) };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.put("/parental-control/children/:childId/password", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const parsed = setChildPasswordSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const result = mutateStore((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      const child = family.children.find((item) => item.id === childId);
      if (!child) return { error: "Cocuk bulunamadi" as const, statusCode: 404 as const };

      const pass = hashSecret(parsed.data.childPassword);
      const now = nowIso();
      child.passwordSalt = pass.salt;
      child.passwordHash = pass.hash;
      child.childPasswordUpdatedAt = now;
      child.lastSeenAt = now;

      return { childId: child.id, childPasswordUpdatedAt: now };
    });

    if ("error" in result) {
      reply.status(result.statusCode ?? 401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/children/link", async (request, reply) => {
    const parsed = linkChildSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const data = parsed.data;
    const result = mutateStore((store) => {
      const family = store.families.find((item) => item.id === data.familyId);
      if (!family) return { error: "Aile bulunamadi" as const };

      const code = family.pairingCodes.find(
        (entry) =>
          !entry.usedAt &&
          safeDateMs(entry.expiresAt) > Date.now() &&
          verifySecret(data.pairingCode, entry.codeSalt, entry.codeHash)
      );
      if (!code) return { error: "Kod gecersiz veya suresi dolmus" as const };

      const duplicateDevice = family.children.find((child) => child.deviceId === data.deviceId);
      if (duplicateDevice) return { error: "Bu cihaz zaten bagli" as const };

      const childId = createId("child");
      const temporaryPassword = createToken("child-temp-pass");
      const pass = hashSecret(temporaryPassword);
      const now = nowIso();
      family.children.push({
        id: childId,
        name: data.childName,
        deviceId: data.deviceId,
        passwordSalt: pass.salt,
        passwordHash: pass.hash,
        childPasswordUpdatedAt: null,
        disclosureAckAt: null,
        policy: defaultPolicy(),
        sessions: [],
        createdAt: now,
        lastSeenAt: now
      });

      code.usedAt = now;
      return { childId, requiresParentPasswordSetup: true };
    });

    if ("error" in result) {
      reply.status(400).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/children/login", async (request, reply) => {
    const parsed = childLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const data = parsed.data;
    const result = mutateStore((store) => {
      const family = store.families.find((item) => item.id === data.familyId);
      if (!family) return { error: "Aile bulunamadi" as const };

      const child = family.children.find((item) => item.id === data.childId);
      if (!child) return { error: "Cocuk hesabi bulunamadi" as const };

      if (child.deviceId !== data.deviceId) {
        return { error: "Cihaz kimligi eslesmiyor" as const };
      }

      if (!child.childPasswordUpdatedAt) {
        return {
          error: "Ebeveyn bu cocuk icin giris sifresini henuz belirlemedi" as const,
          code: "PARENT_PASSWORD_REQUIRED" as const
        };
      }

      const passwordOk = verifySecret(data.childPassword, child.passwordSalt, child.passwordHash);
      if (!passwordOk) return { error: "Sifre hatali" as const };

      const token = createToken("child");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      child.sessions.push({ token, expiresAt });
      child.lastSeenAt = nowIso();

      return { childToken: token, expiresAt, disclosureAckAt: child.disclosureAckAt };
    });

    if ("error" in result) {
      const statusCode = result.code === "PARENT_PASSWORD_REQUIRED" ? 403 : 401;
      reply.status(statusCode).send({ message: result.error, code: result.code ?? "AUTH_ERROR" });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/children/:childId/ack-disclosure", async (request, reply) => {
    const childToken = getChildToken(request);
    if (!childToken) {
      reply.status(401).send({ message: "x-child-token gerekli" });
      return;
    }

    const parsed = childDisclosureAckSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const result = mutateStore((store) => {
      const identity = findFamilyAndChildByChildToken(store, childId, childToken);
      if (!identity) return { error: "Yetkisiz child token" as const };

      const now = nowIso();
      identity.child.disclosureAckAt = now;
      identity.child.lastSeenAt = now;
      return { disclosureAckAt: now };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/parent/verification-code", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const parsed = parentVerificationCodeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };
      if (!canIssueCode(family.lastParentVerificationCodeIssuedAt)) {
        return { error: "Cok sik kod uretiliyor. Lutfen kisa bir sure bekleyin." as const };
      }

      const child = family.children.find((item) => item.id === parsed.data.childId);
      if (!child) return { error: "Cocuk bulunamadi" as const };

      const now = new Date();
      const issued = issueSecureCode();
      const verification: ParentVerificationCode = {
        codeSalt: issued.codeSalt,
        codeHash: issued.codeHash,
        codeMask: issued.codeMask,
        childId: child.id,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
        usedAt: null
      };

      family.parentVerificationCodes.push(verification);
      family.lastParentVerificationCodeIssuedAt = now.toISOString();
      return {
        code: issued.plainCode,
        codeMask: verification.codeMask,
        expiresAt: verification.expiresAt
      };
    });

    if ("error" in result) {
      reply.status(400).send({ message: result.error });
      return;
    }

    reply.send({
      ok: true,
      ...result
    });
  });

  app.post("/parental-control/children/:childId/verify-parent-code", async (request, reply) => {
    const childToken = getChildToken(request);
    if (!childToken) {
      reply.status(401).send({ message: "x-child-token gerekli" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const parsed = verifyParentCodeSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const identity = findFamilyAndChildByChildToken(store, childId, childToken);
      if (!identity) return { error: "Gecersiz child token" as const };

      const codeEntry = identity.family.parentVerificationCodes.find(
        (entry) =>
          entry.childId === childId &&
          !entry.usedAt &&
          safeDateMs(entry.expiresAt) > Date.now() &&
          verifySecret(parsed.data.code, entry.codeSalt, entry.codeHash)
      );

      if (!codeEntry) return { error: "Kod gecersiz veya suresi dolmus" as const };
      codeEntry.usedAt = nowIso();
      return { verified: true as const };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.put("/parental-control/children/:childId/policy", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const parsed = policySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz policy" });
      return;
    }

    const result = mutateStore((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      const child = family.children.find((item) => item.id === childId);
      if (!child) return { error: "Cocuk bulunamadi" as const };

      child.policy = parsed.data;
      child.lastSeenAt = nowIso();
      return { policy: child.policy };
    });

    if ("error" in result) {
      reply.status(400).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.get("/parental-control/children/:childId/policy", async (request, reply) => {
    const parentToken = getParentToken(request);
    const childToken = getChildToken(request);
    const childId = (request.params as any).childId as string;

    const result = readStoreSnapshot((store) => {
      if (parentToken) {
        const family = findFamilyByParentToken(store, parentToken);
        if (family) {
          const child = family.children.find((item) => item.id === childId);
          if (child) return { policy: child.policy };
        }
      }

      if (childToken) {
        const identity = findFamilyAndChildByChildToken(store, childId, childToken);
        if (identity) return { policy: identity.child.policy };
      }

      return { error: "Yetkisiz" as const };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/children/:childId/usage", async (request, reply) => {
    const childToken = getChildToken(request);
    if (!childToken) {
      reply.status(401).send({ message: "x-child-token gerekli" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const parsed = usageEventSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const identity = findFamilyAndChildByChildToken(store, childId, childToken);
      if (!identity) return { error: "Yetkisiz child token" as const };
      if (!identity.child.disclosureAckAt) {
        return { error: "Cocuk bilgilendirme onayi gerekli" as const, code: "DISCLOSURE_REQUIRED" as const };
      }

      const startedAt = parsed.data.startedAt ?? nowIso();
      const event: UsageEvent = {
        id: createId("usage"),
        childId,
        appName: parsed.data.appName,
        minutes: parsed.data.minutes,
        startedAt,
        recordedAt: nowIso()
      };
      identity.family.usageEvents.push(event);
      identity.child.lastSeenAt = nowIso();
      return event;
    });

    if ("error" in result) {
      const statusCode = result.code === "DISCLOSURE_REQUIRED" ? 403 : 401;
      reply.status(statusCode).send({ message: result.error, code: result.code ?? "AUTH_ERROR" });
      return;
    }

    reply.send({ ok: true, eventId: result.id });
  });

  app.post("/parental-control/children/:childId/location", async (request, reply) => {
    const childToken = getChildToken(request);
    if (!childToken) {
      reply.status(401).send({ message: "x-child-token gerekli" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const parsed = locationEventSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz konum verisi" });
      return;
    }

    const result = mutateStore((store) => {
      const identity = findFamilyAndChildByChildToken(store, childId, childToken);
      if (!identity) return { error: "Yetkisiz child token" as const };
      if (!identity.child.disclosureAckAt) {
        return { error: "Cocuk bilgilendirme onayi gerekli" as const, code: "DISCLOSURE_REQUIRED" as const };
      }

      const capturedAt = parsed.data.capturedAt ?? nowIso();
      const event: LocationEvent = {
        id: createId("loc"),
        childId,
        latitude: Number(parsed.data.latitude.toFixed(6)),
        longitude: Number(parsed.data.longitude.toFixed(6)),
        accuracyMeters:
          typeof parsed.data.accuracyMeters === "number"
            ? Math.max(0, Math.min(100000, Math.floor(parsed.data.accuracyMeters)))
            : null,
        source: parsed.data.source ?? "CHILD_APP",
        capturedAt,
        recordedAt: nowIso()
      };
      identity.family.locationEvents.push(event);
      identity.child.lastSeenAt = nowIso();
      return event;
    });

    if ("error" in result) {
      const statusCode = result.code === "DISCLOSURE_REQUIRED" ? 403 : 401;
      reply.status(statusCode).send({ message: result.error, code: result.code ?? "AUTH_ERROR" });
      return;
    }

    reply.send({ ok: true, eventId: result.id, recordedAt: result.recordedAt });
  });

  app.get("/parental-control/children/:childId/location/latest", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const result = readStoreSnapshot((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      const child = family.children.find((item) => item.id === childId);
      if (!child) return { error: "Cocuk bulunamadi" as const };

      const latest = getLatestLocationEvent(family.locationEvents, childId);
      return {
        childId,
        latest: latest
          ? {
              id: latest.id,
              latitude: latest.latitude,
              longitude: latest.longitude,
              accuracyMeters: latest.accuracyMeters,
              source: latest.source,
              capturedAt: latest.capturedAt,
              recordedAt: latest.recordedAt
            }
          : null
      };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.get("/parental-control/children/:childId/location-history", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const parsedQuery = locationHistoryQuerySchema.safeParse(request.query ?? {});
    if (!parsedQuery.success) {
      reply.status(400).send({ message: parsedQuery.error.issues[0]?.message ?? "Gecersiz query" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const date = parsedQuery.data.date ?? nowIso().slice(0, 10);
    const limit = parsedQuery.data.limit ?? 200;
    const result = readStoreSnapshot((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      const child = family.children.find((item) => item.id === childId);
      if (!child) return { error: "Cocuk bulunamadi" as const };

      return {
        childId,
        ...summarizeLocationHistory(family.locationEvents, childId, date, limit)
      };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.get("/parental-control/children/:childId/usage-summary", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const childId = (request.params as any).childId as string;
    const queryDate = ((request.query as any).date as string | undefined) ?? nowIso().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      reply.status(400).send({ message: "date YYYY-MM-DD formatinda olmali" });
      return;
    }

    const result = readStoreSnapshot((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      const child = family.children.find((item) => item.id === childId);
      if (!child) return { error: "Cocuk bulunamadi" as const };

      const events = family.usageEvents.filter((event) => event.childId === childId);
      return summarizeUsage(events, queryDate);
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, childId, ...result });
  });

  app.get("/parental-control/parent/dashboard", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const queryDate = ((request.query as any).date as string | undefined) ?? nowIso().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      reply.status(400).send({ message: "date YYYY-MM-DD formatinda olmali" });
      return;
    }

    const result = readStoreSnapshot((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      const children = family.children.map((child) => {
        const summary = summarizeUsage(
          family.usageEvents.filter((event) => event.childId === child.id),
          queryDate
        );
        const latestLocation = getLatestLocationEvent(family.locationEvents, child.id);
        return {
          childId: child.id,
          name: child.name,
          deviceId: child.deviceId,
          disclosureAckAt: child.disclosureAckAt,
          totalMinutes: summary.totalMinutes,
          topApps: summary.byApp.slice(0, 5),
          lastLocationAt: latestLocation?.capturedAt ?? null
        };
      });

      return {
        familyId: family.id,
        date: queryDate,
        children
      };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.get("/parental-control/admin/overview", async (request, reply) => {
    const auth = authorizeParentalAdminRequest(request);
    if (!auth.ok) {
      reply.status(auth.statusCode).send({ message: auth.message });
      return;
    }

    const parsed = adminOverviewQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz query" });
      return;
    }

    const endDate = parsed.data.date ?? nowIso().slice(0, 10);
    const days = parsed.data.days ?? DEFAULT_ADMIN_ANALYTICS_DAYS;

    const overview = readStoreSnapshot((store) => buildAdminOverview(store, endDate, days));

    reply.send({
      ok: true,
      insecureMode: auth.insecureMode,
      date: endDate,
      ...overview
    });
  });

  app.get("/parental-control/parent/children", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const result = readStoreSnapshot((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      return family.children.map((child) => ({
        lastLocationAt: getLatestLocationEvent(family.locationEvents, child.id)?.capturedAt ?? null,
        childId: child.id,
        name: child.name,
        deviceId: child.deviceId,
        childPasswordUpdatedAt: child.childPasswordUpdatedAt,
        disclosureAckAt: child.disclosureAckAt,
        createdAt: child.createdAt,
        lastSeenAt: child.lastSeenAt
      }));
    });

    if (Array.isArray(result)) {
      reply.send({ ok: true, children: result });
      return;
    }

    reply.status(401).send({ message: result.error });
  });

  app.get("/parental-control/parent/compliance-status", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const result = readStoreSnapshot((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };
      return {
        compliance: buildComplianceStatus(family),
        children: family.children.map((child) => ({
          childId: child.id,
          name: child.name,
          disclosureAckAt: child.disclosureAckAt
        }))
      };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.get("/parental-control/parent/data-export", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const result = readStoreSnapshot((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      return {
        exportedAt: nowIso(),
        family: {
          id: family.id,
          parent: {
            name: family.parent.name,
            email: family.parent.email,
            phone: family.parent.phone,
            createdAt: family.parent.createdAt
          },
          compliance: family.compliance,
          children: family.children.map((child) => ({
            id: child.id,
            name: child.name,
            deviceId: child.deviceId,
            childPasswordUpdatedAt: child.childPasswordUpdatedAt,
            disclosureAckAt: child.disclosureAckAt,
            policy: child.policy,
            createdAt: child.createdAt,
            lastSeenAt: child.lastSeenAt
          })),
          usageEvents: family.usageEvents,
          locationEvents: family.locationEvents
        }
      };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/parent/delete-account", async (request, reply) => {
    const parentToken = getParentToken(request);
    if (!parentToken) {
      reply.status(401).send({ message: "x-parent-token gerekli" });
      return;
    }

    const parsed = parentDeleteSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const family = findFamilyByParentToken(store, parentToken);
      if (!family) return { error: "Gecersiz parent token" as const };

      const pinOk = verifySecret(parsed.data.parentPin, family.parent.pinSalt, family.parent.pinHash);
      if (!pinOk) return { error: "PIN hatali" as const };

      const index = store.families.findIndex((item) => item.id === family.id);
      if (index < 0) return { error: "Aile kaydi bulunamadi" as const };
      store.families.splice(index, 1);
      return { deleted: true as const };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/public/delete-account", async (request, reply) => {
    const parsed = publicDeleteSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const family = store.families.find((item) => item.id === parsed.data.familyId);
      if (!family) return { error: "Aile bulunamadi" as const };

      const pinOk = verifySecret(parsed.data.parentPin, family.parent.pinSalt, family.parent.pinHash);
      if (!pinOk) return { error: "PIN hatali" as const };

      const index = store.families.findIndex((item) => item.id === parsed.data.familyId);
      if (index < 0) return { error: "Aile kaydi bulunamadi" as const };
      store.families.splice(index, 1);
      return { deleted: true as const };
    });

    if ("error" in result) {
      reply.status(400).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.post("/parental-control/parent/login", async (request, reply) => {
    const bodySchema = z.object({
      familyId: z.string().min(1),
      parentPin: z.string().min(4).max(32)
    });
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ message: parsed.error.issues[0]?.message ?? "Gecersiz veri" });
      return;
    }

    const result = mutateStore((store) => {
      const family = store.families.find((item) => item.id === parsed.data.familyId);
      if (!family) return { error: "Aile bulunamadi" as const };

      const pinOk = verifySecret(parsed.data.parentPin, family.parent.pinSalt, family.parent.pinHash);
      if (!pinOk) return { error: "PIN hatali" as const };

      const token = createToken("parent");
      family.parentSessions.push({ token, createdAt: nowIso() });
      return { parentToken: token, compliance: buildComplianceStatus(family) };
    });

    if ("error" in result) {
      reply.status(401).send({ message: result.error });
      return;
    }

    reply.send({ ok: true, ...result });
  });

  app.get("/parental-control/meta/day-keys", async () => {
    return {
      ok: true,
      days: DAY_KEYS
    };
  });

  app.get("/parental-control/meta/compliance", async () => {
    return {
      ok: true,
      minChildPasswordLength: CHILD_PASSWORD_MIN_LENGTH,
      minSecondsBetweenCodeIssue: MIN_SECONDS_BETWEEN_CODE_ISSUE,
      defaultDataRetentionDays: DEFAULT_DATA_RETENTION_DAYS,
      accountDeletionPagePath: "/account-deletion.html"
    };
  });
}
