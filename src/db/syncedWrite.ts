import type { Table } from 'dexie';
import { supabase, STORE_TO_PH } from '../lib/supabase';

// Phase 1 → Phase 6. Each helper writes to Dexie (local-first, awaited) and
// then mirrors the change to Supabase write-through: fire-and-forget, wrapped
// so a cloud error can never break — or even slow — the local flow. The UI is
// driven entirely off Dexie; Supabase is best-effort replication at this stage.
// Use bulkDelete (not table.clear) per the music-app gotcha — clear() skips
// deleting hooks that the sync layer relies on.

// Background-replicate one change to the matching ph_ table. No-ops when the
// Supabase client isn't configured (local/dev) or the store isn't mapped.
// Never awaited by callers; all errors are swallowed.
function cloudWrite(
  storeName: string,
  run: (sb: NonNullable<typeof supabase>, ph: string) => PromiseLike<unknown>,
): void {
  if (!supabase) return;
  const ph = STORE_TO_PH[storeName];
  if (!ph) return;
  const sb = supabase;
  void (async () => {
    try {
      await run(sb, ph);
    } catch {
      /* write-through is best-effort — cloud failures don't touch local */
    }
  })();
}

export async function syncedPut<T>(table: Table<T, string>, value: T): Promise<string> {
  const id = (await table.put(value)) as string;
  cloudWrite(table.name, (sb, ph) => sb.from(ph).upsert(value as object));
  return id;
}

export async function syncedAdd<T>(table: Table<T, string>, value: T): Promise<string> {
  const id = (await table.add(value)) as string;
  cloudWrite(table.name, (sb, ph) => sb.from(ph).insert(value as object));
  return id;
}

export async function syncedBulkPut<T>(table: Table<T, string>, values: T[]): Promise<void> {
  await table.bulkPut(values);
  if (values.length > 0) {
    cloudWrite(table.name, (sb, ph) => sb.from(ph).upsert(values as object[]));
  }
}

export async function syncedUpdate<T>(
  table: Table<T, string>,
  id: string,
  changes: Partial<T>,
): Promise<number> {
  const n = await table.update(id, changes as object);
  // Upsert the *full* updated row (not just the changes) so the cloud copy
  // carries every column — including user_id, which RLS checks on insert.
  cloudWrite(table.name, async (sb, ph) => {
    const full = await table.get(id);
    if (full) await sb.from(ph).upsert(full as object);
  });
  return n;
}

export async function syncedDelete<T>(table: Table<T, string>, id: string): Promise<void> {
  await table.delete(id);
  cloudWrite(table.name, (sb, ph) => sb.from(ph).delete().eq('id', id));
}

export async function syncedBulkDelete<T>(table: Table<T, string>, ids: string[]): Promise<void> {
  await table.bulkDelete(ids);
  if (ids.length > 0) {
    cloudWrite(table.name, (sb, ph) => sb.from(ph).delete().in('id', ids));
  }
}
