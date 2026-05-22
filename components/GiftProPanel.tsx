'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { giftPro } from '@/lib/actions'

const DURATIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

interface Props {
  userId: string
}

export function GiftProPanel({ userId }: Props) {
  const [selectedDays, setSelectedDays] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleGift() {
    if (!confirm(`Grant ${selectedDays} days of Pro to this user?`)) return
    setError(null)
    setDone(false)
    startTransition(async () => {
      const result = await giftPro(userId, selectedDays)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gift Pro Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Manually grant Pro status for a fixed period. Overwrites any existing subscription record.
        </p>
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
        {done && <p className="text-sm text-green-600">Pro granted for {selectedDays} days.</p>}
        <Button
          onClick={handleGift}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Granting…' : `Gift ${selectedDays} Days Pro`}
        </Button>
      </CardContent>
    </Card>
  )
}
