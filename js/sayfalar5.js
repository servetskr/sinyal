import * as EK from './eklenti.js?v=234';
import * as CR from './cari.js?v=234';
import { ilSecenekleri, kimlikEksikleri, EKRAN_DUZEY, YETKI_EKRAN, YETKI_ISLEM, makbuzAyar, makbuzBicim, makbuzSeri, makbuzSira, ekDersFiyat, ekToplam, kalanBorc, S, kaydet, gun, fark, tarihOku, BUGUN, SINIFLAR, EVRAKLAR, tamAd, tcGecerli, islem, kursiyer, DERS_TUR_AD, oturum, odenen, egitmen, varsayilanSube, eksikEvrak, SOZLESME_VARSAYILAN, sb, sbDers, sbSinav, gorunum, seciliSube, cokSube, tutarOku, gunBatimi, kursIli, sinifEtiket, ekTur, kursiyerTaban, gerekliDireksiyon, tabanListesi, ekDersTabani, eskiBelgeTarihi, MEVCUT_BELGELER } from './veri.js?v=234';
import { e, tl, sayi, ik, rozet, isaret, ekranNotu, olcumler, pencere, kapatPencere, bildir, tarih, csvIndir, ilerleme, avatar, goreli, pinSor, belgeYazdir, kisaLink, siteLink } from './ui.js?v=234';
import { yenile } from './app.js?v=234';
import { destekWa } from './iletisim.js?v=234';
import * as ON from './onay.js?v=234';
import * as TC from './tercih.js?v=234';
import * as IP from './ipliste.js?v=234';
import { ONKOSUL, onkosulTamam, onkosulHaritasi } from './onkosul.js?v=234';
import * as B from './bulut.js?v=234';
import { wpGonder } from './sayfalar1.js?v=234';
import * as ME from './mebevrak.js?v=234';
import * as KR from './kurallar.js?v=234';
import { listeAdi } from './taban.js?v=234';
import { muafMi, muafSonGun } from './gruplar.js?v=234';

/* ================= MEB KURALLARI: KAYNAK VE SORUMLULUK ================= */
const MTSK = 'MTSK Yönetmeliği (ÖÖKGM, Ocak 2025 metni)';
const MTSK_URL = 'https://ookgm.meb.gov.tr/meb_iys_dosyalar/2025_01/13144439_mtsk.pdf';
// Kural motorunun (kurallar.js) kullandığı kurs ayarları: her kuralın "ayar" alanı buradaki anahtardır. Ekrandaki kural listesi
// motorun kural tanımlarından (KR.kurallar) üretilir; bu tablo yalnız değerin adını, birimini, varsayılanını ve kaynağını tutar.
export const KURAL_KAYNAK = {
  programOnGun: { ad: 'Direksiyon programı MEBBİS’e kaç gün önce girilmeli (en az 5, yönetmelik)', birim: 'gün', tur: 'mevzuat', varsayilan: 5, min: 5, max: 30, kaynak: MTSK + ', md.23/1', url: MTSK_URL },
  gunlukDersSiniri: { ad: 'Kursiyer başı günlük en fazla direksiyon', birim: 'saat', tur: 'mevzuat', varsayilan: 2, min: 1, max: 2, kaynak: MTSK + ', md.16/4 (en fazla 2 saat)', url: MTSK_URL },
  geceDersi: { ad: 'En az gece dersi', birim: 'saat', tur: 'mevzuat', varsayilan: 2, min: 1, max: 10, kaynak: MTSK + ', md.7/3', url: MTSK_URL },
  sinavBildirimIsGunu: { ad: 'Uygulama sınavı bildirimi, sınavdan en geç', birim: 'iş günü önce', tur: 'mevzuat', varsayilan: 4, min: 1, max: 20, kaynak: MTSK + ', md.15/1, md.30/2', url: MTSK_URL },
  direksiyonSure: { ad: 'e-Sınavı geçtikten sonra direksiyon derslerinin tamamlanma süresi', birim: 'gün', tur: 'mevzuat', varsayilan: 90, min: 1, max: 365, kaynak: MTSK + ', md.15/1-b', url: MTSK_URL },
  aracKursiyer: { ad: 'Bir eğitim döneminde araç başına en çok kursiyer kaydı', birim: 'kursiyer', tur: 'mevzuat', varsayilan: 12, min: 1, max: 50, kaynak: MTSK + ', md.16/8 (B belgeliye A1’de iki katı, md.39/5; kontenjan dışı md.6/4 sayılmaz)', url: MTSK_URL },
  sinavUcretIsGunu: { ad: 'Uygulama sınavı ücreti döner sermayeye, sınavdan en geç', birim: 'iş günü önce', tur: 'mevzuat', varsayilan: 6, min: 1, max: 30, kaynak: MTSK + ', md.43/5', url: MTSK_URL },
  // Asgari yaş burada yok: tek kaynak sınıf tablosu (Ayarlar › Sınıf ve ücretler › Asgari yaş; KTY md.76, istisna md.76/3 veri.js)
  telafiSaat: { ad: 'Kaldıktan sonra tekrar sınavdan önce en az ek direksiyon', birim: 'saat', tur: 'mevzuat', varsayilan: 2, min: 2, max: 10, kaynak: MTSK + ', md.15 (başarısız aday eğitimi, en az 2 saat)', url: MTSK_URL },
  ikinciAramaGun: { ad: 'Hakkı dolan adayı aramak için, son sınavdan sonra kaç gün geçince Bugün’e düşsün', birim: 'gün', tur: 'kurs', varsayilan: 30, min: 0, max: 59, kaynak: 'Kurs kararı: ikinci dört hak başvurusu 60 gün içinde (MTSK md.15/4); arama günü kursun düzeni' },
  uzunBeklemeGun: { ad: 'Kaç gün ilerlemeyen aday için uyarı', birim: 'gün', tur: 'kurs', varsayilan: 180, min: 30, max: 730, kaynak: 'Kurs kararı; MEB duyuruları uzun süre işlem görmeyen adayın pasife alınabileceğini söyler (25.12.2019, 04.08.2021)' },
  kayitPencereSon: { ad: 'MEBBİS kayıt ve evrak penceresi, dönem ayının kaçında kapanır (23.59)', birim: 'gün', tur: 'mevzuat', varsayilan: 10, min: 5, max: 20, teyit: true, kaynak: 'MEB duyuruları; duyuruyla 11–12’sine uzayabilir, tatilde öne çekilebilir' },
  kayitPencereBas: { ad: 'MEBBİS kayıt penceresi, dönemden önceki ayın kaçında açılır', birim: 'gün', tur: 'mevzuat', varsayilan: 15, min: 1, max: 28, teyit: true, kaynak: 'MEB duyuruları (önceki ayın ortası)' },
  randevuEnAz: { ad: 'MEBBİS randevusu için sertifika sınıfında en az aday', birim: 'aday', tur: 'mevzuat', varsayilan: 12, min: 1, max: 30, teyit: true, kaynak: 'MEBBİS SKT01005 ekran notu (sistem kuralı); yönetmelikte alt sınır yok' },
  komisyonBoy: { ad: 'Sınav gününde komisyon başına aday', birim: 'aday', tur: 'mevzuat', varsayilan: 10, min: 5, max: 12, kaynak: MTSK + ', md.30/2 (araç başına en çok 10 kursiyer)', url: MTSK_URL },
  memOnayIsGunu: { ad: 'Uygulama sınavı listesinin ilçe MEM onayı, sınavdan en geç', birim: 'iş günü önce', tur: 'mevzuat', varsayilan: 3, min: 1, max: 10, kaynak: MTSK + ', md.28/A-1-b', url: MTSK_URL },
  tekrarBekleme: { ad: 'Kaldıktan sonra tekrar sınava bekleme', birim: 'gün', tur: 'kurs', varsayilan: 15, min: 0, max: 120, kaynak: 'Kurs uygulaması: mevzuatta sabit bir gün sayısı yok, kurs belirler' },
  bildirimTekrarSaat: { ad: 'Kapatılan iş bildirimi, iş yapılmadıysa kaç saat sonra yeniden gelsin', birim: 'saat', tur: 'kurs', varsayilan: 6, min: 1, max: 72, kaynak: 'Kurs kararı (Genel bakış › Bugün yapılacaklar; iş yapılınca bildirim kendiliğinden kalkar)' },
  devamsizlikSiniri: { ad: 'Teorik devamsızlık uyarı sınırı', birim: 'ders', tur: 'kurs', varsayilan: 4, min: 1, max: 34, kaynak: 'Kurs uygulaması: uyarı eşiği, mevzuattaki devam şartını kurs müdürü kontrol eder' },
  ekDersUcreti: { ad: 'Ek direksiyon dersi ücreti', birim: '₺', tur: 'kurs', min: 0, max: 100000, kaynak: 'Kurs kararı (il taban ücretinin altında olamaz)' },
  // Kayıt kalitesi: uyarı üretir, kaydı engellemez. Varsayılanı olan ve dayanağı kesin olmayan değerler "Teyit bekliyor" görünür; kurs kendi değerini girince kalkar. 0 = denetim kapalı.
  // min/max: girişte geçerli aralık (dışındaki değer kaydedilmez); boş bırakılırsa varsayılana döner.
  saglikGecerlilikAy: { ad: 'Sağlık raporu kaç ay geçerli sayılsın (uyarı)', birim: 'ay', tur: 'kurs', varsayilan: 12, min: 0, max: 120, teyit: true, kaynak: 'MTSK Yön. md.11/1-a-4 “sürücü olur” raporu ister, süre yazmaz. Varsayılan 12 ay: Sağlık Raporları Yönetmeliği md.66/1’in genel kuralı (başka tarih yazmayan rapor 1 yıl); sürücü raporuna uygulanışı teyit bekliyor. Raporda geçerlilik tarihi girildiyse o tarih kullanılır. 19.05.2026’dan önce verilen raporlar kendi süreleri bitene kadar geçerli (geçici md.1/2). 0 yazılırsa uyarı kapanır.' },
  adliGecerlilikAy: { ad: 'Adli sicil belgesi kaç ay geçerli sayılsın (uyarı)', birim: 'ay', tur: 'kurs', varsayilan: 6, min: 0, max: 120, kaynak: 'Kurs kararı: mevzuatta adli sicil belgesi için süre yok (MTSK Yön. md.11/1-a-5 barkotlu belge ister). Belirleyici olan Bakanlığın adli mercilerden yaptığı teyit; 0 yazılırsa uyarı kapanır.' },
  evrakAlinmaAy: { ad: 'Evraklar en çok kaç ay önce alınmış olsun (sağlık, adli sicil, öğrenim)', birim: 'ay', tur: 'kurs', varsayilan: 1, min: 0, max: 24, kaynak: 'Kurs kararı: belge kendi süresi içinde geçerli olsa da kurs yeni alınmışını ister; 0 = denetim kapalı' },
  bulanikSinir: { ad: 'Evrak fotoğrafı bulanıklık eşiği', birim: 'netlik', tur: 'kurs', varsayilan: 250, min: 0, max: 100000, teyit: true, kaynak: 'mdSinyal ölçüsü: net belgede binlerce, bulanıkta yaklaşık 100 çıkar. Eşiğin altındaki fotoğraf “bulanık olabilir” diye işaretlenir. Gerçek evrakla ayarlanmadı; 0 = kapalı.' },
  imzaAsgari: { ad: 'İmzada en az çizgi uzunluğu', birim: '% alan eni', tur: 'kurs', varsayilan: 50, min: 0, max: 100, teyit: true, kaynak: 'MEBBİS’in imza ölçüsü bilinmiyor. Tek dokunuş, nokta ve düz çizgi imza sayılmaz; bu değer toplam çizgi uzunluğunun alt sınırıdır. 0 yazılırsa yalnız uzunluk sınırı kapanır.' },
};
// MEBBİS Yardımcısı parça süresi (dk; S.kurs.mebParcaDk, mebkayit.js parcaDk okur). Geçerli aralık 10–40, varsayılan 30.
const PARCA_GECERLI = v => /^\d+$/.test(String(v ?? '')) && +v >= 10 && +v <= 40;
// Değer: kursun girdiği, yoksa kuralın varsayılanı
// Kayıtlı değer aralık dışındaysa (ör. eskiden girilmiş 0) kod varsayılanla çalışır; ekranda da varsayılan görünür
const kuralGecerli = (k, v) => { const r = KURAL_KAYNAK[k]; return v !== '' && v != null && isFinite(+v) && +v >= (r.min ?? 0) && (r.max == null || +v <= r.max); };
const kuralDeger = k => kuralGecerli(k, S.kurs[k]) ? S.kurs[k] : KURAL_KAYNAK[k].varsayilan;
const AY_ADI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const CIDDIYET_AD = { engel: ['Engel', 'kirmizi'], uyari: ['Uyarı', 'sari'], bilgi: ['Bilgi', 'notr'] };
function kuralGirdi(k) {
  const r = KURAL_KAYNAK[k];
  if (k === 'ekDersUcreti') return `<b>${tl(ekDersFiyat('B'))}</b> <a href="#/ayarlar/sinif" style="color:var(--levha);font-weight:700;font-size:13px">Sınıf ve ücretler’de değiştirin</a>`;   // PAR-006: tek düzenleme yeri
  return `<input class="girdi" data-kural="${k}" type="number" min="${r.min ?? 0}"${r.max != null ? ` max="${r.max}"` : ''} step="1" value="${e(kuralDeger(k) ?? '')}" aria-label="${e(r.ad)}" style="width:86px;height:34px;display:inline-block"> <span style="color:var(--soluk);font-size:13px">${e(r.birim)}</span>`;
}
const kaynakHtml = r => r.url ? `<a href="${r.url}" target="_blank" rel="noopener" style="color:var(--levha);font-weight:700">${e(r.kaynak)}</a>` : e(r.kaynak);
// KAY-041: bulanıklık eşiği kursun kendi kararlarıyla (onaylanan/yeniden istenen evrakın netlik sayıları) önerilir
let EVM = null; import('./evrak.js?v=234').then(m => { EVM = m; }).catch(() => { });
const netlikNotu = () => { if (!EVM) return ''; const o = EVM.netlikOnerisi(); return `<small style="display:block;color:var(--soluk);font-size:12.5px;margin-top:2px">${o.n ? `${o.on} onay, ${o.red} yeniden isteme kaydedildi` : 'Öğrenci evrakını onayladıkça ya da yeniden istedikçe sayılar toplanır'}${o.oneri ? ` · önerilen eşik <b>${o.oneri}</b> (onaylanan alt %10: ${o.alt}, reddedilen üst %75: ${o.ust}) <button type="button" class="dg dg-hafif dg-kucuk" data-netlik-oneri="${o.oneri}">Uygula</button>` : o.n ? ' · öneri için en az 10 onay ve 3 yeniden isteme gerekir' : ''}</small>`; };
function degerDurum(k) {
  const K = S.kurs, r = KURAL_KAYNAK[k];
  return `${r.tur === 'mevzuat' ? rozet('Mevzuat', 'mavi') : rozet('Kurs kararı', 'notr')}${(K.kuralDegisen || {})[k] && kuralGecerli(k, K[k]) && +K[k] !== r.varsayilan ? ' ' + rozet('Kurs değiştirdi', 'sari') : ''}${r.teyit && K[k] === undefined ? ' ' + rozet('Teyit bekliyor', 'sari') : ''}`;
}
function kurallarSekme() {
  const K = S.kurs, kontrol = K.kuralKontrol || gun(-13), kl = KR.kurallar(), kullanilan = new Set(kl.map(r => r.ayar).filter(Boolean));
  const digerAyar = Object.keys(KURAL_KAYNAK).filter(k => !kullanilan.has(k)), yil = gun(0).slice(0, 4), il = kursIli(), gece = K.geceSaatleri || {};
  const ilAd = il.charAt(0).toLocaleUpperCase('tr') + il.slice(1);
  return `${ekranNotu('mdSinyal plan ve kayıtları bu kurallara göre kontrol eder. Her kuralın dayanağı yanında yazar; değeri olan kuralı buradan değiştirebilirsiniz. Mevzuat değişince size bildirim gelir, yeni değer siz onaylayınca uygulanır.')}
  <div class="kart"><div class="kart-bas"><h3>Denetlenen kurallar</h3><small>${kl.length} kural · engel işlemi durdurur, uyarı yalnız bildirir</small></div><div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Kural ve dayanağı</th><th>Değer</th><th>Tür</th><th>Durum</th></tr></thead><tbody>
    ${kl.map(r => { const a = r.ayar && KURAL_KAYNAK[r.ayar], c = CIDDIYET_AD[r.ciddiyet] || CIDDIYET_AD.uyari; return `<tr><td><b style="color:var(--murekkep)">${e(r.ad)}</b><small style="display:block;color:var(--soluk);font-size:12.5px;margin-top:2px">${e(r.dayanak || '')}${a ? ' · ' + e(a.ad) : ''}</small></td>
      <td style="white-space:nowrap">${a ? kuralGirdi(r.ayar) : '<span style="color:var(--soluk)">—</span>'}</td>
      <td>${r.ciddiyet === 'engel' ? `${rozet(c[0], c[1])}<small style="display:block;color:var(--soluk);font-size:12px">mevzuat sınırı · değiştirilemez</small>` : `<select class="girdi" style="height:34px;width:auto" data-kural-seviye="${e(r.id)}" aria-label="${e(r.ad)} seviyesi">${[['', 'Varsayılan (' + c[0].toLocaleLowerCase('tr') + ')'], ['uyari', 'Uyarı'], ['yasak', 'Yasak'], ['kapali', 'Kapalı']].map(([v, t]) => `<option value="${v}" ${KR.kuralSeviye(r) === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`}</td>
      <td>${a ? degerDurum(r.ayar) : ''}${r.teyit ? ` <span title="${e(r.teyit)}">${rozet('Teyit bekliyor', 'sari')}</span>` : ''}${!a && !r.teyit ? '<span style="color:var(--soluk)">Mevzuattan</span>' : ''}</td></tr>`; }).join('')}
  </tbody></table></div>
  <div class="kart-govde" style="border-top:1px solid var(--cizgi-2);display:grid;gap:12px">
    <p style="font-size:14px;display:flex;gap:8px;align-items:flex-start">${isaret('tamam', 18)}<span><b>Son mevzuat kontrolü:</b> ${tarih(kontrol)}. Yönetmelik değişince kurallar güncellenir ve size bildirilir.</span></p>
    <p style="font-size:14px;display:flex;gap:8px;align-items:flex-start">${isaret('bilgi', 18)}<span><b>Sorumluluk:</b> Kontroller yardımcıdır. MEBBİS’e giriş ve son karar kurs yetkilisindedir; mdSinyal’in hatalı uyarısından doğan zarar sözleşmenin “Mevzuat kontrolleri” maddesinde düzenlenir.</span></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${K.kuralOnay ? `<span class="rozet rozet-yesil" style="height:34px;display:inline-flex;align-items:center">Değerleri ${e(K.kuralOnay.kim)} onayladı · ${tarih(K.kuralOnay.tarih)}</span>` : `<button class="dg dg-ana" data-kural-onay>Değerleri kontrol ettim, onaylıyorum</button>`}<button class="dg dg-cizgi" data-belge-ac="hizmet">Sözleşmedeki maddeyi gör</button></div>
  </div></div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Kayıt ve belge değerleri</h3><small>Belge geçerlilik süreleri, ücret ve kayıt kalitesi eşikleri · asgari yaş her sınıf için <a href="#/ayarlar/sinif" style="color:var(--levha);font-weight:700">Sınıf ve ücretler</a>’de</small></div><div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Ayar</th><th>Değer</th><th>Kaynak</th><th>Durum</th></tr></thead><tbody>
    ${digerAyar.map(k => `<tr><td><b style="color:var(--murekkep)">${e(KURAL_KAYNAK[k].ad)}</b>${k === 'bulanikSinir' ? netlikNotu() : ''}</td><td style="white-space:nowrap">${kuralGirdi(k)}</td><td class="m-tam" style="font-size:13.5px">${kaynakHtml(KURAL_KAYNAK[k])}</td><td>${degerDurum(k)}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Gece dersi başlangıcı</h3><small>MTSK Yön. md.7/3, md.20/1 · gün batımından sonra başlayan ders gece dersi sayılır</small></div><div class="kart-govde">
    <p style="font-size:14px;margin-bottom:12px">Yönetmelikte sabit bir saat yok; gece dersi gün batımından sonra başlar. İl MEM’in Özel MTSK Modülü’ne girdiği saat ay ay buraya girilebilir. Boş bırakılan ayda saat ${e(ilAd)} için gün batımından hesaplanır (ayın 15’i: soluk yazan saat).</p>
    <div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${AY_ADI.map((ad, i) => { const ay = String(i + 1).padStart(2, '0'), v = /^\d{2}:\d{2}$/.test(gece[ay] || '') ? gece[ay] : ''; return `<label style="display:grid;gap:4px;font-size:13.5px"><span style="color:var(--murekkep);font-weight:700">${ad}</span><input class="girdi" type="time" data-gece-ay="${ay}" value="${v}" aria-label="${ad} gece dersi başlangıcı" style="height:36px"><small style="color:var(--soluk)">${v ? 'il MEM saati' : 'hesap: ' + gunBatimi(yil + '-' + ay + '-15')}</small></label>`; }).join('')}</div>
    <label style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:14px"><input type="checkbox" data-gece-ce ${K.geceCE ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px"><span>CE adayında da gece dersi aransın <small style="display:block;color:var(--soluk)">Yönetmelik CE ve G için gece dersi istemiyor (md.7/3). İl MEM’iniz CE’de gece dersi arıyorsa açın.</small></span></label>
  </div></div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>MEB sürelerinde iş günü</h3><small>Sınav bildirimi (4 iş günü), sınav ücreti (6 iş günü) gibi iş günüyle sayılan süreler</small></div><div class="kart-govde">
    <p style="font-size:14px;margin-bottom:12px">İş günü Pazartesi–Cuma’dır; Cumartesi, Pazar, resmî tatil ve bayramlar sayılmaz. Arife günleri ve idari izin günleri de sayılmaz, böylece son gün erkene çekilir. ${rozet('Teyit bekliyor', 'sari')} <small style="color:var(--soluk)">Arife sabahı mesai var; il MEM’in bu yarım günleri nasıl saydığı sorulacak.</small></p>
    <label style="display:grid;gap:4px;font-size:13.5px;max-width:520px"><span style="color:var(--murekkep);font-weight:700">İdari izin günleri</span><input class="girdi" data-idari-izin value="${e((Array.isArray(K.idariIzin) ? K.idariIzin : []).map(t => t.split('-').reverse().join('.')).join(', '))}" placeholder="ör. 02.01.2027, 03.01.2027" autocomplete="off" style="height:36px"><small style="color:var(--soluk)">Cumhurbaşkanlığı genelgesiyle verilen günler; virgülle ayırın.</small></label>
    <label style="display:grid;gap:4px;font-size:13.5px;max-width:520px"><span style="color:var(--murekkep);font-weight:700">Kursun kapalı günleri</span><input class="girdi" data-kurs-kapali value="${e((Array.isArray(K.kapaliGunler) ? K.kapaliGunler : []).map(t => t.split('-').reverse().join('.')).join(', '))}" placeholder="ör. 31.12.2026, 02.01.2027" autocomplete="off" style="height:36px"><small style="color:var(--soluk)">Kurs bu günlerde ders vermez (bakım, tadilat, yılbaşı arası…): planda kapalı görünür, otomatik plan öneri yapmaz, ders eklerken onay sorulur. MEB sürelerini etkilemez.</small></label>
  </div></div>
  <div class="ara-bosluk"></div>
  ${personelFotoKarti()}
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>MEBBİS’e giriş yöntemi</h3></div><div class="kart-govde"><div class="secim">${[['sirali', 'Sıralı giriş (panodan kopyala, yapıştır)'], ['arac', 'MEBBİS Yardımcısı (Chrome eklentisi)']].map(([v, t]) => `<label><input type="radio" name="mebyontem" value="${v}" data-meb-yontem ${(K.mebYontem || 'sirali') === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
    <p style="font-size:13.5px;color:var(--soluk);margin-top:10px">${K.mebYontem === 'arac' ? (mebAracHazir() ? `Yardımcı bu tarayıcıda kurulu (sürüm ${e(EK.eklenti.surum || '')}).` : 'Yardımcı bu tarayıcıda kurulu değil; MEB işlemleri ekranından kurun.') : 'Sıralı girişte MEBBİS’e kurs yetkilisi kendi oturumunda girer; mdSinyal yalnızca hazırlar ve kopyalatır.'}</p>
    <p style="font-size:13px;color:var(--metin);margin-top:8px;display:flex;gap:8px;align-items:flex-start">${isaret('bilgi', 18)}<span>${MEB_BILGI}</span></p>
    <label style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px;font-size:14px"><span style="color:var(--murekkep);font-weight:700">Yardımcı uzun işleri parçalara bölsün</span><input class="girdi" type="number" min="10" max="40" step="1" data-meb-parca value="${PARCA_GECERLI(K.mebParcaDk) ? K.mebParcaDk : 30}" aria-label="Parça süresi (dakika)" style="width:86px;height:34px"><span style="color:var(--soluk);font-size:13px">dakikada bir</span></label>
    <small style="display:block;color:var(--soluk);font-size:13px;margin-top:4px">MEBBİS oturumu yaklaşık 40 dakikada kapanabilir. Yardımcı işi bu süreye göre parçalar, parça bitince kaydeder ve sıradakine geçer. Önerilen 30 dakika (10–40).</small></div></div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Direksiyon takip formunda imza</h3><small>Denetimde neyin geçerli sayılacağını il MEM’inize sorun</small></div><div class="kart-govde"><div class="secim">${[['ikili', 'Dijital imza + haftalık ıslak imzalı çıktı'], ['dijital', 'Yalnızca dijital imza'], ['islak', 'Yalnızca ıslak imza']].map(([v, t]) => `<label><input type="radio" name="imza" value="${v}" data-imza ${K.imzaYontemi === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
    <button class="dg dg-cizgi dg-kucuk" style="margin-top:10px" data-belge-ac="dilekce">${ik('belge')}İl MEM’e soran dilekçe (hazır)</button>
    <p style="font-size:13.5px;color:var(--soluk);margin-top:10px">${{ ikili: 'Ders bitince usta öğretici ve kursiyer telefonda imzalar; her hafta takip formu boş imza sütunlarıyla basılır ve ıslak imzalatılır. İl MEM dijital imzayı kabul edene kadar önerilen yol budur.', dijital: 'Yalnızca il MEM’iniz dijital imzayı yazılı olarak kabul ettiyse seçin.', islak: 'Telefonda imza istenmez; takip formu her ders sonrası basılı imzalanır.' }[K.imzaYontemi || 'ikili']}</p></div></div>`;
}

/* ================= PERSONEL FOTOĞRAFI ================= */
// MEBBİS personel fotoğraf ekranı (RSI01001 “Fotoğrafı Olmayanları Listele”) ve denetimde fotoğraflı kurum kimlik kartı (MTSK Yön. md.46/A-7).
// Eksikse uyarı verilir, iş engellenmez. Fotoğraf 350×450 (3:4) JPEG'e kırpılır; öğrenci fotoğrafıyla aynı ölçü.
// Liste ve uyarı kural motorunda (kurallar.js personelKisileri, kural P01 “Personel fotoğrafı”, kapsam personel): MEB işlemleri › Kurallar ve bu kart aynı kaynaktan.
export const personelListesi = () => KR.personelKisileri();
export const personelFotoEksik = () => personelListesi().filter(p => !p.x.foto);
// P01 bulguları eski biçimde: [{ seviye, baslik, aciklama, dayanak, link }]
export const personelFotoUyarilari = () => KR.calistir(r => r.id === 'P01').map(b => ({ seviye: b[0], baslik: b[1], aciklama: b[2], dayanak: b.dayanak, link: b[3] }));
export function personelFotoKirp(dosya) {
  return new Promise((ok, red) => {
    const r = new FileReader(); r.onerror = red;
    r.onload = () => { const im = new Image(); im.onerror = red; im.onload = () => {
      const W = 350, H = 450, o = Math.max(W / im.width, H / im.height), w = im.width * o, h = im.height * o, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); ok(c.toDataURL('image/jpeg', 0.85)); }; im.src = r.result; };
    r.readAsDataURL(dosya);
  });
}
// PER-015: fotoğraflı kurum kimlik kartı (MTSK Yön. md.46/A-7: eğitim personeli yakasında taşır). 85,6×54 mm, A4'te 10 kart (2×5), kesme çizgili.
// Bilgiler kurs ve personel kartından: kurs adı ve kurum kodu, ad soyad, görev, MEBBİS izin no, çalışma izni bitişi; altta müdür imza/mühür yeri.
export function kimlikKartlari(l = personelListesi()) {
  if (!l.length) return bildir('Kimlik kartı basılacak personel yok', 'uyari');
  const sube = (S.subeler || [])[0] || {}, kurs = S.kurs.resmiAd || ('Özel ' + String(S.kurs.ad || '').replace(/^özel\s+/i, '')), kod = sube.kurumKodu || S.kurs.kurumKodu || '';
  const kart = ({ x, gorev }) => { const bit = x.mebIzinBitis || (x.meb || {}).izinBit;
    return `<div style="width:85.6mm;height:54mm;box-sizing:border-box;border:0.3mm dashed #999;border-radius:3mm;padding:3mm 3.5mm;display:flex;flex-direction:column;gap:1.5mm;break-inside:avoid;font-family:Arial,sans-serif;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:2mm;border-bottom:0.4mm solid #123;padding-bottom:1mm"><b style="font-size:7.5pt;line-height:1.15;text-transform:uppercase">${e(kurs)}</b>${kod ? `<span style="font-size:6.5pt;white-space:nowrap">Kurum kodu ${e(kod)}</span>` : ''}</div>
      <div style="display:flex;gap:3mm;flex:1;min-height:0">
        <div style="width:22mm;height:29mm;flex:none;border:0.3mm solid #999;display:grid;place-items:center;overflow:hidden;background:#f4f4f4">${x.foto ? `<img src="${e(x.foto)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '<span style="font-size:6.5pt;color:#888;text-align:center">Fotoğraf<br>yapıştırın</span>'}</div>
        <div style="display:flex;flex-direction:column;gap:1mm;min-width:0;font-size:7.5pt;line-height:1.25">
          <span style="font-size:6.5pt;letter-spacing:.3mm;color:#555">KURUM KİMLİK KARTI</span>
          <b style="font-size:10pt;line-height:1.15">${e(String(x.ad || '').toLocaleUpperCase('tr'))}</b>
          <span>${e(gorev)}${x.brans && gorev !== x.brans ? ' · ' + e(x.brans) : ''}</span>
          ${x.calismaIzinNo ? `<span>Çalışma izni no: <b>${e(x.calismaIzinNo)}</b></span>` : ''}
          ${bit ? `<span>Geçerlilik: ${e(bit.split('-').reverse().join('.'))}</span>` : ''}
        </div></div>
      <div style="display:flex;justify-content:flex-end;font-size:6.5pt;color:#555"><span style="border-top:0.3mm solid #999;padding-top:0.6mm;min-width:30mm;text-align:center">Kurs müdürü · imza, mühür</span></div></div>`; };
  const sayfalar = []; for (let i = 0; i < l.length; i += 10) sayfalar.push(`<div style="display:grid;grid-template-columns:85.6mm 85.6mm;gap:4mm;justify-content:center;${i + 10 < l.length ? 'page-break-after:always;' : ''}">${l.slice(i, i + 10).map(kart).join('')}</div>`);
  const eksik = l.filter(p => !p.x.foto).length; if (eksik) bildir(`${eksik} kişinin fotoğrafı yok; kartında fotoğraf kutusu boş çıkar`, 'uyari');
  islem('Kurum kimlik kartlarını yazdırdı', l.length + ' kişi');
  return belgeYazdir(sayfalar.join(''), 'Kurum kimlik kartları');
}
function personelFotoKarti() {
  const l = personelListesi(), eks = l.filter(p => !p.x.foto);
  if (!l.length) return '';
  return `<div class="kart" id="personel-foto"><div class="kart-bas"><h3>Personel fotoğrafları</h3><small>${eks.length ? eks.length + ' kişinin fotoğrafı yok' : 'Hepsinin fotoğrafı var'}</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-kimlik-kart>${ik('belge')}Kimlik kartlarını yazdır</button></div></div>
    ${eks.length ? `<div class="kart-govde" style="padding-bottom:0"><p class="ipucu uyari">${isaret('uyari', 18)}<span>Fotoğrafı olmayan personel MEBBİS’in fotoğraf ekranında “eksik” listesine düşer; denetimde fotoğraflı kurum kimlik kartı aranır. <small style="color:var(--soluk)">Dayanak: MEBBİS RSI01001, MTSK Yön. md.46/A-7 · uyarıdır, ders ve kayıt engellenmez.</small></span></p></div>` : ''}
    <ul class="liste" style="margin-top:8px">${l.map(({ x, tur, gorev }) => `<li><span style="width:42px;height:54px;border-radius:6px;overflow:hidden;flex:none;background:var(--zemin);display:grid;place-items:center;border:1px solid var(--cizgi)">${x.foto ? `<img src="${e(x.foto)}" alt="${e(x.ad)} fotoğrafı" style="width:100%;height:100%;object-fit:cover">` : `<b style="color:var(--soluk);font-size:13px">${e(String(x.ad || '').split(' ').map(y => y[0] || '').join('').slice(0, 2).toLocaleUpperCase('tr'))}</b>`}</span>
      <div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(x.ad)}</b><small style="color:var(--soluk)">${gorev} · ${x.foto ? 'fotoğraf var' + (x.fotoTarih ? ', ' + tarih(x.fotoTarih) : '') : '<b style="color:var(--kirmizi)">fotoğraf yok</b>'}</small></div>
      <span class="dg ${x.foto ? 'dg-hafif' : 'dg-cizgi'} dg-kucuk" style="position:relative;overflow:hidden;flex:none">${x.foto ? 'Değiştir' : 'Fotoğraf ekle'}<input type="file" accept="image/*" data-personel-foto="${tur}:${e(x.id)}" aria-label="${e(x.ad)} fotoğrafı" style="position:absolute;inset:0;opacity:0;cursor:pointer"></span></li>`).join('')}</ul></div>`;
}

/* ================= GÜVENLİK ================= */
const cihazAdi = () => { const u = navigator.userAgent; const t = /Edg\//.test(u) ? 'Edge' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : /Firefox\//.test(u) ? 'Firefox' : 'Tarayıcı'; const s = /iPhone|iPad/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android' : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : ''; return t + (s ? ' · ' + s : ''); };
function guvenlikSekme() {
  const g = S.guvenlik;
  if (B.bulutta()) return bulutGuvenlik(g) + IP.ipKarti();
  const anah = (yol, deger, b, a, kilit) => `<li style="align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-guv="${yol}" ${deger ? 'checked' : ''} ${kilit ? 'disabled' : ''} aria-label="${e(b)}"><i></i></span><div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div></li>`;
  return `<div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>Giriş</h3></div><ul class="liste" style="margin-top:8px">
      <li style="align-items:flex-start">${isaret('tamam', 22)}<div><b style="color:var(--murekkep);display:block">Hatalı PIN kilidi</b><small style="color:var(--metin);font-size:13.5px">Bir hesaba 5 kez hatalı PIN girilirse hesap 15 dakika kilitlenir ve işlem geçmişine yazılır.</small></div></li>
      ${anah('hassasOnay', g.hassasOnay, 'Hassas işlemde PIN’i tekrar sor', 'TC’yi tam göstermek, iade yapmak ve kullanıcı kaldırmak için.')}
      <li style="align-items:flex-start">${isaret('bilgi', 22)}<div><b style="color:var(--murekkep);display:block">İki adımlı giriş · kurs hesabında</b><small style="color:var(--metin);font-size:13.5px">Kurs hesabında her kişi kendi hesabında açar: şifreye ek olarak telefondaki doğrulama uygulamasının (Google Authenticator vb.) kodu istenir.</small></div></li>
      <li style="align-items:flex-start">${isaret('bilgi', 22)}<div><b style="color:var(--murekkep);display:block">Yalnızca kurs internetinden giriş · bağlantı gerekli</b><small style="color:var(--metin);font-size:13.5px">IP kısıtı sunucu tarafında uygulanır; sunucu kurulumuyla açılır.</small></div></li>
    </ul><div class="kart-govde" style="border-top:1px solid var(--cizgi-2)"><b style="color:var(--murekkep)">Hareketsiz kalınca oturumu kapat</b><div class="secim" style="margin-top:8px">${[0, 30, 60, 240, 480].map(d => `<label><input type="radio" name="oturum" value="${d}" data-oturum ${(+g.oturumDk || 0) === d ? 'checked' : ''}><span>${!d ? 'Kapatma' : d < 60 ? d + ' dk' : d / 60 + ' saat'}</span></label>`).join('')}</div></div></div>
    <div class="kart"><div class="kart-bas"><h3>Bu cihazdaki oturum</h3></div><ul class="liste" style="margin-top:8px"><li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(oturum.kullanici ? oturum.kullanici.ad : '')}</b><small style="display:block;color:var(--soluk)">${e(cihazAdi())} · hareketsiz ${g.oturumDk < 60 ? g.oturumDk + ' dk' : g.oturumDk / 60 + ' saat'} sonra kapanır</small></div>${rozet('Bu cihaz', 'yesil')}</li></ul>
      <p style="font-size:13px;color:var(--soluk);padding:0 20px 8px">Diğer cihazlardaki oturumları görme ve uzaktan kapatma sunucu kurulumuyla açılır.</p>
      <div class="kart-bas" style="padding-top:6px"><h3>Kişisel veri erişimi</h3></div><div class="kart-govde"><p style="font-size:14px">TC görüntüleme, veri indirme ve evrak açma kullanıcı adıyla kaydedilir. <a href="#/ayarlar/gecmis" style="color:var(--levha);font-weight:700">İşlem geçmişi</a></p>
      <p style="font-size:14px;margin-top:8px">Bu demoda veriler yalnız bu tarayıcıda durur. Kurs hesabında veriler bulutta şifreli tutulur ve her gün ilk açılışta iki ayrı yere yedeklenir: Google Firebase’de son 31 günün her günü ve son 12 ayın her ayının ilk yedeği durur; Cloudflare’deki ikinci kopya 35 gün durur. Yedekler değiştirilemez, kurs hesabından 30 günden önce silinemez.</p></div></div>
  </div>` + IP.ipKarti();
}

// Gerçek kurs hesabının güvenlik ayarları ve yedekleri
function bulutGuvenlik(g) {
  const mudur = oturum.kullanici.rol === 'mudur';
  const satir = (t, b, a) => `<li style="align-items:flex-start">${isaret(t, 22)}<div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div></li>`;
  return `<div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>Giriş</h3></div><ul class="liste" style="margin-top:8px">
      ${satir('tamam', 'Herkese ayrı e-posta ve şifre', 'Şifreler Google’ın giriş sisteminde tutulur; mdSinyal şifreyi görmez. Çok sayıda hatalı denemede giriş geçici olarak kilitlenir.')}
      <li style="align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-guv="hassasOnay" ${g.hassasOnay ? 'checked' : ''} aria-label="Hassas işlemde şifreyi tekrar sor"><i></i></span><div><b style="color:var(--murekkep);display:block">Hassas işlemde şifreyi tekrar sor</b><small style="color:var(--metin);font-size:13.5px">TC’yi tam göstermek, iade yapmak, kullanıcı kaldırmak ve yedekten geri dönmek için.</small></div></li>
      <li style="align-items:flex-start" data-iki-adim>${isaret('bilgi', 22)}<div><b style="color:var(--murekkep);display:block">İki adımlı giriş</b><small style="color:var(--metin);font-size:13.5px">Durum yükleniyor…</small></div></li>
    </ul><div class="kart-govde" style="border-top:1px solid var(--cizgi-2)"><b style="color:var(--murekkep)">Hareketsiz kalınca oturumu kapat</b><div class="secim" style="margin-top:8px">${[15, 30, 60, 240].map(d => `<label><input type="radio" name="oturum" value="${d}" data-oturum ${g.oturumDk == d ? 'checked' : ''}><span>${d < 60 ? d + ' dk' : d / 60 + ' saat'}</span></label>`).join('')}</div></div></div>
    <div class="kart"><div class="kart-bas"><h3>Yedekler</h3><small>Her gün ilk açılışta otomatik · son 31 gün ve son 12 ayın her ayı</small>${mudur ? `<div class="sag"><button class="dg dg-cizgi dg-kucuk" data-yedek-al>${ik('indir')}Şimdi yedek al</button><label class="dg dg-hafif dg-kucuk" style="cursor:pointer">Dosyadan geri yükle<input type="file" accept=".json,application/json" data-yedek-dosya hidden></label></div>` : ''}</div>
      <div class="kart-govde"><p style="font-size:14px">Her gün ilk açılışta kursun bütün kayıtları iki ayrı yere kopyalanır. Google Firebase’de son 31 günün her günü ve son 12 ayın her ayının ilk yedeği durur; Cloudflare’deki ikinci kopya 35 gün durur. Yedekler değiştirilemez, kurs hesabından 30 günden önce silinemez.</p></div>
      ${mudur ? (dp => `<div class="kart-govde" style="padding-top:0"><p style="font-size:13.5px;color:var(--soluk)">Depolama: ${dp ? `kurs verisi ${mb(dp.veri)}, ${dp.dosyaSayi} dosya ${mb(dp.dosya)}, ${dp.yedekSayi} yedek ${mb(dp.yedek)} · toplam <b>${mb(dp.toplam)}</b> (${tarih(dp.tarih)} ölçümü)` : 'henüz ölçülmedi'} <button type="button" class="dg dg-hafif dg-kucuk" data-depolama-olc>Ölç</button></p></div>`)(S.kurs.depolama) : ''}
      ${mudur ? '<div data-yedek-liste><p class="kart-govde" style="color:var(--soluk);font-size:14px">Yedekler yükleniyor…</p></div>' : '<p class="kart-govde" style="color:var(--soluk);font-size:14px">Yedek listesini ve geri dönüşü kurs müdürü görür.</p>'}</div>
  </div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>İşlem kaydı</h3></div><div class="kart-govde"><p style="font-size:14px">mdSinyal’de yapılan giriş, çıkış ve değişiklikler kim yaptı, ne zaman yaptı bilgisiyle sunucuya yazılır. Bu kayıt yalnız eklenebilir: kurs müdürü dahil kimse değiştiremez ya da silemez. <a href="#/ayarlar/gecmis" style="color:var(--levha);font-weight:700">İşlem geçmişini aç</a></p></div></div>`;
}
// İki adımlı giriş satırı: kendi hesabınız için doğrulama uygulamasını açar/kapatır
function ikiAdimSatiri(k) {
  const yer = k.querySelector('[data-iki-adim]'); if (!yer) return;
  B.ikiAdimDurum().then(acik => {
    yer.innerHTML = `${isaret(acik ? 'tamam' : 'bilgi', 22)}<div style="flex:1"><b style="color:var(--murekkep);display:block">İki adımlı giriş · ${acik ? 'açık' : 'kapalı'}</b><small style="color:var(--metin);font-size:13.5px">${acik ? 'Girişte şifreden sonra telefonunuzdaki doğrulama uygulamasının kodu istenir.' : 'Şifreye ek olarak telefonunuzdaki doğrulama uygulamasından (Google Authenticator vb.) kod istenir. Müdür ve ön büro için önerilir. Her kişi kendi hesabında açar.'}</small></div><button class="dg ${acik ? 'dg-cizgi' : 'dg-ana'} dg-kucuk" ${acik ? 'data-iki-kapat' : 'data-iki-ac'}>${acik ? 'Kapat' : 'Aç'}</button>`;
  }).catch(() => { yer.querySelector('small').textContent = 'Durum okunamadı'; });
}
const qrYukle = () => window.QRCode ? Promise.resolve() : new Promise((ok, red) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = ok; sc.onerror = () => red(new Error('QR aracı yüklenemedi')); document.head.appendChild(sc); });
function ikiAdimKur() {
  B.ikiAdimBaslat().then(g => {
    pencere({
      baslik: 'İki adımlı girişi aç',
      icerik: `<ol style="font-size:14px;padding-left:18px;display:grid;gap:6px"><li>Telefonunuza Google Authenticator ya da Microsoft Authenticator kurun.</li><li>Uygulamada “QR kod tara”yı seçip aşağıdaki kodu okutun. Okutamıyorsanız anahtarı elle girin.</li><li>Uygulamada mdSinyal için görünen 6 haneli kodu yazın.</li></ol>
        <div data-qr style="display:flex;justify-content:center;margin:14px 0"></div><p style="text-align:center;font-size:13px;color:var(--soluk)">Anahtar: <span class="mono" style="user-select:all">${e(g.anahtar)}</span> · <a href="${e(g.url)}" style="color:var(--levha)">telefonda aç</a></p>
        <input class="girdi" data-iki-kod inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="Doğrulama kodu" placeholder="6 haneli kod" style="font-size:20px;letter-spacing:5px;text-align:center;margin-top:10px;width:100%">`,
      altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-iki-onay>Aç</button>',
      onAc(d) {
        qrYukle().then(() => new window.QRCode(d.querySelector('[data-qr]'), { text: g.url, width: 180, height: 180 })).catch(() => { });
        d.querySelector('[data-iki-onay]').addEventListener('click', ev => {
          const kod = d.querySelector('[data-iki-kod]').value.replace(/\D/g, ''); if (kod.length !== 6) return bildir('6 haneli kodu girin', 'uyari');
          ev.target.disabled = true;
          g.bitir(kod).then(() => { islem('İki adımlı girişi açtı'); kaydet(); kapatPencere(); bildir('İki adımlı giriş açıldı'); yenile(); }).catch(x => { ev.target.disabled = false; bildir(B.hataMetni(x), 'uyari'); });
        });
      },
    });
  }).catch(x => { if (x.code === 'auth/unverified-email') B.epostaDogrula().catch(() => { }); bildir(B.hataMetni(x), 'uyari'); });
}
function yedekListesi(k) {
  const yer = k.querySelector('[data-yedek-liste]'); if (!yer) return;
  B.yedekler().then(l => {
    yedekCache = l;
    yer.innerHTML = l.length ? `<ul class="liste">${l.slice(0, 50).map(y => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${tarih(y.tarih)}${y.etiket ? ' · ' + (y.etiket === 'geri-donus-oncesi' ? 'geri dönüşten önce' : 'elle alındı') : ''}</b><small style="display:block;color:var(--soluk)">${y.olusturma ? y.olusturma.toTimeString().slice(0, 5) : ''} · ${e(y.kim || '')} · ${y.ogrenci || 0} öğrenci, ${y.hareket || 0} kasa kaydı · ${Math.max(1, Math.round(y.boyut / 1024))} KB${y.dis ? ' · Cloudflare’de de var' : ''}</small></div><span class="sag" style="gap:6px"><button class="dg dg-hafif dg-kucuk" data-yedek-dogrula="${e(y.id)}">Doğrula</button><button class="dg dg-hafif dg-kucuk" data-yedek-indir="${e(y.id)}">İndir</button><button class="dg dg-hafif dg-kucuk" data-yedek-don="${e(y.id)}">Bu ana dön</button></span></li>`).join('')}</ul>` : `<p class="kart-govde" style="color:var(--soluk);font-size:14px">Henüz yedek yok. İlk yedek bugün birkaç dakika içinde kendiliğinden alınır.</p>`;
  }).catch(x => { yer.innerHTML = `<p class="kart-govde" style="color:var(--kirmizi);font-size:14px">${e(B.hataMetni(x))}</p>`; });
}
let yedekCache = [];
// YON-024: işlem günlüğü süzgeci (yerel ve sunucu listesi): metin arama, kategori, tarih aralığı; CSV
const mb = n => (n >= 1048576 ? (n / 1048576).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round((n || 0) / 1024)) + ' KB');
export const logSuz = { ara: '', kat: '', bas: '', bit: '', kim: '' };
export const LOG_KAT = [['', 'Bütün işlemler'], ['para', 'Para (tahsilat, iade, kasa, fatura)'], ['meb', 'MEBBİS'], ['kayit', 'Öğrenci kaydı ve dosya'], ['ders', 'Ders ve sınav'], ['ayar', 'Ayar ve ücret'], ['giris', 'Giriş ve güvenlik']];
const LOG_RE = { para: /tahsil|ödeme|öde|iade|indirim|fatura|kasa|hareket|taksit|makbuz|senet|gün|devir|tedarik|transfer|avukat/i, meb: /mebbis|meb /i, kayit: /kursiyer|kayıt|öğrenci|evrak|belge|sözleşme/i, ders: /ders|sınav|plan/i, ayar: /ayar|ücret|kural|tarife|kategori|şube|hesab/i, giris: /giriş|çıkış|pin|şifre|kilit|yetki|kullanıcı/i };
export const logUyar = (x, zamanIso) => { const f = logSuz, m = (x.ne + ' ' + (x.ayrinti || '') + ' ' + (x.kim || x.ad || '')).toLocaleLowerCase('tr'), t = String(zamanIso || '').slice(0, 10);
  return (!f.ara || m.includes(f.ara.toLocaleLowerCase('tr'))) && (!f.kat || LOG_RE[f.kat].test(x.ne || '')) && (!f.bas || t >= f.bas) && (!f.bit || t <= f.bit) && (!f.kim || (x.kim || x.ad) === f.kim); };
export const logSuzgecHtml = kisiler => `<div class="vr-suzgec" style="padding:0 20px"><label class="vr-alan"><span>Ara</span><input class="girdi" type="search" data-log="ara" value="${e(logSuz.ara)}" placeholder="Ad, işlem, ayrıntı"></label><label class="vr-alan"><span>Tür</span><select class="girdi" data-log="kat">${LOG_KAT.map(([v, t]) => `<option value="${v}" ${logSuz.kat === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label class="vr-alan"><span>Kullanıcı</span><select class="girdi" data-log="kim"><option value="">Herkes</option>${kisiler.map(x => `<option ${x === logSuz.kim ? 'selected' : ''}>${e(x)}</option>`).join('')}</select></label><label class="vr-alan"><span>Başlangıç</span><input class="girdi" type="date" data-log="bas" value="${e(logSuz.bas)}"></label><label class="vr-alan"><span>Bitiş</span><input class="girdi" type="date" data-log="bit" value="${e(logSuz.bit)}"></label><button type="button" class="dg dg-cizgi dg-kucuk" data-log-csv>${ik('indir')}CSV</button></div>`;
let sunucuLog = [];
export const logCsv = (l, zaman) => csvIndir('islem-gecmisi.csv', [['Zaman', 'Kullanıcı', 'İşlem', 'Ayrıntı'], ...l.map(x => [zaman(x), x.kim || x.ad || '', x.ne || '', x.ayrinti || ''])]);
export const sunucuLogSuzulmus = () => sunucuLog.filter(x => logUyar(x, x.zaman ? new Date(x.zaman.getTime() - x.zaman.getTimezoneOffset() * 6e4).toISOString() : ''));
export function sunucuKaydi(k, onbellek = false) {
  const yer = k.querySelector('[data-sunucu-kayit]'); if (!yer) return;
  (onbellek && sunucuLog.length ? Promise.resolve(sunucuLog) : B.kayitlar(300)).then(l0 => { sunucuLog = l0; const l = l0.filter(x => logUyar(x, x.zaman ? new Date(x.zaman.getTime() - x.zaman.getTimezoneOffset() * 6e4).toISOString() : ''));
    yer.innerHTML = `${logSuzgecHtml([...new Set(l0.map(x => x.ad))])}<div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Zaman</th><th>Kullanıcı</th><th>İşlem</th><th>Ayrıntı</th></tr></thead><tbody>${l.map(x => `<tr><td class="mono m-gizle">${x.zaman ? x.zaman.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '…'}</td><td><b style="color:var(--murekkep)">${e(x.ad)}</b></td><td>${e(x.ne)}</td><td class="m-tam" style="color:var(--metin)">${e(x.ayrinti)}</td></tr>`).join('') || '<tr><td colspan="4">Henüz kayıt yok</td></tr>'}</tbody></table></div>`;
  }).catch(x => { yer.innerHTML = `<p class="kart-govde" style="color:var(--soluk);font-size:14px">${oturum.kullanici.rol === 'mudur' ? e(B.hataMetni(x)) : 'Sunucu kaydını kurs müdürü görür.'}</p>`; });
}

/* ================= ENTEGRASYONLAR: MUHASEBE, E-ARŞİV, POS, PERSONEL ================= */
const HESAP = { Nakit: ['100', 'Kasa'], Havale: ['102', 'Bankalar'], Kart: ['108', 'Diğer hazır değerler (POS)'], alici: ['120', 'Alıcılar'], kdvIn: ['191', 'İndirilecek KDV'], kdvOut: ['391', 'Hesaplanan KDV'], gelir: ['600', 'Yurt içi satışlar'], iade: ['610', 'Satıştan iadeler'], gider: ['770', 'Genel yönetim giderleri'] };
const KDVLI_GIDER = ['Yakıt', 'Bakım', 'Fatura', 'Reklam'];
// Sınav ücreti, harç ve kart ücreti kursiyerin kendi masrafıdır (il taban listesi not 5): kurs yalnız emanet alır, döner sermayeye aktarır.
// Kurs geliri değildir, KDV'ye tabi değildir, faturaya girmez: 336 emanet hesabında izlenir.
const EMANET = ['336', 'Diğer çeşitli borçlar (sınav ücreti emaneti)'];
// Kursiyer tahsilatının türü: 'kurs' (kurs ücreti, peşinat, taksit), ek kalem tahsilatında kalemin türü ('ders' | 'resmi' | 'diger').
// Ek kalem tahsilatında hareketin kategorisi kalemin adıdır; kalem hâlâ öğrencide duruyorsa onun türü (x.tur) kullanılır.
export function hareketTur(h) {
  if (!h || h.tur !== 'Gelir' || iadeMi(h)) return '';
  if (['Kurs ücreti', 'Taksit', 'Peşinat'].includes(h.kategori)) return 'kurs';
  const k = h.kursiyer && kursiyer(h.kursiyer), x = k && ((k.odeme || {}).ekler || []).find(y => y.ad === h.kategori);
  return ekTur(x || { ad: h.kategori || String(h.aciklama || '').split(' · ').slice(-1)[0] });
}
export const resmiTahsilat = h => hareketTur(h) === 'resmi';
// Tahakkuk esaslı fiş. fatura='kayit': kurs ücretinin tamamı kayıtta faturalanır (120 alacak açılır, yalnız kurs ücreti ve taksit tahsilatı 120'yi kapatır;
// ek ders gibi ek kalemler tahsilatta faturalanır: 600 + 391). fatura='tahsilat': her tahsilatta e-Arşiv kesilir (satış ve KDV tahsilat anında).
// Sınav ücreti gibi resmî kalemler iki modda da 336 emanete yazılır (KDV'siz). Tahsilat iptali asıl tahsilatın fişini ters çevirir.
export function muhasebeFisi(ay = 0) {
  const en = S.entegrasyon, oran = (en.kdv ?? 10) / 100, kayitta = en.fatura === 'kayit';
  const d0 = new Date(BUGUN); d0.setDate(1); d0.setMonth(d0.getMonth() - ay);
  const buAy = t => { const d = tarihOku(t); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); };
  const ayir = tutar => { const net = Math.round(tutar / (1 + oran) * 100) / 100; return [net, Math.round((tutar - net) * 100) / 100]; };
  const satir = [['Tarih', 'Fiş no', 'Hesap kodu', 'Hesap adı', 'Açıklama', 'Borç', 'Alacak', 'Evrak no']];
  let no = 0, ev = ''; const fis = (tarih_, aciklama, kalemler) => { const f = 'S' + String(++no).padStart(4, '0'); kalemler.forEach(([h, b, a, ek]) => satir.push([tarih_, f, h[0], h[1] + (ek ? ' · ' + ek : ''), aciklama, b || '', a || '', ev])); };
  // tahsilatın fiş satırları: [açıklama eki, kalemler]
  const gelirKalem = h => { const para = HESAP[h.yontem] || HESAP.Nakit, tur = hareketTur(h);
    if (tur === 'resmi') return [' · emanet (KDV’siz, döner sermayeye aktarılır)', [[para, h.tutar], [EMANET, 0, h.tutar]]];
    if (kayitta && h.kursiyer && tur === 'kurs') return [' · tahsilat', [[para, h.tutar], [HESAP.alici, 0, h.tutar]]];
    const [n, v] = ayir(h.tutar); return [' · e-Arşiv', [[para, h.tutar], [HESAP.gelir, 0, n], [HESAP.kdvOut, 0, v]]]; };
  if (kayitta) S.kursiyerler.filter(k => buAy(k.kayit)).forEach(k => { const [n, v] = ayir(k.odeme.toplam); fis(k.kayit, tamAd(k) + ' · kurs ücreti faturası', [[HESAP.alici, k.odeme.toplam], [HESAP.gelir, 0, n], [HESAP.kdvOut, 0, v]]); });
  S.hareket.filter(h => buAy(h.tarih)).sort((a, b) => a.tarih.localeCompare(b.tarih)).forEach(h => {
    const para = HESAP[h.yontem] || HESAP.Nakit; ev = h.fatura || h.no || '';  // evrak: fatura varsa fatura, yoksa makbuz
    if (h.kategori === 'İade') { const [n, v] = ayir(h.tutar); return fis(h.tarih, h.aciklama, [[HESAP.iade, n], [HESAP.kdvOut, v], [para, 0, h.tutar]]); }
    if (h.tur === 'Gelir') { const [ek, kl] = gelirKalem(h); return fis(h.tarih, h.aciklama + ek, kl); }
    // tahsilat iptali: asıl tahsilatın fişi borç/alacak yer değiştirerek ters kaydedilir (KDV ve alacak da geri döner); asıl bulunamazsa gider
    if (h.kategori === 'Tahsilat iptali') { const o = h.iptalEdilen && S.hareket.find(x => x.id === h.iptalEdilen && x.tur === 'Gelir');
      if (o) { const [, kl] = gelirKalem({ ...o, tutar: h.tutar, yontem: h.yontem || o.yontem }); return fis(h.tarih, h.aciklama + ' · ters kayıt', kl.map(([hs, b, a, x]) => [hs, a || 0, b || 0, x])); } }
    // sınav harcı ödemesi (döner sermaye): kursiyerden emanet alınan tutar kapanır
    if (h.kategori === 'Sınav harcı') return fis(h.tarih, h.aciklama, [[EMANET, h.tutar], [para, 0, h.tutar]]);
    if (KDVLI_GIDER.includes(h.kategori)) { const [n, v] = ayir(h.tutar); return fis(h.tarih, h.aciklama, [[HESAP.gider, n, 0, h.kategori], [HESAP.kdvIn, v], [para, 0, h.tutar]]); }
    fis(h.tarih, h.aciklama, [[HESAP.gider, h.tutar, 0, h.kategori], [para, 0, h.tutar]]);
  });
  return satir;
}
export function personelOzeti(ay = 0) {
  const d0 = new Date(BUGUN); d0.setDate(1); d0.setMonth(d0.getMonth() - ay); const buAy = s => { const d = tarihOku(s); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); };
  const izinGun = kim => S.izinler.filter(z => z.kim === kim && buAy(z.bas)).reduce((a, z) => a + Math.round((tarihOku(z.bit) - tarihOku(z.bas)) / 864e5) + 1, 0);
  const sat = [['Ad soyad', 'Görev', 'Şube', 'Brüt aylık ücret', 'Bu ay yapılan ders', 'Ders primi (brüt, SGK’ya tabi)', 'İzin (gün)', 'Brüt toplam', 'Bu ay verilen avans (maaştan düşülecek)'], ['Not: tutarlar brüttür; net ücret, SGK ve vergi kesintileri bordroda hesaplanır.', '', '', '', '', '', '', '']];
  const subeAd = id => ((S.subeler || []).find(x => x.id === id) || {}).ad || '';
  const avans = ad => (S.avanslar || []).filter(a => a.kim === ad && buAy(a.tarih)).reduce((x, a) => x + a.tutar, 0) || '';
  S.egitmenler.forEach(x => { const n = S.dersler.filter(d => d.egitmen === x.id && d.durum === 'Yapıldı' && buAy(d.tarih)).length; sat.push([x.ad, 'Usta öğretici', subeAd(x.sube), x.maas, n, n * x.prim, izinGun(x.id), x.maas + n * x.prim, avans(x.ad)]); });
  S.personel.forEach(p => sat.push([p.ad, p.gorev, subeAd(p.sube), p.maas, '', '', izinGun(p.id), p.maas, avans(p.ad)]));
  return sat;
}
// Usta öğretici puantajı: ay içinde yapılan her direksiyon dersi (bordro için mali müşavire)
export function puantaj(ay = 0) {
  const d0 = new Date(BUGUN); d0.setDate(1); d0.setMonth(d0.getMonth() - ay);
  const buAy = t => { const d = tarihOku(t); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); };
  const sat = [['Usta öğretici', 'Tarih', 'Saat', 'Bitiş', 'Süre (dk)', 'Kursiyer', 'Ders türü']];
  S.egitmenler.forEach(x => S.dersler.filter(d => d.egitmen === x.id && d.durum === 'Yapıldı' && buAy(d.tarih)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))
    .forEach(d => { const k = kursiyer(d.kursiyer); sat.push([x.ad, d.tarih, d.bas || d.saat, d.bit || '', d.sure || '', k ? tamAd(k) : '', DERS_TUR_AD[d.tur] || 'Direksiyon (trafikte)']); }));
  return sat;
}
// --- Mali müşavir: ayın verisi tek yerde (paket, aylık özet PDF'i ve banka mutabakatı ortak kullanır) ---
const iadeMi = h => h.kategori === 'İade';
const trTarih = t => t ? t.slice(8, 10) + '.' + t.slice(5, 7) + '.' + t.slice(0, 4) : '';
const kurus = n => Math.round(n * 100) / 100;
const kdvAyir = (t, oran) => { const n = kurus(t / (1 + oran)); return [n, kurus(t - n)]; };
// iade hareketinde kursiyer kimliği yok; açıklamanın başındaki ad soyaddan bulunur
// PAR-049: öğrenci kimlikten bulunur; ad eşlemesi yalnız eski (kimliksiz) iade kayıtları için ve tek eşleşme varsa
const hareketKisi = h => h.kursiyer ? kursiyer(h.kursiyer) : iadeMi(h) ? (l => l.length === 1 ? l[0] : null)(S.kursiyerler.filter(k => (h.aciklama || '').startsWith(tamAd(k) + ' ·'))) : null;
const sinifAd = (s, k) => !s ? '' : sinifEtiket(s, k);
function faturaAciklama(h, k) {
  const sn = k ? sinifAd(k.sinif, k) : '', tk = (h.aciklama || '').match(/(\d+)\. taksit/);
  if (iadeMi(h)) { const neden = (h.aciklama || '').split(' · ').slice(2).join(' · '); return 'Sürücü kursu eğitim ücreti iadesi' + (sn ? ' · ' + sn : '') + (neden ? ' · ' + neden : ''); }
  return (['Kurs ücreti', 'Taksit'].includes(h.kategori) ? 'Sürücü kursu eğitim ücreti' + (tk ? ' (' + tk[1] + '. taksit)' : '') : h.kategori || 'Hizmet bedeli') + (sn ? ' · ' + sn : '');
}
function ayVerisi(ay = 0) {
  const d0 = new Date(BUGUN); d0.setDate(1); d0.setMonth(d0.getMonth() - ay);
  const buAy = t => { if (!t) return false; const d = tarihOku(t); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); };
  const hr = S.hareket.filter(h => buAy(h.tarih)).sort((a, b) => (a.tarih + (a.no || '')).localeCompare(b.tarih + (b.no || '')));
  return { d0, buAy, kdv: S.entegrasyon.kdv ?? 10, oran: (S.entegrasyon.kdv ?? 10) / 100, ayAd: d0.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }), ek: d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0'),
    gelir: hr.filter(h => h.tur === 'Gelir' && !iadeMi(h)), iade: hr.filter(iadeMi), emanet: hr.filter(resmiTahsilat), gider: hr.filter(h => h.tur !== 'Gelir' && !iadeMi(h)), ders: S.dersler.filter(d => d.durum === 'Yapıldı' && buAy(d.tarih)) };
}
// Fatura listesi: müşavirin fatura keseceği her tahsilat bir satır; iadeler ayrı bölümde eksi tutarla
export function faturaListesi(ay = 0) {
  const v = ayVerisi(ay), bas = ['Sıra', 'Tarih', 'Alıcı adı soyadı', 'TC kimlik no', 'Adres', 'Açıklama', 'KDV hariç tutar', 'KDV oranı (%)', 'KDV tutarı', 'Toplam (KDV dahil)', 'Ödeme yöntemi', 'Makbuz no', 'Fatura no'];
  const satir = (h, i) => { const k = hareketKisi(h), [n, kv] = kdvAyir(h.tutar, v.oran), x = iadeMi(h) ? -1 : 1; return [i + 1, trTarih(h.tarih), k ? tamAd(k) : (h.kim || ''), k ? k.tc || '' : '', k ? k.adres || '' : '', faturaAciklama(h, k), x * n, v.kdv, x * kv, x * h.tutar, h.yontem || '', h.no || '', h.fatura || '']; };
  const toplam = l => { const r = l.map(satir); return ['', '', 'Toplam', '', '', l.length + ' satır', kurus(r.reduce((a, x) => a + x[6], 0)), '', kurus(r.reduce((a, x) => a + x[8], 0)), kurus(r.reduce((a, x) => a + x[9], 0))]; };
  const fl = v.gelir.filter(h => !resmiTahsilat(h));  // sınav ücreti, harç, kart: kursiyerin masrafı, emanet; fatura kesilmez
  const sat = [bas, ...fl.map(satir), toplam(fl)];
  if (v.iade.length) sat.push([], ['İadeler (iade faturası ya da gider pusulası için; tutarlar eksi)'], bas, ...v.iade.map(satir), toplam(v.iade));
  if (v.emanet.length) sat.push([], [`Not: ${v.emanet.length} tahsilat (${kurus(v.emanet.reduce((a, h) => a + h.tutar, 0))} ₺) sınav ücreti, harç ya da kart ücretidir; kursiyerin kendi masrafı olarak emanet (336) alındı, döner sermayeye aktarılır. Kurs geliri değildir, fatura kesilmez.`]);
  if (S.entegrasyon.fatura === 'kayit') sat.push([], ['Not: Ayarlarda “kayıtta tamamı” seçili. Kurs ücretinin faturası kayıtta kesildiyse taksit tahsilatları için ayrıca fatura gerekmez; Muhasebe fişleri sayfasına bakın.']);
  return sat;
}
// Luca'nın “Excel'den fiş aktarımı” düzeni; satırlar genel muhasebe fişinden gelir
export function lucaFisi(ay = 0) {
  const sat = [['Fiş No', 'Fiş Tarihi', 'Fiş Açıklama', 'Hesap Kodu', 'Evrak No', 'Evrak Tarihi', 'Detay Açıklama', 'Borç', 'Alacak']];
  muhasebeFisi(ay).slice(1).forEach(([t, no, kod, , ac, b, a, ev]) => sat.push([+String(no).slice(1), trTarih(t), ac, kod, ev || '', trTarih(t), ac, +b || 0, +a || 0]));
  return sat;
}
// Banka ve POS mutabakatı: günlük havale/kart toplamları, bankaya yatırılan nakit ve tek tek hareketler
export function bankaPos(ay = 0) {
  const v = ayVerisi(ay), l = [...v.gelir, ...v.iade].filter(h => h.yontem === 'Havale' || h.yontem === 'Kart').sort((a, b) => a.tarih.localeCompare(b.tarih));
  const yatan = S.hareket.filter(h => h.tur === 'Gelir' && h.yontem === 'Nakit' && v.buAy(h.bankaya));
  const gunler = [...new Set([...l.map(h => h.tarih), ...yatan.map(h => h.bankaya)])].sort();
  const top = (t, y, iade) => l.filter(h => h.tarih === t && h.yontem === y && iadeMi(h) === iade).reduce((a, h) => a + h.tutar, 0);
  const sat = [['Günlük toplamlar (banka ekstresi ve POS raporuyla karşılaştırın)'], ['Tarih', 'Havale/EFT tahsilat', 'Havale/EFT iade', 'Bankaya yatırılan nakit', 'Banka net', 'Kart (POS) tahsilat', 'Kart iade', 'POS net', 'İşlem sayısı']];
  const gs = gunler.map(t => { const ht = top(t, 'Havale', false), hi = top(t, 'Havale', true), ny = yatan.filter(h => h.bankaya === t).reduce((a, h) => a + h.tutar, 0), kt = top(t, 'Kart', false), ki = top(t, 'Kart', true); return [trTarih(t), ht, hi, ny, ht - hi + ny, kt, ki, kt - ki, l.filter(h => h.tarih === t).length + yatan.filter(h => h.bankaya === t).length]; });
  sat.push(...gs, ['Ay toplamı', ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => gs.reduce((a, r) => a + r[i], 0))]);
  sat.push([], ['Tek tek hareketler'], ['Tarih', 'Yöntem', 'Ödeyen / alıcı', 'Tutar', 'Makbuz no', 'Açıklama']);
  l.forEach(h => { const k = hareketKisi(h); sat.push([trTarih(h.tarih), h.yontem === 'Kart' ? 'Kart (POS)' : 'Havale/EFT', k ? tamAd(k) : (h.kim || ''), iadeMi(h) ? -h.tutar : h.tutar, h.no || '', h.aciklama || '']); });
  yatan.forEach(h => { const k = hareketKisi(h); sat.push([trTarih(h.bankaya), 'Nakit → banka', k ? tamAd(k) : (h.kim || ''), h.tutar, h.no || '', (h.aciklama || '') + ' · ' + trTarih(h.tarih) + ' tarihli nakit tahsilat']); });
  sat.push([], ['Not: POS tutarları brüttür; banka komisyonu ve hesaba geçiş (valör) günü ekstrede ayrıca görünür.']);
  return sat;
}
// Ayın özet rakamları (Excel'deki Özet sayfası ve PDF aynı hesabı kullanır)
function aylikOzet(ay = 0) {
  const v = ayVerisi(ay), top = l => l.reduce((a, h) => a + h.tutar, 0);
  const fis = muhasebeFisi(ay).slice(1), hs = (kod, i) => kurus(fis.filter(r => r[2] === kod).reduce((a, r) => a + (+r[i] || 0), 0));
  const kat = {}; v.gider.forEach(h => { kat[h.kategori || 'Diğer'] = (kat[h.kategori || 'Diğer'] || 0) + h.tutar; });
  const dt = {}; v.ders.forEach(d => { const a = DERS_TUR_AD[d.tur] || 'Direksiyon (trafikte)'; dt[a] = (dt[a] || 0) + 1; });
  const per = personelOzeti(ay).slice(2);
  return { ...v, gelirT: top(v.gelir), iadeT: top(v.iade), giderT: top(v.gider), yontem: ['Nakit', 'Havale', 'Kart'].map(y => [y, top(v.gelir.filter(h => h.yontem === y))]),
    kat: Object.entries(kat).sort((a, b) => b[1] - a[1]), kdvH: kurus(hs('391', 6) - hs('391', 5)), kdvI: hs('191', 5), kisi: per.length, brut: per.reduce((a, r) => a + (+r[7] || 0), 0), dersT: Object.entries(dt), faturasiz: v.gelir.filter(h => !h.fatura && !resmiTahsilat(h)).length, emanetT: top(v.emanet) };
}
const YONTEM_AD = { Nakit: 'Nakit', Havale: 'Havale/EFT', Kart: 'Kart (POS)' };
// Mali müşavir paketi: özet, fatura listesi, banka/POS mutabakatı, giderler, muhasebe ve Luca fişleri, personel özeti ve puantaj tek Excel dosyasında
export async function musavirPaketi(ay = 0) {
  await xlsxYukle();
  const o = aylikOzet(ay);
  const giderS = [['Tarih', 'Kategori', 'Açıklama', 'Tutar', 'Ödeme yöntemi', 'Makbuz / fatura no', 'Tedarikçi']];
  o.gider.forEach(h => giderS.push([trTarih(h.tarih), h.kategori || '', h.aciklama || '', h.tutar, h.yontem || '', h.fatura || h.no || (h.alis && ((S.alisFaturalari || []).find(a => a.id === h.alis) || {}).belgeNo) || '', (h.tedarikci && ((S.tedarikciler || []).find(t => t.id === h.tedarikci) || {}).ad) || '']));
  const alisS = CR.alisSatirlari(o.buAy);  // PAR-056: ayın alış faturaları
  const ozet = [[S.kurs.ad + ' · ' + o.ayAd + ' mali müşavir paketi'], S.entegrasyon.vkn ? ['Vergi kimlik no', S.entegrasyon.vkn] : [], [],
    ['Tahsilat (iade hariç)', o.gelirT], ...o.yontem.map(([y, t]) => ['  ' + YONTEM_AD[y], t]), ...(o.emanetT ? [['  İçinde sınav ücreti emaneti (KDV’siz, 336; kurs geliri değil)', o.emanetT]] : []), ['İadeler', o.iadeT], ['Net tahsilat', o.gelirT - o.iadeT], [],
    ['Toplam gider (iade hariç)', o.giderT], ...o.kat.map(([k, t]) => ['  ' + k, t]), [],
    ['KDV oranı (%)', o.kdv], ['Hesaplanan KDV (tahmini)', o.kdvH], ['İndirilecek KDV (tahmini)', o.kdvI], [],
    ['Personel brüt toplamı (prim dahil)', o.brut], ['Yapılan ders', o.ders.length], ['Faturası kesilmemiş tahsilat', o.faturasiz], [],
    ['Sayfalar'], ['Fatura listesi', 'Fatura kesilecek her tahsilat: alıcı, TC, adres, KDV ayrımı, makbuz no. İadeler altta ayrı bölümde.'], ['Banka ve POS', 'Havale ve kart tahsilatlarının günlük toplamları; banka ekstresi ve POS raporuyla mutabakat için.'],
    ['Giderler', 'Ayın giderleri (iadeler hariç).'], ['Alış faturaları', 'Ayın gider faturaları: tedarikçi, VKN, belge no, matrah, KDV, ödenen ve kalan (vadeli olanlar dahil).'], ['Muhasebe fişleri', 'Her hareketin hesap kodlu fiş satırları (genel düzen; Logo, Mikro, Zirve).'],
    ['Luca fiş aktarımı', 'Luca “Excel’den fiş aktarımı” için. Sütun adları Luca sürümüne göre değişebilir; aktarım ekranında sütunları eşleyin. Hesap kodları ana hesaptır (100, 102, 600…); alt hesap kullanıyorsanız (ör. 100.01) düzeltin.'],
    ['Personel özeti', 'Brüt ücret, ders primi, izin ve avans; bordro için.'], ['Puantaj', 'Usta öğreticilerin ay içinde verdiği her ders.'], [],
    ['Not', 'mdSinyal makbuzu fatura yerine geçmez. Faturaları kestikten sonra “Fatura listesi” sayfasındaki Fatura no sütununu doldurup kursa geri gönderin; kurs dosyayı mdSinyal’e yükleyince numaralar makbuzlara işlenir. Sınav ücreti, harç ve kart ücreti kursiyerin kendi masrafıdır (il taban listesi not 5): kurs geliri olarak değil 336 emanet hesabına KDV’siz işlendi ve fatura listesine alınmadı. Sürücü kursu eğitim hizmetinde KDV %10’dur (KDV kararı II sayılı liste B-15); oranı siz teyit edin.']];
  const wb = XLSX.utils.book_new();
  [['Özet', ozet], ['Fatura listesi', faturaListesi(ay)], ['Banka ve POS', bankaPos(ay)], ['Giderler', giderS], ...(alisS.length > 1 ? [['Alış faturaları', alisS]] : []), ['Muhasebe fişleri', muhasebeFisi(ay)], ['Luca fiş aktarımı', lucaFisi(ay)], ['Personel özeti', personelOzeti(ay)], ['Puantaj', puantaj(ay)]]
    .forEach(([ad, veri]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(veri), ad));
  XLSX.writeFile(wb, `musavir-paketi-${o.ek}.xlsx`);
}
// Aylık özet: tek sayfa A4; yazdırma penceresinden PDF olarak da kaydedilir
export function aylikOzetHtml(ay = 0) {
  const o = aylikOzet(ay), s = (a, b, kalin) => `<tr><td>${kalin ? '<b>' + e(a) + '</b>' : e(a)}</td><td class="nw" style="text-align:right">${kalin ? '<b>' + b + '</b>' : b}</td></tr>`;
  const tablo = (bas, govde) => `<div class="son"><h3 style="font-size:13px;margin:14px 0 4px">${bas}</h3><table>${govde}</table></div>`;
  return `<h1>Aylık mali özet</h1><p class="a4-alt">${e(S.kurs.ad)} · ${e(o.ayAd)}${S.entegrasyon.vkn ? ' · VKN ' + e(S.entegrasyon.vkn) : ''}</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">
    <div>${tablo('Tahsilat', o.yontem.map(([y, t]) => s(YONTEM_AD[y], tl(t))).join('') + s('Toplam tahsilat', tl(o.gelirT), 1) + (o.emanetT ? s('İçinde sınav ücreti emaneti (gelir değil)', tl(o.emanetT)) : '') + s('İadeler', o.iadeT ? '− ' + tl(o.iadeT) : tl(0)) + s('Net tahsilat', tl(o.gelirT - o.iadeT), 1))}
      ${tablo('KDV (tahmini, %' + o.kdv + ')', s('Hesaplanan KDV (391)', tl(o.kdvH)) + s('İndirilecek KDV (191)', tl(o.kdvI)) + s(o.kdvH >= o.kdvI ? 'Ödenecek KDV' : 'Devreden KDV', tl(Math.abs(o.kdvH - o.kdvI)), 1))}</div>
    <div>${tablo('Giderler', (o.kat.length ? o.kat.map(([k, t]) => s(k, tl(t))).join('') : s('Bu ay gider yok', '—')) + s('Toplam gider', tl(o.giderT), 1))}
      ${tablo('Personel ve ders', s('Personel', o.kisi + ' kişi') + s('Brüt ücret toplamı (prim dahil)', tl(o.brut), 1) + o.dersT.map(([a, n]) => s(a, n + ' ders')).join('') + s('Yapılan ders', o.ders.length + ' ders', 1))}</div>
  </div>
  ${tablo('Fatura durumu', s('Tahsilat sayısı', o.gelir.length) + s('Faturası kesilmemiş', o.faturasiz, 1) + s('İade', o.iade.length))}
  <p style="margin-top:14px"><small>KDV rakamları kasadaki hareketlerden ve Ayarlar’daki %${o.kdv} oranından hesaplanmış tahmindir; beyanname için mali müşavirin kayıtları esastır. Brüt ücretten net ücret, SGK ve vergi kesintileri bordroda hesaplanır. Ayrıntılar aynı ayın müşavir paketindedir (Excel).</small></p>
  <p style="text-align:right;color:#555"><small>mdSinyal · ${e(new Date().toLocaleDateString('tr-TR'))} tarihinde hazırlandı</small></p>`;
}
// Müşavirin geri gönderdiği Excel/CSV: “Makbuz no” ve “Fatura no” sütunları; her sayfada başlık satırı aranır
async function faturaNoAktar(dosya) {
  let tablolar;
  if (/\.xlsx?$/i.test(dosya.name)) { await xlsxYukle(); const wb = window.XLSX.read(await dosya.arrayBuffer(), { type: 'array' }); tablolar = wb.SheetNames.map(ad => window.XLSX.utils.sheet_to_json(wb.Sheets[ad], { header: 1, raw: false, defval: '' })); }
  else tablolar = [csvOku(await csvMetin(dosya))];
  const anahtar = x => String(x ?? '').trim().toUpperCase(), harita = new Map(S.hareket.filter(h => h.no).map(h => [anahtar(h.no), h]));
  let n = 0, ayni = 0, yok = 0, dolu = 0, baslik = false;
  tablolar.forEach(sat => {
    let mi = -1, fi = -1, ti = -1;
    sat.forEach(r => {
      const b = r.map(norm), m = b.findIndex(h => h.length < 25 && h.includes('makbuz') && !h.includes('fatura')), fl = b.map((h, i) => [h, i]).filter(([h]) => h.length < 25 && h.includes('fatura') && !/makbuz|tarih/.test(h));
      if (m >= 0 && fl.length) { mi = m; fi = (fl.find(([h]) => /no|numara|seri/.test(h)) || fl[0])[1]; ti = b.findIndex(h => h.includes('fatura') && h.includes('tarih')); baslik = true; return; }  // başlık satırı (iade bölümünde tekrar edebilir)
      if (mi < 0) return;
      const mk = anahtar(r[mi]), fn = String(r[fi] ?? '').trim(); if (!mk || !fn) return; dolu++;
      const h = harita.get(mk); if (!h) return yok++;
      // PAR-008: müşavirin kestiği fatura S.faturalar'a da yazılır (MEB işlemleri › fatura bilgisi MEBBİS'e, SKT02013); aynı numara ikinci kez eklenmez
      const fkayit = () => { if (!h.kursiyer) return; S.faturalar = S.faturalar || []; const ft = (ti >= 0 && tarihCoz(r[ti])) || h.tarih; const var_ = S.faturalar.find(f => String(f.no) === fn);
        if (var_) { if (!var_.hareket) var_.hareket = h.id; return; } S.faturalar.push({ no: fn, tarih: ft, kursiyer: h.kursiyer, hareket: h.id, tutar: h.tutar, kdv: (S.entegrasyon || {}).kdv ?? 10, aciklama: h.kategori || 'Kurs ücreti', kaynak: 'müşavir' }); };
      if (h.fatura === fn) { fkayit(); return ayni++; }
      h.fatura = fn; fkayit(); n++;
    });
  });
  if (!baslik) return bildir('Dosyada “Makbuz no” ve “Fatura no” sütunları bulunamadı', 'uyari');
  if (!n) return bildir(!dolu ? 'Dosyada fatura numarası yazılı satır yok; müşavirin Fatura no sütununu doldurması gerekir' : ayni ? 'Bu dosyadaki fatura numaraları zaten işlenmiş' : 'Dosyadaki makbuz numaralarıyla eşleşen tahsilat bulunamadı', 'uyari');
  islem('Fatura numaralarını içe aktardı', n + ' fatura · ' + dosya.name); kaydet();
  bildir(n + ' faturanın numarası işlendi' + (yok ? ` · ${yok} makbuz bulunamadı` : '')); yenile();
}
function entegrasyonSekme() {
  const g = S.entegrasyon;
  const kart = (bas, durum, govde) => `<div class="kart"><div class="kart-bas">${isaret(durum ? 'tamam' : 'bilgi', 24)}<h3>${bas}</h3><span class="sag">${durum ? rozet('Bağlı', 'yesil') : rozet('Bağlı değil', 'notr')}</span></div><div class="kart-govde">${govde}</div></div>`;
  return `<div class="izgara iz-2">
    ${kart('e-Arşiv fatura', g.earsiv.bagli, `<p style="font-size:14px">${g.earsiv.bagli ? 'Tahsilat alındığında fatura entegratörünüz üzerinden kesilir, PDF’i kursiyere WhatsApp’tan gider. Kursiyer bilgileri kayıttan gelir.' : 'e-Arşiv bağlantısı hazırlanıyor. O zamana kadar faturayı mali müşaviriniz keser: aşağıdaki müşavir paketindeki “Fatura listesi” sayfası her tahsilatı TC, adres ve KDV ayrımıyla verir; kesilen fatura numaralarını aynı kartta geri yükleyebilirsiniz.'}</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px"><div class="alan" style="width:140px"><label for="e-seri">Fatura seri öneki</label><input id="e-seri" class="girdi" maxlength="3" data-earsiv-alan="seri" value="${e(g.earsiv.seri || 'SNY')}"></div><div class="alan" style="width:170px"><label for="e-vkn">Vergi kimlik no</label><input id="e-vkn" class="girdi" inputmode="numeric" maxlength="11" data-earsiv-alan="vkn" value="${e(g.vkn || '')}"></div></div><small style="color:var(--soluk)">${(S.faturalar || []).length} fatura kesildi.</small>`)}
    <div class="kart"><div class="kart-bas">${isaret(g.muhasebe.bagli ? 'tamam' : 'bilgi', 24)}<h3>Muhasebe</h3><span class="sag">${g.muhasebe.bagli ? rozet('Paraşüt bağlı', 'yesil') : rozet('Excel ile aktarım', 'mavi')}</span></div><div class="kart-govde" style="display:grid;gap:12px">
      <p style="font-size:14px">Kasadaki her hareket muhasebe fişine çevrilir. Logo, Mikro, Luca ve Zirve için aylık fiş dosyası hazırlanır.</p>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end"><div class="alan" style="width:240px;max-width:100%"><label for="kdv">KDV oranı (%)</label><input id="kdv" class="girdi" type="number" min="0" max="20" data-kdv value="${g.kdv ?? 10}"><small style="color:var(--soluk);font-size:12px">Sürücü kursu eğitim hizmeti: %10 (KDV kararı II sayılı liste B-15)</small></div>
        <div><b style="color:var(--murekkep);font-size:14px">Kurs ücreti ne zaman faturalanıyor?</b><div class="secim" style="margin-top:6px">${[['tahsilat', 'Her tahsilatta'], ['kayit', 'Kayıtta tamamı (taksitler alacak)']].map(([v, t]) => `<label><input type="radio" name="fatura" value="${v}" data-fatura ${g.fatura === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div></div>
      <small style="color:var(--soluk)">Oranı ve faturalama zamanını mali müşavirinizle teyit edin; fişler buna göre üretilir.</small>
      <div class="tablo-kap"><table class="tablo"><thead><tr><th>mdSinyal’de</th><th>Muhasebe hesabı</th></tr></thead><tbody>${[['Nakit / havale / kart', [HESAP.Nakit[0] + ' / ' + HESAP.Havale[0] + ' / ' + HESAP.Kart[0], 'Kasa, bankalar, POS']], ['Kurs ücreti (KDV hariç)', HESAP.gelir], ['Hesaplanan KDV', HESAP.kdvOut], ...(g.fatura === 'kayit' ? [['Taksit alacağı', HESAP.alici]] : []), ['Sınav ücreti, harç, kart (kursiyerin masrafı; KDV’siz emanet, faturaya girmez)', EMANET], ['Sınav harcı ödemesi (döner sermaye)', EMANET], ['İade', HESAP.iade], ['Gider (yakıt, bakım, fatura, reklam KDV’li)', [HESAP.gider[0] + ' + ' + HESAP.kdvIn[0], 'Gider + indirilecek KDV']], ['Maaş, kira', HESAP.gider], ['Tahsilat iptali', ['ters kayıt', 'asıl tahsilatın fişi tersine çevrilir']]].map(([a, h]) => `<tr><td>${a}</td><td class="mono">${h[0]} · ${e(h[1])}</td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-ana" data-fis="0">${ik('indir')}Bu ayın muhasebe fişleri</button><button class="dg dg-cizgi" data-fis="1">Geçen ay</button></div></div></div>
    <div class="kart"><div class="kart-bas">${isaret('bilgi', 24)}<h3>Mali müşavir ve personel</h3></div><div class="kart-govde" style="display:grid;gap:12px">
      <p style="font-size:14px">Bordro ve SGK işlemleri mali müşavirinizde kalır. mdSinyal ona her ay ihtiyaç duyduğu özeti hazırlar: maaş, yapılan ders, ders primi, izin.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-ana" data-musavir-paket="0">${ik('indir')}Bu ayın müşavir paketi (Excel)</button><button class="dg dg-cizgi" data-musavir-paket="1">Geçen ay</button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-cizgi" data-musavir-pdf="0">Aylık özet (PDF)</button><button class="dg dg-cizgi" data-musavir-pdf="1">Geçen ayın özeti</button><button class="dg dg-cizgi" data-personel-ozet>Yalnız personel özeti</button></div>
      <small style="color:var(--soluk)">Pakette tek dosyada: özet, fatura listesi (fatura kesilecek tahsilatlar ve iadeler), banka ve POS mutabakatı, giderler, muhasebe fişleri, Luca fiş aktarımı, personel özeti ve usta öğretici puantajı. Aylık özet tek sayfalık PDF’tir: gelir, gider, tahmini KDV, personel ve ders sayısı.</small>
      <div style="display:grid;gap:4px"><div><label class="dg dg-cizgi" style="cursor:pointer">${ik('belge')}Fatura numaralarını içe aktar<input type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-fatura-yukle hidden></label></div>
        <small style="color:var(--soluk)">Müşaviriniz faturaları kesip “Fatura listesi”ni Fatura no sütunu dolu olarak geri gönderdiğinde yükleyin. “Makbuz no” ve “Fatura no” sütunları olan her Excel ya da CSV olur; numaralar makbuzla eşleşip tahsilatlara işlenir.</small></div>
      <div class="alan"><label for="musavir">Mali müşavirin e-postası</label><input id="musavir" class="girdi" type="email" data-musavir value="${e(g.musavir.eposta)}" placeholder="musavir@firma.com"></div>
      <p style="font-size:13.5px;color:var(--soluk)">Özeti indirip müşavirinize e-postayla gönderin.${g.musavir.eposta ? ` <a href="mailto:${e(g.musavir.eposta)}?subject=${encodeURIComponent(S.kurs.ad + ' · aylık özet')}" style="color:var(--levha);font-weight:700">E-posta yaz</a>` : ''}</p></div></div>
  </div>`;
}

/* ================= VERİ AKTARIMI (eşleştirmeli) ================= */
const ALANLAR = [
  ['tc', 'TC kimlik no', ['tc', 'tckimlikno', 'tckn', 'kimlikno', 'tckimliknumarasi', 'kimlik']],
  ['ad', 'Ad', ['ad', 'adi', 'isim', 'kursiyeradi']],
  ['soyad', 'Soyad', ['soyad', 'soyadi', 'kursiyersoyadi']],
  ['tel', 'Telefon', ['telefon', 'tel', 'cep', 'gsm', 'ceptelefonu', 'telefonno']],
  ['dogum', 'Doğum tarihi', ['dogumtarihi', 'dogum', 'dtarihi']],
  ['sinif', 'Sertifika sınıfı', ['sinif', 'sertifika', 'sertifikasinifi', 'ehliyetsinifi', 'istenensinif', 'belgesinifi']],
  ['kayit', 'Kayıt tarihi', ['kayittarihi', 'kayit', 'kayittar']],
  ['toplam', 'Kurs ücreti', ['toplam', 'ucret', 'kursucreti', 'toplamucret', 'tutar']],
  ['odenen', 'Ödenen', ['odenen', 'tahsilat', 'odenentutar', 'tahsiledilen']],
  ['devirBorc', 'Devir borç', ['devirborc', 'kalanborc', 'borcbakiyesi', 'kalantutar']],  // PAR-031: eski programdan devreden borç / alacak
  ['devirAlacak', 'Devir alacak', ['deviralacak', 'alacakbakiyesi', 'fazlaodeme']],
  ['adres', 'Adres', ['adres', 'ikametadresi']],
  ['teorikDers', 'Yapılan teorik ders', ['teorik', 'teorikders', 'teorikdersler', 'katildigiteorik']],
  ['direksiyonDers', 'Yapılan direksiyon dersi', ['direksiyon', 'direksiyonders', 'yapilandireksiyon', 'direksiyondersi']],
  // il taban listesinde satır mevcut belgeye göre seçilir (fark, otomatikten manuele, eski tip, A1 muafiyetli, e-sınav muaf)
  ['mevcut', 'Mevcut belge', ['mevcutbelge', 'mevcutehliyet', 'mevcutsurucubelgesi', 'mevcutbelgesinifi', 'oncekibelge', 'eskiehliyet', 'sahipoldugubelge']],
  ['belgeTarih', 'Belge tarihi', ['belgetarihi', 'mevcutbelgetarihi', 'belgeverilistarihi', 'ehliyettarihi', 'oncekibelgetarihi']],
  ['otomatik', 'Sadece otomatik', ['sadeceotomatik', 'otomatikbelge', 'belgesadeceotomatik']],
  ['eski', '2016 öncesi belge', ['2016oncesi', '2016oncesibelge', 'eskitip', 'eskitipbelge']],
  ['muafTarih', 'e-Sınav muaf tarihi', ['esinavmuaftarihi', 'esinavmuaf', 'muaftarihi', 'esinavmuafiyettarihi', 'esinavgectigitarih']],
];
const TAKSIT_ALAN = [
  ['tc', 'TC kimlik no', ['tc', 'tckimlikno', 'tckn', 'kimlikno']],
  ['vade', 'Vade tarihi', ['vade', 'vadetarihi', 'taksittarihi', 'odemetarihiplan']],
  ['tutar', 'Tutar', ['tutar', 'taksittutari', 'miktar', 'taksit']],
  ['odeme', 'Ödendiği tarih', ['odemetarihi', 'odendi', 'tahsiltarihi', 'odendigitarih']],
  ['yontem', 'Ödeme şekli', ['yontem', 'odemesekli', 'odemeturu']],
];
const ARAC_ALAN = [
  ['plaka', 'Plaka', ['plaka', 'aracplakasi']],
  ['model', 'Marka / model', ['model', 'marka', 'markamodel', 'arac']],
  ['yil', 'Model yılı', ['yil', 'modelyili']],
  ['sinif', 'Sınıf', ['sinif', 'sertifikasinifi']],
  ['muayene', 'Muayene bitiş', ['muayene', 'muayenetarihi', 'muayenebitis']],
  ['sigorta', 'Sigorta bitiş', ['sigorta', 'sigortatarihi', 'trafiksigortasi']],
];
const OGRETMEN_ALAN = [
  ['ad', 'Ad soyad', ['adsoyad', 'adisoyadi', 'adsoyadi', 'adisoyad', 'ad', 'adi', 'isim', 'personel', 'ustaogretici', 'ogretmen']],
  ['tel', 'Telefon', ['telefon', 'tel', 'cep', 'gsm', 'ceptelefonu', 'telefonno', 'gsmno']],
  ['siniflar', 'Verdiği sınıflar', ['sinif', 'siniflar', 'sertifikasinifi', 'brans']],
  ['sertifika', 'Sertifika bitiş', ['sertifika', 'sertifikatarihi', 'ustaogreticisertifikasi', 'izinbitis']],
  ['saglik', 'Sağlık raporu bitiş', ['saglik', 'saglikraporu', 'raportarihi']],
  ['adli', 'Adli sicil tarihi', ['adli', 'adlisicil', 'sabika']],
  ['baslama', 'İşe başlama', ['baslama', 'isebaslama', 'giris', 'baslamatarihi']],
];
const TUR_ALAN = () => ({ kursiyer: ALANLAR, taksit: TAKSIT_ALAN, arac: ARAC_ALAN, ogretmen: OGRETMEN_ALAN }[aktarim.tur || 'kursiyer']);
const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const aktarim = { tur: 'kursiyer', satirlar: null, baslik: [], esles: {}, sonuc: null };
// Excel (.xlsx/.xls): okuyucu yalnız gerektiğinde yüklenir
let xlsxYuk = null;
export const xlsxYukle = () => xlsxYuk || (xlsxYuk = new Promise((ok, red) => { if (window.XLSX) return ok(); const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = ok; sc.onerror = () => { xlsxYuk = null; red(new Error('Excel okuyucu yüklenemedi')); }; document.head.appendChild(sc); }));
export async function excelOku(dosya) {
  await xlsxYukle();
  const wb = window.XLSX.read(await dosya.arrayBuffer(), { type: 'array', cellDates: true });
  const sh = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(sh, { header: 1, raw: false, dateNF: 'dd.mm.yyyy', defval: '' }).map(r => r.map(c => String(c).trim())).filter(r => r.some(Boolean));
}
// satırlar (ilk satır başlık) → aktarım ekranı; dosyadan ya da MEBBİS Yardımcısı’ndan gelir
export function aktarimYukle(sat, tur, kaynak) {
  if (!sat || sat.length < 2) return bildir('Tabloda başlık ve en az bir satır olmalı', 'uyari');
  if (tur) aktarim.tur = tur;
  aktarim.baslik = sat[0].map(x => String(x ?? '')); aktarim.satirlar = sat.slice(1); aktarim.esles = {}; aktarim.sonuc = null; aktarim.kaynak = kaynak || null;
  const nb = aktarim.baslik.map(norm);
  // önce tam ad, sonra başlığın içinde geçen eş anlamlı (ör. “Cep Telefonu” → telefon); bir sütun tek alana eşlenir
  const kullanilan = new Set();
  TUR_ALAN().forEach(([k, , es]) => { const i = nb.findIndex((h, j) => !kullanilan.has(j) && es.includes(h)); if (i >= 0) { aktarim.esles[k] = String(i); kullanilan.add(i); } });
  TUR_ALAN().forEach(([k, , es]) => { if (aktarim.esles[k] != null) return; const i = nb.findIndex((h, j) => !kullanilan.has(j) && h.length > 2 && es.some(x => x.length > 2 && (h.includes(x) || x.includes(h)))); if (i >= 0) { aktarim.esles[k] = String(i); kullanilan.add(i); } });
  yenile();
}
export function csvOku(metin) {
  const ilk = metin.split(/\r?\n/)[0] || ''; const ayr = (ilk.match(/;/g) || []).length >= (ilk.match(/,/g) || []).length ? ';' : ',';
  const sat = []; let alan = '', satir = [], tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) { if (c === '"') { if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; } else alan += c; continue; }
    if (c === '"') tirnak = true; else if (c === ayr) { satir.push(alan.trim()); alan = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && metin[i + 1] === '\n') i++; satir.push(alan.trim()); alan = ''; if (satir.some(x => x)) sat.push(satir); satir = []; } else alan += c;
  }
  satir.push(alan.trim()); if (satir.some(x => x)) sat.push(satir);
  return sat;
}
// Tarih: gg.aa.yyyy, gg/aa/yy, yyyy-aa-gg; iki haneli yıl (24 → 2024, 85 → 1985); ikinci sayı 12'den büyükse ABD biçimi (aa/gg) sayılır
export const tarihCoz = v => {
  const t = String(v || '').trim(), m2 = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (m2) return m2[0];
  const m = t.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/); if (!m) return '';
  let g = +m[1], a = +m[2], y = +m[3]; if (a > 12 && g <= 12) [g, a] = [a, g]; if (a < 1 || a > 12 || g < 1 || g > 31) return '';
  if (m[3].length === 2) { const bu = new Date().getFullYear() % 100; y = y <= bu ? 2000 + y : 1900 + y; }
  if (new Date(y, a - 1, g).getDate() !== g) return '';  // 31 Şubat gibi geçersiz gün
  return `${y}-${String(a).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
};
// Sınıf: bütün ehliyet sınıfları (A1, A2, A, B1, B, BE, C1, C1E, C, CE, D1, D1E, D, DE, F, G, M); "otomatik" B-O; tanınmazsa null (satır hata verir, B sayılmaz)
// B Engelli ("B Engelli", "B-EN") ve 100 ceza puanı eğitimi ("Ceza") düzenli ifadeden önce yakalanır: yoksa B-EN → BE (römork), Ceza → CE (çekici) okunur
const sinifCoz = v => { const t = norm(v); if (!t) return null; if (/engel/.test(t) || /^b-?en$/.test(t)) return SINIFLAR['B-EN'] ? 'B-EN' : null; if (/ceza/.test(t)) return SINIFLAR['CEZA'] ? 'CEZA' : null;
  if (/otomatik|^bo$|^b-?o\b|^bot/.test(t)) return SINIFLAR['B-O'] ? 'B-O' : 'B';
  const m = String(v).toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/[\s.\-_]/g, '').match(/^(?:SINIF)?(A1|A2|B1|BE|C1E|C1|CE|D1E|D1|DE|A|B|C|D|F|G|M)(?![0-9E])/);
  return m && SINIFLAR[m[1]] ? m[1] : null; };
const tutarCoz = v => tutarOku(v);
// Mevcut belge: "B", "B sınıfı", "Yok"; tanınmazsa null (boş '' = belge yok)
const mevcutCoz = v => { const t = String(v || '').trim(); if (!t || /^(yok|-|—|hayır|hayir|0)$/i.test(t)) return '';
  const m = t.toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/[\s.\-_]/g, '').match(/^(?:SINIF)?(A1|A2|B1|BE|C1E|C1|CE|D1E|D1|DE|A|B|C|D|E|F|G|M)(?![0-9E])/);
  return m && MEVCUT_BELGELER.includes(m[1]) ? m[1] : null; };
const evetMi = v => ['evet', 'var', 'x', '1', 'true', 'e', 'dogru', 'otomatik', 'eski'].includes(norm(v));
// Satırdan kursiyer taslağı (taban satırı ve gerekli direksiyon hesabı için; aktarımda da bu alanlar yazılır)
function aktarimTaslak(x) {
  const sn = sinifCoz(x.sinif) || 'B', kt = tarihCoz(x.kayit) || gun(0), mv = mevcutCoz(x.mevcut) || '', bt = mv ? tarihCoz(x.belgeTarih) : '', mt = tarihCoz(x.muafTarih);
  const d = { sinif: sn, kayit: kt, mevcutEhliyet: mv };
  if (mv) { d.oncekiBelge = { sinif: mv, tarih: bt || '' }; if (evetMi(x.otomatik)) d.mevcutOtomatik = true; if (mv === 'E' || evetMi(x.eski) || eskiBelgeTarihi(bt)) d.mevcutEski = true; }
  if (mt && muafMi({ muaf: { sonSinav: mt } }, kt)) d.muaf = { dayanak: '15/5', sonSinav: mt, son: muafSonGun(mt), kaynak: 'aktarım', esinavTarih: mt };
  return d;
}
// CSV kodlaması: önce UTF-8; geçersizse Türkçe Windows (1254) — Türkçe Excel'in kaydettiği CSV'de ı, ş, ğ bozulmasın
export async function csvMetin(dosya) { const b = await dosya.arrayBuffer(); let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (x) { t = new TextDecoder('windows-1254').decode(b); } return t.replace(/^\ufeff/, ''); }
function kontrolEt(r, i = 0) {
  const get = k => aktarim.esles[k] != null && aktarim.esles[k] !== '' ? r[aktarim.esles[k]] : '';
  const x = Object.fromEntries(TUR_ALAN().map(([k]) => [k, get(k)]));
  // tek sütunda “Adı Soyadı” geldiyse son kelime soyad sayılır
  if (aktarim.tur === 'kursiyer' && x.ad && !x.soyad && /\s/.test(String(x.ad).trim())) { const p = String(x.ad).trim().split(/\s+/); x.soyad = p.pop(); x.ad = p.join(' '); }
  const hata = [], uyari = [];
  if (aktarim.tur === 'taksit') {
    const k = S.kursiyerler.find(z => z.tc && z.tc === String(x.tc).trim());
    if (!k) hata.push('Bu TC ile kursiyer yok; önce kursiyer dosyasını aktarın');
    if (!tarihCoz(x.vade)) hata.push('Vade tarihi okunamadı');
    if (!tutarCoz(x.tutar)) hata.push('Tutar yok');
    if (k && k.odeme.taksitler.some(t => t.vade === tarihCoz(x.vade) && t.tutar === tutarCoz(x.tutar))) hata.push('Bu taksit zaten var');
    return { x, hata, uyari, k };
  }
  if (aktarim.tur === 'ogretmen') {
    if (!String(x.ad || '').trim()) hata.push('Ad soyad yok');
    if (x.ad && S.egitmenler.some(h => norm(h.ad) === norm(x.ad))) hata.push('Bu öğretmen zaten kayıtlı');
    if (!String(x.siniflar || '').split(/[,;/ ]+/).map(sinifCoz).filter(Boolean).length) uyari.push('Sınıf okunamadı; B yazılacak');
    if (!tarihCoz(x.sertifika)) uyari.push('Sertifika tarihi yok');
    return { x, hata, uyari };
  }
  if (aktarim.tur === 'arac') {
    if (!x.plaka) hata.push('Plaka yok');
    if (x.plaka && S.araclar.some(a => a.plaka.replace(/\s/g, '') === String(x.plaka).replace(/\s/g, '').toUpperCase())) hata.push('Bu plaka zaten kayıtlı');
    if (!tarihCoz(x.muayene)) uyari.push('Muayene tarihi yok');
    return { x, hata, uyari };
  }
  if (!x.ad || !x.soyad) hata.push('Ad veya soyad yok');
  if (x.tc && !tcGecerli(x.tc)) uyari.push('TC geçersiz');
  if (!x.tc) uyari.push('TC yok');
  if (x.tc && S.kursiyerler.some(k => k.tc === x.tc)) hata.push('Bu TC zaten kayıtlı');
  else if (x.tc && aktarim.esles.tc != null && aktarim.satirlar.slice(0, i).some(o => String(o[aktarim.esles.tc] || '').trim() === String(x.tc).trim())) hata.push('Dosyada iki kez var');
  if (String(x.tel).replace(/\D/g, '').length < 10) uyari.push('Telefon eksik');
  if (String(x.sinif || '').trim() && !sinifCoz(x.sinif)) hata.push('Sınıf tanınmadı: “' + String(x.sinif).slice(0, 20) + '” (kursta açık sınıflardan biri olmalı)');
  else if (!String(x.sinif || '').trim()) uyari.push('Sınıf yok → B');
  if (String(x.mevcut || '').trim() && mevcutCoz(x.mevcut) === null) uyari.push('Mevcut belge okunamadı: “' + String(x.mevcut).slice(0, 12) + '” (belgesiz sayılacak)');
  if (String(x.muafTarih || '').trim()) { const mt = tarihCoz(x.muafTarih); if (!mt) uyari.push('e-Sınav muaf tarihi okunamadı'); else if (mt > (tarihCoz(x.kayit) || gun(0))) uyari.push('Muafiyet için son sınav tarihi kayıttan sonra olamaz'); else if (!muafMi({ muaf: { sonSinav: mt } }, tarihCoz(x.kayit) || gun(0))) uyari.push('e-Sınav muafiyeti süresi dolmuş (son sınavdan 3 yıl, md.15/5)'); }
  // il taban listesi: ücret boşsa öğrencinin satır ücreti yazılır; tabanın altındaki ücret uyarılır (kayıt engellenmez, kural motoru da gösterir)
  if (!hata.length) { const tx = kursiyerTaban(aktarimTaslak(x)), u = tutarCoz(x.toplam);
    if (tx && tx.satir) { if (!u && tx.ucret) uyari.push('Ücret yok → ' + tl(tx.ucret) + ' (taban listesindeki satır)'); else if (u && tx.taban != null && u < tx.taban) uyari.push('Ücret il tabanının altında (' + tl(tx.taban) + ')'); }
    else if (tx && tx.kapsar) uyari.push('Eski tip belge bu sınıfı zaten kapsıyor; kurs eğitimi gerekmez'); }
  // TC'siz kayıtta aynı ad soyad ve telefon zaten varsa mükerrer sayılır
  if (!x.tc && x.ad && S.kursiyerler.some(k => norm(k.ad + k.soyad) === norm(String(x.ad) + String(x.soyad)) && String(k.tel || '').replace(/\D/g, '').slice(-10) === String(x.tel || '').replace(/\D/g, '').slice(-10))) hata.push('Aynı ad ve telefonla kayıtlı');
  return { x, hata, uyari };
}
function aktarimSekme() {
  let govde = '';
  if (aktarim.sonuc) govde = `<div class="kart"><div class="kart-govde">${isaret('tamam', 34)}<h3 style="margin:10px 0 4px">${aktarim.sonuc.n} ${{ kursiyer: 'kursiyer', taksit: 'taksit', arac: 'araç', ogretmen: 'öğretmen' }[aktarim.sonuc.tur]} aktarıldı</h3><p style="color:var(--soluk)">${aktarim.sonuc.atla} satır hatalı olduğu için atlandı. ${{ kursiyer: 'Yapılmış ders sayısına göre aşamaları ayarlandı; KVKK rızası ilk ziyarette alınır. “Ödenen” sütunu devir (eski programda ödenmiş) olarak alındı, kasaya yazılmadı. Sırada taksit planı dosyası var: ödenmiş taksitler bu devirden düşülür, aynı para iki kez sayılmaz.', taksit: 'Ödenmiş taksitler öğrencinin bakiyesinde ödenmiş sayıldı ve “Ödenen” devrinden düşüldü; eski programdaki para olduğu için kasaya yeniden tahsilat yazılmadı. Ödenmemişler vadesinde hatırlatılır.', arac: 'Muayene ve sigorta bitişleri takibe alındı.' }[aktarim.sonuc.tur]}</p>${['kursiyer', 'taksit'].includes(aktarim.sonuc.tur) ? aktarimBakiye(aktarim.sonuc.id) : ''}${(aktarim.paraNot || []).length && aktarim.sonuc.tur === 'taksit' ? `<p class="ipucu uyari" style="margin-top:10px;text-align:left">${isaret('uyari', 18)}<span>Ödenmiş taksitler “Ödenen” sütunundan fazla: ${e(aktarim.paraNot.slice(0, 5).join(' · '))}${aktarim.paraNot.length > 5 ? '…' : ''}</span></p>` : ''}<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><a class="dg dg-ana" href="#/kursiyerler">Kursiyerleri gör</a><button class="dg dg-cizgi" data-aktarim-geri>Bu aktarımı geri al</button><button class="dg dg-hafif" data-aktarim-yeni>Yeni dosya</button></div></div></div>`;
  else if (aktarim.satirlar) {
    const veri = aktarim.satirlar, sonuc = veri.map(kontrolEt);
    const ok = sonuc.filter(s => !s.hata.length).length, hata = sonuc.length - ok, uy = sonuc.filter(s => !s.hata.length && s.uyari.length).length;
    govde = `${olcumler([['Satır', sayi(veri.length)], ['Aktarılacak', sayi(ok), uy ? uy + ' tanesinde uyarı var' : 'Hepsi temiz'], ['Atlanacak', sayi(hata), hata ? 'Ad eksik ya da zaten kayıtlı' : '', hata ? 'uyari' : '']])}${hata || uy ? `<div style="margin-top:10px"><button class="dg dg-cizgi dg-kucuk" data-aktarim-hata>${ik('indir')}Hatalı ve uyarılı satırları indir (${hata + uy})</button></div>` : ''}<div class="ara-bosluk"></div>
    <div class="izgara iz-12"><div class="kart"><div class="kart-bas"><h3>Sütun eşleştirme</h3><small>Otomatik eşleşti; gerekirse değiştirin</small></div><div class="kart-govde" style="display:grid;gap:8px">${TUR_ALAN().map(([k, t]) => `<label style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;font-size:14px"><b style="color:var(--murekkep)">${t}</b><select class="girdi" style="height:34px" data-esles="${k}"><option value="">— yok —</option>${aktarim.baslik.map((h, i) => `<option value="${i}" ${String(aktarim.esles[k]) === String(i) ? 'selected' : ''}>${e(h)}</option>`).join('')}</select></label>`).join('')}</div></div>
    <div class="kart"><div class="kart-bas"><h3>Önizleme</h3><small>İlk 8 satır</small></div><div class="tablo-kap"><table class="tablo"><thead><tr>${aktarim.tur === 'taksit' ? '<th>Kursiyer</th><th>Vade</th><th>Tutar</th><th>Ödendi</th>' : aktarim.tur === 'ogretmen' ? '<th>Ad soyad</th><th>Telefon</th><th>Sınıflar</th><th>Sertifika</th>' : aktarim.tur === 'arac' ? '<th>Plaka</th><th>Model</th><th>Sınıf</th><th>Muayene</th>' : '<th>Ad soyad</th><th>TC</th><th>Sınıf</th><th>Ücret / ödenen</th>'}<th>Durum</th></tr></thead><tbody>${sonuc.slice(0, 8).map(({ x, hata, uyari, k }) => `<tr>${aktarim.tur === 'taksit' ? `<td>${e(k ? tamAd(k) : x.tc)}</td><td class="mono">${e(x.vade)}</td><td class="mono">${tl(tutarCoz(x.tutar))}</td><td>${e(x.odeme || '—')}</td>` : aktarim.tur === 'ogretmen' ? `<td>${e(x.ad)}</td><td class="num">${e(x.tel)}</td><td>${e(String(x.siniflar || '').split(/[,;/ ]+/).map(sinifCoz).filter(Boolean).join(', ') || 'B')}</td><td>${e(x.sertifika || '—')}</td>`: aktarim.tur === 'arac' ? `<td class="mono">${e(x.plaka)}</td><td>${e(x.model)}</td><td>${e(sinifCoz(x.sinif) || x.sinif)}</td><td>${e(x.muayene)}</td>` : `<td>${e(x.ad + ' ' + x.soyad)}</td><td class="mono">${e(x.tc)}</td><td>${e(sinifCoz(x.sinif) || 'B')}</td><td class="mono">${tl(tutarCoz(x.toplam))} / ${tl(tutarCoz(x.odenen))}</td>`}<td>${hata.length ? rozet(hata[0], 'kirmizi') : uyari.length ? rozet(uyari.join(' · '), 'sari') : rozet('Hazır', 'yesil')}</td></tr>`).join('')}</tbody></table></div>
      <div class="kart-govde"><button class="dg dg-ana" data-aktar-onay ${ok ? '' : 'disabled'}>${sayi(ok)} ${{ kursiyer: 'kursiyeri', taksit: 'taksiti', arac: 'aracı', ogretmen: 'öğretmeni' }[aktarim.tur]} aktar</button> <button class="dg dg-hafif" data-aktarim-yeni>Vazgeç</button></div></div></div>`;
  } else govde = `<div class="kart" style="margin-bottom:16px"><div class="kart-govde"><b style="color:var(--murekkep)">Ne aktarıyorsunuz?</b><div class="secim" style="margin-top:8px">${[['kursiyer', 'Kursiyerler (ders sayılarıyla)'], ['taksit', 'Taksit planı ve ödemeler'], ['arac', 'Araçlar'], ['ogretmen', 'Öğretmenler']].map(([v, t]) => `<label><input type="radio" name="akttur" value="${v}" data-akt-tur ${aktarim.tur === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div><small style="display:block;color:var(--soluk);margin-top:8px">Sıra: önce öğretmenler, sonra kursiyerler, taksitler (TC ile eşleşir) ve araçlar. Öğretmenler önce aktarılırsa kursiyerlere sınıfına göre öğretmen atanır; sonra öğrenci dosyasından değiştirilebilir.</small></div></div>
    <div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>1 · Eski programdan dışa aktarın</h3></div><div class="kart-govde"><ul class="liste" style="margin:-8px -20px 0">${[['Wenntec, Tabim, Akınsoft', 'Programınızdaki kursiyer, taksit, araç ya da personel listesini Excel’e aktarın. Excel dosyasını (.xlsx) olduğu gibi yükleyebilirsiniz; CSV’ye çevirmeniz gerekmez.'], ['Excel tablonuz', 'Dosyayı doğrudan yükleyin. Başlık satırı ilk satırda olsun.'], ['Sütun adları farklıysa', 'mdSinyal sütunları adından tanır; tanımadığını bir sonraki adımda elle eşleştirirsiniz.']].map(([a, b]) => `<li style="align-items:flex-start">${isaret('zorunlu', 20)}<div><b style="color:var(--murekkep);display:block">${a}</b><small style="font-size:13.5px;color:var(--metin)">${b}</small></div></li>`).join('')}</ul>
      <button class="dg dg-hafif dg-kucuk" data-sablon-csv style="margin-top:10px">${ik('indir')}Boş şablon (tüm sütunlar)</button></div></div>
    <div class="kart"><div class="kart-bas"><h3>2 · Dosyayı bırakın</h3></div><div class="kart-govde">
      <label class="yukle" style="position:relative">${isaret('zorunlu', 30)}<span style="flex:1"><b style="display:block;color:var(--murekkep)">Excel ya da CSV dosyası seç</b><small style="color:var(--soluk)">Sütun adları farklı olabilir; mdSinyal tanır, siz kontrol edersiniz</small></span><input type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" data-csv-yukle></label>
      <p style="font-size:13.5px;color:var(--soluk);margin-top:12px">Aktarılan her kayıt kontrol edilir: TC doğrulaması, aynı kişinin iki kez girilmesi, eksik telefon ve tanınmayan sınıf. İsterseniz dosyayı bize gönderin, kontrolü biz yapalım.</p></div></div></div>`;
  // Sunucuya kaydedilemeyen değişiklikler (cihazda saklanır): indir, mdSinyal ekibine gönder, sonra temizle
  let kur = []; try { kur = JSON.parse(localStorage.getItem('sinyal-kurtarma') || '[]'); } catch (x) { }
  if (kur.length) govde = `<div class="kart" style="margin-bottom:16px;border-color:var(--kirmizi)"><div class="kart-bas"><h3>Kaydedilemeyen değişiklikler</h3><small>${kur.length} paket · son ${new Date(kur[0].zaman).toLocaleString('tr-TR')} · ${e(kur[0].hata)}</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-kurtarma-indir>İndir</button><button class="dg dg-cizgi dg-kucuk" data-kurtarma-sil>Temizle</button></div></div><p class="kart-govde" style="font-size:14px">Bu değişiklikler sunucu tarafından reddedildi ve yalnız bu cihazda duruyor. Dosyayı indirip mdSinyal ekibine gönderin; geri yüklensin.</p></div>` + govde;
  return govde;
}
function aktarimUygula() {
  const id = 'akt' + Date.now(); let n = 0, atla = 0;
  if (aktarim.tur === 'taksit') {
    // DIG-057: eski programda ödenmiş taksit kasaya yeniden tahsilat yazılmaz (para eski programın kasasından geçti); öğrenci bakiyesinde ödenmiş sayılır.
    // Kursiyer dosyasındaki 'Ödenen' devir olarak alınmışsa ödenmiş taksitler devirden düşülür: aynı para iki kez sayılmaz. İki toplam tutmuyorsa öğrenci başına uyarı.
    const kisi = new Map();
    aktarim.satirlar.map(kontrolEt).forEach(({ x, hata, k }) => {
      if (hata.length) { atla++; return; }
      const vade = tarihCoz(x.vade), od = tarihCoz(x.odeme), tutar = tutarCoz(x.tutar), yon = /kart|pos/i.test(x.yontem) ? 'Kart' : /havale|eft|banka/i.test(x.yontem) ? 'Havale' : 'Nakit';
      k.odeme.taksitler.push({ vade, tutar, odendi: od || null, yontem: od ? yon : null, aktarim: id, ...(od ? { devir: true } : {}) });
      k.odeme.taksitler.sort((a, b) => a.vade.localeCompare(b.vade));
      const o = kisi.get(k) || { odenmis: 0, adet: 0 }; if (od) { o.odenmis += tutar; o.adet++; } kisi.set(k, o);
      n++;
    });
    const notlar = [];
    kisi.forEach((o, k) => { const dv = k.odeme.devirAktarim; if (!o.adet || !dv) return;
      const kalanDevir = Math.max(0, dv.tutar - o.odenmis), fazla = Math.max(0, o.odenmis - dv.tutar);
      dv.dusumler = [...(dv.dusumler || []), { id, tutar: dv.tutar - kalanDevir }]; k.odeme.pesin = kalanDevir; dv.tutar = kalanDevir;   // geri alınabilsin diye düşülen tutar aktarım kimliğiyle saklanır
      const m = `Taksit dosyasından ${o.adet} ödeme (${tl(o.odenmis)}) alındı; Excel’deki “Ödenen” bu yüzden ${kalanDevir ? tl(kalanDevir) + ' peşinat/devir olarak kaldı' : 'devir sayılmadı'}.` + (fazla ? ` Uyarı: ödenmiş taksitler “Ödenen” sütunundan ${tl(fazla)} fazla; eski programdaki bakiyeyi kontrol edin.` : '');
      (k.notlar = k.notlar || []).push({ tarih: gun(0), metin: m }); if (fazla) notlar.push(tamAd(k) + ': ' + tl(fazla) + ' fazla'); });
    aktarim.paraNot = notlar;
  } else if (aktarim.tur === 'ogretmen') {
    const RENK = ['#2f6fde', '#1f7a3e', '#b45309', '#6744b8', '#d52b1e', '#0f766e'];
    aktarim.satirlar.map(kontrolEt).forEach(({ x, hata }, i) => {
      if (hata.length) { atla++; return; }
      const sn = [...new Set(String(x.siniflar || '').split(/[,;/ ]+/).map(sinifCoz).filter(Boolean))];
      S.egitmenler.push({ id: 'e' + Date.now() + i, aktarim: id, ad: String(x.ad).trim(), tel: String(x.tel || '').trim(), siniflar: sn.length ? sn : ['B'], maas: 0, prim: 0, baslama: (tarihCoz(x.baslama) || gun(0)).slice(0, 4), belgeler: Object.fromEntries([['sertifika', tarihCoz(x.sertifika)], ['saglik', tarihCoz(x.saglik)], ['adli', tarihCoz(x.adli)]].filter(([, v]) => v)), renk: RENK[(S.egitmenler.length + i) % RENK.length], sube: varsayilanSube() });
      n++;
    });
  } else if (aktarim.tur === 'arac') {
    aktarim.satirlar.map(kontrolEt).forEach(({ x, hata }, i) => {
      if (hata.length) { atla++; return; }
      S.araclar.push({ id: 'a' + Date.now() + i, aktarim: id, plaka: String(x.plaka).toUpperCase().replace(/\s+/g, ' ').trim(), model: x.model || '', yil: +x.yil || null, sinif: sinifCoz(x.sinif) || 'B', vites: /otomatik/i.test(x.sinif + x.model) ? 'Otomatik' : 'Manuel', km: 0, muayene: tarihCoz(x.muayene) || null, sigorta: tarihCoz(x.sigorta) || null, kasko: null, bakimKm: 10000, egitmen: (S.egitmenler.find(z => z.siniflar.includes(sinifCoz(x.sinif) || 'B')) || S.egitmenler[0]).id, sube: varsayilanSube() });
      n++;
    });
  }
  if (aktarim.tur !== 'kursiyer') { aktarim.sonuc = { id, n, atla, tur: aktarim.tur }; aktarim.satirlar = null; islem({ taksit: 'Taksit planı aktardı', arac: 'Araç aktardı', ogretmen: 'Öğretmen aktardı' }[aktarim.tur] || 'Veri aktardı', n + ' kayıt'); kaydet(); return; }
  aktarim.satirlar.map(kontrolEt).forEach(({ x, hata }, i) => {
    if (hata.length) { atla++; return; }
    const taslak = aktarimTaslak(x), sn = taslak.sinif, kt = taslak.kayit, tx = kursiyerTaban(taslak);
    // ücret boşsa: taban listesindeki satırın ücreti (fark, muaf, eski tip…), liste yoksa sınıf ücreti
    const db = tutarCoz(x.devirBorc) || 0, da = tutarCoz(x.devirAlacak) || 0, od0 = tutarCoz(x.odenen) || 0;  // PAR-031: ücret yazılmamış, devir borç yazılmışsa ücret = ödenen + devir borç
    const toplam = tutarCoz(x.toplam) || (db ? od0 + db : 0) || (tx && tx.satir && tx.ucret) || SINIFLAR[sn].ucret || 0, od = Math.min(od0, toplam);
    const eg = S.egitmenler.find(z => z.siniflar.includes(sn) && (z.sube === varsayilanSube())) || S.egitmenler.find(z => z.siniflar.includes(sn)) || null;  // öğretmen henüz yoksa boş kalır, sonra atanır
    // direksiyon: öğrencinin gerekli saati (mevcut belge, otomatik, eski tip…); sınıfın genel saatiyle kırpılmaz
    const td = taslak.muaf ? SINIFLAR[sn].teorik : Math.min(SINIFLAR[sn].teorik, Math.round(tutarCoz(x.teorikDers))), dd = Math.min(gerekliDireksiyon(taslak), Math.round(tutarCoz(x.direksiyonDers)));
    const asama = dd > 0 || taslak.muaf ? 'Direksiyon' : td >= SINIFLAR[sn].teorik ? 'Sınav' : td > 0 ? 'Teorik' : 'Evrak';
    const yeni = { id: 'k' + Date.now() + i, aktarim: id, ad: String(x.ad).trim(), soyad: String(x.soyad).trim(), tel: x.tel, tc: String(x.tc || '').trim(), dogumTarihi: tarihCoz(x.dogum), dogum: tarihCoz(x.dogum).slice(0, 4), adres: x.adres || '', ogrenim: '', sinif: sn, kayit: kt, egitmen: eg ? eg.id : null, sube: varsayilanSube(), asama, teorik: td, direksiyon: dd, evrak: Object.fromEntries(EVRAKLAR.map(([z]) => [z, false])), mebIslendi: aktarim.kaynak === 'MEBBİS', esinav: null, dsinav: null, odeme: { toplam, sozlesme: toplam, pesin: od, pesinTarih: kt, taksitler: [], senetli: false, ...(da ? { devirAlacak: da } : {}), ...(db && db !== toplam - od ? { devirNot: `Eski programda devir borç ${db} ₺; ücret − ödenen ${toplam - od} ₺` } : {}), ...(od ? { devirAktarim: { tutar: od, ilk: od, kaynak: 'Excel “Ödenen” sütunu', id } } : {}) }, kaynak: 'Aktarım', yorum: null, notlar: [{ tarih: gun(0), metin: 'Eski programdan aktarıldı.' }], deneme: [], acil: null, kvkk: null };
    ['mevcutEhliyet', 'oncekiBelge', 'mevcutOtomatik', 'mevcutEski'].forEach(a => { if (taslak[a]) yeni[a] = taslak[a]; });
    if (taslak.muaf) { yeni.muaf = taslak.muaf; yeni.esinav = { sonuc: 'Geçti', puan: null, tarih: taslak.muaf.esinavTarih, muaf: true }; }
    // il taban listesindeki satır aktarım anındaki hâliyle saklanır (kayıt formundaki gibi; denetimde dayanak)
    if (tx && tx.satir) yeni.taban = { liste: tx.liste.id, satir: tx.satir.id, tutar: tx.taban, ucret: tx.ucret, tarih: gun(0) };
    S.kursiyerler.push(yeni);
    n++;
  });
  aktarim.sonuc = { id, n, atla, tur: 'kursiyer' }; aktarim.satirlar = null;
  if (n) kurIz('aktarim', { onay: true, n });  // YON-076: kurulumdaki 'Kursiyerleri aktar' adımı
  islem('Kursiyer aktardı', n + ' kayıt'); kaydet();
}
// DIG-057: aktarım sonunda bakiye özeti — eski programın bakiye raporuyla karşılaştırılacak toplamlar
function aktarimBakiye(id) {
  const l = S.kursiyerler.filter(k => k.aktarim === id || (k.odeme.taksitler || []).some(t => t.aktarim === id)); if (!l.length) return '';
  const top = l.reduce((a, k) => a + (k.odeme.toplam || 0) + ekToplam(k), 0), od = l.reduce((a, k) => a + odenen(k), 0), kal = l.reduce((a, k) => a + kalanBorc(k), 0), dv = l.reduce((a, k) => a + ((k.odeme.devirAktarim || {}).tutar || 0), 0);
  return `<div class="ipucu" style="margin-top:12px;text-align:left">${isaret('bilgi', 20)}<span><b>Bakiye özeti (${l.length} öğrenci):</b> sözleşme ${tl(top)}, ödenen ${tl(od)}${dv ? ` (bunun ${tl(dv)}’si “Ödenen” sütunundan devir)` : ''}, kalan ${tl(kal)}. Bu toplamı eski programın bakiye raporuyla karşılaştırın. Eski programda ödenmiş taksitler kasaya yeniden tahsilat olarak yazılmadı.</span></div>`;
}

/* ================= GÖRÜNÜM ================= */
// YON-063: görünüm tercihleri kişi başına (js/tercih.js); bu sekme ve kullanıcı menüsündeki pencere aynı içeriği gösterir
export function temaUygula() { return TC.tercihUygula(); }
function gorunumSekme() {
  return `<div class="izgara iz-2"><div class="kart"><div class="kart-bas"><h3>Görünüm ve tercihler</h3><small>Size özel · her cihazda</small></div><div class="kart-govde">${TC.tercihHtml()}</div></div><div class="kart"><div class="kart-govde"><p style="font-size:14px">Sade tema gün boyu açık kalan ekranlar için daha dinlendiricidir: koyu mavi bloklar açık zemine, büyük harfli başlıklar normal yazıya döner. Ön büro ve öğretmenler kendi tercihlerini sağ üstteki adlarına dokunup “Görünüm ve tercihler”den seçer.</p></div></div></div>`;
}

/* ================= AYAR SEKMELERİ (sayfalar2.ayarlar buradan çağırır) ================= */
// Kayıt formu: #/kayit (genel) ya da #/kayit/<şube kimliği> (sayfalar3.js kayitSayfasi, app.js rota: ad/id)
// kısa adres: mdsinyal.com/kayit ve /kayit/<şube> (404.html ve kayit/index.html uygulamanın #/kayit ekranını açar; belgeler/link-standardi.md)
const kayitLinki = id => siteLink('kayit' + (id ? '/' + encodeURIComponent(id) : ''));
const subeSeriKilitli = sid => (S.hareket || []).some(h => { const m = h.no && makbuzSira(h.no); return m && String(m[0]).startsWith(sid + '_'); });
// YON-064 (SOR-148): kurum kimliği — firma bilgileri, MEB'e karşı yetkililer ve şube başına MEB adı, müdür, adres. Alan değişince kaydedilir.
function kimlikSekme() {
  const K = S.kurs, y = K.mebYetkili || [], sef = K.sef || {}, vkn = (S.entegrasyon || {}).vkn || '';
  const alan = (ad, etiket, deger, ek = '') => `<div class="alan"><label for="ki-${ad}">${etiket}</label><input id="ki-${ad}" class="girdi" data-kimlik="${ad}" value="${e(deger || '')}" ${ek}></div>`;
  const eks = kimlikEksikleri();
  return `${ekranNotu('Bu bilgiler sözleşme, makbuz, MEB formları, e-Arşiv, taban fiyat, MEBBİS iş onayı ve imza bloklarına buradan gider. Alanı değiştirip çıkınca kaydedilir.')}
  ${eks.length ? `<p class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span><b>Eksik ${eks.length} bilgi:</b> ${eks.map(e).join(', ')}. Kurulumdaki “Kurum kimliği” adımı bunlar dolunca biter.</span></p>` : `<p class="ipucu" style="margin-bottom:14px">${isaret('tamam', 20)}<span>Kurum kimliği tamam.</span></p>`}
  <div class="kart"><div class="kart-bas"><h3>Firma</h3><small>Kursu işleten kişi ya da şirket</small></div><div class="kart-govde form-izgara">
    ${alan('unvan', 'Ticari unvan', K.unvan, `maxlength="120" placeholder="${e(K.ad || 'Ör. … Eğitim Hizmetleri Ltd. Şti.')}"`)}
    <div class="alan"><label for="ki-kurucuTur">Kurucu türü</label><select id="ki-kurucuTur" class="girdi" data-kimlik="kurucuTur"><option value="">Seçin</option><option value="sahis" ${K.kurucuTur === 'sahis' ? 'selected' : ''}>Şahıs</option><option value="sirket" ${K.kurucuTur === 'sirket' ? 'selected' : ''}>Şirket</option></select></div>
    ${alan('kurucu', K.kurucuTur === 'sirket' ? 'Kurucu temsilcisi (ad soyad)' : 'Kurucu (ad soyad)', K.kurucu, 'maxlength="80" autocomplete="off"')}
    ${alan('vkn', 'VKN / TCKN', vkn, 'inputmode="numeric" maxlength="11" autocomplete="off"')}
    ${alan('vergiDairesi', 'Vergi dairesi', K.vergiDairesi, 'maxlength="60"')}
    ${alan('mukellefKodu', 'Mükellef kodu', K.mukellefKodu, 'maxlength="30" autocomplete="off"')}
    ${alan('eposta', 'Kurum e-postası', K.eposta, 'type="email" maxlength="120" autocomplete="off"')}
    <div class="alan"><span class="et">Logo</span><div class="ki-gorsel">${K.logo ? `<img src="${K.logo}" alt="Kurs logosu">` : ''}<label class="dg dg-cizgi dg-kucuk">${K.logo ? 'Değiştir' : 'Logo yükle'}<input type="file" accept="image/*" data-mk-logo hidden></label>${K.logo ? '<button type="button" class="dg dg-hafif dg-kucuk" data-mk-logo-sil>Kaldır</button>' : ''}</div><small style="color:var(--soluk)">Makbuz ve belgelerin başında</small></div>
    <div class="alan"><span class="et">Kaşe / imza görseli</span><div class="ki-gorsel">${K.kase ? `<img src="${K.kase}" alt="Kaşe ve imza">` : ''}<label class="dg dg-cizgi dg-kucuk">${K.kase ? 'Değiştir' : 'Görsel yükle'}<input type="file" accept="image/png,image/jpeg" data-ki-kase hidden></label>${K.kase ? '<button type="button" class="dg dg-hafif dg-kucuk" data-ki-kase-sil>Kaldır</button>' : ''}</div><small style="color:var(--soluk)">Beyaz zeminli taranmış kaşe; makbuzda kurs imzasının üstünde</small></div>
  </div></div>
  <div class="kart" style="margin-top:16px"><div class="kart-bas"><h3>Yetkililer</h3><small>İmza bloklarında görev ve unvanla yazılır</small></div><div class="kart-govde form-izgara">
    ${alan('y1ad', 'MEB yetkilisi 1 · ad soyad', (y[0] || {}).ad, 'maxlength="80" autocomplete="off"')}${alan('y1unvan', 'MEB yetkilisi 1 · unvan', (y[0] || {}).unvan, 'maxlength="60" placeholder="Ör. Müdür yardımcısı"')}
    ${alan('y2ad', 'MEB yetkilisi 2 · ad soyad', (y[1] || {}).ad, 'maxlength="80" autocomplete="off"')}${alan('y2unvan', 'MEB yetkilisi 2 · unvan', (y[1] || {}).unvan, 'maxlength="60"')}
    ${alan('sefAd', 'Şef · ad soyad', sef.ad, 'maxlength="80" autocomplete="off"')}${alan('sefUnvan', 'Şef · unvan', sef.unvan, 'maxlength="60" placeholder="Ör. Büro şefi"')}
    <p class="alan tam" style="font-size:13px;color:var(--soluk)">MEB yetkilisi 1, denetim dosyası ve MEB’e giden listelerde “Hazırlayan” olarak yazılır (boşsa belgeyi hazırlayan kullanıcı); şef “Kontrol eden” olarak. Kurum müdürü aşağıda, şube başına.</p>
  </div></div>
  <div class="kart" style="margin-top:16px"><div class="kart-bas"><h3>${cokSube() ? 'Şubeler' : 'Kurum'}</h3><small>MEB’e göre her şube ayrı kurumdur · MEBBİS’ten okununca yalnız boş alanlar dolar</small><div class="sag"><button type="button" class="dg dg-cizgi dg-kucuk" data-ki-meb title="MEBBİS Yardımcısı kurum bilgileri ekranını (SKT01001) yalnız okur">${ik('indir')}MEBBİS’ten oku</button></div></div><div class="kart-govde" style="display:grid;gap:14px">
    ${(S.subeler || []).map((x, i) => `<fieldset class="ki-sube"><legend>${e(x.ad || 'Şube ' + (i + 1))}</legend><div class="form-izgara">
      <div class="alan tam"><label for="ki-ma${i}">MEB’deki kurum adı</label><input id="ki-ma${i}" class="girdi" data-sube-alan="${i}:mebAd" maxlength="120" value="${e(x.mebAd || (i === 0 ? K.resmiAd || '' : ''))}" placeholder="Özel … Motorlu Taşıt Sürücüleri Kursu"></div>
      <div class="alan"><label for="ki-kk${i}">MEB kurum kodu</label><input id="ki-kk${i}" class="girdi mono" inputmode="numeric" data-sube-alan="${i}:kurumKodu" value="${e(x.kurumKodu || '')}"></div>
      <div class="alan"><label for="ki-mu${i}">Kurum müdürü</label><input id="ki-mu${i}" class="girdi" data-sube-alan="${i}:mudur" maxlength="80" value="${e(x.mudur || '')}" placeholder="${e(K.yetkili || '')}"></div>
      <div class="alan"><label for="ki-iI${i}">İl</label><select id="ki-iI${i}" class="girdi" data-sube-alan="${i}:il">${ilSecenekleri(x.il || (i === 0 ? K.sehir : ''))}</select></div>
      <div class="alan"><label for="ki-il${i}">İlçe</label><input id="ki-il${i}" class="girdi" data-sube-alan="${i}:semt" maxlength="40" value="${e(x.semt || '')}"></div>
      <div class="alan tam"><label for="ki-ad${i}">Açık adres</label><input id="ki-ad${i}" class="girdi" data-sube-alan="${i}:adres" maxlength="200" value="${e(x.adres || '')}" placeholder="${e(K.adres || 'Mahalle, cadde, no, ilçe / il')}"></div>
    </div></fieldset>`).join('') || `<p class="ipucu">${isaret('bilgi', 18)}<span>Şube kaydı yok; Ayarlar › Şubeler’den ekleyin.</span></p>`}
  </div></div>`;
}
function subelerSekme() {
  return `${ekranNotu('Her şube MEB’e göre ayrı izinli bir kurumdur: kendi kurum kodu, müdürü ve MEBBİS hesabı vardır. MEB işlemleri, sınavlar ve denetim dosyası şube seçilerek yapılır; kasa, kursiyer ve araçlar şubeye göre ayrılır.')}
  <div class="kart"><div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Şube</th><th>MEB kurum kodu</th><th>Kurs müdürü</th><th>MEBBİS hesabı</th><th title="Boşsa kursun ortak makbuz serisi">Makbuz öneki</th><th>Kursiyer</th><th>Kayıt formu</th></tr></thead><tbody>${S.subeler.map((x, i) => `<tr><td><input class="girdi" style="height:34px" data-sube-alan="${i}:ad" value="${e(x.ad)}"></td><td><input class="girdi mono" style="height:34px;width:110px" inputmode="numeric" data-sube-alan="${i}:kurumKodu" value="${e(x.kurumKodu || '')}"></td><td><input class="girdi" style="height:34px" data-sube-alan="${i}:mudur" value="${e(x.mudur || '')}"></td><td><input class="girdi" style="height:34px" data-sube-alan="${i}:mebbis" value="${e(x.mebbis || '')}"></td><td><input class="girdi mono" style="height:34px;width:90px" maxlength="6" data-sube-alan="${i}:makbuzOnek" value="${e(x.makbuzOnek || '')}" placeholder="ortak" ${subeSeriKilitli(x.id) ? 'disabled title="Bu seride makbuz verildi; önek değişmez"' : ''} aria-label="${e(x.ad)} makbuz öneki"></td><td class="mono">${S.kursiyerler.filter(k => k.sube === x.id && k.asama !== 'Ehliyet').length}</td><td><button type="button" class="dg dg-hafif dg-kucuk" data-kayit-link="${e(x.id)}" title="${e(kayitLinki(x.id))}">${ik('belge')}Kayıt formu linki</button></td></tr>`).join('')}</tbody></table></div>
  <div class="kart-govde" style="display:grid;gap:12px"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-cizgi" data-sube-ekle>${ik('arti')}Şube ekle</button><button type="button" class="dg dg-hafif" data-kayit-link="" title="${e(kayitLinki(''))}">${ik('belge')}Genel kayıt formu linki</button></div>
    <p style="font-size:13.5px;color:var(--soluk);display:flex;gap:8px;align-items:flex-start">${isaret('bilgi', 18)}<span>Kayıt formu linki, formu o şube adına açar; yeni kursiyer o şubeye yazılır. Genel linkte kursiyer seçili şubeye (yoksa ilk şubeye) yazılır. Link yalnız kurs hesabıyla açılmış cihazda açılır (ör. ofisteki tablet); öğrenciye gönderilirse giriş ekranı çıkar.</span></p></div></div>`;
}
const ROL = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici', subemudur: 'Şube müdürü', teorik: 'Teorik öğretmen', muhasebe: 'Muhasebe / mali müşavir' }, ROL_YETKI = { mudur: 'Her şeyi görür, ayarları değiştirir', sekreter: 'Kayıt, kasa, mesajlar, plan', usta: 'Kendi dersleri ve kursiyerleri', subemudur: 'Kendi şubesinde müdür yetkisi (şubeyi Kullanıcılar’da seçin)', teorik: 'Teorik dersler ve yoklama', muhasebe: 'Kasa ve faturalar, yalnız okur' };
// YON-057: aynı kişi müdür (ya da ön büro) ve usta öğretici ise tek hesap — hesap bir usta öğretici kaydına bağlanır; öğretmen ekranı kendi dersleriyle açılır
const kulUstaSec = u => oturum.kullanici && oturum.kullanici.rol === 'mudur' && ['mudur', 'sekreter'].includes(u.rol) && (S.egitmenler || []).length ? `<select class="girdi" style="height:32px;width:auto" data-kul-usta="${e(u.id || u.uid || '')}" aria-label="${e(u.ad)} usta öğretici kaydı" title="Aynı zamanda usta öğretici mi?"><option value="">Usta öğretici değil</option>${S.egitmenler.filter(x => !x.ayrildi && (x.id === u.usta || !S.kullanicilar.some(y => y.usta === x.id))).map(x => `<option value="${e(x.id)}" ${u.usta === x.id ? 'selected' : ''}>Usta: ${e(x.ad)}</option>`).join('')}</select>` : '';
// PAR-040: kullanıcıya şube (kasa) kısıtı; müdür her şubeyi görür
const kulSubeSec = u => cokSube() && u.rol !== 'mudur' && oturum.kullanici && oturum.kullanici.rol === 'mudur' ? `<select class="girdi" style="height:32px;width:auto" data-kul-sube="${e(u.id || u.uid || '')}" aria-label="${e(u.ad)} şube kısıtı"><option value="">Bütün şubeler</option>${S.subeler.map(x => `<option value="${e(x.id)}" ${u.sube === x.id ? 'selected' : ''}>Yalnız ${e(x.ad)}</option>`).join('')}</select>` : '';
// YON-018: ön büro yetkileri (müdür verir; müdürün kendisi her şeye yetkili). Ekranlar varsayılan açık, hassas işlemler varsayılan kapalı.
function yetkiKarti() {
  if (!oturum.kullanici || oturum.kullanici.rol !== 'mudur') return '';
  const y = S.kurs.yetki || {}, ek = y.ekran || {}, is = y.islem || {};
  return `<div class="kart" style="margin-top:16px"><div class="kart-bas"><h3>Ön büro yetkileri</h3><small>Ön büro rolündeki herkese uygulanır · yetkiyi yalnız müdür verir; kimse kendinde olmayan yetkiyi veremez</small></div><div class="kart-govde yt-izgara">
    <fieldset><legend>Ekranlar</legend>${YETKI_EKRAN.map(([k, t]) => { const v = ek[k] === false ? 'kapali' : ek[k] === 'gor' ? 'gor' : 'tam'; return `<label class="yt-satir"><span>${t}</span><select class="girdi" data-yetki-ekran="${k}" aria-label="${t}">${EKRAN_DUZEY.map(([d, a]) => `<option value="${d}" ${d === v ? 'selected' : ''}>${a}</option>`).join('')}</select></label>`; }).join('')}<small style="color:var(--soluk)">“Yalnız görür”: ekranı açar, kayıt ekleyemez, değiştiremez, silemez. Raporlar, Ayarlar ve Kurulum yalnız müdüre açıktır.</small></fieldset>
    <fieldset><legend>Yapabileceği hassas işlemler</legend>${YETKI_ISLEM.map(([k, t]) => `<label class="ind-tik"><input type="checkbox" data-yetki-islem="${k}" ${is[k] ? 'checked' : ''}> ${t}</label>`).join('')}<small style="color:var(--soluk)">Taksit sayısı sınırı: Ayarlar › Kurs bilgileri › En çok taksit (ön büro). Şube ve kasa kısıtı kullanıcı satırında.</small></fieldset></div></div>`;
}
function kullaniciSekme() {
  if (B.bulutta()) return bulutKullanicilar() + yetkiKarti() + ON.bilgiKarti();
  const sonGiris = u => (S.islemler.find(x => x.kim === u.ad && x.ne === 'Giriş yaptı') || {}).zaman;
  return `<div class="kart"><div class="kart-bas"><h3>Kullanıcılar</h3><small>${S.kullanicilar.length} kişi · her biri kendi PIN’iyle girer</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-kul-ekle>${ik('arti')}Kullanıcı ekle</button></div></div><ul class="liste">${S.kullanicilar.map(u => { const g = sonGiris(u), ben = oturum.kullanici && oturum.kullanici.id === u.id; return `<li>${avatar(...u.ad.split(' '))}<div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(u.ad)}${ben ? ' · siz' : ''}</b><small style="display:block;color:var(--soluk)">${ROL_YETKI[u.rol]}${u.usta && egitmen(u.usta) ? ' · ' + e(egitmen(u.usta).ad) + ' derslerini görür' : ''}${u.tel ? ' · ' + e(u.tel) : ''} · ${g ? 'son giriş ' + goreli(g.slice(0, 10)) + ' ' + g.slice(11, 16) : 'henüz girmedi'}</small></div><span class="sag" style="gap:6px">${kulSubeSec(u)}${kulUstaSec(u)}${rozet(ROL[u.rol], u.rol === 'mudur' ? 'sari' : 'notr')}<button class="dg dg-hafif dg-kucuk" data-kul-pin="${u.id}">PIN değiştir</button>${ben ? '' : `<button class="dg dg-hafif dg-kucuk" data-kul-sil="${u.id}">Kaldır</button>`}</span></li>`; }).join('')}</ul></div>` + yetkiKarti() + ON.bilgiKarti();
}
// Gerçek kurs hesabı: herkes kendi e-posta ve şifresiyle girer; çalışan davet linkiyle katılır
function bulutKullanicilar() {
  const benMudur = oturum.kullanici.rol === 'mudur', mudurSay = S.kullanicilar.filter(x => x.rol === 'mudur').length;
  return `<div class="kart"><div class="kart-bas"><h3>Kullanıcılar</h3><small>${S.kullanicilar.length} kişi · her biri kendi e-posta ve şifresiyle girer</small>${benMudur ? `<div class="sag"><button class="dg dg-ana dg-kucuk" data-davet>${ik('arti')}Çalışan davet et</button></div>` : ''}</div>
    <ul class="liste">${S.kullanicilar.map(u => { const ben = oturum.kullanici.id === u.id; return `<li>${avatar(...String(u.ad || '?').split(' '))}<div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(u.ad)}${ben ? ' · siz' : ''}</b><small style="display:block;color:var(--soluk)">${ROL_YETKI[u.rol] || ''}${u.usta && egitmen(u.usta) ? ' · ' + e(egitmen(u.usta).ad) + ' derslerini görür' : ''}${u.eposta ? ' · ' + e(u.eposta) : ''}</small></div><span class="sag" style="gap:6px">${kulSubeSec(u)}${kulUstaSec(u)}${benMudur && !ben && u.rol !== 'usta' ? `<select class="girdi" style="height:34px;width:auto" data-uye-rol="${u.id}" aria-label="Rol">${['mudur', 'sekreter', 'subemudur', 'teorik', 'muhasebe'].map(r => `<option value="${r}" ${u.rol === r ? 'selected' : ''}>${ROL[r]}</option>`).join('')}</select>` : rozet(ROL[u.rol] || u.rol, u.rol === 'mudur' ? 'sari' : 'notr')}${benMudur && !ben && !(u.rol === 'mudur' && mudurSay < 2) ? `<button class="dg dg-hafif dg-kucuk" data-uye-cikar="${u.id}">Kaldır</button>` : ''}</span></li>`; }).join('')}</ul>
    ${benMudur ? '<div data-davet-liste></div>' : ''}
    <div class="kart-govde"><p style="font-size:13px;color:var(--soluk)">Şifresini unutan kişi giriş ekranındaki “Şifremi unuttum”la e-postasına sıfırlama linki alır. Ayrılan çalışanı “Kaldır”la çıkarın; o anda erişimi kapanır.</p></div></div>`;
}
function davetListesi(k) {
  const yer = k.querySelector('[data-davet-liste]'); if (!yer) return;
  B.davetler().then(l => { yer.innerHTML = l.length ? `<div class="kart-govde" style="border-top:1px solid var(--cizgi)"><b style="color:var(--murekkep)">Bekleyen davetler</b><ul class="liste">${l.map(d => `<li><div style="flex:1;min-width:0"><b>${e(d.ad)}</b><small style="display:block;color:var(--soluk)">${ROL[d.rol] || d.rol} · link ${tarih(d.son.toISOString().slice(0, 10))} tarihine kadar geçerli</small></div><span class="sag" style="gap:6px"><button class="dg dg-hafif dg-kucuk" data-davet-kopya="${d.kod}">Linki kopyala</button><button class="dg dg-hafif dg-kucuk" data-davet-sil="${d.kod}">İptal et</button></span></li>`).join('')}</ul></div>` : ''; }).catch(() => { });
}
// PER-027: usta kartındaki 'Uygulamaya davet et' — formu o öğretmenle dolu açar (bulutta davet linki, demoda PIN'li kullanıcı)
export function ustaDavet(eg) { return B.bulutta() ? davetFormu(eg) : kullaniciFormu(eg); }
function davetFormu(on) {
  const bosUsta = S.egitmenler.filter(x => !S.kullanicilar.some(u => u.usta === x.id));
  pencere({
    baslik: 'Çalışan davet et',
    icerik: `<form class="form-izgara" id="f-davet"><div class="alan tam"><label>Ad soyad</label><input name="ad" required autocomplete="off"></div>
      <div class="alan tam"><span class="et">Rol</span><div class="secim">${Object.entries(ROL).map(([r, t], i) => `<label><input type="radio" name="rol" value="${r}" ${i === 1 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <div class="alan tam" id="davet-usta" hidden><label>Hangi öğretmen?</label><select name="usta">${bosUsta.map(x => `<option value="${x.id}">${e(x.ad)}</option>`).join('') || '<option value="">Önce Filo › Öğretmenler’den öğretmeni ekleyin</option>'}</select></div></form>
      <p style="font-size:13px;color:var(--soluk);margin-top:10px">Bir link oluşturulur; kişiye WhatsApp’tan gönderirsiniz. Link 7 gün geçerli ve tek kullanımlık. Kişi kendi e-postası ve şifresiyle hesabını açar.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-davet">Davet linki oluştur</button>`,
    onAc(d) {
      const f = d.querySelector('form'); f.addEventListener('change', () => { d.querySelector('#davet-usta').hidden = f.rol.value !== 'usta'; });
      f.ad.addEventListener('input', () => { const eg = bosUsta.find(x => x.ad.toLocaleLowerCase('tr') === f.ad.value.trim().toLocaleLowerCase('tr')); if (eg) { f.usta.value = eg.id; f.querySelector('[name=rol][value=usta]').checked = true; d.querySelector('#davet-usta').hidden = false; } });
      if (on) { f.ad.value = on.ad; f.querySelector('[name=rol][value=usta]').checked = true; d.querySelector('#davet-usta').hidden = false; if ([...f.usta.options].some(o => o.value === on.id)) f.usta.value = on.id; }
      f.addEventListener('submit', ev => {
        ev.preventDefault(); const ad = f.ad.value.trim();
        if (ad.length < 3) return bildir('Ad soyad girin', 'uyari');
        if (f.rol.value === 'usta' && !f.usta.value) return bildir('Öğretmeni seçin', 'uyari');
        const btn = d.querySelector('[form=f-davet]'); btn.disabled = true;
        B.davetOlustur({ ad, rol: f.rol.value, usta: f.rol.value === 'usta' ? f.usta.value : null }).then(r => { islem('Çalışan davet etti', ad + ' · ' + ROL[f.rol.value]); kaydet(); davetGoster(ad, r.link, f.rol.value === 'usta' ? egitmen(f.usta.value) : null, f.rol.value); }).catch(x => { btn.disabled = false; bildir(B.hataMetni(x), 'uyari'); });
      });
    },
  });
}
// Davet: öğretmenin telefonu kayıtlıysa link kursun hattından kendiliğinden gider (hat bağlı değilse WhatsApp hazır mesajla açılır)
async function davetGoster(ad, link, kisi, rol) {
  // kısa ve okunur link: servetskr.github.io/sinyal/ahmet-yilmaz-davet-x7k2 (servis yoksa uzun link kalır)
  link = await kisaLink(link, 'davet', null, undefined, { gun: 8 });
  const ilk = ad.split(' ')[0], hitap = rol === 'usta' ? `${ilk} Hoca` : ilk;
  const metin = `Merhaba ${hitap},\n\n*${S.kurs.ad}* sizi mdSinyal'e ${{ mudur: 'kurs müdürü', sekreter: 'ön büro çalışanı', usta: 'usta öğretici' }[rol] || 'çalışan'} olarak davet etti.\n\nHesabınızı oluşturmak için:\n${link}\n\nLink 7 gün geçerlidir ve yalnız size özeldir.`;
  const otomatik = !!(kisi && kisi.tel);
  if (otomatik) wpGonder(kisi, metin, 'Çalışan daveti');
  pencere({
    baslik: otomatik ? 'Davet gönderildi' : 'Davet linki hazır',
    icerik: `<p style="margin-bottom:10px">${otomatik ? `Davet linki ${e(ad)} kişisinin WhatsApp’ına gönderildi.` : `Linki ${e(ad)} kişisine gönderin.`} Açınca kendi e-postası ve şifresiyle hesabını oluşturur.</p><input class="girdi mono" readonly value="${e(link)}" data-davet-link style="width:100%">`,
    altlik: `<button class="dg dg-cizgi" data-kopya>Kopyala</button>${otomatik ? '<button class="dg dg-ana" data-kapat>Tamam</button>' : `<a class="dg dg-ana" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(metin)}">WhatsApp’tan gönder</a>`}`,
    onAc(d) { d.querySelector('[data-kopya]').addEventListener('click', () => { const i = d.querySelector('[data-davet-link]'); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).catch(() => document.execCommand('copy')).finally(() => bildir('Link kopyalandı')); }); },
  });
  yenile();
}
function kullaniciFormu(on) {
  pencere({
    baslik: 'Kullanıcı ekle',
    icerik: `<form class="form-izgara" id="f-kul"><div class="alan"><label>Ad soyad</label><input name="ad" required autocomplete="off"></div><div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" placeholder="05xx xxx xx xx"></div>
      <div class="alan tam"><span class="et">Rol</span><div class="secim">${Object.entries(ROL).map(([r, t], i) => `<label><input type="radio" name="rol" value="${r}" ${i === 1 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <div class="alan tam" id="kul-usta" hidden><label>Hangi usta öğretici?</label><select name="usta">${S.egitmenler.filter(x => !S.kullanicilar.some(u => u.usta === x.id)).map(x => `<option value="${x.id}">${e(x.ad)}</option>`).join('') || '<option value="">Tüm usta öğreticilerin kullanıcısı var</option>'}</select></div>
      <div class="alan"><label>PIN (4 hane)</label><input name="pin" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div><div class="alan"><label>PIN tekrar</label><input name="pin2" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div></form>
      <p style="font-size:13px;color:var(--soluk);margin-top:10px">PIN’i kişiye yüz yüze söyleyin; ilk girişte kendisi değiştirebilir.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-kul">Ekle</button>`,
    onAc(d) {
      const f = d.querySelector('form'); f.addEventListener('change', () => { d.querySelector('#kul-usta').hidden = f.rol.value !== 'usta'; });
      f.ad.addEventListener('input', () => { const eg = S.egitmenler.find(x => x.ad.toLocaleLowerCase('tr') === f.ad.value.trim().toLocaleLowerCase('tr')); if (eg && [...f.usta.options].some(o => o.value === eg.id)) { f.usta.value = eg.id; f.querySelector('[name=rol][value=usta]').checked = true; d.querySelector('#kul-usta').hidden = false; } });
      if (on) { f.ad.value = on.ad; f.tel.value = on.tel || ''; f.ad.dispatchEvent(new Event('input')); }
      f.addEventListener('submit', ev => {
        ev.preventDefault(); const ad = f.ad.value.trim();
        if (ad.length < 3) return bildir('Ad soyad girin', 'uyari');
        if (!/^\d{4}$/.test(f.pin.value)) return bildir('PIN 4 rakam olmalı', 'uyari');
        if (f.pin.value !== f.pin2.value) return bildir('PIN’ler aynı değil', 'uyari');
        if (/^(\d)\1{3}$|^(0123|1234|2345|3456|4567|5678|6789)$/.test(f.pin.value)) return bildir('Bu PIN çok kolay tahmin edilir; başka bir PIN seçin', 'uyari');
        if (f.rol.value === 'usta' && !f.usta.value) return bildir('Usta öğretici seçin', 'uyari');
        S.kullanicilar.push({ id: 'u' + Date.now(), ad, tel: f.tel.value.trim(), rol: f.rol.value, pin: f.pin.value, ...(f.rol.value === 'usta' ? { usta: f.usta.value } : {}) });
        islem('Kullanıcı ekledi', ad + ' · ' + ROL[f.rol.value]); kaydet(); kapatPencere(); bildir(ad + ' eklendi'); yenile();
      });
    },
  });
}
function pinDegistir(u) {
  pencere({
    baslik: 'PIN değiştir · ' + u.ad,
    icerik: `<form class="form-izgara" id="f-pin"><div class="alan"><label>Yeni PIN</label><input name="pin" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div><div class="alan"><label>Tekrar</label><input name="pin2" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-pin">Kaydet</button>`,
    onAc(d) { d.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target; if (!/^\d{4}$/.test(f.pin.value)) return bildir('PIN 4 rakam olmalı', 'uyari'); if (f.pin.value !== f.pin2.value) return bildir('PIN’ler aynı değil', 'uyari'); if (f.pin.value === u.pin) return bildir('Yeni PIN eskisiyle aynı', 'uyari'); u.pin = f.pin.value; islem('PIN değiştirdi', u.ad); kaydet(); kapatPencere(); bildir(u.ad + ' için PIN değişti'); }); },
  });
}
function sozlesmeSekme() {
  const m = S.kurs.sozlesme && S.kurs.sozlesme.length ? S.kurs.sozlesme : SOZLESME_VARSAYILAN;
  return `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Kursiyer sözleşmesi maddeleri</h3><small>${S.kurs.sozlesme ? 'Kursun metni · ' + (S.kurs.sozlesmeTarih ? tarih(S.kurs.sozlesmeTarih) : '') : 'Varsayılan metin'}</small></div><div class="kart-govde">
    <textarea data-sozlesme-metin style="min-height:420px;font-size:13.5px;line-height:1.55">${e(m.join('\n\n'))}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="dg dg-ana" data-sozlesme-kaydet>Kaydet</button><button class="dg dg-cizgi" data-belge-ac="sozlesme">Önizle</button>${S.kurs.sozlesme ? '<button class="dg dg-hafif" data-sozlesme-varsayilan>Varsayılana dön</button>' : ''}</div></div></div>
    <div class="kart"><div class="kart-bas"><h3>Nasıl yazılır</h3></div><div class="kart-govde" style="font-size:14px;display:grid;gap:10px">
      <p>Her madde ayrı paragraf; aralarında bir boş satır bırakın. İlk cümlenin başındaki kısa başlık (“Ücret ve ödeme.”) kalın yazılır.</p>
      <p>Şu alanlar her kursiyer için otomatik dolar:</p><ul style="margin-left:18px">${[['{kurs}', 'kurs adı'], ['{sinif}', 'sertifika sınıfı'], ['{teorik}', 'teorik saat'], ['{direksiyon}', 'direksiyon ders sayısı'], ['{hak}', 'sınav hakkı'], ['{tekrarE}', 'e-sınav ücreti'], ['{tekrarD}', 'direksiyon tekrar ücreti'], ['{ekDers}', 'ek ders ücreti'], ['{teorikSaatUcreti}', 'teorik ders saati ücreti'], ['{direksiyonSaatUcreti}', 'direksiyon ders saati ücreti'], ['{kdv}', 'KDV oranı']].map(([a, b]) => `<li><code>${a}</code> ${b}</li>`).join('')}</ul>
      <p style="color:var(--soluk)">Taraf bilgileri, ücret, indirim ve ödeme planı tablosu sözleşmenin başına kendiliğinden eklenir. Metni avukatınıza ya da mali müşavirinize okutun.</p></div></div></div>`;
}
export const AYAR_SEKMELERI = { kimlik: kimlikSekme, kullanici: kullaniciSekme, sozlesme: sozlesmeSekme, subeler: subelerSekme, kurallar: kurallarSekme, guvenlik: guvenlikSekme, entegrasyon: entegrasyonSekme, aktarim: aktarimSekme, gorunum: gorunumSekme };
export function ayarBaglan(k) {
  k.addEventListener('click', ev => { if (!ev.target.closest('[data-aktarim-hata]') || !aktarim.satirlar) return;
    const l = aktarim.satirlar.map((r, i) => ({ r, i, s: kontrolEt(r, i) })).filter(x => x.s.hata.length || x.s.uyari.length);
    csvIndir('mdsinyal-aktarim-hatalar.csv', [['Satır', 'Durum', 'Sebep', ...(aktarim.baslik || [])], ...l.map(x => [x.i + 2, x.s.hata.length ? 'Atlanacak' : 'Uyarı', [...x.s.hata, ...x.s.uyari].join('; '), ...x.r])]); });
  // İndirilmiş yedek dosyasından geri dönüş (müdür): önce o anın yedeği alınır, sonra dosyadaki veri yüklenir
  k.addEventListener('change', ev => {
    const inp = ev.target.closest('[data-yedek-dosya]'); if (!inp || !inp.files[0]) return;
    const f = inp.files[0]; inp.value = '';
    f.text().then(t => { let v; try { v = JSON.parse(t); } catch (x) { return bildir('Dosya okunamadı; mdSinyal’den indirilen yedek dosyasını seçin', 'uyari'); }
      if (!v || typeof v !== 'object' || !Array.isArray(v.kursiyerler) || !v.kurs) return bildir('Bu dosya bir mdSinyal yedeği değil', 'uyari');
      pencere({ baslik: 'Dosyadan geri yükle', icerik: `<p style="font-size:14.5px"><b>${e(f.name)}</b> · ${v.kursiyerler.length} kursiyer · ${(v.dersler || []).length} ders. Kursun bütün verisi bu dosyadakiyle değiştirilecek. Önce şu anki verinin yedeği alınır; gerekirse ona geri dönebilirsiniz.</p>`,
        altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Geri yükle</button>',
        onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { p.querySelector('[data-k]').disabled = true; B.dosyadanGeriYukle(v, f.name).then(() => { kapatPencere(); bildir('Yedek dosyası yüklendi'); yenile(); }).catch(x => { kapatPencere(); bildir(B.hataMetni(x), 'uyari'); }); }); } });
    });
  });
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-kurtarma-indir]')) { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([localStorage.getItem('sinyal-kurtarma') || '[]'], { type: 'application/json' })); a2.download = 'mdsinyal-kaydedilemeyenler.json'; a2.click(); setTimeout(() => URL.revokeObjectURL(a2.href), 3000); }
    if (ev.target.closest('[data-kurtarma-sil]') && confirm('Kaydedilemeyen değişiklikler bu cihazdan silinsin mi? Önce indirdiğinizden emin olun.')) { try { localStorage.removeItem('sinyal-kurtarma'); } catch (x) { } import('./bulut.js?v=234').then(B => { B.bulut.kalici = ''; B.durumYaz(); }); yenile(); }
  });
  k.addEventListener('click', ev => { const bi = ev.target.closest('[data-bi-yeni],[data-bi-duzen]'); if (bi) return ON.bilgiDuzenle(bi.dataset.biDuzen || null, yenile); const bo = ev.target.closest('[data-bi-oku]'); if (bo) { ON.bilgiGoster(ON.bilgiler().filter(x => x.id === bo.dataset.biOku)); const bekle = setInterval(() => { if (!document.querySelector('.perde')) { clearInterval(bekle); yenile(); } }, 700); } });  // YON-028
  k.addEventListener('click', ev => { if (ev.target.closest('[data-ki-meb]')) { if (cokSube() && !seciliSube()) return bildir('Önce üstten şube seçin; her şubenin bilgisi kendi MEBBİS hesabından okunur', 'uyari'); return import('./mebtoplu.js?v=234').then(m => m.topluCek(['kurum'])); } if (!ev.target.closest('[data-ki-kase-sil]')) return; delete S.kurs.kase; islem('Kaşe / imza görselini kaldırdı'); kaydet(); yenile(); });  // YON-071
  IP.ipBagla(k);  // YON-021
  davetListesi(k); yedekListesi(k); sunucuKaydi(k); if (B.bulutta()) ikiAdimSatiri(k);
  k.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('[data-uye-rol]')) { if (!oturum.kullanici || oturum.kullanici.rol !== 'mudur') { t.value = (S.kullanicilar.find(x => x.id === t.dataset.uyeRol) || {}).rol || ''; return bildir('Rolü yalnız kurs müdürü değiştirir; kimse kendinde olmayan yetkiyi veremez', 'uyari'); } const u = S.kullanicilar.find(x => x.id === t.dataset.uyeRol); B.uyeGuncelle(u.id, { rol: t.value }).then(() => { islem('Rol değiştirdi', u.ad + ' · ' + ROL[t.value]); kaydet(); bildir(u.ad + ' artık ' + ROL[t.value]); }).catch(x => { bildir(B.hataMetni(x), 'uyari'); yenile(); }); return; }
    const pf = t.closest('[data-personel-foto]'); if (pf && pf.files && pf.files[0]) { const [tur, id] = pf.dataset.personelFoto.split(':'), x = (tur === 'usta' ? S.egitmenler : S.ogretmenler || []).find(y => y.id === id); if (!x) return; personelFotoKirp(pf.files[0]).then(u => { x.foto = u; x.fotoTarih = gun(0); islem('Personel fotoğrafı ekledi', x.ad); kaydet(); bildir(x.ad + ' fotoğrafı kaydedildi'); yenile(); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); return; }
    if (t.matches('[data-kural]')) { const key = t.dataset.kural, r = KURAL_KAYNAK[key], eski = kuralDeger(key), ham = t.value.trim();
      // boş: varsayılana döner (teyit bekleyen değerde kurs değeri silinir, "Teyit bekliyor" geri gelir). Aralık dışı, eksi ya da sayı olmayan değer kaydedilmez.
      if (ham === '') { if (r.varsayilan == null) { t.value = eski ?? ''; return bildir(`${r.ad}: bir değer girin`, 'uyari'); }
        if (r.teyit) delete S.kurs[key]; else S.kurs[key] = r.varsayilan; if (S.kurs.kuralDegisen) delete S.kurs.kuralDegisen[key];
        islem('Kural değerini varsayılana döndürdü', r.ad + ': ' + eski + ' → ' + r.varsayilan); kaydet(); bildir(`${r.ad}: varsayılan değer (${r.varsayilan} ${r.birim}) kullanılacak`); return yenile(); }
      const v = +ham;
      if (!/^\d+$/.test(ham) || !kuralGecerli(key, v)) { t.value = eski ?? ''; return bildir(`${r.ad}: ${r.max != null ? `${r.min ?? 0} ile ${r.max} arasında` : `en az ${r.min ?? 0}`} bir tam sayı girin${(r.min ?? 0) === 0 && r.teyit ? ' (0 = denetim kapalı)' : ''}. Değer değişmedi.`, 'uyari'); }
      // ek ders ücreti il taban listesindeki ilave direksiyon ders saat ücretinin altındaysa onay istenir (tek kaynak: Sınıf ve ücretler)
      if (key === 'ekDersUcreti') { const tb = ekDersTabani(), L = tabanListesi(); if (tb && v < tb && !confirm(`${L ? listeAdi(L) : 'İl taban fiyat listesi'}: ilave direksiyon ders saat ücreti en az ${tl(tb)} (KDV dahil). Girilen ${tl(v)} bunun altında; il taban listesinin altında ücret alınamaz. Yine de kaydedilsin mi?`)) { t.value = eski ?? ''; return; } }
      S.kurs[key] = v; if (r.tur === 'mevzuat') { S.kurs.kuralDegisen = S.kurs.kuralDegisen || {}; if (v === r.varsayilan) delete S.kurs.kuralDegisen[key]; else S.kurs.kuralDegisen[key] = true; }
      islem('Kural değerini değiştirdi', r.ad + ': ' + eski + ' → ' + v); kaydet(); bildir('Kural kaydedildi'); yenile(); }
    if (t.matches('[data-gece-ay]')) { const ay = t.dataset.geceAy, v = t.value, ad = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'][+ay - 1], eski = (S.kurs.geceSaatleri || {})[ay] || 'hesaplanan';
      if (v && !/^\d{2}:\d{2}$/.test(v)) return bildir('Saati SS:DD biçiminde girin', 'uyari');
      S.kurs.geceSaatleri = { ...(S.kurs.geceSaatleri || {}) }; if (v) S.kurs.geceSaatleri[ay] = v; else delete S.kurs.geceSaatleri[ay];
      islem('Gece dersi başlangıç saatini değiştirdi', `${ad}: ${eski} → ${v || 'hesaplanan (gün batımı)'}`); kaydet(); bildir(v ? `${ad} gece dersi ${v}’den başlar` : `${ad} için gün batımı hesaplanacak`); yenile(); }
    if (t.matches('[data-meb-parca]')) { const ham = t.value.trim(), eski = PARCA_GECERLI(S.kurs.mebParcaDk) ? S.kurs.mebParcaDk : 30;
      if (ham === '') { delete S.kurs.mebParcaDk; islem('MEBBİS parça süresini değiştirdi', eski + ' → 30 dk (varsayılan)'); kaydet(); bildir('Parça süresi varsayılana döndü: 30 dakika'); return yenile(); }
      if (!PARCA_GECERLI(ham)) { t.value = eski; return bildir('Parça süresi 10 ile 40 dakika arasında bir tam sayı olmalı. Değer değişmedi.', 'uyari'); }
      S.kurs.mebParcaDk = +ham; islem('MEBBİS parça süresini değiştirdi', eski + ' → ' + ham + ' dk'); kaydet(); bildir(`Yardımcı işleri ${ham} dakikalık parçalara bölecek`); return; }
    if (t.matches('[data-gece-ce]')) { S.kurs.geceCE = t.checked; islem('Gece dersi ayarını değiştirdi', 'CE adayında gece dersi ' + (t.checked ? 'aranır' : 'aranmaz')); kaydet(); bildir(t.checked ? 'CE adayında da gece dersi aranacak' : 'CE adayında gece dersi aranmayacak'); yenile(); }
    if (t.matches('[data-kural-seviye]')) { if (!(oturum.kullanici && oturum.kullanici.rol === 'mudur')) return bildir('Kural seviyesini yalnız kurs müdürü değiştirir', 'uyari');   // DIG-054
      const id = t.dataset.kuralSeviye, r = KR.kurallar().find(x => x.id === id); if (!r || r.ciddiyet === 'engel') return;
      const o = { ...(S.kurs.kuralSeviye || {}) }; if (t.value) o[id] = t.value; else delete o[id]; S.kurs.kuralSeviye = o;
      islem('Kural seviyesini değiştirdi', `${r.ad}: ${t.value ? { uyari: 'uyarı', yasak: 'yasak', kapali: 'kapalı' }[t.value] : 'varsayılan'}`); kaydet(); bildir(t.value === 'kapali' ? 'Kural kapatıldı; bulguları artık görünmez' : 'Kaydedildi'); return; }
    if (t.matches('[data-kurs-kapali]')) { const ham = t.value.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean), l = [], hatali = [];   // DIG-002
      ham.forEach(x => { const m = x.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/), v = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : ''; const d = v && new Date(v + 'T00:00:00Z'); if (d && !isNaN(d) && d.toISOString().slice(0, 10) === v) { if (!l.includes(v)) l.push(v); } else hatali.push(x); });
      if (hatali.length) return bildir('Tarihi gg.aa.yyyy biçiminde girin: ' + hatali.slice(0, 3).join(', '), 'uyari');
      l.sort(); const dolu = S.dersler.filter(d => l.includes(d.tarih) && d.durum === 'Planlandı').length;
      if (l.length) S.kurs.kapaliGunler = l; else delete S.kurs.kapaliGunler; islem('Kursun kapalı günlerini değiştirdi', l.length ? l.map(x => x.split('-').reverse().join('.')).join(', ') : 'yok'); kaydet();
      bildir(l.length ? `${l.length} gün kapalı${dolu ? `; bu günlerde ${dolu} planlı ders var, planda taşıyın` : ''}` : 'Kursa özel kapalı gün yok', dolu ? 'uyari' : 'tamam'); yenile(); }
    if (t.matches('[data-idari-izin]')) { const ham = t.value.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean), l = [], hatali = [];
      ham.forEach(x => { const m = x.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/), v = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : ''; const d = v && new Date(v + 'T00:00:00Z'); if (d && !isNaN(d) && d.toISOString().slice(0, 10) === v) { if (!l.includes(v)) l.push(v); } else hatali.push(x); });
      if (hatali.length) return bildir('Tarihi gg.aa.yyyy biçiminde girin: ' + hatali.slice(0, 3).join(', '), 'uyari');
      l.sort(); if (l.length) S.kurs.idariIzin = l; else delete S.kurs.idariIzin; islem('İdari izin günlerini değiştirdi', l.length ? l.map(x => x.split('-').reverse().join('.')).join(', ') : 'yok'); kaydet(); bildir(l.length ? `${l.length} idari izin günü MEB sürelerinde sayılmayacak` : 'İdari izin günü yok'); yenile(); }
    { const ks = t.closest('[data-ki-kase]'); if (ks && ks.files && ks.files[0]) { const fr = new FileReader();  // YON-071: kaşe / imza görseli, 360 px PNG
      fr.onload = () => { const im = new Image(); im.onload = () => { const o = Math.min(1, 360 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * o); c.height = Math.round(im.height * o); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); S.kurs.kase = c.toDataURL('image/png'); islem('Kaşe / imza görselini değiştirdi'); kaydet(); bildir('Kaşe görseli kaydedildi'); yenile(); }; im.onerror = () => bildir('Resim okunamadı', 'uyari'); im.src = fr.result; }; fr.readAsDataURL(ks.files[0]); return; } }
    { const ki = t.closest('[data-kimlik]'); if (ki) { const a = ki.dataset.kimlik, v = ki.value.trim(), K = S.kurs, et = ((ki.labels || [])[0] || {}).textContent || a;  // YON-064
      if (a === 'vkn') { const d = v.replace(/\D/g, ''); if (d && !/^\d{10,11}$/.test(d)) return bildir('VKN 10, TCKN 11 hanedir', 'uyari'); S.entegrasyon = S.entegrasyon || {}; S.entegrasyon.vkn = d; ki.value = d; }
      else if (a === 'eposta') { if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return bildir('E-posta adresini kontrol edin', 'uyari'); K.eposta = v; }
      else if (/^y[12](ad|unvan)$/.test(a)) { const i = +a[1] - 1, l = [...(K.mebYetkili || [])]; while (l.length <= i) l.push({}); l[i] = { ...l[i], [a.slice(2)]: v }; K.mebYetkili = l; }
      else if (a === 'sefAd' || a === 'sefUnvan') K.sef = { ...(K.sef || {}), [a === 'sefAd' ? 'ad' : 'unvan']: v };
      else if (['unvan', 'kurucuTur', 'kurucu', 'vergiDairesi', 'mukellefKodu'].includes(a)) { if (v) K[a] = v; else delete K[a]; }
      else return;
      islem('Kurum kimliğini güncelledi', et.trim()); kaydet(); if (a === 'kurucuTur') yenile(); return bildir('Kaydedildi'); } }
    { const ye = t.closest('[data-yetki-ekran],[data-yetki-islem]'); if (ye) { if (!oturum.kullanici || oturum.kullanici.rol !== 'mudur') return; const tur = ye.dataset.yetkiEkran ? 'ekran' : 'islem', ad = ye.dataset.yetkiEkran || ye.dataset.yetkiIslem, y = { ...(S.kurs.yetki || {}) }; const deger = tur === 'ekran' ? (ye.value === 'kapali' ? false : ye.value === 'gor' ? 'gor' : true) : ye.checked; y[tur] = { ...(y[tur] || {}), [ad]: deger }; S.kurs.yetki = y; const yazi = tur === 'ekran' ? (EKRAN_DUZEY.find(x => x[0] === ye.value) || [])[1] || '' : ye.checked ? 'açık' : 'kapalı';
      const etiket = ((tur === 'ekran' ? YETKI_EKRAN : YETKI_ISLEM).find(x => x[0] === ad) || [])[1] || ad; islem('Ön büro yetkisini değiştirdi', `${etiket}: ${yazi.toLocaleLowerCase('tr')}`); kaydet(); return bildir(`Ön büro · ${etiket}: ${yazi.toLocaleLowerCase('tr')}`); } }
    { const ku = t.closest('[data-kul-usta]'); if (ku) { if (!oturum.kullanici || oturum.kullanici.rol !== 'mudur') return; const u = S.kullanicilar.find(x => String(x.id || x.uid) === ku.dataset.kulUsta); if (!u) return; const v = ku.value || null, eg = v && egitmen(v);
      const bitir = () => { if (v) u.usta = v; else delete u.usta; if (String(oturum.kullanici.id) === String(u.id)) { oturum.kullanici.usta = v; try { sessionStorage.setItem('sinyal-oturum', JSON.stringify(oturum.kullanici)); } catch (x) { } } islem('Kullanıcıyı usta öğretici kaydına bağladı', u.ad + ' · ' + (eg ? eg.ad : 'bağ kaldırıldı')); kaydet(); bildir(eg ? `${u.ad} aynı zamanda ${eg.ad} kaydıyla usta öğretici; öğretmen ekranı kendi dersleriyle açılır` : 'Usta öğretici bağı kaldırıldı'); yenile(); };
      if (B.bulutta()) return B.uyeGuncelle(u.id, { usta: v }).then(bitir).catch(x => { ku.value = u.usta || ''; bildir(/permission/i.test(String(x && (x.code || x.message))) ? 'Kendi hesabınızı bağlamak için sunucu kuralının güncellenmesi gerekiyor (mdSinyal ekibi açar)' : B.hataMetni(x), 'uyari'); });
      return bitir(); } }
    { const ku = t.closest('[data-kul-sube]'); if (ku) { const u = S.kullanicilar.find(x => (x.id || x.uid) === ku.dataset.kulSube); if (!u) return; if (ku.value) u.sube = ku.value; else delete u.sube; islem('Kullanıcının şube kısıtını değiştirdi', u.ad + ' · ' + (ku.value ? S.subeler.find(x => x.id === ku.value).ad : 'bütün şubeler')); kaydet(); return bildir(ku.value ? u.ad + ' yalnız bu şubeyi ve kasasını görür' : u.ad + ' bütün şubeleri görür'); } }
    if (t.matches('[data-sube-alan$=":makbuzOnek"]')) { const i = +t.dataset.subeAlan.split(':')[0], x = S.subeler[i], v = t.value.trim().toLocaleUpperCase('tr');  // PAR-040: şubenin makbuz serisi
      if (subeSeriKilitli(x.id)) { t.value = x.makbuzOnek || ''; return bildir('Bu şubenin serisinde makbuz verildi; önek değişmez', 'uyari'); }
      if (v && !/^[A-ZÇĞİÖŞÜ0-9-]{1,6}$/.test(v)) { t.value = x.makbuzOnek || ''; return bildir('Harf, rakam ya da tire; en çok 6', 'uyari'); }
      if (v && (v === makbuzAyar().onek || S.subeler.some((y, j) => j !== i && y.makbuzOnek === v))) { t.value = x.makbuzOnek || ''; return bildir('Bu önek kursun ya da başka şubenin serisinde kullanılıyor', 'uyari'); }
      if (v) x.makbuzOnek = v; else delete x.makbuzOnek; t.value = v; islem('Şube makbuz önekini değiştirdi', x.ad + ' · ' + (v || 'ortak seri')); kaydet(); return bildir(v ? `${x.ad}: makbuzlar ${makbuzBicim(makbuzSeri(gun(0), x.id), 1)} biçiminde` : `${x.ad}: kursun ortak serisi`); }
    if (t.matches('[data-sube-alan$=":il"]')) { const i = +t.dataset.subeAlan.split(':')[0], x = S.subeler[i]; if (t.value) x.il = t.value; else delete x.il; if (i === 0 && t.value) S.kurs.sehir = t.value;  // YON-071: ilk şubenin ili kursun ili (taban listesi, güneş saati)
      islem('Şube ilini değiştirdi', x.ad + ' · ' + (t.value || '—')); kaydet(); return bildir('İl kaydedildi'); }
    if (t.matches('[data-sube-alan]')) { const [i, alan] = t.dataset.subeAlan.split(':'); S.subeler[+i][alan] = t.value.trim(); islem('Şube bilgisini güncelledi', S.subeler[+i].ad); kaydet(); bildir('Şube bilgisi kaydedildi'); }
    if (t.matches('[data-meb-yontem]')) { if (t.value === 'arac' && !mebAracHazir()) mebAracKur(); S.kurs.mebYontem = t.value; islem('MEBBİS giriş yöntemini değiştirdi', t.value === 'arac' ? 'MEBBİS Yardımcısı' : 'Sıralı giriş'); kaydet(); bildir(t.value === 'arac' ? 'MEBBİS Yardımcısı seçildi' : 'Sıralı girişe dönüldü'); yenile(); }
    if (t.matches('[data-imza]')) { S.kurs.imzaYontemi = t.value; islem('İmza yöntemini değiştirdi', t.value); kaydet(); bildir('İmza yöntemi kaydedildi'); yenile(); }
    if (t.matches('[data-guv]')) { const [a, b] = t.dataset.guv.split('.'); if (b) S.guvenlik[a][b] = t.checked; else S.guvenlik[a] = t.checked; islem('Güvenlik ayarını değiştirdi', t.dataset.guv + ': ' + (t.checked ? 'açık' : 'kapalı')); kaydet(); bildir('Güvenlik ayarı kaydedildi'); }
    if (t.matches('[data-oturum]')) { S.guvenlik.oturumDk = +t.value; kaydet(); bildir('Oturum süresi kaydedildi'); }
    if (t.matches('[data-kdv]')) { S.entegrasyon.kdv = Math.max(0, Math.min(20, +t.value || 0)); kaydet(); bildir('KDV oranı %' + S.entegrasyon.kdv + ' olarak kaydedildi'); }
    if (t.matches('[data-fatura]')) { S.entegrasyon.fatura = t.value; kaydet(); bildir(t.value === 'kayit' ? 'Kurs ücreti kayıtta faturalanacak; taksitler alacak hesabında' : 'Her tahsilatta e-Arşiv kesilecek'); yenile(); }
    if (t.matches('[data-earsiv-alan]')) { const a = t.dataset.earsivAlan, v = t.value.trim(); if (a === 'seri') { if (!/^[A-Za-zÇĞİÖŞÜçğıöşü]{3}$/.test(v)) return bildir('Seri öneki 3 harf olmalı', 'uyari'); S.entegrasyon.earsiv.seri = v.toLocaleUpperCase('tr'); } else { if (v && !/^\d{10,11}$/.test(v)) return bildir('Vergi no 10, TC no 11 hane olmalı', 'uyari'); S.entegrasyon.vkn = v; } islem('Fatura ayarını değiştirdi', a); kaydet(); bildir('Kaydedildi'); }
    if (t.matches('[data-musavir]')) { S.entegrasyon.musavir.eposta = t.value.trim(); kaydet(); bildir('E-posta kaydedildi'); yenile(); }
    if (t.matches('[data-akt-tur]')) { aktarim.tur = t.value; aktarim.satirlar = null; aktarim.esles = {}; yenile(); }
    if (t.matches('[data-esles]')) { aktarim.esles[t.dataset.esles] = t.value; yenile(); }
    if (TC.tercihDegisti(t)) return;
    const fy = t.closest('[data-fatura-yukle]'); if (fy && fy.files[0]) { faturaNoAktar(fy.files[0]).catch(() => bildir('Dosya okunamadı; Excel ya da CSV olduğundan emin olun', 'uyari')).finally(() => { fy.value = ''; }); return; }
    const f = t.closest('[data-csv-yukle]');
    if (f && f.files[0]) {
      const dosya = f.files[0], excel = /\.xlsx?$/i.test(dosya.name);
      const isle = sat => aktarimYukle(sat);
      if (excel) excelOku(dosya).then(isle).catch(() => bildir('Excel dosyası okunamadı; CSV olarak kaydedip deneyin', 'uyari'));
      else csvMetin(dosya).then(t => isle(csvOku(t)));
    }
  });
  k.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-kimlik-kart]')) return kimlikKartlari();
    if (t.closest('[data-kul-ekle]')) return kullaniciFormu();
    if (t.closest('[data-davet]')) return davetFormu();
    if (t.closest('[data-iki-ac]')) return ikiAdimKur();
    if (t.closest('[data-iki-kapat]')) { pinSor('İki adımlı girişi kapatmak için şifrenizi girin').then(ok => ok && B.ikiAdimKapat().then(() => { islem('İki adımlı girişi kapattı'); kaydet(); bildir('İki adımlı giriş kapatıldı'); yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari'))); return; }
    if (t.closest('[data-yedek-al]')) { const b = t.closest('[data-yedek-al]'); b.disabled = true; B.yedekAl('elle').then(() => { islem('Elle yedek aldı'); kaydet(); bildir('Yedek alındı'); yedekListesi(k); }).catch(x => bildir(B.hataMetni(x), 'uyari')).finally(() => { b.disabled = false; }); return; }
    if (t.closest('[data-depolama-olc]')) { const b = t.closest('[data-depolama-olc]'); b.disabled = true; b.textContent = 'Ölçülüyor…'; return B.depolamaOlc().then(d => { bildir('Depolama: ' + mb(d.toplam)); yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari')); }
    { const yv = t.closest('[data-yedek-dogrula]'); if (yv) { const y = yedekCache.find(x => x.id === yv.dataset.yedekDogrula); if (!y) return; yv.disabled = true; yv.textContent = 'Doğrulanıyor…';
      return B.yedekDogrula(y).then(r => pencere({ baslik: 'Yedek doğrulaması · ' + tarih(y.tarih), taslak: false, icerik: `<ul class="liste">${[['Yedek açıldı', r.cozuldu ? 'Evet' : 'Hayır', r.cozuldu], ['Öğrenci / kasa kaydı', r.cozuldu ? `${r.ogrenci} / ${r.hareket} (yedek bilgisi ${y.ogrenci || 0} / ${y.hareket || 0})` : '—', r.sayiTutar !== false], ['Firebase kopyası', r.firestore ? 'okundu · ' + r.firestore.slice(0, 12) + '…' : 'okunamadı', !!r.firestore], ['Cloudflare kopyası', r.dis ? 'okundu · ' + r.dis.slice(0, 12) + '…' : 'yok', !!r.dis], ['İki kopya aynı', r.ayni == null ? '—' : r.ayni ? 'Evet (SHA-256)' : 'Hayır', r.ayni !== false]].map(([a, b, ok]) => `<li><span style="flex:1">${a}</span><b style="color:${ok ? 'var(--yesil)' : 'var(--kirmizi)'}">${e(b)}</b></li>`).join('')}</ul><p style="font-size:13px;color:var(--soluk);margin-top:8px">Kurs verisi değiştirilmedi. Sonuç işlem kaydına yazıldı.</p>`, altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' })).catch(x => bildir(B.hataMetni(x), 'uyari')).finally(() => yedekListesi(k)); } }
    const yi = t.closest('[data-yedek-indir]'); if (yi) { const y = yedekCache.find(x => x.id === yi.dataset.yedekIndir); yi.disabled = true; yi.textContent = 'Hazırlanıyor…'; B.yedekOku(y).then(v => B.yedekDosyalariCoz(v)).then(c => { B.yedekIndir(c.veri, 'mdsinyal-yedek-' + y.id + '.json'); islem('Yedek indirdi', `${y.id} · ${c.dosya} fotoğraf/evrak/imza dahil${c.bulunamayan ? ', ' + c.bulunamayan + ' dosya bulunamadı (imha edilmiş olabilir)' : ''}`); kaydet(); if (c.bulunamayan) bildir(c.bulunamayan + ' dosya bulunamadı; yedek bunlarsız indirildi', 'uyari'); }).catch(x => bildir(B.hataMetni(x), 'uyari')).finally(() => { yi.disabled = false; yi.textContent = 'İndir'; }); return; }
    const yd = t.closest('[data-yedek-don]'); if (yd) { const y = yedekCache.find(x => x.id === yd.dataset.yedekDon); return pencere({ baslik: tarih(y.tarih) + ' yedeğine dönülsün mü?', icerik: `<p>Bütün kayıtlar (öğrenciler, dersler, kasa, ayarlar) bu yedekteki hâline döner. Yedekten sonra girilen kayıtlar kaybolur.</p><p style="margin-top:8px">Dönmeden önce şimdiki hâlin de yedeği alınır; yanlışlıkla döndüyseniz o yedekle geri gelebilirsiniz.</p>`, altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Bu ana dön</button>', onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => pinSor('Yedekten geri dönmek').then(onay => { if (!onay) return; const b = d.querySelector('[data-k]'); if (b) b.disabled = true; bildir('Yedek okunuyor ve geri yükleniyor…'); B.geriYukle(y).then(() => { kapatPencere(); bildir(tarih(y.tarih) + ' yedeğine dönüldü'); yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari')); })); } }); }
    const dk = t.closest('[data-davet-kopya]'); if (dk) { const l = B.davetLinki(B.bulut.kurs, dk.dataset.davetKopya); (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => bildir('Link kopyalandı'), () => bildir(l)); return; }
    const ds = t.closest('[data-davet-sil]'); if (ds) { B.davetSil(ds.dataset.davetSil).then(() => { bildir('Davet iptal edildi'); davetListesi(k); }).catch(x => bildir(B.hataMetni(x), 'uyari')); return; }
    const uc = t.closest('[data-uye-cikar]'); if (uc) { const u = S.kullanicilar.find(x => x.id === uc.dataset.uyeCikar); return pencere({ baslik: u.ad + ' kaldırılsın mı?', icerik: '<p>Bu kişinin erişimi hemen kapanır. Yaptığı işlemler geçmişte kalır.</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaldır</button>', onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => pinSor(u.ad + ' kullanıcısını kaldırmak').then(onay => { if (!onay) return; B.uyeCikar(u.id).then(() => { islem('Kullanıcı kaldırdı', u.ad); kaydet(); kapatPencere(); bildir(u.ad + ' kaldırıldı'); }).catch(x => bildir(B.hataMetni(x), 'uyari')); })); } }); }
    const kp = t.closest('[data-kul-pin]'); if (kp) return pinDegistir(S.kullanicilar.find(u => u.id === kp.dataset.kulPin));
    const ks = t.closest('[data-kul-sil]'); if (ks) { const u = S.kullanicilar.find(x => x.id === ks.dataset.kulSil); if (u.rol === 'mudur' && S.kullanicilar.filter(x => x.rol === 'mudur').length < 2) return bildir('Son kurs müdürü kaldırılamaz', 'uyari'); return pencere({ baslik: u.ad + ' kaldırılsın mı?', icerik: '<p>Bu kişi artık giriş yapamaz. Yaptığı işlemler geçmişte kalır.</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaldır</button>', onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => pinSor(u.ad + ' kullanıcısını kaldırmak').then(onay => { if (!onay) return; S.kullanicilar = S.kullanicilar.filter(x => x !== u); islem('Kullanıcı kaldırdı', u.ad); kaydet(); bildir(u.ad + ' kaldırıldı'); yenile(); })); } }); }
    if (t.closest('[data-sozlesme-kaydet]')) { const v = k.querySelector('[data-sozlesme-metin]').value.split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean); if (v.length < 3) return bildir('Sözleşmede en az 3 madde olmalı', 'uyari'); const bilinmez = [...new Set((v.join(' ').match(/\{(\w+)\}/g) || []).filter(x => !['{kurs}', '{sinif}', '{teorik}', '{direksiyon}', '{hak}', '{tekrarE}', '{tekrarD}', '{ekDers}'].includes(x)))]; if (bilinmez.length) return bildir('Tanınmayan alan: ' + bilinmez.join(', '), 'uyari'); S.kurs.sozlesme = v; S.kurs.sozlesmeTarih = gun(0); islem('Sözleşme metnini değiştirdi', v.length + ' madde'); kaydet(); bildir('Sözleşme metni kaydedildi; yeni kayıtlar bu metinle hazırlanır'); return yenile(); }
    if (t.closest('[data-sozlesme-varsayilan]')) { S.kurs.sozlesme = null; islem('Sözleşmeyi varsayılana döndürdü'); kaydet(); bildir('Varsayılan metne dönüldü'); return yenile(); }
    const kl = t.closest('[data-kayit-link]'); if (kl) { const id = kl.dataset.kayitLink, l = kayitLinki(id), ad = id ? ((S.subeler.find(x => x.id === id) || {}).ad || 'şube') : ''; panoya(l).then(ok => ok === false ? bildir('Kopyalanamadı. Link: ' + l, 'uyari') : bildir((ad ? ad + ' kayıt formu linki' : 'Genel kayıt formu linki') + ' kopyalandı. Kurs hesabıyla açılmış cihazda açılır.')); return; }
    if (t.closest('[data-sube-ekle]')) { const n = S.subeler.length + 1; S.subeler.push({ id: 's' + Date.now(), ad: 'Yeni şube ' + n, semt: '', kurumKodu: '', mudur: '', mebbis: '' }); islem('Şube ekledi'); kaydet(); bildir('Şube eklendi; kurum kodunu ve müdürünü yazın'); yenile(); }
    { const no = t.closest('[data-netlik-oneri]'); if (no) { S.kurs.bulanikSinir = +no.dataset.netlikOneri; S.kurs.kuralDegisen = { ...(S.kurs.kuralDegisen || {}), bulanikSinir: gun(0) }; islem('Bulanıklık eşiğini önerilen değere çekti', String(S.kurs.bulanikSinir)); kaydet(); bildir('Eşik ' + S.kurs.bulanikSinir + ' oldu'); return yenile(); } }  // KAY-041
    if (t.closest('[data-kural-onay]')) { S.kurs.kuralOnay = { kim: oturum.kullanici ? oturum.kullanici.ad : '', tarih: gun(0) }; islem('Kural değerlerini onayladı'); kaydet(); bildir('Kural değerleri onaylandı'); yenile(); }
    const bo = t.closest('[data-belge-ac]'); if (bo) import('./sayfalar3.js?v=234').then(m => m.belgeAc(bo.dataset.belgeAc));
    const ok = t.closest('[data-oturum-kapat]'); if (ok) { const o = S.guvenlik.oturumlar.splice(+ok.dataset.oturumKapat, 1)[0]; islem('Oturumu kapattırdı', o.kim + ' · ' + o.cihaz); kaydet(); bildir(o.kim + ' · ' + o.cihaz + ' oturumu kapatıldı'); yenile(); }
    const fs = t.closest('[data-fis]'); if (fs) { const n = +fs.dataset.fis, d = new Date(BUGUN); d.setMonth(d.getMonth() - n); csvIndir(`muhasebe-fisleri-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}.csv`, muhasebeFisi(n)); islem('Muhasebe fişlerini indirdi'); kaydet(); }
    if (t.closest('[data-parasut]')) pencere({ baslik: 'Paraşüt · bağlantı gerekli', icerik: `<div class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 22)}<span>Paraşüt bağlantısı için kursun Paraşüt hesabından alınan API anahtarı gerekir. Anahtar girilene kadar tahsilatlar Paraşüt’e aktarılmaz.</span></div><p style="font-size:14.5px">Bu arada aylık muhasebe fişini CSV olarak indirip Paraşüt’e veya muhasebecinize yükleyebilirsiniz; fişte her tahsilat, gider ve iade ayrı satırdır.</p>`, altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-pfis>Bu ayın fişini indir</button>', onAc(d) { d.querySelector('[data-pfis]').addEventListener('click', () => { const d0 = new Date(BUGUN); csvIndir(`muhasebe-fisleri-${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}.csv`, muhasebeFisi(0)); islem('Muhasebe fişlerini indirdi'); kaydet(); kapatPencere(); }); } });
    const mp = t.closest('[data-musavir-paket]'); if (mp) { mp.disabled = true; musavirPaketi(+mp.dataset.musavirPaket).then(() => { islem('Mali müşavir paketini indirdi'); kaydet(); bildir('Müşavir paketi indirildi'); }).catch(x => bildir(x.message, 'uyari')).finally(() => { mp.disabled = false; }); }
    const mpd = t.closest('[data-musavir-pdf]'); if (mpd) { const n = +mpd.dataset.musavirPdf, d = new Date(BUGUN); d.setDate(1); d.setMonth(d.getMonth() - n); belgeYazdir(aylikOzetHtml(n), 'Aylık mali özet · ' + d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })); islem('Aylık mali özeti yazdırdı'); kaydet(); }
    if (t.closest('[data-personel-ozet]')) { csvIndir('personel-ozeti.csv', personelOzeti()); islem('Personel özetini indirdi'); kaydet(); }
    if (t.closest('[data-sablon-csv]')) csvIndir(`sinyal-${aktarim.tur}-sablonu.csv`, [TUR_ALAN().map(a => a[1]), { kursiyer: ['12345678950', 'Ali', 'Yıldız', '0532 000 00 01', '14.03.2004', 'B', '02.10.2026', '24000', '8000', 'Odunpazarı', '12', '3', 'Yok', '', '', '', ''], taksit: ['12345678950', '02.11.2026', '4000', '', 'Kart'], arac: ['26 AB 123', 'Renault Clio', '2023', 'B', '12.05.2027', '01.03.2027'] }[aktarim.tur]]);
    if (t.closest('[data-aktar-onay]')) { aktarimUygula(); yenile(); }
    if (t.closest('[data-aktarim-yeni]')) { aktarim.satirlar = null; aktarim.sonuc = null; yenile(); }
    if (t.closest('[data-aktarim-geri]')) { const id = aktarim.sonuc.id; S.kursiyerler.forEach(k => { const dv = k.odeme && k.odeme.devirAktarim; if (!dv || !dv.dusumler) return; const d = dv.dusumler.filter(x => x.id === id).reduce((a, x) => a + x.tutar, 0); if (d) { k.odeme.pesin += d; dv.tutar += d; } dv.dusumler = dv.dusumler.filter(x => x.id !== id); });   // DIG-057: devirden düşülen geri eklenir
      S.kursiyerler = S.kursiyerler.filter(x => x.aktarim !== id); S.kursiyerler.forEach(k => { k.odeme.taksitler = k.odeme.taksitler.filter(x => x.aktarim !== id); }); S.hareket = S.hareket.filter(x => x.aktarim !== id); S.araclar = S.araclar.filter(x => x.aktarim !== id); islem('Aktarımı geri aldı', aktarim.sonuc.n + ' kayıt'); kaydet(); aktarim.sonuc = null; bildir('Aktarım geri alındı'); yenile(); }
  });
}

/* ================= EVRAK DOĞRULAMA ================= */
export function evrakDogrula(k, tur) {
  const ad = { adli: 'Adli sicil kaydı', saglik: 'Sürücü sağlık raporu' }[tur];
  const v = (k.dogrulama || {})[tur];
  pencere({
    baslik: ad + ' doğrulama · ' + tamAd(k),
    icerik: `${v ? `<div class="ipucu" style="margin-bottom:12px">${isaret('tamam', 20)}<span>${e(v.kim)} ${tarih(v.tarih)} tarihinde doğruladı · ${e(v.kod)}</span></div>` : ''}${(u => u ? `<div style="margin-bottom:12px">${u}</div>` : '')(ME.tarihUyariHtml(ME.tarihUyarilari(k).filter(x => x.alan === tur)))}
      <ol style="padding-left:18px;display:grid;gap:10px;font-size:14.5px">
        <li>${tur === 'adli' ? 'Belgenin altındaki <b>barkod numarasını</b> yazın.' : 'Raporun <b>numarasını</b> ve tarihini yazın.'}<input class="girdi" style="margin-top:6px" data-kod value="${e(v ? v.kod : tur === 'adli' ? ((k.adliSicil || {}).barkod || '') : ((k.saglikRapor || {}).no || ''))}" placeholder="${tur === 'adli' ? 'Örn. 9A3F-…' : 'Rapor no'}"></li>
        <li>${tur === 'adli' ? 'e-Devlet belge doğrulamada açın; ad soyad ve TC’nin eşleştiğini görün.' : 'Raporu veren hastanenin ya da e-Devlet’teki sağlık raporu sorgulamasının sonucuyla karşılaştırın.'}<br><a class="dg dg-cizgi dg-kucuk" style="margin-top:6px" href="https://www.turkiye.gov.tr/belge-dogrulama" target="_blank" rel="noopener">e-Devlet’te aç</a></li>
        <li>Belgenin üzerindeki <b>geçerlilik (son) tarihini</b> girin; bitmesine 30 gün kala size ve kursiyere hatırlatma gider.<input class="girdi" type="date" style="margin-top:6px;max-width:200px" data-gecerlilik value="${e(v && v.gecerlilik ? v.gecerlilik : '')}"></li>
        <li>Eşleşiyorsa “Doğruladım”a basın; kim, ne zaman doğruladı kayda geçer ve denetim dosyasında görünür.</li></ol>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-dogruladim>Doğruladım</button>`,
    onAc(d) { d.querySelector('[data-dogruladim]').addEventListener('click', () => { const kod = d.querySelector('[data-kod]').value.trim(); if (!kod) return bildir('Önce belge numarasını yazın', 'uyari'); k.dogrulama = k.dogrulama || {}; k.dogrulama[tur] = { kod, kim: oturum.kullanici ? oturum.kullanici.ad : '', tarih: gun(0), gecerlilik: d.querySelector('[data-gecerlilik]').value || null }; if (tur === 'adli') k.adliSicil = { barkod: kod }; else { k.saglikRapor = k.saglikRapor || {}; k.saglikRapor.no = kod; } islem('Evrak doğruladı', tamAd(k) + ' · ' + ad); kaydet(); kapatPencere(); bildir(ad + ' doğrulandı'); yenile(); }); },
  });
}

/* ================= KURULUM ================= */
// YON-076: her adımın kimliği var; S.kurs.kurulum[id] = { kim, tarih, atlandi?, onay? } (kim yaptı, atlandı mı). Atlanan ve isteğe bağlı adım
// sayaca girmez (menü rozeti ve ilerleme). x[1] = sayılmaz (bitti, atlandı ya da isteğe bağlı); x[5] = { id, ok, atlandi, istege, kayit }.
const kurKayit = () => (S.kurs && S.kurs.kurulum) || {};
export function kurulumAdimlari() {
  const sos = S.sosyal || { kanallar: [] }, en = S.entegrasyon || { earsiv: {} }, kk = kurKayit();
  // kurum kimliği: açık adres yalnız il adıyla dolu sayılmaz (yeni kurs açılışındaki eski varsayılan); eksikler kimlikEksikleri'nde
  const kimEks = kimlikEksikleri();
  const waBagli = !!S.kurs.waApi || sos.kanallar.some(c => c.id === 'wp' && c.bagli);
  const aktarildi = !!(kk.aktarim && kk.aktarim.onay) || (S.islemler || []).some(x => x.ne === 'Kursiyer aktardı');
  const l = [
    // YON-071: kurum kimliği zorunlu (unvan, kurucu, VKN, vergi dairesi, telefon; şube başına kurum kodu, MEB adı, müdür, il, açık adres)
    ['kurs', 'Kurum kimliği', !kimEks.length, 'Siz · 5 dk', '#/ayarlar/kimlik', 'Ticari unvan, kurucu, VKN, vergi dairesi; şube başına MEB kurum kodu, MEB’deki adı, kurum müdürü, il ve açık adres. Sözleşme, makbuz, MEB formları ve MEBBİS işleri buradan beslenir.' + (kimEks.length ? ` Eksik: ${kimEks.slice(0, 4).join(', ')}${kimEks.length > 4 ? ` ve ${kimEks.length - 4} bilgi daha` : ''}.` : '')],
    ['banka', 'Banka hesapları', !!S.kurs.iban, 'Siz · 2 dk', '#/ayarlar/kurs/banka', 'Havale/EFT için IBAN’lar; her birine ad verin (ör. “Taksit ödemeleri”). Öğrenci uygulamasında ve hatırlatmalarda görünür.'],
    ['sinif', 'Sınıflar ve ücretler', !S._bulut || S.kurs.ucretOnay !== null, 'Siz · 5 dk', '#/ayarlar/sinif', 'İlinizin valilik taban fiyat listesi mdSinyal’de varsa ücretler taban fiyatla hazır gelir. Kurs ücreti, geçiş (fark) ücretleri, ek ve özel ders ücreti; e-Sınav ve uygulama sınavı ücretleri hakka göre; ' + (tabanListesi() ? 'kurs ücreti dışında kalem alınamaz (il taban listesi not 4).' : 'kitap, evrak gibi diğer kalemler.') + ' Kontrol edip onaylayın.'],
    ['ekip', 'Ekip ve araçlar', S.egitmenler.length > 0 && S.araclar.length > 0, 'Biz · aktarımla', '#/filo', 'Usta öğreticiler, belgeleri ve araçlar.'],
    ['aktarim', 'Kursiyerleri aktar', aktarildi, 'Biz · 1 gün', '#/ayarlar/aktarim', 'Eski programdan kursiyer, taksit ve ödeme geçmişi. Aktarım bitince ya da aktarılacak kayıt yoksa “Aktarım tamam” deyin; elle girilen birkaç kayıt adımı bitirmez.'],
    ['kural', 'MEB kural değerlerini onayla', !!S.kurs.kuralOnay, 'Siz · 2 dk', '#/ayarlar/kurallar', 'Değerler kaynağıyla gelir; kurs müdürü onaylar.'],
    ['asistan', 'Asistanın bildikleri', S.asistanBilgi.length >= 5, 'Biz · şablondan', '#/mesajlar/bilgi', 'Fiyat, evrak, ders saatleri. Sürücü kursu şablonundan doldurulur, siz okursunuz.'],
    ['whatsapp', 'WhatsApp hattını bağla', waBagli && !!S.kurs.waDeneme, 'Biz + siz · 30 dk', '#/ayarlar/kurs/iletisim', waBagli && !S.kurs.waDeneme ? 'Hat bağlı; bağlantı penceresinden müdürün telefonuna deneme mesajı gönderin. Mesaj gidince adım biter.' : 'Mesajların kurs numarasından otomatik gitmesi için. Bağlantıdan sonra müdüre deneme mesajı gider; gidince adım biter. Instagram ve Facebook, Meta onayından sonra eklenir.'],
    // MSJ-028: öğrencileri uygulamaya davet (durum Mesajlar'daki 'Öğrenci uygulaması' şeridiyle aynı: kullanıyor / hesap açık girmedi / hesap yok)
    ['davet', 'Öğrencileri uygulamaya davet et', (() => { const l = sb(S.kursiyerler).filter(k => !k.kapali && k.asama !== 'Ehliyet'); return !l.length || l.filter(k => k.hesap).length >= l.length / 2; })(), 'Siz · 10 dk', '#/mesajlar', 'Mesajlar › Öğrenci uygulaması › Davet gönder: hesaplar toplu açılır, giriş bilgisi WhatsApp’tan ya da yazdırılan giriş kartıyla verilir. Yarısının hesabı açılınca tamam sayılır.'],
    ['kullanici', 'Kullanıcılar ve güvenlik', (S.kullanicilar || []).length >= 2, 'Siz · 5 dk', '#/ayarlar/kullanici', 'Ön büro ve usta öğretici davetleri; hareketsiz kalınca oturumun kapanma süresi.'],
    // YON-080: kurulumun son adımı — prova günü (test öğrencisiyle bir tur, sonra tek dokunuşla silinir)
    ['prova', 'Prova günü', !!(kk.prova && kk.prova.onay), 'Siz · 1 saat', '', 'Kendi telefonunuzla bir prova öğrencisi açın: ders planlayın, tahsilat alıp makbuz yazdırın, WhatsApp mesajı gönderin, öğrenci ve öğretmen uygulamasına girin. Bitince prova verisi tek dokunuşla silinir; işlem kaydında kalır.'],
    // e-Arşiv entegratör bağlantısı henüz yok: bağlanana kadar isteğe bağlı, sayaca girmez
    ['earsiv', 'e-Arşiv fatura', !!en.earsiv.bagli, 'Biz · 1 gün', '#/ayarlar/entegrasyon', 'e-Arşiv entegratörü bilgileri (kursun kendi sözleşmesiyle). Entegratör bağlantısı hazırlanıyor; o zamana kadar faturalar mdSinyal’de hazırlanıp müşavirle kesilir.', !en.earsiv.bagli],
    // Yardımcı kurulumu kurs verisine yazılır (sürüm, tarih, bilgisayar); telefondan bakınca da tamam görünür
    ['yardimci', 'MEBBİS Yardımcısı', !!S.kurs.yardimci || mebAracHazir(), 'Biz + siz · 5 dk', '', 'MEBBİS’e girilen bilgisayarda Chrome eklentisini kurun; kayıtları kontrol edip “MEBBİS’e yaz” ile tek seferde onaylarsınız, Yardımcı kursun MEBBİS oturumunda yazar.' + (S.kurs.yardimci ? ` Kurulu: ${S.kurs.yardimci.cihaz || 'bilgisayar'} · sürüm ${S.kurs.yardimci.surum || '?'} · ${tarih(S.kurs.yardimci.tarih)}.` : '')],
    ['link', 'Kursa özel link', !S._bulut || !!S.kurs.kisaAd, 'Siz · 1 dk', '#/ayarlar/kurs/iletisim', 'mdsinyal.com/kursunuz gibi kısa bir link seçin; öğrenciler ve öğretmenler giriş sayfasına buradan ulaşır.'],
  ];
  // YON-077: önkoşul haritasındaki, yukarıdaki adımlarda olmayan bilgiler (kurum kimliği satırları 'Kurum kimliği' adımında)
  const DUZEY = { kurs: 'zorunlu', sinif: 'zorunlu', ekip: 'zorunlu', kural: 'zorunlu' };
  const ek = ONKOSUL.filter(x => !['kurumKodu', 'unvanVkn', 'adres'].includes(x.id)).map(x => [x.id, x.ad, onkosulTamam(x), x.duzey === 'istege' ? 'İsteğe bağlı' : 'Siz', x.yer, (x.not ? x.not + ' ' : '') + 'Dayanan: ' + x.ozellik.join(', ') + '.', x.duzey === 'istege', x.duzey, x.onayla]);
  const sira = [...l.filter(x => !x[6]), ...ek.filter(x => !x[6]), ...l.filter(x => x[6]), ...ek.filter(x => x[6])];
  return sira.map(([id, b, ok, kim, h, a, istege, duzey, onayla]) => { const kayit = kk[id] || null, atlandi = !ok && !!(kayit && kayit.atlandi); return [b, ok || atlandi || !!istege, kim, h, a, { id, ok, atlandi, istege: !!istege && !ok, kayit, duzey: istege ? 'istege' : duzey || DUZEY[id] || 'onerilen', onayla: !!onayla }]; });
}
// sayaca giren (isteğe bağlı olmayan) adımlar ve bitenler
const kurSayim = l => { const say = l.filter(x => !x[5].istege); return { top: say.length, biten: say.filter(x => x[5].ok).length, atlanan: say.filter(x => x[5].atlandi).length }; };
const kurIz = (id, ek) => { const u = oturum.kullanici || {}; S.kurs.kurulum = { ...kurKayit(), [id]: { kim: u.ad || '', tarih: gun(0), ...ek } }; };
export function kurulum() {
  const l = kurulumAdimlari(), { top, biten, atlanan } = kurSayim(l);
  // biten adımın ilk görüldüğü gün ve görenin adı (elle işaretlenmemişse) iz olarak yazılır
  const yeniIz = l.filter(x => x[5].ok && !x[5].kayit); if (yeniIz.length && oturum.kullanici && oturum.kullanici.rol === 'mudur') setTimeout(() => { yeniIz.forEach(x => kurIz(x[5].id, { gordu: true })); kaydet(); }, 0);
  const durum = (x) => { const m = x[5]; return m.ok ? rozet('Tamam', 'yesil') : m.atlandi ? rozet('Atlandı', 'notr') : m.istege ? rozet(m.id === 'earsiv' ? 'İsteğe bağlı · yakında' : 'İsteğe bağlı', 'notr') : rozet(m.duzey === 'zorunlu' ? 'Zorunlu' : 'Önerilen', m.duzey === 'zorunlu' ? 'kirmizi' : 'uyari'); };
  const iz = (x) => { const k = x[5].kayit; if (!k || !(x[5].ok || x[5].atlandi)) return ''; return `<small style="display:block;color:var(--soluk);font-size:12.5px">${x[5].atlandi ? 'Atlayan' : k.onay ? 'İşaretleyen' : k.gordu ? 'Tamam görüldü' : 'Yapan'}: ${e(k.kim || '—')} · ${tarih(k.tarih)}</small>`; };
  const dugme = (x, i) => { const m = x[5]; if (m.ok) return ''; if (m.atlandi) return `<button class="dg dg-hafif dg-kucuk" data-kur-geri="${m.id}">Geri al</button>`;
    const yap = m.id === 'prova' ? `<button class="dg dg-ana dg-kucuk" data-kur-prova>Başla</button>` : m.id === 'yardimci' ? `<button class="dg dg-ana dg-kucuk" data-kur-yardimci>Kur</button>` : m.istege ? `<a class="dg dg-cizgi dg-kucuk" href="${x[3]}">Ayarlara bak</a>` : `<a class="dg dg-ana dg-kucuk" href="${x[3]}" data-kurulum-adim="${i}">Yap</a>`;
    return (m.id === 'aktarim' ? `<button class="dg dg-cizgi dg-kucuk" data-kur-onay="aktarim">Aktarım tamam</button>` : m.onayla ? `<button class="dg dg-cizgi dg-kucuk" data-kur-onay="${m.id}">Tamam</button>` : '') + yap + (m.istege ? '' : `<button class="dg dg-hafif dg-kucuk" data-kur-atla="${m.id}" title="Bu adım bu kurs için gerekmiyor; sayaçtan düşer, sonra geri alınabilir">Atla</button>`); };
  return {
    baslik: 'Kurulum', alt: `${biten}/${top} adım tamam${atlanan ? ` · ${atlanan} atlandı` : ''}`,
    html: `${ekranNotu('Kurulumun çoğunu biz yaparız. Sizden istenenler kısa ve her birinin yanında yazar. Toplam süre: kurs tarafında yaklaşık 45 dakika.')}
    <div class="kart"><div class="kart-govde">${ilerleme(biten + atlanan, top, 'yesil')}<p style="margin-top:8px;font-size:14px"><b>${biten}</b> / ${top} adım tamamlandı${atlanan ? ` · ${atlanan} adım atlandı` : ''}</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${l.some(x => !x[1]) ? `<button class="dg dg-ana dg-kucuk" data-kur-devam="${l.findIndex(x => !x[1])}">Sıradaki adıma geç</button>` : ''}<button class="dg dg-cizgi dg-kucuk" data-kur-rapor>Kurulum raporu</button></div></div>
    <ul class="liste">${l.map((x, i) => `<li style="align-items:flex-start">${isaret(x[5].ok ? 'tamam' : x[5].atlandi || x[5].istege ? 'bilgi' : 'zorunlu', 26)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${i + 1}. ${x[0]}</b><small style="color:var(--metin);font-size:13.5px">${x[4]}</small>${iz(x)}</div><span class="sag" style="flex-wrap:wrap;justify-content:flex-end;gap:6px">${rozet(x[2], x[2].startsWith('Biz') ? 'mavi' : 'notr')}${durum(x)}${dugme(x, i)}</span></li>`).join('')}</ul></div>
    <details class="kart" style="margin-top:16px"><summary class="kart-bas" style="cursor:pointer"><h3>Önkoşul haritası</h3><small>Hangi özellik hangi bilgiye dayanır</small></summary><div class="tablo-kap"><table class="tablo"><thead><tr><th>Özellik</th><th>Dayandığı bilgiler</th></tr></thead><tbody>${onkosulHaritasi().map(h => `<tr><td><b>${e(h.ozellik)}</b></td><td>${h.l.map(x => `<a href="${x.yer}" class="onk-bag ${x.tamam ? 'tamam' : ''}">${isaret(x.tamam ? 'tamam' : x.duzey === 'zorunlu' ? 'zorunlu' : 'bilgi', 16)}${e(x.ad)}</a>`).join('')}</td></tr>`).join('')}</tbody></table></div></details>`,
    baglan(kap) {
      kap.addEventListener('click', ev => {
        const t = ev.target; if (!(t instanceof Element)) return;
        if (t.closest('[data-kur-yardimci]')) return EK.kurulumPenceresi();
        if (t.closest('[data-kur-prova]')) return provaPenceresi();
        if (t.closest('[data-kur-rapor]')) return kurulumRaporu();
        const b = t.closest('[data-kur-atla],[data-kur-geri],[data-kur-onay]'); if (!b) return;
        const id = b.dataset.kurAtla || b.dataset.kurGeri || b.dataset.kurOnay, ad = l.find(x => x[5].id === id); if (!ad) return;
        if (!oturum.kullanici || oturum.kullanici.rol !== 'mudur') return bildir('Kurulum adımlarını kurs müdürü işaretler', 'uyari');
        if (b.dataset.kurAtla) { kurIz(id, { atlandi: true }); islem('Kurulum adımını atladı', ad[0]); }
        else if (b.dataset.kurGeri) { const k = { ...kurKayit() }; delete k[id]; S.kurs.kurulum = k; islem('Atlanan kurulum adımını geri aldı', ad[0]); }
        else { kurIz(id, { onay: true }); islem('Kurulum adımını tamam işaretledi', ad[0]); }
        kaydet(); yenile();
      });
    },
  };
}

// YON-075: kurulum sihirbazı — karşılama penceresi (ilk girişte), ana sayfada kalıcı kart, adım ekranında şerit (app.js), bitince rapor
export const KUR_AKIS = 'sinyal-kurulum-akis';
export function kurulumDurumu() {
  const l = kurulumAdimlari(), { top, biten, atlanan } = kurSayim(l), sonraki = l.findIndex(x => !x[1]);
  return { l, top, biten, atlanan, yuzde: top ? Math.round((biten + atlanan) / top * 100) : 100, sonraki, bitti: sonraki < 0 };
}
// adımı başlat: adım ekranına gider (akış açık kalır); adresi olmayan adım (Yardımcı) kendi penceresini açar
export function kurulumBaslat(i) {
  const l = kurulumAdimlari(), x = l[i]; if (!x) return;
  if (!x[3]) return x[5].id === 'prova' ? provaPenceresi() : EK.kurulumPenceresi();
  try { sessionStorage.setItem(KUR_AKIS, String(i)); } catch (z) { }
  if (location.hash === x[3]) yenile(true); else location.hash = x[3];
}
export function kurulumAtla(id) { const ad = kurulumAdimlari().find(x => x[5].id === id); if (!ad || ad[5].ok) return; kurIz(id, { atlandi: true }); islem('Kurulum adımını atladı', ad[0]); kaydet(); }
export function kurulumKarti() {
  if (!oturum.kullanici || oturum.kullanici.rol !== 'mudur' || !S._bulut) return '';  // demoda gösterilmez
  const d = kurulumDurumu(); if (d.bitti) return '';
  const x = d.l[d.sonraki];
  return `<div class="kart kur-kart"><div class="kart-govde"><div class="kur-kart-ust"><div><small>Kurulum · %${d.yuzde}</small><b>Sıradaki: ${e(x[0])}</b><span>${d.biten} / ${d.top} adım tamam${d.atlanan ? ` · ${d.atlanan} atlandı` : ''} · ${e(x[2])}</span></div>
    <div class="kur-kart-dug"><button type="button" class="dg dg-ana" data-kur-devam="${d.sonraki}">Devam et</button><a class="dg dg-hafif" href="#/kurulum">Bütün adımlar</a></div></div>${ilerleme(d.biten + d.atlanan, d.top, 'yesil')}</div></div>`;
}
export function kurulumKarsila() {
  const d = kurulumDurumu(), u = oturum.kullanici || {};
  S.kurs.kurulumKarsilama = { tarih: gun(0), kim: u.ad || '' }; kaydet();
  pencere({ baslik: 'Hoş geldiniz', genis: true, taslak: false, icerik: `<p style="font-size:15px">${e(S.kurs.ad || 'Kursunuz')} için mdSinyal hazır. Birkaç adımda kurumu tanıtıp numaraları, ücretleri ve ekibi girelim; her adımın ekranı sırayla açılır.</p>
      <div style="margin:12px 0 6px">${ilerleme(d.biten + d.atlanan, d.top, 'yesil')}<small style="color:var(--soluk)">${d.biten} / ${d.top} adım tamam · kurs tarafında yaklaşık 45 dakika</small></div>
      <ol class="kur-liste">${d.l.filter(x => !x[5].istege).map(x => `<li class="${x[5].ok ? 'tamam' : x[5].atlandi ? 'atlandi' : ''}"><b>${e(x[0])}</b><small>${e(x[2])}</small></li>`).join('')}</ol>
      <p style="font-size:13.5px;color:var(--soluk)">Gerekmeyen adımı “Atla, sonra yap” ile geçebilirsiniz; ana sayfadaki Kurulum kartından istediğiniz an devam edersiniz. “Biz” yazan adımları mdSinyal ekibi sizinle birlikte yapar.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Sonra</button><button class="dg dg-ana" data-kur-basla>Kuruluma başla</button>`,
    onAc(p) { p.querySelector('[data-kur-basla]').addEventListener('click', () => { kapatPencere(); const n = kurulumDurumu().sonraki; if (n >= 0) kurulumBaslat(n); }); } });
}
// YON-080: prova günü — prova öğrencisi (k.prova) gerçek makbuz serisine, MEBBİS işlerine ve faturaya girmez (veri.js provaMi, eklenti mebIsleri)
const provaOgr = () => (S.kursiyerler || []).find(k => k.prova);
function provaAc() {
  if (provaOgr()) return provaOgr(); const tel = S.kurs.mudurTel; if (!tel) { bildir('Önce Ayarlar › Kurs bilgileri › Numaralar’a müdürün cep telefonunu yazın; prova mesajları oraya gider', 'uyari'); return null; }
  const eg = (S.egitmenler || []).find(x => !x.ayrildi && !x.pasif), sn = SINIFLAR.B ? 'B' : Object.keys(SINIFLAR)[0], t = gun(0);
  const k = { id: 'kprova' + Date.now(), prova: true, ad: 'Prova', soyad: 'Öğrenci', tel, tc: '', dogumTarihi: '', dogum: '', adres: '', ogrenim: '', sinif: sn, kayit: t, egitmen: eg ? eg.id : null, sube: varsayilanSube(), asama: 'Direksiyon', teorik: 0, direksiyon: 0,
    evrak: Object.fromEntries(EVRAKLAR.map(([z]) => [z, true])), mebIslendi: true, esinav: null, dsinav: null, odeme: { toplam: 1000, sozlesme: 1000, pesin: 0, pesinTarih: t, taksitler: [{ tutar: 1000, vade: t }], senetli: false },
    kaynak: 'Prova', yorum: null, notlar: [{ tarih: t, metin: 'Kurulum provası için açıldı; prova bitince silinir. MEBBİS’e, makbuz serisine ve faturaya girmez.' }], deneme: [], acil: null, kvkk: { aydinlatma: true, tarih: t } };
  S.kursiyerler.push(k); islem('Prova öğrencisi açtı', 'kurulum provası'); kaydet(); return k;
}
const provaAdimlari = k => [
  ['Direksiyon dersi planla', S.dersler.some(d => d.kursiyer === k.id), '#/plan', 'Planda prova öğrencisine bir ders koyun.'],
  ['Tahsilat al, makbuz yazdır', S.hareket.some(h => h.kursiyer === k.id && h.tur === 'Gelir'), '#/kursiyer/' + k.id, 'Öğrenci dosyası › Ödeme al; makbuz PROVA numarasıyla çıkar, gerçek seriyi bozmaz.'],
  ['WhatsApp mesajı gönder', (S.gonderimler || []).some(g => g.kid === k.id), '#/kursiyer/' + k.id, 'Dosyadaki WhatsApp düğmesiyle; mesaj sizin telefonunuza gelir.'],
  ['Öğrenci uygulamasına gir', !!k.hesapAktif, '#/kursiyer/' + k.id, 'Dosyada “Hesap aç”; gelen giriş bilgisiyle telefonunuzdan öğrenci uygulamasına girin.'],
  ['Öğretmen uygulamasında dersi başlat', S.dersler.some(d => d.kursiyer === k.id && (d.bas || d.durum === 'Yapıldı')), '#/plan', 'Öğretmen kendi telefonundan dersi başlatıp bitirir (ya da siz plandan).'],
];
export function provaPenceresi() {
  if (!oturum.kullanici || oturum.kullanici.rol !== 'mudur') return bildir('Provayı kurs müdürü yapar', 'uyari');
  const k = provaOgr();
  if (!k) return pencere({ baslik: 'Prova günü', icerik: `<p style="font-size:14.5px">Gerçek öğrenciler gelmeden önce her şeyi bir kez kendiniz deneyin. “Prova Öğrenci” adında bir test kaydı açılır; telefonu sizin cebiniz (${e(S.kurs.mudurTel || 'Ayarlar’da yazılı değil')}).</p>
      <ul class="liste" style="margin-top:8px">${provaAdimlari({ id: '-' }).map(x => `<li>${isaret('bilgi', 18)}<span>${e(x[0])}</span></li>`).join('')}</ul>
      <p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>Prova kaydı MEBBİS’e gitmez, gerçek makbuz numarası almaz, faturaya girmez. Bitince “Prova verisini sil” bütün prova kayıtlarını siler; silindiği işlem kaydında kalır.</span></p>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-prova-ac>Prova öğrencisini aç</button>',
    onAc(p) { p.querySelector('[data-prova-ac]').addEventListener('click', () => { if (provaAc()) { kapatPencere(); yenile(); setTimeout(provaPenceresi, 300); } }); } });
  const l = provaAdimlari(k), n = l.filter(x => x[1]).length;
  pencere({ baslik: 'Prova günü · ' + n + ' / ' + l.length, genis: true, icerik: `${ilerleme(n, l.length, 'yesil')}
      <ul class="liste" style="margin-top:8px">${l.map(x => `<li style="align-items:flex-start">${isaret(x[1] ? 'tamam' : 'zorunlu', 22)}<div style="flex:1;min-width:0"><b>${e(x[0])}</b><small style="display:block;color:var(--soluk)">${e(x[3])}</small></div>${x[1] ? rozet('Tamam', 'yesil') : `<a class="dg dg-cizgi dg-kucuk" href="${x[2]}" data-kapat>Git</a>`}</li>`).join('')}</ul>
      <p class="ipucu uyari" style="margin-top:10px">${isaret('uyari', 18)}<span>Prova verisi silinince prova öğrencisi, dersleri, tahsilatı, mesajları ve öğrenci hesabı gider; gerçek kayıtlara dokunulmaz.</span></p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-prova-sil style="background:var(--kirmizi);border-color:var(--kirmizi)">Prova verisini sil${n === l.length ? ' ve bitir' : ''}</button>`,
    onAc(p) { p.querySelector('[data-prova-sil]').addEventListener('click', async () => { if (!confirm('Prova öğrencisi ve bütün prova kayıtları silinsin mi? Gerçek kayıtlara dokunulmaz.')) return; const b = p.querySelector('[data-prova-sil]'); b.disabled = true; await provaSil(n, l.length); kapatPencere(); yenile(); }); } });
}
// prova öğrencisine bağlı her kayıt silinir (kursiyer / kid alanı, sınav listeleri); öğrenci hesabı varsa kapatılır, numara serbest kalır
export async function provaSil(yapilan, toplam) {
  const k = provaOgr(); if (!k) return;
  if (k.hesap && B.bulutta()) { try { await B.ogrenciHesapKapat(k); } catch (x) { } }
  const say = {};
  Object.keys(S).forEach(a => { const v = S[a]; if (!Array.isArray(v) || a === 'kursiyerler' || a === 'islemler') return; const once = v.length; S[a] = v.filter(x => !(x && typeof x === 'object' && (x.kursiyer === k.id || x.kid === k.id))); if (S[a].length !== once) say[a] = once - S[a].length; });
  (S.sinavlar || []).forEach(x => { if (Array.isArray(x.kursiyerler) && x.kursiyerler.includes(k.id)) x.kursiyerler = x.kursiyerler.filter(i => i !== k.id); });
  S.kursiyerler = S.kursiyerler.filter(x => x.id !== k.id);
  const AD = { dersler: 'ders', hareket: 'kasa hareketi', gonderimler: 'mesaj', faturalar: 'fatura', sinavlar: 'sınav kaydı', gorusmeler: 'görüşme', talepler: 'talep' };
  const ozet = Object.entries(say).map(([a, n]) => n + ' ' + (AD[a] || a)).join(', ');
  kurIz('prova', { onay: true, yapilan, toplam, ozet });
  islem('Prova verisini sildi', `${yapilan}/${toplam} adım denendi${ozet ? ' · ' + ozet : ''}`); kaydet();
  bildir('Prova verisi silindi; kurulumun prova adımı tamam', 'tamam', true);
}
// bitince (ya da Kurulum sayfasından): yapılanlar ve atlananlar; müdür WhatsApp'tan mdSinyal'e gönderir
export function kurulumRaporu(ilk) {
  const d = kurulumDurumu(), yap = d.l.filter(x => x[5].ok), atl = d.l.filter(x => x[5].atlandi), kal = d.l.filter(x => !x[1]);
  if (ilk && !S.kurs.kurulumRapor) { S.kurs.kurulumRapor = { tarih: gun(0), kim: (oturum.kullanici || {}).ad || '', yapilan: yap.length, atlanan: atl.map(x => x[5].id) }; islem('Kurulumu tamamladı', `${yap.length} adım${atl.length ? ' · ' + atl.length + ' atlandı' : ''}`); kaydet(); }
  const kayit = x => x[5].kayit ? ` · ${e(x[5].kayit.kim || '')} ${tarih(x[5].kayit.tarih)}` : '';
  const metin = `Kurulum raporu · ${S.kurs.ad || ''}\nYapılan (${yap.length}): ${yap.map(x => x[0]).join(', ') || '—'}\nAtlanan (${atl.length}): ${atl.map(x => x[0]).join(', ') || '—'}${kal.length ? `\nKalan (${kal.length}): ${kal.map(x => x[0]).join(', ')}` : ''}`;
  pencere({ baslik: d.bitti ? 'Kurulum tamamlandı' : 'Kurulum raporu', genis: true, icerik: `${d.bitti ? `<p class="ipucu" style="margin-bottom:12px">${isaret('tamam', 20)}<span>Kurulum bitti. Atlanan adımlar Kurulum sayfasında durur; istediğiniz an yaparsınız.</span></p>` : ''}
      <p><b>Yapılan (${yap.length})</b></p><ul class="liste">${yap.map(x => `<li>${isaret('tamam', 18)}<span style="flex:1">${e(x[0])}<small style="color:var(--soluk)">${kayit(x)}</small></span></li>`).join('') || '<li>—</li>'}</ul>
      ${atl.length ? `<p style="margin-top:10px"><b>Atlanan (${atl.length})</b></p><ul class="liste">${atl.map(x => `<li>${isaret('bilgi', 18)}<span style="flex:1">${e(x[0])}<small style="color:var(--soluk)">${kayit(x)}</small></span></li>`).join('')}</ul>` : ''}
      ${kal.length ? `<p style="margin-top:10px"><b>Kalan (${kal.length})</b></p><ul class="liste">${kal.map(x => `<li>${isaret('zorunlu', 18)}<span>${e(x[0])}</span></li>`).join('')}</ul>` : ''}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><a class="dg dg-wp" href="${destekWa(metin)}" target="_blank" rel="noopener">${ik('wp')}mdSinyal’e gönder</a>` });
}

/* ================= MEBBİS YARDIMCISI (isteğe bağlı Chrome eklentisi) =================
   Yardımcı kursun kendi Chrome’unda, kursun kendi MEBBİS oturumunda çalışır; şifreyi görmez, saklamaz. Kurs yetkilisi yazılacak
   kayıtları kontrol edip “MEBBİS’e yaz” ile tek seferde onaylar; Yardımcı yazar, kaydeder ve MEBBİS listesinden doğrular.
   Güvenlik kodu ve geri alınamaz işler yetkilide kalır; iş istenildiği an durdurulur, her kaydın sonucu işlem kaydına yazılır. */
export const MEB_BILGI = 'MEBBİS Yardımcısı kursun kendi MEBBİS oturumunda çalışır: MEBBİS’e kurs yetkilisi kendi şifresiyle girer, Yardımcı şifreyi görmez ve saklamaz. Yetkili yazılacak kayıtları kontrol edip “MEBBİS’e yaz” ile tek seferde onaylar; güvenlik kodu ve geri alınamaz işler yetkilide kalır. İş istenildiği an durdurulabilir; her kaydın sonucu işlem kaydına yazılır.';
export function mebKuyruk() {
  const kayit = sb(S.kursiyerler).filter(k => !k.mebIslendi && !k.prova && !eksikEvrak(k).length);
  const ders = sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && !d.meb && !(S.kursiyerler.find(k => k.id === d.kursiyer) || {}).prova);
  const gunler = [...new Set(ders.map(d => d.tarih))].sort();
  const sinav = sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && !s.mebBildirim);
  return { kayit, ders, gunler, sinav, toplam: kayit.length + gunler.length + sinav.length };
}
export const mebAracHazir = () => EK.eklenti.var;
export function mebAracKur() { EK.kurulumPenceresi(); }
export function mebCek(amac) { EK.mebbistenCek(amac); }
export function mebAktar() {
  EK.yardimciyaGonder();
  S.mebAktarimlar = [{ tarih: gun(0), saat: new Date().toTimeString().slice(0, 5), kim: oturum.kullanici ? oturum.kullanici.ad : '', ok: EK.mebIsleri().length, hata: 0 }, ...(S.mebAktarimlar || [])].slice(0, 20); kaydet();
}

/* ================= GENEL SIRALI GİRİŞ PENCERESİ (program, sınav bildirimi) ================= */
function panoya(metin) {
  try { if (navigator.clipboard) return navigator.clipboard.writeText(metin).then(() => true, () => yedek()); } catch (x) { }
  return Promise.resolve(yedek());
  function yedek() { const t = document.createElement('textarea'); t.value = metin; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { } t.remove(); return ok; }
}
// alanlar: [[grup, etiket, değer]] · bitince(): "Girdim" sonrası
export function siraliPencere(baslik, alanlar, bitince) {
  let i = 0; const bas = Date.now();
  pencere({
    baslik, icerik: `<p style="font-size:14px;margin-bottom:12px">MEBBİS’i yanda açın. Her Enter’da sıradaki değer panoya kopyalanır; MEBBİS’te ilgili alana yapıştırın.</p><div data-sira></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc(d) {
      const yer = d.querySelector('[data-sira]');
      const ciz = () => {
        const a = alanlar[i];
        yer.innerHTML = a ? `<div class="sira-bar" style="position:static;margin:0"><div class="sira-ust"><span>${i + 1}/${alanlar.length} · ${e(a[0])}</span></div><div class="sira-govde"><div style="min-width:0;flex:1"><small>${e(a[1])}</small><b class="mono">${e(a[2] || '—')}</b></div><button class="dg dg-ana" data-sk>Kopyala, sonrakine geç <kbd>Enter</kbd></button><button class="dg dg-cizgi dg-kucuk" data-sa>Atla</button></div></div>${ilerleme(i, alanlar.length, 'yesil')}`
          : `<div class="ipucu">${isaret('tamam', 22)}<span><b>Bütün değerler kopyalandı.</b> ${Math.round((Date.now() - bas) / 1000)} sn sürdü. MEBBİS’te kaydedip onaylayın.</span></div><button class="dg dg-ana" style="margin-top:12px" data-sb>MEBBİS’e girdim</button>`;
        const sk = yer.querySelector('[data-sk]'); if (sk) sk.focus();
      };
      const ileri = () => { const a = alanlar[i]; if (!a) return; panoya(a[2] || '').then(ok => { if (ok === false) bildir('Kopyalanamadı; değeri elle seçin', 'uyari'); i++; ciz(); }); };
      yer.addEventListener('click', ev => { if (ev.target.closest('[data-sk]')) ileri(); if (ev.target.closest('[data-sa]')) { i++; ciz(); } if (ev.target.closest('[data-sb]')) { kapatPencere(); bitince && bitince(); } });
      d.addEventListener('keydown', ev => { if (ev.key === 'Enter' && alanlar[i] && !ev.target.closest('[data-sk],[data-sa]')) { ev.preventDefault(); ileri(); } });
      ciz();
    },
  });
}
