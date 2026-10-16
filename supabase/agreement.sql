-- Run ONCE in Supabase: SQL Editor > New query > paste > Run (safe to run again)
-- Student agreement + signatures + monthly meetings.

create table if not exists public.agreement_doc (
  id int primary key check (id = 1),
  title text not null,
  body text not null default '',
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.agreement_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version int not null,
  full_name text not null,
  signed_at timestamptz not null default now(),
  unique (user_id, version)
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Monthly meeting',
  starts_at timestamptz not null,
  place text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.agreement_doc enable row level security;
alter table public.agreement_signatures enable row level security;
alter table public.meetings enable row level security;

drop policy if exists "agreement read" on public.agreement_doc;
drop policy if exists "agreement admin write" on public.agreement_doc;
drop policy if exists "agreement admin update" on public.agreement_doc;
create policy "agreement read" on public.agreement_doc for select to anon, authenticated using (true);
create policy "agreement admin write" on public.agreement_doc for insert to authenticated with check (public.is_admin());
create policy "agreement admin update" on public.agreement_doc for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sign own insert" on public.agreement_signatures;
drop policy if exists "sign read" on public.agreement_signatures;
drop policy if exists "sign admin delete" on public.agreement_signatures;
create policy "sign own insert" on public.agreement_signatures for insert to authenticated with check (user_id = auth.uid());
create policy "sign read" on public.agreement_signatures for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "sign admin delete" on public.agreement_signatures for delete to authenticated using (public.is_admin());

drop policy if exists "meetings read" on public.meetings;
drop policy if exists "meetings admin all" on public.meetings;
create policy "meetings read" on public.meetings for select to authenticated using (true);
create policy "meetings admin all" on public.meetings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.agreement_doc (id, title, body, version)
values (1, 'Daakyehene Foundation Student Agreement', 'Welcome to the Daakyehene Foundation family. Please read this agreement carefully, then agree and sign at the bottom.

1. Our promise to you
The Foundation, through the Admin, promises to support you financially when it is necessary and when you need it. This support is for real needs and not for unnecessary expenses.

2. Monthly meeting
Every month we will hold a regular meeting to talk about your progress and your goals. The date and time will depend on our schedules, and you will be reminded in the portal.

3. Your grades and needs
Together we will work towards your individual grades and your personal needs, so that every student can do their best.

4. A platform to grow
The Foundation is a platform for every student to grow as an individual. When you get the chance, you agree to tell other people about the Foundation and the work it does.

5. An opportunity
This support is an opportunity, not a right. If a student does not perform well, the support can be reduced or stopped. Each case will be looked at on its own, depending on the circumstances and how it is viewed by the Foundation.

6. Gifts and surprises
Sometimes a gift or a surprise may be given, such as a mobile phone or a laptop, depending on your performance. Money can also be given as a gift, depending on your performance.

7. Growing together
All of this is to help us grow. There is no competition in this organization.

8. Meeting in person
If everything is arranged and the Admin comes to Ghana in person, we can also organize a small party at a good location, so that all of us can meet and relax together. Let us all be flexible.

9. Changes
This agreement may be edited and improved from time to time. If it changes in a way that needs your agreement again, you will be asked to read and sign it again.', 1)
on conflict (id) do nothing;
