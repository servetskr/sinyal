import { S, kaydet, gun, fark, tarihOku, BUGUN, SINIFLAR, EVRAKLAR, tamAd, tcGecerli, islem, oturum, odenen, egitmen, varsayilanSube } from './veri.js?v=22';
import { e, tl, sayi, ik, rozet, isaret, ekranNotu, olcumler, pencere, kapatPencere, bildir, tarih, csvIndir, ilerleme } from './ui.js?v=22';
import { yenile } from './app.js?v=22';

/* ================= MEB KURALLARI: KAYNAK VE SORUMLULUK ================= */
const MTSK = 'MTSK Yönetmeliği (ÖÖKGM, Ocak 2025 metni)';
const MTSK_URL = 'https://ookgm.meb.gov.tr/meb_iys_dosyalar/2025_01/13144439_mtsk.pdf';
export const KURAL_KAYNAK = {
  programOnGun: { ad: 'Direksiyon programı MEBBİS’e kaç gün önce girilmeli', birim: 'gün', tur: 'mevzuat', kaynak: MTSK, url: MTSK_URL },
  gunlukDersSiniri: { ad: 'Kursiyer başı günlük en fazla direksiyon', birim: 'saat', tur: 'mevzuat', kaynak: MTSK, url: MTSK_URL },
  geceDersi: { ad: 'En az gece dersi', birim: 'saat', tur: 'mevzuat', kaynak: MTSK, url: MTSK_URL },
  sinavBildirimIsGunu: { ad: 'Direksiyon sınavı bildirimi, sınavdan en geç', birim: 'iş günü önce', tur: 'mevzuat', kaynak: MTSK, url: MTSK_URL },
  asgariYas: { ad: 'Kayıt için asgari yaş (B ve A2; C sınıfında 21)', birim: 'yaş', tur: 'mevzuat', kaynak: '2918 sayılı Karayolları Trafik Kanunu, sürücü belgesi yaş şartları', url: 'https://www.mevzuat.gov.tr/mevzuatmetin/1.5.2918.pdf' },
  tekrarBekleme: { ad: 'Kaldıktan sonra tekrar sınava bekleme', birim: 'gün', tur: 'kurs', kaynak: 'Kurs uygulaması: mevzuatta sabit bir gün sayısı yok, kurs belirler' },
  devamsizlikSiniri: { ad: 'Teorik devamsızlık uyarı sınırı', birim: 'ders', tur: 'kurs', kaynak: 'Kurs uygulaması: uyarı eşiği, mevzuattaki devam şartını kurs müdürü kontrol eder' },
  ekDersUcreti: { ad: 'Ek direksiyon dersi ücreti', birim: '₺', tur: 'kurs', kaynak: 'Kurs kararı (il taban ücretinin altında olamaz)' },
};
function kurallarSekme() {
  const K = S.kurs, kontrol = K.kuralKontrol || gun(-13);
  return `${ekranNotu('Sinyal plan ve kayıtları bu değerlere göre kontrol eder. Her değerin dayandığı kaynak yanında yazar; mevzuat değişince size bildirim gelir, yeni değer siz onaylayınca uygulanır.')}
  <div class="kart"><div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Kural</th><th>Değer</th><th>Kaynak</th><th>Durum</th></tr></thead><tbody>
    ${Object.entries(KURAL_KAYNAK).map(([k, r]) => `<tr><td><b style="color:var(--murekkep)">${e(r.ad)}</b></td>
      <td style="white-space:nowrap"><input class="girdi" data-kural="${k}" type="number" min="0" value="${K[k]}" style="width:86px;height:34px;display:inline-block"> <span style="color:var(--soluk);font-size:13px">${e(r.birim)}</span></td>
      <td class="m-tam" style="font-size:13.5px">${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" style="color:var(--levha);font-weight:700">${e(r.kaynak)}</a>` : e(r.kaynak)}</td>
      <td>${r.tur === 'mevzuat' ? rozet('Mevzuat', 'mavi') : rozet('Kurs kararı', 'notr')}${(K.kuralDegisen || {})[k] ? ' ' + rozet('Kurs değiştirdi', 'sari') : ''}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="kart-govde" style="border-top:1px solid var(--cizgi-2);display:grid;gap:12px">
    <p style="font-size:14px;display:flex;gap:8px;align-items:flex-start">${isaret('tamam', 18)}<span><b>Son mevzuat kontrolü:</b> ${tarih(kontrol)} · Resmî Gazete ve ÖÖKGM duyuruları her hafta taranır.</span></p>
    <p style="font-size:14px;display:flex;gap:8px;align-items:flex-start">${isaret('bilgi', 18)}<span><b>Sorumluluk:</b> Kontroller yardımcıdır. MEBBİS’e giriş ve son karar kurs yetkilisindedir; Sinyal’in hatalı uyarısından doğan zarar sözleşmenin “Mevzuat kontrolleri” maddesinde düzenlenir.</span></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${K.kuralOnay ? `<span class="rozet rozet-yesil" style="height:34px;display:inline-flex;align-items:center">Değerleri ${e(K.kuralOnay.kim)} onayladı · ${tarih(K.kuralOnay.tarih)}</span>` : `<button class="dg dg-ana" data-kural-onay>Değerleri kontrol ettim, onaylıyorum</button>`}<button class="dg dg-cizgi" data-belge-ac="hizmet">Sözleşmedeki maddeyi gör</button></div>
  </div></div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Direksiyon takip formunda imza</h3><small>Denetimde neyin geçerli sayılacağını il MEM’inize sorun</small></div><div class="kart-govde"><div class="secim">${[['ikili', 'Dijital imza + haftalık ıslak imzalı çıktı'], ['dijital', 'Yalnızca dijital imza'], ['islak', 'Yalnızca ıslak imza']].map(([v, t]) => `<label><input type="radio" name="imza" value="${v}" data-imza ${K.imzaYontemi === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
    <p style="font-size:13.5px;color:var(--soluk);margin-top:10px">${{ ikili: 'Ders bitince usta öğretici ve kursiyer telefonda imzalar; her hafta takip formu boş imza sütunlarıyla basılır ve ıslak imzalatılır. İl MEM dijital imzayı kabul edene kadar önerilen yol budur.', dijital: 'Yalnızca il MEM’iniz dijital imzayı yazılı olarak kabul ettiyse seçin.', islak: 'Telefonda imza istenmez; takip formu her ders sonrası basılı imzalanır.' }[K.imzaYontemi || 'ikili']}</p></div></div>`;
}

/* ================= GÜVENLİK ================= */
function guvenlikSekme() {
  const g = S.guvenlik;
  const anah = (yol, deger, b, a, kilit) => `<li style="align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-guv="${yol}" ${deger ? 'checked' : ''} ${kilit ? 'disabled' : ''} aria-label="${e(b)}"><i></i></span><div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div></li>`;
  return `<div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>Giriş</h3></div><ul class="liste" style="margin-top:8px">
      ${anah('ikiAdim.mudur', g.ikiAdim.mudur, 'Kurs müdürü için iki adımlı giriş', 'Şifreden sonra telefona gelen kod istenir. Kapatılamaz.', true)}
      ${anah('ikiAdim.sekreter', g.ikiAdim.sekreter, 'Ön büro için iki adımlı giriş', 'Kasa ve kişisel verilere eriştiği için önerilir.')}
      ${anah('ikiAdim.usta', g.ikiAdim.usta, 'Usta öğretici için iki adımlı giriş', 'Yalnızca kendi derslerini gördüğü için isteğe bağlı.')}
      ${anah('ipKisit', g.ipKisit, 'Yalnızca kurs internetinden giriş', 'Ön büro hesabı kurs dışından açılamaz; müdür her yerden girebilir.')}
      ${anah('hassasOnay', g.hassasOnay, 'Hassas işlemde şifreyi tekrar sor', 'TC’yi tam göstermek, tüm veriyi indirmek ve kullanıcı yetkisi değiştirmek için.')}
    </ul><div class="kart-govde" style="border-top:1px solid var(--cizgi-2)"><b style="color:var(--murekkep)">Hareketsiz kalınca oturumu kapat</b><div class="secim" style="margin-top:8px">${[15, 30, 60, 240].map(d => `<label><input type="radio" name="oturum" value="${d}" data-oturum ${g.oturumDk === d ? 'checked' : ''}><span>${d < 60 ? d + ' dk' : d / 60 + ' saat'}</span></label>`).join('')}</div></div></div>
    <div class="kart"><div class="kart-bas"><h3>Açık oturumlar</h3><small>${g.oturumlar.length} cihaz</small></div><ul class="liste" style="margin-top:8px">${g.oturumlar.map((o, i) => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(o.kim)}</b><small style="display:block;color:var(--soluk)">${e(o.cihaz)} · ${e(o.yer)} · ${e(o.son)}</small></div>${o.bu ? rozet('Bu cihaz', 'yesil') : `<button class="dg dg-cizgi dg-kucuk" data-oturum-kapat="${i}">Çıkış yaptır</button>`}</li>`).join('')}</ul>
      <div class="kart-bas" style="padding-top:6px"><h3>Kişisel veri erişimi</h3></div><div class="kart-govde"><p style="font-size:14px">TC görüntüleme, veri indirme ve evrak açma kullanıcı adıyla kaydedilir. <a href="#/ayarlar/gecmis" style="color:var(--levha);font-weight:700">İşlem geçmişi</a></p>
      <p style="font-size:14px;margin-top:8px">Veriler Türkiye’deki sunucuda, diskte şifreli tutulur; her gece yedeklenir, yedekler 30 gün saklanır.</p></div></div>
  </div>`;
}

/* ================= ENTEGRASYONLAR: MUHASEBE, E-ARŞİV, POS, PERSONEL ================= */
const HESAP = { Nakit: ['100', 'Kasa'], Havale: ['102', 'Bankalar'], Kart: ['108', 'Diğer hazır değerler (POS)'], gelir: ['600', 'Yurt içi satışlar'], gider: ['770', 'Genel yönetim giderleri'] };
export function muhasebeFisi(ay = 0) {
  const d0 = new Date(BUGUN); d0.setDate(1); d0.setMonth(d0.getMonth() - ay);
  const l = S.hareket.filter(h => { const d = tarihOku(h.tarih); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); }).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const satir = [['Tarih', 'Fiş no', 'Hesap kodu', 'Hesap adı', 'Açıklama', 'Borç', 'Alacak']];
  l.forEach((h, i) => {
    const no = 'S' + String(i + 1).padStart(4, '0'), para = HESAP[h.yontem] || HESAP.Nakit;
    if (h.tur === 'Gelir') { satir.push([h.tarih, no, para[0], para[1], h.aciklama, h.tutar, '']); satir.push([h.tarih, no, HESAP.gelir[0], HESAP.gelir[1], h.aciklama, '', h.tutar]); }
    else { satir.push([h.tarih, no, HESAP.gider[0], HESAP.gider[1] + ' · ' + (h.kategori || ''), h.aciklama, h.tutar, '']); satir.push([h.tarih, no, para[0], para[1], h.aciklama, '', h.tutar]); }
  });
  return satir;
}
export function personelOzeti() {
  const d0 = new Date(BUGUN); const buAy = s => { const d = tarihOku(s); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); };
  const izinGun = kim => S.izinler.filter(z => z.kim === kim && buAy(z.bas)).reduce((a, z) => a + Math.round((tarihOku(z.bit) - tarihOku(z.bas)) / 864e5) + 1, 0);
  const sat = [['Ad soyad', 'Görev', 'Şube', 'Aylık ücret', 'Bu ay yapılan ders', 'Ders primi', 'İzin (gün)', 'Ödenecek toplam']];
  const subeAd = id => ((S.subeler || []).find(x => x.id === id) || {}).ad || '';
  S.egitmenler.forEach(x => { const n = S.dersler.filter(d => d.egitmen === x.id && d.durum === 'Yapıldı' && buAy(d.tarih)).length; sat.push([x.ad, 'Usta öğretici', subeAd(x.sube), x.maas, n, n * x.prim, izinGun(x.id), x.maas + n * x.prim]); });
  S.personel.forEach(p => sat.push([p.ad, p.gorev, subeAd(p.sube), p.maas, '', '', izinGun(p.id), p.maas]));
  return sat;
}
function entegrasyonSekme() {
  const g = S.entegrasyon;
  const kart = (bas, durum, govde) => `<div class="kart"><div class="kart-bas">${isaret(durum ? 'tamam' : 'bilgi', 24)}<h3>${bas}</h3><span class="sag">${durum ? rozet('Bağlı', 'yesil') : rozet('Bağlı değil', 'notr')}</span></div><div class="kart-govde">${govde}</div></div>`;
  return `<div class="izgara iz-2">
    ${kart('e-Arşiv fatura', g.earsiv.bagli, `<p style="font-size:14px">Tahsilat alındığında fatura entegratörünüz üzerinden kesilir, PDF’i kursiyere WhatsApp’tan gider. Kursiyer bilgileri kayıttan gelir.</p>`)}
    ${kart('Sanal POS', g.pos.bagli, `<p style="font-size:14px">Evden kayıt sayfası ve ödeme linkleri kursun kendi POS’u ile çekilir. Banka komisyonu: <b>%${String(g.pos.komisyon).replace('.', ',')}</b> (bankanızla yaptığınız anlaşma).</p>`)}
    <div class="kart"><div class="kart-bas">${isaret(g.muhasebe.bagli ? 'tamam' : 'bilgi', 24)}<h3>Muhasebe</h3><span class="sag">${g.muhasebe.bagli ? rozet('Paraşüt bağlı', 'yesil') : rozet('Excel ile aktarım', 'mavi')}</span></div><div class="kart-govde" style="display:grid;gap:12px">
      <p style="font-size:14px">Kasadaki her hareket muhasebe fişine çevrilir. Paraşüt’e doğrudan gider; Logo, Mikro, Luca ve Zirve için aylık fiş dosyası hazırlanır.</p>
      <div class="tablo-kap"><table class="tablo"><thead><tr><th>Sinyal’de</th><th>Muhasebe hesabı</th></tr></thead><tbody>${[['Nakit tahsilat', HESAP.Nakit], ['Havale / EFT', HESAP.Havale], ['Kartla tahsilat', HESAP.Kart], ['Kurs ücreti ve taksit', HESAP.gelir], ['Giderler', HESAP.gider]].map(([a, h]) => `<tr><td>${a}</td><td class="mono">${h[0]} · ${e(h[1])}</td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-ana" data-fis="0">${ik('indir')}Bu ayın muhasebe fişleri</button><button class="dg dg-cizgi" data-fis="1">Geçen ay</button>${g.muhasebe.bagli ? '' : '<button class="dg dg-cizgi" data-parasut>Paraşüt’ü bağla</button>'}</div></div></div>
    <div class="kart"><div class="kart-bas">${isaret('bilgi', 24)}<h3>Mali müşavir ve personel</h3></div><div class="kart-govde" style="display:grid;gap:12px">
      <p style="font-size:14px">Bordro ve SGK işlemleri mali müşavirinizde kalır. Sinyal ona her ay ihtiyaç duyduğu özeti hazırlar: maaş, yapılan ders, ders primi, izin.</p>
      <button class="dg dg-cizgi" data-personel-ozet style="justify-self:start">${ik('indir')}Bu ayın personel özeti</button>
      <div class="alan"><label for="musavir">Mali müşavirin e-postası</label><input id="musavir" class="girdi" type="email" data-musavir value="${e(g.musavir.eposta)}" placeholder="musavir@ornek.com"></div>
      <label style="display:flex;gap:12px;align-items:center;font-size:14.5px"><span class="anahtar"><input type="checkbox" data-musavir-oto ${g.musavir.otomatik ? 'checked' : ''}><i></i></span>Her ayın 1’inde fişler, kasa dökümü ve personel özeti otomatik gitsin</label></div></div>
  </div>`;
}

/* ================= VERİ AKTARIMI (eşleştirmeli) ================= */
const ALANLAR = [
  ['tc', 'TC kimlik no', ['tc', 'tckimlikno', 'tckn', 'kimlikno', 'tckimliknumarasi', 'kimlik']],
  ['ad', 'Ad', ['ad', 'adi', 'isim', 'kursiyeradi']],
  ['soyad', 'Soyad', ['soyad', 'soyadi', 'kursiyersoyadi']],
  ['tel', 'Telefon', ['telefon', 'tel', 'cep', 'gsm', 'ceptelefonu', 'telefonno']],
  ['dogum', 'Doğum tarihi', ['dogumtarihi', 'dogum', 'dtarihi']],
  ['sinif', 'Sertifika sınıfı', ['sinif', 'sertifika', 'sertifikasinifi', 'ehliyetsinifi', 'istenensinif', 'belgesinifi']],
  ['kayit', 'Kayıt tarihi', ['kayittarihi', 'kayit', 'kayittar']],
  ['toplam', 'Kurs ücreti', ['toplam', 'ucret', 'kursucreti', 'toplamucret', 'tutar']],
  ['odenen', 'Ödenen', ['odenen', 'tahsilat', 'odenentutar', 'tahsiledilen']],
  ['adres', 'Adres', ['adres', 'ikametadresi']],
];
const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const aktarim = { satirlar: null, baslik: [], esles: {}, sonuc: null };
function csvOku(metin) {
  const ilk = metin.split(/\r?\n/)[0] || ''; const ayr = (ilk.match(/;/g) || []).length >= (ilk.match(/,/g) || []).length ? ';' : ',';
  const sat = []; let alan = '', satir = [], tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) { if (c === '"') { if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false; } else alan += c; continue; }
    if (c === '"') tirnak = true; else if (c === ayr) { satir.push(alan.trim()); alan = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && metin[i + 1] === '\n') i++; satir.push(alan.trim()); alan = ''; if (satir.some(x => x)) sat.push(satir); satir = []; } else alan += c;
  }
  satir.push(alan.trim()); if (satir.some(x => x)) sat.push(satir);
  return sat;
}
const tarihCoz = v => { const m = String(v || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; const m2 = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m2 ? m2[0] : ''; };
const sinifCoz = v => { const t = norm(v); if (!t) return null; if (/otomatik|bo$|^bot/.test(t)) return 'B-O'; if (/^a2/.test(t)) return 'A2'; if (/^c/.test(t)) return 'C'; if (/^b/.test(t)) return 'B'; return null; };
const tutarCoz = v => +String(v || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0;
function kontrolEt(r, i = 0) {
  const get = k => aktarim.esles[k] != null && aktarim.esles[k] !== '' ? r[aktarim.esles[k]] : '';
  const x = Object.fromEntries(ALANLAR.map(([k]) => [k, get(k)]));
  const hata = [], uyari = [];
  if (!x.ad || !x.soyad) hata.push('Ad veya soyad yok');
  if (x.tc && !tcGecerli(x.tc)) uyari.push('TC geçersiz');
  if (!x.tc) uyari.push('TC yok');
  if (x.tc && S.kursiyerler.some(k => k.tc === x.tc)) hata.push('Bu TC zaten kayıtlı');
  else if (x.tc && aktarim.esles.tc != null && aktarim.satirlar.slice(0, i).some(o => String(o[aktarim.esles.tc] || '').trim() === String(x.tc).trim())) hata.push('Dosyada iki kez var');
  if (String(x.tel).replace(/\D/g, '').length < 10) uyari.push('Telefon eksik');
  if (!sinifCoz(x.sinif)) uyari.push('Sınıf tanınmadı → B');
  return { x, hata, uyari };
}
function aktarimSekme() {
  let govde = '';
  if (aktarim.sonuc) govde = `<div class="kart"><div class="kart-govde">${isaret('tamam', 34)}<h3 style="margin:10px 0 4px">${aktarim.sonuc.n} kursiyer aktarıldı</h3><p style="color:var(--soluk)">${aktarim.sonuc.atla} satır hatalı olduğu için atlandı. Aktarılanlar “Evrak” aşamasında başlar; KVKK rızası ilk ziyarette alınır.</p><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><a class="dg dg-ana" href="#/kursiyerler">Kursiyerleri gör</a><button class="dg dg-cizgi" data-aktarim-geri>Bu aktarımı geri al</button><button class="dg dg-hafif" data-aktarim-yeni>Yeni dosya</button></div></div></div>`;
  else if (aktarim.satirlar) {
    const veri = aktarim.satirlar, sonuc = veri.map(kontrolEt);
    const ok = sonuc.filter(s => !s.hata.length).length, hata = sonuc.length - ok, uy = sonuc.filter(s => !s.hata.length && s.uyari.length).length;
    govde = `${olcumler([['Satır', sayi(veri.length)], ['Aktarılacak', sayi(ok), uy ? uy + ' tanesinde uyarı var' : 'Hepsi temiz'], ['Atlanacak', sayi(hata), hata ? 'Ad eksik ya da zaten kayıtlı' : '', hata ? 'uyari' : '']])}<div class="ara-bosluk"></div>
    <div class="izgara iz-12"><div class="kart"><div class="kart-bas"><h3>Sütun eşleştirme</h3><small>Otomatik eşleşti; gerekirse değiştirin</small></div><div class="kart-govde" style="display:grid;gap:8px">${ALANLAR.map(([k, t]) => `<label style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;font-size:14px"><b style="color:var(--murekkep)">${t}</b><select class="girdi" style="height:34px" data-esles="${k}"><option value="">— yok —</option>${aktarim.baslik.map((h, i) => `<option value="${i}" ${String(aktarim.esles[k]) === String(i) ? 'selected' : ''}>${e(h)}</option>`).join('')}</select></label>`).join('')}</div></div>
    <div class="kart"><div class="kart-bas"><h3>Önizleme</h3><small>İlk 8 satır</small></div><div class="tablo-kap"><table class="tablo"><thead><tr><th>Ad soyad</th><th>TC</th><th>Sınıf</th><th>Ücret / ödenen</th><th>Durum</th></tr></thead><tbody>${sonuc.slice(0, 8).map(({ x, hata, uyari }) => `<tr><td>${e(x.ad + ' ' + x.soyad)}</td><td class="mono">${e(x.tc)}</td><td>${e(sinifCoz(x.sinif) || 'B')}</td><td class="mono">${tl(tutarCoz(x.toplam))} / ${tl(tutarCoz(x.odenen))}</td><td>${hata.length ? rozet(hata[0], 'kirmizi') : uyari.length ? rozet(uyari.join(' · '), 'sari') : rozet('Hazır', 'yesil')}</td></tr>`).join('')}</tbody></table></div>
      <div class="kart-govde"><button class="dg dg-ana" data-aktar-onay ${ok ? '' : 'disabled'}>${sayi(ok)} kursiyeri aktar</button> <button class="dg dg-hafif" data-aktarim-yeni>Vazgeç</button></div></div></div>`;
  } else govde = `<div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>1 · Eski programdan dışa aktarın</h3></div><div class="kart-govde"><ul class="liste" style="margin:-8px -20px 0">${[['Akınsoft NetSürücü', 'Kursiyer listesi → sağ tık → Excel’e aktar → “CSV (noktalı virgülle ayrılmış)” olarak kaydedin.'], ['Tabim', 'Raporlar → Kursiyer listesi → Excel → CSV olarak kaydedin.'], ['Excel tablonuz', 'Dosya → Farklı kaydet → CSV UTF-8.']].map(([a, b]) => `<li style="align-items:flex-start">${isaret('zorunlu', 20)}<div><b style="color:var(--murekkep);display:block">${a}</b><small style="font-size:13.5px;color:var(--metin)">${b}</small></div></li>`).join('')}</ul>
      <button class="dg dg-hafif dg-kucuk" data-sablon-csv style="margin-top:10px">${ik('indir')}Boş şablon (tüm sütunlar)</button></div></div>
    <div class="kart"><div class="kart-bas"><h3>2 · Dosyayı bırakın</h3></div><div class="kart-govde">
      <label class="yukle" style="position:relative">${isaret('zorunlu', 30)}<span style="flex:1"><b style="display:block;color:var(--murekkep)">CSV dosyası seç</b><small style="color:var(--soluk)">Sütun adları farklı olabilir; Sinyal tanır, siz kontrol edersiniz</small></span><input type="file" accept=".csv,text/csv" data-csv-yukle></label>
      <p style="font-size:13.5px;color:var(--soluk);margin-top:12px">Aktarılan her kayıt kontrol edilir: TC doğrulaması, aynı kişinin iki kez girilmesi, eksik telefon ve tanınmayan sınıf. İsterseniz dosyayı bize gönderin, kontrolü biz yapalım.</p></div></div></div>`;
  return govde;
}
function aktarimUygula() {
  const id = 'akt' + Date.now(); let n = 0, atla = 0;
  aktarim.satirlar.map(kontrolEt).forEach(({ x, hata }, i) => {
    if (hata.length) { atla++; return; }
    const sn = sinifCoz(x.sinif) || 'B', toplam = tutarCoz(x.toplam) || SINIFLAR[sn].ucret, od = Math.min(tutarCoz(x.odenen), toplam), kt = tarihCoz(x.kayit) || gun(0);
    const eg = S.egitmenler.find(z => z.siniflar.includes(sn) && (z.sube === varsayilanSube())) || S.egitmenler.find(z => z.siniflar.includes(sn));
    S.kursiyerler.push({ id: 'k' + Date.now() + i, aktarim: id, ad: String(x.ad).trim(), soyad: String(x.soyad).trim(), tel: x.tel, tc: String(x.tc || '').trim(), dogumTarihi: tarihCoz(x.dogum), dogum: tarihCoz(x.dogum).slice(0, 4), adres: x.adres || '', ogrenim: '', sinif: sn, kayit: kt, egitmen: eg.id, sube: varsayilanSube(), asama: 'Evrak', teorik: 0, direksiyon: 0, evrak: Object.fromEntries(EVRAKLAR.map(([z]) => [z, false])), mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam, pesin: od, pesinTarih: kt, taksitler: [], senetli: false }, kaynak: 'Aktarım', yorum: null, notlar: [{ tarih: gun(0), metin: 'Eski programdan aktarıldı.' }], deneme: [], acil: null, kvkk: null });
    n++;
  });
  aktarim.sonuc = { id, n, atla }; aktarim.satirlar = null;
  islem('Kursiyer aktardı', n + ' kayıt'); kaydet();
}

/* ================= GÖRÜNÜM ================= */
export function temaUygula() {
  let t = {}; try { t = JSON.parse(localStorage.getItem('sinyal-gorunum') || '{}'); } catch (x) { }
  document.body.classList.toggle('tema-sade', t.tema === 'sade');
  document.body.classList.toggle('yazi-buyuk', t.yazi === 'buyuk');
  return t;
}
function gorunumSekme() {
  const t = temaUygula();
  return `<div class="izgara iz-2"><div class="kart"><div class="kart-bas"><h3>Görünüm</h3><small>Yalnızca bu cihazda</small></div><div class="kart-govde" style="display:grid;gap:16px">
    <div><b style="color:var(--murekkep)">Tema</b><div class="secim" style="margin-top:8px">${[['levha', 'Levha (mavi)'], ['sade', 'Sade (açık)']].map(([v, a]) => `<label><input type="radio" name="tema" value="${v}" data-gorunum="tema" ${(t.tema || 'levha') === v ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div></div>
    <div><b style="color:var(--murekkep)">Yazı boyutu</b><div class="secim" style="margin-top:8px">${[['normal', 'Normal'], ['buyuk', 'Büyük']].map(([v, a]) => `<label><input type="radio" name="yazi" value="${v}" data-gorunum="yazi" ${(t.yazi || 'normal') === v ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div></div>
  </div></div><div class="kart"><div class="kart-govde"><p style="font-size:14px">Sade tema gün boyu açık kalan ekranlar için daha dinlendiricidir: koyu mavi bloklar açık zemine, büyük harfli başlıklar normal yazıya döner. Yazı boyutu “Büyük” seçilince tüm ekranlar yaklaşık %12 büyür.</p></div></div></div>`;
}

/* ================= AYAR SEKMELERİ (sayfalar2.ayarlar buradan çağırır) ================= */
export const AYAR_SEKMELERI = { kurallar: kurallarSekme, guvenlik: guvenlikSekme, entegrasyon: entegrasyonSekme, aktarim: aktarimSekme, gorunum: gorunumSekme };
export function ayarBaglan(k) {
  k.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('[data-kural]')) { const key = t.dataset.kural, eski = S.kurs[key]; S.kurs[key] = +t.value || 0; if (KURAL_KAYNAK[key].tur === 'mevzuat') { S.kurs.kuralDegisen = S.kurs.kuralDegisen || {}; S.kurs.kuralDegisen[key] = true; } islem('Kural değerini değiştirdi', KURAL_KAYNAK[key].ad + ': ' + eski + ' → ' + S.kurs[key]); kaydet(); bildir('Kural kaydedildi'); yenile(); }
    if (t.matches('[data-imza]')) { S.kurs.imzaYontemi = t.value; islem('İmza yöntemini değiştirdi', t.value); kaydet(); bildir('İmza yöntemi kaydedildi'); yenile(); }
    if (t.matches('[data-guv]')) { const [a, b] = t.dataset.guv.split('.'); if (b) S.guvenlik[a][b] = t.checked; else S.guvenlik[a] = t.checked; islem('Güvenlik ayarını değiştirdi', t.dataset.guv + ': ' + (t.checked ? 'açık' : 'kapalı')); kaydet(); bildir('Güvenlik ayarı kaydedildi'); }
    if (t.matches('[data-oturum]')) { S.guvenlik.oturumDk = +t.value; kaydet(); bildir('Oturum süresi kaydedildi'); }
    if (t.matches('[data-musavir]')) { S.entegrasyon.musavir.eposta = t.value.trim(); kaydet(); bildir('E-posta kaydedildi'); }
    if (t.matches('[data-musavir-oto]')) { if (t.checked && !S.entegrasyon.musavir.eposta) { t.checked = false; return bildir('Önce mali müşavirin e-postasını yazın', 'uyari'); } S.entegrasyon.musavir.otomatik = t.checked; kaydet(); bildir(t.checked ? 'Her ayın 1’inde otomatik gönderilecek' : 'Otomatik gönderim kapatıldı'); }
    if (t.matches('[data-esles]')) { aktarim.esles[t.dataset.esles] = t.value; yenile(); }
    if (t.matches('[data-gorunum]')) { let g = {}; try { g = JSON.parse(localStorage.getItem('sinyal-gorunum') || '{}'); } catch (x) { } g[t.dataset.gorunum] = t.value; try { localStorage.setItem('sinyal-gorunum', JSON.stringify(g)); } catch (x) { } temaUygula(); }
    const f = t.closest('[data-csv-yukle]');
    if (f && f.files[0]) {
      const r = new FileReader(); r.onload = () => {
        const sat = csvOku(String(r.result).replace(/^﻿/, ''));
        if (sat.length < 2) return bildir('Dosyada başlık ve en az bir satır olmalı', 'uyari');
        aktarim.baslik = sat[0]; aktarim.satirlar = sat.slice(1); aktarim.esles = {};
        const nb = sat[0].map(norm);
        ALANLAR.forEach(([k, , es]) => { const i = nb.findIndex(h => es.includes(h)); if (i >= 0) aktarim.esles[k] = String(i); });
        yenile();
      }; r.readAsText(f.files[0], 'utf-8');
    }
  });
  k.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-kural-onay]')) { S.kurs.kuralOnay = { kim: oturum.kullanici ? oturum.kullanici.ad : '', tarih: gun(0) }; islem('Kural değerlerini onayladı'); kaydet(); bildir('Kural değerleri onaylandı'); yenile(); }
    const bo = t.closest('[data-belge-ac]'); if (bo) import('./sayfalar3.js?v=22').then(m => m.belgeAc(bo.dataset.belgeAc));
    const ok = t.closest('[data-oturum-kapat]'); if (ok) { const o = S.guvenlik.oturumlar.splice(+ok.dataset.oturumKapat, 1)[0]; islem('Oturumu kapattırdı', o.kim + ' · ' + o.cihaz); kaydet(); bildir(o.kim + ' · ' + o.cihaz + ' oturumu kapatıldı'); yenile(); }
    const fs = t.closest('[data-fis]'); if (fs) { const n = +fs.dataset.fis, d = new Date(BUGUN); d.setMonth(d.getMonth() - n); csvIndir(`muhasebe-fisleri-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}.csv`, muhasebeFisi(n)); islem('Muhasebe fişlerini indirdi'); kaydet(); }
    if (t.closest('[data-parasut]')) { S.entegrasyon.muhasebe = { tur: 'Paraşüt', bagli: true }; islem('Paraşüt’ü bağladı'); kaydet(); bildir('Paraşüt bağlandı; tahsilatlar artık otomatik aktarılıyor'); yenile(); }
    if (t.closest('[data-personel-ozet]')) { csvIndir('personel-ozeti.csv', personelOzeti()); islem('Personel özetini indirdi'); kaydet(); }
    if (t.closest('[data-sablon-csv]')) csvIndir('sinyal-aktarim-sablonu.csv', [ALANLAR.map(a => a[1]), ['12345678950', 'Ali', 'Yıldız', '0532 000 00 01', '14.03.2004', 'B', '02.10.2026', '24000', '8000', 'Odunpazarı']]);
    if (t.closest('[data-aktar-onay]')) { aktarimUygula(); yenile(); }
    if (t.closest('[data-aktarim-yeni]')) { aktarim.satirlar = null; aktarim.sonuc = null; yenile(); }
    if (t.closest('[data-aktarim-geri]')) { const id = aktarim.sonuc.id, once = S.kursiyerler.length; S.kursiyerler = S.kursiyerler.filter(x => x.aktarim !== id); islem('Aktarımı geri aldı', (once - S.kursiyerler.length) + ' kayıt'); kaydet(); aktarim.sonuc = null; bildir('Aktarım geri alındı'); yenile(); }
  });
}

/* ================= EVRAK DOĞRULAMA ================= */
export function evrakDogrula(k, tur) {
  const ad = { adli: 'Adli sicil kaydı', saglik: 'Sürücü sağlık raporu' }[tur];
  const v = (k.dogrulama || {})[tur];
  pencere({
    baslik: ad + ' doğrulama · ' + tamAd(k),
    icerik: `${v ? `<div class="ipucu" style="margin-bottom:12px">${isaret('tamam', 20)}<span>${e(v.kim)} ${tarih(v.tarih)} tarihinde doğruladı · ${e(v.kod)}</span></div>` : ''}
      <ol style="padding-left:18px;display:grid;gap:10px;font-size:14.5px">
        <li>${tur === 'adli' ? 'Belgenin altındaki <b>barkod numarasını</b> yazın.' : 'Raporun <b>numarasını</b> ve tarihini yazın.'}<input class="girdi" style="margin-top:6px" data-kod value="${e(v ? v.kod : tur === 'adli' ? ((k.adliSicil || {}).barkod || '') : ((k.saglikRapor || {}).no || ''))}" placeholder="${tur === 'adli' ? 'Örn. 9A3F-…' : 'Rapor no'}"></li>
        <li>${tur === 'adli' ? 'e-Devlet belge doğrulamada açın; ad soyad ve TC’nin eşleştiğini görün.' : 'Raporu veren hastanenin ya da e-Devlet’teki sağlık raporu sorgulamasının sonucuyla karşılaştırın.'}<br><a class="dg dg-cizgi dg-kucuk" style="margin-top:6px" href="https://www.turkiye.gov.tr/belge-dogrulama" target="_blank" rel="noopener">e-Devlet’te aç</a></li>
        <li>Eşleşiyorsa “Doğruladım”a basın; kim, ne zaman doğruladı kayda geçer ve denetim dosyasında görünür.</li></ol>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-dogruladim>Doğruladım</button>`,
    onAc(d) { d.querySelector('[data-dogruladim]').addEventListener('click', () => { const kod = d.querySelector('[data-kod]').value.trim(); if (!kod) return bildir('Önce belge numarasını yazın', 'uyari'); k.dogrulama = k.dogrulama || {}; k.dogrulama[tur] = { kod, kim: oturum.kullanici ? oturum.kullanici.ad : '', tarih: gun(0) }; if (tur === 'adli') k.adliSicil = { barkod: kod }; else { k.saglikRapor = k.saglikRapor || {}; k.saglikRapor.no = kod; } islem('Evrak doğruladı', tamAd(k) + ' · ' + ad); kaydet(); kapatPencere(); bildir(ad + ' doğrulandı'); yenile(); }); },
  });
}

/* ================= KURULUM ================= */
export function kurulumAdimlari() {
  const sos = S.sosyal || { kanallar: [] }, g = S.guvenlik || { ikiAdim: {} }, en = S.entegrasyon || { earsiv: {}, pos: {} };
  return [
    ['Kurs bilgileri ve şubeler', !!(S.kurs.tel && S.kurs.adres), 'Siz · 3 dk', '#/ayarlar/kurs', 'Ad, adres, telefon; birden fazla şube varsa şubeler.'],
    ['Sınıflar ve ücretler', true, 'Siz · 2 dk', '#/ayarlar/sinif', 'Sürücü kursu şablonu hazır gelir; yalnızca ücretleri kontrol edin.'],
    ['Ekip ve araçlar', S.egitmenler.length > 0 && S.araclar.length > 0, 'Biz · aktarımla', '#/filo', 'Usta öğreticiler, belgeleri ve araçlar.'],
    ['Kursiyerleri aktar', S.kursiyerler.length > 0, 'Biz · 1 gün', '#/ayarlar/aktarim', 'Eski programdan kursiyer, taksit ve ödeme geçmişi.'],
    ['MEB kural değerlerini onayla', !!S.kurs.kuralOnay, 'Siz · 2 dk', '#/ayarlar/kurallar', 'Değerler kaynağıyla gelir; kurs müdürü onaylar.'],
    ['Asistanın bildikleri', S.asistanBilgi.length >= 5, 'Biz · şablondan', '#/mesajlar/bilgi', 'Fiyat, evrak, ders saatleri. Sürücü kursu şablonundan doldurulur, siz okursunuz.'],
    ['Kanalları bağla', sos.kanallar.filter(c => c.bagli).length >= 2, 'Biz + siz · 30 dk', '#/sosyal/kanal', 'Instagram ve WhatsApp; Meta girişini siz yaparsınız.'],
    ['Kullanıcılar ve güvenlik', !!g.ikiAdim.mudur && !!g.ikiAdim.sekreter, 'Siz · 5 dk', '#/ayarlar/guvenlik', 'Ön büro ve usta öğretici davetleri, iki adımlı giriş.'],
    ['Fatura ve ödeme', !!(en.earsiv.bagli && en.pos.bagli), 'Biz · 1 gün', '#/ayarlar/entegrasyon', 'e-Arşiv entegratörü ve sanal POS bilgileri.'],
  ];
}
export function kurulum() {
  const l = kurulumAdimlari(), biten = l.filter(x => x[1]).length;
  return {
    baslik: 'Kurulum', alt: `${biten}/${l.length} adım tamam`,
    html: `${ekranNotu('Kurulumun çoğunu biz yaparız. Sizden istenenler kısa ve her birinin yanında yazar. Toplam süre: kurs tarafında yaklaşık 45 dakika.')}
    <div class="kart"><div class="kart-govde">${ilerleme(biten, l.length, 'yesil')}<p style="margin-top:8px;font-size:14px"><b>${biten}</b> / ${l.length} adım tamamlandı</p></div>
    <ul class="liste">${l.map(([b, ok, kim, h, a], i) => `<li style="align-items:flex-start">${isaret(ok ? 'tamam' : 'zorunlu', 26)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${i + 1}. ${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div><span class="sag" style="flex-wrap:wrap;justify-content:flex-end">${rozet(kim, kim.startsWith('Biz') ? 'mavi' : 'notr')}${ok ? rozet('Tamam', 'yesil') : `<a class="dg dg-ana dg-kucuk" href="${h}">Yap</a>`}</span></li>`).join('')}</ul></div>`,
  };
}
