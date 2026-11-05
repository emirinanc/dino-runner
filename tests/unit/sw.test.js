// The service worker (sw.js): code is always revalidated, so one page load
// never mixes versions, and the last copy is kept for when the network is down.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readRepoFile } from './support/fakes.js';

const ORIGIN = 'https://example.test';

/** Runs sw.js against a fake service worker scope and returns its fetch handler. */
function loadWorker({ online = true } = {}) {
  const listeners = {};
  const store = new Map();
  const cache = { put: vi.fn(async (req, res) => store.set(req.url, res)) };
  const caches = {
    open: vi.fn(async () => cache),
    match: vi.fn(async (req) => store.get(req.url)),
  };
  const fetch = vi.fn(async (req) => {
    if (!online) throw new TypeError('offline');
    return new Response(`from ${req}`, { headers: { 'Cache-Control': 'max-age=600' } });
  });
  const self = {
    location: { origin: ORIGIN },
    clients: { claim: vi.fn() },
    skipWaiting: vi.fn(),
    addEventListener: (type, fn) => (listeners[type] = fn),
  };
  new Function('self', 'caches', 'fetch', readRepoFile('sw.js'))(self, caches, fetch);

  const request = (path, method = 'GET') => ({ url: new URL(path, ORIGIN).href, method });
  const handle = async (req) => {
    let response;
    listeners.fetch({ request: req, respondWith: (p) => (response = p) });
    return response && (await response);
  };
  return { handle, request, fetch, store };
}

describe('service worker', () => {
  let sw;
  beforeEach(() => (sw = loadWorker()));

  it('revalidates code with the server instead of trusting the HTTP cache', async () => {
    const res = await sw.handle(sw.request('/src/learn/numbergame.js'));
    expect(await res.text()).toBe(`from ${ORIGIN}/src/learn/numbergame.js`);
    expect(sw.fetch).toHaveBeenCalledWith(`${ORIGIN}/src/learn/numbergame.js`, { cache: 'no-cache' });
  });

  it('marks responses no-cache, so the browser never reuses its own copy without asking', async () => {
    const res = await sw.handle(sw.request('/src/learn/numbergame.js'));
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('keeps the last copy for when the network is down', async () => {
    await sw.handle(sw.request('/index.html'));
    await sw.handle(sw.request('/audio/tr/manifest.json'));
    await new Promise((r) => setTimeout(r)); // the copy is stored in the background
    const offline = loadWorker({ online: false });
    for (const [url, res] of sw.store) offline.store.set(url, res);
    expect(await (await offline.handle(offline.request('/index.html'))).text()).toBe(`from ${ORIGIN}/index.html`);
    expect(await (await offline.handle(offline.request('/audio/tr/manifest.json'))).text()).toBe(`from ${ORIGIN}/audio/tr/manifest.json`);
  });

  it('fetches a page navigation by URL (a navigate request cannot be copied with options)', async () => {
    const res = await sw.handle({ ...sw.request('/'), mode: 'navigate' });
    expect(sw.fetch.mock.calls[0][0]).toBe(`${ORIGIN}/`);
    expect(await res.text()).toBe(`from ${ORIGIN}/`);
  });

  it('leaves voice clips, other sites and non-GET requests to the browser', async () => {
    expect(await sw.handle(sw.request('/audio/tr/4c7afd663cc5.mp3'))).toBeUndefined();
    expect(await sw.handle({ url: 'https://fonts.example/x.css', method: 'GET' })).toBeUndefined();
    expect(await sw.handle(sw.request('/index.html', 'POST'))).toBeUndefined();
    expect(sw.fetch).not.toHaveBeenCalled();
  });
});
