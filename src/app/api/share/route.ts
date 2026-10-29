import { cookies } from "next/headers";
import { stageShare, textFromFile } from "@/lib/chat-import";
import { loadDb, mutate } from "@/lib/db";
import { AFTER_LOGIN_COOKIE, USER_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The phone's share sheet posts here once the platform is installed on the home screen:
 * WhatsApp → Export chat → Dawah Platform, or selected text → Share.
 * The share is kept under a random id, and the staff member picks the beneficiary next.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  const parts: string[] = [];
  let fileName: string | null = null;
  for (const f of files) {
    const text = await textFromFile(f);
    if (text.trim()) {
      parts.push(text);
      fileName ??= f.name;
    }
  }
  for (const key of ["title", "text", "url"]) {
    const v = form.get(key);
    if (typeof v === "string" && v.trim() && !parts.some((p) => p.includes(v.trim()))) parts.push(v.trim());
  }

  const userId = (await cookies()).get(USER_COOKIE)?.value ?? null;
  const db = await loadDb();
  const known = userId && db.users.some((u) => u.id === userId) ? userId : null;
  const id = parts.length ? await mutate((d) => stageShare(d, parts.join("\n"), fileName, known)) : null;
  const target = id ? `/share/${id}` : "/share";
  const headers = new Headers({ Location: target });
  if (!known && id) headers.append("Set-Cookie", `${AFTER_LOGIN_COOKIE}=${target}; Path=/; Max-Age=3600; HttpOnly; SameSite=Lax`);
  return new Response(null, { status: 303, headers });
}

export function GET() {
  return new Response(null, { status: 303, headers: { Location: "/share" } });
}
