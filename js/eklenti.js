// mdSinyal MEBBİS Yardımcısı (Chrome eklentisi) ile konuşma: eklenti kurulu mu, MEBBİS’e yazılacak işleri sıraya koy,
// MEBBİS’ten gelen listeyi aktarım ekranına ver, MEBBİS’te kaydedilen işleri mdSinyal’de işlendi olarak işaretle.
import { S, kaydet, gun, iso, fark, tamAd, islem, SINIFLAR, egitmen, arac, kursiyer, eksikEvrak, sb, sbDers, sbSinav, oturum, cokSube, seciliSube } from './veri.js?v=197';
import { bildir, pencere, e, ik, isaret } from './ui.js?v=197';

export const eklenti = { var: false, surum: null };
const sayfadan = (tur, veri) => window.postMessage({ kaynak: 'sinyal-sayfa', tur, veri }, location.origin);
let yenileFn = () => { };
export const eklentiYenile = f => { yenileFn = f; };
export const EKLENTI_ZIP = 'eklenti/mdsinyal-mebbis.zip';

const tr = t => t ? String(t).slice(0, 10).split('-').reverse().join('.') : '';
const tel = t => { const d = String(t || '').replace(/\D/g, '').replace(/^90/, ''); return d.length === 10 ? '0' + d : d.length === 11 ? d : String(t || ''); };
const adSoy = ad => { const p = String(ad || '').trim().split(/\s+/); return [p.slice(0, -1).join(' ') || p[0] || '', p.length > 1 ? p[p.length - 1] : '']; };
const alan = (etiket, deger, es = []) => deger == null || deger === '' ? null : { etiket, deger: String(deger), es };
const TC = ['T.C. Kimlik No', ['tc', 'tckimlikno', 'kimlikno', 'tckn', 'tcno', 'tckimliknumarasi']];

// Son gün hesabı: panel işleri en acilden başlayarak sıralar
const gunEkle = (t, n) => { const d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const isGunuGeri = (t, n) => { const d = new Date(t + 'T12:00:00'); while (n > 0) { d.setDate(d.getDate() - 1); if (d.getDay() % 6) n--; } return iso(d); };
// MEBBİS’e yazılacak işler; her alanın etiketi MEBBİS formundaki etiketle eşleşir (eş anlamlılar es’te)
// hepsi: aktarılmış olanlar da (bitti: true) gelir; aktarım merkezindeki 'Aktarılanlar' için
// meta: aktarım merkezinde filtre ve tablo için (ad, sınıf, öğretmen, tarih, detay)
export function mebIsleri(hepsi) {
  const isler = [];
  sb(S.kursiyerler).filter(k => !k.kapali && !eksikEvrak(k).length && (!k.mebIslendi || (hepsi && fark(k.kayit) >= -90))).forEach(k => {
    const n = k.nufus || {}, S0 = SINIFLAR[k.sinif] || {};
    const ilk = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı').map(d => d.tarih).sort()[0];
    isler.push({ id: 'kayit-' + k.id, tur: 'kayit', ref: { kursiyer: k.id }, bitti: !!k.mebIslendi, meta: { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: k.kayit, detay: (SINIFLAR[k.sinif] || {}).ad || k.sinif }, son: ilk ? gunEkle(ilk, -(S.kurs.programOnGun || 5)) : gun(3), neden: ilk ? 'İlk dersinden önce' : 'Kayıttan sonra', baslik: tamAd(k), alanlar: [
      alan(TC[0], k.tc, TC[1]), alan('Adı', k.ad, ['ad', 'adi']), alan('Soyadı', k.soyad, ['soyad', 'soyadi']), alan('Baba Adı', n.baba, ['babaadi']), alan('Ana Adı', n.ana, ['anaadi', 'anneadi']),
      alan('Doğum Yeri', n.dogumYeri, ['dogumyeri']), alan('Doğum Tarihi', tr(k.dogumTarihi), ['dogumtarihi']), alan('Cinsiyeti', k.cinsiyet, ['cinsiyet']), alan('Öğrenim Durumu', k.ogrenim, ['ogrenim', 'ogrenimdurumu', 'egitimdurumu']),
      alan('Cep Telefonu', tel(k.tel), ['telefon', 'ceptelefonu', 'gsm', 'tel']), alan('Adres', k.adres, ['adres', 'ikametadresi']), alan('Sertifika Sınıfı', String(S0.ad || k.sinif).split(' ·')[0], ['sinif', 'sertifikasinifi', 'surucubelgesisinifi', 'kurssinifi']),
      alan('Kayıt Tarihi', tr(k.kayit), ['kayittarihi']), alan('Eğitim Ücreti', k.odeme && (k.odeme.sozlesme || k.odeme.toplam), ['ucret', 'egitimucreti', 'kursucreti']),
    ].filter(Boolean) });
  });
  sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && ((fark(d.tarih) >= 0 && !d.meb) || (hepsi && d.meb && fark(d.tarih) >= -14))).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(d => {
    const k = kursiyer(d.kursiyer); if (!k) return; const eg = egitmen(d.egitmen) || {}, ar = arac(d.arac) || {};
    isler.push({ id: 'ders-' + d.id, tur: 'program', ref: { ders: d.id }, bitti: !!d.meb, meta: { ad: tamAd(k), sinif: k.sinif, egitmen: d.egitmen, tarih: d.tarih, detay: `${d.mebDegisti ? 'DEĞİŞTİ (MEBBİS’teki eski kayıt: ' + d.mebDegisti.eski + ') · ' : ''}${tr(d.tarih)} ${d.saat} · ${eg.ad || ''} · ${ar.plaka || ''}` }, son: gunEkle(d.tarih, -(S.kurs.programOnGun || 5)), neden: `Dersten ${S.kurs.programOnGun || 5} gün önce`, baslik: `${tamAd(k)} · ${tr(d.tarih)} ${d.saat}`, alanlar: [
      alan('Tarih', tr(d.tarih), ['derstarihi', 'tarih', 'egitimtarihi']), alan('Saat', d.saat, ['dersaati', 'baslangicsaati', 'saat']), alan(TC[0], k.tc, TC[1]), alan('Kursiyer', tamAd(k), ['kursiyer', 'kursiyeradi', 'adisoyadi']),
      alan('Usta Öğretici', eg.ad, ['ustaogretici', 'ogretici', 'egitici', 'personel']), alan('Araç Plakası', ar.plaka, ['plaka', 'aracplakasi', 'arac']),
    ].filter(Boolean) });
  });
  sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= (hepsi ? -14 : 0)).forEach(s => (s.kursiyerler || []).map(kursiyer).filter(Boolean).filter(k => (s.mebKisi || []).includes(k.id) ? hepsi : (!s.mebBildirim && fark(s.tarih) >= 0)).forEach(k => {
    const d = S.dersler.filter(x => x.kursiyer === k.id && x.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0], ar = arac(d && d.arac) || {}, eg = egitmen(k.egitmen) || {};
    isler.push({ id: 'sinav-' + s.id + '-' + k.id, tur: 'sinav', ref: { sinav: s.id, kursiyer: k.id }, bitti: (s.mebKisi || []).includes(k.id), meta: { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: s.tarih, detay: `${tr(s.tarih)} ${s.saat || ''} · ${s.yer || ''}` }, son: isGunuGeri(s.tarih, 4), neden: 'Sınavdan 4 iş günü önce', baslik: `${tamAd(k)} · ${tr(s.tarih)} sınavı`, alanlar: [
      alan('Sınav Tarihi', tr(s.tarih), ['sinavtarihi', 'tarih']), alan(TC[0], k.tc, TC[1]), alan('Kursiyer', tamAd(k), ['kursiyer', 'adisoyadi']), alan('Araç Plakası', ar.plaka, ['plaka', 'aracplakasi', 'sinavaraci']), alan('Usta Öğretici', eg.ad, ['ustaogretici', 'ogretici']),
    ].filter(Boolean) });
  }));
  // eğitim ücreti tahsilatları MEBBİS’e işlenir (Özel Öğretim Kurumları Yönetmeliği m.55/3)
  (S.hareket || []).filter(h => h.tur === 'Gelir' && h.kursiyer && ['Kurs ücreti', 'Taksit'].includes(h.kategori) && (!h.meb || hepsi) && fark(h.tarih) >= -60).forEach(h => {
    const k = kursiyer(h.kursiyer); if (!k) return;
    isler.push({ id: 'odeme-' + h.id, tur: 'odeme', ref: { hareket: h.id }, bitti: !!h.meb, meta: { ad: tamAd(k), sinif: k.sinif, egitmen: k.egitmen, tarih: h.tarih, detay: `${h.tutar} ₺ · ${tr(h.tarih)} · ${h.yontem || ''}` }, neden: 'Tahsilat kaydı (süre sınırı yok)', baslik: `${tamAd(k)} · ${h.tutar} ₺ · ${tr(h.tarih)}`, alanlar: [
      alan(TC[0], k.tc, TC[1]), alan('Ödeme Tarihi', tr(h.tarih), ['odemetarihi', 'tarih', 'tahsilattarihi']), alan('Tutar', h.tutar, ['tutar', 'odemetutari', 'miktar']), alan('Ödeme Şekli', h.yontem === 'Havale' ? 'Havale/EFT' : h.yontem, ['odemesekli', 'odemeturu']), alan('Makbuz / Dekont No', h.no, ['makbuzno', 'dekontno', 'belgeno', 'aciklama']),
    ].filter(Boolean) });
  });
  return isler;
}

// Seçilen işleri (ya da hepsini) Yardımcı'ya gönderir; Yardımcı MEBBİS sekmesine geçip sırayla kendisi yürütür
// S.mebDurum[id]: { durum: 'gonderildi' | 'hata', zaman, not }; aktarılınca silinir (iş 'bitti' olur)
export function yardimciyaGonder(idler) {
  if (!eklenti.var) return kurulumPenceresi();
  // birden çok şubede her şubenin MEBBİS hesabı ayrıdır: şube seçilmeden işler tek hesaba gönderilmez
  if (cokSube() && !seciliSube()) return bildir('Önce üstten şube seçin; her şubenin işleri kendi MEBBİS hesabına girilir', 'uyari');
  const hepsi = mebIsleri(), isler = idler ? hepsi.filter(x => idler.includes(x.id)) : hepsi;
  if (!isler.length) return bildir('MEBBİS’e aktarılacak iş yok');
  sayfadan('kuyruk', { isler, kurs: S.kurs.ad, oto: true });
  S.mebDurum = S.mebDurum || {}; const z = Date.now(); isler.forEach(x => { S.mebDurum[x.id] = { durum: 'gonderildi', zaman: z }; });
  islem('MEBBİS’e aktarım başlattı', isler.length + ' iş'); kaydet(); yenileFn();
  bildir(`${isler.length} iş MEBBİS’e aktarılıyor. MEBBİS sekmesi açılıyor; girmediyseniz kendi şifrenizle girin, Yardımcı sırayla yürütür.`);
}

// MEBBİS'ten veri çek: Yardımcı MEBBİS sekmesine geçer, ilgili listeyi kendisi açar ve mdSinyal'e gönderir
const CEK_AD = { kursiyer: 'kursiyer listesini', sinav: 'sınav sonuçlarını', mutabakat: 'kursiyer listesini karşılaştırma için', taksit: 'ödemeleri', ogretmen: 'usta öğretici listesini', arac: 'araç listesini' };
export function mebbistenCek(amac) {
  if (!eklenti.var) return kurulumPenceresi();
  sayfadan('cek', { amac });
  islem('MEBBİS’ten veri istedi', amac);
  bildir(`MEBBİS sekmesine geçiliyor. Yardımcı ${CEK_AD[amac] || 'listeyi'} kendisi açıp buraya getirecek; MEBBİS’e girmediyseniz önce kendi şifrenizle girin.`);
}
export function kurulumPenceresi() {
  pencere({
    baslik: 'mdSinyal MEBBİS Yardımcısı', genis: true,
    icerik: `${eklenti.var ? `<p class="ipucu" style="margin-bottom:12px">${isaret('tamam', 20)}<span>Yardımcı bu tarayıcıda kurulu (sürüm ${e(eklenti.surum)}).</span></p>` : ''}
      <p style="font-size:14.5px">Chrome’a eklenen küçük bir yardımcı. Kursun kendi MEBBİS oturumunda çalışır: MEBBİS’e siz girersiniz, şifrenizi istemez ve saklamaz.</p>
      <ul class="liste" style="margin:8px 0">${[['MEBBİS’e bilgi gir', 'Kayıt, direksiyon programı, sınav bildirimi ve tahsilatlar türlerine göre sıraya girer. Türü seçin, MEBBİS’te formu açın, “Formu doldur”a basın; Kaydet’e siz basarsınız, Yardımcı sıradakini açar.'], ['MEBBİS’ten mdSinyal’e al', 'Kursiyer, ödeme, öğretmen ve araç listeleri; sınav sonuçları ve MEBBİS ile karşılaştırma. MEBBİS’te listeyi açıp “Listeyi mdSinyal’e gönder”e basın; mdSinyal’de kontrol edip kaydedersiniz.'], ['MEBBİS ekranı değişirse', 'Yardımcı alanları etiketlerinden bulur; bulamadığı alanı bir kez gösterirsiniz, sonra kendisi bulur.']].map(([a, b]) => `<li style="align-items:flex-start">${isaret('bilgi', 20)}<div><b style="color:var(--murekkep)">${a}</b><small style="display:block;color:var(--metin);font-size:13.5px">${b}</small></div></li>`).join('')}</ul>
      <h4 style="margin-top:10px">Kurulum (bir kez, kurs bilgisayarında)</h4>
      <ol style="padding-left:18px;display:grid;gap:8px;font-size:14px;margin-top:6px"><li><a href="${EKLENTI_ZIP}" download style="color:var(--levha);font-weight:700">Yardımcıyı indirin</a> ve zip dosyasını bir klasöre açın.</li><li>Chrome’da adres çubuğuna <b>chrome://extensions</b> yazın, sağ üstten <b>Geliştirici modu</b>nu açın.</li><li><b>Paketlenmemiş öğe yükle</b>’ye basıp açtığınız klasörü seçin.</li><li>mdSinyal sayfasını yenileyin; bu pencerede “kurulu” yazısı görünür.</li></ol>
      <p class="og-not" style="margin-top:10px">Chrome Web Mağazası’ndaki sürüm onaylanınca tek tıkla kurulacak.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${eklenti.var ? '<button class="dg dg-ana" data-eklenti-gonder>İşleri gönder</button>' : ''}`,
    onAc(d) { const b = d.querySelector('[data-eklenti-gonder]'); if (b) b.addEventListener('click', () => { d.querySelector('[data-kapat]').click(); yardimciyaGonder(); }); },
  });
}

// MEBBİS listesinin türü başlıklardan tahmin edilir; kullanıcı aktarım ekranında değiştirebilir
const turTahmin = b => { const n = b.join(' ').toLocaleLowerCase('tr'); return /plaka/.test(n) ? 'arac' : /(usta|öğretici|personel|branş|görev)/.test(n) && !/kursiyer/.test(n) ? 'ogretmen' : 'kursiyer'; };
function bitenleriIsle(l) {
  if (!S || !S.kursiyerler || !oturum.kullanici) return;  // veri henüz yüklenmedi: eklentide kalır, sonra yeniden sorulur
  let n = 0;
  l.forEach(b => {
    const r = b.ref || {};
    if (b.tur === 'kayit') { const k = kursiyer(r.kursiyer); if (k && !k.mebIslendi) { k.mebIslendi = true; n++; } }
    if (b.tur === 'program') { const d = S.dersler.find(x => x.id === r.ders); if (d && !d.meb) { d.meb = true; delete d.mebDegisti; n++; } }
    if (b.tur === 'sinav') { const s = S.sinavlar.find(x => x.id === r.sinav); if (s) { s.mebKisi = [...new Set([...(s.mebKisi || []), r.kursiyer])]; if ((s.kursiyerler || []).every(x => s.mebKisi.includes(x))) s.mebBildirim = true; n++; } }
    if (b.tur === 'odeme') { const h = (S.hareket || []).find(x => x.id === r.hareket); if (h && !h.meb) { h.meb = gun(0); n++; } }
  });
  if (S.mebDurum) l.forEach(b => { delete S.mebDurum[b.id]; });
  window.postMessage({ kaynak: 'sinyal-sayfa', tur: 'bitenler-onay', veri: { ids: l.map(b => b.id) } }, location.origin);
  if (n) { islem('MEBBİS’e girildi (Yardımcı)', n + ' iş'); kaydet(); bildir(n + ' iş MEBBİS’e aktarıldı'); yenileFn(); }
}
// Yardımcı MEBBİS'te hata gördüğü işleri bildirir; aktarım merkezinde "Hata" olarak görünür
function hatalariIsle(l) {
  S.mebDurum = S.mebDurum || {};
  l.forEach(h => { S.mebDurum[h.id] = { durum: 'hata', zaman: h.zaman || Date.now(), not: h.not || '' }; });
  if (l.length) { kaydet(); bildir(`${l.length} iş MEBBİS’te hata verdi; MEB işlemleri › MEBBİS aktarımı ekranında görebilirsiniz`, 'uyari'); yenileFn(); }
}
// MEBBİS'ten gelen liste: amacına göre aktarım, karşılaştırma ya da sınav sonucu ekranına gider
function tabloGeldi(veri) {
  const sat = veri.satirlar, n = sat.length - 1;
  S.mebCekim = { ...(S.mebCekim || {}), [veri.amac || 'liste']: gun(0) + ' ' + new Date().toTimeString().slice(0, 5) }; kaydet();
  if (veri.amac === 'mutabakat') return import('./ozellik.js?v=197').then(m => { if (m.mutabakatTablodan(sat, 'MEBBİS · ' + (veri.baslik || 'liste'))) { location.hash = '#/meb/mutabakat'; yenileFn(); } });
  if (veri.amac === 'sinav') return sinavSonucuAl(sat);
  const t = ['kursiyer', 'taksit', 'arac', 'ogretmen'].includes(veri.amac) ? veri.amac : turTahmin(sat[0] || []);
  import('./sayfalar5.js?v=197').then(m => { location.hash = '#/ayarlar/aktarim'; setTimeout(() => { m.aktarimYukle(sat, t, 'MEBBİS'); bildir(`MEBBİS’ten ${n} satırlık liste geldi; sütunları kontrol edip aktarın`); }, 300); });
}
// Sınav sonuç listesi: TC ile kursiyer bulunur, en uygun oturumun sonuç penceresi dolu açılır; kaydetmeyi kullanıcı yapar
const nrm = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
function sinavSonucuAl(sat) {
  const bas = sat[0].map(nrm), bul = (...l) => bas.findIndex(h => l.some(x => h.includes(x)));
  const iTc = bul('tc', 'kimlik'), iSon = bul('sonuc', 'durum', 'basari', 'netice'), iPuan = bul('puan', 'notu'), iTar = bul('tarih');
  if (iTc < 0) return bildir('Listede TC kimlik numarası sütunu bulunamadı', 'uyari');
  if (iSon < 0 && iPuan < 0) return bildir('Listede sonuç ya da puan sütunu bulunamadı', 'uyari');
  const deger = (r) => {
    const v = nrm(iSon >= 0 ? r[iSon] : ''), p = iPuan >= 0 && String(r[iPuan]).trim() !== '' && !isNaN(+String(r[iPuan]).replace(',', '.')) ? Math.round(+String(r[iPuan]).replace(',', '.')) : null;
    if (/girmedi|gelmedi|katilmadi|devamsiz/.test(v)) return { v: 'Girmedi' };
    if (/basarisiz|kaldi|gecmedi|olumsuz/.test(v)) return { v: 'Kaldı', puan: p };
    if (/basarili|gecti|olumlu|gecer/.test(v)) return { v: 'Geçti', puan: p };
    return p != null ? { v: p >= 70 ? 'Geçti' : 'Kaldı', puan: p } : null;
  };
  const tarihIso = v => { const m = String(v || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
  const oturum = {}; let bulunamayan = 0;
  sat.slice(1).forEach(r => {
    const tc = String(r[iTc] || '').replace(/\D/g, ''), k = tc && S.kursiyerler.find(x => x.tc === tc), d = deger(r); if (!k || !d) { bulunamayan++; return; }
    const t = iTar >= 0 ? tarihIso(r[iTar]) : '';
    const s = sbSinav(S.sinavlar).filter(x => (x.kursiyerler || []).includes(k.id) && !(x.sonuc || {})[k.id] && fark(x.tarih) <= 0 && (!t || x.tarih === t)).sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
    if (!s) { bulunamayan++; return; }
    (oturum[s.id] = oturum[s.id] || {})[k.id] = d;
  });
  const sira = Object.entries(oturum).sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length);
  if (!sira.length) return bildir('Listedeki kişilerden sonucu girilmemiş bir sınav oturumunda olan bulunamadı', 'uyari');
  const [sid, hazir] = sira[0], s = S.sinavlar.find(x => x.id === sid);
  location.hash = '#/sinavlar';
  import('./sayfalar2.js?v=197').then(m => setTimeout(() => {
    m.sonucGir(s, hazir);
    bildir(`${Object.keys(hazir).length} kursiyerin sonucu MEBBİS’ten dolduruldu; kontrol edip “Sonuçları kaydet”e basın.${sira.length > 1 ? ` ${sira.length - 1} oturum daha var; kaydettikten sonra listeyi tekrar gönderin.` : ''}${bulunamayan ? ` ${bulunamayan} satır eşleşmedi.` : ''}`);
  }, 400));
}
export function eklentiBaslat() {
  window.addEventListener('message', ev => {
    if (ev.source !== window || ev.origin !== location.origin || !ev.data || ev.data.kaynak !== 'sinyal-eklenti') return;
    const { tur, veri } = ev.data;
    if (tur === 'merhaba') { const ilk = !eklenti.var; Object.assign(eklenti, { var: true, surum: veri && veri.surum }); if (ilk) yenileFn(); }
    if (tur === 'tablo' && veri && veri.satirlar) tabloGeldi(veri);
    if (tur === 'bitenler' && Array.isArray(veri)) bitenleriIsle(veri);
    if (tur === 'hatalar' && Array.isArray(veri)) hatalariIsle(veri);
  });
  sayfadan('ping', {});
  setTimeout(() => sayfadan('ping', {}), 1500);
  document.addEventListener('click', ev => {
    const g = ev.target.closest('[data-meb-gonder]'); if (g) { ev.preventDefault(); ev.stopPropagation(); return yardimciyaGonder(g.dataset.mebGonder.split(',').filter(Boolean)); }
    const c = ev.target.closest('[data-meb-cekbtn]'); if (c) { ev.preventDefault(); ev.stopPropagation(); return mebbistenCek(c.dataset.mebCekbtn); }
  }, true);
}
