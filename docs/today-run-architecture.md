# Today Run Architecture

## Canonical Flow
- Page: `/today`
- Workflow model: `src/lib/workflows/today-visit-workflow.ts`
- Sequence:
  - `scheduled -> en_route -> arrived -> in_progress -> completed -> invoice_generated`

## Action Model
- One primary action per active stop:
  - `Start Route`
  - `Mark Arrived`
  - `Start Work`
  - `Complete Job`
  - `Generate Invoice`
- Secondary actions:
  - add issue
  - upload photo
  - flag follow-up
  - undo/revert
  - skip-ahead

## Revert Behavior
- Allowed:
  - `arrived -> en_route`
  - `in_progress -> arrived`
  - `completed -> in_progress`
  - `invoice_generated -> completed` (with invoice/payment rollback safety)
- Rollback event: `visit_status_reverted`

## Skip-Ahead Behavior
- Skip-ahead computes implied transitions.
- Implied step events are logged for timeline/report consistency.

## Completed / Review Behavior
- Invoiced stops are moved from active flow into `Completed / Review`.
- Next active stop is first non-review stop in route order.

## Consolidation Notes
- `/run` now redirects to `/today`; Today is the operational source of truth.
- Canonical writes use `logEvent` into `public.events`.
