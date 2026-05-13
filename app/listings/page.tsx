import { createServiceClient } from '@/lib/supabase-server'
import { removeListing } from '@/lib/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ListingRow = {
  id: string
  title: string
  status: string | null
  boosted_until: string | null
  created_at: string | null
  client: { company_name: string | null } | null
}

const STATUS_TABS = ['all', 'live', 'draft', 'removed']

const statusBadgeClass: Record<string, string> = {
  live: 'bg-green-100 text-green-700 border-green-200',
  draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  removed: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const currentStatus = status ?? 'all'
  const supabase = createServiceClient()

  let query = supabase
    .from('job_listings')
    .select(
      'id, title, status, boosted_until, created_at, client:client_profiles!job_listings_client_id_fkey(company_name)'
    )
    .order('created_at', { ascending: false })

  if (currentStatus !== 'all') {
    query = query.eq('status', currentStatus)
  }

  const { data: listings } = await query.returns<ListingRow[]>()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-4">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/listings?status=${tab}`}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md font-medium transition-colors capitalize',
              currentStatus === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
            )}
          >
            {tab}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="text-sm text-muted-foreground">
            {listings?.length ?? 0} listings
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">Company</th>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Boosted until</th>
              <th className="text-left px-4 py-2 font-medium">Created</th>
              <th className="text-left px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings?.map((listing) => (
              <tr
                key={listing.id}
                className="border-b last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2.5 text-muted-foreground">
                  {listing.client?.company_name ?? '—'}
                </td>
                <td className="px-4 py-2.5 font-medium">{listing.title}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize',
                      statusBadgeClass[listing.status ?? ''] ??
                        statusBadgeClass.draft
                    )}
                  >
                    {listing.status ?? 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {listing.boosted_until
                    ? new Date(listing.boosted_until).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {listing.created_at
                    ? new Date(listing.created_at).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {listing.status !== 'removed' && (
                    <form
                      action={async () => {
                        'use server'
                        await removeListing(listing.id)
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-red-50 h-7 px-2"
                      >
                        Remove
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!listings?.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No listings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
