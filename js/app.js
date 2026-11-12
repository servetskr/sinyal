import { S, tamAd, gecikenler, eksikEvrak, egitmen, kursiyer, oturum, islem, kaydet, geriAl, gorunum, subeSec } from './veri.js?v=138';
import { ik, e, pencere, kapatPencere, bugunMetni, bildir, ziyaretci, sadeDil, sadeDilBaslat } from './ui.js?v=138';
import * as Y1 from './sayfalar1.js?v=138';
import * as Y2 from './sayfalar2.js?v=138';
import * as P from './portal.js?v=138';
import * as Y3 from './sayfalar3.js?v=138';
import * as Y4 from './sayfalar4.js?v=138';
import * as Y5 from './sayfalar5.js?v=138';
import * as IM from './imza.js?v=138';
import { zamanlayiciBaslat, kurallariHazirla } from './zamanlayici.js?v=138';
import * as SN from './senaryo.js?v=138';
import * as OZ from './ozellik.js?v=138';
import { durumlariGuncelle } from './mesaj.js?v=138';
import { yeniMenu } from './yeni.js?v=138';
import * as B from './bulut.js?v=138';
import { eklentiBaslat, eklentiYenile } from './eklenti.js?v=138';
import * as AN from './analiz.js?v=138';
import * as ORT from './ortak.js?v=138';

const SAYFALAR = {
  genel: Y1.genel, adaylar: Y1.adaylar, kursiyerler: Y1.kursiyerler, kursiyer: Y1.kursiyerDetay,
  plan: Y1.plan, teorik: Y1.teorik, sinavlar: Y2.sinavlar, kasa: Y2.kasa, filo: Y2.filo,
  mesajlar: Y2.mesajlar, meb: Y2.meb, raporlar: Y2.raporlar, ayarlar: Y2.ayarlar,
  egitmen: P.egitmenPortal, ogrenci: P.ogrenciPortal,
  belgeler: Y3.belgeler, kayit: Y3.kayitSayfasi, guven: Y3.guven, mebbis: Y3.mebbisAsistani,
  sosyal: Y4.sosyal, kurulum: Y5.kurulum, 'imza-geldi': IM.imzaGeldi, senaryo: SN.senaryolar, karlilik: OZ.karlilik, analiz: AN.analiz,
};
const ROL_AD = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici', ortak: 'Ortak' };
const YASAK = { mudur: [], sekreter: ['raporlar', 'ayarlar', 'guven', 'kurulum', 'senaryo', 'karlilik', 'analiz'], usta: Object.keys(SAYFALAR).filter(k => !['egitmen', 'imza-geldi'].includes(k)), ortak: Object.keys(SAYFALAR) };
const izinli = ad => { const u = oturum.kullanici; return u && !YASAK[u.rol].includes(ad) && !((u.ziyaretci || u.bulut) && ad === 'senaryo'); };

// Menü günlük işe göre: önce bugün, sonra öğrenci işleri, para, kurum işleri, analiz; az kullanılanlar en altta
const MENU = [
  ['Bugün', [['genel', 'Genel bakış', '↑'], ['mesajlar', 'Mesajlar', '↗'], ['adaylar', 'Yeni öğrenciler', '↗']]],
  ['Öğrenciler', [['kursiyerler', 'Kursiyerler', '→'], ['plan', 'Direksiyon planı', '→'], ['teorik', 'Teorik dersler', '→'], ['sinavlar', 'Sınavlar', '→']]],
  ['Para', [['kasa', 'Kasa ve ödemeler', '→']]],
  ['Kurum', [['meb', 'MEB işlemleri', '→'], ['belgeler', 'Belgeler ve çıktılar', '→'], ['filo', 'Ekip ve araçlar', '→']]],
  ['Analiz', [['analiz', 'Analiz', '→'], ['raporlar', 'Raporlar', '→'], ['karlilik', 'Kârlılık ve kapasite', '→']]],
  ['Diğer', [['sosyal', 'Sosyal medya asistanı', '↗'], ['kayit', 'Evden kayıt sayfası', '↗'], ['ogrenci', 'Kursiyer ekranı', '↗'], ['senaryo', 'Demo senaryoları', '↗'], ['kurulum', 'Kurulum', '→'], ['guven', 'Verileriniz ve güvenlik', '→'], ['ayarlar', 'Ayarlar', '→']]],
];
// Aramada sayfaların yanında özellikler de çıkar (ör. "müşavir" yazınca müşavir paketi)
const OZELLIKLER = [['Müşavir paketi (Excel)', '#/ayarlar/entegrasyon', 'muhasebe fatura e-arşiv luca'], ['Sunum verisi (örnek dersler)', '#/ayarlar/kurs', 'sunum örnek ders öğretmen tanıtım'], ['Otomatik planla', '#/plan', 'ders dağıt program'], ['WhatsApp hattını bağla', '#/ayarlar/kurs', 'otomatik mesaj api'], ['İki adımlı giriş', '#/ayarlar/guvenlik', 'doğrulama kodu güvenlik'], ['Ders defteri (öğrenci onayı)', '#/ayarlar/ogrenciapp', 'itiraz onay'], ['Öğrenci uygulaması ayarları', '#/ayarlar/ogrenciapp', 'kursiyer ekranı'], ['Sınıf ve ücretler', '#/ayarlar/sinif', 'fiyat taban ücret'], ['Kullanıcılar ve davet', '#/ayarlar/kullanici', 'çalışan personel'], ['Yedekler', '#/ayarlar/guvenlik', 'yedek geri yükle'], ['İşlem geçmişi', '#/ayarlar/gecmis', 'log kim ne yaptı'], ['KVKK ve anonimleştirme', '#/ayarlar/kvkk', 'kişisel veri imha'], ['Veri aktarımı (Excel)', '#/ayarlar/aktarim', 'içe aktar eski program'], ['Denetim modu', '#/meb', 'müfettiş denetim'], ['MEBBİS Yardımcısı', '#/meb', 'eklenti chrome'], ['Puantaj ve personel özeti', '#/ayarlar/entegrasyon', 'bordro maaş prim']];


let rol = 'yonetici';
try { rol = localStorage.getItem('sinyal-rol') || 'yonetici'; } catch (x) { }

function sayaclar() {
  return {
    adaylar: [S.adaylar.filter(a => a.asama === 'Yeni').length, false],
    kasa: [S.kursiyerler.filter(k => gecikenler(k).length).length, false],
    meb: [S.kursiyerler.filter(k => !k.mebIslendi && !eksikEvrak(k).length).length, true],
    sosyal: [S.sosyal.yorumlar.filter(y => y.durum === 'devir' || y.durum === 'onay').length + S.devredilen.length, false],
    kurulum: [Y5.kurulumAdimlari().filter(x => !x[1]).length, true],
  };
}

// Telefon uygulaması kabuğu (öğrenci ve öğretmen): üst çubukta kurs adı ve yuvarlak profil düğmesi; hesap işleri alttan açılan sayfada
const APP_LOGO = '<svg class="logo-isaret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#111" stroke-width="1.2"/><path d="M12 8v5M12 15.6v.3" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg>';
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
  pencere({ baslik: 'Hesabım', alt: true, icerik: `<div class="hs-kim"><span class="app-profil buyuk" aria-hidden="true">${basHarf(ad)}</span><div><b>${e(ad)}</b><small>${e(S.kurs.ad)} · ${ogr ? 'Öğrenci' : ROL_AD[u.rol]}</small></div></div>
    <div class="hs-liste">${ogr ? `<button type="button" data-ogr-sifre>${satir('kilit', 'Şifremi değiştir')}${ik('sag')}</button>` : ''}
      ${tel ? `<a href="tel:${e(tel)}">${satir('tel', 'Kursu ara', e(S.kurs.tel))}${ik('sag')}</a>` : ''}</div>
    <div class="hs-liste"><button type="button" class="hs-cikis" ${ogr ? 'data-ogr-cikis' : 'data-cikis'}>${satir('cikis', u.bulut || ogr ? 'Çıkış yap' : 'Kullanıcı değiştir', '', 'kirmizi')}</button></div>` });
}
function iskelet() {
  kurallariHazirla(); zamanlayiciBaslat();
  const say = sayaclar();
  // az kullanılanlar ("Diğer") kapalı bir grupta durur; içindeki sayfa açıkken grup açık gelir
  const satir = ([k, t, i]) => `<a href="#/${k}" data-menu="${k}"><span class="ok" aria-hidden="true">${i}</span><span>${t}</span>${say[k] && say[k][0] ? `<b class="${say[k][1] ? '' : 'uyar'}">${say[k][0]}</b>` : ''}</a>`;
  const menu = MENU.map(([g, l]) => [g, l.filter(([k]) => izinli(k))]).filter(([, l]) => l.length).map(([g, l]) => g === 'Diğer' ? `<details class="yan-grup" ${l.some(([k]) => location.hash.startsWith('#/' + k)) ? 'open' : ''}><summary class="yan-baslik">${g}</summary>${l.map(satir).join('')}</details>` : `<div class="yan-baslik">${g}</div>` + l.map(satir).join('')).join('');
  document.getElementById('uyg').innerHTML = `
  <div class="uyg">
    <aside class="yan" id="yan" aria-label="Ana menü"><div class="yan-levha">
      <a class="logo" href="#/genel" aria-label="Sinyal ana sayfa"><svg class="logo-isaret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#fff" stroke-width="1.2"/><path d="M12 5.4 18.6 12 12 18.6 5.4 12z" fill="none" stroke="#111" stroke-width="1"/><path d="M12 8v5M12 15.6v.3" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg><span><b>Sinyal</b><small>${e(S.kurs.ad)}</small></span></a>
      <nav>${menu}</nav>
      ${(S.subeler || []).length > 1 && oturum.kullanici.rol !== 'usta' ? `<label class="sube-yan"><span>Şube</span><select data-sube aria-label="Şube">${['', ...S.subeler.map(x => x.id)].map(id => `<option value="${id}" ${gorunum.sube === id ? 'selected' : ''}>${id ? e(S.subeler.find(x => x.id === id).ad) : 'Tüm şubeler'}</option>`).join('')}</select></label>` : ''}
      <div class="yan-alt"><b>${e(oturum.kullanici.ad)}</b><span>${ROL_AD[oturum.kullanici.rol]}</span>${S.kurs.demoNumara ? `<span style="display:block;margin-top:4px;font-size:12px;opacity:.85">Mesajlar → ${e(S.kurs.demoNumara)}</span>` : ''}<button class="dg dg-cizgi dg-kucuk" style="margin-top:8px;width:100%;background:transparent;color:#fff;border-color:#fff" data-cikis>${oturum.kullanici.bulut ? 'Çıkış yap' : 'Kullanıcı değiştir'}</button></div>
    </div></aside>
    <div class="ana">
      ${oturum.kullanici.rol === 'usta' ? `<header class="app-ust">${APP_LOGO}<span class="app-ust-ad"><b>${e(S.kurs.ad)}</b>${oturum.kullanici.bulut ? '<span id="bulut-durum" class="bulut-durum" role="status"></span>' : '<small>Öğretmen</small>'}</span><h1 id="ust-baslik" class="gizli-et">Öğretmen ekranı</h1><small id="ust-alt" hidden></small><button type="button" class="app-profil" data-hesap aria-label="Hesabım: ${e(oturum.kullanici.ad)}">${basHarf(oturum.kullanici.ad)}</button></header>` : `<header class="ust">
        <button class="dg-ikon mobil-ust-sol" data-yan aria-label="Menüyü aç">${ik('menu')}</button>
        <div class="ust-baslik"><small id="ust-alt">${bugunMetni()}</small>${oturum.kullanici.bulut ? '<span id="bulut-durum" class="bulut-durum" role="status"></span>' : ''}<h1 id="ust-baslik">Genel bakış</h1></div>
        <a class="dg dg-hafif portal-geri" href="#/genel">← Panele dön</a>
        ${(S.subeler || []).length > 1 && oturum.kullanici.rol !== 'usta' ? `<label class="sube-sec"><span class="gizli-et">Şube</span><select data-sube aria-label="Şube">${['', ...S.subeler.map(x => x.id)].map(id => `<option value="${id}" ${gorunum.sube === id ? 'selected' : ''}>${id ? e(S.subeler.find(x => x.id === id).ad) : 'Tüm şubeler'}</option>`).join('')}</select></label>` : ''}
        <button class="arama" data-ara aria-label="Ara">${ik('ara')}<span>Kursiyer, aday, plaka ara</span><kbd>⌘K</kbd></button>
        ${oturum.kullanici.rol !== 'usta' ? `<button class="yeni-dugme" data-yeni-menu aria-label="Yeni ekle">${ik('arti')}<span>Yeni</span></button>` : ''}
        <button class="kullanici-cip" data-cikis title="Kullanıcı değiştir"><b>${e(oturum.kullanici.ad)}</b><small>${ROL_AD[oturum.kullanici.rol]}</small></button>
      </header>`}
      ${oturum.kullanici.ziyaretci ? `<div class="ziyaretci-serit"><span><b>Demo görünümü</b> · örnek verilerle. Mesajlar kimseye gitmez, ekranda gösterilir.</span><button data-cikis>Çık</button></div>` : ''}
      <main class="icerik" id="icerik"></main>
    </div>
  </div>
  <nav class="alt-menu" aria-label="Hızlı menü">
    <a href="#/genel" data-menu="genel">${ik('genel')}Bugün</a>
    <a href="#/kursiyerler" data-menu="kursiyerler">${ik('kursiyer')}Kursiyer</a>
    ${oturum.kullanici.rol !== 'usta' ? `<button class="alt-yeni" data-yeni-menu aria-label="Yeni ekle"><span>${ik('arti')}</span>Yeni</button>` : ''}
    <a href="#/plan" data-menu="plan">${ik('direksiyon')}Plan</a>
    <a href="#/kasa" data-menu="kasa">${ik('kasa')}Kasa</a>
  </nav>`;
}

// Kursiyerin açtığı imza linki: girişsiz, uygulama kabuğu olmadan
const imzaLinki = () => location.hash.startsWith('#/imza/') ? location.hash.slice(7) : null;
function imzaSayfasiAc() { IM.imzaSayfasi(document.getElementById('uyg'), imzaLinki()); }
function rota() {
  const h = (location.hash || '#/genel').slice(2).split('/');
  return { ad: SAYFALAR[h[0]] ? h[0] : 'genel', id: h[1] ? decodeURIComponent(h[1]) : null };
}

export function yenile(kaydirma = false) {
  if (imzaLinki()) return imzaSayfasiAc();
  if (oturum.kullanici && oturum.kullanici.rol === 'ogrenci') return ogrenciCiz(kaydirma);
  if (!oturum.kullanici) { if (location.hash.startsWith('#/imza-geldi/')) try { sessionStorage.setItem('sinyal-bekleyen', location.hash); } catch (x) { } if (document.querySelector('.giris')) return; return girisEkrani(location.hash.startsWith('#/imza-geldi/') ? 'pin' : 'tanitim'); }
  // Sinyal Yönetim hesabı: kurs ekranları yok, yalnız gelir paylaşımı (yönetici girer, ortak görür)
  if (oturum.kullanici.bulut && (ORT.yonetimModu() || oturum.kullanici.rol === 'ortak')) return yonetimCiz(kaydirma);
  if (location.hash === '#/yonetim-kur' && oturum.kullanici.bulut && oturum.kullanici.rol === 'mudur') return yonetimKurCiz();
  // başka cihazdan eksik alanla gelen sınav kaydı sayfaları çökertmesin
  (S.sinavlar || []).forEach(x => { if (!x.sonuc || typeof x.sonuc !== 'object') x.sonuc = {}; if (!Array.isArray(x.kursiyerler)) x.kursiyerler = []; });
  if (!document.getElementById('icerik')) iskelet();
  let r = rota();
  if (!izinli(r.ad)) { location.hash = oturum.kullanici.rol === 'usta' ? '#/egitmen' : '#/genel'; return; }
  const yer = document.getElementById('icerik');
  if (!yer) return;
  const portal = r.ad === 'egitmen' || r.ad === 'ogrenci' || r.ad === 'kayit';
  document.body.classList.toggle('portal-modu', portal);
  document.body.classList.toggle('usta-modu', oturum.kullanici.rol === 'usta');
  temaRengi(portal && oturum.kullanici.rol === 'usta');
  let s;
  try { s = SAYFALAR[r.ad](r.id); }
  catch (x) { console.error(x); s = { baslik: 'Bir şeyler ters gitti', html: '<div class="kart"><div class="bos"><b>Bu sayfa açılamadı</b><p>Sayfayı yenileyip tekrar deneyin. Sorun sürerse destek hattına yazın.</p><a class="dg dg-koyu" href="#/genel">Genel bakışa dön</a></div></div>' }; }
  document.getElementById('ust-baslik').textContent = s.baslik;
  document.getElementById('ust-alt').textContent = s.alt || bugunMetni();
  document.title = sadeDil(s.baslik) + ' · Sinyal';
  const kap = document.createElement('div');
  kap.className = 'sayfa sayfa-' + r.ad;
  kap.innerHTML = s.html;
  yer.replaceChildren(kap);
  if (s.baglan) { try { s.baglan(kap); } catch (x) { console.error(x); } }
  kap.querySelectorAll('.sekmeler').forEach(sk => { const sec = sk.querySelector('.secili'); if (sec && sk.scrollWidth > sk.clientWidth) sk.scrollLeft = Math.max(0, sec.offsetLeft - sk.offsetLeft - 24); });
  const menuAd = r.ad === 'kursiyer' ? 'kursiyerler' : r.ad;
  document.querySelectorAll('[data-menu]').forEach(a => a.classList.toggle('secili', a.dataset.menu === menuAd));
  const say = sayaclar();
  document.querySelectorAll('.yan [data-menu]').forEach(a => {
    const k = a.dataset.menu; let b = a.querySelector('b');
    if (say[k] && say[k][0]) { if (!b) { b = document.createElement('b'); a.appendChild(b); } b.textContent = say[k][0]; b.className = say[k][1] ? '' : 'uyar'; }
    else if (b) b.remove();
  });
  if (kaydirma) window.scrollTo(0, 0);
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
    ...S.kursiyerler.map(k => ({ t: tamAd(k), a: 'Kursiyer · ' + k.sinif + ' · ' + k.tel, h: '#/kursiyer/' + k.id, g: 'Kursiyerler' })),
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
document.addEventListener('change', ev => { const s = ev.target.closest('[data-sube]'); if (!s) return; subeSec(s.value); document.querySelectorAll('[data-sube]').forEach(x => { x.value = s.value; }); bildir(s.value ? S.subeler.find(x => x.id === s.value).ad + ' gösteriliyor' : 'Tüm şubeler gösteriliyor'); yenile(); });
Y5.temaUygula();

let sonAd = null;
window.addEventListener('hashchange', () => { if (imzaLinki()) return imzaSayfasiAc(); if (kursDavetYolu() && !(oturum.kullanici && oturum.kullanici.bulut)) return kursDavetEkrani(); if (oturum.kullanici && oturum.kullanici.rol === 'ogrenci') return; if (ogrYolu()) return eskiLink(); if (location.hash === '#/ogrenci-giris') return ogrenciGirisEkrani(oturum.kullanici && oturum.kullanici.bulut ? 'Bu cihazda bir personel hesabı açık. Öğrenci olarak girersen o oturum kapanır.' : undefined); if (davetYolu() && !(oturum.kullanici && oturum.kullanici.bulut)) return davetEkrani(); const r = rota(); yenile(r.ad !== sonAd); sonAd = r.ad; });

// QR’dan gelen ilk sayfa index.html’de hazır durur (beklemeden görünsün); sonradan dönmek için saklanır
const TANITIM = (() => { const t = document.getElementById('tanitim'); return t ? t.outerHTML : ''; })();
// İki adımlı giriş: doğrulama uygulamasındaki 6 haneli kodu ister (pencere kapatılırsa null döner)
const kodSor = () => new Promise(coz => {
  let bitti = false;
  pencere({
    baslik: 'Doğrulama kodu',
    icerik: `<p style="font-size:14.5px">Telefonunuzdaki doğrulama uygulamasında (Google Authenticator, Microsoft Authenticator vb.) Sinyal için görünen 6 haneli kodu girin.</p><input class="girdi" data-kod inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="Doğrulama kodu" style="font-size:22px;letter-spacing:6px;text-align:center;margin-top:12px;width:100%">`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kod-tamam>Devam</button>',
    onAc(d) {
      const i = d.querySelector('[data-kod]'); i.focus();
      const tamam = () => { const v = i.value.replace(/\D/g, ''); if (v.length !== 6) return bildir('6 haneli kodu girin', 'uyari'); bitti = true; kapatPencere(); coz(v); };
      d.querySelector('[data-kod-tamam]').addEventListener('click', tamam); i.addEventListener('keydown', ev => { if (ev.key === 'Enter') tamam(); });
      const izle = setInterval(() => { if (!d.isConnected) { clearInterval(izle); if (!bitti) coz(null); } }, 300);
    },
  });
});
function demoyaGir() {
  const u = S.kullanicilar.find(x => x.rol === 'mudur') || { id: 'u1', ad: 'Kurs müdürü' };
  oturum.kullanici = { id: u.id, ad: u.ad, rol: 'mudur', ziyaretci: true };
  try { sessionStorage.setItem('sinyal-oturum', JSON.stringify(oturum.kullanici)); } catch (x) { }
  iskelet(); location.hash = '#/genel'; sonAd = rota().ad; yenile(true); window.scrollTo(0, 0);
}
function girisEkrani(mod = 'tanitim') {
  B.sdkHazirla();
  document.body.classList.remove('portal-modu');
  const kok0 = document.getElementById('uyg');
  if (mod === 'tanitim' && TANITIM) {
    if (!kok0.querySelector('#tanitim') || kok0.querySelector('#tanitim').hidden) kok0.innerHTML = TANITIM;
    document.title = 'Sinyal · Sürücü kursu yönetimi';
    const tn = kok0.querySelector('#tanitim'); tn.hidden = false; if (tn.dataset.bagli) return; tn.dataset.bagli = '1';
    kok0.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', demoyaGir));
    kok0.querySelectorAll('[data-giris]').forEach(b => b.addEventListener('click', () => { girisEkrani(b.dataset.giris || 'pin'); window.scrollTo(0, 0); }));
    // bölümler ekrana girerken hafifçe belirir (hareket azaltma tercihine uyar; IntersectionObserver yoksa hepsi görünür)
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) { document.documentElement.classList.add('w-anim'); const io = new IntersectionObserver(l => l.forEach(x => { if (x.isIntersecting) { x.target.classList.add('w-gorundu'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' }); kok0.querySelectorAll('[data-gor]').forEach(el => io.observe(el)); }
    // sayfa içi menü: adres çubuğuna dokunmadan bölüme kaydırır (hash yönlendirmesiyle karışmasın)
    kok0.querySelectorAll('[data-kaydir]').forEach(b => b.addEventListener('click', () => { const h = document.getElementById(b.dataset.kaydir); if (h) h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }));
    return;
  }
  if (mod === 'kursac') return kursAcEkrani();
  // öğretmen: kurs müdürünün davetiyle belirlediği e-posta ve şifreyle girer (aynı hesap sistemi, yalnız kendi ders ekranını görür)
  const ogt = mod === 'ogretmen';
  document.title = (ogt ? 'Öğretmen girişi' : 'Giriş') + ' · Sinyal';
  const kayitli = B.bulutKayitli();
  document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">
    <div class="logo" style="border-bottom:0;margin:0 0 6px"><svg class="logo-isaret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#fff" stroke-width="1.2"/><path d="M12 8v5M12 15.6v.3" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg><span><b>Sinyal</b><small>Sürücü kursu yönetimi</small></span></div>
    
    <h1>${ogt ? 'Öğretmen girişi' : 'Kurs hesabınızla girin'}</h1><p>${ogt ? 'Kurs müdürünün WhatsApp’tan gönderdiği davetle belirlediğiniz e-posta ve şifreyle girin. Bugünkü dersleriniz, haftanız ve öğrencileriniz açılır. Davetiniz yoksa kurs müdürünüze yazın.' : 'Kurs müdürü, ön büro ve öğretmenler kendi e-postası ve şifresiyle girer; herkes yalnız kendi ekranlarını görür.'}</p>
    <form class="giris-eposta" novalidate><label>E-posta<input name="eposta" type="email" autocomplete="username" inputmode="email" required value="${e((kayitli && kayitli.eposta) || '')}"></label><label>Şifre<input name="sifre" type="password" autocomplete="current-password" required></label><button class="dg dg-koyu" type="submit">Giriş yap</button></form>
    <p class="giris-baglar"><button type="button" data-sifre-unut>Şifremi unuttum</button>${ogt ? '<button type="button" data-giris-pin>Kurs müdürü ya da ön büroyum</button>' : '<button type="button" data-kurs-ac>Kursum için hesap açmak istiyorum</button>'}</p>
    <button class="giris-demo" type="button" data-ogrenci-giris style="margin:18px 0 0"><b>Öğrenciyim</b><small>Telefon numaranız ve şifrenizle girin</small><span aria-hidden="true">→</span></button>${ogt ? '' : '<button class="giris-demo" data-demo style="margin:10px 0 0"><b>Demoyu incele</b><small>Giriş gerekmez · örnek verilerle · mesaj gönderilmez</small><span aria-hidden="true">→</span></button>'}
    <details class="giris-ornek"${ogt ? ' hidden' : ''}${mod === 'pin-demo' || sessionStorageAl('sinyal-bekleyen') ? ' open' : ''}><summary>Demo: örnek kursta çalışan olarak dene (PIN)</summary>
    <p class="giris-not" style="margin:8px 0 10px">Demo kursun kullanıcıları. Gerçek kurs hesabında PIN yerine e-posta ve şifre kullanılır.</p>
    <div class="giris-kisiler">${S.kullanicilar.map(u => `<button class="giris-kisi" data-kim="${u.id}"><b>${e(u.ad)}</b><small>${ROL_AD[u.rol]}</small></button>`).join('')}</div>
    <form class="giris-pin" hidden><label for="pin">PIN</label><input id="pin" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="••••"><button class="dg dg-koyu" type="submit">Giriş</button></form>
    </details></div><button class="giris-geri" data-tanitim type="button">← Sinyal nedir?</button></div>`;
  let secilen = null;
  const kok = document.getElementById('uyg');
  const dm = kok.querySelector('[data-demo]'); if (dm) dm.addEventListener('click', demoyaGir);
  kok.querySelector('[data-tanitim]').addEventListener('click', () => { girisEkrani('tanitim'); window.scrollTo(0, 0); });
  const ka = kok.querySelector('[data-kurs-ac]'); if (ka) ka.addEventListener('click', () => pencere({ baslik: 'Kurs hesabı nasıl açılır?', icerik: '<p style="font-size:14.5px">Sinyal hesabı kurulumla birlikte açılır: kayıtlarınızı taşırız, ekibinize kısa bir eğitim veririz. Görüşmek için <b>Servet Sakar · 0501 363 65 36</b> (telefon ve WhatsApp). Size özel hesap açma linki gönderilir.</p>', altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' }));
  const gp = kok.querySelector('[data-giris-pin]'); if (gp) gp.addEventListener('click', () => { girisEkrani('pin'); window.scrollTo(0, 0); });
  kok.querySelector('[data-ogrenci-giris]').addEventListener('click', () => { location.hash = '#/ogrenci-giris'; ogrenciGirisEkrani(); });
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
    B.girisYap(f.eposta.value, f.sifre.value, kodSor).then(u => bulutOturumu(u, true)).catch(x => { btn.disabled = false; btn.textContent = 'Giriş yap'; bildir(B.hataMetni(x), 'uyari'); });
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
    islem('Giriş yaptı'); kaydet();
    let bekleyen = null; try { bekleyen = sessionStorage.getItem('sinyal-bekleyen'); sessionStorage.removeItem('sinyal-bekleyen'); } catch (x) { }
    iskelet(); location.hash = bekleyen || (secilen.rol === 'usta' ? '#/egitmen' : '#/genel'); sonAd = rota().ad; yenile(true);
  });
}
function sessionStorageAl(k) { try { return sessionStorage.getItem(k); } catch (x) { return null; } }
const LOGO = `<div class="logo" style="border-bottom:0;margin:0 0 6px"><svg class="logo-isaret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#fff" stroke-width="1.2"/><path d="M12 8v5M12 15.6v.3" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg><span><b>Sinyal</b><small>Sürücü kursu otomasyonu</small></span></div>`;
const IPUCLARI = ['Yaya geçidinde öncelik her zaman yayanındır.', 'Sarı ışık “dur”a hazırlan demektir, hızlan demek değildir.', 'Öndeki araçla aranda en az 2 saniyelik mesafe bırak.', 'Emniyet kemeri arka koltukta da takılır.', 'Şerit değiştirmeden önce sinyal ver, aynaya ve kör noktana bak.', 'Yağmurda takip mesafesini iki katına çıkar.', 'Kavşağa girmeden önce hızını düşür, sağdan gelene yol ver.'];
let ipucuSayac = null;
// Yükleme ekranı: trafik ışığında bekleyen kurs arabası; altında birkaç saniyede bir değişen kısa trafik ipucu
function bekleEkrani(metin) {
  let n = 0;
  document.getElementById('uyg').innerHTML = `<div class="yukleme" role="status" aria-live="polite"><div class="yk-gokbulut b1" aria-hidden="true"></div><div class="yk-gokbulut b2" aria-hidden="true"></div><div class="yk-ust"><div class="yk-marka"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#0b2546" stroke-width="1.2"/><path d="M12 7.6v5.6M12 15.8v.4" stroke="#0b2546" stroke-width="2.3" stroke-linecap="round"/></svg><span>Sinyal</span></div><h1 class="yk-baslik">${e(String(metin).replace(/…$/, ''))}</h1><p class="yk-alt">İlk açılışta birkaç saniye sürebilir</p><div class="yk-cubuk" aria-hidden="true"><i></i></div><div class="yukle-ipucu" aria-live="off"><svg viewBox="0 0 30 30" aria-hidden="true"><rect width="30" height="30" rx="9" fill="#1f5fbf"/><path d="M15 6.5 23 21.5H7Z" fill="#fff"/><circle cx="15" cy="12.4" r="1.4" fill="#0b2546"/><path d="M14.8 14.2l-.7 3.6m.7-3.6 2 2.4m-2-2.4-1.8 1.7m1.1 1.9-1.6 2m1.6-2 1.8 1.8" stroke="#0b2546" stroke-width="1.05" stroke-linecap="round"/></svg><div><i>Biliyor muydun?</i><span>${e(IPUCLARI[n])}</span></div></div></div><div class="yukle-sahne" data-yk></div></div>`;
  const sahne = document.querySelector('#uyg [data-yk]'); if (sahne && window.sinyalYukleme) window.sinyalYukleme(sahne);
  clearInterval(ipucuSayac);
  ipucuSayac = setInterval(() => { const p = document.querySelector('.yukle-ipucu'); if (!p) return clearInterval(ipucuSayac); p.style.opacity = 0; setTimeout(() => { n = (n + 1) % IPUCLARI.length; p.querySelector('span').textContent = IPUCLARI[n]; p.style.opacity = 1; }, 350); }, 3600);
}
// Gerçek kurs hesabıyla oturum aç
function bulutOturumu(u, yeniGiris) {
  oturum.kullanici = u;
  try { sessionStorage.setItem('sinyal-oturum', JSON.stringify(u)); } catch (x) { }
  if (yeniGiris) { islem('Giriş yaptı'); kaydet(); }
  sonHareket = Date.now(); sonYazim = 0; hareketYaz();
  let bekleyen = null; try { bekleyen = sessionStorage.getItem('sinyal-bekleyen'); sessionStorage.removeItem('sinyal-bekleyen'); } catch (x) { }
  if (!ORT.yonetimModu()) iskelet(); B.durumYaz();
  // Sinyal ekibi (yönetici) hesabı: Ayarlar › Diğer'de kurs hesabı açma linki oluşturur
  B.yoneticiMi().then(y => { if (y && !B.bulut.yonetici) { B.bulut.yonetici = true; yenile(); } }).catch(() => { });
  const h = location.hash.slice(2).split('/')[0];
  if (bekleyen) location.hash = bekleyen; else if (!SAYFALAR[h] || h === 'davet' || yeniGiris) location.hash = u.rol === 'usta' ? '#/egitmen' : '#/genel';
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
// Hesap açma linki: #/yeni-kurs/<kod> (Sinyal ekibinin verdiği tek kullanımlık kod)
const kursDavetYolu = () => { const m = location.hash.match(/^#\/yeni-kurs\/([a-z0-9]+)$/); return m ? m[1] : null; };
async function kursDavetEkrani() {
  const kod = kursDavetYolu(); bekleEkrani('Hesap açma linki kontrol ediliyor…');
  let dv = null; try { dv = await B.kursDavetGetir(kod); } catch (x) { }
  if (!dv) { document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}<h1>Bu link geçersiz</h1><p>Hesap açma linkinin süresi dolmuş ya da daha önce kullanılmış. Yeni link için Servet Sakar · 0501 363 65 36.</p></div></div>`; return; }
  kursAcEkrani(kod);
}
function kursAcEkrani(davetKod) {
  if (!davetKod) return girisEkrani('pin');
  document.title = 'Yeni kurs hesabı · Sinyal';
  document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}
    <h1>Yeni kurs hesabı</h1><p>Kursunuzun verileri boş bir hesapla başlar. Öğrenci listenizi sonra Excel’den aktarabilirsiniz.</p>
    <form class="giris-eposta" novalidate>
      <label>Kursun adı<input name="kurs" required placeholder="Örn. Sinyal Sürücü Kursu" autocomplete="organization"></label>
      <label>Şehir<input name="sehir" autocomplete="address-level1"></label>
      <label>Adınız soyadınız<input name="ad" required autocomplete="name"></label>
      <label>Cep telefonunuz <small style="font-weight:400;opacity:.85">yeni kayıt, iptal ve günlük özet WhatsApp’tan buraya gelir</small><input name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx"></label>
      <label>E-posta<input name="eposta" type="email" inputmode="email" autocomplete="username" required></label>
      <label>Şifre (en az 8 karakter)<input name="sifre" type="password" autocomplete="new-password" required minlength="8"></label>
      <label class="giris-onay"><input type="checkbox" name="onay"><span><a href="gizlilik.html" target="_blank" rel="noopener" style="color:inherit;font-weight:700;text-decoration:underline">Gizlilik ve veri işleme şartlarını</a> okudum: kursum veri sorumlusu, Sinyal veri işleyendir; veriler Google (Frankfurt, Almanya), Cloudflare ve Meta (WhatsApp) altyapısında işlenir.</span></label>
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
    if (!f.onay.checked) return bildir('Verilerin nerede saklanacağını okuduğunuzu işaretleyin', 'uyari');
    btn.disabled = true; btn.textContent = 'Hesap açılıyor…';
    B.kursAc({ kursAd: f.kurs.value.trim(), yetkili: f.ad.value.trim(), sehir: f.sehir.value.trim(), eposta: f.eposta.value.trim(), sifre: f.sifre.value, mudurTel: f.tel.value.trim(), davetKod })
      .then(u => { history.replaceState(null, '', '#/genel'); bulutOturumu(u, true); bildir('Kurs hesabı açıldı. Önce Ayarlar’dan kurs bilgilerini, sonra öğrenci listenizi ekleyin'); })
      .catch(x => { btn.disabled = false; btn.textContent = 'Kurs hesabını aç'; bildir(B.hataMetni(x), 'uyari'); });
  });
}
// Öğrenci hesabı: telefon numarası + şifre. Hesabı kurs açar, geçici şifre WhatsApp'tan gelir; ilk girişte öğrenci kendi şifresini belirler.
const ogrYolu = () => /^#\/ogr\/[A-Za-z0-9]+\/[a-z0-9]+$/.test(location.hash);
function eskiLink() { history.replaceState(null, '', '#/ogrenci-giris'); ogrenciGirisEkrani('Öğrenci paneli artık kendi hesabınızla açılıyor. Kursunuzun WhatsApp’tan gönderdiği telefon numarası ve şifreyle girin.'); }
// Öğrenci giriş ekranları: açık zemin, tek kart, büyük dokunma alanları, şifreyi göster düğmesi ve canlı şifre kuralları
const ogrKap = (ic, alt = '') => `<div class="og-giris"><div class="og-giris-ust">${LOGO}</div><main class="og-giris-kart">${ic}</main>${alt}</div>`;
const ogrAlan = (ad, et, tur, ikon, ek = '') => `<label class="og-alan"><span class="og-alan-et">${et}</span><span class="og-girdi">${ik(ikon)}<input name="${ad}" type="${tur}" ${ek}>${tur === 'password' ? `<button type="button" class="og-goz" data-goz aria-label="Şifreyi göster" aria-pressed="false">${ik('goz')}</button>` : ''}</span></label>`;
const SIFRE_KURAL = `<ul class="og-kural" aria-live="polite"><li data-k="uzun">${ik('tik')}En az 8 karakter</li><li data-k="ayni">${ik('tik')}İki şifre aynı</li></ul>`;
function sifreIzle(f, btn) {
  const g = () => { const u = f.s1.value.length >= 8, a = u && f.s1.value === f.s2.value; f.querySelector('[data-k=uzun]').classList.toggle('ok', u); f.querySelector('[data-k=ayni]').classList.toggle('ok', a); btn.disabled = !a; };
  f.addEventListener('input', g); g();
}
function gozBagla(kok) {
  kok.addEventListener('click', ev => { const b = ev.target.closest('[data-goz]'); if (!b) return; const i = b.parentElement.querySelector('input'), ac = i.type === 'password'; i.type = ac ? 'text' : 'password'; b.setAttribute('aria-pressed', ac); b.setAttribute('aria-label', ac ? 'Şifreyi gizle' : 'Şifreyi göster'); b.classList.toggle('acik', ac); });
}
function ogrenciGirisEkrani(not) {
  B.sdkHazirla();
  document.body.classList.remove('portal-modu'); document.title = 'Öğrenci girişi · Sinyal';
  const kok = document.getElementById('uyg');
  kok.innerHTML = ogrKap(`<div class="og-giris-bas"><h1>Öğrenci girişi</h1><p>Derslerin, ödemelerin ve sınavların tek ekranda.</p></div>
    ${not ? `<p class="og-giris-not">${ik('uyari')}<span>${e(not)}</span></p>` : ''}
    <form novalidate class="og-giris-form">${ogrAlan('tel', 'Cep telefonun', 'tel', 'tel', 'inputmode="tel" autocomplete="tel" placeholder="05xx xxx xx xx" required')}${ogrAlan('sifre', 'Şifren', 'password', 'kilit', 'autocomplete="current-password" required')}
      <button type="button" class="og-bag og-unut" data-unut>Şifremi unuttum</button>
      <button class="dg dg-ana og-giris-dg" type="submit">Giriş yap</button></form>
    <p class="og-giris-ipucu">${ik('wp')}<span>İlk şifren kaydından sonra kursunun WhatsApp’ından gelir.</span></p>`,
    `<p class="og-giris-alt">Kursta mı çalışıyorsun? <button type="button" class="og-bag" data-geri>Kurs girişi</button></p>`);
  const f = kok.querySelector('form'); gozBagla(kok);
  kok.querySelector('[data-geri]').addEventListener('click', () => { location.hash = ''; girisEkrani('pin'); });
  kok.querySelector('[data-unut]').addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (f.tel.value.replace(/\D/g, '').length < 10) { bildir('Önce cep telefonunu yaz; yeni şifre o numaraya gelir', 'uyari'); return f.tel.focus(); }
    b.disabled = true;
    B.ogrenciSifreTalep(f.tel.value).then(() => { b.textContent = 'Kursuna iletildi'; bildir('Kursuna iletildi. Yeni geçici şifren WhatsApp’tan gelecek.'); }).catch(x => { b.disabled = false; bildir(B.hataMetni(x), 'uyari'); f.tel.focus(); });
  });
  f.addEventListener('submit', ev => {
    ev.preventDefault(); const btn = f.querySelector('[type=submit]');
    if (f.tel.value.replace(/\D/g, '').length < 10) { bildir('Cep telefonunu yaz', 'uyari'); return f.tel.focus(); }
    if (!f.sifre.value) { bildir('Şifreni yaz', 'uyari'); return f.sifre.focus(); }
    btn.disabled = true; btn.textContent = 'Giriliyor…';
    B.ogrenciGiris(f.tel.value, f.sifre.value).then(u => u.ilkGiris ? sifreBelirleEkrani(u) : ogrenciModu(u.kurs, u.kod)).catch(x => { btn.disabled = false; btn.textContent = 'Giriş yap'; bildir(B.hataMetni(x), 'uyari'); });
  });
}
function sifreBelirleEkrani(u) {
  const kok = document.getElementById('uyg');
  kok.innerHTML = ogrKap(`<ol class="og-adimlar"><li class="ok">${ik('tik')}Giriş</li><li class="simdi"><b>2</b>Şifren</li><li><b>3</b>Panel</li></ol>
    <div class="og-giris-bas"><h1>Kendi şifreni belirle</h1><p>Kursunun gönderdiği geçici şifre bir kez kullanılır. Bundan sonra bu şifreyle gireceksin.</p></div>
    <form novalidate class="og-giris-form">${ogrAlan('s1', 'Yeni şifre', 'password', 'kilit', 'autocomplete="new-password" required minlength="8"')}${ogrAlan('s2', 'Yeni şifre (tekrar)', 'password', 'kilit', 'autocomplete="new-password" required')}${SIFRE_KURAL}
      <button class="dg dg-ana og-giris-dg" type="submit">Kaydet ve panele geç</button></form>
    <p class="og-giris-ipucu">${ik('kilit')}<span>Şifreni kimseyle paylaşma. Unutursan giriş ekranından yenisini isteyebilirsin.</span></p>`);
  const f = kok.querySelector('form'), btn = f.querySelector('[type=submit]'); gozBagla(kok); sifreIzle(f, btn); f.s1.focus();
  f.addEventListener('submit', ev => {
    ev.preventDefault(); if (btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Kaydediliyor…';
    B.ogrenciSifreBelirle(f.s1.value).then(() => ogrenciModu(u.kurs, u.kod, true)).catch(x => { btn.disabled = false; btn.textContent = 'Kaydet ve panele geç'; bildir(B.hataMetni(x), 'uyari'); });
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
  pencere({ baslik: 'Şifremi değiştir', icerik: `<form id="f-osifre" class="og-giris-form" novalidate>${ogrAlan('eski', 'Şu anki şifren', 'password', 'kilit', 'autocomplete="current-password"')}${ogrAlan('s1', 'Yeni şifre', 'password', 'kilit', 'autocomplete="new-password"')}${ogrAlan('s2', 'Yeni şifre (tekrar)', 'password', 'kilit', 'autocomplete="new-password"')}${SIFRE_KURAL}</form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-osifre">Şifreyi değiştir</button>',
    onAc(d) { const f = d.querySelector('form'), btn = d.querySelector('[form=f-osifre]'); gozBagla(d); sifreIzle(f, btn); f.eski.focus(); f.addEventListener('submit', ev => { ev.preventDefault(); if (btn.disabled) return; if (!f.eski.value) { bildir('Şu anki şifreni yaz', 'uyari'); return f.eski.focus(); } btn.disabled = true; B.ogrenciSifreBelirle(f.s1.value, f.eski.value).then(() => { kapatPencere(); bildir('Şifren değiştirildi'); }).catch(x => { btn.disabled = false; bildir(B.hataMetni(x), 'uyari'); }); }); } });
}
function ogrenciCiz(kaydir) {
  const kok = document.getElementById('uyg');
  if (!kok.querySelector('.ogr-kabuk')) {
    const og = kursiyer(oturum.kullanici.kursiyer), adSoyad = og ? tamAd(og) : (oturum.kullanici.ad || 'Öğrenci');
    kok.innerHTML = `<div class="ogr-kabuk"><header class="app-ust">${APP_LOGO}<span class="app-ust-ad"><b>${e(S.kurs.ad)}</b><small>Öğrenci</small></span><button type="button" class="app-profil" data-hesap aria-label="Hesabım: ${e(adSoyad)}">${basHarf(adSoyad)}</button></header><main id="icerik" class="ogr-icerik"></main></div>`;
  }
  document.body.classList.add('portal-modu'); temaRengi(true);
  const yer = document.getElementById('icerik'); let s;
  try { s = P.ogrenciPortal(); } catch (x) { console.error(x); s = { html: `<div class="og-giris-kart" style="margin:24px auto"><h2 style="font-size:20px">Ekran açılamadı</h2><p style="margin:8px 0 16px">Bir sorun oldu; verilerin güvende. Yeniden dene.</p><button class="dg dg-ana og-giris-dg" data-yeniden-yukle>Yeniden yükle</button></div>` }; }
  document.title = S.kurs.ad + ' · Öğrenci paneli';
  const kap = document.createElement('div'); kap.className = 'sayfa sayfa-ogrenci'; kap.innerHTML = s.html; yer.replaceChildren(kap);
  if (s.baglan) { try { s.baglan(kap); } catch (x) { console.error(x); } }
  if (kaydir) window.scrollTo(0, 0);
}
// Sinyal Yönetim kabuğu: menü yok; üstte hesap adı, kullanıcı ve çıkış
function yonetimCiz(kaydir) {
  const kok = document.getElementById('uyg'), u = oturum.kullanici;
  if (!kok.querySelector('.ort-kabuk')) kok.innerHTML = `<div class="ort-kabuk"><header class="ort-ust"><svg class="logo-isaret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#fff" stroke-width="1.2"/><path d="M12 8v5M12 15.6v.3" stroke="#0b1d33" stroke-width="2.2" stroke-linecap="round"/></svg><b>Sinyal Yönetim</b>
    <span class="ort-ust-sag"><span id="bulut-durum" class="bulut-durum" role="status"></span><small>${e(u.ad)} · ${u.rol === 'mudur' ? 'Yönetici' : 'Ortak, yalnız görüntüler'}</small><button class="ort-cikis" data-cikis>Çıkış</button></span></header><main class="ort-ana" id="icerik"></main></div>`;
  document.body.classList.add('portal-modu');
  document.title = 'Sinyal Yönetim';
  const yer = document.getElementById('icerik'), kap = document.createElement('div');
  kap.className = 'sayfa sayfa-yonetim';
  if (!ORT.yonetimModu()) kap.innerHTML = `<div class="kart"><div class="bos"><b>Bu hesap henüz kurulmadı</b><p>Servet Sakar hesabı kurduğunda gelir paylaşımı burada görünür.</p></div></div>`;
  else { try { kap.innerHTML = ORT.yonetimHtml(u.rol); } catch (x) { console.error(x); kap.innerHTML = '<div class="kart"><div class="bos"><b>Ekran açılamadı</b><p>Sayfayı yenileyin.</p></div></div>'; } }
  yer.replaceChildren(kap);
  if (ORT.yonetimModu()) { try { ORT.yonetimBaglan(kap, u.rol, yenile); } catch (x) { console.error(x); } }
  B.durumYaz();
  if (kaydir) window.scrollTo(0, 0);
}
// Yeni ve boş bir hesabı bir kez Sinyal Yönetim hesabına çevirme ekranı (#/yonetim-kur)
function yonetimKurCiz() {
  if (!document.getElementById('icerik')) iskelet();
  const yer = document.getElementById('icerik'), kap = document.createElement('div');
  kap.className = 'sayfa sayfa-yonetim-kur';
  kap.innerHTML = ORT.kurulabilir() ? ORT.kurulumHtml() : `<div class="kart"><div class="bos"><b>Bu hesapta kurs kayıtları var</b><p>Sinyal Yönetim için ayrı bir e-postayla yeni ve boş bir hesap açın.</p></div></div>`;
  yer.replaceChildren(kap);
  document.getElementById('ust-baslik').textContent = 'Sinyal Yönetim';
  document.title = 'Sinyal Yönetim kurulumu';
  ORT.kurulumBaglan(kap, () => { location.hash = ''; location.reload(); });
}
// Davet linki: #/davet/<kurs>/<kod>
const davetYolu = () => { const m = location.hash.match(/^#\/davet\/([^/]+)\/([^/]+)$/); return m ? [m[1], m[2]] : null; };
async function davetEkrani() {
  const [kurs, kod] = davetYolu();
  bekleEkrani('Davet açılıyor…');
  let dv = null; try { dv = await B.davetGetir(kurs, kod); } catch (x) { }
  const kok = document.getElementById('uyg');
  if (!dv) { kok.innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}<h1>Bu davet geçersiz</h1><p>Linkin süresi dolmuş ya da daha önce kullanılmış. Kurs müdüründen yeni bir davet linki isteyin.</p><p class="giris-baglar"><button type="button" data-geri>Giriş ekranına git</button></p></div></div>`; kok.querySelector('[data-geri]').addEventListener('click', () => { location.hash = ''; girisEkrani('pin'); }); return; }
  const ROL_T = { mudur: 'kurs müdürü', sekreter: 'ön büro çalışanı', usta: 'öğretmen', ortak: 'ortak (yalnız görüntüleme)' };
  document.title = 'Davet · Sinyal';
  kok.innerHTML = `<div class="giris"><div class="giris-levha">${LOGO}
    <h1>${e(dv.kursAd)}</h1><p>${e(dv.davetEden || 'Kurs müdürü')} sizi Sinyal’e ${ROL_T[dv.rol] || dv.rol} olarak davet etti. Kendi e-postanız ve şifrenizle hesabınızı açın.</p>
    <form class="giris-eposta" novalidate>
      <label data-yeni>Adınız soyadınız<input name="ad" value="${e(dv.ad)}" autocomplete="name"></label>
      <label>E-posta<input name="eposta" type="email" inputmode="email" autocomplete="username" required></label>
      <label><span data-sifre-et>Şifre belirleyin (en az 8 karakter)</span><input name="sifre" type="password" autocomplete="new-password" required></label>
      <button class="dg dg-koyu" type="submit">Hesabımı aç ve katıl</button></form>
    <p class="giris-baglar"><button type="button" data-mevcut>Zaten Sinyal hesabım var</button></p></div></div>`;
  let yeni = true;
  const f = kok.querySelector('form'), btn = f.querySelector('[type=submit]');
  kok.querySelector('[data-mevcut]').addEventListener('click', ev => { yeni = !yeni; kok.querySelector('[data-yeni]').hidden = !yeni; kok.querySelector('[data-sifre-et]').textContent = yeni ? 'Şifre belirleyin (en az 8 karakter)' : 'Şifre'; f.sifre.autocomplete = yeni ? 'new-password' : 'current-password'; btn.textContent = yeni ? 'Hesabımı aç ve katıl' : 'Giriş yap ve katıl'; ev.target.textContent = yeni ? 'Zaten Sinyal hesabım var' : 'Yeni hesap açacağım'; });
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    if (yeni && f.ad.value.trim().length < 3) return bildir('Adınızı ve soyadınızı yazın', 'uyari');
    if (!/^\S+@\S+\.\S+$/.test(f.eposta.value.trim())) return bildir('E-posta adresini kontrol edin', 'uyari');
    if (yeni && f.sifre.value.length < 8) return bildir('Şifre en az 8 karakter olmalı', 'uyari');
    btn.disabled = true; const t = btn.textContent; btn.textContent = 'Bağlanıyor…';
    B.davetKabul(kurs, kod, { eposta: f.eposta.value.trim(), sifre: f.sifre.value, ad: f.ad.value.trim(), yeni })
      .then(u => { location.hash = ''; bulutOturumu(u, true); bildir(dv.kursAd + ' hesabına katıldınız'); })
      .catch(x => { btn.disabled = false; btn.textContent = t; bildir(B.hataMetni(x), 'uyari'); });
  });
}
document.addEventListener('click', ev => { if (ev.target.closest('[data-yeniden-yukle]')) location.reload(); });
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-cikis]')) kapatPencere();
  if (ev.target.closest('[data-hesap]')) return hesapSayfasi();
  if (ev.target.closest('[data-ogr-cikis]')) return B.ogrenciCikis().then(() => { location.hash = '#/ogrenci-giris'; location.reload(); });
  if (ev.target.closest('[data-ogr-sifre]')) { kapatPencere(); return ogrenciSifreDegistir(); }
  if (ev.target.closest('[data-cikis]') && oturum.kullanici && oturum.kullanici.bulut) { islem('Çıkış yaptı'); kaydet(); B.cikisYap().then(() => { try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } location.hash = ''; location.reload(); }); return; }
  if (ev.target.closest('[data-cikis]')) { const zy = ziyaretci(); islem('Çıkış yaptı'); kaydet(); oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } location.hash = ''; girisEkrani(zy ? 'tanitim' : 'pin'); window.scrollTo(0, 0); }
  const g = ev.target.closest('[data-geri-al]'); if (g) { if (geriAl()) { bildir('Son işlem geri alındı'); yenile(); } }
});

// Hareketsiz kalınca oturumu kapat (Ayarlar › Güvenlik)
// Son hareket cihazda da tutulur: sekme kapatılıp sonra açılınca süre dolmuşsa yeniden giriş istenir
let sonHareket = Date.now(), sonYazim = 0;
const hareketYaz = () => { if (!oturum.kullanici || !oturum.kullanici.bulut || Date.now() - sonYazim < 30e3) return; sonYazim = Date.now(); try { localStorage.setItem('sinyal-son-hareket', JSON.stringify({ t: sonHareket, dk: (S.guvenlik && S.guvenlik.oturumDk) || 30 })); } catch (x) { } };
['click', 'keydown', 'touchstart', 'scroll'].forEach(t => document.addEventListener(t, () => { sonHareket = Date.now(); hareketYaz(); }, { passive: true, capture: true }));
setInterval(() => {
  if (!oturum.kullanici || imzaLinki() || oturum.kullanici.rol === 'ogrenci') return;
  const dk = (S.guvenlik && S.guvenlik.oturumDk) || 30;
  if (Date.now() - sonHareket < dk * 60e3) return;
  islem('Oturum kapandı', dk + ' dk hareketsiz'); kaydet();
  if (oturum.kullanici.bulut) { oturum.kullanici = null; B.cikisYap().then(() => { try { sessionStorage.removeItem('sinyal-oturum'); sessionStorage.setItem('sinyal-kapandi', String(dk)); } catch (x) { } location.reload(); }); return; }
  oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { }
  girisEkrani('pin'); bildir(dk + ' dakika işlem yapılmadığı için oturum kapandı', 'uyari');
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
if (imzaLinki()) imzaSayfasiAc();
else if (ogrYolu()) eskiLink();
else if (location.hash === '#/ogrenci-giris') ogrenciGirisEkrani(B.bulutKayitli() ? 'Bu cihazda bir personel hesabı açık. Öğrenci olarak girersen o oturum kapanır.' : undefined);
else if (davetYolu()) davetEkrani();
else if (kursDavetYolu()) kursDavetEkrani();
else if (ogrKayit && !B.bulutKayitli()) {
  // son görülen panel önbellekten hemen; oturum ve güncel veri arkadan gelir
  const ok = ogrKayit.kod && B.ogrenciOnbellek(ogrKayit.kod);
  if (ok) { oturum.kullanici = { id: 'ogr-' + ok.id, ad: tamAd(ok), rol: 'ogrenci', kursiyer: ok.id }; ogrenciCiz(true); } else bekleEkrani('Öğrenci paneli açılıyor…'); B.ogrenciOturumu().then(u => !u ? ogrenciGirisEkrani() : u.ilkGiris ? sifreBelirleEkrani(u) : ogrenciModu(u.kurs, u.kod)).catch(() => ogrenciGirisEkrani()); }
else if (B.bulutKayitli() && (() => { try { const h = JSON.parse(localStorage.getItem('sinyal-son-hareket') || 'null'); return h && Date.now() - h.t > (h.dk || 30) * 60e3; } catch (x) { return false; } })()) {
  oturum.kullanici = null; bekleEkrani('Oturum kapatılıyor…');
  B.cikisYap().finally(() => { girisEkrani('pin'); setTimeout(() => bildir('Uzun süre işlem yapılmadığı için oturum kapandı; tekrar giriş yapın', 'uyari'), 400); });
}
else if (B.bulutKayitli()) {
  oturum.kullanici = null; bekleEkrani('Kurs verisi yükleniyor…');
  B.bulutBaslat().then(u => { if (u) bulutOturumu(u, false); else girisEkrani('pin'); }).catch(x => { girisEkrani('pin'); bildir(B.hataMetni(x), 'uyari'); });
  const kp = sessionStorageAl('sinyal-kapandi'); if (kp) { try { sessionStorage.removeItem('sinyal-kapandi'); } catch (x) { } setTimeout(() => bildir(kp + ' dakika işlem yapılmadığı için oturum kapandı; tekrar giriş yapın', 'uyari'), 400); }
}
else if (sessionStorageAl('sinyal-kapandi')) { const kp = sessionStorageAl('sinyal-kapandi'); try { sessionStorage.removeItem('sinyal-kapandi'); } catch (x) { } oturum.kullanici = null; girisEkrani('pin'); setTimeout(() => bildir(kp + ' dakika işlem yapılmadığı için oturum kapandı; tekrar giriş yapın', 'uyari'), 400); }
else if (oturum.kullanici && !oturum.kullanici.bulut) { iskelet(); if (!location.hash) location.hash = oturum.kullanici.rol === 'usta' ? '#/egitmen' : '#/genel'; sonAd = rota().ad; yenile(); }
else girisEkrani(location.hash.startsWith('#/imza-geldi/') ? 'pin' : 'tanitim');

// Yeni sürüm: ana ekrana eklenmiş uygulamada yenile düğmesi yok; uygulama öne gelince sunucudaki sürüme bakılır, yenisi varsa altta "Güncelle" şeridi çıkar
const SURUM = +(new URL(import.meta.url).searchParams.get('v') || 0);
async function surumBak() {
  try {
    const t = await (await fetch('./?surum=' + Date.now(), { cache: 'no-store' })).text(), v = +((t.match(/(?:baslat|app)\.js\?v=(\d+)/) || [])[1] || 0);
    if (!(v > SURUM) || document.getElementById('surum-serit')) return;
    const d = document.createElement('div'); d.id = 'surum-serit'; d.className = 'surum-serit'; d.setAttribute('role', 'status');
    d.innerHTML = '<span>Yeni sürüm hazır</span><button type="button">Güncelle</button>';
    d.querySelector('button').addEventListener('click', async () => { try { await Promise.all((await caches.keys()).map(k => caches.delete(k))); const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch (x) { } location.reload(); });
    document.body.appendChild(d);
  } catch (x) { }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') surumBak(); });
setTimeout(surumBak, 4000);
