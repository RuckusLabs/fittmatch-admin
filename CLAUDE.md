# FittMatch Admin — Claude Context

## What this is

Internal Next.js 15 admin dashboard for FittMatch moderation and operations. Read/writes to the same Supabase project as the mobile app. No new database tables — schema is owned by the mobile repo.

## Key conventions

- All data fetching is server-side (server components + `createServiceClient()`)
- Filters are URL searchParams — no client state for filtering/pagination
- Pagination pattern: `{ count: 'exact' }` in `.select()`, `.range(offset, offset + PAGE_SIZE - 1)` (must come before `.returns<T>()`), `?page=` searchParam, and a `buildUrl(newPage)` helper that preserves all other active searchParams. PAGE_SIZE = 50 across all paginated pages (users, listings, audit-log).
- Server actions in `lib/actions.ts` are public POST endpoints: every exported action must start with `const adminId = await requireAdmin(ADMIN_ONLY | MODERATORS | ANY_ADMIN)` and end with `logAudit(adminId, …)` + `revalidatePath()`. Never export helpers from that file
- `'use client'` only where necessary: Sidebar (usePathname), Header (usePathname + signout), ResolutionPanel, BanPanel, GrantAdminPanel, ChangeRolePanel, DeleteUserPanel, MatchesPanel, BlocksPanel, PhotoGallery, ReasonFilter, SetProfileCompleteButton, EditListingForm, CreateListingForm, EditProfileForm, LoginPage, and `/users/new` page
- **Theme = the mobile app's.** `app/globals.css` sets the shadcn tokens to FittMatch colours (paper background, ink text, `#C8472A` accent as `primary`), and `tailwind.config.ts` remaps the stock palettes (`gray`/`slate` → warm neutrals, `green`, `red`, `blue`, `amber`/`yellow` → gold, `orange` → accent) so plain Tailwind classes stay on-brand. Fonts: Outfit (body) and Playfair Display (`font-serif`, h1/h2) via `next/font`. Use Lucide icons — no emoji or text glyphs as icons
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
| `resolveReport(reportId, action, notes, status='resolved' \| 'dismissed')` | Resolves or dismisses; `user_banned` bans, `content_removed` removes the reported listing/message |
| `updateListing(listingId, data)` | Updates title, description, status, pay, role_type, boosted_until |
| `createListing(data)` | Inserts a new `job_listings` row; `client_id` must be a `client_profiles.id` |
| `updateCoachProfile(userId, data)` | Updates `coach_profiles` fields: title, bio, specialties, certs, experience_band; also writes `open_to_offers` to `profiles` if provided |
| `updateClientProfile(userId, data)` | Updates `client_profiles` fields: company_name, company_type, bio, website, team_size_band |
| `removeListing(listingId)` | Sets `job_listings.status = 'removed'` |
| `markReportsAsReviewing(ids[])` | Bulk status update |
| `changeUserRole(userId, newRole)` | Flips `profiles.role`; upserts missing coach/client profile row (`ignoreDuplicates: true`); logs audit |
| `deleteUser(userId, email)` | `auth.admin.deleteUser` (FK cascades clean up; reports/audit keep history with nulls); audits after success |
| `deleteMatch(matchId, userId)` | Deletes match row (cascade removes messages); logs audit |
| `restoreMatch(matchId)` | Unmatched/blocked only → `status = 'active'` and deletes the pair's block rows |
| `removeBlock(blockerId, blockedId)` | Deletes row from `blocks`; logs audit as `remove_block` |
| `setProfileComplete(userId, role, value)` | Updates `is_complete` on `coach_profiles` or `client_profiles`; logs audit as `update_profile` |
| `giftPro(userId, days)` / `revokePro(userId)` | Role tier (`coach_pro`/`client_pro`); won't touch paid RevenueCat subs; revoke = `canceled` + `free` |
| `resetDailySwipes` / `resetSuperLikes` | Clears today's `usage_counters` / this month's `super_like_usage` |
| `removeMessageMedia(messageId)` | Deletes the `chat-media` object + clears `messages.image_url` |
| `endCoachBoost(userId)` | Clears `coach_profiles.boosted_until` |
| `logAudit(adminId, action, targetType, targetId, metadata?)` | Private helper (not exported) |

## Supabase schema notes (from mobile repo types)

- `reports.reported_id` = reported user, `reported_listing_id` = listing, `reported_message_id` = message
- `profiles.role` only accepts `'coach'` or `'client'` (check constraint) — admin status is in `admin_users` table
- `admin_users.user_id` FK points to `profiles.id` — a `profiles` row must exist before inserting into `admin_users`
- `job_listings.client_id` → `client_profiles.id` (not `profiles.id`)
- `admin_audit_log.admin_id` → `profiles.id`
- `coach_profiles` and `client_profiles` only require `id` in their Insert types; all other fields are optional
- `coach_profiles.photos` and `client_profiles.photos` are JSONB arrays (`[{ url: string, caption: string }]`) added by the mobile repo — not yet in `types/database.ts`, cast via `(row as any).photos`
- `coach_profiles.certs` is a `text[]` column — cast via `(row as any).certs`
- `types/database.ts` is stale vs the mobile repo's migrations (missing `boosted_until`, `messages.image_url`, `super_like_usage`, …) — regenerate with `supabase gen types typescript --linked` from the mobile repo rather than adding more `as any`
- `profiles.open_to_offers` is a boolean (default `true`) — write it via the `profiles` table, not `coach_profiles`
- `blocks` table: `blocker_id`, `blocked_id`, `created_at` — join to profiles with `!blocker_id` / `!blocked_id` hint syntax in Supabase select
- `matches.status` is NOT NULL: `active | pending | expired | archived | unmatched | blocked` — use `lib/labels.ts` for labels/variants. `chat-media` is private: sign URLs server-side (`createSignedUrls`)
- `supabase.auth.admin.getUserById(id)` returns `{ data: { user: User | null }, error }` — destructure as `{ data: authUser }` then access `authUser?.user`

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
- Supabase SSR `setAll` cookie callback needs an explicit type annotation. Use `type SetAllCookies = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0]` (import `CookieMethodsServer` from `@supabase/ssr`) and annotate the parameter with that type. `NonNullable` is required because `setAll` is optional on the interface. This applies in both `middleware.ts` and `app/auth/callback/route.ts`.

## Deploying

Vercel. After deploy, add the domain to Supabase → Authentication → Redirect URLs.
