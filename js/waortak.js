// MSJ-043…047: tek ortak mdSinyal WhatsApp hattı (kursun kendi hattı yokken). Mesaj türü (bilgi / pazarlama), kampanya sözcükleri,
// ortak hattın ön eki ve DUR satırı, worker hata kodlarının Türkçesi, rıza kaydı (waRiza), yayın listesi dışa aktarımı.
// Saf modül: başka modül almaz; tarayıcı ve birim testi (sinyal-kaynak/arac/waortak-test) aynı dosyayı kullanır.
// Worker ile sözleşme: gönderim gövdesinde tur, sablon, kursAd, riza, toplu, topluId; hata kodları guncelle | riza | pazarlama | dur | limit | hat-yok.

// Satış ve tanıtım (pazarlama) türü: o5 Google yorum isteği, o6 ve o15 ek ders teklifi, o7 düşünen adaya takip, o16 doğum günü, kampanya.
// Bunlar ortak hattan hiç gitmez (Meta politikası, İYS). Geri kalan her şey bilgilendirmedir.
export const PAZARLAMA = Object.freeze(['o5', 'o6', 'o7', 'o15', 'o16', 'kampanya']);
// Bilgilendirme kaynakları (sözleşmedeki liste; o14 teorik grup başlangıcı ve o21 yeni kayıt bildirimi de bilgilendirmedir)
export const BILGI = Object.freeze(['o1', 'o2', 'o3', 'o4', 'o8', 'o9', 'o10', 'o11', 'o12', 'o13', 'o14', 'o17', 'o18', 'o19', 'o20', 'o21', 'belge', 'makbuz', 'imza', 'serbest', 'toplu']);
export const mesajTuru = sablon => PAZARLAMA.includes(String(sablon || '')) ? 'pazarlama' : 'bilgi';
export const pazarlamaMi = sablon => mesajTuru(sablon) === 'pazarlama';

// Ortak hatta giden metnin biçimi (worker da aynı biçimi kurar; burada önizleme için)
export const DUR_SATIRI = 'Bu bildirimleri almak istemiyorsanız DUR yazın.';
export const kursAdKirp = ad => String(ad || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
export const ortakOnEk = kursAd => 'mdSinyal · ' + (kursAdKirp(kursAd) || 'Sürücü kursu') + ': ';
export const ortakMetin = (kursAd, metin) => ortakOnEk(kursAd) + String(metin || '').trim() + '\n\n' + DUR_SATIRI;

// Bilgilendirme mesajında geçmemesi gereken kampanya sözcükleri. Bulunanlar kullanıcıya gösterilir; ortak hattan bu metin gitmez.
const KELIMELER = [
  ['indirim', /indirim/], ['kampanya', /kampanya/], ['fırsat', /f[ıi]rsat/], ['%', /%|yüzde\s*\d/], ['hediye', /hediye/],
  ['ücretsiz', /ücretsiz|bedava/], ['promosyon', /promosyon/], ['son gün', /son\s+gün/], ['kaçırmayın', /kaç[ıi]rma(y[ıi]n)?(?![a-zçğıöşü])/],
  ['sınırlı kontenjan', /s[ıi]n[ıi]rl[ıi]\s+(kontenjan|say[ıi]|süre)/], ['özel fiyat', /özel\s+fiyat/], ['avantaj', /avantaj/],
];
export function kampanyaKelimeleri(metin) {
  const m = String(metin || '').toLocaleLowerCase('tr');
  return KELIMELER.filter(([, rx]) => rx.test(m)).map(([k]) => k);
}

// Kurs başına günde en çok iki toplu bilgilendirme (farklı topluId); worker da aynı sınırı uygular
export const TOPLU_SINIR = 2;

// Worker'ın ortak hat hata kodları → kullanıcıya anlaşılır Türkçe
export const ORTAK_HATA = Object.freeze({
  guncelle: 'mdSinyal’in bu sürümü ortak WhatsApp hattından gönderemiyor. Uygulamayı güncelleyin (Hesabım › Uygulama sürümü) ve tekrar deneyin',
  riza: 'Kişinin mdSinyal’den WhatsApp bildirimi alma onayı kayıtlı değil; ortak hattan gönderilmedi. Onayı kişinin dosyasından işaretleyin ya da kursun telefonundan gönderin',
  pazarlama: 'Satış ve tanıtım mesajları ortak mdSinyal hattından gitmez; kursun kendi telefonundan gönderin',
  dur: 'Kişi DUR yazıp mdSinyal bildirimlerini durdurmuş; ortak hattan gönderilmedi. Gerekirse kursun telefonundan arayın',
  limit: 'Bugünkü toplu bilgilendirme hakkı doldu (günde en çok 2). Yarın tekrar deneyin ya da kursun telefonundan gönderin',
  'hat-yok': 'Ortak mdSinyal WhatsApp hattı şu an kurulu değil; mesaj WhatsApp’ta hazır metinle açılır',
});
export const ortakHataMetni = kod => ORTAK_HATA[String(kod || '')] || '';

// Rıza (MSJ-047): kişi kaydında waRiza = { tarih:'YYYY-MM-DD', kanal }; geri çekilince waRiza:null + waRizaGeri:tarih
export const RIZA_METNI = 'mdSinyal’den WhatsApp bildirimi almayı kabul ediyorum';
export const RIZA_KANAL = Object.freeze(['kayit', 'ogrenci-uygulama', 'ogretmen-uygulama', 'ofis']);
const TARIH = /^\d{4}-\d{2}-\d{2}$/;
export const rizaVar = x => !!(x && x.waRiza && TARIH.test(String(x.waRiza.tarih || '')));
export function rizaVer(x, kanal, tarih) {
  if (!x || !TARIH.test(String(tarih || ''))) return x;
  x.waRiza = { tarih, kanal: RIZA_KANAL.includes(kanal) ? kanal : 'ofis' }; delete x.waRizaGeri; return x;
}
export function rizaGeriAl(x, tarih) { if (x && TARIH.test(String(tarih || ''))) { x.waRiza = null; x.waRizaGeri = tarih; } return x; }
// Uygulamadan gelen rıza alanını denetler: geçerliyse { waRiza } ya da { waRiza:null, waRizaGeri } döner, değilse null
export function rizaOku(y, kanal) {
  if (!y || typeof y !== 'object' || !('waRiza' in y)) return null;
  if (y.waRiza && TARIH.test(String(y.waRiza.tarih || ''))) return { waRiza: { tarih: y.waRiza.tarih, kanal } };
  if (y.waRiza === null && TARIH.test(String(y.waRizaGeri || ''))) return { waRiza: null, waRizaGeri: y.waRizaGeri };
  return null;
}

// Telefonu uluslararası rakamlara çevirir (Türkiye: 90 5xx…); geçersizse ''
export function telRakam(tel) {
  const ham = String(tel || '').trim(); let n = ham.replace(/\D/g, '');
  if (ham.startsWith('+') || ham.startsWith('00')) { n = n.replace(/^00/, ''); return n.length >= 11 && n.length <= 15 ? n : ''; }
  if (n.startsWith('0')) n = '90' + n.slice(1); else if (n.length === 10 && n.startsWith('5')) n = '90' + n;
  return n.length >= 12 && n.length <= 15 ? n : '';
}

// Toplu gönderimde alıcıları ayırır: gidecekler, DUR yazanlar, rızası olmayanlar. x: { kisi, tel }; dur: DUR yazmış numaralar (Set, 90… biçiminde)
export function topluAyir(liste, dur = new Set()) {
  const gidecek = [], durdu = [], rizasiz = [];
  (liste || []).forEach(x => {
    const k = x && x.kisi;
    if ((k && k.waDur) || dur.has(telRakam(x && x.tel))) durdu.push(x);
    else if (!rizaVar(k)) rizasiz.push(x);
    else gidecek.push(x);
  });
  return { gidecek, dur: durdu, rizasiz };
}

// WhatsApp Business yayın listesi için dışa aktarım: rehbere eklenecek kişiler (vCard 3.0) ve tablo (CSV)
const vKac = s => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
export function vcardMetni(liste) {
  return (liste || []).map(x => ({ ad: String(x.ad || '').trim(), tel: telRakam(x.tel) })).filter(x => x.tel)
    .map(x => ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + vKac(x.ad || '+' + x.tel), 'N:' + vKac(x.ad) + ';;;;', 'TEL;TYPE=CELL:+' + x.tel, 'END:VCARD'].join('\r\n')).join('\r\n') + '\r\n';
}
export function csvSatirlari(liste) {
  // telefon ülke koduyla rakam olarak (Excel'de "+" formül sayılmasın); rehber uygulamaları 90… biçimini tanır
  return [['Ad soyad', 'Telefon'], ...(liste || []).map(x => [String(x.ad || '').trim(), telRakam(x.tel)]).filter(r => r[1])];
}
