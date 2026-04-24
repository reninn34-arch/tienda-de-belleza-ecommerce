import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
});
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let title = "Admin Panel";
  let storeName = "Tienda";
  try {
    const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:4000'}/api/settings`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      storeName = data?.storeName ?? "Blush";
      title = `Admin — ${storeName}`;
    }
  } catch (e: any) {
    // Only log errors that are NOT about dynamic usage during build
    if (e.digest !== 'DYNAMIC_SERVER_USAGE') {
      console.error("Error fetching storeName for metadata:", e);
    }
  }
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
    <html
      lang="es"
      className={manrope.variable}
      suppressHydrationWarning
    >
      <head>
        {/*
          Next.js recomienda cargar fuentes globales en _document.js para evitar advertencias.
          Si usas la app directory, puedes ignorar esta advertencia o migrar a un archivo personalizado _document.js en pages/.
        */}
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
