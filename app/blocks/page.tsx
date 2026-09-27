import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { UnblockButton } from '@/components/BroadcastControls'

type BlockRow = {
  blocker_id: string
  blocked_id: string
  created_at: string | null
  blocker: { full_name: string | null; role: string } | null
  blocked: { full_name: string | null; role: string } | null
}

export default async function BlocksPage() {
  const { data } = await createServiceClient()
    .from('blocks')
    .select('blocker_id, blocked_id, created_at, blocker:profiles!blocks_blocker_id_fkey(full_name, role), blocked:profiles!blocks_blocked_id_fkey(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(200)
  const rows = (data ?? []) as unknown as BlockRow[]

  return (
    <div className="rounded-lg border bg-white overflow-hidden max-w-4xl">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-2">Blocker</th>
            <th className="px-4 py-2">Blocked</th>
            <th className="px-4 py-2">When</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={`${b.blocker_id}-${b.blocked_id}`} className="border-t">
              <td className="px-4 py-2">
                <Link href={`/users/${b.blocker_id}`} className="text-blue-600 hover:underline">{b.blocker?.full_name ?? 'Unknown'}</Link>
                <span className="text-xs text-muted-foreground capitalize"> · {b.blocker?.role}</span>
              </td>
              <td className="px-4 py-2">
                <Link href={`/users/${b.blocked_id}`} className="text-blue-600 hover:underline">{b.blocked?.full_name ?? 'Unknown'}</Link>
                <span className="text-xs text-muted-foreground capitalize"> · {b.blocked?.role}</span>
              </td>
              <td className="px-4 py-2 text-muted-foreground">{b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-2 text-right"><UnblockButton blockerId={b.blocker_id} blockedId={b.blocked_id} /></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No blocks</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
