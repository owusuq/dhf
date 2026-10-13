-- Run ONCE in Supabase: SQL Editor > New query > paste > Run (safe to run again)
create index if not exists due_dates_user_idx on public.due_dates (user_id);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists sent_payments_user_idx on public.sent_payments (user_id);
create index if not exists results_user_idx on public.results (user_id);
create index if not exists requests_status_idx on public.requests (status, created_at desc);
