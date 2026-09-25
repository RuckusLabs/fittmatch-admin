'use client'

import { useState, useTransition } from 'react'
import { removeMessageMedia } from '@/lib/actions'

export function RemoveMediaButton({ messageId }: { messageId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <span className="text-[10px]">
      <button
        type="button"
        disabled={isPending}
        className="text-destructive hover:underline disabled:opacity-50"
        onClick={() => {
          if (!confirm('Permanently delete this image from storage?')) return
          setError(null)
          startTransition(async () => {
            const result = await removeMessageMedia(messageId)
            if (result.error) setError(result.error)
          })
        }}
      >
        {isPending ? 'Removing…' : 'Remove image'}
      </button>
      {error && <span className="ml-2 text-destructive">{error}</span>}
    </span>
  )
}
