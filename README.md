# FittMatch Admin

Internal moderation and operations dashboard for the FittMatch platform.

## Stack

- **Framework**: Next.js 15 (App Router, server components, server actions)
- **Auth**: Supabase Auth — magic link + middleware admin guard
- **Database**: Supabase (service role client, server-only)
- **UI**: shadcn/ui + Tailwind CSS

## Screens

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — stat cards + recent reports + signup sparkline |
| `/reports` | Reports queue with status tabs and bulk actions |
| `/reports/[id]` | Report detail + resolution panel |
| `/users` | User search by name or email, role/status filters |
| `/users/new` | Create a new coach or client user |
| `/users/[id]` | User detail, metrics, ban/unban, grant/revoke admin access |
| `/users/[id]/edit` | Edit coach or client profile fields |
| `/listings` | Job listings with edit, remove, and status filter |
| `/listings/new` | Create a listing on behalf of a client |
| `/listings/[id]` | Edit listing title, description, status, pay, boost |
| `/subscriptions` | Revenue table + MRR estimate |
| `/audit-log` | Paginated admin action history |

## Local development

```bash
npm install
npx shadcn@latest init
npx shadcn@latest add table badge dialog select tabs card button textarea input avatar separator
npm run dev
```

Copy `.env.local.example` → `.env.local` and fill in the three Supabase keys.

## Adding the first admin

The first admin can't be granted through the UI (you need an admin to grant admin). Run this once in the Supabase SQL Editor, using the UUID of a user who has already signed in via magic link:

```sql
INSERT INTO profiles (id, email, role)
VALUES ('<auth-uuid>', '<email>', 'coach')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (user_id, role, granted_by)
VALUES ('<auth-uuid>', 'admin', '<auth-uuid>')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

After that, additional admins can be granted directly from any user's detail page (`/users/[id]`).

## User management

From the **Users** screen you can:

- **Search** by name or email, filter by role (coach / client) and status (active / banned)
- **Create users** — `/users/new` creates a coach or client account via `auth.admin.createUser`. For client accounts you can optionally set company name and type at creation time. The user receives a magic-link email to activate their account.
- **View a user** — metrics (swipes, matches, messages), reports against them, subscription status
- **Edit profile** — `/users/[id]/edit` lets you update a coach's bio, title, specialties, rates, and experience level, or a client's company name, type, bio, website, and team size
- **Ban / unban** — with a reason; logged to the audit log
- **Grant / revoke admin access** — from the user detail page, choose a role (Moderator, Admin, Super Admin) and grant in one click. Revoke is equally one-click.

## Listing management

From the **Listings** screen you can:

- **Filter** by status (live / draft / removed)
- **Edit a listing** — `/listings/[id]` lets you update title, description, status, role type, pay range, and boost expiry. A "Clear boost" button removes an active boost without clearing the date field.
- **Create a listing** — `/listings/new` creates a listing on behalf of any existing client account
- **Remove a listing** — sets status to `removed` inline from the list view

## Deployment

Hosted on Vercel. Set these environment variables in the Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

After deploying, add the Vercel domain to Supabase → Authentication → URL Configuration → Redirect URLs.
