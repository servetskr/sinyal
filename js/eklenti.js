// mdSinyal MEBBİS Yardımcısı (Chrome eklentisi) ile konuşma: eklenti kurulu mu, MEBBİS’e yazılacak işleri sıraya koy,
// MEBBİS’ten gelen listeyi aktarım ekranına ver, MEBBİS’te kaydedilen işleri mdSinyal’de işlendi olarak işaretle.
//
// ===== İLETİ SÖZLEŞMESİ (mdSinyal v208 ↔ Yardımcı 1.12.0) — aynı tablo eklenti/sinyal.js başında da var; biri değişirse ikisi birlikte =====
// Sayfa → Yardımcı (window.postMessage {kaynak:'sinyal-sayfa', tur, veri}; gönderen dosya)
//   ping {}                                                                  eklenti.js (açılışta ve 1,5 sn sonra; Yardımcı her ping'e son harita-durum'u da yeniden verir)
//   toplu {id, isId?, kurum, cek[], dosya[], yaz[], denetle?, onay?, parca?}  mebtoplu.js baslat(): topluCek, parcaGonder, ekranDenetle
//   toplu-durdur {id} · toplu-devam {id} · toplu-iptal {id?}                 mebtoplu.js isDurdur / devamEt, mesgulGeldi / isIptal, cekIptal
//   toplu-yuk-koy {id, yaz[]}                                                mebtoplu.js yukIste (Yardımcı toplu-yuk-iste deyince)
//   toplu-sonuc-onay {id, zaman}                                             mebtoplu.js durumGeldi (son sonuç işlenince)
//   kuyruk · cek · bitenler-onay                                             bu dosya ("Ekranda doldur" yedek yolu)
// Yardımcı → sayfa (kaynak 'sinyal-eklenti'; işleyen)
//   merhaba {surum, ozellik[]}                                               bu dosya: eklenti.var/surum/ozellik; 1.12+ → Durdur ve "Ekranları denetle" görünür
//   toplu-durum {id, bitti, son, iptal, durum, zaman, sonuc}                 mebtoplu.js durumGeldi
//       sonuc.yazilan[{id, ok, not, dogrulama, ekran, sure, kod, hataTur, eksik}] → yazilanlariIsle: bayrak + iz + kayıt başına islem() (mebkayit.js sonucYaz)
//       sonuc.ekranDegisti[] / yazilan[].hataTur 'ekran' / sonuc.hataTur 'ekran'  → mebkayit.js ekranDegisti: kırmızı kart + islem('MEBBİS ekranı değişti')
//       sonuc.hataTur 'kurum' + sonuc.mebKurum                               → mebkayit.js kurumUyusmazligi: iş kartı "Kurum uyuşmazlığı" + islem()
//       sonuc.kurum{kod, eslesme} · sonuc.olcum{istek, kod{istenen, girilen, atlanan}, basla, bitis}  → iş kartında ölçüm satırı, bitince islem('MEBBİS işi bitti')
//       sonuc.veri.denetim{ekranlar[{kod, ad, durum, eksik}]}                → mebkayit.js denetimSonucu: pencere + islem('MEBBİS ekranlarını denetledi')
//       hataTur: oturum · ekran · ekran-dur · veri · mebbis · kod · dogrulama · kurum · dur · iptal · belirsiz · yarim
//   toplu-alindi {ok, id, sekme} | {mesgul, id, reddedilen, kalan, durum}   mesgul → mebtoplu.js mesgulGeldi
//   toplu-yuk-iste {id, kalan[]} → mebtoplu.js yukIste · toplu-yuk-alindi {id, ok, durum, n, neden} → mebtoplu.js yukAlindi
//   ekran-degisti {id, ekranlar[{ekran, ad, eksik, iz, kaynak, yardimci, harita}]}  → mebkayit.js ekranDegisti (aynı işte ekran başına bir kez)
//   harita-durum {ok, surum, ayni?} | {ok:false, neden}                     → mebkayit.js haritaDurum: ret → kırmızı kart + islem(); düzelince kalkar
//   tablo · bitenler · hatalar                                               bu dosya (tek liste ve "Ekranda doldur" yolu)
// Kurs verisi yüklenmeden (giriş öncesi) gelen toplu-durum işlenmez, Yardımcı yeniden verir; harita-durum ise bekletilir (bekleyenleriIsle).
// =====
import { S, kaydet, gun, iso, fark, tamAd, islem, SINIFLAR, egitmen, arac, kursiyer, eksikEvrak, sb, sbDers, sbSinav, oturum, cokSube, seciliSube, mebIsGunuGeri, kuralAyar, egitimSinifi, MEB_CEZA_SERTIFIKA } from './veri.js?v=234';
import { bildir, pencere, kapatPencere, e, ik, isaret, tarihUzun } from './ui.js?v=234';
import * as GR from './gruplar.js?v=234';
import * as MN from './mebnorm.js?v=234';
import * as MK from './mebkayit.js?v=234';
import { onkosulEngel } from './onkosul.js?v=234';

export const eklenti = { var: false, surum: null, ozellik: [], harita: null };
const sayfadan = (tur, veri) => window.postMessage({ kaynak: 'sinyal-sayfa', tur, veri }, location.origin);
let yenileFn = () => { };
export const eklentiYenile = f => { yenileFn = f; };
// YON-076: Yardımcı'nın kurulu olduğu kurs verisine yazılır (sürüm, tarih, bilgisayar); kurulum adımı telefondan bakınca da tamam görünür
function yardimciIzi() {
  try {
    const u = oturum.kullanici; if (!u || !['mudur', 'sekreter'].includes(u.rol) || !S.kurs) return;
    const ua = navigator.userAgent || '', os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'bilgisayar';
    const y = S.kurs.yardimci || {}, yeni = { surum: eklenti.surum || '', tarih: gun(0), cihaz: os + ' · Chrome', kim: u.ad || '' };
    if (y.surum === yeni.surum && y.cihaz === yeni.cihaz && y.tarih && fark(y.tarih) > -7) return;  // haftada bir tazelenir, her açılışta yazılmaz
    S.kurs.yardimci = yeni; kaydet();
  } catch (x) { }
}
export const EKLENTI_ZIP = 'eklenti/mdsinyal-mebbis.zip';
// 1.12.0'dan eski Yardımcı (mebtoplu.js GEREKEN_SURUM ile aynı)
const eskiSurum = () => { const v = String(eklenti.surum || '0').split('.').map(Number); return v[0] < 1 || (v[0] === 1 && (v[1] || 0) < 12); };

const tr = t => t ? String(t).slice(0, 10).split('-').reverse().join('.') : '';
const tel = t => { const d = String(t || '').replace(/\D/g, '').replace(/^90/, ''); return d.length === 10 ? '0' + d : d.length === 11 ? d : String(t || ''); };
const adSoy = ad => { const p = String(ad || '').trim().split(/\s+/); return [p.slice(0, -1).join(' ') || p[0] || '', p.length > 1 ? p[p.length - 1] : '']; };
const alan = (etiket, deger, es = []) => deger == null || deger === '' ? null : { etiket, deger: String(deger), es };
const TC = ['T.C. Kimlik No', ['tc', 'tckimlikno', 'kimlikno', 'tckn', 'tcno', 'tckimliknumarasi']];
// MEBBİS cep telefonu alanı başında 0 olmadan 10 hane ister (5XXXXXXXXX)
const cep10 = t => { const d = String(t || '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, ''); return d.length === 10 ? d : ''; };
// Kursiyerin dönem grubu MEBBİS'teki seçim zinciri olarak: Dönem "2026 - Kasım" → Grup "Grup 1" → Şube "A Şubesi"
const grupAlanlari = k => { const g = GR.kursiyerGrubu(k); return g && GR.mebGrubuMu(g) ? [alan('Dönem', GR.donemAdi(g.donem), ['donem', 'donemi', 'egitimdonemi']), alan('Grup', 'Grup ' + g.grupNo, ['grup', 'grubu', 'grupadi']), alan('Şube', g.sube + ' Şubesi', ['sube', 'subesi', 'subeadi'])] : []; };
// MEBBİS'te personel seçeneği "İzin No:5048176 AD SOYAD": izin no varsa onunla seçilir (aynı adlı iki personel karışmaz)
const personel = eg => (eg && (eg.calismaIzinNo ? String(eg.calismaIzinNo).replace(/\D/g, '') : eg.ad)) || '';
// İstenen sertifika MEBBİS metniyle: "B SINIFI SERTİFİKA (Manuel)" / "B SINIFI SERTİFİKA (Otomatik)"
// 100 ceza puanı eğitimi: MEBBİS'te normal aday kaydı, istenen sertifika "100 Ceza Puanı (Manuel)" (MEB-185, SOR-020).
// B Engelli'nin MEBBİS'teki sertifika adı doğrulanmadı: alan boş bırakılır, kurs elle seçer (mebtoplu.js toplu kayıt işi B-EN'i durdurur)
const sertifikaMetni = k => { if (k.sinif === 'CEZA') return MEB_CEZA_SERTIFIKA; if (k.sinif === 'B-EN') return null; const b = String(k.sinif || '').replace(/-O$/, ''), oto = /-O$/.test(k.sinif || ''); return b === 'B' ? `B SINIFI SERTİFİKA (${oto ? 'Otomatik' : 'Manuel'})` : `${b} SINIFI SERTİFİKA`; };

// Son gün hesabı: panel işleri en acilden başlayarak sıralar
const gunEkle = (t, n) => { const d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
// sınav randevusu son günü: MEB iş günü (Cumartesi, Pazar, resmî tatil ve bayramlar sayılmaz); gün sayısı kursun mevzuat ayarından
const isGunuGeri = (t, n) => mebIsGunuGeri(t, n);
const sinavIsGunu = () => kuralAyar('sinavBildirimIsGunu');
// MEBBİS’e yazılacak işler; her alanın etiketi MEBBİS formundaki etiketle eşleşir (eş anlamlılar es’te)
// hepsi: aktarılmış olanlar da (bitti: true) gelir; aktarım merkezindeki 'Aktarılanlar' için
// meta: aktarım merkezinde filtre ve tablo için (ad, sınıf, öğretmen, tarih, detay)
export function mebIsleri(hepsi) {
  const isler = [];
  sb(S.kursiyerler).filter(k => !k.kapali && !k.prova && !eksikEvrak(k).length && GR.kursiyerGrubu(k) && (!k.mebIslendi || (hepsi && fark(k.kayit) >= -90))).forEach(k => {
    const n = k.nufus || {}, S0 = SINIFLAR[k.sinif] || {};
    const ilk = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı').map(d => d.tarih).sort()[0];
    isler.push({ id: 'kayit-' + k.id, tur: 'kayit', ref: { kursiyer: k.id }, bitti: !!k.mebIslendi, meta: { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: k.kayit, detay: (SINIFLAR[k.sinif] || {}).ad || k.sinif }, son: ilk ? gunEkle(ilk, -kuralAyar('programOnGun')) : gun(3), neden: ilk ? 'İlk dersinden önce' : 'Kayıttan sonra', baslik: tamAd(k), alanlar: [
      // MEBBİS Aday Dönem Kayıt (SKT02001): dönem/grup/şube, TC ("Bilgileri Getir" ad, baba adı, doğum bilgilerini MERNİS'ten getirir),
      // istenen sertifika, varsa mevcut belge, cep telefonu. Diğer bilgiler MEBBİS'te bu formda yok.
      ...grupAlanlari(k), alan(TC[0], k.tc, TC[1]), alan('İstenen Sertifika Sınıfı', sertifikaMetni(k), ['istenensurucubelgesisinifi', 'istenensertifikasinifi', 'istenenehliyetsinifi', 'sertifikasinifi', 'sinif']),
      alan('Mevcut Sürücü Belgesi Sınıfı', k.mevcutEhliyet && k.mevcutEhliyet !== 'Yok' ? k.mevcutEhliyet + ' SINIFI' : null, ['mevcutsurucubelgesisinifi', 'mevcutehliyetsinifi', 'mevcutbelge']),
      alan('Cep Telefonu', cep10(k.tel), ['ceptelefonu', 'ceptelefonno', 'telefon', 'gsm', 'tel']),
    ].filter(Boolean) });
  });
  // DIR-048: gönderilecek ders yarından itibaren (aktarılanlar listesi geçmişi de gösterir)
  sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && !(kursiyer(d.kursiyer) || {}).prova && ((fark(d.tarih) > 0 && !d.meb) || (hepsi && d.meb && fark(d.tarih) >= -14))).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(d => {
    const k = kursiyer(d.kursiyer); if (!k) return; const eg = egitmen(d.egitmen) || {}, ar = arac(d.arac) || {};
    isler.push({ id: 'ders-' + d.id, tur: 'program', ref: { ders: d.id }, bitti: !!d.meb, meta: { ad: tamAd(k), sinif: k.sinif, egitmen: d.egitmen, tarih: d.tarih, detay: `${d.mebDegisti ? 'DEĞİŞTİ (MEBBİS’teki eski kayıt: ' + d.mebDegisti.eski + ') · ' : ''}${tr(d.tarih)} ${d.saat} · ${eg.ad || ''} · ${ar.plaka || ''}` }, son: gunEkle(d.tarih, -kuralAyar('programOnGun')), neden: `Dersten ${kuralAyar('programOnGun')} gün önce`, baslik: `${tamAd(k)} · ${tr(d.tarih)} ${d.saat}`, alanlar: [
      alan('Tarih', tr(d.tarih), ['derstarihi', 'tarih', 'egitimtarihi']), alan('Saat', d.saat, ['dersaati', 'baslangicsaati', 'saat']), alan(TC[0], k.tc, TC[1]), alan('Kursiyer', tamAd(k), ['kursiyer', 'kursiyeradi', 'adisoyadi']),
      alan('Eğitimi Veren Personel', personel(eg), ['egitimiverenpersonel', 'dersiverenpersonel', 'ustaogretici', 'ogretici', 'egitici', 'personel']), alan('Eğitim Alınan Araç', ar.plaka, ['egitimalinanarac', 'plaka', 'aracplakasi', 'arac']),
      ...grupAlanlari(k),
    ].filter(Boolean) });
  });
  sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= (hepsi ? -14 : 0)).forEach(s => (s.kursiyerler || []).map(kursiyer).filter(Boolean).filter(k => !k.prova && !egitimSinifi(k.sinif)).filter(k => (s.mebKisi || []).includes(k.id) ? hepsi : (!s.mebBildirim && fark(s.tarih) >= 0)).forEach(k => {
    // SNV-077: sınav günü ataması (araç, usta) önce; yoksa son dersin aracı ve öğrencinin ustası
    const at = (s.atama || {})[k.id] || {}, d = S.dersler.filter(x => x.kursiyer === k.id && x.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0], ar = (at.plaka && (S.araclar || []).find(a => String(a.plaka).replace(/\s/g, '') === String(at.plaka).replace(/\s/g, ''))) || arac(d && d.arac) || {}, eg = egitmen(at.egitmen) || egitmen(k.egitmen) || {};
    isler.push({ id: 'sinav-' + s.id + '-' + k.id, tur: 'sinav', ref: { sinav: s.id, kursiyer: k.id }, bitti: (s.mebKisi || []).includes(k.id), meta: { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: s.tarih, detay: `${tr(s.tarih)} ${s.saat || ''} · ${s.yer || ''}` + (k.sinif === 'B-EN' ? ' · B Engelli: MEBBİS’te B olarak; rapor kodu ve kendi aracı modüle ayrıca tanımlanır' : '') }, son: isGunuGeri(s.tarih, sinavIsGunu()), neden: `Sınavdan ${sinavIsGunu()} iş günü önce`, baslik: `${tamAd(k)} · ${tr(s.tarih)} sınavı`, alanlar: [
      alan('Sınav Tarihi', tr(s.tarih), ['sinavtarihi', 'tarih']), alan(TC[0], k.tc, TC[1]), alan('Kursiyer', tamAd(k), ['kursiyer', 'adisoyadi']), alan('Araç Plakası', ar.plaka, ['plaka', 'aracplakasi', 'sinavaraci']), alan('Usta Öğretici', personel(eg), ['ustaogretici', 'ogretici']),
    ].filter(Boolean) });
  }));
  // tahsilatın MEBBİS'te ekranı yok; karşılığı Fatura işi (mebtoplu.js, SKT02013)
  return isler;
}

// Seçilen işleri (ya da hepsini) Yardımcı'ya gönderir; Yardımcı MEBBİS sekmesine geçip sırayla kendisi yürütür
// S.mebDurum[id]: { durum: 'gonderildi' | 'hata' | 'tamam', zaman, not, ... }; aktarılınca 'tamam' izi kalır (kim, ne zaman)
// gidince: iş gerçekten Yardımcı'ya gidince çağrılır (onay/kural penceresinde vazgeçilirse çağrılmaz)
export function yardimciyaGonder(idler, gidince) {
  if (!eklenti.var) return kurulumPenceresi();
  if (!MK.yazabilir()) return bildir(MK.YETKI_YOK_YAZ, 'uyari');
  if (onkosulEngel('MEBBİS’e yazma')) return;  // YON-077
  if (!MK.kabulDenetle(() => yardimciyaGonder(idler, gidince))) return;
  // birden çok şubede her şubenin MEBBİS hesabı ayrıdır: şube seçilmeden işler tek hesaba gönderilmez
  if (cokSube() && !seciliSube()) return bildir('Önce üstten şube seçin; her şubenin işleri kendi MEBBİS hesabına girilir', 'uyari');
  const hepsi = mebIsleri(), isler = idler ? hepsi.filter(x => idler.includes(x.id)) : hepsi;
  if (!isler.length) return bildir('MEBBİS’e aktarılacak iş yok');
  const gonder = () => {
    sayfadan('kuyruk', { isler, kurs: S.kurs.ad, oto: true });
    S.mebDurum = S.mebDurum || {}; const z = Date.now(); isler.forEach(x => { S.mebDurum[x.id] = { durum: 'gonderildi', zaman: z, is: 'ekranda', tur: x.tur, baslik: MK.maskele(x.baslik || '').slice(0, 80) }; });
    islem('MEBBİS’e aktarım başlattı', isler.length + ' iş'); kaydet(); if (gidince) gidince(); yenileFn();
    bildir(`${isler.length} iş MEBBİS’e aktarılıyor. MEBBİS sekmesi açılıyor; girmediyseniz kendi şifrenizle girin, Yardımcı sırayla yürütür.`);
  };
  // kural bulguları (engel kırmızı, uyarı turuncu) önce bilgi olarak görünür; bu yol durdurmaz. Bulgu yoksa ya da denetim yüklenemezse hemen gönderilir.
  import('./mebtoplu.js?v=234').then(m => m.kuralBilgi(isler.map(x => x.id), gonder, { dugme: 'Ekranda doldur' }), () => gonder());
}

// PER-010: personel çalışma izni isteği (OOK13002 'Çalışma İzni Ekle'). Yalnız "Ekranda doldur" yolu: Yardımcı formu karttaki bilgilerle doldurur;
// güvenlik kodunu yazmak, 'Bilgileri Getir', fotoğraf seçmek ve Kaydet kullanıcıdadır. Statü/görev/branş seçimi sayfayı yeniler: Yardımcı'da
// 'Tekrar doldur' kalan alanları yazar. Başlama ve bitiş tarihlerini il/ilçe MEM girer. Toplu motor (aktarım merkezi) bu işi almaz.
export const MEB_STATU = [['1', 'Asıl Görevli Aylık Ücretli Eğitim Personeli'], ['0', 'Ders Ücretli Eğitim Personeli'], ['2', 'Diğer Personel']];
export function izinIsi(eg) {
  const st = MEB_STATU.find(x => x[0] === String(eg.mebStatu)) || null, ders = st && st[0] === '0', hs = +eg.haftalikSinir || +((eg.meb || {}).haftaSaat) || 40;
  const al = (etiket, deger, es) => alan(etiket, deger, es);
  return { id: 'izin-' + eg.id, tur: 'izin', ref: { egitmen: eg.id }, bitti: false, meta: { ad: eg.ad, egitmen: eg.id, tarih: gun(0), detay: 'Çalışma izni isteği' }, son: gun(3), neden: 'Çalışma izni', baslik: eg.ad, alanlar: [
    al('Tc Kimlik No', eg.tc, ['idtckimlikno', 'tckimlikno', 'tc']), al('Seri No', eg.kimlikSeri, ['txtserino', 'serino']), al('Doğum Tarihi', tr(eg.dogumTarihi), ['txtdogumtarihi', 'dogumtarihigunayyil', 'dogumtarihi']),
    al('Cep Telefonu', cep10(eg.tel), ['txttel', 'ceptelefonu']), al('e-Posta', eg.eposta, ['txteposta', 'eposta']),
    al('Statüsü', st && st[1], ['cmbstatusu', 'statusu']), al('Görevi', 'Usta Öğretici', ['cmbgorev', 'gorevi']),
    ...(st && !ders ? [al('Brüt Ücret (Aylık)', eg.maas ? Math.round(eg.maas) : null, ['idbrutucret', 'brutucretaylik'])] : []),
    ...(st ? [al('Maaş Karşılığı Ders Sayısı', ders ? 0 : hs, ['idmkgderssayisi', 'maaskarsiligiderssayisi']), al('Ders Ücreti Karşılığı Ders Sayısı', ders ? hs : null, ['iddkggirecegiderssayisi', 'dersucretikarsiligiderssayisi'])] : []),
    al('Branş 1', 'Direksiyon', ['cmbbrans1', 'brans1']),
  ].filter(Boolean) };
}
// PER-025: yeni çalışma izninin 2. aşaması OOK13006 'Personel Öğrenim Bilgileri Giriş' (OOK13001 listesinden 'Aç' ile girilir); ekranda doldurulur
export function ogrenimIsi(eg) {
  const o = eg.ogrenim || {}, al = (etiket, deger, es) => alan(etiket, deger, es);
  return { id: 'ogrenim-' + eg.id, tur: 'ogrenim', ref: { egitmen: eg.id }, bitti: false, meta: { ad: eg.ad, egitmen: eg.id, tarih: gun(0), detay: 'Öğrenim bilgileri' }, son: gun(3), neden: 'Çalışma izni', baslik: eg.ad, alanlar: [
    al('Mezuniyet Okul Cinsi', o.okulCinsi, ['mezuniyetokulcinsi', 'okulcinsi']), al('Üniversite', o.okul, ['universite', 'okul']), al('Fakülte', o.fakulte, ['fakulte']), al('Yüksekokul', o.yuksekokul, ['yuksekokul']),
    al('Ana Bilim Dalı', o.anabilim, ['anabilimdali']), al('Bölüm', o.bolum, ['bolum', 'bolumu']), al('Mezuniyet Tarihi', tr(o.mezuniyet), ['mezuniyettarihi']),
    al('Belge Cinsi', o.belgeCinsi, ['belgecinsi']), al('Belge Sayısı', o.belgeSayi, ['belgesayisi']), al('Belge Tarihi', tr(o.belgeTarih), ['belgetarihi']),
  ].filter(Boolean) };
}
export function ogrenimGonder(eg) {
  if (!eklenti.var) return kurulumPenceresi();
  { const v = String(eklenti.surum || '0').split('.').map(Number); if (v[0] < 1 || (v[0] === 1 && (v[1] || 0) < 16)) return bildir('Öğrenim formunu doldurmak için Yardımcı 1.16.0 gerekir; MEB işlemleri › MEBBİS Yardımcısı’ndan güncelleyin', 'uyari'); }
  if (!MK.onaylayabilir()) return bildir('MEBBİS işini kurs müdürü ya da ön büro başlatır', 'uyari');
  if (!MK.kabulDenetle(() => ogrenimGonder(eg))) return;
  if (cokSube() && !seciliSube()) return bildir('Önce üstten şube seçin; her şubenin işleri kendi MEBBİS hesabına girilir', 'uyari');
  const is = ogrenimIsi(eg); if (!is.alanlar.length) return bildir('Kartta öğrenim bilgisi yok; personel kartı › Genel’de yazın', 'uyari');
  sayfadan('kuyruk', { isler: [is], kurs: S.kurs.ad, oto: true });
  S.mebDurum = S.mebDurum || {}; S.mebDurum[is.id] = { durum: 'gonderildi', zaman: Date.now(), is: 'ekranda', tur: 'ogrenim', baslik: MK.maskele(eg.ad).slice(0, 80) };
  islem('MEBBİS’te öğrenim bilgisi girişini başlattı', eg.ad); kaydet(); yenileFn();
  bildir('MEBBİS’te Eklenecek Çalışma İzin Listesi’nden (OOK13001) kişiyi “Aç”ın; öğrenim bilgileri ekranında Yardımcı formu doldurur, Kaydet’e siz basarsınız.');
}
export function izinIstegiGonder(eg) {
  if (!eklenti.var) return kurulumPenceresi();
  { const v = String(eklenti.surum || '0').split('.').map(Number); if (v[0] < 1 || (v[0] === 1 && (v[1] || 0) < 16)) return bildir('Çalışma izni formunu doldurmak için Yardımcı 1.16.0 gerekir; MEB işlemleri › MEBBİS Yardımcısı’ndan güncelleyin', 'uyari'); }
  if (!MK.onaylayabilir()) return bildir('MEBBİS işini kurs müdürü ya da ön büro başlatır', 'uyari');
  if (!MK.kabulDenetle(() => izinIstegiGonder(eg))) return;
  if (cokSube() && !seciliSube()) return bildir('Önce üstten şube seçin; her şubenin işleri kendi MEBBİS hesabına girilir', 'uyari');
  const is = izinIsi(eg);
  sayfadan('kuyruk', { isler: [is], kurs: S.kurs.ad, oto: true });
  S.mebDurum = S.mebDurum || {}; S.mebDurum[is.id] = { durum: 'gonderildi', zaman: Date.now(), is: 'ekranda', tur: 'izin', baslik: MK.maskele(eg.ad).slice(0, 80) };
  eg.mebIzinIstek = { tarih: gun(0), eskiBit: eg.mebIzinBitis || (eg.meb || {}).izinBit || '' }; islem('MEBBİS’te çalışma izni isteği başlattı', eg.ad); kaydet(); yenileFn();
  bildir('MEBBİS sekmesi açılıyor. “Çalışma İzni Ekle” ekranında Yardımcı formu doldurur; güvenlik kodunu ve fotoğrafı siz girip Kaydet’e basarsınız.');
}

// MEBBİS'ten veri çek: Yardımcı MEBBİS sekmesine geçer, ilgili listeyi kendisi açar ve mdSinyal'e gönderir
const CEK_AD = { grup: 'dönem gruplarını', kursiyer: 'kursiyer listesini', sinav: 'sınav sonuçlarını', mutabakat: 'kursiyer listesini karşılaştırma için', taksit: 'ödemeleri', ogretmen: 'usta öğretici listesini', arac: 'araç listesini' };
export function mebbistenCek(amac) {
  if (!eklenti.var) return kurulumPenceresi();
  sayfadan('cek', { amac });
  islem('MEBBİS’ten veri istedi', amac);
  bildir(`MEBBİS sekmesine geçiliyor. Yardımcı ${CEK_AD[amac] || 'listeyi'} kendisi açıp buraya getirecek; MEBBİS’e girmediyseniz önce kendi şifrenizle girin.`);
}
export function kurulumPenceresi() {
  pencere({
    baslik: 'mdSinyal MEBBİS Yardımcısı', genis: true,
    icerik: `${eklenti.var ? (eskiSurum() ? `<p class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 20)}<span>Yardımcı bu tarayıcıda kurulu ama eski (sürüm ${e(eklenti.surum)}). Toplu yazma, Durdur ve “Ekranları denetle” için 1.12.0 gerekiyor; aşağıdan yeni sürümü indirip eski klasörün yerine yükleyin.</span></p>` : `<p class="ipucu" style="margin-bottom:12px">${isaret('tamam', 20)}<span>Yardımcı bu tarayıcıda kurulu (sürüm ${e(eklenti.surum)}).</span></p>`) : ''}
      <p style="font-size:14.5px">Chrome’a (ya da Microsoft Edge’e) eklenen küçük bir yardımcı. Kursun kendi MEBBİS oturumunda çalışır: MEBBİS’e siz girersiniz, şifrenizi istemez, görmez, saklamaz. Kayıtları siz kontrol edip bir kez onaylarsınız; Yardımcı yazar, kaydeder ve doğrular. Güvenlik kodunu ve geri alınamaz adımları siz yaparsınız; istediğiniz an durdurursunuz.</p>
      <ul class="liste" style="margin:8px 0">${[['MEBBİS’e yaz', 'Kayıt, evrak, dönem grubu, kurum onayı, teorik ve direksiyon programı, e-sınav başvurusu, sınav randevusu ve fatura MEB işlemleri › MEBBİS aktarımı’nda sıraya girer. “Hepsini MEBBİS’e yaz”a basınca yazılacaklar tek pencerede görünür; onaylarsınız, Yardımcı MEBBİS oturumunuzda sırayla kaydeder ve MEBBİS listesinden okuyarak denetler. Güvenlik kodu çıkarsa siz yazarsınız. Her kaydın sonucu işlem kaydına yazılır.'], ['MEBBİS’ten güncelle', 'Dönem grupları, öğrenciler (durum, onay, hak ve son günler), öğretmen izinleri, araçlar ve sınav sonuçları tek düğmeyle mdSinyal’e gelir. Tek bir listeyi almak için MEBBİS’te listeyi açıp “Listeyi mdSinyal’e gönder”e de basabilirsiniz.'], ['MEBBİS ekranı değişirse', 'Yardımcı beklediği alanı bulamazsa o ekrana yazmaz ve MEBBİS aktarımı ekranında kırmızı uyarı çıkar. O sürede işleri “Elle gir” ile girersiniz. MEBBİS aktarımı ekranındaki “Ekranları denetle” hiçbir şey yazmadan bütün ekranlara baktırır. (“Ekranda doldur” yedek yolunda bulamadığı alanı bir kez gösterirsiniz.)']].map(([a, b]) => `<li style="align-items:flex-start">${isaret('bilgi', 20)}<div><b style="color:var(--murekkep)">${a}</b><small style="display:block;color:var(--metin);font-size:13.5px">${b}</small></div></li>`).join('')}</ul>
      <h4 style="margin-top:10px">Kurulum (bir kez, kurs bilgisayarında)</h4>
      <ol style="padding-left:18px;display:grid;gap:8px;font-size:14px;margin-top:6px"><li><a href="${EKLENTI_ZIP}" download style="color:var(--levha);font-weight:700">Yardımcıyı indirin</a> ve zip dosyasını bir klasöre açın.</li><li>Chrome’da adres çubuğuna <b>chrome://extensions</b> yazın (Edge’de <b>edge://extensions</b>), <b>Geliştirici modu</b>nu açın (Chrome’da sağ üstte, Edge’de sol altta).</li><li><b>Paketlenmemiş öğe yükle</b>’ye basıp açtığınız klasörü seçin.</li><li>mdSinyal sayfasını yenileyin; bu pencerede “kurulu” yazısı görünür.</li></ol>
      <p class="og-not" style="margin-top:10px">Adım adım kurulum ve en güncel sürüm her zaman <a href="yardimci/" target="_blank" rel="noopener" style="color:var(--levha);font-weight:700">mdsinyal.com/yardimci</a> adresinde; bu adresi kurs bilgisayarına gönderebilirsiniz. Chrome Web Mağazası’ndaki sürüm onaylanınca tek tıkla kurulacak.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${eklenti.var ? '<button class="dg dg-ana" data-eklenti-gonder>İşleri gönder</button>' : ''}`,
    onAc(d) { const b = d.querySelector('[data-eklenti-gonder]'); if (b) b.addEventListener('click', () => { d.querySelector('[data-kapat]').click(); yardimciyaGonder(); }); },
  });
}

// MEBBİS listesinin türü başlıklardan tahmin edilir; kullanıcı aktarım ekranında değiştirebilir
const turTahmin = b => { const n = b.join(' ').toLocaleLowerCase('tr'); return /plaka/.test(n) ? 'arac' : /(usta|öğretici|personel|branş|görev)/.test(n) && !/kursiyer/.test(n) ? 'ogretmen' : 'kursiyer'; };
function bitenleriIsle(l) {
  if (!S || !S.kursiyerler || !oturum.kullanici) return;  // veri henüz yüklenmedi: eklentide kalır, sonra yeniden sorulur
  let n = 0;
  l.forEach(b => {
    const r = b.ref || {};
    if (b.tur === 'kayit') { const k = kursiyer(r.kursiyer); if (k && !k.mebIslendi) { k.mebIslendi = true; n++; } }
    if (b.tur === 'program') { const d = S.dersler.find(x => x.id === r.ders); if (d && !d.meb) { d.meb = true; delete d.mebDegisti; n++; } }
    if (b.tur === 'sinav') { const s = S.sinavlar.find(x => x.id === r.sinav); if (s) { s.mebKisi = [...new Set([...(s.mebKisi || []), r.kursiyer])]; if ((s.kursiyerler || []).every(x => s.mebKisi.includes(x))) s.mebBildirim = true; n++; } }
    if (b.tur === 'odeme') { const h = (S.hareket || []).find(x => x.id === r.hareket); if (h && !h.meb) { h.meb = gun(0); n++; } }
    if (b.tur === 'izin') { const eg = egitmen(r.egitmen); if (eg) { eg.mebIzinIstek = { ...(eg.mebIzinIstek || {}), girildi: gun(0) }; n++; } }
    if (b.tur === 'ogrenim') { const eg = egitmen(r.egitmen); if (eg && eg.mebIzinIstek) { eg.mebIzinIstek = { ...eg.mebIzinIstek, ogrenim: gun(0) }; n++; } }
  });
  // Ekranda doldur yolunda Kaydet'e kullanıcı basar: iz ve işlem kaydı "elle girildi (Yardımcı formu doldurdu)" olarak düşer
  S.mebDurum = S.mebDurum || {};
  const u = MK.kim();
  l.forEach(b => {
    const o = S.mebDurum[b.id];
    if (o && o.durum === 'tamam' && o.is === 'ekranda') return;
    S.mebDurum[b.id] = { durum: 'tamam', zaman: b.zaman || Date.now(), is: 'ekranda', tur: b.tur, baslik: (o && o.baslik) || '', kim: u.ad, kaynak: 'ekranda', dogrulama: 'kullanici', not: '' };
    MK.sonucYaz({ id: b.id, ok: true, dogrulama: 'kullanici', not: 'Yardımcı formu doldurdu, kaydı kullanıcı yaptı' }, { isId: 'ekranda', tur: b.tur, baslik: (o && o.baslik) || '', kaynak: 'ekranda' });
  });
  MK.izBuda();
  window.postMessage({ kaynak: 'sinyal-sayfa', tur: 'bitenler-onay', veri: { ids: l.map(b => b.id) } }, location.origin);
  kaydet();
  if (n) { islem('MEBBİS’e girildi (Yardımcı)', n + ' iş'); kaydet(); bildir(n + ' iş MEBBİS’e aktarıldı'); yenileFn(); }
}
// Yardımcı MEBBİS'te hata gördüğü işleri bildirir; aktarım merkezinde "Hata" olarak görünür
function hatalariIsle(l) {
  S.mebDurum = S.mebDurum || {};
  l.forEach(h => { const o = S.mebDurum[h.id]; S.mebDurum[h.id] = { durum: 'hata', zaman: h.zaman || Date.now(), not: h.not || '', is: 'ekranda', tur: o && o.tur, baslik: o && o.baslik }; MK.sonucYaz({ id: h.id, ok: false, not: h.not || '' }, { isId: 'ekranda', tur: (o && o.tur) || ({ ders: 'program' }[String(h.id).split('-')[0]] || String(h.id).split('-')[0]), baslik: (o && o.baslik) || '', kaynak: 'ekranda' }); });
  if (l.length) { kaydet(); bildir(`${l.length} iş MEBBİS’te hata verdi; MEB işlemleri › MEBBİS aktarımı ekranında görebilirsiniz`, 'uyari'); yenileFn(); }
}
// MEBBİS'ten gelen liste: amacına göre aktarım, karşılaştırma ya da sınav sonucu ekranına gider
function tabloGeldi(veri) {
  const sat = veri.satirlar, n = sat.length - 1;
  S.mebCekim = { ...(S.mebCekim || {}), [veri.amac || 'liste']: gun(0) + ' ' + new Date().toTimeString().slice(0, 5) }; kaydet();
  if (veri.amac === 'mutabakat') return import('./ozellik.js?v=234').then(m => { if (m.mutabakatTablodan(sat, 'MEBBİS · ' + (veri.baslik || 'liste'))) { location.hash = '#/meb/mutabakat'; yenileFn(); } });
  if (veri.amac === 'sinav') return sinavSonucuAl(sat);
  if (veri.amac === 'grup') return GR.mebbisGruplariAl(sat);
  const t = ['kursiyer', 'taksit', 'arac', 'ogretmen'].includes(veri.amac) ? veri.amac : turTahmin(sat[0] || []);
  import('./sayfalar5.js?v=234').then(m => { location.hash = '#/ayarlar/aktarim'; setTimeout(() => { m.aktarimYukle(sat, t, 'MEBBİS'); bildir(`MEBBİS’ten ${n} satırlık liste geldi; sütunları kontrol edip aktarın`); }, 300); });
}
// Sınav sonuç listesi: TC ile kursiyer bulunur, en uygun oturumun sonuç penceresi dolu açılır; kaydetmeyi kullanıcı yapar
const nrm = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
export function sinavSonucuAl(sat) {
  const bas = sat[0].map(nrm), bul = (...l) => bas.findIndex(h => l.some(x => h.includes(x)));
  const iTc = bul('tc', 'kimlik'), iSon = bul('sonuc', 'durum', 'basari', 'netice'), iPuan = bul('puan', 'notu'), iTar = bul('tarih');
  if (iTc < 0) return bildir('Listede TC kimlik numarası sütunu bulunamadı', 'uyari');
  if (iSon < 0 && iPuan < 0) return bildir('Listede sonuç ya da puan sütunu bulunamadı', 'uyari');
  // MEB-045: sonuç metni mebnorm'dan geçer (BAŞARISIZ önce aranır); metin yoksa puan (geçme kurs ayarından, yoksa 70); ikisi de boşsa sonuç yok (SNV-089: girmedi sayılmaz)
  const AD = { gecti: 'Geçti', kaldi: 'Kaldı', girmedi: 'Girmedi' }, gecme = +((S.kurs || {}).esinavGecmePuani) || 70;
  const deger = (r) => {
    const ham = iSon >= 0 ? r[iSon] : '', pm = iPuan >= 0 ? String(r[iPuan] == null ? '' : r[iPuan]).trim().replace(',', '.') : '', p = pm !== '' && isFinite(+pm) && +pm >= 0 ? Math.round(+pm) : null;
    const s = MN.esinavSonuc(p, ham, gecme); if (!s) return null;
    return s === 'girmedi' ? { v: 'Girmedi' } : { v: AD[s], puan: p };
  };
  const tarihIso = MN.tarihIso;
  // SNV-006/087/088: sonuçlar oturum oturum; oturumda olmayan kursiyer ayrı satır (kendiliğinden eklenmez); mdSinyal'de hiç olmayan T.C. yalnız sayılır
  const oturum = {}, farklar = [], disarida = [], yok = new Set(); let bulunamayan = 0;
  sat.slice(1).forEach(r => {
    const { tc, gecerli } = MN.tcTemiz(r[iTc]), k = gecerli && S.kursiyerler.find(x => x.tc === tc), d = deger(r); if (!d) { bulunamayan++; return; } if (!k) { if (gecerli) yok.add(tc); else bulunamayan++; return; }
    const t = iTar >= 0 ? tarihIso(r[iTar]) : '';
    const s = sbSinav(S.sinavlar).filter(x => (x.kursiyerler || []).includes(k.id) && !(x.sonuc || {})[k.id] && fark(x.tarih) <= 0 && (!t || x.tarih === t)).sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
    if (!s) { // SNV-086: sonucu girilmiş oturumda MEBBİS farklı diyorsa (ör. Geçti → Kaldı) düzeltme önerilir
      const g = sbSinav(S.sinavlar).find(x => (x.kursiyerler || []).includes(k.id) && (x.sonuc || {})[k.id] && fark(x.tarih) <= 0 && (!t || x.tarih === t));
      if (g && g.sonuc[k.id] !== d.v) farklar.push({ sid: g.id, kid: k.id, d, yerel: g.sonuc[k.id] }); else if (!g) { if (t) disarida.push({ kid: k.id, t, d }); else bulunamayan++; } return; }
    (oturum[s.id] = oturum[s.id] || {})[k.id] = d;
  });
  if (farklar.length) setTimeout(() => farkliSonuclar(farklar), 900);
  SONUC_AKIS = { oturum, disarida, yok: yok.size, bulunamayan, girilen: new Set() };
  const sira = Object.keys(oturum);
  if (!sira.length && !disarida.length) return farklar.length ? undefined : bildir(`Listedeki kişilerden sonucu girilmemiş bir sınav oturumunda olan bulunamadı${yok.size ? ` · MEBBİS’te ${yok.size} kişi var, mdSinyal’de yok` : ''}`, 'uyari');
  location.hash = '#/sinavlar';
  // tek oturum ve başka satır yoksa doğrudan sonuç penceresi (eski akış)
  if (sira.length === 1 && !disarida.length) { const s = S.sinavlar.find(x => x.id === sira[0]), hazir = oturum[sira[0]];
    return import('./sayfalar2.js?v=234').then(m => setTimeout(() => { m.sonucGir(s, hazir); bildir(`${Object.keys(hazir).length} kursiyerin sonucu MEBBİS’ten dolduruldu; kontrol edip “Sonuçları kaydet”e basın.${bulunamayan ? ` ${bulunamayan} satır eşleşmedi.` : ''}${yok.size ? ` MEBBİS’te ${yok.size} kişi var, mdSinyal’de yok.` : ''}`); }, 400)); }
  setTimeout(sonucAkisi, 400);
}
// SNV-006: birden çok sınav günü — her gün bir kart; 'Sonuçları gir' o oturumun penceresini dolu açar, kaydedince buraya döner ve sıradaki gün açılır
let SONUC_AKIS = null;
const tarihKisa = t => t ? `${+t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '';
export function sonucAkisi(acilacak) {
  const A = SONUC_AKIS; if (!A) return;
  const l = Object.entries(A.oturum).map(([sid, h]) => ({ s: S.sinavlar.find(x => x.id === sid), h })).filter(x => x.s).sort((a, b) => a.s.tarih.localeCompare(b.s.tarih));
  l.forEach(x => { if (Object.keys(x.h).every(kid => (x.s.sonuc || {})[kid])) A.girilen.add(x.s.id); });
  const bekleyen = l.filter(x => !A.girilen.has(x.s.id)), toplam = l.reduce((t, x) => t + Object.keys(x.h).length, 0);
  const ac = x => { kapatPencere(); import('./sayfalar2.js?v=234').then(m => setTimeout(() => m.sonucGir(x.s, x.h, { sonra: () => { A.girilen.add(x.s.id); setTimeout(() => sonucAkisi(true), 300); } }), 200)); };
  if (acilacak === true && bekleyen.length && !A.disarida.length) return ac(bekleyen[0]);
  const dis = A.disarida.filter(x => { const k = kursiyer(x.kid); return k && !sbSinav(S.sinavlar).some(s => s.tarih === x.t && (s.kursiyerler || []).includes(k.id)); });
  pencere({ baslik: 'MEBBİS sınav sonuçları', genis: true, icerik: `<p class="sa-ozet"><b>${l.length} sınav günü · ${toplam} sonuç</b>${bekleyen.length ? ` · ${bekleyen.length} gün bekliyor` : ' · hepsi girildi'}</p>
      <div class="sa-kartlar">${l.map(x => { const n = Object.keys(x.h).length, g = A.girilen.has(x.s.id), gecen = Object.values(x.h).filter(d => d.v === 'Geçti').length;
        return `<div class="sa-kart ${g ? 'tamam' : ''}"><div><b>${e(x.s.tur)} · ${tarihUzun(x.s.tarih)}</b><small>${n} sonuç · ${gecen} geçti · ${n - gecen} kaldı ya da girmedi</small></div>${g ? `<span class="rozet rozet-yesil">Girildi</span>` : `<button class="dg ${x === bekleyen[0] ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" data-sa-ac="${x.s.id}">Sonuçları gir</button>`}</div>`; }).join('')}</div>
      ${dis.length ? `<h4 class="sa-bas">Oturumda olmayanlar (${dis.length})</h4><p style="font-size:13px;color:var(--soluk);margin:0 0 6px">MEBBİS’te o gün sınava girmiş görünüyor, mdSinyal oturumunda yok. Kendiliğinden eklenmez; doğruysa ekleyin, sonucu o oturumda girin.</p>
        <ul class="liste">${dis.map((x, i) => { const k = kursiyer(x.kid), ot = sbSinav(S.sinavlar).filter(s => s.tarih === x.t); return `<li><div style="flex:1;min-width:0"><b>${e(tamAd(k))}</b><small style="display:block;color:var(--soluk)">${tarihKisa(x.t)} sınavında MEBBİS’te var, mdSinyal oturumunda yok · MEBBİS: ${e(x.d.v)}${x.d.puan != null ? ' ' + x.d.puan : ''}</small></div>${ot.length ? `<button class="dg dg-cizgi dg-kucuk" data-sa-ekle="${i}" data-sa-ot="${ot[0].id}">Oturuma ekle</button>` : `<button class="dg dg-cizgi dg-kucuk" data-sa-yeni="${i}">Oturum aç ve ekle</button>`}</li>`; }).join('')}</ul>` : ''}
      ${A.yok ? `<p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>MEBBİS’te ${A.yok} kişi var, mdSinyal’de yok; aktarılmaz.</span></p>` : ''}${A.bulunamayan ? `<p style="font-size:13px;color:var(--soluk);margin-top:6px">${A.bulunamayan} satır okunamadı.</p>` : ''}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${bekleyen.length ? `<button class="dg dg-ana" data-sa-ac="${bekleyen[0].s.id}">Sıradaki: ${tarihKisa(bekleyen[0].s.tarih)}</button>` : ''}`,
    onAc(p) {
      p.addEventListener('click', ev => { const a = ev.target.closest('[data-sa-ac]'); if (a) return ac(l.find(x => x.s.id === a.dataset.saAc));
        const ek = ev.target.closest('[data-sa-ekle],[data-sa-yeni]'); if (!ek) return; const x = dis[+(ek.dataset.saEkle ?? ek.dataset.saYeni)], k = kursiyer(x.kid);
        let s = ek.dataset.saOt ? S.sinavlar.find(y => y.id === ek.dataset.saOt) : null;
        if (!s) { const tur = x.d.puan != null ? 'e-Sınav' : 'Direksiyon'; s = { id: 's' + Date.now(), tur, tarih: x.t, saat: tur === 'Direksiyon' ? '08:30' : '', yer: '', kursiyerler: [], sonuc: {} }; S.sinavlar.push(s); islem('Sınav oturumu açtı', tur + ' · ' + tarihKisa(x.t) + ' · MEBBİS sonucundan'); }
        if (!s.kursiyerler.includes(k.id)) s.kursiyerler.push(k.id);
        A.oturum[s.id] = { ...(A.oturum[s.id] || {}), [k.id]: x.d }; A.girilen.delete(s.id); A.disarida = A.disarida.filter(y => y !== x);
        islem('MEBBİS sonucundaki kursiyeri oturuma ekledi', tamAd(k) + ' · ' + s.tur + ' ' + tarihKisa(s.tarih)); kaydet(); bildir(`${tamAd(k)} ${tarihKisa(s.tarih)} oturumuna eklendi`); kapatPencere(); setTimeout(() => sonucAkisi(), 200); });
    } });
}
// SNV-086: MEBBİS'teki sonuç mdSinyal'dekinden farklı: her satırda 'Düzelt' sonucDuzelt'i MEBBİS sonucuyla açar (aşama, mezuniyet ve belge adımları geri alınır)
function farkliSonuclar(l) {
  pencere({ baslik: 'MEBBİS’le farklı sınav sonuçları', genis: true, icerik: `<p style="font-size:14px;margin-bottom:8px">${l.length} öğrencinin sonucu MEBBİS’te farklı. Sonuç sonradan değişmiş olabilir (ör. itiraz); kontrol edip düzeltin.</p><ul class="liste">${l.map((x, i) => { const k = kursiyer(x.kid), s = S.sinavlar.find(y => y.id === x.sid); return `<li><div style="flex:1;min-width:0"><b>${e(tamAd(k))}</b><small style="display:block;color:var(--soluk)">${e(s.tur)} · ${e(s.tarih.split('-').reverse().join('.'))} · mdSinyal: <b>${e(x.yerel)}</b> → MEBBİS: <b style="color:${x.d.v === 'Geçti' ? 'var(--yesil)' : 'var(--kirmizi)'}">${e(x.d.v)}</b>${x.d.puan != null ? ' (' + x.d.puan + ')' : ''}</small></div><button class="dg dg-ana dg-kucuk" data-mf="${i}">Düzelt</button></li>`; }).join('')}</ul>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>',
    onAc(p) { p.querySelectorAll('[data-mf]').forEach(b => b.addEventListener('click', () => { const x = l[+b.dataset.mf], k = kursiyer(x.kid), s = S.sinavlar.find(y => y.id === x.sid); kapatPencere(); import('./sayfalar2.js?v=234').then(m => setTimeout(() => m.sonucDuzelt(s, k, { ...x.d, kaynak: 'mebbis' }), 250)); })); } });
}
// Kurs verisi ve oturum hazır mı (Yardımcı'dan gelen sonuç ancak o zaman işlenir)
const hazir = () => !!(S && S.kursiyerler && oturum.kullanici);
// harita-durum sayfa açılışında bir kez gelir, çoğu zaman girişten önce: bekletilir, kurs verisi gelince işlenir
let haritaBekleyen = null;
export function bekleyenleriIsle() {
  if (!haritaBekleyen || !hazir() || !MK.onaylayabilir()) return false;
  const v = haritaBekleyen; haritaBekleyen = null;
  return MK.haritaDurum(v);
}
export function eklentiBaslat() {
  window.addEventListener('message', ev => {
    if (ev.source !== window || ev.origin !== location.origin || !ev.data || ev.data.kaynak !== 'sinyal-eklenti') return;
    const { tur, veri } = ev.data;
    if (tur === 'merhaba') { const ilk = !eklenti.var; Object.assign(eklenti, { var: true, surum: veri && veri.surum, ozellik: (veri && veri.ozellik) || [] }); yardimciIzi(); if (ilk) yenileFn(); }
    if (tur === 'harita-durum' && veri) { eklenti.harita = veri; haritaBekleyen = veri; if (bekleyenleriIsle()) yenileFn(); }
    else if (haritaBekleyen && bekleyenleriIsle()) yenileFn();
    if (tur === 'tablo' && veri && veri.satirlar) tabloGeldi(veri);
    if (tur === 'bitenler' && Array.isArray(veri)) bitenleriIsle(veri);
    if (tur === 'hatalar' && Array.isArray(veri)) hatalariIsle(veri);
    if (tur === 'toplu-durum' && veri && S && S.kursiyerler && oturum.kullanici) import('./mebtoplu.js?v=234').then(m => m.durumGeldi(veri));
    // Yardımcı 1.12 → mdSinyal (eklenti/sinyal.js iletir): yarım iş varken yeni iş reddi, kayıp yükün yeniden istenmesi, ekran değişti
    if (tur === 'toplu-alindi' && veri && veri.mesgul && oturum.kullanici) import('./mebtoplu.js?v=234').then(m => m.mesgulGeldi(veri));
    if (tur === 'toplu-yuk-iste' && veri && S && S.kursiyerler && oturum.kullanici) import('./mebtoplu.js?v=234').then(m => m.yukIste(veri));
    if (tur === 'toplu-yuk-alindi' && veri && oturum.kullanici) import('./mebtoplu.js?v=234').then(m => m.yukAlindi(veri));
    if (tur === 'ekran-degisti' && veri && S && S.kursiyerler && oturum.kullanici) { if (MK.ekranDegisti(Array.isArray(veri.ekranlar) ? veri.ekranlar : [veri], veri.id || '')) yenileFn(); }
  });
  sayfadan('ping', {});
  setTimeout(() => sayfadan('ping', {}), 1500);
  // girişten önce gelen harita-durum: Yardımcı'dan yeni ileti gelmese de giriş yapılınca işlensin (MEB ekranı açılmasa da kayda düşer)
  setInterval(() => { if (haritaBekleyen && bekleyenleriIsle()) yenileFn(); }, 5000);
  document.addEventListener('click', ev => {
    const g = ev.target.closest('[data-meb-gonder]'); if (g) { ev.preventDefault(); ev.stopPropagation(); return yardimciyaGonder(g.dataset.mebGonder.split(',').filter(Boolean)); }
    const c = ev.target.closest('[data-meb-cekbtn]'); if (c) { ev.preventDefault(); ev.stopPropagation(); return mebbistenCek(c.dataset.mebCekbtn); }
  }, true);
}
