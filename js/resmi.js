// MEB resmî formları: MTSK Yönetmeliği eklerinin düzeninde, kayıtlardan dolan ya da boş (elle doldurmak için) çıktılar.
// Kaynak: mevzuat.gov.tr 7.5.18408 ekleri (EK-1, EK-3, EK-4, EK-5, EK-8, EK-10, EK-12) ve md.17/3, md.42 içerik şartları.
import { S, kaydet, gun, oturum, SINIFLAR, kursiyer, egitmen, arac, tamAd, islem, ek3Sinif, dersKonulari, gorunum, sb, sbSinav } from './veri.js?v=98';
import { e, pencere, bildir, belgeYazdir, ik } from './ui.js?v=98';
import { EK3, EK4, EK3_NOT, EK4_NOT, EK12 } from './formlar.js?v=98';

const trTarih = t => t ? String(t).slice(0, 10).split('-').reverse().join('.') : '';
const BUYUK = s => String(s || '').toLocaleUpperCase('tr');
const ayEkle = (t, n) => { const d = new Date(t + 'T12:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const al = (o, yol) => yol.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
function koy(o, yol, v) { const p = yol.split('.'); let x = o; p.slice(0, -1).forEach(k => { if (!x[k] || typeof x[k] !== 'object') x[k] = {}; x = x[k]; }); x[p[p.length - 1]] = v; }
const subeOf = k => (S.subeler || []).find(x => x.id === ((k && k.sube) || gorunum.sube || 's1')) || (S.subeler || [])[0] || {};
// Resmî ad kalıbı: “Özel … Motorlu Taşıt Sürücüleri Kursu”; kursun kısa adı ayıklanır
const kisaAd = () => String(S.kurs.resmiAd || S.kurs.ad || '').replace(/^özel\s+/i, '').replace(/\s*(motorlu\s+taşıt\s+)?sürücü(leri)?\s+kursu\s*$/i, '').trim();
const kurum = k => { const s = subeOf(k), kisa = kisaAd(); return { kisa, ad: 'Özel ' + kisa + ' Motorlu Taşıt Sürücüleri Kursu', il: S.kurs.sehir || '', ilce: s.semt || '', mudur: s.mudur || S.kurs.yetkili || '', adres: S.kurs.adres || '', kurucu: S.kurs.kurucu || '', kod: s.kurumKodu || '' }; };
const adSoyad = ad => { const p = String(ad || '').trim().split(/\s+/); return [p.slice(0, -1).join(' ') || p[0] || '', p.length > 1 ? p[p.length - 1] : '']; };
const aracSinifi = a => a ? (SINIFLAR[a.sinif] ? SINIFLAR[a.sinif].ad : a.sinif) : '';
const ogrenciAraci = k => { const d = S.dersler.filter(x => x.kursiyer === k.id && x.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return arac(d && d.arac) || S.araclar.find(a => a.egitmen === k.egitmen && a.sinif === k.sinif) || S.araclar.find(a => a.egitmen === k.egitmen) || null; };

// Ortak görünüm: yalnız .rf içinde geçerli; ekranda ve yazdırmada aynı
const STIL = `<style>.rf{font-family:Arial,"Helvetica Neue",sans-serif;font-size:11.5px;line-height:1.4;color:#000}.rf *{box-sizing:border-box}
.rf .rf-ek{text-align:right;font-size:10px;margin-bottom:4px}.rf .rf-bas{text-align:center;font-weight:700;font-size:13.5px;line-height:1.35;margin:4px 0 10px}
.rf table{width:100%;border-collapse:collapse;margin:0 0 8px}.rf td,.rf th{border:1px solid #000;padding:4px 6px;vertical-align:top;text-align:left;font-weight:400;background:none}
.rf th{font-weight:700}.rf .rf-ara{text-align:center;font-weight:700;background:#ececec}.rf .rf-et{font-weight:700;white-space:nowrap}.rf .rf-orta{text-align:center}.rf .rf-sag{text-align:right}
.rf .rf-bos{display:inline-block;min-width:110px;border-bottom:1px dotted #000;height:1em}.rf .rf-dikey{width:26px;padding:2px;text-align:center;vertical-align:middle;font-weight:700;font-size:10px}
.rf .rf-dikey span{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap}.rf .rf-foto{width:3.5cm;height:4.5cm;border:1px solid #000;display:flex;align-items:center;justify-content:center;font-size:10px;overflow:hidden}
.rf .rf-foto img{width:100%;height:100%;object-fit:cover}.rf .rf-ust{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.rf .rf-imzalar{display:flex;justify-content:space-between;gap:20px;margin-top:8px}
.rf .rf-imzalar>div{text-align:center;min-width:160px}.rf .rf-not{font-size:10.5px;margin-top:6px}.rf p{margin:6px 0}.rf .rf-kutu{display:inline-block;width:14px;height:14px;border:1px solid #000;vertical-align:middle;text-align:center;line-height:12px;font-size:11px}
.rf .rf-renk{width:58px;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rf .rf-m{background:#9fd3ec}.rf .rf-k{background:#ef8a80}.rf .rf-s{background:#f5c46b}.rf .rf-sira{width:26px;text-align:center;font-weight:700;background:#f2f2f2;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rf .rf-konu{color:#b00000;font-weight:700;background:#f6f6f6;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rf .rf-bol{text-align:center;font-weight:700;background:#d9d9d9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rf .rf-nw{white-space:nowrap}.rf .rf-ikili td{width:50%}.rf .rf-hucre b{display:block;text-align:center;margin-bottom:4px}.rf .rf-hucre div{margin:2px 0}.rf .rf-yazi{min-height:22px}</style>`;
const sar = (ic, yatay) => STIL + `<div class="rf">${yatay ? '<i data-yatay></i>' : ''}${ic}</div>`;

/* ---------- EK-1: Kursa müracaat formu ---------- */
function ek1(k, bos) {
  const v = x => bos ? '' : (x || ''), n = k.nufus || {}, o = k.oncekiBelge || {}, K = kurum(k), S0 = SINIFLAR[k.sinif];
  const h = (x, n) => `<td colspan="${n}">${x[0] ? `<span class="rf-et">${x[0]}:</span> ${e(v(x[1]))}` : ''}</td>`;
  const c2 = (a, b) => `<tr>${h(a, 3)}${h(b, 3)}</tr>`;
  const c3 = (a, b, c) => `<tr>${[a, b, c].map(x => `<td colspan="2"><span class="rf-et">${x[0]}:</span> ${e(v(x[1]))}</td>`).join('')}</tr>`;
  const ad = bos ? '' : tamAd(k), tarih = bos ? '…./…/……' : trTarih(k.kayit);
  return sar(`<div class="rf-ek">(Değişik:RG-5/12/2015-29553) EK-1</div>
    <div class="rf-ust"><div style="width:3.5cm"></div><div class="rf-bas" style="flex:1">ÖZEL MOTORLU TAŞIT SÜRÜCÜLERİ KURSUNA<br>MÜRACAAT FORMU</div><div class="rf-foto">${!bos && k.foto ? `<img src="${k.foto}" alt="">` : 'FOTOĞRAF'}</div></div>
    <p class="rf-orta" style="font-weight:700;margin-top:10px">${bos ? '……………………………………….. KURSU' : e(BUYUK(K.ad))} MÜDÜRLÜĞÜNE</p>
    <p style="text-indent:40px">( ${bos ? '….' : e(S0 ? S0.ad.split(' ')[0] : k.sinif)} ) sınıfı sürücü sertifikası almak istiyorum. Gerekli işlemin yapılmasını arz ederim.</p>
    <div class="rf-imzalar"><div></div><div style="text-align:left">Adı ve Soyadı: ${e(ad)}<br>İmza:<br>${tarih}</div></div>
    <table style="margin-top:8px"><tr><td rowspan="14" class="rf-dikey"><span>SÜRÜCÜ SERTİFİKASI TALEP EDENİN</span></td><td colspan="6" class="rf-ara">NÜFUS CÜZDANINDAKİ KAYITLARA GÖRE</td></tr>
      ${c2(['Adı Soyadı', ad], ['T.C. Kimlik No', k.tc])}${c2(['Baba Adı', n.baba], ['Doğum Yeri', n.dogumYeri])}${c2(['Ana Adı', n.ana], ['Doğum Tarihi (Gün/Ay/Yıl)', trTarih(k.dogumTarihi)])}
      <tr><td colspan="6" class="rf-ara">NÜFUSA KAYITLI OLDUĞU YER</td></tr>
      ${c3(['İl', n.il], ['İlçe', n.ilce], ['Köy-Mahalle', n.mahalle])}${c3(['Sokağı', n.sokak], ['Cilt No', n.cilt], ['Aile Sıra No', n.aileSira])}${c3(['Sıra No', n.siraNo], ['Veriliş Tarihi', trTarih(n.verilisTarihi)], ['Verildiği Yer', n.verildigiYer])}
      <tr><td colspan="3"><span class="rf-et">Öğrenim Durumu:</span> ${e(v(k.ogrenim))}</td><td colspan="3"></td></tr>
      <tr><td colspan="6" class="rf-yazi"><span class="rf-et">İkametgâh Adresi ve Tel:</span> ${e(v([k.adres, k.tel].filter(Boolean).join(' · ')))}</td></tr>
      <tr><td colspan="6" class="rf-ara">DAHA ÖNCE ALINMIŞ SÜRÜCÜ BELGESİ VARSA</td></tr>
      ${c2(['Verildiği İl', o.il], ['Sınıfı', o.sinif || k.mevcutEhliyet])}${c2(['Tarihi', trTarih(o.tarih)], ['Süreli veya Süresiz Geri Alınma Durumu', o.geriAlma])}${c2(['Sayısı', o.sayi], ['', ''])}
    </table>
    <table><tr><td><p>2918 sayılı Karayolları Trafik Kanunu’nun 41 inci maddesindeki sürücü olacaklarda aranan şartlara haiz bulunmaktayım. Sürücü belgesi almama engel teşkil edecek bir sabıka kaydım bulunmamaktadır.</p>
      <p>Bir yıl içinde 3 defa 100 ceza puanını doldurarak sürücü belgem süresiz olarak iptal edilmemiştir.</p>
      <p>Yukarıda doldurmuş olduğum müracaat formundaki bütün bilgilerin doğru olduğunu beyan ederim.</p>
      <div class="rf-imzalar"><div style="text-align:left">Adı Soyadı: ${e(ad)}</div><div>İmza:</div><div>${bos ? '…../…./…….' : tarih}</div></div></td></tr>
      <tr><td class="rf-ara">AŞAĞIDAKİ BÖLÜM KURUM MÜDÜRLÜĞÜNCE DOLDURULACAKTIR.</td></tr>
      <tr><td><p>Bu müracaat formu ${bos || !ad ? '…………………………………' : e(ad)} tarafından huzurumda imzalanmış olup, beyanın doğruluğu kontrol edilmiştir.</p>
      <div class="rf-imzalar"><div style="text-align:left">EKLER:<br>1- Bu Yönetmeliğin 11 inci maddesinde belirtilen belgeler.</div><div>Kurum Müdürü<br>${bos ? '' : e(K.mudur)}<br>İmza</div></div></td></tr></table>
    <p class="rf-not"><b>NOT:</b> Bu dilekçe dolma kalem veya tükenmez kalemle doldurulacaktır.</p>`);
}

/* ---------- EK-5: "K" sınıfı sürücü aday belgesi ---------- */
function ek5(k, bos) {
  const v = x => bos ? '' : (x || ''), n = k.nufus || {}, K = kurum(k), eg = egitmen(k.egitmen) || {}, egAd = adSoyad(eg.ad), a = ogrenciAraci(k), kb = k.kBelge || {};
  const duz = kb.tarih || gun(0), bit = ayEkle(duz, 6);
  const satir = (et, x) => `<div>${et} ${e(v(x))}</div>`;
  const komisyon = sira => `<td class="rf-hucre"><b>${sira} DİREKSİYON EĞİTİMİ DERSİ SINAVI</b><div style="text-align:center;font-size:10.5px">Direksiyon Eğitimi Dersi Sınav Uygulama ve Değerlendirme Komisyonu Başkanının</div>${['1 - T.C. Kimlik no:', '2 - Adı:', '3 - Soyadı:', '4 - Adresi:', 'Sürücü belgesi sınıfı:', 'Sürücü belgesi no:', 'Sürücü belgesinin verildiği yer:'].map(x => `<div>${x}</div>`).join('')}<div class="rf-sag">(İmzası)</div></td>`;
  return sar(`<div class="rf-orta" style="font-size:10px">EK-5<br>(Değişik:RG-5/12/2015-29553)</div><div class="rf-bas">“K” SINIFI SÜRÜCÜ ADAY BELGESİ</div>
    <table class="rf-ikili">
      <tr><td class="rf-hucre"><b>BELGENİN GEÇERLİ OLDUĞU</b>${satir('1 - Araç cinsi:', a ? aracSinifi(a) + ' · ' + a.model + ' (' + a.plaka + ')' : SINIFLAR[k.sinif] && SINIFLAR[k.sinif].ad)}${satir('2 - Yol (Güzergah):', S.kurs.guzergah)}${satir('3 - Gün ve saatler:', S.kurs.kSaatler)}
        <div>4 - Düzenlenme tarihi: ${bos ? '…/…/……' : trTarih(duz)}</div><div>5 - Geçerliliğinin bittiği tarih: ${bos ? '…/…/……' : trTarih(bit)}</div>
        <div class="rf-orta" style="margin-top:10px">${bos ? 'Özel …………………………' : 'Özel ' + e(K.kisa)}<br>Motorlu Taşıt Sürücüleri Kursu Müdürü<br>${bos ? '' : e(K.mudur)}<br>(Kaşe - İmza)</div></td>
      <td class="rf-hucre"><div class="rf-orta" style="font-weight:700">T.C.<br>MİLLÎ EĞİTİM BAKANLIĞI<br>${bos ? '. . . . . . . . . . . . . . . . .' : e(BUYUK(K.il))}</div>
        <div class="rf-orta" style="margin:6px 0">${bos ? '. . . . . . . . .' : e(K.il + (K.ilce ? '/' + K.ilce : ''))} İli/İlçesi Özel ${bos ? '. . . . . . . . . . . . . . .' : e(K.kisa)} Motorlu Taşıt Sürücüleri Kursu Müdürlüğü “K” SINIFI SÜRÜCÜ ADAY BELGESİ</div>
        ${satir('Belge no:', kb.no)}${satir('Belge tarihi:', trTarih(kb.tarih || (bos ? '' : duz)))}${satir('Kursun adresi:', K.adres)}</td></tr>
      <tr><td class="rf-hucre"><b>SÜRÜCÜ ADAYININ</b><div style="display:flex;gap:8px"><div style="flex:1">${satir('1 - T.C. Kimlik no:', k.tc)}${satir('2 - Adı:', k.ad)}${satir('3 - Soyadı:', k.soyad)}${satir('4 - Baba adı:', n.baba)}${satir('5 - Doğum yeri:', n.dogumYeri)}${satir('6 - Doğum tarihi:', trTarih(k.dogumTarihi))}${satir('7 - Adresi:', k.adres)}</div><div class="rf-foto" style="width:2.6cm;height:3.3cm">${!bos && k.foto ? `<img src="${k.foto}" alt="">` : 'FOTOGRAF'}</div></div><div class="rf-sag">(İmzası)</div></td>
      <td class="rf-hucre"><b>DİREKSİYON EĞİTİMİ DERSİ UZMAN/USTA ÖĞRETİCİSİNİN</b>${satir('1 - T.C. Kimlik no:', eg.tc)}${satir('2 - Adı:', egAd[0])}${satir('3- Soyadı:', egAd[1])}${satir('4 - Adresi:', eg.adres)}${satir('Sürücü belgesi sınıfı:', (eg.ehliyet || {}).sinif)}${satir('Sürücü belgesi no:', (eg.ehliyet || {}).no)}${satir('Sürücü belgesinin verildiği yer:', (eg.ehliyet || {}).yer)}<div class="rf-sag">(İmzası)</div></td></tr>
      <tr>${komisyon('BİRİNCİ')}${komisyon('İKİNCİ')}</tr><tr>${komisyon('ÜÇÜNCÜ')}${komisyon('DÖRDÜNCÜ')}</tr>
      <tr><td colspan="2" class="rf-not"><b>Not:</b> 1 - Bu belgenin geçerlilik süresi düzenlendiği tarihten itibaren altı aydır.<br>2 - Sürücü adayı ve direksiyon eğitimi dersi uzman/usta öğreticisine ait bilgiler eğitime başlamadan bir defa doldurulur ve imzalanır. Direksiyon eğitimi dersi sınav uygulama ve değerlendirme komisyonu başkanı ise her sınavda kendisine ait bilgileri doldurur ve imzalar.</td></tr>
    </table>`);
}

/* ---------- EK-8: Direksiyon eğitim ve sınav aracı izin formu ---------- */
function ek8(a, bos) {
  const v = x => bos ? '' : (x || ''), K = kurum(a), marka = a.marka || String(a.model || '').split(' ')[0], model = a.modelAdi || [String(a.model || '').split(' ').slice(1).join(' '), a.yil].filter(Boolean).join(' ');
  return sar(`<div class="rf-ek">EK-8 (Değişik:RG-9/7/2024-32597)</div><div class="rf-bas">ÖZEL MOTORLU TAŞIT SÜRÜCÜLERİ KURSU DİREKSİYON<br>EĞİTİM VE SINAV ARACI İZİN FORMU</div>
    <table><tr><td class="rf-et" style="width:35%">Kurucunun Adı Soyadı</td><td colspan="4">${e(v(K.kurucu))}</td></tr><tr><td class="rf-et">Kurumun Adı</td><td colspan="4">${e(v(K.ad))}</td></tr><tr><td class="rf-et">Kurumun Adresi</td><td colspan="4">${e(v(K.adres))}</td></tr>
      <tr><td colspan="5" class="rf-ara">Direksiyon Eğitim ve Sınav Aracının</td></tr>
      <tr><th class="rf-orta">PLAKASI</th><th class="rf-orta">MARKASI</th><th class="rf-orta">MODELİ</th><th class="rf-orta">MOTOR NO</th><th class="rf-orta" style="width:28%">ŞASİ NO</th></tr>
      <tr><td class="rf-orta rf-yazi">${e(v(a.plaka))}</td><td class="rf-orta">${e(v(marka))}</td><td class="rf-orta">${e(v(model))}</td><td class="rf-orta">${e(v(a.motorNo))}</td><td class="rf-orta">${e(v(a.sasiNo))}</td></tr>
      <tr><td class="rf-et">Kullanıldığı Sertifika Sınıfı</td><td colspan="4">${e(v(aracSinifi(a)))}</td></tr>
      <tr><td colspan="5" style="padding:10px 14px"><div class="rf-orta" style="font-weight:700">T.C.<br>${bos ? '……………………….' : e(BUYUK(K.ilce || K.il))} ${bos ? 'KAYMAKAMLIĞI/VALİLİĞİ' : K.ilce ? 'KAYMAKAMLIĞI' : 'VALİLİĞİ'}<br>${bos ? '.................................Özel Motorlu Taşıt Sürücüleri Kursu' : e(K.ad)} Müdürlüğü</div>
        <p>Sayı &nbsp;: <br>Konu : ${bos ? '' : 'Direksiyon eğitim ve sınav aracı izni'}</p>
        <p class="rf-orta" style="font-weight:700">${bos ? '.........................' : e(BUYUK(K.ilce ? K.ilce + ' İLÇE' : K.il + ' İL'))} MİLLÎ EĞİTİM MÜDÜRLÜĞÜNE</p>
        <p style="text-align:justify;text-indent:40px">Yukarıda özellikleri belirtilen aracın, direksiyon eğitim ve sınavlarında kullanılmak üzere çift frenli, çift debriyajlı (otomatik vitesli araçlar hariç), tek direksiyon sistemi ile her türlü donanımı sağlam ve trafiğe hazır durumda olup kurumda direksiyon eğitim ve sınav aracı olarak kullanılmak üzere izin verilmesi hususunda gereğini arz ederim.</p>
        <p>Ekler:<br>1- Araç Tescil Belgesi/Araç Muayene Raporu</p></td></tr>
      <tr><td colspan="5" style="padding:10px 14px"><p>Yukarıda teklif edilen aracın ${bos ? '................................................kursunda' : e(K.ad) + 'nda'} direksiyon eğitim ve sınav aracı olarak kullanılması uygun görülmüştür.</p>
        <div class="rf-imzalar"><div></div><div style="text-align:left;line-height:2">Tarih<br>Adı-Soyadı<br>Unvanı<br>İmza</div></div></td></tr></table>`);
}

/* ---------- EK-3 / EK-4: Direksiyon eğitimi dersi sınav değerlendirme formu ---------- */
function ek34(k, bos, isaret = null) {
  const motor = ek3Sinif(k.sinif), L = motor ? EK3 : EK4, NOT = motor ? EK3_NOT : EK4_NOT, a = ogrenciAraci(k);
  const baslik = motor ? 'DİREKSİYON EĞİTİMİ DERSİ SINAV DEĞERLENDİRME FORMU<br>(“M”, “A1”, “A2”, “A” veya “B1” Sınıfları)' : 'DİREKSİYON EĞİTİMİ DERSİ SINAV DEĞERLENDİRME FORMU<br>(“B”,“BE”, “C1”, “C1E”,“C”,“CE”, “D1”, “D1E”, “D”,“DE” veya “F” Sınıfları)';
  const X = '<b style="display:block;text-align:center;font-size:13px">X</b>';
  const renk = (r, n) => r === 's' ? `<td class="rf-renk" style="padding:0"><table style="margin:0;height:100%"><tr><td class="rf-s" style="border:0;border-right:1px solid #000;height:18px">${n >= 1 ? X : ''}</td><td class="rf-s" style="border:0">${n >= 2 ? X : ''}</td></tr></table></td>` : `<td class="rf-renk rf-${r}">${n ? X : ''}</td>`;
  let bol = '';
  const satirlar = L.map(([b, bas, mad], bi) => { const ust = b !== bol ? `<tr><td colspan="3" class="rf-bol">(${b}. BÖLÜM)${b === 'I' ? ' ARAÇ BİLGİSİ SORGULAMA' : ''}</td></tr>` : ''; bol = b; return ust + (b === 'I' ? '' : `<tr><td colspan="3" class="rf-konu">${e(bas)}</td></tr>`) + mad.map(([s, m, r], mi) => `<tr><td class="rf-sira">${e(s)}</td><td>${e(m)}</td>${renk(r, isaret ? isaret[bi + '.' + mi] || 0 : 0)}</tr>`).join(''); }).join('');
  return sar(`<div class="rf-orta" style="font-size:10px">${motor ? 'Ek-3' : 'EK- 4'} (Değişik:RG-9/7/2024-32597)</div>
    <table><tr><td colspan="3" style="position:relative"><div class="rf-sag" style="font-size:10px">(${motor ? 'EK-3' : 'EK-4'})</div><div class="rf-bas" style="margin:0">${baslik}</div></td></tr>
      <tr><td colspan="3" class="rf-ara">KURSİYERİN</td></tr></table>
    <table><tr><th>Adı Soyadı</th><th>Alacağı Sürücü Sertifikasının Türü:</th><th>Sınava Gireceği Aracın Plaka No:</th></tr><tr><td class="rf-yazi">${bos ? '' : e(tamAd(k))}</td><td>${bos ? '' : e(SINIFLAR[k.sinif] ? SINIFLAR[k.sinif].ad : k.sinif)}</td><td>${bos || !a ? '' : e(a.plaka)}</td></tr></table>
    <table>${satirlar}</table>
    <table><tr><td colspan="4" class="rf-ara">SINAV KOMİSYONU</td></tr>
      <tr><td colspan="2" style="height:46px">Başkan (Adı/Soyadı/İmza):</td><td colspan="2">Üye (Adı/Soyadı/İmza):</td></tr>
      <tr><td colspan="4">Sınav Tarihi:</td></tr>
      <tr><td rowspan="2" class="rf-et" style="vertical-align:middle">SONUÇ:</td><td>BAŞARILI <span class="rf-kutu"></span></td><td rowspan="2" colspan="2">NEDENİ:</td></tr><tr><td>BAŞARISIZ <span class="rf-kutu"></span></td></tr>
      <tr><td colspan="3">SINAV ESNASINDA ARAÇ ARIZALANDI :</td><td style="width:40px"><span class="rf-kutu"></span></td></tr><tr><td colspan="3">ARAÇ, BAŞLANGIÇ ALANINA GELMEDİ :</td><td><span class="rf-kutu"></span></td></tr></table>
    <p class="rf-not" style="color:#0a6e8a"><b>${e(NOT[0])}</b></p><p class="rf-not" style="color:#a86200"><b>${e(NOT[1])}</b></p><p class="rf-not" style="color:#b00000"><b>${e(NOT[2])}</b></p>`);
}

/* ---------- EK-10: Sınav aracı değişiklik formu ---------- */
function ek10(x, bos) {
  const s = x.sinav, K = kurum(), ar = arac(x.arizali), yeni = x.yeni ? (arac(x.yeni) || {}).plaka : x.yeniPlaka, baska = x.yeni ? '' : x.baskaKurs;
  const n = (v, bosYazi) => bos || !v ? bosYazi : e(v);
  return sar(`<div class="rf-ek">EK-10 (Değişik:RG-9/7/2024-32597)</div><div class="rf-bas">SINAV ARACI DEĞİŞİKLİK FORMU</div>
    <p class="rf-orta" style="font-weight:700;margin-top:16px">${n(K.ilce && BUYUK(K.ilce), '………….…')} İLÇESİ SINAV YÜRÜTME KOMİSYONU BAŞKANLIĞINA</p>
    <p style="text-align:justify;text-indent:40px">${n(s && trTarih(s.tarih), '……………………….')} tarihinde yapılacak olan direksiyon eğitimi dersi sınavında kullanılacak ${n(ar && ar.plaka, '………………….…….')} plakalı aracımızın arıza yapması nedeni ile yerine ${bos ? 'Kursumuza/……………….. Kursuna' : baska ? e(baska) + ' Kursuna' : 'Kursumuza'} ait ${n(yeni, '………………………..')} plakalı aracın kullanılmasını istiyoruz. ${n(yeni, '…………......................')} plakalı aracımızın ${n(s && trTarih(s.tarih), '…………………….')} tarihinde ve sınavın yapıldığı saatlerde üzerinde tanımlı eğitim veya sınav bulunmamaktadır.</p>
    <div class="rf-imzalar"><div style="text-align:left">Gereğini arz ederim.</div><div>${bos ? '……../………/………….' : trTarih(gun(0))}<br><br>${bos ? '……..………………………' : e(K.mudur)}<br>Kurum Müdürü</div></div>
    <p class="rf-orta" style="font-weight:700;margin-top:26px">TUTANAK</p>
    <p style="text-align:justify;text-indent:40px">İlçemiz Özel ${n(K.kisa, '……………………………………………..')} Motorlu Taşıt Sürücüleri Kursuna ait yukarıdaki talep doğrultusunda MEBBİS Modülüne göre sınavda kullanılması gereken araç ve bu aracın yerine kullanılmak istenilen araç ile ilgili bilgiler Komisyonumuzca incelenmiştir.</p>
    <p style="text-align:justify;text-indent:40px">İlçemiz Özel ${n(K.kisa, '……………………………………………..')} Motorlu Taşıt Sürücüleri Kursuna ait ${n(ar && ar.plaka, '……………………………………..')} plakalı aracın yerine ${bos ? 'aynı Kursa/ …………. Kursuna' : baska ? e(baska) + ' Kursuna' : 'aynı Kursa'} ait ${n(yeni, '……………………………….')} plakalı aracın kullanılması uygun görülmüştür.</p>
    <div class="rf-orta" style="margin-top:26px">Sınav Yürütme Komisyonu Başkanı</div>
    <div class="rf-imzalar" style="margin-top:40px"><div>Sınav Yürütme Komisyonu Üyesi</div><div>Sınav Yürütme Komisyonu Üyesi</div></div>
    <p class="rf-not" style="margin-top:30px"><b>Not :</b> İlçe dışından görevlendirilecek araçlar için il sınav sorumlusunun onayı ile görevlendirme yapılır.</p>`);
}

/* ---------- EK-12: Direksiyon eğitimi dersi sınavı araç kontrol formu ---------- */
function ek12(x, bos) {
  const a = arac(x.arac) || {}, s = x.sinav, eg = egitmen(a.egitmen) || {}, K = kurum(a);
  const v = y => bos ? '' : e(y || '');
  const sat = ([soru, sec], i) => { const ilk = i === 0, man = !bos && ilk && a.vites === 'Manuel', oto = !bos && ilk && a.vites === 'Otomatik';
    if (!sec) return `<tr><td colspan="5" style="height:44px"><b>${e(soru.replace(/\(.*$/, ''))}</b><i>${e((soru.match(/\(.*$/) || [''])[0])}</i></td></tr>`;
    return `<tr><td>${ilk || i >= 18 ? `<b>${e(soru)}</b>` : e(soru)}</td><td class="rf-orta">${ilk ? 'Manuel' : 'Evet'}</td><td class="rf-orta"><span class="rf-kutu">${man ? '✓' : ''}</span></td><td class="rf-orta" style="padding:4px 2px">${ilk ? 'Otomatik' : 'Hayır'}</td><td class="rf-orta"><span class="rf-kutu">${oto ? '✓' : ''}</span></td></tr>`; };
  return sar(`<div class="rf-orta" style="font-size:10px">Ek- 12<br>(Ek:RG-19/10/2017- 30215) (Değişik:RG-9/7/2024-32597)</div>
    <table style="margin:0"><tr><td colspan="2" class="rf-orta" style="font-weight:700;font-size:13px">DİREKSİYON EĞİTİMİ DERSİ SINAVI ARAÇ KONTROL FORMU</td></tr>
      ${[['Kursun Adı', K.ad], ['Sınav Aracının Plakası', a.plaka], ['Usta Öğretici Adı Soyadı', eg.ad], ['Sınavın Yapıldığı Tarih', s && trTarih(s.tarih)], ['Aracın Kontrol Saati', '']].map(([et, y]) => `<tr><td class="rf-et" style="width:40%">${et}</td><td>${v(y)}</td></tr>`).join('')}</table>
    <table style="table-layout:fixed;margin-top:-1px"><colgroup><col><col style="width:64px"><col style="width:30px"><col style="width:64px"><col style="width:30px"></colgroup>
      <tr><td colspan="5" class="rf-ara">ARACIN SINAVA HAZIR OLUP OLMADIĞI İLE İLGİLİ BİLGİLER</td></tr>
      ${EK12.map(sat).join('')}
      <tr><td colspan="5" class="rf-ara">Sınav Sürecini Kontrol Edecek ve Denetleyecek Görevlinin</td></tr>
      <tr><th colspan="3" class="rf-orta">Adı Soyadı</th><th colspan="2" class="rf-orta">İmzası</th></tr><tr><td colspan="3" style="height:36px"></td><td colspan="2"></td></tr></table>
    <p class="rf-not"><i>Not: Sınavda kullanılacak aracın kontrol edilecek belgeleri ve araç, kurs müdürlüğünce kontrole hazır hale getirilir.</i></p>`);
}

/* ---------- Araç dosyası (md.17/3): araçta bulunması gerekenler ---------- */
function aracDosyasi(a, bos, parca = {}) {
  const eg = egitmen(a.egitmen) || {}, bugun = gun(0), son = gun(13);
  const ogrenciler = S.kursiyerler.filter(k => ['Direksiyon', 'Sınav'].includes(k.asama) && (S.dersler.some(d => d.kursiyer === k.id && d.arac === a.id && d.tarih >= gun(-30)) || (k.egitmen === a.egitmen && k.sinif === a.sinif)));
  const program = k => S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı' && d.tarih >= bugun && d.tarih <= son && (!d.arac || d.arac === a.id)).sort((x, y) => (x.tarih + x.saat).localeCompare(y.tarih + y.saat));
  const izin = (eg.belgeler || {}).sertifika;
  const kapak = sar(`<div class="rf-bas">ARAÇ EVRAK DOSYASI<br><span style="font-weight:400;font-size:12px">${e(a.plaka)} · ${e(a.model || '')} · ${e(aracSinifi(a))}</span></div>
    <p style="font-size:11px">MTSK Yönetmeliği md.17/3’e göre direksiyon eğitim ve sınav aracında aşağıdakiler bulunur. Sınav günü EK-12’nin 17. maddesiyle kontrol edilir.</p>
    <table><tr><th style="width:24px"></th><th>Belge</th><th>Durum</th></tr>
      <tr><td class="rf-orta"><span class="rf-kutu"></span></td><td>a) Aracın kursa ait olduğuna ilişkin ruhsatnamenin (tescil belgesi) aslı</td><td>Araçta asıl bulunmalı · muayene ${trTarih(a.muayene) || '—'}</td></tr>
      <tr><td class="rf-orta"><span class="rf-kutu"></span></td><td>b) Usta öğreticinin çalışma izninin bir örneği</td><td>${e(eg.ad || '—')}${eg.calismaIzinNo ? ' · izin no ' + e(eg.calismaIzinNo) : ''}${izin ? ' · sertifika ' + trTarih(izin) + (izin < bugun ? ' (SÜRESİ DOLMUŞ)' : '') : ''}</td></tr>
      <tr><td class="rf-orta"><span class="rf-kutu"></span></td><td>c) Bu araçla eğitim görecek kursiyerlerin isim ve çalışma saatleri listesi</td><td>Ekte · ${ogrenciler.length} kursiyer</td></tr>
      <tr><td class="rf-orta"><span class="rf-kutu"></span></td><td>ç) Direksiyon eğitim ve sınav aracı izin formu onayının bir örneği (EK-8)</td><td>${a.mebIzinNo || a.izinTarih ? 'Onay ' + [a.mebIzinNo, trTarih(a.izinTarih)].filter(Boolean).join(' · ') : 'Onaylı örneği ekleyin'}</td></tr>
      <tr><td class="rf-orta"><span class="rf-kutu"></span></td><td>d) Direksiyon eğitim takip formları</td><td>${ogrenciler.length} kursiyer${parca.takip ? ' · ekte' : ''}</td></tr>
      <tr><td class="rf-orta"><span class="rf-kutu"></span></td><td>e) Akan trafikte eğitim ve sınav için “K” sınıfı sürücü aday belgesi (EK-5)</td><td>${parca.ek5 ? 'Ekte · ' : ''}her kursiyer için ayrı, 6 ay geçerli</td></tr></table>
    <p class="rf-orta" style="font-weight:700;margin-top:14px">KURSİYER İSİM VE ÇALIŞMA SAATLERİ LİSTESİ</p>
    <p style="font-size:11px">${trTarih(bugun)} – ${trTarih(son)} · Usta öğretici: ${e(eg.ad || '—')}</p>
    <table><tr><th style="width:24px">#</th><th>Adı Soyadı</th><th>Sınıf</th><th>Çalışma saatleri (planlı dersler)</th></tr>
      ${ogrenciler.map((k, i) => `<tr><td>${i + 1}</td><td>${e(tamAd(k))}</td><td>${e(k.sinif)}</td><td>${program(k).map(d => trTarih(d.tarih).slice(0, 5) + ' ' + d.saat).join(', ') || (bos ? '' : 'Planlı ders yok')}</td></tr>`).join('') || '<tr><td colspan="4">Bu araçla eğitim gören kursiyer yok.</td></tr>'}</table>
    <div class="rf-imzalar" style="margin-top:24px"><div>Usta öğretici<br>${e(eg.ad || '')}</div><div>Kurs müdürü<br>${e(kurum(a).mudur)}</div></div>`);
  const ekler = [];
  if (parca.ek8) ekler.push(ek8(a, false));
  if (parca.ek5) ogrenciler.forEach(k => ekler.push(ek5(k, false)));
  if (parca.takip) ogrenciler.forEach(k => ekler.push(takipFormu(k)));
  return [kapak, ...ekler].join('<div class="sayfa-sonu"></div>');
}
let takipFormu = () => '';

/* ---------- Teorik ders defteri (md.42/1-d) ---------- */
function dersDefteri(grupId, bos) {
  const g = (S.gruplar || []).find(x => x.id === grupId) || { id: grupId, ad: grupId === 'sabah' ? 'Sabah grubu' : 'Akşam grubu' };
  const l = S.teorik.filter(t => (t.grup || 'aksam') === g.id && t.tarih <= gun(0)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const ogr = id => ((S.ogretmenler || []).find(o => o.id === id) || {}).ad || '';
  const satir = bos ? Array.from({ length: 22 }, () => null) : l;
  return sar(`<div class="rf-bas">DERS DEFTERİ<br><span style="font-weight:400;font-size:12px">${e(kurum().ad)} · ${e(g.ad)}${g.derslik ? ' · ' + e(g.derslik) : ''}</span></div>
    <table><tr><th style="width:24px">#</th><th>Tarih</th><th>Saat</th><th>Süre</th><th>Dersin adı / konusu</th><th>Öğretici</th><th>Katılan</th><th style="width:90px">Öğretici imzası</th></tr>
      ${satir.map((t, i) => t ? `<tr><td>${i + 1}</td><td class="rf-nw">${trTarih(t.tarih)}</td><td>${e(t.saat)}</td><td>${t.sure || ''} saat</td><td>${e(t.konu)}</td><td>${e(ogr(t.ogretmen))}</td><td>${t.katilim != null ? t.katilim + (t.mevcut ? '/' + t.mevcut : '') : ''}</td><td></td></tr>` : `<tr><td>${i + 1}</td><td style="height:24px"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('') || '<tr><td colspan="8">Bu grupta ders kaydı yok.</td></tr>'}</table>
    <p class="rf-not">MTSK Yönetmeliği md.42: defterin sayfaları numaralandırılır, kurs kaşesiyle tasdik edilir, son sayfaya sayfa adedi yazılarak kurs müdürünce onaylanır; silinti ve kazıntı yapılmaz. Bilgiler her dönem sonunda yedeklenmek koşuluyla elektronik ortamda da tutulabilir.</p>
    <div class="rf-imzalar"><div></div><div>Kurs müdürü<br>${e(kurum().mudur)}</div></div>`, true);
}

/* ---------- Sınava hazır yazısı (md.7/7; Danıştay 8. D. 8/10/2025 YD: usta öğretici kararını yazıyla bildirir) ---------- */
function hazir(k, bos) {
  const K = kurum(k), S0 = SINIFLAR[k.sinif] || {}, h = k.hazirYazi || {}, eg = egitmen(h.egitmen || k.egitmen) || {}, a = ogrenciAraci(k);
  const dersler = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').sort((x, y) => (x.tarih + x.saat).localeCompare(y.tarih + y.saat));
  const gece = dersler.filter(d => d.saat >= '18:00').length, v = x => bos ? '' : (x || '');
  return sar(`<div class="rf-orta" style="margin:10px 0 18px;font-weight:700">${bos ? '…………………………………………' : e(BUYUK(K.ad))} MÜDÜRLÜĞÜNE</div>
    <p style="text-indent:2em;text-align:justify">Kursumuzda ${bos ? '……' : e(S0.ad || k.sinif)} sınıfı sertifika programında direksiyon eğitimi alan, bilgileri aşağıda yazılı kursiyer, programın öngördüğü direksiyon eğitimi derslerini tamamlamış olup direksiyon eğitimi dersi sınavına girmeye hazırdır.</p>
    <p style="text-indent:2em">Bilgilerinize arz ederim.</p>
    <table style="margin-top:12px">
      <tr><td class="rf-et" style="width:38%">T.C. kimlik no</td><td>${e(v(k.tc))}</td></tr>
      <tr><td class="rf-et">Adı soyadı</td><td>${e(v(tamAd(k)))}</td></tr>
      <tr><td class="rf-et">Sertifika sınıfı</td><td>${e(v(S0.ad))}</td></tr>
      <tr><td class="rf-et">Direksiyon eğitimine başlama</td><td>${bos ? '' : trTarih((dersler[0] || {}).tarih)}</td></tr>
      <tr><td class="rf-et">Tamamlanan direksiyon dersi</td><td>${bos ? '' : dersler.length + ' ders saati (asgari ' + (S0.direksiyon || '') + ')'}${bos ? '' : ' · gece ' + gece + ' saat'}</td></tr>
      <tr><td class="rf-et">Eğitim aracı</td><td>${e(v(a ? a.plaka + ' · ' + (a.model || '') : ''))}</td></tr>
    </table>
    <div class="rf-imzalar" style="margin-top:28px"><div></div><div>${bos ? '…/…/……' : trTarih(h.tarih || gun(0))}<br>Direksiyon Eğitimi Dersi Usta Öğreticisi<br>${e(v(eg.ad))}<br>${bos || !eg.tc ? '' : 'T.C. ' + e(eg.tc) + '<br>'}İmza</div></div>
    <table style="margin-top:34px"><tr><td style="width:50%"><b>Kurs müdürlüğünce teslim alındı</b><br>Tarih: ${bos ? '…/…/……' : trTarih(h.tarih || gun(0))}<br>Kurs Müdürü: ${e(v(K.mudur))}<br>İmza:</td><td><b>Özel MTSK Modülüne yüklendi</b><br>Tarih: ${!bos && h.yuklendi ? trTarih(h.yuklendi) : '…/…/……'}<br>Yükleyen:<br>İmza:</td></tr></table>
    <p class="rf-not">Dayanak: MTSK Yönetmeliği md.7/7. Danıştay 8. Dairesinin 08/10/2025 tarihli, E.2024/6765 sayılı yürütmeyi durdurma kararı uyarınca usta öğreticinin kararı yazılı olarak bildirilir; yazı taranarak modüle yüklenir.</p>`);
}

/* ---------- eksik bilgiler: formun üstünde doldurulur, kayda yazılır ---------- */
const kursAlan = (yol, ad, ip) => ({ hedef: () => S.kurs, yol, ad, ip });
function alanlar(tur, x) {
  if (tur === 'ek1') { const k = x; return [kursAlan('resmiAd', 'Kursun resmî adı', 'Özel … Motorlu Taşıt Sürücüleri Kursu'), ...[['nufus.baba', 'Baba adı'], ['nufus.ana', 'Ana adı'], ['nufus.dogumYeri', 'Doğum yeri'], ['nufus.il', 'Nüfusa kayıtlı il'], ['nufus.ilce', 'Nüfusa kayıtlı ilçe'], ['nufus.mahalle', 'Köy-mahalle'], ['nufus.cilt', 'Cilt no'], ['nufus.aileSira', 'Aile sıra no'], ['nufus.siraNo', 'Sıra no'], ['nufus.verilisTarihi', 'Kimlik veriliş tarihi', 'date'], ['nufus.verildigiYer', 'Kimliğin verildiği yer']].map(([yol, ad, tip]) => ({ hedef: () => k, yol, ad, tip })),
    ...(k.mevcutEhliyet || (k.oncekiBelge && k.oncekiBelge.sinif) ? [['oncekiBelge.il', 'Önceki belge: verildiği il'], ['oncekiBelge.sinif', 'Önceki belge: sınıfı'], ['oncekiBelge.tarih', 'Önceki belge: tarihi', 'date'], ['oncekiBelge.sayi', 'Önceki belge: sayısı']].map(([yol, ad, tip]) => ({ hedef: () => k, yol, ad, tip })) : [])]; }
  if (tur === 'ek5') { const k = x, eg = egitmen(k.egitmen); return [kursAlan('resmiAd', 'Kursun resmî adı', 'Özel … Motorlu Taşıt Sürücüleri Kursu'), { hedef: () => k, yol: 'kBelge.no', ad: 'Belge no' }, { hedef: () => k, yol: 'kBelge.tarih', ad: 'Düzenlenme (akan trafiğe başlama) tarihi', tip: 'date' }, kursAlan('guzergah', 'Yol (güzergâh)', 'Örn. kurs önü – çevre yolu – sınav alanı'), kursAlan('kSaatler', 'Gün ve saatler', 'Örn. Pazartesi–Cumartesi 08:00–20:00'), { hedef: () => k, yol: 'nufus.baba', ad: 'Adayın baba adı' }, { hedef: () => k, yol: 'nufus.dogumYeri', ad: 'Adayın doğum yeri' },
    ...(eg ? [['tc', 'Öğretmenin TC kimlik no'], ['adres', 'Öğretmenin adresi'], ['ehliyet.sinif', 'Öğretmenin sürücü belgesi sınıfı'], ['ehliyet.no', 'Öğretmenin sürücü belgesi no'], ['ehliyet.yer', 'Belgenin verildiği yer']].map(([yol, ad]) => ({ hedef: () => eg, yol, ad })) : [])]; }
  if (tur === 'hazir') { const k = x, eg = egitmen((k.hazirYazi || {}).egitmen || k.egitmen); return [kursAlan('resmiAd', 'Kursun resmî adı', 'Özel … Motorlu Taşıt Sürücüleri Kursu'), ...(eg ? [{ hedef: () => eg, yol: 'tc', ad: 'Usta öğreticinin TC kimlik no' }] : [])]; }
  if (tur === 'ek8') { const a = x; return [kursAlan('resmiAd', 'Kursun resmî adı', 'Özel … Motorlu Taşıt Sürücüleri Kursu'), kursAlan('kurucu', 'Kurucunun adı soyadı'), { hedef: () => a, yol: 'marka', ad: 'Markası', ip: String(a.model || '').split(' ')[0] }, { hedef: () => a, yol: 'motorNo', ad: 'Motor no' }, { hedef: () => a, yol: 'sasiNo', ad: 'Şasi no' }, { hedef: () => a, yol: 'izinTarih', ad: 'MEM izin onay tarihi', tip: 'date' }]; }
  return [];
}

/* ---------- pencere ---------- */
// Önizleme/test için: formu doğrudan üret
export function resmiHtml(tur, x, bos = false, ek) { return ({ ek1, ek5, ek34, ek8, aracdosya: aracDosyasi, dersdefteri: dersDefteri, ek12, ek10, hazir })[tur](x, bos, ek); }
export const RESMI = {
  ek1: ['Kursa müracaat formu (EK-1)', 'Kayıt dilekçesi ve beyan; fotoğraf ve nüfus bilgileriyle', 'kursiyer'],
  ek5: ['“K” sınıfı sürücü aday belgesi (EK-5)', 'Akan trafikte araçta bulunur; 6 ay geçerli', 'kursiyer'],
  ek34: ['Direksiyon sınavı değerlendirme formu (EK-3 / EK-4)', 'Sınıfa göre doğru form; deneme sınavında da kullanılır', 'kursiyer'],
  ek8: ['Eğitim ve sınav aracı izin formu (EK-8)', 'Her araç için; MEM onayına gider', 'arac'],
  aracdosya: ['Araç evrak dosyası (md.17/3)', 'Araçta bulunacaklar listesi, kursiyer ve saat listesi; istenirse EK-8, EK-5 ve takip formları', 'arac'],
  ek12: ['Sınav aracı kontrol formu (EK-12)', 'Sınav günü her araç için; denetim görevlisi doldurur', 'sinavArac'],
  ek10: ['Sınav aracı değişiklik formu (EK-10)', 'Arızalanan sınav aracının yerine başka araç', 'ek10'],
  dersdefteri: ['Teorik ders defteri (md.42)', 'Gruba göre işlenen dersler, öğretici ve katılım', 'grup'],
  hazir: ['Sınava hazır yazısı (md.7/7)', 'Usta öğreticinin direksiyon sınavına hazır bildirimi; taranıp MEBBİS’e yüklenir', 'kursiyer'],
};
export function resmiAc(tur, id, takip) {
  if (takip) takipFormu = takip;
  const [baslik, , tip] = RESMI[tur];
  const dSinavlar = () => sbSinav(S.sinavlar).filter(s => /direksiyon/i.test(s.tur)).sort((a, b) => b.tarih.localeCompare(a.tarih));
  let secenek = [];
  if (tip === 'kursiyer') secenek = sb(S.kursiyerler).filter(k => !['ek5', 'hazir'].includes(tur) || (SINIFLAR[k.sinif] && SINIFLAR[k.sinif].direksiyon)).sort((a, b) => (['Direksiyon', 'Sınav'].includes(b.asama) ? 1 : 0) - (['Direksiyon', 'Sınav'].includes(a.asama) ? 1 : 0) || tamAd(a).localeCompare(tamAd(b), 'tr')).map(k => [k.id, tamAd(k) + ' · ' + k.sinif + ' · ' + k.asama]);
  if (tip === 'arac') secenek = sb(S.araclar).map(a => [a.id, a.plaka + ' · ' + (a.model || '') + ' · ' + a.sinif]);
  if (tip === 'grup') secenek = (S.gruplar && S.gruplar.length ? S.gruplar : [{ id: 'aksam', ad: 'Akşam grubu' }, { id: 'sabah', ad: 'Sabah grubu' }]).map(g => [g.id, g.ad]);
  const durum = { id: id || (secenek[0] || [])[0], bos: false, parca: { ek8: true, ek5: false, takip: false }, sinav: (dSinavlar()[0] || {}).id, arac: (S.araclar[0] || {}).id, arizali: (S.araclar[0] || {}).id, yeni: (S.araclar[1] || {}).id, yeniPlaka: '', baskaKurs: '' };
  if (tip === 'kursiyer' || tip === 'arac' || tip === 'grup') { if (!secenek.length) return pencere({ baslik, icerik: `<p>Bu form için önce ${tip === 'arac' ? 'araç' : tip === 'grup' ? 'teorik grup' : 'öğrenci'} kaydı gerekli.</p>`, altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' }); if (!secenek.some(x => x[0] === durum.id)) durum.id = secenek[0][0]; }
  const kayit = () => tip === 'kursiyer' ? kursiyer(durum.id) : tip === 'arac' ? arac(durum.id) : null;
  const html = () => {
    if (tur === 'ek1') return ek1(kayit(), durum.bos);
    if (tur === 'ek5') return ek5(kayit(), durum.bos);
    if (tur === 'ek34') return ek34(kayit(), durum.bos);
    if (tur === 'hazir') return hazir(kayit(), durum.bos);
    if (tur === 'ek8') return ek8(kayit(), durum.bos);
    if (tur === 'aracdosya') return aracDosyasi(kayit(), durum.bos, durum.parca);
    if (tur === 'dersdefteri') return dersDefteri(durum.id, durum.bos);
    if (tur === 'ek12') return ek12({ arac: durum.arac, sinav: S.sinavlar.find(s => s.id === durum.sinav) }, durum.bos);
    if (tur === 'ek10') return ek10({ sinav: S.sinavlar.find(s => s.id === durum.sinav), arizali: durum.arizali, yeni: durum.yeni, yeniPlaka: durum.yeniPlaka, baskaKurs: durum.baskaKurs }, durum.bos);
    return '';
  };
  const secim = (ad, l, v) => `<select class="girdi" style="max-width:340px" data-s="${ad}" aria-label="Seçim">${l.map(([k, t]) => `<option value="${e(k)}" ${k === v ? 'selected' : ''}>${e(t)}</option>`).join('')}</select>`;
  const sinavL = dSinavlar().map(s => [s.id, trTarih(s.tarih) + ' ' + (s.saat || '') + ' · ' + s.tur]);
  const aracL = S.araclar.map(a => [a.id, a.plaka + ' · ' + (a.model || '')]);
  const ust = () => {
    let s = '';
    if (secenek.length) s += secim('id', secenek, durum.id);
    if (tur === 'ek12') s += (sinavL.length ? secim('sinav', sinavL, durum.sinav) : '<span style="font-size:13px;color:var(--soluk)">Direksiyon sınavı oturumu yok; tarih boş kalır</span>') + secim('arac', aracL, durum.arac);
    if (tur === 'ek10') s += (sinavL.length ? secim('sinav', sinavL, durum.sinav) : '') + '<span style="font-size:13px">Arızalanan:</span>' + secim('arizali', aracL, durum.arizali) + '<span style="font-size:13px">Yerine:</span>' + secim('yeni', [['', 'Başka kursun aracı…'], ...aracL], durum.yeni) + `<span data-baska ${durum.yeni ? 'hidden' : ''} style="display:inline-flex;gap:6px"><input class="girdi" style="width:150px" data-g="baskaKurs" placeholder="Kursun adı" value="${e(durum.baskaKurs)}"><input class="girdi" style="width:120px" data-g="yeniPlaka" placeholder="Plaka" value="${e(durum.yeniPlaka)}"></span>`;
    if (tur === 'aracdosya') s += `<span class="secim" style="gap:6px">${[['ek8', 'EK-8'], ['ek5', 'Öğrencilerin EK-5’i'], ['takip', 'Takip formları']].map(([k, t]) => `<label><input type="checkbox" data-parca="${k}" ${durum.parca[k] ? 'checked' : ''}><span>${t}</span></label>`).join('')}</span>`;
    if (!['aracdosya'].includes(tur)) s += `<label style="display:inline-flex;gap:6px;align-items:center;font-size:13.5px"><input type="checkbox" data-bos ${durum.bos ? 'checked' : ''}> Boş form (elle doldurmak için)</label>`;
    return s;
  };
  const eksikHtml = () => {
    const x = kayit(); const l = x ? alanlar(tur, x) : []; if (!l.length || durum.bos) return '';
    const eks = l.filter(f => !al(f.hedef(), f.yol)).length;
    const kb = tur === 'ek5' && x.kBelge && x.kBelge.tarih, dolmus = kb && ayEkle(kb, 6) < gun(0);
    if (dolmus) return `<p class="ipucu uyari" style="margin-bottom:10px">Bu öğrencinin “K” belgesinin 6 aylık süresi ${trTarih(ayEkle(kb, 6))} tarihinde doldu. Yeni belge için düzenlenme tarihini bugüne alın.</p>` + eksikForm(l, eks);
    return eksikForm(l, eks);
  };
  const eksikForm = (l, eks) => {
    return `<details class="eksik-alan" ${eks ? 'open' : ''}><summary>${eks ? `Formda ${eks} bilgi boş · burada doldurun, kayda yazılır` : 'Formdaki bilgileri düzenle'}</summary><div class="form-izgara" style="margin-top:10px">${l.map((f, i) => `<div class="alan"><label>${e(f.ad)}</label><input data-alan="${i}" type="${f.tip || 'text'}" value="${e(al(f.hedef(), f.yol) || '')}" placeholder="${e(f.ip || '')}"></div>`).join('')}</div></details>`;
  };
  pencere({
    baslik, genis: true,
    icerik: `<div data-ust style="display:flex;gap:8px 10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">${ust()}</div><div data-eksik>${eksikHtml()}</div><div style="background:var(--zemin);padding:18px;border-radius:8px;max-height:58vh;overflow:auto"><div class="a4" id="a4">${html()}</div></div>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:8px">Form, MTSK Yönetmeliği ekindeki düzene göre hazırlanır (mevzuat.gov.tr). İl MEM’inizin kullandığı örnekte farklılık varsa bize yazın.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-yazdir>${ik('belge')}Yazdır / PDF</button>`,
    onAc(d) {
      const ciz = (eksikDe = true) => { d.querySelector('#a4').innerHTML = html(); if (eksikDe) d.querySelector('[data-eksik]').innerHTML = eksikHtml(); };
      let zaman = null;
      d.addEventListener('change', ev => {
        const t = ev.target;
        if (t.matches('[data-s]')) { durum[t.dataset.s] = t.value; if (t.dataset.s === 'yeni') { const b = d.querySelector('[data-baska]'); if (b) b.hidden = !!t.value; } ciz(); }
        if (t.matches('[data-bos]')) { durum.bos = t.checked; ciz(); }
        if (t.matches('[data-parca]')) { durum.parca[t.dataset.parca] = t.checked; ciz(false); }
      });
      d.addEventListener('input', ev => {
        const t = ev.target;
        if (t.matches('[data-g]')) { durum[t.dataset.g] = t.value; ciz(false); }
        if (t.matches('[data-alan]')) { const f = alanlar(tur, kayit())[+t.dataset.alan]; koy(f.hedef(), f.yol, t.value.trim()); d.querySelector('#a4').innerHTML = html(); clearTimeout(zaman); zaman = setTimeout(() => { islem('Resmî form bilgisini tamamladı', baslik + ' · ' + f.ad); kaydet(); }, 900); }
      });
      d.querySelector('[data-yazdir]').addEventListener('click', () => {
        const x = kayit(), kime = x ? (x.soyad ? tamAd(x) : x.plaka || '') : '';
        if (tur === 'ek5' && x && !durum.bos && !(x.kBelge && x.kBelge.tarih)) koy(x, 'kBelge.tarih', gun(0));
        if (tur === 'hazir' && x && !durum.bos && !x.hazirYazi) x.hazirYazi = { tarih: gun(0), egitmen: x.egitmen, kim: oturum.kullanici ? oturum.kullanici.ad : '' };  // ilk düzenleme tarihi sabitlenir; 6 ay buna göre
        belgeYazdir(html(), baslik + (kime ? ' · ' + kime : '')); islem(baslik + ' yazdırdı', kime + (durum.bos ? ' (boş)' : '')); kaydet();
      });
    },
  });
}
