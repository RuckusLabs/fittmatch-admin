import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { ReportBadge } from '@/components/ReportBadge'
import { ResolutionPanel } from '@/components/ResolutionPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type ProfileRef = { id: string; full_name: string | null; role: string | null; email: string; is_banned: boolean | null } | null
type ListingRef = { id: string; title: string; status: string | null; client_id: string } | null
type MessageRef = { id: string; body: string; sender_id: string } | null

type ReportDetail = {
  id: string
  reason: string | null
  details: string | null
  priority: string | null
  status: string | null
  resolution_action: string | null
  resolution_notes: string | null
  created_at: string | null
  evidence_urls: string[] | null
  reporter: ProfileRef
  reported_user: ProfileRef
  reported_listing: ListingRef
  reported_message: MessageRef
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: report } = await supabase
    .from('reports')
    .select(
      `id, reason, details, priority, status, resolution_action, resolution_notes, created_at, evidence_urls,
       reporter:profiles!reports_reporter_id_fkey(id, full_name, role, email, is_banned),
       reported_user:profiles!reports_reported_id_fkey(id, full_name, role, email, is_banned),
       reported_listing:job_listings!reports_reported_listing_id_fkey(id, title, status, client_id),
       reported_message:messages!reports_reported_message_id_fkey(id, body, sender_id)`
    )
    .eq('id', id)
    .single()
    .returns<ReportDetail>()

  if (!report) notFound()

  function getInitials(name: string | null) {
    if (!name) return '?'
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <ReportBadge type="priority" value={report.priority} />
        <ReportBadge type="status" value={report.status} />
        <span className="text-sm text-muted-foreground">
          {report.created_at
            ? new Date(report.created_at).toLocaleString()
            : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Reporter card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Reporter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.reporter ? (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(report.reporter.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/users/${report.reporter.id}`}
                    className="font-medium hover:underline text-blue-600"
                  >
                    {report.reporter.full_name ?? 'Unknown'}
                  </Link>
                  <p className="text-xs text-muted-foreground capitalize">
                    {report.reporter.role}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Unknown reporter</p>
            )}
          </CardContent>
        </Card>

        {/* Reported entity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium">
              Reported
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.reported_user ? (
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(report.reported_user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    href={`/users/${report.reported_user.id}`}
                    className="font-medium hover:underline text-blue-600"
                  >
                    {report.reported_user.full_name ?? 'Unknown'}
                  </Link>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground capitalize">
                      {report.reported_user.role}
                    </p>
                    {report.reported_user.is_banned && (
                      <Badge variant="destructive" className="text-xs py-0">
                        Banned
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : report.reported_listing ? (
              <div>
                <p className="font-medium">{report.reported_listing.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  Listing · {report.reported_listing.status}
                </p>
              </div>
            ) : report.reported_message ? (
              <div>
                <p className="text-sm font-medium">Message</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {report.reported_message.body}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Unknown entity</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reason + details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Reason
            </p>
            <p className="text-sm font-medium">{report.reason ?? '—'}</p>
          </div>
          {report.details && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Details
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {report.details}
              </p>
            </div>
          )}
          {report.evidence_urls && report.evidence_urls.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Evidence
              </p>
              <ul className="space-y-1">
                {report.evidence_urls.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <ResolutionPanel
        reportId={report.id}
        currentStatus={report.status}
        currentAction={report.resolution_action}
        currentNotes={report.resolution_notes}
      />
    </div>
  )
}
