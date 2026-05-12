# Admin Dashboard — fittmatch-admin

## Context

A separate web repo for the FITTMatch moderation + operations team. The Supabase schema is already fully built: `reports`, `admin_users`, `admin_audit_log`, `blocks`, `profiles.is_banned*` fields, and `is_admin()` RLS function. Nothing new is needed in the database. The admin web app reads/writes via the Supabase service role key (server-side only) — no new edge functions required.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, server components, server actions) |
| Auth | Supabase Auth (magic link) + middleware admin guard |
| Database | Supabase JS v2 — service role client (server-only) |
| UI components | shadcn/ui (Table, Badge, Dialog, Select, Tabs, Card) |
| Styling | Tailwind CSS |
| Types | `types/database.ts` — copy from mobile repo and keep in sync |

---

## Project Bootstrap

```bash
npx create-next-app@latest fittmatch-admin --typescript --tailwind --app
cd fittmatch-admin
npx shadcn@latest init
npx shadcn@latest add table badge dialog select tabs card button textarea input avatar separator
npm install @supabase/supabase-js @supabase/ssr
```

---

## File Structure

```
fittmatch-admin/
├── app/
│   ├── layout.tsx                  # Root layout (sidebar + header shell)
│   ├── page.tsx                    # Dashboard — stats + recent activity
│   ├── login/page.tsx              # Magic link login
│   ├── reports/
│   │   ├── page.tsx                # Reports queue (filterable table)
│   │   └── [id]/page.tsx           # Report detail + resolution panel
│   ├── users/
│   │   ├── page.tsx                # User search table
│   │   └── [id]/page.tsx           # User detail + ban panel
│   ├── listings/page.tsx           # Job listings table
│   ├── subscriptions/page.tsx      # Revenue / subscription table
│   └── audit-log/page.tsx          # Admin action history
├── components/
│   ├── layout/Sidebar.tsx          # Nav links
│   ├── layout/Header.tsx           # Page title + admin user badge
│   ├── StatCard.tsx                # Reusable metric card
│   └── ReportBadge.tsx             # Priority / status colour badges
├── lib/
│   ├── supabase-server.ts          # createClient() with SERVICE_ROLE_KEY (server only)
│   ├── supabase-browser.ts         # createBrowserClient() with ANON_KEY
│   └── actions.ts                  # Server Actions: resolveReport, banUser, removeListing, logAudit
├── types/
│   └── database.ts                 # Copy of mobile app's generated types
├── middleware.ts                    # Auth + admin_users guard on every route
└── .env.local
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=      # Never exposed to browser
```

---

## Auth + Middleware

`middleware.ts` runs on every non-login request:
1. Creates Supabase SSR client from cookies
2. Checks `supabase.auth.getUser()` — redirects to `/login` if no session
3. Queries `admin_users` table for caller's `user_id` — redirects to `/login?error=not_admin` if not found
4. Passes request through with `role` injected into headers for layout use

`app/login/page.tsx` — email input → `supabase.auth.signInWithOtp({ email })` → "Check your email" state. Supabase sends the magic link; clicking it redirects back to `/` where middleware checks admin status.

---

## Server Actions (`lib/actions.ts`)

All use the service role client. Each one appends to `admin_audit_log` as the final step.

| Action | What it does |
|--------|-------------|
| `resolveReport(reportId, action, notes)` | Sets `reports.status`, `resolved_by`, `resolution_notes`, `resolution_action`, `resolved_at`. If action is `user_banned`, also calls `banUser()`. |
| `banUser(userId, reason)` | Sets `profiles.is_banned = true`, `banned_reason`, `banned_at`, `banned_by`. |
| `unbanUser(userId)` | Clears ban fields on profiles. |
| `removeListing(listingId)` | Sets `job_listings.status = 'removed'`. |
| `grantAdminRole(userId, role)` | Upserts into `admin_users`. |
| `logAudit(action, targetType, targetId, metadata)` | Inserts into `admin_audit_log`. |

---

## Screens

### `/` — Dashboard
- Four stat cards (server-fetched on render):
  - Open reports count
  - Total users (coaches + clients)
  - Active Pro subscriptions
  - New matches this week
- Recent reports table (last 10, open only)
- New signups sparkline (last 7 days — count by date from `profiles.created_at`)

### `/reports` — Reports Queue
- Status tabs: **All / Open / Reviewing / Resolved / Dismissed**
- Sortable table columns: Priority badge · Type · Reason · Reporter · Against · Created
- Row click → `/reports/[id]`
- Bulk "Mark as reviewing" checkbox action

### `/reports/[id]` — Report Detail
- Reporter card: avatar + name + role
- Reported entity panel: user profile card / listing card / message bubble
- Reason + details text
- Resolution panel:
  - Status dropdown (open / reviewing / resolved / dismissed)
  - Action dropdown (no_action / warning / content_removed / user_banned)
  - Notes textarea
  - "Save resolution" → calls `resolveReport()` server action → revalidates

### `/users` — User Table
- Search input (name or email — `profiles.full_name ilike` query)
- Role filter toggle (All / Coaches / Clients)
- Status filter (Active / Banned)
- Table: Avatar · Name · Role · Joined · Subscription tier · Banned badge
- Row → `/users/[id]`

### `/users/[id]` — User Detail
- Profile card (all fields from `coach_profiles` or `client_profiles` join)
- Subscription status badge (queries `subscriptions` table)
- Metrics row: swipes given · swipes received · matches · messages sent (aggregate queries)
- Reports against this user (filtered `reports` query)
- Audit log for this user (filtered `admin_audit_log` by `target_id`)
- Action panel: Ban (with reason textarea) or Unban button → server action

### `/listings` — Listings Table
- Filter by status (live / draft / removed)
- Columns: Company · Title · Status · Boosted until · Created · Actions
- "Remove" inline action → `removeListing()` server action

### `/subscriptions` — Revenue Table
- MRR stat card (sum of active subscriptions × monthly price estimate)
- Table: User · Tier · Status · Period end · Provider ID
- No mutation actions (RevenueCat is source of truth)

### `/audit-log` — Audit History
- Paginated table (50/page): Admin · Action · Target type · Target ID · Timestamp · Metadata JSON chip
- Filter by admin user

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Server only — never prefix with NEXT_PUBLIC_
```

Deploy to Vercel. Set same vars in Vercel project settings.

---

## What You Need to Do (Manual Steps)

1. Create a new GitHub repo `fittmatch-admin` and push the project
2. Copy `types/database.ts` from the mobile repo
3. Add your own user to `admin_users` table in Supabase SQL Editor:
   ```sql
   INSERT INTO admin_users (user_id, role, granted_by)
   VALUES ('<your-auth-uuid>', 'admin', '<your-auth-uuid>');
   ```
4. Deploy to Vercel and set the three env vars
5. Visit `/login`, send yourself a magic link — you'll land on the dashboard

---

## Verification

1. Non-admin Supabase user hits `/` → redirected to `/login?error=not_admin`
2. Admin user lands on dashboard with real stat counts from prod DB
3. Open a report → mark as "user_banned" → `profiles.is_banned` flips, audit log row created
4. Search for a user → view their report history and subscription status
5. Remove a listing → status flips to "removed", visible in listings table
