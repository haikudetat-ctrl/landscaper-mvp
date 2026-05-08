-- Ensure public app views execute with the caller's permissions so table RLS is enforced.
-- This is idempotent and safe to run multiple times.

ALTER VIEW IF EXISTS public.v_completed_jobs_missing_invoice
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_invoice_balances
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_overdue_invoices
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_properties_missing_next_service
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_skipped_visits_pending_reactivation
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_today_jobs
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_upcoming_week_jobs
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v_visit_financials
  SET (security_invoker = true);
