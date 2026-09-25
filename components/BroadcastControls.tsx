'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { broadcastAnnouncement, removeBlock } from '@/lib/actions'

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function BroadcastForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  return (
    <form
      ref={formRef}
      className="space-y-3"
      action={(fd) => {
        const title = String(fd.get('title') ?? '').trim()
        const audience = String(fd.get('audience'))
        if (!confirm(`Send "${title}" to ${audience === 'all' ? 'all users' : `all ${audience}s`}?`)) return
        setResult(null)
        startTransition(async () => {
          const r = await broadcastAnnouncement({
            title,
            body: String(fd.get('body') ?? '').trim(),
            audience: audience as 'all' | 'coach' | 'client',
            city: String(fd.get('city') ?? '').trim() || null,
            push: fd.get('push') === 'on',
          })
          setResult(r.error ?? `Sent to ${r.recipients} users${r.pushed ? ` (${r.pushed} push devices)` : ''}.`)
          if (!r.error) formRef.current?.reset()
        })
      }}
    >
      <input name="title" required maxLength={80} placeholder="Title" className={inputClass} />
      <textarea name="body" required maxLength={300} rows={3} placeholder="Message" className={inputClass} />
      <div className="grid grid-cols-2 gap-3">
        <select name="audience" defaultValue="all" className={inputClass}>
          <option value="all">Everyone</option>
          <option value="coach">Coaches</option>
          <option value="client">Gyms</option>
        </select>
        <input name="city" placeholder="City (optional, exact match)" className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="push" defaultChecked /> Also send as push notification
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? 'Sending…' : 'Send'}</Button>
        {result && <span className="text-sm text-muted-foreground">{result}</span>}
      </div>
    </form>
  )
}

export function UnblockButton({ blockerId, blockedId }: { blockerId: string; blockedId: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs"
      disabled={isPending}
      onClick={() => {
        if (!confirm('Remove this block?')) return
        startTransition(async () => { await removeBlock(blockerId, blockedId) })
      }}
    >
      Remove
    </Button>
  )
}
