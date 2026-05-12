import { createServiceClient } from '@/lib/supabase-server'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'

type SubRow = {
  id: string
  tier: string | null
  status: string | null
  billing_period: string | null
  current_period_end: string | null
  provider_subscription_id: string | null
  user: { full_name: string | null; email: string } | null
}

const TIER_MONTHLY_PRICE: Record<string, number> = {
  pro_monthly: 29,
  pro_annual: 199 / 12,
  coach_pro: 29,
  client_pro: 49,
  pro: 29,
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  trialing: 'secondary',
  canceled: 'outline',
  past_due: 'destructive',
}

export default async function SubscriptionsPage() {
  const supabase = createServiceClient()

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(
      'id, tier, status, billing_period, current_period_end, provider_subscription_id, user:profiles!subscriptions_user_id_fkey(full_name, email)'
    )
    .order('created_at', { ascending: false })
    .returns<SubRow[]>()

  const activeSubs = subs?.filter((s) => s.status === 'active') ?? []
  const mrr = activeSubs.reduce((sum, sub) => {
    const tier = sub.tier?.toLowerCase() ?? ''
    const price = TIER_MONTHLY_PRICE[tier] ?? 0
    return sum + price
  }, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="MRR (estimate)"
          value={`$${mrr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          description="Active subs × monthly price"
        />
        <StatCard title="Active Subscriptions" value={activeSubs.length} />
        <StatCard title="Total Subscriptions" value={subs?.length ?? 0} />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b">
          <p className="text-sm text-muted-foreground">
            {subs?.length ?? 0} subscriptions
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium">User</th>
              <th className="text-left px-4 py-2 font-medium">Tier</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Period</th>
              <th className="text-left px-4 py-2 font-medium">Renews</th>
              <th className="text-left px-4 py-2 font-medium">Provider ID</th>
            </tr>
          </thead>
          <tbody>
            {subs?.map((sub) => (
              <tr
                key={sub.id}
                className="border-b last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2.5">
                  <p className="font-medium">
                    {sub.user?.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sub.user?.email}
                  </p>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {sub.tier ?? '—'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    variant={
                      statusBadgeVariant[sub.status ?? ''] ?? 'outline'
                    }
                    className="capitalize text-xs"
                  >
                    {sub.status ?? '—'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground capitalize">
                  {sub.billing_period ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {sub.current_period_end
                    ? new Date(sub.current_period_end).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {sub.provider_subscription_id ? (
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                      {sub.provider_subscription_id.slice(0, 20)}…
                    </code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!subs?.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No subscriptions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
