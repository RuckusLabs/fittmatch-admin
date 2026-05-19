import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { BanPanel } from '@/components/BanPanel'
import { GrantAdminPanel } from '@/components/GrantAdminPanel'
import { ChangeRolePanel } from '@/components/ChangeRolePanel'
import { DeleteUserPanel } from '@/components/DeleteUserPanel'
import { MatchesPanel } from '@/components/MatchesPanel'
import { PhotoGallery } from '@/components/PhotoGallery'
import { ReportBadge } from '@/components/ReportBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Pencil } from 'lucide-react'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const [
    { data: profile },
    { data: subscription },
    { count: swipesGiven },
    { count: messagesSent },
    { data: reports },
    { data: auditLog },
    { data: adminUser },
    { data: authUser },
    { data: matches },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, coach_profiles(*), client_profiles(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('swiper_id', id),
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', id),
    supabase
      .from('reports')
      .select(
        'id, reason, priority, status, created_at, reporter:profiles!reports_reporter_id_fkey(full_name)'
      )
      .eq('reported_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('admin_audit_log')
      .select(
        'id, action, target_type, created_at, metadata, admin:profiles!admin_audit_log_admin_id_fkey(full_name)'
      )
      .eq('target_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', id)
      .maybeSingle(),
    supabase.auth.admin.getUserById(id),
    supabase
      .from('matches')
      .select(
        'id, status, created_at, last_message_at, last_message_preview, client_unread_count, coach_unread_count, coach:coach_profiles(id, title, profiles(full_name)), client:client_profiles(id, company_name, profiles(full_name))'
      )
      .or(`coach_id.eq.${id},client_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!profile) notFound()

  const coachProfile = (profile as any).coach_profiles
  const clientProfile = (profile as any).client_profiles
  // authUser is already the `data` field from getUserById: { user: User | null }
  const authData = (authUser as any)?.user ?? null

  const coachPhotos = coachProfile?.photos as Array<{ url: string; caption: string }> | null
  const clientPhotos = clientProfile?.photos as Array<{ url: string; caption: string }> | null

  function getInitials(name: string | null) {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const primaryPhotoUrl: string | null = coachProfile?.photo_url ?? clientProfile?.logo_url ?? null

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {primaryPhotoUrl && <AvatarImage src={primaryPhotoUrl} alt={profile.full_name ?? ''} />}
              <AvatarFallback className="text-lg">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold">
                    {profile.full_name ?? 'No name'}
                  </h1>
                  <Badge variant="secondary" className="capitalize">
                    {profile.role}
                  </Badge>
                  {profile.is_banned && (
                    <Badge variant="destructive">Banned</Badge>
                  )}
                  {subscription?.status === 'active' && (
                    <Badge className="capitalize bg-green-600">
                      {subscription.tier ?? 'Pro'}
                    </Badge>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/users/${id}/edit`}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit Profile
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {profile.email}
              </p>
              {profile.city && (
                <p className="text-sm text-muted-foreground">
                  {profile.city}
                  {profile.state ? `, ${profile.state}` : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Joined{' '}
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{swipesGiven ?? 0}</p>
              <p className="text-xs text-muted-foreground">Swipes given</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{matches?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{messagesSent ?? 0}</p>
              <p className="text-xs text-muted-foreground">Messages sent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific profile details */}
      {coachProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coach Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {coachProfile.title && (
              <p>
                <span className="font-medium">Title:</span> {coachProfile.title}
              </p>
            )}
            {coachProfile.bio && (
              <p>
                <span className="font-medium">Bio:</span> {coachProfile.bio}
              </p>
            )}
            {(coachProfile.hourly_rate_min || coachProfile.hourly_rate_max) && (
              <p>
                <span className="font-medium">Rate:</span>{' '}
                ${coachProfile.hourly_rate_min}–${coachProfile.hourly_rate_max}/hr
              </p>
            )}
            {coachProfile.specialties?.length > 0 && (
              <p>
                <span className="font-medium">Specialties:</span>{' '}
                {coachProfile.specialties.join(', ')}
              </p>
            )}
            {coachProfile.cf_video_uid && (
              <p className="text-muted-foreground">
                Has profile video (CF UID: {coachProfile.cf_video_uid})
              </p>
            )}
            <PhotoGallery photos={coachPhotos} primaryUrl={coachProfile.photo_url} primaryLabel="Profile photo" />
          </CardContent>
        </Card>
      )}

      {clientProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {clientProfile.company_name && (
              <p>
                <span className="font-medium">Company:</span>{' '}
                {clientProfile.company_name}
              </p>
            )}
            {clientProfile.company_type && (
              <p>
                <span className="font-medium">Type:</span>{' '}
                {clientProfile.company_type}
              </p>
            )}
            {clientProfile.bio && (
              <p>
                <span className="font-medium">Bio:</span> {clientProfile.bio}
              </p>
            )}
            {clientProfile.website && (
              <p>
                <span className="font-medium">Website:</span>{' '}
                <a
                  href={clientProfile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {clientProfile.website}
                </a>
              </p>
            )}
            <PhotoGallery photos={clientPhotos} primaryUrl={clientProfile.logo_url} primaryLabel="Company logo" />
          </CardContent>
        </Card>
      )}

      {/* Login & Auth Info */}
      {authData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Login & Auth Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="font-medium">Last sign-in:</span>{' '}
              {authData.last_sign_in_at
                ? new Date(authData.last_sign_in_at).toLocaleString()
                : '—'}
            </p>
            <p>
              <span className="font-medium">Email confirmed:</span>{' '}
              {authData.email_confirmed_at
                ? new Date(authData.email_confirmed_at).toLocaleString()
                : 'Not confirmed'}
            </p>
            <p>
              <span className="font-medium">Auth account created:</span>{' '}
              {authData.created_at
                ? new Date(authData.created_at).toLocaleString()
                : '—'}
            </p>
            {profile.signup_device_fingerprint && (
              <p>
                <span className="font-medium">Device fingerprint:</span>{' '}
                <span className="font-mono text-xs">{profile.signup_device_fingerprint}</span>
              </p>
            )}
            {profile.signup_user_agent && (
              <p className="text-xs text-muted-foreground break-all">
                <span className="font-medium not-italic">User-agent:</span> {profile.signup_user_agent}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Matches */}
      <MatchesPanel matches={(matches ?? []) as any} userId={id} />

      <div className="grid grid-cols-2 gap-6">
        {/* Reports against this user */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports Against</CardTitle>
          </CardHeader>
          <CardContent>
            {reports && reports.length > 0 ? (
              <div className="space-y-2">
                {reports.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <ReportBadge type="priority" value={r.priority} />
                      <Link
                        href={`/reports/${r.id}`}
                        className="hover:underline text-blue-600"
                      >
                        {r.reason}
                      </Link>
                    </div>
                    <ReportBadge type="status" value={r.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reports</p>
            )}
          </CardContent>
        </Card>

        {/* Ban panel */}
        <BanPanel
          userId={id}
          isBanned={profile.is_banned ?? false}
          bannedReason={profile.banned_reason}
        />
      </div>

      {/* Admin access + Change role */}
      <div className="grid grid-cols-2 gap-6">
        <GrantAdminPanel
          userId={id}
          isAdmin={!!adminUser}
          adminRole={(adminUser as any)?.role ?? null}
        />
        <ChangeRolePanel userId={id} currentRole={profile.role} />
      </div>

      {/* Audit log */}
      {auditLog && auditLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Actions History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLog.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between text-sm py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{entry.action}</p>
                    <p className="text-xs text-muted-foreground">
                      by {entry.admin?.full_name ?? 'Unknown'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      <DeleteUserPanel userId={id} email={profile.email} />
    </div>
  )
}
