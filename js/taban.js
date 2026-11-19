// İl taban fiyat listeleri (valilik "Sürücü Eğitimi Maliyetlerini Belirleme Komisyonu" kararları): il + yıl (geçerlilik dönemi) bazlı.
// Kurs kendi ücretini belirler; buradaki tutarlar ALT SINIRDIR (MTSK Yön. md.43/4: aykırı kuruma işlem). Listesi girilmemiş ilde bütün işlevler
// boş (null) döner: hiçbir tutar tahmin edilmez. Yeni il ya da yıl: LISTELER'e aynı biçimde bir liste daha eklenir, kod değişmez.
// DOM ve veri.js bağımlılığı yok (Node'da denenir: sinyal-kaynak/arac/taban-test.mjs). Satır kimlikleri F1–F69, notlar FN1–FN9:
// sinyal-kaynak belgeler/mebbis-harita/MEBBIS-BIRLESIK-RAPOR.md §3 ile aynı. Tutarlar KDV dahil, TL (kuruş ondalıkla).
//
// Satır: { id, sayfa, mevcut (belgede yazdığı gibi), istenen (belgede yazdığı gibi), tur, m (mevcut belge kodları; null = belgesi yok),
//   mY (belgedeki grup adına yorumla eklenen kodlar), s (istenen sınıf kodları: mdSinyal sınıf kimlikleri), sY (yorumla eklenen sınıflar),
//   eski (belge 01.01.2016'dan önce), a1muaf (A1 muafiyetli), teorik / direksiyon ({ saat, ucret (saat ücreti), toplam } ya da null), toplam }
// tur: 'ilk' (ilk kez belge, teorik + direksiyon) · 'teorik' (yalnız teorik: G) · 'ceza' (100 ceza puanı eğitimi) · 'esinav' (e-sınav muafiyetli)
//      'fark' (mevcut belgeden başka sınıfa) · 'oto' (aynı sınıfın otomatiğinden manueline) · 'romork' · 'ilave' (ilave direksiyon dersi) · 'ozel' (belgeliye özel ders)

const d = (saat, ucret, toplam) => ({ saat, ucret, toplam });
const T195 = d(34, 195, 6630), T295 = d(34, 295, 10030);
const D840 = d(14, 840, 11760), D1055 = d(16, 1055, 16880);
// Belgedeki "B-C-D-F-G" grubu: B, C, D, F, G belgeleri yazılı; C1, CE, D1, DE gibi aynı ailenin belgeleri belgede ayrıca yazmıyor (mY: yorum)
const BCDFG = ['B', 'C', 'D', 'F', 'G'], BCDFG_Y = ['BE', 'C1', 'C1E', 'CE', 'D1', 'D1E', 'DE'];
// Not 3: otomatik/manuel ayrı yazılmayan sınıfta ikisi aynı ücret. "B" satırları otomatik B'ye de uyar; B Engelli belgede ayrı satır olduğu için yorumla eklenir.
const B_HEP = { s: ['B', 'B-O'], sY: ['B-EN'] };

const f = (id, sayfa, mevcut, istenen, tur, o, direksiyon, toplam) => ({ id, sayfa, mevcut, istenen, tur, m: null, s: [], teorik: null, direksiyon, toplam, ...o });

const ESKISEHIR_2026 = {
  id: 'eskisehir-2026',
  il: 'Eskişehir',
  yil: 2026,
  // Not 9: 2026 Şubat kurs döneminden 2027 Ocak kurs dönemleri dahil (dönem = MEBBİS grup ayı, YYYY-AA)
  donemBas: '2026-02', donemBit: '2027-01',
  kurum: 'T.C. Eskişehir Valiliği Sürücü Eğitimi Maliyetlerini Belirleme Komisyonu',
  belge: '2026 Yılı Sürücü Sertifikaları Eğitim Maliyet Tablosu',
  dosya: '4- 2026 YILI TABAN FİYAT LİSTESİ SERTİFİKA SIRALI ( %31,07 ARTIŞ ).pdf',
  artis: '%31,07 (dosya adında; tablo içinde geçmiyor)',
  kdvDahil: true,
  satirlar: [
    // —— sayfa 1: ilk kez belge (teorik 34 saat + direksiyon) ——
    f('F1', 1, '', 'M', 'ilk', { s: ['M'], teorik: T195 }, D840, 18390),
    f('F2', 1, '', 'A1', 'ilk', { s: ['A1'], teorik: T195 }, D840, 18390),
    f('F3', 1, '', 'A2', 'ilk', { s: ['A2'], teorik: T195 }, D840, 18390),
    f('F4', 1, '', 'A', 'ilk', { s: ['A'], teorik: T195 }, D840, 18390),
    f('F5', 1, '', 'B1', 'ilk', { s: ['B1'], teorik: T195 }, D840, 18390),
    f('F6', 1, '', 'B Manuel', 'ilk', { s: ['B'], teorik: T195 }, D1055, 23510),
    f('F7', 1, '', 'B Otomatik', 'ilk', { s: ['B-O'], teorik: T195 }, D1055, 23510),
    f('F8', 1, '', 'B Engelli', 'ilk', { s: ['B-EN'], teorik: T195 }, D1055, 23510),
    f('F9', 1, '', 'F', 'ilk', { s: ['F'], teorik: T195 }, D840, 18390),
    f('F10', 1, '', 'G', 'teorik', { s: ['G'], teorik: T295 }, null, 10030),
    f('F11', 1, '', '100 CEZA', 'ceza', { s: ['CEZA'], teorik: T295 }, null, 10030),
    // —— e-sınav muafiyetli (yalnız direksiyon) ——
    f('F12', 1, 'E Sınav Muafiyetli', 'A1-A2-A Sınıfı', 'esinav', { s: ['A1', 'A2', 'A'] }, d(14, 1120, 15680), 15680),
    f('F13', 1, 'E Sınav Muafiyetli', 'B Sınıfı', 'esinav', { ...B_HEP }, d(16, 1220, 19520), 19520),
    // —— farklı sınıf (yalnız direksiyon) ——
    f('F14', 1, 'A1 - A2 - A', 'B', 'fark', { m: ['A1', 'A2', 'A'], ...B_HEP }, d(16, 1225, 19600), 19600),
    f('F15', 1, 'F', 'B', 'fark', { m: ['F'], ...B_HEP }, d(16, 1225, 19600), 19600),
    f('F16', 1, 'G', 'B', 'fark', { m: ['G'], ...B_HEP }, d(16, 1225, 19600), 19600),
    f('F17', 1, 'B Otomatik', 'B Manuel', 'oto', { m: ['B'], s: ['B'] }, d(10, 1960, 19600), 19600),
    f('F18', 1, 'B-C-D-F-G', 'A1 Muafiyetli', 'fark', { m: BCDFG, mY: BCDFG_Y, s: ['A1'], a1muaf: true }, d(8, 1475, 11800), 11800),
    f('F19', 1, 'B-C-D-F-G', 'A1', 'fark', { m: BCDFG, mY: BCDFG_Y, s: ['A1'] }, d(14, 1125, 15750), 15750),
    f('F20', 1, 'E 01.01.2016 ÖNCESİ', 'A1', 'fark', { m: ['E'], s: ['A1'], eski: true }, d(14, 1125, 15750), 15750),
    f('F21', 1, 'M', 'A1', 'fark', { m: ['M'], s: ['A1'] }, d(14, 1125, 15750), 15750),
    f('F22', 1, 'B1', 'A1', 'fark', { m: ['B1'], s: ['A1'] }, d(14, 1125, 15750), 15750),
    f('F23', 1, 'A1 Otomatik', 'A1 Manuel', 'oto', { m: ['A1'], s: ['A1'] }, d(9, 1750, 15750), 15750),
    f('F24', 1, 'A1', 'A2', 'fark', { m: ['A1'], s: ['A2'] }, d(8, 2125, 17000), 17000),
    f('F25', 1, 'A1 01.01.2016 ÖNCESİ', 'A2', 'fark', { m: ['A1'], s: ['A2'], eski: true }, d(8, 2125, 17000), 17000),
    f('F26', 1, 'B-C-D-F-G', 'A2', 'fark', { m: BCDFG, mY: BCDFG_Y, s: ['A2'] }, d(14, 1214.5, 17003), 17003),
    f('F27', 1, 'E 01.01.2016 ÖNCESİ', 'A2', 'fark', { m: ['E'], s: ['A2'], eski: true }, d(14, 1214.5, 17003), 17003),
    f('F28', 1, 'M', 'A2', 'fark', { m: ['M'], s: ['A2'] }, d(14, 1214.5, 17003), 17003),
    f('F29', 1, 'B1', 'A2', 'fark', { m: ['B1'], s: ['A2'] }, d(14, 1214.5, 17003), 17003),
    f('F30', 1, 'A2 Otomatik', 'A2 Manuel', 'oto', { m: ['A2'], s: ['A2'] }, d(9, 1889, 17001), 17001),
    // —— sayfa 2 ——
    f('F31', 2, 'A1', 'A', 'fark', { m: ['A1'], s: ['A'] }, d(8, 2450, 19600), 19600),
    f('F32', 2, 'A1 01.01.2016 ÖNCESİ', 'A', 'fark', { m: ['A1'], s: ['A'], eski: true }, d(8, 2450, 19600), 19600),
    f('F33', 2, 'A2', 'A', 'fark', { m: ['A2'], s: ['A'] }, d(8, 2450, 19600), 19600),
    f('F34', 2, 'B-C-D-F-G', 'A', 'fark', { m: BCDFG, mY: BCDFG_Y, s: ['A'] }, d(14, 1400, 19600), 19600),
    f('F35', 2, 'E 01.01.2016 ÖNCESİ', 'A', 'fark', { m: ['E'], s: ['A'], eski: true }, d(14, 1400, 19600), 19600),
    f('F36', 2, 'M', 'A', 'fark', { m: ['M'], s: ['A'] }, d(14, 1400, 19600), 19600),
    f('F37', 2, 'B1', 'A', 'fark', { m: ['B1'], s: ['A'] }, d(14, 1400, 19600), 19600),
    f('F38', 2, 'A Otomatik', 'A Manuel', 'oto', { m: ['A'], s: ['A'] }, d(9, 2178, 19602), 19602),
    f('F39', 2, 'M', 'B1', 'fark', { m: ['M'], s: ['B1'] }, d(8, 2450, 19600), 19600),
    f('F40', 2, 'A1', 'B1', 'fark', { m: ['A1'], s: ['B1'] }, d(8, 2450, 19600), 19600),
    f('F41', 2, 'A1 01.01.2016 ÖNCESİ', 'B1', 'fark', { m: ['A1'], s: ['B1'], eski: true }, d(8, 2450, 19600), 19600),
    f('F42', 2, 'A2', 'B1', 'fark', { m: ['A2'], s: ['B1'] }, d(8, 2450, 19600), 19600),
    f('F43', 2, 'A', 'B1', 'fark', { m: ['A'], s: ['B1'] }, d(8, 2450, 19600), 19600),
    f('F44', 2, 'B1 Otomatik', 'B1 Manuel', 'oto', { m: ['B1'], s: ['B1'] }, d(9, 2178, 19602), 19602),
    f('F45', 2, 'B', 'C1', 'fark', { m: ['B'], s: ['C1'] }, d(12, 2075, 24900), 24900),
    f('F46', 2, 'B 01.01.2016 ÖNCESİ', 'C1', 'fark', { m: ['B'], s: ['C1'], eski: true }, d(7, 3557.5, 24902.5), 24902.5),
    f('F47', 2, 'D1', 'C1', 'fark', { m: ['D1'], s: ['C1'] }, d(7, 3557.5, 24902.5), 24902.5),
    f('F48', 2, 'D', 'C1', 'fark', { m: ['D'], s: ['C1'] }, d(7, 3557.5, 24902.5), 24902.5),
    f('F49', 2, 'C1 Otomatik', 'C1 Manuel', 'oto', { m: ['C1'], s: ['C1'] }, d(7, 3557.5, 24902.5), 24902.5),
    f('F50', 2, 'B', 'D1', 'fark', { m: ['B'], s: ['D1'] }, d(9, 2767, 24903), 24903),
    f('F51', 2, 'C1', 'D1', 'fark', { m: ['C1'], s: ['D1'] }, d(6, 4150, 24900), 24900),
    f('F52', 2, 'C', 'D1', 'fark', { m: ['C'], s: ['D1'] }, d(6, 4150, 24900), 24900),
    f('F53', 2, 'D1 Otomatik', 'D1 Manuel', 'oto', { m: ['D1'], s: ['D1'] }, d(6, 4150, 24900), 24900),
    f('F54', 2, 'B', 'C', 'fark', { m: ['B'], s: ['C'] }, d(22, 1318.18, 29000), 29000),
    f('F55', 2, 'B 01.01.2016 ÖNCESİ', 'C', 'fark', { m: ['B'], s: ['C'], eski: true }, d(16, 1812.5, 29000), 29000),
    f('F56', 2, 'C1', 'C', 'fark', { m: ['C1'], s: ['C'] }, d(12, 2416.67, 29000), 29000),
    f('F57', 2, 'D1', 'C', 'fark', { m: ['D1'], s: ['C'] }, d(16, 1812.5, 29000), 29000),
    f('F58', 2, 'D', 'C', 'fark', { m: ['D'], s: ['C'] }, d(12, 2416.67, 29000), 29000),
    f('F59', 2, 'C Otomatik', 'C Manuel', 'oto', { m: ['C'], s: ['C'] }, d(12, 2416.67, 29000), 29000),
    f('F60', 2, 'F-B-C1-C-D1-D', 'BE-C1E-CE-D1E-DE RÖMORK', 'romork', { m: ['F', 'B', 'C1', 'C', 'D1', 'D'], s: ['BE', 'C1E', 'CE', 'D1E', 'DE'] }, d(8, 3250, 26000), 26000),
    // —— sayfa 3 ——
    f('F61', 3, 'B', 'D', 'fark', { m: ['B'], s: ['D'] }, d(16, 1625, 26000), 26000),
    f('F62', 3, 'B 01.01.2016 ÖNCESİ', 'D', 'fark', { m: ['B'], s: ['D'], eski: true }, d(9, 2888.89, 26000), 26000),
    f('F63', 3, 'C1', 'D', 'fark', { m: ['C1'], s: ['D'] }, d(12, 2166.67, 26000), 26000),
    f('F64', 3, 'C', 'D', 'fark', { m: ['C'], s: ['D'] }, d(9, 2888.89, 26000), 26000),
    f('F65', 3, 'D1', 'D', 'fark', { m: ['D1'], s: ['D'] }, d(9, 2888.89, 26000), 26000),
    f('F66', 3, 'D Otomatik', 'D Manuel', 'oto', { m: ['D'], s: ['D'] }, d(9, 2888.89, 26000), 26000),
    f('F67', 3, 'G', 'F', 'fark', { m: ['G'], s: ['F'] }, d(14, 1300, 18200), 18200),
    f('F68', 3, 'Tüm sertifika sınıfları için', 'İlave direksiyon ders saat ücreti', 'ilave', {}, d(1, 1750, 1750), 1750),
    f('F69', 3, 'Sürücü belgelilere', 'Özel direksiyon eğitimi', 'ozel', {}, d(1, 1750, 1750), 1750),
  ],
  // Notlar belgedeki sırayla, kısaltılmadan (yalnız büyük harfler düzeltildi)
  notlar: [
    { no: 1, konu: 'kdv', metin: 'Yukarıda belirtilen ücretlere KDV dahildir. KDV oranında yapılacak değişiklikler için gerek duyulursa komisyon tekrar toplanarak karar verebilir veya liste güncellenerek kurumlara bildirilir.' },
    { no: 2, konu: 'saat', metin: 'Yukarıda belirtilen ders saatlerinde yönetmelik gereği olabilecek değişikliklerde gerek duyulması halinde ders saat ücretlerinin yeniden belirlenmesi için komisyon tekrar toplanarak karar verebilir veya liste güncellenerek kurumlara bildirilir.' },
    { no: 3, konu: 'otomatik', metin: 'Yukarıda otomatik veya manuel olarak özellikle belirtilenler dışındaki sertifika sınıfları için belirlenen ücretler, aynı sertifika sınıfına ait otomatik veya manuel seçenekleri fark etmeksizin uygulanacak belirlenen ücretlerdir.' },
    { no: 4, konu: 'ekUcret', metin: 'Eğitim materyalleri de dahil olmak üzere kursiyerlerden kurs ücretleri dışında hiçbir isim altında ücret talep edilemez.' },
    { no: 5, konu: 'masraf', metin: 'Teorik ve direksiyon sınav ücretleri, kursiyerin kayıt belgeleri ile ilgili masrafları, sürücü belgesi harcı ve kart ücreti vb. masrafları kursiyerin kendisine ait olup, kurs ücretlerine dahil edilerek veya ilave edilerek uygulanamaz.' },
    { no: 6, konu: 'kampanya', metin: 'Promosyon, ödül, hediye, başarı ödülü, takdir ödülü, kardeş indirimi, arkadaş indirimi, toplu kayıt indirimi vb. hiçbir isim altında kampanya düzenlenemez.' },
    { no: 7, konu: 'burs', metin: 'Özel Öğretim Kurumları Yönetmeliği’nin 62. ve 63. maddeleri kapsamında kurumca bursluluk sınavı düzenlenmesi durumunda dahi, maliyet ders saat ücretleri belirlendiğinden dolayı yukarıdaki ücretlerin altında burs verilemez. Aykırı hareket eden kurumlar hakkında MTSK Yönetmeliği’nin 43. maddesi (4.) fıkrası gereği uygulanır.' },
    { no: 8, konu: 'kayitYeri', metin: 'MTSK Yönetmeliği’nin 12. maddesinin (1.) fıkrası gereği, kursiyer kayıt iş ve işlemleri kurs merkezinde ve kurs müdürünün gözetiminde yapılır. Kurs merkezi dışında ve kurs müdürünün gözetiminden yoksun yapılacak kursiyer kaydı ile ilgili her türlü iş ve işlemlerin tespiti durumunda, tespiti yapılan kuruma MTSK Yönetmeliği’nin 43. maddesi (4.) fıkrası gereği uygulanır.' },
    { no: 9, konu: 'gecerlilik', metin: 'İş bu 2026 yılı Şubat kurs döneminden geçerli olmak üzere 2026 yılı tüm kurs dönemleri ve 2027 yılı Ocak ayı kurs dönemleri için uygulanmak üzere belirlenen eğitim maliyet tablosu ve notlarına aykırı davranan kurumlar hakkında MTSK Yönetmeliği’nin 43. maddesi (4.) fıkrası gereği uygulanır.' },
  ],
};

export const LISTELER = [ESKISEHIR_2026];

/* ---------- il ve dönem ---------- */
// İl adı sadeleştirilerek eşlenir ("Eskisehir", "ESKİŞEHİR", "Odunpazarı / Eskişehir" aynı il). Bulunamazsa null (Ankara'ya düşmez).
export const ilSade = x => String(x || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9 /-]/g, ' ');
const ilEsle = (metin, il) => { const t = ' ' + ilSade(metin).replace(/[/-]/g, ' ') + ' ', a = ilSade(il); return !!a && t.includes(' ' + a + ' '); };
// Kurs bilgisinden il: önce il, sonra şehir, en son adres alanı
export const kursunIli = K => { K = K || {}; const l = [...new Set(LISTELER.map(x => x.il))]; for (const a of ['il', 'sehir', 'adres']) { const v = l.find(il => ilEsle(K[a], il)); if (v) return v; } return null; };
// Tarih (YYYY-AA-GG) ya da dönem (YYYY-AA) → dönem
export const donemi = t => { const m = /^(\d{4})-?(\d{2})/.exec(String(t || '')); return m ? m[1] + '-' + m[2] : ''; };
// İlin bütün listeleri (eskiden yeniye)
export const ilinListeleri = il => il ? LISTELER.filter(x => ilSade(x.il) === ilSade(il)).sort((a, b) => a.donemBas.localeCompare(b.donemBas)) : [];
// O dönemde geçerli liste; yoksa null
export function listeBul(il, tarih) { const dn = donemi(tarih); if (!dn) return null; return ilinListeleri(il).find(x => x.donemBas <= dn && dn <= x.donemBit) || null; }
// Liste durumu (yıl değişince hatırlatma): { liste, son (ilin en yeni listesi), durum: 'yok'|'gecerli'|'bitti'|'bitiyor'|'baslamadi' }
export function listeDurumu(il, tarih) {
  const l = ilinListeleri(il), dn = donemi(tarih), g = listeBul(il, tarih), son = l[l.length - 1] || null;
  if (!son) return { durum: 'yok', liste: null, son: null };
  if (g) return { durum: g === son && dn === g.donemBit ? 'bitiyor' : 'gecerli', liste: g, son };
  return { durum: dn > son.donemBit ? 'bitti' : 'baslamadi', liste: null, son };
}
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const donemAdi = dn => { const m = /^(\d{4})-(\d{2})$/.exec(dn || ''); return m ? AY[+m[2] - 1] + ' ' + m[1] : ''; };
export const gecerlilikMetni = L => `${donemAdi(L.donemBas)} kurs döneminden ${donemAdi(L.donemBit)} kurs dönemine kadar`;
export const listeAdi = L => `${L.il} ${L.yil} taban fiyat listesi`;

/* ---------- satır eşleme ---------- */
const kodu = m => (m && m !== 'Yok') ? String(m) : '';
// Sınıfın "aynı sınıf" sayılan belgesi: B otomatik ve B Engelli için B
const anaSinif = s => s === 'B-O' || s === 'B-EN' ? 'B' : s;
// o: { sinif, mevcut, eski (belge 01.01.2016 öncesi), otomatik (belgede "sadece otomatik"), esinavMuaf, a1Muaf (en az 2 yıllık belge, A1 için md.39/5) }
// Dönüş: { satir, yorum: [metin], neden } — satir null ise neden yazılır (belgede bu durumun satırı yok)
export function satirBul(L, o) {
  if (!L || !o || !o.sinif) return null;
  const s = o.sinif, m = kodu(o.mevcut), R = L.satirlar, yorum = [];
  const ist = r => r.s.includes(s) ? 1 : (r.sY || []).includes(s) ? 2 : 0;
  const sonuc = (r, neden) => { if (!r) return { satir: null, yorum, neden }; if (ist(r) === 2) yorum.push(`Belgede “${r.istenen}” yazıyor; ${s === 'B-EN' ? 'B Engelli' : s} bu satıra sayıldı (not 3).`); return { satir: r, yorum, neden: '' }; };
  // yalnız teorik olanlar (G, 100 ceza): mevcut belge ücreti değiştirmez
  const teorikTek = R.find(r => (r.tur === 'teorik' || r.tur === 'ceza') && ist(r));
  if (teorikTek) return sonuc(teorikTek);
  if (!m) {
    if (o.esinavMuaf) return sonuc(R.find(r => r.tur === 'esinav' && ist(r)), `Belgede e-sınav muafiyetli ${s} satırı yok.`);
    return sonuc(R.find(r => r.tur === 'ilk' && ist(r)), `Belgede ${s} sınıfı için ilk kez belge satırı yok; bu sınıf mevcut bir belgeyle alınır.`);
  }
  if (m === anaSinif(s)) {
    if (!o.otomatik) return sonuc(null, `Adayın zaten ${m} belgesi var; belgede bu durumun satırı yok.`);
    if (s !== anaSinif(s)) return sonuc(null, `Belgesi “sadece otomatik”; ${s === 'B-O' ? 'B otomatik' : 'B Engelli'} için belgede satır yok.`);
    return sonuc(R.find(r => r.tur === 'oto' && r.s.includes(s)), `Belgede ${m} otomatikten manuele satırı yok.`);
  }
  let l = R.filter(r => (r.tur === 'fark' || r.tur === 'romork') && ist(r) && (r.m.includes(m) || (r.mY || []).includes(m)));
  if (!l.length) return sonuc(null, `Belgede ${m} belgesinden ${s === 'B-O' ? 'B otomatik' : s === 'B-EN' ? 'B Engelli' : s} sınıfına geçiş satırı yok.`);
  // A1: belgesi en az 2 yıllıksa "A1 Muafiyetli" satırı (md.39/5), değilse normal satır
  if (l.some(r => r.a1muaf)) l = l.filter(r => !!r.a1muaf === !!o.a1Muaf);
  // eski belge: "01.01.2016 öncesi" satırı varsa o; yoksa belgenin genel satırı (ör. "B → D1" eski B için de geçerli)
  const eski = !!o.eski || m === 'E';
  let r = l.find(x => !!x.eski === eski);
  if (!r && eski) { r = l.find(x => !x.eski); if (r) yorum.push(`Belgede “${m} 01.01.2016 öncesi → ${r.istenen}” satırı yok; genel “${r.mevcut} → ${r.istenen}” satırı uygulandı.`); }
  if (!r && !eski) { r = l.find(x => x.eski); if (r) yorum.push(`Belge tarihi girilmedi ya da 01.01.2016’dan sonra; belgede yalnız “${r.mevcut}” satırı var.`); }
  if (r && !r.m.includes(m)) yorum.push(`Belgede “${r.mevcut}” yazıyor; ${m} belgesi bu gruba sayıldı.`);
  return sonuc(r);
}
// Satırın kursiyere düşen taban tutarı. B Engelli kendi aracıyla: direksiyon ücretinin yarısı (MTSK Yön. md.7/5)
export function tabanTutar(r, o = {}) {
  if (!r) return null;
  if (o.kendiArac && r.direksiyon && r.s.includes('B-EN')) { const t = (r.teorik ? r.teorik.toplam : 0) + r.direksiyon.toplam / 2; return { tutar: t, aciklama: `Kendi aracıyla: direksiyon ücretinin yarısı (MTSK Yön. md.7/5): ${r.teorik ? 'teorik ' + r.teorik.toplam + ' + ' : ''}direksiyon ${r.direksiyon.toplam} / 2` }; }
  return { tutar: r.toplam, aciklama: '' };
}
// Satırın belgedeki adı: "B → C1", "İlk kez belge · B Manuel"
export const satirAdi = r => !r ? '' : r.tur === 'ilk' || r.tur === 'teorik' || r.tur === 'ceza' ? r.istenen : r.tur === 'ilave' || r.tur === 'ozel' ? `${r.mevcut} ${r.istenen.toLocaleLowerCase('tr')}` : `${r.mevcut} → ${r.istenen}`;
// Sınıfın ilk kez belge (ya da yalnız teorik) satırı: Ayarlar sınıf tablosundaki "il taban ücreti"
export const sinifSatiri = (L, sinif) => L ? L.satirlar.find(r => ['ilk', 'teorik', 'ceza'].includes(r.tur) && r.s.includes(sinif)) || null : null;
export const ozelSatir = (L, tur) => L ? L.satirlar.find(r => r.tur === tur) || null : null;
// Geçiş ücreti olarak kursun ayrıca fiyat belirlediği satırlar (ilk belge satırları sınıf ücretine, ilave/özel ek ve özel ders ücretine bağlı)
export const gecisSatirlari = L => L ? L.satirlar.filter(r => ['esinav', 'fark', 'oto', 'romork'].includes(r.tur)) : [];
