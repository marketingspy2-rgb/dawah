import { env } from "cloudflare:workers";
import type { Snapshot } from "./storage";

/**
 * Cloudflare storage for the demo: the whole dataset is one row in D1, so every
 * Worker instance sees the same data. A revision number avoids re-reading it when unchanged.
 */
type D1 = {
  prepare(sql: string): {
    bind(...values: unknown[]): { run(): Promise<unknown> };
    first<T>(): Promise<T | null>;
    run(): Promise<unknown>;
  };
};

const d1 = () => (env as unknown as { DB: D1 }).DB;
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await d1().prepare("CREATE TABLE IF NOT EXISTS demo_store (id INTEGER PRIMARY KEY, rev INTEGER NOT NULL, data TEXT NOT NULL)").run();
  tableReady = true;
}

export async function readSnapshot(knownRev: number | null): Promise<Snapshot | "same" | null> {
  await ensureTable();
  const head = await d1().prepare("SELECT rev FROM demo_store WHERE id = 1").first<{ rev: number }>();
  if (!head) return null;
  if (head.rev === knownRev) return "same";
  return d1().prepare("SELECT rev, data FROM demo_store WHERE id = 1").first<Snapshot>();
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await ensureTable();
  await d1()
    .prepare("INSERT INTO demo_store (id, rev, data) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET rev = excluded.rev, data = excluded.data")
    .bind(snapshot.rev, snapshot.data)
    .run();
}
