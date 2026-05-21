'use client'

import { useTransition } from 'react'
import { setProfileComplete } from '@/lib/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  role: 'coach' | 'client'
  isComplete: boolean
}

export function SetProfileCompleteButton({ userId, role, isComplete }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await setProfileComplete(userId, role, !isComplete)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-medium">Profile visible in deck:</span>
      {isComplete
        ? <Badge variant="outline" className="text-green-600 border-green-300">Visible</Badge>
        : <Badge variant="outline" className="text-amber-600 border-amber-300">Hidden</Badge>
      }
      <Button
        size="sm"
        variant="ghost"
        onClick={handleToggle}
        disabled={isPending}
        className="h-6 text-xs px-2"
      >
        {isPending ? 'Saving…' : isComplete ? 'Mark hidden' : 'Mark visible'}
      </Button>
    </div>
  )
}
