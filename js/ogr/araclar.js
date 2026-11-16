// Öğren › araçlar (yeni tasarım), hepsi sayfa içinde (pencere yok):
//   22 Tehlike algısı ('tehlike'): js/tehlike.js sahneleri ve puanlaması (sahne yatay çizilir, tamamı görünür).
//   23 Araç etkileşimleri ('etkilesim[:ikaz|motor|kalkis]'): ikaz lambaları + kısa test (js/ikaz.js), 4 zamanlı motor ve debriyaj denemesi (js/motor.js).
//   24 Direksiyon hazırlığı ('direksiyon[:kriter[:<id>]|guzergah|puf[:<id>]]'): resmî değerlendirme formu bölümleri (js/direksiyon.js),
//      sınav güzergâhları ve aday deneyimleri (js/guzergah.js), manevra anlatımları, son deneme uygulama sınavı.
// Kural (direksiyon.js başı): sınav alanına konan kolaylaştırıcı işaretlere dayalı tarif verilmez (MTSK Yön. md.26/9); anlatım ayna, sinyal ve ölçüyle.
// Alt ekrandan başka bir alt ekrana gidip dönüş: 'etkilesim:kalkis|direksiyon:puf:b5' (ilk | sonrası geri bağlantısının gideceği yer;
// dönüş yeri kendi dönüşünü taşıyabilir: 'etkilesim:ikaz|direksiyon:puf:b5|araclar'). Gelinen yer: modül (trafik, motor…), 'araclar', 'direksiyon…'.
// Kök ekranlarda ':' şart (ekran.js yönlendiricisi 'ad:' ya da 'ad' bekler): 'tehlike:|trafik', 'direksiyon:|araclar'.
import { S, kaydet, gun, fark, SINIFLAR, ogrOzellik, motorSinif } from '../veri.js?v=210';
import { tarih, tarihUzun } from '../ui.js?v=210';
import { SAHNELER, sahneSvg, TEHLIKE_SURE, tehlikePuanla } from '../tehlike.js?v=210';
import { guzergahlar } from '../guzergah.js?v=210';
import { altAc, UNITE_AD } from './ogrveri.js?v=210';
import { hakDurum } from '../ogrenci.js?v=210';
import { esc, oi, sayfaBas, geri, bolum, gorsel, dugme, ikonKutu, satir, liste, cip, serit, not, bos, sekmeler, radyo, sik, cevapKutu, stilEkle } from './ui.js?v=210';

/* ---------- geç yüklenen modüller (ikaz, motor, direksiyon + resmî formlar) ---------- */
const MOD = {}, SOZ = {};
const KAYNAK = { ikaz: () => import('../ikaz.js?v=210'), motor: () => import('../motor.js?v=210'), dir: () => import('../direksiyon.js?v=210') };
const yukle = ad => MOD[ad] ? Promise.resolve(MOD[ad]) : (SOZ[ad] = SOZ[ad] || KAYNAK[ad]().then(m => (MOD[ad] = m)).catch(x => { SOZ[ad] = null; throw x; }));
// ön yükleme yalnız öğrencinin kendi telefonunda (yeni tasarım açıkken); personel oturumunda bu dosyalar indirilmez
if (typeof window !== 'undefined') setTimeout(() => { if (document.body.classList.contains('ox-modu')) Object.keys(KAYNAK).forEach(a => yukle(a).catch(() => { })); }, 1500);
// modül gelene kadar aynı yerde boş alan; gelince ekran yeniden çizilir (başlık ve sekmeler yerinde kalır)
const bekle = (ust, ad, ctx, boy = 420) => ({
  html: ust + `<div class="ox-arc-yer" style="min-height:${boy}px" aria-busy="true"></div>`,
  baglan(kap) { yukle(ad).then(() => { if (kap.isConnected) ctx.yenile(); }).catch(x => console.error(x)); },
});

/* ---------- canlandırmalar: ekran yeniden çizilince ya da kapanınca durur ---------- */
let calisan = [];
const durdur = () => { const l = calisan; calisan = []; l.forEach(f => { try { f(); } catch (x) { } }); };
// kare(dt) her karede çağrılır; el sayfadan çıkınca döngü kendiliğinden biter
function dongu(el, kare) {
  let id = 0, son = null, acik = true;
  const f = t => { if (!acik || !el.isConnected) return; const dt = son == null ? 0 : Math.min(.05, (t - son) / 1000); son = t; kare(dt); id = requestAnimationFrame(f); };
  id = requestAnimationFrame(f);
  calisan.push(() => { acik = false; cancelAnimationFrame(id); });
}
const azHareket = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (x) { return false; } };
const yuvarlak = (ikon, etiket, attrs) => `<button type="button" class="ox-arc-yuvarlak" aria-label="${etiket}" ${attrs}>${oi(ikon, ikon === 'oynat' ? 'dolu' : '')}</button>`;
const ogreGeri = () => geri('Öğren', { 'data-ox-alt': '' });
// gelinen yere dönen geri düğmesi; dönüş bilgisi yoksa Öğren
const donGeri = (k, d) => d ? geri(esc(donusAd(k, d)), { 'data-ox-alt': d }) : ogreGeri();
// direksiyon sayfaları arasında gezinirken dönüş bilgisi korunsun (ikinci geri de gelinen yere götürsün)
const donEk = (html, d) => !d ? html : html.replace(/data-ox-alt="((?:direksiyon|etkilesim)[^"]*)"/g, (_, a) => `data-ox-alt="${a.includes(':') || a.includes('|') ? a : a + ':'}|${esc(d)}"`);

/* =====================================================================
   22 · Tehlike algısı
   ===================================================================== */
const T = TEHLIKE_SURE;
// Sahnenin tamamı görünür (puanlama, tehlikenin pencere başında görülmesine göre kurulu): dünya 90° döndürülür, bizim araç soldan sağa gider.
// Görünen yol boyu 37 m (y −5…32: bizim araç başta da görünür), genişlik 20 m; kutu yatay, referanstaki gibi.
const SAHNE_VB = '-32 -9 37 20';
const TH = { i: 0, puanlar: [], durum: 'hazir', t: 0, tik: [], sonuc: null, kareZaman: 0 };
const thSifirla = () => Object.assign(TH, { i: 0, puanlar: [], durum: 'hazir', t: 0, tik: [], sonuc: null });
const sahneKutu = (s, t, etkin) => `<div class="ox-arc-th-sahne${etkin ? '' : ' donuk'}${etkin && TH.durum === 'hazir' ? ' bekliyor' : ''}" data-ox-arc-th-alan ${etkin ? 'role="button" tabindex="0" aria-label="Sahne. Tehlikeyi fark ettiğin an dokun."' : 'aria-hidden="true"'}>
  <svg viewBox="${SAHNE_VB}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="-33" y="-9.5" width="39" height="21" fill="#cfcac0"/><g transform="rotate(90)" data-ox-arc-th-dunya>${sahneSvg(s, t)}</g></svg>
  <span class="ox-arc-th-isaret" aria-hidden="true">!</span><span class="ox-arc-th-cubuk"><i style="transform:scaleX(${Math.min(1, t / T).toFixed(4)})"></i></span></div>`;
const thUst = (sol, sag) => `<div class="ox-arc-th-ust"><span>${sol}</span><b>${sag}</b></div>`;

function thGovde(k) {
  const N = SAHNELER.length, s = SAHNELER[TH.i];
  if (TH.durum === 'bitti') {
    const top = TH.puanlar.reduce((a, b) => a + b, 0), en = N * 5, iyi = top >= en * .6;
    return thUst('Bütün sahneler bitti', `${N} / ${N} sahne`)
      + `<div class="ox-kart ox-arc-sonuc"><small>Tehlike algısı puanın</small><b class="${iyi ? 'iyi' : 'kotu'}">${top} / ${en}</b>
        <p>${iyi ? 'Tehlikeleri erken fark ediyorsun.' : 'Sahneleri bir daha izle; park etmiş araçların arasına, duran otobüsün önüne, yan yollara ve öndeki aracın stop lambalarına dikkat et.'}</p></div>`
      + bolum('Sahneler', `${N} sahne`)
      + liste(SAHNELER.map((x, i) => { const p = TH.puanlar[i] || 0; return satir({ ikon: p >= 3 ? 'dogru' : p ? 'uyari' : 'yanlis', ton: p >= 3 ? 'yesil' : p ? 'turuncu' : 'kirmizi', baslik: esc(x.ad), sag: `${p} / 5` }); }), 'ox-arc-th-liste')
      + `<div class="ox-arc-alt-dg">${dugme('Yeniden dene', { 'data-ox-arc-th-yeniden': true }, { genis: true, ikon: 'sifirla' })}</div>`;
  }
  if (TH.durum === 'sonuc') {
    const r = TH.sonuc, son = TH.i === N - 1, iyi = r.p >= 3;
    return thUst(esc(s.ad), `${TH.i + 1} / ${N} sahne`)
      + sahneKutu(s, Math.min(T, s.pencere[0] + (s.pencere[1] - s.pencere[0]) * .6), false)
      + cevapKutu(iyi, `${r.p} / 5 puan`, esc(r.neden || (iyi ? 'Tehlikeyi erken fark ettin.' : 'Tehlikeyi biraz geç fark ettin.')), `<p class="ox-arc-th-ipucu"><b>Tehlike:</b> ${esc(s.ipucu)}</p>`)
      + `<div class="ox-arc-alt-dg">${dugme(son ? 'Sonucu gör' : 'Sonraki sahne', { 'data-ox-arc-th-sonraki': true }, { genis: true, ok: true })}</div>`;
  }
  const oyn = TH.durum === 'oynuyor', ilk = TH.i === 0 && !TH.puanlar.length && TH.durum === 'hazir';
  const gecmis = (k.tehlike || []).slice(-3).reverse();
  return thUst(esc(s.ad), `${TH.i + 1} / ${N} sahne`)
    + sahneKutu(s, Math.min(TH.t, T), true)
    + `<p class="ox-arc-th-ip">${TH.durum === 'duraklat' ? 'Duraklatıldı. Devam edince sahne kaldığı yerden sürer.' : 'Tehlikeyi fark ettiğin an dokun.'}</p>
      <div class="ox-arc-th-dg">${oyn ? yuvarlak('duraklat', 'Duraklat', 'data-ox-arc-th-dur') : yuvarlak('oynat', 'Oynat', 'data-ox-arc-th-dur')}
      ${dugme(oyn ? 'Dokun' : TH.durum === 'duraklat' ? 'Devam et' : ilk ? 'Başla' : 'Sahneyi başlat', { 'data-ox-arc-th-ana': true }, { genis: true })}</div>`
    + (ilk ? not('Her sahnede yolda ilerleyen yeşil araç sensin. Bir tehlikenin geliştiğini fark ettiğin anda dokun: ne kadar erken fark edersen o kadar çok puan alırsın (en çok 5). Rastgele ya da art arda dokunmak puanı sıfırlar.')
      + not(`${N} sahne · her biri ${T} saniye. Konu: MEB Trafik ve Çevre programı, trafikte tehlike algısı. Sahneler temsilîdir.`, 'kitap')
      + (gecmis.length ? bolum('Son sonuçların') + liste(gecmis.map(x => satir({ ikon: 'grafik', ton: x.puan >= x.en * .6 ? 'yesil' : 'turuncu', baslik: `${x.puan} / ${x.en} puan`, alt: esc(tarih(x.tarih)) }))) : '') : '');
}

function tehlikeEkran(ctx, donus) {
  const { k } = ctx;
  const ust = donGeri(k, donus) + sayfaBas('Tehlike algısı', 'Trafikteki riskleri erken fark et.');
  if (!ogrOzellik('tehlike')) return { html: ust + bos('uyari', 'Bu çalışma kursunda kapalı', 'Kursun açtığında burada olacak.') };
  // ekran başka bir nedenle yeniden çizildiyse oyun sürer; sekmeden çıkıp dönüldüyse duraklatılmış gelir
  if (TH.durum === 'oynuyor' && performance.now() - TH.kareZaman > 1200) TH.durum = 'duraklat';
  return {
    html: ust + `<div class="ox-arc-th" data-ox-arc-th>${thGovde(k)}</div>`,
    baglan(kap) {
      const yer = kap.querySelector('[data-ox-arc-th]');
      let dur = null;
      const ciz = () => { if (dur) dur(); yer.innerHTML = thGovde(k); if (TH.durum === 'oynuyor') oyna(); };
      const oyna = () => {
        const s = SAHNELER[TH.i], alan = yer.querySelector('[data-ox-arc-th-alan]'), svg = alan.querySelector('[data-ox-arc-th-dunya]'), cub = alan.querySelector('.ox-arc-th-cubuk i');
        let id = 0, son = null, acik = true;
        const kare = now => {
          if (!acik) return;
          if (!alan.isConnected) { acik = false; return; }
          if (son != null) TH.t += Math.min(.1, (now - son) / 1000);
          son = now; TH.kareZaman = performance.now();
          const t = Math.min(TH.t, T);
          svg.innerHTML = sahneSvg(s, t); cub.style.transform = `scaleX(${(t / T).toFixed(4)})`;
          if (TH.t >= T) { acik = false; dur = null; bitti(); return; }
          id = requestAnimationFrame(kare);
        };
        id = requestAnimationFrame(kare);
        dur = () => { acik = false; cancelAnimationFrame(id); dur = null; };
        calisan.push(() => dur && dur());
      };
      const bitti = () => { const s = SAHNELER[TH.i]; TH.sonuc = tehlikePuanla(s, TH.tik); TH.puanlar[TH.i] = TH.sonuc.p; TH.durum = 'sonuc'; ciz(); };
      const baslat = () => { TH.durum = 'oynuyor'; TH.kareZaman = performance.now(); ciz(); const a = yer.querySelector('[data-ox-arc-th-ana]'); if (a) a.focus({ preventScroll: true }); };
      const dokun = () => {
        if (TH.durum !== 'oynuyor') return;
        TH.tik.push(TH.t);
        const is = yer.querySelector('.ox-arc-th-isaret'); if (is) { is.classList.remove('acik'); void is.offsetWidth; is.classList.add('acik'); }
      };
      yer.addEventListener('pointerdown', ev => {
        if (ev.button > 0) return;
        if (ev.target.closest('[data-ox-arc-th-alan]') || ev.target.closest('[data-ox-arc-th-ana]')) dokun();
      });
      yer.addEventListener('keydown', ev => { if ((ev.key === ' ' || ev.key === 'Enter') && ev.target.closest('[data-ox-arc-th-alan]')) { ev.preventDefault(); if (TH.durum === 'oynuyor') dokun(); else baslat(); } });
      yer.addEventListener('click', ev => {
        const t = ev.target;
        if (t.closest('[data-ox-arc-th-ana]')) { if (TH.durum === 'oynuyor') { if (ev.detail === 0) dokun(); } else baslat(); return; }
        if (t.closest('[data-ox-arc-th-dur]')) { if (TH.durum === 'oynuyor') { TH.durum = 'duraklat'; ciz(); } else baslat(); return; }
        if (t.closest('[data-ox-arc-th-sonraki]')) {
          if (TH.i < SAHNELER.length - 1) { TH.i++; TH.t = 0; TH.tik = []; TH.sonuc = null; baslat(); }
          else {
            const top = TH.puanlar.reduce((a, b) => a + b, 0), en = SAHNELER.length * 5;
            k.tehlike = [...(k.tehlike || []), { tarih: gun(0), puan: top, en }].slice(-10); kaydet();
            TH.durum = 'bitti'; ciz(); window.scrollTo(0, 0);
          }
          return;
        }
        if (t.closest('[data-ox-arc-th-yeniden]')) { thSifirla(); baslat(); window.scrollTo(0, 0); }
      });
      if (TH.durum === 'oynuyor') oyna();
    },
  };
}

/* =====================================================================
   23 · Araç etkileşimleri: İkazlar / Motor / Kalkış
   ===================================================================== */
const ETK = [['ikaz', 'İkazlar', 'Gösterge panelindeki uyarı lambalarını tanı.', 'ikaz'], ['motor', 'Motor', 'Motorun çalışma sürecini incele.', 'motor'], ['kalkis', 'Kalkış', 'Debriyajla stop ettirmeden kalkmayı dene.', 'motor']];
const RENK_TON = { k: 'kirmizi', s: 'turuncu', y: 'yesil', m: 'mavi' };

/* --- ikaz lambaları --- */
const IK = { sec: null, test: null };
const lamba = x => `<svg class="ox-arc-lsvg" viewBox="0 0 24 24" aria-hidden="true" style="color:${MOD.ikaz.IKAZ_RENK[x.r][0]}">${x.svg}</svg>`;
const karistir = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function lambaBilgi() {
  const { LAMBALAR, IKAZ_RENK } = MOD.ikaz, x = LAMBALAR.find(y => y.id === IK.sec);
  if (!x) return `<div class="ox-kart ox-arc-lbilgi ox-arc-lbilgi-bos">${ikonKutu('ampul', 'gri')}<span><b>Bir lambaya dokun</b><small>Adını, rengin anlamını ve ne yapman gerektiğini gör.</small></span></div>`;
  return `<div class="ox-kart ox-arc-lbilgi"><div class="ox-arc-lbilgi-ust"><span class="ox-arc-lkutu">${lamba(x)}</span><span>${cip(IKAZ_RENK[x.r][1], RENK_TON[x.r])}<b>${esc(x.ad)}</b></span></div>
    <p>${esc(x.anlam)}</p><p class="ox-arc-yap"><b>Ne yapmalısın?</b> ${esc(x.yap)}</p></div>`;
}
function ikazPanel() {
  const { LAMBALAR, IKAZ_RENK } = MOD.ikaz;
  return `<div class="ox-arc-pano" role="group" aria-label="Gösterge paneli">${LAMBALAR.map(x => `<button type="button" class="${IK.sec === x.id ? 'secili' : ''}" data-ox-arc-lamba="${x.id}" aria-label="${esc(x.ad)}" aria-pressed="${IK.sec === x.id}">${lamba(x)}</button>`).join('')}</div>
    <div data-ox-arc-lbilgi>${lambaBilgi()}</div>
    <div class="ox-arc-alt-dg">${dugme('Kendini test et', { 'data-ox-arc-ikaz-test': true }, { tur: 'ikincil', genis: true, ikon: 'panoSoru' })}</div>`
    + bolum('Renklerin anlamı')
    + liste(Object.values(IKAZ_RENK).map(([r, ad, an]) => satir({ sol: `<span class="ox-arc-renk"><i style="background:${r};box-shadow:0 0 8px ${r}"></i></span>`, baslik: esc(ad), alt: esc(an) })))
    + not('Kaynak: MEB Araç Tekniği Dersi Öğretim Programı (2020), sık yaşanan araç arızaları. Semboller araçtan araca biraz farklı olabilir; aracının kullanım kılavuzuna da bak.', 'kitap');
}
function ikazTest() {
  const t = IK.test, n = t.l.length;
  if (t.i >= n) {
    const iyi = t.d >= n - 1;
    return `<div class="ox-kart ox-arc-sonuc"><small>İkaz lambaları testi</small><b class="${iyi ? 'iyi' : 'kotu'}">${t.d} / ${n}</b><p>${iyi ? 'Lambaları tanıyorsun.' : 'Paneli bir kez daha incele, sonra tekrar dene.'}</p></div>
      <div class="ox-arc-alt-dg">${dugme('Yeniden dene', { 'data-ox-arc-ikaz-test': true }, { genis: true, ikon: 'sifirla' })}${dugme('Panele dön', { 'data-ox-arc-ikaz-panel': true }, { tur: 'cizgi', genis: true })}</div>`;
  }
  const x = t.l[t.i], c = t.cevap;
  return `<div class="ox-arc-test-ust"><b>Soru ${t.i + 1} / ${n}</b><button type="button" class="ox-bag" data-ox-arc-ikaz-panel>Panele dön</button></div>${serit(t.i / n * 100, 'mavi', true)}
    <div class="ox-arc-test-lamba">${lamba(x)}</div><h3 class="ox-arc-test-soru">Bu lamba ne anlama gelir?</h3>
    <div class="ox-arc-test-sik">${t.sik[t.i].map((y, j) => sik('ABC'[j], esc(y.ad), c ? (y.id === x.id ? 'dogru' : y.id === c ? 'yanlis' : 'soluk') : '', { 'data-ox-arc-cevap': y.id, disabled: !!c })).join('')}</div>
    ${c ? cevapKutu(c === x.id, c === x.id ? 'Doğru' : `Bu lamba: ${esc(x.ad)}`, esc(x.yap)) + `<div class="ox-arc-alt-dg">${dugme(t.i + 1 < n ? 'Sonraki soru' : 'Sonucu gör', { 'data-ox-arc-sonraki': true }, { genis: true, ok: true })}</div>` : ''}`;
}
const ikazHtml = () => IK.test ? ikazTest() : ikazPanel();
function ikazBagla(kap) {
  const g = kap.querySelector('[data-ox-arc-govde]'), { LAMBALAR } = MOD.ikaz;
  // basa: sekmeler üst çubuğun altında kaldıysa sekmeler görünecek kadar yukarı kaydır (üst çubuk yapışkan)
  const ciz = (basa) => { g.innerHTML = ikazHtml(); if (basa) { const s = kap.querySelector('.ox-sekmeler'), u = document.querySelector('.ox-ust'), ub = u ? u.getBoundingClientRect().bottom : 0; if (s) { const t = s.getBoundingClientRect().top; if (t < ub) window.scrollBy(0, t - ub - 12); } } };
  g.addEventListener('click', ev => {
    const t = ev.target;
    const l = t.closest('[data-ox-arc-lamba]'); if (l) {
      IK.sec = l.dataset.oxArcLamba;
      g.querySelectorAll('[data-ox-arc-lamba]').forEach(b => { const s = b === l; b.classList.toggle('secili', s); b.setAttribute('aria-pressed', s); });
      g.querySelector('[data-ox-arc-lbilgi]').innerHTML = lambaBilgi(); return;
    }
    if (t.closest('[data-ox-arc-ikaz-test]')) {
      const l2 = karistir(LAMBALAR).slice(0, 8);
      IK.test = { l: l2, i: 0, d: 0, cevap: null, sik: l2.map(x => karistir([x, ...karistir(LAMBALAR.filter(y => y.id !== x.id)).slice(0, 2)])) };
      return ciz(true);
    }
    if (t.closest('[data-ox-arc-ikaz-panel]')) { IK.test = null; return ciz(true); }
    const cv = t.closest('[data-ox-arc-cevap]'); if (cv && IK.test && !IK.test.cevap) { IK.test.cevap = cv.dataset.oxArcCevap; if (IK.test.cevap === IK.test.l[IK.test.i].id) IK.test.d++; ciz(false); const dg = g.querySelector('[data-ox-arc-sonraki]'); if (dg) dg.scrollIntoView({ block: 'nearest', behavior: azHareket() ? 'auto' : 'smooth' }); return; }
    if (t.closest('[data-ox-arc-sonraki]') && IK.test) { IK.test.i++; IK.test.cevap = null; return ciz(true); }
  });
}

/* --- 4 zamanlı motor --- */
const MT = { a: 60, oyna: null, hiz: 120 };
const ZAMAN_AD = ['Emme', 'Sıkıştırma', 'Güç', 'Egzoz'], ZAMAN_UZUN = ['Emme', 'Sıkıştırma', 'Güç (iş)', 'Egzoz'];
const zamanNo = a => Math.floor((a % 720) / 180);
function motorHtml() {
  const { MOTOR_ZAMAN, motorKesit } = MOD.motor, z = zamanNo(MT.a), oyn = MT.oyna;
  return `<div class="ox-arc-mt"><div class="ox-arc-mt-cizim"><svg viewBox="-5 -11 10 13.8" role="img" aria-label="4 zamanlı motor canlandırması" data-ox-arc-motor>${motorKesit(MT.a)}</svg></div>
    <div class="ox-arc-mt-zaman" role="radiogroup" aria-label="Motorun zamanları">${ZAMAN_AD.map((ad, i) => radyo(ad, i === z, { 'data-ox-arc-zaman': i })).join('')}</div></div>
    <div class="ox-kart ox-arc-oynat">${yuvarlak(oyn ? 'duraklat' : 'oynat', oyn ? 'Duraklat' : 'Oynat', 'data-ox-arc-mt-oyna')}
      <input type="range" class="ox-arc-surgu" min="0" max="719" step="1" value="${Math.round(MT.a)}" style="--dolu:${(MT.a / 719 * 100).toFixed(2)}%" aria-label="Krank mili açısı (iki tur)" data-ox-arc-mt-surgu>
      <button type="button" class="ox-arc-hiz" data-ox-arc-mt-hiz aria-pressed="${MT.hiz !== 120}">${MT.hiz === 120 ? 'Yavaş' : 'Normal'}</button></div>
    <div class="ox-kart ox-arc-mt-yazi">${MOTOR_ZAMAN.map(([, acik], i) => `<p class="${i === z ? 'secili' : ''}" data-ox-arc-zyazi="${i}" ${i === z ? '' : 'aria-hidden="true"'}><b>${i + 1}. ${ZAMAN_UZUN[i]} zamanı</b>${esc(acik)}</p>`).join('')}</div>`
    + not('Krank mili her 4 zamanda iki tur döner; supaplar bu sırada bir kez açılıp kapanır. Kaynak: MEB Araç Tekniği Dersi Öğretim Programı (2020), motor ve çalışma prensibi.', 'kitap');
}
function motorBagla(kap) {
  const { motorKesit } = MOD.motor;
  const svg = kap.querySelector('[data-ox-arc-motor]'), sur = kap.querySelector('[data-ox-arc-mt-surgu]'), ob = kap.querySelector('[data-ox-arc-mt-oyna]'), hb = kap.querySelector('[data-ox-arc-mt-hiz]');
  const radyolar = [...kap.querySelectorAll('[data-ox-arc-zaman]')], yazilar = [...kap.querySelectorAll('[data-ox-arc-zyazi]')];
  let z0 = zamanNo(MT.a), kirli = false;
  const guncel = () => {
    svg.innerHTML = motorKesit(MT.a);
    if (document.activeElement !== sur || MT.oyna) sur.value = Math.round(MT.a);
    sur.style.setProperty('--dolu', (MT.a / 719 * 100).toFixed(2) + '%');
    const z = zamanNo(MT.a);
    if (z !== z0) {
      z0 = z;
      radyolar.forEach((r, i) => { r.classList.toggle('secili', i === z); r.setAttribute('aria-checked', i === z); });
      yazilar.forEach((p, i) => { p.classList.toggle('secili', i === z); if (i === z) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true'); });
    }
  };
  const oynaYaz = () => { ob.innerHTML = oi(MT.oyna ? 'duraklat' : 'oynat', MT.oyna ? '' : 'dolu'); ob.setAttribute('aria-label', MT.oyna ? 'Duraklat' : 'Oynat'); };
  dongu(svg, dt => { if (MT.oyna) { MT.a = (MT.a + dt * MT.hiz) % 720; kirli = true; } if (kirli) { kirli = false; guncel(); } });
  ob.addEventListener('click', () => { MT.oyna = !MT.oyna; oynaYaz(); });
  hb.addEventListener('click', () => { MT.hiz = MT.hiz === 120 ? 40 : 120; hb.textContent = MT.hiz === 120 ? 'Yavaş' : 'Normal'; hb.setAttribute('aria-pressed', MT.hiz !== 120); });
  sur.addEventListener('input', () => { MT.a = +sur.value; if (MT.oyna) { MT.oyna = false; oynaYaz(); } kirli = true; });
  radyolar.forEach((r, i) => r.addEventListener('click', () => { MT.a = i * 180 + 60; if (MT.oyna) { MT.oyna = false; oynaYaz(); } kirli = true; }));
}

/* --- debriyaj ve kalkış --- */
let DB = null;
const DB_TON = { stop: ['kirmizi', 'yanlis'], kavrama: ['turuncu', 'uyari'], tamam: ['yesil', 'dogru'], basili: ['gri', 'bilgi'], birakildi: ['gri', 'bilgi'] };
function kalkisHtml() {
  const { debriyajYeni, debriyajAdim, debriyajDurum, DEBRIYAJ_METIN, debriyajCizim } = MOD.motor;
  if (!DB) DB = debriyajAdim(debriyajYeni(), 0);
  const d = DB, dr = debriyajDurum(d);
  return `<div class="ox-kart ox-arc-db"><div class="ox-arc-db-et"><span>Motor (volan)</span><span>Debriyaj diski → vites kutusu</span></div>
      <svg viewBox="-10 -4.1 20 8.2" role="img" aria-label="Debriyaj diskleri" data-ox-arc-db>${debriyajCizim(d)}</svg>
      <div class="ox-arc-db-gost"><div><small>Motor devri</small><b data-ox-arc-devir>${Math.round(d.devir)}</b><span>d/dk</span></div><div><small>Hız</small><b data-ox-arc-hizg>${d.hiz}</b><span>km/sa</span></div></div></div>
    <div class="ox-kart ox-arc-pedal">
      <label class="ox-arc-pedal-sat"><span><b>Debriyaj pedalı</b><small>basılı ← → bırakılmış</small></span><input type="range" class="ox-arc-surgu" min="0" max="100" value="${d.ped}" style="--dolu:${d.ped}%" data-ox-arc-ped></label>
      <label class="ox-arc-pedal-sat"><span><b>Gaz pedalı</b><small>bırakılmış ← → basılı</small></span><input type="range" class="ox-arc-surgu" min="0" max="100" value="${d.gaz}" style="--dolu:${d.gaz}%" data-ox-arc-gaz></label></div>
    <div class="ox-arc-db-durum" role="status">${Object.entries(DEBRIYAJ_METIN).map(([a, m]) => `<p class="${DB_TON[a][0]}${a === dr ? ' secili' : ''}" data-ox-arc-dd="${a}" ${a === dr ? '' : 'aria-hidden="true"'}>${oi(DB_TON[a][1])}<span>${esc(m)}</span></p>`).join('')}</div>
    <div class="ox-arc-alt-dg">${dugme('Yeniden başla', { 'data-ox-arc-db-sifir': true }, { tur: 'cizgi', genis: true, ikon: 'sifirla' })}</div>`
    + not('Araç birinci viteste, el freni indirilmiş. Debriyaj pedalını yavaşça bırak, kavrama noktasında hafif gaz ver. Pedalı birden bırakırsan motor stop eder: uygulama sınavında kalkış ve rampa hatalarının çoğu budur.')
    + not('Temsilî canlandırma; kavrama noktası her araçta farklıdır, öğretmeninle sınav aracında çalış.', 'kitap');
}
function kalkisBagla(kap) {
  const { debriyajYeni, debriyajAdim, debriyajDurum, debriyajCizim } = MOD.motor;
  const svg = kap.querySelector('[data-ox-arc-db]'), ped = kap.querySelector('[data-ox-arc-ped]'), gaz = kap.querySelector('[data-ox-arc-gaz]');
  const devir = kap.querySelector('[data-ox-arc-devir]'), hiz = kap.querySelector('[data-ox-arc-hizg]'), dl = [...kap.querySelectorAll('[data-ox-arc-dd]')];
  let d0 = debriyajDurum(DB);
  const surgu = (el, v) => { el.value = v; el.style.setProperty('--dolu', v + '%'); };
  ped.addEventListener('input', () => { DB.ped = +ped.value; ped.style.setProperty('--dolu', ped.value + '%'); });
  gaz.addEventListener('input', () => { DB.gaz = +gaz.value; gaz.style.setProperty('--dolu', gaz.value + '%'); });
  kap.querySelector('[data-ox-arc-db-sifir]').addEventListener('click', () => { DB = debriyajAdim(debriyajYeni(), 0); surgu(ped, 0); surgu(gaz, 0); });
  dongu(svg, dt => {
    debriyajAdim(DB, dt);
    svg.innerHTML = debriyajCizim(DB);
    devir.textContent = Math.round(DB.devir); hiz.textContent = DB.hiz;
    const dr = debriyajDurum(DB);
    if (dr !== d0) { d0 = dr; dl.forEach(p => { const s = p.dataset.oxArcDd === dr; p.classList.toggle('secili', s); if (s) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true'); }); }
  });
}

function etkilesimEkran(ctx, sekme, donus) {
  const acik = ETK.filter(x => ogrOzellik(x[3]));
  const sec = acik.find(x => x[0] === sekme) || acik.find(x => x[0] === 'motor') || acik[0];
  const ger = donGeri(ctx.k, donus);
  if (!sec) return { html: ger + sayfaBas('Araç etkileşimleri', 'Aracını tanı.') + bos('arac', 'Bu çalışma kursunda kapalı', 'Kursun açtığında burada olacak.') };
  const ust = ger + sayfaBas('Araç etkileşimleri', sec[2]) + sekmeler(acik.map(x => [x[0], x[1]]), sec[0], 'data-ox-arc-sekme', 'hap');
  const ad = sec[0] === 'ikaz' ? 'ikaz' : 'motor';
  if (!MOD[ad]) return bekle(ust, ad, ctx);
  if (MT.oyna == null) MT.oyna = !azHareket();
  const govde = sec[0] === 'ikaz' ? ikazHtml() : sec[0] === 'motor' ? motorHtml() : kalkisHtml();
  return {
    html: ust + `<div class="ox-arc-govde" data-ox-arc-govde>${govde}</div>`,
    baglan(kap) {
      kap.querySelectorAll('[data-ox-arc-sekme]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.oxArcSekme === sec[0]) return;
        altAc('etkilesim:' + b.dataset.oxArcSekme + (donus ? '|' + donus : '')); ctx.yenile();
      }));
      if (sec[0] === 'ikaz') ikazBagla(kap); else if (sec[0] === 'motor') motorBagla(kap); else kalkisBagla(kap);
    },
  };
}

/* =====================================================================
   24 · Direksiyon hazırlığı
   ===================================================================== */
const PUF_ONEMLI = ['I', 3, 5, 18, 8, 4];
const sirala = (l, h) => [...l].sort((a, b) => (h.has(b.bas) ? 1 : 0) - (h.has(a.bas) ? 1 : 0) || (PUF_ONEMLI.indexOf(a.no) < 0 ? 99 : PUF_ONEMLI.indexOf(a.no)) - (PUF_ONEMLI.indexOf(b.no) < 0 ? 99 : PUF_ONEMLI.indexOf(b.no)));
const madde = l => l.replace(/\s*\((?:"|“)[^)]*\)\s*\.?$/, '');
function donusAd(k, d) {
  const y = d.split('|')[0];
  if (UNITE_AD[y]) return UNITE_AD[y];
  if (y === 'araclar') return 'Çalışma araçları';
  if (y === 'deneme') return 'Deneme sınavı';
  if (y.split(':')[0] !== 'direksiyon') return 'Öğren';
  const [, alt = '', id = ''] = y.split(':');
  if (!alt) return 'Direksiyon hazırlığı';
  if (id && MOD.dir) { const b = MOD.dir.dirBolumler(k).find(x => x.id === id); if (b) return b.ad; }
  return alt === 'kriter' ? 'Sınav kriterleri' : alt === 'puf' ? 'Püf noktaları' : alt === 'guzergah' ? 'Güzergâhlar' : 'Geri';
}
function dirSinav(k) {
  const dGecti = k.dsinav && k.dsinav.sonuc === 'Geçti';
  if (dGecti) return ['dogru', 'Uygulama sınavını geçtin.'];
  const s = (S.sinavlar || []).filter(x => x.tur === 'Direksiyon' && (x.kursiyerler || []).includes(k.id) && fark(x.tarih) >= 0 && !(x.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  if (s) { const n = fark(s.tarih); return ['takvim', `Sınavın ${esc(tarihUzun(s.tarih))}${s.saat ? ' ' + esc(s.saat) : ''}${s.yer ? ', ' + esc(s.yer) : ''}. ${n === 0 ? 'Bugün.' : n === 1 ? 'Yarın.' : n + '\u00a0gün\u00a0kaldı.'}`]; }
  const hd = hakDurum(k); if (hd && hd.tur === 'Direksiyon') return ['uyari', esc(hd.metin)];  // hak doldu: kursun kararı bekleniyor
  if (k.dsinav && k.dsinav.sonuc) return ['bilgi', 'Sınava yeniden gireceksin; tarihi kurs bildirecek.'];
  return ['bilgi', 'Sınav tarihi henüz belirlenmedi.'];
}
function denemeHtml(k) {
  const dd = (k.dDeneme || []).slice(-1)[0]; if (!dd) return '';
  const gecti = dd.sonuc === 'Geçti', h = dd.hatalar || [];
  return bolum('Deneme uygulama sınavın', esc(tarih(dd.tarih)))
    + `<div class="ox-kart ox-arc-den"><div class="ox-arc-den-ust">${ikonKutu(gecti ? 'dogru' : 'yanlis', gecti ? 'yesil' : 'kirmizi')}<span class="ox-arc-den-ad"><b>${gecti ? 'Gerçek sınavda geçerdin' : 'Gerçek sınavda kalırdın'}</b><small>Öğretmeninin resmî formla yaptığı prova</small></span>${cip(gecti ? 'Geçti' : 'Kaldı', gecti ? 'yesil' : 'kirmizi')}</div>
      ${h.length ? `<p class="ox-arc-et">Çalışman gerekenler</p><ul class="ox-arc-hatalar">${h.slice(0, 6).map(x => `<li class="${x.renk === 'k' ? 'k' : x.renk === 's' ? 's' : 'm'}">${oi(x.renk === 'k' ? 'yanlis' : x.renk === 's' ? 'uyari' : 'bilgi')}<span>${esc(madde(x.metin || ''))}<small>${x.renk === 'k' ? 'Kırmızı hata' : x.renk === 's' ? 'Sarı hata' : 'Araç bilgisi'}</small></span></li>`).join('')}</ul>` : '<p class="ox-arc-den-p">Hiç hata yapmadın.</p>'}
      ${dd.not ? `<p class="ox-arc-den-not">Öğretmeninin notu: “${esc(dd.not)}”</p>` : ''}</div>`;
}
function dirAna(k, donus) {
  const [ik, metin] = dirSinav(k);
  const sat = (baslik, alt, a) => liste([satir({ baslik, alt, attrs: { 'data-ox-alt': a } })]);
  return donGeri(k, donus)
    + `<div class="ox-arc-dbas">${sayfaBas('Direksiyon hazırlığı', 'Sınav öncesi pratik bilgiler.')}${gorsel('modul-adab', '', 'ox-arc-dbas-g')}</div>`
    + `<div class="ox-arc-dsat">${sat('Sınav kriterleri', 'Uygulama sınavında dikkat edilenler.', 'direksiyon:kriter')}${sat('Güzergâhlar', 'Sık kullanılan sınav güzergâhları.', 'direksiyon:guzergah')}${sat('Püf noktaları', 'Sınavda işini kolaylaştıracak öneriler.', 'direksiyon:puf')}</div>`
    + `<p class="ox-arc-bilgi">${oi(ik)}<span>${metin}</span></p>`
    + denemeHtml(k);
}
const renkSay = b => { const say = r => b.l.filter(x => x[2] === r).length, kr = say('k'), sa = say('s'), ma = say('m'); if (!kr && !sa) return `${ma} araç bilgisi sorusu`; return [kr && `${kr} kırmızı`, sa && `${sa} sarı`, ma && `${ma} araç bilgisi`].filter(Boolean).join(' · ') + ' madde'; };
function kriterListe(k) {
  const { dirBolumler, dirHataBolum } = MOD.dir, l = dirBolumler(k), h = dirHataBolum(k), cal = k.dirCalisma || {};
  const n = l.filter(b => cal[b.id]).length;
  return geri('Direksiyon hazırlığı', { 'data-ox-alt': 'direksiyon' })
    + sayfaBas('Sınav kriterleri', 'Resmî değerlendirme formundaki bölümler.', `${n} / ${l.length}`)
    + `<div class="ox-kart ox-arc-kural"><p><i class="ox-arc-nokta k"></i><span><b>Kırmızı hata</b> Bir kez yapılırsa sınav biter.</span></p><p><i class="ox-arc-nokta s"></i><span><b>Sarı hata</b> Aynı madde iki kez yapılırsa sınav biter.</span></p><p><i class="ox-arc-nokta m"></i><span><b>Araç bilgisi</b> 5 soruyu bilemezsen sınav başlamadan biter.</span></p></div>`
    + bolum('Bölümler', 'Önce en çok kalınanlar')
    + liste(sirala(l, h).map(b => satir({
      ikon: h.has(b.bas) ? 'uyari' : cal[b.id] ? 'tik' : 'panoListe', ton: h.has(b.bas) ? 'kirmizi' : cal[b.id] ? 'yesil' : 'mavi', baslik: esc(b.ad),
      alt: h.has(b.bas) ? 'Denemede hata yaptın' : cal[b.id] ? 'Çalıştın · ' + renkSay(b) : renkSay(b), altTon: h.has(b.bas) ? 'kirmizi' : '',
      attrs: { 'data-ox-alt': 'direksiyon:kriter:' + b.id },
    })))
    + not(`Kaynak: MTSK Yönetmeliği ${motorSinif(k.sinif) ? 'EK-3' : 'EK-4'} uygulama sınavı değerlendirme formu (RG 9/7/2024, yürürlük 9/1/2025).`, 'kitap');
}
function kriterAyrinti(k, id) {
  const { dirBolumler } = MOD.dir, b = dirBolumler(k).find(x => x.id === id);
  if (!b) return null;
  const hs = (k.dDeneme || []).slice(-3).flatMap(d => (d.hatalar || []).filter(x => x.bas === b.bas).map(x => x.sira)), cal = (k.dirCalisma || {})[id];
  const grup = (r, baslik, acik) => {
    const l = b.l.filter(x => x[2] === r); if (!l.length) return '';
    return bolum(baslik, `${l.length} madde`) + `<p class="ox-arc-acik">${acik}</p>`
      + liste(l.map(([sira, metin]) => satir({ sol: `<i class="ox-arc-nokta ${r}" aria-hidden="true"></i>`, baslik: esc(madde(metin)), alt: hs.includes(sira) ? 'Denemede yaptın' : '', altTon: 'kirmizi', cls: 'ox-arc-madde' + (hs.includes(sira) ? ' hata' : '') })));
  };
  return geri('Sınav kriterleri', { 'data-ox-alt': 'direksiyon:kriter' })
    + sayfaBas(esc(b.ad), b.ek.ozet ? esc(b.ek.ozet) : '')
    + grup('k', 'Kırmızı hatalar', 'Bir kez yapılırsa sınav biter.')
    + grup('s', 'Sarı hatalar', 'Aynı madde iki kez yapılırsa sınav biter.')
    + grup('m', 'Araç bilgisi', '5 maddeyi bilemezsen sınav biter.')
    + `<div class="ox-arc-alt-dg">${b.ek.adim ? dugme('Püf noktalarını gör', { 'data-ox-alt': 'direksiyon:puf:' + id }, { tur: 'ikincil', genis: true, ok: true }) : ''}
      ${cal ? dugme('Çalıştın', { disabled: true }, { tur: 'cizgi', genis: true, ikon: 'tik' }) : dugme('Çalıştım', { 'data-ox-arc-calistim': id }, { genis: true })}</div>`
    + not(`Kaynak: MTSK Yönetmeliği ${motorSinif(k.sinif) ? 'EK-3' : 'EK-4'} uygulama sınavı değerlendirme formu (RG 9/7/2024, yürürlük 9/1/2025).`, 'kitap');
}
const pufBolumler = k => { const { dirBolumler, dirHataBolum } = MOD.dir; return sirala(dirBolumler(k).filter(b => b.ek.adim), dirHataBolum(k)); };
function pufListe(k) {
  const l = pufBolumler(k), kurs = guzergahlar().flatMap(g => (g.puflar || []).map(p => ({ ...p, g: g.ad })));
  return geri('Direksiyon hazırlığı', { 'data-ox-alt': 'direksiyon' })
    + sayfaBas('Püf noktaları', 'Sınavda işini kolaylaştıracak öneriler.')
    + (l.length ? liste(l.map(b => satir({ ikon: b.ek.sema ? 'oynat' : 'ampul', ton: b.ek.sema ? 'mavi' : 'sari', baslik: esc(b.ad), alt: b.ek.sema ? `Canlandırmalı · ${b.ek.adim.length} adım` : `${b.ek.adim.length} adım`, attrs: { 'data-ox-alt': 'direksiyon:puf:' + b.id } })))
      : bos('ampul', 'Bu sınıf için anlatım yok', 'Sınav kriterlerinden değerlendirilen maddelere bakabilirsin.', dugme('Sınav kriterleri', { 'data-ox-alt': 'direksiyon:kriter' }, { tur: 'ikincil' })))
    + (kurs.length ? bolum('Kursundan', `${kurs.length} öneri`) + liste(kurs.slice(0, 12).map(p => satir({ ikon: 'tik', ton: 'yesil', baslik: esc(p.metin), alt: esc([p.kim, p.g].filter(Boolean).join(' · ')), cls: 'ox-arc-madde' }))) : '')
    + not('Anlatımlar ayna, sinyal ve ölçüye dayanır; sınav alanındaki işaretlere göre tarif verilmez. Dönüş anlarını öğretmeninle sınav aracında çalış.');
}
function semaHtml(ad) {
  const s = MOD.dir.DIR_SEMA[ad], [, , w, h] = s.vb.split(' ').map(Number);
  const adimlar = s.yol.filter(x => typeof x === 'string');
  return `<figure class="ox-kart ox-arc-sema"><figcaption>${esc(s.baslik)}</figcaption>
    <svg viewBox="${s.vb}" style="aspect-ratio:${w}/${h}" role="img" aria-label="${esc(s.baslik)}"><defs><marker id="ok" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#fff"/></marker></defs>${s.zemin()}<g data-ox-arc-sarac>${MOD.dir.dirAracSvg('#2fa36b')}</g></svg>
    <div class="ox-arc-sema-adim" aria-live="polite"><p class="secili" data-ox-arc-sadim="-1">Oynat’a bas ya da adım adım ilerle.</p>${adimlar.map((m, i) => `<p data-ox-arc-sadim="${i}" aria-hidden="true"><b>${i + 1} / ${adimlar.length}</b> ${esc(m)}</p>`).join('')}</div>
    <div class="ox-arc-sema-dg">${dugme('Oynat', { 'data-ox-arc-s-oynat': true }, { kucuk: true, ikon: 'oynat' })}${dugme('Adım adım', { 'data-ox-arc-s-adim': true }, { kucuk: true, tur: 'ikincil' })}${dugme('Başa al', { 'data-ox-arc-s-basa': true }, { kucuk: true, tur: 'metin', ikon: 'sifirla' })}</div>
    <p class="ox-arc-sema-kaynak">Ölçüler yönetmelik ekindeki şemadan (MTSK Yönetmeliği, RG 9/7/2024). Anlatım temsilîdir; dönüş anlarını öğretmeninle sınav aracında çalış.</p></figure>`;
}
// direksiyon.js semaBagla ile aynı oynatma: pozlar arasında araç kayar, her adımın açıklaması görünür
function semaBagla(kap, ad) {
  const s = MOD.dir.DIR_SEMA[ad], g = kap.querySelector('[data-ox-arc-sarac]'); if (!g) return;
  const yazilar = [...kap.querySelectorAll('[data-ox-arc-sadim]')];
  const adimlar = []; let cur = [];
  s.yol.forEach(x => { if (typeof x === 'string') { adimlar.push({ pozlar: cur, metin: x }); cur = [cur[cur.length - 1]]; } else cur.push(x); });
  const koy = ([x, y, a]) => g.setAttribute('transform', `translate(${x} ${y}) rotate(${a})`);
  const yaz = n => yazilar.forEach(p => { const s2 = +p.dataset.oxArcSadim === n; p.classList.toggle('secili', s2); if (s2) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true'); });
  const ilk = adimlar[0].pozlar[0]; let i = 0, anim = 0, zam = 0, durdu = true;
  const kes = () => { cancelAnimationFrame(anim); clearTimeout(zam); };
  const sifirla = () => { kes(); i = 0; durdu = true; koy(ilk); yaz(-1); };
  const oyna = (n, sonra) => {
    const l = adimlar[n].pozlar, sure = (azHareket() ? 1 : 900) * Math.max(1, l.length - 1); let t0 = null; yaz(n);
    const kare = t => { if (!g.isConnected) return; if (t0 == null) t0 = t; const u = Math.min(1, (t - t0) / sure), f = u * (l.length - 1), j = Math.min(l.length - 2, Math.floor(f)), r = f - j, a = l[Math.max(0, j)], b = l[j + 1] || a; koy([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r, a[2] + (b[2] - a[2]) * r]); if (u < 1) anim = requestAnimationFrame(kare); else if (sonra) sonra(); };
    kes(); anim = requestAnimationFrame(kare);
  };
  kap.querySelector('[data-ox-arc-s-oynat]').addEventListener('click', () => { sifirla(); durdu = false; const zincir = n => oyna(n, () => { if (!durdu && n + 1 < adimlar.length) zam = setTimeout(() => zincir(n + 1), 700); }); zincir(0); });
  kap.querySelector('[data-ox-arc-s-adim]').addEventListener('click', () => { durdu = true; if (i >= adimlar.length) sifirla(); oyna(i); i++; });
  kap.querySelector('[data-ox-arc-s-basa]').addEventListener('click', sifirla);
  calisan.push(kes);
  sifirla();
}
function pufAyrinti(k, id) {
  const b = MOD.dir.dirBolumler(k).find(x => x.id === id); if (!b || !b.ek.adim) return null;
  const ek = b.ek, don = '|direksiyon:puf:' + id;
  const ekDg = [
    b.no === 'I' && ogrOzellik('ikaz') ? dugme('Gösterge paneli ve ikaz lambaları', { 'data-ox-alt': 'etkilesim:ikaz' + don }, { tur: 'ikincil', genis: true, ikon: 'ikaz', ok: true }) : '',
    [3, 18, 4, 5].includes(b.no) && !motorSinif(k.sinif) && ogrOzellik('motor') ? dugme('Debriyajı dene: stop ettirmeden kalkış', { 'data-ox-alt': 'etkilesim:kalkis' + don }, { tur: 'ikincil', genis: true, ikon: 'arac', ok: true }) : '',
  ].join('');
  return geri('Püf noktaları', { 'data-ox-alt': 'direksiyon:puf' })
    + sayfaBas(esc(b.ad), ek.ozet ? esc(ek.ozet) : '')
    + (ek.oran ? `<div class="ox-arc-oran">${oi('grafik')}<span>${esc(ek.oran)}<small>${esc(MOD.dir.DIR_KAYNAK)}</small></span></div>` : '')
    + (ek.sema ? semaHtml(ek.sema) : '')
    + bolum('Adım adım', `${ek.adim.length} adım`)
    + liste(ek.adim.map((x, i) => `<div class="ox-arc-adim"><span>${i + 1}</span><p>${esc(x)}</p></div>`))
    + `<div class="ox-arc-alt-dg">${ekDg}${dugme('Sınavda değerlendirilenler', { 'data-ox-alt': 'direksiyon:kriter:' + id }, { tur: 'cizgi', genis: true, ok: true })}</div>`;
}
const haritaLink = g => g.harita ? g.harita : g.baslangic ? 'https://www.google.com/maps/search/' + encodeURIComponent(g.baslangic + ' ' + ((S.kurs || {}).sehir || '')) : '';
const kisaAd = k => [k.ad, k.soyad ? k.soyad.charAt(0) + '.' : ''].filter(Boolean).join(' ');
function guzergahHtml(k) {
  const l = guzergahlar(), sd = k.sinavDeneyimi, girdi = !!(k.dsinav && k.dsinav.sonuc);
  const kartlar = l.map(g => {
    const h = haritaLink(g), pl = g.puflar || [], dl = g.deneyimler || [];
    return `<section class="ox-kart ox-arc-gz"><div class="ox-arc-gz-ust">${ikonKutu('harita')}<span><b>${esc(g.ad)}</b>${g.baslangic ? `<small>${esc(g.baslangic)}</small>` : ''}</span></div>
      ${g.tarif ? `<p class="ox-arc-gz-tarif">${esc(g.tarif)}</p>` : ''}
      ${h && /^https:\/\//.test(h) ? `<a class="ox-dg ox-dg-ikincil kucuk ox-arc-gz-dg" href="${esc(h)}" target="_blank" rel="noopener">${oi('dis')}<span>Haritada aç</span></a>` : ''}
      ${pl.length ? `<p class="ox-arc-et">Püf noktaları</p><ul class="ox-arc-tikler">${pl.map(p => `<li>${oi('tik')}<span>${esc(p.metin)}${p.kim ? `<small>${esc(p.kim)}</small>` : ''}</span></li>`).join('')}</ul>` : ''}
      ${dl.length ? `<p class="ox-arc-et">Sınava girenler anlatıyor</p>${dl.slice(0, 10).map(d => `<blockquote class="ox-arc-den-alinti">${esc(d.metin)}<small>${esc(d.ad)}${d.sonuc ? ' · ' + esc(d.sonuc) : ''} · ${esc(tarih(d.tarih))}</small></blockquote>`).join('')}` : ''}</section>`;
  }).join('');
  const paylas = sd && sd.onay == null ? not('Deneyimin kursa iletildi; onaylanınca diğer adaylar görecek.', 'saat')
    : sd && sd.onay ? not('Deneyimin yayında. Teşekkürler.', 'tik')
    : girdi && l.length ? bolum('Sınav deneyimini paylaş') + `<form class="ox-kart ox-arc-form" data-gz-deneyim novalidate>
        <label><span>Güzergâh</span><select name="g" class="ox-arc-girdi">${l.map(g => `<option value="${esc(g.id)}">${esc(g.ad)}</option>`).join('')}</select></label>
        <label><span>Deneyimin</span><textarea name="m" rows="4" maxlength="1000" class="ox-arc-girdi" placeholder="Nerede zorlandın, neye dikkat etmeli? Sonraki adaylara yardımcı olur." required></textarea></label>
        <button type="submit" class="ox-dg ox-dg-ana genis"><span>Gönder</span></button><small>Kurs müdürü onaylayınca adın kısaltılarak (ör. ${esc(kisaAd(k))}) görünür.</small></form>` : '';
  return geri('Direksiyon hazırlığı', { 'data-ox-alt': 'direksiyon' })
    + sayfaBas('Güzergâhlar', 'Sık kullanılan sınav güzergâhları.', l.length ? `${l.length} güzergâh` : '')
    + (l.length ? `<div class="ox-arc-gzler">${kartlar}</div>` : `<div class="ox-kart">${bos('harita', 'Henüz güzergâh eklenmedi', 'Kursun sınav güzergâhlarını eklediğinde burada görünür.')}</div>`)
    + paylas;
}
function direksiyonEkran(ctx, alt, donus) {
  const { k } = ctx, [bol = '', id = ''] = alt.split(':');
  if (!(SINIFLAR[k.sinif] || {}).direksiyon || !ogrOzellik('direksiyon')) return { html: donGeri(k, donus) + sayfaBas('Direksiyon hazırlığı', 'Sınav öncesi pratik bilgiler.') + bos('direksiyon', 'Bu bölüm senin sınıfın için yok', 'Ehliyet sınıfında direksiyon eğitimi olmadığı için burada çalışılacak bir şey yok.') };
  if (!bol) return { html: dirAna(k, donus) };
  if (bol === 'guzergah') return { html: guzergahHtml(k) };
  if (!MOD.dir) return bekle(geri('Direksiyon hazırlığı', { 'data-ox-alt': 'direksiyon' }), 'dir', ctx, 600);
  if (bol === 'kriter' && id) {
    const html = kriterAyrinti(k, id); if (!html) return { html: kriterListe(k) };
    return {
      html, baglan(kap) {
        const c = kap.querySelector('[data-ox-arc-calistim]');
        if (c) c.addEventListener('click', () => { k.dirCalisma = { ...(k.dirCalisma || {}), [id]: gun(0) }; kaydet(); ctx.yenile(); });
      },
    };
  }
  if (bol === 'kriter') return { html: kriterListe(k) };
  if (bol === 'puf' && id) {
    const html = pufAyrinti(k, id), b = MOD.dir.dirBolumler(k).find(x => x.id === id);
    if (!html) return { html: pufListe(k) };
    return { html, baglan(kap) { if (b.ek.sema) semaBagla(kap, b.ek.sema); } };
  }
  return { html: pufListe(k) };
}

/* ---------- dışa aktarım ---------- */
export function altEkran(ad, ctx) {
  durdur();
  const s = String(ad || ''), b = s.indexOf('|'), yol = b < 0 ? s : s.slice(0, b), donus = b < 0 ? '' : s.slice(b + 1), [ana, ...r] = yol.split(':');
  if (ana === 'tehlike') return tehlikeEkran(ctx, donus);
  if (ana === 'etkilesim') return etkilesimEkran(ctx, r[0] || 'motor', donus);
  if (ana === 'direksiyon') { const y = direksiyonEkran(ctx, r.join(':'), donus); if (y && donus) y.html = donEk(y.html, donus); return y; }
  return null;
}

stilEkle('ox-araclar', `
.ox-arc-yer{display:block}
.ox-arc-alt-dg{display:grid;gap:12px;margin-top:16px}
.ox-arc-alt-dg:empty{display:none}
.ox-arc-alt-dg [data-ox-arc-sonraki]{scroll-margin-bottom:calc(88px + env(safe-area-inset-bottom))}
.ox-arc-alt-dg .ox-dg{min-width:0;white-space:normal;line-height:1.25;padding-top:10px;padding-bottom:10px}
.ox-arc-alt-dg .ox-dg.okl>span{flex:1;min-width:0;text-align:left}
.ox-arc-yuvarlak{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:var(--ox-mavi-acik);color:var(--ox-bas)}
.ox-arc-yuvarlak .ox-i{width:22px;height:22px;stroke-width:2.2}
.ox-arc-yuvarlak .ox-i.dolu{width:20px;height:20px;margin-left:2px;stroke-width:1.4}
.ox-arc-yuvarlak:active{background:var(--ox-mavi-orta)}
.ox-arc-et{margin:16px 0 8px;font-size:15px;font-weight:700;letter-spacing:-.005em;color:var(--ox-bas)}
.ox-arc-ip{margin:0 0 14px;font-size:15px;line-height:1.45;color:var(--ox-metin)}
.ox-arc-ip b{color:var(--ox-bas)}
.ox-arc-sonuc{display:grid;justify-items:center;gap:6px;padding:24px 20px;text-align:center}
.ox-arc-sonuc small{font-size:14.5px;color:var(--ox-ikincil)}
.ox-arc-sonuc b{margin:2px 0 8px;font-size:44px;line-height:1.1;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.ox-arc-sonuc b.iyi{color:var(--ox-yesil)}.ox-arc-sonuc b.kotu{color:var(--ox-kirmizi)}
.ox-arc-sonuc p{max-width:320px;font-size:15px;line-height:1.45;color:var(--ox-metin)}

/* 22 tehlike algısı */
.ox-arc-th-ust{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:-2px 0 10px}
.ox-arc-th-ust span{min-width:0;font-size:14.5px;color:var(--ox-ikincil);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ox-arc-th-ust b{flex:none;font-size:15px;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-arc-th-sahne{position:relative;width:100%;aspect-ratio:37/20;border-radius:var(--ox-r);overflow:hidden;background:#cfcac0;box-shadow:var(--ox-golge);touch-action:manipulation;user-select:none;-webkit-user-select:none;cursor:pointer;transform:translateZ(0)}
.ox-arc-th-sahne.donuk{cursor:default}
.ox-arc-th-sahne svg{display:block;width:100%;height:100%}
.ox-arc-th-sahne:focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px}
.ox-arc-th-isaret{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;background:var(--ox-kirmizi);color:#fff;font:800 22px/40px var(--ox-yazi);text-align:center;opacity:0;transform:scale(.6);pointer-events:none;box-shadow:0 2px 8px rgba(229,72,77,.4)}
.ox-arc-th-isaret.acik{animation:ox-arc-pop .8s ease-out}
@keyframes ox-arc-pop{0%{opacity:0;transform:scale(.6)}20%{opacity:1;transform:scale(1.1)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1)}}
.ox-arc-th-cubuk{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(15,29,64,.18)}
.ox-arc-th-cubuk i{display:block;height:100%;background:var(--ox-mavi);transform-origin:0 50%;transform:scaleX(0)}
.ox-arc-th-sahne.donuk .ox-arc-th-cubuk,.ox-arc-th-sahne.bekliyor .ox-arc-th-cubuk{display:none}
.ox-arc-th-ip{margin:16px 0 14px;text-align:center;font-size:16px;font-weight:500;line-height:1.35;color:var(--ox-bas)}
.ox-arc-th-dg{display:flex;align-items:center;gap:12px}
.ox-arc-th-dg .ox-dg{flex:1;min-width:0}
.ox-arc-th .ox-cevap{margin-top:14px}
.ox-arc-th-ipucu{margin-top:8px}
.ox-cevap .ox-arc-th-ipucu b{display:inline;font-size:inherit;margin:0;color:inherit;font-weight:700}
.ox-arc-th>.ox-not{margin-top:20px}
.ox-arc-th>.ox-not+.ox-not{margin-top:10px}
.ox-arc-th-liste .ox-satir{min-height:56px}
.ox-arc-th-liste .ox-satir-sag{font-size:15px}

/* 23 araç etkileşimleri */
.ox-arc-govde{min-height:200px}
.ox-arc-pano{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;padding:12px;border-radius:var(--ox-r);background:linear-gradient(180deg,#17264a 0%,var(--ox-bas) 100%);box-shadow:var(--ox-golge)}
.ox-arc-pano button{display:grid;place-items:center;aspect-ratio:1;min-height:44px;border-radius:12px;border:1.5px solid transparent!important;transition:background-color .15s,border-color .15s}
.ox-arc-pano button.secili{border-color:rgba(255,255,255,.6)!important;background:rgba(255,255,255,.09)}
.ox-arc-pano button:active{background:rgba(255,255,255,.12)}
.ox :where(.ox-arc-pano) button:focus-visible{outline:2.5px solid #fff;outline-offset:1px}
.ox-arc-lsvg{display:block;width:30px;height:30px;filter:drop-shadow(0 0 4px currentColor)}
.ox-arc-lbilgi{margin-top:12px;padding:16px}
.ox-arc-lbilgi-bos{display:flex;align-items:center;gap:14px}
.ox-arc-lbilgi-bos b{display:block;font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-arc-lbilgi-bos small{display:block;margin-top:2px;font-size:14px;line-height:1.35;color:var(--ox-ikincil)}
.ox-arc-lbilgi-ust{display:flex;align-items:center;gap:14px}
.ox-arc-lbilgi-ust>span:last-child{min-width:0}
.ox-arc-lbilgi-ust b{display:block;margin-top:6px;font-size:17px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-arc-lkutu{flex:none;display:grid;place-items:center;width:56px;height:56px;border-radius:14px;background:var(--ox-bas)}
.ox-arc-lkutu .ox-arc-lsvg{width:34px;height:34px}
.ox-arc-lbilgi p{margin-top:12px;font-size:15px;line-height:1.45;color:var(--ox-metin)}
.ox-arc-yap b{color:var(--ox-bas)}
.ox-arc-renk{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--ox-bas)}
.ox-arc-renk i{width:14px;height:14px;border-radius:50%}
.ox-arc-test-ust{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;margin-bottom:6px}
.ox-arc-test-ust b{font-size:15px;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-arc-test-lamba{display:grid;place-items:center;width:112px;height:112px;margin:24px auto 16px;border-radius:26px;background:linear-gradient(180deg,#17264a 0%,var(--ox-bas) 100%);box-shadow:var(--ox-golge)}
.ox-arc-test-lamba .ox-arc-lsvg{width:64px;height:64px}
.ox-arc-test-soru{margin-bottom:16px;text-align:center;font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-arc-test-sik .ox-sik:disabled{cursor:default}
.ox-arc-mt{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr);align-items:center;gap:12px}
.ox-arc-mt-cizim svg{display:block;width:100%;max-width:220px;height:auto;aspect-ratio:10/13.8;margin:0 auto}
.ox-arc-mt-zaman{display:grid;gap:8px}
.ox-arc-mt-zaman .ox-radyo{min-height:48px;padding:8px 12px;gap:10px;font-size:15.5px;border:1px solid var(--ox-cizgi);border-radius:12px;box-shadow:var(--ox-golge)}
.ox-arc-mt-zaman .ox-radyo.secili{font-weight:600}
.ox-arc-oynat{display:flex;align-items:center;gap:12px;margin-top:16px;padding:8px 8px 8px 10px}
.ox-arc-hiz{flex:none;min-width:64px;min-height:44px;padding:0 8px;border-radius:10px;font-size:14.5px;font-weight:600;color:var(--ox-mavi)!important;text-align:center!important}
.ox-arc-hiz:active{background:var(--ox-mavi-acik)!important}
.ox-arc-surgu{--dolu:0%;flex:1;min-width:0;width:100%;height:44px;margin:0;padding:0;background:transparent;cursor:pointer;-webkit-appearance:none;appearance:none;touch-action:pan-y}
.ox-arc-surgu::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:linear-gradient(to right,var(--ox-mavi) 0,var(--ox-mavi) var(--dolu),#dfe4ec var(--dolu),#dfe4ec 100%)}
.ox-arc-surgu::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;margin-top:-8px;border-radius:50%;background:var(--ox-mavi);border:3px solid #fff;box-shadow:0 1px 4px rgba(16,24,40,.28)}
.ox-arc-surgu::-moz-range-track{height:6px;border-radius:999px;background:#dfe4ec}
.ox-arc-surgu::-moz-range-progress{height:6px;border-radius:999px;background:var(--ox-mavi)}
.ox-arc-surgu::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--ox-mavi);border:3px solid #fff;box-shadow:0 1px 4px rgba(16,24,40,.28)}
.ox-arc-surgu:focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px;border-radius:10px}
.ox-arc-mt-yazi{display:grid;margin-top:12px;padding:14px 16px}
.ox-arc-mt-yazi p{grid-area:1/1;visibility:hidden;font-size:15px;line-height:1.45;color:var(--ox-metin)}
.ox-arc-mt-yazi p.secili{visibility:visible}
.ox-arc-mt-yazi b{display:block;margin-bottom:4px;font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-arc-db{padding:14px 16px 16px}
.ox-arc-db-et{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--ox-ikincil)}
.ox-arc-db svg{display:block;width:100%;height:auto;aspect-ratio:20/8.2;margin:10px 0 14px}
.ox-arc-db-gost{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ox-arc-db-gost>div{padding:10px 12px;border-radius:12px;background:var(--ox-gri-acik)}
.ox-arc-db-gost small{display:block;font-size:13px;color:var(--ox-ikincil)}
.ox-arc-db-gost b{font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-arc-db-gost span{margin-left:4px;font-size:13.5px;color:var(--ox-ikincil)}
.ox-arc-db-durum{display:grid;margin:12px 0}
.ox-arc-db-durum p{grid-area:1/1;visibility:hidden;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;font-size:15px;line-height:1.4;font-weight:500}
.ox-arc-db-durum p.secili{visibility:visible}
.ox-arc-db-durum .ox-i{width:21px;height:21px;flex:none}
.ox-arc-db-durum p.kirmizi{background:var(--ox-kirmizi-acik);color:#9b2328}.ox-arc-db-durum p.kirmizi .ox-i{color:var(--ox-kirmizi)}
.ox-arc-db-durum p.turuncu{background:var(--ox-turuncu-acik);color:#8a4b00}.ox-arc-db-durum p.turuncu .ox-i{color:var(--ox-turuncu)}
.ox-arc-db-durum p.yesil{background:var(--ox-yesil-acik);color:#145c36}.ox-arc-db-durum p.yesil .ox-i{color:var(--ox-yesil)}
.ox-arc-db-durum p.gri{background:var(--ox-gri-acik);color:var(--ox-metin)}.ox-arc-db-durum p.gri .ox-i{color:var(--ox-soluk)}
.ox-arc-pedal{padding:4px 16px;margin-top:12px}
.ox-arc-pedal-sat{display:block;padding:10px 0 2px}
.ox-arc-pedal-sat+.ox-arc-pedal-sat{border-top:1px solid var(--ox-ayrac)}
.ox-arc-pedal-sat>span{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.ox-arc-pedal-sat b{font-size:15.5px;font-weight:600;color:var(--ox-bas)}
.ox-arc-pedal-sat small{font-size:13px;color:var(--ox-ikincil);white-space:nowrap}

/* 24 direksiyon hazırlığı */
.ox-arc-dbas{position:relative;min-height:134px;margin-bottom:16px}
.ox-arc-dbas .ox-sayfa-bas{position:relative;z-index:1;margin-top:4px;margin-bottom:0}
.ox-arc-dbas-g{position:absolute;right:-6px;top:14px;width:152px;height:auto;aspect-ratio:190/150;object-fit:contain;pointer-events:none}
.ox-arc-dsat{display:grid;gap:12px}
.ox-arc-bilgi{display:flex;align-items:center;gap:12px;margin-top:20px;padding:12px 16px;border-radius:14px;background:var(--ox-mavi-acik);font-size:15px;line-height:1.4;color:var(--ox-bas)}
.ox-arc-bilgi .ox-i{color:var(--ox-mavi)}
.ox-arc-den{padding:16px}
.ox-arc-den-ust{display:flex;align-items:center;gap:14px}
.ox-arc-den-ad{flex:1;min-width:0;display:grid;gap:2px}
.ox-arc-den-ust b{font-size:16px;line-height:1.25;font-weight:700;color:var(--ox-bas)}
.ox-arc-den-ust small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-arc-den-p{margin-top:12px;font-size:15px;color:var(--ox-metin)}
.ox-arc-hatalar{list-style:none;display:grid;gap:10px}
.ox-arc-hatalar li{display:flex;align-items:flex-start;gap:10px;font-size:15px;line-height:1.4;color:var(--ox-bas)}
.ox-arc-hatalar li .ox-i{width:20px;height:20px;margin-top:1px}
.ox-arc-hatalar li.k .ox-i{color:var(--ox-kirmizi)}.ox-arc-hatalar li.s .ox-i{color:var(--ox-turuncu)}.ox-arc-hatalar li.m .ox-i{color:var(--ox-mavi)}
.ox-arc-hatalar small{display:block;font-size:13px;color:var(--ox-ikincil)}
.ox-arc-den-not{margin-top:14px;padding-top:12px;border-top:1px solid var(--ox-ayrac);font-size:14.5px;line-height:1.45;color:var(--ox-ikincil)}
.ox-arc-kural{display:grid;gap:10px;padding:14px 16px}
.ox-arc-kural p{display:flex;align-items:flex-start;gap:12px;font-size:14.5px;line-height:1.4;color:var(--ox-ikincil)}
.ox-arc-kural .ox-arc-nokta{margin-top:5px}
.ox-arc-kural b{display:block;font-size:15px;color:var(--ox-bas)}
.ox-arc-nokta{flex:none;display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--ox-soluk)}
.ox-arc-nokta.k{background:var(--ox-kirmizi)}.ox-arc-nokta.s{background:var(--ox-sari)}.ox-arc-nokta.m{background:var(--ox-mavi)}
.ox-arc-acik{margin:-6px 0 10px;font-size:14.5px;color:var(--ox-ikincil)}
.ox-arc-madde{min-height:0;padding-top:13px;padding-bottom:13px;align-items:flex-start}
.ox-arc-madde .ox-arc-nokta{margin-top:6px}
.ox-arc-madde .ox-satir-govde b{font-size:15.5px;line-height:1.4;font-weight:500}
.ox-liste>.ox-arc-madde+.ox-arc-madde::before{left:40px}
.ox-arc-madde.hata{background:#fff8f8}
.ox-arc-oran{display:flex;align-items:flex-start;gap:12px;margin-bottom:4px;padding:14px 16px;border-radius:14px;background:var(--ox-mavi-acik);font-size:15px;line-height:1.4;color:var(--ox-bas)}
.ox-arc-oran .ox-i{color:var(--ox-mavi);margin-top:1px}
.ox-arc-oran small{display:block;margin-top:4px;font-size:12.5px;color:var(--ox-ikincil)}
.ox-arc-sema{margin-top:16px;padding:14px}
.ox-arc-sema figcaption{margin-bottom:10px;font-size:15px;font-weight:700;color:var(--ox-bas)}
.ox-arc-sema>svg{display:block;width:100%;height:auto;border-radius:12px;background:#4a4d52}
.ox-arc-sema-adim{display:grid;margin:12px 0}
.ox-arc-sema-adim p{grid-area:1/1;visibility:hidden;font-size:15px;line-height:1.4;color:var(--ox-bas)}
.ox-arc-sema-adim p.secili{visibility:visible}
.ox-arc-sema-adim b{margin-right:4px;color:var(--ox-mavi);font-variant-numeric:tabular-nums}
.ox-arc-sema-dg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ox-arc-sema-dg .ox-dg{padding:0 8px}
.ox-arc-sema-kaynak{margin-top:12px;font-size:13px;line-height:1.4;color:var(--ox-ikincil)}
.ox-arc-adim{position:relative;display:flex;align-items:flex-start;gap:14px;padding:14px 16px}
.ox-arc-adim>span{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ox-mavi-acik);color:var(--ox-mavi);font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.ox-arc-adim p{flex:1;min-width:0;padding-top:3px;font-size:15.5px;line-height:1.45;color:var(--ox-bas)}
.ox-liste>.ox-arc-adim+.ox-arc-adim::before{content:"";position:absolute;top:0;right:16px;left:58px;border-top:1px solid var(--ox-ayrac)}
.ox-arc-gzler{display:grid;gap:12px}
.ox-arc-gz{padding:16px}
.ox-arc-gz-ust{display:flex;align-items:center;gap:14px}
.ox-arc-gz-ust>span{min-width:0;display:grid;gap:2px}
.ox-arc-gz-ust b{font-size:16px;line-height:1.25;font-weight:700;color:var(--ox-bas)}
.ox-arc-gz-ust small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-arc-gz-tarif{margin-top:12px;font-size:15px;line-height:1.45;white-space:pre-wrap;color:var(--ox-metin)}
.ox-arc-gz-dg{margin-top:12px;text-decoration:none}
.ox-arc-tikler{list-style:none;display:grid;gap:8px}
.ox-arc-tikler li{display:flex;align-items:flex-start;gap:10px;font-size:15px;line-height:1.4;color:var(--ox-bas)}
.ox-arc-tikler .ox-i{width:19px;height:19px;margin-top:1px;color:var(--ox-yesil);stroke-width:2.4}
.ox-arc-tikler small{display:block;font-size:13px;color:var(--ox-ikincil)}
.ox-arc-den-alinti{margin:0 0 8px;padding:12px 14px;border-radius:12px;background:var(--ox-gri-acik);font-size:15px;line-height:1.45;color:var(--ox-bas)}
.ox-arc-den-alinti small{display:block;margin-top:4px;font-size:13px;color:var(--ox-ikincil)}
.ox-arc-form{display:grid;gap:12px;padding:16px}
.ox-arc-form label{display:grid;gap:6px}
.ox-arc-form label>span{font-size:14px;font-weight:600;color:var(--ox-bas)}
.ox-arc-form>small{font-size:13px;line-height:1.4;color:var(--ox-ikincil)}
.ox-arc-girdi{width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--ox-cizgi);border-radius:var(--ox-r-dg);background:#fff;font:inherit;font-size:16px;line-height:1.4;color:var(--ox-bas);-webkit-appearance:none;appearance:none;box-shadow:none}
select.ox-arc-girdi{padding-right:40px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235d6783' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9.5 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:20px}
textarea.ox-arc-girdi{resize:vertical;min-height:110px}
.ox-arc-girdi:focus{outline:0;border-color:var(--ox-mavi);box-shadow:0 0 0 3px var(--ox-mavi-acik)}
.ox-arc-girdi::placeholder{color:var(--ox-soluk)}
`);
