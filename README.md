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
| `/users/[id]` | User detail, metrics, ban/unban panel |
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

## Adding an admin

Run in Supabase SQL Editor:

```sql
INSERT INTO profiles (id, email, role)
VALUES ('<auth-uuid>', '<email>', 'coach')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_users (user_id, role, granted_by)
VALUES ('<auth-uuid>', 'admin', '<auth-uuid>')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

## Deployment

Hosted on Vercel. Set these environment variables in the Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

After deploying, add the Vercel domain to Supabase → Authentication → URL Configuration → Redirect URLs.
