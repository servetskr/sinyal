// KAY-086: mükerrer öğrenci kaydını birleştirme — DOM'suz çekirdek (Node'da denenir: sinyal-kaynak/arac/birlestir-test).
// Kural (belgeler/revizyon/hazir-metinler/mukerrer-birlestirme-kurali.md + 18 Kas kararları):
//  · Mükerrer: aynı T.C. ile iki açık kayıt (kesin) ya da T.C.'si boş/geçersiz olan kayıtta ad + soyad + doğum tarihi aynı ve telefon ya da
//    baba adı aynı (olası). Yalnız adı aynı, T.C.'leri farklı ve geçerli kayıtlar mükerrer değildir. Kapalı/mezun kayıt birleştirilmez.
//  · Ana kaydın planı kalır. Öbür kaydın ödenmiş tutarları (peşinat, ödenmiş ve kısmi taksitler, ödenmiş ek kalemler) ana kayda geçer;
//    ödenmemiş taksitleri de taşınır ama ÇİFT SAYILMAZ: ana kaydın ödenmemiş taksitleri ile taşınanların toplamı, kurs ücretinden
//    ödenen her şey düşülünce kalan tutara indirilir (fazlası iptal, en geç vadeli taşınan taksitten başlayarak). Böylece
//    ödenen + kalan = kurs ücreti (+ ek kalemler) tutar; makbuz/fatura no, tutar ve tarih değişmez.
//  · Her bağ (ders, tahsilat, sınav, evrak, imza, mesaj…) ana kayda geçer; kimin neyi değiştirdiği izde tutulur.
//  · 30 gün içinde geri alınabilir: iki kaydın tam kopyası ve taşınan her bağ S.birlestirmeler'de saklanır; 30 gün sonra iz silinir.
//  · Engel: sınıflar farklı, iki kayıt da MEBBİS'e işlenmiş (iki ayrı MEBBİS kaydı), biri kapalı, T.C.'ler farklı ve geçerli.
export const GERI_ALMA_GUN = 30;
const KIMLIK = [['tc', 'T.C. kimlik no'], ['ad', 'Ad'], ['soyad', 'Soyad'], ['dogumTarihi', 'Doğum tarihi'], ['babaAdi', 'Baba adı'], ['anaAdi', 'Anne adı'], ['tel', 'Cep telefonu'], ['eposta', 'E-posta'], ['adres', 'Adres']];
export const ALANLAR = KIMLIK;
const kopya = x => x == null ? x : JSON.parse(JSON.stringify(x));
const sade = x => String(x || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
const telSade = x => String(x || '').replace(/\D/g, '').slice(-10);
export const tcGecerliMi = t => { t = String(t || ''); if (!/^[1-9]\d{10}$/.test(t)) return false; const d = [...t].map(Number);
  const o = (d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7]); return ((o % 10) + 10) % 10 === d[9] && d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10]; };
export const acikMi = k => !!k && !k.kapali && k.asama !== 'Ehliyet' && !k.birlesti;
const yuvarla = x => Math.round((+x || 0) * 100) / 100;

/* ---------- para ---------- */
// Kurs ücretine sayılan ödenmiş tutar (peşinat + ödenmiş ve kısmi taksitler); iptal taksit sayılmaz. veri.js odenen() ile aynı mantık (ek kalemler ayrı).
export const kursOdenen = o => yuvarla((+o.pesin || 0) + (o.taksitler || []).filter(t => !t.iptal).reduce((a, t) => a + (t.odendi ? +t.tutar || 0 : +t.kismi || 0), 0));
export const taksitKalan = t => t.iptal || t.odendi ? 0 : Math.max(0, yuvarla((+t.tutar || 0) - (+t.kismi || 0)));
export const planKalan = o => yuvarla((o.taksitler || []).reduce((a, t) => a + taksitKalan(t), 0));
const ekler = o => (o.ekler || []).filter(x => !x.kursOdedi);
export const ekOdenen = o => yuvarla(ekler(o).filter(x => x.odendi).reduce((a, x) => a + (+x.tutar || 0), 0));
export const ekToplami = o => yuvarla(ekler(o).reduce((a, x) => a + (+x.tutar || 0), 0));
// veri.js odenen() ve kalanBorc() ile aynı
export const odenenToplam = o => yuvarla(kursOdenen(o) + ekOdenen(o) - (+o.iade || 0));
export const kalanBorcu = o => Math.max(0, yuvarla((+o.toplam || 0) + ekToplami(o) - odenenToplam(o)));

// Ödeme planlarını birleştirir: { odeme (ana kaydın yeni planı), ofset (öbür kaydın taksit indeksi + ofset), rapor }.
// Ana kaydın taksitleri yerinde kalır (kasa hareketlerindeki dağılım indeksleri bozulmasın); öbür kaydın taksitleri sona eklenir.
export function odemeBirlestir(oa, ob, bugun) {
  const A = kopya(oa) || { toplam: 0, pesin: 0, taksitler: [] }, B = kopya(ob) || { toplam: 0, pesin: 0, taksitler: [] };
  A.taksitler = A.taksitler || []; B.taksitler = B.taksitler || [];
  const once = { a: { odenen: odenenToplam(A), kalan: kalanBorcu(A) }, b: { odenen: odenenToplam(B), kalan: kalanBorcu(B) } };
  const ofset = A.taksitler.length, kaynak = 'Birleştirmeyle taşındı';
  const tasinanOdenmis = B.taksitler.filter(t => !t.iptal && (t.odendi || t.kismi)).length + (+B.pesin > 0 ? 1 : 0);
  A.pesin = yuvarla((+A.pesin || 0) + (+B.pesin || 0));
  B.taksitler.forEach(t => A.taksitler.push({ ...t, tasindi: kaynak }));
  if (+B.iade) A.iade = yuvarla((+A.iade || 0) + +B.iade);
  // ek kalemler: ödenmiş olanlar taşınır; ödenmemiş olan, ana kayıtta aynı ad ve tutarda ödenmemiş kalem varsa çift sayılmasın diye taşınmaz
  const ciftEk = [];
  (B.ekler || []).forEach(x => {
    const ayni = !x.odendi && (A.ekler || []).some(y => !y.odendi && sade(y.ad) === sade(x.ad) && +y.tutar === +x.tutar);
    if (ayni) ciftEk.push(x); else (A.ekler = A.ekler || []).push({ ...x, tasindi: kaynak });
  });
  // ödenmemiş taksitler: kalan = kurs ücreti − kursa ödenen; fazlası iptal (önce taşınan, en geç vadeli)
  const F = +A.toplam || 0, hedef = Math.max(0, yuvarla(F - kursOdenen(A)));
  let fazla = yuvarla(planKalan(A) - hedef);
  const acik = A.taksitler.map((t, i) => ({ t, i })).filter(x => taksitKalan(x.t) > 0)
    .sort((x, y) => ((y.i >= ofset) - (x.i >= ofset)) || String(y.t.vade || '').localeCompare(String(x.t.vade || '')) || y.i - x.i);
  const iptalEdilen = [], azaltilan = [];
  for (const { t, i } of acik) {
    if (fazla <= 0) break;
    const kal = taksitKalan(t), kes = Math.min(kal, fazla);
    if (kes >= kal && !(+t.kismi > 0)) { t.iptal = bugun; t.birlestirme = 'Çift borç: birleştirmede sayılmadı'; iptalEdilen.push({ i, tutar: +t.tutar, vade: t.vade }); }
    else { t.tutar = yuvarla(+t.tutar - kes); t.birlestirme = 'Çift borç: ' + kes + ' TL düşüldü'; if (+t.kismi >= +t.tutar) { t.odendi = t.odendi || bugun; delete t.kismi; } azaltilan.push({ i, kes, vade: t.vade }); }
    fazla = yuvarla(fazla - kes);
  }
  // plan kursa ödenenden sonra kalanı karşılamıyorsa (bozuk plan) fark taksiti eklenir
  let farkTaksit = 0;
  if (fazla < 0) { farkTaksit = -fazla; const son = A.taksitler.map(t => t.vade).filter(Boolean).sort().pop(); A.taksitler.push({ vade: son && son > bugun ? son : bugun, tutar: farkTaksit, odendi: null, yontem: null, aciklama: 'Birleştirme farkı' }); }
  const fazlaTahsilat = Math.max(0, yuvarla(kursOdenen(A) - F));
  const sonra = { odenen: odenenToplam(A), kalan: kalanBorcu(A) };
  const tasinanOdenmemis = B.taksitler.filter(t => taksitKalan(t) > 0).length;
  return { odeme: A, ofset, rapor: { once, sonra, tasinanOdenmis, tasinanOdenmemis, iptalEdilen, azaltilan, ciftEk, farkTaksit, fazlaTahsilat, ucretFarki: (+B.toplam || 0) !== F ? +B.toplam || 0 : null } };
}

/* ---------- mükerrer bulma ---------- */
export function mukerrerCiftler(kursiyerler) {
  const l = (kursiyerler || []).filter(acikMi), cift = [], gor = new Set();
  const ekle = (a, b, tur, neden) => { const id = [a.id, b.id].sort().join('|'); if (gor.has(id)) return; gor.add(id); cift.push({ a, b, tur, neden }); };
  const tcli = new Map();
  l.forEach(k => { const t = String(k.tc || '').trim(); if (tcGecerliMi(t)) { if (tcli.has(t)) tcli.get(t).forEach(x => ekle(x, k, 'kesin', 'Aynı T.C. ile iki açık kayıt')); (tcli.get(t) || tcli.set(t, []).get(t)).push(k); } });
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const a = l[i], b = l[j], ta = tcGecerliMi(a.tc), tb = tcGecerliMi(b.tc);
    if (ta && tb) continue;   // ikisi de geçerli: yukarıda (aynıysa) ya da iki ayrı kişi
    if (!a.ad || sade(a.ad) !== sade(b.ad) || sade(a.soyad) !== sade(b.soyad) || !a.dogumTarihi || a.dogumTarihi !== b.dogumTarihi) continue;
    const tel = telSade(a.tel) && telSade(a.tel) === telSade(b.tel), baba = a.babaAdi && sade(a.babaAdi) === sade(b.babaAdi);
    if (tel || baba) ekle(a, b, 'olasi', `T.C. ${ta || tb ? 'birinde' : 'ikisinde de'} yok ya da hatalı; ad, soyad, doğum tarihi ve ${tel ? 'telefon' : 'baba adı'} aynı`);
  }
  return cift;
}
export function birlestirmeEngeli(a, b) {
  if (!a || !b || a.id === b.id) return 'Kayıt bulunamadı';
  if (!acikMi(a) || !acikMi(b)) return 'Kapalı ya da mezun kayıt birleştirilmez; bu “T.C.’ye göre geçmiş”tir, iki kayıt ayrı kalır.';
  if (tcGecerliMi(a.tc) && tcGecerliMi(b.tc) && a.tc !== b.tc) return 'T.C. kimlik numaraları farklı: iki ayrı kişi, birleştirilmez.';
  if (a.sinif !== b.sinif) return `Sınıflar farklı (${a.sinif} / ${b.sinif}). MEBBİS’e giden bilgi değişeceği için birleştirilmez; önce yanlış kaydın sınıfını düzeltin.`;
  if (a.mebIslendi && b.mebIslendi) return 'İki kayıt da MEBBİS’e işlenmiş: MEBBİS’te iki ayrı dönem kaydı var. Önce MEBBİS’te düzeltin; mdSinyal MEBBİS’te birleştirme ya da silme yapmaz.';
  return null;
}
// Ana kayıt: 1) MEBBİS'e işlenmiş, 2) daha çok ödeme + ders, 3) daha eski kayıt tarihi
export function anaKayit(a, b, S) {
  const meb = k => k.mebIslendi || k.mebNo ? 1 : 0;
  const is = k => ((k.odeme || {}).taksitler || []).filter(t => t.odendi).length + (+(k.odeme || {}).pesin > 0 ? 1 : 0) + ((S && S.dersler) || []).filter(d => d.kursiyer === k.id).length;
  const s = (meb(b) - meb(a)) || (is(b) - is(a)) || String(a.kayit || '9').localeCompare(String(b.kayit || '9'));
  return s > 0 ? [b, a] : [a, b];
}

/* ---------- bağlar: kurs verisinde öbür kaydı gösteren her yer ---------- */
// S'nin her koleksiyonu taranır (kursiyerler hariç; o listede yalnız başka öğrencilerin alanları). Eşleşen: değeri öbür kaydın
// kimliği olan metin alanı ('id' hariç), içinde bu kimlik geçen metin dizisi, anahtarı bu kimlik olan nesne. Derinlik 3.
const ATLA = new Set(['birlestirmeler', 'kurs', 'guvenlik', 'kullanicilar']);
function tara(S, eskiId, ziyaret) {
  for (const kol of Object.keys(S)) {
    if (ATLA.has(kol)) continue;
    const v = S[kol];
    if (Array.isArray(v)) v.forEach((x, i) => { if (x && typeof x === 'object' && !(kol === 'kursiyerler' && x.id === eskiId)) gez(x, [kol, x.id != null ? { id: x.id } : i], 1); });
    else if (v && typeof v === 'object') Object.keys(v).forEach(k => { if (k === eskiId) ziyaret({ yol: [kol], tur: 'anahtar' }); else if (v[k] && typeof v[k] === 'object') gez(v[k], [kol, k], 1); });
  }
  function gez(o, yol, d) {
    if (Array.isArray(o)) { if (o.includes(eskiId)) ziyaret({ yol, tur: 'dizi' }); if (d < 3) o.forEach((x, i) => { if (x && typeof x === 'object') gez(x, [...yol, i], d + 1); }); return; }
    for (const k of Object.keys(o)) {
      const x = o[k];
      if (typeof x === 'string') { if (x === eskiId && k !== 'id') ziyaret({ yol: [...yol, k], tur: 'deger' }); }
      else if (x && typeof x === 'object' && d < 3) {
        if (!Array.isArray(x) && Object.prototype.hasOwnProperty.call(x, eskiId)) ziyaret({ yol: [...yol, k], tur: 'anahtar' });
        gez(x, [...yol, k], d + 1);
      }
    }
  }
}
// yol: ['dersler', {id:'d1'}, 'kursiyer'] ya da indeksli; kimlikle bulunamazsa null
function bul(S, yol) {
  let o = S;
  for (const p of yol) { if (o == null) return null; if (p && typeof p === 'object') o = Array.isArray(o) ? o.find(x => x && x.id === p.id) : null; else o = o[p]; }
  return o;
}
const ust = (S, yol) => ({ ebeveyn: bul(S, yol.slice(0, -1)), alan: yol[yol.length - 1] });
export function baglar(S, eskiId) { const l = []; tara(S, eskiId, x => l.push(x)); return l; }
export function bagOzeti(S, eskiId) {
  const say = {}; baglar(S, eskiId).forEach(b => { const k = b.yol[0]; say[k] = (say[k] || 0) + 1; }); return say;
}

/* ---------- birleştir ve geri al ---------- */
// secim: { [alan]: 'a' | 'b' } kimlik alanlarında hangi kaydın değeri kalacak (varsayılan ana kayıt; ana kayıtta boşsa öbürü)
export function birlestir(S, anaId, otekiId, { secim = {}, kim = '', zaman = new Date().toISOString(), bugun = zaman.slice(0, 10) } = {}) {
  const A = (S.kursiyerler || []).find(x => x.id === anaId), B = (S.kursiyerler || []).find(x => x.id === otekiId);
  const engel = birlestirmeEngeli(A, B); if (engel) throw new Error(engel);
  const iz = { id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), zaman, kim, ana: A.id, eski: B.id, anaAd: [A.ad, A.soyad].join(' '), eskiNo: B.no || '', onceA: kopya(A), onceB: kopya(B), baglar: [], secilen: [] };
  // 1) kimlik ve iletişim
  for (const [al, ad] of KIMLIK) {
    const va = A[al], vb = B[al], bDolu = vb != null && String(vb).trim() !== '', b = bDolu && (secim[al] === 'b' || (secim[al] !== 'a' && (va == null || String(va).trim() === '')));
    if (b && vb !== va) { A[al] = vb; iz.secilen.push(ad + ': öbür kayıttaki'); }
  }
  if (telSade(B.tel) && telSade(B.tel) !== telSade(A.tel)) { A.iletisimEk = { ...(A.iletisimEk || {}) }; if (!A.iletisimEk.tel2) { A.iletisimEk.tel2 = B.tel; iz.secilen.push('Öbür kaydın telefonu “Cep telefonu 2” oldu'); } }
  // 2) ödeme planı
  const od = odemeBirlestir(A.odeme, B.odeme, bugun); A.odeme = od.odeme; iz.para = od.rapor;
  // 3) öğrenme ve evrak: sayaçlar, notlar, evrak işaretleri; ana kayıtta boş olan alan öbüründen dolar
  A.direksiyon = (+A.direksiyon || 0) + (+B.direksiyon || 0);
  A.teorik = Math.max(+A.teorik || 0, +B.teorik || 0);
  A.notlar = [...(A.notlar || []), ...(B.notlar || [])];
  if (Array.isArray(B.deneme)) A.deneme = [...(A.deneme || []), ...B.deneme];
  if (B.evrak && typeof B.evrak === 'object') { A.evrak = { ...(A.evrak || {}) }; for (const [k, v] of Object.entries(B.evrak)) if (v && !A.evrak[k]) A.evrak[k] = v; }
  const doldurulan = [];
  for (const [k, v] of Object.entries(B)) {
    if (['id', 'no', 'odeme', 'notlar', 'deneme', 'evrak', 'direksiyon', 'teorik', 'kayit', 'birlesti', 'birlestirme', 'iletisimEk', 'hesap', 'hesapAktif', 'uid'].includes(k) || KIMLIK.some(x => x[0] === k)) continue;
    const a = A[k]; if ((a == null || a === '' || a === false || (Array.isArray(a) && !a.length)) && v != null && v !== '' && v !== false && !(Array.isArray(v) && !v.length)) { A[k] = kopya(v); doldurulan.push(k); }
  }
  iz.doldurulan = doldurulan;
  // 4) bağlar: her yer ana kayda geçer; kasa hareketinin taksit dağılımı yeni indekse kayar
  for (const b of baglar(S, B.id)) {
    const { ebeveyn, alan } = ust(S, b.yol); if (ebeveyn == null) continue;
    if (b.tur === 'deger') { ebeveyn[alan] = A.id; iz.baglar.push(b); if (b.yol[0] === 'hareket' && alan === 'kursiyer' && Array.isArray(ebeveyn.dagilim)) { b.dagilim = kopya(ebeveyn.dagilim); ebeveyn.dagilim.forEach(x => { x.i = +x.i + od.ofset; }); } }
    else if (b.tur === 'dizi') { const dz = ebeveyn[alan]; b.eski = dz.slice(); const yeni = dz.map(x => x === B.id ? A.id : x); ebeveyn[alan] = yeni.filter((x, i) => x !== A.id || yeni.indexOf(A.id) === i); b.sonra = ebeveyn[alan].slice(); iz.baglar.push(b); }
    else if (b.tur === 'anahtar') { const nes = alan == null ? ebeveyn : (b.yol.length === 1 ? S[b.yol[0]] : ebeveyn[alan]); if (!nes) continue; b.deger = kopya(nes[B.id]); if (!(A.id in nes)) nes[A.id] = nes[B.id]; else b.cakisma = true; delete nes[B.id]; iz.baglar.push(b); }
  }
  // 5) öbür kayıt listeden çıkar (kopyası izde); ana kayıt işaretlenir
  S.kursiyerler = S.kursiyerler.filter(x => x !== B);
  A.birlestirme = { iz: iz.id, zaman, eskiNo: B.no || '' };
  iz.sonraA = JSON.stringify(A);
  (S.birlestirmeler = S.birlestirmeler || []).unshift(iz);
  return { iz, rapor: { para: od.rapor, bag: iz.baglar.length, ozet: ozetSay(iz.baglar), secilen: iz.secilen, doldurulan } };
}
const ozetSay = l => { const s = {}; l.forEach(b => { s[b.yol[0]] = (s[b.yol[0]] || 0) + 1; }); return s; };
export const izGecerli = (iz, simdi = new Date()) => !!iz && !iz.geriAlindi && (simdi - new Date(iz.zaman)) / 864e5 <= GERI_ALMA_GUN;
export const izKalanGun = (iz, simdi = new Date()) => Math.max(0, Math.ceil(GERI_ALMA_GUN - (simdi - new Date(iz.zaman)) / 864e5));
// birleştirmeden sonra ana kayıt değişti mi (geri almada bu değişiklikler kaybolur)
export const sonradanDegisti = (S, iz) => { const A = (S.kursiyerler || []).find(x => x.id === iz.ana); return !!A && JSON.stringify(A) !== iz.sonraA; };
export function geriAl(S, izId, { simdi = new Date() } = {}) {
  const iz = (S.birlestirmeler || []).find(x => x.id === izId);
  if (!iz) throw new Error('Birleştirme izi bulunamadı (30 gün geçmiş olabilir)');
  if (!izGecerli(iz, simdi)) throw new Error(iz.geriAlindi ? 'Bu birleştirme zaten geri alındı' : GERI_ALMA_GUN + ' gün geçti; genel yedekten dönülebilir');
  if ((S.kursiyerler || []).some(x => x.id === iz.eski)) throw new Error('Öbür kayıt zaten listede');
  // bağlar ters sırayla eski hâline (yalnız hâlâ ana kaydı gösterenler)
  for (const b of iz.baglar.slice().reverse()) {
    const { ebeveyn, alan } = ust(S, b.yol); if (ebeveyn == null) continue;
    if (b.tur === 'deger') { if (ebeveyn[alan] === iz.ana) { ebeveyn[alan] = iz.eski; if (b.dagilim && Array.isArray(ebeveyn.dagilim)) ebeveyn.dagilim = kopya(b.dagilim); } }
    else if (b.tur === 'dizi') { const dz = ebeveyn[alan] || []; if (b.sonra && JSON.stringify(dz) === JSON.stringify(b.sonra)) { ebeveyn[alan] = b.eski.slice(); continue; } const anaVardi = (b.eski || []).includes(iz.ana); ebeveyn[alan] = anaVardi ? [...dz.filter(x => x !== iz.eski), iz.eski] : dz.map(x => x === iz.ana ? iz.eski : x); }
    else if (b.tur === 'anahtar') { const nes = b.yol.length === 1 ? S[b.yol[0]] : ebeveyn[alan]; if (!nes) continue; nes[iz.eski] = kopya(b.deger); if (!b.cakisma && JSON.stringify(nes[iz.ana]) === JSON.stringify(b.deger)) delete nes[iz.ana]; }
  }
  const i = S.kursiyerler.findIndex(x => x.id === iz.ana);
  const A = kopya(iz.onceA), B = kopya(iz.onceB);
  if (i >= 0) S.kursiyerler[i] = A; else S.kursiyerler.push(A);
  S.kursiyerler.push(B);
  iz.geriAlindi = simdi.toISOString();
  return { ana: A, eski: B };
}
// 30 günü geçen izler silinir (genel yedek yine durur)
export function izTemizle(S, simdi = new Date()) { if (!Array.isArray(S.birlestirmeler)) return 0; const n = S.birlestirmeler.length; S.birlestirmeler = S.birlestirmeler.filter(x => (simdi - new Date(x.zaman)) / 864e5 <= GERI_ALMA_GUN && !x.geriAlindi || (x.geriAlindi && (simdi - new Date(x.geriAlindi)) / 864e5 <= 1)); return n - S.birlestirmeler.length; }
