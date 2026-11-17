// Kursun e-posta adresleri, rapor e-postaları (günlük · haftalık · aylık), bütün verileri Excel'e / tam yedek ve Google Drive'a kaydetme.
// Ayarlar › Veri ve e-posta. Gönderim Cloudflare worker'ın /eposta uç noktasından (sunucu tarafı Firebase'e gerek yok; Spark planında kalınır).
// Alıcılar sunucuda tutulur: kurs müdürü adres ekler, adrese giden onay linkine dokunulunca o adres rapor almaya başlar.
// Tetikleme sunucusuz: günlük rapor gün sonu kapatılınca; haftalık ve aylık rapor dönemin ilk açılışında, tek cihazdan
// (bulut.js sahiplen: kurslar/{kurs}/gonderim belgesi bir kez oluşturulabilir; kilit 3 saatlik dilime bağlı, gönderemeyen cihazın yerine
// sonraki dilimde başka cihaz dener) ve worker'da dönem başına bir kez. Açık kalan sekmede saatte bir yeniden bakılır.
import { S, kaydet, gun, islem, oturum, bulutKanca, tamAd, gecikenler } from './veri.js?v=230';
import { e, tl, ik, bildir, rozet, tamTarih } from './ui.js?v=230';
import { WORKER, bulut, bulutta } from './bulut.js?v=230';
import { kabuk, kutular, bolum, satirlar, bos, devam, not, nokta, dugme, R, SITE } from './eposta-kabuk.js?v=230';
import { tumExcelIndir, tumExcelB64, tumExcelBlob, tamYedekIndir, tamYedekMetni, dosyaAdi } from './excel-tum.js?v=230';

const TURLER = [['gunluk', 'Günlük rapor', 'Gün sonu kapatılınca: kasa, dersler, ödemeler ve uyarılar'], ['haftalik', 'Haftalık rapor', 'Her pazartesi ilk açılışta, geçen haftanın özeti'], ['aylik', 'Aylık rapor', 'Her ayın ilk açılışında, geçen ayın özeti ve kayıtlar Excel eki olarak']];
export const raporAyar = () => ({ gunluk: true, haftalik: true, aylik: true, ...((S.kurs || {}).epostaRapor || {}) });
const mudur = () => !!(oturum.kullanici && oturum.kullanici.rol === 'mudur');
const buro = () => !!(oturum.kullanici && ['mudur', 'sekreter'].includes(oturum.kullanici.rol));

// ---- worker ----
const hata = (m, ek) => Object.assign(new Error(m), ek || {});
async function istek(yol, govde) {
  if (!bulutta() || !bulutKanca.yetki) throw hata('E-posta, kursun bulut hesabıyla çalışır');
  const h = await bulutKanca.yetki();
  let r; try { r = await fetch(WORKER + '/' + yol, { method: govde ? 'POST' : 'GET', headers: { ...h, ...(govde ? { 'Content-Type': 'application/json' } : {}) }, body: govde ? JSON.stringify(govde) : undefined }); }
  catch (x) { throw hata('Sunucuya ulaşılamadı; bağlantınızı kontrol edin', { ag: true }); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 503 || j.kurulu === false) throw hata('E-posta servisi henüz kurulmadı', { kurulmadi: true });
  if (!r.ok || j.ok === false) throw hata(j.hata || 'İşlem tamamlanamadı', j);
  return j;
}
let durumOnbellek = null;
export async function epostaDurum(taze) { if (!taze && durumOnbellek && Date.now() - durumOnbellek.z < 60e3) return durumOnbellek.d; const d = await istek('eposta'); durumOnbellek = { z: Date.now(), d }; return d; }
export async function adresEkle(adres) { durumOnbellek = null; return istek('eposta/adres', { adres }); }
export async function adresSil(adres) { durumOnbellek = null; return istek('eposta/adres', { adres, sil: true }); }

// ---- dönemler ----
const isoGun = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const gunOku = s => { const [y, a, g] = s.split('-').map(Number); return new Date(y, a - 1, g, 12); };
const gunEkle = (s, n) => { const d = gunOku(s); d.setDate(d.getDate() + n); return isoGun(d); };
// ISO hafta: pazartesi başlar
export function haftaBilgisi(s) {
  // haftanın perşembesi hangi yıldaysa hafta o yılındır; 1. hafta, perşembesi 1–7 Ocak'a düşen haftadır
  const d = gunOku(s), gn = (d.getDay() + 6) % 7, pzt = gunEkle(s, -gn), per = gunOku(gunEkle(pzt, 3)), yil = per.getFullYear();
  const no = 1 + Math.floor(Math.round((per - new Date(yil, 0, 1, 12)) / 864e5) / 7);
  return { donem: yil + '-W' + String(no).padStart(2, '0'), bas: pzt, bit: gunEkle(pzt, 6) };
}
export const gecenHafta = (bugun = gun(0)) => haftaBilgisi(gunEkle(bugun, -7));
export function gecenAy(bugun = gun(0)) { const d = gunOku(bugun); const b = new Date(d.getFullYear(), d.getMonth() - 1, 1, 12), s = new Date(d.getFullYear(), d.getMonth(), 0, 12); return { donem: isoGun(b).slice(0, 7), bas: isoGun(b), bit: isoGun(s) }; }

// ---- rapor içeriği ----
const aralik = (t, bas, bit) => { const x = String(t || '').slice(0, 10); return x >= bas && x <= bit; };
export function raporVerisi(bas, bit, ek = {}) {
  const kim = id => { const k = (S.kursiyerler || []).find(x => x.id === id); return k ? tamAd(k) : ''; };
  const har = (S.hareket || []).filter(h => !h.iptal && aralik(h.tarih, bas, bit)), gel = har.filter(h => h.tur === 'Gelir'), gid = har.filter(h => h.tur === 'Gider');
  const top = l => l.reduce((a, h) => a + (+h.tutar || 0), 0), yontem = {};
  gel.forEach(h => { const y = h.yontem || 'Diğer'; yontem[y] = (yontem[y] || 0) + (+h.tutar || 0); });
  const ders = (S.dersler || []).filter(d => aralik(d.tarih, bas, bit)), dersDurum = {};
  ders.forEach(d => { const k = d.durum || 'Planlandı'; dersDurum[k] = (dersDurum[k] || 0) + 1; });
  // sınav sonucu metin olarak tutulur (s.sonuc[kursiyer] = 'Geçti' | 'Kaldı' | 'Girmedi'); eski nesne biçimi de okunur
  const sonucAd = x => typeof x === 'string' ? x : (x && x.sonuc) || '';
  const sinav = (S.sinavlar || []).filter(s => aralik(s.tarih, bas, bit)).map(s => { const r = Object.values(s.sonuc || {}).map(sonucAd); return { tur: s.tur || 'Sınav', tarih: s.tarih, kisi: (s.kursiyerler || []).length, gecti: r.filter(x => x === 'Geçti').length, kaldi: r.filter(x => x === 'Kaldı').length }; });
  const yeni = (S.kursiyerler || []).filter(k => aralik(k.kayit, bas, bit)).map(k => ({ ad: tamAd(k), sinif: k.sinif || '' }));
  const odeme = gel.filter(h => h.kursiyer).map(h => ({ ad: kim(h.kursiyer), tutar: +h.tutar || 0, yontem: h.yontem || '', tarih: h.tarih }));
  let geciken = 0, gecikenTutar = 0; (S.kursiyerler || []).filter(k => !k.kapali && k.odeme).forEach(k => { let l = []; try { l = gecikenler(k); } catch (x) { } if (l.length) { geciken++; gecikenTutar += l.reduce((a, t) => a + (+t.tutar || 0) - (+t.kismi || 0), 0); } });
  const sonraki = gunEkle(bit, 1), yarinDers = (S.dersler || []).filter(d => d.tarih === sonraki && d.durum !== 'İptal').length;
  return { bas, bit, gelir: top(gel), gelirN: gel.length, gider: top(gid), giderN: gid.length, yontem, dersN: ders.length, dersDurum, sinav, yeni, odeme, geciken, gecikenTutar, yarinDers, uyari: ek.uyari || [], kasa: ek.kasa || null, kapatilan: (S.gunSonu || []).filter(g => aralik(g, bas, bit)).length };
}
async function uyarilar() {
  try { const KR = await import('./kurallar.js?v=230'); const agir = t => ({ dur: 0, yasak: 1, uyari: 2, bilgi: 3 }[t] ?? 4); return KR.tumu().filter(x => x[0] !== 'bilgi').sort((a, b) => agir(a[0]) - agir(b[0])).map(x => ({ tur: x[0], baslik: String(x[1] || ''), aciklama: String(x[2] || '') })); }
  catch (x) { return []; }
}
const BASLIK = { gunluk: 'Günlük rapor', haftalik: 'Haftalık rapor', aylik: 'Aylık rapor', deneme: 'Deneme raporu', yedek: 'Veri yedeği' };
const donemMetni = v => v.bas === v.bit ? tamTarih(v.bas) : tamTarih(v.bas) + ' – ' + tamTarih(v.bit);
// E-posta gövdesi: ortak kabuk (eposta-kabuk.js), satır içi stil; telefonda tek sütun
export function raporHtml(tur, v, notlar = []) {
  const tek = v.bas === v.bit, net = v.gelir - v.gider, sat = satirlar, ac = s => `<span style="color:${R.soluk};font-weight:400">${s}</span>`;
  const engel = v.uyari.filter(u => u.tur === 'dur' || u.tur === 'yasak').length;
  const dikkat = [
    ...(v.kasa && v.kasa.fark ? [not(`<b>Kasa sayımında fark var:</b> ${e(tl(v.kasa.fark))}. Sayılan ${e(tl(v.kasa.say))}.`, 'kirmizi')] : []),
    ...(engel ? [not(`<b>${engel} engel</b> var: kural dışı ders ya da sınav. Ayrıntısı aşağıda, Uyarılar bölümünde.`, 'kirmizi')] : []),
    ...(v.geciken ? [not(`<b>Gecikmiş taksit:</b> ${v.geciken} kursiyer, toplam ${e(tl(v.gecikenTutar))}.`, 'amber')] : [])];
  const kasaS = [[ 'Tahsilat ' + ac(`· ${v.gelirN} işlem`), e(tl(v.gelir)) ], ...Object.entries(v.yontem).sort((a, b) => b[1] - a[1]).map(([y, t]) => [e(y), e(tl(t)), { soluk: true, girinti: true }]),
    [ 'Gider ' + ac(`· ${v.giderN || 0} işlem`), e(tl(v.gider)) ], [ '<b>Net</b>', e(tl(net)), { renk: net < 0 ? R.kirmizi : R.yesil } ],
    ...(v.kasa ? [[ 'Kasa sayımı', e(tl(v.kasa.say)) + (v.kasa.fark ? ` <span style="color:${R.kirmizi}">· fark ${e(tl(v.kasa.fark))}</span>` : ` <span style="color:${R.yesil};font-weight:600">· fark yok</span>`) ]] : []),
    ...(!tek ? [[ 'Kapatılan gün', String(v.kapatilan) ]] : [])];
  const dersS = Object.entries(v.dersDurum).sort((a, b) => b[1] - a[1]).map(([d, n]) => [e(d), String(n)]).concat(tek ? [[ 'Yarın planlı ders', String(v.yarinDers), { soluk: true } ]] : []);
  const sinavS = v.sinav.map(s => [`${e(s.tur)} ${ac('· ' + e(tamTarih(s.tarih)))}`, s.gecti + s.kaldi ? `<span style="color:${R.yesil}">${s.gecti} geçti</span> · <span style="color:${R.kirmizi}">${s.kaldi} kaldı</span>` : `${s.kisi} kişi`, { alt: s.gecti + s.kaldi ? `${s.kisi} kişi girdi` : 'Sonuç girilmedi' }]);
  const uyRenk = t => t === 'dur' || t === 'yasak' ? R.kirmizi : t === 'uyari' ? '#d97706' : R.soluk;
  const govde = [
    notlar.map(n => not(e(n))).join(''),
    kutular([['Tahsilat', tl(v.gelir), v.gelirN + ' işlem'], ['Net', tl(net), 'gider ' + tl(v.gider), net < 0 ? R.kirmizi : R.lacivert], ['Ders', String(v.dersN), tek ? `yarın ${v.yarinDers} ders` : (v.dersDurum['Yapıldı'] || 0) + ' yapıldı'], ['Yeni kayıt', String(v.yeni.length), v.odeme.length + ' kursiyer ödemesi']]),
    dikkat.join(''),
    bolum('Kasa', sat(kasaS)),
    bolum('Dersler', v.dersN ? sat(dersS) : bos('Bu dönemde ders yok.'), v.dersN),
    bolum('Sınavlar', v.sinav.length ? sat(sinavS) : bos('Bu dönemde sınav yok.'), v.sinav.length),
    bolum('Yeni kayıtlar', v.yeni.length ? sat(v.yeni.slice(0, 25).map(x => [e(x.ad), x.sinif ? `<span style="font-weight:600;color:${R.soluk}">${e(x.sinif)}</span>` : ''])) + (v.yeni.length > 25 ? devam(`ve ${v.yeni.length - 25} kişi daha`) : '') : bos('Bu dönemde yeni kayıt yok.'), v.yeni.length),
    bolum('Kursiyer ödemeleri', v.odeme.length ? sat(v.odeme.slice(0, 25).map(o => [e(o.ad || 'Kursiyer'), e(tl(o.tutar)), { alt: [o.yontem, !tek ? tamTarih(o.tarih) : ''].filter(Boolean).map(e).join(' · ') }])) + (v.odeme.length > 25 ? devam(`ve ${v.odeme.length - 25} ödeme daha`) : '') : bos('Bu dönemde kursiyer ödemesi yok.'), v.odeme.length),
    bolum('Uyarılar', v.uyari.length ? sat(v.uyari.slice(0, 12).map(u => [nokta(uyRenk(u.tur)) + `<span style="font-weight:600">${e(u.baslik)}</span>`, '', { alt: u.aciklama ? e(u.aciklama) : '' }])) + (v.uyari.length > 12 ? devam(`ve ${v.uyari.length - 12} uyarı daha; hepsi mdSinyal › MEB işlemleri › Kurallar ve takvim’de.`) : '') : bos('Kural uyarısı yok.'), v.uyari.length),
    dugme('mdSinyal’i aç', SITE + '/#/genel')].join('\n');
  return kabuk({ ust: `${S.kurs.ad || 'Sürücü kursu'} · ${donemMetni(v)}`, baslik: BASLIK[tur] || 'Rapor', govde,
    onizleme: `Tahsilat ${tl(v.gelir)} · net ${tl(net)} · ${v.dersN} ders · ${v.yeni.length} yeni kayıt${v.uyari.length ? ' · ' + v.uyari.length + ' uyarı' : ''}`,
    alt: 'Bu e-posta kursunuzun mdSinyal hesabından, kursun onayladığı adrese gönderildi. Hangi raporların geleceğini mdSinyal › Ayarlar › Veri ve e-posta bölümünden değiştirebilirsiniz.' });
}
export function raporMetni(tur, v) {
  return [`${S.kurs.ad || ''} · ${BASLIK[tur] || 'Rapor'} · ${donemMetni(v)}`, '', `Tahsilat: ${tl(v.gelir)} (${v.gelirN} işlem)`, `Gider: ${tl(v.gider)}`, `Net: ${tl(v.gelir - v.gider)}`, ...(v.kasa ? [`Kasa sayımı: ${tl(v.kasa.say)}${v.kasa.fark ? ' · fark ' + tl(v.kasa.fark) : ' · fark yok'}`] : []),
    `Ders: ${v.dersN}`, `Sınav oturumu: ${v.sinav.length}`, `Yeni kayıt: ${v.yeni.length}`, `Kursiyer ödemesi: ${v.odeme.length}`, `Uyarı: ${v.uyari.length}`, '', 'Ayrıntılar HTML görünümde. Ayarlar: mdSinyal › Ayarlar › Veri ve e-posta'].join('\n');
}

// ---- gönderim ----
const sonYaz = (tur, donem) => { S.kurs.epostaSon = { ...(S.kurs.epostaSon || {}), [tur]: donem }; kaydet(); };
async function raporGonder(tur, donem, v, { ek = null, notlar = [] } = {}) {
  v.uyari = await uyarilar();
  const govde = { tur, donem, konu: `${S.kurs.ad || 'Kurs'} · ${BASLIK[tur]} · ${donemMetni(v)}`, html: raporHtml(tur, v, notlar), metin: raporMetni(tur, v), ...(ek ? { ek } : {}) };
  return istek('eposta/gonder', govde);
}
// Ek sınırı ~900 KB dosya (base64 1,2 milyon karakter): ücretsiz worker'ın istek başına işlemci süresi kısa; daha büyük veride e-postaya
// ek konmaz, yerine 'indirin / Drive'a kaydedin' notu gider
const EK_EN_FAZLA = 1.2e6;
export const KAPSAM_NOTU = 'Belgelerin taranmış hâlleri, fotoğraflar ve imzalar Excel’de yoktur; onlar mdSinyal’de kursiyer sayfasında durur.';
// Aylık ek: bütün veriler (fotoğraflar hariç) .xlsx; çok büyükse ek yerine not
async function aylikEk() { try { const b = await tumExcelB64(); return b.length <= EK_EN_FAZLA ? { ad: dosyaAdi('butun-veriler', 'xlsx'), b64: b } : null; } catch (x) { return null; } }
// Ön koşul: bulut hesabı, servis kurulu, en az bir onaylı adres
// (önbellek "onaylı adres yok" diyorsa sunucuya yeniden sorulur: adres az önce onaylanmış olabilir)
async function hazirMi() { if (!bulutta() || !buro()) return false; const tamam = d => d.kurulu && d.adresler.some(a => a.onay); try { const d = await epostaDurum(); return tamam(d) || tamam(await epostaDurum(true)); } catch (x) { return false; } }
// Tek cihaz kilidi 3 saatlik dilime bağlı: kilidi alan cihaz gönderemezse (bağlantı, sunucu hatası, cihaz kapandı) sonraki dilimde
// başka cihaz dener. İki kez gitmeyi epostaSon (senkron) ve worker'daki dönem kaydı engeller.
const kilit = anahtar => !bulutKanca.sahiplen ? Promise.resolve(true) : bulutKanca.sahiplen(anahtar + '|' + Math.floor(Date.now() / (3 * 3600e3)));
const yazilanHata = new Set();
const hataYaz = (anahtar, baslik, x) => { if (yazilanHata.has(anahtar)) return; yazilanHata.add(anahtar); islem(baslik, x.message); kaydet(); };
// Gün sonu kapatılınca (sayfalar2.js): o günün raporu
export async function gunlukRapor(g = gun(0), kasa = null) {
  if (!raporAyar().gunluk || (S.kurs.epostaSon || {}).gunluk === g || !(await hazirMi())) return false;
  if (!(await kilit('eposta|gunluk|' + g))) return false;
  try { await raporGonder('gunluk', g, raporVerisi(g, g, { kasa })); sonYaz('gunluk', g); return true; }
  catch (x) { hataYaz('gunluk|' + g, 'Günlük rapor e-postası gönderilemedi', x); return false; }
}
// Haftalık / aylık: dönemin ilk açılışında (bulut.js kancalariKur, müdür ve ön büro), tek cihazdan; sekme açık kalırsa saatte bir bakılır
let zamanliKuruldu = false, zamanliSuruyor = false;
export async function zamanliRaporlar() {
  if (!zamanliKuruldu) { zamanliKuruldu = true; setInterval(() => { zamanliRaporlar().catch(x => console.error(x)); }, 3600e3); }
  if (zamanliSuruyor || !bulutta() || !buro()) return; zamanliSuruyor = true;
  try { await zamanliCalistir(); } finally { zamanliSuruyor = false; }
}
async function zamanliCalistir() {
  const A = raporAyar(), son = S.kurs.epostaSon || {}, h = gecenHafta(), a = gecenAy();
  const is = [A.haftalik && son.haftalik !== h.donem && ['haftalik', h], A.aylik && son.aylik !== a.donem && ['aylik', a]].filter(Boolean);
  // gün sonu kapatıldığı an gönderilemeyen (bağlantı yoktu, sekme kapandı) son 3 günün en yenisi
  const kapali = (S.gunSonu || []).filter(g => g <= gun(0) && g >= gunEkle(gun(0), -3)).sort().pop();
  if (A.gunluk && kapali && (son.gunluk || '') < kapali) await gunlukRapor(kapali);
  if (!is.length || !(await hazirMi())) return;
  for (const [tur, d] of is) {
    if (!(await kilit('eposta|' + tur + '|' + d.donem))) continue;
    try {
      const ek = tur === 'aylik' ? await aylikEk() : null;
      await raporGonder(tur, d.donem, raporVerisi(d.bas, d.bit), { ek, notlar: tur === 'aylik' ? [ek ? 'Kursunuzun kayıtları ekteki Excel dosyasında, her biri ayrı sayfada: kursiyerler, taksitler, kasa, dersler, sınavlar, öğretmenler, araçlar, faturalar, personel ve diğerleri. ' + KAPSAM_NOTU : 'Kayıtlarınız bu ay e-postaya sığmayacak kadar büyük; mdSinyal › Ayarlar › Veri ve e-posta › Bütün verileri Excel’e ile indirebilir ya da Google Drive’a kaydedebilirsiniz.'] : [] });
      sonYaz(tur, d.donem);
    } catch (x) { hataYaz(tur + '|' + d.donem, (tur === 'aylik' ? 'Aylık' : 'Haftalık') + ' rapor e-postası gönderilemedi', x); }
  }
}

// ---- Google Drive (kursun kendi Google hesabı; yalnız mdSinyal'in oluşturduğu dosyalara erişim: drive.file) ----
const DRIVE_ISTEMCI = '451344576006-sua0mu4d4qcssc0lv8g01qic26hr6os7.apps.googleusercontent.com';  // sahip.js ile aynı OAuth istemcisi (herkese açık bilgidir)
const DRIVE_KAPSAM = 'https://www.googleapis.com/auth/drive.file';
const gsi = () => window.google && window.google.accounts && window.google.accounts.oauth2 ? Promise.resolve() : new Promise((ok, red) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = ok; s.onerror = () => red(hata('Google bağlantısı yüklenemedi')); document.head.appendChild(s); });
async function driveBelirtec() {
  await gsi();
  return new Promise((ok, red) => {
    const c = window.google.accounts.oauth2.initTokenClient({ client_id: DRIVE_ISTEMCI, scope: DRIVE_KAPSAM, callback: r => r && r.access_token ? ok(r.access_token) : red(hata(r && r.error === 'access_denied' ? 'Google izni verilmedi' : 'Google bağlantısı kurulamadı')), error_callback: x => red(hata(x && x.type === 'popup_closed' ? 'Google penceresi kapatıldı' : 'Google penceresi açılamadı; açılır pencere engelini kaldırın')) });
    c.requestAccessToken({ prompt: '' });
  });
}
const KLASOR = () => 'sinyal-drive-klasor-' + (bulut.kurs || 'yerel');
const DRIVE = 'https://www.googleapis.com/drive/v3/files', KLASOR_TUR = 'application/vnd.google-apps.folder';
const driveHata = r => hata(r.status === 403 ? 'Google Drive bu işleme izin vermedi' : r.status === 401 ? 'Google izni sona erdi; tekrar deneyin' : 'Google Drive’a kaydedilemedi');
// klasör: yalnız bilgi (dosya içeriği yok) normal uç noktaya JSON olarak gider
async function driveKlasorAc(tok, ad) {
  const r = await fetch(DRIVE + '?fields=id', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: ad, mimeType: KLASOR_TUR }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.id) throw driveHata(r); return j.id;
}
// dosya: Google'ın istediği multipart/related gövde (1. parça bilgi, 2. parça içerik)
async function driveYukle(tok, ad, blob, ust) {
  const sinir = 'mdsinyal' + Math.random().toString(36).slice(2), meta = JSON.stringify({ name: ad, parents: [ust] });
  const govde = new Blob([`--${sinir}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${sinir}\r\nContent-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`, blob, `\r\n--${sinir}--`]);
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'multipart/related; boundary=' + sinir }, body: govde });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw driveHata(r); return j.id;
}
export async function driveKaydet() {
  if (!bulutta()) throw hata('Google Drive’a kaydetme kursunuzun bulut hesabında açılır');
  const tok = await driveBelirtec(), ad = 'mdSinyal yedekleri · ' + (S.kurs.ad || 'Kurs'), H = { Authorization: 'Bearer ' + tok };
  let klasor = null; try { klasor = localStorage.getItem(KLASOR()); } catch (x) { }
  // saklanan klasör silinmiş ya da çöpteyse: mdSinyal'in daha önce açtığı aynı adlı klasör aranır (drive.file kendi açtıklarını görür), yoksa yenisi açılır
  if (klasor) { const r = await fetch(DRIVE + '/' + encodeURIComponent(klasor) + '?fields=id,trashed', { headers: H }).catch(() => null); const j = r && r.ok ? await r.json() : null; if (!j || j.trashed) klasor = null; }
  if (!klasor) {
    const q = `mimeType='${KLASOR_TUR}' and name='${ad.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' and trashed=false`;
    const r = await fetch(DRIVE + '?fields=files(id)&pageSize=1&q=' + encodeURIComponent(q), { headers: H }).catch(() => null); const j = r && r.ok ? await r.json() : null;
    klasor = (j && j.files && j.files[0] && j.files[0].id) || await driveKlasorAc(tok, ad);
    try { localStorage.setItem(KLASOR(), klasor); } catch (x) { }
  }
  await driveYukle(tok, dosyaAdi('butun-veriler', 'xlsx'), await tumExcelBlob(), klasor);
  await driveYukle(tok, dosyaAdi('tam-yedek', 'json'), new Blob([tamYedekMetni()], { type: 'application/json' }), klasor);
  // belirteç geri çekilmez: aynı OAuth istemcisi sahip panelinde de kullanılıyor ve geri çekme uygulamanın bütün iznini kaldırır; belirteç 1 saatte kendiliğinden düşer
  islem('Verileri Google Drive’a kaydetti'); kaydet();
}

// ---- Ayarlar › Veri ve e-posta ----
export function veriSekmesiHtml() {
  const A = raporAyar(), m = mudur(), son = S.kurs.epostaSon || {};
  const satir = 'display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--cizgi-2);cursor:pointer';
  const anahtar = (ad, acik, kapali) => `<span class="anahtar"><input type="checkbox" data-ep-ayar="${ad}" ${acik ? 'checked' : ''} ${kapali ? 'disabled' : ''}><i></i></span>`;
  return `<div class="izgara iz-2">
    <div>
      <div class="kart"><div class="kart-bas"><h3>Kursun e-posta adresleri</h3><small>Raporlar ve yedekler buraya gelir · en fazla 3 adres</small></div><div class="kart-govde" data-ep-adresler>
        ${bulutta() ? `<p style="font-size:14px;color:var(--soluk)">Yükleniyor…</p>` : `<p style="font-size:14px">Demo hesabında e-posta gönderilmez. Kursunuzun hesabında adres ekleyince raporlar bu adrese gelir.</p>`}
      </div></div>
      <div class="ara-bosluk"></div>
      <div class="kart"><div class="kart-bas"><h3>Rapor e-postaları</h3><small>Kasa, dersler, sınavlar, yeni kayıtlar, ödemeler ve uyarılar</small></div><div class="kart-govde">
        ${TURLER.map(([k, a, alt], i) => `<label class="ep-satir" style="${satir}${i ? '' : ';border-top:0'}"><span style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${a}</b><small style="color:var(--soluk)">${alt}${son[k] ? ' · son: ' + e(k === 'gunluk' ? tamTarih(son[k]) : son[k]) : ''}</small></span>${anahtar(k, A[k], !m)}</label>`).join('')}
        <p style="font-size:13px;color:var(--soluk);margin-top:10px">${m ? 'Gün sonu WhatsApp özeti de eskisi gibi müdüre gider.' : 'Hangi raporların geleceğini kurs müdürü seçer.'}</p>
        ${bulutta() && buro() ? `<button class="dg dg-cizgi dg-kucuk" style="margin-top:10px" data-ep-deneme>${ik('mesaj')}Bugünün raporunu şimdi gönder</button>` : ''}
      </div></div>
    </div>
    <div>
      <div class="kart"><div class="kart-bas"><h3>Bütün verileriniz</h3><small>İstediğiniz an, tek dokunuşla</small></div><div class="kart-govde">
        <p style="font-size:14px;margin-bottom:12px">Kursiyerler, taksitler, kasa, gün sonu, dersler, teorik dersler, sınavlar, öğretmenler, araçlar, faturalar, personel ve avanslar, izinler, cezalar, imza istekleri, şubeler, adaylar ve işlem geçmişi tek Excel dosyasında, her biri ayrı sayfada. Tam yedek, mdSinyal’e geri yüklenebilen dosyadır. ${e(KAPSAM_NOTU)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="dg dg-ana" data-ep-excel>${ik('indir')}Bütün verileri Excel’e</button>
          <button class="dg dg-cizgi" data-ep-yedek>${ik('indir')}Tam yedeği indir</button>
          ${bulutta() && buro() ? `<button class="dg dg-cizgi" data-ep-yedek-eposta>${ik('gonder')}E-postayla gönder</button>` : ''}
          ${bulutta() ? `<button class="dg dg-cizgi" data-ep-drive>${ik('belge')}Google Drive’a kaydet</button>` : ''}
        </div>
        <p style="font-size:13px;color:var(--soluk);margin-top:10px">${bulutta() ? '' : 'Demoda Google Drive’a kaydetme kapalıdır. '}Google Drive: kursun kendi Google hesabında “mdSinyal yedekleri” klasörüne Excel ve tam yedek kaydedilir. mdSinyal yalnız kendi oluşturduğu bu dosyaları görebilir; Drive’ınızdaki başka dosyalara erişemez.</p>
      </div></div>
      <div class="ara-bosluk"></div>
      <div class="kart"><div class="kart-bas"><h3>Kullanım istatistiği</h3><small>Programı geliştirmek için</small></div><div class="kart-govde">
        <label class="ep-satir" style="${satir};border-top:0"><span style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">mdSinyal’in iyileştirilmesine katkı</b><small style="color:var(--soluk)">Hangi ekranların ne kadar kullanıldığı, hangi düğmelere basıldığı ve nerede hata çıktığı sayılır</small></span>${anahtar('kullanim', !S.kurs.kullanimKapali, !m)}</label>
        <p style="font-size:13px;color:var(--soluk);margin-top:8px">Ad, telefon, TC kimlik numarası, tutar ya da yazdığınız hiçbir metin kaydedilmez; yalnız ekran ve düğme adları, süreler ve sayılar. Ayrıntı: <a href="gizlilik.html" target="_blank" rel="noopener" style="color:var(--levha);font-weight:700">Gizlilik</a>.</p>
      </div></div>
    </div></div>`;
}
function adresHtml(d) {
  const m = mudur();
  if (!d.kurulu) return `<p style="font-size:14px">${rozet('Hazırlanıyor', 'sari')} E-posta servisi henüz kurulmadı. Kurulunca eklediğiniz adrese onay e-postası gider; raporlar ondan sonra gelmeye başlar.</p>${d.adresler.length ? adresListe(d, m) : ''}`;
  return `${d.adresler.length ? adresListe(d, m) : `<p style="font-size:14px;margin-bottom:8px">Henüz adres yok. ${m ? 'Kursun e-posta adresini ekleyin; adrese gelen onay linkine dokununca raporlar başlar.' : 'Adresi kurs müdürü ekler.'}</p>`}
    ${m && d.adresler.length < (d.enFazla || 3) ? `<form data-ep-ekle style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><input class="girdi" name="adres" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="ornek@kursunuz.com" style="flex:1;min-width:0;width:auto" required><button class="dg dg-ana">Ekle</button></form>` : ''}`;
}
const adresListe = (d, m) => `<ul class="liste">${d.adresler.map(x => `<li style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:0;overflow-wrap:anywhere;color:var(--murekkep);font-weight:600">${e(x.a)}</span>${x.onay ? rozet('Onaylı', 'yesil') : rozet('Onay bekliyor', 'sari')}${m ? `${x.onay ? '' : `<button class="dg dg-cizgi dg-kucuk" data-ep-tekrar="${e(x.a)}">Yeniden gönder</button>`}<button class="dg dg-cizgi dg-kucuk" data-ep-sil="${e(x.a)}">Çıkar</button>` : ''}</li>`).join('')}</ul>${d.adresler.some(x => !x.onay) ? '<p style="font-size:13px;color:var(--soluk);margin-top:8px">Onay bekleyen adrese giden e-postadaki “Adresimi onayla” düğmesine dokunun. Gelmediyse istenmeyen e-posta klasörüne bakın.</p>' : ''}`;
async function adresleriCiz(k, taze) {
  const yer = k.querySelector('[data-ep-adresler]'); if (!yer || !bulutta()) return;
  try { yer.innerHTML = adresHtml(await epostaDurum(taze)); }
  catch (x) { yer.innerHTML = x.kurulmadi ? adresHtml({ kurulu: false, adresler: [] }) : `<p style="font-size:14px;color:var(--soluk)">${e(x.message)}</p><button class="dg dg-cizgi dg-kucuk" style="margin-top:8px" data-ep-yeniden>Tekrar dene</button>`; }
}
const mesajHata = x => bildir(x.message || 'İşlem tamamlanamadı', 'uyari');
export function veriSekmesiBagla(k) {
  if (k.dataset.epBagli) { adresleriCiz(k); return; }
  k.dataset.epBagli = '1'; adresleriCiz(k);
  k.addEventListener('change', ev => {
    const a = ev.target.closest('[data-ep-ayar]'); if (!a) return;
    if (!mudur()) { ev.target.checked = !ev.target.checked; return bildir('Bu ayarı kurs müdürü değiştirir', 'uyari'); }
    if (a.dataset.epAyar === 'kullanim') { S.kurs.kullanimKapali = !a.checked; islem('Kullanım istatistiğini ' + (a.checked ? 'açtı' : 'kapattı')); }
    else { S.kurs.epostaRapor = { ...raporAyar(), [a.dataset.epAyar]: a.checked }; islem('Rapor e-postası ayarını değiştirdi', (TURLER.find(t => t[0] === a.dataset.epAyar) || [])[1] + ': ' + (a.checked ? 'açık' : 'kapalı')); }
    kaydet(); bildir('Kaydedildi');
  });
  k.addEventListener('submit', async ev => {
    const f = ev.target.closest('[data-ep-ekle]'); if (!f) return; ev.preventDefault(); ev.stopPropagation();
    const adres = f.adres.value.trim(), b = f.querySelector('button'); if (!adres) return f.adres.focus();
    b.disabled = true;
    try { const r = await adresEkle(adres); islem('Kursun e-posta adresini ekledi'); kaydet(); bildir(r.onay ? 'Adres zaten onaylı' : 'Onay e-postası gönderildi; adrese gelen linke dokunun'); await adresleriCiz(k, true); }
    catch (x) { b.disabled = false; mesajHata(x); }
  }, true);
  k.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.closest('[data-ep-yeniden]')) return adresleriCiz(k, true);
    const sl = t.closest('[data-ep-sil]'); if (sl) { sl.disabled = true; try { await adresSil(sl.dataset.epSil); islem('Kursun e-posta adresini çıkardı'); kaydet(); bildir('Adres çıkarıldı'); await adresleriCiz(k, true); } catch (x) { sl.disabled = false; mesajHata(x); } return; }
    const tk = t.closest('[data-ep-tekrar]'); if (tk) { tk.disabled = true; try { await adresEkle(tk.dataset.epTekrar); bildir('Onay e-postası yeniden gönderildi'); } catch (x) { mesajHata(x); } tk.disabled = false; return; }
    const btn = t.closest('[data-ep-excel],[data-ep-yedek],[data-ep-yedek-eposta],[data-ep-drive],[data-ep-deneme]'); if (!btn) return;
    btn.disabled = true;
    try {
      if (btn.matches('[data-ep-excel]')) { const n = await tumExcelIndir(); islem('Bütün verileri Excel’e indirdi'); kaydet(); bildir('Excel indirildi: ' + n + ' sayfa'); }
      else if (btn.matches('[data-ep-yedek]')) { tamYedekIndir(); islem('Tam yedeği indirdi'); kaydet(); bildir('Tam yedek indirildi'); }
      else if (btn.matches('[data-ep-drive]')) { await driveKaydet(); bildir('Google Drive’a kaydedildi: “mdSinyal yedekleri” klasörü'); }
      else if (btn.matches('[data-ep-yedek-eposta]')) {
        const b64 = await tumExcelB64(); if (b64.length > EK_EN_FAZLA) throw hata('Veriler e-postaya sığmayacak kadar büyük; Excel’i indirin ya da Google Drive’a kaydedin');
        const v = raporVerisi(gun(0), gun(0)); v.uyari = [];
        await istek('eposta/gonder', { tur: 'yedek', konu: `${S.kurs.ad || 'Kurs'} · bütün veriler · ${tamTarih(gun(0))}`, html: raporHtml('yedek', v, ['Kursunuzun kayıtları ekteki Excel dosyasında, her biri ayrı sayfada. ' + KAPSAM_NOTU]), metin: 'Kursunuzun kayıtları ekteki Excel dosyasında. ' + KAPSAM_NOTU, ek: { ad: dosyaAdi('butun-veriler', 'xlsx'), b64 } });
        islem('Bütün verileri e-postayla gönderdi'); kaydet(); bildir('Gönderildi: kursun onaylı e-posta adreslerine');
      }
      else if (btn.matches('[data-ep-deneme]')) { await raporGonder('deneme', gun(0), raporVerisi(gun(0), gun(0))); islem('Deneme rapor e-postası gönderdi'); kaydet(); bildir('Rapor gönderildi'); }
    } catch (x) { mesajHata(x); }
    btn.disabled = false;
  });
}
// Hızlı yardımcı: rapor önizlemesi (deneme ve testler için)
export const raporOnizle = (tur = 'gunluk', bas = gun(0), bit = bas) => raporHtml(tur, raporVerisi(bas, bit));
