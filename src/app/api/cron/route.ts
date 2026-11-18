import { revalidatePath } from "next/cache";
import { loadDb, mutate } from "@/lib/db";
import { featureOn } from "@/lib/features";
import { sendDue } from "@/lib/sending";
import { deliverOutbox, publicOrigin } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * The scheduler. An outside timer (a Cloudflare cron trigger, cron-job.org, GitHub Actions…)
 * calls this every hour with the header "Authorization: Bearer <CRON_SECRET>".
 * Every learner whose lesson or reminder time has come gets it, then everything waiting
 * goes out through the official number.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("key") ?? "";
  if (!secret || given !== secret) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db0 = await loadDb();
  const sent = featureOn(db0, "autoLessons") ? await mutate((db) => sendDue(db)) : 0;
  const { delivered, failed } = await deliverOutbox(publicOrigin(request.headers));
  const at = new Date().toISOString();
  await mutate((db) => {
    db.settings.lastCron = { at, sent, delivered, failed };
  });
  revalidatePath("/", "layout");
  return Response.json({ at, sent, delivered, failed });
}

export const GET = run;
export const POST = run;
