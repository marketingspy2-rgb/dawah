import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/client";
import { getUiLang } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة دعوة | Dawah Platform",
  description: "منصة للدعاة والمشرفين والإدارة لمتابعة المستفيدين والمسلمين الجدد",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-180.png" },
  appleWebApp: { capable: true, title: "منصة دعوة", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0c332c" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getUiLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-screen antialiased">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
