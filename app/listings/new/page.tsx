import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { CreateListingForm } from '@/components/CreateListingForm'
import { ArrowLeft } from 'lucide-react'

type ClientRow = {
  id: string
  full_name: string | null
  client_profiles: { company_name: string | null } | null
}

export default async function NewListingPage() {
  const supabase = createServiceClient()

  const { data: clientRows } = await supabase
    .from('profiles')
    .select('id, full_name, client_profiles(company_name)')
    .eq('role', 'client')
    .order('full_name')
    .returns<ClientRow[]>()

  const clients = (clientRows ?? []).map((c) => ({
    id: c.id,
    full_name: c.full_name,
    company_name: c.client_profiles?.company_name ?? null,
  }))

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/listings"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">New Listing</h1>
      </div>

      <CreateListingForm clients={clients} />
    </div>
  )
}
