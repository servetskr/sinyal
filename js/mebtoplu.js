// MEBBİS toplu çekme ve toplu yazma (mdSinyal tarafı). İşi MEBBİS Yardımcısı'nın arka plan motoru (eklenti/motor.js)
// kursun kendi MEBBİS oturumunda, ekran açmadan yürütür; sonuç buraya gelir ve kayıtlarla eşlenir.
import { S, kaydet, gun, iso, fark, tamAd, islem, SINIFLAR, egitmen, arac, kursiyer, sb, sbDers, cokSube, seciliSube, eksikEvrak } from './veri.js?v=203';
import { bildir, pencere, kapatPencere, e, ik, isaret, rozet, tarih } from './ui.js?v=203';
import * as GR from './gruplar.js?v=203';
import * as EK from './eklenti.js?v=203';
import { yenile } from './app.js?v=203';
import * as ME from './mebevrak.js?v=203';

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
  const sv = String(EK.eklenti.surum || '0').split('.').map(Number); if (sv[0] < 1 || (sv[0] === 1 && (sv[1] || 0) < 10)) { pencere({ baslik: 'MEBBİS Yardımcısı’nı güncelleyin', icerik: `<p>Toplu çekme ve toplu yazma için Yardımcı’nın <b>1.10.0</b> sürümü gerekiyor; bu tarayıcıda <b>${e(EK.eklenti.surum || 'eski sürüm')}</b> kurulu.</p><p style="margin-top:8px"><a href="${EK.EKLENTI_ZIP}" download style="color:var(--levha);font-weight:700">Yeni sürümü indirin</a>, Chrome’da chrome://extensions sayfasında eski klasörün yerine açın ya da Chrome Web Mağazası güncellemesini bekleyin.</p>`, altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' }); return false; }
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

/* ---------- toplu yazma: her iş türü MEBBİS'e ekran açmadan girilir, sonra MEBBİS'ten okunup doğrulanır ---------- */
const trT = t => String(t || '').slice(0, 10).split('-').reverse().join('/');          // 2026-12-07 → 07/12/2026
const cep10 = t => { const d = String(t || '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, ''); return d.length === 10 ? d : ''; };
const izin = o => String((o && o.calismaIzinNo) || '').replace(/\D/g, '');
const tabanSinif = s => String(s || '').replace(/-O$/, '');
const sertifikaMetni = k => { const b = tabanSinif(k.sinif), oto = /-O$/.test(k.sinif || ''); return b === 'B' ? `B SINIFI SERTİFİKA (${oto ? 'Otomatik' : 'Manuel'})` : `${b} SINIFI SERTİFİKA`; };
const mebGrup = k => { const g = GR.kursiyerGrubu(k); return g && GR.mebGrubuMu(g) ? g : null; };
const subeNo = g => GR.SUBELER.indexOf(g.sube) + 1;
const SINAV_SAATLERI = ['08:30', '09:15', '10:00', '10:45', '11:30', '13:00', '13:45', '14:30', '15:15', '16:00'];   // 40 dk + 5 dk, öğle arası 12:15
function egitimTuru(k, d) {
  const sonKalma = (k.dsinav && k.dsinav.sonuc === 'Kaldı' && k.dsinav.tarih) || '';
  return sonKalma && d.tarih > sonKalma ? 'Başarısız Aday Eğitimi' : 'Normal Eğitim';
}
const dersTuru = konu => { const n = nrm(konu); return /ilk ?yard|ilkyard/.test(n) ? 'İlkyardım' : /arac|motor|teknik/.test(n) ? 'Araç Tekniği' : /adab|adap/.test(n) ? 'Trafik Adabı' : 'Trafik ve Çevre'; };
const ogretmenOf = id => (S.ogretmenler || []).find(o => o.id === id) || egitmen(id) || {};
const is_ = (tur, id, baslik, meta, son, neden, ref) => ({ id, tur, baslik, meta, son, neden, ref, alanlar: [], bitti: false });

// Aktarım merkezinde listelenen yeni iş türleri (kayıt, direksiyon programı ve sınav listesi eklenti.js'te)
export function ekIsler(hepsi) {
  const l = [];
  (S.gruplar || []).filter(g => GR.mebGrubuMu(g) && (hepsi || !g.meb) && fark(g.baslangic) >= (hepsi ? -30 : 0)).forEach(g => {
    l.push({ ...is_('grup', 'grup-' + g.id, `${g.ad} · ${GR.donemAdi(g.donem)}, Grup ${g.grupNo}, ${g.sube} Şubesi`, { ad: g.ad, tarih: g.baslangic, detay: tarih(g.baslangic) + ' başlıyor' }, g.baslangic, 'Kayıtlardan önce MEBBİS’te açılmalı', { grup: g.id }), bitti: !!g.meb });
  });
  // kurum onayı: MEBBİS'e kaydedilmiş, evrakı tamam, henüz onaylanmamış (onaydan sonra fotoğraf ve bilgi düzeltilemez)
  sb(S.kursiyerler).filter(k => !k.kapali && k.mebIslendi && mebGrup(k) && !eksikEvrak(k).length && (hepsi || !k.mebOnay) && !((k.meb || {}).kurumOnay || '').match(/onaylandı/i)).forEach(k => {
    l.push({ ...is_('onay', 'onay-' + k.id, `${tamAd(k)} · ${mebGrup(k).ad}`, { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: k.kayit, detay: 'Kurum onayı' }, mebGrup(k).baslangic, 'Grup başlamadan', { kursiyer: k.id }), bitti: !!k.mebOnay });
  });
  sb(S.kursiyerler).filter(k => !k.kapali && k.mebIslendi && mebGrup(k) && k.mebEvrak && !k.mebOnay && (hepsi || !k.mebEvrakGirildi)).forEach(k => {
    const { eksik } = ME.evrakPaketi(k);
    l.push({ ...is_('evrak', 'evrak-' + k.id, `${tamAd(k)} · ${mebGrup(k).ad}`, { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: k.kayit, detay: eksik.length ? 'Eksik: ' + eksik.join(', ') : 'Öğrenim, sağlık, adli sicil, parmak izi' }, mebGrup(k).baslangic, 'Kurum onayından önce (onaydan sonra değişmez)', { kursiyer: k.id }), bitti: !!k.mebEvrakGirildi });
  });
  (S.teorik || []).filter(t => { const g = GR.grupBul(t.grup); return g && GR.mebGrubuMu(g) && (hepsi ? fark(t.tarih) >= -14 : !t.meb && fark(t.tarih) >= 0); }).forEach(t => {
    const g = GR.grupBul(t.grup), o = ogretmenOf(t.ogretmen);
    l.push({ ...is_('teorik', 'teorik-' + t.id, `${g.ad} · ${t.tarih.split('-').reverse().join('.')} ${t.saat} · ${dersTuru(t.konu)}`, { ad: g.ad, tarih: t.tarih, detay: `${t.sure || 1} saat · ${o.ad || ''}` }, t.tarih, 'Ders gününden önce', { teorik: t.id }), bitti: !!t.meb });
  });
  sb(S.kursiyerler).filter(k => !k.kapali && k.asama === 'Teorik' && mebGrup(k) && !k.muaf && (!k.mevcutEhliyet || k.mevcutEhliyet === 'Yok') && !(k.esinav && k.esinav.sonuc === 'Geçti') && (k.teorik || 0) >= ((SINIFLAR[k.sinif] || {}).teorik || 34) && (hepsi || !k.mebEsinav)).forEach(k => {
    l.push({ ...is_('esinav', 'esinav-' + k.id, `${tamAd(k)} · ${tabanSinif(k.sinif)}`, { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: k.kayit, detay: 'Teorik tamam; e-sınav ücreti yatmış olmalı' }, null, 'Son e-sınav randevusu grup başlangıcından 90 gün içinde', { kursiyer: k.id }), bitti: !!k.mebEsinav });
  });
  (S.faturalar || []).filter(f => f.no && f.kursiyer && (hepsi || !f.meb) && fark(f.tarih) >= -120).forEach(f => {
    const k = kursiyer(f.kursiyer); if (!k) return;
    l.push({ ...is_('fatura', 'fatura-' + f.no, `${tamAd(k)} · ${f.no} · ${f.tutar} ₺`, { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: f.tarih, detay: `${trT(f.tarih).replace(/\//g, '.')} · ${f.tutar} ₺` }, null, 'Fatura modüle girilir (12/1)', { fatura: f.no }), bitti: !!f.meb });
  });
  return l;
}

// Seçilen işleri motorun anlayacağı biçime çevirir. Eksik bilgisi olan iş hata olarak işaretlenir, gönderilmez.
async function fotoHazirla(src) {
  if (!src || !/^data:image|^https?:/.test(src)) return '';
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const c = document.createElement('canvas'); c.width = 350; c.height = 450; const x = c.getContext('2d');
    const o = Math.max(350 / img.width, 450 / img.height), w = img.width * o, h = img.height * o;
    x.fillStyle = '#fff'; x.fillRect(0, 0, 350, 450); x.drawImage(img, (350 - w) / 2, (450 - h) / 2, w, h);
    return c.toDataURL('image/jpeg', 0.5);   // MEBBİS'in kendi web kamerası çıktısıyla aynı: 350×450, JPEG 0,5
  } catch (x) { return ''; }
}
async function hazirla(ids) {
  const hepsi = [...EK.mebIsleri(true), ...ekIsler(true)], sec = hepsi.filter(x => ids.includes(x.id) && !x.bitti);
  const l = [], hata = [], ekle = (x, not) => hata.push([x.id, not]);
  // direksiyon programı
  const p = programIsleri(sec.filter(x => x.tur === 'program').map(x => x.id)); l.push(...p.l); p.hatalar.forEach(([id, , not]) => hata.push([id, not]));
  for (const x of sec) {
    const r = x.ref || {};
    if (x.tur === 'kayit') {
      const k = kursiyer(r.kursiyer), g = k && mebGrup(k); if (!g) { ekle(x, 'Dönem grubuna atanmamış'); continue; }
      if (!/^\d{11}$/.test(k.tc || '')) { ekle(x, 'TC kimlik no eksik'); continue; }
      if (!cep10(k.tel)) { ekle(x, 'Cep telefonu 10 hane değil'); continue; }
      const mevcut = k.mevcutEhliyet && k.mevcutEhliyet !== 'Yok' ? k.mevcutEhliyet + ' SINIFI' : '';
      l.push({ id: x.id, tur: 'kayit', baslik: tamAd(k), donem: g.donem, grupNo: g.grupNo, subeNo: subeNo(g), tc: k.tc, istenen: sertifikaMetni(k), mevcut, belgeNo: mevcut ? String((k.oncekiBelge || {}).sayi || '') : '', cep: cep10(k.tel), foto: await fotoHazirla(k.foto), sozlesme: k.sozlesmeImza && k.sozlesmeImza.tarih ? trT(k.sozlesmeImza.tarih) : '', adSoyad: tamAd(k), evrak: k.mebEvrak ? ME.evrakPaketi(k).l : null });
    }
    if (x.tur === 'evrak') {
      const k = kursiyer(r.kursiyer), g = k && mebGrup(k); if (!g) { ekle(x, 'Dönem grubuna atanmamış'); continue; }
      const { l: ev } = ME.evrakPaketi(k); if (!Object.keys(ev).length) { ekle(x, 'Evrak bilgisi girilmemiş (öğrenci dosyası › Bilgiler › Düzenle)'); continue; }
      l.push({ id: x.id, tur: 'evrak', baslik: tamAd(k), donem: g.donem, tc: k.tc, adSoyad: tamAd(k), evrak: ev });
    }
    if (x.tur === 'grup') { const g = GR.grupBul(r.grup); if (!g) continue; l.push({ id: x.id, tur: 'grup', baslik: g.ad, donem: g.donem, donemAd: GR.donemAdi(g.donem), grupNo: g.grupNo, subeNo: subeNo(g), sube: g.sube, baslangic: trT(g.baslangic) }); }
    if (x.tur === 'teorik') {
      const t = (S.teorik || []).find(y => y.id === r.teorik), g = t && GR.grupBul(t.grup), o = t ? ogretmenOf(t.ogretmen) : {};
      if (!g || !GR.mebGrubuMu(g)) { ekle(x, 'Ders bir dönem grubuna bağlı değil'); continue; }
      if (!izin(o) && !o.ad) { ekle(x, 'Öğretmen yok'); continue; }
      if (!/^\d{2}:00/.test(t.saat || '')) { ekle(x, `Ders saati ${t.saat}: MEBBİS’te dersler tam saatte başlar (ör. 18:00 - 18:50); saati düzeltin`); continue; }
      const bas = +String(t.saat).slice(0, 2), saatler = Array.from({ length: Math.max(1, +t.sure || 1) }, (_, i) => String(bas + i).padStart(2, '0') + ':00');
      const dl = String(t.salon || g.derslik || '').match(/\d+/);
      l.push({ id: x.id, tur: 'teorik', baslik: x.baslik, donem: g.donem, grupNo: g.grupNo, subeNo: subeNo(g), tarih: trT(t.tarih), saatler, dersTuru: dersTuru(t.konu), derslik: dl ? 'DERSLİK-' + dl[0] : '', izinNo: izin(o), personelAd: o.ad || '', egitimTuru: 'Normal' });
    }
    if (x.tur === 'esinav') { const k = kursiyer(r.kursiyer), g = k && mebGrup(k); if (!g) { ekle(x, 'Dönem grubuna atanmamış'); continue; } l.push({ id: x.id, tur: 'esinav', baslik: tamAd(k), tc: k.tc, donem: g.donem, istenen: tabanSinif(k.sinif) + ' SINIFI', gun: String(S.kurs.esinavGun || '0') }); }
    if (x.tur === 'fatura') {
      const f = (S.faturalar || []).find(y => y.no === r.fatura), k = f && kursiyer(f.kursiyer), g = k && mebGrup(k); if (!g) { ekle(x, 'Öğrenci dönem grubuna atanmamış'); continue; }
      l.push({ id: x.id, tur: 'fatura', baslik: x.baslik, donem: g.donem, tc: k.tc, no: String(f.no), tarih: trT(f.tarih), tutar: String(Math.round(f.tutar * 100) / 100).replace('.', ',') });
    }
  }
  // kurum onayı: dönem başına tek kayıt
  const onay = {}; sec.filter(x => x.tur === 'onay').forEach(x => { const k = kursiyer(x.ref.kursiyer), g = k && mebGrup(k); if (!g) return ekle(x, 'Dönem grubuna atanmamış'); (onay[g.donem] = onay[g.donem] || []).push({ id: x.id, tc: k.tc }); });
  Object.entries(onay).forEach(([donem, adaylar]) => l.push({ id: 'onay-' + donem, tur: 'onay', baslik: 'Kurum onayı · ' + GR.donemAdi(donem), donem, adaylar }));
  // sınav randevusu: sınav ve sınıf başına tek kayıt; saatler aracın sırasıyla verilir (araç başına en çok 10)
  const rnd = {};
  sec.filter(x => x.tur === 'sinav').forEach(x => {
    const s = S.sinavlar.find(y => y.id === x.ref.sinav), k = kursiyer(x.ref.kursiyer); if (!s || !k) return;
    const d = S.dersler.filter(y => y.kursiyer === k.id && y.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0], ar = arac(d && d.arac) || {}, eg = egitmen(ar.egitmen) || egitmen(k.egitmen) || {};
    if (!ar.plaka) return ekle(x, 'Sınav aracı bulunamadı (öğrencinin dersinde araç yok)');
    const anahtar = s.id + '|' + tabanSinif(k.sinif);
    const j = rnd[anahtar] = rnd[anahtar] || { id: 'randevu-' + anahtar, tur: 'randevu', baslik: `Sınav ${trT(s.tarih).replace(/\//g, '.')} · ${tabanSinif(k.sinif)}`, tarih: trT(s.tarih), sertifika: tabanSinif(k.sinif) + ' SINIFI', adaylar: [], sira: {} };
    const n = j.sira[ar.plaka] = (j.sira[ar.plaka] || 0) + 1;
    if (n > SINAV_SAATLERI.length) return ekle(x, `${ar.plaka} aracına 10’dan fazla aday düştü (araç başına en çok 10)`);
    j.adaylar.push({ id: x.id, tc: k.tc, plaka: ar.plaka.replace(/\s/g, ''), izinNo: izin(eg), personelAd: eg.ad || '', saat: SINAV_SAATLERI[n - 1] });
  });
  Object.values(rnd).forEach(j => { delete j.sira; if (j.adaylar.length) l.push(j); });
  return { l, hata };
}
export async function yaz(ids) {
  if (!hazirMi()) return;
  const { l, hata } = await hazirla(ids);
  S.mebDurum = S.mebDurum || {};
  hata.forEach(([id, not]) => { S.mebDurum[id] = { durum: 'hata', zaman: Date.now(), not }; });
  if (!l.length) { kaydet(); yenile(); return bildir(hata.length ? `${hata.length} iş gönderilemedi: ${hata[0][1]}` : 'MEBBİS’e yazılacak iş yok', 'uyari'); }
  const z = Date.now(); l.forEach(x => (x.adaylar ? x.adaylar.map(a => a.id) : [x.id]).forEach(id => { S.mebDurum[id] = { durum: 'gonderildi', zaman: z }; })); kaydet();
  const sayi = l.reduce((a, x) => a + (x.adaylar ? x.adaylar.length : 1), 0);
  baslat({ id: 't' + Date.now(), cek: [], dosya: [], yaz: l }, `${sayi} iş MEBBİS’e yazılıyor${hata.length ? ` (${hata.length} iş eksik bilgi yüzünden bekliyor)` : ''}`);
}
export function programIsleri(idler) {
  const l = [], hatalar = [];
  sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && !d.meb && fark(d.tarih) >= 0 && (!idler || idler.includes('ders-' + d.id))).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(d => {
    const k = kursiyer(d.kursiyer); if (!k) return;
    const g = mebGrup(k), eg = egitmen(d.egitmen) || {}, ar = arac(d.arac) || {}, id = 'ders-' + d.id;
    const baslik = `${tamAd(k)} · ${d.tarih.split('-').reverse().join('.')} ${d.saat}`;
    if (!g) return hatalar.push([id, baslik, 'Öğrenci bir dönem grubuna atanmamış']);
    if (!/^\d{11}$/.test(k.tc || '')) return hatalar.push([id, baslik, 'TC kimlik no eksik']);
    if (!izin(eg) && !eg.ad) return hatalar.push([id, baslik, 'Öğretmen yok']);
    const sim = d.tur === 'simulator';
    if (!sim && !ar.plaka) return hatalar.push([id, baslik, 'Araç yok']);
    if (!/^\d{2}:00/.test(d.saat || '')) return hatalar.push([id, baslik, `Ders saati ${d.saat}: MEBBİS’te dersler tam saatte başlar`]);
    l.push({ id, tur: 'program', baslik, tc: k.tc, donem: g.donem, grupNo: g.grupNo, subeNo: subeNo(g), tarih: trT(d.tarih), saat: d.saat.slice(0, 5),
      yer: sim ? 'Simülatör' : 'Akan Trafik', plaka: sim ? '' : ar.plaka.replace(/\s/g, ''), simulator: sim ? (ar.sasiNo || '') : '', izinNo: izin(eg), personelAd: eg.ad || '', egitimTuru: egitimTuru(k, d) });
  });
  return { l, hatalar };
}
export const programiYaz = ids => yaz(ids);

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
  const isaretle = (id, ok, not) => {
    const [tur, ...p] = id.split('-'), r = p.join('-');
    if (tur === 'ders') { const d = S.dersler.find(y => y.id === r); if (d && ok && !d.meb) { d.meb = true; delete d.mebDegisti; return 1; } }
    if (tur === 'teorik') { const t = (S.teorik || []).find(y => y.id === r); if (t && ok && !t.meb) { t.meb = true; return 1; } }
    if (tur === 'kayit') { const k = kursiyer(r); if (k && ok && !k.mebIslendi) { k.mebIslendi = true; if (k.mebEvrak && !/(öğrenim|sağlık raporu|adli sicil|parmak izi): /.test(not || '')) k.mebEvrakGirildi = gun(0); return 1; } }
    if (tur === 'evrak') { const k = kursiyer(r); if (k && ok && !k.mebEvrakGirildi) { k.mebEvrakGirildi = gun(0); return 1; } }
    if (tur === 'onay') { const k = kursiyer(r); if (k && ok && !k.mebOnay) { k.mebOnay = gun(0); return 1; } }
    if (tur === 'esinav') { const k = kursiyer(r); if (k && ok && !k.mebEsinav) { k.mebEsinav = gun(0); return 1; } }
    if (tur === 'fatura') { const f = (S.faturalar || []).find(y => String(y.no) === r); if (f && ok && !f.meb) { f.meb = gun(0); return 1; } }
    if (tur === 'grup') { const g = GR.grupBul(r); if (g && ok && !g.meb) { g.meb = true; return 1; } }
    if (tur === 'sinav') { const [sid, kid] = [p.slice(0, -1).join('-'), p[p.length - 1]], s = S.sinavlar.find(y => y.id === sid); if (s && ok && !(s.mebKisi || []).includes(kid)) { s.mebKisi = [...(s.mebKisi || []), kid]; if ((s.kursiyerler || []).every(x => s.mebKisi.includes(x))) s.mebBildirim = true; return 1; } }
    return 0;
  };
  l.forEach(x => {
    if (x.ok) { n += isaretle(x.id, true, x.not); if (S.mebDurum[x.id]) { delete S.mebDurum[x.id]; n++; } }
    else if (!S.mebDurum[x.id] || S.mebDurum[x.id].durum !== 'hata' || S.mebDurum[x.id].not !== x.not) { S.mebDurum[x.id] = { durum: 'hata', zaman: Date.now(), not: x.not }; n++; }
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
  if (yazilan.length) l.push(satir(`${ok} iş MEBBİS’e girildi ve doğrulandı`, hata.length ? `<span style="color:var(--kirmizi);font-weight:700">${hata.length} iş girilemedi</span>: ${hata.slice(0, 4).map(x => e(x.not)).join(' · ')}` : ''));
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
      const y = d.querySelector('[data-al-yok]'); if (y) y.addEventListener('click', () => { const x = o.kursiyerler.yok; kapatPencere(); import('./sayfalar5.js?v=203').then(m => { location.hash = '#/ayarlar/aktarim'; setTimeout(() => m.aktarimYukle([x[0].baslik, ...x.map(z => z.satir)], 'kursiyer', 'MEBBİS'), 300); }); });
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
