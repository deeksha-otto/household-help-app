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

## Screens

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
