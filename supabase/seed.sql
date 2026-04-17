-- Preview branch seed data
-- Runs on: Supabase branch creation (PR opened) and `supabase db reset` locally.
-- Login: demo1234 for all three users.

create extension if not exists pgcrypto;

-- ============================================================
-- Users (auth.users insert triggers handle_new_user → profiles)
-- ============================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'raghav@preview.test',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Raghav"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'priya@preview.test',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Priya"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated',
    'arjun@preview.test',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Arjun"}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

-- ============================================================
-- Tenant (farm) + memberships
-- ============================================================

insert into public.tenants (id, name, created_by) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Preview Farm',
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

insert into public.tenant_members (tenant_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member')
on conflict do nothing;

-- ============================================================
-- Groups + members (ownership must sum to 100, enforced by trigger)
-- ============================================================

insert into public.groups (id, tenant_id, name, created_by) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'South Plot',
   '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Orchard',
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

-- South Plot: Raghav 60 / Priya 40
insert into public.group_members (group_id, user_id, ownership_pct) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 60),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 40)
on conflict do nothing;

-- Orchard: Raghav 33 / Priya 33 / Arjun 34
insert into public.group_members (group_id, user_id, ownership_pct) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 33),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 33),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 34)
on conflict do nothing;

-- ============================================================
-- Expenses + splits
-- share_amount = amount * share_pct / 100 (snapshotted at creation time)
-- ============================================================

-- South Plot: Seeds (Raghav paid ₹12,000)
insert into public.expenses (id, group_id, description, amount, date, paid_by, created_by) values
  ('e1111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Seeds (Monsoon batch)', 12000, '2026-03-15',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, user_id, share_pct, share_amount) values
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 60, 7200.00),
  ('e1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 40, 4800.00);

-- South Plot: Irrigation repair (Priya paid ₹8,500)
insert into public.expenses (id, group_id, description, amount, date, paid_by, created_by) values
  ('e2222222-2222-2222-2222-222222222222',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Irrigation pump repair', 8500, '2026-03-22',
   '22222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, user_id, share_pct, share_amount) values
  ('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 60, 5100.00),
  ('e2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 40, 3400.00);

-- Orchard: Fertilizer (Raghav paid ₹18,000)
insert into public.expenses (id, group_id, description, amount, date, paid_by, created_by) values
  ('e3333333-3333-3333-3333-333333333333',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Organic fertilizer (NPK)', 18000, '2026-03-28',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, user_id, share_pct, share_amount) values
  ('e3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 33, 5940.00),
  ('e3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 33, 5940.00),
  ('e3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 34, 6120.00);

-- Orchard: Harvest labor (Arjun paid ₹24,000)
insert into public.expenses (id, group_id, description, amount, date, paid_by, created_by) values
  ('e4444444-4444-4444-4444-444444444444',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Harvest labor (12 workers, 3 days)', 24000, '2026-04-05',
   '33333333-3333-3333-3333-333333333333',
   '33333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, user_id, share_pct, share_amount) values
  ('e4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 33, 7920.00),
  ('e4444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 33, 7920.00),
  ('e4444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 34, 8160.00);

-- Orchard: Ladders (Priya paid ₹4,500)
insert into public.expenses (id, group_id, description, amount, date, paid_by, created_by) values
  ('e5555555-5555-5555-5555-555555555555',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Fruit picker ladders', 4500, '2026-04-10',
   '22222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, user_id, share_pct, share_amount) values
  ('e5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 33, 1485.00),
  ('e5555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 33, 1485.00),
  ('e5555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 34, 1530.00);

-- Orchard: Sapling replacement (Raghav paid ₹9,800)
insert into public.expenses (id, group_id, description, amount, date, paid_by, created_by) values
  ('e6666666-6666-6666-6666-666666666666',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Mango sapling replacement', 9800, '2026-04-14',
   '11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.expense_splits (expense_id, user_id, share_pct, share_amount) values
  ('e6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 33, 3234.00),
  ('e6666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 33, 3234.00),
  ('e6666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 34, 3332.00);
