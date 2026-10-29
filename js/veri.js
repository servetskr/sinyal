// Sinyal demo verisi: tarihler bugüne göre üretilir, tarayıcıda saklanır.
const ANAHTAR = 'sinyal-demo-v19';
// Usta öğreticinin ders sonunda puanladığı beceriler
export const BECERI = [['kalkis', 'Kalkış ve duruş'], ['serit', 'Şerit ve ayna'], ['kavsak', 'Kavşak ve öncelik'], ['park', 'Park'], ['rampa', 'Rampa ve yokuş']];
try { for (let i = 1; i < 19; i++) localStorage.removeItem('sinyal-demo-v' + i); } catch (x) { }

export const BUGUN = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
export const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const gun = n => { const d = new Date(BUGUN); d.setDate(d.getDate() + n); return iso(d); };
export const tarihOku = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fark = s => Math.round((tarihOku(s) - BUGUN) / 864e5);
// Kurs kapalı günleri: Pazar, sabit resmî tatiller ve dini bayramlar (kurs Ayarlar'dan ek kapalı gün girer).
export const TATILLER = ['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29'];
const BAYRAMLAR = ['2026-03-20', '2026-03-21', '2026-03-22', '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30'];
export const kapaliGun = t => tarihOku(t).getDay() === 0 ? 'Pazar' : (TATILLER.includes(t.slice(5)) || BAYRAMLAR.includes(t)) ? 'Resmî tatil' : null;
export const isGunuIleri = t => { const d = tarihOku(t); while (kapaliGun(iso(d))) d.setDate(d.getDate() + 1); return iso(d); };

// Sınıflar: varsayılanlar; kurs Ayarlar › Sınıf ve ücretler'den ücret, saat, yaş ve hangi sınıfları verdiğini değiştirir (S.kurs.siniflar'da kalıcı).
// teyit: ders saatleri ve yaş yönetmelikten varsayılan; kurs kendi il MEM uygulamasıyla teyit etmeli.
export const SINIF_VARSAYILAN = {
  'A1': { ad: 'A1 · Hafif motosiklet', ucret: null, teorik: 34, direksiyon: 14, yas: 16, tur: 'ehliyet', aktif: false, teyit: true },
  'A2': { ad: 'A2 · Motosiklet', ucret: 18500, teorik: 34, direksiyon: 14, yas: 18, tur: 'ehliyet', aktif: true },
  'A': { ad: 'A · Motosiklet (sınırsız)', ucret: null, teorik: 34, direksiyon: 14, yas: 20, tur: 'ehliyet', aktif: false, teyit: true },
  'B1': { ad: 'B1 · Dört tekerlekli motosiklet', ucret: null, teorik: 34, direksiyon: 14, yas: 16, tur: 'ehliyet', aktif: false, teyit: true },
  'B': { ad: 'B · Manuel', ucret: 24000, teorik: 34, direksiyon: 14, yas: 18, tur: 'ehliyet', aktif: true },
  'B-O': { ad: 'B · Otomatik', ucret: 26500, teorik: 34, direksiyon: 14, yas: 18, tur: 'ehliyet', aktif: true },
  'BE': { ad: 'BE · Römorklu otomobil', ucret: null, teorik: 34, direksiyon: 14, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'C1': { ad: 'C1 · Hafif kamyon', ucret: null, teorik: 34, direksiyon: 16, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'C1E': { ad: 'C1E · Römorklu hafif kamyon', ucret: null, teorik: 34, direksiyon: 16, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'C': { ad: 'C · Kamyon', ucret: 31000, teorik: 34, direksiyon: 20, yas: 21, tur: 'ehliyet', aktif: true },
  'CE': { ad: 'CE · Çekici (tır)', ucret: null, teorik: 34, direksiyon: 20, yas: 21, tur: 'ehliyet', aktif: false, teyit: true },
  'D1': { ad: 'D1 · Minibüs', ucret: null, teorik: 34, direksiyon: 20, yas: 21, tur: 'ehliyet', aktif: false, teyit: true },
  'D1E': { ad: 'D1E · Römorklu minibüs', ucret: null, teorik: 34, direksiyon: 20, yas: 21, tur: 'ehliyet', aktif: false, teyit: true },
  'D': { ad: 'D · Otobüs', ucret: null, teorik: 34, direksiyon: 20, yas: 24, tur: 'ehliyet', aktif: false, teyit: true },
  'DE': { ad: 'DE · Römorklu otobüs', ucret: null, teorik: 34, direksiyon: 20, yas: 24, tur: 'ehliyet', aktif: false, teyit: true },
  'F': { ad: 'F · Traktör', ucret: null, teorik: 34, direksiyon: 14, yas: 17, tur: 'ehliyet', aktif: false, teyit: true },
  'G': { ad: 'G · İş makinesi', ucret: null, teorik: 34, direksiyon: 14, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'SRC1': { ad: 'SRC1 · Uluslararası yolcu taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC2': { ad: 'SRC2 · Yurt içi yolcu taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC3': { ad: 'SRC3 · Uluslararası eşya taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC4': { ad: 'SRC4 · Yurt içi eşya taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC5': { ad: 'SRC5 · Tehlikeli madde taşımacılığı', ucret: null, teorik: 24, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'OP': { ad: 'İş makinesi operatörlüğü', ucret: null, teorik: 40, direksiyon: 16, yas: 18, tur: 'operator', aktif: false, teyit: true },
};
export const SINIFLAR = JSON.parse(JSON.stringify(SINIF_VARSAYILAN));
export const aktifSiniflar = () => Object.entries(SINIFLAR).filter(([, v]) => v.aktif);
export const satistaSiniflar = () => aktifSiniflar().filter(([, v]) => v.ucret > 0);
// Ödeme yöntemleri tek listede (raporlar, kasa ve muhasebe aynı adları kullanır)
export const YONTEMLER = ['Nakit', 'Kart', 'Havale'];
export const yontemAd = y => y === 'Havale' ? 'Havale/EFT' : y;
// Ay ekleme: 31 Ocak + 1 ay = 28/29 Şubat (taşma yok)
export const ayEkle = (t, n) => { const d = tarihOku(t), g = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const son = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(g, son)); return iso(d); };
// İki tarih arasındaki iş günü (bas hariç, bit dahil; Pazar ve tatiller sayılmaz)
export const isGunuSay = (bas, bit) => { let n = 0; const d = tarihOku(bas), b = tarihOku(bit); while (d < b) { d.setDate(d.getDate() + 1); if (!kapaliGun(iso(d))) n++; } return n; };

export const ASAMALAR = ['Kayıt', 'Evrak', 'Teorik', 'Direksiyon', 'Sınav', 'Ehliyet'];
export const EVRAKLAR = [
  ['saglik', 'Sürücü olur sağlık raporu'], ['ogrenim', 'Öğrenim belgesi'], ['adli', 'Adli sicil kaydı (barkodlu)'], ['foto', 'Biyometrik fotoğraf'],
  ['kimlik', 'Kimlik fotokopisi'], ['sozlesme', 'İmzalı sözleşme'],
];
export const KAYNAKLAR = ['Google Haritalar', 'Instagram', 'Tavsiye', 'WhatsApp', 'Web sitesi'];

function rng(tohum) { return () => { tohum |= 0; tohum = tohum + 0x6D2B79F5 | 0; let t = Math.imul(tohum ^ tohum >>> 15, 1 | tohum); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const ADLAR_K = ['Elif', 'Zeynep', 'Ayşe', 'Merve', 'Büşra', 'Ece', 'Selin', 'Derya', 'Gamze', 'İrem', 'Sude', 'Melis', 'Nisa', 'Cansu', 'Esra', 'Damla', 'Hande', 'Yağmur'];
const ADLAR_E = ['Emre', 'Burak', 'Mert', 'Can', 'Oğuz', 'Kerem', 'Yusuf', 'Ahmet', 'Mehmet', 'Furkan', 'Berk', 'Onur', 'Serkan', 'Tolga', 'Umut', 'Alp', 'Batuhan', 'Kaan', 'Eren', 'Hakan'];
const SOYADLAR = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Şimşek', 'Polat', 'Erdem', 'Güneş', 'Aksoy', 'Tekin', 'Uçar', 'Bulut'];

const SAAT_SIMDI = new Date().getHours();
function uret() {
  const r = rng(2610);
  const sec = a => a[Math.floor(r() * a.length)];
  const ara = (a, b) => a + Math.floor(r() * (b - a + 1));
  const tel = () => '05' + ara(30, 55) + ' ' + ara(100, 999) + ' ' + ara(10, 99) + ' ' + ara(10, 99);
  // Biçimi geçerli ama uydurma TC kimlik numarası (demo)
  const tcUret = () => { const d = [ara(1, 9)]; for (let i = 0; i < 8; i++) d.push(ara(0, 9)); d.push((((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10 + 10) % 10); d.push(d.reduce((a, b) => a + b, 0) % 10); return d.join(''); };
  const MAH = ['Vişnelik', 'Emek', 'Osmangazi', 'Şirintepe', 'Batıkent', 'Hoşnudiye', 'Yenibağlar', 'Gökmeydan', 'Büyükdere', 'Sümer'];

  const egitmenler = [
    { id: 'e1', ad: 'Hüseyin Aktaş', tel: '0532 418 22 61', siniflar: ['B'], renk: '#2f6fde', baslama: '2014', maas: 34000, prim: 160, belgeler: { sertifika: gun(820), saglik: gun(140), adli: gun(400) } },
    { id: 'e2', ad: 'Sevgi Uysal', tel: '0541 776 30 18', siniflar: ['B-O'], renk: '#c2410c', baslama: '2017', maas: 32000, prim: 160, belgeler: { sertifika: gun(1200), saglik: gun(18), adli: gun(300) } },
    { id: 'e3', ad: 'Murat Er', tel: '0505 233 91 47', siniflar: ['B', 'C'], renk: '#0f8a5f', baslama: '2011', maas: 36000, prim: 180, belgeler: { sertifika: gun(640), saglik: gun(220), adli: gun(9) } },
    { id: 'e4', ad: 'Gökhan Tunç', tel: '0553 902 14 85', siniflar: ['A2'], renk: '#7c3aed', baslama: '2019', maas: 30000, prim: 150, belgeler: { sertifika: gun(25), saglik: gun(310), adli: gun(510) } },
    { id: 'e5', ad: 'Nurcan Bilgin', tel: '0536 640 72 09', siniflar: ['B-O'], renk: '#b45309', baslama: '2021', maas: 29000, prim: 150, belgeler: { sertifika: gun(1500), saglik: gun(260), adli: gun(330) } },
  ];
  const araclar = [
    { id: 'a1', plaka: '26 SN 214', model: 'Renault Clio', yil: 2023, sinif: 'B', vites: 'Manuel', km: 48210, muayene: gun(212), sigorta: gun(64), kasko: gun(64), bakimKm: 50000, egitmen: 'e1' },
    { id: 'a2', plaka: '26 SN 731', model: 'Fiat Egea', yil: 2022, sinif: 'B', vites: 'Manuel', km: 71940, muayene: gun(19), sigorta: gun(141), kasko: gun(141), bakimKm: 75000, egitmen: 'e3' },
    { id: 'a3', plaka: '26 SN 508', model: 'Toyota Corolla', yil: 2024, sinif: 'B-O', vites: 'Otomatik', km: 23650, muayene: gun(530), sigorta: gun(9), kasko: gun(9), bakimKm: 30000, egitmen: 'e5' },
    { id: 'a4', plaka: '26 SN 116', model: 'Hyundai i20', yil: 2023, sinif: 'B-O', vites: 'Otomatik', km: 39880, muayene: gun(311), sigorta: gun(203), kasko: gun(203), bakimKm: 40000, egitmen: 'e2' },
    { id: 'a5', plaka: '26 SN 902', model: 'Honda CB125F', yil: 2023, sinif: 'A2', vites: 'Manuel', km: 9140, muayene: gun(388), sigorta: gun(97), kasko: null, bakimKm: 12000, egitmen: 'e4' },
    { id: 'a6', plaka: '26 SN 447', model: 'Ford Cargo 1833', yil: 2020, sinif: 'C', vites: 'Manuel', km: 184300, muayene: gun(76), sigorta: gun(158), kasko: gun(158), bakimKm: 190000, egitmen: 'e3' },
  ];

  const kursiyerler = [];
  const sinifDag = ['B', 'B', 'B', 'B', 'B-O', 'B-O', 'B-O', 'A2', 'A2', 'C'];
  for (let i = 0; i < 64; i++) {
    const kadin = r() < 0.48;
    const sinif = sec(sinifDag);
    const yas = ara(3, 92);
    const kayit = gun(-yas);
    const S = SINIFLAR[sinif];
    const uygun = egitmenler.filter(e => e.siniflar.includes(sinif));
    const egitmen = sec(uygun).id;
    let asama, teorik, direksiyon, esinav = null, dsinav = null;
    const ev = {}; EVRAKLAR.forEach(([k]) => ev[k] = true);
    if (yas < 9) {
      asama = r() < 0.5 ? 'Kayıt' : 'Evrak';
      EVRAKLAR.forEach(([k]) => ev[k] = r() < 0.55);
      teorik = 0; direksiyon = 0;
    } else if (yas < 30) {
      asama = 'Teorik'; teorik = Math.min(S.teorik, Math.round((yas - 8) * 1.9)); direksiyon = 0;
      if (r() < 0.2) ev.saglik = false;
    } else if (yas < 52) {
      asama = 'Direksiyon'; teorik = S.teorik; direksiyon = Math.min(S.direksiyon - 1, Math.round((yas - 30) * 0.75));
      esinav = { sonuc: 'Geçti', puan: ara(72, 98), hak: 1 };
    } else if (yas < 66) {
      asama = 'Sınav'; teorik = S.teorik; direksiyon = S.direksiyon;
      esinav = { sonuc: 'Geçti', puan: ara(70, 96), hak: 1 };
    } else {
      teorik = S.teorik; direksiyon = S.direksiyon;
      esinav = { sonuc: 'Geçti', puan: ara(70, 98), hak: r() < 0.2 ? 2 : 1 };
      const gecti = r() < 0.8 || (egitmen === 'e1' && r() < 0.7);
      dsinav = { sonuc: gecti ? 'Geçti' : 'Kaldı', hak: 1, tarih: gun(-ara(3, 20)) };
      asama = gecti ? 'Ehliyet' : 'Sınav';
    }
    // ödeme planı
    const pesin = Math.round(S.ucret * (r() < 0.3 ? 1 : (0.3 + r() * 0.15)) / 500) * 500;
    const kalan = S.ucret - pesin;
    const tn = kalan > 0 ? ara(3, 5) : 0;
    const taksitler = [];
    for (let t = 0; t < tn; t++) {
      const vadeD = tarihOku(kayit); vadeD.setMonth(vadeD.getMonth() + t + 1);
      const vade = iso(vadeD);
      const tutar = t === tn - 1 ? kalan - Math.round(kalan / tn / 50) * 50 * (tn - 1) : Math.round(kalan / tn / 50) * 50;
      const gecmis = fark(vade) < 0;
      const odendi = gecmis ? (r() < 0.82 ? gun(fark(vade) + ara(-3, 2)) : null) : null;
      taksitler.push({ vade, tutar, odendi, yontem: odendi ? sec(['Havale', 'Kart', 'Nakit']) : null });
    }
    const ad = kadin ? sec(ADLAR_K) : sec(ADLAR_E);
    kursiyerler.push({
      id: 'k' + (101 + i), ad, soyad: sec(SOYADLAR), tel: tel(), dogum: (2008 - ara(0, 24)) + '', sinif, kayit, egitmen,
      asama, teorik, direksiyon, evrak: ev, mebIslendi: yas > 7 && r() < 0.92, esinav, dsinav,
      odeme: { toplam: S.ucret, pesin, pesinTarih: kayit, taksitler },
      kaynak: sec(['Google Haritalar', 'Google Haritalar', 'Google Haritalar', 'Instagram', 'Instagram', 'Tavsiye', 'Tavsiye', 'WhatsApp', 'Web sitesi']),
      yorum: asama === 'Ehliyet' ? (r() < 0.55 ? 'yapti' : 'istendi') : null,
      notlar: [],
      tc: tcUret(), dogumTarihi: (2008 - ara(0, 24)) + '-' + String(ara(1, 12)).padStart(2, '0') + '-' + String(ara(1, 28)).padStart(2, '0'),
      adres: sec(MAH) + ' Mah., ' + sec(['Odunpazarı', 'Tepebaşı']) + ' / Eskişehir', ogrenim: sec(['Lise', 'Lise', 'Lisans', 'Önlisans', 'Ortaokul']), cinsiyet: kadin ? 'Kadın' : 'Erkek',
      teorikGrup: r() < 0.65 ? 'aksam' : 'sabah',
      deneme: ['Teorik', 'Direksiyon', 'Sınav'].includes(asama) ? Array.from({ length: ara(2, 6) }, () => ara(r() < 0.18 ? 38 : 58, r() < 0.18 ? 66 : 96)) : [],
      acil: { ad: sec(ADLAR_K.concat(ADLAR_E)) + ' ' + sec(SOYADLAR), yakinlik: sec(['Anne', 'Baba', 'Eş', 'Kardeş']), tel: tel() },
    });
    kursiyerler[kursiyerler.length - 1].odeme.senetli = r() < 0.35 && kursiyerler[kursiyerler.length - 1].odeme.taksitler.length > 0;
  }
  kursiyerler.find(k => k.asama === 'Direksiyon').notlar.push({ tarih: gun(-4), metin: 'Yokuş kalkışta zorlanıyor, iki ek ders önerildi.' });

  // direksiyon dersleri: geçmiş 14 gün + gelecek 10 gün
  const dersler = [];
  const saatler = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '19:00'];
  const aktif = kursiyerler.filter(k => ['Direksiyon', 'Sınav'].includes(k.asama));
  let did = 1;
  const gunSay = {};
  const planSay = {}, gecmisSay = {};
  for (let n = -14; n <= 10; n++) {
    const d = tarihOku(gun(n));
    if (kapaliGun(iso(d))) continue;
    egitmenler.forEach(e => {
      saatler.forEach(s => {
        if (r() < (n < 0 ? 0.62 : n < 4 ? 0.55 : 0.32)) {
          let adaylar = aktif.filter(k => k.egitmen === e.id);
          if (adaylar.length < 3) adaylar = adaylar.concat(aktif.filter(k => e.siniflar.includes(k.sinif)));
          const ileri = !(n < 0 || (n === 0 && +s.slice(0, 2) < SAAT_SIMDI));
          adaylar = adaylar.filter(k => (gunSay[k.id + n] || 0) < 2 && !dersler.some(d => d.kursiyer === k.id && d.tarih === gun(n) && d.saat === s) && (ileri ? k.direksiyon + (planSay[k.id] || 0) < SINIFLAR[k.sinif].direksiyon : (gecmisSay[k.id] || 0) < k.direksiyon));
          if (!adaylar.length) return;
          const k = sec(adaylar);
          gunSay[k.id + n] = (gunSay[k.id + n] || 0) + 1;
          if (ileri) planSay[k.id] = (planSay[k.id] || 0) + 1; else gecmisSay[k.id] = (gecmisSay[k.id] || 0) + 1;
          const arac = araclar.find(a => a.egitmen === e.id && a.sinif === k.sinif);
          dersler.push({ id: 'd' + did++, kursiyer: k.id, egitmen: e.id, arac: arac ? arac.id : null, tarih: gun(n), saat: s, eklendi: gun(Math.min(n, 0) - ara(6, 12) + (n > 0 && r() < 0.12 ? ara(4, 8) : 0)), meb: n < 3 ? true : r() < 0.7, durum: (n < 0 || (n === 0 && +s.slice(0, 2) < SAAT_SIMDI)) ? (r() < 0.965 ? 'Yapıldı' : 'Gelmedi') : 'Planlandı' });
          const sd = dersler[dersler.length - 1]; if (sd.durum === 'Yapıldı' && r() < 0.86) sd.imza = { zaman: sd.tarih + 'T' + sd.saat, kursiyer: null, usta: null };
        }
      });
    });
  }

  // Takip formu tam olsun: kursiyerin yaptığı her direksiyon dersi kayıtlı (son 14 günden öncekiler geriye doğru doldurulur)
  kursiyerler.forEach(k => {
    const yapilan = dersler.filter(d => d.kursiyer === k.id && d.durum !== 'Planlandı');
    let eksik = k.direksiyon - yapilan.filter(d => d.durum === 'Yapıldı').length, n = -15;
    const arac = araclar.find(a => a.egitmen === k.egitmen && a.sinif === k.sinif);
    while (eksik > 0 && n > -120) {
      const t = gun(n); n -= 1 + (r() < 0.5 ? 1 : 0);
      if (kapaliGun(t) || t < k.kayit) continue;
      const s = sec(saatler);
      dersler.push({ id: 'd' + did++, kursiyer: k.id, egitmen: k.egitmen, arac: arac ? arac.id : null, tarih: t, saat: s, eklendi: gun(fark(t) - ara(5, 10)), meb: true, durum: 'Yapıldı', imza: { zaman: t + 'T' + s, kursiyer: null, usta: null } });
      eksik--;
    }
    k.direksiyon = dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').length;
  });

  // teorik dersler (sınıf programı)
  const KONULAR = ['Trafik ve çevre bilgisi', 'İlk yardım bilgisi', 'Araç tekniği bilgisi', 'Trafik adabı'];
  const teorik = [];
  let tid = 1;
  for (let n = -10; n <= 7; n++) {
    const d = tarihOku(gun(n)); const g = d.getDay();
    if (g === 0 || g === 6 || kapaliGun(gun(n))) continue;
    teorik.push({ id: 't' + tid++, tarih: gun(n), saat: '18:30', sure: 2, konu: KONULAR[(n + 20) % 4], salon: 'Derslik 1', grup: 'aksam', ogretmen: 'o' + (1 + ((n + 20) % 3)), katilim: n < 0 ? ara(14, 22) : null, mevcut: 23 });
    if (g === 2 || g === 4) teorik.push({ id: 't' + tid++, tarih: gun(n), saat: '10:00', sure: 3, konu: KONULAR[(n + 21) % 4], salon: 'Derslik 2', grup: 'sabah', ogretmen: 'o' + (1 + ((n + 21) % 3)), katilim: n < 0 ? ara(8, 13) : null, mevcut: 14 });
  }

  // sınav oturumları
  const sinavlar = [];
  const dir = kursiyerler.filter(k => k.asama === 'Direksiyon');
  const sin = kursiyerler.filter(k => k.asama === 'Sınav' && !k.dsinav);
  const kal = kursiyerler.filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı');
  const bitti = kursiyerler.filter(k => k.dsinav);
  sinavlar.push({ id: 's1', tur: 'e-Sınav', tarih: gun(-19), saat: '10:00', yer: 'Odunpazarı e-Sınav Merkezi', kursiyerler: dir.slice(0, 9).map(k => k.id), sonuc: Object.fromEntries(dir.slice(0, 9).map(k => [k.id, 'Geçti'])) });
  sinavlar.push({ id: 's2', tur: 'Direksiyon', tarih: gun(-9), saat: '08:30', yer: 'Sınav güzergâhı · Organize Sanayi', kursiyerler: bitti.map(k => k.id), sonuc: Object.fromEntries(bitti.map(k => [k.id, k.dsinav.sonuc])) });
  sinavlar.push({ id: 's3', tur: 'Direksiyon', mebBildirim: false, tarih: isGunuIleri(gun(3)), saat: '08:30', yer: 'Sınav güzergâhı · Organize Sanayi', kursiyerler: sin.slice(0, 8).map(k => k.id), sonuc: {} });
  sinavlar.push({ id: 's4', tur: 'e-Sınav', tarih: isGunuIleri(gun(6)), saat: '14:00', yer: 'Tepebaşı e-Sınav Merkezi', kursiyerler: kursiyerler.filter(k => k.asama === 'Teorik' && k.teorik >= 30).slice(0, 1).map(k => k.id), sonuc: {} });
  sinavlar.push({ id: 's5', tur: 'Direksiyon', mebBildirim: false, tarih: isGunuIleri(gun(10)), saat: '08:30', yer: 'Sınav güzergâhı · Organize Sanayi', kursiyerler: sin.slice(8).concat(kal).map(k => k.id), sonuc: {} });
  sin.slice(0, 8).forEach(k => k.dsinavPlan = isGunuIleri(gun(3)));

  // kasa hareketleri
  const hareket = [];
  let hid = 1;
  kursiyerler.forEach(k => {
    hareket.push({ id: 'h' + hid++, tarih: k.odeme.pesinTarih, tur: 'Gelir', kategori: 'Kurs ücreti', aciklama: k.ad + ' ' + k.soyad + ' · peşinat', tutar: k.odeme.pesin, yontem: sec(['Kart', 'Havale', 'Nakit']), kursiyer: k.id });
    k.odeme.taksitler.forEach((t, i) => { if (t.odendi) hareket.push({ id: 'h' + hid++, tarih: t.odendi, tur: 'Gelir', kategori: 'Taksit', aciklama: k.ad + ' ' + k.soyad + ' · ' + (i + 1) + '. taksit', tutar: t.tutar, yontem: t.yontem, kursiyer: k.id }); });
  });
  for (let m = 0; m < 6; m++) {
    const ay = new Date(BUGUN); ay.setDate(1); ay.setMonth(ay.getMonth() - m);
    const ayGun = k => { const d = new Date(ay); d.setDate(k); return iso(d); };
    if (fark(ayGun(1)) <= 0) hareket.push({ id: 'h' + hid++, tarih: ayGun(1), tur: 'Gider', kategori: 'Kira', aciklama: 'Kurs binası kirası', tutar: 32000, yontem: 'Havale' });
    if (fark(ayGun(5)) <= 0) hareket.push({ id: 'h' + hid++, tarih: ayGun(5), tur: 'Gider', kategori: 'Maaş', aciklama: 'Personel maaşları', tutar: 148000, yontem: 'Havale' });
    [3, 10, 17, 24].forEach(g => { if (fark(ayGun(g)) <= 0) araclar.forEach(ar => hareket.push({ id: 'h' + hid++, tarih: ayGun(g), tur: 'Gider', kategori: 'Yakıt', aciklama: ar.plaka + ' · yakıt', tutar: Math.round(ara(900, 1900) * (ar.sinif === 'C' ? 2.4 : ar.sinif === 'A2' ? 0.4 : 1) / 10) * 10, yontem: 'Kart', arac: ar.id })); });
    if (fark(ayGun(14)) <= 0) hareket.push({ id: 'h' + hid++, tarih: ayGun(14), tur: 'Gider', kategori: 'Fatura', aciklama: 'Elektrik, su, internet', tutar: ara(5200, 7400), yontem: 'Havale' });
    if (m > 0) {
      // önceki dönem tahsilatları (arşiv kursiyerler): ay toplamı ~300 bin olacak kadar
      const mevcut = hareket.filter(h => h.tur === 'Gelir' && tarihOku(h.tarih).getMonth() === ay.getMonth() && tarihOku(h.tarih).getFullYear() === ay.getFullYear()).reduce((a, h) => a + h.tutar, 0);
      const hedef = 285000 + ara(0, 40000);
      for (let x = 0, top = mevcut; x < 60 && top < hedef; x++) {
        const t = ayGun(ara(1, 27));
        const tt = Math.round(ara(4000, 12000) / 250) * 250; top += tt;
        hareket.push({ id: 'h' + hid++, tarih: t, tur: 'Gelir', kategori: sec(['Kurs ücreti', 'Taksit', 'Taksit']), aciklama: sec(ADLAR_E.concat(ADLAR_K)) + ' ' + sec(SOYADLAR) + ' · önceki dönem', tutar: tt, yontem: sec(['Kart', 'Havale', 'Nakit']) });
      }
    }
  }
  hareket.push({ id: 'h' + hid++, tarih: gun(-11), tur: 'Gider', kategori: 'Bakım', aciklama: '26 SN 731 · periyodik bakım', tutar: 8650, yontem: 'Kart', arac: 'a2' });
  hareket.push({ id: 'h' + hid++, tarih: gun(-37), tur: 'Gider', kategori: 'Bakım', aciklama: '26 SN 447 · fren balatası', tutar: 6200, yontem: 'Havale', arac: 'a6' });
  hareket.push({ id: 'h' + hid++, tarih: gun(-52), tur: 'Gider', kategori: 'Bakım', aciklama: '26 SN 214 · lastik değişimi', tutar: 11800, yontem: 'Kart', arac: 'a1' });
  hareket.push({ id: 'h' + hid++, tarih: gun(-23), tur: 'Gider', kategori: 'Reklam', aciklama: 'Instagram reklamı', tutar: 3500, yontem: 'Kart' });

  // adaylar (ön kayıt) · kayıt görüşmeleri tek takvimde (sosyal.slotlar) tutulur
  const gunAdi = t => tarihOku(t).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const yG = isGunuIleri(gun(1)), gG = isGunuIleri(gun(2));
  const BEYAN = 'Merhaba, ben Sinyal Sürücü Kursu adına yanıt veren yapay zekâ asistanıyım. ';
  const adaylar = [
    { ad: 'Deniz Akın', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B-O', asama: 'Yeni', saat: '08:12', gun: 0, m: [['aday', 'Merhaba, otomatik vites ehliyet için fiyat öğrenebilir miyim?'], ['asistan', 'Merhaba Deniz Bey, B otomatik sınıfı kurs ücretimiz 26.500 TL. Peşinatın ardından 5 aya kadar taksit yapıyoruz. Ne zaman başlamayı düşünüyorsunuz?']] },
    { ad: 'Sena Uğur', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'B', asama: 'Bilgi verildi', saat: '23:41', gun: -1, m: [['aday', 'Kaç günde ehliyet alınıyor?'], ['asistan', 'Teorik dersler yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi geliyor. Ortalama 2–3 ayda ehliyetinizi alıyorsunuz.'], ['aday', 'Taksit var mı?'], ['asistan', 'Evet, peşinat sonrası 5 aya kadar taksit yapıyoruz. Size uygun bir saat için kayıt görüşmesi ayarlayalım mı?']] },
    { ad: 'Yiğit Sarı', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'A2', asama: 'Görüşme', saat: '14:05', gun: -1, takip: gun(1), m: [['aday', 'Motor ehliyeti için hangi belgeler lazım?'], ['asistan', 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf ve kimlik yeterli. Raporu aile hekiminizden alabilirsiniz.'], ['aday', 'Bu hafta gelip kaydolabilir miyim?'], ['asistan', `${gunAdi(yG)} 11:30 için kayıt görüşmenizi oluşturdum. Gelirken kimliğinizi getirin.`]] },
    { ad: 'Aslı Kara', kaynak: 'Tavsiye', kanal: 'WhatsApp', sinif: 'B', asama: 'Bilgi verildi', saat: '19:20', gun: -2, takip: gun(0), m: [['aday', 'Kuzenim sizde aldı, ben de kaydolmak istiyorum. Hafta sonu ders var mı?'], ['asistan', 'Hoş geldiniz! Cumartesi direksiyon derslerimiz var. Teorik dersler hafta içi akşam 18:30’da.']] },
    { ad: 'Ozan Demirci', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'C', asama: 'Yeni', saat: '07:55', gun: 0, devir: 'Kurs bilgisinde B’den C’ye geçiş ücreti yok', m: [['aday', 'B ehliyetim var, C ye geçiş ne kadar?'], ['asistan', BEYAN + 'B’den C’ye geçiş ücreti konusunda elimde kesin bilgi yok, yanlış bilgi vermek istemem. Yetkilimize haber verdim; en geç 30 dakika içinde size dönecek.']] },
    { ad: 'Melike Tan', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'B-O', asama: 'Kayıt', saat: '11:30', gun: -3, m: [['aday', 'Yarın kayda geleceğim, evrakları getireyim mi?'], ['asistan', 'Evet, sağlık raporu ve öğrenim belgesi yeterli; fotoğrafı kursta çekiyoruz.']] },
    { ad: 'Barış Yalçın', kaynak: 'Web sitesi', kanal: 'WhatsApp', sinif: 'B', asama: 'Kaybedildi', saat: '16:44', gun: -6, not: 'Fiyatı yüksek buldu', m: [['aday', 'Başka yerde 21 bin dediler.'], ['asistan', 'Anlıyorum. Fiyatımıza sınav günü araç ve ek tekrar dersi dahil. Karar verirseniz buradayız.']] },
    { ad: 'Gizem Önal', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Görüşme', saat: '10:18', gun: -1, takip: gun(2), m: [['aday', 'Öğrenciyim, indirim oluyor mu?'], ['asistan', 'Öğrenci belgesiyle kayıtta 1.000 TL indirim uyguluyoruz.'], ['aday', 'Gelip konuşmak istiyorum'], ['asistan', `${gunAdi(gG)} 14:00 için kayıt görüşmenizi oluşturdum. Öğrenci belgenizi getirmeyi unutmayın.`]] },
    { ad: 'Kadir Bayram', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Yeni', saat: '09:47', gun: 0, m: [['aday', 'Sınavda kalırsam tekrar ücret ödüyor muyum?'], ['asistan', BEYAN + 'e-Sınav tekrarında MEB’in oturum ücreti 1.250 TL, direksiyon sınavı tekrarında 2.000 TL alıyoruz; sınav günü kurs aracı dahil. Her sınav için 4 hakkınız var.']] },
    { ad: 'Ebru Çınar', kaynak: 'Tavsiye', kanal: 'WhatsApp', sinif: 'B-O', asama: 'Bilgi verildi', saat: '21:03', gun: -4, takip: gun(-1), m: [['aday', 'Annem için soruyorum, 52 yaşında, zor olur mu?'], ['asistan', 'Hiç zor değil; otomatik vitesle başlayan pek çok kursiyerimiz var. Eğitmenimiz Nurcan Hanım çok sabırlıdır.']] },
    { ad: 'Tunahan Ersoy', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'A2', asama: 'Kayıt', saat: '13:15', gun: -5, m: [['aday', 'Kaydoldum teşekkürler']] },
    { ad: 'Pınar Gök', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Kaybedildi', saat: '12:00', gun: -8, not: 'Cevap vermedi', m: [['aday', 'Fiyat?'], ['asistan', 'B manuel 24.000 TL, taksit imkânı var.']] },
  ].map((a, i) => ({ id: 'l' + (i + 1), ad: a.ad, tel: tel(), kaynak: a.kaynak, kanal: a.kanal, sinif: a.sinif, asama: a.asama, tarih: gun(a.gun), saat: a.saat, takip: a.takip || null, not: a.not || '', devir: a.devir || null, mesajlar: a.m.map(([kim, metin]) => ({ kim, metin })) }));

  const otomasyonlar = [
    { id: 'o1', ad: 'Direksiyon dersi hatırlatması', ne: 'Dersten bir gün önce 18:00’de', kanal: 'WhatsApp', acik: true, gonderim: 412, sablon: 'Merhaba {ad}, yarın {saat}’te {egitmen} ile direksiyon dersin var. Gelemeyeceksen bu mesajı yanıtlaman yeterli.' },
    { id: 'o2', ad: 'Taksit hatırlatması', ne: 'Vadeden 3 gün önce ve vade günü', kanal: 'WhatsApp', acik: true, gonderim: 138, sablon: 'Merhaba {ad}, {vade} tarihli {tutar} taksidinin hatırlatmasıdır. Kartla ödemek için: {link}' },
    { id: 'o3', ad: 'Sınav bilgilendirmesi', ne: 'Sınava 3 gün ve 1 gün kala', kanal: 'WhatsApp', acik: true, gonderim: 96, sablon: '{ad}, {tur} sınavın {tarih} {saat}’te, {yer}. Kimliğini yanına almayı unutma.' },
    { id: 'o4', ad: 'Eksik evrak hatırlatması', ne: 'Kayıttan 3 gün sonra, evrak eksikse', kanal: 'WhatsApp', acik: true, gonderim: 41, sablon: 'Merhaba {ad}, kaydını tamamlamak için {evrak} eksik. Kursa getirdiğinde işlemlerini hemen başlatıyoruz.' },
    { id: 'o5', ad: 'Google yorum isteği', ne: 'Direksiyon sınavını geçince', kanal: 'WhatsApp', acik: true, gonderim: 57, sablon: 'Tebrikler {ad}, artık ehliyetin var! Bizi Google’da değerlendirirsen çok seviniriz: {link}' },
    { id: 'o6', ad: 'Kalan kursiyere ek ders önerisi', ne: 'Sınav sonucu girildiğinde', kanal: 'WhatsApp', acik: true, gonderim: 12, sablon: '{ad}, bu sefer olmadı ama çok yakındın. Bir sonraki sınava kadar 2 ek ders ayarlayalım mı?' },
    { id: 'o8', ad: 'e-Sınav randevusu ve giriş belgesi', ne: 'Randevu kesinleşince', kanal: 'WhatsApp', acik: true, gonderim: 64, sablon: '{ad}, e-sınav randevun {tarih} {saat}, {yer}. Giriş belgen ekte; kimliğini unutma.' },
    { id: 'o9', ad: 'Sınav sonucu bildirimi', ne: 'Sonuç girilince', kanal: 'WhatsApp', acik: true, gonderim: 88, sablon: '{ad}, {tur} sınav sonucun: {sonuc}. {kalan_hak}' },
    { id: 'o7', ad: 'Düşünen adaya takip', ne: 'Bilgi aldıktan 2 gün sonra', kanal: 'WhatsApp', acik: false, gonderim: 0, sablon: 'Merhaba {ad}, kayıtla ilgili aklına takılan bir şey var mı? Bu hafta başlayan gruba hâlâ yer var.' },
  ];

  const duyurular = [
    { tarih: '2026-07', baslik: 'MTSK e-Sınav başvuru ve uygulama kılavuzu 2026', ozet: 'Kılavuza göre her e-sınav oturumu için KDV dahil 1.250 TL e-sınav ücreti alınıyor.', kaynak: 'meb.gov.tr' },
    { tarih: 'örnek', baslik: 'İl taban ücret tarifesi', ozet: 'Kurs ücretleri valilik komisyonunun belirlediği taban fiyatın altında olamaz. Güncel tarifeyi il MEM duyurularından takip edin.', kaynak: 'İl MEM' },
  ];

  const personel = [
    { id: 'p1', ad: 'Servet Sakar', gorev: 'Kurs müdürü', maas: 52000, tel: '0532 000 00 01' },
    { id: 'p2', ad: 'Selda Korkmaz', gorev: 'Ön büro / sekreter', maas: 28500, tel: '0543 615 20 77' },
    { id: 'p3', ad: 'Tuncay Yalım', gorev: 'Araç bakım / şoför', maas: 27000, tel: '0507 344 81 90' },
  ];
  const izinler = [
    { kim: 'e2', bas: gun(4), bit: gun(5), tur: 'Yıllık izin' },
    { kim: 'p2', bas: gun(12), bit: gun(12), tur: 'Mazeret izni' },
    { kim: 'e4', bas: gun(-6), bit: gun(-5), tur: 'Rapor' },
  ];
  const bekleme = kursiyerler.filter(k => k.asama === 'Direksiyon').slice(0, 5).map((k, i) => ({ kursiyer: k.id, tercih: ['Hafta içi sabah', 'Hafta içi akşam', 'Cumartesi', 'Fark etmez', 'Öğleden sonra'][i], eklendi: gun(-i - 1) }));
  const hesaplar = [
    { id: 'kasa', ad: 'Nakit kasa', tur: 'Kasa', bakiye: 18450 },
    { id: 'ziraat', ad: 'Ziraat Bankası', tur: 'Banka', bakiye: 412300 },
    { id: 'pos', ad: 'Sanal POS', tur: 'POS', bakiye: 38900 },
  ];
  const kazanim = { doldurulan: 14, ekDers: 9, yorum: 23 };
  const gruplar = [
    { id: 'aksam', ad: 'Akşam grubu', derslik: 'Derslik 1', baslangic: gun(5), kontenjan: 24 },
    { id: 'sabah', ad: 'Sabah grubu', derslik: 'Derslik 2', baslangic: gun(12), kontenjan: 16 },
  ];
  kursiyerler.forEach(k => { k.kvkk = { tarih: k.kayit, kanal: r() < 0.3 ? 'Online kayıt' : 'Kursta imzalı form', riza: true }; });
  const arsiv = [
    { yil: 2023, kursiyer: 372, gecmeE: 81, gecmeD: 74, gelir: 4120000 },
    { yil: 2024, kursiyer: 405, gecmeE: 83, gecmeD: 76, gelir: 6480000 },
    { yil: 2025, kursiyer: 431, gecmeE: 84, gecmeD: 79, gelir: 8950000 },
  ];
  const mevzuat = [
    { tarih: gun(-2), konu: 'Aylık mevzuat taraması', ne: 'MEB, ÖÖKGM ve Resmî Gazete tarandı; MTSK’yı etkileyen yeni düzenleme yok.', uygulandi: false },
    { tarih: '2026-07-20', konu: 'e-Sınav ücreti 1.250 TL', ne: 'MEB 2026 e-sınav kılavuzu: oturum başına KDV dahil 1.250 TL. Ek kalem tutarı güncellendi.', uygulandi: true },
    { tarih: '2026-07-10', konu: 'KVKK ve yetkisiz yazılım yazısı (haber)', ne: 'MEBBİS bilgilerinin paylaşılmaması ve bot/eklenti yasağı. Sinyal MEBBİS’e bağlanmadığı için değişiklik gerekmedi.', uygulandi: true },
  ];
  kursiyerler.forEach(k => { if (k.evrak.saglik) { const t = tarihOku(k.kayit); t.setDate(t.getDate() - ara(2, 20)); k.saglikRapor = { no: '2026/' + ara(10000, 99999), tarih: iso(t).split('-').reverse().join('.') }; } if (k.evrak.adli) k.adliSicil = { barkod: 'ASB' + ara(100000, 999999) + ara(1000, 9999) }; });
  kursiyerler.forEach(k => { if (k.asama === 'Ehliyet' && k.dsinav) { const d = fark(k.dsinav.tarih); k.kapanis = d < -12 ? { sertifika: gun(d + 3), arsiv: gun(d + 6) } : d < -5 ? { sertifika: gun(d + 3) } : {}; } });
  kursiyerler.forEach(k => { k.odeme.ekler = []; if (k.esinav) k.odeme.ekler.push({ ad: 'e-Sınav ücreti', tutar: 1250, odendi: k.kayit }); if (k.dsinav && k.dsinav.hak > 1) k.odeme.ekler.push({ ad: 'Direksiyon sınavı tekrar ücreti', tutar: 2000, odendi: null }); if (k.dsinav && k.dsinav.sonuc === 'Kaldı') k.odeme.ekler.push({ ad: 'Sınav tekrar ücreti', tutar: 2000, odendi: null }); });
  const ogretmenler = [
    { id: 'o1', ad: 'Ayten Duman', brans: 'Trafik ve çevre', tel: '0532 771 40 12' },
    { id: 'o2', ad: 'Dr. Serkan Ak', brans: 'İlk yardım', tel: '0505 318 62 90' },
    { id: 'o3', ad: 'Levent Oral', brans: 'Araç tekniği', tel: '0542 905 13 77' },
  ];
  const kullanicilar = [
    { id: 'u1', ad: 'Servet Sakar', rol: 'mudur', pin: '1111' },
    { id: 'u2', ad: 'Selda Korkmaz', rol: 'sekreter', pin: '2222' },
    { id: 'u3', ad: 'Hüseyin Aktaş', rol: 'usta', usta: 'e1', pin: '3333' },
  ];
  const islemler = [
    { zaman: gun(-1) + 'T17:42', kim: 'Selda Korkmaz', ne: 'Tahsilat aldı', ayrinti: 'Ayşe Yıldız · 2. taksit · 6.500 ₺' },
    { zaman: gun(-1) + 'T11:05', kim: 'Servet Sakar', ne: 'Ücret değiştirdi', ayrinti: 'B · Otomatik 26.000 ₺ → 26.500 ₺' },
    { zaman: gun(-2) + 'T09:30', kim: 'Hüseyin Aktaş', ne: 'Ders yapıldı işaretledi', ayrinti: 'Elif Erdem · 12. ders' },
  ];
  const asistanBilgi = [
    { konu: 'Fiyat ve taksit', metin: 'B manuel 24.000 TL, B otomatik 26.500 TL, A2 18.500 TL, C 31.000 TL. Peşinat sonrası 5 aya kadar taksit. Öğrenci belgesiyle 1.000 TL indirim.', onay: gun(-3) },
    { konu: 'Evraklar', metin: 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf, kimlik. Fotoğrafı kursta çekiyoruz.', onay: gun(-12) },
    { konu: 'Ders saatleri', metin: 'Teorik dersler hafta içi 18:30 ve Salı-Perşembe 10:00. Direksiyon Pazartesi–Cumartesi 09:00–18:00.', onay: gun(-12) },
    { konu: 'Süre', metin: 'Teorik yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi; ortalama 2–3 ay.', onay: gun(-12) },
    { konu: 'Sınav ücretleri', metin: 'e-Sınav ücreti oturum başına 1.250 TL (MEB 2026 kılavuzu), kurs ücretine dahil değil. Direksiyon sınavı tekrarında 2.000 TL; sınav günü kurs aracı dahil. Her sınav için 4 hak var.', onay: gun(-5) },
  ];
  const devredilen = [
    { ad: 'Ozan Demirci', aday: 'l5', kanal: 'WhatsApp', konu: 'Bilinmeyen soru', mesaj: 'B ehliyetim var, C ye geçiş ne kadar?', neden: 'Kurs bilgisinde B’den C’ye geçiş ücreti yok', saat: '07:55', bildirim: [['07:55', 'Servet Sakar', 'WhatsApp']] },
    { ad: 'Halil Yurt', kanal: 'WhatsApp', konu: 'İndirim pazarlığı', mesaj: 'Üç kardeş kaydolursak ne kadar indirim olur?', neden: 'Kurs bilgisinde toplu indirim yok', saat: '10:12', bildirim: [['10:12', 'Servet Sakar', 'WhatsApp'], ['10:27', 'Selda Korkmaz', 'WhatsApp · 15 dk cevapsız kaldı']] },
    { ad: 'Seda Bal', kanal: 'Instagram', konu: 'Özel durum', mesaj: 'Sol ayağımda protez var, otomatik araçla ehliyet alabilir miyim?', neden: 'Sağlık durumu: insana devredildi', saat: '09:40', bildirim: [['09:40', 'Servet Sakar', 'WhatsApp']] },
  ];

  // Sosyal medya asistanı (DengChat modülü)
  const sosyal = {
    kanallar: [
      { id: 'igm', ad: 'Instagram mesajları', hesap: '@sinyalsurucukursu', bagli: true, cevap: true, mod: '7/24', son: '08:12', izin: gun(-12), sonCevapDk: 3 },
      { id: 'igy', ad: 'Instagram yorumları', hesap: '@sinyalsurucukursu', bagli: true, cevap: true, mod: '7/24', son: '07:58', izin: gun(-12), sonCevapDk: 17 },
      { id: 'wp', ad: 'WhatsApp Business', hesap: '0222 000 00 00', bagli: true, cevap: true, mod: 'Mesai dışı', son: '08:12', izin: gun(-40), sonCevapDk: 3, birlikte: true },
      { id: 'fb', ad: 'Facebook Messenger', hesap: 'Sinyal Sürücü Kursu', bagli: false, cevap: false, mod: '7/24', son: null, izin: null, sonCevapDk: null },
    ],
    ayar: {
      ad: 'Kurs asistanı', ton: 'Samimi', emoji: false, susma: 24, devir: { indirim: true, sikayet: true, saglik: true, insan: true, bilinmeyen: true },
      fiyat: 'sorulan', randevu: true, gizleOnay: true, hizSiniri: true, onayModu: 'otomatik', model: 'Sinyal Asistan TR',
      veri: { konum: 'tr', maskele: true, aydinlatma: true, saklamaAy: 12 },
      bildirim: { kisiler: ['u1', 'u2'], kanal: 'WhatsApp', ikinciDk: 15, bekletme: true, sessiz: true, sessizBas: '22:00', sessizBit: '08:00' },
    },
    gorusmeSablon: { gunler: [1, 2, 3, 4, 5, 6], saatler: ['10:00', '11:30', '14:00', '16:30'], kapali: [gun(9)] },
    bilinmeyen: [
      { soru: 'B ehliyetim var, C ye geçiş ne kadar?', sayi: 1, son: gun(0) },
      { soru: 'Engelli araç ile eğitim veriyor musunuz?', sayi: 4, son: gun(-1) },
      { soru: 'Kurs bitince sınav aracını kullanabilir miyim, ücreti ne?', sayi: 3, son: gun(-2) },
      { soru: 'Yabancı uyrukluyum, kayıt için ne gerekir?', sayi: 2, son: gun(-3) },
      { soru: 'Ehliyetim iptal oldu, yeniden almak için kursa gelmem gerekiyor mu?', sayi: 2, son: gun(-5) },
      { soru: 'Hafta sonu teorik ders var mı?', sayi: 1, son: gun(-6) },
    ],
    slotlar: [{ tarih: yG, saat: '11:30', dolu: 'Yiğit Sarı', aday: 'l3', kanal: 'WhatsApp' }, { tarih: gG, saat: '14:00', dolu: 'Gizem Önal', aday: 'l8', kanal: 'WhatsApp' }],
    ay: { mesaj: 1284, kisi: 412, otomatik: 92, sure: 3, mesaiDisi: 41, aday: 86, gorusme: 31, kayit: 14, devir: 9 },
    saatlik: [9, 4, 2, 1, 1, 2, 6, 14, 31, 42, 47, 45, 52, 49, 44, 47, 55, 63, 74, 88, 104, 112, 96, 41],
    kanalDagilim: { igm: 46, igy: 18, wp: 36, fb: 0 },
    gonderiler: [
      { id: 'g1', gorsel: 'img/kayit.webp', metin: 'Kasım grubu kayıtları başladı. Teorik dersler 18:30’da.', begeni: 214, gun: -2 },
      { id: 'g2', gorsel: 'img/arac-a2.webp', metin: 'Otomatik vitesli yeni aracımız filoya katıldı.', begeni: 158, gun: -5 },
      { id: 'g3', gorsel: 'img/arac-a4.webp', metin: 'Bu hafta 9 kursiyerimiz direksiyon sınavını geçti. Tebrikler!', begeni: 302, gun: -8 },
    ],
    yorumlar: [
      { id: 'y1', gonderi: 'g1', kim: '@elif.krk', metin: 'Fiyat ne kadar?', saat: '07:58', gun: 0, durum: 'dm', cevap: 'Merhaba, ücret bilgisini özelden yazdım.' },
      { id: 'y2', gonderi: 'g1', kim: '@mert_yz', metin: 'Akşam kursu var mı, gündüz çalışıyorum', saat: '23:14', gun: -1, durum: 'acik', cevap: 'Var, teorik dersler hafta içi 18:30’da. Direksiyonu da size uygun saate planlıyoruz.' },
      { id: 'y3', gonderi: 'g2', kim: '@ayse.dmr', metin: 'Ben de buradan aldım, hocalar çok ilgili 👏', saat: '20:41', gun: -2, durum: 'acik', cevap: 'Teşekkür ederiz Ayşe Hanım, yolunuz açık olsun!' },
      { id: 'y4', gonderi: 'g2', kim: '@hakan_44', metin: 'Sınav günü araç gelmedi, rezalet', saat: '22:05', gun: -2, durum: 'devir', cevap: null },
      { id: 'y5', gonderi: 'g3', kim: '@takipci.al.ucuz', metin: 'Takipçi almak için profilime bak', saat: '03:12', gun: -3, durum: 'onay', cevap: null },
      { id: 'y6', gonderi: 'g3', kim: '@zeynep.oz', metin: 'Otomatik ile kaç ayda bitiyor?', saat: '21:37', gun: -3, durum: 'dm', cevap: 'Detayları özelden yazdım.' },
    ],
  };

  const subeler = [{ id: 's1', ad: 'Merkez', semt: 'Odunpazarı', kurumKodu: '965412', mudur: 'Servet Sakar', mebbis: 'Merkez kurum hesabı' }, { id: 's2', ad: 'Tepebaşı şubesi', semt: 'Tepebaşı', kurumKodu: '971208', mudur: 'Tuncay Yalım', mebbis: 'Tepebaşı kurum hesabı' }];
  const SUBE_EG = { e1: 's1', e2: 's1', e5: 's1', e3: 's2', e4: 's2' };
  egitmenler.forEach(x => { x.sube = SUBE_EG[x.id] || 's1'; });
  araclar.forEach(a => { a.sube = SUBE_EG[a.egitmen] || 's1'; });
  kursiyerler.forEach(k => { k.sube = SUBE_EG[k.egitmen] || 's1'; });
  hareket.forEach((h, i) => { const k = h.kursiyer && kursiyerler.find(x => x.id === h.kursiyer); h.sube = k ? k.sube : (i % 4 === 0 ? 's2' : 's1'); });
  personel.forEach(p => { p.sube = p.id === 'p3' ? 's2' : 's1'; });
  // Ders kanıtı: başlangıç-bitiş saati ve konum onayı (usta öğretici ekranından)
  dersler.filter(d => d.durum === 'Yapıldı').forEach((d, i) => { const [h, m] = d.saat.split(':').map(Number), bas = h * 60 + m + (i % 5), sure = i % 37 === 0 ? 34 : 48 + (i % 6); const f = x => String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); d.bas = f(bas); d.bit = f(bas + sure); d.sure = sure; d.konum = true; });
  // Otomatik kart çekimi onayı veren kursiyerler
  kursiyerler.forEach((k, i) => { if (i % 3 === 0 && k.odeme.taksitler.some(t => !t.odendi) && !k.odeme.taksitler.some(t => !t.odendi && fark(t.vade) < 0)) k.odeme.otomatik = { son4: String(1000 + (i * 739) % 9000).slice(0, 4), onay: k.kayit }; });
  // Evrak geçerlilik tarihleri (belgenin üzerindeki tarih)
  kursiyerler.forEach((k, i) => { if (k.dogrulama && k.dogrulama.saglik) k.dogrulama.saglik.gecerlilik = gun(i % 11 === 0 ? 20 : 200 + i * 3); });
  kursiyerler.forEach((k, i) => { if (!k.deneme.length) return; const n = k.deneme.length, ort = k.deneme.reduce((a, b) => a + b, 0) / n / 100, zayif = ['trafik', 'ilkyardim', 'motor', 'adab'][i % 4]; k.konuAnaliz = Object.fromEntries([['trafik', 23], ['ilkyardim', 12], ['motor', 9], ['adab', 6]].map(([kn, q]) => { const t = q * n, o = Math.min(0.98, Math.max(0.3, ort + (kn === zayif ? -0.18 : 0.05))); return [kn, [Math.round(t * o), t]]; })); });
  kursiyerler.forEach((k, i) => { if (i % 5 === 1) return; k.dogrulama = {}; ['saglik', 'adli'].forEach(x => { if (k.evrak[x]) k.dogrulama[x] = { kod: x === 'adli' ? 'A' + (480000 + i * 37) : 'R-' + (2026000 + i * 11), kim: 'Selda Korkmaz', tarih: k.kayit }; }); });

  const guvenlik = {
    ikiAdim: { mudur: true, sekreter: true, usta: false }, oturumDk: 60, ipKisit: false, hassasOnay: true,
    oturumlar: [
      { kim: 'Servet Sakar', cihaz: 'Chrome · Mac', yer: 'Eskişehir', son: 'Şimdi', bu: true },
      { kim: 'Servet Sakar', cihaz: 'Safari · iPhone', yer: 'Eskişehir', son: '2 saat önce' },
      { kim: 'Selda Korkmaz', cihaz: 'Chrome · Windows', yer: 'Eskişehir', son: '14 dk önce' },
      { kim: 'Hüseyin Aktaş', cihaz: 'Chrome · Android', yer: 'Eskişehir', son: 'Dün 17:40' },
    ],
  };
  const entegrasyon = {
    earsiv: { bagli: true, ad: 'e-Arşiv entegratörü', not: 'Tahsilatta fatura otomatik kesilir' },
    muhasebe: { tur: 'Excel', bagli: false },
    musavir: { eposta: '', otomatik: false },
    pos: { bagli: true, ad: 'Sanal POS', komisyon: 2.49 },
    kdv: 20, fatura: 'tahsilat',
  };

  return {
    sosyal, subeler, guvenlik, entegrasyon, isDurum: {},
    personel, izinler, bekleme, hesaplar, kazanim, gruplar, arsiv, mevzuat, ogretmenler, kullanicilar, islemler, asistanBilgi, devredilen, sms: { bakiye: 1840, kanal: 'WhatsApp' }, gunSonu: [],
    kurs: { ad: 'Sinyal Sürücü Kursu', sehir: 'Eskişehir', tel: '0222 000 00 00', adres: 'Odunpazarı / Eskişehir', yetkili: 'Servet Sakar', puan: 4.9, yorumSayisi: 286, imzaYontemi: 'ikili', kuralKontrol: gun(-13), web: 'sinyalsurucukursu.com', aksamOzet: true, gunlukDersSiniri: 2, egitmenGunlukSinir: 8, ekDersUcreti: 900, devamsizlikSiniri: 4, programOnGun: 5, sinavBildirimIsGunu: 4, geceDersi: 2, tekrarBekleme: 15, asgariYas: 18, saklamaYil: 10, sinavHak: 4, tekrarUcret: { esinav: 1250, dsinav: 2000 }, borcluDers: 'uyar', indirimler: [{ ad: 'Öğrenci belgesi', tutar: 1000 }] },
    egitmenler, araclar, kursiyerler, dersler, teorik, sinavlar, hareket, adaylar, otomasyonlar, duyurular,
    gonderimler: [],
  };
}

export let S = yukle();
function yukle() {
  let o = null;
  try { const v = localStorage.getItem(ANAHTAR); if (v) { const x = JSON.parse(v); if (x && x._gun === iso(BUGUN)) o = x; } } catch (e) { }
  if (!o) { o = uret(); o._gun = iso(BUGUN); }
  return goc(o);
}
// Eski kayıtları güncel yapıya taşır; gerçek bağlantısı olmayan entegrasyonları "bağlı değil" yapar
function goc(o) {
  o.kurs.siniflar = o.kurs.siniflar || {};
  Object.keys(SINIFLAR).forEach(k => { SINIFLAR[k] = { ...SINIF_VARSAYILAN[k], ...(o.kurs.siniflar[k] || {}) }; });
  Object.keys(o.kurs.siniflar).forEach(k => { if (!SINIFLAR[k]) SINIFLAR[k] = o.kurs.siniflar[k]; });
  (o.hareket || []).forEach(h => { if (h.yontem === 'Havale/EFT') h.yontem = 'Havale'; });
  (o.kursiyerler || []).forEach(k => { k.odeme.taksitler.forEach(t => { if (t.yontem === 'Havale/EFT') t.yontem = 'Havale'; }); });
  // kalıcı makbuz numaraları (yıl içinde sıralı)
  o.sayac = o.sayac || {};
  const gelir = (o.hareket || []).filter(h => h.tur === 'Gelir').sort((a, b) => (a.tarih + a.id).localeCompare(b.tarih + b.id));
  gelir.forEach(h => { if (!h.no) { const yil = h.tarih.slice(0, 4); o.sayac['m' + yil] = (o.sayac['m' + yil] || 0) + 1; h.no = 'M' + yil + '-' + String(o.sayac['m' + yil]).padStart(5, '0'); } });
  // gerçek entegrasyon kurulana kadar bağlı görünmez
  if (o.entegrasyon && !o.entegrasyon.gercek) { o.entegrasyon.earsiv.bagli = false; o.entegrasyon.pos.bagli = false; o.entegrasyon.muhasebe.bagli = false; o.entegrasyon.muhasebe.tur = 'Excel'; }
  if (o.mebArac && !o.mebArac.gercek) o.mebArac = null;
  if (o.kurs.mebYontem === 'arac' && !o.mebArac) o.kurs.mebYontem = 'sirali';
  if (o.sosyal) o.sosyal.kanallar.forEach(c => { if (!c.gercek) { c.bagli = c.id === 'wp' ? !!o.kurs.waApi : false; c.cevap = c.bagli && c.cevap; } });
  if (o.kazanim && !o.kazanim.gercek) o.kazanim = { gercek: true, doldurulan: 0, ekDers: 0, yorum: 0 };
  // geçmiş derslerin beceri puanları (usta öğretici ders bitiminde 1–5 verir); eski kayıtlara kursiyerin seyrine göre doldurulur
  const hs = x => { let h = 7; for (const c of String(x)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const kz = {}; (o.kursiyerler || []).forEach(k => { kz[k.id] = k; });
  (o.dersler || []).forEach(d => { if (d.durum !== 'Yapıldı' || d.beceri !== undefined) return; const k = kz[d.kursiyer]; if (!k) return; const taban = [2.7, 3.5, 3.9, 4.2, 4.0, 3.8, 4.4][hs(k.id) % 7]; d.beceri = Object.fromEntries(BECERI.map(([b], i) => [b, Math.max(1, Math.min(5, Math.round(taban + ((hs(d.id + b) % 5) - 2) * 0.3 + (i === hs(k.id) % 5 ? -0.9 : 0))))])); });
  o.kurs.maliyet = o.kurs.maliyet || { yakit: 46, tuketim: 6.5, km: 22, bakim: 55, pay: 55 };
  if (o.kurs.kendiRandevu === undefined) o.kurs.kendiRandevu = true;
  return o;
}
// Yeni tahsilata kalıcı makbuz numarası
export function makbuzNoVer(h) { if (h.no || h.tur !== 'Gelir') return h.no; const yil = h.tarih.slice(0, 4); S.sayac = S.sayac || {}; S.sayac['m' + yil] = (S.sayac['m' + yil] || 0) + 1; h.no = 'M' + yil + '-' + String(S.sayac['m' + yil]).padStart(5, '0'); return h.no; }
// Sınıf ayarlarını kalıcı yaz
export function sinifKaydet(k, alan) { Object.assign(SINIFLAR[k], alan); S.kurs.siniflar[k] = { ...(S.kurs.siniflar[k] || {}), ...alan }; }
function subeTamamla() {
  if (!S.subeler) return;
  const v = gorunum.sube || 's1';
  S.kursiyerler.forEach(k => { if (!k.sube) { const e = S.egitmenler.find(x => x.id === k.egitmen); k.sube = gorunum.sube || (e && e.sube) || v; } });
  S.hareket.forEach(h => { if (!h.kim && h.id.length > 12 && oturum.kullanici) h.kim = oturum.kullanici.ad; if (!h.sube) { const k = h.kursiyer && S.kursiyerler.find(x => x.id === h.kursiyer); h.sube = (k && k.sube) || v; } });
  S.araclar.forEach(a => { if (!a.sube) a.sube = v; });
  S.egitmenler.forEach(x => { if (!x.sube) x.sube = v; });
}
export function kaydet() { subeTamamla(); (S.hareket || []).forEach(h => { if (h.tur === 'Gelir' && !h.no) makbuzNoVer(h); }); try { localStorage.setItem(ANAHTAR, JSON.stringify(S)); } catch (e) { } }
export function sifirla() { try { localStorage.removeItem(ANAHTAR); } catch (e) { } S = goc(uret()); S._gun = iso(BUGUN); kaydet(); }

// Kursiyer sözleşmesinin varsayılan maddeleri. {süslü} alanlar kurs ayarlarından dolar; kurs Ayarlar › Sözleşme metni'nden değiştirir.
export const SOZLESME_VARSAYILAN = [
  'Konu. Bu sözleşme, kursiyerin {sinif} sertifika sınıfı için Motorlu Taşıt Sürücüleri Kursu Yönetmeliği’ne göre {kurs} tarafından verilecek eğitime ilişkindir.',
  'Eğitim. Kurs {teorik} saat teorik ders ve {direksiyon} ders saati direksiyon eğitimi verir. Ders programı kursiyere yazılı ya da elektronik olarak bildirilir.',
  'Ücret ve ödeme. Kurs ücreti ve ödeme planı yukarıdaki tablodadır. MEB e-sınav ücreti oturum başına {tekrarE} olup kurs ücretine dahil değildir. Vadesinde ödenmeyen taksit için kursiyere hatırlatma yapılır.',
  'Devam. Kursiyer derslere zamanında katılır. Gelemeyeceği direksiyon dersini en az bir gün önce bildirir. Bildirmeden gelinmeyen dersin yerine konan ders için {ekDers} ek ders ücreti alınır.',
  'Sınavlar. Kursiyerin her sınav için {hak} hakkı vardır. Direksiyon sınavının tekrarında {tekrarD} alınır. Haklarını dolduran kursiyer yeni dönem kaydı yaptırır.',
  'Ek ders. Zorunlu dersler dışında kursiyerin isteğiyle verilen her direksiyon dersinin ücreti {ekDers}’dir.',
  'Fesih ve iade. Kursiyer eğitim başlamadan kaydını iptal ederse ödediği ücret, iadesi mümkün olmayan resmî bedeller düşülerek iade edilir. Eğitim başladıktan sonra ayrılırsa verilen ders saatleri oranında ücret hesaplanır, fazlası iade edilir.',
  'Kişisel veriler. Kursiyere 6698 sayılı Kanun kapsamındaki aydınlatma metni verilmiştir; sağlık raporu ve adli sicil bilgileri yalnızca MEB kaydı için işlenir.',
  'Uyuşmazlık. Bu sözleşmeden doğan uyuşmazlıklarda 6502 sayılı Kanun kapsamında tüketici hakem heyetleri ve tüketici mahkemeleri yetkilidir.',
];
// --- türetilmiş bilgiler ---
export const kursiyer = id => S.kursiyerler.find(k => k.id === id);
// Ekipten çıkarılan usta ve araçlar geçmiş derslerde görünmeye devam eder
export const egitmen = id => S.egitmenler.find(e => e.id === id) || ((S.cikanlar || {}).egitmen || []).find(e => e.id === id);
export const arac = id => S.araclar.find(a => a.id === id) || ((S.cikanlar || {}).arac || []).find(a => a.id === id);
export function arsivle(tur, x) { S.cikanlar = S.cikanlar || { egitmen: [], arac: [] }; S.cikanlar[tur].push({ ...x, cikis: gun(0) }); }
export const tamAd = k => k.ad + ' ' + k.soyad;
// Direksiyon aracı: önce ustanın kursiyerin sınıfındaki aracı, o saatte doluysa aynı sınıftaki boş araç.
export const ustaAraci = (egId, sinif) => S.araclar.find(a => a.egitmen === egId && a.sinif === sinif);
export function dersAraci(egId, sinif, t, saat, haric) {
  const bos = a => !S.dersler.some(d => d !== haric && d.arac === a.id && d.tarih === t && d.saat === saat);
  const o = ustaAraci(egId, sinif); if (o && bos(o)) return o;
  return S.araclar.filter(a => a.sinif === sinif && a !== o).find(bos) || null;
}
export const ekToplam = k => (k.odeme.ekler || []).reduce((a, x) => a + x.tutar, 0);
export const odenen = k => k.odeme.pesin + k.odeme.taksitler.reduce((a, t) => a + (t.odendi ? t.tutar : (t.kismi || 0)), 0) + (k.odeme.ekler || []).filter(x => x.odendi).reduce((a, x) => a + x.tutar, 0) - (k.odeme.iade || 0);
export const kalanBorc = k => Math.max(0, k.odeme.toplam + ekToplam(k) - odenen(k));
export const gecikenler = k => k.odeme.taksitler.filter(t => !t.odendi && !t.iptal && fark(t.vade) < 0);
export const gecikenTutar = k => gecikenler(k).reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
export const eksikEvrak = k => EVRAKLAR.filter(([key]) => !k.evrak[key]);
export const asamaNo = k => ASAMALAR.indexOf(k.asama);
export function sonrakiDers(k) { return S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı' && fark(d.tarih) >= 0).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))[0]; }
export function gonderimEkle(kime, metin, tur) { S.gonderimler.unshift({ zaman: new Date().toISOString(), kime, metin, tur }); kaydet(); }

// Sınav riski (0–100): usta öğreticinin ders sonu beceri puanları, deneme sınavları, devamsızlık, kısa dersler, önceki kalma.
const ortala = l => l.length ? l.reduce((a, x) => a + x, 0) / l.length : null;
export function beceriOzet(k, n = 3) {
  const l = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && d.beceri).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat)).slice(0, n);
  if (!l.length) return null;
  const b = Object.fromEntries(BECERI.map(([x]) => [x, ortala(l.map(d => d.beceri[x]).filter(v => v != null))]));
  return { ders: l.length, beceri: b, ort: ortala(Object.values(b).filter(v => v != null)), zayif: BECERI.filter(([x]) => b[x] != null && b[x] < 3).map(([, ad]) => ad) };
}
export function risk(k) {
  if (!['Teorik', 'Direksiyon', 'Sınav'].includes(k.asama) || k.kapali) return null;
  const n = [], direksiyon = k.asama !== 'Teorik', son3 = (k.deneme || []).slice(-3), ort = son3.length ? Math.round(ortala(son3)) : null;
  let p = 0;
  if (!direksiyon) {
    if (ort == null) { p += 20; n.push('Hiç deneme sınavına girmedi'); }
    else if (ort < 70) { p += (70 - ort) * 1.6 + 10; n.push(`Son denemelerin ortalaması ${ort} (geçme 70)`); }
    const dev = S.teorik.filter(t => t.grup === k.teorikGrup && t.yoklama && t.tarih >= k.kayit && !t.yoklama.includes(k.id)).length;
    if (dev >= 4) { p += 15; n.push(dev + ' teorik derse gelmedi'); }
    if (k.esinav && k.esinav.sonuc === 'Kaldı') { p += 15; n.push('e-Sınavdan bir kez kaldı'); }
  } else {
    const b = beceriOzet(k);
    if (!b) { p += 10; n.push('Henüz beceri puanı girilmedi'); }
    else {
      if (b.ort < 3.4) { p += b.ort < 2.8 ? 45 : 25; n.push(`Son ${b.ders} dersin beceri ortalaması ${b.ort.toFixed(1).replace('.', ',')}/5`); }
      if (b.zayif.length) { p += Math.min(20, b.zayif.length * 8); n.push('Zayıf: ' + b.zayif.join(', ').toLocaleLowerCase('tr')); }
    }
    const gel = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Gelmedi').length;
    if (gel) { p += Math.min(24, gel * 8); n.push(gel + ' derse gelmedi'); }
    const kisa = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && d.sure != null && d.sure < 40).length;
    if (kisa >= 2) { p += 8; n.push(kisa + ' ders 40 dakikadan kısa'); }
    if (k.dsinav && k.dsinav.sonuc === 'Kaldı') { p += 20; n.push('Direksiyon sınavından kaldı'); }
    const sonDers = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').map(d => d.tarih).sort().pop();
    if (sonDers && fark(sonDers) < -14) { p += 10; n.push(-fark(sonDers) + ' gündür direksiyona çıkmadı'); }
  }
  if ((k.notlar || []).some(x => /zorlan|unut|panik|gergin/i.test(x.metin))) { p += 12; n.push('Usta öğretici notu'); }
  const puan = Math.min(100, Math.round(p));
  return { puan, ort, nedenler: n, seviye: puan >= 50 ? 'Yüksek' : puan >= 25 ? 'Orta' : 'Düşük', tur: direksiyon ? 'Direksiyon sınavı' : 'e-Sınav', beceri: direksiyon ? beceriOzet(k) : null, oneri: direksiyon ? (puan >= 50 ? 4 : puan >= 25 ? 2 : 0) : 0 };
}

export const ogretmen = id => (S.ogretmenler || []).find(o => o.id === id);
export const tcMaskele = tc => tc ? tc.slice(0, 3) + '*****' + tc.slice(-3) : '—';
export function tcGecerli(tc) {
  if (!/^[1-9]\d{10}$/.test(tc)) return false;
  const d = tc.split('').map(Number);
  const on = (((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10 + 10) % 10;
  return on === d[9] && d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}
// oturum ve işlem geçmişi
export const oturum = { kullanici: null };
try { const o = sessionStorage.getItem('sinyal-oturum'); if (o) oturum.kullanici = JSON.parse(o); } catch (x) { }
export const yerelZaman = () => { const d = new Date(); return iso(d) + 'T' + d.toTimeString().slice(0, 5); };
export function islem(ne, ayrinti = '') { S.islemler.unshift({ zaman: yerelZaman(), kim: oturum.kullanici ? oturum.kullanici.ad : 'Sistem', ne, ayrinti }); }
// geri alma: son değişiklikten önceki durumun anlık görüntüsü
let anlik = null;
export function geriAlNoktasi() { anlik = JSON.stringify(S); }
export function geriAl() { if (!anlik) return false; S = JSON.parse(anlik); anlik = null; kaydet(); return true; }

export function yas(dt) { if (!dt) return null; const d = tarihOku(dt); let y = BUGUN.getFullYear() - d.getFullYear(); if (BUGUN.getMonth() < d.getMonth() || (BUGUN.getMonth() === d.getMonth() && BUGUN.getDate() < d.getDate())) y--; return y; }
// MEBBİS'e girmeden önce kayıt kontrolü: [tamam, metin]
export function mebOnKontrol(k) {
  const l = [];
  l.push([tcGecerli(k.tc || ''), 'TC kimlik numarası geçerli biçimde']);
  l.push([!S.kursiyerler.some(x => x !== k && x.id !== k.id && x.tc && x.tc === k.tc && x.sinif === k.sinif && x.asama !== 'Ehliyet'), 'Aynı TC ile aynı sınıfa açık kayıt yok']);
  const y = yas(k.dogumTarihi);
  l.push([!!k.dogumTarihi, 'Doğum tarihi girildi']);
  const asg = (SINIFLAR[k.sinif] && SINIFLAR[k.sinif].yas) || S.kurs.asgariYas;
  l.push([y == null || y >= asg, `Yaş ${y == null ? '?' : y} · en az ${asg}`]);
  const g = (S.gruplar || []).find(x => x.id === k.teorikGrup);
  l.push([!g || !['Kayıt', 'Evrak'].includes(k.asama) || k.kayit <= g.baslangic, g ? `Kayıt grubun başlangıcından önce (${g.ad} ${g.baslangic.split('-').reverse().join('.')})` : 'Grup seçildi']);
  EVRAKLAR.filter(([x]) => x !== 'sozlesme').forEach(([x, t]) => l.push([!!k.evrak[x], t]));
  l.push([!!k.cinsiyet, 'Cinsiyet seçildi']);
  l.push([!!(k.saglikRapor && k.saglikRapor.no && k.saglikRapor.tarih), 'Sağlık raporu numarası ve tarihi girildi']);
  l.push([!!(k.adliSicil && k.adliSicil.barkod), 'Adli sicil barkodu girildi']);
  l.push([!!(k.kvkk && k.kvkk.riza), 'KVKK aydınlatma ve açık rıza alındı']);
  return l;
}

// --- Şube görünümü: boş = tüm şubeler. Yeni kayıtlar seçili şubeye (yoksa Merkez'e) yazılır.
export const gorunum = { sube: (() => { try { return sessionStorage.getItem('sinyal-sube') || ''; } catch (x) { return ''; } })() };
export function subeSec(id) { gorunum.sube = id; try { sessionStorage.setItem('sinyal-sube', id); } catch (x) { } }
export const subede = x => !gorunum.sube || !x || !x.sube || x.sube === gorunum.sube;
export const sb = l => (gorunum.sube ? l.filter(subede) : l);
export const sbDers = l => (gorunum.sube ? l.filter(d => subede(S.kursiyerler.find(k => k.id === d.kursiyer))) : l);
export const varsayilanSube = () => gorunum.sube || 's1';
export const sbSinav = l => (gorunum.sube ? l.filter(s => (s.kursiyerler || []).some(id => subede(S.kursiyerler.find(k => k.id === id)))) : l);
export const seciliSube = () => (S.subeler || []).find(x => x.id === gorunum.sube) || null;
export const cokSube = () => (S.subeler || []).length > 1;
