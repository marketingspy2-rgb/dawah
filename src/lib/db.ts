import "server-only";
import { readSnapshot, writeSnapshot } from "@/lib/storage";
import { applyRules } from "./rules";
import { createSeed, migrate } from "./seed";
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
  let snap: Awaited<ReturnType<typeof readSnapshot>>;
  try {
    snap = await readSnapshot(cache ? cacheRev : null);
  } catch (err) {
    // Storage is unreachable: keep serving the copy in memory rather than failing the page.
    console.error("demo storage read failed", err);
    if (cache) return cache;
    snap = null;
  }
  if (snap === "same" && cache) return cache;
  if (snap && snap !== "same") {
    try {
      const parsed = migrate(JSON.parse(snap.data) as DB);
      if (parsed) {
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
  try {
    await writeSnapshot({ rev: cacheRev, data: JSON.stringify(db) });
  } catch (err) {
    // The demo keeps working from memory; the change is lost when this instance restarts.
    console.error("demo storage write failed", err);
  }
}

/** Apply a change to the latest data and save it. */
export async function mutate<T>(fn: (db: DB) => T): Promise<T> {
  const db = await loadDb();
  const result = fn(db);
  applyRules(db);
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
