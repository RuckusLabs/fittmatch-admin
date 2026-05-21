'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteMatch, restoreMatch } from '@/lib/actions'
import { cn } from '@/lib/utils'

interface Match {
  id: string
  status: string | null
  created_at: string | null
  last_message_at: string | null
  last_message_preview: string | null
  coach: { id: string; title: string | null; profiles: { full_name: string | null } | null } | null
  client: { id: string; company_name: string | null; profiles: { full_name: string | null } | null } | null
}

interface MatchesPanelProps {
  matches: Match[]
  userId: string
}

type FilterTab = 'all' | 'active' | 'unmatched' | 'blocked'

function statusVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'blocked') return 'destructive'
  if (status === 'unmatched') return 'secondary'
  return 'default'
}

function statusLabel(status: string | null) {
  if (status === 'blocked') return 'Blocked'
  if (status === 'unmatched') return 'Unmatched'
  return 'Active'
}

function MatchRow({ match, userId }: { match: Match; userId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const coachName = match.coach?.profiles?.full_name ?? match.coach?.title ?? 'Unknown coach'
  const clientName = match.client?.profiles?.full_name ?? match.client?.company_name ?? 'Unknown client'
  const isRestorable = match.status === 'unmatched' || match.status === 'blocked'

  function handleReset() {
    setError(null)
    startTransition(async () => {
      const result = await deleteMatch(match.id, userId)
      if (result.error) setError(result.error)
      setConfirming(false)
    })
  }

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const result = await restoreMatch(match.id)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="py-3 border-b last:border-0 space-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {coachName} ↔ {clientName}
          </p>
          {match.last_message_preview && (
            <p className="text-xs text-muted-foreground truncate">{match.last_message_preview}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {match.created_at ? new Date(match.created_at).toLocaleDateString() : '—'}
            {match.last_message_at && ` · last msg ${new Date(match.last_message_at).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusVariant(match.status)}>
            {statusLabel(match.status)}
          </Badge>
          <Link
            href={`/users/${userId}/messages?matchId=${match.id}`}
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            Messages →
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isRestorable && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRestore}
            disabled={isPending}
            className="h-6 text-xs px-2 text-green-700 border-green-300 hover:bg-green-50"
          >
            {isPending ? 'Restoring…' : 'Restore'}
          </Button>
        )}
        {confirming ? (
          <>
            <span className="text-xs text-muted-foreground">Delete this match and all its messages?</span>
            <Button size="sm" variant="destructive" onClick={handleReset} disabled={isPending} className="h-6 text-xs px-2">
              {isPending ? 'Deleting…' : 'Confirm'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={isPending} className="h-6 text-xs px-2">
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} className="h-6 text-xs px-2 text-destructive hover:text-destructive">
            Reset match
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'unmatched', label: 'Unmatched' },
  { key: 'blocked', label: 'Blocked' },
]

export function MatchesPanel({ matches, userId }: MatchesPanelProps) {
  const [filter, setFilter] = useState<FilterTab>('all')

  const filtered = matches.filter((m) => {
    if (filter === 'all') return true
    if (filter === 'active') return m.status !== 'unmatched' && m.status !== 'blocked'
    return m.status === filter
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Matches ({matches.length})</CardTitle>
        {matches.length > 0 && (
          <Link href={`/users/${userId}/messages`} className="text-sm text-blue-600 hover:underline">
            View all messages →
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches</p>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-3">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                    filter === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No {filter} matches</p>
            ) : (
              <div>
                {filtered.map((m) => (
                  <MatchRow key={m.id} match={m} userId={userId} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
