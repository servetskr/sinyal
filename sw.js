// Sinyal servis çalışanı: önce ağ, bağlantı yoksa son açılan sürüm (aynı kaynaktaki dosyalar).
// WhatsApp köprüsü, yazı tipleri gibi dış istekler önbelleğe alınmaz.
const ONBELLEK = 'sinyal-v3';  // sürüm değişince eski dosyalar silinir
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k !== ONBELLEK).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', ev => {
  const r = ev.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  // Sayfanın kendisi ve sürüm eki olmayan dosyalar her açılışta sunucuya sorulur; böylece link açılınca güncel sürüm gelir.
  const taze = r.mode === 'navigate' || !u.searchParams.has('v');
  ev.respondWith(fetch(taze ? new Request(r, { cache: 'no-cache' }) : r).then(yanit => {
    if (yanit.ok) { const kopya = yanit.clone(); caches.open(ONBELLEK).then(c => c.put(r, kopya)); }
    return yanit;
  }).catch(() => caches.match(r).then(x => x || (r.mode === 'navigate' ? caches.match('./').then(y => y || caches.match('./index.html')).then(y => y || Response.error()) : Response.error()))));
});
