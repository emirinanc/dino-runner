// Service worker: keeps the files of one page load from the same version.
//
// Without it the browser caches every file on its own (GitHub Pages sends
// max-age=600), so right after a deploy a page could get the new index.html
// with an old numbergame.js: the number game then opened empty. Here every
// file is checked with the server on each load (a cheap 304 when nothing
// changed), and the last good copy is kept for when the network is down.
//
// Voice clips are left to the browser: they're named after a hash of what they
// say, so they never change, and audio is fetched in ranges (206), which can't
// be stored in a cache.

const CACHE = 'dino-runner';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.endsWith('.mp3')) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    // By URL: a page navigation can't be copied with other options. 'no-cache'
    // revalidates instead of trusting the browser's HTTP cache.
    const fetched = await fetch(request.url, { cache: 'no-cache' });
    if (fetched.status !== 200) return fetched;
    // Marked no-cache so the browser asks again next time instead of reusing
    // its in-memory copy, which wouldn't even reach this worker.
    const headers = new Headers(fetched.headers);
    headers.set('Cache-Control', 'no-cache');
    const response = new Response(fetched.body, { status: 200, statusText: fetched.statusText, headers });
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}
