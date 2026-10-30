// Öğrenci paneli sekmeleri: dersler (yaklaşan + defter + gelişim + teorik konular), sınavlar, ödemeler, belgeler; bölümler açılır kapanır modüller
import { S, kaydet, gun, fark, SINIFLAR, EVRAKLAR, egitmen, arac, tamAd, odenen, kalanBorc, ekToplam, BECERI, islem, gonderimEkle, ogretmen, ogrOzellik, oturum } from './veri.js?v=100';
import { e, tl, ik, rozet, ilerleme, pencere, kapatPencere, bildir, tarih, goreli, isaret, belgeYazdir, fotoKucult } from './ui.js?v=100';
import { belgeHtml } from './sayfalar3.js?v=100';

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

/* ---------- modül: başlığı hep görünen, dokununca açılan bölüm ---------- */
// Öğrencinin açtığı/kapattığı bölüm yeniden çizimde öyle kalır (bir işlem yapınca açtığı yer kapanmasın)
const ACIK = new Set(), KAPALI = new Set();
export const modulAc = id => { ACIK.add(id); KAPALI.delete(id); };
export const modulSifirla = () => { ACIK.clear(); KAPALI.clear(); };
export function modul(id, { ikon, baslik, ozet = '', sag = '', acik = false, ton = '' }, icerik) {
  const a = ACIK.has(id) || (acik && !KAPALI.has(id));
  return `<details class="og-modul ${ton}" data-modul="${id}" ${a ? 'open' : ''}><summary><span class="og-m-ik">${ik(ikon)}</span><span class="og-m-yazi"><b>${baslik}</b>${ozet ? `<small>${ozet}</small>` : ''}</span>${sag}<span class="og-m-ok" aria-hidden="true">${ik('asagi')}</span></summary><div class="og-m-govde">${icerik}</div></details>`;
}
const gunK = t => fark(t) === 0 ? 'Bugün' : fark(t) === 1 ? 'Yarın' : fark(t) === -1 ? 'Dün' : tarih(t);

/* ---------- Ana ekrana ekle ---------- */
export function kurulumKart() {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="og-kur"><img src="img/simge/sinyal-192.png" alt="" width="40" height="40"><div><b>Sinyal’i telefonuna ekle</b><small>${ios ? 'Safari’de Paylaş düğmesine (kare ve ok), sonra “Ana Ekrana Ekle”ye dokun.' : 'Tarayıcı menüsünden “Ana ekrana ekle”yi seç; uygulama gibi açılır.'}</small></div>
    <button class="dg dg-ana dg-kucuk" data-kur-android ${window.__kurulum ? '' : 'hidden'}>Yükle</button></div>`;
}

/* ---------- Ders değerlendirmesi (öğrenciden öğretmene) ---------- */
export function degerlendirKart(k) {
  const d = S.dersler.filter(x => x.kursiyer === k.id && x.durum === 'Yapıldı' && fark(x.tarih) >= -7 && !x.ogrenciPuan).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat))[0];
  if (!d) return '';
  const h = egitmen(d.egitmen);
  return `<div class="og-degerlendir"><div class="og-deg-ust"><b>Son dersin nasıldı?</b><small>${gunK(d.tarih)} ${d.saat} · ${e(h ? h.ad : '')}</small></div>
    <div class="og-yildiz" role="radiogroup" aria-label="Puan">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-og-yildiz="${n}" aria-label="${n} yıldız">★</button>`).join('')}</div>
    <div class="og-deg-ek"><textarea class="girdi" data-og-yorum placeholder="İstersen kısa bir not yaz" rows="2"></textarea>
    <div class="og-deg-alt"><small>Puanını yalnız kurs yönetimi görür.</small><button class="dg dg-ana dg-kucuk" data-og-puan="${d.id}" disabled>Gönder</button></div></div></div>`;
}

/* ---------- Program ---------- */
function programOlaylari(k) {
  const l = [];
  if (['Kayıt', 'Evrak', 'Teorik'].includes(k.asama)) (S.teorik || []).filter(t => t.grup === (k.teorikGrup || 'aksam') && fark(t.tarih) >= 0 && fark(t.tarih) <= 14).forEach(t => { const o = ogretmen(t.ogretmen); l.push({ tarih: t.tarih, saat: t.saat, tur: 'teorik', baslik: 'Teorik · ' + t.konu, alt: [t.salon, t.sure + ' saat', o && o.ad].filter(Boolean).join(' · ') }); });
  S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı' && fark(d.tarih) >= 0).forEach(d => { const h = egitmen(d.egitmen), a = d.arac && arac(d.arac); l.push({ id: d.id, iptal: fark(d.tarih) >= 1, tarih: d.tarih, saat: d.saat, tur: 'direksiyon', baslik: 'Direksiyon dersi', alt: [h && h.ad, a && a.model + ' · ' + a.plaka].filter(Boolean).join(' · ') }); });
  S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).forEach(s => l.push({ tarih: s.tarih, saat: s.saat, tur: 'sinav', baslik: s.tur + ' sınavı', alt: s.yer }));
  return l.sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
}
const olayHtml = x => `<div class="og-olay og-${x.tur}"><div class="og-zaman"><small>${gunK(x.tarih)}</small><b class="mono">${x.saat}</b></div><div class="og-olay-ad"><b>${e(x.baslik)}</b><small>${e(x.alt)}</small></div>${x.iptal ? `<button class="dg dg-hafif dg-kucuk" data-og-iptal="${x.id}">İptal</button>` : ''}</div>`;
export function yaklasanHtml(k) {
  const l = programOlaylari(k), ilk = l.slice(0, 4), kalan = l.slice(4);
  return `<section class="kart og-kart"><div class="og-bas"><div><small>Önümüzdeki 2 hafta</small><b>Yaklaşan derslerin</b></div>${l.length ? `<button class="dg dg-hafif dg-kucuk" data-og-takvim>${ik('takvim')}Takvime ekle</button>` : ''}</div>
    ${l.length ? `<div class="og-olaylar">${ilk.map(olayHtml).join('')}</div>${kalan.length ? `<details class="og-daha"><summary>${kalan.length} ders daha</summary><div class="og-olaylar">${kalan.map(olayHtml).join('')}</div></details>` : ''}`
      : `<p class="og-bos">${k.asama === 'Direksiyon' ? 'Planlı dersin yok. Yukarıdan direksiyon dersi alabilirsin.' : 'Programın belli olunca burada görünür.'}</p>`}
    <p class="og-not">Program değişirse WhatsApp’tan haber verilir.</p></section>`;
}
function takvimIndir(k) {
  const l = programOlaylari(k), z = (t, s) => t.replace(/-/g, '') + 'T' + s.replace(':', '') + '00';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sinyal//TR', ...l.flatMap((x, i) => ['BEGIN:VEVENT', 'UID:sinyal-' + k.id + '-' + i + '@sinyal', 'DTSTART:' + z(x.tarih, x.saat), 'DURATION:PT' + (x.tur === 'teorik' ? 2 : 1) + 'H', 'SUMMARY:' + x.baslik, 'LOCATION:' + (x.alt || '').replace(/,/g, '\\,'), 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'ders-programim.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  bildir('Takvim dosyası indirildi; açınca dersler telefonunun takvimine eklenir');
}

/* ---------- Dersler ---------- */
// Becerilerin son 3 dersteki ortalaması ve öncekilere göre yönü
function beceriOzet(k) {
  const yapilan = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && d.beceri).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const ort = l => { const v = BECERI.map(([x]) => l.map(d => d.beceri[x]).filter(z => z != null)); return BECERI.map(([x, ad], i) => [ad, v[i].length ? v[i].reduce((a, b) => a + b, 0) / v[i].length : null]); };
  return { yapilan, son: ort(yapilan.slice(-3)), once: yapilan.length > 3 ? ort(yapilan.slice(0, -3)) : null };
}
const virgul = v => v.toFixed(1).replace('.', ',');
export function derslerHtml(k) {
  const S0 = SINIFLAR[k.sinif], dir = !!S0.direksiyon, ks = Object.fromEntries(konuSaat(k)), teorikOnce = ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama);
  const okn = key => MUFREDAT.find(x => x[0] === key)[3].filter((b, i) => (k.okunan || {})[key + '-' + (i + 1)]).length;
  const okunan = MUFREDAT.reduce((a, [key]) => a + okn(key), 0), konuTop = MUFREDAT.reduce((a, x) => a + x[3].length, 0);
  const teorik = modul('teorik', { ikon: 'teorik', baslik: 'Teorik dersler ve konular', ozet: `${k.teorik}/${S0.teorik} saat · ${okunan}/${konuTop} konu okundu`, sag: k.teorik >= S0.teorik ? rozet('Bitti', 'yesil') : '', acik: teorikOnce },
    `${MUFREDAT.map(([key, ad, saat, basliklar]) => `<details class="og-konu"><summary><span><b>${e(ad)}</b><small>${ks[key]}/${saat} saat · ${okn(key)}/${basliklar.length} konu okundu</small></span>${ilerleme(ks[key], saat, ks[key] >= saat ? 'yesil' : '')}</summary>
      <ul class="og-basliklar">${basliklar.map((b, i) => { const id = key + '-' + (i + 1), ok = (k.okunan || {})[id]; return `<li><button type="button" data-og-ders="${id}" class="${ok ? 'okundu' : ''}"><span>${ok ? '✓' : i + 1}</span>${e(b)}</button></li>`; }).join('')}</ul>
      <div class="og-konu-dg">${key === 'trafik' && ogrOzellik('tehlike') ? `<button class="dg dg-cizgi dg-kucuk" data-tehlike>${ik('uyari')}Tehlike algısı</button>` : ''}${key === 'motor' ? `${ogrOzellik('ikaz') ? `<button class="dg dg-cizgi dg-kucuk" data-ikaz>${ik('uyari')}İkaz lambaları</button>` : ''}${ogrOzellik('motor') ? '<button class="dg dg-cizgi dg-kucuk" data-motor4>4 zamanlı motor</button><button class="dg dg-cizgi dg-kucuk" data-debriyaj>Debriyaj ve kalkış</button>' : ''}` : ''}<button class="dg dg-ana dg-kucuk" data-test-basla="konu" data-konu="${key}" data-og-sinava>${ik('sinav')}Bu konudan test</button></div></details>`).join('')}
    <p class="og-not">Konular MEB’in sürücü kursu teorik eğitim programına göredir (toplam ${MEB_TOPLAM} saat).</p>`);
  if (!dir) return yaklasanHtml(k) + teorik;
  const { yapilan, son, once } = beceriOzet(k), notlar = yapilan.filter(d => d.not).slice(-2).reverse();
  const zayif = son.filter(([, v]) => v != null).sort((a, b) => a[1] - b[1])[0];
  const gelisim = yapilan.length ? modul('gelisim', { ikon: 'rapor', baslik: 'Gelişimin', ozet: zayif && zayif[1] < 3.8 ? `Üzerinde çalış: ${e(zayif[0])} (${virgul(zayif[1])})` : `Son ${Math.min(3, yapilan.length)} derste iyi gidiyorsun`, acik: false },
    `<p class="og-not" style="margin:0 0 10px">Öğretmeninin son ${Math.min(3, yapilan.length)} derste verdiği puanlar · 1 zayıf, 5 sınava hazır</p>
    <div class="og-beceri">${son.map(([ad, v], i) => v == null ? '' : `<div><span>${e(ad)}</span><i><b style="width:${v / 5 * 100}%;background:${v < 3 ? 'var(--kirmizi)' : v < 3.8 ? 'var(--sari)' : 'var(--yesil)'}"></b></i><b class="mono">${virgul(v)}</b>${once && once[i][1] != null ? `<small class="${v >= once[i][1] ? 'og-artis' : 'og-dusus'}">${v >= once[i][1] ? '↑' : '↓'}</small>` : '<small></small>'}</div>`).join('')}</div>
    ${notlar.map(d => `<blockquote class="og-alinti">“${e(d.not)}”<small>${e((egitmen(d.egitmen) || {}).ad || '')} · ${tarih(d.tarih)}</small></blockquote>`).join('')}`) : '';
  const gecmis = S.dersler.filter(d => d.kursiyer === k.id && d.durum !== 'Planlandı').sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const satir = d => `<li class="og-olay"><div class="og-zaman"><small>${gunK(d.tarih)}</small><b class="mono">${d.saat}</b></div><div class="og-olay-ad"><b>${d.durum === 'Yapıldı' ? 'Ders yapıldı' : e(d.durum)}</b><small>${e((egitmen(d.egitmen) || {}).ad || '')}</small></div>${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'notr')}</li>`;
  const direksiyon = modul('direksiyon', { ikon: 'direksiyon', baslik: 'Geçmiş direksiyon derslerin', ozet: `${k.direksiyon}/${S0.direksiyon} ders yapıldı${gecmis.some(d => d.durum === 'Gelmedi') ? ' · ' + gecmis.filter(d => d.durum === 'Gelmedi').length + ' gelmedi' : ''}`, acik: false },
    gecmis.length ? `<ul class="og-olaylar">${gecmis.map(satir).join('')}</ul>` : '<p class="og-bos">Henüz yapılan direksiyon dersin yok.</p>');
  const al = k.asama !== 'Ehliyet' ? `<button class="dg dg-ana og-genis" data-iste>${ik('arti')}Direksiyon dersi al</button>` : '';
  const ilerl = `<div class="og-sayac"><div><small>Direksiyon</small><b>${k.direksiyon}<span>/${S0.direksiyon}</span></b>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</div><div><small>Teorik</small><b>${k.teorik}<span>/${S0.teorik}</span></b>${ilerleme(k.teorik, S0.teorik, 'yesil')}</div></div>`;
  return ilerl + (teorikOnce ? yaklasanHtml(k) + teorik + (ogrOzellik('dersOnay') ? dersDefteri(k) : '') + gelisim + direksiyon
    : al + yaklasanHtml(k) + (ogrOzellik('dersOnay') ? dersDefteri(k) : '') + gelisim + direksiyon + teorik);
}

// Ders defteri: sözleşmedeki / yapılan / onaylanan / MEBBİS'e girilen direksiyon dersleri yan yana; öğrenci son 14 günün derslerini onaylar ya da itiraz eder
export const onayBekleyen = k => S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && !d.ogrenciOnay && fark(d.tarih) >= -14).length;
function dersDefteri(k) {
  const S0 = SINIFLAR[k.sinif], l = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const onay = l.filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'onay').length, itiraz = l.filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'itiraz').length, bekleyen = onayBekleyen(k);
  const satir = d => { const h = egitmen(d.egitmen), o = d.ogrenciOnay, sorulur = !o && fark(d.tarih) >= -14;
    return `<li class="og-defter-satir"><div style="flex:1;min-width:0"><b>${tarih(d.tarih)} · ${d.bas || d.saat}${d.bit ? '–' + d.bit : ''}</b><small>${e(h ? h.ad : '')}${d.sure ? ' · ' + d.sure + ' dk' : ''}${d.konum && d.konumBit ? ' · konum alındı' : d.konum ? ' · konum alındı' : ''}${d.meb ? ' · MEBBİS’te' : ''}</small></div>
      ${o ? rozet(o.durum === 'onay' ? 'Onayladın' : 'İtiraz ettin', o.durum === 'onay' ? 'yesil' : 'kirmizi') : sorulur ? `<span class="og-defter-dg"><button class="dg dg-ana dg-kucuk" data-og-onay="${d.id}">Yapıldı</button><button class="dg dg-cizgi dg-kucuk" data-og-itiraz="${d.id}">Yapılmadı</button></span>` : ''}</li>`; };
  return modul('defter', { ikon: 'kalem', baslik: 'Ders defterin', ozet: bekleyen ? `${bekleyen} dersi onaylaman bekleniyor` : `${onay}/${l.length} ders onaylandı`, sag: bekleyen ? rozet(bekleyen + ' onay', 'uyari') : '', acik: bekleyen > 0, ton: bekleyen ? 'og-modul-dikkat' : '' },
    `<div class="og-ozet"><div><small>Sözleşmede</small><b class="sayi">${S0.direksiyon + (k.ekDersHakki || 0)}</b></div><div><small>Yapıldı</small><b class="sayi">${l.length}</b></div><div><small>Onayladın</small><b class="sayi" style="color:var(--yesil)">${onay}</b></div>${itiraz ? `<div><small>İtiraz</small><b class="sayi" style="color:var(--kirmizi)">${itiraz}</b></div>` : `<div><small>MEBBİS’te</small><b class="sayi">${l.filter(d => d.meb).length}</b></div>`}</div>
    ${l.length ? `<ul class="og-defter">${l.slice(0, 20).map(satir).join('')}</ul>` : '<p class="og-bos">Henüz yapılan direksiyon dersi yok.</p>'}
    <p class="og-not">Her dersten sonra “Yapıldı”ya dokun. Ders yapılmadıysa ya da süresi eksikse “Yapılmadı” de; kurs müdürüne hemen iletilir.</p>`);
}

/* ---------- Sınavlar ---------- */
export function sinavlarHtml(k) {
  const hak = S.kurs.sinavHak || 4, tu = S.kurs.tekrarUcret || {};
  const kart = (id, tur, x, sonraki, getir, ucret) => {
    if (x && x.sonuc === 'Geçti') return `<div class="og-satir og-satir-tamam"><span class="og-m-ik">${ik('tik')}</span><div><b>${tur}</b><small>Geçtin${x.puan ? ' · ' + x.puan + ' puan' : ''}</small></div>${rozet('Tamam', 'yesil')}</div>`;
    const kalan = Math.max(0, hak - ((x && x.hak) || 0));
    return modul(id, { ikon: 'sinav', baslik: tur, ozet: sonraki ? `${gunK(sonraki.tarih)} ${sonraki.saat} · ${e(sonraki.yer)}` : 'Henüz tarih yok', sag: sonraki ? rozet(goreli(sonraki.tarih), 'mavi') : rozet('Bekliyor', 'notr'), acik: !!sonraki && fark(sonraki.tarih) <= 7 },
      `${sonraki ? `<p class="og-yer">${ik('harita')}${e(sonraki.yer)}</p>` : `<p class="og-not" style="margin:0 0 10px">${tur === 'e-Sınav' ? 'Teorik derslerin bitince kurs e-sınav randevunu alır.' : 'Direksiyon derslerin bitince kurs sınav tarihini bildirir.'}</p>`}
      <div class="og-satirlar"><div><span>Kalan sınav hakkın</span><b>${kalan} / ${hak}</b></div><div><span>Kalırsan tekrar sınav ücreti</span><b>${ucret ? tl(ucret) : '—'}</b></div></div>
      <p class="et" style="margin-top:12px">Yanına al</p><ul class="og-getir">${getir.map(g => `<li>${isaret('tamam', 16)}${e(g)}</li>`).join('')}</ul>`);
  };
  const sonr = tur => S.sinavlar.filter(s => s.tur === tur && s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  return kart('esinav', 'e-Sınav', k.esinav, sonr('e-Sınav'), ['T.C. kimlik kartın (fotokopi geçmez)', 'e-Sınav ücreti dekontu', 'Sınavdan 30 dakika önce sınav merkezinde ol'], tu.esinav)
    + (SINIFLAR[k.sinif].direksiyon ? kart('dsinav', 'Direksiyon sınavı', k.dsinav, sonr('Direksiyon'), ['T.C. kimlik kartın', 'Gözlük ya da lens kullanıyorsan yanında olsun', 'Sınavdan 30 dakika önce sınav yerinde ol'], tu.dsinav) : '');
}
// Son deneme direksiyon sınavı (öğretmenin resmî formla yaptığı prova)
export function dirDenemeHtml(k) {
  const dd = (k.dDeneme || []).slice(-1)[0]; if (!dd) return '';
  const gecti = dd.sonuc === 'Geçti';
  return `<div class="kart og-kart og-deneme ${gecti ? 'gecti' : 'kaldi'}"><div class="og-bas"><div><small>Deneme direksiyon sınavın · ${tarih(dd.tarih)}</small><b>${gecti ? 'Gerçek sınavda geçerdin' : 'Gerçek sınavda kalırdın'}</b></div>${rozet(gecti ? 'Geçti' : 'Kaldı', gecti ? 'yesil' : 'kirmizi')}</div>
    ${dd.hatalar.length ? `<p class="et">Çalışman gerekenler</p><ul class="og-getir">${dd.hatalar.slice(0, 6).map(h => `<li>${isaret(h.renk === 'k' ? 'yasak' : 'uyari', 16)}${e(h.metin)}</li>`).join('')}</ul>` : '<p class="og-not">Hiç hata yapmadın.</p>'}${dd.not ? `<p class="og-not" style="margin-top:6px">Öğretmenin notu: “${e(dd.not)}”</p>` : ''}</div>`;
}

/* ---------- Ödemeler ---------- */
// Hesap dökümü: kurs ücreti, ek kalemler, ödemeler ve iade satır satır, yürüyen bakiyeyle (ek ücret ve iade anlaşmazlıklarını önler)
function dokumTablo(k) {
  const o = k.odeme, l = [[k.kayit, 'Kurs ücreti · ' + SINIFLAR[k.sinif].ad, o.toplam, 0]];
  (o.ekler || []).forEach(x => l.push([x.tarih || k.kayit, x.ad, x.tutar, 0]));
  if (o.pesin) l.push([o.pesinTarih || k.kayit, 'Peşinat ödendi', 0, o.pesin]);
  o.taksitler.forEach((t, i) => { const ad = t.aciklama === 'Peşinat' ? 'Peşinat' : (t.aciklama || (i + 1) + '. taksit'); if (t.odendi) l.push([t.odendi === true ? t.vade : t.odendi, ad + ' ödendi', 0, t.tutar]); else if (t.kismi) l.push([t.vade, ad + ' · kısmi ödeme', 0, t.kismi]); });
  (o.ekler || []).filter(x => x.odendi).forEach(x => l.push([x.odendi === true ? (x.tarih || k.kayit) : x.odendi, x.ad + ' ödendi', 0, x.tutar]));
  if (o.iade) l.push([o.iadeTarih || gun(0), 'İade', 0, -o.iade]);
  l.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || (b[2] ? 1 : 0) - (a[2] ? 1 : 0));
  let b = 0;
  return `<div class="tablo-kap"><table class="tablo"><thead><tr><th>Tarih</th><th>Açıklama</th><th style="text-align:right">Borç</th><th style="text-align:right">Ödeme</th><th style="text-align:right">Kalan</th></tr></thead><tbody>${l.map(([t, ad, borc, od]) => { b += borc - od; return `<tr><td class="mono">${tarih(t)}</td><td>${e(ad)}</td><td class="sayi" style="text-align:right">${borc ? tl(borc) : ''}</td><td class="sayi" style="text-align:right;color:var(--yesil)">${od ? tl(od) : ''}</td><td class="sayi" style="text-align:right">${tl(Math.max(0, b))}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="og-not">Burada olmayan bir ücret senden istenirse kursa sor. Sınav tekrar ücreti ve ek ders gibi kalemler eklenince bu listede görünür.</p>`;
}
export function hesapDokumu(k) {
  return `<details class="kart og-kart"><summary class="og-bas" style="cursor:pointer"><div><small>Hesap dökümün</small><b>Kalem kalem borç ve ödemeler</b></div></summary>${dokumTablo(k)}</details>`;
}
export const sonrakiTaksit = k => k.odeme.taksitler.map((t, i) => ({ t, i })).find(x => !x.t.odendi && !x.t.iptal);
const taksitAd = (k, i) => { const l = k.odeme.taksitler, t = l[i]; return t.aciklama === 'Peşinat' ? 'Peşinat' : (i + 1 - (l[0] && l[0].aciklama === 'Peşinat' ? 1 : 0)) + '. taksit'; };
export function odemelerHtml(k) {
  const toplam = k.odeme.toplam + ekToplam(k), od = odenen(k), kalan = kalanBorc(k), sn = sonrakiTaksit(k);
  const makbuzlar = S.hareket.filter(h => h.kursiyer === k.id && h.tur === 'Gelir').sort((a, b) => b.tarih.localeCompare(a.tarih));
  const gec = sn && fark(sn.t.vade) < 0;
  return `<section class="kart og-kart og-para"><small>Kalan borcun</small><b class="og-para-tutar sayi ${kalan ? '' : 'tamam'}">${tl(kalan)}</b>${ilerleme(od, toplam, 'yesil')}
      <div class="og-para-alt"><span>Ödenen <b class="sayi">${tl(od)}</b></span><span>Toplam <b class="sayi">${tl(toplam)}</b></span></div>
      ${sn ? `<div class="og-sonraki ${gec ? 'gecikti' : ''}"><div><b>${taksitAd(k, sn.i)} · ${tl(sn.t.tutar - (sn.t.kismi || 0))}</b><small>Vade ${tarih(sn.t.vade)}${gec ? ' · gecikti' : fark(sn.t.vade) <= 7 ? ' · ' + goreli(sn.t.vade).toLocaleLowerCase('tr') : ''}</small></div><button class="dg dg-ana dg-kucuk" data-ode="${sn.i}">Nasıl öderim?</button></div>` : '<p class="og-tamam">Tüm ödemelerin tamam.</p>'}</section>
    <section class="kart og-kart"><div class="og-bas"><div><small>Ödeme planın</small><b>${k.odeme.taksitler.some(t => t.aciklama !== 'Peşinat') ? k.odeme.taksitler.filter(t => t.aciklama !== 'Peşinat').length + ' taksit' : 'Peşin'}</b></div></div>
      <div class="og-taksitler">
      ${k.odeme.pesin ? `<div class="og-taksit odendi"><span class="no">P</span><div><b>Peşinat</b><small>${tarih(k.odeme.pesinTarih)}</small></div><span class="sayi">${tl(k.odeme.pesin)}</span><span class="og-durum">${ik('tik')}</span></div>` : ''}
      ${k.odeme.taksitler.map((t, i) => { const g = !t.odendi && !t.iptal && fark(t.vade) < 0; return `<div class="og-taksit ${t.odendi ? 'odendi' : t.iptal ? 'iptal' : g ? 'gecikti' : ''}"><span class="no">${t.aciklama === 'Peşinat' ? 'P' : taksitAd(k, i).split('.')[0]}</span><div><b>${taksitAd(k, i)}</b><small>Vade ${tarih(t.vade)}${g ? ' · gecikti' : ''}${t.kismi ? ' · ' + tl(t.kismi) + ' ödendi' : ''}</small></div><span class="sayi">${tl(t.tutar)}</span>${t.odendi ? `<span class="og-durum">${ik('tik')}</span>` : t.iptal ? rozet('İptal', 'notr') : `<button class="dg dg-cizgi dg-kucuk" data-ode="${i}">Öde</button>`}</div>`; }).join('')}
      ${(k.odeme.ekler || []).map(x => `<div class="og-taksit ${x.odendi ? 'odendi' : ''}"><span class="no">+</span><div><b>${e(x.ad)}</b><small>Ek kalem</small></div><span class="sayi">${tl(x.tutar)}</span>${x.odendi ? `<span class="og-durum">${ik('tik')}</span>` : rozet('Kursta', 'sari')}</div>`).join('')}</div></section>
    ${S.kurs.iban ? `<section class="kart og-kart og-iban-kart"><div class="og-bas"><div><small>Havale / EFT · ${e(S.kurs.ad)}</small><b class="mono og-iban">${e(S.kurs.iban)}</b></div><button class="dg dg-cizgi dg-kucuk" data-og-iban>Kopyala</button></div><p class="og-not">Açıklamaya adını ve soyadını yaz. Ödemen kursa ulaşınca makbuzun burada görünür.</p></section>` : ''}
    ${modul('makbuz', { ikon: 'belge', baslik: 'Makbuzların', ozet: makbuzlar.length ? makbuzlar.length + ' ödeme · son ' + tarih(makbuzlar[0].tarih) : 'Henüz ödeme yok' },
      makbuzlar.length ? `<ul class="og-defter">${makbuzlar.map(h => `<li class="og-defter-satir"><div style="flex:1;min-width:0"><b class="sayi">${tl(h.tutar)}</b><small>${tarih(h.tarih)} · ${e(h.yontem || '')}${h.no ? ' · ' + e(h.no) : ''}</small></div><button class="dg dg-hafif dg-kucuk" data-og-makbuz="${h.id}">Makbuz</button></li>`).join('')}</ul>` : '<p class="og-bos">Ödeme yapınca makbuzun burada görünür.</p>')}
    ${modul('dokum', { ikon: 'rapor', baslik: 'Hesap dökümün', ozet: 'Kalem kalem borç ve ödemeler' }, dokumTablo(k))}`;
}

/* ---------- Belgeler ---------- */
export const eksikBelge = k => EVRAKLAR.filter(([x]) => !k.evrak[x] && !(k.evrakYuklenen || {})[x] && x !== 'sozlesme').length;
export function belgelerHtml(k) {
  const y = k.evrakYuklenen || {}, tamam = EVRAKLAR.filter(([x]) => k.evrak[x]).length, eksik = EVRAKLAR.length - tamam;
  return modul('evrak', { ikon: 'belge', baslik: 'Kayıt evrakın', ozet: eksik ? `${eksikBelge(k) ? eksikBelge(k) + ' belge bekleniyor' : 'Kurs kontrol ediyor'}` : 'Hepsi tamam', sag: rozet(tamam + '/' + EVRAKLAR.length, eksik ? 'uyari' : 'yesil'), acik: eksik > 0, ton: eksikBelge(k) ? 'og-modul-dikkat' : '' },
    `${EVRAKLAR.map(([key, t]) => `<div class="evrak og-evrak"><span class="durum ${k.evrak[key] ? 'var' : y[key] ? 'bekliyor' : 'yok'}">${ik(k.evrak[key] ? 'tik' : y[key] ? 'saat' : 'kapat')}</span><span style="flex:1;color:var(--murekkep)">${t}${y[key] && !k.evrak[key] ? `<small>Yüklendi ${tarih(y[key].tarih)} · kurs kontrol ediyor</small>` : ''}</span>${k.evrak[key] ? '' : key === 'sozlesme' ? rozet('Kursta imzalanır', 'uyari') : `<label class="dg dg-cizgi dg-kucuk og-yukle">${ik(y[key] ? 'sifirla' : 'arti')}${y[key] ? 'Yenile' : 'Yükle'}<input type="file" accept="image/*,application/pdf" capture="environment" data-og-evrak="${key}" hidden></label>`}</div>`).join('')}
    <p class="og-not">Belgenin fotoğrafını buradan yükle ya da kursun WhatsApp numarasına gönder; kurs kontrol edince burada tamamlanır. Asıllarını ilk geldiğinde kursa teslim et.</p>`)
    + `<section class="kart og-kart"><div class="og-bas"><div><small>Belgelerin</small><b>Sözleşme ve formlar</b></div></div>
      <ul class="og-defter">${[['sozlesme', 'Kurs sözleşmen', 'Ücret, taksit planı ve şartlar'], ['takip', 'Direksiyon eğitimi takip formun', SINIFLAR[k.sinif].direksiyon ? k.direksiyon + ' ders işlendi' : ''], ['bilgi', 'Bilgi formun', 'Kayıtta verdiğin bilgiler']].filter(x => x[0] !== 'takip' || SINIFLAR[k.sinif].direksiyon).map(([tur, ad, alt]) => `<li class="og-defter-satir"><span class="og-m-ik">${ik('belge')}</span><div style="flex:1;min-width:0"><b>${ad}</b><small>${e(alt)}</small></div><button class="dg dg-hafif dg-kucuk" data-og-belge="${tur}">Aç</button></li>`).join('')}</ul></section>`;
}

/* ---------- konu anlatımı ---------- */
// İçerik ayrı dosyada; yalnız açılınca yüklenir (açılış hızını etkilemesin)
let dersYuk = null;
const dersleriYukle = () => dersYuk || (dersYuk = import('./dersler.js?v=100').then(m => m.DERSLER).catch(() => ({})));
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
    altlik: `${ogrOzellik('sesli') && 'speechSynthesis' in window && d ? `<button class="dg dg-hafif" data-og-dinle style="margin-right:auto">${ik('ses')}Sesli dinle</button>` : ''}<button class="dg dg-cizgi" data-og-test="${key}">${ik('sinav')}Konu testi</button>${sonraki ? `<button class="dg dg-ana" data-og-sonraki="${sonraki}">Okudum, sonraki konu →</button>` : `<button class="dg dg-ana" data-og-bitir>Okudum</button>`}`,
    onAc(p) {
      // video kapağına tıklanınca oynatıcı yüklenir (sayfa hızlı açılır, YouTube izlemeden önce bağlanmaz)
      p.querySelectorAll('[data-og-video]').forEach(b => b.addEventListener('click', () => { const f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.dataset.ogVideo) + '?autoplay=1&rel=0'; f.title = b.getAttribute('aria-label'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin'; b.replaceWith(f); }));
      const isaretle = () => { k.okunan = k.okunan || {}; if (!k.okunan[id]) { k.okunan[id] = gun(0); kaydet(); } };
      // sesli dinleme: telefonun Türkçe sesiyle okunur (internet ya da ücret gerekmez); pencere kapanınca durur
      const dn = p.querySelector('[data-og-dinle]'), sus = () => { try { speechSynthesis.cancel(); } catch (x) { } };
      sus();
      if (dn) dn.addEventListener('click', () => {
        if (speechSynthesis.speaking) { sus(); dn.lastChild.textContent = 'Sesli dinle'; return; }
        const ses = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang));
        [baslik, ...d.paragraflar, ...(d.akilda && d.akilda.length ? ['Akılda kalsın.', ...d.akilda] : [])].forEach((t, i, l) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'tr-TR'; if (ses) u.voice = ses; u.rate = 0.95; if (i === l.length - 1) u.onend = () => { dn.lastChild.textContent = 'Sesli dinle'; }; speechSynthesis.speak(u); });
        dn.lastChild.textContent = 'Durdur';
      });
      p.addEventListener('click', ev => { if (ev.target.closest('[data-kapat], [data-og-sonraki], [data-og-bitir], [data-og-test]')) sus(); });
      const izle = setInterval(() => { if (!document.body.contains(p)) { sus(); clearInterval(izle); } }, 800);
      const sn = p.querySelector('[data-og-sonraki]'); if (sn) sn.addEventListener('click', () => { isaretle(); dersAc(k, sn.dataset.ogSonraki, yenile); });
      const bt = p.querySelector('[data-og-bitir]'); if (bt) bt.addEventListener('click', () => { isaretle(); kapatPencere(); yenile(); });
      p.querySelector('[data-og-test]').addEventListener('click', () => { isaretle(); kapatPencere(); const b = document.querySelector(`[data-test-basla="konu"][data-konu="${key}"]`); if (b) b.click(); else yenile(); });
    },
  });
}

/* ---------- olaylar ---------- */
// direksiyon hazırlık bölümü ayrı dosyada (resmî form maddeleriyle); yer tutucu varsa yüklenir
const dirYukle = () => import('./direksiyon.js?v=100');
export function ogBagla(kap, k, yenile) {
  const yer = kap.querySelectorAll('[data-dir-yer]'); if (yer.length) dirYukle().then(m => yer.forEach(y => { y.innerHTML = m.direksiyonHtml(k, true); })).catch(() => { });
  kap.addEventListener('toggle', ev => { const m = ev.target; if (!m.matches || !m.matches('[data-modul]')) return; const id = m.dataset.modul; if (m.open) { ACIK.add(id); KAPALI.delete(id); } else { ACIK.delete(id); KAPALI.add(id); } }, true);
  kap.addEventListener('click', ev => {
    const t = ev.target;
    const dr = t.closest('[data-dir]'); if (dr) return dirYukle().then(m => m.direksiyonAc(k, dr.dataset.dir, yenile));
    if (t.closest('[data-ikaz]')) return import('./ikaz.js?v=100').then(m => m.ikazAc());
    if (t.closest('[data-motor4]')) return import('./motor.js?v=100').then(m => m.motorAc());
    if (t.closest('[data-debriyaj]')) return import('./motor.js?v=100').then(m => m.debriyajAc());
    if (t.closest('[data-tehlike]')) return import('./tehlike.js?v=100').then(m => m.tehlikeAc(k));
    if (t.closest('[data-kur-android]') && window.__kurulum) { window.__kurulum.prompt(); window.__kurulum.userChoice.finally(() => { window.__kurulum = null; yenile(); }); return; }
    const od = t.closest('[data-og-ders]'); if (od) return dersAc(k, od.dataset.ogDers, yenile);
    const yz = t.closest('[data-og-yildiz]'); if (yz) { const kart = yz.closest('.og-degerlendir'), n = +yz.dataset.ogYildiz; kart.dataset.puan = n; kart.querySelectorAll('[data-og-yildiz]').forEach(b => b.classList.toggle('secili', +b.dataset.ogYildiz <= n)); kart.querySelector('[data-og-puan]').disabled = false; return; }
    const oo = t.closest('[data-og-onay]'); if (oo) { const d = S.dersler.find(x => x.id === oo.dataset.ogOnay); if (!d) return; d.ogrenciOnay = { durum: 'onay', tarih: gun(0) }; islem('Öğrenci dersi onayladı', tamAd(k) + ' · ' + d.tarih + ' ' + d.saat); kaydet(); bildir('Teşekkürler, ders onaylandı'); return yenile(); }
    const oi = t.closest('[data-og-itiraz]'); if (oi) { const d = S.dersler.find(x => x.id === oi.dataset.ogItiraz); if (!d) return;
      return pencere({ baslik: 'Ders yapılmadı mı?', icerik: `<p style="font-size:14.5px">${tarih(d.tarih)} ${d.saat} dersi için ne oldu? Kurs müdürü görür.</p><textarea class="girdi" data-itiraz-not rows="3" style="width:100%;margin-top:8px" placeholder="Örn. ders hiç yapılmadı / 20 dakika sürdü"></textarea>`, altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-itiraz-gonder>Gönder</button>',
        onAc(p) { p.querySelector('[data-itiraz-gonder]').addEventListener('click', () => { d.ogrenciOnay = { durum: 'itiraz', not: p.querySelector('[data-itiraz-not]').value.trim().slice(0, 300), tarih: gun(0) }; islem('Öğrenci derse itiraz etti', tamAd(k) + ' · ' + d.tarih + ' ' + d.saat); if (!(oturum.kullanici && oturum.kullanici.rol === 'ogrenci')) (S.devredilen = S.devredilen || []).unshift({ ad: tamAd(k), kanal: 'Ders defteri', konu: 'Ders itirazı', mesaj: d.tarih + ' ' + d.saat + ' dersi yapılmadı diyor' + (d.ogrenciOnay.not ? ': ' + d.ogrenciOnay.not : ''), neden: 'Öğrenci dersi onaylamadı', saat: new Date().toTimeString().slice(0, 5), bildirim: [] }); kaydet(); kapatPencere(); bildir('İtirazın kurs müdürüne iletildi'); yenile(); }); } }); }
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
