import { S, kaydet, kursiyer, egitmen, arac, tamAd, SINIFLAR, islem, gonderimEkle, yerelZaman, eksikEvrak, selam, kursAdi, adEk, bulutKanca, kursiyerTaban, sinifEtiket } from './veri.js?v=234';
import { e, tl, ik, isaret, bildir, tamTarih, tarihUzun, pencere, kapatPencere, waAc, waUrl, apiAcik, belgeWhatsApp, etiket, kisaLink, waKok, imzaOlcuDenetle, imzaOlcuHesap, IMZA_ASGARI } from './ui.js?v=234';
import { sozlesmeMaddeleri, belgeHtml, dosyaAdi, sozlesmeDondur } from './sayfalar3.js?v=234';
import * as GR from './gruplar.js?v=234';
import { stilEkle as oxStil, oi, sayfaBas as oxSayfaBas, bolum as oxBolum, liste as oxListe, satir as oxSatir, ikonKutu, dugme as oxDugme, not as oxNot, gorsel as oxGorsel } from './ogr/ui.js?v=234';
import { satirAdi, listeAdi } from './taban.js?v=234';

/* ================= UZAKTAN İMZA =================
   1) Kurs "WhatsApp'tan imzaya gönder" der: belge özeti linke paketlenir, kursun anahtarıyla mühürlenir,
      WhatsApp kursiyerin numarasına hazır mesajla açılır.
   2) Kursiyer linki açar (giriş gerekmez), belgeyi okur, parmağıyla imzalar. İmza dönüş linkine paketlenir,
      WhatsApp kursun hattına hazır mesajla açılır; kursiyer gönderir.
   3) Kurs dönüş linkine dokunur: mühür ve belge özeti doğrulanır, imza kayda (sözleşme / takip formu) işlenir.
   Kanıt (v209): istekte belgenin SHA-256 özeti (bo) tutulur; öğrencinin telefonu gördüğü belgenin özetini, imza anının yerel ve ISO
   saatini, saat dilimini ve cihaz bilgisini dönüşe koyar. Kısa link servisi dönüşü bir kez yazar ve yanına sunucu zamanı, IP, ülke ve
   tarayıcı bilgisini ekler; bu bilgi yalnız isteğin mührünü bilen kursa verilir (ka). Hepsi imza kaydında 'kanit' alanında durur.
   Eski linkler (bo yok) yine kabul edilir, kayıtta "eski biçim" diye işaretlenir. */

const b64 = u8 => { let s = ''; u8.forEach(c => { s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function paketle(o) {
  const json = JSON.stringify(o);
  if (typeof CompressionStream === 'undefined') return 'j' + b64(new TextEncoder().encode(json));
  const akis = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return 'z' + b64(new Uint8Array(await new Response(akis).arrayBuffer()));
}
async function paketAc(t) {
  const bayt = unb64(t.slice(1));
  if (t[0] === 'j') return JSON.parse(new TextDecoder().decode(bayt));
  const akis = new Blob([bayt]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(akis).text());
}
async function muhur(metin) {
  if (!S.imzaAnahtari) { S.imzaAnahtari = b64(crypto.getRandomValues(new Uint8Array(24))); kaydet(); }
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(S.imzaAnahtari), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(metin)))).slice(0, 22);
}
const adres = () => location.origin + location.pathname;
// SHA-256 (onaltılık): belge ve imza özeti
async function ozetHex(metin) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(metin)))].map(x => x.toString(16).padStart(2, '0')).join(''); }
// sunucudaki kanıt kaydının anahtarı: imza isteğinin mührünü bilen (öğrenci linki ve kurs) üretebilir, link numarasını tahmin eden üretemez
const kanitAnahtari = m => ozetHex('takip|' + m).then(h => h.slice(0, 32));
const ikiHane = n => String(n).padStart(2, '0');
function yerelSaat(d) { const o = -d.getTimezoneOffset(), a = Math.abs(o); return `${ikiHane(d.getDate())}.${ikiHane(d.getMonth() + 1)}.${d.getFullYear()} ${ikiHane(d.getHours())}:${ikiHane(d.getMinutes())}:${ikiHane(d.getSeconds())} (GMT${o < 0 ? '−' : '+'}${ikiHane(Math.floor(a / 60))}:${ikiHane(a % 60)})`; }
function cihazBilgisi() {
  let sd = ''; try { sd = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (x) { }
  return { ekran: `${screen.width}x${screen.height}@${Math.round((devicePixelRatio || 1) * 100) / 100}`, dil: navigator.language || '', sd, dokunma: navigator.maxTouchPoints || 0 };
}
export { waAc };
const kursWp = () => S.kurs.wp || '';

function belgeModeli(tur, k, dersIdleri) {
  const kurs = { ad: S.kurs.ad, tel: S.kurs.tel, adres: S.kurs.adres, yetkili: S.kurs.yetkili, wp: kursWp() };
  const kisi = { ad: tamAd(k), tc: k.tc ? k.tc.slice(0, 3) + '•••••' + k.tc.slice(-3) : '', tel: k.tel };
  if (tur === 'sozlesme') { const x = kursiyerTaban(k); return { kurs, kisi, sinif: sinifEtiket(k.sinif, k), kayit: k.kayit, odeme: { toplam: k.odeme.toplam, pesin: k.odeme.pesin, pesinTarih: k.odeme.pesinTarih, taksit: k.odeme.taksitler.map(t => [t.vade, t.tutar]), indirim: x ? null : (k.odeme.indirim || null) }, taban: x && x.satir ? { ad: satirAdi(x.satir), tutar: x.taban, liste: listeAdi(x.liste) } : null, madde: sozlesmeMaddeleri(k) }; }  // il taban listesi: öğrenci imzalamadan önce taban ve not 4–5 görünür; indirim satırı gösterilmez (not 6)
  return { kurs, kisi, sinif: SINIFLAR[k.sinif].ad, ders: dersIdleri.map(id => S.dersler.find(d => d.id === id)).filter(Boolean).map(d => [d.tarih, d.bas ? d.bas + '–' + d.bit : d.saat, egitmen(d.egitmen).ad, d.arac ? arac(d.arac).plaka : '', d.sure || null]) };
}

// Kurs tarafı: imza isteği oluştur ve WhatsApp'ı aç.
export async function imzaIste(tur, k, dersIdleri = []) {
  if (tur === 'ders' && !dersIdleri.length) return bildir('İmzası eksik ders yok', 'uyari');
  const belge = belgeModeli(tur, k, dersIdleri), ozet = await muhur(JSON.stringify(belge)), bo = await ozetHex(JSON.stringify(belge));
  const id = 'i' + Date.now().toString(36);
  const m = await muhur([id, tur, k.id, ozet].join('|'));
  const uzun = adres() + '#/imza/' + await paketle({ v: 1, id, tur, k: k.id, ozet, m, bo, belge, ...(S.kurs.imzaAsgari != null && S.kurs.imzaAsgari !== '' && isFinite(+S.kurs.imzaAsgari) ? { ia: +S.kurs.imzaAsgari } : {}), ...(S.kurs.waApi ? { api: S.kurs.waApi, ...(etiket('', 'KURSA GELEN') ? { dk: 1 } : {}) } : {}), ...(S._bulut ? { g: 1 } : {}) });
  const link = await kisaLink(uzun, tur === 'sozlesme' ? 'sozlesme imzasi' : 'ders katilim imzasi');
  if (link === uzun && uzun.length > 1500) bildir('Kısa link oluşturulamadı; uzun link WhatsApp’ta kesilebilir', 'uyari');
  S.imzaTalepleri = (S.imzaTalepleri || []).filter(t => !(t.durum === 'bekliyor' && t.kursiyer === k.id && t.tur === tur && (tur === 'sozlesme' || dersIdleri.every(x => t.dersler.includes(x)))));
  S.imzaTalepleri.push({ id, tur, kursiyer: k.id, dersler: dersIdleri, ozet, belgeOzet: bo, tarih: yerelZaman(), durum: 'bekliyor', link, ...(tur === 'sozlesme' ? { metin: sozlesmeDondur(k) } : {}) });
  const dersler = dersIdleri.map(x => S.dersler.find(d => d.id === x)).filter(Boolean).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const satir = d => `• ${tarihUzun(d.tarih)} ${d.bas || d.saat}${d.bit ? '–' + d.bit : ''}${egitmen(d.egitmen) ? ' · ' + egitmen(d.egitmen).ad : ''}`;
  const metin = tur === 'sozlesme'
    ? `${selam(k)} ${kursAdi()} kurs sözleşmeniz imzanızı bekliyor.\n\nOkuyup parmağınızla imzalamak için dokunun:\n${link}`
    : `${selam(k)} ${dersler.length > 1 ? 'aşağıdaki direksiyon derslerinizin' : 'direksiyon dersinizin'} takip formu imzanızı bekliyor:\n\n${dersler.map(satir).join('\n')}\n\nKontrol edip parmağınızla imzalamak için dokunun (1 dakika sürer):\n${link}`;
  islem('İmzaya gönderdi', tamAd(k) + ' · ' + (tur === 'sozlesme' ? 'sözleşme' : dersIdleri.length + ' ders')); gonderimEkle(tamAd(k), (tur === 'sozlesme' ? 'Sözleşme' : 'Takip formu') + ' imza linki', 'İmza isteği'); kaydet();
  waAc(k.tel, metin, 'WhatsApp', tamAd(k), false, 'ÖĞRENCİ');
  return id;
}
export const bekleyenImza = (k, tur) => (S.imzaTalepleri || []).filter(t => t.kursiyer === k.id && t.durum === 'bekliyor' && (!tur || t.tur === tur));

/* --- imza tuvali: çizgileri vektör olarak tutar (linke sığsın diye) ---
   Ölçü denetimi ui.js imzaAlani ile aynı ölçüt (imzaOlcuDenetle, IMZA_ASGARI): tek dokunuş, nokta, düz ya da çok kısa çizgi imza sayılmaz.
   Uzunluk sınırı isteği gönderen kursun ayarıdır (paketteki 'ia', % tuval eni); eski linklerde yoktur, varsayılan geçerli. */
function imzaSorunu(o, cv, ia) {
  // yapı denetimleri (nokta, en/boy) ortak işlevden, uzunluk sınırı paketteki kurs değeriyle; pakette yoksa varsayılan.
  // Öğrencinin cihazındaki yerel ayar (S.kurs.imzaAsgari) kullanılmaz: eşik isteği gönderen kursun ayarıdır.
  const v = ia === undefined || ia === null || ia === '' || isNaN(+ia) ? null : +ia;
  const W = cv.width, u = v === null ? IMZA_ASGARI.uzunluk : v === 0 ? 0 : v > 0 ? v / 100 : IMZA_ASGARI.uzunluk;
  const yapi = imzaOlcuDenetle({ ...o, uzunluk: Math.max(o.uzunluk, W * 100) }, cv); if (yapi) return yapi;
  if (o.uzunluk < W * 0.04) return imzaOlcuDenetle({ ...o, uzunluk: 0, nokta: Math.max(1, o.nokta) }, cv);   // tek dokunuş metni
  if (o.uzunluk < W * u) return 'İmza çok kısa; tam imzanızı atın';
  return '';
}
/* Kurs tarafı ölçü denetimi: dönen imzanın vektöründen (300×100 ölçek) aynı ölçü yeniden hesaplanır; eşik kursun kendi ayarıdır
   (S.kurs.imzaAsgari). Eşiğin altındaki imza reddedilmez: kanıta 'olcuAlti' ve 'olcuNot' yazılır, ekranda uyarı çıkar.
   Öğrencinin sayfası eski sürümse ya da link elle kurulmuşsa ölçü denetimi atlanmış olabilir; bu denetim onu yakalar. */
const VEKTOR_TUVAL = { width: 300, height: 100 };
function vektorOlcu(v) {
  return imzaOlcuHesap(v, VEKTOR_TUVAL.width, VEKTOR_TUVAL.height);
}
export function donenImzaOlcu(v) {
  const olcu = vektorOlcu(v);
  const sorun = olcu.nokta ? imzaSorunu(olcu, VEKTOR_TUVAL, S.kurs ? S.kurs.imzaAsgari : undefined) : 'İmza alanı boş';
  return { olcu, sorun };
}
function tuval(cv) {
  const c = cv.getContext('2d'); c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111';
  let cizgiler = [], su = null;
  const n = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', ev => { su = [n(ev)]; cizgiler.push(su); c.beginPath(); c.moveTo(...su[0]); try { cv.setPointerCapture(ev.pointerId); } catch (x) { } });
  cv.addEventListener('pointermove', ev => { if (!su) return; const p = n(ev), o = su[su.length - 1]; if (Math.hypot(p[0] - o[0], p[1] - o[1]) < 4) return; su.push(p); c.lineTo(...p); c.stroke(); });
  const bitir = () => { su = null; }; cv.addEventListener('pointerup', bitir); cv.addEventListener('pointercancel', bitir);
  return {
    // ölçü: nokta sayısı, toplam çizgi uzunluğu, sınır kutusu (tuval pikseli; ui.js imzaAlani ile aynı alanlar)
    olcu: () => imzaOlcuHesap(cizgiler, cv.width, cv.height),
    murekkep: () => cizgiler.some(s => s.length > 1),
    bos: () => !cizgiler.some(s => s.length > 2),
    temizle: () => { cizgiler = []; c.clearRect(0, 0, cv.width, cv.height); },
    vektor: () => cizgiler.filter(s => s.length > 1).map(s => s.map(([x, y]) => [Math.round(x * 300 / cv.width), Math.round(y * 100 / cv.height)])),
  };
}
function vektordenResim(v) {
  const cv = document.createElement('canvas'); cv.width = 600; cv.height = 200;
  const c = cv.getContext('2d'); c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111';
  v.forEach(s => { c.beginPath(); s.forEach(([x, y], i) => (i ? c.lineTo(x * 2, y * 2) : c.moveTo(x * 2, y * 2))); c.stroke(); });
  return cv.toDataURL('image/png');
}

/* --- kursiyerin imza sayfası: öğrenci uygulamasının tasarım dili (js/ogr/ui.js, ox-); sınıflar ox-uim- önekli ---
   Sayfa giriş yapmadan, uygulama kabuğu olmadan açılır; ox değişkenleri body.ox-modu yerine kendi kabuğunda tanımlanır
   (body'ye ox-modu eklenmez, böylece aynı sekmede açılan başka ekranlara sızmaz). */
const IM_LOGO = '<svg class="logo-isaret" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="#141e33"/><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><g fill="none" stroke="#ffc21a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l12 12-12 12" stroke-opacity=".38"/><path d="M33 20l12 12-12 12"/></g></svg>';
function oxDegisken() {
  const s = document.querySelector('style[data-ox="ox-temel"]'), m = s && /body\.ox-modu\{([^}]*)\}/.exec(s.textContent);
  return m ? m[1].split(';').map(x => x.trim()).filter(x => x.startsWith('--')).join(';') : '';
}
function imStil() {
  oxStil('ox-uim', `
.ox-uim-kabuk{${oxDegisken()};min-height:100vh;min-height:100dvh;background:var(--ox-zemin);color:var(--ox-metin);font-family:var(--ox-yazi);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
body.ox-uim-acik{background:#f7f8fa}
.ox-uim-kabuk *{box-sizing:border-box}
.ox-uim-ust{position:sticky;top:0;z-index:25;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;background:rgba(247,248,250,.86);-webkit-backdrop-filter:saturate(180%) blur(18px);backdrop-filter:saturate(180%) blur(18px);border-bottom:.5px solid transparent;transition:border-color .2s}
.ox-uim-ust.kaydi{border-bottom-color:var(--ox-cizgi)}
.ox-uim-ust .ox-ust-ic{min-height:44px}
.ox.ox-uim{padding-bottom:calc(40px + env(safe-area-inset-bottom))}
.ox-uim h1,.ox-uim h2,.ox-uim b{font-family:inherit}
.ox-uim .ox-sayfa-bas{margin-top:10px}
.ox-uim .ox-sayfa-bas p{font-size:15px;line-height:1.35}
/* bilgi satırları: simge + etiket + değer */
.ox-uim-bilgi{padding:2px 0}
.ox-uim-bs{position:relative;display:grid;grid-template-columns:22px 80px minmax(0,1fr);align-items:start;gap:12px;padding:13px 16px}
.ox-uim-bs+.ox-uim-bs::before{content:"";position:absolute;top:0;left:50px;right:16px;border-top:1px solid var(--ox-ayrac)}
.ox-uim-bs>.ox-i{width:22px;height:22px;color:var(--ox-mavi);margin-top:-1px}
.ox-uim-bs-et{font-size:15px;line-height:1.35;color:var(--ox-ikincil)}
.ox-uim-bs-d{min-width:0;display:grid;gap:1px;font-size:15.5px;line-height:1.35;font-weight:600;color:var(--ox-bas);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.ox-uim-bs-d small{font-size:14px;font-weight:400;color:var(--ox-ikincil)}
/* ödeme planı sıra numarası */
.ox-uim-no{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:1.5px solid var(--ox-cizgi);font-size:14.5px;font-weight:700;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-uim .ox-liste .ox-satir{min-height:60px}
.ox-uim .ox-liste>.ox-satir:has(.ox-uim-no)+.ox-satir::before{left:66px}
/* sözleşme maddeleri */
.ox-uim-metin{position:relative;padding:16px 16px 14px;font-size:14.5px;line-height:1.5;color:var(--ox-metin)}
.ox-uim-metin p+p{margin-top:10px}
.ox-uim-metin p b{color:var(--ox-bas);font-weight:700}
.ox-uim-metin.kapali{max-height:300px;overflow:hidden}
.ox-uim-metin.kapali::after{content:"";position:absolute;left:0;right:0;bottom:0;height:96px;background:linear-gradient(rgba(255,255,255,0),#fff 82%);pointer-events:none}
.ox-uim-ac{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:48px;color:var(--ox-mavi);font-size:15.5px;font-weight:600;border-top:1px solid var(--ox-ayrac)}
.ox-uim-ac .ox-i{width:20px;height:20px;stroke-width:2.1;transition:transform .2s}
.ox-uim-ac[aria-expanded="true"] .ox-i{transform:rotate(180deg)}
/* imza formu */
.ox-uim-form{margin-top:12px;overflow:hidden}
.ox-uim-onay{position:relative;display:flex;align-items:center;gap:12px;min-height:58px;padding:12px 16px;font-size:16px;line-height:1.35;font-weight:500;color:var(--ox-bas);cursor:pointer;border-bottom:1px solid var(--ox-ayrac)}
.ox-uim-onay input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.ox-uim-onay input:checked+.ox-kutucuk-k{background:var(--ox-mavi);border-color:var(--ox-mavi);color:#fff}
.ox-uim-onay input:focus-visible+.ox-kutucuk-k{outline:2.5px solid var(--ox-mavi);outline-offset:2px}
.ox-uim-alan{padding:16px 16px 0}
.ox-uim-alan:last-child{padding-bottom:16px}
.ox-uim-et{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:24px;margin-bottom:8px;font-size:15px;font-weight:700;color:var(--ox-bas)}
.ox-uim-girdi{display:block;width:100%;height:50px;padding:0 14px;border:1px solid var(--ox-cizgi);border-radius:var(--ox-r-dg);background:#fff;font:inherit;font-size:16px;color:var(--ox-bas);outline:none;-webkit-appearance:none;appearance:none;transition:border-color .15s,box-shadow .15s}
.ox-uim-girdi::placeholder{color:var(--ox-soluk)}
.ox-uim-girdi:focus{border-color:var(--ox-mavi);box-shadow:0 0 0 3px var(--ox-mavi-acik)}
.ox-uim-temizle{position:relative;display:inline-flex;align-items:center;gap:5px;min-height:32px;padding:0 4px;color:var(--ox-mavi);font-size:15px;font-weight:600}
.ox-uim-temizle::after{content:"";position:absolute;inset:-6px -6px}
.ox-uim-temizle .ox-i{width:18px;height:18px;stroke-width:2.1}
.ox-uim-tuval{position:relative;border:1.5px dashed #c9d2e2;border-radius:14px;background:#fbfcfe;overflow:hidden}
.ox-uim-tuval canvas{display:block;width:100%;height:auto;aspect-ratio:3/1;touch-action:none;position:relative;z-index:1}
.ox-uim-tuval-ipucu{position:absolute;inset:0 0 24% 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--ox-soluk);font-size:14.5px;pointer-events:none;transition:opacity .15s}
.ox-uim-tuval-ipucu .ox-i{width:24px;height:24px}
.ox-uim-tuval::after{content:"";position:absolute;left:18px;right:18px;bottom:24%;border-top:1px solid #e3e8f0;pointer-events:none}
.ox-uim-tuval.dolu .ox-uim-tuval-ipucu{opacity:0}
.ox-uim-dg{margin-top:16px}
.ox-uim-onay.hata{background:var(--ox-kirmizi-acik)}
.ox-uim-onay.hata .ox-kutucuk-k{border-color:var(--ox-kirmizi)}
.ox-uim-girdi.hata{border-color:var(--ox-kirmizi);box-shadow:0 0 0 3px var(--ox-kirmizi-acik)}
.ox-uim-tuval.hata{border-color:var(--ox-kirmizi);background:#fffafa}
.ox-uim-tuval.hata .ox-uim-tuval-ipucu{color:var(--ox-kirmizi)}
.ox-uim-imza-uyari{margin:8px 2px 0;font-size:14.5px;line-height:1.35;font-weight:500;color:color-mix(in srgb,var(--ox-kirmizi) 78%,#000)}
.ox-uim-imza-uyari[hidden]{display:none}
@keyframes ox-uim-titre{0%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.ox-uim-onay.hata .ox-kutucuk-k,.ox-uim-girdi.hata,.ox-uim-tuval.hata{animation:ox-uim-titre .28s ease 1}
@media (prefers-reduced-motion:reduce){.ox-uim-kabuk *{animation:none!important;transition:none!important}}
/* bildirim: bu sayfada öğrenci uygulamasının diliyle (koyu lacivert hap, ince gölge) */
body.ox-uim-acik .bildirimler{left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));align-items:center}
body.ox-uim-acik .bildirim{max-width:528px;width:100%;gap:10px;padding:13px 16px;border-radius:14px;background:#0f1d40;box-shadow:0 12px 30px -12px rgba(15,29,64,.45);font:600 15px/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;letter-spacing:-.005em}
body.ox-uim-acik .bildirim-uyari svg{color:#ffc21a}
body.ox-uim-acik .bildirim-wp{background:#18a058}
/* sonuç ve hata */
.ox-uim-sonuc{display:grid;justify-items:center;text-align:center;padding:20px 4px 4px}
.ox-uim-sonuc .ox-gorsel{width:150px;aspect-ratio:210/230;height:auto}
.ox-uim-sonuc h1{margin-top:14px;font-size:25px;line-height:1.15;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas);text-wrap:balance}
.ox-uim-sonuc p{margin-top:8px;max-width:340px;font-size:15.5px;line-height:1.4;color:var(--ox-ikincil);text-wrap:pretty}
.ox-uim-sonuc .ox-ik-kutu{margin-top:8px}
.ox-uim-ozet{margin-top:22px}
.ox-uim-dgler{display:grid;gap:10px;margin-top:18px}
`);
}
const imBilgi = satirlar => `<div class="ox-kart ox-uim-bilgi">${satirlar.filter(Boolean).map(([ik2, et, d, alt]) => `<div class="ox-uim-bs">${oi(ik2)}<span class="ox-uim-bs-et">${et}</span><span class="ox-uim-bs-d"><span>${d}</span>${alt ? `<small>${alt}</small>` : ''}</span></div>`).join('')}</div>`;
const tarihYil = s => s ? tarihUzun(s).split(' ').slice(0, 2).join(' ') + ' ' + String(s).slice(0, 4) : '—';
const sureDk = (s, su) => { if (su) return su; const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(s || ''); return m ? (m[3] * 60 + +m[4]) - (m[1] * 60 + +m[2]) : null; };

// Belgenin öğrenciye gösterilen hali: ders (takip formu) ya da sözleşme
function belgeGorunumu(p) {
  const b = p.belge;
  if (p.tur === 'sozlesme') {
    const o = b.odeme;
    const bilgi = imBilgi([
      ['kisi', 'Öğrenci', e(b.kisi.ad), b.kisi.tc ? 'TC ' + e(b.kisi.tc) : ''],
      ['direksiyon', 'Sınıf', e(b.sinif)],
      ['takvim', 'Kayıt tarihi', tarihYil(b.kayit)],
      ['fis', 'Kurs ücreti', tl(o.toplam), o.indirim ? `${e(o.indirim.ad)} indirimi −${tl(o.indirim.tutar)}` : 'KDV dahil'],
      b.taban ? ['fis', 'Taban ücret', tl(b.taban.tutar), `${e(b.taban.ad)} · ${e(b.taban.liste)} · kurs ücreti dışında, eğitim materyalleri dahil ücret alınmaz; sınav, harç ve kart ücreti kursiyerin kendi masrafıdır`] : null,
      ['kart', 'Peşinat', tl(o.pesin), o.pesinTarih ? tarihYil(o.pesinTarih) : ''],
      b.kurs.adres || b.kurs.tel ? ['konum', 'Kurs', e(b.kurs.ad), [b.kurs.adres, b.kurs.tel].filter(Boolean).map(e).join('<br>')] : null,
    ]);
    const plan = o.taksit.length
      ? oxListe(o.taksit.map(([v, t], i) => oxSatir({ sol: `<span class="ox-uim-no">${i + 1}</span>`, baslik: `${i + 1}. taksit`, alt: tarihYil(v), sag: tl(t), ok: false })))
      : oxListe([oxSatir({ ikon: 'tik', ton: 'yesil', baslik: 'Peşin ödendi', alt: 'Taksit yok', ok: false })]);
    const maddeler = b.madde.map((m, i) => { const n = m.indexOf('. '); const bk = n > 0 && n < 40; return `<p><b>${i + 1}. ${bk ? e(m.slice(0, n)) + '.' : ''}</b> ${e(bk ? m.slice(n + 2) : m)}</p>`; }).join('');
    return bilgi + oxBolum('Ödeme planı', o.taksit.length ? o.taksit.length + ' taksit' : '') + plan
      + oxBolum('Sözleşme maddeleri', b.madde.length + ' madde')
      + `<div class="ox-kart"><div class="ox-uim-metin${b.madde.length > 3 ? ' kapali' : ''}" id="ox-uim-metin">${maddeler}</div>${b.madde.length > 3 ? `<button type="button" class="ox-uim-ac" data-uim-ac aria-expanded="false" aria-controls="ox-uim-metin"><span>Tamamını oku</span>${oi('asagi')}</button>` : ''}</div>`;
  }
  const dersler = b.ders;
  if (dersler.length === 1) {
    const [t, s, u, pl, su] = dersler[0], dk = sureDk(s, su);
    return imBilgi([
      ['kisi', 'Öğrenci', e(b.kisi.ad), e(b.sinif)],
      ['takvim', 'Tarih', tarihUzun(t), e(s)],
      dk ? ['kronometre', 'Süre', dk + ' dakika'] : null,
      ['direksiyon', 'Öğretmen', e(u)],
      pl ? ['arac', 'Araç', e(pl)] : null,
    ]);
  }
  return imBilgi([['kisi', 'Öğrenci', e(b.kisi.ad), e(b.sinif)]])
    + oxBolum('Dersler', dersler.length + ' ders')
    + oxListe(dersler.map(([t, s, u, pl, su]) => { const dk = sureDk(s, su); return oxSatir({ ikon: 'direksiyon', baslik: tarihUzun(t), alt: `${e(s)}${dk ? ' · ' + dk + ' dk' : ''}<br>${e(u)}${pl ? ' · ' + e(pl) : ''}`, ok: false }); }));
}

// eksik alanı işaretler: kırmızı çerçeve, görünür yere kaydırır, odaklar (doğrulama mantığı aynı; uyarı yine bildir ile)
function imHata(el, odak) {
  if (!el) return;
  el.classList.remove('hata'); void el.offsetWidth; el.classList.add('hata');
  el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (odak) try { odak.focus({ preventScroll: true }); } catch (x) { }
}
const imKabuk = (kursAd, ic) => `<div class="ox-uim-kabuk"><header class="ox-uim-ust"><div class="ox-ust-ic"><span class="ox-marka">${IM_LOGO}<span class="ox-marka-ad"><b><i>md</i>Sinyal</b><small>${e(kursAd)}</small></span></span></div></header><main class="ox ox-uim">${ic}</main></div>`;
let imKaydirma = false;
function imHazirla() {
  imStil();
  document.body.classList.add('portal-modu', 'ox-uim-acik');
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#f7f8fa';
  if (imKaydirma) return; imKaydirma = true;
  addEventListener('scroll', () => { const u = document.querySelector('.ox-uim-ust'); if (u) u.classList.toggle('kaydi', scrollY > 4); }, { passive: true });
  addEventListener('hashchange', () => { if (!location.hash.startsWith('#/imza/')) document.body.classList.remove('ox-uim-acik'); });
}

// Kurs tarafı: sunucudaki kanıt kaydı (zaman, IP, ülke, tarayıcı). Yalnız işlenen paketle aynı dönüşe aitse alınır; yoksa null.
async function sunucuKaniti(t, paket) {
  if (!S.kurs.waApi) return null;
  try {
    const ka = await kanitAnahtari(await muhur([t.id, t.tur, t.kursiyer, t.ozet].join('|')));
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const zs = ctl && setTimeout(() => ctl.abort(), 5000);
    const j = await (await fetch(waKok() + '/k/takip-' + t.id.toLowerCase() + '?ka=' + ka, ctl ? { signal: ctl.signal } : {})).json();
    if (zs) clearTimeout(zs);
    return j && j.ok && j.bilgi && String(j.hedef || '').split('#/imza-geldi/')[1] === paket ? j.bilgi : null;
  } catch (x) { return null; }
}

// Kursiyer tarafı: girişsiz imza sayfası.
export async function imzaSayfasi(kok, paket) {
  imHazirla();
  let p;
  try { p = await paketAc(paket); if (!p || !p.belge || !p.id) throw 0; } catch (x) {
    document.title = 'İmza linki açılamadı · mdSinyal';
    kok.innerHTML = imKabuk('İmza sayfası', `<section class="ox-uim-sonuc" style="padding-top:48px">${ikonKutu('uyari', 'kirmizi', true)}<h1>Link açılamadı</h1><p>Link eksik kopyalanmış olabilir. Sürücü kursunuza yazıp yeni bağlantı isteyin.</p></section>`); return;
  }
  const b = p.belge, soz = p.tur === 'sozlesme', dersSay = soz ? 0 : (b.ders || []).length;
  const baslik = soz ? 'Sözleşme imzası' : 'Ders imzası';
  document.title = baslik + ' · ' + b.kurs.ad;
  const altMetin = soz ? 'Sözleşmenizi okuyun, onaylayıp imzalayın.' : dersSay > 1 ? 'Derslerinizi kontrol edip imzalayın.' : 'Dersinizi kontrol edip imzalayın.';
  kok.innerHTML = imKabuk(b.kurs.ad, `${oxSayfaBas(baslik, altMetin)}
    ${belgeGorunumu(p)}
    <div class="ox-kart ox-uim-form">
      <label class="ox-uim-onay"><input type="checkbox" data-okudum><span class="ox-kutucuk-k">${oi('tik')}</span><span>${soz ? 'Sözleşmeyi okudum, kabul ediyorum.' : dersSay > 1 ? 'Bu dersleri aldığımı onaylıyorum.' : 'Bu dersi aldığımı onaylıyorum.'}</span></label>
      <div class="ox-uim-alan"><label class="ox-uim-et" for="i-ad">Ad Soyad</label><input id="i-ad" class="ox-uim-girdi" autocomplete="name" autocapitalize="words" enterkeyhint="done" placeholder="Adınızı ve soyadınızı yazın"></div>
      <div class="ox-uim-alan"><div class="ox-uim-et"><span id="i-imza-et">İmza</span><button type="button" class="ox-uim-temizle" data-temizle>${oi('sifirla')}<span>Temizle</span></button></div>
        <div class="ox-uim-tuval"><canvas width="900" height="300" role="img" aria-labelledby="i-imza-et" aria-label="İmza alanı: parmağınızla imzanızı çizin"></canvas><span class="ox-uim-tuval-ipucu">${oi('kalem')}<span>Parmağınızla imza atın</span></span></div><p class="ox-uim-imza-uyari" role="status" hidden></p></div>
    </div>
    <div class="ox-uim-dg">${oxDugme('İmzala ve gönder', { 'data-imzala': true }, { genis: true })}</div>
    ${oxNot(`İmzanız WhatsApp’tan ${e(b.kurs.ad)}’na gider; WhatsApp açılınca mesajı göndermeniz yeterli. Kanıt olarak imza zamanı, cihaz bilgisi, IP adresi ve belgenin özeti imzayla birlikte kaydedilir.`, 'kalkan')}`);
  const cv = kok.querySelector('canvas'), kutu = kok.querySelector('.ox-uim-tuval');
  const t = tuval(cv);
  const uyari = kok.querySelector('.ox-uim-imza-uyari');
  const sorun = () => t.bos() && !t.murekkep() ? 'İmza alanı boş' : imzaSorunu(t.olcu(), cv, p.ia);
  const uyar = m => { uyari.textContent = m || ''; uyari.hidden = !m; };
  let zs = 0;   // geçersiz imza uyarısı çizim bitince (1,2 sn yeni çizgi gelmezse) çıkar; çok çizgili imzanın ilk çizgisinde değil
  cv.addEventListener('pointerdown', () => { clearTimeout(zs); uyar(''); kutu.classList.add('dolu'); kutu.classList.remove('hata'); });
  const bak = () => { clearTimeout(zs); zs = setTimeout(() => { if (t.murekkep()) uyar(sorun()); }, 1200); };
  cv.addEventListener('pointerup', bak); cv.addEventListener('pointercancel', bak);
  kok.querySelector('[data-okudum]').addEventListener('change', () => kok.querySelector('.ox-uim-onay').classList.remove('hata'));
  kok.querySelector('#i-ad').addEventListener('input', ev => ev.target.classList.remove('hata'));
  kok.querySelector('[data-temizle]').addEventListener('click', () => { clearTimeout(zs); uyar(''); t.temizle(); kutu.classList.remove('dolu', 'hata'); });
  const ac = kok.querySelector('[data-uim-ac]');
  if (ac) ac.addEventListener('click', () => { const m = kok.querySelector('#ox-uim-metin'), acik = m.classList.toggle('kapali'); ac.setAttribute('aria-expanded', String(!acik)); ac.querySelector('span').textContent = acik ? 'Tamamını oku' : 'Daha az göster'; if (acik && ac.getBoundingClientRect().top < 72) ac.scrollIntoView({ block: 'center' }); });
  kok.querySelector('[data-imzala]').addEventListener('click', async () => {
    const ad = kok.querySelector('#i-ad').value.trim();
    if (!kok.querySelector('[data-okudum]').checked) { imHata(kok.querySelector('.ox-uim-onay'), kok.querySelector('[data-okudum]')); return bildir('Önce okuyup onay kutusunu işaretleyin', 'uyari'); }
    if (ad.length < 3) { imHata(kok.querySelector('#i-ad'), kok.querySelector('#i-ad')); return bildir('Adınızı soyadınızı yazın', 'uyari'); }
    if (!t.murekkep()) { imHata(kutu, null); return bildir('İmza alanına imzanızı çizin', 'uyari'); }
    const so = sorun(); if (so) { clearTimeout(zs); uyar(so); imHata(kutu, null); return bildir(so, 'uyari'); }
    const an = new Date(), bo = await ozetHex(JSON.stringify(p.belge));
    const donus = adres() + '#/imza-geldi/' + await paketle({ v: 1, id: p.id, tur: p.tur, k: p.k, ozet: p.ozet, m: p.m, ad, z: an.toISOString(), zy: yerelSaat(an), cihaz: (navigator.userAgent.match(/\(([^)]+)\)/) || [])[1] || '', cb: cihazBilgisi(), bo, s: t.vektor() });
    // dönüşün kısa linki: kanıt anahtarı 'ka' da gider, sunucu kanıtı (zaman, IP, tarayıcı) yalnız bu anahtarla okunur
    const kisa = await kisaLink(donus, 'imza geldi', p.id, p.api, { ka: await kanitAnahtari(p.m) });
    const metin = `${b.kisi.ad} · ${p.tur === 'sozlesme' ? 'sözleşme' : 'ders katılım (takip formu)'} imzam. Kurs ekranında kendiliğinden işlenir; işlenmezse linke dokunun:\n${kisa}`;
    // kısa link deposuna kaydolduysa imza kursa ulaşmıştır (kurs ekranı kendiliğinden işler); WhatsApp bildirimi ayrıca gider
    let otomatik = kisa !== donus;
    // gerçek kursta öğrencinin telefonu servise kimliksiz yazamaz: imza kısa link deposundan kursa ulaşır, olmazsa WhatsApp hazır mesajla açılır
    if (p.api && !p.g) { try { const r = await fetch(p.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metin: (p.dk ? `${adEk(b.kurs.ad, 'e').toLocaleUpperCase('tr')} GELEN MESAJ · gönderen: ${b.kisi.ad}\n(Gerçekte bu mesaj öğrencinin telefonundan ${adEk(b.kurs.ad, 'in')} WhatsApp hattına gelir.)\n――――――――\n` : '') + metin }) }); otomatik = otomatik || r.ok; } catch (x) { } }
    if (!otomatik) { if (p.g) { const w = window.open(waUrl(b.kurs.wp, metin), '_blank'); if (w) try { w.opener = null; } catch (x) { } } else otomatik = waAc(b.kurs.wp, metin, 'WhatsApp', b.kisi.ad, false, 'KURSA GELEN') === 'api'; }
    const zaman = yerelZaman();
    kok.querySelector('.ox-uim').innerHTML = `<section class="ox-uim-sonuc">${oxGorsel('belge-tamam', '')}<h1>${otomatik ? `İmzanız ${e(adEk(b.kurs.ad, 'e'))} gönderildi` : 'Son adım: WhatsApp mesajını gönderin'}</h1><p>${otomatik ? 'Teşekkürler; kurs imzanızı kayda alacak.' : `İmzanız hazır. WhatsApp açıldı; mesajı ${e(adEk(b.kurs.ad, 'e'))} gönderince imzanız kayda geçer.`}</p></section>
      <div class="ox-uim-ozet">${imBilgi([
        ['kisi', 'İmzalayan', e(ad)],
        [soz ? 'belge' : 'panoTik', 'Belge', soz ? 'Kurs sözleşmesi' : 'Ders takip formu', soz ? '' : dersSay + ' ders'],
        ['saat', 'Zaman', tarihYil(zaman.slice(0, 10)).replace(/ \d{4}$/, '') + ', ' + zaman.slice(11, 16)],
      ])}</div>
      <div class="ox-uim-dgler">${oxDugme('WhatsApp’ı yeniden aç', { 'data-tekrar': true }, { tur: otomatik ? 'ikincil' : 'ana', genis: true, ikon: 'wp' })}${oxDugme('Linki kopyala', { 'data-kopyala': true }, { tur: 'cizgi', genis: true })}</div>`;
    scrollTo(0, 0);
    kok.querySelector('[data-tekrar]').addEventListener('click', () => waAc(b.kurs.wp, metin));
    kok.querySelector('[data-kopyala]').addEventListener('click', () => { navigator.clipboard.writeText(kisa).then(() => bildir('Link kopyalandı'), () => bildir('Kopyalanamadı; WhatsApp’ı yeniden açın', 'uyari')); });
  });
}

// Dönüş paketini doğrular ve kayda işler (sayfa da, arka plan kontrolü de bunu kullanır)
// sunucu: imzaKontrol'ün aldığı kanıt (null olabilir); verilmezse burada istenir
async function imzaIsle(paket, sunucu) {
  let r; try { r = await paketAc(paket || ''); } catch (x) { return { hata: ['Link okunamadı', 'Mesajdaki link eksik kopyalanmış olabilir.'] }; }
  const t = (S.imzaTalepleri || []).find(x => x.id === r.id), k = kursiyer(r.k);
  if (!t || !k) return { hata: ['Bu imza isteği bulunamadı', 'İstek bu kursa ait değil ya da silinmiş.'] };
  if (await muhur([r.id, r.tur, r.k, r.ozet].join('|')) !== r.m || r.ozet !== t.ozet) return { hata: ['İmza doğrulanamadı', 'Link değiştirilmiş görünüyor. Kursiyere yeni link gönderin.'] };
  // öğrencinin gördüğü belge kurstaki belgeyle aynı mı (yeni biçim: iki tarafta da SHA-256 özeti var)
  if (r.bo && t.belgeOzet && r.bo !== t.belgeOzet) return { hata: ['İmza doğrulanamadı', 'Öğrencinin gördüğü belge kurstaki belgeyle aynı değil (belge özeti uyuşmuyor). Kursiyere yeni link gönderin.'] };
  const resim = vektordenResim(r.s || []);
  if (t.durum === 'imzalandi') return { zaten: true, t, k, r, resim, kanit: t.kanit || null };
  const sv = sunucu !== undefined ? sunucu : await sunucuKaniti(t, paket);
  const zaman = r.z ? new Date(r.z) : new Date(), z = zaman.toISOString().slice(0, 10) === yerelZaman().slice(0, 10) ? yerelZaman() : r.z.slice(0, 16);
  const kanit = {
    surum: 2, istek: r.id, cihazZaman: r.z || '', cihazYerel: r.zy || '', cihaz: r.cihaz || '', cihazBilgi: r.cb || null,
    belgeOzet: r.bo || t.belgeOzet || '', belgeOzetDurum: r.bo && t.belgeOzet ? 'eslesti' : 'eski',
    imzaOzet: await ozetHex(JSON.stringify(r.s || []) + '|' + (r.ad || '')),
    sunucuZaman: (sv && sv.zaman) || '', ip: (sv && sv.ip) || '', ulke: (sv && sv.ulke) || '', sunucuTarayici: (sv && sv.ua) || '',
    islendi: new Date().toISOString(),
  };
  // ölçü: eşiğin altındaysa imza yine işlenir, kanıtta işaretlenir (eski kayıtlarda bu alanlar yoktur)
  const ol = donenImzaOlcu(r.s);
  kanit.olcu = ol.olcu; if (ol.sorun) { kanit.olcuAlti = true; kanit.olcuNot = ol.sorun; }
  if (t.tur === 'sozlesme') {
    k.sozlesmeImza = { tarih: z.slice(0, 10), yontem: 'Uzaktan (WhatsApp linki)', url: resim, ad: r.ad, cihaz: r.cihaz, metin: t.metin || sozlesmeDondur(k), kanit };
    k.evrak.sozlesme = true; GR.aktifEt(k);  // evrak tamam ve dönem grubuna atanmışsa aktif olur
  } else t.dersler.forEach(id => { const d = S.dersler.find(x => x.id === id); if (d) d.imza = { ...(d.imza || {}), zaman: d.imza && d.imza.zaman ? d.imza.zaman : z, kursiyer: resim, kursiyerUzaktan: z, kursiyerBekliyor: false, usta: d.imza ? d.imza.usta : null, kanit }; });
  t.durum = 'imzalandi'; t.imzaZaman = z; t.imzalayan = r.ad; t.kanit = kanit;
  islem('Uzaktan imza işlendi', tamAd(k) + ' · ' + (t.tur === 'sozlesme' ? 'sözleşme' : t.dersler.length + ' ders') + (kanit.olcuAlti ? ' · imza ölçü altında' : '')); kaydet();
  if (apiAcik()) belgeWhatsApp(belgeHtml(t.tur === 'sozlesme' ? 'sozlesme' : 'takip', k.id), dosyaAdi(t.tur === 'sozlesme' ? 'Sözleşme' : 'Takip formu', tamAd(k)), `${selam(k)} imzaladığınız ${t.tur === 'sozlesme' ? 'kurs sözleşmesinin' : 'direksiyon takip formunun'} kopyası ekte. ${S.kurs.ad}`, tamAd(k), 'ÖĞRENCİ', k.tel);
  return { t, k, r, resim, zaman, kanit };
}
// Bekleyen imzaları arka planda kontrol eder: kursiyer imzalayınca kurs linke dokunmadan kayda işlenir
let kontrolde = false;
export async function imzaKontrol() {
  const l = (S.imzaTalepleri || []).filter(t => t.durum === 'bekliyor');
  if (kontrolde || !l.length || !S.kurs.waApi) return 0;
  kontrolde = true; let n = 0;
  try {
    const kok = waKok();
    for (const t of l) {
      try {
        const ka = await kanitAnahtari(await muhur([t.id, t.tur, t.kursiyer, t.ozet].join('|')));
        const j = await (await fetch(kok + '/k/takip-' + t.id.toLowerCase() + '?ka=' + ka)).json();
        if (!j.ok || !j.hedef || !j.hedef.includes('#/imza-geldi/')) continue;
        if (S._bulut && bulutKanca.sahiplen && !(await bulutKanca.sahiplen('imza|' + t.id))) continue;
        const s = await imzaIsle(j.hedef.split('#/imza-geldi/')[1], j.bilgi || null);
        if (s.k && !s.zaten && !s.hata) { n++; const alti = s.kanit && s.kanit.olcuAlti; bildir(`${tamAd(s.k)} ${s.t.tur === 'sozlesme' ? 'sözleşmeyi' : 'ders katılım formunu'} imzaladı; kayda işlendi${alti ? '. İmza ölçü altında; kontrol edin' : ''}`, alti ? 'uyari' : 'tamam'); }
      } catch (x) { }
    }
  } finally { kontrolde = false; }
  if (n) import('./app.js?v=234').then(m => m.yenile());
  return n;
}

/* --- kursa gelen imza sayfası: öğrencinin imza sayfasıyla aynı dil (ox-, sınıflar ox-uim-g önekli) ---
   Kurs ekranında (müdür / ön büro) kurs kabuğunun içinde, öğretmen ekranında öğretmen kabuğunda (ox-modu) açılır.
   Mantık değişmedi: imzaIsle paketi çözer, mührü doğrular, kayda işler; sayfa yalnız sonucu gösterir. */
function imGStil() {
  imStil();
  oxStil('ox-uim-g', `
.ox-uim-g{${oxDegisken()}}
body:not(.ox-modu) .ox.ox-uim-g{margin:0;padding:4px 0 32px}
body.ox-modu .ox.ox-uim-g{padding-top:2px}
.ox-uim-g a{text-decoration:none}
.ox-uim-g .ox-geri{text-decoration:none}
/* durum kartı */
.ox-uim-durum{display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:var(--ox-r);border:1px solid var(--ox-cizgi);background:var(--ox-kart);box-shadow:var(--ox-golge)}
.ox-uim-durum.tamam{background:var(--ox-yesil-acik);border-color:#cbe9d6}
.ox-uim-durum.zaten{background:var(--ox-mavi-acik);border-color:#d3e3fc}
.ox-uim-durum.hata{background:var(--ox-kirmizi-acik);border-color:#f6cfd0}
.ox-uim-durum .ox-ik-kutu{width:48px;height:48px;border-radius:14px;background:#fff}
.ox-uim-durum .ox-ik-kutu .ox-i{width:26px;height:26px;stroke-width:2}
.ox-uim-durum-y{flex:1;min-width:0;display:grid;gap:3px;padding-top:2px}
.ox-uim-durum-y h2{font-size:18px;line-height:1.25;font-weight:800;letter-spacing:-.018em;color:var(--ox-bas);margin:0;text-wrap:balance}
.ox-uim-durum-y p{font-size:14.5px;line-height:1.4;color:var(--ox-ikincil);margin:0;overflow-wrap:anywhere;text-wrap:pretty}
.ox-uim-durum.tamam .ox-uim-durum-y p{color:#2e5a40}
.ox-uim-durum.hata .ox-uim-durum-y p{color:#7a2326}
.ox-uim-durum.bekle .ox-ik-kutu .ox-i{animation:ox-uim-don 1s linear infinite}
@keyframes ox-uim-don{to{transform:rotate(360deg)}}
.ox-uim-g .ox-uim-bilgi{margin-top:12px}
/* ölçü altında gelen imza: küçük turuncu uyarı (imza yine kayıtlı) */
.ox-uim-olcu .ox-not{margin-top:12px;padding:12px 14px;border-radius:12px;background:#fff6e8;border:1px solid #f5dcb0;color:#6b4a12}
.ox-uim-olcu .ox-not .ox-i{color:#c27a12}
.ox-uim-olcu .ox-not b{color:#5a3d0c}
.ox-uim-bs-d.yesil>span{color:var(--ox-yesil)}
/* imza önizlemesi: kutu ölçüsü sabit (3:1), resim yüklenince kayma olmaz */
.ox-uim-onizle{padding:12px}
.ox-uim-onizle-k{position:relative;aspect-ratio:3/1;border-radius:12px;background:#fbfcfe;border:1px solid var(--ox-ayrac);overflow:hidden}
.ox-uim-onizle-k::after{content:"";position:absolute;left:18px;right:18px;bottom:24%;border-top:1px solid #e3e8f0;pointer-events:none}
.ox-uim-onizle-k img{position:relative;z-index:1;display:block;width:100%;height:100%;object-fit:contain}
.ox-uim-onizle figcaption{display:flex;justify-content:space-between;gap:12px;margin-top:10px;padding:0 4px;font-size:14px;line-height:1.35;color:var(--ox-ikincil)}
.ox-uim-onizle figcaption b{min-width:0;font-weight:600;color:var(--ox-bas);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ox-uim-onizle figcaption span{flex:none;font-variant-numeric:tabular-nums}
.ox-uim-g .ox-uim-dgler{margin-top:24px}
@media (prefers-reduced-motion:reduce){.ox-uim-durum.bekle .ox-ik-kutu .ox-i{animation:none}}
`);
}
const imZaman = z => z ? tarihYil(z.slice(0, 10)) + ', ' + z.slice(11, 16) : '—';
// ISO zamanı bu cihazın saatine çevirir (sunucu kaydı UTC)
const imIso = z => { const d = z ? new Date(z) : null; return d && !isNaN(d) ? `${tarihYil(iso10(d))}, ${ikiHane(d.getHours())}:${ikiHane(d.getMinutes())}:${ikiHane(d.getSeconds())}` : ''; };
const iso10 = d => `${d.getFullYear()}-${ikiHane(d.getMonth() + 1)}-${ikiHane(d.getDate())}`;
// kanıt satırları: imza kaydındaki 'kanit' (eski kayıtta yok: paketteki cihaz bilgisi)
function kanitSatirlari(kn, r) {
  const cz = (kn && kn.cihazZaman) || r.z || '', cy = (kn && kn.cihazYerel) || r.zy || '', cb = (kn && kn.cihazBilgi) || r.cb || null;
  const durum = kn ? kn.belgeOzetDurum : (r.bo ? 'eslesti' : 'eski'), bo = (kn && kn.belgeOzet) || r.bo || '';
  return [
    cz ? ['saat', 'Cihaz saati', e(imIso(cz)), (cy ? 'Yerel: ' + e(cy) + '<br>' : '') + 'ISO: ' + e(cz)] : null,
    ['konum', 'Sunucu kaydı', kn && kn.sunucuZaman ? e(imIso(kn.sunucuZaman)) : 'Kayıt yok', kn && kn.ip ? e('IP: ' + kn.ip + (kn.ulke ? ' · ' + kn.ulke : '')) : 'IP: yok'],
    (kn && kn.cihaz) || r.cihaz ? ['tel', 'Cihaz', e(imCihaz((kn && kn.cihaz) || r.cihaz)), cb ? e([cb.ekran, cb.dil, cb.sd].filter(Boolean).join(' · ')) : ''] : null,
    ['belge', 'Belge özeti', bo ? `<code style="font:inherit;font-variant-numeric:tabular-nums">${e(bo.slice(0, 16))}…</code>` : 'Yok', durum === 'eslesti' ? 'SHA-256 · paketteki özetle eşleşti' : bo ? ((kn && kn.belgeOzet && r.bo && kn.belgeOzet === r.bo) || (!kn && r.bo) ? 'SHA-256 · öğrencinin gördüğü belge; istek eski biçim, kurstaki özetle karşılaştırılamadı' : 'SHA-256 · kurstaki belge; öğrencinin sayfası eski sürüm, karşılaştırılamadı') : 'Eski biçim: belge özeti yok'],
  ];
}
// cihaz bilgisi linkte tarayıcının ham metni olarak gelir ("iPhone; CPU iPhone OS 18_0 like Mac OS X"); ekranda okunur hali
function imCihaz(c) {
  c = String(c || ''); let m;
  if ((m = /(iPhone|iPad)[^]*?OS (\d+)(?:_(\d+))?/.exec(c))) return `${m[1]} · iOS ${m[2]}${m[3] && m[3] !== '0' ? '.' + m[3] : ''}`;
  if ((m = /Android (\d+(?:\.\d+)?)/.exec(c))) return 'Android ' + m[1];
  if (/Macintosh|Mac OS X/.test(c)) return 'Mac';
  if (/Windows/.test(c)) return 'Windows';
  return c.slice(0, 40);
}
const imDurum = (tur, ikon, baslik, metin) => `<div class="ox-uim-durum ${tur}" role="status">${ikonKutu(ikon, tur === 'tamam' ? 'yesil' : tur === 'hata' ? 'kirmizi' : tur === 'bekle' ? 'gri' : 'mavi')}<div class="ox-uim-durum-y"><h2>${baslik}</h2>${metin ? `<p>${metin}</p>` : ''}</div></div>`;

// Kurs tarafı: dönüş linki → doğrula, kayda işle.
export function imzaGeldi(paket) {
  imGStil();
  const usta = document.body.classList.contains('usta-modu');
  // ilgili ekran: kurs ekranında öğrencinin dosyası, öğretmen ekranında Bugün
  const donDg = k => `<div class="ox-uim-dgler">${usta
    ? `<a class="ox-dg ox-dg-ana genis" href="#/egitmen">${oi('ev')}<span>Bugün ekranına dön</span></a>`
    : k ? `<a class="ox-dg ox-dg-ana genis" href="#/kursiyer/${encodeURIComponent(k.id)}">${oi('kisi')}<span>Öğrenci dosyasını aç</span></a>`
      : `<a class="ox-dg ox-dg-cizgi genis" href="#/kursiyerler">${oi('kisiler')}<span>Kursiyerlere dön</span></a>`}</div>`;
  const ust = usta ? `<a class="ox-geri" href="#/egitmen">${oi('sol')}<span>Bugün</span></a>${oxSayfaBas('Gelen imza', 'Öğrencinin WhatsApp’tan gönderdiği imza.')}` : '';
  return {
    baslik: 'Gelen imza', alt: 'Öğrencinin gönderdiği imza',
    html: `<div class="ox ox-uim ox-uim-g" id="imza-sonuc" aria-live="polite">${ust}<div data-uim-g>${imDurum('bekle', 'sifirla', 'İmza doğrulanıyor…', 'Mühür ve belge özeti kontrol ediliyor.')}</div></div>`,
    async baglan(kap) {
      // öğretmen: öğretmen ekranının kabuğu (marka çubuğu; kurs ekranının alt menüsü ve kenar menüsü gizli)
      if (usta) { document.body.classList.add('ox-modu', 'portal-modu'); document.body.classList.remove('ox-tam-acik'); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#f7f8fa'; }
      const yer = kap.querySelector('[data-uim-g]');
      const s = await imzaIsle(paket);
      if (!yer.isConnected) return;
      if (s.hata) { yer.innerHTML = imDurum('hata', 'uyari', e(s.hata[0]), e(s.hata[1])) + oxNot('İmza kayda geçmedi. Öğrenciye yeni imza linki gönderip tekrar imzalamasını isteyin.', 'bilgi') + donDg(null); return; }
      const { t, k, r, resim } = s, soz = t.tur === 'sozlesme';
      const dersler = soz ? [] : t.dersler.map(id => S.dersler.find(d => d.id === id)).filter(Boolean).sort((a, b) => (a.tarih + (a.bas || a.saat)).localeCompare(b.tarih + (b.bas || b.saat)));
      const dSaat = d => `${d.bas || d.saat}${d.bit ? '–' + d.bit : ''}`, dUsta = d => (egitmen(d.egitmen) || {}).ad || '';
      const belgeAd = soz ? 'Kurs sözleşmesi' : 'Ders takip formu';
      const imzalayan = s.zaten ? (t.imzalayan || r.ad) : r.ad, zaman = imZaman(t.imzaZaman);
      const durum = s.zaten
        ? imDurum('zaten', 'panoTik', 'Bu imza zaten işlendi', `${e(zaman)} tarihinde kayda geçmişti; yeniden işlenmedi.`)
        : imDurum('tamam', 'tik', 'İmza kayda işlendi', `${e(tamAd(k))} · ${soz ? 'kurs sözleşmesi' : t.dersler.length > 1 ? t.dersler.length + ' dersin takip formu' : 'ders takip formu'}`);
      const bilgi = imBilgi([
        ['kisi', 'Öğrenci', e(tamAd(k)), SINIFLAR[k.sinif] ? e(SINIFLAR[k.sinif].ad) : ''],
        [soz ? 'belge' : 'panoTik', 'Belge', belgeAd, soz ? '' : t.dersler.length + ' ders'],
        dersler.length === 1 ? ['takvim', 'Ders', tarihUzun(dersler[0].tarih), e([dSaat(dersler[0]), dUsta(dersler[0])].filter(Boolean).join(' · '))] : null,
        ['imza', 'İmzalayan', e(imzalayan)],
        ['saat', 'Zaman', e(zaman)],
        ...kanitSatirlari(s.kanit || t.kanit || null, r),
        ['kalkan', 'Doğrulama', 'Mühür eşleşti', 'Belge özeti değişmemiş'],
      ]).replace('<span class="ox-uim-bs-d"><span>Mühür eşleşti', '<span class="ox-uim-bs-d yesil"><span>Mühür eşleşti');
      const liste = dersler.length > 1 ? oxBolum('Dersler', dersler.length + ' ders') + oxListe(dersler.map(d => oxSatir({ ikon: 'direksiyon', baslik: tarihUzun(d.tarih), alt: e([dSaat(d), dUsta(d)].filter(Boolean).join(' · ')), ok: false }))) : '';
      const onizle = oxBolum('İmza') + `<figure class="ox-kart ox-uim-onizle"><div class="ox-uim-onizle-k"><img src="${resim}" alt="${e(imzalayan)} imzası" width="600" height="200"></div><figcaption><b>${e(imzalayan)}</b><span>${e(zaman)}</span></figcaption></figure>`;
      // ölçü altındaki imza: kayıt durur, kurs görsün diye küçük uyarı (eski kayıtta kanıtta ölçü yoksa burada hesaplanır)
      const kn = s.kanit || t.kanit || null, olc = kn && kn.olcu ? { sorun: kn.olcuAlti ? (kn.olcuNot || 'İmza ölçü altında') : '' } : donenImzaOlcu(r.s);
      const olcuUyari = olc.sorun ? `<div class="ox-uim-olcu" role="note">${oxNot(`<b>İmza ölçü altında:</b> ${e(olc.sorun.split(';')[0])}. İmzayı kontrol edin; gerekirse yeni imza linki gönderin.`, 'uyari')}</div>` : '';
      yer.innerHTML = durum + olcuUyari + bilgi + liste + onizle + donDg(k);
    },
  };
}

// Kurs tarafı: imza gönderme penceresi (kursiyer yanında değilse)
export function imzayaGonderPenceresi(k, tur, dersIdleri) {
  const b = bekleyenImza(k, tur)[0];
  pencere({
    baslik: 'WhatsApp’tan imzaya gönder',
    icerik: `<p style="font-size:14.5px">${e(tamAd(k))} kişisine ${tur === 'sozlesme' ? 'sözleşme' : dersIdleri.length + ' dersin takip formu'} için imza linki gidecek. ${apiAcik() ? 'Mesaj WhatsApp’tan otomatik gönderilir.' : `WhatsApp, <span class="num">${e(k.tel)}</span> numarasına hazır mesajla açılır; siz gönderirsiniz.`}</p>
      ${apiAcik() ? `<p class="ipucu" style="margin-top:12px">${isaret('bilgi', 18)}<span>Link WhatsApp’tan otomatik gider. Kursiyer imzalayınca imza kendiliğinden kayda işlenir ve ekranda bildirim çıkar.</span></p>` : kursWp() ? `<p class="ipucu" style="margin-top:12px">${isaret('bilgi', 18)}<span>Kursiyer imzalayınca imza kursun WhatsApp hattına (${e(kursWp())}) link olarak gelir. O linke dokunduğunuzda imza doğrulanır ve kayda işlenir.</span></p>` : `<div class="alan" style="margin-top:14px"><label for="i-wp">İmzalar hangi WhatsApp numarasına gelsin?</label><input id="i-wp" class="girdi" inputmode="tel" placeholder="05xx xxx xx xx" autocomplete="tel"><small style="color:var(--soluk)">Kursun WhatsApp hattı; bir kez girilir, Ayarlar › Kurs bilgileri’nden değişir.</small></div>`}${b ? `<p style="margin-top:10px;font-size:13.5px;color:var(--soluk)">Önceki link ${b.tarih.slice(0, 10).split('-').reverse().join('.')} ${b.tarih.slice(11, 16)}’de gönderildi; yenisi eskisinin yerine geçer.</p>` : ''}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-wp" data-k>${ik('wp')}${apiAcik() ? 'İmza linkini gönder' : 'WhatsApp’ı aç'}</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', async () => { const w = d.querySelector('#i-wp'); if (w) { const n = w.value.replace(/\D/g, ''); if (!/^0?5\d{9}$/.test(n) && !/^905\d{9}$/.test(n)) return bildir('Geçerli bir cep telefonu girin', 'uyari'); S.kurs.wp = w.value.trim(); islem('Kursun WhatsApp hattını girdi'); kaydet(); } await imzaIste(tur, k, dersIdleri); kapatPencere(); bildir(apiAcik() ? 'İmza linki WhatsApp’tan gönderildi' : 'İmza linki hazırlandı; WhatsApp’ta mesajı gönderin', 'wp'); import('./app.js?v=234').then(m => m.yenile()); }); },
  });
}
