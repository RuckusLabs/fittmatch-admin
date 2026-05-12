'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resolveReport } from '@/lib/actions'

interface ResolutionPanelProps {
  reportId: string
  currentStatus: string | null
  currentAction: string | null
  currentNotes: string | null
}

const STATUS_OPTIONS = ['open', 'reviewing', 'resolved', 'dismissed']
const ACTION_OPTIONS = [
  { value: 'no_action', label: 'No action' },
  { value: 'warning', label: 'Warning issued' },
  { value: 'content_removed', label: 'Content removed' },
  { value: 'user_banned', label: 'User banned' },
]

export function ResolutionPanel({
  reportId,
  currentStatus,
  currentAction,
  currentNotes,
}: ResolutionPanelProps) {
  const [action, setAction] = useState(currentAction ?? 'no_action')
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await resolveReport(reportId, action, notes)
      if (result.error) setError(result.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Resolution</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this resolution..."
              rows={4}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Saving...' : 'Save resolution'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
