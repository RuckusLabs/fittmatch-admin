'use client'

import { useTransition } from 'react'
import { endCoachBoost } from '@/lib/actions'

export function EndBoostButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs text-destructive hover:underline disabled:opacity-50"
      onClick={() => startTransition(async () => { await endCoachBoost(userId) })}
    >
      {isPending ? 'Ending…' : 'End boost'}
    </button>
  )
}
