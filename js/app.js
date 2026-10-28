import { S, sifirla, tamAd, gecikenler, eksikEvrak, egitmen } from './veri.js';
import { ik, e, pencere, kapatPencere, bugunMetni, bildir } from './ui.js';
import * as Y1 from './sayfalar1.js';
import * as Y2 from './sayfalar2.js';
import * as P from './portal.js';

const SAYFALAR = {
  genel: Y1.genel, adaylar: Y1.adaylar, kursiyerler: Y1.kursiyerler, kursiyer: Y1.kursiyerDetay,
  plan: Y1.plan, teorik: Y1.teorik, sinavlar: Y2.sinavlar, kasa: Y2.kasa, filo: Y2.filo,
  mesajlar: Y2.mesajlar, meb: Y2.meb, raporlar: Y2.raporlar, ayarlar: Y2.ayarlar,
  egitmen: P.egitmenPortal, ogrenci: P.ogrenciPortal,
};

const MENU = [
  ['Gündem', [['genel', 'Genel bakış', 'genel'], ['adaylar', 'Adaylar', 'aday'], ['mesajlar', 'Mesajlar ve asistan', 'mesaj']]],
  ['Eğitim', [['kursiyerler', 'Kursiyerler', 'kursiyer'], ['plan', 'Direksiyon planı', 'direksiyon'], ['teorik', 'Teorik dersler', 'teorik'], ['sinavlar', 'Sınavlar', 'sinav']]],
  ['İşletme', [['kasa', 'Kasa ve ödemeler', 'kasa'], ['filo', 'Eğitmen ve araçlar', 'filo'], ['meb', 'MEB işlemleri', 'meb'], ['raporlar', 'Raporlar', 'rapor'], ['ayarlar', 'Ayarlar', 'ayar']]],
];

let rol = 'yonetici';
try { rol = localStorage.getItem('sinyal-rol') || 'yonetici'; } catch (x) { }

function sayaclar() {
  return {
    adaylar: [S.adaylar.filter(a => a.asama === 'Yeni').length, false],
    kasa: [S.kursiyerler.filter(k => gecikenler(k).length).length, false],
    meb: [S.kursiyerler.filter(k => !k.mebIslendi && !eksikEvrak(k).length).length, true],
  };
}

function iskelet() {
  const say = sayaclar();
  const menu = MENU.map(([g, l]) => `<div class="yan-baslik">${g}</div>` + l.map(([k, t, i]) => `<a href="#/${k}" data-menu="${k}">${ik(i)}<span>${t}</span>${say[k] && say[k][0] ? `<b class="${say[k][1] ? 'sakin' : ''}">${say[k][0]}</b>` : ''}</a>`).join('')).join('');
  document.getElementById('uyg').innerHTML = `
  <div class="uyg">
    <aside class="yan" id="yan" aria-label="Ana menü">
      <a class="logo" href="#/genel" aria-label="Sinyal ana sayfa"><span class="logo-isaret"><svg viewBox="0 0 24 24"><path d="M12 2.5 21.5 12 12 21.5 2.5 12z" fill="#1b1f25"/><path d="M12 7v6M12 16v.6" stroke="#ffc61a" stroke-width="2.4" stroke-linecap="round"/></svg></span><span><b>Sinyal</b><small>${e(S.kurs.ad)}</small></span></a>
      <nav>${menu}</nav>
      <div class="yan-rol" role="group" aria-label="Görünüm"><button data-rol="yonetici" class="${rol === 'yonetici' ? 'secili' : ''}">Yönetici</button><button data-rol="egitmen" class="${rol === 'egitmen' ? 'secili' : ''}">Eğitmen</button><button data-rol="ogrenci" class="${rol === 'ogrenci' ? 'secili' : ''}">Kursiyer</button></div>
      <div class="yan-alt"><span class="avatar">KM</span><div><b>${e(S.kurs.yetkili)}</b><small>${e(S.kurs.sehir)} · yönetici</small></div></div>
    </aside>
    <div class="ana">
      <div class="demo-serit" title="Demo · örnek verilerle"></div>
      <header class="ust">
        <button class="dg-ikon mobil-ust-sol" data-yan aria-label="Menüyü aç">${ik('menu')}</button>
        <div class="ust-baslik"><small id="ust-alt">${bugunMetni()}</small><h1 id="ust-baslik">Genel bakış</h1></div>
        <button class="arama" data-ara aria-label="Ara">${ik('ara')}<span>Kursiyer, aday, plaka ara</span><kbd>⌘K</kbd></button>
        <div class="rol" role="group" aria-label="Görünüm">
          <button data-rol="yonetici" class="${rol === 'yonetici' ? 'secili' : ''}">Yönetici</button>
          <button data-rol="egitmen" class="${rol === 'egitmen' ? 'secili' : ''}">Eğitmen</button>
          <button data-rol="ogrenci" class="${rol === 'ogrenci' ? 'secili' : ''}">Kursiyer</button>
        </div>
      </header>
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

function rota() {
  const h = (location.hash || '#/genel').slice(2).split('/');
  return { ad: SAYFALAR[h[0]] ? h[0] : 'genel', id: h[1] ? decodeURIComponent(h[1]) : null };
}

export function yenile(kaydirma = false) {
  const r = rota();
  const yer = document.getElementById('icerik');
  if (!yer) return;
  const portal = r.ad === 'egitmen' || r.ad === 'ogrenci';
  document.body.classList.toggle('portal-modu', portal);
  let s;
  try { s = SAYFALAR[r.ad](r.id); }
  catch (x) { console.error(x); s = { baslik: 'Bir şeyler ters gitti', html: '<div class="kart"><div class="bos"><b>Bu sayfa açılamadı</b><p>Demo verisini sıfırlayıp tekrar deneyin.</p><button class="dg dg-koyu" data-sifirla>Demo verisini sıfırla</button></div></div>' }; }
  document.getElementById('ust-baslik').textContent = s.baslik;
  document.getElementById('ust-alt').textContent = s.alt || bugunMetni();
  document.title = s.baslik + ' · Sinyal';
  const kap = document.createElement('div');
  kap.className = 'sayfa sayfa-' + r.ad;
  kap.innerHTML = s.html;
  yer.replaceChildren(kap);
  if (s.baglan) { try { s.baglan(kap); } catch (x) { console.error(x); } }
  const menuAd = r.ad === 'kursiyer' ? 'kursiyerler' : r.ad;
  document.querySelectorAll('[data-menu]').forEach(a => a.classList.toggle('secili', a.dataset.menu === menuAd));
  const say = sayaclar();
  document.querySelectorAll('.yan [data-menu]').forEach(a => {
    const k = a.dataset.menu; let b = a.querySelector('b');
    if (say[k] && say[k][0]) { if (!b) { b = document.createElement('b'); a.appendChild(b); } b.textContent = say[k][0]; b.className = say[k][1] ? 'sakin' : ''; }
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
  const kayitlar = [
    ...S.kursiyerler.map(k => ({ t: tamAd(k), a: 'Kursiyer · ' + k.sinif + ' · ' + k.tel, h: '#/kursiyer/' + k.id, g: 'Kursiyerler' })),
    ...S.adaylar.map(a => ({ t: a.ad, a: 'Aday · ' + a.asama, h: '#/adaylar/' + a.id, g: 'Adaylar' })),
    ...S.araclar.map(a => ({ t: a.plaka, a: a.model, h: '#/filo', g: 'Araçlar' })),
    ...S.egitmenler.map(x => ({ t: x.ad, a: 'Eğitmen', h: '#/filo', g: 'Eğitmenler' })),
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
  const r = t.closest('[data-rol]'); if (r) return rolSec(r.dataset.rol);
  if (t.closest('[data-yan]')) return yanAcKapa(!document.getElementById('yan').classList.contains('acik'));
  if (t.closest('.yan a') || t.closest('.yan-rol')) yanAcKapa(false);
  if (t.closest('[data-sifirla]')) { sifirla(); bildir('Demo verisi sıfırlandı'); location.hash = '#/genel'; yenile(true); }
});
document.addEventListener('keydown', ev => { if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); aramaAc(); } });

let sonAd = null;
window.addEventListener('hashchange', () => { const r = rota(); yenile(r.ad !== sonAd); sonAd = r.ad; });

iskelet();
if (!location.hash) location.hash = rol === 'egitmen' ? '#/egitmen' : rol === 'ogrenci' ? '#/ogrenci' : '#/genel';
sonAd = rota().ad;
yenile();
