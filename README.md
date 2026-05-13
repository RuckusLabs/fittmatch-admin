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
| `/users` | User search with role/status filters |
| `/users/new` | Create a new coach or client user |
| `/users/[id]` | User detail, metrics, ban/unban, grant/revoke admin access |
| `/listings` | Job listings with remove action |
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

- **Search** by name, filter by role (coach / client) and status (active / banned)
- **Create users** — `/users/new` creates a coach or client account via `auth.admin.createUser`. For client accounts you can optionally set company name and type at creation time. The user receives a magic-link email to activate their account.
- **View a user** — metrics (swipes, matches, messages), reports against them, subscription status
- **Ban / unban** — with a reason; logged to the audit log
- **Grant / revoke admin access** — from the user detail page, choose a role (Moderator, Admin, Super Admin) and grant in one click. Revoke is equally one-click.

## Deployment

Hosted on Vercel. Set these environment variables in the Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

After deploying, add the Vercel domain to Supabase → Authentication → URL Configuration → Redirect URLs.
