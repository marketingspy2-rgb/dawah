import type { DB, Lang } from "./types";

/**
 * Capture links: every "how they heard of us" source (the هداية sheet's مصدر التعرّف list)
 * gets a link and a QR code. Whoever opens it fills a short form in their own language,
 * and a new هداية case opens with that source already filled in.
 */

/** Set on cases that opened themselves through a capture link. */
export const CAPTURE_MARK = "capture-link";

/** A short, stable code for a source name, so links stay the same while the name does. */
export function sourceCode(source: string) {
  let h = 5381;
  for (const ch of source) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return h.toString(36);
}

export function sourceByCode(db: DB, code: string) {
  return db.settings.lists.source.find((s) => sourceCode(s) === code) ?? null;
}

export function captureUrl(origin: string, source: string) {
  return `${origin}/c/${sourceCode(source)}`;
}

/** Counts per source: people who came from it, and how many embraced Islam. */
export function sourceStats(db: DB) {
  return db.settings.lists.source
    .map((source) => {
      const people = db.beneficiaries.filter((b) => b.hidaya?.source === source);
      const muslims = people.filter((b) => b.program === "muslim").length;
      const viaLink = people.filter((b) => b.source === CAPTURE_MARK).length;
      return { source, total: people.length, muslims, viaLink, rate: people.length ? Math.round((muslims / people.length) * 100) : null };
    })
    .sort((a, c) => c.total - a.total);
}

/** The public form's words, in each language the association works in. */
export const CAPTURE_UI: Record<Lang, { title: string; sub: string; name: string; phone: string; gender: string; male: string; female: string; message: string; send: string; thanks: string; thanksSub: string; consent: string }> = {
  es: {
    title: "Encantados de conocerte",
    sub: "Déjanos tus datos y te escribiremos por WhatsApp en tu idioma.",
    name: "Tu nombre",
    phone: "Tu número de WhatsApp",
    gender: "Eres",
    male: "Hombre",
    female: "Mujer",
    message: "¿Qué te gustaría saber? (opcional)",
    send: "Enviar",
    thanks: "¡Gracias!",
    thanksSub: "Te escribiremos pronto por WhatsApp.",
    consent: "Usamos tus datos solo para contactarte. Puedes pedir que los borremos en cualquier momento.",
  },
  fil: {
    title: "Masaya kaming makilala ka",
    sub: "Iwan ang iyong detalye at susulatan ka namin sa WhatsApp sa iyong wika.",
    name: "Iyong pangalan",
    phone: "Iyong WhatsApp number",
    gender: "Ikaw ay",
    male: "Lalaki",
    female: "Babae",
    message: "Ano ang gusto mong malaman? (opsyonal)",
    send: "Ipadala",
    thanks: "Salamat!",
    thanksSub: "Susulatan ka namin agad sa WhatsApp.",
    consent: "Gagamitin lang namin ang iyong detalye para makipag-ugnayan sa iyo. Maaari mong ipabura ito anumang oras.",
  },
  ur: {
    title: "آپ سے مل کر خوشی ہوئی",
    sub: "اپنی معلومات دیں، ہم آپ کی زبان میں واٹس ایپ پر رابطہ کریں گے۔",
    name: "آپ کا نام",
    phone: "آپ کا واٹس ایپ نمبر",
    gender: "آپ",
    male: "مرد",
    female: "عورت",
    message: "آپ کیا جاننا چاہتے ہیں؟ (اختیاری)",
    send: "بھیجیں",
    thanks: "شکریہ!",
    thanksSub: "ہم جلد واٹس ایپ پر رابطہ کریں گے۔",
    consent: "ہم آپ کی معلومات صرف رابطے کے لیے استعمال کرتے ہیں۔ آپ کسی بھی وقت انہیں حذف کرنے کا کہہ سکتے ہیں۔",
  },
  bn: {
    title: "আপনার সাথে পরিচিত হয়ে খুশি হলাম",
    sub: "আপনার তথ্য দিন, আমরা আপনার ভাষায় হোয়াটসঅ্যাপে লিখব।",
    name: "আপনার নাম",
    phone: "আপনার হোয়াটসঅ্যাপ নম্বর",
    gender: "আপনি",
    male: "পুরুষ",
    female: "নারী",
    message: "আপনি কী জানতে চান? (ঐচ্ছিক)",
    send: "পাঠান",
    thanks: "ধন্যবাদ!",
    thanksSub: "আমরা শীঘ্রই হোয়াটসঅ্যাপে লিখব।",
    consent: "আমরা আপনার তথ্য শুধু যোগাযোগের জন্য ব্যবহার করি। যেকোনো সময় মুছে ফেলতে বলতে পারেন।",
  },
  hi: {
    title: "आपसे मिलकर खुशी हुई",
    sub: "अपनी जानकारी दें, हम आपकी भाषा में व्हाट्सऐप पर लिखेंगे।",
    name: "आपका नाम",
    phone: "आपका व्हाट्सऐप नंबर",
    gender: "आप",
    male: "पुरुष",
    female: "महिला",
    message: "आप क्या जानना चाहते हैं? (वैकल्पिक)",
    send: "भेजें",
    thanks: "धन्यवाद!",
    thanksSub: "हम जल्द ही व्हाट्सऐप पर लिखेंगे।",
    consent: "हम आपकी जानकारी केवल संपर्क के लिए इस्तेमाल करते हैं। आप कभी भी इसे हटाने को कह सकते हैं।",
  },
  fr: {
    title: "Ravis de faire votre connaissance",
    sub: "Laissez vos coordonnées et nous vous écrirons sur WhatsApp dans votre langue.",
    name: "Votre nom",
    phone: "Votre numéro WhatsApp",
    gender: "Vous êtes",
    male: "Homme",
    female: "Femme",
    message: "Que souhaitez-vous savoir ? (facultatif)",
    send: "Envoyer",
    thanks: "Merci !",
    thanksSub: "Nous vous écrirons bientôt sur WhatsApp.",
    consent: "Nous utilisons vos données uniquement pour vous contacter. Vous pouvez demander leur suppression à tout moment.",
  },
};
