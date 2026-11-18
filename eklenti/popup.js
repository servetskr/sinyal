// MEB-187: araç çubuğu penceresi — üç şey: kurulu mu (sürüm), MEBBİS oturumu açık mı, şu an ne yapıyor. Hiçbir şey yazmaz; yalnız arka planın durumunu okur.
const $ = id => document.getElementById(id);
const sor = m => new Promise(ok => { try { chrome.runtime.sendMessage(m, r => { void chrome.runtime.lastError; ok(r); }); } catch (x) { ok(null); } });
const saat = t => new Date(t).toTimeString().slice(0, 5);
const rozet = (el, metin, renk) => { el.textContent = metin; el.className = 'r ' + renk; };
async function ciz() {
  $('surum').textContent = 'mdSinyal · sürüm ' + chrome.runtime.getManifest().version;
  const c = await sor({ tur: 'canli-al' }), yas = c ? Date.now() - c.zaman : Infinity;
  if (!c) rozet($('oturum'), 'Bilinmiyor · MEBBİS’e girin', 'gri');
  else if (!c.acik) rozet($('oturum'), 'Kapalı · yeniden girin', 'kirmizi');
  else if (yas > 6 * 60e3) rozet($('oturum'), `Son görülme ${saat(c.zaman)}`, 'gri');
  else rozet($('oturum'), `Açık · ${saat(c.zaman)}`, 'yesil');
  const t = await sor({ tur: 'toplu-al' }), s = (t && t.sonuc) || {};
  if (t && !t.bitti && t.durum !== 'iptal') {
    const durdu = t.durum === 'durduruldu';
    rozet($('simdi'), durdu ? 'Durduruldu' : (s.adim || 'Çalışıyor'), durdu ? 'kirmizi' : 'mavi');
    const oran = typeof s.oran === 'number' ? s.oran : null; $('cubuk').hidden = oran == null; if (oran != null) $('cubuk').firstElementChild.style.width = Math.round(oran * 100) + '%';
    const n = (s.yazilan || []).length; $('not').textContent = durdu ? 'mdSinyal’de “Kaldığı yerden devam et”e basın.' : `${n ? n + ' kayıt işlendi. ' : ''}Bitince sonuç mdSinyal’e kendiliğinden gider.`;
  } else { rozet($('simdi'), 'Boşta', 'gri'); $('cubuk').hidden = true; }
}
$('mebbis').addEventListener('click', () => { chrome.tabs.create({ url: 'https://mebbis.meb.gov.tr/' }); window.close(); });
$('sinyal').addEventListener('click', async () => { const r = await sor({ tur: 'sinyal-ac' }); if (!r || !r.ok) chrome.tabs.create({ url: 'https://mdsinyal.com/' }); window.close(); });
ciz(); setInterval(ciz, 3000);
