-- HDZ-focused demo seed for local development resets.
-- Intentionally small and realistic for owner-operator workflows.

begin;

insert into public.organizations (id, name)
values ('d2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001', 'HDZ Landscaping')
on conflict (id) do update
set name = excluded.name;

insert into public.service_types (id, code, label, is_active, is_recurring_capable, is_seasonal)
values
  ('2b5d07dc-4a2e-4fb6-b5d8-1187f7a10001', 'mowing', 'Mowing', true, true, true),
  ('2b5d07dc-4a2e-4fb6-b5d8-1187f7a10002', 'cleanup', 'Cleanup', true, true, true),
  ('2b5d07dc-4a2e-4fb6-b5d8-1187f7a10003', 'mulch', 'Mulch Refresh', true, false, true)
on conflict (id) do update
set
  code = excluded.code,
  label = excluded.label,
  is_active = excluded.is_active,
  is_recurring_capable = excluded.is_recurring_capable,
  is_seasonal = excluded.is_seasonal;

insert into public.clients (
  id,
  organization_id,
  full_name,
  primary_email,
  primary_phone,
  payment_method_preference,
  billing_notes,
  is_active
)
values
  (
    '44f14854-8ac0-43c6-9882-9354da410001',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'Patricia Romano',
    'patricia.romano@example.local',
    '856-555-1101',
    'venmo',
    'HDZ demo homeowner. Venmo preferred.',
    true
  ),
  (
    '44f14854-8ac0-43c6-9882-9354da410002',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'Michael Torres',
    'michael.torres@example.local',
    '856-555-1102',
    'check',
    'Check payable to HDZ Landscaping.',
    true
  ),
  (
    '44f14854-8ac0-43c6-9882-9354da410003',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'Angela Kim',
    'angela.kim@example.local',
    '856-555-1103',
    'cash',
    'Collect at completion if owner is home.',
    true
  )
on conflict (id) do update
set
  full_name = excluded.full_name,
  primary_email = excluded.primary_email,
  primary_phone = excluded.primary_phone,
  payment_method_preference = excluded.payment_method_preference,
  billing_notes = excluded.billing_notes,
  is_active = excluded.is_active;

insert into public.properties (
  id,
  organization_id,
  client_id,
  street_1,
  city,
  state,
  postal_code,
  property_name,
  service_notes,
  access_notes,
  gate_notes,
  latitude,
  longitude,
  is_active
)
values
  (
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0001',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    '44f14854-8ac0-43c6-9882-9354da410001',
    '1423 Wedgewood Dr',
    'Sewell',
    'NJ',
    '08080',
    'Romano Residence',
    'Edge sidewalks and blow driveway clean.',
    'Use side gate by AC unit.',
    null,
    39.7644,
    -75.1463,
    true
  ),
  (
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0002',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    '44f14854-8ac0-43c6-9882-9354da410002',
    '87 Chestnut Ridge Ct',
    'Washington Township',
    'NJ',
    '08012',
    'Torres Home',
    'Front bed cleanup and light trimming.',
    null,
    'Gate code 0420',
    39.7401,
    -75.0864,
    true
  ),
  (
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0003',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    '44f14854-8ac0-43c6-9882-9354da410003',
    '309 Walnut Ave',
    'Pitman',
    'NJ',
    '08071',
    'Kim Property',
    'Mow + curb line. Bag clippings this visit.',
    'Customer dog in backyard. Latch gate.',
    null,
    39.7328,
    -75.1302,
    true
  )
on conflict (id) do update
set
  street_1 = excluded.street_1,
  city = excluded.city,
  state = excluded.state,
  postal_code = excluded.postal_code,
  property_name = excluded.property_name,
  service_notes = excluded.service_notes,
  access_notes = excluded.access_notes,
  gate_notes = excluded.gate_notes,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_active = excluded.is_active;

insert into public.service_plans (
  id,
  organization_id,
  property_id,
  service_type_id,
  plan_name,
  frequency_type,
  day_of_week,
  interval_count,
  start_date,
  quoted_price,
  billing_mode,
  status,
  auto_generate_visits,
  preferred_service_window
)
values
  (
    '4fc5b752-3cd0-42f5-a4b8-d0e11f4f0001',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0001',
    '2b5d07dc-4a2e-4fb6-b5d8-1187f7a10001',
    'Weekly Lawn Care - Romano',
    'weekly',
    2,
    1,
    current_date - 30,
    6500,
    'per_visit',
    'active',
    true,
    'AM'
  ),
  (
    '4fc5b752-3cd0-42f5-a4b8-d0e11f4f0002',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0002',
    '2b5d07dc-4a2e-4fb6-b5d8-1187f7a10002',
    'Biweekly Cleanup - Torres',
    'biweekly',
    3,
    2,
    current_date - 60,
    9500,
    'per_visit',
    'active',
    true,
    'PM'
  ),
  (
    '4fc5b752-3cd0-42f5-a4b8-d0e11f4f0003',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0003',
    '2b5d07dc-4a2e-4fb6-b5d8-1187f7a10001',
    'Weekly Lawn Care - Kim',
    'weekly',
    4,
    1,
    current_date - 20,
    7000,
    'per_visit',
    'active',
    true,
    'AM'
  )
on conflict (id) do update
set
  plan_name = excluded.plan_name,
  frequency_type = excluded.frequency_type,
  day_of_week = excluded.day_of_week,
  interval_count = excluded.interval_count,
  start_date = excluded.start_date,
  quoted_price = excluded.quoted_price,
  billing_mode = excluded.billing_mode,
  status = excluded.status,
  auto_generate_visits = excluded.auto_generate_visits,
  preferred_service_window = excluded.preferred_service_window;

insert into public.service_visits (
  id,
  organization_id,
  property_id,
  service_plan_id,
  service_type_id,
  scheduled_date,
  scheduled_at,
  scheduled_position,
  status,
  quoted_price,
  invoice_status,
  completion_timestamp,
  completed_at,
  reactivation_required,
  was_rain_delayed
)
values
  (
    '9dcceec8-b857-499e-b3f4-f2fe68990001',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0001',
    '4fc5b752-3cd0-42f5-a4b8-d0e11f4f0001',
    '2b5d07dc-4a2e-4fb6-b5d8-1187f7a10001',
    current_date,
    now(),
    1,
    'scheduled',
    6500,
    'not_generated',
    null,
    null,
    false,
    false
  ),
  (
    '9dcceec8-b857-499e-b3f4-f2fe68990002',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0002',
    '4fc5b752-3cd0-42f5-a4b8-d0e11f4f0002',
    '2b5d07dc-4a2e-4fb6-b5d8-1187f7a10002',
    current_date,
    now() + interval '30 minutes',
    2,
    'scheduled',
    9500,
    'not_generated',
    null,
    null,
    false,
    false
  ),
  (
    '9dcceec8-b857-499e-b3f4-f2fe68990003',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    'f9cb6d12-bf08-4aa2-a3a4-8c4455df0003',
    '4fc5b752-3cd0-42f5-a4b8-d0e11f4f0003',
    '2b5d07dc-4a2e-4fb6-b5d8-1187f7a10001',
    current_date,
    now() + interval '1 hour',
    3,
    'completed',
    7000,
    'generated',
    now() - interval '30 minutes',
    now() - interval '30 minutes',
    false,
    false
  )
on conflict (id) do update
set
  scheduled_date = excluded.scheduled_date,
  scheduled_at = excluded.scheduled_at,
  scheduled_position = excluded.scheduled_position,
  status = excluded.status,
  quoted_price = excluded.quoted_price,
  invoice_status = excluded.invoice_status,
  completion_timestamp = excluded.completion_timestamp,
  completed_at = excluded.completed_at;

insert into public.routes (
  id,
  organization_id,
  route_date,
  status,
  started_at,
  notes
)
values (
  '4f43f6f6-c68f-4d68-a37f-ea0d3cfa0001',
  'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
  current_date,
  'planned',
  null,
  'HDZ demo route for today.'
)
on conflict (id) do update
set
  route_date = excluded.route_date,
  status = excluded.status,
  notes = excluded.notes;

insert into public.route_stops (
  id,
  organization_id,
  route_id,
  service_visit_id,
  stop_order,
  status
)
values
  (
    '65c7fe60-c4e1-4fdb-aacd-bcaaf8d00001',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    '4f43f6f6-c68f-4d68-a37f-ea0d3cfa0001',
    '9dcceec8-b857-499e-b3f4-f2fe68990001',
    1,
    'pending'
  ),
  (
    '65c7fe60-c4e1-4fdb-aacd-bcaaf8d00002',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    '4f43f6f6-c68f-4d68-a37f-ea0d3cfa0001',
    '9dcceec8-b857-499e-b3f4-f2fe68990002',
    2,
    'pending'
  ),
  (
    '65c7fe60-c4e1-4fdb-aacd-bcaaf8d00003',
    'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
    '4f43f6f6-c68f-4d68-a37f-ea0d3cfa0001',
    '9dcceec8-b857-499e-b3f4-f2fe68990003',
    3,
    'completed'
  )
on conflict (id) do update
set
  stop_order = excluded.stop_order,
  status = excluded.status;

insert into public.invoices (
  id,
  organization_id,
  invoice_number,
  invoice_date,
  due_date,
  due_at,
  amount_due,
  status,
  generated_at,
  client_id,
  property_id,
  service_visit_id
)
values (
  '04eea8f6-47e2-4697-b16d-dbe4f0f50001',
  'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
  'HDZ-1001',
  current_date - 3,
  current_date + 7,
  (current_date + 7)::timestamp,
  7000,
  'sent',
  now() - interval '3 days',
  '44f14854-8ac0-43c6-9882-9354da410003',
  'f9cb6d12-bf08-4aa2-a3a4-8c4455df0003',
  '9dcceec8-b857-499e-b3f4-f2fe68990003'
)
on conflict (id) do update
set
  status = excluded.status,
  amount_due = excluded.amount_due,
  due_date = excluded.due_date,
  due_at = excluded.due_at;

insert into public.payments (
  id,
  organization_id,
  invoice_id,
  payment_date,
  payment_method,
  amount,
  status,
  reference_note
)
values (
  'f4a4d483-cd17-44f8-bf7b-2b836ecc0001',
  'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
  '04eea8f6-47e2-4697-b16d-dbe4f0f50001',
  current_date - 1,
  'venmo',
  3500,
  'pending_confirmation',
  'Partial Venmo payment received, awaiting reconciliation.'
)
on conflict (id) do update
set
  amount = excluded.amount,
  status = excluded.status,
  reference_note = excluded.reference_note;

insert into public.issues (
  id,
  organization_id,
  service_visit_id,
  property_id,
  client_id,
  title,
  description,
  status,
  severity,
  follow_up_required
)
values (
  '8948cb63-cab8-4db6-9028-657af6900001',
  'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
  '9dcceec8-b857-499e-b3f4-f2fe68990002',
  'f9cb6d12-bf08-4aa2-a3a4-8c4455df0002',
  '44f14854-8ac0-43c6-9882-9354da410002',
  'Back gate blocked by parked vehicle',
  'Crew could not access backyard at scheduled time. Needs customer follow-up.',
  'open',
  'medium',
  true
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  severity = excluded.severity,
  follow_up_required = excluded.follow_up_required;

insert into public.leads (
  id,
  organization_id,
  tenant_slug,
  source,
  status,
  name,
  phone,
  email,
  property_address,
  services_requested,
  project_description,
  timeline,
  budget_range,
  preferred_contact_method
)
values (
  '302dff74-95cd-4ca4-b06a-a8135f5a0001',
  'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
  'hdz-landscaping',
  'website_form',
  'new',
  'Chris Langdon',
  '856-555-2238',
  'chris.langdon@example.local',
  '55 Evergreen Ln, Glassboro, NJ 08028',
  array['mowing','cleanup'],
  'Looking for weekly service and spring cleanup.',
  'this_month',
  '$200-$400/month',
  'phone'
)
on conflict (id) do update
set
  status = excluded.status,
  project_description = excluded.project_description,
  timeline = excluded.timeline,
  budget_range = excluded.budget_range;

insert into public.events (
  id,
  organization_id,
  actor_user_id,
  entity_type,
  entity_id,
  event_type,
  metadata
)
values (
  '2452b77e-f7bb-4fec-b9de-f2d95b120001',
  'd2e31b8f-4fd5-4ed6-8f2e-6e8d9d760001',
  null,
  'seed',
  '4f43f6f6-c68f-4d68-a37f-ea0d3cfa0001',
  'hdz_demo_seeded',
  '{"source":"supabase/seeds/hdz_demo.sql"}'::jsonb
)
on conflict (id) do nothing;

commit;
