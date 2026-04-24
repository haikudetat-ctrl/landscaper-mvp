# Landscaping Ops MVP

Production-minded owner-operator internal app for a landscaping business.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (database functions/views/storage)

## Environment
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for server-side writes)
- `SUPABASE_VISIT_PHOTO_BUCKET` (defaults to `visit-photos`)

## Run
```bash
npm install
npm run dev
```

## Architecture
- `src/app/(app)` dynamic server-rendered operator routes and server actions
- `src/lib/supabase` server/browser Supabase clients
- `src/lib/types` schema-aligned shared types
- `src/lib/db` typed query/action helpers
- `src/lib/validation` Zod form validation
- `src/components` reusable UI shell and form/table primitives

## Route Map
- `/` dashboard
- `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`
- `/properties`, `/properties/new`, `/properties/[id]`, `/properties/[id]/edit`
- `/service-plans`, `/service-plans/new`, `/service-plans/[id]`, `/service-plans/[id]/edit`
- `/service-visits`, `/service-visits/[id]`, `/service-visits/[id]/edit`
- `/invoices`, `/invoices/new`, `/invoices/[id]`
- `/communication-log`, `/communication-log/[id]`

## Notes
- Dashboard reads from existing Supabase views for operational clarity.
- Invoice creation uses `create_invoice_for_visit(...)`.
- Visit generation uses `generate_service_visits_for_plan(...)` and `generate_service_visits_for_active_plans(...)`.
- Rain delay shift uses `bulk_rain_delay_shift(...)`.
- Visit photos use Supabase Storage + `visit_photos` metadata.
