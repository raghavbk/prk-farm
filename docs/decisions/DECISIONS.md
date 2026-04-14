# Farm Share Ledger — Decision Records

Decisions made during the build of this project, with context and rationale. These capture the "why" behind choices that aren't obvious from reading the code alone.

---

## DR-001: Next.js App Router + Supabase + Tailwind

**Decision:** Use Next.js 16 (App Router), Supabase (PostgreSQL + Auth + RLS), and Tailwind CSS v4.

**Context:** The PRD specified this stack. App Router gives us Server Components for data fetching, Server Actions for mutations, and route groups for auth protection. Supabase provides PostgreSQL with Row-Level Security — the security model lives in the database, not the application layer.

**Alternatives considered:** None — stack was predetermined by the PRD.

---

## DR-002: Row-Level Security as the primary access control

**Decision:** All authorization is enforced by PostgreSQL RLS policies. Server Actions perform additional checks as a UX layer, but RLS is the source of truth.

**Context:** With Supabase, every query from the browser or server component carries the user's JWT. RLS policies on every table ensure that even if a server action has a bug, users cannot see or modify data outside their tenant.

**Key detail:** Helper functions (`is_tenant_owner`, `is_tenant_member`, `get_group_tenant`) use `SECURITY DEFINER` to avoid circular RLS evaluation — they need to read `tenant_members` which itself has RLS.

---

## DR-003: Deferred constraint trigger for ownership sum = 100

**Decision:** Use a `CONSTRAINT TRIGGER` with `DEFERRABLE INITIALLY DEFERRED` on `group_members` to validate that ownership percentages sum to 100.

**Context:** A regular `CHECK` constraint can only see the current row, not the whole group. A trigger that fires `AFTER EACH ROW` would reject batch inserts (e.g., creating a group with 3 members, the first insert would fail because the sum is only 33%). A deferred constraint trigger validates at commit time, after all rows are inserted.

**Consequence:** Deleting group members also triggers this — if you delete one member from a 3-person group, the trigger fires and rejects because the remaining two don't sum to 100. Operations that modify membership must either be wrapped in a transaction or the trigger must be temporarily disabled.

---

## DR-004: Expense splits snapshot ownership at creation time

**Decision:** When an expense is created, the current `group_members.ownership_pct` values are copied into `expense_splits.share_pct`. When ownership changes later, existing splits are never modified.

**Context:** The PRD explicitly requires historical accuracy — if ownership changes from 60/40 to 50/50, old expenses should still reflect the 60/40 split that was active when they were incurred. This makes the ledger auditable.

**Consequence:** When editing an expense amount, `editExpense` recalculates `share_amount` using the *stored* `share_pct` from `expense_splits`, not the current group ownership.

---

## DR-005: Balances computed entirely in PostgreSQL

**Decision:** The `group_balances` view and `tenant_summary` function compute all who-owes-whom calculations in SQL. No balance computation happens in JavaScript.

**Context:** At the PRD's scale (10-50 users, hundreds of expenses), SQL is fast enough and eliminates an entire class of bugs (stale caches, calculation drift). Balances are always derived, never stored.

**Approach:** The view uses CTEs: debts → aggregated → netted. For each pair (A, B), it subtracts what B owes A from what A owes B, returning only positive net amounts. This is pairwise netting only — not full debt simplification (graph-based minimization is deferred to V2).

---

## DR-006: Active tenant stored in HTTP-only cookie

**Decision:** The active tenant ID is stored in an HTTP-only cookie, read by server components and middleware.

**Context:** The active tenant scopes all data queries. An HTTP-only cookie can't be read by client-side JS (preventing XSS from changing it). RLS provides the safety net: even if the cookie value is tampered with, the user can only see tenants they belong to.

**Alternative considered:** React context / client state. Rejected because Server Components need to read the tenant ID on the server, and passing it through props would require a client boundary at the root.

---

## DR-007: Email/password auth with invite-only access

**Decision:** Replace Google OAuth with email/password auth. No public signup — all users are invited by an admin.

**Context:** Initially built with Google OAuth per PRD. Changed because the user wanted username/password auth. Later evolved to invite-only because this is a private circle of friends, not a public app. Google OAuth adds unnecessary complexity for 10-50 users.

**Evolution:**
1. Google OAuth → email/password with public signup
2. Public signup → invite-only (admin invites by email)
3. Hardcoded seed admin → self-service onboarding (first visitor becomes admin)

---

## DR-008: Admin onboarding replaces seed scripts

**Decision:** The first person to visit a fresh installation gets a setup page where they create their admin account and first farm. No seed scripts or hardcoded credentials.

**Context:** We tried several approaches to bootstrap the first user:
1. SQL migrations inserting into `auth.users` — failed because Supabase's `auth.users` requires passwords hashed by GoTrue, not by `pgcrypto.crypt()`
2. TypeScript seed script using `supabase.auth.admin.createUser()` — worked but required manual CLI execution and environment variable setup
3. Admin onboarding page — zero-config, self-service, no credentials to share

**How it works:** `/setup` checks if any profiles exist. If zero, it shows the setup form. The action creates the user via the Supabase admin API (service role key), creates the first tenant, signs them in, and sets the active tenant cookie. After the first user exists, `/setup` permanently redirects to `/login`.

---

## DR-009: Invite flow uses Supabase admin API + email

**Decision:** When an admin invites a new email, Supabase sends an invite email via `inviteUserByEmail()`. The invited user clicks the link, lands on `/auth/callback`, and is redirected to `/auth/set-password` to set their password.

**Context:** `inviteUserByEmail()` handles the full invite lifecycle: creates the user, sends the email, generates the invite token. The callback route exchanges the token for a session. The set-password page lets the user choose their password.

**For existing users:** If the invited email already has an account, they're added to the tenant immediately — no email sent.

---

## DR-010: Equal split option alongside ownership-based splits

**Decision:** When adding an expense, users can choose "By ownership %" or "Split equally". Both methods snapshot the split percentages into `expense_splits.share_pct`.

**Context:** The PRD only specified ownership-based splits. During development, the user requested equal splits for expenses that should be divided evenly regardless of ownership (e.g., a shared meal, utility bill).

**Implementation:** For equal splits, `share_pct` is set to `100 / N` where N is the member count. The existing `share_pct` column stores whatever was used at creation time, so `editExpense` works identically for both methods.

---

## DR-011: CRED-inspired dark premium UI

**Decision:** The app uses a premium dark theme inspired by CRED (Indian fintech app) — near-black base (#050506), warm gold primary (#d4a853), Sora font for headings, DM Sans for body.

**Context:** Went through several design iterations:
1. Generic gray Tailwind UI (too bland)
2. Organic/earthy palette with Fraunces serif font (too muted)
3. Vibrant fintech with indigo primary (still generic)
4. CRED-style dark with warm gold accent (approved)

**Key design tokens:**
- Surface: `#050506` → `#0c0c0f` → `#111114` → `#151518` (4-level depth)
- Cards: 20px border radius, 1px `#1c1c22` border
- Typography: Sora 800/700/600 with -0.02em tracking
- Color accents: gold (primary), emerald (success), rose (danger), amber (warning)

---

## DR-012: React 19 ViewTransition API for page transitions

**Decision:** Use React 19's native `<ViewTransition>` component for page transitions instead of Framer Motion or other libraries.

**Context:** Zero dependency cost — `<ViewTransition>` is built into React 19 and uses the browser's View Transition API. Next.js 16's `experimental.viewTransition` flag wraps `<Link>` navigations automatically.

**Patterns used:**
- Directional slides (`nav-forward` / `nav-back`) for hierarchical navigation (groups list → detail → expense)
- Cross-fade for lateral navigation (tenant switching)
- Slide-up reveals for Suspense loading boundaries
- Persistent nav isolation via `viewTransitionName: "site-nav"` (nav stays static during page transitions)
- `default="none"` on every `<ViewTransition>` to prevent unwanted animations on revalidation

---

## DR-013: Responsive layout with fixed 1120px max-width

**Decision:** All pages use `max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10` for consistent responsive spacing.

**Context:** Early iterations used `max-w-lg` (512px) which wasted desktop space, then `max-w-2xl` and `max-w-4xl`. The final 1120px gives comfortable content width on desktop while the responsive padding (`px-5` mobile / `px-8` desktop) prevents overflow on small screens.

**Headers:** All page headers use `flex-col gap-4 sm:flex-row sm:items-end sm:justify-between` — buttons stack below headings on mobile, sit beside them on desktop.

---

## DR-014: Single SQL migration file

**Decision:** Keep one migration file (`001_initial_schema.sql`) containing all tables, triggers, views, functions, and RLS policies.

**Context:** During development, schema fixes were added as separate migrations (002–005). These were consolidated back into 001 during cleanup because:
- The project is greenfield — there's no production database to migrate incrementally
- Separate fix migrations added complexity without value
- A single file is easier to review and understand

**For production:** Future schema changes should be added as new numbered migrations, not by modifying 001.

---

## Current Architecture Summary

```
Browser → Next.js App Router (Vercel)
            ├── Middleware (session refresh + route protection)
            ├── Server Components (data fetching with Supabase client + user JWT)
            ├── Server Actions (mutations: create/edit/delete)
            └── Client Components (forms, interactive UI)
                    ↓
            Supabase (PostgreSQL)
            ├── Row-Level Security (tenant isolation)
            ├── Auth (email/password, invite flow)
            ├── group_balances view (derived balances)
            └── tenant_summary function (aggregated dashboard)
```

**File structure:**
```
src/
├── actions/        # Server Actions (admin, auth, expense, group, setup, tenant)
├── app/
│   ├── (protected)/  # Auth-gated routes (dashboard, groups, admin, tenants)
│   ├── auth/         # Callback, set-password, signout
│   ├── login/        # Login page
│   └── setup/        # One-time admin onboarding
├── components/     # Shared UI (nav, dashboard-summary, group-balances, etc.)
└── lib/            # Utilities (auth, format, tenant, types, supabase clients)
```
