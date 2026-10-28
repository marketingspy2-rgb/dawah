import type { Metadata } from "next";
import { getUiLang } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة دعوة | Dawah Platform",
  description: "منصة للدعاة والمشرفين والإدارة لمتابعة المستفيدين والمسلمين الجدد",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getUiLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
