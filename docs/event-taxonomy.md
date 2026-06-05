# Event Taxonomy (Canonical)

LOAM's operational timeline uses `public.events` as the single canonical event stream.

## Contract
- Table: `public.events`
- Writer: `src/lib/db/operational-events.ts` (`logEvent`)
- Timeline reader: `src/lib/db/timeline.ts`
- Ordering: `created_at`
- Scope: `organization_id` (RLS-protected)

## Entity Types
- `service_visit`
- `route`
- `invoice`
- `payment`
- `issue`

## Core Event Types
- Visit workflow:
  - `route_started`
  - `visit_arrived`
  - `work_started`
  - `visit_completed`
  - `visit_status_reverted`
  - `visit_follow_up_flagged`
  - `visit_rescheduled`
  - `weather_delay_applied`
- Route workflow:
  - `route_created`
  - `route_started`
  - `route_reordered`
  - `route_completed`
- Invoice/payment workflow:
  - `invoice_created`
  - `invoice_generated`
  - `invoice_sent`
  - `invoice_generation_reverted`
  - `payment_expected`
  - `payment_recorded`
  - `payment_received`
- Issues/photos:
  - `issue_created`
  - `photo_uploaded`

## Metadata Shape Guidance
- Include only operation-specific keys.
- Prefer snake_case keys.
- Common keys:
  - `source`
  - `reason`
  - `service_visit_id`
  - `invoice_id`
  - `payment_id` / `payment_ids`
  - `method`
  - `previous_scheduled_date`
  - `new_scheduled_date`
  - `implied` / `skip_ahead`

## Consolidation Notes
- Legacy `app_events` migration files remain for historical replay context.
- Active product code should not write to `app_events` semantics.
