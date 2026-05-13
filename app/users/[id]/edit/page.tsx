import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { EditProfileForm } from '@/components/EditProfileForm'
import { ArrowLeft } from 'lucide-react'

export default async function EditUserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, coach_profiles(*), client_profiles(*)')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const coachProfile = (profile as any).coach_profiles
  const clientProfile = (profile as any).client_profiles

  if (profile.role !== 'coach' && profile.role !== 'client') notFound()

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/users/${id}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">
            Edit {profile.role === 'coach' ? 'Coach' : 'Client'} Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.full_name ?? 'No name'}
          </p>
        </div>
      </div>

      {profile.role === 'coach' ? (
        <EditProfileForm
          userId={id}
          role="coach"
          data={{
            title: coachProfile?.title ?? null,
            bio: coachProfile?.bio ?? null,
            hourly_rate_min: coachProfile?.hourly_rate_min ?? null,
            hourly_rate_max: coachProfile?.hourly_rate_max ?? null,
            experience_band: coachProfile?.experience_band ?? null,
            specialties: coachProfile?.specialties ?? null,
          }}
        />
      ) : (
        <EditProfileForm
          userId={id}
          role="client"
          data={{
            company_name: clientProfile?.company_name ?? null,
            company_type: clientProfile?.company_type ?? null,
            bio: clientProfile?.bio ?? null,
            website: clientProfile?.website ?? null,
            team_size_band: clientProfile?.team_size_band ?? null,
          }}
        />
      )}
    </div>
  )
}
