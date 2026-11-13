import { oturum, islem, S, kaydet, gun, fark, tarihOku, SINIFLAR, ASAMALAR, EVRAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle, yerelZaman, BECERI, risk, ekToplam, selam, kursAdi, konuListesi, konuOner, DERS_TUR_AD, dersKalanSaat, dersIptalIz } from './veri.js?v=182';
import { e, saatDe, saatE, tl, ik, rozet, avatar, csvIndir, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, tarih, tarihUzun, goreli, gunKisa, aracGorsel, isaret, imzaAlani, waAc, waNumara } from './ui.js?v=182';
import { yenile } from './app.js?v=182';
import { ekDersKabul, bosTeklifKabul, wpGonder, bildirimler } from './sayfalar1.js?v=182';
import { KONULAR } from './konular.js?v=182';
// Soru bankası büyük; yalnız Sınavlar sekmesi ya da test açılınca yüklenir (açılış hızını etkilemesin)
let SORULAR = [], soruYuk = null;
// Sorular ve levha çizimleri yalnız sınav sekmesinde yüklenir; levhalı sorularda görsel "L:<kod>" olarak durur
let levhaSvg = () => '';
// yüklenemezse (zayıf internet) bir sonraki dokunuşta yeniden denenir; öğrenciye haber verilir
const sorulariYukle = () => soruYuk || (soruYuk = Promise.all([import('./sorular.js?v=182'), import('./levha.js?v=182').catch(() => null)]).then(([m, l]) => { SORULAR = m.SORULAR; if (l) levhaSvg = l.levhaSvg; }).catch(x => { soruYuk = null; bildir('Sorular yüklenemedi; internet bağlantını kontrol edip tekrar dene', 'uyari'); throw x; }));
const gorselHtml = g => !g ? '' : String(g).startsWith('L:') ? levhaSvg(g.slice(2)) : g;
import { randevuAl, randevuIptal } from './ozellik.js?v=182';
import * as OG from './ogrenci.js?v=182';
import * as HZ from './hazirlik.js?v=182';
import { ogrOzellik } from './veri.js?v=182';
import { ustaAlacak } from './risk.js?v=182';
import { ayAdi } from './ozellik.js?v=182';
import { soruKonu } from './soruKonu.js?v=182';
import { MUFREDAT } from './ogrenci.js?v=182';
import * as TK from './takvim.js?v=182';

let egId = 'e1', egSekme = 'bugun';
let ogId = null, ogSekme = (() => { try { return sessionStorage.getItem('sinyal-og-sekme') || 'durum'; } catch (x) { return 'durum'; } })();
const sekmeSakla = () => { try { sessionStorage.setItem('sinyal-og-sekme', ogSekme); } catch (x) { } };

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
    baslik: 'Dersi bitir', korumali: true,
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
        const m = await import('./imza.js?v=182'); await m.imzaIste('ders', ks, [d.id]); bildir('Ders kaydedildi; imza linki öğrenciye gidiyor', 'wp'); yenile(); riskKontrol(ks, once);
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
        dersIptalIz(d, neden, not); S.dersler = S.dersler.filter(x => x !== d);
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
  if (!d) return;
  if (dersKalanSaat(d) > 0) return bildir('Ders saati gelmeden “gelmedi” işaretlenemez', 'uyari');
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
// Günün saatine göre selam (öğretmen ve öğrenci ekranının başlığı)
export const selamla = () => { const s = new Date().getHours(); return s < 5 ? 'İyi geceler' : s < 11 ? 'Günaydın' : s < 18 ? 'İyi günler' : s < 23 ? 'İyi akşamlar' : 'İyi geceler'; };
// ---- Uygulama parçaları (öğretmen ve öğrenci) ----
// Üst bölümün arka planı: ufka uzanan gece yolu; şerit çizgisi yavaşça akar (hareket azaltılmışsa durur)
// Üst bölüm sahneleri: gece (yıldız, ay, şehir, uzak yolda süzülen farlar) ve gündüz (güneş, bulut, kuş, açık tonlu şehir, küçük arabalar).
// Her şey -700…1100 birim genişlikte çizilir; görüş alanı üst bölümün oranına göre ayarlanır (heroBoyutla), böylece dar telefonda da
// geniş ekranda da kenarlarda boşluk kalmaz, sahne büyüyüp yazıların üstüne çıkmaz. Hareketler yavaş; hareket azaltılmışsa durur.
const SAHNE_X0 = -700, SAHNE_X1 = 1100;
const sahneYol = (() => { let d = `M${SAHNE_X0} 206`; for (let x = SAHNE_X0, i = 0; x < SAHNE_X1; x += 130, i++) d += ` S${x + 95} ${i % 2 ? 216 : 194} ${x + 130} ${i % 2 ? 208 : 202}`; return d; })();
const sahneTepe = (y0, gen, yuk) => { let d = `M${SAHNE_X0} ${y0}`; for (let x = SAHNE_X0, i = 0; x < SAHNE_X1; x += gen, i++) d += ` S${x + gen * .6} ${y0 - (i % 2 ? yuk : yuk * .4)} ${x + gen} ${y0 - (i % 3 ? yuk * .3 : 0)}`; return d + ` V260 H${SAHNE_X0}Z`; };
function sahneSehir(tohum, pencereli) {
  let r = tohum; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  let x = SAHNE_X0, bina = '', pencere = '';
  while (x < SAHNE_X1) {
    const w = 13 + rnd() * 20, h = 12 + rnd() * 30, ust = 234 - h;
    bina += `<rect x="${x.toFixed(1)}" y="${ust.toFixed(1)}" width="${w.toFixed(1)}" height="${(h + 40).toFixed(1)}" rx="1"/>`;
    if (pencereli) for (let py = ust + 5; py < 226; py += 6) for (let px = x + 3; px < x + w - 3; px += 5) if (rnd() < .2) pencere += `<rect class="${rnd() < .3 ? 'u-pencere' : ''}" x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="1.8" height="2.4" style="animation-delay:-${(rnd() * 14).toFixed(1)}s"/>`;
    x += w + .8 + rnd() * 2.5;
  }
  return { bina, pencere };
}
const GECE_SVG = (() => {
  let r = 11; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const yildiz = Array.from({ length: 110 }, () => { const anim = rnd() < .3; return `<circle${anim ? ' class="u-yildiz"' : ''} cx="${(SAHNE_X0 + rnd() * (SAHNE_X1 - SAHNE_X0)).toFixed(1)}" cy="${(rnd() * 150).toFixed(1)}" r="${(.45 + rnd() * .9).toFixed(2)}" opacity="${anim ? 1 : (.25 + rnd() * .5).toFixed(2)}"${anim ? ` style="animation-duration:${(5 + rnd() * 5).toFixed(1)}s;animation-delay:-${(rnd() * 9).toFixed(1)}s"` : ''}/>`; }).join('');
  const { bina, pencere } = sahneSehir(17, true);
  const far = (renk, gecikme, ters) => `<g><circle r="3.2" fill="${renk}" opacity=".22"/><circle r="1.15" fill="${renk}"/><animateMotion dur="${ters ? 110 : 95}s" begin="-${gecikme}s" repeatCount="indefinite" path="${sahneYol}" ${ters ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ''}/></g>`;
  const farlar = [0, 12, 24, 36, 48, 60, 72, 84].map((g, i) => far(i % 3 === 2 ? '#ff8a7a' : '#fff3c9', g, i % 3 === 2)).join('');
  return `<svg class="u-gece" viewBox="50 0 300 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g fill="#fff">${yildiz}</g>
    <g class="u-ay-isik" fill="#f3e6c0"><circle cx="338" cy="50" r="40" opacity=".03"/><circle cx="338" cy="50" r="30" opacity=".04"/><circle cx="338" cy="50" r="21" opacity=".06"/><circle cx="338" cy="50" r="15.5" opacity=".08"/></g><circle cx="338" cy="50" r="11.5" fill="#f3e6c0" opacity=".92"/><circle cx="334" cy="47" r="2.4" fill="#e2d2a6" opacity=".6"/><circle cx="341.5" cy="54" r="1.6" fill="#e2d2a6" opacity=".55"/>
    <path d="${sahneTepe(214, 160, 14)}" fill="#132a52" opacity=".85"/>
    <g fill="#0f2346">${bina}</g><g fill="#ffd77a" opacity=".55">${pencere}</g>
    <path d="${sahneYol}" stroke="#2c4a7c" stroke-width="2.2" fill="none"/>${farlar}
    <path d="${sahneTepe(234, 140, 8)}" fill="#0a1a35"/>
  </svg>`;
})();
const GUNDUZ_SVG = (() => {
  const { bina } = sahneSehir(29, false);
  const bulut = (cx, cy, o, gec) => `<g class="u-bulut-kay" style="animation-delay:-${gec}s"><g fill="#fff" opacity="${o}"><circle cx="${cx}" cy="${cy}" r="10"/><circle cx="${cx + 12}" cy="${cy - 6}" r="13"/><circle cx="${cx + 27}" cy="${cy}" r="10"/><rect x="${cx}" y="${cy}" width="27" height="10"/></g></g>`;
  const bulutlar = [[0, 40, .32, 0], [0, 72, .24, 70], [0, 26, .3, 140], [0, 58, .26, 210], [0, 34, .3, 280], [0, 80, .22, 350]].map(b => bulut(...b)).join('');
  const araba = (renk, gec, ters) => `<g><g transform="translate(-4 -4)"><rect x="0" y="2.2" width="8" height="3.2" rx="1.4" fill="${renk}"/><rect x="2" y=".4" width="4" height="2.4" rx="1" fill="${renk}"/><circle cx="2" cy="5.6" r=".9" fill="#1c2129"/><circle cx="6" cy="5.6" r=".9" fill="#1c2129"/></g><animateMotion dur="${ters ? 120 : 105}s" begin="-${gec}s" repeatCount="indefinite" rotate="${ters ? 'auto-reverse' : 'auto'}" path="${sahneYol}" ${ters ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ''}/></g>`;
  const arabalar = [['#f2b705', 0], ['#ffffff', 14], ['#e0483d', 28, 1], ['#0a4da2', 42, 1], ['#2fa36b', 56], ['#ffffff', 70, 1], ['#f2b705', 84, 1], ['#e0483d', 98]].map(a => araba(...a)).join('');
  return `<svg class="u-gece" viewBox="50 0 300 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g class="u-ay-isik" fill="#fff4cf"><circle cx="338" cy="50" r="44" opacity=".06"/><circle cx="338" cy="50" r="32" opacity=".09"/><circle cx="338" cy="50" r="22" opacity=".14"/></g><circle cx="338" cy="50" r="13" fill="#fff1bf"/>
    ${bulutlar}
    <g stroke="#e8f1fb" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"><path d="M-4 0 q2 -2.4 4 0 q2 -2.4 4 0"/><path d="M8 -6 q1.6 -2 3 0 q1.6 -2 3 0"/><animateMotion dur="120s" begin="-20s" repeatCount="indefinite" path="M${SAHNE_X0} 110 C-200 96 200 120 500 100 S900 92 ${SAHNE_X1} 96"/></g>
    <path d="${sahneTepe(214, 160, 14)}" fill="#8bbbe8" opacity=".9"/>
    <g fill="#6c9fd6">${bina}</g>
    <path d="${sahneYol}" stroke="#5a8cc6" stroke-width="2.4" fill="none"/>${arabalar}
    <path d="${sahneTepe(234, 140, 8)}" fill="#4f84c2"/>
  </svg>`;
})();
// görüş alanı: yükseklik 260 birim sabit, genişlik üst bölümün oranına göre (300–1700), sahne ortada
function heroBoyutla() {
  document.querySelectorAll('svg.u-gece').forEach(g => { const r = g.getBoundingClientRect(); if (!r.width || !r.height) return; const vw = Math.max(300, Math.min(1700, 260 * r.width / r.height)); g.setAttribute('viewBox', `${(200 - vw / 2).toFixed(1)} 0 ${vw.toFixed(1)} 260`); });
}
addEventListener('resize', () => requestAnimationFrame(heroBoyutla));
const gunduzMu = () => { const s = new Date().getHours(); return s >= 6 && s < 18; };
const heroSahne = () => gunduzMu() ? GUNDUZ_SVG : GECE_SVG;
const AV_RENK = ['#2f6fde', '#c2410c', '#0f8a5f', '#7a5cd6', '#b4233a', '#0e7490', '#a16207'];
const avDaire = (k, cls = '') => k.foto ? `<img class="u-av ${cls}" src="${e(k.foto)}" alt="">` : `<span class="u-av ${cls}" style="--r:${AV_RENK[[...((k.ad || '') + (k.soyad || ''))].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_RENK.length]}" aria-hidden="true">${e(((k.ad || '?')[0] + ((k.soyad || '')[0] || '')).toLocaleUpperCase('tr'))}</span>`;
// sayfa üstü rengi: üst bölüm varsa telefonun durum çubuğu da lacivert olur
const temaUst = koyu => { if (koyu) heroBoyutla(); if (koyu && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('svg.u-gece').forEach(g => { try { g.pauseAnimations(); } catch (x) { } }); document.body.classList.toggle('hero-acik', koyu); document.body.classList.toggle('hero-gunduz', koyu && gunduzMu()); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = koyu ? (gunduzMu() ? '#174f99' : '#0b1830') : '#f2f2f7'; };
const dersNo = (d, k) => k.direksiyon + (d.durum === 'Planlandı' ? 1 + S.dersler.filter(x => x.kursiyer === k.id && x.durum === 'Planlandı' && (x.tarih + x.saat) < (d.tarih + d.saat)).length : 0);
// Sıradaki (ya da sürmekte olan) ders: üst bölüme taşan büyük kart, tek ana düğme
function egSiraKart(d) {
  const k = kursiyer(d.kursiyer); if (!k) return '';
  const S0 = SINIFLAR[k.sinif], basladi = !!d.bas, a = d.arac && arac(d.arac);
  return `<article class="u-sira">
    <div class="u-sira-ust"><span class="u-etiket ${basladi ? 'canli' : ''}">${basladi ? 'Derstesin · ' + saatDe(d.bas) + '’den beri' : 'Sıradaki ders'}</span><b class="u-sira-saat">${d.saat}</b></div>
    <div class="u-sira-kim">${avDaire(k)}<div><b>${e(tamAd(k))}</b><small>${e(S0.ad)} · ${dersNo(d, k)}. ders / ${S0.direksiyon}${a ? ' · ' + e(a.plaka) : ''}</small></div></div>
    ${!basladi && k.notlar && k.notlar[0] ? `<p class="u-not">${ik('kalem')}<span>${e(k.notlar[0].metin)}</span></p>` : ''}
    ${basladi ? `<p class="u-not mavi">${ik('harita')}<span>${d.konum ? 'Konum alındı' : d.konum === false ? 'Konum alınamadı' : 'Konum alınıyor…'}. Bitince imzalat; süre kendiliğinden yazılır.</span></p>` : ''}
    <div class="u-sira-dg">${basladi ? `<button class="u-dg birincil" data-yapildi="${e(d.id)}">${ik('tik')}Bitir ve imzalat</button>` : `<button class="u-dg birincil" data-ders-basla="${e(d.id)}">${ik('direksiyon')}Dersi başlat</button>`}<button class="u-dg ikon" data-ders-diger="${e(d.id)}" aria-label="Diğer işlemler">${ik('nokta')}</button></div>
  </article>`;
}
// Ders satırı: saat, öğrenci, sağda tek durum ya da tek kısa düğme
function egSatir(d, siradaki) {
  const k = kursiyer(d.kursiyer); if (!k) return '';
  const S0 = SINIFLAR[k.sinif], acik = d.durum === 'Planlandı', gecmis = d.tarih < gun(0), no = dersNo(d, k);
  const sag = !acik ? `<span class="u-durum ${DURUM_TON[d.durum] || ''}">${d.durum === 'Yapıldı' ? ik('tik') : ''}${e(d.durum)}</span>`
    : gecmis ? `<span class="u-satir-dg"><button class="u-hap gri" data-gelmedi="${e(d.id)}">Gelmedi</button><button class="u-hap" data-yapildi="${e(d.id)}">Yapıldı</button></span>`
    : d.bas ? `<span class="u-durum mavi">Derste</span>` : siradaki ? `<span class="u-durum mavi">Sırada</span>` : `<button class="u-hap" data-ders-basla="${e(d.id)}">Başlat</button>`;
  const imzaBek = d.durum === 'Yapıldı' && d.imza && d.imza.kursiyerBekliyor;
  return `<div class="u-satir ${acik ? '' : 'kapali'} ${siradaki ? 'sira' : ''}"><span class="u-saat">${d.saat}${gecmis ? `<small>${gunKisa(d.tarih)} ${tarih(d.tarih)}</small>` : ''}</span>
    <span class="u-satir-govde"><b>${e(tamAd(k))}</b><small>${acik ? no + '. ders' : no + ' ders'} · ${e(S0.ad)}${d.durum === 'Yapıldı' && d.sure != null ? ' · ' + d.sure + ' dk' + (d.sure < 40 ? ' (kısa)' : '') : ''}</small>${imzaBek ? `<small class="uyari">İmza bekleniyor · <button class="u-bag" data-imza-tekrar="${e(d.id)}">linki yeniden gönder</button></small>` : ''}</span>${sag}${acik && !gecmis ? `<button class="u-nokta" data-ders-diger="${e(d.id)}" aria-label="${e(tamAd(k))} için diğer işlemler">${ik('nokta')}</button>` : ''}</div>`;
}
// Öğrenci ayrıntısı (öğretmen): alttan açılan sayfa
function egOgrAc(k) {
  const S0 = SINIFLAR[k.sinif], sd = sonrakiDers(k), dd = (k.dDeneme || []).slice(-1)[0], r = risk(k), tel = (k.tel || '').replace(/\s/g, '');
  const sat = (ikon, ton, b, s2) => `<div class="u-satir"><span class="u-ik ${ton}">${ik(ikon)}</span><span class="u-satir-govde"><b>${b}</b>${s2 ? `<small>${s2}</small>` : ''}</span></div>`;
  pencere({ baslik: 'Öğrenci', alt: true, icerik: `<div class="u-ogr-ust">${avDaire(k, 'buyuk')}<div><b>${e(tamAd(k))}</b><small>${e(S0.ad)} · ${e(k.asama)}</small></div></div>
    ${S0.direksiyon ? `<div class="u-ilerleme"><span>Direksiyon dersleri</span><b>${k.direksiyon}<small>/${S0.direksiyon}</small></b>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</div>` : ''}
    <div class="u-liste">${sat('takvim', 'mavi', 'Sonraki ders', sd ? tarihUzun(sd.tarih) + ' · ' + sd.saat : 'Planlı ders yok')}${dd ? sat('sinav', dd.sonuc === 'Geçti' ? 'yesil' : 'kirmizi', 'Son deneme sınavı', dd.sonuc === 'Geçti' ? 'Sınavı geçerdi' : 'Sınavdan kalırdı') : ''}${r && r.puan >= 50 ? sat('uyari', 'turuncu', 'Sınav riski yüksek', 'Ek ders ve deneme önerilir') : ''}</div>
    <div class="u-sayfa-dg"><button class="u-dg birincil" data-ogr-deneme>${ik('sinav')}Deneme sınavı yap</button>${tel ? `<a class="u-dg" href="tel:${e(tel)}">${ik('tel')}Ara</a>` : ''}</div>`,
    onAc(d) { d.querySelector('[data-ogr-deneme]').addEventListener('click', () => { kapatPencere(); import('./deneme.js?v=182').then(m => m.denemeAc(k, yenile)); }); } });
}
let egProg = { mod: 'hafta', kay: 0 }, egAra = '';
const araMetin = t => String(t || '').toLocaleLowerCase('tr');
// arama: satırlar yeniden çizilmeden süzülür; boş kalan sınıf grubu gizlenir
function araSuz(k) {
  const q = araMetin(egAra).trim(), sil = k.querySelector('[data-ara-sil]'); if (sil) sil.hidden = !q;
  let gorunen = 0;
  k.querySelectorAll('[data-ara-grup]').forEach(g => { let n = 0; g.querySelectorAll('[data-ara]').forEach(r => { const v = !q || r.dataset.ara.includes(q) || r.dataset.ara.replace(/\s/g, '').includes(q.replace(/\s/g, '')); r.hidden = !v; if (v) n++; }); g.hidden = !n; gorunen += n; });
  const yok = k.querySelector('[data-ara-yok]'); if (yok) yok.hidden = gorunen > 0;
}
const isoGun = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const AY_U = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
// gösterilen dönem: pazartesiden başlayan hafta ya da takvim ayı; kay: bugünden kaç hafta/ay ileri-geri
function progAralik() {
  const b = tarihOku(gun(0));
  if (egProg.mod === 'ay') { const a = new Date(b.getFullYear(), b.getMonth() + egProg.kay, 1), n = new Date(a.getFullYear(), a.getMonth() + 1, 0).getDate();
    return { gunler: Array.from({ length: n }, (_, i) => isoGun(new Date(a.getFullYear(), a.getMonth(), i + 1))), metin: AY_U[a.getMonth()] + ' ' + a.getFullYear() }; }
  const p = new Date(b.getFullYear(), b.getMonth(), b.getDate() - (b.getDay() + 6) % 7 + 7 * egProg.kay), gunler = Array.from({ length: 7 }, (_, i) => isoGun(new Date(p.getFullYear(), p.getMonth(), p.getDate() + i)));
  const [a1, b1] = [tarihOku(gunler[0]), tarihOku(gunler[6])];
  return { gunler, metin: a1.getMonth() === b1.getMonth() ? `${a1.getDate()}–${b1.getDate()} ${AY_U[b1.getMonth()]}` : `${a1.getDate()} ${AY_U[a1.getMonth()]} – ${b1.getDate()} ${AY_U[b1.getMonth()]}` };
}
const progDurum = d => d.durum === 'Planlandı' ? (d.tarih < gun(0) ? ['Kapanmadı', 'turuncu'] : d.bas ? ['Derste', 'mavi'] : ['Planlı', '']) : d.durum === 'Yapıldı' ? ['Yapıldı', 'yesil'] : d.durum === 'Gelmedi' ? ['Gelmedi', 'kirmizi'] : [d.durum, ''];
// Programı Excel'e: gösterilen dönemin dersleri (telefon ve kimlik bilgisi yok)
async function progIndir(eg) {
  const { gunler, metin } = progAralik(), set = new Set(gunler);
  const l = S.dersler.filter(d => d.egitmen === eg.id && set.has(d.tarih)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  if (!l.length) return bildir('Bu dönemde ders yok', 'uyari');
  const sat = [['Tarih', 'Gün', 'Saat', 'Öğrenci', 'Sınıf', 'Ders no', 'Araç', 'Durum', 'Süre (dk)'], ...l.map(d => { const k = kursiyer(d.kursiyer), a = d.arac && arac(d.arac); return [d.tarih.split('-').reverse().join('.'), gunKisa(d.tarih), d.saat, k ? tamAd(k) : '', k ? SINIFLAR[k.sinif].ad : '', k ? dersNo(d, k) : '', a ? a.plaka : '', progDurum(d)[0], d.sure != null ? d.sure : '']; })];
  const ad = 'ders-programi-' + gunler[0] + '_' + gunler[gunler.length - 1];
  try {
    await import('./sayfalar5.js?v=182').then(m => m.xlsxYukle());
    const X = window.XLSX, ws = X.utils.aoa_to_sheet(sat), wb = X.utils.book_new();
    ws['!cols'] = [12, 6, 7, 24, 14, 8, 12, 11, 9].map(w => ({ wch: w })); ws['!autofilter'] = { ref: 'A1:I' + sat.length };
    X.utils.book_append_sheet(wb, ws, 'Program'); X.writeFile(wb, ad + '.xlsx');
  } catch (x) { csvIndir(ad + '.csv', sat); }
  bildir(metin + ' programı indirildi');
}
const egTk = TK.takvimDurum('ogretmen', 'hafta', true);
const DERS_TON = { 'Yapıldı': 'yapildi', 'Gelmedi': 'gelmedi', 'İptal': 'iptal' };
const EG_SEKME = [['bugun', 'Bugün', 'direksiyon'], ['hafta', 'Program', 'takvim'], ['kursiyer', 'Öğrenciler', 'kursiyer'], ['kazanc', 'Kazancım', 'kasa']];
export function egitmenPortal() {
  const usta = oturum.kullanici && oturum.kullanici.rol === 'usta';
  if (usta) egId = oturum.kullanici.usta;
  const eg = egitmen(egId) || (!usta && S.egitmenler[0]);
  if (!eg) return { baslik: 'Öğretmen ekranı', alt: 'Telefondan kullanılan ekran', html: `<div class="portal portal-og"><div class="u-bos">${ik('kursiyer')}<b>${usta ? 'Hesabın bir öğretmen kaydına bağlı değil' : 'Henüz öğretmen yok'}</b><p>${usta ? 'Kurs müdürü Ayarlar › Kullanıcılar’dan seni yeniden davet etmeli.' : 'Filo › Öğretmenler’den öğretmen ekleyince ders ekranı burada görünür.'}</p></div></div>` };
  egId = eg.id;
  if (!EG_SEKME.some(x => x[0] === egSekme)) egSekme = 'bugun';
  const benim = S.dersler.filter(d => d.egitmen === eg.id);
  const bugun = benim.filter(d => d.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  const kapanmamis = benim.filter(d => d.durum === 'Planlandı' && d.tarih < gun(0) && d.tarih >= gun(-60)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const ar = S.araclar.find(a => a.egitmen === eg.id), ad1 = e(eg.ad.split(' ')[0]);
  const ASIRA = { Direksiyon: 0, 'Sınav': 1, Teorik: 2, Evrak: 3, 'Kayıt': 4 };
  const ogrenciler = S.kursiyerler.filter(k => k.egitmen === eg.id && k.asama !== 'Ehliyet' && !k.kapali).sort((a, b) => (ASIRA[a.asama] ?? 9) - (ASIRA[b.asama] ?? 9) || tamAd(a).localeCompare(tamAd(b), 'tr'));
  const siradaki = bugun.find(d => d.durum === 'Planlandı' && d.bas) || bugun.find(d => d.durum === 'Planlandı');
  const iptalsiz = bugun.filter(d => d.durum !== 'İptal'), yapilan = bugun.filter(d => d.durum === 'Yapıldı').length;
  let hero = '', govde = '';
  if (egSekme === 'bugun') {
    const yarin = benim.filter(d => d.tarih === gun(1) && d.durum === 'Planlandı').sort((a, b) => a.saat.localeCompare(b.saat));
    const ozet = !iptalsiz.length ? (yarin.length ? `Bugün dersin yok. Yarın ${yarin.length} ders, ilki ${yarin[0].saat}.` : 'Bugün dersin yok.') : siradaki ? `Bugün ${iptalsiz.length} dersin var, ${yapilan} tanesi bitti.` : `Bugünkü ${iptalsiz.length} dersin bitti. Eline sağlık.`;
    hero = `<section class="u-hero ${siradaki ? 'kartli' : ''} ${gunduzMu() ? 'gunduz' : ''}">${heroSahne()}<div class="u-hero-ic"><small>${tarihUzun(gun(0))}</small><h1>${selamla()}, ${ad1} Hoca</h1><p>${ozet}</p></div></section>`;
    govde = `${siradaki ? egSiraKart(siradaki) : ''}
      ${kapanmamis.length ? `<section class="u-grup"><h2 class="u-grup-bas kirmizi">Kapatılmamış dersler<span>${kapanmamis.length}</span></h2><p class="u-grup-not">Yapıldı ya da gelmedi olarak işaretle; ders sayısı ve takip formu buna göre yazılır.</p><div class="u-liste">${kapanmamis.map(d => egSatir(d)).join('')}</div></section>` : ''}
      <section class="u-grup"><h2 class="u-grup-bas">Bugünkü dersler${iptalsiz.length ? `<span>${yapilan}/${iptalsiz.length} bitti</span>` : ''}</h2>${bugun.length ? `<div class="u-liste">${bugun.map(d => egSatir(d, d === siradaki)).join('')}</div>` : `<div class="u-bos">${ik('takvim')}<b>Planlı dersin yok</b><p>Kurs sana ders planlayınca burada görünür.</p></div>`}</section>
      ${ar ? `<section class="u-grup"><h2 class="u-grup-bas">Aracın</h2><div class="u-liste"><div class="u-satir">${aracGorsel(ar, 'u-arac')}<span class="u-satir-govde"><b>${e(ar.model)}</b><small>${e(ar.plaka)} · bakıma ${Math.max(0, ar.bakimKm - ar.km).toLocaleString('tr-TR')} km</small></span></div></div></section>` : ''}`;
  }
  if (egSekme === 'hafta') {
    // Program: Excel tablosu gibi; gün · saat · öğrenci · durum. Hafta ya da ay; aynı tablo .xlsx olarak indirilir
    const { gunler, metin } = progAralik(), dersleri = t => benim.filter(d => d.tarih === t).sort((a, b) => a.saat.localeCompare(b.saat));
    const toplam = gunler.reduce((n, t) => n + dersleri(t).filter(d => d.durum !== 'İptal').length, 0);
    const satirlar = gunler.map(t => { const l = dersleri(t), bg = t === gun(0) ? ' bugun' : '', gh = `<td class="u-gun" rowspan="${Math.max(1, l.length)}"><b>${+t.slice(8)}</b><small>${gunKisa(t)}</small></td>`;
      if (!l.length) return egProg.mod === 'hafta' ? `<tr class="gun-ilk bos${bg}">${gh}<td colspan="3">Ders yok</td></tr>` : '';
      return l.map((d, n) => { const k = kursiyer(d.kursiyer), S0 = k && SINIFLAR[k.sinif], dr = progDurum(d);
        return `<tr class="${n ? '' : 'gun-ilk'}${bg}${d.durum === 'İptal' ? ' iptal' : ''}">${n ? '' : gh}<td class="u-t-saat">${d.saat}</td><td class="u-t-ad">${k ? e(tamAd(k)) : '—'}${S0 ? `<small>${k ? dersNo(d, k) + '. ders · ' : ''}${e(S0.ad.split(' · ')[0])}</small>` : ''}</td><td><span class="u-durum ${dr[1]}">${dr[0]}</span></td></tr>`; }).join(''); }).join('');
    govde = `<header class="u-baslik"><h1>Program</h1><small>${metin} · ${toplam} ders</small></header>
      <div class="u-prog-arac"><div class="u-bolum">${[['hafta', 'Hafta'], ['ay', 'Ay']].map(([m, t]) => `<button data-prog-mod="${m}" class="${egProg.mod === m ? 'secili' : ''}" aria-pressed="${egProg.mod === m}">${t}</button>`).join('')}</div>
        <div class="u-prog-git"><button data-prog-git="-1" aria-label="Önceki">${ik('sag', 'ters')}</button><button data-prog-git="0" ${egProg.kay ? '' : 'disabled'}>Bugün</button><button data-prog-git="1" aria-label="Sonraki">${ik('sag')}</button></div></div>
      ${satirlar ? `<div class="u-tablo-kap"><table class="u-tablo"><thead><tr><th>Gün</th><th>Saat</th><th>Öğrenci</th><th>Durum</th></tr></thead><tbody>${satirlar}</tbody></table></div>` : `<div class="u-bos">${ik('takvim')}<b>Bu ay planlı dersin yok</b></div>`}
      <button class="u-dg u-indir" data-prog-indir>${ik('indir')}Excel olarak indir</button>`;
  }
  if (egSekme === 'kursiyer') {
    // Arama kutusu; öğrenciler farklı ehliyet sınıflarındaysa sınıfa göre gruplanır
    const gruplar = new Map(); ogrenciler.forEach(k => { const ad = SINIFLAR[k.sinif].ad; if (!gruplar.has(ad)) gruplar.set(ad, []); gruplar.get(ad).push(k); });
    const satir = k => { const S0 = SINIFLAR[k.sinif], sd = sonrakiDers(k), r = risk(k);
      return `<button class="u-satir dokun" data-ogr-ac="${e(k.id)}" data-ara="${e(araMetin(tamAd(k) + ' ' + (k.tel || '') + ' ' + (k.no || '')))}">${avDaire(k)}<span class="u-satir-govde"><b>${e(tamAd(k))}</b><small>${r && r.puan >= 50 ? '<span class="uyari">Sınav riski yüksek</span> · ' : ''}${sd ? 'Sonraki ' + goreli(sd.tarih).toLocaleLowerCase('tr') + ' ' + sd.saat : e(k.asama)}</small></span>${S0.direksiyon ? `<span class="u-deger">${k.direksiyon}/${S0.direksiyon}</span>` : ''}${ik('sag')}</button>`; };
    govde = `<header class="u-baslik"><h1>Öğrenciler</h1><small>${ogrenciler.length ? ogrenciler.length + ' öğrencin var' : 'Henüz öğrencin yok'}</small></header>
      ${ogrenciler.length ? `<label class="u-ara">${ik('ara')}<input type="search" data-ogr-ara placeholder="İsim ya da telefonla ara" value="${e(egAra)}" autocomplete="off" enterkeyhint="search" aria-label="Öğrenci ara"><button type="button" class="u-ara-sil" data-ara-sil aria-label="Aramayı temizle" ${egAra ? '' : 'hidden'}>${ik('kapat')}</button></label>
        ${gruplar.size > 1 ? [...gruplar].map(([ad, l]) => `<section class="u-grup" data-ara-grup><h2 class="u-grup-bas">${e(ad)}<span>${l.length} öğrenci</span></h2><div class="u-liste">${l.map(satir).join('')}</div></section>`).join('') : `<div class="u-liste" data-ara-grup>${ogrenciler.map(satir).join('')}</div>`}
        <div class="u-bos" data-ara-yok hidden>${ik('ara')}<b>Eşleşen öğrenci yok</b><p>Adı ya da telefonu farklı yazmayı dene.</p></div>`
      : `<div class="u-bos">${ik('kursiyer')}<b>Öğrencin yok</b><p>Kurs sana öğrenci atayınca burada ders sayısını ve sonraki dersini görürsün.</p></div>`}`;
  }
  if (egSekme === 'kazanc') {
    const bu = ustaAlacak(eg, 0), once = [1, 2, 3].map(g => ustaAlacak(eg, g)).filter(a => a.ders || a.odenen || a.avans);
    const sat = (b, s2, deger, cls = '') => `<div class="u-satir ${cls}"><span class="u-satir-govde"><b>${b}</b>${s2 ? `<small>${s2}</small>` : ''}</span><span class="u-deger">${deger}</span></div>`;
    govde = `<header class="u-baslik"><h1>Kazancım</h1><small>${ayAdi(bu.ay)}</small></header>` + (!(+eg.maas) && !(+eg.prim) ? `<div class="u-bos">${ik('kasa')}<b>Ücret bilgin henüz girilmemiş</b><p>Kurs müdürü ücretini ve ders primini girince bu ayki alacağın burada görünür.</p></div>`
      : `<section class="u-kazanc"><small>Bu ay alacağın</small><b>${tl(bu.kalan)}</b><span>${bu.ders} ders yaptın · brüt</span></section>
      <section class="u-grup"><h2 class="u-grup-bas">${ayAdi(bu.ay).split(' ')[0]} hesabı</h2><div class="u-liste">
        ${bu.maas ? sat('Sabit ücret', '', tl(bu.maas)) : ''}${sat('Ders primi', `${bu.ders} ders × ${tl(bu.primBirim)}`, tl(bu.prim))}${bu.avans ? sat('Avans', 'Bu ay aldığın', '−' + tl(bu.avans)) : ''}${bu.odemeler.map(o => sat('Ödeme', tarih(o.tarih) + ' · ' + e(o.yontem || ''), '−' + tl(o.tutar))).join('')}${sat('Kalan alacağın', '', tl(bu.kalan), 'toplam')}
      </div>${bu.imzasiz || bu.kisa ? `<p class="u-grup-not uyari">${[bu.imzasiz ? bu.imzasiz + ' dersin imzası eksik' : '', bu.kisa ? bu.kisa + ' ders 40 dakikadan kısa' : ''].filter(Boolean).join(', ')}. Prim hesaplanırken kurs bunları kontrol eder.</p>` : ''}</section>
      ${once.length ? `<section class="u-grup"><h2 class="u-grup-bas">Önceki aylar</h2><div class="u-liste">${once.map(a => `<div class="u-satir"><span class="u-satir-govde"><b>${ayAdi(a.ay)}</b><small>${a.ders} ders · ${tl(a.brut)} brüt${a.avans ? ' · avans ' + tl(a.avans) : ''}</small></span>${a.kalan ? `<span class="u-durum turuncu">${tl(a.kalan)} bekliyor</span>` : `<span class="u-durum yesil">${ik('tik')}Ödendi</span>`}</div>`).join('')}</div></section>` : ''}
      <p class="u-dipnot">Tutarlar brüttür; net ücret SGK ve vergi kesintilerinden sonra bordroda kesinleşir. Kurs ödeme yaptığında burada görünür. Bir yanlışlık görürsen kurs müdürüne söyle.</p>`);
  }
  return {
    baslik: !usta ? 'Öğretmen ekranı' : (EG_SEKME.find(x => x[0] === egSekme) || [])[1] || 'Bugün', alt: usta ? 'Öğretmen ekranı' : 'Telefondan kullanılan ekran',
    html: `${usta ? '' : `<div class="og-onizleme u-onizleme">${isaret('bilgi', 16)}<span>Personel önizlemesi</span><select class="girdi" data-eg aria-label="Usta öğretici seç">${S.egitmenler.map(x => `<option value="${x.id}" ${x.id === eg.id ? 'selected' : ''}>${e(x.ad)}</option>`).join('')}</select></div>`}
      ${hero}<div class="portal portal-og ${hero ? 'hero-alti' : ''}">${govde}</div>
      <nav class="og-sekme" aria-label="Öğretmen ekranı">${EG_SEKME.map(([kk, t, i]) => `<button data-egs="${kk}" class="${kk === egSekme ? 'secili' : ''}" ${kk === egSekme ? 'aria-current="page"' : ''}>${ik(i)}<span>${t}${kk === 'bugun' && kapanmamis.length ? ' <em>' + kapanmamis.length + '</em>' : ''}</span></button>`).join('')}</nav>`,
    baglan(k) {
      if (usta) temaUst(!!hero);
      k.addEventListener('change', ev => { if (ev.target.matches('[data-eg]')) { egId = ev.target.value; yenile(); } });
      k.addEventListener('input', ev => { if (ev.target.matches('[data-ogr-ara]')) { egAra = ev.target.value; araSuz(k); } });
      araSuz(k);
      k.addEventListener('click', ev => {
        const t = ev.target;
        const oa = t.closest('[data-ogr-ac]'); if (oa) return egOgrAc(kursiyer(oa.dataset.ogrAc));
        const s = t.closest('[data-egs]'); if (s) { egSekme = s.dataset.egs; return yenile(true); }
        const pm = t.closest('[data-prog-mod]'); if (pm) { egProg = { mod: pm.dataset.progMod, kay: 0 }; return yenile(); }
        const pg = t.closest('[data-prog-git]'); if (pg) { egProg.kay = +pg.dataset.progGit ? egProg.kay + +pg.dataset.progGit : 0; return yenile(); }
        if (t.closest('[data-prog-indir]')) return progIndir(eg);
        if (t.closest('[data-ara-sil]')) { egAra = ''; const i = k.querySelector('[data-ogr-ara]'); i.value = ''; araSuz(k); return i.focus(); }
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
        const it = t.closest('[data-imza-tekrar]'); if (it) { const d = S.dersler.find(x => x.id === it.dataset.imzaTekrar); import('./imza.js?v=182').then(m => m.imzaIste('ders', kursiyer(d.kursiyer), [d.id])); return; }
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
// Devam eden test telefonda saklanır: uygulama kapansa da kaldığı yerden sürer; süre yalnız test ekranı açıkken işler
const TEST_ANAHTAR = k => 'sinyal-test-' + k.id;
const testSakla = k => { try { if (test.mod && test.i < test.liste.length) localStorage.setItem(TEST_ANAHTAR(k), JSON.stringify({ ...test, sonuc: undefined })); else localStorage.removeItem(TEST_ANAHTAR(k)); } catch (x) { } };
const testGeriYukle = k => { if (test.mod) return; try { const t = JSON.parse(localStorage.getItem(TEST_ANAHTAR(k)) || 'null'); if (t && t.mod && t.i < t.liste.length) test = { ...t, duraklat: true }; } catch (x) { } };
const testBirak = k => { test = { mod: null }; try { localStorage.removeItem(TEST_ANAHTAR(k)); } catch (x) { } };
function testBaslat(mod, k, konu) {
  let liste;
  if (mod === 'deneme') liste = Object.entries(KONULAR).flatMap(([kn, [, n]]) => karistir(idx().filter(i => SORULAR[i][0] === kn)).slice(0, n));
  else if (mod === 'konu') liste = karistir(idx().filter(i => SORULAR[i][0] === konu)).slice(0, 10);
  else if (mod === 'yanlis') liste = karistir(k.yanlislar || []).slice(0, 10);
  else if (mod === 'tekrar') liste = karistir(HZ.tekrarBugun(k).filter(i => i < SORULAR.length)).slice(0, 20);
  else liste = karistir(idx()).slice(0, 10);
  test = { mod, konu, liste, i: 0, dogru: 0, cevap: null, basla: Date.now(), harcanan: 0, sonTik: Date.now(), cevaplar: [] };
  testSakla(k);
}
function testBitir(k) {
  const konu = {};
  test.cevaplar.forEach(([qi, c]) => { const kn = SORULAR[qi][0]; konu[kn] = konu[kn] || [0, 0]; konu[kn][1]++; if (c === SORULAR[qi][3]) konu[kn][0]++; });
  k.konuAnaliz = k.konuAnaliz || {};
  Object.entries(konu).forEach(([kn, [d, t]]) => { const a = k.konuAnaliz[kn] || [0, 0]; k.konuAnaliz[kn] = [a[0] + d, a[1] + t]; });
  const yanlis = test.cevaplar.filter(([qi, c]) => c !== SORULAR[qi][3]).map(([qi]) => qi), dogruQ = test.cevaplar.filter(([qi, c]) => c === SORULAR[qi][3]).map(([qi]) => qi);
  k.yanlislar = [...new Set([...(k.yanlislar || []).filter(x => !dogruQ.includes(x)), ...yanlis])];
  test.eksik = test.liste.length - test.cevaplar.length;
  if (test.mod === 'deneme' && !test.eksik) { k.deneme = k.deneme || []; k.deneme.push(test.dogru * 2); }
  HZ.gorulenEkle(k, test.cevaplar.map(([qi]) => qi));
  HZ.tekrarGuncelle(k, test.cevaplar.map(([qi, c]) => [qi, c === SORULAR[qi][3]]));
  test.sonuc = { konu, yanlis: yanlis.length, yanlisListe: test.cevaplar.filter(([qi, c]) => c !== SORULAR[qi][3]) };
  try { localStorage.removeItem(TEST_ANAHTAR(k)); } catch (x) { }
  kaydet();
}
// Öğrenci ana sayfası, üst bölüm: tek mesaj (sıradaki ders ya da sınav, yoksa yapılacak tek şey) ve aşama çubuğu
function ogHero(k, sd, sinav) {
  const S0 = SINIFLAR[k.sinif], n = Math.max(0, asamaNo(k)), esGecti = k.esinav && k.esinav.sonuc === 'Geçti';
  let ust = '', bas = '', alt = '', dg = '';
  // üst bölüm sade: saat büyük, altında tek kısa satır (öğretmen, araç, plaka Derslerim sekmesinde)
  if (sd) { ust = 'Sıradaki dersin'; bas = `${goreli(sd.tarih)}, ${sd.saat}`; alt = `Direksiyon · ${k.direksiyon + 1}. ders`; }
  else if (sinav) { ust = 'Sıradaki sınavın'; bas = `${goreli(sinav.tarih)}, ${sinav.saat}`; alt = e(sinav.tur); dg = `<button class="u-cam" data-ogs="sinav">Sınav bilgileri</button>`; }
  else if (k.asama === 'Ehliyet') { ust = 'Tebrikler'; bas = 'Ehliyetini aldın'; alt = 'İyi yolculuklar'; }
  else if (!esGecti && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama)) { ust = 'Şimdi sıra sende'; bas = 'e-Sınava hazırlan'; dg = `<button class="u-cam sari" data-test-basla="deneme" data-og-sinava>Deneme sınavı çöz</button>`; }
  else if (S0.direksiyon) { ust = 'Planlı dersin yok'; bas = 'Direksiyon dersi al'; dg = `<button class="u-cam sari" data-iste>${ik('arti')}Ders al</button>`; }
  else { ust = 'Durumun'; bas = e(k.asama); }
  const ic = k.asama === 'Direksiyon' && S0.direksiyon ? k.direksiyon / S0.direksiyon : k.asama === 'Teorik' && S0.teorik ? k.teorik / S0.teorik : 0;
  const ilerMetin = k.asama === 'Ehliyet' ? 'Ehliyet alındı' : k.asama + ' aşaması', ilerSag = k.asama === 'Direksiyon' && S0.direksiyon ? `${k.direksiyon}/${S0.direksiyon} ders` : k.asama === 'Teorik' && S0.teorik ? `${k.teorik}/${S0.teorik} saat` : `${n + 1}/${ASAMALAR.length}`;
  return `<section class="u-hero ${gunduzMu() ? 'gunduz' : ''}">${heroSahne()}<div class="u-hero-ic"><small>${selamla()}, ${e(k.ad)}</small><span class="u-hero-ust">${ust}</span><h1>${bas}</h1>${alt ? `<p>${alt}</p>` : ''}${dg ? `<div class="u-hero-dg">${dg}</div>` : ''}
    <div class="u-asama" role="img" aria-label="Aşama ${n + 1}/${ASAMALAR.length}: ${e(k.asama)}"><div class="u-asama-cubuk">${ASAMALAR.map((a, i) => `<i class="${i < n || k.asama === 'Ehliyet' ? 'dolu' : i === n ? 'simdi' : ''}" ${i === n ? `style="--ic:${Math.round(Math.max(.12, ic) * 100)}%"` : ''}></i>`).join('')}</div><span>${ilerMetin}<b>${ilerSag}</b></span></div></div></section>`;
}
// Öğrenci ana sayfası, gövde: yalnız öğrencinin yapması gerekenler, sonra durum listesi (dokununca ilgili sekme)
function ogGovde(k, sd, sinav) {
  const S0 = SINIFLAR[k.sinif], sn = OG.sonrakiTaksit(k), tb = ogrOzellik('tekrar') ? HZ.tekrarBugun(k).length : 0, esGecti = k.esinav && k.esinav.sonuc === 'Geçti';
  const is = [], satir = (ikon, ton, baslik, alt, dugme) => `<div class="u-satir"><span class="u-ik ${ton}">${ik(ikon)}</span><span class="u-satir-govde"><b>${baslik}</b>${alt ? `<small>${alt}</small>` : ''}</span>${dugme}</div>`;
  if (sn && fark(sn.t.vade) < 0) is.push(satir('kart', 'kirmizi', 'Taksitin gecikti', `${tl(sn.t.tutar - (sn.t.kismi || 0))} · vade ${tarih(sn.t.vade)}`, `<button class="u-hap" data-ode="${sn.i}">Öde</button>`));
  if (k.ekDersTeklif) is.push(satir('direksiyon', 'mavi', `${k.ekDersTeklif.n} ek ders önerisi`, `${tl(k.ekDersTeklif.tutar)} · kabul edersen ödeme planına eklenir`, `<span class="u-satir-dg"><button class="u-hap gri" data-og-ekders="hayir">Hayır</button><button class="u-hap" data-og-ekders="evet">Kabul</button></span>`));
  (S.bosTeklif || []).filter(t => t.adaylar.includes(k.id) && fark(t.tarih) >= 0).forEach(t => is.push(satir('saat', 'mavi', `Boş saat: ${goreli(t.tarih)} ${t.saat}`, e((egitmen(t.egitmen) || {}).ad || 'Öğretmen') + (t.fiyat ? ' · %' + t.yuzde + ' indirimli ' + tl(t.fiyat) : '') + ' · ilk kabul eden alır', `<button class="u-hap" data-og-bos="${t.id}">Al</button>`)));
  const ob = S0.direksiyon && ogrOzellik('dersOnay') ? OG.onayBekleyen(k) : 0;
  if (ob) is.push(satir('kalem', 'sari', `${ob} dersini onayla`, 'Ders yapıldıysa ders defterinde onayla', `<button class="u-hap" data-git="ders:defter">Aç</button>`));
  const eb = OG.eksikBelge(k);
  if (eb) is.push(satir('belge', 'turuncu', `${eb} belgen eksik`, 'Fotoğrafını çekip buradan gönderebilirsin', `<button class="u-hap" data-git="evrak:evrak">Yükle</button>`));
  if (sn && fark(sn.t.vade) >= 0 && fark(sn.t.vade) <= 10) is.push(satir('kart', 'gri', `Taksit ${goreli(sn.t.vade).toLocaleLowerCase('tr')}`, `${tl(sn.t.tutar - (sn.t.kismi || 0))} · vade ${tarih(sn.t.vade)}`, `<button class="u-hap" data-ode="${sn.i}">Öde</button>`));
  if (tb) is.push(satir('sifirla', 'mor', `Bugün ${tb} tekrar sorun var`, 'Yanlış yaptığın sorular aralıklarla yeniden gelir', `<button class="u-hap" data-test-basla="tekrar" data-og-sinava>Başla</button>`));
  if (sinav && sd && fark(sinav.tarih) <= 14) is.push(satir('sinav', 'mavi', `${e(sinav.tur)} sınavın ${goreli(sinav.tarih).toLocaleLowerCase('tr')}`, `${sinav.saat} · ${e(sinav.yer)}`, `<button class="u-hap" data-ogs="sinav">Gör</button>`));
  const deg = OG.degerlendirKart(k);
  const yapilacak = is.length || deg ? `<section class="u-grup"><h2 class="u-grup-bas">Yapman gerekenler</h2>${deg}${is.length ? `<div class="u-liste">${is.join('')}</div>` : ''}</section>` : '';
  const hz = HZ.hazirlik(k), kalan = kalanBorc(k);
  const durum = (sekme, ikon, ton, baslik, deger, alt) => `<button class="u-satir dokun" data-ogs="${sekme}"><span class="u-ik ${ton}">${ik(ikon)}</span><span class="u-satir-govde"><b>${baslik}</b>${alt ? `<small>${alt}</small>` : ''}</span><span class="u-deger">${deger}</span>${ik('sag')}</button>`;
  const ozet = `<section class="u-grup"><h2 class="u-grup-bas">Durumun</h2><div class="u-liste">
    ${S0.direksiyon ? durum('ders', 'direksiyon', 'mavi', 'Direksiyon dersleri', `${k.direksiyon}/${S0.direksiyon}`, sd ? 'Sıradaki ' + goreli(sd.tarih).toLocaleLowerCase('tr') + ' ' + sd.saat : 'Planlı ders yok') : ''}
    ${durum('ders', 'teorik', 'mor', 'Teorik dersler', `${k.teorik}/${S0.teorik}`)}
    ${esGecti ? durum('sinav', 'sinav', 'yesil', 'e-Sınav', 'Geçti', k.esinav.puan ? k.esinav.puan + ' puan' : '') : durum('sinav', 'sinav', 'turuncu', 'e-Sınava hazırlık', hz.puan + '/100', 'Deneme çözdükçe artar')}
    ${durum('odeme', 'kart', sn && fark(sn.t.vade) < 0 ? 'kirmizi' : 'yesil', 'Ödemeler', kalan ? tl(kalan) : 'Tamam', kalan && sn ? 'Sonraki taksit ' + tarih(sn.t.vade) : 'Borcun yok')}
    ${durum('evrak', 'belge', eb ? 'turuncu' : 'gri', 'Belgeler', eb ? eb + ' eksik' : 'Tamam')}
  </div></section>`;
  return yapilacak + ozet + OG.kurulumKart();
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
  // Tek sayfa: üstte özet; altında sınavlar, çalışma, dersler ve ders içerikleri (her biri açılır kapanır)
  const S0 = SINIFLAR[k.sinif];
  const sonr = tur => S.sinavlar.filter(x => x.tur === tur && x.kursiyerler.includes(k.id) && fark(x.tarih) >= 0 && !(x.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  const esS = sonr('e-Sınav'), dS = sonr('Direksiyon'), dGecti = k.dsinav && k.dsinav.sonuc === 'Geçti';
  const kutu = (ust, ana, alt, ton = '') => `<div class="og-ozet-kutu ${ton}"><small>${ust}</small><b>${ana}</b><span>${alt}</span></div>`;
  const ozet = `<div class="og-ozet-kutular">${kutu('e-Sınav', esGecti ? 'Geçtin' : esS ? gunKisa(esS.tarih) : 'Tarih yok', esGecti ? (k.esinav.puan ? k.esinav.puan + ' puan' : '') : esS ? goreli(esS.tarih) + ' · ' + esS.saat : son.length ? 'Son deneme ' + son.slice(-1)[0] : 'Deneme çöz, hazırlan', esGecti ? 'tamam' : '')}
    ${dirVar ? kutu('Direksiyon sınavı', dGecti ? 'Geçtin' : dS ? gunKisa(dS.tarih) : 'Tarih yok', dGecti ? '' : dS ? goreli(dS.tarih) + ' · ' + dS.saat : 'Dersler bitince', dGecti ? 'tamam' : '') : ''}
    ${kutu('Derslerin', (dirVar ? k.direksiyon + '<i>/' + S0.direksiyon + '</i>' : k.teorik + '<i>/' + S0.teorik + '</i>'), dirVar ? 'direksiyon · teorik ' + k.teorik + '/' + S0.teorik : 'teorik saat')}</div>`;
  const dersler = `<section class="og-grup"><h3 class="og-grup-bas">Derslerin</h3>${OG.modul('sinavDers', { ikon: 'takvim', baslik: 'Yaklaşan dersler', ozet: (() => { const sd = sonrakiDers(k); return sd ? 'Sıradaki: ' + gunKisa(sd.tarih) + ' ' + sd.saat : 'Planlı dersin yok'; })() }, OG.yaklasanHtml(k) + `<button class="dg dg-cizgi og-genis" data-git="ders" style="margin-top:10px">Tüm derslerim</button>`)}</section>`;
  const icerik = `<section class="og-grup"><h3 class="og-grup-bas">Ders içerikleri</h3>${OG.teorikModul(k, false)}</section>`;
  return ozet + `<section class="og-grup"><h3 class="og-grup-bas">Sınavların</h3>${OG.sinavlarHtml(k)}</section>` + (dirOnce ? dirBolum + esBolum : esBolum + dirBolum) + dersler + icerik;
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
  if (ogSekme === 'durum') govde = ogGovde(k, sd, sinav);
  if (ogSekme === 'ders') govde = OG.derslerHtml(k);
  if (ogSekme === 'odeme') govde = OG.odemelerHtml(k);
  if (ogSekme === 'sinav') {
    if (!SORULAR.length) sorulariYukle().then(() => { if (location.hash.startsWith('#/ogrenci')) yenile(); }).catch(() => { });
    const MOD_AD = { deneme: 'Deneme sınavı', hizli: 'Hızlı test', konu: 'Konu çalışması', yanlis: 'Yanlışlarım', tekrar: 'Bugünkü tekrar' };
    testGeriYukle(k);
    if (!test.mod) govde = sinavMenu(k);
    else if (test.duraklat && test.i < test.liste.length) {
      const kalanDk = test.mod === 'deneme' ? Math.max(1, Math.ceil((45 * 60e3 - (test.harcanan || 0)) / 60e3)) : 0;
      govde = `<div class="kart soru" style="text-align:center"><small style="color:var(--soluk)">Yarım kalan test</small><h3 style="margin:6px 0 4px;font-size:22px">${MOD_AD[test.mod]}</h3><p style="color:var(--metin)">${test.i}/${test.liste.length} soru cevaplandı${kalanDk ? ' · ' + kalanDk + ' dakikan var' : ''}</p>${ilerleme(test.i, test.liste.length)}<div style="display:grid;gap:10px;margin-top:16px"><button class="dg dg-ana og-giris-dg" data-test-devam>Kaldığın yerden devam et</button><button class="dg dg-hafif" data-test-menu>Testi bırak</button></div></div>`;
    }
    else if (test.i >= test.liste.length) {
      const toplam = test.liste.length, puan = test.mod === 'deneme' ? test.dogru * 2 : Math.round(test.dogru / Math.max(1, toplam) * 100);
      govde = `${test.mod === 'deneme' && test.eksik ? `<p class="og-giris-not" style="margin:0 0 12px">${ik('uyari')}<span>${test.sureDoldu ? 'Süre doldu. ' : ''}${test.liste.length - test.eksik}/${test.liste.length} soru cevapladın; bu deneme puanlarına sayılmadı. Tam bir deneme çözünce hazırlık puanın güncellenir.</span></p>` : ''}<div class="kart soru" style="text-align:center">${test.mod === 'deneme' ? `<small style="color:var(--soluk)">Deneme sınavı puanın</small><b style="display:block;font-family:var(--baslik);font-size:46px;color:${puan >= 70 ? 'var(--yesil)' : 'var(--kirmizi)'}">${puan}</b><p>${puan >= 70 ? 'Geçme puanının üstündesin.' : 'Geçme puanı 70; biraz daha çalışalım.'}</p>` : `<h4 style="font-size:20px">${test.dogru}/${toplam} doğru</h4>`}
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
    html: `${kendi ? '' : `<div class="og-onizleme u-onizleme">${isaret('bilgi', 16)}<span>Personel önizlemesi</span><select class="girdi" data-og aria-label="Öğrenci seç">${S.kursiyerler.slice(0, 40).map(x => `<option value="${x.id}" ${x.id === k.id ? 'selected' : ''}>${e(tamAd(x))}</option>`).join('')}</select></div>`}
      ${ogSekme === 'durum' ? ogHero(k, sd, sinav) : ''}<div class="portal portal-og ${ogSekme === 'durum' ? 'hero-alti' : ''}">
      ${ogSekme === 'durum' ? '' : `<header class="u-baslik"><h1>${OG_SEKME.find(x => x[0] === ogSekme)[1]}</h1><small>${e(tamAd(k))} · ${e(S0.ad)}</small></header>`}
      ${govde}
    </div>
    <nav class="og-sekme" aria-label="Öğrenci paneli">${OG_SEKME.map(([kk, t, i]) => `<button data-ogs="${kk}" class="${kk === ogSekme ? 'secili' : ''}" ${kk === ogSekme ? 'aria-current="page"' : ''}>${ik(i)}<span>${t}</span></button>`).join('')}</nav>`,
    baglan(kap) {
      if (kendi) temaUst(ogSekme === 'durum');
      clearInterval(sayac);
      const kalanEl = kap.querySelector('[data-kalan]');
      if (kalanEl) { const yaz = () => { const simdi = Date.now(); if (document.visibilityState === 'visible') test.harcanan = (test.harcanan || 0) + Math.min(2000, Math.max(0, simdi - (test.sonTik || simdi))); test.sonTik = simdi; const kalan = 45 * 60e3 - test.harcanan; if (Math.floor(kalan / 1e3) % 15 === 0) testSakla(k); if (kalan <= 0) { clearInterval(sayac); test.sureDoldu = true; test.i = test.liste.length; testBitir(k); yenile(); return; } kalanEl.textContent = String(Math.floor(kalan / 60e3)).padStart(2, '0') + ':' + String(Math.floor(kalan / 1e3) % 60).padStart(2, '0'); }; yaz(); sayac = setInterval(() => { if (!document.body.contains(kalanEl)) return clearInterval(sayac); yaz(); }, 1000); }
      kap.addEventListener('change', ev => { if (ev.target.matches('[data-og]')) { ogId = ev.target.value; test = { mod: null }; OG.modulSifirla(); yenile(); } });
      OG.ogBagla(kap, k, yenile);
      kap.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-ogs]'); if (s) { if (test.mod && test.i >= test.liste.length) test = { mod: null }; else if (test.mod) { test.duraklat = true; testSakla(k); } ogSekme = s.dataset.ogs; sekmeSakla(); yenile(true); }
        const gt = t.closest('[data-git]'); if (gt) { const [sk, md] = gt.dataset.git.split(':'); if (md) OG.modulAc(md); ogSekme = sk; sekmeSakla(); yenile(true); return; }
        const o = t.closest('[data-ode]'); if (o) odemeYap(k, +o.dataset.ode);
        const oe = t.closest('[data-og-ekders]'); if (oe) { if (oe.dataset.ogEkders === 'evet') ekDersKabul(k); else { k.ekDersTeklif = null; kaydet(); bildirimler([{ kim: 'mudur', metin: `${tamAd(k)} ek direksiyon dersi teklifini istemedi.`, tur: 'Kursiyer cevabı' }], 'Ek ders'); bildir('Cevabın kursa iletildi'); yenile(); } }
        const ob = t.closest('[data-og-bos]'); if (ob) bosTeklifKabul(ob.dataset.ogBos, k.id, true);
        const tb = t.closest('[data-test-basla]'); if (tb && !tb.disabled) { if (tb.matches('[data-og-sinava]')) ogSekme = 'sinav'; sorulariYukle().then(() => { testBaslat(tb.dataset.testBasla, k, tb.dataset.konu); yenile(true); }).catch(() => { }); }
        if (t.closest('[data-test-menu]')) { testBirak(k); yenile(true); }
        if (t.closest('[data-test-devam]')) { test.duraklat = false; test.sonTik = Date.now(); yenile(true); }
        if (t.closest('[data-soru-bildir]')) { const qi = test.liste[test.i], q = SORULAR[qi]; return pencere({ baslik: 'Soruyu bildir', icerik: `<p style="font-size:14px;margin-bottom:10px">“${e(q[1].slice(0, 120))}”</p><div class="alan"><label>Sorun ne?</label><select class="girdi" data-n><option>Doğru cevap yanlış işaretlenmiş</option><option>Soru ya da şıklar anlaşılmıyor</option><option>Bilgi güncel değil</option><option>Görsel hatalı</option><option>Diğer</option></select></div><div class="alan" style="margin-top:10px"><label>Açıklama (isteğe bağlı)</label><input class="girdi" data-a maxlength="300"></div>`, altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Gönder</button>', onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { gonderimEkle(S.kurs.ad, `${tamAd(k)} soru bildirdi (#${qi + 1}): ${d.querySelector('[data-n]').value}${d.querySelector('[data-a]').value.trim() ? ' · ' + d.querySelector('[data-a]').value.trim() : ''} · “${q[1].slice(0, 90)}”`, 'Soru bildirimi'); kaydet(); kapatPencere(); bildir('Teşekkürler, soru incelenmek üzere iletildi'); }); } }); }
        const c = t.closest('[data-cevap]');
        if (c && test.mod && test.cevap == null) {
          const qi = test.liste[test.i], cv = +c.dataset.cevap; test.cevaplar.push([qi, cv]); if (cv === SORULAR[qi][3]) test.dogru++;
          if (test.mod === 'deneme') { test.i++; if (test.i >= test.liste.length) testBitir(k); } else test.cevap = cv;
          testSakla(k);
          yenile();
        }
        if (t.closest('[data-sonraki]')) { test.i++; test.cevap = null; if (test.i >= test.liste.length) testBitir(k); else testSakla(k); yenile(); }
        const dg = t.closest('[data-degis]'); if (dg) { const sd2 = sonrakiDers(k), m = `Merhaba, ben ${tamAd(k)}. ${sd2 ? tarihUzun(sd2.tarih) + ' ' + sd2.saat + ' direksiyon dersimin saatini' : 'Ders saatimi'} değiştirmek istiyorum.`; gonderimEkle(S.kurs.ad, m, 'Kursiyer talebi'); const kno = S.kurs.wp || S.kurs.wpGenel || S.kurs.tel; if (!waNumara(kno)) return bildir('Kursun WhatsApp numarası kayıtlı değil; kursu arayın' + (S.kurs.tel ? ': ' + S.kurs.tel : ''), 'uyari'); if (waAc(kno, m, 'WhatsApp', tamAd(k), false, 'KURSA GELEN') !== 'api') bildir('WhatsApp açıldı; mesajı kursa gönder', 'wp'); }
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
