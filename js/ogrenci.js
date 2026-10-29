// Öğrenci paneli sekmeleri: program, dersler (teorik konular + direksiyon + gelişim), sınavlar, ödemeler, belgeler
import { S, kaydet, gun, fark, SINIFLAR, EVRAKLAR, egitmen, arac, tamAd, odenen, kalanBorc, ekToplam, BECERI, islem, gonderimEkle, ogretmen } from './veri.js?v=68';
import { e, tl, ik, rozet, ilerleme, bos, pencere, kapatPencere, bildir, tarih, tarihUzun, goreli, isaret, belgeYazdir, fotoKucult } from './ui.js?v=68';
import { belgeHtml } from './sayfalar3.js?v=68';

// MEB teorik eğitim programı: konu, ders saati, başlıklar (anahtarlar soru bankasıyla aynı)
export const MUFREDAT = [
  ['trafik', 'Trafik ve çevre bilgisi', 16, ['Trafikle ilgili temel kavramlar', 'Trafik işaretleri: uyarı, tanzim ve bilgi levhaları', 'Yol çizgileri ve ışıklı işaretler', 'Kavşaklar ve geçiş hakkı', 'Hız sınırları ve takip mesafesi', 'Sollama, şerit değiştirme ve dönüşler', 'Duraklama ve park etme', 'Araç ışıklarının kullanımı', 'Otoyol ve bölünmüş yollar', 'Trafik kazaları, sorumluluk ve sigorta', 'Sürücü belgeleri, cezalar ve ceza puanları', 'Çevre: egzoz, gürültü ve yakıt tasarrufu']],
  ['ilkyardim', 'İlk yardım bilgisi', 8, ['İlk yardımın temel ilkeleri ve olay yerini değerlendirme', 'Hasta ya da yaralının değerlendirilmesi: bilinç ve solunum', 'Temel yaşam desteği: yetişkin, çocuk, bebek', 'Kanamalar ve şok', 'Yaralanmalar: kırık, çıkık, burkulma', 'Yanık, donma ve sıcak çarpması', 'Bilinç bozuklukları ve zehirlenmeler', 'Hasta ya da yaralı taşıma; trafik kazasında ilk yardım']],
  ['motor', 'Araç tekniği bilgisi', 6, ['Motor ve çalışma prensibi', 'Yakıt, yağlama ve soğutma sistemleri', 'Elektrik ve ateşleme sistemi', 'Aktarma organları ve vites', 'Fren, direksiyon, süspansiyon ve lastikler', 'Periyodik bakım ve günlük kontroller']],
  ['adab', 'Trafik adabı', 4, ['Trafikte saygı ve empati', 'Öfke kontrolü ve stresle başa çıkma', 'Yaya, bisikletli ve engelli hakları', 'Sürücünün sorumluluğu ve iletişim']],
];
const MEB_TOPLAM = MUFREDAT.reduce((a, x) => a + x[2], 0);
// Öğrencinin teorik saatleri konulara MEB saat oranında dağılır (yoklama konu bazında tutulmadığı için)
const konuSaat = k => { const S0 = SINIFLAR[k.sinif], oran = Math.min(1, k.teorik / Math.max(1, S0.teorik)); return MUFREDAT.map(([key, , saat]) => [key, Math.round(saat * oran)]); };
const GUN = t => fark(t) === 0 ? 'Bugün' : fark(t) === 1 ? 'Yarın' : tarihUzun(t);

/* ---------- Ana ekrana ekle ---------- */
export function kurulumKart() {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="kart og-kart og-kur"><div class="og-bas"><img src="img/simge/sinyal-192.png" alt="" width="44" height="44" style="border-radius:10px;flex:none"><div><small>Telefonuna ekle</small><b>Sinyal uygulama gibi açılsın</b></div></div>
    <p class="og-not" style="padding:0">${ios ? 'Safari’de alttaki Paylaş düğmesine (kare ve ok), sonra “Ana Ekrana Ekle”ye dokun.' : 'Tarayıcı menüsünden “Ana ekrana ekle” ya da “Uygulamayı yükle”yi seç.'}</p>
    <button class="dg dg-ana dg-kucuk" data-kur-android ${window.__kurulum ? '' : 'hidden'} style="margin-top:10px">${ik('indir')}Telefona yükle</button></div>`;
}

/* ---------- Ders değerlendirmesi (öğrenciden öğretmene) ---------- */
export function degerlendirKart(k) {
  const d = S.dersler.filter(x => x.kursiyer === k.id && x.durum === 'Yapıldı' && fark(x.tarih) >= -7 && !x.ogrenciPuan).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat))[0];
  if (!d) return '';
  const h = egitmen(d.egitmen);
  return `<div class="kart og-kart og-degerlendir"><div class="og-bas"><div><small>${GUN(d.tarih)} ${d.saat} · ${e(h ? h.ad : '')}</small><b>Dersin nasıldı?</b></div></div>
    <div class="og-yildiz" role="radiogroup" aria-label="Puan">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-og-yildiz="${n}" aria-label="${n} yıldız">★</button>`).join('')}</div>
    <textarea class="girdi" data-og-yorum placeholder="İstersen kısa bir not yaz (isteğe bağlı)" rows="2"></textarea>
    <button class="dg dg-ana dg-kucuk" data-og-puan="${d.id}" disabled>Gönder</button>
    <p class="og-not" style="padding:0">Puanını yalnız kurs yönetimi görür.</p></div>`;
}

/* ---------- Program ---------- */
function programOlaylari(k) {
  const l = [];
  if (['Kayıt', 'Evrak', 'Teorik'].includes(k.asama)) (S.teorik || []).filter(t => t.grup === (k.teorikGrup || 'aksam') && fark(t.tarih) >= 0 && fark(t.tarih) <= 14).forEach(t => { const o = ogretmen(t.ogretmen); l.push({ tarih: t.tarih, saat: t.saat, tur: 'teorik', baslik: 'Teorik ders · ' + t.konu, alt: [t.salon, t.sure + ' saat', o && o.ad].filter(Boolean).join(' · ') }); });
  S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı' && fark(d.tarih) >= 0).forEach(d => { const h = egitmen(d.egitmen), a = d.arac && arac(d.arac); l.push({ tarih: d.tarih, saat: d.saat, tur: 'direksiyon', baslik: 'Direksiyon dersi', alt: [h && h.ad, a && a.model + ' · ' + a.plaka].filter(Boolean).join(' · ') }); });
  S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).forEach(s => l.push({ tarih: s.tarih, saat: s.saat, tur: 'sinav', baslik: s.tur + ' sınavı', alt: s.yer }));
  return l.sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
}
export function programHtml(k) {
  const l = programOlaylari(k), gunler = [...new Set(l.map(x => x.tarih))];
  return `<div class="kart og-kart"><div class="og-bas"><div><small>Önümüzdeki 2 hafta</small><b>Ders programın</b></div>${l.length ? `<button class="dg dg-cizgi dg-kucuk" data-og-takvim>${ik('takvim')}Takvimime ekle</button>` : ''}</div>
    ${gunler.map(g => `<div class="og-gun"><h4>${GUN(g)}</h4>${l.filter(x => x.tarih === g).map(x => `<div class="og-olay og-${x.tur}"><span class="mono">${x.saat}</span><div><b>${e(x.baslik)}</b><small>${e(x.alt)}</small></div></div>`).join('')}</div>`).join('') || bos('Önümüzdeki 2 haftada dersin yok', k.asama === 'Direksiyon' ? 'Dersler sekmesinden direksiyon dersi alabilirsin.' : 'Programın belli olunca burada görünür.')}</div>
    <p class="og-not">Program değişirse WhatsApp’tan haber verilir.</p>`;
}
function takvimIndir(k) {
  const l = programOlaylari(k), z = (t, s) => t.replace(/-/g, '') + 'T' + s.replace(':', '') + '00';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sinyal//TR', ...l.flatMap((x, i) => ['BEGIN:VEVENT', 'UID:sinyal-' + k.id + '-' + i + '@sinyal', 'DTSTART:' + z(x.tarih, x.saat), 'DURATION:PT' + (x.tur === 'teorik' ? 2 : 1) + 'H', 'SUMMARY:' + x.baslik, 'LOCATION:' + (x.alt || '').replace(/,/g, '\\,'), 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'ders-programim.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  bildir('Takvim dosyası indirildi; açınca dersler telefonunun takvimine eklenir');
}

/* ---------- Dersler ---------- */
export function derslerHtml(k, direksiyonListesi) {
  const S0 = SINIFLAR[k.sinif], ks = Object.fromEntries(konuSaat(k));
  const yapilan = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && d.beceri).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const ort = l => { const v = BECERI.map(([x]) => l.map(d => d.beceri[x]).filter(z => z != null)); return BECERI.map(([x, ad], i) => [ad, v[i].length ? v[i].reduce((a, b) => a + b, 0) / v[i].length : null]); };
  const son = ort(yapilan.slice(-3)), once = yapilan.length > 3 ? ort(yapilan.slice(0, -3)) : null;
  const notlar = yapilan.filter(d => d.not).slice(-2).reverse();
  return `<div class="kart og-kart"><div class="og-bas"><div><small>Teorik dersler</small><b>${k.teorik}/${S0.teorik} saat</b></div>${rozet(k.teorik >= S0.teorik ? 'Tamamlandı' : 'Devam ediyor', k.teorik >= S0.teorik ? 'yesil' : 'mavi')}</div>
      ${MUFREDAT.map(([key, ad, saat, basliklar]) => { const okn = basliklar.filter((b, i) => (k.okunan || {})[key + '-' + (i + 1)]).length; return `<details class="og-konu"><summary><span><b>${e(ad)}</b><small>${ks[key]}/${saat} saat · ${okn}/${basliklar.length} konu okundu</small></span>${ilerleme(ks[key], saat, ks[key] >= saat ? 'yesil' : '')}</summary>
        <ul class="og-basliklar">${basliklar.map((b, i) => { const id = key + '-' + (i + 1), ok = (k.okunan || {})[id]; return `<li><button type="button" data-og-ders="${id}" class="${ok ? 'okundu' : ''}"><span>${ok ? '✓' : i + 1}</span>${e(b)}</button></li>`; }).join('')}</ul>
        <button class="dg dg-cizgi dg-kucuk" data-test-basla="konu" data-konu="${key}" data-og-sinava>${ik('sinav')}Bu konudan test çöz</button></details>`; }).join('')}
      <p class="og-not" style="padding:0 2px">Konular MEB’in sürücü kursu teorik eğitim programına göredir (toplam ${MEB_TOPLAM} saat).</p></div>
    ${SINIFLAR[k.sinif].direksiyon ? `<div class="kart og-kart"><div class="og-bas"><div><small>Direksiyon</small><b>${k.direksiyon}/${S0.direksiyon} ders</b></div>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</div>${direksiyonListesi}</div>` : ''}
    ${yapilan.length ? `<div class="kart og-kart"><div class="og-bas"><div><small>Gelişimin</small><b>Öğretmeninin verdiği puanlar</b></div><small>son ${Math.min(3, yapilan.length)} ders · 1–5</small></div>
      <div class="og-beceri">${son.map(([ad, v], i) => v == null ? '' : `<div><span>${e(ad)}</span><i><b style="width:${v / 5 * 100}%;background:${v < 3 ? 'var(--kirmizi)' : v < 3.8 ? 'var(--sari)' : 'var(--yesil)'}"></b></i><b class="mono">${v.toFixed(1).replace('.', ',')}</b>${once && once[i][1] != null ? `<small class="${v >= once[i][1] ? 'og-artis' : 'og-dusus'}">${v >= once[i][1] ? '↑' : '↓'}</small>` : '<small></small>'}</div>`).join('')}</div>
      ${notlar.map(d => `<blockquote class="og-alinti">“${e(d.not)}”<small>${e((egitmen(d.egitmen) || {}).ad || '')} · ${tarih(d.tarih)}</small></blockquote>`).join('')}
      <p class="og-not" style="padding:0 2px">3’ün altındaki becerin için öğretmenin ek çalışma önerebilir. 5 “sınava hazır” demek.</p></div>` : ''}`;
}

/* ---------- Sınavlar ---------- */
export function sinavlarHtml(k) {
  const hak = S.kurs.sinavHak || 4, tu = S.kurs.tekrarUcret || {};
  const kart = (tur, x, sonraki, getir, ucret) => {
    const gecti = x && x.sonuc === 'Geçti', kalan = Math.max(0, hak - ((x && x.hak) || 0) + (gecti ? 0 : 0));
    return `<div class="kart og-kart og-sinav ${gecti ? 'gecti' : ''}"><div class="og-bas"><div><small>${tur}</small><b>${gecti ? 'Geçtin' + (x.puan ? ' · ' + x.puan + ' puan' : '') : sonraki ? GUN(sonraki.tarih) + ' ' + sonraki.saat : 'Henüz tarih yok'}</b></div>${gecti ? rozet('Tamam', 'yesil') : sonraki ? rozet(goreli(sonraki.tarih), 'mavi') : rozet('Bekliyor', 'notr')}</div>
      ${!gecti ? `${sonraki ? `<p class="og-yer">${ik('harita')}${e(sonraki.yer)}</p>` : `<p class="og-not" style="padding:0">${tur === 'e-Sınav' ? 'Teorik derslerin bitince kurs e-sınav randevunu alır.' : 'Direksiyon derslerin bitince kurs sınav tarihini bildirir.'}</p>`}
      <div class="og-satirlar"><div><span>Kalan sınav hakkın</span><b>${kalan} / ${hak}</b></div><div><span>Kalırsan tekrar sınav ücreti</span><b>${ucret ? tl(ucret) : '—'}</b></div></div>
      <p class="et" style="margin-top:12px">Yanına al</p><ul class="og-getir">${getir.map(g => `<li>${isaret('tamam', 16)}${e(g)}</li>`).join('')}</ul>` : ''}</div>`;
  };
  const sonr = tur => S.sinavlar.filter(s => s.tur === tur && s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  return kart('e-Sınav', k.esinav, sonr('e-Sınav'), ['T.C. kimlik kartın (fotokopi geçmez)', 'e-Sınav ücreti dekontu', 'Sınavdan 30 dakika önce sınav merkezinde ol'], tu.esinav)
    + (SINIFLAR[k.sinif].direksiyon ? kart('Direksiyon sınavı', k.dsinav, sonr('Direksiyon'), ['T.C. kimlik kartın', 'Gözlük ya da lens kullanıyorsan yanında olsun', 'Sınavdan 30 dakika önce sınav yerinde ol'], tu.dsinav) : '');
}

/* ---------- Ödemeler ---------- */
export function odemelerHtml(k) {
  const toplam = k.odeme.toplam + ekToplam(k), od = odenen(k), kalan = kalanBorc(k);
  const makbuzlar = S.hareket.filter(h => h.kursiyer === k.id && h.tur === 'Gelir').sort((a, b) => b.tarih.localeCompare(a.tarih));
  return `<div class="og-ozet"><div><small>Toplam</small><b class="sayi">${tl(toplam)}</b></div><div><small>Ödenen</small><b class="sayi" style="color:var(--yesil)">${tl(od)}</b></div><div><small>Kalan</small><b class="sayi" style="color:${kalan ? 'var(--murekkep)' : 'var(--yesil)'}">${tl(kalan)}</b></div></div>
    <div class="kart og-kart"><div class="og-bas"><div><small>Ödeme planın</small><b>${k.odeme.taksitler.length ? k.odeme.taksitler.length + ' taksit' : 'Peşin'}</b></div>${k.odeme.otomatik ? rozet('Otomatik çekim •••• ' + k.odeme.otomatik.son4, 'yesil') : ''}</div>
      <div class="taksit-sira"><span class="no">P</span><div><b style="color:var(--murekkep)">Peşinat</b><small style="display:block;color:var(--soluk)">${tarih(k.odeme.pesinTarih)}</small></div><span class="sayi">${tl(k.odeme.pesin)}</span>${rozet('Ödendi', 'yesil')}</div>
      ${k.odeme.taksitler.map((t, i) => `<div class="taksit-sira"><span class="no">${i + 1}</span><div><b style="color:var(--murekkep)">${i + 1}. taksit</b><small style="display:block;color:${!t.odendi && fark(t.vade) < 0 ? 'var(--kirmizi)' : 'var(--soluk)'}">Vade ${tarih(t.vade)}${!t.odendi && fark(t.vade) < 0 ? ' · gecikti' : ''}${t.kismi ? ' · ' + tl(t.kismi) + ' ödendi' : ''}</small></div><span class="sayi">${tl(t.tutar)}</span>${t.odendi ? rozet('Ödendi', 'yesil') : t.iptal ? rozet('İptal', 'notr') : `<button class="dg dg-ana dg-kucuk" data-ode="${i}">Öde</button>`}</div>`).join('')}
      ${(k.odeme.ekler || []).map(x => `<div class="taksit-sira"><span class="no">+</span><div><b style="color:var(--murekkep)">${e(x.ad)}</b><small style="display:block;color:var(--soluk)">Ek kalem</small></div><span class="sayi">${tl(x.tutar)}</span>${x.odendi ? rozet('Ödendi', 'yesil') : rozet('Kursta ödenir', 'sari')}</div>`).join('')}</div>
    ${S.kurs.iban ? `<div class="kart og-kart"><div class="og-bas"><div><small>Havale / EFT</small><b class="mono og-iban">${e(S.kurs.iban)}</b></div><button class="dg dg-cizgi dg-kucuk" data-og-iban>Kopyala</button></div><p class="og-not" style="padding:0">Alıcı: ${e(S.kurs.ad)} · Açıklamaya adını ve soyadını yaz.</p></div>` : ''}
    <div class="kart og-kart"><div class="og-bas"><div><small>Makbuzların</small><b>${makbuzlar.length} ödeme</b></div></div>
      <ul class="liste og-liste">${makbuzlar.map(h => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${tl(h.tutar)}</b><small style="display:block;color:var(--soluk)">${tarih(h.tarih)} · ${e(h.yontem || '')}${h.no ? ' · ' + e(h.no) : ''}</small></div><button class="dg dg-hafif dg-kucuk" data-og-makbuz="${h.id}">Makbuz</button></li>`).join('') || `<li>${bos('Henüz ödeme yok', '')}</li>`}</ul></div>`;
}

/* ---------- Belgeler ---------- */
export function belgelerHtml(k) {
  const y = k.evrakYuklenen || {};
  return `<div class="kart og-kart"><div class="og-bas"><div><small>Kayıt evrakın</small><b>${EVRAKLAR.filter(([x]) => k.evrak[x]).length}/${EVRAKLAR.length} tamam</b></div></div>
      ${EVRAKLAR.map(([key, t]) => `<div class="evrak og-evrak"><span class="durum ${k.evrak[key] ? 'var' : y[key] ? 'bekliyor' : 'yok'}">${ik(k.evrak[key] ? 'tik' : y[key] ? 'saat' : 'kapat')}</span><span style="flex:1;color:var(--murekkep)">${t}${y[key] && !k.evrak[key] ? `<small>Yüklendi ${tarih(y[key].tarih)} · kurs kontrol ediyor</small>` : ''}</span>${k.evrak[key] ? '' : key === 'sozlesme' ? rozet('Kursta imzalanır', 'uyari') : `<label class="dg dg-cizgi dg-kucuk og-yukle">${ik(y[key] ? 'sifirla' : 'arti')}${y[key] ? 'Yenile' : 'Yükle'}<input type="file" accept="image/*,application/pdf" capture="environment" data-og-evrak="${key}" hidden></label>`}</div>`).join('')}
      <p class="og-not" style="padding:0">Belgenin fotoğrafını çek; kurs kontrol edince burada tamamlanır. Asıllarını ilk geldiğinde kursa teslim et.</p></div>
    <div class="kart og-kart"><div class="og-bas"><div><small>Belgelerin</small><b>Kurs sözleşmesi ve formlar</b></div></div>
      <ul class="liste og-liste">${[['sozlesme', 'Kurs sözleşmen', 'Ücret, taksit planı ve şartlar'], ['takip', 'Direksiyon eğitimi takip formun', SINIFLAR[k.sinif].direksiyon ? k.direksiyon + ' ders işlendi' : ''], ['bilgi', 'Bilgi formun', 'Kayıtta verdiğin bilgiler']].filter(x => x[0] !== 'takip' || SINIFLAR[k.sinif].direksiyon).map(([tur, ad, alt]) => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${ad}</b><small style="display:block;color:var(--soluk)">${e(alt)}</small></div><button class="dg dg-hafif dg-kucuk" data-og-belge="${tur}">Gör</button></li>`).join('')}</ul></div>`;
}

/* ---------- konu anlatımı ---------- */
// İçerik ayrı dosyada; yalnız açılınca yüklenir (açılış hızını etkilemesin)
let dersYuk = null;
const dersleriYukle = () => dersYuk || (dersYuk = import('./dersler.js?v=68').then(m => m.DERSLER).catch(() => ({})));
async function dersAc(k, id, yenile) {
  const D = await dersleriYukle(), d = D[id], [key, no] = [id.replace(/-\d+$/, ''), +id.split('-').pop()], konu = MUFREDAT.find(x => x[0] === key), baslik = konu ? konu[3][no - 1] : id;
  const sonraki = konu && no < konu[3].length ? key + '-' + (no + 1) : null;
  pencere({
    baslik: (konu ? konu[1] + ' · ' : '') + no + '. konu', genis: true,
    icerik: `<article class="og-ders"><h3>${e(baslik)}</h3>
      ${d ? `${(d.videolar || []).length ? `<div class="og-videolar">${d.videolar.map(v => `<div class="og-video"><button type="button" class="og-video-kapak" data-og-video="${e(v.id)}" aria-label="Videoyu oynat: ${e(v.baslik)}"><img src="https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/hqdefault.jpg" alt="" loading="lazy"><span class="og-oynat" aria-hidden="true">▶</span></button><small>${e(v.baslik)} · ${e(v.kanal)}</small></div>`).join('')}</div>` : ''}
        ${d.paragraflar.map(p => `<p>${e(p)}</p>`).join('')}
        ${d.akilda && d.akilda.length ? `<div class="og-akilda"><b>Akılda kalsın</b><ul>${d.akilda.map(x => `<li>${e(x)}</li>`).join('')}</ul></div>` : ''}
        ${d.kaynak && d.kaynak.length ? `<p class="og-kaynak">Kaynak: ${d.kaynak.map(x => e(x).replace(/:?\s*(https?:\/\/[^\s<]+)/g, (m, u) => ` <a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>`)).join(' · ')}</p>` : ''}`
      : `<p class="og-not">Bu konunun anlatımı hazırlanıyor.</p>`}</article>`,
    altlik: `<button class="dg dg-cizgi" data-og-test="${key}">${ik('sinav')}Konu testi</button>${sonraki ? `<button class="dg dg-ana" data-og-sonraki="${sonraki}">Okudum, sonraki konu →</button>` : `<button class="dg dg-ana" data-og-bitir>Okudum</button>`}`,
    onAc(p) {
      // video kapağına tıklanınca oynatıcı yüklenir (sayfa hızlı açılır, YouTube izlemeden önce bağlanmaz)
      p.querySelectorAll('[data-og-video]').forEach(b => b.addEventListener('click', () => { const f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.dataset.ogVideo) + '?autoplay=1&rel=0'; f.title = b.getAttribute('aria-label'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin'; b.replaceWith(f); }));
      const isaretle = () => { k.okunan = k.okunan || {}; if (!k.okunan[id]) { k.okunan[id] = gun(0); kaydet(); } };
      const sn = p.querySelector('[data-og-sonraki]'); if (sn) sn.addEventListener('click', () => { isaretle(); dersAc(k, sn.dataset.ogSonraki, yenile); });
      const bt = p.querySelector('[data-og-bitir]'); if (bt) bt.addEventListener('click', () => { isaretle(); kapatPencere(); yenile(); });
      p.querySelector('[data-og-test]').addEventListener('click', () => { isaretle(); kapatPencere(); const b = document.querySelector(`[data-test-basla="konu"][data-konu="${key}"]`); if (b) b.click(); else yenile(); });
    },
  });
}

/* ---------- olaylar ---------- */
export function ogBagla(kap, k, yenile) {
  kap.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-kur-android]') && window.__kurulum) { window.__kurulum.prompt(); window.__kurulum.userChoice.finally(() => { window.__kurulum = null; yenile(); }); return; }
    const od = t.closest('[data-og-ders]'); if (od) return dersAc(k, od.dataset.ogDers, yenile);
    const yz = t.closest('[data-og-yildiz]'); if (yz) { const kart = yz.closest('.og-degerlendir'), n = +yz.dataset.ogYildiz; kart.dataset.puan = n; kart.querySelectorAll('[data-og-yildiz]').forEach(b => b.classList.toggle('secili', +b.dataset.ogYildiz <= n)); kart.querySelector('[data-og-puan]').disabled = false; return; }
    const op = t.closest('[data-og-puan]'); if (op) { const kart = op.closest('.og-degerlendir'), d = S.dersler.find(x => x.id === op.dataset.ogPuan), n = +kart.dataset.puan; if (!d || !n) return; d.ogrenciPuan = { puan: n, yorum: kart.querySelector('[data-og-yorum]').value.trim().slice(0, 300), tarih: gun(0) }; islem('Öğrenci dersi değerlendirdi', tamAd(k) + ' · ' + n + '/5'); kaydet(); bildir('Teşekkürler, değerlendirmen kursa iletildi'); return yenile(); }
    if (t.closest('[data-og-takvim]')) return takvimIndir(k);
    if (t.closest('[data-og-iban]')) { try { navigator.clipboard.writeText(S.kurs.iban.replace(/\s/g, '')); bildir('IBAN kopyalandı'); } catch (x) { bildir('IBAN: ' + S.kurs.iban); } return; }
    const mb = t.closest('[data-og-makbuz]'); if (mb) return belgeGoster('makbuz', k.id, mb.dataset.ogMakbuz, 'Makbuz');
    const bg = t.closest('[data-og-belge]'); if (bg) return belgeGoster(bg.dataset.ogBelge, k.id, undefined, bg.closest('li').querySelector('b').textContent);
  });
  kap.addEventListener('change', ev => {
    const inp = ev.target.closest('[data-og-evrak]'); if (!inp || !inp.files[0]) return;
    const f = inp.files[0], key = inp.dataset.ogEvrak, ad = (EVRAKLAR.find(x => x[0] === key) || [0, key])[1];
    const pdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name), resim = /^image\//.test(f.type);
    if (!pdf && !resim) return bildir('Belgenin fotoğrafını ya da PDF’ini yükle', 'uyari');
    if (resim && f.size > 20 * 1024 * 1024) return bildir('Fotoğraf 20 MB’tan büyük olamaz', 'uyari');
    if (pdf && f.size > 700 * 1024) return bildir('PDF 700 KB’tan büyük; belgenin fotoğrafını çekip yükle', 'uyari');
    bildir('Belge hazırlanıyor…');
    // fotoğraf okunaklı kalacak boyuta küçültülür (~200 KB); PDF olduğu gibi saklanır
    const oku = resim ? fotoKucult(f, 1600) : new Promise((coz, red) => { const r = new FileReader(); r.onload = () => coz(r.result); r.onerror = red; r.readAsDataURL(f); });
    oku.then(veri => {
      k.evrakYuklenen = k.evrakYuklenen || {}; k.evrakYuklenen[key] = { tarih: gun(0), dosya: f.name, boyut: veri.length, tur: pdf ? 'pdf' : 'resim', veri };
      islem('Öğrenci evrak yükledi', tamAd(k) + ' · ' + ad); gonderimEkle(S.kurs.ad, tamAd(k) + ' “' + ad + '” belgesini yükledi; kontrol bekliyor', 'Öğrenci evrakı'); kaydet();
      bildir('Belgen kursa gönderildi; kontrol edilince tamamlanır'); yenile();
    }).catch(() => bildir('Dosya okunamadı; tekrar dene', 'uyari'));
  });
}
function belgeGoster(tur, id, hid, baslik) {
  const html = belgeHtml(tur, id, hid); if (!html) return bildir('Belge bulunamadı', 'uyari');
  pencere({ baslik, genis: true, icerik: `<div class="a4 og-a4">${html}</div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-og-yazdir>${ik('indir')}Yazdır / PDF</button>`, onAc(d) { d.querySelector('[data-og-yazdir]').addEventListener('click', () => belgeYazdir(html, baslik)); } });
}
