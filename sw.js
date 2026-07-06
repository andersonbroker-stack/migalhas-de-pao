// sw.js — Migalhas de Pão
// Estratégia: cache-first para o app shell (é um arquivo único, então cachear o próprio
// documento já cobre HTML+CSS+JS), com atualização em segundo plano a cada visita.
const CACHE_VERSION = 'migalhas-v1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return; // não interceptar POST/etc.

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const network = fetch(event.request).then((response) => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached || caches.match('./index.html'));
            // Cache-first: responde rápido do cache se existir; a rede atualiza o cache em paralelo.
            return cached || network;
        })
    );
});
