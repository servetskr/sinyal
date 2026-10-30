import { oturum, islem, S, kaydet, gun, fark, tarihOku, SINIFLAR, ASAMALAR, EVRAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle, yerelZaman, BECERI, risk, ekToplam, selam, kursAdi, konuListesi, konuOner } from './veri.js?v=102';
import { e, saatDe, saatE, tl, ik, rozet, avatar, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, tarih, tarihUzun, goreli, gunKisa, aracGorsel, isaret, imzaAlani, waAc } from './ui.js?v=102';
import { yenile } from './app.js?v=102';
import { ekDersKabul, bosTeklifKabul, wpGonder, bildirimler } from './sayfalar1.js?v=102';
import { KONULAR } from './konular.js?v=102';
// Soru bankası büyük; yalnız Sınavlar sekmesi ya da test açılınca yüklenir (açılış hızını etkilemesin)
let SORULAR = [], soruYuk = null;
// Sorular ve levha çizimleri yalnız sınav sekmesinde yüklenir; levhalı sorularda görsel "L:<kod>" olarak durur
let levhaSvg = () => '';
const sorulariYukle = () => soruYuk || (soruYuk = Promise.all([import('./sorular.js?v=102'), import('./levha.js?v=102').catch(() => null)]).then(([m, l]) => { SORULAR = m.SORULAR; if (l) levhaSvg = l.levhaSvg; }));
const gorselHtml = g => !g ? '' : String(g).startsWith('L:') ? levhaSvg(g.slice(2)) : g;
import { randevuAl, randevuIptal } from './ozellik.js?v=102';
import * as OG from './ogrenci.js?v=102';
import * as HZ from './hazirlik.js?v=102';
import { ogrOzellik } from './veri.js?v=102';
import { soruKonu } from './soruKonu.js?v=102';
import { MUFREDAT } from './ogrenci.js?v=102';

let egId = 'e1', egSekme = 'bugun';
let ogId = null, ogSekme = 'durum';

const sekmeCubugu = (liste, secili, ad) => `<nav class="portal-sekme" aria-label="Sekmeler">${liste.map(([k, t, i]) => `<button data-${ad}="${k}" class="${k === secili ? 'secili' : ''}">${ik(i)}${t}</button>`).join('')}</nav>`;

/* ================= EĞİTMEN ================= */
const beceriGiris = () => `<p class="et">Bu dersin beceri puanı <small style="font-weight:400;color:var(--soluk)">1 zayıf · 5 sınava hazır</small></p><div class="beceri-giris">${BECERI.map(([b, ad]) => `<div class="beceri-sat"><span>${ad}</span><div class="secim">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="b-${b}" value="${n}"><span>${n}</span></label>`).join('')}</div></div>`).join('')}</div>`;
// Takip formuna yazılacak konular (zorunlu alan): sıradaki ders için öneri işaretli gelir
const konuGiris = (ks, no) => { const on = konuOner(ks.sinif, no, SINIFLAR[ks.sinif].direksiyon); return `<p class="et" style="margin-top:4px">Bu derste çalışılan konular <small style="font-weight:400;color:var(--soluk)">takip formuna yazılır</small></p><div class="secim konu-sec">${konuListesi(ks.sinif).map(([id, ad]) => `<label><input type="checkbox" name="konu" value="${id}" ${on.includes(id) ? 'checked' : ''}><span>${ad}</span></label>`).join('')}</div>`; };
const konuOku = p => [...p.querySelectorAll('[name=konu]:checked')].map(x => x.value);
const beceriOku = p => { const o = {}; BECERI.forEach(([b]) => { const v = p.querySelector(`[name="b-${b}"]:checked`); if (v) o[b] = +v.value; }); return Object.keys(o).length ? o : null; };
// Ders sonu: beceri puanı kaydedilir; kalma riski "yüksek"e çıkarsa müdüre haber gider
function riskKontrol(ks, once) {
  const r = risk(ks); if (!r || r.puan < 50 || (once && once.puan >= 50)) return;
  bildirimler([{ kim: 'mudur', metin: `${tamAd(ks)} için direksiyon sınavı kalma riski yüksek (${r.puan}/100): ${r.nedenler.join('; ')}. Ek ders önermek için kursiyer dosyasını açın.`, tur: 'Sınav riski' }], 'Sınav riski yükseldi');
}
// Ders konumu: başlangıçta ve bitişte alınır; ekran açık kaldıkça 4 dakikada bir iz noktası düşer (web uygulaması arka planda konum alamaz)
let izleyici = null;
const konumOku = p => ({ enlem: +p.coords.latitude.toFixed(5), boylam: +p.coords.longitude.toFixed(5), dogruluk: Math.round(p.coords.accuracy) });
function izBaslat(d) {
  if (!navigator.geolocation || izleyici != null) return;
  let son = 0;
  izleyici = navigator.geolocation.watchPosition(p => { if (Date.now() - son < 4 * 60e3 || d.durum !== 'Planlandı') return; son = Date.now(); const k = konumOku(p); (d.iz = d.iz || []).push([new Date().toTimeString().slice(0, 5), k.enlem, k.boylam]); if (d.iz.length > 40) d.iz.shift(); kaydet(); }, () => { }, { maximumAge: 60e3 });
}
function izBitir(d) {
  if (izleyici != null && navigator.geolocation) navigator.geolocation.clearWatch(izleyici);
  izleyici = null;
  if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { d.konumBit = konumOku(p); kaydet(); }, () => { d.konumBit = false; kaydet(); }, { timeout: 15000, maximumAge: 60e3 });
}
// Dersi bitirme: 3 adım (konular → değerlendirme → imzalar). Öğrenci yanında değilse imza WhatsApp'tan istenir.
// Geçmiş günden kapanmamış ders de buradan kapatılır (başlangıç saati yoksa süre boş kalır, "sonradan kapatıldı" işaretlenir).
function dersKapat(d) {
  const ks = kursiyer(d.kursiyer), no = ks.direksiyon + 1, h = egitmen(d.egitmen), gecmis = d.tarih < gun(0);
  pencere({
    baslik: 'Dersi bitir',
    icerik: `<ol class="eg-adim"><li class="simdi" data-adim-et="1"><b>1</b>Konular</li><li data-adim-et="2"><b>2</b>Değerlendirme</li><li data-adim-et="3"><b>3</b>İmza</li></ol>
      <p class="eg-ders-bilgi"><b>${e(tamAd(ks))}</b> · ${gecmis ? tarih(d.tarih) + ' ' : ''}${d.saat} · ${no}. ders</p>
      <section data-adim="1">${konuGiris(ks, no)}<p class="og-not">Sıradaki ders için önerilen konular işaretli geldi. Takip formuna yazılır.</p></section>
      <section data-adim="2" hidden>${beceriGiris()}<div class="alan" style="margin-top:14px"><label>Öğrenciye not <small style="font-weight:400;color:var(--soluk)">isteğe bağlı · öğrenci kendi ekranında görür</small></label><textarea class="girdi" data-ders-not rows="2" maxlength="300" placeholder="Örn. park etmede iyi, şerit değiştirirken aynaya bakmayı unutuyor"></textarea></div></section>
      <section data-adim="3" hidden><p class="et">Öğrencinin imzası</p><canvas class="imza-alan" width="900" height="300" data-imza="k" aria-label="Öğrenci imzası"></canvas>
        <p class="et" style="margin-top:12px">Senin imzan · ${e(h.ad)}</p><canvas class="imza-alan" width="900" height="300" data-imza="u" aria-label="Usta öğretici imzası"></canvas>
        <div class="eg-imza-alt"><button class="dg dg-hafif dg-kucuk" data-temizle-imza>${ik('sifirla')}İmzaları temizle</button></div>
        <p class="og-not">Öğrenci yanında değilse önce sen imzala, sonra “WhatsApp’tan imzalat”a dokun; imza linki öğrenciye gider.</p></section>`,
    altlik: `<button class="dg dg-cizgi" data-geri-adim>Vazgeç</button><button class="dg dg-wp" data-imza-uzak hidden>${ik('wp')}WhatsApp’tan imzalat</button><button class="dg dg-ana" data-ileri>İleri</button>`,
    onAc(p) {
      let adim = 1;
      const geri = p.querySelector('[data-geri-adim]'), ileri = p.querySelector('[data-ileri]'), uzak = p.querySelector('[data-imza-uzak]');
      const ik_ = imzaAlani(p.querySelector('[data-imza=k]')), iu = imzaAlani(p.querySelector('[data-imza=u]'));
      const goster = () => {
        p.querySelectorAll('[data-adim]').forEach(s => { s.hidden = +s.dataset.adim !== adim; });
        p.querySelectorAll('[data-adim-et]').forEach(l => { const n = +l.dataset.adimEt; l.className = n < adim ? 'ok' : n === adim ? 'simdi' : ''; });
        geri.textContent = adim === 1 ? 'Vazgeç' : 'Geri'; ileri.innerHTML = adim === 3 ? ik('tik') + 'Ders yapıldı' : 'İleri'; uzak.hidden = adim !== 3;
        const g = p.querySelector('.pencere-govde'); if (g) g.scrollTop = 0;
      };
      p.querySelector('[data-temizle-imza]').addEventListener('click', () => { ik_.temizle(); iu.temizle(); });
      geri.addEventListener('click', () => { if (adim === 1) return kapatPencere(); adim--; goster(); });
      // ortak kayıt: konu, beceri, not, süre, konum bitişi; ders sayısı bir artar
      const isle = imza => {
        const once = risk(ks); d.beceri = beceriOku(p); d.konular = konuOku(p);
        const not = p.querySelector('[data-ders-not]').value.trim().slice(0, 300); if (not) { d.not = not; ks.notlar.unshift({ tarih: gun(0), metin: not }); }
        d.durum = 'Yapıldı'; d.imza = imza;
        if (gecmis || !d.bas) { d.sonradan = gun(0); } else { d.bit = new Date().toTimeString().slice(0, 5); izBitir(d); d.sure = d.basZaman ? Math.round((Date.now() - d.basZaman) / 60e3) : null; }
        ks.direksiyon = Math.min(SINIFLAR[ks.sinif].direksiyon, ks.direksiyon + 1);
        return once;
      };
      ileri.addEventListener('click', () => {
        if (adim === 1 && !konuOku(p).length) return bildir('Takip formu için dersin konusunu seç', 'uyari');
        if (adim < 3) { adim++; return goster(); }
        if (ik_.bos() || iu.bos()) return bildir('İki imza da gerekli. Öğrenci yanında değilse “WhatsApp’tan imzalat”', 'uyari');
        const once = isle({ zaman: yerelZaman(), kursiyer: ik_.url(), usta: iu.url() });
        if (d.sure != null && d.sure < 40) bildir(`Ders ${d.sure} dk sürdü; kısa ders olarak işaretlendi`, 'uyari');
        islem('Ders imzalı tamamlandı', tamAd(ks) + ' · ' + d.tarih + ' ' + d.saat); kaydet(); kapatPencere(); bildir('Ders imzalandı ve takip formuna işlendi'); yenile(); riskKontrol(ks, once);
      });
      uzak.addEventListener('click', async () => {
        if (iu.bos()) return bildir('Önce sen imzala; öğrencinin imzası WhatsApp’tan istenir', 'uyari');
        const once = isle({ zaman: yerelZaman(), kursiyer: null, kursiyerBekliyor: true, usta: iu.url() });
        islem('Ders tamamlandı, öğrenci imzası istendi', tamAd(ks) + ' · ' + d.tarih + ' ' + d.saat); kaydet(); kapatPencere();
        const m = await import('./imza.js?v=102'); await m.imzaIste('ders', ks, [d.id]); bildir('Ders kaydedildi; imza linki öğrenciye gidiyor', 'wp'); yenile(); riskKontrol(ks, once);
      });
    },
  });
}
// Ders iptali (öğretmen tarafı): ders silinir, öğrenciye ve kurs müdürüne nedeniyle bildirilir; boşalan saati müdür doldurur
const IPTAL_NEDEN = [['ogrenci', 'Öğrenci gelemeyeceğini bildirdi'], ['arac', 'Araç arızalı'], ['hava', 'Hava koşulları uygun değil'], ['ben', 'Ben gelemiyorum'], ['diger', 'Diğer']];
function dersIptal(d) {
  const ks = kursiyer(d.kursiyer), h = egitmen(d.egitmen);
  pencere({
    baslik: 'Ders iptal edilsin mi?',
    icerik: `<p style="margin-bottom:12px"><b>${e(tamAd(ks))}</b> · ${goreli(d.tarih)} ${d.saat}. Ders silinir; öğrenciye ve kurs müdürüne haber gider, müdür yeni saat verir.</p>
      <div class="secim eg-neden">${IPTAL_NEDEN.map(([k, t], i) => `<label><input type="radio" name="neden" value="${k}" ${i ? '' : 'checked'}><span>${t}</span></label>`).join('')}</div>
      <div class="alan" style="margin-top:12px"><label>Açıklama <small style="font-weight:400;color:var(--soluk)">isteğe bağlı</small></label><input class="girdi" data-iptal-not maxlength="200"></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-iptal-et>Dersi iptal et</button>`,
    onAc(p) {
      p.querySelector('[data-iptal-et]').addEventListener('click', () => {
        const nk = p.querySelector('[name=neden]:checked').value, neden = IPTAL_NEDEN.find(x => x[0] === nk)[1], not = p.querySelector('[data-iptal-not]').value.trim();
        S.dersler = S.dersler.filter(x => x !== d);
        islem('Öğretmen dersi iptal etti', tamAd(ks) + ' · ' + d.tarih + ' ' + d.saat + ' · ' + neden); kaydet(); kapatPencere();
        const ogrMetin = nk === 'ogrenci' ? `${selam(ks)} ${tarihUzun(d.tarih)} ${d.saat} direksiyon dersiniz isteğiniz üzerine iptal edildi. Yeni saat için ${kursAdi('e')} yazabilirsiniz. ${h.ad}` : `${selam(ks)} ${tarihUzun(d.tarih)} ${d.saat} direksiyon dersiniz iptal edildi (${neden.toLocaleLowerCase('tr')}). Size yeni saat verilecek. ${h.ad}`;
        bildirimler([{ kim: ks, metin: ogrMetin, tur: 'Ders iptali' }, { kim: 'mudur', metin: `${h.ad}, ${tamAd(ks)} öğrencisinin ${tarih(d.tarih)} ${d.saat} dersini iptal etti: ${neden}${not ? ' · ' + not : ''}. Saat boşaldı; öğrenciye yeni saat verin.`, tur: 'Ders iptali' }], 'Ders iptal edildi');
        yenile();
      });
    },
  });
}
// "Gelmedi" yanlışlıkla basılmasın: onay alınır, sonra öğrenciye ve müdüre haber gider
function gelmediIsaretle(d) {
  const ks = kursiyer(d.kursiyer), h = egitmen(d.egitmen);
  pencere({
    baslik: 'Öğrenci gelmedi mi?', icerik: `<p><b>${e(tamAd(ks))}</b> · ${d.tarih === gun(0) ? 'bugün' : tarih(d.tarih)} ${d.saat}. Ders “gelmedi” olarak kapanır; öğrenciye ve kurs müdürüne haber gider.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-gelmedi-onay>Gelmedi</button>`,
    onAc(p) {
      p.querySelector('[data-gelmedi-onay]').addEventListener('click', () => {
        d.durum = 'Gelmedi'; islem('Gelmedi işaretledi', tamAd(ks) + ' · ' + d.tarih + ' ' + d.saat); kaydet(); kapatPencere();
        bildirimler([{ kim: ks, metin: `${selam(ks)} ${d.tarih === gun(0) ? '' : tarih(d.tarih) + ' '}${d.saat} direksiyon dersinde sizi bekledim ancak gelmediniz. Yeni saat için ${kursAdi('e')} yazabilirsiniz. ${h.ad}`, tur: 'Gelmedi bildirimi' }, { kim: 'mudur', metin: `${tamAd(ks)} ${tarih(d.tarih)} ${d.saat} dersine gelmedi; ${h.ad} işaretledi.`, tur: 'Gelmedi bildirimi' }], 'Derse gelmedi');
        yenile();
      });
    },
  });
}
function dersDiger(d) {
  const ks = kursiyer(d.kursiyer);
  pencere({
    baslik: tamAd(ks), icerik: `<div class="eg-menu">
      <a class="eg-menu-sat" href="tel:${(ks.tel || '').replace(/\s/g, '')}">${ik('tel')}<span><b>Ara</b><small>${e(ks.tel || 'Telefon yok')}</small></span></a>
      <button class="eg-menu-sat" data-m="not">${ik('kalem')}<span><b>Not ekle</b><small>Kurs müdürü de görür</small></span></button>
      ${d.durum === 'Planlandı' ? `<button class="eg-menu-sat" data-m="iptal">${ik('kapat')}<span><b>Dersi iptal et</b><small>Öğrenciye ve müdüre nedeniyle bildirilir</small></span></button>` : ''}
      ${d.durum === 'Planlandı' && d.bas ? `<button class="eg-menu-sat" data-m="gelmedi">${ik('uyari')}<span><b>Gelmedi olarak kapat</b><small>Ders yanlışlıkla başlatıldıysa</small></span></button>` : ''}</div>`,
    onAc(p) {
      p.addEventListener('click', ev => {
        const b = ev.target.closest('[data-m]'); if (!b) return;
        if (b.dataset.m === 'iptal') return dersIptal(d);
        if (b.dataset.m === 'gelmedi') return gelmediIsaretle(d);
        if (b.dataset.m === 'not') return pencere({ baslik: 'Not · ' + tamAd(ks), icerik: `<div class="alan"><label>Ders notu</label><textarea class="girdi" rows="3" placeholder="Örn. park etmede iyi, şerit değiştirmede ayna kontrolünü unutuyor"></textarea></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`, onAc(q) { q.querySelector('[data-k]').addEventListener('click', () => { const v = q.querySelector('textarea').value.trim(); if (v) { ks.notlar.unshift({ tarih: gun(0), metin: v }); kaydet(); } kapatPencere(); bildir('Not kaydedildi; kurs müdürü de görür'); yenile(); }); } });
      });
    },
  });
}
const DURUM_TON = { 'Yapıldı': 'yesil', 'Gelmedi': 'kirmizi', 'İptal': 'notr' };
function egDersKart(d, vurgu) {
  const k = kursiyer(d.kursiyer); if (!k) return '';
  const S0 = SINIFLAR[k.sinif], acik = d.durum === 'Planlandı', no = k.direksiyon + (acik ? 1 : 0), basladi = acik && d.bas, gecmis = d.tarih < gun(0);
  const sag = acik ? (basladi ? rozet('Derste', 'mavi') : gecmis ? rozet('Kapanmadı', 'uyari') : '') : rozet(d.durum, DURUM_TON[d.durum] || 'notr');
  return `<article class="eg-ders ${vurgu ? 'vurgu' : ''} ${acik ? '' : 'kapali'}">
    <div class="eg-ders-ust"><div class="og-zaman"><small>${gecmis ? tarih(d.tarih) : goreli(d.tarih)}</small><b class="mono">${d.saat}</b></div><div class="og-olay-ad">${avatar(k.ad, k.soyad, k.foto)}<b>${e(tamAd(k))}</b><small>${S0.ad} · ${acik ? no + '. ders' : no + ' ders yapıldı'} / ${S0.direksiyon}</small></div>${sag}</div>
    ${vurgu && acik && k.notlar[0] ? `<p class="eg-bilgi">${ik('kalem')}<span>${e(k.notlar[0].metin)}</span></p>` : ''}
    ${basladi ? `<p class="eg-bilgi mavi">${ik('saat')}<span>${saatDe(d.bas)} başladı · ${d.konum ? 'konum alındı' : d.konum === false ? 'konum alınamadı' : 'konum alınıyor'}. Bitince imzalat; süre kendiliğinden yazılır.</span></p>` : ''}
    ${d.durum === 'Yapıldı' && d.imza && d.imza.kursiyerBekliyor ? `<p class="eg-bilgi sari">${ik('uyari')}<span>Öğrencinin imzası bekleniyor. <button class="dg dg-hafif dg-kucuk" data-imza-tekrar="${d.id}">Linki yeniden gönder</button></span></p>` : ''}
    ${d.durum === 'Yapıldı' && d.bas && d.sure != null ? `<small class="eg-sure ${(d.sure || 0) < 40 ? 'kisa' : ''}">${d.bas}–${d.bit} · ${d.sure} dk${(d.sure || 0) < 40 ? ' · kısa ders' : ''}${d.konum ? ' · konum kayıtlı' : ''}</small>` : ''}
    ${acik ? `<div class="eg-dg">${basladi || gecmis ? `<button class="dg dg-ana" data-yapildi="${d.id}">${ik('tik')}${gecmis ? 'Yapıldı, imzalat' : 'Bitir ve imzalat'}</button>${gecmis ? `<button class="dg dg-cizgi" data-gelmedi="${d.id}">Gelmedi</button>` : ''}` : `<button class="dg dg-ana" data-ders-basla="${d.id}">${ik('direksiyon')}Dersi başlat</button><button class="dg dg-cizgi" data-gelmedi="${d.id}">Gelmedi</button>`}<button class="dg dg-cizgi eg-diger" data-ders-diger="${d.id}" aria-label="Diğer işlemler">${ik('menu')}</button></div>` : ''}
  </article>`;
}
let egGun = null;
export function egitmenPortal() {
  const usta = oturum.kullanici && oturum.kullanici.rol === 'usta';
  if (usta) egId = oturum.kullanici.usta;
  const eg = egitmen(egId) || (!usta && S.egitmenler[0]);
  if (!eg) return { baslik: 'Öğretmen ekranı', alt: 'Telefondan kullanılan ekran', html: `<div class="portal portal-og"><div class="kart og-kart">${bos(usta ? 'Hesabınız bir öğretmen kaydına bağlı değil' : 'Henüz öğretmen yok', usta ? 'Kurs müdürü Ayarlar › Kullanıcılar’dan sizi yeniden davet etmeli.' : 'Filo › Öğretmenler’den öğretmen ekleyince ders ekranı burada görünür.')}</div></div>` };
  egId = eg.id;
  const benim = S.dersler.filter(d => d.egitmen === eg.id);
  const bugun = benim.filter(d => d.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  const kapanmamis = benim.filter(d => d.durum === 'Planlandı' && d.tarih < gun(0) && d.tarih >= gun(-14)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const ar = S.araclar.find(a => a.egitmen === eg.id), ad1 = e(eg.ad.split(' ')[0]);
  const ogrenciler = S.kursiyerler.filter(k => k.egitmen === eg.id && ['Direksiyon', 'Sınav'].includes(k.asama));
  let govde = '';
  if (egSekme === 'bugun') {
    const siradaki = bugun.find(d => d.durum === 'Planlandı' && d.bas) || bugun.find(d => d.durum === 'Planlandı');
    const aracSat = ar ? `<div class="eg-arac">${aracGorsel(ar, 'kucuk')}<div><b>${e(ar.model)} · ${e(ar.plaka)}</b><small>Bugün senin aracın · bakıma ${Math.max(0, ar.bakimKm - ar.km).toLocaleString('tr-TR')} km</small></div></div>` : '';
    govde = `${kapanmamis.length ? `<section class="og-grup" style="margin-top:6px"><h3 class="og-grup-bas">Kapatman gereken dersler</h3><p class="og-not" style="margin:-4px 2px 10px">Bu dersler yapıldı ya da öğrenci gelmedi olarak işaretlenmemiş. Takip formu ve ders sayısı için kapat.</p>${kapanmamis.map(d => egDersKart(d)).join('')}</section>` : ''}
      <section class="og-grup" style="margin-top:${kapanmamis.length ? 22 : 6}px"><h3 class="og-grup-bas">Bugünkü derslerin</h3>
      ${bugun.length ? bugun.map(d => egDersKart(d, d === siradaki)).join('') : `<div class="kart og-kart eg-bos"><b>Bugün dersin yok</b><p>Kurs sana ders planlayınca burada görünür.</p>
        <ol class="eg-nasil"><li><span>1</span><div><b>Dersi başlat</b><small>Başlangıç saati ve konum kaydedilir.</small></div></li><li><span>2</span><div><b>Bitir: konu ve puan</b><small>Çalışılan konular takip formuna yazılır; becerilere 1–5 puan verilir.</small></div></li><li><span>3</span><div><b>İmzalat</b><small>Öğrenci telefonuna imza atar ya da imza linki WhatsApp’tan gider.</small></div></li></ol>
        <p class="og-not">Öğrenci gelmezse “Gelmedi”ye dokun; öğrenciye ve müdüre haber gider. Dersi iptal etmek için ⋯ menüsünü kullan.</p></div>`}</section>
      ${aracSat ? `<section class="og-grup"><h3 class="og-grup-bas">Aracın</h3>${aracSat}</section>` : ''}`;
  }
  if (egSekme === 'hafta') {
    const gunler = []; for (let n = 0; n < 7; n++) gunler.push(gun(n));
    if (!egGun || !gunler.includes(egGun)) egGun = gunler[0];
    const say = g => benim.filter(d => d.tarih === g).length, top = gunler.reduce((a, g) => a + say(g), 0);
    const l = benim.filter(d => d.tarih === egGun).sort((a, b) => a.saat.localeCompare(b.saat));
    const satir = d => { const k = kursiyer(d.kursiyer); if (!k) return ''; const S0 = SINIFLAR[k.sinif]; return `<li class="og-olay"><div class="og-zaman"><b class="mono">${d.saat}</b></div><div class="og-olay-ad"><b>${e(tamAd(k))}</b><small>${S0.ad} · ${d.durum === 'Planlandı' ? (k.direksiyon + 1) + '. ders' : k.direksiyon + ' ders yapıldı'}${d.arac && arac(d.arac) ? ' · ' + e(arac(d.arac).plaka) : ''}</small></div>${d.durum === 'Planlandı' ? '' : rozet(d.durum, DURUM_TON[d.durum] || 'notr')}</li>`; };
    govde = `<div class="og-sayac"><div><small>Bu hafta</small><b>${top}<span> ders</span></b></div><div><small>Öğrencilerin</small><b>${new Set(gunler.flatMap(g => benim.filter(d => d.tarih === g).map(d => d.kursiyer))).size}<span> kişi</span></b></div></div>
      <div class="eg-gunler" role="tablist">${gunler.map(g => `<button role="tab" aria-selected="${g === egGun}" data-eg-gun="${g}" class="${g === egGun ? 'secili' : ''} ${say(g) ? '' : 'bos'}"><small>${g === gun(0) ? 'Bugün' : gunKisa(g)}</small><b>${+g.slice(8)}</b><i>${say(g) || '–'}</i></button>`).join('')}</div>
      <section class="kart og-kart"><div class="og-bas"><div><small>${goreli(egGun) === tarih(egGun) ? '' : goreli(egGun) + ' · '}${tarihUzun(egGun)}</small><b>${l.length ? l.length + ' ders' : 'Ders yok'}</b></div></div>
        ${l.length ? `<ul class="og-olaylar">${l.map(satir).join('')}</ul>` : '<p class="og-bos">Bu güne planlı dersin yok.</p>'}</section>`;
  }
  if (egSekme === 'kursiyer') {
    govde = ogrenciler.length ? `<div class="eg-ogrenciler">${ogrenciler.map(k => { const S0 = SINIFLAR[k.sinif], sd = sonrakiDers(k), dd = (k.dDeneme || []).slice(-1)[0], r = risk(k);
      return `<article class="kart og-kart eg-ogr"><div class="eg-ogr-ust">${avatar(k.ad, k.soyad, k.foto)}<div><b>${e(tamAd(k))}</b><small>${S0.ad} · ${k.asama}</small></div><span class="eg-ogr-sayi"><b>${k.direksiyon}</b>/${S0.direksiyon}</span></div>
        ${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}
        <div class="eg-ogr-bilgi"><span>${ik('takvim')}${sd ? 'Sonraki ders ' + goreli(sd.tarih).toLocaleLowerCase('tr') + ' ' + sd.saat : 'Planlı ders yok'}</span>${dd ? `<span class="${dd.sonuc === 'Geçti' ? 'iyi' : 'kotu'}">${ik('sinav')}Son deneme: ${dd.sonuc === 'Geçti' ? 'geçerdi' : 'kalırdı'}</span>` : ''}${r && r.puan >= 50 ? `<span class="kotu">${ik('uyari')}Sınav riski yüksek</span>` : ''}</div>
        <div class="eg-dg"><button class="dg dg-cizgi" data-deneme="${k.id}">${ik('sinav')}Deneme sınavı yap</button><a class="dg dg-cizgi eg-diger" href="tel:${(k.tel || '').replace(/\s/g, '')}" aria-label="Ara">${ik('tel')}</a></div></article>`; }).join('')}</div>`
      : `<div class="kart og-kart">${bos('Direksiyondaki öğrencin yok', 'Kurs sana öğrenci atayınca burada ders sayısını, sonraki dersini ve deneme sınavı sonucunu görürsün.')}</div>`;
  }
  const yapilan = bugun.filter(d => d.durum === 'Yapıldı').length;
  return {
    baslik: 'Usta öğretici ekranı', alt: 'Telefondan kullanılan ekran',
    html: `<div class="portal portal-og">
      ${usta ? '' : `<div class="og-onizleme">${isaret('bilgi', 16)}<span>Personel önizlemesi</span><select class="girdi" data-eg aria-label="Usta öğretici seç">${S.egitmenler.map(x => `<option value="${x.id}" ${x.id === eg.id ? 'selected' : ''}>${e(x.ad)}</option>`).join('')}</select></div>`}
      <header class="og-ust"><div><small>Merhaba,</small><h2>${ad1} Hoca</h2></div><span class="og-asama">${egSekme === 'bugun' ? (bugun.length ? yapilan + '/' + bugun.length + ' ders bitti' : 'Bugün ders yok') : egSekme === 'hafta' ? 'Haftan' : ogrenciler.length + ' öğrenci'}</span></header>
      ${govde}
    </div>
    <nav class="og-sekme" aria-label="Öğretmen ekranı">${[['bugun', 'Bugün', 'direksiyon'], ['hafta', 'Haftam', 'takvim'], ['kursiyer', 'Öğrencilerim', 'kursiyer']].map(([kk, t, i]) => `<button data-egs="${kk}" class="${kk === egSekme ? 'secili' : ''}" ${kk === egSekme ? 'aria-current="page"' : ''}>${ik(i)}<span>${t}${kk === 'bugun' && kapanmamis.length ? ' <em>' + kapanmamis.length + '</em>' : ''}</span></button>`).join('')}</nav>`,
    baglan(k) {
      k.addEventListener('change', ev => { if (ev.target.matches('[data-eg]')) { egId = ev.target.value; yenile(); } });
      k.addEventListener('click', ev => {
        const t = ev.target;
        const dn = t.closest('[data-deneme]'); if (dn) return import('./deneme.js?v=102').then(m => m.denemeAc(kursiyer(dn.dataset.deneme), yenile));
        const s = t.closest('[data-egs]'); if (s) { egSekme = s.dataset.egs; return yenile(true); }
        const eg2 = t.closest('[data-eg-gun]'); if (eg2) { egGun = eg2.dataset.egGun; return yenile(); }
        const db = t.closest('[data-ders-basla]'); if (db) {
          const d = S.dersler.find(x => x.id === db.dataset.dersBasla);
          if (d.tarih !== gun(0)) return bildir('Yalnız bugünkü ders başlatılabilir', 'uyari');
          if (benim.some(x => x !== d && x.tarih === gun(0) && x.durum === 'Planlandı' && x.bas)) return bildir('Önce başlattığın dersi bitir', 'uyari');
          d.bas = new Date().toTimeString().slice(0, 5); d.basZaman = Date.now(); d.konum = null; islem('Dersi başlattı', tamAd(kursiyer(d.kursiyer)) + ' · ' + d.bas); kaydet(); yenile();
          if (!navigator.geolocation) return bildir('Ders başladı; bu cihaz konum vermiyor', 'uyari');
          izBaslat(d);
          navigator.geolocation.getCurrentPosition(p => { d.konum = konumOku(p); kaydet(); bildir('Ders başladı; başlangıç saati ve konum kaydedildi'); yenile(); }, () => { d.konum = false; kaydet(); bildir('Ders başladı; konum izni verilmediği için konum kaydedilmedi', 'uyari'); yenile(); }, { timeout: 10000, maximumAge: 60000 });
          return;
        }
        const y = t.closest('[data-yapildi]'); if (y) return dersKapat(S.dersler.find(x => x.id === y.dataset.yapildi));
        const it = t.closest('[data-imza-tekrar]'); if (it) { const d = S.dersler.find(x => x.id === it.dataset.imzaTekrar); import('./imza.js?v=102').then(m => m.imzaIste('ders', kursiyer(d.kursiyer), [d.id])); return; }
        const g = t.closest('[data-gelmedi]'); if (g) return gelmediIsaretle(S.dersler.find(x => x.id === g.dataset.gelmedi));
        const dg = t.closest('[data-ders-diger]'); if (dg) return dersDiger(S.dersler.find(x => x.id === dg.dataset.dersDiger));
      });
    },
  };
}

/* ================= KURSİYER ================= */
const konuOran = (k, kn) => { const a = (k.konuAnaliz || {})[kn]; return a && a[1] ? Math.round(a[0] / a[1] * 100) : null; };
const konuAdi = id => { if (!id) return ''; const [kat, n] = [id.replace(/-\d+$/, ''), +id.split('-').pop()], m = MUFREDAT.find(x => x[0] === kat); return m ? m[3][n - 1] : ''; };
const konuLink = qi => { const id = soruKonu(qi, SORULAR[qi][0]); return id ? `<button type="button" class="dg dg-hafif dg-kucuk" data-og-ders="${id}">Konuyu oku: ${e(konuAdi(id))}</button>` : ''; };
const karistir = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const idx = () => SORULAR.map((_, i) => i);
let test = { mod: null };
let sayac = null;
function testBaslat(mod, k, konu) {
  let liste;
  if (mod === 'deneme') liste = Object.entries(KONULAR).flatMap(([kn, [, n]]) => karistir(idx().filter(i => SORULAR[i][0] === kn)).slice(0, n));
  else if (mod === 'konu') liste = karistir(idx().filter(i => SORULAR[i][0] === konu)).slice(0, 10);
  else if (mod === 'yanlis') liste = karistir(k.yanlislar || []).slice(0, 10);
  else if (mod === 'tekrar') liste = karistir(HZ.tekrarBugun(k).filter(i => i < SORULAR.length)).slice(0, 20);
  else liste = karistir(idx()).slice(0, 10);
  test = { mod, konu, liste, i: 0, dogru: 0, cevap: null, basla: Date.now(), cevaplar: [] };
}
function testBitir(k) {
  const konu = {};
  test.cevaplar.forEach(([qi, c]) => { const kn = SORULAR[qi][0]; konu[kn] = konu[kn] || [0, 0]; konu[kn][1]++; if (c === SORULAR[qi][3]) konu[kn][0]++; });
  k.konuAnaliz = k.konuAnaliz || {};
  Object.entries(konu).forEach(([kn, [d, t]]) => { const a = k.konuAnaliz[kn] || [0, 0]; k.konuAnaliz[kn] = [a[0] + d, a[1] + t]; });
  const yanlis = test.cevaplar.filter(([qi, c]) => c !== SORULAR[qi][3]).map(([qi]) => qi), dogruQ = test.cevaplar.filter(([qi, c]) => c === SORULAR[qi][3]).map(([qi]) => qi);
  k.yanlislar = [...new Set([...(k.yanlislar || []).filter(x => !dogruQ.includes(x)), ...yanlis])];
  if (test.mod === 'deneme') { k.deneme = k.deneme || []; k.deneme.push(test.dogru * 2); }
  HZ.gorulenEkle(k, test.cevaplar.map(([qi]) => qi));
  HZ.tekrarGuncelle(k, test.cevaplar.map(([qi, c]) => [qi, c === SORULAR[qi][3]]));
  test.sonuc = { konu, yanlis: yanlis.length, yanlisListe: test.cevaplar.filter(([qi, c]) => c !== SORULAR[qi][3]) };
  kaydet();
}
// Ana sayfa: önce sıradaki iş (ders ya da sınav), sonra öğrencinin yapması gerekenler, sonra kısa özet; ayrıntılar sekmelerde
function anaSayfa(k, sd, sinav) {
  const S0 = SINIFLAR[k.sinif], sn = OG.sonrakiTaksit(k), tb = ogrOzellik('tekrar') ? HZ.tekrarBugun(k).length : 0;
  const esGecti = k.esinav && k.esinav.sonuc === 'Geçti';
  let sira = '';
  if (sd) { const a = sd.arac && arac(sd.arac); sira = `<section class="og-sira">${a ? aracGorsel(a, 'og-sira-arac') : ''}<small>Sıradaki direksiyon dersin</small><b class="og-sira-zaman">${goreli(sd.tarih)} · ${sd.saat}</b><p>${e(egitmen(sd.egitmen).ad)} ile${a ? ' · ' + e(a.model) : ''} · ${k.direksiyon + 1}. ders</p><div class="og-sira-dg"><button class="dg dg-kucuk og-sira-ikincil" data-degis="${sd.id}">Gelemeyeceğim</button><button class="dg dg-kucuk og-sira-ikincil" data-ogs="ders">Tüm derslerim</button></div></section>`; }
  else if (sinav) sira = `<section class="og-sira"><small>Sıradaki sınavın</small><b class="og-sira-zaman">${e(sinav.tur)} · ${goreli(sinav.tarih)} ${sinav.saat}</b><p>${e(sinav.yer)}. Kimliğini yanına almayı unutma.</p><div class="og-sira-dg"><button class="dg dg-kucuk og-sira-ikincil" data-ogs="sinav">Sınav bilgileri</button></div></section>`;
  else if (k.asama === 'Ehliyet') sira = `<section class="og-sira"><small>Tebrikler</small><b class="og-sira-zaman">Ehliyetini aldın!</b><p>İyi yolculuklar. Belgelerin ve makbuzların burada durmaya devam eder.</p></section>`;
  else if (!esGecti && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama)) sira = `<section class="og-sira"><small>Şimdi sıra sende</small><b class="og-sira-zaman">e-Sınava hazırlan</b><p>${HZ.hazirlik(k).oneri[0] ? e(HZ.hazirlik(k).oneri[0]) + '.' : 'Bir deneme sınavı çözerek başla.'}</p><div class="og-sira-dg"><button class="dg dg-kucuk og-sira-ana" data-test-basla="deneme" data-og-sinava>Deneme sınavı çöz</button><button class="dg dg-kucuk og-sira-ikincil" data-ogs="sinav">Çalışma alanı</button></div></section>`;
  else if (S0.direksiyon) sira = `<section class="og-sira"><small>Planlı dersin yok</small><b class="og-sira-zaman">Direksiyon dersi al</b><p>Uygun saatleri gör, sana uyanı seç.</p><div class="og-sira-dg"><button class="dg dg-kucuk og-sira-ana" data-iste>${ik('arti')}Ders al</button></div></section>`;
  // yapılacaklar: yalnız öğrencinin bir şey yapması gerekenler, önem sırasıyla
  const is = [], satir = (ikon, ton, baslik, alt, dugme) => `<li class="og-is ${ton}"><span class="og-m-ik">${ik(ikon)}</span><div><b>${baslik}</b>${alt ? `<small>${alt}</small>` : ''}</div>${dugme}</li>`;
  if (sn && fark(sn.t.vade) < 0) is.push(satir('kart', 'kirmizi', 'Taksitin gecikti', `${tl(sn.t.tutar - (sn.t.kismi || 0))} · vade ${tarih(sn.t.vade)}`, `<button class="dg dg-ana dg-kucuk" data-ode="${sn.i}">Öde</button>`));
  if (k.ekDersTeklif) is.push(satir('direksiyon', 'mavi', `${k.ekDersTeklif.n} ek ders önerisi · ${tl(k.ekDersTeklif.tutar)}`, 'Kabul edersen ücret ödeme planına eklenir', `<span class="og-is-dg"><button class="dg dg-ana dg-kucuk" data-og-ekders="evet">Kabul</button><button class="dg dg-cizgi dg-kucuk" data-og-ekders="hayir">Hayır</button></span>`));
  (S.bosTeklif || []).filter(t => t.adaylar.includes(k.id) && fark(t.tarih) >= 0).forEach(t => is.push(satir('saat', 'mavi', `Boş saat: ${goreli(t.tarih)} ${t.saat}`, e(egitmen(t.egitmen).ad) + ' · ilk kabul eden alır', `<button class="dg dg-ana dg-kucuk" data-og-bos="${t.id}">Al</button>`)));
  const ob = S0.direksiyon && ogrOzellik('dersOnay') ? OG.onayBekleyen(k) : 0;
  if (ob) is.push(satir('kalem', 'sari', `${ob} dersini onayla`, 'Ders yapıldıysa ders defterinde “Yapıldı”ya dokun', `<button class="dg dg-cizgi dg-kucuk" data-git="ders:defter">Aç</button>`));
  const eb = OG.eksikBelge(k);
  if (eb) is.push(satir('belge', 'sari', `${eb} belgen eksik`, 'Fotoğrafını çekip buradan gönderebilirsin', `<button class="dg dg-cizgi dg-kucuk" data-git="evrak:evrak">Yükle</button>`));
  if (sn && fark(sn.t.vade) >= 0 && fark(sn.t.vade) <= 10) is.push(satir('kart', '', `Taksit ${goreli(sn.t.vade).toLocaleLowerCase('tr')}`, `${tl(sn.t.tutar - (sn.t.kismi || 0))} · vade ${tarih(sn.t.vade)}`, `<button class="dg dg-cizgi dg-kucuk" data-ode="${sn.i}">Öde</button>`));
  if (tb) is.push(satir('sifirla', '', `Bugün ${tb} tekrar sorun var`, 'Yanlış yaptığın sorular aralıklarla yeniden gelir', `<button class="dg dg-cizgi dg-kucuk" data-test-basla="tekrar" data-og-sinava>Başla</button>`));
  if (sinav && sd && fark(sinav.tarih) <= 14) is.push(satir('sinav', '', `${e(sinav.tur)} sınavın ${goreli(sinav.tarih).toLocaleLowerCase('tr')}`, `${sinav.saat} · ${e(sinav.yer)}`, `<button class="dg dg-cizgi dg-kucuk" data-ogs="sinav">Gör</button>`));
  const deg = OG.degerlendirKart(k);
  const yapilacak = is.length || deg ? `<section class="og-grup"><h3 class="og-grup-bas">Yapman gerekenler</h3>${deg}${is.length ? `<ul class="og-isler">${is.join('')}</ul>` : ''}</section>` : `<p class="og-yolunda">${isaret('tamam', 18)}Şu an senden beklenen bir şey yok.</p>`;
  // özet karoları: dokununca ilgili sekme
  const hz = HZ.hazirlik(k), kalan = kalanBorc(k);
  const karo = (sekme, et, deger, alt, cubuk) => `<button class="og-ozet-karo" data-ogs="${sekme}"><small>${et}</small><b>${deger}</b>${cubuk || ''}${alt ? `<span>${alt}</span>` : ''}</button>`;
  const ozet = `<section class="og-grup"><h3 class="og-grup-bas">Durumun</h3><div class="og-ozet-karolar">
    ${S0.direksiyon ? karo('ders', 'Direksiyon', `${k.direksiyon}<i>/${S0.direksiyon}</i>`, '', ilerleme(k.direksiyon, S0.direksiyon, 'yesil')) : ''}
    ${karo('ders', 'Teorik', `${k.teorik}<i>/${S0.teorik}</i>`, '', ilerleme(k.teorik, S0.teorik, 'yesil'))}
    ${karo('odeme', 'Kalan borç', kalan ? tl(kalan) : 'Yok', kalan && sn ? 'Sonraki ' + tarih(sn.t.vade) : 'Ödemelerin tamam', '')}
    ${esGecti ? karo('sinav', 'e-Sınav', 'Geçti', k.esinav.puan ? k.esinav.puan + ' puan' : '', '') : karo('sinav', 'e-Sınava hazırlık', hz.puan + '<i>/100</i>', '', ilerleme(hz.puan, 100, hz.puan >= 70 ? 'yesil' : ''))}
  </div></section>`;
  return sira + yapilacak + ozet + OG.kurulumKart();
}
// Sınav sekmesi menüsü: önce sınav durumu, sonra öğrencinin aşamasına göre önce direksiyon ya da e-sınav çalışması
function sinavMenu(k) {
  const tb = ogrOzellik('tekrar') ? HZ.tekrarBugun(k).length : 0, son = (k.deneme || []).slice(-3), yn = (k.yanlislar || []).length;
  const esGecti = k.esinav && k.esinav.sonuc === 'Geçti', dirVar = SINIFLAR[k.sinif].direksiyon && ogrOzellik('direksiyon'), dirOnce = dirVar && ['Direksiyon', 'Sınav'].includes(k.asama);
  const karo = (mod, baslik, alt, ikon, ek = '') => `<button class="og-karo" data-test-basla="${mod}" ${ek}><span class="og-karo-ik">${ik(ikon)}</span><b>${baslik}</b><small>${alt}</small></button>`;
  const oranlar = Object.entries(KONULAR).map(([kn, [ad]]) => [kn, ad, konuOran(k, kn)]), zayif = oranlar.filter(x => x[2] != null && x[2] < 70).sort((a, b) => a[2] - b[2])[0];
  const calis = `${ogrOzellik('hazirlik') && !esGecti ? HZ.hazirlikKarti(k, true) : ''}
    <div class="og-karolar"><button class="og-karo og-karo-ana" data-test-basla="deneme"><span class="og-karo-ik">${ik('sinav')}</span><b>Deneme sınavı</b><small>50 soru · 45 dakika · geçme puanı 70${son.length ? ' · son puanların ' + son.join(', ') : ''}</small></button>
      ${tb ? karo('tekrar', 'Bugünkü tekrar', tb + ' soru', 'sifirla') : ''}${karo('hizli', 'Hızlı test', '10 karışık soru', 'saat')}${karo('yanlis', 'Yanlışlarım', yn + ' soru', 'kapat', yn ? '' : 'disabled')}
      ${ogrOzellik('tehlike') ? `<button class="og-karo" data-tehlike><span class="og-karo-ik">${ik('uyari')}</span><b>Tehlike algısı</b><small>${(k.tehlike || []).length ? 'Son puan ' + k.tehlike.slice(-1)[0].puan + '/' + k.tehlike.slice(-1)[0].en : '8 kısa sahne'}</small></button>` : ''}</div>
    ${OG.modul('konular', { ikon: 'teorik', baslik: 'Konu konu başarın', ozet: zayif ? `En zayıf: ${e(zayif[1])} %${zayif[2]}` : 'Bir konuya dokun, 10 soruluk test başlar' },
      `<div class="og-konu-liste">${oranlar.map(([kn, ad, o]) => `<button class="konu-sat" data-test-basla="konu" data-konu="${kn}"><span>${ad}</span>${o != null && o < 70 ? rozet('Çalış', 'kirmizi') : ''}<b class="mono" style="color:${o != null && o < 70 ? 'var(--kirmizi)' : 'var(--murekkep)'}">${o == null ? '–' : '%' + o}</b>${ilerleme(o || 0, 100, o != null && o < 70 ? '' : 'yesil')}</button>`).join('')}</div>`)}
    <p class="og-not og-orta">Havuzda ${SORULAR.length || '1.900’den fazla'} soru var. Sonuçların teorik öğretmenine gider; zayıf olduğun konuya ek ders konur.</p>`;
  const esBolum = esGecti ? `<section class="og-grup">${OG.modul('esCalis', { ikon: 'teorik', baslik: 'Teorik soruları tekrar et', ozet: 'e-Sınavı geçtin; istersen çalışmaya devam edebilirsin' }, calis)}</section>` : `<section class="og-grup"><h3 class="og-grup-bas">e-Sınava çalış</h3>${calis}</section>`;
  const dirBolum = dirVar ? `<section class="og-grup"><h3 class="og-grup-bas">Direksiyon sınavına çalış</h3>${OG.dirDenemeHtml(k)}${OG.modul('dirhaz', { ikon: 'direksiyon', baslik: 'Sınavda neye bakılır', ozet: `Resmî değerlendirme formu · ${Object.keys(k.dirCalisma || {}).length} bölüm çalışıldı`, acik: false }, '<div data-dir-yer></div>')}</section>` : '';
  return `<section class="og-grup"><h3 class="og-grup-bas">Sınavların</h3>${OG.sinavlarHtml(k)}</section>` + (dirOnce ? dirBolum + esBolum : esBolum + dirBolum);
}
const OG_SEKME = [['durum', 'Ana sayfa', 'genel'], ['ders', 'Derslerim', 'takvim'], ['sinav', 'Sınav', 'sinav'], ['odeme', 'Ödeme', 'kart'], ['evrak', 'Belgeler', 'belge']];
export function ogrenciPortal() {
  // önizlemede ilk açılan öğrenci dolu bir örnek olsun: planlı dersi, ödenmemiş taksiti ve puanlanmış dersleri olan
  if (!S.kursiyerler.length) return { baslik: 'Öğrenci ekranı', alt: 'Öğrencinin telefonundan gördüğü ekran', html: `<div class="portal"><div class="kart">${bos('Henüz öğrenci yok', 'İlk öğrenciyi kaydedince onun telefonda göreceği ekran burada önizlenir.')}</div></div>` };
  if (!ogId || !kursiyer(ogId)) { const puan = k => (sonrakiDers(k) ? 4 : 0) + (k.odeme.taksitler.some(t => !t.odendi) ? 2 : 0) + (S.dersler.some(d => d.kursiyer === k.id && d.beceri) ? 2 : 0) + (k.asama === 'Direksiyon' ? 1 : 0); ogId = [...S.kursiyerler].sort((a, b) => puan(b) - puan(a))[0].id; }
  if (ogSekme === 'program') ogSekme = 'ders';
  const k = kursiyer(ogId), S0 = SINIFLAR[k.sinif];
  const sd = sonrakiDers(k);
  const sinav = S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  let govde = '';
  if (ogSekme === 'durum') govde = anaSayfa(k, sd, sinav);
  if (ogSekme === 'ders') govde = OG.derslerHtml(k);
  if (ogSekme === 'odeme') govde = OG.odemelerHtml(k);
  if (ogSekme === 'sinav') {
    if (!SORULAR.length) sorulariYukle().then(() => { if (location.hash.startsWith('#/ogrenci')) yenile(); });
    const MOD_AD = { deneme: 'Deneme sınavı', hizli: 'Hızlı test', konu: 'Konu çalışması', yanlis: 'Yanlışlarım', tekrar: 'Bugünkü tekrar' };
    if (!test.mod) govde = sinavMenu(k);
    else if (test.i >= test.liste.length) {
      const toplam = test.liste.length, puan = test.mod === 'deneme' ? test.dogru * 2 : Math.round(test.dogru / Math.max(1, toplam) * 100);
      govde = `<div class="kart soru" style="text-align:center">${test.mod === 'deneme' ? `<small style="color:var(--soluk)">Deneme sınavı puanın</small><b style="display:block;font-family:var(--baslik);font-size:46px;color:${puan >= 70 ? 'var(--yesil)' : 'var(--kirmizi)'}">${puan}</b><p>${puan >= 70 ? 'Geçme puanının üstündesin.' : 'Geçme puanı 70; biraz daha çalışalım.'}</p>` : `<h4 style="font-size:20px">${test.dogru}/${toplam} doğru</h4>`}
        <ul class="liste" style="text-align:left;margin:12px -20px">${Object.entries(test.sonuc.konu).map(([kn, [d, t]]) => `<li><span style="flex:1">${KONULAR[kn][0]}</span><b class="mono">${d}/${t}</b></li>`).join('')}</ul>
        <p style="font-size:13.5px;color:var(--soluk)">${test.sonuc.yanlis ? test.sonuc.yanlis + ' yanlışın tekrar listene eklendi; yarın yeniden sorulacak.' : 'Hiç yanlışın yok.'}</p>
        ${test.mod === 'deneme' && test.sonuc.yanlisListe.length ? `<details style="text-align:left;margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:var(--murekkep)">Yanlışlarını gözden geçir (${test.sonuc.yanlisListe.length})</summary>${test.sonuc.yanlisListe.map(([qi, c]) => { const q = SORULAR[qi]; return `<div style="border-top:1px solid var(--cizgi-2);padding:12px 0">${q[4] ? `<div class="soru-gorsel" style="max-width:140px">${gorselHtml(q[4])}</div>` : ''}<b style="display:block;color:var(--murekkep);margin-bottom:6px">${e(q[1])}</b><p style="font-size:13.5px;color:var(--kirmizi)">Senin cevabın: ${'ABCD'[c] || '—'}) ${e(q[2][c] || 'boş')}</p><p style="font-size:13.5px;color:var(--yesil)">Doğrusu: ${'ABCD'[q[3]]}) ${e(q[2][q[3]])}</p>${q[5] ? `<p style="font-size:13px;margin-top:4px">${e(q[5])}</p>` : ''}<div style="margin-top:6px">${konuLink(qi)}</div></div>`; }).join('')}</details>` : ''}<button class="dg dg-koyu" style="margin-top:10px" data-test-menu>Tamam</button></div>`;
    } else {
      const [kn, q, sec, dogru, gorsel] = SORULAR[test.liste[test.i]], aninda = test.mod !== 'deneme';
      govde = `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--soluk);margin-bottom:8px"><span>${MOD_AD[test.mod]} · ${KONULAR[kn][0]}</span><span>${test.mod === 'deneme' ? '<b class="mono" data-kalan></b> · ' : ''}${test.i + 1}/${test.liste.length}</span></div>${ilerleme(test.i, test.liste.length)}<div class="ara-bosluk" style="height:12px"></div>
        <div class="kart soru">${gorsel ? `<div class="soru-gorsel">${gorselHtml(gorsel)}</div>` : ''}<h4>${e(q)}</h4>${sec.map((s2, i) => `<button class="secenek ${aninda && test.cevap != null ? (i === dogru ? 'dogru' : i === test.cevap ? 'yanlis' : '') : ''}" data-cevap="${i}" ${test.cevap != null ? 'disabled' : ''}><b>${'ABCD'[i]}</b>${e(s2)}</button>`).join('')}${aninda && test.cevap != null && SORULAR[test.liste[test.i]][5] ? `<p class="soru-aciklama"><b>${test.cevap === dogru ? 'Doğru.' : 'Doğrusu: ' + 'ABCD'[dogru] + '.'}</b> ${e(SORULAR[test.liste[test.i]][5])}${SORULAR[test.liste[test.i]][6] ? `<small>${e(SORULAR[test.liste[test.i]][6])}</small>` : ''}</p>` : ''}${aninda && test.cevap != null ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${test.cevap !== dogru ? konuLink(test.liste[test.i]) : ''}<button type="button" class="dg dg-hafif dg-kucuk" data-soru-bildir style="margin-left:auto">Soruda hata mı var?</button></div><button class="dg dg-koyu" style="width:100%;margin-top:6px" data-sonraki>Sonraki soru</button>` : ''}</div>
        <button class="dg dg-hafif dg-kucuk" data-test-menu>Testi bırak</button>`;
    }
  }
  if (ogSekme === 'evrak') govde = OG.belgelerHtml(k);
  const kendi = !!(oturum.kullanici && oturum.kullanici.rol === 'ogrenci');
  return {
    baslik: 'Kursiyer ekranı', alt: 'Kursiyerin telefonunda gördüğü ekran',
    html: `<div class="portal portal-og">
      ${kendi ? '' : `<div class="og-onizleme">${isaret('bilgi', 16)}<span>Personel önizlemesi</span><select class="girdi" data-og aria-label="Öğrenci seç">${S.kursiyerler.slice(0, 40).map(x => `<option value="${x.id}" ${x.id === k.id ? 'selected' : ''}>${e(tamAd(x))}</option>`).join('')}</select></div>`}
      ${ogSekme === 'durum' ? `<header class="og-ust">${avatar(k.ad, k.soyad, k.foto)}<div><small>Merhaba,</small><h2>${e(k.ad)}</h2></div><span class="og-asama">${e(k.asama === 'Ehliyet' ? 'Ehliyet alındı' : k.asama + ' aşaması')}</span></header>
        <ol class="og-yol" aria-label="Aşama: ${e(k.asama)}">${ASAMALAR.map((a, i) => `<li class="${i < asamaNo(k) ? 'gecti' : i === asamaNo(k) ? 'simdi' : ''}"><i></i><span>${a}</span></li>`).join('')}</ol>`
        : `<header class="og-ust og-ust-kucuk"><h2>${OG_SEKME.find(x => x[0] === ogSekme)[1]}</h2><small>${e(tamAd(k))} · ${e(S0.ad)}</small></header>`}
      ${govde}
    </div>
    <nav class="og-sekme" aria-label="Öğrenci paneli">${OG_SEKME.map(([kk, t, i]) => `<button data-ogs="${kk}" class="${kk === ogSekme ? 'secili' : ''}" ${kk === ogSekme ? 'aria-current="page"' : ''}>${ik(i)}<span>${t}</span></button>`).join('')}</nav>`,
    baglan(kap) {
      clearInterval(sayac);
      const kalanEl = kap.querySelector('[data-kalan]');
      if (kalanEl) { const yaz = () => { const kalan = 45 * 60e3 - (Date.now() - test.basla); if (kalan <= 0) { clearInterval(sayac); test.i = test.liste.length; testBitir(k); yenile(); return; } kalanEl.textContent = String(Math.floor(kalan / 60e3)).padStart(2, '0') + ':' + String(Math.floor(kalan / 1e3) % 60).padStart(2, '0'); }; yaz(); sayac = setInterval(() => { if (!document.body.contains(kalanEl)) return clearInterval(sayac); yaz(); }, 1000); }
      kap.addEventListener('change', ev => { if (ev.target.matches('[data-og]')) { ogId = ev.target.value; test = { mod: null }; OG.modulSifirla(); yenile(); } });
      OG.ogBagla(kap, k, yenile);
      kap.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-ogs]'); if (s) { ogSekme = s.dataset.ogs; yenile(true); }
        const gt = t.closest('[data-git]'); if (gt) { const [sk, md] = gt.dataset.git.split(':'); if (md) OG.modulAc(md); ogSekme = sk; yenile(true); return; }
        const o = t.closest('[data-ode]'); if (o) odemeYap(k, +o.dataset.ode);
        const oe = t.closest('[data-og-ekders]'); if (oe) { if (oe.dataset.ogEkders === 'evet') ekDersKabul(k); else { k.ekDersTeklif = null; kaydet(); bildirimler([{ kim: 'mudur', metin: `${tamAd(k)} ek direksiyon dersi teklifini istemedi.`, tur: 'Kursiyer cevabı' }], 'Ek ders'); bildir('Cevabın kursa iletildi'); yenile(); } }
        const ob = t.closest('[data-og-bos]'); if (ob) bosTeklifKabul(ob.dataset.ogBos, k.id, true);
        const tb = t.closest('[data-test-basla]'); if (tb && !tb.disabled) { if (tb.matches('[data-og-sinava]')) ogSekme = 'sinav'; sorulariYukle().then(() => { testBaslat(tb.dataset.testBasla, k, tb.dataset.konu); yenile(true); }); }
        if (t.closest('[data-test-menu]')) { test = { mod: null }; yenile(true); }
        if (t.closest('[data-soru-bildir]')) { const qi = test.liste[test.i], q = SORULAR[qi]; return pencere({ baslik: 'Soruyu bildir', icerik: `<p style="font-size:14px;margin-bottom:10px">“${e(q[1].slice(0, 120))}”</p><div class="alan"><label>Sorun ne?</label><select class="girdi" data-n><option>Doğru cevap yanlış işaretlenmiş</option><option>Soru ya da şıklar anlaşılmıyor</option><option>Bilgi güncel değil</option><option>Görsel hatalı</option><option>Diğer</option></select></div><div class="alan" style="margin-top:10px"><label>Açıklama (isteğe bağlı)</label><input class="girdi" data-a maxlength="300"></div>`, altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Gönder</button>', onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { gonderimEkle(S.kurs.ad, `${tamAd(k)} soru bildirdi (#${qi + 1}): ${d.querySelector('[data-n]').value}${d.querySelector('[data-a]').value.trim() ? ' · ' + d.querySelector('[data-a]').value.trim() : ''} · “${q[1].slice(0, 90)}”`, 'Soru bildirimi'); kaydet(); kapatPencere(); bildir('Teşekkürler, soru incelenmek üzere iletildi'); }); } }); }
        const c = t.closest('[data-cevap]');
        if (c && test.mod && test.cevap == null) {
          const qi = test.liste[test.i], cv = +c.dataset.cevap; test.cevaplar.push([qi, cv]); if (cv === SORULAR[qi][3]) test.dogru++;
          if (test.mod === 'deneme') { test.i++; if (test.i >= test.liste.length) testBitir(k); } else test.cevap = cv;
          yenile();
        }
        if (t.closest('[data-sonraki]')) { test.i++; test.cevap = null; if (test.i >= test.liste.length) testBitir(k); yenile(); }
        const dg = t.closest('[data-degis]'); if (dg) { const sd2 = sonrakiDers(k), m = `Merhaba, ben ${tamAd(k)}. ${sd2 ? tarihUzun(sd2.tarih) + ' ' + sd2.saat + ' direksiyon dersimin saatini' : 'Ders saatimi'} değiştirmek istiyorum.`; gonderimEkle(S.kurs.ad, m, 'Kursiyer talebi'); if (waAc(S.kurs.wp, m, 'WhatsApp', tamAd(k), false, 'KURSA GELEN') !== 'api') bildir('WhatsApp açıldı; mesajı kursa gönder', 'wp'); }
        if (t.closest('[data-iste]')) return randevuAl(k);
        const oi = t.closest('[data-og-iptal]'); if (oi) return randevuIptal(k, oi.dataset.ogIptal);
      });
    },
  };
}
function odemeYap(k, i) {
  const t = k.odeme.taksitler[i];
  pencere({ baslik: 'Nasıl öderim?', icerik: `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><span>${i + 1}. taksit · vade ${tarih(t.vade)}</span><b class="sayi" style="font-size:22px;color:var(--murekkep)">${tl(t.tutar - (t.kismi || 0))}</b></div><p class="ipucu">${isaret('bilgi', 18)}<span>${S.kurs.iban ? 'Kursun banka hesabına havale/EFT ile öde: <b>' + e(S.kurs.iban) + '</b> (' + e(S.kurs.ad) + '); açıklamaya adını ve soyadını yaz. Ödemen kursa ulaşınca makbuzun burada görünür.' : 'Ödemeyi kursta yapabilirsin; banka bilgisi için kursa sor.'}</span></p>`, altlik: `${S.kurs.iban ? '<button class="dg dg-cizgi" data-og-iban>IBAN’ı kopyala</button>' : ''}<button class="dg dg-ana" data-kapat>Tamam</button>`, onAc(d) { const b = d.querySelector('[data-og-iban]'); if (b) b.addEventListener('click', () => { try { navigator.clipboard.writeText(S.kurs.iban.replace(/\s/g, '')); bildir('IBAN kopyalandı'); } catch (x) { bildir('IBAN: ' + S.kurs.iban); } }); } });
}
