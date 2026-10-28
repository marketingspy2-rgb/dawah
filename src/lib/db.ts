import "server-only";
import { readSnapshot, writeSnapshot } from "@/lib/storage";
import { DB_VERSION, createSeed } from "./seed";
import type { DB } from "./types";

/**
 * Demo storage. Every read and write goes through this module, so it can later be
 * swapped for a real database without touching the screens.
 *
 * Call `await loadDb()` once per request (getCurrentUser does it), then read with `readDb()`.
 */
let cache: DB | null = null;
let cacheRev: number | null = null;

export async function loadDb(): Promise<DB> {
  const snap = await readSnapshot(cache ? cacheRev : null);
  if (snap === "same" && cache) return cache;
  if (snap && snap !== "same") {
    try {
      const parsed = JSON.parse(snap.data) as DB;
      if (parsed.version === DB_VERSION) {
        cache = parsed;
        cacheRev = snap.rev;
        return parsed;
      }
    } catch {
      // Unreadable data: start again from fresh demo data.
    }
  }
  return resetDb();
}

export function readDb(): DB {
  if (!cache) throw new Error("loadDb() must run before readDb()");
  return cache;
}

async function saveDb(db: DB) {
  cache = db;
  cacheRev = (cacheRev ?? 0) + 1;
  await writeSnapshot({ rev: cacheRev, data: JSON.stringify(db) });
}

/** Apply a change to the latest data and save it. */
export async function mutate<T>(fn: (db: DB) => T): Promise<T> {
  const db = await loadDb();
  const result = fn(db);
  await saveDb(db);
  return result;
}

export async function resetDb(): Promise<DB> {
  const db = createSeed(new Date());
  await saveDb(db);
  return db;
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
