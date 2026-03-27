# Family Link First - Implementation Playbook

## Goal
Implement daily screen-time control and usage tracking on an Android child device (under 13) with Google Family Link, managed from the parent phone.

## Scope
- Daily total screen-time limit
- App-level daily usage limits
- Bedtime lock schedule
- Web filtering (Chrome + SafeSearch)
- Parent-side remote management and notifications
- Parent verification flow (parent password + Parent Access Code)
- Weekly review workflow

## Prerequisites
- Parent phone with internet access
- Child Android phone with internet access
- Parent Google account
- Child Google account under Family Link supervision
- Family Link app installed on parent phone

## Approved Choice
Primary solution is Google Family Link (free, stable, and native Android supervision).

Security model to match your requirement:
- Child-side control changes require parent verification.
- Parent can use account password or Parent Access Code.
- Parent Access Code is generated on parent device and used on child device when needed (including offline unlock flows).

## Default Rollout (Decision Complete)
Use this baseline unless you want custom values.

- Week 1 (measure + light limits):
  - Weekday daily limit: 2h 30m
  - Weekend daily limit: 3h 30m
  - Bedtime (weekdays): 21:30-07:00
  - Bedtime (weekend): 22:30-08:00
  - Top 5 apps: set light limits based on usage after day 3
- Week 2 (tighten by real usage):
  - Reduce each top-5 app limit by 15-25% if overused
  - Keep education and communication apps more flexible

## Implementation Steps

### 1) Link the child account
1. Open Family Link on the parent phone.
2. Add/select the child profile.
3. Complete supervision setup for the child Google account.
4. Confirm child device appears as managed in parent app.

Definition of done:
- Parent app shows child profile and managed device status.

Note:
- In Family Link, pairing is done via parent Google account sign-in/consent.
- Code-based parent verification is then available through Parent Access Code.

### 2) Set daily screen-time limits
1. In child profile, open `Controls -> Screen time`.
2. Set `Daily limit`:
   - Monday-Friday: 2h 30m
   - Saturday-Sunday: 3h 30m

Definition of done:
- Weekday/weekend limits are saved and visible in the schedule.

### 3) Set bedtime (device lock window)
1. Go to `Controls -> Screen time -> Bedtime`.
2. Configure:
   - Weekdays: 21:30 to 07:00
   - Weekend: 22:30 to 08:00

Definition of done:
- Bedtime schedule is active for all 7 days.

### 4) Apply app-level limits for top 5 apps
1. Wait for at least 3 days of usage data.
2. Open `Activity` and list the top 5 most used apps.
3. In `Controls -> App limits`, set limits for those top 5 apps.
4. Keep `Phone`, `Messages`, school apps, and emergency-critical apps unrestricted.

Recommended starter limits:
- Entertainment/social app: 30-45 min/day
- Short video app: 20-30 min/day
- Games: 30-45 min/day
- Streaming app: 30-45 min/day
- Browser (if heavily used for non-school): 30-45 min/day

Definition of done:
- Top 5 apps each have a daily cap.

### 5) Enable web filtering
1. Open `Controls -> Google Chrome and Web`.
2. Set browsing mode to `Try to block explicit sites` or stricter mode if needed.
3. Add blocked domains manually (as needed).
4. Open Search controls and ensure `SafeSearch` is on and parent-managed.

Definition of done:
- Explicit-site filtering and SafeSearch are active.

### 6) Lock down Play Store approvals
1. Open `Controls -> Google Play`.
2. Require parent approval for app installs/purchases.
3. Keep app content restrictions age-appropriate.

Definition of done:
- New app installs require parent approval.

### 7) Turn on parent notifications
1. On parent phone, allow Family Link notifications in OS settings.
2. Keep alerts on for requests, limit events, and lock/unlock actions.

Definition of done:
- Parent receives test notification from a child action/request.

### 8) Enforce password + code verification model
1. On child device, verify that changing Daily limit/Schedule requires parent verification.
2. Use one of:
   - Parent Google account password (online), or
   - Parent Access Code (online/offline).
3. Retrieve Parent Access Code from parent device:
   - Family Link -> select child -> Parent access code.
4. Test offline unlock once:
   - Put child device offline and confirm code-based unlock path works.

Definition of done:
- Child cannot change key limits without parent password or Parent Access Code.

## Daily/Weekly Operating Rhythm
- Daily (5-10 min):
  - Check total usage and top app usage.
  - Approve/deny pending requests.
- Weekly (10-15 min):
  - Review trends.
  - Tighten or relax limits slightly (no big jumps).
  - Update blocked/allowed websites if needed.

## Upgrade Trigger to MMGuardian (Phase 2)
Move to MMGuardian only if one or more conditions are true for 2 weeks:
- You need more granular timeline detail than Family Link provides.
- Tamper resistance is not enough for your child behavior pattern.
- Browser/app bypass attempts continue despite policy tightening.
