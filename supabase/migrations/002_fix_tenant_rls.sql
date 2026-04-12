-- Fix: allow users to read tenants they created (needed for the INSERT...SELECT chain)
-- Without this, creating a tenant succeeds but reading it back fails
-- because the user isn't in tenant_members yet.

drop policy "tenants_select" on public.tenants;

create policy "tenants_select" on public.tenants
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_tenant_member(id)
  );
