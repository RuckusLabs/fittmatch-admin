'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createPromoCode, setPromoCodeActive } from '@/lib/actions'

const inputClass = 'rounded-md border border-input bg-background px-3 py-2 text-sm'

export function PromoCodeForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      ref={formRef}
      className="grid grid-cols-2 md:grid-cols-3 gap-3"
      action={(fd) => {
        setError(null)
        startTransition(async () => {
          const max = String(fd.get('max') ?? '').trim()
          const expires = String(fd.get('expires') ?? '').trim()
          const result = await createPromoCode({
            code: String(fd.get('code') ?? ''),
            days: Number(fd.get('days')),
            maxRedemptions: max ? Number(max) : null,
            expiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
            tier: String(fd.get('tier')) as 'any' | 'coach_pro' | 'client_pro',
            description: String(fd.get('description') ?? '').trim() || null,
          })
          if (result.error) setError(result.error)
          else formRef.current?.reset()
        })
      }}
    >
      <input name="code" placeholder="CODE" required className={`${inputClass} uppercase font-mono`} />
      <input name="days" type="number" min={1} max={365} defaultValue={30} required className={inputClass} placeholder="Days of Pro" />
      <select name="tier" defaultValue="any" className={inputClass}>
        <option value="any">Coaches & gyms</option>
        <option value="coach_pro">Coaches only</option>
        <option value="client_pro">Gyms only</option>
      </select>
      <input name="max" type="number" min={1} placeholder="Max uses (blank = unlimited)" className={inputClass} />
      <input name="expires" type="date" className={inputClass} />
      <input name="description" placeholder="Internal note" className={inputClass} />
      <div className="col-span-full flex items-center gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? 'Creating…' : 'Create code'}</Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </form>
  )
}

export function PromoToggle({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-xs"
      disabled={isPending}
      onClick={() => startTransition(async () => { await setPromoCodeActive(id, !active) })}
    >
      {active ? 'Deactivate' : 'Activate'}
    </Button>
  )
}
