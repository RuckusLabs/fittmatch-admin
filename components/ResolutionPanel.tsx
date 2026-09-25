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

  function submit(status: 'resolved' | 'dismissed') {
    setError(null)
    startTransition(async () => {
      const result = await resolveReport(reportId, action, notes, status)
      if (result.error) setError(result.error)
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit('resolved')
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

          {currentStatus && ['resolved', 'dismissed'].includes(currentStatus) && (
            <p className="text-xs text-muted-foreground">Currently {currentStatus}. Saving again overwrites it.</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Saving...' : 'Save resolution'}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => submit('dismissed')}>
              Dismiss
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
