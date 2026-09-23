const CACHE_NAME = "mathe-duell-cache-v33";
const FILES_TO_CACHE = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

const FONT_CACHE_NAME = "mathe-duell-fonts-v1";
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    // Google Fonts: stale-while-revalidate — fonts never change once fetched,
    // so serve from cache instantly and refresh the cache in the background.
    event.respondWith(
      caches.open(FONT_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Everything else (including Firebase/Firestore requests used by Klassenduell)
  // is left completely untouched — this app relies on live, uncached network
  // traffic for real-time sync, so the service worker must not intercept it.
  if (url.origin !== self.location.origin) return;
});
