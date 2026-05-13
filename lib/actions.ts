'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase-server'
import type { Database } from '@/types/database'

async function getCurrentAdminId(): Promise<string | null> {
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
  return user?.id ?? null
}

export async function logAudit(
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>
) {
  const serviceClient = createServiceClient()
  const adminId = await getCurrentAdminId()
  await serviceClient.from('admin_audit_log').insert({
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
  notes: string
): Promise<{ error: string | null }> {
  const serviceClient = createServiceClient()
  const adminId = await getCurrentAdminId()

  const { data: report } = await serviceClient
    .from('reports')
    .select('reported_id')
    .eq('id', reportId)
    .single()

  const { error } = await serviceClient
    .from('reports')
    .update({
      status: 'resolved',
      resolution_action: action,
      resolution_notes: notes,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) return { error: error.message }

  if (action === 'user_banned' && report?.reported_id) {
    await banUser(report.reported_id, notes || 'Banned via report resolution')
  }

  await logAudit('resolve_report', 'report', reportId, { action, notes })
  revalidatePath('/reports')
  revalidatePath(`/reports/${reportId}`)
  revalidatePath('/')
  return { error: null }
}

export async function banUser(
  userId: string,
  reason: string
): Promise<{ error: string | null }> {
  const serviceClient = createServiceClient()
  const adminId = await getCurrentAdminId()

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

  await logAudit('ban_user', 'user', userId, { reason })
  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  revalidatePath('/')
  return { error: null }
}

export async function unbanUser(
  userId: string
): Promise<{ error: string | null }> {
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

  await logAudit('unban_user', 'user', userId, {})
  revalidatePath('/users')
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function removeListing(
  listingId: string
): Promise<{ error: string | null }> {
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('job_listings')
    .update({ status: 'removed' })
    .eq('id', listingId)

  if (error) return { error: error.message }

  await logAudit('remove_listing', 'listing', listingId, {})
  revalidatePath('/listings')
  return { error: null }
}

export async function grantAdminRole(
  userId: string,
  role: string
): Promise<{ error: string | null }> {
  const serviceClient = createServiceClient()
  const adminId = await getCurrentAdminId()

  const { error } = await serviceClient.from('admin_users').upsert({
    user_id: userId,
    role,
    granted_by: adminId,
    granted_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  await logAudit('grant_admin_role', 'user', userId, { role })
  return { error: null }
}

export async function createUser(
  email: string,
  fullName: string,
  role: 'coach' | 'client',
  extras?: { company_name?: string; company_type?: string }
): Promise<{ error: string | null; userId: string | null }> {
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

  await logAudit('create_user', 'user', userId, { email, role })
  revalidatePath('/users')
  return { error: null, userId }
}

export async function revokeAdminRole(
  userId: string
): Promise<{ error: string | null }> {
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('admin_users')
    .delete()
    .eq('user_id', userId)

  if (error) return { error: error.message }

  await logAudit('revoke_admin_role', 'user', userId, {})
  revalidatePath(`/users/${userId}`)
  return { error: null }
}

export async function markReportsAsReviewing(
  reportIds: string[]
): Promise<{ error: string | null }> {
  if (!reportIds.length) return { error: null }
  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('reports')
    .update({ status: 'reviewing' })
    .in('id', reportIds)

  if (error) return { error: error.message }

  await logAudit('bulk_mark_reviewing', 'reports', reportIds[0], {
    count: reportIds.length,
    ids: reportIds,
  })
  revalidatePath('/reports')
  return { error: null }
}
