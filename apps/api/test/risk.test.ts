import test from "node:test";
import assert from "node:assert/strict";
import { buildRiskBlockMessage, calculateDealerRisk } from "../src/lib/risk";

test("calculateDealerRisk marks limit exceeded with projected debt", () => {
  const snapshot = calculateDealerRisk(
    [{ type: "DISPATCH", amount: 80, date: "2026-03-01T10:00:00.000Z" }],
    { creditLimit: 100, paymentTerms: 0 },
    30,
    new Date("2026-03-10T12:00:00.000Z")
  );

  assert.equal(snapshot.currentBalance, 80);
  assert.equal(snapshot.projectedBalance, 110);
  assert.equal(snapshot.limitExceeded, true);
  assert.equal(snapshot.riskLevel, "CRITICAL");
});

test("calculateDealerRisk marks overdue when payment terms exceeded", () => {
  const snapshot = calculateDealerRisk(
    [{ type: "DISPATCH", amount: 50, date: "2026-02-20T10:00:00.000Z" }],
    { creditLimit: 0, paymentTerms: 7 },
    0,
    new Date("2026-03-05T12:00:00.000Z")
  );

  assert.equal(snapshot.overdue, true);
  assert.ok(snapshot.overdueDays > 0);
  assert.equal(snapshot.riskLevel, "CRITICAL");
});

test("buildRiskBlockMessage returns non-empty message for blocked cases", () => {
  const snapshot = calculateDealerRisk(
    [{ type: "DISPATCH", amount: 90, date: "2026-03-01T10:00:00.000Z" }],
    { creditLimit: 100, paymentTerms: 0 },
    20,
    new Date("2026-03-03T10:00:00.000Z")
  );

  const message = buildRiskBlockMessage(snapshot);
  assert.ok(message.includes("risk"));
});
