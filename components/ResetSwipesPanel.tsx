'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resetDailySwipes } from '@/lib/actions'

interface Props {
  userId: string
}

export function ResetSwipesPanel({ userId }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleReset() {
    if (!confirm('Reset today\'s swipe count for this user? They will be able to swipe again immediately.')) return
    setError(null)
    setDone(false)
    startTransition(async () => {
      const result = await resetDailySwipes(userId)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reset Daily Swipes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Clears today&apos;s usage counter so this client can swipe again right now.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-green-600">Swipes reset successfully.</p>}
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Resetting…' : 'Reset Today\'s Swipes'}
        </Button>
      </CardContent>
    </Card>
  )
}
