# Household Help Attendance & Salary App — Build Spec

One employer manages one or more workers (cook, maid, car washer, newspaper
distributor, milk delivery, gardener, nanny, or a custom role). Daily
attendance is tapped in seconds; the app auto-calculates salary owed at
month-end, tracks advances given, and archives each settled month.

## Tech stack
- Frontend: React, mobile-first, big tap targets, minimal text
- Backend/DB: Supabase (schema in `schema.sql`)
- Auth: Supabase phone OTP, employer-only login (workers don't need accounts)
- Deployment: Vercel

## Worker types
Cook, Maid, Car Washer, Newspaper Distributor, Milk Delivery, Gardener,
Nanny, + "Add custom type" (free text label, stored as `custom_role_label`
when role = 'custom'). All types use the **same** attendance-based salary
logic — no separate flat-monthly mode.

## Attendance frequency (per worker)

Not all workers come daily. Set once per worker, at setup:
- **Daily** — comes every day except their weekly off day (existing model —
  cook, maid, nanny typically fit here)
- **Specific days** — comes only on selected day(s) of the week (e.g.
  gardener who comes only Mondays; someone who comes Mon/Thu)
- **Alternate days** — comes every 2nd day starting from a reference date
  (e.g. car washer who comes every other day)

A worker's **scheduled days** for a given period are computed from this
setting (see `migration_001_attendance_frequency.sql` for the fields:
`attendance_frequency`, `scheduled_days`, `alternate_start_date`).

On any day that is NOT a scheduled day for that worker, the attendance
screen should show a neutral "Not scheduled today" state — no buttons, no
action needed, and this day does not count toward salary calculation at
all (distinct from `weekly_off`, which only applies to Daily-frequency
workers).

## Core calculation logic

**Expected working days in period** = count of scheduled days that fall
within the settlement period, based on the worker's attendance_frequency:
- Daily → all days in the period minus their weekly_off_day occurrences
- Specific days → count of occurrences of their scheduled_days within the
  period
- Alternate days → count of scheduled days computed from
  alternate_start_date within the period

**Per-day rate** = `monthly_salary / expected_working_days_in_period`
(NOT a flat days-in-month divisor anymore — this matters a lot for a
gardener who's only expected 4-5 days a month, since dividing by 30 would
make each "day" worth almost nothing)

**Settlement period** = calendar month (1st to last day), or from the last
settlement date to now if the employer settles mid-cycle.

For each *scheduled* day in the period, attendance status affects pay as
follows:
- `present` → full day's pay, no deduction
- `weekly_off` → full day's pay, no deduction (Daily-frequency workers only)
- `paid_leave` → full day's pay, no deduction, **but only if** the worker
  hasn't exceeded their `allowed_paid_leaves` for this period. Leaves beyond
  the allowed count should be treated as unpaid (same as `absent`) — flag
  this clearly in the UI so the employer isn't surprised.
- `absent` (unpaid) → deduct one full day's rate
- `half_day` → deduct half a day's rate

Non-scheduled days are simply excluded from the calculation entirely —
they're not "absent," not "weekly off," they just don't exist for that
worker's salary math.

**Deduction total** = sum of deductions from unpaid absences + half-days
(+ any paid_leave days beyond the allowed count, treated as absent)

**Total advances** = sum of all `payments` logged in this period

**Final amount due** = `monthly_salary - deduction_total - total_advances`

## Employee login + approval workflow (simplified, demo scope)

Two logins now exist: **Employer** (existing) and **Employee/Worker**
(new). This is a simplified version — flagged known limitations below,
acceptable for a class demo, not production-ready as-is.

**Login/Signup — Employer vs Employee toggle:**
- The single login/signup screen now has a toggle at the top: **"I'm an
  Employer" / "I'm a Worker"** — this determines what happens on
  Sign Up, and which interface the user is routed into
- **Employer signup**: creates a row in the `employers` table (as before)
- **Employee/Worker signup**: does NOT create an employer row. Instead, on
  signup, check if any row in `workers` has a matching `worker_email` with
  `worker_auth_id` still null:
  - If found → link it (`worker_auth_id = auth.uid()`), sign-up succeeds,
    route to the Employee interface
  - If no match found → show a clear message: "No worker profile found
    with this email yet — ask your employer to add you as a worker first,
    then try signing up again."
- **Sign In** (for returning users, either role): the toggle determines
  which interface to route into after successful auth — Employer toggle
  checks `employers` table for a matching row, Employee toggle checks
  `workers` table for a matching `worker_auth_id`
- This keeps the auth logic simple for the demo timeline — no need to
  auto-detect role from a single unified query


- When adding/editing a worker, the employer now also enters the worker's
  email (`worker_email` on the workers table)
- The worker signs up separately (same email/password auth used
  elsewhere) using that same email
- On first login, the app checks if any worker row has a matching
  `worker_email` with `worker_auth_id` still null — if so, link it
  (`worker_auth_id = auth.uid()`)
- Known limitation: this is a simple email-match, not a secure invite-code
  flow — fine for a controlled demo, would need hardening for real use

**Attendance submission + approval:**
- A worker, once logged in, sees only their own daily attendance screen —
  same 4 buttons (Present/Absent/Half-day/Paid Leave), but submitting sets
  `submitted_by = 'employee'` and `approval_status = 'pending'`
- The employer sees a new "Pending Approvals" view — a simple list of
  employee-submitted entries awaiting approval, each with Approve/Reject
  buttons
- Only entries with `approval_status = 'approved'` count toward the
  salary calculation (see Core calculation logic above) — pending or
  rejected entries are excluded until resolved
- Entries the employer marks directly (as before) stay auto-approved,
  no separate approval step needed for those

**Leave impact preview (employee side):**
- Before an employee submits "Paid Leave" for a day, show a small preview:
  "Taking this leave will bring your leaves used to X/Y this month" and,
  if it would exceed the allowed count, "This will be treated as unpaid —
  estimated deduction: ₹Z" — using the same per-day-rate logic already
  defined above, just surfaced as a before-the-fact estimate rather than
  only shown after the fact in the employer's monthly summary

**Employee's own monthly summary:**
- Read-only version of the existing summary screen, scoped to their own
  data only (via the RLS policies in `migration_002_employee_login.sql`)



1. **Worker list** (home screen) — all active workers, grouped or filterable
   by role. Big "+" to add a worker. Tapping a worker opens their daily
   attendance view.

2. **Add/edit worker** — name, role (dropdown incl. "Custom" → free text),
   monthly salary, attendance frequency (Daily / Specific days / Alternate
   days — see above), weekly off day (only if Daily), scheduled days (only
   if Specific days), start date (only if Alternate days), allowed paid
   leaves per month.

3. **Daily attendance (per worker)** — today's date shown. If today is a
   scheduled day for this worker: 4 big buttons — Present / Absent /
   Half-day / Paid Leave. If today is NOT scheduled (per their frequency
   setting): show "Not scheduled today" with no action needed. Weekly off
   days (Daily-frequency workers only) should auto-display as "Weekly Off —
   no action needed." Include a simple calendar/list view to see or edit
   past days in the current period.

4. **Log a payment** — amount, date (defaults to today), note field. Shown
   as a running list per worker.

5. **Monthly summary** — for the current (unsettled) period: days present,
   absent, half-days, paid leaves used (and flag if over the allowed limit),
   advances given, and the final amount due, computed live as attendance is
   marked. A "Mark Settled" button archives this period into `settlements`
   and starts a fresh cycle.

6. **Settlement history (per worker)** — list of past settled periods, each
   showing the same summary breakdown, pulled from the `settlements` table.

## Notes for the project doc
- Data is real (Supabase), not mocked — this app doesn't need simulated
  data the way the parking predictor did, since attendance/payments are
  genuinely user-entered, not something requiring live sensor feeds.
- If asked about originality: similar attendance-tracker apps exist in this
  space (MaidCircle, PagarBook, etc.) — be upfront about this if your
  professor asks, and be ready to explain what's different about your build
  (e.g., specific worker-type coverage, settlement archiving, or UX choices)
  if originality is part of grading criteria.
