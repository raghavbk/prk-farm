# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm test             # Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright e2e tests (starts dev server automatically)

# Run a single unit test file
npx vitest run src/lib/__tests__/format.test.ts

# Run a single e2e test
npx playwright test tests/e2e/full-flow.spec.ts
```

## Tech Stack

- **Next.js 16** (App Router) with React 19, TypeScript, Tailwind CSS v4
- **Supabase** for PostgreSQL, Auth (email/password, invite-only), and Row-Level Security
- **Vitest** + React Testing Library for unit tests; **Playwright** for e2e
- Path alias: `@/` maps to `src/`

## Architecture

**Farm Share Ledger** — a multi-tenant expense splitting app for shared farm ownership. Users belong to tenants (farms), tenants contain groups, groups have members with ownership percentages, and expenses are split based on those percentages.

### Data flow

Server Components fetch data using `createClient()` (user's JWT via cookies). Server Actions in `src/actions/` handle all mutations. RLS policies in PostgreSQL are the authoritative access control — server-side checks are a UX layer on top. Balances are computed entirely in SQL via the `group_balances` view and `tenant_summary` function; no balance computation in JS.

### Key patterns

- **Multi-tenancy**: Active tenant ID stored in an HTTP-only cookie (`src/lib/tenant.ts`). All data queries are scoped to the active tenant.
- **Auth**: Invite-only. First visitor hits `/setup` to create admin + first farm. Subsequent users are invited via `inviteUserByEmail()` and set their password at `/auth/set-password`.
- **Supabase clients**: Three variants in `src/lib/supabase/` — `server.ts` (Server Components/Actions, user JWT), `client.ts` (browser), `admin.ts` (service role key for admin operations).
- **Ownership constraint**: `group_members.ownership_pct` must sum to 100% per group, enforced by a deferred constraint trigger in PostgreSQL. Batch membership operations work because the trigger fires at commit time.
- **Expense splits snapshot**: When an expense is created, current ownership percentages are copied into `expense_splits.share_pct`. Editing an expense recalculates amounts from stored percentages, not current ownership.
- **Server Actions** use the `(prev, formData)` signature compatible with React 19's `useActionState`.

### Route structure

- `src/app/(protected)/` — auth-gated routes (dashboard, groups, admin, tenants). Layout checks auth + tenant.
- `src/app/auth/` — callback, set-password, signout (public)
- `src/app/login/` and `src/app/setup/` — public entry points

### Database

Single migration: `supabase/migrations/001_initial_schema.sql` contains all tables, triggers, views, functions, and RLS policies. Future schema changes go in new numbered migration files.

RLS helper functions (`is_tenant_owner`, `is_tenant_member`, `get_group_tenant`) use `SECURITY DEFINER` to avoid circular RLS evaluation.

## UI Design

CRED-inspired dark theme. Key tokens:
- Surfaces: `#050506` → `#0c0c0f` → `#111114` → `#151518`
- Primary accent: warm gold `#d4a853`
- Cards: 20px border radius, 1px `#1c1c22` border
- Fonts: Sora (headings), DM Sans (body)
- Currency: INR formatted via `Intl.NumberFormat("en-IN")` in `src/lib/format.ts`

View transitions enabled via React 19 `<ViewTransition>` + `next.config.ts` `experimental.viewTransition`.
