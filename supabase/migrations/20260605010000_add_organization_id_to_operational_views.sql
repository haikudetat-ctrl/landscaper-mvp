-- Expose organization_id on operational views so service-role queries can
-- explicitly tenant-scope reads in application code.

CREATE OR REPLACE VIEW public.v_visit_financials AS
WITH payment_totals AS (
  SELECT
    p.invoice_id,
    COALESCE(sum(p.amount), 0::numeric)::numeric(10,2) AS amount_paid
  FROM public.payments p
  GROUP BY p.invoice_id
)
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.client_id,
  i.property_id,
  i.service_visit_id,
  i.invoice_date,
  i.due_date,
  i.amount_due,
  i.status AS invoice_status,
  COALESCE(pt.amount_paid, 0::numeric)::numeric(10,2) AS amount_paid,
  GREATEST(i.amount_due - COALESCE(pt.amount_paid, 0::numeric), 0::numeric)::numeric(10,2) AS amount_remaining,
  i.organization_id
FROM public.invoices i
LEFT JOIN payment_totals pt ON pt.invoice_id = i.id;

CREATE OR REPLACE VIEW public.v_invoice_balances AS
SELECT
  vf.invoice_id,
  vf.invoice_number,
  vf.client_id,
  c.full_name AS client_name,
  vf.property_id,
  p.street_1,
  p.city,
  p.state,
  p.postal_code,
  vf.service_visit_id,
  vf.invoice_date,
  vf.due_date,
  vf.amount_due,
  vf.amount_paid,
  vf.amount_remaining,
  vf.invoice_status,
  vf.organization_id
FROM public.v_visit_financials vf
JOIN public.clients c ON c.id = vf.client_id
JOIN public.properties p ON p.id = vf.property_id
ORDER BY vf.due_date, vf.invoice_number;

CREATE OR REPLACE VIEW public.v_overdue_invoices AS
SELECT
  invoice_id,
  invoice_number,
  client_id,
  client_name,
  property_id,
  street_1,
  city,
  state,
  postal_code,
  service_visit_id,
  invoice_date,
  due_date,
  amount_due,
  amount_paid,
  amount_remaining,
  invoice_status,
  organization_id
FROM public.v_invoice_balances vib
WHERE amount_remaining > 0::numeric
  AND (invoice_status <> ALL (ARRAY['paid'::text, 'void'::text]))
  AND due_date < CURRENT_DATE
ORDER BY due_date, invoice_number;

CREATE OR REPLACE VIEW public.v_today_jobs AS
SELECT
  sv.id AS service_visit_id,
  sv.scheduled_date,
  sv.scheduled_position,
  sv.status AS visit_status,
  sv.quoted_price,
  sv.was_rain_delayed,
  sv.rain_delay_source_date,
  sv.operator_notes,
  sv.completion_notes,
  p.id AS property_id,
  p.property_name,
  p.street_1,
  p.street_2,
  p.city,
  p.state,
  p.postal_code,
  p.latitude,
  p.longitude,
  p.gate_notes,
  p.access_notes,
  p.service_notes,
  c.id AS client_id,
  c.full_name AS client_name,
  c.primary_phone,
  c.primary_email,
  st.id AS service_type_id,
  st.code AS service_type_code,
  st.label AS service_type_label,
  sp.id AS service_plan_id,
  sp.plan_name,
  sp.frequency_type,
  sv.organization_id
FROM public.service_visits sv
JOIN public.properties p ON p.id = sv.property_id
JOIN public.clients c ON c.id = p.client_id
JOIN public.service_types st ON st.id = sv.service_type_id
LEFT JOIN public.service_plans sp ON sp.id = sv.service_plan_id
WHERE sv.scheduled_date = CURRENT_DATE
  AND (sv.status = ANY (ARRAY['scheduled'::text, 'rescheduled'::text, 'pending_reactivation'::text]))
ORDER BY COALESCE(sv.scheduled_position, 999999), p.street_1, c.full_name;

CREATE OR REPLACE VIEW public.v_upcoming_week_jobs AS
SELECT
  sv.id AS service_visit_id,
  sv.scheduled_date,
  sv.scheduled_position,
  sv.status AS visit_status,
  sv.quoted_price,
  p.id AS property_id,
  p.property_name,
  p.street_1,
  p.city,
  p.state,
  p.postal_code,
  c.id AS client_id,
  c.full_name AS client_name,
  c.primary_phone,
  c.primary_email,
  st.code AS service_type_code,
  st.label AS service_type_label,
  sp.id AS service_plan_id,
  sp.plan_name,
  sv.organization_id
FROM public.service_visits sv
JOIN public.properties p ON p.id = sv.property_id
JOIN public.clients c ON c.id = p.client_id
JOIN public.service_types st ON st.id = sv.service_type_id
LEFT JOIN public.service_plans sp ON sp.id = sv.service_plan_id
WHERE sv.scheduled_date >= CURRENT_DATE
  AND sv.scheduled_date < (CURRENT_DATE + '7 days'::interval)
  AND (sv.status = ANY (ARRAY['scheduled'::text, 'rescheduled'::text, 'pending_reactivation'::text]))
ORDER BY sv.scheduled_date, COALESCE(sv.scheduled_position, 999999), p.street_1;

CREATE OR REPLACE VIEW public.v_completed_jobs_missing_invoice AS
SELECT
  sv.id AS service_visit_id,
  sv.scheduled_date,
  sv.completion_timestamp,
  sv.quoted_price,
  sv.invoice_status,
  p.id AS property_id,
  p.street_1,
  p.city,
  p.state,
  p.postal_code,
  c.id AS client_id,
  c.full_name AS client_name,
  c.primary_email,
  c.primary_phone,
  st.label AS service_type_label,
  sp.plan_name,
  sv.organization_id
FROM public.service_visits sv
JOIN public.properties p ON p.id = sv.property_id
JOIN public.clients c ON c.id = p.client_id
JOIN public.service_types st ON st.id = sv.service_type_id
LEFT JOIN public.service_plans sp ON sp.id = sv.service_plan_id
LEFT JOIN public.invoices i ON i.service_visit_id = sv.id
WHERE sv.status = 'completed'::text
  AND i.id IS NULL
ORDER BY sv.completion_timestamp DESC NULLS LAST, sv.scheduled_date DESC;

CREATE OR REPLACE VIEW public.v_skipped_visits_pending_reactivation AS
SELECT
  sv.id AS service_visit_id,
  sv.scheduled_date,
  sv.status,
  sv.skip_reason,
  sv.reactivation_required,
  sv.operator_notes,
  p.id AS property_id,
  p.street_1,
  p.city,
  p.state,
  p.postal_code,
  c.id AS client_id,
  c.full_name AS client_name,
  c.primary_phone,
  c.primary_email,
  st.label AS service_type_label,
  sv.organization_id
FROM public.service_visits sv
JOIN public.properties p ON p.id = sv.property_id
JOIN public.clients c ON c.id = p.client_id
JOIN public.service_types st ON st.id = sv.service_type_id
WHERE sv.reactivation_required = true
  OR sv.status = 'pending_reactivation'::text
  OR sv.status = 'skipped'::text
ORDER BY sv.scheduled_date DESC;

CREATE OR REPLACE VIEW public.v_properties_missing_next_service AS
SELECT
  p.id AS property_id,
  p.property_name,
  p.street_1,
  p.city,
  p.state,
  p.postal_code,
  c.id AS client_id,
  c.full_name AS client_name,
  c.primary_phone,
  c.primary_email,
  p.organization_id
FROM public.properties p
JOIN public.clients c ON c.id = p.client_id
WHERE p.is_active = true
  AND NOT (
    EXISTS (
      SELECT 1
      FROM public.service_visits sv
      WHERE sv.property_id = p.id
        AND sv.scheduled_date >= CURRENT_DATE
        AND (sv.status = ANY (ARRAY['scheduled'::text, 'rescheduled'::text, 'pending_reactivation'::text]))
    )
  )
ORDER BY p.street_1, c.full_name;

ALTER VIEW IF EXISTS public.v_completed_jobs_missing_invoice SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_invoice_balances SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_overdue_invoices SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_properties_missing_next_service SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_skipped_visits_pending_reactivation SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_today_jobs SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_upcoming_week_jobs SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_visit_financials SET (security_invoker = true);
