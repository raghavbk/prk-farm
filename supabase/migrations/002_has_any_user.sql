-- Bootstrap check: "is this a fresh install?"
-- Callable by anon so login/setup pages can route correctly before any user logs in.
-- SECURITY DEFINER bypasses the profiles_select RLS policy (which only grants authenticated)
-- while leaking only a single boolean — no row data.

create or replace function public.has_any_user()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles);
$$;

grant execute on function public.has_any_user() to anon, authenticated;
