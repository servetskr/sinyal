// Kullanım analizi: programı geliştirmek için hangi ekranın ne kadar kullanıldığı, hangi düğmeye basıldığı, nerede takılındığı.
// KİŞİSEL VERİ YOK: ad, telefon, TC, tutar, yazılan metin, kayıt kimliği alınmaz. Yalnız ekran adı (#/ayarlar/veri gibi; kimlik ve kodlar
// atılır), düğmenin data-* öznitelik ADI (değeri değil), süre, sayılar ve hata türü (TypeError gibi).
// Sayaçlar cihazda (localStorage) birikir; gün değişince önceki günün özeti bir kez yazılır: kurslar/{kurs}/kullanim/{gün}_{cihaz}
// (cihaz başına günde 1 yazım; Firebase ücretsiz plan kotasının çok altında). Yazılamayan özetler en çok 14 gün cihazda bekler.
// Özet hangi kursta biriktiyse yalnız o kursa yazılır. Kurs müdürü Ayarlar › Veri ve e-posta'dan kapatabilir.
import { S, oturum, bulutKanca } from './veri.js?v=229';
import { bildirKanca } from './ui.js?v=229';

const ANAHTAR = 'sinyal-kullanim', BEKLEYEN = 'sinyal-kullanim-bekleyen';
const SEKMELI = new Set(['ayarlar', 'meb', 'kasa', 'filo', 'mesajlar', 'sinavlar', 'sosyal', 'raporlar', 'yonetim', 'sahip']);
const EN_FAZLA_ARALIK = 30 * 60e3;  // ekranda boş bekleme sayılmasın: tek seferde en çok 30 dk
const bugun = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const yeni = () => ({ gun: bugun(), ekran: {}, dugme: {}, hata: {}, ot: 0, rol: '', kurs: '' });
const kursNe = () => { try { return (bulutKanca.kurs && bulutKanca.kurs()) || ''; } catch (x) { return ''; } };
const oku = (a, bos) => { try { return JSON.parse(localStorage.getItem(a) || 'null') || bos; } catch (x) { return bos; } };
const yaz = (a, v) => { try { v ? localStorage.setItem(a, JSON.stringify(v)) : localStorage.removeItem(a); } catch (x) { } };
let K = null, ekran = '', bas = 0, onceki = [], kirli = new Map(), basladi = false, kayitZamani = 0;

// '#/kursiyer/k123' → 'kursiyer'; '#/ayarlar/veri' → 'ayarlar/veri'; kimlik, kod ve sorgu atılır
export function ekranAdi(h = location.hash) {
  const p = String(h || '').replace(/^#\/?/, '').split(/[?&]/)[0].split('/').filter(Boolean), ad = x => /^[a-z][a-z-]{1,24}$/.test(x || '');
  if (!p.length) return 'giris';
  if (!ad(p[0])) return 'diger';
  return SEKMELI.has(p[0]) && ad(p[1]) ? p[0] + '/' + p[1] : p[0];
}
// öğrenci, demo, ziyaretçi (örnek veri) ve oturum açmamış kişi sayılmaz
const kapali = () => !!(S.kurs && S.kurs.kullanimKapali) || !oturum.kullanici || oturum.kullanici.rol === 'ogrenci' || !!oturum.kullanici.ziyaretci;
// bekleyen özetler: { '<gün>|<kurs>': özet }, en çok 14 gün
const bekleyenler = () => { const b = oku(BEKLEYEN, {}); return b && typeof b === 'object' && !b.gun ? b : {}; };
function bekleyeEkle(k) { if (!Object.keys(k.ekran).length) return; const b = bekleyenler(); b[k.gun + '|' + (k.kurs || '')] = ozet(k); yaz(BEKLEYEN, b); }
const ekr = (ad = ekran) => (K.ekran[ad] = K.ekran[ad] || [0, 0, 0, 0, 0, 0]);  // [açılış, saniye, hata, uyarı, geri, yarım form]
function gunKontrol() {
  if (!K) K = oku(ANAHTAR, null) || yeni();
  const ku = kursNe();
  // gün değişti ya da cihaz başka kursa geçti: birikeni bekleyene al, yeniden başla
  if (K.gun !== bugun() || (ku && K.kurs && K.kurs !== ku)) { bekleyeEkle(K); K = yeni(); }
  if (ku && !K.kurs) K.kurs = ku;
}
function sureEkle() { if (ekran && bas && !kapali()) { const ms = Math.min(Date.now() - bas, EN_FAZLA_ARALIK); if (ms > 0) ekr()[1] += Math.round(ms / 1000); } bas = document.visibilityState === 'hidden' ? 0 : Date.now(); }
function sakla() { if (!K) return; if (oturum.kullanici && oturum.kullanici.rol) K.rol = oturum.kullanici.rol; yaz(ANAHTAR, K); }
function yarimlar() { for (const [f, ad] of kirli) if (!f.isConnected) { kirli.delete(f); ekr(ad.split('|')[0])[5]++; K.dugme['yarim:' + ad.split('|')[1]] = (K.dugme['yarim:' + ad.split('|')[1]] || 0) + 1; } }
function rota() {
  if (kapali()) return;
  gunKontrol(); sureEkle(); yarimlar();
  const yeniAd = ekranAdi(); if (yeniAd === ekran) return;
  // geri dönme: A → B → A (bir önceki ekrana hemen dönüş) B ekranında sayılır
  if (onceki.length >= 2 && onceki[onceki.length - 2] === yeniAd) ekr(ekran)[4]++;
  onceki.push(yeniAd); if (onceki.length > 5) onceki.shift();
  ekran = yeniAd; ekr()[0]++; sakla();
}
const dataAdi = el => { for (let x = el, i = 0; x && i < 5 && x !== document.body; x = x.parentElement, i++) { const k = Object.keys(x.dataset || {}).find(a => /^[a-zA-Z]{2,30}$/.test(a)); if (k && (x.matches('button,a,label,input,select,[role=button],[role=tab],summary') || i === 0)) return k; } return null; };
function tikla(ev) {
  if (kapali()) return; gunKontrol();
  const el = ev.target && ev.target.closest ? ev.target.closest('button,a,label,[role=button],[role=tab],summary,[data-kapat]') : null; if (!el) return;
  const k = dataAdi(el) || (el.matches('a[href^="#/"]') ? 'git:' + ekranAdi(el.getAttribute('href')) : el.closest('nav,.yan,.alt-menu') ? 'menu' : null);
  if (!k) return;
  const a = ekran + ':' + k; K.dugme[a] = (K.dugme[a] || 0) + 1;
  if (el.matches('[data-kapat]') || k === 'kapat') setTimeout(() => { yarimlar(); sakla(); }, 400);
  sakla();
}
const formAdi = f => f.id || Object.keys(f.dataset || {}).find(a => /^[a-zA-Z]{2,30}$/.test(a)) || 'form';
function girdi(ev) { if (kapali()) return; const f = ev.target && ev.target.closest && ev.target.closest('form'); if (f && !kirli.has(f)) kirli.set(f, ekran + '|' + formAdi(f)); }
function gonder(ev) { const f = ev.target; if (f && kirli.has(f)) kirli.delete(f); }
function hata(tur) { if (kapali()) return; gunKontrol(); const t = String(tur || 'Error').replace(/[^A-Za-z]/g, '').slice(0, 30) || 'Error'; ekr()[2]++; K.hata[t] = (K.hata[t] || 0) + 1; sakla(); }
function uyari(t) { if (kapali() || !K) return; gunKontrol(); if (t === 'form') { ekr()[3]++; K.hata.form = (K.hata.form || 0) + 1; } else ekr()[3]++; sakla(); }

// Yazılacak özet: en çok kullanılan 60 ekran / 80 düğme (belge küçük kalsın)
const enCok = (o, n, f = v => v) => Object.fromEntries(Object.entries(o).sort((a, b) => f(b[1]) - f(a[1])).slice(0, n));
export function ozet(k = K) {
  const ek = enCok(k.ekran, 60, v => v[1] + v[0]);
  return { gun: k.gun, kurs: k.kurs || '', rol: k.rol || '', ot: k.ot, sn: Object.values(k.ekran).reduce((a, v) => a + v[1], 0), ekran: ek, dugme: enCok(k.dugme, 80), hata: enCok(k.hata, 20), cihaz: matchMedia('(max-width: 760px)').matches ? 'telefon' : 'genis' };
}
// Bekleyen her günün özeti bir kez yazılır (yazılamayan sonraki denemede yeniden denenir; 14 günden eskisi bırakılır)
async function gonderBekleyen() {
  const b = bekleyenler(), ku = kursNe(); if (!Object.keys(b).length) return;
  if (S.kurs && S.kurs.kullanimKapali) return yaz(BEKLEYEN, null);
  for (const a of Object.keys(b)) if (!b[a] || !/^\d{4}-\d{2}-\d{2}$/.test(b[a].gun || '') || (Date.now() - Date.parse(b[a].gun)) > 14 * 864e5) delete b[a];
  yaz(BEKLEYEN, Object.keys(b).length ? b : null);
  if (kapali() || !bulutKanca.kullanim || !ku) return;
  for (const a of Object.keys(b).sort()) {
    const o = b[a];
    // başka kursta biriken özet bu kursa yazılmaz (o kursa girildiğinde yazılır; 14 günde düşer)
    if (o.kurs && o.kurs !== ku) continue;
    try { await bulutKanca.kullanim(o.gun, { ...o, kurs: ku }); delete b[a]; yaz(BEKLEYEN, Object.keys(b).length ? b : null); } catch (x) { break; }
  }
}
export const anlik = () => { gunKontrol(); sureEkle(); return ozet(); };
export function baslat() {
  if (basladi) return; basladi = true;
  gunKontrol(); K.ot++; ekran = ''; rota();
  addEventListener('hashchange', rota);
  document.addEventListener('click', tikla, true);
  document.addEventListener('input', girdi, true);
  document.addEventListener('submit', gonder, true);
  document.addEventListener('visibilitychange', () => { if (kapali()) return; gunKontrol(); sureEkle(); yarimlar(); sakla(); });
  addEventListener('pagehide', () => { if (kapali()) return; sureEkle(); sakla(); });
  addEventListener('error', ev => hata(ev.error && ev.error.name || 'Error'));
  addEventListener('unhandledrejection', ev => hata(ev.reason && ev.reason.name || 'Promise'));
  bildirKanca.f = uyari;
  // gün değişimi ve bekleyen özet: açılışta (bulut bağlantısı gelince) ve 10 dakikada bir
  setTimeout(gonderBekleyen, 70e3);
  setInterval(() => { if (kapali()) return; gunKontrol(); sureEkle(); sakla(); if (Date.now() - kayitZamani > 30 * 60e3) { kayitZamani = Date.now(); gonderBekleyen(); } }, 10 * 60e3);
}
// deneme ve sahip paneli için
export const _gunuKapat = () => { gunKontrol(); sureEkle(); bekleyeEkle(K); K = yeni(); sakla(); return gonderBekleyen(); };
