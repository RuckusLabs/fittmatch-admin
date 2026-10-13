export type ChatMediaIdentity = { matchId?: string; senderId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stored identifiers use Supabase's public URL shape even though the bucket is private.
// Split before decoding: URL normalization must not hide traversal or encoded separators.
// Mirrored in fittmatch-admin/lib/chat-media.ts; both use the same regression fixtures.
export function parseChatMediaPath(
  value: unknown,
  supabaseUrl: string | undefined,
  expected: ChatMediaIdentity = {},
): string | null {
  if (typeof value !== 'string' || !supabaseUrl || /[?#\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const base = new URL(supabaseUrl);
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password
      || base.search || base.hash || base.pathname !== '/') return null;
    const prefix = `${base.origin}/storage/v1/object/public/chat-media/`;
    if (!value.startsWith(prefix)) return null;
    const segments = value.slice(prefix.length).split('/').map((segment) => decodeURIComponent(segment));
    if (segments.length < 3 || segments.some((segment) => !segment || segment === '.' || segment === '..'
      || /[/\\%?#\u0000-\u001f\u007f]/.test(segment))) return null;
    if (!UUID.test(segments[0]) || !UUID.test(segments[1])) return null;
    if (expected.matchId !== undefined && segments[0].toLowerCase() !== expected.matchId.toLowerCase()) return null;
    if (expected.senderId !== undefined && segments[1].toLowerCase() !== expected.senderId.toLowerCase()) return null;
    return segments.join('/');
  } catch {
    // Bad historical rows must not break the conversation or the moderation page.
    return null;
  }
}
