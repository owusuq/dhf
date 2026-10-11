-- Run ONCE in Supabase: SQL Editor > New query > paste > Run
-- Results uploaded by admins. Each student can only read their own. Admins can read all.
-- Uploading, renaming and deleting go through the server (admin check happens there).
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  file_name text not null,
  mime_type text default '',
  drive_file_id text not null,
  created_at timestamptz default now()
);
alter table public.results enable row level security;
drop policy if exists "results own or admin read" on public.results;
create policy "results own or admin read" on public.results
  for select using (user_id = auth.uid() or public.is_admin());
