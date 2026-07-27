-- Worker RLS policies
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Allow workers to read their own row once linked
CREATE POLICY "Workers read linked record" ON workers
  FOR SELECT USING (worker_auth_id = auth.uid());

-- Allow a newly signed-up worker (not yet linked) to find their row by email
-- Safe: auth.uid() ensures they can only match their own auth email
CREATE POLICY "Workers find own record by email" ON workers
  FOR SELECT USING (
    worker_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow a worker to link their own auth ID (signup step only)
-- WITH CHECK ensures they can only set worker_auth_id to their own UID
CREATE POLICY "Workers link own auth id" ON workers
  FOR UPDATE USING (
    worker_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (worker_auth_id = auth.uid());

-- Allow workers to read and submit their own attendance
CREATE POLICY "Workers manage own attendance" ON attendance
  FOR ALL USING (
    worker_id IN (SELECT id FROM workers WHERE worker_auth_id = auth.uid())
  );

-- Allow workers to read their own settlements
CREATE POLICY "Workers read own settlements" ON settlements
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE worker_auth_id = auth.uid())
  );
