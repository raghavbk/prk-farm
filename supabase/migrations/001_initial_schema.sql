-- Farm Share Ledger: Initial Schema
-- Tables, triggers, views, functions, and RLS policies

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
    coalesce(new.raw_user_meta_data ->> 'email', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. TENANTS
-- ============================================================

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. TENANT_MEMBERS
-- ============================================================

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

-- ============================================================
-- 4. GROUPS
-- ============================================================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 5. GROUP_MEMBERS with ownership percentage
-- ============================================================

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ownership_pct numeric(5,2) not null check (ownership_pct > 0 and ownership_pct <= 100),
  primary key (group_id, user_id)
);

-- Constraint trigger: ownership_pct must sum to exactly 100 per group.
-- Uses a CONSTRAINT TRIGGER with DEFERRABLE INITIALLY DEFERRED so that
-- batch inserts (e.g., creating a group with 3 members) can complete
-- before the check runs.
create or replace function public.check_ownership_sum()
returns trigger as $$
declare
  total numeric;
  affected_group uuid;
begin
  -- Determine which group was affected
  if tg_op = 'DELETE' then
    affected_group := old.group_id;
  else
    affected_group := new.group_id;
  end if;

  select coalesce(sum(ownership_pct), 0) into total
  from public.group_members
  where group_id = affected_group;

  -- Allow 0 (empty group, all members removed) or exactly 100
  if total != 0 and total != 100 then
    raise exception 'Ownership percentages for group % must sum to 100, got %', affected_group, total;
  end if;

  return null; -- constraint triggers return null
end;
$$ language plpgsql;

create constraint trigger trg_check_ownership_sum
  after insert or update or delete on public.group_members
  deferrable initially deferred
  for each row execute function public.check_ownership_sum();

-- ============================================================
-- 6. EXPENSES
-- ============================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  paid_by uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 7. EXPENSE_SPLITS
-- ============================================================

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  share_pct numeric(5,2) not null,
  share_amount numeric(12,2) not null
);

-- ============================================================
-- 8. GROUP_BALANCES VIEW
-- ============================================================

-- For each expense, the payer is owed share_amount by every other
-- split member. We aggregate all such debts per (group_id, creditor,
-- debtor) pair, then net out both directions.

create or replace view public.group_balances as
with debts as (
  -- Each split where the user is NOT the payer creates a debt:
  -- split.user_id owes expenses.paid_by the share_amount
  select
    e.group_id,
    e.paid_by as creditor_id,
    es.user_id as debtor_id,
    es.share_amount as amount
  from public.expense_splits es
  join public.expenses e on e.id = es.expense_id
  where es.user_id != e.paid_by
),
aggregated as (
  select
    group_id,
    creditor_id,
    debtor_id,
    sum(amount) as total
  from debts
  group by group_id, creditor_id, debtor_id
),
netted as (
  -- Net out: if A owes B 100 and B owes A 40, result is A owes B 60
  select
    a.group_id,
    a.creditor_id,
    a.debtor_id,
    a.total - coalesce(b.total, 0) as net_amount
  from aggregated a
  left join aggregated b
    on a.group_id = b.group_id
    and a.creditor_id = b.debtor_id
    and a.debtor_id = b.creditor_id
)
select group_id, creditor_id, debtor_id, net_amount
from netted
where net_amount > 0;

-- ============================================================
-- 9. TENANT_SUMMARY FUNCTION
-- ============================================================

-- Returns total_you_owe and total_owed_to_you for a user across
-- all groups in a tenant.

create or replace function public.tenant_summary(p_tenant_id uuid, p_user_id uuid)
returns table(total_you_owe numeric, total_owed_to_you numeric)
language sql stable
as $$
  select
    coalesce(sum(case when gb.debtor_id = p_user_id then gb.net_amount end), 0) as total_you_owe,
    coalesce(sum(case when gb.creditor_id = p_user_id then gb.net_amount end), 0) as total_owed_to_you
  from public.group_balances gb
  join public.groups g on g.id = gb.group_id
  where g.tenant_id = p_tenant_id;
$$;

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;

-- Helper: check if current user is a tenant owner
create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- Helper: check if current user is a member of a tenant
create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = p_tenant_id
      and user_id = auth.uid()
  );
$$;

-- Helper: get tenant_id for a group
create or replace function public.get_group_tenant(p_group_id uuid)
returns uuid
language sql stable security definer
as $$
  select tenant_id from public.groups where id = p_group_id;
$$;

-- ── PROFILES ──
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- ── TENANTS ──
create policy "tenants_select" on public.tenants
  for select to authenticated
  using (created_by = auth.uid() or public.is_tenant_member(id));

create policy "tenants_insert" on public.tenants
  for insert to authenticated
  with check (created_by = auth.uid());

-- ── TENANT_MEMBERS ──
create policy "tenant_members_select" on public.tenant_members
  for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "tenant_members_insert" on public.tenant_members
  for insert to authenticated
  with check (public.is_tenant_owner(tenant_id) or user_id = auth.uid());

create policy "tenant_members_delete" on public.tenant_members
  for delete to authenticated
  using (public.is_tenant_owner(tenant_id));

-- ── GROUPS ──
create policy "groups_select" on public.groups
  for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "groups_insert" on public.groups
  for insert to authenticated
  with check (public.is_tenant_owner(tenant_id));

create policy "groups_update" on public.groups
  for update to authenticated
  using (public.is_tenant_owner(tenant_id));

create policy "groups_delete" on public.groups
  for delete to authenticated
  using (public.is_tenant_owner(tenant_id));

-- ── GROUP_MEMBERS ──
create policy "group_members_select" on public.group_members
  for select to authenticated
  using (public.is_tenant_member(public.get_group_tenant(group_id)));

create policy "group_members_insert" on public.group_members
  for insert to authenticated
  with check (public.is_tenant_owner(public.get_group_tenant(group_id)));

create policy "group_members_update" on public.group_members
  for update to authenticated
  using (public.is_tenant_owner(public.get_group_tenant(group_id)));

create policy "group_members_delete" on public.group_members
  for delete to authenticated
  using (public.is_tenant_owner(public.get_group_tenant(group_id)));

-- ── EXPENSES ──
create policy "expenses_select" on public.expenses
  for select to authenticated
  using (public.is_tenant_member(public.get_group_tenant(group_id)));

create policy "expenses_insert" on public.expenses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id
        and user_id = auth.uid()
    )
  );

create policy "expenses_update" on public.expenses
  for update to authenticated
  using (
    created_by = auth.uid()
    or public.is_tenant_owner(public.get_group_tenant(group_id))
  );

create policy "expenses_delete" on public.expenses
  for delete to authenticated
  using (
    created_by = auth.uid()
    or public.is_tenant_owner(public.get_group_tenant(group_id))
  );

-- ── EXPENSE_SPLITS ──
create policy "expense_splits_select" on public.expense_splits
  for select to authenticated
  using (
    public.is_tenant_member(
      public.get_group_tenant(
        (select group_id from public.expenses where id = expense_splits.expense_id)
      )
    )
  );

-- Splits are managed by server actions (inserted alongside expenses)
create policy "expense_splits_insert" on public.expense_splits
  for insert to authenticated
  with check (
    exists (
      select 1 from public.group_members gm
      join public.expenses e on e.group_id = gm.group_id
      where e.id = expense_splits.expense_id
        and gm.user_id = auth.uid()
    )
  );

create policy "expense_splits_update" on public.expense_splits
  for update to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (e.created_by = auth.uid() or public.is_tenant_owner(public.get_group_tenant(e.group_id)))
    )
  );

create policy "expense_splits_delete" on public.expense_splits
  for delete to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (e.created_by = auth.uid() or public.is_tenant_owner(public.get_group_tenant(e.group_id)))
    )
  );
