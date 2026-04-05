import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { readFileSync } from "fs";
import { join } from "path";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
});

export async function generateMetadata(): Promise<Metadata> {
  let title = "Admin Panel";
  let storeName = "Blush";
  try {
    const raw = readFileSync(join(process.cwd(), "..", "data", "settings.json"), "utf-8").replace(/^\uFEFF/, "");
    storeName = JSON.parse(raw)?.storeName ?? "Blush";
    title = `Admin — ${storeName}`;
  } catch (e) {}
  return {
    title,
    description: "Panel de administración",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: storeName,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={manrope.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#33172c" />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
