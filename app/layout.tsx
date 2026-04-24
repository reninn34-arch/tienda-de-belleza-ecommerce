import type { Metadata } from "next";
import { Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";
import { getBranding } from "@/lib/data";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
});

import { CartProvider } from "@/context/CartContext";
import { getStoreName } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { faviconUrl, brandColor } = await getBranding();
  const storeName = await getStoreName();
  const themeColor = brandColor || "#f5edf8";

  return {
    title: storeName,
    description: "Scientific Artistry • Editorial Excellence",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: storeName,
      startupImage: "/icon-512.png",
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
    },
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export async function generateViewport(): Promise<any> {
  const { brandColor } = await getBranding();
  return {
    themeColor: brandColor || "#f5edf8",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSerif.variable} ${manrope.variable}`}
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
      </head>
      <body className="bg-background text-on-surface font-body selection:bg-secondary-container antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
