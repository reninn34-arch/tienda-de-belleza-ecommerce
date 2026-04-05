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
  const { faviconUrl } = await getBranding();
  const storeName = await getStoreName();
  return {
    title: storeName,
    description: "Scientific Artistry • Editorial Excellence",
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-surface font-body selection:bg-secondary-container antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
