import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { EditListingForm } from '@/components/EditListingForm'
import { ArrowLeft, Eye, Hourglass, Users } from 'lucide-react'
import { PIPELINE_STAGES, PIPELINE_STAGE_LABEL } from '@/lib/labels'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: listing }, { count: applicantCount }, { data: applications }] = await Promise.all([
    supabase
      .from('job_listings')
      .select(
        'id, title, description, status, pay_min, pay_max, pay_negotiable, role_type, boosted_until, views_count, expires_at, client:client_profiles!job_listings_client_id_fkey(company_name)'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('target_listing_id', id)
      .eq('direction', 'right'),
    supabase.from('applications').select('stage').eq('listing_id', id),
  ])

  const stageCounts = (applications ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.stage] = (acc[a.stage] ?? 0) + 1
    return acc
  }, {})

  if (!listing) notFound()

  const client = listing.client as { company_name: string | null } | null

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/listings"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{listing.title}</h1>
          {client?.company_name && (
            <p className="text-sm text-muted-foreground">{client.company_name}</p>
          )}
        </div>
      </div>

      <div className="flex gap-6 text-sm text-muted-foreground border-y py-2">
        <span className="inline-flex items-center gap-1.5"><Eye size={14} /> {(listing as { views_count?: number | null }).views_count ?? 0} views</span>
        <span className="inline-flex items-center gap-1.5"><Users size={14} /> {applicantCount ?? 0} applicants</span>
        {listing.expires_at && (
          <span className="inline-flex items-center gap-1.5"><Hourglass size={14} /> {listing.status === 'live' ? 'closes' : 'closed'} {new Date(listing.expires_at).toLocaleDateString()}</span>
        )}
      </div>

      {(applications?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Pipeline:</span>
          {PIPELINE_STAGES.map((s) => (
            <span key={s} className="rounded-full border px-2 py-0.5">
              {PIPELINE_STAGE_LABEL[s]} {stageCounts[s] ?? 0}
            </span>
          ))}
        </div>
      )}

      <EditListingForm listing={listing} />
    </div>
  )
}
