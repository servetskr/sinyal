// MEBBİS toplu çekme ve toplu yazma (mdSinyal tarafı). İşi MEBBİS Yardımcısı'nın arka plan motoru (eklenti/motor.js)
// kursun kendi MEBBİS oturumunda, ekran açmadan yürütür; sonuç buraya gelir ve kayıtlarla eşlenir.
import { S, kaydet, gun, iso, fark, tamAd, islem, SINIFLAR, egitmen, arac, kursiyer, sb, sbDers, cokSube, seciliSube } from './veri.js?v=196';
import { bildir, pencere, kapatPencere, e, ik, isaret, rozet, tarih } from './ui.js?v=196';
import * as GR from './gruplar.js?v=196';
import * as EK from './eklenti.js?v=196';
import { yenile } from './app.js?v=196';

export const CEKILECEK = [
  ['gruplar', 'Dönem grupları', 'Dönem, grup ve şubeler; eksik grup kartları açılır'],
  ['kursiyerler', 'Kursiyerler', 'Bütün dönemler, her öğrenci durumu ayrı; durum, onay, evrak, haklar'],
  ['dosya', 'Aday dosyaları', 'Aktif kursiyerlerin grubu, hakları, son tarihleri, sınav geçmişi'],
  ['personel', 'Personel', 'İzin no, branş, çalışma izni bitişi'],
  ['araclar', 'Araçlar', 'Muayene, şanzıman, MEBBİS durumu, simülatör'],
  ['sinavlar', 'Sınav sonuçları', 'Son 3 uygulama dönemi ve 2 aylık e-sınav'],
];
export const durum = { calisiyor: false, id: null, adim: '', baslama: 0, son: null };
const nrm = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const tarihIso = v => { const m = String(v || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const sutun = (baslik, ...l) => baslik.map(nrm).findIndex(h => l.some(x => x instanceof RegExp ? x.test(h) : h.includes(x)));
const gonder = (tur, veri) => window.postMessage({ kaynak: 'sinyal-sayfa', tur, veri }, location.origin);

function hazirMi() {
  if (!EK.eklenti.var) { EK.kurulumPenceresi(); return false; }
  // toplu motor Yardımcı 1.9.0 ile geldi; eski sürüm bu işi tanımaz
  const sv = String(EK.eklenti.surum || '0').split('.').map(Number); if (sv[0] < 1 || (sv[0] === 1 && (sv[1] || 0) < 9)) { pencere({ baslik: 'MEBBİS Yardımcısı’nı güncelleyin', icerik: `<p>Toplu çekme ve toplu yazma Yardımcı’nın <b>1.9.0</b> sürümüyle geldi; bu tarayıcıda <b>${e(EK.eklenti.surum || 'eski sürüm')}</b> kurulu.</p><p style="margin-top:8px"><a href="${EK.EKLENTI_ZIP}" download style="color:var(--levha);font-weight:700">Yeni sürümü indirin</a>, Chrome’da chrome://extensions sayfasında eski klasörün yerine açın ya da Chrome Web Mağazası güncellemesini bekleyin.</p>`, altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' }); return false; }
  if (cokSube() && !seciliSube()) { bildir('Önce üstten şube seçin; her şubenin MEBBİS hesabı ayrı', 'uyari'); return false; }
  if (durum.calisiyor && Date.now() - durum.baslama < 30 * 60e3) { bildir('MEBBİS’te süren bir iş var; bitince yenisini başlatın', 'uyari'); return false; }
  return true;
}
function baslat(is, mesaj) {
  durum.calisiyor = true; durum.id = is.id; durum.adim = 'MEBBİS sekmesi açılıyor'; durum.baslama = Date.now();
  gonder('toplu', is); islem('MEBBİS toplu işi başlattı', mesaj); bildir(mesaj + '. MEBBİS sekmesi açılıyor; girmediyseniz kendi şifrenizle girin, iş kendiliğinden başlar.');
  yenile();
}

/* ---------- toplu çekme ---------- */
export function topluCek(neler) {
  if (!hazirMi()) return;
  const cek = neler.filter(x => x !== 'dosya');
  // aday dosyası: bekleyen ve süreci devam eden kursiyerler (en çok 150; her biri MEBBİS'te bir sorgu)
  const dosya = neler.includes('dosya') ? sb(S.kursiyerler).filter(k => !k.kapali && /^\d{11}$/.test(k.tc || '') && (GR.bekleyenMi(k) || ['Teorik', 'Direksiyon', 'Sınav'].includes(k.asama))).slice(0, 150).map(k => k.tc) : [];
  baslat({ id: 't' + Date.now(), cek, dosya, yaz: [] }, `MEBBİS’ten çekiliyor: ${CEKILECEK.filter(x => neler.includes(x[0])).map(x => x[1].toLocaleLowerCase('tr')).join(', ')}`);
}

/* ---------- toplu yazma: direksiyon ders programı ---------- */
function egitimTuru(k, d) {
  const sonKalma = (k.dsinav && k.dsinav.sonuc === 'Kaldı' && k.dsinav.tarih) || '';
  return sonKalma && d.tarih > sonKalma ? 'Başarısız Aday Eğitimi' : 'Normal Eğitim';
}
export function programIsleri(idler) {
  const l = [], hatalar = [];
  sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && !d.meb && fark(d.tarih) >= 0 && (!idler || idler.includes('ders-' + d.id))).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(d => {
    const k = kursiyer(d.kursiyer); if (!k) return;
    const g = GR.kursiyerGrubu(k), eg = egitmen(d.egitmen) || {}, ar = arac(d.arac) || {}, id = 'ders-' + d.id;
    const baslik = `${tamAd(k)} · ${d.tarih.split('-').reverse().join('.')} ${d.saat}`;
    if (!g || !GR.mebGrubuMu(g)) return hatalar.push([id, baslik, 'Kursiyer bir dönem grubuna atanmamış']);
    if (!/^\d{11}$/.test(k.tc || '')) return hatalar.push([id, baslik, 'TC kimlik no eksik']);
    if (!eg.calismaIzinNo && !eg.ad) return hatalar.push([id, baslik, 'Öğretmen yok']);
    const sim = d.tur === 'simulator';
    if (!sim && !ar.plaka) return hatalar.push([id, baslik, 'Araç yok']);
    l.push({ id, tur: 'program', baslik, tc: k.tc, donem: g.donem, grupNo: g.grupNo, subeNo: GR.SUBELER.indexOf(g.sube) + 1, tarih: d.tarih.split('-').reverse().join('/'), saat: d.saat.slice(0, 5),
      yer: sim ? 'Simülatör' : 'Akan Trafik', plaka: sim ? '' : ar.plaka.replace(/\s/g, ''), simulator: sim ? (ar.sasiNo || ar.plaka || '') : '', izinNo: String(eg.calismaIzinNo || '').replace(/\D/g, ''), personelAd: eg.ad || '', egitimTuru: egitimTuru(k, d) });
  });
  return { l, hatalar };
}
export function programiYaz(idler) {
  if (!hazirMi()) return;
  const { l, hatalar } = programIsleri(idler);
  if (hatalar.length) { S.mebDurum = S.mebDurum || {}; hatalar.forEach(([id, , not]) => { S.mebDurum[id] = { durum: 'hata', zaman: Date.now(), not }; }); kaydet(); }
  if (!l.length) return bildir(hatalar.length ? `${hatalar.length} ders aktarılamıyor: ${hatalar[0][2]}` : 'MEBBİS’e yazılacak direksiyon dersi yok', 'uyari');
  S.mebDurum = S.mebDurum || {}; l.forEach(x => { S.mebDurum[x.id] = { durum: 'gonderildi', zaman: Date.now() }; }); kaydet();
  baslat({ id: 't' + Date.now(), cek: [], dosya: [], yaz: l }, `${l.length} direksiyon dersi MEBBİS’e yazılıyor${hatalar.length ? ` (${hatalar.length} ders eksik bilgi yüzünden bekliyor)` : ''}`);
}

/* ---------- sonuç ---------- */
const islenen = new Set();
export function durumGeldi(r) {
  if (!r || !r.sonuc) return;
  durum.adim = r.sonuc.adim || durum.adim; durum.son = r;
  if (r.sonuc.hata) { durum.calisiyor = false; bildir('MEBBİS işi durdu: ' + r.sonuc.hata, 'uyari'); }
  yazilanlariIsle(r.sonuc.yazilan || []);
  if (!r.bitti) return yenile();
  durum.calisiyor = false;
  if (islenen.has(r.id)) return; islenen.add(r.id);
  ozetGoster(uygula(r.sonuc.veri || {}), r.sonuc.yazilan || []);
}
function yazilanlariIsle(l) {
  let n = 0; S.mebDurum = S.mebDurum || {};
  l.forEach(x => {
    const d = S.dersler.find(y => 'ders-' + y.id === x.id); if (!d) return;
    if (x.ok && !d.meb) { d.meb = true; delete d.mebDegisti; delete S.mebDurum[x.id]; n++; }
    if (!x.ok && (!S.mebDurum[x.id] || S.mebDurum[x.id].durum !== 'hata')) { S.mebDurum[x.id] = { durum: 'hata', zaman: Date.now(), not: x.not }; n++; }
  });
  if (n) kaydet();
}
function uygula(v) {
  const o = {};
  if (v.gruplar && v.gruplar.sube) { const t = v.gruplar.sube; o.gruplar = GR.mebbisGruplariAl([t.baslik, ...t.satirlar], true); }
  else if (v.gruplar && v.gruplar.hata) o.gruplarHata = v.gruplar.hata;
  if (Array.isArray(v.kursiyerler)) o.kursiyerler = kursiyerleriIsle(v.kursiyerler); else if (v.kursiyerler && v.kursiyerler.hata) o.kursiyerHata = v.kursiyerler.hata;
  if (v.personel && v.personel.satirlar) o.personel = personeliIsle(v.personel);
  if (v.araclar && (v.araclar.arac || v.araclar.simulator)) o.araclar = araclariIsle(v.araclar);
  if (v.sinavlar && (v.sinavlar.uygulama || v.sinavlar.esinav)) o.sinavlar = v.sinavlar;
  if (Array.isArray(v.dosya)) o.dosya = dosyalariIsle(v.dosya);
  S.mebCekim = { ...(S.mebCekim || {}), toplu: gun(0) + ' ' + new Date().toTimeString().slice(0, 5) };
  islem('MEBBİS’ten toplu veri aldı', Object.keys(o).join(', ')); kaydet();
  return o;
}

// Kursiyerler: aynı TC birden çok durumda (etiket durumları) ve dönemde görünebilir; TC ile tekilleştirilir
const ETIKET = new Set(['12', '13', '14', '15', '24']);
function kursiyerleriIsle(liste) {
  const kisi = new Map();
  liste.forEach(t => {
    const b = t.baslik, i = { tc: sutun(b, 'kimlik'), ad: sutun(b, 'adisoyadi', 'adsoyad'), donem: sutun(b, /^donemi?$/), mevcut: sutun(b, 'mevcut'), istenen: sutun(b, 'istenen'), evrak: sutun(b, 'evrak'), kurum: sutun(b, 'kurumonay'), ilce: sutun(b, 'ilce', 'memonay'), adli: sutun(b, 'adli'), ders: sutun(b, 'uygulamaders'), sinav: sutun(b, 'sinavtarihi'), uh: sutun(b, 'uygulamahak'), eh: sutun(b, 'esinavhak') };
    t.satirlar.forEach(r => {
      const tc = String(r[i.tc] || '').replace(/\D/g, ''); if (tc.length !== 11) return;
      const x = kisi.get(tc) || { tc, ad: r[i.ad], kayitlar: [], etiketler: [], satir: r, baslik: b };
      const al = j => j >= 0 ? r[j] : '';
      if (ETIKET.has(t.durum)) x.etiketler.push(t.durumAd);
      else x.kayitlar.push({ durumKod: t.durum, durum: t.durumAd, donem: al(i.donem), mevcut: al(i.mevcut), istenen: al(i.istenen), evrak: al(i.evrak), kurumOnay: al(i.kurum), ilceOnay: al(i.ilce), adli: al(i.adli), uygulamaDers: al(i.ders), sinavTarihi: al(i.sinav), uygulamaHak: al(i.uh), esinavHak: al(i.eh) });
      kisi.set(tc, x);
    });
  });
  let eslesen = 0; const yok = [];
  const donemSira = d => { const m = String(d).match(/(\d{4})\D+(\S+)/); return m ? m[1] + String(GR.AYLAR.findIndex(a => nrm(a) === nrm(m[2])) + 1).padStart(2, '0') : String(d); };
  kisi.forEach(x => {
    const son = x.kayitlar.sort((a, b) => donemSira(b.donem).localeCompare(donemSira(a.donem)))[0];
    const k = S.kursiyerler.find(y => y.tc === x.tc);
    if (!k) { if (son && !['5', '6', '11'].includes(son.durumKod)) yok.push(x); return; }
    eslesen++;
    k.meb = { ...(k.meb || {}), ...(son || {}), etiketler: x.etiketler, kayitSayisi: x.kayitlar.length, okuma: gun(0) };
    k.mebIslendi = true;
  });
  return { toplam: kisi.size, eslesen, yok };
}
function personeliIsle(t) {
  const b = t.baslik, i = { izin: sutun(b, 'izinno'), tc: sutun(b, 'kimlik'), ad: sutun(b, /^adi?$/), soyad: sutun(b, /^soyadi?$/), gorev: sutun(b, /^gorevi$/), brans: sutun(b, 'brans'), bitis: sutun(b, 'izinbitis'), durum: sutun(b, /^durumu$/) };
  let guncel = 0; const yeni = [];
  t.satirlar.forEach((r, j) => {
    if (t.gecmis && t.gecmis[j]) return; if (i.durum >= 0 && r[i.durum] && !/gorevde/.test(nrm(r[i.durum]))) return;
    const ad = nrm(`${r[i.ad] || ''}${r[i.soyad] || ''}`), izin = String(r[i.izin] || '').replace(/\D/g, '');
    const eg = S.egitmenler.find(x => nrm(x.ad) === ad) || (S.ogretmenler || []).find(x => nrm(x.ad) === ad);
    if (!eg) { yeni.push(`${r[i.ad]} ${r[i.soyad]} · ${r[i.gorev] || ''}`); return; }
    if (izin && eg.calismaIzinNo !== izin) { eg.calismaIzinNo = izin; guncel++; }
    if (i.bitis >= 0 && tarihIso(r[i.bitis])) eg.mebIzinBitis = tarihIso(r[i.bitis]);
    if (i.tc >= 0 && !eg.tc && /^\d{11}$/.test(r[i.tc])) eg.tc = r[i.tc];
  });
  return { guncel, yeni };
}
function araclariIsle(v) {
  const t = v.arac; let guncel = 0; const yeni = [];
  if (t) {
    const b = t.baslik, i = { plaka: sutun(b, 'plaka'), muayene: sutun(b, 'muayene'), sanziman: sutun(b, 'sanziman'), durum: sutun(b, 'aracindurumu', /^durumu?$/), sinif: sutun(b, 'sinif') };
    t.satirlar.forEach(r => {
      const p = nrm(r[i.plaka]); if (!p) return;
      const a = S.araclar.find(x => nrm(x.plaka) === p);
      if (!a) { yeni.push(r[i.plaka]); return; }
      const m = tarihIso(r[i.muayene]); if (m && a.muayene !== m) { a.muayene = m; guncel++; }
      if (i.sanziman >= 0 && r[i.sanziman] && !a.vites) a.vites = /otomatik/i.test(r[i.sanziman]) ? 'Otomatik' : 'Manuel';
      if (i.durum >= 0) a.mebDurum = r[i.durum];
    });
  }
  return { guncel, yeni, simulator: v.simulator ? v.simulator.satirlar.length : 0 };
}
// Aday dosyası: grup/şube eşleşir (grup kartı yoksa açılır), haklar ve son tarihler kursiyere yazılır
function dosyalariIsle(l) {
  let atanan = 0, okunan = 0;
  l.forEach(x => {
    if (x.hata || !x.donem) return; const k = S.kursiyerler.find(y => y.tc === x.tc); if (!k) return; okunan++;
    const b = x.donem.baslik, i = { donem: sutun(b, /^donemi?$/), grup: sutun(b, /^grubu$/, 'grup'), sube: sutun(b, /^subesi$/, 'sube'), durum: sutun(b, /^durumu$/), uh: sutun(b, 'uygulamahak'), eh: sutun(b, 'esinavhak'), ucret: sutun(b, 'kayitucreti'), uyg: sutun(b, /^uygulama$/) };
    const sat = x.donem.satirlar; if (!sat.length) return;
    const r = sat.find(y => k.meb && k.meb.donem && y[i.donem] === k.meb.donem) || sat[sat.length - 1];
    const ds = r[i.donem] || '', m = ds.match(/(\d{4})\D+(\S+)/), ay = m ? GR.AYLAR.findIndex(a => nrm(a) === nrm(m[2])) + 1 : 0;
    const donem = m && ay ? m[1] + String(ay).padStart(2, '0') : '', grupNo = +((String(r[i.grup] || '').match(/[123]/) || [])[0] || 0), sube = ((String(r[i.sube] || '').toLocaleUpperCase('tr').match(/[A-H]/) || [])[0]) || '';
    const basl = x.dersler && x.dersler.satirlar.length ? tarihIso(x.dersler.satirlar[0][sutun(x.dersler.baslik, 'baslang', 'baslama')]) : '';
    const esSon = x.esinav && x.esinav.satirlar.length ? tarihIso(x.esinav.satirlar[0][sutun(x.esinav.baslik, 'tamamlan')]) : '';
    if (donem && grupNo && sube && !GR.kursiyerGrubu(k)) {
      let g = (S.gruplar || []).find(y => GR.mebGrubuMu(y) && y.donem === donem && +y.grupNo === grupNo && y.sube === sube);
      if (!g && basl) { g = { id: 'g' + donem + '-' + grupNo + sube, donem, grupNo, sube, baslangic: basl, ad: GR.grupAdi(donem, grupNo, sube), sinif: '', derslik: '', kontenjan: null, meb: true, kaynak: 'MEBBİS' }; S.gruplar = [...(S.gruplar || []), g]; }
      if (g) { GR.grupAta(k, g); atanan++; }
    }
    const uyg = x.uygulama ? x.uygulama.satirlar.map(y => { const bb = x.uygulama.baslik; return { kod: y[sutun(bb, 'sinavkodu')], tarih: tarihIso(y[sutun(bb, 'sinavtarihi')]), durum: y[sutun(bb, 'sinavdurumu')], sonuc: y[sutun(bb, 'sinavsonucu')] }; }) : [];
    k.meb = { ...(k.meb || {}), donem: ds || (k.meb || {}).donem, durum: r[i.durum] || (k.meb || {}).durum, uygulamaHak: r[i.uh], esinavHak: r[i.eh], kayitUcreti: r[i.ucret], uygulamaSorumlu: r[i.uyg], haklarSonGun: esSon, ikinciDireksiyon: tarihIso(x.ikinciDireksiyon), uygunluk: tarihIso(x.uygunluk), uygulamaSinavlari: uyg, sertifikaTarihi: x.sertifika && x.sertifika.satirlar.length ? tarihIso(x.sertifika.satirlar[x.sertifika.satirlar.length - 1][sutun(x.sertifika.baslik, 'tarih')]) : '', dosyaOkuma: gun(0) };
  });
  return { okunan, atanan };
}

function sinavTablosu(v) {
  const sat = [['TC Kimlik No', 'Sınav Tarihi', 'Sonuç', 'Puan']];
  (v.uygulama || []).forEach(t => { const b = t.baslik, i = { tc: sutun(b, 'kimlik'), t: sutun(b, 'sinavtarihi'), p: sutun(b, 'puandurumu'), s: sutun(b, 'sinavsonucu') }; t.satirlar.forEach(r => sat.push([r[i.tc], r[i.t], /girmedi/i.test(r[i.p]) ? 'Girmedi' : r[i.s], ''])); });
  (v.esinav || []).forEach(t => { const b = t.baslik, i = { tc: sutun(b, 'kimlik'), t: sutun(b, 'sinavtarihi'), d: sutun(b, 'esinavdurum'), p: sutun(b, /^esinav$/) }; t.satirlar.forEach(r => sat.push([r[i.tc], r[i.t], r[i.d], r[i.p]])); });
  return sat;
}
function ozetGoster(o, yazilan) {
  const ok = yazilan.filter(x => x.ok).length, hata = yazilan.filter(x => !x.ok);
  const satir = (b, a) => `<li style="display:flex;gap:10px;align-items:flex-start">${isaret('tamam', 18)}<div><b style="color:var(--murekkep)">${b}</b>${a ? `<small style="display:block;color:var(--soluk)">${a}</small>` : ''}</div></li>`;
  const l = [];
  if (yazilan.length) l.push(satir(`${ok} direksiyon dersi MEBBİS’e girildi ve doğrulandı`, hata.length ? `<span style="color:var(--kirmizi);font-weight:700">${hata.length} ders girilemedi</span>: ${hata.slice(0, 4).map(x => e(x.not)).join(' · ')}` : ''));
  if (o.gruplar) l.push(satir(`Dönem grupları: ${o.gruplar.yeni} yeni${o.gruplar.var_ ? `, ${o.gruplar.var_} zaten vardı` : ''}`));
  if (o.kursiyerler) l.push(satir(`Kursiyerler: MEBBİS’te ${o.kursiyerler.toplam} aday, ${o.kursiyerler.eslesen} mdSinyal’le eşleşti`, o.kursiyerler.yok.length ? `${o.kursiyerler.yok.length} aday MEBBİS’te var, mdSinyal’de yok` : ''));
  if (o.dosya) l.push(satir(`Aday dosyaları: ${o.dosya.okunan} okundu, ${o.dosya.atanan} kursiyer dönem grubuna atandı`));
  if (o.personel) l.push(satir(`Personel: ${o.personel.guncel} kişinin izin no’su güncellendi`, o.personel.yeni.length ? `mdSinyal’de olmayan: ${o.personel.yeni.map(e).join(', ')}` : ''));
  if (o.araclar) l.push(satir(`Araçlar: ${o.araclar.guncel} aracın muayene tarihi güncellendi`, o.araclar.yeni.length ? `mdSinyal’de olmayan: ${o.araclar.yeni.map(e).join(', ')}` : ''));
  if (o.sinavlar) l.push(satir(`Sınav sonuçları okundu`, 'Sonuçları sınav oturumlarına doldurmak için aşağıdaki düğmeye basın'));
  if (o.kursiyerHata || o.gruplarHata) l.push(`<li class="ipucu uyari">${isaret('uyari', 18)}<span>${e(o.kursiyerHata || o.gruplarHata)}</span></li>`);
  pencere({
    baslik: 'MEBBİS işi bitti',
    icerik: `<ul style="list-style:none;display:grid;gap:10px">${l.join('') || '<li>Yeni bilgi yok.</li>'}</ul>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${o.kursiyerler && o.kursiyerler.yok.length ? `<button class="dg dg-cizgi" data-al-yok>${ik('indir')}${o.kursiyerler.yok.length} adayı mdSinyal’e al</button>` : ''}${o.sinavlar ? `<button class="dg dg-ana" data-sonuc>Sonuçları doldur</button>` : ''}`,
    onAc(d) {
      const y = d.querySelector('[data-al-yok]'); if (y) y.addEventListener('click', () => { const x = o.kursiyerler.yok; kapatPencere(); import('./sayfalar5.js?v=196').then(m => { location.hash = '#/ayarlar/aktarim'; setTimeout(() => m.aktarimYukle([x[0].baslik, ...x.map(z => z.satir)], 'kursiyer', 'MEBBİS'), 300); }); });
      const s = d.querySelector('[data-sonuc]'); if (s) s.addEventListener('click', () => { kapatPencere(); EK.sinavSonucuAl(sinavTablosu(o.sinavlar)); });
    },
  });
  yenile();
}

/* ---------- MEBBİS aktarım merkezindeki kart ---------- */
const secim = new Set(['gruplar', 'kursiyerler', 'dosya', 'personel', 'araclar', 'sinavlar']);
export function topluKart(engel) {
  const z = (S.mebCekim || {}).toplu;
  return `<div class="kart" style="margin-bottom:14px"><div class="kart-bas"><h3>MEBBİS’ten güncelle</h3><small>Ekran açmadan, tek düğmeyle; kursun kendi MEBBİS oturumunda${z ? ' · son: ' + tarih(z.slice(0, 10)) + ' ' + z.slice(11, 16) : ''}</small></div>
    <div class="kart-govde">${durum.calisiyor ? `<p class="ipucu">${isaret('bilgi', 18)}<span><b>MEBBİS’te çalışıyor:</b> ${e(durum.adim || 'başlıyor')}. MEBBİS sekmesini kapatmayın; bitince sonuç burada açılır.</span></p><button class="dg dg-cizgi dg-kucuk" data-toplu-iptal style="margin-top:8px">İşi iptal et</button>` : `
      <div class="secim" style="margin-bottom:12px">${CEKILECEK.map(([k, ad, a]) => `<label title="${e(a)}"><input type="checkbox" data-toplu-sec="${k}" ${secim.has(k) ? 'checked' : ''}><span>${ad}</span></label>`).join('')}</div>
      <button class="dg dg-ana" data-toplu-cek ${engel || !secim.size ? 'disabled' : ''}>${ik('indir')}MEBBİS’ten güncelle</button>
      <small style="display:block;color:var(--soluk);margin-top:8px">Her bilgi MEBBİS’teki doğru ekrandan okunur (ör. kursiyerler her öğrenci durumu için ayrı). Hiçbir şey MEBBİS’e yazılmaz. Aday dosyaları kursiyer sayısına göre birkaç dakika sürer.</small>`}</div></div>`;
}
export function topluBaglan(k, yenileFn) {
  k.addEventListener('change', ev => { const c = ev.target.closest('[data-toplu-sec]'); if (c) { c.checked ? secim.add(c.dataset.topluSec) : secim.delete(c.dataset.topluSec); yenileFn(); } });
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-toplu-cek]')) return topluCek([...secim]);
    if (ev.target.closest('[data-toplu-iptal]')) { gonder('toplu-iptal', {}); durum.calisiyor = false; bildir('MEBBİS işi iptal edildi'); return yenileFn(); }
  });
}
