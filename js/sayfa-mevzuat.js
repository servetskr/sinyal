/* Mevzuat ve MEB yazıları (#/mevzuat, müdür ve ön büro)
   Arama motoru js/mevzuat-ara.js: ortak derlem (veri/mevzuat) + kursa gelen yazılar (worker /mevzuat/*).
   Anlam araması için sorgu vektörü worker'dan gelir (/mevzuat/gom); ulaşılamazsa yalnız kelimeyle aranır.
   Yerel denemede (localhost) worker'a istek gitmez; yerel worker için localStorage 'sinyal-mevzuat-api' = 'http://127.0.0.1:8787'. */
import { S, oturum, bulutKanca } from './veri.js?v=234';
import { e, ik, rozet, bos, pencere, kapatPencere, bildir, ekranNotu, isaret, tamTarih, ilerleme } from './ui.js?v=234';
import { WORKER } from './bulut.js?v=234';
import { motor, yukle, yuklendi, base64Int8, kokler, alinti, FILTRELER, ETIKET_RE, etiketCoz, etiketBul, resmiDegil, kisaCevapSec, cevapNormalle, cevapDuzMetin } from './mevzuat-ara.js?v=234';
import { kavramYukle, asistanAra, asistanKaynak, asistanSoru, kanitDenetle, sayilarBul, kaynaktaOlmayan } from './mevzuat-anla.js?v=234';

const TUR_AD = { yonetmelik: 'Yönetmelik', kanun: 'Kanun', yonerge: 'Yönerge', teblig: 'Tebliğ', kilavuz: 'Kılavuz', program: 'Ders programı', yazi: 'MEB yazısı', form: 'Form',
  'rehber-resmi': 'Denetim rehberi', bilgilendirme: 'Resmî bilgilendirme', rehber: 'mdSinyal rehberi (resmî metin değil)', sss: 'mdSinyal sık sorulanlar (resmî metin değil)' };
const ORNEKLER = ['A ehliyeti olan B almak isterse ne yapmalı?', 'Direksiyon sınavında dört kez kalan ne yapar?', 'Gece dersi hangi sınıflarda zorunlu?', 'Kursiyer başka kursa nakil olabilir mi?', 'Kurstan ayrılana ücret iadesi nasıl yapılır?', 'MTSK madde 15'];
// yapay zekâya giden kaynaklar: en çok 10 madde, 19.500 karakter (worker sınırı 10 / 20.000)
const KAYNAK_AYAR = { encok: 10, kar: 19500 };
const durum = { sekme: 'sor', fav: null, q: '', filtre: 'hepsi', son: null, yukHata: '', goster: 15, cevap: null, llmYok: false, kursListe: null, kursHata: '', kursHepsi: null, gomKapali: 0, kh: null };
const gomOnbellek = new Map();

/* ---------- servis ---------- */
const demo = () => !S._bulut;
const yerel = () => /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname);
function apiKok() {
  // yerel worker adresi yalnız yerel denemede okunur: canlıda başka bir adrese Firebase belirteci gitmesin
  if (yerel()) try { const o = localStorage.getItem('sinyal-mevzuat-api'); if (o) return o.replace(/\/+$/, ''); } catch (x) { }
  return yerel() ? null : WORKER;
}
const kimlik = async () => (S._bulut && bulutKanca.yetki ? await bulutKanca.yetki() : {});
async function api(yol, { method = 'GET', govde, sure = 20000 } = {}) {
  const kok = apiKok();
  if (!kok) throw Object.assign(new Error('Yerel denemede servis kapalı'), { kapali: true });
  const h = { ...(await kimlik()) };
  let body;
  if (govde !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(govde); }
  const ac = new AbortController(), zt = setTimeout(() => ac.abort(), sure);
  try {
    const r = await fetch(kok + yol, { method, headers: h, body, signal: ac.signal, credentials: 'omit' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw Object.assign(new Error(j.hata || 'Servis hatası (' + r.status + ')'), { durum: r.status, kurulu: j.kurulu, kullanici: j.hata });
    return j;
  } finally { clearTimeout(zt); }
}
// Akışlı istek (text/event-stream): { d } parçaları onParca'ya, { son } sonuç, { hata } hata. Sunucu akış yerine düz JSON dönerse
// (önbellekteki cevap, doğrulama hatası, eski worker) o kullanılır.
async function apiAkis(yol, govde, onParca, sure = 60000) {
  const kok = apiKok();
  if (!kok) throw Object.assign(new Error('Yerel denemede servis kapalı'), { kapali: true });
  const h = { ...(await kimlik()), 'Content-Type': 'application/json' };
  const ac = new AbortController(), zt = setTimeout(() => ac.abort(), sure);
  try {
    const r = await fetch(kok + yol, { method: 'POST', headers: h, body: JSON.stringify({ ...govde, akis: true }), signal: ac.signal, credentials: 'omit' });
    if (!/event-stream/.test(r.headers.get('Content-Type') || '') || !r.body || typeof TextDecoderStream === 'undefined') {
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw Object.assign(new Error(j.hata || 'Servis hatası (' + r.status + ')'), { durum: r.status, kurulu: j.kurulu, kullanici: j.hata });
      return j;
    }
    const okur = r.body.pipeThrough(new TextDecoderStream()).getReader();
    let tampon = '', son = null;
    for (;;) {
      const { value, done } = await okur.read(); if (done) break;
      tampon += value; let i;
      while ((i = tampon.indexOf('\n\n')) >= 0) {
        const ev = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (!ev.startsWith('data: ')) continue;
        let o; try { o = JSON.parse(ev.slice(6)); } catch (x) { continue; }
        if (typeof o.d === 'string') onParca(o.d);
        else if (o.son) son = o.son;
        else if (o.hata) throw Object.assign(new Error(o.hata), { durum: o.s || 502, kullanici: o.hata });
      }
    }
    if (!son) throw Object.assign(new Error('Cevap yarıda kesildi'), { durum: 502 });
    return son;
  } finally { clearTimeout(zt); }
}
// Akan JSON'dan "kisa" alanının o ana kadar gelen kısmı (yarım kaçış dizileri atılır)
export function kisaKismi(t) {
  const m = String(t || '').match(/"kisa"\s*:\s*"((?:[^"\\]|\\.)*)/); if (!m) return '';
  return m[1].replace(/\\u([0-9a-fA-F]{4})/g, (x, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\u[0-9a-fA-F]{0,3}$|\\$/, '').replace(/\\n/g, ' ').replace(/\\(.)/g, '$1').replace(/\s*\[\d+(?:,\s*\d+)*\]?/g, '');
}
// Sorgu vektörü: aynı sorgu bir kez sorulur; servis hata verirse bir dakika denenmez (her aramada bekleme olmasın)
async function gom(metin) {
  const m = String(metin).slice(0, 400);
  if (gomOnbellek.has(m)) return gomOnbellek.get(m);
  if (Date.now() - durum.gomKapali < 60e3) throw new Error('kapalı');
  try {
    const j = await api('/mevzuat/gom', { method: 'POST', govde: { metin: m }, sure: 6000 });
    const v = base64Int8(j.v);
    if (gomOnbellek.size > 100) gomOnbellek.clear();
    gomOnbellek.set(m, v);
    return v;
  } catch (x) { durum.gomKapali = Date.now() - (x && x.name === 'AbortError' ? 45e3 : 0); throw x; }  // tek yavaş cevapta 15 sn, servis hatasında 60 sn denenmez
}
const personel = () => S._bulut && ['mudur', 'sekreter'].includes(oturum.kullanici && oturum.kullanici.rol);
const mudur = () => oturum.kullanici && oturum.kullanici.rol === 'mudur';

// Kursun yazıları: liste ve (aramaya katmak için) bütün parçalar + vektörler
async function kursListesi(zorla = false) {
  if (!personel()) return [];
  if (durum.kursListe && !zorla) return durum.kursListe;
  try { const j = await api('/mevzuat/belgeler'); durum.kursListe = j.liste || []; durum.kursHata = ''; }
  catch (x) { durum.kursHata = x.kapali ? 'Yerel denemede kurs belgeleri servisi kapalı.' : 'Kursun belgelerine şu an ulaşılamadı.'; durum.kursListe = durum.kursListe || []; }
  return durum.kursListe;
}
async function kursKumesi() {
  if (!personel() || durum.kursHepsi) return;
  const l = await kursListesi();
  if (!l.length) { motor.kursSil(); return; }
  try { const j = await api('/mevzuat/hepsi', { sure: 25000 }); durum.kursHepsi = j; motor.kursKur(j, l); } catch (x) { /* kurs belgeleri aramaya katılmaz; ortak derlem yine aranır */ }
}
const kursYenile = async () => { durum.kursHepsi = null; motor.kursSil(); durum.son = null; await kursListesi(true); };

/* ---------- platformun ortak eklemeleri: yeni belgeler, belge durumları, duyurular (worker /mevzuat/ortak, herkese açık) ---------- */
async function ortakEkYukle() {
  try {
    const j = await api('/mevzuat/ortak', { sure: 8000 });
    durum.ortak = { belgeler: j.belgeler || [], durum: j.durum || {}, duyurular: j.duyurular || [], sss: j.sss || { kayitlar: [], gizli: [] } };
    motor.durumKur(durum.ortak.durum); motor.sssGizle(durum.ortak.sss.gizli);
    if (durum.ortak.belgeler.length || durum.ortak.sss.kayitlar.length) { const h = await api('/mevzuat/ortak/hepsi', { sure: 20000 }); motor.ekKur(h, durum.ortak.belgeler, durum.ortak.sss); }
  } catch (x) { durum.ortak = durum.ortak || { belgeler: [], durum: {}, duyurular: [], hata: true }; }
}
// duyurular: en yeni 3'ü gösterilir; görülmeyenler "yeni" sayılır (bu cihazda son görülen duyuru)
const GORDU = 'sinyal-mevzuat-duyuru';
const sonGorulen = () => { try { return localStorage.getItem(GORDU) || ''; } catch (x) { return ''; } };

/* ---------- yardımcılar ---------- */
const hashQ = () => { const h = location.hash.split('?')[1] || ''; try { return new URLSearchParams(h).get('q') || ''; } catch (x) { return ''; } };
const hashYaz = q => { const h = '#/mevzuat' + (q ? '?q=' + encodeURIComponent(q) : ''); if (location.hash !== h) try { history.replaceState(null, '', h); } catch (x) { } };
const vurguHtml = (a) => (a.bastaKesik ? '… ' : '') + a.parcalar.map(p => p.m ? `<mark>${e(p.t)}</mark>` : e(p.t)).join('') + (a.sondaKesik ? ' …' : '');
// yapay zekâya giden etiket: platformun "değişti/kalktı" işareti etikete yazılır ki cevap eski hükmü güncelmiş gibi aktarmasın
const DURUM_AD = { degisti: 'Değişti', kalkti: 'Yürürlükten kalktı', taslak: 'Taslak, yürürlükte değil' };
const durumNotu = d => d ? DURUM_AD[d.durum] + (d.not ? ': ' + d.not : '') + (d.yerine ? ' (yerine: ' + belgeAdi(d.yerine) + ')' : '') : '';
const belgeAdi = id => { for (const k of [motor.kume.ortak, motor.kume.ek]) { const b = k && k.belgeler.find(x => x.id === id); if (b) return b.kisa || b.ad || id; } return id; };
const etiket = s => `${s.belge.kisa || s.belge.ad || 'Belge'}${s.parca.m ? ' ' + s.parca.m : ''}${s.kaynak === 'ek' ? ' (mdSinyal\'e ' + tarihYaz(String(s.belge.eklenme || '').slice(0, 10)) + ' eklendi' + (s.belge.tarih ? ', belge tarihi ' + tarihYaz(s.belge.tarih) : '') + ')' : ''}${s.durum ? ' [DİKKAT: ' + durumNotu(s.durum) + ']' : ''}`;
const yeniMi = b => b && b.eklenme && Date.now() - Date.parse(b.eklenme) < 60 * 864e5;
// mdSinyal'in açıklama metinleri (rehber, sık sorulanlar) rozetle ayrılır; resmî metin değildir
const resmiRozet = b => !resmiDegil(b) ? '' : b.tur === 'sss' ? rozet('Sık sorulan', 'sari') : rozet('mdSinyal rehberi · resmî metin değil', 'sari');
// Metindeki [MTSK md.7/3] gibi dayanak etiketleri: derlemde bulunanlar tıklanır, o maddeyi açar ([Uygulama: …] düz kalır)
function etiketliHtml(t, kokSet, uzunluk = 1e6) {
  const kume = motor.kume.ortak; let o = '', son = 0;
  const duz = x => x ? vurguHtml(alinti(x, kokSet, uzunluk)) : '';
  for (const m of String(t || '').matchAll(ETIKET_RE)) {
    o += duz(t.slice(son, m.index)); son = m.index + m[0].length;
    const i = etiketBul(kume, etiketCoz(m[1]));
    o += i >= 0 ? `<button type="button" class="mz-dayanak" data-mz-etiket="${i}" title="Maddeyi aç">${e(m[0])}</button>` : `<span class="mz-dayanak-duz">${e(m[0])}</span>`;
  }
  return (o + duz(t.slice(son))).replace(/\n/g, '<br>');  // bent ve tablo satırları alt alta
}
const dayanakDugme = d => { const i = etiketBul(motor.kume.ortak, { belge: d.belge, m: d.m, fikra: d.f ? parseInt(String(d.f).split('/').pop(), 10) : null }); if (i < 0) return ''; const p = motor.kume.ortak.parcalar[i], b = motor.kume.ortak.belgeler[p.b]; return `<button type="button" class="mz-dayanak" data-mz-etiket="${i}">${e((b.kisa || b.ad) + ' · ' + d.m + (d.f && String(d.f).includes('/') ? ', fıkra ' + String(d.f).split('/').pop() : ''))}</button>`; };
const NEDEN = { madde: ['Madde no', 'madde'], kelime: ['Kelime', 'kelime'], anlam: ['Anlamca yakın', 'anlam'], ikisi: ['Kelime ve anlam', 'ikisi'] };
const kuralBag = l => (l && l.length) ? `<a class="mz-kural" href="#/meb/kontrol">${isaret('uyari', 16)}<span>mdSinyal’de bu maddeye bağlı uyarı: ${l.map(e).join(', ')}</span></a>` : '';
const tarihYaz = s => s ? tamTarih(s) : '';
// Özetten "Kursun yapması gerekenler" bölümünü ayırır (worker özeti bu başlıkla ya da "Yapılacaklar:" ile verir)
export function ozetBol(ozet) {
  const m = String(ozet || '');
  const r = m.match(/(?:^|\n)\s*(?:\*\*|#+\s*)?(kursun yapması gerekenler|kursa düşen işler|yapılacaklar|yapılması gerekenler)\s*(?:\*\*)?\s*:?\s*(?:\*\*)?\s*\n?/i);
  if (!r) return { ozet: m.trim(), yapilacak: [] };
  const ust = m.slice(0, r.index).trim(), alt = m.slice(r.index + r[0].length);
  const yapilacak = alt.split('\n').map(x => x.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, '').trim()).filter(Boolean);
  return { ozet: ust, yapilacak };
}
const paragraf = m => String(m || '').split(/\n{2,}|\n(?=\s*[-•*])/).map(x => x.trim()).filter(Boolean).map(x => `<p>${e(x).replace(/\n/g, '<br>')}</p>`).join('');

/* ---------- sekmeler ---------- */
// Sor (asistan ve dayanaklar) · Konular (kayıttan sertifikaya konu haritası) · Güncel (duyurular, yaklaşan yürürlükler) · Belgeler · Kaydettiklerim
const SEKMELER = [['sor', 'Sor', 'robot'], ['konular', 'Konular', 'teorik'], ['guncel', 'Güncel', 'uyari'], ['belgeler', 'Belgeler', 'belge'], ['kayit', 'Kaydettiklerim', 'yildiz']];
function sekmeSayi(k) {
  if (k === 'guncel') { const l = (durum.ortak && durum.ortak.duyurular) || [], g = sonGorulen(); return l.filter(x => !g || x.id > g).length; }
  if (k === 'kayit') return (durum.fav || []).filter(x => motor.durum[x.b]).length;
  return 0;
}
const sekmelerHtml = () => SEKMELER.map(([k, a, i]) => { const n = sekmeSayi(k); return `<button type="button" role="tab" class="mz-sekme${durum.sekme === k ? ' secili' : ''}" aria-selected="${durum.sekme === k}" data-mz-sekme="${k}">${ik(i)}<span>${a}</span>${n ? `<em>${n}</em>` : ''}</button>`; }).join('');
function sekmeSec(k, ad) {
  durum.sekme = ad;
  k.querySelectorAll('[data-mz-panel]').forEach(p => { p.hidden = p.dataset.mzPanel !== ad; });
  if (ad === 'guncel') { guncelCiz(k); try { const l = (durum.ortak && durum.ortak.duyurular) || []; if (l.length) localStorage.setItem(GORDU, l[0].id); } catch (x) { } }
  if (ad === 'konular') { const y = k.querySelector('[data-mz-harita]'); if (y) y.innerHTML = konuHaritasi() || `<div class="kart mz-bekle">${isaret('bilgi', 22)}<span>Konular yükleniyor…</span></div>`; }
  if (ad === 'kayit') kayitCiz(k);
  const n = k.querySelector('[data-mz-sekmeler]'); if (n) n.innerHTML = sekmelerHtml();
}

/* ---------- ekran ---------- */
export function mevzuat() {
  const q = hashQ();
  if (q && q !== durum.q) { durum.q = q; durum.son = null; durum.cevap = null; }
  return {
    baslik: 'Mevzuat asistanı',
    alt: 'Yönetmelik, kılavuz ve MEB yazılarından dayanağıyla cevap',
    // data-resmi: mevzuat ve yazı metinleri yönetmelikteki dille kalır (ui.js sadeDil 'kursiyer'i 'öğrenci' yapmaz)
    html: `<div class="mz" data-resmi>
      <section class="mz-hero">
        <form class="mz-ara" role="search" data-mz-form>
          <label class="mz-kutu">${ik('robot')}<input type="search" name="q" value="${e(durum.q)}" placeholder="Sorunuzu yazın: ör. A ehliyeti olan B almak isterse ne yapmalı?" aria-label="Sorunuzu yazın" autocomplete="off" enterkeyhint="send" maxlength="300"></label>
          <button class="dg dg-ana" type="submit">Sor</button>
        </form>
        <p class="mz-hero-alt" data-mz-hero-alt>Cevaplar resmî maddelere dayanır; her satırın kaynağını açıp okuyabilirsiniz.</p>
      </section>
      <nav class="mz-sekmeler" role="tablist" aria-label="Mevzuat bölümleri" data-mz-sekmeler>${sekmelerHtml()}</nav>
      <div class="mz-panel" data-mz-panel="sor" ${durum.sekme === 'sor' ? '' : 'hidden'}>
        <div class="mz-cipler" role="group" aria-label="Belge türü" data-mz-cipler ${durum.q ? '' : 'hidden'}>${FILTRELER.map(([k, t]) => `<button type="button" class="mz-cip ${k === durum.filtre ? 'secili' : ''}" aria-pressed="${k === durum.filtre}" data-mz-filtre="${k}">${e(t)}</button>`).join('')}</div>
        <div data-mz-sonuc aria-live="polite"></div>
      </div>
      <div class="mz-panel" data-mz-panel="konular" ${durum.sekme === 'konular' ? '' : 'hidden'}><div data-mz-harita></div></div>
      <div class="mz-panel" data-mz-panel="guncel" ${durum.sekme === 'guncel' ? '' : 'hidden'}><div data-mz-guncel></div></div>
      <div class="mz-panel" data-mz-panel="belgeler" ${durum.sekme === 'belgeler' ? '' : 'hidden'}><div data-mz-kurs></div><div data-mz-ortak></div></div>
      <div class="mz-panel" data-mz-panel="kayit" ${durum.sekme === 'kayit' ? '' : 'hidden'}><div data-mz-kayit></div></div>
    </div>`,
    baglan: baglan,
  };
}

let zamanlayici = null;
function baglan(k) {
  const form = k.querySelector('[data-mz-form]'), inp = form.q;
  // gönderince asistan cevaplar (yapay zekâ); yazarken yalnız sonuçlar tazelenir
  form.addEventListener('submit', ev => { ev.preventDefault(); clearTimeout(zamanlayici); inp.blur(); if (durum.sekme !== 'sor') sekmeSec(k, 'sor'); aramaYap(k, inp.value, true, true); });
  k.addEventListener('submit', ev => { const f = ev.target.closest('[data-mz-geri-form]'); if (!f) return; ev.preventDefault(); geriGonder(k, false, f.not.value.trim().slice(0, 300)); });
  // yazarken yalnız kelime araması (anında), durunca anlamla birlikte
  inp.addEventListener('input', () => {
    if (durum.sekme !== 'sor') sekmeSec(k, 'sor');
    clearTimeout(zamanlayici);
    const v = inp.value;
    zamanlayici = setTimeout(() => { aramaYap(k, v, false); zamanlayici = setTimeout(() => aramaYap(k, v, true), 700); }, 250);
  });
  k.addEventListener('click', ev => {
    const t = ev.target;
    const f = t.closest('[data-mz-filtre]');
    if (f) { durum.filtre = f.dataset.mzFiltre; k.querySelectorAll('[data-mz-filtre]').forEach(b => { const s = b === f; b.classList.toggle('secili', s); b.setAttribute('aria-pressed', s); }); durum.son = null; durum.cevap = null; return aramaYap(k, inp.value, true); }
    const o = t.closest('[data-mz-ornek]'); if (o) { inp.value = o.dataset.mzOrnek; if (durum.sekme !== 'sor') sekmeSec(k, 'sor'); window.scrollTo({ top: 0, behavior: 'smooth' }); return aramaYap(k, inp.value, true, true); }
    const sk = t.closest('[data-mz-sekme]'); if (sk) return sekmeSec(k, sk.dataset.mzSekme);
    const fv = t.closest('[data-mz-fav-ac]'); if (fv) return favoriAc(fv.dataset.mzFavAc);
    const fs = t.closest('[data-mz-fav-sil]'); if (fs) return favoriYaz(k, { k: fs.dataset.mzFavSil, sil: true });
    const fn = t.closest('[data-mz-fav-not]'); if (fn) return favoriNot(k, fn.dataset.mzFavNot);
    const kv = t.closest('[data-mz-kavram]'); if (kv) return kavramAc(k, kv.dataset.mzKavram, inp);
    const eb = t.closest('[data-mz-ekbelge]'); if (eb) return ekBelgeAc(eb.dataset.mzEkbelge);
    const a = t.closest('[data-mz-ac]'); if (a) { const s = durum.son && durum.son.r.sonuc[+a.dataset.mzAc]; if (s) sonucAc(s); return; }
    if (t.closest('[data-mz-daha]')) { durum.goster += 15; return sonucCiz(k); }
    if (t.closest('[data-mz-sor]')) return asistanSor(k);
    if (t.closest('[data-mz-kopyala]')) return cevapKopyala();
    const gb = t.closest('[data-mz-geri]'); if (gb) { if (gb.dataset.mzGeri === 'evet') return geriGonder(k, true); durum.cevap.geri = 'hayir'; sonucCiz(k); const n = k.querySelector('#mz-geri-not'); if (n) n.focus(); return; }
    const g = t.closest('[data-mz-git]');
    if (g) { const n = +g.dataset.mzGit; if (n > durum.goster) { durum.goster = n; sonucCiz(k); } const c = k.querySelector(`[data-mz-kart="${n - 1}"]`); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.classList.remove('mz-parla'); void c.offsetWidth; c.classList.add('mz-parla'); } return; }
    if (t.closest('[data-mz-tekrar]')) { durum.yukHata = ''; return ilkYukleme(k); }
    if (t.closest('[data-mz-ekle]')) return belgeEklePenceresi(k);
    const kb = t.closest('[data-mz-kbelge]'); if (kb) return kursBelgesiAc(kb.dataset.mzKbelge, k);
    const et = t.closest('[data-mz-etiket]'); if (et) return maddeAc(+et.dataset.mzEtiket, new Set(durum.son ? durum.son.r.vurguKok || durum.son.r.kokler : []));
  });
  ilkYukleme(k);
}

async function ilkYukleme(k) {
  if (!yuklendi()) {
    k.querySelector('[data-mz-sonuc]').innerHTML = `<div class="kart mz-bekle">${isaret('bilgi', 22)}<span>Mevzuat yükleniyor…</span></div>`;
    try { await yukle(); } catch (x) {
      durum.yukHata = 'Mevzuat dosyası indirilemedi.';
      if (!k.isConnected) return;
      k.querySelector('[data-mz-sonuc]').innerHTML = `<div class="kart">${bos('Mevzuat yüklenemedi', 'İnternet bağlantınızı kontrol edip yeniden deneyin.', '<button class="dg dg-cizgi" type="button" data-mz-tekrar>Yeniden dene</button>')}</div>`;
      kursBolumu(k);
      return;
    }
  }
  if (!durum.kh) durum.kh = await kavramYukle();
  if (!durum.ortak) await ortakEkYukle();
  if (!k.isConnected) return;
  ortakBolumu(k); kursBolumu(k);
  { const n = k.querySelector('[data-mz-sekmeler]'); if (n) n.innerHTML = sekmelerHtml(); }
  if (durum.sekme !== 'sor') sekmeSec(k, durum.sekme);
  favoriYukle(k);
  if (durum.son && durum.son.q === durum.q && durum.son.filtre === durum.filtre) sonucCiz(k);
  else if (durum.q) aramaYap(k, durum.q, true, !durum.cevap);
  else sonucCiz(k);
  // her açılışta liste tazelenir (başka personelin eklediği/sildiği yazı görünsün); değiştiyse arama kümesi yeniden indirilir
  const onceki = (durum.kursListe || []).map(x => x.id).join();
  if (personel()) kursListesi(true).then(l => { if (l.map(x => x.id).join() !== onceki) { durum.kursHepsi = null; motor.kursSil(); durum.son = null; } if (k.isConnected) kursBolumu(k); return kursKumesi(); }).then(() => { if (k.isConnected && durum.q && durum.son && !durum.son.kurs && motor.kume.kurs) aramaYap(k, durum.q, true); }).catch(() => { });
}

let aramaNo = 0;
// Son sorular (yalnız bu cihazda, en çok 6; gizli pencerede ya da depolama kapalıysa tutulmaz)
const SON_ANAHTAR = 'sinyal-mevzuat-son';
const sonSorular = () => { try { const l = JSON.parse(localStorage.getItem(SON_ANAHTAR) || '[]'); return Array.isArray(l) ? l.filter(x => typeof x === 'string').slice(0, 6) : []; } catch (x) { return []; } };
const sonaEkle = q => { try { localStorage.setItem(SON_ANAHTAR, JSON.stringify([q, ...sonSorular().filter(x => x !== q)].slice(0, 6))); } catch (x) { } };
async function aramaYap(k, q, anlam, sor = false) {
  q = String(q || '').trim().slice(0, 300);
  if (q !== durum.q) durum.cevap = null;
  durum.q = q; hashYaz(q); durum.goster = 15;
  if (!yuklendi()) return;
  if (!q) { durum.son = null; return sonucCiz(k); }
  if (sor) sonaEkle(q);
  const no = ++aramaNo;
  // asistan araması: soru + kavramın resmî terimli araması + kavramın dayanak maddeleri + sınıf geçişi tablosu (js/mevzuat-anla.js)
  const r = await asistanAra(motor, q, { filtre: durum.filtre, n: 40, gom: anlam ? gom : null, kh: durum.kh });
  if (no !== aramaNo || !k.isConnected) return;
  // yazarken (anlamsız) arama, aynı sorgunun anlamlı sonucunu ezmesin
  if (!anlam && durum.son && durum.son.q === q && durum.son.anlam) return;
  if (sor && durum.cevap && durum.cevap.q === q && durum.cevap.filtre === durum.filtre && (durum.cevap.bekliyor || durum.cevap.yanit)) sor = false;
  if (!(durum.son && durum.son.q === q && durum.son.llm)) durum.son = { q, filtre: durum.filtre, r, anlam, kurs: !!motor.kume.kurs };
  sonucCiz(k);
  if (sor) asistanSor(k);
}

// Fotoğrafı uzun kenarı en çok 2000 px olacak şekilde JPEG'e çevirir; 1,4 MB altına inene kadar kaliteyi düşürür
async function resimKucult(dosya) {
  const url = URL.createObjectURL(dosya);
  try {
    const img = await new Promise((ok, red) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => red(new Error('Fotoğraf açılamadı')); i.src = url; });
    const o = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * o); c.height = Math.round(img.naturalHeight * o);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    let bl = null;
    for (const q of [0.85, 0.75, 0.65, 0.55]) { bl = await new Promise(ok => c.toBlob(ok, 'image/jpeg', q)); if (bl && bl.size < 1.4e6) break; }
    return bl || dosya;
  } finally { URL.revokeObjectURL(url); }
}

function sonucCiz(k) {
  const yer = k.querySelector('[data-mz-sonuc]'); if (!yer) return;
  if (!durum.q) {
    const son = sonSorular();
    const yeni = sekmeSayi('guncel'), kh = durum.kh;
    yer.innerHTML = `${yeni ? `<button type="button" class="mz-tanitim" data-mz-sekme="guncel">${isaret('bilgi', 20)}<span><b>${yeni} yeni mevzuat değişikliği</b><small>${e(((durum.ortak.duyurular || [])[0] || {}).baslik || '')}</small></span>${ik('sag')}</button>` : ''}
      ${son.length ? `<div class="mz-ornekler"><span>Son sorularınız</span>${son.map(o => `<button type="button" class="mz-ornek mz-son" data-mz-ornek="${e(o)}">${e(o)}</button>`).join('')}</div>` : ''}
      <div class="mz-ornekler"><span>Örnek sorular</span>${ORNEKLER.map(o => `<button type="button" class="mz-ornek" data-mz-ornek="${e(o)}">${e(o)}</button>`).join('')}</div>
      ${kh ? `<div class="mz-ornekler"><span>Sık bakılan konular</span>${['r25', 'r22', 'r14', 'r26', 'r27', 'r13'].map(id => kh.harita.get(id)).filter(Boolean).map(x => `<button type="button" class="mz-ornek mz-konu-kisa" data-mz-kavram="${e(x.id)}">${e(x.ad)}</button>`).join('')}<button type="button" class="mz-tumu" data-mz-sekme="konular">Bütün konular ${ik('sag')}</button></div>` : ''}`;
    return;
  }
  if (!durum.son) { yer.innerHTML = `<div class="kart mz-bekle">${isaret('bilgi', 22)}<span>Aranıyor…</span></div>`; return; }
  { const c = k.querySelector('[data-mz-cipler]'); if (c) c.hidden = false; }
  const { r } = durum.son, l = r.sonuc;
  const not = r.anlamKapali && durum.son.anlam ? ' · anlam araması şu an kapalı, yalnız kelimeyle arandı' : '';
  const maddeNot = r.maddeYok ? `<p class="mz-not">Aradığınız madde bu derlemde yok: madde numarası hatalı olabilir ya da o bölüm sürücü kurslarıyla ilgisi olmadığı için alınmadı. ${l.length ? 'Aşağıda kelimeyle bulunanlar var.' : ''}</p>` : '';
  if (!l.length) {
    yer.innerHTML = `<div class="kart">${bos('Sonuç bulunamadı', durum.filtre !== 'hepsi' ? 'Bu türde eşleşen belge yok. “Hepsi”ni seçip yeniden deneyin.' : 'Başka kelimelerle deneyin; madde numarasıyla da arayabilirsiniz: “MTSK madde 15”.')}</div>${maddeNot}${not ? `<p class="mz-not">${e(not.slice(3))}</p>` : ''}`;
    return;
  }
  const kokSet = new Set(r.vurguKok || r.kokler);
  const kart = (s, i) => {
    const [nd, ns] = NEDEN[s.neden] || NEDEN.kelime;
    const sss = s.parca.sss;
    const a = alinti(sss ? sss.kisa : s.parca.t, kokSet, 300);
    return `<li class="mz-sonuc${resmiDegil(s.belge) ? ' mz-resmi-degil' : ''}" data-mz-kart="${i}">
      <div class="mz-ust"><span class="mz-sira">${i + 1}</span><b class="mz-belge">${e(s.belge.kisa || s.belge.ad)}</b>${s.parca.m && !sss ? rozet(s.parca.m, 'mavi') : ''}${resmiRozet(s.belge)}${s.kaynak === 'kurs' ? rozet('Kursumuza gelen', 'uyari') : ''}${s.kaynak === 'ek' && yeniMi(s.belge) ? rozet('Yeni eklendi', 'yesil') : ''}${s.durum ? rozet(DURUM_AD[s.durum.durum], 'kirmizi') : ''}<span class="mz-neden mz-n-${ns}" title="Neden bulundu">${e(nd)}</span></div>
      ${sss ? `<h4>${e(s.parca.m)}</h4>` : s.parca.baslik ? `<h4>${e(s.parca.baslik)}</h4>` : ''}
      <p class="mz-alinti">${vurguHtml(a)}</p>
      ${s.durum ? `<p class="mz-uyari-not mz-durum-not">${e(durumNotu(s.durum))}</p>` : ''}
      <div class="mz-alt">${kuralBag(s.parca.kural)}<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-ac="${i}">${s.kaynak === 'kurs' ? 'Yazıyı aç' : sss ? 'Cevabın tamamı' : resmiDegil(s.belge) ? 'Bölümü aç' : s.parca.m ? 'Maddeyi aç' : 'Metni aç'}</button></div>
    </li>`;
  };
  yer.innerHTML = `${maddeNot}${asistanKutusu(r, l)}
    <div class="mz-bilgi mz-kanit-bas"><b>Dayanaklar</b><span>${l.length} sonuç${e(not)}</span></div>
    <div class="kart"><ol class="mz-liste">${l.slice(0, durum.goster).map(kart).join('')}</ol>
    ${l.length > durum.goster ? `<div class="mz-daha"><button type="button" class="dg dg-hafif" data-mz-daha>${l.length - durum.goster} sonuç daha göster</button></div>` : ''}</div>`;
}

/* ---------- kısa cevap (sık sorulanlar) ---------- */
// İlk üç sonuçta bir sık sorulan soru varsa yapılandırılmış cevabı üstte gösterilir; dayanakları tıklanır
function kisaCevapHtml(p, kokSet = new Set()) {
  const c = p.sss;
  return `<div class="mz-kisa-ic">
    <p class="mz-kisa-soru">${e(p.m)}</p>
    <p class="mz-kisa-cevap">${e(c.kisa)}</p>
    ${c.ayrinti && c.ayrinti.length ? `<ul class="mz-kisa-ayrinti">${c.ayrinti.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}
    ${c.adimlar && c.adimlar.length ? `<h4 class="mz-ara-baslik">Adımlar</h4><ol class="mz-kisa-adim">${c.adimlar.map(x => `<li>${e(x)}</li>`).join('')}</ol>` : ''}
    ${c.dikkat ? `<p class="mz-uyari-not">${e(c.dikkat)}</p>` : ''}
    ${c.dayanak && c.dayanak.length ? `<div class="mz-kisa-dayanak"><span>Dayanak:</span>${c.dayanak.map(dayanakDugme).filter(Boolean).join('')}</div>` : ''}
  </div>`;
}
function kisaCevap(l, r = null) {
  const p = kisaCevapSec(l, durum.son && durum.son.r.kokler, durum.son && durum.son.q);
  if (!p) return '';
  // sınıf geçişi sorusunda hazır cevap aynı iki sınıfı anmalı ("A'dan B'ye" sorusuna "B'den C'ye" cevabı gösterilmez)
  if (r && r.gecis && !(new RegExp('(^|[^\\p{L}\\d])' + r.gecis.mevcut + '([^\\p{L}\\d]|$)', 'u').test(p.m) && new RegExp('(^|[^\\p{L}\\d])' + r.gecis.hedef + '([^\\p{L}\\d]|$)', 'u').test(p.m))) return '';
  return `<div class="mz-kisa">
    <div class="mz-kisa-bas">${isaret('bilgi', 20)}<b>Hazır cevap</b>${rozet('Sık sorulan', 'sari')}</div>
    ${kisaCevapHtml(p)}
    <p class="mz-cevap-not">mdSinyal'in hazırladığı cevap; resmî metin değildir. Dayanağa dokunup maddeyi okuyun, çelişkide resmî madde esastır.</p>
  </div>`;
}

/* ---------- yapay zekâya sor ---------- */
// kaynak numarası → sonuç kartı numarası ya da (atıfla eklenen, listede olmayan madde) { sira }: madde penceresi açılır
const atifDugme = (c, n) => {
  if (!(n >= 1 && n <= c.n)) return '';
  const h = c.harita ? c.harita[n - 1] : n, t = e(c.etiketler ? c.etiketler[n - 1] || '' : '');
  if (h && typeof h === 'object') return `<button type="button" class="mz-atif" data-mz-etiket="${h.sira}" aria-label="${n}. kaynak: ${t}" title="${t}">[${n}]</button>`;
  return h ? `<button type="button" class="mz-atif" data-mz-git="${h}" aria-label="${n}. kaynak: ${h}. sonuca git" title="${t}">[${n}]</button>` : '';
};
// metindeki [n] atıfları düğmeye döner, gerisi kaçışlı
const atifliHtml = (t, c) => e(t).replace(/\s*\[(\d{1,2})\]/g, (x, n) => atifDugme(c, +n) || x);  // atıftan önceki boşluk atılır: "zorunludur[1]."
// Kaynakta gör: cevap satırının dayandığı cümle ve rakam denetimi (tarayıcıda; js/mevzuat-anla.js kanitDenetle)
function kanitHtml(c, x) {
  if (!c.kaynakMetin || !x.kaynak || !x.kaynak.length) return '';
  const k = kanitDenetle(x.metin, x.kaynak.map(n => ({ no: n, t: c.kaynakMetin[n - 1] || '' })));
  // hesap (MEV-021): kaynaktaki rakamlardan yapılan işlem doğrulanır; tutmayan işlem uyarılır
  const yanlisH = (k.hesap || []).filter(h => !h.dogru), dogruH = (k.hesap || []).filter(h => h.dogru);
  const isaretH = yanlisH.length ? `<span class="mz-kanit-uyari">${ik('uyari')}Hesap tutmuyor: ${e(yanlisH.map(h => h.ifade).join('; '))}</span>` : k.eksik.length ? `<span class="mz-kanit-uyari">${ik('uyari')}${e(k.eksik.join(', '))} kaynakta geçmiyor; maddeyi okuyun</span>` : k.sayi ? `<span class="mz-kanit-ok">${ik('tik')}${dogruH.length ? 'Rakamlar kaynakta, hesap doğru' : 'Rakam kaynakta'}</span>` : '';
  return `<div class="mz-kanit">${isaretH}${k.cumle ? `<details><summary>Kaynakta gör</summary><blockquote>${e(k.cumle)}</blockquote><small>[${k.no}] ${e((c.etiketler || [])[k.no - 1] || '')}</small></details>` : ''}</div>`;
}
const cipler = (c, l) => { const h = (l || []).map(n => atifDugme(c, n)).join(''); return h ? `<span class="mz-atiflar">${h}</span>` : ''; };
function cevapGovde(c) {
  const y = c.yanit;
  if (y.duz) return `<div class="mz-cevap-metin">${paragraf(y.kisa).replace(/\[(\d{1,2})\]/g, (x, n) => atifDugme(c, +n) || x)}</div>`;
  return `<div class="mz-cevap-yap">
    <p class="mz-cevap-kisa${y.bulunamadi ? ' yok' : ''}">${atifliHtml(y.kisa, c)}</p>
    ${(() => { if (!c.kaynakMetin || y.bulunamadi) return ''; const tum = new Set(c.kaynakMetin.flatMap(t => sayilarBul(t, true)).concat(sayilarBul(c.q, true))), eksik = kaynaktaOlmayan(y.kisa, tum).eksik; return eksik.length ? `<p class="mz-kanit-uyari">${ik('uyari')}${e(eksik.join(', '))} gönderilen maddelerde geçmiyor; dayanağı okuyarak kontrol edin.</p>` : ''; })()}
    ${y.ayrinti.length ? (y.ayrinti.some(x => x.soru)
      ? `<dl class="mz-cevap-sorular">${y.ayrinti.map(x => `<div>${x.soru ? `<dt>${e(x.soru)}</dt>` : ''}<dd><span>${atifliHtml(x.metin, c)}</span>${cipler(c, x.kaynak)}${kanitHtml(c, x)}</dd></div>`).join('')}</dl>`
      : `<h4 class="mz-ara-baslik">Ayrıntılar</h4><ul class="mz-cevap-ayrinti">${y.ayrinti.map(x => `<li><span>${atifliHtml(x.metin, c)}</span>${cipler(c, x.kaynak)}${kanitHtml(c, x)}</li>`).join('')}</ul>`) : ''}
    ${y.adimlar.length ? `<h4 class="mz-ara-baslik">Adım adım</h4><ol class="mz-cevap-adim">${y.adimlar.map(x => `<li><span>${atifliHtml(x.metin, c)}</span>${cipler(c, x.kaynak)}${kanitHtml(c, x)}</li>`).join('')}</ol>` : ''}
    ${y.dikkat ? `<p class="mz-uyari-not">${atifliHtml(y.dikkat, c)}</p>` : ''}
    ${y.eksik ? `<p class="mz-eksik"><b>Kaynaklarda yok:</b> ${atifliHtml(y.eksik, c)}</p>` : ''}
  </div>`;
}
// Konu çipleri (sorunun değdiği kavramlar): dokununca rehber bölümü açılır
const konuCipleri = r => { const l = (r.kavramlar || []).filter(x => x.rehber); return l.length ? `<div class="mz-konular-cip"><span>Konu:</span>${l.map(x => `<button type="button" class="mz-konu-cip" data-mz-kavram="${e(x.id)}">${e(x.ad)}</button>`).join('')}</div>` : ''; };
// Sınıf geçişi: MTSK md.39 tablosundan kesin ders saati (yapay zekâsız)
function hizliBilgi(r) {
  const f = r.fark, g = r.gecis; if (!f || !g) return '';
  const metin = f.saat != null
    ? `${g.mevcut} belgesi olan kişi ${g.hedef} sertifikası için akan trafikte <b>${f.saat} saat</b> direksiyon eğitimi dersi alır.`
    : `MTSK md.39 ${f.tablo}’de ${g.mevcut} belgesinden ${g.hedef} sınıfına geçiş için ders saati yazmıyor.`;
  return `<div class="mz-hizli">${isaret('tamam', 20)}<div><p>${metin}</p><small>${f.tablo === 'Tablo 2' ? 'Eski tip (KTY geçici 10. madde kapsamındaki) belgeler için Tablo 2.' : 'Eski tip belge sahibiyse süre Tablo 2’ye göre farklı olabilir.'} Yaş ve deneyim şartı ayrıca aranır.</small>
    <div class="mz-kisa-dayanak"><span>Dayanak:</span><button type="button" class="mz-dayanak" data-mz-etiket="${f.i}">MTSK Yönetmeliği · Madde 39, ${e(f.tablo)}</button></div></div></div>`;
}
const ASAMA_AD = { topla: 'İlgili maddeler toplanıyor', cevap: 'Maddeler okunuyor, cevap yazılıyor' };
function asistanKutusu(r, l) {
  const c = durum.cevap && durum.cevap.q === durum.q && durum.cevap.filtre === durum.filtre ? durum.cevap : null;
  const pasif = demo() ? 'Yapay zekâ cevabı gerçek kursta açılır. Aşağıda dayanak maddeler ve hazır cevaplar var.' : durum.llmYok ? 'Yapay zekâ henüz bağlı değil; aşağıdaki maddelerden okuyabilirsiniz.' : '';
  let govde = '';
  if (c && c.bekliyor) {
    const sira = ['topla', 'cevap'], n = sira.indexOf(c.asama);
    const akan = c.asama === 'cevap' ? kisaKismi(c.akan) : '';
    govde = `${akan ? `<p class="mz-cevap-kisa mz-akiyor" data-mz-akis>${e(akan)}</p>` : `<p class="mz-cevap-kisa mz-akiyor" data-mz-akis hidden></p>`}<ol class="mz-adimlar" aria-live="polite">${sira.map((x, i) => `<li class="${i < n ? 'bitti' : i === n ? 'simdi' : ''}">${e(ASAMA_AD[x])}${x === 'cevap' && c.n ? ` <small>(${c.n} madde)</small>` : ''}</li>`).join('')}</ol>`;
  } else if (c && c.hata) govde = `<p class="mz-cevap-hata">${e(c.hata)}</p>`;
  else if (c && c.yanit) govde = `${cevapGovde(c)}
    <div class="mz-cevap-alt"><p class="mz-cevap-not">Cevap yalnız köşeli parantezdeki maddelere dayanır; kesin karar için il milli eğitim müdürlüğüne danışın.</p><div class="mz-cevap-dg"><button type="button" class="dg dg-cizgi dg-kucuk" data-mz-kopyala>Kopyala</button><a class="dg dg-cizgi dg-kucuk" href="${e(paylasUrl(c))}" target="_blank" rel="noopener">${ik('wp')}Paylaş</a></div></div>
    ${geriBildirim(c)}`;
  else if (pasif) govde = `<p class="mz-cevap-not mz-pasif">${e(pasif)}</p>`;
  const dugme = !pasif && !(c && c.bekliyor) ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-sor>${c && (c.yanit || c.hata) ? 'Yeniden sor' : 'Cevapla'}</button>` : '';
  return `<section class="mz-asistan${c && c.yanit ? ' dolu' : ''}${c && c.bekliyor ? ' calisiyor' : ''}" aria-label="Asistanın cevabı">
    <div class="mz-asistan-bas"><span class="mz-asistan-ik">${ik('robot')}</span><div><b>Asistan</b><small>${c && c.konu ? e(c.konu) : 'Mevzuattan dayanağıyla cevap'}</small></div>${dugme}</div>
    ${konuCipleri(r)}
    ${hizliBilgi(r)}
    ${govde}
    ${c && (c.yanit || c.bekliyor) ? '' : kisaCevap(l, r)}
    ${ilgiliSorular(l)}
  </section>`;
}
// WhatsApp'ta paylaş: kişi seçimi WhatsApp'ta yapılır; metin mevzuat dilinde kalır (sadeDil uygulanmaz), 3.500 karakterde kesilir
const paylasUrl = c => { let t = 'Soru: ' + c.q + '\n\n' + cevapDuzMetin(c.yanit, c.etiketler) + '\n\nmdSinyal mevzuat asistanı'; if (t.length > 3500) t = t.slice(0, 3490) + '…'; return 'https://wa.me/?text=' + encodeURIComponent(t); };
function cevapKopyala() {
  const c = durum.cevap; if (!c || !c.yanit) return;
  const t = cevapDuzMetin(c.yanit, c.etiketler);
  const ok = () => bildir('Cevap kopyalandı');
  // pano izni yoksa (eski tarayıcı, gömülü görünüm) seçip kopyalama denenir
  const yedek = () => { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(a); a.select(); let b = false; try { b = document.execCommand('copy'); } catch (x) { } a.remove(); b ? ok() : bildir('Kopyalanamadı; metni seçip kopyalayın', 'uyari'); };
  try { navigator.clipboard.writeText(t).then(ok, yedek); } catch (x) { yedek(); }
}
// Asistan: 1) arama (soru + kavram haritası + sınıf geçişi tablosu) zaten yapıldı, 2) en çok 10 madde (+ atıf yaptıkları maddeler) seçilir,
// 3) /mevzuat/cevapla yalnız bu maddelere dayanarak cevaplar. Yapay zekâyla soruyu ayrıca yeniden yazma (/mevzuat/anla) ölçümde cevabı
// iyileştirmedi (ornek-30: dayanak %93,1 iki düzende de) ama süreyi ~11 sn'den ~21 sn'ye çıkardı; bu yüzden kullanılmıyor.
async function asistanSor(k) {
  if (demo() || durum.llmYok || !durum.son || !durum.q) return;
  const q = durum.q, filtre = durum.filtre, r = durum.son.r;
  const c = durum.cevap = { q, filtre, asama: 'topla', bekliyor: true };
  const guncel = () => durum.cevap === c && k.isConnected;
  const bitir = hata => { c.bekliyor = false; if (hata) c.hata = hata; if (guncel()) sonucCiz(k); };
  const secilen = asistanKaynak(motor, r, { etiket, ...KAYNAK_AYAR });
  if (!secilen.length) return bitir('Bu soruyla ilgili madde bulunamadı. Soruyu başka kelimelerle yazmayı deneyin.');
  const kaynaklar = secilen.map(x => ({ etiket: x.etiket, t: x.t, ...(x.resmi === false ? { resmi: false } : {}) }));
  Object.assign(c, { kaynakMetin: kaynaklar.map(x => x.t), asama: 'cevap', n: kaynaklar.length, harita: secilen.map(x => (x.i >= 0 ? x.i + 1 : { sira: x.sira })), etiketler: kaynaklar.map(x => x.etiket) });
  sonucCiz(k);
  // geçici hata (502, ağ kopması, zaman aşımı) bir kez yeniden denenir; 429/503/4xx denenmez
  // cevap akarak gelir: kısa cevap yazıldıkça kutuya düşer (bütün sayfa yeniden çizilmez)
  const parca = d => { c.akan = (c.akan || '') + d; if (!guncel()) return; const el = k.querySelector('[data-mz-akis]'); if (!el) return; const t = kisaKismi(c.akan); if (t) { el.hidden = false; el.textContent = t; } };
  const sor = () => { c.akan = ''; return apiAkis('/mevzuat/cevapla', { soru: asistanSoru(q, r), kaynaklar }, parca); };
  try { let j; try { j = await sor(); } catch (x) { if (!(x.durum >= 500 && x.durum !== 503) && x.durum) throw x; if (x.kapali) throw x; await new Promise(z => setTimeout(z, 1500)); if (!guncel()) return; j = await sor(); } c.yanit = cevapNormalle(j); bitir(); }
  catch (x) {
    if (x.durum === 503 || x.kurulu === false) { durum.llmYok = true; return bitir('Yapay zekâ henüz bağlı değil; aşağıdaki maddelerden okuyabilirsiniz.'); }
    bitir(x.kapali ? 'Yerel denemede yapay zekâ servisi kapalı.' : x.durum === 429 && x.kullanici ? x.kullanici : 'Cevap alınamadı; biraz sonra yeniden deneyin.');
  }
}

// Geri bildirim: "işinize yaradı mı?" (personel; soru, cevap ve kaynak etiketleri mdSinyal'e iletilir, TC/telefon worker'da silinir)
function geriBildirim(c) {
  if (c.geri === 'gitti') return `<p class="mz-geri-tamam">${ik('tik')}Teşekkürler, iletildi.</p>`;
  if (c.geri === 'hayir') return `<form class="mz-geri" data-mz-geri-form><label for="mz-geri-not">Ne eksik ya da yanlış? (isteğe bağlı)</label><textarea id="mz-geri-not" name="not" rows="2" maxlength="300" placeholder="Ör. il MEM 2 saat değil 4 saat istiyor"></textarea><div class="mz-geri-alt"><small>Sorunuz ve cevap, iyileştirme için mdSinyal'e iletilir. Kişisel bilgi yazmayın.</small><button type="submit" class="dg dg-ana dg-kucuk">Gönder</button></div></form>`;
  return `<div class="mz-geri"><span>Bu cevap işinize yaradı mı?</span><button type="button" class="dg dg-cizgi dg-kucuk" data-mz-geri="evet">${ik('tik')}Evet</button><button type="button" class="dg dg-cizgi dg-kucuk" data-mz-geri="hayir">Eksik ya da yanlış</button></div>`;
}
async function geriGonder(k, iyi, not = '') {
  const c = durum.cevap; if (!c || !c.yanit || c.geri === 'gitti') return;
  c.geri = 'gitti'; sonucCiz(k);
  try { await api('/mevzuat/geri', { method: 'POST', govde: { soru: c.q, iyi, not, kaynaklar: c.etiketler || [], cevap: c.yanit.kisa } }); }
  catch (x) { /* geri bildirim kaybolursa kullanıcıyı yormayız */ }
}
// İlgili sorular: sonuçlardaki sık sorulanlardan (gösterilen hazır cevap dışında) en çok 4; dokununca o soru sorulur
function ilgiliSorular(l) {
  const gor = new Set(), q = durum.q.toLocaleLowerCase('tr-TR');
  const s = l.filter(x => x.parca.sss && (x.kaynak === 'ortak' || x.kaynak === 'ek')).map(x => x.parca.m).filter(m => m && m.toLocaleLowerCase('tr-TR') !== q && !gor.has(m) && gor.add(m)).slice(0, 4);
  return s.length ? `<div class="mz-ilgili-sorular"><span>İlgili sorular</span>${s.map(m => `<button type="button" class="mz-ornek" data-mz-ornek="${e(m)}">${e(m)}</button>`).join('')}</div>` : '';
}

/* ---------- Güncel: duyurular ve yaklaşan yürürlükler ---------- */
const gunFarki = t => Math.round((Date.parse(t + 'T12:00:00') - Date.parse(new Date().toISOString().slice(0, 10) + 'T12:00:00')) / 864e5);
const duyuruHtml = x => `<article class="mz-duyuru"><small>${e([tarihYaz(x.tarih), x.kimi ? 'İlgili: ' + x.kimi : '', x.yururluk ? 'Yürürlük: ' + tarihYaz(x.yururluk) : ''].filter(Boolean).join(' · '))}</small><b>${e(x.baslik)}</b>${x.metin ? `<p>${e(x.metin)}</p>` : ''}
  ${(x.yapilacaklar || []).length ? `<p class="mz-duyuru-et">Kursun yapması gerekenler</p><ul class="mz-yapilacak">${x.yapilacaklar.map(y => `<li>${e(y)}</li>`).join('')}</ul>` : ''}
  <div class="mz-duyuru-dg">${x.belge ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-ekbelge="${e(x.belge)}">Belgeyi aç</button>` : ''}${x.bag ? `<a class="dg-baglanti" href="${e(x.bag)}" target="_blank" rel="noopener">Resmî metni aç</a>` : ''}</div></article>`;
function guncelCiz(k) {
  const yer = k.querySelector('[data-mz-guncel]'); if (!yer) return;
  const l = (durum.ortak && durum.ortak.duyurular) || [], bugun = new Date().toISOString().slice(0, 10);
  const yaklasan = l.filter(x => x.yururluk && x.yururluk >= bugun).sort((a, b) => a.yururluk.localeCompare(b.yururluk));
  yer.innerHTML = `${yaklasan.length ? `<section class="mz-takvim" aria-label="Yaklaşan yürürlükler"><h3>Yaklaşan yürürlükler</h3><ol>${yaklasan.map(x => { const g = gunFarki(x.yururluk); return `<li><span class="mz-takvim-gun${g <= 30 ? ' yakin' : ''}"><b>${g === 0 ? 'Bugün' : g + ' gün'}</b><small>${e(tarihYaz(x.yururluk))}</small></span><span>${e(x.baslik)}</span></li>`; }).join('')}</ol></section>` : ''}
    ${l.length ? `<section class="mz-duyurular" aria-label="Mevzuat duyuruları"><div class="mz-duyuru-bas">${isaret('bilgi', 20)}<b>Güncel değişiklikler</b></div>${l.map(duyuruHtml).join('')}</section>`
      : `<div class="kart">${bos('Şu an duyuru yok', 'Mevzuatta sürücü kurslarını ilgilendiren bir değişiklik olduğunda burada ve bu sekmenin üstünde sayıyla görünür.')}</div>`}
    <p class="mz-not">Yeni yürürlüğe giren ve henüz taslak olan düzenlemeler: <button type="button" class="mz-dayanak" data-mz-kavram="r36">Rehber · Yaklaşan ve yeni değişiklikler</button></p>`;
}

/* ---------- Kaydettiklerim: kursun kaydettiği maddeler ve notları ---------- */
// Gerçek kursta worker'da (kurs başına, bütün personel görür); demoda yalnız bu oturumda. Kaydedilen madde sonradan "değişti/kalktı"
// diye işaretlenirse sekmede sayıyla ve satırda uyarıyla görünür.
async function favoriYukle(k) {
  if (!personel()) { durum.fav = durum.fav || []; return; }
  try { durum.fav = (await api('/mevzuat/favori')).liste || []; } catch (x) { durum.fav = durum.fav || []; }
  if (k.isConnected) { const n = k.querySelector('[data-mz-sekmeler]'); if (n) n.innerHTML = sekmelerHtml(); if (durum.sekme === 'kayit') kayitCiz(k); }
}
async function favoriYaz(k, x) {
  const anahtar = x.k || (x.b + '|' + x.m);
  if (personel()) { try { durum.fav = (await api('/mevzuat/favori', { method: 'POST', govde: x.k ? { b: anahtar.split('|')[0], m: anahtar.split('|').slice(1).join('|'), sil: true } : x })).liste || []; } catch (y) { return bildir(y.kullanici || 'Kaydedilemedi', 'uyari'), false; } }
  else {
    const l = (durum.fav || []).filter(y => y.k !== anahtar);
    durum.fav = x.sil ? l : [{ k: anahtar, b: x.b, m: x.m, ad: x.ad, not: x.not || '', tarih: new Date().toISOString().slice(0, 10) }, ...l];
  }
  if (k && k.isConnected) { const n = k.querySelector('[data-mz-sekmeler]'); if (n) n.innerHTML = sekmelerHtml(); if (durum.sekme === 'kayit') kayitCiz(k); }
  return true;
}
function favoriNot(k, anahtar) {
  const x = (durum.fav || []).find(y => y.k === anahtar); if (!x) return;
  pencere({ baslik: 'Not', korumali: false, icerik: `<div class="alan"><label for="mz-fav-not">${e(x.ad || x.m)}</label><textarea id="mz-fav-not" rows="4" maxlength="500" placeholder="Ör. İl MEM bu maddeyi şöyle uyguluyor…">${e(x.not || '')}</textarea></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-mz-not-kaydet>Kaydet</button>`,
    onAc: d => d.querySelector('[data-mz-not-kaydet]').addEventListener('click', async () => { const not = d.querySelector('textarea').value.trim(); if (await favoriYaz(k, { b: x.b, m: x.m, ad: x.ad, not })) { kapatPencere(); bildir('Not kaydedildi'); } }) });
}
function favoriAc(anahtar) {
  const [b, ...mm] = anahtar.split('|'), m = mm.join('|');
  for (const ad of ['ortak', 'taban']) {
    const kume = motor.kume[ad], bi = kume ? kume.belgeler.findIndex(x => x.id === b) : -1;
    const i = bi >= 0 ? kume.parcalar.findIndex(p => p.b === bi && (p.m || '') === m) : -1;
    if (i >= 0) return maddeAc(i, new Set(), ad);
  }
  if (motor.kume.ek && motor.kume.ek.belgeler.some(x => x.id === b)) return ekBelgeAc(b);
  bildir('Bu madde derlemde artık yok', 'uyari');
}
function kayitCiz(k) {
  const yer = k.querySelector('[data-mz-kayit]'); if (!yer) return;
  const l = durum.fav || [];
  if (!l.length) { yer.innerHTML = `<div class="kart">${bos('Kaydedilen madde yok', 'Bir maddeyi açıp “Kaydet”e dokunun; burada notunuzla birlikte durur. Madde değişirse burada uyarı görürsünüz.')}</div>`; return; }
  yer.innerHTML = `${!personel() ? '<p class="mz-not">Demoda kaydedilenler yalnız bu oturumda durur; gerçek kursta bütün personel görür.</p>' : ''}<div class="kart"><ul class="liste mz-kayit-liste">${l.map(x => { const d = motor.durum[x.b]; return `<li><div class="mz-kayit-satir"><b>${e(x.ad || x.m)}</b>${d ? `<p class="mz-uyari-not">${e(durumNotu(d))}</p>` : ''}${x.not ? `<p class="mz-kayit-not">${e(x.not)}</p>` : ''}<small>${e(tarihYaz(x.tarih))}</small></div><div class="mz-kayit-dg"><button type="button" class="dg dg-cizgi dg-kucuk" data-mz-fav-ac="${e(x.k)}">Aç</button><button type="button" class="dg dg-hafif dg-kucuk" data-mz-fav-not="${e(x.k)}">Not</button><button type="button" class="dg dg-hafif dg-kucuk" data-mz-fav-sil="${e(x.k)}">Kaldır</button></div></li>`; }).join('')}</ul></div>`;
}

/* ---------- madde değişiklik geçmişi (metindeki "Değişik/Ek/Mülga" notlarından) ---------- */
export function degisiklikGecmisi(metin) {
  const o = new Map();
  for (const m of String(metin || '').matchAll(/\((Değişik|Ek|Mülga)(?:\s+(?:fıkra|ibare|cümle|bent|madde|paragraf|tanım))?\s*:\s*(RG-)?(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{4,5})(?:\/(\d+)\s*md\.?)?\s*\)/gu)) {
    const [, tur, rg, g, a, y, no, md] = m, iso = `${y}-${a.padStart(2, '0')}-${g.padStart(2, '0')}`, k = iso + '|' + tur;
    if (!o.has(k)) o.set(k, { tur, iso, rg: !!rg, no, md: md || '', adres: `https://www.resmigazete.gov.tr/eskiler/${y}/${a.padStart(2, '0')}/${y}${a.padStart(2, '0')}${g.padStart(2, '0')}.htm` });
  }
  return [...o.values()].sort((x, y) => x.iso.localeCompare(y.iso));
}
const gecmisHtml = l => !l.length ? '' : `<details class="daha mz-gecmis"><summary>Değişiklik geçmişi (${l.length})</summary><ol>${l.map(x => `<li><b>${e(tarihYaz(x.iso))}</b> · ${e(x.tur === 'Değişik' ? 'Değiştirildi' : x.tur === 'Ek' ? 'Eklendi' : 'Yürürlükten kaldırıldı')} · ${x.rg ? 'Resmî Gazete sayı ' + e(x.no) : e(x.no) + ' sayılı Kanun' + (x.md ? ' md.' + e(x.md) : '')} <a href="${e(x.adres)}" target="_blank" rel="noopener">Resmî Gazete</a></li>`).join('')}</ol><p class="mz-not">Maddenin şimdiki metni gösteriliyor; değişikliklerin tarihi metindeki notlardan çıkarıldı. Eski metin için o günün Resmî Gazete'sine bakın.</p></details>`;

/* ---------- konu haritası ---------- */
// Soru yokken: kurs işinin aşamaları ve her aşamadaki konular (rehber bölümleri ve ek konular)
function konuHaritasi() {
  const kh = durum.kh; if (!kh) return '';
  const ad = new Map(kh.kavramlar.map(x => [x.id, x]));
  const asamalar = kh.asamalar.map(a => ({ ...a, l: kh.kavramlar.filter(x => x.asama === a.id) })).filter(a => a.l.length);
  return `<section class="mz-harita" aria-label="Konular">
    <div class="bolum-bas mz-bolum"><div><h2>Konular</h2><p class="mz-not">Kurs işinin kayıttan sertifikaya her adımı. Konuya dokunun: açıklama ve dayanak maddeleri açılır.</p></div></div>
    ${asamalar.map((a, i) => `<div class="mz-asama"><h3><span>${i + 1}</span>${e(a.ad)}</h3><div class="mz-konu-izgara">${a.l.map(x => `<button type="button" class="mz-konu" data-mz-kavram="${e(x.id)}"><b>${e(x.ad.replace(/^Kursun bir günü: (.)/, (m, h) => h.toLocaleUpperCase('tr-TR')))}</b>${x.ozet ? `<small>${e(x.ozet)}</small>` : ''}</button>`).join('')}</div></div>`).join('')}
  </section>`;
}
function kavramAc(k, id, inp) {
  const x = durum.kh && durum.kh.harita.get(id); if (!x) return;
  const kume = motor.kume.ortak, bi = kume ? kume.belgeler.findIndex(b => b.id === 'rehber') : -1;
  const i = x.rehber && bi >= 0 ? kume.parcalar.findIndex(p => p.b === bi && p.m === x.rehber) : -1;
  if (i >= 0) return maddeAc(i);
  // rehber bölümü olmayan konu: konunun adıyla sorulur
  inp.value = x.ad; aramaYap(k, x.ad, true, true);
}

/* ---------- madde penceresi ---------- */
function sonucAc(s) {
  if (s.kaynak === 'kurs') return kursBelgesiAc(s.belge.id);
  if (s.kaynak === 'ek' && s.parca.sss) return pencere({ baslik: 'Sık sorulan', genis: true, icerik: `<div class="mz-madde" data-resmi><p class="mz-uyari-not">mdSinyal'in hazırladığı cevaptır, resmî metin değildir. Dayanağa dokunarak resmî maddeyi açın.</p>${kisaCevapHtml(s.parca)}</div>`, onAc: d => d.addEventListener('click', ev => { const y = ev.target.closest('[data-mz-etiket]'); if (y) maddeAc(+y.dataset.mzEtiket); }) });
  if (s.kaynak === 'ek') return ekBelgeAc(s.belge.id);
  maddeAc(s.sira, new Set(durum.son ? durum.son.r.vurguKok || durum.son.r.kokler : []), s.kaynak === 'taban' ? 'taban' : 'ortak');
}
// kume: 'ortak' (statik derlem) ya da 'taban' (il taban fiyat listesi); dayanak etiketleri her zaman ortak derleme bağlanır
function maddeAc(i, kokSet = new Set(), kume = 'ortak') {
  const md = motor.madde(kume, i); if (!md) return;
  const b = md.belge;
  const rd = resmiDegil(b);
  // rehber bölümleri alt başlıklarıyla (her parçanın başlığı değiştikçe) yazılır
  let onceBas = null;
  const altBas = p => { if (!rd || p.sss || !p.baslik || p.baslik === onceBas) return ''; onceBas = p.baslik; return `<h4 class="mz-alt-baslik">${e(p.baslik)}</h4>`; };
  const metin = md.parcalar.map(p => p.sss ? kisaCevapHtml(p, kokSet) : `${altBas(p)}<p>${p.f ? `<b class="mz-fikra">(${e(String(p.f).split('/')[1] || p.f)})</b> ` : ''}${etiketliHtml(p.t, kokSet)}</p>`).join('');
  const kurallar = [...new Set(md.parcalar.flatMap(p => p.kural || []))];
  const favK = b.id + '|' + (md.m || ''), favVar = () => (durum.fav || []).some(x => x.k === favK);
  const favDg = () => `${ik('yildiz')}${favVar() ? 'Kaydedildi' : 'Kaydet'}`;
  pencere({
    baslik: `${b.kisa || b.ad}${md.m ? ' · ' + md.m : ''}`, genis: true,
    icerik: `<div class="mz-madde" data-resmi>
      ${!rd ? `<div class="mz-madde-arac"><button type="button" class="dg dg-cizgi dg-kucuk mz-fav-dg${favVar() ? ' secili' : ''}" data-mz-fav-kaydet aria-pressed="${favVar()}">${favDg()}</button>${motor.belgeDurumu(b) ? `<span class="mz-uyari-not">${e(durumNotu(motor.belgeDurumu(b)))}</span>` : ''}</div>` : ''}
      ${b.taban ? `<p class="mz-uyari-not">${e(b.ozet)}</p>` : ''}
      ${rd ? `<p class="mz-uyari-not">mdSinyal'in açıklama metnidir, resmî metin değildir. Köşeli parantezdeki dayanağa dokunarak resmî maddeyi açın.</p>` : ''}
      ${md.baslik && !rd ? `<h3>${e(md.baslik)}</h3>` : ''}
      <div class="mz-madde-metin">${metin}</div>
      ${!rd ? gecmisHtml(degisiklikGecmisi(md.parcalar.map(p => p.t).join('\n'))) : ''}
      ${kuralBag(kurallar)}
      <div class="mz-komsu">${md.onceki != null ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-komsu="${md.onceki}">${ik('sol')}${e(md.oncekiAd || 'Önceki')}</button>` : '<span></span>'}${md.sonraki != null ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-komsu="${md.sonraki}">${e(md.sonrakiAd || 'Sonraki')}${ik('sag')}</button>` : ''}</div>
      <div class="mz-kaynak"><b>${e(b.ad || b.kisa)}</b><small>${[TUR_AD[b.tur], b.kaynakAd || '', b.tarih ? 'Yayım ' + tarihYaz(b.tarih) : '', b.guncel ? 'son değişiklik ' + tarihYaz(b.guncel) : ''].filter(Boolean).map(e).join(' · ')}</small>
        ${b.notlar ? `<p class="mz-uyari-not">${e(b.notlar)}</p>` : ''}
        ${b.kaynak && /^https:\/\//.test(b.kaynak) ? `<a class="dg-baglanti" href="${e(b.kaynak)}" target="_blank" rel="noopener">Resmî metni aç</a>` : ''}</div>
    </div>`,
    onAc: d => d.addEventListener('click', async ev => {
      const f = ev.target.closest('[data-mz-fav-kaydet]');
      if (f) { const k = document.querySelector('.mz'), ok = await favoriYaz(k && k.closest('#icerik') ? k.parentElement : null, favVar() ? { k: favK, sil: true } : { b: b.id, m: md.m || '', ad: (b.kisa || b.ad) + (md.m ? ' ' + md.m : '') + (md.baslik ? ' · ' + md.baslik : '') }); if (ok) { f.innerHTML = favDg(); f.classList.toggle('secili', favVar()); f.setAttribute('aria-pressed', favVar()); bildir(favVar() ? 'Kaydedildi: Kaydettiklerim sekmesinde' : 'Kayıttan çıkarıldı'); const kk = document.querySelector('[data-mz-sekmeler]'); if (kk) kk.innerHTML = sekmelerHtml(); } return; }
      const x = ev.target.closest('[data-mz-komsu]'); if (x) return maddeAc(+x.dataset.mzKomsu, kokSet, kume); const y = ev.target.closest('[data-mz-etiket]'); if (y) maddeAc(+y.dataset.mzEtiket, kokSet);
    }),
  });
}

// Platformun eklediği ortak belge: özet, kaynak bağlantısı ve tam metin (herkese açık uç)
async function ekBelgeAc(id) {
  const d = pencere({ baslik: 'Belge', genis: true, icerik: `<div class="mz-bekle">${isaret('bilgi', 22)}<span>Belge açılıyor…</span></div>` });
  { const g = d && d.querySelector('.pencere-govde'); if (g) g.setAttribute('data-resmi', ''); }
  let b; try { b = (await api('/mevzuat/ortak/belge/' + encodeURIComponent(id))).belge; } catch (x) { if (d.isConnected) d.querySelector('.pencere-govde').innerHTML = bos('Belge açılamadı', 'Bağlantınızı kontrol edip yeniden deneyin.'); return; }
  if (!d.isConnected || !b) return;
  const oz = ozetBol(b.ozet), du = motor.durum[b.id];
  d.querySelector('header h2').textContent = b.ad || 'Belge';
  d.querySelector('.pencere-govde').innerHTML = `<div class="mz-yazi">
    <p class="mz-meta">${[TUR_AD[b.tur] || '', b.kurum || '', b.tarih ? tarihYaz(b.tarih) : '', b.sayi ? 'Sayı ' + b.sayi : '', b.eklenme ? 'mdSinyal’e eklendi ' + tarihYaz(String(b.eklenme).slice(0, 10)) : ''].filter(Boolean).map(e).join(' · ')}</p>
    ${du ? `<p class="mz-uyari-not">${e(durumNotu(du))}</p>` : ''}
    ${oz.ozet ? `<h4 class="mz-ara-baslik">Özet</h4><div class="mz-ozet">${paragraf(oz.ozet)}</div>` : ''}
    ${oz.yapilacak.length ? `<h4 class="mz-ara-baslik">Kursların yapması gerekenler</h4><ul class="mz-yapilacak">${oz.yapilacak.map(z => `<li>${e(z)}</li>`).join('')}</ul>` : ''}
    ${b.kaynak && /^https:\/\//.test(b.kaynak) ? `<a class="dg-baglanti" href="${e(b.kaynak)}" target="_blank" rel="noopener">Resmî metni aç</a>` : ''}
    <details class="daha mz-tam"><summary>Tam metin</summary><div class="mz-tam-metin">${e(b.metin || '')}</div></details>
  </div>`;
}

/* ---------- ortak belgeler ---------- */
function ortakBolumu(k) {
  const yer = k.querySelector('[data-mz-ortak]'); if (!yer || !motor.kume.ortak) return;
  const ek = (motor.kume.ek && motor.kume.ek.belgeler) || [], l = [...ek, ...motor.kume.ortak.belgeler, ...((motor.kume.taban && motor.kume.taban.belgeler) || [])];
  yer.innerHTML = `<div class="bolum-bas mz-bolum"><div><h2>Aranan belgeler</h2></div></div>
    <div class="kart"><details class="daha mz-ortak"><summary>${l.length} belge: yönetmelikler, kanunlar, kılavuzlar, programlar ve mdSinyal rehberi${ek.length ? ` · ${ek.length} yeni eklenen` : ''}</summary><ul class="liste">${l.map(b => `<li><div class="mz-ortak-satir"><b>${e(b.ad)}${b.ek && yeniMi(b) ? ' ' + rozet('Yeni eklendi', 'yesil') : ''}${motor.durum[b.id] ? ' ' + rozet(DURUM_AD[motor.durum[b.id].durum], 'kirmizi') : ''}</b>${motor.durum[b.id] ? `<p class="mz-uyari-not">${e(durumNotu(motor.durum[b.id]))}</p>` : ''}<small>${[TUR_AD[b.tur] || '', b.tarih ? tarihYaz(b.tarih) : '', b.guncel && b.guncel !== b.tarih ? 'değişiklik ' + tarihYaz(b.guncel) : ''].filter(Boolean).map(e).join(' · ')}</small>${resmiDegil(b) && b.notlar ? `<p class="mz-uyari-not">${e(b.notlar)}</p>` : ''}${b.ozet ? `<p>${e(b.ozet)}</p>` : ''}${b.kaynak && /^https:\/\//.test(b.kaynak) ? `<a class="dg-baglanti" href="${e(b.kaynak)}" target="_blank" rel="noopener">Resmî kaynak</a>` : ''}</div></li>`).join('')}</ul></details></div>`;
}

/* ---------- kursa gelen yazılar ---------- */
function kursBolumu(k) {
  const yer = k.querySelector('[data-mz-kurs]'); if (!yer) return;
  const bas = dugme => `<div class="bolum-bas mz-bolum"><div><h2>Kursumuza gelen yazılar</h2></div><div class="sag">${dugme}</div></div>`;
  if (demo()) {
    yer.innerHTML = bas(`<button type="button" class="dg dg-ana" disabled>${ik('arti')}Belge ekle</button>`) + `<div class="kart"><div class="kart-govde mz-demo">${isaret('bilgi', 24)}<div><b>Gerçek kursta açılır</b><p>İl ya da ilçe milli eğitimden gelen yazıyı PDF, Word ya da fotoğraf olarak eklersiniz. mdSinyal metni okur, kısa özetini ve kursun yapması gerekenleri çıkarır; yazı bu aramaya katılır. Yazıları yalnız kurs müdürü ve ön büro görür.</p></div></div></div>`;
    return;
  }
  if (!personel()) { yer.innerHTML = ''; return; }
  const l = durum.kursListe;
  const ekle = `<button type="button" class="dg dg-ana" data-mz-ekle>${ik('arti')}Belge ekle</button>`;
  if (!l) { yer.innerHTML = bas(ekle) + `<div class="kart mz-bekle">${isaret('bilgi', 22)}<span>Yazılar yükleniyor…</span></div>`; return; }
  const sirali = l.slice().sort((a, b) => String(b.tarih || b.eklenme || '').localeCompare(String(a.tarih || a.eklenme || '')));
  yer.innerHTML = bas(ekle) + `<div class="kart">${durum.kursHata ? `<p class="mz-not mz-not-kart">${e(durum.kursHata)}</p>` : ''}${sirali.length ? `<ul class="liste mz-kurs-liste">${sirali.map(b => `<li><button type="button" class="mz-kurs-satir" data-mz-kbelge="${e(b.id)}">${ik('belge')}<span><b>${e(b.ad || 'Adsız yazı')}</b><small>${[b.tarih ? tarihYaz(b.tarih) : '', b.sayi ? 'Sayı ' + b.sayi : ''].filter(Boolean).map(e).join(' · ')}</small>${b.ozet ? `<em>${e(ozetBol(b.ozet).ozet.split('\n')[0].slice(0, 200))}</em>` : ''}</span>${ik('sag')}</button></li>`).join('')}</ul>`
    : bos('Henüz yazı eklenmedi', 'Milli eğitimden gelen yazıyı ekleyin; özeti çıkarılır ve mevzuat aramasına katılır.')}</div>`;
}

function belgeEklePenceresi(k) {
  if (!personel()) return;
  const bugun = new Date().toISOString().slice(0, 10);
  pencere({
    baslik: 'Belge ekle', korumali: false,
    icerik: `<form class="mz-yukle" data-mz-yukle novalidate>
      <div class="alan"><span class="et">Dosya</span><label class="mz-dosya"><input id="mz-dosya" type="file" name="dosya" accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"><span class="dg dg-cizgi dg-kucuk" aria-hidden="true">${ik('belge')}Dosya seç</span><span class="mz-dosya-ad" data-mz-dosya-ad>Seçilmedi</span></label><small class="mz-yardim">PDF, Word (.docx), JPG ya da PNG; en çok 10 MB</small></div>
      <div class="alan"><label for="mz-metin">ya da metni yapıştırın</label><textarea id="mz-metin" name="metin" rows="5" placeholder="Yazının metnini buraya yapıştırabilirsiniz"></textarea></div>
      <div class="form-izgara">
        <div class="alan tam"><label for="mz-ad">Başlık</label><input id="mz-ad" name="ad" maxlength="200" placeholder="Ör. Direksiyon sınavında kamera kaydı"></div>
        <div class="alan"><label for="mz-tarih">Yazının tarihi</label><input id="mz-tarih" type="date" name="tarih" max="${bugun}"></div>
        <div class="alan"><label for="mz-sayi">Sayı</label><input id="mz-sayi" name="sayi" maxlength="80" placeholder="Ör. E-12345678-100"></div>
      </div>
      <div class="mz-ilerleme" data-mz-ilerleme hidden></div>
    </form>`,
    altlik: `<button type="button" class="dg dg-cizgi" data-kapat>Vazgeç</button><button type="button" class="dg dg-ana" data-mz-gonder>Yükle</button>`,
    onAc: d => {
      const f = d.querySelector('form');
      f.dosya.addEventListener('change', () => { const x = f.dosya.files[0]; d.querySelector('[data-mz-dosya-ad]').textContent = x ? x.name + ' · ' + (x.size < 1048576 ? Math.max(1, Math.round(x.size / 1024)) + ' KB' : (x.size / 1048576).toFixed(1).replace('.', ',') + ' MB') : 'Seçilmedi'; if (x && !f.ad.value) f.ad.value = x.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 200); });
      d.querySelector('[data-mz-gonder]').addEventListener('click', () => belgeYukle(d, k));
    },
  });
}
function belgeYukle(d, k) {
  const f = d.querySelector('form'), x = f.dosya.files[0], metin = f.metin.value.trim(), ad = f.ad.value.trim();
  if (!x && metin.length < 20) return bildir('Bir dosya seçin ya da yazının metnini yapıştırın', 'uyari');
  if (x && x.size > 10 * 1024 * 1024) return bildir('Dosya 10 MB’tan büyük; daha küçük bir dosya seçin', 'uyari');
  let tur = x ? (x.type || (/\.docx$/i.test(x.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : /\.pdf$/i.test(x.name) ? 'application/pdf' : '')) : 'text/plain;charset=utf-8';
  if (x && !/^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/(jpeg|png))$/.test(tur)) return bildir('Bu dosya türü okunamaz; PDF, Word (.docx), JPG ya da PNG seçin', 'uyari');
  if (!ad) return bildir('Yazıya bir başlık verin', 'uyari');
  const kok = apiKok();
  if (!kok) return bildir('Yerel denemede belge servisi kapalı', 'uyari');
  const il = d.querySelector('[data-mz-ilerleme]'), dg = d.querySelector('[data-mz-gonder]');
  const goster = (yuzde, metin2) => { il.hidden = false; il.innerHTML = `${ilerleme(yuzde, 100)}<small>${e(metin2)}</small>`; };
  dg.disabled = true; f.querySelectorAll('input,textarea').forEach(z => { z.disabled = true; });
  goster(2, x ? 'Dosya gönderiliyor…' : 'Metin gönderiliyor…');
  const sorgu = '?ad=' + encodeURIComponent(ad) + '&tarih=' + encodeURIComponent(f.tarih.value || '') + '&sayi=' + encodeURIComponent(f.sayi.value.trim());
  // fotoğraf sunucuya gitmeden küçültülür (ücretsiz planda sunucunun işlem süresi kısıtlı; yazı okunurluğu için uzun kenar 2000 px yeter)
  const gonderilecek = x && /^image\//.test(tur) ? resimKucult(x).then(bl => { tur = 'image/jpeg'; return bl; }) : Promise.resolve(x || metin);
  let govde;
  gonderilecek.then(g => { govde = g; if (govde instanceof Blob && /^image\//.test(tur) && govde.size > 1.5e6) throw new Error('Fotoğraf çok büyük; daha yakından ve tek sayfa çekin ya da metni yapıştırın'); return kimlik(); }).then(h => new Promise((ok, red) => {
    const r = new XMLHttpRequest();
    r.open('POST', kok + '/mevzuat/yukle' + sorgu);
    Object.entries(h).forEach(([a, v]) => r.setRequestHeader(a, v));
    r.setRequestHeader('Content-Type', tur);
    r.timeout = 120000;
    r.upload.onprogress = ev => { if (ev.lengthComputable) goster(Math.round(ev.loaded / ev.total * 60), 'Gönderiliyor… %' + Math.round(ev.loaded / ev.total * 100)); };
    r.upload.onload = () => goster(70, 'Metin okunuyor, parçalara bölünüyor ve özetleniyor… Bu bir dakika sürebilir.');
    r.onload = () => { let j = {}; try { j = JSON.parse(r.responseText); } catch (z) { } if (r.status >= 200 && r.status < 300 && j.ok) ok(j); else red(new Error(j.hata || 'Yükleme başarısız (' + r.status + ')')); };
    r.onerror = () => red(new Error('Servise ulaşılamadı; bağlantınızı kontrol edin'));
    r.ontimeout = () => red(new Error('Servis zamanında cevap vermedi; biraz sonra yeniden deneyin'));
    r.send(govde);
  })).then(async j => {
    goster(100, 'Tamam');
    // md.42 gelen evrak kayıt defteri: yüklenen yazı sıra numarasıyla deftere girer (gönderen kurum dosyada düzeltilebilir; RAP-004)
    import('./defterler.js?v=234').then(m => m.evrakEkle({ yon: 'Gelen', belgeTarih: f.tarih.value || '', sayi: f.sayi.value.trim(), kurum: '', konu: ad, kaynak: 'mevzuat' })).catch(() => { });
    await kursYenile();
    if (k.isConnected) { kursBolumu(k); kursKumesi().catch(() => { }); }
    const b = j.belge || {}, oz = ozetBol(b.ozet);
    if (!d.isConnected) return bildir('Yazı eklendi');
    d.querySelector('.pencere-govde').setAttribute('data-resmi', '');  // yazının adı ve özeti resmî dille kalır
    d.querySelector('.pencere-govde').innerHTML = `<div class="mz-bitti">${isaret('tamam', 28)}<div><b>${e(b.ad || ad)}</b><small>${b.parca ? e(b.parca + ' parça aramaya katıldı') : ''}</small></div></div>
      ${oz.ozet ? `<h4 class="mz-ara-baslik">Özet</h4><div class="mz-ozet">${paragraf(oz.ozet)}</div>` : '<p class="mz-not">Özet çıkarılamadı (yapay zekâ bağlı değil). Yazı yine de aramaya katıldı.</p>'}
      ${oz.yapilacak.length ? `<h4 class="mz-ara-baslik">Kursun yapması gerekenler</h4><ul class="mz-yapilacak">${oz.yapilacak.map(z => `<li>${e(z)}</li>`).join('')}</ul>` : ''}`;
    const alt = d.querySelector('footer'); if (alt) alt.innerHTML = `<button type="button" class="dg dg-cizgi" data-kapat>Kapat</button>${b.id ? `<button type="button" class="dg dg-ana" data-mz-yeni-ac="${e(b.id)}">Yazıyı aç</button>` : ''}`;
    const y = d.querySelector('[data-mz-yeni-ac]'); if (y) y.addEventListener('click', () => kursBelgesiAc(y.dataset.mzYeniAc, k));
    bildir('Yazı eklendi');
  }).catch(z => {
    dg.disabled = false; f.querySelectorAll('input,textarea').forEach(w => { w.disabled = false; });
    il.hidden = false; il.innerHTML = `<p class="mz-cevap-hata">${e(z.message || 'Yükleme başarısız')}</p>`;
  });
}

async function kursBelgesiAc(id, k) {
  if (!personel()) return;
  const d = pencere({ baslik: 'Kursa gelen yazı', genis: true, icerik: `<div class="mz-bekle">${isaret('bilgi', 22)}<span>Yazı açılıyor…</span></div>` });
  { const g = d && d.querySelector('.pencere-govde'); if (g) g.setAttribute('data-resmi', ''); }
  let b;
  try { b = (await api('/mevzuat/belge/' + encodeURIComponent(id))).belge; } catch (x) { if (d.isConnected) d.querySelector('.pencere-govde').innerHTML = bos('Yazı açılamadı', x.kapali ? 'Yerel denemede belge servisi kapalı.' : 'Bağlantınızı kontrol edip yeniden deneyin.'); return; }
  if (!d.isConnected || !b) return;
  const ciz = () => {
    const oz = ozetBol(b.ozet);
    d.querySelector('header h2').textContent = b.ad || 'Kursa gelen yazı';
    d.querySelector('.pencere-govde').innerHTML = `<div class="mz-yazi">
      <p class="mz-meta">${[b.tarih ? tarihYaz(b.tarih) : '', b.sayi ? 'Sayı ' + b.sayi : '', b.eklenme ? 'eklendi ' + tarihYaz(String(b.eklenme).slice(0, 10)) : ''].filter(Boolean).map(e).join(' · ')}</p>
      <h4 class="mz-ara-baslik">Özet</h4>
      ${oz.ozet ? `<div class="mz-ozet">${paragraf(oz.ozet)}</div>` : `<p class="mz-not">Bu yazının özeti yok.${durum.llmYok ? ' Yapay zekâ henüz bağlı değil.' : ''}</p>${!durum.llmYok ? '<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-ozetle>Özetle</button>' : ''}`}
      <h4 class="mz-ara-baslik">Kursun yapması gerekenler</h4>
      ${oz.yapilacak.length ? `<ul class="mz-yapilacak">${oz.yapilacak.map(z => `<li>${e(z)}</li>`).join('')}</ul>` : `<p class="mz-not">${oz.ozet ? 'Özette kursa düşen ayrı bir iş belirtilmemiş; tam metni okuyun.' : 'Özet çıkarılınca burada görünür.'}</p>`}
      <h4 class="mz-ara-baslik">Bu yazıyla ilgili maddeler</h4><div data-mz-ilgili><p class="mz-not">Aranıyor…</p></div>
      <details class="daha mz-tam"><summary>Tam metin</summary><div class="mz-tam-metin">${e(b.metin || '')}</div></details>
      ${mudur() ? `<div class="mz-sil"><button type="button" class="dg dg-hafif mz-sil-dg" data-mz-sil>Yazıyı sil</button></div>` : ''}
    </div>`;
    ilgiliMaddeler(d, b);
  };
  ciz();
  d.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.closest('[data-mz-ozetle]')) {
      const dg = t.closest('[data-mz-ozetle]'); dg.disabled = true; dg.textContent = 'Özetleniyor…';
      try { const j = await api('/mevzuat/ozetle', { method: 'POST', govde: { id: b.id }, sure: 45000 }); b.ozet = j.ozet || ''; if (durum.kursListe) { const x = durum.kursListe.find(z => z.id === b.id); if (x) x.ozet = b.ozet; } if (d.isConnected) ciz(); if (k && k.isConnected) kursBolumu(k); }
      catch (x) { if (x.durum === 503 || x.kurulu === false) durum.llmYok = true; bildir(durum.llmYok ? 'Yapay zekâ henüz bağlı değil' : 'Özet alınamadı; biraz sonra yeniden deneyin', 'uyari'); if (d.isConnected) ciz(); }
    }
    const s = t.closest('[data-mz-sil]');
    if (s) {
      if (!s.dataset.onay) { s.dataset.onay = '1'; s.textContent = 'Silmeyi onaylayın: yazı ve aramadaki parçaları silinir'; s.classList.add('mz-sil-onay'); return; }
      s.disabled = true;
      try { await api('/mevzuat/sil', { method: 'POST', govde: { id: b.id } }); kapatPencere(); bildir('Yazı silindi'); await kursYenile(); const kk = k || document.querySelector('.sayfa-mevzuat'); if (kk && kk.isConnected) { kursBolumu(kk); kursKumesi().catch(() => { }); } }
      catch (x) { s.disabled = false; bildir(x.kullanici || 'Yazı silinemedi', 'uyari'); }
    }
    const a = t.closest('[data-mz-ilgili-ac]'); if (a) maddeAc(+a.dataset.mzIlgiliAc);
  });
}
async function ilgiliMaddeler(d, b) {
  const yer = d.querySelector('[data-mz-ilgili]'); if (!yer) return;
  try { if (!yuklendi()) await yukle(); } catch (x) { yer.innerHTML = '<p class="mz-not">Mevzuat yüklenemedi.</p>'; return; }
  const q = (ozetBol(b.ozet).ozet || b.ad + ' ' + String(b.metin || '').slice(0, 300)).slice(0, 380);
  const r = await motor.ara(q, { filtre: 'mevzuat', n: 12, gom });
  if (!yer.isConnected) return;
  const kokSet = new Set(r.kokler), gor = new Set();
  // aynı maddenin fıkraları tek satır
  const l = r.sonuc.filter(s => { const a = s.belge.id + '|' + (s.parca.m || s.sira); if (gor.has(a)) return false; gor.add(a); return true; }).slice(0, 4);
  yer.innerHTML = l.length ? `<ul class="liste mz-ilgili">${l.map(s => `<li><div><b>${e(etiket(s))}</b>${s.parca.baslik ? `<small>${e(s.parca.baslik)}</small>` : ''}<p>${vurguHtml(alinti(s.parca.t, kokSet, 160))}</p></div><button type="button" class="dg dg-cizgi dg-kucuk" data-mz-ilgili-ac="${s.sira}">Aç</button></li>`).join('')}</ul>` : '<p class="mz-not">İlgili madde bulunamadı.</p>';
}

/* ---------- MEB › Mevzuat sekmesindeki kısa arama ---------- */
export const kisaArama = () => `<form class="kart mz-mini" data-mz-git-form role="search"><div class="mz-mini-ic">${isaret('bilgi', 22)}<b>Yönetmelik, kılavuz ve MEB yazılarında ara</b></div><div class="mz-mini-ic"><label class="mz-kutu">${ik('ara')}<input type="search" name="q" placeholder="Ör. gece dersi, MTSK madde 15" aria-label="Mevzuatta ara" maxlength="300" enterkeyhint="search"></label><button class="dg dg-ana" type="submit">Ara</button></div></form>`;
export function kisaAramaBaglan(k) {
  k.addEventListener('submit', ev => { const f = ev.target.closest('[data-mz-git-form]'); if (!f) return; ev.preventDefault(); const q = f.q.value.trim(); location.hash = '#/mevzuat' + (q ? '?q=' + encodeURIComponent(q) : ''); });
}
