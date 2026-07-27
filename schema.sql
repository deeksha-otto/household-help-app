-- Household Help Attendance & Salary App — Supabase Schema
-- One employer manages multiple workers (cook, maid, car washer, newspaper,
-- milk delivery, gardener, nanny, or custom types). Uniform attendance-based
-- salary logic applies to all worker types.

-- ============================================================
-- EMPLOYERS
-- Using Supabase Auth (phone OTP) — this table extends auth.users
-- with app-specific profile info if needed. Minimal for now.
-- ============================================================
create table employers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  created_at timestamptz default now()
);

-- ============================================================
-- WORKERS
-- One row per worker, belongs to one employer.
-- ============================================================
create table workers (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  name text not null,
  role text not null, -- 'cook' | 'maid' | 'car_washer' | 'newspaper' | 'milk' | 'gardener' | 'nanny' | 'custom'
  custom_role_label text, -- only used when role = 'custom'
  monthly_salary numeric(10,2) not null,
  weekly_off_day text not null default 'Sunday', -- 'Monday'..'Sunday'
  allowed_paid_leaves int not null default 0, -- employer-set, per worker, resets each settlement cycle
  is_active boolean not null default true, -- soft-delete when a worker leaves employment
  created_at timestamptz default now()
);

-- ============================================================
-- ATTENDANCE
-- One row per worker per day. Weekly off days can either be
-- auto-generated (app logic) or written here as status = 'weekly_off'
-- for a complete, queryable record.
-- ============================================================
create table attendance (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'half_day', 'paid_leave', 'weekly_off')),
  created_at timestamptz default now(),
  unique (worker_id, date) -- one attendance record per worker per day
);

-- ============================================================
-- PAYMENTS
-- Running ledger of any cash given: advances, festival bonus,
-- or the final month-end salary payment itself.
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  amount numeric(10,2) not null,
  date date not null,
  note text, -- e.g. "Diwali advance", "October salary"
  created_at timestamptz default now()
);

-- ============================================================
-- SETTLEMENTS (archive)
-- One row created per worker each time "Mark Settled" is tapped.
-- Snapshots the month's numbers so history is browsable later,
-- and the live attendance/payments cycle can reset cleanly.
-- ============================================================
create table settlements (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  days_present int not null default 0,
  days_absent int not null default 0,
  days_half_day int not null default 0,
  days_paid_leave int not null default 0,
  days_weekly_off int not null default 0,
  gross_salary numeric(10,2) not null, -- monthly_salary at time of settlement
  deduction_amount numeric(10,2) not null default 0, -- from unpaid absences/half-days
  total_advances numeric(10,2) not null default 0, -- sum of payments in this period
  final_amount_due numeric(10,2) not null, -- gross - deduction - advances
  settled_at timestamptz default now()
);

-- ============================================================
-- Indexes for common queries
-- ============================================================
create index idx_workers_employer on workers(employer_id);
create index idx_attendance_worker_date on attendance(worker_id, date);
create index idx_payments_worker_date on payments(worker_id, date);
create index idx_settlements_worker on settlements(worker_id, period_start);

-- ============================================================
-- Row Level Security — each employer only sees their own data
-- ============================================================
alter table employers enable row level security;
alter table workers enable row level security;
alter table attendance enable row level security;
alter table payments enable row level security;
alter table settlements enable row level security;

create policy "Employers see own profile" on employers
  for all using (auth.uid() = id);

create policy "Employers manage own workers" on workers
  for all using (auth.uid() = employer_id);

create policy "Employers manage own attendance" on attendance
  for all using (
    worker_id in (select id from workers where employer_id = auth.uid())
  );

create policy "Employers manage own payments" on payments
  for all using (
    worker_id in (select id from workers where employer_id = auth.uid())
  );

create policy "Employers manage own settlements" on settlements
  for all using (
    worker_id in (select id from workers where employer_id = auth.uid())
  );
