import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { StatCard } from '@/components/StatCard'
import { ReportBadge } from '@/components/ReportBadge'

type ReportRow = {
  id: string
  reason: string | null
  priority: string | null
  status: string | null
  created_at: string | null
  reporter: { full_name: string | null } | null
  reported: { full_name: string | null } | null
}

export default async function DashboardPage() {
  const supabase = createServiceClient()
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  const [
    { count: openReports },
    { count: totalUsers },
    { count: activeSubs },
    { count: newMatches },
    { data: recentReports },
    { data: signupRows },
  ] = await Promise.all([
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('reports')
      .select(
        'id, reason, priority, status, created_at, reporter:profiles!reports_reporter_id_fkey(full_name), reported:profiles!reports_reported_id_fkey(full_name)'
      )
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)
      .returns<ReportRow[]>(),
    supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', sevenDaysAgo),
  ])

  // Build sparkline data (last 7 days)
  const signupsByDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    signupsByDay[d.toISOString().split('T')[0]] = 0
  }
  for (const row of signupRows ?? []) {
    const day = (row.created_at ?? '').split('T')[0]
    if (day in signupsByDay) signupsByDay[day]++
  }
  const sparklineData = Object.entries(signupsByDay).map(([date, count]) => ({
    date,
    count,
  }))
  const maxSignups = Math.max(...sparklineData.map((d) => d.count), 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Reports" value={openReports ?? 0} />
        <StatCard title="Total Users" value={totalUsers ?? 0} />
        <StatCard title="Active Subscriptions" value={activeSubs ?? 0} />
        <StatCard
          title="New Matches (7d)"
          value={newMatches ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-white">
          <div className="px-4 py-3 border-b">
            <h3 className="font-medium text-sm">Recent Open Reports</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Priority</th>
                <th className="text-left px-4 py-2 font-medium">Reason</th>
                <th className="text-left px-4 py-2 font-medium">Reporter</th>
                <th className="text-left px-4 py-2 font-medium">Against</th>
                <th className="text-left px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentReports?.map((report) => (
                <tr
                  key={report.id}
                  className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <ReportBadge type="priority" value={report.priority} />
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
              {!recentReports?.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No open reports
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h3 className="font-medium text-sm mb-4">New Signups (7d)</h3>
          <div className="flex items-end gap-1.5 h-28 pb-6 relative">
            {sparklineData.map(({ date, count }) => (
              <div
                key={date}
                className="flex-1 flex flex-col items-center justify-end gap-0"
              >
                <div
                  className="w-full bg-blue-500 rounded-t min-h-[3px] transition-all"
                  style={{
                    height: `${Math.max((count / maxSignups) * 88, 3)}px`,
                  }}
                  title={`${count} signups on ${date}`}
                />
              </div>
            ))}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between">
              {sparklineData.map(({ date }) => (
                <span
                  key={date}
                  className="text-[10px] text-muted-foreground flex-1 text-center"
                >
                  {date.slice(5)}
                </span>
              ))}
            </div>
          </div>
          <p className="text-2xl font-bold mt-2">
            {signupRows?.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">total new users</p>
        </div>
      </div>
    </div>
  )
}
