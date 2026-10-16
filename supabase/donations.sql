-- Run ONCE in Supabase: SQL Editor > New query > paste > Run (safe to run again)
-- Public donate page. Anyone can tell the Foundation they gave or plan to give; only admins can read or manage them.

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  amount numeric,
  method text,
  message text,
  status text not null default 'pending'
    check (status in ('pending','received')),
  created_at timestamptz not null default now()
);

alter table public.donations enable row level security;

drop policy if exists "donations submit" on public.donations;
drop policy if exists "donations admin read" on public.donations;
drop policy if exists "donations admin update" on public.donations;
drop policy if exists "donations admin delete" on public.donations;

create policy "donations submit" on public.donations
  for insert to anon, authenticated
  with check (status = 'pending');

create policy "donations admin read" on public.donations
  for select to authenticated
  using (public.is_admin());

create policy "donations admin update" on public.donations
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "donations admin delete" on public.donations
  for delete to authenticated
  using (public.is_admin());
