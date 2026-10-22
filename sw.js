const CACHE = 'gamescores-v44';
const FILES = [
  './',
  './index.html',
  './style.css',
  './fcm-theme.css',
  './accounting.js',
  './app.js',
  './events.js',
  './houses.js',
  './i18n.js',
  './offline.js',
  './persistence.js',
  './round-controller.js',
  './round-state.js',
  './rules.js',
  './selection.js',
  './state.js',
  './statistics-view.js',
  './statistics.js',
  './storage.js',
  './ui/chrome.js',
  './ui/common.js',
  './ui/dashboard.js',
  './ui/employees.js',
  './ui/home.js',
  './ui/house-labels.js',
  './ui/houses.js',
  './ui/ledger.js',
  './ui/legacy.js',
  './ui/render.js',
  './ui/reserve.js',
  './ui/review.js',
  './ui/round-notices.js',
  './ui/round.js',
  './ui/salaries.js',
  './controllers/game-actions.js',
  './controllers/input.js',
  './controllers/round-actions.js',
  './controllers/session-actions.js',
  './locales/en.js',
  './manifest.en.webmanifest',
  './icon.svg',
  './manifest.webmanifest',
  './assets/fonts/Barlow-Regular.ttf',
  './assets/fonts/Barlow-SemiBold.ttf',
  './assets/fonts/Barlow-Bold.ttf',
  './assets/fonts/Lobster-Regular.ttf',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('message', (event) => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('gamescores-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
