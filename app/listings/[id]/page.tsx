import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { EditListingForm } from '@/components/EditListingForm'
import { ArrowLeft } from 'lucide-react'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: listing } = await supabase
    .from('job_listings')
    .select(
      'id, title, description, status, pay_min, pay_max, pay_negotiable, role_type, boosted_until, client:client_profiles!job_listings_client_id_fkey(company_name)'
    )
    .eq('id', id)
    .single()

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

      <EditListingForm listing={listing} />
    </div>
  )
}
