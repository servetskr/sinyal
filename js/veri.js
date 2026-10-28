// Sinyal demo verisi: tarihler bugüne göre üretilir, tarayıcıda saklanır.
const ANAHTAR = 'sinyal-demo-v13';

export const BUGUN = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
export const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const gun = n => { const d = new Date(BUGUN); d.setDate(d.getDate() + n); return iso(d); };
export const tarihOku = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fark = s => Math.round((tarihOku(s) - BUGUN) / 864e5);

export const SINIFLAR = {
  'B': { ad: 'B · Manuel', ucret: 24000, teorik: 34, direksiyon: 14 },
  'B-O': { ad: 'B · Otomatik', ucret: 26500, teorik: 34, direksiyon: 14 },
  'A2': { ad: 'A2 · Motosiklet', ucret: 18500, teorik: 34, direksiyon: 14 },
  'C': { ad: 'C · Kamyon', ucret: 31000, teorik: 34, direksiyon: 20 },
};
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
    { id: 'e1', ad: 'Hüseyin Aktaş', tel: '0532 418 22 61', siniflar: ['B', 'B-O'], renk: '#2f6fde', baslama: '2014', maas: 34000, prim: 160, belgeler: { sertifika: gun(820), saglik: gun(140), adli: gun(400) } },
    { id: 'e2', ad: 'Sevgi Uysal', tel: '0541 776 30 18', siniflar: ['B', 'B-O'], renk: '#c2410c', baslama: '2017', maas: 32000, prim: 160, belgeler: { sertifika: gun(1200), saglik: gun(18), adli: gun(300) } },
    { id: 'e3', ad: 'Murat Er', tel: '0505 233 91 47', siniflar: ['B', 'C'], renk: '#0f8a5f', baslama: '2011', maas: 36000, prim: 180, belgeler: { sertifika: gun(640), saglik: gun(220), adli: gun(9) } },
    { id: 'e4', ad: 'Gökhan Tunç', tel: '0553 902 14 85', siniflar: ['A2', 'B'], renk: '#7c3aed', baslama: '2019', maas: 30000, prim: 150, belgeler: { sertifika: gun(25), saglik: gun(310), adli: gun(510) } },
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
  for (let n = -14; n <= 10; n++) {
    const d = tarihOku(gun(n));
    if (d.getDay() === 0) continue;
    egitmenler.forEach(e => {
      const arac = araclar.find(a => a.egitmen === e.id);
      saatler.forEach(s => {
        if (r() < (n < 0 ? 0.62 : n < 4 ? 0.55 : 0.32)) {
          let adaylar = aktif.filter(k => k.egitmen === e.id);
          if (adaylar.length < 3) adaylar = adaylar.concat(aktif.filter(k => e.siniflar.includes(k.sinif)));
          adaylar = adaylar.filter(k => (gunSay[k.id + n] || 0) < 2 && !dersler.some(d => d.kursiyer === k.id && d.tarih === gun(n) && d.saat === s));
          if (!adaylar.length) return;
          const k = sec(adaylar);
          gunSay[k.id + n] = (gunSay[k.id + n] || 0) + 1;
          dersler.push({ id: 'd' + did++, kursiyer: k.id, egitmen: e.id, arac: arac ? arac.id : null, tarih: gun(n), saat: s, eklendi: gun(Math.min(n, 0) - ara(6, 12) + (n > 0 && r() < 0.12 ? ara(4, 8) : 0)), meb: n < 3 ? true : r() < 0.7, durum: (n < 0 || (n === 0 && +s.slice(0, 2) < SAAT_SIMDI)) ? (r() < 0.965 ? 'Yapıldı' : 'Gelmedi') : 'Planlandı' });
          const sd = dersler[dersler.length - 1]; if (sd.durum === 'Yapıldı' && r() < 0.86) sd.imza = { zaman: sd.tarih + 'T' + sd.saat, kursiyer: null, usta: null };
        }
      });
    });
  }

  // teorik dersler (sınıf programı)
  const KONULAR = ['Trafik ve çevre bilgisi', 'İlk yardım bilgisi', 'Araç tekniği bilgisi', 'Trafik adabı'];
  const teorik = [];
  let tid = 1;
  for (let n = -10; n <= 7; n++) {
    const d = tarihOku(gun(n)); const g = d.getDay();
    if (g === 0 || g === 6) continue;
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
  sinavlar.push({ id: 's3', tur: 'Direksiyon', mebBildirim: false, tarih: gun(3), saat: '08:30', yer: 'Sınav güzergâhı · Organize Sanayi', kursiyerler: sin.slice(0, 8).map(k => k.id), sonuc: {} });
  sinavlar.push({ id: 's4', tur: 'e-Sınav', tarih: gun(6), saat: '14:00', yer: 'Tepebaşı e-Sınav Merkezi', kursiyerler: kursiyerler.filter(k => k.asama === 'Teorik' && k.teorik >= 30).slice(0, 1).map(k => k.id), sonuc: {} });
  sinavlar.push({ id: 's5', tur: 'Direksiyon', mebBildirim: false, tarih: gun(10), saat: '08:30', yer: 'Sınav güzergâhı · Organize Sanayi', kursiyerler: sin.slice(8).concat(kal).map(k => k.id), sonuc: {} });
  sin.slice(0, 8).forEach(k => k.dsinavPlan = gun(3));

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

  // adaylar (ön kayıt)
  const adaylar = [
    { ad: 'Deniz Akın', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B-O', asama: 'Yeni', saat: '08:12', gun: 0, m: [['aday', 'Merhaba, otomatik vites ehliyet için fiyat öğrenebilir miyim?'], ['asistan', 'Merhaba Deniz Bey, B otomatik sınıfı kurs ücretimiz 26.500 TL. Peşinatın ardından 5 aya kadar taksit yapıyoruz. Ne zaman başlamayı düşünüyorsunuz?']] },
    { ad: 'Sena Uğur', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'B', asama: 'Bilgi verildi', saat: '23:41', gun: -1, m: [['aday', 'Kaç günde ehliyet alınıyor?'], ['asistan', 'Teorik dersler yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi geliyor. Ortalama 2–3 ayda ehliyetinizi alıyorsunuz.'], ['aday', 'Taksit var mı?'], ['asistan', 'Evet, peşinat sonrası 5 aya kadar taksit yapıyoruz. Size uygun bir saat için kayıt görüşmesi ayarlayalım mı?']] },
    { ad: 'Yiğit Sarı', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'A2', asama: 'Görüşme', saat: '14:05', gun: -1, takip: gun(1), m: [['aday', 'Motor ehliyeti için hangi belgeler lazım?'], ['asistan', 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf ve kimlik yeterli. Raporu aile hekiminizden alabilirsiniz.'], ['aday', 'Cuma gelip kaydolabilir miyim?'], ['asistan', 'Cuma 11:00 için görüşmenizi oluşturdum. Görüşmek üzere!']] },
    { ad: 'Aslı Kara', kaynak: 'Tavsiye', kanal: 'WhatsApp', sinif: 'B', asama: 'Bilgi verildi', saat: '19:20', gun: -2, takip: gun(0), m: [['aday', 'Kuzenim sizde aldı, ben de kaydolmak istiyorum. Hafta sonu ders var mı?'], ['asistan', 'Hoş geldiniz! Cumartesi direksiyon derslerimiz var. Teorik dersler hafta içi akşam 18:30’da.']] },
    { ad: 'Ozan Demirci', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'C', asama: 'Yeni', saat: '07:55', gun: 0, m: [['aday', 'B ehliyetim var, C ye geçiş ne kadar?']] },
    { ad: 'Melike Tan', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'B-O', asama: 'Kayıt', saat: '11:30', gun: -3, m: [['aday', 'Yarın kayda geleceğim, evrakları getireyim mi?'], ['asistan', 'Evet, sağlık raporu ve öğrenim belgesi yeterli; fotoğrafı kursta çekiyoruz.']] },
    { ad: 'Barış Yalçın', kaynak: 'Web sitesi', kanal: 'WhatsApp', sinif: 'B', asama: 'Kaybedildi', saat: '16:44', gun: -6, not: 'Fiyatı yüksek buldu', m: [['aday', 'Başka yerde 21 bin dediler.'], ['asistan', 'Anlıyorum. Fiyatımıza sınav günü araç ve ek tekrar dersi dahil. Karar verirseniz buradayız.']] },
    { ad: 'Gizem Önal', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Görüşme', saat: '10:18', gun: -1, takip: gun(2), m: [['aday', 'Öğrenciyim, indirim oluyor mu?'], ['asistan', 'Öğrenci belgesiyle kayıtta 1.000 TL indirim uyguluyoruz.']] },
    { ad: 'Kadir Bayram', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Yeni', saat: '09:47', gun: 0, m: [['aday', 'Sınavda kalırsam tekrar ücret ödüyor muyum?']] },
    { ad: 'Ebru Çınar', kaynak: 'Tavsiye', kanal: 'WhatsApp', sinif: 'B-O', asama: 'Bilgi verildi', saat: '21:03', gun: -4, takip: gun(-1), m: [['aday', 'Annem için soruyorum, 52 yaşında, zor olur mu?'], ['asistan', 'Hiç zor değil; otomatik vitesle başlayan pek çok kursiyerimiz var. Eğitmenimiz Nurcan Hanım çok sabırlıdır.']] },
    { ad: 'Tunahan Ersoy', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'A2', asama: 'Kayıt', saat: '13:15', gun: -5, m: [['aday', 'Kaydoldum teşekkürler']] },
    { ad: 'Pınar Gök', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Kaybedildi', saat: '12:00', gun: -8, not: 'Cevap vermedi', m: [['aday', 'Fiyat?'], ['asistan', 'B manuel 24.000 TL, taksit imkânı var.']] },
  ].map((a, i) => ({ id: 'l' + (i + 1), ad: a.ad, tel: tel(), kaynak: a.kaynak, kanal: a.kanal, sinif: a.sinif, asama: a.asama, tarih: gun(a.gun), saat: a.saat, takip: a.takip || null, not: a.not || '', mesajlar: a.m.map(([kim, metin]) => ({ kim, metin })) }));

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
    { id: 'p1', ad: 'Kurs Müdürü', gorev: 'Kurs müdürü', maas: 52000, tel: '0532 000 00 01' },
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
  kursiyerler.forEach(k => { k.odeme.ekler = []; if (k.esinav) k.odeme.ekler.push({ ad: 'e-Sınav ücreti', tutar: 1250, odendi: k.kayit }); if (k.dsinav && k.dsinav.hak > 1) k.odeme.ekler.push({ ad: 'Direksiyon sınavı tekrar ücreti', tutar: 2000, odendi: null }); if (k.dsinav && k.dsinav.sonuc === 'Kaldı') k.odeme.ekler.push({ ad: 'Sınav tekrar ücreti', tutar: 2000, odendi: null }); });
  const ogretmenler = [
    { id: 'o1', ad: 'Ayten Duman', brans: 'Trafik ve çevre', tel: '0532 771 40 12' },
    { id: 'o2', ad: 'Dr. Serkan Ak', brans: 'İlk yardım', tel: '0505 318 62 90' },
    { id: 'o3', ad: 'Levent Oral', brans: 'Araç tekniği', tel: '0542 905 13 77' },
  ];
  const kullanicilar = [
    { id: 'u1', ad: 'Kurs Müdürü', rol: 'mudur', pin: '1111' },
    { id: 'u2', ad: 'Selda Korkmaz', rol: 'sekreter', pin: '2222' },
    { id: 'u3', ad: 'Hüseyin Aktaş', rol: 'usta', usta: 'e1', pin: '3333' },
  ];
  const islemler = [
    { zaman: gun(-1) + 'T17:42', kim: 'Selda Korkmaz', ne: 'Tahsilat aldı', ayrinti: 'Ayşe Yıldız · 2. taksit · 6.500 ₺' },
    { zaman: gun(-1) + 'T11:05', kim: 'Kurs Müdürü', ne: 'Ücret değiştirdi', ayrinti: 'B · Otomatik 26.000 ₺ → 26.500 ₺' },
    { zaman: gun(-2) + 'T09:30', kim: 'Hüseyin Aktaş', ne: 'Ders yapıldı işaretledi', ayrinti: 'Elif Erdem · 12. ders' },
  ];
  const asistanBilgi = [
    { konu: 'Fiyat ve taksit', metin: 'B manuel 24.000 TL, B otomatik 26.500 TL, A2 18.500 TL, C 31.000 TL. Peşinat sonrası 5 aya kadar taksit. Öğrenci belgesiyle 1.000 TL indirim.', onay: gun(-3) },
    { konu: 'Evraklar', metin: 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf, kimlik. Fotoğrafı kursta çekiyoruz.', onay: gun(-12) },
    { konu: 'Ders saatleri', metin: 'Teorik dersler hafta içi 18:30 ve Salı-Perşembe 10:00. Direksiyon Pazartesi–Cumartesi 09:00–18:00.', onay: gun(-12) },
    { konu: 'Süre', metin: 'Teorik yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi; ortalama 2–3 ay.', onay: gun(-12) },
    { konu: 'Sınav ücretleri', metin: 'e-Sınav ücreti oturum başına 1.250 TL (MEB 2026 kılavuzu). Tekrar sınav ücretini kurs bildirir.', onay: gun(-5) },
  ];
  const devredilen = [
    { ad: 'Halil Yurt', kanal: 'WhatsApp', konu: 'İndirim pazarlığı', mesaj: 'Üç kardeş kaydolursak ne kadar indirim olur?', neden: 'Kurs bilgisinde toplu indirim yok', saat: '10:12' },
    { ad: 'Seda Bal', kanal: 'Instagram', konu: 'Özel durum', mesaj: 'Sol ayağımda protez var, otomatik araçla ehliyet alabilir miyim?', neden: 'Sağlık durumu: insana devredildi', saat: '09:40' },
  ];

  return {
    personel, izinler, bekleme, hesaplar, kazanim, gruplar, arsiv, mevzuat, ogretmenler, kullanicilar, islemler, asistanBilgi, devredilen, sms: { bakiye: 1840, kanal: 'WhatsApp' }, gunSonu: [],
    kurs: { ad: 'Örnek Sürücü Kursu', sehir: 'Eskişehir', tel: '0222 000 00 00', adres: 'Odunpazarı / Eskişehir', yetkili: 'Kurs Müdürü', puan: 4.9, yorumSayisi: 286, gunlukDersSiniri: 2, egitmenGunlukSinir: 8, ekDersUcreti: 900, devamsizlikSiniri: 4, programOnGun: 5, sinavBildirimIsGunu: 4, geceDersi: 2, tekrarBekleme: 15, asgariYas: 18, saklamaYil: 10 },
    egitmenler, araclar, kursiyerler, dersler, teorik, sinavlar, hareket, adaylar, otomasyonlar, duyurular,
    gonderimler: [],
  };
}

export let S = yukle();
function yukle() {
  try { const v = localStorage.getItem(ANAHTAR); if (v) { const o = JSON.parse(v); if (o && o._gun === iso(BUGUN)) return o; } } catch (e) { }
  const o = uret(); o._gun = iso(BUGUN); return o;
}
export function kaydet() { try { localStorage.setItem(ANAHTAR, JSON.stringify(S)); } catch (e) { } }
export function sifirla() { try { localStorage.removeItem(ANAHTAR); } catch (e) { } S = uret(); S._gun = iso(BUGUN); kaydet(); }

// --- türetilmiş bilgiler ---
export const kursiyer = id => S.kursiyerler.find(k => k.id === id);
export const egitmen = id => S.egitmenler.find(e => e.id === id);
export const arac = id => S.araclar.find(a => a.id === id);
export const tamAd = k => k.ad + ' ' + k.soyad;
export const ekToplam = k => (k.odeme.ekler || []).reduce((a, x) => a + x.tutar, 0);
export const odenen = k => k.odeme.pesin + k.odeme.taksitler.reduce((a, t) => a + (t.odendi ? t.tutar : (t.kismi || 0)), 0) + (k.odeme.ekler || []).filter(x => x.odendi).reduce((a, x) => a + x.tutar, 0) - (k.odeme.iade || 0);
export const kalanBorc = k => Math.max(0, k.odeme.toplam + ekToplam(k) - odenen(k));
export const gecikenler = k => k.odeme.taksitler.filter(t => !t.odendi && fark(t.vade) < 0);
export const eksikEvrak = k => EVRAKLAR.filter(([key]) => !k.evrak[key]);
export const asamaNo = k => ASAMALAR.indexOf(k.asama);
export function sonrakiDers(k) { return S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı' && fark(d.tarih) >= 0).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))[0]; }
export function gonderimEkle(kime, metin, tur) { S.gonderimler.unshift({ zaman: new Date().toISOString(), kime, metin, tur }); kaydet(); }

// Sınav riski: deneme ortalaması, gelmediği dersler, ilerleme hızı, önceki kalma.
export function risk(k) {
  if (!['Teorik', 'Direksiyon', 'Sınav'].includes(k.asama)) return null;
  const n = [];
  let p = 0;
  const ort = k.deneme.length ? Math.round(k.deneme.reduce((a, b) => a + b, 0) / k.deneme.length) : null;
  if (ort != null && ort < 70) { p += (70 - ort) * 1.6; n.push('Deneme ortalaması ' + ort); }
  const gel = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Gelmedi').length;
  if (gel) { p += gel * 14; n.push(gel + ' derse gelmedi'); }
  if (k.dsinav && k.dsinav.sonuc === 'Kaldı') { p += 30; n.push('Direksiyon sınavından kaldı'); }
  if (k.esinav && k.esinav.hak > 1) { p += 12; n.push('e-Sınavı ' + k.esinav.hak + '. hakta geçti'); }
  if (k.notlar.some(x => /zorlan|unut|panik|gergin/i.test(x.metin))) { p += 18; n.push('Usta öğretici notu'); }
  return { puan: Math.min(100, Math.round(p)), ort, nedenler: n };
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
export function islem(ne, ayrinti = '') { S.islemler.unshift({ zaman: new Date().toISOString().slice(0, 16), kim: oturum.kullanici ? oturum.kullanici.ad : 'Sistem', ne, ayrinti }); }
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
  l.push([y == null || y >= S.kurs.asgariYas, `Yaş ${y == null ? '?' : y} · en az ${S.kurs.asgariYas}`]);
  const g = (S.gruplar || []).find(x => x.id === k.teorikGrup);
  l.push([!g || !['Kayıt', 'Evrak'].includes(k.asama) || k.kayit <= g.baslangic, g ? `Kayıt grubun başlangıcından önce (${g.ad} ${g.baslangic.split('-').reverse().join('.')})` : 'Grup seçildi']);
  EVRAKLAR.filter(([x]) => x !== 'sozlesme').forEach(([x, t]) => l.push([!!k.evrak[x], t]));
  l.push([!!(k.saglikRapor && k.saglikRapor.no), 'Sağlık raporu numarası girildi']);
  l.push([!!(k.kvkk && k.kvkk.riza), 'KVKK aydınlatma ve açık rıza alındı']);
  return l;
}
