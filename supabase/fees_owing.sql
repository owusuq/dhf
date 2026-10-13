-- Run ONCE in Supabase: SQL Editor > New query > paste > Run
-- 1) A separate "amount owing" figure, typed by the admin (not calculated from payments)
alter table public.profiles add column if not exists fees_owing numeric;

-- 2) Only admins can change full fees or amount owing. Students cannot.
create or replace function public.protect_fees_total() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if (new.fees_total is distinct from old.fees_total or new.fees_owing is distinct from old.fees_owing)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only the Foundation can change fees';
  end if;
  return new;
end $$;
drop trigger if exists protect_fees_total on public.profiles;
create trigger protect_fees_total before update on public.profiles
  for each row execute function public.protect_fees_total();
