-- Backfill profiles for any auth.users that signed up before the trigger existed.
-- This is idempotent — safe to run multiple times.

INSERT INTO public.profiles (id, display_name, email, avatar_url)
SELECT
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'display_name', 'User'),
  coalesce(u.raw_user_meta_data ->> 'email', u.email),
  u.raw_user_meta_data ->> 'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
