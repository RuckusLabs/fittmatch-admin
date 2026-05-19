import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default async function UserMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ matchId?: string }>
}) {
  const { id } = await params
  const { matchId: focusMatchId } = await searchParams
  const supabase = createServiceClient()

  const [{ data: profile }, { data: matches }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', id).single(),
    supabase
      .from('matches')
      .select(
        'id, status, created_at, coach:coach_profiles(id, profiles(full_name)), client:client_profiles(id, profiles(full_name, email))'
      )
      .or(`coach_id.eq.${id},client_id.eq.${id}`)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  const matchIds = (matches ?? []).map((m) => m.id)

  const messages =
    matchIds.length === 0
      ? []
      : (
          await supabase
            .from('messages')
            .select('id, body, created_at, read_at, sender_id, match_id')
            .in('match_id', matchIds)
            .order('created_at', { ascending: true })
        ).data ?? []

  const messagesByMatch = new Map<string, typeof messages>()
  for (const msg of messages) {
    const bucket = messagesByMatch.get(msg.match_id) ?? []
    bucket.push(msg)
    messagesByMatch.set(msg.match_id, bucket)
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/users/${id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to {profile.full_name ?? profile.email}
        </Link>
      </div>

      <h1 className="text-xl font-bold">
        Messages — {profile.full_name ?? profile.email}
      </h1>

      {(matches ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches or messages.</p>
      ) : (
        (matches ?? []).map((match: any) => {
          const coachName = match.coach?.profiles?.full_name ?? 'Unknown coach'
          const clientName = match.client?.profiles?.full_name ?? 'Unknown client'
          const msgs = messagesByMatch.get(match.id) ?? []
          const isFocused = match.id === focusMatchId

          return (
            <Card
              key={match.id}
              id={match.id}
              className={isFocused ? 'ring-2 ring-primary' : undefined}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {coachName} ↔ {clientName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {match.status ?? 'unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {msgs.length} message{msgs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {msgs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No messages in this match.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {msgs.map((msg) => {
                      const isOwn = msg.sender_id === id
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.body}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {msg.created_at
                              ? new Date(msg.created_at).toLocaleString()
                              : '—'}
                            {msg.read_at ? ' · read' : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
