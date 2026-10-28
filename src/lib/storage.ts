import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Local storage for the demo: one JSON file next to the app.
 * The Cloudflare build swaps this module for storage.cloudflare.ts (see vite.config.ts).
 */
const FILE = path.join(process.cwd(), "data", "db.json");

export type Snapshot = { rev: number; data: string };

/** Returns the stored snapshot, "same" when `knownRev` is still current, or null when nothing is stored. */
export async function readSnapshot(knownRev: number | null): Promise<Snapshot | "same" | null> {
  // One Node process owns the file, so the in-memory copy is always current once loaded.
  if (knownRev !== null) return "same";
  try {
    return { rev: 1, data: fs.readFileSync(FILE, "utf8") };
  } catch {
    return null;
  }
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, snapshot.data);
  fs.renameSync(tmp, FILE);
}
