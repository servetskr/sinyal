import { ASAMALAR, tarihOku, fark, BUGUN } from './veri.js';

export const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
export const tl = n => TL.format(Math.round(n)) + ' ₺';
export const sayi = n => TL.format(n);
const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const AY_U = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const GUN_K = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export const tarih = s => { if (!s) return '—'; const d = tarihOku(s); return d.getDate() + ' ' + AY[d.getMonth()]; };
export const tarihUzun = s => { const d = tarihOku(s); return d.getDate() + ' ' + AY_U[d.getMonth()] + ' ' + GUN[d.getDay()]; };
export const gunAdi = s => GUN[tarihOku(s).getDay()];
export const gunKisa = s => GUN_K[tarihOku(s).getDay()];
export const ayAdi = (i, uzun) => (uzun ? AY_U : AY)[i];
export function goreli(s) {
  const f = fark(s);
  if (f === 0) return 'Bugün'; if (f === 1) return 'Yarın'; if (f === -1) return 'Dün';
  if (f > 1 && f < 7) return f + ' gün sonra'; if (f < -1 && f > -7) return -f + ' gün önce';
  return tarih(s);
}

const P = {
  genel: '<path d="M3 13h8V3H3zM13 21h8v-8h-8zM3 21h8v-6H3zM13 11h8V3h-8z"/>',
  aday: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  kursiyer: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
  direksiyon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M3.5 10.5c2.8-1 5.6-1.5 8.5-1.5s5.7.5 8.5 1.5M10.3 13.6 7 20M13.7 13.6 17 20"/>',
  teorik: '<path d="M3 5.5 12 3l9 2.5-9 2.5z"/><path d="M6.5 7v5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V7M21 5.5V11"/>',
  sinav: '<path d="M8 3h8v3H8z"/><path d="M6 5H4.5v16h15V5H18"/><path d="m8.5 13 2.2 2.2L15.5 10"/>',
  kasa: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  filo: '<path d="M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v5h-2.5M5.5 18H3v-5h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  mesaj: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5z"/>',
  meb: '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2.5 10 12 4l9.5 6z"/>',
  rapor: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  ayar: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  ara: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  arti: '<path d="M12 5v14M5 12h14"/>',
  kapat: '<path d="M6 6l12 12M18 6 6 18"/>',
  ok: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sol: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  sag: '<path d="m9 6 6 6-6 6"/>',
  asagi: '<path d="m6 9 6 6 6-6"/>',
  tik: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  uyari: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  saat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  takvim: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  tel: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  wp: '<path d="M3 21l1.7-5.1A8.9 8.9 0 1 1 8 19.6z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.4-2-1-1 .9a5 5 0 0 1-3.2-3.2l.9-1-1-2z"/>',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
  harita: '<path d="M12 21s-7-6.1-7-12a7 7 0 0 1 14 0c0 5.9-7 12-7 12z"/><circle cx="12" cy="9" r="2.6"/>',
  indir: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  yildiz: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  belge: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  kart: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/>',
  robot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13v1M15 13v1M2 13v2M22 13v2"/>',
  gonder: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  cikis: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  kalem: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  sifirla: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/>',
  goz: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  kilit: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
};
export const ik = (ad, cls = '') => `<svg class="ik ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[ad] || ''}</svg>`;

export const rozet = (metin, tur = 'notr') => `<span class="rozet rozet-${tur}">${e(metin)}</span>`;
export function asamaRozet(a) { const t = { 'Kayıt': 'notr', 'Evrak': 'uyari', 'Teorik': 'mavi', 'Direksiyon': 'mor', 'Sınav': 'turuncu', 'Ehliyet': 'yesil' }[a] || 'notr'; return rozet(a, t); }
// Yuvarlak baş harf avatarları kaldırıldı; kişiler adlarıyla okunur.
export function avatar() { return ''; }
export const plaka = p => `<span class="plaka"><i>TR</i>${e(p)}</span>`;

// İmza öğesi: kursiyerin kayıttan ehliyete yolculuğu, kesik şeritli bir yol üzerinde.
export function yol(asamaIndex, buyuk = false) {
  const n = ASAMALAR.length, oran = asamaIndex / (n - 1);
  const duraklar = ASAMALAR.map((a, i) => `<li class="${i < asamaIndex ? 'gecti' : i === asamaIndex ? 'simdi' : ''}" style="left:${(i / (n - 1)) * 100}%"><span>${a}</span></li>`).join('');
  return `<div class="yol ${buyuk ? 'yol-buyuk' : ''}" role="img" aria-label="Aşama: ${ASAMALAR[asamaIndex]}">
    <div class="yol-serit"><i style="width:${oran * 100}%"></i></div>
    <span class="yol-arac" style="left:${oran * 100}%">${ik('filo')}</span>
    ${buyuk ? `<ol>${duraklar}</ol>` : ''}
  </div>`;
}

export function ilerleme(deger, toplam, tur = '') {
  const y = toplam ? Math.min(100, Math.round(deger / toplam * 100)) : 0;
  return `<div class="ilerleme ${tur}" role="progressbar" aria-valuenow="${y}" aria-valuemin="0" aria-valuemax="100"><i style="width:${y}%"></i></div>`;
}

export function bos(baslik, aciklama, dugme = '') { return `<div class="bos"><b>${e(baslik)}</b><p>${e(aciklama)}</p>${dugme}</div>`; }

// --- grafikler (bağımsız SVG) ---
export function cubukGrafik(veri, { yukseklik = 180, bicim = v => sayi(v), seri2 } = {}) {
  const max = Math.max(1, ...veri.map(d => Math.max(d.v, d.v2 || 0)));
  const w = 100 / veri.length;
  const cubuk = veri.map((d, i) => {
    const h = d.v / max * 100, h2 = d.v2 != null ? d.v2 / max * 100 : null;
    return `<div class="cg-sutun" style="width:${w}%">
      <div class="cg-alan">${h2 != null ? `<i class="cg-c2" style="height:${h2}%" title="${e(seri2)}: ${bicim(d.v2)}"></i>` : ''}<i class="cg-c ${d.vurgu ? 'vurgu' : ''}" style="height:${h}%"><em>${bicim(d.v)}</em></i></div>
      <small>${e(d.e)}</small></div>`;
  }).join('');
  return `<div class="cubuk-grafik" style="--h:${yukseklik}px">${cubuk}</div>`;
}
export function halka(parcalar, { boyut = 132, kalinlik = 16, orta = '' } = {}) {
  const top = parcalar.reduce((a, p) => a + p.v, 0) || 1;
  const r = (boyut - kalinlik) / 2, c = 2 * Math.PI * r;
  let ofs = 0;
  const yaylar = parcalar.map(p => { const l = p.v / top * c; const s = `<circle r="${r}" cx="${boyut / 2}" cy="${boyut / 2}" fill="none" stroke="${p.renk}" stroke-width="${kalinlik}" stroke-dasharray="${l} ${c - l}" stroke-dashoffset="${-ofs}"/>`; ofs += l; return s; }).join('');
  return `<div class="halka" style="width:${boyut}px;height:${boyut}px"><svg viewBox="0 0 ${boyut} ${boyut}" style="transform:rotate(-90deg)">${yaylar}</svg><div class="halka-orta">${orta}</div></div>`;
}

// --- pencere, çekmece, bildirim ---
let acikPencere = null;
export function pencere({ baslik, icerik, altlik = '', genis = false, onAc }) {
  kapatPencere();
  const d = document.createElement('div');
  d.className = 'perde';
  d.innerHTML = `<div class="pencere ${genis ? 'genis' : ''}" role="dialog" aria-modal="true" aria-label="${e(baslik)}">
    <header><h2>${e(baslik)}</h2><button class="dg-ikon" data-kapat aria-label="Kapat">${ik('kapat')}</button></header>
    <div class="pencere-govde">${icerik}</div>${altlik ? `<footer>${altlik}</footer>` : ''}</div>`;
  document.body.appendChild(d);
  document.body.classList.add('kilitli');
  requestAnimationFrame(() => d.classList.add('acik'));
  d.addEventListener('click', ev => { if (ev.target === d || ev.target.closest('[data-kapat]')) kapatPencere(); });
  acikPencere = d;
  const ilk = d.querySelector('input,select,textarea,button:not([data-kapat])'); if (ilk) setTimeout(() => ilk.focus(), 60);
  if (onAc) onAc(d);
  return d;
}
export function kapatPencere() { if (acikPencere) { acikPencere.remove(); acikPencere = null; document.body.classList.remove('kilitli'); } }
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') kapatPencere(); });

export function bildir(metin, tur = 'tamam', geriAlinir = false) {
  let k = document.querySelector('.bildirimler');
  if (!k) { k = document.createElement('div'); k.className = 'bildirimler'; k.setAttribute('aria-live', 'polite'); document.body.appendChild(k); }
  const b = document.createElement('div');
  b.className = 'bildirim bildirim-' + tur;
  b.innerHTML = ik(tur === 'tamam' ? 'tik' : tur === 'wp' ? 'wp' : 'uyari') + '<span>' + e(metin) + '</span>' + (geriAlinir ? '<button class="bildirim-geri" data-geri-al>Geri al</button>' : '');
  k.appendChild(b);
  const sure = geriAlinir ? 6500 : 3200;
  setTimeout(() => b.classList.add('git'), sure);
  setTimeout(() => b.remove(), sure + 500);
}

export function sekmeler(liste, secili, ad = 'sekme') {
  return `<div class="sekmeler" role="tablist">${liste.map(([k, t, sayac]) => `<button role="tab" class="${k === secili ? 'secili' : ''}" aria-selected="${k === secili}" data-${ad}="${k}">${e(t)}${sayac != null ? `<b>${sayac}</b>` : ''}</button>`).join('')}</div>`;
}

export function csvIndir(ad, satirlar) {
  const csv = '﻿' + satirlar.map(r => r.map(h => '"' + String(h ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export const bugunMetni = () => { const d = BUGUN; return d.getDate() + ' ' + AY_U[d.getMonth()] + ' ' + GUN[d.getDay()]; };

// --- Trafik levhası dili ---
// Gerçek levha biçimleri: uyarı (kırmızı kenarlı üçgen), yasak (kırmızı halka), bilgi (mavi kare),
// zorunlu (mavi daire), tamam (yeşil kare), dur (kırmızı sekizgen).
export function isaret(tur, boyut = 22, ic = '') {
  const s = boyut;
  const sekil = {
    uyari: `<path d="M12 2.2 22.6 20.6H1.4z" fill="#fff" stroke="#d52b1e" stroke-width="2.6" stroke-linejoin="round"/><path d="M12 9v5.2M12 16.9v.4" stroke="#111" stroke-width="2.3" stroke-linecap="round"/>`,
    yasak: `<circle cx="12" cy="12" r="9.6" fill="#fff" stroke="#d52b1e" stroke-width="3.2"/>${ic ? `<text x="12" y="15.6" text-anchor="middle" font-size="9.5" font-weight="800" font-family="Overpass,sans-serif" fill="#111">${ic}</text>` : '<path d="M7.5 12h9" stroke="#111" stroke-width="2.4" stroke-linecap="round"/>'}`,
    bilgi: `<rect x="2" y="2" width="20" height="20" rx="3.5" fill="#0a4da2"/><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="2.4" fill="none" stroke="#fff" stroke-width="1"/><path d="M12 10.5v6M12 7.4v.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    zorunlu: `<circle cx="12" cy="12" r="10" fill="#0a4da2"/><path d="M7 12h9M12.5 8l4 4-4 4" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    tamam: `<rect x="2" y="2" width="20" height="20" rx="3.5" fill="#1f7a3e"/><path d="m7 12.4 3.3 3.3L17.2 8.6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    dur: `<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="#d52b1e"/><path d="M8.8 3.6h6.4l5.2 5.2v6.4l-5.2 5.2H8.8l-5.2-5.2V8.8z" fill="none" stroke="#fff" stroke-width="1"/><path d="M7.5 12h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
  }[tur] || '';
  return `<svg class="isaret" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${sekil}</svg>`;
}

// Yön levhası: hedefler ve "mesafeler" (sayılar). [[ad, deger, href, alt]]
export function yonLevhasi(satirlar, baslik = '') {
  return `<div class="yon-levhasi">${baslik ? `<div class="yl-bas">${e(baslik)}</div>` : ''}${satirlar.map(([ad, deger, href, alt]) => `<a class="yl-satir" href="${href || '#'}"><span class="yl-ok" aria-hidden="true">→</span><span class="yl-ad">${e(ad)}${alt ? `<small>${e(alt)}</small>` : ''}</span><b class="yl-deger">${deger}</b></a>`).join('')}</div>`;
}

// Ölçü şeridi: üst üste dizilmiş kart yerine tek levha üzerinde değerler. [[etiket, deger, alt, tur]]
export function olcumler(l) {
  return `<div class="olcum">${l.map(([et, d, alt, tur]) => `<div class="olcum-h ${tur ? 'o-' + tur : ''}"><small>${e(et)}</small><b>${d}</b>${alt ? `<span>${alt}</span>` : ''}</div>`).join('')}</div>`;
}

// Araç görseli + plaka (görseller img/arac-<id>.webp)
export function aracGorsel(a, cls = '') {
  if (!a) return '';
  return `<figure class="arac-fig ${cls}"><img src="img/arac-${a.id}.webp" alt="${e(a.model)}" loading="lazy" width="640" height="420"><figcaption>${plaka(a.plaka)}</figcaption></figure>`;
}

// Ekran başı: bu ekran ne işe yarar, tek cümle.
export function ekranNotu(metin, tur = 'bilgi') { return `<p class="ekran-notu">${isaret(tur, 20)}<span>${metin}</span></p>`; }

// Fotoğrafı küçült (tarayıcıda saklamak için ~600px JPEG)
export function fotoKucult(dosya, max = 640) {
  return new Promise((coz, red) => {
    const r = new FileReader();
    r.onerror = red;
    r.onload = () => { const im = new Image(); im.onload = () => { const o = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * o); c.height = Math.round(im.height * o); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); coz(c.toDataURL('image/jpeg', 0.72)); }; im.onerror = red; im.src = r.result; };
    r.readAsDataURL(dosya);
  });
}

// Parmakla imza alanı: { bos(), url(), temizle() }
export function imzaAlani(cv) {
  const c = cv.getContext('2d'); c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111';
  let ciz = false, bos = true;
  const n = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', ev => { ciz = true; c.beginPath(); c.moveTo(...n(ev)); try { cv.setPointerCapture(ev.pointerId); } catch (x) { } });
  cv.addEventListener('pointermove', ev => { if (!ciz) return; c.lineTo(...n(ev)); c.stroke(); bos = false; });
  cv.addEventListener('pointerup', () => ciz = false);
  return { bos: () => bos, url: () => { const k = document.createElement('canvas'); k.width = 300; k.height = 100; k.getContext('2d').drawImage(cv, 0, 0, 300, 100); return k.toDataURL('image/png'); }, temizle: () => { c.clearRect(0, 0, cv.width, cv.height); bos = true; } };
}
