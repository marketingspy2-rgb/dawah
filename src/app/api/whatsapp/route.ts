import { revalidatePath } from "next/cache";
import { loadDb, mutate, newId } from "@/lib/db";
import { duplicateOf, intakeCase } from "@/lib/intake";
import { validSignature, whatsappConfig, whatsappLive } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Meta calls this once with the word chosen as WHATSAPP_VERIFY_TOKEN when the webhook is added. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const { verifyToken } = whatsappConfig();
  if (verifyToken && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verifyToken) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

type WaMessage = { from: string; id: string; timestamp?: string; type: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } };
type WaStatus = { id: string; status: "sent" | "delivered" | "read" | "failed"; errors?: { title?: string; message?: string }[] };
type WaValue = { contacts?: { wa_id: string; profile?: { name?: string } }[]; messages?: WaMessage[]; statuses?: WaStatus[] };
type WaBody = { entry?: { changes?: { value?: WaValue }[] }[] };

const RANK = { sent: 1, delivered: 2, read: 3 } as const;

/** What a beneficiary writes to the association's number, and WhatsApp's delivery receipts. */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!(await validSignature(raw, request.headers.get("x-hub-signature-256")))) return new Response("bad signature", { status: 401 });
  const db0 = await loadDb();
  if (!whatsappLive(db0)) return new Response("ok");
  let body: WaBody;
  try {
    body = JSON.parse(raw) as WaBody;
  } catch {
    return new Response("ok");
  }
  const values = (body.entry ?? []).flatMap((e) => (e.changes ?? []).map((c) => c.value ?? {}));
  await mutate((db) => {
    for (const v of values) {
      for (const s of v.statuses ?? []) {
        const m = db.messages.find((x) => x.waId === s.id);
        if (!m) continue;
        if (s.status === "failed") {
          m.status = "failed";
          m.error = s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? "failed";
        } else if (m.status !== "failed" && (RANK[s.status] ?? 0) > (m.status && m.status in RANK ? RANK[m.status as keyof typeof RANK] : 0)) {
          m.status = s.status;
        }
      }
      for (const w of v.messages ?? []) {
        if (db.messages.some((x) => x.waId === w.id)) continue;
        const text = w.text?.body ?? w.button?.text ?? w.interactive?.button_reply?.title ?? w.interactive?.list_reply?.title ?? `[${w.type}]`;
        const at = w.timestamp ? new Date(Number(w.timestamp) * 1000).toISOString() : new Date().toISOString();
        const phone = `+${w.from.replace(/\D/g, "")}`;
        const known = duplicateOf(db, phone);
        if (known) {
          db.messages.push({ id: newId("M"), beneficiaryId: known.id, direction: "in", text, translation: null, at, authorId: null, status: null, kind: "text", waId: w.id });
          // Writing STOP opts out of messages, as WhatsApp's rules ask.
          if (/^\s*(stop|إيقاف|الغاء|إلغاء)\s*$/i.test(text)) known.optedOut = true;
          continue;
        }
        const name = v.contacts?.find((c) => c.wa_id === w.from)?.profile?.name?.slice(0, 80) || phone;
        const b = intakeCase(db, { name, phone, mark: "whatsapp", source: "واتساب", reason: "راسل رقم الجمعية على واتساب", action: "whatsapp_in" });
        if (b) db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "in", text, translation: null, at, authorId: null, status: null, kind: "text", waId: w.id });
      }
    }
  });
  revalidatePath("/", "layout");
  return new Response("ok");
}
