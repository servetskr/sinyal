// Sinyal — Türkiye trafik işaret levhaları kütüphanesi (düz ES modülü, dış bağımlılık yok).
// Kaynak: KGM "Karayolu Trafik İşaretleme Standartları" (2020) — Trafik İşaretleri El Kitabının güncellenmiş baskısı:
// https://www.kgm.gov.tr/SiteCollectionDocuments/KGMdocuments/Trafik/IsaretlerElKitabi/KarayoluTrafikIsaretlemeStandartlari1.pdf
// Kodlar ve adlar el kitabındaki gibidir. Soru bankasında satır içi SVG'si zaten bulunan 12 levha
// (TT-1, TT-2, TT-4, P-1, P-2, TT-29a, TT-26b, B-38, B-39, TT-35a, B-15, T-1a) burada tekrarlanmaz.
//
// Kullanım:  import { LEVHA, levhaSvg } from './levha.js?v=91';  el.innerHTML = levhaSvg('T-11');

const KR = '#d52b1e', MV = '#0a4da2', SY = '#1a1a1a', BY = '#ffffff', SR = '#f7d117', TU = '#f39200', GR = '#8c8c8c', SU = '#1e73c8';

// ---------- küçük çizim yardımcıları ----------
const f = n => Math.round(n * 10) / 10;
const yazi = (x, y, boy, metin, renk = SY, ek = '') =>
  `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${boy}" text-anchor="middle" fill="${renk}"${ek}>${metin}</text>`;
const YUV = ' stroke-linecap="round" stroke-linejoin="round"';
const yol = (d, w, renk = SY, ek = '') => `<path d="${d}" fill="none" stroke="${renk}" stroke-width="${w}"${ek}/>`;
const sekil = (d, renk = SY, ek = '') => `<path d="${d}" fill="${renk}"${ek}/>`;
const kutu = (x, y, w, h, renk = SY, ek = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${renk}"${ek}/>`;
const daire = (x, y, r, renk = SY, ek = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${renk}"${ek}/>`;
const tasi = (x, y, s, ic) => `<g transform="translate(${x} ${y}) scale(${s})">${ic}</g>`;
const ayna = (cx, ic) => `<g transform="translate(${2 * cx} 0) scale(-1 1)">${ic}</g>`;
const don = (x, y, a, ic) => `<g transform="translate(${x} ${y}) rotate(${a})">${ic}</g>`;

// Ok başı: uç (tx,ty), birim yön (ux,uy)
function okBasi(tx, ty, ux, uy, w, renk) {
  const L = w * 1.9, H = w * 1.55, bx = tx - ux * L, by = ty - uy * L, nx = -uy, ny = ux;
  return `<polygon points="${f(tx)},${f(ty)} ${f(bx + nx * H)},${f(by + ny * H)} ${f(bx - nx * H)},${f(by - ny * H)}" fill="${renk}"/>`;
}
// Düz ok: kuyruk (x1,y1) → uç (x2,y2)
function ok(x1, y1, x2, y2, w, renk = SY) {
  const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d, L = w * 1.9 - 1;
  return `<line x1="${x1}" y1="${y1}" x2="${f(x2 - ux * L)}" y2="${f(y2 - uy * L)}" stroke="${renk}" stroke-width="${w}"/>` + okBasi(x2, y2, ux, uy, w, renk);
}
// Eğri ok: gövde yolu d, ok başının tabanı (bx,by)'de biter, yön (ux,uy)
function egriOk(d, bx, by, ux, uy, w, renk = SY) {
  const L = w * 1.9 - 1;
  return yol(d, w, renk) + okBasi(bx + ux * L, by + uy * L, ux, uy, w, renk);
}
// Yay ok: merkez (cx,cy), yarıçap r, a1→a2 derece (matematik yönü; a2>a1 ise saat yönünün tersi)
function yayOk(cx, cy, r, a1, a2, w, renk) {
  const P = a => [cx + r * Math.cos(a * Math.PI / 180), cy - r * Math.sin(a * Math.PI / 180)];
  const ters = a2 > a1, [x1, y1] = P(a1), [x2, y2] = P(a2), rad = a2 * Math.PI / 180;
  const ux = ters ? -Math.sin(rad) : Math.sin(rad), uy = ters ? -Math.cos(rad) : Math.cos(rad);
  return `<path d="M${f(x1)} ${f(y1)} A${r} ${r} 0 0 ${ters ? 0 : 1} ${f(x2)} ${f(y2)}" fill="none" stroke="${renk}" stroke-width="${w}"/>` +
    okBasi(x2 + ux * (w * 1.9 - 1), y2 + uy * (w * 1.9 - 1), ux, uy, w, renk);
}
const yildiz = (cx, cy, dis, ic, n, renk) => {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ic : dis, a = Math.PI * i / n - Math.PI / 2;
    p.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${p.join(' ')}" fill="${renk}"/>`;
};

// ---------- ortak çerçeveler ----------
const UC = '60,10 113,102 7,102';
// Tehlike uyarı: beyaz zemin, kırmızı kenarlı eşkenar üçgen (sembol kenarın altında kalır)
export const ucgen = ic => `<polygon points="${UC}" fill="${BY}"/>${ic}<polygon points="${UC}" fill="none" stroke="${KR}" stroke-width="9" stroke-linejoin="round"/>`;
// Yasaklama/kısıtlama: beyaz zemin, kırmızı çember (ust: çemberin üstüne çizilecek ekler)
export const yasak = (ic = '', ust = '') => `<circle cx="60" cy="60" r="51" fill="${BY}"/>${ic}<circle cx="60" cy="60" r="51" fill="none" stroke="${KR}" stroke-width="12"/>${ust}`;
// Yasaklama + kırmızı çapraz çizgi (dönülmez vb.)
export const yasakCizgili = ic => yasak(ic + `<line x1="28" y1="28" x2="92" y2="92" stroke="${KR}" stroke-width="9"/>`);
// Yasak/kısıtlama sonu: beyaz daire, siyah çapraz bant
export const son = (ic = '') => `<circle cx="60" cy="60" r="53" fill="${BY}" stroke="${GR}" stroke-width="2"/>${ic}<line x1="27" y1="97" x2="93" y2="23" stroke="${SY}" stroke-width="8"/>`;
// Mecburiyet: mavi daire, beyaz sembol
export const mecburi = ic => `<circle cx="60" cy="60" r="54" fill="${MV}"/>${ic}`;
// Mecburiyet sonu: mavi daire + kırmızı çapraz çizgi
export const mecburiSon = ic => mecburi(ic + `<line x1="23" y1="97" x2="97" y2="23" stroke="${KR}" stroke-width="10"/>`);
// Bilgi: mavi kare
export const bilgi = ic => `<rect x="8" y="8" width="104" height="104" rx="7" fill="${MV}"/>${ic}`;
// Hizmet bilgi levhası: mavi kare içinde beyaz kare
export const tesis = ic => bilgi(`<rect x="22" y="22" width="76" height="76" fill="${BY}"/>${ic}`);
// Dikey mavi dikdörtgen (B-23, B-48, B-49a)
export const dikey = ic => `<rect x="26" y="4" width="68" height="112" rx="5" fill="${MV}"/>${ic}`;

// ---------- semboller ----------
// Otomobil (önden/arkadan), 40×30
const araba = (r = SY, z = BY, kontur = false) => {
  const k = kontur ? ` stroke="${BY}" stroke-width="3" paint-order="stroke"` : '';
  return `<path d="M9 12 L12 4 Q13 2 15.5 2 H24.5 Q27 2 28 4 L31 12 H35 Q40 12 40 17 V25 H0 V17 Q0 12 5 12 Z" fill="${r}"${k}/>` +
    `<rect x="2" y="23" width="8" height="7" rx="1.5" fill="${r}"/><rect x="30" y="23" width="8" height="7" rx="1.5" fill="${r}"/>` +
    `<path d="M12.6 11 L14.6 5 H25.4 L27.4 11 Z" fill="${z}"/>${daire(6.5, 18, 2.6, z)}${daire(33.5, 18, 2.6, z)}`;
};
// Otomobil (yandan, önü sağda), 44×20
const arabaYan = (r = SY, z = BY) =>
  `<path d="M1 15 V10 Q1 7.5 4 7.5 H11 L16.5 2 H29 L35 7.5 H40 Q43 7.5 43 10 V15 Z" fill="${r}"/>` +
  `<path d="M13.6 7.5 L17.6 3.6 H22 V7.5 Z M23.6 3.6 H28.4 L32.4 7.5 H23.6 Z" fill="${z}"/>` +
  daire(10, 15, 4.4, r) + daire(34, 15, 4.4, r) + daire(10, 15, 1.6, z) + daire(34, 15, 1.6, z);
// Kamyon (yandan, kabin sağda), 58×31
const kamyon = (r = SY, z = BY) =>
  kutu(0, 0, 40, 22, r) + sekil('M42 7 H52 L58 14 V24 H42 Z', r) + sekil('M45 9.5 H51 L55 14 H45 Z', z) + kutu(0, 21, 58, 3.5, r) +
  daire(9, 26, 4.6, r) + daire(20, 26, 4.6, r) + daire(49, 26, 4.6, r) + daire(9, 26, 1.7, z) + daire(20, 26, 1.7, z) + daire(49, 26, 1.7, z);
// Otobüs (yandan, önü sağda), 64×30
const otobus = (r = SY, z = BY) => {
  let s = `<rect x="0" y="0" width="64" height="24" rx="3" fill="${r}"/>`;
  for (let i = 0; i < 5; i++) s += kutu(4 + i * 10, 3, 8, 9, z);
  return s + kutu(56, 3, 5, 17, z) + daire(13, 24, 5, r) + daire(51, 24, 5, r) + daire(13, 24, 1.8, z) + daire(51, 24, 1.8, z);
};
// Tramvay (yandan), 64×34
const tramvay = (r = SY, z = BY) => {
  let s = yol('M24 10 L32 2 L40 10 M27 1 H37', 2, r) + `<rect x="0" y="10" width="64" height="18" rx="3" fill="${r}"/>`;
  for (let i = 0; i < 6; i++) s += kutu(4 + i * 10, 13, 6, 7, z);
  return s + daire(9, 30, 3.2, r) + daire(18, 30, 3.2, r) + daire(46, 30, 3.2, r) + daire(55, 30, 3.2, r);
};
// Yürüyen yaya (sağa doğru), 40×64
const yaya = (r = SY) =>
  daire(22, 7, 6.2, r) + `<g fill="none" stroke="${r}"${YUV}>` +
  `<path d="M21 16 L18 36" stroke-width="10"/><path d="M18 36 L26 48 L28 61 M18 36 L12 49 L4 59" stroke-width="7.5"/>` +
  `<path d="M21 19 L28 31 M20 19 L12 30 L10 38" stroke-width="6"/></g>`;
// Etekli çocuk (kız), 36×60
const kiz = (r = SY) =>
  daire(19, 7, 6, r) + sekil('M13 15 H25 L31 40 H7 Z', r) +
  `<g fill="none" stroke="${r}"${YUV}><path d="M15 40 L13 58 M23 40 L26 58" stroke-width="5"/><path d="M14 18 L8 32 M24 18 L31 30" stroke-width="4.5"/></g>`;
// Önden yetişkin ve elinden tuttuğu çocuk, 48×62
const aile = (r = SY) =>
  daire(16, 6.5, 6.5, r) + sekil('M7 17 Q7 14 10 14 H22 Q25 14 25 17 V37 H7 Z', r) +
  `<rect x="8" y="35" width="7" height="27" rx="2" fill="${r}"/><rect x="17" y="35" width="7" height="27" rx="2" fill="${r}"/>` +
  `<rect x="1.5" y="15" width="5" height="22" rx="2.5" fill="${r}"/>` + yol('M25.5 16 L33 35', 5, r, YUV) +
  daire(39, 30, 4.5, r) + sekil('M34 37 H44 L47 50 H31 Z', r) + kutu(35, 49, 3.6, 13, r) + kutu(39.6, 49, 3.6, 13, r);
// Bisiklet (yandan), 60×34
const bisiklet = (r = SY) =>
  `<g fill="none" stroke="${r}"${YUV}><circle cx="11" cy="23" r="10" stroke-width="3.2"/><circle cx="49" cy="23" r="10" stroke-width="3.2"/>` +
  `<path d="M11 23 L24 23 L20 7 M11 23 L20.6 9.5 M24 23 L37.5 9.5 M21 10 H37.5 M49 23 L36.5 3 M34 3 H40" stroke-width="3.2"/><path d="M16 6 H24" stroke-width="3.8"/></g>`;
// Bisikletli (bisiklet + sürücü), 60×50 (sürücü y<0'a taşar: -16'dan başlar)
const bisikletli = (r = SY) => bisiklet(r) + daire(31, -12, 5, r) +
  `<g fill="none" stroke="${r}"${YUV}><path d="M22 5 L29 -6" stroke-width="7"/><path d="M29 -4 L37 3" stroke-width="4"/><path d="M22 5 L31 13 L27 22" stroke-width="4.5"/></g>`;
// Motosiklet ve sürücü (yandan, önü sağda), 64×52
const motosiklet = (r = SY, z = BY) =>
  daire(10, 42, 9.5, r) + daire(54, 42, 9.5, r) + daire(10, 42, 4, z) + daire(54, 42, 4, z) +
  sekil('M6 34 Q10 28 18 29 L26 32 H38 L44 25 H49 L50 30 L56 37 L52 39 L46 33 L42 38 H22 Z', r) +
  daire(33, 9, 6.5, r) + `<g fill="none" stroke="${r}"${YUV}><path d="M31 16 L27 30" stroke-width="8.5"/><path d="M31 18 L42 24" stroke-width="5"/><path d="M27 30 L38 33 L37 41" stroke-width="5.5"/><path d="M45 25 L48 19" stroke-width="3"/></g>`;
// İnek (sağa bakan), 60×36
const inek = (r = SY) => sekil('M2 22 L4.5 10 Q5.5 4 11 4 H44 L47.5 2.5 L48.5 0 L50.5 2.8 L55 3.5 L60 9.5 L59 13.5 L55 14.5 L51 13 L48 17.5 L47 22 V35 H43 V25 L39 24 V35 H35 V24 H16 V35 H12 V25 L10 24 V35 H6 V23 L6 11 L3.5 22 Z', r);
// Sıçrayan geyik (sağa bakan), 60×48
const geyik = (r = SY) => sekil('M3 46 L9 38 L12 31 L19 26 L31 23 L39 20 L44 14 L44.5 9 L41 3 L44.5 5 L45 0.5 L47.5 5.5 L51 7.5 L58 9.5 L56.5 12.5 L51 12.5 L48.5 16.5 L50 22 L57 25 L60 22.5 L59.5 28 L53 30 L46 28 L41 29.5 L35 30.5 L28 31.5 L22 36.5 L16 46 L12.5 46 L17.5 36.5 L15 34.5 L8.5 41 L6 46 Z', r);

// ---------- levha üretici ----------
const svg = (ad, ic) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="${ad}">${ic}</svg>`;
export const LEVHA = {};
const L = (kod, ad, anlam, ic) => { LEVHA[kod] = { ad, anlam, svg: svg(ad, ic) }; };

// ================= TEHLİKE UYARI İŞARETLERİ (T grubu) =================
L('T-1b', 'Sola Tehlikeli Viraj', 'İleride sola dönen tehlikeli bir viraj bulunduğunu bildirir.',
  ucgen(yol('M68 97 V68 Q68 52 52 52 H45', 8)));
L('T-2a', 'Sağa Tehlikeli Devamlı Virajlar', 'İlki sağa olmak üzere birbirini izleyen tehlikeli virajlar bulunduğunu bildirir.',
  ucgen(yol('M49 97 V82 Q49 71 59 71 H61 Q71 71 71 60 V44', 8)));
L('T-2b', 'Sola Tehlikeli Devamlı Virajlar', 'İlki sola olmak üzere birbirini izleyen tehlikeli virajlar bulunduğunu bildirir.',
  ucgen(yol('M71 97 V82 Q71 71 61 71 H59 Q49 71 49 60 V44', 8)));
L('T-3a', 'Tehlikeli Eğim (İniş)', 'İleride tehlikeli iniş eğimli yol kesimi olduğunu bildirir; büyük araçlar vites düşürmelidir.',
  ucgen(sekil('M32 64 L104 98 H16 Z') + yazi(62, 74, 13, '%10', SY, ' transform="rotate(25.3 62 74)"')));
L('T-3b', 'Tehlikeli Eğim (Çıkış)', 'İleride tehlikeli çıkış eğimli yol kesimi olduğunu bildirir; büyük araçlar vites düşürmelidir.',
  ucgen(sekil('M88 64 L16 98 H104 Z') + yazi(58, 74, 13, '%10', SY, ' transform="rotate(-25.3 58 74)"')));
L('T-4a', 'İki Taraftan Daralan Kaplama', 'Yol kaplamasının her iki taraftan daraldığını bildirir.',
  ucgen(yol('M45 97 V82 L53 72 V50', 7) + yol('M75 97 V82 L67 72 V50', 7)));
L('T-4b', 'Sağdan Daralan Kaplama', 'Yol kaplamasının sağ taraftan daraldığını bildirir.',
  ucgen(yol('M47 97 V50', 7) + yol('M75 97 V82 L65 72 V50', 7)));
L('T-4c', 'Soldan Daralan Kaplama', 'Yol kaplamasının sol taraftan daraldığını bildirir.',
  ucgen(yol('M45 97 V82 L55 72 V50', 7) + yol('M73 97 V50', 7)));
L('T-7', 'Kasisli Yol', 'İleride hendek, kasis, çukur gibi yol yüzeyi bozuklukları olduğunu bildirir.',
  ucgen(sekil('M24 97 V88 Q34 70 44 88 H76 Q86 70 96 88 V97 Z')));
L('T-8', 'Kaygan Yol', 'Yol yüzeyinin kaygan olduğunu bildirir; ani fren, hızlanma ve manevradan kaçınılmalıdır.',
  ucgen(tasi(45, 42, 0.75, araba()) + yol('M52 67 C42 74 60 82 47 95', 3.5) + yol('M68 67 C58 74 76 82 63 95', 3.5)));
L('T-9', 'Gevşek Malzemeli Zemin', 'Taşıt yolunda gevşek malzeme bulunduğunu, öndeki araçlardan taş sıçrayabileceğini bildirir.',
  ucgen(tasi(28, 74, 0.6, araba()) + daire(62, 72, 3.2) + daire(70, 64, 2.6) + daire(74, 77, 3.4) + daire(82, 69, 2.4) +
    daire(66, 85, 2.6) + daire(84, 82, 3) + daire(78, 91, 2.2) + daire(90, 92, 2.4)));
L('T-10', 'Gevşek Şev', 'Yarma şevinden yola taş ve kaya parçaları düşebileceğini bildirir; yavaşlanmalı, bu kesimde durulmamalıdır.',
  ucgen(sekil('M52 98 L62 80 L66 72 L72 64 L76 55 L80 48 L110 98 Z') + daire(55, 60, 3.6) + daire(47, 70, 4) + daire(57, 75, 3) +
    daire(41, 84, 3.6) + daire(52, 89, 3)));
L('T-11', 'Yaya Geçidi', 'İleride yaya geçidi olduğunu bildirir.',
  ucgen([30, 40, 50, 60, 70, 80].map(x => `<polygon points="${x},95 ${x + 6},95 ${x + 9},87 ${x + 3},87" fill="${SY}"/>`).join('') + tasi(46, 44, 0.62, yaya())));
L('T-12', 'Okul Geçidi', 'Okul ya da oyun alanı gibi çocukların sık geçtiği bir yol kesimine yaklaşıldığını bildirir.',
  ucgen(tasi(33, 54, 0.62, yaya()) + tasi(57, 58, 0.62, kiz())));
L('T-13', 'Bisiklet Geçebilir', 'Bisiklet yolunun bu yola bağlandığını ya da bisikletlilerin karşıya geçebileceği kesimi bildirir.',
  ucgen(tasi(41, 62, 0.62, bisikletli())));
L('T-14a', 'Ehli Hayvanlar Geçebilir', 'Yolda evcil hayvanlar bulunabileceğini veya geçiş yapabileceğini bildirir.',
  ucgen(tasi(33, 63, 0.9, inek())));
L('T-14b', 'Vahşi Hayvanlar Geçebilir', 'Yolda vahşi hayvanlar bulunabileceğini veya geçiş yapabileceğini bildirir.',
  ucgen(tasi(32, 52, 0.9, geyik())));
L('T-15', 'Yolda Çalışma', 'İleride yol çalışması olduğunu, yol yüzeyinin kir ve çamur nedeniyle kaygan olabileceğini bildirir.',
  `<rect x="4" y="4" width="112" height="112" rx="4" fill="${SR}"/>` +
  `<g transform="translate(60 63) scale(0.86) translate(-60 -63)">` +
  ucgen(sekil('M66 97 Q79 76 99 97 Z') + daire(45, 52, 5.5) +
    `<g fill="none" stroke="${SY}"${YUV}><path d="M47 59 L59 74" stroke-width="9"/><path d="M59 74 L53 85 L52 96 M59 74 L68 85 L67 96" stroke-width="6"/><path d="M50 62 L59 70 L67 75" stroke-width="5"/></g>` +
    yol('M52 58 L80 88', 3) + sekil('M77 85 L86 83 L89 93 L80 95 Z')) + `</g>`);
L('T-16', 'Işıklı İşaret Cihazı', 'İleride ışıklı işaret cihazı ile yönetilen kavşak olduğunu bildirir.',
  ucgen(`<rect x="50" y="44" width="20" height="51" rx="5" fill="${SY}"/>` + daire(60, 53, 6, '#e3241b') + daire(60, 69.5, 6, '#f7c600') + daire(60, 86, 6, '#1fa34a')));
L('T-17', 'Havalimanı (Alçak Uçuş)', 'Yol üzerinden alçaktan uçak geçebileceğini, ani gürültüye hazırlıklı olunması gerektiğini bildirir.',
  ucgen(sekil('M34 74 Q36 70 42 70 H56 L62 52 H68 L66 70 H74 L78 66 H82 L80 74 L82 82 H78 L74 78 H66 L68 96 H62 L56 78 H42 Q36 78 34 74 Z')));
L('T-18', 'Yandan Rüzgar', 'Yandan kuvvetli rüzgar esebileceğini bildirir; hız düşürülmeli, öndeki araçları geçmekten kaçınılmalıdır.',
  ucgen((() => {
    const yu = x => 56 + 8 * (x - 38) / 48, al = x => 72 - 4 * (x - 38) / 48, xs = [38, 50, 62, 74, 86];
    let s = yol('M36 52 V97', 3);
    for (let i = 0; i < 4; i++) {
      const a = xs[i], b = xs[i + 1];
      s += `<polygon points="${a},${f(yu(a))} ${b},${f(yu(b))} ${b},${f(al(b))} ${a},${f(al(a))}" fill="${i % 2 ? BY : KR}"/>`;
    }
    return s + `<polygon points="38,56 86,64 86,68 38,72" fill="none" stroke="${SY}" stroke-width="1.6"/>`;
  })()));
L('T-19', 'İki Yönlü Trafik', 'Tek yönlü yol kesiminin iki yönlü trafiğe dönüştüğünü bildirir.',
  ucgen(ok(48, 48, 48, 96, 6) + ok(72, 96, 72, 48, 6)));
L('T-20', 'Dikkat', 'Diğer levhalarla belirtilemeyen bir tehlike olduğunu bildirir; tehlikenin cinsi ilave panelde yazar.',
  ucgen(`<rect x="55" y="42" width="10" height="36" rx="3" fill="${SY}"/>` + daire(60, 88, 5.5)));
L('T-21', 'Kontrolsüz Kavşak', 'İleride genel geçiş önceliği kuralının (sağdan gelenin önceliği) uygulandığı kontrolsüz kavşak olduğunu bildirir.',
  ucgen(yol('M45 57 L75 89 M75 57 L45 89', 9)));
const ANA = sekil('M60 42 L67 50 V97 L60 91 L53 97 V50 Z');
L('T-22a', 'Ana Yol - Tali Yol Kavşağı (sağ ve soldan)', 'Sağdan ve soldan tali yol bağlanan kavşağa yaklaşıldığını, ilk geçiş hakkının bu yoldakilere ait olduğunu bildirir.',
  ucgen(ANA + kutu(36, 66, 48, 7)));
L('T-22b', 'Ana Yol - Tali Yol Kavşağı (sağdan)', 'Sağdan tali yol bağlanan kavşağa yaklaşıldığını, ilk geçiş hakkının bu yoldakilere ait olduğunu bildirir.',
  ucgen(ANA + kutu(60, 66, 26, 7)));
L('T-22c', 'Ana Yol - Tali Yol Kavşağı (soldan)', 'Soldan tali yol bağlanan kavşağa yaklaşıldığını, ilk geçiş hakkının bu yoldakilere ait olduğunu bildirir.',
  ucgen(ANA + kutu(34, 66, 26, 7)));
L('T-22d', 'Ana Yol - Tali Yol Kavşağı (önce sağdan, sonra soldan)', 'Kademeli tali yol kavşağına yaklaşıldığını, ilk geçiş hakkının bu yoldakilere ait olduğunu bildirir.',
  ucgen(ANA + kutu(38, 58, 22, 6) + kutu(60, 76, 26, 6)));
L('T-22e', 'Ana Yol - Tali Yol Kavşağı (önce soldan, sonra sağdan)', 'Kademeli tali yol kavşağına yaklaşıldığını, ilk geçiş hakkının bu yoldakilere ait olduğunu bildirir.',
  ucgen(ANA + kutu(60, 58, 22, 6) + kutu(34, 76, 26, 6)));
L('T-23a', 'Sağdan Ana Yola Giriş', 'Bölünmüş yola sağdan bir yan yolun ya da bağlantı yolunun katıldığını bildirir.',
  ucgen(sekil('M53 40 L60 48 V97 H46 V48 Z') + sekil('M59 62 L84 97 H71 L59 80 Z')));
L('T-23b', 'Soldan Ana Yola Giriş', 'Bölünmüş yola soldan bir yan yolun ya da bağlantı yolunun katıldığını bildirir.',
  ucgen(ayna(60, sekil('M53 40 L60 48 V97 H46 V48 Z') + sekil('M59 62 L84 97 H71 L59 80 Z'))));
L('T-24', 'Modern Dönel Kavşak Yaklaşımı', 'İleride modern dönel kavşak olduğunu bildirir.',
  ucgen(yayOk(60, 73, 15, 105, 185, 5, SY) + yayOk(60, 73, 15, 225, 305, 5, SY) + yayOk(60, 73, 15, 345, 425, 5, SY)));
L('T-25', 'Kontrollü Demiryolu Geçidi', 'İleride bariyer veya benzeri sistemle kontrol edilen hemzemin demiryolu geçidi olduğunu bildirir.',
  ucgen([45, 55, 65, 75].map(x => `<polygon points="${x - 3},95 ${x - 3},64 ${x},59 ${x + 3},64 ${x + 3},95" fill="${SY}"/>`).join('') + kutu(37, 68, 46, 5) + kutu(37, 83, 46, 5)));
L('T-26', 'Kontrolsüz Demiryolu Geçidi', 'İleride bariyer veya benzeri sistemle kontrol edilmeyen hemzemin demiryolu geçidi olduğunu bildirir.',
  ucgen(kutu(34, 70, 36, 14) + kutu(68, 60, 18, 24) + kutu(72, 64, 10, 8, BY) + kutu(66, 58, 22, 3) + kutu(38, 62, 6, 9) + kutu(36, 59, 10, 4) +
    daire(54, 70, 4) + kutu(30, 84, 58, 4) + sekil('M30 84 L25 92 H33 Z') + daire(40, 92, 5) + daire(52, 92, 5) + daire(64, 92, 5) + daire(78, 92, 5) +
    daire(44, 53, 4) + daire(52, 49, 4.5) + daire(61, 48, 4) + daire(68, 51, 3.5)));
const kollar = (cx, cy, U, a) => {
  const dis = `<polygon points="${-U / 2},0 ${-U / 2 + 7},-8 ${U / 2 - 7},-8 ${U / 2},0 ${U / 2 - 7},8 ${-U / 2 + 7},8" fill="${KR}"/>`;
  const ic = `<rect x="${-U / 2 + 9}" y="-2.2" width="${U - 18}" height="4.4" fill="${BY}"/>`;
  return don(cx, cy, a, dis) + don(cx, cy, -a, dis) + don(cx, cy, a, ic) + don(cx, cy, -a, ic);
};
L('T-27a', 'Kontrolsüz Demiryolu Geçidi İşaret Levhası (Tek Hat)', 'Bariyersiz hemzemin demiryolu geçidinin tam yerini gösterir.',
  kollar(60, 60, 108, 28));
L('T-27b', 'Kontrolsüz Demiryolu Geçidi İşaret Levhası (Çok Hat)', 'Bariyersiz ve en az iki hatlı hemzemin demiryolu geçidinin tam yerini gösterir.',
  kollar(60, 46, 100, 28) + (() => {
    const yarim = `<polygon points="-4,-8 43,-8 50,0 43,8 -4,8" fill="${KR}"/>`, ic = `<rect x="0" y="-2.2" width="41" height="4.4" fill="${BY}"/>`;
    return don(60, 76, 28, yarim) + don(60, 76, 152, yarim) + don(60, 76, 28, ic) + don(60, 76, 152, ic);
  })());
const yaklasim = (etiket, yler) => `<rect x="40" y="6" width="40" height="108" fill="${BY}" stroke="${KR}" stroke-width="4"/>` + yazi(60, 20, 10, etiket) +
  yler.map(y => `<polygon points="42,${y + 10} 78,${y - 8} 78,${y + 2} 42,${y + 20}" fill="${KR}"/>`).join('');
L('T-28a', 'Hemzemin Demiryolu Geçidi Yaklaşım Levhası (3 bantlı)', 'Hemzemin geçide yaklaşıldığını bildirir; geçit uyarı levhasının (T-25/T-26) altında kullanılır.',
  yaklasim('300m', [36, 60, 84]));
L('T-29a', 'Hemzemin Demiryolu Geçidi Yaklaşım Levhası (2 bantlı)', 'Hemzemin geçide yaklaşıldığını bildirir; 3 bantlı levhadan sonra, geçide daha yakın konur.',
  yaklasim('200m', [56, 80]));
L('T-30a', 'Hemzemin Demiryolu Geçidi Yaklaşım Levhası (1 bantlı)', 'Hemzemin geçide yaklaşıldığını bildirir; geçide en yakın yaklaşım levhasıdır.',
  yaklasim('100m', [76]));
L('T-33a', 'Tehlikeli Viraj Yön Levhası', 'Tehlikeli virajın dış kenarında virajın yönünü göstererek sürücüye kılavuzluk eder.',
  `<rect x="22" y="12" width="76" height="96" fill="${BY}" stroke="#b5b5b5" stroke-width="1.5"/>` + `<polygon points="34,60 66,20 86,20 54,60 86,100 66,100" fill="${KR}"/>`);
L('T-37', 'Gizli Buzlanma', 'Yolun bu kesiminde önceden fark edilemeyen buzlanma olabileceğini bildirir.',
  ucgen((() => {
    let s = '';
    for (const a of [90, 30, -30]) {
      const r = a * Math.PI / 180, dx = Math.cos(r) * 15, dy = -Math.sin(r) * 15;
      s += yol(`M${f(60 - dx)} ${f(74 - dy)} L${f(60 + dx)} ${f(74 + dy)}`, 4, SY, YUV);
    }
    for (let k = 0; k < 6; k++) {
      const r = (90 + k * 60) * Math.PI / 180, cx = 60 + Math.cos(r) * 9.5, cy = 74 - Math.sin(r) * 9.5;
      const p = (aa, l) => `${f(cx + Math.cos(aa) * l)} ${f(cy - Math.sin(aa) * l)}`;
      s += yol(`M${p(r + 0.9, 5.5)} L${f(cx)} ${f(cy)} L${p(r - 0.9, 5.5)}`, 2.6, SY, YUV);
    }
    return s;
  })()));
L('T-38', 'Trafik Sıkışıklığı', 'İleride trafik sıkışıklığı olabileceğini bildirir; hız düşürmeye veya durmaya hazırlanılmalıdır.',
  ucgen(tasi(38, 50, 0.62, araba(SY, BY, true)) + tasi(48, 62, 0.62, araba(SY, BY, true)) + tasi(58, 74, 0.62, araba(SY, BY, true))));
L('T-39', 'Tramvay Hattı ile Oluşan Kavşak', 'İleride tramvay hattı ile oluşan bir kavşak olduğunu bildirir.',
  ucgen(tasi(28, 58, 1, tramvay())));

// ================= TRAFİK TANZİM İŞARETLERİ (TT grubu) =================
// Öncelik
L('TT-3', 'Karşıdan Gelene Yol Ver', 'Dar yol kesiminde geçiş önceliğinin karşıdan gelen araçlara ait olduğunu bildirir.',
  yasak(ok(46, 30, 46, 90, 8, SY) + ok(74, 90, 74, 30, 8, KR)));
// Yasaklama ve kısıtlama
L('TT-5', 'Taşıt Trafiğine Kapalı Yol', 'Yolun her iki yöndeki taşıt trafiğine kapalı olduğunu bildirir.', yasak());
L('TT-6', 'Motosiklet Hariç Motorlu Taşıt Trafiğine Kapalı Yol', 'Sepetsiz motosiklet ve motorlu bisikletler dışındaki motorlu taşıtların giremeyeceğini bildirir.',
  yasak(tasi(30, 40, 1.5, araba())));
L('TT-7', 'Motosiklet Giremez', 'Motosiklet girişinin yasak olduğunu bildirir.', yasak(tasi(28, 30, 1, motosiklet())));
L('TT-8', 'Bisiklet Giremez', 'Bisiklet girişinin yasak olduğunu bildirir.', yasak(tasi(30, 44, 1, bisiklet())));
L('TT-9', 'Motorlu Bisiklet Giremez', 'Motorlu bisiklet (moped) girişinin yasak olduğunu bildirir.',
  yasak(daire(39, 74, 9.5, 'none', ` stroke="${SY}" stroke-width="4"`) + daire(81, 74, 9.5, 'none', ` stroke="${SY}" stroke-width="4"`) +
    sekil('M30 66 Q31 57 41 56 H56 L58 66 Z') + kutu(41, 52, 13, 3.5) + yol('M48 68 H66 L74 45 M69 45 H81 M73 50 L81 74', 4, SY, YUV)));
L('TT-10a', 'Kamyon Giremez', 'Kamyon girişinin yasak olduğunu bildirir.', yasak(ayna(60, tasi(31, 45, 1, kamyon()))));
L('TT-10b', 'Otobüs Giremez', 'Otobüs girişinin yasak olduğunu bildirir.', yasak(tasi(28, 46, 1, otobus())));
L('TT-12', 'Yaya Giremez', 'Yayaların girmesinin yasak olduğunu bildirir.', yasak(tasi(42, 28, 1, yaya())));
L('TT-14', 'El Arabası Giremez', 'El arabası girişinin yasak olduğunu bildirir.',
  yasak(daire(36, 72, 8, 'none', ` stroke="${SY}" stroke-width="3.5"`) + yol('M24 62 H52', 5) + yol('M52 62 L68 57', 3) + ayna(78, tasi(64, 40, 0.7, yaya()))));
L('TT-15', 'Traktör Giremez', 'Tarım traktörünün girmesinin yasak olduğunu bildirir.',
  yasak(daire(74, 70, 15) + daire(74, 70, 5, BY) + daire(38, 78, 8) + daire(38, 78, 3, BY) + kutu(30, 60, 38, 11) +
    sekil('M58 40 H86 V44 H64 V60 H58 Z') + kutu(44, 47, 3.5, 14) + yol('M57 62 Q59 52 74 52 Q88 52 90 62', 3)));
L('TT-16a', 'Belirli Miktarlardan Fazla Patlayıcı ve Parlayıcı Madde Taşıyan Taşıt Giremez', 'Belirli miktardan fazla patlayıcı veya parlayıcı madde taşıyan taşıtların giremeyeceğini bildirir.',
  yasak(yildiz(60, 40, 17, 8, 9, TU) + yildiz(60, 41, 9, 4.5, 9, KR) + tasi(37, 56, 1.15, araba())));
L('TT-16b', 'Tehlikeli Madde Taşıyan Taşıt Giremez', 'Tehlikeli madde taşıyan taşıtların giremeyeceğini bildirir.',
  yasak(`<rect x="38" y="31" width="44" height="40" fill="${TU}" stroke="${SY}" stroke-width="2.5"/>` + kutu(34, 78, 52, 4) + kutu(30, 72, 6, 16) + kutu(84, 72, 6, 16)));
L('TT-17', 'Belirli Miktarlardan Fazla Su Kirletici Madde Taşıyan Taşıt Giremez', 'Belirli miktardan fazla su kirletici madde taşıyan taşıtların giremeyeceğini bildirir.',
  yasak(`<rect x="34" y="33" width="52" height="27" rx="13" fill="${TU}" stroke="${SY}" stroke-width="3"/>` + kutu(32, 61, 56, 5) + daire(43, 69, 4) + daire(77, 69, 4) +
    [78, 84, 90].map(y => yol(`M37 ${y} q3.5 -3.5 7 0 t7 0 t7 0 t7 0 t7 0 t7 0 t7 0`, 2.4, SU)).join('')));
L('TT-18', 'Motorlu Taşıt Giremez', 'Bisiklet ve hayvanla çekilen araçlar hariç, motosiklet ve motorlu bisiklet dahil her türlü motorlu taşıtın giremeyeceğini bildirir.',
  yasakCizgili(tasi(58, 32, 0.75, araba()) + tasi(28, 61, 0.5, motosiklet())));
L('TT-20', 'Genişliği … Metreden Fazla Olan Taşıt Giremez', 'Toplam genişliği levhada yazılı değerden fazla olan taşıtların giremeyeceğini bildirir.',
  yasak(yazi(52, 80, 46, '2') + yazi(76, 52, 16, 'm') + yazi(76, 82, 16, ',30'),
    `<polygon points="13,51 23,60 13,69" fill="${SY}"/><polygon points="107,51 97,60 107,69" fill="${SY}"/>`));
L('TT-21', 'Yüksekliği … Metreden Fazla Olan Taşıt Giremez', 'Toplam yüksekliği levhada yazılı değerden fazla olan taşıtların giremeyeceğini bildirir.',
  yasak(yazi(52, 80, 46, '3') + yazi(76, 52, 16, 'm') + yazi(76, 82, 16, ',50'),
    `<polygon points="51,13 60,23 69,13" fill="${SY}"/><polygon points="51,107 60,97 69,107" fill="${SY}"/>`));
L('TT-22', 'Uzunluğu … Metreden Fazla Olan Taşıt veya Katar Giremez', 'Uzunluğu levhada yazılı değerden fazla olan taşıt ya da katarın giremeyeceğini bildirir.',
  yasak(ayna(60, tasi(38, 36, 0.75, kamyon())) + yazi(60, 81, 11, '10m') + ok(48, 77, 27, 77, 2.5) + ok(72, 77, 93, 77, 2.5)));
L('TT-23', 'Dingil Başına … Tondan Fazla Yük Düşen Taşıt Giremez', 'Tek dingil başına levhada yazılı tondan fazla yük düşen taşıtların giremeyeceğini bildirir.',
  yasak(yazi(60, 45, 20, '6t') + ok(60, 49, 60, 66, 3) + kutu(34, 68, 52, 5) + kutu(28, 60, 7, 21) + kutu(85, 60, 7, 21)));
L('TT-24', 'Yüklü Ağırlığı … Tondan Fazla Olan Taşıt Giremez', 'Yüklü ağırlığı levhada yazılı değerden fazla olan taşıtların giremeyeceğini bildirir.',
  yasak(yazi(52, 82, 48, '7') + yazi(75, 52, 18, 't') + yazi(76, 84, 16, ',00')));
L('TT-25', 'Öndeki Taşıt … Metreden Daha Yakın Takip Edilmez', 'Öndeki taşıtın levhada yazılı mesafeden daha yakın takip edilemeyeceğini bildirir.',
  yasak(yazi(60, 54, 20, '70m') + tasi(19, 64, 0.7, arabaYan()) + tasi(70, 64, 0.7, arabaYan())));
L('TT-26a', 'Sağa Dönülmez', 'Sağa dönüşün yasak olduğunu bildirir.',
  yasakCizgili(egriOk('M50 94 V60 Q50 48 62 48 H68', 68, 48, 1, 0, 8)));
L('TT-26c', 'U Dönüşü Yapılmaz', 'U dönüşü yapmanın yasak olduğunu bildirir.',
  yasakCizgili(egriOk('M44 92 V54 Q44 36 60 36 Q76 36 76 54 V68', 76, 68, 0, 1, 8)));
L('TT-27', 'Öndeki Taşıtı Geçmek Yasaktır', 'Moped, sepetsiz motosiklet ve bisiklet dışındaki taşıtları geçmenin yasak olduğunu bildirir.',
  yasak(tasi(22, 47, 0.85, araba(KR)) + tasi(64, 47, 0.85, araba(SY))));
L('TT-28', 'Yük Taşıtlarının Öndeki Taşıtı Geçmesi Yasaktır', 'Azami ağırlığı 3,5 tonun üzerindeki yük taşıtlarının öndeki taşıtı geçmesinin yasak olduğunu bildirir.',
  yasak(tasi(19, 49, 0.62, kamyon(KR)) + tasi(64, 47, 0.85, araba(SY))));
L('TT-29b', 'Azami Hız Bölgesi', 'Hızın bölgesel olarak düşürüldüğü bir alana girildiğini ve bu bölgedeki azami hızı bildirir.',
  `<rect x="16" y="4" width="88" height="112" rx="5" fill="${BY}" stroke="${SY}" stroke-width="3"/>` + kutu(19, 7, 82, 32, SR) +
  yazi(60, 21, 11, 'AZAMİ HIZ') + yazi(60, 34, 11, 'BÖLGESİ') +
  `<circle cx="60" cy="77" r="27" fill="${BY}" stroke="${KR}" stroke-width="7"/>` + yazi(60, 87, 28, '30'));
L('TT-30', 'Sesli İkaz Cihazlarının Kullanımı Yasaktır', 'Kazadan kaçınma durumları hariç sesli ikaz cihazı (korna) kullanmanın yasak olduğunu bildirir.',
  yasakCizgili(sekil('M26 46 L46 55 H79 V65 H46 L26 74 Z') + daire(86, 60, 7)));
L('TT-31', 'Gümrük - Durmadan Geçmek Yasaktır', 'Sürücülerin gümrük (veya kontrol noktası) işlemleri için durmak zorunda olduğunu bildirir.',
  yasak(yazi(60, 51, 13, 'GÜMRÜK') + kutu(28, 56, 64, 7) + yazi(60, 78, 13, 'DOUANE')));
L('TT-32', 'Bütün Yasaklama ve Kısıtlamaların Sonu', 'Daha önce konulmuş bütün yasaklama ve kısıtlamaların sona erdiğini bildirir.', son());
L('TT-33a', 'Hız Sınırlaması Sonu', 'Daha önce uygulanan hız sınırlamasının sona erdiğini bildirir.',
  son(yazi(61, 78, 50, '50', SY, ' letter-spacing="8"')));
L('TT-33b', 'Azami Hız Bölgesi Sonu', 'Azami hız bölgesinden çıkıldığını ve bölgeye ait hız kısıtlamasının sona erdiğini bildirir.',
  `<rect x="16" y="4" width="88" height="112" rx="5" fill="${BY}" stroke="${SY}" stroke-width="3"/>` + yazi(60, 21, 11, 'AZAMİ HIZ') + yazi(60, 34, 11, 'BÖLGESİ') +
  kutu(16, 40, 88, 2.5) + `<circle cx="60" cy="77" r="27" fill="${BY}" stroke="${GR}" stroke-width="1.5"/>` +
  yazi(61, 87, 28, '30', SY, ' letter-spacing="5"') + `<line x1="45" y1="99" x2="75" y2="55" stroke="${SY}" stroke-width="6"/>`);
L('TT-34a', 'Geçme Yasağı Sonu', 'Öndeki taşıtı geçme yasağının sona erdiğini bildirir.',
  son(tasi(19, 47, 0.85, araba()) + tasi(67, 47, 0.85, araba())));
L('TT-34b', 'Kamyonlar İçin Geçme Yasağı Sonu', 'Kamyonlar için konulan geçme yasağının sona erdiğini bildirir.',
  son(tasi(17, 49, 0.62, kamyon()) + tasi(67, 47, 0.85, araba())));
// Mecburiyet
L('TT-35b', 'Sola Mecburi Yön', 'Sürücülerin sola gitmek zorunda olduğunu bildirir.', mecburi(ok(92, 60, 24, 60, 11, BY)));
L('TT-35c', 'İleri Mecburi Yön', 'Sürücülerin ileri (düz) gitmek zorunda olduğunu bildirir.', mecburi(ok(60, 94, 60, 24, 11, BY)));
L('TT-35d', 'İleri ve Sağa Mecburi Yön', 'Sürücülerin yalnızca ileri veya sağa gidebileceğini bildirir.',
  mecburi(ok(52, 96, 52, 22, 10, BY) + egriOk('M52 76 Q52 64 64 64 H69', 69, 64, 1, 0, 9, BY)));
L('TT-35e', 'İleri ve Sola Mecburi Yön', 'Sürücülerin yalnızca ileri veya sola gidebileceğini bildirir.',
  mecburi(ayna(60, ok(52, 96, 52, 22, 10, BY) + egriOk('M52 76 Q52 64 64 64 H69', 69, 64, 1, 0, 9, BY))));
L('TT-35f', 'Sağa ve Sola Mecburi Yön', 'Sürücülerin yalnızca sağa veya sola gidebileceğini bildirir.',
  mecburi(yol('M60 98 V74', 10, BY) + egriOk('M60 78 Q60 62 46 62 H43', 43, 62, -1, 0, 10, BY) + egriOk('M60 78 Q60 62 74 62 H77', 77, 62, 1, 0, 10, BY)));
L('TT-35g', 'İleride Sağa Mecburi Yön', 'Sürücülerin ileride sağa dönmek zorunda olduğunu bildirir.',
  mecburi(egriOk('M46 96 V62 Q46 46 62 46 H69', 69, 46, 1, 0, 11, BY)));
L('TT-35h', 'İleride Sola Mecburi Yön', 'Sürücülerin ileride sola dönmek zorunda olduğunu bildirir.',
  mecburi(ayna(60, egriOk('M46 96 V62 Q46 46 62 46 H69', 69, 46, 1, 0, 11, BY))));
L('TT-36a', 'Sağdan Gidiniz', 'Ayırıcı veya adanın sağından gidilmesi gerektiğini bildirir.', mecburi(ok(34, 34, 86, 86, 11, BY)));
L('TT-36b', 'Soldan Gidiniz', 'Ayırıcı veya adanın solundan gidilmesi gerektiğini bildirir.', mecburi(ok(86, 34, 34, 86, 11, BY)));
L('TT-36c', 'Her İki Yandan Gidiniz', 'Ayırıcı veya adanın her iki yanından da gidilebileceğini bildirir.',
  mecburi(ok(60, 36, 31, 73, 9, BY) + ok(60, 36, 89, 73, 9, BY)));
L('TT-37', 'Ada Etrafında Dönünüz', 'Dönel kavşakta izlenmesi gereken seyir yönünü (adanın etrafında) gösterir.',
  mecburi(yayOk(60, 60, 26, 110, 190, 9, BY) + yayOk(60, 60, 26, 230, 310, 9, BY) + yayOk(60, 60, 26, 350, 430, 9, BY)));
L('TT-38a', 'Mecburi Bisiklet Yolu', 'Bisikletlilerin bu yolu kullanmak zorunda olduğunu, diğer araçların bu yolu kullanamayacağını bildirir.',
  mecburi(tasi(30, 44, 1, bisiklet(BY))));
L('TT-38b', 'Mecburi Bisiklet Yolu Sonu', 'Mecburi bisiklet yolunun sona erdiğini bildirir.', mecburiSon(tasi(30, 44, 1, bisiklet(BY))));
L('TT-39a', 'Mecburi Yaya Yolu', 'Yayaların bu yolu kullanmak zorunda olduğunu, sürücülerin bu yolu kullanamayacağını bildirir.',
  mecburi(tasi(36, 27, 1.02, aile(BY))));
L('TT-39b', 'Mecburi Yaya Yolu Sonu', 'Mecburi yaya yolunun sona erdiğini bildirir.', mecburiSon(tasi(36, 27, 1.02, aile(BY))));
L('TT-41a', 'Mecburi Asgari Hız', 'Levhada yazılı hızdan daha düşük hızla gidilemeyeceğini bildirir.', mecburi(yazi(60, 78, 50, '30', BY)));
L('TT-41b', 'Mecburi Asgari Hız Sonu', 'Mecburi asgari hız sınırlamasının sona erdiğini bildirir.', mecburiSon(yazi(61, 78, 50, '30', BY, ' letter-spacing="8"')));
const zincir = `<rect x="44" y="26" width="32" height="68" rx="14" fill="none" stroke="${BY}" stroke-width="5"/>` +
  yol('M49 34 L71 44 L49 54 L71 64 L49 74 L71 86', 3, BY) + yol('M71 34 L49 44 L71 54 L49 64 L71 74 L49 86', 3, BY);
L('TT-42a', 'Zincir Takmak Mecburidir', 'Çekiş tekerleklerinin en az ikisine kar zinciri takmanın zorunlu olduğunu bildirir.', mecburi(zincir));
L('TT-42b', 'Zincir Takma Mecburiyeti Sonu', 'Zincir takma zorunluluğunun sona erdiğini bildirir.', mecburiSon(zincir));
const yayaBisiklet = tasi(43, 18, 0.64, aile(BY)) + tasi(39, 64, 0.7, bisiklet(BY));
L('TT-44a', 'Yayalar ve Bisikletliler Tarafından Kullanılabilen Yol', 'Yolu yalnızca yaya ve bisikletlilerin kullanabileceğini, diğerlerinin giremeyeceğini bildirir.', mecburi(yayaBisiklet));
L('TT-44b', 'Yayalar ve Bisikletliler Tarafından Kullanılabilen Yolun Sonu', 'Yaya ve bisikletlilerin birlikte kullandığı yolun sona erdiğini bildirir.', mecburiSon(yayaBisiklet));
const ayriAyri = kutu(58.2, 7, 3.6, 106, BY) + tasi(22, 34, 0.72, aile(BY)) + tasi(64, 52, 0.5, bisiklet(BY));
L('TT-45a', 'Yayalar ve Bisikletliler İçin Ayrı Ayrı Kullanılabilen Yol', 'Yaya ve bisikletlilerin, yolun kendilerine ayrılmış kısmını kullanacağını bildirir.', mecburi(ayriAyri));
L('TT-45b', 'Yayalar ve Bisikletliler İçin Ayrı Ayrı Kullanılabilen Yolun Sonu', 'Yaya ve bisikletliler için ayrı ayrı kullanılan yolun sona erdiğini bildirir.', mecburiSon(ayriAyri));

// ================= BİLGİ İŞARETLERİ (B grubu) =================
const meskun = `<rect x="4" y="32" width="112" height="56" rx="5" fill="${MV}"/><rect x="9" y="37" width="102" height="46" rx="3" fill="none" stroke="${BY}" stroke-width="2.5"/>` +
  yazi(60, 68, 19, 'ANKARA', BY, ' letter-spacing="2"');
L('B-9', 'Meskûn Mahal Levhası', 'Yerleşim yeri merkezine girildiğini ve azami hız sınırının 50 km/s olduğunu bildirir.', meskun);
L('B-10', 'Meskûn Mahal Sonu Levhası', 'Yerleşim yeri merkezinin ve 50 km/s azami hız sınırının sona erdiğini bildirir.',
  meskun + `<line x1="12" y1="84" x2="108" y2="36" stroke="${KR}" stroke-width="6"/>`);
const zebra = [30, 40, 50, 60, 70, 80].map(x => `<polygon points="${x},94 ${x + 6},94 ${x + 9},86 ${x + 3},86" fill="${SY}"/>`).join('');
L('B-14a', 'Yaya Geçidi', 'Yaya geçidinin yerini gösterir; sürücüler geçen veya geçmek üzere olan yayalara durarak ilk geçiş hakkını vermelidir.',
  bilgi(`<polygon points="60,18 104,97 16,97" fill="${BY}"/>` + zebra + tasi(46, 40, 0.65, yaya())));
L('B-14b', 'Okul Geçidi', 'Okul geçidinin yerini gösterir; sürücüler geçen veya geçmek üzere olan çocuk ve yayalara durarak ilk geçiş hakkını vermelidir.',
  bilgi(`<polygon points="60,18 104,97 16,97" fill="${BY}"/>` + zebra + tasi(40, 52, 0.5, yaya()) + tasi(60, 54, 0.5, kiz())));
L('B-16a', 'Tek Yönlü Yol', 'Girilen yolun ok yönünde tek yönlü olduğunu gösterir.',
  `<rect x="2" y="36" width="116" height="48" rx="4" fill="${MV}"/>` + sekil('M10 50 H80 V40 L110 60 L80 80 V70 H10 Z', BY) + yazi(46, 65, 13, 'TEK YÖN'));
L('B-16b', 'Tek Yönlü Yol', 'Girilen yolun ok yönünde tek yönlü olduğunu gösterir.',
  bilgi(sekil('M60 14 L84 42 H68 V84 H52 V42 H36 Z', BY) + kutu(22, 88, 76, 18, BY) + yazi(60, 101, 12, 'TEK YÖN')));
L('B-17', 'İleri Çıkmaz Yol', 'İleride çıkmaz yol olduğunu bildirir.', bilgi(kutu(53, 40, 14, 64, BY) + kutu(30, 20, 60, 18, KR)));
L('B-20', 'Motorlu Taşıt Yolu Başlangıcı', 'Trafik kurallarının otoyolla aynı olduğu bir yola girildiğini bildirir.',
  bilgi(tasi(21, 31, 1.95, araba(BY, MV))));
L('B-21', 'Motorlu Taşıt Yolu Sonu', 'Trafik kurallarının otoyolla aynı olduğu yolun sona erdiğini bildirir.',
  bilgi(tasi(21, 31, 1.95, araba(BY, MV)) + `<line x1="14" y1="106" x2="106" y2="14" stroke="${KR}" stroke-width="8"/>`));
L('B-22', 'Durak', 'Yolcu indirme-bindirme durağı olduğunu bildirir.', tesis(yazi(60, 82, 58, 'D')));
L('B-23', 'İlkyardım', 'İlk yardım merkezi olduğunu bildirir; bu kesimde gürültü yapılmamalıdır.',
  dikey(kutu(33, 11, 54, 62, BY) + daire(57, 42, 19, KR) + daire(64, 42, 16, BY) + yazi(70, 103, 15, '112', BY, ' letter-spacing="2"') +
    yol('M40 92 Q35 97 40 103 Q44 107 48 104', 3.5, BY, YUV)));
L('B-24', 'Tamirhane', 'Yol kenarında tamirhane olduğunu bildirir.',
  tesis(sekil('M40 34 H80 V46 H67 V86 Q67 90 60 90 Q53 90 53 86 V46 H40 Z') + kutu(71, 34, 3, 8, BY)));
L('B-25', 'Telefon', 'Yol kullanıcılarının yararlanabileceği bir telefon olduğunu bildirir.',
  tesis(yol('M44 38 Q35 46 41 59 Q50 77 70 83 Q77 85 80 80', 8, SY, YUV) + don(44, 38, -50, '<ellipse cx="0" cy="0" rx="9" ry="5.5" fill="#1a1a1a"/>') +
    don(79, 80, -25, '<ellipse cx="0" cy="0" rx="9" ry="5.5" fill="#1a1a1a"/>') + yol('M72 87 q2 6 7 4 t7 3', 2.4)));
L('B-26', 'Akaryakıt İstasyonu', 'Akaryakıt istasyonu olduğunu bildirir.',
  tesis(`<rect x="38" y="32" width="30" height="54" rx="3" fill="${SY}"/>` + kutu(43, 38, 20, 14, BY) + kutu(34, 84, 38, 6) +
    yol('M68 46 H74 Q78 46 78 50 V76 Q78 82 84 80', 3.5) + kutu(81, 66, 5, 12)));
L('B-27', 'Otel veya Motel', 'Yol kenarında otel veya motel olduğunu bildirir.',
  tesis(kutu(32, 48, 5, 34) + kutu(37, 62, 48, 9) + kutu(83, 56, 5, 26) + '<ellipse cx="45" cy="58" rx="7" ry="4" fill="#1a1a1a"/>'));
L('B-28', 'Lokanta', 'Lokanta olduğunu bildirir.',
  tesis(don(60, 62, -45, `<rect x="-2.6" y="-8" width="5.2" height="36" rx="2" fill="${SY}"/><ellipse cx="0" cy="-19" rx="7.5" ry="11" fill="${SY}"/>`) +
    don(60, 62, 45, `<rect x="-2.6" y="-10" width="5.2" height="38" rx="2" fill="${SY}"/><rect x="-8.5" y="-16" width="17" height="7" rx="2" fill="${SY}"/>` +
      [-8.5, -3.8, 0.9, 5.6].map(x => `<rect x="${x}" y="-32" width="2.9" height="18" fill="${SY}"/>`).join(''))));
L('B-29', 'Çayhane veya Kafeterya', 'Yol kenarında mola verilebilecek çayhane veya kafeterya olduğunu bildirir.',
  tesis(sekil('M36 44 H76 V56 Q76 72 60 72 H52 Q36 72 36 56 Z') + `<circle cx="80" cy="54" r="6.5" fill="none" stroke="${SY}" stroke-width="4"/>` +
    '<ellipse cx="57" cy="78" rx="27" ry="3.5" fill="#1a1a1a"/>'));
L('B-30', 'Çeşme', 'Yol kenarında çeşme olduğunu bildirir.',
  tesis(kutu(80, 42, 6, 26) + kutu(56, 48, 24, 10) + kutu(62, 40, 12, 4) + kutu(66, 40, 4, 10) +
    sekil('M56 48 H46 Q38 48 38 56 V64 H46 V60 Q46 58 48 58 H56 Z') + sekil('M42 70 Q37 77 42 80 Q47 77 42 70 Z')));
L('B-31', 'Piknik Yeri', 'Yol kenarında piknik alanı olduğunu bildirir.',
  tesis(sekil('M78 28 L88 46 H83 L92 62 H86 L95 76 H61 L70 62 H64 L73 46 H68 Z') + kutu(76, 76, 4, 10) + kutu(28, 66, 32, 4) + kutu(25, 77, 38, 3) +
    yol('M33 70 L53 88 M55 70 L35 88', 3)));
L('B-33', 'Kamp Yeri', 'Yol kenarında kamp alanı olduğunu bildirir.',
  tesis(sekil('M34 86 L60 42 L86 86 Z') + sekil('M54 86 L60 72 L66 86 Z', BY) + yol('M55 35 L64 49 M65 35 L56 49', 3)));
L('B-34', 'Karavanlı Kamp Yeri', 'Yol kenarında karavan alanı olduğunu bildirir.',
  tesis(sekil('M34 52 Q34 46 40 46 H82 Q88 46 88 54 V76 H34 Z') + kutu(40, 52, 18, 10, BY) + kutu(68, 54, 10, 18, BY) +
    daire(60, 79, 6.5) + daire(60, 79, 2.2, BY) + yol('M34 72 L25 75', 3)));
L('B-37', 'Önceliği Olan Yön', 'Daralan yol kesiminde bu yönden gelen araçların geçiş önceliği olduğunu bildirir.',
  bilgi(ok(42, 22, 42, 98, 10, KR) + ok(78, 98, 78, 22, 10, BY)));
L('B-44', 'Turizm Danışma', 'Turizm danışma bürosu olduğunu bildirir.',
  tesis(daire(60, 39, 6.5) + kutu(54, 51, 12, 34) + kutu(48, 51, 8, 5) + kutu(47, 84, 26, 6)));
L('B-48', 'Bölünmüş Yol Öncesi Yön Levhası', 'Yolun ileride bölünmüş yola dönüştüğünü ve gidilmesi gereken yolu gösterir.',
  dikey(yol('M60 112 V80 Q60 68 48 60 V42', 12, BY) + yol('M60 80 Q60 68 72 60 V14', 12, BY) + daire(48, 31, 11, KR) + kutu(40.5, 28.5, 15, 5, BY)));
L('B-49a', 'Tünel', 'Tünele girildiğini bildirir; farların yakılması yararlı olabilir.',
  `<rect x="28" y="4" width="64" height="112" rx="4" fill="${MV}"/>` + kutu(34, 12, 52, 56, BY) +
  sekil('M40 64 V40 Q40 20 60 20 Q80 20 80 40 V64 Z') + yol('M47 64 V42 Q47 28 60 28 Q73 28 73 42 V64', 2, BY) + yazi(60, 94, 11, 'TÜNEL', BY, ' letter-spacing="2"'));
L('B-52a', 'İki Yönlü Yol', 'Bu kesimden itibaren iki yönlü trafiğin işlediğini bildirir.', bilgi(ok(42, 22, 42, 98, 10, BY) + ok(78, 98, 78, 22, 10, BY)));
L('B-52b', 'İki Yönlü Yol', 'Girilmek üzere olan yolda trafiğin iki yönlü işletildiğini bildirir.',
  `<rect x="4" y="30" width="112" height="60" rx="5" fill="${MV}"/>` + ok(100, 47, 18, 47, 9, BY) + ok(20, 73, 102, 73, 9, BY));
L('B-58a', 'İstasyon', 'Tren istasyonu (gar) olduğunu bildirir.',
  tesis(sekil('M25 76 L31 57 Q34 48 44 48 H96 V76 Z') + sekil('M31 61 L34 54 Q36 53 40 53 V61 Z', BY) +
    [44, 56, 68, 80].map(x => kutu(x, 54, 8, 8, BY)).join('') + kutu(28, 78, 64, 3) + daire(40, 84, 3.2) + daire(52, 84, 3.2) + daire(70, 84, 3.2) + daire(82, 84, 3.2)));
L('B-58b', 'Otogar', 'Otogar olduğunu bildirir.', tesis(tasi(28, 47, 1, otobus())));
L('B-59', 'Tramvay Durağı', 'Tramvay durağı olduğunu bildirir.', tesis(tasi(28, 42, 1, tramvay())));
L('B-61a', 'Elektronik Denetleme Sistemi', 'Kamera vb. elektronik cihazlarla trafik denetimi yapıldığını bildirir.',
  tesis(`<rect x="32" y="42" width="42" height="36" rx="6" fill="${SY}"/>` + daire(52, 61, 11, BY) + daire(52, 61, 6.5) + daire(39, 48, 3, BY) + kutu(74, 52, 12, 16)));

// ================= DURMA VE PARK ETME İŞARETLERİ (P grubu) =================
L('P-3a', 'Park Yeri', 'Park yapılabilecek yeri gösterir.', bilgi(yazi(60, 92, 84, 'P', BY)));
L('P-3f', 'Kapalı Park Yeri', 'Kapalı park yeri olduğunu bildirir.',
  bilgi(yol('M16 52 L60 19 L104 52', 9, BY) + yazi(60, 102, 62, 'P', BY)));
L('P-3g', 'Park Yeri (Metrodan Yararlanacaklar İçin)', 'Metrodan yararlanmak isteyen sürücüler için park yeri olduğunu bildirir.',
  bilgi(yazi(66, 76, 64, 'P', BY) + kutu(18, 76, 18, 4.5, BY) + kutu(24.75, 69, 4.5, 18, BY) + yazi(66, 103, 13, 'METRO', BY, ' letter-spacing="2"')));
L('P-3h', 'Park Yeri (Tramvaydan Yararlanacaklar İçin)', 'Tramvaydan yararlanmak isteyen sürücüler için park yeri olduğunu bildirir.',
  bilgi(yazi(48, 72, 58, 'P', BY) + kutu(75, 40, 18, 4.5, BY) + kutu(81.75, 33, 4.5, 18, BY) + tasi(34, 78, 0.8, tramvay(BY, MV))));

export const levhaSvg = kod => (LEVHA[kod] || {}).svg || '';

// Görsel denetim (29 Eki 2026, KGM el kitabıyla yan yana): ayna görüntüsü çizilmiş sembolleri çevir
['T-14a', 'T-14b', 'TT-9', 'TT-26c'].forEach(k => { const x = LEVHA[k]; if (x) x.svg = x.svg.replace(/^(<svg[^>]*>)([\s\S]*)(<\/svg>)$/, '$1<g transform="translate(120 0) scale(-1 1)">$2</g>$3'); });
// El kitabıyla doğrulanamayan ya da hatalı çizilmiş olanlar soru bankasında kullanılmaz
export const DOGRULANMADI = ['TT-14', 'B-23', 'B-48', 'T-38', 'T-39', 'TT-33b', 'TT-44a', 'TT-44b', 'TT-45a', 'TT-45b', 'B-58a', 'B-58b', 'B-59', 'B-61a', 'P-3f', 'P-3g', 'P-3h', 'TT-29b', 'B-16b', 'B-52b'];
