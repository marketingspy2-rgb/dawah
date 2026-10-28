import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DB_VERSION, createSeed } from "./seed";
import type { DB } from "./types";

/**
 * Demo storage: one JSON file on the machine running the demo.
 * Every read and write goes through this module, so it can later be
 * swapped for a real database without touching the screens.
 */
const FILE = path.join(process.cwd(), "data", "db.json");

let cache: DB | null = null;

export function readDb(): DB {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
    if (parsed.version === DB_VERSION) {
      cache = parsed;
      return parsed;
    }
  } catch {
    // Missing or unreadable file: start from fresh demo data.
  }
  return resetDb();
}

export function writeDb(db: DB) {
  cache = db;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, FILE);
}

/** Apply a change and save it. */
export function mutate<T>(fn: (db: DB) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function resetDb(): DB {
  const db = createSeed(new Date());
  writeDb(db);
  return db;
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
