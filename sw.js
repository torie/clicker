// Offline support: serve from cache, refresh the cache in the background.
// Bump VERSION when shipping. The new worker then downloads the new files and waits; the game shows
// "NEW VERSION · TAP TO RELOAD", and tapping it tells the worker to take over (SKIP_WAITING).
const VERSION = 'clicker-v20';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/main.js',
  './src/game.js',
  './src/audio/soundtrack.js',
  './src/audio/songs.js',
  './src/skins.js',
  './src/wardrobe.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache (GitHub Pages allows 10 minutes), so the new
  // version really gets the new files.
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  event.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = req.mode === 'navigate'
      ? await cache.match('./index.html')
      : await cache.match(req, { ignoreSearch: sameOrigin });
    const network = fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req.mode === 'navigate' ? './index.html' : req, res.clone());
      return res;
    }).catch(() => cached);
    if (cached) {
      event.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network;
  }));
});
