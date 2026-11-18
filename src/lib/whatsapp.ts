import "server-only";
import { TEMPLATES, type TemplateId } from "./content";
import { featureOn } from "./features";
import { loadDb, mutate } from "./db";
import { firstName, lastInbound } from "./logic";
import type { Beneficiary, DB, Lang, Message } from "./types";

/**
 * The association's official WhatsApp number through Meta's WhatsApp Cloud API.
 *
 * Until the four settings below are configured, the platform keeps simulating WhatsApp
 * as before: messages are saved in the chat and nothing leaves the platform.
 *
 * - WHATSAPP_TOKEN: a permanent access token of the Meta app (System User token).
 * - WHATSAPP_PHONE_ID: the "Phone number ID" of the association's number.
 * - WHATSAPP_APP_SECRET: the app secret, to check that webhooks really come from Meta.
 * - WHATSAPP_VERIFY_TOKEN: any word you choose, typed again in Meta when adding the webhook.
 *
 * Outside the 24-hour window WhatsApp only accepts approved templates. Create them in
 * Meta with the names in TEMPLATE_NAMES, in each language, with the body parameters in
 * the order given in TEMPLATE_PARAMS.
 */
/** WHATSAPP_API_URL only points elsewhere for testing. */
const api = () => process.env.WHATSAPP_API_URL ?? "https://graph.facebook.com/v21.0";

export function whatsappConfig() {
  const token = process.env.WHATSAPP_TOKEN ?? "";
  const phoneId = process.env.WHATSAPP_PHONE_ID ?? "";
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? "";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  return { token, phoneId, appSecret, verifyToken, ready: !!(token && phoneId) };
}

/** Real sending is on when the number is configured and management has not switched it off. */
export function whatsappLive(db: DB) {
  return whatsappConfig().ready && featureOn(db, "whatsappApi");
}

export const TEMPLATE_NAMES: Record<TemplateId, string> = {
  lesson_ready: "dawah_lesson_ready",
  lesson_reminder: "dawah_lesson_reminder",
  checkin: "dawah_checkin",
  new_caller: "dawah_new_caller",
  followup: "dawah_followup",
};
/** Body parameters of each template, in order: {{1}}, {{2}}, … */
export const TEMPLATE_PARAMS: Record<TemplateId, string[]> = {
  lesson_ready: ["name", "title", "link"],
  lesson_reminder: ["name", "title", "link"],
  checkin: ["name", "caller"],
  new_caller: ["name", "caller"],
  followup: ["name", "caller"],
};
/** WhatsApp's language codes for template translations. */
const WA_LANG: Record<Lang, string> = { es: "es", fil: "fil", ur: "ur", bn: "bn", hi: "hi", fr: "fr" };

export const digits = (phone: string) => phone.replace(/\D/g, "");

type Payload = Record<string, unknown>;

async function post(body: Payload): Promise<{ id?: string; error?: string }> {
  const { token, phoneId } = whatsappConfig();
  try {
    const res = await fetch(`${api()}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok) return { error: json.error?.message ?? `HTTP ${res.status}` };
    return { id: json.messages?.[0]?.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "network error" };
  }
}

/** The text as the beneficiary will read it, with the lesson link filled in. */
export function finalText(m: Message, origin: string) {
  return m.eventId ? m.text.replace("{link}", `${origin}/l/${m.eventId}`) : m.text;
}

/** A pattern that matches a template's text whatever was filled into its {name}, {title}… */
function patternOf(template: string) {
  const parts = template.split(/\{\w+\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${parts.join("[\\s\\S]*?")}$`);
}

/** Which template a saved message came from, judged by its kind and its wording. */
function templateOf(m: Message, b: Beneficiary): TemplateId | null {
  if (m.kind !== "lesson" && m.kind !== "template") return null;
  const ids = (Object.keys(TEMPLATES) as TemplateId[]).filter((id) => (m.kind === "lesson") === id.startsWith("lesson"));
  return ids.find((id) => patternOf(TEMPLATES[id][b.language]).test(m.text)) ?? (m.kind === "lesson" ? "lesson_ready" : null);
}

/** The template's {{n}} values for a saved message: the first name, the lesson title and link, the caller. */
function varsFor(db: DB, m: Message, b: Beneficiary, origin: string): Record<string, string> {
  const ev = m.eventId ? db.events.find((e) => e.id === m.eventId) : undefined;
  const lesson = ev ? db.lessons.find((l) => l.id === ev.lessonId) : undefined;
  const author = db.users.find((u) => u.id === m.authorId);
  return {
    name: firstName(b),
    title: lesson ? (lesson.title[b.language] ?? lesson.title.en) : "",
    link: m.eventId ? `${origin}/l/${m.eventId}` : origin,
    caller: author?.name.split(" ")[0] ?? "",
  };
}

/**
 * Sends every outgoing message saved in the last few minutes that has not gone out yet,
 * then records WhatsApp's id on each, or why it failed. Called after an action saves
 * messages, and by the scheduler. Does nothing while the number is not configured.
 */
export async function deliverOutbox(origin: string) {
  const db = await loadDb();
  if (!whatsappLive(db)) return { delivered: 0, failed: 0 };
  const since = Date.now() - 10 * 60_000;
  const pending = db.messages.filter((m) => m.direction === "out" && m.status === "sent" && !m.waId && !m.error && !m.via && m.kind !== "imported" && new Date(m.at).getTime() >= since);
  if (!pending.length) return { delivered: 0, failed: 0 };
  const results = new Map<string, { id?: string; error?: string }>();
  for (const m of pending) {
    const b = db.beneficiaries.find((x) => x.id === m.beneficiaryId);
    if (!b || b.optedOut) continue;
    const to = digits(b.phone);
    const last = lastInbound(db, b.id);
    const open = !!last && Date.now() - new Date(last.at).getTime() < 24 * 3600_000;
    const tpl = templateOf(m, b);
    if (open) {
      results.set(m.id, await post({ to, type: "text", text: { preview_url: true, body: finalText(m, origin) } }));
    } else if (!tpl) {
      results.set(m.id, { error: "outside the 24-hour window: only an approved template can be sent" });
    } else {
      const v = varsFor(db, m, b, origin);
      results.set(
        m.id,
        await post({
          to,
          type: "template",
          template: {
            name: TEMPLATE_NAMES[tpl],
            language: { code: WA_LANG[b.language] },
            components: [{ type: "body", parameters: TEMPLATE_PARAMS[tpl].map((k) => ({ type: "text", text: v[k] ?? "" })) }],
          },
        }),
      );
    }
  }
  let delivered = 0;
  let failed = 0;
  await mutate((d) => {
    for (const [id, r] of results) {
      const m = d.messages.find((x) => x.id === id);
      if (!m) continue;
      if (r.id) {
        m.waId = r.id;
        delivered++;
      } else {
        m.status = "failed";
        m.error = r.error ?? "unknown error";
        failed++;
      }
    }
  });
  return { delivered, failed };
}

/** Where the platform is reached from outside: PUBLIC_URL, or the address of the current request. */
export function publicOrigin(h: Headers) {
  const set = process.env.PUBLIC_URL?.replace(/\/$/, "");
  if (set) return set;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Checks Meta's signature on a webhook: X-Hub-Signature-256 = "sha256=" + HMAC of the raw body. */
export async function validSignature(raw: string, header: string | null) {
  const { appSecret } = whatsappConfig();
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((x) => x.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
