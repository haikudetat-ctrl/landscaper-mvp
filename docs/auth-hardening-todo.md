# Auth Hardening TODOs

Deferred intentionally for the MVP auth foundation:

- Add `organization_id` to business tables once tenancy rules are finalized:
  - `clients`
  - `properties`
  - `service_plans`
  - `service_visits`
  - `invoices`
  - `payments`
  - `communication_log`
  - `photos`
  - `automation_rules`
- Backfill existing rows into the initial organization before enabling RLS on business tables.
- Add RLS policies for every business table based on `organization_members`.
- Update all query helpers to filter by the active `organization_id`.
- Add organization switching only if the product later supports users in multiple businesses.
