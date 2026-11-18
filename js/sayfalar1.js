import { kursiyerDersleri, kayitDondurmaMi, planAyar, dersSaatleri, EGITIM_TURU, egitimTuruOf, mebEtiketleri, dersSayaci, arifeMi, ustaRengi, haftalikSinir, haftaDers, ekDersFiyat, ozelDersFiyat, uygulamaSinavUcreti, esinavUcreti, digerUcretler, odemeKodu, ibanMetni, dersSirasi, S, kaydet, gun, fark, iso, tarihOku, BUGUN, SINIFLAR, ASAMALAR, EVRAKLAR, KAYNAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, ekToplam, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle, risk, BECERI, islem, geriAlNoktasi, oturum, tcGecerli, tcMaskele, DERS_TUR_AD, ek3Sinif, ogretmen, yas, mebOnKontrol, sb, sbDers, sbSinav, kapaliGun, ustaAraci, dersAraci, yerelZaman, aktifSiniflar, satistaSiniflar, YONTEMLER, yontemAd, ayEkle, gecikenTutar, selam, kursAdi, tuketim, beklenenTuketim, mudurTel, evrakKaynak, tutarOku, taksitBol, ayniTcKayit, dersIptalIz, egitimSinifi, ekTur, aracSiniflari, kursiyerTaban, tabanListesi, ekDersTabani, ozelDersTabani, programUyarisi, varsayilanYontem, teorikVar, belgeliMi, esinavsizBelgeli, teorikSaat, TEORIK_MUAF_DERS, dersKonulariResmi } from './veri.js?v=234';
import { alanHatalari, e, saatDe, saatE, tl, sayi, ik, rozet, asamaRozet, avatar, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, sekmeler, tarih, tarihUzun, goreli, gunKisa, cubukGrafik, halka, ayAdi, isaret, yonLevhasi, olcumler, aracGorsel, ekranNotu, bugunMetni, fotoKucult, waAc, waSirali, tamTarih, pinSor, taslaklar, taslakBul, taslakSil, taslakSakla, alanlariOku, alanlariYaz, taslakZamani, pencereSor } from './ui.js?v=234';
import { yenile } from './app.js?v=234';
import { denetimEksikleri, sozlesmeImzalat, sozlesmeDondur } from './sayfalar3.js?v=234';
import { bosSaatler } from './sayfalar4.js?v=234';
import { evrakDogrula, kurulumAdimlari } from './sayfalar5.js?v=234';
import { KONULAR } from './konular.js?v=234';
import * as MZ from './mevzuat.js?v=234';
import * as HS from './hesap.js?v=234';
import * as OG from './ogrenci.js?v=234';
import * as HZ from './hazirlik.js?v=234';
import { aksamOzeti } from './zamanlayici.js?v=234';
import * as B from './bulut.js?v=234';
import * as EKL from './eklenti.js?v=234';
import { gerekliDireksiyon, esinavHakDurum, esinavUcretiIsle, direksiyonAyrinti, direksiyonHesap, asgariYasHesap, deneyimEksik, yasDenetim, yasIstisnaKapsar, YAS_ISTISNA_OKUL, YAS_ISTISNA_DURUM, yasIstisnaGecerli, yasIstisnaMetin, MEVCUT_BELGELER, eskiBelgeTarihi, DERS_KURAL_TARIH, eskiDersKurali, geceDersMi, geceKisitli, geceGerekli, geceBaslangic, sinavHakSiniri, IKINCI_HAK_GUN, kuralAyar } from './veri.js?v=234';
import * as TK from './takvim.js?v=234';
import * as GR from './gruplar.js?v=234';
import * as TY from './teorikyol.js?v=234';
import * as ME from './mebevrak.js?v=234';
import * as KR from './kurallar.js?v=234';
import * as PL from './planlayici.js?v=234';
import * as UY from './mebuyum.js?v=234';
import * as PS from './psikoteknik.js?v=234';
import * as NT from './notlar.js?v=234';
import * as GO from './gorusme.js?v=234';
import * as PK from './personel.js?v=234';
import { listeAdi, satirAdi } from './taban.js?v=234';

const aktifler = () => sb(S.kursiyerler).filter(k => k.asama !== 'Ehliyet' && !k.kapali);
// KTY md.76/3 yaş istisnası (k.yasIstisna) veri.js'te uygulanır: mebOnKontrol, yasDenetim, asgariYasHesap ve deneyimEksik istisnayı bilir.
// Kayıt formu, dosya şeridi ve MEBBİS ön kontrol kartı aynı işlevi çağırır.
// KTY md.76/3 kapsamı (kayıt formu ve MEB istisnaları penceresi): okul türü + öğrenci/mezun; sürücü yüksekokulunda yalnız mezun (eyup-sorular-cevaplar.md madde 14).
// on: ad öneki (form: yasIstisna, pencere: yi) → <on>Okul, <on>Durum. Eski kayıtta okul yoksa "Okul türünü seçin" seçili gelir.
const yasIstisnaSecim = (yi, on, cls = '') => `<select ${cls} name="${on}Okul" aria-label="Okul türü"><option value="">Okul türünü seçin</option>${Object.entries(YAS_ISTISNA_OKUL).map(([v, t]) => `<option value="${v}" ${yi && yi.okul === v ? 'selected' : ''}>${t}</option>`).join('')}</select><select ${cls} name="${on}Durum" aria-label="Öğrencisi mi, mezunu mu">${Object.keys(YAS_ISTISNA_DURUM).map(v => `<option value="${v}" ${(yi && yi.durum ? yi.durum === v : v === 'mezun') ? 'selected' : ''}>${v === 'ogrenci' ? 'Öğrencisi' : 'Mezunu'}</option>`).join('')}</select>`;
// Yüksekokulda öğrenci seçilemez: mezun seçilir ve "Öğrencisi" kapanır
const yasIstisnaSenkron = (f, on) => { const o = f[on + 'Okul'], d = f[on + 'Durum']; if (!o || !d) return; const yo = o.value === 'yuksekokul', og = d.querySelector('option[value=ogrenci]'); og.disabled = yo; if (yo && d.value === 'ogrenci') d.value = 'mezun'; };
// Formdan istisna kaydı (okul seçilmediyse null: yaş indirilmez)
const yasIstisnaOku = (f, on) => { const okul = f[on + 'Okul'].value, durum = f[on + 'Durum'].value; if (!okul) return null; const yi = { okul, durum: okul === 'yuksekokul' ? 'mezun' : durum }; yi.tur = yasIstisnaMetin(yi); return yi; };
const buAyMi = s => { const d = tarihOku(s); return d.getMonth() === BUGUN.getMonth() && d.getFullYear() === BUGUN.getFullYear(); };
// mdSinyal bu ay sizin için: gerçek kayıtlardan (giden mesajlar, hatırlatma sonrası tahsilat, otomatik dersler, WhatsApp'tan gelen evrak)
function sinyalBuAy() {
  const ayIci = z => !!z && buAyMi(String(z).slice(0, 10));
  const giden = (S.gonderimler || []).filter(m => !m.iletilecek && ayIci(m.zaman));
  const ilk = new Map();
  giden.filter(m => m.tur === 'Taksit hatırlatması').forEach(m => { const k = S.kursiyerler.find(x => tamAd(x) === m.kime), t = String(m.zaman).slice(0, 10); if (k && (!ilk.has(k.id) || ilk.get(k.id) > t)) ilk.set(k.id, t); });
  const tahsil = (S.hareket || []).filter(h => h.tur === 'Gelir' && h.kategori === 'Taksit' && ayIci(h.tarih) && ilk.has(h.kursiyer) && h.tarih >= ilk.get(h.kursiyer)).reduce((a, h) => a + (+h.tutar || 0), 0);
  const isl = (S.islemler || []).filter(x => ayIci(x.zaman));
  const ders = isl.filter(x => x.ne === 'Otomatik planla ders ekledi').reduce((a, x) => a + (parseInt(x.ayrinti) || 0), 0) + S.dersler.filter(d => d.kaynak === 'kursiyer' && ayIci(d.eklendi)).length + isl.filter(x => /dersini taşıdı|Boş saati doldurdu/.test(x.ne)).length;
  const evrak = S.kursiyerler.reduce((a, k) => a + Object.values(k.evrakYuklenen || {}).filter(y => y && ayIci(y.tarih)).length, 0);
  let r = { mesaj: giden.length, tahsil, ders, evrak };
  // örnek kurs: tanıtımda boş görünmesin
  if (!S._bulut && r.mesaj < 20) r = { mesaj: 186, tahsil: 41200, ders: 23, evrak: 17 };
  r.saat = Math.max(0, Math.round((r.mesaj * 2 + r.evrak * 4 + r.ders * 3) / 6) / 10);
  return r;
}
const gecenAyMi = s => { const d = tarihOku(s), g = new Date(BUGUN); g.setDate(1); g.setMonth(g.getMonth() - 1); return d.getMonth() === g.getMonth() && d.getFullYear() === g.getFullYear(); };
// Mesajın gideceği kişi ve numarası (kursiyer, aday, usta ya da kullanıcı)
const ROL_ETIKET = { mudur: 'MÜDÜR', sekreter: 'ÖN BÜRO', usta: 'HOCA' };
export const alici = k => {
  if (k === 'mudur') return { ad: S.kurs.yetkili || 'Kurs müdürü', tel: mudurTel(), kanal: 'WhatsApp', rol: 'MÜDÜR' };
  if (k && typeof k === 'object') return k.siniflar ? { ad: k.ad, tel: k.tel, kanal: 'WhatsApp', rol: 'HOCA' } : { ad: tamAd(k), tel: k.tel, kanal: 'WhatsApp', rol: 'ÖĞRENCİ' };
  const a = S.adaylar.find(x => x.ad === k); if (a) return { ad: a.ad, tel: a.tel, kanal: a.kanal, rol: 'ADAY' };
  const ks = S.kursiyerler.find(x => tamAd(x) === k); if (ks) return { ad: k, tel: ks.tel, kanal: 'WhatsApp', rol: 'ÖĞRENCİ' };
  const eg = S.egitmenler.find(x => x.ad === k); if (eg) return { ad: k, tel: eg.tel, kanal: 'WhatsApp', rol: 'HOCA' };
  const u = S.kullanicilar.find(x => x.ad === k); return { ad: String(k || ''), tel: (u && u.tel) || '', kanal: 'WhatsApp', rol: u ? ROL_ETIKET[u.rol] : '' };
};
// Bir olayın birden çok kişiye bildirimi (ör. ders saati değişti → öğrenci + hoca). API açıksa sessizce gider.
export function bildirimler(liste, baslik = 'Bildirimler') {
  const l = liste.filter(x => x && x.kim && x.metin && !(x.kim === 'mudur' && mudurMu() && !x.kendine)).map(x => { const a = alici(x.kim); return { ad: a.ad, tel: a.tel, rol: a.rol, metin: x.metin, tur: x.tur || baslik }; });
  waSirali(l, baslik, { sessiz: true });
}
// Elle gönderilen mesaj: WhatsApp kişinin sohbetinde hazır mesajla açılır (Instagram adayında metin kopyalanır, DM kutusu açılır).
export const mudurMu = () => !!(oturum.kullanici && oturum.kullanici.rol === 'mudur');
export const wpGonder = (k, metin, tur = 'Mesaj') => {
  const a = alici(k);
  if (a.kanal === 'Instagram') { gonderimEkle(a.ad, metin, tur + ' (Instagram, elle)'); try { navigator.clipboard.writeText(metin); } catch (x) { } window.open('https://www.instagram.com/direct/inbox/', '_blank'); return bildir('Mesaj kopyalandı; Instagram’da ' + a.ad.split(' ')[0] + ' sohbetine yapıştırıp gönderin'); }
  // waAc: true = WhatsApp açıldı, 'api' = arka planda gidiyor (sonucu kendisi bildirir), 'onizleme' = demo, false = tarayıcı pencereyi engelledi (düğmeli kutu açılır)
  const r = waAc(a.tel, metin, 'WhatsApp', a.ad, false, a.rol, tur);
  if (r === true) bildir(a.ad.split(' ')[0] + ' için WhatsApp açıldı; mesajı gönderin', 'wp');
  else if (r === 'onizleme') bildir('Demo: mesaj gönderilmedi, yalnız gösterildi');
  else if (r === false) bildir('Tarayıcı WhatsApp penceresini engelledi; kutudaki düğmeyle açın', 'uyari');
};
export const kisiListe = (l, metinFn) => l.map(k => { const a = alici(k); return { ad: a.ad, tel: a.tel, rol: a.rol, metin: metinFn(k) }; });
export const odemeBilgisi = k => S.kurs.iban ? `Havale/EFT için IBAN: ${ibanMetni()}; açıklamaya ${k ? 'ödeme kodunuzu (' + odemeKodu(k) + ') ve ' : ''}adınızı soyadınızı yazın; başkası yatırsa da kod sayesinde ödemenin size ait olduğu anlaşılır. ${kursAdi('de')} nakit ya da kartla da ödeyebilirsiniz.` : `${kursAdi('e')} uğrayıp nakit ya da kartla ödeyebilirsiniz.`;
export const yorumMetni = k => `${selam(k)} ehliyetiniz hayırlı olsun! ${kursAdi()} hakkında birkaç cümle yazarsanız çok seviniriz${S.kurs.yorumLink ? ': ' + S.kurs.yorumLink : '. Google’da “' + S.kurs.ad + '” aratıp yorum yazabilirsiniz.'}`;

/* ================= GENEL BAKIŞ ================= */
export function genel(alt) {
  const akt = aktifler();
  const bugunDers = sbDers(S.dersler).filter(d => d.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  const tahsilBu = sb(S.hareket).filter(h => h.tur === 'Gelir' && buAyMi(h.tarih)).reduce((a, h) => a + h.tutar, 0);
  const geciken = sb(S.kursiyerler).filter(k => gecikenler(k).length);
  const gecikenTutar = geciken.reduce((a, k) => a + gecikenler(k).reduce((x, t) => x + t.tutar, 0), 0);
  const yeniAday = S.adaylar.filter(a => a.asama === 'Yeni');
  const evrakEksik = sb(S.kursiyerler).filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet');
  const belgeBiten = sb(S.araclar).filter(a => !a.kapali && [a.sigorta, a.muayene].some(t => t && fark(t) < 0));   // süresi dolmuş; 30 gün içinde bitecekler kural A05'te (DIG-010)
  const haftaSinav = S.sinavlar.filter(s => fark(s.tarih) >= 0 && fark(s.tarih) <= 7);
  const asamaSay = ASAMALAR.map(a => sb(S.kursiyerler).filter(k => k.asama === a && (a !== 'Ehliyet' || (k.dsinav && fark(k.dsinav.tarih) > -30))).length);
  const ortDers = S.kurs.ekDersUcreti;
  const kz = S.kazanim;

  const devir = (S.devredilen || []).length + ((S.sosyal && S.sosyal.yorumlar.filter(y => y.durum === 'devir').length) || 0);
  const mebBekleyen = sb(S.kursiyerler).filter(k => !k.mebIslendi && !eksikEvrak(k).length).length;
  const kapanmayan = sb(S.kursiyerler).filter(k => k.asama === 'Ehliyet' && k.kapanis && !k.kapanis.arsiv);
  const hakBitti = sb(S.kursiyerler).filter(k => k.hakBitti && !k.hakBitti.cozuldu);
  const devirAday = S.adaylar.filter(a => a.devir).length;
  const sahipsiz = (S.sahipsizEvrak || []).length, onayBekleyen = sb(S.kursiyerler).filter(k => Object.keys(k.evrakYuklenen || {}).some(x => !k.evrak[x]));
  const yapilacak = [
    sahipsiz && ['uyari', `WhatsApp’tan gelen ${sahipsiz} belge kime ait?`, 'Gönderen numara bir öğrenciyle eşleşmedi; öğrenciyi ve belge türünü seçin.', '#/genel/evrak', 'Eşleştir'],
    onayBekleyen.length && ['bilgi', `${onayBekleyen.length} öğrencinin gönderdiği belge onay bekliyor`, 'Telefondan ya da WhatsApp’tan geldi; açıp kontrol edin, onaylayın.', '#/kursiyer/' + onayBekleyen[0].id, 'Aç'],
    ...denetimEksikleri().filter(x => x[0] === 'dur' && !x[1].includes('SN ')).slice(0, 2).map(x => [x[0], x[1], x[2], x[3], 'Düzelt']),
    ...sb(S.araclar).filter(a => { const t = tuketim(a); return t && t.yuksek; }).slice(0, 2).map(a => { const t = tuketim(a); return ['uyari', `${a.plaka} yakıt tüketimi yüksek`, `Son dolum ${String(t.son || t.ort).replace('.', ',')} L/100 km; aracın ortalaması ${String(t.ort).replace('.', ',')}, beklenen ~${String(beklenenTuketim(a)).replace('.', ',')}. Kaçak, lastik basıncı, sürüş ya da yanlış kayıt olabilir.`, '#/filo/masraf', 'Gör']; }),
    ...belgeBiten.map(a => ['dur', `${a.plaka} · ${a.sigorta && fark(a.sigorta) < 0 ? 'trafik sigortası' : 'muayene'} süresi doldu`, `${a.model || ''} · bu araçla ders ve sınav yapılamaz`, '#/filo', 'Gör']),
    devir && ['uyari', `${devir} kişi cevabınızı bekliyor`, 'Asistanın size devrettiği WhatsApp konuşmaları.', '#/sosyal/devir', 'Cevapla'],
    geciken.length && ['uyari', `${geciken.length} kursiyerin taksiti gecikti`, tl(gecikenTutar) + ' tahsil edilmedi.', '#/kasa/geciken', 'Hatırlat'],
    ...(() => { const l = sbDers(S.dersler).filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'itiraz' && !d.ogrenciOnay.cozuldu && fark(d.tarih) >= -30); return l.length ? [['dur', `${l.length} derse öğrenci itiraz etti`, 'Öğrenci dersin yapılmadığını ya da eksik olduğunu söylüyor; usta öğreticiyle konuşun.', '#/kursiyer/' + l[0].kursiyer, 'Gör']] : []; })(),
    hakBitti.length && ['yasak', `${hakBitti.length} kursiyerin sınav hakkı doldu`, hakBitti.some(k => k.hakBitti.tur === 'Direksiyon' && !k.ikinciHak) ? 'İkinci dört hak (60 gün içinde başvuru), yeniden kayıt ya da kayıt kapatma kararı bekliyor (MTSK md.15/4).' : 'Yeniden kayıt ya da kayıt kapatma kararı bekliyor.', '#/kursiyer/' + hakBitti[0].id, 'Karar ver'],
    // kural motorunun Bugün'e açık uyarıları (7/7 hak yanması, ikinci dört hak, 48 saat, sınav ücreti 6 iş günü, teorik 2–6 saat): kural başına tek satır
    ...KR.bugunListesi(),
    yeniAday.length && ['bilgi', `${yeniAday.length} yeni öğrenci cevap bekliyor`, devirAday ? `Asistan ${devirAday} soruyu bilemedi ve size devretti; diğerlerine ilk cevabı verdi.` : 'Asistan ilk cevabı verdi; kayıt görüşmesine çevirin.', '#/adaylar', 'Aç'],
    kapanmayan.length && ['bilgi', `${kapanmayan.length} kursiyerin dosyası kapanmadı`, 'Ehliyet sınavını geçtiler; sertifika ya da arşiv adımı bekliyor.', '#/kursiyerler/Ehliyet', 'Kapat'],
    mebBekleyen && ['zorunlu', `${mebBekleyen} kursiyer MEBBİS’e girilecek`, S.kurs.mebYontem === 'arac' ? 'Evrakları tamam; kontrol edip “MEBBİS’e yaz” ile tek seferde onaylayın.' : 'Evrakları tamam; sıralı girişle sırayla girin.', '#/meb', S.kurs.mebYontem === 'arac' ? 'Aktar' : 'Başla'],
    evrakEksik.length && ['yasak', `${evrakEksik.length} kursiyerin evrakı eksik`, 'MEB kaydı bu evraklar tamamlanınca yapılabilir.', '#/meb/evrak', 'Hatırlat'],
    ...haftaSinav.map(s => ['zorunlu', `${s.tur} · ${goreli(s.tarih)} ${s.saat}`, s.kursiyerler.length + ' kursiyer · ' + s.yer, '#/sinavlar', 'Listeyi aç']),
  ].filter(Boolean);
  const gorusme = ((S.sosyal && S.sosyal.slotlar) || []).filter(x => x.dolu && x.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  if (gorusme.length) yapilacak.splice(2, 0, ['zorunlu', `${gorusme.length} kayıt görüşmesi bugün`, gorusme.map(x => x.saat + ' ' + x.dolu).join(', '), '#/sosyal/kural', 'Gör']);
  // önce insanlar ve para (öğrenci, aday, taksit, sınav), sonra kurum işleri; araç uyarıları en sonda tek satırda toplanır
  const SIRA = [['sizi bekliyor', 1], ['kayıt görüşmesi', 1], ['cevap bekliyor', 2], ['taksiti gecikti', 3], ['itiraz', 4], ['sınav hakkı', 4], ['Sınavı ·', 5], ['e-Sınav ·', 5], ['belge', 6], ['evrakı eksik', 7], ['MEBBİS', 8], ['dosyası kapanmadı', 9]];
  const agirlik = x => x[3] === '#/filo' ? 99 : ((SIRA.find(([s]) => x[1].includes(s)) || [0, 10])[1]);
  const araclar = yapilacak.filter(x => x[3] === '#/filo');
  yapilacak.sort((a, b) => agirlik(a) - agirlik(b));
  if (araclar.length > 1) { yapilacak.splice(yapilacak.length - araclar.length, araclar.length, ['uyari', `Araçlar: ${araclar.length} uyarı`, araclar.map(x => x[1]).join(' · '), '#/filo', 'Gör']); }
  const isD = S.isDurum || (S.isDurum = {}), bugunT = gun(0), anahtar = x => x[3] + '|' + x[1];
  // MSJ-039: işe bağlı bildirim iş yapılana kadar geri gelir — kapatılan ya da ertelenen satır süresi dolunca (varsayılan 6 saat, kurs ayarı;
  // 'yarın', '3 gün') yeniden görünür; iş yapılınca koşulu kalktığı için kendiliğinden düşer. Kaçıncı kez geldiği sayılır (tek satır, sayaçlı).
  // eski kayıt (kadar alanı yok): tamam bugün, ertele tarihine kadar gizli
  const gizli = d => !d ? false : d.kadar ? Date.now() < Date.parse(d.kadar) : (d.durum === 'tamam' && d.tarih === bugunT) || (d.durum === 'ertele' && d.tarih >= bugunT);
  const gorunen = yapilacak.filter(x => !gizli(isD[anahtar(x)]));
  const benim = oturum.kullanici && oturum.kullanici.rol === 'sekreter';
  if (benim) gorunen.sort((a, b) => ((isD[anahtar(b)] || {}).durum === 'atandi') - ((isD[anahtar(a)] || {}).durum === 'atandi'));
  const bitenSay = yapilacak.length - gorunen.length;
  const ilk5 = gorunen.slice(0, 4), kalan = gorunen.slice(4);
  const isSatir = x => { const [t, b, a, h, f] = x, d = isD[anahtar(x)], key = e(anahtar(x)); return `<li>${isaret(t, 26)}<a href="${h}" style="min-width:0;flex:1"><b style="color:var(--murekkep);font-weight:700;display:block">${e(b)}${d && d.durum === 'atandi' ? ' ' + rozet(e(d.kim) + '’da', 'mor') : ''}${d && d.kez > 1 && d.durum !== 'atandi' ? ' ' + rozet(d.kez + '. kez', 'sari') : ''}</b><small style="color:var(--soluk);font-size:13px">${e(a)}</small></a><span class="is-eylem"><a class="dg ${t === 'dur' ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" href="${h}">${f}</a><button class="dg-ikon is-btn" data-is-menu="${key}" data-is-ad="${e(b)}" title="Diğer: kapat, ertele, ön büroya ver" aria-label="Diğer işlemler">${ik('menu')}</button></span></li>`; };
  const kurBitmedi = kurulumAdimlari().filter(x => !x[1]).length;

  const aracSerit = sb(S.araclar).map(a => { const d = bugunDers.filter(x => x.arac === a.id), yp = d.filter(x => x.durum === 'Yapıldı').length, simdi = d.find(x => x.durum === 'Planlandı'); return `<a class="kart arac-kart" href="#/filo" style="padding:8px">${aracGorsel(a)}<div style="padding:2px 6px 4px"><b style="display:block;font-family:var(--baslik);font-size:15.5px;color:var(--murekkep)">${e((egitmen(a.egitmen) || { ad: 'Havuz aracı' }).ad)}</b><span style="font-size:13.5px">${d.length ? `${yp}/${d.length} ders${simdi ? ' · sıradaki ' + simdi.saat : ' · bitti'}` : 'Bugün ders yok'}</span>${ilerleme(yp, Math.max(1, d.length), 'yesil')}</div></a>`; }).join('');

  const dersSatir = d => { const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac); return `<li>
      <span class="zaman">${d.saat}</span>
      <a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))}</b><small>${e(eg.ad)} · ${dersSirasi(d, k) ? dersSirasi(d, k) + '. ders / ' + gerekliDireksiyon(k) : d.durum}</small></div></a>
      <span class="sag">${ar ? plaka(ar.plaka) : ''}${d.durum === 'Planlandı' ? rozet('Sırada', 'mavi') : rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : 'kirmizi')}</span></li>`; };

  const yolDurak = `<div class="yolculuk"><div class="yolculuk-serit"></div>${ASAMALAR.map((a, i) => `<a class="durak" href="#/kursiyerler/${encodeURIComponent(a)}" style="left:${i / (ASAMALAR.length - 1) * 100}%"><b>${asamaSay[i]}</b><span>${a}</span></a>`).join('')}</div>`;

  return {
    baslik: 'Genel bakış',
    html: `
    <div class="izgara iz-21">
      <div class="kart bugun-kart"><div class="kart-bas"><h3>Bugün yapılacaklar</h3><small>${gorunen.length ? 'Önem sırasıyla' : ''}${bitenSay ? ' · ' + bitenSay + ' iş tamamlandı ya da ertelendi' : ''}</small></div>
        <ul class="liste" style="margin-top:8px">${ilk5.map(isSatir).join('') || '<li>' + bos('Her şey yolunda', 'Bugün sizi bekleyen iş yok.') + '</li>'}</ul>
        ${kalan.length ? `<details class="daha"><summary>${kalan.length} iş daha</summary><ul class="liste">${kalan.map(isSatir).join('')}</ul></details>` : ''}</div>
      ${yonLevhasi([
        ['Bugün direksiyon', bugunDers.length + ' ders', '#/plan', bugunDers.filter(d => d.durum === 'Yapıldı').length + ' tanesi bitti · ' + new Set(bugunDers.map(d => d.arac)).size + ' araç sahada'],
        ['Kursiyerler', akt.length + '', '#/kursiyerler', sb(S.kursiyerler).filter(k => buAyMi(k.kayit)).length + ' kişi bu ay kaydoldu'],
        ['Bu ay tahsilat', tl(tahsilBu), '#/kasa', 'Peşinat ve taksitler'],
        ['Geciken ödeme', `<span class="sari">${tl(gecikenTutar)}</span>`, '#/kasa/geciken', geciken.length + ' kursiyer'],
      ], S.kurs.ad + ' · ' + bugunMetni())}
    </div>
    <div class="ara-bosluk"></div>
    ${NT.notKarti() ? NT.notKarti() + '<div class="ara-bosluk"></div>' : ''}
    <div class="kart">
      <div class="kart-bas"><h3>Bugünün direksiyon dersleri</h3><small>${bugunDers.filter(d => d.durum === 'Yapıldı').length}/${bugunDers.length} tamamlandı</small><div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/plan">Planı aç</a></div></div>
      <ul class="liste" style="margin-top:8px">${bugunDers.length ? bugunDers.slice(0, 6).map(dersSatir).join('') : '<li>' + bos('Bugün direksiyon dersi yok', kapaliGun(gun(0)) ? (kapaliGun(gun(0)) === 'Pazar' ? 'Pazar günü kurs kapalı.' : 'Bugün resmî tatil; kurs kapalı.') : 'Plandan boş saatlere ders ekleyebilirsiniz.') + '</li>'}</ul>
      ${bugunDers.length > 6 ? `<div style="padding:8px 20px 16px"><a class="dg dg-hafif" href="#/plan">+${bugunDers.length - 6} ders daha → plan</a></div>` : ''}
    </div>
    ${(() => { if (!oturum.kullanici || !['mudur', 'sekreter'].includes(oturum.kullanici.rol)) return ''; const pt = PK.personelTarihleri(KR.sinavUstasi); if (!pt.yakin.length && !pt.denk.length) return '';
      // PER-028: personel çalışma izni ve sözleşme tarihleri; izin bitişine denk gelen ders, sınav ve teorik dersler
      return `<div class="ara-bosluk"></div><div class="kart"><div class="kart-bas"><h3>Personel tarihleri</h3><small>Çalışma izni ve sözleşme bitişleri · 60 gün</small><div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/filo/egitmen">Ekip</a></div></div>
        <ul class="liste" style="margin-top:8px">${pt.yakin.slice(0, 6).map(y => `<li>${isaret(y.g < 0 ? 'yasak' : y.g <= 15 ? 'uyari' : 'bilgi', 24)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(y.x.ad)} · ${y.ne} ${y.g < 0 ? 'bitti' : y.g === 0 ? 'bugün bitiyor' : y.g + ' gün sonra bitiyor'}</b><small style="color:var(--soluk)">${tarihUzun(y.t)}${y.ne === 'çalışma izni' ? ' · uzatma sözleşmesi bitişten en geç 30 gün önce MEM’e verilir' : ''}</small></div><span class="sag"><button class="dg dg-hafif dg-kucuk" data-per-kart-ana="${y.tur}:${e(y.x.id)}">Kart</button></span></li>`).join('')}
        ${pt.denk.length ? `<li style="display:block;border-top:1px solid var(--cizgi-2);padding-top:10px"><b style="color:var(--murekkep)">Denk gelenler</b><small style="display:block;color:var(--soluk)">İzin yenilendiyse MEBBİS’ten güncelleyin; yenilenmediyse başka öğretmene alın.</small></li>${pt.denk.map(d => `<li>${isaret(d.ciddi ? 'yasak' : 'uyari', 22)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(d.x.ad)}</b><small style="color:var(--metin)">${e(d.metin)}</small></div><span class="sag"><a class="dg dg-hafif dg-kucuk" href="${d.link}">Aç</a></span></li>`).join('')}` : ''}</ul></div>`; })()}
    <div class="ara-bosluk"></div>
    <!-- önem sırası: önce bugünün işleri ve dersleri; "mdSinyal sizin için" özeti onlardan sonra -->
    ${oturum.kullanici && ['mudur', 'sekreter'].includes(oturum.kullanici.rol) ? (() => { const r = sinyalBuAy(), ay = BUGUN.toLocaleDateString('tr-TR', { month: 'long' }), bos = !r.mesaj && !r.ders && !r.evrak;
      return `<section class="sinyal-ay"><div class="sinyal-ay-bas"><small>${ay[0].toLocaleUpperCase('tr') + ay.slice(1)} · <span style="text-transform:none">mdSinyal</span> sizin için</small><h3>${bos ? 'mdSinyal kursunuz için çalışmaya başladı.' : `Bu ay sizin yerinize <em>${r.mesaj} mesaj</em> gönderdi${r.saat >= 1 ? `, yaklaşık <em>${String(r.saat).replace('.', ',')} saat</em> kazandırdı` : ''}.`}</h3><p>${bos ? 'Hatırlatmalar ve otomatik planlar gittikçe burada ne kazandırdığını göreceksiniz.' : 'Hatırlatmalar, planlar ve evrak takibi siz uğraşmadan yürüdü.'}</p></div>
        <div class="sinyal-ay-sayilar"><div><b>${r.mesaj}</b><span>otomatik mesaj</span></div><div><b>${tl(r.tahsil)}</b><span>hatırlatma sonrası tahsilat</span></div><div><b>${r.ders}</b><span>kendiliğinden planlanan ders</span></div><div><b>${r.evrak}</b><span>WhatsApp'tan gelen evrak</span></div></div></section>`; })() : ''}
    <div class="ara-bosluk"></div>
    ${oturum.kullanici && oturum.kullanici.rol === 'mudur' ? `<div class="kart" style="margin-bottom:16px"><div class="kart-govde" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${isaret('bilgi', 26)}<div style="flex:1;min-width:220px"><b style="color:var(--murekkep)">Akşam özeti</b><p style="font-size:14px">Her akşam 19:00’da günün özeti telefonunuza WhatsApp’tan gelir: tahsilat, dersler, yeni kayıtlar, sizi bekleyenler.</p></div><span class="anahtar"><input type="checkbox" data-aksam ${(S.otomasyonlar.find(o => o.id === 'o12') || {}).acik ? 'checked' : ''} aria-label="Akşam özeti"><i></i></span><button class="dg dg-cizgi dg-kucuk" data-aksam-onizle>Önizle</button></div></div>` : ''}
    <details class="detay-blok"><summary>Diğer göstergeler: araçlar, bu ayın kazancı, kursiyer aşamaları</summary>
    <div class="ara-bosluk"></div>
    <div class="arac-izgara">${aracSerit}</div>
    <div class="ara-bosluk"></div>
    <div class="kart" style="display:flex;flex-direction:column">
        <div class="kart-bas"><h3>mdSinyal bu ay ne kazandırdı?</h3></div>
        <ul class="liste" style="margin-top:6px;flex:1">
          <li>${isaret('tamam', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.doldurulan} boş saat dolduruldu</b><small style="color:var(--soluk)">İptal edilen dersler bekleme listesine teklif edildi · ders başı ${tl(ortDers)}</small></div><b class="sayi" style="color:var(--yesil);font-size:16px">+${tl(kz.doldurulan * ortDers)}</b></li>
          <li>${isaret('tamam', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.ekDers} ek ders satıldı</b><small style="color:var(--soluk)">Kalma riski olan kursiyerlere önerildi · ders başı ${tl(ortDers)}</small></div><b class="sayi" style="color:var(--yesil);font-size:16px">+${tl(kz.ekDers * ortDers)}</b></li>
          <li>${isaret('bilgi', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.yorum} yeni Google yorumu</b><small style="color:var(--soluk)">Ehliyet alanlara otomatik istendi</small></div><b class="sayi" style="color:var(--murekkep);font-size:16px">${S.kurs.puan != null ? S.kurs.puan.toLocaleString('tr-TR') + ' ★' : ''}</b></li>
        </ul>
    </div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Kursiyerler hangi aşamada?</h3><small>Bir aşamaya dokunun, o kursiyerler açılsın</small></div><div class="kart-govde"><div class="yolculuk-kap">${yolDurak}</div></div></div>
    </details>`,
    baglan(k) {
      NT.notBaglan(k, yenile); setTimeout(NT.alarmlariGoster, 1500);   // DIG-011: kişisel not defteri ve alarmlar
      if (alt === 'evrak') { history.replaceState(null, '', '#/genel'); import('./evrak.js?v=234').then(m => m.sahipsizPencere(yenile)); }
      k.addEventListener('click', ev => { const pk = ev.target.closest('[data-per-kart-ana]'); if (pk) { const [tur, id] = pk.dataset.perKartAna.split(':'); PK.personelKarti(tur, id, 'genel'); } });
      const onburo = () => ((S.kullanicilar || []).find(u => u.rol === 'sekreter') || {}).ad || 'Ön büro';
      // MSJ-039: kapat/ertele süreli; süre dolunca iş hâlâ duruyorsa yeniden gelir ve sayaç artar
      const isIsle = b => { const key = b.dataset.key, is = b.dataset.is, eski = S.isDurum[key] || {}, saat = kuralAyar('bildirimTekrarSaat');
        const kadar = is === 'tamam' || is === 'e6' ? new Date(Date.now() + saat * 3600e3).toISOString() : is === 'yarin' ? gun(1) + 'T08:00:00' : is === 'e3' ? gun(3) + 'T08:00:00' : null;
        const ad = { tamam: `Kapatıldı; iş duruyorsa ${saat} saat sonra yeniden gelir`, e6: `${saat} saat ertelendi`, yarin: 'Yarına ertelendi', e3: '3 gün ertelendi', ata: 'Ön büroya verildi' }[is];
        S.isDurum[key] = is === 'ata' ? { durum: 'atandi', tarih: gun(0), kim: onburo(), kez: eski.kez || 1 } : { durum: is === 'tamam' ? 'tamam' : 'ertele', tarih: gun(0), kadar: kadar && (kadar.length > 19 ? kadar : new Date(kadar).toISOString()), kez: (eski.kez || 1) + 1, ilk: eski.ilk || gun(0) };
        islem('Görev: ' + ad, key.split('|')[1]); kaydet(); bildir(ad); yenile(); };
      k.addEventListener('click', ev => {
        const im = ev.target.closest('[data-is-menu]');
        if (im) { ev.preventDefault(); const key = im.dataset.isMenu; return pencere({ baslik: im.dataset.isAd, icerik: `<div class="eg-menu">${[['tamam', 'tik', 'Kapat', `İş yapıldıysa kendiliğinden düşer; yapılmadıysa ${kuralAyar('bildirimTekrarSaat')} saat sonra yeniden gelir`], ['e6', 'saat', `${kuralAyar('bildirimTekrarSaat')} saat ertele`, 'Süre dolunca yeniden çıkar'], ['yarin', 'saat', 'Yarına ertele', 'Yarın sabah yeniden çıkar'], ['e3', 'takvim', '3 gün ertele', 'Üç gün sonra sabah yeniden çıkar'], ...(benim ? [] : [['ata', 'kursiyer', 'Ön büroya ver', 'Ön büronun listesinde en üstte görünür']])].map(([d, i, t, a]) => `<button class="eg-menu-sat" data-is="${d}" data-key="${e(key)}">${ik(i)}<span><b>${t}</b><small>${a}</small></span></button>`).join('')}</div>`, onAc(p) { p.addEventListener('click', ev2 => { const b2 = ev2.target.closest('[data-is]'); if (b2) { kapatPencere(); isIsle(b2); } }); } }); }
        const b = ev.target.closest('[data-is]');
        if (b) { ev.preventDefault(); return isIsle(b); }
        if (ev.target.closest('[data-aksam-onizle]')) {
          const metin = aksamOzeti();
          pencere({ baslik: 'Akşam özeti · önizleme', icerik: `<div class="balon giden" style="max-width:100%;white-space:pre-line">${e(metin)}</div><p style="font-size:13px;color:var(--soluk);margin-top:10px">Kurs müdürünün telefonuna her akşam 19:00’da bu biçimde gelir.</p>` });
        }
      });
      k.addEventListener('change', ev => { if (ev.target.matches('[data-aksam]')) { S.kurs.aksamOzet = ev.target.checked; const o12 = S.otomasyonlar.find(o => o.id === 'o12'); if (o12) o12.acik = ev.target.checked; kaydet(); bildir(ev.target.checked ? 'Akşam özeti her gün 19:00’da gelecek' : 'Akşam özeti kapatıldı'); } });
    },
  };
}

/* ================= ADAYLAR ================= */
const ADAY_ASAMA = [['Yeni', '#0a5bb0'], ['Bilgi verildi', '#b96206'], ['Görüşme', '#6744b8'], ['Kayıt', '#11804b'], ['Kaybedildi', '#868d97']];
export function adaylar(id) {
  const bu = S.adaylar.filter(a => fark(a.tarih) >= -7);
  const kayit = S.adaylar.filter(a => a.asama === 'Kayıt').length;
  const kapanan = S.adaylar.filter(a => ['Kayıt', 'Kaybedildi'].includes(a.asama)).length;
  const kaynak = KAYNAKLAR.map(k => [k, S.adaylar.filter(a => a.kaynak === k).length]).filter(x => x[1]);
  const kart = a => `<div class="aday-kart" data-aday="${a.id}" tabindex="0" role="button" aria-label="${e(a.ad)}">
      <div class="ust-satir">${avatar(...a.ad.split(' '))}<b>${e(a.ad)}</b><span class="kanal">${ik(a.kanal === 'Instagram' ? 'ig' : 'wp')}</span></div>
      <p>${e(a.mesajlar[a.mesajlar.length - 1].metin)}</p>
      <div class="alt-satir">${rozet(SINIFLAR[a.sinif].ad.split(' ·')[0] + ' sınıfı')}<span>${ik('harita').replace('class="ik ', 'style="width:13px;height:13px" class="ik ')} ${e(a.kaynak)}</span><span style="margin-left:auto">${goreli(a.tarih)} ${a.saat}</span></div>
      ${a.takip ? `<div class="alt-satir" style="color:${fark(a.takip) <= 0 ? 'var(--kirmizi)' : 'var(--levha)'}">${ik('saat')} Takip: ${goreli(a.takip)}</div>` : ''}
      ${a.devir ? `<div class="alt-satir" style="color:var(--kirmizi);font-weight:700">${ik('uyari')} Asistan bilemedi · cevap sizde</div>` : ''}
      ${adayGorusme(a) ? `<div class="alt-satir" style="color:var(--levha);font-weight:700">${ik('takvim')} Görüşme ${goreli(adayGorusme(a).tarih)} ${adayGorusme(a).saat}</div>` : ''}
      ${a.not ? `<div class="alt-satir">${e(a.not)}</div>` : ''}
    </div>`;
  return {
    baslik: 'Yeni öğrenciler', alt: 'WhatsApp, Instagram ve Google Haritalar’dan gelen ön kayıtlar',
    html: `${ekranNotu('Kursu soran herkes burada. Asistan ilk cevabı verir; siz kartı açıp kayda çevirirsiniz.')}
    <div class="izgara iz-4">
      <div class="kart gosterge"><small>Son 7 günde gelen</small><b>${bu.length}</b><span>${bu.filter(a => fark(a.tarih) === 0).length} tanesi bugün</span></div>
      <div class="kart gosterge"><small>Kayda dönüşen</small><b>%${Math.round(kayit / Math.max(1, kapanan) * 100)}</b><span>${kayit} kayıt / ${kapanan} sonuçlanan</span></div>
      <div class="kart gosterge"><small>İlk cevap süresi</small><b>Anında</b><span>Asistan 7/24 cevaplıyor · gece gelen ${S.adaylar.filter(a => a.saat > '21:00' || a.saat < '08:30').length} mesaj</span></div>
      <div class="kart gosterge"><small>En çok aday getiren</small><b style="font-size:22px">${kaynak.length ? e(kaynak.sort((a, b) => b[1] - a[1])[0][0]) : '—'}</b><span>${kaynak.map(([k, n]) => k + ' ' + n).join(' · ')}</span></div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="bolum-bas"><div><h2>Aday panosu</h2><p>Kartı açıp konuşmayı görün, aşamasını değiştirin ya da kursiyere çevirin.</p></div><div class="sag"><button class="dg dg-ana" data-yeni-aday>${ik('arti')}Aday ekle</button></div></div>
    <div class="pano">${ADAY_ASAMA.map(([a, renk]) => { const l = S.adaylar.filter(x => x.asama === a); return `<section class="pano-sutun" aria-label="${a}"><h3><i style="background:${renk}"></i>${a}<b>${l.length}</b></h3>${l.map(kart).join('') || '<p style="font-size:12.5px;color:var(--soluk);padding:6px">Bu aşamada aday yok.</p>'}</section>`; }).join('')}</div>
    <div class="ara-bosluk"></div>${GO.gorusmeKarti()}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const c = ev.target.closest('[data-aday]'); if (c) adayAc(c.dataset.aday);
        if (ev.target.closest('[data-yeni-aday]')) adayEkle();
      });
      k.addEventListener('keydown', ev => { const c = ev.target.closest('[data-aday]'); if (c && ev.key === 'Enter') adayAc(c.dataset.aday); });
      GO.gorusmeBaglan(k, yenile);   // DIG-009
      if (id) setTimeout(() => adayAc(id), 50);
    },
  };
}
// Kayıt görüşmeleri tek takvimde: S.sosyal.slotlar (asistanın verdiği ve sizin verdiğiniz randevular birlikte)
const adayGorusme = a => ((S.sosyal && S.sosyal.slotlar) || []).filter(x => x.dolu && (x.aday === a.id || (!x.aday && x.dolu === a.ad)) && fark(x.tarih) >= 0).sort((x, y) => (x.tarih + x.saat).localeCompare(y.tarih + y.saat))[0];
const telAc = t => (t || '').replace(/\D/g, '').replace(/^0/, '');
function gorusmeAyarla(a) {
  const sl = bosSaatler(9), g = adayGorusme(a);
  if (!sl.length) return bildir('Önümüzdeki 3 haftada boş görüşme saati yok. Sosyal medya › Kurallar’dan saat ekleyin.', 'uyari');
  pencere({
    baslik: 'Kayıt görüşmesi · ' + a.ad,
    icerik: `${g ? `<p class="ipucu" style="margin-bottom:12px">${isaret('bilgi', 18)}<span>Şu anki görüşme ${tarihUzun(g.tarih)} ${g.saat}. Yeni saati seçince eskisi boşalır.</span></p>` : ''}<p style="margin-bottom:10px;font-size:14px">Asistanın da kullandığı takvimdeki boş saatler:</p>
      <div class="secim" style="flex-direction:column;align-items:stretch">${sl.map((x, i) => `<label><input type="radio" name="sl" value="${i}" ${i === 0 ? 'checked' : ''}><span>${tarihUzun(x.tarih)} · ${x.saat}</span></label>`).join('')}</div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" checked name="bildir"> Adaya ${e(a.kanal)}’tan bildir</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Görüşmeyi kaydet</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        const x = sl[+d.querySelector('[name=sl]:checked').value], L = S.sosyal.slotlar;
        if (g) L.splice(L.indexOf(g), 1);
        L.push({ tarih: x.tarih, saat: x.saat, dolu: a.ad, aday: a.id, kanal: a.kanal });
        if (!['Kayıt', 'Kaybedildi'].includes(a.asama)) a.asama = 'Görüşme';
        a.takip = x.tarih;
        const metin = `${selam(a.ad)} ${tarihUzun(x.tarih)} ${x.saat} için ${kursAdi('de')} kayıt görüşmenizi ayarladık. Adresimiz ${S.kurs.adres}. Gelirken kimliğinizi getirin.`;
        a.mesajlar.push({ kim: 'kurs', metin, z: new Date().toISOString() }); islem('Kayıt görüşmesi ayarladı', a.ad + ' · ' + tarih(x.tarih) + ' ' + x.saat); kaydet();
        if (!d.querySelector('[name=bildir]').checked) bildir('Görüşme kaydedildi'); else wpGonder(a.ad, metin, 'Görüşme bildirimi');
        adayAc(a.id); yenile();
      });
    },
  });
}
function adayAc(id) {
  const a = S.adaylar.find(x => x.id === id); if (!a) return;
  const g = adayGorusme(a), sonSoru = (a.mesajlar.filter(m => m.kim === 'aday').slice(-1)[0] || {}).metin || '';
  pencere({
    baslik: a.ad, genis: true,
    icerik: `<div class="izgara" style="grid-template-columns:1.3fr 1fr;gap:20px" >
      <div class="kart" style="box-shadow:none;overflow:hidden"><div class="sohbet-pencere" style="min-height:340px">
        <div class="sohbet-ust">${ik(a.kanal === 'Instagram' ? 'ig' : 'wp')}<b style="color:var(--murekkep)">${e(a.kanal)}</b><small style="color:var(--soluk)">${e(a.tel)}</small></div>
        <div class="sohbet-akis">${a.mesajlar.map(m => `<div class="balon ${m.kim !== 'aday' ? 'giden' : ''}">${e(m.metin)}<small>${m.kim === 'asistan' ? ik('robot') + ' Asistan' : m.kim === 'kurs' ? 'Siz' : ''}</small></div>`).join('')}</div>
        <form class="sohbet-yaz" data-yaz><input class="girdi" name="m" placeholder="${a.devir ? 'Adayın sorusuna cevabınızı yazın' : 'Mesaj yazın'}" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('gonder')}</button></form>
        ${a.devir ? `<label style="display:flex;gap:8px;align-items:center;padding:0 14px 12px;font-size:13.5px"><input type="checkbox" data-ogret checked> Bu cevabı asistana da öğret; bir dahakine kendisi cevaplasın</label>` : ''}
      </div></div>
      <div>
        ${a.devir ? `<div class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span><b>Asistan bu soruyu bilemedi ve size devretti.</b> ${e(a.devir)}. Adaya “yetkilimiz 30 dakika içinde dönecek” dedi.</span></div>` : ''}
        <dl class="bilgi-tablo"><dt>Kaynak</dt><dd>${e(a.kaynak)}</dd><dt>Sınıf</dt><dd>${SINIFLAR[a.sinif].ad}</dd><dt>İlk mesaj</dt><dd>${goreli(a.tarih)} ${a.saat}</dd><dt>Telefon</dt><dd>${e(a.tel)}</dd></dl>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          <a class="dg dg-cizgi dg-kucuk" href="tel:+90${telAc(a.tel)}">${ik('tel')}Ara</a>
          <a class="dg dg-wp dg-kucuk" href="https://wa.me/90${telAc(a.tel)}" target="_blank" rel="noopener">${ik('wp')}WhatsApp’ta aç</a>
          <button class="dg dg-cizgi dg-kucuk" data-gorusme-ayarla ${a.asama === 'Kaybedildi' ? 'disabled' : ''}>${ik('takvim')}${g ? 'Görüşmeyi değiştir' : 'Görüşme ayarla'}</button>
        </div>
        ${g ? `<div class="ipucu" style="margin-top:12px">${isaret('tamam', 18)}<span>Kayıt görüşmesi <b>${tarihUzun(g.tarih)} ${g.saat}</b> · ${g.aday ? 'takvimde' : 'asistan verdi'} <button class="dg dg-hafif dg-kucuk" data-gorusme-iptal>İptal et</button></span></div>` : ''}
        <p class="et" style="margin:18px 0 8px">Aşama</p>
        <div class="secim">${ADAY_ASAMA.map(([x]) => `<label><input type="radio" name="asama" value="${x}" ${x === a.asama ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div>
        <div class="alan" style="margin-top:16px"><label for="a-takip">Takip tarihi</label><input id="a-takip" type="date" value="${a.takip || ''}"></div>
        <div class="alan" style="margin-top:12px"><label for="a-not">Not</label><textarea id="a-not" placeholder="Örn. hafta sonu ders istiyor">${e(a.not)}</textarea></div>
      </div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-donustur ${a.asama === 'Kaybedildi' ? 'disabled' : ''}>${ik('kursiyer')}Kursiyere çevir</button>`,
    onAc(d) {
      const kaydetAday = () => { a.asama = d.querySelector('[name=asama]:checked').value; a.takip = d.querySelector('#a-takip').value || null; a.not = d.querySelector('#a-not').value; kaydet(); };
      d.addEventListener('change', () => { kaydetAday(); yenile(); });
      d.querySelector('[data-yaz]').addEventListener('submit', ev => {
        ev.preventDefault(); const m = ev.target.m.value.trim(); if (!m) return;
        a.mesajlar.push({ kim: 'kurs', metin: m, z: new Date().toISOString() });
        if (a.devir) {
          const og = d.querySelector('[data-ogret]');
          if (og && og.checked) { S.asistanBilgi.push({ konu: 'Aday sorusu: ' + sonSoru.slice(0, 48), soru: sonSoru, metin: m, onay: gun(0) }); islem('Asistana bilgi ekledi', sonSoru); }
          S.sosyal.bilinmeyen = S.sosyal.bilinmeyen.filter(x => x.soru !== sonSoru); S.devredilen = S.devredilen.filter(x => x.aday !== a.id);
          a.devir = null; if (a.asama === 'Yeni') a.asama = 'Bilgi verildi';
          kaydet(); wpGonder(a.ad, m, 'Devredilen konuşma'); adayAc(a.id); yenile(); return;
        }
        kaydet(); wpGonder(a.ad, m);
        const ak = d.querySelector('.sohbet-akis'); ak.insertAdjacentHTML('beforeend', `<div class="balon giden">${e(m)}<small>Siz</small></div>`); ak.scrollTop = 1e5; ev.target.reset();
      });
      d.querySelector('[data-gorusme-ayarla]').addEventListener('click', () => gorusmeAyarla(a));
      const gi = d.querySelector('[data-gorusme-iptal]'); if (gi) gi.addEventListener('click', () => { const L = S.sosyal.slotlar; L.splice(L.indexOf(g), 1); islem('Görüşmeyi iptal etti', a.ad + ' · ' + tarih(g.tarih) + ' ' + g.saat); kaydet(); bildir('Görüşme iptal edildi; saat yeniden boş'); adayAc(a.id); yenile(); });
      const ogrenci = a.mesajlar.some(m => m.kim === 'aday' && /öğrenci/i.test(m.metin)) && a.mesajlar.some(m => m.kim !== 'aday' && /indirim/i.test(m.metin));
      d.querySelector('[data-donustur]').addEventListener('click', () => { kaydetAday(); kursiyerFormu({ ad: a.ad.split(' ')[0], soyad: a.ad.split(' ').slice(1).join(' '), tel: a.tel, sinif: a.sinif, kaynak: a.kaynak, adayId: a.id, indirim: ogrenci && !tabanListesi() ? 'Öğrenci belgesi' : '' }); });  // il taban listesi notu 6: indirim önerilmez
    },
  });
}
export function adayEkle() {
  pencere({
    baslik: 'Aday ekle',
    icerik: `<form class="form-izgara" id="f-aday"><div class="alan"><label>Ad soyad</label><input name="ad" required></div><div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" required placeholder="05xx xxx xx xx"></div>
      <div class="alan"><label>Sınıf</label><select name="sinif">${aktifSiniflar().map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select></div>
      <div class="alan"><label>Nereden geldi?</label><select name="kaynak">${KAYNAKLAR.map(k => `<option>${k}</option>`).join('')}</select></div>
      <div class="alan tam"><label>Ne sordu?</label><textarea name="m" placeholder="Örn. hafta sonu ders var mı?"></textarea></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" form="f-aday" type="submit">Adayı ekle</button>`,
    onAc(d) {
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target;
        if (!f.ad.value.trim() || !f.tel.value.trim()) return bildir('Ad ve telefon gerekli', 'uyari');
        S.adaylar.unshift({ id: 'l' + Date.now(), ad: f.ad.value.trim(), tel: f.tel.value.trim(), kaynak: f.kaynak.value, kanal: 'WhatsApp', sinif: f.sinif.value, asama: 'Yeni', tarih: gun(0), saat: new Date().toTimeString().slice(0, 5), takip: null, not: '', mesajlar: [{ kim: 'aday', metin: f.m.value.trim() || 'Bilgi almak istiyorum.' }] });
        kaydet(); kapatPencere(); bildir('Aday eklendi'); yenile();
      });
    },
  });
}

/* ================= KURSİYERLER ================= */
/* ---------- Aşamalı kayıt (18 Kas 2026): 6 adım, büyük kilitli pencere, taslak ----------
   Bütün alanlar tek formda (#f-kursiyer), adımlar bölüm bölüm görünür; alan adları eski tek sayfalık formla aynı, kayıt mantığı değişmedi.
   İleri: yalnız o adımın zorunluları denetlenir. Kaydı oluştur: hepsi; eksik varsa ilgili adıma götürür.
   Evrak ve Ödeme atlanabilir. Kapatırken girdi varsa "Taslak olarak sakla" sorulur (ui.js pencere); taslaklar Öğrenciler sayfasında "Yarım kalan kayıtlar". */
const KS_ADIM = [
  ['kimlik', 'Kimlik ve iletişim', 'Zorunlu', 'MEBBİS’e gidecek kimlik bilgileri. Kimlik kartından bir kez kontrol edin; MEB’de o dönem düzeltilemez.'],
  ['sinif', 'Sınıf, dönem ve grup', 'Zorunlu', 'Sınıfı ve öğretmeni seçin. Dönem grubu belli değilse öğrenci “bekleyen dönem”de kalır, grup açılınca atanır. Ders sayısı ve yaş şartı kendiliğinden hesaplanır.'],
  ['evrak', 'Evrak ve fotoğraf', 'İsteğe bağlı · atlanabilir', 'Getirdiği evrakı işaretleyin, fotoğrafını çekin. Eksik evrakla da kayıt açılır; eksikler öğrenciden WhatsApp’tan istenir.'],
  ['odeme', 'Ödeme', 'Atlanabilir', 'Kurs ücreti ve ödeme planı. Öğrenci şimdi ödemeyecekse “Atla”: ücret borç olarak yazılır, plan sonra dosyadan yapılır.'],
  ['onay', 'Sözleşme ve onaylar', 'KVKK zorunlu', 'Kayıttan sonra ne olsun? KVKK aydınlatma metni verilmeden kayıt açılmaz.'],
  ['ozet', 'Özet ve kayıt', 'Kontrol et, kaydet', 'Son kontrol. Bir bölümü değiştirmek için “Düzenle”ye basın.'],
];
const KS_ATLANIR = new Set(['evrak', 'odeme']);
const FOTO_KURAL = ['Son 6 ay içinde çekilmiş', 'Beyaz ya da açık renk düz fon', 'Yüz tam karşıdan, gözler açık ve net', 'Şapka, gözlük yansıması ve gölge yok', 'Yüz kadrajı dolduruyor, kimlikteki kişiyle aynı'];
const KAN_GRUPLARI = ['A Rh+', 'A Rh−', 'B Rh+', 'B Rh−', 'AB Rh+', 'AB Rh−', '0 Rh+', '0 Rh−'];
// MEB dönem (MEİS) istatistiği kümeleri: İlkokul · İlköğretim+Ortaokul · Genel lise · Meslek ve teknik lise · Fakülte ve YO (resmi.js meisOgrenim)
const OGRENIM_DURUM = ['İlkokul', 'İlköğretim', 'Ortaokul', 'Lise', 'Meslek ve teknik lise', 'Önlisans', 'Lisans', 'Yüksek lisans', 'Doktora'];
const cepGecerli = t => { let n = String(t || '').replace(/\D/g, ''); if (n.startsWith('90')) n = n.slice(2); if (n.startsWith('0')) n = n.slice(1); return /^5\d{9}$/.test(n); };
const taksitEnCok = () => Math.max(1, Math.min(24, +((S.kurs || {}).taksitEnCok) || 6));
const taksitVarsayilan = () => Math.min(5, taksitEnCok());
// Öğrenciler sayfasındaki "Yarım kalan kayıtlar" şeridi
export function yarimKayitlar() {
  const l = taslaklar().filter(t => String(t.id).startsWith('kayit:'));
  if (!l.length) return '';
  return `<div class="ks-yarim">${isaret('bilgi', 20)}<b>Yarım kalan kayıtlar (${l.length})</b><ul>${l.map(t => `<li><span>${e(t.ozet || 'Adsız kayıt')} <small>· ${e(taslakZamani(t.tarih))}</small></span><button type="button" class="dg dg-ana dg-kucuk" data-yarim-devam="${e(t.id)}">Devam et</button><button type="button" class="dg dg-hafif dg-kucuk" data-yarim-sil="${e(t.id)}" aria-label="Taslağı sil">Sil</button></li>`).join('')}</ul></div>`;
}
// taslak saklanınca/silinince Öğrenciler sayfasındaki şerit yenilenir
if (typeof document !== 'undefined') document.addEventListener('sinyal-taslak', () => { const kp = document.querySelector('[data-yarim-kap]'); if (kp) kp.innerHTML = yarimKayitlar(); });
export function yarimKayitTikla(ev) {
  const dv = ev.target.closest('[data-yarim-devam]'); if (dv) { const t = taslakBul(dv.dataset.yarimDevam); if (t) kursiyerFormu({ taslak: t }); return true; }
  const sl = ev.target.closest('[data-yarim-sil]'); if (sl) { taslakSil(sl.dataset.yarimSil); bildir('Yarım kayıt silindi'); return true; }
  return false;
}
export function kursiyerFormu(on = {}) {
  const ts = on.taslak || null;
  if (ts) on = { ...(ts.ek && ts.ek.on || {}) };
  const yeniId = ts ? String(ts.id).slice(6) : 'k' + Date.now();
  let adim = 0, foto = null, dfoto = null, odemeSonra = !!(ts && ts.ek && ts.ek.odemeSonra);
  const durum = (ts && ts.ek && ts.ek.durum) || {};   // adim anahtarı → 'tamam' | 'atlandi' | 'eksik'
  const sec = (ad, l, secili, cls = '') => `<div class="secim ${cls}">${l.map(([v, t]) => `<label><input type="radio" name="${ad}" value="${e(v)}" ${v === secili ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>`;
  const onayAnahtar = (ad, b, s, acik = false, zor = false) => `<label class="ks-onay"><div><b>${b}${zor ? ' <small style="display:inline;color:var(--kirmizi)">*</small>' : ''}</b><small>${s}</small></div><span class="anahtar"><input type="checkbox" name="${ad}" ${acik ? 'checked' : ''}><i></i></span></label>`;
  const evSatir = (key, ad, alt, ic, ikon = 'belge') => `<div class="ks-ev" data-ev="${key}"><label class="ks-ev-ust"><span class="ks-ev-ik">${ik(ikon)}</span><div class="ks-ev-ad"><b>${ad}</b><small data-ev-durum>${alt}</small></div><span class="anahtar"><input type="checkbox" name="ev-${key}" aria-label="${ad} teslim alındı"><i></i></span></label>${ic ? `<div class="ks-ev-alt" data-ev-alt hidden><div class="form-izgara">${ic}</div></div>` : ''}</div>`;
  const tarihAlan = (ad, et) => `<div class="alan"><label>${et}</label><input name="${ad}" type="date"></div>`;
  const metinAlan = (ad, et, ek = '') => `<div class="alan"><label>${et}</label><input name="${ad}" autocomplete="off" ${ek}></div>`;
  const panel = (i, ic) => { const [, ad, zor, acik] = KS_ADIM[i]; return `<section class="ks-panel" data-adim="${i}" aria-labelledby="ks-h-${i}"><div class="ks-bas"><span class="ks-sayac">Adım ${i + 1} / ${KS_ADIM.length}</span><h3 id="ks-h-${i}" tabindex="-1">${ad} ${rozet(zor.split(' · ')[0], /Zorunlu|zorunlu/.test(zor) ? 'mavi' : 'notr')}</h3><p>${acik}</p></div>${ic}</section>`; };
  const icerik = `<div class="ks-govde">
    <nav class="ks-ray" aria-label="Kayıt adımları"><div class="ks-kimlik"><div class="ks-kimlik-foto" data-ks-foto>${ik('kursiyer')}</div><div><b data-ks-ad>Yeni öğrenci</b><small data-ks-alt>Bilgiler girildikçe dolar</small></div></div>
      <ol class="ks-adimlar"><span class="ks-isik" aria-hidden="true"></span>${KS_ADIM.map(([, a, alt], i) => `<li><button type="button" class="ks-adim" data-ks-git="${i}"><span class="ks-no">${i + 1}</span><span><b>${a}</b><small data-ks-adim-alt>${alt}</small></span></button></li>`).join('')}</ol>
      <div class="ks-ray-alt" data-ks-taslak-not>${ik('indir')}<span>${ts ? 'Taslaktan devam · ' + e(taslakZamani(ts.tarih)) : 'Kapatırken taslak olarak saklanabilir'}</span></div></nav>
    <div class="ks-cubuk"><ol>${KS_ADIM.map(() => '<li></li>').join('')}</ol><p><span data-ks-cubuk-ad></span><span data-ks-cubuk-sonra></span></p></div>
    <div class="ks-icerik"><form id="f-kursiyer" novalidate autocomplete="off">
    ${panel(0, `<div class="ks-blok"><h4>Kimlik <small>MEBBİS’e gider</small></h4><div class="form-izgara">
        <div class="alan"><label for="k-tc">TC kimlik no</label><input id="k-tc" name="tc" inputmode="numeric" maxlength="11" value="${e(on.tc || '')}" required autocomplete="off"></div>
        <div class="alan"><label for="k-dogum">Doğum tarihi</label><input id="k-dogum" name="dogumTarihi" type="date" value="${e(on.dogumTarihi || '')}"></div>
        <div class="alan"><label for="k-ad">Ad</label><input id="k-ad" name="ad" value="${e(on.ad || '')}" required autocomplete="off"></div>
        <div class="alan"><label for="k-soyad">Soyad</label><input id="k-soyad" name="soyad" value="${e(on.soyad || '')}" required autocomplete="off"></div>
        <div class="alan zorunlu"><span class="et">Cinsiyet</span>${sec('cinsiyet', [['Kadın', 'Kadın'], ['Erkek', 'Erkek']], on.cinsiyet || '')}</div>
      </div><div class="ks-not ks-tc-durum" data-ks-tc hidden></div></div>
      <div class="ks-blok"><h4>İletişim</h4><div class="form-izgara">
        <div class="alan"><label for="k-tel">Cep telefonu</label><input id="k-tel" name="tel" inputmode="tel" value="${e(on.tel || '')}" placeholder="05xx xxx xx xx" required autocomplete="off"></div>
        <div class="alan"><label for="k-adres">Adres</label><input id="k-adres" name="adres" value="${e(on.adres || '')}" placeholder="Mahalle, ilçe" autocomplete="off"></div>
      </div></div>
      <div class="ks-blok"><details data-ks-ek><summary>${ik('arti')}Ek bilgiler <small style="font:400 13px var(--govde);color:var(--soluk)">baba adı, anne adı, doğum yeri, uyruk, kimlik seri no, kan grubu, öğrenim, acil durum kişisi, nereden geldi</small></summary><div class="form-izgara">
        ${metinAlan('babaAdi', 'Baba adı')}${metinAlan('anaAdi', 'Anne adı')}${metinAlan('dogumYeri', 'Doğum yeri')}
        <div class="alan"><label>Uyruk</label><input name="uyruk" value="Türkiye" list="ks-uyruk" autocomplete="off"><datalist id="ks-uyruk">${['Türkiye', 'Azerbaycan', 'Suriye', 'Irak', 'İran', 'Afganistan', 'Almanya', 'Rusya', 'Ukrayna', 'Türkmenistan', 'Özbekistan', 'Kazakistan', 'Kırgızistan', 'Gürcistan', 'Bulgaristan'].map(x => `<option value="${x}">`).join('')}</datalist></div>
        ${metinAlan('kimlikSeri', 'Kimlik kartı seri no', 'maxlength="12" placeholder="ör. A12B34567"')}
        <div class="alan"><label>Kan grubu</label><select name="kanGrubu"><option value="">Bilinmiyor</option>${KAN_GRUPLARI.map(x => `<option>${x}</option>`).join('')}</select></div>
        <div class="alan"><label for="k-ogrenim">Öğrenim durumu</label><select id="k-ogrenim" name="ogrenim">${OGRENIM_DURUM.map(x => `<option ${x === 'Lise' ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="alan"><label for="k-kaynak">Nereden geldi?</label><select id="k-kaynak" name="kaynak">${KAYNAKLAR.map(k => `<option ${k === on.kaynak ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
        ${metinAlan('acilAd', 'Acil durumda aranacak kişi')}${metinAlan('acilYakinlik', 'Yakınlığı', 'placeholder="ör. annesi"')}${metinAlan('acilTel', 'Onun telefonu', 'inputmode="tel"')}
      </div></details></div>`)}
    ${panel(1, `<div class="ks-blok"><h4>Sınıf <small>ücret kurs ayarlarından</small></h4><div class="ks-sinif" role="radiogroup" aria-label="Sınıf">${satistaSiniflar().map(([k, v], i, l) => { const [s0, ...r] = String(v.ad).split(' · '); return `<label><input type="radio" name="sinif" value="${k}" ${(on.sinif && l.some(x => x[0] === on.sinif) ? k === on.sinif : i === 0) ? 'checked' : ''}><span><b>${e(s0)}</b><small>${e(r.join(' · ') || (v.direksiyon ? v.direksiyon + ' ders direksiyon' : 'teorik'))}</small><em>${tl(v.ucret)}</em></span></label>`; }).join('')}</div>
        <p class="ks-not" id="k-dirnot"></p>
        <p class="ks-not" id="k-taban" hidden></p>
        <p class="ks-not uyari" id="k-program" hidden></p>
        <label class="alan" id="k-kendi" hidden style="flex-direction:row;display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-top:12px"><span class="anahtar"><input type="checkbox" name="kendiArac"><i></i></span><span><b>Kendi aracıyla eğitim alacak</b><small style="display:block;color:var(--soluk)">Engelli aday · direksiyon ders ücretinin yarısı ödenir; araç eğitim başlamadan MEBBİS’e tanımlanır (MTSK md.7/5).</small></span></label>
        <div class="alan" id="k-yas-ist" hidden style="margin-top:12px"><label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="yasIstisna" style="width:18px;height:18px"> Yaş istisnası var (KTY md.76/3: emniyet ve TSK okullarının öğrencisi ya da mezunu, sürücü yüksekokulu mezunu)</label>
          <div data-yas-ist-ek hidden style="display:grid;gap:8px;margin-top:8px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${yasIstisnaSecim(null, 'yasIstisna')}<input name="yasIstisnaNot" placeholder="Dayanak: belge adı ve no (ör. kurum kimlik kartı, diploma)" autocomplete="off" aria-label="İstisnanın dayanağı"></div>
          <small style="color:var(--soluk)">İstisnada A, C, D ve D1 sınıflarında yaş 20’dir ve önceki belge aranmaz; diğer sınıfların yaşı değişmez. Sürücü yüksekokulunda yalnız mezunlar yararlanır. Dayanak işlem kaydına yazılır.</small></div></div>
      <div class="ks-blok"><h4>Mevcut ehliyet <small>sınıf geçişi, ders sayısı ve muafiyet</small></h4><div class="form-izgara">
        <div class="alan"><label for="k-mevcut">Mevcut belgesi</label><select id="k-mevcut" name="mevcut"><option value="">Yok</option>${MEVCUT_BELGELER.map(x => `<option value="${x}" ${x === on.mevcutEhliyet ? 'selected' : ''}>${x === 'E' ? 'E (eski tip)' : x}</option>`).join('')}</select></div>
        <div class="alan" data-mevcut-ek hidden><label for="k-mtarih">Belgenin veriliş tarihi</label><input id="k-mtarih" name="mevcutTarih" type="date"></div>
        <div class="alan" data-mevcut-ek hidden><label for="k-mno">Belge no</label><input id="k-mno" name="mevcutNo" maxlength="20" autocomplete="off"></div>
        <div class="alan tam" id="k-mevcut-ek" hidden><label style="display:flex;gap:8px;align-items:center;font-size:13.5px"><input type="checkbox" name="mevcutOtomatik" style="width:18px;height:18px"> Belgede “sadece otomatik” yazıyor</label><label style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:4px"><input type="checkbox" name="mevcutEski" style="width:18px;height:18px"> Belge 01.01.2016’dan önce alındı (eski tip, Tablo 2)</label></div>
      </div></div>
      <div class="ks-blok"><h4>Dönem grubu ve öğretmen</h4><div class="form-izgara">
        <div class="alan"><label for="k-grup">Dönem grubu <small style="color:var(--soluk);font-weight:400">sonra da atanabilir</small></label><div style="display:flex;gap:8px"><select id="k-grup" name="grup" style="flex:1;min-width:0"></select><button type="button" class="dg dg-cizgi dg-kucuk" style="height:42px" data-k-grup-yeni title="MEBBİS’te açılan grubu burada da açın">${ik('arti')}Yeni grup</button></div><small id="k-grup-not" style="color:var(--soluk)">MEBBİS’teki dönem, grup ve şube. Yeni grup açarken girdikleriniz kaybolmaz.</small></div>
        <div class="alan"><label for="k-egitmen">Öğretmen</label><select id="k-egitmen" name="egitmen"></select><small id="k-arac" style="color:var(--soluk)"></small></div>
        <label class="alan tam" style="flex-direction:row;display:flex;gap:10px;align-items:center;font-size:14px"><span class="anahtar"><input type="checkbox" name="aracKullanabiliyor"><i></i></span>Araç kullanabiliyor <small style="color:var(--soluk)">öğretmen ilk derste bilsin</small></label>
      </div></div>
      <div class="ks-blok"><details data-ks-tercih><summary>${ik('arti')}Sınav tercihleri ve istisnalar <small style="font:400 13px var(--govde);color:var(--soluk)">e-sınav muafiyeti, e-sınav dili, aday belgesi iptali · çoğu öğrencide boş kalır</small></summary><div class="form-izgara">
        <div class="alan"><span class="et">e-Sınav muafiyeti</span><label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="muaf" style="width:18px;height:18px"> Muaf aday: e-sınavı geçmişti, son sınavından bu yana 3 yıl dolmadı (md.15/5)</label><input name="muafTarih" type="date" aria-label="Son girdiği sınavın tarihi" title="Son girdiği sınavın tarihi (e-sınav ya da uygulama, hangisi sonsa)" style="margin-top:6px;display:none"><small id="k-muaf-not" style="color:var(--soluk);display:none"></small></div>
        <div class="alan"><label for="k-esdil">e-Sınav dili</label><select id="k-esdil" name="esinavDil"><option value="tr" selected>Türkçe</option><option value="yd">Yabancı dil</option><option value="isaret">Türkçe, işaret dili videosuyla (işitme engelli)</option></select><input name="esinavYabanci" placeholder="Hangi dil? (ör. İngilizce)" autocomplete="off" aria-label="Yabancı dil" style="margin-top:6px" hidden><input name="esinavTercuman" placeholder="Teorik derslerdeki tercümanın adı" autocomplete="off" aria-label="Tercümanın adı" style="margin-top:6px" hidden><small style="color:var(--soluk)">Yabancı dil ya da işaret dili, e-sınav randevusundan en az 48 saat önce MEBBİS’e işlenir.</small></div>
        <div class="alan tam"><span class="et">Aday belgesi iptali</span><label style="display:flex;gap:8px;align-items:center;font-size:13.5px"><input type="checkbox" name="adayIptal" style="width:18px;height:18px"> Aday sürücü belgesi iptal edilmişti</label><label data-aday-ceza hidden style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:4px"><input type="checkbox" name="adayCeza" style="width:18px;height:18px"> İdari para cezalarının tamamı ödendi</label><small data-aday-not hidden style="color:var(--soluk)">Cezaların tamamı ödenmeden kursta eğitime başlanamaz (KTK ek md.17).</small></div>
      </div></details></div>`)}
    ${panel(2, `<div class="alan" data-me-tarih data-kid="" style="display:none;margin-bottom:12px"></div><div class="ks-evrak">
        <div class="ks-ev" data-ev="foto"><div class="ks-ev-ust"><span class="ks-ev-ik">${ik('kursiyer')}</span><div class="ks-ev-ad"><b>Biyometrik fotoğraf</b><small data-ev-durum>MEBBİS’e bu gider · son 6 ay · beyaz fon</small></div><label class="dg dg-cizgi dg-kucuk" style="cursor:pointer">${ik('arti')}<span data-foto-et>Çek / yükle</span><input type="file" accept="image/*" capture="user" data-ks-foto-sec hidden></label><input type="checkbox" name="ev-foto" hidden></div>
          <div class="ks-ev-alt" data-foto-alt hidden><div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><div class="ks-foto-onizle" data-foto-onizle>${ik('kursiyer')}</div><div style="flex:1;min-width:200px"><p class="et" style="margin-bottom:6px">Biyometrik kontrol</p><div class="foto-kural">${FOTO_KURAL.map((x, i) => `<label><input type="checkbox" name="fk" value="${i}"><span>${x}</span></label>`).join('')}</div></div></div></div></div>
        ${evSatir('ogrenim', 'Öğrenim belgesi', 'Getirmedi', `${metinAlan('meOgVeren', 'Belgeyi veren okul', 'maxlength="100" placeholder="ör. Tepebaşı Anadolu Lisesi"')}<div class="alan"><label>Belge türü</label><select name="meOgTur"><option value="">Seçin</option>${ME.OGRENIM_BELGELERI.map(x => `<option>${x}</option>`).join('')}</select></div>${tarihAlan('meOgTarih', 'Belge tarihi')}${metinAlan('meOgSayi', 'Belge sayısı', 'maxlength="10"')}`)}
        ${evSatir('saglik', 'Sürücü olur sağlık raporu', 'Getirmedi', `<div class="alan"><label for="k-rno">Rapor no</label><input id="k-rno" name="raporNo" placeholder="Rapordaki numara" autocomplete="off"></div><div class="alan"><label for="k-rtar">Rapor tarihi</label><input id="k-rtar" name="raporTarih" type="date"></div><div class="alan"><label>Engel durumu</label><select name="meSgOzur"><option value="Yok">Engeli yok</option><option value="Var">Engeli var</option></select></div>${metinAlan('meSgRef', 'Rapor referans no (e-Nabız)', 'maxlength="30"')}${raporAyrintiHtml(null)}`)}
        ${evSatir('adli', 'Adli sicil kaydı (barkodlu)', 'Getirmedi', `<div class="alan tam"><label for="k-adli">Barkod numarası</label><input id="k-adli" name="adliBarkod" placeholder="e-Devlet belgesinin altındaki barkod" autocomplete="off"></div>${metinAlan('meAdVeren', 'Belgeyi veren', 'maxlength="100" value="E-DEVLET"')}${tarihAlan('meAdTarih', 'Belge tarihi')}${metinAlan('meAdSayi', 'Belge sayısı', 'maxlength="10"')}`)}
        <div class="ks-ev" data-ev="parmak"><details><summary class="ks-ev-ust" style="cursor:pointer;list-style:none"><span class="ks-ev-ik">${ik('belge')}</span><div class="ks-ev-ad"><b>Parmak izi belgesi</b><small>MEBBİS “Aday imza” adımı · bilgileri isteğe bağlı</small></div>${ik('ok')}</summary><div class="ks-ev-alt"><div class="form-izgara">${metinAlan('mePiVeren', 'Belgeyi veren', 'maxlength="100"')}${tarihAlan('mePiTarih', 'Belge tarihi')}${metinAlan('mePiSayi', 'Belge sayısı', 'maxlength="10"')}</div></div></details></div>
        ${evSatir('kimlik', 'Kimlik fotokopisi', 'Getirmedi', '', 'kursiyer')}
        <div class="ks-ev" data-ev="dfoto"><div class="ks-ev-ust"><span class="ks-ev-ik">${ik('kursiyer')}</span><div class="ks-ev-ad"><b>Kimlik doğrulama fotoğrafı</b><small data-dfoto-durum>Kursta, öğrenci karşınızdayken · biyometrikle yan yana saklanır</small></div><label class="dg dg-hafif dg-kucuk" style="cursor:pointer">${ik('arti')}Şimdi çek<input type="file" accept="image/*" capture="user" data-ks-dfoto-sec hidden></label></div>
          <div class="ks-ev-alt" data-dfoto-alt hidden><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="ks-foto-onizle" data-dfoto-onizle></div><label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="dkimlik" style="width:18px;height:18px"> Kimlik kartıyla yüzü karşılaştırdım, aynı kişi</label></div></div></div>
      </div><p class="ks-not" style="margin-top:14px">${isaret('bilgi', 18)}<span>Sözleşme son adımda imzalatılır. Eksik evrak kayıttan sonra öğrenciden WhatsApp’tan istenir; fotoğraflar taslağa girmez.</span></p>`)}
    ${panel(3, `<div class="ks-blok"><h4>Kurs ücreti <small data-ks-ucret-sinif></small></h4><div class="ks-tutar"><b data-ks-ucret></b><small data-ks-ucret-not>KDV dahil · kurs ayarlarındaki ücret</small></div></div>
      <div class="ks-blok"><h4>Nasıl ödeyecek?</h4><div class="alan"><span class="et">Ödeme şekli</span>${sec('odemeSekli', [['taksit', 'Taksitli'], ['pesin', 'Peşin, tek seferde']], 'taksit')}</div>
        <div class="form-izgara" style="margin-top:12px"><div class="alan" data-ks-taksitli><label for="k-pesin">Peşinat</label><input id="k-pesin" name="pesin" inputmode="numeric" value="8000"></div>
        <div class="alan" data-ks-taksitli><span class="et">Taksit sayısı</span>${sec('taksit', Array.from({ length: taksitEnCok() }, (_, i) => [String(i + 1), String(i + 1)]), String(taksitVarsayilan()))}</div>
        <div class="alan tam"><span class="et" data-ks-yontem-et>Peşinat nasıl alındı?</span>${sec('yontem', YONTEMLER.map(y => [y, yontemAd(y)]), '')}</div></div>
        <ul class="ks-plan" id="k-plan"></ul>
        <div class="ks-banka" data-ks-banka hidden>${ik('kart')}<span></span></div></div>
      <div class="ks-not" data-ks-sonra hidden>${isaret('bilgi', 18)}<span><b>Ödeme sonra girilecek.</b> Kurs ücreti borç olarak yazılır, vadesi bir hafta sonra. Plan öğrenci dosyasında Ödeme › “Taksit planını yeniden böl”den yapılır. <button type="button" class="dg dg-hafif dg-kucuk" data-ks-odeme-geri>Şimdi gir</button></span></div>`)}
    ${panel(4, `<div class="ks-blok"><h4>Onaylar</h4>
        ${onayAnahtar('kvkk', 'KVKK aydınlatma metni verildi', 'Zorunlu. Sağlık raporu ve adli sicil MEB mevzuatı gereği işlenir; bunun için ayrıca rıza gerekmez.', false, true)}
        ${onayAnahtar('whatsappOnay', 'Bilgilendirmeleri WhatsApp’tan almayı kabul ediyor', 'İsteğe bağlı. Ders, ödeme ve sınav hatırlatmaları; onay tarihi ve kanalıyla saklanır.', true)}
        ${onayAnahtar('pazarlama', 'Kampanya ve tanıtım mesajlarına açık rıza', 'İsteğe bağlı. Ders, ödeme ve sınav bildirimleri bundan bağımsız gider.')}</div>
      <div class="ks-blok"><h4>Sözleşme</h4><div class="alan"><span class="et">Kayıttan hemen sonra</span>${sec('sozlesmeZaman', [['hemen', 'Sözleşmeyi aç: ekranda imza, link ya da ıslak imza'], ['sonra', 'Sonra imzalatacağım']], 'hemen')}</div></div>
      <div class="ks-blok"><h4>Öğrenciye gidecekler</h4>
        ${onayAnahtar('hos', 'Hoş geldin mesajları', 'Eksik evrak, ödeme planı ve teorik ders mesajları WhatsApp’tan gider; öğretmene haber verilir.', true)}
        ${onayAnahtar('hesap', 'Öğrenci uygulaması hesabı', 'Hesap açılır; giriş bilgileri WhatsApp’tan gider.', true)}</div>`)}
    ${panel(5, `<div class="ks-meb"><h4>MEBBİS’e gidecek bilgiler doğru mu?</h4><p class="ipucu uyari" style="margin-top:8px">${isaret('uyari', 20)}<span>Ad, soyad, TC, doğum tarihi ve fotoğraf MEB’de <b>o dönem düzeltilemez</b>. Kimlik kartıyla bir kez karşılaştırın.</span></p><div class="ks-meb-tablo" data-ks-meb></div>
        <label class="alan" style="flex-direction:row;display:flex;gap:10px;align-items:center;font:800 15px var(--baslik);color:var(--murekkep)"><span class="anahtar"><input type="checkbox" name="kimlikKontrol" data-taslak-yok><i></i></span>Kimlik kartıyla karşılaştırdım, bilgiler doğru</label></div>
      <div class="ks-ozet" data-ks-ozet></div>
      <div class="ks-blok" style="margin-top:14px"><h4>MEBBİS ön kontrol <small data-ks-kontrol-say></small></h4><ul class="ks-kontrol" id="k-kontrol"></ul></div>`)}
    </form></div></div>`;
  const altlik = `<div class="ks-alt"><button type="button" class="dg dg-hafif ks-taslak" data-ks="taslak">${ik('indir')}<span>Taslak kaydet</span></button><span class="ks-bosluk"></span><button type="button" class="dg dg-cizgi" data-ks="geri">${ik('sol')}<span class="ks-ad">Geri</span></button><button type="button" class="dg dg-cizgi" data-ks="atla">Atla</button><button type="button" class="dg dg-ana" data-ks="ileri"></button></div>`;
  pencere({
    baslik: ts ? 'Yarım kalan kayıt' : 'Yeni öğrenci kaydı', buyuk: true, icerik, altlik, taslak: 'kayit:' + yeniId,
    taslakEk: () => ({ adim, durum, odemeSonra, on: { adayId: on.adayId || null } }),
    taslakOzet: d => { const f = d.querySelector('form'); const a = [f.ad.value.trim(), f.soyad.value.trim()].filter(Boolean).join(' '); const s = f.sinif.value && SINIFLAR[f.sinif.value]; return (a || 'Adsız kayıt') + (s ? ' · ' + s.ad : ''); },
    onAc(d) {
      const f = d.querySelector('form'), paneller = [...d.querySelectorAll('.ks-panel')];
      const deger = n => (f.querySelector(`[name="${n}"]:checked`) || {}).value || '';
      const taksitN = () => deger('odemeSekli') === 'pesin' ? 0 : +deger('taksit') || 1;
      const indirimTutar = () => 0;   // taban fiyat kararı (2026): kayıtta indirim yok; müdür dosyadan uygular
      const grupDeger = () => f.grup.value === '__bekle' ? '' : f.grup.value;
      // il taban listesi: mevcut belge + istenen sınıfa göre satır, taban ve kursun ücreti (liste yoksa null; ücret sınıf ücreti)
      const adayX = () => { const m = f.mevcut.value; return { sinif: f.sinif.value, kayit: gun(0), teorikGrup: grupDeger(), mevcutEhliyet: m, mevcutEski: !!m && f.mevcutEski.checked, mevcutOtomatik: !!m && f.mevcutOtomatik.checked, oncekiBelge: m ? { tarih: f.mevcutTarih.value } : null, muaf: f.muaf.checked ? { sonSinav: f.muafTarih.value, esinavTarih: f.muafTarih.value } : null, kendiArac: f.sinif.value === 'B-EN' && f.kendiArac.checked }; };
      const tabanX = () => kursiyerTaban(adayX());
      const ucret0 = (x = tabanX()) => x && x.satir && x.ucret != null ? x.ucret : SINIFLAR[f.sinif.value].ucret;
      const guncelle = () => {
        const s = f.sinif.value, eg = S.egitmenler.filter(x => x.siniflar.includes(s));
        { const gl = GR.kayitGruplari(s), once = f.grup.value || on.grup || ''; // not 23 (DON-003): dönem seçtirilmez; varsayılan “bekleyen dönem”, grup sonra atanır (Öğrenciler › Bekleyen ya da grup kartından toplu atama)
          f.grup.innerHTML = `<option value="__bekle">Bekleyen dönem: grup sonra atanır</option>` + (gl.length ? GR.grupSecenekleri(gl, once) : ''); f.grup.value = once && [...f.grup.options].some(o => o.value === once) ? once : '__bekle';
          const gs = GR.grupBul(f.grup.value), gd = gs && GR.grupDoluluk(gs), tkl = teorikVar(adayX()), su = gs ? GR.subeUyarisi(tkl, gs) : '', bs = !gs && !tkl && GR.belgeliAyri() ? gl.find(GR.belgeliSubesi) : null;
          d.querySelector('#k-grup-not').innerHTML = su ? `<b style="color:var(--turuncu)">${e(su)}</b>` : bs ? `Bu aday teorik derse girmez; <b>${e(bs.ad)}</b> belgeliler şubesi önerilir.` : gd && gd.dolu ? `<b style="color:var(--kirmizi)">${e(gs.ad)} dolu (${gd.n}/${gd.k}).</b> Başka bir şube seçin${GR.sonrakiSube(gs) ? ` ya da “Yeni grup” ile <b>${e(GR.grupAdi(gs.donem, gs.grupNo, GR.sonrakiSube(gs)))}</b> şubesini açın` : ''}.` : f.grup.value === '__bekle' ? 'Öğrenci bekleyen dönemde kalır; MEBBİS kaydı grup atanınca yapılır. Grup belliyse listeden seçin.' : 'MEBBİS’teki dönem, grup ve şube. Yeni grup açarken girdikleriniz kaybolmaz.';
          const mt = f.muafTarih, mn = d.querySelector('#k-muaf-not'); mt.style.display = mn.style.display = f.muaf.checked ? '' : 'none';
          if (f.muaf.checked && mt.value) { const son = GR.muafSonGun(mt.value), ok = mt.value <= gun(0) && gun(0) <= son; mn.innerHTML = mt.value > gun(0) ? '<b style="color:var(--kirmizi)">Sınav tarihi bugünden sonra olamaz</b>' : ok ? `Son girdiği sınavın tarihi (e-sınav ya da uygulama, hangisi sonsa). Muaf: yalnız direksiyon sınavına girer (son gün ${tarih(son)} ${son.slice(0, 4)}).` : `<b style="color:var(--kirmizi)">Muafiyet ${tarih(son)} ${son.slice(0, 4)} tarihinde bitti</b> (son sınavdan 3 yıl); teorik eğitime ve e-sınava yeniden girer.`; } else mn.textContent = 'Son girdiği e-sınavın tarihini girin; muafiyet 3 yıl eksi 1 gün sürer.'; }
        f.esinavYabanci.hidden = f.esinavTercuman.hidden = f.esinavDil.value !== 'yd';
        { const ai = f.adayIptal.checked; d.querySelector('[data-aday-ceza]').hidden = d.querySelector('[data-aday-not]').hidden = !ai; }
        yasIstisnaSenkron(f, 'yasIstisna');
        const onceki = f.egitmen.value || on.egitmen || '';
        f.egitmen.innerHTML = eg.map(x => `<option value="${x.id}" ${x.id === onceki ? 'selected' : ''}>${e(x.ad)}</option>`).join('') || '<option value="">Bu sınıfta öğretmen yok</option>';
        { const m = f.mevcut.value, ek = d.querySelector('#k-mevcut-ek'); ek.hidden = !m; d.querySelectorAll('[data-mevcut-ek]').forEach(x => { x.hidden = !m; }); if (m === 'E') f.mevcutEski.checked = true; else if (ek.dataset.onceki === 'E') f.mevcutEski.checked = false; ek.dataset.onceki = m;
          // belge tarihi 01.01.2016'dan önceyse eski tip (Tablo 2) kendiliğinden işaretlenir (eyup-sorular-cevaplar.md madde 3); tarih değişince bir kez
          if (m && f.mevcutTarih.value !== ek.dataset.tarih) { ek.dataset.tarih = f.mevcutTarih.value; if (f.mevcutTarih.value) f.mevcutEski.checked = m === 'E' || eskiBelgeTarihi(f.mevcutTarih.value); }
          const ist = yasIstisnaGecerli(f.yasIstisna.checked ? yasIstisnaOku(f, 'yasIstisna') : null), h = direksiyonHesap(s, m, { otomatik: !!m && f.mevcutOtomatik.checked, eski: !!m && f.mevcutEski.checked, belgeTarih: m ? f.mevcutTarih.value : '' }), ay = asgariYasHesap(s, m, m ? f.mevcutTarih.value : '', ist), de = deneyimEksik(s, m, ist);
          const yi = d.querySelector('#k-yas-ist'), yasi0 = yas(f.dogumTarihi.value); yi.hidden = !(f.yasIstisna.checked || (yasi0 != null && yasi0 < ay.normal) || (yasIstisnaKapsar(s) && deneyimEksik(s, m))); yi.querySelector('[data-yas-ist-ek]').hidden = !f.yasIstisna.checked;
          const yasOk = yasi0 == null ? '' : yasi0 >= ay.yas ? ` · öğrenci ${yasi0} yaşında ✓` : ` · <b style="color:var(--kirmizi)">öğrenci ${yasi0} yaşında, yaşı tutmuyor</b>`;
          d.querySelector('#k-dirnot').innerHTML = `${isaret(h.teyit || h.altinda || de || (yasi0 != null && yasi0 < ay.yas) ? 'uyari' : 'bilgi', 18)}<span><b>${h.saat ? h.saat + ' ders direksiyon' : 'Direksiyon dersi yok'}</b> · ${e(h.kaynak)}${h.teyit ? ' <b style="color:var(--turuncu)">Teyit bekliyor</b>' : ''} · en az ${ay.yas} yaş${ay.not ? ' (' + e(ay.not) + ')' : ''}${yasOk}${de ? '<br><b style="color:var(--kirmizi)">' + e(de) + '</b>' : ''}</span>`; }
        const ar = ustaAraci(f.egitmen.value, s); d.querySelector('#k-arac').textContent = ar ? 'Araç: ' + ar.model + ' · ' + ar.plaka + ' · ' + ar.vites : f.egitmen.value ? 'Bu öğretmenin bu sınıfta aracı yok' : '';
        // ödeme
        d.querySelector('#k-kendi').hidden = s !== 'B-EN';
        { const pu = programUyarisi(s), p = d.querySelector('#k-program'); p.hidden = !pu; p.innerHTML = pu ? `${isaret('uyari', 18)}<span>${e(pu)}</span>` : ''; }
        const tx = tabanX(), u0 = ucret0(tx);
        { const p = d.querySelector('#k-taban'); p.hidden = !tx;
          if (tx) { const u1 = u0 - indirimTutar(), alt = tx.taban != null && u1 < tx.taban;
            p.innerHTML = tx.satir ? `${isaret(alt ? 'uyari' : 'bilgi', 18)}<span><b>Taban ${tl(tx.taban)}</b> · ${e(listeAdi(tx.liste))}, “${e(satirAdi(tx.satir))}” satırı${tx.saat ? ` · listede ${tx.saat} ders direksiyon` : ''} · kursun ücreti <b>${tl(u0)}</b>${tx.tabanNot ? '<br>' + e(tx.tabanNot) : ''}${alt ? '<br><b style="color:var(--kirmizi)">Ücret tabanın altında (MTSK Yön. md.43/4)</b>' : ''}</span>`
              : `${isaret('uyari', 18)}<span>${e(listeAdi(tx.liste))}: ${e(tx.neden)} Taban ücret yok; sınıf ücreti (${tl(u0)}) kullanılır.</span>`; } }
        const u = u0 - indirimTutar(), n = taksitN(), p = n ? Math.min(u, tutarOku(f.pesin.value) || 0) : u;
        d.querySelector('[data-ks-ucret]').textContent = tl(u); d.querySelector('[data-ks-ucret-sinif]').textContent = SINIFLAR[s].ad;
        d.querySelector('[data-ks-ucret-not]').textContent = tx && tx.satir ? `KDV dahil · ${listeAdi(tx.liste)} satırına göre (taban ${tl(tx.taban)})` : 'KDV dahil · kurs ayarlarındaki ücret';
        d.querySelectorAll('[data-ks-taksitli]').forEach(x => { x.hidden = !n; });
        d.querySelector('[data-ks-yontem-et]').textContent = n ? 'Peşinat nasıl alındı?' : 'Ödeme nasıl alındı?';
        d.querySelector('#k-plan').innerHTML = n ? `<li><span>P</span>Peşinat · bugün<b>${tl(p)}</b></li>` + taksitBol(u - p, n).map((t, i) => `<li><span>${i + 1}</span>${tarihUzun(ayEkle(gun(0), i + 1)).split(' ').slice(0, 2).join(' ')} ${ayEkle(gun(0), i + 1).slice(0, 4)}<b>${tl(t)}</b></li>`).join('') : `<li><span>₺</span>Tek seferde · bugün<b>${tl(u)}</b></li>`;
        { const bk = d.querySelector('[data-ks-banka]'), ib = ibanMetni(); bk.hidden = deger('yontem') !== 'Havale'; bk.querySelector('span').innerHTML = ib ? `Havale: <code>${e(ib)}</code> · açıklamaya <b class="mono">${e(odemeKodu({ id: yeniId }))}</b> kodu yazılırsa ödeme bu öğrenciye kendiliğinden işlenir.` : 'Kursun IBAN’ı girilmemiş: Ayarlar › Kurs bilgileri. Açıklama kodu: <b class="mono">' + e(odemeKodu({ id: yeniId })) + '</b>'; }
        d.querySelector('[data-ks-sonra]').hidden = !odemeSonra; d.querySelectorAll('[data-adim="3"] .ks-blok').forEach(x => { x.style.opacity = odemeSonra ? '.45' : ''; });
        // evrak satırları: anahtar açıkken belge bilgileri görünür
        d.querySelectorAll('.ks-ev[data-ev]').forEach(r => { const c = r.querySelector('input[name^="ev-"]'); if (!c) return; r.classList.toggle('var', c.checked); const alt = r.querySelector('[data-ev-alt]'); if (alt) alt.hidden = !c.checked; const dz = r.querySelector('[data-ev-durum]'); if (dz && r.dataset.ev !== 'foto') dz.textContent = c.checked ? 'Teslim alındı' + (alt ? ' · bilgileri MEBBİS’e gider' : '') : 'Getirmedi · kayıttan sonra istenir'; });
        { const r = d.querySelector('[data-ev="foto"]'); r.classList.toggle('var', !!foto); r.querySelector('[data-ev-durum]').textContent = foto ? 'Fotoğraf çekildi · biyometrik kontrolü işaretleyin' : 'MEBBİS’e bu gider · son 6 ay · beyaz fon'; d.querySelector('[data-foto-alt]').hidden = !foto; d.querySelector('[data-foto-et]').textContent = foto ? 'Yeniden çek' : 'Çek / yükle'; }
        // sol ray: öğrencinin kimliği girildikçe dolar
        { const ad = [f.ad.value.trim(), f.soyad.value.trim()].filter(Boolean).join(' '), g = GR.grupBul ? GR.grupBul(grupDeger()) : null; d.querySelector('[data-ks-ad]').textContent = ad || 'Yeni öğrenci'; d.querySelector('[data-ks-alt]').textContent = ad || f.tc.value ? [SINIFLAR[s].ad, g ? g.ad : f.grup.value === '__bekle' ? 'Bekleyen dönem' : ''].filter(Boolean).join(' · ') : 'Bilgiler girildikçe dolar'; d.querySelector('[data-ks-foto]').innerHTML = foto ? `<img src="${foto}" alt="">` : ik('kursiyer'); }
        const gec = { id: '_yeni', tc: f.tc.value.trim(), dogumTarihi: f.dogumTarihi.value, sinif: s, mevcutEhliyet: f.mevcut.value, oncekiBelge: f.mevcut.value ? { sinif: f.mevcut.value, tarih: f.mevcutTarih.value } : null, asama: 'Kayıt', kayit: gun(0), teorikGrup: grupDeger(), evrak: Object.fromEntries(EVRAKLAR.map(([x]) => [x, x === 'sozlesme' || (x === 'foto' ? !!foto || f['ev-foto'].checked : f['ev-' + x].checked)])), kvkk: { aydinlatma: f.kvkk.checked }, cinsiyet: deger('cinsiyet'), saglikRapor: { no: f.raporNo.value.trim(), tarih: f.raporTarih.value }, adliSicil: { barkod: f.adliBarkod.value.trim() }, yasIstisna: f.yasIstisna.checked ? yasIstisnaOku(f, 'yasIstisna') : null, adayIptal: f.adayIptal.checked ? { cezaOdendi: f.adayCeza.checked } : null, foto };
        const kl = mebOnKontrol(gec);
        d.querySelector('#k-kontrol').innerHTML = kl.map(([ok, t]) => `<li class="${ok ? '' : 'yok'}">${isaret(ok ? 'tamam' : 'uyari', 16)}<span>${t}</span></li>`).join('');
        d.querySelector('[data-ks-kontrol-say]').textContent = kl.filter(x => x[0]).length + '/' + kl.length;
        return kl;
      };
      // --- Denetim: [alan, mesaj] listesi; her alanın adımı panelinden bulunur ---
      const hatalar = (son = false) => {
        const h = [];
        if (!tcGecerli(f.tc.value.trim())) h.push([f.tc, f.tc.value.trim() ? 'Bu TC kimlik numarası geçerli değil' : 'TC kimlik numarası gerekli']);
        else { const c = ayniTcKayit(f.tc.value, f.sinif.value); if (c.ayni) h.push([f.tc, `Bu TC ile ${SINIFLAR[c.ayni.sinif].ad} sınıfında açık kayıt var: ${tamAd(c.ayni)} (No ${c.ayni.no || '—'}). Aynı kişi iki kez kaydedilemez.`]); }
        if (!f.ad.value.trim()) h.push([f.ad, 'Ad gerekli']);
        if (!f.soyad.value.trim()) h.push([f.soyad, 'Soyad gerekli']);
        if (!deger('cinsiyet')) h.push([f.querySelector('[name=cinsiyet]'), 'Cinsiyeti seçin; MEBBİS’te zorunlu']);
        if (!cepGecerli(f.tel.value)) h.push([f.tel, f.tel.value.trim() ? 'Cep telefonu 05 ile başlayan 11 hane olmalı (MEBBİS)' : 'Cep telefonu gerekli']);
        if (f.acilTel.value.trim() && f.acilTel.value.replace(/\D/g, '').length < 10) h.push([f.acilTel, 'Acil durum telefonu eksik']);
        if (!f.grup.value) h.push([f.grup, GR.kayitGruplari(f.sinif.value).length ? 'Dönem grubunu seçin ya da “Bekleyen dönem”i seçin' : 'Bu sınıf için grup yok; “Yeni grup” açın ya da “Bekleyen dönem”i seçin']);
        if (f.mevcut.value && f.mevcut.value === f.sinif.value) h.push([f.mevcut, 'Mevcut belge ile istenen sınıf aynı olamaz (MEBBİS)']);
        { const yd = yasDenetim({ sinif: f.sinif.value, dogumTarihi: f.dogumTarihi.value, mevcutEhliyet: f.mevcut.value, oncekiBelge: f.mevcut.value ? { tarih: f.mevcutTarih.value } : null, yasIstisna: f.yasIstisna.checked ? yasIstisnaOku(f, 'yasIstisna') : null }); if (!yd.tamam && f.dogumTarihi.value) h.push([f.dogumTarihi, yd.uyari]); }
        if (f.yasIstisna.checked && !f.yasIstisnaOkul.value) h.push([f.yasIstisnaOkul, 'Yaş istisnasının okul türünü seçin (KTY md.76/3)']);
        if (f.yasIstisna.checked && f.yasIstisnaNot.value.trim().length < 5) h.push([f.yasIstisnaNot, 'Yaş istisnasının dayanağını yazın (belge adı ve no)']);
        if (f.muaf.checked && !f.muafTarih.value) h.push([f.muafTarih, 'Son girdiği sınavın (e-sınav ya da uygulama) tarihini girin']);
        else if (f.muaf.checked && f.muafTarih.value > gun(0)) h.push([f.muafTarih, 'Sınav tarihi bugünden sonra olamaz']);
        if (f.esinavDil.value === 'yd' && !f.esinavYabanci.value.trim()) h.push([f.esinavYabanci, 'e-Sınavın yabancı dilini yazın ya da Türkçe seçin']);
        if (foto && [...f.querySelectorAll('[name=fk]')].some(c => !c.checked)) h.push([f.querySelector('[name=fk]'), 'Biyometrik kontrolün hepsini işaretleyin; uymayan fotoğraf MEB’den döner']);
        if (dfoto && !f.dkimlik.checked) h.push([f.dkimlik, 'Doğrulama fotoğrafı için kimlik kartıyla karşılaştırmayı işaretleyin']);
        if (!odemeSonra) { const n = taksitN(), p = tutarOku(f.pesin.value) || 0, u = SINIFLAR[f.sinif.value].ucret;
          if (n && p >= u) h.push([f.pesin, 'Taksitliyse peşinat kurs ücretinden küçük olmalı']);
          if ((!n || p > 0) && !deger('yontem')) h.push([f.querySelector('[name=yontem]'), n ? 'Peşinatın nasıl alındığını seçin' : 'Ödemenin nasıl alındığını seçin']); }
        if (!f.kvkk.checked) h.push([f.kvkk, 'KVKK aydınlatma metni verilmeden kayıt yapılamaz']);
        if (son && !f.kimlikKontrol.checked) h.push([f.kimlikKontrol, 'Bilgileri kimlik kartıyla karşılaştırıp işaretleyin']);
        return h;
      };
      const adimOf = el => +((el.closest('[data-adim]') || {}).dataset || {}).adim || 0;
      const sars = () => { const p = paneller[adim]; p.classList.remove('ks-sars'); void p.offsetWidth; p.classList.add('ks-sars'); };
      const evrakEksik = () => EVRAKLAR.filter(([x]) => x !== 'sozlesme' && !(x === 'foto' ? foto || f['ev-foto'].checked : f['ev-' + x].checked)).length;
      const isikKonum = () => { const b = d.querySelector(`.ks-adim[data-ks-git="${adim}"]`), is = d.querySelector('.ks-isik'); if (!b || !is || !b.offsetParent) return; is.style.transform = `translateY(${b.parentElement.offsetTop}px)`; is.style.height = b.offsetHeight + 'px'; };
      const ciz = (yon = '') => {
        paneller.forEach((p, i) => { p.classList.toggle('aktif', i === adim); p.classList.remove('ileri', 'geri'); if (i === adim && yon) { void p.offsetWidth; p.classList.add(yon); } });
        d.querySelectorAll('.ks-adim').forEach((b, i) => { const a = KS_ADIM[i][0], s = i === adim ? 'aktif' : durum[a] || ''; b.className = 'ks-adim ' + s; b.setAttribute('aria-current', i === adim ? 'step' : 'false');
          b.querySelector('.ks-no').innerHTML = s === 'tamam' ? ik('tik') : s === 'eksik' ? '!' : String(i + 1);
          b.querySelector('[data-ks-adim-alt]').textContent = s === 'atlandi' ? 'Atlandı · sonra tamamlanır' : s === 'eksik' ? (a === 'evrak' ? evrakEksik() + ' evrak eksik · kayıt yine olur' : 'Eksik alan var') : s === 'tamam' ? (a === 'evrak' && evrakEksik() ? evrakEksik() + ' evrak eksik' : a === 'odeme' && odemeSonra ? 'Sonra girilecek' : 'Tamam') : KS_ADIM[i][2]; });
        d.querySelectorAll('.ks-cubuk li').forEach((li, i) => { li.className = i === adim ? 'aktif' : durum[KS_ADIM[i][0]] || ''; });
        d.querySelector('[data-ks-cubuk-ad]').innerHTML = `Adım ${adim + 1}/${KS_ADIM.length} · <b>${KS_ADIM[adim][1]}</b>`;
        d.querySelector('[data-ks-cubuk-sonra]').textContent = adim < KS_ADIM.length - 1 ? 'Sonra: ' + KS_ADIM[adim + 1][1] : '';
        const al = d.querySelector('.ks-alt'), son = adim === KS_ADIM.length - 1, ad0 = KS_ADIM[adim][0];
        al.querySelector('[data-ks=geri]').hidden = !adim;
        al.querySelector('[data-ks=atla]').hidden = !KS_ATLANIR.has(ad0) || (ad0 === 'odeme' && odemeSonra);
        al.querySelector('[data-ks=ileri]').innerHTML = son ? `${ik('tik')}Kaydı oluştur` : `<span>İleri<span class="ks-ad">: ${KS_ADIM[adim + 1][1].split(',')[0].replace(/ ve .*/, '')}</span></span>${ik('ok')}`;
        if (son) ozetCiz();
        requestAnimationFrame(isikKonum);
        const ic = d.querySelector('.ks-icerik'); if (ic) ic.scrollTop = 0;
        // dokunmatikte klavye kendiliğinden açılmasın: başlığa odaklanılır
        const ilk = paneller[adim].querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),select');
        if (ilk && !matchMedia('(pointer:coarse)').matches && !son) setTimeout(() => ilk.focus({ preventScroll: true }), 120); else paneller[adim].querySelector('h3').focus({ preventScroll: true });
      };
      const git = (i, yon) => { if (i < 0 || i >= KS_ADIM.length || i === adim) return; adim = i; ciz(yon || 'ileri'); };
      const adimDenetle = i => { const h = hatalar().filter(([el]) => adimOf(el) === i); alanHatalari(f, h, { sessiz: true }); return !h.length; };
      const ileri = () => {
        if (adim === KS_ADIM.length - 1) return f.requestSubmit();
        if (!adimDenetle(adim)) { sars(); durum[KS_ADIM[adim][0]] = 'eksik'; ciz(); return; }
        const a = KS_ADIM[adim][0]; durum[a] = a === 'evrak' && evrakEksik() ? 'eksik' : 'tamam';
        if (a === 'odeme') odemeSonra = false;
        git(adim + 1, 'ileri');
      };
      const atla = () => { const a = KS_ADIM[adim][0]; if (!KS_ATLANIR.has(a)) return; alanHatalari(f, []); durum[a] = 'atlandi'; if (a === 'odeme') { odemeSonra = true; guncelle(); } git(adim + 1, 'ileri'); };
      // --- Özet ---
      const ozetCiz = () => {
        const kl = guncelle(), B = x => String(x || '').trim().toLocaleUpperCase('tr'), g = GR.grupBul(grupDeger()), n = taksitN(), u = SINIFLAR[f.sinif.value].ucret, p = n ? Math.min(u, tutarOku(f.pesin.value) || 0) : u;
        const satir = (a, b) => `<div><span>${a}</span><b>${e(b || '—')}</b></div>`;
        d.querySelector('[data-ks-meb]').innerHTML = satir('Ad', B(f.ad.value)) + satir('Soyad', B(f.soyad.value)) + satir('TC kimlik no', f.tc.value.trim()) + satir('Doğum tarihi', f.dogumTarihi.value ? f.dogumTarihi.value.split('-').reverse().join('.') : '') + satir('Cinsiyet', deger('cinsiyet')) + satir('Sınıf', SINIFLAR[f.sinif.value].ad) + satir('Dönem grubu', g ? g.ad + ' · ' + g.baslangic.split('-').reverse().join('.') + ' başlıyor' : f.grup.value === '__bekle' ? 'Bekleyen dönem' : '') + (f.muaf.checked && f.muafTarih.value ? satir('e-Sınav', 'Muaf · ' + f.muafTarih.value.split('-').reverse().join('.')) : '') + satir('Cep telefonu', f.tel.value.trim());
        const kart = (i, baslik, l, ok) => `<div class="ks-oz"><div class="ks-oz-bas">${isaret(ok ? 'tamam' : 'uyari', 18)}<h4>${baslik}</h4><button type="button" class="dg dg-hafif dg-kucuk" data-ks-git="${i}">${ik('kalem')}Düzenle</button></div><dl>${l.map(([a, b]) => `<dt>${a}</dt><dd>${e(b || '—')}</dd>`).join('')}</dl></div>`;
        const eks = EVRAKLAR.filter(([x]) => x !== 'sozlesme' && !(x === 'foto' ? foto || f['ev-foto'].checked : f['ev-' + x].checked)).map(([, t]) => t.split(' (')[0]);
        const eg = egitmen(f.egitmen.value);
        d.querySelector('[data-ks-ozet]').innerHTML =
          kart(0, 'Kimlik ve iletişim', [['Ad soyad', [f.ad.value.trim(), f.soyad.value.trim()].join(' ')], ['Cep', f.tel.value.trim()], ['Adres', f.adres.value.trim()], ['Acil durumda', f.acilAd.value.trim() ? f.acilAd.value.trim() + ' · ' + f.acilTel.value.trim() : '']], true)
          + kart(1, 'Sınıf, dönem ve grup', [['Sınıf', SINIFLAR[f.sinif.value].ad], ['Grup', g ? g.ad : f.grup.value === '__bekle' ? 'Bekleyen dönem' : ''], ['Öğretmen', eg ? eg.ad : ''], ['Mevcut ehliyet', f.mevcut.value || 'Yok']], !!f.grup.value)
          + kart(2, 'Evrak ve fotoğraf', [['Teslim', (5 - eks.length) + '/5'], ['Eksik', eks.join(', ') || 'Yok'], ['Fotoğraf', foto ? 'Çekildi' : 'Kayıttan sonra çekilecek']], !eks.length)
          + kart(3, 'Ödeme', odemeSonra ? [['Ücret', tl(u)], ['Plan', 'Sonra girilecek (borç yazılır)']] : [['Ücret', tl(u)], [n ? 'Peşinat' : 'Peşin', tl(p) + (deger('yontem') ? ' · ' + yontemAd(deger('yontem')) : '')], ['Taksit', n ? (b => b.length > 1 && b[0] !== b[b.length - 1] ? `${b.length - 1} × ${tl(b[0])} + ${tl(b[b.length - 1])}` : `${b.length} × ${tl(b[0] || 0)}`)(taksitBol(u - p, n)) : 'Yok']], true)
          + kart(4, 'Sözleşme ve onaylar', [['KVKK', f.kvkk.checked ? 'Verildi' : 'Verilmedi'], ['WhatsApp onayı', f.whatsappOnay.checked ? 'Var' : 'Yok'], ['Sözleşme', deger('sozlesmeZaman') === 'sonra' ? 'Sonra imzalatılacak' : 'Kayıttan hemen sonra']], f.kvkk.checked);
        const eksik = kl.filter(x => !x[0]).length;
        d.querySelector('[data-ks-kontrol-say]').textContent = (kl.length - eksik) + '/' + kl.length + (eksik ? ' · eksikler tamamlanmadan MEBBİS’e aktarılmaz' : ' · hepsi tamam');
      };
      // --- Taslaktan devam: alanlar iki kez yazılır (sınıfa bağlı grup/öğretmen listesi araya kurulur) ---
      if (ts) { alanlariYaz(f, ts.alanlar); guncelle(); alanlariYaz(f, ts.alanlar); adim = Math.min(Math.max(0, +(ts.ek && ts.ek.adim) || 0), KS_ADIM.length - 1); }
      alanHatalari(f, []);  // satır içi hata temizleyicisini bağlar
      guncelle(); ciz();
      f.addEventListener('input', guncelle); f.addEventListener('change', guncelle);
      // TC alanından çıkınca: aynı TC'li kayıtlar ve eski kayıttan bilgi aktarma (KAY-103)
      const tcBak = () => {
        const tc = f.tc.value.trim(), kutu = d.querySelector('[data-ks-tc]');
        if (!/^\d{11}$/.test(tc)) { kutu.hidden = true; return; }
        if (!tcGecerli(tc)) { kutu.hidden = false; kutu.innerHTML = `${isaret('uyari', 18)}<span><b style="color:var(--kirmizi)">Bu TC kimlik numarası geçerli değil.</b> Kimlik kartından tekrar bakın.</span>`; return; }
        const l = (S.kursiyerler || []).filter(x => x.tc === tc), acik = l.filter(x => !x.kapali && x.asama !== 'Ehliyet');
        kutu.hidden = false;
        kutu.innerHTML = !l.length ? `${isaret('tamam', 18)}<span>Bu TC ile kayıt yok. <b>Yeni kayıt.</b></span>` : `${isaret(acik.length ? 'uyari' : 'bilgi', 18)}<span class="ks-oneri"><span>${acik.length ? `<b>${acik.map(x => SINIFLAR[x.sinif].ad).join(', ')}</b> sınıfında açık kaydı var (${e(tamAd(acik[0]))}, No ${e(String(acik[0].no || '—'))}).` : `Daha önce kayıtlı: <b>${e(tamAd(l[0]))}</b> · ${e(SINIFLAR[l[0].sinif] ? SINIFLAR[l[0].sinif].ad : l[0].sinif)}${l[0].asama === 'Ehliyet' ? ' · ehliyetini aldı' : ''}.`}</span><button type="button" class="dg dg-cizgi dg-kucuk" data-ks-aktar="${e(l[0].id)}">Bilgilerini aktar</button></span>`;
      };
      f.tc.addEventListener('change', tcBak); f.tc.addEventListener('input', () => { if (f.tc.value.trim().length === 11) tcBak(); });
      // satır içi anında hata: alandan çıkınca yalnız o alan
      f.addEventListener('focusout', ev => { const t = ev.target; if (!t.name || !['tel', 'ad', 'soyad', 'acilTel', 'pesin'].includes(t.name) || !t.value.trim()) return; const h = hatalar().filter(([el]) => el === t); if (h.length) { const kap = t.closest('.alan'); if (kap && !kap.querySelector('.alan-hata')) { kap.classList.add('hatali'); t.setAttribute('aria-invalid', 'true'); const s = document.createElement('small'); s.className = 'alan-hata'; s.textContent = h[0][1]; kap.appendChild(s); } } });
      // Enter: sonraki alana; adımın son alanında İleri
      f.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter' || ev.isComposing || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'BUTTON' || ev.target.closest('summary')) return;
        ev.preventDefault();
        const l = [...paneller[adim].querySelectorAll('input:not([type=hidden]):not([type=file]):not([disabled]),select:not([disabled])')].filter(x => x.offsetParent !== null && x.type !== 'radio' && x.type !== 'checkbox');
        const i = l.indexOf(ev.target); if (i >= 0 && i < l.length - 1) l[i + 1].focus(); else ileri();
      });
      d.addEventListener('click', ev => {
        const k = ev.target.closest('[data-ks]'); if (k) { const t = k.dataset.ks; if (t === 'ileri') ileri(); else if (t === 'geri') git(adim - 1, 'geri'); else if (t === 'atla') atla(); else if (t === 'taslak') { taslakSakla({ id: 'kayit:' + yeniId, baslik: 'Yeni öğrenci kaydı', ozet: (() => { const a = [f.ad.value.trim(), f.soyad.value.trim()].filter(Boolean).join(' '); return (a || 'Adsız kayıt') + ' · ' + SINIFLAR[f.sinif.value].ad; })(), alanlar: alanlariOku(f), ek: { adim, durum, odemeSonra, on: { adayId: on.adayId || null } } }); delete d.dataset.degisti; d.querySelector('[data-ks-taslak-not] span').textContent = 'Taslak ' + taslakZamani(new Date().toISOString()) + ' kaydedildi'; bildir('Taslak kaydedildi; Öğrenciler › Yarım kalan kayıtlar’dan devam edersiniz'); } return; }
        const g = ev.target.closest('[data-ks-git]'); if (g) { const i = +g.dataset.ksGit; return git(i, i < adim ? 'geri' : 'ileri'); }
        if (ev.target.closest('[data-ks-odeme-geri]')) { odemeSonra = false; delete durum.odeme; guncelle(); ciz(); return; }
        const ak = ev.target.closest('[data-ks-aktar]'); if (ak) { const o = kursiyer(ak.dataset.ksAktar); if (!o) return; const yaz = (n, v) => { if (v && f[n] && !f[n].value) f[n].value = v; };
          yaz('ad', o.ad); yaz('soyad', o.soyad); yaz('tel', o.tel); yaz('dogumTarihi', o.dogumTarihi); yaz('adres', o.adres); yaz('babaAdi', o.babaAdi); yaz('anaAdi', o.anaAdi); yaz('dogumYeri', o.dogumYeri); yaz('kimlikSeri', o.kimlikSeri);
          if (o.cinsiyet && !deger('cinsiyet')) { const r = f.querySelector(`[name=cinsiyet][value="${o.cinsiyet}"]`); if (r) r.checked = true; } if (o.ogrenim) f.ogrenim.value = o.ogrenim;
          d.dataset.degisti = '1'; guncelle(); bildir('Önceki kaydın kimlik ve iletişim bilgileri aktarıldı; kontrol edin'); return; }
      });
      // seçili grup doluysa yeni grup formu aynı dönem ve grubun sıradaki şubesiyle açılır (DON-010)
      d.querySelector('[data-k-grup-yeni]').addEventListener('click', () => { const g0 = GR.grupBul(f.grup.value), dl = g0 && GR.grupDoluluk(g0).dolu, ss = dl && GR.sonrakiSube(g0); GR.grupFormu({ sinif: f.sinif.value || '', ust: true, ...(ss ? { donem: g0.donem, grupNo: g0.grupNo, sube: ss, sinif: g0.sinif || f.sinif.value || '', derslik: '' } : {}) }, g => { if (g) { on.grup = g.id; guncelle(); if ([...f.grup.options].some(o => o.value === g.id)) f.grup.value = g.id; guncelle(); } }); });
      // fotoğraflar (taslağa girmez)
      d.querySelector('[data-ks-foto-sec]').addEventListener('change', ev => { const x = ev.target.files[0]; if (!x) return; fotoKucult(x, 480).then(u => { foto = u; d.querySelector('[data-foto-onizle]').innerHTML = `<img src="${u}" alt="">`; f.querySelectorAll('[name=fk]').forEach(c => { c.checked = false; }); f['ev-foto'].checked = true; guncelle(); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); });
      d.querySelector('[data-ks-dfoto-sec]').addEventListener('change', ev => { const x = ev.target.files[0]; if (!x) return; fotoKucult(x, 480).then(u => { dfoto = u; d.querySelector('[data-dfoto-onizle]').innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`; d.querySelector('[data-dfoto-alt]').hidden = false; f.dkimlik.checked = false; d.querySelector('[data-dfoto-durum]').textContent = 'Çekildi · kimlikle karşılaştırın'; }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); });
      addEventListener('resize', isikKonum, { passive: true });
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        { const h = hatalar(true); if (h.length) { const i = Math.min(...h.map(([el]) => adimOf(el))); h.filter(([el]) => adimOf(el) !== 5).forEach(([el]) => { durum[KS_ADIM[adimOf(el)][0]] = 'eksik'; }); if (i !== adim) { adim = i; ciz('geri'); } setTimeout(() => { alanHatalari(f, h.filter(([el]) => adimOf(el) === i), { sessiz: true }); sars(); }, 340); return; } }
        { const c = ayniTcKayit(f.tc.value, f.sinif.value); if (c.baska && !f.dataset.baskaOnay) return pencereSor(d, { baslik: 'Bu TC ile başka sınıfta kayıt var', metin: `${e(tamAd(c.baska))} bu TC ile ${e(SINIFLAR[c.baska.sinif].ad)} sınıfında kayıtlı. İkinci sınıf için ayrı kayıt açılsın mı?`, secenekler: [['evet', 'Evet, ikinci kaydı aç', 'dg-ana'], ['vazgec', 'Vazgeç', 'dg-cizgi']] }, s => { if (s === 'evet') { f.dataset.baskaOnay = '1'; f.requestSubmit(); } }); }
        { const g = GR.grupBul(grupDeger()), gd = g && GR.grupDoluluk(g); if (gd && gd.dolu && !f.dataset.doluOnay) return pencereSor(d, { baslik: g.ad + ' dolu', metin: `Grupta ${gd.n} kursiyer var, kapasite ${gd.k}. Derslik kontenjanı aşılırsa denetimde sorun olur (bir dersliğe en çok 30 kursiyer).`, secenekler: [['evet', 'Yine de bu gruba kaydet', 'dg-cizgi'], ['vazgec', 'Başka grup seçeceğim', 'dg-ana']] }, c => { if (c === 'evet') { f.dataset.doluOnay = '1'; f.requestSubmit(); } }); }
        { const x = tabanX(), u1 = ucret0(x) - indirimTutar(); if (!f.dataset.tabanOnay && x && x.taban != null && u1 < x.taban) return pencereSor(d, { baslik: 'Ücret taban fiyatın altında', metin: `Kurs ücreti (${tl(u1)}) ${e(listeAdi(x.liste))} taban ücretinin (${tl(x.taban)}) altında. Taban altında ücret, indirim ya da burs MTSK Yönetmeliği md.43/4 gereği işlem sebebidir.`, secenekler: [['evet', 'Yine de kaydet', 'dg-cizgi'], ['vazgec', 'Vazgeç, ücreti düzelteceğim', 'dg-ana']] }, c => { if (c === 'evet') { f.dataset.tabanOnay = '1'; f.requestSubmit(); } }); }
        const s = f.sinif.value, ind = indirimTutar(), tx = tabanX(), u = ucret0(tx) - ind, n = odemeSonra ? 0 : taksitN();
        const p = odemeSonra ? 0 : n ? Math.min(u, tutarOku(f.pesin.value) || 0) : u, yontem = deger('yontem');
        const taksitler = odemeSonra ? [{ vade: gun(7), tutar: u, odendi: null, yontem: null }] : [];
        if (!odemeSonra) taksitBol(u - p, n).forEach((t, i) => taksitler.push({ vade: ayEkle(gun(0), i + 1), tutar: t, odendi: null, yontem: null }));
        const ev2 = {}; EVRAKLAR.forEach(([k]) => { ev2[k] = k === 'sozlesme' ? false : k === 'foto' ? !!foto || f['ev-foto'].checked : f['ev-' + k].checked; });
        const tg = grupDeger(), acil = f.acilAd.value.trim() || f.acilTel.value.trim() ? { ad: f.acilAd.value.trim(), yakinlik: f.acilYakinlik.value.trim(), tel: f.acilTel.value.trim() } : null;
        const ekler = Object.fromEntries([['babaAdi', f.babaAdi.value], ['anaAdi', f.anaAdi.value], ['dogumYeri', f.dogumYeri.value], ['uyruk', f.uyruk.value], ['kimlikSeri', f.kimlikSeri.value.toLocaleUpperCase('tr')], ['kanGrubu', f.kanGrubu.value]].map(([a, v]) => [a, String(v || '').trim()]).filter(([a, v]) => v && !(a === 'uyruk' && v === 'Türkiye')));
        const yeni = { id: yeniId, ad: f.ad.value.trim(), soyad: f.soyad.value.trim(), tel: f.tel.value.trim(), tc: f.tc.value.trim(), dogumTarihi: f.dogumTarihi.value, ogrenim: f.ogrenim.value, adres: f.adres.value.trim(), ...ekler, cinsiyet: deger('cinsiyet'), saglikRapor: f.raporNo.value.trim() || (f.rGece && f.rGece.checked) ? { no: f.raporNo.value.trim(), tarih: f.raporTarih.value ? f.raporTarih.value.split('-').reverse().join('.') : '', ...raporAyrintiOku(f) } : null, adliSicil: f.adliBarkod.value.trim() ? { barkod: f.adliBarkod.value.trim() } : null, mevcutEhliyet: f.mevcut.value, ...(f.mevcut.value ? { oncekiBelge: { sinif: f.mevcut.value, tarih: f.mevcutTarih.value || '', ...(f.mevcutNo.value.trim() ? { no: f.mevcutNo.value.trim() } : {}) }, ...(f.mevcutOtomatik.checked ? { mevcutOtomatik: true } : {}), ...(f.mevcutEski.checked ? { mevcutEski: true } : {}) } : {}), dersKural: 2, deneme: [], acil, teorikGrup: tg, kvkk: { tarih: gun(0), kanal: 'Kursta imzalı form', aydinlatma: true, pazarlama: !!f.pazarlama.checked, whatsapp: !!f.whatsappOnay.checked }, dogum: (f.dogumTarihi.value || '').slice(0, 4), sinif: s, kayit: gun(0), egitmen: f.egitmen.value, asama: Object.values(ev2).every(Boolean) ? 'Teorik' : 'Evrak', teorik: 0, direksiyon: 0, evrak: ev2, mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: u, sozlesme: u, pesin: p, pesinTarih: gun(0), taksitler, ekler: [], indirim: null, ...(odemeSonra ? { planSonra: true } : {}) }, mudurGozetim: { tarih: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '', kanal: 'Kursta kayıt' }, kaynak: f.kaynak.value, yorum: null, notlar: [] };
        if (f.aracKullanabiliyor.checked) yeni.aracKullanabiliyor = true;
        if (foto) { yeni.foto = foto; yeni.fotoTarih = gun(0); }
        if (dfoto) yeni.dogrulamaFoto = { veri: dfoto, tarih: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '', kimlik: !!f.dkimlik.checked };
        if (f.muaf.checked && f.muafTarih.value && GR.muafMi({ muaf: { sonSinav: f.muafTarih.value } }, yeni.kayit)) {
          // son 3 yılda e-sınavı geçen (15/5): teorik eğitim ve sınavdan muaf, yalnız direksiyon sınavına girer
          yeni.muaf = GR.muafKaydi(f.muafTarih.value);
          yeni.esinav = { sonuc: 'Geçti', puan: null, tarih: f.muafTarih.value, muaf: true }; yeni.teorik = SINIFLAR[s].teorik;
        }
        yeni.mebEvrak = ME.evrakOku(f);
        // e-Sınav dili (Y03 kuralının okuduğu alan): Türkçe varsayılan; yabancı dil ya da işaret dili 48 saat önce MEBBİS'e işlenir
        yeni.esinavTercih = { dil: f.esinavDil.value === 'yd' ? f.esinavYabanci.value.trim() : 'Türkçe', isitme: f.esinavDil.value === 'isaret', islendi: null, tarih: gun(0), ...(f.esinavDil.value === 'yd' && f.esinavTercuman.value.trim() ? { tercuman: { ad: f.esinavTercuman.value.trim() } } : {}) };
        if (f.yasIstisna.checked) yeni.yasIstisna = { ...yasIstisnaOku(f, 'yasIstisna'), not: f.yasIstisnaNot.value.trim(), tarih: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '' };
        if (f.adayIptal.checked) yeni.adayIptal = { cezaOdendi: f.adayCeza.checked ? gun(0) : null, tarih: gun(0) };
        // il taban listesindeki satır kayıt anındaki hâliyle saklanır (denetimde dayanak); ekranlar her zaman güncel hesabı gösterir
        if (tx && tx.satir) yeni.taban = { liste: tx.liste.id, satir: tx.satir.id, tutar: tx.taban, ucret: ucret0(tx), tarih: gun(0) };
        if (s === 'B-EN' && f.kendiArac.checked) yeni.kendiArac = { tarih: gun(0) };
        if (s === 'CEZA') yeni.ktk118 = { tarih: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '' };  // 100 ceza puanı eğitimi: KTK md.118 sürücüsü
        GR.aktifEt(yeni);
        import('./zamanlayici.js?v=234').then(m => m.anlikBildirim('o21', { ad: tamAd(yeni), sinif: (SINIFLAR[yeni.sinif] || {}).ad || yeni.sinif, kaydeden: (oturum.kullanici || {}).ad || '' })).catch(() => { });   // MSJ-026
        S.kursiyerler.unshift(yeni); islem('Kursiyer kaydetti', tamAd(yeni) + ' · ' + SINIFLAR[s].ad + (GR.grupBul(yeni.teorikGrup) ? ' · ' + GR.grupBul(yeni.teorikGrup).ad : ' · bekleyen dönem') + (odemeSonra ? ' · ödeme planı sonra' : '') + (yeni.yasIstisna ? ` · yaş istisnası (KTY md.76/3): ${yeni.yasIstisna.tur} · ${yeni.yasIstisna.not}` : ''));
        if (p) S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Kurs ücreti', aciklama: tamAd(yeni) + (n ? ' · peşinat' : ' · peşin ödeme'), tutar: p, yontem, kursiyer: yeni.id });
        if (on.adayId) { const a = S.adaylar.find(x => x.id === on.adayId); if (a) a.asama = 'Kayıt'; }
        removeEventListener('resize', isikKonum);
        kaydet(); kapatPencere();
        location.hash = '#/kursiyer/' + yeni.id;
        HS.karsilama(yeni, { hos: f.hos.checked, hesap: f.hesap.checked, sonra: deger('sozlesmeZaman') === 'sonra' ? () => { } : () => setTimeout(() => sozlesmeImzalat(yeni), 250) });
      });
    },
  });
}

export function kursiyerler(filtre) {
  let sekme = filtre && ASAMALAR.includes(filtre) ? filtre : 'Tümü', q = '', sinif = '', grup = '', hizmet = '', borclu = false, bekleyen = filtre === 'bekleyen';
  // DIG-036: hizmet türü (sürücü kursu, 100 ceza puanı eğitimi, SRC, iş makinesi): kursta birden çok tür varsa süzgeç görünür
  const HIZMET = { ehliyet: 'Sürücü kursu', egitim: '100 ceza puanı eğitimi', src: 'SRC', operator: 'İş makinesi' }, hizmetOf = k => (SINIFLAR[k.sinif] || {}).tur || 'ehliyet';
  const hizmetler = [...new Set(sb(S.kursiyerler).map(hizmetOf))].filter(x => HIZMET[x]);
  const say = a => a === 'Tümü' ? sb(S.kursiyerler).length : sb(S.kursiyerler).filter(k => k.asama === a).length;
  function satirlar() {
    let l = sb(S.kursiyerler).filter(k => (sekme === 'Tümü' || k.asama === sekme) && (!sinif || k.sinif === sinif) && (!hizmet || hizmetOf(k) === hizmet) && (!grup || (grup === '_yok' ? !GR.kursiyerGrubu(k) : k.teorikGrup === grup)) && (!borclu || gecikenler(k).length) && (!bekleyen || GR.bekleyenMi(k)));
    if (q) { const s = q.toLocaleLowerCase('tr'); l = l.filter(k => (tamAd(k) + ' ' + k.tel + ' ' + odemeKodu(k)).toLocaleLowerCase('tr').includes(s)); }
    if (!l.length) return `<tr><td colspan="7">${bos('Bu filtreye uyan kursiyer yok', 'Filtreyi değiştirin ya da yeni kursiyer ekleyin.')}</td></tr>`;
    return l.map(k => {
      const g = gecikenler(k), sd = sonrakiDers(k), S0 = SINIFLAR[k.sinif];
      return `<tr class="tik" data-git="${k.id}" tabindex="0">
        <td class="m-tam"><div class="kisi">${avatar(k.ad, k.soyad, k.foto)}<div><b>${e(tamAd(k))}${mudurMu() && ozelNotlar(k).length ? `<span class="ozel-isaret" title="Özel not var">${ik('kilit')}</span>` : ''}</b><small><span class="num">${e(k.tel)}</span></small></div></div></td>
        <td class="m-gizle">${rozet(S0.ad.split(' ·')[0])} <small style="color:var(--soluk)">${S0.ad.split('· ')[1]}</small>${GR.kursiyerGrubu(k) ? `<small style="display:block;color:var(--soluk);font-size:12px">${e(GR.kursiyerGrubu(k).ad)}</small>` : ''}</td>
        <td style="min-width:150px">${yol(asamaNo(k))}<small style="color:var(--soluk);font-size:12px">${k.asama}${GR.bekleyenMi(k) ? ' · <b style="color:var(--sari-koyu,#a15c00)">bekleyen</b>' : ''}${k.muaf ? ' · muaf' : esinavsizBelgeli(k) ? ' · belgeli' : ''}${k.dsinav && k.dsinav.sonuc === 'Kaldı' ? ' · tekrar' : ''}${k.kapali ? ' · <b style="color:var(--kirmizi)">' + (k.kapali.tur === 'dondur' ? 'donduruldu' : 'kayıt kapalı') + '</b>' : ''}</small></td>
        <td class="m-gizle" style="min-width:110px">${!gerekliDireksiyon(k) ? `<small style="color:var(--soluk)">${egitimSinifi(k.sinif) ? 'Eğitim · teorik ' + (k.teorik || 0) + '/' + ((SINIFLAR[k.sinif] || {}).teorik || 0) : 'direksiyon yok'}</small>` : `<span class="sayi" style="font-size:12.5px">${k.direksiyon}/${gerekliDireksiyon(k)}</span>${ilerleme(k.direksiyon, gerekliDireksiyon(k), k.direksiyon >= gerekliDireksiyon(k) ? 'yesil' : '')}`}</td>
        <td>${kalanBorc(k) ? `<span class="sayi">${tl(kalanBorc(k))}</span>${g.length ? '<br>' + rozet(g.length + ' taksit gecikti', 'kirmizi') : ''}` : rozet('Ödendi', 'yesil')}</td>
        <td class="m-gizle">${(() => { const r = risk(k); if (!r) return '<span style="color:var(--soluk)">—</span>'; const renk = r.puan >= 50 ? 'var(--kirmizi)' : r.puan >= 25 ? 'var(--sari)' : 'var(--yesil)'; return `<span class="risk-cubuk" title="${e(r.nedenler.join(', ') || 'Risk yok')}"><i style="width:${Math.max(6, r.puan)}%;background:${renk}"></i></span> <small style="color:var(--soluk)">${r.puan >= 50 ? 'Yüksek' : r.puan >= 25 ? 'Orta' : 'Düşük'}</small>`; })()}</td>
        <td class="m-gizle">${sd ? goreli(sd.tarih) + ' <span class="mono">' + sd.saat + '</span>' : '<span style="color:var(--soluk)">—</span>'}</td>
      </tr>`;
    }).join('');
  }
  return {
    baslik: 'Kursiyerler', alt: sb(S.kursiyerler).length + ' kayıt · ' + aktifler().length + ' aktif',
    html: `${ekranNotu('Her kursiyerin nerede olduğu, ne kadar borcu kaldığı ve sınavda kalma riski tek satırda. Satıra dokunun, dosyası açılsın.')}
    <div class="bolum-bas"><div><h2>Kursiyer listesi</h2></div><div class="sag">${['mudur', 'sekreter'].includes(oturum.kullanici.rol) ? `<button class="dg dg-cizgi" data-toplu-hesap>${ik('tel')}Öğrenci hesapları</button>` : ''}<button class="dg dg-cizgi" data-disa>${ik('indir')}Excel’e aktar</button><button class="dg dg-ana" data-yeni>${ik('arti')}Yeni kursiyer</button></div></div>
    <div data-yarim-kap>${yarimKayitlar()}</div>
    <div id="sek">${sekmeler([['Tümü', 'Tümü', say('Tümü')], ...ASAMALAR.map(a => [a, a, say(a)])], sekme)}</div>
    <div class="kart">
      <div class="filtre">
        <div class="ara-kutu">${ik('ara')}<input class="girdi" type="search" placeholder="Ad ya da telefon" data-q aria-label="Kursiyer ara"></div>
        ${hizmetler.length > 1 ? `<select class="girdi" data-hizmet aria-label="Hizmet türü"><option value="">Bütün hizmetler</option>${hizmetler.map(x => `<option value="${x}">${HIZMET[x]} (${sb(S.kursiyerler).filter(k => hizmetOf(k) === x).length})</option>`).join('')}</select>` : ''}
        <select class="girdi" data-sinif aria-label="Sınıf"><option value="">Tüm sınıflar</option>${aktifSiniflar().map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select>
        ${(S.gruplar || []).length ? `<select class="girdi" data-grup aria-label="Dönem grubu"><option value="">Tüm gruplar</option><option value="_yok">Gruba atanmamış</option>${[...S.gruplar].sort((a, b) => String(b.baslangic || '').localeCompare(String(a.baslangic || ''))).map(g => `<option value="${e(g.id)}">${e(g.ad)}${g.sinif && SINIFLAR[g.sinif] ? ' · ' + e(SINIFLAR[g.sinif].ad.split(' ·')[0]) : ''} (${sb(S.kursiyerler).filter(x => x.teorikGrup === g.id).length})</option>`).join('')}</select>` : ''}
        <button class="cip" data-borclu>${ik('uyari')}&nbsp;Taksiti gecikenler</button>
        <button class="cip" data-bekleyen title="Kaydı yapıldı; dönem grubuna atanmadı ya da evrakı eksik">${ik('saat')}&nbsp;Bekleyenler (${sb(S.kursiyerler).filter(GR.bekleyenMi).length})</button>
      </div>
      <div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Sınıf</th><th>Aşama</th><th>Direksiyon</th><th>Kalan ödeme</th><th>Sınav riski</th><th>Sonraki ders</th></tr></thead><tbody id="tb">${satirlar()}</tbody></table></div>
    </div>`,
    baglan(k) {
      const tb = k.querySelector('#tb'), ciz = () => tb.innerHTML = satirlar();
      k.addEventListener('click', ev => {
        const s = ev.target.closest('[data-sekme]'); if (s) { sekme = s.dataset.sekme; k.querySelector('#sek').innerHTML = sekmeler([['Tümü', 'Tümü', say('Tümü')], ...ASAMALAR.map(a => [a, a, say(a)])], sekme); ciz(); }
        const g = ev.target.closest('[data-git]'); if (g) location.hash = '#/kursiyer/' + g.dataset.git;
        if (ev.target.closest('[data-yeni]')) kursiyerFormu();
        if (yarimKayitTikla(ev)) return;
        const b = ev.target.closest('[data-borclu]'); if (b) { borclu = !borclu; b.classList.toggle('secili', borclu); ciz(); }
        const bk = ev.target.closest('[data-bekleyen]'); if (bk) { bekleyen = !bekleyen; bk.classList.toggle('secili', bekleyen); ciz(); }
        if (ev.target.closest('[data-toplu-hesap]')) return HS.topluHesap(yenile);
        if (ev.target.closest('[data-disa]')) import('./ui.js?v=234').then(u => { u.csvIndir('kursiyerler.csv', [['Ad', 'Soyad', 'Telefon', 'Sınıf', 'Dönem grubu', 'Aşama', 'Kayıt', 'Direksiyon', 'Toplam', 'Ödenen', 'Kalan'], ...S.kursiyerler.map(x => [x.ad, x.soyad, x.tel, SINIFLAR[x.sinif].ad, (GR.kursiyerGrubu(x) || {}).ad || '', x.asama, x.kayit, x.direksiyon, x.odeme.toplam, odenen(x), kalanBorc(x)])]); bildir('Kursiyer listesi indirildi'); });
      });
      k.addEventListener('keydown', ev => { const g = ev.target.closest('[data-git]'); if (g && ev.key === 'Enter') location.hash = '#/kursiyer/' + g.dataset.git; });
      k.querySelector('[data-q]').addEventListener('input', ev => { q = ev.target.value; ciz(); });
      k.querySelector('[data-sinif]').addEventListener('change', ev => { sinif = ev.target.value; ciz(); });
      { const h = k.querySelector('[data-hizmet]'); if (h) h.addEventListener('change', ev => { hizmet = ev.target.value; ciz(); }); }
      const gs = k.querySelector('[data-grup]'); if (gs) gs.addEventListener('change', ev => { grup = ev.target.value; ciz(); });
    },
  };
}

// md.16/2 teorik ders muafiyeti (TEO-006): okul belgesi ya da geçerli ilk yardımcı sertifikası; istemesi hâlinde dersten muaf, sınava girer
function teorikMuafPenceresi(k) {
  const m = k.teorikDersMuaf || { dersler: [] };
  pencere({
    baslik: 'Teorik ders muafiyeti · ' + tamAd(k),
    icerik: `<p style="font-size:14px;margin-bottom:12px">MTSK Yön. md.16/2: üniversite, yüksekokul, lise ve dengi okullarda zorunlu trafik ve çevre, ilk yardım ve araç tekniği derslerinden başarılı olduğunu belgeleyen kursiyer o derslerden; geçerli ilk yardımcı sertifikası olan ilk yardım dersinden <b>istemesi hâlinde</b> eğitime girmez, <b>sınava girer</b>.</p>
      <div class="secim" style="display:grid;gap:8px">${TEORIK_MUAF_DERS.map(([id, ad, sa]) => `<label><input type="checkbox" name="d" value="${id}" ${m.dersler.includes(id) ? 'checked' : ''}><span>${ad} <small style="color:var(--soluk)">${sa} saat</small></span></label>`).join('')}</div>
      <div class="alan" style="margin-top:12px"><label>Belge</label><input name="belge" maxlength="160" value="${e(m.belge || '')}" placeholder="Ör. lise transkripti, ilk yardımcı sertifikası no ve geçerlilik"></div>
      <p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>Belgenin örneği öğrenci dosyasında saklanır; teorik saat ve e-sınav uygunluğu buna göre hesaplanır.</span></p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => {
      const dl = [...d.querySelectorAll('[name=d]:checked')].map(x => x.value), belge = d.querySelector('[name=belge]').value.trim();
      if (dl.length && belge.length < 3) return bildir('Muafiyetin dayandığı belgeyi yazın', 'uyari');
      if (dl.length) k.teorikDersMuaf = { dersler: dl, belge, tarih: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '' }; else delete k.teorikDersMuaf;
      islem('Teorik ders muafiyetini işledi', tamAd(k) + ' · ' + (dl.length ? TEORIK_MUAF_DERS.filter(([id]) => dl.includes(id)).map(x => x[1]).join(', ') + ' · ' + belge : 'kaldırıldı')); kaydet(); kapatPencere(); bildir(dl.length ? `Teorik saat ${teorikSaat(k)} oldu` : 'Teorik ders muafiyeti kaldırıldı', 'tamam'); yenile(); }); },
  });
}

/* ================= KURSİYER DOSYASI ================= */
let profilSekme = 'genel';
// Ehliyet aşaması: sınavı geçti → MEBBİS'te sertifika → borç kapandı → dosya arşivlendi
function kapanisKart(k) {
  const kp = k.kapanis || (k.kapanis = {}), borc = kalanBorc(k);
  const adim = (ok, b, a, eylem) => `<li style="display:flex;gap:10px;align-items:flex-start">${isaret(ok ? 'tamam' : 'zorunlu', 20)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--soluk)">${a}</small></div>${eylem || ''}</li>`;
  return `<div class="kart" style="grid-column:1/-1"><div class="kart-bas"><h3>Dosya kapanışı</h3><small>${kp.arsiv ? 'Arşivde · ' + tarih(kp.arsiv) : 'Ehliyete giden son adımlar'}</small></div><div class="kart-govde"><ul style="list-style:none;display:grid;gap:12px">
    ${egitimSinifi(k.sinif) ? adim(true, 'Teorik eğitimin tamamına devam etti', `${k.teorik || 0}/${(SINIFLAR[k.sinif] || {}).teorik || 0} saat · devamsızlık hakkı yok (MTSK md.16/3)`) : adim(true, 'Uygulama sınavını geçti', k.dsinav ? tarihUzun(k.dsinav.tarih) + ' · ' + k.dsinav.hak + '. hak' : '')}
    ${egitimSinifi(k.sinif) ? adim(!!kp.sertifika, 'Eğitim belgesi verildi', kp.sertifika ? tarih(kp.sertifika) + ' · sürücü belgesinin iadesi için belgeyi kursiyere verin (KTY md.167)' : 'Kurs müdürlüğünün eğitim belgesini düzenleyip verin, sonra işaretleyin.', kp.sertifika ? '' : '<button class="dg dg-ana dg-kucuk" data-kapanis="sertifika">Verildi</button>') : adim(!!kp.sertifika, 'MEBBİS’te sertifika düzenlendi', kp.sertifika ? tarih(kp.sertifika) + ' · kursiyere nüfus müdürlüğü randevusu bildirildi' : 'MEBBİS › Sertifika işlemleri’nde düzenleyin, sonra işaretleyin.', kp.sertifika ? '' : '<button class="dg dg-ana dg-kucuk" data-kapanis="sertifika">Düzenlendi</button>')}
    ${adim(!borc, 'Ödeme kapandı', borc ? tl(borc) + ' borç kaldı; arşivden önce tahsil edin.' : 'Borç yok', borc ? '<button class="dg dg-cizgi dg-kucuk" data-psekme="odeme">Ödemeler</button>' : '')}
    ${adim(k.yorum === 'yapti', 'Google yorumu', k.yorum === 'yapti' ? 'Yorum yaptı' : 'Yorum isteği gönderildi; zorunlu değil.')}
    ${adim(!!kp.arsiv, 'Dosya arşivlendi', kp.arsiv ? `${tarih(kp.arsiv)} · ${S.kurs.saklamaYil} yıl saklanır` : 'Evrak ve takip formları arşive kaldırılır, kursiyer aktif listeden çıkar.', kp.arsiv ? '' : `<button class="dg ${kp.sertifika && !borc ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" data-kapanis="arsiv">Arşivle</button>`)}
  </ul></div></div>`;
}
function kapanisAdim(k, adim) {
  const kp = k.kapanis || (k.kapanis = {});
  if (adim === 'sertifika') { kp.sertifika = gun(0); islem('Sertifika düzenlendi işaretledi', tamAd(k)); kaydet(); wpGonder(k, egitimSinifi(k.sinif) ? `${selam(k)} eğitiminiz tamamlandı. Eğitim belgenizi kurstan alabilirsiniz; geri alma süresi bitince sürücü belgenizin iadesinde bu belge istenir.` : `${selam(k)} tebrikler! Sertifikanız MEBBİS’te düzenlendi. Nüfus müdürlüğünden randevu alıp kimliğinizle sürücü belgenizi teslim alabilirsiniz.`, egitimSinifi(k.sinif) ? 'Eğitim belgesi' : 'Sertifika bildirimi'); return yenile(); }
  if (adim === 'arsiv') {
    const eksik = [!kp.sertifika && 'sertifika işaretlenmedi', kalanBorc(k) && tl(kalanBorc(k)) + ' borç var'].filter(Boolean);
    const yap = () => { kp.arsiv = gun(0); islem('Dosyayı arşivledi', tamAd(k)); kaydet(); kapatPencere(); bildir('Dosya arşivlendi'); yenile(); };
    if (!eksik.length) return yap();
    pencere({ baslik: 'Yine de arşivlensin mi?', icerik: `<div class="ipucu uyari">${isaret('uyari', 20)}<span>${e(eksik.join(', '))}.</span></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Arşivle</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', yap); } });
  }
}
// Sınav hakkı dolan kursiyer (MTSK md.15): e-sınavda 4 hak bitince yeniden kayıt. Uygulamada ilk 4 hak bitince son sonuçtan itibaren
// 60 gün içinde başvurup sınıfın direksiyon saati kadar ders alana 4 hak daha (15/4); sekiz hak bitince yeniden kayıt, 3 yıl içinde teorikten muaf (15/5).
// Son gün kural motorundan (kurallar.js ikinciHakSonGun): son sınav tarihi kayıtlı değilse null döner, bugünden sayılmaz
const ikinciHakAcik = k => k.hakBitti && k.hakBitti.tur === 'Direksiyon' && !k.ikinciHak;
function hakBittiKart(k) {
  const ilk = ikinciHakAcik(k), son = ilk ? KR.ikinciHakSonGun(k) : null, gecti = son && fark(son) < 0, n = sinavHakSiniri(k, k.hakBitti.tur), bilinmiyor = ilk && !son;
  return `<div class="kart" style="grid-column:1/-1;border-color:var(--kirmizi)"><div class="kart-bas"><h3>${e(k.hakBitti.tur)} ${ilk ? 'ilk dört hakkı' : 'hakkı'} doldu</h3><small>${n} hakkın tamamı kullanıldı${k.hakBitti.tarih ? ' · ' + tarih(k.hakBitti.tarih) : ''}</small></div><div class="kart-govde">
    <p style="font-size:14px;margin-bottom:12px">${ilk ? (bilinmiyor ? `Son uygulama sınavının tarihi kayıtlı değil; ikinci dört hak için ${IKINCI_HAK_GUN} günlük başvuru süresi hesaplanamadı. Süre son sınav sonucundan sayılır (MTSK md.15/4); tarihi MEBBİS’ten kontrol edin. Süre içindeyse kursiyer başvurup sınıfın direksiyon saati kadar ders alırsa <b>dört sınav hakkı daha</b> kazanır.` : gecti ? `İkinci dört hak için başvuru süresi ${tarih(son)} tarihinde doldu (son sonuçtan itibaren ${IKINCI_HAK_GUN} gün, MTSK md.15/4). Kursiyer yeni dönem kaydı yaptırmalı; 3 yıl içinde kaydolursa teorik eğitim ve sınavdan muaftır (md.15/5).` : `Kursiyer <b>${tarih(son)}</b> tarihine kadar (${fark(son)} gün) başvurup sınıfın direksiyon saati kadar ders alırsa <b>dört sınav hakkı daha</b> kazanır (MTSK md.15/4). İsterse kalan haklarından vazgeçip başka kursa nakil olabilir (md.13/2) ya da ikinci dört hakta diğer şanzımanla (manuelden otomatiğe ya da tersi) devam edebilir; şanzıman değişikliği Özel MTSK Modülü’ne işlenir (md.15/6).`) : k.hakBitti.tur === 'Direksiyon' ? 'Sekiz uygulama sınavı hakkı bitti. Kursiyer yeni dönem kaydı yaptırmalı; 3 yıl içinde kaydolursa teorik eğitim ve sınavdan muaftır (md.15/5).' : 'Dört e-sınav hakkı bitti. Kursiyer bu sınava yeniden girebilmek için yeni dönem kaydı yaptırmalı (md.15/1).'} Kararı verin; kursiyere WhatsApp’tan bilgi gider.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${ilk && !gecti ? '<button class="dg dg-ana dg-kucuk" data-hak-karar="ikinci">İkinci dört hakkı başlat</button>' : ''}<button class="dg ${ilk && !gecti ? 'dg-cizgi' : 'dg-ana'} dg-kucuk" data-hak-karar="yeniden">Yeniden kayıt aç</button>${ilk && !gecti ? '<button class="dg dg-cizgi dg-kucuk" data-hak-karar="nakil">Başka kursa nakil</button>' : ''}<button class="dg dg-cizgi dg-kucuk" data-hak-karar="kapat">Kaydı kapat</button>${ilk && !gecti ? (k.hakBitti.istemiyor ? `<small style="align-self:center;color:var(--soluk)">İkinci hakkı istemiyor (${tarih(k.hakBitti.istemiyor)}); hatırlatma gitmez</small>` : '<button class="dg dg-hafif dg-kucuk" data-hak-karar="istemiyor" title="Öğrenci ikinci dört hakkı istemediğini söyledi: otomatik hatırlatma (o17) gitmez">İstemiyor</button>') : ''}</div></div></div>`;
}
function hakKarar(k, karar, ucret) {
  // md.13/2: kalan haklardan vazgeçip başka kursa nakil; kayıt "kurstan ayrıldı" olarak kapatılır (neden hazır gelir, müdür değiştirebilir)
  if (karar === 'nakil') return kayitKapat(k, 'Başka kursa nakil (MTSK md.13/2)');
  // MSJ-016: öğrenci ikinci dört hakkı istemedi → o17 hatırlatması gitmez (kayıt açık kalır; karar değişirse 'İkinci dört hakkı başlat' yine çalışır)
  if (karar === 'istemiyor') { k.hakBitti.istemiyor = gun(0); islem('İkinci dört hakkı istemediğini kaydetti', tamAd(k)); kaydet(); bildir('Kaydedildi; ikinci hak hatırlatması gitmeyecek'); return yenile(); }
  if (karar === 'ikinci') { const taban = (() => { const x = { ...k }; delete x.ikinciHak; return gerekliDireksiyon(x); })(), oner = taban * ekDersFiyat(k.sinif); return pencere({
    baslik: 'İkinci dört hak · ' + tamAd(k),
    icerik: `<p style="font-size:14px;margin-bottom:12px">MTSK md.15/4: kursiyer son sınav sonucundan itibaren ${IKINCI_HAK_GUN} gün içinde başvurur, ilan edilen ders ücretini öder ve sınıfının direksiyon saati kadar (<b>${taban} ders</b>) yeniden ders alır; ardından dört sınav hakkı daha verilir. Ders sayacı ${k.direksiyon}/${k.direksiyon + taban} olur.</p><div class="alan"><label>Ders ücreti (₺) · ödeme planına ek kalem</label><input class="girdi" name="u" inputmode="numeric" value="${oner || ''}"></div><p class="ipucu" style="margin-top:12px">${isaret('bilgi', 18)}<span>Başvuru MEBBİS Özel MTSK Modülü’ne işlenir; dört yeni hakkı il MEM açar.</span></p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Başvuruyu kaydet</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { const u = tutarOku(d.querySelector('[name=u]').value); { const t1 = ekDersTabani(); if (u && t1 && u < taban * t1 && !confirm(`Ücret (${tl(u)}) ${taban} ders × il tabanı ${tl(t1)} = ${tl(taban * t1)} tutarının altında. İlan edilen ders ücretiyle alınır (MTSK md.15/4); yine de kaydedilsin mi?`)) return; }
      geriAlNoktasi(); if (u) { k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: 'İkinci dört hak · ' + taban + ' direksiyon dersi', tutar: u, odendi: null, tur: 'ders' }); }
      k.ikinciHak = { tarih: gun(0), sonSonuc: k.hakBitti.tarih, onceki: k.direksiyon, hedef: k.direksiyon + taban }; k.hakBitti.cozuldu = 'ikinci'; k.asama = 'Direksiyon';
      islem('İkinci dört hak başvurusunu kaydetti', tamAd(k) + ' · ' + taban + ' ders' + (u ? ' · ' + tl(u) : '')); kaydet(); kapatPencere();
      wpGonder(k, `${selam(k)} ikinci dört uygulama sınavı hakkı başvurunuzu aldık. Sınıfınızın direksiyon saati kadar (${taban} ders) yeniden ders alacaksınız${u ? '; ders ücreti ' + tl(u) : ''}. Ders saatlerinizi birlikte planlayalım.`, 'İkinci dört hak');
      yenile(); }); },
  }); }
  if (karar === 'yeniden') return pencere({
    baslik: 'Yeniden kayıt · ' + tamAd(k),
    icerik: `<p style="font-size:14px;margin-bottom:12px">Yeni dönem kaydı ödeme planına ek kalem olarak eklenir; MEBBİS kaydı yenilenmek üzere kuyruğa düşer.</p><div class="alan"><label>Yeniden kayıt ücreti (₺)</label><input name="u" inputmode="numeric" placeholder="Kursun yeniden kayıt ücreti"></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydı aç</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { const u = tutarOku(d.querySelector('[name=u]').value); if (!u) return bildir('Ücreti girin', 'uyari'); kapatPencere(); hakKarar(k, 'yeniden-onay', u); }); },
  });
  geriAlNoktasi();
  if (karar === 'yeniden-onay') {
    k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: 'Yeniden kayıt (' + k.hakBitti.tur + ')', tutar: ucret, odendi: null, tur: 'ders' });
    if (k.hakBitti.tur === 'e-Sınav') { k.esinav = null; k.asama = 'Teorik'; } else { k.dsinav = null; k.asama = 'Direksiyon'; delete k.ikinciHak; }
    k.hakBitti.cozuldu = 'yeniden'; k.mebIslendi = false;
    islem('Yeniden kayıt açtı', tamAd(k) + ' · ' + tl(ucret)); kaydet();
    wpGonder(k, `${selam(k)} ${k.hakBitti.tur.toLowerCase()} için yeni dönem kaydınızı açtık. Yeniden kayıt ücreti ${tl(ucret)}; MEBBİS kaydınız yenilenecek.`, 'Yeniden kayıt');
  } else { k.hakBitti.cozuldu = 'kapandı'; k.kapanis = { arsiv: gun(0), neden: k.hakBitti.tur + ' hakkı doldu' }; k.kapali = { tur: 'hak', tarih: gun(0), neden: k.hakBitti.tur + ' sınav hakkı doldu', kim: oturum.kullanici ? oturum.kullanici.ad : '', iptalTutar: 0 }; /* ehliyet almış sayılmaz; kayıt kapalı, açık taksitler müdürün kararına kalır */ islem('Kaydı kapattı', tamAd(k) + ' · hak doldu'); kaydet(); bildir('Kayıt kapatıldı ve arşive alındı'); }
  yenile();
}
// Aşama geçişinin ön koşulları; müdür gerekçe yazıp geçebilir
const ASAMA_SART = {
  Evrak: k => null,
  Teorik: k => eksikEvrak(k).length ? 'Evrak eksik: ' + eksikEvrak(k).map(x => x[1].toLocaleLowerCase('tr')).join(', ') : null,
  Direksiyon: k => SINIFLAR[k.sinif].direksiyon === 0 ? 'Bu sınıfta direksiyon eğitimi yok; e-sınavı geçince doğrudan “Ehliyet”e geçer.' : !(k.esinav && k.esinav.sonuc === 'Geçti') ? 'e-Sınavı geçmedi' : null,
  Sınav: k => { const ds = dersSayaci(k); return ds.zorunlu.yapildi < ds.gerekli ? `Zorunlu direksiyon dersleri tamamlanmadı (${ds.zorunlu.yapildi}/${ds.gerekli})` : null; },
  Ehliyet: k => SINIFLAR[k.sinif].direksiyon === 0 ? (!(k.esinav && k.esinav.sonuc === 'Geçti') ? 'e-Sınavı geçmedi' : null) : !(k.dsinav && k.dsinav.sonuc === 'Geçti') ? 'Uygulama sınavını geçmedi' : null,
};
function asamaIlerlet(k) {
  const i = asamaNo(k); if (i >= ASAMALAR.length - 1) return;
  let hedef = ASAMALAR[i + 1];
  if (SINIFLAR[k.sinif].direksiyon === 0 && k.asama === 'Teorik' && k.esinav && k.esinav.sonuc === 'Geçti') hedef = 'Ehliyet';
  const sorun = ASAMA_SART[hedef] && ASAMA_SART[hedef](k);
  const gec = (not) => { geriAlNoktasi(); k.asama = hedef; if (hedef === 'Ehliyet') { k.kapanis = k.kapanis || {}; } islem('Aşama değiştirdi', tamAd(k) + ' → ' + hedef + (not ? ' · ' + not : '')); kaydet(); bildir(tamAd(k) + ' → ' + hedef, 'tamam', true); yenile(); };
  if (!sorun) return gec();
  pencere({
    baslik: hedef + ' aşamasına geçiş',
    icerik: `<div class="ipucu uyari" style="margin-bottom:12px">${isaret('dur', 22)}<span>${e(sorun)}</span></div>${mudurMu() ? `<div class="alan"><label>Yine de geçirmek için gerekçe (işlem geçmişine yazılır)</label><input class="girdi" data-gerekce placeholder="Örn. evrak aslı kursta, sisteme sonra işlenecek"></div>` : '<p style="font-size:14px">Ön koşul tamamlanınca geçebilirsiniz. Gerekirse kurs müdürü gerekçe yazarak geçirebilir.</p>'}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${mudurMu() ? '<button class="dg dg-ana" data-k>Gerekçeyle geçir</button>' : ''}`,
    onAc(d) { const b = d.querySelector('[data-k]'); if (b) b.addEventListener('click', () => { const g = d.querySelector('[data-gerekce]').value.trim(); if (g.length < 5) return bildir('Gerekçe yazın', 'uyari'); kapatPencere(); gec('gerekçe: ' + g); }); },
  });
}
// Kaydı kapatma (kurstan ayrıldı) ya da dondurma: planlı dersler ve sınav listeleri temizlenir. onNeden: neden kutusuna hazır yazılan metin (ör. nakil)
function kayitKapat(k, onNeden = '') {
  const planli = kursiyerDersleri(k.id).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0);
  const acik = k.odeme.taksitler.filter(t => !t.odendi && !t.iptal), acikTutar = acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
  const S0 = SINIFLAR[k.sinif], yapilan = kursiyerDersleri(k.id).filter(d => d.durum === 'Yapıldı').length;
  const yi = MZ.yasalIade(k), iadeOneri = k.ucretsiz ? 0 : yi.iade;
  pencere({
    baslik: 'Kaydı kapat · ' + tamAd(k),
    icerik: `<div class="secim" style="margin-bottom:12px"><label><input type="radio" name="tur" value="kapat" checked><span>Kurstan ayrıldı</span></label><label><input type="radio" name="tur" value="dondur"><span>Dondur (sonra devam edecek)</span></label>${mudurMu() ? '<label><input type="radio" name="tur" value="sil"><span>Yanlış ya da deneme kaydı: tamamen sil</span></label>' : ''}</div>
      <p class="ipucu uyari" data-sil-bilgi hidden style="margin-bottom:12px">${isaret('uyari', 18)}<span>Kayıt; dersleri, sınav listeleri ve öğrenci hesabıyla birlikte kalıcı olarak silinir. Alınmış ödemeler kasada ve makbuz serisinde “silinen öğrenci” adıyla kalır. Gerçek öğrenciler için kullanmayın; MEB kayıtları silinmemelidir.</span></p>
      <div class="alan"><label>Neden</label><input class="girdi" data-neden value="${e(onNeden)}" placeholder="Örn. şehir değiştirdi, başka kursa nakil (md.13/2)"></div>
      <ul class="liste" style="margin-top:12px;font-size:14px"><li>${isaret('bilgi', 20)}<span>${planli.length} planlı direksiyon dersi iptal edilir; usta öğretici bilgilendirilir.</span></li>
        <li data-kapat-bilgi>${isaret('bilgi', 20)}<span>${acik.length} açık taksit (${tl(acikTutar)}) iptal edilir.</span></li>
        </ul>${k.ucretsiz ? '' : `<div data-kapat-bilgi style="margin-top:12px"><b style="color:var(--murekkep);display:block;margin-bottom:6px">Yasal iade hesabı (Özel Öğretim Kurumları Yönetmeliği m.56)</b>${MZ.iadeTablosu(yi)}<button class="dg dg-cizgi dg-kucuk" style="margin-top:8px" data-iade-yazdir type="button">${ik('belge')}Hesabı yazdır</button></div>`}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydı kapat</button>`,
    onAc(d) {
      const iy = d.querySelector('[data-iade-yazdir]'); if (iy) iy.addEventListener('click', () => MZ.iadeBelgesi(k, yi));
      d.querySelectorAll('[name=tur]').forEach(r => r.addEventListener('change', () => { const tv = d.querySelector('[name=tur]:checked').value, kp = tv === 'kapat'; d.querySelectorAll('[data-kapat-bilgi]').forEach(x => { x.hidden = !kp; }); d.querySelector('[data-sil-bilgi]').hidden = tv !== 'sil'; d.querySelector('[data-k]').textContent = kp ? 'Kaydı kapat' : tv === 'sil' ? 'Kalıcı olarak sil' : 'Dondur'; }));
      d.querySelector('[data-k]').addEventListener('click', () => {
        const tur = d.querySelector('[name=tur]:checked').value, neden = d.querySelector('[data-neden]').value.trim();
        if (neden.length < 3) return bildir('Neden yazın', 'uyari');
        if (tur === 'sil') return pinSor('Kaydı tamamen silmek').then(onay => { if (onay) kayitSilIslem(k, neden); });
        pinSor(tur === 'kapat' ? 'Kaydı kapatmak' : 'Kaydı dondurmak').then(onay => {
          if (!onay) return;
          geriAlNoktasi();
          const hocalar = [...new Set(planli.map(x => x.egitmen))].map(egitmen).filter(Boolean);
          S.dersler = S.dersler.filter(x => !planli.includes(x));
          S.sinavlar.filter(s => fark(s.tarih) >= 0 && !Object.keys(s.sonuc || {}).length).forEach(s => { s.kursiyerler = s.kursiyerler.filter(x => x !== k.id); });
          S.bekleme = (S.bekleme || []).filter(b => b.kursiyer !== k.id);
          if (tur === 'kapat') { k.odeme.sozlesme = MZ.sozlesmeUcreti(k); acik.forEach(t => { t.iptal = gun(0); }); k.odeme.toplam -= acikTutar; }
          k.kapali = { tur, tarih: gun(0), neden, kim: oturum.kullanici ? oturum.kullanici.ad : '', iptalTutar: tur === 'kapat' ? acikTutar : 0, ...(tur === 'kapat' && iadeOneri ? { iadeTutar: iadeOneri, iadeSon: gun(30) } : {}) };
          if (tur === 'kapat' && k.hakBitti && !k.hakBitti.cozuldu) k.hakBitti.cozuldu = 'kapandı';  // hak bitti kartından nakil ya da kapatma
          islem(tur === 'kapat' ? 'Kaydı kapattı' : 'Kaydı dondurdu', tamAd(k) + ' · ' + neden); kaydet(); yenile();
          bildir(tamAd(k) + (tur === 'kapat' ? ' kaydı kapatıldı' : ' kaydı donduruldu'));
          if (hocalar.length) bildirimler(hocalar.map(h => ({ kim: h, metin: `${h.ad.split(' ')[0]} Hoca, ${tamAd(k)} ${tur === 'kapat' ? 'kurstan ayrıldı' : 'kaydını dondurdu'}; ${planli.filter(x => x.egitmen === h.id).map(x => tarih(x.tarih) + ' ' + x.saat).join(', ')} dersleri iptal edildi.`, tur: 'Ders iptali' })), 'Dersler iptal edildi');
          if (tur === 'kapat' && iadeOneri) setTimeout(() => odemeIslem(k, 'iade', iadeOneri), 600);
        });
      });
    },
  });
}
// Öğrenciye özgü asgari direksiyon ders sayısı: il MEM tablosu farklıysa (ör. otomatikten manuele yarı süre) müdür elle girer
// Kursiyer dosyası › Bilgiler: il taban listesindeki satır, taban ve sözleşme ücreti (liste yoksa boş)
// sat verilirse öğrenci dosyasının satır biçiminde (kd-satir), verilmezse bilgi tablosu (dt/dd) biçiminde döner
function tabanBilgi(k, sat) {
  const x = kursiyerTaban(k); if (!x) return '';
  const sar = ic => sat ? sat('Taban ücret', ic) : `<dt>Taban ücret</dt><dd>${ic}</dd>`;
  if (!x.satir) return sar(`<span style="color:var(--turuncu)">${e(x.neden)}</span> <small style="color:var(--soluk)">${e(listeAdi(x.liste))}</small>`);
  const u = MZ.sozlesmeUcreti(k), alt = !k.ucretsiz && u < x.taban;
  return sar(`<b class="sayi">${tl(x.taban)}</b> · “${e(satirAdi(x.satir))}” <small style="color:var(--soluk)">${e(listeAdi(x.liste))}${x.saat ? ` · listede ${x.saat} ders` : ''}</small>${alt ? `<small style="display:block;color:var(--kirmizi);font-weight:700">Sözleşme ücreti ${tl(u)}: tabanın altında (MTSK Yön. md.43/4)</small>` : ''}${x.tabanNot ? `<small style="display:block;color:var(--soluk)">${e(x.tabanNot)}</small>` : ''}`);
}
function gerekliElleDuzenle(k) {
  if (!mudurMu()) return bildir('Ders sayısını yalnız kurs müdürü değiştirir', 'uyari');
  const elle = k.gerekliElle != null && k.gerekliElle !== '', hes = (() => { const x = { ...k }; delete x.gerekliElle; return direksiyonAyrinti(x); })(), tx = kursiyerTaban(k);
  pencere({
    baslik: 'Direksiyon ders sayısı · ' + tamAd(k),
    icerik: `<p style="font-size:14px;margin-bottom:12px">Hesaplanan: <b>${hes.saat} ders</b> · ${e(hes.kaynak)}${hes.teyit ? ' <b style="color:var(--turuncu)">· teyit bekliyor</b>' : ''}</p>
      ${tx && tx.satir && tx.saat ? `<p class="ipucu" style="margin-bottom:12px">${isaret('bilgi', 18)}<span style="flex:1">${e(listeAdi(tx.liste))}, “${e(satirAdi(tx.satir))}” satırı: <b>${tx.saat} ders</b>.${tx.saat !== hes.saat ? ` <button type="button" class="dg dg-cizgi dg-kucuk" data-il-saat>Listedeki sayıyı yaz</button>` : ''}</span></p>` : ''}
      <div class="alan"><label>Bu öğrencinin asgari direksiyon dersi</label><input class="girdi" name="n" inputmode="numeric" value="${elle ? +k.gerekliElle : hes.saat}" style="max-width:120px"></div>
      <div class="alan" style="margin-top:12px"><label>Dayanak (işlem geçmişine yazılır)</label><input class="girdi" name="not" value="${e(k.gerekliElleNot || '')}" placeholder="Örn. il MEM tablosu: otomatikten manuele 10 saat"></div>
      <p class="ipucu" style="margin-top:12px">${isaret('uyari', 18)}<span>Yönetmeliğin asgari saatinin altında ders verilmesi usta öğretici ve kurs hakkında işlem sebebidir (md.7/6). Yalnız il MEM’in yazılı uygulamasına göre değiştirin.</span></p>`,
    altlik: `${elle ? '<button class="dg dg-hafif" data-sifirla>Hesaplanana dön</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`,
    onAc(d) {
      const bit = (v, not) => { const once = gerekliDireksiyon(k); geriAlNoktasi(); if (v == null) { delete k.gerekliElle; delete k.gerekliElleNot; } else { k.gerekliElle = v; k.gerekliElleNot = not; } islem('Direksiyon ders sayısını değiştirdi', tamAd(k) + ' · ' + once + ' → ' + gerekliDireksiyon(k) + (not ? ' · ' + not : '')); kaydet(); kapatPencere(); bildir(tamAd(k) + ': ' + gerekliDireksiyon(k) + ' ders'); yenile(); };
      d.querySelector('[data-k]').addEventListener('click', () => { const ham = String(d.querySelector('[name=n]').value).replace(/\D/g, ''), v = +ham, not = d.querySelector('[name=not]').value.trim(); if (!ham || !(v >= 1 && v <= 60)) return bildir('1–60 arasında bir ders sayısı girin', 'uyari'); if (not.length < 5) return bildir('Dayanağı yazın', 'uyari'); bit(v, not); });
      const sf = d.querySelector('[data-sifirla]'); if (sf) sf.addEventListener('click', () => bit(null));
      const il = d.querySelector('[data-il-saat]'); if (il) il.addEventListener('click', () => { d.querySelector('[name=n]').value = tx.saat; d.querySelector('[name=not]').value = `${listeAdi(tx.liste)}, ${satirAdi(tx.satir)} (${tx.liste.kurum})`; });
    },
  });
}
// MEB istisnaları (müdür işaretler, işlem kaydına yazılır):
// md.6/4 kontenjan dışı: sürücü belgesi olup özel ders alan kursiyer araç kontenjanına (md.16/8, araç başına 12) sayılmaz (k.kontenjanDisi; mevzuat.js araç sayımı)
// KTY md.76/3 yaş istisnası: emniyet okulları ve TSK'nın ilgili okul/kurslarının öğrencisi ya da mezunu, sürücü yüksekokulu mezunu; A, C, D, D1'de yaş 20 ve önceki belge aranmaz (veri.js yasIstisnaKapsar, k.yasIstisna)
// e-Sınav dili (MTSK e-Sınav Kılavuzu 2026; kural Y03, kurallar.js): k.esinavTercih = { dil ('Türkçe' ya da yabancı dilin adı), isitme (işaret dili videosu), islendi, tarih }.
// Kayıt formunda ve bu karttan girilir; girilmemişse Türkçe sayılır.
function esinavDilOzet(k) {
  const t = k.esinavTercih || {}, yd = !!(t.dil && t.dil !== 'Türkçe'), l = [yd ? e(t.dil) + ' (yabancı dil)' : 'Türkçe', t.isitme ? 'işaret dili videosuyla' : ''].filter(Boolean).join(', ');
  // yabancı dilde e-sınav: teorik eğitim valilik izniyle görevlendirilen tercümanla alınır (e-Sınav Kılavuzu 2026; madde 13). k.esinavTercih.tercuman = { ad, izin }
  const tr = yd ? (t.tercuman && t.tercuman.ad ? ` <small style="color:var(--soluk)">· tercüman: ${e(t.tercuman.ad)}${t.tercuman.izin ? ' · valilik izni ' + e(t.tercuman.izin) : ''}</small>` : ' ' + rozet('Tercüman girilmedi', 'uyari')) : '';
  return l + ((yd || t.isitme) ? ' ' + (t.islendi ? rozet('MEBBİS’e işlendi', 'yesil') : rozet('MEBBİS’e işlenmedi', 'uyari')) : '') + tr + (k.esinavTercih ? '' : ' <small style="color:var(--soluk)">varsayılan</small>');
}
function istisnaOzet(k) {
  const l = [k.kontenjanDisi && `${rozet('Kontenjan dışı', 'mavi')} <small style="color:var(--soluk)">md.6/4, belgeli özel ders${k.kontenjanDisi.not ? ' · ' + e(k.kontenjanDisi.not) : ''}</small>`,
    k.yasIstisna && `${rozet('Yaş istisnası', yasIstisnaGecerli(k.yasIstisna) ? 'mavi' : 'kirmizi')} <small style="color:var(--soluk)">KTY md.76/3 · ${e(yasIstisnaMetin(k.yasIstisna))}${k.yasIstisna.not ? ' · ' + e(k.yasIstisna.not) : ''}</small>${!k.yasIstisna.okul ? ' <b style="color:var(--turuncu);font-size:12.5px">· okul türünü ve öğrenci/mezun bilgisini seçin; seçilene kadar yaş indirilmez</b>' : !yasIstisnaGecerli(k.yasIstisna) ? ' <b style="color:var(--kirmizi);font-size:12.5px">· kapsama uymuyor</b>' : ''}`,
    k.ktk118 && `${rozet('KTK md.118', 'mavi')} <small style="color:var(--soluk)">belgesi geri alınıp eğitime gelen sürücü · araç kontenjanına sayılmıyor (teyit bekliyor)</small>`,
    k.adayIptal && `${rozet('Aday belgesi iptal', k.adayIptal.cezaOdendi ? 'mavi' : 'kirmizi')} <small style="color:var(--soluk)">KTK ek md.17 · ${k.adayIptal.cezaOdendi ? 'idari para cezaları ödendi' : 'idari para cezalarının ödendiği görülmedi'}</small>`].filter(Boolean);
  return l.length ? l.join('<br>') : '<span style="color:var(--soluk)">Yok</span>';
}
const belgeVar = k => !!k.mevcutEhliyet && k.mevcutEhliyet !== 'Yok';  // eski kayıtlarda “Yok” yazılı olabilir
function istisnaDuzenle(k) {
  if (!mudurMu()) return bildir('İstisnaları yalnız kurs müdürü değiştirir', 'uyari');
  const kd = k.kontenjanDisi || null, yi = k.yasIstisna || null;
  pencere({
    baslik: 'MEB istisnaları · ' + tamAd(k),
    icerik: `<form id="f-istisna" style="display:grid;gap:14px" novalidate>
      <div><label style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><input type="checkbox" name="kd" ${kd ? 'checked' : ''} ${!kd && !belgeVar(k) ? 'disabled' : ''} style="width:18px;height:18px;margin-top:2px"><span><b style="color:var(--murekkep)">Kontenjan dışı (MTSK Yön. md.6/4)</b><small style="display:block;color:var(--soluk)">Sürücü belgesi olup özel ders alan kursiyer. Araç başına kursiyer sayısına (md.16/8) dahil edilmez.${belgeVar(k) ? '' : ' <b style="color:var(--turuncu)">Mevcut belge girilmemiş; önce mevcut belgeyi girin.</b>'}</small></span></label>
        <input class="girdi" name="kdNot" value="${e(kd && kd.not || '')}" placeholder="Not: belge sınıfı ve no (isteğe bağlı)" style="margin-top:8px" autocomplete="off"></div>
      <div><label style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><input type="checkbox" name="yi" ${yi ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px"><span><b style="color:var(--murekkep)">Yaş istisnası (KTY md.76/3)</b><small style="display:block;color:var(--soluk)">Emniyet okullarının ve TSK’nın ilgili okul ve kurslarının öğrencileri ve mezunları, sürücü yüksekokullarının yalnız mezunları. A, C, D ve D1 sınıflarında yaş 20’dir, önceki belge şartı aranmaz; diğer sınıfların yaşı değişmez. Dayanak belgesini MEBBİS kaydından önce kontrol edin.</small></span></label>
        <div style="display:grid;gap:8px;margin-top:8px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">${yasIstisnaSecim(yi, 'yi', 'class="girdi"')}<input class="girdi" name="yiNot" value="${e(yi && yi.not || '')}" placeholder="Dayanak: belge adı ve no" autocomplete="off" aria-label="İstisnanın dayanağı"></div>${yi && !yi.okul ? `<small style="display:block;color:var(--turuncu);margin-top:6px">Eski kayıt: “${e(yi.tur || '')}”. Okul türünü ve öğrenci/mezun bilgisini seçin.</small>` : ''}</div>
      <div><label style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><input type="checkbox" name="k118" ${k.ktk118 ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px"><span><b style="color:var(--murekkep)">KTK md.118: belgesi geri alınıp eğitime gelen sürücü</b><small style="display:block;color:var(--soluk)">Araç başına kursiyer sayısına (md.16/8) alınmaz. Yönetmelik bu durumda bir şey söylemiyor; MEBBİS’in sayıp saymadığı teyit bekliyor.</small></span></label></div>
      <div><label style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><input type="checkbox" name="ai" ${k.adayIptal ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px"><span><b style="color:var(--murekkep)">Aday sürücü belgesi iptal edilmişti</b><small style="display:block;color:var(--soluk)">Kursta eğitime başlaması için idari para cezalarının tamamı ödenmiş olmalı (KTK ek md.17, 7590 sayılı Kanun).</small></span></label>
        <label style="display:flex;gap:8px;align-items:center;font-size:14px;margin:8px 0 0 26px"><input type="checkbox" name="aiCeza" ${k.adayIptal && k.adayIptal.cezaOdendi ? 'checked' : ''} style="width:18px;height:18px"> İdari para cezalarının tamamı ödendi</label></div>
      <p class="ipucu" style="margin:0">${isaret('bilgi', 18)}<span>Değişiklik işlem kaydına kimin yaptığıyla yazılır.</span></p></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-istisna">Kaydet</button>`,
    onAc(d) {
      { const f0 = d.querySelector('form'); yasIstisnaSenkron(f0, 'yi'); f0.addEventListener('change', () => yasIstisnaSenkron(f0, 'yi')); }
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target, kim = oturum.kullanici ? oturum.kullanici.ad : '', degisen = [];
        if (f.yi.checked && !f.yiOkul.value) { f.yiOkul.focus(); return bildir('Yaş istisnasının okul türünü seçin (KTY md.76/3)', 'uyari'); }
        if (f.yi.checked && f.yiNot.value.trim().length < 5) { f.yiNot.focus(); return bildir('Yaş istisnasının dayanağını yazın (belge adı ve no)', 'uyari'); }
        // md.6/4 yalnız sürücü belgesi olana: belgesizi kontenjan dışı saymak araç kontenjanı (md.16/8) aşımını gizler
        if (f.kd.checked && !kd && !belgeVar(k)) { f.kd.checked = false; return bildir('Kontenjan dışı yalnız sürücü belgesi olana konur; önce mevcut belgeyi girin (Bilgiler › Düzenle)', 'uyari'); }
        geriAlNoktasi();
        if (f.kd.checked) { const not = f.kdNot.value.trim(); if (!kd || (kd.not || '') !== not) { k.kontenjanDisi = { tarih: gun(0), kim, not }; degisen.push(kd ? 'kontenjan dışı notu değişti' : 'kontenjan dışı işaretlendi (md.6/4)' + (not ? ': ' + not : '')); } }
        else if (kd) { delete k.kontenjanDisi; degisen.push('kontenjan dışı kaldırıldı'); }
        if (f.yi.checked) { const y2 = yasIstisnaOku(f, 'yi'), not = f.yiNot.value.trim(); if (!yi || yi.okul !== y2.okul || yi.durum !== y2.durum || (yi.not || '') !== not) { k.yasIstisna = { ...y2, not, tarih: gun(0), kim }; degisen.push(`yaş istisnası (KTY md.76/3): ${y2.tur} · ${not}`); } }
        else if (yi) { delete k.yasIstisna; degisen.push('yaş istisnası kaldırıldı'); }
        if (f.k118.checked && !k.ktk118) { k.ktk118 = { tarih: gun(0), kim }; degisen.push('KTK md.118 sürücüsü işaretlendi (araç sayımına alınmaz)'); }
        else if (!f.k118.checked && k.ktk118) { delete k.ktk118; degisen.push('KTK md.118 işareti kaldırıldı'); }
        if (f.ai.checked) { const od = f.aiCeza.checked, o = k.adayIptal; if (!o || !!o.cezaOdendi !== od) { k.adayIptal = { tarih: (o && o.tarih) || gun(0), cezaOdendi: od ? ((o && o.cezaOdendi) || gun(0)) : null, kim }; degisen.push(`aday belgesi iptali (KTK ek md.17): ${od ? 'idari para cezaları ödendi' : 'cezaların ödendiği görülmedi'}`); } }
        else if (k.adayIptal) { delete k.adayIptal; degisen.push('aday belgesi iptali kaldırıldı'); }
        if (!degisen.length) { kapatPencere(); return bildir('Değişiklik yok'); }
        islem('MEB istisnasını değiştirdi', tamAd(k) + ' · ' + degisen.join(', ')); kaydet(); kapatPencere(); bildir('İstisnalar kaydedildi'); yenile();
      });
    },
  });
}
// Dosyadaki “Düzenle”: kayıttaki kategorilerle aynı bölümler; bolum: kimlik | sinif | evrak | onay (o bölüme kaydırılır)
const BD_BOLUM = [['kimlik', 'Kimlik ve iletişim', 'Ad, TC, telefon, adres'], ['sinif', 'Sınıf ve öğretmen', 'Sınıf, mevcut ehliyet'], ['evrak', 'Belge bilgileri', 'Sağlık, adli sicil, öğrenim'], ['onay', 'Onaylar', 'KVKK, WhatsApp, kampanya']];
export function bilgiDuzenle(k, bolum = 'kimlik') {
  pencere({
    baslik: 'Bilgileri düzenle · ' + tamAd(k), buyuk: true,
    icerik: `<div class="ks-govde"><nav class="ks-ray" aria-label="Bölümler"><div class="ks-kimlik"><div class="ks-kimlik-foto">${k.foto ? `<img src="${k.foto}" alt="">` : ik('kursiyer')}</div><div><b>${e(tamAd(k))}</b><small>${e(SINIFLAR[k.sinif] ? SINIFLAR[k.sinif].ad : '')} · No ${e(String(k.no || '—'))}</small></div></div>
      <ol class="ks-adimlar">${BD_BOLUM.map(([b, a, alt], i) => `<li><button type="button" class="ks-adim ${b === bolum ? 'aktif' : ''}" data-bd-git="${b}"><span class="ks-no">${i + 1}</span><span><b>${a}</b><small>${alt}</small></span></button></li>`).join('')}</ol>
      <div class="ks-ray-alt">${ik('bilgi')}<span>Kaydet bütün bölümleri birlikte yazar</span></div></nav>
    <div class="ks-icerik"><form id="f-bilgi" novalidate autocomplete="off">
      <div class="ks-blok" data-bd="kimlik"><h4>Kimlik ve iletişim</h4><div class="form-izgara"><div class="alan"><label>TC kimlik no${mudurMu() ? '' : ' · yalnız müdür'}</label><input name="tc" value="${mudurMu() ? e(k.tc) : e(tcMaskele(k.tc))}" inputmode="numeric" maxlength="11" ${mudurMu() ? '' : 'disabled'}></div><div class="alan"><label>Doğum tarihi</label><input name="dogum" type="date" value="${e(k.dogumTarihi || '')}"></div><div class="alan"><label>Ad</label><input name="ad" value="${e(k.ad)}" required></div><div class="alan"><label>Soyad</label><input name="soyad" value="${e(k.soyad)}" required></div><div class="alan"><span class="et">Cinsiyet</span><div class="secim">${['Kadın', 'Erkek'].map(x => `<label><input type="radio" name="cinsiyet" value="${x}" ${k.cinsiyet === x ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div><div class="alan"><label>Telefon</label><input name="tel" value="${e(k.tel)}" inputmode="tel"></div><div class="alan tam"><label>Adres</label><input name="adres" value="${e(k.adres || '')}"></div><div class="alan"><label>Baba adı</label><input name="babaAdi" value="${e(k.babaAdi || '')}" autocomplete="off" ></div><div class="alan"><label>Anne adı</label><input name="anaAdi" value="${e(k.anaAdi || '')}" autocomplete="off" ></div><div class="alan"><label>Doğum yeri</label><input name="dogumYeri" value="${e(k.dogumYeri || '')}" autocomplete="off" ></div><div class="alan"><label>Uyruk</label><input name="uyruk" value="${e(k.uyruk || 'Türkiye' || '')}" autocomplete="off" ></div><div class="alan"><label>Kimlik kartı seri no</label><input name="kimlikSeri" value="${e(k.kimlikSeri || '')}" autocomplete="off" maxlength="12"></div><div class="alan"><label>Kan grubu</label><select name="kanGrubu"><option value="">Bilinmiyor</option>${KAN_GRUPLARI.map(x => `<option ${x === k.kanGrubu ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="alan"><label>Öğrenim durumu</label><select name="ogrenim">${OGRENIM_DURUM.map(x => `<option ${x === (k.ogrenim || 'Lise') ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="alan"><label>Nereden geldi?</label><select name="kaynak">${[...new Set([...KAYNAKLAR, k.kaynak].filter(Boolean))].map(x => `<option ${x === k.kaynak ? 'selected' : ''}>${e(x)}</option>`).join('')}</select></div><div class="alan"><label>Acil durumda aranacak kişi</label><input name="acilAd" value="${e((k.acil || {}).ad || '')}" autocomplete="off" ></div><div class="alan"><label>Yakınlığı</label><input name="acilYakinlik" value="${e((k.acil || {}).yakinlik || '')}" autocomplete="off" ></div><div class="alan"><label>Onun telefonu</label><input name="acilTel" value="${e((k.acil || {}).tel || '')}" autocomplete="off" inputmode="tel"></div></div></div>
      <div class="ks-blok" data-bd="sinif"><h4>Sınıf, öğretmen ve mevcut ehliyet <small>dönem grubu dosyada “Gruba ata”dan</small></h4><div class="form-izgara"><div class="alan"><label>Sınıf${mudurMu() ? '' : ' · yalnız müdür'}</label><select name="sinif" ${mudurMu() ? '' : 'disabled'}>${Object.entries(SINIFLAR).filter(([key, v]) => v.aktif || key === k.sinif).map(([key, v]) => `<option value="${key}" ${key === k.sinif ? 'selected' : ''}>${e(v.ad)}</option>`).join('')}</select></div><div class="alan"><label>Usta öğretici</label><select name="usta">${S.egitmenler.map(h => `<option value="${h.id}" ${h.id === k.egitmen ? 'selected' : ''}>${e(h.ad)}</option>`).join('')}</select></div><div class="alan"><label>Mevcut ehliyeti</label><select name="mevcut"><option value="">Yok</option>${MEVCUT_BELGELER.map(x => `<option value="${x}" ${x === k.mevcutEhliyet ? 'selected' : ''}>${x === 'E' ? 'E (eski tip)' : x}</option>`).join('')}</select></div><div class="alan"><label>Belgenin veriliş tarihi</label><input name="mtarih" type="date" value="${e((k.oncekiBelge || {}).tarih || '')}"><label style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:6px"><input type="checkbox" name="motomatik" ${k.mevcutOtomatik ? 'checked' : ''} style="width:18px;height:18px"> Sadece otomatik</label><label style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:4px"><input type="checkbox" name="meski" ${k.mevcutEski ? 'checked' : ''} style="width:18px;height:18px"> Eski tip: 01.01.2016’dan önce alındı</label></div><div class="alan"><label>Mevcut belge no</label><input name="mevcutNo" value="${e((k.oncekiBelge || {}).no || '')}" autocomplete="off" maxlength="20"></div><label class="alan tam" style="flex-direction:row;display:flex;gap:10px;align-items:center;font-size:14px"><span class="anahtar"><input type="checkbox" name="aracKullanabiliyor" ${k.aracKullanabiliyor ? 'checked' : ''}><i></i></span>Araç kullanabiliyor</label></div></div>
      <div class="ks-blok" data-bd="evrak"><h4>Belge bilgileri <small>MEBBİS’e gider</small></h4><div class="form-izgara"><div class="alan"><label>Sağlık raporu no</label><input name="rno" value="${e((k.saglikRapor || {}).no || '')}"></div><div class="alan"><label>Rapor tarihi</label><input name="rtar" type="date" value="${(k.saglikRapor || {}).tarih ? k.saglikRapor.tarih.split('.').reverse().join('-') : ''}"></div>${raporAyrintiHtml(k.saglikRapor)}
      <div class="alan tam"><label>Adli sicil barkodu</label><input name="adli" value="${e((k.adliSicil || {}).barkod || '')}"></div>${ME.evrakHtml(k)}</div></div>
      <div class="ks-blok" data-bd="onay"><h4>Onaylar</h4>${[['kvkk', 'KVKK aydınlatma metni verildi', 'Kayıt için zorunlu.', !!(k.kvkk && (k.kvkk.aydinlatma || k.kvkk.riza))], ['whatsappOnay', 'Bilgilendirmeleri WhatsApp’tan almayı kabul ediyor', 'İsteğe bağlı; tarihiyle saklanır.', !!(k.kvkk && k.kvkk.whatsapp)], ['pazarlama', 'Kampanya ve tanıtım mesajlarına açık rıza', 'İsteğe bağlı.', !!(k.kvkk && k.kvkk.pazarlama)]].map(([n, b, t, c]) => `<label class="ks-onay"><div><b>${b}</b><small>${t}</small></div><span class="anahtar"><input type="checkbox" name="${n}" ${c ? 'checked' : ''}><i></i></span></label>`).join('')}</div>
    </form></div></div>`,
    altlik: `<div class="ks-alt"><span class="ks-bosluk"></span><button type="button" class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-bilgi">${ik('tik')}Kaydet</button></div>`,
    onAc(d) {
      { const ic = d.querySelector('.ks-icerik'), git = b => { const h = d.querySelector(`[data-bd="${b}"]`); if (h && ic) ic.scrollTo({ top: h.offsetTop - 12, behavior: 'smooth' }); d.querySelectorAll('[data-bd-git]').forEach(x => x.classList.toggle('aktif', x.dataset.bdGit === b)); };
        d.querySelectorAll('[data-bd-git]').forEach(x => x.addEventListener('click', () => git(x.dataset.bdGit))); if (bolum !== 'kimlik') setTimeout(() => git(bolum), 80); }
      // belge tarihi 01.01.2016'dan önceyse ya da belge E ise eski tip kendiliğinden işaretlenir (kayıt formundaki gibi; müdür değiştirebilir)
      { const f0 = d.querySelector('form'); let onceki = f0.mevcut.value;
        const esk = () => { const m = f0.mevcut.value; if (m === 'E') f0.meski.checked = true; else if (f0.mtarih.value) f0.meski.checked = eskiBelgeTarihi(f0.mtarih.value); else if (onceki === 'E') f0.meski.checked = false; onceki = m; };
        f0.mtarih.addEventListener('change', esk); f0.mevcut.addEventListener('change', esk); }
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target;
        if (f.tel.value.replace(/\D/g, '').length < 10) return bildir('Geçerli bir telefon girin', 'uyari');
        if (!f.ad.value.trim() || !f.soyad.value.trim()) return bildir('Ad ve soyad gerekli', 'uyari');
        const degisen = [];
        if (mudurMu()) {
          const tc = f.tc.value.trim(); if (tc !== k.tc) { if (!tcGecerli(tc)) return bildir('TC kimlik numarası geçersiz', 'uyari'); degisen.push('TC'); k.tc = tc; k.mebIslendi = false; }
          if (f.sinif.value !== k.sinif) { degisen.push('sınıf ' + k.sinif + ' → ' + f.sinif.value); k.sinif = f.sinif.value; k.mebIslendi = false; }
        }
        if (f.usta.value !== k.egitmen) { degisen.push('usta → ' + egitmen(f.usta.value).ad); k.egitmen = f.usta.value; }
        { const m = f.mevcut.value, mt = m ? f.mtarih.value : '', mo = !!m && f.motomatik.checked, me = !!m && (f.meski.checked || m === 'E');
          if (m !== (k.mevcutEhliyet || '') || mt !== ((k.oncekiBelge || {}).tarih || '') || mo !== !!k.mevcutOtomatik || me !== !!k.mevcutEski) {
            const once = gerekliDireksiyon(k); degisen.push('mevcut belge ' + (k.mevcutEhliyet || 'yok') + ' → ' + (m || 'yok')); k.mevcutEhliyet = m;
            if (m) k.oncekiBelge = { ...(k.oncekiBelge || {}), sinif: m, tarih: mt }; else delete k.oncekiBelge;
            if (mo) k.mevcutOtomatik = true; else delete k.mevcutOtomatik; if (me) k.mevcutEski = true; else delete k.mevcutEski;
            if (!m && k.kontenjanDisi) { delete k.kontenjanDisi; degisen.push('kontenjan dışı kaldırıldı (mevcut belge yok, md.6/4)'); }
            if (gerekliDireksiyon(k) !== once) degisen.push('direksiyon ' + once + ' → ' + gerekliDireksiyon(k) + ' ders'); } }
        if ((f.dogum.value || '') !== (k.dogumTarihi || '')) { degisen.push('doğum tarihi'); k.dogumTarihi = f.dogum.value; }
        if (f.ad.value.trim() !== k.ad || f.soyad.value.trim() !== k.soyad) degisen.push('ad soyad');
        if (!f.kvkk.checked) return bildir('KVKK aydınlatma metni işaretli olmalı; kayıt bunsuz tutulamaz', 'uyari');
        Object.assign(k, { ad: f.ad.value.trim(), soyad: f.soyad.value.trim(), tel: f.tel.value.trim(), adres: f.adres.value.trim(), cinsiyet: (f.querySelector('[name=cinsiyet]:checked') || {}).value || k.cinsiyet || null, ogrenim: f.ogrenim.value, kaynak: f.kaynak.value });
        ['babaAdi', 'anaAdi', 'dogumYeri', 'uyruk', 'kimlikSeri', 'kanGrubu'].forEach(n => { let v = String(f[n].value || '').trim(); if (n === 'kimlikSeri') v = v.toLocaleUpperCase('tr'); if (v && !(n === 'uyruk' && v === 'Türkiye')) k[n] = v; else delete k[n]; });
        { const ac = f.acilAd.value.trim() || f.acilTel.value.trim() ? { ad: f.acilAd.value.trim(), yakinlik: f.acilYakinlik.value.trim(), tel: f.acilTel.value.trim() } : null; k.acil = ac; }
        if (f.aracKullanabiliyor.checked) k.aracKullanabiliyor = true; else delete k.aracKullanabiliyor;
        if (k.oncekiBelge) { const no = f.mevcutNo.value.trim(); if (no) k.oncekiBelge.no = no; else delete k.oncekiBelge.no; }
        { const kv = k.kvkk || (k.kvkk = { tarih: gun(0), kanal: 'Kursta imzalı form' }); if (!!kv.whatsapp !== f.whatsappOnay.checked) { kv.whatsapp = f.whatsappOnay.checked; kv.whatsappTarih = gun(0); degisen.push('WhatsApp onayı ' + (kv.whatsapp ? 'verildi' : 'geri alındı')); } if (!!kv.pazarlama !== f.pazarlama.checked) { kv.pazarlama = f.pazarlama.checked; degisen.push('kampanya rızası ' + (kv.pazarlama ? 'verildi' : 'geri alındı')); } kv.aydinlatma = true; }
        k.saglikRapor = f.rno.value.trim() || (f.rGece && f.rGece.checked) ? { no: f.rno.value.trim(), tarih: f.rtar.value ? f.rtar.value.split('-').reverse().join('.') : '', ...raporAyrintiOku(f) } : null;
        if (k.saglikRapor && !k.saglikRapor.surucuOlur) setTimeout(() => bildir('Raporda “sürücü olur” işaretli değil; bu raporla MEB kaydı yapılamaz', 'uyari'), 300);
        k.adliSicil = f.adli.value.trim() ? { barkod: f.adli.value.trim() } : null;
        { const me = ME.evrakOku(f); if (JSON.stringify(me) !== JSON.stringify(k.mebEvrak || null)) { k.mebEvrak = me; delete k.mebEvrakGirildi; } }
        islem('Kursiyer bilgisi düzenledi', tamAd(k) + (degisen.length ? ' · ' + degisen.join(', ') : '')); kaydet(); kapatPencere(); bildir('Bilgiler kaydedildi' + (degisen.some(x => /TC|sınıf/.test(x)) ? '; MEBBİS kaydı yeniden girilmeli' : '')); yenile();
      });
    },
  });
}
const imzasiz = d => d.durum === 'Yapıldı' && (!d.imza || d.imza.kursiyerBekliyor);
// Uzaktan imza ölçü altındaysa (imza.js kanit.olcuAlti) imza işlenir ama kurs kontrol etmeli: küçük turuncu işaret
const olcuAltiIsaret = kn => kn && kn.olcuAlti ? ` <span class="rozet rozet-turuncu" title="${e(kn.olcuNot || 'İmza ölçü altında')}">İmza ölçü altında, kontrol edin</span>` : '';
const imzasizDers = k => kursiyerDersleri(k.id).filter(d => imzasiz(d)).sort((a, b) => a.tarih.localeCompare(b.tarih));
// Dosyanın en üstünde önem sırasıyla dört şey: evrak, ödeme, sıradaki, MEBBİS
// DIR-010: dersler sekmesinde sayaçlar — zorunlu (normal; ikinci dört hakta önceki + 2. direksiyon), eğitim yeri, gece, telafi (ön sınav), başarısız aday, 2. direksiyon
function dersSayacSeridi(k) {
  const ds = dersSayaci(k); if (!ds.gerekli && !ds.yapildi) return '';
  const k_ = (et, deger, alt, tur = 'notr') => `<div class="sayac-kutu ${tur}"><small>${et}</small><b>${deger}</b>${alt ? `<span>${alt}</span>` : ''}</div>`, pl = n => n ? ` · ${n} planlı` : '';
  const l = [k_(ds.ikinci ? 'Zorunlu (ikinci dört hak)' : 'Zorunlu ders', `${ds.zorunlu.yapildi}/${ds.gerekli}`, (ds.aktarim ? `${ds.aktarim} eski programdan` : '') + pl(ds.zorunlu.planli), ds.zorunlu.yapildi >= ds.gerekli ? 'yesil' : 'notr')];
  if (ds.alanSim.gerek) l.push(k_('Alan / simülatör', `${ds.alanSim.yapildi}/${ds.alanSim.gerek}`, `trafik ${ds.trafik.yapildi}${pl(ds.alanSim.planli)}`, ds.alanSim.yapildi >= ds.alanSim.gerek ? 'yesil' : 'uyari'));
  if (ds.gece.gerek) l.push(k_('Gece', `${ds.gece.yapildi}/${ds.gece.gerek}`, pl(ds.gece.planli).slice(3), ds.gece.yapildi >= ds.gece.gerek ? 'yesil' : ds.gece.yapildi + ds.gece.planli >= ds.gece.gerek ? 'notr' : 'uyari'));
  if (ds.telafi.yapildi || ds.telafi.planli) l.push(k_('Telafi (ön sınav)', ds.telafi.yapildi, 'md.7/7, zorunluya sayılmaz' + pl(ds.telafi.planli)));
  if (ds.basarisiz.gerek || ds.basarisiz.yapildi || ds.basarisiz.planli) l.push(k_('Başarısız aday', ds.basarisiz.gerek ? `${ds.basarisiz.sonra}/${ds.basarisiz.gerek}` : ds.basarisiz.yapildi, ds.basarisiz.gerek ? `${tarih(ds.basarisiz.sonSinav)} sınavından sonra (md.15)${pl(ds.basarisiz.planli)}` : 'ek ders' + pl(ds.basarisiz.planli), ds.basarisiz.gerek ? (ds.basarisiz.sonra >= ds.basarisiz.gerek ? 'yesil' : 'uyari') : 'notr'));
  { const mo = k.meb && k.meb.dersOzet; if (mo) { const m = ds.yapildi, fk = mo.yapilmis !== m; l.push(k_('MEBBİS’te', `${mo.yapilmis} ders`, `mdSinyal’de ${m} yapıldı${mo.ileri ? ` · ${mo.ileri} ileri tarihli` : ''} · ${tarih(mo.okuma)} okuma`, fk ? 'uyari' : 'yesil')); } }   // DIR-027
  if (ds.ikinci) l.push(k_('2. direksiyon', `${ds.egitim.ikinci.yapildi}/${ds.ikinci.gerek}`, `ikinci dört hak${pl(ds.egitim.ikinci.planli)}`, ds.egitim.ikinci.yapildi >= ds.ikinci.gerek ? 'yesil' : 'notr'));
  return `<div class="sayac-serit">${l.join('')}</div>`;
}
function dosyaSeridi(k, eksik) {
  const yuk = Object.keys(k.evrakYuklenen || {}).filter(x => !k.evrak[x]).length, gec = gecikenler(k), sd = sonrakiDers(k), sn = S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  const meb = mebOnKontrol(k), mebTamam = meb.filter(x => x[0]).length, sonraki = sn && (!sd || sn.tarih <= sd.tarih) ? [sn.tur + ' sınavı', goreli(sn.tarih) + ' ' + sn.saat] : sd ? ['Direksiyon dersi', goreli(sd.tarih) + ' ' + sd.saat] : null;
  const kutu = (tur, et, deger, alt, git, ek = '') => `<button type="button" class="serit-kutu ${tur}" data-dosya-git="${git}"><small>${et}</small><b>${deger}</b><span>${alt}</span>${ek}</button>`;
  const kalan = kalanBorc(k), snT = OG.sonrakiTaksit(k), topl = k.odeme.toplam + ekToplam(k);
  return `<div class="dosya-serit">
    ${kutu(eksik.length ? (yuk ? 'uyari' : 'kirmizi') : 'yesil', 'Evrak', `${EVRAKLAR.length - eksik.length}/${EVRAKLAR.length}`, eksik.length ? (yuk ? yuk + ' belge onay bekliyor' : eksik.map(x => x[1].split(' ')[0]).slice(0, 2).join(', ') + (eksik.length > 2 ? '…' : '') + ' eksik') : 'Tamam', 'dosya|dosya-evrak')}
    ${kutu(gec.length ? 'kirmizi' : kalan ? 'notr' : 'yesil', 'Ödeme', kalan ? tl(kalan) : 'Tamam', gec.length ? tl(gecikenTutar(k)) + ' gecikti · ' + tarih(gec[0].vade) : snT ? 'Sıradaki ' + tarih(snT.t.vade) + ' · ' + tl(taksitKalan(snT.t)) : kalan ? 'kalan borç' : 'Borcu yok', 'odeme|', topl ? ilerleme(odenen(k), topl, 'yesil') : '')}
    ${kutu('notr', 'Sıradaki', sonraki ? e(sonraki[1]) : '—', sonraki ? e(sonraki[0]) : 'Planlı ders ya da sınav yok', sn && sonraki && sonraki[0] !== 'Direksiyon dersi' ? 'sinav|' : 'dersler|')}
    ${kutu(k.mebIslendi ? 'yesil' : mebTamam === meb.length ? 'mavi' : 'uyari', 'MEBBİS', k.mebIslendi ? 'Girildi' : `${mebTamam}/${meb.length}`, k.mebIslendi ? (k.mebNo ? e(k.mebNo) : 'kayıt tamam') : mebTamam === meb.length ? 'aktarıma hazır' : (meb.length - mebTamam) + ' eksik var', 'dosya|dosya-meb')}
  </div>`;
}
// Deneme uygulama sınavları (EK-3/EK-4 maddeleriyle; öğretmen ekranından ya da buradan)
function denemeKarti(k) {
  if (!SINIFLAR[k.sinif].direksiyon || !['Direksiyon', 'Sınav'].includes(k.asama)) return '';
  const l = (k.dDeneme || []).slice().reverse();
  return `<div class="kart" style="margin-bottom:14px"><div class="kart-bas"><h3>Deneme uygulama sınavı</h3><small>${ek3Sinif(k.sinif) ? 'EK-3' : 'EK-4'} maddeleriyle · gerçek sınavın kurallarıyla</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-deneme-yeni>${ik('arti')}Deneme yap</button></div></div>
    ${l.length ? `<ul class="liste">${l.map(x => `<li><div style="flex:1;min-width:0"><b style="color:${x.sonuc === 'Geçti' ? 'var(--yesil)' : 'var(--kirmizi)'}">${x.sonuc === 'Geçti' ? 'Geçerdi' : 'Kalırdı'}${x.neden ? ' · ' + e(x.neden) : ''}</b><small style="display:block;color:var(--soluk)">${tarih(x.tarih)} · ${e(x.kim || '')} · mavi ${x.say.m}, sarı ${x.say.s}, kırmızı ${x.say.k}${x.hatalar.length ? ' · ' + e(x.hatalar.slice(0, 3).map(h => h.bas.replace(/^\d+\.\s*/, '').toLocaleLowerCase('tr')).filter((v, i, a) => a.indexOf(v) === i).join(', ')) : ''}${x.not ? ' · “' + e(x.not) + '”' : ''}</small></div><button class="dg dg-hafif dg-kucuk" data-deneme-yazdir="${x.id}">Formu yazdır</button></li>`).join('')}</ul>` : `<div class="kart-govde"><p style="font-size:14px;color:var(--soluk)">Henüz deneme yapılmadı. Sınavdan önce bir deneme, öğrencinin hangi maddeden kalacağını gösterir.</p></div>`}</div>`;
}
// Kayıt fotoğrafı: MEBBİS'e aktarılan fotoğraf biyometrik kurallara uymalı; yanlış fotoğraf o dönem düzeltilemez
function profilFoto(k) {
  const KURAL = ['Son 6 ay içinde çekilmiş', 'Beyaz ya da açık renk düz fon', 'Yüz tam karşıdan, gözler açık ve net', 'Şapka, gözlük yansıması ve gölge yok', 'Yüz kadrajı dolduruyor, kimlikteki kişiyle aynı'];
  let veri = k.foto || null, dveri = (k.dogrulamaFoto || {}).veri || null;
  pencere({
    baslik: 'Kayıt fotoğrafı · ' + tamAd(k), genis: true,
    icerik: `<div class="foto-cek"><div class="foto-onizle">${veri ? `<img src="${veri}" alt="">` : `${ik('kursiyer')}<small>Henüz fotoğraf yok</small>`}</div>
      <div><label class="dg dg-ana" style="cursor:pointer">${ik('arti')}${veri ? 'Yeniden çek / yükle' : 'Fotoğraf çek / yükle'}<input type="file" accept="image/*" capture="user" data-foto-sec hidden></label>
      <p class="et" style="margin-top:14px">Biyometrik kontrol</p><div class="foto-kural">${KURAL.map((x, i) => `<label><input type="checkbox" data-kural="${i}" ${k.foto ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:10px">Bu fotoğraf MEBBİS’e aktarılır. MEB modülünde hatalı fotoğraf o dönem düzeltilemez.</p></div></div>
      <div class="foto-cek" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--cizgi-2)"><div class="foto-onizle" data-donizle>${dveri ? `<img src="${dveri}" alt="">` : `${ik('kursiyer')}<small>Doğrulama fotoğrafı yok</small>`}</div>
      <div><p class="et">Kimlik doğrulama fotoğrafı</p><p style="font-size:13.5px;margin:4px 0 10px">Kayıt günü kursta, öğrenci karşınızdayken çekilir. Kimlik kartındaki kişiyle aynı kişi olduğunu gösterir; biyometrik fotoğrafla yan yana saklanır.</p>
      <label class="dg dg-cizgi" style="cursor:pointer">${ik('arti')}${dveri ? 'Yeniden çek' : 'Şimdi çek'}<input type="file" accept="image/*" capture="user" data-dfoto-sec hidden></label>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input type="checkbox" data-dkimlik ${(k.dogrulamaFoto || {}).kimlik ? 'checked' : ''}> Kimlik kartıyla yüzü karşılaştırdım, aynı kişi</label>
      ${k.dogrulamaFoto ? `<p style="font-size:12.5px;color:var(--soluk);margin-top:8px">${tarih(k.dogrulamaFoto.tarih)} · ${e(k.dogrulamaFoto.kim || '')}</p>` : ''}</div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-foto-kaydet>Kaydet</button>`,
    onAc(d) {
      d.querySelector('[data-foto-sec]').addEventListener('change', ev => { const f = ev.target.files[0]; if (!f) return; fotoKucult(f, 480).then(u => { veri = u; d.querySelector('.foto-onizle').innerHTML = `<img src="${u}" alt="">`; d.querySelectorAll('[data-kural]').forEach(c => { c.checked = false; }); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); });
      d.querySelector('[data-dfoto-sec]').addEventListener('change', ev => { const f = ev.target.files[0]; if (!f) return; fotoKucult(f, 480).then(u => { dveri = u; d.querySelector('[data-donizle]').innerHTML = `<img src="${u}" alt="">`; d.querySelector('[data-dkimlik]').checked = false; }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); });
      d.querySelector('[data-foto-kaydet]').addEventListener('click', () => {
        if (!veri && !dveri) return bildir('Önce fotoğraf çekin ya da yükleyin', 'uyari');
        if (veri && veri !== k.foto && [...d.querySelectorAll('[data-kural]')].some(c => !c.checked)) return bildir('Biyometrik kontrolün hepsini işaretleyin; uymayan fotoğraf MEB’den döner', 'uyari');
        const dk = d.querySelector('[data-dkimlik]').checked;
        if (dveri && dveri !== (k.dogrulamaFoto || {}).veri && !dk) return bildir('Doğrulama fotoğrafı için kimlik kartıyla karşılaştırmayı işaretleyin', 'uyari');
        if (veri && veri !== k.foto) { k.foto = veri; k.fotoTarih = gun(0); islem('Kayıt fotoğrafı ekledi', tamAd(k)); }
        if (dveri && dveri !== (k.dogrulamaFoto || {}).veri) { k.dogrulamaFoto = { veri: dveri, tarih: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '', kimlik: dk }; islem('Kimlik doğrulama fotoğrafı çekti', tamAd(k)); }
        kaydet(); kapatPencere(); bildir('Fotoğraf kaydedildi'); yenile();
      });
    },
  });
}
// md.12/1 kayıt belgesi: MEBBİS'e girildi, kurum onayı henüz yok, imzalı belge yüklenmedi (k.kayitBelgesi = { yuklendi, kim }).
// Kursiyerin ayrı bir imza görüntüsünün istenip istenmediği teyit bekliyor (madde 17); burada yalnız imzalı kayıt belgesi izlenir.
export const kayitBelgesiBekliyor = k => !!k && !k.kapali && !!k.mebIslendi && !k.mebOnay && !/onaylandı/i.test((k.meb || {}).kurumOnay || '') && !(k.kayitBelgesi && k.kayitBelgesi.yuklendi) && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama);
// md.7/7: hazır onayından sonra ikinci farklı kodlu sınava girmeyenin bir hakkı kullanılmış sayılır. MEBBİS'te düştüğü görülünce sınav kaydı olmadan işlenir (madde 10).
function hakYandiIsle(k, t) {
  const once = k.dsinav && k.dsinav.sonuc !== 'Geçti' ? (+k.dsinav.hak || 0) : 0, hak = once + 1, sinir = sinavHakSiniri(k, 'Direksiyon'), son = hak >= sinir;
  pencere({
    baslik: 'Sınav hakkı düştü · ' + tamAd(k),
    icerik: `<p style="font-size:14px">Hazır onayından sonraki ikinci farklı kodlu sınava${t ? ` (${tarih(t)})` : ''} girmedi. Böyle bir kursiyerin bir sınav hakkı kullanılmış sayılır (MTSK Yön. md.7/7).</p>
      <p class="ipucu ${son ? 'uyari' : ''}" style="margin-top:12px">${isaret(son ? 'uyari' : 'bilgi', 18)}<span>İşlenince ${hak}. uygulama sınavı hakkı kullanılmış sayılır; ${son ? 'bu son hak, sınav hakkı biter.' : `${sinir - hak} hak kalır.`} Önce MEBBİS’te hakkın düştüğünü kontrol edin.</span></p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Hakkı düşür</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => {
      geriAlNoktasi(); const tt = /^\d{4}-\d{2}-\d{2}$/.test(t || '') ? t : gun(0);
      k.dsinav = { sonuc: 'Kaldı', hak, tarih: tt, girmedi: true, yandi: true };
      if (son) k.hakBitti = { tur: 'Direksiyon', tarih: tt };
      islem('Sınav hakkını düşürdü (md.7/7)', `${tamAd(k)} · ${hak}. hak · ${tarih(tt)} sınavına girmedi`); kaydet(); kapatPencere(); bildir(`${hak}. hak kullanılmış sayıldı`); yenile();
    }); },
  });
}
// Profilin üstü: bu öğrenci için yapılması gerekenler, önem sırasıyla, her birinin yanında işi yapan düğme
function profilEksikleri(k) {
  if (k.kapali || k.asama === 'Ehliyet') return '';
  const ev = eksikEvrak(k).filter(([x]) => x !== 'sozlesme'), gec = gecikenler(k).reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
  const itiraz = kursiyerDersleri(k.id).filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'itiraz').length;
  const l = [
    k.hakBitti && !k.hakBitti.cozuldu && ['yasak', 'Sınav hakkı doldu', '<button class="dg dg-cizgi dg-kucuk" data-psekme="sinav">Karar ver</button>'],
    itiraz && ['dur', `${itiraz} derse itiraz etti`, '<button class="dg dg-cizgi dg-kucuk" data-psekme="dersler">Gör</button>'],
    // kural motoru (kurallar.js): hazır onayından sonra yanan hak, ikinci dört hak süresi, e-sınav dili/işaret dili 48 saat
    ...KR.kursiyerBulgulari(k).map(x => [x[0], e(x.kisa || x[1]) + (x.dayanak ? `<small style="display:block;color:var(--soluk);font-size:12.5px">${e(x.dayanak)}</small>` : ''), x.eylem === 'esinav-tercih' ? `<button class="dg dg-cizgi dg-kucuk" data-esinav-tercih>${k.esinavTercih ? 'Değiştir' : 'Belirt'}</button>` : x.eylem === 'hak-yandi' ? `<button class="dg dg-cizgi dg-kucuk" data-hak-yandi="${e(x.tarih || '')}">Hak düştü, işle</button>` : x.eylem === 'odeme' ? '<button class="dg dg-cizgi dg-kucuk" data-psekme="odeme">Ödemeler</button>' : x.eylem === 'gozetim' && mudurMu() ? '<button class="dg dg-ana dg-kucuk" data-gozetim>Kursta tamamlandı</button>' : '']),
    // md.12/1: MEBBİS'e girilen kaydın belgesi sistemden alınır, kursiyere imzalatılır, kurum onayından önce sisteme geri yüklenir (eyup-sorular-cevaplar.md madde 17)
    kayitBelgesiBekliyor(k) && ['uyari', `Kayıt belgesi: MEBBİS’ten yazdırın, kursiyere imzalatın, MEBBİS’e yükleyin<small style="display:block;color:var(--soluk);font-size:12.5px">MTSK Yön. md.12/1 · kurum onayından önce</small>`, '<button class="dg dg-cizgi dg-kucuk" data-kayit-belgesi>Yükledim</button>'],
    k.odeme && k.odeme.planSonra && !k.odeme.taksitler.some(t => t.odendi) && k.odeme.taksitler.filter(t => !t.iptal).length <= 1 && ['uyari', 'Ödeme planı yapılmadı (kayıtta atlandı)', '<button class="dg dg-cizgi dg-kucuk" data-odeme-islem="plan">Planı yap</button>'],
    gec && ['uyari', `Geciken ödeme ${tl(gec)}`, `<button class="dg dg-wp dg-kucuk" data-link>${ik('wp')}Hatırlat</button>`],
    ev.length && ['uyari', `${ev.length} evrak eksik: ${ev.map(([, ad]) => ad.split(' (')[0].toLocaleLowerCase('tr')).join(', ')}`, `<button class="dg dg-wp dg-kucuk" data-evrak-hatirlat>${ik('wp')}WhatsApp’tan iste</button>`],
    !k.evrak.sozlesme && ['uyari', 'Sözleşme imzalanmadı', '<button class="dg dg-cizgi dg-kucuk" data-sozlesme>İmzaya gönder</button>'],
    !k.foto && ['bilgi', 'Kayıt fotoğrafı yok', '<button class="dg dg-cizgi dg-kucuk" data-profil-foto>Çek</button>'],
    k.foto && !k.dogrulamaFoto && ['bilgi', 'Kimlik doğrulama fotoğrafı yok', '<button class="dg dg-cizgi dg-kucuk" data-profil-foto>Çek</button>'],
    !k.mebIslendi && !ev.length && ['bilgi', 'MEBBİS’e girilmedi', '<a class="dg dg-cizgi dg-kucuk" href="#/meb">MEB işlemleri</a>'],
    // öğrenci uygulaması hesabı ayrı kartta anlatılıyor; burada tekrarlanmaz
  ].filter(Boolean);
  if (!l.length) return `<p class="ipucu" style="margin:0 20px">${isaret('tamam', 20)}<span>Eksik yok. Sıradaki adım: ${k.asama === 'Sınav' ? 'sınav' : k.asama === 'Direksiyon' ? 'direksiyon dersleri' : k.asama === 'Teorik' ? 'teorik dersler ve e-sınav' : 'aşamayı ilerletin'}.</span></p>`;
  return `<div class="profil-eksik" style="margin:0 20px;display:grid;gap:6px"><p class="et" style="margin:0">Yapılacaklar</p>${l.map(([t, m, d]) => `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${isaret(t, 20)}<span style="flex:1;min-width:160px;font-size:14px;color:var(--murekkep)">${m}</span>${d}</div>`).join('')}</div>`;
}
// Ödemeler sekmesi: bir bakışta kalan borç, sıradaki taksit, ödenen/toplam ve tek büyük "Ödeme al".
// İndirim, ek kalem, iade, senet, plan düzenleme ve hesap dökümü "Diğer işlemler" ile katlanır bölümlerde.
const acikTaksitler = k => k.odeme.taksitler.map((t, i) => ({ t, i })).filter(x => !x.t.odendi && !x.t.iptal);
const taksitKalan = t => t.tutar - (t.kismi || 0);
function odemeSekmesi(k) {
  const kalan = kalanBorc(k), toplam = k.odeme.toplam + ekToplam(k), od = odenen(k), sn = OG.sonrakiTaksit(k), gec = gecikenler(k);
  const snGec = sn && fark(sn.t.vade) < 0, ekAcik = (k.odeme.ekler || []).filter(x => !x.odendi), odenenSay = k.odeme.taksitler.filter(t => t.odendi).length, taksitSay = k.odeme.taksitler.filter(t => !t.iptal).length;
  const alinabilir = !!sn || ekAcik.length > 0;
  const sonraki = sn
    ? `<div class="oo-sonraki${snGec ? ' gecikti' : ''}"><small>${snGec ? 'Gecikmiş taksit' : 'Sıradaki taksit'}</small><b class="sayi">${tl(taksitKalan(sn.t))}</b><span>${tarihUzun(sn.t.vade)} · ${sn.i + 1}. taksit${snGec ? ` · ${-fark(sn.t.vade)} gün gecikti` : fark(sn.t.vade) === 0 ? ' · bugün' : ''}${sn.t.kismi ? ` · ${tl(sn.t.kismi)} ödendi` : ''}</span></div>`
    : ekAcik.length ? `<div class="oo-sonraki"><small>Açık ek kalem</small><b class="sayi">${tl(ekAcik[0].tutar)}</b><span>${e(ekAcik[0].ad)}</span></div>`
    : `<div class="oo-sonraki tamam"><small>Sıradaki taksit</small><b>Yok</b><span>Bütün taksitler ödendi</span></div>`;
  const islemler = [
    kalan ? ['link', 'Ödeme bilgisini WhatsApp’tan gönder', 'wp'] : null,
    ['plan', 'Taksit planını yeniden böl', 'takvim'], ['ek', 'Ek kalem ekle (ek ders, özel ders, sınav, kitap…)', 'arti'],
    mudurMu() && kalan ? ['indirim', 'İndirim uygula', 'kalem'] : null, mudurMu() ? ['iade', 'İade yap', 'sifirla'] : null, mudurMu() && !k.ucretsiz ? ['ucretsiz', 'Ücretsiz kursiyer (%3)', 'kursiyer'] : null,
    k.odeme.senetli ? ['senet', 'Senet (yazdır / PDF)', 'belge'] : null, S.hareket.some(h => h.kursiyer === k.id && h.tur === 'Gelir') ? ['makbuz', 'Makbuzlar (yazdır / PDF)', 'belge'] : null,
  ].filter(Boolean);
  return `<div class="kart odeme-ozet">
    <div class="oo-ust">
      <div class="oo-kalan${kalan ? '' : ' tamam'}"><small>Kalan borç</small><b class="sayi">${kalan ? tl(kalan) : 'Borcu yok'}</b>${k.odeme.senetli || k.ucretsiz || k.odeme.iade ? `<span>${[k.odeme.senetli ? rozet('Senetli', 'mor') : '', k.ucretsiz ? 'Ücretsiz kursiyer (' + e(k.ucretsiz.neden) + ')' : '', k.odeme.iade ? 'İade ' + tl(k.odeme.iade) : ''].filter(Boolean).join(' · ')}</span>` : ''}</div>
      ${sonraki}
    </div>
    <div class="oo-ilerleme"><div class="oo-ilerleme-yazi"><span>Ödenen <b class="sayi">${tl(od)}</b></span><span>Toplam <b class="sayi">${tl(toplam)}</b></span></div>${ilerleme(od, toplam, 'yesil')}</div>
    ${gec.length > 1 ? `<p class="oo-uyari">${isaret('uyari', 18)}<span>${gec.length} taksit gecikti · toplam ${tl(gecikenTutar(k))}</span></p>` : ''}
    ${alinabilir ? `<button type="button" class="dg dg-ana oo-al" data-odeme-al>${ik('kart')}Ödeme al</button>` : ''}
    <details class="oo-menu"><summary>Diğer işlemler</summary><div class="oo-menu-liste">${islemler.map(([t, a, ikon]) => `<button type="button" class="dg dg-hafif" ${t === 'link' ? 'data-link' : t === 'senet' || t === 'makbuz' ? `data-belge="${t}"` : `data-odeme-islem="${t}"`}>${ik(ikon)}${a}</button>`).join('')}</div></details>
  </div>
  <details class="kart oo-blok"><summary><b>Taksit planı</b><small>${odenenSay}/${taksitSay} taksit ödendi${k.odeme.ekler && k.odeme.ekler.length ? ' · ' + k.odeme.ekler.length + ' ek kalem' : ''}</small></summary><div class="kart-govde">
    ${kalan && !S.kurs.iban ? `<p class="ipucu" style="margin-bottom:10px">${isaret('bilgi', 18)}<span>Ödeme bilgisinde IBAN görünmesi için Ayarlar › Kurs bilgileri’ne kursun banka hesabını girin (eğitim ücreti kurum hesabına yatırılarak tahsil edilir).</span></p>` : ''}
    <div class="taksit-sira"><span class="no">P</span><div><b style="color:var(--murekkep)">Peşinat</b><small style="display:block;color:var(--soluk)">${tarih(k.odeme.pesinTarih)}</small></div><span class="sayi">${tl(k.odeme.pesin)}</span>${rozet('Ödendi', 'yesil')}</div>
    ${k.odeme.taksitler.map((t, i) => `<div class="taksit-sira"><span class="no">${i + 1}</span><div><b style="color:var(--murekkep)">${i + 1}. taksit</b><small style="display:block;color:${!t.odendi && !t.iptal && fark(t.vade) < 0 ? 'var(--kirmizi)' : 'var(--soluk)'}">Vade ${tarih(t.vade)}${t.odendi ? ' · ödendi ' + tarih(t.odendi) + ' · ' + yontemAd(t.yontem) : t.kismi ? ' · ' + tl(t.kismi) + ' ödendi' : ''}</small></div><span class="sayi">${tl(t.tutar)}</span>${t.odendi ? rozet('Ödendi', 'yesil') : t.iptal ? rozet('İptal', 'notr') : `<button class="dg ${fark(t.vade) < 0 ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" data-tahsil="${i}">${t.kismi ? tl(taksitKalan(t)) + ' kaldı · ' : ''}${fark(t.vade) < 0 ? 'Gecikti · tahsil et' : 'Tahsil et'}</button>`}</div>`).join('')}
    ${(k.odeme.ekler || []).map((x, j) => `<div class="taksit-sira"><span class="no">+</span><div><b style="color:var(--murekkep)">${e(x.ad)}</b><small style="display:block;color:var(--soluk)">Ek kalem${x.odendi ? ' · ödendi ' + tarih(x.odendi) : ''}</small></div><span class="sayi">${tl(x.tutar)}</span>${x.odendi ? rozet('Ödendi', 'yesil') : `<button class="dg dg-cizgi dg-kucuk" data-ek-tahsil="${j}">Tahsil et</button>`}</div>`).join('')}
  </div></details>
  <details class="kart oo-blok"><summary><b>Hesap dökümü</b><small>Kalem kalem borç, ödeme ve iade</small></summary><div class="kart-govde">${OG.dokumTablo(k, false)}</div></details>`;
}
// Sağlık raporu ayrıntıları: raporu kim verdi, "sürücü olur" işareti, uzman hekim işaretleri ve sevk.
// Aile hekimi karar veremezse uzman hekime sevk eder; aday sevk raporunu getirebilir. Raporda "sürücü olur" işaretli olmalı.
const UZMANLIK = ['Göz', 'KBB', 'Nöroloji', 'Psikiyatri', 'Ortopedi', 'Kardiyoloji', 'Dahiliye', 'Diğer'];
const RAPOR_VEREN = ['Aile hekimi', 'Uzman hekim (sevkle)', 'Hastane (heyet)'];
function raporAyrintiHtml(r) {
  r = r || {};
  return `<details class="alan tam rapor-ayrinti" ${r.veren || r.uzman || r.geceKisit ? 'open' : ''}><summary style="cursor:pointer;font-weight:700;color:var(--murekkep);font-size:14px">Sağlık raporu ayrıntıları</summary>
    <div class="form-izgara" style="margin-top:10px">
      <div class="alan"><label>Raporu veren</label><select name="rVeren"><option value="">Seçin</option>${RAPOR_VEREN.map(x => `<option ${r.veren === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <label class="alan" style="flex-direction:row;display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="rSurucu" ${r.surucuOlur !== false ? 'checked' : ''} style="width:18px;height:18px"> Raporda “sürücü olur” işaretli</label>
      <div class="alan tam"><span class="et">Uzman hekim işaretleri</span><div class="secim">${UZMANLIK.map(x => `<label><input type="checkbox" name="rUz" value="${x}" ${(r.uzman || []).includes(x) ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div><small style="color:var(--soluk)">Aile hekimi karar veremediğinde işaretlenen uzmanlıklar</small></div>
      <label class="alan tam" style="flex-direction:row;display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="rSevk" ${r.sevk ? 'checked' : ''} style="width:18px;height:18px"> Uzman hekim sevk raporu getirildi</label>
      <label class="alan tam" style="flex-direction:row;display:flex;gap:8px;align-items:flex-start;font-size:14px"><input type="checkbox" name="rGece" ${r.geceKisit ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px"> <span>Raporda gece araç kullanma kısıtı var<small style="display:block;color:var(--soluk)">Bu kursiyere gece dersi planlanmaz, gece dersi şartı da aranmaz (MTSK md.7/3).</small></span></label>
    </div></details>`;
}
const raporAyrintiOku = f => ({ veren: (f.rVeren && f.rVeren.value) || '', surucuOlur: !!(f.rSurucu && f.rSurucu.checked), uzman: [...f.querySelectorAll('[name=rUz]:checked')].map(x => x.value), sevk: !!(f.rSevk && f.rSevk.checked), ...(f.rGece && f.rGece.checked ? { geceKisit: true } : {}) });
// Eksik evrak isteği: eksikler tek tek seçilir, son gün verilir, kişiye özel mesaj düzenlenip WhatsApp'tan gönderilir.
// Son gün öğrenci kartında görünür; geçince kırmızı olur.
function evrakIstePenceresi(k) {
  const eks = eksikEvrak(k).filter(([x]) => x !== 'sozlesme' || !k.evrak.sozlesme), son = k.evrakSonGun && fark(k.evrakSonGun) >= 0 ? k.evrakSonGun : gun(7);
  const metin = (sec, sg) => `${selam(k)} kaydınızın tamamlanması için şu belgeler eksik:\n${sec.map((x, i) => `${i + 1}) ${x}`).join('\n')}\nLütfen en geç ${tamTarih(sg)} tarihine kadar ${kursAdi('e')} getirin ya da fotoğrafını bu numaraya WhatsApp’tan gönderin. Belgeler tamamlanmadan MEB kaydınız yapılamaz.`;
  pencere({
    baslik: 'Eksik evrakları iste', alt: tamAd(k),
    icerik: `<div style="display:grid;gap:8px">${eks.map(([key, t]) => `<label class="evrak" style="cursor:pointer"><input type="checkbox" data-ei="${key}" checked style="width:18px;height:18px"><span style="flex:1;color:var(--murekkep)">${e(t)}</span></label>`).join('')}</div>
      <div class="alan" style="margin-top:12px;max-width:220px"><label>Son gün</label><input type="date" name="son" value="${son}"></div>
      <div class="alan" style="margin-top:12px"><label>Mesaj (düzenleyebilirsiniz)</label><textarea name="m" rows="7" style="font-size:14px">${e(metin(eks.map(x => x[1]), son))}</textarea></div>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-wp" data-ei-gonder>WhatsApp’tan gönder</button>',
    onAc(d) {
      const ta = d.querySelector('[name=m]'), sg = d.querySelector('[name=son]'); let elle = false;
      ta.addEventListener('input', () => { elle = true; });
      const guncelle = () => { if (elle) return; const sec = eks.filter(([key]) => d.querySelector(`[data-ei="${key}"]`).checked).map(x => x[1]); ta.value = metin(sec, sg.value || son); };
      d.addEventListener('change', ev => { if (ev.target.matches('[data-ei],[name=son]')) guncelle(); });
      d.querySelector('[data-ei-gonder]').addEventListener('click', () => {
        if (!eks.some(([key]) => d.querySelector(`[data-ei="${key}"]`).checked)) return bildir('En az bir belge seçin', 'uyari');
        if (!sg.value) return bildir('Son günü seçin', 'uyari');
        k.evrakSonGun = sg.value; islem('Eksik evrak istedi', tamAd(k) + ' · son gün ' + tarih(sg.value)); kaydet(); kapatPencere();
        wpGonder(k, ta.value.trim(), 'Evrak isteği'); yenile();
      });
    },
  });
}
// Özel notlar: yalnız kurs müdürünün ekranında, başlıktaki küçük kilitten açılır. Tarihli notlar birikir; yanında resmî ödeme
// özeti salt okunur görünür. Öğrenci verisine, belgelere ve dışa aktarımlara girmez; ödeme ve ücrete dokunmaz, ayrı tutar tutmaz.
const ozelNotlar = k => { const l = (k.ozelNotlar || []).slice(); if (k.ozelNot && !l.some(x => x.m === k.ozelNot)) l.push({ t: k.ozelNotTarih || gun(0), m: k.ozelNot }); return l.sort((a, b) => b.t.localeCompare(a.t)); };
const ozelNotDugme = k => !mudurMu() ? '' : `<button class="ozel-kilit" type="button" data-ozel-ac title="Özel notlar (yalnız siz)" aria-label="Özel notlar">${ik('kilit')}${ozelNotlar(k).length ? `<em>${ozelNotlar(k).length}</em>` : ''}</button>`;
function ozelNotPenceresi(k, yenileFn) {
  if (!mudurMu()) return;
  const sn = OG.sonrakiTaksit(k), od = odenen(k), kal = kalanBorc(k), top = od + kal;
  const liste = () => { const l = ozelNotlar(k); return l.length ? `<ul class="ozel-liste">${l.map((x, i) => `<li><small>${tarih(x.t)}</small><p>${e(x.m)}</p><button type="button" class="ozel-sil" data-ozel-sil="${i}" aria-label="Notu sil">${ik('kapat')}</button></li>`).join('')}</ul>` : '<p class="ozel-bos">Henüz not yok.</p>'; };
  pencere({
    baslik: 'Özel notlar · ' + tamAd(k),
    icerik: `<div class="ozel-odeme"><div><small>Toplam</small><b>${tl(top)}</b></div><div><small>Ödenen</small><b>${tl(od)}</b></div><div><small>Kalan</small><b${kal ? ' style="color:var(--kirmizi)"' : ''}>${kal ? tl(kal) : 'Yok'}</b></div><div><small>Sıradaki taksit</small><b>${sn ? tarih(sn.t.vade) + ' · ' + tl(sn.t.tutar - (sn.t.kismi || 0)) : '—'}</b></div></div>
      <div data-ozel-liste>${liste()}</div>
      <form data-ozel-ekle class="ozel-ekle"><textarea class="girdi" name="n" rows="2" maxlength="1000" placeholder="Örn. arkadaşımın tavsiyesiyle geldi"></textarea><button class="dg dg-koyu dg-kucuk" type="submit">Not ekle</button></form>
      <p class="ozel-bilgi">${ik('kilit')}Yalnız siz görürsünüz. Ödeme ve kasa kayıtlarını değiştirmez; belgelere, MEB ve müşavir çıktılarına girmez.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc(d) {
      const tazele = () => { d.querySelector('[data-ozel-liste]').innerHTML = liste(); };
      d.querySelector('[data-ozel-ekle]').addEventListener('submit', ev => { ev.preventDefault(); const v = ev.target.n.value.trim().slice(0, 1000); if (!v) return; k.ozelNotlar = ozelNotlar(k); delete k.ozelNot; delete k.ozelNotTarih; k.ozelNotlar.unshift({ t: gun(0), m: v }); ev.target.n.value = ''; kaydet(); tazele(); if (yenileFn) yenileFn(); bildir('Not eklendi'); });
      d.addEventListener('click', ev => { const b = ev.target.closest('[data-ozel-sil]'); if (!b) return; const l = ozelNotlar(k); l.splice(+b.dataset.ozelSil, 1); k.ozelNotlar = l; delete k.ozelNot; delete k.ozelNotTarih; kaydet(); tazele(); if (yenileFn) yenileFn(); });
    },
  });
}
// Kaydı tamamen silme (yanlış ya da deneme kaydı): kayıt kapatma penceresinden ve kapalı/ehliyetli kayıtlardaki 'Kaydı sil'den
async function kayitSilIslem(k, neden) {
  geriAlNoktasi();
  if (k.hesap && S._bulut) await B.ogrenciHesapKapat(k).catch(() => { });
  const ad = tamAd(k), id = k.id;
  S.kursiyerler = S.kursiyerler.filter(x => x.id !== id);
  S.dersler = S.dersler.filter(x => x.kursiyer !== id);
  // PAR-048: para hareketleri silinmez (makbuz serisi, kapanmış gün sonu, kasa ve müşavire giden fişler değişmesin); öğrenci bağı 'silinen öğrenci' izine döner
  S.hareket.forEach(x => { if (x.kursiyer !== id) return; x.silinenKursiyer = { id, ad, no: k.no || '', tarih: gun(0) }; delete x.kursiyer; if (x.aciklama && !String(x.aciklama).includes(ad)) x.aciklama = ad + ' · ' + x.aciklama; });
  S.sinavlar.forEach(x => { x.kursiyerler = (x.kursiyerler || []).filter(y => y !== id); if (x.sonuc) delete x.sonuc[id]; });
  S.bekleme = (S.bekleme || []).filter(b => b.kursiyer !== id);
  (S.bosTeklif || []).forEach(t => { t.adaylar = (t.adaylar || []).filter(y => y !== id); });
  S.imzaTalepleri = (S.imzaTalepleri || []).filter(t => t.kursiyer !== id);
  islem('Kaydı tamamen sildi', ad + ' · ' + neden); kaydet(); kapatPencere();
  bildir(ad + ' kaydı silindi'); location.hash = '#/kursiyerler';
}
function kayitSilPenceresi(k) {
  if (!mudurMu()) return;
  pencere({
    baslik: 'Kaydı sil · ' + tamAd(k),
    icerik: `<p class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 18)}<span>Kayıt; dersleri, sınav listeleri ve öğrenci hesabıyla birlikte kalıcı olarak silinir. Alınmış ödemeler kasada ve makbuz serisinde “silinen öğrenci” adıyla kalır. Yalnız yanlış ya da deneme kayıtları için kullanın; gerçek öğrencilerin kayıtları MEB için saklanmalıdır.</span></p><div class="alan"><label>Neden</label><input class="girdi" data-neden placeholder="Örn. deneme kaydı"></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kalıcı olarak sil</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { const neden = d.querySelector('[data-neden]').value.trim(); if (neden.length < 3) return bildir('Neden yazın', 'uyari'); pinSor('Kaydı tamamen silmek').then(onay => { if (onay) kayitSilIslem(k, neden); }); }); },
  });
}
export function kursiyerDetay(id) {
  const k = kursiyer(id);
  if (!k) return { baslik: 'Kursiyer bulunamadı', html: `<div class="kart">${bos('Bu kursiyer bulunamadı', 'Kayıt silinmiş ya da bağlantı hatalı olabilir.', '<a class="dg dg-koyu" href="#/kursiyerler">Kursiyerlere dön</a>')}</div>` };
  const S0 = SINIFLAR[k.sinif], eg = egitmen(k.egitmen) || { id: null, ad: 'Öğretmen atanmadı', siniflar: [] };
  const dersler = kursiyerDersleri(k.id).slice().sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const sinavlar = S.sinavlar.filter(s => s.kursiyerler.includes(k.id)).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const mesajlar = S.kurs.mesajGecmise === false ? [] : S.gonderimler.filter(g => g.kid ? g.kid === k.id : g.kime === tamAd(k));   // MSJ-027
  const eksik = eksikEvrak(k);
  const mebEksik = (() => { const l = mebOnKontrol(k); return k.mebIslendi ? 0 : l.filter(x => !x[0]).length; })();
  const sekmeHtml = () => sekmeler([['ozet', 'Özet'], ['dosya', 'Dosya', eksik.length || mebEksik || null], ['odeme', 'Ödeme'], ['dersler', 'Dersler', dersler.length], ['sinav', 'Sınavlar', sinavlar.length], ['mesaj', 'Notlar ve mesajlar', k.notlar.length || null], ['cikti', 'Çıktılar']], profilSekme === 'genel' ? 'ozet' : profilSekme, 'psekme');
  const govde = () => {
    if (profilSekme === 'ozet' || profilSekme === 'genel') { const ar = ustaAraci(k.egitmen, k.sinif); const r = risk(k); return `<div class="izgara iz-3">
      ${(t => t && k.asama !== 'Ehliyet' && !k.kapali ? `<div class="kart es-satir" style="grid-column:1/-1"><span class="es-satir-ik">${ik('teorik')}</span><b>${e(t)}</b>${k.esinavDekont && !k.esinavDekont.onay && String(k.esinavDekont.sira) === String(esinavHakDurum(k).sira) ? `<span class="es-dekont">${rozet('Dekont geldi', 'uyari')}<button class="dg dg-cizgi dg-kucuk" data-dekont-gor>Gör</button><button class="dg dg-ana dg-kucuk" data-dekont-onay>Ücret yattı</button></span>` : ''}<a class="dg dg-hafif dg-kucuk" href="#/sinavlar/yol">e-Sınav yolu</a></div>` : '')(TY.esinavSatiri(k))}
      ${k.ekDersTeklif ? `<div class="kart" style="grid-column:1/-1"><div class="kart-bas"><h3>Ek ders teklifi cevap bekliyor</h3><small>${tarih(k.ekDersTeklif.tarih)} · ${k.ekDersTeklif.n} ders · ${tl(k.ekDersTeklif.tutar)}</small><div class="sag" style="gap:6px"><button class="dg dg-ana dg-kucuk" data-ekders-kabul>Kabul etti</button><button class="dg dg-hafif dg-kucuk" data-ekders-ret>Reddetti</button></div></div><div class="kart-govde"><small style="color:var(--soluk)">Kursiyer kursiyer ekranından da kabul edebilir; telefonda kabul ettiyse buradan işaretleyin.</small></div></div>` : ''}${k.asama === 'Ehliyet' ? kapanisKart(k) : ''}${k.hakBitti && !k.hakBitti.cozuldu ? hakBittiKart(k) : ''}
      <div class="kart" style="padding:10px;order:6">${ar ? aracGorsel(ar) : ''}<div style="padding:10px 6px 4px"><b style="display:block;font-family:var(--baslik);font-size:17px;color:var(--murekkep)">${ar ? e(ar.model) + ' · ' : ''}${e(eg.ad)}</b><span style="font-size:14px">${ar ? `${e(ar.plaka)} · ${e(ar.vites)}. Dersler bu araçla ve bu usta öğreticiyle yapılıyor.` : `${e(eg.ad)} adına kayıtlı ${S0.ad} aracı yok; dersler o saatte boş olan ${S0.ad} aracıyla yapılır.`}</span></div></div>
      ${k.konuAnaliz ? `<div class="kart" style="order:5"><div class="kart-bas"><h3>Deneme sınavları</h3><small>Son: ${e((k.deneme || []).slice(-4).map(x => typeof x === 'object' && x ? (x.puan ?? '') : x).join(' · '))}</small></div><div class="kart-govde" style="display:grid;gap:8px">${Object.entries(KONULAR).map(([kn, [ad]]) => { const a = k.konuAnaliz[kn] || [0, 0], o = a[1] ? Math.round(a[0] / a[1] * 100) : 0; return `<div><div style="display:flex;justify-content:space-between;font-size:13.5px"><span>${ad}</span><b class="mono" style="color:${o < 70 ? 'var(--kirmizi)' : 'var(--murekkep)'}">%${o}</b></div>${ilerleme(o, 100, o < 70 ? '' : 'yesil')}</div>`; }).join('')}${Object.entries(KONULAR).some(([kn]) => { const a = k.konuAnaliz[kn] || [0, 1]; return a[0] / Math.max(1, a[1]) < 0.7; }) ? `<p style="font-size:13.5px;margin-top:4px;display:flex;gap:6px;align-items:center">${isaret('uyari', 16)}<span>Zayıf konu teorik öğretmenin listesine eklendi.</span></p>` : ''}${denemeListesi(k)}</div></div>` : ''}
      <div class="kart" style="order:4"><div class="kart-bas"><h3>Sınav riski</h3></div><div class="kart-govde">${r ? `<div style="display:flex;align-items:center;gap:14px">${isaret(r.puan >= 50 ? 'uyari' : r.puan >= 25 ? 'bilgi' : 'tamam', 44)}<div><b style="display:block;font-family:var(--baslik);font-size:24px;color:var(--murekkep)">${r.puan >= 50 ? 'Yüksek' : r.puan >= 25 ? 'Orta' : 'Düşük'} risk</b><span style="font-size:14px">${r.tur} · ${r.puan}/100</span></div></div>${r.nedenler.length ? `<ul style="margin:12px 0 0 18px;font-size:14px">${r.nedenler.map(n => `<li>${e(n)}</li>`).join('')}</ul>` : ''}${r.beceri ? `<p class="et" style="margin-top:14px">Son ${r.beceri.ders} dersin beceri puanı</p><div style="display:grid;gap:6px">${BECERI.map(([b, ad]) => { const v = r.beceri.beceri[b]; return v == null ? '' : `<div class="beceri-cubuk"><span>${ad}</span><i><b style="width:${v / 5 * 100}%;background:${v < 3 ? 'var(--kirmizi)' : v < 3.8 ? 'var(--sari)' : 'var(--yesil)'}"></b></i><b class="mono">${v.toFixed(1).replace('.', ',')}</b></div>`; }).join('')}</div>` : ''}${r.puan >= 25 ? `<button class="dg dg-ana dg-kucuk" style="margin-top:14px" data-ekders>Ek ders öner</button>` : ''}` : `<p style="font-size:14px">${k.asama === 'Ehliyet' ? 'Ehliyetini aldı.' : 'Teorik derslere başlayınca hesaplanır.'}</p>`}</div></div>
</div>`; }
    if (profilSekme === 'dosya') { const sat = (a, b, cls = '') => `<div class="kd-satir ${cls}"><span>${a}</span><b>${b}</b></div>`, bos0 = '<span style="color:var(--soluk)">—</span>', ob = k.oncekiBelge || {}, me0 = k.mebEvrak || {}, kv = k.kvkk || {};
      const grupBas = (h, bolum, ic, ek = '') => `<section class="kd-grup" id="dosya-${bolum}"><div class="kd-grup-bas"><h3>${h}</h3><div class="sag">${ek}${bolum !== 'sinav' ? `<button class="dg dg-hafif dg-kucuk" data-bilgi-duzenle="${bolum}">${ik('kalem')}Düzenle</button>` : ''}</div></div><div class="kd-satirlar">${ic}</div></section>`;
      return `<div class="kd-bolum">
      ${grupBas('Kimlik ve iletişim', 'kimlik', sat('TC kimlik', `<span class="mono" data-tc-alan>${tcMaskele(k.tc)}</span> ${oturum.kullanici && oturum.kullanici.rol === 'mudur' && k.tc ? '<button class="dg dg-hafif dg-kucuk" data-tc-goster>Göster</button>' : ''}`) + sat('Doğum tarihi', k.dogumTarihi ? tarih(k.dogumTarihi) + ' ' + k.dogumTarihi.slice(0, 4) + (yas(k.dogumTarihi) != null ? ' · ' + yas(k.dogumTarihi) + ' yaş' : '') : e(k.dogum || '—')) + sat('Cinsiyet', k.cinsiyet ? e(k.cinsiyet) : rozet('Girilmedi', 'uyari')) + sat('Cep telefonu', `<span class="num">${e(k.tel)}</span>`) + sat('Adres', e(k.adres || '—')) + sat('Baba adı', e(k.babaAdi || '—')) + sat('Anne adı', e(k.anaAdi || '—')) + sat('Doğum yeri', e(k.dogumYeri || '—')) + sat('Uyruk', e(k.uyruk || 'Türkiye')) + sat('Kimlik seri no', k.kimlikSeri ? `<span class="mono">${e(k.kimlikSeri)}</span>` : bos0) + sat('Kan grubu', e(k.kanGrubu || '—')) + sat('Öğrenim', e(k.ogrenim || '—')) + sat('Acil durumda', k.acil && k.acil.ad ? `${e(k.acil.ad)}${k.acil.yakinlik ? ' (' + e(k.acil.yakinlik) + ')' : ''} · ${e(k.acil.tel)}` : bos0) + sat('Nereden geldi', e(k.kaynak || '—')) + sat('Havale kodu', `<span class="mono">${e(odemeKodu(k))}</span> <small style="color:var(--soluk)">açıklamada bu kodu gören ödemeyi bu öğrenciye işler</small>`))}
      ${grupBas('Sınıf, dönem ve grup', 'sinif', sat('Sınıf', e(S0.ad) + (k.kendiArac ? ' <small style="color:var(--soluk)">· kendi aracıyla (md.7/5)</small>' : '')) + tabanBilgi(k, sat) + sat('Kayıt tarihi', tarih(k.kayit) + ' ' + String(k.kayit || '').slice(0, 4)) + (GR.teorikBitisMetni(k) && teorikVar(k) ? sat('Teorik dersler', e(GR.teorikBitisMetni(k))) : '') + sat('Dönem grubu', `${GR.kursiyerGrubu(k) ? e(GR.grupMetni(GR.kursiyerGrubu(k))) : '<span style="color:var(--soluk)">Atanmadı</span>'}${GR.bekleyenMi(k) ? ' ' + rozet('Bekleyen', 'uyari') : ''}${k.muaf ? ' ' + rozet('e-Sınavdan muaf', 'mavi') : esinavsizBelgeli(k) ? ' ' + rozet('Belgeli · e-sınav yok', 'notr') : belgeliMi(k) ? ' ' + rozet('Belgeli', 'notr') : ''} <button class="dg dg-hafif dg-kucuk" data-grup-sec>${GR.kursiyerGrubu(k) ? 'Değiştir' : 'Gruba ata'}</button>${k.meb && k.meb.grupFark ? `<small style="display:block;color:var(--kirmizi);font-weight:700;margin-top:4px">MEBBİS’te ${e(k.meb.grupFark.ad)} grubunda <button class="dg dg-ana dg-kucuk" data-grup-meb-tasi>MEBBİS’teki gruba taşı</button></small>` : ''}`) + sat('Usta öğretici', e(eg.ad)) + sat('Mevcut ehliyet', k.mevcutEhliyet ? `${e(k.mevcutEhliyet)}${ob.no ? ' · no ' + e(ob.no) : ''}${ob.tarih ? ' · ' + tarih(ob.tarih) + ' ' + ob.tarih.slice(0, 4) : ''}${k.mevcutOtomatik ? ' · sadece otomatik' : ''}${k.mevcutEski ? ' · eski tip' : ''} ${rozet('Sınıf geçişi', 'mavi')}` : 'Yok') + sat('Araç kullanabiliyor', k.aracKullanabiliyor ? 'Evet' : 'Belirtilmedi') + (k.odeme.indirim ? sat('İndirim', `${e(k.odeme.indirim.ad)} · −${tl(k.odeme.indirim.tutar)}`) : '') + sat('MEB kaydı', `${k.mebIslendi ? rozet('MEBBİS’e girildi', 'yesil') : rozet('Bekliyor', 'uyari')}${k.kayitBelgesi && k.kayitBelgesi.yuklendi ? ` <small style="color:var(--soluk)">· imzalı kayıt belgesi yüklendi ${tarih(k.kayitBelgesi.yuklendi)}</small>` : kayitBelgesiBekliyor(k) ? ` <small style="color:var(--turuncu)">· imzalı kayıt belgesi yüklenmedi (md.12/1)</small>` : ''}`) + sat('Teorik', `<span class="sayi">${k.teorik}/${teorikSaat(k)} saat</span>${ilerleme(k.teorik, teorikSaat(k))}`, 'tam') + (gd => `${sat('Direksiyon', `<span class="sayi">${k.direksiyon}/${gd.saat} ders</span>${ilerleme(k.direksiyon, gd.saat, 'yesil')}<small style="display:block;color:var(--soluk);margin-top:4px">${e(gd.kaynak)}${gd.teyit ? ' <b style="color:var(--turuncu)">· teyit bekliyor</b>' : ''}${gd.donuk && gd.yeni && gd.yeni.saat !== gd.saat ? ` · güncel mevzuatla ${gd.yeni.saat} ders` : ''}</small>${mudurMu() && SINIFLAR[k.sinif] && SINIFLAR[k.sinif].direksiyon ? `<span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" class="dg dg-hafif dg-kucuk" data-gerekli-elle>${ik('kalem')}Ders sayısını değiştir</button>${gd.donuk && gd.yeni && gd.yeni.saat !== gd.saat ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-yeni-kural>Güncel mevzuata geçir (${gd.yeni.saat} ders)</button>` : ''}</span>` : ''}`, 'tam')}`)(direksiyonAyrinti(k)))}
      ${grupBas('Sınav tercihleri ve istisnalar', 'sinav', sat('e-Sınav dili', `${esinavDilOzet(k)}${!(k.esinav && k.esinav.sonuc === 'Geçti') ? ` <button type="button" class="dg dg-hafif dg-kucuk" data-esinav-tercih>${ik('kalem')}Değiştir</button>` : ''}`) + sat('e-Sınav muafiyeti', k.muaf ? 'Muaf · ' + (k.muaf.dayanak === 'mebbis' ? 'MEBBİS' : 'md.15/5') + ' · son sınav ' + tarih(GR.muafSonSinav(k)) + ' ' + String(GR.muafSonSinav(k)).slice(0, 4) + (k.muaf.son ? ' · son gün ' + tarih(k.muaf.son) + ' ' + String(k.muaf.son).slice(0, 4) : '') + (k.meb && k.meb.durum && !/muaf/i.test(k.meb.durum) && !/uygulama/i.test(k.meb.durum) ? `<small style="display:block;color:var(--turuncu)">MEBBİS’te muafiyet görünmüyor (durum: ${e(k.meb.durum)})</small>` : '') : (o => o ? `<span style="color:${o.gecerli === false ? 'var(--kirmizi)' : 'var(--murekkep)'}">${e(o.metin)}</span>${o.gecerli ? ` <button type="button" class="dg dg-ana dg-kucuk" data-muaf-oneri>Muaf olarak işaretle</button>` : ''}` : 'Yok')(GR.muafiyetOnerisi(k))) + (teorikVar(k) ? sat('Teorik ders muafiyeti', `${(k.teorikDersMuaf && k.teorikDersMuaf.dersler || []).length ? e(TEORIK_MUAF_DERS.filter(([id]) => k.teorikDersMuaf.dersler.includes(id)).map(x => x[1]).join(', ')) + ' · md.16/2 · teorik ' + teorikSaat(k) + ' saat' : 'Yok'} <button type="button" class="dg dg-hafif dg-kucuk" data-teorik-muaf>${ik('kalem')}${(k.teorikDersMuaf && k.teorikDersMuaf.dersler || []).length ? 'Değiştir' : 'İşaretle'}</button>`) : '') + sat('İstisnalar', `${istisnaOzet(k)}${mudurMu() ? ` <button type="button" class="dg dg-hafif dg-kucuk" data-istisna>${ik('kalem')}${k.kontenjanDisi || k.yasIstisna || k.ktk118 || k.adayIptal ? 'Değiştir' : 'İşaretle'}</button>` : ''}`))}
      ${grupBas('Belge bilgileri', 'evrak', sat('Sağlık raporu', `${k.saglikRapor && k.saglikRapor.no ? e(k.saglikRapor.no) + (k.saglikRapor.tarih ? ' · ' + e(k.saglikRapor.tarih) : '') + (k.saglikRapor.veren ? ' · ' + e(k.saglikRapor.veren) : '') + ((k.saglikRapor.uzman || []).length ? ' · uzman: ' + e(k.saglikRapor.uzman.join(', ')) : '') + (k.saglikRapor.sevk ? ' · sevk raporu var' : '') + (k.saglikRapor.geceKisit ? ' ' + rozet('Gece kısıtı: gece dersi yok', 'turuncu') : '') + (k.saglikRapor.surucuOlur === false ? ' ' + rozet('“Sürücü olur” işaretsiz', 'kirmizi') : '') : rozet('No girilmedi', 'uyari')}`) + sat('Adli sicil', `${k.adliSicil && k.adliSicil.barkod ? `<span class="mono">${e(k.adliSicil.barkod)}</span>` : rozet('Barkod girilmedi', 'uyari')}`) + sat('Öğrenim belgesi', me0.ogrenim ? e([me0.ogrenim.tur, me0.ogrenim.veren, me0.ogrenim.tarih].filter(Boolean).join(' · ')) : bos0) + sat('Parmak izi belgesi', me0.parmak ? e([me0.parmak.veren, me0.parmak.tarih].filter(Boolean).join(' · ')) : bos0) + sat('Engel durumu', me0.saglik && me0.saglik.ozur === 'Var' ? 'Engeli var' : 'Yok'))}
      <div class="kart" id="dosya-evrak"><div class="kart-bas"><h3>Evraklar</h3><small>${EVRAKLAR.length - eksik.length}/${EVRAKLAR.length}${eksik.length && k.evrakSonGun ? ` · <b style="color:${fark(k.evrakSonGun) < 0 ? 'var(--kirmizi)' : 'var(--turuncu)'}">son gün ${tarih(k.evrakSonGun)}${fark(k.evrakSonGun) < 0 ? ' (geçti)' : ''}</b>` : ''}</small>${eksik.length || EVRAKLAR.some(([x]) => evrakKaynak(k, x)) ? `<div class="sag" style="gap:6px">${EVRAKLAR.some(([x]) => evrakKaynak(k, x)) ? `<button class="dg dg-cizgi dg-kucuk" data-tum-pdf title="MEBBİS JPEG kabul etmez; her belge ayrı A4 PDF olarak iner">${ik('indir')}Tüm belgeleri PDF indir</button>` : ''}${eksik.length ? `<button class="dg dg-wp dg-kucuk" data-evrak-hatirlat>${ik('wp')}Eksikleri iste</button>` : ''}</div>` : ''}</div><div class="kart-govde">
        ${EVRAKLAR.map(([key, t]) => `<label class="evrak"><span class="durum ${k.evrak[key] ? 'var' : 'yok'}">${ik(k.evrak[key] ? 'tik' : 'kapat')}</span><span style="flex:1;color:var(--murekkep)">${t}${(k.evrakYuklenen || {})[key] && !k.evrak[key] ? `<small class="evrak-yuklendi">${k.evrakYuklenen[key].kanal === 'WhatsApp' ? 'WhatsApp’tan geldi' : ['Kayıt formu', 'Evden kayıt'].includes(k.evrakYuklenen[key].kanal) ? 'Kayıt formunda yüklendi' : 'Öğrenci telefondan yükledi'} · ${tarih(k.evrakYuklenen[key].tarih)}${k.evrakYuklenen[key].bulanik ? ' · <b style="color:var(--kirmizi)">bulanık olabilir</b>' : ''}${k.evrakYuklenen[key].tahmin ? ' · başlık tahmini' : ''}</small>` : ''}</span>${(k.evrakYuklenen || {})[key] && !k.evrak[key] ? `${k.evrakYuklenen[key].veri ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-evrak-gor="${key}">Gör</button><button type="button" class="dg dg-hafif dg-kucuk" data-evrak-pdf="${key}|yuklenen" title="MEB için A4 PDF indir" aria-label="${t}: MEB için PDF indir">${ik('indir')}PDF</button>` : ''}<button type="button" class="dg dg-ana dg-kucuk" data-evrak-onay="${key}">Onayla</button><button type="button" class="dg dg-hafif dg-kucuk" data-evrak-geri="${key}">Yeniden iste</button>` : ''}${(k.evrakFoto || {})[key] ? `<img src="${k.evrakFoto[key]}" alt="${t} fotoğrafı" data-foto-buyut="${key}" style="width:34px;height:34px;object-fit:cover;border-radius:4px;border:1px solid var(--cizgi);cursor:zoom-in"><button type="button" class="dg dg-hafif dg-kucuk" data-evrak-pdf="${key}|foto" title="MEB için A4 PDF indir" aria-label="${t}: MEB için PDF indir">${ik('indir')}PDF</button>` : `${(k.evrakPdf || {})[key] ? `<button type="button" class="dg dg-hafif dg-kucuk" data-evrak-pdf="${key}|pdf" title="Onaylanan PDF’i indir" aria-label="${t}: PDF indir">${ik('indir')}PDF</button>` : ''}<span class="dg dg-hafif dg-kucuk" style="position:relative;overflow:hidden">Fotoğraf<input type="file" accept="image/*" data-foto-yukle="${key}" style="position:absolute;inset:0;opacity:0;cursor:pointer"></span>`}${['saglik', 'adli'].includes(key) && k.evrak[key] ? ((k.dogrulama || {})[key] ? (() => { const v = k.dogrulama[key], f = v.gecerlilik ? fark(v.gecerlilik) : null; return `<button class="rozet rozet-${f != null && f < 0 ? 'kirmizi' : f != null && f <= 30 ? 'sari' : 'yesil'}" data-dogrula="${key}" title="${e(v.kim)} · ${tarih(v.tarih)}">${f != null && f < 0 ? 'Süresi doldu' : 'Doğrulandı'}${v.gecerlilik ? ' · ' + tarih(v.gecerlilik) : ''}</button>`; })() : `<button class="dg dg-cizgi dg-kucuk" data-dogrula="${key}">Doğrula</button>`) : ''}${key === 'sozlesme' ? (k.evrak.sozlesme ? (k.sozlesmeImza ? `<span class="rozet rozet-yesil" title="${e(k.sozlesmeImza.yontem)}">${k.sozlesmeImza.yontem === 'Ekranda' ? 'Ekranda imzalandı' : /^Uzaktan/.test(k.sozlesmeImza.yontem || '') ? 'Uzaktan imzalandı' : 'Islak imza'} · ${tarih(k.sozlesmeImza.tarih)}</span>${olcuAltiIsaret(k.sozlesmeImza.kanit)}` : '') : `${(S.imzaTalepleri || []).some(t => t.kursiyer === k.id && t.tur === 'sozlesme' && t.durum === 'bekliyor') ? '<span class="rozet rozet-sari">Link gönderildi</span>' : ''}<button class="dg dg-ana dg-kucuk" data-sozlesme>İmzalat</button>`) : ''}<span class="anahtar"><input type="checkbox" data-evrak="${key}" ${k.evrak[key] ? 'checked' : ''} aria-label="${t} teslim alındı"><i></i></span></label>`).join('')}
      </div></div>

      ${grupBas('Onaylar', 'onay', sat('KVKK aydınlatma', kv.aydinlatma || kv.riza ? 'Verildi' + (kv.tarih ? ' · ' + tarih(kv.tarih) : '') : rozet('Verilmedi', 'uyari')) + sat('WhatsApp bilgilendirme', kv.whatsapp ? 'Kabul etti' : kv.whatsapp === false ? 'Kabul etmedi' : 'Sorulmadı') + sat('Kampanya rızası', kv.pazarlama ? 'Var' : 'Yok') + sat('Sözleşme', k.evrak.sozlesme ? (k.sozlesmeImza ? (k.sozlesmeImza.yontem === 'Ekranda' ? 'Ekranda imzalandı' : /^Uzaktan/.test(k.sozlesmeImza.yontem || '') ? 'Uzaktan imzalandı' : 'Islak imza') + ' · ' + tarih(k.sozlesmeImza.tarih) : 'İmzalı') : `${rozet('İmzalanmadı', 'uyari')} <button class="dg dg-hafif dg-kucuk" data-sozlesme>İmzalat</button>`))}
      <div class="kart" id="dosya-meb"><div class="kart-bas"><h3>MEBBİS ön kontrol</h3><small>${(() => { const l = mebOnKontrol(k); return l.filter(x => x[0]).length + '/' + l.length; })()}</small>${k.mebNo ? `<span class="rozet rozet-yesil" title="MEBBİS kayıt numarası">${e(k.mebNo)}</span>` : ''}<div class="sag" style="gap:6px">${k.mebIslendi ? rozet('Girildi', 'yesil') : `${!eksik.length ? `<button class="dg dg-ana dg-kucuk" data-meb-gonder="kayit-${k.id}">MEBBİS’e gönder</button>` : ''}<a class="dg dg-cizgi dg-kucuk" href="#/mebbis/${k.id}">Elle giriş</a>`}</div></div><div class="kart-govde"><ul style="list-style:none;display:grid;gap:6px;font-size:14px">${mebOnKontrol(k).map(([ok, t]) => `<li style="display:flex;gap:8px;align-items:center">${isaret(ok ? 'tamam' : 'uyari', 18)}<span style="${ok ? '' : 'font-weight:700;color:var(--murekkep)'}">${t}</span></li>`).join('')}</ul></div></div>
      </div>`; }
    if (profilSekme === 'cikti') return `<div class="kd-bolum">
      <div class="kart"><div class="kart-bas"><h3>Belgeler</h3></div><div class="kart-govde" style="display:grid;gap:8px">${[['sozlesme', 'Sözleşme'], ['bilgi', 'Bilgi formu'], ['ek1', 'Müracaat formu (EK-1)'], ['takip', 'Direksiyon takip formu'], ['makbuz', 'Son makbuz']].concat(gerekliDireksiyon(k) ? [['ek5', '“K” aday belgesi (EK-5)'], ['ek34', 'Sınav değerlendirme formu (' + (ek3Sinif(k.sinif) ? 'EK-3' : 'EK-4') + ')']] : []).concat(k.odeme.senetli ? [['senet', 'Senet']] : []).map(([t, a]) => `<button class="dg dg-cizgi dg-kucuk dg-sar" style="justify-content:flex-start" data-belge="${t}">${ik('belge')}${a}</button>`).join('')}</div></div>
      </div>`;
    if (profilSekme === 'dersler') return `<div class="kart"><div class="kart-bas"><h3>Direksiyon dersleri</h3><small>${k.direksiyon} yapıldı · ${dersler.filter(d => d.durum === 'Planlandı').length} planlı${dersler.some(d => d.ogrenciOnay) ? ` · öğrenci onayı ${dersler.filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'onay').length}${dersler.some(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'itiraz') ? ', itiraz ' + dersler.filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'itiraz').map(d => tarih(d.tarih) + (d.ogrenciOnay.not ? ' (“' + e(d.ogrenciOnay.not) + '”)' : '')).join(', ') : ''}` : ''}${imzasizDers(k).length ? ' · ' + imzasizDers(k).length + ' dersin kursiyer imzası eksik' : ''}</small><div class="sag" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${imzasizDers(k).length ? `<button class="dg dg-wp dg-kucuk" data-ders-imza>${ik('wp')}İmzaya gönder</button>` : ''}${PL.ihtiyac(k).toplam > 0 && !k.kapali ? `<button class="dg dg-cizgi dg-kucuk" data-plan-oner="${e(k.id)}">${ik('robot')}Ders planı öner</button>` : ''}<a class="dg dg-ana dg-kucuk" href="#/plan">${ik('arti')}Ders planla</a></div></div>
      ${dersSayacSeridi(k)}
      <ul class="liste ders-liste" style="margin-top:8px">${dersler.map(d => { const et = d.durum === 'İptal' || d.durum === 'Gelmedi' ? 'normal' : egitimTuruOf(k, d); return `<li><span class="zaman">${d.saat}</span><div><b style="color:var(--murekkep)">${tarihUzun(d.tarih)}</b>${et !== 'normal' ? ' ' + rozet(EGITIM_TURU[et].kisa, et === 'onSinav' ? 'uyari' : 'mavi') : ''}${(u => u ? ' ' + rozet(UY.metin(u).kisa, 'kirmizi') : '')(UY.dersUyumsuz(d.id))}<small style="display:block;color:var(--soluk)">${e(egitmen(d.egitmen).ad)}${d.tur && d.tur !== 'trafik' ? ' · ' + DERS_TUR_AD[d.tur] : ''}${geceDersMi(d) ? ' · gece' : ''}</small></div><span class="sag">${d.arac ? plaka(arac(d.arac).plaka) : ''}${d.durum === 'Yapıldı' ? (imzasiz(d) ? rozet(d.imza && d.imza.kursiyerBekliyor ? 'İmza bekleniyor' : 'İmzasız', 'uyari') : rozet(d.imza && d.imza.kursiyerUzaktan ? 'Uzaktan imzalı' : 'İmzalı', 'yesil') + olcuAltiIsaret(d.imza && d.imza.kanit)) : ''}${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</span></li>`; }).join('') || '<li>' + bos('Henüz direksiyon dersi yok', 'Teorik dersler ve e-sınav bittikten sonra planlanır.') + '</li>'}</ul></div>`;
    if (profilSekme === 'odeme') return odemeSekmesi(k);
    if (profilSekme === 'sinav') return psikoSatiri(k) + (k.hakBitti && !k.hakBitti.cozuldu ? hakBittiKart(k) + '<div class="ara-bosluk"></div>' : '') + (!(k.esinav && k.esinav.sonuc === 'Geçti') ? HZ.hazirlikKarti(k, false) : '') + /* hak doldu kararı: Yapılacaklar › “Karar ver” bu sekmeyi açar */ MZ.hazirKarti(k) + denemeKarti(k) + `<div class="izgara iz-2">${[['e-Sınav', k.esinav], ['Uygulama sınavı', k.dsinav]].map(([t, s]) => `<div class="kart gosterge"><small>${t}</small><b>${s ? s.sonuc : '—'}</b><span>${s ? (s.puan ? s.puan + ' puan · ' : '') + s.hak + '. hak' + (s.sonuc === 'Kaldı' ? ' · ' + Math.max(0, (S.kurs.sinavHak || 4) - s.hak) + ' hak kaldı' : '') : (t === 'e-Sınav' ? (k.teorik >= teorikSaat(k) - 4 ? 'Sınava hazır' : 'Teorik dersler sürüyor') : k.dsinavPlan ? 'Sınav ' + goreli(k.dsinavPlan) : 'Direksiyon dersleri sürüyor')}</span></div>`).join('')}</div>
      <div class="ara-bosluk"></div><div class="kart"><div class="kart-bas"><h3>Sınav oturumları</h3></div><ul class="liste" style="margin-top:8px">${sinavlar.map(s => `<li><span class="oto-ik">${ik(s.tur === 'e-Sınav' ? 'teorik' : 'direksiyon')}</span><div><b style="color:var(--murekkep)">${s.tur} · ${tarihUzun(s.tarih)} ${s.saat}</b><small style="display:block;color:var(--soluk)">${e(s.yer)}</small></div><span class="sag">${s.sonuc[k.id] ? rozet(s.sonuc[k.id], s.sonuc[k.id] === 'Geçti' ? 'yesil' : 'kirmizi') : rozet(goreli(s.tarih), 'mavi')}</span></li>`).join('') || '<li>' + bos('Henüz sınava atanmadı', 'Sınavlar sayfasından oturuma ekleyebilirsiniz.') + '</li>'}</ul></div>`;
    return `<div class="kd-bolum">
      ${GO.gorusmeKarti({ kisi: { tur: 'kursiyer', id: k.id, tel: k.tel }, baslik: 'Görüşmeler' })}<div class="ara-bosluk"></div>
      <div class="kart"><div class="kart-bas"><h3>Notlar</h3></div><div class="kart-govde">
        <ul class="zaman-cizgisi">${k.notlar.map(n => `<li>${e(n.metin)}<small>${goreli(n.tarih)}</small></li>`).join('') || '<li style="color:var(--soluk)">Henüz not yok.<small>Usta öğretici notları ve görüşmeler burada birikir.</small></li>'}</ul>
        <form data-not style="display:flex;gap:8px;margin-top:10px"><input class="girdi" name="n" placeholder="Not ekleyin" aria-label="Not"><button class="dg dg-koyu" type="submit">Ekle</button></form>
      </div></div>
      <div class="kart"><div class="kart-bas"><h3>WhatsApp geçmişi</h3><small>Otomatik hatırlatmalar ve gönderdiğiniz mesajlar</small></div><div class="kart-govde">
      <ul class="zaman-cizgisi">${mesajlar.map(m => `<li>${e(m.metin)}<small>${e(m.tur)} · ${new Date(m.zaman).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</small></li>`).join('')}
${mesajlar.length ? '' : '<li style="color:var(--soluk)">Bu kursiyere henüz mesaj gönderilmedi.<small>Gönderilen her mesaj burada listelenir.</small></li>'}</ul>
      <form data-mesaj style="display:flex;gap:8px;margin-top:12px"><input class="girdi" name="m" placeholder="${e(k.ad)} kişisine mesaj yazın" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('wp')}Gönder</button></form></div></div></div>`;
  };
  return {
    baslik: tamAd(k), alt: 'Kursiyer dosyası',
    html: `<a class="dg dg-hafif" href="#/kursiyerler" style="margin:-6px 0 10px -8px">${ik('sol')}Kursiyerler</a>
    <div class="kart">
      <div class="profil-bas"><button type="button" class="profil-foto ${k.foto ? 'var' : ''}" data-profil-foto title="${k.foto ? 'Fotoğrafı değiştir' : 'Fotoğraf çek ya da yükle'}">${k.foto ? `<img src="${k.foto}" alt="${e(tamAd(k))} fotoğrafı">` : `${ik('kursiyer')}<small>Fotoğraf</small>`}</button><div><span class="profil-no">No ${e(String(k.no || '—'))}</span><h2 style="margin-top:6px">${e(tamAd(k))}</h2><div class="meta"><span>${asamaRozet(k.asama)}</span>${mebEtiketleri(k).map(x => `<span title="MEBBİS etiketi">${rozet(x, /ceza|dışı|dondur/i.test(x) ? 'kirmizi' : /ücretsiz/i.test(x) ? 'yesil' : 'mor')}</span>`).join('')}<span>${ik('direksiyon')}${S0.ad}</span><span>${ik('tel')}<span class="num">${e(k.tel)}</span></span><span>${ik('kursiyer')}${e(eg.ad)}</span></div></div>
        <div class="sag"><button class="dg dg-wp" data-wp>${ik('wp')}WhatsApp</button>${kalanBorc(k) > 0 && !k.kapali ? `<button class="dg dg-ana" data-odeme-al>${ik('kart')}Ödeme al</button>` : ''}<button class="dg dg-cizgi" data-ileri ${k.asama === 'Ehliyet' || k.kapali ? 'disabled' : ''}>${ik('ok')}Sonraki aşamaya geçir</button>${ozelNotDugme(k)}${mudurMu() ? `<details class="kayit-diger"><summary class="dg dg-hafif" aria-label="Diğer işlemler">⋯</summary><div class="kayit-diger-menu">${!k.kapali && k.asama !== 'Ehliyet' ? '<button class="dg dg-hafif" data-kapat-kayit>Kaydı kapat (ayrıldı / dondur)</button>' : ''}${k.kapali || k.asama === 'Ehliyet' ? '<button class="dg dg-hafif" data-kayit-sil style="color:var(--kirmizi)">Kaydı sil</button>' : ''}</div></details>` : ''}</div></div>
      ${k.kapali ? `<div class="ipucu uyari" style="margin:0 20px 14px">${isaret('uyari', 22)}<span style="flex:1"><b>${k.kapali.tur === 'dondur' ? 'Kayıt donduruldu' : 'Kayıt kapatıldı'}</b> · ${tarih(k.kapali.tarih)} · ${e(k.kapali.neden)}${k.kapali.kim ? ' · ' + e(k.kapali.kim) : ''}</span>${mudurMu() ? '<button class="dg dg-cizgi dg-kucuk" data-kayit-ac>Yeniden aç</button>' : ''}</div>` : ''}
      ${yol(asamaNo(k), true)}
      ${profilEksikleri(k)}
      <div style="height:18px"></div>
    </div>
    ${dosyaSeridi(k, eksik)}
    ${HS.hesapSeridi(k)}
    <div id="ps">${sekmeHtml()}</div><div id="pg">${govde()}</div>`,
    baglan(kap) {
      const ciz = () => { kap.querySelector('#ps').innerHTML = sekmeHtml(); kap.querySelector('#pg').innerHTML = govde(); };
      kap.addEventListener('click', ev => {
        const s = ev.target.closest('[data-psekme]'); if (s) { profilSekme = s.dataset.psekme; ciz(); }
        if (ev.target.closest('[data-wp]')) { profilSekme = 'mesaj'; ciz(); kap.querySelector('[data-mesaj] input').focus(); }
        if (ev.target.closest('[data-ileri]')) asamaIlerlet(k);
        if (ev.target.closest('[data-kapat-kayit]')) kayitKapat(k);
        if (ev.target.closest('[data-kayit-sil]')) kayitSilPenceresi(k);
        if (ev.target.closest('[data-ozel-ac]')) ozelNotPenceresi(k, () => ciz());
        if (ev.target.closest('[data-kayit-ac]')) { const eski = k.kapali; if (eski && eski.tur === 'kapat') { k.odeme.taksitler.forEach(t => { if (t.iptal === eski.tarih) delete t.iptal; }); k.odeme.toplam += eski.iptalTutar || 0; } k.kapali = null; islem('Kaydı yeniden açtı', tamAd(k)); kaydet(); bildir(tamAd(k) + ' kaydı yeniden açıldı' + (eski && eski.tur === 'kapat' ? '; iptal edilen taksitler geri alındı, vadelerini kontrol edin' : '')); yenile(); }
        if (ev.target.closest('[data-evrak-hatirlat]')) evrakIstePenceresi(k);
        if (ev.target.closest('[data-esinav-tercih]')) import('./sayfalar2.js?v=234').then(m => m.esinavTercihPenceresi(k, yenile));
        { const hy = ev.target.closest('[data-hak-yandi]'); if (hy) return hakYandiIsle(k, hy.dataset.hakYandi); }
        // il taban listesi notu 8 (MTSK md.12/1): kayıt formundan ya da uzaktan imzayla gelen kayıt, kimlikle kursa gelince müdür onayıyla tamamlanır
        if (ev.target.closest('[data-gozetim]') && mudurMu()) { k.mudurGozetim = { tarih: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '', kanal: 'Kursta tamamlandı' }; islem('Kaydı kurs merkezinde müdür gözetiminde tamamladı', tamAd(k)); kaydet(); bildir('Kayıt kursta tamamlandı olarak işlendi'); return yenile(); }
        if (ev.target.closest('[data-kayit-belgesi]')) { k.kayitBelgesi = { yuklendi: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '' }; islem('İmzalı kayıt belgesini MEBBİS’e yükledi (md.12/1)', tamAd(k)); kaydet(); bildir('Kaydedildi'); return yenile(); }
        if (ev.target.closest('[data-link]')) wpGonder(k, `${selam(k)} ${kursAdi('e')} kalan ödemeniz ${tl(kalanBorc(k))}. ${odemeBilgisi(k)}`, 'Ödeme bilgisi');
        const t = ev.target.closest('[data-tahsil]'); if (t) tahsilAl(k, +t.dataset.tahsil);
        if (ev.target.closest('[data-odeme-al]')) return odemeAl(k);
        const tg = ev.target.closest('[data-tc-goster]'); if (tg) pinSor('TC kimlik numarasını tam göstermek').then(onay => { if (!onay) return; const al = document.querySelector('[data-tc-alan]'); if (al) al.textContent = k.tc; const b = document.querySelector('[data-tc-goster]'); if (b) b.remove(); islem('TC kimlik görüntüledi', tamAd(k)); kaydet(); });
        if (ev.target.closest('[data-grup-sec]')) { ev.preventDefault(); return GR.grupAtaPencere(k, yenile); }
        if (ev.target.closest('[data-teorik-muaf]')) { ev.preventDefault(); return teorikMuafPenceresi(k); }
        // MEBBİS'ten gelen muafiyet önerisi: kullanıcı onaylar, iz kaydı düşer (TEO-002)
        if (ev.target.closest('[data-muaf-oneri]')) { ev.preventDefault(); const o = GR.muafiyetOnerisi(k); if (!o || !o.gecerli) return; return pencere({ baslik: 'Muaf olarak işaretlensin mi?', icerik: `<p style="font-size:14px">${e(tamAd(k))}: ${e(o.metin)}</p><p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>Muaf aday teorik eğitime ve e-sınava girmez; yalnız direksiyon eğitimi ve sınavı (md.15/5). MEBBİS’teki duruma göre bir kez kontrol edin.</span></p>`, altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-evet>Muaf olarak işaretle</button>', onAc(d) { d.querySelector('[data-evet]').addEventListener('click', () => { k.muaf = { ...GR.muafKaydi(o.sonSinav, 'MEBBİS', o.iz.join('; ')), dayanak: o.kaynak }; k.esinav = { sonuc: 'Geçti', puan: null, tarih: o.sonSinav, muaf: true }; k.teorik = Math.max(k.teorik || 0, teorikSaat(k)); if (k.asama === 'Teorik') k.asama = 'Direksiyon'; islem('Muafiyeti MEBBİS önerisiyle işaretledi', tamAd(k) + ' · ' + o.iz.join('; ')); kaydet(); kapatPencere(); bildir('Muaf olarak işaretlendi', 'tamam'); yenile(); }); } }); }
        // MEBBİS'teki gruba taşı (DON-002): aday dosyasında görülen dönem/grup/şube; grup kartı yoksa MEBBİS'ten gelen tarihle açılır
        if (ev.target.closest('[data-grup-meb-tasi]') && k.meb && k.meb.grupFark) { ev.preventDefault(); const f = k.meb.grupFark; let g = (S.gruplar || []).find(y => GR.mebGrubuMu(y) && y.donem === f.donem && +y.grupNo === +f.grupNo && y.sube === f.sube);
          if (!g && f.baslangic) { g = { id: 'g' + f.donem + '-' + f.grupNo + f.sube, donem: f.donem, grupNo: +f.grupNo, sube: f.sube, baslangic: f.baslangic, ad: f.ad, sinif: '', derslik: '', kontenjan: null, meb: true, kaynak: 'MEBBİS' }; S.gruplar = [...(S.gruplar || []), g]; }
          if (!g) return bildir(`${f.ad} grubu mdSinyal’de yok ve başlangıç tarihi bilinmiyor; önce Ayarlar › Dönem ve gruplar’dan grubu açın`, 'uyari');
          const eski = GR.kursiyerGrubu(k); GR.grupAta(k, g); delete k.meb.grupFark; islem('Kursiyeri MEBBİS’teki gruba taşıdı', tamAd(k) + ' · ' + (eski ? eski.ad : '—') + ' → ' + g.ad); kaydet(); bildir(`${tamAd(k)} ${g.ad} grubuna taşındı`, 'tamam'); return yenile(); }
        const eo = ev.target.closest('[data-evrak-onay]'); if (eo) { ev.preventDefault(); const key = eo.dataset.evrakOnay, ad = EVRAKLAR.find(x => x[0] === key)[1]; k.evrak[key] = true; const yv = k.evrakYuklenen[key]; if (yv && yv.veri) { if (yv.tur === 'pdf') { k.evrakPdf = k.evrakPdf || {}; k.evrakPdf[key] = yv.veri; } else { k.evrakFoto = k.evrakFoto || {}; k.evrakFoto[key] = yv.veri; } } delete k.evrakYuklenen[key]; islem('Öğrencinin yüklediği evrakı onayladı', tamAd(k) + ' · ' + ad); if (!eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama)) { k.asama = 'Teorik'; bildir('Evraklar tamam, öğrenci teorik aşamaya geçti'); } else bildir(ad + ' onaylandı'); kaydet(); return yenile(); }
        const eg2 = ev.target.closest('[data-evrak-geri]'); if (eg2) { ev.preventDefault(); const key = eg2.dataset.evrakGeri, ad = EVRAKLAR.find(x => x[0] === key)[1]; delete k.evrakYuklenen[key]; islem('Evrakı yeniden istedi', tamAd(k) + ' · ' + ad); kaydet(); wpGonder(k, `${selam(k)} yüklediğiniz ${ad.toLocaleLowerCase('tr')} okunamadı. Lütfen belgenin net ve tamamı görünen bir fotoğrafını öğrenci ekranınızdan ya da bu mesaja yanıt olarak tekrar gönderin.`, 'Evrak geri istendi'); return yenile(); }
        if (ev.target.closest('[data-profil-foto]')) return profilFoto(k);
        if (ev.target.closest('[data-deneme-yeni]')) return import('./deneme.js?v=234').then(m => m.denemeAc(k, yenile));
        const dy = ev.target.closest('[data-deneme-yazdir]'); if (dy) return import('./deneme.js?v=234').then(m => m.denemeYazdir(k, (k.dDeneme || []).find(x => x.id === dy.dataset.denemeYazdir)));
        if (HS.hesapTikla(ev, k, yenile)) return;
        const ds = ev.target.closest('[data-dosya-git]'); if (ds) { const [sek, hedef] = ds.dataset.dosyaGit.split('|'); profilSekme = sek; ciz(); if (hedef) setTimeout(() => { const h = kap.querySelector('#' + hedef); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); return; }
        if (ev.target.closest('[data-ekders-kabul]')) return ekDersKabul(k);
        if (ev.target.closest('[data-ekders-ret]')) { k.ekDersTeklif = null; islem('Ek ders teklifi reddedildi', tamAd(k)); kaydet(); bildir('Teklif kapatıldı'); return yenile(); }
        const dg = ev.target.closest('[data-dogrula]'); if (dg) { ev.preventDefault(); return evrakDogrula(k, dg.dataset.dogrula); }
        // UYG-003: öğrencinin yüklediği e-sınav ücreti dekontu
        if (ev.target.closest('[data-dekont-gor]') && k.esinavDekont) { ev.preventDefault(); const y = k.esinavDekont; islem('Öğrenci dekontunu açtı', tamAd(k)); kaydet(); return pencere({ baslik: 'e-Sınav ücreti dekontu · ' + tamAd(k), genis: y.tur === 'pdf', icerik: y.tur === 'pdf' ? `<iframe src="${y.veri}" style="width:100%;height:60vh;border:0" title="Dekont"></iframe>` : `<img src="${y.veri}" alt="Dekont" style="max-width:100%;border-radius:8px">`, altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' }); }
        if (ev.target.closest('[data-dekont-onay]') && k.esinavDekont) { ev.preventDefault(); esinavUcretiIsle(k, 'dekont', k.esinavDekont.tarih); k.esinavDekont.onay = gun(0); islem('e-Sınav ücretini dekontla onayladı', tamAd(k)); kaydet(); bildir('e-Sınav ücreti yattı olarak işaretlendi'); return yenile(); }
        const eg3 = ev.target.closest('[data-evrak-gor]'); if (eg3) { ev.preventDefault(); const key = eg3.dataset.evrakGor, y = k.evrakYuklenen[key], ad = EVRAKLAR.find(x => x[0] === key)[1]; islem('Öğrenci evrakını açtı', tamAd(k) + ' · ' + ad); kaydet(); return pencere({ baslik: ad + ' · ' + tamAd(k), genis: y.tur === 'pdf', icerik: `${y.bulanik ? `<p class="ipucu uyari" style="margin-bottom:10px">${isaret('uyari', 20)}<span>Fotoğraf bulanık görünüyor; yazılar okunmuyorsa “Yeniden iste” ile öğrenciden tekrar isteyin.</span></p>` : ''}<div class="alan" style="margin-bottom:10px"><label>Bu belge hangisi?${y.tahmin ? ' <small style="color:var(--soluk);font-weight:400">(başlık tahmin edildi, kontrol edin)</small>' : ''}</label><select class="girdi" data-evrak-baslik style="max-width:320px">${EVRAKLAR.filter(([x]) => x === key || !k.evrak[x]).map(([x, t]) => `<option value="${x}" ${x === key ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` + (y.tur === 'pdf' ? `<iframe data-pdf title="${e(ad)}" style="width:100%;height:62vh;border:0;border-radius:8px"></iframe>` : `<img src="${y.veri}" alt="${e(ad)}" data-onizle style="width:100%;border-radius:8px">`), altlik: `<a class="dg dg-cizgi" href="${y.veri}" download="${e(tamAd(k) + ' - ' + ad + (y.tur === 'pdf' ? '.pdf' : '.jpg'))}">İndir</a>${y.tur === 'pdf' ? '' : `<button class="dg dg-cizgi" data-dondur title="Fotoğrafı 90° döndürür; PDF de böyle iner">Döndür</button><button class="dg dg-cizgi" data-pdf-indir title="MEBBİS JPEG kabul etmez; A4 PDF olarak indirir">${ik('indir')}PDF indir (MEB)</button>`}<button class="dg dg-cizgi" data-yeniden>Yeniden iste</button><button class="dg dg-hafif" data-kapat>Kapat</button><button class="dg dg-ana" data-evrak-onay="${key}">Onayla</button>`, onAc(d) { let anahtar = key; if (y.tur !== 'pdf') import('./evrak.js?v=234').then(m => m.pdfOnizleme(d, () => ({ k, key: anahtar, kaynak: 'yuklenen' }))); d.querySelector('[data-evrak-baslik]').addEventListener('change', ev => { import('./evrak.js?v=234').then(m => { const ob = kap.querySelector('[data-evrak-onay="' + anahtar + '"]'); m.evrakTasi(k, anahtar, ev.target.value); anahtar = ev.target.value; d.querySelector('[data-evrak-onay]').dataset.evrakOnay = anahtar; if (ob) ob.dataset.evrakOnay = anahtar; }); }); d.querySelector('[data-yeniden]').addEventListener('click', () => import('./evrak.js?v=234').then(m => { const yy = k.evrakYuklenen[anahtar]; delete k.evrakYuklenen[anahtar]; islem('Evrakı yeniden istedi', tamAd(k) + ' · ' + EVRAKLAR.find(x => x[0] === anahtar)[1]); kaydet(); kapatPencere(); wpGonder(k, m.yenidenIsteMetni(k, anahtar, yy && yy.bulanik), 'Evrak isteği'); yenile(); })); const fr = d.querySelector('[data-pdf]'); if (fr) fetch(y.veri).then(r => r.blob()).then(bl => { fr.src = URL.createObjectURL(bl); }); d.querySelector('[data-evrak-onay]').addEventListener('click', () => { kapatPencere(); const b = kap.querySelector('[data-evrak-onay="' + anahtar + '"]'); if (b) b.click(); }); } }); }
        const fb = ev.target.closest('[data-foto-buyut]'); if (fb) { ev.preventDefault(); islem('Evrak fotoğrafını açtı', tamAd(k) + ' · ' + EVRAKLAR.find(x => x[0] === fb.dataset.fotoBuyut)[1]); kaydet(); pencere({ baslik: EVRAKLAR.find(x => x[0] === fb.dataset.fotoBuyut)[1] + ' · ' + tamAd(k), icerik: `<img src="${k.evrakFoto[fb.dataset.fotoBuyut]}" alt="" data-onizle style="width:100%;border-radius:8px">`, altlik: `<button class="dg dg-cizgi" data-dondur title="Fotoğrafı 90° döndürür; PDF de böyle iner">Döndür</button><button class="dg dg-hafif" data-kapat>Kapat</button><button class="dg dg-ana" data-pdf-indir title="MEBBİS JPEG kabul etmez; A4 PDF olarak indirir">${ik('indir')}PDF indir (MEB)</button>`, onAc(d) { import('./evrak.js?v=234').then(m => m.pdfOnizleme(d, () => ({ k, key: fb.dataset.fotoBuyut, kaynak: 'foto' }))); } }); }
        const ep = ev.target.closest('[data-evrak-pdf]'); if (ep) { ev.preventDefault(); const [key, kaynak] = ep.dataset.evrakPdf.split('|'); ep.disabled = true; return import('./evrak.js?v=234').then(m => m.evrakPdfIndir(k, key, { kaynak })).finally(() => { ep.disabled = false; }); }
        const tp = ev.target.closest('[data-tum-pdf]'); if (tp) { tp.disabled = true; return import('./evrak.js?v=234').then(m => m.tumEvrakPdf(k)).finally(() => { tp.disabled = false; }); }
        const oi = ev.target.closest('[data-odeme-islem]'); if (oi) odemeIslem(k, oi.dataset.odemeIslem);
        if (MZ.hazirTikla(ev, k, ciz)) return;
        const et = ev.target.closest('[data-ek-tahsil]'); if (et) ekKalemTahsil(k, +et.dataset.ekTahsil);
        const bl = ev.target.closest('[data-belge]'); if (bl) import('./sayfalar3.js?v=234').then(m => m.belgeAc(bl.dataset.belge, k.id));
        if (ev.target.closest('[data-ekders]')) ekDersOner(k);
        if (ev.target.closest('[data-sozlesme]')) sozlesmeImzalat(k);
        { const po = ev.target.closest('[data-plan-oner]'); if (po) return otoPlanPenceresi({ kursiyerler: [k.id] }); }   // DIR-041
        if (ev.target.closest('[data-ps-ver]')) return PS.randevuPenceresi({ kursiyerId: k.id, sonra: yenile });   // DIR-043
        if (GO.gorusmeTikla(ev, yenile, { tur: 'kursiyer', id: k.id, ad: tamAd(k), tel: k.tel })) return;   // DIG-009
        if (ev.target.closest('[data-ders-imza]')) import('./imza.js?v=234').then(m => m.imzayaGonderPenceresi(k, 'ders', imzasizDers(k).map(d => d.id)));
        { const bd = ev.target.closest('[data-bilgi-duzenle]'); if (bd) bilgiDuzenle(k, bd.dataset.bilgiDuzenle || 'kimlik'); }
        if (ev.target.closest('[data-gerekli-elle]')) gerekliElleDuzenle(k);
        if (ev.target.closest('[data-istisna]')) istisnaDuzenle(k);
        if (ev.target.closest('[data-yeni-kural]') && mudurMu()) { const eski = gerekliDireksiyon(k); geriAlNoktasi(); k.dersKural = 2; islem('Direksiyon ders sayısını güncel mevzuata geçirdi', tamAd(k) + ' · ' + eski + ' → ' + gerekliDireksiyon(k)); kaydet(); bildir(tamAd(k) + ': ' + gerekliDireksiyon(k) + ' ders'); yenile(); }
        const kp = ev.target.closest('[data-kapanis]'); if (kp) kapanisAdim(k, kp.dataset.kapanis);
        const hb = ev.target.closest('[data-hak-karar]'); if (hb) hakKarar(k, hb.dataset.hakKarar);
      });
      kap.addEventListener('change', ev => {
        const fy = ev.target.closest('[data-foto-yukle]');
        if (fy && fy.files[0]) { fotoKucult(fy.files[0]).then(u => { k.evrakFoto = k.evrakFoto || {}; k.evrakFoto[fy.dataset.fotoYukle] = u; k.evrak[fy.dataset.fotoYukle] = true; islem('Evrak fotoğrafı yükledi', tamAd(k)); kaydet(); bildir('Evrak fotoğrafı kaydedildi'); yenile(); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); return; }
        const c = ev.target.closest('[data-evrak]'); if (!c) return;
        k.evrak[c.dataset.evrak] = c.checked; if (c.dataset.evrak === 'sozlesme') k.sozlesmeImza = c.checked ? (k.sozlesmeImza || { tarih: gun(0), yontem: 'Islak imza', metin: sozlesmeDondur(k) }) : null; islem(c.checked ? 'Evrak teslim aldı' : 'Evrakı eksik işaretledi', tamAd(k) + ' · ' + EVRAKLAR.find(x => x[0] === c.dataset.evrak)[1]);
        if (!eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama)) { if (GR.aktifEt(k)) bildir(k.asama === 'Direksiyon' ? (k.muaf ? 'Evraklar tamam; e-sınavdan muaf, kursiyer direksiyon aşamasına geçti' : 'Evraklar tamam; belgeli aday teorik almaz, direksiyon aşamasına geçti') : 'Evraklar tamam, kursiyer teorik aşamaya geçti'); else bildir('Evraklar tamam; kursiyer bir dönem grubuna atanınca aktif olur', 'uyari'); }
        kaydet(); yenile();
      });
      kap.addEventListener('submit', ev => {
        ev.preventDefault();
        if (ev.target.matches('[data-not]')) { const v = ev.target.n.value.trim(); if (!v) return; k.notlar.unshift({ tarih: gun(0), metin: v }); kaydet(); ciz(); }
        if (ev.target.matches('[data-mesaj]')) { const v = ev.target.m.value.trim(); if (!v) return; wpGonder(k, v); ciz(); }
      });
    },
  };
}
// Ödeme al (kursiyer dosyasındaki büyük düğme): sıradaki açık taksitten başlar; taksit kalmadıysa açık ek kalemi tahsil eder
export function odemeAl(k, sonra) {
  const sn = OG.sonrakiTaksit(k); if (sn) return tahsilAl(k, sn.i, sonra);
  const j = (k.odeme.ekler || []).findIndex(x => !x.odendi); if (j >= 0) return ekKalemTahsil(k, j);
  bildir('Bu öğrencinin açık taksiti yok', 'uyari');
}
// Tahsilat penceresi: tutar (sıradaki taksitle dolu, değiştirilebilir), yöntem, tarih, isteğe bağlı not.
// Taksitten az alınırsa kalan aynı taksitte açık kalır (kısmi); fazlası sıradaki açık taksitlere geçer. Tek tahsilat = tek kasa hareketi = tek makbuz.
export function tahsilAl(k, i, sonra) {
  const t = k.odeme.taksitler[i]; if (!t || t.odendi || t.iptal) return odemeAl(k, sonra);
  const kalan = taksitKalan(t), sira = [{ t, i }, ...acikTaksitler(k).filter(x => x.i !== i)], azami = sira.reduce((a, x) => a + taksitKalan(x.t), 0), gec = fark(t.vade) < 0;
  pencere({
    baslik: 'Ödeme al',
    icerik: `<form id="f-tahsil" class="tahsil-form"><div class="kisi" style="margin-bottom:14px"><div><b>${e(tamAd(k))}</b><small${gec ? ' style="color:var(--kirmizi);font-weight:700"' : ''}>${i + 1}. taksit · vade ${tarih(t.vade)}${gec ? ' · gecikti' : ''}${t.kismi ? ' · ' + tl(t.kismi) + ' önceden ödendi' : ''}</small></div><small style="margin-left:auto;text-align:right;color:var(--soluk)">Kalan borç<b class="sayi" style="display:block;font-size:17px;color:var(--murekkep)">${tl(kalanBorc(k))}</b></small></div>
      <div class="alan"><label for="t-tutar">Tutar (₺)</label><input id="t-tutar" name="tutar" class="tahsil-tutar" inputmode="numeric" autocomplete="off" value="${kalan}"><small data-tutar-not style="color:var(--soluk)"></small></div>
      <span class="et" style="display:block;margin-top:14px">Ödeme yöntemi</span><div class="secim tahsil-yontem" style="margin-top:6px">${YONTEMLER.map((y, j) => `<label><input type="radio" name="y" value="${y}" ${y === varsayilanYontem() ? 'checked' : ''}><span>${yontemAd(y)}</span></label>`).join('')}</div>
      <p class="ipucu uyari" data-nakit hidden style="margin-top:10px">${isaret('uyari', 18)}<span>Eğitim ücreti kurumun MEB’e bildirilmiş banka hesabına yatırılarak tahsil edilir (Özel Öğretim Kurumları Yönetmeliği m.55/3, 5 Eylül 2025). Nakit aldıysanız bankaya yatırın.</span></p>
      <div class="tahsil-alt"><div class="alan"><label for="t-tarih">Tarih</label><input id="t-tarih" name="tarih" type="date" value="${gun(0)}" max="${gun(0)}"></div>
      <div class="alan"><label for="t-not">Not <small style="color:var(--soluk);font-weight:400">(isteğe bağlı)</small></label><input id="t-not" name="not" maxlength="200" placeholder="Örn. annesi getirdi"></div></div>
      <label style="display:flex;gap:10px;align-items:center;font-size:14px;margin-top:12px"><input type="checkbox" name="mak" checked style="width:18px;height:18px"> Makbuz bilgisini öğrenciye WhatsApp’tan gönder</label></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-tahsil">Ödemeyi kaydet</button>`,
    onAc(d) {
      const f = d.querySelector('form'), not = d.querySelector('[data-tutar-not]');
      const nk = () => { d.querySelector('[data-nakit]').hidden = f.y.value !== 'Nakit'; }; d.querySelectorAll('[name=y]').forEach(r => r.addEventListener('change', nk)); nk();
      const tutarNot = () => { const v = tutarOku(f.tutar.value) || 0; not.style.color = v > azami ? 'var(--kirmizi)' : 'var(--soluk)'; not.textContent = !v ? '' : v < kalan ? `Taksitin ${tl(kalan - v)}’si aynı taksitte açık kalır.` : v > azami ? `En fazla ${tl(azami)} alınabilir (açık taksitlerin toplamı).` : v > kalan ? `${tl(v - kalan)} sıradaki taksit${v - kalan > taksitKalan(sira[1].t) ? 'lere' : 'e'} sayılır.` : 'Taksitin tamamı.'; };
      f.tutar.addEventListener('input', tutarNot); tutarNot(); setTimeout(() => f.tutar.select(), 80);
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const y = f.y.value, v = tutarOku(f.tutar.value) || 0, tarihSec = f.tarih.value || gun(0), aciklamaNot = f.not.value.trim();
        if (!v) return bildir('Tutar girin', 'uyari');
        if (v > azami) { f.tutar.value = azami; tutarNot(); return bildir('Açık taksitlerin toplamı ' + tl(azami) + '; fazlası alınamaz', 'uyari'); }
        if (tarihSec > gun(0)) return bildir('İleri tarihli ödeme kaydedilemez', 'uyari');
        if ((S.gunSonu || []).includes(tarihSec)) return bildir(tamTarih(tarihSec) + ' günü kapatıldı; bu tarihe kayıt eklenemez', 'uyari');
        geriAlNoktasi();
        let kalanV = v; const parca = [], dagilim = [];
        for (const x of sira) {
          if (!kalanV) break;
          const al = Math.min(kalanV, taksitKalan(x.t)); kalanV -= al; dagilim.push({ i: x.i, al, vade: x.t.vade });
          x.t.kismi = (x.t.kismi || 0) + al;
          if (x.t.kismi >= x.t.tutar) { x.t.odendi = tarihSec; x.t.yontem = y; delete x.t.kismi; }
          parca.push((x.i + 1) + '. taksit' + (x.t.odendi ? '' : ' (kısmi)'));
        }
        islem('Tahsilat aldı', tamAd(k) + ' · ' + parca.join(', ') + ' · ' + tl(v) + (aciklamaNot ? ' · ' + aciklamaNot : ''));
        const hid = 'h' + Date.now(); S.hareket.unshift({ id: hid, tarih: tarihSec, tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + parca.join(', '), tutar: v, yontem: y, kursiyer: k.id, dagilim, ...(aciklamaNot ? { not: aciklamaNot } : {}) });
        const makGit = d.querySelector('[name=mak]') && d.querySelector('[name=mak]').checked;
        kaydet(); kapatPencere();
        if (makGit) wpGonder(k, `${selam(k)} ${tl(v)} ödemeniz alındı, teşekkür ederiz. Kalan borcunuz ${tl(kalanBorc(k))}. ${S.kurs.ad}`, 'Makbuz');
        // MSJ-026: yöneticiye anlık 'ödeme alındı' (o20; hat bağlıysa)
        import('./zamanlayici.js?v=234').then(m => m.anlikBildirim('o20', { ad: tamAd(k), tutar: tl(v), yontem: y, kaydeden: (oturum.kullanici || {}).ad || '', kalan: tl(kalanBorc(k)) })).catch(() => { });
        bildir(tl(v) + ' tahsil edildi' + (t.odendi ? '' : ', taksitte ' + tl(t.tutar - t.kismi) + ' kaldı'), 'tamam', true);
        sonra ? sonra() : yenile();
        makbuzPenceresi(k, hid);
      });
    },
  });
}
// Ödeme kaydedildikten sonra: makbuz numarası ve kalan borç; makbuz PDF'i ve WhatsApp'tan bildirim (mevcut belge ve mesaj akışları)
function makbuzPenceresi(k, hid) {
  const h = S.hareket.find(x => x.id === hid); if (!h) return;
  const kalan = kalanBorc(k), sn = OG.sonrakiTaksit(k);
  pencere({
    baslik: 'Ödeme kaydedildi',
    icerik: `<div class="makbuz-ozet">${isaret('tamam', 40)}<b class="sayi">${tl(h.tutar)}</b><span>${e(tamAd(k))} · ${e(yontemAd(h.yontem))} · ${tarih(h.tarih)}</span></div>
      <dl class="bilgi-tablo" style="margin-top:14px"><dt>Makbuz no</dt><dd class="mono" data-makbuz-no>${e(h.no || '—')}</dd><dt>Kalan borç</dt><dd><b class="sayi">${kalan ? tl(kalan) : 'Borcu yok'}</b></dd>${sn ? `<dt>${fark(sn.t.vade) < 0 ? 'Gecikmiş taksit' : 'Sıradaki taksit'}</dt><dd${fark(sn.t.vade) < 0 ? ' style="color:var(--kirmizi);font-weight:700"' : ''}>${tarih(sn.t.vade)} · ${tl(taksitKalan(sn.t))}${fark(sn.t.vade) < 0 ? ' · gecikti' : ''}</dd>` : ''}</dl>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-makbuz-pdf>${ik('belge')}Makbuz PDF</button><button class="dg dg-wp" data-makbuz-wp>${ik('wp')}WhatsApp’tan gönder</button>`,
    onAc(d) {
      d.querySelector('[data-makbuz-pdf]').addEventListener('click', () => { kapatPencere(); import('./sayfalar3.js?v=234').then(m => m.belgeAc('makbuz', hid)); });
      d.querySelector('[data-makbuz-wp]').addEventListener('click', () => { kapatPencere(); wpGonder(k, `${selam(k)} ${tl(h.tutar)} ödemeniz alındı, teşekkür ederiz. Kalan borcunuz ${tl(kalanBorc(k))}. ${S.kurs.ad}`, 'Makbuz'); });
    },
  });
}
export function ekKalemTahsil(k, j) {
  const x = k.odeme.ekler[j];
  pencere({
    baslik: x.ad + ' · ' + tl(x.tutar),
    icerik: `<div class="alan"><span class="et">Ödeme yöntemi</span><div class="secim">${YONTEMLER.map(y => `<label><input type="radio" name="y" value="${y}" ${y === varsayilanYontem() ? 'checked' : ''}><span>${y}</span></label>`).join('')}</div></div><label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" name="mak"> Makbuzu yazdır</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Tahsil et</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        geriAlNoktasi(); x.odendi = gun(0); const hid = 'h' + Date.now();
        S.hareket.unshift({ id: hid, tarih: gun(0), tur: 'Gelir', kategori: x.ad, aciklama: tamAd(k) + ' · ' + x.ad, tutar: x.tutar, yontem: d.querySelector('[name=y]:checked').value, kursiyer: k.id });
        islem('Tahsilat aldı', tamAd(k) + ' · ' + x.ad + ' · ' + tl(x.tutar)); kaydet(); kapatPencere(); bildir(x.ad + ' tahsil edildi', 'tamam', true); yenile();
        if (d.querySelector('[name=mak]').checked) import('./sayfalar3.js?v=234').then(m => m.belgeAc('makbuz', hid));
      });
    },
  });
}
export function odemeIslem(k, tur, oneri) {
  if (tur === 'ucretsiz') return MZ.ucretsizYap(k, yenile);
  const yi = tur === 'iade' ? MZ.yasalIade(k) : null;
  const acik = k.odeme.taksitler.filter(t => !t.odendi && !t.iptal);
  const tx = kursiyerTaban(k), tabanL = tx ? tx.liste : null;  // il taban listesi (not 4, 6, 7)
  const formlar = {
    indirim: ['İndirim uygula', `<div class="alan"><label>İndirim tutarı (₺)</label><input name="v" inputmode="numeric" placeholder="1000"></div><div class="alan" style="margin-top:12px"><label>Neden</label><select name="n">${(tabanL ? ['Peşin ödeme farkı', 'Pazarlık (ilan ile taban arası)'] : ['Öğrenci indirimi', 'Kardeş indirimi', 'Peşin ödeme indirimi', 'Kampanya']).map(x => `<option>${x}</option>`).join('')}</select></div><p style="font-size:13.5px;color:var(--soluk);margin-top:10px">İndirim son açık taksitlerden düşülür.</p>${tabanL ? `<p class="ipucu uyari" style="margin-top:10px">${isaret('uyari', 18)}<span>${e(listeAdi(tabanL))}: kardeş, arkadaş, toplu kayıt indirimi, promosyon, ödül, hediye gibi hiçbir ad altında kampanya düzenlenemez (not 6); ücret ${tx && tx.taban != null ? `<b>${tl(tx.taban)}</b> taban ücretin` : 'taban ücretin'} altına indirilemez, burs da verilemez (not 7).</span></p>` : ''}`],
    iade: ['İade yap', `<div class="alan"><label>İade tutarı (₺)</label><input name="v" inputmode="numeric" value="${oneri || ''}"></div><div class="alan" style="margin-top:12px"><label>Neden</label><select name="n"><option>Kurstan ayrıldı</option><option>Fazla ödeme</option><option>Diğer</option></select></div><p style="font-size:13.5px;color:var(--soluk);margin-top:10px">İade kasaya gider olarak işlenir; kursiyerin toplam ücreti aynı tutarda düşer. İade kursiyerin banka hesabına yapılır.</p>${yi && !k.ucretsiz ? `<details style="margin-top:10px"${oneri ? '' : ' open'}><summary style="cursor:pointer;font-weight:700;color:var(--murekkep)">Kurstan ayrılırsa yasal iade: ${tl(yi.iade)}</summary><div style="margin-top:8px">${MZ.iadeTablosu(yi)}</div></details>` : ''}`],
    plan: ['Planı yeniden böl', `<p style="margin-bottom:12px">Kalan <b>${tl(acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0))}</b> yeni taksitlere bölünecek. İlk vade gelecek ay.</p><div class="alan"><label>Taksit sayısı</label><select name="v">${[1, 2, 3, 4, 5, 6].map(n => `<option ${n === Math.max(1, acik.length) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`],
    ek: ['Ek kalem ekle', (() => { const hk = Math.min(((k.dsinav && k.dsinav.hak) || 0) + 1, S.kurs.sinavHak || 4), l = [['Ek direksiyon dersi', ekDersFiyat(k.sinif)], ['Özel ders', ozelDersFiyat(k.sinif)], ['e-Sınav ücreti', esinavUcreti(1)], ['e-Sınav tekrar ücreti', esinavUcreti(2)], ...Array.from({ length: S.kurs.sinavHak || 4 }, (_, i) => [`${i + 1}. uygulama sınavı ücreti`, uygulamaSinavUcreti(i + 1)]), ...digerUcretler().map(x => [x.ad, x.tutar || 0]), ['Diğer', 0]]; const sec = 'Ek direksiyon dersi'; return `<div class="alan"><label>Kalem</label><select name="n">${l.map(([a, t]) => `<option data-t="${t}" ${a === sec ? 'selected' : ''}>${e(a)}</option>`).join('')}</select><small style="color:var(--soluk)">Sıradaki uygulama sınavı: ${hk}.</small></div><div class="alan" style="margin-top:12px"><label>Tutar (₺)</label><input name="v" inputmode="numeric" value="${ekDersFiyat(k.sinif)}"></div>${tabanL ? `<p class="ipucu" style="margin-top:12px">${isaret('bilgi', 18)}<span>${e(listeAdi(tabanL))}: eğitim materyalleri dahil kurs ücreti dışında hiçbir ad altında ücret alınamaz (not 4). Sınav ücretleri, harç ve kart ücreti kursiyerin kendi masrafıdır, kurs ücretine eklenemez (not 5). Ek ve özel ders en az ${tl(ekDersTabani(tabanL) || 0)}.</span></p>` : ''}`; })()],
  };
  const [baslik, ic] = formlar[tur];
  pencere({
    baslik: baslik + ' · ' + tamAd(k), icerik: `<form id="f-od">${ic}</form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-od">${baslik}</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      if (tur === 'ek') f.n.addEventListener('change', () => { f.v.value = f.n.selectedOptions[0].dataset.t; });
      f.addEventListener('submit', ev => {
        ev.preventDefault(); const v = tutarOku(f.v.value) || 0; geriAlNoktasi();
        if (tur === 'indirim') { if (!v) return bildir('Tutar girin', 'uyari'); if (!mudurMu()) return bildir('İndirim yalnız kurs müdürü tarafından yapılabilir', 'uyari'); if (tx && tx.taban != null && !k.ucretsiz && MZ.sozlesmeUcreti(k) - v < tx.taban && !confirm(`İndirimden sonra ücret ${tl(MZ.sozlesmeUcreti(k) - v)} olur: ${listeAdi(tx.liste)} taban ücretinin (${tl(tx.taban)}) altında. Taban altında indirim MTSK Yönetmeliği md.43/4 gereği işlem sebebidir. Yine de uygulansın mı?`)) return; const acikTop = acik.reduce((a2, t) => a2 + t.tutar - (t.kismi || 0), 0); if (v > acikTop) return bildir('İndirim açık borçtan (' + tl(acikTop) + ') büyük olamaz', 'uyari'); if (v > k.odeme.toplam * 0.5 && !confirm('İndirim kurs ücretinin yarısından fazla (' + tl(v) + '). Emin misiniz?')) return; let kalan = v; for (const t of acik.slice().reverse()) { const d2 = Math.min(kalan, t.tutar - (t.kismi || 0)); t.tutar -= d2; kalan -= d2; if (!kalan) break; } k.odeme.taksitler = k.odeme.taksitler.filter(t => t.odendi || t.tutar > 0); k.odeme.toplam -= v - kalan; (k.odeme.indirimler = k.odeme.indirimler || []).push({ tarih: gun(0), tutar: v - kalan, neden: f.n.value }); islem('İndirim uyguladı', tamAd(k) + ' · ' + tl(v - kalan) + ' · ' + f.n.value); }
        if (tur === 'iade') { if (!v) return bildir('Tutar girin', 'uyari'); if (!mudurMu()) return bildir('İade yalnız kurs müdürü tarafından yapılabilir', 'uyari'); if (v > odenen(k)) return bildir('İade, kursiyerin ödediği ' + tl(odenen(k)) + '’yi aşamaz', 'uyari'); const neden = f.n.value; return pinSor(tl(v) + ' iade').then(onay => { if (!onay) return; k.odeme.iade = (k.odeme.iade || 0) + v; k.odeme.toplam -= v; if (k.kapali && k.kapali.iadeSon && !k.kapali.iadeYapildi) k.kapali.iadeYapildi = gun(0); S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gider', kategori: 'İade', aciklama: tamAd(k) + ' · iade · ' + neden, tutar: v, yontem: 'Havale' }); islem('İade yaptı', tamAd(k) + ' · ' + tl(v)); kaydet(); bildir('İade kaydedildi: ' + tl(v)); yenile(); }); }
        if (tur === 'plan') { const top = acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0), n = +f.v.value || 1; k.odeme.taksitler = k.odeme.taksitler.filter(t => t.odendi); acik.forEach(t => { if (t.kismi) k.odeme.taksitler.push({ vade: t.vade, tutar: t.kismi, odendi: gun(0), yontem: 'Kısmi' }); }); taksitBol(top, n).forEach((t, i) => k.odeme.taksitler.push({ vade: ayEkle(gun(0), i + 1), tutar: t, odendi: null, yontem: null })); islem('Ödeme planını değiştirdi', tamAd(k) + ' · ' + n + ' taksit'); }
        if (tur === 'ek') { if (!v) return bildir('Tutar girin', 'uyari');
          // il taban listesi (not 4): kitap, evrak gibi kurs ücreti dışı kalemler; ek ve özel ders tabanın altında olamaz
          if (tabanL) { const ad = f.n.value, disi = ad === 'Diğer' || digerUcretler().some(x => x.ad === ad), ders = ['Ek direksiyon dersi', 'Özel ders'].includes(ad), alt = ders && (ad === 'Özel ders' ? ozelDersTabani(tabanL) : ekDersTabani(tabanL)) || 0;
            if (disi && !confirm(`“${ad}”: ${listeAdi(tabanL)} gereği eğitim materyalleri dahil kursiyerden kurs ücreti dışında hiçbir ad altında ücret talep edilemez (not 4). Yine de eklensin mi?`)) return;
            if (ders && v < alt && !confirm(`${ad} ${tl(v)}: taban ücret ${tl(alt)}. Yine de eklensin mi?`)) return; } k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: f.n.value, tutar: v, odendi: null, tur: ekTur({ ad: f.n.value }) }); islem('Ek kalem ekledi', tamAd(k) + ' · ' + f.n.value + ' · ' + tl(v)); }
        kaydet(); kapatPencere(); bildir(baslik + ': kaydedildi', 'tamam', true); yenile();
      });
    },
  });
}

/* ================= DİREKSİYON PLANI ================= */
let planGun = null, planGorunum = 'arac';
// Plan dönemi: gün (araç/usta çizelgesi), hafta (7 gün × saat), ay (takvim). Tercih cihazda saklanır.
let planDonem = (() => { try { return localStorage.getItem('sinyal-plan-donem') || 'gun'; } catch (x) { return 'gun'; } })();
const donemSakla = () => { try { localStorage.setItem('sinyal-plan-donem', planDonem); } catch (x) { } };
const donemSecici = () => `<div class="rol" style="display:flex" role="tablist" aria-label="Görünüm">${[['gun', 'Gün'], ['hafta', 'Hafta'], ['ay', 'Ay']].map(([v, a]) => `<button role="tab" aria-selected="${v === planDonem}" data-donem="${v}" class="${v === planDonem ? 'secili' : ''}">${a}</button>`).join('')}</div>`;
// DIR-055: öğretmen renkleri açıklaması (planın bütün görünümlerinde; renk kartta değiştirilir)
const ustaLejant = () => `<p class="plan-lejant usta-lejant" aria-label="Öğretmen renkleri">${sb(S.egitmenler).map(h => `<span class="usta-cip"><i style="background:${ustaRengi(h)}"></i>${e(h.ad.split(' ')[0])}</span>`).join('')}</p>`;
const planUstDugmeler = () => `<button class="dg dg-ana dg-kucuk" data-oto-plan>${ik('robot')}Otomatik planla</button>${(() => { const ids = EKL.mebIsleri().filter(x => x.tur === 'program').map(x => x.id); return ids.length ? `<button class="dg dg-cizgi dg-kucuk" data-meb-gonder="${ids.join(',')}" title="MEBBİS’e girilmemiş planlı dersleri Yardımcı ile aktarır">MEBBİS’e gönder (${ids.length})</button>` : ''; })()}`;
const kisaAd = k => k ? (k.ad + ' ' + (k.soyad || '').slice(0, 1) + '.').trim() : '';
// DIR-040: Plan › Hafta üstünde öğretmen yükü — haftalık "N / sınır" çubuğu (KDS ya da elle; ≥%90 sarı, aşınca kırmızı) ve yedi gün kutusu
// (günlük sınırda sarı, aşınca kırmızı). Kutuya dokununca o gün öğretmene göre açılır ve öğretmenin sütunu vurgulanır.
let planUstaVurgu = null;
// DIR-052: öğretmenin bir günündeki planlı derslerini toplu iptal (hastalık, araç arızası…): ders başına iptal izi, öğrenciye ve öğretmene tek bildirim, boş saat teklifi
function topluIptalPenceresi(egId, t) {
  const h = egitmen(egId), l = sbDers(S.dersler).filter(d => d.egitmen === egId && d.tarih === t && d.durum === 'Planlandı').sort((a, b) => a.saat.localeCompare(b.saat)); if (!h || !l.length) return;
  pencere({ baslik: `${h.ad} · ${tarihUzun(t)}`, icerik: `<p style="font-size:14px;margin-bottom:10px">Bu gündeki ${l.length} planlı ders iptal edilecek. Öğrencilere yeni saat için yazmaları söylenir; MEBBİS’e yazılmış dersler “MEBBİS’ten silinecek” listesine düşer.</p>
      <ul class="liste">${l.map(d => `<li><span class="mono" style="width:52px">${d.saat}</span><span style="flex:1">${e(tamAd(kursiyer(d.kursiyer)))}${d.meb ? ' ' + rozet('MEBBİS’te', 'mavi') : ''}</span></li>`).join('')}</ul>
      <div class="alan" style="margin-top:12px"><label for="ti-neden">Neden (öğrenciye gider)</label><input id="ti-neden" class="girdi" maxlength="80" placeholder="Ör. öğretmenimiz rahatsız"></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-ti-onay style="background:var(--kirmizi);border-color:var(--kirmizi)">${l.length} dersi iptal et</button>`,
    onAc(p) { p.querySelector('[data-ti-onay]').addEventListener('click', () => { const neden = p.querySelector('#ti-neden').value.trim(); geriAlNoktasi();
      l.forEach(d => dersIptalIz(d, 'Kurs iptal etti', neden || 'toplu iptal')); const ids = new Set(l.map(d => d.id)); S.dersler = S.dersler.filter(x => !ids.has(x.id));
      islem('Günün derslerini toplu iptal etti', `${h.ad} · ${tarih(t)} · ${l.length} ders${neden ? ' · ' + neden : ''}`); kaydet(); kapatPencere();
      bildirimler([...l.map(d => { const k = kursiyer(d.kursiyer); return { kim: k, metin: `${selam(k)} ${tarihUzun(t)} ${d.saat} direksiyon dersiniz iptal edildi${neden ? ' (' + neden + ')' : ''}. Yeni saat için ${kursAdi('e')} yazabilirsiniz.`, tur: 'Ders iptali' }; }), { kim: h, metin: `${h.ad.split(' ')[0]} Hoca, ${tarihUzun(t)} günündeki ${l.length} dersiniz iptal edildi.`, tur: 'Ders iptali' }], 'Dersler iptal edildi');
      yenile(); }); } });
}
// DIR-052: öğrenci başına ders durumu — gerekli, yapılan, atanan (planlı), kalan, son gün; varsayılan kapalı
function ogrenciDersDurumu() {
  const l = sb(S.kursiyerler).filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && gerekliDireksiyon(k)).map(k => { const ds = dersSayaci(k), ih = PL.ihtiyac(k), st = PL.sonTarih(k); return { k, ds, ih, st }; }).sort((a, b) => b.ih.toplam - a.ih.toplam || tamAd(a.k).localeCompare(tamAd(b.k), 'tr'));
  if (!l.length) return '';
  return `<details class="kart pp-kap"><summary class="pp-bas"><b>Öğrenci başına ders durumu (${l.length})</b><small style="color:var(--soluk)">gerekli · yapılan · atanan · kalan</small></summary><div class="tablo-kap"><table class="tablo"><thead><tr><th>Öğrenci</th><th>Gerekli</th><th>Yapılan</th><th>Atanan</th><th>Kalan</th><th>Son gün</th></tr></thead><tbody>
    ${l.map(({ k, ds, ih, st }) => `<tr><td><a href="#/kursiyer/${k.id}" style="color:var(--murekkep);font-weight:600">${e(tamAd(k))}</a><small style="display:block;color:var(--soluk)">${e((SINIFLAR[k.sinif] || {}).ad ? SINIFLAR[k.sinif].ad.split(' ·')[0] : k.sinif)} · ${e(k.asama)}</small></td><td class="sayi">${ds.gerekli}</td><td class="sayi">${ds.zorunlu.yapildi}</td><td class="sayi">${ds.zorunlu.planli + ds.basarisiz.planli + ds.telafi.planli}</td><td class="sayi" style="${ih.toplam ? 'color:var(--kirmizi);font-weight:700' : ''}">${ih.toplam}</td><td>${st ? tarih(st.t) : '—'}</td></tr>`).join('')}
  </tbody></table></div></details>`;
}
// DIR-042: dersi eksik ama ileri tarihli planlı dersi olmayan öğrenciler; "Plan öner" (tek) ve "Hepsine plan öner" (birlikte, planOner tek seferde dağıtır).
// Kaldıktan sonra başarısız aday dersi (md.15) eksik olana "2 ders planla". Liste boşsa kart görünmez.
function planlanmamisKarti() {
  const bg = gun(0), l = sb(S.kursiyerler).filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && gerekliDireksiyon(k) && !kayitDondurmaMi(k) && !S.dersler.some(d => d.kursiyer === k.id && d.durum === 'Planlandı' && d.tarih >= bg))
    .map(k => ({ k, ih: PL.ihtiyac(k), st: PL.sonTarih(k) })).filter(x => x.ih.toplam > 0).sort((a, b) => (a.st ? a.st.t : '9999').localeCompare(b.st ? b.st.t : '9999'));
  if (!l.length) return '';
  return `<details class="kart pp-kap"${l.length <= 6 ? ' open' : ''}><summary class="pp-bas"><b>Planlı dersi olmayan öğrenciler (${l.length})</b><button type="button" class="dg dg-ana dg-kucuk" data-plan-oner="${e(l.map(x => x.k.id).join(','))}">${ik('robot')}Hepsine plan öner</button></summary>
    <ul class="pp-liste">${l.map(({ k, ih, st }) => { const tel = ih.basarisiz > 0; return `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1;min-width:0"><div><b>${e(tamAd(k))}</b>${tel ? ' ' + rozet('Başarısız aday', 'uyari') : ''}<small>${ih.toplam} ders eksik${ih.simAlan ? ` · ${ih.simAlan} alan/simülatör` : ''}${ih.gece ? ` · ${ih.gece} gece` : ''}${st ? ` · son gün ${tarih(st.t)} (${e(st.neden)})` : ''}</small></div></a><button type="button" class="dg dg-cizgi dg-kucuk" data-plan-oner="${e(k.id)}">${tel ? ih.basarisiz + ' ders planla' : 'Plan öner'}</button></li>`; }).join('')}</ul></details>`;
}
function ustaYukSeridi(gl) {
  const uS = +(S.kurs.egitmenGunlukSinir || S.kurs.ustaGunlukSinir || 8), l = sbDers(S.dersler).filter(d => d.durum !== 'İptal' && d.durum !== 'Gelmedi');
  const ustalar = sb(S.egitmenler).filter(h => !h.pasif && !(h.meb && h.meb.ayrildi)); if (!ustalar.length) return '';
  const satir = h => { const hs = haftalikSinir(h), n = haftaDers(h.id, gl[0], l), o = n / Math.max(1, hs.n), tur = n > hs.n ? 'kirmizi' : o >= .9 ? 'sari' : '';
    return `<div class="uy-satir"><span class="uy-ad"><i style="background:${ustaRengi(h)}"></i>${e(h.ad)}</span><span class="uy-cubuk ${tur}" role="img" aria-label="${e(h.ad)}: bu hafta ${n} / ${hs.n} ders"><b style="width:${Math.min(100, o * 100)}%"></b></span><span class="uy-sayi ${tur}">${n} / ${hs.n}<small>${e(hs.kaynak)}</small></span>
      <span class="uy-gunler">${gl.map((t, i) => { const g = l.filter(d => d.egitmen === h.id && d.tarih === t).length, gt = g > uS ? 'kirmizi' : g === uS ? 'sari' : g ? 'var' : ''; return `<button type="button" class="uy-gun ${gt}" data-yuk-gun="${t}" data-yuk-usta="${e(h.id)}" aria-label="${e(h.ad)}, ${e(tarihUzun(t))}: ${g} ders"><small>${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][i]}</small>${g || '·'}</button>`; }).join('')}</span></div>`; };
  return `<details class="kart uy-kap" open><summary class="uy-bas"><b>Öğretmen yükü</b><small>haftalık sınır (MEBBİS KDS ya da elle) · günlük ${uS} ders</small></summary>${ustalar.map(satir).join('')}</details>`;
}
// Haftalık ve aylık görünüm: tüm usta öğreticilerin dersleri tek çizelgede; derse dokununca ders penceresi, güne dokununca o günün çizelgesi açılır
function planGenis() {
  if (!planGun) planGun = gun(0);
  const hafta = planDonem === 'hafta', gl = hafta ? TK.haftaGunleri(planGun) : TK.ayGunleri(planGun), a = gl[0], b = gl[gl.length - 1], bugun = gun(0), ay = planGun.slice(0, 7);
  const l = sbDers(S.dersler).filter(d => d.tarih >= a && d.tarih <= b && d.durum !== 'İptal' && kursiyer(d.kursiyer));
  const donemL = hafta ? l : l.filter(d => d.tarih.slice(0, 7) === ay);
  const sinif = d => d.durum === 'Yapıldı' ? 'yapildi' : d.durum === 'Gelmedi' ? 'gelmedi' : (d.tarih < bugun ? 'kapanmadi' : '');
  const cip = d => { const k = kursiyer(d.kursiyer), h = egitmen(d.egitmen), ar = d.arac && arac(d.arac);
    return `<div class="hp-ders ${sinif(d)}" style="--ur:${ustaRengi(h)}" data-ders="${e(d.id)}" tabindex="0" role="button" title="${e(tamAd(k))} · ${d.saat} · ${e(h ? h.ad : '')}${ar ? ' · ' + e(ar.plaka) : ''}"><b>${e(kisaAd(k))}</b><small>${e(h ? h.ad.split(' ')[0] : '')}${ar ? ' · ' + e(ar.plaka) : ''}${d.tur && d.tur !== 'trafik' ? ' · ' + e(DERS_TUR_AD[d.tur]) : ''}</small></div>`; };
  let ic = '';
  if (hafta) {
    const saatler = [...new Set([...SAATLER_(), ...l.map(d => d.saat)])].sort();
    ic = `<div class="kart hp-kap"><div class="hp" style="--gun:${gl.length}">
      <div class="hp-kose"></div>${gl.map(t => { const n = l.filter(d => d.tarih === t).length, kp = kapaliGun(t); return `<button class="hp-gbas ${t === bugun ? 'bugun' : ''} ${kp ? 'kapali' : ''}" data-donem-gun="${t}" aria-label="${e(tarihUzun(t))}: günün çizelgesi"><small>${gunKisa(t)}</small><b>${tarihOku(t).getDate()}</b><i>${kp ? (kp === 'Pazar' ? 'kapalı' : 'tatil') : n ? n + ' ders' : '–'}</i></button>`; }).join('')}
      ${saatler.map(s => `<div class="tk-saat hp-saat">${s}</div>` + gl.map(t => { const x = l.filter(d => d.tarih === t && d.saat === s); return `<div class="hp-hucre ${s === '13:00' && !x.length ? 'ogle' : ''} ${kapaliGun(t) ? 'kapali' : ''} ${t === bugun ? 'bugun' : ''}">${x.map(cip).join('')}</div>`; }).join('')).join('')}
    </div></div>`;
  } else {
    ic = `<div class="kart ap-kap"><div class="ap">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(g => `<span class="ap-gun">${g}</span>`).join('')}
      ${gl.map(t => { const x = l.filter(d => d.tarih === t).sort((p, q) => p.saat.localeCompare(q.saat)), kp = kapaliGun(t);
        return `<button class="ap-hucre ${t.slice(0, 7) !== ay ? 'disari' : ''} ${t === bugun ? 'bugun' : ''} ${kp ? 'kapali' : ''}" data-donem-gun="${t}" aria-label="${e(tarihUzun(t))}${x.length ? ', ' + x.length + ' ders' : ''}"><span class="ap-ust"><b>${tarihOku(t).getDate()}</b>${x.length ? `<i>${x.length}</i>` : ''}</span>
          ${x.slice(0, 3).map(d => `<span class="ap-ders ${sinif(d)}"><em class="mono">${d.saat}</em>${e(kisaAd(kursiyer(d.kursiyer)))}</span>`).join('')}${x.length > 3 ? `<span class="ap-daha">+${x.length - 3} ders</span>` : ''}</button>`; }).join('')}</div></div>`;
  }
  const yapildi = donemL.filter(d => d.durum === 'Yapıldı').length, planli = donemL.filter(d => d.durum === 'Planlandı' && d.tarih >= bugun).length, kapanmadi = donemL.filter(d => d.durum === 'Planlandı' && d.tarih < bugun).length;
  const usta = sb(S.egitmenler).map(h => [h, donemL.filter(d => d.egitmen === h.id).length]).filter(([, n]) => n);
  const bas = hafta ? (() => { const p = tarihOku(a), q = tarihOku(b); return p.getMonth() === q.getMonth() ? `${p.getDate()}–${q.getDate()} ${ayAdi(q.getMonth(), true)}` : `${tarih(a)} – ${tarih(b)}`; })() : ayAdi(tarihOku(planGun).getMonth(), true) + ' ' + tarihOku(planGun).getFullYear();
  const buDonem = hafta ? gl.includes(bugun) : ay === bugun.slice(0, 7);
  return {
    baslik: 'Direksiyon planı', alt: bas + ' · ' + donemL.length + ' ders',
    html: `${ekranNotu(hafta ? 'Haftanın bütün dersleri. Derse dokunun: ayrıntı ve işlemler. Gün başlığına dokunun: o günün araç çizelgesi açılır; ders eklemek ve taşımak orada.' : 'Ayın bütün dersleri. Bir güne dokunun: o günün çizelgesi açılır; ders eklemek ve taşımak orada.')}
    <div class="bolum-bas" style="align-items:center">
      <div class="plan-gez"><button class="dg dg-cizgi dg-kucuk" data-donem-git="-1" aria-label="Önceki ${hafta ? 'hafta' : 'ay'}">‹</button><b>${e(bas)}</b><button class="dg dg-cizgi dg-kucuk" data-donem-git="1" aria-label="Sonraki ${hafta ? 'hafta' : 'ay'}">›</button>${buDonem ? '' : '<button class="dg dg-hafif dg-kucuk" data-donem-git="0">Bugün</button>'}</div>
      <div class="sag" style="width:auto;gap:8px">${planUstDugmeler()}${donemSecici()}</div>
    </div>
    <div class="plan-ozet"><span><b>${donemL.length}</b> ders</span><span><b style="color:var(--yesil)">${yapildi}</b> yapıldı</span><span><b style="color:var(--levha)">${planli}</b> planlı</span>${kapanmadi ? `<span><b style="color:var(--turuncu)">${kapanmadi}</b> kapanmadı</span>` : ''}${usta.map(([h, n]) => `<span class="plan-usta">${e(h.ad)}: <b>${n}</b></span>`).join('')}</div>
    ${planlanmamisKarti()}${ogrenciDersDurumu()}
    ${hafta ? ustaYukSeridi(gl) : ''}
    ${ic}
    <p class="plan-lejant"><span class="hp-ders"></span>Planlı <span class="hp-ders yapildi"></span>Yapıldı <span class="hp-ders gelmedi"></span>Gelmedi <span class="hp-ders kapanmadi"></span>Kapanmadı</p>${ustaLejant()}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const dv = t.closest('[data-donem]'); if (dv) { planDonem = dv.dataset.donem; donemSakla(); return yenile(); }
        const yg = t.closest('[data-yuk-gun]'); if (yg) { planGun = yg.dataset.yukGun; planDonem = 'gun'; planGorunum = 'egitmen'; planUstaVurgu = yg.dataset.yukUsta; donemSakla(); return yenile(); }
        const dg = t.closest('[data-donem-gun]'); if (dg) { planGun = dg.dataset.donemGun; planDonem = 'gun'; donemSakla(); return yenile(); }
        const dt = t.closest('[data-donem-git]'); if (dt) { const n = +dt.dataset.donemGit; planGun = n === 0 ? gun(0) : hafta ? (() => { const x = tarihOku(planGun); x.setDate(x.getDate() + 7 * n); return iso(x); })() : ayEkle(planGun, n); return yenile(); }
        if (t.closest('[data-oto-plan]')) return otoPlanPenceresi();
        { const po = t.closest('[data-plan-oner]'); if (po) { ev.preventDefault(); return otoPlanPenceresi({ kursiyerler: po.dataset.planOner.split(',').filter(Boolean) }); } }
        { const gi = t.closest('[data-gun-iptal]'); if (gi) return topluIptalPenceresi(gi.dataset.gunIptal, planGun); }   // DIR-052
        const d = t.closest('[data-ders]'); if (d) return dersAc(d.dataset.ders);
      });
      k.addEventListener('keydown', ev => { if (ev.key !== 'Enter') return; const d = ev.target.closest('[data-ders]'); if (d) dersAc(d.dataset.ders); });
    },
  };
}
// Plan ızgarasının saatleri: kursun direksiyon ders saatleri (Ayarlar › Kurs bilgileri), öğle arası satırı da görünür
const SAATLER_ = () => dersSaatleri({ ogleDahil: true });
const izinli = (kim, g) => S.izinler.find(i => i.kim === kim && g >= i.bas && g <= i.bit);
export function plan() {
  if (planDonem !== 'gun') return planGenis();
  if (!planGun) planGun = gun(0);
  // gün şeridi bugünden başlar; seçili gün şeridin dışındaysa (haftalık ya da aylık görünümden gelindiyse) şerit o günün çevresine kayar
  const gunler = [], merkez = fark(planGun) < -3 || fark(planGun) > 13 ? fark(planGun) : 0; for (let n = merkez - 3; n <= merkez + 13; n++) gunler.push(gun(n));
  const sutunlar = planGorunum === 'egitmen' ? sb(S.egitmenler) : sb(S.araclar);
  const gDers = sbDers(S.dersler).filter(d => d.tarih === planGun);
  // DIR-051: Pazar kapalı; resmî tatil ve arife öğleden sonrası engel değil — işaretli, ders yazılırken onay istenir (MEM bu dersleri silebilir, 28/07/2020 duyurusu)
  const kapali = kapaliGun(planGun) === 'Pazar' ? 'Pazar' : null, tatilGun = kapaliGun(planGun) === 'Resmî tatil', kursKapali = kapaliGun(planGun) === 'Kurs kapalı', arifeGun = arifeMi(planGun);   // DIG-002: kursa özel kapalı gün
  const tatilSaat = s => tatilGun || kursKapali || (arifeGun && s >= '13:00');
  const sutunEg = sut => planGorunum === 'egitmen' ? sut.id : sut.egitmen;
  const hucre = (sut, s) => {
    if (s === '13:00') return `<div class="tk-hucre ogle" title="Öğle arası"></div>`;
    const iz = izinli(sutunEg(sut), planGun);
    const d = gDers.find(x => x.saat === s && (planGorunum === 'egitmen' ? x.egitmen === sut.id : x.arac === sut.id));
    if (!d) { if (iz || kapali) return `<div class="tk-hucre ${iz ? 'izinli' : ''}" title="${iz ? e(iz.tur) : e(kapali)}"></div>`; return `<div class="tk-hucre bos-hucre${tatilSaat(s) ? ' tatil-saat' : ''}" data-ekle="${sut.id}|${s}" data-hucre="${sut.id}|${s}" tabindex="0" role="button" aria-label="${s} ders ekle"${tatilSaat(s) ? ` title="${kursKapali ? 'Kurs kapalı günü' : tatilGun ? 'Resmî tatil: MEM bu saatteki dersi silebilir' : 'Arife (öğleden sonra): MEM bu saatteki dersi silebilir'}"` : ''}></div>`; }
    const k = kursiyer(d.kursiyer);
    return `<div class="tk-hucre" data-hucre="${sut.id}|${s}"><div class="ders ${d.durum === 'Yapıldı' ? 'yapildi' : d.durum === 'Gelmedi' ? 'gelmedi' : ''} ${d.tekrar ? 'tekrar' : ''}" style="--ur:${ustaRengi(egitmen(d.egitmen))}" data-ders="${e(d.id)}" draggable="${d.durum === 'Planlandı'}" tabindex="0" role="button"><b>${e(tamAd(k))}</b><small>${d.tur ? DERS_TUR_AD[d.tur] + ' · ' : ''}${planGorunum === 'egitmen' ? (d.arac ? arac(d.arac).plaka : '') : egitmen(d.egitmen).ad} · ${dersSirasi(d, k) ? dersSirasi(d, k) + '. ders' : e(d.durum)}</small></div></div>`;
  };
  // Telefonda plan: saat sırasıyla liste (araç sütunları telefona sığmaz)
  const bosSutunlar = s => kapali || s === '13:00' ? [] : sutunlar.filter(su => !gDers.some(x => x.saat === s && (planGorunum === 'egitmen' ? x.egitmen === su.id : (x.arac === su.id || (su.egitmen && x.egitmen === su.egitmen)))) && !izinli(sutunEg(su), planGun));
  const listeSatir = s => {
    if (s === '13:00') return `<li class="ptl-saat ptl-ogle"><b class="ptl-s">13:00</b><span>Öğle arası</span></li>`;
    const ds = gDers.filter(x => x.saat === s), bos = bosSutunlar(s);
    return `<li class="ptl-saat"><b class="ptl-s">${s}</b><div class="ptl-dersler">${ds.map(d => { const k = kursiyer(d.kursiyer), ar = d.arac && arac(d.arac), eg = egitmen(d.egitmen), no = dersSirasi(d, k); return `<button type="button" class="ptl-ders ${d.durum === 'Yapıldı' ? 'yapildi' : d.durum === 'Gelmedi' ? 'gelmedi' : ''}" data-ders="${e(d.id)}"><b>${k ? e(tamAd(k)) : '—'}</b><small>${[ar && ar.plaka, eg && eg.ad, no ? no + '. ders' : d.durum].filter(Boolean).map(x => e(x)).join(' · ')}</small></button>`; }).join('')}${bos.length ? `<button type="button" class="ptl-bos" data-pl-bos="${s}">${ik('arti')}Ders ekle · ${bos.length} boş ${planGorunum === 'egitmen' ? 'öğretmen' : 'araç'}</button>` : ds.length ? '' : '<span class="ptl-dolu">Boş yer yok</span>'}</div></li>`;
  };
  const bosSec = s => {
    const bos = bosSutunlar(s); if (!bos.length) return;
    if (bos.length === 1) return dersEkle(bos[0].id, s);
    pencere({ baslik: `${tarihUzun(planGun)} · ${s}`, icerik: `<p style="margin-bottom:12px;color:var(--soluk)">Hangi ${planGorunum === 'egitmen' ? 'öğretmen' : 'araç'}?</p><div class="ptl-sec">${bos.map(su => `<button type="button" class="dg dg-cizgi" data-pl-sut="${su.id}">${e(planGorunum === 'egitmen' ? su.ad : su.plaka + ' · ' + ((egitmen(su.egitmen) || {}).ad || ''))}</button>`).join('')}</div>`,
      altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>`, onAc: d => d.querySelectorAll('[data-pl-sut]').forEach(b => b.addEventListener('click', () => dersEkle(b.dataset.plSut, s))) });
  };
  const doluluk = Math.round(gDers.length / (sutunlar.length * (dersSaatleri().length || 1)) * 100);
  const bas = s => planGorunum === 'egitmen'
    ? (() => { const ar = sb(S.araclar).find(a => a.egitmen === s.id), plk = S.araclar.filter(a => a.egitmen === s.id).map(a => a.plaka).join(' · '), iz = izinli(s.id, planGun); return `<div class="tk-bas${planUstaVurgu === s.id ? ' tk-sutun-vurgu' : ''}"${planUstaVurgu === s.id ? ' data-vurgu' : ''}>${ar ? aracGorsel(ar, 'kucuk') : ''}<div><b>${e(s.ad)}</b><small>${iz ? '<span style="color:var(--kirmizi);font-weight:700">' + e(iz.tur) + '</span>' : gDers.filter(d => d.egitmen === s.id).length + ' ders · ' + plk}</small>${(() => { const pl = gDers.filter(d => d.egitmen === s.id && d.durum === 'Planlandı').length; return pl && planGun >= gun(0) ? `<button type="button" class="tk-iptal" data-gun-iptal="${e(s.id)}" title="${e(s.ad)} · ${tarih(planGun)} günündeki ${pl} planlı dersi iptal et">Günü iptal (${pl})</button>` : ''; })()}${(() => { const hs = haftalikSinir(s), n = haftaDers(s.id, planGun), kal = hs.n - n; return `<small class="tk-hafta${kal < 0 ? ' asti' : kal <= 3 ? ' yakin' : ''}" title="Bu hafta (Pazartesi–Pazar) ${n} ders atandı, haftalık sınır ${hs.n} (${hs.kaynak === 'elle' ? 'kartta yazılı' : hs.kaynak === 'varsayılan' ? 'ÖÖKY md.26/5' : hs.kaynak === 'müdür' ? 'müdür' : 'MEBBİS ' + hs.kaynak}); ${kal >= 0 ? kal + ' ders kaldı' : -kal + ' ders fazla'}">Hafta ${n}/${hs.n}</small>`; })()}</div></div>`; })()
    : (() => { const iz = izinli(s.egitmen, planGun); return `<div class="tk-bas">${aracGorsel(s, 'kucuk')}<div><b>${e(s.plaka)}</b><small>${iz ? '<span style="color:var(--kirmizi);font-weight:700">' + e(egitmen(s.egitmen).ad.split(' ')[0]) + ' ' + e(iz.tur.toLowerCase()) + '</span>' : e(egitmen(s.egitmen).ad) + ' · ' + s.vites}</small></div></div>`; })();
  const bek = S.bekleme.map(b => ({ ...b, k: kursiyer(b.kursiyer) })).filter(b => b.k);
  return {
    baslik: 'Direksiyon planı', alt: tarihUzun(planGun) + ' · ' + gDers.length + ' ders · doluluk %' + doluluk,
    html: `${ekranNotu('Boş saate dokunun: ders ekleyin. Dersi sürükleyin: saatini ya da aracını değiştirin. İptal edilen saat bekleme listesine otomatik teklif edilir.')}
    <div class="bolum-bas" style="align-items:center">
      <div class="gun-sec" style="flex:1;min-width:0">${gunler.map(g => `<button data-gun="${g}" class="${g === planGun ? 'secili' : ''} ${fark(g) === 0 ? 'bugun' : ''}" aria-label="${tarihUzun(g)}"><small>${fark(g) === 0 ? 'Bugün' : gunKisa(g)}</small><b>${tarihOku(g).getDate()}</b></button>`).join('')}</div>
      <div class="sag" style="width:auto;gap:8px">${planUstDugmeler()}${donemSecici()}<div class="rol" style="display:flex"><button data-gorunum="arac" class="${planGorunum === 'arac' ? 'secili' : ''}">Araca göre</button><button data-gorunum="egitmen" class="${planGorunum === 'egitmen' ? 'secili' : ''}">Usta öğreticiye göre</button></div></div>
    </div>
    ${planlanmamisKarti()}${ogrenciDersDurumu()}
    ${planGorunum === 'arac' ? ustaLejant() : ''}
    <div class="kart" style="overflow:hidden">
      ${kapali ? `<div class="ipucu uyari" style="margin:14px">${isaret('dur', 20)}Pazar günü kurs kapalı, ders planlanamaz.</div>` : kursKapali ? `<div class="ipucu uyari" style="margin:14px">${isaret('uyari', 20)}<span>Kursun kapalı günü (Ayarlar › MEB kuralları). Ders yazılabilir; yazarken onay istenir.</span></div>` : tatilGun || arifeGun ? `<div class="ipucu uyari" style="margin:14px">${isaret('uyari', 20)}<span>${tatilGun ? 'Resmî tatil' : 'Arife: öğleden sonra (13:00 sonrası) resmî tatil'}. Ders yazılabilir; yazarken onay istenir. MEM bu saatlerdeki dersleri silebilir (28/07/2020 duyurusu).</span></div>` : ''}
      <div class="takvim" style="--sutun:${sutunlar.length}">
        <div class="tk-bas"></div>
        ${sutunlar.map(bas).join('')}
        ${[...new Set([...SAATLER_(), ...gDers.map(d => d.saat)])].sort().map(s => `<div class="tk-saat">${s}</div>` + sutunlar.map(su => hucre(su, s)).join('')).join('')}
      </div>
      <ul class="ptl-liste">${[...new Set([...SAATLER_(), ...gDers.map(d => d.saat)])].sort().map(listeSatir).join('')}</ul>
    </div>
    <div class="ara-bosluk"></div>
    ${(S.bosTeklif || []).filter(t => fark(t.tarih) >= 0).map(t => `<div class="kart" style="margin-bottom:14px"><div class="kart-bas"><h3>Açık teklif · ${tarihUzun(t.tarih)} ${t.saat}</h3><small>${e(egitmen(t.egitmen).ad)} · ${t.adaylar.length} kişiye gönderildi${t.fiyat ? ' · %' + t.yuzde + ' indirimli ' + tl(t.fiyat) : ''}</small><div class="sag"><button class="dg dg-hafif dg-kucuk" data-bt-kapat="${t.id}">Teklifi kapat</button></div></div><ul class="liste" style="margin-top:6px">${t.adaylar.map(kursiyer).filter(Boolean).map(x => `<li><span style="flex:1;color:var(--murekkep);font-weight:700">${e(tamAd(x))}</span><button class="dg dg-cizgi dg-kucuk" data-bt-kabul="${t.id}|${x.id}">Kabul etti</button></li>`).join('')}</ul></div>`).join('')}
    <div class="kart"><div class="kart-bas"><h3>Bekleme listesi</h3><small>Boşalan saat önce bu kişilere teklif edilir</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-bek-ekle>${ik('arti')}Listeye ekle</button></div></div>
      <ul class="liste" style="margin-top:8px">${bek.map(b => `<li><a class="kisi" href="#/kursiyer/${b.k.id}" style="flex:1"><div><b>${e(tamAd(b.k))}</b><small>${e(b.tercih)} · ${b.k.direksiyon}/${gerekliDireksiyon(b.k)} ders · ${goreli(b.eklendi)} eklendi</small></div></a><span class="sag"><button class="dg dg-hafif dg-kucuk" data-bek-cik="${b.k.id}">Çıkar</button></span></li>`).join('') || '<li>' + bos('Bekleme listesi boş', 'Erken ders isteyenleri buraya ekleyin.') + '</li>'}</ul></div>`,
    baglan(k) {
      { const v = k.querySelector('[data-vurgu]'); if (v) requestAnimationFrame(() => v.scrollIntoView({ block: 'nearest', inline: 'center' })); planUstaVurgu = null; }   // DIR-040: yük şeridinden gelinen öğretmen sütunu
      { const sg = k.querySelector('.gun-sec .secili'); if (sg) { const gs = sg.parentElement; gs.scrollLeft = Math.max(0, sg.offsetLeft - gs.offsetLeft - 8); } }
      const ekle = v => { const [sid, s] = v.split('|'); dersEkle(sid, s); };
      k.addEventListener('click', ev => {
        const t = ev.target;
        const g = t.closest('[data-gun]'); if (g) { planGun = g.dataset.gun; yenile(); }
        const v = t.closest('[data-gorunum]'); if (v) { planGorunum = v.dataset.gorunum; yenile(); }
        const dv = t.closest('[data-donem]'); if (dv) { planDonem = dv.dataset.donem; donemSakla(); return yenile(); }
        if (t.closest('[data-oto-plan]')) return otoPlanPenceresi();
        { const po = t.closest('[data-plan-oner]'); if (po) { ev.preventDefault(); return otoPlanPenceresi({ kursiyerler: po.dataset.planOner.split(',').filter(Boolean) }); } }
        { const gi = t.closest('[data-gun-iptal]'); if (gi) return topluIptalPenceresi(gi.dataset.gunIptal, planGun); }   // DIR-052
        const h = t.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle);
        const pb = t.closest('[data-pl-bos]'); if (pb) return bosSec(pb.dataset.plBos);
        const d = t.closest('[data-ders]'); if (d) dersAc(d.dataset.ders);
        const bk = t.closest('[data-bt-kabul]'); if (bk) { const [tid, kid] = bk.dataset.btKabul.split('|'); return bosTeklifKabul(tid, kid); }
        const bkp = t.closest('[data-bt-kapat]'); if (bkp) { S.bosTeklif = S.bosTeklif.filter(x => x.id !== bkp.dataset.btKapat); islem('Boş saat teklifini kapattı'); kaydet(); return yenile(); }
        const c = t.closest('[data-bek-cik]'); if (c) { S.bekleme = S.bekleme.filter(b => b.kursiyer !== c.dataset.bekCik); kaydet(); yenile(); }
        if (t.closest('[data-bek-ekle]')) { const l = sb(S.kursiyerler).filter(x => x.asama === 'Direksiyon' && !S.bekleme.some(b => b.kursiyer === x.id)); pencere({ baslik: 'Bekleme listesine ekle', icerik: `<div class="alan"><label>Kursiyer</label><select id="b-k">${l.map(x => `<option value="${x.id}">${e(tamAd(x))}</option>`).join('')}</select></div><div class="alan" style="margin-top:12px"><label>Tercih</label><select id="b-t"><option>Fark etmez</option><option>Hafta içi sabah</option><option>Hafta içi akşam</option><option>Cumartesi</option></select></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Ekle</button>`, onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { S.bekleme.push({ kursiyer: p.querySelector('#b-k').value, tercih: p.querySelector('#b-t').value, eklendi: gun(0) }); kaydet(); kapatPencere(); bildir('Bekleme listesine eklendi'); yenile(); }); } }); }
      });
      k.addEventListener('keydown', ev => { if (ev.key !== 'Enter') return; const h = ev.target.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle); const d = ev.target.closest('[data-ders]'); if (d) dersAc(d.dataset.ders); });
      // sürükle-bırak
      let suruklenen = null;
      k.addEventListener('dragstart', ev => { const d = ev.target.closest('[data-ders]'); if (!d) return; suruklenen = d.dataset.ders; ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', suruklenen); } catch (x) { } });
      k.addEventListener('dragover', ev => { const h = ev.target.closest('.bos-hucre'); if (h && suruklenen) { ev.preventDefault(); k.querySelectorAll('.surukle-ust').forEach(x => x.classList.remove('surukle-ust')); h.classList.add('surukle-ust'); } });
      k.addEventListener('dragend', () => { k.querySelectorAll('.surukle-ust').forEach(x => x.classList.remove('surukle-ust')); suruklenen = null; });
      k.addEventListener('drop', ev => {
        const h = ev.target.closest('.bos-hucre'); if (!h || !suruklenen) return; ev.preventDefault();
        const d = sbDers(S.dersler).find(x => x.id === suruklenen), [sid, saat] = h.dataset.hucre.split('|');
        const ksn = kursiyer(d.kursiyer).sinif, yeniEg = planGorunum === 'egitmen' ? sid : arac(sid).egitmen;
        if (!yeniEg || !egitmen(yeniEg)) return bildir(arac(sid).plaka + ' aracına atanmış usta öğretici yok; önce Ekip ve araçlar’dan atayın', 'uyari');
        if (sbDers(S.dersler).some(x => x.id !== d.id && x.egitmen === yeniEg && x.tarih === planGun && x.saat === saat && x.durum !== 'İptal')) return bildir(egitmen(yeniEg).ad + ' o saatte başka bir derste', 'uyari');
        if (planGorunum === 'arac' && arac(sid).sinif !== ksn) return bildir(arac(sid).plaka + ' ' + SINIFLAR[arac(sid).sinif].ad + ' aracı; kursiyer ' + SINIFLAR[ksn].ad, 'uyari');
        const yeniAr = planGorunum === 'egitmen' ? (dersAraci(sid, ksn, planGun, saat, d) || {}).id : sid;
        if (!yeniAr) return bildir('Bu saatte boş ' + SINIFLAR[ksn].ad + ' aracı yok', 'uyari');
        if (sbDers(S.dersler).some(x => x.id !== d.id && x.kursiyer === d.kursiyer && x.tarih === planGun && x.saat === saat)) return bildir('Kursiyerin o saatte başka dersi var', 'uyari');
        if (!egitmen(yeniEg).siniflar.includes(kursiyer(d.kursiyer).sinif)) return bildir(egitmen(yeniEg).ad + ' bu sınıfta ders vermiyor', 'uyari');
        geriAlNoktasi(); const eskiSaat = d.saat, eskiEg = d.egitmen; Object.assign(d, { saat, egitmen: yeniEg, arac: yeniAr }); islem('Dersi taşıdı', tamAd(kursiyer(d.kursiyer)) + ' · ' + eskiSaat + ' → ' + saat); kaydet();
        const ks = kursiyer(d.kursiyer), egY = egitmen(yeniEg);
        yenile();
        bildirimler([{ kim: ks, metin: `${selam(ks)} ${tarihUzun(planGun)} direksiyon dersiniz ${eskiSaat} yerine ${saatE(saat)} saatine alındı${eskiEg !== yeniEg ? '; usta öğreticiniz ' + egY.ad : ''}.`, tur: 'Saat değişikliği' }, { kim: egY, metin: `${egY.ad.split(' ')[0]} Hoca, ${tarihUzun(planGun)} ${ks.ad} ${ks.soyad} dersi ${eskiEg !== yeniEg ? 'size verildi, saat ' + saat : eskiSaat + ' yerine ' + saat + '’e alındı'}.`, tur: 'Saat değişikliği' }, eskiEg !== yeniEg && { kim: egitmen(eskiEg), metin: `${egitmen(eskiEg).ad.split(' ')[0]} Hoca, ${tarihUzun(planGun)} ${eskiSaat} ${ks.ad} ${ks.soyad} dersi programınızdan çıkarıldı.`, tur: 'Saat değişikliği' }], 'Ders saati değişti');
      });
      const sec = k.querySelector('.gun-sec .secili'); if (sec) sec.scrollIntoView({ inline: 'center', block: 'nearest' });
    },
  };
}
// “+ Yeni” penceresinden: belirli öğretmen, gün ve saat için ders ekleme penceresini açar
export function dersPlanlaAc(egId, tarih, saat) { planGun = tarih; planGorunum = 'egitmen'; dersEkle(egId, saat); }
// Otomatik planlama: önerilen dersler listelenir, müdür seçtiklerini ekler
// DIR-039: otomatik plan penceresi (planlayici.js planOner). Üstte başlangıç, süre, dağıtım ve aday seçimi; gün gün öneriler (onay kutulu),
// ustaların hafta yükü, katlanır "Yerleşmeyenler"; "Seçilenleri plana ekle" ve "Ekle ve MEBBİS’e yaz" (yalnız 5 gün ve sonrası; mebtoplu.yaz).
export function otoPlanPenceresi(o = {}) {
  import('./planlayici.js?v=234').then(P => {
    const A = planAyar(), on = +kuralAyar('programOnGun') || 5;
    const st = { bas: o.bas || 'zamaninda', gunSay: o.gunSay || 7, dagit: o.dagit ?? A.dagit, secim: o.kursiyerler ? 'secili' : 'hepsi', secili: new Set(o.kursiyerler || []), kapali: new Set() };
    const havuz = () => sb(S.kursiyerler).filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && gerekliDireksiyon(k) && P.ihtiyac(k).toplam > 0).sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
    let r = null, notlar = [];
    const hesapla = () => {
      const bas = st.bas === 'yarin' ? gun(1) : gun(on);
      r = P.planOner({ kursiyerler: st.secim === 'secili' ? [...st.secili] : null, bas, gunSay: st.gunSay, hocaSecimi: st.dagit ? 'yetkili' : 'kendi', dogrula: KR.dersKontrol });
      // ders ekleme penceresinin notları (uyarı, engel değil); önceki öneriler planlı ders gibi sayılır
      notlar = r.oneriler.map((d, i) => { try { const x = KR.dersKontrol({ k: kursiyer(d.kursiyer), eg: egitmen(d.egitmen), ar: d.arac ? arac(d.arac) : null, tur: d.tur, tarih: d.tarih, saat: d.saat, simulator: d.simulator, taslak: r.oneriler.slice(0, i) }); return x.not || []; } catch (x) { return []; } });
      st.kapali = new Set();
    };
    const ROZ = { 'Simülatör': 'mavi', 'Eğitim alanı': 'mavi', 'Gece': 'notr', 'Başarısız aday': 'uyari', 'Telafi (ön sınav)': 'uyari', '2. direksiyon': 'mavi', 'MEBBİS’e geç kalır': 'kirmizi', 'Başka öğretmen': 'notr' };
    const yukSerit = () => { const hk = r.gunler && r.gunler[0]; if (!hk) return ''; const l = Object.entries(r.yuk).filter(([id]) => S.dersler.some(d => d.egitmen === id) || r.oneriler.some(d => d.egitmen === id));
      if (!l.length) return ''; const pz = (() => { const d = tarihOku(hk); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return iso(d); })();
      return `<div class="oto-yuk">${l.map(([id, y]) => { const n = y.hafta[pz] || 0, o_ = n / Math.max(1, y.sinir), tur = n > y.sinir ? 'kirmizi' : o_ >= .9 ? 'sari' : ''; return `<span class="oto-yuk-k ${tur}" title="${e(y.kaynak)}"><b>${e(y.ad.split(' ')[0])}</b> ${n}/${y.sinir}${y.kaynak === 'müdür' ? ' (müdür)' : ''}</span>`; }).join('')}<small>${tarih(pz)} haftası, öneriler dahil</small></div>`; };
    const icerik = () => {
      const l = r.oneriler, gunler = [...new Set(l.map(d => d.tarih))].sort(), hv = havuz();
      const satir = (d, i) => `<label class="evrak oto-satir"><input type="checkbox" value="${i}" ${st.kapali.has(i) ? '' : 'checked'} style="width:18px;height:18px;accent-color:var(--levha)"><span class="mono" style="width:48px">${d.saat}</span><span style="flex:1;min-width:0;color:var(--murekkep)">${e(tamAd(kursiyer(d.kursiyer)))} ${d.etiket.map(x => rozet(x, ROZ[x] || 'notr')).join(' ')}<small style="display:block;color:var(--soluk)">${e(egitmen(d.egitmen).ad)} · ${d.tur === 'simulator' ? 'Simülatör ' + e(((S.simulatorler || []).find(x => x.id === d.simulator) || {}).sicilNo || '') : d.arac ? e(arac(d.arac).plaka) : 'kendi aracı'}</small>${(notlar[i] || []).map(m => `<small style="display:flex;gap:6px;align-items:flex-start;margin-top:2px">${isaret('uyari', 14)}<span>${e(m)}</span></small>`).join('')}</span></label>`;
      const ym = r.yerlesmeyen;
      return `<form id="f-oto" class="oto-ust">
          <div class="alan"><label>Başlangıç</label><select class="girdi" name="bas"><option value="zamaninda" ${st.bas !== 'yarin' ? 'selected' : ''}>${tarih(gun(on))} (${on} gün sonra)</option><option value="yarin" ${st.bas === 'yarin' ? 'selected' : ''}>Yarın · ${tarih(gun(1))}</option></select></div>
          <div class="alan"><label>Süre</label><select class="girdi" name="gunSay"><option value="7" ${st.gunSay === 7 ? 'selected' : ''}>1 hafta</option><option value="14" ${st.gunSay === 14 ? 'selected' : ''}>2 hafta</option></select></div>
          <div class="alan"><label>Adaylar</label><select class="girdi" name="secim"><option value="hepsi" ${st.secim === 'hepsi' ? 'selected' : ''}>Hepsi (${hv.length})</option><option value="secili" ${st.secim === 'secili' ? 'selected' : ''}>Seçtiklerim${st.secili.size ? ' (' + st.secili.size + ')' : ''}</option></select></div>
          <small class="tam" style="color:var(--soluk);margin-top:-4px">MEBBİS’e ders en az ${on} gün önce yazılır (md.23/1); daha erken günler “MEBBİS’e geç kalır” işaretiyle gelir ve MEBBİS’e gönderilmez.</small>
          <label class="oto-anahtar"><input type="checkbox" name="dagit" ${st.dagit ? 'checked' : ''}> Başka yetkili öğretmenlere de dağıt</label>
          ${st.secim === 'secili' ? `<div class="tam oto-adaylar">${hv.map(k => `<label><input type="checkbox" data-oto-aday="${e(k.id)}" ${st.secili.has(k.id) ? 'checked' : ''}> ${e(tamAd(k))} <small>${P.ihtiyac(k).toplam} ders</small></label>`).join('') || '<small>Dersi eksik kursiyer yok</small>'}</div>` : ''}
        </form>
        ${yukSerit()}
        ${r.bos ? `<p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>${e(r.bos)}</span></p>` : ''}
        ${r.uyari.map(m => `<p class="ipucu uyari" style="margin-top:10px">${isaret('uyari', 18)}<span>${e(m)}</span></p>`).join('')}
        ${l.length ? `<div class="oto-liste">${gunler.map(g => `<p class="et" style="margin:12px 0 4px">${tarihUzun(g)}</p>${l.map((d, i) => d.tarih === g ? satir(d, i) : '').join('')}`).join('')}</div>` : !r.bos ? `<p class="ipucu uyari" style="margin-top:10px">${isaret('uyari', 18)}<span>Bu aralıkta yerleşen ders yok; nedenleri aşağıda.</span></p>` : ''}
        ${ym.length ? `<details class="oto-yer"${l.length ? '' : ' open'}><summary>Yerleşmeyenler (${ym.length})</summary><ul>${ym.map(x => `<li><b>${e(x.ad || tamAd(kursiyer(x.kursiyer)))}</b> · ${x.eksik.toplam} ders${x.eksik.simAlan ? `, ${x.eksik.simAlan} alan/simülatör` : ''}${x.eksik.gece ? `, ${x.eksik.gece} gece` : ''}<small>${x.neden.map(e).join('<br>')}</small></li>`).join('')}</ul></details>` : ''}
        ${l.length ? `<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px"><input type="checkbox" checked name="hat"> Kursiyerlere ve usta öğreticilere WhatsApp’tan bildir</label>` : ''}`;
    };
    const altlik = () => { const n = r.oneriler.filter((d, i) => !st.kapali.has(i)).length, m = r.oneriler.filter((d, i) => !st.kapali.has(i) && d.tarih >= gun(on)).length;
      return `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${r.oneriler.length ? `<button class="dg dg-cizgi" data-oto-ekle ${n ? '' : 'disabled'}>Seçilenleri plana ekle (${n})</button><button class="dg dg-ana" data-oto-meb ${m ? '' : 'disabled'}>Ekle ve MEBBİS’e yaz (${m})</button>` : ''}`; };
    hesapla();
    pencere({
      baslik: 'Otomatik ders planı', genis: true, icerik: icerik(), altlik: altlik(),
      onAc(p) {
        const ciz = () => { p.querySelector('.pencere-govde').innerHTML = icerik(); p.querySelector('.pencere > footer') && (p.querySelector('.pencere > footer').innerHTML = altlik()); };
        p.addEventListener('change', ev => { const t = ev.target;
          if (t.matches('#f-oto [name]')) { if (t.name === 'dagit') st.dagit = t.checked; else if (t.name === 'gunSay') st.gunSay = +t.value; else st[t.name] = t.value; if (t.name === 'secim' && t.value === 'secili' && !st.secili.size) { ciz(); return; } hesapla(); return ciz(); }
          if (t.matches('[data-oto-aday]')) { t.checked ? st.secili.add(t.dataset.otoAday) : st.secili.delete(t.dataset.otoAday); hesapla(); return ciz(); }
          if (t.matches('.oto-satir input[type=checkbox]')) { t.checked ? st.kapali.delete(+t.value) : st.kapali.add(+t.value); const al = p.querySelector('.pencere > footer'); if (al) al.innerHTML = altlik(); }
        });
        p.addEventListener('click', ev => {
          const ek = ev.target.closest('[data-oto-ekle]'), mb = ev.target.closest('[data-oto-meb]'); if (!ek && !mb) return;
          const sec = r.oneriler.filter((d, i) => !st.kapali.has(i)); if (!sec.length) return bildir('Hiç ders seçilmedi', 'uyari');
          const z = Date.now(), yeniler = sec.map((d, i) => { const x = { id: 'd' + z + i, kursiyer: d.kursiyer, egitmen: d.egitmen, arac: d.arac, tarih: d.tarih, saat: d.saat, tur: d.tur, durum: 'Planlandı', eklendi: gun(0), kaynak: 'oneri', ...(d.simulator ? { simulator: d.simulator } : {}), ...(d.kendiArac ? { kendiArac: true } : {}) }; S.dersler.push(x); return x; });  // eklendi: M01 (md.23/1) planlama günü
          islem('Otomatik planla ders ekledi', `${sec.length} ders · ${tarih(sec[0].tarih)}–${tarih(sec[sec.length - 1].tarih)}`); kaydet(); kapatPencere();
          if (p.querySelector('[name=hat]') && p.querySelector('[name=hat]').checked) {
            const ogr = {}, usta = {}; sec.forEach(d => { (ogr[d.kursiyer] = ogr[d.kursiyer] || []).push(d); (usta[d.egitmen] = usta[d.egitmen] || []).push(d); });
            const metinL = l2 => l2.map(d => `${tarihUzun(d.tarih)} ${saatDe(d.saat)}`).join(', ');
            bildirimler([...Object.entries(ogr).map(([kid, l2]) => { const k = kursiyer(kid); return { kim: k, metin: `${selam(k)} direksiyon dersleriniz planlandı: ${metinL(l2)}. Uymayan saat olursa bize yazın.`, tur: 'Ders bildirimi' }; }),
              ...Object.entries(usta).map(([hid, l2]) => { const h = egitmen(hid); return { kim: h, metin: `${h.ad.split(' ')[0]} Hoca, programınıza ${l2.length} direksiyon dersi eklendi: ${l2.map(d => `${tarihUzun(d.tarih)} ${saatDe(d.saat)} ${tamAd(kursiyer(d.kursiyer))}`).join('; ')}.`, tur: 'Ders bildirimi' }; })], 'Otomatik plan');
          } else bildir(sec.length + ' ders plana eklendi');
          yenile();
          if (mb) { const ids = yeniler.filter(d => d.tarih >= gun(on)).map(d => 'ders-' + d.id); if (ids.length) import('./mebtoplu.js?v=234').then(MT => MT.yaz(ids)).then(() => yenile()); }
        });
      },
    });
  });
}
function dersEkle(sutunId, saat) {
  const kapali = kapaliGun(planGun); if (kapali === 'Pazar') return bildir(tarihUzun(planGun) + ' pazar; kurs kapalı, ders planlanamaz', 'uyari');   // DIR-051: resmî tatilde onayla
  const aracGor = planGorunum === 'arac', ar0 = aracGor ? arac(sutunId) : null;
  const eg = aracGor ? (egitmen(ar0.egitmen) || S.egitmenler.find(h => h.siniflar.includes(ar0.sinif) && !S.dersler.some(d => d.egitmen === h.id && d.tarih === planGun && d.saat === saat))) : egitmen(sutunId);
  if (!eg) return bildir('Bu saatte bu araç için boş usta öğretici yok', 'uyari');
  const oGun = id => S.dersler.filter(x => x.kursiyer === id && x.tarih === planGun).length;
  const planli = id => S.dersler.filter(x => x.kursiyer === id && x.durum === 'Planlandı').length;
  const adaylar = sb(S.kursiyerler).filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && (aracGor ? k.sinif === ar0.sinif : eg.siniflar.includes(k.sinif))).sort((a, b) => ((a.direksiyon + planli(a.id) >= gerekliDireksiyon(a)) - (b.direksiyon + planli(b.id) >= gerekliDireksiyon(b))) || (oGun(a.id) - oGun(b.id)) || ((a.egitmen === eg.id ? -1 : 1) - (b.egitmen === eg.id ? -1 : 1)));
  if (!adaylar.length) return bildir(aracGor ? `${ar0.plaka} (${SINIFLAR[ar0.sinif].ad}) için direksiyon aşamasında kursiyer yok` : `${eg.ad} için direksiyon aşamasında kursiyer yok`, 'uyari');
  const aracBul = k => aracGor ? ar0 : dersAraci(eg.id, k.sinif, planGun, saat);
  pencere({
    baslik: 'Direksiyon dersi ekle',
    icerik: `<div style="display:flex;gap:14px;align-items:center;margin-bottom:16px" id="d-bas"></div>
      <div class="alan"><label for="d-k">Kursiyer</label><select id="d-k"><option value="">Öğrenci seçin</option>${adaylar.map(k => `<option value="${k.id}">${e(tamAd(k))} · ${SINIFLAR[k.sinif].ad} · ${k.direksiyon + planli(k.id)}/${gerekliDireksiyon(k)}${k.egitmen === eg.id ? '' : ' · başka usta öğretici'}</option>`).join('')}</select></div>
      <div class="alan" style="margin-top:12px"><label for="d-tur">Ders türü</label><select id="d-tur">${Object.entries(DERS_TUR_AD).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
      ${(() => { const sl = (S.simulatorler || []).filter(x => x && x.sicilNo && (!x.durum || /hizmette/i.test(x.durum))); return sl.length > 1 ? `<div class="alan" id="d-sim-alan" hidden style="margin-top:12px"><label for="d-sim">Simülatör</label><select id="d-sim">${sl.map(x => `<option value="${e(x.id)}">${e(x.sicilNo)}${x.ad ? ' · ' + e(x.ad) : ''}</option>`).join('')}</select><small style="color:var(--soluk)">MEBBİS’e bu cihazın sicil numarasıyla yazılır.</small></div>` : ''; })()}
      ${kapaliGun(planGun) === 'Kurs kapalı' ? `<label id="d-tatil" style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:14px" class="ipucu uyari"><input type="checkbox" name="tatilOnay" style="margin-top:3px"><span>${tarihUzun(planGun)} kursun kapalı günü. Yine de ders eklensin mi?</span></label>` : kapaliGun(planGun) === 'Resmî tatil' || (arifeMi(planGun) && saat >= '13:00') ? `<label id="d-tatil" style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:14px" class="ipucu uyari"><input type="checkbox" name="tatilOnay" style="margin-top:3px"><span>${tarihUzun(planGun)} ${kapaliGun(planGun) === 'Resmî tatil' ? 'resmî tatil' : 'arife: öğleden sonra resmî tatil'}. Emin misiniz? MEM bu dersi silebilir (28/07/2020 duyurusu).</span></label>` : ''}
      <div id="d-uyari" style="margin-top:12px;display:grid;gap:6px"></div>
      <label id="d-ek-alan" hidden style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input type="checkbox" name="ek"> Ek ders ücretini (sınıfının ek ders fiyatıyla) ödeme planına ekle</label>
      <div class="alan" style="margin-top:12px"><label for="d-tekrar">Tekrar</label><select id="d-tekrar"><option value="0">Tek seferlik</option><option value="2">Her hafta aynı saatte · 2 hafta</option><option value="4">Her hafta aynı saatte · 4 hafta</option><option value="6">Her hafta aynı saatte · 6 hafta</option></select></div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" checked name="hat"> Kursiyere WhatsApp’tan bildir</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet>Dersi ekle</button>`,
    onAc(d) {
      const sel = d.querySelector('#d-k'), uy = d.querySelector('#d-uyari'), dg = d.querySelector('[data-kaydet]'), ekAlan = d.querySelector('#d-ek-alan');
      const kontrol = () => {
        if (!sel.value) { d.querySelector('#d-bas').innerHTML = `<div><b style="display:block;font-family:var(--baslik);font-size:18px;color:var(--murekkep)">${tarihUzun(planGun)} · ${saat}</b><span>${e(eg.ad)}</span></div>`; uy.innerHTML = ''; ekAlan.hidden = true; dg.disabled = true; return; }
        const k = kursiyer(sel.value), tur = d.querySelector('#d-tur').value, ar = tur === 'simulator' ? null : aracBul(k), sorun = [], not = [];
        d.querySelector('#d-bas').innerHTML = `${ar ? aracGorsel(ar, 'orta') : ''}<div><b style="display:block;font-family:var(--baslik);font-size:18px;color:var(--murekkep)">${tarihUzun(planGun)} · ${saat}</b><span>${e(eg.ad)} · ${ar ? plaka(ar.plaka) + ' · ' + e(ar.vites) + (ar.egitmen !== eg.id ? ' · havuz aracı' : '') : 'araç yok'}</span></div>`;
        // denetimler kural motorunda (kurallar.js dersKontrol): araç, 90 gün, gece, belgeler, çakışma, günlük sınırlar (kursiyerde md.16/4 engel), borç, ek ders
        const kd = KR.dersKontrol({ k, eg, ar, tur, tarih: planGun, saat, simulator: tur === 'simulator' ? ((d.querySelector('#d-sim') || {}).value || ((S.simulatorler || []).find(x => x && x.sicilNo) || {}).id) : undefined }), ek = kd.ek; sorun.push(...kd.sorun); not.push(...kd.not);
        // DIR-025: simülatör dersi MEBBİS'e cihazın sicil numarasıyla gider — birden çok cihaz varsa seçilir, hiç kayıtlı yoksa uyarı
        { const sa = d.querySelector('#d-sim-alan'); if (sa) sa.hidden = tur !== 'simulator'; if (tur === 'simulator' && !(S.simulatorler || []).some(x => x && x.sicilNo)) not.push('Simülatör sicil numarası kayıtlı değil; MEBBİS’e yazmadan önce Ekip ve araçlar › Araçlar › Simülatörler’e ekleyin.'); }
        ekAlan.hidden = !ek;
        uy.innerHTML = sorun.map(x => `<div class="ipucu uyari">${isaret('dur', 20)}${e(x)}</div>`).join('') + not.map(x => `<div class="ipucu">${isaret('uyari', 20)}${e(x)}</div>`).join('');
        { const to = d.querySelector('[name=tatilOnay]'); dg.disabled = !!sorun.length || !!(to && !to.checked); }
      };
      { const to = d.querySelector('[name=tatilOnay]'); if (to) to.addEventListener('change', () => kontrol()); }
      // DIR-013: ders türü kendiliğinden — ilk belge adayının alan/simülatör dersi eksikse 'Eğitim alanı' (hizmette simülatör varsa 'Simülatör'); türü elle seçerse dokunulmaz
      let turElle = false; d.querySelector('#d-tur').addEventListener('change', () => { turElle = true; });
      sel.addEventListener('change', () => { if (!turElle && sel.value) { const k = kursiyer(sel.value), ds = dersSayaci(k, planGun), as = ds.alanSim, ts = d.querySelector('#d-tur'); ts.value = as.gerek && !ds.aktarim && as.yapildi + as.planli < as.gerek ? ((S.simulatorler || []).some(x => x && x.sicilNo && (!x.durum || /hizmette/i.test(x.durum))) ? 'simulator' : 'alan') : 'trafik'; } });
      sel.addEventListener('change', kontrol); d.querySelector('#d-tur').addEventListener('change', kontrol); { const ds = d.querySelector('#d-sim'); if (ds) ds.addEventListener('change', kontrol); } kontrol();
      dg.addEventListener('click', () => {
        const k = kursiyer(sel.value), n = +d.querySelector('#d-tekrar').value, tur = d.querySelector('#d-tur').value, atlanan = [];
        let eklenen = 0;
        for (let h = 0; h <= Math.max(0, n - 1); h++) {
          const t = tarihOku(planGun); t.setDate(t.getDate() + 7 * h); const ti = iso(t);
          // DIR-051: ilk ders resmî tatile/arifeye onayla yazılabilir; tekrarlanan haftalarda Pazar ve tatil atlanır
          if (kapaliGun(ti) && !(h === 0 && ['Resmî tatil', 'Kurs kapalı'].includes(kapaliGun(ti)))) { atlanan.push(tarih(ti) + ' ' + kapaliGun(ti).toLowerCase()); continue; }
          if (S.dersler.some(x => x.tarih === ti && x.saat === saat && (x.egitmen === eg.id || x.kursiyer === k.id))) { atlanan.push(tarih(ti) + ' dolu'); continue; }
          if (izinli(eg.id, ti)) { atlanan.push(tarih(ti) + ' öğretmen izinli'); continue; }
          if (KR.gunlukDersSorun(k.id, ti)) { atlanan.push(tarih(ti) + ' günlük ders sınırı dolu (md.16/4)'); continue; }  // pencerede gösterilen denetimle aynı (kurallar.js)
          const ar = tur === 'simulator' ? null : aracGor ? (S.dersler.some(x => x.tarih === ti && x.saat === saat && x.arac === ar0.id) ? null : ar0) : dersAraci(eg.id, k.sinif, ti, saat);
          if (!ar && tur !== 'simulator') { atlanan.push(tarih(ti) + ' araç yok'); continue; }
          S.dersler.push({ id: 'd' + Date.now() + h, kursiyer: k.id, egitmen: eg.id, arac: ar ? ar.id : null, tarih: ti, saat, durum: 'Planlandı', eklendi: gun(0), tekrar: n > 0, ...(tur !== 'trafik' ? { tur } : {}), ...(tur === 'simulator' && d.querySelector('#d-sim') ? { simulator: d.querySelector('#d-sim').value } : {}) }); eklenen++;
        }
        if (!eklenen) return bildir('Hiç ders eklenmedi' + (atlanan.length ? ': ' + atlanan.join(', ') : ''), 'uyari');
        if (!ekAlan.hidden && d.querySelector('[name=ek]').checked && eklenen) { k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: 'Ek direksiyon dersi × ' + eklenen, tutar: ekDersFiyat(k.sinif) * eklenen, odendi: null }); }
        islem('Ders ekledi', tamAd(k) + ' · ' + tarih(planGun) + ' ' + saat + (n ? ' · ' + eklenen + ' hafta' : '')); kaydet(); kapatPencere();
        const metin = n ? `${selam(k)} ${eklenen} hafta boyunca her ${gunKisa(planGun)} ${saatDe(saat)} ${eg.ad} ile direksiyon dersiniz var.` : `${selam(k)} ${tarihUzun(planGun)} ${saatDe(saat)} ${eg.ad} ile direksiyon dersiniz planlandı.`;
        if (d.querySelector('[name=hat]').checked) bildirimler([{ kim: k, metin, tur: 'Ders bildirimi' }, { kim: eg, metin: `${eg.ad.split(' ')[0]} Hoca, ${n ? eklenen + ' hafta boyunca her ' + gunKisa(planGun) : tarihUzun(planGun)} ${saatDe(saat)} ${tamAd(k)} (${SINIFLAR[k.sinif].ad}) ile direksiyon dersiniz var. Kursiyerin ${k.direksiyon + 1}. dersi.`, tur: 'Ders bildirimi' }], 'Ders planlandı'); else bildir(eklenen + ' ders eklendi');
        if (atlanan.length) setTimeout(() => bildir('Atlanan haftalar: ' + atlanan.join(', '), 'uyari'), 900);
        yenile();
      });
    },
  });
}
function bosSaatiDoldur(d) {
  const bek = S.bekleme.map(b => kursiyer(b.kursiyer)).filter(k => k && k.id !== d.kursiyer && (arac(d.arac) ? aracSiniflari(k.sinif).includes(arac(d.arac).sinif) : egitmen(d.egitmen).siniflar.includes(k.sinif)) && !S.dersler.some(x => x.kursiyer === k.id && x.tarih === d.tarih && x.saat === d.saat) && !(geceKisitli(k) && geceDersMi(d)));  // gece kısıtlıya gece saati önerilmez (md.7/3)
  if (!bek.length) { bildir('Ders iptal edildi'); return yenile(); }
  pencere({
    baslik: 'Boşalan saati dolduralım mı?',
    icerik: `<div class="ipucu" style="margin-bottom:14px">${isaret('bilgi', 22)}<span>${tarihUzun(d.tarih)} ${d.saat} boşaldı. Bekleme listesindeki ${bek.length} kişiye WhatsApp’tan teklif gidecek; ilk “evet” diyen dersi alır.</span></div>${S.kurs.ekDersUcreti > 0 && !tabanListesi() ? `<div class="alan" style="margin-bottom:12px"><label for="bt-indirim">Bu saate özel ek ders ücreti</label><select id="bt-indirim" class="girdi">${[0, 10, 20, 30, 50].map(y => `<option value="${y}" ${y === 20 ? 'selected' : ''}>${y ? '%' + y + ' indirimli · ' + tl(Math.round(S.kurs.ekDersUcreti * (100 - y) / 100 / 10) * 10) : 'Normal ücret · ' + tl(S.kurs.ekDersUcreti)}</option>`).join('')}</select><small style="color:var(--soluk)">Saat boşa gitmesin diye indirimli teklif edin; mesajda fiyat yazar.</small></div>` : tabanListesi() ? `<p class="ipucu" style="margin-bottom:12px">${isaret('bilgi', 18)}<span>İl taban fiyat listesi gereği indirimli teklif yapılmaz (not 6). Zorunlu dersi biten öğrenciden ilave direksiyon dersi ücreti (${tl(ekDersFiyat('B'))} ve üstü) alınır.</span></p>` : ''}${bek.map(k => `<div class="evrak">${isaret('zorunlu', 20)}<span style="flex:1;color:var(--murekkep);font-weight:700">${e(tamAd(k))}</span><small style="color:var(--soluk)">${k.direksiyon}/${gerekliDireksiyon(k)} ders</small></div>`).join('')}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Boş kalsın</button><button class="dg dg-wp" data-teklif>${ik('wp')}Teklif gönder</button>`,
    onAc(p) {
      p.querySelector('[data-teklif]').addEventListener('click', () => {
        const yuzde = Number((p.querySelector('#bt-indirim') || {}).value || 0), normal = S.kurs.ekDersUcreti || 0, fiyat = yuzde && normal ? Math.round(normal * (100 - yuzde) / 100 / 10) * 10 : 0;
        kapatPencere(); const teklifMetni = k => `${selam(k)} ${tarihUzun(d.tarih)} ${saatDe(d.saat)} ${egitmen(d.egitmen).ad} ile direksiyon saati boşaldı.${fiyat ? ` Bu saate özel ek ders ücreti ${tl(normal)} yerine ${tl(fiyat)} (%${yuzde} indirim).` : ''} İsterseniz “evet” yazın; ilk yazan alır.`;         S.bosTeklif = S.bosTeklif || []; S.bosTeklif.push({ id: 'b' + Date.now(), tarih: d.tarih, saat: d.saat, egitmen: d.egitmen, arac: d.arac, adaylar: bek.map(k => k.id), gonderildi: yerelZaman(), ...(fiyat ? { fiyat, normal, yuzde } : {}) });
        islem('Boş saat teklifi gönderdi', tarih(d.tarih) + ' ' + d.saat + ' · ' + bek.length + ' kişi' + (fiyat ? ' · ' + tl(fiyat) : '')); kaydet();
        yenile(); waSirali(kisiListe(bek, teklifMetni), 'Boş saat teklifi', { aciklama: 'Kabul eden olunca Plan’daki “Açık teklif”ten işaretleyin.' });
      });
    },
  });
}
// Boş saat teklifini kabul eden: ders onun adına planlanır, diğer adaylara saat doldu bilgisi gider.
export function bosTeklifKabul(tid, kid, kursiyerden = false) {
  const t = (S.bosTeklif || []).find(x => x.id === tid), k = kursiyer(kid); if (!t || !k) return;
  if (S.dersler.some(x => x.tarih === t.tarih && x.saat === t.saat && (x.egitmen === t.egitmen || x.kursiyer === k.id))) { S.bosTeklif = S.bosTeklif.filter(x => x !== t); kaydet(); yenile(); return bildir('Bu saat artık dolu; teklif kapatıldı', 'uyari'); }
  S.dersler.push({ id: 'd' + Date.now(), kursiyer: k.id, egitmen: t.egitmen, arac: t.arac, tarih: t.tarih, saat: t.saat, durum: 'Planlandı', eklendi: gun(0), ...(t.fiyat ? { bosSaatUcret: t.fiyat } : {}) });
  S.bekleme = S.bekleme.filter(b => b.kursiyer !== k.id); S.kazanim.doldurulan++; S.bosTeklif = S.bosTeklif.filter(x => x !== t);
  const digerleri = t.adaylar.filter(x => x !== k.id).map(kursiyer).filter(Boolean);
  islem('Boş saati doldurdu', tamAd(k) + ' · ' + tarih(t.tarih) + ' ' + t.saat); kaydet(); yenile();
  const liste = [{ k, m: `${selam(k)} ${tarihUzun(t.tarih)} ${t.saat} dersiniz ${egitmen(t.egitmen).ad} ile planlandı.${t.fiyat ? ' Ücreti: ' + tl(t.fiyat) + '.' : ''}` }, ...digerleri.map(o => ({ k: o, m: `${selam(o)} ${tarihUzun(t.tarih)} ${t.saat} saati doldu; bir sonraki boşlukta yine haber vereceğiz.` }))];
    const hoca = egitmen(t.egitmen), hm = `${hoca.ad.split(' ')[0]} Hoca, ${tarihUzun(t.tarih)} ${t.saat} boşalan saatinize ${tamAd(k)} yazıldı.`;
  if (kursiyerden) { bildirimler([...digerleri.map(o => ({ kim: o, metin: `${selam(o)} ${tarihUzun(t.tarih)} ${t.saat} saati doldu; bir sonraki boşlukta yine haber vereceğiz.`, tur: 'Boş saat' })), { kim: hoca, metin: hm, tur: 'Boş saat' }, { kim: 'mudur', metin: `${tamAd(k)} ${tarihUzun(t.tarih)} ${t.saat} boş saat teklifini kabul etti.`, tur: 'Boş saat' }], 'Boş saat doldu'); return bildir('Saat senin; dersin planlandı'); }
  waSirali([...liste.map(x => ({ ad: tamAd(x.k), tel: x.k.tel, rol: 'ÖĞRENCİ', metin: x.m })), { ad: hoca.ad, tel: hoca.tel, rol: 'HOCA', metin: hm }], 'Boş saati doldurdu · bilgilendirme', { sessiz: true });
}
// Ek ders teklifi kabul: ücret ödeme planına yeni taksit olarak eklenir.
export function ekDersKabul(k) {
  const t = k.ekDersTeklif; if (!t) return;
  // ek ders kurs ücretine (sözleşme ücreti) karışmaz: ödeme planında ayrı "ders" kalemi (iade %10 ve taban denetimi sözleşme ücretine bakar)
  k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: 'Ek direksiyon dersi × ' + t.n, tutar: t.tutar, odendi: null, tur: 'ders', tarih: gun(0) }); S.kazanim.ekDers++;
  k.ekDersHakki = (k.ekDersHakki || 0) + t.n; k.ekDersTeklif = null;
  islem('Ek ders teklifi kabul edildi', tamAd(k) + ' · ' + t.n + ' ders · ' + tl(t.tutar)); kaydet();
  bildir(k.ad + ' ' + t.n + ' ek dersi kabul etti; ' + tl(t.tutar) + ' ödeme planına eklendi'); yenile();
  const h = egitmen(k.egitmen);
  bildirimler([{ kim: 'mudur', metin: `${tamAd(k)} ${t.n} ek direksiyon dersi teklifini kabul etti; ${tl(t.tutar)} ödeme planına eklendi. Dersleri planlayın.`, tur: 'Ek ders' }, h && { kim: h, metin: `${h.ad.split(' ')[0]} Hoca, ${tamAd(k)} ${t.n} ek direksiyon dersi aldı; dersler planlanınca programınıza eklenecek.`, tur: 'Ek ders' }], 'Ek ders kabul edildi');
}
// DIR-009: dersin MEBBİS eğitim türü. Kendiliğinden (egitimTuruOf) ya da müdürün seçtiği; seçim d.egitimTuru'na yazılır.
// DIR-043: öğrenci dosyası › Sınavlar başında psikoteknik randevusu (varsa son randevu, yoksa yalnız kısayol)
function psikoSatiri(k) {
  const x = PS.kursiyerRandevusu(k);
  return `<div class="ps-satir">${ik('takvim')}<span style="flex:1;min-width:0"><b>Psikoteknik</b> · ${x ? `${tarih(x.tarih)} ${x.saat} · ${e(x.kaynak)} · ${x.sonuc ? e(x.sonuc) : e(x.durum.toLocaleLowerCase('tr'))}` : 'randevu yok'}</span>${PS.engel({ kursiyer: k.id }) ? '' : `<button type="button" class="dg dg-cizgi dg-kucuk" data-ps-ver>Randevu ver</button>`}<a class="dg dg-hafif dg-kucuk" href="#/sinavlar/psiko">Randevular</a></div>`;
}
function dersUyumSatiri(d) { const u = UY.dersUyumsuz(d.id); if (!u) return ''; const m = UY.metin(u); return `<dt>MEBBİS</dt><dd><b style="color:var(--kirmizi)">${e(m.etiket.join(', '))}</b>${m.meb ? `<small style="display:block">${e(m.meb)}</small>` : ''}<small style="display:block;color:var(--metin)">${e(m.ne)} <a href="#/meb" style="color:var(--levha);font-weight:700">Uyumsuzluklar</a></small></dd>`; }
function dersEgitimSatiri(d, k) {
  const oto = (() => { const x = { ...d }; delete x.egitimTuru; return egitimTuruOf(k, x); })(), sec = EGITIM_TURU[d.egitimTuru] ? d.egitimTuru : '';
  const neden = { normal: 'zorunlu ders', onSinav: 'gereken dersler bitti, sınava hazır yazısı yok (md.7/7)', ikinci: 'ikinci dört hak başladı', basarisiz: 'son uygulama sınavından sonra (md.15)' }[oto];
  return `<dt>Eğitim türü</dt><dd>${mudurMu() && d.durum !== 'İptal' ? `<select class="girdi" style="height:36px;max-width:100%" data-ders-egitim="${e(d.id)}" aria-label="MEBBİS eğitim türü"><option value="">Kendiliğinden: ${e(EGITIM_TURU[oto].kisa)} (${e(neden)})</option>${Object.entries(EGITIM_TURU).map(([a, x]) => `<option value="${a}" ${sec === a ? 'selected' : ''}>${e(x.kisa)}</option>`).join('')}</select>` : e(EGITIM_TURU[sec || oto].kisa)}${d.meb ? '<small style="display:block;color:var(--soluk);font-size:12.5px">MEBBİS’e yazıldı; türü değiştirirseniz ders yeniden “MEBBİS’e girilecek” olur.</small>' : ''}</dd>`;
}
function dersAc(id) {
  const d = S.dersler.find(x => x.id === id); const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac);
  pencere({
    baslik: 'Direksiyon dersi',
    icerik: `<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px;flex-wrap:wrap">${ar ? aracGorsel(ar, 'orta') : ''}<div style="flex:1;min-width:180px"><b style="display:block;font-family:var(--baslik);font-size:20px;color:var(--murekkep)">${e(tamAd(k))}</b><span>${SINIFLAR[k.sinif].ad} · ${k.direksiyon}/${gerekliDireksiyon(k)} ders yapıldı</span></div><a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}" data-kapat>Dosyayı aç</a></div>
      <dl class="bilgi-tablo"><dt>Zaman</dt><dd>${tarihUzun(d.tarih)} · ${d.saat}${d.tekrar ? ' · haftalık' : ''}${d.tur ? ' · ' + DERS_TUR_AD[d.tur] : ''}</dd>${dersEgitimSatiri(d, k)}${dersUyumSatiri(d)}<dt>Usta öğretici</dt><dd>${e(eg.ad)}</dd><dt>${d.tur === 'simulator' ? 'Simülatör' : 'Araç'}</dt><dd>${d.tur === 'simulator' ? (() => { const sl = (S.simulatorler || []).filter(x => x && x.sicilNo); return sl.length > 1 && d.durum === 'Planlandı' && !d.meb ? `<select class="girdi" style="height:34px;width:auto" data-ders-sim="${e(d.id)}" aria-label="Simülatör">${sl.map(x => `<option value="${e(x.id)}" ${d.simulator === x.id || d.simulator === x.sicilNo ? 'selected' : ''}>${e(x.sicilNo)}</option>`).join('')}</select>` : e((sl.find(x => x.id === d.simulator || x.sicilNo === d.simulator) || sl[0] || { sicilNo: 'sicil no kayıtlı değil' }).sicilNo); })() : ar ? plaka(ar.plaka) + ' ' + e(ar.model) : '—'}</dd><dt>Durum</dt><dd>${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</dd>${d.durum === 'Yapıldı' ? `<dt>İmza</dt><dd>${d.imza ? (d.imza.kursiyer ? `<img src="${d.imza.kursiyer}" alt="Kursiyer imzası" style="height:38px;background:#fff;border:1px solid var(--cizgi);border-radius:4px"> <img src="${d.imza.usta}" alt="Usta öğretici imzası" style="height:38px;background:#fff;border:1px solid var(--cizgi);border-radius:4px">` : rozet('İmzalı', 'yesil')) + olcuAltiIsaret(d.imza.kanit) : rozet('İmza eksik', 'kirmizi') + ' <small style="color:var(--soluk)">Usta öğretici ekranından imzalatılır</small>'}</dd>` : ''}</dl>`,
    altlik: d.durum === 'Planlandı' ? `<button class="dg dg-cizgi" data-iptal style="margin-right:auto;color:var(--kirmizi);border-color:var(--kirmizi)">Dersi iptal et</button><button class="dg dg-cizgi" data-tasi>Taşı</button><button class="dg dg-cizgi" data-gelmedi>Gelmedi</button><button class="dg dg-ana" data-yapildi>${ik('tik')}Yapıldı</button>` : `<button class="dg dg-cizgi" data-geri>Planlandı’ya al</button><button class="dg dg-koyu" data-kapat>Tamam</button>`,
    onAc(p) {
      // DIR-025: simülatör dersinin cihazı (birden çok simülatörde)
      { const se = p.querySelector('[data-ders-egitim]'); if (se) se.addEventListener('change', () => { const eski = d.egitimTuru || ''; if (se.value) d.egitimTuru = se.value; else delete d.egitimTuru; islem('Dersin eğitim türünü değiştirdi', `${tamAd(k)} · ${tarih(d.tarih)} ${d.saat} · ${eski ? EGITIM_TURU[eski].kisa : 'kendiliğinden'} → ${se.value ? EGITIM_TURU[se.value].kisa : 'kendiliğinden'}`); kaydet(); bildir(d.meb === false && d.mebDegisti ? 'Kaydedildi; ders yeniden MEBBİS’e girilecek' : 'Kaydedildi'); }); }
      { const ss = p.querySelector('[data-ders-sim]'); if (ss) ss.addEventListener('change', () => { const dd = S.dersler.find(x => x.id === ss.dataset.dersSim); if (!dd) return; dd.simulator = ss.value; islem('Simülatör dersinin cihazını seçti', ((S.simulatorler || []).find(x => x.id === ss.value) || {}).sicilNo || ''); kaydet(); bildir('Simülatör kaydedildi'); }); }
      p.addEventListener('click', ev => {
        const henuz = () => d.tarih > gun(0) || (d.tarih === gun(0) && d.saat > new Date().toTimeString().slice(0, 5));
        if (ev.target.closest('[data-yapildi]') && henuz()) return bildir(`Bu ders ${tarihUzun(d.tarih)} ${d.saat}; saati gelmeden “Yapıldı” işaretlenemez`, 'uyari');
        if (ev.target.closest('[data-gelmedi]') && henuz()) return bildir('Dersin saati gelmeden “Gelmedi” işaretlenemez', 'uyari');
        if (ev.target.closest('[data-yapildi]')) { geriAlNoktasi(); islem('Ders yapıldı işaretledi', tamAd(k) + ' · ' + d.saat); d.durum = 'Yapıldı'; k.direksiyon = k.direksiyon + 1; kaydet(); kapatPencere(); bildir('Ders yapıldı olarak işaretlendi', 'tamam', true); yenile(); }
        if (ev.target.closest('[data-gelmedi]')) { d.durum = 'Gelmedi'; islem('Gelmedi işaretledi', tamAd(k) + ' · ' + tarih(d.tarih) + ' ' + d.saat); kaydet(); kapatPencere(); bildirimler([{ kim: k, metin: `${selam(k)} ${d.saat} direksiyon dersine gelmediniz. Yeni bir saat ayarlayalım mı?`, tur: 'Gelmedi bildirimi' }, { kim: 'mudur', metin: `${tamAd(k)} ${d.saat} dersine gelmedi (${eg.ad}).`, tur: 'Gelmedi bildirimi' }], 'Derse gelmedi'); yenile(); }
        if (ev.target.closest('[data-iptal]')) { geriAlNoktasi(); dersIptalIz(d, 'Kurs iptal etti'); S.dersler = S.dersler.filter(x => x.id !== d.id); islem('Ders iptal etti', tamAd(k) + ' · ' + tarih(d.tarih) + ' ' + d.saat); kaydet(); kapatPencere(); bildirimler([{ kim: k, metin: `${selam(k)} ${tarihUzun(d.tarih)} ${d.saat} direksiyon dersiniz iptal edildi. Yeni saat için ${kursAdi('e')} yazabilirsiniz.`, tur: 'Ders iptali' }, { kim: eg, metin: `${eg.ad.split(' ')[0]} Hoca, ${tarihUzun(d.tarih)} ${d.saat} ${tamAd(k)} dersi iptal edildi; o saat boş.`, tur: 'Ders iptali' }], 'Ders iptal edildi'); bosSaatiDoldur(d); }
        if (ev.target.closest('[data-tasi]')) {
          const bos = dersSaatleri().filter(sa => sa !== d.saat && !S.dersler.some(x => x.tarih === d.tarih && x.saat === sa && (x.egitmen === d.egitmen || x.kursiyer === d.kursiyer)) && dersAraci(d.egitmen, k.sinif, d.tarih, sa, d) && (d.tarih > gun(0) || sa > new Date().toTimeString().slice(0, 5)));
          const gov = p.querySelector('.pencere-govde');
          gov.insertAdjacentHTML('beforeend', `<div style="margin-top:16px"><p class="et" style="margin-bottom:6px">Aynı gün boş saatler</p><div class="secim">${bos.map(sa => `<label><input type="radio" name="yeni-saat" value="${sa}"><span>${sa}</span></label>`).join('') || '<span style="color:var(--soluk)">Boş saat yok</span>'}</div></div>`);
          p.querySelector('[data-tasi]').outerHTML = '<button class="dg dg-ana" data-tasi-onay>Yeni saate taşı</button>';
        }
        if (ev.target.closest('[data-tasi-onay]')) { const v = p.querySelector('[name=yeni-saat]:checked'); if (!v) return bildir('Bir saat seçin', 'uyari'); geriAlNoktasi(); const eski = d.saat, yeniAr = dersAraci(d.egitmen, k.sinif, d.tarih, v.value, d); if (!yeniAr) return bildir('Bu saatte boş araç kalmadı', 'uyari'); d.saat = v.value; d.arac = yeniAr.id; islem('Dersi taşıdı', tamAd(k) + ' · ' + eski + ' → ' + d.saat); kaydet(); kapatPencere(); yenile(); bildirimler([{ kim: k, metin: `${selam(k)} ${tarihUzun(d.tarih)} direksiyon dersiniz ${eski} yerine ${saatE(d.saat)} saatine alındı.`, tur: 'Saat değişikliği' }, { kim: eg, metin: `${eg.ad.split(' ')[0]} Hoca, ${tarihUzun(d.tarih)} ${tamAd(k)} dersi ${eski} yerine ${saatE(d.saat)} alındı.`, tur: 'Saat değişikliği' }], 'Ders saati değişti'); }
        if (ev.target.closest('[data-geri]')) { if (d.durum === 'Yapıldı') k.direksiyon = Math.max(0, k.direksiyon - 1); d.durum = 'Planlandı'; kaydet(); kapatPencere(); yenile(); }
      });
    },
  });
}

/* ================= TEORİK DERSLER ================= */
const GRUP_AD = { aksam: 'Akşam grubu · Derslik 1', sabah: 'Sabah grubu · Derslik 2' };
// Kursiyerin devamsızlığı: grubunun geçmiş oturumlarında yoklamada işaretlenmediği sayısı (yoklama kaydı yoksa sayılmaz)
const devamsiz = k => S.teorik.filter(t => t.grup === k.teorikGrup && t.yoklama && t.tarih >= k.kayit && !t.yoklama.includes(k.id)).length;
export function teorik() {
  const liste = [...S.teorik].sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const gelecek = liste.filter(t => fark(t.tarih) >= 0), gecmis = liste.filter(t => fark(t.tarih) < 0).reverse();
  const teorikte = sb(S.kursiyerler).filter(k => k.asama === 'Teorik').sort((a, b) => b.teorik - a.teorik);
  const hazir = teorikte.filter(k => k.teorik >= teorikSaat(k) - 4);
  const grupKisi = g => teorikte.filter(k => k.teorikGrup === g);
  const ort = gecmis.length ? Math.round(gecmis.reduce((a, t) => a + (t.yoklama ? t.yoklama.length : t.katilim) / Math.max(1, t.yoklama ? grupKisi(t.grup).length : t.mevcut), 0) / gecmis.length * 100) : 0;
  const sinirda = teorikte.filter(k => devamsiz(k) >= kuralAyar('devamsizlikSiniri') - 1);
  const satir = (t, gec) => { const n = t.yoklama ? t.yoklama.length : t.katilim, top = t.yoklama ? grupKisi(t.grup).length : t.mevcut; const o = ogretmen(t.ogretmen); return `<li><span class="zaman">${t.saat}</span><div style="min-width:0"><b style="color:var(--murekkep)">${e(t.konu)}</b>${t.egitimTuru === 'telafi' ? ' <span class="rozet rozet-uyari">Telafi</span>' : ''}<small style="display:block;color:var(--soluk)">${goreli(t.tarih)} · ${t.sure} saat · ${e(GRUP_AD[t.grup] || (GR.grupBul(t.grup) || {}).ad || t.salon)} · Öğretmen ${e(o ? o.ad : '')}</small></div>
    <span class="sag">${gec ? `<span class="sayi" style="font-size:13px">${n}/${top}</span>${ilerleme(n, top, n / Math.max(1, top) > .8 ? 'yesil' : 'sari')}` : ''}<button class="dg ${gec ? 'dg-cizgi' : 'dg-koyu'} dg-kucuk" data-yoklama="${t.id}">${gec ? 'Yoklamayı gör' : 'Yoklama al'}</button></span></li>`; };
  return {
    baslik: 'Teorik dersler', alt: 'Sınıf programı, yoklama ve e-sınava hazırlık',
    html: `${ekranNotu('Teorik dersleri öğretmenler verir. Yoklama, dersin grubundaki kursiyerlerle alınır; devamsızlık sınırına yaklaşan kursiyere uyarı gider.')}<div class="izgara iz-4">
      <div class="kart gosterge"><small>Teorik aşamada</small><b>${teorikte.length} kursiyer</b><span>Akşam ${grupKisi('aksam').length} · sabah ${grupKisi('sabah').length}</span></div>
      <div class="kart gosterge"><small>Ortalama katılım</small><b>%${ort}</b><span>Son ${gecmis.length} oturum</span></div>
      <div class="kart gosterge"><small>Devamsızlık sınırında</small><b>${sinirda.length}</b><span>Sınır ${kuralAyar('devamsizlikSiniri')} ders</span></div>
      <div class="kart gosterge"><small>e-Sınava hazır</small><b>${hazir.length} kursiyer</b><span><a href="#/meb/esinav">Başvuru listesi</a></span></div>
    </div><div class="ara-bosluk"></div>${GR.gruplarKarti()}<div class="ara-bosluk"></div>
    ${(() => { const l = KR.calistir(r => r.id === 'Y05'); return l.length ? `<div class="kart" style="margin-bottom:16px;border-color:var(--turuncu)"><div class="kart-bas"><h3>Teorik program uyarısı</h3><small>Günde 2–6 saat (MTSK md.16/4)</small></div><ul class="liste" style="margin-top:6px">${l.map(([t, b, a]) => `<li>${isaret(t, 24)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(b)}</b><small style="color:var(--soluk)">${e(a)}</small></div></li>`).join('')}</ul></div>` : ''; })()}
    <div class="izgara iz-21">
      <div class="kart"><div class="kart-bas"><h3>Ders programı</h3><small>Yaklaşan ${gelecek.length} oturum</small></div>
        <ul class="liste teorik-liste" style="margin-top:8px">${gelecek.map(t => satir(t, false)).join('')}</ul>
        <div class="kart-bas" style="padding-top:22px"><h3>Geçmiş oturumlar</h3></div>
        <ul class="liste teorik-liste" style="margin-top:8px">${gecmis.slice(0, 6).map(t => satir(t, true)).join('')}</ul></div>
      <div>
        <div class="kart"><div class="kart-bas"><h3>Öğretmenler</h3><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-ogretmen-ekle>${ik('arti')}Öğretmen ekle</button></div></div><ul class="liste" style="margin-top:8px">${(S.ogretmenler || []).map(o => `<li>${isaret('bilgi', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(o.ad)}</b><small style="color:var(--soluk)">${e(o.brans)} · ${S.teorik.filter(t => t.ogretmen === o.id && fark(t.tarih) >= 0).length} yaklaşan ders · ${o.calismaIzinNo ? 'izin no ' + e(o.calismaIzinNo) : '<b style="color:var(--kirmizi)">MEBBİS izin no yok</b>'}</small></div><button class="dg dg-hafif dg-kucuk" data-ogretmen-duzenle="${e(o.id)}" aria-label="Düzenle">${ik('kalem')}</button></li>`).join('') || '<li><small style="color:var(--soluk)">Teorik öğretmen yok. MEBBİS’e teorik ders girmek için öğretmeni izin numarasıyla ekleyin.</small></li>'}</ul></div>
        <div class="ara-bosluk"></div>
        <div class="kart"><div class="kart-bas"><h3>Kursiyer ilerlemesi</h3><small>Teorik saat · devamsızlık</small></div>
        <ul class="liste" style="margin-top:8px">${teorikte.slice(0, 14).map(k => { const dv = devamsiz(k); return `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))}</b><small>${k.teorik}/${teorikSaat(k)} saat · ${e((GR.kursiyerGrubu(k) || {}).ad || (k.teorikGrup === 'sabah' ? 'sabah' : 'akşam'))}${dv ? ' · ' + dv + ' devamsız' : ''}</small></div></a><span class="sag" style="width:96px">${dv >= kuralAyar('devamsizlikSiniri') - 1 ? rozet('Sınırda', 'kirmizi') : ilerleme(k.teorik, teorikSaat(k), k.teorik >= teorikSaat(k) - 4 ? 'yesil' : '')}</span></li>`; }).join('') || '<li>' + bos('Teorik aşamada kursiyer yok', '') + '</li>'}</ul></div>
      </div>
    </div>`,
    baglan(k) {
      GR.gruplarBaglan(k, yenile);
      k.addEventListener('click', ev => {
        const y = ev.target.closest('[data-yoklama]'); if (!y) return;
        const t = S.teorik.find(x => x.id === y.dataset.yoklama);
        if (fark(t.tarih) > 0) return bildir('Bu ders henüz yapılmadı; yoklama ders günü alınır', 'uyari');
        const sinif = grupKisi(t.grup).filter(x => x.kayit <= t.tarih);
        pencere({
          baslik: 'Yoklama · ' + t.konu,
          icerik: `<p style="color:var(--soluk);margin-bottom:12px">${tarihUzun(t.tarih)} · ${t.saat} · ${e(GRUP_AD[t.grup] || (GR.grupBul(t.grup) || {}).ad || t.salon)} · ${sinif.length} kayıtlı kursiyer</p>${(r => r.no.length ? `<div class="alan" style="margin-bottom:12px"><label>İşlenen konu <small style="color:var(--soluk);font-weight:400">ders defterine yazılır · MEB programına göre ${r.no.join('–')}. ders</small></label><input data-islenen value="${e(t.islenen || r.konular.join('; '))}" maxlength="200"></div>` : '')(dersKonulariResmi(t))}${sinif.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px">${sinif.map(x => `<label class="evrak" style="cursor:pointer"><input type="checkbox" name="v" value="${x.id}" ${!t.yoklama || t.yoklama.includes(x.id) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--yesil)"><span style="color:var(--murekkep)">${e(tamAd(x))}</span>${devamsiz(x) ? `<small style="color:var(--kirmizi);margin-left:auto">${devamsiz(x)} devamsız</small>` : ''}</label>`).join('')}</div>` : bos('Bu grupta teorik aşamada kursiyer yok', '')}`,
          altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet ${sinif.length ? '' : 'disabled'}>Yoklamayı kaydet</button>`,
          onAc(d) {
            d.querySelector('[data-kaydet]').addEventListener('click', () => {
              const gelen = [...d.querySelectorAll('[name=v]:checked')].map(x => x.value), gelmeyen = sinif.filter(x => !gelen.includes(x.id));
              geriAlNoktasi(); const once = t.yoklama || []; t.yoklama = gelen; t.katilim = gelen.length;
              { const ii = d.querySelector('[data-islenen]'); if (ii) { const v = ii.value.trim(), r = dersKonulariResmi(t); if (v && v !== r.konular.join('; ')) t.islenen = v; else delete t.islenen; } }
              // aynı yoklama ikinci kez kaydedilirse saatler iki kez sayılmaz: yalnız değişen kişiler güncellenir
              sinif.forEach(x => { const vardi = once.includes(x.id), var_ = gelen.includes(x.id); if (var_ && !vardi) x.teorik = Math.min(SINIFLAR[x.sinif].teorik, x.teorik + t.sure); if (!var_ && vardi) x.teorik = Math.max(0, x.teorik - t.sure); });
              const yokMetin = x => `${selam(x)} bugünkü teorik derse (${t.konu}) katılmadınız.${devamsiz(x) >= kuralAyar('devamsizlikSiniri') - 1 ? ' Devamsızlık sınırına yaklaştınız; bir derse daha gelmezseniz sınava giremeyebilirsiniz.' : ` Kaçırdığınız konuyu telafi etmek için ${kursAdi('e')} yazabilirsiniz.`}`;
                            islem('Yoklama aldı', t.konu + ' · ' + gelen.length + '/' + sinif.length);
              kaydet(); kapatPencere(); bildir(`Yoklama kaydedildi: ${gelen.length}/${sinif.length}`, 'tamam', true); yenile(); if (gelmeyen.length) waSirali(kisiListe(gelmeyen, yokMetin), 'Gelmeyenlere bilgi ver');
            });
          },
        });
      });
    },
  };
}

export function ekDersOner(k, sonra) {
  if (k.ekDersTeklif) return bildir(`${k.ad} kişisine ${tarih(k.ekDersTeklif.tarih)} tarihinde ${k.ekDersTeklif.n} ders teklif edildi; cevabı bekleniyor`, 'uyari');
  pencere({
    baslik: 'Ek ders öner · ' + tamAd(k),
    icerik: `<p style="margin-bottom:12px">Sınavdan önce kaç ek ders önerelim? Teklif kursiyerin WhatsApp’ına ve kursiyer ekranına gider. Kabul ederse ücret ödeme planına eklenir; telefonda kabul ederse kursiyer dosyasından siz işaretlersiniz.</p><div class="secim">${(f1 => f1 && ekDersTabani() && f1 < ekDersTabani() ? `<p class="ipucu uyari" style="margin-bottom:10px">${isaret('uyari', 18)}<span>Ek ders ücreti (${tl(f1)}) il tabanının (${tl(ekDersTabani())}) altında; Ayarlar › Sınıf ve ücretler’den düzeltin.</span></p>` : '')(ekDersFiyat(k.sinif))}${[2, 4, 6].map(n => [n, n * ekDersFiyat(k.sinif)]).map(([n, f], i) => `<label><input type="radio" name="n" value="${n}|${f}" ${i === 0 ? 'checked' : ''}><span>${n} ders · ${tl(f)}</span></label>`).join('')}</div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-wp" data-k>${ik('wp')}Teklifi gönder</button>`,
    onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { const [n, f] = p.querySelector('[name=n]:checked').value.split('|').map(Number); k.ekDersTeklif = { n, tutar: f, tarih: gun(0) }; islem('Ek ders teklif etti', tamAd(k) + ' · ' + n + ' ders'); kaydet(); kapatPencere(); wpGonder(k, `${selam(k)} sınavdan önce ${n} ek direksiyon dersi (${tl(f)}) öneriyoruz. Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.`, 'Ek ders teklifi'); sonra ? sonra() : yenile(); }); },
  });
}

// UYG-005: öğrencinin uygulamada çözdüğü deneme ve testlerin listesi (k.denemeDetay; eski kayıtlarda yalnız puanlar vardı)
const TEST_TUR = { deneme: 'Deneme sınavı', hizli: 'Hızlı test', konu: 'Konu testi', tekrar: 'Tekrar', yanlislar: 'Yanlışlar testi' };
function denemeListesi(k) {
  const l = (k.denemeDetay || []).slice().reverse(); if (!l.length) return '';
  const dk = sn => sn >= 60 ? Math.round(sn / 60) + ' dk' : sn + ' sn';
  return `<details class="daha" style="margin-top:6px"><summary>Çözdüğü ${l.length} test ve deneme</summary><div class="tablo-kap"><table class="tablo"><thead><tr><th>Tür</th><th>Başlama</th><th>Bitiş</th><th>Süre</th><th>Soru</th><th>D</th><th>Y</th><th>B</th><th>Puan</th><th>Durum</th></tr></thead><tbody>${l.map(x => `<tr><td>${e(TEST_TUR[x.tur] || x.tur || '')}</td><td>${e(String(x.bas || '').slice(0, 16).replace('T', ' '))}</td><td>${e(String(x.bit || '').slice(11, 16))}</td><td>${dk(+x.sure || 0)}</td><td class="sayi">${+x.soru || 0}</td><td class="sayi">${+x.dogru || 0}</td><td class="sayi">${+x.yanlis || 0}</td><td class="sayi">${+x.bos || 0}</td><td class="sayi" style="color:${(+x.puan || 0) < 70 ? 'var(--kirmizi)' : 'var(--murekkep)'}">${+x.puan || 0}</td><td>${x.tamam ? (x.tur === 'deneme' ? ((+x.puan || 0) >= 70 ? 'Geçti' : 'Kaldı') : 'Bitti') : 'Yarım bırakıldı'}</td></tr>`).join('')}</tbody></table></div></details>`;
}
