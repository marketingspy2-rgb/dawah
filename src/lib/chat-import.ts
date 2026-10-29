import { zonedToUtc } from "./time";
import type { Beneficiary, ChatImport, DB, User } from "./types";

/**
 * Bringing WhatsApp conversations from staff phones into the platform, without touching
 * WhatsApp itself: the staff member exports a chat, shares it, or copies messages, and the
 * platform reads the text. Nothing here logs in to WhatsApp, so the number is never at risk.
 */

export type ParsedLine = { at: Date; sender: string; text: string };

/** Phones show times in the center's local time. */
const PHONE_TZ = "Asia/Riyadh";

const AMPM = String.raw`([AaPp]\.?\s?[Mm]\.?)`;
// Android and iPhone "Export chat": date first. "[29/10/2026, 10:15:30 PM] Name: text" or "29/10/2026, 22:15 - Name: text"
const EXPORT_RE = new RegExp(String.raw`^\[?(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*${AMPM}?\]?\s*(?:[-–]\s*)?([^:]{1,60}?):\s([\s\S]*)$`);
// Messages copied from a chat on Android: time first. "[10:15 PM, 29/10/2026] Name: text"
const COPY_RE = new RegExp(String.raw`^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\s*${AMPM}?,\s*(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})\]\s*([^:]{1,60}?):\s([\s\S]*)$`);

const SKIP_RE = /omitted|<Media|<attached|محذوف|تم حذف|was deleted|^null$/i;

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Arabic phones write digits, commas and AM/PM differently, and add invisible direction marks. */
function normalize(raw: string) {
  return raw
    .replace(/\r/g, "")
    .replace(/[‎‏‪-‮⁦-⁩﻿]/g, "")
    .replace(/[  ]/g, " ")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/،/g, ",")
    .replace(/(\d{1,2}:\d{2}(?::\d{2})?)\s*ص(?=[\s\],])/g, "$1 AM")
    .replace(/(\d{1,2}:\d{2}(?::\d{2})?)\s*م(?=[\s\],])/g, "$1 PM");
}

type Raw = { a: string; b: string; c: string; hh: string; mm: string; ss?: string; ampm?: string; sender: string; text: string };

function matchLine(line: string): Raw | null {
  let m = line.match(EXPORT_RE);
  if (m) return { a: m[1], b: m[2], c: m[3], hh: m[4], mm: m[5], ss: m[6], ampm: m[7], sender: m[8], text: m[9] };
  m = line.match(COPY_RE);
  if (m) return { hh: m[1], mm: m[2], ss: m[3], ampm: m[4], a: m[5], b: m[6], c: m[7], sender: m[8], text: m[9] };
  return null;
}

/** Reads an exported or copied WhatsApp chat. Lines that are not messages are joined to the message above. */
export function parseWhatsAppExport(input: string): ParsedLine[] {
  const raws: Raw[] = [];
  for (const line of normalize(input).split("\n")) {
    const r = matchLine(line);
    if (r) raws.push(r);
    else if (raws.length && line.trim()) raws[raws.length - 1].text += `\n${line}`;
  }
  // Day or month first? Decide once for the whole file from any date that can only be read one way.
  const dayFirst = raws.some((r) => r.a.length < 4 && +r.a > 12) || !raws.some((r) => r.a.length < 4 && +r.b > 12);

  const out: ParsedLine[] = [];
  for (const r of raws) {
    let year: number, month: number, day: number;
    if (r.a.length === 4) [year, month, day] = [+r.a, +r.b, +r.c];
    else {
      year = +r.c < 100 ? 2000 + +r.c : +r.c;
      [day, month] = dayFirst ? [+r.a, +r.b] : [+r.b, +r.a];
    }
    let hour = +r.hh;
    if (r.ampm) {
      const pm = /p/i.test(r.ampm);
      if (pm && hour < 12) hour += 12;
      if (!pm && hour === 12) hour = 0;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23) continue;
    const ms = zonedToUtc(year, month, day, hour, PHONE_TZ) + +r.mm * 60_000 + (r.ss ? +r.ss : 0) * 1000;
    const text = r.text.trim();
    if (Number.isNaN(ms) || !text || SKIP_RE.test(text)) continue;
    out.push({ at: new Date(ms), sender: r.sender.trim(), text });
  }
  return out;
}

export function summarize(lines: ParsedLine[]) {
  const counts = new Map<string, number>();
  for (const l of lines) counts.set(l.sender, (counts.get(l.sender) ?? 0) + 1);
  return {
    count: lines.length,
    from: lines[0]?.at ?? null,
    to: lines[lines.length - 1]?.at ?? null,
    senders: [...counts.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n),
  };
}

const digits = (s: string) => s.replace(/\D/g, "");
const words = (s: string) => s.toLowerCase().split(/\s+/).filter((w) => w.length > 1);

/** How well a sender's name in the chat matches a beneficiary: saved names and phone numbers both count. */
export function senderMatches(sender: string, b: Beneficiary) {
  const d = digits(sender);
  if (d.length >= 7 && digits(b.phone).endsWith(d.slice(-9))) return 3;
  const s = sender.toLowerCase();
  const name = words(b.name);
  if (name.length && name.every((w) => s.includes(w))) return 2;
  if (name[0] && s.includes(name[0])) return 1;
  return 0;
}

/** Which sender is the beneficiary. The other side is the staff member. */
export function guessBeneficiarySender(lines: ParsedLine[], b: Beneficiary, staff: User | null) {
  const senders = summarize(lines).senders.map((s) => s.name);
  if (!senders.length) return null;
  const best = senders.map((s) => ({ s, score: senderMatches(s, b) })).sort((x, y) => y.score - x.score)[0];
  if (best.score > 0) return best.s;
  const me = staff ? words(staff.name)[0] : null;
  const notMe = senders.filter((s) => !(me && s.toLowerCase().includes(me)) && !/^(you|أنت|انت)$/i.test(s));
  return notMe.length === 1 || notMe.length < senders.length ? notMe[0] : senders[0];
}

/** The best matches among the beneficiaries this person can act on, for a chat shared without a file to attach it to. */
export function suggestBeneficiaries(lines: ParsedLine[], list: Beneficiary[]) {
  const senders = summarize(lines).senders.map((s) => s.name);
  return list
    .map((b) => ({ b, score: Math.max(0, ...senders.map((s) => senderMatches(s, b))) }))
    .filter((x) => x.score > 0)
    .sort((a, c) => c.score - a.score)
    .map((x) => x.b);
}

/** Adds the messages that are not in the file yet, and records the import. Returns how many were new. */
export function applyImport(db: DB, user: User, b: Beneficiary, lines: ParsedLine[], them: string, source: ChatImport["source"]) {
  const seen = new Set(db.messages.filter((m) => m.beneficiaryId === b.id).map((m) => `${Math.floor(new Date(m.at).getTime() / 60_000)}|${m.text.trim()}`));
  const author = db.users.find((u) => u.id === b.assignedTo) ?? user;
  let added = 0;
  for (const line of lines) {
    const key = `${Math.floor(line.at.getTime() / 60_000)}|${line.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const inbound = line.sender === them;
    db.messages.push({
      id: newId("M"),
      beneficiaryId: b.id,
      direction: inbound ? "in" : "out",
      text: line.text,
      translation: null,
      at: line.at.toISOString(),
      authorId: inbound ? null : author.id,
      status: inbound ? null : "read",
      kind: "imported",
    });
    added++;
  }
  if (added) db.messages.sort((a, c) => a.at.localeCompare(c.at));
  db.imports.push({ id: newId("IM"), beneficiaryId: b.id, userId: user.id, source, added, at: new Date().toISOString() });
  return added;
}

const MAX_SHARE = 1_000_000;

/** Keeps shared text until the staff member picks whose file it belongs to. Old shares are dropped after two days. */
export function stageShare(db: DB, text: string, fileName: string | null, userId: string | null) {
  let body = text;
  if (body.length > MAX_SHARE) {
    // Very long chats: keep the most recent part, starting at a whole line.
    body = body.slice(-MAX_SHARE);
    body = body.slice(body.indexOf("\n") + 1);
  }
  const now = Date.now();
  db.shares = db.shares.filter((s) => now - new Date(s.at).getTime() < 2 * 86_400_000);
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  db.shares.push({ id, userId, text: body, fileName, at: new Date(now).toISOString() });
  return id;
}

// ---------- Zip (iPhone exports a chat as a .zip holding _chat.txt) ----------

async function inflate(data: Uint8Array) {
  const stream = new Blob([data as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Returns the text of the first .txt file in a zip, or null. Reads the central directory, so it handles any zip writer. */
export async function textFromZip(bytes: Uint8Array): Promise<string | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!/\.txt$/i.test(name) || name.startsWith("__MACOSX")) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    if (method === 0) return decoder.decode(data);
    if (method === 8) return decoder.decode(await inflate(data));
  }
  return null;
}

/** Text from an uploaded or shared file: a .txt export, or an iPhone .zip export. */
export async function textFromFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return (await textFromZip(bytes)) ?? "";
  return new TextDecoder().decode(bytes);
}
