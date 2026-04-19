-- Tenant-scoped invitations that a user must explicitly accept.
--
-- Before this migration, inviteMember()'s behaviour for an already-confirmed
-- user was to silently insert a tenant_members row. That's not consent —
-- Alice could slap Bob into her tenant without Bob knowing. Replace that
-- with a pending tenant_invites row + a /auth/accept-invite step the user
-- has to complete.

create table public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text not null unique,
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null
);

create index tenant_invites_tenant_created_idx
  on public.tenant_invites (tenant_id, created_at desc);
create index tenant_invites_email_idx
  on public.tenant_invites (lower(email));
-- Only one pending invite per (tenant, email).
create unique index tenant_invites_pending_uniq
  on public.tenant_invites (tenant_id, lower(email))
  where status = 'pending';

alter table public.tenant_invites enable row level security;

-- Tenant members and platform admins can see invites for their tenant. The
-- invitee (before acceptance) can also see *their own* pending invites — we
-- match on email because they haven't been added to tenant_members yet.
create policy tenant_invites_member_read on public.tenant_invites
  for select using (
    public.is_tenant_member(tenant_id)
    or public.is_platform_admin()
    or (
      status = 'pending'
      and expires_at > now()
      and lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );

-- Writes go through server actions (service role). No insert/update/delete
-- policies — RLS denies by default.
