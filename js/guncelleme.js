// Yeni sürüm bildirimi ve güncelleme (v231).
// Neden yeniden yazıldı (18 Kas 2026, Eyüp Bey uyarıyı göremedi):
//  · Site GitHub Pages'te; sayfa ve dosyalar CDN'de 10 dakika (max-age=600) tutulur ve CDN tarayıcının "yeniden sor" isteğini dinlemez.
//    Yayından sonraki dakikalarda düz yenileme eski index.html'i getiriyordu: eski sürüm açılıyor, şerit (yalnız sayfadaydı) kayboluyordu.
//  · Denetim yalnız açılıştan 4 sn sonra ve sekme öne gelince yapılıyordu; masaüstünde hep açık duran sekme yeni sürümü hiç duymuyordu.
//  · Şerit küçük koyu bir haptı (z-index 60): öğretmenin ders ekranı (z 300) ve tam ekran akışlar onu örtüyordu.
// Şimdi: sürüm surum.json'dan (her seferinde sunucudan) okunur, bilinen yeni sürüm cihazda saklanır; yenileme ve kapatıp açmada
// bildirim yine çıkar, yalnız yeni sürüm gerçekten açılınca kalkar. "Şimdi güncelle" önbelleği temizler, servis çalışanını yeniler ve
// sayfayı CDN'i atlayan bir adresle açar; açılan sürüm denetlenir, olmadıysa bir kez daha denenir.
import { pencere, kapatPencere, bildir, e } from './ui.js?v=235';

export const KURULU = +(new URL(import.meta.url).searchParams.get('v') || 0);
const K_YENI = 'sinyal-yeni-surum';        // { v, ilk, notlar } sunucuda görülen, henüz kurulmamış sürüm
const K_HEDEF = 'sinyal-guncelle-hedef';   // { v, t, n } "Şimdi güncelle"ye basıldı: açılınca bu sürüm bekleniyor
const K_SON = 'sinyal-son-surum';          // bu cihazda en son açılan sürüm (güncellendi onayı için)
const K_HATIR = 'sinyal-guncelle-hatir';   // uzun bekleyen güncelleme penceresi en son hangi gün gösterildi
const PARAM = 'sg';                        // güncelleme adresindeki CDN atlatma eki; açılınca adresten silinir

const oku = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (x) { return null; } };
const yaz = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (x) { } };

// durum: yeni = { v, ilk, notlar } | null; bakiliyor; son = son başarılı denetim zamanı; hata = son denetim sunucuya ulaşamadı
const D = { yeni: null, bakiliyor: false, son: 0, hata: false, notlar: {} };
const gunFark = t => Math.floor((Date.now() - t) / 864e5);

/* ---------- sunucudaki sürüm ---------- */
// surum.json'daki "anahtar" ?v=NNN biçimindedir: sürüm aracı (sinyal-kaynak/arac/surum.py) onu da kendiliğinden yükseltir.
// ?surum= eki servis çalışanının (sw.js) ve CDN'in önbelleğini atlar; no-store tarayıcı önbelleğine de yazdırmaz.
async function sunucuSurumu() {
  const ek = '?surum=' + Date.now().toString(36);
  try {
    const r = await fetch('surum.json' + ek, { cache: 'no-store' });
    if (r.ok) { const j = await r.json(), v = +String(j.anahtar || '').replace(/\D/g, ''); if (v) return { v, notlar: j.notlar || {} }; }
  } catch (x) { }
  // surum.json yoksa ya da bozuksa: sayfanın kendisi (uygulamanın açılırken yükleyeceği sürüm budur)
  const t = await (await fetch('./' + ek, { cache: 'no-store' })).text();
  const v = +((t.match(/(?:baslat|app)\.js\?v=(\d+)/) || [])[1] || 0);
  if (!v) throw new Error('sürüm okunamadı');
  return { v, notlar: {} };
}

// Sunucuya sorar; sonuç cihaza yazılır ve bütün güncelleme alanları yeniden çizilir. elle: kullanıcı "Güncellemeleri denetle"ye bastı.
export async function denetle(elle = false) {
  if (D.bakiliyor) return D;
  D.bakiliyor = true; ciz();
  try {
    if (elle) try { const r = await navigator.serviceWorker?.getRegistration(); if (r) r.update().catch(() => { }); } catch (x) { }
    const s = await sunucuSurumu();
    D.son = Date.now(); D.hata = false; D.notlar = s.notlar;
    if (s.v > KURULU) { const eski = oku(K_YENI); D.yeni = { v: s.v, ilk: (eski && eski.ilk) || Date.now(), notlar: s.notlar }; yaz(K_YENI, D.yeni); }
    else { D.yeni = null; yaz(K_YENI, null); }
  } catch (x) { D.hata = true; }
  D.bakiliyor = false; ciz();
  if (elle) { if (D.hata) bildir('Sunucuya ulaşılamadı; internet bağlantınızı kontrol edip tekrar deneyin', 'uyari'); else if (!D.yeni) bildir('Güncelsiniz · v' + KURULU + ' en son sürüm'); }
  return D;
}

/* ---------- temiz güncelleme ---------- */
let gecis = false;
export async function guncelle() {
  if (gecis) return; gecis = true; ciz();
  // önce sunucu gerçekten ulaşılabilir mi: çevrimdışıyken önbellek silinirse uygulama hiç açılmaz
  await denetle();
  if (D.hata) { gecis = false; ciz(); bildir('Sunucuya ulaşılamadı; internet gelince tekrar deneyin. Uygulama bu arada çalışmaya devam ediyor.', 'uyari'); return; }
  const hedef = D.yeni ? D.yeni.v : KURULU, onceki = oku(K_HEDEF);
  yaz(K_HEDEF, { v: hedef, t: Date.now(), n: onceki && onceki.v === hedef && Date.now() - onceki.t < 5 * 60e3 ? (onceki.n || 0) + 1 : 1 });
  try { await Promise.all((await caches.keys()).filter(k => k.startsWith('sinyal-')).map(k => caches.delete(k))); } catch (x) { }
  try {
    const r = await navigator.serviceWorker?.getRegistration();
    if (r) {
      await Promise.race([r.update().catch(() => { }), new Promise(z => setTimeout(z, 3000))]);
      const w = r.waiting || r.installing;
      // bekleyen yeni servis çalışanı hemen devreye girsin (sw.js 'atla' mesajı)
      if (w && navigator.serviceWorker.controller) { w.postMessage('atla'); await new Promise(z => { navigator.serviceWorker.addEventListener('controllerchange', z, { once: true }); setTimeout(z, 2500); }); }
    }
  } catch (x) { }
  yeniAdresleAc(hedef);
}
// CDN eski sayfayı vermesin: sorgu eki farklı adres sayılır, sayfa doğrudan sunucudan gelir (açılınca ek silinir)
function yeniAdresleAc(v) {
  const u = new URL(location.href); u.searchParams.set(PARAM, v + '-' + Date.now().toString(36));
  location.replace(u.pathname + u.search + u.hash);
}

/* ---------- görünüm ---------- */
const SIMGE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/><path d="M12 8v5l3 2"/></svg>';
const notListesi = (bas, bit) => Object.keys(D.notlar || {}).map(Number).filter(v => v > bas && v <= bit).sort((a, b) => b - a);
const bekleme = () => { const g = D.yeni ? gunFark(D.yeni.ilk) : 0; return g >= 1 ? `Güncelleme ${g} gündür bekliyor.` : ''; };
// Neler yeni? penceresi: kurulu sürümden sonraki sürümlerin notları (yeni sürüm yoksa bu sürümün notları)
export function notlarAc() {
  const l = D.yeni ? notListesi(KURULU, D.yeni.v) : notListesi(KURULU - 1, KURULU);
  if (!l.length) return;
  pencere({
    baslik: 'Neler yeni?', alt: true,
    icerik: l.map(v => `<h3 class="sg-not-bas">v${v}${v === KURULU ? ' · kurulu' : ''}</h3><ul class="sg-not">${(D.notlar[v] || []).map(m => `<li>${e(m)}</li>`).join('')}</ul>`).join(''),
    altlik: D.yeni ? '<button class="dg dg-cizgi" data-kapat>Sonra</button><button class="dg dg-ana" data-sg-guncelle>Şimdi güncelle</button>' : '<button class="dg dg-ana" data-kapat>Tamam</button>',
  });
}
const notVar = () => (D.yeni ? notListesi(KURULU, D.yeni.v) : notListesi(KURULU - 1, KURULU)).length > 0;

// bildirimin anlamsız olduğu yerler: tanıtım sitesi (giriş yapmamış ziyaretçi) ve kursiyerin açtığı imza linki
function gizliYer() {
  if (location.hash.startsWith('#/imza/')) return true;
  const t = document.getElementById('tanitim');
  return !!(t && !t.hidden && t.getClientRects().length);
}
// alttaki sabit menülerin (kurs alt menüsü, öğrenci/öğretmen sekmeleri) üstünde dursun
function altBosluk() {
  let ust = innerHeight;
  document.querySelectorAll('.alt-menu, .ox-sekme, .og-sekme, .portal-sekme').forEach(m => {
    const r = m.getBoundingClientRect(); if (!r.height || r.bottom < innerHeight - 4 || getComputedStyle(m).position !== 'fixed') return;
    ust = Math.min(ust, r.top);
  });
  return Math.max(0, innerHeight - ust);
}
function seritCiz() {
  let s = document.getElementById('sg-serit');
  if (!D.yeni || gizliYer()) { if (s) s.remove(); document.body.classList.remove('sg-var'); return; }
  if (!s) { s = document.createElement('div'); s.id = 'sg-serit'; s.className = 'sg-serit'; s.setAttribute('role', 'status'); document.body.appendChild(s); }
  const g = gunFark(D.yeni.ilk), not = notVar();
  s.classList.toggle('sg-acil', g >= 1);
  s.innerHTML = `<span class="sg-ik">${SIMGE}</span><span class="sg-metin"><b>Yeni sürüm var (v${D.yeni.v})</b><small>${g >= 1 ? e(bekleme()) + ' ' : 'Düzeltmeler ve yenilikler hazır. '}${not ? '<button type="button" class="sg-bag" data-sg-notlar>Neler yeni?</button>' : ''}</small></span>`
    + `<button type="button" class="sg-dg" data-sg-guncelle ${gecis ? 'aria-busy="true" disabled' : ''}>${gecis ? 'Güncelleniyor…' : 'Şimdi güncelle'}</button>`;
  const alt = altBosluk();
  s.style.bottom = alt ? alt + 12 + 'px' : '';
  document.body.classList.add('sg-var');
  kartaBak();
}
// Kurs ana ekranının üstündeki sarı kart ekrandayken alttaki şerit aynı şeyi ikinci kez söylemesin
function kartaBak() {
  const s = document.getElementById('sg-serit'); if (!s) return;
  const k = document.querySelector('[data-sg-alan="ust"] .sg-kart'), r = k && k.getBoundingClientRect();
  s.classList.toggle('sg-sakla', !!(r && r.bottom > 56 && r.top < innerHeight - 40));
}

// Kısa durum metni (Hesabım satırı, öğretmen/öğrenci ekranı)
export function kisaMetin() {
  if (gecis) return 'Güncelleniyor…';
  if (D.bakiliyor) return 'Denetleniyor…';
  if (D.yeni) return `Yeni sürüm var (v${D.yeni.v}) · dokunun, güncelleyin`;
  if (D.hata) return `v${KURULU} · sunucuya ulaşılamadı, tekrar deneyin`;
  return `v${KURULU} · ${D.son ? 'güncelsiniz' : 'güncellemeleri denetle'}`;
}
const saat = t => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
// Kurs ana ekranı alanı: yeni sürüm varsa üstte sarı kart, her zaman en altta sade sürüm satırı
function alanHtml(yer) {
  if (yer === 'ust') {
    if (!D.yeni) return '';
    return `<div class="sg-kart" role="status"><span class="sg-ik">${SIMGE}</span><div class="sg-kart-metin"><b>Yeni sürüm var: v${D.yeni.v}</b><span>Bu cihazda v${KURULU} açık. ${e(bekleme())} Güncelleme birkaç saniye sürer; kayıtlı bilgileriniz kaybolmaz.</span></div>`
      + `<div class="sg-kart-dg">${notVar() ? '<button type="button" class="dg dg-cizgi" data-sg-notlar>Neler yeni?</button>' : ''}<button type="button" class="dg dg-koyu" data-sg-guncelle ${gecis ? 'disabled' : ''}>${gecis ? 'Güncelleniyor…' : 'Şimdi güncelle'}</button></div></div>`;
  }
  const durum = gecis ? 'Güncelleniyor…' : D.bakiliyor ? 'Denetleniyor…' : D.yeni ? `Yeni sürüm var: v${D.yeni.v}` : D.hata ? 'Sunucuya ulaşılamadı' : D.son ? `Güncelsiniz · son denetim ${saat(D.son)}` : 'Güncelleme durumu';
  return `<div class="sg-satir${D.yeni ? ' sg-satir-yeni' : ''}"><span class="sg-satir-metin"><b>mdSinyal v${KURULU}</b><small>${e(durum)}${!D.yeni && notVar() ? ' · <button type="button" class="sg-bag" data-sg-notlar>Bu sürümde neler var?</button>' : ''}</small></span>`
    + (D.yeni ? `<button type="button" class="dg dg-koyu dg-kucuk" data-sg-guncelle ${gecis ? 'disabled' : ''}>Şimdi güncelle</button>` : `<button type="button" class="dg dg-cizgi dg-kucuk" data-sg-denetle ${D.bakiliyor ? 'disabled' : ''}>Güncellemeleri denetle</button>`) + '</div>';
}
// Kurs ana ekranı (#/genel) çizildikten sonra app.js çağırır: sayfanın başına ve sonuna güncelleme alanı eklenir
export function anaEkranaEkle(kap) {
  ['ust', 'alt'].forEach(y => { const d = document.createElement('div'); d.dataset.sgAlan = y; d.innerHTML = alanHtml(y); y === 'ust' ? kap.prepend(d) : kap.append(d); });
}
export function ciz() {
  seritCiz();
  document.querySelectorAll('[data-sg-alan]').forEach(d => { d.innerHTML = alanHtml(d.dataset.sgAlan); });
  document.querySelectorAll('[data-sg-metin]').forEach(d => { d.textContent = kisaMetin(); });
}

// Güncelleme uzun süre (3+ gün) bekliyorsa günde bir kez pencere: işi bölmez, "Sonra" ile kapanır
function hatirlat() {
  if (!D.yeni || gunFark(D.yeni.ilk) < 3 || gizliYer() || document.querySelector('.perde')) return;
  const bugun = new Date().toDateString(); if (oku(K_HATIR) === bugun) return; yaz(K_HATIR, bugun);
  pencere({
    baslik: 'Uygulamanız eski sürümde', alt: true,
    icerik: `<p style="margin:0 0 8px">Bu cihazda <b>v${KURULU}</b> açık; <b>v${D.yeni.v}</b> ${gunFark(D.yeni.ilk)} gündür hazır. Yeni düzeltmeleri almak için güncelleyin.</p><p style="margin:0;color:var(--soluk)">Güncelleme birkaç saniye sürer; kayıtlı bilgileriniz kaybolmaz.</p>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Sonra</button><button class="dg dg-ana" data-sg-guncelle>Şimdi güncelle</button>',
  });
}

/* ---------- başlangıç ---------- */
let basladi = false;
export function baslat() {
  if (basladi) return; basladi = true;
  // güncelleme adresindeki eki temizle (yer imine, paylaşılan linke geçmesin)
  const u = new URL(location.href);
  if (u.searchParams.has(PARAM)) { u.searchParams.delete(PARAM); try { history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (x) { } }
  const son = +(oku(K_SON) || 0), hedef = oku(K_HEDEF);
  yaz(K_SON, Math.max(son, KURULU));
  const yeni = oku(K_YENI);
  if (yeni && yeni.v > KURULU) D.yeni = yeni; else if (yeni) yaz(K_YENI, null);
  if (yeni && yeni.notlar) D.notlar = yeni.notlar;
  if (hedef && hedef.v > KURULU) {
    // güncelleme istendi ama eski sürüm açıldı (sunucu yayını henüz dağıtmamış olabilir): kısa sürede bir kez daha dene
    if ((hedef.n || 1) < 2 && Date.now() - hedef.t < 2 * 60e3) { setTimeout(guncelle, 1500); }
    else { yaz(K_HEDEF, null); setTimeout(() => bildir('Güncelleme henüz tamamlanamadı; sunucu yeni sürümü dağıtıyor olabilir. Birkaç dakika sonra “Şimdi güncelle”ye tekrar basın.', 'uyari'), 1200); }
  } else if (hedef || (son && KURULU > son)) {
    yaz(K_HEDEF, null);
    setTimeout(() => bildir('Güncelleme tamam · v' + KURULU + ' kuruldu'), 1200);
  }
  ciz();
  // Bu cihaz daha yeni bir sürümü zaten açmıştı ama şimdi eskisi geldi (CDN eski sayfayı verdi, servis çalışanı yok/eski):
  // sunucu da yeni sürümü söylüyorsa sayfa bir kez, sessizce CDN'i atlayan adresle yeniden açılır
  if (son > KURULU && !hedef) denetle().then(() => {
    let once = 0; try { once = +sessionStorage.getItem('sg-oto') || 0; } catch (x) { }
    if (!D.yeni || son < D.yeni.v || Date.now() - once < 2 * 60e3) return;
    try { sessionStorage.setItem('sg-oto', String(Date.now())); } catch (x) { }
    yeniAdresleAc(D.yeni.v);
  });
  // denetim: açılışta, uygulama öne gelince, internet gelince ve açık kaldıkça 5 dakikada bir
  let sonDenetim = 0;
  const bak = (zorla) => { if (document.visibilityState !== 'visible') return; if (!zorla && Date.now() - sonDenetim < 30e3) return; sonDenetim = Date.now(); denetle().then(hatirlat); };
  setTimeout(() => bak(true), 1500);
  document.addEventListener('visibilitychange', () => bak());
  addEventListener('focus', () => bak());
  addEventListener('online', () => bak(true));
  setInterval(() => bak(true), 5 * 60e3);
  addEventListener('hashchange', () => setTimeout(seritCiz, 50));
  addEventListener('resize', () => { const s = document.getElementById('sg-serit'); if (s) seritCiz(); });
  let kare = 0; addEventListener('scroll', () => { if (kare) return; kare = requestAnimationFrame(() => { kare = 0; kartaBak(); }); }, { passive: true, capture: true });
  // ekran değişince (giriş → panel, öğretmen sekmeleri) şerit yerini ve görünürlüğünü yeniden hesaplar
  new MutationObserver(() => { clearTimeout(gozcu); gozcu = setTimeout(seritCiz, 120); }).observe(document.getElementById('uyg') || document.body, { childList: true });
  document.addEventListener('click', ev => {
    const g = ev.target.closest('[data-sg-guncelle]'); if (g) { ev.preventDefault(); if (document.querySelector('.perde')) kapatPencere(); return guncelle(); }
    const n = ev.target.closest('[data-sg-notlar]'); if (n) { ev.preventDefault(); return notlarAc(); }
    const d = ev.target.closest('[data-sg-denetle]'); if (d) { ev.preventDefault(); return D.yeni ? guncelle() : denetle(true); }
  });
}
let gozcu = 0;
