// Blush Admin Panel — Service Worker
const CACHE = "blush-admin-v1";
const STATIC = [
  "/admin",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Ignorar peticiones no-HTTP (ej. extensiones de Chrome)
  if (!e.request.url.startsWith("http")) return;

  const url = new URL(e.request.url);

  // Dejar que el navegador maneje Webpack HMR y Server-Sent Events libremente 
  // Esto evita problemas de conexión en Next.js dev y en la página de POS/Stats
  if (
    url.pathname.includes("/_next/webpack-hmr") || 
    e.request.headers.get("Accept")?.includes("text/event-stream")
  ) {
    return; 
  }

  // Las demás peticiones van por red con fallback
  e.respondWith(
    fetch(e.request).catch(async (err) => {
      console.debug("SW Fetch Network Error:", err.message);
      const cachedResponse = await caches.match(e.request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // Si falla la red y no está en caché, DEBEMOS retornar un Response válido
      // para evitar el error "Failed to convert value to 'Response'"
      return new Response(
        JSON.stringify({ error: "Sin conexión a internet y sin caché disponible." }), 
        { 
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      );
    })
  );
});
