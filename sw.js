/* Service worker del catálogo y del panel de Distrisander.
   · Las páginas (.html) van «red primero»: siempre se ve la versión más nueva; sin internet se abre la última guardada
     (el catálogo muestra entonces el último catálogo guardado en el celular; para ENVIAR un pedido sí hace falta internet).
   · Íconos, fotos y manifiestos: lo guardado primero, y se renuevan en segundo plano.
   · NUNCA toca otros orígenes (el servidor de Apps Script, las letras de Google): los pedidos y precios siempre van a la red.
   Cuando cambie este archivo o la lista de abajo, sube el número de VERSION. */
const VERSION = '2026-11-25-4';
const CACHE = 'ds-' + VERSION;
const PRECACHE = ['index.html', 'panel.html', 'manifest.webmanifest', 'panel.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/panel-192.png', 'icons/favicon-64.png', 'fonts/inter-latin.woff2', 'fonts/playfair-latin.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;                      // el servidor y las letras: directo a la red
  const llave = new Request(u.origin + u.pathname);                    // sin «?k=…»: una sola copia de cada página
  const esPagina = r.mode === 'navigate' || /\.html$/.test(u.pathname) || /\/$/.test(u.pathname);
  if (esPagina) {
    e.respondWith(
      fetch(r).then((resp) => {
        if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(llave, copia)); }
        return resp;
      }).catch(() => caches.match(llave).then((g) => g || caches.match(/panel/.test(u.pathname) ? 'panel.html' : 'index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(r).then((g) => {
      const red = fetch(r).then((resp) => {
        if (resp && resp.status === 200) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(r, copia)); }
        return resp;
      }).catch(() => g);
      return g || red;
    })
  );
});
