import { DESTEK } from './iletisim.js?v=234';
import { ilSecenekleri, ekranDuzey, ekranYetkili, kullaniciSubesi, S, tamAd, gecikenler, eksikEvrak, egitmen, kursiyer, oturum, islem, kaydet, geriAl, gorunum, subeSec, sinifEtiket, sb } from './veri.js?v=234';
import { ik, e, pencere, kapatPencere, bugunMetni, bildir, ziyaretci, sadeDil, sadeDilBaslat } from './ui.js?v=234';
import * as Y1 from './sayfalar1.js?v=234';
import * as Y2 from './sayfalar2.js?v=234';
import * as SG from './sinavgunu.js?v=234';
import * as P from './portal.js?v=234';
import * as OXU from './ogr/ui.js?v=234';
import * as Y3 from './sayfalar3.js?v=234';
import * as Y4 from './sayfalar4.js?v=234';
import * as Y5 from './sayfalar5.js?v=234';
import * as IM from './imza.js?v=234';
import { zamanlayiciBaslat, kurallariHazirla } from './zamanlayici.js?v=234';
import * as SN from './senaryo.js?v=234';
import * as OZ from './ozellik.js?v=234';
import { durumlariGuncelle } from './mesaj.js?v=234';
import { yeniMenu } from './yeni.js?v=234';
import * as B from './bulut.js?v=234';
import { eklentiBaslat, eklentiYenile } from './eklenti.js?v=234';
import * as AN from './analiz.js?v=234';
import * as GZ from './guzergah.js?v=234';
import * as ORT from './ortak.js?v=234';
import * as SH from './sahip.js?v=234';
import * as MZ from './sayfa-mevzuat.js?v=234';
import * as RM from './raporlar.js?v=234';
import * as GU from './guncelleme.js?v=234';
import * as DY from './duyuru.js?v=234';
import * as IL from './ilan.js?v=234';
import * as TC from './tercih.js?v=234';

/* ---------- uygulama hatalarının otomatik bildirimi ----------
   window.onerror / unhandledrejection → worker /hata (api.mdsinyal.com). Gönderilen: sürüm, rota adı (#/ad; kimlik ve kod kırpılır), rol,
   hata mesajı ve yığının ilk satırları (e-posta, uzun sayı ve adreslerin sorgu kısmı silinir), kurs kimliğinin özeti (SHA-256 ilk 8).
   Kişi adı, TC, telefon gönderilmez. Sınır: aynı hata oturumda bir kez, oturumda en çok 10, dakikada en çok 3, cihazda günde en çok 20.
   Yalnız mdsinyal.com'da gönderilir (denemede localStorage 'sinyal-hata-test' = '1'). */
const HATA_SURUM = new URL(import.meta.url).searchParams.get('v') || '';
const hataDurum = { n: 0, dk: 0, dkN: 0, gorulen: new Set() };
const hataTemiz = (x, n) => String(x || '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<e-posta>').replace(/\d[\d\s().-]{5,}\d/g, '<sayı>').replace(/(https?:\/\/[^\s/]+)?(\/[^\s?#:)]*)[?#][^\s:)]*/g, '$2').slice(0, n);
const hataAcik = () => { if (location.hostname === 'mdsinyal.com') return true; try { return localStorage.getItem('sinyal-hata-test') === '1'; } catch (x) { return false; } };
async function hataBildir(tur, hata, yer) {
  try {
    if (!hataAcik() || hataDurum.n >= 10) return;
    const m = hataTemiz(hata && hata.message ? (hata.name && !String(hata.message).startsWith(hata.name) ? hata.name + ': ' : '') + hata.message : hata, 300);
    if (!m || /^Script error\.?$/.test(m) || /ResizeObserver loop/.test(m)) return;
    const y = hataTemiz(((hata && hata.stack) || yer || '').split('\n').slice(0, 5).join('\n'), 600), iz = m + '|' + y.split('\n')[0];
    if (hataDurum.gorulen.has(iz)) return; hataDurum.gorulen.add(iz);
    const dk = Math.floor(Date.now() / 60e3); if (hataDurum.dk !== dk) { hataDurum.dk = dk; hataDurum.dkN = 0; } if (hataDurum.dkN >= 3) return;
    const bugun = new Date().toISOString().slice(0, 10); let g = { gun: bugun, n: 0 };
    try { const v = JSON.parse(localStorage.getItem('sinyal-hata-sayac') || 'null'); if (v && v.gun === bugun) g = v; } catch (x) { }
    if (g.n >= 20) return; g.n++; try { localStorage.setItem('sinyal-hata-sayac', JSON.stringify(g)); } catch (x) { }
    hataDurum.n++; hataDurum.dkN++;
    const u = oturum.kullanici, kurs = (B.bulut && B.bulut.kurs) || '';
    const ks = kurs ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(kurs)))].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('') : (u ? 'demo' : '');
    const govde = JSON.stringify({ t: tur, s: HATA_SURUM, r: ((location.hash.match(/^#\/[a-z-]+/i) || [''])[0]).slice(0, 40), rol: u ? (u.ziyaretci ? 'ziyaretci' : u.rol || 'yok') : 'yok', m, y, ks, tr: ((navigator.userAgent.match(/(Firefox|Edg|OPR|SamsungBrowser|CriOS|Chrome|Version)\/(\d+)/) || [])[0] || '').slice(0, 30) + (/Mobile/.test(navigator.userAgent) ? ' mobil' : '') });
    const adres = B.WORKER + '/hata', blob = new Blob([govde], { type: 'text/plain' });
    if (!(navigator.sendBeacon && navigator.sendBeacon(adres, blob))) fetch(adres, { method: 'POST', body: govde, headers: { 'Content-Type': 'text/plain' }, keepalive: true, mode: 'cors', credentials: 'omit' }).catch(() => { });
  } catch (x) { }
}
window.addEventListener('error', ev => { if (ev && ev.target && ev.target !== window && !ev.error) return; hataBildir('hata', ev.error || ev.message, ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : ''); });
window.addEventListener('unhandledrejection', ev => { const r = ev && ev.reason; if (r && (r.kullanici || r.code === 'permission-denied' || r.name === 'AbortError')) return; hataBildir('soz', r instanceof Error ? r : String(r && r.message || r || 'Promise reddedildi')); });

// DIG-040: kurs ana ekranının altında "Duyurular" bağlantısı; önemli ve okunmamış duyuru bir kez pencere olarak açılır
function duyuruAlani(kap) {
  DY.yukle().then(() => { const s = kap.querySelector('[data-sg-alan="alt"]'); if (!s || kap.querySelector('[data-dy-liste]')) return; const n = DY.okunmamis().length;
    s.insertAdjacentHTML('afterend', `<p class="dy-bag-satir"><button type="button" class="sg-bag" data-dy-liste>Duyurular${n ? ` · ${n} yeni` : ''}</button></p>`); setTimeout(() => DY.goster(), 1200); });
}
// DIG-025: iki cihaz aynı alanı aynı anda değiştirince kaybeden cihaz uyarılır (bulut.js birleştirme)
addEventListener('sinyal-cakisma', ev => { const m = ev.detail && ev.detail.metin; if (!m) return; if (document.querySelector('.perde')) return bildir(m, 'uyari');
  pencere({ baslik: 'Değişikliğiniz başka cihazınkiyle çakıştı', taslak: false, icerik: `<p style="font-size:14px">${e(m)}</p>`, altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' }); });
// YON-082 / YON-002: öğrenci e-postasını ekler; doğrulama bağlantısına dokununca hesabın e-postası olur, telefonla giriş kapanır (eşlemede gerçek e-posta durmaz)
document.addEventListener('click', ev => { if (!ev.target.closest('[data-ogr-eposta]')) return; ev.preventDefault(); kapatPencere();
  setTimeout(() => pencere({ baslik: B.ogrenciEposta() ? 'E-postanı değiştir' : 'E-postanı ekle', icerik: `<form data-oe><label class="og-alan"><span class="og-alan-et">E-posta</span><span class="og-girdi"><input name="e" type="email" autocomplete="email" required value="${e(B.ogrenciEposta())}"></span></label><p style="font-size:13.5px;color:var(--soluk);margin-top:8px">Bu adrese bir doğrulama bağlantısı gelir. Dokununca bundan sonra e-postan ve şifrenle girersin; telefonla giriş kapanır. Şifreni unutursan bağlantı e-postana gelir.</p></form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-oe-gonder>Bağlantı gönder</button>', onAc(p) { p.querySelector('[data-oe-gonder]').addEventListener('click', () => { const v = p.querySelector('[name=e]').value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return bildir('E-postanı yaz', 'uyari'); B.ogrenciEpostaEkle(v).then(() => { kapatPencere(); bildir(v + ' adresine doğrulama bağlantısı gönderildi; gelen kutuna ve istenmeyen klasörüne bak'); }).catch(x => bildir(B.hataMetni(x), 'uyari')); }); } }), 200); });
// YON-072: birden çok kursta hesabı olan kişi kurs değiştirir
document.addEventListener('click', ev => { if (!ev.target.closest('[data-kurs-degistir]')) return; ev.preventDefault(); kapatPencere();
  B.kurslarim().then(l => pencere({ baslik: 'Kurs değiştir', icerik: `<ul class="liste">${l.map(k => `<li><div style="flex:1;min-width:0"><b>${e(k.ad)}</b><small style="display:block;color:var(--soluk)">${e({ mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici', ortak: 'Ortak' }[k.rol] || k.rol)}</small></div>${k.secili ? '<span class="rozet rozet-yesil">açık</span>' : `<button class="dg dg-ana dg-kucuk" data-kurs-sec="${e(k.id)}">Aç</button>`}</li>`).join('')}</ul>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>', onAc(p) { p.querySelectorAll('[data-kurs-sec]').forEach(b => b.addEventListener('click', () => { b.disabled = true; b.textContent = 'Açılıyor…'; const k = l.find(x => x.id === b.dataset.kursSec); islem('Kurs değiştirdi', k ? k.ad : ''); kaydet(); B.kursDegistir(b.dataset.kursSec); })); } })).catch(x => bildir(B.hataMetni(x), 'uyari')); });
// YON-063: kişisel tercihler penceresi (kullanıcı menüsünden)
document.addEventListener('click', ev => { if (!ev.target.closest('[data-tercih]')) return; ev.preventDefault(); import('./tercih.js?v=234').then(TC => { kapatPencere(); setTimeout(() => pencere({ baslik: 'Görünüm ve tercihler', icerik: TC.tercihHtml(), altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>', onAc(p) { p.addEventListener('change', e2 => { if (TC.tercihDegisti(e2.target)) yenile(); }); } }), 200); }); });
document.addEventListener('click', ev => { if (ev.target.closest('[data-nasil]')) { ev.preventDefault(); return import('./nasil.js?v=234').then(m => m.nasilAc()); } });   // DIG-031
document.addEventListener('click', ev => { if (ev.target.closest('[data-dy-liste]')) { ev.preventDefault(); DY.listeAc().then(() => document.querySelectorAll('[data-dy-liste]').forEach(b => { b.textContent = 'Duyurular'; })); } });
const SAYFALAR = {
  genel: Y1.genel, adaylar: Y1.adaylar, kursiyerler: Y1.kursiyerler, kursiyer: Y1.kursiyerDetay,
  plan: Y1.plan, teorik: Y1.teorik, sinavlar: Y2.sinavlar, guzergah: GZ.sayfa, kasa: Y2.kasa, filo: Y2.filo,
  mesajlar: Y2.mesajlar, meb: Y2.meb, raporlar: RM.raporMerkezi, ayarlar: Y2.ayarlar,
  egitmen: P.egitmenPortal, ogrenci: P.ogrenciPortal,
  belgeler: Y3.belgeler, kayit: Y3.kayitSayfasi, guven: Y3.guven, mebbis: Y3.mebbisAsistani,
  sosyal: Y4.sosyal, kurulum: Y5.kurulum, 'imza-geldi': IM.imzaGeldi, senaryo: SN.senaryolar, karlilik: OZ.karlilik, analiz: AN.analiz,
  mevzuat: MZ.mevzuat, ilanlar: IL.ilanlar, sinav: SG.sinavGunu,
};
const ROL_AD = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici', ortak: 'Ortak' };
const YASAK = { mudur: [], sekreter: ['raporlar', 'ayarlar', 'guven', 'kurulum', 'senaryo', 'karlilik', 'analiz'], usta: Object.keys(SAYFALAR).filter(k => !['egitmen', 'imza-geldi'].includes(k)), ortak: Object.keys(SAYFALAR),
  // YON-073: teorik öğretmen yalnız teorik dersler ve yoklama; muhasebe / mali müşavir yalnız kasa (salt okunur); şube müdürü ön büro gibi, raporlar açık (kendi şubesi)
  teorik: Object.keys(SAYFALAR).filter(k => !['teorik'].includes(k)), muhasebe: Object.keys(SAYFALAR).filter(k => !['kasa'].includes(k)), subemudur: ['ayarlar', 'guven', 'kurulum', 'senaryo'] };
// rolün ana ekranı
export const anaSayfa = (u = oturum.kullanici) => !u ? '#/genel' : u.rol === 'usta' ? '#/egitmen' : u.rol === 'teorik' ? '#/teorik' : u.rol === 'muhasebe' ? '#/kasa' : '#/genel';
const UST_EKRAN = { kursiyer: 'kursiyerler', sinav: 'sinavlar' }, ustEkran = ad => UST_EKRAN[ad] || ad;
const izinli = ad => { ad = ustEkran(ad); const u = oturum.kullanici; return u && !(YASAK[u.gorev === 'subemudur' ? 'subemudur' : u.rol] || Object.keys(SAYFALAR)).includes(ad) && !((u.ziyaretci || u.bulut) && ad === 'senaryo') && ekranYetkili(ad); };  // YON-018: müdürün kapattığı ekran ön büroya görünmez

// Menü günlük işe göre: önce bugün, sonra öğrenci işleri, para, kurum işleri, analiz; az kullanılanlar en altta
const MENU = [
  ['Bugün', [['genel', 'Genel bakış', '↑'], ['mesajlar', 'Mesajlar', '↗'], ['adaylar', 'Yeni öğrenciler', '↗']]],
  ['Öğrenciler', [['kursiyerler', 'Kursiyerler', '→'], ['plan', 'Direksiyon planı', '→'], ['teorik', 'Teorik dersler', '→'], ['sinavlar', 'Sınavlar', '→'], ['guzergah', 'Sınav güzergâhları', '→']]],
  ['Para', [['kasa', 'Kasa ve ödemeler', '→']]],
  ['Kurum', [['meb', 'MEB işlemleri', '→'], ['mevzuat', 'Mevzuat asistanı', '→'], ['belgeler', 'Belgeler ve çıktılar', '→'], ['filo', 'Ekip ve araçlar', '→']]],
  ['Analiz', [['raporlar', 'Raporlar', '→']]],
  ['Diğer', [['ilanlar', 'İlan panosu', '→'], ['sosyal', 'Sosyal medya asistanı', '↗'], ['kayit', 'Kayıt formu', '↗'], ['ogrenci', 'Kursiyer ekranı', '↗'], ['senaryo', 'Demo senaryoları', '↗'], ['kurulum', 'Kurulum', '→'], ['guven', 'Verileriniz ve güvenlik', '→'], ['ayarlar', 'Ayarlar', '→']]],
];
// Aramada sayfaların yanında özellikler de çıkar (ör. "müşavir" yazınca müşavir paketi)
const OZELLIKLER = [['Müşavir paketi (Excel)', '#/ayarlar/entegrasyon', 'muhasebe fatura e-arşiv luca'], ['Sunum verisi (örnek dersler)', '#/ayarlar/kurs', 'sunum örnek ders öğretmen tanıtım'], ['Otomatik planla', '#/plan', 'ders dağıt program'], ['WhatsApp hattını bağla', '#/ayarlar/kurs', 'otomatik mesaj api'], ['İki adımlı giriş', '#/ayarlar/guvenlik', 'doğrulama kodu güvenlik'], ['Ders defteri (öğrenci onayı)', '#/ayarlar/ogrenciapp', 'itiraz onay'], ['Öğrenci uygulaması ayarları', '#/ayarlar/ogrenciapp', 'kursiyer ekranı'], ['Sınıf ve ücretler', '#/ayarlar/sinif', 'fiyat taban ücret'], ['Kullanıcılar ve davet', '#/ayarlar/kullanici', 'çalışan personel'], ['Yedekler', '#/ayarlar/guvenlik', 'yedek geri yükle'], ['İşlem geçmişi', '#/ayarlar/gecmis', 'log kim ne yaptı'], ['KVKK ve anonimleştirme', '#/ayarlar/kvkk', 'kişisel veri imha'], ['Veri aktarımı (Excel)', '#/ayarlar/aktarim', 'içe aktar eski program'], ['Denetim modu', '#/meb', 'müfettiş denetim'], ['MEBBİS Yardımcısı', '#/meb', 'eklenti chrome'], ['Puantaj ve personel özeti', '#/ayarlar/entegrasyon', 'bordro maaş prim']];


let rol = 'yonetici';
try { rol = localStorage.getItem('sinyal-rol') || 'yonetici'; } catch (x) { }

function sayaclar() {
  return {
    adaylar: [S.adaylar.filter(a => a.asama === 'Yeni').length, false],
    kasa: [sb(S.kursiyerler).filter(k => !(k.kapali && k.kapali.tur === 'arsiv') && gecikenler(k).length).length, false],   // DENETİM K8: Kasa sayfası gibi şube süzgecine uyar; arşivdekiler sayılmaz (DIG-051)
    meb: [S.kursiyerler.filter(k => !k.mebIslendi && !eksikEvrak(k).length).length, true],
    sosyal: [S.sosyal.yorumlar.filter(y => y.durum === 'devir' || y.durum === 'onay').length + S.devredilen.length, false],
    kurulum: [Y5.kurulumAdimlari().filter(x => !x[1]).length, true],
  };
}

// Telefon uygulaması kabuğu (öğrenci ve öğretmen): üst çubukta kurs adı ve yuvarlak profil düğmesi; hesap işleri alttan açılan sayfada
const APP_LOGO = '<svg class="logo-isaret" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="#141e33"/><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><g fill="none" stroke="#ffc21a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l12 12-12 12" stroke-opacity=".38"/><path d="M33 20l12 12-12 12"/></g></svg>';
const basHarf = ad => e(String(ad || '?').trim().split(/\s+/).filter(Boolean).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr') || '?');
// iOS durum çubuğu üst çubukla aynı renkte olsun (uygulama kabuğunda açık zemin, panelde levha mavisi)
function temaRengi(uygulama) { if (!uygulama) document.body.classList.remove('hero-acik'); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = uygulama ? '#f2f2f7' : '#0a4da2'; }
// Kaydırınca üst çubuğun altına ince çizgi gelir (iOS gibi); en üstte çizgisiz
addEventListener('scroll', () => document.body.classList.toggle('kaydi', scrollY > 6), { passive: true });
function hesapSayfasi() {
  const u = oturum.kullanici; if (!u) return;
  const ogr = u.rol === 'ogrenci', og = ogr ? kursiyer(u.kursiyer) : null, ad = og ? tamAd(og) : u.ad;
  const tel = (S.kurs.tel || '').replace(/\s/g, '');
  const satir = (ikon, metin, ek, ton = '') => `<span class="hs-ik ${ton}">${ik(ikon)}</span><span class="hs-metin">${metin}${ek ? `<small>${ek}</small>` : ''}</span>`;
  pencere({ baslik: 'Hesabım', alt: true, icerik: `<div class="hs-kim"><span class="app-profil buyuk" aria-hidden="true">${basHarf(ad)}</span><div><b>${e(ad)}</b><small>${e(S.kurs.ad)} · ${ogr ? 'Öğrenci' : ORT.yonetimModu() || u.rol === 'ortak' ? (u.rol === 'mudur' ? 'Yönetici' : 'Ortak · yalnız görüntüler') : ROL_AD[u.rol]}</small></div></div>
    <div class="hs-liste">${ogr ? `<button type="button" data-ogr-sifre>${satir('kilit', 'Şifremi değiştir')}${ik('sag')}</button><button type="button" data-ogr-eposta>${satir('mesaj', B.ogrenciEposta() ? 'E-postamı değiştir' : 'E-postamı ekle', B.ogrenciEposta() ? e(B.ogrenciEposta()) : 'E-postanla da girersin; şifreni e-postayla yenilersin')}${ik('sag')}</button>` : ''}
      ${tel && !ORT.yonetimModu() && u.rol !== 'ortak' ? `<a href="tel:${e(tel)}">${satir('tel', 'Kursu ara', e(S.kurs.tel))}${ik('sag')}</a>` : ''}
      ${!ogr && !ORT.yonetimModu() && ['mudur', 'sekreter'].includes(u.rol) ? `<a href="#/genel" data-kapat>${satir('genel', 'Kurs ekranı', 'Müdür ve ön büro paneli')}${ik('sag')}</a><a href="#/egitmen" data-kapat>${satir('kursiyer', 'Öğretmen ekranı', 'Usta öğreticinin telefonda gördüğü; öğretmen seçilir')}${ik('sag')}</a><a href="#/ogrenci" data-kapat>${satir('tel', 'Öğrenci ekranı', 'Öğrencinin telefonda gördüğü; öğrenci seçilir')}${ik('sag')}</a>` : ''}
      ${!ogr && u.bulut && (u.kurslar || []).length > 1 ? `<button type="button" data-kurs-degistir>${satir('kursiyer', 'Kurs değiştir', (u.kurslar.length) + ' kursta hesabınız var')}${ik('sag')}</button>` : ''}
      ${!ogr && ['mudur', 'sekreter'].includes(u.rol) && !ORT.yonetimModu() ? `<button type="button" data-tercih>${satir('ayar', 'Görünüm ve tercihler', 'Yazı boyu, tema, liste, süzgeç, sekme')}${ik('sag')}</button>` : ''}
      ${!ogr && u.rol !== 'usta' && !ORT.yonetimModu() ? `<button type="button" data-nasil>${satir('belge', 'Nasıl yapılır?', 'Sık işlerin adım adım anlatımı')}${ik('sag')}</button>` : ''}
      ${!ogr && u.rol !== 'usta' ? `<a href="yardimci/" target="_blank" rel="noopener">${satir('indir', 'MEBBİS Yardımcısı’nı kur', 'En güncel sürüm ve kurulum adımları · mdsinyal.com/yardimci')}${ik('sag')}</a>` : ''}
      ${ORT.yonetimModu() && u.rol === 'mudur' ? `<button type="button" data-yn-hesaplar>${satir('kilit', 'Hesaplar', 'Kurs hesapları, kullanıcılar, şifre yenileme')}${ik('sag')}</button>` : ''}
      ${!ogr && !ORT.yonetimModu() && u.rol !== 'ortak' ? `<button type="button" data-destek>${satir('mesaj', 'mdSinyal Destek', 'Sorun, soru ya da istek bildir')}${ik('sag')}</button>` : ''}
      <button type="button" data-sg-denetle>${satir('sifirla', 'Uygulama sürümü', `<span data-sg-metin>${e(GU.kisaMetin())}</span>`)}${ik('sag')}</button></div>
    <div class="hs-liste"><button type="button" class="hs-cikis" ${ogr ? 'data-ogr-cikis' : 'data-cikis'}>${satir('cikis', u.bulut || ogr ? 'Çıkış yap' : 'Kullanıcı değiştir', '', 'kirmizi')}</button></div>` });
}
// Kurs personeli mdSinyal'e destek talebi açar: talep kursun verisine yazılır, Servet mdSinyal Yönetim › Destek'te görür ve cevaplar
const DESTEK_TUR = ['Hata', 'Öneri', 'Soru', 'İstek', 'Eğitim'];   // DIG-030: öneri ayrı tür; öncelik (Normal / Acil) talepte
export function destekPenceresi(hazirMetin = '') {
  const u = oturum.kullanici, yazar = !!u.bulut && ['mudur', 'sekreter'].includes(u.rol), c = S.destekCevap || {};
  const l = (S.destek || []).slice().sort((a, b) => String(b.zaman).localeCompare(String(a.zaman)));
  const wa = 'https://wa.me/' + SH.DESTEK_TEL + '?text=' + encodeURIComponent('Merhaba, ' + (S.kurs.ad || 'kursumuz') + ' için mdSinyal desteği rica ediyorum.');
  pencere({ baslik: 'mdSinyal Destek', alt: true, icerik: `${yazar ? `<form id="f-destek" class="og-giris-form yn-form">
      <div class="sh-durum-sec ds-tur" role="radiogroup">${DESTEK_TUR.map((t, i) => `<button type="button" role="radio" aria-checked="${!i}" class="${!i ? 'secili' : ''}" data-ds-tur="${t}">${t}</button>`).join('')}</div>
      <label class="og-alan" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="acil" style="width:18px;height:18px"> Acil: işimi durduruyor</label>
      <label class="og-alan"><span class="og-alan-et">Ne oldu, ne istiyorsun?</span><span class="og-girdi yn-alan-uzun"><textarea name="metin" rows="4" required placeholder="Örn. Taksit ekranında ödeme kaydedilmiyor"></textarea></span></label></form>`
      : `<p class="ekran-notu" style="margin:0 0 12px">${ik('uyari')}<span>Talebi kurs müdürü ya da ön büro açar. Acil bir durum için destek hattına WhatsApp’tan yazabilirsin.</span></p>`}
    <a class="ds-wa" target="_blank" rel="noopener" href="${wa}">${ik('wp')}<span>WhatsApp destek hattı<small>${DESTEK.telGoster} · ${DESTEK.saat.toLocaleLowerCase('tr')}</small></span></a>
    <p class="ds-saat">Talepler ve WhatsApp mesajları ${DESTEK.saat.toLocaleLowerCase('tr')} arası cevaplanır. E-posta: <a href="mailto:${DESTEK.eposta}">${DESTEK.eposta}</a></p>
    ${l.length ? `<h3 class="krsd-bas">Talepleriniz</h3><div class="ds-liste">${l.map(t => { const x = c[t.id] || {}, d = x.durum || 'Açık';
      return `<div class="ds-talep"><div><b>${t.oncelik === 'Acil' ? '<span style="color:var(--kirmizi)">Acil · </span>' : ''}${e(t.tur)} · ${e(String(t.metin).slice(0, 80))}</b><small>${e(t.kim || '')} · ${e(new Date(t.zaman).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }))}</small>${x.cevap ? `<p class="ds-cevap">${ik('mesaj')}<span><b>mdSinyal:</b> ${e(x.cevap)}</span></p>` : ''}</div><em class="ds-durum ${d === 'Çözüldü' ? 'ok' : d === 'İnceleniyor' ? 'bak' : ''}">${e(d)}</em></div>`; }).join('')}</div>` : ''}`,
    altlik: yazar ? `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-destek">Gönder</button>` : '<button class="dg dg-ana" data-kapat>Tamam</button>',
    onAc: p => { if (hazirMetin) { const ta = p.querySelector('textarea[name=metin]'); if (ta) ta.value = hazirMetin; }
      if (!yazar) return;
      let tur = DESTEK_TUR[0];
      p.querySelectorAll('[data-ds-tur]').forEach(b => b.addEventListener('click', () => { tur = b.dataset.dsTur; p.querySelectorAll('[data-ds-tur]').forEach(x => { x.classList.toggle('secili', x === b); x.setAttribute('aria-checked', x === b); }); }));
      p.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const m = ev.target.metin.value.trim(); if (m.length < 3) return bildir('Kısaca ne olduğunu yaz', 'uyari');
        (S.destek = S.destek || []).push({ id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), zaman: new Date().toISOString(), kim: u.ad, rol: u.rol, tur, oncelik: ev.target.acil.checked ? 'Acil' : 'Normal', metin: m.slice(0, 2000) });
        islem('mdSinyal Destek talebi açtı', tur); kaydet(); kapatPencere(); bildir('Talebin mdSinyal’e iletildi; cevap buraya gelecek (' + DESTEK.saat.toLocaleLowerCase('tr') + ')'); });
    } });
}
// YON-018: ön büro yetkisi başka cihazdan değişince menü yeniden çizilsin
let bilgiSoruldu = false, ipDenetlendi = false, devirBakildi = false, epostaTemizlendi = false, talepBakildi = false, talepSayi = 0;
const yetkiImza = () => JSON.stringify((S.kurs || {}).yetki || null) + '|' + ((oturum.kullanici || {}).rol || '');
let sonYetki = '';
function iskelet() {
  sonYetki = yetkiImza(); kurallariHazirla(); zamanlayiciBaslat(); Y5.temaUygula();
  { const ks = kullaniciSubesi(); if (ks && gorunum.sube !== ks) subeSec(ks); }  // PAR-040: şubeye kısıtlı kullanıcı
  const say = sayaclar();
  // az kullanılanlar ("Diğer") kapalı bir grupta durur; içindeki sayfa açıkken grup açık gelir
  const satir = ([k, t, i]) => `<a href="#/${k}" data-menu="${k}"><span class="ok" aria-hidden="true">${i}</span><span>${t}</span>${say[k] && say[k][0] ? `<b class="${say[k][1] ? '' : 'uyar'}">${say[k][0]}</b>` : ''}</a>`;
  const kurAcik = izinli('kurulum') && oturum.kullanici.rol === 'mudur' && S._bulut && !Y5.kurulumDurumu().bitti;  // YON-075: kurulum bitene kadar üstte
  const menu = MENU.map(([g, l]) => [g, g === 'Bugün' && kurAcik ? [...l, ['kurulum', 'Kurulum', '→']] : g === 'Diğer' && kurAcik ? l.filter(([k]) => k !== 'kurulum') : l]).map(([g, l]) => [g, l.filter(([k]) => izinli(k))]).filter(([, l]) => l.length).map(([g, l]) => g === 'Diğer' ? `<details class="yan-grup" ${l.some(([k]) => location.hash.startsWith('#/' + k)) ? 'open' : ''}><summary class="yan-baslik">${g}</summary>${l.map(satir).join('')}</details>` : `<div class="yan-baslik">${g}</div>` + l.map(satir).join('')).join('');
  document.getElementById('uyg').innerHTML = `
  <div class="uyg">
    <aside class="yan" id="yan" aria-label="Ana menü"><div class="yan-levha">
      <a class="logo" href="#/genel" aria-label="mdSinyal ana sayfa"><svg class="logo-isaret" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="#141e33"/><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><g fill="none" stroke="#ffc21a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l12 12-12 12" stroke-opacity=".38"/><path d="M33 20l12 12-12 12"/></g></svg><span><b><span class="mk">md</span>Sinyal</b><small>${e(S.kurs.ad)}</small></span></a>
      <nav>${menu}</nav>
      ${(S.subeler || []).length > 1 && oturum.kullanici.rol !== 'usta' ? `<label class="sube-yan"><span>Şube</span><select data-sube aria-label="Şube" ${kullaniciSubesi() ? 'disabled title="Hesabınız bu şubeyle sınırlı"' : ''}>${['', ...S.subeler.map(x => x.id)].map(id => `<option value="${id}" ${gorunum.sube === id ? 'selected' : ''}>${id ? e(S.subeler.find(x => x.id === id).ad) : 'Tüm şubeler'}</option>`).join('')}</select></label>` : ''}
      <div class="yan-alt"><b>${e(oturum.kullanici.ad)}</b><span>${ROL_AD[oturum.kullanici.rol]}</span>${S.kurs.demoNumara ? `<span style="display:block;margin-top:4px;font-size:12px;opacity:.85">Mesajlar → ${e(S.kurs.demoNumara)}</span>` : ''}<button class="dg dg-cizgi dg-kucuk" style="margin-top:8px;width:100%;background:transparent;color:#fff;border-color:#fff" data-cikis>${oturum.kullanici.bulut ? 'Çıkış yap' : 'Kullanıcı değiştir'}</button></div>
    </div></aside>
    <div class="ana">
      ${oturum.kullanici.rol === 'usta' ? `${(() => { const eg = S.egitmenler.find(x => x.id === oturum.kullanici.usta); return OXU.ustCubuk({ logo: APP_LOGO, kurs: S.kurs.ad, ad: (eg && eg.ad) || oturum.kullanici.ad, foto: eg && eg.foto }); })()}<header class="app-ust">${APP_LOGO}<span class="app-ust-ad"><b>${e(S.kurs.ad)}</b>${oturum.kullanici.bulut ? '<span id="bulut-durum" class="bulut-durum" role="status"></span>' : '<small>Öğretmen</small>'}</span><h1 id="ust-baslik" class="gizli-et">Öğretmen ekranı</h1><small id="ust-alt" hidden></small><button type="button" class="app-profil" data-hesap aria-label="Hesabım: ${e(oturum.kullanici.ad)}">${basHarf(oturum.kullanici.ad)}</button></header>` : `<header class="ust">
        <button class="dg-ikon mobil-ust-sol" data-yan aria-label="Menüyü aç">${ik('menu')}</button>
        <div class="ust-baslik"><small id="ust-alt">${bugunMetni()}</small>${oturum.kullanici.bulut ? '<span id="bulut-durum" class="bulut-durum" role="status"></span>' : ''}<h1 id="ust-baslik">Genel bakış</h1></div>
        <a class="dg dg-hafif portal-geri" href="#/genel">← Panele dön</a>
        ${(S.subeler || []).length > 1 && oturum.kullanici.rol !== 'usta' ? `<label class="sube-sec"><span class="gizli-et">Şube</span><select data-sube aria-label="Şube" ${kullaniciSubesi() ? 'disabled title="Hesabınız bu şubeyle sınırlı"' : ''}>${['', ...S.subeler.map(x => x.id)].map(id => `<option value="${id}" ${gorunum.sube === id ? 'selected' : ''}>${id ? e(S.subeler.find(x => x.id === id).ad) : 'Tüm şubeler'}</option>`).join('')}</select></label>` : ''}
        <button class="arama" data-ara aria-label="Ara">${ik('ara')}<span>Kursiyer, aday, plaka ara</span><kbd>⌘K</kbd></button>
        ${oturum.kullanici.rol !== 'usta' && izinli('mevzuat') ? `<a class="asistan-dugme" href="#/mevzuat" title="Mevzuat asistanı: yönetmelik ve MEB yazılarından dayanaklı cevap" aria-label="Mevzuat asistanına sor">${ik('robot')}<span>Asistana sor</span></a>` : ''}
        ${!['usta', 'teorik', 'muhasebe'].includes(oturum.kullanici.rol) ? `<button class="yeni-dugme" data-yeni-menu aria-label="Yeni ekle">${ik('arti')}<span>Yeni</span></button>` : ''}
        <button class="kullanici-cip" data-hesap title="Hesabım: ekranlar ve çıkış" aria-label="${e(oturum.kullanici.ad)} · ${ROL_AD[oturum.kullanici.rol]} · hesap menüsü"><i class="kc-bas" aria-hidden="true">${basHarf(oturum.kullanici.ad)}</i><b>${e(oturum.kullanici.ad)}</b><small>${ROL_AD[oturum.kullanici.rol]}</small></button>
      </header>`}
      ${oturum.kullanici.ziyaretci ? `<div class="ziyaretci-serit"><span><b>Demo görünümü</b> · örnek verilerle. Mesajlar kimseye gitmez, ekranda gösterilir.</span><span class="zs-dugmeler"><button data-soru-ornek title="DIG-029: onay bekleyen yeni soru bankası örneği">Yeni soru örneği (100)</button><button data-cikis>Çık</button></span></div>` : ''}
      <main class="icerik" id="icerik"></main>
    </div>
  </div>
  <nav class="alt-menu" aria-label="Hızlı menü">
    <a href="#/genel" data-menu="genel">${ik('genel')}Bugün</a>
    ${izinli('kursiyerler') ? `<a href="#/kursiyerler" data-menu="kursiyerler">${ik('kursiyer')}Kursiyer</a>` : ''}
    ${!['usta', 'teorik', 'muhasebe'].includes(oturum.kullanici.rol) ? `<button class="alt-yeni" data-yeni-menu aria-label="Yeni ekle"><span>${ik('arti')}</span>Yeni</button>` : ''}
    ${izinli('plan') ? `<a href="#/plan" data-menu="plan">${ik('direksiyon')}Plan</a>` : ''}
    ${izinli('kasa') ? `<a href="#/kasa" data-menu="kasa">${ik('kasa')}Kasa</a>` : ''}
  </nav>`;
}

// Kursiyerin açtığı imza linki: girişsiz, uygulama kabuğu olmadan
// Tanıtım sitesinden gelen giriş linkleri (giris/ sayfası, alt bilgi): #/giris kurs ekibi, #/ogretmen-giris öğretmen, #/demo demo
const GIRIS_YOL = { '#/giris': 'pin', '#/ogretmen-giris': 'ogretmen' };
const imzaLinki = () => location.hash.startsWith('#/imza/') ? location.hash.slice(7) : null;
function imzaSayfasiAc() { IM.imzaSayfasi(document.getElementById('uyg'), imzaLinki()); }
function rota() {
  const h = (location.hash || '#/genel').slice(2).split('/');
  h[0] = h[0].split('?')[0];  // #/mevzuat?q=… gibi sorgu ekli rotalar
  // eski adresler Raporlar merkezine (RAP-009): #/analiz/<alt> → #/raporlar/<alt>, #/karlilik → #/raporlar/karlilik
  if (h[0] === 'analiz' || h[0] === 'karlilik') { const y = h[0] === 'karlilik' ? 'karlilik' : (h[1] || 'ogrenci'); history.replaceState(null, '', '#/raporlar/' + y); return { ad: 'raporlar', id: y }; }
  return { ad: SAYFALAR[h[0]] ? h[0] : 'genel', id: h[1] ? decodeURIComponent(h[1]) : null };
}

export function yenile(kaydirma = false) {
  if (location.hash.startsWith('#/kapi')) return kapiEkrani();
  if (imzaLinki()) return imzaSayfasiAc();
  if (oturum.kullanici && oturum.kullanici.rol === 'ogrenci') return ogrenciCiz(kaydirma);
  if (!oturum.kullanici) { if (location.hash.startsWith('#/imza-geldi/')) try { sessionStorage.setItem('sinyal-bekleyen', location.hash); } catch (x) { } if (document.querySelector('.giris')) return; return girisEkrani(location.hash.startsWith('#/imza-geldi/') ? 'pin' : 'tanitim'); }
  // mdSinyal Yönetim hesabı: kurs ekranları yok, yalnız gelir paylaşımı (yönetici girer, ortak görür)
  if (oturum.kullanici.bulut && (ORT.yonetimModu() || oturum.kullanici.rol === 'ortak')) return yonetimCiz(kaydirma);
  { const ks = kullaniciSubesi(); if (ks && gorunum.sube !== ks) subeSec(ks); }  // PAR-040: şubeye kısıtlı kullanıcı her çizimde kendi şubesinde kalır
  if (location.hash === '#/yonetim-kur' && oturum.kullanici.bulut && oturum.kullanici.rol === 'mudur') return yonetimKurCiz();
  // başka cihazdan eksik alanla gelen sınav kaydı sayfaları çökertmesin
  (S.sinavlar || []).forEach(x => { if (!x.sonuc || typeof x.sonuc !== 'object') x.sonuc = {}; if (!Array.isArray(x.kursiyerler)) x.kursiyerler = []; });
  if (!document.getElementById('icerik') || yetkiImza() !== sonYetki) iskelet();
  let r = rota();
  // YON-063: sekme hatırlama — menüden sekmesiz gelince en son sekme
  if (TC.SEKMELI.includes(r.ad)) { if (r.id == null) { const son = TC.sekmeOku(r.ad); if (son && son.startsWith('#/' + r.ad + '/')) { history.replaceState(null, '', son); r = rota(); } } else TC.sekmeYaz(r.ad, location.hash); }
  kurulumAkisi();
  if (!izinli(r.ad)) { if (oturum.kullanici.rol === 'sekreter' && SAYFALAR[r.ad]) bildir(ekranYetkili(r.ad) ? 'Bu ekran yalnız kurs müdürüne açık' : 'Bu ekran ön büroya kapalı; müdür Ayarlar › Kullanıcılar › Ön büro yetkileri’nden açabilir', 'uyari'); location.hash = anaSayfa(); return; }
  const yer = document.getElementById('icerik');
  if (!yer) return;
  const portal = r.ad === 'egitmen' || r.ad === 'ogrenci' || r.ad === 'kayit';
  document.body.classList.toggle('portal-modu', portal);
  document.body.classList.toggle('usta-modu', oturum.kullanici.rol === 'usta');
  // yeni tasarım sınıfları yalnız öğrenci ve öğretmen ekranında; kurs ekranlarına sızmasın
  if (!['ogrenci', 'usta'].includes(oturum.kullanici.rol)) document.body.classList.remove('ox-modu', 'ox-tam-acik', 'ox-akis-acik');
  temaRengi(portal && oturum.kullanici.rol === 'usta');
  let s;
  try { s = SAYFALAR[r.ad](r.id); }
  catch (x) { console.error(x); s = { baslik: 'Bir şeyler ters gitti', html: '<div class="kart"><div class="bos"><b>Bu sayfa açılamadı</b><p>Sayfayı yenileyip tekrar deneyin. Sorun sürerse destek hattına yazın.</p><a class="dg dg-koyu" href="#/genel">Genel bakışa dön</a></div></div>' }; }
  document.getElementById('ust-baslik').textContent = s.baslik;
  document.getElementById('ust-alt').textContent = s.alt || bugunMetni();
  document.title = sadeDil(s.baslik) + ' · mdSinyal';
  const kap = document.createElement('div');
  kap.className = 'sayfa sayfa-' + r.ad;
  kap.innerHTML = s.html;
  yer.replaceChildren(kap);
  if (ekranDuzey(ustEkran(r.ad)) === 'gor') saltOkunur(kap);
  kurulumSeridi(kap); epostaSeridi(kap); talepSeridi(kap, r.ad);
  // YON-074: onaylanmış numara devirleri (bu kurs eski kurssa) ofis cihazında işlenir; oturum başına ve 10 dakikada bir
  if (!devirBakildi && oturum.kullanici.bulut && ['mudur', 'sekreter'].includes(oturum.kullanici.rol)) { devirBakildi = true; const bak = () => B.devirleriIsle().then(n => { if (n) { bildir(n + ' öğrencinin numarası onayıyla başka kursa devredildi; hesapları kapandı'); yenile(); } }).catch(() => { }); setTimeout(bak, 6000); setInterval(bak, 600000); }
  // UYG-021: kurs koduyla açılan öğrenci hesapları onay bekliyorsa ofis görür (oturum başına ve 5 dakikada bir sayılır)
  if (!talepBakildi && oturum.kullanici.bulut && ['mudur', 'sekreter', 'subemudur'].includes(oturum.kullanici.rol)) { talepBakildi = true; const say = () => import('./hesaptalep.js?v=234').then(HT => HT.talepSay()).then(n => { if (n !== talepSayi) { talepSayi = n; if (['genel', 'kursiyerler'].includes(rota().ad) && !document.querySelector('.perde')) yenile(); } }).catch(() => { }); setTimeout(say, 4000); setInterval(say, 300000); }
  // YON-002 göçü: eski sürümün telefon eşlemesine yazdığı gerçek e-postalar bir kez silinir (cihaz ve kurs başına; tekrar zararsız)
  if (!epostaTemizlendi && oturum.kullanici.bulut && ['mudur', 'sekreter', 'subemudur'].includes(oturum.kullanici.rol)) { epostaTemizlendi = true; setTimeout(() => B.telEslemeleriTemizle().catch(() => { }), 9000); }
  // YON-021: ön büro IP yetkilendirmesi (oturum başına bir kez); izin yoksa içerik kapanır, yalnız çıkış
  if (!ipDenetlendi && oturum.kullanici.bulut && oturum.kullanici.rol === 'sekreter') { ipDenetlendi = true; import('./ipliste.js?v=234').then(m => m.ipDenetle()).then(d => { if (d.izin) return; islem('İzinsiz IP’den giriş denedi', d.ip); kaydet(); document.getElementById('icerik') && document.getElementById('icerik').replaceChildren();
    const girise = () => B.cikisYap().then(() => { try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } location.hash = '#/giris'; location.reload(); });
    setTimeout(() => { const bak = setInterval(() => { if (!document.querySelector('.perde')) { clearInterval(bak); girise(); } }, 500); }, 1500);
    pencere({ baslik: 'Bu bilgisayardan girişe izin yok', korumali: true, icerik: `<p style="font-size:14.5px">Kurs müdürü ön büro girişini belirli internet adreslerine bağlamış. Bu bilgisayarın adresi (<b class="mono">${e(d.ip)}</b>) listede yok.</p><p style="font-size:13.5px;color:var(--soluk);margin-top:8px">Kurs bilgisayarından girin ya da kurs müdüründen bu adresi Ayarlar › Güvenlik › IP yetkilendirme’ye eklemesini isteyin.</p>`, altlik: '<button class="dg dg-ana" data-ip-cik>Çıkış yap</button>', onAc(p) { p.querySelector('[data-ip-cik]').addEventListener('click', girise); } }); }); }
  // YON-028: açık onaylı bilgilendirmeler; oturum başına bir kez, sayfa oturduktan sonra (başka pencere açıksa sonraki girişe)
  if (!bilgiSoruldu && oturum.kullanici.bulut && ['mudur', 'sekreter'].includes(oturum.kullanici.rol)) { bilgiSoruldu = true; const dene = n => { if (document.querySelector('.perde')) { if (n < 40) setTimeout(() => dene(n + 1), 3000); return; } import('./onay.js?v=234').then(m => m.bilgiGoster()); }; setTimeout(() => dene(0), 1500); }  // başka pencere açıksa kapanınca (en çok 2 dk)
  if (s.baglan) { try { s.baglan(kap); } catch (x) { console.error(x); } }
  if (r.ad === 'genel' || r.ad === 'adaylar') B.onKayitlariAl().then(n => { if (n) { bildir(`Web sitesinden ${n} ön kayıt geldi; Yeni öğrenciler’de`); if (location.hash.startsWith('#/adaylar')) yenile(); } });   // DIG-035
  if (r.ad === 'genel') { GU.anaEkranaEkle(kap); duyuruAlani(kap); }  // kurulu sürüm, “Güncellemeleri denetle”, yeni sürüm kartı; DIG-040 duyurular
  kap.querySelectorAll('.sekmeler').forEach(sk => { const sec = sk.querySelector('.secili'); if (sec && sk.scrollWidth > sk.clientWidth) sk.scrollLeft = Math.max(0, sec.offsetLeft - sk.offsetLeft - 24); });
  const menuAd = ustEkran(r.ad);
  document.querySelectorAll('[data-menu]').forEach(a => a.classList.toggle('secili', a.dataset.menu === menuAd));
  const say = sayaclar();
  document.querySelectorAll('.yan [data-menu]').forEach(a => {
    const k = a.dataset.menu; let b = a.querySelector('b');
    if (say[k] && say[k][0]) { if (!b) { b = document.createElement('b'); a.appendChild(b); } b.textContent = say[k][0]; b.className = say[k][1] ? '' : 'uyar'; }
    else if (b) b.remove();
  });
  if (kaydirma) window.scrollTo(0, 0);
}

// YON-018: ön büroya “yalnız görür” verilen ekran: liste, sekme, süzgeç, dışa aktarma ve çıktı açık; ekleme, düzenleme, silme düğmeleri ve kaydeden alanlar çalışmaz
const SALT_SERBEST = 'a[href], summary, [role=tab], .sekmeler button, .vr-suzgec *, [aria-pressed], [data-gun], [data-gorunum], [data-donem], [data-borclu], [data-bekleyen], [data-disa], [data-belge], [data-gr-suz], [data-liste], [data-sohbet-geri], [data-salt-serbest]';
function saltOkunur(kap) {
  kap.classList.add('salt-okunur');
  kap.insertAdjacentHTML('afterbegin', `<p class="ipucu salt-okunur-serit" role="note">${ik('kilit')}<span>Bu ekranda <b>yalnız görme</b> yetkiniz var: kayıt ekleyemez, değiştiremez, silemezsiniz. Yetkiyi kurs müdürü verir.</span></p>`);
  const dur = ev => { ev.preventDefault(); ev.stopImmediatePropagation(); bildir('Bu ekranda yalnız görme yetkiniz var', 'uyari'); };
  kap.addEventListener('click', ev => { const t = ev.target; if (!(t instanceof Element) || t.closest(SALT_SERBEST)) return; if (t.closest('button, [role=button], input[type=checkbox], input[type=radio], input[type=file]')) dur(ev); }, true);
  kap.addEventListener('change', ev => { const t = ev.target; if (t instanceof Element && (t.type === 'search' || t.closest(SALT_SERBEST))) return; dur(ev); }, true);
  ['submit', 'dragstart', 'drop'].forEach(tur => kap.addEventListener(tur, dur, true));
}

function rolSec(r) {
  rol = r;
  try { localStorage.setItem('sinyal-rol', r); } catch (x) { }
  document.querySelectorAll('[data-rol]').forEach(b => b.classList.toggle('secili', b.dataset.rol === r));
  location.hash = r === 'yonetici' ? '#/genel' : r === 'egitmen' ? '#/egitmen' : '#/ogrenci';
}

function aramaAc() {
  if (!oturum.kullanici || oturum.kullanici.rol === 'usta') return;
  const kayitlar = [
    ...S.kursiyerler.map(k => ({ t: tamAd(k), a: 'Kursiyer · ' + sinifEtiket(k.sinif, k) + ' · ' + k.tel, h: '#/kursiyer/' + k.id, g: 'Kursiyerler' })),
    ...S.adaylar.map(a => ({ t: a.ad, a: 'Aday · ' + a.asama, h: '#/adaylar/' + a.id, g: 'Adaylar' })),
    ...S.araclar.map(a => ({ t: a.plaka, a: a.model, h: '#/filo', g: 'Araçlar' })),
    ...S.egitmenler.map(x => ({ t: x.ad, a: 'Usta öğretici', h: '#/filo', g: 'Usta öğreticiler' })),
    ...MENU.flatMap(([, l]) => l.filter(([k]) => izinli(k)).map(([k, t]) => ({ t, a: 'Sayfa', h: '#/' + k, g: 'Sayfalar' }))),
    ...OZELLIKLER.filter(([, h]) => izinli(h.slice(2).split('/')[0])).map(([t, h, ara]) => ({ t, a: ara, h, g: 'Özellikler' })),
  ];
  pencere({
    baslik: 'Ara', icerik: `<div class="komut"><input type="search" placeholder="Ad, telefon, plaka ya da sayfa yazın" aria-label="Ara"><ul></ul></div>`,
    onAc: d => {
      d.querySelector('.pencere').classList.add('komut-pencere');
      d.querySelector('.pencere-govde').style.padding = '0';
      const inp = d.querySelector('input'), ul = d.querySelector('ul');
      const ciz = () => {
        const q = inp.value.trim().toLocaleLowerCase('tr');
        const sonuc = (q ? kayitlar.filter(k => (k.t + ' ' + k.a).toLocaleLowerCase('tr').includes(q)) : kayitlar.filter(k => k.g === 'Sayfalar')).slice(0, 14);
        const ham = inp.value.trim().slice(0, 300);
        // soru gibi yazılanlar (soru işareti, soru sözü ya da 4+ kelime) mevzuat asistanına gider ve ilk öneri olur
        if (ham.length >= 2 && izinli('mevzuat')) {
          const soru = /\?|(^|\s)(nasıl|kaç|neden|niye|ne zaman|hangi|kim|mi|mı|mu|mü|zorunlu|gerekir|lazım)(\s|$)/i.test(ham) || ham.split(/\s+/).length >= 4;
          const x = { t: 'Asistana sor: ' + ham, a: 'Mevzuat asistanı · yönetmelik ve MEB yazılarından dayanaklı cevap', h: '#/mevzuat?q=' + encodeURIComponent(ham), g: 'Mevzuat asistanı' };
          if (soru) sonuc.unshift(x); else sonuc.push(x);
        }
        let g = '';
        ul.innerHTML = sonuc.length ? sonuc.map((k, i) => (k.g !== g ? `<li class="grup">${(g = k.g)}</li>` : '') + `<li><a href="${k.h}" class="${i === 0 ? 'odak' : ''}"><b>${e(k.t)}</b><small>${e(k.a)}</small></a></li>`).join('') : '<li class="grup">Sonuç yok</li>';
      };
      inp.addEventListener('input', ciz);
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { const a = ul.querySelector('a.odak'); if (a) { location.hash = a.getAttribute('href'); kapatPencere(); } } });
      ul.addEventListener('click', ev => { if (ev.target.closest('a')) kapatPencere(); });
      ciz();
    },
  });
}

function yanAcKapa(ac) {
  const y = document.getElementById('yan');
  y.classList.toggle('acik', ac);
  let p = document.querySelector('.yan-perde');
  if (ac && !p) { p = document.createElement('div'); p.className = 'yan-perde'; p.onclick = () => yanAcKapa(false); document.body.appendChild(p); }
  if (!ac && p) p.remove();
}

document.addEventListener('click', ev => {
  const t = ev.target;
  if (t.closest('[data-ara]')) return aramaAc();
  if (t.closest('[data-yan]')) return yanAcKapa(!document.getElementById('yan').classList.contains('acik'));
  if (t.closest('.yan a') || t.closest('.yan-rol')) yanAcKapa(false);
});
document.addEventListener('keydown', ev => { if ((ev.metaKey || ev.ctrlKey) && (ev.key || "").toLowerCase() === "k") { ev.preventDefault(); aramaAc(); } if ((ev.key || "").toLowerCase() === "n" && !ev.metaKey && !ev.ctrlKey && !ev.altKey && oturum.kullanici && !document.querySelector('.perde') && !ev.target.closest('input, textarea, select, [contenteditable]')) { ev.preventDefault(); yeniMenu(); } });
document.addEventListener('click', ev => { if (ev.target.closest('[data-yeni-menu]')) yeniMenu(); });
// Kurulum akışı: Kurulum sayfasından bir adıma gidilince o adım tamamlanınca sıradaki eksik adım kendiliğinden açılır.
// Kullanıcı adımın ekranından başka yere giderse akış biter; Kurulum sayfasından yeniden başlar.
const AKIS = 'sinyal-kurulum-akis';
document.addEventListener('click', ev => { const a = ev.target.closest('[data-kurulum-adim]'); if (a) try { sessionStorage.setItem(AKIS, a.dataset.kurulumAdim); } catch (x) { } });
// YON-075: ana sayfa kartı ve Kurulum sayfasındaki 'Devam et'; adım ekranındaki şeritte 'Atla, sonra yap' ve 'Kurulumdan çık'
document.addEventListener('click', ev => {
  const d = ev.target.closest('[data-kur-devam]'); if (d) return Y5.kurulumBaslat(+d.dataset.kurDevam);
  const at = ev.target.closest('[data-kur-serit-atla]'); if (at) { Y5.kurulumAtla(at.dataset.kurSeritAtla); return kurulumAkisi(true); }
  if (ev.target.closest('[data-kur-serit-cik]')) { try { sessionStorage.removeItem(AKIS); } catch (x) { } ev.target.closest('.kur-serit').remove(); }
});
// YON-068: hesabın e-postası doğrulanmadıysa ofis ekranlarının üstünde şerit (yeniden gönder · doğruladım)
function epostaSeridi(kap) {
  const u = oturum.kullanici; if (!u || !u.bulut || !['mudur', 'sekreter'].includes(u.rol)) return;
  const h = B.hesapEposta(); if (!h || h.dogrulandi) return;
  kap.insertAdjacentHTML('afterbegin', `<div class="ipucu uyari eposta-serit" role="status"><span style="flex:1;min-width:0"><b>E-postanızı doğrulayın.</b> ${e(h.eposta)} adresine bir bağlantı gönderdik; bağlantıya dokununca doğrulanır. Doğrulanana kadar rapor ve yedek e-postası gitmez, Drive yedeği alınmaz. Adres yanlışsa kurs müdürüne ya da mdSinyal’e yazın.</span><span class="eposta-serit-dug"><button type="button" class="dg dg-cizgi dg-kucuk" data-ep-dog-gonder>Yeniden gönder</button><button type="button" class="dg dg-ana dg-kucuk" data-ep-dog-yenile>Doğruladım</button></span></div>`);
}
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-ep-dog-gonder]')) { const b = ev.target.closest('[data-ep-dog-gonder]'); b.disabled = true; return B.epostaDogrula().then(() => bildir('Doğrulama bağlantısı yeniden gönderildi; gelen kutusuna ve istenmeyen klasörüne bakın')).catch(x => { b.disabled = false; bildir(B.hataMetni(x), 'uyari'); }); }
  if (ev.target.closest('[data-ep-dog-yenile]')) return B.hesapEpostaYenile().then(h => { if (h && h.dogrulandi) { islem('Hesap e-postasını doğruladı', h.eposta); kaydet(); bildir('E-posta doğrulandı'); yenile(); } else bildir('Henüz doğrulanmadı; e-postadaki bağlantıya dokunun, sonra yeniden deneyin', 'uyari'); }).catch(x => bildir(B.hataMetni(x), 'uyari'));
});
// UYG-021: bekleyen öğrenci hesap istekleri (ana ekran ve öğrenciler listesi)
function talepSeridi(kap, ad) {
  const u = oturum.kullanici; if (!talepSayi || !u || !u.bulut || !['mudur', 'sekreter', 'subemudur'].includes(u.rol) || !['genel', 'kursiyerler'].includes(ad)) return;
  kap.insertAdjacentHTML('afterbegin', `<div class="ipucu talep-serit" role="status" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:0"><b>${talepSayi} öğrenci uygulama hesabı için onay bekliyor.</b> Kurs koduyla hesap açtılar; kendi kayıtlarıyla eşleştirip onaylayın.</span><button type="button" class="dg dg-ana dg-kucuk" data-talep-ac>İstekleri gör</button></div>`);
}
document.addEventListener('click', ev => { if (!ev.target.closest('[data-talep-ac]')) return; import('./hesaptalep.js?v=234').then(HT => HT.talepPenceresi(() => { talepSayi = HT.bekleyenSayi; yenile(); })); });
function kurulumSeridi(kap) {
  let i = null; try { i = sessionStorage.getItem(AKIS); } catch (x) { }
  if (i == null || !oturum.kullanici || oturum.kullanici.rol !== 'mudur') return;
  const d = Y5.kurulumDurumu(), x = d.l[+i]; if (!x || x[1] || !x[3] || !location.hash.startsWith(x[3].split('/').slice(0, 2).join('/'))) return;
  const sira = d.l.filter(y => !y[5].istege).indexOf(x) + 1;
  kap.insertAdjacentHTML('afterbegin', `<div class="kur-serit" role="region" aria-label="Kurulum"><div class="kur-serit-yazi"><small>Kurulum · adım ${sira} / ${d.top} · %${d.yuzde}</small><b>${e(x[0])}</b><span>${e(x[4])}</span></div><div class="kur-serit-dug"><button type="button" class="dg dg-cizgi dg-kucuk" data-kur-serit-atla="${e(x[5].id)}">Atla, sonra yap</button><a class="dg dg-hafif dg-kucuk" href="#/kurulum">Bütün adımlar</a><button type="button" class="dg dg-hafif dg-kucuk" data-kur-serit-cik aria-label="Kurulum şeridini kapat">${ik('kapat')}</button></div></div>`);
}
function kurulumAkisi(zorla) {
  let i = null; try { i = sessionStorage.getItem(AKIS); } catch (x) { }
  if (i == null || !oturum.kullanici || oturum.kullanici.rol !== 'mudur') return;
  const bitir = () => { try { sessionStorage.removeItem(AKIS); } catch (x) { } };
  const l = Y5.kurulumAdimlari(), adim = l[+i];
  if (!adim) return bitir();
  const kok = adim[3].split('/').slice(0, 2).join('/');
  if (!zorla && !location.hash.startsWith(kok)) return bitir();  // adımın ekranından çıkıldı
  if (!adim[1]) return;  // adım henüz tamamlanmadı (atlanan adım x[1] sayılır)
  const git = x => !x[1] && !!x[3];  // adresi olmayan adım (MEBBİS Yardımcısı: kurulum penceresi) akışta atlanır, Kurulum sayfasından yapılır
  const n = l.findIndex((x, j) => j > +i && git(x)), sonraki = n >= 0 ? n : l.findIndex(git);
  if (sonraki < 0) { bitir(); if (l.some(x => !x[1])) bildir('Adımlar bitti; MEBBİS Yardımcısı’nı Kurulum sayfasından kurun'); setTimeout(() => { location.hash = '#/kurulum'; if (!l.some(x => !x[1])) setTimeout(() => Y5.kurulumRaporu(true), 400); }, 900); return; }  // YON-075: bitince rapor
  try { sessionStorage.setItem(AKIS, String(sonraki)); } catch (x) { }
  bildir(adim[0] + (adim[5] && adim[5].atlandi ? ' atlandı' : ' tamam') + ' · sıradaki: ' + l[sonraki][0]);
  setTimeout(() => { if (location.hash === l[sonraki][3]) yenile(true); else location.hash = l[sonraki][3]; }, 900);
}
document.addEventListener('change', ev => { const s = ev.target.closest('[data-sube]'); if (!s) return; if (kullaniciSubesi()) { s.value = kullaniciSubesi(); return bildir('Hesabınız bu şubeyle sınırlı', 'uyari'); } subeSec(s.value); document.querySelectorAll('[data-sube]').forEach(x => { x.value = s.value; }); bildir(s.value ? S.subeler.find(x => x.id === s.value).ad + ' gösteriliyor' : 'Tüm şubeler gösteriliyor'); yenile(); });
Y5.temaUygula();

let sonAd = null;
// DIG-055: sayfadaki kaydet düğmeli formda (Ayarlar › Kurs bilgileri gibi) değişiklik varken başka sayfaya geçilirse sorulur; sayfa kapanırken de tarayıcı uyarır.
// Değişince kendiliğinden kaydedilen alanlar ve pencereler (kendi taslak kuralı var, DIG-059) bu denetime girmez.
let sayfaKirli = null, sonHash = location.hash, geriAlindi = false;
const kirliForm = () => sayfaKirli && document.contains(sayfaKirli) && !sayfaKirli.closest('.perde') ? sayfaKirli : (sayfaKirli = null);
document.addEventListener('input', ev => { if (!ev.isTrusted) return; const f = ev.target.closest && ev.target.closest('#icerik form'); if (!f || f.closest('.perde') || f.dataset.kirliDegil !== undefined || !f.querySelector('button[type=submit], button:not([type]), input[type=submit]')) return; sayfaKirli = f; }, true);
document.addEventListener('submit', ev => { if (ev.target === sayfaKirli) sayfaKirli = null; }, true);
addEventListener('beforeunload', ev => { if (kirliForm()) { ev.preventDefault(); ev.returnValue = ''; } });
window.addEventListener('hashchange', ev => {
  if (geriAlindi) { geriAlindi = false; return; }
  const yeni = location.hash;
  if (!kirliForm() || yeni === sonHash) { sonHash = yeni; return; }
  ev.stopImmediatePropagation(); geriAlindi = false; history.replaceState(history.state, '', sonHash || '#/genel');
  pencere({ baslik: 'Kaydedilmedi, çıkılsın mı?', icerik: '<p style="font-size:14px">Bu sayfada değiştirdiğiniz bilgiler henüz kaydedilmedi. Çıkarsanız değişiklikler kaybolur.</p>', taslak: false,
    altlik: '<button class="dg dg-cizgi" data-kc-cik>Kaydetmeden çık</button><button class="dg dg-ana" data-kapat>Geri dön</button>',
    onAc(p) { p.querySelector('[data-kc-cik]').addEventListener('click', () => { sayfaKirli = null; kapatPencere(); location.hash = yeni; }); } });
});
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#/kapi')) return kapiEkrani(); if (demoSoru() != null && oturum.kullanici && oturum.kullanici.ziyaretci) { location.hash = '#/mevzuat?q=' + demoSoru(); return; } if (GIRIS_YOL[location.hash] && oturum.kullanici && oturum.kullanici.ziyaretci) { oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } } if (GIRIS_YOL[location.hash] && oturum.kullanici && oturum.kullanici.bulut) { const u0 = oturum.kullanici; history.replaceState(null, '', anaSayfa(u0)); yenile(); return setTimeout(() => acikOturumSor(u0), 400); } if (!oturum.kullanici && !B.bulutKayitli()) { if (location.hash === '#/demo' || demoSoru() != null) return demoyaGir(); if (GIRIS_YOL[location.hash]) { girisEkrani(GIRIS_YOL[location.hash]); return window.scrollTo(0, 0); } } if (location.hash === '#/sahip') { ORT.sekmeSec('hesaplar'); location.hash = '#/yonetim'; return; } if (imzaLinki()) return imzaSayfasiAc(); if (!(oturum.kullanici && oturum.kullanici.bulut)) { if (yonetimKurYolu()) return yonetimHesapEkrani(yonetimKurYolu()); if (yonetimGirisYolu()) return yonetimGirisEkrani(); } if (kursDavetYolu() && !(oturum.kullanici && oturum.kullanici.bulut)) return kursDavetEkrani(); if (oturum.kullanici && oturum.kullanici.rol === 'ogrenci') return; if (ogrYolu()) return eskiLink(); if (ogrKayitYolu() != null) return ogrenciKayitEkrani(ogrKayitYolu()); if (location.hash === '#/ogrenci-giris') return ogrenciGirisEkrani((oturum.kullanici && oturum.kullanici.bulut) || B.bulutKayitli() ? 'Bu cihazda bir personel hesabı açık. Öğrenci olarak girersen o oturum kapanır.' : undefined); if (davetYolu() && !(oturum.kullanici && oturum.kullanici.bulut)) return davetEkrani(); const r = rota(); yenile(r.ad !== sonAd); sonAd = r.ad; });

// QR’dan gelen ilk sayfa index.html’de hazır durur (beklemeden görünsün); sonradan dönmek için saklanır
const TANITIM = (() => { const t = document.getElementById('tanitim'); return t ? t.outerHTML : ''; })();
// İki adımlı giriş: doğrulama uygulamasındaki 6 haneli kodu ister (pencere kapatılırsa null döner)
const kodSor = () => new Promise(coz => {
  let bitti = false;
  pencere({
    baslik: 'Doğrulama kodu',
    icerik: `<p style="font-size:14.5px">Telefonunuzdaki doğrulama uygulamasında (Google Authenticator, Microsoft Authenticator vb.) mdSinyal için görünen 6 haneli kodu girin.</p><input class="girdi" data-kod inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="Doğrulama kodu" style="font-size:22px;letter-spacing:6px;text-align:center;margin-top:12px;width:100%">`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kod-tamam>Devam</button>',
    onAc(d) {
      const i = d.querySelector('[data-kod]'); i.focus();
      const tamam = () => { const v = i.value.replace(/\D/g, ''); if (v.length !== 6) return bildir('6 haneli kodu girin', 'uyari'); bitti = true; kapatPencere(); coz(v); };
      d.querySelector('[data-kod-tamam]').addEventListener('click', tamam); i.addEventListener('keydown', ev => { if (ev.key === 'Enter') tamam(); });
      const izle = setInterval(() => { if (!d.isConnected) { clearInterval(izle); if (!bitti) coz(null); } }, 300);
    },
  });
});
// #/demo?mevzuat=<soru>: sitedeki rehberden gelen soru demoda doğrudan mevzuat asistanında açılır
const demoSoru = () => { const m = location.hash.match(/^#\/demo\?(?:.*&)?mevzuat=([^&]*)/); return m ? m[1] : null; };
function demoyaGir() {
  const soru = demoSoru();
  const u = S.kullanicilar.find(x => x.rol === 'mudur') || { id: 'u1', ad: 'Kurs müdürü' };
  oturum.kullanici = { id: u.id, ad: u.ad, rol: 'mudur', ziyaretci: true };
  try { sessionStorage.setItem('sinyal-oturum', JSON.stringify(oturum.kullanici)); } catch (x) { }
  sonHareket = Date.now(); hareketYaz(true);
  iskelet(); location.hash = soru != null ? '#/mevzuat?q=' + soru : '#/genel'; sonAd = rota().ad; yenile(true); window.scrollTo(0, 0);
}
/* ---------- öğretmen girişi (#/ogretmen-giris) ve şifre yenileme: öğrenci/öğretmen uygulamasının ox- dili; sınıflar ox-ugr- önekli ----------
   body'ye ox-modu eklenmez: ox değişkenleri kendi kabuğunda tanımlanır (imza sayfası gibi), böylece öğrenci girişine ve kurs girişine sızmaz.
   Kabuk .giris sınıfını da taşır: oturum yokken yenile() ekranda .giris varsa giriş ekranını yeniden çizmez. Giriş mantığı eski formla aynı. */
const UGR_ZARF = '<svg class="ox-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="m3.8 7.4 8.2 5.8 8.2-5.8"/></svg>';
const UGR_GOZ_KAPALI = '<svg class="ox-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.4 5.7c.5-.1 1-.2 1.6-.2 6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.5 3.3M6.7 6.8C4.1 8.5 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.4-.6 4.8-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17"/></svg>';
// Kutulu alanlar (.ox-ugr-kutu giriş ve ilk şifre, .og-girdi şifremi değiştir): çerçeve, zemin ve odak halkası yalnız dış kutuda.
// İçteki input'u genel kurallar ikinci kez çerçeveliyordu: ox pencere kuralı (ogr/ui.js "body.ox-modu .pencere input") ve
// app.css'teki [aria-invalid="true"] (!important gölge). Seçiciler bu ikisinden daha özgül tutulur.
function girdiKutuStil() {
  OXU.stilEkle('ox-girdi-kutu', `
html body :is(.ox-ugr-kutu,.og-girdi) input:not([type=checkbox]):not([type=radio]):not([type=submit]){border:0;border-radius:0;background:transparent;box-shadow:none;outline:0;-webkit-appearance:none;appearance:none}
html body :is(.ox-ugr-kutu,.og-girdi) input[aria-invalid="true"]:not([type=radio]):not([type=checkbox]){border-color:transparent!important;box-shadow:none!important}
html body :is(.ox-ugr-kutu,.og-girdi) input:not([type=checkbox]):not([type=radio]):focus-visible{outline:0}
html body.ox-modu .pencere .og-girdi{border:1px solid var(--ox-cizgi);border-radius:14px;background:var(--ox-kart,#fff);box-shadow:var(--ox-golge,none)}
html body.ox-modu .pencere .og-girdi:focus-within{border-color:var(--ox-mavi);box-shadow:0 0 0 3.5px rgba(10,102,242,.14)}
html body.ox-modu .pencere .og-girdi:focus-within>.ik{color:var(--ox-mavi)}
html body.ox-modu .pencere .og-girdi:has(input[aria-invalid="true"])>.ik{color:var(--ox-kirmizi,var(--kirmizi))}
html body .og-girdi:has(input[aria-invalid="true"]),html body.ox-modu .pencere .og-girdi:has(input[aria-invalid="true"]){border-color:var(--ox-kirmizi,var(--kirmizi));box-shadow:0 0 0 3.5px rgba(229,72,77,.12)}
`);
}
function ugrStil() {
  girdiKutuStil();
  const s = document.querySelector('style[data-ox="ox-temel"]'), m = s && /body\.ox-modu\{([^}]*)\}/.exec(s.textContent);
  const dg = m ? m[1].split(';').map(x => x.trim()).filter(x => x.startsWith('--')).join(';') : '';
  OXU.stilEkle('ox-ugr', `
.ox-ugr.giris{${dg};display:block;min-height:100vh;min-height:100dvh;padding:0;gap:0;place-items:normal;align-content:normal;position:relative;isolation:auto;background:var(--ox-zemin);color:var(--ox-metin);font-family:var(--ox-yazi);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
html body:has(.ox-ugr){background:#f7f8fa}
.ox-ugr *{box-sizing:border-box}
.ox-ugr :is(h1,h2,b,input,button,label){font-family:inherit}
.ox-ugr-ust{position:sticky;top:0;z-index:5;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;background:rgba(247,248,250,.86);-webkit-backdrop-filter:saturate(180%) blur(18px);backdrop-filter:saturate(180%) blur(18px)}
.ox-ugr-ust .ox-ust-ic{min-height:44px}
.ox.ox-ugr-govde{padding-bottom:calc(36px + env(safe-area-inset-bottom))}
.ox-ugr-sayfa .ox-sayfa-bas{margin:18px 0 24px}
.ox-ugr-sayfa .ox-geri+.ox-sayfa-bas{margin-top:4px}
.ox-ugr-sayfa .ox-sayfa-bas h1:focus{outline:0}
.ox-ugr-sayfa .ox-sayfa-bas p{font-size:15.5px;line-height:1.4}
.ox-ugr-gir{animation:oxUgrGir .26s cubic-bezier(.2,.7,.3,1)}
@keyframes oxUgrGir{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
/* alanlar: simgeli beyaz kutu, odakta mavi halka, hatada kırmızı çerçeve ve altında kısa açıklama */
.ox-ugr-form{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
.ox-ugr-gizli{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.ox-ugr-kutu{position:relative;display:flex;align-items:center;height:56px;background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:14px;box-shadow:var(--ox-golge);transition:border-color .15s,box-shadow .15s}
.ox-ugr-kutu:focus-within{border-color:var(--ox-mavi);box-shadow:0 0 0 3.5px rgba(10,102,242,.14)}
.ox-ugr-kutu>.ox-i{position:absolute;left:16px;top:50%;margin-top:-11px;color:var(--ox-soluk);pointer-events:none;transition:color .15s}
.ox-ugr-kutu:focus-within>.ox-i{color:var(--ox-mavi)}
.ox-ugr-kutu input{flex:1;min-width:0;width:0;height:100%;margin:0;border:0;border-radius:14px;background:transparent;padding:0 16px 0 50px;font-size:17px;font-weight:400;letter-spacing:-.01em;color:var(--ox-bas);outline:0;box-shadow:none;-webkit-appearance:none;appearance:none}
.ox-ugr .ox-ugr-kutu input:focus-visible{outline:0}
.ox-ugr-kutu input::placeholder{color:var(--ox-soluk);opacity:1}
.ox-ugr-kutu input:-webkit-autofill{-webkit-box-shadow:0 0 0 40px #fff inset;-webkit-text-fill-color:var(--ox-bas);caret-color:var(--ox-bas)}
.ox-ugr-kutu:has(.ox-ugr-goz) input{padding-right:4px}
.ox-ugr .ox-ugr-goz{flex:none;display:grid;place-items:center;width:52px;height:100%;border-radius:0 14px 14px 0;color:var(--ox-ikincil)}
.ox-ugr .ox-ugr-goz:focus-visible{outline-offset:-4px}
.ox-ugr-goz .ox-i+.ox-i,.ox-ugr-goz.acik .ox-i:first-child{display:none}
.ox-ugr-goz.acik .ox-i+.ox-i{display:block}
.ox-ugr-alan.hatali .ox-ugr-kutu{border-color:var(--ox-kirmizi);box-shadow:0 0 0 3.5px rgba(229,72,77,.12)}
.ox-ugr-alan.hatali .ox-ugr-kutu>.ox-i{color:var(--ox-kirmizi)}
.ox-ugr-ipucu{display:flex;align-items:center;gap:6px;margin:7px 2px 0;font-size:14px;line-height:1.3;color:var(--ox-kirmizi)}
.ox-ugr-ipucu .ox-i{width:17px;height:17px;stroke-width:2}
.ox-ugr-ipucu[hidden]{display:none}
/* durum kutuları: kırmızı (giriş olmadı) ve yeşil (bağlantı gönderildi) */
.ox-ugr-uyari,.ox-ugr-tamam{display:flex;align-items:flex-start;gap:11px;padding:13px 15px;border-radius:14px;font-size:15px;line-height:1.4;overflow-wrap:anywhere}
.ox-ugr-uyari{background:var(--ox-kirmizi-acik);border:1px solid #f8d0d1;color:#7a2326}
.ox-ugr-uyari .ox-i{width:21px;height:21px;color:var(--ox-kirmizi)}
.ox-ugr-uyari[hidden]{display:none}
.ox-ugr-tamam{margin-top:16px;padding:15px 16px;background:var(--ox-yesil-acik);border:1px solid #c5e8d3;color:#145c36}
.ox-ugr-tamam .ox-i{width:24px;height:24px;margin-top:-1px;color:var(--ox-yesil);stroke-width:2}
.ox-ugr-tamam b{display:block;font-size:16px;font-weight:700;color:#0f5130;margin-bottom:2px}
.ox-ugr-tamam p{font-size:14.5px;color:#2a6b47}
.ox-ugr-uyari>span,.ox-ugr-tamam>div{flex:1;min-width:0}
/* düğmeler */
.ox-ugr .ox-ugr-dg{min-height:52px;margin-top:4px}
.ox-ugr .ox-ugr-dg:disabled{opacity:1}
.ox-ugr .ox-dg-ana.ox-ugr-dg:disabled{background:#4a8cf5}
.ox-ugr-don{width:18px;height:18px;flex:none;border-radius:50%;border:2.2px solid rgba(255,255,255,.4);border-top-color:#fff;animation:oxUgrDon .7s linear infinite}
.ox-dg-ikincil .ox-ugr-don{border-color:rgba(10,102,242,.25);border-top-color:var(--ox-mavi)}
@keyframes oxUgrDon{to{transform:rotate(360deg)}}
.ox-ugr-unut{display:flex;justify-content:center;margin-top:18px}
.ox-ugr-unut .ox-bag{min-height:44px}
.ox-ugr-unut .ox-bag::after{inset:0 -8px}
/* başka giriş yolları */
.ox-ugr-ara{display:flex;align-items:center;gap:12px;margin:30px 0 12px;font-size:14px;font-weight:600;color:var(--ox-ikincil)}
.ox-ugr-ara::before,.ox-ugr-ara::after{content:"";flex:1;border-top:1px solid var(--ox-cizgi)}
.ox-ugr .ox-liste .ox-satir{min-height:66px}
.ox-ugr .ox-not{margin-top:18px}
.ox-ugr-son{display:flex;justify-content:center;margin-top:22px}
.ox-ugr-son .ox-bag{min-height:44px;font-size:15px;font-weight:500;color:var(--ox-ikincil)}
.ox-ugr-son .ox-bag::after{inset:0 -8px}
/* başarısız girişten sonra gelen yardım kutusu (sahip.js yardimHtml) */
.ox-ugr .og-yardim{margin-top:16px;padding:16px;border-radius:var(--ox-r);background:var(--ox-kart);border:1px solid var(--ox-cizgi);box-shadow:var(--ox-golge);gap:6px;animation:oxUgrGir .26s cubic-bezier(.2,.7,.3,1)}
.ox-ugr .og-yardim b{font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-ugr .og-yardim p{font-size:14.5px;line-height:1.45;color:var(--ox-ikincil)}
.ox-ugr .og-yardim .og-yardim-dg{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;height:auto;margin-top:8px;padding:10px 16px;border:0;border-radius:var(--ox-r-dg);background:var(--ox-mavi-acik);color:var(--ox-mavi);font-size:15.5px;font-weight:600;line-height:1.3;white-space:normal;box-shadow:none}
.ox-ugr .og-yardim .og-yardim-dg:disabled{opacity:1;background:var(--ox-yesil-acik);color:var(--ox-yesil)}
@media (prefers-reduced-motion:reduce){.ox-ugr-gir,.ox-ugr .og-yardim{animation:none}.ox-ugr-don{animation-duration:2s}}
`);
}
// Kabuk ve form yardımcıları (öğretmen ve öğrenci girişi ortak): marka üst satırı + ox gövde; alanlar, alan hatası, kırmızı uyarı kutusu, yükleniyor düğmesi
function ugrKabuk(uygulama) {
  const { oi, esc } = OXU;
  const kok = document.getElementById('uyg');
  kok.innerHTML = `<div class="giris ox-ugr"><header class="ox-ugr-ust"><div class="ox-ust-ic"><span class="ox-marka">${APP_LOGO}<span class="ox-marka-ad"><b><i>md</i>Sinyal</b><small>${uygulama}</small></span></span></div></header><main class="ox ox-ugr-govde"></main></div>`;
  const govde = kok.querySelector('.ox-ugr-govde');
  const alan = (ad, tip, ikon, etiket, ek = '', goz = false, yer = etiket) => `<div class="ox-ugr-alan" data-alan="${ad}"><label class="ox-ugr-gizli" for="ugr-${ad}">${etiket}</label><span class="ox-ugr-kutu">${ikon}<input id="ugr-${ad}" name="${ad}" type="${tip}" placeholder="${yer}" aria-describedby="ugr-${ad}-ipucu" ${ek}>${goz ? `<button type="button" class="ox-ugr-goz" data-ugr-goz aria-label="Şifreyi göster" aria-pressed="false">${oi('goz')}${UGR_GOZ_KAPALI}</button>` : ''}</span><p class="ox-ugr-ipucu" id="ugr-${ad}-ipucu" hidden></p></div>`;
  const alanHata = (f, ad, metin) => { const a = f.querySelector(`[data-alan="${ad}"]`), p = a.querySelector('.ox-ugr-ipucu'), i = a.querySelector('input'); a.classList.add('hatali'); i.setAttribute('aria-invalid', 'true'); p.innerHTML = oi('uyari') + `<span>${esc(metin)}</span>`; p.hidden = false; i.focus(); };
  const temizle = f => { f.querySelectorAll('.ox-ugr-alan.hatali').forEach(a => { a.classList.remove('hatali'); a.querySelector('input').removeAttribute('aria-invalid'); a.querySelector('.ox-ugr-ipucu').hidden = true; }); const u = f.querySelector('.ox-ugr-uyari'); u.hidden = true; u.innerHTML = ''; };
  const uyari = (f, metin) => { const u = f.querySelector('.ox-ugr-uyari'); u.innerHTML = oi('uyari') + `<span>${esc(metin)}</span>`; u.hidden = false; };
  const yukle = (btn, metin) => { btn.disabled = true; btn.innerHTML = `<span class="ox-ugr-don" aria-hidden="true"></span><span>${metin}</span>`; };
  const birak = (btn, metin) => { btn.disabled = false; btn.innerHTML = `<span>${metin}</span>`; };
  const ac = (html, odak, anim = true) => { govde.innerHTML = `<div class="ox-ugr-sayfa${anim ? ' ox-ugr-gir' : ''}">${html}</div>`; window.scrollTo(0, 0); if (odak) { const o = govde.querySelector(odak); if (o) o.focus({ preventScroll: true }); } };
  return { govde, alan, alanHata, temizle, uyari, yukle, birak, ac };
}
function ogretmenGirisi() {
  ugrStil();
  document.title = 'Öğretmen girişi · mdSinyal';
  const kayitli = B.bulutKayitli(), { oi, esc } = OXU, EPOSTA = /^\S+@\S+\.\S+$/;
  const { govde, alan, alanHata, temizle, uyari, yukle, birak, ac } = ugrKabuk('Öğretmen uygulaması');
  let eposta = (kayitli && kayitli.eposta) || '';
  const ortak = f => { f.addEventListener('input', ev => { const a = ev.target.closest('.ox-ugr-alan'); if (a && a.classList.contains('hatali')) { a.classList.remove('hatali'); ev.target.removeAttribute('aria-invalid'); a.querySelector('.ox-ugr-ipucu').hidden = true; } if (ev.target.name === 'eposta') eposta = ev.target.value; }); };

  function girisGoster(odak, anim = true) {
    ac(`${OXU.sayfaBas('Öğretmen girişi', 'Kurs müdürünüzün davetiyle belirlediğiniz <span style="white-space:nowrap">e-posta</span> ve şifreyle girin.')}
      <form class="ox-ugr-form" novalidate>
        ${alan('eposta', 'email', UGR_ZARF, 'E-posta', `autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false" required value="${esc(eposta)}"`)}
        ${alan('sifre', 'password', oi('kilit'), 'Şifre', 'autocomplete="current-password" required', true)}
        <div class="ox-ugr-uyari" role="alert" hidden></div>
        <button type="submit" class="ox-dg ox-dg-ana genis ox-ugr-dg"><span>Giriş yap</span></button>
      </form>
      <div class="ox-ugr-unut"><button type="button" class="ox-bag" data-sifre-unut>Şifremi unuttum</button></div>
      <div data-yardim></div>
      <p class="ox-ugr-ara">Öğretmen değil misiniz?</p>
      ${OXU.liste([
        OXU.satir({ baslik: 'Kurs müdürü ya da ön büroyum', alt: 'Kurs hesabının e-postası ve şifresiyle girin', attrs: { 'data-giris-pin': true } }),
        OXU.satir({ baslik: 'Öğrenciyim', alt: 'E-postanız ve şifrenizle girin', attrs: { 'data-ogrenci-giris': true } }),
      ])}
      ${OXU.not('Davetiniz yoksa kurs müdürünüze yazın. Davet bağlantısı WhatsApp’tan gelir.', 'wp')}
      <div class="ox-ugr-son"><button type="button" class="ox-bag" data-tanitim>mdSinyal nedir?</button></div>`, odak, anim);
    const f = govde.querySelector('form');
    ortak(f);
    f.querySelector('[data-ugr-goz]').addEventListener('click', ev => { const b = ev.currentTarget, i = f.sifre, acik = i.type === 'password'; i.type = acik ? 'text' : 'password'; b.classList.toggle('acik', acik); b.setAttribute('aria-pressed', acik); b.setAttribute('aria-label', acik ? 'Şifreyi gizle' : 'Şifreyi göster'); });
    govde.querySelector('[data-sifre-unut]').addEventListener('click', () => { eposta = f.eposta.value; yenilemeGoster(); });
    govde.querySelector('[data-giris-pin]').addEventListener('click', () => { girisEkrani('pin'); window.scrollTo(0, 0); });
    // yalnız adres değişir; öğrenci girişini hashchange çizer (iki kez çizilirse gozBagla iki dinleyici ekler, şifre göster düğmesi çalışmaz)
    govde.querySelector('[data-ogrenci-giris]').addEventListener('click', () => { location.hash = '#/ogrenci-giris'; });
    govde.querySelector('[data-tanitim]').addEventListener('click', () => { girisEkrani('tanitim'); window.scrollTo(0, 0); });
    f.addEventListener('submit', ev => {
      ev.preventDefault(); const btn = f.querySelector('[type=submit]'), yer = govde.querySelector('[data-yardim]');
      temizle(f);
      if (!f.eposta.value.trim()) return alanHata(f, 'eposta', 'E-posta adresinizi yazın');
      if (!EPOSTA.test(f.eposta.value.trim())) return alanHata(f, 'eposta', 'E-posta adresini kontrol edin');
      if (!f.sifre.value) return alanHata(f, 'sifre', 'Şifrenizi girin');
      yukle(btn, 'Giriliyor…'); yer.innerHTML = '';
      B.girisYap(f.eposta.value, f.sifre.value, kodSor).then(u => bulutOturumu(u, true)).catch(x => { birak(btn, 'Giriş yap'); uyari(f, B.hataMetni(x)); if (SH.girisHatasiMi(x)) yardimAc(govde, { kim: f.eposta.value.trim(), tur: 'kurs', eposta: f.eposta.value.trim() }); });
    });
  }

  function yenilemeGoster() {
    ac(`${OXU.geri('Giriş', { 'data-ugr-geri': true })}
      ${OXU.sayfaBas('Şifre yenileme', 'Hesabınıza şifre yenileme bağlantısı göndereceğiz.')}
      <form class="ox-ugr-form" novalidate>
        ${alan('eposta', 'email', UGR_ZARF, 'E-posta', `autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required value="${esc(eposta)}"`)}
        <div class="ox-ugr-uyari" role="alert" hidden></div>
        <button type="submit" class="ox-dg ox-dg-ana genis ox-ugr-dg"><span>Bağlantı gönder</span></button>
      </form>
      <div data-ugr-tamam aria-live="polite"></div>
      ${OXU.not('Bağlantıyı açıp yeni şifrenizi belirleyin, sonra bu ekrandan girin.')}`);
    const h1 = govde.querySelector('.ox-sayfa-bas h1'); h1.tabIndex = -1; h1.focus({ preventScroll: true });
    const f = govde.querySelector('form'), tamam = govde.querySelector('[data-ugr-tamam]');
    ortak(f);
    govde.querySelector('[data-ugr-geri]').addEventListener('click', () => girisGoster('[data-sifre-unut]'));
    f.addEventListener('submit', ev => {
      ev.preventDefault(); const btn = f.querySelector('[type=submit]'), ep = f.eposta.value.trim();
      temizle(f);
      if (!ep) return alanHata(f, 'eposta', 'E-posta adresinizi yazın');
      if (!EPOSTA.test(ep)) return alanHata(f, 'eposta', 'E-posta adresini kontrol edin');
      yukle(btn, 'Gönderiliyor…'); tamam.innerHTML = '';
      B.sifreSifirla(ep).then(() => {
        btn.classList.replace('ox-dg-ana', 'ox-dg-ikincil'); birak(btn, 'Tekrar gönder');
        tamam.innerHTML = `<div class="ox-ugr-tamam ox-ugr-gir">${oi('dogru')}<div><b>Bağlantı gönderildi.</b><p><span>${esc(ep)}</span> adresine şifre yenileme bağlantısı iletildi. Gelen kutunuzu ve spam klasörünü kontrol edin.</p></div></div>`;
      }).catch(x => { birak(btn, btn.classList.contains('ox-dg-ikincil') ? 'Tekrar gönder' : 'Bağlantı gönder'); uyari(f, B.hataMetni(x)); });
    });
  }

  girisGoster(null, false);
}
function girisEkrani(mod = 'tanitim') {
  B.sdkHazirla();
  document.body.classList.remove('portal-modu', 'ox-modu', 'ox-tam-acik', 'ox-akis-acik');
  const kok0 = document.getElementById('uyg');
  if (mod === 'tanitim' && TANITIM) {
    if (!kok0.querySelector('#tanitim') || kok0.querySelector('#tanitim').hidden) kok0.innerHTML = TANITIM;
    document.title = 'mdSinyal · Sürücü kursu yönetimi';
    const tn = kok0.querySelector('#tanitim'); tn.hidden = false; if (window.__vitrin) setTimeout(window.__vitrin, 0); if (tn.dataset.bagli) return; tn.dataset.bagli = '1';
    kok0.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', demoyaGir));
    kok0.querySelectorAll('[data-giris]').forEach(b => b.addEventListener('click', () => { girisEkrani(b.dataset.giris || 'pin'); window.scrollTo(0, 0); }));
    // bölümler ekrana girerken hafifçe belirir (hareket azaltma tercihine uyar; IntersectionObserver yoksa hepsi görünür)
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) { document.documentElement.classList.add('w-anim'); const io = new IntersectionObserver(l => l.forEach(x => { if (x.isIntersecting) { x.target.classList.add('w-gorundu'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' }); kok0.querySelectorAll('[data-gor]').forEach(el => io.observe(el)); }
    // sayfa içi menü: adres çubuğuna dokunmadan bölüme kaydırır (hash yönlendirmesiyle karışmasın)
    kok0.querySelectorAll('[data-kaydir]').forEach(b => b.addEventListener('click', () => { const h = document.getElementById(b.dataset.kaydir); if (h) h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }));
    return;
  }
  if (mod === 'kursac') return kursAcEkrani();
  if (mod === 'ogretmen') return ogretmenGirisi();
  // öğretmen: kurs müdürünün davetiyle belirlediği e-posta ve şifreyle girer (aynı hesap sistemi, yalnız kendi ders ekranını görür)
  const ogt = mod === 'ogretmen';
  document.title = (ogt ? 'Öğretmen girişi' : 'Giriş') + ' · mdSinyal';
  const kayitli = B.bulutKayitli();
  document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">
    <div class="logo" style="border-bottom:0;margin:0 0 6px"><svg class="logo-isaret" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="#141e33"/><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><g fill="none" stroke="#ffc21a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l12 12-12 12" stroke-opacity=".38"/><path d="M33 20l12 12-12 12"/></g></svg><span><b><span class="mk">md</span>Sinyal</b><small>Sürücü kursu yönetimi</small></span></div>
    
    <h1>${ogt ? 'Öğretmen girişi' : 'Kurs hesabınızla girin'}</h1><p>${ogt ? 'Kurs müdürünün WhatsApp’tan gönderdiği davetle belirlediğiniz e-posta ve şifreyle girin. Bugünkü dersleriniz, haftanız ve öğrencileriniz açılır. Davetiniz yoksa kurs müdürünüze yazın.' : 'Kurs müdürü, ön büro ve öğretmenler kendi e-postası ve şifresiyle girer; herkes yalnız kendi ekranlarını görür.'}</p>
    <form class="giris-eposta" novalidate><label>E-posta<input name="eposta" type="email" autocomplete="username" inputmode="email" required value="${e((kayitli && kayitli.eposta) || '')}"></label><label>Şifre<input name="sifre" type="password" autocomplete="current-password" required></label><button class="dg dg-koyu" type="submit">Giriş yap</button></form>
    <p class="giris-baglar"><button type="button" data-sifre-unut>Şifremi unuttum</button>${ogt ? '<button type="button" data-giris-pin>Kurs müdürü ya da ön büroyum</button>' : '<button type="button" data-kurs-ac>Kursum için hesap açmak istiyorum</button>'}</p><div data-yardim></div>
    <button class="giris-demo" type="button" data-ogrenci-giris style="margin:18px 0 0"><b>Öğrenciyim</b><small>E-postanız ve şifrenizle girin</small><span aria-hidden="true">→</span></button>${ogt ? '' : '<button class="giris-demo" data-demo style="margin:10px 0 0"><b>Demoyu incele</b><small>Giriş gerekmez · örnek verilerle · mesaj gönderilmez</small><span aria-hidden="true">→</span></button>'}
    <details class="giris-ornek"${ogt ? ' hidden' : ''}${mod === 'pin-demo' || sessionStorageAl('sinyal-bekleyen') ? ' open' : ''}><summary>Demo: örnek kursta çalışan olarak dene (PIN)</summary>
    <p class="giris-not" style="margin:8px 0 10px">Demo kursun kullanıcıları. Gerçek kurs hesabında PIN yerine e-posta ve şifre kullanılır.</p>
    <div class="giris-kisiler">${S.kullanicilar.map(u => `<button class="giris-kisi" data-kim="${u.id}"><b>${e(u.ad)}</b><small>${ROL_AD[u.rol]}</small></button>`).join('')}</div>
    <form class="giris-pin" hidden><label for="pin">PIN</label><input id="pin" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="••••"><button class="dg dg-koyu" type="submit">Giriş</button></form>
    </details></div><button class="giris-geri" data-tanitim type="button">← mdSinyal nedir?</button></div>`;
  let secilen = null;
  const kok = document.getElementById('uyg');
  const dm = kok.querySelector('[data-demo]'); if (dm) dm.addEventListener('click', demoyaGir);
  kok.querySelector('[data-tanitim]').addEventListener('click', () => { girisEkrani('tanitim'); window.scrollTo(0, 0); });
  const ka = kok.querySelector('[data-kurs-ac]'); if (ka) ka.addEventListener('click', () => pencere({ baslik: 'Kurs hesabı nasıl açılır?', icerik: '<p style="font-size:14.5px">Kurs hesabını mdSinyal ekibi açar; kurulum günü kayıtlarınızı taşırız, ekibinize kısa bir eğitim veririz. Başvuru formunu doldurun, en geç bir iş günü içinde sizi arayalım. Ya da <b>' + DESTEK.ad + ' · ' + DESTEK.telGoster + '</b> (telefon ve WhatsApp, ' + DESTEK.saat.toLocaleLowerCase('tr') + ').</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button><a class="dg dg-ana" href="basla/">Başvuru formu</a>' }));
  const gp = kok.querySelector('[data-giris-pin]'); if (gp) gp.addEventListener('click', () => { girisEkrani('pin'); window.scrollTo(0, 0); });
  kok.querySelector('[data-ogrenci-giris]').addEventListener('click', () => { if (location.hash === '#/ogrenci-giris') ogrenciGirisEkrani(); else location.hash = '#/ogrenci-giris'; });  // ekranı hashchange çizer (iki kez çizilirse şifre göster düğmesi bozuluyordu)
  kok.querySelector('[data-sifre-unut]').addEventListener('click', () => {
    const ep = kok.querySelector('[name=eposta]').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(ep)) { bildir('Önce e-posta adresinizi yazın', 'uyari'); return kok.querySelector('[name=eposta]').focus(); }
    B.sifreSifirla(ep).then(() => bildir(ep + ' adresine şifre sıfırlama linki gönderildi; gelen kutunuzu ve spam klasörünü kontrol edin')).catch(x => bildir(B.hataMetni(x), 'uyari'));
  });
  kok.querySelector('.giris-eposta').addEventListener('submit', ev => {
    ev.preventDefault(); const f = ev.target, btn = f.querySelector('button');
    if (!/^\S+@\S+\.\S+$/.test(f.eposta.value.trim())) return bildir('E-posta adresini kontrol edin', 'uyari');
    if (!f.sifre.value) return bildir('Şifrenizi girin', 'uyari');
    btn.disabled = true; btn.textContent = 'Giriliyor…';
    B.girisYap(f.eposta.value, f.sifre.value, kodSor).then(u => bulutOturumu(u, true)).catch(x => { btn.disabled = false; btn.textContent = 'Giriş yap'; bildir(B.hataMetni(x), 'uyari'); if (SH.girisHatasiMi(x)) yardimAc(kok, { kim: f.eposta.value.trim(), tur: 'kurs', eposta: f.eposta.value.trim() }); });
  });
  kok.querySelectorAll('[data-kim]').forEach(b => b.addEventListener('click', () => { secilen = S.kullanicilar.find(u => u.id === b.dataset.kim); kok.querySelectorAll('[data-kim]').forEach(x => x.classList.toggle('secili', x === b)); const f = kok.querySelector('.giris-pin'); f.hidden = false; f.querySelector('input').value = ''; f.querySelector('input').focus(); }));
  kok.querySelector('.giris-pin').addEventListener('submit', ev => {
    ev.preventDefault(); const v = ev.target.querySelector('input').value;
    if (!secilen) return;
    const dn = (S.guvenlik.deneme = S.guvenlik.deneme || {})[secilen.id] || { n: 0, kilit: 0 };
    if (dn.kilit > Date.now()) return bildir(`${secilen.ad} hesabı çok sayıda hatalı PIN nedeniyle kilitli; ${Math.ceil((dn.kilit - Date.now()) / 60e3)} dk sonra tekrar deneyin ya da müdürden yeni PIN isteyin`, 'uyari');
    if (v !== secilen.pin) {
      dn.n++; if (dn.n >= 5) { dn.kilit = Date.now() + 15 * 60e3; dn.n = 0; islem('Hesap kilitlendi', secilen.ad + ' · 5 hatalı PIN'); bildir('5 kez hatalı PIN girildi; hesap 15 dakika kilitlendi', 'uyari'); }
      else bildir(`PIN hatalı · ${5 - dn.n} deneme hakkı kaldı`, 'uyari');
      S.guvenlik.deneme[secilen.id] = dn; kaydet(); return;
    }
    delete S.guvenlik.deneme[secilen.id];
    oturum.kullanici = { id: secilen.id, ad: secilen.ad, rol: secilen.rol, usta: secilen.usta };
    try { sessionStorage.setItem('sinyal-oturum', JSON.stringify(oturum.kullanici)); } catch (x) { }
    sonHareket = Date.now(); hareketYaz(true);
    islem('Giriş yaptı'); kaydet();
    let bekleyen = null; try { bekleyen = sessionStorage.getItem('sinyal-bekleyen'); sessionStorage.removeItem('sinyal-bekleyen'); } catch (x) { }
    iskelet(); location.hash = bekleyen || anaSayfa(secilen); sonAd = rota().ad; yenile(true);
  });
}
function sessionStorageAl(k) { try { return sessionStorage.getItem(k); } catch (x) { return null; } }
const LOGO = `<div class="logo" style="border-bottom:0;margin:0 0 6px"><svg class="logo-isaret" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="#141e33"/><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><g fill="none" stroke="#ffc21a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l12 12-12 12" stroke-opacity=".38"/><path d="M33 20l12 12-12 12"/></g></svg><span><b><span class="mk">md</span>Sinyal</b><small>Sürücü kursu otomasyonu</small></span></div>`;
const IPUCLARI = ['Yaya geçidinde öncelik her zaman yayanındır.', 'Sarı ışık “dur”a hazırlan demektir, hızlan demek değildir.', 'Öndeki araçla aranda en az 2 saniyelik mesafe bırak.', 'Emniyet kemeri arka koltukta da takılır.', 'Şerit değiştirmeden önce sinyal ver, aynaya ve kör noktana bak.', 'Yağmurda takip mesafesini iki katına çıkar.', 'Kavşağa girmeden önce hızını düşür, sağdan gelene yol ver.'];
let ipucuSayac = null;
// Yükleme ekranı (kurumsal): lacivert zemin, logo, ad, ince çubuk ve durum metni
function bekleEkrani(metin) {
  clearInterval(ipucuSayac);
  document.getElementById('uyg').innerHTML = `<div class="yukleme" role="status" aria-live="polite"><div class="yk-ic"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="#1b2b45"/><g fill="none" stroke="#ffc21a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l12 12-12 12" stroke-opacity=".38"/><path d="M33 20l12 12-12 12"/></g></svg><b class="yk-ad"><span class="mk">md</span>Sinyal</b><div class="yk-cubuk" aria-hidden="true"><i></i></div><p class="yk-alt">${e(metin || 'mdSinyal açılıyor')}</p></div></div>`;
}
// YON-058: giriş sayfasından gelinip bu cihazda zaten açık oturum varsa sessizce ana ekrana gitmez; seçim sorulur
function acikOturumSor(u) {
  pencere({ baslik: 'Bu cihazda zaten girişlisiniz', taslak: false, icerik: `<p style="font-size:14.5px">Şu an <b>${e(u.ad || u.eposta || '')}</b> hesabıyla girişlisiniz${S.kurs && S.kurs.ad ? ` (${e(S.kurs.ad)})` : ''}.</p><p style="font-size:13.5px;color:var(--soluk);margin-top:6px">Aynı hesapla devam edebilir ya da çıkış yapıp başka bir hesapla girebilirsiniz. Oturum kendiliğinden kapanmaz (Ayarlar › Güvenlik).</p>`,
    altlik: '<button class="dg dg-cizgi" data-oc-cik>Çıkış yap ve başka hesapla gir</button><button class="dg dg-ana" data-kapat>Devam et</button>',
    onAc(p) { p.querySelector('[data-oc-cik]').addEventListener('click', () => { islem('Çıkış yaptı', 'başka hesapla girmek için'); kaydet(); kapatPencere(); B.cikisYap().then(() => { try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } location.hash = '#/giris'; location.reload(); }); }); } });
}
// Gerçek kurs hesabıyla oturum aç
function bulutOturumu(u, yeniGiris) {
  // demo hesabı (Yönetim › Hesaplar › Hesap oluştur › Demo): bulut verisine bağlanmaz, bu cihazdaki örnek verili demo açılır
  if (u && u.demo) { if (location.hash !== '#/demo') history.replaceState(null, '', '#/demo'); demoyaGir(); return bildir('Demo hesabıyla girdin: örnek verilerle çalışır, hiçbir mesaj gönderilmez'); }
  const yonetimIstendi = yonetimGirisYolu();
  oturum.kullanici = u;
  try { sessionStorage.setItem('sinyal-oturum', JSON.stringify(u)); } catch (x) { }
  if (yeniGiris) { islem('Giriş yaptı'); kaydet(); }
  sonHareket = Date.now(); hareketYaz(true);
  let bekleyen = null; try { bekleyen = sessionStorage.getItem('sinyal-bekleyen'); sessionStorage.removeItem('sinyal-bekleyen'); } catch (x) { }
  if (yonetimIstendi && !ORT.yonetimModu() && u.rol !== 'ortak') {
    document.getElementById('uyg').innerHTML = ogrKap(`<div class="og-giris-bas"><h1>mdSinyal Yönetim</h1><p>Bu tarayıcıda bir kurs hesabı açık (${e(u.ad)}). mdSinyal Yönetim'e girmek için önce bu hesaptan çık.</p></div><button class="dg dg-ana og-giris-dg" data-yon-cik>Çıkış yap ve mdSinyal Yönetim'e gir</button><a class="dg dg-hafif og-giris-dg" href="#/genel" data-yon-don style="margin-top:10px">Kurs hesabıma dön</a>`);
    const k = document.getElementById('uyg');
    k.querySelector('[data-yon-cik]').addEventListener('click', () => { islem('Çıkış yaptı'); kaydet(); B.cikisYap().then(() => { try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } location.hash = '#/yonetim'; location.reload(); }); });
    k.querySelector('[data-yon-don]').addEventListener('click', ev => { ev.preventDefault(); location.hash = '#/genel'; location.reload(); });
    return;
  }
  if (!ORT.yonetimModu()) iskelet(); B.durumYaz();
  // mdSinyal ekibi (yönetici) hesabı: Ayarlar › Diğer'de kurs hesabı açma linki oluşturur
  B.yoneticiMi().then(y => { if (y && !B.bulut.yonetici) { B.bulut.yonetici = true; yenile(); } }).catch(() => { });
  const h = location.hash.slice(2).split('/')[0];
  if (bekleyen) location.hash = bekleyen; else if (!SAYFALAR[h] || h === 'davet' || yeniGiris) location.hash = anaSayfa(u);
  sonAd = rota().ad; yenile(true);
}
B.bulutYenileDinle(() => {
  if (!oturum.kullanici || !document.getElementById('icerik')) return;
  const a = document.activeElement;
  if (document.querySelector('.pencere-arka, .pencere') || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) { bekleyenYenile = true; return; }
  yenile();
});
let bekleyenYenile = false;
setInterval(() => { if (!bekleyenYenile || !oturum.kullanici) return; const a = document.activeElement; if (document.querySelector('.pencere-arka, .pencere') || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return; bekleyenYenile = false; yenile(); }, 1500);
// Hesap açma linki: #/yeni-kurs/<kod> (mdSinyal ekibinin verdiği tek kullanımlık kod)
const kursDavetYolu = () => { const m = location.hash.match(/^#\/yeni-kurs\/([a-z0-9]+)$/); return m ? m[1] : null; };
async function kursDavetEkrani() {
  const kod = kursDavetYolu(); bekleEkrani('Hesap açma linki kontrol ediliyor…');
  let dv = null; try { dv = await B.kursDavetGetir(kod); } catch (x) { }
  if (!dv) { document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}<h1>Bu link geçersiz</h1><p>Hesap açma linkinin süresi dolmuş ya da daha önce kullanılmış. Yeni link için ${DESTEK.ad} · ${DESTEK.telGoster}.</p></div></div>`; return; }
  kursAcEkrani(kod);
}
function kursAcEkrani(davetKod) {
  if (!davetKod) return girisEkrani('pin');
  document.title = 'Yeni kurs hesabı · mdSinyal';
  document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}
    <h1>Yeni kurs hesabı</h1><p>Kursunuzun verileri boş bir hesapla başlar. Öğrenci listenizi sonra Excel’den aktarabilirsiniz.</p>
    <form class="giris-eposta" novalidate>
      <label>Kursun adı<input name="kurs" required placeholder="Örn. Örnek Sürücü Kursu" autocomplete="organization"></label>
      <label>İl<select name="sehir" required>${ilSecenekleri("")}</select></label>
      <label>Adınız soyadınız<input name="ad" required autocomplete="name"></label>
      <label>Cep telefonunuz <small style="font-weight:400;opacity:.85">yeni kayıt, iptal ve günlük özet WhatsApp’tan buraya gelir</small><input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx"></label>
      <label>E-posta<input name="eposta" type="email" inputmode="email" autocomplete="username" required></label>
      <label>Şifre (en az 8 karakter)<input name="sifre" type="password" autocomplete="new-password" required minlength="8"></label>
      <label>Şifre (tekrar)<input name="sifre2" type="password" autocomplete="new-password" required minlength="8"></label>
      <label class="giris-onay"><input type="checkbox" name="onay"><span><a href="gizlilik.html" target="_blank" rel="noopener" style="color:inherit;font-weight:700;text-decoration:underline">Gizlilik ve veri işleme şartlarını</a> okudum: kursum veri sorumlusu, mdSinyal veri işleyendir; veriler Google, Cloudflare ve Meta (WhatsApp) bulut altyapısında işlenir.</span></label>
      <button class="dg dg-koyu" type="submit">Kurs hesabını aç</button></form>
    <p class="giris-baglar"><button type="button" data-geri>← Giriş ekranına dön</button></p></div></div>`;
  const kok = document.getElementById('uyg');
  kok.querySelector('[data-geri]').addEventListener('click', () => girisEkrani('pin'));
  kok.querySelector('form').addEventListener('submit', ev => {
    ev.preventDefault(); const f = ev.target, btn = f.querySelector('[type=submit]');
    if (f.kurs.value.trim().length < 3) return bildir('Kursun adını yazın', 'uyari');
    if (f.ad.value.trim().length < 3) return bildir('Adınızı ve soyadınızı yazın', 'uyari');
    if (!/^\S+@\S+\.\S+$/.test(f.eposta.value.trim())) return bildir('E-posta adresini kontrol edin', 'uyari');
    if (f.sifre.value.length < 8) return bildir('Şifre en az 8 karakter olmalı', 'uyari');
    if (f.sifre.value !== f.sifre2.value) { bildir('İki şifre aynı değil; şifreyi tekrar yazın', 'uyari'); return f.sifre2.focus(); }
    if (!f.onay.checked) return bildir('Verilerin nerede saklanacağını okuduğunuzu işaretleyin', 'uyari');
    btn.disabled = true; btn.textContent = 'Hesap açılıyor…';
    B.kursAc({ onayMetni: (f.querySelector('.giris-onay span') || {}).textContent || '', kursAd: f.kurs.value.trim(), yetkili: f.ad.value.trim(), sehir: f.sehir.value.trim(), eposta: f.eposta.value.trim(), sifre: f.sifre.value, mudurTel: f.tel.value.trim(), davetKod })
      .then(u => { history.replaceState(null, '', '#/genel'); bulutOturumu(u, true); bildir('Kurs hesabı açıldı. Kurulum adımları ana sayfada; “Kuruluma başla” ile sırayla açılır'); })
      .catch(x => { btn.disabled = false; btn.textContent = 'Kurs hesabını aç'; bildir(B.hataMetni(x), 'uyari'); });
  });
}
// Öğrenci hesabı: telefon numarası + şifre. Hesabı kurs açar, geçici şifre WhatsApp'tan gelir; ilk girişte öğrenci kendi şifresini belirler.
const ogrYolu = () => /^#\/ogr\/[A-Za-z0-9]+\/[a-z0-9]+$/.test(location.hash);
function eskiLink() { history.replaceState(null, '', '#/ogrenci-giris'); ogrenciGirisEkrani('Öğrenci paneli artık kendi hesabınızla açılıyor. E-postanız (ya da kursun verdiği telefon numarası) ve şifrenizle girin.'); }
// Öğrenci giriş ekranları: açık zemin, tek kart, büyük dokunma alanları, şifreyi göster düğmesi ve canlı şifre kuralları
const ogrKap = (ic, alt = '') => `<div class="og-giris"><div class="og-giris-ust">${LOGO}</div><main class="og-giris-kart">${ic}</main>${alt}</div>`;
const ogrAlan = (ad, et, tur, ikon, ek = '') => `<label class="og-alan"><span class="og-alan-et">${et}</span><span class="og-girdi">${ik(ikon)}<input name="${ad}" type="${tur}" ${ek}>${tur === 'password' ? `<button type="button" class="og-goz" data-goz aria-label="Şifreyi göster" aria-pressed="false">${ik('goz')}</button>` : ''}</span></label>`;
const SIFRE_KURAL = `<ul class="og-kural" aria-live="polite"><li data-k="uzun">${ik('tik')}En az 8 karakter</li><li data-k="ayni">${ik('tik')}İki şifre aynı</li></ul>`;
function sifreIzle(f, btn) {
  const g = () => { const u = f.s1.value.length >= 8, a = u && f.s1.value === f.s2.value; f.querySelector('[data-k=uzun]').classList.toggle('ok', u); f.querySelector('[data-k=ayni]').classList.toggle('ok', a); btn.disabled = !a; };
  f.addEventListener('input', g); g();
}
// Şifre yanlış girilince yardım kartı kendiliğinden açılır (kişi “şifremi unuttum”u aramaz)
function yardimAc(kok, { kim, tur, eposta }) {
  const yer = kok.querySelector('[data-yardim]'); if (!yer) return;
  yer.innerHTML = SH.yardimHtml({ kim, tur, eposta: !!eposta });
  const ep = yer.querySelector('[data-yardim-eposta]');
  if (ep) ep.addEventListener('click', () => { ep.disabled = true; B.sifreSifirla(eposta).then(() => { ep.textContent = 'Link gönderildi; gelen kutunu ve spam klasörünü kontrol et'; }).catch(x => { ep.disabled = false; bildir(B.hataMetni(x), 'uyari'); }); });
}
function gozBagla(kok) {
  // #uyg ekranlar arasında aynı öğe kalır: dinleyici bir kez bağlanır (iki kez bağlanırsa her dokunuş iki kez çevirir, şifre göster çalışmaz)
  if (kok._gozBagli) return; kok._gozBagli = true;
  kok.addEventListener('click', ev => { const b = ev.target.closest('[data-goz]'); if (!b) return; const i = b.parentElement.querySelector('input'), ac = i.type === 'password'; i.type = ac ? 'text' : 'password'; b.setAttribute('aria-pressed', ac); b.setAttribute('aria-label', ac ? 'Şifreyi gizle' : 'Şifreyi göster'); b.classList.toggle('acik', ac); });
}
// mdSinyal Yönetim alt linki: #/yonetim (giriş) ve #/yonetim/kur/<davet kodu> (tek seferlik hesap oluşturma + kurulum)
const yonetimGirisYolu = () => location.hash === '#/yonetim';
const yonetimKurYolu = () => { const m = location.hash.match(/^#\/yonetim\/kur\/([a-z0-9]+)$/); return m ? m[1] : null; };
// kullanıcı adı girişte e-postaya çevrilir: hiçbir yere ulaşmayan ayrılmış alan adı (.invalid); e-posta yazılırsa olduğu gibi kullanılır
const yonetimEposta = v => { v = String(v || '').trim(); return v.includes('@') ? v : v.toLocaleLowerCase('tr').replace(/[^a-z0-9._-]/g, '') + '@yonetim.sinyal.invalid'; };
function yonetimGirisEkrani(not) {
  B.sdkHazirla();
  document.body.classList.remove('portal-modu'); document.title = 'mdSinyal Yönetim · Giriş';
  const kok = document.getElementById('uyg');
  kok.innerHTML = ogrKap(`<div class="og-giris-bas"><h1>mdSinyal Yönetim</h1><p>Kurslar, gelir-gider ve ortaklık. Yalnız yetkili kişiler girebilir.</p></div>
    ${not ? `<p class="og-giris-not">${ik('uyari')}<span>${not}</span></p>` : ''}
    <form novalidate class="og-giris-form">${ogrAlan('kad', 'E-posta', 'text', 'kursiyer', 'autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required')}${ogrAlan('sifre', 'Şifre', 'password', 'kilit', 'autocomplete="current-password" required')}
    <button type="button" class="og-bag og-unut" data-unut>Şifremi unuttum</button>
    <button class="dg dg-ana og-giris-dg" type="submit">Giriş yap</button></form><div data-yardim></div>`,
    `<p class="og-giris-alt">Hesabın yok mu? <button type="button" class="og-bag" data-yon-kur>Google hesabınla kur</button></p>`);
  gozBagla(kok);
  kok.querySelector('[data-yon-kur]').addEventListener('click', ev => {
    const b = ev.currentTarget; b.disabled = true; b.textContent = 'Google açılıyor…';
    SH.yonetimKurulumLinki().then(l => { location.href = l; }).catch(x => { b.disabled = false; b.textContent = 'Google hesabınla kur'; bildir(x.message, 'uyari'); });
  });
  const f = kok.querySelector('form'), btn = f.querySelector('[type=submit]');
  kok.querySelector('[data-unut]').addEventListener('click', ev => {
    const v = f.kad.value.trim(), b = ev.currentTarget;
    if (!v.includes('@')) { yardimAc(kok, { kim: v, tur: 'yonetim' }); return bildir('E-posta adresini yazarsan şifre linki gelen kutuna gönderilir', 'uyari'); }
    b.disabled = true; B.sifreSifirla(v).then(() => { b.textContent = 'Şifre linki gönderildi'; bildir(v + ' adresine şifre belirleme linki gönderildi; gelen kutunu ve spam klasörünü kontrol et'); }).catch(x => { b.disabled = false; bildir(B.hataMetni(x), 'uyari'); yardimAc(kok, { kim: v, tur: 'yonetim' }); });
  });
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    if (!f.kad.value.trim()) return bildir('Kullanıcı adını yaz', 'uyari');
    if (!f.sifre.value) return bildir('Şifreni yaz', 'uyari');
    btn.disabled = true; btn.textContent = 'Giriliyor…';
    B.girisYap(yonetimEposta(f.kad.value), f.sifre.value, kodSor).then(u => bulutOturumu(u, true)).catch(x => { btn.disabled = false; btn.textContent = 'Giriş yap'; bildir(B.hataMetni(x), 'uyari'); if (SH.girisHatasiMi(x)) { const v = f.kad.value.trim(); yardimAc(kok, { kim: v, tur: 'yonetim', eposta: v.includes('@') ? v : '' }); } });
  });
}
async function yonetimHesapEkrani(kod) {
  bekleEkrani('Hesap açma linki kontrol ediliyor…');
  let dv = null; try { dv = await B.kursDavetGetir(kod); } catch (x) { }
  document.body.classList.remove('portal-modu'); document.title = 'mdSinyal Yönetim hesabı';
  const kok = document.getElementById('uyg');
  if (!dv) { kok.innerHTML = ogrKap(`<div class="og-giris-bas"><h1>Bu link geçersiz</h1><p>Hesap açma linkinin süresi dolmuş ya da daha önce kullanılmış.</p></div><a class="dg dg-ana og-giris-dg" href="#/yonetim">mdSinyal Yönetim girişine git</a>`); return; }
  const alan = (ad, et, ek) => `<label class="og-alan"><span class="og-alan-et">${et}</span><span class="og-girdi"><input name="${ad}" ${ek}></span></label>`;
  kok.innerHTML = ogrKap(`<div class="og-giris-bas"><h1>mdSinyal Yönetim hesabı</h1><p>Bir kez yapılır. Sonra her seferinde <b>mdsinyal.com/yonetim</b> adresinden e-postan ve şifrenle girersin.</p></div>
    <form novalidate class="og-giris-form" id="f-yh">${ogrAlan('kad', 'E-posta adresin', 'email', 'kursiyer', 'placeholder="ornek@gmail.com" inputmode="email" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required')}${ogrAlan('ad', 'Adın soyadın', 'text', 'kursiyer', 'value="Servet Sakar" autocomplete="name" required')}
      <details class="yh-ortak"><summary>Ortaklık bilgileri <small>sözleşmeye göre dolu; gerekirse düzelt</small></summary>
        ${alan('oad', 'Ortağın adı soyadı', 'value="Eyüp Çağlar"')}${alan('oran', 'Gelir payı (%)', 'inputmode="numeric" value="40"')}${alan('bas', 'Sözleşme tarihi', 'type="date" value="2026-11-10"')}${alan('bt', 'Borcun aktarıldığı tarih (son gün bundan 6 ay sonra)', 'type="date" value="2026-11-10"')}${alan('anapara', 'Anapara (₺)', 'inputmode="numeric" value="50.000"')}${alan('iade', 'Yeni satış başına anapara iadesi (₺)', 'inputmode="numeric" value="2.000"')}
      </details>
      <p class="og-giris-not" style="margin:4px 0 0">${ik('kilit')}<span>Şifreni burada yazmazsın: hesap açılınca bu e-postaya “şifre belirle” linki gelir, şifreni oradan koyarsın. Unutursan aynı linki giriş ekranından yeniden istersin.</span></p>
      <button class="dg dg-ana og-giris-dg" type="submit">Hesabı oluştur</button></form>`);
  gozBagla(kok);
  const f = kok.querySelector('#f-yh'), btn = f.querySelector('[type=submit]');
  f.addEventListener('submit', async ev => {
    ev.preventDefault(); if (btn.disabled) return;
    const kad = f.kad.value.trim().toLocaleLowerCase('tr');
    if (!/^\S+@\S+\.\S+$/.test(kad)) return bildir('E-posta adresini kontrol et', 'uyari');
    if (f.ad.value.trim().length < 3) return bildir('Adını ve soyadını yaz', 'uyari');
    const oran = +String(f.oran.value).replace(/\D/g, '') || 40, para = v => Math.round(parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0);
    btn.disabled = true; btn.textContent = 'Hesap oluşturuluyor…';
    try {
      const u = await B.kursAc({ kursAd: 'mdSinyal Yönetim', yetkili: f.ad.value.trim(), sehir: '', eposta: yonetimEposta(kad), sifre: B.geciciSifre() + B.geciciSifre() + 'Aa9', mudurTel: '', davetKod: kod });
      // sunucudan ilk görüntü gelmeden kurs ayarı yazılmaz; en çok 10 sn beklenir
      for (let i = 0; i < 50 && !B.sunucuHazir(); i++) await new Promise(r => setTimeout(r, 200));
      ORT.isletmeKur({ ad: f.oad.value.trim() || 'Ortak', oran, baslangic: f.bas.value, anapara: para(f.anapara.value), borcTarih: f.bt.value, satisIade: para(f.iade.value) });
      S.kurs.tur = 'yonetim'; S.kurs.ad = 'mdSinyal Yönetim'; kaydet();
      history.replaceState(null, '', '#/yonetim');
      bulutOturumu(u, true);
      // şifreyi kişi kendisi e-postadaki linkten koyar (Türkçe Firebase e-postası)
      B.sifreSifirla(kad).then(() => bildir('Hesabın hazır. ' + kad + ' adresine “şifre belirle” linki gönderildi; gelen kutunu ve spam klasörünü kontrol et')).catch(() => bildir('Hesabın hazır. Şifre linki gönderilemedi; giriş ekranında “Şifremi unuttum”a bas', 'uyari'));
    } catch (x) { btn.disabled = false; btn.textContent = 'Hesabı oluştur'; bildir(B.hataMetni(x), 'uyari'); }
  });
}
/* ---------- öğrenci girişi (#/ogrenci-giris), şifremi unuttum ve ilk şifre belirleme: öğretmen girişiyle aynı ox-ugr kabuğu (ugrKabuk, ugrStil) ----------
   Öğrenciye özgü stil ox-ugr-ogr'de (öğretmen girişinin stili ve çıktısı değişmez). Giriş mantığı, bulut çağrıları ve metinler eski ekranla aynı;
   uyarılar bildirim yerine alanın altında ya da formdaki kutuda görünür. */
function ugrOgrStil() {
  ugrStil();
  OXU.stilEkle('ox-ugr-ogr', `
/* bilgi kutusu: personel oturumu açık, eski link, hesap kapanmış */
.ox-ugr-bilgi{display:flex;align-items:flex-start;gap:11px;margin:0 0 16px;padding:13px 15px;border-radius:14px;background:var(--ox-sari-acik);border:1px solid #f4e3b0;color:#5c4100;font-size:15px;line-height:1.4;overflow-wrap:anywhere}
.ox-ugr-bilgi .ox-i{flex:none;width:21px;height:21px;color:#b77900}
.ox-ugr-bilgi>span{flex:1;min-width:0}
/* ilk şifre: adımlar ve canlı şifre kuralları */
.ox-ugr-adim{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0;padding:0}
.ox-ugr-adim+.ox-sayfa-bas{margin-top:14px}
.ox-ugr-adim li{display:flex;align-items:center;gap:6px;min-height:30px;padding:0 12px 0 5px;border-radius:999px;background:var(--ox-gri-acik);color:var(--ox-ikincil);font-size:13.5px;font-weight:600}
.ox-ugr-adim li>b,.ox-ugr-adim li>.ox-i{flex:none;display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#dde2ea;color:var(--ox-ikincil);font-size:12px;font-weight:700}
.ox-ugr-adim li.ok{background:var(--ox-yesil-acik);color:#146c3e}
.ox-ugr-adim li.ok>.ox-i{padding:4px;background:var(--ox-yesil);color:#fff;stroke-width:3}
.ox-ugr-adim li.simdi{background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-ugr-adim li.simdi>b{background:var(--ox-mavi);color:#fff}
.ox-ugr-kural{list-style:none;display:flex;flex-wrap:wrap;gap:8px 18px;margin:2px 2px 0;padding:0;font-size:14.5px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ugr-kural li{display:flex;align-items:center;gap:7px;min-height:24px;transition:color .15s}
.ox-ugr-kural .ox-i{flex:none;width:20px;height:20px;padding:4px;border-radius:50%;background:#dde2ea;color:#fff;stroke-width:3;transition:background-color .15s}
.ox-ugr-kural li.ok{color:#146c3e;font-weight:600}
.ox-ugr-kural li.ok .ox-i{background:var(--ox-yesil)}
/* kurallar sağlanana kadar kapalı düğme (yükleniyorken mavi kalır) */
.ox-ugr .ox-ugr-sb .ox-dg-ana.ox-ugr-dg:disabled:not(:has(.ox-ugr-don)){background:#e6eaf0;color:var(--ox-soluk)!important;box-shadow:none}
/* şifremi unuttum: ne yapılacağı, numaralı adımlar */
.ox-ugr-yol{list-style:none;display:grid;gap:10px;margin:4px 0 18px;padding:0}
.ox-ugr-yol li{display:flex;align-items:flex-start;gap:12px;padding:13px 15px;border-radius:14px;background:var(--ox-gri-acik);color:var(--ox-metin);font-size:15.5px;line-height:1.4}
.ox-ugr-yol li>b{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--ox-mavi-acik);color:var(--ox-mavi);font-size:13.5px;font-weight:700}
.ox-ugr-yol li>span{flex:1;min-width:0;padding-top:2px;overflow-wrap:anywhere}
/* bölünmesin (e-posta) */
.ox-ugr-nb{white-space:nowrap}
@media (prefers-reduced-motion:reduce){.ox-ugr-adim li,.ox-ugr-kural li,.ox-ugr-kural .ox-i{transition:none}}
`);
}
// şifre göster/gizle: formdaki her şifre alanının kendi düğmesi
function ugrGozler(kap) {
  kap.querySelectorAll('[data-ugr-goz]').forEach(b => b.addEventListener('click', () => { const i = b.parentElement.querySelector('input'), acik = i.type === 'password'; i.type = acik ? 'text' : 'password'; b.classList.toggle('acik', acik); b.setAttribute('aria-pressed', acik); b.setAttribute('aria-label', acik ? 'Şifreyi gizle' : 'Şifreyi göster'); }));
}
// alana yazınca o alanın hatası kalkar
const ugrGirdiTemizle = (f, degis) => f.addEventListener('input', ev => { const a = ev.target.closest('.ox-ugr-alan'); if (a && a.classList.contains('hatali')) { a.classList.remove('hatali'); ev.target.removeAttribute('aria-invalid'); a.querySelector('.ox-ugr-ipucu').hidden = true; } if (degis) degis(ev.target); });
function ogrenciGirisEkrani(not) {
  B.sdkHazirla();
  document.body.classList.remove('portal-modu', 'ox-modu', 'ox-tam-acik', 'ox-akis-acik'); document.title = 'Öğrenci girişi · mdSinyal';
  ugrOgrStil();
  const { oi, esc } = OXU;
  const { govde, alan, alanHata, temizle, uyari, yukle, birak, ac } = ugrKabuk('Öğrenci uygulaması');
  let tel = '';
  // YON-002: e-posta (e-postası olmayan eski öğrenci telefonla girer)
  const telAlan = () => alan('tel', 'text', oi('mesaj'), 'E-postan', `inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" required value="${esc(tel)}"`, false, 'E-postan (yoksa cep telefonun)');
  const ortak = f => ugrGirdiTemizle(f, t => { if (t.name === 'tel') tel = t.value; });

  function girisGoster(odak, anim = true) {
    ac(`${OXU.sayfaBas('Öğrenci girişi', 'E-postan ve şifrenle gir. E-postan yoksa kursun verdiği cep telefonu numarasıyla girebilirsin.')}
      ${not ? `<div class="ox-ugr-bilgi" role="status">${oi('uyari')}<span>${esc(not)}</span></div>` : ''}
      <form class="ox-ugr-form" novalidate>
        ${telAlan()}
        ${alan('sifre', 'password', oi('kilit'), 'Şifren', 'autocomplete="current-password" required', true)}
        <div class="ox-ugr-uyari" role="alert" hidden></div>
        <button type="submit" class="ox-dg ox-dg-ana genis ox-ugr-dg"><span>Giriş yap</span></button>
      </form>
      <div class="ox-ugr-unut"><button type="button" class="ox-bag" data-sifre-unut>Şifremi unuttum</button></div>
      <div data-yardim></div>
      ${OXU.liste([OXU.satir({ baslik: 'Hesabım yok', alt: 'Kursunun verdiği kurs koduyla kendin aç', attrs: { 'data-ogr-kayit': true } })])}
      <p class="ox-ugr-ara">Öğrenci değil misiniz?</p>
      ${OXU.liste([
        OXU.satir({ baslik: 'Öğretmenim', alt: 'Davetle açtığınız <span class="ox-ugr-nb">e-posta</span> ve şifreyle girin', attrs: { 'data-ogretmen-giris': true } }),
        OXU.satir({ baslik: 'Kurs müdürü ya da ön büroyum', alt: 'Kurs hesabının e-postası ve şifresiyle girin', attrs: { 'data-giris-pin': true } }),
      ])}`, odak, anim);
    const f = govde.querySelector('form');
    ortak(f); ugrGozler(f);
    govde.querySelector('[data-sifre-unut]').addEventListener('click', () => { tel = f.tel.value; unuttumGoster(); });
    govde.querySelector('[data-ogr-kayit]').addEventListener('click', () => { location.hash = '#/ogrenci-kayit'; });
    // öğretmen girişi adres çubuğunda da görünsün; personel oturumu kayıtlıyken hashchange onu çizmez, bu yüzden doğrudan çizilir
    govde.querySelector('[data-ogretmen-giris]').addEventListener('click', () => { history.pushState(null, '', '#/ogretmen-giris'); girisEkrani('ogretmen'); window.scrollTo(0, 0); });
    govde.querySelector('[data-giris-pin]').addEventListener('click', () => { location.hash = ''; girisEkrani('pin'); window.scrollTo(0, 0); });
    f.addEventListener('submit', ev => {
      ev.preventDefault(); const btn = f.querySelector('[type=submit]'), yer = govde.querySelector('[data-yardim]');
      temizle(f);
      if (!f.tel.value.includes('@') && f.tel.value.replace(/\D/g, '').length < 10) return alanHata(f, 'tel', 'E-postanı yaz (e-postan yoksa cep telefonunu)');
      if (!f.sifre.value) return alanHata(f, 'sifre', 'Şifreni yaz');
      yukle(btn, 'Giriliyor…'); yer.innerHTML = '';
      B.ogrenciGiris(f.tel.value, f.sifre.value).then(u => u.ilkGiris ? sifreBelirleEkrani(u) : ogrenciModu(u.kurs, u.kod)).catch(x => { birak(btn, 'Giriş yap'); uyari(f, B.hataMetni(x)); if (SH.girisHatasiMi(x) && !/hesap yok/.test(x.kullanici || '')) yardimAc(govde, { kim: f.tel.value.trim(), tur: 'ogrenci' }); });
    });
  }

  // şifremi unuttum: öğrenci hesabını ve yeni geçici şifreyi kurs verir. Girişten talep gönderilmez
  // ("WhatsApp'tan iste" 16 Kas 2026'da kaldırıldı); ekran yalnız ne yapılacağını söyler.
  function unuttumGoster() {
    ac(`${OXU.geri('Giriş', { 'data-ugr-geri': true })}
      ${OXU.sayfaBas('Şifremi unuttum', 'E-postanla girdiysen bağlantı e-postana gelir; telefonla girdiysen yeni şifreni kursun verir.')}
      <form class="ox-ugr-ep" data-ugr-ep style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px"><input class="girdi" name="e" type="email" autocomplete="email" placeholder="E-postan" value="${esc(String(tel).includes('@') ? tel : '')}" style="flex:1;min-width:200px"><button class="ox-dg ox-dg-ana" type="submit"><span>Bağlantı gönder</span></button></form>
      <ol class="ox-ugr-yol">
        <li><b>1</b><span>Kursuna “şifremi unuttum” de: telefonla ara ya da kursa uğra.</span></li>
        <li><b>2</b><span>Kursun sana yeni geçici şifre verir.</span></li>
        <li><b>3</b><span>Cep telefonun ve geçici şifrenle gir, sonra kendi şifreni belirle.</span></li>
      </ol>
      <button type="button" class="ox-dg ox-dg-ana genis ox-ugr-dg" data-ugr-geri2><span>Giriş ekranına dön</span></button>`);
    const h1 = govde.querySelector('.ox-sayfa-bas h1'); h1.tabIndex = -1; h1.focus({ preventScroll: true });
    govde.querySelector('[data-ugr-ep]').addEventListener('submit', ev => { ev.preventDefault(); const v = ev.target.e.value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return bildir('E-postanı yaz', 'uyari'); B.sifreSifirla(v).then(() => bildir('Hesabın varsa şifre yenileme bağlantısı e-postana gönderildi')).catch(() => bildir('Hesabın varsa şifre yenileme bağlantısı e-postana gönderildi')); });
    govde.querySelector('[data-ugr-geri]').addEventListener('click', () => girisGoster('[data-sifre-unut]'));
    govde.querySelector('[data-ugr-geri2]').addEventListener('click', () => girisGoster('[data-sifre-unut]'));
  }

  girisGoster(null, false);
}
// UYG-021: öğrenci kurs koduyla kendi hesabını açar (#/ogrenci-kayit/<KOD>: QR afiş ve kayıt linki). Hesap e-posta + şifreyle açılır,
// istek kursa düşer; kurs kendi kaydıyla eşleştirip onaylayınca öğrenci aynı e-posta ve şifreyle girer. WhatsApp gerekmez.
const ogrKayitYolu = () => { const m = location.hash.match(/^#\/ogrenci-kayit(?:\/([A-Za-z0-9]{0,10}))?$/); return m ? (m[1] || '') : null; };
function ogrenciKayitEkrani(kod0) {
  B.sdkHazirla();
  document.body.classList.remove('portal-modu', 'ox-modu', 'ox-tam-acik', 'ox-akis-acik'); document.title = 'Öğrenci hesabı aç · mdSinyal';
  ugrOgrStil();
  const { oi, esc } = OXU;
  const { govde, alan, alanHata, temizle, uyari, yukle, birak, ac } = ugrKabuk('Öğrenci uygulaması');
  const kod = B.kursKoduNorm(kod0);
  ac(`${OXU.geri('Giriş', { 'data-ugr-geri': true })}
    ${OXU.sayfaBas('Hesabını aç', 'Kursunun verdiği kurs kodunu, adını ve e-postanı yaz, kendi şifreni belirle. Kursun onaylayınca bu e-posta ve şifreyle girersin.')}
    <form class="ox-ugr-form" novalidate>
      ${alan('kod', 'text', oi('kalkan'), 'Kurs kodu', `autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" required value="${esc(kod)}"`, false, 'Kurs kodu (ör. ABC234)')}
      ${alan('ad', 'text', oi('kisi'), 'Adın', 'autocomplete="given-name" required maxlength="60"')}
      ${alan('soyad', 'text', oi('kisi'), 'Soyadın', 'autocomplete="family-name" required maxlength="60"')}
      ${alan('tel', 'tel', oi('tel'), 'Cep telefonun', 'autocomplete="tel" inputmode="tel" required', false, 'Cep telefonun (05xx xxx xx xx)')}
      ${alan('eposta', 'email', oi('mesaj'), 'E-postan', 'autocomplete="email" autocapitalize="off" spellcheck="false" required')}
      ${alan('s1', 'password', oi('kilit'), 'Şifre', 'autocomplete="new-password" required minlength="8"', true, 'Şifre (en az 8 karakter)')}
      ${alan('s2', 'password', oi('kilit'), 'Şifre (tekrar)', 'autocomplete="new-password" required', true)}
      <div class="ox-ugr-uyari" role="alert" hidden></div>
      <button type="submit" class="ox-dg ox-dg-ana genis ox-ugr-dg"><span>Hesabımı aç</span></button>
    </form>
    ${OXU.not('Kurs kodunu kursundan, afişten ya da kursun gönderdiği linkten alırsın. Adın ve telefonun kurstaki kaydınla eşleştirilir.', 'bilgi')}`, kod ? '#ugr-ad' : '#ugr-kod');
  const f = govde.querySelector('form'), btn = f.querySelector('[type=submit]'); ugrGozler(f); ugrGirdiTemizle(f);
  govde.querySelector('[data-ugr-geri]').addEventListener('click', () => { location.hash = '#/ogrenci-giris'; });
  f.addEventListener('submit', ev => {
    ev.preventDefault(); if (btn.disabled) return; temizle(f);
    if (B.kursKoduNorm(f.kod.value).length < 6) return alanHata(f, 'kod', 'Kurs kodunu yaz (6 harf ya da rakam)');
    if (f.ad.value.trim().length < 2) return alanHata(f, 'ad', 'Adını yaz');
    if (!f.soyad.value.trim()) return alanHata(f, 'soyad', 'Soyadını yaz');
    if (!B.telNorm(f.tel.value)) return alanHata(f, 'tel', 'Cep telefonunu yaz (05xx xxx xx xx)');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.eposta.value.trim())) return alanHata(f, 'eposta', 'E-postanı doğru yaz');
    if (f.s1.value.length < 8) return alanHata(f, 's1', 'Şifre en az 8 karakter olmalı');
    if (f.s1.value !== f.s2.value) return alanHata(f, 's2', 'İki şifre aynı değil');
    yukle(btn, 'Gönderiliyor…');
    B.ogrenciKayitOl({ kod: f.kod.value, ad: f.ad.value, soyad: f.soyad.value, tel: f.tel.value, eposta: f.eposta.value, sifre: f.s1.value }).then(r => {
      ac(`${OXU.sayfaBas('İsteğin kursa gitti', `${esc(r.kursAd || 'Kursun')} isteğini kendi kaydınla eşleştirip onaylayınca ${esc(r.eposta)} ve şifrenle girersin.`)}
        ${OXU.not(r.onceden ? 'Bu e-postayla bekleyen isteğin zaten vardı; yeniden gönderilmedi.' : 'E-postana bir doğrulama bağlantısı da gönderdik; dokunman yeterli.', 'bilgi')}
        <button type="button" class="ox-dg ox-dg-ana genis ox-ugr-dg" data-ugr-giris><span>Giriş ekranına git</span></button>`);
      govde.querySelector('[data-ugr-giris]').addEventListener('click', () => { location.hash = '#/ogrenci-giris'; });
    }).catch(x => { birak(btn, 'Hesabımı aç'); uyari(f, B.hataMetni(x)); });
  });
}
function sifreBelirleEkrani(u) {
  document.body.classList.remove('portal-modu', 'ox-modu', 'ox-tam-acik', 'ox-akis-acik'); document.title = 'Şifreni belirle · mdSinyal';
  ugrOgrStil();
  const { oi } = OXU;
  const { govde, alan, temizle, uyari, yukle, birak, ac } = ugrKabuk('Öğrenci uygulaması');
  ac(`<div class="ox-ugr-sb"><ol class="ox-ugr-adim" aria-label="Hesap kurulumu"><li class="ok">${oi('tik')}<span>Giriş</span></li><li class="simdi" aria-current="step"><b>2</b><span>Şifren</span></li><li><b>3</b><span>Panel</span></li></ol>
    ${OXU.sayfaBas('Kendi şifreni belirle', 'Kursunun gönderdiği geçici şifre bir kez kullanılır. Bundan sonra bu şifreyle gireceksin.')}
    <form class="ox-ugr-form" novalidate>
      ${alan('s1', 'password', oi('kilit'), 'Yeni şifre', 'autocomplete="new-password" required minlength="8"', true)}
      ${alan('s2', 'password', oi('kilit'), 'Yeni şifre (tekrar)', 'autocomplete="new-password" required', true)}
      <ul class="ox-ugr-kural" aria-live="polite"><li data-k="uzun">${oi('tik')}<span>En az 8 karakter</span></li><li data-k="ayni">${oi('tik')}<span>İki şifre aynı</span></li></ul>
      <div class="ox-ugr-uyari" role="alert" hidden></div>
      <button type="submit" class="ox-dg ox-dg-ana genis ox-ugr-dg"><span>Kaydet ve panele geç</span></button>
    </form>
    ${OXU.not('Şifreni kimseyle paylaşma. Unutursan kursun sana yeni geçici şifre verir.', 'kilit')}</div>`, '#ugr-s1');
  const f = govde.querySelector('form'), btn = f.querySelector('[type=submit]'); ugrGozler(f); ugrGirdiTemizle(f); sifreIzle(f, btn);
  f.addEventListener('submit', ev => {
    ev.preventDefault(); if (btn.disabled) return;
    temizle(f); yukle(btn, 'Kaydediliyor…');
    B.ogrenciSifreBelirle(f.s1.value).then(() => ogrenciModu(u.kurs, u.kod, true)).catch(x => { birak(btn, 'Kaydet ve panele geç'); uyari(f, B.hataMetni(x)); });
  });
}
async function ogrenciModu(kurs, kod, yeniSifre) {
  if (!document.querySelector('.ogr-kabuk')) bekleEkrani('Öğrenci paneli açılıyor…');
  let k;
  try { k = await B.ogrenciBaglan(kurs, kod); }
  catch (x) { await B.ogrenciCikis(); return ogrenciGirisEkrani('Hesabınız kapatılmış ya da yeni şifre gönderilmiş olabilir. Kursunuzun gönderdiği son bilgilerle girin ya da kursunuzla görüşün.'); }
  oturum.kullanici = { id: 'ogr-' + k.id, ad: tamAd(k), rol: 'ogrenci', kursiyer: k.id };
  // kursa hesabın kullanıldığını bildir (ilk şifre belirleme ve günün ilk girişi)
  const bugun = new Date().toISOString().slice(0, 10); let degisti = false;
  if (yeniSifre && k.hesapAktif !== bugun) { k.hesapAktif = bugun; degisti = true; }
  if (k.sonGiris !== bugun) { k.sonGiris = bugun; degisti = true; }
  if (degisti) kaydet();
  if (location.hash !== '#/ogrenci') history.replaceState(null, '', '#/ogrenci');
  ogrenciCiz(true);
  if (yeniSifre) bildir('Şifreniz kaydedildi');
}
function ogrenciSifreDegistir() {
  girdiKutuStil();
  pencere({ baslik: 'Şifremi değiştir', icerik: `<form id="f-osifre" class="og-giris-form" novalidate>${ogrAlan('eski', 'Şu anki şifren', 'password', 'kilit', 'autocomplete="current-password"')}${ogrAlan('s1', 'Yeni şifre', 'password', 'kilit', 'autocomplete="new-password"')}${ogrAlan('s2', 'Yeni şifre (tekrar)', 'password', 'kilit', 'autocomplete="new-password"')}${SIFRE_KURAL}</form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-osifre">Şifreyi değiştir</button>',
    onAc(d) { const f = d.querySelector('form'), btn = d.querySelector('[form=f-osifre]'); gozBagla(d); sifreIzle(f, btn); f.eski.focus(); f.addEventListener('submit', ev => { ev.preventDefault(); if (btn.disabled) return; if (!f.eski.value) { bildir('Şu anki şifreni yaz', 'uyari'); return f.eski.focus(); } btn.disabled = true; B.ogrenciSifreBelirle(f.s1.value, f.eski.value).then(() => { kapatPencere(); bildir('Şifren değiştirildi'); }).catch(x => { btn.disabled = false; bildir(B.hataMetni(x), 'uyari'); }); }); } });
}
function ogrenciCiz(kaydir) {
  const kok = document.getElementById('uyg');
  if (!kok.querySelector('.ogr-kabuk')) {
    const og = kursiyer(oturum.kullanici.kursiyer), adSoyad = og ? tamAd(og) : (oturum.kullanici.ad || 'Öğrenci');
    kok.innerHTML = `<div class="ogr-kabuk">${OXU.ustCubuk({ logo: APP_LOGO, kurs: S.kurs.ad, ad: adSoyad, foto: og && og.foto })}<header class="app-ust">${APP_LOGO}<span class="app-ust-ad"><b>${e(S.kurs.ad)}</b><small>Öğrenci</small></span><button type="button" class="app-profil" data-hesap aria-label="Hesabım: ${e(adSoyad)}">${basHarf(adSoyad)}</button></header><main id="icerik" class="ogr-icerik"></main></div>`;
  }
  document.body.classList.add('portal-modu'); temaRengi(true);
  const yer = document.getElementById('icerik'); let s;
  try { s = P.ogrenciPortal(); } catch (x) { console.error(x); s = { html: `<div class="og-giris-kart" style="margin:24px auto"><h2 style="font-size:20px">Ekran açılamadı</h2><p style="margin:8px 0 16px">Bir sorun oldu; verilerin güvende. Yeniden dene.</p><button class="dg dg-ana og-giris-dg" data-yeniden-yukle>Yeniden yükle</button></div>` }; }
  document.title = S.kurs.ad + ' · Öğrenci paneli';
  const kap = document.createElement('div'); kap.className = 'sayfa sayfa-ogrenci'; kap.innerHTML = s.html; yer.replaceChildren(kap);
  if (s.baglan) { try { s.baglan(kap); } catch (x) { console.error(x); } }
  if (kaydir) window.scrollTo(0, 0);
}
// mdSinyal Yönetim kabuğu: menü yok; üstte hesap adı, kullanıcı ve çıkış
function yonetimCiz(kaydir) {
  const kok = document.getElementById('uyg'), u = oturum.kullanici;
  // uygulama kabuğu: öğrenci ve öğretmen ekranlarıyla aynı üst çubuk; çıkış profil düğmesinin alttan açılan sayfasında
  if (!kok.querySelector('.ort-kabuk')) kok.innerHTML = `<div class="ort-kabuk"><header class="app-ust">${APP_LOGO}<span class="app-ust-ad"><b>mdSinyal Yönetim</b><span id="bulut-durum" class="bulut-durum" role="status"></span></span><button type="button" class="app-profil" data-hesap aria-label="Hesabım: ${e(u.ad)}">${basHarf(u.ad)}</button></header><main class="ort-ana" id="icerik"></main></div>`;
  document.body.classList.add('portal-modu', 'hero-acik'); document.body.classList.remove('hero-gunduz');
  { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#0b1830'; }
  document.title = 'mdSinyal Yönetim';
  const yer = document.getElementById('icerik'), kap = document.createElement('div');
  kap.className = 'sayfa sayfa-yonetim';
  if (!ORT.yonetimModu()) kap.innerHTML = `<div class="kart"><div class="bos"><b>Bu hesap henüz kurulmadı</b><p>Servet Sakar hesabı kurduğunda gelir paylaşımı burada görünür.</p></div></div>`;
  else { try { kap.innerHTML = ORT.yonetimHtml(u.rol); } catch (x) { console.error(x); kap.innerHTML = '<div class="kart"><div class="bos"><b>Ekran açılamadı</b><p>Sayfayı yenileyin.</p></div></div>'; } }
  yer.replaceChildren(kap); GU.anaEkranaEkle(kap);
  if (ORT.yonetimModu()) { try { ORT.yonetimBaglan(kap, u.rol, yenile); } catch (x) { console.error(x); } }
  const shg = kap.querySelector('[data-sh-gomulu]'); if (shg && u.rol === 'mudur') SH.sahipGomulu(shg, B.bulut.eposta, shg.dataset.shGor || 'hesaplar');
  if (u.rol === 'mudur' && ORT.yonetimModu()) { SH.hazirla(); kap.addEventListener('click', ev => { if (ev.target.closest('[data-yn-sekme="hesaplar"],[data-yn-sekme="destek"]')) SH.otoBaglan(); }, true); }
  B.durumYaz();
  if (kaydir) window.scrollTo(0, 0);
}
// Yeni ve boş bir hesabı bir kez mdSinyal Yönetim hesabına çevirme ekranı (#/yonetim-kur)
function yonetimKurCiz() {
  if (!document.getElementById('icerik')) iskelet();
  const yer = document.getElementById('icerik'), kap = document.createElement('div');
  kap.className = 'sayfa sayfa-yonetim-kur';
  kap.innerHTML = ORT.kurulabilir() ? ORT.kurulumHtml() : `<div class="kart"><div class="bos"><b>Bu hesapta kurs kayıtları var</b><p>mdSinyal Yönetim için ayrı bir e-postayla yeni ve boş bir hesap açın.</p></div></div>`;
  yer.replaceChildren(kap);
  document.getElementById('ust-baslik').textContent = 'mdSinyal Yönetim';
  document.title = 'mdSinyal Yönetim kurulumu';
  ORT.kurulumBaglan(kap, () => { location.hash = ''; location.reload(); });
}
// Kursun kapısı: mdsinyal.com/<kısa ad> buraya açılır. Kurs adı ve WhatsApp numarası linkin içinde gelir (sunucudan veri okunmaz).
function kapiEkrani() {
  const p = new URLSearchParams(location.hash.split('?')[1] || ''), ad = (p.get('ad') || 'Sürücü kursu').slice(0, 80), wp = (p.get('wp') || '').replace(/\D/g, '').slice(0, 15);
  document.title = ad + ' · mdSinyal';
  const wa = m => 'https://wa.me/' + wp + '?text=' + encodeURIComponent(m);
  document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}
    <h1>${e(ad)}</h1><p>Kursumuzun mdSinyal sayfası. Ne yapmak istiyorsunuz?</p>
    <div class="kapi-dg" style="display:grid;gap:10px;margin-top:8px">
      <a class="dg dg-koyu" href="#/ogrenci-giris">Öğrenci girişi</a>
      <a class="dg dg-cizgi" href="#/ogretmen-giris">Öğretmen girişi</a>
      <a class="dg dg-cizgi" href="#/giris">Kurs ekibi girişi</a>
      ${wp ? `<a class="dg dg-wp" href="${wa('Merhaba, kayıt olmak istiyorum.')}" target="_blank" rel="noopener">Kayıt için WhatsApp’tan yaz</a><a class="dg dg-hafif" href="${wa('Merhaba, bir sorum var.')}" target="_blank" rel="noopener">Kursa soru sor</a>` : ''}
    </div></div></div>`;
}
// Davet linki: #/davet/<kurs>/<kod>
// YON-074: numara devri onay sayfası (öğrenci eski hesabıyla girip onaylar; oturum hemen kapanır)
const devirYolu = () => { const m = location.hash.match(/^#\/devir\/(905\d{9})\/([a-z0-9]{8,})$/); return m ? [m[1], m[2]] : null; };
function devirEkrani() {
  const [tel, kod] = devirYolu(), kok = document.getElementById('uyg'); document.title = 'Numara devri · mdSinyal';
  kok.innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}<h1>Numara devri</h1><p>Yeni kursun öğrenci uygulamasında hesabının açılabilmesi için numaranı (${e(B.telGoster(tel))}) eski kursundaki hesaptan almak istiyor. Onaylarsan eski kurstaki öğrenci hesabın kapanır.</p>
    <form class="giris-eposta" novalidate data-devir-form><label>Cep telefonun ya da e-postan<input name="g" autocomplete="username" value="${e(B.telGoster(tel))}"></label><label>Eski hesabının şifresi<input name="s" type="password" autocomplete="current-password" required></label>
    <button class="dg dg-ana" type="submit">Devri onayla</button></form><p class="giris-baglar" style="font-size:13px">Bu isteği sen istemediysen sayfayı kapat; hiçbir şey değişmez.</p></div></div>`;
  const f = kok.querySelector('[data-devir-form]');
  f.addEventListener('submit', ev => { ev.preventDefault(); const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Onaylanıyor…';
    B.devirOnayla(tel, kod, f.g.value, f.s.value).then(r => { kok.querySelector('.giris-levha').innerHTML = `${LOGO}<h1>Onaylandı</h1><p>${e(r.yeniKursAd || 'Yeni kursun')} hesabını açınca giriş bilgilerin WhatsApp’tan gelir. Eski kurstaki hesabın kapanıyor.</p>`; })
      .catch(x => { btn.disabled = false; btn.textContent = 'Devri onayla'; bildir(B.hataMetni(x), 'uyari'); }); });
}
const davetYolu = () => { const m = location.hash.match(/^#\/davet\/([^/]+)\/([^/]+)$/); return m ? [m[1], m[2]] : null; };
async function davetEkrani() {
  const [kurs, kod] = davetYolu();
  bekleEkrani('Davet açılıyor…');
  let dv = null; try { dv = await B.davetGetir(kurs, kod); } catch (x) { }
  const kok = document.getElementById('uyg');
  if (!dv) { kok.innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}<h1>Bu davet geçersiz</h1><p>Linkin süresi dolmuş ya da daha önce kullanılmış. Kurs müdüründen yeni bir davet linki isteyin.</p><p class="giris-baglar"><button type="button" data-geri>Giriş ekranına git</button></p></div></div>`; kok.querySelector('[data-geri]').addEventListener('click', () => { location.hash = ''; girisEkrani('pin'); }); return; }
  const ROL_T = { mudur: 'kurs müdürü', sekreter: 'ön büro çalışanı', usta: 'öğretmen', ortak: 'ortak (yalnız görüntüleme)' };
  document.title = 'Davet · mdSinyal';
  kok.innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}
    <h1>${e(dv.kursAd)}</h1><p>${e(dv.davetEden || 'Kurs müdürü')} sizi mdSinyal’e ${ROL_T[dv.rol] || dv.rol} olarak davet etti. Kendi e-postanız ve şifrenizle hesabınızı açın.</p>
    <form class="giris-eposta" novalidate>
      <label data-yeni>Adınız soyadınız<input name="ad" value="${e(dv.ad)}" autocomplete="name"></label>
      <label>E-posta<input name="eposta" type="email" inputmode="email" autocomplete="username" required></label>
      <label><span data-sifre-et>Şifre belirleyin (en az 8 karakter)</span><input name="sifre" type="password" autocomplete="new-password" required></label>
      <label data-yeni>Şifre (tekrar)<input name="sifre2" type="password" autocomplete="new-password"></label>
      <button class="dg dg-koyu" type="submit">Hesabımı aç ve katıl</button></form>
    <p class="giris-baglar"><button type="button" data-mevcut>Zaten mdSinyal hesabım var</button></p></div></div>`;
  let yeni = true;
  const f = kok.querySelector('form'), btn = f.querySelector('[type=submit]');
  kok.querySelector('[data-mevcut]').addEventListener('click', ev => { yeni = !yeni; kok.querySelectorAll('[data-yeni]').forEach(x => { x.hidden = !yeni; }); kok.querySelector('[data-sifre-et]').textContent = yeni ? 'Şifre belirleyin (en az 8 karakter)' : 'Şifre'; f.sifre.autocomplete = yeni ? 'new-password' : 'current-password'; btn.textContent = yeni ? 'Hesabımı aç ve katıl' : 'Giriş yap ve katıl'; ev.target.textContent = yeni ? 'Zaten mdSinyal hesabım var' : 'Yeni hesap açacağım'; });
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    if (yeni && f.ad.value.trim().length < 3) return bildir('Adınızı ve soyadınızı yazın', 'uyari');
    if (!/^\S+@\S+\.\S+$/.test(f.eposta.value.trim())) return bildir('E-posta adresini kontrol edin', 'uyari');
    if (yeni && f.sifre.value.length < 8) return bildir('Şifre en az 8 karakter olmalı', 'uyari');
    if (yeni && f.sifre.value !== f.sifre2.value) { bildir('İki şifre aynı değil; şifreyi tekrar yazın', 'uyari'); return f.sifre2.focus(); }
    btn.disabled = true; const t = btn.textContent; btn.textContent = 'Bağlanıyor…';
    B.davetKabul(kurs, kod, { eposta: f.eposta.value.trim(), sifre: f.sifre.value, ad: f.ad.value.trim(), yeni })
      .then(u => { location.hash = ''; bulutOturumu(u, true); bildir(dv.kursAd + ' hesabına katıldınız'); })
      .catch(x => { btn.disabled = false; btn.textContent = t; bildir(B.hataMetni(x), 'uyari'); });
  });
}
document.addEventListener('click', ev => { if (ev.target.closest('[data-yeniden-yukle]')) location.reload(); });
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-cikis]')) kapatPencere();
  if (ev.target.closest('[data-hesap]')) { if (oturum.kullanici && oturum.kullanici.rol === 'usta' && document.body.classList.contains('ox-modu')) return import('./usta/ekran.js?v=234').then(m => { m.hesapAc(); yenile(true); }); return hesapSayfasi(); }
  if (ev.target.closest('[data-destek]')) return destekPenceresi();
  // DIG-029: yeni soru bankası örneği yalnız demo şeridinden açılır (js/soru-ornek.js)
  if (ev.target.closest('[data-soru-ornek]') && ziyaretci()) return import('./soru-ornek.js?v=234').then(m => m.soruOrnekAc()).catch(() => bildir('Soru örneği yüklenemedi; bağlantınızı kontrol edip tekrar deneyin', 'uyari'));
  // Yönetim: Hesaplar telefonda profil menüsünden açılır (alt çubuk 6 sekme kalır)
  if (ev.target.closest('[data-yn-hesaplar]')) { kapatPencere(); ORT.sekmeSec('hesaplar'); yonetimCiz(true); SH.otoBaglan(); return; }
  if (ev.target.closest('[data-ogr-cikis]')) return B.ogrenciCikis().then(() => location.replace(new URL('giris/?cikis=1', location.href.split('#')[0].replace(/[^/]*$/, '')).href));
  if (ev.target.closest('[data-ogr-sifre]')) { kapatPencere(); return ogrenciSifreDegistir(); }
  if (ev.target.closest('[data-cikis]') && oturum.kullanici && oturum.kullanici.bulut) { const yon = ORT.yonetimModu() || oturum.kullanici.rol === 'ortak'; islem('Çıkış yaptı'); kaydet(); B.cikisYap().then(() => { try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } if (yon) { location.hash = '#/yonetim'; location.reload(); } else location.replace(new URL('giris/?cikis=1', location.href.split('#')[0].replace(/[^/]*$/, '')).href); }); return; }
  if (ev.target.closest('[data-cikis]')) { const zy = ziyaretci(); islem('Çıkış yaptı'); kaydet(); oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); localStorage.removeItem(HAREKET_DEMO); } catch (x) { } location.hash = ''; girisEkrani(zy ? 'tanitim' : 'pin'); window.scrollTo(0, 0); }
  const g = ev.target.closest('[data-geri-al]'); if (g) { if (geriAl()) { bildir('Son işlem geri alındı'); yenile(); } }
});

// Hareketsiz kalınca oturumu kapat (Ayarlar › Güvenlik)
// Son hareket cihazda da tutulur (localStorage, sekmeler arasında ortak): sekme kapatılıp sonra açılınca süre dolmuşsa yeniden giriş istenir;
// iki sekme açıksa boşta duran sekme, öbüründe çalışılırken oturumu kapatmaz. Kurs hesabı 'sinyal-son-hareket', demo (PIN ve tanıtım) 'sinyal-son-hareket-demo'.
const HAREKET = 'sinyal-son-hareket', HAREKET_DEMO = 'sinyal-son-hareket-demo';
const hareketAnahtar = () => oturum.kullanici && oturum.kullanici.bulut ? HAREKET : HAREKET_DEMO;
const oturumDk = () => { const v = S && S.guvenlik ? S.guvenlik.oturumDk : 0; return +v > 0 ? +v : 0; };  // 0: kendiliğinden kapanmaz
const hareketOku = a => { try { const h = JSON.parse(localStorage.getItem(a) || 'null'); return h && +h.t ? h : null; } catch (x) { return null; } };
let sonHareket = Date.now(), sonYazim = 0, sonYazilan = 0;
// en fazla 30 sn'de bir yazılır. zorla = true: girişte hemen; 'bekleyen': zamanlayıcıda, yazılmamış hareket varsa 30 sn beklemeden.
// Öbür sekmenin yazdığı daha yeni değer geri alınmaz (büyük olan kalır).
const hareketYaz = zorla => {
  const u = oturum.kullanici; if (!u || u.rol === 'ogrenci') return;
  if (!zorla && Date.now() - sonYazim < 30e3) return;
  if (zorla !== true && sonHareket <= sonYazilan) return;
  const a = hareketAnahtar(), ortak = hareketOku(a), t = Math.max(sonHareket, ortak ? ortak.t : 0);
  sonYazim = Date.now(); sonYazilan = sonHareket;
  try { localStorage.setItem(a, JSON.stringify({ t, dk: oturumDk() })); } catch (x) { }
};
['click', 'keydown', 'touchstart', 'scroll'].forEach(t => document.addEventListener(t, () => { sonHareket = Date.now(); hareketYaz(); }, { passive: true, capture: true }));
// öbür sekmedeki hareket bu sekmenin sayacını da ileri alır
window.addEventListener('storage', ev => { if (!oturum.kullanici || ev.key !== hareketAnahtar()) return; try { const h = JSON.parse(ev.newValue || 'null'); if (h && +h.t > sonHareket) { sonHareket = +h.t; sonYazilan = Math.max(sonYazilan, sonHareket); } } catch (x) { } });
setInterval(() => {
  if (!oturum.kullanici || imzaLinki() || oturum.kullanici.rol === 'ogrenci') return;
  if (sonHareket > sonYazilan) hareketYaz('bekleyen');
  const dk = oturumDk(), ortak = hareketOku(hareketAnahtar()), son = Math.max(sonHareket, ortak ? ortak.t : 0);
  if (!dk || Date.now() - son < dk * 60e3) return;
  islem('Oturum kapandı', dk + ' dk hareketsiz'); kaydet();
  if (oturum.kullanici.bulut) { oturum.kullanici = null; B.cikisYap().then(() => { try { sessionStorage.removeItem('sinyal-oturum'); sessionStorage.setItem('sinyal-kapandi', String(dk)); } catch (x) { } location.reload(); }); return; }
  const zy = !!oturum.kullanici.ziyaretci; oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); localStorage.removeItem(HAREKET_DEMO); } catch (x) { }
  girisEkrani(zy ? 'tanitim' : 'pin'); bildir(dk + ' dakika işlem yapılmadığı için oturum kapandı', 'uyari');
}, 30e3);

// Uzaktan imzalar: kursiyer imzalayınca kayda kendiliğinden işlenir
setInterval(() => { if (oturum.kullanici && !imzaLinki() && oturum.kullanici.rol !== 'ogrenci') { IM.imzaKontrol(); if (oturum.kullanici.rol !== 'usta') { OZ.gelenKontrol(); durumlariGuncelle().then(d => { if (d && rota().ad === 'mesajlar') yenile(); }); } } }, 20e3);
setTimeout(() => { if (oturum.kullanici && !imzaLinki() && oturum.kullanici.rol !== 'ogrenci') IM.imzaKontrol(); }, 3000);

// Ziyaretçi modunda arama ve doğrudan WhatsApp linkleri gerçek numaralara gitmesin
document.addEventListener('click', ev => {
  if (!ziyaretci()) return;
  const a = ev.target.closest('a[href^="tel:"], a[href^="sms:"], a[href*="wa.me/"]'); if (!a) return;
  ev.preventDefault(); bildir('Demo görünümünde arama ve WhatsApp kapalı; gerçek kullanımda bu düğme kişiyi arar ya da yazar');
}, true);

sadeDilBaslat();
eklentiYenile(() => { if (oturum.kullanici && document.getElementById('icerik')) yenile(); });
eklentiBaslat();
// Telefona kurulabilir uygulama: servis çalışanı (yalnız https) ve Android'in “yükle” isteği
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); window.__kurulum = ev; document.querySelectorAll('[data-kur-android]').forEach(b => { b.hidden = false; }); });
const ogrKayit = (() => { try { return JSON.parse(localStorage.getItem('sinyal-ogrenci') || 'null'); } catch (x) { return null; } })();
if (location.hash === '#/sahip') { ORT.sekmeSec('hesaplar'); history.replaceState(null, '', '#/yonetim'); }
// demoyu gezen ziyaretçi giriş linkine tıklarsa demo kapanır, giriş ekranı açılır
if (GIRIS_YOL[location.hash] && oturum.kullanici && oturum.kullanici.ziyaretci) { oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } }
if (location.hash.startsWith('#/kapi')) kapiEkrani();
else if (imzaLinki()) imzaSayfasiAc();
else if (ogrYolu()) eskiLink();
else if (location.hash === '#/ogrenci-giris') ogrenciGirisEkrani(B.bulutKayitli() ? 'Bu cihazda bir personel hesabı açık. Öğrenci olarak girersen o oturum kapanır.' : undefined);
else if (ogrKayitYolu() != null) ogrenciKayitEkrani(ogrKayitYolu());
else if (devirYolu()) devirEkrani();
else if (davetYolu()) davetEkrani();
else if (kursDavetYolu()) kursDavetEkrani();
else if (yonetimKurYolu() && !B.bulutKayitli()) yonetimHesapEkrani(yonetimKurYolu());
else if (yonetimGirisYolu() && !B.bulutKayitli()) yonetimGirisEkrani();
else if ((location.hash === '#/demo' || demoSoru() != null) && !B.bulutKayitli() && !oturum.kullanici) demoyaGir();
else if (demoSoru() != null && oturum.kullanici && oturum.kullanici.ziyaretci) location.hash = '#/mevzuat?q=' + demoSoru();
else if (GIRIS_YOL[location.hash] && !B.bulutKayitli() && !oturum.kullanici) girisEkrani(GIRIS_YOL[location.hash]);
else if (ogrKayit && !B.bulutKayitli()) {
  // son görülen panel önbellekten hemen; oturum ve güncel veri arkadan gelir
  const ok = ogrKayit.kod && B.ogrenciOnbellek(ogrKayit.kod);
  if (ok) { oturum.kullanici = { id: 'ogr-' + ok.id, ad: tamAd(ok), rol: 'ogrenci', kursiyer: ok.id }; ogrenciCiz(true); } else bekleEkrani('Öğrenci paneli açılıyor…'); B.ogrenciOturumu().then(u => !u ? ogrenciGirisEkrani() : u.ilkGiris ? sifreBelirleEkrani(u) : ogrenciModu(u.kurs, u.kod)).catch(() => ogrenciGirisEkrani()); }
// son hareket kaydı yoksa (silinmiş ya da eski sürümden kalmış cihaz) güvenli varsayılan: oturum kapanır, bir kez yeniden giriş istenir
else if (B.bulutKayitli() && (() => { const h = hareketOku(HAREKET); return !!(h && +h.dk > 0 && Date.now() - h.t > h.dk * 60e3); })()) {
  oturum.kullanici = null; bekleEkrani('Oturum kapatılıyor…');
  B.cikisYap().finally(() => { girisEkrani('pin'); setTimeout(() => bildir('Uzun süre işlem yapılmadığı için oturum kapandı; tekrar giriş yapın', 'uyari'), 400); });
}
else if (B.bulutKayitli()) {
  oturum.kullanici = null; bekleEkrani('Kurs verisi yükleniyor…');
  const girisIstendi = GIRIS_YOL[location.hash];  // giriş sayfasından gelindi ama bu cihazda zaten açık oturum var
  B.bulutBaslat().then(u => { if (u) { bulutOturumu(u, false); if (girisIstendi) setTimeout(() => acikOturumSor(u), 700); } else girisEkrani('pin'); }).catch(x => { girisEkrani('pin'); bildir(B.hataMetni(x), 'uyari'); });
  const kp = sessionStorageAl('sinyal-kapandi'); if (kp) { try { sessionStorage.removeItem('sinyal-kapandi'); } catch (x) { } setTimeout(() => bildir(kp + ' dakika işlem yapılmadığı için oturum kapandı; tekrar giriş yapın', 'uyari'), 400); }
}
else if (sessionStorageAl('sinyal-kapandi')) { const kp = sessionStorageAl('sinyal-kapandi'); try { sessionStorage.removeItem('sinyal-kapandi'); } catch (x) { } oturum.kullanici = null; girisEkrani('pin'); setTimeout(() => bildir(kp + ' dakika işlem yapılmadığı için oturum kapandı; tekrar giriş yapın', 'uyari'), 400); }
// demo (PIN ya da tanıtım) oturumu sekme geri açılınca/çoğaltılınca sessionStorage'dan döner: süre burada da denetlenir; kayıt yoksa kapanır
else if (oturum.kullanici && !oturum.kullanici.bulut && oturum.kullanici.rol !== 'ogrenci' && (() => { const h = hareketOku(HAREKET_DEMO); return !h || Date.now() - h.t > (h.dk || 30) * 60e3; })()) {
  const zy = !!oturum.kullanici.ziyaretci; oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); localStorage.removeItem(HAREKET_DEMO); } catch (x) { }
  girisEkrani(zy ? 'tanitim' : 'pin'); if (!zy) setTimeout(() => bildir('Uzun süre işlem yapılmadığı için oturum kapandı; tekrar giriş yapın', 'uyari'), 400);  // tanıtım ziyaretçisine uyarı gösterilmez
}
else if (oturum.kullanici && !oturum.kullanici.bulut && oturum.kullanici.rol === 'ogrenci') ogrenciCiz(true);
else if (oturum.kullanici && !oturum.kullanici.bulut) { iskelet(); if (!location.hash) location.hash = anaSayfa(); sonAd = rota().ad; yenile(); }
else girisEkrani(location.hash.startsWith('#/imza-geldi/') ? 'pin' : 'tanitim');

// Yeni sürüm bildirimi: kalıcı şerit, ana ekranda sürüm alanı, temiz güncelleme (js/guncelleme.js)
GU.baslat();
// kullanım analizi (kişisel veri içermez; kullanim.js): ekran, düğme adı, süre, hata türü sayılır, günde bir özet yazılır
setTimeout(() => import('./kullanim.js?v=234').then(m => m.baslat()).catch(() => { }), 1500);
