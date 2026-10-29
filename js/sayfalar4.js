import { S, kaydet, gun, islem, tarihOku, oturum, kapaliGun, SINIFLAR, satistaSiniflar } from './veri.js?v=45';
import { e, ik, rozet, isaret, ekranNotu, sekmeler, olcumler, yonLevhasi, cubukGrafik, halka, pencere, kapatPencere, bildir, sayi, tl, goreli, tarih, apiAcik, apiGonder } from './ui.js?v=45';
import { yenile } from './app.js?v=45';

/* ================= SOSYAL MEDYA ASİSTANI (DengChat modülü) =================
   Gelen kutusu "Mesajlar"da kalır. Bu modül kanalları bağlar, Instagram
   yorumlarını yönetir, asistanın davranışını ayarlar ve sonucunu ölçer. */

const durum = { sekme: 'ozet', kanal: 'igm', deneme: [] };
const KANAL_IK = { igm: 'ig', igy: 'ig', wp: 'wp', fb: 'fb' };
const KANAL_KISA = { igm: 'Instagram', igy: 'Instagram yorum', wp: 'WhatsApp', fb: 'Facebook' };
const ORT_UCRET = 25_000;

const sos = () => S.sosyal;
const bekleyenDevir = () => sos().yorumlar.filter(y => y.durum === 'devir').length + S.devredilen.length;

/* --- Asistanı dene: kurs bilgilerinden cevap (canlıda dil modeli; demo kural tabanlı) --- */
const KURALLAR = [
  { devir: 'saglik', k: /protez|engel|sağlık sorun|ilaç|hastalı|epilep|şeker hast|görme|duyma/i, n: 'Sağlık durumu' },
  { devir: 'sikayet', k: /rezalet|şikayet|memnun değil|berbat|mağdur|dolandır/i, n: 'Şikâyet' },
  { devir: 'indirim', k: /indirim|pazarlık|son fiyat|kardeş|arkadaşla gel|daha ucuz|başka yerde/i, n: 'İndirim pazarlığı' },
  { devir: 'insan', k: /yetkili|insanla|biriyle görüş|müdür|sizi arayayım|telefonla görüş/i, n: 'Yetkili istedi' },
  { bilgi: 'Süre', k: /kaç gün|kaç ay|ne kadar sür|süre|ne zaman biter|hızlı/i },
  { bilgi: 'Sınav ücretleri', k: /sınav ücret|e-?sınav|harç|tekrar sınav/i },
  { bilgi: 'Fiyat ve taksit', k: /fiyat|ücret|kaç para|ne kadar|taksit|peşin|kredi kart/i },
  { bilgi: 'Evraklar', k: /evrak|belge|rapor|fotoğraf|kimlik|ne lazım|neler gerek/i },
  { bilgi: 'Ders saatleri', k: /saat|akşam|hafta ?sonu|cumartesi|pazar|gündüz|çalışıyorum/i },
];
const TEL = /(\+?90|0)?\s*5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/;

const SINIF_SOR = [[/otomatik|otomotik/i, 'B otomatik'], [/motor|a2\b|motosiklet/i, 'A2'], [/kamyon|\bc\b|c sınıf|tır/i, 'C'], [/manuel|düz vites|\bb\b|araba/i, 'B manuel']];
// Fiyat her zaman Ayarlar › Sınıf ve ücretler'den okunur (tek kaynak)
const ETIKET_SINIF = { 'B otomatik': 'B-O', 'B manuel': 'B', 'A2': 'A2', 'C': 'C' };
const fiyatBul = etiket => { const s = SINIFLAR[ETIKET_SINIF[etiket]]; return s && s.aktif && s.ucret ? s.ucret.toLocaleString('tr-TR') + ' TL' : null; };
const fiyatListesi = () => satistaSiniflar().map(([, v]) => v.ad.replace(' · ', ' ') + ' ' + v.ucret.toLocaleString('tr-TR') + ' TL').join(', ');
export function bosSaatler(adet = 3) {
  const sb_ = sos().gorusmeSablon, l = [];
  for (let n = 1; n <= 21 && l.length < adet; n++) {
    const t = gun(n), d = tarihOku(t);
    if (!sb_.gunler.includes(d.getDay()) || sb_.kapali.includes(t) || (kapaliGun(t) && kapaliGun(t) !== 'Pazar')) continue;
    sb_.saatler.forEach(h => { if (l.length < adet && !sos().slotlar.some(x => x.tarih === t && x.saat === h && x.dolu)) l.push({ tarih: t, saat: h }); });
  }
  return l;
}
const bosSlotlar = () => bosSaatler(3);
const slotMetni = x => { const d = tarihOku(x.tarih); return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' ' + x.saat; };
const sessizMi = () => { const b = sos().ayar.bildirim; if (!b.sessiz) return false; const h = new Date().toTimeString().slice(0, 5); return b.sessizBas > b.sessizBit ? (h >= b.sessizBas || h < b.sessizBit) : (h >= b.sessizBas && h < b.sessizBit); };
const beklet = () => sessizMi() ? `Yetkilimize ilettim; sabah ${sos().ayar.bildirim.sessizBit}’den sonra ilk iş size dönecek.` : 'Yetkilimize haber verdim; en geç 30 dakika içinde size dönecek.';
const maskele = t => t.replace(/\b\d{11}\b/g, m => m.slice(0, 2) + '*********').replace(TEL, m => m.replace(/\d(?=(?:\D*\d){2})/g, '*')).replace(/protez|epilepsi|diyabet|şeker hastası|ilaç kullan\w*/gi, '[sağlık bilgisi]');
let bekleyen = null;
// Kursun öğrettiği soru-cevaplar: soruyla anlamlı kelime örtüşmesi olan ilk bilgi (canlıda dil modeli eşleştirir)
const DURAK = new Set(['var', 'yok', 'kadar', 'nedir', 'için', 'ile', 'ben', 'benim', 'ehliyet', 'ehliyetim', 'ehliyeti', 'olur', 'oluyor', 'mısınız', 'misiniz', 'musunuz', 'acaba', 'merhaba', 'fiyat', 'ücret', 'ücreti', 'kaç', 'nasıl', 'sınıf', 'sınıfı', 'bir', 'bu', 'şu', 'mi', 'mı', 'mu', 'veriyor', 'gerekir', 'gerekiyor']);
const kelimeler = t => (t || '').toLocaleLowerCase('tr').replace(/[^a-zçğıöşü0-9]+/g, ' ').split(' ').filter(w => w.length >= 3 && !DURAK.has(w));
function ogretilenBul(soru) {
  const q = new Set(kelimeler(soru)); if (!q.size) return null;
  let en = null, enP = 0;
  S.asistanBilgi.filter(b => b.soru).forEach(b => { const w = kelimeler(b.soru), o = w.filter(x => q.has(x)).length; if (o && (o >= 2 || w.length <= 2) && o > enP) { en = b; enP = o; } });
  return en;
}

function cevapUret(soru, ilk) {
  const a = sos().ayar, kurs = S.kurs.ad;
  const beyan = ilk ? `Merhaba, ben ${kurs} adına yanıt veren yapay zekâ asistanıyım.${a.veri.aydinlatma ? ` (Kişisel verileriniz: ${S.kurs.web || 'kursunuz.com'}/kvkk)` : ''} ` : '';
  const tel = soru.match(TEL);
  if (tel) { bekleyen = null; return { metin: beyan + 'Teşekkürler, numaranızı aldım. Ekibimiz mesai saatinde sizi arayacak. Ön kaydınızı oluşturdum.', kaynak: 'Aday kaydı', aday: tel[0] }; }
  // bekleyen soru: randevu seçimi
  if (bekleyen && bekleyen.tur === 'randevu') {
    const n = (soru.match(/\b([1-3])\b/) || [])[1], sl = n ? bekleyen.slotlar[+n - 1] : bekleyen.slotlar.find(x => soru.includes(x.saat.slice(0, 2)));
    if (sl && !sos().slotlar.some(x => x.tarih === sl.tarih && x.saat === sl.saat && x.dolu)) { { sos().slotlar.push({ tarih: sl.tarih, saat: sl.saat, dolu: 'Deneme müşterisi', kanal: KANAL_KISA[durum.kanal] }); kaydet(); bekleyen = null; return { metin: beyan + `${slotMetni(sl)} için kayıt görüşmenizi ayarladım. Adresimiz ${S.kurs.adres}. Gelirken kimliğinizi getirin; numaranızı yazarsanız bir gün önce hatırlatırız.`, kaynak: 'Kurs takvimi · boş saat ayrıldı' }; } }
  }
  // bekleyen soru: hangi sınıf
  if (bekleyen && bekleyen.tur === 'fiyat') { const s2 = SINIF_SOR.find(([r]) => r.test(soru)); if (s2) { bekleyen = null; const f = fiyatBul(s2[1]); if (f) return { metin: beyan + `${s2[1]} kurs ücretimiz ${f}. Peşinat sonrası 5 aya kadar taksit yapıyoruz. Kayıt görüşmesi için uygun bir gün ayarlayalım mı?`, kaynak: 'Fiyat ve taksit · yalnızca sorulan sınıf' }; } }
  if (/kaç yaş|yaş sınır|17 yaş|16 yaş|yaşındayım/i.test(soru)) return { metin: beyan + `Yaş sınırları: ${satistaSiniflar().map(([, v]) => v.ad.split(' · ')[0] + ' ' + (v.yas || S.kurs.asgariYas)).join(', ')}. Bu yaşı doldurduğunuz gün kaydınızı yapabiliriz; numaranızı yazarsanız o tarihte size hatırlatalım.`, kaynak: 'Ayarlar › Sınıf ve ücretler: asgari yaş' };
  if (a.randevu && /kayda gel|kaydolmaya gel|görüşme|uğra|randevu|gelip kaydol|yüz yüze|ne zaman gel/i.test(soru)) {
    const sl = bosSlotlar();
    if (sl.length) { bekleyen = { tur: 'randevu', slotlar: sl }; return { metin: beyan + 'Kayıt görüşmesi için takvimimizdeki boş saatler: ' + sl.map((x, i) => `${i + 1}) ${slotMetni(x)}`).join(', ') + '. Hangisi size uygun?', kaynak: 'Kurs takvimi · yalnızca boş saatler' }; }
  }
  { const b = ogretilenBul(soru); if (b) return { metin: beyan + b.metin, kaynak: 'Kursun öğrettiği cevap · ' + b.konu }; }
  for (const r of KURALLAR) {
    if (!r.k.test(soru)) continue;
    if (r.devir) {
      if (!a.devir[r.devir]) continue;
      return { metin: beyan + 'Bu konuyu kurs yetkilimizin cevaplaması daha doğru olur. ' + (a.bildirim.bekletme ? beklet() : 'Telefon numaranızı yazarsanız sizi arayalım.'), kaynak: 'Size devredildi · ' + r.n, devir: r.n };
    }
    if (r.bilgi === 'Fiyat ve taksit' && a.fiyat !== 'liste') {
      if (a.fiyat === 'telefon') return { metin: beyan + 'Ücretlerimizi taksit seçenekleriyle birlikte telefonda detaylı anlatalım. Numaranızı yazar mısınız?', kaynak: 'Fiyat politikası: telefonda' };
      const s2 = SINIF_SOR.find(([rx]) => rx.test(soru)), f = s2 && fiyatBul(s2[1]);
      if (f) return { metin: beyan + `${s2[1]} kurs ücretimiz ${f}. Peşinat sonrası 5 aya kadar taksit yapıyoruz.`, kaynak: 'Fiyat ve taksit · yalnızca sorulan sınıf' };
      bekleyen = { tur: 'fiyat' };
      return { metin: beyan + 'Hangi ehliyet için soruyorsunuz: otomatik, manuel, motosiklet (A2) ya da kamyon (C)?', kaynak: 'Fiyat politikası: önce sınıfı sor' };
    }
    if (r.bilgi === 'Fiyat ve taksit') return { metin: beyan + 'Kurs ücretlerimiz: ' + fiyatListesi() + '. Peşinat sonrası 5 aya kadar taksit yapıyoruz.', kaynak: 'Ayarlar › Sınıf ve ücretler' };
    const b = S.asistanBilgi.find(x => x.konu === r.bilgi);
    if (b) return { metin: beyan + b.metin, kaynak: b.konu };
  }
  if (/merhaba|selam|iyi günler|iyi akşamlar/i.test(soru) && soru.length < 25) return { metin: (ilk ? beyan : 'Merhaba! ') + 'Kurs ücreti, evraklar, ders saatleri ya da kayıtla ilgili ne sormak istersiniz?', kaynak: 'Karşılama' };
  if (!denemede) { const l = sos().bilinmeyen, v = l.find(x => x.soru.toLocaleLowerCase('tr') === soru.toLocaleLowerCase('tr')); if (v) { v.sayi++; v.son = gun(0); } else l.unshift({ soru, sayi: 1, son: gun(0) }); kaydet(); }
  if (a.devir.bilinmeyen) return { metin: beyan + 'Bu konuda elimde kesin bilgi yok, yanlış bilgi vermek istemem. ' + (a.bildirim.bekletme ? beklet() : 'Kurs sizi arayacak.'), kaynak: 'Bilinmeyen soru · size devredildi, “Bilemedikleri”ne eklendi', devir: 'Bilinmeyen soru' };
  return { metin: beyan + 'Bu konuda elimde kesin bilgi yok. Kurs bilgilerine eklenirse hemen cevaplayabilirim.', kaynak: 'Bilinmeyen soru' };
}

/* --- Sekmeler --- */
function ozet() {
  const a = sos().ay, k = sos().kanalDagilim;
  const ciro = a.kayit * ORT_UCRET;
  const saat = sos().saatlik.map((v, i) => ({ e: i % 3 === 0 ? String(i).padStart(2, '0') : '', v, vurgu: i < 9 || i >= 19 }));
  const sonAday = S.adaylar.filter(x => ['Instagram'].includes(x.kanal) || x.kaynak === 'Instagram').slice(0, 5);
  return `${olcumler([
    ['Bu ay gelen mesaj', sayi(a.mesaj), sayi(a.kisi) + ' kişiden'],
    ['Asistanın cevapladığı', '%' + a.otomatik, 'Kalanı size devredildi'],
    ['İlk cevap', a.sure + ' sn', 'Gece dahil, ortalama'],
    ['Mesai dışında gelen', '%' + a.mesaiDisi, '19:00–09:00 arası'],
  ])}
  <div class="ara-bosluk"></div>
  <div class="izgara iz-21">
    <div class="kart"><div class="kart-bas"><h3>Mesajlar hangi saatte geliyor?</h3><small>Bu ay, saat başına · koyu çubuklar mesai dışı</small></div><div class="kart-govde">${cubukGrafik(saat, { yukseklik: 170 })}
      <p style="margin-top:10px;font-size:14px">Mesajların en yoğun olduğu saat <b>21:00</b>. Kurs kapalıyken gelen ${sayi(Math.round(a.mesaj * a.mesaiDisi / 100))} mesajın hepsine ortalama ${a.sure} saniyede cevap verildi.</p></div></div>
    <div class="kart"><div class="kart-bas"><h3>Kanallar</h3><small>Bu ayki mesajlar</small></div><div class="kart-govde" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
      ${halka([{ v: k.igm, renk: '#0a4da2' }, { v: k.igy, renk: '#f2b705' }, { v: k.wp, renk: '#1f7a3e' }, { v: k.fb, renk: '#767c84' }], { boyut: 120, kalinlik: 16, orta: `<b class="mono">${sayi(a.mesaj)}</b>` })}
      <ul style="list-style:none;font-size:14px;display:grid;gap:6px">${[['igm', '#0a4da2'], ['igy', '#f2b705'], ['wp', '#1f7a3e'], ['fb', '#767c84']].map(([id, r]) => `<li style="display:flex;gap:8px;align-items:center"><i style="width:12px;height:12px;border-radius:3px;background:${r}"></i>${KANAL_KISA[id]} <b class="mono" style="margin-left:auto">%${k[id]}</b></li>`).join('')}</ul></div></div>
  </div>
  <div class="ara-bosluk"></div>
  <div class="izgara iz-2">
    <div>${yonLevhasi([
      ['Sohbet başlatan', sayi(a.kisi), '#/mesajlar', 'Instagram, WhatsApp, yorumlar'],
      ['Aday kaydı açılan', sayi(a.aday), '#/adaylar', 'Telefonunu veya kayıt niyetini bıraktı'],
      ['Kayıt görüşmesine gelen', sayi(a.gorusme), '#/adaylar', 'Asistanın ayarladığı randevular'],
      ['Kaydolan', sayi(a.kayit), '#/kursiyerler', 'Yaklaşık ' + tl(ciro) + ' kurs ücreti'],
    ], 'Sosyal medyadan kayda · bu ay')}</div>
    <div class="kart"><div class="kart-bas"><h3>Sosyal medyadan son adaylar</h3><a class="sag dg dg-cizgi dg-kucuk" href="#/adaylar">Tümü</a></div><ul class="liste" style="margin-top:8px">${sonAday.map(x => `<li><a class="kisi" href="#/adaylar/${x.id}" style="flex:1;min-width:0"><div style="min-width:0"><b>${e(x.ad)}</b><small style="display:block;color:var(--soluk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">“${e(x.mesajlar[0].metin)}”</small></div></a><span class="sag">${rozet(x.asama, x.asama === 'Kayıt' ? 'yesil' : 'mavi')}</span></li>`).join('')}</ul>
      <div style="padding:4px 20px 18px"><a class="dg dg-hafif dg-kucuk" href="#/sosyal/devir">${isaret('uyari', 18)}Size devredilen ${bekleyenDevir()} konuşma</a></div></div>
  </div>`;
}

function kanallar() {
  const l = sos().kanallar;
  return `<div class="izgara iz-2">${l.map(c => `<div class="kart"><div class="kart-bas" style="padding-bottom:4px">${isaret(c.bagli ? 'tamam' : 'uyari', 26)}<div><h3 style="display:flex;gap:6px;align-items:center">${ik(KANAL_IK[c.id])}${e(c.ad)}</h3><small>${c.bagli ? e(c.hesap) + (c.son ? ' · son mesaj ' + e(c.son) : '') : 'Bağlı değil'}</small></div>
      <span class="sag">${c.bagli ? rozet('Bağlı', 'yesil') : `<button class="dg dg-ana dg-kucuk" data-bagla="${c.id}">Bağla</button>`}</span></div>
    ${c.bagli ? `<div class="kart-govde" style="display:grid;gap:12px">
      <label style="display:flex;align-items:center;gap:12px"><span class="anahtar"><input type="checkbox" data-cevap="${c.id}" ${c.cevap ? 'checked' : ''} aria-label="${e(c.ad)} asistan cevaplasın"><i></i></span><span><b style="color:var(--murekkep)">Asistan cevaplasın</b><small style="display:block;color:var(--soluk)">${c.id === 'igy' ? 'Fiyat gibi kişisel sorularda yoruma kısa davet, cevap özelden' : 'Kapalıyken mesajlar yalnızca gelen kutusuna düşer'}</small></span></label>
      <div><span class="et" style="font-size:13px;font-weight:700;color:var(--soluk)">Ne zaman?</span><div class="secim" style="margin-top:6px">${['7/24', 'Mesai dışı'].map(m => `<label><input type="radio" name="mod-${c.id}" value="${m}" data-mod="${c.id}" ${c.mod === m ? 'checked' : ''}><span>${m === '7/24' ? 'Her zaman' : 'Yalnızca mesai dışında'}</span></label>`).join('')}</div></div>
      ${c.id === 'wp' ? `<div><span class="et" style="font-size:13px;font-weight:700;color:var(--soluk)">Numara</span><div class="secim" style="margin-top:6px">${[[true, 'Telefondaki uygulama da açık kalsın'], [false, 'Ayrı numara kullan']].map(([v, t]) => `<label><input type="radio" name="wp-num" value="${v}" data-wp-num ${!!c.birlikte === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div><small style="display:block;color:var(--soluk);font-size:12.5px;margin-top:6px">${c.birlikte ? 'Meta’nın birlikte kullanım özelliğiyle mesajlar hem ön bürodaki WhatsApp Business uygulamasında hem Sinyal’de görünür; sekreter telefondan yazmaya devam eder.' : 'Asistan için ayrı bir hat açılır; kursun bilinen numarası telefonda olduğu gibi kalır.'}</small></div>` : ''}
      <div class="saglik">${saglik(c)}</div>
    </div>` : `<div class="kart-govde"><p style="font-size:14px">Bağlandığında bu kanaldan gelen mesajlar da aynı asistanla ve aynı kurs bilgileriyle cevaplanır.</p></div>`}</div>`).join('')}</div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Hesabınızı koruma</h3><small>Meta otomasyon şüphesi gördüğü hesapları kısıtlayabilir</small></div><ul class="liste" style="margin-top:8px">${[
    ['tamam', 'Yalnızca gelen mesaja cevap verir', 'Takip etmez, beğenmez, kimseye ilk mesajı atmaz, toplu mesaj göndermez. Hesabınızda insan dışı “etkinlik” oluşmaz.'],
    ['tamam', 'Meta uyarısında kendini durdurur', 'Hesaba kısıtlama ya da uyarı gelirse asistan o kanalda hemen susar, size bildirim gelir; mesajlar kaybolmaz, gelen kutusuna düşer.'],
    ['tamam', 'Resmî bağlantı', 'Meta’nın izin verdiği resmî bağlantıyla çalışır; şifreniz ve hesabınızın oturumu Sinyal’de değildir.'],
  ].map(([t, b, a]) => `<li style="align-items:flex-start">${isaret(t, 22)}<div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div></li>`).join('')}
    <li style="align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-hiz ${sos().ayar.hizSiniri ? 'checked' : ''} aria-label="Hız sınırı"><i></i></span><div><b style="color:var(--murekkep);display:block">Hız sınırı</b><small style="color:var(--metin);font-size:13.5px">Dakikada en fazla 20 cevap; yeni bağlanan hesaplarda ilk hafta yarı hızda. Kampanya günü yoğunluğunda bile hesap doğal görünür.</small></div></li></ul></div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Kurulum nasıl oluyor?</h3><small>Kurulumu biz yapıyoruz, yaklaşık 30 dakika</small></div><ul class="liste" style="margin-top:8px">${[
    ['zorunlu', 'Hesaplar sizin kalır', 'Instagram ve Facebook hesaplarınıza şifrenizi bize vermeden, Meta’nın kendi giriş ekranından izin verirsiniz.'],
    ['zorunlu', 'Kursa özel bağlantı', 'Her kurs için ayrı Meta uygulaması kurulur; başka bir işletmenin onay sürecini beklemezsiniz.'],
    ['zorunlu', 'Asistan kendini tanıtır', 'İlk mesajda yapay zekâ olduğunu söyler. Meta kuralı gereği bu kapatılamaz.'],
    ['bilgi', 'İstediğiniz an siz yazarsınız', 'Telefonunuzdan cevap yazdığınızda asistan o konuşmada susar (Kurallar sekmesinde süre ayarlanır).'],
  ].map(([t, b, a]) => `<li style="align-items:flex-start">${isaret(t, 22)}<div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div></li>`).join('')}</ul></div>`;
}

function saglik(c) {
  const once = c.izin ? -Math.round((tarihOku(c.izin) - tarihOku(gun(0))) / 864e5) : null;
  const kalan = once != null ? 50 - once : null;
  const iyi = c.sonCevapDk != null && c.sonCevapDk < 120 && kalan > 7;
  return `<div style="display:flex;gap:10px;align-items:flex-start;background:var(--panel-2);border-radius:8px;padding:10px 12px">${isaret(iyi ? 'tamam' : 'uyari', 20)}<div style="flex:1;font-size:13.5px"><b style="color:var(--murekkep)">Bağlantı ${iyi ? 'sağlıklı' : 'kontrol edilmeli'}</b><br>
    Son başarılı cevap: ${c.sonCevapDk == null ? '—' : c.sonCevapDk === 0 ? 'az önce' : c.sonCevapDk + ' dk önce'} · Erişim izni ${once} gün önce yenilendi; otomatik yenileme açık, sonraki ${kalan} gün sonra.<br><span style="color:var(--soluk)">Yenileme başarısız olursa 7 gün önceden size bildirim gelir; asistan 2 saat cevap veremezse WhatsApp’tan haber verilir.</span></div><button class="dg dg-cizgi dg-kucuk" data-test-kanal="${c.id}">Test et</button></div>`;
}
const YORUM_DURUM = {
  dm: ['Yoruma davet + özelden cevap', 'mavi'],
  acik: ['Herkese açık cevaplandı', 'yesil'],
  devir: ['Size devredildi', 'kirmizi'],
  gizli: ['Gizlendi · reklam', 'notr'],
  onay: ['Reklam şüphesi · onayınızı bekliyor', 'sari'],
};
function yorumlar() {
  const g = sos().gonderiler, y = sos().yorumlar;
  return `${olcumler([
    ['Bu hafta yorum', sayi(y.length), 'Son 3 gönderi'],
    ['Cevaplanan', sayi(y.filter(x => x.cevap).length), 'Ortalama 4 dk içinde'],
    ['Özelden devam eden', sayi(y.filter(x => x.durum === 'dm').length), 'Fiyat ve kişisel sorular'],
    ['Size kalan', sayi(y.filter(x => x.durum === 'devir').length), 'Şikâyetler asistana bırakılmaz'],
  ])}<div class="ara-bosluk"></div>
  ${g.map(p => {
    const ly = y.filter(x => x.gonderi === p.id);
    return `<div class="kart gonderi-kart" data-gonderi>
      <figure style="margin:0;background:#000"><img src="${p.gorsel}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;aspect-ratio:4/5;display:block"></figure>
      <div style="min-width:0"><div class="kart-bas" style="padding-bottom:6px"><div style="min-width:0"><b style="color:var(--murekkep)">${e(p.metin)}</b><small style="display:block">${goreli(gun(p.gun))} · ${sayi(p.begeni)} beğeni · ${ly.length} yorum</small></div></div>
      <ul class="liste">${ly.map(x => `<li style="align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:200px"><b style="color:var(--murekkep)">${e(x.kim)}</b> <span>${e(x.metin)}</span><small style="display:block;color:var(--soluk)">${goreli(gun(x.gun))} ${x.saat}</small>
        ${x.cevap ? `<div style="margin-top:6px;padding:6px 10px;background:#fff;border-left:3px solid var(--levha);border-radius:0 6px 6px 0;font-size:13.5px">${ik('robot')} ${e(x.cevap)}</div>` : ''}</div>
        <span class="sag" style="flex-wrap:wrap">${rozet(...YORUM_DURUM[x.durum])}${x.durum === 'devir' ? `<button class="dg dg-ana dg-kucuk" data-yorum-cevap="${x.id}">Cevapla</button>` : ''}${x.durum === 'gizli' ? `<button class="dg dg-cizgi dg-kucuk" data-yorum-goster="${x.id}">Göster</button>` : ''}${x.durum === 'onay' ? `<button class="dg dg-ana dg-kucuk" data-yorum-gizle="${x.id}">Gizle</button><button class="dg dg-cizgi dg-kucuk" data-yorum-birak="${x.id}">Görünür bırak</button>` : ''}</span></li>`).join('')}</ul></div></div>`;
  }).join('')}`;
}

function dene() {
  const ilkSoru = ['Fiyat ne kadar?', 'Otomatik', 'Hangi evraklar lazım?', 'Akşam dersi var mı?', 'Kayda gelmek istiyorum', '2', '17 yaşındayım kaydolabilir miyim?', 'Üç kardeş gelirsek indirim olur mu?', 'Sol ayağımda protez var', 'Numaram 0532 111 22 33'];
  const mesajlar = durum.deneme;
  const kanal = durum.kanal;
  return `${ekranNotu('Asistanı müşteri gibi deneyin. Cevaplar yalnızca “Mesajlar › Asistanın bildikleri” sayfasındaki onaylı bilgilerden gelir; bilmediği soruyu uydurmaz, size devreder.')}
  <div class="kart" style="overflow:hidden"><div class="sohbet dene-sohbet">
    <div class="sohbet-liste dene-yan">
      <b style="color:var(--murekkep);font-size:13px;letter-spacing:.06em;text-transform:uppercase">Kanal</b>
      <div class="secim">${['igm', 'wp', 'fb'].map(c => `<label><input type="radio" name="dene-kanal" value="${c}" data-dene-kanal ${kanal === c ? 'checked' : ''}><span>${ik(KANAL_IK[c])}${KANAL_KISA[c]}</span></label>`).join('')}</div>
      <b style="color:var(--murekkep);font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin-top:6px">Hazır sorular</b>
      ${ilkSoru.map(q => `<button class="dg dg-cizgi dg-kucuk" style="justify-content:flex-start;text-align:left;height:auto;min-height:34px;padding:6px 10px;white-space:normal;line-height:1.3" data-hazir="${e(q)}">${e(q)}</button>`).join('')}
      <button class="dg dg-hafif dg-kucuk" style="margin-top:auto" data-dene-sifirla>${ik('sifirla')}Sohbeti temizle</button>
    </div>
    <div class="sohbet-pencere"><div class="sohbet-ust">${ik(KANAL_IK[kanal])}<div><b style="color:var(--murekkep)">${e(S.kurs.ad)}</b><small style="display:block;color:var(--soluk);font-size:12px">${KANAL_KISA[kanal]} · ${e(sos().ayar.ad)} · yapay zekâ</small></div></div>
      <div class="sohbet-akis" style="min-height:380px">${mesajlar.length ? mesajlar.map((m, mi) => m.kim === 'not' ? `<p class="ipucu" style="margin:6px 0;font-size:13px">${isaret('bilgi', 18)}<span>${e(m.metin)}</span></p>` : `<div class="balon ${m.kim === 'asistan' ? '' : 'giden'} ${m.taslak ? 'taslak' : ''}" style="${m.kim === 'asistan' ? '' : 'background:#e2eaf5'}">${m.taslak ? `<b class="taslak-et">Taslak · müşteriye gitmedi, onayınızı bekliyor</b>` : ''}${e(m.metin)}${m.taslak ? `<span style="display:flex;gap:6px;margin-top:8px"><button class="dg dg-ana dg-kucuk" data-taslak-onay="${mi}">Onayla, gönder</button><button class="dg dg-cizgi dg-kucuk" data-taslak-duzenle="${mi}">Düzenle</button></span>` : ''}${m.kim === 'asistan' ? `<small>${ik('robot')} ${e(m.kaynak)}</small>` : `<small>Müşteri${m.model ? ' · modele giden: ' + e(m.model) : ''}</small>`}</div>`).join('') : `<div style="margin:auto;text-align:center;color:var(--soluk);max-width:320px">${isaret('bilgi', 34)}<p style="margin-top:10px">Hazır sorulardan birine dokunun ya da müşteri gibi yazın.</p></div>`}</div>
      <form class="sohbet-yaz" data-dene><input class="girdi" name="m" placeholder="Müşteri gibi yazın…" aria-label="Deneme mesajı" autocomplete="off"><button class="dg dg-ana" type="submit">${ik('gonder')}Gönder</button></form></div>
  </div></div>`;
}

function kurallar() {
  const a = sos().ayar;
  const satir = (anah, b, alt) => `<li style="align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-devir-ayar="${anah}" ${a.devir[anah] ? 'checked' : ''} aria-label="${e(b)}"><i></i></span><div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${alt}</small></div></li>`;
  return `<div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>Asistanın kimliği</h3></div><div class="kart-govde"><form class="form-izgara" data-kimlik>
      <div class="alan tam"><label for="as-ad">Asistanın adı</label><input id="as-ad" class="girdi" name="ad" value="${e(a.ad)}" maxlength="40"></div>
      <div class="alan tam"><span class="et">Konuşma tonu</span><div class="secim">${['Samimi', 'Resmi'].map(t => `<label><input type="radio" name="ton" value="${t}" ${a.ton === t ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <label class="tam" style="display:flex;align-items:center;gap:12px;font-size:14.5px"><span class="anahtar"><input type="checkbox" name="emoji" ${a.emoji ? 'checked' : ''}><i></i></span><span>Emoji kullanabilir</span></label>
      <label class="tam" style="display:flex;align-items:center;gap:12px;font-size:14.5px;opacity:.75"><span class="anahtar"><input type="checkbox" checked disabled><i></i></span><span>İlk mesajda yapay zekâ olduğunu söyler <small style="display:block;color:var(--soluk)">Meta kuralı, kapatılamaz</small></span></label>
      <div class="tam"><button class="dg dg-ana" type="submit">Kaydet</button></div></form></div></div>
    <div class="kart"><div class="kart-bas"><h3>Ne zaman size devreder?</h3><small>Devredilen konuşmada asistan susar, size bildirim gelir</small></div><ul class="liste" style="margin-top:8px">
      ${satir('indirim', 'İndirim ve pazarlık', 'Kurs bilgisindeki indirimler dışında fiyat sözü vermez.')}
      ${satir('sikayet', 'Şikâyet ve kızgın müşteri', 'Yorumda da DM’de de cevabı siz yazarsınız.')}
      ${satir('saglik', 'Sağlık ve özel durum', 'Protez, ilaç, engel durumu gibi sorular.')}
      ${satir('insan', 'Yetkiliyle görüşmek isteyen', '“Biriyle konuşabilir miyim?” dendiğinde.')}
      ${satir('bilinmeyen', 'Bilmediği soru', 'Kapalıysa yalnızca “bilmiyorum” der, size bildirim gelmez.')}
    </ul>
    <div class="kart-govde" style="border-top:1px solid var(--cizgi-2)"><b style="color:var(--murekkep)">Siz yazınca asistan ne kadar sussun?</b><div class="secim" style="margin-top:8px">${[6, 12, 24, 48].map(h => `<label><input type="radio" name="susma" value="${h}" data-susma ${a.susma === h ? 'checked' : ''}><span>${h} saat</span></label>`).join('')}</div>
      <p style="font-size:13.5px;color:var(--soluk);margin-top:8px">Telefonunuzdan bir müşteriye cevap yazdığınızda asistan o konuşmaya bu süre boyunca karışmaz.</p></div></div>
  </div>
  <div class="ara-bosluk"></div>
  <div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>Fiyat ve randevu</h3><small>Asistanın söz verebileceği şeyler</small></div><div class="kart-govde" style="display:grid;gap:14px">
      <div><b style="color:var(--murekkep)">Fiyat sorulunca</b><div class="secim" style="margin-top:8px">${[['sorulan', 'Yalnızca sorulan sınıfın fiyatı'], ['liste', 'Tüm fiyat listesi'], ['telefon', 'Fiyatı telefonda söyleriz']].map(([v, t]) => `<label><input type="radio" name="fiyat" value="${v}" data-fiyat ${a.fiyat === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <label style="display:flex;gap:12px;align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-randevu ${a.randevu ? 'checked' : ''}><i></i></span><span><b style="color:var(--murekkep)">Kayıt görüşmesi ayarlayabilir</b><small style="display:block;color:var(--soluk)">Yalnızca takvimdeki boş saatleri önerir; aynı saate iki kişi yazılmaz. Boş saat: ${sos().slotlar.filter(x => !x.dolu).length}, dolu: ${sos().slotlar.filter(x => x.dolu).length}.</small></span></label>
      <div><b style="color:var(--murekkep)">Cevaplar nasıl gitsin?</b><div class="secim" style="margin-top:8px">${[['otomatik', 'Doğrudan gönder'], ['karisik', 'Fiyat ve randevuyu önce bana göster'], ['taslak', 'Her cevabı önce bana göster']].map(([v, t]) => `<label><input type="radio" name="onaymodu" value="${v}" data-onay-modu ${a.onayModu === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div><small style="display:block;color:var(--soluk);margin-top:6px">İlk haftalarda “önce bana göster” ile başlayıp asistana güvendikçe açabilirsiniz.</small></div>
      <div style="font-size:13.5px;color:var(--metin);background:var(--panel-2);border-radius:8px;padding:10px 12px"><b>Asla söz vermez:</b> indirim, kesin sınav tarihi, “kesin geçersiniz” gibi garanti, belgede olmayan bilgi.</div></div></div>
    <div class="kart"><div class="kart-bas"><h3>Kişisel veriler (KVKK)</h3><small>Asistana yazılanlar nerede işlenir?</small></div><div class="kart-govde" style="display:grid;gap:14px">
      <div class="secim">${[['tr', 'Türkiye’deki sunucuda çalışan model'], ['ab', 'AB’deki model (yurt dışı aktarım)']].map(([v, t]) => `<label><input type="radio" name="konum" value="${v}" data-veri-konum ${a.veri.konum === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <small style="color:var(--soluk);font-size:13px;margin-top:-6px">${a.veri.konum === 'tr' ? 'Konuşmalar yurt dışına aktarılmaz; ayrıca açık rıza gerekmez.' : 'KVKK’nın yurt dışı aktarım kuralı gereği standart sözleşme Kurul’a bildirilir ve aydınlatma metninde yazılır; ek ücret yok.'}</small>
      <label style="display:flex;gap:12px;align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-maskele ${a.veri.maskele ? 'checked' : ''}><i></i></span><span><b style="color:var(--murekkep)">Hassas bilgiyi modele göndermeden gizle</b><small style="display:block;color:var(--soluk)">TC kimlik no, telefon ve sağlık ifadeleri yıldızlanır. “Asistanı dene”de gizlenmiş hâlini görebilirsiniz.</small></span></label>
      <label style="display:flex;gap:12px;align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-aydinlatma ${a.veri.aydinlatma ? 'checked' : ''}><i></i></span><span><b style="color:var(--murekkep)">İlk mesajda aydınlatma metni bağlantısı</b><small style="display:block;color:var(--soluk)">Kişi, verilerinin neden işlendiğini ve haklarını görür.</small></span></label>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="color:var(--murekkep);font-size:14px">Konuşmaları sakla:</b><div class="secim">${[6, 12, 24].map(n => `<label><input type="radio" name="saklama" value="${n}" data-saklama ${a.veri.saklamaAy === n ? 'checked' : ''}><span>${n} ay</span></label>`).join('')}</div></div>
      <p style="font-size:13.5px;color:var(--metin);background:var(--panel-2);border-radius:8px;padding:10px 12px"><b>Model:</b> ${e(a.model || 'Sinyal Asistan TR')}${a.veri.konum === 'tr' ? ' · Türkiye’deki sunucuda barındırılan açık kaynaklı dil modeli' : ' · AB’deki sunucuda çalışan model'}. İnternete çıkmaz; yalnızca “Asistanın bildikleri” ve kurs takvimini kullanır. Türkçe sürücü kursu konuşmalarıyla sınanmıştır; “Asistanı dene” sekmesinden kendiniz de sınayabilirsiniz.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-cizgi dg-kucuk" data-belge-ac="vis">Veri işleme sözleşmesi</button><button class="dg dg-cizgi dg-kucuk" data-belge-ac="aydinlatma">Asistan aydınlatma metni</button></div></div></div>
  </div>
  <div class="ara-bosluk"></div>
  <div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>Devredince size nasıl haber verilsin?</h3></div><div class="kart-govde" style="display:grid;gap:14px">
      <div><b style="color:var(--murekkep)">Kime</b><div class="secim" style="margin-top:8px">${S.kullanicilar.filter(u => u.rol !== 'usta').map(u => `<label><input type="checkbox" value="${u.id}" data-bildirim-kisi ${a.bildirim.kisiler.includes(u.id) ? 'checked' : ''}><span>${e(u.ad)}</span></label>`).join('')}</div><small style="display:block;color:var(--soluk);margin-top:6px">Sıra önemli: önce ilk kişiye gider, cevaplanmazsa sıradakine.</small></div>
      <div><b style="color:var(--murekkep)">Nereden</b><div class="secim" style="margin-top:8px">${['WhatsApp', 'SMS'].map(v => `<label><input type="radio" name="bkanal" value="${v}" data-bildirim-kanal ${a.bildirim.kanal === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div></div>
      <div><b style="color:var(--murekkep)">Cevaplanmazsa sıradakine</b><div class="secim" style="margin-top:8px">${[10, 15, 30].map(n => `<label><input type="radio" name="ikinci" value="${n}" data-ikinci ${a.bildirim.ikinciDk === n ? 'checked' : ''}><span>${n} dk sonra</span></label>`).join('')}</div></div>
      <div><label style="display:flex;gap:12px;align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-sessiz ${a.bildirim.sessiz ? 'checked' : ''}><i></i></span><span><b style="color:var(--murekkep)">Gece rahatsız etme</b><small style="display:block;color:var(--soluk)">Bu saatlerde bildirim gitmez, sabah topluca gelir; müşteriye de “sabah ilk iş dönülecek” denir.</small></span></label>
        <div style="display:flex;gap:8px;align-items:center;margin:8px 0 0 54px;font-size:14px"><input class="girdi" type="time" data-sessiz-bas value="${a.bildirim.sessizBas}" style="width:110px;height:34px"> – <input class="girdi" type="time" data-sessiz-bit value="${a.bildirim.sessizBit}" style="width:110px;height:34px"></div></div>
      <label style="display:flex;gap:12px;align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-bekletme ${a.bildirim.bekletme ? 'checked' : ''}><i></i></span><span><b style="color:var(--murekkep)">Müşteriyi bekletme mesajıyla oyala</b><small style="display:block;color:var(--soluk)">“Yetkilimize haber verdim; en geç 30 dakika içinde size dönecek.” Müşteri cevapsız kalmaz.</small></span></label></div></div>
    <div class="kart"><div class="kart-bas"><h3>Instagram yorumları</h3></div><div class="kart-govde" style="display:grid;gap:14px">
      <label style="display:flex;gap:12px;align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-gizle-onay ${a.gizleOnay ? 'checked' : ''}><i></i></span><span><b style="color:var(--murekkep)">Reklam şüpheli yorumu gizlemeden önce bana sor</b><small style="display:block;color:var(--soluk)">Gerçek bir müşterinin yorumu yanlışlıkla gizlenmez. Bekleyenler her akşam 19:00’da tek özet olarak gelir.</small></span></label>
      <p style="font-size:13.5px;color:var(--metin)">Şikâyet içeren yorumlara asistan hiç cevap yazmaz, size bırakır.</p></div></div>
  </div>
  <div class="ara-bosluk"></div>
  ${gorusmeKarti()}
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Asistanın bildikleri</h3><small>Fiyat, evrak, ders saatleri…</small><a class="sag dg dg-cizgi dg-kucuk" href="#/mesajlar/bilgi">Bilgileri düzenle</a></div>
    <ul class="liste" style="margin-top:8px">${S.asistanBilgi.map(b => `<li>${isaret('tamam', 20)}<b style="color:var(--murekkep);min-width:130px">${e(b.konu)}</b><small style="color:var(--metin);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1">${e(b.metin)}</small></li>`).join('')}</ul></div>`;
}

const GUN_AD = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
function gorusmeKarti() {
  const g = sos().gorusmeSablon, dolu = sos().slotlar.filter(x => x.dolu).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const SAAT = ['09:00', '10:00', '11:30', '13:00', '14:00', '15:30', '16:30', '18:00'];
  return `<div class="kart"><div class="kart-bas"><h3>Kayıt görüşmesi saatleri</h3><small>Asistan yalnızca buradaki boş saatleri önerir</small></div><div class="izgara iz-2" style="gap:0">
    <div class="kart-govde" style="display:grid;gap:14px">
      <div><b style="color:var(--murekkep)">Günler</b><div class="secim" style="margin-top:8px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" value="${d}" data-gun-tog ${g.gunler.includes(d) ? 'checked' : ''}><span>${GUN_AD[d]}</span></label>`).join('')}</div></div>
      <div><b style="color:var(--murekkep)">Saatler</b><div class="secim" style="margin-top:8px">${SAAT.map(h => `<label><input type="checkbox" ${g.saatler.includes(h) ? 'checked' : ''} data-saat-tog="${h}"><span>${h}</span></label>`).join('')}</div></div>
      <div><b style="color:var(--murekkep)">Kapalı günler</b> <small style="color:var(--soluk)">(izin, tatil; resmî bayramlar zaten kapalı)</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">${g.kapali.map(t => `<span class="rozet rozet-notr">${tarih(t)} <button data-kapali-sil="${t}" aria-label="Kaldır" style="margin-left:4px">×</button></span>`).join('')}<input class="girdi" type="date" data-kapali-ekle style="width:160px;height:34px"></div></div>
      <small style="color:var(--soluk)">Sıradaki boş saatler: ${bosSaatler(3).map(x => tarih(x.tarih) + ' ' + x.saat).join(', ') || 'yok'}</small>
    </div>
    <div style="border-left:1px solid var(--cizgi-2)"><div class="kart-bas" style="padding-top:14px"><b style="color:var(--murekkep)">Ayrılan görüşmeler</b><small>${dolu.length}</small></div><ul class="liste" style="margin-top:6px">${dolu.map((x, i) => `<li><span class="zaman">${x.saat}</span><div style="flex:1;min-width:0">${x.aday ? `<a href="#/adaylar/${x.aday}" style="color:var(--murekkep);font-weight:700">${e(x.dolu)}</a>` : `<b style="color:var(--murekkep)">${e(x.dolu)}</b>`}<small style="display:block;color:var(--soluk)">${goreli(x.tarih)}${x.kanal ? ' · ' + e(x.kanal) : ''}${x.aday ? ' · aday panosunda' : ''}</small></div><button class="dg dg-cizgi dg-kucuk" data-randevu-iptal="${i}">İptal</button></li>`).join('') || '<li style="color:var(--soluk)">Henüz görüşme yok</li>'}</ul></div>
  </div></div>`;
}
function bilmedi() {
  const l = sos().bilinmeyen;
  return `${ekranNotu('Asistanın bilgisi olmadığı için cevaplayamadığı sorular, sorulma sayısına göre. Bir cevap ekleyin; asistan bundan sonra o soruyu kendisi cevaplasın.')}
  <div class="kart"><ul class="liste">${l.slice().sort((a, b) => b.sayi - a.sayi).map(v => { const i = l.indexOf(v); return `<li style="align-items:flex-start">${isaret('bilgi', 22)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(v.soru)}</b><small style="color:var(--soluk)">${v.sayi} kez soruldu · son ${goreli(v.son)}</small></div><span class="sag"><button class="dg dg-ana dg-kucuk" data-bilmedi-cevap="${i}">Cevabı ekle</button><button class="dg dg-hafif dg-kucuk" data-bilmedi-yoksay="${i}">Yoksay</button></span></li>`; }).join('') || '<li style="color:var(--soluk)">Asistanın cevaplayamadığı soru yok.</li>'}</ul></div>`;
}
function devirler() {
  const y = sos().yorumlar.filter(x => x.durum === 'devir');
  return `${ekranNotu('Asistanın kendisi cevaplamadığı, size bıraktığı konuşmalar. Cevapladığınızda listeden düşer.', 'uyari')}
  <div class="kart"><ul class="liste">${[
    ...S.devredilen.map((d, i) => `<li style="align-items:flex-start">${isaret('uyari', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(d.ad)} · ${e(d.konu)}</b><p style="font-size:14px">“${e(d.mesaj)}”</p><small style="color:var(--soluk)">${e(d.kanal)} mesajı · ${d.saat} · ${e(d.neden)}</small>
      ${(d.bildirim || []).length ? `<ul class="zaman-cizgisi" style="padding:8px 0 0 22px;margin:0">${d.bildirim.map(([sa, kim, nasil]) => `<li style="font-size:13px">${sa} · ${e(kim)} kişisine bildirim<small>${e(nasil)}</small></li>`).join('')}</ul>` : ''}
      ${sos().ayar.bildirim.bekletme ? `<small style="display:block;color:var(--soluk);margin-top:4px">${ik('robot')} Müşteriye: “Yetkilimize haber verdim; en geç 30 dakika içinde size dönecek.”</small>` : ''}</div><a class="dg dg-ana dg-kucuk" href="#/mesajlar/bilgi">Cevapla</a></li>`),
    ...y.map(x => `<li style="align-items:flex-start">${isaret('uyari', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(x.kim)} · Instagram yorumu</b><p style="font-size:14px">“${e(x.metin)}”</p><small style="color:var(--soluk)">${goreli(gun(x.gun))} ${x.saat} · Şikâyet: asistan cevaplamadı</small></div><button class="dg dg-ana dg-kucuk" data-yorum-cevap="${x.id}">Cevapla</button></li>`),
  ].join('') || '<li style="color:var(--soluk)">Size devredilmiş konuşma yok.</li>'}</ul></div>`;
}

export function sosyal(alt) {
  const SEK = ['ozet', 'kanal', 'yorum', 'dene', 'kural', 'devir', 'bilmedi'];
  if (alt && SEK.includes(alt)) durum.sekme = alt;
  const govde = { ozet, kanal: kanallar, yorum: yorumlar, dene, kural: kurallar, devir: devirler, bilmedi }[durum.sekme]();
  const bagli = sos().kanallar.filter(c => c.bagli).length;
  return {
    baslik: 'Sosyal medya asistanı',
    alt: `${bagli} kanal bağlı · Instagram, WhatsApp ve yorumlara 7/24 cevap`,
    html: `${durum.sekme === 'ozet' ? ekranNotu('Instagram mesajları, gönderi yorumları ve WhatsApp’a gece gündüz saniyeler içinde cevap verilir; kayda dönen her sohbet aday olarak açılır. Konuşmaların kendisi “Mesajlar”da.') : ''}
      <div id="sek">${sekmeler([['ozet', 'Özet'], ['kanal', 'Kanallar', bagli], ['yorum', 'Instagram yorumları'], ['dene', 'Asistanı dene'], ['kural', 'Kurallar'], ['devir', 'Size devredilen', bekleyenDevir()], ['bilmedi', 'Bilemedikleri', sos().bilinmeyen.length]], durum.sekme)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { location.hash = '#/sosyal/' + s.dataset.sekme; return; }
        const h = t.closest('[data-hazir]'); if (h) return gonder(h.dataset.hazir);
        if (t.closest('[data-dene-sifirla]')) { durum.deneme = []; bekleyen = null; yenile(); }
        const b = t.closest('[data-bagla]'); if (b) return baglaSihirbazi(b.dataset.bagla);
        const yc = t.closest('[data-yorum-cevap]'); if (yc) return yorumCevapla(yc.dataset.yorumCevap);
        const to = t.closest('[data-taslak-onay]'); if (to) { durum.deneme[+to.dataset.taslakOnay].taslak = false; bildir('Cevap onaylandı ve gönderildi'); yenile(); return; }
        const td = t.closest('[data-taslak-duzenle]'); if (td) { const m = durum.deneme[+td.dataset.taslakDuzenle]; pencere({ baslik: 'Cevabı düzenle', icerik: `<div class="alan"><label>Müşteriye gidecek cevap</label><textarea style="min-height:130px">${e(m.metin)}</textarea></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Gönder</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { m.metin = d.querySelector('textarea').value; m.taslak = false; m.kaynak += ' · sizin düzeltmenizle'; kapatPencere(); bildir('Düzeltilmiş cevap gönderildi'); yenile(); }); } }); return; }
        const bc = t.closest('[data-bilmedi-cevap]'); if (bc) { const v = sos().bilinmeyen[+bc.dataset.bilmediCevap]; pencere({ baslik: 'Asistana öğret', icerik: `<p style="margin-bottom:10px;font-size:14px">“${e(v.soru)}” · ${v.sayi} kez soruldu</p><div class="alan"><label>Konu</label><input class="girdi" data-konu value="${e(v.soru.slice(0, 40))}"></div><div class="alan" style="margin-top:10px"><label>Asistan ne cevap versin?</label><textarea style="min-height:110px" placeholder="Kursun onayladığı bilgiyi yazın"></textarea></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Asistana ekle</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { const metin = d.querySelector('textarea').value.trim(); if (!metin) return bildir('Cevabı yazın', 'uyari'); S.asistanBilgi.push({ konu: d.querySelector('[data-konu]').value.trim() || v.soru, soru: v.soru, metin, onay: gun(0) }); sos().bilinmeyen.splice(+bc.dataset.bilmediCevap, 1); islem('Asistana bilgi ekledi', v.soru); kaydet(); kapatPencere(); bildir('Asistan artık bu soruyu cevaplıyor'); yenile(); }); } }); return; }
        const by = t.closest('[data-bilmedi-yoksay]'); if (by) { sos().bilinmeyen.splice(+by.dataset.bilmediYoksay, 1); kaydet(); bildir('Listeden çıkarıldı'); yenile(); return; }
        const ri = t.closest('[data-randevu-iptal]'); if (ri) { const x = sos().slotlar.filter(y => y.dolu).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))[+ri.dataset.randevuIptal]; sos().slotlar.splice(sos().slotlar.indexOf(x), 1); islem('Görüşmeyi iptal etti', x.tarih + ' ' + x.saat); kaydet(); bildir('Görüşme iptal edildi; saat yeniden boş'); yenile(); return; }
        const sh = t.closest('[data-saat-tog]'); if (sh) { const l = sos().gorusmeSablon.saatler, h = sh.dataset.saatTog; sos().gorusmeSablon.saatler = l.includes(h) ? l.filter(x => x !== h) : [...l, h].sort(); kaydet(); yenile(); return; }
        const kk = t.closest('[data-kapali-sil]'); if (kk) { sos().gorusmeSablon.kapali = sos().gorusmeSablon.kapali.filter(x => x !== kk.dataset.kapaliSil); kaydet(); yenile(); return; }
        const ygz = t.closest('[data-yorum-gizle]'); if (ygz) { const y = sos().yorumlar.find(x => x.id === ygz.dataset.yorumGizle); y.durum = 'gizli'; islem('Yorumu gizledi', y.kim); kaydet(); bildir('Yorum gizlendi'); yenile(); return; }
        const ybr = t.closest('[data-yorum-birak]'); if (ybr) { const y = sos().yorumlar.find(x => x.id === ybr.dataset.yorumBirak); y.durum = 'devir'; kaydet(); bildir('Yorum görünür kaldı; cevabı size bırakıldı'); yenile(); return; }
        const tk = t.closest('[data-test-kanal]'); if (tk) { const c = sos().kanallar.find(x => x.id === tk.dataset.testKanal); if (c.id !== 'wp' || !apiAcik()) return baglantiGerekli(c); tk.disabled = true; tk.textContent = 'Gönderiliyor…'; apiGonder(`${S.kurs.ad} · kanal denemesi\nBu mesaj Sinyal’den WhatsApp hattının çalıştığını doğrulamak için gönderildi.`).then(r => { if (r.ok) { c.son = new Date().toTimeString().slice(0, 5); islem('WhatsApp hattını denedi'); kaydet(); bildir('Deneme mesajı WhatsApp’a gönderildi'); } else bildir(r.hata, 'uyari'); yenile(); }); return; }
        const ba = t.closest('[data-belge-ac]'); if (ba) { import('./sayfalar3.js?v=45').then(m => m.belgeAc(ba.dataset.belgeAc)); return; }
        const yg = t.closest('[data-yorum-goster]'); if (yg) { const y = sos().yorumlar.find(x => x.id === yg.dataset.yorumGoster); y.durum = 'devir'; kaydet(); bildir('Yorum görünür yapıldı; cevabı size bırakıldı'); yenile(); }
      });
      k.addEventListener('change', ev => {
        const t = ev.target;
        if (t.matches('[data-cevap]')) { const c = sos().kanallar.find(x => x.id === t.dataset.cevap); c.cevap = t.checked; islem('Asistan ayarını değiştirdi', c.ad + (t.checked ? ' açık' : ' kapalı')); kaydet(); bildir(c.ad + ': asistan ' + (t.checked ? 'cevaplıyor' : 'cevaplamıyor')); }
        if (t.matches('[data-mod]')) { const c = sos().kanallar.find(x => x.id === t.dataset.mod); c.mod = t.value; kaydet(); bildir(c.ad + ': ' + (t.value === '7/24' ? 'her zaman' : 'yalnızca mesai dışında')); }
        if (t.matches('[data-devir-ayar]')) { sos().ayar.devir[t.dataset.devirAyar] = t.checked; kaydet(); bildir('Devir kuralı kaydedildi'); }
        if (t.matches('[data-susma]')) { sos().ayar.susma = +t.value; kaydet(); bildir('Siz yazınca asistan ' + t.value + ' saat susacak'); }
        if (t.matches('[data-dene-kanal]')) { durum.kanal = t.value; yenile(); }
        const a = sos().ayar, kay = (m, yen = true) => { islem('Asistan ayarını değiştirdi', m); kaydet(); bildir(m); if (yen) yenile(); };
        if (t.matches('[data-fiyat]')) { a.fiyat = t.value; kay('Fiyat politikası kaydedildi'); }
        if (t.matches('[data-randevu]')) { a.randevu = t.checked; kay(t.checked ? 'Asistan kayıt görüşmesi ayarlayabilir' : 'Asistan randevu vermeyecek'); }
        if (t.matches('[data-veri-konum]')) { a.veri.konum = t.value; kay(t.value === 'tr' ? 'Model Türkiye’de çalışacak' : 'Model AB’de; aydınlatma metni güncellendi'); }
        if (t.matches('[data-maskele]')) { a.veri.maskele = t.checked; kay(t.checked ? 'Hassas bilgiler modele gönderilmeden gizlenecek' : 'Gizleme kapatıldı'); }
        if (t.matches('[data-aydinlatma]')) { a.veri.aydinlatma = t.checked; kay('Aydınlatma bağlantısı ' + (t.checked ? 'açık' : 'kapalı'), false); }
        if (t.matches('[data-saklama]')) { a.veri.saklamaAy = +t.value; kay('Konuşmalar ' + t.value + ' ay saklanacak', false); }
        if (t.matches('[data-bildirim-kisi]')) { const l = a.bildirim.kisiler; if (t.checked) l.push(t.value); else a.bildirim.kisiler = l.filter(x => x !== t.value); kay('Bildirim kişileri kaydedildi', false); }
        if (t.matches('[data-bildirim-kanal]')) { a.bildirim.kanal = t.value; kay('Bildirim ' + t.value + ' ile gidecek', false); }
        if (t.matches('[data-ikinci]')) { a.bildirim.ikinciDk = +t.value; kay(t.value + ' dk cevapsız kalırsa sıradakine gidecek', false); }
        if (t.matches('[data-bekletme]')) { a.bildirim.bekletme = t.checked; kay('Bekletme mesajı ' + (t.checked ? 'açık' : 'kapalı'), false); }
        if (t.matches('[data-gizle-onay]')) { a.gizleOnay = t.checked; kay(t.checked ? 'Gizlemeden önce size sorulacak' : 'Reklamlar otomatik gizlenecek', false); }
        if (t.matches('[data-onay-modu]')) { a.onayModu = t.value; kay({ otomatik: 'Asistan cevapları doğrudan gidecek', taslak: 'Her cevap önce size gösterilecek', karisik: 'Fiyat ve randevu cevapları önce size gösterilecek' }[t.value]); }
        if (t.matches('[data-gun-tog]')) { const g = +t.value, l = sos().gorusmeSablon.gunler; sos().gorusmeSablon.gunler = t.checked ? [...new Set([...l, g])] : l.filter(x => x !== g); kay('Görüşme günleri kaydedildi', false); }
        if (t.matches('[data-kapali-ekle]') && t.value) { sos().gorusmeSablon.kapali.push(t.value); kay(t.value.split('-').reverse().join('.') + ' görüşmeye kapatıldı'); }
        if (t.matches('[data-sessiz]')) { a.bildirim.sessiz = t.checked; kay(t.checked ? 'Gece bildirim gönderilmeyecek' : 'Sessiz saat kapatıldı', false); }
        if (t.matches('[data-sessiz-bas]')) { a.bildirim.sessizBas = t.value; kay('Sessiz saat kaydedildi', false); }
        if (t.matches('[data-sessiz-bit]')) { a.bildirim.sessizBit = t.value; kay('Sessiz saat kaydedildi', false); }
        if (t.matches('[data-hiz]')) { a.hizSiniri = t.checked; kay('Hız sınırı ' + (t.checked ? 'açık' : 'kapalı'), false); }
        if (t.matches('[data-wp-num]')) { const c = sos().kanallar.find(x => x.id === 'wp'); c.birlikte = t.value === 'true'; kay(c.birlikte ? 'WhatsApp numarası telefonda da açık kalacak' : 'Asistan ayrı numarada çalışacak'); }
      });
      const f = k.querySelector('[data-dene]');
      if (f) { f.addEventListener('submit', ev => { ev.preventDefault(); const m = f.m.value.trim(); if (m) gonder(m); }); const ak = k.querySelector('.sohbet-akis'); if (ak) ak.scrollTop = 1e5; }
      const ki = k.querySelector('[data-kimlik]');
      if (ki) ki.addEventListener('submit', ev => { ev.preventDefault(); const a = sos().ayar; a.ad = ki.ad.value.trim() || a.ad; a.ton = ki.ton.value; a.emoji = ki.emoji.checked; islem('Asistan kimliğini güncelledi', a.ad + ' · ' + a.ton); kaydet(); bildir('Asistan ayarları kaydedildi'); yenile(); });
    },
  };
}

// Deneme sohbeti gerçek listelere (adaylar, devredilenler, bilemedikleri) kayıt yazmaz
let denemede = false;
function gonder(metin) {
  const ilk = !durum.deneme.some(m => m.kim === 'asistan');
  const giden = sos().ayar.veri.maskele ? maskele(metin) : metin;
  durum.deneme.push({ kim: 'musteri', metin, model: giden !== metin ? giden : null });
  denemede = true; let c; try { c = cevapUret(metin, ilk); } finally { denemede = false; }
  const om = sos().ayar.onayModu, taslak = om === 'taslak' || (om === 'karisik' && /Fiyat|takvim/i.test(c.kaynak));
  durum.deneme.push({ kim: 'asistan', metin: c.metin, kaynak: c.kaynak, taslak });
  if (c.aday) durum.deneme.push({ kim: 'not', metin: `Gerçek sohbette burada ${c.aday} numarasıyla “Yeni öğrenciler” listesine aday açılır. Deneme olduğu için kayıt yapılmadı.` });
  if (c.devir) { const b = sos().ayar.bildirim, kisiler = S.kullanicilar.filter(u => b.kisiler.includes(u.id)); durum.deneme.push({ kim: 'not', metin: `Gerçek sohbette bu konuşma “${c.devir}” nedeniyle size devredilir${kisiler[0] ? '; ' + kisiler.map(u => u.ad).join(', ') + ' kişisine ' + b.kanal + ' bildirimi gider' : ''}. Deneme olduğu için bildirim gönderilmedi.` }); }
  yenile();
}

function baglantiGerekli(c) {
  const wp = c.id === 'wp';
  pencere({
    baslik: c.ad + ' · bağlantı gerekli',
    icerik: `<div class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 22)}<span>${wp ? 'WhatsApp gönderim adresi girilmemiş. Ayarlar › Kurs bilgileri’nde “WhatsApp gönderim adresi”ni doldurun; sonra bu düğme gerçek bir deneme mesajı gönderir.' : 'Bu kanal henüz kursun Meta hesabına bağlı değil. Bağlantı, kursun Facebook sayfası yöneticisinin Meta’da onay vermesiyle kurulur; Sinyal bunu kendi başına yapamaz.'}</span></div>
      ${wp ? '' : `<ol style="padding-left:18px;display:grid;gap:8px;font-size:14.5px"><li>Kurs sayfasının yöneticisi Meta Business hesabında Sinyal uygulamasına izin verir.</li><li>Meta, mesaj okuma/cevaplama iznini onaylar (uygulama incelemesi birkaç gün sürebilir).</li><li>Onaydan sonra bu ekranda kanal “Bağlı” görünür ve asistan cevaplamaya başlar.</li></ol>`}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${wp ? '<a class="dg dg-ana" href="#/ayarlar" data-kapat>Ayarlara git</a>' : ''}`,
  });
}

function baglaSihirbazi(id) {
  const c = sos().kanallar.find(x => x.id === id);
  return baglantiGerekli(c);
  pencere({
    baslik: c.ad + ' bağla',
    icerik: `<ol style="padding-left:18px;display:grid;gap:10px;font-size:14.5px">
      <li><b>Meta ile giriş</b><br><small style="color:var(--soluk)">Kurs sayfasının yöneticisi kendi Facebook hesabıyla giriş yapar. Şifre Sinyal’e gelmez.</small></li>
      <li><b>Sayfayı seç ve izin ver</b><br><small style="color:var(--soluk)">Yalnızca mesajları okuma ve cevaplama izni istenir; gönderi paylaşma izni istenmez.</small></li>
      <li><b>Deneme mesajı</b><br><small style="color:var(--soluk)">Sayfaya bir mesaj atılır, asistanın cevabı birlikte kontrol edilir.</small></li></ol>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>${ik('fb')}Meta ile bağlan</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { c.bagli = true; c.cevap = true; c.son = null; islem('Kanal bağladı', c.ad); kaydet(); kapatPencere(); bildir(c.ad + ' bağlandı; asistan cevaplamaya başladı'); yenile(); }); },
  });
}

function yorumCevapla(id) {
  const y = sos().yorumlar.find(x => x.id === id);
  const kanal = sos().kanallar.find(x => x.id === 'igy');
  if (!kanal || !kanal.bagli) return baglantiGerekli(kanal || { id: 'igy', ad: 'Instagram yorumları' });
  pencere({
    baslik: y.kim + ' yorumuna cevap',
    icerik: `<div class="balon" style="max-width:100%;margin-bottom:12px">${e(y.metin)}</div>
      <div class="secim" style="margin-bottom:10px"><label><input type="radio" name="yer" value="acik" checked><span>Yoruma cevap yaz</span></label><label><input type="radio" name="yer" value="dm"><span>Özelden yaz</span></label></div>
      <div class="alan"><label>Cevabınız</label><textarea>Yaşadığınız sorun için özür dileriz. Detayları konuşmak için size özelden yazdık.</textarea></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Gönder</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        y.cevap = d.querySelector('textarea').value.trim() || y.cevap; y.durum = d.querySelector('input[name=yer]:checked').value;
        islem('Instagram yorumunu cevapladı', y.kim); kaydet(); kapatPencere(); bildir('Cevap gönderildi'); yenile();
      });
    },
  });
}
