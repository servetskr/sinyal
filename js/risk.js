import { S, gun, fark, SINIFLAR, egitmen, kapaliGun, dersAraci, risk, kursAdi } from './veri.js?v=100';

const ort = l => l.length ? l.reduce((a, x) => a + x, 0) / l.length : null;
export const riskliler = (l = S.kursiyerler) => l.map(k => ({ k, r: risk(k) })).filter(x => x.r && x.r.puan >= 25).sort((a, b) => b.r.puan - a.r.puan);

/* ================= DERS BAŞI KÂR VE BOŞ KAPASİTE ================= */
export const KAPASITE_SAAT = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
export function dersMaliyeti(primOrt) {
  const m = S.kurs.maliyet, yakit = Math.round(m.km * m.tuketim / 100 * m.yakit);
  const prim = primOrt != null ? primOrt : Math.round(ort(S.egitmenler.map(x => x.prim || 0)) || 0);
  return { yakit, prim, bakim: +m.bakim || 0, toplam: yakit + prim + (+m.bakim || 0) };
}
export function sinifKari(sinif) {
  const S0 = SINIFLAR[sinif]; if (!S0 || !S0.ucret || !S0.direksiyon) return null;
  const gelir = Math.round(S0.ucret * (S.kurs.maliyet.pay / 100) / S0.direksiyon), mal = dersMaliyeti();
  return { gelir, maliyet: mal, kar: gelir - mal.toplam, marj: Math.round((gelir - mal.toplam) / gelir * 100) };
}
// Önümüzdeki iş günlerinde boş usta-saatleri. Her boş saat bir ders satışı fırsatıdır.
export function bosKapasite(gunSay = 6) {
  const gunler = []; for (let n = 1; gunler.length < gunSay && n < 20; n++) if (!kapaliGun(gun(n))) gunler.push(gun(n));
  const izinde = (kim, g) => (S.izinler || []).some(i => i.kim === kim && g >= i.bas && g <= i.bit);
  const hucre = gunler.map(g => KAPASITE_SAAT.map(sa => {
    const bos = S.egitmenler.filter(h => !izinde(h.id, g) && !S.dersler.some(d => d.egitmen === h.id && d.tarih === g && d.saat === sa && d.durum !== 'İptal'));
    return { g, sa, bos: bos.length, ustalar: bos.map(h => h.id) };
  }));
  return { gunler, hucre, toplam: hucre.flat().reduce((a, c) => a + c.bos, 0) };
}
export function hakedis(ayGeri = 0) {
  const d0 = new Date(); d0.setDate(1); d0.setMonth(d0.getMonth() - ayGeri);
  const buAy = t => t.slice(0, 7) === `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}`;
  return S.egitmenler.map(h => {
    const l = S.dersler.filter(d => d.egitmen === h.id && d.durum === 'Yapıldı' && buAy(d.tarih));
    const kisa = l.filter(d => d.sure != null && d.sure < 40).length, imzasiz = l.filter(d => !d.imza || d.imza.kursiyerBekliyor).length;
    const prim = l.length * (h.prim || 0), toplam = (h.maas || 0) + prim;
    return { h, ders: l.length, kisa, imzasiz, prim, maas: h.maas || 0, toplam, dersBasi: l.length ? Math.round(toplam / l.length) : null };
  });
}

/* ================= KURSİYERİN KENDİ RANDEVUSU ================= */
export function randevuEngeli(k) {
  if (k.kapali) return 'Kaydın şu an ' + (k.kapali.tur === 'dondur' ? 'dondurulmuş' : 'kapalı') + `; ders için ${kursAdi('e')} yaz.`;
  if (!S.kurs.kendiRandevu) return `${kursAdi()} direksiyon saatlerini kendisi planlıyor; ders için ${kursAdi('e')} yaz.`;
  if (!['Direksiyon', 'Sınav'].includes(k.asama)) return k.asama === 'Teorik' || k.asama === 'Kayıt' || k.asama === 'Evrak' ? 'Direksiyon derslerin e-sınavı geçince açılır.' : 'Şu an direksiyon dersin yok.';
  const S0 = SINIFLAR[k.sinif]; if (!S0.direksiyon) return 'Bu sınıfta direksiyon dersi yok.';
  const planli = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı').length;
  if (k.direksiyon + planli >= S0.direksiyon + (k.ekDersHakki || 0)) return `Zorunlu ${S0.direksiyon} dersinin hepsi planlandı. Ek ders için ${kursAdi('e')} yazabilirsin.`;
  const gec = k.odeme.taksitler.filter(t => !t.odendi && !t.iptal && fark(t.vade) < 0);
  if (gec.length && S.kurs.borcluDers === 'engelle') return 'Gecikmiş taksidin var; ödeme yapınca yeni ders alabilirsin.';
  return null;
}
// Otomatik ders planı (öneri): ders hakkı kalan kursiyerlere önümüzdeki günlerin boş usta/araç saatlerini dağıtır.
// Kurallar: kursiyer başı günlük sınır, usta başı günlük sınır, araç muayene/sigorta, usta izni, kapalı gün, borçlu kursiyer ayarı.
// Öncelik: sınavı yakın olan, sonra en uzun süredir dersi olmayan. Müdür onaylamadan hiçbir ders eklenmez.
export function otomatikPlan({ gunSay = 7, haftalik = 3 } = {}) {
  const kSinir = S.kurs.gunlukDersSiniri || 2, uSinir = S.kurs.egitmenGunlukSinir || S.kurs.ustaGunlukSinir || 8;
  const dolu = new Set(), kGun = {}, uGun = {}, kHafta = {};
  const ekle = d => { dolu.add('u' + d.tarih + d.saat + d.egitmen); dolu.add('k' + d.tarih + d.saat + d.kursiyer); if (d.arac) dolu.add('a' + d.tarih + d.saat + d.arac); kGun[d.kursiyer + d.tarih] = (kGun[d.kursiyer + d.tarih] || 0) + 1; uGun[d.egitmen + d.tarih] = (uGun[d.egitmen + d.tarih] || 0) + 1; kHafta[d.kursiyer] = (kHafta[d.kursiyer] || 0) + 1; };
  S.dersler.filter(d => d.durum !== 'İptal' && fark(d.tarih) >= 0).forEach(d => { ekle(d); if (fark(d.tarih) < 1 || fark(d.tarih) > gunSay) kHafta[d.kursiyer]--; });
  const sonDers = k => S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').reduce((a, d) => d.tarih > a ? d.tarih : a, '');
  const adaylar = S.kursiyerler.filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && SINIFLAR[k.sinif].direksiyon && egitmen(k.egitmen))
    .map(k => ({ k, kalan: SINIFLAR[k.sinif].direksiyon + (k.ekDersHakki || 0) - k.direksiyon - S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı').length }))
    .filter(x => x.kalan > 0 && !(S.kurs.borcluDers === 'engelle' && x.k.odeme.taksitler.some(t => !t.odendi && !t.iptal && fark(t.vade) < 0)))
    .sort((a, b) => (a.k.dsinavPlan || '9999').localeCompare(b.k.dsinavPlan || '9999') || sonDers(a.k).localeCompare(sonDers(b.k)));
  const oneri = [];
  for (let n = 1; n <= gunSay; n++) {
    const g = gun(n); if (kapaliGun(g)) continue;
    for (const x of adaylar) {
      if (x.kalan <= 0 || (kHafta[x.k.id] || 0) >= haftalik || (kGun[x.k.id + g] || 0) >= kSinir) continue;
      const h = egitmen(x.k.egitmen);
      if ((S.izinler || []).some(i => i.kim === h.id && g >= i.bas && g <= i.bit) || (uGun[h.id + g] || 0) >= uSinir) continue;
      for (const sa of KAPASITE_SAAT) {
        if (dolu.has('u' + g + sa + h.id) || dolu.has('k' + g + sa + x.k.id)) continue;
        const ar = dersAraci(h.id, x.k.sinif, g, sa); if (!ar || dolu.has('a' + g + sa + ar.id) || [ar.muayene, ar.sigorta].some(t => t && t < g)) continue;
        const d = { kursiyer: x.k.id, egitmen: h.id, arac: ar.id, tarih: g, saat: sa };
        ekle(d); oneri.push(d); x.kalan--; break;
      }
    }
  }
  return oneri;
}
export function bosSlotlar(k, gunSay = 7) {
  const h = egitmen(k.egitmen); if (!h) return [];
  const l = [];
  for (let n = 1; n <= gunSay + 3 && l.length < 40; n++) {
    const g = gun(n); if (kapaliGun(g)) continue;
    if ((S.izinler || []).some(i => i.kim === h.id && g >= i.bas && g <= i.bit)) continue;
    const oGun = S.dersler.filter(d => d.kursiyer === k.id && d.tarih === g).length;
    if (oGun >= (S.kurs.gunlukDersSiniri || 2)) continue;
    KAPASITE_SAAT.forEach(sa => {
      if (S.dersler.some(d => d.tarih === g && d.saat === sa && (d.egitmen === h.id || d.kursiyer === k.id) && d.durum !== 'İptal')) return;
      const ar = dersAraci(h.id, k.sinif, g, sa); if (!ar) return;
      if ([ar.muayene, ar.sigorta].some(t => t && t < g)) return;
      l.push({ tarih: g, saat: sa, egitmen: h.id, arac: ar.id });
    });
  }
  return l;
}
