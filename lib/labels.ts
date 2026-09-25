// Display helpers for enum-ish columns shared with the mobile app's schema.

export type MatchStatus = 'active' | 'pending' | 'expired' | 'archived' | 'unmatched' | 'blocked'

// Legacy rows used NULL for an active mutual match.
export function normalizeMatchStatus(status: string | null): MatchStatus {
  return (status ?? 'active') as MatchStatus
}

const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  expired: 'Expired',
  archived: 'Archived',
  unmatched: 'Unmatched',
  blocked: 'Blocked',
}

export function matchStatusLabel(status: string | null): string {
  return MATCH_STATUS_LABEL[normalizeMatchStatus(status)] ?? status ?? 'Active'
}

export function matchStatusVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (normalizeMatchStatus(status)) {
    case 'blocked': return 'destructive'
    case 'unmatched':
    case 'expired': return 'secondary'
    case 'pending':
    case 'archived': return 'outline'
    default: return 'default'
  }
}

const TIER_LABEL: Record<string, string> = {
  free: 'Free',
  coach_pro: 'Coach Pro',
  client_pro: 'Client Pro',
  starter: 'Starter',
  pro: 'Pro',
  elite: 'Elite',
}

export function tierLabel(tier: string | null | undefined): string {
  if (!tier) return 'Free'
  return TIER_LABEL[tier] ?? tier
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Object path inside the chat-media bucket from a stored message image URL.
export function chatMediaPath(url: string): string | null {
  const marker = '/chat-media/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

// Hiring pipeline (applications.stage) — mirrors the mobile app's lib/constants.ts.
export const PIPELINE_STAGES = ['new', 'interviewing', 'offered', 'hired', 'not_a_fit'] as const
export const PIPELINE_STAGE_LABEL: Record<(typeof PIPELINE_STAGES)[number], string> = {
  new: 'New',
  interviewing: 'Interviewing',
  offered: 'Offered',
  hired: 'Hired',
  not_a_fit: 'Not a fit',
}
