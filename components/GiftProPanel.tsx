'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { giftPro, revokePro } from '@/lib/actions'

const DURATIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

interface Props {
  userId: string
  role: 'coach' | 'client'
  currentPeriodEnd: string | null
  subStatus?: string | null
}

export function GiftProPanel({ userId, role, currentPeriodEnd, subStatus }: Props) {
  const [selectedDays, setSelectedDays] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const proLabel = role === 'coach' ? 'Coach Pro' : 'Client Pro'
  const isActive =
    subStatus === 'active' && !!currentPeriodEnd && new Date(currentPeriodEnd) > new Date()

  function handleGift() {
    if (!confirm(`Grant ${selectedDays} days of ${proLabel} to this user?`)) return
    setError(null)
    setDone(false)
    startTransition(async () => {
      const result = await giftPro(userId, selectedDays)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  function handleRevoke() {
    if (!confirm(`Revoke ${proLabel} from this user now?`)) return
    setError(null)
    setDone(false)
    startTransition(async () => {
      const result = await revokePro(userId)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gift {proLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Manually grant {proLabel} for a fixed period. Overwrites any existing subscription record.
        </p>
        {done ? (
          <p className="text-sm text-green-600">Subscription updated.</p>
        ) : !currentPeriodEnd ? (
          <p className="text-sm text-muted-foreground">No active subscription</p>
        ) : (
          <p className={`text-sm ${isActive ? 'text-green-600' : 'text-destructive'}`}>
            {isActive ? 'Pro active · expires' : 'Pro expired ·'}{' '}
            {new Date(currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
        <div className="flex gap-2">
          {DURATIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setSelectedDays(value)}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                selectedDays === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleGift} disabled={isPending} className="w-full">
          {isPending ? 'Working…' : `Gift ${selectedDays} Days ${proLabel}`}
        </Button>
        {isActive && (
          <Button
            variant="outline"
            onClick={handleRevoke}
            disabled={isPending}
            className="w-full text-destructive hover:text-destructive"
          >
            Revoke {proLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
