-- Give every tenant a URL-safe slug so we can auto-generate default
-- subdomains (<slug>.chukta.in) and reference the tenant in short URLs.
-- Backfills existing tenants from their display name.

alter table public.tenants add column slug text;

-- Backfill: lowercase, replace any non-alphanumeric run with a single hyphen,
-- trim leading/trailing hyphens. Keeps it safe as a DNS label.
update public.tenants
set slug = trim(both '-' from
              lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
            );

-- Collisions in the backfill are unlikely (few rows), but disambiguate by
-- appending the first 4 chars of the uuid where needed.
update public.tenants t
set slug = t.slug || '-' || substring(replace(t.id::text, '-', '') from 1 for 4)
where exists (
  select 1 from public.tenants t2
  where t2.slug = t.slug and t2.id <> t.id
);

alter table public.tenants alter column slug set not null;
alter table public.tenants add constraint tenants_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40);
alter table public.tenants add constraint tenants_slug_unique unique (slug);
create index tenants_slug_lower_idx on public.tenants (lower(slug));
