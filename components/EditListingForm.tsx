'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateListing } from '@/lib/actions'
import { ListingLocationFields } from '@/components/ListingLocationFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Listing = {
  id: string
  title: string
  city: string | null
  location_text: string | null
  location_lat: number | null
  location_lng: number | null
  description: string | null
  status: string | null
  pay_min: number | null
  pay_max: number | null
  pay_negotiable: boolean | null
  pay_type: string | null
  role_type: string | null
  boosted_until: string | null
}

export function EditListingForm({ listing }: { listing: Listing }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Format boosted_until timestamp to date input value (YYYY-MM-DD)
  const boostDateValue = listing.boosted_until
    ? listing.boosted_until.split('T')[0]
    : ''

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const fd = new FormData(e.currentTarget)

    const payMinRaw = fd.get('pay_min') as string
    const payMaxRaw = fd.get('pay_max') as string
    // Live listings need pay, matching the app's job form.
    if ((fd.get('status') as string) === 'live' && !payMinRaw && !payMaxRaw) {
      setError('Add a min or max pay before making the listing live.')
      setLoading(false)
      return
    }
    const boostDate = fd.get('boosted_until') as string

    const result = await updateListing(listing.id, {
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
      boosted_until: boostDate ? new Date(boostDate).toISOString() : null,
    })

    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      router.refresh()
    }
  }

  async function handleClearBoost() {
    setLoading(true)
    setError(null)
    const result = await updateListing(listing.id, { boosted_until: null })
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      router.refresh()
    }
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
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
              defaultValue={listing.title}
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
              defaultValue={listing.description ?? ''}
              className={inputClass}
            />
          </div>

          <ListingLocationFields {...listing} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={listing.status ?? 'draft'}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="live">Live</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
                <option value="removed">Removed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="role_type">
                Employment type
              </label>
              <select id="role_type" name="role_type" className={inputClass} defaultValue={listing.role_type ?? ''}>
                <option value="">Select employment type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contractor</option>
                {listing.role_type && !['Full-time', 'Part-time', 'Contract'].includes(listing.role_type) && <option value={listing.role_type}>{listing.role_type}</option>}
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
            <select id="pay_type" name="pay_type" defaultValue={listing.pay_type ?? 'hourly'} className={inputClass}>
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
                defaultValue={listing.pay_min ?? ''}
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
                defaultValue={listing.pay_max ?? ''}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="pay_negotiable"
              defaultChecked={listing.pay_negotiable ?? false}
              className="rounded border-gray-300 accent-primary"
            />
            Pay is negotiable
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boost</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="boosted_until">
              Boosted until
            </label>
            <div className="flex items-center gap-2">
              <input
                id="boosted_until"
                name="boosted_until"
                type="date"
                defaultValue={boostDateValue}
                className={`${inputClass} w-48`}
              />
              {listing.boosted_until && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={handleClearBoost}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear boost
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to remove the boost.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Saved successfully.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/listings')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
