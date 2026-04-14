-- Seed initial admin user
-- Email: admin@farmledger.com
-- Password: admin123

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@farmledger.com',
  extensions.crypt('admin123', extensions.gen_salt('bf')),
  now(),
  '{"full_name": "Farm Admin", "display_name": "Farm Admin", "email": "admin@farmledger.com"}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'admin@farmledger.com',
  'email',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "admin@farmledger.com"}'::jsonb,
  now(), now(), now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Farm Admin', 'admin@farmledger.com')
ON CONFLICT (id) DO NOTHING;
