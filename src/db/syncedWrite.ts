import type { Table } from 'dexie';

// Phase 1: thin pass-through to Dexie. Phase 6 will extend each helper to
// enqueue sync records, so every callsite stays untouched when cloud sync lands.
// Use bulkDelete (not table.clear) per the music-app gotcha — clear() skips
// deleting hooks that the sync layer relies on.

export async function syncedPut<T>(table: Table<T, string>, value: T): Promise<string> {
  return (await table.put(value)) as string;
}

export async function syncedAdd<T>(table: Table<T, string>, value: T): Promise<string> {
  return (await table.add(value)) as string;
}

export async function syncedBulkPut<T>(table: Table<T, string>, values: T[]): Promise<void> {
  await table.bulkPut(values);
}

export async function syncedUpdate<T>(
  table: Table<T, string>,
  id: string,
  changes: Partial<T>,
): Promise<number> {
  return await table.update(id, changes as object);
}

export async function syncedDelete<T>(table: Table<T, string>, id: string): Promise<void> {
  await table.delete(id);
}

export async function syncedBulkDelete<T>(table: Table<T, string>, ids: string[]): Promise<void> {
  await table.bulkDelete(ids);
}
