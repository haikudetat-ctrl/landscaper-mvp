-- Canonicalize invoice status constraint across local/remote environments.
-- Required for safe undo flow (invoice_generated -> completed) where invoice is marked voided.

alter table public.invoices
  drop constraint if exists invoices_status_check;

alter table public.invoices
  drop constraint if exists invoices_status_phase1_check;

alter table public.invoices
  add constraint invoices_status_check
  check (
    status in (
      'draft',
      'generated',
      'sent',
      'viewed',
      'partially_paid',
      'paid',
      'overdue',
      'voided'
    )
  );

notify pgrst, 'reload schema';
