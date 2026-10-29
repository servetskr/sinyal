import { ASAMALAR, tarihOku, fark, BUGUN, S, gonderimEkle, oturum } from './veri.js?v=42';

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
  fb: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z"/>',
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

// Belgelerde tam tarih: 29.10.2026
export const tamTarih = s => s ? (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10).split('-').reverse().join('.') : s) : '—';
// Tutarı yazıyla: 23.000 → "yirmiüçbin Türk lirası"
export function yaziyla(n) {
  const B = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'], O = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  const uc = x => { const y = Math.floor(x / 100), o = Math.floor(x % 100 / 10), b = x % 10; return (y ? (y > 1 ? B[y] : '') + 'yüz' : '') + O[o] + B[b]; };
  const yaz = x => { if (!x) return 'sıfır'; let s = ''; for (const [v, a] of [[1e9, 'milyar'], [1e6, 'milyon'], [1e3, 'bin']]) { const q = Math.floor(x / v); if (q) { s += (v === 1e3 && q === 1 ? '' : uc(q)) + a; x %= v; } } return s + uc(x); };
  const tam = Math.round(n * 100), lira = Math.floor(tam / 100), kurus = tam % 100;
  return yaz(lira) + ' Türk lirası' + (kurus ? ' ' + yaz(kurus) + ' kuruş' : '');
}
// Belgeyi kendi A4 sayfasında yazdırır (tarayıcının "PDF olarak kaydet" seçeneğiyle PDF de olur).
const A4_CSS = `@page{size:A4;margin:13mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,"Helvetica Neue",sans-serif;color:#111;font-size:11.5px;line-height:1.45}
h1{font-size:17px;text-align:center;text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px}.a4-alt{text-align:center;color:#555;margin:0 0 16px}p{margin:8px 0}
table{width:100%;border-collapse:collapse;margin:8px 0;page-break-inside:auto}tr{page-break-inside:avoid}td,th{border:1px solid #111;padding:4px 7px;text-align:left;vertical-align:top}.nw{white-space:nowrap}.son{page-break-inside:avoid;break-inside:avoid}th{background:#f0f0ec;font-weight:700}
.imza{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px;text-align:center;page-break-inside:avoid}.imza div{border-top:1px solid #111;padding-top:6px}.sayfa-sonu{page-break-after:always;break-after:page}img{max-width:100%}small{font-size:10.5px}`;
export function belgeYazdir(html, baslik = 'Belge') {
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);
  const d = f.contentDocument; d.open(); d.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${e(baslik)}</title><style>${A4_CSS}${html.includes('data-yatay') ? '@page{size:A4 landscape}' : ''}</style></head><body>${html}</body></html>`); d.close();
  const imgs = [...d.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }));
  return Promise.all(imgs).then(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1000); });
}
// Kart formu: numara (Luhn), son kullanma (gelecekte), CVC. Kart bilgisi kursta saklanmaz; POS'a gider.
export const kartFormu = () => `<div class="form-izgara kart-formu"><div class="alan tam"><label for="k-no">Kart numarası</label><input id="k-no" name="kno" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="23"></div>
  <div class="alan tam"><label for="k-sahip">Kart üzerindeki ad</label><input id="k-sahip" name="ksahip" autocomplete="cc-name"></div>
  <div class="alan"><label for="k-skt">Son kullanma</label><input id="k-skt" name="kskt" inputmode="numeric" autocomplete="cc-exp" placeholder="AA/YY" maxlength="5"></div><div class="alan"><label for="k-cvc">CVC</label><input id="k-cvc" name="kcvc" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="4"></div></div>
  <p class="ipucu" style="margin-top:10px">${ik('kilit')}<span>Ödeme bankanın 3D Secure sayfasında onaylanır; kart bilgisi kursta saklanmaz.</span></p>`;
export function kartBagla(kok) {
  const no = kok.querySelector('[name=kno]'), skt = kok.querySelector('[name=kskt]');
  no.addEventListener('input', () => { no.value = no.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); });
  skt.addEventListener('input', () => { const v = skt.value.replace(/\D/g, '').slice(0, 4); skt.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v; });
}
export function kartDogrula(kok) {
  const n = kok.querySelector('[name=kno]').value.replace(/\D/g, ''), [aa, yy] = kok.querySelector('[name=kskt]').value.split('/').map(Number), cvc = kok.querySelector('[name=kcvc]').value.replace(/\D/g, ''), sahip = kok.querySelector('[name=ksahip]').value.trim();
  let t = 0; n.split('').reverse().forEach((c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } t += d; });
  if (n.length < 15 || t % 10) return { hata: 'Kart numarası geçerli değil' };
  if (sahip.length < 3) return { hata: 'Kart üzerindeki adı yazın' };
  const simdi = new Date(), sonAy = new Date(2000 + (yy || 0), aa || 0, 1);
  if (!aa || aa > 12 || !yy || sonAy <= new Date(simdi.getFullYear(), simdi.getMonth(), 1)) return { hata: 'Son kullanma tarihi geçerli değil' };
  if (!/^\d{3,4}$/.test(cvc)) return { hata: 'CVC 3 ya da 4 hane olmalı' };
  return { son4: n.slice(-4) };
}
// --- Gerçek WhatsApp: sohbet hazır mesajla açılır, gönderme tuşuna kullanıcı basar ---
export function waNumara(tel) { let n = String(tel || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '90' + n.slice(1); else if (n.length === 10 && n.startsWith('5')) n = '90' + n; return n.length >= 12 ? n : ''; }
export const waUrl = (tel, metin) => 'https://wa.me/' + waNumara(tel) + '?text=' + encodeURIComponent(metin);
export const smsUrl = (tel, metin) => 'sms:' + (waNumara(tel) ? '+' + waNumara(tel) : '') + '?&body=' + encodeURIComponent(metin);
// Mesaj yönlendirme (demo): kursa gelen mesajlar hariç her mesaj Ayarlar'daki tek numaraya gider.
// Demo etiketi: mesajın kimin telefonuna gittiği ("[ÖĞRENCİ · Ayşe Yılmaz]", "[HOCA · Hüseyin Aktaş]", "[MÜDÜR]")
const ROL_KIME = { 'ÖĞRENCİ': 'öğrencinin', 'HOCA': 'usta öğreticinin', 'MÜDÜR': 'kurs müdürünün', 'ADAY': 'yeni öğrenci adayının', 'ÖN BÜRO': 'ön büronun' };
export const etiket = (ad, rol) => {
  if (S.kurs.demoKime === false || (!ad && !rol)) return '';
  if (rol === 'KURSA GELEN') return `KURSA GELEN MESAJ · gönderen: ${ad || 'öğrenci'}\n(Gerçekte bu mesaj öğrencinin telefonundan kursun WhatsApp hattına gelir.)\n――――――――\n`;
  const kim = ROL_KIME[rol];
  return `ALICI: ${rol || 'KİŞİ'}${ad && rol !== 'MÜDÜR' ? ' · ' + ad : ''}\n(Gerçekte bu mesaj ${kim || 'alıcının'} telefonuna gider.)\n――――――――\n`;
};
// Uzun linki (imza paketi vb.) kısa ve açıklayıcı linke çevirir: servetskr.github.io/sinyal/sozlesme-imzasi-ad-soyad-x7k2pq
export async function kisaLink(hedef, ad, takip, api) {
  const a = api || (S && S.kurs && S.kurs.waApi); if (!a) return hedef;
  try {
    const kok = new URL(a).origin;
    const r = await fetch(kok + '/kisa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hedef, ad, takip }) });
    const j = await r.json(); if (!r.ok || !j.ok) return hedef;
    return location.hostname === 'servetskr.github.io' ? location.origin + '/sinyal/' + j.slug : kok + '/' + j.slug;
  } catch (x) { return hedef; }
}
export function yonlendir(tel, metin, ad, rol) {
  const d = S && S.kurs && S.kurs.demoNumara;
  if (!d || (S.kurs.wp && waNumara(tel) && waNumara(tel) === waNumara(S.kurs.wp))) return [tel, metin];
  return [d, etiket(ad, rol) + metin];
}
// Otomatik gönderim: Ayarlar'da WhatsApp API adresi varsa mesaj WhatsApp açılmadan doğrudan gider (Cloud API köprüsü).
export const apiAcik = () => !!(S && S.kurs && S.kurs.waApi);
// Gönderilen WhatsApp mesajlarının oturum günlüğü (senaryo ekranındaki telefon önizlemesi bunu gösterir)
export const giden = [];
export async function apiGonder(metin, belge, adres) {
  const kayit = { zaman: new Date().toTimeString().slice(0, 5), metin, dosya: belge && belge.dosya, durum: 'gidiyor' };
  giden.push(kayit); window.dispatchEvent(new CustomEvent('sinyal-giden'));
  const bitir = (ok, hata) => { kayit.durum = ok ? 'iletildi' : 'hata'; kayit.hata = hata; window.dispatchEvent(new CustomEvent('sinyal-giden')); };
  try {
    const r = await fetch(adres || S.kurs.waApi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metin, belge }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { bitir(true); return { ok: true }; }
    bitir(false, j.hata);
    return { ok: false, hata: j.kod === 131047 || /24 hours|re-engagement/i.test(j.hata || '') ? 'WhatsApp 24 saat penceresi kapalı: test numarasına “merhaba” yazıp tekrar deneyin' : (j.hata || 'Gönderilemedi') };
  } catch (x) { bitir(false, 'ulaşılamadı'); return { ok: false, hata: 'WhatsApp servisine ulaşılamadı' }; }
}
// Belgeyi gerçek PDF'e çevirir (html2pdf, ilk kullanımda yüklenir) ve base64 döndürür
let html2pdfYuk = null;
const html2pdfYukle = () => html2pdfYuk || (html2pdfYuk = new Promise((ok, red) => { if (window.html2pdf) return ok(); const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'; sc.onload = ok; sc.onerror = () => { html2pdfYuk = null; red(new Error('PDF aracı yüklenemedi')); }; document.head.appendChild(sc); }));
const kapsamliCss = () => A4_CSS.replace(/@page\{[^}]*\}/, '').split('}').filter(x => x.trim()).map(r => { const [sel, govde] = r.split('{'); return sel.split(',').map(x => { x = x.trim(); return x === 'body' ? '.pdf-kok' : x === '*' ? '.pdf-kok,.pdf-kok *' : '.pdf-kok ' + x; }).join(',') + '{' + govde + '}'; }).join('');
export async function pdfUret(html, dosya = 'belge.pdf') {
  await html2pdfYukle();
  const yatay = html.includes('data-yatay'), kap = document.createElement('div');
  kap.style.cssText = `position:fixed;left:-10000px;top:0;width:${yatay ? 1100 : 760}px;background:#fff`;
  kap.innerHTML = `<style>${kapsamliCss()}</style><div class="pdf-kok" style="padding:4px">${html}</div>`;
  document.body.appendChild(kap);
  try {
    const uri = await window.html2pdf().set({ margin: 10, filename: dosya, image: { type: 'jpeg', quality: 0.9 }, html2canvas: { scale: 2, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: yatay ? 'landscape' : 'portrait' }, pagebreak: { mode: ['css', 'legacy'], before: '.sayfa-onu', after: '.sayfa-sonu' } }).from(kap.querySelector('.pdf-kok')).outputPdf('datauristring');
    return uri.split(',')[1];
  } finally { kap.remove(); }
}
// Belgeyi PDF olarak WhatsApp'tan dosya gönderir (API bağlıysa)
export async function belgeWhatsApp(html, dosya, metin, ad, rol) {
  try { const base64 = await pdfUret(html, dosya); const s = await apiGonder(etiket(ad, rol) + metin, { base64, dosya }); bildir(s.ok ? `${dosya} WhatsApp’tan gönderildi ✓` : s.hata, s.ok ? 'wp' : 'uyari'); return s; }
  catch (x) { bildir('PDF hazırlanamadı: ' + x.message, 'uyari'); return { ok: false }; }
}
const apiMetin = (metin, ad, rol) => etiket(ad, rol) + metin;
// Mesaj gönderim kaydı yalnızca gerçekten gidince (API) ya da WhatsApp açılınca düşer
const kayitDus = (ad, metin, tur) => { if (tur && ad) gonderimEkle(ad, metin, tur); };
export function waAc(tel, metin, kanal = 'WhatsApp', ad = '', elle = false, rol = '', tur = '') {
  if (kanal === 'WhatsApp' && apiAcik() && !elle) {
    apiGonder(apiMetin(metin, ad, rol)).then(s => { if (s.ok) { kayitDus(ad, metin, tur); bildir((ad ? ad.split(' ')[0] + ': ' : '') + 'WhatsApp mesajı gönderildi ✓', 'wp'); } else bildir(s.hata, 'uyari'); });
    return 'api';
  }
  const ham = metin; [tel, metin] = yonlendir(tel, metin, ad, rol);
  const url = kanal === 'SMS' ? smsUrl(tel, metin) : waUrl(tel, metin);
  const w = window.open(url, '_blank');
  if (w) { try { w.opener = null; } catch (x) { } kayitDus(ad, ham, tur); return true; }
  pencere({ baslik: kanal + '’ı açın', icerik: `<p style="font-size:14.5px">Tarayıcı yeni pencereyi engelledi. Mesaj hazır; düğmeye basınca ${kanal} açılır.</p>`, altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><a class="dg dg-wp" href="${e(url)}" target="_blank" rel="noopener" data-kapat>${ik('wp')}${kanal}’ı aç</a>` });
  return false;
}
// Toplu gönderim: her kişinin sohbeti sırayla hazır mesajla açılır (WhatsApp toplu mesaja yalnızca resmî API ile izin verir).
export function waSirali(liste, baslik, { kanal = 'WhatsApp', bitince, aciklama = '', sessiz = false } = {}) {
  liste = liste.filter(x => x && x.metin);
  if (!liste.length) { if (bitince) bitince(); return; }
  if (kanal === 'WhatsApp' && apiAcik() && sessiz) {
    (async () => { let ok = 0, son = ''; for (const x of liste) { const s = await apiGonder(apiMetin(x.metin, x.ad, x.rol)); if (s.ok) { ok++; kayitDus(x.ad, x.metin, x.tur || baslik); } else son = s.hata; } bildir(ok === liste.length ? `WhatsApp bildirimi gitti: ${liste.map(x => (x.rol || x.ad).toLocaleLowerCase('tr')).join(', ')} ✓` : `${liste.length - ok} bildirim gitmedi: ${son}`, ok === liste.length ? 'wp' : 'uyari'); if (bitince) bitince(); })();
    return;
  }
  if (kanal === 'WhatsApp' && apiAcik()) {
    pencere({ baslik, icerik: `<p style="font-size:14px;margin-bottom:10px">${aciklama ? e(aciklama) + ' ' : ''}${liste.length} mesaj WhatsApp’tan otomatik gönderiliyor.</p><ul class="liste" style="max-height:46vh;overflow:auto;margin:0 -20px">${liste.map((x, i) => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(x.ad)}</b><small style="display:block;color:var(--soluk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(x.metin)}</small></div><span data-api-durum="${i}" style="font-size:13px;color:var(--soluk)">sırada</span></li>`).join('')}</ul>`, altlik: `<button class="dg dg-ana" data-api-bitti disabled>Gönderiliyor…</button>`,
      onAc(d) {
        const b = d.querySelector('[data-api-bitti]'); let ok = 0, son = '';
        b.addEventListener('click', () => { kapatPencere(); if (bitince) bitince(); });
        (async () => {
          for (let i = 0; i < liste.length; i++) {
            const el = d.querySelector(`[data-api-durum="${i}"]`); if (el) el.textContent = 'gönderiliyor…';
            const s = await apiGonder(apiMetin(liste[i].metin, liste[i].ad, liste[i].rol)); if (s.ok) kayitDus(liste[i].ad, liste[i].metin, liste[i].tur || baslik);
            if (el) { el.textContent = s.ok ? 'gönderildi ✓' : 'gönderilemedi'; el.style.color = s.ok ? 'var(--yesil)' : 'var(--kirmizi)'; }
            if (s.ok) ok++; else son = s.hata;
            await new Promise(r => setTimeout(r, 350));
          }
          b.disabled = false; b.textContent = 'Tamam';
          if (ok < liste.length) bildir(`${liste.length - ok} mesaj gönderilemedi: ${son}`, 'uyari'); else bildir(`${ok} mesaj WhatsApp’tan gönderildi ✓`, 'wp');
        })();
      } });
    return;
  }
  const acilan = new Set(); let sira = 0;
  const url = x => { const [t, m] = yonlendir(x.tel, x.metin, x.ad, x.rol); return kanal === 'SMS' ? smsUrl(t, m) : waUrl(t, m); };
  pencere({
    baslik,
    icerik: `<p style="font-size:14px;margin-bottom:10px">${aciklama ? e(aciklama) + ' ' : ''}${liste.length} kişi. Her kişi için ${kanal} hazır mesajla açılır; gönderip bu ekrana dönün.</p>
      <ul class="liste" style="max-height:46vh;overflow:auto;margin:0 -20px">${liste.map((x, i) => `<li data-sira-satir="${i}"><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(x.ad)}</b><small style="display:block;color:var(--soluk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(x.tel || 'numara yok')} · ${e(x.metin)}</small></div><a class="dg dg-cizgi dg-kucuk" href="${e(url(x))}" target="_blank" rel="noopener" data-sira-ac="${i}">${ik('wp')}Aç</a></li>`).join('')}</ul>`,
    altlik: `<button class="dg dg-cizgi" data-sira-bitti>Bitti</button><button class="dg dg-wp" data-sira-sonraki>${ik('wp')}Sıradakini aç · 1/${liste.length}</button>`,
    onAc(d) {
      const isaretle = i => { if (!acilan.has(i)) kayitDus(liste[i].ad, liste[i].metin, liste[i].tur || baslik); acilan.add(i); const li = d.querySelector(`[data-sira-satir="${i}"] a`); if (li) { li.textContent = 'Açıldı ✓'; li.classList.add('dg-hafif'); } while (acilan.has(sira)) sira++; const b = d.querySelector('[data-sira-sonraki]'); if (sira >= liste.length) { b.disabled = true; b.textContent = 'Hepsi açıldı'; } else b.innerHTML = `${ik('wp')}Sıradakini aç · ${sira + 1}/${liste.length}`; };
      d.querySelectorAll('[data-sira-ac]').forEach(a => a.addEventListener('click', () => isaretle(+a.dataset.siraAc)));
      d.querySelector('[data-sira-sonraki]').addEventListener('click', () => { if (sira >= liste.length) return; const i = sira; const w = window.open(url(liste[i]), '_blank'); if (w) { try { w.opener = null; } catch (x) { } isaretle(i); } else bildir('Tarayıcı pencereyi engelledi; satırdaki “Aç”a basın', 'uyari'); });
      d.querySelector('[data-sira-bitti]').addEventListener('click', () => { kapatPencere(); if (acilan.size < liste.length) bildir(`${liste.length - acilan.size} kişiye ${kanal} açılmadı`, 'uyari'); if (bitince) bitince(acilan); });
    },
  });
}
// Saatle Türkçe ek: 09:00'da / 09:00'a, 14:00'te / 14:00'e, 16:00'da / 16:00'ya
const SAAT_OKU = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki', 'on üç', 'on dört', 'on beş', 'on altı', 'on yedi', 'on sekiz', 'on dokuz', 'yirmi', 'yirmi bir', 'yirmi iki', 'yirmi üç'];
const sesli = s => { const h = (String(s).match(/^(\d{1,2})/) || [])[1], m = String(s).slice(-2); const ok = m === '00' ? SAAT_OKU[+h] : ({ '15': 'on beş', '30': 'otuz', '45': 'kırk beş' }[m] || 'sıfır'); return ok || ''; };
const sonSesli = w => (w.match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ['e'])[0];
const ince = w => 'eiöü'.includes(sonSesli(w));
export const saatDe = s => { const w = sesli(s); const sert = /[çfhkpsşt]$/.test(w); return s + '’' + (sert ? 't' : 'd') + (ince(w) ? 'e' : 'a'); };
export const saatE = s => { const w = sesli(s); return s + '’' + (/[aıoueiöü]$/.test(w) ? 'y' : '') + (ince(w) ? 'e' : 'a'); };
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
  if (!/^a[1-6]$/.test(a.id)) return `<figure class="arac-fig arac-fig-bos ${cls}"><svg viewBox="0 0 64 32" aria-hidden="true"><path d="M6 22h52M10 22l5-9h26l9 9M14 26a3 3 0 1 0 0-.1M48 26a3 3 0 1 0 0-.1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><figcaption>${plaka(a.plaka)}</figcaption></figure>`;
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

// Hassas işlemden önce oturumdaki kullanıcının PIN'ini tekrar sorar (Ayarlar › Güvenlik'te kapatılabilir)
export function pinSor(neden) {
  return new Promise(ok => {
    if (!S.guvenlik || !S.guvenlik.hassasOnay) return ok(true);
    const u = oturum.kullanici && S.kullanicilar.find(x => x.id === oturum.kullanici.id); if (!u) return ok(false);
    let hata = 0;
    pencere({
      baslik: 'PIN onayı', icerik: `<p style="margin-bottom:10px">${e(neden)} için PIN’inizi tekrar girin.</p><input class="girdi" data-pin-tekrar type="password" inputmode="numeric" maxlength="4" autocomplete="off" style="max-width:160px" aria-label="PIN">`,
      altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Onayla</button>`,
      onAc(d) {
        const inp = d.querySelector('[data-pin-tekrar]');
        const dene = () => { if (inp.value === u.pin) { kapatPencere(); ok(true); } else if (++hata >= 3) { kapatPencere(); bildir('PIN 3 kez hatalı girildi; işlem yapılmadı', 'uyari'); } else { bildir('PIN hatalı', 'uyari'); inp.value = ''; inp.focus(); } };
        d.querySelector('[data-k]').addEventListener('click', dene); inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') dene(); });
      },
    });
  });
}
