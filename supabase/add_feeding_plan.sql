-- Run once in Supabase: SQL Editor > New query > paste > Run
alter table public.due_dates add column if not exists frequency text default 'monthly';
alter table public.due_dates add column if not exists amount numeric;
update public.due_dates set frequency = 'monthly' where frequency is null;
alter table public.due_dates add column if not exists payment_network text;
