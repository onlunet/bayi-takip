function round2(value) {
    return Number(value.toFixed(2));
}
function safeNumber(value) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed))
        return 0;
    return parsed;
}
function startOfDay(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
function parseDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return date;
}
export function calculateDealerRisk(entries, policy, additionalDebtAmount = 0, now = new Date()) {
    const normalizedEntries = entries
        .map((entry) => ({
        type: entry.type,
        amount: Math.max(0, safeNumber(entry.amount)),
        date: parseDate(entry.date)
    }))
        .filter((entry) => entry.date !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    let runningBalance = 0;
    let oldestOpenDebtDate = null;
    for (const entry of normalizedEntries) {
        if (entry.type === "PAYMENT") {
            runningBalance -= entry.amount;
            if (runningBalance <= 0) {
                runningBalance = 0;
                oldestOpenDebtDate = null;
            }
            continue;
        }
        if (runningBalance <= 0 && entry.amount > 0) {
            oldestOpenDebtDate = entry.date;
        }
        runningBalance += entry.amount;
    }
    const currentBalance = Math.max(0, runningBalance);
    const additionalDebt = Math.max(0, safeNumber(additionalDebtAmount));
    const projectedBalance = currentBalance + additionalDebt;
    const creditLimit = Math.max(0, safeNumber(policy.creditLimit));
    const paymentTerms = Math.max(0, Math.round(safeNumber(policy.paymentTerms)));
    const usagePercent = creditLimit > 0 ? (projectedBalance / creditLimit) * 100 : 0;
    const limitExceeded = creditLimit > 0 && projectedBalance > creditLimit;
    let overdue = false;
    let overdueDays = 0;
    if (paymentTerms > 0 && currentBalance > 0 && oldestOpenDebtDate) {
        const nowStart = startOfDay(now);
        const debtStart = startOfDay(oldestOpenDebtDate);
        const days = Math.floor((nowStart.getTime() - debtStart.getTime()) / (24 * 60 * 60 * 1000));
        if (days > paymentTerms) {
            overdue = true;
            overdueDays = days - paymentTerms;
        }
    }
    const riskLevel = limitExceeded || overdue
        ? "CRITICAL"
        : usagePercent >= 80
            ? "WARNING"
            : "OK";
    return {
        currentBalance: round2(currentBalance),
        projectedBalance: round2(projectedBalance),
        creditLimit: round2(creditLimit),
        paymentTerms,
        usagePercent: round2(usagePercent),
        limitExceeded,
        overdue,
        overdueDays,
        oldestOpenDebtDate: oldestOpenDebtDate ? oldestOpenDebtDate.toISOString() : null,
        riskLevel
    };
}
export function buildRiskBlockMessage(snapshot) {
    if (snapshot.limitExceeded && snapshot.overdue) {
        return `Cari risk limiti ve vade asimi nedeniyle islem engellendi. Limit: ${snapshot.creditLimit.toFixed(2)}, Projeksiyon: ${snapshot.projectedBalance.toFixed(2)}, Gecikme: ${snapshot.overdueDays} gun.`;
    }
    if (snapshot.limitExceeded) {
        return `Cari risk limiti asiliyor. Limit: ${snapshot.creditLimit.toFixed(2)}, Projeksiyon: ${snapshot.projectedBalance.toFixed(2)}.`;
    }
    if (snapshot.overdue) {
        return `Vade asimi nedeniyle islem engellendi. Gecikme: ${snapshot.overdueDays} gun.`;
    }
    return "";
}
