// Bütün veriler tek Excel dosyasında (çok sayfalı) + tam yedek (.json). Hizmet sözleşmesi kursa verisini istediği an
// toplu alabileceğini söz veriyor: Ayarlar › Veri ve e-posta, Raporlar › Tam döküm ve aylık rapor e-postası bu modülü kullanır.
import { S, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, SINIFLAR, gun } from './veri.js?v=230';

// Excel hücresi en çok 32.767 karakter: daha uzun metin (gömülü dosya, imza) kısaltılır
const t = x => (x === undefined || x === null ? '' : typeof x === 'string' && x.length > 32000 ? (x.startsWith('data:') ? '(dosya)' : x.slice(0, 32000) + '…') : x);
const BASLIK = { tarih: 'Tarih', saat: 'Saat', ad: 'Ad', tutar: 'Tutar', aciklama: 'Açıklama', kursiyer: 'Kursiyer', egitmen: 'Usta öğretici', arac: 'Araç', tur: 'Tür', durum: 'Durum', no: 'No', tel: 'Telefon', odendi: 'Ödendi', yontem: 'Yöntem', konu: 'Konu', neden: 'Neden', kim: 'Kim', bas: 'Başlangıç', bit: 'Bitiş', yil: 'Yıl', ay: 'Ay', sube: 'Şube', seri: 'Seri', vade: 'Vade', kdv: 'KDV', toplam: 'Toplam', unvan: 'Unvan', vkn: 'Vergi no', mesaj: 'Mesaj', kanal: 'Kanal', gelir: 'Gelir' };
// alanları önceden bilinmeyen listeler: bütün düz alanlar sütun olur, iç içe olanlar metne çevrilir (veri dışarıda kalmasın)
function genel(l, cevir = {}) {
  const ks = []; (l || []).forEach(o => o && typeof o === 'object' && Object.keys(o).forEach(k => { if (!k.startsWith('_') && !ks.includes(k)) ks.push(k); }));
  if (!ks.length) return [['Kayıt yok']];
  return [ks.map(k => BASLIK[k] || k), ...(l || []).map(o => ks.map(k => { const v = (o || {})[k]; return cevir[k] ? cevir[k](v) : v && typeof v === 'object' ? t(JSON.stringify(v)) : t(v); }))];
}
// Excel sayfaları: { 'Sayfa adı': [[başlıklar], ...satırlar] }
export function tumSayfalar(D = S) {
  const kn = id => { const x = (D.kursiyerler || []).find(k => k.id === id) || (D === S ? kursiyer(id) : null); return x ? tamAd(x) : ''; };
  const eg = id => ((D.egitmenler || []).find(x => x.id === id) || (D === S ? egitmen(id) : null) || {}).ad || '';
  const ar = id => ((D.araclar || []).find(x => x.id === id) || (D === S ? arac(id) : null) || {}).plaka || '';
  const ks = D.kursiyerler || [], od = x => x.odeme || { toplam: 0, taksitler: [] };
  const sonucAd = v => typeof v === 'string' ? v : (v && v.sonuc) || '';
  const puan = (x, id) => { const k = ks.find(y => y.id === id) || {}, r = (x.sonuc || {})[id]; return r && typeof r === 'object' && r.puan != null ? r.puan : t(((/direksiyon|uygulama/i.test(x.tur || '') ? k.dsinav : k.esinav) || {}).puan); };
  const kisi = { kursiyer: kn, egitmen: eg, usta: eg, arac: ar };
  const guvenOdenen = x => { try { return odenen(x); } catch (y) { return ''; } }, guvenKalan = x => { try { return kalanBorc(x); } catch (y) { return ''; } };
  return {
    'Kursiyerler': [['No', 'TC', 'Ad', 'Soyad', 'Telefon', 'E-posta', 'Doğum tarihi', 'Cinsiyet', 'Adres', 'Öğrenim', 'Sınıf', 'Aşama', 'Kayıt', 'Şube', 'Usta öğretici', 'Teorik', 'Direksiyon', 'Toplam ücret', 'Peşinat', 'Peşinat tarihi', 'Ödenen', 'Kalan', 'Durum'],
      ...ks.map(x => [t(x.no), t(x.tc), t(x.ad), t(x.soyad), t(x.tel), t(x.eposta), t(x.dogumTarihi), t(x.cinsiyet), t(x.adres), t(x.ogrenim), (SINIFLAR[x.sinif] || {}).ad || t(x.sinif), t(x.asama), t(x.kayit), t(x.sube), eg(x.egitmen), t(x.teorik), t(x.direksiyon), t(od(x).toplam), t(od(x).pesin), t(od(x).pesinTarih), guvenOdenen(x), guvenKalan(x), x.kapali ? 'Kapalı' : x.pasif ? 'Pasif' : 'Açık'])],
    'Taksitler': [['Kursiyer', 'Sıra', 'Vade', 'Tutar', 'Ödenen kısmi', 'Ödendi', 'Yöntem', 'Açıklama'], ...ks.flatMap(x => (od(x).taksitler || []).map((y, i) => [tamAd(x), i + 1, t(y.vade), t(y.tutar), y.kismi || 0, t(y.odendi), t(y.yontem), t(y.aciklama)]))],
    'Ek kalemler': [['Kursiyer', 'Kalem', 'Tutar', 'Ödendi'], ...ks.flatMap(x => (od(x).ekler || []).map(y => [tamAd(x), t(y.ad), t(y.tutar), t(y.odendi)]))],
    'Kasa': [['Tarih', 'Makbuz no', 'Tür', 'Kategori', 'Açıklama', 'Yöntem', 'Tutar', 'Kursiyer', 'İptal'], ...(D.hareket || []).map(x => [t(x.tarih), t(x.no), t(x.tur), t(x.kategori), t(x.aciklama), t(x.yontem), t(x.tutar), kn(x.kursiyer), x.iptal ? t(x.iptal.tarih) + ' · ' + t(x.iptal.neden) : ''])],
    'Gün sonu': [['Kapatılan gün'], ...(D.gunSonu || []).slice().sort().map(g => [g])],
    'Dersler': [['Tarih', 'Saat', 'Kursiyer', 'Usta öğretici', 'Araç', 'Tür', 'Durum', 'Başlangıç', 'Bitiş', 'Süre (dk)', 'MEBBİS'], ...(D.dersler || []).map(d => [t(d.tarih), t(d.saat), kn(d.kursiyer), eg(d.egitmen), ar(d.arac), d.tur || 'trafik', t(d.durum), t(d.bas), t(d.bit), t(d.sure), d.meb ? 'Girildi' : ''])],
    'Sınavlar': [['Tür', 'Tarih', 'Saat', 'Yer', 'Kursiyer', 'Sonuç', 'Puan'], ...(D.sinavlar || []).flatMap(x => (x.kursiyerler || []).map(id => [t(x.tur), t(x.tarih), t(x.saat), t(x.yer), kn(id), sonucAd((x.sonuc || {})[id]), puan(x, id)]))],
    'Usta öğreticiler': [['Ad', 'Telefon', 'Sınıflar', 'Başlama', 'Durum'], ...(D.egitmenler || []).map(x => [t(x.ad), t(x.tel), (x.siniflar || []).join(', '), t(x.baslama), x.ayrildi ? 'Ayrıldı' : x.pasif ? 'Pasif' : 'Çalışıyor'])],
    'Teorik öğretmenler': [['Ad', 'Telefon', 'Durum'], ...(D.ogretmenler || []).map(x => [t(x.ad), t(x.tel), x.ayrildi ? 'Ayrıldı' : x.pasif ? 'Pasif' : 'Çalışıyor'])],
    'Araçlar': [['Plaka', 'Model', 'Yıl', 'Sınıf', 'Vites', 'Usta öğretici', 'Km', 'Muayene', 'Sigorta'], ...(D.araclar || []).map(a => [t(a.plaka), t(a.model), t(a.yil), t(a.sinif), t(a.vites), eg(a.egitmen), t(a.km), t(a.muayene), t(a.sigorta)])],
    'Teorik dersler': [['Tarih', 'Saat', 'Süre', 'Konu', 'Salon', 'Grup', 'Öğretmen', 'Katılan', 'Mevcut'], ...(D.teorik || []).map(x => [t(x.tarih), t(x.saat), t(x.sure), t(x.konu), t(x.salon), t(x.grup), ((D.ogretmenler || []).find(o => o.id === x.ogretmen) || {}).ad || t(x.ogretmen), Array.isArray(x.katilim) ? x.katilim.length : x.katilim && typeof x.katilim === 'object' ? Object.keys(x.katilim).length : t(x.katilim), t(x.mevcut)])],
    'Faturalar': genel(D.faturalar, kisi),
    'Personel': [['Ad', 'Görev', 'Maaş', 'Telefon', 'Şube'], ...(D.personel || []).map(x => [t(x.ad), t(x.gorev), t(x.maas), t(x.tel), ((D.subeler || []).find(y => y.id === x.sube) || {}).ad || t(x.sube)])],
    'Avanslar': genel(D.avanslar, kisi),
    'Usta ödemeleri': [['Usta öğretici', 'Ay', 'Tutar', 'Tarih', 'Yöntem'], ...(D.ustaOdemeleri || []).map(x => [eg(x.egitmen), t(x.ay), t(x.tutar), t(x.tarih), t(x.yontem)])],
    'İzinler': genel(D.izinler, kisi),
    'Cezalar': [['Tarih', 'Tür', 'Araç', 'Usta öğretici', 'Tebliğ', 'Tutar', 'Ödenen', 'Ödendi'], ...(D.cezalar || []).map(x => [t(x.tarih), t(x.tur), ar(x.arac), eg(x.egitmen), t(x.teblig), t(x.tutar), t(x.odenen), t(x.odendi)])],
    'İmza istekleri': genel(D.imzaTalepleri, kisi),
    'Şubeler': [['Ad', 'Semt', 'Kurum kodu', 'Müdür', 'MEBBİS'], ...(D.subeler || []).map(x => [t(x.ad), t(x.semt), t(x.kurumKodu), t(x.mudur), t(x.mebbis)])],
    'Devredilen sohbetler': genel(D.devredilen),
    'Arşiv (yıllar)': genel(D.arsiv),
    'Adaylar': [['Tarih', 'Ad', 'Telefon', 'Sınıf', 'Kaynak', 'Aşama'], ...(D.adaylar || []).map(a => [t(a.tarih), t(a.ad), t(a.tel), t(a.sinif), t(a.kaynak), t(a.asama)])],
    'İşlem geçmişi': [['Zaman', 'Kim', 'İşlem', 'Ayrıntı'], ...(D.islemler || []).map(x => [t(x.zaman), t(x.kim), t(x.ne), t(x.ayrinti)])],
  };
}

// Excel okuyucu yalnız gerektiğinde yüklenir (sayfalar5.js ile aynı kaynak)
export const xlsxHazir = () => import('./sayfalar5.js?v=230').then(m => m.xlsxYukle());
// aoa_to_sheet metni dize hücresi (t:'s') olarak yazar; .xlsx'te dize hücresi formül olarak çalışmaz, öne ' eklemek gerekmez
// (eklenirse '+90… gibi telefonlarda görünür kalırdı). Formül riski yalnız CSV'de; o yol sayfalar5.js'te.
export async function tumKitap(D = S) {
  await xlsxHazir();
  const X = window.XLSX, wb = X.utils.book_new();
  Object.entries(tumSayfalar(D)).forEach(([ad, l]) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(l), ad.slice(0, 31)));
  return wb;
}
export const dosyaAdi = (on, uzanti) => 'mdsinyal-' + on + '-' + gun(0) + '.' + uzanti;
// Excel dosyası: indirilir ya da (e-posta eki için) base64 döner
export async function tumExcelIndir() { const wb = await tumKitap(); window.XLSX.writeFile(wb, dosyaAdi('butun-veriler', 'xlsx')); return Object.keys(tumSayfalar()).length; }
export async function tumExcelB64(D = S) { const wb = await tumKitap(D); return window.XLSX.write(wb, { bookType: 'xlsx', type: 'base64', compression: true }); }
export async function tumExcelBlob(D = S) { const wb = await tumKitap(D); return new Blob([window.XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); }
// Tam yedek: uygulamanın bütün verisi (geri yüklenebilir biçim)
export const tamYedekMetni = (D = S) => JSON.stringify(D);
export function tamYedekIndir() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([tamYedekMetni()], { type: 'application/json' }));
  a.download = dosyaAdi('tam-yedek', 'json'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
