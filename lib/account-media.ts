import type { SupabaseClient } from '@supabase/supabase-js';

// Delete a known account/match folder in bounded batches, including nested folders. Always
// read the first page after deleting it: an offset would skip files as the listing shrinks.
export async function removeMediaFolder(admin: SupabaseClient, bucket: string, prefix: string): Promise<void> {
  const storage = admin.storage.from(bucket);
  for (;;) {
    const { data, error } = await storage.list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!data?.length) return;
    const files: string[] = [];
    for (const object of data) {
      const path = `${prefix}/${object.name}`;
      if (object.id) files.push(path);
      else await removeMediaFolder(admin, bucket, path);
    }
    if (files.length) {
      const { error: removeError } = await storage.remove(files);
      if (removeError) throw removeError;
    }
  }
}

// Run before auth.admin.deleteUser, while the match IDs still exist. Account deletion
// cascades entire conversations, so their peers' attachments must not become orphaned.
export async function removeUserMedia(admin: SupabaseClient, userId: string): Promise<void> {
  await removeMediaFolder(admin, 'profile-photos', `coach/${userId}`);
  await removeMediaFolder(admin, 'profile-photos', `client/${userId}`);
  await removeMediaFolder(admin, 'cert-docs', userId);
  await removeMediaFolder(admin, 'coach-videos', userId);

  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: matches, error } = await admin.from('matches').select('id')
      .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
      .order('id').range(offset, offset + pageSize - 1);
    if (error) throw error;
    // Bounded concurrency avoids opening a request per conversation on large accounts.
    for (let i = 0; i < (matches?.length ?? 0); i += 4) {
      await Promise.all(matches!.slice(i, i + 4).map((match) => removeMediaFolder(admin, 'chat-media', match.id)));
    }
    if ((matches?.length ?? 0) < pageSize) return;
  }
}
