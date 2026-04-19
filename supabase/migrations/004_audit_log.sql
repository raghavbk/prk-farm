-- Audit log of tenant mutations. Written from server actions via
-- log_action(); read by tenant members for their own tenant and by platform
-- admins across all tenants.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_tenant_created_idx
  on public.audit_log (tenant_id, created_at desc);
create index audit_log_actor_created_idx
  on public.audit_log (actor_user_id, created_at desc);

alter table public.audit_log enable row level security;

-- Read: tenant members see entries for their tenant, platform admins see all.
create policy audit_log_member_read on public.audit_log
  for select using (
    (tenant_id is not null and public.is_tenant_member(tenant_id))
    or public.is_platform_admin()
  );

-- No insert/update/delete policies — writes must go through log_action().

-- ============================================================
-- log_action: tiny surface, fixed columns, SECURITY DEFINER.
-- ============================================================
create or replace function public.log_action(
  p_tenant_id uuid,
  p_action text,
  p_resource_type text default null,
  p_resource_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Only allow logging for a tenant where the caller is a member, or if the
  -- caller is a platform admin. Anyone else silently gets a null — the caller
  -- shouldn't crash because audit logging failed.
  if p_tenant_id is not null
     and not public.is_tenant_member(p_tenant_id)
     and not public.is_platform_admin() then
    return null;
  end if;

  insert into public.audit_log (tenant_id, actor_user_id, action, resource_type, resource_id, metadata)
  values (p_tenant_id, auth.uid(), p_action, p_resource_type, p_resource_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_action(uuid, text, text, text, jsonb) to authenticated;
