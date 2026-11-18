import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Card, Empty, Notice, PageHeader, Pill } from "@/components/ui";
import { TEMPLATES, type TemplateId } from "@/lib/content";
import { readDb } from "@/lib/db";
import { featureOn, requireFeature } from "@/lib/features";
import { formatDate, relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { TEMPLATE_NAMES, TEMPLATE_PARAMS, publicOrigin, whatsappConfig, whatsappLive } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const L = {
  title: { ar: "رقم واتساب الرسمي", en: "Official WhatsApp number" },
  sub: {
    ar: "حتى يكتمل الربط تبقى المنصة كما هي: الرسائل تُحفظ في المحادثة ولا يخرج شيء. بعد الربط تخرج من رقم الجمعية، وتصل الردود إلى المحادثات وحدها.",
    en: "Until it is connected the platform works as before: messages are saved in the chat and nothing leaves. Once connected they go out from the association's number, and replies arrive in Chats by themselves.",
  },
  live: { ar: "متصل: الرسائل تخرج من رقم الجمعية", en: "Connected: messages go out from the association's number" },
  sim: { ar: "غير متصل بعد: الرسائل تُحفظ في المنصة فقط", en: "Not connected yet: messages are only saved in the platform" },
  steps: { ar: "خطوات الربط", en: "Connecting" },
  settings: { ar: "الإعدادات (تُضاف في Cloudflare كمتغيرات سرية)", en: "Settings (added in Cloudflare as secrets)" },
  webhook: { ar: "رابط الاستقبال (Webhook) في Meta", en: "Webhook URL in Meta" },
  cron: { ar: "رابط المجدول، يُستدعى كل ساعة", en: "Scheduler URL, called every hour" },
  templates: { ar: "القوالب التي تُعتمد في Meta", en: "Templates to approve in Meta" },
  templatesHint: {
    ar: "خارج نافذة 24 ساعة لا يقبل واتساب إلا قالبًا معتمدًا. أنشئ كل قالب بهذا الاسم بكل لغة، والمتغيرات بهذا الترتيب.",
    en: "Outside the 24-hour window WhatsApp only accepts an approved template. Create each one with this name in every language, with the variables in this order.",
  },
  lastRun: { ar: "آخر تشغيل للمجدول", en: "Last scheduler run" },
  never: { ar: "لم يعمل المجدول بعد.", en: "The scheduler has not run yet." },
  ranSent: { ar: "دروس وتذكيرات أُرسلت", en: "lessons and reminders sent" },
  ranDelivered: { ar: "خرجت عبر واتساب", en: "went out on WhatsApp" },
  ranFailed: { ar: "تعذّر إرسالها", en: "failed" },
  failures: { ar: "رسائل لم تصل", en: "Messages that did not go out" },
  set: { ar: "موجود", en: "Set" },
  missing: { ar: "ناقص", en: "Missing" },
  autoOff: { ar: "الإرسال الآلي للدروس معطّل من صفحة المميزات، فالمجدول يرسل ما ينتظر فقط.", en: "Automatic lessons is off on the features page, so the scheduler only sends what is waiting." },
} as const;

const STEPS = {
  ar: [
    "في Meta for Developers أنشئ تطبيقًا من نوع Business وأضف له WhatsApp، واربط رقم الجمعية.",
    "أنشئ System User وخذ له رمز وصول دائمًا (Token)، وانسخ Phone number ID ومفتاح التطبيق (App secret).",
    "أضف الإعدادات أدناه في Cloudflare، واختر كلمة سرية للتحقق وأخرى للمجدول.",
    "في Meta ضع رابط الاستقبال وكلمة التحقق، واشترك في messages.",
    "اعتمد القوالب الخمسة بكل لغة، ثم اضبط مؤقتًا يستدعي رابط المجدول كل ساعة.",
  ],
  en: [
    "In Meta for Developers create a Business app, add WhatsApp to it, and connect the association's number.",
    "Create a System User and get a permanent token, then copy the Phone number ID and the App secret.",
    "Add the settings below in Cloudflare, choosing one secret word for verification and another for the scheduler.",
    "In Meta enter the webhook URL and the verify word, and subscribe to messages.",
    "Get the five templates approved in every language, then set a timer that calls the scheduler URL every hour.",
  ],
};

export default async function WhatsAppPage() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  const lang = await getUiLang();
  const db = readDb();
  requireFeature(db, "whatsappApi");
  const cfg = whatsappConfig();
  const live = whatsappLive(db);
  const origin = publicOrigin(await headers());
  const now = Date.now();
  const env: [string, boolean][] = [
    ["WHATSAPP_TOKEN", !!cfg.token],
    ["WHATSAPP_PHONE_ID", !!cfg.phoneId],
    ["WHATSAPP_APP_SECRET", !!cfg.appSecret],
    ["WHATSAPP_VERIFY_TOKEN", !!cfg.verifyToken],
    ["CRON_SECRET", !!process.env.CRON_SECRET],
    ["PUBLIC_URL", !!process.env.PUBLIC_URL],
  ];
  const failed = db.messages.filter((m) => m.status === "failed").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
  const last = db.settings.lastCron;

  return (
    <>
      <PageHeader title={L.title[lang]} subtitle={L.sub[lang]} />
      <Notice tone={live ? "ok" : "info"}>{live ? L.live[lang] : L.sim[lang]}</Notice>
      {!featureOn(db, "autoLessons") && <Notice tone="warn">{L.autoOff[lang]}</Notice>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={L.steps[lang]}>
          <ol className="list-decimal space-y-1.5 ps-5 text-sm">
            {STEPS[lang].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Card>
        <Card title={L.settings[lang]}>
          <ul className="space-y-1.5 text-sm">
            {env.map(([k, ok]) => (
              <li key={k} className="flex items-center justify-between gap-2">
                <code dir="ltr" className="text-xs">
                  {k}
                </code>
                <Pill tone={ok ? "ok" : "warn"}>{ok ? L.set[lang] : L.missing[lang]}</Pill>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted">{L.webhook[lang]}</div>
              <code dir="ltr" className="block break-all rounded-lg bg-surface-2 px-2 py-1 text-xs">{`${origin}/api/whatsapp`}</code>
            </div>
            <div>
              <div className="text-xs text-muted">{L.cron[lang]}</div>
              <code dir="ltr" className="block break-all rounded-lg bg-surface-2 px-2 py-1 text-xs">{`${origin}/api/cron  (Authorization: Bearer CRON_SECRET)`}</code>
            </div>
          </div>
        </Card>
        <Card title={L.lastRun[lang]}>
          {last ? (
            <div className="space-y-1 text-sm">
              <div className="text-muted" title={formatDate(last.at, lang)}>
                {relTime(last.at, lang, now)}
              </div>
              <div>
                {last.sent} {L.ranSent[lang]} · {last.delivered} {L.ranDelivered[lang]} · {last.failed} {L.ranFailed[lang]}
              </div>
            </div>
          ) : (
            <Empty>{L.never[lang]}</Empty>
          )}
        </Card>
        <Card title={L.failures[lang]}>
          {failed.length ? (
            <ul className="divide-y divide-border text-sm">
              {failed.map((m) => {
                const b = db.beneficiaries.find((x) => x.id === m.beneficiaryId);
                return (
                  <li key={m.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{b ? (b.sensitive ? b.alias : b.name) : m.beneficiaryId}</span>
                      <span className="text-xs text-muted">{relTime(m.at, lang, now)}</span>
                    </div>
                    <div className="text-xs text-bad" dir="auto">
                      {m.error}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>{lang === "ar" ? "لا شيء." : "None."}</Empty>
          )}
        </Card>
      </div>
      <Card title={L.templates[lang]} className="mt-4">
        <p className="mb-3 text-sm text-muted">{L.templatesHint[lang]}</p>
        <ul className="divide-y divide-border text-sm">
          {(Object.keys(TEMPLATE_NAMES) as TemplateId[]).map((id) => (
            <li key={id} className="py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <code dir="ltr" className="font-medium">
                  {TEMPLATE_NAMES[id]}
                </code>
                <span dir="ltr" className="text-xs text-muted">
                  {TEMPLATE_PARAMS[id].map((p, i) => `{{${i + 1}}} = ${p}`).join(" · ")}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-line text-xs text-muted" dir="auto">
                {TEMPLATES[id][lang]}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
