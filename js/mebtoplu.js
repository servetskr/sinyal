// MEBBİS toplu çekme ve toplu yazma (mdSinyal tarafı). İşi MEBBİS Yardımcısı'nın arka plan motoru (eklenti/motor.js)
// kursun kendi MEBBİS oturumunda, ekran açmadan yürütür; sonuç buraya gelir ve kayıtlarla eşlenir.
// Gönderilen ve gelen iletilerin adları ve alanları: js/eklenti.js başındaki ileti sözleşmesi tablosu (eklenti/sinyal.js'te de aynısı).
import { S, kaydet, gun, iso, fark, tamAd, islem, SINIFLAR, egitmen, arac, kursiyer, sb, sbDers, cokSube, seciliSube, eksikEvrak } from './veri.js?v=214';
import { bildir, pencere, kapatPencere, e, ik, isaret, rozet, tarih } from './ui.js?v=214';
import * as GR from './gruplar.js?v=214';
import * as EK from './eklenti.js?v=214';
import { yenile } from './app.js?v=214';
import * as ME from './mebevrak.js?v=214';
import * as MK from './mebkayit.js?v=214';
import * as KR from './kurallar.js?v=214';

export const CEKILECEK = [
  ['gruplar', 'Dönem grupları', 'Dönem, grup ve şubeler; eksik grup kartları açılır'],
  ['kursiyerler', 'Kursiyerler', 'Bütün dönemler, her öğrenci durumu ayrı; durum, onay, evrak, haklar'],
  ['dosya', 'Aday dosyaları', 'Aktif kursiyerlerin grubu, hakları, son tarihleri, sınav geçmişi'],
  ['personel', 'Personel', 'İzin no, branş, çalışma izni bitişi'],
  ['araclar', 'Araçlar', 'Muayene, şanzıman, MEBBİS durumu, simülatör'],
  ['sinavlar', 'Sınav sonuçları', 'Son 3 uygulama dönemi ve 2 aylık e-sınav'],
];
// durum: bu sekmedeki bellek; süren iş ayrıca S.mebIs'te kalıcı (sayfa yenilense de parça ve onay bilgisi kalır)
export const durum = { calisiyor: false, id: null, adim: '', baslama: 0, son: null, sonIlerleme: 0, hata: '', mesgul: null, olcum: '' };
// Yardımcı 5 dakikadır ilerleme bildirmediyse iş "çalışıyor" sayılmaz (Durdur, kapanan sekme ya da eski sonuç)
export const suruyor = () => durum.calisiyor && Date.now() - (durum.sonIlerleme || durum.baslama) < 5 * 60e3;
// Toplu iş, Durdur/Devam, onaylı teslim, kurum denetimi ve "Ekranları denetle" Yardımcı 1.12.0 ile geldi
export const GEREKEN_SURUM = '1.12.0';
const surumUygun = () => { const sv = String(EK.eklenti.surum || '0').split('.').map(Number), g = GEREKEN_SURUM.split('.').map(Number); for (let i = 0; i < 3; i++) if ((sv[i] || 0) !== g[i]) return (sv[i] || 0) > g[i]; return true; };
const yeniSurum = surumUygun;
const nrm = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const tarihIso = v => { const m = String(v || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const sutun = (baslik, ...l) => baslik.map(nrm).findIndex(h => l.some(x => x instanceof RegExp ? x.test(h) : h.includes(x)));
const gonder = (tur, veri) => window.postMessage({ kaynak: 'sinyal-sayfa', tur, veri }, location.origin);

function hazirMi(sonra, elleSonra) {
  if (!EK.eklenti.var) { EK.kurulumPenceresi(); return false; }
  if (!MK.onaylayabilir()) { bildir('MEBBİS işini kurs müdürü ya da ön büro başlatır', 'uyari'); return false; }
  // 1.12.0 öncesi Yardımcı onaylı teslim (B8), yarım işin korunması (B9), kalıcı Durdur ve kurum denetimi yapmaz: toplu iş gönderilmez
  if (!surumUygun()) { pencere({ baslik: 'MEBBİS Yardımcısı’nı güncelleyin', icerik: `<p>Toplu çekme ve toplu yazma için Yardımcı’nın <b>${GEREKEN_SURUM}</b> sürümü gerekiyor; bu tarayıcıda <b>${e(EK.eklenti.surum || 'eski sürüm')}</b> kurulu. Yeni sürüm sonucu mdSinyal’e kayıpsız teslim eder, yarım işin üstüne yazmaz, Durdur’u kalıcı yapar ve açık MEBBİS hesabının kurum kodunu denetler.</p><p style="margin-top:8px"><a href="${EK.EKLENTI_ZIP}" download style="color:var(--levha);font-weight:700">Yeni sürümü indirin</a>, Chrome’da chrome://extensions sayfasında eski klasörün yerine açın ya da Chrome Web Mağazası güncellemesini bekleyin.</p><p style="margin-top:8px">Güncelleyene kadar MEB işlemleri › MEBBİS aktarımı ekranında kayıt, direksiyon programı ve sınav randevusunu “Ekranda doldur” ile, öteki işleri “Elle gir” ile girebilirsiniz.</p>`, altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' }); return false; }
  if (cokSube() && !seciliSube()) { bildir('Önce üstten şube seçin; her şubenin MEBBİS hesabı ayrı', 'uyari'); return false; }
  if (suruyor()) { bildir('MEBBİS’te süren bir iş var; bitince yenisini başlatın ya da MEBBİS aktarımı ekranından durdurun', 'uyari'); return false; }
  // kurum bilgilendirmesi: kabul yoksa ya da metin sürümü eskiyse önce o pencere açılır, kabulden sonra iş kaldığı yerden sürer
  if (!MK.kabulDenetle(sonra, elleSonra)) return false;
  return true;
}
// Yardımcı'daki süren iş bu yazma işinin bir parçası mı (çekme işi ya da eski iş değil)
const buIsSuruyor = m => !!m && suruyor() && String(durum.id || '').startsWith(m.id);
function baslat(is, mesaj, kayitla = true) {
  durum.calisiyor = true; durum.id = is.id; durum.gonderilen = is.id; durum.olcum = ''; durum.adim = 'MEBBİS sekmesi açılıyor'; durum.baslama = Date.now(); durum.sonIlerleme = Date.now(); durum.hata = ''; durum.mesgul = null;
  gonder('toplu', is); if (kayitla) islem('MEBBİS toplu işi başlattı', mesaj); bildir(mesaj + '. MEBBİS sekmesi açılıyor; girmediyseniz kendi şifrenizle girin, iş kendiliğinden başlar.');
  yenile();
}

/* ---------- toplu çekme ---------- */
export function topluCek(neler) {
  if (!hazirMi(() => topluCek(neler))) return;   // çekme MEBBİS'e yazmaz: yalnız kurum bilgilendirmesi gerekir, iş onayı gerekmez
  const cek = neler.filter(x => x !== 'dosya');
  // aday dosyası: bekleyen ve süreci devam eden kursiyerler (en çok 150; her biri MEBBİS'te bir sorgu)
  const dosya = neler.includes('dosya') ? sb(S.kursiyerler).filter(k => !k.kapali && /^\d{11}$/.test(k.tc || '') && (GR.bekleyenMi(k) || ['Teorik', 'Direksiyon', 'Sınav'].includes(k.asama))).slice(0, 150).map(k => k.tc) : [];
  // kurum: Yardımcı açık MEBBİS hesabının seçili şubeye ait olduğunu denetler (yanlış şubenin verisi gelmesin)
  baslat({ id: 't' + Date.now(), kurum: MK.kurumBilgi().kod || '', cek, dosya, yaz: [] }, `MEBBİS’ten çekiliyor: ${CEKILECEK.filter(x => neler.includes(x[0])).map(x => x[1].toLocaleLowerCase('tr')).join(', ')}`);
}
/* ---------- "Ekranları denetle": Yardımcı her MEBBİS ekranını yalnız açar (GET), beklediği alanları arar; hiçbir şey yazılmaz ---------- */
export function ekranDenetle() {
  if (!hazirMi(() => ekranDenetle())) return;
  baslat({ id: 'd' + Date.now(), denetle: true, kurum: MK.kurumBilgi().kod || '', cek: [], dosya: [], yaz: [] }, 'MEBBİS ekranları denetleniyor (yalnız okunur, hiçbir şey yazılmaz)');
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
  // md.12/1: kayıt belgesi sistemden alınır, kursiyere imzalatılır, sisteme geri yüklenir; öğrenci dosyasında "Yükledim" işaretlenmediyse satırda hatırlatılır (madde 17)
  sb(S.kursiyerler).filter(k => !k.kapali && k.mebIslendi && mebGrup(k) && !eksikEvrak(k).length && (hepsi || !k.mebOnay) && !((k.meb || {}).kurumOnay || '').match(/onaylandı/i)).forEach(k => {
    l.push({ ...is_('onay', 'onay-' + k.id, `${tamAd(k)} · ${mebGrup(k).ad}`, { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: k.kayit, detay: 'Kurum onayı' + (k.mebOnay || (k.kayitBelgesi && k.kayitBelgesi.yuklendi) ? '' : ' · önce imzalı kayıt belgesini yükleyin (md.12/1)') }, mebGrup(k).baslangic, 'Grup başlamadan', { kursiyer: k.id }), bitti: !!k.mebOnay });
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
/* ---------- sınav randevusu saatleri ---------- */
// Sınav aracı: kursiyerin araçlı son dersinin aracı (ekranda doldur yolu da aynı aracı kullanır)
const sinavAraci = k => { const d = k && S.dersler.filter(y => y.kursiyer === k.id && y.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return arac(d && d.arac) || {}; };
const sinavKimligi = (sid, kid) => 'sinav-' + sid + '-' + kid;
// Bir sınavda araç başına dolu saatler: { PLAKA: Set(saat) }. Dolu sayılan: MEBBİS'e yazılmış (s.mebKisi ya da iz "tamam") ve
// Yardımcı'ya gönderilmiş, sonucu henüz gelmemiş (iz "gonderildi", 7 günden yeni; aktarım merkezindeki "Gönderildi" ile aynı süre) adaylar.
// Saati bilinmeyen eski kayıt (saat izi yok: ekranda doldur, elle giriş, bu sürümden önce) aracının boş ilk saatini tutar; eski yol saatleri hep baştan sırayla verirdi.
// haric: şu an yeniden hazırlanan kimlikler (kendi eski saatleri dolu sayılmaz).
function doluSaatler(sid, haric) {
  const s = S.sinavlar.find(y => y.id === sid), md = S.mebDurum || {}, on = 'sinav-' + sid + '-', o = {}; if (!s) return o;
  const kids = new Set(s.mebKisi || []);
  Object.entries(md).forEach(([id, v]) => { if (id.startsWith(on) && v && (v.durum === 'tamam' || (v.durum === 'gonderildi' && Date.now() - (v.zaman || 0) < 7 * 864e5))) kids.add(id.slice(on.length)); });
  const bilinmeyen = [];
  kids.forEach(kid => {
    const id = sinavKimligi(sid, kid); if (haric.has(id)) return;
    const v = md[id], p = plakaNrm((v && v.plaka) || sinavAraci(kursiyer(kid)).plaka); if (!p) return;
    const d = o[p] = o[p] || new Set();
    if (v && SINAV_SAATLERI.includes(v.saat)) d.add(v.saat); else bilinmeyen.push(p);
  });
  bilinmeyen.forEach(p => { const x = SINAV_SAATLERI.find(t => !o[p].has(t)); if (x) o[p].add(x); });
  return o;
}
// Randevu kayıtlarındaki adaylara sırayla aracının boş ilk saati verilir (boşluk kalmaz). l: [{ tur: 'randevu', id: 'randevu-<sınav>|<sınıf>', adaylar }]
// haric: hazırlanan bütün sınav kimlikleri (gönderilecek ve onayda bırakılanlar). Döner: { l (yeni kayıtlar), bos: saati kalmayan adaylar }
// koru: süren işin kimliği (devam, sonraki parça, yük yeniden istendi). Bu işte gönderilmiş adayın saati boşsa aynen kalır:
// Yardımcı durdurulan parçayı elindeki ilk yükle sürdürür; saat değişirse iz ile MEBBİS'teki saat ayrılır ve sonraki aday çakışabilir.
export function randevuSaatleri(l, haric = new Set(), koru = null) {
  const bos = [], dolu = {}, md = S.mebDurum || {}, sidOf = j => String(j.id).replace(/^randevu-/, '').replace(/\|[^|]*$/, ''), kalsin = {};
  const doluAl = sid => dolu[sid] = dolu[sid] || doluSaatler(sid, haric);
  if (koru) l.forEach(j => { if (j.tur !== 'randevu') return; const d = doluAl(sidOf(j));
    j.adaylar.forEach(a => { const v = md[a.id], p = plakaNrm(a.plaka); if (!v || v.durum !== 'gonderildi' || !String(v.is || '').startsWith(koru) || !SINAV_SAATLERI.includes(v.saat) || plakaNrm(v.plaka) !== p) return;
      const set = d[p] = d[p] || new Set(); if (set.has(v.saat)) return; set.add(v.saat); kalsin[a.id] = v.saat; }); });
  const yeni = l.map(j => {
    if (j.tur !== 'randevu') return j;
    const d = doluAl(sidOf(j)), adaylar = [];
    j.adaylar.forEach(a => { const p = plakaNrm(a.plaka), set = d[p] = d[p] || new Set(), saat = kalsin[a.id] || SINAV_SAATLERI.find(t => !set.has(t)); if (!saat) return bos.push(a); set.add(saat); adaylar.push({ ...a, saat }); });
    return { ...j, adaylar };
  });
  return { l: yeni, bos };
}
// foto: false → elle yolda fotoğraf çevrilmez (yük küçük kalır). basliklar: id → ekrandaki başlık (onay ve hata listesinde)
// koru: süren işin kimliği; yeniden hazırlanan randevu adayı bu işteki saatini korur (randevuSaatleri)
export async function hazirla(ids, { foto = true, koru = null } = {}) {
  const hepsi = [...EK.mebIsleri(true), ...ekIsler(true)], sec = hepsi.filter(x => ids.includes(x.id) && !x.bitti);
  const basliklar = Object.fromEntries(sec.map(x => [x.id, x.baslik]));
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
      l.push({ id: x.id, tur: 'kayit', baslik: tamAd(k), donem: g.donem, grupNo: g.grupNo, subeNo: subeNo(g), tc: k.tc, istenen: sertifikaMetni(k), mevcut, belgeNo: mevcut ? String((k.oncekiBelge || {}).sayi || '') : '', cep: cep10(k.tel), foto: foto ? await fotoHazirla(k.foto) : '', sozlesme: k.sozlesmeImza && k.sozlesmeImza.tarih ? trT(k.sozlesmeImza.tarih) : '', adSoyad: tamAd(k), evrak: k.mebEvrak ? ME.evrakPaketi(k).l : null });
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
  // sınav randevusu: sınav ve sınıf başına tek kayıt. Saat aracın boş ilk saatidir (araç başına en çok 10):
  // aynı sınavda bu araçla MEBBİS'e yazılmış ya da gönderilmiş adayların saatleri dolu sayılır (randevuSaatleri)
  const rnd = {}, sinavIds = new Set(sec.filter(x => x.tur === 'sinav').map(x => x.id));
  sec.filter(x => x.tur === 'sinav').forEach(x => {
    const s = S.sinavlar.find(y => y.id === x.ref.sinav), k = kursiyer(x.ref.kursiyer); if (!s || !k) return;
    const ar = sinavAraci(k), eg = egitmen(ar.egitmen) || egitmen(k.egitmen) || {};
    if (!ar.plaka) return ekle(x, 'Sınav aracı bulunamadı (öğrencinin dersinde araç yok)');
    const anahtar = s.id + '|' + tabanSinif(k.sinif);
    const j = rnd[anahtar] = rnd[anahtar] || { id: 'randevu-' + anahtar, tur: 'randevu', baslik: `Sınav ${trT(s.tarih).replace(/\//g, '.')} · ${tabanSinif(k.sinif)}`, tarih: trT(s.tarih), sertifika: tabanSinif(k.sinif) + ' SINIFI', adaylar: [] };
    j.adaylar.push({ id: x.id, tc: k.tc, plaka: ar.plaka.replace(/\s/g, ''), izinNo: izin(eg), personelAd: eg.ad || '', saat: '' });
  });
  const rl = randevuSaatleri(Object.values(rnd), sinavIds, koru);
  rl.bos.forEach(a => ekle({ id: a.id }, `${a.plaka} aracının bu sınavdaki ${SINAV_SAATLERI.length} saati de dolu (araç başına en çok ${SINAV_SAATLERI.length} aday)`));
  rl.l.forEach(j => { if (j.adaylar.length) l.push(j); });
  // MEBBİS'teki bağımlılık sırası: grup açılmadan kayıt, kayıt olmadan evrak ve onay, onaysız ders ve sınav olmaz
  const SIRA = ['grup', 'kayit', 'evrak', 'onay', 'teorik', 'program', 'esinav', 'randevu', 'fatura'];
  l.sort((a, b) => SIRA.indexOf(a.tur) - SIRA.indexOf(b.tur));
  return { l, hata, basliklar };
}
/* ---------- kural motoru (kurallar.js): MEBBİS'e yazmadan önce her kaydın engel ve uyarı bulguları ---------- */
// engel: kuralın ciddiyeti 'engel' ve bulgu 'dur'/'yasak' (kurallar.js mebEngel ile aynı tanım); uyarı: öteki dur/yasak/uyari bulguları; bilgi gösterilmez.
// Kural hangi iş türünü ilgilendirir (yoksa kursiyere bağlı bütün türler; fatura ve dönem grubu hariç). Boş liste: onay ekranında gösterilmez.
// M05 sınavın MEBBİS'e bildirilmediğini söyler: randevuyu yazmak çaresidir, engel sayılmaz. P01 (personel fotoğrafı) yazmayı ilgilendirmez.
// Y05 (teorik günde 2–6 saat) motordan değil, kayıt başına teorikKontrol'den gelir.
// MZ (mevzuat.js: indirim, ilan üstü ücret, hazır yazısı…) yalnız kayıt ve sınav randevusunda gösterilir; direksiyon ve teorik programında gürültü olur.
const KURAL_TUR = { M01: ['program'], M02: ['program'], M03: ['randevu'], M05: [], M07: ['esinav'], M08: ['randevu'], M09: ['randevu'], M10: ['esinav'], M11: ['program'], M12: ['program', 'randevu'], M13: ['program', 'randevu'], Y01: ['randevu'], Y02: ['randevu'], Y03: ['esinav'], Y04: ['randevu'], Y05: [], P01: [], MZ: ['kayit', 'randevu'] };
const KURSIYER_TURLERI = ['kayit', 'evrak', 'onay', 'program', 'esinav', 'randevu'];
const plakaNrm = p => String(p || '').replace(/\s/g, '').toLocaleUpperCase('tr');
// Döner: { kimlik: { engel: [{kural, metin}], uyari: [{kural, metin}] } } (randevu ve kurum onayında aday kimliğiyle)
export function kuralDenetimi(l) {
  const o = {};
  let bulgular = [], cid = {};
  try { bulgular = KR.calistir(); cid = Object.fromEntries(KR.kurallar().map(r => [r.id, r.ciddiyet])); } catch (x) { console.warn('Kural motoru çalışmadı', x); return o; }
  const ekle = (id, tur, kural, metin) => { const r = o[id] = o[id] || { engel: [], uyari: [] }; if (!r[tur].some(y => y.kural === kural && y.metin === metin) && r[tur].length < 4) r[tur].push({ kural, metin }); };
  const bak = (id, tur, c) => {
    bulgular.forEach(b => {
      const kural = b.kural || '', bt = b[0], izinli = KURAL_TUR[kural]; if (!['dur', 'yasak', 'uyari'].includes(bt)) return;
      if (izinli ? !izinli.includes(tur) : !KURSIYER_TURLERI.includes(tur)) return;
      const bas = String(b[1] || ''), k = c.k;
      let uyar = false;
      if (kural === 'M01') uyar = !!(k && c.d && bas.startsWith(tamAd(k) + ' · ') && bas.includes(`${tarih(c.d.tarih)} ${c.d.saat} dersi`));
      else if (kural === 'M02') uyar = !!(k && c.d && bas.startsWith(tamAd(k) + ' için ' + tarih(c.d.tarih) + ' günü'));
      else if (kural === 'M12') uyar = !!(c.plaka && bas.includes(' belgesi') && plakaNrm(bas.split(' belgesi')[0]) === plakaNrm(c.plaka));
      else if (kural === 'M13') uyar = !!(c.usta && bas.startsWith(c.usta + ' · '));
      // Y04: yalnız o oturumda sınav ücreti ödenmemiş kursiyer (bulgunun kursiyerler listesi; ödeyen ve hatırlatma bulgusu eşleşmez)
      else if (kural === 'Y04') uyar = !!(k && c.sinav && b.sinav === c.sinav && (b.kursiyerler || []).includes(k.id));
      else uyar = !!(k && (b.kursiyer === k.id || String(b[3] || '').endsWith('/' + k.id)));
      if (!uyar) return;
      ekle(id, cid[kural] === 'engel' && ['dur', 'yasak'].includes(bt) ? 'engel' : 'uyari', kural || 'Kural', bas + (b[2] ? '. ' + String(b[2]).replace(/\.$/, '') : ''));
    });
  };
  l.forEach(x => {
    if (x.tur === 'teorik') {   // Y05: grup ve gün toplamı (bu ders dahil) 2–6 saat dışındaysa uyarı
      const t = (S.teorik || []).find(y => 'teorik-' + y.id === x.id); if (!t) return;
      const tk = KR.teorikKontrol(t.grup, t.tarih, 0); if (tk && tk.mesaj) ekle(x.id, 'uyari', 'Y05', tk.mesaj);
      return;
    }
    if (x.tur === 'program') {
      const d = S.dersler.find(y => 'ders-' + y.id === x.id); if (!d) return;
      return bak(x.id, 'program', { k: kursiyer(d.kursiyer), d, plaka: (arac(d.arac) || {}).plaka || '', usta: (egitmen(d.egitmen) || {}).ad || '' });
    }
    if (x.tur === 'randevu') return x.adaylar.forEach(a => { const p = String(a.id).split('-'); bak(a.id, 'randevu', { k: kursiyer(p[p.length - 1]), sinav: p.slice(1, -1).join('-'), plaka: a.plaka, usta: a.personelAd }); });
    if (x.tur === 'onay') return x.adaylar.forEach(a => bak(a.id, 'onay', { k: kursiyer(String(a.id).replace(/^onay-/, '')) }));
    if (['kayit', 'evrak', 'esinav'].includes(x.tur)) bak(x.id, x.tur, { k: kursiyer(String(x.id).slice(x.tur.length + 1)) });
  });
  return o;
}

// "Ekranda doldur" ve "Elle gir" yolları için kimliklerden kural denetimi girdisi (hazirla gerekmez; eksik bilgili iş de denetlenir)
function kuralGirdisi(ids) {
  const l = [], rnd = {}, onay = { id: 'onay', tur: 'onay', adaylar: [] };
  ids.forEach(id => {
    const [t, ...p] = String(id).split('-');
    if (t === 'ders') l.push({ id, tur: 'program' });
    else if (t === 'sinav') { const sid = p.slice(0, -1).join('-'), k = kursiyer(p[p.length - 1]), ar = sinavAraci(k), eg = egitmen(ar.egitmen) || egitmen(k && k.egitmen) || {}; (rnd[sid] = rnd[sid] || { id: 'randevu-' + sid, tur: 'randevu', adaylar: [] }).adaylar.push({ id, plaka: String(ar.plaka || '').replace(/\s/g, ''), personelAd: eg.ad || '' }); }
    else if (t === 'onay') onay.adaylar.push({ id });
    else if (['kayit', 'evrak', 'esinav', 'teorik'].includes(t)) l.push({ id, tur: t });
  });
  return [...l, ...Object.values(rnd), ...(onay.adaylar.length ? [onay] : [])];
}
// Yardımcı'sız yollar engellemez: bulgu varsa yalnız gösterilir, "devam" ile yol aynen sürer; bulgu yoksa hemen sürer
export function kuralBilgi(ids, devam, { dugme } = {}) {
  let kural = {}, ogeler = [];
  try {
    kural = kuralDenetimi(kuralGirdisi(ids || []));
    const bas = Object.fromEntries([...EK.mebIsleri(true), ...ekIsler(true)].map(x => [x.id, x.baslik]));
    ogeler = (ids || []).filter(id => kural[id] && ((kural[id].engel || []).length || (kural[id].uyari || []).length)).map(id => [id, bas[id] || '']);
  } catch (x) { console.warn('Kural denetimi', x); ogeler = []; }   // denetim çalışmazsa yol eskisi gibi sürer
  if (!ogeler.length) return devam();
  MK.kuralBilgiPenceresi({ ogeler, kural, dugme, devam });
}

// MEBBİS'e yaz: hazırla → iş onayı penceresi (ne, kimin adına, kim onaylıyor, süre, parça) → iş fişi → ilk parça Yardımcı'ya
// Döner: true (iş Yardımcı'ya gönderildi) ya da undefined (vazgeçildi, engel var)
export async function yaz(ids) {
  // kurum "Yardımcı'yı kullanmayacağım" derse aynı işler elle giriş penceresinde açılır
  // (kayıt, direksiyon programı ve sınav randevusu mevcut "Elle giriş" ekranlarındadır; pencere yalnız öteki altı tür için açılır)
  if (!hazirMi(() => yaz(ids), () => { const el = ids.filter(id => MK.ELLE_TURLER.includes(String(id).split('-')[0])); if (el.length) elleGir(el); })) return;
  const { l, hata, basliklar } = await hazirla(ids);
  S.mebDurum = S.mebDurum || {};
  hata.forEach(([id, not]) => { S.mebDurum[id] = { durum: 'hata', zaman: Date.now(), not }; });
  if (!l.length) { kaydet(); yenile(); return bildir(hata.length ? `${hata.length} iş gönderilemedi: ${hata[0][1]}` : 'MEBBİS’e yazılacak iş yok', 'uyari'); }
  // kural motoru: engelli kayıtlar onay ekranında kırmızı ve seçilmemiş gelir, uyarılar turuncu
  const kural = kuralDenetimi(l);
  // onayda bırakılan aday çıkınca kalan adayların saatleri sırayla yeniden verilir (pencere önizler, gönderilen de budur)
  // hazırlanan: hazirla'nın kendi eski saatini dolu saymadığı kimlikler (bitmiş iş ids'te olsa bile onun saati dolu kalır)
  const hazirlanan = new Set([...l.flatMap(MK.isKimlikleri), ...hata.map(([id]) => id)]), sikistir = h => randevuSaatleri(MK.engelliCikar(l, h), hazirlanan).l;
  const r = await MK.isOnayPenceresi({ l, hata, basliklar, kural, sikistir });
  if (!r) { if (hata.length) kaydet(); return bildir('MEBBİS’e yazma iptal edildi; hiçbir şey gönderilmedi'); }
  const haric = r.haric || [], bilerek = r.bilerek || [];
  const gid = sikistir(haric).filter(x => !x.adaylar || x.adaylar.length);
  if (!gid.length) { if (hata.length) kaydet(); return bildir('Seçilen kayıtların hepsinde kural engeli var; hiçbir şey gönderilmedi', 'uyari'); }
  const parcalar = MK.parcala(gid), id = 't' + Date.now(), ozet = await MK.yukOzeti(gid);
  MK.fisYaz({ id, onay: r.onay, l: gid, parca: parcalar.length, ozet, hata: hata.length, engelli: haric.length, bilerek: bilerek.length });
  MK.engelRaginaYaz(id, bilerek, basliklar);
  // kalıcı iş kaydı: parçalar kimlik olarak tutulur (kişisel veri yok); her parça başlarken değerler yeniden hazırlanır
  // engel: kural engeline rağmen gönderilen kimlik → kural kimlikleri (sonuç satırına da yazılır)
  S.mebIs = { id, onay: r.onay, ozet, zaman: Date.now(), parcalar: parcalar.map(p => p.flatMap(MK.isKimlikleri)), no: 0, durum: 'calisiyor', biten: [], ...(bilerek.length ? { engel: Object.fromEntries(bilerek.map(b => [b.id, b.kurallar.join(', ')])) } : {}) };
  if (haric.length) bildir(`${haric.length} kayıt kural engeli yüzünden gönderilmedi`, 'uyari');
  parcaGonder(parcalar[0], 0, basliklar);
  return true;
}
const parcaId = (no) => S.mebIs.id + (S.mebIs.parcalar.length > 1 ? '-' + (no + 1) : '');
function parcaGonder(l, no, basliklar = {}, devam = false) {
  const z = Date.now(), m = S.mebIs, pid = parcaId(no);
  // randevuda adayın saati ve aracı izde kalır: sonra eklenen aday bu saati dolu sayar (randevuSaatleri)
  l.forEach(x => (x.adaylar || [{ id: x.id }]).forEach(a => { const id = a.id; S.mebDurum[id] = { durum: 'gonderildi', zaman: z, is: pid, tur: x.tur === 'randevu' ? 'sinav' : x.tur, baslik: MK.maskele(basliklar[id] || x.baslik || '').slice(0, 80), ...(x.tur === 'randevu' && a.saat ? { saat: a.saat, plaka: a.plaka } : {}) }; }));
  m.no = no; m.durum = 'calisiyor'; kaydet();
  const sayi = l.reduce((a, x) => a + (x.adaylar ? x.adaylar.length : 1), 0), pn = m.parcalar.length;
  // onay ve parca alanları Yardımcı için bilgidir (1.11 yok sayar); isId parçaları aynı onaya bağlar
  // kurum: motor açık MEBBİS hesabının kurum kodunu bununla karşılaştırır (çok şubede yanlış hesaba yazmasın)
  baslat({ id: pid, isId: m.id, kurum: m.onay.kurum || '', cek: [], dosya: [], yaz: l, onay: { kim: m.onay.kim, rol: m.onay.rol, zaman: m.onay.zaman, surum: m.onay.surum, kurum: m.onay.kurum, sube: m.onay.sube || '' }, parca: { no: no + 1, toplam: pn, butceDk: MK.parcaDk() } },
    `${sayi} iş MEBBİS’e yazılıyor${pn > 1 ? ` (parça ${no + 1}/${pn})` : ''}`, false);
  // Yardımcı 1.12'de durdurulmuş ya da oturumu düşmüş aynı parça depoda bekler: aynı kimlikle yeniden koymak onu sürdürmez, açık "devam" gerekir
  if (devam) gonder('toplu-devam', { id: pid });
}
// Kalan işler: onaylanan kimliklerden henüz aktarılmamış ve bu işte hata vermemiş olanlar
function kalanIds(no) {
  const m = S.mebIs; if (!m) return [];
  const bitti = new Set([...EK.mebIsleri(true), ...ekIsler(true)].filter(x => x.bitti).map(x => x.id));
  return m.parcalar.slice(no).flat().filter(id => !bitti.has(id) && !((S.mebDurum || {})[id] && S.mebDurum[id].durum === 'hata' && String(S.mebDurum[id].is || '').startsWith(m.id)));
}
// Sonraki parça ya da kaldığı yerden devam: onay 24 saat geçerli; daha eskiyse yeniden onay istenir
export async function devamEt(sonraki) {
  const m = S.mebIs; if (!m || !hazirMi(() => devamEt(sonraki))) return;
  const no = sonraki ? m.no + 1 : m.no, kalan = new Set(kalanIds(no));
  if (!kalan.size) { m.durum = 'bitti'; kaydet(); yenile(); return bildir('Kalan iş yok; hepsi aktarıldı'); }
  if (Date.now() - new Date(m.onay.zaman).getTime() > 24 * 3600e3) { const ids = [...kalan]; S.mebIs = null; kaydet(); bildir('Onay 24 saatten eski; kalan işler için yeniden onay isteniyor', 'uyari'); return yaz(ids); }
  // kalan parçalar yeniden kurulur (yalnız onaylanmış kimlikler)
  m.parcalar = [...m.parcalar.slice(0, no), ...m.parcalar.slice(no).map(p => p.filter(id => kalan.has(id))).filter(p => p.length)];
  const { l, hata, basliklar } = await hazirla(m.parcalar[no] || [], { koru: m.id });
  hata.forEach(([id, not]) => { S.mebDurum[id] = { durum: 'hata', zaman: Date.now(), not, is: parcaId(no) }; });
  if (!l.length) { kaydet(); yenile(); return bildir('Bu parçada gönderilecek iş kalmadı', 'uyari'); }
  islem(sonraki ? 'MEBBİS işinin sonraki parçasını başlattı' : 'MEBBİS işine kaldığı yerden devam etti', `İş ${m.id} · parça ${no + 1}/${m.parcalar.length} · ${l.length} iş`);
  parcaGonder(l, no, basliklar, !sonraki);
}
// Yazma işini (S.mebIs) iptal eder. Yardımcı'da başka bir iş (ör. MEBBİS'ten güncelle) sürüyorsa ona dokunmaz.
export function isIptal() {
  const m = S.mebIs, aktif = m && !['bitti', 'iptal'].includes(m.durum) ? m : null;
  if (!aktif) return cekIptal();
  const baskasi = suruyor() && !String(durum.id || '').startsWith(aktif.id);
  if (!baskasi) { gonder('toplu-iptal', { id: parcaId(aktif.no) }); durum.calisiyor = false; }
  islem('MEBBİS işini iptal etti', `İş ${aktif.id} · parça ${aktif.no + 1}/${aktif.parcalar.length}`); aktif.durum = 'iptal';
  Object.entries(S.mebDurum || {}).forEach(([id, v]) => { if (v && v.durum === 'gonderildi' && String(v.is || '').startsWith(aktif.id)) delete S.mebDurum[id]; }); kaydet();
  bildir('MEBBİS işi iptal edildi; kalan işler gönderilmedi');
}
// Yardımcı'da o an süren işi (çekme ya da yazma) iptal eder
export function cekIptal() {
  const m = S.mebIs;
  if (m && !['bitti', 'iptal'].includes(m.durum) && String(durum.id || '').startsWith(m.id)) return isIptal();
  gonder('toplu-iptal', durum.id ? { id: durum.id } : {}); durum.calisiyor = false; bildir('MEBBİS işi iptal edildi');
}
// Yardımcı 1.12: durdur ve devam mesajları; eski sürümde yalnız iptal var
export function isDurdur() { gonder('toplu-durdur', { id: durum.id }); const m = S.mebIs; if (m && String(durum.id || '').startsWith(m.id)) { m.durum = 'durduruldu'; islem('MEBBİS işini durdurdu', `İş ${m.id}`); kaydet(); } durum.calisiyor = false; bildir('Durdurma isteği gönderildi; Yardımcı elindeki kaydı bitirip durur'); }
// Yardımcı tarayıcı kapanıp kişisel yükü kaybettiyse kalan işleri ister: yalnız onaylanmış kimlikler yeniden hazırlanır
export async function yukIste(v) {
  const m = S.mebIs; if (!v || !m || !String(v.id || '').startsWith(m.id)) return;
  const izinli = new Set(m.parcalar.flat()), ids = (v.kalan || []).filter(id => izinli.has(id));
  const { l } = await hazirla(ids, { koru: m.id });
  // yeni yükteki randevu saati ize de yazılır (Yardımcı bu yükle yazar)
  let degisti = false; l.forEach(x => x.tur === 'randevu' && x.adaylar.forEach(a => { const d = (S.mebDurum || {})[a.id]; if (d && d.durum === 'gonderildi' && (d.saat !== a.saat || d.plaka !== a.plaka)) { d.saat = a.saat; d.plaka = a.plaka; degisti = true; } })); if (degisti) kaydet();
  gonder('toplu-yuk-koy', { id: v.id, yaz: l });
}
// toplu-yuk-alindi: Yardımcı yeniden hazırlanan kalan işleri aldı mı (iş durdurulmuşsa "Devam et" bekler)
export function yukAlindi(v) {
  if (!v) return;
  if (v.ok && !v.ayni) bildir(`Kalan ${+v.n || 0} iş Yardımcı’ya yeniden verildi${v.durum === 'durduruldu' ? '; MEBBİS sekmesindeki karttan “Devam et”e basın' : ''}`);
  else if (!v.ok && v.mesgul) bildir('Yardımcı’da başka bir iş sürüyor; kalan işler verilmedi', 'uyari');
  else if (!v.ok) bildir('Kalan işler Yardımcı’ya verilemedi' + (v.neden ? ': ' + v.neden : ''), 'uyari');
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
// Yardımcı'dan gelen toplu-durum: { id, bitti, zaman?, durum?, sonuc: { adim, hata, hataTur?, yazilan: [{ id, ok, not, dogrulama?, ekran?, mebMesaj?, sure?, kod?, hataTur?, eksik? }], veri, ekranDegisti?, mebKurum? } }
const islenen = new Set();
export function durumGeldi(r) {
  if (!r || !r.sonuc) return;
  const sn = r.sonuc, m = S.mebIs, buIs = m && String(r.id || '').startsWith(m.id);
  // sonucun hangi parçaya ait olduğu kimliğin sonundan okunur (t123-2 → 2. parça); eski parçanın geç gelen sonucu yeni parçayı bozmasın
  const pNo = buIs ? (r.id === m.id ? 0 : Math.max(0, (+String(r.id).slice(m.id.length + 1) || 1) - 1)) : -1, guncelParca = buIs && pNo === m.no;
  const iptal = !!r.iptal || sn.hataTur === 'iptal', son = !!r.bitti || !!r.son;
  durum.adim = sn.adim || durum.adim; durum.son = r; durum.id = r.id || durum.id;
  if (r.zaman) durum.sonIlerleme = Math.max(durum.sonIlerleme || 0, r.zaman); else if (!son) durum.sonIlerleme = Date.now();
  // "MEBBİS ekranı değişti": iş tamamen durduysa (hataTur) ya da tek tek ekranlar (ekranDegisti, yazilan[].hataTur)
  durum.olcum = sn.olcum ? MK.olcumMetni(sn.olcum, sn.yazilan) : durum.olcum;
  // ekran değişti: alan adları ve parmak izi (değer yok); Yardımcı ve harita sürümü sonucun üstünde gelir
  const ekr = [...(Array.isArray(sn.ekranDegisti) ? sn.ekranDegisti : []), ...(sn.yazilan || []).filter(x => x.hataTur === 'ekran').map(x => ({ ekran: x.ekran, eksik: x.eksik }))];
  if (sn.hataTur === 'ekran') ekr.push({ ekran: sn.ekran, eksik: sn.eksik });
  MK.ekranDegisti(ekr.filter(x => x.ekran).map(x => ({ ekran: x.ekran, eksik: x.eksik, iz: x.iz, yardimci: sn.yardimci, harita: sn.harita })), r.id);
  // kurum uyuşmazlığı: Yardımcı hiçbir şey yazmadan durur (hataTur 'kurum', mebKurum açık hesabın kodu); işlem kaydına ve iş kartına düşer
  const acikKurum = String(sn.mebKurum || '').replace(/\D/g, ''), beklenen = String((buIs && m.onay.kurum) || '').replace(/\D/g, '');
  const kurumHata = sn.hataTur === 'kurum' || (acikKurum && beklenen && acikKurum !== beklenen);
  if (kurumHata) MK.kurumUyusmazligi({ isId: r.id, acik: acikKurum, beklenen: beklenen || MK.kurumBilgi().kod, hata: sn.hata, zaman: r.zaman });
  if (sn.hata) {
    durum.calisiyor = false;
    if (durum.hata !== r.id + sn.hata) {
      durum.hata = r.id + sn.hata;
      if (!kurumHata) bildir((iptal ? 'MEBBİS işi: ' : 'MEBBİS işi durdu: ') + MK.maskele(sn.hata), iptal ? 'tamam' : 'uyari');
      // yetkilinin iptali "durdu" ile ezilmez; Yardımcı'nın kendi Durdur'u (dur) kalıcı durdurmadır
      if (guncelParca && m.durum !== 'iptal') { m.durum = iptal ? 'iptal' : kurumHata ? 'kurum' : sn.hataTur === 'dur' ? 'durduruldu' : sn.hataTur === 'oturum' || /oturum/i.test(sn.hata) ? 'oturum' : 'durdu'; m.not = kurumHata ? (acikKurum ? `MEBBİS’te açık hesap ${acikKurum} kurumuna ait; bu iş ${beklenen || '—'} kurum kodu için. Hiçbir şey yazılmadı.` : 'Açık MEBBİS hesabının kurumu doğrulanmadı. Hiçbir şey yazılmadı.') : MK.maskele(String(sn.hata)).slice(0, 200); kaydet(); }
    }
  } else if (!son) {
    durum.calisiyor = r.durum !== 'durduruldu';
    if (guncelParca && r.durum === 'durduruldu' && !['durduruldu', 'iptal'].includes(m.durum)) { m.durum = 'durduruldu'; kaydet(); }
    // oturum düşüp yeniden girilince Yardımcı kendiliğinden sürer: kart yeniden "çalışıyor"a döner
    else if (guncelParca && r.durum !== 'durduruldu' && ['oturum', 'durdu', 'kurum'].includes(m.durum)) { m.durum = 'calisiyor'; m.not = ''; kaydet(); }
  }
  yazilanlariIsle(sn.yazilan || [], r.id);
  if (!son) return yenile();
  durum.calisiyor = false;
  // Yardımcı 1.12 sonucu bu onaydan sonra siler (bitmiş ya da iptal edilmiş iş); 1.11 okurken siler, bu mesajı yok sayar
  gonder('toplu-sonuc-onay', r.zaman != null ? { id: r.id, zaman: r.zaman } : { id: r.id });
  // islenen bellekte; ayrıca bu tarayıcıda kalıcı işaret (MK.teslimGoruldu). Sayfa teslim onayından önce yenilenirse Yardımcı aynı sonucu yeniden verir:
  // o zaman veri yeniden uygulanır (ilk kaydetme buluta ulaşmadan sayfa kapandıysa çekilen veri kaybolmasın; uygulama tekrarlanabilir),
  // ama "MEBBİS işi bitti", "toplu veri aldı" ve "ekranlarını denetledi" işlem kayıtları ikinci kez yazılmaz.
  if (islenen.has(r.id) || (buIs && (m.biten || []).includes(r.id))) return yenile();
  const tekrar = MK.teslimGoruldu('islenen', r.id); islenen.add(r.id); if (!tekrar) MK.teslimIsaretle('islenen', r.id);
  if (!r.bitti) { if (buIs) { m.biten = [...(m.biten || []), r.id]; kaydet(); } return yenile(); }   // iptal ya da yarım teslim: yazılanlar işaretlendi, özet açılmaz
  MK.isBittiYaz(r);   // iş özeti: kaç kayıt, kurum doğrulaması, istek ve güvenlik kodu sayısı, süre
  // "Ekranları denetle" işi: veri yok, yalnız ekran durumları
  if (sn.veri && sn.veri.denetim) { MK.denetimSonucu(sn.veri.denetim, r.id); return yenile(); }
  const o = uygula(sn.veri || {}, tekrar);
  if (buIs) {
    m.biten = [...(m.biten || []), r.id];
    if (guncelParca && m.no + 1 < m.parcalar.length && m.durum !== 'iptal') { m.durum = 'parca-bitti'; kaydet(); return parcaBittiGoster(o, sn.yazilan || []); }
    if (guncelParca && m.durum !== 'iptal') m.durum = 'bitti';
    kaydet();
  }
  ozetGoster(o, sn.yazilan || []);
}
function parcaBittiGoster(o, yazilan) {
  const m = S.mebIs, ok = yazilan.filter(x => x.ok).length, hata = yazilan.filter(x => !x.ok).length, kalan = kalanIds(m.no + 1).length;
  pencere({
    baslik: `Parça ${m.no + 1}/${m.parcalar.length} bitti`,
    icerik: `<p style="font-size:14.5px">${ok} iş MEBBİS’e girildi${hata ? `, <b style="color:var(--kirmizi)">${hata} iş girilemedi</b>` : ''}. Sırada <b>${kalan} iş</b> var.</p>
      <p class="ipucu uyari" style="margin-top:10px">${isaret('uyari', 18)}<span>MEBBİS oturumu yaklaşık 40 dakikada kapanabiliyor. Sonraki parçadan önce MEBBİS’ten çıkıp kendi şifrenizle yeniden girin; sonra aşağıdaki düğmeye basın.</span></p>
      <small style="display:block;color:var(--soluk);margin-top:8px">Aynı onayla sürer (onaylayan ${e(m.onay.kim)}, ${MK.zamanMetni(m.onay.zaman)}). İsterseniz sonra MEB işlemleri › MEBBİS aktarımı ekranından da başlatabilirsiniz.</small>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Sonra</button><button class="dg dg-ana" data-mt-sonraki-p>${ik('ok')}MEBBİS’e yeniden girdim, sonraki parçayı başlat</button>`,
    onAc(d) { d.querySelector('[data-mt-sonraki-p]').addEventListener('click', () => { kapatPencere(); devamEt(true); }); },
  });
  yenile();
}
// Yazılan her kayıt: bayrak işaretlenir, ekranda iz kalır (başarıda da), sunucu kaydına kayıt başına bir satır yazılır.
// Aynı sonuç her yoklamada yeniden gelir: iz (is + durum + not) aynıysa ikinci kez kaydedilmez.
export function yazilanlariIsle(l, isId, kaynak = 'yardimci') {
  let n = 0; S.mebDurum = S.mebDurum || {};
  const u = MK.kim();
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
  const turOf = id => { const t = id.split('-')[0]; return t === 'ders' ? 'program' : t; };
  l.forEach(x => {
    if (!x || !x.id) return;
    const once = S.mebDurum[x.id], dur = x.ok ? 'tamam' : 'hata', not = String(x.not || '').slice(0, 240);
    if (once && once.is === isId && once.durum === dur && (once.not || '') === not) return;   // bu sonuç zaten işlendi
    const tur = (once && once.tur) || turOf(x.id), baslik = (once && once.baslik) || '';
    if (x.ok) n += isaretle(x.id, true, x.not);
    S.mebDurum[x.id] = x.ok
      ? { durum: 'tamam', zaman: Date.now(), is: isId, tur, baslik, kim: (once && once.kim) || u.ad, kaynak, dogrulama: x.dogrulama || (kaynak === 'elle' ? 'kullanici' : /zaten vard/i.test(not) ? 'zaten' : ''), not, ...(once && once.saat ? { saat: once.saat, plaka: once.plaka } : {}) }
      : { durum: 'hata', zaman: Date.now(), is: isId, tur, baslik, not, hataTur: x.hataTur || '' };
    const engel = (S.mebIs && String(isId || '').startsWith(S.mebIs.id) && (S.mebIs.engel || {})[x.id]) || '';
    MK.sonucYaz(x, { isId, tur, baslik, kaynak, engel });
    MK.olcumIsle({ ...x, tur });
    n++;
  });
  if (n) { MK.izBuda(); kaydet(); }
  return n;
}
// Elle yol: Yardımcı olmadan girilen işler aynı bayraklarla işaretlenir (doğrulama: kullanıcı)
export async function elleGir(ids) {
  if (!MK.onaylayabilir()) return bildir('MEBBİS işlerini kurs müdürü ya da ön büro girer', 'uyari');
  const { l, hata, basliklar } = await hazirla(ids, { foto: false });
  if (!l.length) return bildir(hata.length ? `${hata.length} iş hazırlanamadı: ${hata[0][1]}` : 'Elle girilecek iş yok', 'uyari');
  const isId = 'e' + Date.now();
  // baslik izi: elle girilen işin sonuç kaydında kişi ve tarih görünsün
  l.forEach(x => MK.isKimlikleri(x).forEach(id => { const o = S.mebDurum = S.mebDurum || {}; if (!o[id] || o[id].durum !== 'tamam') o[id] = { ...(o[id] || {}), tur: x.tur === 'randevu' ? 'sinav' : x.tur, baslik: MK.maskele(basliklar[id] || x.baslik || '').slice(0, 80) }; }));
  // kural bulguları kartlarda bilgi olarak görünür; elle giriş durdurulmaz
  let kural = {}; try { kural = kuralDenetimi(l); } catch (x) { console.warn('Kural denetimi', x); }
  MK.ellePencere(l, hata, gidenler => {
    const n = yazilanlariIsle(gidenler.map(id => ({ id, ok: true, not: 'elle girildi', dogrulama: 'kullanici' })), isId, 'elle');
    if (n) bildir(`${gidenler.length} iş MEBBİS’e elle girildi olarak işaretlendi`);
    yenile();
  }, basliklar, kural);
}
// tekrar: aynı sonuç yenilemeden sonra yeniden geldi (durumGeldi); veri uygulanır, "toplu veri aldı" kaydı ikinci kez yazılmaz
function uygula(v, tekrar = false) {
  const o = {};
  if (v.gruplar && v.gruplar.sube) { const t = v.gruplar.sube; o.gruplar = GR.mebbisGruplariAl([t.baslik, ...t.satirlar], true); }
  else if (v.gruplar && v.gruplar.hata) o.gruplarHata = v.gruplar.hata;
  if (Array.isArray(v.kursiyerler)) o.kursiyerler = kursiyerleriIsle(v.kursiyerler); else if (v.kursiyerler && v.kursiyerler.hata) o.kursiyerHata = v.kursiyerler.hata;
  if (v.personel && v.personel.satirlar) o.personel = personeliIsle(v.personel);
  if (v.araclar && (v.araclar.arac || v.araclar.simulator)) o.araclar = araclariIsle(v.araclar);
  if (v.sinavlar && (v.sinavlar.uygulama || v.sinavlar.esinav)) o.sinavlar = v.sinavlar;
  if (Array.isArray(v.dosya)) o.dosya = dosyalariIsle(v.dosya);
  // yalnız yazma yapılan işte "veri aldı" kaydı düşmez (B10)
  if (Object.keys(v).filter(k => k !== 'denetim').length) { S.mebCekim = { ...(S.mebCekim || {}), toplu: gun(0) + ' ' + new Date().toTimeString().slice(0, 5) }; if (!tekrar) islem('MEBBİS’ten toplu veri aldı', Object.keys(o).join(', ')); }
  kaydet();
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
  const ok = yazilan.filter(x => x.ok).length, hata = yazilan.filter(x => !x.ok), kontrol = yazilan.filter(x => x.ok && x.dogrulama === 'mesaj').length;
  const satir = (b, a) => `<li style="display:flex;gap:10px;align-items:flex-start">${isaret('tamam', 18)}<div><b style="color:var(--murekkep)">${b}</b>${a ? `<small style="display:block;color:var(--soluk)">${a}</small>` : ''}</div></li>`;
  const l = [];
  if (yazilan.length) l.push(satir(`${ok} iş MEBBİS’e girildi${kontrol ? `; ${kontrol} tanesini MEBBİS’te kontrol edin (yalnız MEBBİS mesajı görüldü)` : ' ve doğrulandı'}`, hata.length ? `<span style="color:var(--kirmizi);font-weight:700">${hata.length} iş girilemedi</span>: ${hata.slice(0, 4).map(x => e(MK.maskele(x.not))).join(' · ')}` : ''));
  if (yazilan.length) l.push(`<li style="font-size:13px;color:var(--soluk)">Her kaydın sonucu işlem kaydına yazıldı (Ayarlar › Güvenlik › İşlem geçmişi).</li>`);
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
      const y = d.querySelector('[data-al-yok]'); if (y) y.addEventListener('click', () => { const x = o.kursiyerler.yok; kapatPencere(); import('./sayfalar5.js?v=214').then(m => { location.hash = '#/ayarlar/aktarim'; setTimeout(() => m.aktarimYukle([x[0].baslik, ...x.map(z => z.satir)], 'kursiyer', 'MEBBİS'), 300); }); });
      const s = d.querySelector('[data-sonuc]'); if (s) s.addEventListener('click', () => { kapatPencere(); EK.sinavSonucuAl(sinavTablosu(o.sinavlar)); });
    },
  });
  yenile();
}

/* ---------- MEBBİS aktarım merkezindeki kartlar ---------- */
const secim = new Set(['gruplar', 'kursiyerler', 'dosya', 'personel', 'araclar', 'sinavlar']);
// Süren, durmuş ya da parçası bitmiş yazma işi: onaylayan, parça, kalan iş; durdur, devam, iptal
// cekGizle: "MEBBİS'ten al" sekmesinde çekme işinin durumu topluKart'ta zaten görünür
export function isKarti(cekGizle) {
  const m0 = S.mebIs, m = m0 && !['bitti', 'iptal'].includes(m0.durum) ? m0 : null, calis = m ? buIsSuruyor(m) : suruyor();
  // Yardımcı'da bu yazma işinden başka bir iş (ör. MEBBİS'ten güncelle) sürüyorsa: kısa "çalışıyor" kartı (MEBBİS'ten al sekmesinde topluKart gösterir)
  const baska = !cekGizle && suruyor() && !(m && calis) ? `<div class="kart" style="margin-bottom:14px;border-color:var(--levha)"><div class="kart-govde"><p class="ipucu">${isaret('bilgi', 18)}<span><b>MEBBİS’te çalışıyor:</b> ${e(durum.adim || 'başlıyor')}. MEBBİS sekmesini kapatmayın; bitince sonuç burada açılır.</span></p>${durum.olcum ? `<small style="display:block;color:var(--soluk);margin-top:6px" data-mt-olcum>${e(durum.olcum)}</small>` : ''}<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">${yeniSurum() ? '<button class="dg dg-cizgi dg-kucuk" data-mt-durdur>Durdur</button>' : ''}<button class="dg dg-cizgi dg-kucuk" data-toplu-iptal>İşi iptal et</button></div></div></div>` : '';
  if (!m) return baska;
  const pn = m.parcalar.length, kalan = kalanIds(m.no).length, yasli = Date.now() - new Date(m.onay.zaman).getTime() > 24 * 3600e3;
  const DURUM = { calisiyor: ['Çalışıyor', 'mavi'], 'parca-bitti': [`Parça ${m.no + 1}/${pn} bitti`, 'yesil'], oturum: ['MEBBİS oturumu kapandı', 'uyari'], durdu: ['Durdu', 'kirmizi'], durduruldu: ['Durduruldu', 'uyari'], kurum: ['Kurum uyuşmazlığı', 'kirmizi'] };
  const sessiz = !calis && m.durum === 'calisiyor';
  const [dt, dr] = calis ? DURUM.calisiyor : sessiz ? ['Yanıt yok', 'uyari'] : DURUM[m.durum] || ['Yarım kaldı', 'uyari'];
  const aciklama = calis ? `${e(durum.adim || 'başlıyor')}. MEBBİS sekmesini kapatmayın; MEBBİS’te başka işlem yapabilirsiniz.`
    : sessiz ? 'Yardımcı birkaç dakikadır ilerleme bildirmedi. Önce MEBBİS sekmesine bakın: iş sürüyorsa bekleyin, durduysa kaldığı yerden devam edin.'
    : m.durum === 'parca-bitti' ? 'Sonraki parçadan önce MEBBİS’ten çıkıp yeniden girin (oturum yaklaşık 40 dakikada kapanabiliyor), sonra sonraki parçayı başlatın.'
    : m.durum === 'oturum' ? 'MEBBİS’e yeniden girin; Yardımcı kaldığı yerden sürer. Sürmezse “Kaldığı yerden devam et”e basın.'
    : m.durum === 'kurum' ? `${m.not ? e(m.not) + ' ' : ''}MEBBİS’ten çıkıp bu işin kurumunun (kurum kodu ${e(m.onay.kurum || '—')}) hesabıyla girin, sonra “Kaldığı yerden devam et”e basın.`
    : `${m.not ? e(m.not) + '. ' : ''}Yazılmış işler yeniden yazılmaz; kalanlar için “Kaldığı yerden devam et”e basın.`;
  return `<div class="kart" style="margin-bottom:14px;border-color:${calis ? 'var(--levha)' : 'var(--sari)'}"><div class="kart-govde" style="display:grid;gap:8px">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font-family:var(--baslik);font-size:17px;color:var(--murekkep);flex:1;min-width:200px">MEBBİS’e yazma işi${pn > 1 ? ` · parça ${m.no + 1}/${pn}` : ''}</b>${rozet(dt, dr)}</div>
    <p style="font-size:14px;color:var(--metin);margin:0">${aciklama}</p>
    <small style="color:var(--soluk)">${kalan} iş kaldı · onaylayan ${e(m.onay.kim)} (${e(MK.rolAdi(m.onay.rol))}), ${MK.zamanMetni(m.onay.zaman)}${yasli && !calis ? ' · onay 24 saatten eski, devamda yeniden onay istenir' : ''}</small>
    ${durum.olcum && String(durum.id || '').startsWith(m.id) ? `<small style="color:var(--soluk)" data-mt-olcum>${e(durum.olcum)}</small>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap">${calis ? (yeniSurum() ? '<button class="dg dg-cizgi dg-kucuk" data-mt-durdur>Durdur</button>' : '') : kalan ? `<button class="dg dg-ana dg-kucuk" data-mt-devam="${m.durum === 'parca-bitti' ? 'sonraki' : 'ayni'}">${ik('ok')}${m.durum === 'parca-bitti' ? 'Sonraki parçayı başlat' : 'Kaldığı yerden devam et'}</button>` : ''}<button class="dg dg-cizgi dg-kucuk" data-mt-iptal>${calis ? 'İşi iptal et' : 'Kalanı iptal et'}</button></div>
  </div></div>` + baska;
}
export function topluKart(engel) {
  const z = (S.mebCekim || {}).toplu;
  return `<div class="kart" style="margin-bottom:14px"><div class="kart-bas"><h3>MEBBİS’ten güncelle</h3><small>Ekran açmadan, tek düğmeyle; kursun kendi MEBBİS oturumunda${z ? ' · son: ' + tarih(z.slice(0, 10)) + ' ' + z.slice(11, 16) : ''}</small></div>
    <div class="kart-govde">${suruyor() ? `<p class="ipucu">${isaret('bilgi', 18)}<span><b>MEBBİS’te çalışıyor:</b> ${e(durum.adim || 'başlıyor')}. MEBBİS sekmesini kapatmayın; bitince sonuç burada açılır.</span></p>${durum.olcum ? `<small style="display:block;color:var(--soluk);margin-top:6px" data-mt-olcum>${e(durum.olcum)}</small>` : ''}<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">${yeniSurum() ? '<button class="dg dg-cizgi dg-kucuk" data-mt-durdur>Durdur</button>' : ''}<button class="dg dg-cizgi dg-kucuk" data-toplu-iptal>İşi iptal et</button></div>` : `
      <div class="secim" style="margin-bottom:12px">${CEKILECEK.map(([k, ad, a]) => `<label title="${e(a)}"><input type="checkbox" data-toplu-sec="${k}" ${secim.has(k) ? 'checked' : ''}><span>${ad}</span></label>`).join('')}</div>
      <button class="dg dg-ana" data-toplu-cek ${engel || !secim.size ? 'disabled' : ''}>${ik('indir')}MEBBİS’ten güncelle</button>
      <small style="display:block;color:var(--soluk);margin-top:8px">Her bilgi MEBBİS’teki doğru ekrandan okunur (ör. kursiyerler her öğrenci durumu için ayrı). Hiçbir şey MEBBİS’e yazılmaz. Aday dosyaları kursiyer sayısına göre birkaç dakika sürer.</small>`}</div></div>`;
}
// Yardımcı 1.12 yeni işi reddederse (yarım iş var): devam et ya da iptal edip yenisini başlat
export function mesgulGeldi(v) {
  if (!v || !v.mesgul) return;
  // reddedilen iş bu sekmenin az önce gönderdiğidir: "gönderildi" işaretleri geri alınır, iş kartı "durdu" olur (hiçbir şey MEBBİS'e gitmedi)
  const red = v.reddedilen || durum.gonderilen || '', m = S.mebIs;
  if (red && red !== v.id) {
    Object.entries(S.mebDurum || {}).forEach(([id, x]) => { if (x && x.durum === 'gonderildi' && x.is === red) delete S.mebDurum[id]; });
    if (m && String(red).startsWith(m.id) && !['bitti', 'iptal'].includes(m.durum)) { m.durum = 'durdu'; m.not = 'Yardımcı’da yarım kalan başka bir iş vardı; bu parça gönderilmedi'; }
    kaydet();
  }
  durum.calisiyor = false; durum.mesgul = v; durum.id = v.id || durum.id;
  pencere({
    baslik: 'MEBBİS’te yarım kalan bir iş var',
    icerik: `<p style="font-size:14.5px">Yardımcı’da bitmemiş bir iş duruyor${v.kalan != null ? ` (<b>${+v.kalan || 0} iş</b> kaldı)` : ''}. Yeni iş onun üstüne yazılmadı; hiçbir şey gönderilmedi.</p><p style="font-size:14px;color:var(--soluk);margin-top:8px">Önce yarım işi bitirin ya da iptal edin. Yeni iş MEBBİS aktarımı ekranında “Kaldığı yerden devam et” ile sonra başlatılır.</p>`,
    altlik: `<button class="dg dg-cizgi" data-mt-mesgul-iptal>Yarım işi iptal et</button><button class="dg dg-ana" data-mt-mesgul-devam>${ik('ok')}Yarım işe devam et</button>`,
    onAc(d) {
      d.querySelector('[data-mt-mesgul-iptal]').addEventListener('click', () => {
        kapatPencere(); gonder('toplu-iptal', { id: v.id }); islem('MEBBİS’te yarım kalan işi iptal etti', 'İş ' + (v.id || '—'));
        if (m && String(v.id || '').startsWith(m.id) && !['bitti', 'iptal'].includes(m.durum)) { m.durum = 'durdu'; m.not = 'Yarım kalan parça iptal edildi'; kaydet(); }
        bildir('Yarım iş iptal edildi. Yeni işi MEBBİS aktarımı ekranından başlatın.'); yenile();
      });
      d.querySelector('[data-mt-mesgul-devam]').addEventListener('click', () => { kapatPencere(); gonder('toplu-devam', { id: v.id }); durum.calisiyor = true; durum.sonIlerleme = Date.now(); bildir('Yarım işe devam ediliyor; MEBBİS sekmesine geçin'); yenile(); });
    },
  });
}
export function topluBaglan(k, yenileFn) {
  k.addEventListener('change', ev => { const c = ev.target.closest('[data-toplu-sec]'); if (c) { c.checked ? secim.add(c.dataset.topluSec) : secim.delete(c.dataset.topluSec); yenileFn(); } });
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-toplu-cek]')) return topluCek([...secim]);
    if (ev.target.closest('[data-toplu-iptal]')) { cekIptal(); return yenileFn(); }
    if (ev.target.closest('[data-mt-iptal]')) { isIptal(); return yenileFn(); }
    if (ev.target.closest('[data-mt-durdur]')) { isDurdur(); return yenileFn(); }
    const dv = ev.target.closest('[data-mt-devam]'); if (dv) { devamEt(dv.dataset.mtDevam === 'sonraki'); return; }
    if (ev.target.closest('[data-mk-alarm-gizle]')) { MK.alarmGizle(); return yenileFn(); }
    if (ev.target.closest('[data-mt-denetle]')) return ekranDenetle();
    if (ev.target.closest('[data-mt-denetim-goster]')) return MK.denetimPenceresi();
  });
}
