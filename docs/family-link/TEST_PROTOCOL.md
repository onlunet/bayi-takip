# Family Link Test Protocol

Run all tests after initial setup, then repeat weekly.

## Test Matrix

| ID | Scenario | Steps | Expected Result | Status |
|---|---|---|---|---|
| T1 | Daily limit enforcement | Use child device until daily limit is reached | Device/apps become restricted per Family Link policy | Pending |
| T2 | App usage tracking | Use 2-3 apps for 10-15 min each | Parent app shows same-day app-level usage | Pending |
| T3 | Bedtime lock | Wait for bedtime start and then bedtime end | Device locks on time, unlocks on time next morning | Pending |
| T4 | Remote lock/unlock | Parent triggers lock and then unlock | Child device follows parent command quickly | Pending |
| T5 | Web filter | Open blocked or explicit site query in Chrome | Access blocked or filtered as configured | Pending |
| T6 | Usability | Parent does daily review | Daily control loop completed in <=10 minutes | Pending |
| T7 | Stability 7-day | Observe sync, rules, reports for 7 days | No critical desync or rule drop | Pending |

## Detailed Procedures

### T1 - Daily limit enforcement
1. Confirm daily limit is active for the current day.
2. Use device normally until limit threshold.
3. Attempt to open limited apps.

Pass criteria:
- Restricted behavior starts after limit threshold.

### T2 - App tracking
1. Use App A for ~10 minutes.
2. Use App B for ~10 minutes.
3. Check parent dashboard activity.

Pass criteria:
- App-level durations appear on the same day.

### T3 - Bedtime lock
1. Confirm bedtime schedule.
2. At bedtime start, verify device/app restriction.
3. At bedtime end, verify normal access returns.

Pass criteria:
- Lock starts and ends according to schedule.

### T4 - Remote management
1. Parent locks child device from Family Link.
2. Parent unlocks child device.

Pass criteria:
- Both actions execute without errors.

### T5 - Filter behavior
1. Try opening a known blocked domain in Chrome.
2. Try explicit search keywords with SafeSearch on.

Pass criteria:
- Blocked domain is denied.
- Explicit results are filtered.

### T6 - Daily ops effort
1. Time a daily parent review session.
2. Include requests + usage check + one policy adjustment.

Pass criteria:
- Total time <=10 minutes.

### T7 - One-week stability
1. Keep policy unchanged for 7 days unless needed.
2. Record any sync delay, missing report, or rule bypass.

Pass criteria:
- No critical incidents that break supervision.

## Defect Logging

For each failed case:
- Test ID:
- Date/time:
- Device model + Android version:
- Repro steps:
- Screenshot reference:
- Temporary workaround:
- Final fix:
