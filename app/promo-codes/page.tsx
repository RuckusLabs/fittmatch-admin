import { createServiceClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PromoCodeForm, PromoToggle } from '@/components/PromoCodeControls'
import { tierLabel } from '@/lib/labels'

export default async function PromoCodesPage() {
  const { data: codes } = await createServiceClient()
    .from('promo_codes')
    .select('id, code, description, discount_value, max_redemptions, current_redemptions, expires_at, applies_to_tiers, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="text-base">New code</CardTitle></CardHeader>
        <CardContent><PromoCodeForm /></CardContent>
      </Card>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Grants</th>
              <th className="px-4 py-2">For</th>
              <th className="px-4 py-2">Used</th>
              <th className="px-4 py-2">Expires</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {(codes ?? []).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2 font-mono">
                  {c.code} {!c.is_active && <Badge variant="secondary" className="ml-1">Off</Badge>}
                  {c.description && <div className="text-xs text-muted-foreground font-sans">{c.description}</div>}
                </td>
                <td className="px-4 py-2">{c.discount_value} days Pro</td>
                <td className="px-4 py-2">{c.applies_to_tiers?.length ? c.applies_to_tiers.map(tierLabel).join(', ') : 'Everyone'}</td>
                <td className="px-4 py-2">{c.current_redemptions ?? 0}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}</td>
                <td className="px-4 py-2">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2 text-right"><PromoToggle id={c.id} active={!!c.is_active} /></td>
              </tr>
            ))}
            {!codes?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No promo codes yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
