'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteMatch } from '@/lib/actions'

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

function statusVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'accepted') return 'default'
  if (status === 'pending') return 'secondary'
  return 'outline'
}

function MatchRow({ match, userId }: { match: Match; userId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const coachName = match.coach?.profiles?.full_name ?? match.coach?.title ?? 'Unknown coach'
  const clientName = match.client?.profiles?.full_name ?? match.client?.company_name ?? 'Unknown client'

  function handleReset() {
    setError(null)
    startTransition(async () => {
      const result = await deleteMatch(match.id, userId)
      if (result.error) setError(result.error)
      setConfirming(false)
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
          <Badge variant={statusVariant(match.status)} className="capitalize">
            {match.status ?? 'unknown'}
          </Badge>
          <Link
            href={`/users/${userId}/messages?matchId=${match.id}`}
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            Messages →
          </Link>
        </div>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Delete this match and all its messages?</span>
          <Button size="sm" variant="destructive" onClick={handleReset} disabled={isPending} className="h-6 text-xs px-2">
            {isPending ? 'Deleting…' : 'Confirm'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={isPending} className="h-6 text-xs px-2">
            Cancel
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} className="h-6 text-xs px-2 text-destructive hover:text-destructive">
          Reset match
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function MatchesPanel({ matches, userId }: MatchesPanelProps) {
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
          <div>
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} userId={userId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
