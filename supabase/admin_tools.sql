-- Run ONCE in Supabase: SQL Editor > New query > paste > Run
-- 1) Lets an existing admin make or remove other admins from the Admin page (no more SQL later)
create or replace function public.set_admin(target uuid, flag boolean) returns void
language plpgsql security definer set search_path = public as
$$
begin
  if not public.is_admin() then raise exception 'Only admins can do this'; end if;
  if target = auth.uid() and flag = false then raise exception 'You cannot remove your own admin access'; end if;
  update public.profiles set is_admin = flag where id = target;
end $$;
grant execute on function public.set_admin(uuid, boolean) to authenticated;

-- 2) Make YOUR account the first admin (change the email if needed)
update public.profiles set is_admin = true where email = 'kushbastero@gmail.com';

-- 3) Safety net: create a profile for any account that is missing one
insert into public.profiles (id, email)
select id, email from auth.users where id not in (select id from public.profiles);
