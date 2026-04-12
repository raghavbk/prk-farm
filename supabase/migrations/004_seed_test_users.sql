-- Seed two test users for development.
-- Password for both: password123

-- Create users in auth.users (Supabase auth)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'alice@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"full_name": "Alice Sharma", "display_name": "Alice Sharma", "email": "alice@test.com"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'bob@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"full_name": "Bob Patel", "display_name": "Bob Patel", "email": "bob@test.com"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Create identities (required by Supabase auth)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'alice@test.com',
    'email',
    '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "email": "alice@test.com"}'::jsonb,
    now(),
    now(),
    now()
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bob@test.com',
    'email',
    '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "email": "bob@test.com"}'::jsonb,
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- The profiles trigger should auto-create profiles, but ensure they exist:
INSERT INTO public.profiles (id, display_name, email)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alice Sharma', 'alice@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bob Patel', 'bob@test.com')
ON CONFLICT (id) DO NOTHING;
