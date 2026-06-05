# Invoice Lifecycle

## Source of Truth
- Authoritative lifecycle owner: `invoices.status`
- Compatibility field: `service_visits.invoice_status` (legacy lineage, not primary decision source)

## Invoice Statuses
- `draft`
- `generated`
- `sent`
- `viewed`
- `partially_paid`
- `paid`
- `overdue`
- `voided`

## Payment Statuses
- `expected`
- `pending_confirmation`
- `received`
- `reconciled`
- `failed`
- `disputed`
- `cancelled`

## Operational Rules
- Completing a visit enables invoice generation.
- Invoice generation creates:
  - invoice (`generated`)
  - expected payment record (`expected`)
- Manual receive path updates payment to `received` and refreshes invoice aggregate status.
- Undo from `invoice_generated`:
  - invoice set to `voided`
  - unreconciled payments set to `cancelled`
  - no hard deletes

## Communication
- Send flow:
  - provider mode (`LOAM_EMAIL_PROVIDER=enabled`): status goes to `sent`
  - preview mode: preview content saved, invoice remains `generated`

## Event Hooks
- `invoice_created`
- `invoice_generated`
- `invoice_sent`
- `payment_expected`
- `payment_recorded`
- `payment_received`
- `invoice_generation_reverted`
