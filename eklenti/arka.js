// mdSinyal MEBBİS Yardımcısı · arka plan: mdSinyal sekmesi ile MEBBİS sekmesi arasında köprü.
// Kişisel veriler (iş yükü, sonuçlar) chrome.storage.session’da durur: tarayıcı kapanınca silinir.
// Kalıcı (chrome.storage.local) olarak yalnız kişisel veri içermeyenler saklanır: öğretilen alan eşlemeleri, ekran ayarları,
// iş ilerlemesi (iş kimlikleri ve yazıldı/yazılamadı bilgisi; ad, TC, MEBBİS mesajı yok) ve mdSinyal’den gelen denetlenmiş ekran haritası.
// Sayfa ↔ Yardımcı ileti sözleşmesi: eklenti/sinyal.js başındaki tablo (arka.js'teki iç iletiler: toplu-koy, toplu-durum, teslim-al, teslim-tamam, harita-koy…).
chrome.runtime.onInstalled.addListener(() => chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => { }));
const SURUM = chrome.runtime.getManifest().version;
const al = k => chrome.storage.session.get(k).then(x => x[k]);
const koy = (k, v) => chrome.storage.session.set({ [k]: v });
const yerel = k => chrome.storage.local.get(k).then(x => x[k]);
const yerelKoy = (k, v) => chrome.storage.local.set({ [k]: v });

/* ---------- toplu iş: kuyruk, durum, teslim ---------- */
const YUK_OMRU = 6 * 3600e3, TESLIM_OMRU = 24 * 3600e3, ILERLEME_OMRU = 7 * 864e5, KILIT_OMRU = 12e3, IPTAL_IZ = 15 * 60e3;
const idler = is => (is.yaz || []).flatMap(x => x.adaylar ? x.adaylar.map(a => a.id) : [x.id]);
const kalanOf = t => { const y = new Set(((t.sonuc || {}).yazilan || []).map(x => x.id)); return idler(t).filter(id => !y.has(id)).length; };
const bitmemis = t => !!t && !t.bitti && !t.iptal && Date.now() - t.zaman < YUK_OMRU;
// ilerleme kaydına MEBBİS mesajı yazılmaz; yalnız kayıt işinde yarım kalan alt adımların adları (sabit sözcükler) tutulur
const EKSIK = /(öğrenim|sağlık raporu|adli sicil|parmak izi|fotoğraf|sözleşme): /g;
const ozetle = l => (l || []).map(y => ({ id: y.id, ok: !!y.ok, dogrulama: y.dogrulama || '', eksik: [...new Set([...String(y.not || '').matchAll(EKSIK)].map(m => m[1]))] }));
async function ilerlemeYaz(id, f) {
  const l = (await yerel('ilerleme')) || {}, simdi = Date.now();
  for (const [k, v] of Object.entries(l)) if (simdi - (v.guncel || 0) > ILERLEME_OMRU) delete l[k];
  const r = f(l[id] || null); if (r === undefined) return; if (r === null) delete l[id]; else l[id] = { ...r, guncel: simdi };
  await yerelKoy('ilerleme', l);
}
async function teslimYaz(id, f) {
  const l = (await al('teslim')) || {}, simdi = Date.now();
  for (const [k, v] of Object.entries(l)) if (simdi - (v.zaman || 0) > TESLIM_OMRU) delete l[k];
  const r = f(l[id] || null); if (r === undefined) return; if (r === null) delete l[id]; else l[id] = r;
  await koy('teslim', l);
}
// Tarayıcı kapandıysa iş yükü ve sonuçlar silinmiştir; ilerleme kaydından mdSinyal’e aktarılacak özet kurulur
function yereldenTeslim(r) {
  const yz = r.yazilan || [], yapilan = new Set(yz.map(y => y.id));
  const kalan = (r.kimlikler || []).filter(id => !yapilan.has(id) && id !== r.suruyor);
  const yazilan = yz.map(y => ({ id: y.id, ok: y.ok, dogrulama: y.dogrulama, not: y.ok ? (y.eksik || []).map(a => a + ': ayrıntı tarayıcı kapanınca silindi; MEBBİS’te kontrol edin').join(' · ') : 'Yazılamamıştı; ayrıntı tarayıcı kapanınca silindi. Yeniden gönderin.' }));
  if (r.suruyor && !yapilan.has(r.suruyor)) yazilan.push({ id: r.suruyor, ok: false, not: 'Yanıt gelmeden kesildi; MEBBİS’te girilip girilmediğini kontrol edin.' });
  const ok = yz.filter(y => y.ok).length;
  const hata = r.durum === 'bitti' ? `MEBBİS işi bitmişti ama sonuç mdSinyal’e aktarılmadan tarayıcı kapandı; yazılan ${ok} iş işaretlendi.`
    : r.durum === 'iptal' ? `MEBBİS işi iptal edilmişti; o ana kadar yazılan ${ok} iş işaretlendi.`
      : `Tarayıcı kapandığı için MEBBİS işi yarıda kaldı: ${ok} iş yazılmıştı${kalan.length ? `, ${kalan.length} iş gönderilmedi. Kalanlar yeniden hazırlanınca MEBBİS sekmesindeki karttan sürdürülür; olmazsa yeniden gönderin` : ''}.`;
  return { id: r.id, yerel: true, son: true, bitti: false, durum: r.durum || '', zaman: r.guncel || Date.now(), sonuc: { veri: {}, yazilan, kalan, hata, hataTur: 'yarim' } };
}

/* ---------- ekran haritası: mdSinyal sayfasından gelir, yalnız veri; denetlenmeden kullanılmaz ---------- */
const SINYAL_KOKLER = ['https://mdsinyal.com', 'https://www.mdsinyal.com', 'https://servetskr.github.io'];
// imza istenirse: ECDSA P-256 açık anahtarı (JWK). null iken kaynak, sürüm ve şema denetlenir.
// MEB-110: anahtar ve imza sinyal-kaynak/arac/harita_imzala.mjs ile (anahtar → bu satıra yapıştırılacak JWK; imzala → harita.json'a "imza").
// Özel anahtar yalnız yetkilinin bilgisayarında (depo dışında). Sınama: arac/mebbis-test/harita-imza-test.mjs (imzalı kabul, imzasız/bozuk ret).
const ACIK_ANAHTAR = null;
const KIMLIK = /^[A-Za-z0-9_$İıŞşĞğÜüÖöÇç]{1,64}$/, YOL = /^\/(SKT|Ookgm)\/[A-Za-z0-9]{3,20}\.aspx$/, DEGER = /^-?\d{1,4}(,-?\d{1,4}){0,15}$/;
const YASAK = /sil|delete|iptal|kald[ıi]r|[çc][ıi]k[ıi][şs]|exit|logout/i, SURUM_D = /^\d{4}\.\d{2}\.\d{2}-\d{1,3}$/;
const metinUygun = (v, n) => typeof v === 'string' && v.length <= n && !/[<>"'`\\{}]/.test(v);
const surumSayi = s => { const m = String(s || '').match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{1,3})$/); return m ? m.slice(1).map(Number) : [0, 0, 0, 0]; };
const surumKars = (a, b) => { const x = surumSayi(a), y = surumSayi(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const yardimciKars = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
function haritaDenetle(h) {
  if (!h || typeof h !== 'object' || Array.isArray(h)) return 'biçim';
  for (const k of Object.keys(h)) if (!['surum', 'enAzYardimci', 'ekran', 'deger', 'metin', 'imza', 'aciklama'].includes(k)) return 'bilinmeyen anahtar: ' + k;
  if (!SURUM_D.test(h.surum || '')) return 'sürüm biçimi';
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h.enAzYardimci || '')) return 'enAzYardimci biçimi';
  if (yardimciKars(h.enAzYardimci, SURUM) > 0) return `bu harita Yardımcı ${h.enAzYardimci} istiyor (kurulu ${SURUM})`;
  if (h.aciklama != null && !metinUygun(h.aciklama, 200)) return 'açıklama';
  if (!h.ekran || typeof h.ekran !== 'object' || Array.isArray(h.ekran)) return 'ekran yok';
  const ekranlar = Object.entries(h.ekran); if (ekranlar.length > 60) return 'çok fazla ekran';
  for (const [kod, e] of ekranlar) {
    if (!/^[a-z]{3}\d{5}$/.test(kod) || !e || typeof e !== 'object' || Array.isArray(e)) return 'ekran: ' + kod;
    for (const k of Object.keys(e)) if (!['ad', 'yol', 'zorunlu', 'alan', 'iz'].includes(k)) return `${kod}: bilinmeyen anahtar ${k}`;
    if (e.ad != null && !metinUygun(e.ad, 60)) return kod + ': ad';
    if (e.yol != null && !(typeof e.yol === 'string' && YOL.test(e.yol))) return kod + ': yol';
    if (e.zorunlu != null && (!Array.isArray(e.zorunlu) || e.zorunlu.length > 40 || !e.zorunlu.every(x => typeof x === 'string' && KIMLIK.test(x) && !YASAK.test(x)))) return kod + ': zorunlu alanlar';
    if (e.alan != null) {
      if (typeof e.alan !== 'object' || Array.isArray(e.alan) || Object.keys(e.alan).length > 80) return kod + ': alan';
      for (const [a, b] of Object.entries(e.alan)) if (!KIMLIK.test(a) || typeof b !== 'string' || !KIMLIK.test(b) || YASAK.test(a) || YASAK.test(b)) return `${kod}: alan ${a}`;
    }
    if (e.iz != null && !(typeof e.iz === 'string' && /^[0-9a-f]{16,64}$/.test(e.iz))) return kod + ': iz';
  }
  for (const [grup, uygun] of [['deger', v => typeof v === 'string' && DEGER.test(v)], ['metin', v => metinUygun(v, 40)]]) {
    const o = h[grup]; if (o == null) continue;
    if (typeof o !== 'object' || Array.isArray(o) || Object.keys(o).length > 40) return grup;
    for (const [k, v] of Object.entries(o)) if (!/^[A-Za-z]{1,30}$/.test(k) || !uygun(v)) return `${grup}: ${k}`;
  }
  return '';
}
const sirala = o => Array.isArray(o) ? o.map(sirala) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map(k => [k, sirala(o[k])])) : o;
async function imzaDogru(h) {
  try {
    const { imza, ...govde } = h; if (typeof imza !== 'string') return false;
    const anahtar = await crypto.subtle.importKey('jwk', ACIK_ANAHTAR, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ham = Uint8Array.from(atob(imza), c => c.charCodeAt(0));
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, anahtar, ham, new TextEncoder().encode(JSON.stringify(sirala(govde))));
  } catch (x) { return false; }
}
const gonderenKok = k => { try { return new URL((k && (k.url || (k.tab && k.tab.url))) || '').origin; } catch (x) { return ''; } };
async function haritaKoy(h, kimden) {
  if (!kimden || kimden.id !== chrome.runtime.id || !SINYAL_KOKLER.includes(gonderenKok(kimden))) return { ok: false, neden: 'kaynak mdSinyal değil' };
  if (JSON.stringify(h || '').length > 64000) return { ok: false, neden: 'çok büyük' };
  const neden = haritaDenetle(h); if (neden) return { ok: false, neden };
  if (ACIK_ANAHTAR && !(await imzaDogru(h))) return { ok: false, neden: 'imza geçersiz' };
  const son = await yerel('haritaSon');
  if (son && surumKars(h.surum, son) < 0) return { ok: false, neden: `eski sürüm (${h.surum} < ${son})` };
  if (son && surumKars(h.surum, son) === 0) return { ok: true, surum: h.surum, ayni: true };
  const { imza, aciklama, ...temiz } = h;
  await chrome.storage.local.set({ harita: temiz, haritaSon: h.surum, haritaZaman: Date.now() });
  return { ok: true, surum: h.surum };
}

// Bütün iletiler sırayla işlenir (aynı anda gelen durum, durdur ve iptal birbirinin yazdığını ezmesin)
let zincir = Promise.resolve();
chrome.runtime.onMessage.addListener((m, kimden, cevap) => {
  zincir = zincir.then(() => isle(m, kimden)).catch(() => null).then(r => { try { cevap(r); } catch (x) { } return null; });
  return true;
});
async function isle(m, kimden) {
  if (!m || typeof m !== 'object') return null;
  if (m.tur === 'kuyruk-koy') { await koy('kuyruk', { kurs: m.kurs || '', zaman: Date.now(), isler: m.isler || [], oto: !!m.oto }); return { ok: true, n: (m.isler || []).length }; }
  if (m.tur === 'kuyruk-basladi') { const q = (await al('kuyruk')) || { isler: [] }; q.oto = false; await koy('kuyruk', q); return { ok: true }; }
  if (m.tur === 'is-hata') { const h = (await al('hatalar')) || []; h.push({ id: m.id, not: m.not || '', zaman: Date.now() }); await koy('hatalar', h); return { ok: true }; }
  if (m.tur === 'hatalar-al') { const h = (await al('hatalar')) || []; await chrome.storage.session.remove('hatalar'); return h; }
  if (m.tur === 'mebbis-ac') {
    const l = await chrome.tabs.query({ url: 'https://mebbis.meb.gov.tr/*' });
    await koy('yeni', true);
    if (l.length) { const s = l.find(x => x.active) || l[0]; await chrome.tabs.update(s.id, { active: true }); await chrome.windows.update(s.windowId, { focused: true }).catch(() => { }); chrome.tabs.sendMessage(s.id, { tur: 'yeniden-bak' }).catch(() => { }); return { sekme: 'gecildi' }; }
    // MEBBİS sekmesi yoksa mdSinyal sekmesinin hemen yanında, aynı pencerede açılır ve öne gelir
    const yan = kimden && kimden.tab;
    const yeniSekme = await chrome.tabs.create({ url: 'https://mebbis.meb.gov.tr/', active: true, ...(yan ? { windowId: yan.windowId, index: yan.index + 1, openerTabId: yan.id } : {}) });
    await chrome.windows.update(yeniSekme.windowId, { focused: true }).catch(() => { });
    return { sekme: 'acildi' };
  }
  // toplu iş (arka plan motoru): mdSinyal koyar, MEBBİS sekmesindeki motor yürütür ve ilerledikçe sonucu yazar, mdSinyal sonucu alır
  // B9: bitmemiş (çalışan, durdurulmuş, oturumu düşmüş) iş varken yeni iş üstüne yazılmaz
  if (m.tur === 'toplu-koy') {
    const is = m.is || {}, t = await al('toplu');
    // aynı iş yeniden gelirse dokunulmaz; ama 6 saati geçmiş (motorun artık okumadığı) bitmemiş iş yeni yükle tazelenir, yoksa "Devam et" hiçbir şey yapmazdı
    if (t && t.id === is.id && (t.bitti || bitmemis(t))) return { ok: true, ayni: true };
    if (bitmemis(t)) return { ok: false, mesgul: true, id: t.id, kalan: kalanOf(t), durum: t.durum || 'bekliyor' };
    await koy('toplu', { ...is, zaman: Date.now(), sonuc: null, bitti: false, durum: 'bekliyor' });
    await ilerlemeYaz(is.id, () => ({ id: is.id, olusturma: Date.now(), kimlikler: idler(is), kurum: String(is.kurum || '').replace(/\D/g, '').slice(0, 8), cek: (is.cek || []).length + ((is.dosya || []).length ? 1 : 0), yazilan: [], durum: 'bekliyor', suruyor: null }));
    return { ok: true };
  }
  // Tarayıcı kapanıp iş yükü silindiyse mdSinyal kalan işleri yeniden hazırlayıp verir. Yalnız ilk onaydaki kimlikler kabul edilir;
  // iş durdurulmuşsa ya da ilerleme kaydı yoksa "durduruldu" olarak bekler (yetkili "Devam et" der).
  if (m.tur === 'toplu-yuk-koy') {
    const t = await al('toplu'); if (t && t.id === m.id) return { ok: true, ayni: true };
    if (bitmemis(t)) return { ok: false, mesgul: true, id: t.id, kalan: kalanOf(t) };
    const r = ((await yerel('ilerleme')) || {})[m.id], izinli = r ? new Set(r.kimlikler || []) : null;
    const yaz = (Array.isArray(m.yaz) ? m.yaz : []).filter(x => x && (x.adaylar ? x.adaylar.map(a => a.id) : [x.id]).every(id => !izinli || izinli.has(id)));
    if (!m.id || !yaz.length) return { ok: false, neden: 'yazılacak iş yok' };
    const durum = r && r.durum !== 'durduruldu' ? 'bekliyor' : 'durduruldu';
    await koy('toplu', { id: m.id, cek: [], dosya: [], yaz, kurum: (r && r.kurum) || '', zaman: Date.now(), sonuc: null, bitti: false, durum, yeniden: true });
    await ilerlemeYaz(m.id, () => ({ id: m.id, olusturma: Date.now(), kimlikler: idler({ yaz }), kurum: (r && r.kurum) || '', cek: 0, yazilan: [], durum, suruyor: null }));
    return { ok: true, durum, n: yaz.length };
  }
  if (m.tur === 'toplu-al') { const t = await al('toplu'); return t && Date.now() - t.zaman < YUK_OMRU && !t.iptal ? t : null; }
  if (m.tur === 'toplu-durum') {
    const t = await al('toplu'), guncel = !!t && t.id === m.id, son = !!m.bitti || m.durum === 'iptal';
    if (guncel) {
      t.sonuc = m.sonuc; t.bitti = !!m.bitti;
      if (!(t.durum === 'durduruldu' && m.durum === 'calisiyor')) t.durum = m.durum || t.durum;   // yetkilinin Durdur'u, süren kaydın durum yazısıyla ezilmez
      if (m.sahip) t.kilit = { sahip: m.sahip, zaman: Date.now() };
      await koy('toplu', t);
    } else if (!((await al('teslim')) || {})[m.id] && !(Date.now() - (((await al('iptaller')) || {})[m.id] || 0) < IPTAL_IZ)) return { ok: false };
    // iptal edilmiş işin iptalden sonra biten son kaydı yalnız teslime işlenir; mdSinyal iptal teslimini çoktan onaylamışsa yeni teslim kaydı açılır
    // (MEBBİS'e gitmiş bir kayıt mdSinyal'de "gönderilmedi" görünmesin)
    await teslimYaz(m.id, e => ({ id: m.id, sonuc: guncel ? m.sonuc : { ...m.sonuc, veri: {}, hata: (e && e.sonuc && e.sonuc.hata) || 'İş iptal edildi.', hataTur: 'iptal' }, bitti: guncel && !!m.bitti, son: son || !guncel || !!(e && e.son), iptal: !guncel || !!(e && e.iptal), durum: guncel ? t.durum : 'iptal', zaman: Date.now() }));
    await ilerlemeYaz(m.id, r => r ? { ...r, yazilan: ozetle(m.sonuc && m.sonuc.yazilan), durum: guncel ? (m.bitti ? 'bitti' : t.durum) : 'iptal', suruyor: (m.sonuc && m.sonuc.suruyor) || null } : undefined);
    return { ok: true, durum: guncel ? t.durum : 'iptal' };
  }
  // B6: Durdur kalıcıdır; yalnız "Devam et" sürdürür
  if (m.tur === 'toplu-durdur') { const t = await al('toplu'); if (!t || (m.id && t.id !== m.id) || t.bitti) return { ok: false }; t.durum = 'durduruldu'; await koy('toplu', t); await teslimYaz(t.id, e => e ? { ...e, durum: 'durduruldu', zaman: Date.now() } : undefined); await ilerlemeYaz(t.id, r => r ? { ...r, durum: 'durduruldu' } : undefined); return { ok: true }; }
  if (m.tur === 'toplu-devam') { const t = await al('toplu'); if (!t || (m.id && t.id !== m.id) || t.bitti) return { ok: false }; t.durum = 'calisiyor'; await koy('toplu', t); return { ok: true }; }
  // B7: iptal işi depodan kaldırır (motor bir sonraki adımda durur); o ana kadar yazılanlar mdSinyal'e teslim edilir
  if (m.tur === 'toplu-iptal') {
    const t = await al('toplu'); if (!t || (m.id && t.id !== m.id)) return { ok: true, yok: true };
    if (t.bitti) return { ok: true, bitti: true };   // iş iptalden hemen önce bitmiş: sonucu (çekilen veriler dahil) iptal yazısıyla ezilmez
    const s = t.sonuc || { veri: {}, yazilan: [] }, kalan = kalanOf(t);
    await teslimYaz(t.id, () => ({ id: t.id, sonuc: { ...s, veri: {}, hata: `İş iptal edildi${kalan ? `; ${kalan} iş MEBBİS’e gönderilmedi` : ''}.`, hataTur: 'iptal' }, bitti: false, son: true, iptal: true, durum: 'iptal', zaman: Date.now() }));
    await chrome.storage.session.remove('toplu');
    const ip = (await al('iptaller')) || {}; for (const k of Object.keys(ip)) if (Date.now() - ip[k] > IPTAL_IZ) delete ip[k]; ip[t.id] = Date.now(); await koy('iptaller', ip);
    await ilerlemeYaz(t.id, r => r ? { ...r, durum: 'iptal' } : undefined);
    return { ok: true };
  }
  // aynı iş iki MEBBİS sekmesinde birden yürümesin
  if (m.tur === 'toplu-kilit') {
    const t = await al('toplu'); if (!t || t.id !== m.id) return { ok: false, yok: true };
    if (t.kilit && t.kilit.sahip !== m.sahip && Date.now() - t.kilit.zaman < KILIT_OMRU) return { ok: false };
    t.kilit = { sahip: m.sahip, zaman: Date.now() }; await koy('toplu', t); return { ok: true };
  }
  if (m.tur === 'toplu-kilit-birak') { const t = await al('toplu'); if (t && t.id === m.id && t.kilit && t.kilit.sahip === m.sahip) { delete t.kilit; await koy('toplu', t); } return { ok: true }; }
  // B8: sonuç, mdSinyal sayfası girişli hâlde alana kadar saklanır (oturum kapalıysa kaybolmaz)
  if (m.tur === 'teslim-al') {
    const tes = (await al('teslim')) || {}, t = await al('toplu'), l = Object.values(tes);
    const il = (await yerel('ilerleme')) || {};
    for (const r of Object.values(il)) if (!r.teslim && !tes[r.id] && !(t && t.id === r.id) && Date.now() - (r.guncel || 0) < ILERLEME_OMRU) l.push(yereldenTeslim(r));
    return l.sort((a, b) => a.zaman - b.zaman);
  }
  if (m.tur === 'teslim-tamam' || m.tur === 'toplu-sonuc-onay') {
    const tes = (await al('teslim')) || {}, e = tes[m.id];
    if (e && !e.son) return { ok: false };
    if (e && m.zaman != null && e.zaman !== m.zaman) return { ok: false, yeni: true };   // teslimden sonra daha yeni kayıt gelmiş
    if (e) await teslimYaz(m.id, () => null);
    const t = await al('toplu'); if (t && t.id === m.id && t.bitti) await chrome.storage.session.remove('toplu');
    // yarım kalmış (kalan işi olan) ilerleme, mdSinyal kalanları yeniden hazırlayana kadar "teslim edildi" olarak durur; ötekiler silinir
    if (!t || t.id !== m.id || t.bitti) await ilerlemeYaz(m.id, r => r && !(t && t.id === m.id) && !['bitti', 'iptal'].includes(r.durum) && (r.kimlikler || []).length > (r.yazilan || []).filter(y => y.ok).length ? { ...r, teslim: true } : null);
    return { ok: true };
  }
  // MEB-187: MEBBİS oturumu açık mı (mebbis.js yoklar); açılır pencere ve mdSinyal üst şeridi
  if (m.tur === 'canli-koy') { await koy('canli', { acik: !!(m.durum && m.durum.acik), zaman: (m.durum && m.durum.zaman) || Date.now() }); return { ok: true }; }
  if (m.tur === 'canli-al') return (await al('canli')) || null;
  if (m.tur === 'ilerleme-al') { const il = (await yerel('ilerleme')) || {}, t = await al('toplu'); return Object.values(il).map(r => ({ ...r, oturumda: !!(t && t.id === r.id) })); }
  if (m.tur === 'harita-koy') return haritaKoy(m.harita, kimden);
  // MEB-173: İzle kipi açılınca işin yürüdüğü MEBBİS sekmesi öne gelir (yalnız MEBBİS sekmesinden gelen istek)
  if (m.tur === 'izle-sekme') { const t = kimden && kimden.tab; if (!t || !/^https:\/\/mebbis\.meb\.gov\.tr\//.test(t.url || '')) return { ok: false }; try { await chrome.tabs.update(t.id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); } catch (x) { } return { ok: true }; }
  if (m.tur === 'harita-al') { const h = await yerel('harita'); return h && !haritaDenetle(h) ? { harita: h } : null; }
  if (m.tur === 'hedef-koy') { await koy('hedef', m.hedef); return { ok: true }; }
  if (m.tur === 'hedef-al') return (await al('hedef')) || null;
  if (m.tur === 'hedef-sil') { await chrome.storage.session.remove('hedef'); return { ok: true }; }
  if (m.tur === 'sinyal-burada' && kimden && kimden.tab) { await koy('sinyalSekme', { id: kimden.tab.id, pencere: kimden.tab.windowId }); return { ok: true }; }
  if (m.tur === 'sinyal-ac') { const s = await al('sinyalSekme'); if (!s) return { ok: false }; try { await chrome.tabs.update(s.id, { active: true }); await chrome.windows.update(s.pencere, { focused: true }); return { ok: true }; } catch (x) { return { ok: false }; } }
  if (m.tur === 'yeni-al') { const y = await al('yeni'); await chrome.storage.session.remove('yeni'); return !!y; }
  if (m.tur === 'aktif-al') return (await al('aktif')) || null;
  if (m.tur === 'aktif-koy') { await koy('aktif', m.aktif); return { ok: true }; }
  if (m.tur === 'kuyruk-al') return (await al('kuyruk')) || { isler: [] };
  if (m.tur === 'is-bitti') { const q = (await al('kuyruk')) || { isler: [] }; const x = q.isler.find(y => y.id === m.id); if (x) x.bitti = Date.now(); await koy('kuyruk', q); const b = (await al('bitenler')) || []; b.push({ id: m.id, ref: x && x.ref, tur: x && x.tur, zaman: Date.now() }); await koy('bitenler', b); return { ok: true }; }
  // biten işler mdSinyal işleyip "aldım" deyince silinir (sayfa henüz hazır değilse kaybolmasın)
  if (m.tur === 'bitenler-al') return (await al('bitenler')) || [];
  if (m.tur === 'bitenler-sil') { const ids = new Set(m.ids || []); const b = ((await al('bitenler')) || []).filter(x => !ids.has(x.id)); await koy('bitenler', b); return { ok: true }; }
  if (m.tur === 'kuyruk-temizle') { await chrome.storage.session.remove(['kuyruk', 'bitenler', 'tablo']); return { ok: true }; }
  if (m.tur === 'tablo-koy') { await koy('tablo', { zaman: Date.now(), ...m.tablo }); return { ok: true }; }
  if (m.tur === 'tablo-al') { const t = await al('tablo'); await chrome.storage.session.remove('tablo'); return t || null; }
  // formun MEBBİS adresi (kişisel veri yok) ve panel ayarları kalıcı saklanır
  if (m.tur === 'sayfa-al') return (await chrome.storage.local.get('sayfa')).sayfa || {};
  if (m.tur === 'sayfa-koy') { const s = (await chrome.storage.local.get('sayfa')).sayfa || {}; s[m.is] = { yol: m.yol, adres: m.adres }; await chrome.storage.local.set({ sayfa: s }); return { ok: true }; }
  if (m.tur === 'ayar-al') return ((await chrome.storage.local.get('ayar')).ayar || {})[m.ad];
  if (m.tur === 'ayar-koy') { const a = (await chrome.storage.local.get('ayar')).ayar || {}; a[m.ad] = m.deger; await chrome.storage.local.set({ ayar: a }); return { ok: true }; }
  if (m.tur === 'esleme-al') return (await chrome.storage.local.get('esleme')).esleme || {};
  if (m.tur === 'esleme-koy') { const e = (await chrome.storage.local.get('esleme')).esleme || {}; e[m.anahtar] = m.secici; await chrome.storage.local.set({ esleme: e }); return { ok: true }; }
  return null;
}
