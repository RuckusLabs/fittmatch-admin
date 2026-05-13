# FittMatch Admin — Claude Context

## What this is

Internal Next.js 15 admin dashboard for FittMatch moderation and operations. Read/writes to the same Supabase project as the mobile app. No new database tables — schema is owned by the mobile repo.

## Key conventions

- All data fetching is server-side (server components + `createServiceClient()`)
- Filters are URL searchParams — no client state for filtering/pagination
- Server actions in `lib/actions.ts` always end with `logAudit()` + `revalidatePath()`
- `'use client'` only where necessary: Sidebar (usePathname), Header (usePathname + signout), ResolutionPanel, BanPanel, GrantAdminPanel, LoginPage, and `/users/new` page
- shadcn UI components live in `components/ui/` — installed via `npx shadcn@latest add`, never hand-written
- `lib/utils.ts` (`cn`) is hand-written; everything else in `lib/` is hand-written too
- `.returns<T>()` on Supabase query builders must come LAST — placing it before filter methods (`.eq`, `.ilike`, etc.) strips them from the type and causes build errors

## Auth flow

- Middleware (`middleware.ts`) guards all routes except `/login` and `/auth/callback`
- Uses anon key SSR client for `auth.getUser()`, service role client for `admin_users` lookup
- Magic link → `/auth/callback` → exchanges code → redirects to `/`
- `x-admin-role` header injected by middleware, read by root layout to show/hide sidebar

## Server actions (`lib/actions.ts`)

| Action | What it does |
|--------|-------------|
| `createUser(email, fullName, role, extras?)` | Creates auth user via `auth.admin.createUser`, inserts `profiles` + `coach_profiles`/`client_profiles`, rolls back on failure |
| `banUser(userId, reason)` | Sets `profiles.is_banned = true` + ban fields |
| `unbanUser(userId)` | Clears ban fields |
| `grantAdminRole(userId, role)` | Upserts `admin_users` row |
| `revokeAdminRole(userId)` | Deletes from `admin_users` |
| `resolveReport(reportId, action, notes)` | Updates report status; auto-bans if action = `user_banned` |
| `removeListing(listingId)` | Sets `job_listings.status = 'removed'` |
| `markReportsAsReviewing(ids[])` | Bulk status update |
| `logAudit(action, targetType, targetId, metadata?)` | Inserts `admin_audit_log` row — called at the end of every mutating action |

## Supabase schema notes (from mobile repo types)

- `reports.reported_id` = reported user, `reported_listing_id` = listing, `reported_message_id` = message
- `profiles.role` only accepts `'coach'` or `'client'` (check constraint) — admin status is in `admin_users` table
- `admin_users.user_id` FK points to `profiles.id` — a `profiles` row must exist before inserting into `admin_users`
- `job_listings.client_id` → `client_profiles.id` (not `profiles.id`)
- `admin_audit_log.admin_id` → `profiles.id`
- `coach_profiles` and `client_profiles` only require `id` in their Insert types; all other fields are optional

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL       — public, used client + server
NEXT_PUBLIC_SUPABASE_ANON_KEY  — public, used for auth cookie handling
SUPABASE_SERVICE_ROLE_KEY      — server only, never expose to browser
```

## Running locally

```bash
npm install
npx shadcn@latest init && npx shadcn@latest add table badge dialog select tabs card button textarea input avatar separator
npm run dev
```

## TypeScript gotchas

- `params` and `searchParams` are Promises in Next.js 15 — always `await` them in server components
- `useSearchParams()` requires a `<Suspense>` boundary in client components — wrap the consuming component and export a shell that wraps it
- Supabase SSR `setAll` cookie callback needs an explicit type annotation or TypeScript strict mode will error on the implicit `any` parameter

## Deploying

Vercel. After deploy, add the domain to Supabase → Authentication → Redirect URLs.
