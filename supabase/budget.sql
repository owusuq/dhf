-- Run ONCE in Supabase: SQL Editor > New query > paste > Run
-- Private budget storage. Each person can only see and change their own row.
create table if not exists public.budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.budgets enable row level security;

drop policy if exists "budget read own" on public.budgets;
drop policy if exists "budget insert own" on public.budgets;
drop policy if exists "budget update own" on public.budgets;
create policy "budget read own" on public.budgets for select using (auth.uid() = user_id);
create policy "budget insert own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budget update own" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
