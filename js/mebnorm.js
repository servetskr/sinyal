// MEBBİS metinlerinin tek biçime indirilmesi (DIG-006; MEB-039, MEB-045 bu modülü kullanacak). Saf fonksiyonlar: DOM yok, S yok, içe aktarma yok.
// Kural: MEBBİS'ten gelen hiçbir dönem, sertifika, T.C., plaka ham metinle karşılaştırılmaz; önce buradan geçer.
// Birim testi: sinyal-kaynak/arac/mebbis-test/mebnorm-test.mjs
export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
// Türkçe harfleri sadeleştirir ve küçültür (eşleme anahtarı); "Â" gibi aksanlar harf olarak kalır (â → a), boşluğa dönmez
export const sade = v => String(v == null ? '' : v).toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
const AY_SADE = AYLAR.map(sade);

// Dönem: "202611", "2026-11", "2026/11", "2026 - Kasım", "KASIM 2026", "Kasım-2026" → "202611"; bulunamazsa ""
export function donemKodu(v) {
  const t = sade(v).trim(); if (!t) return '';
  let m = t.match(/^(\d{4})\s*[-/.]?\s*(\d{1,2})$/); if (m && +m[2] >= 1 && +m[2] <= 12) return m[1] + m[2].padStart(2, '0');
  const yil = (t.match(/(19|20)\d{2}/) || [])[0], ay = AY_SADE.findIndex(a => new RegExp('(^|[^a-z])' + a + '([^a-z]|$)').test(t)) + 1;
  return yil && ay ? yil + String(ay).padStart(2, '0') : '';
}
export const donemMetni = kod => { const m = String(kod || '').match(/^(\d{4})(\d{2})$/); return m && +m[2] >= 1 && +m[2] <= 12 ? `${m[1]} - ${AYLAR[+m[2] - 1]}` : ''; };
export const donemBaslangic = kod => { const m = String(kod || '').match(/^(\d{4})(\d{2})$/); return m ? `${m[1]}-${m[2]}-01` : ''; };

// Sertifika sınıfı ve şanzıman: "B SINIFI SERTİFİKA (Otomatik)", "B (Otomatik)", "B Otomatik", "B-O", "A2 SINIFI SERTİFİKA (Manuel)" → { sinif, otomatik, anahtar }; "YOK"/"" → null
const SINIF_RE = /^(A1|A2|B1|BE|C1E|C1|CE|D1E|D1|DE|[ABCDEFGM])(?![A-Z0-9])/;
export function sertifikaKodu(v) {
  const ham = String(v == null ? '' : v).trim(); if (!ham) return null;
  const b = ham.toLocaleUpperCase('tr').replace(/İ/g, 'I'), s = sade(ham);
  if (/^(yok|-|seciniz|belgesiz)$/.test(s.trim())) return null;
  if (/^b-?o$/.test(s.replace(/\s/g, ''))) return { sinif: 'B', otomatik: true, anahtar: 'B-O' };
  if (/^b-?en$/.test(s.replace(/\s/g, '')) || /engelli/.test(s)) return { sinif: 'B', otomatik: true, engelli: true, anahtar: 'B-EN' };
  const m = b.replace(/^\s+/, '').match(SINIF_RE); if (!m) return null;
  const otomatik = /otomatik/.test(s), manuel = /manuel|duz vites/.test(s);
  return { sinif: m[1], otomatik, manuel, anahtar: m[1] === 'B' && otomatik ? 'B-O' : m[1] };
}
// Satır seçiminde B ile B-O eşit; fark listesinde (sanzimanli) şanzıman ayrı. Şanzıman bilgisi taşımayan kaynak B-O'yu B'ye çevirmez (yalnız eşit sayılır).
export function sinifEsit(a, b, { sanzimanli = false } = {}) {
  const x = typeof a === 'object' && a ? a : sertifikaKodu(a), y = typeof b === 'object' && b ? b : sertifikaKodu(b); if (!x || !y) return false;
  if (x.sinif !== y.sinif) return false; if (!sanzimanli) return true;
  const bilinir = z => z.otomatik || z.manuel; return !(bilinir(x) && bilinir(y)) || x.otomatik === y.otomatik;
}
// T.C.: boşluk, nokta, tire atılır; 11 hane ve algoritma
export function tcGecerli(tc) {
  if (!/^[1-9]\d{10}$/.test(tc)) return false; const d = tc.split('').map(Number);
  const t1 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10, t2 = d.slice(0, 10).reduce((a, x) => a + x, 0) % 10;
  return ((t1 + 10) % 10) === d[9] && t2 === d[10];
}
export const tcTemiz = v => { const tc = String(v == null ? '' : v).replace(/\D/g, ''); return { tc, gecerli: tcGecerli(tc) }; };
// Tarih ve saat: "12/11/2026", "12.11.2026", "2026-11-12" → "2026-11-12"; "09.00-09.50", "09:00 - 09:50" → "09:00–09:50"
export const tarihIso = v => { const s = String(v || ''); let m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
export const saatAraligi = v => { const l = [...String(v || '').matchAll(/(\d{1,2})[:.](\d{2})/g)].map(m => m[1].padStart(2, '0') + ':' + m[2]); return l.length >= 2 ? l[0] + '–' + l[1] : l[0] || ''; };
// Sınav: katılım "Sınava Girdi"/"Girmedi"; sonuç BAŞARISIZ önce aranır (BAŞARILI'yı içerdiği için)
export const katilim = v => { const s = sade(v); return /girmedi|katilmadi|gelmedi|devamsiz/.test(s) ? 'girmedi' : /girdi|katildi/.test(s) ? 'girdi' : ''; };
export const sonucKodu = v => { const s = sade(v); return /girmedi|gelmedi|katilmadi|devamsiz/.test(s) && !/basari|gecti|kaldi/.test(s) ? 'girmedi' : /basarisiz|kaldi|gecmedi|olumsuz/.test(s) ? 'kaldi' : /basarili|gecti|olumlu|gecer(?!siz)/.test(s) ? 'gecti' : /girmedi/.test(s) ? 'girmedi' : ''; };
export function gerekceAyir(v) {
  const ham = String(v || ''), sonuc = sonucKodu(ham), ic = (ham.match(/\(([\s\S]*)\)\s*$/) || [])[1];
  if (ic == null) return { sonuc, baskan: '', uye: '', ham };
  const m = ic.match(/Ba[şs]kan\s*:\s*([\s\S]*?)\s*(?:[ÜU]ye\s*:\s*([\s\S]*))?$/i);
  return m ? { sonuc, baskan: m[1].trim(), uye: (m[2] || '').trim(), ham } : { sonuc, baskan: ic.trim(), uye: '', ham };
}
export function esinavSonuc(puan, metin, gecme = 70) { const s = sade(metin); if (/girmedi/.test(s)) return 'girmedi'; const p = parseFloat(String(puan || '').replace(',', '.')); if (isFinite(p)) return p >= gecme ? 'gecti' : 'kaldi'; return sonucKodu(metin); }
// Plaka: "26 AB 123", "06EBK893 (Manuel)" → { plaka: '26AB123', vites }
export const plakaKodu = v => { const s = String(v || ''), vt = (s.match(/\((manuel|otomatik)\)/i) || [])[1]; return { plaka: s.replace(/\(.*?\)/g, '').toLocaleUpperCase('tr').replace(/[^A-Z0-9]/g, ''), vites: vt ? vt[0].toUpperCase() + vt.slice(1).toLocaleLowerCase('tr') : '' }; };
export const kurumKodu = v => (String(v || '').match(/^\s*(\d{5,})/) || [])[1] || '';
export const adGoster = v => String(v || '').trim().split(/\s+/).map(w => w ? w[0].toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr') : '').join(' ');
