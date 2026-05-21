'use client'

import { useTransition, useState } from 'react'
import Link from 'next/link'
import { removeBlock } from '@/lib/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BlockUser {
  id: string
  full_name: string | null
}

interface BlockRow {
  blocker_id: string
  blocked_id: string
  created_at: string | null
  other: BlockUser | null
}

interface BlocksTableProps {
  rows: BlockRow[]
  removeLabel: string
  getBlockerBlockedIds: (row: BlockRow) => { blockerId: string; blockedId: string }
}

function BlocksTable({ rows, removeLabel, getBlockerBlockedIds }: BlocksTableProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function handleRemove(row: BlockRow) {
    const { blockerId, blockedId } = getBlockerBlockedIds(row)
    const key = `${blockerId}:${blockedId}`
    setErrors((prev) => ({ ...prev, [key]: '' }))
    startTransition(async () => {
      const result = await removeBlock(blockerId, blockedId)
      if (result.error) {
        setErrors((prev) => ({ ...prev, [key]: result.error! }))
      }
    })
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-1">None</p>
  }

  return (
    <div className="space-y-1">
      {rows.map((row) => {
        const { blockerId, blockedId } = getBlockerBlockedIds(row)
        const key = `${blockerId}:${blockedId}`
        return (
          <div key={key} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
            <div>
              <Link href={`/users/${row.other?.id}`} className="text-blue-600 hover:underline font-medium">
                {row.other?.full_name ?? row.other?.id ?? '—'}
              </Link>
              <span className="text-xs text-muted-foreground ml-2">
                {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
              </span>
              {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemove(row)}
              disabled={isPending}
              className="h-6 text-xs px-2 text-destructive hover:text-destructive"
            >
              {removeLabel}
            </Button>
          </div>
        )
      })}
    </div>
  )
}

interface BlocksPanelProps {
  blocksGiven: Array<{ blocker_id: string; blocked_id: string; created_at: string | null; blocked: BlockUser | null }>
  blocksReceived: Array<{ blocker_id: string; blocked_id: string; created_at: string | null; blocker: BlockUser | null }>
}

export function BlocksPanel({ blocksGiven, blocksReceived }: BlocksPanelProps) {
  const totalBlocks = blocksGiven.length + blocksReceived.length

  const givenRows: BlockRow[] = blocksGiven.map((b) => ({
    blocker_id: b.blocker_id,
    blocked_id: b.blocked_id,
    created_at: b.created_at,
    other: b.blocked,
  }))

  const receivedRows: BlockRow[] = blocksReceived.map((b) => ({
    blocker_id: b.blocker_id,
    blocked_id: b.blocked_id,
    created_at: b.created_at,
    other: b.blocker,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Blocks ({totalBlocks})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Blocked by this user ({blocksGiven.length})
          </p>
          <BlocksTable
            rows={givenRows}
            removeLabel="Remove block"
            getBlockerBlockedIds={(row) => ({ blockerId: row.blocker_id, blockedId: row.blocked_id })}
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            This user is blocked by ({blocksReceived.length})
          </p>
          <BlocksTable
            rows={receivedRows}
            removeLabel="Remove block"
            getBlockerBlockedIds={(row) => ({ blockerId: row.blocker_id, blockedId: row.blocked_id })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
