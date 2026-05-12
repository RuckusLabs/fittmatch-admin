'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { banUser, unbanUser } from '@/lib/actions'

interface BanPanelProps {
  userId: string
  isBanned: boolean
  bannedReason: string | null
}

export function BanPanel({ userId, isBanned, bannedReason }: BanPanelProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleBan(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await banUser(userId, reason)
      if (result.error) setError(result.error)
    })
  }

  function handleUnban() {
    setError(null)
    startTransition(async () => {
      const result = await unbanUser(userId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <Card className={isBanned ? 'border-red-200 bg-red-50' : undefined}>
      <CardHeader>
        <CardTitle className="text-base">
          {isBanned ? 'User is Banned' : 'Ban User'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isBanned ? (
          <div className="space-y-3">
            {bannedReason && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Reason:</span> {bannedReason}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              variant="outline"
              onClick={handleUnban}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? 'Removing ban...' : 'Unban User'}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleBan} className="space-y-3">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for ban (required)"
              rows={3}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? 'Banning...' : 'Ban User'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
