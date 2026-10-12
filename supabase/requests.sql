-- Run ONCE in Supabase: SQL Editor > New query > paste > Run (safe to run again)
-- Request button on the login screen. Anyone can send a request; only admins can read or decide them.

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  amount numeric,
  reason text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now()
);

alter table public.requests enable row level security;

-- Remove the earlier policies (they let every logged-in student read requests)
drop policy if exists "anon can submit requests" on public.requests;
drop policy if exists "authenticated can read requests" on public.requests;
drop policy if exists "authenticated can update requests" on public.requests;
drop policy if exists "requests submit" on public.requests;
drop policy if exists "requests admin read" on public.requests;
drop policy if exists "requests admin update" on public.requests;
drop policy if exists "requests admin delete" on public.requests;

create policy "requests submit" on public.requests
  for insert to anon, authenticated
  with check (status = 'pending');

create policy "requests admin read" on public.requests
  for select to authenticated
  using (public.is_admin());

create policy "requests admin update" on public.requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "requests admin delete" on public.requests
  for delete to authenticated
  using (public.is_admin());
