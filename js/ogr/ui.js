// Öğrenci uygulaması tasarım dili (ox-): renkler, yazı ölçüleri, simgeler ve ortak bileşenler.
// Bütün öğrenci ekranları yalnız bu bileşenlerle kurulur; ekranlara özel küçük kurallar her modülün kendi stilEkle() çağrısındadır.
// Not: css/app.css geç yüklenir; bu yüzden öğrenci stilleri JS ile hemen eklenir ve bütün sınıflar ox- önekidir.

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- stil ekleme ---------- */
const eklenen = new Set();
export function stilEkle(ad, css) {
  if (eklenen.has(ad) || typeof document === 'undefined') return;
  eklenen.add(ad);
  const s = document.createElement('style'); s.dataset.ox = ad; s.textContent = css; document.head.appendChild(s);
}

/* ---------- simgeler (24×24, 1.8 çizgi; yuvarlak uçlar) ---------- */
const P = {
  ev: '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
  takvim: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/><path d="M8 13.4h.01M12 13.4h.01M16 13.4h.01M8 16.8h.01M12 16.8h.01" stroke-width="2.4"/>',
  kitap: '<path d="M12 6.6C10.4 5.2 8 4.5 3.5 4.5v14c4.5 0 6.9.7 8.5 2 1.6-1.3 4-2 8.5-2v-14c-4.5 0-6.9.7-8.5 2.1z"/><path d="M12 6.6v13.9"/>',
  kart: '<rect x="2.8" y="5" width="18.4" height="14" rx="2.6"/><path d="M2.8 9.6h18.4M6.5 15h3"/>',
  belge: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 16.8h6"/>',
  sag: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
  sol: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  asagi: '<path d="m6 9.5 6 6 6-6"/>',
  yukari: '<path d="m6 14.5 6-6 6 6"/>',
  ok: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  kapat: '<path d="M6 6l12 12M18 6 6 18"/>',
  tik: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  ara: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  pano: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/>',
  panoSoru: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M10 11a2.1 2.1 0 1 1 3 1.9c-.6.3-1 .8-1 1.5v.4"/><path d="M12 17.6h.01" stroke-width="2.4"/>',
  panoTik: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="m9 13.2 2.2 2.2 4-4.4"/>',
  panoListe: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.2"/><path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M12 11h4M12 15.5h4M8.5 11h.01M8.5 15.5h.01" /> ',
  kartlar: '<rect x="7.5" y="3.5" width="13" height="13" rx="2.4"/><path d="M16.5 16.5v1.6a2.4 2.4 0 0 1-2.4 2.4H5.9a2.4 2.4 0 0 1-2.4-2.4V9.9a2.4 2.4 0 0 1 2.4-2.4h1.6"/><path d="M12.4 8.2a1.8 1.8 0 1 1 2.6 1.6c-.5.3-.9.7-.9 1.3v.2"/><path d="M14 13.6h.01" stroke-width="2.3"/>',
  direksiyon: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.4"/><path d="M3.6 12h6M14.4 12h6M12 14.4v6"/>',
  kisi: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c.8-3.8 3.7-5.8 7.5-5.8s6.7 2 7.5 5.8"/>',
  arac: '<path d="M5 16.5h14M3.5 16.5v-3.3c0-.7.3-1.3.8-1.7L6.5 9.8 8 6.2A1.8 1.8 0 0 1 9.7 5h4.6A1.8 1.8 0 0 1 16 6.2l1.5 3.6 2.2 1.7c.5.4.8 1 .8 1.7v3.3"/><path d="M6.5 9.8h11"/><circle cx="7.5" cy="16.8" r="1.8"/><circle cx="16.5" cy="16.8" r="1.8"/>',
  saat: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  kronometre: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M10 2.5h4M18.5 6l1.2-1.2"/>',
  yildiz: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  ses: '<path d="M11 5 6.5 8.8H3.8v6.4h2.7L11 19z"/><path d="M15.2 9a4.3 4.3 0 0 1 0 6M17.8 6.4a8 8 0 0 1 0 11.2"/>',
  sesKapali: '<path d="M11 5 6.5 8.8H3.8v6.4h2.7L11 19z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  oynat: '<path d="M8 5.5v13l10.5-6.5z"/>',
  duraklat: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="2.6"/>',
  bilgi: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2"/><path d="M12 7.8h.01" stroke-width="2.4"/>',
  uyari: '<path d="M10.3 4.3 2.9 17.4A2 2 0 0 0 4.6 20.4h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.2"/><path d="M12 16.9h.01" stroke-width="2.4"/>',
  yazici: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  mesaj: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.4-4.5A8.4 8.4 0 1 1 20.5 11.6z"/>',
  fis: '<path d="M5.5 3.5h13v17l-2.2-1.4-2.1 1.4-2.2-1.4-2.2 1.4-2.1-1.4-2.2 1.4z"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5"/>',
  kimlik: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.8"/><circle cx="12" cy="10" r="2.8"/><path d="M7 17.5c.8-2.2 2.6-3.4 5-3.4s4.2 1.2 5 3.4"/>',
  bayrak: '<path d="M5 21V4.5M5 4.5h11.5l-2 4 2 4H5"/>',
  sifirla: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 3.8v4.8h4.8"/>',
  liste: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />',
  izgara: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  kilit: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>',
  tel: '<path d="M20.5 16.6v2.6a1.8 1.8 0 0 1-2 1.8A17.6 17.6 0 0 1 3 5.5a1.8 1.8 0 0 1 1.8-2h2.6a1.8 1.8 0 0 1 1.8 1.5c.1.9.4 1.8.7 2.6a1.8 1.8 0 0 1-.4 1.9l-1.1 1.1a14 14 0 0 0 5 5l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.7.6 2.6.7a1.8 1.8 0 0 1 1.5 1.8z"/>',
  hedef: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" stroke-width="2.4"/>',
  grafik: '<path d="M4 20h16M6.5 16.5v-4M11 16.5V8M15.5 16.5v-6M20 16.5V5.5"/>',
  gecmis: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 3.8v4.8h4.8M12 8v4.3l2.8 1.7"/>',
  harita: '<path d="M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z"/><path d="M9 4.5v12.7M15 6.8v12.7"/>',
  koni: '<path d="M9.8 4h4.4l4.3 14.5H5.5z"/><path d="M3.5 20.5h17M8 12h8M8.9 8.5h6.2"/>',
  yanlis: '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
  dogru: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.3"/>',
  arti: '<path d="M12 5v14M5 12h14"/>',
  goz: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  indir: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15"/>',
  dis: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5.5"/>',
  motor: '<path d="M7 8h7l2 2h2.5v3H20v-2h1.5v6H20v-2h-1.5v2.5H16l-2 2H8.5L6 17H4.5v-3h-1v-3.5h1V8z"/><path d="M9.5 8V5.5h4M11.5 5.5V8"/>',
  ampul: '<path d="M9 17.5h6M10 20.5h4M8.2 14.3A6 6 0 1 1 15.8 14.3c-.7.6-1 1.3-1 2.2v1H9.2v-1c0-.9-.3-1.6-1-2.2z"/>',
  ikaz: '<path d="M12 3.5 3 19.5h18z"/><path d="M12 9.5v4.5"/><path d="M12 16.8h.01" stroke-width="2.4"/>',
  kalkan: '<path d="M12 3.5 4.5 6.3v5.5c0 4.6 3.2 7.8 7.5 8.7 4.3-.9 7.5-4.1 7.5-8.7V6.3z"/><path d="m8.8 12.2 2.2 2.2 4.2-4.3"/>',
  ilkyardim: '<rect x="3.5" y="7" width="17" height="12.5" rx="2.4"/><path d="M9 7V5.3A1.3 1.3 0 0 1 10.3 4h3.4A1.3 1.3 0 0 1 15 5.3V7M12 10.5v5.5M9.2 13.2h5.6"/>',
  trafik: '<rect x="8" y="2.5" width="8" height="15" rx="3"/><circle cx="12" cy="6.2" r="1.2"/><circle cx="12" cy="10" r="1.2"/><circle cx="12" cy="13.8" r="1.2"/><path d="M12 17.5v4"/>',
  piston: '<rect x="6.5" y="3.5" width="11" height="7.5" rx="1.6"/><path d="M6.5 6.2h11M10 11l-1.2 5.3M14 11l1.2 5.3"/><circle cx="12" cy="18.3" r="2.4"/>',
  kalp: '<path d="M12 20s-7.5-4.5-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.5 12 20 12 20z"/>',
  wp: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.4-4.5A8.4 8.4 0 1 1 20.5 11.6z"/><path d="M9 8.8c0 3 2.3 5.6 5.5 6.2l1-1.4-1.6-1-1 .7a4 4 0 0 1-2.2-2.2l.7-1-1-1.6z"/>',
  cikis: '<path d="M14.5 4.5H18a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5M10 16.5 5.5 12 10 7.5M5.5 12h10"/>',
  ayar: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1h-.2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5v-.2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
};
// oi('ev') → <svg>; dolu simge için oi('yildiz', 'dolu')
export const oi = (ad, ek = '') => `<svg class="ox-i ${ek}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[ad] || P.bilgi}</svg>`;
export const simgeVar = ad => !!P[ad];

/* ---------- küçük yardımcılar ---------- */
const nit = a => !a ? '' : typeof a === 'string' ? ' ' + a : Object.entries(a).filter(([, v]) => v != null && v !== false).map(([k, v]) => v === true ? ` ${k}` : ` ${k}="${esc(v)}"`).join('');
// sayılar Türkçe: 10.650 ₺
export const tl = n => (Math.round(n) || 0).toLocaleString('tr-TR') + ' ₺';
export const ad2 = no => String(no).padStart(2, '0');

/* ---------- üst çubuk (marka) ---------- */
export function ustCubuk({ logo, kurs, ad, foto }) {
  const harf = String(ad || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr');
  return `<header class="ox-ust"><div class="ox-ust-ic"><span class="ox-marka">${logo}<span class="ox-marka-ad"><b><i>md</i>Sinyal</b><small>${esc(kurs)}</small></span></span>
    <button type="button" class="ox-avatar" data-hesap aria-label="Hesabım: ${esc(ad)}">${foto ? `<img src="${esc(foto)}" alt="">` : harf}</button></div></header>`;
}

/* ---------- alt sekme çubuğu ---------- */
export const SEKMELER = [['durum', 'Ana sayfa', 'ev'], ['ders', 'Derslerim', 'takvim'], ['sinav', 'Öğren', 'kitap'], ['odeme', 'Ödeme', 'kart'], ['evrak', 'Belgeler', 'belge']];
export const sekmeCubugu = (secili, rozet = {}) => `<nav class="ox-sekme" aria-label="Öğrenci uygulaması">${SEKMELER.map(([k, t, i]) => `<button type="button" data-ogs="${k}" class="${k === secili ? 'secili' : ''}" ${k === secili ? 'aria-current="page"' : ''}><span class="ox-sekme-ik">${oi(i)}${rozet[k] ? `<em>${rozet[k]}</em>` : ''}</span><span>${t}</span></button>`).join('')}</nav>`;

/* ---------- sayfa iskeleti ---------- */
// sayfa başlığı: büyük başlık, altında tek satır açıklama; sağda (isteğe bağlı) mavi sayaç ya da bağlantı
export const sayfaBas = (baslik, alt = '', sag = '') => `<header class="ox-sayfa-bas"><div><h1>${baslik}</h1>${alt ? `<p>${alt}</p>` : ''}</div>${sag ? `<span class="ox-sayfa-sag">${sag}</span>` : ''}</header>`;
// alt ekranlarda üstteki geri bağlantısı: "‹ Öğren"
export const geri = (etiket, attrs) => `<button type="button" class="ox-geri"${nit(attrs)}>${oi('sol')}<span>${etiket}</span></button>`;
// bölüm başlığı: solda başlık, sağda sayaç (gri) ya da bağlantı (mavi düğme olarak verilir)
export const bolum = (baslik, sag = '') => `<div class="ox-bolum"><h2>${baslik}</h2>${sag ? `<span class="ox-bolum-sag">${sag}</span>` : ''}</div>`;
export const baglanti = (metin, attrs, okVar = false) => `<button type="button" class="ox-bag"${nit(attrs)}>${metin}${okVar ? oi('ok') : ''}</button>`;

/* ---------- kartlar ---------- */
export const kart = (icerik, cls = '', attrs) => `<div class="ox-kart ${cls}"${nit(attrs)}>${icerik}</div>`;
// açık mavi büyük kart (ilk adımın, kalan borcun, kayıt evrakların…). gorsel: img/ogr altındaki çizimin adı
export function heroKart({ ust = '', baslik = '', alt = '', meta = '', gorsel: g = '', dugme: d = '', icerik = '', cls = '' }) {
  return `<section class="ox-hero ${g ? 'gorselli' : ''} ${cls}"><div class="ox-hero-yazi">${ust ? `<p class="ox-hero-ust">${ust}</p>` : ''}${baslik ? `<h2>${baslik}</h2>` : ''}${alt ? `<p class="ox-hero-alt">${alt}</p>` : ''}${meta ? `<p class="ox-hero-meta">${meta}</p>` : ''}</div>${g ? gorsel(g, '', 'ox-hero-gorsel') : ''}${icerik}${d ? `<div class="ox-hero-dg">${d}</div>` : ''}</section>`;
}
// çizim: img/ogr/<ad>.webp — boyutu CSS'te sabit, yüklenirken yer kaplar (kayma olmaz)
export const gorsel = (ad, alt = '', cls = '') => `<img class="ox-gorsel ${cls}" src="img/ogr/${ad}.webp?v=1" alt="${esc(alt)}" decoding="async" draggable="false">`;

/* ---------- düğmeler ---------- */
// tur: ana (dolu mavi) | ikincil (açık mavi) | cizgi (beyaz, çerçeveli) | metin (yalnız mavi yazı) | tehlike
export function dugme(metin, attrs, { tur = 'ana', ok = false, genis = false, ikon = '', kucuk = false } = {}) {
  return `<button type="button" class="ox-dg ox-dg-${tur}${genis ? ' genis' : ''}${kucuk ? ' kucuk' : ''}${ok ? ' okl' : ''}"${nit(attrs)}>${ikon ? oi(ikon) : ''}<span>${metin}</span>${ok ? oi('ok') : ''}</button>`;
}

/* ---------- liste satırları ---------- */
// renk tonları: mavi, yesil, kirmizi, turuncu, mor, gri, sari
export const ikonKutu = (ikon, ton = 'mavi', buyuk = false) => `<span class="ox-ik-kutu ${ton}${buyuk ? ' buyuk' : ''}">${ikon.startsWith('<') ? ikon : oi(ikon)}</span>`;
// satir({ ikon, ton, baslik, alt, sag, attrs, ok }) → bir liste satırı (düğme ya da div)
export function satir({ ikon = '', ton = 'mavi', sol = '', baslik = '', alt = '', altTon = '', sag = '', attrs, ok = true, etiket = 'button', cls = '' }) {
  const t = attrs ? etiket : 'div';
  return `<${t}${t === 'button' ? ' type="button"' : ''} class="ox-satir ${cls}"${nit(attrs)}>${sol || (ikon ? ikonKutu(ikon, ton) : '')}<span class="ox-satir-govde"><b>${baslik}</b>${alt ? `<small class="${altTon}">${alt}</small>` : ''}</span>${sag ? `<span class="ox-satir-sag">${sag}</span>` : ''}${ok && attrs ? `<span class="ox-chev">${oi('sag')}</span>` : ''}</${t}>`;
}
// liste: satırları tek beyaz kartta, aralarında ince ayraçla toplar
export const liste = (satirlar, cls = '') => `<div class="ox-liste ${cls}">${satirlar.join('')}</div>`;
// numaralı konu satırı: "01  Temel kavramlar  ›" (sıradaki konu mavi daire içinde oynat simgesi)
export function konuSatir({ no, ad, attrs, durum = '' }) {
  const sag = durum === 'bitti' ? `<span class="ox-konu-d bitti">${oi('tik')}</span>` : durum === 'siradaki' ? `<span class="ox-konu-d siradaki">${oi('oynat')}</span>` : `<span class="ox-chev">${oi('sag')}</span>`;
  return `<button type="button" class="ox-konu ${durum}"${nit(attrs)}><span class="ox-konu-no">${ad2(no)}</span><span class="ox-konu-ad">${ad}</span>${sag}</button>`;
}

/* ---------- küçük parçalar ---------- */
export const cip = (metin, ton = 'mavi') => `<span class="ox-cip ${ton}">${metin}</span>`;
export const serit = (oran, ton = 'mavi', ince = false) => `<span class="ox-serit ${ton}${ince ? ' ince' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.max(0, Math.min(100, oran)))}"><i style="width:${Math.max(0, Math.min(100, oran))}%"></i></span>`;
export const ayrac = () => '<hr class="ox-ayrac">';
export const not = (metin, ikon = 'bilgi') => `<p class="ox-not">${oi(ikon)}<span>${metin}</span></p>`;
export const bos = (ikon, baslik, alt = '', dg = '') => `<div class="ox-bos">${ikonKutu(ikon, 'mavi', true)}<b>${baslik}</b>${alt ? `<p>${alt}</p>` : ''}${dg}</div>`;
// sekmeler: cizgi (Derslerim: Programım / Gelişim / Geçmiş) ya da hap (Test ayarları: Karışık / Konu seç)
export const sekmeler = (liste2, secili, attr, tur = 'cizgi') => `<div class="ox-sekmeler ${tur}" role="tablist">${liste2.map(([k, t]) => `<button type="button" role="tab" aria-selected="${k === secili}" class="${k === secili ? 'secili' : ''}" ${attr}="${k}">${t}</button>`).join('')}</div>`;
export const kutucuk = (metin, secili, attrs) => `<button type="button" class="ox-kutucuk ${secili ? 'secili' : ''}" role="checkbox" aria-checked="${!!secili}"${nit(attrs)}><span class="ox-kutucuk-k">${oi('tik')}</span><span>${metin}</span></button>`;
export const radyo = (metin, secili, attrs) => `<button type="button" class="ox-radyo ${secili ? 'secili' : ''}" role="radio" aria-checked="${!!secili}"${nit(attrs)}><span class="ox-radyo-k"></span><span>${metin}</span></button>`;

/* ---------- tam ekran akışlar (ders, deneme, inceleme) ---------- */
// akisUst: solda kapat (×), ortada ilerleme/sayaç, sağda isteğe bağlı simge düğmesi
export const akisUst = ({ kapat = 'data-ox-kapat', orta = '', sag = '', ilerleme = null }) => `<div class="ox-akis-ust"><button type="button" class="ox-ikon-dg" ${kapat} aria-label="Kapat">${oi('kapat')}</button><div class="ox-akis-orta">${orta}${ilerleme != null ? serit(ilerleme, 'mavi', true) : ''}</div><div class="ox-akis-sag">${sag}</div></div>`;
export const akisAlt = icerik => `<div class="ox-akis-alt">${icerik}</div>`;
// soru şıkkı: durum = '' | 'secili' | 'dogru' | 'yanlis' | 'soluk'
export const sik = (harf, metin, durum = '', attrs) => `<button type="button" class="ox-sik ${durum}"${nit(attrs)}><span class="ox-sik-h">${harf}</span><span class="ox-sik-m">${metin}</span>${durum === 'dogru' ? `<span class="ox-sik-d">${oi('tik')}</span>` : durum === 'yanlis' ? `<span class="ox-sik-d">${oi('kapat')}</span>` : ''}</button>`;
// geri bildirim kutusu: "Doğru cevap: C" + açıklama (yeşil ya da kırmızı ton)
export const cevapKutu = (iyi, baslik, metin = '', ek = '') => `<div class="ox-cevap ${iyi ? 'iyi' : 'kotu'}" role="status"><b>${baslik}</b>${metin ? `<p>${metin}</p>` : ''}${ek}</div>`;

/* ---------- tasarım belirteçleri ve ortak stiller ---------- */
stilEkle('ox-temel', `
body.ox-modu{--ox-mavi:#0a66f2;--ox-mavi-bas:#0052cc;--ox-mavi-acik:#e9f1fe;--ox-mavi-orta:#d8e6fd;--ox-hero:#e7f0fd;--ox-hero-2:#eef4fe;
  --ox-zemin:#f7f8fa;--ox-kart:#fff;--ox-cizgi:#e5e9f0;--ox-ayrac:#edf0f4;--ox-bas:#0f1d40;--ox-metin:#2b3653;--ox-ikincil:#5d6783;--ox-soluk:#98a0b5;
  --ox-yesil:#18a058;--ox-yesil-acik:#e6f6ec;--ox-kirmizi:#e5484d;--ox-kirmizi-acik:#fdeeee;--ox-turuncu:#f08c00;--ox-turuncu-acik:#fff3e0;--ox-mor:#6a48d7;--ox-mor-acik:#efeafd;--ox-sari:#ffc21a;--ox-sari-acik:#fff6dc;--ox-gri-acik:#f1f3f7;
  --ox-r:16px;--ox-r-b:20px;--ox-r-dg:12px;--ox-golge:0 1px 2px rgba(16,24,40,.04),0 1px 3px rgba(16,24,40,.03);
  --ox-yazi:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  background:var(--ox-zemin);color:var(--ox-metin);font-family:var(--ox-yazi);-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
body.ox-modu .ogr-kabuk{background:var(--ox-zemin);min-height:100vh}
body.ox-modu .ogr-kabuk>.app-ust{display:none}
.ox,.ox *{box-sizing:border-box}
.ox{font-family:var(--ox-yazi);color:var(--ox-metin);font-size:15px;line-height:1.4;letter-spacing:-.005em;max-width:560px;margin:0 auto;padding:0 16px calc(104px + env(safe-area-inset-bottom))}
:where(.ox,.ox-akis) :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit;-webkit-appearance:none;appearance:none;min-height:0;box-shadow:none}
:where(.ox,.ox-akis) :where(button:disabled){cursor:default}
:where(.ox,.ox-akis) :where(h1,h2,h3,h4,p,ul,ol,figure){margin:0;padding:0}
.ox :focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px;border-radius:10px}
.ox-i{width:22px;height:22px;flex:none;display:block}
.ox-i.dolu{fill:currentColor}

/* üst çubuk */
.ox-ust{display:none}
body.ox-modu .ogr-icerik{padding:0;max-width:none;margin:0}
body.ox-modu .ox-ust{display:block;position:sticky;top:0;z-index:25;padding:calc(10px + env(safe-area-inset-top)) 16px 10px;font-family:var(--ox-yazi);background:rgba(247,248,250,.86);-webkit-backdrop-filter:saturate(180%) blur(18px);backdrop-filter:saturate(180%) blur(18px);border-bottom:.5px solid transparent;transition:border-color .2s}
body.ox-modu.kaydi .ox-ust{border-bottom-color:var(--ox-cizgi)}
body.ox-tam-acik .ox-ust{display:none!important}
.ox-ust-ic{max-width:528px;margin:0 auto;display:flex;align-items:center;gap:12px}
.ox-marka{flex:1;min-width:0;display:flex;align-items:center;gap:11px}
.ox-marka .logo-isaret{width:40px;height:40px;flex:none;filter:drop-shadow(0 2px 4px rgba(20,30,51,.16))}
.ox-marka-ad{min-width:0;display:grid;line-height:1.15}
.ox-marka-ad b{font-size:22px;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas)}
.ox-marka-ad b i{font-style:normal;font-weight:500;opacity:.5;margin-right:1px}
.ox-marka-ad small{font-size:13px;color:var(--ox-ikincil);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.ox-avatar{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:var(--ox-mavi-orta);color:var(--ox-mavi);font-size:16px;font-weight:700;letter-spacing:.01em;box-shadow:0 0 0 2px #fff,0 1px 4px rgba(16,24,40,.12)}
.ox-avatar img{width:100%;height:100%;object-fit:cover}
.ox-avatar:active{opacity:.75}

/* alt sekme çubuğu */
.ox-sekme{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;justify-content:space-around;padding:6px 6px calc(4px + env(safe-area-inset-bottom));background:rgba(255,255,255,.94);-webkit-backdrop-filter:saturate(180%) blur(20px);backdrop-filter:saturate(180%) blur(20px);border-top:.5px solid var(--ox-cizgi);font-family:var(--ox-yazi)}
.ox-sekme button{flex:1;max-width:96px;min-width:0;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:#636c84;font-size:11.5px;font-weight:500;letter-spacing:0;background:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ox-sekme-ik{position:relative;display:grid;place-items:center;width:52px;height:32px;border-radius:12px;transition:background-color .18s}
.ox-sekme-ik .ox-i{width:25px;height:25px;stroke-width:1.75}
.ox-sekme button.secili{color:var(--ox-mavi);font-weight:600}
.ox-sekme button.secili .ox-sekme-ik{background:var(--ox-mavi-orta)}
.ox-sekme button.secili .ox-i{stroke-width:2.05}
.ox-sekme em{position:absolute;top:0;right:8px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--ox-kirmizi);color:#fff;font:600 10.5px/17px var(--ox-yazi);font-style:normal;text-align:center;box-shadow:0 0 0 2px #fff}
@media (min-width:760px){.ox-sekme{left:50%;right:auto;transform:translateX(-50%);bottom:14px;width:500px;border:1px solid var(--ox-cizgi);border-radius:20px;box-shadow:0 14px 34px -16px rgba(16,24,40,.3);padding-bottom:6px}}

/* sayfa başlığı ve bölümler */
.ox-sayfa-bas{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:14px 0 18px}
.ox-sayfa-bas h1{font-size:27px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:var(--ox-bas)}
.ox-sayfa-bas p{margin-top:5px;font-size:15.5px;color:var(--ox-ikincil)}
.ox-sayfa-sag{flex:none;padding-bottom:4px;font-size:16px;font-weight:700;color:var(--ox-mavi);white-space:nowrap}
.ox-geri{display:inline-flex;align-items:center;gap:2px;margin:10px 0 2px -6px;padding:6px 8px 6px 2px;color:var(--ox-mavi);font-size:16px;font-weight:500;border-radius:10px}
.ox-geri .ox-i{width:22px;height:22px;stroke-width:2.1}
.ox-geri+.ox-sayfa-bas{margin-top:4px}
.ox-bolum{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:28px 0 12px}
.ox-bolum h2{font-size:20px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas)}
.ox-bolum-sag{flex:none;font-size:15px;color:var(--ox-ikincil)}
.ox-bag{display:inline-flex;align-items:center;gap:6px;color:var(--ox-mavi);font-size:15.5px;font-weight:600}
.ox-bag .ox-i{width:20px;height:20px;stroke-width:2.1}

/* kartlar */
.ox-kart{background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:var(--ox-r);box-shadow:var(--ox-golge)}
.ox-kart+.ox-kart{margin-top:12px}
button.ox-kart{display:block;width:100%;text-align:left}
button.ox-kart:active,button.ox-satir:active,button.ox-konu:active{background:#f2f5fa}
.ox-hero{position:relative;overflow:hidden;border-radius:var(--ox-r-b);padding:20px 20px 18px;background:linear-gradient(135deg,var(--ox-hero) 0%,var(--ox-hero-2) 100%);border:1px solid #dde9fb}
.ox-hero-yazi{position:relative;z-index:1}
.ox-hero.gorselli .ox-hero-yazi{max-width:56%}
.ox-hero-ust{font-size:14.5px;color:var(--ox-ikincil);margin-bottom:6px}
.ox-hero h2{font-size:23px;line-height:1.15;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas)}
.ox-hero-alt{margin-top:6px;font-size:15px;color:var(--ox-metin)}
.ox-hero-meta{margin-top:10px;font-size:14px;color:var(--ox-ikincil)}
.ox-hero-gorsel{position:absolute;right:8px;top:14px;width:46%;max-width:210px;aspect-ratio:3/2;object-fit:contain;mix-blend-mode:multiply;pointer-events:none}
.ox-hero-dg{position:relative;z-index:1;margin-top:18px}
.ox-gorsel{display:block;user-select:none;-webkit-user-select:none}

/* düğmeler */
.ox-dg{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:var(--ox-r-dg);font-size:16.5px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;transition:background-color .15s,transform .1s}
.ox-dg:active{transform:scale(.985)}
.ox-dg.genis{display:flex;width:100%}
.ox-dg.okl{justify-content:space-between}
.ox-dg.okl.ortala{justify-content:center}
.ox-dg.kucuk{min-height:38px;padding:0 14px;font-size:15px;border-radius:10px}
.ox-dg .ox-i{width:21px;height:21px;stroke-width:2.1}
.ox-dg-ana{background:var(--ox-mavi);color:#fff!important;box-shadow:0 1px 2px rgba(10,102,242,.25)}
.ox-dg-ana:active{background:var(--ox-mavi-bas)}
.ox-dg-ikincil{background:var(--ox-mavi-acik);color:var(--ox-mavi)!important}
.ox-dg-cizgi{background:#fff;color:var(--ox-bas)!important;border:1px solid var(--ox-cizgi)!important}
.ox-dg-metin{background:none;color:var(--ox-mavi)!important;min-height:44px;padding:0 8px}
.ox-dg-tehlike{background:var(--ox-kirmizi-acik);color:var(--ox-kirmizi)!important}
.ox-dg:disabled{opacity:.45;transform:none}

/* liste ve satırlar */
.ox-liste{background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:var(--ox-r);box-shadow:var(--ox-golge);overflow:hidden}
.ox-satir{position:relative;display:flex;align-items:center;gap:14px;width:100%;min-height:64px;padding:12px 16px;text-align:left;background:var(--ox-kart)}
.ox-liste>.ox-satir+.ox-satir::before,.ox-liste>.ox-konu+.ox-konu::before{content:"";position:absolute;top:0;right:16px;left:16px;border-top:1px solid var(--ox-ayrac)}
.ox-liste>.ox-satir:has(.ox-ik-kutu)+.ox-satir::before{left:72px}
.ox-satir-govde{flex:1;min-width:0;display:grid;gap:2px}
.ox-satir-govde b{font-size:16px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-satir-govde small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-satir-govde small.mavi{color:var(--ox-mavi)}.ox-satir-govde small.yesil{color:var(--ox-yesil)}.ox-satir-govde small.kirmizi{color:var(--ox-kirmizi)}
.ox-satir-sag{flex:none;font-size:16px;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-chev{flex:none;color:#7d869e;display:grid}
.ox-chev .ox-i{width:20px;height:20px;stroke-width:2}
.ox-ik-kutu{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-ik-kutu .ox-i{width:23px;height:23px}
.ox-ik-kutu.buyuk{width:64px;height:64px;border-radius:18px}.ox-ik-kutu.buyuk .ox-i{width:32px;height:32px;stroke-width:1.7}
.ox-ik-kutu.yesil{background:var(--ox-yesil-acik);color:var(--ox-yesil)}.ox-ik-kutu.kirmizi{background:var(--ox-kirmizi-acik);color:var(--ox-kirmizi)}
.ox-ik-kutu.turuncu{background:var(--ox-turuncu-acik);color:var(--ox-turuncu)}.ox-ik-kutu.mor{background:var(--ox-mor-acik);color:var(--ox-mor)}
.ox-ik-kutu.gri{background:var(--ox-gri-acik);color:#59627a}.ox-ik-kutu.sari{background:var(--ox-sari-acik);color:#d99a00}

/* numaralı konu listesi */
.ox-konu{position:relative;display:flex;align-items:center;gap:14px;width:100%;min-height:52px;padding:10px 16px;text-align:left;background:var(--ox-kart)}
.ox-konu-no{flex:none;width:24px;font-size:14px;font-weight:600;color:var(--ox-soluk);font-variant-numeric:tabular-nums}
.ox-konu-ad{flex:1;min-width:0;font-size:16px;font-weight:500;color:var(--ox-bas);line-height:1.3}
.ox-konu.siradaki{background:var(--ox-mavi-acik)}
.ox-konu.siradaki .ox-konu-no{color:var(--ox-mavi);font-weight:600}.ox-konu.siradaki .ox-konu-ad{color:var(--ox-bas);font-weight:600}
.ox-konu.bitti .ox-konu-ad{color:var(--ox-ikincil)}
.ox-konu-d{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%}
.ox-konu-d.siradaki{background:var(--ox-mavi);color:#fff}.ox-konu-d.siradaki .ox-i{width:12px;height:12px;fill:currentColor;stroke-width:1.5;margin-left:2px}
.ox-konu-d.bitti{background:var(--ox-yesil-acik);color:var(--ox-yesil)}.ox-konu-d.bitti .ox-i{width:15px;height:15px;stroke-width:2.6}
.ox-liste>.ox-konu.siradaki+.ox-konu::before,.ox-liste>.ox-konu+.ox-konu.siradaki::before{display:none}

/* küçük parçalar */
.ox-cip{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 11px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap;background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-cip.yesil{background:var(--ox-yesil-acik);color:var(--ox-yesil)}.ox-cip.kirmizi{background:var(--ox-kirmizi-acik);color:var(--ox-kirmizi)}
.ox-cip.turuncu{background:var(--ox-turuncu-acik);color:#c26a00}.ox-cip.gri{background:var(--ox-gri-acik);color:#59627a}.ox-cip.mor{background:var(--ox-mor-acik);color:var(--ox-mor)}
.ox-serit{display:block;height:8px;border-radius:999px;background:#e3e8f0;overflow:hidden}
.ox-serit.ince{height:5px}
.ox-serit i{display:block;height:100%;border-radius:inherit;background:var(--ox-mavi);transition:width .35s ease}
.ox-serit.yesil i{background:var(--ox-yesil)}.ox-serit.kirmizi i{background:var(--ox-kirmizi)}.ox-serit.turuncu i{background:var(--ox-turuncu)}
.ox-ayrac{border:0;border-top:1px solid var(--ox-ayrac);margin:14px 0}
.ox-not{display:flex;gap:10px;align-items:flex-start;margin-top:16px;font-size:14.5px;line-height:1.4;color:var(--ox-ikincil)}
.ox-not .ox-i{width:20px;height:20px;margin-top:1px;color:var(--ox-soluk)}
.ox-bos{display:grid;justify-items:center;text-align:center;gap:8px;padding:28px 20px}
.ox-bos b{margin-top:6px;font-size:18px;font-weight:700;color:var(--ox-bas)}
.ox-bos p{font-size:15px;color:var(--ox-ikincil);max-width:300px}
.ox-bos .ox-dg{margin-top:10px}
.ox-sekmeler{display:flex;margin:4px 0 18px}
.ox-sekmeler button{flex:1;min-height:46px;font-size:16px;font-weight:500;color:var(--ox-ikincil);text-align:center}
.ox-sekmeler.cizgi{background:var(--ox-gri-acik);border-radius:14px 14px 0 0;border-bottom:1px solid var(--ox-cizgi)}
.ox-sekmeler.cizgi button{position:relative}
.ox-sekmeler.cizgi button.secili{color:var(--ox-mavi);font-weight:600}
.ox-sekmeler.cizgi button.secili::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2.5px;border-radius:2px;background:var(--ox-mavi)}
.ox-sekmeler.hap{padding:3px;gap:3px;background:var(--ox-gri-acik);border-radius:12px}
.ox-sekmeler.hap button{min-height:38px;border-radius:10px;font-size:15px}
.ox-sekmeler.hap button.secili{background:var(--ox-mavi);color:#fff;font-weight:600;box-shadow:0 1px 2px rgba(10,102,242,.25)}
.ox-kutucuk,.ox-radyo{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:10px 16px;font-size:16px;color:var(--ox-bas);text-align:left;position:relative;background:var(--ox-kart)}
.ox-liste>.ox-kutucuk+.ox-kutucuk::before,.ox-liste>.ox-radyo+.ox-radyo::before{content:"";position:absolute;top:0;right:16px;left:16px;border-top:1px solid var(--ox-ayrac)}
.ox-kutucuk-k{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:7px;border:1.8px solid #c3cad8;color:transparent;transition:background-color .15s,border-color .15s}
.ox-kutucuk-k .ox-i{width:16px;height:16px;stroke-width:2.8}
.ox-kutucuk.secili .ox-kutucuk-k{background:var(--ox-mavi);border-color:var(--ox-mavi);color:#fff}
.ox-radyo-k{flex:none;width:22px;height:22px;border-radius:50%;border:1.8px solid #c3cad8;transition:border .15s}
.ox-radyo.secili .ox-radyo-k{border:6.5px solid var(--ox-mavi)}

/* tam ekran akış: ders, deneme sınavı, inceleme */
.ox-akis{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:#fff;font-family:var(--ox-yazi);color:var(--ox-metin);overflow:hidden}
.ox-akis *{box-sizing:border-box}
.ox-akis-ust{flex:none;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px}
.ox-akis-orta{display:grid;gap:7px;justify-items:center;font-size:14.5px;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-akis-orta .ox-serit{width:100%;max-width:280px}
.ox-akis-sag{display:flex;justify-content:flex-end}
.ox-ikon-dg{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;color:var(--ox-bas)}
.ox-ikon-dg .ox-i{width:24px;height:24px;stroke-width:2}
.ox-ikon-dg:active{background:var(--ox-gri-acik)}
.ox-akis-govde{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:8px 20px 24px;max-width:560px;width:100%;margin:0 auto}
.ox-akis-alt{flex:none;display:flex;gap:10px;padding:10px 20px calc(12px + env(safe-area-inset-bottom));max-width:560px;width:100%;margin:0 auto;background:#fff}
.ox-akis-alt .ox-dg{flex:1}
.ox-sik{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;padding:10px 14px;border:1.5px solid var(--ox-cizgi);border-radius:14px;background:#fff;text-align:left;transition:border-color .15s,background-color .15s}
.ox-sik+.ox-sik{margin-top:10px}
.ox-sik-h{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--ox-gri-acik);font-size:14px;font-weight:700;color:var(--ox-ikincil)}
.ox-sik-m{flex:1;min-width:0;font-size:16px;line-height:1.35;color:var(--ox-bas)}
.ox-sik-d{flex:none;display:grid}.ox-sik-d .ox-i{width:22px;height:22px;stroke-width:2.6}
.ox-sik.secili{border-color:var(--ox-mavi);background:var(--ox-mavi-acik)}.ox-sik.secili .ox-sik-h{background:var(--ox-mavi);color:#fff}
.ox-sik.dogru{border-color:#9fdcb8;background:var(--ox-yesil-acik)}.ox-sik.dogru .ox-sik-h{background:var(--ox-yesil);color:#fff}.ox-sik.dogru .ox-sik-d{color:var(--ox-yesil)}
.ox-sik.yanlis{border-color:#f5b5b7;background:var(--ox-kirmizi-acik)}.ox-sik.yanlis .ox-sik-h{background:var(--ox-kirmizi);color:#fff}.ox-sik.yanlis .ox-sik-d{color:var(--ox-kirmizi)}
.ox-sik.soluk{opacity:.55}
.ox-cevap{margin-top:16px;padding:14px 16px;border-radius:14px;font-size:15px;line-height:1.45}
.ox-cevap b{display:block;font-size:16px;font-weight:700;margin-bottom:4px}
.ox-cevap.iyi{background:var(--ox-yesil-acik);color:#145c36}.ox-cevap.iyi b{color:var(--ox-yesil)}
.ox-cevap.kotu{background:var(--ox-kirmizi-acik);color:#7a2326}.ox-cevap.kotu b{color:var(--ox-kirmizi)}
body.ox-akis-acik{overflow:hidden}
@media (prefers-reduced-motion:reduce){.ox *,.ox-akis *{transition:none!important;animation:none!important}}
`);
