// Otomatik direksiyon ders planı (DIR-031…038). DOM'a dokunmaz; tarayıcıda ve Node'da (arac/planlayici-test) aynı çalışır.
// Bütün hesap istemcide yapılır, yeni koleksiyon yok. Müdür onaylamadan hiçbir ders eklenmez: çıktı yalnız öneridir.
//
// planOner({ kursiyerler, bas, gunSay, hocaSecimi, tekUsta, dogrula }) →
//   { oneriler: [{ kursiyer, egitmen, arac, simulator, tarih, saat, tur, egitimTuru, etiket[] }],
//     yerlesmeyen: [{ kursiyer, eksik: { toplam, simAlan, trafik, gece }, neden: [metin] }],
//     yuk: { [egitmenId]: { ad, gun: { [tarih]: n }, hafta: { [pazartesi]: n }, sinir, kaynak, gunSinir } }, uyari: [metin], bos: metin|null }
//
// Adımlar: 1) ortak takvim (mevcut dersler + yerleşen öneriler), 2) ihtiyaç ve öncelik, 3) uygunluk (usta, araç, simülatör),
// 4) yerleştirme (en kıt kaynaktan: gece → simülatör/alan → akan trafik, turlarla), 5) son doğrulama (kural motoru, dogrula).
import {
  S, gun, iso, tarihOku, fark, kapaliGun, arifeMi, egitmen, kursiyer, tamAd, gecikenler, SINIFLAR, kuralAyar, dersSayaci, gerekliDireksiyon, geceDersMi,
  geceBaslangic, geceKisitli, geceGerekli, kayitDondurmaMi, belgeliMi, izinDurumu, haftalikSinir, ustaYetkili, ustaAraci, aracSiniflari, aracUygun,
  egitimTuruOf, EGITIM_TURU, dersSaatleri, planAyar, anaSinif, hazirYazisiVar,
} from './veri.js?v=234';

const B_ENGELLI_KENDI = k => !!k && k.sinif === 'B-EN' && !!k.kendiArac;
const gunEkle = (t, n) => { const d = tarihOku(t); d.setDate(d.getDate() + n); return iso(d); };
const pazartesi = t => { const d = tarihOku(t); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return iso(d); };
const trT = t => t ? t.split('-').reverse().join('.') : '';
const saatSay = s => +String(s).slice(0, 2) * 60 + +String(s).slice(3, 5);
const GECE_SON = '22:00';   // MTSK md.20/1: dersler 23:00'te biter; son ders 22:00'de başlar

// 1) Ortak takvim: tekil anahtarlar (usta/araç/kursiyer/simülatör × tarih × saat) ve sayaçlar. İptal ve 'Gelmedi' ders yer tutmaz.
export function takvimKur(dersler, bas, son) {
  const T = { dolu: new Set(), uGun: {}, uHafta: {}, kGun: {}, kHafta: {}, kUsta: {}, kSonAS: {}, kIlkTrafik: {} };
  T.ekle = d => {
    const t = d.tarih, s = d.saat, h = pazartesi(t);
    T.dolu.add('u|' + t + '|' + s + '|' + d.egitmen); T.dolu.add('k|' + t + '|' + s + '|' + d.kursiyer);
    if (d.arac) T.dolu.add('a|' + t + '|' + s + '|' + d.arac);
    if (d.tur === 'simulator' && d.simulator) T.dolu.add('m|' + t + '|' + s + '|' + d.simulator);
    T.uGun[d.egitmen + '|' + t] = (T.uGun[d.egitmen + '|' + t] || 0) + 1; T.uHafta[d.egitmen + '|' + h] = (T.uHafta[d.egitmen + '|' + h] || 0) + 1;
    T.kGun[d.kursiyer + '|' + t] = (T.kGun[d.kursiyer + '|' + t] || 0) + 1; T.kHafta[d.kursiyer + '|' + h] = (T.kHafta[d.kursiyer + '|' + h] || 0) + 1;
    if (!T.kUsta[d.kursiyer + '|' + t]) T.kUsta[d.kursiyer + '|' + t] = d.egitmen;
    const an = t + ' ' + s;
    if (d.tur === 'alan' || d.tur === 'simulator') { if (an > (T.kSonAS[d.kursiyer] || '')) T.kSonAS[d.kursiyer] = an; }
    else if (!T.kIlkTrafik[d.kursiyer] || an < T.kIlkTrafik[d.kursiyer]) T.kIlkTrafik[d.kursiyer] = an;
  };
  (dersler || []).filter(d => d && d.durum !== 'İptal' && d.durum !== 'Gelmedi' && d.tarih >= bas && d.tarih <= son).forEach(T.ekle);
  // alan/simülatör sırası (md.7/1) için bütün geçmiş de gerekir
  (dersler || []).filter(d => d && d.durum !== 'İptal' && d.durum !== 'Gelmedi' && (d.tarih < bas || d.tarih > son)).forEach(d => {
    const an = d.tarih + ' ' + d.saat;
    if (d.tur === 'alan' || d.tur === 'simulator') { if (an > (T.kSonAS[d.kursiyer] || '')) T.kSonAS[d.kursiyer] = an; }
    else if (!T.kIlkTrafik[d.kursiyer] || an < T.kIlkTrafik[d.kursiyer]) T.kIlkTrafik[d.kursiyer] = an;
  });
  return T;
}

// 2) İhtiyaç: dersSayaci'dan zorunlu eksik, alan/simülatör ve gece eksiği; satın alınmış ek ders hakkı; başarısız aday (md.15) eksiği
export function ihtiyac(k) {
  const ds = dersSayaci(k), G = ds.gerekli, ek = +k.ekDersHakki || 0;
  const zorunlu = Math.max(0, G - ds.zorunlu.yapildi - ds.zorunlu.planli);
  const fazla = Math.max(0, (+k.direksiyon || 0) + ds.planli - G), ekKalan = Math.max(0, ek - fazla);
  const basarisiz = ds.basarisiz.gerek ? Math.max(0, ds.basarisiz.gerek - ds.basarisiz.sonra - ds.basarisiz.planli) : 0;
  const toplam = Math.max(zorunlu + ekKalan, basarisiz);
  const simAlan = Math.min(toplam, Math.max(0, ds.alanSim.gerek - ds.alanSim.yapildi - ds.alanSim.planli));
  const gece = Math.min(toplam, Math.max(0, ds.gece.gerek - ds.gece.yapildi - ds.gece.planli));
  return { toplam, simAlan, gece, trafik: toplam - simAlan, zorunlu, ekKalan, basarisiz, ds };
}
// Son tarih: e-sınav geçişi + 90 gün (md.15/1-b, M11), planlı uygulama sınavından bir gün önce, ikinci hak süresi (md.15/4)
export function sonTarih(k) {
  const l = [];
  const es = (S.sinavlar || []).filter(s => s.tur === 'e-Sınav' && (s.sonuc || {})[k.id] === 'Geçti').sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
  if (es && !(k.dsinav && k.dsinav.sonuc === 'Geçti')) l.push({ t: gunEkle(es.tarih, +kuralAyar('direksiyonSure') || 90), neden: `e-sınavdan sonraki ${+kuralAyar('direksiyonSure') || 90} gün` });
  const ps = k.dsinavPlan || ((S.sinavlar || []).filter(s => s.tur === 'Direksiyon' && (s.kursiyerler || []).includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).map(s => s.tarih).sort()[0]);
  if (ps) l.push({ t: gunEkle(String(ps).slice(0, 10), -1), neden: `${trT(String(ps).slice(0, 10))} uygulama sınavı`, sinav: true });
  if (k.ikinciHak && k.ikinciHak.son) l.push({ t: k.ikinciHak.son, neden: 'ikinci dört hak süresi' });
  return l.sort((a, b) => a.t.localeCompare(b.t))[0] || null;
}

// 3) Uygunluk
const izinli = (h, t) => (S.izinler || []).some(i => i.kim === h.id && t >= i.bas && t <= i.bit);
const belgeBitti = (h, t) => Object.values(h.belgeler || {}).some(x => x && x < t);
const siniftaVerir = (h, sinif) => !(h.siniflar || []).length || (h.siniflar || []).includes(sinif) || (h.siniflar || []).includes(anaSinif(sinif));
const gorevDisi = h => !!(h.pasif || h.ayrildi || (h.meb && h.meb.ayrildi));
// ustanın o gün ders veremez nedeni (boş: verebilir); saat ve yük ayrı denetlenir
export function ustaGunEngeli(h, k, t) {
  if (!h) return 'usta yok';
  if (gorevDisi(h)) return `${h.ad} MEBBİS’te görevde değil`;
  if (!ustaYetkili(h, k.sinif)) return `${h.ad} MEBBİS’te ${k.sinif} sınıfına yetkili değil`;
  if (!siniftaVerir(h, k.sinif)) return `${h.ad} ${k.sinif} sınıfında ders vermiyor`;
  if (izinli(h, t)) return `${h.ad} izinli`;
  if (izinDurumu(h, t).tur === 'bitti') return `${h.ad} çalışma izni ${trT(h.mebIzinBitis || (h.meb || {}).izinBit || '')} tarihinde bitiyor`;
  if (belgeBitti(h, t)) return `${h.ad} belgesinin süresi dolmuş`;
  return '';
}
const aracGecerli = (a, t) => !a.kapali && ![a.muayene, a.sigorta].some(x => x && x < t) && !/muayene\s*tarihi\s*doldu|hizmet\s*d[ıi]ş/i.test(a.mebDurum || '');
export function aracSec(T, h, k, t, s) {
  const bos = a => aracGecerli(a, t) && !T.dolu.has('a|' + t + '|' + s + '|' + a.id);
  const o = ustaAraci(h.id, k.sinif); if (o && bos(o)) return o;
  for (const sn of aracSiniflari(k.sinif)) { const a = (S.araclar || []).filter(a => a.sinif === sn && a !== o && (!a.egitmen || a.egitmen === h.id || !egitmen(a.egitmen))).find(bos); if (a) return a; }
  return (S.araclar || []).filter(a => a !== o && aracUygun(a, k.sinif) && (!a.egitmen || a.egitmen === h.id || !egitmen(a.egitmen))).find(bos) || null;
}
export const simulatorler = () => (S.simulatorler || []).filter(x => x && (x.sicilNo || x.id) && (!x.durum || /hizmette/i.test(x.durum)));
const simSec = (T, t, s) => simulatorler().find(m => !T.dolu.has('m|' + t + '|' + s + '|' + m.id)) || null;

// Saatler: kursun direksiyon ders saatleri (öğle arası hariç); arifede 13:00'ten sonra yok (DIR-051)
function gunSaatleri(t) { return dersSaatleri().filter(s => !(arifeMi(t) && s >= '13:00')); }
// Tercih ("Hafta içi akşam" vb., S.bekleme) uygun saatleri öne alır; zorunlu değil (DIR-036)
function tercihSirala(l, t, tercih) {
  const g = tarihOku(t).getDay(), hi = g >= 1 && g <= 5, x = String(tercih || '').toLocaleLowerCase('tr');
  const puan = s => { const m = saatSay(s); let p = 0;
    if (/sabah/.test(x)) p += m < 12 * 60 ? 2 : 0; if (/öğle/.test(x)) p += m >= 12 * 60 && m < 16 * 60 ? 2 : 0; if (/akşam/.test(x)) p += m >= 17 * 60 ? 2 : 0;
    if (/hafta içi/.test(x)) p += hi ? 1 : -1; if (/cumartesi|hafta sonu/.test(x)) p += g === 6 ? 2 : -1; return p; };
  return x && !/fark etmez/.test(x) ? [...l].sort((a, b) => puan(b) - puan(a) || a.localeCompare(b)) : l;
}

export function planOner({ kursiyerler = null, bas = null, gunSay = 14, hocaSecimi = null, tekUsta = null, dogrula = null } = {}) {
  const A = planAyar(), haftalikK = A.haftalik, kSinir = kuralAyar('gunlukDersSiniri'), uSinir = +(S.kurs.egitmenGunlukSinir || S.kurs.ustaGunlukSinir || 8);
  hocaSecimi = hocaSecimi || (A.dagit ? 'yetkili' : 'kendi'); tekUsta = tekUsta == null ? A.tekUsta : tekUsta;
  bas = bas || gun(+kuralAyar('programOnGun') || 5);
  const son = gunEkle(bas, gunSay - 1), simdi = gun(0), mebSinir = gun(+kuralAyar('programOnGun') || 5);
  const T = takvimKur(S.dersler, pazartesi(bas), gunEkle(son, 7));
  const gunler = []; for (let t = bas; t <= son; t = gunEkle(t, 1)) { const kp = kapaliGun(t); if (kp === 'Pazar' || (kp && kp !== 'Pazar') || (!A.cumartesi && tarihOku(t).getDay() === 6)) continue; gunler.push(t); }
  const uyari = [], oneriler = [], yerlesmeyen = [];
  const etiketler = (d, k) => [d.tur === 'simulator' ? 'Simülatör' : d.tur === 'alan' ? 'Eğitim alanı' : '', geceDersMi(d) ? 'Gece' : '', d.egitimTuru !== 'normal' ? EGITIM_TURU[d.egitimTuru].kisa : '', d.tarih < mebSinir ? 'MEBBİS’e geç kalır' : '', d.egitmen !== k.egitmen ? 'Başka öğretmen' : ''].filter(Boolean);
  const tercih = {}; (S.bekleme || []).forEach(b => { if (b && b.kursiyer && b.tercih) tercih[b.kursiyer] = b.tercih; });
  if (!dersSaatleri().length) uyari.push('Ders saati tanımlı değil: Ayarlar › Kurs bilgileri › Direksiyon ders saatleri.');

  // adaylar ve ihtiyaçları
  const secili = kursiyerler ? new Set(kursiyerler) : null;
  const havuz = (S.kursiyerler || []).filter(k => k && !k.kapali && (secili ? secili.has(k.id) : ['Direksiyon', 'Sınav'].includes(k.asama)) && SINIFLAR[k.sinif] && gerekliDireksiyon(k));
  const sonDers = k => (S.dersler || []).filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').reduce((a, d) => d.tarih > a ? d.tarih : a, '');
  const adaylar = [];
  havuz.forEach(k => {
    const ih = ihtiyac(k); if (!ih.toplam) return;
    const red = kayitDondurmaMi(k) ? 'Kaydı dondurulmuş (MEBBİS “Kayıt Dondurma”); ders planlanmaz.'
      : S.kurs.borcluDers === 'engelle' && gecikenler(k).length ? 'Geciken taksiti var; Ayarlar’da borçluya ders verilmiyor.' : '';
    if (red) return yerlesmeyen.push({ kursiyer: k.id, ad: tamAd(k), eksik: { toplam: ih.toplam, simAlan: ih.simAlan, trafik: ih.trafik, gece: ih.gece }, neden: [red] });
    const st = sonTarih(k), simIzin = !belgeliMi(k), ilkBelge = !belgeliMi(k);
    adaylar.push({ k, ih, kalan: ih.toplam, simAlan: ih.simAlan, gece: geceKisitli(k) ? 0 : ih.gece, geceIstenen: ih.gece, st, simIzin, ilkBelge, son: sonDers(k), neden: {}, yerlesen: 0, tercih: tercih[k.id] || '' });
  });
  const kalanGun = x => x.st ? fark(x.st.t) : 9999;
  adaylar.sort((a, b) => kalanGun(a) - kalanGun(b) || (b.st && b.st.sinav ? 1 : 0) - (a.st && a.st.sinav ? 1 : 0) || b.kalan - a.kalan || a.son.localeCompare(b.son));
  if (!havuz.length) return { oneriler, yerlesmeyen, yuk: {}, uyari, bos: secili ? 'Seçilen kursiyerin direksiyon dersi yok.' : 'Direksiyon aşamasında kursiyer yok.' };
  if (!adaylar.length && !yerlesmeyen.length) return { oneriler, yerlesmeyen, yuk: {}, uyari, bos: 'Dağıtılacak ders yok: kursiyerlerin kalan bütün dersleri zaten planlanmış.' };

  const neden = (x, m) => { x.neden[m] = (x.neden[m] || 0) + 1; };
  const ustalar = x => { const kendi = egitmen(x.k.egitmen); if (hocaSecimi !== 'yetkili') return kendi ? [kendi] : [];
    return [...(kendi ? [kendi] : []), ...(S.egitmenler || []).filter(h => h !== kendi && !h.pasif && siniftaVerir(h, x.k.sinif))]; };
  const ustaSirala = (l, t) => hocaSecimi === 'yetkili' ? [l[0], ...l.slice(1).sort((a, b) => (T.uGun[a.id + '|' + t] || 0) - (T.uGun[b.id + '|' + t] || 0))].filter(Boolean) : l;

  // tek yerleştirme denemesi: tur 'gece' | 'simAlan' | 'trafik'
  function yerlestir(x, t, tur) {
    const k = x.k, hk = pazartesi(t);
    if (x.st && t > x.st.t) return neden(x, 'sonTarih'), false;
    if ((T.kGun[k.id + '|' + t] || 0) >= kSinir) return neden(x, 'gunluk'), false;
    if ((T.kHafta[k.id + '|' + hk] || 0) >= haftalikK) return neden(x, 'haftalik'), false;
    let saatler = tercihSirala(gunSaatleri(t), t, x.tercih);
    const geceMi = s => geceDersMi({ tarih: t, saat: s });
    if (tur === 'gece') { saatler = saatler.filter(s => geceMi(s) && s <= GECE_SON); if (!saatler.length) return neden(x, 'geceSaat'), false; }
    else if (geceKisitli(k)) saatler = saatler.filter(s => !geceMi(s));
    else if (x.gece > 0 && tur === 'trafik') saatler = [...saatler.filter(geceMi), ...saatler.filter(s => !geceMi(s))];   // gece eksiği kaldıysa gece saatleri öne
    if (tur !== 'simAlan' && x.ilkBelge) { const sa = T.kSonAS[k.id] || ''; if (x.simAlan > 0) return neden(x, 'simOnce'), false; saatler = saatler.filter(s => (t + ' ' + s) > sa); }
    if (tur === 'simAlan') { const it = T.kIlkTrafik[k.id] || ''; if (it && x.ilkBelge) saatler = saatler.filter(s => (t + ' ' + s) < it); }
    const atanmis = tekUsta ? T.kUsta[k.id + '|' + t] : null;
    let hl = ustaSirala(ustalar(x), t); if (atanmis) hl = hl.filter(h => h.id === atanmis);
    if (!hl.length) return neden(x, atanmis ? 'tekUsta' : 'ustaYok'), false;
    for (const h of hl) {
      const eng = ustaGunEngeli(h, k, t); if (eng) { neden(x, 'u:' + eng); continue; }
      if ((T.uGun[h.id + '|' + t] || 0) >= uSinir) { neden(x, 'ugun:' + h.id); continue; }
      const hs = haftalikSinir(h); if ((T.uHafta[h.id + '|' + hk] || 0) >= hs.n) { neden(x, 'uhafta:' + h.id); continue; }
      for (const s of saatler) {
        if (T.dolu.has('u|' + t + '|' + s + '|' + h.id) || T.dolu.has('k|' + t + '|' + s + '|' + k.id)) { neden(x, 'saat'); continue; }
        let ar = null, sim = null, dtur = 'trafik';
        if (tur === 'simAlan') {
          if (x.simIzin && simulatorler().length) { sim = simSec(T, t, s); if (!sim) { neden(x, 'simDolu'); continue; } dtur = 'simulator'; }
          else { dtur = 'alan'; if (!B_ENGELLI_KENDI(k)) { ar = aracSec(T, h, k, t, s); if (!ar) { neden(x, 'arac'); continue; } } }
        } else if (!B_ENGELLI_KENDI(k)) { ar = aracSec(T, h, k, t, s); if (!ar) { neden(x, 'arac'); continue; } }
        const d = { kursiyer: k.id, egitmen: h.id, arac: ar ? ar.id : null, tarih: t, saat: s, tur: dtur, ...(sim ? { simulator: sim.id } : {}), ...(B_ENGELLI_KENDI(k) ? { kendiArac: true } : {}) };
        // 5) son doğrulama: kural motoru (ders ekleme penceresiyle aynı denetim); sorun varsa bu saat atlanır
        if (dogrula) { let r = null; try { r = dogrula({ k, eg: h, ar, tur: dtur, tarih: t, saat: s, simulator: sim ? sim.id : undefined, taslak: oneriler }); } catch (e) { r = null; }
          if (r && r.sorun && r.sorun.length) { neden(x, 'k:' + r.sorun[0]); continue; } }
        d.egitimTuru = 'normal'; d.etiket = [];   // tür ve etiketler yerleştirme bitince tarih sırasıyla yazılır
        T.ekle({ ...d }); oneriler.push(d);
        x.kalan--; x.yerlesen++; if (tur === 'simAlan') x.simAlan--; if (geceMi(s) && x.gece > 0) x.gece--;
        return true;
      }
    }
    return false;
  }

  // 4) Yerleştirme: en kıt kaynaktan
  // 4a) gece dersleri (gece kısıtlı adaya hiç önerilmez)
  adaylar.filter(x => x.gece > 0).forEach(x => { for (const t of gunler) { if (x.gece <= 0 || x.kalan <= 0) break; if (x.simAlan > 0 && x.ilkBelge) break; yerlestir(x, t, 'gece'); } });
  // 4b) simülatör / eğitim alanı: aralığın ilk günlerinden
  adaylar.filter(x => x.simAlan > 0).forEach(x => { for (const t of gunler) { if (x.simAlan <= 0 || x.kalan <= 0) break; while (x.simAlan > 0 && yerlestir(x, t, 'simAlan')); } });
  // gece ihtiyacı alan/simülatör bekliyorduysa şimdi
  adaylar.filter(x => x.gece > 0 && x.simAlan <= 0).forEach(x => { for (const t of gunler) { if (x.gece <= 0 || x.kalan <= 0) break; yerlestir(x, t, 'gece'); } });
  // 4c) akan trafik: gün gün, turlarla (turda adaya en çok bir ders)
  for (const t of gunler) for (let tur = 0; tur < kSinir; tur++) adaylar.forEach(x => { if (x.kalan > 0 && x.simAlan <= 0) yerlestir(x, t, 'trafik'); });

  // eğitim türü tarih sırasıyla: ilk 'zorunlu' kadar öneri normal; sonrası sınava girmemiş ve hazır yazısı olmayan için telafi (md.7/7);
  // ikinci dört hak ve başarısız aday tarihten çıkar (egitimTuruOf). Etiketler türe göre yenilenir.
  adaylar.forEach(x => { const l = oneriler.filter(d => d.kursiyer === x.k.id).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)), k = x.k;
    l.forEach((d, i) => { let et = egitimTuruOf(k, { ...d, id: '_oneri', egitimTuru: undefined }); if (et === 'normal' || et === 'onSinav') et = i < x.ih.zorunlu || (k.dsinav && k.dsinav.tarih) || hazirYazisiVar(k) ? 'normal' : 'onSinav';
      d.egitimTuru = et; d.etiket = etiketler(d, k); }); });
  // yerleşmeyenler ve nedenleri (insan diliyle)
  const yuk = {};
  adaylar.forEach(x => {
    if (x.kalan <= 0 && !(x.geceIstenen > 0 && x.gece > 0)) return;
    const n = x.neden, l = [], ad = tamAd(x.k), kendi = egitmen(x.k.egitmen);
    if (x.geceIstenen > 0 && geceKisitli(x.k)) l.push(`Sağlık raporunda gece kısıtı var; ${x.geceIstenen} gece dersi önerilmedi (md.7/3).`);
    else if (x.gece > 0 && n.geceSaat) { const gb = geceBaslangic(gunler[0] || bas), bit = dersSaatleri().slice(-1)[0] || '—'; l.push(`${x.gece} gece dersi yerleşmedi: gece dersi başlangıcı ${gb}, kursun son ders saati ${bit}. Ayarlar › Kurs bilgileri › Direksiyon ders saatleri’nde son ders saatini en geç ${GECE_SON} yapın.`); }
    if (x.simAlan > 0 && x.simIzin && !simulatorler().length && n.arac) l.push('Simülatör tanımlı değil ve eğitim alanı için boş araç yok. Ekip ve araçlar › Simülatör ekleyin ya da MEBBİS’ten güncelleyin.');
    else if (x.simAlan > 0) l.push(`${x.simAlan} alan/simülatör dersi yerleşmedi; akan trafik dersleri bunlardan sonra başlar (md.7/1).`);
    const u = Object.keys(n).filter(a => a.startsWith('u:')).map(a => a.slice(2)); if (u.length && x.yerlesen === 0) l.push(u[0] + '.');
    const uh = Object.keys(n).filter(a => a.startsWith('uhafta:')).map(a => egitmen(a.slice(7))).filter(Boolean);
    uh.forEach(h => { const hs = haftalikSinir(h); l.push(`${h.ad} bu hafta ${hs.n}/${hs.n} saat (${hs.kaynak}).`); });
    const ug = Object.keys(n).filter(a => a.startsWith('ugun:')).map(a => egitmen(a.slice(5))).filter(Boolean);
    if (ug.length && !uh.length) l.push(`${ug.map(h => h.ad).join(', ')} günlük ${uSinir} ders sınırında.`);
    const kr = Object.keys(n).filter(a => a.startsWith('k:')).map(a => a.slice(2)); if (kr.length) l.push(kr[0]);
    if (n.ustaYok) l.push('Öğrenciye öğretmen atanmamış (öğrenci dosyası › Öğretmen) ya da “Başka yetkili öğretmenlere de dağıt” kapalı.');
    if (n.arac && !l.some(m => /araç/.test(m))) l.push('Uygun saatlerde boş ya da muayenesi geçerli araç yok.');
    if (x.st && n.sonTarih) l.push(`${x.st.neden} için son gün ${trT(x.st.t)}; ${x.kalan} ders bu tarihe sığmıyor.`);
    if (n.haftalik) l.push(`Kursiyer başına haftada en çok ${haftalikK} ders (Ayarlar › Kurs bilgileri › Otomatik plan).`);
    if (!l.length) l.push(n.saat ? 'Bu aralıkta öğretmenin boş saati kalmadı.' : 'Bu aralıkta uygun gün bulunamadı.');
    yerlesmeyen.push({ kursiyer: x.k.id, eksik: { toplam: x.kalan, simAlan: Math.max(0, x.simAlan), trafik: Math.max(0, x.kalan - Math.max(0, x.simAlan)), gece: Math.max(0, x.gece) }, neden: [...new Set(l)], ad });
  });
  // usta yükü (aralıktaki haftalar; mevcut + önerilen)
  (S.egitmenler || []).filter(h => !h.pasif).forEach(h => { const hs = haftalikSinir(h), y = { ad: h.ad, gun: {}, hafta: {}, sinir: hs.n, kaynak: hs.kaynak, gunSinir: uSinir };
    gunler.forEach(t => { y.gun[t] = T.uGun[h.id + '|' + t] || 0; const hk = pazartesi(t); y.hafta[hk] = T.uHafta[h.id + '|' + hk] || 0; }); yuk[h.id] = y; });
  return { oneriler, yerlesmeyen, yuk, uyari, bos: null, bas, son, gunler };
}
