import type { Lang } from "./types";

export type Country = { code: string; ar: string; en: string; tz: string; dial: string; lang: Lang };

export const COUNTRIES: Country[] = [
  { code: "MX", ar: "المكسيك", en: "Mexico", tz: "America/Mexico_City", dial: "+52", lang: "es" },
  { code: "CO", ar: "كولومبيا", en: "Colombia", tz: "America/Bogota", dial: "+57", lang: "es" },
  { code: "PE", ar: "بيرو", en: "Peru", tz: "America/Lima", dial: "+51", lang: "es" },
  { code: "PH", ar: "الفلبين", en: "Philippines", tz: "Asia/Manila", dial: "+63", lang: "fil" },
  { code: "PK", ar: "باكستان", en: "Pakistan", tz: "Asia/Karachi", dial: "+92", lang: "ur" },
  { code: "BD", ar: "بنغلاديش", en: "Bangladesh", tz: "Asia/Dhaka", dial: "+880", lang: "bn" },
  { code: "IN", ar: "الهند", en: "India", tz: "Asia/Kolkata", dial: "+91", lang: "hi" },
  { code: "FR", ar: "فرنسا", en: "France", tz: "Europe/Paris", dial: "+33", lang: "fr" },
  { code: "CI", ar: "ساحل العاج", en: "Côte d'Ivoire", tz: "Africa/Abidjan", dial: "+225", lang: "fr" },
  { code: "CM", ar: "الكاميرون", en: "Cameroon", tz: "Africa/Douala", dial: "+237", lang: "fr" },
];

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code);
}

/** Guess a timezone from the phone number's country code. The caller can change it. */
export function guessCountryFromPhone(phone: string): Country | undefined {
  const clean = phone.replace(/[^\d+]/g, "");
  return [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => clean.startsWith(c.dial));
}

export type TemplateId = "lesson_ready" | "lesson_reminder" | "checkin" | "new_caller" | "followup";

/**
 * Message templates approved with Meta. Wording stays neutral on purpose:
 * a notification preview may be seen by family members.
 */
export const TEMPLATES: Record<TemplateId, { ar: string; en: string } & Record<Lang, string>> = {
  lesson_ready: {
    ar: "مرحبًا {name}، درسك الجديد «{title}» جاهز. اضغط الرابط عندما يكون لديك بضع دقائق:\n{link}",
    en: "Hello {name}, your new lesson “{title}” is ready. Tap the link when you have a few minutes:\n{link}",
    es: "Hola {name}, tu nueva lección «{title}» está lista. Pulsa el enlace cuando tengas unos minutos:\n{link}",
    fil: "Kumusta {name}, handa na ang bago mong aralin na «{title}». Pindutin ang link kapag may ilang minuto ka:\n{link}",
    ur: "ہیلو {name}، آپ کا نیا سبق «{title}» تیار ہے۔ جب آپ کے پاس چند منٹ ہوں تو لنک دبائیں:\n{link}",
    bn: "হ্যালো {name}, আপনার নতুন পাঠ «{title}» প্রস্তুত। কয়েক মিনিট সময় পেলে লিংকে চাপুন:\n{link}",
    hi: "नमस्ते {name}, आपका नया पाठ «{title}» तैयार है। जब कुछ मिनट हों तो लिंक दबाएँ:\n{link}",
    fr: "Bonjour {name}, votre nouvelle leçon « {title} » est prête. Appuyez sur le lien quand vous avez quelques minutes :\n{link}",
  },
  lesson_reminder: {
    ar: "مرحبًا {name}، درس «{title}» ما زال ينتظرك، وهو قصير. خذ وقتك:\n{link}",
    en: "Hello {name}, the lesson “{title}” is still waiting for you, and it is short. Take your time:\n{link}",
    es: "Hola {name}, la lección «{title}» todavía te espera, y es corta. Tómate tu tiempo:\n{link}",
    fil: "Kumusta {name}, naghihintay pa rin sa iyo ang araling «{title}», at maikli lang ito. Huwag magmadali:\n{link}",
    ur: "ہیلو {name}، سبق «{title}» ابھی آپ کا انتظار کر رہا ہے، اور یہ مختصر ہے۔ آرام سے:\n{link}",
    bn: "হ্যালো {name}, «{title}» পাঠটি এখনো আপনার অপেক্ষায়, আর এটি ছোট। সময় নিয়ে দেখুন:\n{link}",
    hi: "नमस्ते {name}, पाठ «{title}» अभी भी आपका इंतज़ार कर रहा है, और यह छोटा है। आराम से:\n{link}",
    fr: "Bonjour {name}, la leçon « {title} » vous attend toujours, et elle est courte. Prenez votre temps :\n{link}",
  },
  checkin: {
    ar: "مرحبًا {name}، كيف حالك؟ نحن هنا إذا احتجت أي شيء.",
    en: "Hello {name}, how are you doing? We are here if you need anything.",
    es: "Hola {name}, ¿cómo estás? Estamos aquí si necesitas algo.",
    fil: "Kumusta {name}, kumusta ka na? Nandito lang kami kung may kailangan ka.",
    ur: "ہیلو {name}، آپ کیسے ہیں؟ اگر آپ کو کسی چیز کی ضرورت ہو تو ہم حاضر ہیں۔",
    bn: "হ্যালো {name}, আপনি কেমন আছেন? কিছু দরকার হলে আমরা আছি।",
    hi: "नमस्ते {name}, आप कैसे हैं? अगर आपको किसी चीज़ की ज़रूरत हो तो हम यहाँ हैं।",
    fr: "Bonjour {name}, comment allez-vous ? Nous sommes là si vous avez besoin de quoi que ce soit.",
  },
  new_caller: {
    ar: "مرحبًا {name}، اسمي {caller}. من الآن يمكنك التواصل معي، وأنا أعرف قصتك. كيف حالك؟",
    en: "Hello {name}, my name is {caller}. From now on you can reach me, and I already know your story. How are you?",
    es: "Hola {name}, me llamo {caller}. A partir de ahora puedes escribirme, y ya conozco tu historia. ¿Cómo estás?",
    fil: "Kumusta {name}, ako si {caller}. Mula ngayon, ako na ang makakausap mo, at alam ko na ang iyong kuwento. Kumusta ka?",
    ur: "ہیلو {name}، میرا نام {caller} ہے۔ اب سے آپ مجھ سے رابطہ کر سکتے ہیں، اور مجھے آپ کی کہانی معلوم ہے۔ آپ کیسے ہیں؟",
    bn: "হ্যালো {name}, আমার নাম {caller}। এখন থেকে আপনি আমার সাথে যোগাযোগ করতে পারেন, এবং আমি আপনার গল্প জানি। আপনি কেমন আছেন?",
    hi: "नमस्ते {name}, मेरा नाम {caller} है। अब से आप मुझसे संपर्क कर सकते हैं, और मुझे आपकी कहानी पता है। आप कैसे हैं?",
    fr: "Bonjour {name}, je m'appelle {caller}. Désormais, vous pouvez me contacter, et je connais déjà votre parcours. Comment allez-vous ?",
  },
  followup: {
    ar: "مرحبًا {name}، هل نكمل حديثنا؟ هل الوقت مناسب الآن؟",
    en: "Hello {name}, can we continue our conversation? Is now a good time?",
    es: "Hola {name}, ¿podemos continuar nuestra conversación? ¿Es un buen momento?",
    fil: "Kumusta {name}, puwede ba nating ituloy ang ating usapan? Magandang oras ba ngayon?",
    ur: "ہیلو {name}، کیا ہم اپنی بات چیت جاری رکھ سکتے ہیں؟ کیا یہ مناسب وقت ہے؟",
    bn: "হ্যালো {name}, আমরা কি আমাদের আলাপ চালিয়ে যেতে পারি? এখন কি সুবিধাজনক সময়?",
    hi: "नमस्ते {name}, क्या हम अपनी बातचीत जारी रख सकते हैं? क्या अभी सही समय है?",
    fr: "Bonjour {name}, pouvons-nous reprendre notre conversation ? Est-ce un bon moment ?",
  },
};

export function fillTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

type Line = { ar: string } & Record<Lang, string>;

/** Sample lines a beneficiary might send. Used for seed data and the reply simulator. */
export const BENEFICIARY_LINES: Line[] = [
  {
    ar: "مرحبًا، رأيت صفحتكم وأريد أن أتعرف على الإسلام.",
    es: "Hola, vi su página y quiero conocer el islam.",
    fil: "Hello, nakita ko ang inyong page at gusto kong matuto tungkol sa Islam.",
    ur: "ہیلو، میں نے آپ کا پیج دیکھا اور اسلام کے بارے میں جاننا چاہتا ہوں۔",
    bn: "হ্যালো, আমি আপনাদের পেজ দেখেছি এবং ইসলাম সম্পর্কে জানতে চাই।",
    hi: "नमस्ते, मैंने आपका पेज देखा और इस्लाम के बारे में जानना चाहता हूँ।",
    fr: "Bonjour, j'ai vu votre page et je veux découvrir l'islam.",
  },
  {
    ar: "ماذا يعتقد المسلمون عن عيسى؟",
    es: "¿Qué creen los musulmanes sobre Jesús?",
    fil: "Ano ang paniniwala ng mga Muslim tungkol kay Hesus?",
    ur: "مسلمان حضرت عیسیٰ کے بارے میں کیا عقیدہ رکھتے ہیں؟",
    bn: "যিশু সম্পর্কে মুসলিমরা কী বিশ্বাস করে?",
    hi: "मुसलमान ईसा के बारे में क्या मानते हैं?",
    fr: "Que croient les musulmans au sujet de Jésus ?",
  },
  {
    ar: "شكرًا، قرأت الدرس.",
    es: "Gracias, ya leí la lección.",
    fil: "Salamat, nabasa ko na ang aralin.",
    ur: "شکریہ، میں نے سبق پڑھ لیا۔",
    bn: "ধন্যবাদ, আমি পাঠটি পড়েছি।",
    hi: "धन्यवाद, मैंने पाठ पढ़ लिया।",
    fr: "Merci, j'ai lu la leçon.",
  },
  {
    ar: "عندي سؤال عن الصلاة.",
    es: "Tengo una pregunta sobre la oración.",
    fil: "May tanong ako tungkol sa pagdarasal.",
    ur: "مجھے نماز کے بارے میں ایک سوال ہے۔",
    bn: "নামাজ সম্পর্কে আমার একটি প্রশ্ন আছে।",
    hi: "मेरा नमाज़ के बारे में एक सवाल है।",
    fr: "J'ai une question sur la prière.",
  },
  {
    ar: "مشغول اليوم، سأكتب غدًا.",
    es: "Hoy estoy ocupado, mañana te escribo.",
    fil: "Abala ako ngayon, bukas na lang ako magme-message.",
    ur: "آج مصروف ہوں، کل لکھوں گا۔",
    bn: "আজ ব্যস্ত, কাল লিখব।",
    hi: "आज व्यस्त हूँ, कल लिखूँगा।",
    fr: "Je suis occupé aujourd'hui, je vous écris demain.",
  },
  {
    ar: "عائلتي لا تعرف بعد.",
    es: "Mi familia todavía no lo sabe.",
    fil: "Hindi pa alam ng pamilya ko.",
    ur: "میرے گھر والوں کو ابھی معلوم نہیں۔",
    bn: "আমার পরিবার এখনো জানে না।",
    hi: "मेरे परिवार को अभी पता नहीं है।",
    fr: "Ma famille ne le sait pas encore.",
  },
];

/** Sample lines a caller might send, in the beneficiary's language. */
export const CALLER_LINES: Line[] = [
  {
    ar: "أهلاً! يسعدني أن أجيب عن أسئلتك.",
    es: "¡Bienvenido! Con gusto respondo tus preguntas.",
    fil: "Maligayang pagdating! Masaya akong sagutin ang mga tanong mo.",
    ur: "خوش آمدید! آپ کے سوالوں کا جواب دے کر خوشی ہوگی۔",
    bn: "স্বাগতম! আপনার প্রশ্নের উত্তর দিতে পেরে খুশি হব।",
    hi: "स्वागत है! आपके सवालों का जवाब देकर खुशी होगी।",
    fr: "Bienvenue ! Je serai heureux de répondre à vos questions.",
  },
  {
    ar: "هذا شرح مختصر، خذ وقتك.",
    es: "Aquí tienes una breve explicación, tómate tu tiempo.",
    fil: "Narito ang maikling paliwanag, huwag kang magmadali.",
    ur: "یہ مختصر وضاحت ہے، آرام سے پڑھیں۔",
    bn: "এখানে একটি সংক্ষিপ্ত ব্যাখ্যা, সময় নিয়ে পড়ুন।",
    hi: "यह एक छोटी व्याख्या है, आराम से पढ़ें।",
    fr: "Voici une courte explication, prenez votre temps.",
  },
  {
    ar: "كيف حالك اليوم؟",
    es: "¿Cómo estás hoy?",
    fil: "Kumusta ka ngayon?",
    ur: "آج آپ کیسے ہیں؟",
    bn: "আজ আপনি কেমন আছেন?",
    hi: "आज आप कैसे हैं?",
    fr: "Comment allez-vous aujourd'hui ?",
  },
  {
    ar: "هل لديك سؤال عن الدرس الأخير؟",
    es: "¿Tienes alguna pregunta sobre la última lección?",
    fil: "May tanong ka ba tungkol sa huling aralin?",
    ur: "کیا آخری سبق کے بارے میں کوئی سوال ہے؟",
    bn: "শেষ পাঠ নিয়ে কোনো প্রশ্ন আছে?",
    hi: "पिछले पाठ के बारे में कोई सवाल है?",
    fr: "Avez-vous une question sur la dernière leçon ?",
  },
];
