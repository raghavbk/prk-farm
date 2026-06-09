-- Allow tenant members to update group-level metadata through RLS-protected
-- user sessions. The app currently only exposes group renaming via the server
-- action, while financial ownership changes remain separate admin-only flows.

drop policy if exists "groups_update" on public.groups;

create policy "groups_update" on public.groups
  for update to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));
