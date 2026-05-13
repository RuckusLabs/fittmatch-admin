import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { UserPlus } from 'lucide-react'

type UserRow = {
  id: string
  full_name: string | null
  email: string
  role: string
  is_banned: boolean | null
  created_at: string | null
  subscriptions: Array<{ tier: string | null; status: string | null }> | null
}

const ROLE_TABS = ['all', 'coach', 'client']
const STATUS_TABS = ['all', 'active', 'banned']

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>
}) {
  const { q, role, status } = await searchParams
  const currentRole = role ?? 'all'
  const currentStatus = status ?? 'all'
  const supabase = createServiceClient()

  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, email, role, is_banned, created_at, subscriptions(tier, status)'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }
  if (currentRole !== 'all') {
    query = query.eq('role', currentRole)
  }
  if (currentStatus === 'banned') {
    query = query.eq('is_banned', true)
  } else if (currentStatus === 'active') {
    query = query.neq('is_banned', true)
  }

  const { data: users } = await query.returns<UserRow[]>()

  function getInitials(name: string | null) {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function getActiveSub(subs: UserRow['subscriptions']) {
    if (!subs?.length) return null
    return subs.find((s) => s.status === 'active') ?? subs[0]
  }

  return (
    <div className="space-y-4">
      {/* Top bar: search + new user button */}
      <div className="flex items-center justify-between gap-3">
        <form method="GET" action="/users" className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or email..."
          className="rounded-md border border-input bg-background px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {role && <input type="hidden" name="role" value={role} />}
        {status && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
          >
            Search
          </button>
        </form>
        <Button asChild size="sm">
          <Link href="/users/new">
            <UserPlus className="h-4 w-4 mr-1.5" />
            New User
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Role:</span>
          {ROLE_TABS.map((tab) => (
            <Link
              key={tab}
              href={`/users?${new URLSearchParams({ ...(q ? { q } : {}), role: tab, ...(status ? { status } : {}) }).toString()}`}
              className={cn(
                'px-2.5 py-1 text-xs rounded font-medium capitalize transition-colors',
                currentRole === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
              )}
            >
              {tab}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Status:</span>
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab}
              href={`/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), status: tab }).toString()}`}
              className={cn(
                'px-2.5 py-1 text-xs rounded font-medium capitalize transition-colors',
                currentStatus === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
              )}
            >
              {tab}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="text-sm text-muted-foreground">
            {users?.length ?? 0} users
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">User</th>
              <th className="text-left px-4 py-2 font-medium">Role</th>
              <th className="text-left px-4 py-2 font-medium">Joined</th>
              <th className="text-left px-4 py-2 font-medium">Subscription</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => {
              const sub = getActiveSub(user.subscriptions)
              return (
                <tr
                  key={user.id}
                  className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/users/${user.id}`}
                          className="font-medium hover:underline text-blue-600"
                        >
                          {user.full_name ?? 'No name'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">
                    {user.role}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {sub ? (
                      <Badge variant="secondary" className="capitalize text-xs">
                        {sub.tier ?? 'unknown'}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Free</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {user.is_banned ? (
                      <Badge variant="destructive" className="text-xs">
                        Banned
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-700 border-green-200"
                      >
                        Active
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
            {!users?.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
