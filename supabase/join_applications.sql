-- Run ONCE in Supabase: SQL Editor > New query > paste > Run (safe to run again)
-- Public application link (/join). Anyone can apply without an account; only admins can read or manage the applications.

create table if not exists public.join_applications (
  id uuid primary key default gen_random_uuid(),
  program text not null default 'Daakyehene Foundation',
  name text not null,
  phone text not null,
  email text,
  level text,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.join_applications enable row level security;

drop policy if exists "join submit" on public.join_applications;
drop policy if exists "join admin read" on public.join_applications;
drop policy if exists "join admin update" on public.join_applications;
drop policy if exists "join admin delete" on public.join_applications;

create policy "join submit" on public.join_applications
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and decided_at is null
    and char_length(name) between 2 and 120
    and char_length(phone) between 5 and 40
    and char_length(reason) between 10 and 1500
  );

create policy "join admin read" on public.join_applications
  for select to authenticated
  using (public.is_admin());

create policy "join admin update" on public.join_applications
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "join admin delete" on public.join_applications
  for delete to authenticated
  using (public.is_admin());