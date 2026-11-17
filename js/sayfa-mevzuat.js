/* Mevzuat ve MEB yazıları (#/mevzuat, müdür ve ön büro)
   Arama motoru js/mevzuat-ara.js: ortak derlem (veri/mevzuat) + kursa gelen yazılar (worker /mevzuat/*).
   Anlam araması için sorgu vektörü worker'dan gelir (/mevzuat/gom); ulaşılamazsa yalnız kelimeyle aranır.
   Yerel denemede (localhost) worker'a istek gitmez; yerel worker için localStorage 'sinyal-mevzuat-api' = 'http://127.0.0.1:8787'. */
import { S, oturum, bulutKanca } from './veri.js?v=218';
import { e, ik, rozet, bos, pencere, kapatPencere, bildir, ekranNotu, isaret, tamTarih, ilerleme } from './ui.js?v=218';
import { WORKER } from './bulut.js?v=218';
import { motor, yukle, yuklendi, base64Int8, kokler, alinti, FILTRELER, ETIKET_RE, etiketCoz, etiketBul, resmiDegil, kaynakSec, KAYNAK, kisaCevapSec, cevapNormalle, cevapDuzMetin } from './mevzuat-ara.js?v=218';

const TUR_AD = { yonetmelik: 'Yönetmelik', kanun: 'Kanun', yonerge: 'Yönerge', teblig: 'Tebliğ', kilavuz: 'Kılavuz', program: 'Ders programı', yazi: 'MEB yazısı', form: 'Form',
  'rehber-resmi': 'Denetim rehberi', bilgilendirme: 'Resmî bilgilendirme', rehber: 'mdSinyal rehberi (resmî metin değil)', sss: 'mdSinyal sık sorulanlar (resmî metin değil)' };
const ORNEKLER = ['Akşam direksiyon dersi zorunlu mu?', 'MTSK madde 15', 'Sınav ücreti ne zaman yatırılır?', 'Kursiyere ücret iadesi', 'B ehliyeti olan C için kaç saat ders alır?'];
const durum = { q: '', filtre: 'hepsi', son: null, yukHata: '', goster: 15, cevap: null, llmYok: false, kursListe: null, kursHata: '', kursHepsi: null, gomKapali: 0 };
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

/* ---------- yardımcılar ---------- */
const hashQ = () => { const h = location.hash.split('?')[1] || ''; try { return new URLSearchParams(h).get('q') || ''; } catch (x) { return ''; } };
const hashYaz = q => { const h = '#/mevzuat' + (q ? '?q=' + encodeURIComponent(q) : ''); if (location.hash !== h) try { history.replaceState(null, '', h); } catch (x) { } };
const vurguHtml = (a) => (a.bastaKesik ? '… ' : '') + a.parcalar.map(p => p.m ? `<mark>${e(p.t)}</mark>` : e(p.t)).join('') + (a.sondaKesik ? ' …' : '');
const etiket = s => `${s.belge.kisa || s.belge.ad || 'Belge'}${s.parca.m ? ' ' + s.parca.m : ''}`;
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

/* ---------- ekran ---------- */
export function mevzuat() {
  const q = hashQ();
  if (q && q !== durum.q) { durum.q = q; durum.son = null; durum.cevap = null; }
  return {
    baslik: 'Mevzuat ve MEB yazıları',
    alt: 'Yönetmelikler, kılavuzlar, ders programları, mdSinyal rehberi ve kursa gelen yazılar',
    // data-resmi: mevzuat ve yazı metinleri yönetmelikteki dille kalır (ui.js sadeDil 'kursiyer'i 'öğrenci' yapmaz)
    html: `<div class="mz" data-resmi>
      <form class="mz-ara" role="search" data-mz-form>
        <label class="mz-kutu">${ik('ara')}<input type="search" name="q" value="${e(durum.q)}" placeholder="Ör. akşam direksiyon dersi zorunlu mu?" aria-label="Mevzuatta ara" autocomplete="off" enterkeyhint="search" maxlength="300"></label>
        <button class="dg dg-ana" type="submit">Ara</button>
      </form>
      <div class="mz-cipler" role="group" aria-label="Belge türü">${FILTRELER.map(([k, t]) => `<button type="button" class="mz-cip ${k === durum.filtre ? 'secili' : ''}" aria-pressed="${k === durum.filtre}" data-mz-filtre="${k}">${e(t)}</button>`).join('')}</div>
      <div data-mz-sonuc aria-live="polite"></div>
      <div data-mz-kurs></div>
      <div data-mz-ortak></div>
    </div>`,
    baglan: baglan,
  };
}

let zamanlayici = null;
function baglan(k) {
  const form = k.querySelector('[data-mz-form]'), inp = form.q;
  form.addEventListener('submit', ev => { ev.preventDefault(); clearTimeout(zamanlayici); aramaYap(k, inp.value, true); });
  // yazarken yalnız kelime araması (anında), durunca anlamla birlikte
  inp.addEventListener('input', () => {
    clearTimeout(zamanlayici);
    const v = inp.value;
    zamanlayici = setTimeout(() => { aramaYap(k, v, false); zamanlayici = setTimeout(() => aramaYap(k, v, true), 700); }, 250);
  });
  k.addEventListener('click', ev => {
    const t = ev.target;
    const f = t.closest('[data-mz-filtre]');
    if (f) { durum.filtre = f.dataset.mzFiltre; k.querySelectorAll('[data-mz-filtre]').forEach(b => { const s = b === f; b.classList.toggle('secili', s); b.setAttribute('aria-pressed', s); }); durum.son = null; durum.cevap = null; return aramaYap(k, inp.value, true); }
    const o = t.closest('[data-mz-ornek]'); if (o) { inp.value = o.dataset.mzOrnek; return aramaYap(k, inp.value, true); }
    const a = t.closest('[data-mz-ac]'); if (a) { const s = durum.son && durum.son.r.sonuc[+a.dataset.mzAc]; if (s) sonucAc(s); return; }
    if (t.closest('[data-mz-daha]')) { durum.goster += 15; return sonucCiz(k); }
    if (t.closest('[data-mz-sor]')) return yapayZekayaSor(k);
    if (t.closest('[data-mz-kopyala]')) return cevapKopyala();
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
  if (!k.isConnected) return;
  ortakBolumu(k); kursBolumu(k);
  if (durum.son && durum.son.q === durum.q && durum.son.filtre === durum.filtre) sonucCiz(k);
  else if (durum.q) aramaYap(k, durum.q, true);
  else sonucCiz(k);
  // her açılışta liste tazelenir (başka personelin eklediği/sildiği yazı görünsün); değiştiyse arama kümesi yeniden indirilir
  const onceki = (durum.kursListe || []).map(x => x.id).join();
  if (personel()) kursListesi(true).then(l => { if (l.map(x => x.id).join() !== onceki) { durum.kursHepsi = null; motor.kursSil(); durum.son = null; } if (k.isConnected) kursBolumu(k); return kursKumesi(); }).then(() => { if (k.isConnected && durum.q && durum.son && !durum.son.kurs && motor.kume.kurs) aramaYap(k, durum.q, true); }).catch(() => { });
}

let aramaNo = 0;
async function aramaYap(k, q, anlam) {
  q = String(q || '').trim().slice(0, 300);
  if (q !== durum.q) durum.cevap = null;
  durum.q = q; hashYaz(q); durum.goster = 15;
  if (!yuklendi()) return;
  if (!q) { durum.son = null; return sonucCiz(k); }
  const no = ++aramaNo;
  const r = await motor.ara(q, { filtre: durum.filtre, n: 40, gom: anlam ? gom : null, anlam });
  if (no !== aramaNo || !k.isConnected) return;
  // yazarken (anlamsız) arama, aynı sorgunun anlamlı sonucunu ezmesin
  if (!anlam && durum.son && durum.son.q === q && durum.son.anlam) return;
  durum.son = { q, filtre: durum.filtre, r, anlam, kurs: !!motor.kume.kurs };
  sonucCiz(k);
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
    yer.innerHTML = `<div class="mz-ornekler"><span>Örnek:</span>${ORNEKLER.map(o => `<button type="button" class="mz-ornek" data-mz-ornek="${e(o)}">${e(o)}</button>`).join('')}</div>`;
    return;
  }
  if (!durum.son) { yer.innerHTML = `<div class="kart mz-bekle">${isaret('bilgi', 22)}<span>Aranıyor…</span></div>`; return; }
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
      <div class="mz-ust"><span class="mz-sira">${i + 1}</span><b class="mz-belge">${e(s.belge.kisa || s.belge.ad)}</b>${s.parca.m && !sss ? rozet(s.parca.m, 'mavi') : ''}${resmiRozet(s.belge)}${s.kaynak === 'kurs' ? rozet('Kursumuza gelen', 'uyari') : ''}<span class="mz-neden mz-n-${ns}" title="Neden bulundu">${e(nd)}</span></div>
      ${sss ? `<h4>${e(s.parca.m)}</h4>` : s.parca.baslik ? `<h4>${e(s.parca.baslik)}</h4>` : ''}
      <p class="mz-alinti">${vurguHtml(a)}</p>
      <div class="mz-alt">${kuralBag(s.parca.kural)}<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-ac="${i}">${s.kaynak === 'kurs' ? 'Yazıyı aç' : sss ? 'Cevabın tamamı' : resmiDegil(s.belge) ? 'Bölümü aç' : s.parca.m ? 'Maddeyi aç' : 'Metni aç'}</button></div>
    </li>`;
  };
  yer.innerHTML = `${maddeNot}<div class="mz-bilgi"><span>${l.length} sonuç${e(not)}</span></div>
    ${kisaCevap(l)}
    ${cevapKutusu()}
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
function kisaCevap(l) {
  const p = kisaCevapSec(l, durum.son && durum.son.r.kokler, durum.son && durum.son.q);
  if (!p) return '';
  return `<div class="mz-kisa">
    <div class="mz-kisa-bas">${isaret('bilgi', 20)}<b>Kısa cevap</b>${rozet('Sık sorulan', 'sari')}</div>
    ${kisaCevapHtml(p)}
    <p class="mz-cevap-not">mdSinyal'in hazırladığı cevap; dayanağı aşağıda. Resmî metin değildir: dayanağa dokunup maddeyi okuyun, çelişkide resmî madde esastır.</p>
  </div>`;
}

/* ---------- yapay zekâya sor ---------- */
// kaynak numarası → sonuç kartı numarası (yoksa 0)
const kartNo = (c, n) => (n >= 1 && n <= c.n ? (c.harita ? c.harita[n - 1] : n) : 0);
const atifDugme = (c, n) => { const g = kartNo(c, n); return g ? `<button type="button" class="mz-atif" data-mz-git="${g}" aria-label="${n}. kaynak: ${g}. sonuca git" title="${e(c.etiketler ? c.etiketler[n - 1] || '' : '')}">[${n}]</button>` : ''; };
// metindeki [n] atıfları düğmeye döner, gerisi kaçışlı
const atifliHtml = (t, c) => e(t).replace(/\s*\[(\d{1,2})\]/g, (x, n) => atifDugme(c, +n) || x);  // atıftan önceki boşluk atılır: "zorunludur[1]."
const cipler = (c, l) => { const h = (l || []).map(n => atifDugme(c, n)).join(''); return h ? `<span class="mz-atiflar">${h}</span>` : ''; };
function cevapGovde(c) {
  const y = c.yanit;
  if (y.duz) return `<div class="mz-cevap-metin">${paragraf(y.kisa).replace(/\[(\d{1,2})\]/g, (x, n) => atifDugme(c, +n) || x)}</div>`;
  return `<div class="mz-cevap-yap">
    <p class="mz-cevap-kisa${y.bulunamadi ? ' yok' : ''}">${atifliHtml(y.kisa, c)}</p>
    ${y.ayrinti.length ? `<h4 class="mz-ara-baslik">Ayrıntılar</h4><ul class="mz-cevap-ayrinti">${y.ayrinti.map(x => `<li><span>${atifliHtml(x.metin, c)}</span>${cipler(c, x.kaynak)}</li>`).join('')}</ul>` : ''}
    ${y.adimlar.length ? `<h4 class="mz-ara-baslik">Yapılacaklar</h4><ol class="mz-cevap-adim">${y.adimlar.map(x => `<li><span>${atifliHtml(x.metin, c)}</span>${cipler(c, x.kaynak)}</li>`).join('')}</ol>` : ''}
    ${y.dikkat ? `<p class="mz-uyari-not">${atifliHtml(y.dikkat, c)}</p>` : ''}
  </div>`;
}
function cevapKutusu() {
  const pasif = demo() ? 'Yapay zekâ özeti gerçek kursta açılır' : durum.llmYok ? 'Yapay zekâ henüz bağlı değil' : '';
  const c = durum.cevap && durum.cevap.q === durum.q && durum.cevap.filtre === durum.filtre ? durum.cevap : null;
  let govde = '';
  if (c && c.bekliyor) govde = `<p class="mz-cevap-bekle">Cevap hazırlanıyor; sonuçlardan ${c.n} madde okunuyor…</p>`;
  else if (c && c.hata) govde = `<p class="mz-cevap-hata">${e(c.hata)}</p>`;
  else if (c && c.yanit) govde = `${cevapGovde(c)}
    <div class="mz-cevap-alt"><p class="mz-cevap-not">Cevap yalnız aşağıdaki maddelere dayanır; kesin karar için il milli eğitim müdürlüğüne danışın.</p><button type="button" class="dg dg-cizgi dg-kucuk" data-mz-kopyala>Kopyala</button></div>`;
  return `<div class="mz-cevap ${c && c.yanit ? 'dolu' : ''}">
    <div class="mz-cevap-bas">${ik('robot')}<div><b>Yapay zekâya sor</b><small>${pasif ? e(pasif) : `Sonuçlardan en uygun ${KAYNAK.encok} maddeyi okuyup sorunuzu bu maddelere göre cevaplar.`}</small></div>
      <button type="button" class="dg dg-koyu dg-kucuk" data-mz-sor ${pasif || (c && c.bekliyor) ? 'disabled' : ''}>${c && c.yanit ? 'Yeniden sor' : 'Sor'}</button></div>
    ${govde}</div>`;
}
function cevapKopyala() {
  const c = durum.cevap; if (!c || !c.yanit) return;
  const t = cevapDuzMetin(c.yanit, c.etiketler);
  const ok = () => bildir('Cevap kopyalandı');
  // pano izni yoksa (eski tarayıcı, gömülü görünüm) seçip kopyalama denenir
  const yedek = () => { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(a); a.select(); let b = false; try { b = document.execCommand('copy'); } catch (x) { } a.remove(); b ? ok() : bildir('Kopyalanamadı; metni seçip kopyalayın', 'uyari'); };
  try { navigator.clipboard.writeText(t).then(ok, yedek); } catch (x) { yedek(); }
}
async function yapayZekayaSor(k) {
  if (demo() || durum.llmYok || !durum.son) return;
  // en çok 8 madde (aynı maddenin parçaları birleşik, belge çeşitliliği gözetilir); rehber ve sık sorulanlar "mdSinyal Rehberi" etiketiyle gider,
  // worker istemi çelişkide resmî maddeyi esas alır. harita: kaynak numarası → sonuç kartı (atıf düğmesi o karta gider)
  const secilen = kaynakSec(durum.son.r.sonuc, { etiket });
  if (!secilen.length) return;
  const kaynaklar = secilen.map(({ i, ...x }) => x);
  const c = durum.cevap = { q: durum.q, filtre: durum.filtre, n: kaynaklar.length, harita: secilen.map(x => x.i + 1), etiketler: kaynaklar.map(x => x.etiket), bekliyor: true };
  sonucCiz(k);
  try {
    const j = await api('/mevzuat/cevapla', { method: 'POST', govde: { soru: durum.q, kaynaklar }, sure: 45000 });
    c.bekliyor = false; c.yanit = cevapNormalle(j);
  } catch (x) {
    c.bekliyor = false;
    if (x.durum === 503 || x.kurulu === false) { durum.llmYok = true; c.hata = 'Yapay zekâ henüz bağlı değil; sonuçları maddelerden okuyabilirsiniz.'; }
    else c.hata = x.kapali ? 'Yerel denemede yapay zekâ servisi kapalı.' : 'Cevap alınamadı; biraz sonra yeniden deneyin.';
  }
  if (durum.cevap === c && k.isConnected) sonucCiz(k);
}

/* ---------- madde penceresi ---------- */
function sonucAc(s) {
  if (s.kaynak === 'kurs') return kursBelgesiAc(s.belge.id);
  maddeAc(s.sira, new Set(durum.son ? durum.son.r.vurguKok || durum.son.r.kokler : []));
}
function maddeAc(i, kokSet = new Set()) {
  const md = motor.madde('ortak', i); if (!md) return;
  const b = md.belge;
  const rd = resmiDegil(b);
  // rehber bölümleri alt başlıklarıyla (her parçanın başlığı değiştikçe) yazılır
  let onceBas = null;
  const altBas = p => { if (!rd || p.sss || !p.baslik || p.baslik === onceBas) return ''; onceBas = p.baslik; return `<h4 class="mz-alt-baslik">${e(p.baslik)}</h4>`; };
  const metin = md.parcalar.map(p => p.sss ? kisaCevapHtml(p, kokSet) : `${altBas(p)}<p>${p.f ? `<b class="mz-fikra">(${e(String(p.f).split('/')[1] || p.f)})</b> ` : ''}${etiketliHtml(p.t, kokSet)}</p>`).join('');
  const kurallar = [...new Set(md.parcalar.flatMap(p => p.kural || []))];
  pencere({
    baslik: `${b.kisa || b.ad}${md.m ? ' · ' + md.m : ''}`, genis: true,
    icerik: `<div class="mz-madde" data-resmi>
      ${rd ? `<p class="mz-uyari-not">mdSinyal'in açıklama metnidir, resmî metin değildir. Köşeli parantezdeki dayanağa dokunarak resmî maddeyi açın.</p>` : ''}
      ${md.baslik && !rd ? `<h3>${e(md.baslik)}</h3>` : ''}
      <div class="mz-madde-metin">${metin}</div>
      ${kuralBag(kurallar)}
      <div class="mz-komsu">${md.onceki != null ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-komsu="${md.onceki}">${ik('sol')}${e(md.oncekiAd || 'Önceki')}</button>` : '<span></span>'}${md.sonraki != null ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mz-komsu="${md.sonraki}">${e(md.sonrakiAd || 'Sonraki')}${ik('sag')}</button>` : ''}</div>
      <div class="mz-kaynak"><b>${e(b.ad || b.kisa)}</b><small>${[TUR_AD[b.tur], b.tarih ? 'Yayım ' + tarihYaz(b.tarih) : '', b.guncel ? 'son değişiklik ' + tarihYaz(b.guncel) : ''].filter(Boolean).map(e).join(' · ')}</small>
        ${b.notlar ? `<p class="mz-uyari-not">${e(b.notlar)}</p>` : ''}
        ${b.kaynak && /^https:\/\//.test(b.kaynak) ? `<a class="dg-baglanti" href="${e(b.kaynak)}" target="_blank" rel="noopener">Resmî metni aç</a>` : ''}</div>
    </div>`,
    onAc: d => d.addEventListener('click', ev => { const x = ev.target.closest('[data-mz-komsu]'); if (x) return maddeAc(+x.dataset.mzKomsu, kokSet); const y = ev.target.closest('[data-mz-etiket]'); if (y) maddeAc(+y.dataset.mzEtiket, kokSet); }),
  });
}

/* ---------- ortak belgeler ---------- */
function ortakBolumu(k) {
  const yer = k.querySelector('[data-mz-ortak]'); if (!yer || !motor.kume.ortak) return;
  const l = motor.kume.ortak.belgeler;
  yer.innerHTML = `<div class="bolum-bas mz-bolum"><div><h2>Aranan belgeler</h2></div></div>
    <div class="kart"><details class="daha mz-ortak"><summary>${l.length} belge: yönetmelikler, kanunlar, kılavuzlar, programlar ve mdSinyal rehberi</summary><ul class="liste">${l.map(b => `<li><div class="mz-ortak-satir"><b>${e(b.ad)}</b><small>${[TUR_AD[b.tur] || '', b.tarih ? tarihYaz(b.tarih) : '', b.guncel && b.guncel !== b.tarih ? 'değişiklik ' + tarihYaz(b.guncel) : ''].filter(Boolean).map(e).join(' · ')}</small>${resmiDegil(b) && b.notlar ? `<p class="mz-uyari-not">${e(b.notlar)}</p>` : ''}${b.ozet ? `<p>${e(b.ozet)}</p>` : ''}${b.kaynak && /^https:\/\//.test(b.kaynak) ? `<a class="dg-baglanti" href="${e(b.kaynak)}" target="_blank" rel="noopener">Resmî kaynak</a>` : ''}</div></li>`).join('')}</ul></details></div>`;
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
