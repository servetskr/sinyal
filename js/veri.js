// mdSinyal demo verisi: tarihler bugüne göre üretilir, tarayıcıda saklanır.
import { listeBul, listeDurumu, kursunIli, satirBul, tabanTutar, sinifSatiri, ozelSatir, donemi } from './taban.js?v=234';
let ANAHTAR = 'sinyal-demo-v20';
// Usta öğreticinin ders sonunda puanladığı beceriler
export const BECERI = [['kalkis', 'Kalkış ve duruş'], ['serit', 'Şerit ve ayna'], ['kavsak', 'Kavşak ve öncelik'], ['park', 'Park'], ['rampa', 'Rampa ve yokuş']];
// Direksiyon dersi konuları: takip formunda zorunlu (MTSK Yön. md.17/3-d). Başlıklar sınavdaki değerlendirme formlarının (EK-4 otomobil, EK-3 motosiklet) bölümleriyle aynı.
export const DERS_KONU = [['hazirlik', 'Araç tanıma ve sürüşe hazırlık'], ['calistirma', 'Aracı çalıştırma, kalkış ve duruş'], ['pedal', 'Kumanda pedalları ve vites'], ['direksiyon', 'Direksiyon hakimiyeti'], ['serit', 'Şerit izleme ve değiştirme'], ['kavsak', 'Kavşaklar ve dönüşler'], ['park', 'Geri park etme'], ['donus', 'Dar alanda geri dönüş'], ['geri', 'Geri düz gitme ve L dönüş'], ['rampa', 'Eğimli yolda kalkış'], ['sollama', 'Öndeki aracı geçme ve geçilme'], ['hiz', 'Hız kuralları ve takip mesafesi'], ['tali', 'Tali yolda sürüş'], ['fren', 'Ani fren'], ['ekonomik', 'Çevreye duyarlı, ekonomik sürüş'], ['gece', 'Gece sürüşü'], ['guzergah', 'Sınav güzergâhı ve genel tekrar']];
export const DERS_KONU_MOTOR = [['hazirlik', 'Araç tanıma ve sürüşe hazırlık'], ['calistirma', 'Aracı çalıştırma, kalkış ve duruş'], ['koni', 'Koniler arasından geçme'], ['sekiz', 'Sekiz çizme'], ['denge', 'Denge çizgisinden geçme'], ['udonus', 'Dar alanda (U) dönüş'], ['hizlanma', 'Hızlanma, yavaşlama ve durma'], ['engel', 'Engelden kaçma'], ['fren', 'Ani fren'], ['serit', 'Şerit izleme ve değiştirme'], ['kavsak', 'Kavşaklar ve dönüşler'], ['sollama', 'Öndeki aracı geçme ve geçilme'], ['hiz', 'Hız kuralları'], ['gece', 'Gece sürüşü'], ['guzergah', 'Sınav güzergâhı ve genel tekrar']];
const KONU_PLAN = [['hazirlik', 'calistirma'], ['calistirma', 'pedal'], ['direksiyon', 'serit'], ['serit', 'kavsak'], ['kavsak', 'hiz'], ['park', 'geri'], ['donus', 'park'], ['rampa', 'fren'], ['sollama', 'hiz'], ['tali', 'ekonomik'], ['gece'], ['gece', 'kavsak'], ['guzergah'], ['guzergah']];
const KONU_PLAN_MOTOR = [['hazirlik', 'calistirma'], ['koni', 'sekiz'], ['denge', 'udonus'], ['hizlanma', 'engel'], ['fren', 'serit'], ['kavsak', 'sollama'], ['hiz', 'gece'], ['guzergah']];
// Araç sınıfına göre beklenen yakıt tüketimi (L/100 km; B için kurs ayarı)
const BEKLENEN_TUKETIM = { C: 22, 'C-O': 22, A2: 3.5, A: 4.5, M: 2.5 };
export const motorSinif = sinif => /^(A|M)/.test(String(sinif || ''));
// Ders türleri: simülatör ve eğitim alanı saatleri 9/1/2025'ten beri asgari direksiyon saatine eklenir (MTSK Yön. değişikliği)
export const DERS_TUR_AD = { trafik: 'Direksiyon (trafikte)', alan: 'Eğitim alanı', simulator: 'Simülatör' };
// DIR-009: dersin eğitim türü (MEBBİS SKT03004 cmbEgitimTuru değeri). ad: MEBBİS'teki seçenek metni (yedek eşleşme), kod: seçenek değeri.
export const EGITIM_TURU = {
  normal: { kod: '1', ad: 'Normal Eğitim', kisa: 'Normal' },
  onSinav: { kod: '2', ad: 'Telafi Eğitim(Ön Sınav )', kisa: 'Telafi (ön sınav)' },
  ikinci: { kod: '3', ad: '2.Direksiyon Eğitimi', kisa: '2. direksiyon' },
  basarisiz: { kod: '4', ad: 'Başarısız Aday Eğitimi', kisa: 'Başarısız aday' },
};
// Teorik (SKT03003): 1 Normal, 2 Telafi Eğitim
export const TEORIK_EGITIM_TURU = { normal: { kod: '1', ad: 'Normal', kisa: 'Normal' }, telafi: { kod: '2', ad: 'Telafi Eğitim', kisa: 'Telafi' } };
// Uygulama sınav formu: M, A1, A2, A ve B1 EK-3 ile, diğer sınıflar EK-4 ile değerlendirilir
export const ek3Sinif = sinif => motorSinif(sinif) || String(sinif || '') === 'B1';
export const konuListesi = sinif => motorSinif(sinif) ? DERS_KONU_MOTOR : DERS_KONU;
// Kaçıncı derste hangi konular: kursun ders sayısına göre plana oranlanır (öneri; öğretmen değiştirir)
export function konuOner(sinif, no, toplam) { const p = motorSinif(sinif) ? KONU_PLAN_MOTOR : KONU_PLAN, i = Math.min(p.length - 1, Math.floor((Math.max(1, no) - 1) * p.length / Math.max(1, toplam || p.length))); return p[i]; }
const BECERI_KONU = { kalkis: 'calistirma', serit: 'serit', kavsak: 'kavsak', park: 'park', rampa: 'rampa' };
// Dersin konuları (takip formu): öğretmenin seçtiği; eski derslerde puanladığı beceriler
export function dersKonulari(d, sinif) { const l = konuListesi(sinif), ad = id => (l.find(x => x[0] === id) || DERS_KONU.find(x => x[0] === id) || [0, id])[1]; if (d.konular && d.konular.length) return d.konular.map(ad); if (d.beceri) return Object.keys(d.beceri).map(k => BECERI_KONU[k]).filter(Boolean).map(ad); return []; }
try { for (let i = 1; i < 20; i++) localStorage.removeItem('sinyal-demo-v' + i); } catch (x) { }

export const BUGUN = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
export const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const gun = n => { const d = new Date(BUGUN); d.setDate(d.getDate() + n); return iso(d); };
export const tarihOku = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fark = s => Math.round((tarihOku(s) - BUGUN) / 864e5);
// KVKK aydınlatma metni (kurs Ayarlar › KVKK'dan değiştirebilir): veri sorumlusu kurs; hukuki sebep, aktarım ve haklar.
// Veri konumu (ülke/bölge adı) müşteriye görünen metne yazılmaz: "bulut altyapısı"; yurt dışı aktarım (KVKK m.9) bölge adı vermeden belirtilir.
export const aydinlatmaMetni = () => S.kurs.aydinlatma || `${S.kurs.ad || 'Kursumuz'} (veri sorumlusu) olarak kimlik, iletişim, öğrenim, sağlık raporu ve adli sicil bilgilerinizi; ders, sınav ve ödeme kayıtlarınızı sürücü kursu eğitiminin yürütülmesi, sözleşmenin ifası ve MEB mevzuatından doğan yükümlülükler (MEBBİS kaydı, ders programı, sınav bildirimi) için işliyoruz (KVKK m.5/2-c, ç; m.6). Ders hatırlatmaları ve ödeme takibi kursun meşru menfaatine dayanır; kampanya ve tanıtım mesajları yalnız izninizle gönderilir. Verileriniz kursun kullandığı mdSinyal yazılımının bulut altyapısında (Google, Cloudflare ve Meta/WhatsApp hizmetleri) tutulur; bu hizmetlerin sunucuları yurt dışında bulunduğu için verileriniz yurt dışına aktarılır (KVKK m.9). Yetkili kurumlar (MEB, vergi idaresi) dışında paylaşılmaz ve mevzuattaki süre boyunca saklanır. Sözleşme uzaktan (WhatsApp linkiyle) imzalanırsa imza zamanı, IP adresi ve cihaz bilgisi kanıt amacıyla kaydedilir ve sözleşmeyle aynı süre saklanır. KVKK m.11 kapsamındaki haklarınız (bilgi isteme, düzeltme, silme, itiraz) için kursa başvurabilirsiniz; ayrıntılar: mdsinyal.com/gizlilik.html`;
// Ders iptali ve değişikliği: ders saatinden en az 24 saat önce (takvim günü değil, gerçek saat)
export const dersKalanSaat = d => (new Date(d.tarih + 'T' + (/^\d{2}:\d{2}$/.test(d.saat || '') ? d.saat : '00:00') + ':00') - Date.now()) / 36e5;
// Para girişi: "1.250,50" → 1250.5, "24.000" → 24000, "24,000.00" → 24000; eksi ve geçersiz değer 0 olur
// Aynı TC ile açık kayıt: aynı sınıfta kayıt durdurulur, başka sınıfta açık kayıt varsa uyarılır
export function ayniTcKayit(tc, sinif, haric) { const t = String(tc || '').trim(); if (!/^\d{11}$/.test(t)) return { ayni: null, baska: null };
  const acik = (S.kursiyerler || []).filter(x => x !== haric && x.tc === t && !x.kapali && x.asama !== 'Ehliyet');
  return { ayni: acik.find(x => x.sinif === sinif) || null, baska: acik.find(x => x.sinif !== sinif) || null }; }
export function tutarOku(v) {
  if (typeof v === 'number') return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
  let t = String(v ?? '').replace(/[^\d.,]/g, ''); if (!t) return 0;
  const sonV = t.lastIndexOf(','), sonN = t.lastIndexOf('.');
  if (sonV >= 0 && sonN >= 0) t = sonV > sonN ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (sonV >= 0) t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(/,/g, '.').replace(/\.(?=.*\.)/g, '');
  else if (sonN >= 0) t = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t.replace(/\.(?=.*\.)/g, '');
  const n = Math.round(parseFloat(t) * 100) / 100; return isFinite(n) && n > 0 ? n : 0;
}
// PAR-034: taksit planı kurs ayarları — yuvarlama (₺; varsayılan 50), küsurat ilk ya da son taksite (varsayılan son), taksitler arası ay (varsayılan 1),
// en çok taksit: ön büro S.kurs.taksitEnCok (varsayılan 5), müdür en az 12 (SOR-079). Plan tek borçtur; tahsilat sıradaki açık taksiti kapatır.
export const taksitAyar = () => { const K = S.kurs || {}; return { yuvarla: [1, 10, 50, 100].includes(+K.taksitYuvarla) ? +K.taksitYuvarla : 50, kusurat: K.taksitKusurat === 'ilk' ? 'ilk' : 'son', aralik: Math.max(1, Math.min(6, Math.floor(+K.taksitAralik) || 1)), enCok: Math.max(1, Math.min(24, Math.floor(+K.taksitEnCok) || 5)) }; };
export const taksitSiniri = () => { const a = taksitAyar(); let m = false; try { m = !!(oturum.kullanici && oturum.kullanici.rol === 'mudur'); } catch (x) { } return m ? Math.max(12, a.enCok) : a.enCok; };
export const taksitVade = (bas, i, a = taksitAyar()) => ayEkle(bas, (i + 1) * a.aralik);
// Taksit bölme: yuvarlama birimine yuvarlanır, küsurat seçilen taksite eklenir; sıfır liralık taksit oluşmaz (gerekirse taksit sayısı azalır)
export function taksitBol(top, n, a = taksitAyar()) { top = Math.round(top); if (top <= 0) return []; const y = a.yuvarla || 50; n = Math.max(1, Math.min(n || 1, Math.floor(top / y) || 1)); const p = Math.floor(top / n / y) * y, k = top - p * n, j = a.kusurat === 'ilk' ? 0 : n - 1; return Array.from({ length: n }, (_, i) => i === j ? p + k : p); }
export const iptalEdilebilir = d => !!d && d.durum === 'Planlandı' && dersKalanSaat(d) >= 24;
// Kurs kapalı günleri: Pazar, sabit resmî tatiller ve dini bayramlar (kurs Ayarlar'dan ek kapalı gün girer).
export const TATILLER = ['01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29'];
// Dini bayramlar (Diyanet takvimi; arife yarım gün olduğu için kapalı sayılmaz). Her yıl eklenmeli: 2029 için 2028 ortasında Diyanet takvimine bakın.
// 2028 kaynağı: Diyanet İşleri Başkanlığı, vakithesaplama.diyanet.gov.tr/icerik.php?icerik=185 (2028 dini günler; 16.11.2026'da okundu):
//   Ramazan Bayramı 26-28 Şubat 2028 (arife 25 Şubat Cuma), Kurban Bayramı 5-8 Mayıs 2028 (arife 4 Mayıs Perşembe)
const BAYRAMLAR = ['2026-03-20', '2026-03-21', '2026-03-22', '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30', '2027-03-09', '2027-03-10', '2027-03-11', '2027-05-16', '2027-05-17', '2027-05-18', '2027-05-19',
  '2028-02-26', '2028-02-27', '2028-02-28', '2028-05-05', '2028-05-06', '2028-05-07', '2028-05-08'];
// S yüklenirken (demo üretimi) de çağrılır: S henüz tanımlı değilse kursa özel kapalı gün yok sayılır
const kursKapaliMi = t => { try { return !!(S && S.kurs && Array.isArray(S.kurs.kapaliGunler) && S.kurs.kapaliGunler.includes(t)); } catch (x) { return false; } };
// DIG-002: kursa özel kapalı gün (S.kurs.kapaliGunler, Ayarlar › MEB kuralları): ders planlanmaz (onayla eklenir), MEB süresi değişmez
export const kapaliGun = t => tarihOku(t).getDay() === 0 ? 'Pazar' : (TATILLER.includes(t.slice(5)) || BAYRAMLAR.includes(t)) ? 'Resmî tatil' : kursKapaliMi(t) ? 'Kurs kapalı' : null;
// Arife (yarım gün): Ramazan ve Kurban bayramlarının bir önceki günü + 28 Ekim (cumhuriyet bayramı arifesi). Kurs açık günü sayılır (kapaliGun),
// MEB iş günü sayılmaz (mebIsGunuMu; eyup-sorular-cevaplar.md madde 11: yarım günlerin nasıl sayılacağı yazmıyor, teyit gelene kadar son tarih erkene çekilir).
const ARIFELER = BAYRAMLAR.filter(t => { const d = tarihOku(t); d.setDate(d.getDate() - 1); return !BAYRAMLAR.includes(iso(d)); }).map(t => { const d = tarihOku(t); d.setDate(d.getDate() - 1); return iso(d); });
export const arifeMi = t => ARIFELER.includes(t) || t.slice(5) === '10-28';
// Kursun girdiği idari izin günleri (Cumhurbaşkanlığı genelgesi; S.kurs.idariIzin ['yyyy-aa-gg', ...]): MEB iş günü sayılmaz (madde 11, teyit bekliyor)
export const idariIzinMi = t => !!(S && S.kurs && Array.isArray(S.kurs.idariIzin) && S.kurs.idariIzin.includes(t));
// Kurs açık günü (ders planlama ve demo): Pazar ve tatiller hariç, Cumartesi açık. MEB süreleri bununla değil mebIsGunuMu ile sayılır.
export const isGunuIleri = t => { const d = tarihOku(t); while (kapaliGun(iso(d))) d.setDate(d.getDate() + 1); return iso(d); };

// Sınıflar: varsayılanlar; kurs Ayarlar › Sınıf ve ücretler'den ücret, saat, yaş ve hangi sınıfları verdiğini değiştirir (S.kurs.siniflar'da kalıcı).
// teyit: ders saatleri ve yaş yönetmelikten varsayılan; kurs kendi il MEM uygulamasıyla teyit etmeli.
// Direksiyon: ilk kez belge alan için alanda/simülatörde en az 2 saat + akan trafik asgarisi (MTSK Yön. md.7/1, RG 9/7/2024; 9/1/2025'ten beri toplama sayılır).
// G: yalnız operatör belgeliler kaydolur, direksiyon dersi yok (md.6/2, 12/3-b). Yaşlar KTY md.76 (A: A2 ile 20, A2'siz 24; F 18).
export const SINIF_VARSAYILAN = {
  'M': { ad: 'M · Motorlu bisiklet', ucret: null, teorik: 34, direksiyon: 14, yas: 16, tur: 'ehliyet', aktif: false, teyit: true },
  'A1': { ad: 'A1 · Hafif motosiklet', ucret: null, teorik: 34, direksiyon: 14, yas: 16, tur: 'ehliyet', aktif: false, teyit: true },
  'A2': { ad: 'A2 · Motosiklet', ucret: 18500, teorik: 34, direksiyon: 14, yas: 18, tur: 'ehliyet', aktif: true },
  'A': { ad: 'A · Motosiklet (sınırsız)', ucret: null, teorik: 34, direksiyon: 14, yas: 20, yasA2siz: 24, tur: 'ehliyet', aktif: false, teyit: true },
  'B1': { ad: 'B1 · Dört tekerlekli motosiklet', ucret: null, teorik: 34, direksiyon: 14, yas: 16, tur: 'ehliyet', aktif: false, teyit: true },
  'B': { ad: 'B · Manuel', ucret: 24000, teorik: 34, direksiyon: 16, yas: 18, tur: 'ehliyet', aktif: true },
  'B-O': { ad: 'B · Otomatik', ucret: 26500, teorik: 34, direksiyon: 16, yas: 18, tur: 'ehliyet', aktif: true },
  // B Engelli: engel durumuna göre aparatlı ya da otomatik araç (raporundaki şartları taşıyan araç, MTSK Yön. md.7/5); il taban listelerinde ayrı satır.
  // Saat ve yaş B ile aynı; md.39 tablolarında B sayılır (anaSinif). Kendi aracıyla eğitimde direksiyon ücretinin yarısı ödenir (md.7/5, k.kendiArac).
  'B-EN': { ad: 'B · Engelli', ucret: null, teorik: 34, direksiyon: 16, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'BE': { ad: 'BE · Römorklu otomobil', ucret: null, teorik: 34, direksiyon: 8, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'C1': { ad: 'C1 · Hafif kamyon', ucret: null, teorik: 34, direksiyon: 12, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'C1E': { ad: 'C1E · Römorklu hafif kamyon', ucret: null, teorik: 34, direksiyon: 8, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'C': { ad: 'C · Kamyon', ucret: 31000, teorik: 34, direksiyon: 22, yas: 21, tur: 'ehliyet', aktif: true },
  'CE': { ad: 'CE · Çekici (tır)', ucret: null, teorik: 34, direksiyon: 8, yas: 21, tur: 'ehliyet', aktif: false, teyit: true },
  'D1': { ad: 'D1 · Minibüs', ucret: null, teorik: 34, direksiyon: 9, yas: 21, tur: 'ehliyet', aktif: false, teyit: true },
  'D1E': { ad: 'D1E · Römorklu minibüs', ucret: null, teorik: 34, direksiyon: 8, yas: 21, tur: 'ehliyet', aktif: false, teyit: true },
  'D': { ad: 'D · Otobüs', ucret: null, teorik: 34, direksiyon: 16, yas: 24, tur: 'ehliyet', aktif: false, teyit: true },
  'DE': { ad: 'DE · Römorklu otobüs', ucret: null, teorik: 34, direksiyon: 8, yas: 24, tur: 'ehliyet', aktif: false, teyit: true },
  'F': { ad: 'F · Traktör', ucret: null, teorik: 34, direksiyon: 14, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'G': { ad: 'G · İş makinesi', ucret: null, teorik: 34, direksiyon: 0, yas: 18, tur: 'ehliyet', aktif: false, teyit: true },
  'SRC1': { ad: 'SRC1 · Uluslararası yolcu taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC2': { ad: 'SRC2 · Yurt içi yolcu taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC3': { ad: 'SRC3 · Uluslararası eşya taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC4': { ad: 'SRC4 · Yurt içi eşya taşımacılığı', ucret: null, teorik: 40, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'SRC5': { ad: 'SRC5 · Tehlikeli madde taşımacılığı', ucret: null, teorik: 24, direksiyon: 0, yas: 21, tur: 'src', aktif: false, teyit: true },
  'OP': { ad: 'İş makinesi operatörlüğü', ucret: null, teorik: 40, direksiyon: 16, yas: 18, tur: 'operator', aktif: false, teyit: true },
  // 100 ceza puanı eğitimi (KTK md.118): belgesi geri alınan sürücünün teorik eğitimi; direksiyon yok. 34 saat il taban listesinden (Eskişehir 2026 F11).
  // Bu sınıfa kaydolan kursiyer KTK md.118 işaretini kendiliğinden alır (araç kontenjanına sayılmaz). MEBBİS'e elle girilir (sertifika adı doğrulanmadı).
  'CEZA': { ad: 'Ceza · 100 ceza puanı eğitimi', ucret: null, teorik: 34, direksiyon: 0, yas: 18, tur: 'egitim', aktif: false, teyit: true },
};
export const SINIFLAR = JSON.parse(JSON.stringify(SINIF_VARSAYILAN));
export const aktifSiniflar = () => Object.entries(SINIFLAR).filter(([, v]) => v.aktif);
export const satistaSiniflar = () => aktifSiniflar().filter(([, v]) => v.ucret > 0);
/* ---------- MEB sayıları: öğrenciye özgü direksiyon saati, yaş, gece dersi, iş günü ---------- */
// v208'e kadarki varsayılan saatler: yeni kural tarihinden önce kaydolan kursiyerlerin saati bununla dondurulur (ders sayısı ve ilerleme geriye dönük bozulmasın)
const ESKI_DIREKSIYON = { A1: 14, A2: 14, A: 14, B1: 14, B: 14, 'B-O': 14, BE: 14, C1: 16, C1E: 16, C: 20, CE: 20, D1: 20, D1E: 20, D: 20, DE: 20, F: 14, OP: 16 };
// G dondurulmaz: G'de direksiyon eğitimi hiç yok (md.6/2, 12/3-b); sınıf düzeyindeki geçişler (e-sınav → Ehliyet) de 0 saati kullanıyor
// Bu tarihten (dahil) sonra kaydolan kursiyerler yeni saatlerle (md.7/1 ve md.39) hesaplanır; öncekiler eski saatte kalır. Müdür dosyadan tek tek yeni kurala geçirebilir.
export const DERS_KURAL_TARIH = '2026-11-17';
// Mevcut sürücü belgesi seçenekleri: 2016 sonrası 17 sınıf (KTY md.76) + eski tip E (KTY geçici md.10, Tablo 2)
// Eski belge ölçütü (Tablo 2): belge 01.01.2016'dan önce alınmış. KTY geçici md.10 RG 17/4/2015'te yayımlandı, 1/1/2016'da yürürlüğe girdi
// (RG 17/4/2015-29329 md.37/a; eyup-sorular-cevaplar.md madde 3). E sınıfında ayrıca 28/4/1997 ayrımı var; o ayrım kodda tutulmuyor.
export const ESKI_BELGE_TARIH = '2016-01-01';
export const eskiBelgeTarihi = t => /^\d{4}-\d{2}-\d{2}/.test(String(t || '')) && String(t).slice(0, 10) < ESKI_BELGE_TARIH;
export const MEVCUT_BELGELER = ['M', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'F', 'G', 'E'];
// MTSK Yön. md.39/1 Tablo 1 (mevcut belge → istenen sınıf): akan trafik saati. Boş hücre: tabloda değer yok.
const TABLO1 = {
  M: { A1: 12, A2: 12, A: 12, B1: 12, B: 14, F: 12 }, A1: { A2: 6, A: 6, B1: 6, B: 14, F: 12 }, A2: { A: 6, B1: 6, B: 14, F: 12 }, A: { B1: 6, B: 14, F: 12 },
  B1: { A1: 12, A2: 12, A: 12, B: 14, F: 12 }, B: { A1: 12, A2: 12, A: 12, BE: 6, C1: 10, C: 20, D1: 7, D: 14 }, BE: { A1: 12, A2: 12, A: 12, C1: 10, C: 20, D1: 7, D: 14 },
  C1: { A1: 12, A2: 12, A: 12, BE: 6, C1E: 6, C: 10, D1: 4, D: 10 }, C1E: { A1: 12, A2: 12, A: 12, C: 10, D1: 4, D: 10 },
  C: { A1: 12, A2: 12, A: 12, BE: 6, CE: 6, D1: 4, D: 7 }, CE: { A1: 12, A2: 12, A: 12, D1: 4, D: 7 },
  D1: { A1: 12, A2: 12, A: 12, BE: 6, C1: 5, C: 14, D: 7 }, D1E: { A1: 12, A2: 12, A: 12, C1: 5, C: 14, D: 7 },
  D: { A1: 12, A2: 12, A: 12, BE: 6, C1: 5, C: 10, D1E: 6, DE: 6 }, DE: { A1: 12, A2: 12, A: 12, C1: 5, C: 10 },
  F: { A1: 12, A2: 12, A: 12, B1: 12, B: 14 }, G: { A1: 12, A2: 12, A: 12, B1: 12, B: 14 },
};
// Tablo 2: KTY geçici md.10 kapsamındaki eski tip belgeler
const TABLO2 = {
  A1: { A2: 6, A: 6, B1: 6, B: 14, F: 12 }, A2: { B: 14, F: 12 }, B: { A1: 12, A2: 12, A: 12, BE: 6, C1: 5, C: 14, D: 7 },
  C: { A1: 12, A2: 12, A: 12, BE: 6, C1E: 6, CE: 6, D1E: 6, D: 7 }, D: { A1: 12, A2: 12, A: 12, DE: 6 },
  E: { A1: 12, A2: 12, A: 12, BE: 6, C1E: 6, D1E: 6, DE: 6 }, F: { A1: 12, A2: 12, A: 12, B1: 12, B: 14 }, G: { A1: 12, A2: 12, A: 12, B1: 12, B: 14 },
};
// Tablodaki sayı akan trafik saatidir (Tablo 1 başlığı; eyup-sorular-cevaplar.md madde 1) ve yönetmeliğin alt sınırıdır: elle girilen değer bunun altındaysa uyarılır.
// Toplamın "tablo + 2 saat alan ya da simülatör" olduğu metinde açıkça yazmıyor (madde 1, yorum): +2 eklenir ama "teyit bekliyor" görünür. Boş hücreler de teyit bekliyor.
// Hücreye özgü not: M→B1 akan trafikte en az 12 saat (il tablosundaki 8 saat yönetmeliğin altında kalıyor). B→A1 md.39/5 ayrıca (direksiyonHesap).
const TABLO_NOT = { 'M>B1': 'Akan trafikte en az 12 saat (md.39 Tablo 1); il listesinde görünen 8 saat yönetmeliğin altında kalıyor, mdSinyal 12 saati esas alır.' };
// +2 saatin dayanağı: ÖÖKGM 20/9/2024 MTSK açıklama yazısı md.20 (alan ya da simülatör eğitimi md.7'deki saatlere eklenerek yapılır); il taban listeleri de böyle sayıyor
const ARTI2_DAYANAK = 'ÖÖKGM 20/9/2024 açıklama yazısı md.20';
// Otomatikten manuele (md.39/2 "direksiyon eğitimi dersinin yarısı"): en tutarlı okuma md.7/1 akan trafik saatinin yarısı, +2 yok (madde 2; yorum, teyit bekliyor).
// Akan trafik = md.7/1'deki ilk kez belge saati − 2 (alan ya da simülatör). Yönetmelik değeri SINIF_VARSAYILAN'dan okunur (kursun Ayarlar'da değiştirdiği saatten değil).
// Saat ve ücrette il tablosu kullanılır (müdür dosyadan elle girer).
// B otomatik ve B Engelli md.39 tablolarında, deneyim ve otomatik/manuel hesabında B sayılır
export const anaSinif = sinif => sinif === 'B-O' || sinif === 'B-EN' ? 'B' : sinif;
export const otomatikAltSinir = sinif => { const S0 = SINIF_VARSAYILAN[anaSinif(sinif)] || {}, ilk = +S0.direksiyon || 0; return ilk > 2 ? Math.ceil((ilk - 2) / 2) : 0; };  // ders saati tam sayı: D1 (7/2 = 3,5) → 4
// Belge tarihinden n yıl sonrası (29 Şubat → 28 Şubat); tarih yoksa null. A2 ile A (KTY md.76/1-b) ve B ile A1 (md.39/5) için.
const tarihMi = t => /^\d{4}-\d{2}-\d{2}/.test(String(t || '')) ? String(t).slice(0, 10) : '';
const yilSonra = (bt, n) => { if (!tarihMi(bt)) return null; const d = tarihOku(tarihMi(bt)), g = d.getDate(); d.setDate(1); d.setFullYear(d.getFullYear() + n); d.setDate(Math.min(g, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d; };
const virgul = x => String(x).replace('.', ',');
const B_ICERIR = ['B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'E'];
const DENEYIM = { BE: B_ICERIR, C1: B_ICERIR, C: B_ICERIR, D1: B_ICERIR, D: B_ICERIR, C1E: ['C1', 'C1E', 'C', 'CE', 'E'], CE: ['C', 'CE', 'E'], D1E: ['D1', 'D1E', 'D', 'DE', 'E'], DE: ['D', 'DE', 'E'] };
const DENEYIM_AD = { BE: 'B', C1: 'en az B', C: 'en az B', D1: 'en az B', D: 'en az B', C1E: 'C1', CE: 'C', D1E: 'D1', DE: 'D' };
// KTY md.76/3 yaş istisnası: yalnız A, C, D ve D1 sınıflarında asgari yaş 20'ye iner (A'da 15 kW üstü için aranan 21 de 20 olur) ve önceki belge
// (deneyim, md.76/1-b) şartı aranmaz; CE, DE, C1, C1E, D1E, BE ve diğer sınıflarda değişmez. Yaş şartı hiç kalkmaz.
// Yararlananlar: emniyet okullarının ve TSK'nın ilgili okul/kurslarının öğrencileri ve mezunları, sürücü eğitimi veren yüksekokulların yalnız mezunları.
// Kesinleşti (KTY md.76/2-3, 2015 metni; eyup-sorular-cevaplar.md madde 14), teyit işareti yok.
// k.yasIstisna = { okul ('emniyet'|'tsk'|'yuksekokul'), durum ('ogrenci'|'mezun'), tur (ekranda görünen ad), not (dayanak belgesi), tarih, kim }.
// Yüksekokulda yalnız mezun yararlanır. Eski kayıtlarda okul yok (yalnız tur; ör. "Jandarma personeli", "Diğer"): md.76/3 personeli ya da başka
// durumları saymadığı için kapsam seçilene kadar yaşı indirmez; ön kontrolde ve dosyada "okul türünü seçin" görünür.
// Yaşa kayıt günü bakılır (MTSK md.10/1 KTY md.76'yı kayıt şartı yapar; madde 4): denetim kayıt formunda ve MEBBİS ön kontrolde bugünkü yaşla yapılır.
// Kayıt formu, kursiyer dosyası (şerit ve ön kontrol kartı) ve MEBBİS ön kontrol aynı işlevleri kullanır: asgariYasHesap, deneyimEksik, yasDenetim, mebOnKontrol.
export const YAS_ISTISNA_SINIF = ['A', 'C', 'D', 'D1'];
export const YAS_ISTISNA_YAS = 20;
export const yasIstisnaKapsar = sinif => YAS_ISTISNA_SINIF.includes(sinif);
// md.76/3 kapsamı: okul türü ve öğrenci/mezun (kayıt formu ve MEB istisnaları penceresi)
export const YAS_ISTISNA_OKUL = { emniyet: 'Emniyet okulu', tsk: 'TSK’nın ilgili okulu ya da kursu', yuksekokul: 'Sürücü eğitimi veren yüksekokul' };
export const YAS_ISTISNA_DURUM = { ogrenci: 'öğrencisi', mezun: 'mezunu' };
// İstisna kaydı neden yaşı indirmiyor (boş: kapsamda). Okul ve öğrenci/mezun seçili olmalı; yüksekokulda öğrenci yararlanamaz.
export const yasIstisnaSorun = yi => !yi ? '' : !YAS_ISTISNA_OKUL[yi.okul] ? 'okul türü seçilmedi' + (yi.tur ? ` (eski kayıt: ${yi.tur})` : '') : !YAS_ISTISNA_DURUM[yi.durum] ? 'öğrenci ya da mezun bilgisi seçilmedi' : yi.okul === 'yuksekokul' && yi.durum !== 'mezun' ? 'sürücü yüksekokulunda yalnız mezun yararlanır' : '';
export const yasIstisnaGecerli = yi => !!yi && !yasIstisnaSorun(yi);
export const yasIstisnaMetin = yi => !yi ? '' : yi.okul && YAS_ISTISNA_OKUL[yi.okul] ? `${YAS_ISTISNA_OKUL[yi.okul]} ${YAS_ISTISNA_DURUM[yi.durum] || ''}`.trim() : (yi.tur || 'istisna');
// KTY md.76/1-b: istenen sınıf için gereken önceki belge yoksa uyarı metni (engel değil). istisna: kursiyerde md.76/3 yaş istisnası var (kapsamdaki sınıfta şart aranmaz)
export function deneyimEksik(sinif, mevcut, istisna) { const h = anaSinif(sinif), l = DENEYIM[h]; if (!l || l.includes(mevcut) || (istisna && yasIstisnaKapsar(h))) return null; return `${h} sınıfı için ${DENEYIM_AD[h]} sınıfı sürücü belgesi gerekir (KTY md.76/1-b).`; }
const mevcutKod = m => (m && m !== 'Yok') ? String(m) : '';
// Sınıf ve mevcut belgeden asgari direksiyon saati: { saat, kaynak, teyit, alt (elle girilen değer için alt sınır), altDayanak, altNot }
// o: { otomatik, eski, belgeTarih (mevcut belgenin veriliş tarihi; B→A1 md.39/5) }
// DIR-002: kursun geçiş tablosu (Ayarlar › Sınıf ve ücretler). S.kurs.gecisSaat[anahtar] = saat; boş: mevzuat hesabı. Anahtar 'M>B1', eski belge 'B>C·eski', otomatikten manuele 'B-oto'.
// Yönetmelik alt sınırının altındaki değer kaydedilir ama ayarlarda, kursiyer dosyasında ve Mevzuat denetiminde uyarı olarak görünür.
export const gecisAnahtar = (m, h, o = {}) => m === h ? (o.otomatik ? h + '-oto' : '') : `${m}>${h}${o.eski || m === 'E' ? '·eski' : ''}`;
export function direksiyonHesap(sinif, mevcut, o = {}) {
  const r = mevzuatDireksiyon(sinif, mevcut, o), m = mevcutKod(mevcut), h = anaSinif(sinif), a = m && (SINIFLAR[sinif] || {}).direksiyon && ((SINIFLAR[sinif] || {}).tur || 'ehliyet') === 'ehliyet' ? gecisAnahtar(m, h, o) : '';
  const ov = a ? (((S || {}).kurs || {}).gecisSaat || {})[a] : null;
  if (ov == null || ov === '' || !isFinite(+ov)) return r;
  const sa = Math.max(0, Math.round(+ov)), alt = r.alt || 0, altinda = !!(alt && sa < alt);
  return { ...r, saat: sa, mevzuat: r.saat, teyit: false, kursTablo: true, altinda, kaynak: `Kursun geçiş tablosu (Ayarlar › Sınıf ve ücretler): ${sa} saat; mevzuat hesabı ${r.saat} saat` + (altinda ? `. Alt sınır ${virgul(alt)} saat (${r.altDayanak}); tablodaki değer bunun altında` : '') };
}
function mevzuatDireksiyon(sinif, mevcut, o = {}) {
  const S0 = SINIFLAR[sinif] || {}, ilk = +S0.direksiyon || 0, m = mevcutKod(mevcut);
  if (!ilk) return { saat: 0, kaynak: 'Bu sınıfta direksiyon eğitimi yok' };
  if ((S0.tur || 'ehliyet') !== 'ehliyet' || !m) return { saat: ilk, kaynak: 'İlk kez belge: 2 saat alan ya da simülatör + akan trafik (md.7/1)', teyit: !!S0.teyit && sinif === 'D1E' };
  const h = anaSinif(sinif);
  if (m === h) { if (!o.otomatik) return { saat: ilk, teyit: true, kaynak: `Zaten ${m} belgesi var; ilk kez belge saati kullanıldı.` };
    const alt = otomatikAltSinir(h);
    return { saat: ilk, teyit: true, alt, altDayanak: 'md.39/2; en tutarlı okumaya göre akan trafik saatinin yarısı, teyit bekliyor', kaynak: `Belgesi “sadece otomatik”: manuel için direksiyon eğitiminin yarısı (md.39/2). En tutarlı okumaya göre alt sınır akan trafik saatinin yarısı: ${virgul(alt)} saat, +2 eklenmez (teyit bekliyor). Saat ve ücrette il tablosu kullanılır: il MEM değerini dosyadan elle girin.` }; }
  const eski = !!o.eski || m === 'E', T = eski ? TABLO2 : TABLO1, v = (T[m] || {})[h];
  if (v == null) return { saat: ilk, teyit: true, kaynak: `${m} → ${h}: Tablo ${eski ? 2 : 1}’de değer yok; ilk kez belge saati kullanıldı (${['G>F', 'D1>D1E'].includes(m + '>' + h) ? 'tablonun bu hücresi boş; il MEM’in değerini Ayarlar › Sınıf ve ücretler › Geçiş saatleri’ne girin' : 'bu geçiş tabloda yer almıyor; il MEM’e sorun'}).` };
  let not = TABLO_NOT[m + '>' + h], alt = v, altDayanak = `md.39 Tablo ${eski ? 2 : 1}, akan trafik saati`, altNot = '';
  // md.39/5: KTY md.85/2 şartını taşıyan (en az 2 yıllık B belgeli) A1 adayına md.7'deki sürenin yarısı verilir; MEB A1 fark programı toplam 6 ders saati.
  // Belge 2 yılını doldurduysa alt sınır yarı süre; tarih yoksa alt sınır denetlenmez, bilgi notu çıkar.
  if (m === 'B' && h === 'A1') { const iki = yilSonra(o.belgeTarih, 2), yari = otomatikAltSinir('A1');
    if (!iki) { alt = 0; altNot = `md.39/5: B belgesi en az 2 yıllıksa A1 için süre yarıya iner (alt sınır ${virgul(yari)} saat); belge tarihini girin.`; not = altNot + ' İl tablosu 8.'; }
    else if (iki <= BUGUN) { alt = yari; altDayanak = 'md.39/5, yarı süre; MEB A1 fark programı 6 ders saati'; not = `md.39/5: B belgesi en az 2 yıllık; A1 için direksiyon eğitiminin yarısı verilir (MEB A1 fark programı toplam 6 ders saati, il tablosu 8).`; }
    else { not = `md.39/5 yarı süre, B belgesi ${iso(iki).split('-').reverse().join('.')} tarihinde 2 yılını doldurunca uygulanır.`; altDayanak += `; md.39/5 yarı süre B belgesi ${iso(iki).split('-').reverse().join('.')} tarihinde 2 yılını doldurunca`; } }
  return { saat: v + 2, teyit: m === 'B' && h === 'A1' && !yilSonra(o.belgeTarih, 2), alt, altDayanak, altNot, kaynak: `Farklı sınıf (md.39, Tablo ${eski ? 2 : 1}${eski ? ': belge 01.01.2016’dan önce' : ''}): ${v} saat akan trafik + 2 saat alan ya da simülatör (${ARTI2_DAYANAK})${not ? '. ' + not : ''}` };
}
// Ayarlar ekranı için geçiş satırları: hedef sınıf açık ve direksiyon eğitimi olan; Tablo 1, Tablo 2 (01.01.2016 öncesi belge) ve otomatikten manuele
export function gecisSatirlari() {
  const ac = Object.keys(SINIFLAR).filter(k => SINIFLAR[k].aktif && +SINIFLAR[k].direksiyon && (SINIFLAR[k].tur || 'ehliyet') === 'ehliyet' && anaSinif(k) === k), l = [];
  const ekle = (m, h, o) => { const r = mevzuatDireksiyon(h, m, o); l.push({ anahtar: gecisAnahtar(m, h, o), m, h, eski: !!o.eski, oto: !!o.otomatik, mevzuat: r.saat, alt: r.alt || 0, altDayanak: r.altDayanak || '', bos: !o.otomatik && ((o.eski ? TABLO2 : TABLO1)[m] || {})[h] == null, kaynak: r.kaynak }); };
  [[TABLO1, false], [TABLO2, true]].forEach(([T, eski]) => Object.keys(T).forEach(m => Object.keys(T[m]).filter(h => ac.includes(h)).forEach(h => ekle(m, h, { eski }))));
  [['G', 'F'], ['D1', 'D1E']].filter(([, h]) => ac.includes(h)).forEach(([m, h]) => ekle(m, h, {}));
  ac.forEach(h => ekle(h, h, { otomatik: true }));
  return l;
}
// DIR-009: dersin eğitim türü. Müdürün seçtiği (d.egitimTuru) önce gelir; yoksa kural sırası:
// 1) ikinci dört hak başladıysa (k.ikinciHak.tarih ya da MEBBİS'ten k.meb.ikinciDireksiyon) ve ders o gün ya da sonra: 'ikinci'
// 2) son uygulama sınavı Kaldı ya da Girmedi ve ders sınavdan sonra: 'basarisiz' (md.15)
// 3) hiç uygulama sınavına girmemiş, sınava hazır yazısı yok ve bu dersten önce gereken ders sayısı tamamlanmış: 'onSinav' (Telafi Eğitim, md.7/7)
// 4) öteki: 'normal'
export const hazirYazisiVar = k => !!((k.meb && /^\d{4}-\d{2}-\d{2}$/.test(k.meb.uygunluk || '')) || (k.hazirYazi && k.hazirYazi.yuklendi));
// DIG-027: öğrenci başına ders dizini (500 öğrenci × 9.000 derste her hesapta bütün listeyi taramamak için). Dizi değişince (başka dizi, uzunluk,
// ilk/son kayıt) yeniden kurulur; ders nesneleri aynı olduğu için durum ve tarih değişiklikleri kendiliğinden görünür.
let dIdx = null, dIdxAnahtar = null;
export const dersDiziniBoz = () => { dIdx = null; };   // sunucudan gelen değişiklikler (bulut.js uygula) ders dizisini yerinde yenilediği için
export function kursiyerDersleri(kid) {
  const l = (S && S.dersler) || [], a = l.length + '|' + (l[0] && l[0].id) + '|' + (l[l.length - 1] && l[l.length - 1].id);
  if (!dIdx || dIdx.l !== l || dIdxAnahtar !== a) { dIdx = { l, m: new Map() }; dIdxAnahtar = a; l.forEach(d => { if (!d) return; let x = dIdx.m.get(d.kursiyer); if (!x) dIdx.m.set(d.kursiyer, x = []); x.push(d); }); }
  return dIdx.m.get(kid) || [];
}
export function egitimTuruOf(k, d) {
  if (!k || !d) return 'normal';
  if (EGITIM_TURU[d.egitimTuru]) return d.egitimTuru;
  const t = d.tarih || '', ikinci = (k.ikinciHak && k.ikinciHak.tarih) || (k.meb && k.meb.ikinciDireksiyon) || '';
  if (ikinci && t >= ikinci) return 'ikinci';
  const ds = k.dsinav || {};
  if (ds.tarih && (ds.sonuc === 'Kaldı' || ds.sonuc === 'Girmedi' || ds.girmedi) && t > ds.tarih) return 'basarisiz';
  if (!ds.tarih && !hazirYazisiVar(k)) {
    const G = gerekliDireksiyon(k); if (!G) return 'normal';
    const an = t + ' ' + (d.saat || ''), l = kursiyerDersleri(k.id).filter(x => x.id !== d.id && x.durum !== 'İptal' && x.durum !== 'Gelmedi' && (x.tarih + ' ' + (x.saat || '')) < an && (!x.egitimTuru || x.egitimTuru === 'normal'));
    const kayitli = kursiyerDersleri(k.id).filter(x => x.durum === 'Yapıldı').length, aktarim = Math.max(0, (+k.direksiyon || 0) - kayitli);
    if (l.length + aktarim >= G) return 'onSinav';
  }
  return 'normal';
}
export const teorikEgitimTuru = t => (t && TEORIK_EGITIM_TURU[t.egitimTuru]) ? t.egitimTuru : 'normal';
// Yeni kurala göre mi hesaplanır? Gerçek kursta kural tarihinden önceki kayıtlar eski saatte donar (demo her zaman yeni kural)
export const eskiDersKurali = k => !!(S && S._bulut) && !!k && k.dersKural !== 2 && String(k.kayit || '') < DERS_KURAL_TARIH;
// Öğrenciye özgü gerekli direksiyon saati ve açıklaması
export function direksiyonAyrinti(k) {
  if (!k) return { saat: 0, kaynak: '' };
  const S0 = SINIFLAR[k.sinif] || {};
  let r;
  const ho = { otomatik: k.mevcutOtomatik, eski: k.mevcutEski, belgeTarih: (k.oncekiBelge || {}).tarih };
  if (k.gerekliElle != null && k.gerekliElle !== '' && isFinite(+k.gerekliElle)) { const sa = Math.max(0, Math.round(+k.gerekliElle)), h = direksiyonHesap(k.sinif, k.mevcutEhliyet, ho), alt = h.alt || 0, altinda = !!(alt && sa < alt);
    // il tablosu (elle girilen) alt sınırın altındaysa uyarı (M→B1 12 saat; B→A1 md.39/5 yarı süre; otomatikten manuele yarı süre, yorum). Alt sınır bilinmiyorsa bilgi notu (altNot).
    r = { saat: sa, kaynak: 'Kurs müdürünün girdiği değer' + (k.gerekliElleNot ? ': ' + k.gerekliElleNot : '') + (altinda ? `. Alt sınır ${virgul(alt)} saat (${h.altDayanak}); girilen değer bunun altında` : h.altNot ? '. ' + h.altNot : ''), elle: true, alt, altDayanak: h.altDayanak, altinda }; }
  else if (eskiDersKurali(k)) { const ko = (((S.kurs || {}).siniflar || {})[k.sinif] || {}), ks = ko.donukDireksiyon !== undefined ? ko.donukDireksiyon : ko.direksiyon, sa = ks != null ? +ks : (ESKI_DIREKSIYON[k.sinif] ?? (+S0.direksiyon || 0)); r = { saat: sa, kaynak: `${DERS_KURAL_TARIH.split('-').reverse().join('.')} öncesi kayıt: eski ders sayısı korunuyor`, donuk: true, yeni: direksiyonHesap(k.sinif, k.mevcutEhliyet, ho) }; }
  else r = direksiyonHesap(k.sinif, k.mevcutEhliyet, ho);
  // ikinci dört hak (md.15/4): sınıfın direksiyon saati kadar ders yeniden alınır
  if (k.ikinciHak && +k.ikinciHak.hedef > r.saat) r = { ...r, ilk: r.saat, saat: +k.ikinciHak.hedef, kaynak: r.kaynak + ' · ikinci dört hak için ' + (+k.ikinciHak.hedef - (+k.ikinciHak.onceki || 0)) + ' ders daha (md.15/4)' };
  return r;
}
export const gerekliDireksiyon = k => direksiyonAyrinti(k).saat;
// Asgari yaş (KTY md.76/1-a; madde 4): sınıf tablosundaki yaş (Ayarlar › Sınıf ve ücretler; tek kaynak). B 18, F 18.
// A sınıfının iki ayrı yolu var (md.76/1-b): 20 yaş + en az 2 yıllık A2 belgesi, ya da 24 yaş. İkisi ayrı denetlenir: hangisi tutuyorsa o yaş aranır.
// istisna: md.76/3 yaş istisnası; kapsamdaki sınıfta yaş 20'ye iner. Dönüş: { yas, not, istisna (yaş istisnayla indi), normal (istisnasız yaş) }
export function asgariYasHesap(sinif, mevcut, belgeTarih, istisna) {
  const r = asgariYasTemel(sinif, mevcut, belgeTarih);
  if (istisna && yasIstisnaKapsar(sinif) && r.yas > YAS_ISTISNA_YAS) return { yas: YAS_ISTISNA_YAS, not: 'yaş istisnası (KTY md.76/3)', istisna: true, normal: r.yas };
  return { ...r, normal: r.yas };
}
function asgariYasTemel(sinif, mevcut, belgeTarih) {
  const S0 = SINIFLAR[sinif] || {}, y = S0.yas || 18;
  if (sinif !== 'A') return { yas: y, not: '' };
  const a2 = mevcutKod(mevcut) === 'A2', a24 = S0.yasA2siz || 24;
  // A2'nin 2 yılı dolduğu gün (29 Şubat → 28 Şubat)
  const iki = yilSonra(belgeTarih, 2);
  if (a2 && (!iki || iki <= BUGUN)) return { yas: y, yol: 'A2', not: !iki ? `Yol 1: ${y} yaş + en az 2 yıllık A2, belge tarihini girin; yol 2: ${a24} yaş` : `Yol 1: en az 2 yıllık A2 ile ${y} yaş` };
  return { yas: a24, yol: '24', not: a2 ? `A2 belgesi ${iso(iki).split('-').reverse().join('.')} tarihinde 2 yılını doldurur; o güne kadar yol 2: ${a24} yaş` : `A2 belgesi yok: yol 2, ${a24} yaş; yol 1 ise ${y} yaş + en az 2 yıllık A2` };
}
// Ekrana HTML olarak basılan kısa metinlerde kullanıcı verisi (istisna türü) için kaçış
const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Yaş denetimi (kayıt formu, kursiyer dosyası ve MEBBİS ön kontrol aynı sonucu gösterir). k: { sinif, dogumTarihi, mevcutEhliyet, oncekiBelge, yasIstisna }
// { tamam, yas, asg, istisna, satir (ön kontrol satırı, HTML), uyari (kayıt formunda kaydı durduran düz metin) }
export function yasDenetim(k) {
  const y = yas(k.dogumTarihi), ist = yasIstisnaGecerli(k.yasIstisna), ay = asgariYasHesap(k.sinif, k.mevcutEhliyet, (k.oncekiBelge || {}).tarih, ist), asg = ay.yas, tamam = y == null || y >= asg;
  const ad = (SINIFLAR[k.sinif] || {}).ad || k.sinif, tur = ist ? esc(yasIstisnaMetin(k.yasIstisna)) : '', sorun = yasIstisnaSorun(k.yasIstisna);
  let satir = `Yaş ${y == null ? '?' : y} · en az ${asg}`;
  if (ay.istisna) satir += ` · yaş istisnası (KTY md.76/3): ${tur}; istisnasız ${ay.normal}`;
  else { if (ay.not && k.sinif === 'A') satir += ' (' + ay.not + ')'; if (ist || (sorun && k.yasIstisna && !YAS_ISTISNA_SINIF.includes(k.sinif))) satir += ` · yaş istisnası ${esc(ad)} sınıfında yaşı değiştirmez`; else if (sorun) satir += ` · yaş istisnası uygulanmadı: ${esc(sorun)}`; }
  const KAPSAM = 'emniyet okulları ve TSK’nın ilgili okul ve kurslarının öğrencisi ya da mezunu, sürücü eğitimi veren yüksekokulların mezunu';
  const uyari = tamam ? '' : ist
    ? `Kursiyer ${y} yaşında. KTY md.76/3 istisnası yaş şartını kaldırmaz: ${ad} için ${ay.istisna ? 'istisnayla ' : ''}en az ${asg} yaş gerekir (istisna yalnız A, C, D ve D1 sınıflarında yaşı 20’ye indirir).`
    : sorun ? `Kursiyer ${y} yaşında; ${ad} için en az ${asg} yaş gerekir${ay.not ? ' (' + ay.not + ')' : ''}. İşaretli yaş istisnası uygulanmadı: ${sorun}. KTY md.76/3 yalnız şunlara uygulanır: ${KAPSAM}.`
    : `Kursiyer ${y} yaşında; ${ad} için en az ${asg} yaş gerekir${ay.not ? ' (' + ay.not + ')' : ''}. KTY md.76/3 istisnası varsa (${KAPSAM}) “Yaş istisnası var”ı işaretleyip dayanağını yazın.`;
  return { tamam, yas: y, asg, istisna: !!ay.istisna, normal: ay.normal, satir, uyari };
}
// Gece dersi: md.7/3 listesindeki sınıflar en az 2 saat. CE ve G listede yok: zorunlu tutulmaz, CE'de yalnız bilgi notu (eyup-sorular-cevaplar.md madde 5).
// Kurs ayarı geceCE açıksa CE'de de aranır (il MEM CE'de gece dersi istiyorsa). Sağlık raporunda gece kısıtı olana (k.saglikRapor.geceKisit) gece dersi verilmez (md.7/3 son cümle).
// Kural motorunun okuduğu sayı ayarları (Ayarlar › MEB kuralları): [en az, en çok, varsayılan]; sayfalar5.js KURAL_KAYNAK'taki min/max/varsayilan ile aynı.
// Eskiden kaydedilmiş geçersiz değer (boş, 0, eksi, aralık dışı) varsayılanla okunur: ekranda görünen değer ile kodun kullandığı değer aynı olur.
// programOnGun alt sınırı 5: MTSK Yön. md.23/1 direksiyon programını en az 5 gün önce ister; eskiden kaydedilmiş 1–4 değeri 5 okunur.
export const KURAL_ARALIK = { programOnGun: [5, 30, 5], gunlukDersSiniri: [1, 2, 2], geceDersi: [1, 10, 2], sinavBildirimIsGunu: [1, 20, 4], direksiyonSure: [1, 365, 90], sinavUcretIsGunu: [1, 30, 6], tekrarBekleme: [0, 120, 15], telafiSaat: [2, 10, 2], bildirimTekrarSaat: [1, 72, 6], devamsizlikSiniri: [1, 34, 4], aracKursiyer: [1, 50, 12] };
// DIR-035/037: direksiyon ders saatleri ve otomatik plan ayarları (Ayarlar › Kurs bilgileri). MTSK md.20/1: dersler 07:00–23:00 arası; son ders 22:00'de başlar.
// S.kurs.dersSaat = { bas: '09:00', bit: '19:00' (son dersin başlangıcı), ogle: '13:00' | '' }
export const DERS_SAAT_VARSAYILAN = { bas: '09:00', bit: '19:00', ogle: '13:00' };
export function dersSaatleri({ ogleDahil = false } = {}) {
  const o = { ...DERS_SAAT_VARSAYILAN, ...((S && S.kurs && S.kurs.dersSaat) || {}) }, b = Math.max(7, +String(o.bas).slice(0, 2) || 9), e = Math.min(22, +String(o.bit).slice(0, 2) || 19), l = [];
  for (let h = b; h <= e; h++) { const s = String(h).padStart(2, '0') + ':00'; if (ogleDahil || s !== o.ogle) l.push(s); }
  return l;
}
// S.kurs.plan = { cumartesi (ders yazılsın, varsayılan açık), tekUsta (aynı aday bir günde tek usta, varsayılan evet), dagit (başka yetkili ustaya dağıtım, varsayılan kapalı), haftalik (aday başına haftada en çok, 3) }
export const planAyar = () => { const p = (S && S.kurs && S.kurs.plan) || {}; return { cumartesi: p.cumartesi !== false, tekUsta: p.tekUsta !== false, dagit: !!p.dagit, haftalik: Math.max(1, Math.min(14, +p.haftalik || +(S && S.kurs && S.kurs.planHaftalik) || 3)) }; };
export const kuralAyar = a => { const [en, ust, v] = KURAL_ARALIK[a], x = S && S.kurs ? S.kurs[a] : undefined; return x !== '' && x != null && isFinite(+x) && +x >= en && +x <= ust ? +x : v; };
export const geceKisitli = k => !!(k && k.saglikRapor && k.saglikRapor.geceKisit);
export const geceGerekli = k => { if (!k || !gerekliDireksiyon(k) || geceKisitli(k) || k.sinif === 'G' || (k.sinif === 'CE' && !(S && S.kurs && S.kurs.geceCE))) return 0; return kuralAyar('geceDersi'); };
// Gün batımı: il merkezi koordinatı (yaklaşık) ve tarihten; Türkiye UTC+3. Gece dersi gün batımından sonra başlar (md.20/1).
const IL_KOORD = { adana: [37.0, 35.32], adıyaman: [37.76, 38.28], afyonkarahisar: [38.76, 30.54], ağrı: [39.72, 43.05], amasya: [40.65, 35.83], ankara: [39.93, 32.86], antalya: [36.89, 30.71], artvin: [41.18, 41.82], aydın: [37.85, 27.84], balıkesir: [39.65, 27.88], bilecik: [40.14, 29.98], bingöl: [38.88, 40.5], bitlis: [38.4, 42.11], bolu: [40.74, 31.61], burdur: [37.72, 30.29], bursa: [40.19, 29.06], çanakkale: [40.15, 26.41], çankırı: [40.6, 33.62], çorum: [40.55, 34.95], denizli: [37.78, 29.09], diyarbakır: [37.91, 40.24], edirne: [41.68, 26.56], elazığ: [38.68, 39.22], erzincan: [39.75, 39.49], erzurum: [39.9, 41.27], eskişehir: [39.78, 30.52], gaziantep: [37.07, 37.38], giresun: [40.91, 38.39], gümüşhane: [40.46, 39.48], hakkari: [37.58, 43.74], hatay: [36.2, 36.16], ısparta: [37.76, 30.55], mersin: [36.8, 34.64], istanbul: [41.01, 28.98], izmir: [38.42, 27.14], kars: [40.6, 43.1], kastamonu: [41.39, 33.78], kayseri: [38.72, 35.49], kırklareli: [41.73, 27.22], kırşehir: [39.15, 34.16], kocaeli: [40.77, 29.92], konya: [37.87, 32.48], kütahya: [39.42, 29.98], malatya: [38.35, 38.31], manisa: [38.61, 27.43], kahramanmaraş: [37.58, 36.94], mardin: [37.31, 40.74], muğla: [37.22, 28.36], muş: [38.74, 41.49], nevşehir: [38.62, 34.71], niğde: [37.97, 34.68], ordu: [40.98, 37.88], rize: [41.03, 40.52], sakarya: [40.78, 30.4], samsun: [41.29, 36.33], siirt: [37.93, 41.94], sinop: [42.03, 35.15], sivas: [39.75, 37.02], tekirdağ: [40.98, 27.51], tokat: [40.31, 36.55], trabzon: [41.0, 39.72], tunceli: [39.11, 39.55], şanlıurfa: [37.16, 38.79], uşak: [38.68, 29.41], van: [38.5, 43.38], yozgat: [39.82, 34.81], zonguldak: [41.45, 31.79], aksaray: [38.37, 34.03], bayburt: [40.26, 40.23], karaman: [37.18, 33.22], kırıkkale: [39.85, 33.51], batman: [37.88, 41.13], şırnak: [37.52, 42.46], bartın: [41.63, 32.34], ardahan: [41.11, 42.7], ığdır: [39.92, 44.04], yalova: [40.65, 29.27], karabük: [41.2, 32.62], kilis: [36.72, 37.12], osmaniye: [37.07, 36.25], düzce: [40.84, 31.16], afyon: [38.76, 30.54], antep: [37.07, 37.38], urfa: [37.16, 38.79], maraş: [37.58, 36.94] };
// Türkçe harfler sadeleştirilerek eşlenir ("Eskisehir", "ESKİŞEHİR", "Odunpazarı / Eskişehir" aynı ili verir); bulunamazsa Ankara
const ilSade = x => String(x || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
// DIG-005: planlayıcı binlerce kez sorar; il adı sadeleştirmesi metin başına bir kez yapılır (önbellek)
const IL_SADE = Object.keys(IL_KOORD).sort((a, b) => b.length - a.length).map(a => [a, ilSade(a)]), ilOnbellek = new Map();
export function kursIli(K = (S && S.kurs) || {}) {
  const ham = String(K.il || K.sehir || K.adres || ''); if (ilOnbellek.has(ham)) return ilOnbellek.get(ham);
  const t = ilSade(ham), il = (IL_SADE.find(([, a]) => t.includes(a)) || ['ankara'])[0]; if (ilOnbellek.size > 50) ilOnbellek.clear(); ilOnbellek.set(ham, il); return il;
}
const batimOnbellek = new Map();
export function gunBatimi(t, il) {
  const anahtar = String(t).slice(0, 10) + '|' + (il || kursIli()); if (batimOnbellek.has(anahtar)) return batimOnbellek.get(anahtar);
  const v = gunBatimiHesap(t, il); if (batimOnbellek.size > 2000) batimOnbellek.clear(); batimOnbellek.set(anahtar, v); return v;
}
function gunBatimiHesap(t, il) {
  const [lat, lon] = IL_KOORD[il || kursIli()] || IL_KOORD.ankara, [y, m, d] = String(t).slice(0, 10).split('-').map(Number), r = Math.PI / 180;
  const N = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5), g = 2 * Math.PI / 365 * (N - 1 + 0.25);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dek = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * r) / (Math.cos(lat * r) * Math.cos(dek)) - Math.tan(lat * r) * Math.tan(dek)) / r;
  const dk = Math.ceil(720 - 4 * (lon - ha) - eqt + 180);
  return String(Math.floor(dk / 60)).padStart(2, '0') + ':' + String(dk % 60).padStart(2, '0');
}
// Gece dersinin başladığı saat (kurs ayarı, Ayarlar › MEB kuralları › Gece dersi başlangıcı): il MEM'in Özel MTSK Modülü'ne girdiği saat (md.20/1; ay bazında,
// S.kurs.geceSaatleri { '01': '17:45', ... }) yoksa hesaplanan gün batımı. Sabit bir saat yok, ölçüt gün batımı (eyup-sorular-cevaplar.md madde 6).
export function geceBaslangic(t) {
  const K = (S && S.kurs) || {}, elle = K.geceSaatleri && K.geceSaatleri[String(t).slice(5, 7)];
  return /^\d{2}:\d{2}$/.test(elle || '') ? elle : gunBatimi(t);
}
export const geceDersMi = d => !!d && !!d.tarih && /^\d{2}:\d{2}/.test(d.saat || '') && d.saat.slice(0, 5) >= geceBaslangic(d.tarih);
// Direksiyon ilerlemesi ders türüne göre (UYG-006, UYG-007): ilk kez belge alanda 2 saat alan ya da simülatör (md.7/1), kalanı akan trafik; gece dersi ayrıca.
// Yapılan dersler sayılır (gelmedi ve iptal sayılmaz). Gerekmeyen tür listeye girmez; direksiyon dersi yoksa null.
export function dersTurleri(k) {
  const g = gerekliDireksiyon(k); if (!k || !g) return null;
  const altG = !mevcutKod(k.mevcutEhliyet) && !egitimSinifi(k.sinif) ? Math.min(2, g) : 0;
  const yd = sbDers(S.dersler).filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı'), alt = yd.filter(d => d.tur === 'alan' || d.tur === 'simulator').length;
  const gg = geceGerekli(k), gece = gg ? sbDers(S.dersler).filter(d => d.kursiyer === k.id && d.durum !== 'Gelmedi' && d.durum !== 'İptal' && geceDersMi(d)).length : 0;
  return [altG ? { tur: 'alan', ad: 'Alan / simülatör', n: Math.min(alt, altG), g: altG } : null, { tur: 'trafik', ad: 'Akan trafik', n: Math.min(yd.length - Math.min(alt, altG), g - altG), g: g - altG }, gg ? { tur: 'gece', ad: 'Gece', n: Math.min(gece, gg), g: gg } : null].filter(Boolean);
}
// MEB iş günü: programdaki tek iş günü tanımı (MTSK sürelerinde: sınav onayı 4 iş günü, randevu 4 iş günü, sınav ücreti 6 iş günü, mazeret 5 iş günü).
// Pazartesi–Cuma; resmî tatil ve bayramlar hariç. Cumartesi iş günü değildir (657 md.99, MTSK md.16/7; eyup-sorular-cevaplar.md madde 11), eski
// mebCumartesi ayarı artık okunmaz. Arife ve kursun girdiği idari izin günleri de sayılmaz: teyit bekliyor (madde 11), son tarih erkene çekilir.
export const mebIsGunuMu = t => { const g = tarihOku(t).getDay(); if (g === 0 || g === 6) return false; return !(TATILLER.includes(t.slice(5)) || BAYRAMLAR.includes(t) || arifeMi(t) || idariIzinMi(t)); };
// bas hariç, bit dahil iş günü sayısı
export const mebIsGunuSay = (bas, bit) => { let n = 0; const d = tarihOku(bas), b = tarihOku(bit); while (d < b) { d.setDate(d.getDate() + 1); if (mebIsGunuMu(iso(d))) n++; } return n; };
// t'den n iş günü önceki gün
// MSJ-001: adayın kendi uygulama sınavı saati — MEBBİS'e yazılıp doğrulanmış randevu (S.mebDurum 'sinav-<oturum>-<aday>'.saat, durum 'tamam')
// ya da oturumdaki aday ataması (s.atama[aday].saat); yoksa oturumun saati (kesin: false)
export function adaySinavSaati(s, k) {
  const v = (S.mebDurum || {})['sinav-' + s.id + '-' + (k && k.id)], a = s.atama && k && s.atama[k.id];
  if (v && v.durum === 'tamam' && /^\d{2}:\d{2}$/.test(v.saat || '')) return { saat: v.saat, kesin: true };
  if (a && /^\d{2}:\d{2}$/.test(a.saat || '')) return { saat: a.saat, kesin: true };
  return { saat: s.saat || '', kesin: false };
}
// t'den sonraki n'inci MEB iş günü (ayrılış bildirimi gibi ileri süreler)
export const mebIsGunuIleri = (t, n) => { const d = tarihOku(t); let i = 0; while (i < n) { d.setDate(d.getDate() + 1); if (mebIsGunuMu(iso(d))) i++; } return iso(d); };
export const mebIsGunuGeri = (t, n) => { const d = tarihOku(t); let i = 0; while (i < n) { d.setDate(d.getDate() - 1); if (mebIsGunuMu(iso(d))) i++; } return iso(d); };
// Sınav hakları (MTSK md.15): e-sınav 4; uygulama ilk 4, 60 gün içinde başvurana 4 daha (md.15/4). Kurs ayarı sinavHak ilk dört hakkın sayısıdır.
export const sinavHakSiniri = (k, tur) => { const n = (S && S.kurs && S.kurs.sinavHak) || 4; return tur === 'e-Sınav' ? n : n * (k && k.ikinciHak ? 2 : 1); };
// Kalan hak, içinde bulunulan dört hak diliminden (UYG-001): ikinci dört hakkı alan öğrencide "0 / 8" yerine "3 / 4 · ikinci dört hak"
export function kalanHak(k, tur, x) {
  const n = (S && S.kurs && S.kurs.sinavHak) || 4, kul = (x && +x.hak) || 0, ikinci = tur !== 'e-Sınav' && !!(k && k.ikinciHak) && kul >= n;
  return { kalan: Math.max(0, (ikinci ? 2 * n : n) - kul), toplam: n, ikinci, etiket: ikinci ? 'İkinci dört hakkından kalan' : 'Kalan sınav hakkın' };
}
// MSJ-002: öğrenciye giden kalan hak cümlesi dilimli (kalanHak) ve yalnız sayı kesinse: e-sınavda MEBBİS'teki hak mdSinyal'dekiyle
// çelişiyorsa (esinavHakDurum.fark) cümle hiç yazılmaz — yanlış sayı söylemektense söylememek iyidir. x: bu sınavın kaydı ({ hak }).
export function kalanHakCumlesi(k, tur, x) {
  if (tur === 'e-Sınav' && esinavHakDurum(k).fark) return '';
  const h = kalanHak(k, tur, x); if (!h.kalan) return '';
  return h.ikinci ? `Üzülmeyin, ikinci dört hakkınızdan ${h.kalan} hak kaldı.` : `Üzülmeyin, ${h.kalan} hakkınız daha var.`;
}
export const IKINCI_HAK_GUN = 60;
// e-Sınav hak durumu (TEO-009): kullanilan = yerel e-Sınav oturumlarında sonucu olan (Girmedi dahil) oturum sayısı; sira = sıradaki hak.
// MEBBİS "E-Sınav Hak" (SKT02009) sıradaki hakkı gösterir: 1–4 "sıradaki N. hak" (kullanılan = değer − 1), 5 "süre doldu", 0 "hakkı doldu".
export function esinavHakDurum(k) {
  const sinir = sinavHakSiniri(k, 'e-Sınav'), id = k && k.id;
  const kullanilan = (S.sinavlar || []).filter(s => s.tur === 'e-Sınav' && s.sonuc && ['Geçti', 'Kaldı', 'Girmedi'].includes(s.sonuc[id])).length || (k && k.esinav && !k.esinav.muaf && k.esinav.hak ? +k.esinav.hak : 0);
  const ham = k && k.meb && k.meb.esinavHak != null && String(k.meb.esinavHak).trim() !== '' ? +String(k.meb.esinavHak).replace(/\D/g, '') : null;
  const anlam = ham == null || isNaN(ham) ? '' : ham === 0 ? 'hakkı doldu' : ham === 5 ? 'süre doldu' : ham >= 1 && ham <= 4 ? `sıradaki ${ham}. hak` : '';
  const mebKullanilan = ham >= 1 && ham <= 4 ? ham - 1 : null;
  return { kullanilan, sira: Math.min(kullanilan + 1, sinir), sinir, meb: { ham, anlam, kullanilan: mebKullanilan }, fark: mebKullanilan != null && mebKullanilan !== kullanilan };
}
// e-Sınav ücreti hak numarasına bağlı (TEO-010, SOR-093): k.esinavUcret = { '1': { tarih, kaynak: 'mebbis'|'elle', kim }, '2': … }.
// Aday kalınca sıradaki hakkın anahtarı boştur: ücret kendiliğinden "bekleniyor"a döner. Eski tek alan yok sayılmaz: sıradaki hak 1 ise k.esinavUcretYatti kabul.
export const esinavUcretiVar = (k, sira = esinavHakDurum(k).sira) => !!(k && ((k.esinavUcret || {})[String(sira)] || (sira === 1 && k.esinavUcretYatti)));
export function esinavUcretiIsle(k, kaynak = 'elle', tarih = null) {
  const sira = String(esinavHakDurum(k).sira), l = { ...(k.esinavUcret || {}) };
  if (l[sira]) return false;   // aynı hak için ikinci okuma tarihi ezmez
  l[sira] = { tarih: tarih || iso(new Date()), kaynak, ...(kaynak === 'elle' && oturum && oturum.kullanici ? { kim: oturum.kullanici.ad } : {}) }; k.esinavUcret = l; return true;
}
// Ödeme yöntemleri tek listede (raporlar, kasa ve muhasebe aynı adları kullanır)
export const YONTEMLER = ['Nakit', 'Kart', 'Havale'];
// Tahsilatta önce seçili gelen yöntem: kurs ayarı (Ayarlar › Kurs; SOR-085, RAP-009); ayarlanmadıysa eskisi gibi Kart
export const varsayilanYontem = () => YONTEMLER.includes((S.kurs || {}).varsayilanYontem) ? S.kurs.varsayilanYontem : 'Kart';
export const yontemAd = y => y === 'Havale' ? 'Havale/EFT' : y;
// PAR-050: hareketin düştüğü kasa/banka hesabı (S.hesaplar). Yeni hareket h.hesap taşır; taşımayan eski hareket yöntemin varsayılan hesabına sayılır
// (Nakit → kasa, Kart → POS, POS yoksa varsayılan banka, Havale → varsayılan banka). İki banka hesabı aynı havaleyi iki kez saymaz.
const HESAP_TUR = { Nakit: 'Kasa', Kart: 'POS', Havale: 'Banka' };
export const bankaHesaplari = () => (S.hesaplar || []).filter(h => h.tur === 'Banka');
// PAR-040: şube kasası — hesabın şubesi (h.sube) varsa önce o şubenin hesabı, yoksa ortak (şubesiz) hesap
export function varsayilanHesap(y, sube) { const l = S.hesaplar || [], uy = h => !sube || !h.sube || h.sube === sube, bul = t => l.find(h => h.tur === t && sube && h.sube === sube && h.varsayilan) || l.find(h => h.tur === t && sube && h.sube === sube) || l.find(h => h.tur === t && uy(h) && h.varsayilan) || l.find(h => h.tur === t && uy(h)) || l.find(h => h.tur === t); return (bul(HESAP_TUR[y] || 'Banka') || (y === 'Kart' ? bul('Banka') : null) || {}).id || null; }
export const hareketHesabi = h => h.hesap && (S.hesaplar || []).some(x => x.id === h.hesap) ? h.hesap : varsayilanHesap(h.tur === 'Gider' && h.yontem === 'Kart' ? 'Havale' : h.yontem, h.sube);  // kartla gider bankadan çıkar, POS'tan değil
// PAR-043: POS valörü — kartla tahsilat POS hesabında bekler, valör (iş günü) dolunca komisyon düşülmüş net tutar POS'un bağlı banka hesabına geçer
export const posGecis = (t, valor) => { const d = tarihOku(t); let n = Math.max(0, +valor || 0); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n--; } return iso(d); };
export const posKalem = h => { const pos = (S.hesaplar || []).find(x => x.id === hareketHesabi(h)); if (!pos || pos.tur !== 'POS' || h.tur !== 'Gelir' || pos.valor == null || pos.valor === '') return null; const kom = Math.round((+h.tutar || 0) * (+pos.komisyon || 0)) / 100; return { pos, gecis: posGecis(h.tarih, pos.valor), komisyon: kom, net: Math.round(((+h.tutar || 0) - kom) * 100) / 100, hedef: pos.hedef || varsayilanHesap('Havale', h.sube) }; };
export const bankayaHesabi = h => h.bankayaHesap && (S.hesaplar || []).some(x => x.id === h.bankayaHesap) ? h.bankayaHesap : varsayilanHesap('Havale', h.sube);
// Ay ekleme: 31 Ocak + 1 ay = 28/29 Şubat (taşma yok)
export const ayEkle = (t, n) => { const d = tarihOku(t), g = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const son = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(g, son)); return iso(d); };
// İki tarih arasındaki iş günü (bas hariç, bit dahil). Eski ad: MEB iş günü sayımına bağlı (mebIsGunuMu); ayrı bir hesap tutulmaz
export const isGunuSay = (bas, bit) => mebIsGunuSay(bas, bit);

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
      ...(sinif === 'C' ? { mevcutEhliyet: 'B', oncekiBelge: { sinif: 'B', tarih: gun(-2400 - i * 9) } } : {}),  // C, B belgesiyle alınır (KTY md.76/1-b)
      asama, teorik, direksiyon, evrak: ev, mebIslendi: yas > 7 && r() < 0.92, esinav, dsinav,
      odeme: { toplam: S.ucret, pesin, pesinTarih: kayit, taksitler },
      kaynak: sec(['Google Haritalar', 'Google Haritalar', 'Google Haritalar', 'Instagram', 'Instagram', 'Tavsiye', 'Tavsiye', 'WhatsApp', 'Web sitesi']),
      yorum: asama === 'Ehliyet' ? (r() < 0.55 ? 'yapti' : 'istendi') : null,
      notlar: [],
      tc: tcUret(), dogumTarihi: (2008 - ara(0, 24)) + '-' + String(ara(1, 12)).padStart(2, '0') + '-' + String(ara(1, 28)).padStart(2, '0'),
      adres: sec(MAH) + ' Mah., ' + sec(['Odunpazarı', 'Tepebaşı']) + ' / Eskişehir', ogrenim: sec(['Lise', 'Lise', 'Lisans', 'Önlisans', 'Ortaokul', 'Meslek ve teknik lise', 'Meslek ve teknik lise', 'İlkokul']), cinsiyet: kadin ? 'Kadın' : 'Erkek',
      teorikGrup: r() < 0.65 ? 'aksam' : 'sabah',
      deneme: ['Teorik', 'Direksiyon', 'Sınav'].includes(asama) ? Array.from({ length: ara(2, 6) }, () => ara(r() < 0.18 ? 38 : 58, r() < 0.18 ? 66 : 96)) : [],
      acil: { ad: sec(ADLAR_K.concat(ADLAR_E)) + ' ' + sec(SOYADLAR), yakinlik: sec(['Anne', 'Baba', 'Eş', 'Kardeş']), tel: tel() },
    });
    kursiyerler[kursiyerler.length - 1].odeme.senetli = r() < 0.35 && kursiyerler[kursiyerler.length - 1].odeme.taksitler.length > 0;
    // md.12/1 imzalı kayıt belgesi: MEBBİS'e girilmiş ve 12 günden eski kayıtlarda yüklenmiş. Rastgele sayı kullanılmaz (demo sırası bozulmasın).
    { const k = kursiyerler[kursiyerler.length - 1]; if (k.mebIslendi && yas >= 12) k.kayitBelgesi = { yuklendi: gun(-yas + 4), kim: 'Demo' }; }
  }
  // Hatırlatma demoda görünsün: MEBBİS'e girilmiş ilk teorik öğrencinin imzalı kayıt belgesi henüz yüklenmedi (öğrenci dosyasında md.12/1 hatırlatması)
  { const k = kursiyerler.find(x => x.asama === 'Teorik' && x.mebIslendi); if (k) delete k.kayitBelgesi; }
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
  const BEYAN = 'Merhaba, ben Örnek Sürücü Kursu adına yanıt veren otomatik asistanım. ';
  const adaylar = [
    { ad: 'Deniz Akın', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B-O', asama: 'Yeni', saat: '08:12', gun: 0, m: [['aday', 'Merhaba, otomatik vites ehliyet için fiyat öğrenebilir miyim?'], ['asistan', 'Merhaba Deniz Bey, B otomatik sınıfı kurs ücretimiz 26.500 TL. Peşinatın ardından 5 aya kadar taksit yapıyoruz. Ne zaman başlamayı düşünüyorsunuz?']] },
    { ad: 'Sena Uğur', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'B', asama: 'Bilgi verildi', saat: '23:41', gun: -1, m: [['aday', 'Kaç günde ehliyet alınıyor?'], ['asistan', 'Teorik dersler yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi geliyor. Ortalama 2–3 ayda ehliyetinizi alıyorsunuz.'], ['aday', 'Taksit var mı?'], ['asistan', 'Evet, peşinat sonrası 5 aya kadar taksit yapıyoruz. Size uygun bir saat için kayıt görüşmesi ayarlayalım mı?']] },
    { ad: 'Yiğit Sarı', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'A2', asama: 'Görüşme', saat: '14:05', gun: -1, takip: gun(1), m: [['aday', 'Motor ehliyeti için hangi belgeler lazım?'], ['asistan', 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf ve kimlik yeterli. Raporu aile hekiminizden alabilirsiniz.'], ['aday', 'Bu hafta gelip kaydolabilir miyim?'], ['asistan', `${gunAdi(yG)} 11:30 için kayıt görüşmenizi oluşturdum. Gelirken kimliğinizi getirin.`]] },
    { ad: 'Aslı Kara', kaynak: 'Tavsiye', kanal: 'WhatsApp', sinif: 'B', asama: 'Bilgi verildi', saat: '19:20', gun: -2, takip: gun(0), m: [['aday', 'Kuzenim sizde aldı, ben de kaydolmak istiyorum. Hafta sonu ders var mı?'], ['asistan', 'Hoş geldiniz! Cumartesi direksiyon derslerimiz var. Teorik dersler hafta içi akşam 18:30’da.']] },
    { ad: 'Ozan Demirci', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'C', asama: 'Yeni', saat: '07:55', gun: 0, devir: 'Kurs bilgisinde B’den C’ye geçiş ücreti yok', m: [['aday', 'B ehliyetim var, C ye geçiş ne kadar?'], ['asistan', BEYAN + 'B’den C’ye geçiş ücreti konusunda elimde kesin bilgi yok, yanlış bilgi vermek istemem. Yetkilimize haber verdim; en geç 30 dakika içinde size dönecek.']] },
    { ad: 'Melike Tan', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'B-O', asama: 'Kayıt', saat: '11:30', gun: -3, m: [['aday', 'Yarın kayda geleceğim, evrakları getireyim mi?'], ['asistan', 'Evet, sağlık raporu ve öğrenim belgesi yeterli; fotoğrafı kursta çekiyoruz.']] },
    { ad: 'Barış Yalçın', kaynak: 'Web sitesi', kanal: 'WhatsApp', sinif: 'B', asama: 'Kaybedildi', saat: '16:44', gun: -6, not: 'Fiyatı yüksek buldu', m: [['aday', 'Başka yerde 21 bin dediler.'], ['asistan', 'Anlıyorum. Ücretlerimiz il taban fiyat listesine uygundur (B için taban 23.510 TL, KDV dahil); listenin altında ücret alınamıyor. Karar verirseniz buradayız.']] },
    { ad: 'Gizem Önal', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Görüşme', saat: '10:18', gun: -1, takip: gun(2), m: [['aday', 'Öğrenciyim, indirim oluyor mu?'], ['asistan', 'İl taban fiyat listesi gereği öğrenci, kardeş ya da arkadaş dahil hiçbir ad altında indirim yapılamıyor. B manuel kurs ücretimiz 24.000 TL (KDV dahil); taksitle ödeyebilirsiniz.'], ['aday', 'Gelip konuşmak istiyorum'], ['asistan', `${gunAdi(gG)} 14:00 için kayıt görüşmenizi oluşturdum. Kimliğinizi getirmeyi unutmayın; kayıt kursta, müdürümüzün gözetiminde yapılır.`]] },
    { ad: 'Kadir Bayram', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Yeni', saat: '09:47', gun: 0, m: [['aday', 'Sınavda kalırsam tekrar ücret ödüyor muyum?'], ['asistan', BEYAN + 'Sınav ücretleri MEB’in resmî ücretidir ve kurs ücretine dahil değildir: e-sınav oturumu 1.250 TL, uygulama sınavı ücreti her sınavda yeniden ödenir. Uygulama sınavında kalan aday tekrar sınavdan önce en az 2 ders ek direksiyon dersi alır. Her sınav için 4 hakkınız var.']] },
    { ad: 'Ebru Çınar', kaynak: 'Tavsiye', kanal: 'WhatsApp', sinif: 'B-O', asama: 'Bilgi verildi', saat: '21:03', gun: -4, takip: gun(-1), m: [['aday', 'Annem için soruyorum, 52 yaşında, zor olur mu?'], ['asistan', 'Hiç zor değil; otomatik vitesle başlayan pek çok kursiyerimiz var. Eğitmenimiz Nurcan Hanım çok sabırlıdır.']] },
    { ad: 'Tunahan Ersoy', kaynak: 'Instagram', kanal: 'Instagram', sinif: 'A2', asama: 'Kayıt', saat: '13:15', gun: -5, m: [['aday', 'Kaydoldum teşekkürler']] },
    { ad: 'Pınar Gök', kaynak: 'Google Haritalar', kanal: 'WhatsApp', sinif: 'B', asama: 'Kaybedildi', saat: '12:00', gun: -8, not: 'Cevap vermedi', m: [['aday', 'Fiyat?'], ['asistan', 'B manuel 24.000 TL, taksit imkânı var.']] },
  ].map((a, i) => ({ id: 'l' + (i + 1), ad: a.ad, tel: tel(), kaynak: a.kaynak, kanal: a.kanal, sinif: a.sinif, asama: a.asama, tarih: gun(a.gun), saat: a.saat, takip: a.takip || null, not: a.not || '', devir: a.devir || null, mesajlar: a.m.map(([kim, metin]) => ({ kim, metin })) }));

  const otomasyonlar = [
    { id: 'o1', ad: 'Direksiyon dersi hatırlatması', ne: 'Dersten bir gün önce 18:00’de', kanal: 'WhatsApp', acik: true, gonderim: 412, sablon: '{selam} yarın {saat}’te {egitmen} ile direksiyon dersiniz var. Gelemeyecekseniz bu mesajı yanıtlamanız yeterli. {kurs}' },
    { id: 'o2', ad: 'Taksit hatırlatması', ne: 'Vadeden 3 gün önce ve vade günü', kanal: 'WhatsApp', acik: true, gonderim: 138, sablon: '{selam} {vade} tarihli {tutar} taksidinizin hatırlatmasıdır. {odeme}' },
    { id: 'o3', ad: 'Sınav bilgilendirmesi', ne: 'Sınava 3 gün ve 1 gün kala', kanal: 'WhatsApp', acik: true, gonderim: 96, sablon: '{selam} {tur} sınavınız {tarih} {saatte}, yer: {yer}. Kimliğinizi yanınıza almayı unutmayın. {kurs}' },
    { id: 'o4', ad: 'Eksik evrak hatırlatması', ne: 'Kayıttan 3 gün sonra, evrak eksikse', kanal: 'WhatsApp', acik: true, gonderim: 41, sablon: '{selam} kaydınızı tamamlamak için {evrak} eksik. {kursa} getirdiğinizde işlemlerinizi hemen başlatıyoruz.' },
    { id: 'o5', ad: 'Google yorum isteği', ne: 'Uygulama sınavını geçince', kanal: 'WhatsApp', acik: true, gonderim: 57, sablon: '{selam} tebrikler, artık ehliyetiniz var! {kurs} hakkında Google’da birkaç cümle yazarsanız çok seviniriz: {link}' },
    { id: 'o6', ad: 'Kalan kursiyere ek ders önerisi', ne: 'Sınav sonucu girildiğinde', kanal: 'WhatsApp', acik: true, gonderim: 12, sablon: '{selam} {tur} sınavı bu sefer olmadı. {kalan_hak} Yönetmelik gereği tekrar sınavdan önce en az {telafi} saat ek direksiyon dersi alınıyor ({tutar}); saatlerini ayarlayalım mı? Öğrenci uygulamasından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.' },
    { id: 'o8', ad: 'e-Sınav randevusu ve giriş belgesi', ne: 'Randevu kesinleşince', kanal: 'WhatsApp', acik: true, gonderim: 64, sablon: '{selam} e-sınav randevunuz {tarih} {saatte}, yer: {yer}. Giriş belgeniz ekte; kimliğinizi unutmayın.' },
    { id: 'o9', ad: 'Sınav sonucu bildirimi', ne: 'Sonuç girilince', kanal: 'WhatsApp', acik: true, gonderim: 88, sablon: '{selam} {tur} sınav sonucunuz: {sonuc}. {kalan_hak}' },
    { id: 'o7', ad: 'Düşünen adaya takip', ne: 'Bilgi aldıktan 2 gün sonra', kanal: 'WhatsApp', acik: false, gonderim: 0, sablon: '{selam} kayıtla ilgili aklınıza takılan bir şey var mı? Bu hafta başlayan gruba hâlâ yer var. {kurs}' },
  ];

  const duyurular = [
    { tarih: '2026-07', baslik: 'MTSK e-Sınav başvuru ve uygulama kılavuzu 2026', ozet: 'Kılavuza göre her e-sınav oturumu için KDV dahil 1.250 TL e-sınav ücreti alınıyor.', kaynak: 'meb.gov.tr' },
    { tarih: '2026-01', baslik: 'Eskişehir 2026 taban fiyat listesi', ozet: 'Valilik komisyonunun 2026 eğitim maliyet tablosu Şubat 2026 – Ocak 2027 kurs dönemleri için geçerli; ücretler KDV dahil, kurs ücreti dışında ücret ve kampanya yok. mdSinyal’de Ayarlar › Sınıf ve ücretler’de.', kaynak: 'Eskişehir Valiliği' },
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
    { id: 'pos', ad: 'POS cihazı (kartla tahsilat)', tur: 'POS', bakiye: 38900 },
  ];
  const kazanim = { doldurulan: 14, ekDers: 9, yorum: 23 };
  const gruplar = [
    { id: 'aksam', ad: 'Akşam grubu', derslik: 'Derslik 1', baslangic: gun(5), kontenjan: 24 },
    { id: 'sabah', ad: 'Sabah grubu', derslik: 'Derslik 2', baslangic: gun(12), kontenjan: 16 },
  ];
  kursiyerler.forEach(k => { k.kvkk = { tarih: k.kayit, kanal: r() < 0.3 ? 'Kayıt formu (kurs cihazı)' : 'Kursta imzalı form', riza: true }; });
  const arsiv = [
    { yil: 2023, kursiyer: 372, gecmeE: 81, gecmeD: 74, gelir: 4120000 },
    { yil: 2024, kursiyer: 405, gecmeE: 83, gecmeD: 76, gelir: 6480000 },
    { yil: 2025, kursiyer: 431, gecmeE: 84, gecmeD: 79, gelir: 8950000 },
  ];
  const mevzuat = [
    { tarih: gun(-2), konu: 'Aylık mevzuat taraması', ne: 'MEB, ÖÖKGM ve Resmî Gazete tarandı; MTSK’yı etkileyen yeni düzenleme yok.', uygulandi: false },
    { tarih: '2026-07-20', konu: 'e-Sınav ücreti 1.250 TL', ne: 'MEB 2026 e-sınav kılavuzu: oturum başına KDV dahil 1.250 TL. Ek kalem tutarı güncellendi.', uygulandi: true },
  ];
  kursiyerler.forEach(k => { if (k.evrak.saglik) { const t = tarihOku(k.kayit); t.setDate(t.getDate() - ara(2, 20)); k.saglikRapor = { no: '2026/' + ara(10000, 99999), tarih: iso(t).split('-').reverse().join('.') }; } if (k.evrak.adli) k.adliSicil = { barkod: 'ASB' + ara(100000, 999999) + ara(1000, 9999) }; });
  kursiyerler.forEach(k => { if (k.asama === 'Ehliyet' && k.dsinav) { const d = fark(k.dsinav.tarih); k.kapanis = d < -12 ? { sertifika: gun(d + 3), arsiv: gun(d + 6) } : d < -5 ? { sertifika: gun(d + 3) } : {}; } });
  kursiyerler.forEach(k => { k.odeme.ekler = []; if (k.esinav) k.odeme.ekler.push({ ad: 'e-Sınav ücreti', tutar: 1250, odendi: k.kayit }); if (k.dsinav && k.dsinav.hak > 1) k.odeme.ekler.push({ ad: 'Uygulama sınavı tekrar ücreti', tutar: 2000, odendi: null }); if (k.dsinav && k.dsinav.sonuc === 'Kaldı') k.odeme.ekler.push({ ad: 'Sınav tekrar ücreti', tutar: 2000, odendi: null }); });
  // PAR-023: yaklaşan uygulama sınavlarında aday başı sınav ücreti kalemi (çoğu ödenmiş, birkaçı ödenmemiş)
  sinavlar.filter(s => s.tur === 'Direksiyon' && !Object.keys(s.sonuc).length).forEach(s => s.kursiyerler.forEach((id, i) => { const k = kursiyerler.find(x => x.id === id); if (k) k.odeme.ekler.push({ ad: `Uygulama sınavı ücreti (${((k.dsinav && k.dsinav.hak) || 0) + 1}. sınav)`, tutar: 2000, odendi: i % 4 === 3 ? null : k.kayit, sinav: s.id, tur: 'resmi' }); }));
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
    { konu: 'Fiyat ve taksit', metin: 'B manuel 24.000 TL, B otomatik 26.500 TL, A2 18.500 TL; B belgesiyle C 31.000 TL. Fiyatlar KDV dahil. Peşinat sonrası 5 aya kadar taksit. İl taban fiyat listesi gereği hiçbir ad altında indirim ve kampanya yapılmaz.', onay: gun(-3) },
    { konu: 'Evraklar', metin: 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf, kimlik. Fotoğrafı kursta çekiyoruz, ücret alınmaz.', onay: gun(-12) },
    { konu: 'Ders saatleri', metin: 'Teorik dersler hafta içi 18:30 ve Salı-Perşembe 10:00. Direksiyon Pazartesi–Cumartesi 09:00–18:00.', onay: gun(-12) },
    { konu: 'Süre', metin: 'Teorik yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi; ortalama 2–3 ay.', onay: gun(-12) },
    { konu: 'Sınav ücretleri', metin: 'Sınav ücretleri resmî ücrettir, kurs ücretine dahil değildir: e-sınav oturumu 1.250 TL (MEB 2026 kılavuzu), uygulama sınavı ücreti her sınavda. Kalan aday tekrar sınavdan önce en az 2 ders ek direksiyon dersi alır. Her sınav için 4 hak var.', onay: gun(-5) },
  ];
  const devredilen = [
    { ad: 'Ozan Demirci', aday: 'l5', kanal: 'WhatsApp', konu: 'Bilinmeyen soru', mesaj: 'B ehliyetim var, C ye geçiş ne kadar?', neden: 'Geçiş ücreti soruldu; il taban listesinde B → C satırı var (Ayarlar › Sınıf ve ücretler)', saat: '07:55', bildirim: [['07:55', 'Servet Sakar', 'WhatsApp']] },
    { ad: 'Halil Yurt', kanal: 'WhatsApp', konu: 'İndirim pazarlığı', mesaj: 'Üç kardeş kaydolursak ne kadar indirim olur?', neden: 'İl taban listesi notu 6: kardeş ve toplu kayıt indirimi yapılamaz', saat: '10:12', bildirim: [['10:12', 'Servet Sakar', 'WhatsApp'], ['10:27', 'Selda Korkmaz', 'WhatsApp · 15 dk cevapsız kaldı']] },
    { ad: 'Seda Bal', kanal: 'Instagram', konu: 'Özel durum', mesaj: 'Sol ayağımda protez var, otomatik araçla ehliyet alabilir miyim?', neden: 'Sağlık durumu: insana devredildi', saat: '09:40', bildirim: [['09:40', 'Servet Sakar', 'WhatsApp']] },
  ];

  // Sosyal medya asistanı (DengChat modülü)
  const sosyal = {
    kanallar: [
      { id: 'igm', ad: 'Instagram mesajları', hesap: '@orneksurucukursu', bagli: true, cevap: true, mod: '7/24', son: '08:12', izin: gun(-12), sonCevapDk: 3 },
      { id: 'igy', ad: 'Instagram yorumları', hesap: '@orneksurucukursu', bagli: true, cevap: true, mod: '7/24', son: '07:58', izin: gun(-12), sonCevapDk: 17 },
      { id: 'wp', ad: 'WhatsApp Business', hesap: '0222 000 00 00', bagli: true, cevap: true, mod: 'Mesai dışı', son: '08:12', izin: gun(-40), sonCevapDk: 3, birlikte: true },
      { id: 'fb', ad: 'Facebook Messenger', hesap: 'Örnek Sürücü Kursu', bagli: false, cevap: false, mod: '7/24', son: null, izin: null, sonCevapDk: null },
    ],
    ayar: {
      ad: 'Kurs asistanı', ton: 'Samimi', emoji: false, susma: 24, devir: { indirim: true, sikayet: true, saglik: true, insan: true, bilinmeyen: true },
      fiyat: 'sorulan', randevu: true, gizleOnay: true, hizSiniri: true, onayModu: 'otomatik', model: 'mdSinyal Asistan TR',
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
      { id: 'g3', gorsel: 'img/arac-a4.webp', metin: 'Bu hafta 9 kursiyerimiz uygulama sınavını geçti. Tebrikler!', begeni: 302, gun: -8 },
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
  // Evrak geçerlilik tarihleri (belgenin üzerindeki tarih)
  kursiyerler.forEach((k, i) => { if (!k.deneme.length) return; const n = k.deneme.length, ort = k.deneme.reduce((a, b) => a + b, 0) / n / 100, zayif = ['trafik', 'ilkyardim', 'motor', 'adab'][i % 4]; k.konuAnaliz = Object.fromEntries([['trafik', 23], ['ilkyardim', 12], ['motor', 9], ['adab', 6]].map(([kn, q]) => { const t = q * n, o = Math.min(0.98, Math.max(0.3, ort + (kn === zayif ? -0.18 : 0.05))); return [kn, [Math.round(t * o), t]]; })); });
  kursiyerler.forEach((k, i) => { if (i % 5 === 1) return; k.dogrulama = {}; ['saglik', 'adli'].forEach(x => { if (k.evrak[x]) k.dogrulama[x] = { kod: x === 'adli' ? 'A' + (480000 + i * 37) : 'R-' + (2026000 + i * 11), kim: 'Selda Korkmaz', tarih: k.kayit }; }); });
  kursiyerler.forEach((k, i) => { if (k.dogrulama && k.dogrulama.saglik) k.dogrulama.saglik.gecerlilik = gun(i % 11 === 0 ? 20 : 200 + i * 3); });

  const guvenlik = {
    ikiAdim: { mudur: true, sekreter: true, usta: false }, oturumDk: 0, ipKisit: false, hassasOnay: true,
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
    kdv: 10, fatura: 'tahsilat',  // 5580 kapsamındaki eğitim: KDV kararı II sayılı liste B-15, %10 (10/7/2023'ten beri)
  };

  return {
    sosyal, subeler, guvenlik, entegrasyon, isDurum: {},
    personel, izinler, bekleme, hesaplar, kazanim, gruplar, arsiv, mevzuat, ogretmenler, kullanicilar, islemler, asistanBilgi, devredilen, sms: { bakiye: 1840, kanal: 'WhatsApp' }, gunSonu: [],
    kurs: { ad: 'Örnek Sürücü Kursu', sehir: 'Eskişehir', tel: '0222 000 00 00', adres: 'Odunpazarı / Eskişehir', yetkili: 'Servet Sakar', puan: 4.9, yorumSayisi: 286, imzaYontemi: 'ikili', kuralKontrol: gun(-13), web: 'sinyalsurucukursu.com', aksamOzet: true, gunlukDersSiniri: 2, egitmenGunlukSinir: 8, ekDersUcreti: 1750, devamsizlikSiniri: 4, programOnGun: 5, sinavBildirimIsGunu: 4, geceDersi: 2, tekrarBekleme: 15, asgariYas: 18, saklamaYil: 10, sinavHak: 4, tekrarUcret: { esinav: 1250, dsinav: 2000 }, borcluDers: 'uyar', indirimler: [] },
    egitmenler, araclar, kursiyerler, dersler, teorik, sinavlar, hareket, adaylar, otomasyonlar, duyurular,
    gonderimler: [],
  };
}

export let S = yukle();
function yukle() {
  let o = null;
  try { const v = localStorage.getItem(ANAHTAR); if (v) { const x = JSON.parse(v); if (x && x._gun === iso(BUGUN)) o = x; } } catch (e) { }
  if (!o) {
    o = uret(); o._gun = iso(BUGUN);
    // örnek veri her gün yenilenir ama kursun bağlantı ayarları ve imza anahtarı korunur
    try { const eski = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); if (eski && eski.kurs) { ['waApi', 'waApiVarsayilan', 'wp', 'demoNumara', 'demoKime', 'iban', 'yorumLink', 'siniflar', 'maliyet', 'sozlesme', 'ekDersUcreti', 'tekrarUcret', 'sinavHak', 'borcluDers', 'kendiRandevu'].forEach(k => { if (eski.kurs[k] !== undefined) o.kurs[k] = eski.kurs[k]; }); if (eski.imzaAnahtari) o.imzaAnahtari = eski.imzaAnahtari; if (eski.gelenAlinan) o.gelenAlinan = eski.gelenAlinan; if (eski.kullanicilar) o.kullanicilar = eski.kullanicilar; if (eski.guvenlik) { o.guvenlik.oturumDk = eski.guvenlik.oturumDk; o.guvenlik.hassasOnay = eski.guvenlik.hassasOnay; } } } catch (e) { }
  }
  return goc(o);
}
// Eski kayıtları güncel yapıya taşır; gerçek bağlantısı olmayan entegrasyonları "bağlı değil" yapar
function goc(o) {
  // gerçek kurs verisi (bulut) demo örneklerinden ayrı: örnek puan, ceza, beceri ve demo WhatsApp adresi yalnız demoya eklenir
  const demo = !o._bulut;
  o.kurs.siniflar = o.kurs.siniflar || {};
  Object.keys(SINIFLAR).forEach(k => { SINIFLAR[k] = { ...SINIF_VARSAYILAN[k], ...(o.kurs.siniflar[k] || {}) }; });
  Object.keys(o.kurs.siniflar).forEach(k => { if (!SINIFLAR[k]) SINIFLAR[k] = o.kurs.siniflar[k]; });
  (o.hareket || []).forEach(h => { if (h.yontem === 'Havale/EFT') h.yontem = 'Havale'; });
  (o.kursiyerler || []).forEach(k => { k.odeme.taksitler.forEach(t => { if (t.yontem === 'Havale/EFT') t.yontem = 'Havale'; }); });
  // kalıcı makbuz numaraları (yıl içinde sıralı)
  o.sayac = o.sayac || {};
  o.ustaOdemeleri = o.ustaOdemeleri || [];  // öğretmene yapılan hakediş ödemeleri { id, egitmen, ay: 'YYYY-AA', tutar, tarih, yontem }
  // demoda geçen ayın hakedişi ilk öğretmene ödenmiş görünsün (öğretmenin "Kazancım" ekranında ödendi / bekliyor farkı)
  if (demo && !o.ustaOdemeleri.length && (o.egitmenler || [])[0]) {
    const [y, m] = gun(0).split('-').map(Number), t = new Date(y, m - 2, 1), ay = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'), h = o.egitmenler[0];
    const n = (o.dersler || []).filter(d => d.egitmen === h.id && d.durum === 'Yapıldı' && (d.tarih || '').slice(0, 7) === ay).length;
    o.ustaOdemeleri.push({ id: 'uo-demo', egitmen: h.id, ay, tutar: (+h.maas || 0) + n * (+h.prim || 0), tarih: ay + '-28', yontem: 'Havale' });
  }
  const gelir = (o.hareket || []).filter(h => h.tur === 'Gelir').sort((a, b) => (a.tarih + a.id).localeCompare(b.tarih + b.id));
  gelir.forEach(h => { if (!h.no) { const yil = h.tarih.slice(0, 4); o.sayac['m' + yil] = (o.sayac['m' + yil] || 0) + 1; h.no = 'M' + yil + '-' + String(o.sayac['m' + yil]).padStart(5, '0'); } });
  // gerçek entegrasyon kurulana kadar bağlı görünmez
  if (o.entegrasyon && !o.entegrasyon.gercek) { o.entegrasyon.earsiv.bagli = false; delete o.entegrasyon.pos; o.entegrasyon.muhasebe.bagli = false; o.entegrasyon.muhasebe.tur = 'Excel'; }
  if (o.mebArac && !o.mebArac.gercek) o.mebArac = null;
  // 17 Kas 2026: oturum varsayılan olarak kendiliğinden kapanmaz (kurslar gün boyu başka programla birlikte çalışıyor); süre Ayarlar › Güvenlik'ten seçilebilir
  if (o.guvenlik && !o.guvenlik.oturumSurum) { o.guvenlik.oturumDk = 0; o.guvenlik.oturumSurum = 1; }
  if (o.mevzuat) o.mevzuat = o.mevzuat.filter(m => !/yetkisiz yazılım/.test(m.konu || ''));  // kaldırılan kayıt (30 Ekim 2026)
  if (o.kurs.mebYontem === 'arac' && !o.mebArac) o.kurs.mebYontem = 'sirali';
  // demo: PIN’le giren her cihazda WhatsApp gönderimi hazır gelsin (mesajlar yalnız demo numarasına gider); Ayarlar’dan boşaltılırsa kapalı kalır
  // alan adı geçişi (v188): eski workers.dev adresi kayıtlı kurslar yeni adrese geçer (aynı worker, kendi alan adımız)
  if (typeof o.kurs.waApi === 'string' && /^https:\/\/sinyal-wa\.[a-z0-9-]+\.workers\.dev/i.test(o.kurs.waApi)) o.kurs.waApi = 'https://api.mdsinyal.com';
  if (demo && o.kurs.waApi === undefined) { o.kurs.waApi = 'https://api.mdsinyal.com'; o.kurs.waApiVarsayilan = true; }
  if (o.sosyal) o.sosyal.kanallar.forEach(c => { if (!c.gercek) { c.bagli = c.id === 'wp' ? !!o.kurs.waApi : false; c.cevap = c.bagli && c.cevap; } });
  // eksik alanlı sınav kaydı (ör. eski sunum verisi) sayfaları çökertmesin
  (o.sinavlar || []).forEach(x => { if (!x.sonuc || typeof x.sonuc !== 'object') x.sonuc = {}; if (!Array.isArray(x.kursiyerler)) x.kursiyerler = []; });
  // gerçek kurs: demo kursun gönderim sayıları devralınmasın (bir kez sıfırlanır; sonra gerçek gönderimlerle artar)
  // işaret kuralın kendisinde: kurs ayarlarına (tek parça kaydedilir) dokunulmaz; önbellekten açılan eski bir cihaz ayarları geri yazamasın
  if (o._bulut) (o.otomasyonlar || []).forEach(x => { if (!x.gercekSayac) { x.gonderim = 0; x.gercekSayac = true; } });
  (o.otomasyonlar || []).forEach(x => { if (x.id === 'o8') x.sablon = '{selam} e-sınav randevunuz {tarih} {saatte}, yer: {yer}. Kimliğinizi ve e-sınav ücreti dekontunu yanınıza alın.'; if (x.id === 'o6') { x.ne = 'Uygulama sınavından kalınca'; if (/2 ek ders ayarlayalım/.test(x.sablon || '')) x.sablon = '{selam} {tur} sınavı bu sefer olmadı. {kalan_hak} Yönetmelik gereği tekrar sınavdan önce en az {telafi} saat ek direksiyon dersi alınıyor ({tutar}); saatlerini ayarlayalım mı? Öğrenci uygulamasından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.'; } });  // MSJ-017: eski varsayılan o6 metni telafi eşiğiyle
  if (o.kazanim && !o.kazanim.gercek) o.kazanim = { gercek: true, doldurulan: 0, ekDers: 0, yorum: 0 };
  // geçmiş derslerin beceri puanları (usta öğretici ders bitiminde 1–5 verir); eski kayıtlara kursiyerin seyrine göre doldurulur
  const hs = x => { let h = 7; for (const c of String(x)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const kz = {}; (o.kursiyerler || []).forEach(k => { kz[k.id] = k; });
  // örnek trafik cezaları
  if (demo && !o.cezalar && o.araclar && o.araclar.length > 1) o.cezalar = [{ id: 'c1', arac: o.araclar[1].id, egitmen: o.araclar[1].egitmen || null, tarih: gun(-12), teblig: gun(-10), tur: 'Hız sınırı', tutar: 2167, odendi: null }, { id: 'c2', arac: o.araclar[0].id, egitmen: o.araclar[0].egitmen || null, tarih: gun(-40), teblig: gun(-36), tur: 'Hatalı park', tutar: 1408, odendi: gun(-30), odenen: 1056 }];
  // örnek sınav güzergâhları (yalnız demo; gerçek kurs verisi _bulut işaretlidir, bosVeri de uret()'in kursunu goc'tan geçirmeden kullanır):
  // öğretmenin Bugün › Sınav güzergâhları, öğrencinin Direksiyon hazırlığı › Güzergâhlar ekranları dolu görünsün. Kurs silerse bir daha eklenmez.
  if (demo && !o._gzOrnek) {
    o._gzOrnek = true;
    if (!(o.kurs.guzergahlar || []).length) {
      const eg = o.egitmenler || [], egAd = i => (eg[i % Math.max(1, eg.length)] || {}).ad || 'Öğretmen', ofis = o.kurs.yetkili || 'Kurs';
      const gecen = (o.kursiyerler || []).filter(k => k.dsinav && k.dsinav.sonuc === 'Geçti').slice(0, 2).map(k => ({ ad: [k.ad, k.soyad ? k.soyad.charAt(0) + '.' : ''].filter(Boolean).join(' '), tarih: k.dsinav.tarih || gun(-9) }));
      o.kurs.guzergahlar = [
        { id: 'gz-ornek-1', ad: '1. güzergâh · Çevre yolu', baslangic: 'Organize Sanayi sınav alanı', mesafe: 8.4, harita: '',
          tarif: 'Sınav alanından sağa çıkılır, OSB 5. Cadde boyunca ilk ışıklı kavşağa kadar düz gidilir.\nIşıklardan sola dönülüp çevre yolu bağlantısına girilir; hızlanma şeridinden çevre yoluna katılınır.\nİkinci kavşaktan sağa çıkılır, okul önündeki 30 km/s bölgesinden geçilerek sınav alanına dönülür.',
          puflar: [
            { id: 'gzp-1a', metin: 'Sınav alanı çıkışındaki yaya geçidinde yaya olmasa da tam dur; görevli ilk bunu izliyor.', kim: egAd(0), rol: 'usta', tarih: gun(-24) },
            { id: 'gzp-1b', metin: 'Çevre yoluna katılırken hızlanma şeridini sonuna kadar kullan; aynaya ve omuz üstüne bakmadan sola geçme.', kim: egAd(1), rol: 'usta', tarih: gun(-15) },
            { id: 'gzp-1c', metin: 'Dönüşteki okul bölgesinde 30 km/s levhası var; levhadan önce yavaşla.', kim: ofis, rol: 'ofis', tarih: gun(-9) },
          ],
          deneyimler: gecen[0] ? [{ id: 'gzd-1a', metin: 'Çevre yoluna çıkarken trafik yoğundu; acele etmeden boşluğu bekledim, görevli bunu olumlu karşıladı.', ad: gecen[0].ad, sonuc: 'Geçti', tarih: gecen[0].tarih }] : [] },
        { id: 'gz-ornek-2', ad: '2. güzergâh · Sanayi içi', baslangic: 'Organize Sanayi sınav alanı', mesafe: 4.6, harita: '',
          tarif: 'Sınav alanından sola çıkılır, sanayi içindeki dar yollara girilir.\nYokuşta durup el freniyle kalkış istenir; ardından ara sokakta geri park ve dar alanda geri dönüş yapılır.\nIşıksız dörtlü kavşaktan düz geçilip sınav alanına dönülür.',
          puflar: [
            { id: 'gzp-2a', metin: 'Yokuşta el frenini indirmeden önce aracı debriyajla hafifçe yükle; geri kayma hata sayılıyor.', kim: egAd(0), rol: 'usta', tarih: gun(-20) },
            { id: 'gzp-2b', metin: 'Geri parkta direksiyonu araç dururken çevirme; araç ağır ağır ilerlerken çevir.', kim: egAd(2), rol: 'usta', tarih: gun(-12) },
            { id: 'gzp-2c', metin: 'Işıksız dörtlü kavşakta sağdan gelene yol ver; yol boş görünse de yavaşlayıp iki yana bak.', kim: egAd(1), rol: 'usta', tarih: gun(-5) },
          ],
          deneyimler: gecen[1] ? [{ id: 'gzd-2a', metin: 'Yokuşta biraz geri kaydım ama hemen toparladım; el frenini erken indirmeyin.', ad: gecen[1].ad, sonuc: 'Geçti', tarih: gecen[1].tarih }] : [] },
      ];
    }
  }
  // öğrencinin derse verdiği puanlar (örnek veri; yaklaşık her 3 dersten 2'si puanlanmış)
  const YORUM = ['Çok sabırlı, her şeyi tekrar tekrar anlattı.', 'Park etmeyi sonunda öğrendim, teşekkürler.', 'Biraz hızlı gittik ama faydalı oldu.', 'Yokuşta kalkışı iyi çalıştık.', 'Araç çok temizdi, ders zamanında başladı.', 'Ders 10 dakika geç başladı.', 'Kavşaklarda daha çok pratik istiyorum.'];
  if (demo) (o.dersler || []).forEach(d => { if (d.durum !== 'Yapıldı' || d.ogrenciPuan !== undefined) return; const h = hs(d.id + 'p'); if (h % 3 === 0) { d.ogrenciPuan = null; return; } const puan = [5, 5, 4, 5, 4, 3, 5, 4][h % 8], yorum = h % 5 === 0 ? YORUM[h % YORUM.length] : ''; d.ogrenciPuan = { puan: yorum.includes('geç başladı') ? 3 : puan, yorum, tarih: d.tarih }; });
  if (demo) (o.dersler || []).forEach(d => { if (d.durum !== 'Yapıldı' || d.beceri !== undefined) return; const k = kz[d.kursiyer]; if (!k) return; const taban = [2.7, 3.5, 3.9, 4.2, 4.0, 3.8, 4.4][hs(k.id) % 7]; d.beceri = Object.fromEntries(BECERI.map(([b], i) => [b, Math.max(1, Math.min(5, Math.round(taban + ((hs(d.id + b) % 5) - 2) * 0.3 + (i === hs(k.id) % 5 ? -0.9 : 0))))])); });
  // örnek yakıt dolumları: litre ve sayaç (tüketim hesabı için); bir araçta tüketim bilerek yüksek (kaçak/hatalı kullanım örneği)
  if (demo) (o.araclar || []).forEach((ar, ai) => { const l = (o.hareket || []).filter(h => h.arac === ar.id && h.kategori === 'Yakıt').sort((x, y) => y.tarih.localeCompare(x.tarih)); let km = ar.km || 40000; const tk = (BEKLENEN_TUKETIM[ar.sinif] || 6.8) * (ai === 2 ? 1.12 : 1); l.forEach((h, i) => { if (h.litre) return; h.litre = Math.round(h.tutar / 46 * 10) / 10; h.kmSayac = km; km -= Math.round(h.litre / (i === 0 && ai === 2 ? tk * 1.5 : tk) * 100); }); });
  // örnek dersler: takip formundaki konular ders sırasına göre (gerçek kursta öğretmen ders sonunda seçer)
  if (demo) { const sira = {}; (o.dersler || []).filter(d => d.durum === 'Yapıldı').sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(d => { const k = kz[d.kursiyer]; if (!k) return; sira[k.id] = (sira[k.id] || 0) + 1; if (!d.konular) d.konular = konuOner(k.sinif, sira[k.id], (SINIFLAR[k.sinif] || {}).direksiyon); }); }
  o.kurs.maliyet = o.kurs.maliyet || { yakit: 46, tuketim: 6.5, km: 22, bakim: 55, pay: 55 };
  // mevzuat uyumu (E1): iade hesabında teorik payı; demo: çalışma izinleri, sınava hazır yazıları, bir ücretsiz kursiyer, ücret ilanı
  if (o.kurs.teorikPay === undefined) o.kurs.teorikPay = 35;
  // sözleşme ücreti kayıt anındaki tutardır; eskiden kabul edilen ek ders taksit olarak toplama eklenirdi: ayrılıp sözleşme ücreti yazılır (iade, taban denetimi)
  (o.kursiyerler || []).forEach(k => { if (!k.odeme || k.odeme.sozlesme) return; const ek = (k.odeme.taksitler || []).filter(t => /ek direksiyon dersi$/i.test(t.aciklama || '')).reduce((a, t) => a + (+t.tutar || 0), 0); if (ek) k.odeme.sozlesme = k.odeme.toplam + (k.odeme.iade || 0) - ek; });
  if (demo && !o._e1) {
    o._e1 = true; o.kurs.tarifeIlan = o.kurs.tarifeIlan || String(new Date().getFullYear());
    (o.egitmenler || []).forEach((x, i, l) => { if (!x.calismaIzinNo && i < l.length - 1) x.calismaIzinNo = String(5048176 + i * 7311); /* MEBBİS izin no 7 hane */ });
    const sv = (o.kursiyerler || []).filter(k => k.asama === 'Sınav' && !(k.dsinav && k.dsinav.sonuc === 'Geçti'));
    sv.forEach((k, i) => { if (!k.hazirYazi && i < sv.length - 1) k.hazirYazi = { tarih: gun(-3 - i), egitmen: k.egitmen, kim: 'Demo', ...(i ? { yuklendi: gun(-2 - i) } : {}) }; });
    (o.hareket || []).filter(h => h.tur === 'Gelir' && h.kursiyer && h.yontem === 'Nakit').forEach((h, i) => { if (i > 1) h.bankaya = h.tarih; });
    const uc = (o.kursiyerler || []).find(k => k.asama === 'Teorik' && !k.ucretsiz);
    if (uc) { uc.odeme.sozlesme = uc.odeme.toplam; const acik = uc.odeme.taksitler.filter(t => !t.odendi); acik.forEach(t => { t.iptal = gun(-20); }); uc.odeme.toplam -= acik.reduce((a, t) => a + t.tutar, 0); uc.ucretsiz = { tarih: gun(-20), neden: 'Şehit / gazi yakını', no: '', kim: 'Demo' }; }
  }
  // PER-003/007 demo: MEBBİS personelinden okunmuş gibi çalışma izni bitişleri ve haftalık saat (biri 24 gün sonra bitiyor: Bugün'de uyarı)
  // DIR-011 demo: belgesiz adayların ilk iki dersi eğitim alanında (biri eksik bırakılır: kural örneği)
  if (demo && !o._alanSim) { o._alanSim = true; (o.kursiyerler || []).filter(k => !(k.mevcutEhliyet && k.mevcutEhliyet !== 'Yok')).forEach((k, i) => { if (i === 2) return; (o.dersler || []).filter(d => d.kursiyer === k.id && d.durum !== 'İptal').sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).slice(0, 2).forEach(d => { if (!d.tur) d.tur = 'alan'; }); }); }
  // PER-023 demo: EK-21 hizmet içi eğitim belgesi (biri eksik: Bugün'de uyarı)
  if (demo && !o._ek21) { o._ek21 = true; (o.egitmenler || []).forEach((x, i) => { if (i === 3 || (x.evraklar || []).some(v => v.tur === 'ek21')) return; const t = gun(-260 - i * 25), d = new Date(t + 'T12:00:00'); d.setFullYear(d.getFullYear() + 10);
    x.evraklar = [...(x.evraklar || []), { id: 'pe-ek21-' + x.id, tur: 'ek21', not: '', tarih: t, bitis: iso(d) }]; }); }
  if (demo && !o._per) { o._per = true; (o.egitmenler || []).forEach((x, i) => { if (!x.calismaIzinNo || x.mebIzinBitis) return; const bit = gun(i === 1 ? 24 : 150 + i * 70), kds = i === 2 ? 30 : 40;
    x.mebIzinBitis = bit; x.meb = { izinNo: x.calismaIzinNo, gorev: 'Usta Öğretici', brans: 'Direksiyon Eğitimi', statu: i === 2 ? 'Ücretli' : 'Sözleşmeli', izinBas: gun(i === 1 ? -341 : -215 + i * 70), izinBit: bit, maasKds: i === 2 ? 0 : kds, ucretKds: i === 2 ? kds : 0, haftaSaat: kds, okuma: gun(-1), ...(x.meb || {}) }; }); }
  // MSJ-009: gelen kutusu 60 gün saklanır — aday sohbetlerinde 60 günden eski mesajlar ve devredilen eski kayıtlar düşer.
  // Tarihi olmayan eski mesajlar adayın son tarihi 60 günden eskiyse düşer (o tarihten sonra yazışma olmadığı için).
  { const sinir = Date.now() - 60 * 864e5, eski = t => t && Date.parse(t) < sinir;
    (o.adaylar || []).forEach(a => { if (!Array.isArray(a.mesajlar) || !a.mesajlar.length) return; const tarihsizEski = a.tarih && Date.parse(a.tarih + 'T23:59:59') < sinir; a.mesajlar = a.mesajlar.filter(m => m && (m.z ? !eski(m.z) : !tarihsizEski)); });
    if (Array.isArray(o.devredilen)) o.devredilen = o.devredilen.filter(d => !d || !eski(d.z)); }
  if (o.kurs.kendiRandevu === undefined) o.kurs.kendiRandevu = true;
  noTamamla(o.kursiyerler || []);
  // gönderim geçmişi sınırsız büyümesin (eşitleme kovaları 1 MB sınırına yaklaşmasın): son 5000 mesaj
  if (Array.isArray(o.gonderimler) && o.gonderimler.length > 5000) o.gonderimler.length = 5000;
  return o;
}
// Yeni tahsilata kalıcı makbuz numarası
// Bulut kancaları (bulut.js doldurur; demoda boş): makbuz numarası, sunucu işlem kaydı, zamanlı mesajın tek cihazdan gitmesi
export const bulutKanca = { makbuzNo: null, kayit: null, sahiplen: null, cihaz: null, yetki: null };
// PAR-070: makbuz numarası biçimi kurulumda ayarlanır (S.kurs.makbuz { onek, yillik, basla, uzunluk }); varsayılan eskisi gibi M2026-00001.
// Seri: yıllıksa yıl (yıl başında 1'den), değilse tek seri 'S'. İlk makbuzdan sonra önek, yıl ve uzunluk kilitlenir; başlangıç numarası yalnız yükseltilebilir.
export const makbuzAyar = () => { const m = (S.kurs && S.kurs.makbuz) || {}; return { onek: String(m.onek ?? 'M'), yillik: m.yillik !== false, basla: Math.max(1, Math.floor(+m.basla) || 1), uzunluk: Math.min(8, Math.max(3, Math.floor(+m.uzunluk) || 5)) }; };
// PAR-040: şubenin kendi makbuz öneki varsa (S.subeler[].makbuzOnek) o şubenin ayrı serisi: seri '<şube>_<yıl|S>'
const subeOnek = sid => ((S.subeler || []).find(x => x.id === sid) || {}).makbuzOnek || '';
export const makbuzSeri = (t, sube) => (sube && subeOnek(sube) ? sube + '_' : '') + (makbuzAyar().yillik ? String(t).slice(0, 4) : 'S');
// başlangıç numarası girildiği serinin (yılın) içindir; sonraki yıl yine 1'den
export const makbuzBaslangic = seri => { if (String(seri).includes('_')) { const x = (S.subeler || []).find(y => y.id === String(seri).split('_')[0]); return Math.max(1, +(x && x.makbuzBasla) || 1); } const m = (S.kurs && S.kurs.makbuz) || {}; return !makbuzAyar().yillik || !m.baslaSeri || m.baslaSeri === seri ? makbuzAyar().basla : 1; };
export const makbuzBicim = (seri, n) => { const a = makbuzAyar(), s = String(n).padStart(a.uzunluk, '0'), [sb_, y] = String(seri).includes('_') ? String(seri).split('_') : ['', seri], on = sb_ ? subeOnek(sb_) || a.onek : a.onek; return a.yillik ? on + y + '-' + s : on + s; };
const reKac = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const makbuzSira = (no) => { const a = makbuzAyar(), dene = (on, sb_) => { const m = new RegExp('^' + reKac(on) + (a.yillik ? '(\\d{4})-(\\d+)$' : '(\\d+)$')).exec(no || ''); return m ? [(sb_ ? sb_ + '_' : '') + (a.yillik ? m[1] : 'S'), +(a.yillik ? m[2] : m[1])] : null; };
  for (const x of (S.subeler || []).filter(x => x.makbuzOnek).sort((p, q) => q.makbuzOnek.length - p.makbuzOnek.length)) { const r = dene(x.makbuzOnek, x.id); if (r) return r; } return dene(a.onek, ''); };
export const makbuzKilitli = () => (S.hareket || []).some(h => h.no);
// Yakıt tüketimi (L/100 km): litre ve kilometre sayacı girilmiş dolumlardan, dolu depo yöntemiyle (iki dolum arası km'ye sonraki dolumun litresi)
export const beklenenTuketim = a => BEKLENEN_TUKETIM[a.sinif] || (S.kurs.maliyet && S.kurs.maliyet.tuketim) || 6.5;
export function tuketim(a, gunSay = 120) {
  const l = (S.hareket || []).filter(h => h.arac === a.id && h.kategori === 'Yakıt' && h.litre && h.kmSayac && fark(h.tarih) >= -gunSay).sort((x, y) => x.kmSayac - y.kmSayac);
  if (l.length < 2) return null;
  const km = l[l.length - 1].kmSayac - l[0].kmSayac; if (km < 100) return null;
  const r = x => Math.round(x * 10) / 10, s1 = l[l.length - 1], s0 = l[l.length - 2];
  const ort = r(l.slice(1).reduce((t, h) => t + h.litre, 0) / km * 100), son = s1.kmSayac > s0.kmSayac ? r(s1.litre / (s1.kmSayac - s0.kmSayac) * 100) : null;
  const yuksek = (son && l.length >= 4 && son > ort * 1.25) || ort > beklenenTuketim(a) * 1.35;
  return { ort, son, km, dolum: l.length, yuksek };
}
export function makbuzNoVer(h) {
  if (h.no || h.tur !== 'Gelir') return h.no;
  const yil = makbuzSeri(h.tarih, h.sube || ((S.kursiyerler || []).find(x => x.id === h.kursiyer) || {}).sube);
  // gerçek kurs: numara sunucudaki sayaçtan ayrılır, iki cihaz aynı numarayı veremez
  const n = bulutKanca.makbuzNo && bulutKanca.makbuzNo(yil);
  if (n) { h.no = makbuzBicim(yil, n); return h.no; }
  S.sayac = S.sayac || {};
  const enBuyuk = Math.max(S.sayac['m' + yil] || 0, makbuzBaslangic(yil) - 1, ...(S.hareket || []).map(x => { const m = makbuzSira(x.no); return m && m[0] === yil ? m[1] : 0; }));
  S.sayac['m' + yil] = enBuyuk + 1; h.no = makbuzBicim(yil, enBuyuk + 1);
  if (bulutKanca.makbuzNo) h.noGecici = bulutKanca.cihaz || true;  // çevrimdışı verildi; bağlantı gelince çakışma denetlenir
  return h.no;
}
// Sınıf ayarlarını kalıcı yaz
// Saat değişince eski kayıtların dondurulmuş değeri (kural tarihinden önceki kurs ayarı ya da v208 varsayılanı) bir kez saklanır
export function sinifKaydet(k, alan) { if (alan && 'ucret' in alan) S.kurs.ucretOnay = gun(0);
  // PAR-007: saat değişmeden önce o sınıftaki öğrencilerin sözleşme saatleri dondurulur (iade ve saat başı ücret eski sözleşmeyle kalır; mevzuat.js saatUcretleri)
  if (alan && ('direksiyon' in alan || 'teorik' in alan)) (S.kursiyerler || []).forEach(x => { if (x.sinif !== k || x.sozlesmeSaat || x.kapali) return; const g = direksiyonAyrinti(x); x.sozlesmeSaat = { teorik: +((SINIFLAR[k] || {}).teorik) || 0, direksiyon: g.ilk ?? g.saat, tarih: gun(0) }; }); if (alan && 'direksiyon' in alan && ESKI_DIREKSIYON[k] !== undefined && ((S.kurs.siniflar || {})[k] || {}).donukDireksiyon === undefined) { const o = (S.kurs.siniflar || {})[k] || {}; alan = { ...alan, donukDireksiyon: o.direksiyon != null ? o.direksiyon : ESKI_DIREKSIYON[k] }; } Object.assign(SINIFLAR[k], alan); S.kurs.siniflar[k] = { ...(S.kurs.siniflar[k] || {}), ...alan }; }
// MEBBİS'e girilmiş dersin değişmesi: hangi yoldan olursa olsun (sürükle, taşı, iptal, öğrenci/öğretmen telefonu, WhatsApp) kaydette fark edilir.
// Saati/öğretmeni/aracı değişen ders yeniden "MEBBİS'e girilecek" olur; silinen ders "MEBBİS'ten silinecek" listesine yazılır.
let mebIz = null;
function mebDegisimIzle() {
  const iz = d => [d.tarih, d.saat, d.egitmen, d.arac || '', d.kursiyer, d.egitimTuru || ''].join('|'), simdi = new Map();  // DIR-009: elle değişen eğitim türü de MEBBİS kaydını eskitir
  (S.dersler || []).forEach(d => { if (d.meb) simdi.set(d.id, iz(d)); });
  if (mebIz) {
    const varolan = new Map((S.dersler || []).map(d => [d.id, d]));
    mebIz.forEach((eski, id) => {
      const d = varolan.get(id), [tarih, saat, egitmen, arac, kursiyer] = eski.split('|');
      if (!d) { const l = S.mebSilinecek = S.mebSilinecek || []; if (!l.some(x => x.id === id)) l.push({ id, tarih, saat, egitmen, arac, kursiyer, zaman: gun(0) }); }
      else if (d.meb && iz(d) !== eski) { d.meb = false; d.mebDegisti = { eski: tarih + ' ' + saat, zaman: gun(0) }; simdi.delete(id); }
    });
  }
  mebIz = simdi;
}
// Taban yüklemede kurulur: sayfa açıldıktan sonraki ilk değişiklik de (saat, öğretmen, araç, eğitim türü) MEBBİS kaydını eskitir.
mebDegisimIzle();
// YON-018 (SOR-147): ön büroya ekran ve işlem yetkisi — müdür verir (yetkili yalnız kendinde olanı verir: müdür her şeye sahip).
// Ekran: varsayılan açık olanlar kapatılabilir; işlem: varsayılan kapalı hassas işlemler açılabilir. S.kurs.yetki = { ekran: { kasa: false… }, islem: { iptal: true… } }
export const YETKI_EKRAN = [['mesajlar', 'Mesajlar'], ['adaylar', 'Yeni öğrenciler'], ['kursiyerler', 'Kursiyerler'], ['plan', 'Direksiyon planı'], ['teorik', 'Teorik dersler'], ['sinavlar', 'Sınavlar'], ['kasa', 'Kasa ve ödemeler'], ['meb', 'MEB işlemleri'], ['belgeler', 'Belgeler ve çıktılar'], ['filo', 'Ekip ve araçlar']];
export const YETKI_ISLEM = [['iptal', 'Tahsilat iptali'], ['duzelt', 'Kasa hareketini düzeltme ve silme'], ['indirim', 'İndirim uygulama'], ['iade', 'İade yapma'], ['senet', 'Senetli satış ve avukata verme'], ['fatura', 'Fatura iptali'], ['devir', 'Devir bakiyesi girme'], ['mebYaz', 'MEBBİS’e yaz onayı'], ['mebKabul', 'MEBBİS Yardımcısı kurum bilgilendirmesini kabul']];
// ekran düzeyi: true (ya da yok) = tam (görür, ekler, düzenler) · 'gor' = yalnız görür · false = kapalı
export const EKRAN_DUZEY = [['tam', 'Görür ve değiştirir'], ['gor', 'Yalnız görür'], ['kapali', 'Kapalı']];
export const ekranDuzey = ad => { let u; try { u = oturum.kullanici; } catch (x) { return 'tam'; } if (!u || u.rol !== 'sekreter') return 'tam'; const v = ((((S.kurs || {}).yetki || {}).ekran) || {})[ad]; return v === false ? 'kapali' : v === 'gor' ? 'gor' : 'tam'; };
export const ekranYetkili = ad => ekranDuzey(ad) !== 'kapali';
export const islemYetkili = ad => { let u; try { u = oturum.kullanici; } catch (x) { return false; } if (!u) return false; if (u.rol === 'mudur') return true; if (u.rol !== 'sekreter') return false; return !!((((S.kurs || {}).yetki || {}).islem || {})[ad]); };
// YON-023: kaydeden izi bütün ana kayıt türlerinde — yüklemede var olan kimlikler taban sayılır; sonra eklenen kayıt ilk kaydette kaydedeni ve zamanını alır
// (sunucudan gelen kayıtlar tabana eklenir, başkasının kaydı bu cihazın kullanıcısıyla işaretlenmez). Değiştiren izi düzenleme pencerelerinde yazılır.
const IZ_KOL = ['kursiyerler', 'dersler', 'adaylar', 'sinavlar', 'gruplar', 'egitmenler', 'araclar', 'teorik'];
let izTaban = null;
// Değişiklik de kaydette yakalanır: kayıt başına içerik izi (JSON) tabanla karşılaştırılır, farklıysa değiştiren ve zamanı yazılır.
const izMetin = x => { const { degistiren, degisZamani, ...y } = x; return JSON.stringify(y); };
export function izTabaniYenile() { try { subeTamamla(); noTamamla(); odemeUzlas(); } catch (x) { } izTaban = {}; IZ_KOL.forEach(c => { izTaban[c] = new Map(((S && S[c]) || []).filter(x => x && x.id).map(x => [x.id, izMetin(x)])); }); }
function kayitIz() { let u; try { u = oturum.kullanici; } catch (x) { return; } if (!u || !izTaban) return; const ad = u.ad || u.id || '', z = new Date().toISOString();
  IZ_KOL.forEach(c => ((S[c]) || []).forEach(x => { if (!x || !x.id) return; const m = izMetin(x), o = izTaban[c].get(x.id);
    if (o === undefined) { if (!x.kaydeden) { x.kaydeden = ad; x.kayitZamani = z; } izTaban[c].set(x.id, izMetin(x)); }
    else if (o !== m) { x.degistiren = ad; x.degisZamani = z; izTaban[c].set(x.id, m); } })); }
export const degisti = x => { let u = null; try { u = oturum.kullanici; } catch (y) { } if (x && u) { x.degistiren = u.ad || u.id || ''; x.degisZamani = new Date().toISOString(); } };
izTabaniYenile();
// Ödeme uzlaştırma: taksitin ödenmiş tutarı, onu ödeyen kasa hareketlerinden (dağılım) aşağı düşemez.
// İki cihaz aynı kursiyeri farklı anlarda değiştirip eski kopya yazılırsa "ödendi" işareti silinebiliyordu; hareket ayrı kayıt olduğu için kalır ve buradan geri gelir.
function odemeUzlas() {
  const gerek = new Map();
  (S.hareket || []).forEach(h => { if (h.tur !== 'Gelir' || h.iptal || !h.kursiyer || !Array.isArray(h.dagilim)) return; h.dagilim.forEach(x => { const a = h.kursiyer + '|' + x.i + '|' + x.vade; gerek.set(a, (gerek.get(a) || 0) + (+x.al || 0)); }); });
  if (!gerek.size) return;
  const kz = new Map((S.kursiyerler || []).map(k => [k.id, k]));
  gerek.forEach((tutar, a) => {
    const [kid, i, vade] = a.split('|'), k = kz.get(kid), t = k && k.odeme && k.odeme.taksitler[+i]; if (!t || t.vade !== vade || t.iptal) return;
    const odenmis = t.odendi ? t.tutar : (t.kismi || 0); if (odenmis >= Math.min(tutar, t.tutar)) return;
    if (tutar >= t.tutar) { t.odendi = t.odendi || gun(0); delete t.kismi; } else t.kismi = tutar;
  });
}
// İptal edilen ders plandan çıkar ama izi kalır (kim, ne zaman, neden): denetimde ve öğretmen primi hesabında sorulduğunda gösterilir
export function dersIptalIz(d, neden, not) { if (!d) return; (S.dersIptaller = S.dersIptaller || []).unshift({ id: d.id, kursiyer: d.kursiyer, egitmen: d.egitmen, arac: d.arac || null, tarih: d.tarih, saat: d.saat, meb: !!d.meb, iptal: { zaman: yerelZaman(), kim: oturum.kullanici ? oturum.kullanici.ad : 'Öğrenci paneli', neden: neden || '', not: String(not || '').slice(0, 200) } }); if (S.dersIptaller.length > 1000) S.dersIptaller.length = 1000; }
// Kursiyer numarası: kayıt sırasına göre kalıcı sıra no (demo kayıtlarında kimlikteki sayı); bir kez verilir, değişmez
function noTamamla(l = S.kursiyerler || []) {
  if (!l.some(k => !k.no)) return;
  let son = l.reduce((a, k) => Math.max(a, +k.no || 0), 0);
  l.filter(k => !k.no).sort((a, b) => (a.kayit || '').localeCompare(b.kayit || '') || String(a.id).localeCompare(String(b.id))).forEach(k => { const m = /^k(\d{1,4})$/.exec(k.id); k.no = m && !l.some(x => +x.no === +m[1]) ? +m[1] : ++son; if (+k.no > son) son = +k.no; });
}
function subeTamamla() {
  if (!S.subeler) return;
  const v = gorunum.sube || 's1';
  S.kursiyerler.forEach(k => { if (!k.sube) { const e = S.egitmenler.find(x => x.id === k.egitmen); k.sube = gorunum.sube || (e && e.sube) || v; } });
  S.hareket.forEach(h => { if (!h.kim && h.id.length > 12 && oturum.kullanici) h.kim = oturum.kullanici.ad; if (!h.sube) { const k = h.kursiyer && S.kursiyerler.find(x => x.id === h.kursiyer); h.sube = (k && k.sube) || v; } });
  S.araclar.forEach(a => { if (!a.sube) a.sube = v; });
  S.egitmenler.forEach(x => { if (!x.sube) x.sube = v; });
}
// Kursun banka hesapları: adı, bankası, hesap sahibi ve öğrenciye görünen notuyla. Varsayılan hesap kurs.iban olarak da tutulur
// (taksit hatırlatmaları ve eski ekranlar onu kullanır). Eski tek IBAN'lı kurslar tek hesaplı liste olarak okunur.
export const ibanlar = (K = S.kurs) => Array.isArray(K.ibanlar) ? K.ibanlar : K.iban ? [{ id: 'h1', ad: 'Kurs hesabı', banka: '', alici: K.ad || '', iban: K.iban, not: '', varsayilan: true }] : [];
export const ibanVarsayilan = (K = S.kurs) => { const l = ibanlar(K); return l.find(x => x.varsayilan) || l[0] || null; };
export const ibanBicim = s => String(s || '').replace(/\s/g, '').toLocaleUpperCase('tr').replace(/(.{4})/g, '$1 ').trim();
export function ibanGecerli(s) {
  const x = String(s || '').replace(/\s/g, '').toUpperCase(); if (!/^TR\d{24}$/.test(x)) return false;
  let m = 0; for (const ch of (x.slice(4) + x.slice(0, 4)).replace(/[A-Z]/g, c => c.charCodeAt(0) - 55)) m = (m * 10 + +ch) % 97;
  return m === 1;
}
// Ücret kalemleri (Ayarlar › Sınıf ve ücretler): ek ve özel direksiyon dersi sınıfa göre, uygulama sınavı ücreti hakka göre
// (1., 2., 3. sınav farklı olabilir), kitap ve evrak gibi diğer kalemler liste. Girilmemişse eski tek değerler kullanılır.
export const ekDersFiyat = sinif => { const v = SINIFLAR[sinif] && SINIFLAR[sinif].ekDers; return v != null ? v : (S.kurs.ekDersUcreti || ekDersTabani() || 0); };
// Özel ders (belgeliye özel direksiyon eğitimi, md.6/4): sınıfa özel ücret, yoksa kursun özel ders ücreti, o da yoksa ek ders ücreti
export const ozelDersFiyat = sinif => { const v = SINIFLAR[sinif] && SINIFLAR[sinif].ozelDers; return v != null ? v : (S.kurs.ozelDersUcreti || ekDersFiyat(sinif)); };
// PAR-025/064: MEB uygulama (direksiyon) sınavı ücreti yıllık (S.kurs.mebSinavUcreti { '2026': 2000 }); her hakta aynı (MTSK md.43/5: döner sermayeye aday başı).
// Kurs ilk sınavın ücretini kendisi karşılıyorsa (S.kurs.ilkSinavKurs) öğrenciden alınmaz, kalem 'kurs ödedi' olarak emanette görünür.
// Kim yatırır (PAR-063): S.kurs.sinavUcretKip 'kurs' (kurs tahsil edip toplu yatırır: emanet kalemi, oturum dekontu) | 'aday' (aday kendisi yatırır: kurs borcuna girmez)
export const mebSinavUcreti = (t = gun(0)) => +((S.kurs.mebSinavUcreti || {})[String(t).slice(0, 4)]) || 0;
// gösterim ve liste tutarı: yılın ücreti girilmemişse eski ayardaki (hak başı) tekrar sınavı ücreti
export const mebSinavUcretiGoster = (t = gun(0)) => mebSinavUcreti(t) || (Array.isArray(S.kurs.uygulamaUcret) && +S.kurs.uygulamaUcret[1]) || +((S.kurs.tekrarUcret || {}).dsinav) || 0;
export const sinavUcretKip = () => S.kurs.sinavUcretKip === 'aday' ? 'aday' : 'kurs';
export const uygulamaSinavUcreti = (hak, t) => { const y = mebSinavUcreti(t); if (y) return hak <= 1 && S.kurs.ilkSinavKurs ? 0 : y; const l = S.kurs.uygulamaUcret; if (Array.isArray(l) && l.length) return +l[Math.min(Math.max(hak, 1), l.length) - 1] || 0; return hak > 1 ? ((S.kurs.tekrarUcret || {}).dsinav || 0) : 0; };
export const esinavUcreti = hak => hak > 1 ? ((S.kurs.tekrarUcret || {}).esinav || 0) : (S.kurs.esinavUcreti ?? 1250);
export const digerUcretler = () => S.kurs.digerUcretler || [];

/* ---------- sınıf etiketi, teorik eğitim, ek kalem türü (il taban listesi notları 4–5) ---------- */
// Eski tip belgelerin kapsadığı sınıflar (KTY geçici md.10/1; E için 28/4/1997 sonrası alınan, dar olan liste)
const ESKI_KAPSAM = { A1: ['M', 'A1'], A2: ['M', 'A1', 'A2', 'A', 'B1'], B: ['M', 'B1', 'B', 'D1', 'F'], C: ['M', 'B1', 'B', 'D1', 'C1', 'C', 'F'], D: ['M', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'F'], E: ['M', 'B1', 'B', 'C1', 'C', 'D1', 'D', 'F'], F: ['M', 'F'], G: ['M', 'G'] };
// Eğitim türü sınıf (sertifika vermeyen: 100 ceza puanı eğitimi): e-sınav, sertifika ve ehliyet adımları yok, kurs eğitim belgesi verir (MTSK md.16/3)
// 100 ceza puanı eğitimi MEBBİS'te ayrı ekranda değil, MTSK modülünde normal aday kaydıdır; Aday Dönem Kayıt'ta (skt02001)
// istenen sertifika bu seçenektir (Aday Durum skt02009'da görüldü, 18 Kas; SOR-020). Seçenek metni kayıt ekranında farklı çıkarsa
// eklenti seçeneği bulamaz ve işi "seçeneklerde yok" diye durdurur; MEBBİS'e yanlış sınıf gitmez.
export const MEB_CEZA_SERTIFIKA = '100 Ceza Puanı (Manuel)';
// MEBBİS kurum bilgisi (SKT01001; mebtoplu.js kurumIsle yazar): seçili şubenin, okunmadıysa null. RAP-006
export const mebKurum = () => { const s = seciliSube() || (S.subeler || [])[0]; return (s && s.mebKurum) || (S.kurs && S.kurs.mebKurum) || null; };
// Derslikler (TEO-016): MEBBİS'ten okunan (SKT01001 dgDerslikBilgileri, mebKurum) ve elle girilen (S.derslikler) tek liste.
// { ad: 'Derslik 1', no: 1 (MEBBİS cmbDerslikAdi 1..10; teorik programda 'DERSLİK-1'), tur, kontenjan (1–30), durum, acilis, kaynak: 'MEBBİS'|'elle' }
export const DERSLIK_TURLERI = ['Trafik ve Çevre Bilgisi', 'İlk Yardım', 'Araç Tekniği'];
const dlNo = ad => +((String(ad || '').match(/\d+/) || [])[0] || 0) || null;
export function derslikListesi() {
  const mk = mebKurum(), l = [];
  ((mk && mk.derslikler) || []).forEach(x => l.push({ ad: x.ad || ('Derslik ' + (l.length + 1)), no: dlNo(x.ad), tur: x.tur || '', kontenjan: x.kontenjan || null, durum: x.durum || '', kaynak: 'MEBBİS' }));
  (S.derslikler || []).forEach(x => { if (!l.some(y => y.no && y.no === dlNo(x.ad))) l.push({ ...x, no: dlNo(x.ad), kaynak: 'elle' }); });
  return l.filter(x => !/kapal/i.test(x.durum || '')).sort((a, b) => (a.no || 99) - (b.no || 99));
}
// ders türüne uygun derslik (otomatik teorik planda ders başına derslik); yoksa ilk derslik
export const derslikOner = konu => { const l = derslikListesi(), n = String(konu || '').toLocaleLowerCase('tr'), t = /ilk ?yard/.test(n) ? 'İlk Yardım' : /araç|arac|motor|teknik/.test(n) ? 'Araç Tekniği' : 'Trafik ve Çevre'; return (l.find(x => String(x.tur).startsWith(t)) || l[0] || {}).ad || ''; };
// program: { kod: 'B', ruhsat, kapanma, durum: 'AÇIK' }; kapanma tarihi yoksa ve durum açıksa açık
export const programAcik = (o, kod) => !!o && (o.programlar || []).some(p => p.kod === kod && !p.kapanma && /açık|acik/.test(String(p.durum || 'AÇIK').toLocaleLowerCase('tr')));
// sınıfın MEBBİS programı kapalı ya da yoksa uyarı metni; kurum bilgisi okunmadıysa ya da program kodu çıkmayan sınıfta (100 ceza, SRC) boş
export function programUyarisi(sinif) {
  const o = mebKurum(), kod = anaSinif(sinif); if (!o || !(o.programlar || []).length || !/^(A1|A2|B1|BE|C1E|C1|CE|D1E|D1|DE|[ABCDFGM])$/.test(kod) || programAcik(o, kod)) return '';
  const p = o.programlar.find(x => x.kod === kod);
  return p ? `MEBBİS’te kurumunuzun ${kod} sınıfı programı kapalı${p.kapanma ? ' (' + p.kapanma.split('-').reverse().join('.') + ')' : ''}; bu sınıfa MEBBİS kaydı açılamaz.` : `MEBBİS’te kurumunuzun ${kod} sınıfı programı yok (kurum bilgileri ${String(o.okundu || '').split('-').reverse().join('.')} okundu); bu sınıfa MEBBİS kaydı açılamaz.`;
}
export const egitimSinifi = sinif => ((SINIFLAR[sinif] || {}).tur || 'ehliyet') === 'egitim';
// Ekranda sınıf adı: "B sınıfı · Manuel/Otomatik/Engelli", ehliyet dışı türlerde kendi adı ("100 ceza puanı eğitimi", "SRC1 · …")
export function sinifEtiket(sinif, k) {
  const S0 = SINIFLAR[sinif] || {}, tur = S0.tur || 'ehliyet';
  if (tur !== 'ehliyet') return tur === 'egitim' ? (String(S0.ad || sinif).split(' · ')[1] || S0.ad || sinif) : (S0.ad || sinif);
  const ek = sinif === 'B' ? 'Manuel' : sinif === 'B-O' ? 'Otomatik' : sinif === 'B-EN' ? 'Engelli' + (k && k.kendiArac ? ' · kendi aracıyla' : '') : '';
  return `${anaSinif(sinif)} sınıfı${ek ? ' · ' + ek : ''}`;
}
// Kursiyer teorik eğitim alıyor mu: listede satırı varsa satırın türü (ilk belge, G, 100 ceza: evet; e-sınav muaf, fark, otomatikten manuele, römork: hayır);
// liste yoksa e-sınav muafı ve mevcut belgeli (G ve eğitim türü hariç) teorik almaz
// md.16/2 teorik ders muafiyeti (TEO-006): okul belgesiyle trafik ve çevre, ilk yardım, araç tekniği; geçerli ilk yardımcı sertifikasıyla ilk yardım.
// Kursiyer istemesi hâlinde o derslerin eğitimine girmez, sınava girer. k.teorikDersMuaf = { dersler: ['trafik','ilkyardim','arac'], belge, tarih, kim }.
// Ders saatleri MEB programındaki dağılım (34 saatte trafik ve çevre 16, ilk yardım 8, araç tekniği 6, trafik adabı 4); başka toplamlı sınıfta orantılı.
// Teorik derslerin resmî konu dağılımı (TEO-012; MEB programları, ders defteri sırası): trafik ve çevre 16, ilk yardım 8, araç tekniği 6, trafik adabı 4 ders.
export const RESMI_KONU = {
  trafik: ['Trafik sistemi, sistem kuramı ve trafikle ilgili kurumlar', 'Sürücü psikolojisi ve sürücü davranışları', 'Alkol, uyuşturucu, yorgunluk ve risk alma davranışı', 'Trafikle ilgili temel tanımlar',
    'Araç sürme yasağı ve karayolunun kullanılması', 'Hız ve takip mesafesi', 'Geçme kuralları', 'Dönüş, manevra ve kavşakta geçiş hakkı', 'Geçiş üstünlüğü ve karşılaşmada geçiş kolaylığı', 'Viraj, durma, duraklama ve park',
    'Işıklar, araç boyutu, yük ve yolcu', 'Otoyol, koruyucu tertibat, bisiklet ve motosiklet', 'Kaza faktörleri, kusur ve kaza sonrası işlemler', 'Hukuki sorumluluk, sigorta, trafik suçları ve ceza puanları',
    'Tescil, zorunlu gereçler ve sürücü belgeleri', 'Çevre ve trafik, hayvan hakları, kirlilik, gürültü ve harita okuma'],
  ilkyardim: ['Temel ilk yardım uygulamaları ve olay yerinin değerlendirilmesi', 'Temel yaşam desteği: yetişkin, çocuk, bebek', 'Solunum yolu tıkanması', 'Kanamalar ve yaralar', 'Kırık, çıkık ve burkulmalar',
    'Bilinç bozuklukları: koma, havale, sara, kan şekeri düşüklüğü', 'Göğüs ağrısı ve diğer acil durumlar', 'Hasta ve yaralı taşıma teknikleri'],
  arac: ['Aracın kısımları ve motor', 'Sürüşe hazırlık: dış kontrol, koltuk, ayna ve emniyet kemeri', 'Göstergeler ve uyarı lambaları', 'Akaryakıt, yağ, radyatör, lastik, ışık ve akü kontrolleri', 'Lastik değişimi, kar zinciri, ampul ve antifriz', 'Arıza belirtileri, yakıt tüketimi ve ekonomik sürüş'],
  adab: ['Adabımuaşeret ve trafik; temel değerler, empati ve doğru iletişim', 'Sorumluluk, yardımlaşma, hoşgörü, nezaket, saygı ve sabır', 'Empati, öfke yönetimi, beden dili ve trafik görevlileriyle iletişim', 'Birey, toplum, kamu, yaşam ve çevre hakkı; doğru davranışın yararları'],
};
const resmiTur = konu => { const n = String(konu || '').toLocaleLowerCase('tr'); return /ilk ?yard/.test(n) ? 'ilkyardim' : /araç|arac|motor|teknik/.test(n) ? 'arac' : /adab|adap/.test(n) ? 'adab' : 'trafik'; };
// Bir teorik dersin (oturumun) grubundaki sırasına göre resmî ders numaraları ve konuları: aynı türdeki önceki oturumların saatleri sayılır
export function dersKonulariResmi(t) {
  if (!t) return { tur: 'trafik', no: [], konular: [] };
  const tur = resmiTur(t.konu), l = (S.teorik || []).filter(x => x.grup === t.grup && resmiTur(x.konu) === tur).sort((a, b) => (a.tarih + (a.saat || '')).localeCompare(b.tarih + (b.saat || '')) || String(a.id).localeCompare(String(b.id)));
  let bas = 0; for (const x of l) { if (x === t || x.id === t.id) break; bas += +x.sure || 1; }
  const liste = RESMI_KONU[tur], no = Array.from({ length: +t.sure || 1 }, (_, i) => bas + i + 1).filter(n => n <= liste.length);
  return { tur, no, konular: no.map(n => liste[n - 1]) };
}
// Soru bankası ve konu anlatımı (MUFREDAT konusu) → resmî ders numarası (soru etiketleri; öğrencinin konusu hangi MEB dersinde işlenir)
const MUF_RESMI = { trafik: [4, 5, 5, 8, 6, 7, 10, 11, 12, 13, 14, 16, 10, 5, 6, 11, 3, 15, 1, 12], ilkyardim: [1, 1, 2, 4, 5, 7, 6, 8, 1, 3, 5, 4, 7, 7], motor: [1, 4, 1, 1, 1, 4, 3, 2, 6, 6, 5], adab: [1, 3, 4, 2, 2, 2, 4] };
export const mufredatResmiDers = (key, no) => (MUF_RESMI[key] || [])[no - 1] || null;
export const TEORIK_MUAF_DERS = [['trafik', 'Trafik ve çevre', 16], ['ilkyardim', 'İlk yardım', 8], ['arac', 'Araç tekniği', 6]];
export function teorikSaat(k) {
  const top = +((SINIFLAR[k && k.sinif] || {}).teorik) || 0, l = (k && k.teorikDersMuaf && k.teorikDersMuaf.dersler) || [];
  if (!l.length || !top) return top;
  const dus = TEORIK_MUAF_DERS.filter(([id]) => l.includes(id)).reduce((a, [, , sa]) => a + Math.round(sa * top / 34), 0);
  return Math.max(0, top - dus);
}
// Belgeli aday (TEO-003): mevcut sürücü belgesiyle farklı sınıf istiyor (md.39). Muafiyet değildir (muaf: son 3 yılda e-sınavı geçen, md.15/5).
// Teorik dersi ve e-sınavı olmayan belgeli adayda MEBBİS durumu "Uygulama Sınav Aşamasında"dır: aşaması Direksiyon, e-sınav işi ve 90 gün kuralı yok.
// DIR-014: MEBBİS'teki aday etiketleri (SKT02006 durum 12 Ceza Kaydı, 13 Kayıt Dondurma, 14 Kayıt Dışı, 15 Ücretsiz, 24 A1/125 CC; k.meb.etiketler)
export const mebEtiketleri = k => ((k && k.meb && k.meb.etiketler) || []).map(x => String(x || '').trim()).filter(Boolean);
export const kayitDondurmaMi = k => mebEtiketleri(k).some(x => /dondur/i.test(x)) || !!(k && k.kapali && k.kapali.tur === 'dondur');
export const belgeliMi = k => !!(k && k.mevcutEhliyet && k.mevcutEhliyet !== 'Yok');
// DIR-011/012: ders sayacı — toplam ve dağılım. Alan ya da simülatör en az 2 saat, akan trafikten önce (MTSK Yön. md.7/1); farklı sınıf alan
// (belgeli) bu eğitimi akan trafikte de alabilir → zorunlu değil. 'yapildi' sayısı mdSinyal'deki ders kayıtlarından; eski programdan aktarılan
// ders sayısı (k.direksiyon kayıtlardan fazlaysa) dağılımı bilinmediği için 'aktarim' olarak ayrı yazılır.
export const ALAN_SIM_SAAT = 2;
// Ders türü (alan/simülatör) seçimi bu tarihten önce zorunlu değildi: eski kayıtlarda bütün dersler 'trafik' görünür. Kural yalnız bu tarihten sonra
// kaydolan ya da en az bir dersine tür girilmiş kursiyerde uygulanır (eski verinin yanlış alarmı olmasın).
export const ALAN_SIM_KURAL_TARIH = '2026-11-19';
export function dersSayaci(k, bas) {
  const l = kursiyerDersleri(k && k.id).filter(d => d.durum !== 'İptal' && d.durum !== 'Gelmedi' && (!bas || d.tarih < bas));
  const as = d => d.tur === 'alan' || d.tur === 'simulator', yap = l.filter(d => d.durum === 'Yapıldı'), pl = l.filter(d => d.durum === 'Planlandı');
  const gerekli = gerekliDireksiyon(k), aktarim = Math.max(0, (+(k && k.direksiyon) || 0) - yap.length);
  const turlu = String((k && k.kayit) || '') >= ALAN_SIM_KURAL_TARIH || kursiyerDersleri(k && k.id).some(d => d.tur);
  // DIR-010: eğitim türüne göre dağılım (egitimTuruOf), gece, başarısız aday (son sınavdan sonra, md.15) ve ikinci dört hak.
  // 'zorunlu': zorunlu ders gereksinimine sayılan (normal; ikinci dört hakta önceki + 2. direksiyon). k.direksiyon geriye uyum için bütün yapılan dersleri sayar
  // (usta uygulaması ve öğrenci ekranı ek dersi direksiyon − gerekli olarak gösterir).
  const egitim = {}; Object.keys(EGITIM_TURU).forEach(a => { egitim[a] = { yapildi: 0, planli: 0 }; });
  l.filter(d => d.durum === 'Yapıldı' || d.durum === 'Planlandı').forEach(d => { const a = egitimTuruOf(k, d); egitim[a][d.durum === 'Yapıldı' ? 'yapildi' : 'planli']++; });
  const ds = (k && k.dsinav) || {}, kaldi = !!ds.tarih && (ds.sonuc === 'Kaldı' || ds.sonuc === 'Girmedi' || ds.girmedi);
  const ih = k && k.ikinciHak, ikinci = ih ? { ...egitim.ikinci, gerek: Math.max(0, (+ih.hedef || 0) - (+ih.onceki || 0)), onceki: +ih.onceki || 0 } : null;
  const basarisiz = { ...egitim.basarisiz, gerek: kaldi && !ih ? kuralAyar('telafiSaat') : 0, sonSinav: kaldi ? ds.tarih : '', sonra: kaldi ? yap.filter(d => d.tarih > ds.tarih && egitimTuruOf(k, d) === 'basarisiz').length : 0 };
  const gece = { yapildi: yap.filter(geceDersMi).length, planli: pl.filter(geceDersMi).length, gerek: geceGerekli(k) };
  // uygulama sınavına girmiş aday zorunlu dersleri tamamlamış sayılır (sınava ancak öyle girilir); sonraki dersler başarısız aday dersidir (md.15)
  const zorunlu = ih ? { yapildi: ikinci.onceki + egitim.ikinci.yapildi, planli: egitim.ikinci.planli } : ds.tarih ? { yapildi: Math.max(gerekli, egitim.normal.yapildi + aktarim), planli: 0 } : { yapildi: egitim.normal.yapildi + aktarim, planli: egitim.normal.planli };
  return { gerekli, yapildi: yap.length + aktarim, planli: pl.length, aktarim, egitim, zorunlu, ikinci, basarisiz, telafi: egitim.onSinav, gece, alanSim: { gerek: belgeliMi(k) || !gerekli || !turlu ? 0 : Math.min(ALAN_SIM_SAAT, gerekli), yapildi: yap.filter(as).length, planli: pl.filter(as).length }, trafik: { yapildi: yap.filter(d => !as(d)).length, planli: pl.filter(d => !as(d)).length } };
}
export const esinavsizBelgeli = k => belgeliMi(k) && !teorikVar(k);
export function teorikVar(k) {
  if (!k) return false; if (k.sinif === 'G' || egitimSinifi(k.sinif)) return true;
  const x = kursiyerTaban(k); if (x && x.satir) return ['ilk', 'teorik', 'ceza'].includes(x.satir.tur);
  return !k.muaf && !mevcutKod(k.mevcutEhliyet);
}
// Ödeme planındaki ek kalemin türü: 'ders' (ilave/özel direksiyon, ikinci dört hak, yeniden kayıt dersleri: kurs ücreti),
// 'resmi' (sınav ücreti, harç, kart: kursiyerin kendi masrafı, kurs ücretine eklenmez, kurs yalnız emanet alır; not 5), 'diger' (kitap, evrak…: not 4)
export function ekTur(x) {
  if (!x) return 'diger'; if (x.tur) return x.tur; if (x.sinav) return 'resmi';
  const a = String(x.ad || '').toLocaleLowerCase('tr');
  if (/sınav|harç|harc|kart ücreti|döner sermaye/.test(a)) return 'resmi';
  if (/^(ek direksiyon|ilave direksiyon|özel ders|ikinci dört hak|yeniden kayıt|telafi|başarısız aday)/.test(a)) return 'ders';
  return 'diger';
}
// Türe göre ek kalem toplamı ve kursiyerin kurs borcu (resmî masraflar hariç: öğrenci ekranı)
// PAR-064: kursOdedi kalemi (ilk sınav ücretini kurs karşıladı) öğrencinin borcuna da ödediğine de girmez; yalnız emanette görünür
const ogrEkler = k => ((k.odeme || {}).ekler || []).filter(x => !x.kursOdedi);
export const ekToplamTur = (k, turler) => ogrEkler(k).filter(x => turler.includes(ekTur(x))).reduce((a, x) => a + (+x.tutar || 0), 0);
export const kursBorcu = k => { const res = ogrEkler(k).filter(x => ekTur(x) === 'resmi'), odRes = res.filter(x => x.odendi).reduce((a, x) => a + (+x.tutar || 0), 0); return Math.max(0, k.odeme.toplam + ekToplam(k) - res.reduce((a, x) => a + (+x.tutar || 0), 0) - (odenen(k) - odRes)); };
export const resmiMasraflar = k => ((k.odeme || {}).ekler || []).filter(x => ekTur(x) === 'resmi');

/* ---------- il taban fiyat listesi (valilik maliyet tablosu; veri js/taban.js) ---------- */
// Kursun ilindeki, o dönemde geçerli liste. Listesi girilmemiş ilde null: hiçbir taban tutar tahmin edilmez, elle girilen "il taban ücreti" kullanılır.
export const tabanListesi = (t = gun(0)) => listeBul(kursunIli(S.kurs), t);
export const tabanDurumu = (t = gun(0)) => listeDurumu(kursunIli(S.kurs), t);
// Kursiyerin dönemi: dönem grubunun ayı (MEBBİS grubu), yoksa kayıt tarihi (liste dönem bazlı geçerli: Eskişehir 2026 = Şubat 2026–Ocak 2027 dönemleri)
export const kursiyerDonemi = k => { const g = (S.gruplar || []).find(x => x.id === (k || {}).teorikGrup); return donemi(g && g.donem) || donemi(g && g.baslangic) || donemi(k && k.kayit) || donemi(gun(0)); };
// Sınıfın etkin taban ücreti: listedeki ilk kez belge satırı; listesi olmayan ilde kursun elle girdiği değer. Listede satırı olmayan sınıf (C, D…) null.
export const sinifTabani = (sinif, L = tabanListesi()) => { const r = sinifSatiri(L, sinif); return r ? r.toplam : L ? null : ((SINIFLAR[sinif] || {}).taban || null); };
// Ek ve özel ders tabanı (listede "ilave direksiyon ders saat ücreti" ve "sürücü belgelilere özel direksiyon eğitimi")
export const ekDersTabani = (L = tabanListesi()) => { const r = ozelSatir(L, 'ilave'); return r ? r.toplam : null; };
export const ozelDersTabani = (L = tabanListesi()) => { const r = ozelSatir(L, 'ozel'); return r ? r.toplam : null; };
// Kursun bu satır için istediği ücret: ilk belge satırı sınıf ücreti; ilave/özel ders ek ve özel ders ücreti; geçiş satırları S.kurs.gecisUcret.
// Geçiş ücreti girilmediyse: yalnız mevcut belgeyle alınan sınıfta (C, D, C1, römork…; listede ilk kez belge satırı yok) kursun sınıf ücreti, diğerlerinde taban.
// Böylece kursun daha önce girdiği C ücreti liste gelince sessizce tabana inmez.
export function satirUcreti(r, sinif, L = tabanListesi()) {
  if (!r) return SINIFLAR[sinif] ? SINIFLAR[sinif].ucret : null;
  if (['ilk', 'teorik', 'ceza'].includes(r.tur)) return (SINIFLAR[sinif] || SINIFLAR[r.s[0]] || {}).ucret ?? null;
  if (r.tur === 'ilave') return ekDersFiyat(sinif);
  if (r.tur === 'ozel') return ozelDersFiyat(sinif);
  const v = (S.kurs.gecisUcret || {})[r.id]; if (v != null && v !== '' && isFinite(+v)) return +v;
  const su = (SINIFLAR[sinif] || {}).ucret; return su && L && !sinifSatiri(L, sinif) ? su : r.toplam;
}
// Geçiş satırının varsayılan ücreti nereden geliyor: 'kurs' (girilen), 'sinif' (sınıf ücreti), 'taban'
export const satirUcretKaynagi = (r, sinif, L = tabanListesi()) => { const v = (S.kurs.gecisUcret || {})[r.id]; if (v != null && v !== '' && isFinite(+v)) return 'kurs'; return (SINIFLAR[sinif] || {}).ucret && L && !sinifSatiri(L, sinif) ? 'sinif' : 'taban'; };
// Kursiyerin (ya da kayıt formundaki taslağın) listedeki satırı, taban tutarı ve kursun ücreti. Liste yoksa null.
// Dönüş: { liste, satir, yorum[], neden, taban, tabanNot, ucret, saat (belgedeki direksiyon saati), sistemSaat (md.7/md.39 hesabı), saatFark }
export function kursiyerTaban(k, L) {
  if (!k || !k.sinif) return null;
  if (L === undefined) L = tabanListesi(kursiyerDonemi(k));
  if (!L) return null;
  const bt = (k.oncekiBelge || {}).tarih || '', iki = yilSonra(bt, 2), m = mevcutKod(k.mevcutEhliyet);
  // A1 muafiyeti (md.39/5, KTY md.85/2) en az 2 yıllık B belgesine bağlı: B'yi kapsayan belgeler sayılır, F ve G sayılmaz (belgede "B-C-D-F-G" yazsa da)
  const a1Muaf = !!(iki && iki <= BUGUN) && B_ICERIR.includes(m);
  const o = { sinif: k.sinif, mevcut: m, eski: !!k.mevcutEski, otomatik: !!k.mevcutOtomatik, esinavMuaf: !!k.muaf, a1Muaf, kendiArac: k.sinif === 'B-EN' && !!k.kendiArac };
  // KTY geçici md.10: eski tip belge bu sınıfı zaten kapsıyorsa kurs eğitimi gerekmez (belge değişimi yeter); taban satırı aranmaz
  if (m && (o.eski || m === 'E') && (ESKI_KAPSAM[m] || []).includes(anaSinif(k.sinif)) && !(m === anaSinif(k.sinif) && o.otomatik)) return { liste: L, satir: null, yorum: [], neden: `Eski tip ${m} belgesi ${anaSinif(k.sinif)} sınıfını zaten kapsar (KTY geçici md.10); sürücü belgesini değiştirmesi yeter, kurs eğitimi gerekmez.`, taban: null, tabanNot: '', ucret: null, saat: 0, sistemSaat: 0, saatFark: false, kapsar: true };
  const b = satirBul(L, o), r = b.satir, tt = tabanTutar(r, o), yorum = [...b.yorum];
  if (r && r.a1muaf === undefined && iki && iki <= BUGUN && ['F', 'G'].includes(m) && r.s.includes('A1')) yorum.push(`Belgede “B-C-D-F-G → A1 Muafiyetli” satırı var; muafiyet (KTY md.85/2) B belgesine bağlı olduğu için ${m} belgesinde muafiyetsiz satır uygulandı.`);
  { const de = r && ['fark', 'romork'].includes(r.tur) ? deneyimEksik(k.sinif, m) : null; if (de) yorum.push(de + ' Bu belgeyle bu sınıfa kayıt yapılamaz.'); }
  // A1: belge tarihi yoksa "A1 Muafiyetli" (en az 2 yıllık belge) satırı seçilemez
  if (r && !bt && m && L.satirlar.some(x => x.a1muaf && x.s.includes(k.sinif) && (x.m.includes(m) || (x.mY || []).includes(m)))) { const mu = L.satirlar.find(x => x.a1muaf); yorum.push(`Belge tarihi girilmedi. Belge en az 2 yıllıksa “A1 Muafiyetli” satırı uygulanır (${mu.direksiyon.saat} ders, ${mu.toplam.toLocaleString('tr-TR')} ₺).`); }
  const sh = direksiyonHesap(k.sinif, k.mevcutEhliyet, { otomatik: k.mevcutOtomatik, eski: k.mevcutEski, belgeTarih: bt }), saat = r && r.direksiyon && r.tur !== 'ilave' && r.tur !== 'ozel' ? r.direksiyon.saat : 0;
  return { liste: L, satir: r, yorum, neden: b.neden, taban: tt ? tt.tutar : null, tabanNot: tt ? tt.aciklama : '', ucret: r ? satirUcreti(r, k.sinif, L) : null, saat, sistemSaat: sh.saat, saatFark: !!r && saat !== sh.saat };
}
// Kurulumda (ücretler henüz onaylanmadı) ya da müdür istediğinde: listedeki taban ücretleri kurs ücreti olarak yazar.
// hepsi: true → listede satırı olan bütün sınıflar tabana eşitlenir (kurulum); false → yalnız boş ya da tabanın altındakiler yükseltilir. Değişen sınıf sayısı döner.
export function tabanUcretleriYaz(hepsi, L = tabanListesi()) {
  if (!L) return 0; let n = 0; const onay = S.kurs.ucretOnay;
  Object.keys(SINIFLAR).forEach(k => { const r = sinifSatiri(L, k); if (!r) return; const u = SINIFLAR[k].ucret; if (hepsi ? u !== r.toplam : !(u >= r.toplam)) { sinifKaydet(k, { ucret: r.toplam }); n++; } });
  const ek = ekDersTabani(L); if (ek && (hepsi || !(S.kurs.ekDersUcreti >= ek))) { if (S.kurs.ekDersUcreti !== ek) n++; S.kurs.ekDersUcreti = ek; }
  // sınıfa özel ek/özel ders ücreti tabanın altındaysa yükseltilir
  const oz = ozelDersTabani(L); Object.keys(SINIFLAR).forEach(k => { const v = SINIFLAR[k]; const a = {}; if (ek && v.ekDers != null && v.ekDers < ek) a.ekDers = ek; if (oz && v.ozelDers != null && v.ozelDers < oz) a.ozelDers = oz; if (Object.keys(a).length) { sinifKaydet(k, a); n++; } });
  // mevcut belgeyle alınan sınıflar (C, D…): sınıf ücreti o sınıfa giden satırların en yüksek tabanının altındaysa yükseltilir
  Object.keys(SINIFLAR).forEach(k => { if (sinifSatiri(L, k) || !SINIFLAR[k].ucret) return; const t = Math.max(0, ...L.satirlar.filter(r => ['fark', 'oto', 'romork', 'esinav'].includes(r.tur) && r.s.includes(k)).map(r => r.toplam)); if (t && SINIFLAR[k].ucret < t) { sinifKaydet(k, { ucret: t }); n++; } });
  if (hepsi) { S.kurs.gecisUcret = {}; S.kurs.ucretOnay = onay; }  // kurulum: ücretler hâlâ müdürün onayını bekler
  else { const g = S.kurs.gecisUcret || {}; L.satirlar.forEach(r => { if (g[r.id] != null && +g[r.id] < r.toplam) { delete g[r.id]; n++; } }); S.kurs.gecisUcret = g; }
  return n;
}
// Havale açıklama kodu: her öğrenciye sabit, kısa bir kod (kimliğinden türetilir, saklanmaz). Başkası yatırsa da açıklamadaki kodla ödemenin kime ait olduğu bulunur.
export const odemeKodu = k => { if (!k || !k.id) return ''; let t = 2166136261; const s = String(k.id); for (let i = 0; i < s.length; i++) { t ^= s.charCodeAt(i); t = Math.imul(t, 16777619); } t >>>= 0; const h = 'ACDEFHJKMNPRTVWXY3479'; let o = ''; for (let i = 0; i < 5; i++) { o += h[t % h.length]; t = Math.floor(t / h.length); } return 'MD' + o; };
// Mesajlarda: "TR.. (Banka · Hesap sahibi)"
export const ibanMetni = (K = S.kurs) => { const h = ibanVarsayilan(K); if (!h) return ''; const ek = [h.banka, h.alici || K.ad].filter(Boolean).join(' · '); return h.iban + (ek ? ' (' + ek + ')' : ''); };
let kaydetDinleyici = null;
export const kaydetDinle = f => { kaydetDinleyici = f; };
// PAR-044: para kayıtlarında denetim izi. Yeni hareket (kimliği 'h' + oluşturma zamanı) ilk kayıtta kaydedeni ve zamanını alır; eski kayıtlara dokunulmaz.
// Düzeltmede h.degistiren / h.degisZamani (sayfalar2.js hareketDuzelt), iptalde h.iptal.kim.
// PAR-030: yıllık ücret tarifesi — yıl değişince geçen yılın tarifesi (sınıf, ek/özel ders, geçiş, sınav ve diğer ücretler) S.kurs.tarifeArsiv[yıl]'a dondurulur;
// güncel tarife Ayarlar › Sınıf ve ücretler'de düzenlenir, geçmiş yıllar oradan salt okunur açılır. Elle de "bu yılın tarifesini kaydet" ile alınır.
export function tarifeAnlik() { const K = S.kurs || {}; const sn = {}; Object.entries(SINIFLAR).forEach(([k, v]) => { if (v.aktif !== false && (v.ucret || v.ekDers != null || v.ozelDers != null)) sn[k] = { ad: v.ad, ucret: v.ucret ?? null, ekDers: v.ekDers ?? null, ozelDers: v.ozelDers ?? null }; });
  return { tarih: gun(0), siniflar: sn, gecisUcret: { ...(K.gecisUcret || {}) }, ekDersUcreti: K.ekDersUcreti ?? null, ozelDersUcreti: K.ozelDersUcreti ?? null, esinavUcreti: K.esinavUcreti ?? null, tekrarUcret: { ...(K.tekrarUcret || {}) }, mebSinavUcreti: { ...(K.mebSinavUcreti || {}) }, digerUcretler: (K.digerUcretler || []).map(x => ({ ...x })) }; }
function tarifeYilKontrol() { if (!S.kurs) return; const y = gun(0).slice(0, 4); if (!S.kurs.tarifeYil) { S.kurs.tarifeYil = y; return; } if (S.kurs.tarifeYil < y) { S.kurs.tarifeArsiv = { ...(S.kurs.tarifeArsiv || {}), [S.kurs.tarifeYil]: S.kurs.tarifeArsiv && S.kurs.tarifeArsiv[S.kurs.tarifeYil] || tarifeAnlik() }; S.kurs.tarifeYil = y; } }
function hareketIz() { let u; try { u = oturum.kullanici; } catch (x) { return; } if (!u) return; const ad = u.ad || u.id || '', simdi = Date.now(); for (const h of S.hareket || []) { if (h.kaydeden) continue; const m = /^h(\d{13})/.exec(h.id || ''); if (m && simdi - +m[1] < 600000) { h.kaydeden = ad; h.kayitZamani = new Date(+m[1]).toISOString(); } } }
export const izMetni = h => [h.kaydeden ? 'Kaydeden ' + h.kaydeden + (h.kayitZamani ? ' · ' + h.kayitZamani.slice(8, 10) + '.' + h.kayitZamani.slice(5, 7) + ' ' + new Date(h.kayitZamani).toTimeString().slice(0, 5) : '') : '', h.degistiren ? 'Değiştiren ' + h.degistiren + (h.degisZamani ? ' · ' + h.degisZamani.slice(8, 10) + '.' + h.degisZamani.slice(5, 7) + ' ' + new Date(h.degisZamani).toTimeString().slice(0, 5) : '') : ''].filter(Boolean).join(' · ');
export function kaydet() { dIdx = null; subeTamamla(); noTamamla(); odemeUzlas(); mebDegisimIzle(); hareketIz(); kayitIz(); try { tarifeYilKontrol(); } catch (x) { } (S.hareket || []).forEach(h => { if (h.tur === 'Gelir' && !h.no) makbuzNoVer(h); }); // Kurs personelinin bulut verisi cihaza tam kopya olarak yazılmaz (Firestore kendi önbelleğini tutar; çıkışta silinir); demo ve öğrencinin kendi küçük kopyası yazılır
  if (!ANAHTAR.startsWith('sinyal-bulut-') || ANAHTAR.startsWith('sinyal-bulut-ogr-')) { try { localStorage.setItem(ANAHTAR, JSON.stringify(S)); } catch (e) { } }
  if (kaydetDinleyici) kaydetDinleyici(); }
// Bulut (gerçek kurs): veri Firestore'dan gelir; yerel kopya kursa özel anahtarda tutulur, günlük yenilenmez
export function bulutVeri(yeni, kursId) { mebIz = null; ANAHTAR = 'sinyal-bulut-' + kursId; yeni._bulut = true; S = goc(yeni); mebDegisimIzle(); izTabaniYenile(); if (!String(kursId).startsWith('ogr-')) { try { localStorage.removeItem(ANAHTAR); } catch (e) { } } }
export function demoyaDon() { mebIz = null; ANAHTAR = 'sinyal-demo-v20'; S = yukle(); mebDegisimIzle(); izTabaniYenile(); }
// Yeni kurs: ayarlar ve şablonlar hazır, kayıtlar boş
export function bosVeri({ kursAd, yetkili, sehir, mudurTel }) {
  const o = uret();
  ['kursiyerler', 'dersler', 'hareket', 'adaylar', 'sinavlar', 'teorik', 'gonderimler', 'islemler', 'kampanyalar', 'cezalar', 'avanslar', 'ustaOdemeleri', 'devredilen', 'imzaTalepleri', 'bosTeklif', 'faturalar', 'izinler', 'duyurular', 'bekleme', 'gelenAlinan', 'egitmenler', 'araclar', 'ogretmenler', 'personel', 'kullanicilar', 'arsiv', 'gunSonu', 'transferler', 'gunAcmalar'].forEach(k => { if (Array.isArray(o[k])) o[k] = []; });
  o.subeler = [{ id: 's1', ad: 'Merkez', semt: '', kurumKodu: '', mudur: yetkili || '', mebbis: '' }];
  o.kurs = { ...o.kurs, ad: kursAd || 'Sürücü kursu', yetkili: yetkili || '', sehir: sehir || '', tel: '', adres: '', puan: null, yorumSayisi: 0, web: '', wp: '', mudurTel: mudurTel || '', iban: '', waApi: '', yorumLink: '' };
  o.zamanli = { gonderilen: {}, kayit: [], kuyruk: [], son: null, sinir: false };
  o.waDurum = {}; o.sayac = {}; o.kazanim = { gercek: true, doldurulan: 0, ekDers: 0, yorum: 0 };
  if (o.sosyal) { Object.assign(o.sosyal, { sohbetler: [], slotlar: [], bilinmeyen: [], gonderiler: [], yorumlar: [], ay: { mesaj: 0, kisi: 0, otomatik: 0, sure: 0, mesaiDisi: 0, aday: 0, gorusme: 0, kayit: 0, devir: 0 }, saatlik: Array(24).fill(0), kanalDagilim: { igm: 0, igy: 0, wp: 0, fb: 0 } }); (o.sosyal.kanallar || []).forEach(c => Object.assign(c, { hesap: '', bagli: false, cevap: false, son: null, izin: null, sonCevapDk: null })); }
  if (o.guvenlik) o.guvenlik.oturumlar = [];
  o.asistanBilgi = []; o.gruplar = []; o.mevzuat = (o.mevzuat || []).filter(m => m.uygulandi);
  o.hesaplar = [{ id: 'kasa', ad: 'Nakit kasa', tur: 'Kasa', bakiye: 0 }];
  o.entegrasyon = { ...o.entegrasyon, earsiv: { bagli: false, ad: 'e-Arşiv entegratörü', not: '' } };
  o.sms = { bakiye: 0, kanal: 'WhatsApp' };
  // demodan kalan görüşme günü kapatması ve hazır ücretler yeni kursa taşınmaz: ücretler kurulumda müdür onaylayana kadar "onaylanmadı" sayılır
  const gs = (o.sosyal && o.sosyal.gorusmeSablon) || o.gorusmeSablon; if (gs) gs.kapali = [];
  o.kurs.ucretOnay = null;
  // PAR-068: demonun para değerleri gerçek kursa geçmez — ek ders ücreti boş (il taban listesindeki 'ilave ders' satırı kullanılır, yoksa kurulumda girilir),
  // uygulama sınavı tekrar ücreti boş (MEB direksiyon sınav ücreti her yıl kursça girilir), indirim yok (taban altı olmasın, PAR-001); e-sınav ücreti MEB kılavuzundaki resmî tutardır
  o.kurs.ekDersUcreti = null; o.kurs.ozelDersUcreti = null; o.kurs.tekrarUcret = { esinav: 1250, dsinav: null }; delete o.kurs.uygulamaUcret; o.kurs.indirimler = [];
  // il taban listesi varsa sınıf ve ek ders ücretleri taban fiyatla hazır gelir; geçiş ücretleri girilmedikçe taban sayılır (satirUcreti). Müdür kontrol edip onaylar.
  { const L = listeBul(kursunIli(o.kurs), iso(BUGUN)); if (L) { o.kurs.siniflar = o.kurs.siniflar || {}; Object.keys(SINIF_VARSAYILAN).forEach(k => { const r = sinifSatiri(L, k); if (r) o.kurs.siniflar[k] = { ...(o.kurs.siniflar[k] || {}), ucret: r.toplam }; }); const ek = ozelSatir(L, 'ilave'); if (ek) o.kurs.ekDersUcreti = ek.toplam; o.kurs.tabanKurulum = L.id; } }
  delete o._gun; o._bulut = true;
  return o;
}
export function sifirla() { try { localStorage.removeItem(ANAHTAR); } catch (e) { } S = goc(uret()); S._gun = iso(BUGUN); kaydet(); }

// Kursiyer sözleşmesinin varsayılan maddeleri. {süslü} alanlar kurs ayarlarından dolar; kurs Ayarlar › Sözleşme metni'nden değiştirir.
export const SOZLESME_VARSAYILAN = [
  'Konu. Bu sözleşme, kursiyerin {sinif} sertifika sınıfı için Motorlu Taşıt Sürücüleri Kursu Yönetmeliği’ne göre {kurs} tarafından verilecek eğitime ilişkindir.',
  'Eğitim. Kurs {teorik} saat teorik ders ve {direksiyon} ders saati direksiyon eğitimi verir. Ders programı kursiyere yazılı ya da elektronik olarak bildirilir.',
  'Ücret ve ödeme. Kurs ücreti ve ödeme planı yukarıdaki tablodadır; tutarlar KDV dahildir. Ders saati ücretleri: teorik {teorikSaatUcreti}, direksiyon {direksiyonSaatUcreti}. Sınav ücretleri (e-sınav oturumu {tekrarE}), kayıt belgelerinin masrafları, sürücü belgesi harcı ve kart ücreti kursiyerin kendi masrafıdır; kurs ücretine dahil edilmez ve eklenmez. Vadesinde ödenmeyen taksit için kursiyere hatırlatma yapılır.',
  'Devam. Kursiyer derslere zamanında katılır. Gelemeyeceği direksiyon dersini en az bir gün önce bildirir. Bildirmeden gelinmeyen dersin yerine konan ders için {ekDers} ek ders ücreti alınır.',
  'Sınavlar. Kursiyerin her sınav için {hak} hakkı vardır. Uygulama sınavında başarısız olan kursiyer tekrar sınavdan önce en az 2 ders saati ek direksiyon dersi alır; her ders {ekDers}’dir. Tekrar sınavın resmî ücreti ({tekrarD}) kursiyerin masrafıdır. Haklarını dolduran kursiyer yeni dönem kaydı yaptırır.',
  'Ek ders. Zorunlu dersler dışında kursiyerin isteğiyle verilen her direksiyon dersinin ücreti {ekDers}’dir.',
  'Fesih ve iade. Kursiyer dönem başlamadan ayrılırsa sözleşmedeki eğitim ücretinin %10’u dışındaki kısım; dönem başladıktan sonra ayrılırsa ücretin %10’u ile aldığı teorik ve direksiyon ders saatlerinin karşılığı düşülerek kalan kısım iade edilir. İade, ayrılış tarihinden itibaren en geç bir ay içinde kursiyerin banka hesabına yapılır (Özel Öğretim Kurumları Yönetmeliği m.56). Sınav ücretleri ve harçlar kurs ücretinin parçası değildir; iade hesabına girmez.',
  'Kişisel veriler. Kursiyere 6698 sayılı Kanun kapsamındaki aydınlatma metni verilmiştir; sağlık raporu ve adli sicil bilgileri yalnızca MEB kaydı için işlenir.',
  'Uyuşmazlık. Bu sözleşmeden doğan uyuşmazlıklarda 6502 sayılı Kanun kapsamında tüketici hakem heyetleri ve tüketici mahkemeleri yetkilidir.',
];
// --- türetilmiş bilgiler ---
export const kursiyer = id => S.kursiyerler.find(k => k.id === id);
// Dersin öğrencinin kaçıncı direksiyon dersi olduğu: yapılan dersler tarih sırasıyla, planlananlar ardından gelir.
// Gelmedi / iptal derslerin sırası yoktur (null). Plan, genel bakış, öğretmen ve öğrenci ekranları bunu kullanır.
export function dersSirasi(d, k) {
  k = k || kursiyer(d.kursiyer); if (!k) return null;
  const an = d.tarih + d.saat, ayni = x => x.kursiyer === k.id && x.id !== d.id;
  if (d.durum === 'Planlandı') return k.direksiyon + 1 + S.dersler.filter(x => ayni(x) && x.durum === 'Planlandı' && (x.tarih + x.saat) < an).length;
  if (d.durum === 'Yapıldı') return Math.max(1, k.direksiyon - S.dersler.filter(x => ayni(x) && x.durum === 'Yapıldı' && (x.tarih + x.saat) > an).length);
  return null;
}
// Ekipten çıkarılan usta ve araçlar geçmiş derslerde görünmeye devam eder
export const egitmen = id => S.egitmenler.find(e => e.id === id) || ((S.cikanlar || {}).egitmen || []).find(e => e.id === id);
export const arac = id => S.araclar.find(a => a.id === id) || ((S.cikanlar || {}).arac || []).find(a => a.id === id);
export function arsivle(tur, x) { S.cikanlar = S.cikanlar || { egitmen: [], arac: [] }; S.cikanlar[tur].push({ ...x, cikis: gun(0) }); }
export const tamAd = k => k.ad + ' ' + k.soyad;
// öğrenci uygulamasının ek özellikleri: kurs Ayarlar › Öğrenci uygulaması’ndan kapatabilir (varsayılan açık)
export const OGR_OZELLIK = [['hazirlik', 'Sınava hazırlık puanı ve öneriler'], ['tekrar', 'Aralıklı tekrar (yanlış soruların yeniden sorulması)'], ['direksiyon', 'Uygulama sınavına hazırlık (resmî form maddeleri, park ve dönüş şemaları)'], ['ikaz', 'Gösterge paneli ve ikaz lambaları'], ['motor', '4 zamanlı motor ve debriyaj denemesi'], ['tehlike', 'Tehlike algısı çalışması'], ['sesli', 'Konu anlatımlarını sesli dinleme'], ['dersOnay', 'Ders defteri: öğrenci her direksiyon dersini kendi telefonundan onaylar ya da itiraz eder (varsayılan kapalı)']];
const OGR_KAPALI = ['dersOnay'];  // kursun açması gereken özellikler
// UYG-019 'Plus' paket altyapısı (SOR-097): S.kurs.plus = { acik, ozellikler: [anahtar], fiyat }. Paket açıksa listedeki özellikler yalnız k.plus
// işaretli öğrencide açılır; paket kapalıyken (varsayılan) her şey eskisi gibi açık. Hangi öğrencinin ekranı çizildiğini ogrAktif(k) bildirir.
let OGR_AKTIF = null;
export const ogrAktif = k => { OGR_AKTIF = k || null; };
export const plusDahil = ad => { const p = (S.kurs || {}).plus; return !!(p && p.acik && (p.ozellikler || []).includes(ad)); };
export const ogrOzellik = ad => { const v = ((S.kurs || {}).ogrOzellik || {})[ad]; const acik = OGR_KAPALI.includes(ad) ? v === true : v !== false; return acik && !(plusDahil(ad) && OGR_AKTIF && !OGR_AKTIF.plus); };
// Mesaj hitabı: "Merhaba Elif Hanım," / "Merhaba Hüseyin Hoca,"; cinsiyeti bilinmeyen (aday vb.) için "Sayın Deniz Akın,"
// Kurs müdürünün kendi cep telefonu: müdüre giden bildirimler buraya gider. Kursun WhatsApp hattı (wp / bağlı hat) olamaz:
// hat kendine mesaj atamaz. Boşsa müdür bildirimi WhatsApp'tan gitmez, uygulama içinde kalır.
const rakamlar = t => { let n = String(t || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '90' + n.slice(1); else if (n.length === 10 && n.startsWith('5')) n = '90' + n; return n; };
export function mudurTel() {
  const t = rakamlar(S.kurs && S.kurs.mudurTel); if (t.length < 12) return '';
  const hat = [S.kurs.wp, S.kurs.waHat && S.kurs.waHat.no].map(rakamlar).filter(Boolean);
  return hat.includes(t) ? '' : S.kurs.mudurTel;
}
export const onburoTel = () => (S.kurs && S.kurs.onburoTel) || mudurTel();
export function selam(x) {
  if (!x) return 'Merhaba,';
  if (typeof x === 'string') x = S.kursiyerler.find(k => tamAd(k) === x) || S.egitmenler.find(h => h.ad === x) || { ad: x };
  const ilk = String(x.ad || '').trim().split(/\s+/)[0], tam = x.soyad != null ? tamAd(x) : String(x.ad || '').trim();
  if (S.egitmenler.includes(x)) return `Merhaba ${ilk} Hoca,`;
  return x.cinsiyet === 'Kadın' ? `Merhaba ${ilk} Hanım,` : x.cinsiyet === 'Erkek' ? `Merhaba ${ilk} Bey,` : `Sayın ${tam},`;
}
// Özel ada hâl eki: "Örnek Sürücü Kursu" → Kursu’na / Kursu’nda / Kursu’ndan / Kursu’nun
export function adEk(ad, hal) {
  ad = String(ad || '').trim(); if (!hal || !ad) return ad;
  const kc = ad.toLocaleLowerCase('tr'), sesliler = 'aeıioöuü', son = [...kc].reverse().find(c => sesliler.includes(c)) || 'e';
  const kalin = 'aıou'.includes(son), yuvarlak = 'ouöü'.includes(son), seslyBiter = sesliler.includes(kc.slice(-1));
  const iyelik = /(kursu|merkezi|okulu|akademisi|kurumu)$/.test(kc);
  const unlu = { e: kalin ? 'a' : 'e', de: kalin ? 'da' : 'de', den: kalin ? 'dan' : 'den', in: kalin ? (yuvarlak ? 'un' : 'ın') : (yuvarlak ? 'ün' : 'in') }[hal];
  if (iyelik) return ad + '’n' + unlu;
  if (seslyBiter) return ad + '’' + ({ e: 'y', in: 'n' }[hal] || '') + unlu;
  const sert = 'fstkçşhp'.includes(kc.slice(-1));
  return ad + '’' + (sert && unlu[0] === 'd' ? 't' + unlu.slice(1) : unlu);
}
export const kursAdi = hal => adEk(S.kurs.ad, hal);
// Direksiyon aracı: önce ustanın kursiyerin sınıfındaki aracı, o saatte doluysa aynı sınıftaki boş araç.
// Sınıfın kullanabileceği araç sınıfları: B Engelli önce B-EN (aparatlı) araç, yoksa otomatik B aracı (md.7/5: raporundaki şartları taşıyan araç)
export const aracSiniflari = sinif => sinif === 'B-EN' ? ['B-EN', 'B-O'] : [sinif];
// ARC-018: araç kendi sınıfına ek olarak kartta işaretlenen sınıflarda da kullanılır (ör. A2 aracıyla A1 dersi; MEBBİS SKT03004 araç listesine göre)
// PER-003: çalışma izni durumu (MEBBİS'ten okunan bitiş; eski kayıtlarda eg.mebIzinBitis). t verilirse o güne göre (sınav günü için Y07).
// tur: 'yok' (bitiş bilinmiyor) · 'bitti' · 'bugun' · 'yakin' (≤15 gün) · 'uyari' (≤30 gün) · 'ok'
export const izinBitisi = eg => (eg && (eg.mebIzinBitis || (eg.meb || {}).izinBit)) || '';
export function izinDurumu(eg, t) {
  const bit = izinBitisi(eg); if (!bit) return { tur: 'yok', kalan: null, bit: '' };
  const kalan = Math.round((tarihOku(bit) - (t ? tarihOku(t) : BUGUN)) / 864e5);
  return { bit, kalan, tur: kalan < 0 ? 'bitti' : kalan === 0 ? 'bugun' : kalan <= 15 ? 'yakin' : kalan <= 30 ? 'uyari' : 'ok' };
}
// PER-011: haftalık ders sınırı — elle girilen; yoksa MEBBİS personelindeki Maaş/Ücret KDS'nin büyüğü; o da yoksa müdür 20
// (12 saat aylık karşılığı + 8 saat ücretli, ÖÖKY 26/6), diğer eğitim personeli 40 (ÖÖKY 26/5)
export function haftalikSinir(eg) {
  if (eg && +eg.haftalikSinir > 0) return { n: +eg.haftalikSinir, kaynak: 'elle' };
  const m = eg && eg.meb; if (m && +m.haftaSaat > 0) return { n: +m.haftaSaat, kaynak: +m.maasKds >= +m.ucretKds ? 'Maaş KDS' : 'Ücret KDS' };
  if (eg && /m[uü]d[uü]r/i.test(String((m && m.gorev) || eg.gorev || ''))) return { n: 20, kaynak: 'müdür' };
  return { n: 40, kaynak: 'varsayılan' };
}
// PER-012: MEBBİS'teki 'Derse Gireceği Programlar' (OOK15004; eg.mebYetki = { uygulama: ['B','A2'], teorik: [...], okuma }). Okunmamışsa
// ya da listesi boşsa engel yok (bilinmeyen yetki engel sayılmaz). Sınıf karşılaştırması ana sınıfla (B-O, B-EN → B; anaSinif).
export function ustaYetkili(eg, sinif, tur = 'uygulama') {
  const l = eg && eg.mebYetki && eg.mebYetki[tur]; if (!Array.isArray(l) || !l.length) return true;
  return l.includes(anaSinif(sinif));
}
// DIR-055: öğretmenin plan rengi — koyu, birbirinden ayrılan ve beyaz yazıyla yeterli kontrastlı tonlar (yeşil 'yapıldı'ya ayrılmış olduğu için yok);
// kartta seçilen renk (palet içinden) önce, yoksa öğretmenin sırasına göre
export const USTA_PALET = ['#1f4fbf', '#a3324a', '#6d3fc0', '#0e6f86', '#8a5a00', '#9c2c86', '#3d4f6b', '#2f3f9e'];
export function ustaRengi(eg) {
  if (!eg) return USTA_PALET[0];
  if (USTA_PALET.includes(eg.renk)) return eg.renk;
  const i = Math.max(0, (S.egitmenler || []).findIndex(x => x.id === eg.id)); return USTA_PALET[i % USTA_PALET.length];
}
// Öğretmenin t gününün haftasındaki (Pazartesi–Pazar) direksiyon dersleri; iptal ve gelmedi sayılmaz. liste: taslaklı ders listesi (planlayıcı)
export function haftaDers(egId, t = gun(0), liste = S.dersler) {
  const d = tarihOku(t), off = (d.getDay() + 6) % 7, b = new Date(d); b.setDate(d.getDate() - off); const s = new Date(b); s.setDate(b.getDate() + 6);
  const bas = iso(b), son = iso(s);
  return liste.filter(x => x.egitmen === egId && x.tarih >= bas && x.tarih <= son && x.durum !== 'İptal' && x.durum !== 'Gelmedi').length;
}
export const aracUygun = (a, sinif) => !!a && aracSiniflari(sinif).some(s => a.sinif === s || (a.ekSiniflar || []).includes(s));
export const ustaAraci = (egId, sinif) => { for (const s of aracSiniflari(sinif)) { const a = S.araclar.find(a => a.egitmen === egId && a.sinif === s); if (a) return a; } return S.araclar.find(a => a.egitmen === egId && aracUygun(a, sinif)); };
export function dersAraci(egId, sinif, t, saat, haric) {
  const bos = a => !S.dersler.some(d => d !== haric && d.arac === a.id && d.tarih === t && d.saat === saat);
  const o = ustaAraci(egId, sinif); if (o && bos(o)) return o;
  for (const s of aracSiniflari(sinif)) { const a = S.araclar.filter(a => a.sinif === s && a !== o).find(bos); if (a) return a; }
  return S.araclar.filter(a => a !== o && aracUygun(a, sinif)).find(bos) || null;
}
export const ekToplam = k => ogrEkler(k).reduce((a, x) => a + x.tutar, 0);
export const odenen = k => k.odeme.pesin + k.odeme.taksitler.reduce((a, t) => a + (t.odendi ? t.tutar : (t.kismi || 0)), 0) + ogrEkler(k).filter(x => x.odendi).reduce((a, x) => a + x.tutar, 0) - (k.odeme.iade || 0);
export const kalanBorc = k => Math.max(0, k.odeme.toplam + ekToplam(k) - odenen(k));
export const gecikenler = k => k.odeme.taksitler.filter(t => !t.odendi && !t.iptal && fark(t.vade) < 0);
export const gecikenTutar = k => gecikenler(k).reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
export const eksikEvrak = k => EVRAKLAR.filter(([key]) => !k.evrak[key]);
// Belgenin dosyadaki görüntüsü: onaylı fotoğraf, onaylı PDF, yoksa onay bekleyen yükleme (WhatsApp / öğrenci ekranı)
export function evrakKaynak(k, key, kaynak) {
  const y = (k.evrakYuklenen || {})[key], f = (k.evrakFoto || {})[key], p = (k.evrakPdf || {})[key];
  if (kaynak === 'foto') return f ? { veri: f, tur: 'resim' } : null;
  if (kaynak === 'pdf') return p ? { veri: p, tur: 'pdf' } : null;
  if (kaynak === 'yuklenen') return y && y.veri ? { veri: y.veri, tur: y.tur === 'pdf' ? 'pdf' : 'resim' } : null;
  return f ? { veri: f, tur: 'resim' } : p ? { veri: p, tur: 'pdf' } : y && y.veri ? { veri: y.veri, tur: y.tur === 'pdf' ? 'pdf' : 'resim' } : null;
}
export const asamaNo = k => ASAMALAR.indexOf(k.asama);
export function sonrakiDers(k) { return kursiyerDersleri(k.id).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))[0]; }
// MSJ-027: gönderilen her mesaj kayda düşer; alıcı adı tek bir kursiyere uyuyorsa kimliği de yazılır (öğrencinin 'Notlar ve mesajlar' geçmişi
// adla değil kimlikle bulur; aynı adlı iki öğrenci karışmaz). ek: { oto: true } zamanlanmış otomatik gönderim
export function gonderimEkle(kime, metin, tur, ek = {}) {
  const l = (S.kursiyerler || []).filter(k => k.ad + ' ' + k.soyad === kime), kid = ek.kid || (l.length === 1 ? l[0].id : undefined);
  S.gonderimler.unshift({ zaman: new Date().toISOString(), kime, metin, tur, ...(kid ? { kid } : {}), ...(ek.oto ? { oto: true } : {}) }); kaydet();
}

// Sınav riski (0–100): usta öğreticinin ders sonu beceri puanları, deneme sınavları, devamsızlık, kısa dersler, önceki kalma.
const ortala = l => l.length ? l.reduce((a, x) => a + x, 0) / l.length : null;
// Öğrencinin direksiyon dersine verdiği puan (1–5) ve yorum: öğretmen bazında ortalama
export function memnuniyet(egId) {
  const l = S.dersler.filter(d => d.ogrenciPuan && (!egId || d.egitmen === egId));
  return { n: l.length, ort: l.length ? l.reduce((a, d) => a + d.ogrenciPuan.puan, 0) / l.length : null, yorumlar: l.filter(d => d.ogrenciPuan.yorum).sort((a, b) => (b.ogrenciPuan.tarih || b.tarih).localeCompare(a.ogrenciPuan.tarih || a.tarih)) };
}
export function beceriOzet(k, n = 3) {
  const l = kursiyerDersleri(k.id).filter(d => d.durum === 'Yapıldı' && d.beceri).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat)).slice(0, n);
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
    const gel = kursiyerDersleri(k.id).filter(d => d.durum === 'Gelmedi').length;
    if (gel) { p += Math.min(24, gel * 8); n.push(gel + ' derse gelmedi'); }
    const kisa = kursiyerDersleri(k.id).filter(d => d.durum === 'Yapıldı' && d.sure != null && d.sure < 40).length;
    if (kisa >= 2) { p += 8; n.push(kisa + ' ders 40 dakikadan kısa'); }
    if (k.dsinav && k.dsinav.sonuc === 'Kaldı') { p += 20; n.push('Uygulama sınavından kaldı'); }
    const dd = (k.dDeneme || []).slice(-1)[0];
    if (dd && dd.sonuc === 'Kaldı') { p += 25; n.push('Son deneme sınavında kalırdı' + (dd.neden ? ' (' + dd.neden + ')' : '')); }
    else if (dd && dd.sonuc === 'Geçti') p = Math.max(0, p - 10);
    const sonDers = kursiyerDersleri(k.id).filter(d => d.durum === 'Yapıldı').map(d => d.tarih).sort().pop();
    if (sonDers && fark(sonDers) < -14) { p += 10; n.push(-fark(sonDers) + ' gündür direksiyona çıkmadı'); }
  }
  if ((k.notlar || []).some(x => /zorlan|unut|panik|gergin/i.test(x.metin))) { p += 12; n.push('Usta öğretici notu'); }
  const puan = Math.min(100, Math.round(p));
  return { puan, ort, nedenler: n, seviye: puan >= 50 ? 'Yüksek' : puan >= 25 ? 'Orta' : 'Düşük', tur: direksiyon ? 'Uygulama sınavı' : 'e-Sınav', beceri: direksiyon ? beceriOzet(k) : null, oneri: direksiyon ? (puan >= 50 ? 4 : puan >= 25 ? 2 : 0) : 0 };
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
// YON-027: "kim neyi gördü" — kişisel veri görüntüleme kaydı; aynı kullanıcı aynı şeyi bir oturumda bir kez yazar (öğrenci dosyası, belge önizlemesi)
const gorulen = new Set();
export function gordu(ne, ayrinti = '') { const a = ne + '|' + ayrinti; if (gorulen.has(a)) return; gorulen.add(a); islem(ne, ayrinti); }
export function islem(ne, ayrinti = '') { const x = { zaman: yerelZaman(), kim: oturum.kullanici ? oturum.kullanici.ad : 'Sistem', ne, ayrinti }; S.islemler.unshift(x); if (S.islemler.length > 3000) S.islemler.length = 3000; if (bulutKanca.kayit) bulutKanca.kayit(x); }
// geri alma: son değişiklikten önceki durumun anlık görüntüsü
// Geri alma noktası: fotoğraf ve imza gibi büyük metinler kopyalanmaz (değişmez değerler; işaretle tutulur), yalnız veri yapısı kopyalanır
let anlik = null, anlikBuyuk = null;
export function geriAlNoktasi() { const b = new Map(); try { anlik = JSON.stringify(S, (k, x) => { if (typeof x === 'string' && x.length > 3000) { const id = '\u0001' + b.size; b.set(id, x); return id; } return x; }); anlikBuyuk = b; } catch (x) { anlik = null; anlikBuyuk = null; } }
export function geriAl() { if (!anlik) return false; const b = anlikBuyuk || new Map(); S = JSON.parse(anlik, (k, x) => typeof x === 'string' && x.charCodeAt(0) === 1 && b.has(x) ? b.get(x) : x); anlik = null; anlikBuyuk = null; kaydet(); return true; }

export function yas(dt) { if (!dt) return null; const d = tarihOku(dt); let y = BUGUN.getFullYear() - d.getFullYear(); if (BUGUN.getMonth() < d.getMonth() || (BUGUN.getMonth() === d.getMonth() && BUGUN.getDate() < d.getDate())) y--; return y; }
// MEBBİS'e girmeden önce kayıt kontrolü: [tamam, metin]
export function mebOnKontrol(k) {
  const l = [];
  l.push([tcGecerli(k.tc || ''), 'TC kimlik numarası geçerli biçimde']);
  l.push([!S.kursiyerler.some(x => x !== k && x.id !== k.id && x.tc && x.tc === k.tc && x.sinif === k.sinif && x.asama !== 'Ehliyet'), 'Aynı TC ile aynı sınıfa açık kayıt yok']);
  l.push([!!k.dogumTarihi, 'Doğum tarihi girildi']);
  // yaş ve önceki belge: KTY md.76/3 yaş istisnası (k.yasIstisna) burada uygulanır; kayıt formu ve dosya da bu satırları gösterir
  { const yd = yasDenetim(k); l.push([yd.tamam, yd.satir]); }
  { const de = deneyimEksik(k.sinif, k.mevcutEhliyet); if (de) l.push(yasIstisnaGecerli(k.yasIstisna) && yasIstisnaKapsar(k.sinif) ? [true, `${de} · aranmaz: yaş istisnası (KTY md.76/3): ${esc(yasIstisnaMetin(k.yasIstisna))}`] : [false, de]);
    // istisna kaydı eksik ya da kapsam dışı ve bu sınıfta yaşı ya da önceki belgeyi etkiliyor: ayrı eksik satırı (eski kayıtta okul türü seçilmedi)
    const so = yasIstisnaSorun(k.yasIstisna), y0 = yas(k.dogumTarihi), n0 = asgariYasHesap(k.sinif, k.mevcutEhliyet, (k.oncekiBelge || {}).tarih, false).yas;
    if (so && yasIstisnaKapsar(k.sinif) && (de || (y0 != null && y0 < n0))) l.push([false, `Yaş istisnası (KTY md.76/3) uygulanmadı: ${esc(so)}. Kursiyer dosyasında İstisnalar › Değiştir’den kapsamı seçin.`]); }
  // Aday sürücü belgesi iptal edilen kişi: kursta eğitime başlaması için idari para cezalarının tamamı tahsil edilmiş olmalı (KTK ek md.17, 7590 sayılı Kanun, RG 31/7/2026; eyup-sorular-cevaplar.md madde 4)
  // kurumun MEBBİS sertifika programı (SKT01001 okunduysa; RAP-006)
  { const pu = programUyarisi(k.sinif); if (pu) l.push([false, pu]); }
  if (k.adayIptal) l.push([!!k.adayIptal.cezaOdendi, 'Aday belgesi iptal edilmişti: idari para cezalarının tamamı ödendi (KTK ek md.17)']);
  const g = (S.gruplar || []).find(x => x.id === k.teorikGrup);
  l.push(g ? [!['Kayıt', 'Evrak'].includes(k.asama) || k.kayit <= g.baslangic, `Kayıt grubun başlangıcından önce (${g.ad} ${g.baslangic.split('-').reverse().join('.')})`] : [false, 'Dönem grubu seçilmedi']);
  EVRAKLAR.filter(([x]) => x !== 'sozlesme').forEach(([x, t]) => l.push([!!k.evrak[x], t]));
  l.push([!!k.cinsiyet, 'Cinsiyet seçildi']);
  l.push([!!(k.saglikRapor && k.saglikRapor.no && k.saglikRapor.tarih), 'Sağlık raporu numarası ve tarihi girildi']);
  l.push([!!(k.adliSicil && k.adliSicil.barkod), 'Adli sicil barkodu girildi']);
  l.push([!!(k.kvkk && (k.kvkk.aydinlatma || k.kvkk.riza)), 'KVKK aydınlatma metni verildi']);
  // MEBBİS'e aktarılacak kayıt fotoğrafı (aktarılmış eski kayıtlarda aranmaz)
  if (!k.mebIslendi) l.push([!!k.foto, 'Kayıt fotoğrafı çekildi (biyometrik)']);
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
// PAR-040: kullanıcıya şube (kasa) kısıtı — müdür dışındaki kullanıcının kaydında şube varsa yalnız o şubeyi ve kasasını görür
export const kullaniciSubesi = () => { const o = oturum.kullanici; if (!o || o.rol === 'mudur' || !cokSube()) return ''; const u = (S.kullanicilar || []).find(x => x.id === o.id || (o.uid && x.uid === o.uid)); return u && u.sube && (S.subeler || []).some(x => x.id === u.sube) ? u.sube : ''; };
