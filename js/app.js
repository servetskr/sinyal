import { S, tamAd, gecikenler, eksikEvrak, egitmen, oturum, islem, kaydet, geriAl, gorunum, subeSec } from './veri.js?v=53';
import { ik, e, pencere, kapatPencere, bugunMetni, bildir, ziyaretci } from './ui.js?v=53';
import * as Y1 from './sayfalar1.js?v=53';
import * as Y2 from './sayfalar2.js?v=53';
import * as P from './portal.js?v=53';
import * as Y3 from './sayfalar3.js?v=53';
import * as Y4 from './sayfalar4.js?v=53';
import * as Y5 from './sayfalar5.js?v=53';
import * as IM from './imza.js?v=53';
import { zamanlayiciBaslat, kurallariHazirla } from './zamanlayici.js?v=53';
import * as SN from './senaryo.js?v=53';
import * as OZ from './ozellik.js?v=53';
import { durumlariGuncelle } from './mesaj.js?v=53';

const SAYFALAR = {
  genel: Y1.genel, adaylar: Y1.adaylar, kursiyerler: Y1.kursiyerler, kursiyer: Y1.kursiyerDetay,
  plan: Y1.plan, teorik: Y1.teorik, sinavlar: Y2.sinavlar, kasa: Y2.kasa, filo: Y2.filo,
  mesajlar: Y2.mesajlar, meb: Y2.meb, raporlar: Y2.raporlar, ayarlar: Y2.ayarlar,
  egitmen: P.egitmenPortal, ogrenci: P.ogrenciPortal,
  belgeler: Y3.belgeler, kayit: Y3.kayitSayfasi, guven: Y3.guven, mebbis: Y3.mebbisAsistani,
  sosyal: Y4.sosyal, kurulum: Y5.kurulum, 'imza-geldi': IM.imzaGeldi, senaryo: SN.senaryolar, karlilik: OZ.karlilik,
};
const ROL_AD = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici' };
const YASAK = { mudur: [], sekreter: ['raporlar', 'ayarlar', 'guven', 'kurulum', 'senaryo', 'karlilik'], usta: Object.keys(SAYFALAR).filter(k => !['egitmen', 'imza-geldi'].includes(k)) };
const izinli = ad => { const u = oturum.kullanici; return u && !YASAK[u.rol].includes(ad) && !(u.ziyaretci && ad === 'senaryo'); };

const MENU = [
  ['Bugün', [['genel', 'Genel bakış', '↑'], ['adaylar', 'Yeni öğrenciler', '↗'], ['mesajlar', 'Mesajlar', '↗'], ['sosyal', 'Sosyal medya asistanı', '↗']]],
  ['Eğitim', [['kursiyerler', 'Kursiyerler', '→'], ['plan', 'Direksiyon planı', '→'], ['teorik', 'Teorik dersler', '→'], ['sinavlar', 'Sınavlar', '→']]],
  ['İşletme', [['kasa', 'Kasa ve ödemeler', '→'], ['filo', 'Ekip ve araçlar', '→'], ['meb', 'MEB işlemleri', '→'], ['belgeler', 'Belgeler ve çıktılar', '→'], ['raporlar', 'Raporlar', '→'], ['karlilik', 'Kârlılık ve kapasite', '→']]],
  ['Kurs', [['senaryo', 'Demo senaryoları', '↗'], ['kurulum', 'Kurulum', '→'], ['kayit', 'Evden kayıt sayfası', '↗'], ['ogrenci', 'Kursiyer ekranı', '↗'], ['guven', 'Paket ve güvence', '→'], ['ayarlar', 'Ayarlar', '→']]],
];

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

function iskelet() {
  kurallariHazirla(); zamanlayiciBaslat();
  const say = sayaclar();
  const menu = MENU.map(([g, l]) => [g, l.filter(([k]) => izinli(k))]).filter(([, l]) => l.length).map(([g, l]) => `<div class="yan-baslik">${g}</div>` + l.map(([k, t, i]) => `<a href="#/${k}" data-menu="${k}"><span class="ok" aria-hidden="true">${i}</span><span>${t}</span>${say[k] && say[k][0] ? `<b class="${say[k][1] ? '' : 'uyar'}">${say[k][0]}</b>` : ''}</a>`).join('')).join('');
  document.getElementById('uyg').innerHTML = `
  <div class="uyg">
    <aside class="yan" id="yan" aria-label="Ana menü"><div class="yan-levha">
      <a class="logo" href="#/genel" aria-label="Sinyal ana sayfa"><svg class="logo-isaret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#fff" stroke-width="1.2"/><path d="M12 5.4 18.6 12 12 18.6 5.4 12z" fill="none" stroke="#111" stroke-width="1"/><path d="M12 8v5M12 15.6v.3" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg><span><b>Sinyal</b><small>${e(S.kurs.ad)}</small></span></a>
      <nav>${menu}</nav>
      ${(S.subeler || []).length > 1 && oturum.kullanici.rol !== 'usta' ? `<label class="sube-yan"><span>Şube</span><select data-sube aria-label="Şube">${['', ...S.subeler.map(x => x.id)].map(id => `<option value="${id}" ${gorunum.sube === id ? 'selected' : ''}>${id ? e(S.subeler.find(x => x.id === id).ad) : 'Tüm şubeler'}</option>`).join('')}</select></label>` : ''}
      <div class="yan-alt"><b>${e(oturum.kullanici.ad)}</b><span>${ROL_AD[oturum.kullanici.rol]}</span>${S.kurs.demoNumara ? `<span style="display:block;margin-top:4px;font-size:12px;opacity:.85">Mesajlar → ${e(S.kurs.demoNumara)}</span>` : ''}<button class="dg dg-cizgi dg-kucuk" style="margin-top:8px;width:100%;background:transparent;color:#fff;border-color:#fff" data-cikis>Kullanıcı değiştir</button></div>
    </div></aside>
    <div class="ana">
      <header class="ust">
        <button class="dg-ikon mobil-ust-sol" data-yan aria-label="Menüyü aç">${ik('menu')}</button>
        <div class="ust-baslik"><small id="ust-alt">${bugunMetni()}</small><h1 id="ust-baslik">Genel bakış</h1></div>
        <a class="dg dg-hafif portal-geri" href="#/genel">← Panele dön</a>
        ${(S.subeler || []).length > 1 && oturum.kullanici.rol !== 'usta' ? `<label class="sube-sec"><span class="gizli-et">Şube</span><select data-sube aria-label="Şube">${['', ...S.subeler.map(x => x.id)].map(id => `<option value="${id}" ${gorunum.sube === id ? 'selected' : ''}>${id ? e(S.subeler.find(x => x.id === id).ad) : 'Tüm şubeler'}</option>`).join('')}</select></label>` : ''}
        <button class="arama" data-ara aria-label="Ara">${ik('ara')}<span>Kursiyer, aday, plaka ara</span><kbd>⌘K</kbd></button>
        <button class="kullanici-cip" data-cikis title="Kullanıcı değiştir"><b>${e(oturum.kullanici.ad)}</b><small>${ROL_AD[oturum.kullanici.rol]}</small></button>
      </header>
      ${oturum.kullanici.ziyaretci ? `<div class="ziyaretci-serit"><span><b>Demo görünümü</b> · örnek verilerle. Mesajlar kimseye gitmez, ekranda gösterilir.</span><button data-cikis>Çık</button></div>` : ''}
      <main class="icerik" id="icerik"></main>
    </div>
  </div>
  <nav class="alt-menu" aria-label="Hızlı menü">
    <a href="#/genel" data-menu="genel">${ik('genel')}Bugün</a>
    <a href="#/kursiyerler" data-menu="kursiyerler">${ik('kursiyer')}Kursiyer</a>
    <a href="#/plan" data-menu="plan">${ik('direksiyon')}Plan</a>
    <a href="#/kasa" data-menu="kasa">${ik('kasa')}Kasa</a>
    <button data-yan>${ik('menu')}Menü</button>
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
  if (!oturum.kullanici) { if (location.hash.startsWith('#/imza-geldi/')) try { sessionStorage.setItem('sinyal-bekleyen', location.hash); } catch (x) { } if (document.querySelector('.giris')) return; return girisEkrani(location.hash.startsWith('#/imza-geldi/') ? 'pin' : 'tanitim'); }
  if (!document.getElementById('icerik')) iskelet();
  let r = rota();
  if (!izinli(r.ad)) { location.hash = oturum.kullanici.rol === 'usta' ? '#/egitmen' : '#/genel'; return; }
  const yer = document.getElementById('icerik');
  if (!yer) return;
  const portal = r.ad === 'egitmen' || r.ad === 'ogrenci' || r.ad === 'kayit';
  document.body.classList.toggle('portal-modu', portal);
  document.body.classList.toggle('usta-modu', oturum.kullanici.rol === 'usta');
  let s;
  try { s = SAYFALAR[r.ad](r.id); }
  catch (x) { console.error(x); s = { baslik: 'Bir şeyler ters gitti', html: '<div class="kart"><div class="bos"><b>Bu sayfa açılamadı</b><p>Sayfayı yenileyip tekrar deneyin. Sorun sürerse destek hattına yazın.</p><a class="dg dg-koyu" href="#/genel">Genel bakışa dön</a></div></div>' }; }
  document.getElementById('ust-baslik').textContent = s.baslik;
  document.getElementById('ust-alt').textContent = s.alt || bugunMetni();
  document.title = s.baslik + ' · Sinyal';
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
    ...MENU.flatMap(([, l]) => l.map(([k, t]) => ({ t, a: 'Sayfa', h: '#/' + k, g: 'Sayfalar' }))),
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
document.addEventListener('keydown', ev => { if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); aramaAc(); } });
document.addEventListener('change', ev => { const s = ev.target.closest('[data-sube]'); if (!s) return; subeSec(s.value); document.querySelectorAll('[data-sube]').forEach(x => { x.value = s.value; }); bildir(s.value ? S.subeler.find(x => x.id === s.value).ad + ' gösteriliyor' : 'Tüm şubeler gösteriliyor'); yenile(); });
Y5.temaUygula();

let sonAd = null;
window.addEventListener('hashchange', () => { if (imzaLinki()) return imzaSayfasiAc(); const r = rota(); yenile(r.ad !== sonAd); sonAd = r.ad; });

// QR’dan gelen ilk sayfa index.html’de hazır durur (beklemeden görünsün); sonradan dönmek için saklanır
const TANITIM = (() => { const t = document.getElementById('tanitim'); return t ? t.outerHTML : ''; })();
function demoyaGir() {
  const u = S.kullanicilar.find(x => x.rol === 'mudur') || { id: 'u1', ad: 'Kurs müdürü' };
  oturum.kullanici = { id: u.id, ad: u.ad, rol: 'mudur', ziyaretci: true };
  try { sessionStorage.setItem('sinyal-oturum', JSON.stringify(oturum.kullanici)); } catch (x) { }
  iskelet(); location.hash = '#/genel'; sonAd = rota().ad; yenile(true); window.scrollTo(0, 0);
}
function girisEkrani(mod = 'tanitim') {
  document.body.classList.remove('portal-modu');
  const kok0 = document.getElementById('uyg');
  if (mod === 'tanitim' && TANITIM) {
    if (!kok0.querySelector('#tanitim') || kok0.querySelector('#tanitim').hidden) kok0.innerHTML = TANITIM;
    document.title = 'Sinyal · Sürücü kursu yönetimi';
    const tn = kok0.querySelector('#tanitim'); tn.hidden = false; if (tn.dataset.bagli) return; tn.dataset.bagli = '1';
    kok0.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', demoyaGir));
    kok0.querySelectorAll('[data-giris]').forEach(b => b.addEventListener('click', () => { girisEkrani('pin'); window.scrollTo(0, 0); }));
    return;
  }
  document.title = 'Giriş · Sinyal';
  document.getElementById('uyg').innerHTML = `<div class="giris"><div class="giris-levha">
    <div class="logo" style="border-bottom:0;margin:0 0 6px"><svg class="logo-isaret" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#fff" stroke-width="1.2"/><path d="M12 8v5M12 15.6v.3" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg><span><b>Sinyal</b><small>${e(S.kurs.ad)}</small></span></div>
    <button class="giris-demo" data-demo><b>Demoyu incele</b><small>Giriş gerekmez · örnek verilerle · mesaj gönderilmez</small><span aria-hidden="true">→</span></button>
    <h1>Kim giriş yapıyor?</h1><p>Kurs çalışanları PIN ile girer; her kullanıcı yalnızca yetkisi olan ekranları görür.</p>
    <div class="giris-kisiler">${S.kullanicilar.map(u => `<button class="giris-kisi" data-kim="${u.id}"><b>${e(u.ad)}</b><small>${ROL_AD[u.rol]}</small></button>`).join('')}</div>
    <form class="giris-pin" hidden><label for="pin">PIN</label><input id="pin" inputmode="numeric" maxlength="4" autocomplete="one-time-code" placeholder="••••"><button class="dg dg-koyu" type="submit">Giriş</button></form>
    <p class="giris-not">PIN’inizi unuttuysanız kurs müdürü Ayarlar › Kullanıcılar’dan yenisini verir.</p></div><button class="giris-geri" data-tanitim type="button">← Sinyal nedir?</button></div>`;
  let secilen = null;
  const kok = document.getElementById('uyg');
  kok.querySelector('[data-demo]').addEventListener('click', demoyaGir);
  kok.querySelector('[data-tanitim]').addEventListener('click', () => { girisEkrani('tanitim'); window.scrollTo(0, 0); });
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
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-cikis]')) { const zy = ziyaretci(); islem('Çıkış yaptı'); kaydet(); oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { } location.hash = ''; girisEkrani(zy ? 'tanitim' : 'pin'); window.scrollTo(0, 0); }
  const g = ev.target.closest('[data-geri-al]'); if (g) { if (geriAl()) { bildir('Son işlem geri alındı'); yenile(); } }
});

// Hareketsiz kalınca oturumu kapat (Ayarlar › Güvenlik)
let sonHareket = Date.now();
['click', 'keydown', 'touchstart', 'scroll'].forEach(t => document.addEventListener(t, () => { sonHareket = Date.now(); }, { passive: true, capture: true }));
setInterval(() => {
  if (!oturum.kullanici || imzaLinki()) return;
  const dk = (S.guvenlik && S.guvenlik.oturumDk) || 30;
  if (Date.now() - sonHareket < dk * 60e3) return;
  islem('Oturum kapandı', dk + ' dk hareketsiz'); kaydet(); oturum.kullanici = null; try { sessionStorage.removeItem('sinyal-oturum'); } catch (x) { }
  girisEkrani('pin'); bildir(dk + ' dakika işlem yapılmadığı için oturum kapandı', 'uyari');
}, 30e3);

// Uzaktan imzalar: kursiyer imzalayınca kayda kendiliğinden işlenir
setInterval(() => { if (oturum.kullanici && !imzaLinki()) { IM.imzaKontrol(); if (oturum.kullanici.rol !== 'usta') { OZ.gelenKontrol(); durumlariGuncelle().then(d => { if (d && rota().ad === 'mesajlar') yenile(); }); } } }, 20e3);
setTimeout(() => { if (oturum.kullanici && !imzaLinki()) IM.imzaKontrol(); }, 3000);

// Ziyaretçi modunda arama ve doğrudan WhatsApp linkleri gerçek numaralara gitmesin
document.addEventListener('click', ev => {
  if (!ziyaretci()) return;
  const a = ev.target.closest('a[href^="tel:"], a[href^="sms:"], a[href*="wa.me/"]'); if (!a) return;
  ev.preventDefault(); bildir('Demo görünümünde arama ve WhatsApp kapalı; gerçek kullanımda bu düğme kişiyi arar ya da yazar');
}, true);

if (imzaLinki()) imzaSayfasiAc();
else if (oturum.kullanici) { iskelet(); if (!location.hash) location.hash = oturum.kullanici.rol === 'usta' ? '#/egitmen' : '#/genel'; sonAd = rota().ad; yenile(); }
else girisEkrani(location.hash.startsWith('#/imza-geldi/') ? 'pin' : 'tanitim');
