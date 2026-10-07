'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createListing } from '@/lib/actions'
import { ListingLocationFields } from '@/components/ListingLocationFields'
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
    // Live listings need pay, matching the app's job form.
    if ((fd.get('status') as string) === 'live' && !payMinRaw && !payMaxRaw) {
      setError('Add a min or max pay before making the listing live.')
      setLoading(false)
      return
    }

    const result = await createListing({
      client_id: fd.get('client_id') as string,
      title: fd.get('title') as string,
      city: String(fd.get('city') ?? '').trim() || null,
      location_text: String(fd.get('location_text') ?? '').trim() || null,
      location_lat: fd.get('location_lat') ? Number(fd.get('location_lat')) : null,
      location_lng: fd.get('location_lng') ? Number(fd.get('location_lng')) : null,
      description: (fd.get('description') as string) || null,
      status: fd.get('status') as string,
      role_type: (fd.get('role_type') as string) || null,
      pay_type: (fd.get('pay_type') as string) || 'hourly',
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

          <ListingLocationFields />

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
                Employment type
              </label>
              <select id="role_type" name="role_type" className={inputClass}>
                <option value="">Select employment type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contractor</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="pay_type">
              Pay type
            </label>
            <select id="pay_type" name="pay_type" defaultValue="hourly" className={inputClass}>
              <option value="hourly">Hourly ($/hr)</option>
              <option value="salary">Salary ($/yr)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="pay_min">
                Min pay ($)
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
                Max pay ($)
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
