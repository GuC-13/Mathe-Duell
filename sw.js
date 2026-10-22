const CACHE_NAME = "mathe-duell-cache-v56";
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

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Fremde Adressen (Firebase/Firestore fürs Klassenduell) bleiben unangetastet -
  // die Echtzeit-Synchronisation braucht live Netzverkehr. Die Schriften sind seit
  // v48 direkt in index.html eingebettet (kein Google Fonts mehr).
  if (url.origin !== self.location.origin) return;

  // Eigene Dateien (index.html): zuerst Netz (damit Updates sofort ankommen),
  // ohne Verbindung aus dem Cache - sonst startet die App offline gar nicht.
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          // ohne ?v=… speichern, damit nicht pro Cache-Busting-Query ein Eintrag entsteht
          caches.open(CACHE_NAME).then((cache) => cache.put(url.origin + url.pathname, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) =>
          cached || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())
        )
      )
  );
});
