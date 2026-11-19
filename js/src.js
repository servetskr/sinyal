// SRC sürücü mesleki yeterlilik kurs programları (DIR-044). Kaynak: Talim ve Terbiye Kurulu kararları 08.07.2022 / 50–53 (SRC1–SRC4),
// ookgm.meb.gov.tr/meb_iys_dosyalar/2022_12/2110xxxx_SRC_n.pdf. 10.02.2017/6 sayılı karardaki eski programlar bu kararlarla kaldırıldı.
// Yalnız yapısal bilgi: ünite (ders grubu) adları, ünite saatleri, günlük süre sınırı, eğitici niteliği grupları. Hepsi teorik; uygulamalı eğitim yok.
// DOM'a dokunmaz; tarayıcıda ve Node'da aynı çalışır. Ekran: src-ekran.js.

export const SRC_KAYNAK = 'TTK 08.07.2022 / 50–53 · SRC sürücü mesleki yeterlilik kurs programları';
// Program "süre" bölümü: hafta içi en az 2, en fazla 6; hafta sonu en az 2, en fazla 8 ders saati
export const SRC_GUNLUK = { haftaici: [2, 6], haftasonu: [2, 8] };

// Eğitici nitelikleri tablosu (dört programda aynı). Kısa özet; belge/sertifika kurs tarafından doğrulanır.
export const SRC_EGITICI = {
  ulasim: 'Trafik ve ulaşım alanında yüksek lisans; ya da trafik-ulaştırma, lojistik, makine, motor, otomotiv, mekatronik, otobüs kaptanlığı ön lisansı; ya da ön lisans + Trafik ve Çevre Öğreticiliği Belgesi; ya da ön lisans + en az 3 yıllık sürücü belgesi + Direksiyon Eğitimi Öğreticiliği Belgesi',
  hukuk: 'Hukuk, işletme, kamu yönetimi, iktisat, çalışma ekonomisi, maliye, uluslararası ilişkiler, lojistik, ulaştırma alanlarında yüksek lisans; ya da bu alanlarda lisans + Eğiticinin Eğitimi Sertifikası',
  psikoloji: 'Psikoloji, psikolojik danışmanlık ve rehberlik ya da felsefe grubu öğretmenliği lisansı',
  ilkyardim: 'En az ön lisans + İlk Yardım Eğitmeni Sertifikası',
};

// Ünite: [kod, ad, saat, eğitici grubu]. Ortak üniteler bir kez yazılır, programa göre farklı olanlar programda.
const U = (kod, ad, saat, egitici = 'ulasim') => ({ kod, ad, saat, egitici });
const ORTAK_BAS = [U('A', 'İş Sağlığı ve Güvenliği (İSG), Çevre Güvenliği, Kalite Gereklilikleri ve Müşteri Memnuniyeti', 1), U('B', 'İş Organizasyonu', 1), U('C', 'Aracın Yolculuk Öncesi Hazırlığı', 1)];
const ORTAK_ORTA = [U('F', 'Trafik Kuralları ve Cezaları', 3), U('G', 'Trafik ve Davranış Psikolojisi', 3, 'psikoloji'), U('H', 'Trafik Adabı', 2), U('I', 'İletişim Teknolojileri ve Harita Okuma', 1)];
const ORTAK_SON = [U('K', 'İlk Yardım', 3, 'ilkyardim'), U('L', 'Araç Bilgisi ve Ekonomik Araç Kullanma', 3), U('M', 'Mesleki Gelişim', 2)];
const program = (kod, ad, karar, ozel) => {
  const [c, e, i, j] = ozel, moduller = [...ORTAK_BAS, c, U('D', 'Güvenli Sürüş Teknikleri', 4), e, ...ORTAK_ORTA, i, j, ...ORTAK_SON];
  return { kod, ad, karar, toplam: moduller.reduce((a, m) => a + m.saat, 0), moduller };
};
const YOLCU = U('Ç', 'Yolcu Taşıma Kuralları', 1), ESYA = U('Ç', 'Eşya ve Kargo Taşıma Kuralları', 1);
export const SRC_PROGRAMLARI = {
  SRC1: program('SRC1', 'Uluslararası Yolcu Taşımacılığı (SRC1)', '08.07.2022 / 50', [YOLCU, U('E', 'Yolcu Taşımacılığı ile İlgili Mevzuat', 9, 'hukuk'), U('İ', 'Gümrük, Kaçakçılık ve Uluslararası Yolcu Taşıma Mevzuatı', 3, 'hukuk'), U('J', 'Yasal Sorumluluklar ve Sigorta', 3, 'hukuk')]),
  SRC2: program('SRC2', 'Yurt İçi Yolcu Taşımacılığı (SRC2)', '08.07.2022 / 51', [YOLCU, U('E', 'Yolcu Taşımacılığı ile İlgili Mevzuat', 7, 'hukuk'), U('İ', 'Kaçakçılık Mevzuatı', 2, 'hukuk'), U('J', 'Yasal Sorumluluklar ve Sigorta', 2, 'hukuk')]),
  SRC3: program('SRC3', 'Ulusal ve Uluslararası Eşya-Kargo Taşımacılığı (SRC3)', '08.07.2022 / 52', [ESYA, U('E', 'Eşya ve Kargo Taşımacılığı ile İlgili Mevzuat', 9, 'hukuk'), U('İ', 'Gümrük, TIR ve Kaçakçılık Mevzuatı', 4, 'hukuk'), U('J', 'Yasal Sorumluluklar ve Sigorta', 3, 'hukuk')]),
  SRC4: program('SRC4', 'Yurt İçi Eşya-Kargo Taşımacılığı (SRC4)', '08.07.2022 / 53', [ESYA, U('E', 'Eşya ve Kargo Taşımacılığı ile İlgili Mevzuat', 7, 'hukuk'), U('İ', 'Kaçakçılık Mevzuatı', 2, 'hukuk'), U('J', 'Yasal Sorumluluklar ve Sigorta', 2, 'hukuk')]),
};
export const srcProgrami = kod => SRC_PROGRAMLARI[kod] || null;
// Grubun programı: grubun sınıfı SRC1–4 ise o; değilse SRC programı penceresinde seçilen (g.srcProgram)
export const srcProgramKodu = g => (g && (SRC_PROGRAMLARI[g.sinif] ? g.sinif : SRC_PROGRAMLARI[g.srcProgram] ? g.srcProgram : '')) || '';
export const modulBul = (prog, kod) => (prog && prog.moduller.find(m => m.kod === kod)) || null;
export const modulAdi = m => `${m.kod}. ${m.ad}`;

const sirala = l => [...l].sort((a, b) => (a.tarih + (a.saat || '')).localeCompare(b.tarih + (b.saat || '')) || String(a.id).localeCompare(String(b.id)));
// Grubun SRC dersleri (teorik dersler içinde srcModul alanı olanlar), tarih sırasıyla
export const srcDersleri = (g, teorik) => sirala((teorik || []).filter(t => t && g && t.grup === g.id && t.srcModul));

// Sayaç: ünite başına toplam (resmî) / atanan (normal dersler) / kalan / fazla; telafi ayrı sayılır. Öğretici başına saat.
export function srcSayac(prog, dersler) {
  if (!prog) return null;
  const at = {}, tel = {}, ogr = {};
  (dersler || []).forEach(t => { const s = +t.sure || 1; (t.egitimTuru === 'telafi' ? tel : at)[t.srcModul] = ((t.egitimTuru === 'telafi' ? tel : at)[t.srcModul] || 0) + s; if (t.ogretmen) ogr[t.ogretmen] = (ogr[t.ogretmen] || 0) + s; });
  const satir = prog.moduller.map(m => { const a = at[m.kod] || 0; return { ...m, atanan: a, kalan: Math.max(0, m.saat - a), fazla: Math.max(0, a - m.saat), telafi: tel[m.kod] || 0 }; });
  const atanan = satir.reduce((a, x) => a + Math.min(x.atanan, x.saat), 0);
  return { satir, toplam: prog.toplam, atanan, kalan: prog.toplam - atanan, fazla: satir.reduce((a, x) => a + x.fazla, 0), telafi: satir.reduce((a, x) => a + x.telafi, 0), ogretici: ogr, eksik: satir.filter(x => x.kalan > 0) };
}

// Otomatik ders adı: ünite adı + ünite içindeki saat sırası ("E. Yolcu Taşımacılığı ile İlgili Mevzuat · 3–4/9. saat").
// Sıra, aynı ünitenin önceki normal derslerinin saatlerinden hesaplanır; telafi dersi "telafi" diye adlanır.
export function srcDersAdlari(prog, dersler) {
  const say = {}, ad = {};
  sirala(dersler || []).forEach(t => {
    const m = modulBul(prog, t.srcModul); if (!m) { ad[t.id] = t.konu || ''; return; }
    if (t.egitimTuru === 'telafi') { ad[t.id] = `${modulAdi(m)} · telafi`; return; }
    const s = +t.sure || 1, b = (say[m.kod] || 0) + 1, son = b + s - 1; say[m.kod] = son;
    ad[t.id] = `${modulAdi(m)} · ${b === son ? b : b + '–' + son}/${m.saat}. saat${son > m.saat ? ' (fazla)' : ''}`;
  });
  return ad;
}

const haftaSonuMu = t => { const d = new Date(t + 'T12:00:00').getDay(); return d === 0 || d === 6; };
export const gunSiniri = t => SRC_GUNLUK[haftaSonuMu(t) ? 'haftasonu' : 'haftaici'];
// Günlük süre denetimi: o gün grubun toplam SRC saati programın sınırları içinde mi
export function srcGunKontrol(t, saat) {
  const [en, ec] = gunSiniri(t), hs = haftaSonuMu(t);
  if (saat > ec) return `${t.split('-').reverse().join('.')} günü ${saat} saat olur; ${hs ? 'hafta sonu' : 'hafta içi'} en fazla ${ec} ders saati (SRC programı).`;
  if (saat && saat < en) return `${t.split('-').reverse().join('.')} günü ${saat} saat; günde en az ${en} ders saati (SRC programı).`;
  return null;
}

// Otomatik program önerisi: kalan saatler ünite sırasıyla günlere dağıtılır. Grubun dersi olan günler ve kapalı günler atlanır.
// a = { bas: 'YYYY-AA-GG', saat: 18 (başlangıç saati), gunluk: 2..8, haftasonu: bool, doluGun: Set|[], kapali: t => metin|null }
// Dönüş: [{ tarih, saat: 'SS:00', sure, srcModul }] (aynı gün birden çok ünite art arda). Günlük toplam en az 2 (son gün dâhil).
export function srcPlanOner(prog, sayac, a) {
  const kalan = (sayac ? sayac.satir : prog.moduller.map(m => ({ ...m, kalan: m.saat }))).filter(m => m.kalan > 0).map(m => ({ kod: m.kod, kalan: m.kalan }));
  const toplam = kalan.reduce((x, m) => x + m.kalan, 0), bas = +a.saat || 18; if (!toplam || 23 - bas < 2) return [];
  const gunluk = Math.max(2, Math.min(8, +a.gunluk || 4)), dolu = new Set(a.doluGun || []);
  // gün sayısı ve gün başına saat: eşit dağıt, hiçbir gün 2 saatin altında kalmasın
  let n = Math.ceil(toplam / gunluk); if (Math.floor(toplam / n) < 2) n = Math.max(1, Math.floor(toplam / 2));
  const taban = Math.floor(toplam / n), artan = toplam % n, kuyruk = Array.from({ length: n }, (_, i) => taban + (i < artan ? 1 : 0));
  const sonuc = [], d0 = new Date(a.bas + 'T12:00:00'); let mi = 0;
  for (let i = 0; kuyruk.length && i < 366; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if ((!a.haftasonu && haftaSonuMu(t)) || dolu.has(t)) continue;
    const kp = a.kapali ? a.kapali(t) : null; if (kp && kp !== 'Pazar') continue;   // pazar SRC'de hafta sonu sayılır; resmî tatil ve kurs kapalı günü atlanır
    const istek = kuyruk.shift(); let h = Math.min(istek, gunSiniri(t)[1], 23 - bas), artik = istek - h;
    // sığmayan saat sonraki güne; son gün 2 saatin altında kalacaksa bu günden kısılır
    if (artik > 0 && !kuyruk.length && artik < 2 && h - (2 - artik) >= 2) { h -= 2 - artik; artik = 2; }
    if (artik > 0) { if (kuyruk.length) kuyruk[0] += artik; else kuyruk.push(artik); }
    let saat = bas;
    while (h > 0 && mi < kalan.length) {
      const m = kalan[mi], s = Math.min(h, m.kalan);
      sonuc.push({ tarih: t, saat: String(saat).padStart(2, '0') + ':00', sure: s, srcModul: m.kod });
      saat += s; h -= s; m.kalan -= s; if (!m.kalan) mi++;
    }
  }
  return sonuc;
}

// MEBBİS'e gönderilecek liste (yalnız görüntü; MEBBİS'e yazılmaz): ders saati başına bir satır (MEBBİS dilimleri 50 dk)
export function srcMebListesi(prog, dersler, ogretmenBul) {
  const l = [], say = {};
  sirala(dersler || []).forEach(t => {
    const m = modulBul(prog, t.srcModul), o = (ogretmenBul && ogretmenBul(t.ogretmen)) || {}, b = +String(t.saat || '0').slice(0, 2), tel = t.egitimTuru === 'telafi';
    for (let i = 0; i < (+t.sure || 1); i++) {
      const s = b + i, no = tel || !m ? 0 : (say[m.kod] = (say[m.kod] || 0) + 1);
      const dersAdi = !m ? t.konu || '' : tel ? `${modulAdi(m)} · telafi` : `${modulAdi(m)} · ${no}/${m.saat}. saat${no > m.saat ? ' (fazla)' : ''}`;
      l.push({ ders: t.id, tarih: t.tarih, saat: `${String(s).padStart(2, '0')}:00–${String(s).padStart(2, '0')}:50`, grup: m ? m.kod : t.srcModul, grupAd: m ? m.ad : '', dersAdi, ogretici: o.ad || '', izinNo: o.calismaIzinNo || '', derslik: t.salon || '', tur: tel ? 'Telafi' : 'Normal', gonderildi: !!t.meb });
    }
  });
  return l;
}
