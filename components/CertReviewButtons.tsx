'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { reviewCert } from '@/lib/actions'

export function CertReviewButtons({ verificationId }: { verificationId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function decide(decision: 'approved' | 'rejected') {
    const note = decision === 'rejected'
      ? window.prompt('Reason shown to the coach (optional):') ?? undefined
      : undefined
    setError(null)
    startTransition(async () => {
      const result = await reviewCert(verificationId, decision, note)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <Button size="sm" disabled={isPending} onClick={() => decide('approved')}>Approve</Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => decide('rejected')}>Reject</Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
