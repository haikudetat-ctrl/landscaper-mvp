# Canonical RBAC Spec (Approved)

## Final Decisions (Locked)
- Office Manager can record payments.
- Crew Lead does not see quoted price in v1.0.
- Assignment-scoped crew visibility starts in Phase 1.
- Migrate now to richer roles.
- `joe@2-stack.com` and `chris@2-stack.com` have `super_admin` capabilities.
- Public intake is multi-tenant and branded (HDZ is first of many).
- Client portal should use separate portal identities linked to internal records.
- Remove `testspace` and `ui-kit` from production navigation.
- Imports are Business Owner or Super Admin only.
- Rain delay / bulk shift is Office only.

## Roles
- `super_admin`
- `platform_owner`
- `business_owner`
- `office_manager`
- `crew_lead`
- `crew_member`
- `client_portal_user`
- `public_lead`

## Permission Constants
- `dashboard.view`
- `run.view`
- `run.execute`
- `schedule.view`
- `schedule.shift`
- `clients.read`
- `clients.write`
- `properties.read`
- `properties.write`
- `service_plans.read`
- `service_plans.write`
- `service_visits.read`
- `service_visits.write`
- `invoices.read`
- `invoices.write`
- `payments.record`
- `communication.read`
- `imports.run`
- `team.manage`
- `settings.manage`
- `reports.view`
- `automations.manage`
- `support.admin`

## Role Matrix
| Role | Core Goal | Primary App Surfaces | Write Access | Restricted |
|---|---|---|---|---|
| `super_admin` | Platform oversight and support | Internal admin + full app access | Full | None within platform scope |
| `platform_owner` | Multi-tenant platform operations | Support/admin surfaces | Controlled support actions | Normal daily operations by default |
| `business_owner` | Full business operations control | Dashboard, run, schedule, CRM, visits, invoices, team/settings/imports | Full org operational writes | Other tenant/org data |
| `office_manager` | Dispatch and office execution | Dashboard, run, schedule, clients/properties/plans/visits/invoices/comms | Operational writes + payments + office-only schedule shift | Deep org ownership settings |
| `crew_lead` | Field lead execution | Today/run/assigned visits/schedule/properties | Assigned-visit status, notes, photos | Prices (v1.0), imports, finance admin |
| `crew_member` | Field task completion | Today/run/assigned visits | Task-level/visit execution and photos | Financials, imports, settings |
| `client_portal_user` | Customer self-service | Portal dashboard, own properties/history/invoices | Own preferences and portal actions | Internal operations and non-owned data |
| `public_lead` | New lead intake | Branded public landing + intake | Lead submission only | Internal app and data |

## Mapping From Current Membership Roles
Current org membership roles map to richer app roles until DB migration is complete:
- `owner` -> `business_owner`
- `admin` -> `office_manager`
- `crew_lead` -> `crew_lead`
- `crew_member` -> `crew_member`
- fallback/legacy `member` -> `crew_member`

Email override:
- `joe@2-stack.com` -> `super_admin`
- `chris@2-stack.com` -> `super_admin`

## Navigation Policy (Current Implementation Target)
- Internal TopNav items are visibility-gated by permission.
- `testspace` and `ui-kit` are excluded from production navigation.
- Future dedicated shells:
  - Internal Ops Shell
  - Client Portal Shell
  - Platform Admin Shell
  - Public Intake Shell

## Phase Guidance
1. Route labeling + role guard map.
2. Route-level authorization + API guard parity.
3. Component field masking by permission.
4. Assignment scoping for crew (Phase 1 requirement).
5. RLS tightening and richer DB-backed role model.
