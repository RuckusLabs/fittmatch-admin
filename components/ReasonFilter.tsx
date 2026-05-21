'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const REASONS = [
  'Inappropriate content',
  'Spam',
  'Fake profile',
  'Other',
]

function ReasonFilterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentReason = searchParams.get('reason') ?? ''
  const currentStatus = searchParams.get('status') ?? 'all'

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const reason = e.target.value
    const params = new URLSearchParams()
    params.set('status', currentStatus)
    if (reason) params.set('reason', reason)
    router.push(`/reports?${params.toString()}`)
  }

  return (
    <select
      value={currentReason}
      onChange={handleChange}
      className="text-sm rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">All reasons</option>
      {REASONS.map((r) => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  )
}

export function ReasonFilter() {
  return (
    <Suspense>
      <ReasonFilterInner />
    </Suspense>
  )
}
