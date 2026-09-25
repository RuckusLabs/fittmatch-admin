'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { setReviewStatus } from '@/lib/actions'

type Review = {
  id: string
  rating: number
  body: string | null
  status: string
  created_at: string
  reviewer: { full_name: string | null } | null
}

function Row({ review }: { review: Review }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const hidden = review.status === 'hidden'
  return (
    <div className="py-2 border-t first:border-t-0 text-sm space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
        <span className="text-muted-foreground">by {review.reviewer?.full_name ?? 'Unknown'}</span>
        <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
        {hidden && <Badge variant="secondary">Hidden</Badge>}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 px-2 text-xs"
          disabled={isPending}
          onClick={() => startTransition(async () => {
            const r = await setReviewStatus(review.id, hidden ? 'visible' : 'hidden')
            if (r.error) setError(r.error)
          })}
        >
          {hidden ? 'Unhide' : 'Hide'}
        </Button>
      </div>
      {review.body && <p className={hidden ? 'text-muted-foreground line-through' : ''}>{review.body}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function ReviewsPanel({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reviews received ({reviews.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.map((r) => <Row key={r.id} review={r} />)}
      </CardContent>
    </Card>
  )
}
