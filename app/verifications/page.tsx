import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase-server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CertReviewButtons } from '@/components/CertReviewButtons'

type Row = {
  id: string
  coach_id: string
  cert_name: string
  file_path: string
  status: string
  review_note: string | null
  created_at: string
  coach: { title: string | null; profiles: { full_name: string | null } | null } | null
}

const TABS = ['pending', 'approved', 'rejected'] as const

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: statusParam } = await searchParams
  const status = TABS.includes(statusParam as (typeof TABS)[number]) ? statusParam! : 'pending'
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('cert_verifications')
    .select('id, coach_id, cert_name, file_path, status, review_note, created_at, coach:coach_profiles(title, profiles(full_name))')
    .eq('status', status)
    .order('created_at', { ascending: status === 'pending' })
    .limit(100)
  const rows = (data ?? []) as unknown as Row[]

  // cert-docs is private — sign each proof for this page view.
  const signed = new Map<string, string>()
  if (rows.length) {
    const { data: urls } = await supabase.storage.from('cert-docs').createSignedUrls(rows.map((r) => r.file_path), 60 * 10)
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex gap-2 border-b pb-3">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/verifications?status=${t}`}
            className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${
              t === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-gray-100'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing {status}.</p>
      ) : (
        rows.map((r) => {
          const src = signed.get(r.file_path)
          return (
            <Card key={r.id}>
              <CardContent className="flex gap-4 p-4">
                {src ? (
                  <a href={src} target="_blank" rel="noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${r.cert_name} proof`} className="h-40 w-40 object-cover rounded border" />
                  </a>
                ) : (
                  <div className="h-40 w-40 rounded border flex items-center justify-center text-xs text-muted-foreground">
                    No file
                  </div>
                )}
                <div className="flex-1 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.cert_name}</span>
                    <Badge variant="secondary" className="capitalize">{r.status}</Badge>
                  </div>
                  <p>
                    <Link href={`/users/${r.coach_id}`} className="text-blue-600 hover:underline">
                      {r.coach?.profiles?.full_name ?? 'Coach'}
                    </Link>
                    {r.coach?.title ? <span className="text-muted-foreground"> · {r.coach.title}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">Submitted {new Date(r.created_at).toLocaleString()}</p>
                  {r.review_note && <p className="text-xs text-destructive">{r.review_note}</p>}
                  {r.status === 'pending' && <CertReviewButtons verificationId={r.id} />}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
