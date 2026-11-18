// MEBBİS dönem grupları. MEBBİS'teki "Dönem Grup Açılış Tarihi" ve "Grup Şube Tanımlama" ekranlarıyla birebir:
// dönem YYYYAA, grup 1–3 (her grubun tek başlangıç tarihi, ayın 1'i ile 10'u arası), şube A–H. Ad: "Kasım 1A".
// Kursiyer kaydı grubun başlangıcından önce yapılır (MTSK Yönetmeliği 12/2); evrakı tamam ve gruba atanmış kursiyer aktiftir.
import { S, kaydet, gun, fark, iso, SINIFLAR, tamAd, tcGecerli, islem, eksikEvrak, sb, anaSinif, mebKurum, teorikVar, esinavsizBelgeli, derslikListesi, derslikOner, DERSLIK_TURLERI } from './veri.js?v=234';
import { e, pencere, kapatPencere, bildir, rozet, tarih, isaret, ik, pencereSor, bos } from './ui.js?v=234';
import * as KR from './kurallar.js?v=234';

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const SUBELER = 'ABCDEFGH'.split('');   // MEBBİS'te şube seçenekleri A..H (8 şube)
export const GRUP_NOLAR = [1, 2, 3];          // bir dönemde en çok 3 grup tarihi (16/7)

const nrmAd = t => String(t || '').toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]/g, '');
const ayAd = donem => AYLAR[+String(donem).slice(4, 6) - 1] || '';
export const donemAdi = donem => `${String(donem).slice(0, 4)} - ${ayAd(donem)}`;          // MEBBİS biçimi: "2026 - Kasım"
export const grupAdi = (donem, no, sube) => `${ayAd(donem)} ${no}${sube}`;               // "Kasım 1A"
export const mebGrubuMu = g => !!(g && g.donem && g.grupNo && g.sube);
// Kurs tipi (DON-009, SOR-056): MTSK (sürücü kursu: ehliyet sınıfları ve 100 ceza), SRC, İş makinesi. Eski gruplarda tip yok = MTSK.
export const KURS_TIPLERI = [['MTSK', 'Sürücü kursu (MTSK)'], ['SRC', 'SRC mesleki yeterlilik'], ['OP', 'İş makinesi operatörlüğü']];
export const sinifTipi = sinif => { const t = (SINIFLAR[sinif] || {}).tur; return t === 'src' ? 'SRC' : t === 'operator' ? 'OP' : 'MTSK'; };
export const grupTipi = g => (g && g.tip) || 'MTSK';
// Belgeliler şubesi (DON-011, SOR-211): mevcut belgesi olan, teorik derse girmeyen adaylar için teorik programı olmayan şube. Zorunlu değil, kurs tercihi;
// ayar Ayarlar › Dönem ve gruplar 'Belgelileri ayrı şubede topla' (varsayılan açık: öneri ve uyarılar).
export const belgeliSubesi = g => !!(g && g.teoriksiz);
export const belgeliAyri = () => (S.kurs || {}).belgeliAyriSube !== false;
// Öğrenci ↔ şube uyumu uyarısı (yalnız ayar açıkken): belgeli aday teorikli şubede ya da teorikli aday belgeliler şubesinde
export function subeUyarisi(teorikli, g) {
  if (!g || !belgeliAyri() || !mebGrubuMu(g)) return '';
  if (!teorikli && !belgeliSubesi(g)) { const b = (S.gruplar || []).find(x => belgeliSubesi(x) && x.donem === g.donem && +x.grupNo === +g.grupNo); return `Bu aday teorik derse girmez; ${b ? b.ad + ' (belgeliler şubesi)' : 'teorik programı olmayan ayrı bir şube (ör. ' + grupAdi(g.donem, g.grupNo, sonrakiSube(g) || 'C') + ')'} önerilir. Teorik şubede kalırsa denetimde yoklamada derse gelmeyen görünebilir.`; }
  if (teorikli && belgeliSubesi(g)) return `${g.ad} belgeliler şubesi (teorik programı yok); bu aday teorik derse girecek, teorik programı olan bir şube seçin.`;
  return '';
}
export const tipAdi = t => (KURS_TIPLERI.find(x => x[0] === t) || [, t])[1];
export const grupBul = id => (S.gruplar || []).find(g => g.id === id) || null;
export const kursiyerGrubu = k => (k && grupBul(k.teorikGrup)) || null;
export const grupMetni = g => !g ? '' : (mebGrubuMu(g) ? `${g.ad} · ${tarih(g.baslangic)} başlıyor${g.sinif ? ' · ' + ((SINIFLAR[g.sinif] || {}).ad || g.sinif).split(' ·')[0] : ''}` : `${g.ad} · ${tarih(g.baslangic)} başlıyor`) + (grupTipi(g) !== 'MTSK' ? ' · ' + grupTipi(g) : '') + (g.ozelKod ? ' · ' + g.ozelKod : '');
const donemOf = t => String(t).slice(0, 4) + String(t).slice(5, 7);
const kisiler = g => sb(S.kursiyerler).filter(k => !k.kapali && k.asama !== 'Ehliyet' && k.teorikGrup === g.id);

/* ---------- e-sınavdan muafiyet: son 3 yılda e-sınavı (yazılı sınavı) geçen, yalnız direksiyon sınavına girer (15/5) ---------- */
// Sınır 3 yıl eksi 1 gün: 14.11.2023'te geçen 13.11.2026 dahil muaftır
export const muafSonGun = t => { const d = new Date(t + 'T12:00:00'); d.setFullYear(d.getFullYear() + 3); d.setDate(d.getDate() - 1); return iso(d); };
// TEO-001 (MTSK md.15/5, SOR-095): 3 yıl adayın SON GİRDİĞİ sınav tarihinden (e-sınav ya da uygulama, hangisi sonsa) sayılır; kayıt gününe göre bakılır.
// Model: k.muaf = { dayanak: '15/5', sonSinav, son, kaynak: 'elle'|'MEBBİS', not }. Eski kayıtlarda yalnız esinavTarih var: o tarih son sınav sayılır.
export const muafSonSinav = k => (k && k.muaf && (k.muaf.sonSinav || k.muaf.esinavTarih)) || '';
export const muafMi = (k, gunu) => { const t = muafSonSinav(k), g = gunu || (k && k.kayit) || gun(0); return !!t && t <= g && g <= muafSonGun(t); };
// Muafiyet önerisi (TEO-002): MEBBİS aday dosyasından (SKT02009) teoriği geçtiğine dair iz ve son girdiği sınav. Hiçbiri kendiliğinden işaretlemez.
// İz: MEBBİS durumunda 'muaf', e-sınav satırında 70 ve üstü puan, ikinci direksiyon aşamasına geçiş tarihi. Son sınav: kayıttan önceki e-sınav ve uygulama sınavlarının en geçi.
export function muafiyetOnerisi(k) {
  const m = (k && k.meb) || {}; if (!k || k.muaf) return null;
  const once = t => t && (!k.kayit || t <= k.kayit);
  const es = (m.esinavlar || []).filter(x => once(x.tarih)), uy = (m.uygulamaSinavlari || []).filter(x => once(x.tarih));
  const iz = [/muaf/i.test(m.durum || '') ? 'MEBBİS durumu “' + m.durum + '”' : '', es.some(x => x.puan >= 70) ? 'e-sınavı ' + Math.max(...es.filter(x => x.puan >= 70).map(x => x.puan)) + ' puanla geçmiş' : '', m.ikinciDireksiyon && once(m.ikinciDireksiyon) ? 'ikinci direksiyon aşamasına geçmiş (' + m.ikinciDireksiyon.split('-').reverse().join('.') + ')' : ''].filter(Boolean);
  if (!iz.length) return null;
  const sonSinav = [...es.map(x => x.tarih), ...uy.map(x => x.tarih)].sort().pop() || '';
  if (!sonSinav) return { iz, sonSinav: '', son: '', gecerli: null, metin: `MEBBİS’e göre teoriği geçmiş (${iz.join(', ')}); son girdiği sınavın tarihi bilinmiyor, muafiyet için elle girin.` };
  const son = muafSonGun(sonSinav), gecerli = (k.kayit || gun(0)) <= son;
  return { iz, sonSinav, son, gecerli, kaynak: /muaf/i.test(m.durum || '') ? 'mebbis' : '15/5', metin: gecerli ? `MEBBİS’e göre e-sınavdan muaf olabilir: ${iz.join(', ')}; son sınav ${sonSinav.split('-').reverse().join('.')}, muafiyet ${son.split('-').reverse().join('.')}’e kadar.` : `Muafiyet süresi ${son.split('-').reverse().join('.')}’te doldu (son sınav ${sonSinav.split('-').reverse().join('.')}); e-sınava girmesi gerekir.` };
}
export const muafKaydi = (sonSinav, kaynak = 'elle', not = '') => ({ dayanak: '15/5', sonSinav, son: muafSonGun(sonSinav), kaynak, ...(not ? { not } : {}), esinavTarih: sonSinav });

/* ---------- bekleyen / aktif ---------- */
// Bekleyen: kaydı yapılmış ama bir dönem grubuna alınmamış ya da evrakı eksik kursiyer
export function bekleyenMi(k) {
  if (!k || k.kapali) return false;
  if (['Kayıt', 'Evrak'].includes(k.asama)) return true;
  return k.asama === 'Teorik' && !kursiyerGrubu(k);
}
export function bekleyenNedeni(k) {
  const l = [];
  if (!kursiyerGrubu(k)) l.push('dönem grubuna atanmadı');
  const ev = eksikEvrak(k); if (ev.length) l.push('eksik evrak: ' + ev.map(x => x[1].toLocaleLowerCase('tr')).join(', '));
  return l;
}
// Evrakı tamam ve gruba atanmış kursiyer aktif olur: teorik aşamaya (muafsa doğrudan direksiyona) geçer
export function aktifEt(k) {
  if (!k || k.kapali || !['Kayıt', 'Evrak'].includes(k.asama) || eksikEvrak(k).length || !kursiyerGrubu(k)) return false;
  k.asama = muafMi(k) || esinavsizBelgeli(k) ? 'Direksiyon' : 'Teorik';   // belgeli aday teorik almaz (TEO-004)
  return true;
}

/* ---------- seçenekler ---------- */
// Kayıtta seçilebilecek gruplar: başlamamış (kayıt başlangıçtan önce) ve sınıfa uygun (grup sınıfa ayrılmışsa)
export function kayitGruplari(sinif) {
  return (S.gruplar || []).filter(g => g.baslangic && fark(g.baslangic) >= 0 && (!sinif || grupTipi(g) === sinifTipi(sinif)) && (!g.sinif || !sinif || g.sinif === sinif || g.sinif === anaSinif(String(sinif))))
    .sort((a, b) => a.baslangic.localeCompare(b.baslangic) || String(a.ad).localeCompare(String(b.ad), 'tr'));
}
// Var olan kursiyeri atarken: son 4 ay ve sonrası (MEBBİS'te zaten o grupta olan eski kursiyerler de eşlenebilsin)
function atanabilirGruplar(sinif) {
  const sinir = iso(new Date(Date.now() - 120 * 864e5));
  return (S.gruplar || []).filter(g => !g.baslangic || g.baslangic >= sinir).filter(g => (!sinif || grupTipi(g) === sinifTipi(sinif)) && (!g.sinif || !sinif || g.sinif === sinif || g.sinif === anaSinif(String(sinif))))
    .sort((a, b) => String(b.baslangic).localeCompare(String(a.baslangic)));
}
// Doluluk (DON-008): gruptaki aktif kursiyer / kapasite. Kapasite grup kartındaki kontenjan.
// DON-010: kontenjan girilmediyse kapasite MEBBİS'teki derslik oda kontenjanından (SKT01001/01003 okunduysa): grubun dersliği, yoksa en büyük açık derslik.
// Mevzuat sınırı derslik başına 30, kurum toplamı 90 (Standartlar Yönergesi md.35/1-ç; SOR-107).
export const DERSLIK_EN_COK = 30, KURUM_EN_COK = 90;
export function derslikKontenjani(derslikAd) {
  const mk = mebKurum(); if (!mk) return null;
  const dl = (mk.derslikler || []).filter(y => !/kapal/i.test(y.durum || '') && y.kontenjan), uyg = derslikAd && dl.find(y => nrmAd(y.ad) === nrmAd(derslikAd));
  const v = (uyg && uyg.kontenjan) || Math.max(0, ...dl.map(y => y.kontenjan)); return v ? Math.min(v, DERSLIK_EN_COK) : null;
}
export const kurumKapasitesi = () => { const mk = mebKurum(); if (!mk) return null; const t = (mk.derslikler || []).filter(y => !/kapal/i.test(y.durum || '')).reduce((a, y) => a + Math.min(+y.kontenjan || 0, DERSLIK_EN_COK), 0); return t ? Math.min(t, KURUM_EN_COK) : null; };
export const grupKapasite = g => (g && +g.kontenjan) || (g ? derslikKontenjani(g.derslik) : null);
// Aynı dönem ve grubun ilk boş şube harfi (A–H); grup dolunca öneri
export const sonrakiSube = g => { if (!mebGrubuMu(g)) return null; const dolu = new Set((S.gruplar || []).filter(x => mebGrubuMu(x) && x.donem === g.donem && +x.grupNo === +g.grupNo).map(x => x.sube)); return SUBELER.find(s => !dolu.has(s)) || null; };
// Aynı dönem ve grubun şubelerinin toplam kapasitesi (aynı anda derste olurlar)
export const grupToplamKapasite = (donem, grupNo, haric) => (S.gruplar || []).filter(x => mebGrubuMu(x) && x.donem === donem && +x.grupNo === +grupNo && x.id !== haric).reduce((a, x) => a + (grupKapasite(x) || 0), 0);
export const grupDoluluk = g => { const n = g ? kisiler(g).length : 0, k = grupKapasite(g); return { n, k, dolu: !!k && n >= k }; };
export const dolulukMetni = g => { const d = grupDoluluk(g); return `${d.n}${d.k ? '/' + d.k : ''} kişi${d.dolu ? ' · dolu' : ''}`; };
export const grupSecenekleri = (l, secili) => l.map(g => `<option value="${e(g.id)}" ${g.id === secili ? 'selected' : ''}>${e(grupMetni(g))} · ${dolulukMetni(g)}</option>`).join('');

/* ---------- grup kartı oluşturma / düzenleme ---------- */
function donemSecenekleri(secili) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  const l = []; for (let i = 0; i < 4; i++) { l.push(iso(d).slice(0, 4) + iso(d).slice(5, 7)); d.setMonth(d.getMonth() + 1); }
  if (secili && !l.includes(secili)) l.unshift(secili);
  const ac = acilabilirDonem();
  return l.map(x => `<option value="${x}" ${x === secili ? 'selected' : ''}>${e(donemAdi(x))}${x === ac ? ' · MEBBİS’te açık' : ''}</option>`).join('');
}
const ayBasi = donem => `${String(donem).slice(0, 4)}-${String(donem).slice(4, 6)}`;
// MEBBİS skt03001'de açılabilen dönem (17 Kas canlı: yalnız 202612): kayıt ve onay ayın 10'unda kapanır, sonraki ayın grubu bu ayın ortasından açılır.
// Ayın 1–10'u: içinde bulunulan ay; 11'inden sonra: gelecek ay. MEBBİS'te zaten açılmış grubu girerken başka dönem de seçilebilir (yalnız uyarı). DON-005
export function acilabilirDonem(t = gun(0)) { const d = new Date(t + 'T12:00'); if (d.getDate() > 10) { d.setDate(1); d.setMonth(d.getMonth() + 1); } return donemOf(iso(d)); }
export function donemUyarisi(g) {
  const ac = acilabilirDonem(); if (!g || !/^\d{6}$/.test(g.donem) || g.donem === ac) return '';
  return g.donem < ac ? `MEBBİS’te ${donemAdi(g.donem)} dönemi için yeni grup açılamaz (şu an yalnız ${donemAdi(ac)} açık). MEBBİS’te zaten açılmış grubu giriyorsanız devam edin.` : `MEBBİS ${donemAdi(g.donem)} dönemini ${donemAdi(String(+g.donem - (String(g.donem).endsWith('01') ? 89 : 1)))} ayının ortasında açar; şimdilik yalnız ${donemAdi(ac)} açık.`;
}
export function grupHatasi(g, haric) {
  if (!/^\d{6}$/.test(g.donem)) return 'Dönemi seçin';
  if (!GRUP_NOLAR.includes(+g.grupNo)) return 'Grup 1, 2 ya da 3 olmalı';
  if (!SUBELER.includes(g.sube)) return 'Şube A ile H arasında olmalı (MEBBİS’te 8 şube var)';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.baslangic || '')) return 'Başlangıç tarihini seçin';
  if (g.baslangic.slice(0, 7) !== ayBasi(g.donem) || +g.baslangic.slice(8, 10) > 10) return `Grup, dönemin ayında 1’i ile 10’u arasında başlamalı (${donemAdi(g.donem)}: 01–10)`;
  const ayni = (S.gruplar || []).filter(x => x.id !== haric && mebGrubuMu(x) && x.donem === g.donem);
  if (ayni.some(x => +x.grupNo === +g.grupNo && x.sube === g.sube)) return `${grupAdi(g.donem, g.grupNo, g.sube)} zaten var`;
  const kardes = ayni.find(x => +x.grupNo === +g.grupNo && x.baslangic !== g.baslangic);
  if (kardes) return `Grup ${g.grupNo}’in başlangıcı ${tarih(kardes.baslangic)} (${kardes.ad}). Aynı grubun bütün şubeleri aynı gün başlar; başka tarih için Grup ${[1, 2, 3].find(n => !ayni.some(x => +x.grupNo === n)) || '—'} kullanın`;
  return '';
}
export function grupFormu(on = {}, sonra) {
  const g0 = on.id ? grupBul(on.id) : null, kilit = g0 && kisiler(g0).length;
  // ayın 10'u geçtiyse yeni grup ancak gelecek aya açılır
  const bugunDonem = (() => { const d = new Date(); if (d.getDate() > 10) { d.setDate(1); d.setMonth(d.getMonth() + 1); } return donemOf(iso(d)); })();
  const v = { donem: (g0 && g0.donem) || on.donem || bugunDonem, grupNo: (g0 && g0.grupNo) || on.grupNo || 1, sube: (g0 && g0.sube) || on.sube || 'A', baslangic: (g0 && g0.baslangic) || '', sinif: (g0 && g0.sinif) || on.sinif || '', derslik: (g0 && g0.derslik) || '', kontenjan: (g0 && g0.kontenjan) || '', tip: (g0 && grupTipi(g0)) || on.tip || (on.sinif ? sinifTipi(on.sinif) : 'MTSK'), ozelKod: (g0 && g0.ozelKod) || '', teoriksiz: !!(g0 ? g0.teoriksiz : on.teoriksiz) };
  const sinifler = Object.entries(SINIFLAR).filter(([k, x]) => x.aktif !== false || k === v.sinif);
  const sinifSecenek = tip => `<option value="">Bütün sınıflar</option>${sinifler.filter(([k]) => sinifTipi(k) === tip).map(([k, x]) => `<option value="${k}" ${v.sinif === k ? 'selected' : ''}>${e(x.ad.split(' ·')[0])}</option>`).join('')}`;
  pencere({
    ust: !!on.ust,  // kayıt formundan açılınca kayıt formu kapanmaz (girilen bilgiler korunur)
    baslik: g0 ? 'Grubu düzenle · ' + g0.ad : 'Yeni dönem grubu',
    icerik: `<form id="f-grup" class="form-izgara" novalidate>
      <p class="ipucu tam">${isaret('bilgi', 18)}<span>MEBBİS’teki dönem grubuyla aynı olmalı: dönem, grup (1–3), şube (A–H) ve başlangıç tarihi (ayın 1’i ile 10’u arası). Kursiyer, grubun başlangıcından önce kaydedilir.</span></p>
      <div class="alan"><label for="g-donem">Dönem</label><select id="g-donem" name="donem" ${kilit ? 'disabled' : ''}>${donemSecenekleri(v.donem)}</select></div>
      <div class="alan"><label for="g-no">Grup</label><select id="g-no" name="grupNo" ${kilit ? 'disabled' : ''}>${GRUP_NOLAR.map(n => `<option value="${n}" ${+v.grupNo === n ? 'selected' : ''}>Grup ${n}</option>`).join('')}</select></div>
      <div class="alan"><label for="g-sube">Şube</label><select id="g-sube" name="sube" ${kilit ? 'disabled' : ''}>${SUBELER.map(s => `<option value="${s}" ${v.sube === s ? 'selected' : ''}>${s} Şubesi</option>`).join('')}</select></div>
      <div class="alan"><label for="g-bas">Başlangıç tarihi</label><input id="g-bas" name="baslangic" type="date" value="${e(v.baslangic)}" ${kilit ? 'disabled' : ''}></div>
      <div class="alan"><label for="g-tip">Kurs tipi</label><select id="g-tip" name="tip" ${kilit ? 'disabled' : ''}>${KURS_TIPLERI.map(([k, t]) => `<option value="${k}" ${v.tip === k ? 'selected' : ''}>${e(t)}</option>`).join('')}</select></div>
      <label class="alan tam" style="flex-direction:row;display:flex;gap:10px;align-items:flex-start;font-size:14px"><span class="anahtar"><input type="checkbox" name="teoriksiz" ${v.teoriksiz ? 'checked' : ''}><i></i></span><span><b>Belgeliler şubesi</b> · teorik programı yok<small style="display:block;color:var(--soluk)">Mevcut belgesi olan, teorik derse girmeyen adaylar için. MEBBİS’e bu şubeye teorik ders girilmez; teorik ders denetimi bu şubeyi saymaz.</small></span></label>
      <div class="alan"><label for="g-ozel">Özel kod <small style="color:var(--soluk);font-weight:400">isteğe bağlı</small></label><input id="g-ozel" name="ozelKod" maxlength="40" value="${e(v.ozelKod)}" placeholder="Ör. Hafta sonu, Belgeliler"></div>
      <div class="alan"><label for="g-sinif">Sınıf</label><select id="g-sinif" name="sinif">${sinifSecenek(v.tip)}</select><small style="color:var(--soluk)">İlk kez ehliyet alanlar genelde aynı gruptadır; ehliyet türüne göre ayrı grup gerekiyorsa sınıf seçin.</small></div>
      <div class="alan"><label for="g-dl">Derslik</label><input id="g-dl" name="derslik" value="${e(v.derslik)}" placeholder="Derslik 1" list="g-dl-l"><datalist id="g-dl-l">${derslikListesi().map(x => `<option value="${e(x.ad)}">${e([x.tur, x.kontenjan ? x.kontenjan + ' kişi' : ''].filter(Boolean).join(' · '))}</option>`).join('')}</datalist></div>
      <div class="alan"><label for="g-kon">Kontenjan</label><input id="g-kon" name="kontenjan" inputmode="numeric" value="${e(v.kontenjan)}" placeholder="${derslikKontenjani(v.derslik) ? 'Derslikten: ' + derslikKontenjani(v.derslik) : 'Boş bırakılabilir'}"><small id="g-kon-not" style="color:var(--soluk)"></small></div>
      <div class="alan tam"><span class="et">MEBBİS’teki adı</span><b id="g-ad" style="font-size:18px;color:var(--murekkep)"></b> <small id="g-hata" style="display:block;color:var(--kirmizi);font-weight:700;margin-top:4px"></small><small id="g-donem-not" style="display:block;color:var(--turuncu);font-weight:600;margin-top:4px"></small></div>
      ${g0 ? '' : `<p class="ipucu tam">${isaret('uyari', 18)}<span>MEBBİS’te sıra: önce grup (Dönem Grup Açılış), sonra şube (Grup Şube Tanımlama), sonra kayıt. Bir dönemde en çok 3 grup açılır; <b>grup başlangıç tarihi sonradan değiştirilemez</b>.</span></p>`}
      ${kilit ? `<p class="ipucu uyari tam">${isaret('uyari', 18)}<span>Bu gruba ${kilit} kursiyer atanmış; dönem, grup, şube ve tarih değiştirilemez (MEBBİS’te de açılış tarihi sonradan değişmez).</span></p>` : ''}
    </form>`,
    altlik: `${g0 && !kilit ? '<button class="dg dg-cizgi" data-grup-sil style="margin-right:auto;color:var(--kirmizi)">Grubu sil</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-grup">${g0 ? 'Kaydet' : 'Grubu oluştur'}</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      const oku = () => ({ donem: f.donem.value, grupNo: +f.grupNo.value, sube: f.sube.value, baslangic: f.baslangic.value, sinif: f.sinif.value, derslik: f.derslik.value.trim(), kontenjan: +String(f.kontenjan.value).replace(/\D/g, '') || null, tip: f.tip.value || 'MTSK', ozelKod: f.ozelKod.value.trim(), teoriksiz: !!f.teoriksiz.checked });
      const guncelle = () => {
        const x = oku();
        f.baslangic.min = ayBasi(x.donem) + '-01'; f.baslangic.max = ayBasi(x.donem) + '-10';
        // aynı grubun başka şubesi varsa başlangıç tarihi ondan gelir
        const kardes = (S.gruplar || []).find(y => y.id !== (g0 && g0.id) && mebGrubuMu(y) && y.donem === x.donem && +y.grupNo === x.grupNo);
        if (kardes && !kilit && f.baslangic.value !== kardes.baslangic) f.baslangic.value = kardes.baslangic;
        d.querySelector('#g-ad').textContent = grupAdi(x.donem, x.grupNo, x.sube);
        // MEBBİS kurum bilgisi okunduysa: derslik ve bina kontenjanı (SKT01001; RAP-006)
        { const mk = mebKurum(), n = d.querySelector('#g-kon-not'); if (n && mk) { const dl = (mk.derslikler || []).filter(y => !/kapal/i.test(y.durum || '')), en = Math.max(0, ...dl.map(y => y.kontenjan || 0)), uyg = dl.find(y => x.derslik && nrmAd(y.ad) === nrmAd(x.derslik));
          const sinir = (uyg && uyg.kontenjan) || en || null, asar = x.kontenjan && sinir && x.kontenjan > sinir;
          n.style.color = asar ? 'var(--kirmizi)' : 'var(--soluk)'; n.style.fontWeight = asar ? '700' : '';
          f.kontenjan.placeholder = derslikKontenjani(x.derslik) ? 'Derslikten: ' + derslikKontenjani(x.derslik) : 'Boş bırakılabilir';
          const kk = kurumKapasitesi(), top = grupToplamKapasite(x.donem, x.grupNo, g0 && g0.id) + (x.kontenjan || derslikKontenjani(x.derslik) || 0);
          if (kk && top > kk && !asar) { n.style.color = 'var(--kirmizi)'; n.style.fontWeight = '700'; n.textContent = `Grup ${x.grupNo}’in şubeleri toplam ${top} kişi olur; kurumun derslik kapasitesi ${kk} (en çok ${KURUM_EN_COK}).`; } else
          n.textContent = asar ? `MEBBİS’te ${uyg ? uyg.ad + ' ' : 'en büyük derslik '}kontenjanı ${sinir}; grup kontenjanı bunu aşamaz` : sinir ? `MEBBİS’te ${uyg ? uyg.ad : 'derslik'} kontenjanı ${sinir}${mk.binaKontenjan ? ' · bina ' + mk.binaKontenjan : ''}` : mk.binaKontenjan ? 'MEBBİS’te bina kontenjanı ' + mk.binaKontenjan : ''; } }
        d.querySelector('#g-hata').textContent = f.baslangic.value ? grupHatasi(oku(), g0 && g0.id) : '';
        d.querySelector('#g-donem-not').textContent = g0 ? '' : donemUyarisi(x);
      };
      // kurs tipi değişince sınıf listesi o tipin sınıfları olur
      f.tip.addEventListener('change', () => { f.sinif.innerHTML = sinifSecenek(f.tip.value); });
      f.addEventListener('change', guncelle); f.addEventListener('input', guncelle); guncelle();
      const sil = d.querySelector('[data-grup-sil]'); if (sil) sil.addEventListener('click', () => pencereSor(d, { baslik: g0.ad + ' silinsin mi?', metin: `Grup yalnız mdSinyal’den silinir; MEBBİS’teki gruba dokunulmaz. MEBBİS’te grubu silerseniz o gruba kayıtlı adaylar da silinir; MEBBİS’te silme işini kendiniz yapın.`, secenekler: [['sil', 'mdSinyal’den sil', 'dg-cizgi'], ['vazgec', 'Vazgeç', 'dg-ana']] }, c => { if (c !== 'sil') return; S.gruplar = S.gruplar.filter(y => y.id !== g0.id); islem('Dönem grubunu sildi', g0.ad); kaydet(); kapatPencere(); bildir(g0.ad + ' silindi'); sonra && sonra(null); }));
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const x = oku(), h = grupHatasi(x, g0 && g0.id); if (h) return bildir(h, 'uyari');
        // yeni grup: MEBBİS'te başlangıç tarihi sonradan değişmez; kesin karar bir kez sorulur (aynı grubun yeni şubesinde tarih zaten belli)
        const kardes0 = !g0 && (S.gruplar || []).some(y => mebGrubuMu(y) && y.donem === x.donem && +y.grupNo === x.grupNo);
        if (!g0 && !kardes0 && !f.dataset.kesin) return pencereSor(d, { baslik: 'Başlangıç tarihi kesin mi?', metin: `${grupAdi(x.donem, x.grupNo, x.sube)} ${tarih(x.baslangic)} tarihinde başlayacak. MEBBİS’te grup başlangıç tarihi sonradan değiştirilemez; bu dönemde Grup ${x.grupNo} bu tarihle açılır.${donemUyarisi(x) ? ' ' + donemUyarisi(x) : ''}`, secenekler: [['evet', 'Evet, grubu aç', 'dg-ana'], ['vazgec', 'Tarihi değiştireceğim', 'dg-cizgi']] }, c => { if (c === 'evet') { f.dataset.kesin = '1'; f.requestSubmit(); } });
        const g = g0 || { id: 'g' + x.donem + '-' + x.grupNo + x.sube, kaynak: 'mdSinyal' };
        Object.assign(g, { ...x, ad: grupAdi(x.donem, x.grupNo, x.sube) });
        if (!g0) { S.gruplar = [...(S.gruplar || []), g]; islem('Dönem grubu açtı', g.ad + ' · ' + g.baslangic); } else islem('Dönem grubunu düzenledi', g.ad);
        kaydet(); kapatPencere(); bildir(`${g.ad} ${g0 ? 'güncellendi' : 'oluşturuldu'}. MEBBİS’te de aynı grubu (${donemAdi(g.donem)}, Grup ${g.grupNo}, ${g.sube} Şubesi, ${tarih(g.baslangic)}) açın.`, 'tamam');
        sonra && sonra(g);
      });
    },
  });
}

/* ---------- atama ---------- */
export function grupAta(k, g) {
  k.teorikGrup = g.id;
  const aktif = aktifEt(k);
  return aktif;
}
// Öğrenci ekranından tek kursiyeri gruba atama
export function grupAtaPencere(k, sonra) {
  const l = atanabilirGruplar(k.sinif), mevcut = kursiyerGrubu(k);
  pencere({
    baslik: 'Dönem grubu · ' + tamAd(k),
    icerik: l.length ? `<div class="alan"><label for="ga-g">Grup</label><select id="ga-g" class="girdi">${grupSecenekleri(l, mevcut && mevcut.id)}</select></div>
      <p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>MEBBİS’te kursiyer aynı dönem, grup ve şubeye kaydedilir. Kayıt grubun başlangıcından önce yapılmalı.</span></p>`
      : `<p>${SINIFLAR[k.sinif] ? e(SINIFLAR[k.sinif].ad.split(' ·')[0]) + ' sınıfına' : 'Bu kursiyere'} uygun grup yok. Önce bir dönem grubu açın.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-cizgi" data-yeni-grup>${ik('arti')}Yeni grup</button>${l.length ? '<button class="dg dg-ana" data-ata>Ata</button>' : ''}`,
    onAc(d) {
      d.querySelector('[data-yeni-grup]').addEventListener('click', () => { kapatPencere(); grupFormu({ sinif: '' }, g => g && grupAtaPencere(k, sonra)); });
      const b = d.querySelector('[data-ata]'); if (!b) return;
      b.addEventListener('click', () => {
        const g = grupBul(d.querySelector('#ga-g').value); if (!g) return;
        { const su = subeUyarisi(teorikVar(k), g); if (su && !confirm(su + '\n\nYine de bu şubeye atansın mı?')) return; }
        if (k.kayit && g.baslangic && k.kayit > g.baslangic && !confirm(`${tamAd(k)} ${tarih(k.kayit)} tarihinde kaydolmuş; ${g.ad} ${tarih(g.baslangic)} tarihinde başladı. Kayıt grubun başlangıcından önce olmalı (12/2). MEBBİS’te zaten bu gruptaysa devam edin. Atansın mı?`)) return;
        const aktif = grupAta(k, g); islem('Gruba atadı', tamAd(k) + ' · ' + g.ad); kaydet(); kapatPencere();
        bildir(`${tamAd(k)} ${g.ad} grubuna atandı${aktif ? '; evrakı tam olduğu için aktif oldu' : bekleyenMi(k) ? '; evrakı tamamlanınca aktif olur' : ''}`, 'tamam');
        sonra && sonra();
      });
    },
  });
}
// Grup kartından toplu atama: gruba uygun, grubu olmayan ya da bekleyen kursiyerler
export function topluAtaPencere(g, sonra) {
  const aday = sb(S.kursiyerler).filter(k => !k.kapali && k.teorikGrup !== g.id && (!kursiyerGrubu(k) || bekleyenMi(k)) && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama) && (!g.sinif || k.sinif === g.sinif || anaSinif(k.sinif) === g.sinif))
    .sort((a, b) => String(b.kayit).localeCompare(String(a.kayit)));
  pencere({
    baslik: g.ad + ' · kursiyer ata',
    icerik: aday.length ? `<p style="color:var(--soluk);margin-bottom:10px">${tarih(g.baslangic)} başlıyor${g.sinif ? ' · ' + e(SINIFLAR[g.sinif].ad.split(' ·')[0]) : ''} · şu an ${kisiler(g).length} kursiyer${g.kontenjan ? ' / ' + g.kontenjan : ''}</p>
      <label class="evrak" style="cursor:pointer;margin-bottom:6px"><input type="checkbox" data-hepsi style="width:18px;height:18px"><b>Hepsini seç (${aday.length})</b></label>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px 18px;max-height:52vh;overflow:auto">${aday.map(k => { const gg = kursiyerGrubu(k); return `<label class="evrak" style="cursor:pointer"><input type="checkbox" name="k" value="${k.id}" style="width:18px;height:18px"><span><b>${e(tamAd(k))}</b><small style="display:block;color:var(--soluk)">${e(SINIFLAR[k.sinif].ad.split(' ·')[0])} · kayıt ${tarih(k.kayit)}${gg ? ' · şu an ' + e(gg.ad) : ''}${eksikEvrak(k).length ? ' · evrak eksik' : ''}</small></span></label>`; }).join('')}</div>`
      : `<p>Bu gruba atanabilecek kursiyer yok. Grubu olmayan ya da bekleyen kursiyerler burada listelenir.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${aday.length ? '<button class="dg dg-ana" data-ata>Seçilenleri ata</button>' : ''}`,
    onAc(d) {
      const h = d.querySelector('[data-hepsi]'); if (h) h.addEventListener('change', () => d.querySelectorAll('[name=k]').forEach(x => { x.checked = h.checked; }));
      const b = d.querySelector('[data-ata]'); if (!b) return;
      b.addEventListener('click', () => {
        const l = [...d.querySelectorAll('[name=k]:checked')].map(x => S.kursiyerler.find(k => k.id === x.value)).filter(Boolean);
        if (!l.length) return bildir('Kursiyer seçin', 'uyari');
        if (g.kontenjan && kisiler(g).length + l.length > g.kontenjan && !confirm(`${g.ad} kontenjanı ${g.kontenjan}; atanınca ${kisiler(g).length + l.length} olacak. Devam edilsin mi?`)) return;
        const aktif = l.filter(k => grupAta(k, g)).length;
        islem('Gruba toplu atadı', g.ad + ' · ' + l.length + ' kursiyer'); kaydet(); kapatPencere();
        bildir(`${l.length} kursiyer ${g.ad} grubuna atandı${aktif ? ` · ${aktif} kişi aktif oldu` : ''}`, 'tamam');
        sonra && sonra();
      });
    },
  });
}

/* ---------- teorik dersler ekranındaki kart ---------- */
export function gruplarKarti() {
  const l = (S.gruplar || []).filter(g => !g.baslangic || fark(g.baslangic) >= -120).sort((a, b) => String(b.baslangic).localeCompare(String(a.baslangic)) || String(a.ad).localeCompare(String(b.ad), 'tr'));
  const bek = sb(S.kursiyerler).filter(bekleyenMi);
  return `<div class="kart"><div class="kart-bas"><h3>Dönem grupları</h3><small>MEBBİS’teki dönem, grup ve şubelerle aynı</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-grup-yeni>${ik('arti')}Yeni grup</button></div></div>
    ${l.length ? `<ul class="liste grup-liste" style="margin-top:8px">${l.map(g => { const n = kisiler(g).length, bas = fark(g.baslangic); return `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(g.ad)}</b>${mebGrubuMu(g) ? '' : ' ' + rozet('MEBBİS dışı', 'notr')}<small style="display:block;color:var(--soluk)">${mebGrubuMu(g) ? e(donemAdi(g.donem)) + ' · Grup ' + g.grupNo + ' · ' + g.sube + ' Şubesi · ' : ''}${bas > 0 ? tarih(g.baslangic) + ' başlıyor' : bas === 0 ? 'bugün başlıyor' : tarih(g.baslangic) + ' başladı'}${g.sinif ? ' · ' + e(((SINIFLAR[g.sinif] || {}).ad || g.sinif).split(' ·')[0]) : ''}${g.derslik ? ' · ' + e(g.derslik) : ''}</small></div>
      <span class="sag"><span class="sayi" style="font-size:13px">${n}${g.kontenjan ? '/' + g.kontenjan : ''} kişi · ${belgeliSubesi(g) ? 'belgeliler · teorik yok' : `teorik ${teorikDurum(g).toplam}/34 saat`}</span><button class="dg dg-cizgi dg-kucuk" data-teorik-ekle="${e(g.id)}">Ders ekle</button><button class="dg dg-cizgi dg-kucuk" data-grup-ata="${e(g.id)}">Kursiyer ata</button>${mebGrubuMu(g) ? `<button class="dg dg-hafif dg-kucuk" data-grup-duzenle="${e(g.id)}" aria-label="Düzenle">${ik('kalem')}</button>` : ''}</span></li>`; }).join('')}</ul>`
      : `<div class="kart-govde"><p style="color:var(--metin)">Henüz dönem grubu yok. MEBBİS’te açtığınız grubu burada da açın (ör. <b>Kasım 1A</b>); kayıtta grup seçimi zorunlu. MEBBİS Yardımcısı kuruluysa <b>MEB işlemleri › MEBBİS’ten al › Dönem grupları</b> ile MEBBİS’teki grupları da çekebilirsiniz.</p></div>`}
    ${bek.length ? `<div class="kart-bas" style="padding-top:18px"><h3>Bekleyen kursiyerler</h3><small>Kaydı yapıldı; gruba atanmadı ya da evrakı eksik · ${bek.length}</small></div>
      <ul class="liste" style="margin-top:6px">${bek.slice(0, 30).map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1;min-width:0"><div><b>${e(tamAd(k))}</b><small>${e(SINIFLAR[k.sinif].ad.split(' ·')[0])} · ${e(bekleyenNedeni(k).join(' · '))}</small></div></a>${kursiyerGrubu(k) ? '' : `<button class="dg dg-cizgi dg-kucuk" data-kursiyer-grup="${k.id}">Gruba ata</button>`}</li>`).join('')}</ul>` : ''}
  </div>`;
}
export function gruplarBaglan(k, yenile) {
  k.addEventListener('change', ev => { const b = ev.target.closest('[data-belgeli-ayri]'); if (!b) return; S.kurs.belgeliAyriSube = b.checked; islem('Belgeliler şubesi ayarını değiştirdi', b.checked ? 'açık' : 'kapalı'); kaydet(); bildir(b.checked ? 'Belgeli adaylara ayrı şube önerilecek' : 'Belgeliler şubesi önerisi kapandı'); });
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-grup-yeni]')) return grupFormu({}, () => yenile());
    const a = ev.target.closest('[data-grup-ata]'); if (a) { const g = grupBul(a.dataset.grupAta); return g && topluAtaPencere(g, yenile); }
    const d = ev.target.closest('[data-grup-duzenle]'); if (d) return grupFormu({ id: d.dataset.grupDuzenle }, () => yenile());
    const mt = ev.target.closest('[data-grup-meb-tarih]'); if (mt) return mebTarihiniAl(mt.dataset.grupMebTarih, yenile);
    if (ev.target.closest('[data-derslik-ekle]')) return derslikFormu(null, yenile);
    const dd = ev.target.closest('[data-derslik-duz]'); if (dd) return derslikFormu(dd.dataset.derslikDuz, yenile);
    const te = ev.target.closest('[data-teorik-ekle]'); if (te) { const g = grupBul(te.dataset.teorikEkle); return g && teorikDersPencere(g, yenile); }
    if (ev.target.closest('[data-ogretmen-ekle]')) return ogretmenPencere(null, yenile);
    const od = ev.target.closest('[data-ogretmen-duzenle]'); if (od) { const o = (S.ogretmenler || []).find(x => x.id === od.dataset.ogretmenDuzenle); return o && ogretmenPencere(o, yenile); }
    const kg = ev.target.closest('[data-kursiyer-grup]'); if (kg) { const x = S.kursiyerler.find(y => y.id === kg.dataset.kursiyerGrup); return x && grupAtaPencere(x, yenile); }
  });
}

/* ---------- MEBBİS'ten gelen grup/şube listesi (SKT03002 Grup Şube Tanımlama) ---------- */
// Sütunlar: Dönemi · Grup Adı · Şubesi · Grup Başlama Tarihi · Kurum Onay Durumu. Son 4 ay ve sonrası alınır.
const nrm = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
export function mebbisGruplariAl(sat, sessiz) {
  const bas = (sat[0] || []).map(nrm), bul = (...l) => bas.findIndex(h => l.some(x => h.includes(x)));
  const iD = bul('donem'), iG = bul('grup adi', 'grubu', 'grup'), iS = bul('sube'), iT = bul('baslama', 'baslangic', 'tarih');
  if (iD < 0 || iS < 0 || iT < 0) return sessiz ? { yeni: 0, var_: 0, atla: sat.length - 1 } : bildir('Listede dönem, şube ya da başlama tarihi sütunu bulunamadı. MEBBİS’te “Grup Şube Tanımlama” ekranından gönderin.', 'uyari');
  const sinir = iso(new Date(Date.now() - 120 * 864e5)); let yeni = 0, var_ = 0, atla = 0, farkli = 0;
  sat.slice(1).forEach(r => {
    const dm = nrm(r[iD]), yil = (dm.match(/\d{4}/) || [])[0], ay = AYLAR.findIndex(a => dm.includes(nrm(a))) + 1;
    // "Grup 1" / "Grup-1" ve "A Şubesi" / "A ŞUBESİ" / "A" biçimleri
    const no = +((String(r[iG] || '').match(/[123]/) || [])[0] || 0), sb_ = ((String(r[iS] || '').trim().toLocaleUpperCase('tr').match(/(?:^|[^A-ZÇĞİÖŞÜ])([A-H])(?=$|[^A-ZÇĞİÖŞÜ0-9])/) || [])[1]) || '';
    const t = String(r[iT] || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/), bt = t ? `${t[3]}-${t[2].padStart(2, '0')}-${t[1].padStart(2, '0')}` : '';
    if (!yil || !ay || !no || !SUBELER.includes(sb_) || !bt) { atla++; return; }
    if (bt < sinir) return;
    const donem = yil + String(ay).padStart(2, '0'), id = 'g' + donem + '-' + no + sb_;
    const g = (S.gruplar || []).find(x => x.id === id || (mebGrubuMu(x) && x.donem === donem && +x.grupNo === no && x.sube === sb_));
    // MEBBİS'teki başlangıç esastır (DON-006/007): mdSinyal'deki tarih farklıysa üzerine yazılmaz, fark olarak saklanır; Ayarlar › Dönem ve gruplar'da etkisiyle düzeltilir
    if (g) { g.meb = true; if (!g.baslangic) g.baslangic = bt; else if (g.baslangic !== bt) { if (g.mebBaslangic !== bt) farkli++; g.mebBaslangic = bt; } else delete g.mebBaslangic; var_++; return; }
    S.gruplar = [...(S.gruplar || []), { id, donem, grupNo: no, sube: sb_, baslangic: bt, ad: grupAdi(donem, no, sb_), sinif: '', derslik: '', kontenjan: null, meb: true, kaynak: 'MEBBİS' }]; yeni++;
  });
  if (yeni || farkli) { islem('MEBBİS’ten dönem grupları aldı', yeni + ' yeni grup' + (farkli ? ' · ' + farkli + ' grupta başlangıç farkı' : '')); }
  kaydet();
  if (sessiz) return { yeni, var_, atla, farkli };
  location.hash = '#/teorik';
  bildir(yeni ? `MEBBİS’ten ${yeni} dönem grubu eklendi${var_ ? `; ${var_} grup zaten vardı` : ''}. Kursiyerleri gruplara atayabilirsiniz.` : var_ ? `MEBBİS’teki ${var_} grubun hepsi mdSinyal’de zaten var` : `Son 4 ayda açılmış grup bulunamadı${atla ? ` (${atla} satır okunamadı)` : ''}`, yeni || var_ ? 'tamam' : 'uyari');
}

/* ---------- teorik ders planı ve teorik öğretmenler (MEBBİS teorik program aktarımı için) ---------- */
// 7/1: trafik ve çevre 16, ilk yardım 8, araç tekniği 6, trafik adabı 4 = 34 saat; günde 2–6 saat (16/4); 07:00–23:00 (20/1)
export const TEORIK_DERSLER = [['Trafik ve Çevre', 16], ['İlk Yardım', 8], ['Araç Tekniği', 6], ['Trafik Adabı', 4]];
const konuNo = k => { const n = String(k || '').toLocaleLowerCase('tr'); return /ilk ?yard/.test(n) ? 1 : /araç|arac|motor|teknik/.test(n) ? 2 : /adab|adap/.test(n) ? 3 : 0; };
export function teorikDurum(g) {
  const l = (S.teorik || []).filter(t => t.grup === g.id), saat = [0, 0, 0, 0];
  l.forEach(t => { saat[konuNo(t.konu)] += +t.sure || 1; });
  return { saat, toplam: saat.reduce((a, b) => a + b, 0) };
}
// Adayın teorik derslerinin bitiş tarihi (TEO-017): MEBBİS'teki program okunduysa şubenin son teorik dersi (esas), yoksa mdSinyal'deki plan 34 saati tamamlıyorsa son planlı ders.
// MEBBİS e-sınav başvurusunda "Adayın teorik dersleri bitmeden başvuru yapamazsınız" (skt02007, 18 Kas): başvuru bu tarihten sonra.
export function teorikBitis(k) {
  const g = kursiyerGrubu(k); if (!g || g.teoriksiz) return null;
  if (g.mebTeorik && g.mebTeorik.son) return { tarih: g.mebTeorik.son, kaynak: 'MEBBİS', saat: g.mebTeorik.saat };
  const l = (S.teorik || []).filter(t => t.grup === g.id), saat = l.reduce((a, t) => a + (+t.sure || 1), 0);
  return saat >= 34 ? { tarih: l.map(t => t.tarih).sort().pop(), kaynak: 'plan', saat } : null;
}
export const teorikBitisMetni = k => { const b = teorikBitis(k); if (!b) return ''; const t = tarih(b.tarih) + ' ' + b.tarih.slice(0, 4); return `${b.kaynak === 'MEBBİS' ? 'MEBBİS’e göre' : 'Plana göre'} teorik dersler ${t}${fark(b.tarih) < 0 ? '’te bitti' : ' bitiyor'}`; };
export function teorikDersPencere(g, sonra) {
  if (belgeliSubesi(g)) return pencere({ baslik: g.ad + ' · teorik ders', icerik: `<p>${e(g.ad)} belgeliler şubesi: teorik programı yok, MEBBİS’e bu şubeye teorik ders girilmez. Teorik ders eklemek için önce grup kartında “Belgeliler şubesi” işaretini kaldırın.</p>`, altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
  const og = S.ogretmenler || [], d = teorikDurum(g);
  pencere({
    baslik: g.ad + ' · teorik ders ekle',
    icerik: og.length ? `<form id="f-teorik" class="form-izgara" novalidate>
      <p class="ipucu tam">${isaret('bilgi', 18)}<span>Planlanan: ${TEORIK_DERSLER.map(([ad, s], i) => `${ad} ${d.saat[i]}/${s}`).join(' · ')} saat. Dersler tam saatte başlar (MEBBİS dilimleri 50 dk); günde 2–6 saat.</span></p>
      <div class="alan"><label for="td-tur">Ders</label><select id="td-tur" name="tur">${TEORIK_DERSLER.map(([ad, s], i) => `<option ${d.saat[i] < s && !TEORIK_DERSLER.slice(0, i).some(([, s2], j) => d.saat[j] < s2) ? 'selected' : ''}>${ad}</option>`).join('')}</select></div>
      <div class="alan"><label for="td-ogr">Öğretmen</label><select id="td-ogr" name="ogretmen">${og.map(o => `<option value="${e(o.id)}">${e(o.ad)}${o.calismaIzinNo ? '' : ' · izin no yok'}</option>`).join('')}</select></div>
      <div class="alan"><label for="td-tar">İlk ders günü</label><input id="td-tar" name="tarih" type="date" value="${e(fark(g.baslangic) >= 0 ? g.baslangic : gun(1))}"></div>
      <div class="alan"><label for="td-saat">Başlangıç saati</label><select id="td-saat" name="saat">${Array.from({ length: 16 }, (_, i) => String(7 + i).padStart(2, '0') + ':00').map(x => `<option ${x === '18:00' ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="alan"><label for="td-sure">Kaç saat</label><select id="td-sure" name="sure">${[2, 3, 4, 5, 6].map(n => `<option value="${n}">${n} saat</option>`).join('')}</select></div>
      <div class="alan"><label for="td-tekrar">Kaç gün</label><select id="td-tekrar" name="tekrar">${Array.from({ length: 15 }, (_, i) => i + 1).map(n => `<option value="${n}">${n === 1 ? 'Yalnız bu gün' : n + ' gün art arda'}</option>`).join('')}</select></div>
      <label class="tam" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="haftasonu" style="width:18px;height:18px"> Hafta sonu da ders yapılır</label>
      <div class="alan"><label for="td-dl">Derslik</label><input id="td-dl" name="derslik" value="${e(g.derslik || '')}" placeholder="Derslik 1" list="td-dl-l"><datalist id="td-dl-l">${derslikListesi().map(x => `<option value="${e(x.ad)}">${e([x.tur, x.kontenjan ? x.kontenjan + ' kişi' : ''].filter(Boolean).join(' · '))}</option>`).join('')}</datalist><small style="color:var(--soluk)">MEBBİS’e “DERSLİK-n” olarak gider</small></div>
      <small id="td-ozet" class="tam" style="color:var(--soluk)"></small><div id="td-uyari" class="tam" style="display:grid;gap:6px"></div></form>`
      : `<p>Teorik ders eklemek için önce bir teorik öğretmen ekleyin (MEBBİS izin numarasıyla).</p>`,
    altlik: og.length ? `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-teorik">Dersleri ekle</button>` : `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-ogr-ekle>Öğretmen ekle</button>`,
    onAc(dl) {
      // grubun sabit dersliği yoksa ders türüne uygun derslik önerilir (TEO-016: otomatik planda ders başına derslik)
      { const fd = dl.querySelector('#f-teorik'); if (fd && fd.derslik && fd.tur) { const oner = () => { if (!g.derslik && !fd.derslik.dataset.elle) fd.derslik.value = derslikOner(fd.tur.value) || 'Derslik 1'; }; oner(); fd.tur.addEventListener('change', oner); fd.derslik.addEventListener('input', () => { fd.derslik.dataset.elle = '1'; }); } }
      const oe = dl.querySelector('[data-ogr-ekle]'); if (oe) oe.addEventListener('click', () => { kapatPencere(); ogretmenPencere(null, () => teorikDersPencere(g, sonra)); });
      const f = dl.querySelector('form'); if (!f) return;
      const gunler = () => { const l = [], d0 = new Date(f.tarih.value + 'T12:00:00'); let n = +f.tekrar.value; for (let i = 0; n > 0 && i < 60; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); if (!f.haftasonu.checked && (d.getDay() === 0 || d.getDay() === 6)) continue; l.push(iso(d)); n--; } return l; };
      // Aynı gün denetimi: grubun o günkü teorik saati + eklenecek saat, kural motorundan (kurallar.js teorikKontrol, MTSK md.16/4 günde 2–6 saat).
      // Saatleri çakışan ders eklenmez; günlük saat sınırı uyarıdır (Eyüp Bey teyidine kadar engel değil), ikinci basışta eklenir.
      const dgEkle = dl.querySelector('[form=f-teorik]');
      const denetle = (l, bas, sure) => {
        const cakisma = l.filter(t => (S.teorik || []).some(x => x.grup === g.id && x.tarih === t && (() => { const b = +String(x.saat || '').slice(0, 2), s2 = +x.sure || 1; return b < bas + sure && bas < b + s2; })()));
        const uyari = l.map(t => KR.teorikKontrol(g.id, t, sure).mesaj).filter(Boolean);
        return { cakisma, uyari };
      };
      const uyariYaz = (dn, vurgu) => {
        const ku = dl.querySelector('#td-uyari'), kisalt = a => a.length > 3 ? [...a.slice(0, 3), `ve ${a.length - 3} gün daha`] : a;
        ku.innerHTML = (dn.cakisma.length ? `<p class="ipucu uyari">${isaret('dur', 18)}<span>${dn.cakisma.length} günde bu saatlerde grubun zaten dersi var: ${e(kisalt(dn.cakisma.map(t => tarih(t))).join(', '))}. Başka saat ya da gün seçin.</span></p>` : '')
          + (dn.uyari.length ? `<p class="ipucu${vurgu ? ' uyari' : ''}">${isaret('uyari', 18)}<span>${e(kisalt(dn.uyari).join(' '))} ${dn.cakisma.length ? '' : '<small style="display:block;color:var(--soluk)">Uyarıdır; yine de eklemek için “Yine de ekle”ye basın. MEBBİS teorik programı bu haliyle kabul etmeyebilir.</small>'}</span></p>` : '');
        if (dgEkle) dgEkle.textContent = !dn.cakisma.length && dn.uyari.length && f.dataset.onay === dn.uyari.join('|') ? 'Yine de ekle' : 'Dersleri ekle';
      };
      const ozet = () => { const l = f.tarih.value ? gunler() : [], bas = +f.saat.value.slice(0, 2), sure = +f.sure.value; dl.querySelector('#td-ozet').textContent = l.length ? `${l.length} gün × ${sure} saat = ${l.length * sure} saat · ${l[0].split('-').reverse().join('.')}${l.length > 1 ? ' – ' + l[l.length - 1].split('-').reverse().join('.') : ''} · ${String(bas).padStart(2, '0')}:00–${String(bas + sure - 1).padStart(2, '0')}:50${bas + sure > 23 ? ' · 23:00’ü geçiyor' : ''}` : ''; delete f.dataset.onay; uyariYaz(denetle(l, bas, sure)); };
      f.addEventListener('change', ozet); f.addEventListener('input', ozet); ozet();
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const l = gunler(), bas = +f.saat.value.slice(0, 2), sure = +f.sure.value;
        if (!f.tarih.value || !l.length) return bildir('İlk ders gününü seçin', 'uyari');
        if (bas + sure > 23) return bildir('Dersler 23:00’e kadar bitmeli (MTSK Yönetmeliği 20/1)', 'uyari');
        if (l[0] < g.baslangic) return bildir(`Teorik dersler grubun başlangıcından (${tarih(g.baslangic)}) önce olamaz`, 'uyari');
        const dn = denetle(l, bas, sure);
        if (dn.cakisma.length) { uyariYaz(dn, true); return bildir(`${dn.cakisma.length} günde bu saatlerde grubun zaten dersi var`, 'uyari'); }
        if (dn.uyari.length && f.dataset.onay !== dn.uyari.join('|')) { f.dataset.onay = dn.uyari.join('|'); uyariYaz(dn, true); return bildir('Günlük teorik saat uyarısını okuyun; eklemek için “Yine de ekle”ye basın', 'uyari'); }
        const z = Date.now(); S.teorik = S.teorik || [];
        l.forEach((t, i) => S.teorik.push({ id: 't' + z + i, tarih: t, saat: String(bas).padStart(2, '0') + ':00', sure, konu: f.tur.value, salon: f.derslik.value.trim() || 'Derslik 1', grup: g.id, ogretmen: f.ogretmen.value, katilim: 0, mevcut: kisiler(g).length }));
        islem('Teorik ders planladı', `${g.ad} · ${f.tur.value} · ${l.length} gün${dn.uyari.length ? ' · uyarıya rağmen: ' + dn.uyari.length + ' gün 2–6 saat dışında (md.16/4)' : ''}`); kaydet(); kapatPencere();
        bildir(`${l.length} gün teorik ders eklendi (${l.length * sure} saat). MEB işlemleri › Teorik program sekmesinden MEBBİS’e yazılır.`, 'tamam');
        sonra && sonra();
      });
    },
  });
}
// on: boş kart için ön doldurma (PER-027: MEBBİS personelinden 'Kart aç' — ad, izin no, branş, TC ve MEBBİS bilgisi)
const nrmBrans = t => String(t || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
export function ogretmenPencere(o, sonra, on) {
  const v = o || on || {};
  const BRANS = ['Trafik ve Çevre', 'İlk Yardım', 'Araç Tekniği', 'Trafik Adabı', 'Direksiyon'];
  pencere({
    baslik: o ? 'Teorik öğretmen · ' + o.ad : 'Teorik öğretmen ekle',
    icerik: `<form id="f-ogr" class="form-izgara" novalidate>
      <div class="alan tam" style="display:flex;gap:12px;align-items:center"><span data-og-foto-on style="width:54px;height:70px;border-radius:6px;overflow:hidden;flex:none;background:var(--zemin);border:1px solid var(--cizgi);display:grid;place-items:center">${v.foto ? `<img src="${e(v.foto)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '<small style="color:var(--soluk)">Foto</small>'}</span><div><span class="dg dg-cizgi dg-kucuk" style="position:relative;overflow:hidden">${v.foto ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}<input type="file" accept="image/*" data-og-foto aria-label="Öğretmen fotoğrafı" style="position:absolute;inset:0;opacity:0;cursor:pointer"></span><small style="display:block;color:var(--soluk);margin-top:4px">Kurum kimlik kartında kullanılır (350×450’ye kırpılır).</small></div></div>
      <div class="alan"><label for="og-ad">Ad soyad</label><input id="og-ad" name="ad" value="${e(v.ad || '')}" autocomplete="off"></div>
      <div class="alan"><label for="og-br">Branş</label><select id="og-br" name="brans">${BRANS.map(b => `<option ${v.brans && nrmBrans(v.brans) === nrmBrans(b) ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
      <div class="alan"><label for="og-tel">Telefon</label><input id="og-tel" name="tel" inputmode="tel" value="${e(v.tel || '')}"></div>
      <div class="alan"><label for="og-izin">MEBBİS izin no</label><input id="og-izin" name="izin" inputmode="numeric" value="${e(v.calismaIzinNo || '')}" placeholder="ör. 5048176"><small style="color:var(--soluk)">MEBBİS ders ekranlarında “İzin No:5048176 AD SOYAD” diye görünen numara; “MEBBİS’ten güncelle” personelden kendiliğinden doldurur.</small></div>
      <div class="alan"><label for="og-tc">T.C. kimlik no</label><input id="og-tc" name="tc" inputmode="numeric" maxlength="11" value="${e(v.tc || '')}" placeholder="isteğe bağlı" autocomplete="off"><small style="color:var(--soluk)">MEBBİS teorik programında öğretmen T.C. ve izin no ile seçilir; personel eşleşmesinde de kullanılır.</small></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-ogr">Kaydet</button>`,
    onAc(d) {
      let foto = null;
      d.querySelector('[data-og-foto]').addEventListener('change', ev => { const dosya = ev.target.files[0]; if (!dosya) return; import('./sayfalar5.js?v=234').then(m => m.personelFotoKirp(dosya)).then(u => { foto = u; d.querySelector('[data-og-foto-on]').innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`; }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); });
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target, ad = f.ad.value.trim().toLocaleUpperCase('tr');
        if (!ad) return bildir('Ad soyad yazın', 'uyari');
        const izin = f.izin.value.replace(/\D/g, ''); if (izin && izin.length !== 7) return bildir('MEBBİS izin numarası 7 hane olmalı', 'uyari');
        // PER-014: teorik öğretmenin T.C.'si (MEBBİS 03003 personel seçeneğinin değeri T.C. + izin no)
        const tc = f.tc.value.replace(/\D/g, ''); if (tc && !tcGecerli(tc)) return bildir('T.C. kimlik numarası geçersiz', 'uyari');
        const ayni = [...S.egitmenler, ...(S.ogretmenler || [])].find(y => y !== o && ((izin && String(y.calismaIzinNo || '') === izin) || (tc && y.tc === tc)));
        if (ayni) return bildir(`${ayni.ad} kartında aynı ${izin && String(ayni.calismaIzinNo || '') === izin ? 'izin no' : 'T.C.'} var`, 'uyari');
        const x = o || { id: 'o' + Date.now(), ...(on && on.tc ? { tc: on.tc } : {}), ...(on && on.meb ? { meb: on.meb } : {}), ...(on && on.mebIzinBitis ? { mebIzinBitis: on.mebIzinBitis } : {}) }; Object.assign(x, { ad, brans: f.brans.value, tel: f.tel.value.trim(), calismaIzinNo: izin, tc: tc || null }); if (foto) { x.foto = foto; x.fotoTarih = gun(0); }
        if (!o) S.ogretmenler = [...(S.ogretmenler || []), x];
        islem(o ? 'Teorik öğretmeni düzenledi' : on && on.meb ? 'MEBBİS’teki personelden teorik öğretmen kartı açtı' : 'Teorik öğretmen ekledi', ad); kaydet(); kapatPencere(); bildir(ad + ' kaydedildi', 'tamam'); sonra && sonra();
      });
    },
  });
}

/* ---------- Ayarlar › Dönem ve gruplar (DON-004, not 38) ----------
   Bütün dönem gruplarının tek yeri: dönem dönem grup/şube, başlangıç, sınıf, derslik, doluluk, MEBBİS durumu ve tutarlılık uyarıları. */
// Var olan grubun tutarsızlıkları: başlangıç dönemin ayında 1–10 değil, aynı grubun şubeleri farklı gün, MEBBİS'teki başlangıçla fark (DON-007)
export function grupTutarsizliklari(g) {
  if (!mebGrubuMu(g)) return [];
  const l = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.baslangic || '')) l.push('başlangıç tarihi yok');
  else if (g.baslangic.slice(0, 7) !== ayBasi(g.donem) || +g.baslangic.slice(8, 10) > 10) l.push(`başlangıç ${tarih(g.baslangic)} ${donemAdi(g.donem)} döneminin 1–10’u arasında değil`);
  const kardes = (S.gruplar || []).find(x => x.id !== g.id && mebGrubuMu(x) && x.donem === g.donem && +x.grupNo === +g.grupNo && x.baslangic && g.baslangic && x.baslangic !== g.baslangic);
  if (kardes) l.push(`aynı grubun ${kardes.ad} şubesi ${tarih(kardes.baslangic)} başlıyor`);
  if (g.mebBaslangic && g.baslangic && g.mebBaslangic !== g.baslangic) l.push(`MEBBİS’te başlangıç ${tarih(g.mebBaslangic)}`);
  if (g.mebTeorik && !g.teoriksiz && g.mebTeorik.saat < 34 && g.baslangic && fark(g.baslangic) <= 7) l.push(`MEBBİS’te teorik program ${g.mebTeorik.saat}/34 saat (dönem başlamadan girilmeli, md.12/4)`);
  if ((S.gruplar || []).filter(x => mebGrubuMu(x) && x.donem === g.donem).map(x => +x.grupNo).filter((v, i, a) => a.indexOf(v) === i).length > 3) l.push('dönemde 3’ten fazla grup');
  return l;
}
export function donemSekmesiHtml() {
  const l = (S.gruplar || []), meb = l.filter(mebGrubuMu), dis = l.filter(g => !mebGrubuMu(g)), ac = acilabilirDonem();
  const donemler = [...new Set(meb.map(g => g.donem))].sort().reverse();
  const tut = meb.filter(g => grupTutarsizliklari(g).length);
  const satir = g => { const d = grupDoluluk(g), t = grupTutarsizliklari(g);
    return `<tr><td><b style="color:var(--murekkep)">${e(g.ad)}</b>${t.length ? `<small style="display:block;color:var(--kirmizi);font-weight:700">${isaret('uyari', 14)} ${e(t.join(' · '))}</small>` : ''}</td><td class="rf-nw">${g.baslangic ? tarih(g.baslangic) + ' ' + g.baslangic.slice(0, 4) : '—'}</td><td class="m-gizle">${grupTipi(g) !== 'MTSK' ? rozet(grupTipi(g), 'mavi') + ' ' : ''}${belgeliSubesi(g) ? rozet('Belgeliler', 'notr') + ' ' : ''}${g.sinif ? e(((SINIFLAR[g.sinif] || {}).ad || g.sinif).split(' ·')[0]) : 'Bütün sınıflar'}${g.ozelKod ? `<small style="display:block;color:var(--soluk)">${e(g.ozelKod)}</small>` : ''}</td><td class="m-gizle">${e(g.derslik || '—')}</td><td class="rf-nw"><span class="sayi">${d.n}${d.k ? '/' + d.k : ''}</span>${d.dolu ? ' ' + rozet('dolu', 'kirmizi') : ''}</td><td class="m-gizle rf-nw">${belgeliSubesi(g) ? '<span style="color:var(--soluk)">yok</span>' : g.mebTeorik ? `<span style="color:${g.mebTeorik.saat < 34 ? 'var(--kirmizi)' : 'inherit'};font-weight:${g.mebTeorik.saat < 34 ? 800 : 400}">MEBBİS ${g.mebTeorik.saat}/34</span>${g.mebTeorik.son ? `<small style="display:block;color:var(--soluk)">son ders ${tarih(g.mebTeorik.son)}</small>` : ''}` : `plan ${teorikDurum(g).toplam}/34`}</td><td>${g.meb ? rozet(g.kaynak === 'MEBBİS' ? 'MEBBİS’ten' : 'MEBBİS’te', 'yesil') : rozet('MEBBİS’e girilecek', 'uyari')}</td><td class="rf-nw">${g.mebBaslangic && g.mebBaslangic !== g.baslangic ? `<button type="button" class="dg dg-ana dg-kucuk" data-grup-meb-tarih="${e(g.id)}">MEBBİS tarihini al</button> ` : ''}<button type="button" class="dg dg-hafif dg-kucuk" data-grup-duzenle="${e(g.id)}">Düzenle</button></td></tr>`; };
  return `<div class="kart"><div class="kart-bas"><h3>Dönem ve gruplar</h3><small>MEBBİS’teki dönem, grup ve şubelerle birebir</small><div class="sag"><button type="button" class="dg dg-ana dg-kucuk" data-grup-yeni>${ik('arti')}Yeni grup</button></div></div>
    <div class="kart-govde" style="padding-bottom:0"><p class="ipucu">${isaret('bilgi', 18)}<span>Dönem <b>YYYY-Ay</b>; bir dönemde en çok 3 grup (Grup 1–3), her grubun tek başlangıç günü ayın <b>1–10’u</b> arasında, şubeler (A–H) grubun gününü alır. Başlangıç MEBBİS’te sonradan değişmez. Şu an MEBBİS’te yeni grup açılabilen dönem: <b>${e(donemAdi(ac))}</b>.</span></p>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-top:12px"><span class="anahtar"><input type="checkbox" data-belgeli-ayri ${belgeliAyri() ? 'checked' : ''}><i></i></span><span><b>Belgelileri ayrı şubede topla</b><small style="display:block;color:var(--soluk)">Mevcut belgesi olan (teorik derse girmeyen) adaylar için kayıtta ve atamada teorik programı olmayan şube önerilir. Zorunlu değil, kurs tercihidir.</small></span></label>
      ${tut.length ? `<p class="ipucu uyari" style="margin-top:10px">${isaret('uyari', 18)}<span><b>${tut.length} grupta tarih tutarsızlığı var.</b> Grubu düzenleyip MEBBİS’teki tarihle aynı yapın; kursiyerlerin 90 gün ve sınav hakkı süreleri grup başlangıcından hesaplanır.</span></p>` : ''}</div>
    ${donemler.length ? donemler.map(dn => `<div class="kart-bas" style="padding-top:16px"><h3 style="font-size:15px">${e(donemAdi(dn))}</h3><small>${meb.filter(g => g.donem === dn).length} şube${dn === ac ? ' · MEBBİS’te yeni grup açılabilir' : ''}</small></div>
      <div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Grup / şube</th><th>Başlangıç</th><th class="m-gizle">Sınıf</th><th class="m-gizle">Derslik</th><th>Kayıtlı</th><th class="m-gizle">Teorik</th><th>MEBBİS</th><th></th></tr></thead><tbody>${meb.filter(g => g.donem === dn).sort((a, b) => +a.grupNo - +b.grupNo || a.sube.localeCompare(b.sube)).map(satir).join('')}</tbody></table></div>`).join('')
      : `<div class="kart-govde">${bos('Henüz dönem grubu yok', 'MEBBİS’te açtığınız grubu “Yeni grup”la girin ya da MEB işlemleri › MEBBİS’ten al › Dönem gruplarıyla alın.')}</div>`}
    ${dis.length ? `<div class="kart-bas" style="padding-top:16px"><h3 style="font-size:15px">MEBBİS dışı gruplar</h3><small>Dönem, grup ve şubesi olmayan eski gruplar; MEBBİS kaydında kullanılamaz</small></div><div class="tablo-kap"><table class="tablo tablo-mobil"><tbody>${dis.map(g => `<tr><td><b>${e(g.ad || g.id)}</b></td><td>${g.baslangic ? tarih(g.baslangic) : '—'}</td><td>${grupDoluluk(g).n} kişi</td><td><button type="button" class="dg dg-hafif dg-kucuk" data-grup-duzenle="${e(g.id)}">Düzenle</button></td></tr>`).join('')}</tbody></table></div>` : ''}
    <div style="height:14px"></div></div><div class="ara-bosluk"></div>${derslikKarti()}`;
}
// Derslikler kartı (TEO-016): MEBBİS'ten okunanlar salt okunur; MEBBİS okunmadıysa ya da eksikse elle eklenir
function derslikKarti() {
  const l = derslikListesi();
  return `<div class="kart"><div class="kart-bas"><h3>Derslikler</h3><small>Teorik derslerin yapıldığı odalar · MEBBİS’e “DERSLİK-n” olarak gider</small><div class="sag"><button type="button" class="dg dg-cizgi dg-kucuk" data-derslik-ekle>${ik('arti')}Derslik ekle</button></div></div>
    ${l.length ? `<div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Derslik</th><th>Türü</th><th>Kontenjan</th><th>Kaynak</th><th></th></tr></thead><tbody>${l.map(x => `<tr><td><b>${e(x.ad)}</b>${x.no ? ` <small class="mono" style="color:var(--soluk)">DERSLİK-${x.no}</small>` : ''}</td><td>${e(x.tur || '—')}</td><td>${x.kontenjan ? x.kontenjan + ' kişi' : '—'}</td><td>${rozet(x.kaynak === 'MEBBİS' ? 'MEBBİS’ten' : 'Elle', x.kaynak === 'MEBBİS' ? 'yesil' : 'notr')}</td><td>${x.kaynak === 'elle' ? `<button type="button" class="dg dg-hafif dg-kucuk" data-derslik-duz="${e(x.ad)}">Düzenle</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="kart-govde"><p class="ipucu">${isaret('bilgi', 18)}<span>Derslik yok. MEB işlemleri › MEBBİS’ten al › Kurum bilgileri ile MEBBİS’teki derslikler gelir ya da “Derslik ekle” ile girin. Bir dersliğe en çok 30 kursiyer.</span></p></div>`}</div>`;
}
function derslikFormu(ad, sonra) {
  const l = S.derslikler = S.derslikler || [], x = l.find(y => y.ad === ad) || null;
  pencere({
    baslik: x ? x.ad + ' · düzenle' : 'Derslik ekle',
    icerik: `<form id="f-derslik" class="form-izgara" novalidate>
      <div class="alan"><label>Derslik</label><select name="no">${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${x && +String(x.ad).replace(/\D/g, '') === i + 1 ? 'selected' : ''}>Derslik ${i + 1}</option>`).join('')}</select></div>
      <div class="alan"><label>Türü</label><select name="tur">${DERSLIK_TURLERI.map(t => `<option ${x && x.tur === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="alan"><label>Oda kontenjanı</label><input name="kontenjan" type="number" min="1" max="30" value="${e((x && x.kontenjan) || 20)}"><small style="color:var(--soluk)">MEBBİS’teki onaylı kontenjan (1–30)</small></div>
      <div class="alan"><label>Açılma tarihi</label><input name="acilis" type="date" value="${e((x && x.acilis) || '')}"></div>
    </form>`,
    altlik: `${x ? '<button class="dg dg-cizgi" data-sil style="margin-right:auto;color:var(--kirmizi)">Sil</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-derslik">Kaydet</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      const sil = d.querySelector('[data-sil]'); if (sil) sil.addEventListener('click', () => { S.derslikler = l.filter(y => y !== x); islem('Dersliği sildi', x.ad); kaydet(); kapatPencere(); sonra && sonra(); });
      f.addEventListener('submit', ev => { ev.preventDefault(); const k = +f.kontenjan.value; if (!(k >= 1 && k <= 30)) return bildir('Kontenjan 1 ile 30 arasında olmalı (bir dersliğe en çok 30 kursiyer)', 'uyari');
        const yeni = { ad: 'Derslik ' + f.no.value, tur: f.tur.value, kontenjan: k, acilis: f.acilis.value || '' };
        if (l.some(y => y !== x && y.ad === yeni.ad) || derslikListesi().some(y => y.kaynak === 'MEBBİS' && y.ad === yeni.ad)) return bildir(yeni.ad + ' zaten var', 'uyari');
        if (x) Object.assign(x, yeni); else l.push(yeni); islem(x ? 'Dersliği düzenledi' : 'Derslik ekledi', `${yeni.ad} · ${yeni.tur} · ${k} kişi`); kaydet(); kapatPencere(); sonra && sonra(); });
    },
  });
}

// MEBBİS'teki başlangıcı gruba ve aynı grubun bütün şubelerine uygular; etkisi önce gösterilir (DON-007)
export function mebTarihiniAl(id, sonra) {
  const g = grupBul(id); if (!g || !g.mebBaslangic) return;
  const kardesler = (S.gruplar || []).filter(x => mebGrubuMu(x) && x.donem === g.donem && +x.grupNo === +g.grupNo), kisi = kardesler.reduce((a, x) => a + kisiler(x).length, 0), yeni = g.mebBaslangic, eski = g.baslangic;
  pencere({
    baslik: g.ad + ' · MEBBİS’teki başlangıç',
    icerik: `<p style="font-size:14px">mdSinyal’de <b>${tarih(eski)} ${String(eski).slice(0, 4)}</b>, MEBBİS’te <b>${tarih(yeni)} ${yeni.slice(0, 4)}</b>. MEBBİS’teki tarih esastır.</p>
      <ul style="margin:12px 0 0 18px;font-size:14px;display:grid;gap:6px"><li>Değişecek şubeler: <b>${e(kardesler.map(x => x.ad).join(', '))}</b> (aynı grubun şubeleri aynı gün başlar)</li><li>Bu şubelerdeki <b>${kisi} kursiyerin</b> 90 gün, teorik ders planı ve sınav hakkı süreleri yeni tarihten hesaplanır.</li>${kardesler.some(x => kisiler(x).some(k => k.kayit && k.kayit > yeni)) ? '<li style="color:var(--kirmizi)">Bazı kursiyerlerin kayıt tarihi yeni başlangıçtan sonra; dosyalarında uyarı çıkar (kayıt grubun başlangıcından önce olmalı, 12/2).</li>' : ''}</ul>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-uygula>MEBBİS tarihini al</button>`,
    onAc(d) { d.querySelector('[data-uygula]').addEventListener('click', () => { kardesler.forEach(x => { x.baslangic = yeni; delete x.mebBaslangic; }); islem('Grup başlangıcını MEBBİS’e göre düzeltti', `${kardesler.map(x => x.ad).join(', ')} · ${eski} → ${yeni} · ${kisi} kursiyer`); kaydet(); kapatPencere(); bildir(`${kardesler.length} şubenin başlangıcı ${tarih(yeni)} oldu`, 'tamam'); sonra && sonra(); }); },
  });
}
