-- Run this once in Supabase: SQL Editor > New query > paste > Run

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  level text default '',
  birthday date,
  phone text default '',
  payment_option text default '',
  fees_total numeric default 0,
  is_admin boolean not null default false,
  created_at timestamptz default now()
);
create table public.due_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  due_date date not null,
  repeat_monthly boolean not null default false,
  frequency text default 'monthly',
  amount numeric,
  note text default '',
  created_at timestamptz default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paid_on date not null,
  amount numeric not null,
  note text default '',
  created_at timestamptz default now()
);

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public as
$$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$ begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.due_dates enable row level security;
alter table public.payments enable row level security;

create policy "own or admin read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own update" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = public.is_admin());

create policy "dues own" on public.due_dates for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dues admin read" on public.due_dates for select using (public.is_admin());
create policy "pay own" on public.payments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pay admin read" on public.payments for select using (public.is_admin());

-- Make yourself admin AFTER you sign up in the app:
-- update public.profiles set is_admin = true where email = 'YOUR-EMAIL';
