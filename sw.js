// sw.js — Migalhas de Pão
// Estratégia diferenciada por tipo de arquivo:
// - Documento HTML (a própria página): network-first. Sempre tenta buscar a versão mais
//   nova primeiro; só cai pro cache se estiver offline. Isso evita o problema de "atualizei
//   o index.html mas o app instalado continua mostrando a versão antiga até abrir 2x".
// - Todo o resto (ex: biblialivre.json, que não muda): cache-first, pra não rebaixar
//   arquivos grandes de novo a cada visita.
const CACHE_VERSION = 'migalhas-v2';
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

    const isDocument = event.request.mode === 'navigate' || event.request.destination === 'document';

    if (isDocument) {
        // Network-first: a página em si deve sempre refletir a última versão publicada.
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
        );
        return;
    }

    // Cache-first para tudo mais (JSON da Bíblia, etc.) — evita rebaixar arquivos grandes.
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const network = fetch(event.request).then((response) => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached);
            return cached || network;
        })
    );
});
