# منصة دعوة (نسخة تجريبية)

نسخة عرض لمنصة متعددة اللغات تخدم الإدارة والمشرفين والدعاة، وتغطي مرحلتين: الدعوة، ثم تعليم المسلم الجديد ومتابعته.
البيانات كلها تجريبية، وواتساب محاكى داخل المنصة (لا تُرسل أي رسالة حقيقية).

## ما الذي تعرضه النسخة

- **يومي (للداعية):** رسائل تنتظر الرد، مسلمون جدد متباطئون، ملاحظات تتطلب تواصلًا، ومهام متأخرة واليوم والقادمة. بجانب كل حالة زر واتساب يفتح المحادثة مباشرة.
- **المحادثات:** على الرقم الرسمي، مع ترجمة عربية تحت كل رسالة، ونافذة الـ24 ساعة، والقوالب المعتمدة بست لغات.
- **ملف المستفيد:** ملخص تسليم جاهز، ملاحظات، مهام، سجل الإسناد، واستيراد محادثة واتساب قديمة (ملف مثال في `samples/`).
- **الفريق والتسليم:** نقل حالات داعية يغادر أو في إجازة إلى زملاء بنفس اللغة والجنس والأقل حملًا.
- **المسلمون الجدد:** الدروس تُرسل في الساعة المفضلة بتوقيت المستفيد، مع إنذار مبكر (أخضر، أصفر، أحمر).
- **المؤشرات:** أداء الدعاة، المشرفون، مسار الدعوة، التعلّم، واستخدام المنصة.
- **الخصوصية:** الحالات الحساسة تظهر باسم مستعار إلا للداعية المسؤول ومشرفه، وكل فتح للملف مسجّل.

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
| الإدارة | عبدالله (الإدارة) | لوحة المؤشرات كاملة |
| مشرف | خالد العتيبي | فريق أمريكا اللاتينية وأفريقيا، ونقل حالات Hamza Martinez (في إجازة) |
| مشرف | يوسف القحطاني | فريق آسيا |
| داعية | Ibrahim Garcia | يومي، المحادثات، استيراد محادثة Carlos Mendoza |

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

---

# Dawah platform (demo)

A demo of a multilingual platform for management, supervisors and callers, covering outreach and then teaching and following up new Muslims. All data is fake and WhatsApp is simulated.

**Run locally** (Node.js 22+): `npm install && npm run build && npm start`, then open http://localhost:3000. Reset demo data with `npm run reset`. There are no passwords: pick any user on the login page.

**Cloudflare:** the same app runs on Workers through vinext, with demo data in a D1 database (`dawah-demo`) that is created on first deploy. Connect the repo in the Cloudflare dashboard (Workers & Pages → Create → Import a repository) with build command `npm run build:vinext` and deploy command `npx wrangler deploy`.
