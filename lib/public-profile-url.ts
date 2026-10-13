import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type PublicProfileLink = { url: string | null; message: string | null }

type ProfileVisibility = {
  id: string
  role: string
  is_banned: boolean | null
  open_to_offers: boolean | null
  coach_profiles: { is_complete: boolean | null } | null
  client_profiles: { is_complete: boolean | null } | null
}

export async function getPublicProfileLink(
  supabase: Pick<SupabaseClient<Database>, 'rpc'>,
  profile: ProfileVisibility,
): Promise<PublicProfileLink> {
  const details = profile.role === 'coach' ? profile.coach_profiles : profile.client_profiles
  if (!['coach', 'client'].includes(profile.role) || profile.is_banned || details?.is_complete !== true ||
      (profile.role === 'coach' && profile.open_to_offers !== true)) {
    return { url: null, message: 'Public profile hidden' }
  }
  try {
    const { data, error } = await supabase.rpc('get_profile_share_slug', {
      p_profile_id: profile.id, p_type: profile.role,
    })
    // Use only the stored unique identifier; never derive a URL from the name.
    if (error || typeof data !== 'string' || data.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$/.test(data)) {
      return { url: null, message: 'Public profile URL unavailable' }
    }
    return { url: `https://fittmatch.fit/p/${profile.role}/${data}`, message: null }
  } catch {
    return { url: null, message: 'Public profile URL unavailable' }
  }
}
