'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { changeUserRole } from '@/lib/actions'

interface ChangeRolePanelProps {
  userId: string
  currentRole: string
}

export function ChangeRolePanel({ userId, currentRole }: ChangeRolePanelProps) {
  const newRole = currentRole === 'coach' ? 'client' : 'coach'
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await changeUserRole(userId, newRole as 'coach' | 'client')
      if (result.error) {
        setError(result.error)
      }
      setConfirming(false)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Role</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Current role: <span className="font-medium capitalize">{currentRole}</span>
        </p>
        {confirming ? (
          <div className="space-y-2">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Changing to <strong>{newRole}</strong> will create a new {newRole} profile. Existing matches will reference the old profile type.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending ? 'Changing...' : `Confirm → ${newRole}`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              variant="outline"
              size="sm"
              className="w-full capitalize"
              onClick={() => setConfirming(true)}
            >
              Change to {newRole}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
