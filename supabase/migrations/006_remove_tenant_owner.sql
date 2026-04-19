-- Retire the tenant-owner role. tenant_members.role is now {admin, member}:
--   admin  — can invite/remove members, set ownership, edit any expense
--   member — participates (adds their own expenses, views balances, etc.)
-- Platform admins handle structural tenant operations (create tenants,
-- promote admins) cross-tenant via the service role.

-- Order matters: drop the old CHECK, migrate the data, then add the new
-- CHECK. Adding the new constraint BEFORE the UPDATE fails because Postgres
-- validates existing rows at constraint-creation time and any surviving
-- 'owner' row would violate (role in ('admin', 'member')).
alter table public.tenant_members drop constraint tenant_members_role_check;

update public.tenant_members set role = 'admin' where role = 'owner';

alter table public.tenant_members add constraint tenant_members_role_check
  check (role in ('admin', 'member'));

-- is_tenant_owner() is kept for backward-compat but will now return false for
-- everyone (no 'owner' rows survive). Policies that referenced it are moot;
-- any remaining admin flows go through the service role in server actions.
