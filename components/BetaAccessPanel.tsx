'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { grantBetaAccess, revokeBetaAccess } from '@/lib/actions'

type Props = {
  userId: string
  expiresAt: string | null
  revokedAt: string | null
  unavailable?: boolean
}

export function BetaAccessPanel({ userId, expiresAt, revokedAt, unavailable }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const active = !revokedAt && !!expiresAt && new Date(expiresAt) > new Date()

  function update(revoke: boolean) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await (revoke ? revokeBetaAccess(userId) : grantBetaAccess(userId))
        if (result.error) setError(result.error)
        else setMessage(revoke ? 'Beta access revoked.' : 'Approved for seven days from now.')
      } catch {
        setError('Could not update beta access. Please try again.')
      }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Beta access</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Approve this account for seven days of complimentary Pro features. No purchase is required. Paid subscriptions stay separate.
        </p>
        <p className="text-sm">
          {unavailable ? 'Could not load beta access. Refresh before making changes.' : revokedAt ? 'Access revoked' : expiresAt
            ? `${active ? 'Active until' : 'Expired'} ${new Date(expiresAt).toLocaleString()}`
            : 'Not yet approved'}
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-green-600">{message}</p>}
        <Button className="w-full" onClick={() => update(false)} disabled={pending || unavailable}>
          {pending ? 'Working…' : active ? 'Renew for 7 days' : 'Approve 7-day beta access'}
        </Button>
        {active && <Button variant="outline" className="w-full" onClick={() => update(true)} disabled={pending || unavailable}>Revoke beta access</Button>}
      </CardContent>
    </Card>
  )
}
