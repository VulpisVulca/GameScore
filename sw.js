const CACHE = 'gamescores-v14';
const FILES = ['./', './index.html', './style.css', './fcm-theme.css', './app.js', './rules.js', './statistics.js', './statistics-view.js', './icon.svg', './manifest.webmanifest', './assets/fonts/Barlow-Regular.ttf', './assets/fonts/Barlow-SemiBold.ttf', './assets/fonts/Barlow-Bold.ttf', './assets/fonts/Lobster-Regular.ttf'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gamescores-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
