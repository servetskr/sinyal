// Sunum verisi: gerçek kurs hesabında bir öğrenciyi, öğretmenini ve müdürü baştan sona göstermek için az sayıda örnek kayıt.
// Öğrenciye öğretmen atanır; geçmiş dersler (puanlı), bugün ve sonraki günlerde planlı dersler, ödeme planı ve sınav tarihi eklenir.
// Eklenen her kayıt "sunum: true" taşır; kaldırınca yalnız bunlar silinir ve öğrencinin önceki bilgileri geri gelir. Öğrencinin hesabına dokunulmaz.
import { S, gun, SINIFLAR, tamAd, islem, konuOner } from './veri.js?v=104';

const kucuk = s => String(s || '').toLocaleLowerCase('tr').trim();
// tek öğrenci / tek öğretmen varsa o; birden çoksa adıyla (Servet Sakar, Ahmet)
export function sunumKisileri() {
  const ks = S.kursiyerler.filter(k => !k.kapali), eg = S.egitmenler || [];
  const k = ks.length === 1 ? ks[0] : ks.find(x => kucuk(tamAd(x)) === 'servet sakar') || null;
  const h = eg.length === 1 ? eg[0] : eg.find(x => kucuk(x.ad).startsWith('ahmet')) || null;
  return { k, h };
}
export const sunumVar = () => S.dersler.some(d => d.sunum);

export function sunumVerisiEkle() {
  const { k, h } = sunumKisileri();
  if (!k) return { ok: false, hata: 'Öğrenci bulunamadı. Önce “Servet Sakar”ı öğrenci olarak kaydedin.' };
  if (!h) return { ok: false, hata: 'Öğretmen bulunamadı. Önce “Ahmet” adlı usta öğreticiyi Ekip ve araçlar’dan ekleyin.' };
  if (sunumVar()) return { ok: false, hata: 'Sunum verisi zaten ekli.' };
  const S0 = SINIFLAR[k.sinif] || SINIFLAR.B;
  // öğrencinin bugünkü bilgileri saklanır; kaldırınca geri yazılır
  k.sunumOnce = JSON.parse(JSON.stringify({ asama: k.asama, egitmen: k.egitmen || null, teorik: k.teorik || 0, direksiyon: k.direksiyon || 0, esinav: k.esinav || null, odeme: k.odeme }));
  if (!(h.siniflar || []).includes(k.sinif)) { h.siniflar = [...(h.siniflar || []), k.sinif]; h.sunumSinif = k.sinif; }
  // öğretmenin aracı yoksa bir sunum aracı
  let ar = S.araclar.find(a => a.egitmen === h.id && a.sinif === k.sinif);
  if (!ar) { ar = { id: 'a-sunum', plaka: '26 SNY 101', model: 'Renault Clio', yil: 2024, sinif: k.sinif, vites: 'Manuel', km: 42150, bakimKm: 45000, muayene: gun(240), sigorta: gun(160), kasko: gun(160), egitmen: h.id, gorsel: 'a1', sunum: true }; S.araclar.push(ar); }
  Object.assign(k, { egitmen: h.id, asama: 'Direksiyon', teorik: S0.teorik, direksiyon: 5, esinav: { sonuc: 'Geçti', puan: 88, hak: 1, tarih: gun(-16) } });
  // ödeme planı yoksa: peşinat ödendi, ilk taksit 5 gün sonra
  if (!k.odeme || !(k.odeme.taksitler || []).length) {
    const toplam = S0.ucret || 24000, pesin = 8000, n = 4, t = Math.round((toplam - pesin) / n / 50) * 50;
    k.odeme = { ...(k.odeme || {}), toplam, pesin, pesinTarih: gun(-30), ekler: (k.odeme && k.odeme.ekler) || [], taksitler: Array.from({ length: n }, (_, i) => ({ vade: gun(5 + i * 30), tutar: i === n - 1 ? toplam - pesin - t * (n - 1) : t, odendi: null, yontem: null })) };
  }
  const ders = (n, saat, ek) => ({ id: 'd-sunum-' + n + '-' + saat.replace(':', ''), kursiyer: k.id, egitmen: h.id, arac: ar.id, tarih: gun(n), saat, eklendi: gun(Math.min(n, 0) - 7), sunum: true, ...ek });
  const bit = s => { const [a, b] = s.split(':').map(Number), m = a * 60 + b + 50; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  // geçmiş 5 ders: puanlar giderek iyileşir; sonuncusu öğrencinin onayını bekler, notu öğrencinin ekranında görünür
  const puan = [[2, 3, 2, 2, 2], [3, 3, 3, 2, 3], [3, 4, 3, 3, 3], [4, 4, 4, 3, 3], [4, 4, 4, 4, 3]];
  [[-12, '10:00'], [-9, '14:00'], [-7, '11:00'], [-5, '15:00'], [-2, '10:00']].forEach(([n, s], i) => S.dersler.push(ders(n, s, {
    durum: 'Yapıldı', bas: s, bit: bit(s), sure: 50, meb: i < 4, konular: konuOner(k.sinif, i + 1, S0.direksiyon).slice(0, 2),
    beceri: Object.fromEntries([['kalkis', 0], ['serit', 1], ['kavsak', 2], ['park', 3], ['rampa', 4]].map(([b, j]) => [b, puan[i][j]])),
    imza: { zaman: gun(n) + 'T' + bit(s), kursiyer: null, usta: null },
    ...(i < 4 ? { ogrenciOnay: { durum: 'onay', tarih: gun(n) } } : { not: 'Kalkışta debriyajı daha yavaş bırak; ayna kontrolün iyi. Bir sonraki derste geri park çalışacağız.' }),
  })));
  // bugün: şu andan sonraki iki saat (akşam geç ise yarın sabah), sonra iki ders daha
  const simdi = new Date().getHours(), bugunSaatler = [simdi + 1, simdi + 3].filter(x => x >= 8 && x <= 19).map(x => String(x).padStart(2, '0') + ':00');
  (bugunSaatler.length ? bugunSaatler.map(s => [0, s]) : [[1, '09:00'], [1, '11:00']]).concat([[2, '10:00'], [4, '15:00']]).forEach(([n, s]) => S.dersler.push(ders(n, s, { durum: 'Planlandı' })));
  // direksiyon sınavı 10 gün sonra
  S.sinavlar.push({ id: 's-sunum', tur: 'Direksiyon', tarih: gun(10), saat: '09:30', yer: (S.kurs.sehir ? S.kurs.sehir + ' ' : '') + 'direksiyon sınav alanı', kursiyerler: [k.id], sunum: true });
  islem('Sunum verisi eklendi', tamAd(k) + ' · ' + h.ad);
  return { ok: true, k, h };
}

export function sunumVerisiKaldir() {
  const { k, h } = sunumKisileri();
  S.dersler = S.dersler.filter(d => !d.sunum);
  S.sinavlar = S.sinavlar.filter(s => !s.sunum);
  S.araclar = S.araclar.filter(a => !a.sunum);
  const ogr = S.kursiyerler.find(x => x.sunumOnce) || k;
  if (ogr && ogr.sunumOnce) { Object.assign(ogr, ogr.sunumOnce); delete ogr.sunumOnce; }
  (S.egitmenler || []).forEach(x => { if (x.sunumSinif) { x.siniflar = (x.siniflar || []).filter(s => s !== x.sunumSinif); delete x.sunumSinif; } });
  islem('Sunum verisi kaldırıldı', ogr ? tamAd(ogr) : '');
  return { ok: true, h };
}
