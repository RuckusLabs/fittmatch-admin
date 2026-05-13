import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { ReportBadge } from '@/components/ReportBadge'
import { Button } from '@/components/ui/button'
import { markReportsAsReviewing } from '@/lib/actions'
import { cn } from '@/lib/utils'

type ReportRow = {
  id: string
  reason: string | null
  priority: string | null
  status: string | null
  created_at: string | null
  reported_id: string | null
  reported_listing_id: string | null
  reporter: { full_name: string | null } | null
  reported: { full_name: string | null } | null
}

const STATUS_TABS = ['all', 'open', 'reviewing', 'resolved', 'dismissed']

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const currentStatus = status ?? 'all'
  const supabase = createServiceClient()

  let query = supabase
    .from('reports')
    .select(
      'id, reason, priority, status, created_at, reported_id, reported_listing_id, reporter:profiles!reports_reporter_id_fkey(full_name), reported:profiles!reports_reported_id_fkey(full_name)'
    )
    .order('created_at', { ascending: false })

  if (currentStatus !== 'all') {
    query = query.eq('status', currentStatus)
  }

  const { data: reports } = await query.returns<ReportRow[]>()

  async function bulkMarkReviewing(formData: FormData) {
    'use server'
    const ids = formData.getAll('report_ids') as string[]
    await markReportsAsReviewing(ids)
  }

  function getReportType(report: ReportRow) {
    if (report.reported_listing_id) return 'listing'
    if (report.reported_id) return 'user'
    return 'message'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-4">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/reports?status=${tab}`}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md font-medium transition-colors capitalize',
              currentStatus === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-gray-100'
            )}
          >
            {tab}
          </Link>
        ))}
      </div>

      <form action={bulkMarkReviewing}>
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm text-muted-foreground">
              {reports?.length ?? 0} reports
            </p>
            <Button type="submit" variant="outline" size="sm">
              Mark selected as reviewing
            </Button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-muted-foreground">
                <th className="px-4 py-2 w-8" />
                <th className="text-left px-4 py-2 font-medium">Priority</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Reason</th>
                <th className="text-left px-4 py-2 font-medium">Reporter</th>
                <th className="text-left px-4 py-2 font-medium">Against</th>
                <th className="text-left px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {reports?.map((report) => (
                <tr
                  key={report.id}
                  className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      name="report_ids"
                      value={report.id}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <ReportBadge type="priority" value={report.priority} />
                  </td>
                  <td className="px-4 py-2.5">
                    <ReportBadge type="status" value={report.status} />
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">
                    {getReportType(report)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {report.reason ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {report.reporter?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {report.reported?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {report.created_at
                      ? new Date(report.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
              {!reports?.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  )
}
