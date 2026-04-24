import { MetadataRoute } from 'next';
import { getBranding, getStoreName } from '@/lib/data';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brandColor } = await getBranding();
  const storeName = await getStoreName();
  const themeColor = brandColor || "#f5edf8";

  return {
    name: storeName,
    short_name: storeName,
    description: `Tienda de belleza ${storeName}`,
    start_url: "/",
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    scope: "/",
    id: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
    ],
  };
}
