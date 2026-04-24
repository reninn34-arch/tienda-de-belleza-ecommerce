import { MetadataRoute } from 'next';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let brandColor = "#f5edf8";
  let storeName = "Blush Admin";

  try {
    const res = await fetch(`${process.env.BACKEND_URL || 'http://localhost:4000'}/api/settings`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      brandColor = data?.branding?.brandColor ?? brandColor;
      storeName = data?.storeName ? `${data.storeName} Admin` : storeName;
    }
  } catch {}

  return {
    name: storeName,
    short_name: storeName,
    description: "Panel de administración",
    start_url: "/admin",
    display: "standalone",
    background_color: brandColor,
    theme_color: brandColor,
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
