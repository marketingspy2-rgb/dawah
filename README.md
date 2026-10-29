# منصة دعوة (نسخة تجريبية)

نسخة عرض لمنصة متعددة اللغات تخدم الإدارة والمشرفين والدعاة، وتغطي مرحلتين: الدعوة، ثم تعليم المسلم الجديد ومتابعته.
البيانات كلها تجريبية، وواتساب محاكى داخل المنصة (لا تُرسل أي رسالة حقيقية).

## كيف تعمل المنصة

**الهيكل:** الإدارة ← مشرف لكل فريق ← دعاة ومعلمون ← مجموعات ← مستفيدون. كل شخص يرى ملفات من تحته فقط، والمشرف يتعامل مع كل ملفات فريقه.

- **الداعية** يدعو إلى الإسلام في «مجموعات حوار». عندما يُسلم الشخص ينتقل تلقائيًا إلى معلم بنفس اللغة والجنس وإلى «حلقة تعليم»، ويبقى الداعية مطّلعًا على تقدمه.
- **المعلم** يتابع حلقاته: كل حلقة تتبع مسار دروس، ولها أيام إرسال ووقت (ساعة ثابتة أو الوقت المفضل لكل شخص، بتوقيت بلده).
- **المستفيد** لا يدخل المنصة أبدًا. يصله الدرس على واتساب كرابط لصفحة واحدة بلغته: رسالة صوتية، فكرة واحدة، سؤال بنعم أو لا بزرين كبيرين، عمل صغير لليوم، وزر «اسأل معلمي» يعيده إلى واتساب.

## الصفحات

- **يومي / نظرة عامة:** للداعية والمعلم «قائمة اتصال اليوم» مرتبة حسب الأهمية مع سبب لكل شخص ومراعاة توقيته المحلي، وزر «أرسل من جوالي» يفتح واتساب على جوال الموظف برسالة جاهزة بلغة المستفيد ويسجّلها في ملفه. للمشرف والإدارة: ما يحتاج تدخلهم وحال كل داعية ومعلم.
- **المحادثات:** على الرقم الرسمي، مع ترجمة عربية، ونافذة الـ24 ساعة، والقوالب المعتمدة، وبطاقة لكل درس مرسل تُظهر هل فُتح أو أُكمل.
- **المجموعات:** أعضاء كل مجموعة وتقدمهم، وإعدادات الجدولة، وزر «أرسل للمجموعة» عبر واتساب.
- **جدول الدروس:** ما سيُرسل في الأيام السبعة القادمة، مع زر «أرسل الآن» لكل شخص.
- **مكتبة الدروس:** تحرير الدرس بالعربية والإنجليزية واللغات الست، مع معاينة رسالة واتساب وصفحة المستفيد، واعتماد المشرف، وأرقام كل درس.
- **ملف المستفيد:** رحلته من أول تواصل إلى الثبات، التعلّم، ملخص التسليم، الملاحظات، المهام، سجل الإسناد، واستيراد محادثة قديمة (ملف مثال في `samples/`).
- **الهيكل والصلاحيات:** شجرة الفرق، ومن يرى ماذا، وتغيير حالة الموظف، ونقل حالات من يغادر أو في إجازة.
- **المؤشرات:** الدعاة والمعلمون، المشرفون، مسار الدعوة، التعليم، واستخدام المنصة.
- **الأرقام الشخصية:** لمن يتواصل من جواله الشخصي، دون أي ربط بواتساب: زر «سجّل تواصلك» بضغطة واحدة، وصفحة «إضافة محادثة» تستقبل المحادثة المصدّرة من واتساب (بالمشاركة المباشرة بعد تثبيت المنصة على الجوال، أو برفع الملف، أو بلصق رسائل منسوخة).
- **إحصائيات التواصل:** المحادثات النشطة، وسرعة الرد، وتجاوب المستفيدين، والمنقطعون، وأنسب أوقات التواصل، ومن تأخر في إضافة محادثاته.
- **قواعد المتابعة:** للإدارة والمشرفين، مهام تنشئها المنصة وحدها (بعد كل تواصل، عند عدم الرد، أيام الاطمئنان على المسلم الجديد، المتعلم المنقطع، الحالة الجديدة) مع تشغيل كل قاعدة وضبط أيامها.
- **التحديثات:** كل تعديل على المنصة مشروح للمستخدم بلغة بسيطة.
- **الخصوصية:** الحالات الحساسة تظهر برقم بدل الاسم إلا للمسؤول عنها ومشرفه، وكل فتح للملف مسجّل.

## التشغيل على جهازك

يتطلب Node.js 22 أو أحدث.

```bash
npm install
npm run build
npm start          # ثم افتح http://localhost:3000
```

للتطوير: `npm run dev`. لإعادة البيانات التجريبية إلى بدايتها: `npm run reset` ثم أعد تشغيل الخادم (أو من حساب الإدارة: زر إعادة البيانات).

البيانات المحلية تُحفظ في `data/db.json`.

## المستخدمون التجريبيون

لا توجد كلمات مرور: صفحة الدخول تعرض المستخدمين، اختر أيًا منهم.

| الدور | الاسم | ماذا تجرّب |
| --- | --- | --- |
| الإدارة | عبدالله (الإدارة) | كل الفرق والمؤشرات |
| مشرف | خالد العتيبي | فريق الإسبانية والفرنسية، ونقل حالات Hamza Martinez (في إجازة) |
| مشرف | يوسف القحطاني | فريق آسيا |
| مشرفة | نورة السبيعي | القسم النسائي |
| داعية | Ibrahim Garcia | يومي، المحادثات، تحويل حالة إلى «أسلم» ومتابعتها بعد انتقالها للمعلم |
| معلم | Yusuf Hernandez | الحلقات، جدول الدروس، «أرسل للمجموعة»، ثم افتح رابط الدرس من المحادثة لترى صفحة المستفيد |

## النشر على Cloudflare

النسخة نفسها تعمل على Cloudflare Workers عبر [vinext](https://github.com/cloudflare/vinext)، والبيانات هناك تُحفظ في قاعدة D1 اسمها `dawah-demo` تُنشأ تلقائيًا عند أول نشر.

الطريقة الأسهل (بدون مفاتيح): من لوحة Cloudflare اختر **Workers & Pages** ثم **Create** ثم **Import a repository**، واختر هذا المستودع، وضع:

- **Project name:** `dawah`
- **Build command:** `npm run build:vinext`
- **Deploy command:** `npx wrangler deploy`

بعد كل دفع إلى الفرع `main` يُعاد النشر تلقائيًا. الرابط يكون `https://dawah.<حسابك>.workers.dev`، ويمكن ربط دومين خاص من **Settings → Domains & Routes**.

أوامر مفيدة:

```bash
npm run build:vinext   # بناء نسخة Cloudflare
npm run start:vinext   # تشغيلها محليًا بمحرك Cloudflare نفسه (بيانات D1 محلية)
npx wrangler deploy    # نشر يدوي (يتطلب wrangler login أو CLOUDFLARE_API_TOKEN)
```

## البنية

- Next.js (App Router) مع React Server Components وServer Actions، وTailwind CSS.
- `src/lib/db.ts` طبقة البيانات الوحيدة. التخزين في `src/lib/storage.ts` (ملف محلي) أو `src/lib/storage.cloudflare.ts` (D1)، ويُختار تلقائيًا حسب طريقة البناء. استبدالها لاحقًا بقاعدة بيانات حقيقية لا يمس الشاشات.
- `src/lib/seed.ts` يولّد البيانات التجريبية بنفس النتيجة كل مرة، والتواريخ نسبية لوقت التشغيل.
- `src/lib/logic.ts` قواعد الصلاحيات، والإسناد، ونافذة الـ24 ساعة، وحساب المؤشرات.
- `src/lib/chat-import.ts` قراءة محادثات واتساب المصدّرة والمنسوخة، و`src/app/api/share` يستقبل المشاركة من الجوال، و`src/lib/insights.ts` إحصائيات التواصل.
- `src/lib/daily.ts` قائمة الاتصال اليومية، و`src/lib/phone-send.ts` رسائل «أرسل من جوالي»، و`src/lib/rules.ts` قواعد المتابعة التي تعمل بعد كل تعديل على البيانات.
- `src/lib/updates.ts` سجل التحديثات الظاهر للمستخدمين. **أضف مدخلًا في أعلاه مع كل تعديل يلاحظه المستخدم**، بلغة بسيطة وبلا مصطلحات تقنية.

---

# Dawah platform (demo)

A demo of a multilingual platform for management, supervisors, callers and teachers, covering outreach and then teaching and following up new Muslims. Each supervisor leads callers and teachers, each of whom leads groups of beneficiaries. Learners never log in: lessons reach them on WhatsApp as a one-page link with a voice note, one idea, a yes/no check and one action for the day. All data is fake and WhatsApp is simulated.

**Run locally** (Node.js 22+): `npm install && npm run build && npm start`, then open http://localhost:3000. Reset demo data with `npm run reset`. There are no passwords: pick any user on the login page.

**Cloudflare:** the same app runs on Workers through vinext, with demo data in a D1 database (`dawah-demo`) that is created on first deploy. Connect the repo in the Cloudflare dashboard (Workers & Pages → Create → Import a repository) with build command `npm run build:vinext` and deploy command `npx wrangler deploy`.

**Personal numbers:** staff who talk to people from their own WhatsApp keep the platform up to date without connecting WhatsApp to anything: a one-tap contact log on each file, and an "Add a chat" page that takes an exported chat (shared straight from WhatsApp once the platform is installed on the phone, uploaded, or pasted). "Conversation stats" turns all of it into reply times, answer rates, silent beneficiaries and the best hours to reach people.

**Daily operations:** "My day" opens on a ranked call list with a reason for each person and their local time; "Send from my phone" opens WhatsApp on the staff member's own phone with a ready message in the beneficiary's language and records it. "Follow-up rules" (management and supervisors) create tasks on their own after contacts, missed answers, new-Muslim check-in days, silent learners and unreached new cases.

**Updates:** `src/lib/updates.ts` feeds the in-app "Updates" page. Add an entry at the top for every change users will notice, in plain words.
