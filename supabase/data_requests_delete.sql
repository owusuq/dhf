-- Lets admins delete data support requests.
drop policy if exists "data_requests admin delete" on public.data_requests;
create policy "data_requests admin delete" on public.data_requests
  for delete using (public.is_admin());
