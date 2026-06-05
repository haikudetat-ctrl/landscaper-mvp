# HDZ Alpha Demo Script

## Goal
Show an owner-operator can run the day end-to-end in LOAM.

## Pre-demo setup
1. Run `supabase db reset`.
2. Run `npm run dev`.
3. Sign in with the HDZ owner account used in your environment.

## Demo click path
1. Login:
   Open `/login`, sign in, confirm redirect to app.
2. Dashboard:
   Open `/dashboard`; call out today jobs, route status, open invoices, pending payments.
3. Schedule:
   Open `/schedule`.
   Confirm seeded today visits are visible.
4. Create today route:
   In `Today's Route`, click `Create Route from Today's Visits`.
   Confirm success banner.
5. Reorder stops:
   Use `↑` and `↓` on a stop.
   Click `Save Order`.
   Confirm success banner.
6. Start route:
   In route card, click `Mark Started`.
   Confirm success banner.
7. Today's Run:
   Open `/today`.
   Call out route summary, sticky next stop card, and primary action button.
8. Mark arrived:
   On current stop, click `Mark Arrived`.
   Confirm success banner.
9. Start work:
   Click `Start Work`.
   Confirm success banner.
10. Complete job:
   Click `Complete Job`.
   Confirm completion banner.
11. Upload photo proof:
   Expand `Upload Job Photo`, choose file, optionally set `Customer visible`, submit.
   Confirm success banner.
12. Generate invoice:
   In completed stop card, expand invoice draft section.
   Choose due days + payment method, click `Generate Invoice + Payment Expectation`.
   Confirm invoice generation banner.
13. Invoice send/preview:
   Open `/invoices` then invoice detail.
   Click `Send / Save Preview`.
   Confirm sent/preview banner.
14. Mark payment received:
   In invoice detail, use `Record Payment` form and submit.
   Confirm payment recorded banner.
15. Reports:
   Open `/reports`.
   Call out date range, completed vs scheduled, weather delay, route completion, and revenue cards.
16. QA checklist:
   Open `/settings/qa`.
   Verify env/auth/provider/storage/org/role/last event/app version checks.

## Talking points
1. Route-driven daily execution:
   Stop order and route lifecycle are persisted and event-logged.
2. Field proof + communication:
   Photo uploads are org-path scoped and tied to visit timeline.
3. Revenue workflow:
   Completion -> invoice draft -> send/preview -> payment confirmation.
4. Reliability:
   Canonical events power timeline/reporting; QA page provides operational readiness checks.

## If something fails live
1. Open `/settings/qa` first to verify auth, org, and bucket readiness.
2. Re-run `supabase db reset` to restore seeded demo path.
3. Continue demo from `/schedule` and `/today` using seeded route + stops.
