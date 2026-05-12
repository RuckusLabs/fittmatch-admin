import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { BanPanel } from '@/components/BanPanel'
import { ReportBadge } from '@/components/ReportBadge'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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
    { count: matches },
    { count: messagesSent },
    { data: reports },
    { data: auditLog },
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
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .or(`client_id.eq.${id},coach_id.eq.${id}`),
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
  ])

  if (!profile) notFound()

  const coachProfile = (profile as any).coach_profiles
  const clientProfile = (profile as any).client_profiles

  function getInitials(name: string | null) {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
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
              <p className="text-2xl font-bold">{matches ?? 0}</p>
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
          </CardContent>
        </Card>
      )}

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
    </div>
  )
}
