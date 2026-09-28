import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { toLang } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = { title: "PrivateCall", description: "Private VoIP calling", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#0f172a", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = toLang((await cookies()).get("lang")?.value);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-dvh bg-slate-950 text-slate-100 antialiased">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js')` }} />
      </body>
    </html>
  );
}
