/**
 * The platform's change log, shown on the "Updates" page in plain words for every user.
 * Add an entry at the top with every change that people will notice: what is new, what works
 * better, what was fixed, and where to find it. No technical terms.
 */

export type UpdateKind = "new" | "improved" | "fixed";

export type UpdateEntry = {
  id: string;
  date: string;
  title: { ar: string; en: string };
  items: { kind: UpdateKind; ar: string; en: string; href?: string }[];
};

export const UPDATES: UpdateEntry[] = [
  {
    id: "2026-10-29-quicklog-undo",
    date: "2026-10-29",
    title: { ar: "التراجع من «مهامي» وفهم أدق لمن ينتظر ردك", en: "Undo on “My tasks”, and a clearer “waiting for your reply”" },
    items: [
      {
        kind: "fixed",
        ar: "إذا ضغطت بالخطأ «محادثة» أو «مكالمة» أو «لم يرد» في «مهامي»، يظهر بجانبها زر «تراجع» لمدة 10 دقائق.",
        en: "If you tap “Chatted”, “Called” or “No answer” by mistake in “My tasks”, an “Undo” button shows next to it for 10 minutes.",
      },
      {
        kind: "improved",
        ar: "إذا رددت على المستفيد من جوالك وضغطت «محادثة» أو «مكالمة»، يختفي من «رسائل تنتظر ردك»، لأن المنصة صارت تعرف أنك رددت.",
        en: "If you answer someone from your phone and tap “Chatted” or “Called”, they leave “Waiting for your reply”, since the platform now knows you answered.",
      },
    ],
  },
  {
    id: "2026-10-29-personal-whatsapp",
    date: "2026-10-29",
    title: { ar: "متابعة المحادثات التي تتم من الجوالات الشخصية", en: "Following conversations held on personal phones" },
    items: [
      {
        kind: "new",
        ar: "زر «سجّل تواصلك» في ملف كل مستفيد وفي صفحة «يومي»: بعد أي محادثة أو مكالمة من جوالك اضغط ما حدث (محادثة، مكالمة، لم يرد، سأل سؤالًا، درس). ضغطة واحدة تكفي، ويمكنك التراجع خلال 10 دقائق.",
        en: "A “Log a contact” button on every file and on “My day”: after a chat or call from your phone, tap what happened (chatted, called, no answer, asked a question, lesson). One tap, and you can undo it for 10 minutes.",
      },
      {
        kind: "new",
        ar: "إذا سجّلت «لم يرد» تُضاف تلقائيًا مهمة لمحاولة التواصل غدًا، وإذا سجّلت أول محادثة مع شخص جديد تنتقل حالته إلى «تم التواصل».",
        en: "Logging “No answer” adds a task to try again tomorrow, and a first chat with someone new moves them to “Contacted”.",
      },
      {
        kind: "new",
        ar: "صفحة «إضافة محادثة»: أرسل محادثة واتساب من جوالك إلى ملف المستفيد. على أندرويد ثبّت المنصة على الجوال مرة واحدة، ثم من واتساب: تصدير الدردشة ← منصة دعوة. ويمكنك أيضًا رفع الملف أو لصق رسائل منسوخة.",
        en: "An “Add a chat” page: send a WhatsApp chat from your phone to the beneficiary's file. On Android, install the platform once, then in WhatsApp: Export chat → Dawah Platform. You can also upload the file or paste copied messages.",
        href: "/share",
      },
      {
        kind: "new",
        ar: "صفحة «إحصائيات التواصل»: المحادثات النشطة، وسرعة الرد، ونسبة تجاوب المستفيدين، ومن انقطع منذ أسبوعين، وأنسب أوقات التواصل، ومن تأخر في إضافة محادثاته.",
        en: "A “Conversation stats” page: active conversations, reply time, how many beneficiaries answer, who has gone silent for two weeks, the best times to reach people, and who is behind on adding their chats.",
        href: "/insights",
      },
      {
        kind: "improved",
        ar: "قراءة ملفات المحادثات صارت تفهم جوالات الآيفون والأندرويد، والجوالات المضبوطة على العربية، والرسائل المنسوخة، وتضبط الوقت على توقيت المركز.",
        en: "Chat files are now read from iPhone and Android, phones set to Arabic, and copied messages, with times set to the center's clock.",
      },
      {
        kind: "improved",
        ar: "يبقى تسجيل دخولك محفوظًا على جوالك 30 يومًا.",
        en: "You stay signed in on your phone for 30 days.",
      },
      {
        kind: "new",
        ar: "هذه الصفحة «التحديثات»: كل تعديل على المنصة يُشرح هنا بلغة بسيطة.",
        en: "This “Updates” page: every change to the platform is explained here in plain words.",
      },
    ],
  },
  {
    id: "2026-10-29-fix-1101",
    date: "2026-10-29",
    title: { ar: "إصلاح توقف الموقع", en: "The site no longer stops" },
    items: [
      {
        kind: "fixed",
        ar: "كان الموقع يظهر رسالة خطأ بعد التحديث الكبير. أصبحت البيانات تُحفظ بحجم أصغر، وإن تعذّر الحفظ لحظيًا تبقى الصفحات تعمل.",
        en: "The site showed an error page after the big update. Data is now stored in a smaller form, and pages keep working if saving fails for a moment.",
      },
    ],
  },
  {
    id: "2026-10-29-redesign",
    date: "2026-10-29",
    title: { ar: "تصميم جديد قائم على الفرق والمجموعات", en: "A new design built around teams and groups" },
    items: [
      { kind: "improved", ar: "تصميم أحدث وأوضح، مع قائمة جانبية تتغير حسب دورك.", en: "A cleaner, more modern design, with a side menu that fits your role." },
      {
        kind: "new",
        ar: "الهيكل واضح: الإدارة ← المشرفون ← الدعاة والمعلمون ← مجموعات المستفيدين. كل شخص يرى ملفات من تحته فقط.",
        en: "A clear structure: management → supervisors → callers and teachers → groups of beneficiaries. Everyone sees only the files below them.",
        href: "/team",
      },
      { kind: "new", ar: "صفحة «يومي» تجمع ما ينتظرك اليوم: رسائل بلا رد، دروس اليوم، مهام، ومستفيدون يحتاجون اطمئنانًا.", en: "“My day” gathers what is waiting today: unanswered messages, today's lessons, tasks, and people who need a check-in.", href: "/" },
      { kind: "new", ar: "تحضير الدروس بكل اللغات وجدولتها لكل مجموعة، مع زر إرسال عبر واتساب في كل مكان.", en: "Prepare lessons in every language and schedule them per group, with a WhatsApp send button everywhere.", href: "/lessons" },
      { kind: "new", ar: "صفحة الدرس للمستفيد بسيطة جدًا: استماع، وسؤال بزرين كبيرين، وزر للتواصل مع معلمه.", en: "The learner's lesson page is very simple: listen, a question with two big buttons, and a button to reach their teacher." },
    ],
  },
  {
    id: "2026-10-28-launch",
    date: "2026-10-28",
    title: { ar: "إطلاق النسخة التجريبية", en: "The demo goes live" },
    items: [
      { kind: "new", ar: "أول نسخة من المنصة: المستفيدون، المحادثات، الملاحظات، المهام، والمؤشرات، بست لغات.", en: "The first version: beneficiaries, chats, notes, tasks and metrics, in six languages." },
    ],
  },
];

export const LATEST_UPDATE = UPDATES[0].id;
