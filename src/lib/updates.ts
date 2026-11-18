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
    id: "2026-11-18-passwords",
    date: "2026-11-18",
    title: { ar: "الدخول بكلمة مرور، وسجل الاطلاع", en: "Password sign-in, and an access log" },
    items: [
      {
        kind: "new",
        ar: "صفحة «أسماء الدخول وكلمات المرور» للإدارة والمشرفين: اسم دخول وكلمة مرور لكل موظف. وكل شخص يغيّر كلمة مروره من «المزيد».",
        en: "A “Usernames and passwords” page for management and supervisors: a username and password for each staff member. Everyone can change their own password in More.",
        href: "/access",
      },
      {
        kind: "new",
        ar: "عند تفعيل «الدخول بكلمة مرور» من «المميزات» تختفي قائمة الأسماء من صفحة الدخول، ويدخل كل موظف باسمه وكلمة مروره. لا يُفعَّل حتى تضع الإدارة كلمة مرور لنفسها.",
        en: "Once “Password sign-in” is switched on in Features, the list of names leaves the sign-in page and everyone signs in with their own username and password. It cannot be switched on before management has a password.",
      },
      {
        kind: "new",
        ar: "«سجل الاطلاع» للإدارة: من دخل، ومحاولات الدخول الخاطئة، ومن فتح أي ملف، ومن غيّر ماذا ومتى.",
        en: "An “Access log” for management: sign-ins, failed attempts, who opened which file, and who changed what and when.",
        href: "/audit",
      },
    ],
  },
  {
    id: "2026-11-18-ask-scholars",
    date: "2026-11-18",
    title: { ar: "اسأل أهل العلم، وفحص المحتوى الشرعي", en: "Ask the scholars, and a religious content check" },
    items: [
      {
        kind: "new",
        ar: "في ملف كل مستفيد زر «اسأل أهل العلم»: اكتب السؤال الذي لم تعرف جوابه، فيصل لمشرفك. وصفحة «اسأل أهل العلم» في «المزيد» تجمع الأسئلة وأجوبتها، ويمكن طرح سؤال عام منها.",
        en: "Every file has an “Ask the scholars” button: write the question you could not answer and it goes to your supervisor. The “Ask the scholars” page in More lists questions and answers, and takes general questions too.",
        href: "/questions",
      },
      {
        kind: "new",
        ar: "يظهر للمشرف والإدارة في «يومي» عدد الأسئلة التي تنتظر جوابهم. والجواب يُحفظ في ملف المستفيد كملاحظة، فيظهر للداعية في قائمة اليوم ليوصله.",
        en: "Supervisors and management see on My day how many questions wait for them. The answer is saved on the file as a note, so it shows on the caller's list to pass on.",
      },
      {
        kind: "new",
        ar: "فحص المحتوى الشرعي: في محرر الدروس وفي الأجوبة تنبيه إذا ذُكر حكم صريح (يجوز، حرام…) أو آية أو حديث بلا مصدر، ليراجعه من عنده علم قبل الإرسال.",
        en: "Religious content check: the lesson editor and answers flag outright rulings (permitted, forbidden…) and verses or hadith without a source, for someone with knowledge to check before sending.",
      },
    ],
  },
  {
    id: "2026-11-18-capture-links",
    date: "2026-11-18",
    title: { ar: "رابط ورمز QR لكل مصدر تعرّف", en: "A link and QR code for every source" },
    items: [
      {
        kind: "new",
        ar: "صفحة «مصادر التعرّف ورموز QR» في «المزيد»: لكل مصدر (الجوال الدعوي، السيارة الدعوية، الزيارات الميدانية…) رابط ورمز QR للطباعة.",
        en: "A “Sources and QR codes” page in More: every source (the dawah phone, the dawah car, field visits…) gets a link and a printable QR code.",
        href: "/sources",
      },
      {
        kind: "new",
        ar: "من يمسح الرمز يختار لغته ويكتب اسمه ورقم واتساب، فتُفتح له حالة في هداية باسم المصدر، وتُسند لداعية يتكلم لغته، وتظهر في «يومي» عنده كأول تواصل. ومن سبق تسجيله لا تتكرر حالته، بل تصل ملاحظة لمن يتابعه.",
        en: "Whoever scans it picks a language and leaves a name and WhatsApp number. A Hidaya case opens under that source, goes to a caller who speaks the language, and shows on their My day as a first contact. Someone already known does not get a second file; whoever holds theirs gets a note instead.",
      },
      {
        kind: "new",
        ar: "في الصفحة نفسها: أي المصادر تأتي بأكثر الناس، وكم أسلم من كل مصدر.",
        en: "The same page shows which sources bring the most people, and how many from each embraced Islam.",
      },
    ],
  },
  {
    id: "2026-11-18-teacher-board",
    date: "2026-11-18",
    title: { ar: "لوحة المعلم: أنسب وقت لإرسال الدروس، وحال كل طالب", en: "Teacher's board: the best time to send lessons, and each learner" },
    items: [
      {
        kind: "new",
        ar: "«لوحة المعلم» في «المزيد»: لكل حلقة الساعة التي يفتح فيها الطلاب الدروس أسرع، وزر واحد لاعتمادها وقتًا للإرسال.",
        en: "“Teacher's board” in More: for each circle, the hour learners open lessons fastest, and one button to send at that hour.",
        href: "/teaching",
      },
      {
        kind: "new",
        ar: "في اللوحة نفسها حال كل طالب (ما فتحه، ونسبة إجاباته الصحيحة، وسرعة فتحه للدروس، وآخر نشاط)، والدروس التي يتعثر فيها الطلاب أكثر من غيرها.",
        en: "The same board shows each learner (what they opened, correct answers, how fast they open lessons, last activity) and the lessons learners get stuck on most.",
        href: "/teaching",
      },
      {
        kind: "improved",
        ar: "إذا وُجد وقت أنسب لإحدى حلقاتك يظهر لك تنبيه في «يومي».",
        en: "When one of your circles has a better time to send, a note shows on My day.",
        href: "/",
      },
    ],
  },
  {
    id: "2026-11-18-four-places",
    date: "2026-11-18",
    title: { ar: "أربع وجهات فقط، و«يومي» يجمع عملك كله", en: "Four places only, and “My day” holds all your work" },
    items: [
      {
        kind: "improved",
        ar: "القائمة صارت أربع وجهات: يومي، المحادثات، المستفيدون، المزيد. وعلى الجوال تجدها في شريط أسفل الشاشة قريبة من إصبعك.",
        en: "The menu is now four places: My day, Chats, People and More. On a phone they sit in a bar at the bottom of the screen, within reach of your thumb.",
      },
      {
        kind: "new",
        ar: "«يومي» صار الصفحة الأولى، وقائمة اليوم تضم حالات هداية التي حان موعد تواصلها حسب تصنيفها، مع أزرار اتصال وكتب وزيارة وهدية بضغطة واحدة.",
        en: "“My day” is now the first page, and today's list includes Hidaya cases due for contact by their classification, with one-tap Call, Books, Visit and Gift buttons.",
        href: "/",
      },
      {
        kind: "improved",
        ar: "«المستفيدون» يبدأ بالبرنامجين هداية والمسلم الجديد، وفي أعلى كل جدول مفتاح للتنقل بينهما. «إضافة محادثة» انتقلت إلى «المحادثات».",
        en: "“People” opens on the two programs, Hidaya and New Muslim, with a switch at the top of each sheet. “Add a chat” moved into Chats.",
        href: "/people",
      },
      {
        kind: "new",
        ar: "صفحة «المميزات» للإدارة: عطّل أي ميزة لا تحتاجها الآن فتختفي للجميع، وفعّلها متى احتجتها.",
        en: "A “Features” page for management: switch off any feature you do not need now and it disappears for everyone, then switch it back on when needed.",
        href: "/features",
      },
    ],
  },
  {
    id: "2026-10-29-daily-ops",
    date: "2026-10-29",
    title: { ar: "قائمة اتصال يومية، وإرسال من جوالك، ومتابعة تلقائية", en: "A daily call list, sending from your phone, and automatic follow-ups" },
    items: [
      {
        kind: "new",
        ar: "«قائمة اليوم» أعلى صفحة «يومي»: من تتواصل معه اليوم مرتبًا حسب الأهمية، ولكل شخص سبب واضح (ينتظر ردك، مهمة متأخرة، متعلم منقطع، درس اليوم، شخص جديد، حوار برد). ومن عنده ليل الآن ينزل للأسفل مع الوقت المناسب لمراسلته.",
        en: "“Today's list” at the top of “My day”: who to reach today, most important first, each with a clear reason (waiting for you, late task, a learner gone quiet, a lesson today, someone new, a conversation going cold). People for whom it is night now go lower, with the time to reach them.",
        href: "/",
      },
      {
        kind: "new",
        ar: "زر «أرسل من جوالي» في القائمة وفي ملف كل مستفيد: اختر الرسالة (الدرس القادم، اطمئنان، متابعة، أو نص حر) فتُكتب بلغة المستفيد، ثم تفتح واتساب على جوالك جاهزة للإرسال. الرسالة تُسجّل في ملفه تلقائيًا، فلا حاجة لتصدير المحادثة بعدها.",
        en: "A “Send from my phone” button in the list and on every file: pick the message (next lesson, check-in, follow-up, or your own text) and it is written in the beneficiary's language, then WhatsApp opens on your phone ready to send. The message is saved in their file, so there is no need to export the chat afterwards.",
      },
      {
        kind: "new",
        ar: "صفحة «قواعد المتابعة» للإدارة والمشرفين: المنصة تنشئ المهام وحدها بعد كل تواصل، وعند عدم الرد، وفي أيام الاطمئنان على المسلم الجديد، وعند انقطاع المتعلم، وإذا لم يُتواصل مع شخص جديد. يمكن تشغيل كل قاعدة أو إيقافها وتغيير أيامها.",
        en: "A “Follow-up rules” page for management and supervisors: the platform creates tasks on its own after every contact, when there is no answer, on check-in days for new Muslims, when a learner goes quiet, and when nobody has reached someone new. Each rule can be turned on or off and its days changed.",
        href: "/rules",
      },
      {
        kind: "improved",
        ar: "عند تسجيل «محادثة» أو «مكالمة» تُغلق مهام اليوم لنفس الشخص تلقائيًا، و«تراجع» يعيدها كما كانت.",
        en: "Logging “Chatted” or “Called” now closes that person's tasks for today, and “Undo” puts them back.",
      },
    ],
  },
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
