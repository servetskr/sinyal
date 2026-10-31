import { S, BUGUN, iso, kapaliGun, ASAMALAR, KAYNAKLAR, kursiyer, tamAd, eksikEvrak, gecikenler, gecikenTutar, memnuniyet, sb, sbDers } from './veri.js?v=109';
import { e, tl, sayi, rozet, asamaRozet, olcumler, sekmeler, ilerleme, bos, ekranNotu, ayAdi } from './ui.js?v=109';
import { riskliler } from './risk.js?v=109';

/* ================= ANALİZ =================
   Öğrenci, usta öğretici ve kurs göstergeleri tek sayfada. Sekme hash'ten gelir: #/analiz/<ogrenci|usta|kurs> */
const SEKMELER = [['ogrenci', 'Öğrenciler'], ['usta', 'Usta öğreticiler'], ['kurs', 'Kurs']];
let sekme = 'ogrenci';

const yuzde = (a, b) => b ? Math.round(a / b * 100) : null;
const yzMetin = y => y == null ? '—' : '%' + y;
const virgul = (n, h = 1) => n == null ? '—' : n.toFixed(h).replace('.', ',');
const ortala = l => l.length ? l.reduce((a, x) => a + x, 0) / l.length : null;
// n ay önceki ayın 'YYYY-AA' anahtarı (0: bu ay)
const ayKey = n => { const d = new Date(BUGUN); d.setDate(1); d.setMonth(d.getMonth() - n); return iso(d).slice(0, 7); };
const ayAd = n => { const d = new Date(BUGUN); d.setDate(1); d.setMonth(d.getMonth() - n); return ayAdi(d.getMonth(), true); };
const ayda = (t, n) => String(t || '').slice(0, 7) === ayKey(n);
const gunFarki = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const kisiLink = k => `<a href="#/kursiyer/${encodeURIComponent(k.id)}" style="color:var(--murekkep);font-weight:700">${e(tamAd(k))}</a>`;
const olcLink = (href, t) => `<a href="${href}" style="color:var(--sari);font-weight:700">${t}</a>`;
const soluk = m => `<small style="display:block;color:var(--soluk)">${m}</small>`;

// Yatay çubuk satırı: etiket, değer, ilerleme
function cubuk(ad, n, max, { href, tur = '', deger } = {}) {
  return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px;margin-bottom:5px"><span>${href ? `<a href="${href}" style="color:inherit">${ad}</a>` : ad}</span><b class="sayi" style="color:var(--murekkep);white-space:nowrap">${deger ?? sayi(n)}</b></div>${ilerleme(n, max, tur)}</div>`;
}
function kart(baslik, alt, govde) {
  return `<div class="kart"><div class="kart-bas"><h3>${e(baslik)}</h3>${alt ? `<small>${alt}</small>` : ''}</div>${govde}</div>`;
}
// Sınava giren kursiyerlerin son kaydı ({sonuc, hak}) üzerinden geçme oranları
function sinavOzet(l, alan) {
  const giren = l.filter(k => k[alan] && k[alan].sonuc);
  const gecen = giren.filter(k => k[alan].sonuc === 'Geçti');
  const ilk = gecen.filter(k => (k[alan].hak || 1) === 1);
  return { giren: giren.length, gecen: gecen.length, ilk: ilk.length, oran: yuzde(gecen.length, giren.length), ilkOran: yuzde(ilk.length, giren.length) };
}
// Ehliyete ulaştığı gün: geçilen son sınavın tarihi
const ehliyetTarihi = k => k.dsinav && k.dsinav.sonuc === 'Geçti' && k.dsinav.tarih ? k.dsinav.tarih : (k.esinav && k.esinav.sonuc === 'Geçti' && k.esinav.tarih && k.asama === 'Ehliyet' ? k.esinav.tarih : null);

/* ---------- Öğrenciler ---------- */
function ogrenciler() {
  const liste = sb(S.kursiyerler || []);
  if (!liste.length) return kart('Öğrenciler', '', bos('Henüz kursiyer yok', 'İlk kursiyeri kaydettiğinizde aşama, sınav ve devam bilgileri burada görünür.', '<a class="dg dg-ana" href="#/kursiyerler">Kursiyerlere git</a>'));
  const acik = liste.filter(k => !k.kapali);
  const aktif = acik.filter(k => k.asama !== 'Ehliyet');
  const asama = ASAMALAR.map(a => [a, acik.filter(k => k.asama === a).length]);
  const maxA = Math.max(1, ...asama.map(x => x[1]));
  const evrak = aktif.filter(k => k.evrak && eksikEvrak(k).length);
  const geciken = liste.filter(k => k.odeme && gecikenler(k).length);
  const gecikenToplam = geciken.reduce((a, k) => a + gecikenTutar(k), 0);
  const es = sinavOzet(liste, 'esinav'), ds = sinavOzet(liste, 'dsinav');
  const sureler = liste.map(k => { const t = ehliyetTarihi(k); return t && k.kayit ? gunFarki(k.kayit, t) : null; }).filter(x => x != null && x >= 0);
  const ortGun = sureler.length ? Math.round(ortala(sureler)) : null;
  const riskli = riskliler(aktif);
  const dersler = sbDers(S.dersler || []);
  const gelmedi = {}; dersler.forEach(d => { if (d.durum === 'Gelmedi') gelmedi[d.kursiyer] = (gelmedi[d.kursiyer] || 0) + 1; });
  const devamsiz = Object.entries(gelmedi).map(([id, n]) => [kursiyer(id), n]).filter(([k]) => k).sort((a, b) => b[1] - a[1]);
  const yapilanVeyaGelmedi = dersler.filter(d => ['Yapıldı', 'Gelmedi'].includes(d.durum)).length;
  const gelmediToplam = dersler.filter(d => d.durum === 'Gelmedi').length;

  const sinavSatir = (ad, o) => o.giren ? `${cubuk(ad + ' · geçen', o.gecen, o.giren, { tur: 'yesil', deger: `${o.gecen}/${o.giren} · ${yzMetin(o.oran)}` })}${cubuk(ad + ' · ilk denemede geçen', o.ilk, o.giren, { deger: `${o.ilk}/${o.giren} · ${yzMetin(o.ilkOran)}` })}` : `<p style="font-size:14px;color:var(--soluk);margin-bottom:12px">${ad}: henüz sonuç girilmedi.</p>`;

  return `${olcumler([
    ['Aktif kursiyer', sayi(aktif.length), `${acik.filter(k => k.asama === 'Ehliyet').length} ehliyet aldı`],
    ['Sınav riski', sayi(riskli.length), riskli.length ? `${riskli.filter(x => x.r.puan >= 50).length} yüksek riskli` : 'Riskli kursiyer yok'],
    ['Kayıttan ehliyete', ortGun != null ? ortGun + ' gün' : '—', sureler.length ? `${sureler.length} kursiyerin ortalaması` : 'Henüz ehliyet alan yok'],
    ['Eksik evrak', sayi(evrak.length), evrak.length ? olcLink('#/meb/evrak', 'Evrak kontrolü') : 'Evraklar tamam'],
    ['Geciken ödeme', sayi(geciken.length), geciken.length ? `${tl(gecikenToplam)} · ${olcLink('#/kasa/geciken', 'Gecikenler')}` : 'Geciken taksit yok'],
  ])}
  <div class="ara-bosluk"></div>
  <div class="izgara iz-2">
    ${kart('Aşamalara göre', `${acik.length} açık kayıt`, `<div class="kart-govde">${asama.map(([a, n]) => cubuk(asamaRozet(a), n, maxA, { href: '#/kursiyerler/' + encodeURIComponent(a), tur: a === 'Ehliyet' ? 'yesil' : '' })).join('')}</div>`)}
    ${kart('Sınav başarısı', 'Sınava girenlerin son sonucu', `<div class="kart-govde">${sinavSatir('e-Sınav', es)}${sinavSatir('Direksiyon sınavı', ds)}
      ${sureler.length ? `<p style="font-size:13px;color:var(--soluk)">Kayıttan ehliyete en kısa ${Math.min(...sureler)}, en uzun ${Math.max(...sureler)} gün.</p>` : ''}</div>`)}
  </div>
  <div class="ara-bosluk"></div>
  <div class="izgara iz-2">
    ${kart('Sınava hazırlık · riskli kursiyerler', 'Deneme sınavı, beceri puanı ve devam bilgisinden', riskli.length ? `<ul class="liste">${riskli.slice(0, 8).map(({ k, r }) => `<li style="align-items:flex-start"><div style="flex:1;min-width:0">${kisiLink(k)}${soluk(e(r.tur) + (r.nedenler[0] ? ' · ' + e(r.nedenler[0]) : ''))}</div><div class="sag">${rozet(r.puan + ' · ' + r.seviye, r.puan >= 50 ? 'kirmizi' : 'sari')}</div></li>`).join('')}</ul>${riskli.length > 8 ? `<p style="font-size:13px;padding:4px 20px 16px"><a href="#/sinavlar/risk" style="color:var(--levha);font-weight:700">Tümünü gör (${riskli.length})</a></p>` : ''}` : bos('Riskli kursiyer görünmüyor', 'Deneme sınavı ve ders puanı girildikçe sınavda zorlanabilecek kursiyerler burada listelenir.'))}
    ${kart('Devamsızlık · gelmediği dersler', yapilanVeyaGelmedi ? `Gelinmeyen ders oranı: ${yzMetin(yuzde(gelmediToplam, yapilanVeyaGelmedi))}` : '', devamsiz.length ? `<ul class="liste">${devamsiz.slice(0, 8).map(([k, n]) => `<li><div style="flex:1;min-width:0">${kisiLink(k)}${soluk(e(k.asama || ''))}</div><div class="sag">${rozet(n + ' ders', n >= 3 ? 'kirmizi' : n === 2 ? 'sari' : 'notr')}</div></li>`).join('')}</ul>` : bos('Gelmeyen ders yok', 'Usta öğretici bir dersi “Gelmedi” olarak işaretlediğinde kursiyer burada görünür.'))}
  </div>`;
}

/* ---------- Usta öğreticiler ---------- */
function ustalar() {
  const ustaL = sb(S.egitmenler || []);
  if (!ustaL.length) return kart('Usta öğreticiler', '', bos('Henüz usta öğretici yok', 'Usta öğreticileri ekledikten sonra ders, memnuniyet ve sınav başarıları burada karşılaştırılır.', '<a class="dg dg-ana" href="#/filo">Ekip ve araçlara git</a>'));
  const dersler = sbDers(S.dersler || []), ogr = sb(S.kursiyerler || []);
  const satir = ustaL.map(h => {
    const d = dersler.filter(x => x.egitmen === h.id), yap = d.filter(x => x.durum === 'Yapıldı');
    const sure = yap.map(x => x.sure).filter(x => typeof x === 'number' && x > 0);
    const m = memnuniyet(h.id), ds = sinavOzet(ogr.filter(k => k.egitmen === h.id), 'dsinav');
    return {
      h, buAy: yap.filter(x => ayda(x.tarih, 0)).length, gecenAy: yap.filter(x => ayda(x.tarih, 1)).length,
      gelmedi: d.filter(x => x.durum === 'Gelmedi').length, itiraz: d.filter(x => x.ogrenciOnay && x.ogrenciOnay.durum === 'itiraz').length,
      sure: sure.length ? Math.round(ortala(sure)) : null, kisa: sure.filter(x => x < 40).length, m, ds,
    };
  }).sort((a, b) => b.buAy - a.buAy || b.gecenAy - a.gecenAy || String(a.h.ad).localeCompare(String(b.h.ad), 'tr'));
  const maxD = Math.max(1, ...satir.map(x => Math.max(x.buAy, x.gecenAy)));
  const tumM = memnuniyet(), buAyT = satir.reduce((a, x) => a + x.buAy, 0), gecenT = satir.reduce((a, x) => a + x.gecenAy, 0);
  const itirazT = satir.reduce((a, x) => a + x.itiraz, 0);
  const dsT = sinavOzet(ogr.filter(k => ustaL.some(h => h.id === k.egitmen)), 'dsinav');
  const puanRenk = p => p == null ? 'var(--soluk)' : p >= 4.5 ? 'var(--yesil)' : p >= 3.8 ? 'var(--murekkep)' : 'var(--kirmizi)';

  return `${olcumler([
    [`Ders · ${ayAd(0)}`, sayi(buAyT), `${ayAd(1)}: ${sayi(gecenT)}`],
    ['Öğrenci memnuniyeti', tumM.ort != null ? virgul(tumM.ort) + ' / 5' : '—', tumM.n ? `${sayi(tumM.n)} değerlendirme` : 'Henüz puan verilmedi'],
    ['Direksiyon sınavı', yzMetin(dsT.oran), dsT.giren ? `${dsT.gecen}/${dsT.giren} geçti · ilk denemede ${yzMetin(dsT.ilkOran)}` : 'Henüz sonuç yok'],
    ['Ders itirazı', sayi(itirazT), itirazT ? 'Öğrenci “ders yapılmadı” dedi' : 'İtiraz yok'],
  ])}
  <div class="ara-bosluk"></div>
  ${kart('Usta öğretici karşılaştırması', `Yapılan direksiyon dersleri · ${ayAd(0)} ve ${ayAd(1)}`, `<div class="tablo-kap" style="margin-top:10px"><table class="tablo"><thead><tr><th>Usta öğretici</th><th style="min-width:150px">${e(ayAd(0))}</th><th class="sag">${e(ayAd(1))}</th><th class="sag">Ort. süre</th><th class="sag">Memnuniyet</th><th style="min-width:140px">Direksiyon sınavı</th><th class="sag">Gelmedi</th><th class="sag">İtiraz</th></tr></thead><tbody>
    ${satir.map(x => `<tr>
      <td><b style="color:var(--murekkep)">${e(x.h.ad)}</b>${x.h.siniflar ? soluk(e([].concat(x.h.siniflar).join(', '))) : ''}</td>
      <td><span class="sayi" style="font-size:13px">${x.buAy} ders</span>${ilerleme(x.buAy, maxD)}</td>
      <td class="sag sayi">${x.gecenAy}</td>
      <td class="sag">${x.sure != null ? `<span class="sayi">${x.sure} dk</span>` : '—'}${x.kisa ? soluk(rozet(x.kisa + ' kısa', 'sari')) : ''}</td>
      <td class="sag">${x.m.ort != null ? `<b class="mono" style="color:${puanRenk(x.m.ort)}">${virgul(x.m.ort)}</b>${soluk(x.m.n + ' değerlendirme')}` : '—'}</td>
      <td>${x.ds.giren ? `<span class="sayi" style="font-size:12.5px">${x.ds.gecen}/${x.ds.giren} · ${yzMetin(x.ds.oran)}</span>${ilerleme(x.ds.gecen, x.ds.giren, x.ds.oran >= 75 ? 'yesil' : 'sari')}${soluk('İlk denemede ' + yzMetin(x.ds.ilkOran))}` : '<span style="color:var(--soluk)">Sınava giren yok</span>'}</td>
      <td class="sag sayi">${x.gelmedi}</td>
      <td class="sag">${x.itiraz ? rozet(x.itiraz, 'kirmizi') : '<span class="sayi">0</span>'}</td>
    </tr>`).join('')}
  </tbody></table></div>
  <p style="font-size:13px;color:var(--soluk);padding:4px 20px 18px">Sınav başarısı, usta öğreticiye bağlı kursiyerlerin son direksiyon sınavı sonucudur. Ortalama süre, başlat–bitir ile kaydedilen derslerden hesaplanır; 40 dakikanın altı kısa ders sayılır. Gelmedi ve itiraz sayıları tüm kayıtlardandır.</p>`)}`;
}

/* ---------- Kurs ---------- */
function isGunu(n) {
  const d = new Date(BUGUN); d.setDate(1); d.setMonth(d.getMonth() - n);
  const ay = d.getMonth(); let say = 0;
  while (d.getMonth() === ay) { if (!kapaliGun(iso(d))) say++; d.setDate(d.getDate() + 1); }
  return say;
}
function degisim(a, b, iyiYukari = true) {
  if (!b) return a ? rozet('yeni', 'mavi') : '<span style="color:var(--soluk)">—</span>';
  const y = Math.round((a - b) / b * 100);
  if (!y) return rozet('aynı', 'notr');
  return rozet((y > 0 ? '+' : '−') + '%' + Math.abs(y), (y > 0) === iyiYukari ? 'yesil' : 'kirmizi');
}
function kurs() {
  const liste = sb(S.kursiyerler || []), hareket = sb(S.hareket || []), dersler = sbDers(S.dersler || []), ustaSay = sb(S.egitmenler || []).length;
  const adaylar = sb(S.adaylar || []);
  const ay = n => {
    const kayit = liste.filter(k => ayda(k.kayit, n)).length;
    const gelir = hareket.filter(h => h.tur === 'Gelir' && ayda(h.tarih, n)).reduce((a, h) => a + (+h.tutar || 0), 0);
    const gider = hareket.filter(h => h.tur === 'Gider' && ayda(h.tarih, n)).reduce((a, h) => a + (+h.tutar || 0), 0);
    const ders = dersler.filter(d => ['Yapıldı', 'Planlandı'].includes(d.durum) && ayda(d.tarih, n)).length;
    const kapasite = ustaSay * isGunu(n) * 8;
    return { kayit, gelir, gider, net: gelir - gider, ders, kapasite, doluluk: yuzde(ders, kapasite) };
  };
  const b = ay(0), g = ay(1);
  const veriYok = !liste.length && !hareket.length && !dersler.length && !adaylar.length;
  if (veriYok) return kart('Kurs', '', bos('Henüz karşılaştıracak veri yok', 'Kayıt, kasa hareketi ve direksiyon dersi girildikçe bu ay ile geçen ay burada yan yana görünür.', '<a class="dg dg-ana" href="#/kursiyerler">Kursiyerlere git</a>'));

  const kaynakAd = [...KAYNAKLAR, ...new Set(liste.map(k => k.kaynak).filter(x => x && !KAYNAKLAR.includes(x)))];
  const kaynak = kaynakAd.map(ad => ({ ad, n: liste.filter(k => k.kaynak === ad).length, buAy: liste.filter(k => k.kaynak === ad && ayda(k.kayit, 0)).length })).filter(x => x.n);
  const belirsiz = liste.filter(k => !k.kaynak).length;
  if (belirsiz) kaynak.push({ ad: 'Belirtilmemiş', n: belirsiz, buAy: liste.filter(k => !k.kaynak && ayda(k.kayit, 0)).length });
  kaynak.sort((x, y) => y.n - x.n);
  const maxK = Math.max(1, ...kaynak.map(x => x.n));
  const huni = [['Gelen aday', adaylar.length], ['Bilgi verildi', adaylar.filter(a => a.asama && a.asama !== 'Yeni').length], ['Görüşme', adaylar.filter(a => ['Görüşme', 'Kayıt'].includes(a.asama)).length], ['Kayıt', adaylar.filter(a => a.asama === 'Kayıt').length]];
  const kaybedilen = adaylar.filter(a => a.asama === 'Kaybedildi').length, kayitA = huni[3][1];
  const satir = (ad, a, c, bicim, iyi = true) => `<tr><td>${ad}</td><td class="sag sayi" style="font-weight:800">${bicim(a)}</td><td class="sag sayi">${bicim(c)}</td><td class="sag">${degisim(a, c, iyi)}</td></tr>`;
  const dolulukMetin = x => x.kapasite ? `${yzMetin(x.doluluk)}` : '—';

  return `${olcumler([
    [`Yeni kayıt · ${ayAd(0)}`, sayi(b.kayit), `${ayAd(1)}: ${sayi(g.kayit)}`],
    ['Tahsilat', tl(b.gelir), `${ayAd(1)}: ${tl(g.gelir)}`],
    ['Gider', tl(b.gider), `Net: ${tl(b.net)}`],
    ['Direksiyon doluluğu', dolulukMetin(b), b.kapasite ? `${sayi(b.ders)} / ${sayi(b.kapasite)} ders · tahmini` : 'Usta öğretici yok'],
  ])}
  <div class="ara-bosluk"></div>
  ${kart('Bu ay ve geçen ay', `${ayAd(0)} ayın bugüne kadarki kısmıdır; doluluk ay sonuna kadar planlanan dersleri de sayar`, `<div class="tablo-kap" style="margin-top:10px"><table class="tablo"><thead><tr><th>Gösterge</th><th class="sag">${e(ayAd(0))}</th><th class="sag">${e(ayAd(1))}</th><th class="sag">Değişim</th></tr></thead><tbody>
    ${satir('Yeni kayıt', b.kayit, g.kayit, sayi)}
    ${satir('Tahsilat (gelir)', b.gelir, g.gelir, tl)}
    ${satir('Gider', b.gider, g.gider, tl, false)}
    ${satir('Net (gelir − gider)', b.net, g.net, tl)}
    ${satir('Direksiyon dersi (yapılan + planlanan)', b.ders, g.ders, sayi)}
    <tr><td>Direksiyon doluluğu <small style="color:var(--soluk)">(tahmini)</small></td><td class="sag sayi" style="font-weight:800">${dolulukMetin(b)}</td><td class="sag sayi">${dolulukMetin(g)}</td><td class="sag">${b.doluluk != null && g.doluluk != null ? degisim(b.doluluk, g.doluluk) : '—'}</td></tr>
  </tbody></table></div>
  <p style="font-size:13px;color:var(--soluk);padding:4px 20px 18px">Doluluk tahminidir: kapasite = usta öğretici sayısı (${ustaSay}) × ayın iş günü × günde 8 ders. İzinler ve araç durumu hesaba katılmaz.</p>`)}
  <div class="ara-bosluk"></div>
  <div class="izgara iz-2">
    ${kart('Kayıt kaynakları', `${liste.length} kursiyer · parantez içi ${ayAd(0)}`, kaynak.length ? `<div class="kart-govde">${kaynak.map(x => cubuk(e(x.ad), x.n, maxK, { deger: `${x.n} · ${yzMetin(yuzde(x.n, liste.length))}${x.buAy ? ` (${x.buAy})` : ''}` })).join('')}</div>` : bos('Kaynak bilgisi yok', 'Kayıt sırasında kursiyerin kursu nereden duyduğunu seçtiğinizde dağılım burada görünür.'))}
    ${kart('Adaydan kayda dönüşüm', adaylar.length ? `Kayda dönüşen aday: ${yzMetin(yuzde(kayitA, adaylar.length))}` : '', adaylar.length ? `<div class="kart-govde">${huni.map(([t, n], i) => cubuk(t, n, huni[0][1], { tur: i === 3 ? 'yesil' : '', deger: i ? `${n} · ${yzMetin(yuzde(n, huni[0][1]))}` : sayi(n) })).join('')}
      <p style="font-size:13px;color:var(--soluk)">${kaybedilen ? `${kaybedilen} aday kaybedildi. Sonuçlanan adaylarda kayıt oranı ${yzMetin(yuzde(kayitA, kayitA + kaybedilen))}.` : 'Kaybedilen aday yok.'} <a href="#/adaylar" style="color:var(--levha);font-weight:700">Yeni öğrenciler</a></p></div>` : bos('Henüz aday yok', 'WhatsApp, Instagram ya da telefonla gelen adaylar eklendikçe dönüşüm oranı burada görünür.', '<a class="dg dg-cizgi" href="#/adaylar">Yeni öğrenciler</a>'))}
  </div>`;
}

export function analiz(alt) {
  if (alt && SEKMELER.some(([k]) => k === alt)) sekme = alt;
  if (!SEKMELER.some(([k]) => k === sekme)) sekme = 'ogrenci';
  const govde = { ogrenci: ogrenciler, usta: ustalar, kurs }[sekme]();
  const not = {
    ogrenci: 'Kursiyerler hangi aşamada, sınavı geçiyorlar mı, kim zorlanıyor, kim derse gelmiyor. Ada tıklayınca kursiyerin dosyası açılır.',
    usta: 'Her usta öğreticinin bu ay ve geçen ay verdiği ders, öğrenci puanı ve öğrencilerinin direksiyon sınavı başarısı yan yana.',
    kurs: 'Bu ayı geçen ayla karşılaştırın: yeni kayıt, tahsilat, gider, direksiyon doluluğu ve öğrencilerin kursu nereden bulduğu.',
  }[sekme];
  return {
    baslik: 'Analiz', alt: 'Öğrenci, usta öğretici ve kurs göstergeleri',
    html: `${ekranNotu(not)}<div id="sek">${sekmeler(SEKMELER, sekme)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const s = ev.target.closest('[data-sekme]'); if (s) { location.hash = '#/analiz/' + s.dataset.sekme; }
      });
    },
  };
}
