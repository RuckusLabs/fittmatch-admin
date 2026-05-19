'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteUser } from '@/lib/actions'

interface DeleteUserPanelProps {
  userId: string
  email: string
}

export function DeleteUserPanel({ userId, email }: DeleteUserPanelProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await deleteUser(userId, email)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/users')
      }
    })
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
      </CardHeader>
      <CardContent>
        {!expanded ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setExpanded(true)}
          >
            Delete User
          </Button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This permanently deletes the account, profile, matches, and messages. This action cannot be undone.
            </p>
            <p className="text-sm">
              Type <span className="font-mono font-medium">{email}</span> to confirm:
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={email}
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={confirmation !== email || isPending}
              >
                {isPending ? 'Deleting...' : 'Permanently Delete'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setExpanded(false); setConfirmation('') }}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
