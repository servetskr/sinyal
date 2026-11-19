import { planlilariGonder } from './mesaj.js?v=235';
import { izinBitisi, memVermeSuresi, adaySinavSaati, esinavUcreti, esinavHakDurum, odemeKodu, ibanMetni, S, kaydet, gun, fark, kursiyer, egitmen, tamAd, eksikEvrak, gecikenler, kalanBorc, islem, gonderimEkle, yerelZaman, oturum, kapaliGun, SINIFLAR, risk, selam, kursAdi, bulutKanca, mudurTel, ekDersFiyat, ekDersTabani } from './veri.js?v=235';
import { tl, tamTarih, tarihUzun, saatDe, apiAcik, apiGonder, etiket, bildir, waSirali } from './ui.js?v=235';
import { denetimSkoru } from './ozellik.js?v=235';
import * as KR from './kurallar.js?v=235';
import * as TY from './teorikyol.js?v=235';

/* ================= ZAMANLI MESAJLAR =================
   mdSinyal açıkken her dakika zamanı gelen mesajları bulur. WhatsApp API bağlıysa kendiliğinden gönderir;
   bağlı değilse "zamanı gelen mesajlar" kuyruğuna koyar, ön büro tek ekrandan sırayla gönderir.
   Aynı mesaj iki kez gitmez (anahtar defteri). Demo sınırı açıkken her kuraldan günde en fazla 2 mesaj gider. */

const YENI_KURALLAR = [
  { id: 'o10', ad: 'Hocaya yarınki program', ne: 'Her akşam 18:00’de', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: 'Merhaba {ad} Hoca, yarınki direksiyon programınız: {liste}.' },
  { id: 'o11', ad: 'Kayıt görüşmesi hatırlatması', ne: 'Görüşmeden bir gün önce 18:00’de', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} yarın {saatte} {kursta} kayıt görüşmeniz var. Adresimiz: {adres}. Kimliğinizi getirmeyi unutmayın.' },
  { id: 'o12', ad: 'Müdüre akşam özeti', ne: 'Her akşam 19:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{kurs} · {tarih} akşam özeti\n{ozet}' },
  { id: 'o13', ad: 'Belge, araç ve çalışma izni süresi uyarısı', ne: 'Bitmeden 30, 15, 7 ve 1 gün önce 09:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{konu} {kalan} bitiyor ({tarih}). Yenilemeyi unutmayın.' },
  { id: 'o15', ad: 'Kalma riski yüksek kursiyere ek ders teklifi', ne: 'Risk yükselince ertesi gün 12:00’de', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} son derslerinize göre sınavdan önce {n} ek direksiyon dersi ({tutar}) öneriyoruz{odak}. Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.' },
  { id: 'o16', ad: 'Doğum günü kutlaması', ne: 'Doğum gününde 10:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} doğum gününüz kutlu olsun! {kurs} olarak size sağlıklı, mutlu ve kazasız bir yıl dileriz.' },
  // MSJ-016, MSJ-015, MSJ-019
  { id: 'o17', ad: 'İkinci dört hak hatırlatması', ne: 'Son sınavdan 30 gün sonra ve başvuru son gününden 10 gün önce 10:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} uygulama sınavı haklarınız dolmuştu. {sonGun} tarihine kadar başvurursanız {hak} sınav hakkı daha kazanırsınız; derslerinizi birlikte planlayalım. {kurs}' },
  { id: 'o18', ad: 'Uygulama sınavı saati kesinleşti', ne: 'MEBBİS randevusu doğrulanınca (08:00–21:00)', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} uygulama sınavı saatiniz kesinleşti: {tarih} {saatte}, araç {plaka}, usta öğretmeniniz {usta}. Kimliğinizi yanınıza alın. {kurs}' },
  { id: 'o19', ad: 'e-Sınav ücreti hatırlatması', ne: 'Teorik bitip sıradaki hakkın ücreti yatmadıysa haftada bir, 11:00’de', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} e-sınava başvurabilmeniz için sıradaki sınav hakkınızın ücretini ({ucret}) kendi T.C. kimlik numaranızla yatırıp dekontu kursa iletin; öğrenci uygulamasından da yükleyebilirsiniz. {kurs}' },
  // MSJ-026: yöneticiye anlık bildirim (olay anında, WhatsApp hattı bağlıysa sessizce); kime: kullanıcı kimlikleri (boşsa kurs müdürü)
  { id: 'o20', ad: 'Ödeme alındı (yöneticiye)', ne: 'Tahsilat kaydedilince, anında', kanal: 'WhatsApp', acik: true, gonderim: 0, kime: [], sablon: 'Ödeme alındı: {ad} · {tutar} ({yontem}). Kaydeden: {kaydeden}. Kalan borcu {kalan}.' },
  { id: 'o21', ad: 'Yeni kayıt (yöneticiye)', ne: 'Kursiyer kaydedilince, anında', kanal: 'WhatsApp', acik: true, gonderim: 0, kime: [], sablon: 'Yeni kayıt: {ad} · {sinif}. Kaydeden: {kaydeden}.' },
  { id: 'o14', ad: 'Teorik grup başlangıcı', ne: 'Gruptan iki gün önce 10:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} teorik dersleriniz {tarih} {saatte} başlıyor ({grup}, {derslik}). Görüşmek üzere. {kurs}' },
];
// Eski “sen” dilli şablonları “siz” diline ve hitaba ({selam}) çevir
const SIZ_SABLON = {
  o1: '{selam} yarın {saat}’te {egitmen} ile direksiyon dersiniz var. Gelemeyecekseniz bu mesajı yanıtlamanız yeterli. {kurs}',
  o11: '{selam} yarın {saatte} {kursta} kayıt görüşmeniz var. Adresimiz: {adres}. Kimliğinizi getirmeyi unutmayın.',
  o14: '{selam} teorik dersleriniz {tarih} {saatte} başlıyor ({grup}, {derslik}). Görüşmek üzere. {kurs}',
  o15: '{selam} son derslerinize göre sınavdan önce {n} ek direksiyon dersi ({tutar}) öneriyoruz{odak}. Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.',
  o2: '{selam} {vade} tarihli {tutar} taksidinizin hatırlatmasıdır. {odeme}',
  o3: '{selam} {tur} sınavınız {tarih} {saatte}, yer: {yer}. Kimliğinizi yanınıza almayı unutmayın. {kurs}',
  o4: '{selam} kaydınızı tamamlamak için {evrak} eksik. {kursa} getirdiğinizde işlemlerinizi hemen başlatıyoruz.',
  o5: '{selam} tebrikler, artık ehliyetiniz var! {kurs} hakkında Google’da birkaç cümle yazarsanız çok seviniriz: {link}',
  o6: '{selam} {tur} sınavı bu sefer olmadı. {kalan_hak} Yönetmelik gereği tekrar sınavdan önce en az {telafi} saat ek direksiyon dersi alınıyor ({tutar}); saatlerini ayarlayalım mı? Öğrenci uygulamasından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.',
  o7: '{selam} kayıtla ilgili aklınıza takılan bir şey var mı? Bu hafta başlayan gruba hâlâ yer var. {kurs}',
  o8: '{selam} e-sınav randevunuz {tarih} {saatte}, yer: {yer}. Kimliğinizi ve e-sınav ücreti dekontunu yanınıza alın.',
  o9: '{selam} {tur} sınav sonucunuz: {sonuc}. {kalan_hak}'
};
// Eski kayıtlara yeni kuralları ve düzeltilmiş şablonları ekle
export function kurallariHazirla() {
  if (!S.otomasyonlar) return;
  YENI_KURALLAR.forEach(k => { if (!S.otomasyonlar.some(o => o.id === k.id)) S.otomasyonlar.push({ ...k }); });
  S.otomasyonlar.forEach(o => { o.sablon = o.sablon.replace('{saat}’te', '{saatte}').replace('Kartla ödemek için: {link}', '{odeme}'); });
  // PER-028: o13 artık çalışma iznini de kapsar ve 15 gün önce de hatırlatır (eski kayıtlı ad/açıklama güncellenir)
  S.otomasyonlar.forEach(o => { if (o.id === 'o13' && /30, 7 ve 1/.test(o.ne || '')) { o.ne = 'Bitmeden 30, 15, 7 ve 1 gün önce 09:00’da'; o.ad = 'Belge, araç ve çalışma izni süresi uyarısı'; } });
  S.otomasyonlar.forEach(o => { if (SIZ_SABLON[o.id] && !o.sablon.includes('{selam}') && o.sablon.includes('{ad}')) o.sablon = SIZ_SABLON[o.id]; if (o.id === 'o10' && o.sablon.startsWith('{ad} Hoca')) o.sablon = 'Merhaba ' + o.sablon; if (o.id === 'o2') o.sablon = o.sablon.replace('{odeme} {kurs}', '{odeme}'); });
  S.zamanli = S.zamanli || { gonderilen: {}, kayit: [], kuyruk: [], son: null, sinir: true };
}
const SAAT = { o1: '18:00', o10: '18:00', o11: '18:00', o12: '19:00', o13: '09:00', o2: '10:00', o3: '10:00', o14: '10:00', o4: '11:00', o7: '11:00', o15: '12:00', o16: '10:00', o17: '10:00', o18: '08:00', o19: '11:00' };
export const kuralSaati = id => SAAT[id] || null;
const kural = id => S.otomasyonlar.find(o => o.id === id);
// MSJ-031: T.C., şifre, PIN ve IBAN değişkeni şablonda doldurulmaz (KVKK)
const doldur = (id, alan) => { alan = { kurs: S.kurs.ad, kursa: kursAdi('e'), kursta: kursAdi('de'), ...alan }; ['tc', 'tckn', 'tcno', 'kimlik', 'sifre', 'parola', 'pin', 'iban'].forEach(a => { delete alan[a]; }); if (alan.kisi && !alan.selam) alan.selam = selam(alan.kisi); return (kural(id) ? kural(id).sablon : '').replace(/\{(\w+)\}/g, (x, a) => alan[a] != null ? alan[a] : ''); };
// PAR-058: öğrencinin mesaj kanalı (WhatsApp, SMS, e-posta); WhatsApp dışı kanal API ile gitmez, elle gönderilecekler kuyruğuna düşer
// KAY-106 (SOR-057): WhatsApp bilgilendirme onayını açıkça vermeyen (k.kvkk.whatsapp === false) öğrenciye WhatsApp gitmez; e-postası varsa e-postayla gider, yoksa gönderilmez (kim: null).
// Onay alanı olmayan eski kayıtlar eskisi gibi WhatsApp'tan alır.
const waRed = k => !!(k && k.kvkk && k.kvkk.whatsapp === false);
// DIG-051: eski programdan arşiv olarak aktarılan öğrenciye (k.kapali.tur === 'arsiv') hiçbir otomatik mesaj gitmez; arşivden tek tek, onayla çıkarılır
const arsivde = k => !!(k && k.kapali && k.kapali.tur === 'arsiv');
const ogr = k => arsivde(k) ? null : waRed(k) ? (k.eposta ? { ad: tamAd(k), tel: k.tel, rol: 'ÖĞRENCİ', kanal: 'E-posta', eposta: k.eposta, not: 'WhatsApp onayı yok' } : null) : ({ ad: tamAd(k), tel: k.tel, rol: 'ÖĞRENCİ', ...(k.mesajKanal && k.mesajKanal !== 'WhatsApp' ? { kanal: k.mesajKanal, eposta: k.eposta || '' } : {}) });
const hoca = h => ({ ad: h.ad, tel: h.tel, rol: 'HOCA' });
const mudur = () => ({ ad: S.kurs.yetkili || 'Kurs müdürü', tel: mudurTel(), rol: 'MÜDÜR' });
const odeme = k => S.kurs.iban ? `Havale/EFT için IBAN: ${ibanMetni()}; açıklamaya ${k ? 'ödeme kodunuzu (' + odemeKodu(k) + ') ve ' : ''}adınızı soyadınızı yazın; ${kursAdi('de')} nakit ya da kartla da ödeyebilirsiniz.` : `${kursAdi('e')} uğrayıp nakit ya da kartla ödeyebilirsiniz.`;
const TEORIK_SAAT = { aksam: '18:30', sabah: '10:00' };

// Her kural: o gün gönderilmesi gerekenler. ornek=true ise tarih şartı aranmaz (demo için tek örnek).
const URET = {
  o1: ornek => { const t = gun(1); return S.dersler.filter(d => d.durum === 'Planlandı' && (ornek ? fark(d.tarih) >= 0 : d.tarih === t)).map(d => { const k = kursiyer(d.kursiyer), h = egitmen(d.egitmen); return k && h && { anahtar: 'o1|' + d.id, kim: ogr(k), metin: doldur('o1', { kisi: k, ad: k.ad, saat: d.saat, saatte: saatDe(d.saat), egitmen: h.ad }) }; }); },
  o10: ornek => { const t = gun(1); return S.egitmenler.map(h => { const l = S.dersler.filter(d => d.egitmen === h.id && d.durum === 'Planlandı' && (ornek ? fark(d.tarih) >= 0 : d.tarih === t)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)); if (ornek && l.length) { const g = l[0].tarih; l.splice(0, l.length, ...l.filter(d => d.tarih === g)); } return l.length && { anahtar: 'o10|' + h.id + '|' + t, kim: hoca(h), metin: doldur('o10', { ad: h.ad.split(' ')[0], liste: l.map(d => { const k = kursiyer(d.kursiyer); return d.saat + ' ' + (k ? tamAd(k) + ' (' + SINIFLAR[k.sinif].ad + ')' : ''); }).join(', ') }) }; }); },
  o2: ornek => S.kursiyerler.filter(k => !k.kapali).flatMap(k => k.odeme.taksitler.map((tk, i) => ({ k, tk, i })).filter(({ tk }) => !tk.odendi && !tk.iptal && (ornek ? fark(tk.vade) >= 0 : [3, 0, -1].includes(fark(tk.vade))))).sort((a, b) => a.tk.vade.localeCompare(b.tk.vade)).map(({ k, tk, i }) => { const f = fark(tk.vade); return { anahtar: 'o2|' + k.id + '|' + i + '|' + f, kim: ogr(k), metin: f < 0 ? `${selam(k)} ${tamTarih(tk.vade)} vadeli ${tl(tk.tutar - (tk.kismi || 0))} taksidiniz henüz ödenmedi. ${odeme(k)}` : doldur('o2', { kisi: k, ad: k.ad, vade: tamTarih(tk.vade), tutar: tl(tk.tutar - (tk.kismi || 0)), odeme: odeme(k) }) }; }),
  o3: ornek => S.sinavlar.filter(s => ornek ? fark(s.tarih) >= 0 : [3, 1].includes(fark(s.tarih))).flatMap(s => { const f = fark(s.tarih), l = s.kursiyerler.map(kursiyer).filter(Boolean), sa = k => adaySinavSaati(s, k).saat; const ogrenci = l.map(k => ({ anahtar: 'o3|' + s.id + '|' + k.id + '|' + f, kim: ogr(k), metin: doldur('o3', { kisi: k, ad: k.ad, tur: s.tur.toLocaleLowerCase('tr'), tarih: tarihUzun(s.tarih), saat: sa(k), saatte: saatDe(sa(k)), yer: s.yer }) })); const hocalar = s.tur === 'Direksiyon' && (ornek || f === 1) ? [...new Set(l.map(k => k.egitmen))].map(egitmen).filter(Boolean).map(h => ({ anahtar: 'o3h|' + s.id + '|' + h.id, kim: hoca(h), metin: `Merhaba ${h.ad.split(' ')[0]} Hoca, ${tarihUzun(s.tarih)} ${saatDe(s.saat)} uygulama sınavı var (${s.yer}). Öğrencileriniz: ${l.filter(k => k.egitmen === h.id).sort((a, b) => sa(a).localeCompare(sa(b))).map(k => (adaySinavSaati(s, k).kesin ? sa(k) + ' ' : '') + tamAd(k)).join(' · ')}. Araçla ilk adaydan 30 dakika önce orada olun.` })) : []; return [...hocalar, ...ogrenci]; }),
  o4: ornek => S.kursiyerler.filter(k => eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama) && (ornek || [-3, -10].includes(fark(k.kayit)))).map(k => ({ anahtar: 'o4|' + k.id + '|' + fark(k.kayit), kim: ogr(k), metin: doldur('o4', { kisi: k, ad: k.ad, evrak: eksikEvrak(k).map(x => x[1].toLocaleLowerCase('tr')).join(', ') }) })),
  o7: ornek => S.adaylar.filter(a => a.asama === 'Bilgi verildi' && (ornek || fark(a.tarih) === -2)).map(a => ({ anahtar: 'o7|' + a.id, kim: { ad: a.ad, tel: a.tel, rol: 'ADAY' }, metin: doldur('o7', { kisi: a, ad: a.ad.split(' ')[0] }) })),
  o11: ornek => ((S.sosyal && S.sosyal.slotlar) || []).filter(x => x.dolu && (ornek ? fark(x.tarih) >= 0 : x.tarih === gun(1))).map(x => { const a = S.adaylar.find(y => y.id === x.aday) || { ad: x.dolu, tel: '' }; return { anahtar: 'o11|' + x.tarih + '|' + x.saat, kim: { ad: a.ad, tel: a.tel, rol: 'ADAY' }, metin: doldur('o11', { kisi: a, ad: a.ad.split(' ')[0], saatte: saatDe(x.saat), adres: S.kurs.adres }) }; }),
  o12: () => [{ anahtar: 'o12|' + gun(0), kim: mudur(), metin: aksamOzeti() }],
  o13: ornek => { const l = [], uyar = (f, hedef, konu, t, ek) => { if (ornek || [30, 15, 7, 1].includes(f)) l.push({ anahtar: 'o13|' + konu + '|' + t, kim: hedef, metin: doldur('o13', { konu, kalan: f <= 1 ? 'yarın' : f + ' gün sonra', tarih: tamTarih(t) }) + (ek || '') }); };
    S.araclar.forEach(a => [['muayene', 'muayenesi'], ['sigorta', 'trafik sigortası'], ['kasko', 'kaskosu']].forEach(([x, ad]) => { if (a[x] && fark(a[x]) > 0) uyar(fark(a[x]), mudur(), a.plaka + ' ' + ad, a[x]); }));
    // PER-028: öğretmenin çalışma izni (MEBBİS'ten okunan bitiş) — müdüre 30, 15, 7 ve 1 gün önce; izin bitişinden sonraya planlı ders sayısı da yazılır
    [...S.egitmenler, ...(S.ogretmenler || [])].forEach(h => { const t = izinBitisi(h); if (!t || fark(t) <= 0) return; const ileri = S.dersler.filter(d => d.egitmen === h.id && d.durum === 'Planlandı' && d.tarih > t).length;
      uyar(fark(t), mudur(), h.ad + ' çalışma izni', t, ` ${(ms => ms ? ms.metin.charAt(0).toLocaleUpperCase('tr') + ms.metin.slice(1) + '.' : '')(memVermeSuresi(t))}${ileri ? ` Bitişten sonraya ${ileri} planlı dersi var.` : ''}`);
      // MSJ-018: öğretmenin kendisine de (o13 biçimi aynı; yeni Meta şablonu gerekmez)
      if (h.tel) uyar(fark(t), hoca(h), h.ad.split(' ')[0] + ' Hoca, MEBBİS çalışma izniniz', t, ' Yenilenmezse ders ve sınava giremezsiniz.'); });
    S.egitmenler.forEach(h => Object.entries(h.belgeler || {}).forEach(([b, t]) => { if (t && fark(t) > 0) { const ad = { sertifika: 'usta öğretici sertifikanız', saglik: 'sağlık raporunuz', adli: 'adli sicil kaydınız' }[b]; uyar(fark(t), hoca(h), h.ad.split(' ')[0] + ' Hoca, ' + ad, t, ' Süresi dolarsa ders veremezsiniz.'); } }));
    return ornek ? l.sort((a, b) => a.anahtar.split('|').pop().localeCompare(b.anahtar.split('|').pop())).slice(0, 1) : l; },
  o14: ornek => (S.gruplar || []).filter(g => ornek ? fark(g.baslangic) >= 0 : fark(g.baslangic) === 2).flatMap(g => S.kursiyerler.filter(k => k.teorikGrup === g.id && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama) && !k.teorik).map(k => ({ anahtar: 'o14|' + g.id + '|' + k.id, kim: ogr(k), metin: doldur('o14', { kisi: k, ad: k.ad, tarih: tarihUzun(g.baslangic), saatte: saatDe(TEORIK_SAAT[g.id] || '18:30'), grup: g.ad.toLocaleLowerCase('tr'), derslik: g.derslik }) }))),
};
// MSJ-016: ilk dört uygulama hakkı dolan, ikinci dört hakkı başlatmamış ve 'istemiyor' denmemiş kursiyere: son sınavdan 30 gün sonra ve son günden 10 gün önce
URET.o17 = ornek => { const l = S.kursiyerler.filter(k => !k.kapali && k.hakBitti && !k.hakBitti.cozuldu && !k.hakBitti.istemiyor && k.hakBitti.tur === 'Direksiyon' && !k.ikinciHak).map(k => ({ k, son: KR.ikinciHakSonGun(k) })).filter(x => x.son && fark(x.son) >= 0);
  return (ornek ? l.slice(0, 1) : l.filter(({ k, son }) => fark(k.hakBitti.tarih) === -30 || fark(son) === 10)).map(({ k, son }) => ({ anahtar: 'o17|' + k.id + '|' + (fark(son) === 10 ? 'son10' : 'g30'), kim: ogr(k), metin: doldur('o17', { kisi: k, ad: k.ad, sonGun: tarihUzun(son), hak: ({ 4: 'dört', 3: 'üç', 5: 'beş', 6: 'altı' })[(S.kurs.sinavHak || 4)] || (S.kurs.sinavHak || 4) }) })); };
// MSJ-015: MEBBİS randevusu doğrulanan (S.mebDurum 'tamam' saatli ya da s.atama) adaya kesin saat, araç ve öğretmen; gece gitmez
URET.o18 = ornek => { if (!ornek && new Date().getHours() >= 21) return [];
  return S.sinavlar.filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0).flatMap(s => (s.kursiyerler || []).map(kursiyer).filter(Boolean).map(k => ({ s, k, sa: adaySinavSaati(s, k) })).filter(x => x.sa.kesin)).slice(0, ornek ? 1 : 1e9)
    .map(({ s, k, sa }) => { const v = (S.mebDurum || {})['sinav-' + s.id + '-' + k.id] || {}, u = KR.sinavUstasi(k), d = S.dersler.filter(y => y.kursiyer === k.id && y.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0], ar = d && S.araclar.find(a => a.id === d.arac);
      return { anahtar: 'o18|' + s.id + '|' + k.id + '|' + sa.saat, kim: ogr(k), metin: doldur('o18', { kisi: k, ad: k.ad, tarih: tarihUzun(s.tarih), saat: sa.saat, saatte: saatDe(sa.saat), plaka: v.plaka || (ar && ar.plaka) || 'kursun aracı', usta: u ? u.ad : 'kursunuz' }) }; }); };
// MSJ-019: teorik dersleri biten, sıradaki e-sınav hakkının ücreti yatmamış kursiyere haftada en çok bir kez (anahtar hafta numarasıyla); MEB hesabı/IBAN yazılmaz
URET.o19 = ornek => { const d = new Date(), hafta = d.getFullYear() + '-' + Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 864e5 + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7);
  const l = TY.yolAdaylari().filter(k => TY.esinavAsamasi(k) === 'ucret');
  return (ornek ? l.slice(0, 1) : l).map(k => ({ anahtar: 'o19|' + k.id + '|' + hafta, kim: ogr(k), metin: doldur('o19', { kisi: k, ad: k.ad, ucret: tl(esinavUcreti(esinavHakDurum(k).sira)) }) })); };
URET.o16 = ornek => { const bg = gun(0).slice(5); const l = S.kursiyerler.filter(k => !k.kapali && k.dogumTarihi && (ornek || k.dogumTarihi.slice(5) === bg)); return (ornek ? l.slice(0, 1) : l).map(k => ({ anahtar: 'o16|' + k.id + '|' + gun(0).slice(0, 4), kim: ogr(k), metin: doldur('o16', { kisi: k, ad: k.ad }) })); };
// Ek ders teklifinin birim ücreti: sınıfa özel ek ders ücreti, yoksa kursun ek ders ücreti, o da yoksa il taban listesindeki ilave ders ücreti; taban altına inmez
const ekDersBirim = sinif => { const f = ekDersFiyat(sinif) || ekDersTabani() || 0, t = ekDersTabani() || 0; return Math.max(f, t); };
URET.o15 = ornek => S.kursiyerler.map(k => ({ k, r: risk(k) })).filter(({ k, r }) => r && r.oneri && (ornek ? r.puan >= 25 : r.puan >= 50) && !k.ekDersTeklif).sort((a, b) => b.r.puan - a.r.puan).map(({ k, r }) => ({ anahtar: 'o15|' + k.id, kim: ogr(k), etki: { tur: 'ekders', k: k.id, n: r.oneri, tutar: r.oneri * ekDersBirim(k.sinif) }, metin: doldur('o15', { kisi: k, ad: k.ad, n: r.oneri, tutar: tl(r.oneri * ekDersBirim(k.sinif)), odak: r.beceri && r.beceri.zayif.length ? '; özellikle ' + r.beceri.zayif.join(', ').toLocaleLowerCase('tr') + ' üzerinde çalışacağız' : '' }) }));
// MSJ-026: anlık yönetici bildirimi — seçili kullanıcılara (yoksa kurs müdürüne), işlemi yapan kişinin kendisi hariç; yalnız WhatsApp hattı bağlıysa
// arka planda gider (hat yokken ön büronun ekranında WhatsApp pencereleri açılmasın). alan: şablon alanları
export function anlikBildirim(id, alan) {
  kurallariHazirla(); const o = kural(id); if (!o || !o.acik || !apiAcik()) return 0;
  const ben = oturum.kullanici && oturum.kullanici.id, l = (o.kime && o.kime.length ? (S.kullanicilar || []).filter(u => o.kime.includes(u.id)) : [{ id: 'mudur', ad: S.kurs.yetkili || 'Kurs müdürü', tel: mudurTel(), rol: 'mudur' }]).filter(u => u.id !== ben && !(u.rol === 'mudur' && oturum.kullanici && oturum.kullanici.rol === 'mudur' && !(o.kime || []).length));
  const metin = doldur(id, alan), liste = l.map(u => ({ ad: u.ad, tel: u.tel || (u.rol === 'mudur' ? mudurTel() : ''), rol: u.rol === 'mudur' ? 'MÜDÜR' : 'ÖN BÜRO', metin, tur: o.ad })).filter(x => x.tel);
  if (liste.length) { waSirali(liste, o.ad, { sessiz: true }); o.gonderim = (o.gonderim || 0) + liste.length; }
  return liste.length;
}
// Mesaj gidince kayda işlenecek sonuç (ör. ek ders teklifi kursiyer ekranında görünür)
function etkiUygula(x) {
  if (!x.etki || x.etki.tur !== 'ekders') return;
  const k = kursiyer(x.etki.k); if (k && !k.ekDersTeklif) { k.ekDersTeklif = { n: x.etki.n, tutar: x.etki.tutar, tarih: gun(0), neden: 'risk' }; islem('Otomatik ek ders teklifi', tamAd(k) + ' · ' + x.etki.n + ' ders'); }
}
// Müdüre akşam özeti: önizleme ve gerçek gönderim aynı metni kullanır
export function aksamOzeti() {
  kurallariHazirla();
  const t = gun(1), bd = S.dersler.filter(d => d.tarih === gun(0)), yd = S.dersler.filter(d => d.tarih === t && d.durum === 'Planlandı').length, ys = S.sinavlar.filter(s => s.tarih === t);
  const gel = S.hareket.filter(h => h.tarih === gun(0) && h.tur === 'Gelir').reduce((a, h) => a + h.tutar, 0), gk = S.kursiyerler.filter(k => gecikenler(k).length), ev = S.kursiyerler.filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet').length;
  const ds = denetimSkoru(), rk = S.kursiyerler.filter(k => { const r = risk(k); return r && r.puan >= 50; }).length;
  const yeni = S.adaylar.filter(a => a.tarih === gun(0)).length, kayit = S.kursiyerler.filter(k => k.kayit === gun(0)).length;
  return doldur('o12', { kurs: S.kurs.ad, tarih: tamTarih(gun(0)), ozet: [
    `Bugün tahsilat: ${tl(gel)}`,
    `Direksiyon: ${bd.filter(d => d.durum === 'Yapıldı').length}/${bd.length} ders yapıldı${bd.some(d => d.durum === 'Gelmedi') ? ', ' + bd.filter(d => d.durum === 'Gelmedi').length + ' gelmedi' : ''}`,
    `Yeni öğrenci: ${yeni} · yeni kayıt: ${kayit}`,
    `Yarın: ${kapaliGun(t) ? 'kurs kapalı (' + kapaliGun(t).toLocaleLowerCase('tr') + ')' : yd + ' direksiyon dersi' + (ys.length ? ', ' + ys.map(s => s.tur + ' sınavı ' + s.saat).join(', ') : '')}`,
    `Geciken taksit: ${gk.length} kursiyer, ${tl(gk.reduce((a, k) => a + gecikenler(k).reduce((x, tk) => x + tk.tutar - (tk.kismi || 0), 0), 0))}`,
    `Eksik evrak: ${ev} kursiyer`,
    `Denetim hazırlığı: %${ds.puan}${ds.kritik ? ' (' + ds.kritik + ' kritik madde)' : ''}`,
    `Sınav riski yüksek: ${rk} kursiyer`,
  ].join('\n') });
}
export const zamanliKural = id => !!URET[id];
// Bugün bu kuraldan kimlere gidecek (henüz gitmemiş olanlar); kurallar sekmesindeki önizleme bunu gösterir
export function gidecekler(id) { kurallariHazirla(); if (!URET[id]) return []; const z = S.zamanli; return URET[id](false).filter(x => x && x.kim).filter(x => !z.gonderilen[x.anahtar]); }

// Şu an zamanı gelmiş, gönderilmemiş mesajlar
export function zamaniGelenler() {
  kurallariHazirla();
  const simdi = new Date().toTimeString().slice(0, 5), z = S.zamanli, l = [];
  S.otomasyonlar.filter(o => o.acik && URET[o.id] && simdi >= SAAT[o.id]).forEach(o => {
    const adaylar = URET[o.id](false).filter(x => x && x.kim).filter(x => !z.gonderilen[x.anahtar] && !z.kuyruk.some(q => q.anahtar === x.anahtar));
    adaylar.forEach(x => l.push({ ...x, kural: o.id }));
  });
  return l;
}
let calisiyor = false;
export async function zamanlayiciCalistir(elle = false) {
  if (calisiyor || !oturum.kullanici || !['mudur', 'sekreter'].includes(oturum.kullanici.rol)) return 0;
  // demo: WhatsApp bu cihazda Ayarlar’dan bilerek bağlanmadıysa saatli mesajlar kendiliğinden gitmez (her yeni cihaz aynı mesajları tekrar atmasın); elle “Şimdi kontrol et” çalışır
  if (S.kurs.waApiVarsayilan && !elle) return 0;
  calisiyor = true;
  try {
    const z = (kurallariHazirla(), S.zamanli), l = zamaniGelenler(), bugun = gun(0);
    let gonderilen = 0;
    try { await planlilariGonder(); } catch (x) { console.error(x); }
    // elle gönderilecekler kuyruğu yalnız bugünün mesajlarını tutar: "yarın dersiniz var" günler sonra gitmesin
    z.kuyruk = (z.kuyruk || []).filter(x => x.gun === bugun);
    for (const x of l) {
      const atla = z.sinir && apiAcik() && ((z.gunluk || {})[bugun + x.kural] || 0) >= 2;
      if (atla) { z.gonderilen[x.anahtar] = bugun; z.kayit.unshift({ zaman: yerelZaman(), kural: x.kural, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, durum: 'demo sınırı' }); continue; }
      if (apiAcik() && !(x.kim && x.kim.kanal)) {
        // gerçek kursta birden çok cihaz açık olabilir: mesajı ilk sahiplenen cihaz gönderir, öbürleri atlar
        if (bulutKanca.sahiplen && !(await bulutKanca.sahiplen('z|' + x.anahtar + '|' + bugun))) continue;  // öbür cihaz gönderdi; kaydı eşitlemeyle gelir
        const s = await apiGonder(etiket(x.kim.ad, x.kim.rol) + x.metin, undefined, undefined, x.kim);
        z.kayit.unshift({ zaman: yerelZaman(), kural: x.kural, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, id: s.id || null, durum: s.ok ? 'gönderildi' : 'hata: ' + s.hata });
        if (s.ok) gonderimEkle(x.kim.ad, x.metin, kural(x.kural).ad, { oto: true });   // MSJ-027: otomatik mesaj da öğrencinin geçmişine
        // gönderilemeyen mesaj öbürlerini durdurmaz; aynı mesaj 3 kez denenince bugünlük bırakılır
        if (!s.ok) { z.hata = z.hata || {}; z.hata[x.anahtar] = (z.hata[x.anahtar] || 0) + 1; if (z.hata[x.anahtar] >= 3) { z.gonderilen[x.anahtar] = bugun; if (!z.kuyruk.some(y => y.anahtar === x.anahtar)) z.kuyruk.push({ ...x, eklendi: yerelZaman(), gun: bugun, hata: s.hata }); } continue; }  // 3 denemede gitmezse elle gönderilecekler listesine düşer
        z.gonderilen[x.anahtar] = bugun; z.gunluk = z.gunluk || {}; z.gunluk[bugun + x.kural] = (z.gunluk[bugun + x.kural] || 0) + 1;
        gonderimEkle(x.kim.ad, x.metin, kural(x.kural).ad); kural(x.kural).gonderim++; gonderilen++; etkiUygula(x);
      } else if (!z.kuyruk.some(y => y.anahtar === x.anahtar)) z.kuyruk.push({ ...x, eklendi: yerelZaman(), gun: bugun });
    }
    // eski kayıtları temizle
    Object.keys(z.gonderilen).forEach(k => { if (fark(z.gonderilen[k]) < -7) delete z.gonderilen[k]; });
    z.kayit = z.kayit.slice(0, 80); z.son = yerelZaman(); kaydet();
    if (gonderilen) bildir(`Zamanlı mesaj: ${gonderilen} mesaj WhatsApp’tan gönderildi ✓`, 'wp');
    else if (elle) bildir(z.kuyruk.length ? `${z.kuyruk.length} zamanlı mesaj gönderilmeyi bekliyor` : 'Şu an zamanı gelen mesaj yok');
    return gonderilen;
  } finally { calisiyor = false; }
}
// API yokken kuyruktakileri sırayla WhatsApp’ta aç
export function kuyruguGonder(sonra) {
  const z = S.zamanli; if (!z || !z.kuyruk.length) return bildir('Bekleyen zamanlı mesaj yok');
  const hepsi = z.kuyruk.slice(), tamam = x => { z.gonderilen[x.anahtar] = gun(0); z.kuyruk = z.kuyruk.filter(q => q.anahtar !== x.anahtar); z.kayit.unshift({ zaman: yerelZaman(), kural: x.kural, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, durum: 'gönderildi' }); kural(x.kural).gonderim++; etkiUygula(x); };
  // PAR-058: e-posta kanalındakiler cihazın e-posta uygulamasıyla tek tek; SMS kanalındakiler sırayla SMS; öbürleri WhatsApp
  const ep = hepsi.filter(x => x.kim.kanal === 'E-posta' && x.kim.eposta), sms = hepsi.filter(x => x.kim.kanal === 'SMS' || (x.kim.kanal === 'E-posta' && !x.kim.eposta)), l = hepsi.filter(x => !ep.includes(x) && !sms.includes(x));
  const epPencere = () => { if (!ep.length) { if (sonra) sonra(); return; } import('./ui.js?v=235').then(u => u.pencere({ baslik: 'E-postayla gidecekler', taslak: false, icerik: `<ul class="liste">${ep.map((x, i) => `<li><div style="flex:1;min-width:0"><b>${u.e(x.kim.ad)}</b><small style="display:block;color:var(--soluk)">${u.e(kural(x.kural).ad)}</small></div><a class="dg dg-cizgi dg-kucuk" data-ep-i="${i}" href="mailto:${encodeURIComponent(x.kim.eposta)}?subject=${encodeURIComponent((S.kurs.ad || '') + ' · ' + kural(x.kural).ad)}&body=${encodeURIComponent(x.metin)}">E-postayı aç</a></li>`).join('')}</ul>`, altlik: '<button class="dg dg-ana" data-kapat>Bitti</button>',
    onAc(p) { p.addEventListener('click', ev => { const a = ev.target.closest('[data-ep-i]'); if (!a) return; const x = ep[+a.dataset.epI]; tamam(x); gonderimEkle(x.kim.ad, x.metin, kural(x.kural).ad + ' (e-posta)'); a.textContent = 'Açıldı ✓'; kaydet(); }); } })); if (sonra) sonra(); };
  const smsSira = () => sms.length ? waSirali(sms.map(x => ({ ad: x.kim.ad, tel: x.kim.tel, rol: x.kim.rol, metin: x.metin, tur: kural(x.kural).ad })), 'SMS ile gidecekler', { kanal: 'SMS', bitince: acilan => { const ac = acilan || new Set(sms.map((x, i) => i)); sms.forEach((x, i) => { if (ac.has(i)) tamam(x); }); kaydet(); epPencere(); } }) : epPencere();
  if (!l.length) return smsSira();
  waSirali(l.map(x => ({ ad: x.kim.ad, tel: x.kim.tel, rol: x.kim.rol, metin: x.metin, tur: kural(x.kural).ad })), 'Zamanı gelen mesajlar', { bitince: acilan => { const ac = acilan || new Set(l.map((x, i) => i)); l.forEach((x, i) => { if (!ac.has(i)) return; tamam(x); }); kaydet(); smsSira(); } });
}
// Demo: bir kuraldan tek örnek mesajı hemen gönder (tarih şartı aranmaz)
export async function ornekGonder(id) {
  kurallariHazirla();
  const x = (URET[id](true) || []).filter(x => x && x.kim)[0];
  if (!x) return bildir('Bu kural için uygun kayıt yok', 'uyari');
  islem('Zamanlı mesaj örneği gönderdi', kural(id).ad);
  if (apiAcik()) { const s = await apiGonder(etiket(x.kim.ad, x.kim.rol) + x.metin, undefined, undefined, x.kim); S.zamanli.kayit.unshift({ zaman: yerelZaman(), kural: id, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, id: s.id || null, durum: s.ok ? 'örnek gönderildi' : 'hata: ' + s.hata }); if (s.ok) etkiUygula(x); kaydet(); return bildir(s.ok ? `“${kural(id).ad}” örneği gönderildi ✓` : s.hata, s.ok ? 'wp' : 'uyari'); }
  waSirali([{ ad: x.kim.ad, tel: x.kim.tel, rol: x.kim.rol, metin: x.metin }], kural(id).ad + ' · örnek');
}
let zamanlayici = null;
export function zamanlayiciBaslat() {
  if (zamanlayici) return;
  setTimeout(() => zamanlayiciCalistir(), 4000);
  zamanlayici = setInterval(() => zamanlayiciCalistir(), 60000);
}
