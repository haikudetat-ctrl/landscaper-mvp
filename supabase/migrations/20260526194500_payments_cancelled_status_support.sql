-- Allow non-destructive rollback of payment expectations when invoice generation is reverted.
alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (status in (
    'expected',
    'pending_confirmation',
    'received',
    'reconciled',
    'failed',
    'disputed',
    'cancelled'
  ));

notify pgrst, 'reload schema';
