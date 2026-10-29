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

// The dataset is stored gzipped and base64-encoded (about a fifth of its size) to stay well within D1's limits.
const GZ = "gz:";

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(text: string) {
  const bin = atob(text);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pack(json: string) {
  return GZ + toBase64(await pipe(new TextEncoder().encode(json), new CompressionStream("gzip")));
}

async function unpack(stored: string) {
  if (!stored.startsWith(GZ)) return stored;
  return new TextDecoder().decode(await pipe(fromBase64(stored.slice(GZ.length)), new DecompressionStream("gzip")));
}

export async function readSnapshot(knownRev: number | null): Promise<Snapshot | "same" | null> {
  await ensureTable();
  const head = await d1().prepare("SELECT rev FROM demo_store WHERE id = 1").first<{ rev: number }>();
  if (!head) return null;
  if (head.rev === knownRev) return "same";
  const row = await d1().prepare("SELECT rev, data FROM demo_store WHERE id = 1").first<Snapshot>();
  return row ? { rev: row.rev, data: await unpack(row.data) } : null;
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await ensureTable();
  await d1()
    .prepare("INSERT INTO demo_store (id, rev, data) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET rev = excluded.rev, data = excluded.data")
    .bind(snapshot.rev, await pack(snapshot.data))
    .run();
}
