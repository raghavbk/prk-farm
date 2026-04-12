# Farm Share Ledger - PRD

## Problem Statement

A small private circle of friends jointly owns and manages a farm. They regularly incur shared expenses — land development, crop seasons, equipment, utilities — but have no reliable way to track who paid what, how costs should be split, or what the current balances are.

Existing tools like Splitwise assume equal splits and don't support:

- **Unequal ownership structures** where each person owns a different percentage
- **Project/activity groups** to organize expenses by farm activity
- **Tenant-based isolation** if the same people participate in multiple shared ventures
- **Audit-friendly ledgers** where balances are provably derived from entries

The result: disputes, lost receipts, forgotten payments, and an eroding sense of financial trust among friends who share a significant investment.

**Who is affected:** 10-50 farm co-owners and friends in a private circle.

**How often:** Every time a shared expense is incurred (weekly to daily during active farm seasons).

---

## Solution

Farm Share Ledger is a mobile-first, responsive web application that lets a private group of friends:

1. Organize their shared farm into **tenants** (one per ownership circle) and **groups** (one per farm project/activity)
2. Define **ownership percentages** per group member — the percentage determines how expenses are split
3. Log **expenses** with a payer, amount, and date — the system automatically splits the cost by ownership
4. View **who-owes-whom balances** derived in real time from the ledger entries

The experience after shipping: a friend logs in with Google, switches to their farm tenant, opens the relevant group (e.g., "Crop Season 2026"), adds the expense they just paid, and the app instantly shows updated balances for everyone. No manual math. No spreadsheets. One source of truth.

---

## User Stories

### Authentication

1. As a user, I want to sign in with my Google account, so that I can access the app without creating a separate password.
2. As a user, I want to sign out, so that my session is ended on a shared device.
3. As an unauthenticated user visiting any protected page, I want to be redirected to the login screen, so that the app is secure by default.

### Tenant Management

4. As a logged-in user, I want to create a new tenant with a name, so that I can set up a farm ownership circle.
5. As a user who belongs to multiple tenants, I want to see a list of my tenants, so that I can choose which one to work in.
6. As a user, I want to switch my active tenant, so that all screens are scoped to the correct farm.
7. As a user who has no tenants, I want to see an empty state prompting me to create one, so that I know what to do next.

### Group Management

8. As a Tenant Owner, I want to create a group with a name within my tenant, so that I can organize expenses by farm activity (e.g., "Land Development", "Water/Electricity").
9. As a Tenant Owner, I want to add members to a group by searching their email address, so that I can include people who have already signed up.
10. As a Tenant Owner, I want to assign ownership percentages to each group member, so that expenses are split according to real ownership stakes.
11. As a Tenant Owner, I want the system to reject ownership allocations that don't total 100%, so that the split is always valid.
12. As a member, I want to view the group detail page showing members, ownership percentages, and expenses, so that I have full visibility into the group.
13. As a Tenant Owner, I want to edit a group's name and membership, so that I can correct mistakes or reflect changes.

### Expense Management

14. As a group member, I want to add an expense with a description, amount, date, and "paid by" field, so that I can record a payment I made.
15. As a group member, I want the system to automatically split my expense by ownership percentages, so that I don't have to calculate shares manually.
16. As the person who created an expense, I want to edit that expense, so that I can fix mistakes.
17. As the person who created an expense, I want to delete that expense, so that I can remove an incorrect entry.
18. As a Tenant Owner, I want to edit or delete any expense in my tenant, so that I can correct entries on behalf of other members.
19. As a regular group member who did NOT create an expense and is NOT a Tenant Owner, I should not be able to edit or delete it, so that the ledger maintains integrity.
20. As a group member, I want to see a list of all expenses in a group (most recent first), so that I can review the history.
21. As a user adding an expense, if I submit invalid data (missing required fields, negative amount), I want to see clear validation errors, so that I can correct my input.

### Balances

22. As a group member, I want to see group-level balances showing who owes whom, so that I know my current obligations.
23. As a group member, I want balances to update immediately after an expense is added, edited, or deleted, so that I always see the current state.
24. As a group with no expenses, I want to see an empty state ("No expenses yet"), so that I understand the group is clean, not broken.

### Dashboard

25. As a user, I want to see a dashboard scoped to my active tenant showing total I owe, total owed to me, recent expenses, and my groups, so that I get a quick overview.
26. As a user with no groups or expenses, I want the dashboard to show helpful empty states with prompts to create a group, so that I know how to get started.

### Edge Cases

27. As a Tenant Owner updating ownership percentages, I expect all existing expenses to keep their original splits, so that the historical ledger remains accurate and trustworthy.
28. As a Tenant Owner updating ownership percentages, I expect only new expenses to use the updated percentages, so that changes are forward-looking.
29. As a user who is the only member of a group, I want to still be able to add expenses (100% ownership), so that solo tracking is possible.
30. As a user searching for a member by email, if no account exists for that email, I want to see a clear "no user found" message, so that I know they need to sign up first.

---

## Implementation Decisions

### Modules

#### 1. Auth

- **Purpose** — Google OAuth login, session management, route protection
- **Interface** — `signIn()`, `signOut()`, `getCurrentUser() -> User | null`
- **Hides** — Supabase Auth Google provider flow, JWT token refresh, Next.js middleware that redirects unauthenticated users, session cookie management

#### 2. Tenant

- **Purpose** — Tenant lifecycle and active tenant context
- **Interface** — `createTenant(name) -> Tenant`, `listMyTenants() -> Tenant[]`, `switchTenant(tenantId)`, `getActiveTenant() -> Tenant | null`
- **Hides** — Row-Level Security (RLS) policy enforcement, tenant membership records, active tenant persistence (cookie or local storage), tenant context propagation to all data queries

#### 3. Group & Ownership

- **Purpose** — Group CRUD and ownership percentage management as a single unit
- **Interface** — `createGroup(tenantId, name, members[{userId, ownershipPct}])`, `updateGroup(groupId, changes)`, `setOwnership(groupId, allocations[{userId, pct}])`, `getGroupDetail(groupId) -> Group with members, ownership, expenses`
- **Hides** — 100% ownership validation (reject if sum != 100), member-ownership association, email-based user lookup for member addition. Ownership changes are forward-looking only — existing expense splits are never modified

#### 4. Expense Engine

- **Purpose** — Expense CRUD with automatic ownership-based split computation
- **Interface** — `addExpense(groupId, {description, amount, date, paidBy}) -> Expense`, `editExpense(expenseId, changes) -> Expense`, `deleteExpense(expenseId)`, `listExpenses(groupId) -> Expense[]`
- **Hides** — Split calculation based on current ownership percentages at time of expense creation, authorization checks (creator or Tenant Owner can edit/delete), split record creation/update/deletion, input validation

#### 5. Balance Calculator

- **Purpose** — Compute who-owes-whom from expense entries, with no stored state
- **Interface** — `getGroupBalances(groupId) -> {member, owes, owedBy, net}[]`, `getTenantSummary(tenantId, userId) -> {totalYouOwe, totalOwedToYou}`
- **Hides** — Pairwise net debt computation, debt simplification (minimize number of transfers needed), aggregation across groups for tenant-level dashboard summary. Implemented as PostgreSQL functions/views in Supabase — balances are always derived, never stored

#### 6. Dashboard

- **Purpose** — Active tenant summary for the home screen
- **Interface** — `getDashboard(tenantId, userId) -> {summary, recentExpenses, groups}`
- **Hides** — Aggregation of balance calculator results, recent activity queries, group summaries, empty state detection — all scoped to active tenant via RLS

### Architecture

```
Browser (Next.js App Router)
  |
  |-- Supabase Auth (Google OAuth)
  |-- Next.js Middleware (route protection)
  |
  |-- Server Components / Server Actions
  |     |-- Supabase Client (with RLS via user JWT)
  |     |-- Tenant context (from cookie/header)
  |     |
  |     |-- Tables: tenants, tenant_members, groups,
  |     |           group_members, expenses, expense_splits
  |     |
  |     |-- Views/Functions: group_balances, tenant_summary
  |
  |-- Client Components (forms, interactive UI)
        |-- Optimistic updates for expense add/edit
```

**Data flow:**
- All database queries go through Supabase client with the user's JWT, so RLS policies enforce tenant isolation automatically
- Server Actions handle mutations (create/edit/delete) and revalidate relevant pages
- Balance computation happens entirely in PostgreSQL — the app never calculates balances in JavaScript
- Active tenant is stored in a cookie, read by server components and middleware

### Schema Changes

This is a greenfield project. All tables are new.

#### `users`
Managed by Supabase Auth. Extended with a `profiles` table:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users |
| display_name | text | From Google profile |
| email | text | From Google profile |
| avatar_url | text | From Google profile |
| created_at | timestamptz | |

#### `tenants`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | Tenant display name |
| created_by | uuid | FK to profiles.id (Tenant Owner) |
| created_at | timestamptz | |

#### `tenant_members`

| Column | Type | Notes |
|--------|------|-------|
| tenant_id | uuid | FK to tenants.id |
| user_id | uuid | FK to profiles.id |
| role | text | 'owner' or 'member' |
| joined_at | timestamptz | |
| PK | | (tenant_id, user_id) |

#### `groups`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK to tenants.id |
| name | text | Group display name |
| created_by | uuid | FK to profiles.id |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `group_members`

| Column | Type | Notes |
|--------|------|-------|
| group_id | uuid | FK to groups.id |
| user_id | uuid | FK to profiles.id |
| ownership_pct | numeric(5,2) | e.g., 33.33 |
| PK | | (group_id, user_id) |

**Constraint:** A database-level CHECK or trigger ensures `SUM(ownership_pct)` for a group = 100.00.

#### `expenses`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| group_id | uuid | FK to groups.id |
| description | text | |
| amount | numeric(12,2) | In INR |
| date | date | When the expense occurred |
| paid_by | uuid | FK to profiles.id |
| created_by | uuid | FK to profiles.id (for auth checks) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `expense_splits`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| expense_id | uuid | FK to expenses.id (CASCADE DELETE) |
| user_id | uuid | FK to profiles.id |
| share_pct | numeric(5,2) | Ownership % at time of split |
| share_amount | numeric(12,2) | Computed: expense.amount * share_pct / 100 |

#### `group_balances` (PostgreSQL View)

A derived view that computes net balances per group:

```sql
-- For each pair (creditor, debtor) in a group:
-- net_amount = SUM(what debtor owes creditor) - SUM(what creditor owes debtor)
-- Positive net_amount means debtor owes creditor
```

#### `tenant_summary` (PostgreSQL Function)

An RPC function that aggregates group balances across all groups in a tenant for a given user, returning `total_you_owe` and `total_owed_to_you`.

### API Contracts

All mutations are implemented as Next.js Server Actions. Reads use Server Components with direct Supabase queries.

#### Server Actions

**`createTenant(name: string)`**
- Returns: `{ tenant: Tenant }` or `{ error: string }`
- Creates tenant + adds current user as owner in `tenant_members`

**`createGroup(tenantId: string, name: string, members: {email: string, ownershipPct: number}[])`**
- Returns: `{ group: Group }` or `{ error: string }`
- Validates: ownership sums to 100, all emails resolve to existing users, user is Tenant Owner
- Creates group + group_members rows

**`updateGroup(groupId: string, changes: {name?: string})`**
- Returns: `{ group: Group }` or `{ error: string }`
- Validates: user is Tenant Owner

**`setOwnership(groupId: string, allocations: {userId: string, pct: number}[])`**
- Returns: `{ success: boolean }` or `{ error: string }`
- Validates: sums to 100, user is Tenant Owner
- Note: existing expense splits are preserved — only future expenses use the new percentages

**`addExpense(groupId: string, data: {description: string, amount: number, date: string, paidBy: string})`**
- Returns: `{ expense: Expense }` or `{ error: string }`
- Creates expense + expense_splits based on current ownership percentages

**`editExpense(expenseId: string, changes: {description?: string, amount?: number, date?: string, paidBy?: string})`**
- Returns: `{ expense: Expense }` or `{ error: string }`
- Validates: current user is the creator OR a Tenant Owner
- If amount changes: recalculates expense_splits

**`deleteExpense(expenseId: string)`**
- Returns: `{ success: boolean }` or `{ error: string }`
- Validates: current user is the creator OR a Tenant Owner
- CASCADE deletes expense_splits

---

## Testing Decisions

### Test Quality Criteria

- Tests verify behavior through public module interfaces (Server Actions, component renders, SQL views)
- Tests survive internal refactoring (no testing private functions or implementation details)
- Each test describes one observable behavior with a clear name

### Module Coverage

- **Auth:** Verify that unauthenticated users are redirected to login. Verify that authenticated users can access protected pages. Verify that sign-out clears the session.
- **Tenant:** Verify that creating a tenant adds the creator as owner. Verify that users only see tenants they belong to (RLS). Verify that switching tenant updates the active context.
- **Group & Ownership:** Verify that ownership allocations not summing to 100 are rejected. Verify that group creation with valid members and ownership succeeds. Verify that updating ownership does NOT modify existing expense splits. Verify that new expenses after an ownership change use the updated percentages.
- **Expense Engine:** Verify that adding an expense creates correct splits based on ownership. Verify that the expense creator can edit/delete. Verify that a Tenant Owner can edit/delete any expense. Verify that a regular member cannot edit/delete another member's expense. Verify that editing an amount recalculates splits. Verify that deleting an expense removes its splits.
- **Balance Calculator:** Verify that a single expense produces correct pairwise balances. Verify that multiple expenses net out correctly. Verify that a group with no expenses returns zero balances. Verify that tenant summary aggregates across groups.
- **Dashboard:** Verify that dashboard data is scoped to the active tenant. Verify that empty states render when there are no groups or expenses.

### Precedents

This is a greenfield project — no existing test files. Recommended patterns:
- Use Vitest for unit/integration tests
- Use React Testing Library for component tests
- Use Supabase local dev (via Docker) for database integration tests against real RLS policies
- Use Playwright for critical end-to-end flows (login, add expense, view balance)

---

## Out of Scope

These are explicitly excluded from MVP and are addressed in later releases (V1, V2) as described in the product roadmap:

- Income tracking (V2)
- Loans and settlements (V2)
- Personal ledger entries (V2)
- Multiple split methods — equal, exact, shares, custom (V2)
- Attachments and receipt uploads (V2)
- Notifications (V2)
- Audit trail and audit log UI (V2)
- Soft delete / restore (V1)
- Placeholder users and invite flows (V1)
- Friend management page (V1)
- Group archiving (V1)
- Admin area and admin UI (V1)
- Public signup / self-serve onboarding
- Payment gateway integration
- Advanced analytics
- OCR for receipts
- Multi-currency
- Multi-timezone
- Recurring expenses
- Offline sync
- Data exports

---

## Further Notes

### Ownership History

MVP preserves historical ownership from day one — when ownership percentages change, existing expense splits are never modified. The `expense_splits.share_pct` column records the ownership percentage that was active at the time of each expense, making the ledger fully auditable. Only new expenses use the updated percentages.

### Currency

All monetary amounts are in **INR (₹)**. Displayed with Indian number formatting (e.g., ₹1,23,456.00).

### Scale Assumptions

- 10-50 users per tenant
- Hundreds to low thousands of expenses per group
- Derived balance computation (SQL views/functions) is appropriate at this scale
- No caching layer needed for MVP

### Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) |
| UI | Mobile-first responsive design |
| Backend | Next.js Server Actions + Server Components |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) |
| Security | Supabase Row-Level Security (RLS) |
| Hosting | Vercel |
| Currency | INR (₹) |

### Release Roadmap Reference

This PRD covers **MVP** only. See the full product specification for V1 and V2 roadmaps, which extend the product with:
- **V1:** Friends management, soft delete, group archiving, admin UI shell, tenant admin overrides
- **V2:** Income/loans/settlements, multiple split methods, attachments, notifications, ownership history preservation
