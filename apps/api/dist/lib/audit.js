function normalizeUserId(userId) {
    if (!userId)
        return undefined;
    if (userId === "bootstrap-owner" || userId === "env-admin")
        return undefined;
    return userId;
}
function toJsonSafe(value) {
    if (value === undefined)
        return undefined;
    if (value === null)
        return undefined;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    if (value instanceof Date)
        return value.toISOString();
    if (Array.isArray(value)) {
        return value.map((item) => {
            const safe = toJsonSafe(item);
            return safe === undefined ? "" : safe;
        });
    }
    if (typeof value === "object") {
        const output = {};
        Object.entries(value).forEach(([key, val]) => {
            const safe = toJsonSafe(val);
            if (safe !== undefined) {
                output[key] = safe;
            }
        });
        return output;
    }
    return String(value);
}
export async function writeAuditLog(db, input) {
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
    }
    catch {
        // Audit yazimi is akislarini kesmesin.
    }
}
