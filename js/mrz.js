// KAY-034: T.C. kimlik kartının arka yüzündeki MRZ'yi (ICAO 9303 TD1: 3 satır × 30 karakter) çözer. Saf işlevler; DOM ve ağ yok.
// Girdi: OCR'ın düz metni (yalnız A-Z 0-9 < karakterleriyle okunmuş). Çıktı: alanlar + her alanın kontrol hanesi sonucu.
// TD1 düzeni — 1. satır: belge kodu (2) · ülke (3) · belge no (9) · kontrol (1) · isteğe bağlı veri (15; T.C. kimlik no burada)
//              2. satır: doğum YYAAGG (6) · kontrol · cinsiyet · son geçerlilik YYAAGG (6) · kontrol · uyruk (3) · isteğe bağlı (11) · bileşik kontrol
//              3. satır: SOYAD<<AD<IKINCI<AD (Türkçe harfler MRZ'de yok: Ç→C, Ğ→G, İ→I, Ö→O, Ş→S, Ü→U)
// Test: ~/projects/sinyal-kaynak/arac/belgeoku-test (node).

const deger = c => c === '<' ? 0 : c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 55;
export const kontrolHanesi = s => String([...s].reduce((t, c, i) => t + deger(c) * [7, 3, 1][i % 3], 0) % 10);

// T.C. kimlik no algoritması: 11 hane, ilk hane 0 değil; 10. hane = ((tekler×7) − çiftler) mod 10; 11. hane = ilk 10'un toplamı mod 10
export function tcGecerli(tc) {
  if (!/^[1-9]\d{10}$/.test(tc)) return false;
  const d = [...tc].map(Number), tek = d[0] + d[2] + d[4] + d[6] + d[8], cift = d[1] + d[3] + d[5] + d[7];
  return ((tek * 7 - cift) % 10 + 10) % 10 === d[9] && d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

// OCR'ın sık karıştırdığı karakterler: rakam beklenen yerde harf, harf beklenen yerde rakam
const RAKAMA = { O: '0', Q: '0', D: '0', U: '0', I: '1', L: '1', J: '1', Z: '2', S: '5', G: '6', T: '7', B: '8', A: '4' };
const HARFE = { 0: 'O', 1: 'I', 2: 'Z', 4: 'A', 5: 'S', 6: 'G', 7: 'T', 8: 'B' };
const rakam = s => [...s].map(c => RAKAMA[c] || c).join('');
const harf = s => [...s].map(c => HARFE[c] || c).join('');
const dolgu = (s, n) => (s + '<'.repeat(n)).slice(0, n);

// YYAAGG → YYYY-AA-GG (doğumda gelecek yıl 1900'lere, son geçerlilikte hep 2000'lere)
function tarih(s, dogum, bugun) {
  if (!/^\d{6}$/.test(s)) return '';
  const yy = +s.slice(0, 2), ay = +s.slice(2, 4), gun = +s.slice(4, 6);
  if (ay < 1 || ay > 12 || gun < 1 || gun > 31) return '';
  const yil = dogum ? (yy > bugun.getFullYear() % 100 ? 1900 : 2000) + yy : 2000 + yy;
  return `${yil}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

// Belge no: T.C. kimlik kartı seri no biçimi A12B34567 (1. ve 4. karakter harf, gerisi rakam). Karıştırılan karakter yalnız bu biçime göre
// düzeltilir; kontrol hanesini tutturmak için rastgele deneme yapılmaz (her 10 denemeden biri yanlış değeri "doğrular").
const belgeNoBicimle = no => [...no].map((c, i) => i === 0 || i === 3 ? HARFE[c] || c : RAKAMA[c] || c).join('');

// 1. satırı düzenle: başını (I<TUR) bul; bulunamazsa satırın baştan hizalı olduğu varsayılır
function satir1(s) {
  if (s.length < 24) return null;
  const i = s.indexOf('TUR'), t = i >= 0 && i <= 4 ? s.slice(i + 3) : s.slice(5);
  return dolgu('I<TUR' + t, 30);
}
// 2. satır: ilk 18 karakter konumludur, son karakter bileşik kontrol; aradaki isteğe bağlı alan yalnız dolgudan oluşuyorsa uzunluğu ne olursa olsun 11 '<' yapılır
function satir2(s) {
  if (s.length < 26) return null;
  const bas = s.slice(0, 18), son = s.slice(-1); let orta = s.slice(18, -1);
  if (/^[<KC]*$/.test(orta)) orta = '<'.repeat(11); else orta = dolgu(orta, 11);
  const b = rakam(bas.slice(0, 7)) + (/[MF]/.test(bas[7]) ? bas[7] : '<') + rakam(bas.slice(8, 15)) + harf(bas.slice(15, 18));
  return b + orta + rakam(son);
}
function adlar(s) {
  let t = s.replace(/<+$/, '').replace(/K{3,}$/, ''); t = harf(t);
  const k = t.indexOf('<<'), soyad = (k < 0 ? t : t.slice(0, k)).replace(/</g, ' ').trim(), ad = (k < 0 ? '' : t.slice(k + 2)).replace(/<+/g, ' ').trim();
  return { soyad, ad };
}

// Üç satırı çözer. Dönüş: { alanlar, denetim, puan, tamam, satirlar } ya da null
export function mrzCoz(l1, l2, l3, bugun = new Date()) {
  const a = satir1(l1 || ''), b = satir2(l2 || ''); if (!a || !b) return null;
  const bkh = rakam(a[14]);
  let belgeNo = a.slice(5, 14);
  if (kontrolHanesi(belgeNoBicimle(belgeNo)) === bkh) belgeNo = belgeNoBicimle(belgeNo);
  const belgeTutar = kontrolHanesi(belgeNo) === bkh;
  const s1 = a.slice(0, 5) + belgeNo + bkh + a.slice(15);
  const dg = b.slice(0, 6), sg = b.slice(8, 14);
  const denetim = { belgeNo: belgeTutar, dogum: kontrolHanesi(dg) === b[6] && !!tarih(dg, true, bugun), gecerlilik: kontrolHanesi(sg) === b[14] && !!tarih(sg, false, bugun), uyruk: b.slice(15, 18) === 'TUR' };
  denetim.bilesik = kontrolHanesi(s1.slice(5, 30) + b.slice(0, 7) + b.slice(8, 15) + b.slice(18, 29)) === b[29];
  // T.C. kimlik no: isteğe bağlı alanlarda 11 haneli ve algoritmaya uyan dizi
  const tcAday = [rakam(s1.slice(15, 30).replace(/<+$/, '')), rakam(b.slice(18, 29).replace(/<+$/, ''))].flatMap(x => x.match(/\d{11}/g) || []);
  const tc = tcAday.find(tcGecerli) || '';
  denetim.tc = !!tc;
  const { soyad, ad } = adlar(l3 || '');
  const alanlar = {};
  if (tc) alanlar.tc = tc;
  if (denetim.dogum) alanlar.dogumTarihi = tarih(dg, true, bugun);
  if (denetim.bilesik && (b[7] === 'M' || b[7] === 'F')) alanlar.cinsiyet = b[7] === 'F' ? 'Kadın' : 'Erkek';
  if (denetim.belgeNo) alanlar.belgeNo = belgeNo;
  if (denetim.gecerlilik) alanlar.sonGecerlilik = tarih(sg, false, bugun);
  // ad ve soyadın kontrol hanesi yok: yalnız MRZ'nin geri kalanı tutarlıysa (doğru satırlar bulunmuşsa) verilir
  if ((denetim.bilesik || denetim.belgeNo && denetim.dogum) && soyad && /^[A-Z ]+$/.test(soyad + ad)) { alanlar.soyad = soyad; if (ad) alanlar.ad = ad; }
  const puan = ['belgeNo', 'dogum', 'gecerlilik', 'bilesik', 'tc', 'uyruk'].filter(k => denetim[k]).length;
  return { alanlar, denetim, puan, tamam: puan === 6, satirlar: [s1, b, dolgu(l3 || '', 30)] };
}

// OCR metninden MRZ'yi bul: art arda her üç satır denenir; en çok kontrolü tutan çözüm döner (en az ikisi tutmalı).
export function mrzBul(metin, bugun = new Date()) {
  const l = String(metin || '').toUpperCase().split(/\n+/).map(s => s.replace(/[^A-Z0-9<]/g, '')).filter(s => s.length >= 24);
  let en = null;
  for (let i = 0; i + 1 < l.length; i++) {
    const r = mrzCoz(l[i], l[i + 1], l[i + 2] || '', bugun);
    if (r && r.puan >= 2 && (!en || r.puan > en.puan)) en = r;
  }
  return en;
}
