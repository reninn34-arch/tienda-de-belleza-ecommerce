import type { Metadata } from "next";
import { Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";
import { getBranding } from "@/lib/data";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

import { CartProvider } from "@/context/CartContext";
import { getStoreName } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { faviconUrl, brandColor } = await getBranding();
  const storeName = await getStoreName();

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
    icons: {
      icon: faviconUrl || "/favicon.ico",
    },
  };
}

export async function generateViewport(): Promise<any> {
  const { brandColor } = await getBranding();
  return {
    themeColor: brandColor || "#f5edf8",
    width: "device-width",
    initialScale: 1,
    // maximumScale y userScalable eliminados — requerido por WCAG 2.1 y PageSpeed
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
      lang="es"
      className={`${notoSerif.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect para reducir latencia de fuentes de Google */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Material Symbols con display=swap para evitar bloqueo de renderizado */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
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
