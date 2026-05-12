# FittMatch Admin — Claude Context

## What this is

Internal Next.js 15 admin dashboard for FittMatch moderation and operations. Read/writes to the same Supabase project as the mobile app. No new database tables — schema is owned by the mobile repo.

## Key conventions

- All data fetching is server-side (server components + `createServiceClient()`)
- Filters are URL searchParams — no client state for filtering/pagination
- Server actions in `lib/actions.ts` always end with `logAudit()` + `revalidatePath()`
- `'use client'` only where necessary: Sidebar (usePathname), Header (usePathname + signout), ResolutionPanel, BanPanel, LoginPage
- shadcn UI components live in `components/ui/` — installed via `npx shadcn@latest add`, never hand-written
- `lib/utils.ts` (`cn`) is hand-written; everything else in `lib/` is hand-written too

## Auth flow

- Middleware (`middleware.ts`) guards all routes except `/login` and `/auth/callback`
- Uses anon key SSR client for `auth.getUser()`, service role client for `admin_users` lookup
- Magic link → `/auth/callback` → exchanges code → redirects to `/`
- `x-admin-role` header injected by middleware, read by root layout to show/hide sidebar

## Supabase schema notes (from mobile repo types)

- `reports.reported_id` = reported user, `reported_listing_id` = listing, `reported_message_id` = message
- `profiles.role` only accepts `'coach'` or `'client'` (check constraint) — admin status is in `admin_users` table
- `job_listings.client_id` → `client_profiles.id` (not `profiles.id`)
- `admin_audit_log.admin_id` → `profiles.id`

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

## Deploying

Vercel. After deploy, add the domain to Supabase → Authentication → Redirect URLs.
