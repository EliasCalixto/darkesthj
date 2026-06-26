const CACHE = "monitor-v13";
const CDN = [
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"
];

// Install: pre-cache only CDN assets (app files are always fetched fresh)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CDN))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - App files (HTML, JS, CSS, data) → network first, cache as offline fallback
// - CDN assets → cache first for performance
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isCdn = CDN.includes(url.href);

  if (isCdn) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
    return;
  }

  // Network first for everything else — always serve fresh app code
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
