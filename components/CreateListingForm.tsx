'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createListing } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ClientOption = {
  id: string
  full_name: string | null
  company_name: string | null
}

export function CreateListingForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const payMinRaw = fd.get('pay_min') as string
    const payMaxRaw = fd.get('pay_max') as string

    const result = await createListing({
      client_id: fd.get('client_id') as string,
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || null,
      status: fd.get('status') as string,
      role_type: (fd.get('role_type') as string) || null,
      pay_min: payMinRaw ? parseFloat(payMinRaw) : null,
      pay_max: payMaxRaw ? parseFloat(payMaxRaw) : null,
      pay_negotiable: fd.get('pay_negotiable') === 'on',
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(`/listings/${result.listingId}`)
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="client_id">
              Post on behalf of <span className="text-destructive">*</span>
            </label>
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No client accounts found.{' '}
                <Link href="/users/new" className="text-blue-600 hover:underline">
                  Create a client first.
                </Link>
              </p>
            ) : (
              <select
                id="client_id"
                name="client_id"
                required
                className={inputClass}
              >
                <option value="">— Select a client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name
                      ? `${c.company_name}${c.full_name ? ` (${c.full_name})` : ''}`
                      : (c.full_name ?? c.id)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              name="title"
              required
              placeholder="e.g. Personal Trainer – 3x/week"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              placeholder="Describe the role, responsibilities, expectations…"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="live">Live</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="role_type">
                Role Type
              </label>
              <input
                id="role_type"
                name="role_type"
                placeholder="e.g. Personal Trainer"
                className={inputClass}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pay_min">
                Min pay ($/hr)
              </label>
              <input
                id="pay_min"
                name="pay_min"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pay_max">
                Max pay ($/hr)
              </label>
              <input
                id="pay_max"
                name="pay_max"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="pay_negotiable"
              className="rounded border-gray-300 accent-primary"
            />
            Pay is negotiable
          </label>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading || clients.length === 0}>
          {loading ? 'Creating…' : 'Create Listing'}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/listings">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
