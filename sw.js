// NutriFlow · service worker
// Si cambias icon-*.png o manifest.json, sube el número de VERSION para renovar la caché.
const VERSION = 'nutriflow-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function guardar(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    const copia = res.clone();
    caches.open(VERSION).then(c => c.put(req, copia));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API de alimentos (escáner): siempre por red
  if (url.hostname.endsWith('openfoodfacts.org')) return;

  // Archivos de la app: red primero (así recibes las actualizaciones) y caché si no hay conexión
  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => guardar(req, res))
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Fuentes y librerías externas: caché primero
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => guardar(req, res))));
});
