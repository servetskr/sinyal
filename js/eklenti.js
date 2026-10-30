// Sinyal MEBBİS Yardımcısı (Chrome eklentisi) ile konuşma: eklenti kurulu mu, MEBBİS’e yazılacak işleri sıraya koy,
// MEBBİS’ten gelen listeyi aktarım ekranına ver, MEBBİS’te kaydedilen işleri Sinyal’de işlendi olarak işaretle.
import { S, kaydet, gun, fark, tamAd, islem, SINIFLAR, egitmen, arac, kursiyer, eksikEvrak, sb, sbDers, sbSinav } from './veri.js?v=102';
import { bildir, pencere, e, ik, isaret } from './ui.js?v=102';

export const eklenti = { var: false, surum: null };
const sayfadan = (tur, veri) => window.postMessage({ kaynak: 'sinyal-sayfa', tur, veri }, location.origin);
let yenileFn = () => { };
export const eklentiYenile = f => { yenileFn = f; };
export const EKLENTI_ZIP = 'eklenti/sinyal-mebbis.zip';

const tr = t => t ? String(t).slice(0, 10).split('-').reverse().join('.') : '';
const tel = t => { const d = String(t || '').replace(/\D/g, '').replace(/^90/, ''); return d.length === 10 ? '0' + d : d.length === 11 ? d : String(t || ''); };
const adSoy = ad => { const p = String(ad || '').trim().split(/\s+/); return [p.slice(0, -1).join(' ') || p[0] || '', p.length > 1 ? p[p.length - 1] : '']; };
const alan = (etiket, deger, es = []) => deger == null || deger === '' ? null : { etiket, deger: String(deger), es };
const TC = ['T.C. Kimlik No', ['tc', 'tckimlikno', 'kimlikno', 'tckn', 'tcno', 'tckimliknumarasi']];

// MEBBİS’e yazılacak işler; her alanın etiketi MEBBİS formundaki etiketle eşleşir (eş anlamlılar es’te)
export function mebIsleri() {
  const isler = [];
  sb(S.kursiyerler).filter(k => !k.mebIslendi && !k.kapali && !eksikEvrak(k).length).forEach(k => {
    const n = k.nufus || {}, S0 = SINIFLAR[k.sinif] || {};
    isler.push({ id: 'kayit-' + k.id, tur: 'kayit', ref: { kursiyer: k.id }, baslik: tamAd(k) + ' · kursiyer kaydı', alanlar: [
      alan(TC[0], k.tc, TC[1]), alan('Adı', k.ad, ['ad', 'adi']), alan('Soyadı', k.soyad, ['soyad', 'soyadi']), alan('Baba Adı', n.baba, ['babaadi']), alan('Ana Adı', n.ana, ['anaadi', 'anneadi']),
      alan('Doğum Yeri', n.dogumYeri, ['dogumyeri']), alan('Doğum Tarihi', tr(k.dogumTarihi), ['dogumtarihi']), alan('Cinsiyeti', k.cinsiyet, ['cinsiyet']), alan('Öğrenim Durumu', k.ogrenim, ['ogrenim', 'ogrenimdurumu', 'egitimdurumu']),
      alan('Cep Telefonu', tel(k.tel), ['telefon', 'ceptelefonu', 'gsm', 'tel']), alan('Adres', k.adres, ['adres', 'ikametadresi']), alan('Sertifika Sınıfı', String(S0.ad || k.sinif).split(' ·')[0], ['sinif', 'sertifikasinifi', 'surucubelgesisinifi', 'kurssinifi']),
      alan('Kayıt Tarihi', tr(k.kayit), ['kayittarihi']), alan('Eğitim Ücreti', k.odeme && (k.odeme.sozlesme || k.odeme.toplam), ['ucret', 'egitimucreti', 'kursucreti']),
    ].filter(Boolean) });
  });
  sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && !d.meb).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(d => {
    const k = kursiyer(d.kursiyer); if (!k) return; const eg = egitmen(d.egitmen) || {}, ar = arac(d.arac) || {};
    isler.push({ id: 'ders-' + d.id, tur: 'program', ref: { ders: d.id }, baslik: `${tr(d.tarih)} ${d.saat} · ${tamAd(k)}`, alanlar: [
      alan('Tarih', tr(d.tarih), ['derstarihi', 'tarih', 'egitimtarihi']), alan('Saat', d.saat, ['dersaati', 'baslangicsaati', 'saat']), alan(TC[0], k.tc, TC[1]), alan('Kursiyer', tamAd(k), ['kursiyer', 'kursiyeradi', 'adisoyadi']),
      alan('Usta Öğretici', eg.ad, ['ustaogretici', 'ogretici', 'egitici', 'personel']), alan('Araç Plakası', ar.plaka, ['plaka', 'aracplakasi', 'arac']),
    ].filter(Boolean) });
  });
  sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && !s.mebBildirim).forEach(s => (s.kursiyerler || []).map(kursiyer).filter(Boolean).filter(k => !(s.mebKisi || []).includes(k.id)).forEach(k => {
    const d = S.dersler.filter(x => x.kursiyer === k.id && x.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0], ar = arac(d && d.arac) || {}, eg = egitmen(k.egitmen) || {};
    isler.push({ id: 'sinav-' + s.id + '-' + k.id, tur: 'sinav', ref: { sinav: s.id, kursiyer: k.id }, baslik: `${tr(s.tarih)} direksiyon sınavı · ${tamAd(k)}`, alanlar: [
      alan('Sınav Tarihi', tr(s.tarih), ['sinavtarihi', 'tarih']), alan(TC[0], k.tc, TC[1]), alan('Kursiyer', tamAd(k), ['kursiyer', 'adisoyadi']), alan('Araç Plakası', ar.plaka, ['plaka', 'aracplakasi', 'sinavaraci']), alan('Usta Öğretici', eg.ad, ['ustaogretici', 'ogretici']),
    ].filter(Boolean) });
  }));
  // eğitim ücreti tahsilatları MEBBİS’e işlenir (Özel Öğretim Kurumları Yönetmeliği m.55/3)
  (S.hareket || []).filter(h => h.tur === 'Gelir' && h.kursiyer && ['Kurs ücreti', 'Taksit'].includes(h.kategori) && !h.meb && fark(h.tarih) >= -60).forEach(h => {
    const k = kursiyer(h.kursiyer); if (!k) return;
    isler.push({ id: 'odeme-' + h.id, tur: 'odeme', ref: { hareket: h.id }, baslik: `${tr(h.tarih)} · ${tamAd(k)} · ${h.tutar} ₺`, alanlar: [
      alan(TC[0], k.tc, TC[1]), alan('Ödeme Tarihi', tr(h.tarih), ['odemetarihi', 'tarih', 'tahsilattarihi']), alan('Tutar', h.tutar, ['tutar', 'odemetutari', 'miktar']), alan('Ödeme Şekli', h.yontem === 'Havale' ? 'Havale/EFT' : h.yontem, ['odemesekli', 'odemeturu']), alan('Makbuz / Dekont No', h.no, ['makbuzno', 'dekontno', 'belgeno', 'aciklama']),
    ].filter(Boolean) });
  });
  return isler;
}

export function yardimciyaGonder() {
  if (!eklenti.var) return kurulumPenceresi();
  const isler = mebIsleri(); if (!isler.length) return bildir('MEBBİS’e yazılacak iş yok');
  sayfadan('kuyruk', { isler, kurs: S.kurs.ad });
  islem('MEBBİS Yardımcısına iş gönderdi', isler.length + ' iş');
  bildir(`${isler.length} iş MEBBİS Yardımcısına gönderildi. MEBBİS’i açın; sağ alttaki panelden sırayla doldurun.`);
}

export function kurulumPenceresi() {
  pencere({
    baslik: 'Sinyal MEBBİS Yardımcısı', genis: true,
    icerik: `${eklenti.var ? `<p class="ipucu" style="margin-bottom:12px">${isaret('tamam', 20)}<span>Yardımcı bu tarayıcıda kurulu (sürüm ${e(eklenti.surum)}).</span></p>` : ''}
      <p style="font-size:14.5px">Chrome’a eklenen küçük bir yardımcı. Kursun kendi MEBBİS oturumunda çalışır: MEBBİS’e siz girersiniz, şifrenizi istemez ve saklamaz.</p>
      <ul class="liste" style="margin:8px 0">${[['Günlük aktarım', 'Sinyal’de girdiğiniz kayıt, direksiyon programı, sınav bildirimi ve tahsilatlar sıraya girer. MEBBİS’te ilgili formu açıp “Formu doldur”a basarsınız; kontrol edip Kaydet’e siz basarsınız.'], ['Geçişte ilk kurulum', 'MEBBİS’te kursiyer, araç ya da personel listesini açıp “Listeyi Sinyal’e aktar”a basın; liste Sinyal’in aktarım ekranına gelir.'], ['MEBBİS ekranı değişirse', 'Yardımcı alanları etiketlerinden bulur; bulamadığı alanı bir kez gösterirsiniz, sonra kendisi bulur.']].map(([a, b]) => `<li style="align-items:flex-start">${isaret('bilgi', 20)}<div><b style="color:var(--murekkep)">${a}</b><small style="display:block;color:var(--metin);font-size:13.5px">${b}</small></div></li>`).join('')}</ul>
      <h4 style="margin-top:10px">Kurulum (bir kez, kurs bilgisayarında)</h4>
      <ol style="padding-left:18px;display:grid;gap:8px;font-size:14px;margin-top:6px"><li><a href="${EKLENTI_ZIP}" download style="color:var(--levha);font-weight:700">Yardımcıyı indirin</a> ve zip dosyasını bir klasöre açın.</li><li>Chrome’da adres çubuğuna <b>chrome://extensions</b> yazın, sağ üstten <b>Geliştirici modu</b>nu açın.</li><li><b>Paketlenmemiş öğe yükle</b>’ye basıp açtığınız klasörü seçin.</li><li>Sinyal sayfasını yenileyin; bu pencerede “kurulu” yazısı görünür.</li></ol>
      <p class="og-not" style="margin-top:10px">Chrome Web Mağazası’ndaki sürüm onaylanınca tek tıkla kurulacak.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${eklenti.var ? '<button class="dg dg-ana" data-eklenti-gonder>İşleri gönder</button>' : ''}`,
    onAc(d) { const b = d.querySelector('[data-eklenti-gonder]'); if (b) b.addEventListener('click', () => { d.querySelector('[data-kapat]').click(); yardimciyaGonder(); }); },
  });
}

// MEBBİS listesinin türü başlıklardan tahmin edilir; kullanıcı aktarım ekranında değiştirebilir
const turTahmin = b => { const n = b.join(' ').toLocaleLowerCase('tr'); return /plaka/.test(n) ? 'arac' : /(usta|öğretici|personel|branş|görev)/.test(n) && !/kursiyer/.test(n) ? 'ogretmen' : 'kursiyer'; };
function bitenleriIsle(l) {
  let n = 0;
  l.forEach(b => {
    const r = b.ref || {};
    if (b.tur === 'kayit') { const k = kursiyer(r.kursiyer); if (k && !k.mebIslendi) { k.mebIslendi = true; n++; } }
    if (b.tur === 'program') { const d = S.dersler.find(x => x.id === r.ders); if (d && !d.meb) { d.meb = true; n++; } }
    if (b.tur === 'sinav') { const s = S.sinavlar.find(x => x.id === r.sinav); if (s) { s.mebKisi = [...new Set([...(s.mebKisi || []), r.kursiyer])]; if ((s.kursiyerler || []).every(x => s.mebKisi.includes(x))) s.mebBildirim = true; n++; } }
    if (b.tur === 'odeme') { const h = (S.hareket || []).find(x => x.id === r.hareket); if (h && !h.meb) { h.meb = gun(0); n++; } }
  });
  if (n) { islem('MEBBİS’e girildi (Yardımcı)', n + ' iş'); kaydet(); bildir(n + ' iş MEBBİS’e girildi olarak işaretlendi'); yenileFn(); }
}
export function eklentiBaslat() {
  window.addEventListener('message', ev => {
    if (ev.source !== window || ev.origin !== location.origin || !ev.data || ev.data.kaynak !== 'sinyal-eklenti') return;
    const { tur, veri } = ev.data;
    if (tur === 'merhaba') { const ilk = !eklenti.var; Object.assign(eklenti, { var: true, surum: veri && veri.surum }); if (ilk) yenileFn(); }
    if (tur === 'tablo' && veri && veri.satirlar) {
      import('./sayfalar5.js?v=102').then(m => { location.hash = '#/ayarlar/aktarim'; setTimeout(() => { m.aktarimYukle(veri.satirlar, turTahmin(veri.satirlar[0] || []), 'MEBBİS'); bildir(`MEBBİS’ten ${veri.satirlar.length - 1} satırlık liste geldi; sütunları kontrol edip aktarın`); }, 300); });
    }
    if (tur === 'bitenler' && Array.isArray(veri)) bitenleriIsle(veri);
  });
  sayfadan('ping', {});
  setTimeout(() => sayfadan('ping', {}), 1500);
}
