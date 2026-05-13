'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateListing } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Listing = {
  id: string
  title: string
  description: string | null
  status: string | null
  pay_min: number | null
  pay_max: number | null
  pay_negotiable: boolean | null
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
    const boostDate = fd.get('boosted_until') as string

    const result = await updateListing(listing.id, {
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || null,
      status: fd.get('status') as string,
      role_type: (fd.get('role_type') as string) || null,
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
                <option value="removed">Removed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="role_type">
                Role Type
              </label>
              <input
                id="role_type"
                name="role_type"
                defaultValue={listing.role_type ?? ''}
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
                defaultValue={listing.pay_min ?? ''}
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
