-- Run ONCE in Supabase: SQL Editor > New query > paste > Run
-- Lets admins edit every student's details, feeding plan and payments from the Admin page.
-- Students can still only change their own records.
drop policy if exists "admin update profiles" on public.profiles;
drop policy if exists "dues admin write" on public.due_dates;
drop policy if exists "pay admin write" on public.payments;

create policy "admin update profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
create policy "dues admin write" on public.due_dates
  for all using (public.is_admin()) with check (public.is_admin());
create policy "pay admin write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());
