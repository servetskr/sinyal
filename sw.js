// Sinyal servis çalışanı: önce ağ, bağlantı yoksa son açılan sürüm (aynı kaynaktaki dosyalar).
// WhatsApp köprüsü, yazı tipleri gibi dış istekler önbelleğe alınmaz.
const ONBELLEK = 'sinyal-v4';  // sürüm değişince eski dosyalar silinir
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k !== ONBELLEK).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', ev => {
  const r = ev.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  // Sayfanın kendisi ve sürüm eki olmayan dosyalar her açılışta sunucuya sorulur; böylece link açılınca güncel sürüm gelir.
  const taze = r.mode === 'navigate' || !u.searchParams.has('v');
  // sürüm ekli dosyalar (?v=NN) hiç değişmez: önce önbellekten, yoksa ağdan (açılış ağ hızını beklemez)
  if (!taze) { ev.respondWith(caches.match(r).then(x => x || fetch(r).then(yanit => { if (yanit.ok) { const kopya = yanit.clone(); caches.open(ONBELLEK).then(c => c.put(r, kopya)); } return yanit; }))); return; }
  ev.respondWith(fetch(taze ? new Request(r, { cache: 'no-cache' }) : r).then(yanit => {
    if (yanit.ok) { const kopya = yanit.clone(); caches.open(ONBELLEK).then(c => c.put(r, kopya)); }
    return yanit;
  }).catch(() => caches.match(r).then(x => x || (r.mode === 'navigate' ? caches.match('./').then(y => y || caches.match('./index.html')).then(y => y || Response.error()) : Response.error()))));
});
