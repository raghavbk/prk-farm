-- Platform administration + custom-domain tenant routing.
-- - platform_admins : users who can cross tenants, run onboarding, view all.
-- - tenant_domains  : maps a request host to a tenant (primary + aliases).
-- - resolve_tenant_by_domain(text) : public RPC called from middleware.
-- - is_platform_admin() : helper used in RLS and server code.

-- ============================================================
-- platform_admins
-- ============================================================
create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  notes text
);

alter table public.platform_admins enable row level security;

-- A user may check whether they themselves are a platform admin. No cross-user
-- visibility — the full list is for service-role only.
create policy platform_admins_self_read on public.platform_admins
  for select using (user_id = auth.uid());

-- Writes to platform_admins happen via service role only (no RLS insert/update/delete policies).

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated, anon;

-- ============================================================
-- tenant_domains
-- ============================================================
create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null,
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Stored lowercased + stripped; enforced at the DB level too.
create unique index tenant_domains_domain_uniq on public.tenant_domains (lower(domain));
create index tenant_domains_tenant_idx on public.tenant_domains (tenant_id);

-- Exactly zero or one primary domain per tenant.
create unique index tenant_domains_primary_uniq on public.tenant_domains (tenant_id)
  where is_primary is true;

alter table public.tenant_domains enable row level security;

-- Tenant members can read their own tenant's domains.
-- Platform admins can read everything.
create policy tenant_domains_member_read on public.tenant_domains
  for select using (
    public.is_tenant_member(tenant_id) or public.is_platform_admin()
  );

-- Writes happen via service role (CLI / platform admin actions) — no RLS insert
-- policies. Owners + platform admins get update/delete so the app could later
-- expose domain management in the UI without another migration.
create policy tenant_domains_owner_write on public.tenant_domains
  for all using (
    public.is_tenant_owner(tenant_id) or public.is_platform_admin()
  ) with check (
    public.is_tenant_owner(tenant_id) or public.is_platform_admin()
  );

-- ============================================================
-- resolve_tenant_by_domain: public, called from Next.js middleware
-- ============================================================
create or replace function public.resolve_tenant_by_domain(p_domain text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.tenant_domains
  where lower(domain) = lower(trim(p_domain))
  limit 1;
$$;

grant execute on function public.resolve_tenant_by_domain(text) to anon, authenticated;

-- ============================================================
-- Platform-admin cross-tenant visibility on existing tables
-- ============================================================
-- Give platform admins read access to every tenant's data for the /platform
-- console. Writes still flow through existing policies or service role.

create policy tenants_platform_read on public.tenants
  for select using (public.is_platform_admin());

create policy tenant_members_platform_read on public.tenant_members
  for select using (public.is_platform_admin());

create policy groups_platform_read on public.groups
  for select using (public.is_platform_admin());

create policy group_members_platform_read on public.group_members
  for select using (public.is_platform_admin());

create policy expenses_platform_read on public.expenses
  for select using (public.is_platform_admin());

create policy expense_splits_platform_read on public.expense_splits
  for select using (public.is_platform_admin());
