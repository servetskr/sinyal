// Sinyal servis çalışanı: önce ağ, bağlantı yoksa son açılan sürüm (aynı kaynaktaki dosyalar).
// WhatsApp köprüsü, yazı tipleri gibi dış istekler önbelleğe alınmaz.
const ONBELLEK = 'sinyal-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k !== ONBELLEK).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', ev => {
  const r = ev.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  ev.respondWith(fetch(r).then(yanit => {
    if (yanit.ok) { const kopya = yanit.clone(); caches.open(ONBELLEK).then(c => c.put(r, kopya)); }
    return yanit;
  }).catch(() => caches.match(r).then(x => x || (r.mode === 'navigate' ? caches.match('./') || caches.match('./index.html') : Response.error()))));
});
