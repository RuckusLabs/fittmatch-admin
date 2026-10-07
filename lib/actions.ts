'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'
import { chatMediaPath } from '@/lib/labels'

type AdminRole = 'admin' | 'moderator' | 'support'

const ADMIN_ONLY: AdminRole[] = ['admin']
const MODERATORS: AdminRole[] = ['admin', 'moderator']
const ANY_ADMIN: AdminRole[] = ['admin', 'moderator', 'support']

// Every export in a 'use server' file is a publicly reachable POST endpoint — middleware alone
// is not an authorization boundary. Each action must call this first.
async function requireAdmin(allowed: AdminRole[]): Promise<string> {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: adminUser } = await createServiceClient()
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!adminUser || !allowed.includes(adminUser.role as AdminRole)) {
    throw new Error('Not authorized')
  }
  return user.id
}

// Not exported: exported functions in this file are callable by any client.
async function logAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  await createServiceClient().from('admin_audit_log').insert({
    action,
    target_type: targetType,
    target_id: targetId,
    admin_id: adminId,
    metadata: (metadata ?? null) as Database['public']['Tables']['admin_audit_log']['Insert']['metadata'],
  })
}

export async function resolveReport(
  reportId: string,
  action: string,
  notes: string,
  status: 'resolved' | 'dismissed' = 'resolved'
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { data: report, error: fetchError } = await serviceClient
    .from('reports')
    .select('reported_id, reported_listing_id, reported_message_id')
    .eq('id', reportId)
    .single()
  if (fetchError) return { error: fetchError.message }

  // "Content removed" actually removes the reported listing / message (and its image).
  if (status === 'resolved' && action === 'content_removed') {
    if (report.reported_listing_id) {
      const { error: listingError } = await serviceClient
        .from('job_listings')
        .update({ status: 'removed' })
        .eq('id', report.reported_listing_id)
      if (listingError) return { error: listingError.message }
    } else if (report.reported_message_id) {
      const mediaResult = await removeMessageMedia(report.reported_message_id)
      if (mediaResult.error) return mediaResult
      const { error: msgError } = await serviceClient
        .from('messages')
        .delete()
        .eq('id', report.reported_message_id)
      if (msgError) return { error: msgError.message }
    } else {
      return { error: 'This report has no listing or message to remove — use Warning or Ban instead.' }
    }
  }

  const { error } = await serviceClient
    .from('reports')
    .update({
      status,
      resolution_action: status === 'dismissed' ? 'no_action' : action,
      resolution_notes: notes,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) return { error: error.message }

  if (status === 'resolved' && action === 'user_banned' && report?.reported_id) {
    const { error: banError } = await banUser(report.reported_id, notes || 'Banned via report resolution')
    if (banError) return { error: `Report resolved, but ban failed: ${banError}` }
  }

  await logAudit(adminId, status === 'dismissed' ? 'dismiss_report' : 'resolve_report', 'report', reportId, { action, notes })
  revalidatePath('/reports')
  revalidatePath(`/reports/${reportId}`)
  revalidatePath('/')
  return { error: null }
}

export async function banUser(
  userId: string,
  reason: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('profiles')
    .update({
      is_banned: true,
      banned_reason: reason,
      banned_at: new Date().toISOString(),
      banned_by: adminId,
    })
    .eq('id', userId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'ban_user', 'user', userId, { reason })
  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  revalidatePath('/')
  return { error: null }
}

export async function unbanUser(
  userId: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('profiles')
    .update({
      is_banned: false,
      banned_reason: null,
      banned_at: null,
      banned_by: null,
    })
    .eq('id', userId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'unban_user', 'user', userId, {})
  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function removeListing(
  listingId: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('job_listings')
    .update({ status: 'removed' })
    .eq('id', listingId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'remove_listing', 'listing', listingId, {})
  revalidatePath('/listings')
  return { error: null }
}

export async function grantAdminRole(
  userId: string,
  role: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  if (!ANY_ADMIN.includes(role as AdminRole)) return { error: `Invalid role: ${role}` }
  const serviceClient = createServiceClient()

  const { error } = await serviceClient.from('admin_users').upsert({
    user_id: userId,
    role,
    granted_by: adminId,
    granted_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  await logAudit(adminId, 'grant_admin_role', 'user', userId, { role })
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function updateListing(
  listingId: string,
  data: {
    title?: string
    city?: string | null
    location_text?: string | null
    location_lat?: number | null
    location_lng?: number | null
    description?: string | null
    status?: string | null
    pay_type?: string
  pay_min?: number | null
    pay_max?: number | null
    pay_negotiable?: boolean | null
    role_type?: string | null
    boosted_until?: string | null
  }
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()
  if (data.city && (data.location_lat == null || data.location_lng == null || !Number.isFinite(data.location_lat) || !Number.isFinite(data.location_lng) || Math.abs(data.location_lat) > 90 || Math.abs(data.location_lng) > 180)) return { error: 'Select a city from the search results before saving.' }

  const { error } = await serviceClient
    .from('job_listings')
    .update(data)
    .eq('id', listingId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'update_listing', 'listing', listingId, data as Record<string, unknown>)
  revalidatePath('/listings')
  revalidatePath(`/listings/${listingId}`)
  return { error: null }
}

export async function createListing(data: {
  client_id: string
  title: string
  city?: string | null
  location_text?: string | null
  location_lat?: number | null
  location_lng?: number | null
  description?: string | null
  status?: string | null
  pay_type?: string
  pay_min?: number | null
  pay_max?: number | null
  pay_negotiable?: boolean | null
  role_type?: string | null
}): Promise<{ error: string | null; listingId: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()
  if (data.city && (data.location_lat == null || data.location_lng == null || !Number.isFinite(data.location_lat) || !Number.isFinite(data.location_lng) || Math.abs(data.location_lat) > 90 || Math.abs(data.location_lng) > 180)) return { error: 'Select a city from the search results before saving.', listingId: null }

  const { data: listing, error } = await serviceClient
    .from('job_listings')
    .insert(data)
    .select('id')
    .single()

  if (error) return { error: error.message, listingId: null }

  await logAudit(adminId, 'create_listing', 'listing', listing.id, {
    client_id: data.client_id,
    title: data.title,
  })
  revalidatePath('/listings')
  return { error: null, listingId: listing.id }
}

export async function updateCoachProfile(
  userId: string,
  data: {
    title?: string | null
    bio?: string | null
    experience_band?: string | null
    specialties?: string[] | null
    certs?: string[] | null
    open_to_offers?: boolean
  }
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { open_to_offers, ...coachData } = data

  const { error } = await serviceClient
    .from('coach_profiles')
    .update(coachData)
    .eq('id', userId)

  if (error) return { error: error.message }

  if (open_to_offers !== undefined) {
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({ open_to_offers })
      .eq('id', userId)
    if (profileError) return { error: profileError.message }
    await logAudit(adminId, 'update_profile', 'user', userId, { field: 'open_to_offers', to: open_to_offers })
  }

  await logAudit(adminId, 'update_coach_profile', 'user', userId, coachData as Record<string, unknown>)
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function updateClientProfile(
  userId: string,
  data: {
    company_name?: string | null
    company_type?: string | null
    bio?: string | null
    website?: string | null
    team_size_band?: string | null
  }
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('client_profiles')
    .update(data)
    .eq('id', userId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'update_client_profile', 'user', userId, data as Record<string, unknown>)
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function createUser(
  email: string,
  fullName: string,
  role: 'coach' | 'client',
  extras?: { company_name?: string; company_type?: string }
): Promise<{ error: string | null; userId: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const serviceClient = createServiceClient()

  const { data: authData, error: authError } =
    await serviceClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

  if (authError) return { error: authError.message, userId: null }

  const userId = authData.user.id

  const { error: profileError } = await serviceClient.from('profiles').insert({
    id: userId,
    email,
    full_name: fullName,
    role,
  })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(userId)
    return { error: profileError.message, userId: null }
  }

  if (role === 'coach') {
    const { error } = await serviceClient
      .from('coach_profiles')
      .insert({ id: userId })
    if (error) return { error: error.message, userId: null }
  } else {
    const { error } = await serviceClient.from('client_profiles').insert({
      id: userId,
      ...(extras?.company_name ? { company_name: extras.company_name } : {}),
      ...(extras?.company_type ? { company_type: extras.company_type } : {}),
    })
    if (error) return { error: error.message, userId: null }
  }

  await logAudit(adminId, 'create_user', 'user', userId, { email, role })
  revalidatePath('/users')
  return { error: null, userId }
}

export async function revokeAdminRole(
  userId: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('admin_users')
    .delete()
    .eq('user_id', userId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'revoke_admin_role', 'user', userId, {})
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function changeUserRole(
  userId: string,
  newRole: 'coach' | 'client'
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const serviceClient = createServiceClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const oldRole = profile?.role

  const { error } = await serviceClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: error.message }

  if (newRole === 'coach') {
    await serviceClient.from('coach_profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })
  } else {
    await serviceClient.from('client_profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })
  }

  // Pro entitlements are role-specific (coach_pro vs client_pro). Retag gifted subscriptions;
  // RevenueCat-backed ones belong to a role-specific store product and must be re-purchased.
  await serviceClient
    .from('subscriptions')
    .update({ tier: newRole === 'coach' ? 'coach_pro' : 'client_pro' })
    .eq('user_id', userId)
    .neq('tier', 'free')
    .or('provider.is.null,provider.neq.revenuecat')

  await logAudit(adminId, 'change_user_role', 'user', userId, { from: oldRole, to: newRole })
  revalidatePath(`/users/${userId}`)
  revalidatePath('/users')
  return { error: null }
}

export async function deleteUser(
  userId: string,
  email: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  await logAudit(adminId, 'delete_user', 'user', userId, { email })

  revalidatePath('/users')
  return { error: null }
}

export async function deleteMatch(
  matchId: string,
  userId: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('matches')
    .delete()
    .eq('id', matchId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'delete_match', 'match', matchId, { user_id: userId })
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function markReportsAsReviewing(
  reportIds: string[]
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  if (!reportIds.length) return { error: null }
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('reports')
    .update({ status: 'reviewing' })
    .in('id', reportIds)

  if (error) return { error: error.message }

  await logAudit(adminId, 'bulk_mark_reviewing', 'reports', reportIds[0], {
    count: reportIds.length,
    ids: reportIds,
  })
  revalidatePath('/reports')
  return { error: null }
}

export async function restoreMatch(
  matchId: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { data: match, error: fetchError } = await serviceClient
    .from('matches')
    .select('status, coach_id, client_id')
    .eq('id', matchId)
    .single()
  if (fetchError) return { error: fetchError.message }
  if (match.status !== 'unmatched' && match.status !== 'blocked') {
    return { error: 'Only unmatched or blocked matches can be restored.' }
  }

  // matches.status is NOT NULL ('active' = mutual inbox match).
  const { error } = await serviceClient
    .from('matches')
    .update({ status: 'active' })
    .eq('id', matchId)

  if (error) return { error: error.message }

  // A restored blocked match stays hidden while a block row exists — remove it in both directions.
  if (match.status === 'blocked') {
    const { error: blockError } = await serviceClient
      .from('blocks')
      .delete()
      .or(`and(blocker_id.eq.${match.coach_id},blocked_id.eq.${match.client_id}),and(blocker_id.eq.${match.client_id},blocked_id.eq.${match.coach_id})`)
    if (blockError) return { error: blockError.message }
  }

  await logAudit(adminId, 'restore_match', 'match', matchId, { from: match.status })
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function removeBlock(
  blockerId: string,
  blockedId: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'remove_block', 'user', blockerId, { blocked_id: blockedId })
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function resetDailySwipes(userId: string): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ANY_ADMIN)
  const serviceClient = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { error } = await serviceClient
    .from('usage_counters')
    .delete()
    .eq('user_id', userId)
    .eq('date', today)

  if (error) return { error: error.message }

  await logAudit(adminId, 'reset_daily_swipes', 'user', userId, { date: today })
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function giftPro(
  userId: string,
  days: number
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const serviceClient = createServiceClient()
  const now = new Date()
  const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

  // Role-specific tier so Coach Pro and Client Pro are distinguishable in reporting/MRR.
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  const tier = profile?.role === 'coach' ? 'coach_pro' : 'client_pro'

  const { data: existing, error: existingError } = await serviceClient
    .from('subscriptions')
    .select('id, provider, status')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) return { error: existingError.message }
  // The next RevenueCat webhook would overwrite the gift anyway, and editing a paid
  // subscription's period misrepresents billing.
  if (existing?.provider === 'revenuecat' && existing.status === 'active') {
    return { error: 'User has an active paid subscription — nothing to gift.' }
  }

  const payload = {
    tier,
    status: 'active',
    billing_period: null,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd,
  }

  const { error } = existing
    ? await serviceClient.from('subscriptions').update(payload).eq('id', existing.id)
    : await serviceClient.from('subscriptions').insert({ user_id: userId, ...payload })

  if (error) return { error: error.message }

  await logAudit(adminId, 'gift_pro', 'user', userId, { days, tier, period_end: periodEnd })
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function revokePro(userId: string): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('subscriptions')
    .update({ status: 'canceled', tier: 'free', current_period_end: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active')
    .or('provider.is.null,provider.neq.revenuecat')

  if (error) return { error: error.message }

  await logAudit(adminId, 'revoke_pro', 'user', userId, {})
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function resetSuperLikes(userId: string): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ANY_ADMIN)
  const serviceClient = createServiceClient()
  const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  const { error } = await serviceClient
    .from('super_like_usage')
    .delete()
    .eq('user_id', userId)
    .eq('month', month)

  if (error) return { error: error.message }

  await logAudit(adminId, 'reset_super_likes', 'user', userId, { month })
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function setProfileComplete(
  userId: string,
  role: 'coach' | 'client',
  value: boolean
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()
  const table = role === 'coach' ? 'coach_profiles' : 'client_profiles'

  const { error } = await serviceClient
    .from(table)
    .update({ is_complete: value })
    .eq('id', userId)

  if (error) return { error: error.message }

  await logAudit(adminId, 'update_profile', 'user', userId, { field: 'is_complete', to: value })
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

// Takedown for chat attachments: deletes the storage object (the only real removal) and clears
// the message's image_url. The message text, if any, is kept.
export async function removeMessageMedia(messageId: string): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { data: message, error: fetchError } = await serviceClient
    .from('messages')
    .select('id, match_id, image_url')
    .eq('id', messageId)
    .single()
  if (fetchError) return { error: fetchError.message }
  if (!message?.image_url) return { error: null }

  const path = chatMediaPath(message.image_url)
  if (path) {
    const { error: storageError } = await serviceClient.storage.from('chat-media').remove([path])
    if (storageError) return { error: storageError.message }
  }

  const { error } = await serviceClient
    .from('messages')
    .update({ image_url: null })
    .eq('id', messageId)
  if (error) return { error: error.message }

  await logAudit(adminId, 'remove_message_media', 'message', messageId, { match_id: message.match_id, path })
  revalidatePath('/', 'layout')
  return { error: null }
}

export async function endCoachBoost(userId: string): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const { error } = await createServiceClient()
    .from('coach_profiles')
    .update({ boosted_until: null })
    .eq('id', userId)
  if (error) return { error: error.message }
  await logAudit(adminId, 'end_coach_boost', 'user', userId)
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

// Certification proof review. Approval mirrors into coach_profiles.verified_certs via trigger.
export async function reviewCert(
  verificationId: string,
  decision: 'approved' | 'rejected',
  note?: string
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const serviceClient = createServiceClient()

  const { data: row, error } = await serviceClient
    .from('cert_verifications')
    .update({
      status: decision,
      review_note: decision === 'rejected' ? (note?.trim() || 'Could not verify this certificate.') : null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select('coach_id, cert_name')
    .single()
  if (error) return { error: error.message }

  await logAudit(adminId, decision === 'approved' ? 'approve_cert' : 'reject_cert', 'user', row.coach_id, {
    cert: row.cert_name,
    note,
  })
  revalidatePath('/verifications')
  revalidatePath(`/users/${row.coach_id}`)
  return { error: null }
}

// Review moderation: hidden reviews drop out of profiles and rating aggregates (trigger).
export async function setReviewStatus(
  reviewId: string,
  status: 'visible' | 'hidden'
): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(MODERATORS)
  const { data: row, error } = await createServiceClient()
    .from('reviews')
    .update({ status })
    .eq('id', reviewId)
    .select('reviewee_id')
    .single()
  if (error) return { error: error.message }
  await logAudit(adminId, status === 'hidden' ? 'hide_review' : 'unhide_review', 'review', reviewId, {
    reviewee_id: row.reviewee_id,
  })
  revalidatePath(`/users/${row.reviewee_id}`)
  return { error: null }
}

// Promo codes: free Pro periods redeemed in-app via redeem_promo_code().
export async function createPromoCode(data: {
  code: string
  days: number
  maxRedemptions: number | null
  expiresAt: string | null
  tier: 'any' | 'coach_pro' | 'client_pro'
  description: string | null
}): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const code = data.code.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { error: 'Code must be 3–32 letters, numbers, - or _' }
  if (!Number.isInteger(data.days) || data.days < 1 || data.days > 365) return { error: 'Days must be 1–365' }

  const { data: row, error } = await createServiceClient()
    .from('promo_codes')
    .insert({
      code,
      description: data.description,
      discount_type: 'trial_extension',
      discount_value: data.days,
      max_redemptions: data.maxRedemptions,
      expires_at: data.expiresAt,
      applies_to_tiers: data.tier === 'any' ? null : [data.tier],
      is_active: true,
    })
    .select('id')
    .single()
  if (error) return { error: error.code === '23505' ? 'That code already exists' : error.message }

  await logAudit(adminId, 'create_promo_code', 'promo_code', row.id, { code, days: data.days, tier: data.tier })
  revalidatePath('/promo-codes')
  return { error: null }
}

export async function setPromoCodeActive(id: string, active: boolean): Promise<{ error: string | null }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const { error } = await createServiceClient().from('promo_codes').update({ is_active: active }).eq('id', id)
  if (error) return { error: error.message }
  await logAudit(adminId, active ? 'activate_promo_code' : 'deactivate_promo_code', 'promo_code', id)
  revalidatePath('/promo-codes')
  return { error: null }
}

// Announcement to a segment: in-app notification for everyone targeted, plus an optional
// Expo push (sent from here with the recipients' stored tokens, 100 per request).
export async function broadcastAnnouncement(input: {
  title: string
  body: string
  audience: 'all' | 'coach' | 'client'
  city: string | null
  push: boolean
}): Promise<{ error: string | null; recipients: number; pushed: number }> {
  const adminId = await requireAdmin(ADMIN_ONLY)
  const title = input.title.trim().slice(0, 80)
  const body = input.body.trim().slice(0, 300)
  if (!title || !body) return { error: 'Title and message are required', recipients: 0, pushed: 0 }

  const supabase = createServiceClient()
  let query = supabase
    .from('profiles')
    .select('id, push_tokens')
    .eq('onboarding_completed', true)
    .eq('is_banned', false)
    .limit(10000)
  if (input.audience !== 'all') query = query.eq('role', input.audience)
  if (input.city) query = query.ilike('city', input.city)
  const { data: users, error } = await query
  if (error) return { error: error.message, recipients: 0, pushed: 0 }
  if (!users?.length) return { error: 'No users match that audience', recipients: 0, pushed: 0 }

  // One id per broadcast, stored on every notification and sent in the push, so tapping the push
  // opens this announcement in the app's notification centre.
  const broadcastId = crypto.randomUUID()
  for (let i = 0; i < users.length; i += 500) {
    const { error: insErr } = await supabase.from('notifications').insert(
      users.slice(i, i + 500).map((u) => ({
        user_id: u.id, type: 'announcement', payload: { title, body, broadcast_id: broadcastId },
      })),
    )
    if (insErr) return { error: insErr.message, recipients: i, pushed: 0 }
  }

  let pushed = 0
  if (input.push) {
    // A device can hold a token under more than one account (older app builds never released it on
    // sign-out), so send each token once — otherwise that phone gets the broadcast twice.
    const tokens = [...new Set(users.flatMap((u) => (Array.isArray(u.push_tokens) ? (u.push_tokens as string[]) : [])))]
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100)
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk.map((to) => ({ to, title, body, sound: 'default', data: { type: 'announcement', broadcast_id: broadcastId } }))),
      }).catch(() => null)
      if (res?.ok) pushed += chunk.length
    }
  }

  await logAudit(adminId, 'broadcast', 'announcement', adminId, {
    title, audience: input.audience, city: input.city, recipients: users.length, pushed,
  })
  return { error: null, recipients: users.length, pushed }
}
