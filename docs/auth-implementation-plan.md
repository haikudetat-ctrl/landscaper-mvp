# Auth Implementation Plan

- Router: Next.js App Router under `src/app`; existing protected product routes live in the `(app)` route group and keep the current desktop shell.
- Supabase shape: existing browser/server helpers are under `src/lib/supabase`; current data helpers use the server helper for app data. Auth will add SSR cookie-aware clients without destructively changing existing workflows.
- Existing schema: no generated `profiles`, `organizations`, `organization_members`, `organization_id`, or `user_id` tables/columns were found. Add only the auth/org foundation tables and safe RLS policies in a new migration.
- Routing: `/login` is public. The existing app routes are protected by proxy. Authenticated users without an organization membership go to `/onboarding`; users with membership go to `/`.
- Login: email/password sign-in uses Supabase Auth users managed from the Supabase dashboard. Google OAuth is not used.
- Deferred for safety: do not add `organization_id` to existing business tables or enable RLS on them in this pass. Document that hardening separately.
