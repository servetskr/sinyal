// mdSinyal MEBBİS Yardımcısı · mdSinyal sayfası tarafı: sayfa ile eklenti arasında mesaj taşır.
// Yalnız aynı penceredeki mdSinyal sayfasından gelen mesajlar kabul edilir.
const SURUM = chrome.runtime.getManifest().version;
const sayfaya = (tur, veri) => window.postMessage({ kaynak: 'sinyal-eklenti', tur, veri }, location.origin);
const gonder = m => new Promise(ok => { try { chrome.runtime.sendMessage(m, ok); } catch (x) { ok(null); } });
window.addEventListener('message', async ev => {
  if (ev.source !== window || ev.origin !== location.origin || !ev.data || ev.data.kaynak !== 'sinyal-sayfa') return;
  const { tur, veri } = ev.data;
  if (tur === 'ping') return sayfaya('merhaba', { surum: SURUM });
  if (tur === 'kuyruk') { const r = await gonder({ tur: 'kuyruk-koy', isler: veri.isler, kurs: veri.kurs, oto: !!veri.oto }); const s = await gonder({ tur: 'mebbis-ac' }); return sayfaya('kuyruk-alindi', { ...r, sekme: s && s.sekme }); }
  if (tur === 'cek') { await gonder({ tur: 'hedef-koy', hedef: { tip: 'al', amac: veri.amac, zaman: Date.now(), tik: [], dogrudan: false, durum: 'gidiyor' } }); const s = await gonder({ tur: 'mebbis-ac' }); return sayfaya('cek-alindi', { sekme: s && s.sekme }); }
  if (tur === 'toplu') { await gonder({ tur: 'toplu-koy', is: veri }); const s = await gonder({ tur: 'mebbis-ac' }); return sayfaya('toplu-alindi', { sekme: s && s.sekme }); }
  if (tur === 'toplu-iptal') { await gonder({ tur: 'toplu-iptal' }); return; }
  if (tur === 'bitenler-onay') { await gonder({ tur: 'bitenler-sil', ids: (veri && veri.ids) || [] }); return; }
  if (tur === 'temizle') { await gonder({ tur: 'kuyruk-temizle' }); return sayfaya('temizlendi', {}); }
});
// MEBBİS’ten gelen tablo ve biten işler: sayfa görünür olunca ve aralıklarla sorulur
async function yokla() {
  const t = await gonder({ tur: 'tablo-al' }); if (t) sayfaya('tablo', t);
  const b = await gonder({ tur: 'bitenler-al' }); if (b && b.length) sayfaya('bitenler', b);
  const h = await gonder({ tur: 'hatalar-al' }); if (h && h.length) sayfaya('hatalar', h);
  const tp = await gonder({ tur: 'toplu-sonuc-al' }); if (tp) sayfaya('toplu-durum', tp);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) yokla(); });
setInterval(yokla, 4000);
gonder({ tur: 'sinyal-burada' });
window.addEventListener('DOMContentLoaded', () => { sayfaya('merhaba', { surum: SURUM }); yokla(); });
