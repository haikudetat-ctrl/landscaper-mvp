-- Baseline core operational schema for replay-safe migrations.
-- Uses IF NOT EXISTS guards to avoid clobbering existing remote structures.

create extension if not exists pgcrypto;

create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  is_active boolean not null default true,
  is_recurring_capable boolean not null default true,
  is_seasonal boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  full_name text not null,
  primary_email text,
  primary_phone text,
  payment_method_preference text not null default 'other',
  billing_notes text,
  cash_collection_notes text,
  check_drop_location_notes text,
  check_payable_to text,
  venmo_handle text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  client_id uuid not null references public.clients(id) on delete cascade,
  street_1 text not null,
  street_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  property_name text,
  service_notes text,
  access_notes text,
  gate_notes text,
  latitude double precision,
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  property_id uuid not null references public.properties(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id),
  plan_name text not null,
  description text,
  frequency_type text not null,
  day_of_week int,
  interval_count int,
  start_date date not null,
  end_date date,
  quoted_price int not null default 0,
  billing_mode text not null default 'per_visit',
  status text not null default 'active',
  notes text,
  auto_generate_visits boolean not null default true,
  preferred_service_window text,
  season_start_month int,
  season_end_month int,
  last_generated_through date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  property_id uuid not null references public.properties(id) on delete cascade,
  service_plan_id uuid references public.service_plans(id) on delete set null,
  service_type_id uuid not null references public.service_types(id),
  rescheduled_from_visit_id uuid references public.service_visits(id) on delete set null,
  scheduled_date date not null,
  scheduled_position int,
  status text not null default 'scheduled',
  quoted_price int not null default 0,
  invoice_status text not null default 'not_generated',
  completion_notes text,
  completion_timestamp timestamptz,
  operator_notes text,
  skip_reason text,
  reactivation_required boolean not null default false,
  was_rain_delayed boolean not null default false,
  rain_delay_source_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  service_visit_id uuid unique references public.service_visits(id) on delete set null,
  invoice_number text not null unique,
  invoice_date date not null,
  due_date date not null,
  amount_due int not null default 0,
  status text not null default 'draft',
  email_sent_at timestamptz,
  last_reminder_sent_at timestamptz,
  payment_instructions_snapshot text,
  venmo_handle_snapshot text,
  cash_check_notes_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_date date not null,
  payment_method text not null,
  amount int not null,
  reference_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  service_visit_id uuid not null references public.service_visits(id) on delete cascade,
  photo_type text not null default 'before',
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_log (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  message_type text not null,
  recipient text not null,
  status text not null default 'queued',
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  service_visit_id uuid references public.service_visits(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  provider_message_id text,
  subject text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.refresh_invoice_status(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount_due int;
  v_paid int;
  v_due_date date;
  v_status text;
begin
  select amount_due, due_date into v_amount_due, v_due_date
  from public.invoices
  where id = p_invoice_id;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where invoice_id = p_invoice_id;

  if v_paid >= v_amount_due and v_amount_due > 0 then
    v_status := 'paid';
  elsif v_paid > 0 then
    v_status := 'partially_paid';
  elsif v_due_date < current_date then
    v_status := 'overdue';
  else
    v_status := 'sent';
  end if;

  update public.invoices
  set status = v_status, updated_at = now()
  where id = p_invoice_id;
end;
$$;
