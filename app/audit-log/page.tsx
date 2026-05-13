import { createServiceClient } from '@/lib/supabase-server'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type AuditRow = {
  id: string
  action: string | null
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
  admin: { id: string; full_name: string | null; email: string } | null
}

type AdminOption = {
  admin_id: string | null
  admin: { full_name: string | null; email: string } | null
}

const PAGE_SIZE = 50

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; admin?: string }>
}) {
  const { page, admin: adminFilter } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE
  const supabase = createServiceClient()

  let query = supabase
    .from('admin_audit_log')
    .select(
      'id, action, target_type, target_id, metadata, created_at, admin:profiles!admin_audit_log_admin_id_fkey(id, full_name, email)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (adminFilter) {
    query = query.eq('admin_id', adminFilter)
  }

  const { data: logs, count } = await query.returns<AuditRow[]>()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Get distinct admins for filter dropdown
  const { data: adminRows } = await supabase
    .from('admin_audit_log')
    .select('admin_id, admin:profiles!admin_audit_log_admin_id_fkey(full_name, email)')
    .not('admin_id', 'is', null)
    .limit(200)
    .returns<AdminOption[]>()

  const adminsMap = new Map<string, { name: string | null; email: string }>()
  for (const row of adminRows ?? []) {
    if (row.admin_id && !adminsMap.has(row.admin_id)) {
      adminsMap.set(row.admin_id, {
        name: row.admin?.full_name ?? null,
        email: row.admin?.email ?? '',
      })
    }
  }
  const admins = Array.from(adminsMap.entries())

  function buildUrl(newPage: number, newAdmin?: string) {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', String(newPage))
    const a = newAdmin !== undefined ? newAdmin : adminFilter
    if (a) params.set('admin', a)
    return `/audit-log${params.toString() ? `?${params}` : ''}`
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">
          Filter by admin:
        </label>
        <div className="flex gap-1.5 flex-wrap">
          <Link
            href={buildUrl(1, '')}
            className={cn(
              'px-2.5 py-1 text-xs rounded font-medium transition-colors',
              !adminFilter
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
            )}
          >
            All
          </Link>
          {admins.map(([adminId, info]) => (
            <Link
              key={adminId}
              href={buildUrl(1, adminId)}
              className={cn(
                'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                adminFilter === adminId
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
              )}
            >
              {info.name ?? info.email}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {count ?? 0} total entries · page {currentPage} of{' '}
            {totalPages || 1}
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <Link
                href={buildUrl(currentPage - 1)}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={buildUrl(currentPage + 1)}
                className="text-sm text-blue-600 hover:underline"
              >
                Next →
              </Link>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">Admin</th>
              <th className="text-left px-4 py-2 font-medium">Action</th>
              <th className="text-left px-4 py-2 font-medium">Target type</th>
              <th className="text-left px-4 py-2 font-medium">Target ID</th>
              <th className="text-left px-4 py-2 font-medium">Timestamp</th>
              <th className="text-left px-4 py-2 font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((entry) => (
              <tr
                key={entry.id}
                className="border-b last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <p className="font-medium">
                    {entry.admin?.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.admin?.email}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                    {entry.action}
                  </code>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground capitalize">
                  {entry.target_type ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  {entry.target_id ? (
                    <code className="text-xs text-muted-foreground font-mono">
                      {entry.target_id.slice(0, 8)}…
                    </code>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {entry.metadata &&
                  Object.keys(entry.metadata).length > 0 ? (
                    <details>
                      <summary className="text-xs text-blue-600 cursor-pointer">
                        View
                      </summary>
                      <pre className="text-xs bg-gray-100 rounded p-2 mt-1 max-w-xs overflow-auto">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No audit log entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
