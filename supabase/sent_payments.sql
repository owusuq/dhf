
create table if not exists public.sent_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  reason text not null,
  seen boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.sent_payments enable row level security;

drop policy if exists "sent own read" on public.sent_payments;
drop policy if exists "sent admin all" on public.sent_payments;
create policy "sent own read" on public.sent_payments for select using (user_id = auth.uid());
create policy "sent admin all" on public.sent_payments for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.mark_payments_seen() returns void
language sql security definer set search_path = public as
$$ update public.sent_payments set seen = true where user_id = auth.uid() and seen = false $$;
grant execute on function public.mark_payments_seen() to authenticated;
