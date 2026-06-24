'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resetSuperLikes } from '@/lib/actions'

// Mirrors COACH_MONTHLY_SUPER_LIKE_LIMIT in the mobile app (display only — the cap lives in code).
const MONTHLY_LIMIT = 5

interface Props {
  userId: string
  used: number
}

export function SuperLikePanel({ userId, used }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleReset() {
    if (!confirm("Reset this coach's super-likes for the current month?")) return
    setError(null)
    setDone(false)
    startTransition(async () => {
      const result = await resetSuperLikes(userId)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Super-likes (this month)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Coach Pro super-likes used this month. Reset to grant a fresh monthly allotment.
        </p>
        <p className="text-sm font-medium">
          {done ? 0 : used} / {MONTHLY_LIMIT} used
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {done && <p className="text-sm text-green-600">Super-likes reset.</p>}
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Resetting…' : 'Reset Super-likes'}
        </Button>
      </CardContent>
    </Card>
  )
}
