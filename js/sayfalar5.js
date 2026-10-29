import { S, kaydet, gun, fark, tarihOku, BUGUN, SINIFLAR, EVRAKLAR, tamAd, tcGecerli, islem, oturum, odenen, egitmen, varsayilanSube, eksikEvrak, SOZLESME_VARSAYILAN, sb, sbDers, sbSinav, gorunum, seciliSube, cokSube} from './veri.js?v=32';
import { e, tl, sayi, ik, rozet, isaret, ekranNotu, olcumler, pencere, kapatPencere, bildir, tarih, csvIndir, ilerleme, avatar, goreli } from './ui.js?v=32';
import { yenile } from './app.js?v=32';

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
  <div class="kart"><div class="kart-bas"><h3>MEBBİS’e giriş yöntemi</h3></div><div class="kart-govde"><div class="secim">${[['sirali', 'Sıralı giriş (şifre gerekmez)'], ['arac', 'Tek tuş aktarımı (MEBBİS Aracı)']].map(([v, t]) => `<label><input type="radio" name="mebyontem" value="${v}" data-meb-yontem ${(K.mebYontem || 'sirali') === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
    <p style="font-size:13.5px;color:var(--soluk);margin-top:10px">${K.mebYontem === 'arac' && S.mebArac ? `Araç: ${e(S.mebArac.bilgisayar)} · ${e(S.mebArac.onay.kim)} ${tarih(S.mebArac.onay.tarih)} tarihinde uyarıyı onaylayarak açtı.` : 'Sıralı girişte MEBBİS’e kurs yetkilisi kendi oturumunda girer; Sinyal yalnızca hazırlar ve kopyalatır.'}</p>
    <p style="font-size:13px;color:var(--metin);margin-top:8px;display:flex;gap:8px;align-items:flex-start">${isaret('uyari', 18)}<span>${MEB_RISK}</span></p></div></div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Direksiyon takip formunda imza</h3><small>Denetimde neyin geçerli sayılacağını il MEM’inize sorun</small></div><div class="kart-govde"><div class="secim">${[['ikili', 'Dijital imza + haftalık ıslak imzalı çıktı'], ['dijital', 'Yalnızca dijital imza'], ['islak', 'Yalnızca ıslak imza']].map(([v, t]) => `<label><input type="radio" name="imza" value="${v}" data-imza ${K.imzaYontemi === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
    <button class="dg dg-cizgi dg-kucuk" style="margin-top:10px" data-belge-ac="dilekce">${ik('belge')}İl MEM’e soran dilekçe (hazır)</button>
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
const HESAP = { Nakit: ['100', 'Kasa'], Havale: ['102', 'Bankalar'], Kart: ['108', 'Diğer hazır değerler (POS)'], alici: ['120', 'Alıcılar'], kdvIn: ['191', 'İndirilecek KDV'], kdvOut: ['391', 'Hesaplanan KDV'], gelir: ['600', 'Yurt içi satışlar'], iade: ['610', 'Satıştan iadeler'], gider: ['770', 'Genel yönetim giderleri'] };
const KDVLI_GIDER = ['Yakıt', 'Bakım', 'Fatura', 'Reklam'];
// Tahakkuk esaslı fiş. fatura='kayit': kurs ücretinin tamamı kayıtta faturalanır (120 alacak açılır, tahsilat 120'yi kapatır).
// fatura='tahsilat': her tahsilatta e-Arşiv kesilir (satış ve KDV tahsilat anında).
export function muhasebeFisi(ay = 0) {
  const en = S.entegrasyon, oran = (en.kdv ?? 20) / 100, kayitta = en.fatura === 'kayit';
  const d0 = new Date(BUGUN); d0.setDate(1); d0.setMonth(d0.getMonth() - ay);
  const buAy = t => { const d = tarihOku(t); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); };
  const ayir = tutar => { const net = Math.round(tutar / (1 + oran) * 100) / 100; return [net, Math.round((tutar - net) * 100) / 100]; };
  const satir = [['Tarih', 'Fiş no', 'Hesap kodu', 'Hesap adı', 'Açıklama', 'Borç', 'Alacak']];
  let no = 0; const fis = (tarih_, aciklama, kalemler) => { const f = 'S' + String(++no).padStart(4, '0'); kalemler.forEach(([h, b, a, ek]) => satir.push([tarih_, f, h[0], h[1] + (ek ? ' · ' + ek : ''), aciklama, b || '', a || ''])); };
  if (kayitta) S.kursiyerler.filter(k => buAy(k.kayit)).forEach(k => { const [n, v] = ayir(k.odeme.toplam); fis(k.kayit, tamAd(k) + ' · kurs ücreti faturası', [[HESAP.alici, k.odeme.toplam], [HESAP.gelir, 0, n], [HESAP.kdvOut, 0, v]]); });
  S.hareket.filter(h => buAy(h.tarih)).sort((a, b) => a.tarih.localeCompare(b.tarih)).forEach(h => {
    const para = HESAP[h.yontem] || HESAP.Nakit;
    if (h.tur === 'Gelir' && h.kategori === 'İade') { const [n, v] = ayir(h.tutar); return fis(h.tarih, h.aciklama, [[HESAP.iade, n], [HESAP.kdvOut, v], [para, 0, h.tutar]]); }
    if (h.tur === 'Gelir') { if (kayitta && h.kursiyer) return fis(h.tarih, h.aciklama + ' · tahsilat', [[para, h.tutar], [HESAP.alici, 0, h.tutar]]); const [n, v] = ayir(h.tutar); return fis(h.tarih, h.aciklama + ' · e-Arşiv', [[para, h.tutar], [HESAP.gelir, 0, n], [HESAP.kdvOut, 0, v]]); }
    if (KDVLI_GIDER.includes(h.kategori)) { const [n, v] = ayir(h.tutar); return fis(h.tarih, h.aciklama, [[HESAP.gider, n, 0, h.kategori], [HESAP.kdvIn, v], [para, 0, h.tutar]]); }
    fis(h.tarih, h.aciklama, [[HESAP.gider, h.tutar, 0, h.kategori], [para, 0, h.tutar]]);
  });
  return satir;
}
export function personelOzeti() {
  const d0 = new Date(BUGUN); const buAy = s => { const d = tarihOku(s); return d.getMonth() === d0.getMonth() && d.getFullYear() === d0.getFullYear(); };
  const izinGun = kim => S.izinler.filter(z => z.kim === kim && buAy(z.bas)).reduce((a, z) => a + Math.round((tarihOku(z.bit) - tarihOku(z.bas)) / 864e5) + 1, 0);
  const sat = [['Ad soyad', 'Görev', 'Şube', 'Brüt aylık ücret', 'Bu ay yapılan ders', 'Ders primi (brüt, SGK’ya tabi)', 'İzin (gün)', 'Brüt toplam'], ['Not: tutarlar brüttür; net ücret, SGK ve vergi kesintileri bordroda hesaplanır.', '', '', '', '', '', '', '']];
  const subeAd = id => ((S.subeler || []).find(x => x.id === id) || {}).ad || '';
  S.egitmenler.forEach(x => { const n = S.dersler.filter(d => d.egitmen === x.id && d.durum === 'Yapıldı' && buAy(d.tarih)).length; sat.push([x.ad, 'Usta öğretici', subeAd(x.sube), x.maas, n, n * x.prim, izinGun(x.id), x.maas + n * x.prim]); });
  S.personel.forEach(p => sat.push([p.ad, p.gorev, subeAd(p.sube), p.maas, '', '', izinGun(p.id), p.maas]));
  return sat;
}
function entegrasyonSekme() {
  const g = S.entegrasyon;
  const kart = (bas, durum, govde) => `<div class="kart"><div class="kart-bas">${isaret(durum ? 'tamam' : 'bilgi', 24)}<h3>${bas}</h3><span class="sag">${durum ? rozet('Bağlı', 'yesil') : rozet('Bağlı değil', 'notr')}</span></div><div class="kart-govde">${govde}</div></div>`;
  return `<div class="izgara iz-2">
    ${kart('e-Arşiv fatura', g.earsiv.bagli, `<p style="font-size:14px">Tahsilat alındığında fatura entegratörünüz üzerinden kesilir, PDF’i kursiyere WhatsApp’tan gider. Kursiyer bilgileri kayıttan gelir.</p><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px"><div class="alan" style="width:140px"><label for="e-seri">Fatura seri öneki</label><input id="e-seri" class="girdi" maxlength="3" data-earsiv-alan="seri" value="${e(g.earsiv.seri || 'SNY')}"></div><div class="alan" style="width:170px"><label for="e-vkn">Vergi kimlik no</label><input id="e-vkn" class="girdi" inputmode="numeric" maxlength="11" data-earsiv-alan="vkn" value="${e(g.vkn || '')}"></div></div><small style="color:var(--soluk)">${(S.faturalar || []).length} fatura kesildi.</small>`)}
    ${kart('Sanal POS', g.pos.bagli, `<p style="font-size:14px">Evden kayıt sayfası ve ödeme linkleri kursun kendi POS’u ile çekilir. Banka komisyonu: <b>%${String(g.pos.komisyon).replace('.', ',')}</b> (bankanızla yaptığınız anlaşma).</p>`)}
    <div class="kart"><div class="kart-bas">${isaret(g.muhasebe.bagli ? 'tamam' : 'bilgi', 24)}<h3>Muhasebe</h3><span class="sag">${g.muhasebe.bagli ? rozet('Paraşüt bağlı', 'yesil') : rozet('Excel ile aktarım', 'mavi')}</span></div><div class="kart-govde" style="display:grid;gap:12px">
      <p style="font-size:14px">Kasadaki her hareket muhasebe fişine çevrilir. Paraşüt’e doğrudan gider; Logo, Mikro, Luca ve Zirve için aylık fiş dosyası hazırlanır.</p>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end"><div class="alan" style="width:130px"><label for="kdv">KDV oranı (%)</label><input id="kdv" class="girdi" type="number" min="0" max="20" data-kdv value="${g.kdv ?? 20}"></div>
        <div><b style="color:var(--murekkep);font-size:14px">Kurs ücreti ne zaman faturalanıyor?</b><div class="secim" style="margin-top:6px">${[['tahsilat', 'Her tahsilatta'], ['kayit', 'Kayıtta tamamı (taksitler alacak)']].map(([v, t]) => `<label><input type="radio" name="fatura" value="${v}" data-fatura ${g.fatura === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div></div>
      <small style="color:var(--soluk)">Oranı ve faturalama zamanını mali müşavirinizle teyit edin; fişler buna göre üretilir.</small>
      <div class="tablo-kap"><table class="tablo"><thead><tr><th>Sinyal’de</th><th>Muhasebe hesabı</th></tr></thead><tbody>${[['Nakit / havale / kart', [HESAP.Nakit[0] + ' / ' + HESAP.Havale[0] + ' / ' + HESAP.Kart[0], 'Kasa, bankalar, POS']], ['Kurs ücreti (KDV hariç)', HESAP.gelir], ['Hesaplanan KDV', HESAP.kdvOut], ...(g.fatura === 'kayit' ? [['Taksit alacağı', HESAP.alici]] : []), ['İade', HESAP.iade], ['Gider (yakıt, bakım, fatura, reklam KDV’li)', [HESAP.gider[0] + ' + ' + HESAP.kdvIn[0], 'Gider + indirilecek KDV']], ['Maaş, kira, harç', HESAP.gider]].map(([a, h]) => `<tr><td>${a}</td><td class="mono">${h[0]} · ${e(h[1])}</td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-ana" data-fis="0">${ik('indir')}Bu ayın muhasebe fişleri</button><button class="dg dg-cizgi" data-fis="1">Geçen ay</button>${g.muhasebe.bagli ? '' : '<button class="dg dg-cizgi" data-parasut>Paraşüt’ü bağla</button>'}</div></div></div>
    <div class="kart"><div class="kart-bas">${isaret('bilgi', 24)}<h3>Mali müşavir ve personel</h3></div><div class="kart-govde" style="display:grid;gap:12px">
      <p style="font-size:14px">Bordro ve SGK işlemleri mali müşavirinizde kalır. Sinyal ona her ay ihtiyaç duyduğu özeti hazırlar: maaş, yapılan ders, ders primi, izin.</p>
      <button class="dg dg-cizgi" data-personel-ozet style="justify-self:start">${ik('indir')}Bu ayın personel özeti</button>
      <div class="alan"><label for="musavir">Mali müşavirin e-postası</label><input id="musavir" class="girdi" type="email" data-musavir value="${e(g.musavir.eposta)}" placeholder="musavir@firma.com"></div>
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
  ['teorikDers', 'Yapılan teorik ders', ['teorik', 'teorikders', 'teorikdersler', 'katildigiteorik']],
  ['direksiyonDers', 'Yapılan direksiyon dersi', ['direksiyon', 'direksiyonders', 'yapilandireksiyon', 'direksiyondersi']],
];
const TAKSIT_ALAN = [
  ['tc', 'TC kimlik no', ['tc', 'tckimlikno', 'tckn', 'kimlikno']],
  ['vade', 'Vade tarihi', ['vade', 'vadetarihi', 'taksittarihi', 'odemetarihiplan']],
  ['tutar', 'Tutar', ['tutar', 'taksittutari', 'miktar', 'taksit']],
  ['odeme', 'Ödendiği tarih', ['odemetarihi', 'odendi', 'tahsiltarihi', 'odendigitarih']],
  ['yontem', 'Ödeme şekli', ['yontem', 'odemesekli', 'odemeturu']],
];
const ARAC_ALAN = [
  ['plaka', 'Plaka', ['plaka', 'aracplakasi']],
  ['model', 'Marka / model', ['model', 'marka', 'markamodel', 'arac']],
  ['yil', 'Model yılı', ['yil', 'modelyili']],
  ['sinif', 'Sınıf', ['sinif', 'sertifikasinifi']],
  ['muayene', 'Muayene bitiş', ['muayene', 'muayenetarihi', 'muayenebitis']],
  ['sigorta', 'Sigorta bitiş', ['sigorta', 'sigortatarihi', 'trafiksigortasi']],
];
const TUR_ALAN = () => ({ kursiyer: ALANLAR, taksit: TAKSIT_ALAN, arac: ARAC_ALAN }[aktarim.tur || 'kursiyer']);
const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const aktarim = { tur: 'kursiyer', satirlar: null, baslik: [], esles: {}, sonuc: null };
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
  const x = Object.fromEntries(TUR_ALAN().map(([k]) => [k, get(k)]));
  const hata = [], uyari = [];
  if (aktarim.tur === 'taksit') {
    const k = S.kursiyerler.find(z => z.tc && z.tc === String(x.tc).trim());
    if (!k) hata.push('Bu TC ile kursiyer yok; önce kursiyer dosyasını aktarın');
    if (!tarihCoz(x.vade)) hata.push('Vade tarihi okunamadı');
    if (!tutarCoz(x.tutar)) hata.push('Tutar yok');
    if (k && k.odeme.taksitler.some(t => t.vade === tarihCoz(x.vade) && t.tutar === tutarCoz(x.tutar))) hata.push('Bu taksit zaten var');
    return { x, hata, uyari, k };
  }
  if (aktarim.tur === 'arac') {
    if (!x.plaka) hata.push('Plaka yok');
    if (x.plaka && S.araclar.some(a => a.plaka.replace(/\s/g, '') === String(x.plaka).replace(/\s/g, '').toUpperCase())) hata.push('Bu plaka zaten kayıtlı');
    if (!tarihCoz(x.muayene)) uyari.push('Muayene tarihi yok');
    return { x, hata, uyari };
  }
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
  if (aktarim.sonuc) govde = `<div class="kart"><div class="kart-govde">${isaret('tamam', 34)}<h3 style="margin:10px 0 4px">${aktarim.sonuc.n} ${{ kursiyer: 'kursiyer', taksit: 'taksit', arac: 'araç' }[aktarim.sonuc.tur]} aktarıldı</h3><p style="color:var(--soluk)">${aktarim.sonuc.atla} satır hatalı olduğu için atlandı. ${{ kursiyer: 'Yapılmış ders sayısına göre aşamaları ayarlandı; KVKK rızası ilk ziyarette alınır. Sırada taksit planı dosyası var.', taksit: 'Ödenmiş taksitler kasaya tahsilat olarak işlendi; ödenmemişler vadesinde hatırlatılır.', arac: 'Muayene ve sigorta bitişleri takibe alındı.' }[aktarim.sonuc.tur]}</p><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><a class="dg dg-ana" href="#/kursiyerler">Kursiyerleri gör</a><button class="dg dg-cizgi" data-aktarim-geri>Bu aktarımı geri al</button><button class="dg dg-hafif" data-aktarim-yeni>Yeni dosya</button></div></div></div>`;
  else if (aktarim.satirlar) {
    const veri = aktarim.satirlar, sonuc = veri.map(kontrolEt);
    const ok = sonuc.filter(s => !s.hata.length).length, hata = sonuc.length - ok, uy = sonuc.filter(s => !s.hata.length && s.uyari.length).length;
    govde = `${olcumler([['Satır', sayi(veri.length)], ['Aktarılacak', sayi(ok), uy ? uy + ' tanesinde uyarı var' : 'Hepsi temiz'], ['Atlanacak', sayi(hata), hata ? 'Ad eksik ya da zaten kayıtlı' : '', hata ? 'uyari' : '']])}<div class="ara-bosluk"></div>
    <div class="izgara iz-12"><div class="kart"><div class="kart-bas"><h3>Sütun eşleştirme</h3><small>Otomatik eşleşti; gerekirse değiştirin</small></div><div class="kart-govde" style="display:grid;gap:8px">${TUR_ALAN().map(([k, t]) => `<label style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;font-size:14px"><b style="color:var(--murekkep)">${t}</b><select class="girdi" style="height:34px" data-esles="${k}"><option value="">— yok —</option>${aktarim.baslik.map((h, i) => `<option value="${i}" ${String(aktarim.esles[k]) === String(i) ? 'selected' : ''}>${e(h)}</option>`).join('')}</select></label>`).join('')}</div></div>
    <div class="kart"><div class="kart-bas"><h3>Önizleme</h3><small>İlk 8 satır</small></div><div class="tablo-kap"><table class="tablo"><thead><tr>${aktarim.tur === 'taksit' ? '<th>Kursiyer</th><th>Vade</th><th>Tutar</th><th>Ödendi</th>' : aktarim.tur === 'arac' ? '<th>Plaka</th><th>Model</th><th>Sınıf</th><th>Muayene</th>' : '<th>Ad soyad</th><th>TC</th><th>Sınıf</th><th>Ücret / ödenen</th>'}<th>Durum</th></tr></thead><tbody>${sonuc.slice(0, 8).map(({ x, hata, uyari, k }) => `<tr>${aktarim.tur === 'taksit' ? `<td>${e(k ? tamAd(k) : x.tc)}</td><td class="mono">${e(x.vade)}</td><td class="mono">${tl(tutarCoz(x.tutar))}</td><td>${e(x.odeme || '—')}</td>` : aktarim.tur === 'arac' ? `<td class="mono">${e(x.plaka)}</td><td>${e(x.model)}</td><td>${e(sinifCoz(x.sinif) || x.sinif)}</td><td>${e(x.muayene)}</td>` : `<td>${e(x.ad + ' ' + x.soyad)}</td><td class="mono">${e(x.tc)}</td><td>${e(sinifCoz(x.sinif) || 'B')}</td><td class="mono">${tl(tutarCoz(x.toplam))} / ${tl(tutarCoz(x.odenen))}</td>`}<td>${hata.length ? rozet(hata[0], 'kirmizi') : uyari.length ? rozet(uyari.join(' · '), 'sari') : rozet('Hazır', 'yesil')}</td></tr>`).join('')}</tbody></table></div>
      <div class="kart-govde"><button class="dg dg-ana" data-aktar-onay ${ok ? '' : 'disabled'}>${sayi(ok)} ${{ kursiyer: 'kursiyeri', taksit: 'taksiti', arac: 'aracı' }[aktarim.tur]} aktar</button> <button class="dg dg-hafif" data-aktarim-yeni>Vazgeç</button></div></div></div>`;
  } else govde = `<div class="kart" style="margin-bottom:16px"><div class="kart-govde"><b style="color:var(--murekkep)">Ne aktarıyorsunuz?</b><div class="secim" style="margin-top:8px">${[['kursiyer', 'Kursiyerler (ders sayılarıyla)'], ['taksit', 'Taksit planı ve ödemeler'], ['arac', 'Araçlar']].map(([v, t]) => `<label><input type="radio" name="akttur" value="${v}" data-akt-tur ${aktarim.tur === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div><small style="display:block;color:var(--soluk);margin-top:8px">Sıra: önce kursiyerler, sonra taksitler (TC ile eşleşir), en son araçlar. Usta öğreticiler kurulumda birlikte girilir.</small></div></div>
    <div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>1 · Eski programdan dışa aktarın</h3></div><div class="kart-govde"><ul class="liste" style="margin:-8px -20px 0">${[['Akınsoft NetSürücü', 'Kursiyer listesi → sağ tık → Excel’e aktar → “CSV (noktalı virgülle ayrılmış)” olarak kaydedin.'], ['Tabim', 'Raporlar → Kursiyer listesi → Excel → CSV olarak kaydedin.'], ['Excel tablonuz', 'Dosya → Farklı kaydet → CSV UTF-8.']].map(([a, b]) => `<li style="align-items:flex-start">${isaret('zorunlu', 20)}<div><b style="color:var(--murekkep);display:block">${a}</b><small style="font-size:13.5px;color:var(--metin)">${b}</small></div></li>`).join('')}</ul>
      <button class="dg dg-hafif dg-kucuk" data-sablon-csv style="margin-top:10px">${ik('indir')}Boş şablon (tüm sütunlar)</button></div></div>
    <div class="kart"><div class="kart-bas"><h3>2 · Dosyayı bırakın</h3></div><div class="kart-govde">
      <label class="yukle" style="position:relative">${isaret('zorunlu', 30)}<span style="flex:1"><b style="display:block;color:var(--murekkep)">CSV dosyası seç</b><small style="color:var(--soluk)">Sütun adları farklı olabilir; Sinyal tanır, siz kontrol edersiniz</small></span><input type="file" accept=".csv,text/csv" data-csv-yukle></label>
      <p style="font-size:13.5px;color:var(--soluk);margin-top:12px">Aktarılan her kayıt kontrol edilir: TC doğrulaması, aynı kişinin iki kez girilmesi, eksik telefon ve tanınmayan sınıf. İsterseniz dosyayı bize gönderin, kontrolü biz yapalım.</p></div></div></div>`;
  return govde;
}
function aktarimUygula() {
  const id = 'akt' + Date.now(); let n = 0, atla = 0;
  if (aktarim.tur === 'taksit') {
    aktarim.satirlar.map(kontrolEt).forEach(({ x, hata, k }) => {
      if (hata.length) { atla++; return; }
      const vade = tarihCoz(x.vade), od = tarihCoz(x.odeme), tutar = tutarCoz(x.tutar), yon = /kart|pos/i.test(x.yontem) ? 'Kart' : /havale|eft|banka/i.test(x.yontem) ? 'Havale' : 'Nakit';
      k.odeme.taksitler.push({ vade, tutar, odendi: od || null, yontem: od ? yon : null, aktarim: id });
      k.odeme.taksitler.sort((a, b) => a.vade.localeCompare(b.vade));
      if (od) S.hareket.unshift({ id: 'h' + Date.now() + n, tarih: od, tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · aktarılan taksit', tutar, yontem: yon, kursiyer: k.id, aktarim: id });
      n++;
    });
  } else if (aktarim.tur === 'arac') {
    aktarim.satirlar.map(kontrolEt).forEach(({ x, hata }, i) => {
      if (hata.length) { atla++; return; }
      S.araclar.push({ id: 'a' + Date.now() + i, aktarim: id, plaka: String(x.plaka).toUpperCase().replace(/\s+/g, ' ').trim(), model: x.model || '', yil: +x.yil || null, sinif: sinifCoz(x.sinif) || 'B', vites: /otomatik/i.test(x.sinif + x.model) ? 'Otomatik' : 'Manuel', km: 0, muayene: tarihCoz(x.muayene) || null, sigorta: tarihCoz(x.sigorta) || null, kasko: null, bakimKm: 10000, egitmen: (S.egitmenler.find(z => z.siniflar.includes(sinifCoz(x.sinif) || 'B')) || S.egitmenler[0]).id, sube: varsayilanSube() });
      n++;
    });
  }
  if (aktarim.tur !== 'kursiyer') { aktarim.sonuc = { id, n, atla, tur: aktarim.tur }; aktarim.satirlar = null; islem(aktarim.tur === 'taksit' ? 'Taksit planı aktardı' : 'Araç aktardı', n + ' kayıt'); kaydet(); return; }
  aktarim.satirlar.map(kontrolEt).forEach(({ x, hata }, i) => {
    if (hata.length) { atla++; return; }
    const sn = sinifCoz(x.sinif) || 'B', toplam = tutarCoz(x.toplam) || SINIFLAR[sn].ucret, od = Math.min(tutarCoz(x.odenen), toplam), kt = tarihCoz(x.kayit) || gun(0);
    const eg = S.egitmenler.find(z => z.siniflar.includes(sn) && (z.sube === varsayilanSube())) || S.egitmenler.find(z => z.siniflar.includes(sn));
    const td = Math.min(SINIFLAR[sn].teorik, Math.round(tutarCoz(x.teorikDers))), dd = Math.min(SINIFLAR[sn].direksiyon, Math.round(tutarCoz(x.direksiyonDers)));
    const asama = dd > 0 ? 'Direksiyon' : td >= SINIFLAR[sn].teorik ? 'Sınav' : td > 0 ? 'Teorik' : 'Evrak';
    S.kursiyerler.push({ id: 'k' + Date.now() + i, aktarim: id, ad: String(x.ad).trim(), soyad: String(x.soyad).trim(), tel: x.tel, tc: String(x.tc || '').trim(), dogumTarihi: tarihCoz(x.dogum), dogum: tarihCoz(x.dogum).slice(0, 4), adres: x.adres || '', ogrenim: '', sinif: sn, kayit: kt, egitmen: eg.id, sube: varsayilanSube(), asama, teorik: td, direksiyon: dd, evrak: Object.fromEntries(EVRAKLAR.map(([z]) => [z, false])), mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam, pesin: od, pesinTarih: kt, taksitler: [], senetli: false }, kaynak: 'Aktarım', yorum: null, notlar: [{ tarih: gun(0), metin: 'Eski programdan aktarıldı.' }], deneme: [], acil: null, kvkk: null });
    n++;
  });
  aktarim.sonuc = { id, n, atla, tur: 'kursiyer' }; aktarim.satirlar = null;
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
function subelerSekme() {
  return `${ekranNotu('Her şube MEB’e göre ayrı izinli bir kurumdur: kendi kurum kodu, müdürü ve MEBBİS hesabı vardır. MEB işlemleri, sınavlar ve denetim dosyası şube seçilerek yapılır; kasa, kursiyer ve araçlar şubeye göre ayrılır.')}
  <div class="kart"><div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Şube</th><th>MEB kurum kodu</th><th>Kurs müdürü</th><th>MEBBİS hesabı</th><th>Kursiyer</th></tr></thead><tbody>${S.subeler.map((x, i) => `<tr><td><input class="girdi" style="height:34px" data-sube-alan="${i}:ad" value="${e(x.ad)}"></td><td><input class="girdi mono" style="height:34px;width:110px" inputmode="numeric" data-sube-alan="${i}:kurumKodu" value="${e(x.kurumKodu || '')}"></td><td><input class="girdi" style="height:34px" data-sube-alan="${i}:mudur" value="${e(x.mudur || '')}"></td><td><input class="girdi" style="height:34px" data-sube-alan="${i}:mebbis" value="${e(x.mebbis || '')}"></td><td class="mono">${S.kursiyerler.filter(k => k.sube === x.id && k.asama !== 'Ehliyet').length}</td></tr>`).join('')}</tbody></table></div>
  <div class="kart-govde"><button class="dg dg-cizgi" data-sube-ekle>${ik('arti')}Şube ekle</button></div></div>`;
}
const ROL = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici' }, ROL_YETKI = { mudur: 'Her şeyi görür, ayarları değiştirir', sekreter: 'Kayıt, kasa, mesajlar, plan', usta: 'Kendi dersleri ve kursiyerleri' };
function kullaniciSekme() {
  const sonGiris = u => (S.islemler.find(x => x.kim === u.ad && x.ne === 'Giriş yaptı') || {}).zaman;
  return `<div class="kart"><div class="kart-bas"><h3>Kullanıcılar</h3><small>${S.kullanicilar.length} kişi · her biri kendi PIN’iyle girer</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-kul-ekle>${ik('arti')}Kullanıcı ekle</button></div></div><ul class="liste">${S.kullanicilar.map(u => { const g = sonGiris(u), ben = oturum.kullanici && oturum.kullanici.id === u.id; return `<li>${avatar(...u.ad.split(' '))}<div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(u.ad)}${ben ? ' · siz' : ''}</b><small style="display:block;color:var(--soluk)">${ROL_YETKI[u.rol]}${u.usta && egitmen(u.usta) ? ' · ' + e(egitmen(u.usta).ad) + ' derslerini görür' : ''}${u.tel ? ' · ' + e(u.tel) : ''} · ${g ? 'son giriş ' + goreli(g.slice(0, 10)) + ' ' + g.slice(11, 16) : 'henüz girmedi'}</small></div><span class="sag" style="gap:6px">${rozet(ROL[u.rol], u.rol === 'mudur' ? 'sari' : 'notr')}<button class="dg dg-hafif dg-kucuk" data-kul-pin="${u.id}">PIN değiştir</button>${ben ? '' : `<button class="dg dg-hafif dg-kucuk" data-kul-sil="${u.id}">Kaldır</button>`}</span></li>`; }).join('')}</ul></div>`;
}
function kullaniciFormu() {
  pencere({
    baslik: 'Kullanıcı ekle',
    icerik: `<form class="form-izgara" id="f-kul"><div class="alan"><label>Ad soyad</label><input name="ad" required autocomplete="off"></div><div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" placeholder="05xx xxx xx xx"></div>
      <div class="alan tam"><span class="et">Rol</span><div class="secim">${Object.entries(ROL).map(([r, t], i) => `<label><input type="radio" name="rol" value="${r}" ${i === 1 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <div class="alan tam" id="kul-usta" hidden><label>Hangi usta öğretici?</label><select name="usta">${S.egitmenler.filter(x => !S.kullanicilar.some(u => u.usta === x.id)).map(x => `<option value="${x.id}">${e(x.ad)}</option>`).join('') || '<option value="">Tüm usta öğreticilerin kullanıcısı var</option>'}</select></div>
      <div class="alan"><label>PIN (4 hane)</label><input name="pin" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div><div class="alan"><label>PIN tekrar</label><input name="pin2" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div></form>
      <p style="font-size:13px;color:var(--soluk);margin-top:10px">PIN’i kişiye yüz yüze söyleyin; ilk girişte kendisi değiştirebilir.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-kul">Ekle</button>`,
    onAc(d) {
      const f = d.querySelector('form'); f.addEventListener('change', () => { d.querySelector('#kul-usta').hidden = f.rol.value !== 'usta'; });
      f.ad.addEventListener('input', () => { const eg = S.egitmenler.find(x => x.ad.toLocaleLowerCase('tr') === f.ad.value.trim().toLocaleLowerCase('tr')); if (eg && [...f.usta.options].some(o => o.value === eg.id)) { f.usta.value = eg.id; f.querySelector('[name=rol][value=usta]').checked = true; d.querySelector('#kul-usta').hidden = false; } });
      f.addEventListener('submit', ev => {
        ev.preventDefault(); const ad = f.ad.value.trim();
        if (ad.length < 3) return bildir('Ad soyad girin', 'uyari');
        if (!/^\d{4}$/.test(f.pin.value)) return bildir('PIN 4 rakam olmalı', 'uyari');
        if (f.pin.value !== f.pin2.value) return bildir('PIN’ler aynı değil', 'uyari');
        if (/^(\d)\1{3}$|^(0123|1234|2345|3456|4567|5678|6789)$/.test(f.pin.value)) return bildir('Bu PIN çok kolay tahmin edilir; başka bir PIN seçin', 'uyari');
        if (f.rol.value === 'usta' && !f.usta.value) return bildir('Usta öğretici seçin', 'uyari');
        S.kullanicilar.push({ id: 'u' + Date.now(), ad, tel: f.tel.value.trim(), rol: f.rol.value, pin: f.pin.value, ...(f.rol.value === 'usta' ? { usta: f.usta.value } : {}) });
        islem('Kullanıcı ekledi', ad + ' · ' + ROL[f.rol.value]); kaydet(); kapatPencere(); bildir(ad + ' eklendi'); yenile();
      });
    },
  });
}
function pinDegistir(u) {
  pencere({
    baslik: 'PIN değiştir · ' + u.ad,
    icerik: `<form class="form-izgara" id="f-pin"><div class="alan"><label>Yeni PIN</label><input name="pin" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div><div class="alan"><label>Tekrar</label><input name="pin2" inputmode="numeric" maxlength="4" autocomplete="new-password" required></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-pin">Kaydet</button>`,
    onAc(d) { d.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target; if (!/^\d{4}$/.test(f.pin.value)) return bildir('PIN 4 rakam olmalı', 'uyari'); if (f.pin.value !== f.pin2.value) return bildir('PIN’ler aynı değil', 'uyari'); if (f.pin.value === u.pin) return bildir('Yeni PIN eskisiyle aynı', 'uyari'); u.pin = f.pin.value; islem('PIN değiştirdi', u.ad); kaydet(); kapatPencere(); bildir(u.ad + ' için PIN değişti'); }); },
  });
}
function sozlesmeSekme() {
  const m = S.kurs.sozlesme && S.kurs.sozlesme.length ? S.kurs.sozlesme : SOZLESME_VARSAYILAN;
  return `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Kursiyer sözleşmesi maddeleri</h3><small>${S.kurs.sozlesme ? 'Kursun metni · ' + (S.kurs.sozlesmeTarih ? tarih(S.kurs.sozlesmeTarih) : '') : 'Varsayılan metin'}</small></div><div class="kart-govde">
    <textarea data-sozlesme-metin style="min-height:420px;font-size:13.5px;line-height:1.55">${e(m.join('\n\n'))}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="dg dg-ana" data-sozlesme-kaydet>Kaydet</button><button class="dg dg-cizgi" data-belge-ac="sozlesme">Önizle</button>${S.kurs.sozlesme ? '<button class="dg dg-hafif" data-sozlesme-varsayilan>Varsayılana dön</button>' : ''}</div></div></div>
    <div class="kart"><div class="kart-bas"><h3>Nasıl yazılır</h3></div><div class="kart-govde" style="font-size:14px;display:grid;gap:10px">
      <p>Her madde ayrı paragraf; aralarında bir boş satır bırakın. İlk cümlenin başındaki kısa başlık (“Ücret ve ödeme.”) kalın yazılır.</p>
      <p>Şu alanlar her kursiyer için otomatik dolar:</p><ul style="margin-left:18px">${[['{kurs}', 'kurs adı'], ['{sinif}', 'sertifika sınıfı'], ['{teorik}', 'teorik saat'], ['{direksiyon}', 'direksiyon ders sayısı'], ['{hak}', 'sınav hakkı'], ['{tekrarE}', 'e-sınav ücreti'], ['{tekrarD}', 'direksiyon tekrar ücreti'], ['{ekDers}', 'ek ders ücreti']].map(([a, b]) => `<li><code>${a}</code> ${b}</li>`).join('')}</ul>
      <p style="color:var(--soluk)">Taraf bilgileri, ücret, indirim ve ödeme planı tablosu sözleşmenin başına kendiliğinden eklenir. Metni avukatınıza ya da mali müşavirinize okutun.</p></div></div></div>`;
}
export const AYAR_SEKMELERI = { kullanici: kullaniciSekme, sozlesme: sozlesmeSekme, subeler: subelerSekme, kurallar: kurallarSekme, guvenlik: guvenlikSekme, entegrasyon: entegrasyonSekme, aktarim: aktarimSekme, gorunum: gorunumSekme };
export function ayarBaglan(k) {
  k.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('[data-kural]')) { const key = t.dataset.kural, eski = S.kurs[key]; S.kurs[key] = +t.value || 0; if (KURAL_KAYNAK[key].tur === 'mevzuat') { S.kurs.kuralDegisen = S.kurs.kuralDegisen || {}; S.kurs.kuralDegisen[key] = true; } islem('Kural değerini değiştirdi', KURAL_KAYNAK[key].ad + ': ' + eski + ' → ' + S.kurs[key]); kaydet(); bildir('Kural kaydedildi'); yenile(); }
    if (t.matches('[data-sube-alan]')) { const [i, alan] = t.dataset.subeAlan.split(':'); S.subeler[+i][alan] = t.value.trim(); islem('Şube bilgisini güncelledi', S.subeler[+i].ad); kaydet(); bildir('Şube bilgisi kaydedildi'); }
    if (t.matches('[data-meb-yontem]')) { if (t.value === 'arac' && !(S.mebArac && S.mebArac.kurulu)) { t.checked = false; k.querySelector('[data-meb-yontem][value="sirali"]').checked = true; return mebAracKur(); } S.kurs.mebYontem = t.value; islem('MEBBİS giriş yöntemini değiştirdi', t.value === 'arac' ? 'Tek tuş aktarımı' : 'Sıralı giriş'); kaydet(); bildir(t.value === 'arac' ? 'Tek tuş aktarımı açık' : 'Sıralı girişe dönüldü'); yenile(); }
    if (t.matches('[data-imza]')) { S.kurs.imzaYontemi = t.value; islem('İmza yöntemini değiştirdi', t.value); kaydet(); bildir('İmza yöntemi kaydedildi'); yenile(); }
    if (t.matches('[data-guv]')) { const [a, b] = t.dataset.guv.split('.'); if (b) S.guvenlik[a][b] = t.checked; else S.guvenlik[a] = t.checked; islem('Güvenlik ayarını değiştirdi', t.dataset.guv + ': ' + (t.checked ? 'açık' : 'kapalı')); kaydet(); bildir('Güvenlik ayarı kaydedildi'); }
    if (t.matches('[data-oturum]')) { S.guvenlik.oturumDk = +t.value; kaydet(); bildir('Oturum süresi kaydedildi'); }
    if (t.matches('[data-kdv]')) { S.entegrasyon.kdv = Math.max(0, Math.min(20, +t.value || 0)); kaydet(); bildir('KDV oranı %' + S.entegrasyon.kdv + ' olarak kaydedildi'); }
    if (t.matches('[data-fatura]')) { S.entegrasyon.fatura = t.value; kaydet(); bildir(t.value === 'kayit' ? 'Kurs ücreti kayıtta faturalanacak; taksitler alacak hesabında' : 'Her tahsilatta e-Arşiv kesilecek'); yenile(); }
    if (t.matches('[data-earsiv-alan]')) { const a = t.dataset.earsivAlan, v = t.value.trim(); if (a === 'seri') { if (!/^[A-Za-zÇĞİÖŞÜçğıöşü]{3}$/.test(v)) return bildir('Seri öneki 3 harf olmalı', 'uyari'); S.entegrasyon.earsiv.seri = v.toLocaleUpperCase('tr'); } else { if (v && !/^\d{10,11}$/.test(v)) return bildir('Vergi no 10, TC no 11 hane olmalı', 'uyari'); S.entegrasyon.vkn = v; } islem('Fatura ayarını değiştirdi', a); kaydet(); bildir('Kaydedildi'); }
    if (t.matches('[data-musavir]')) { S.entegrasyon.musavir.eposta = t.value.trim(); kaydet(); bildir('E-posta kaydedildi'); }
    if (t.matches('[data-musavir-oto]')) { if (t.checked && !S.entegrasyon.musavir.eposta) { t.checked = false; return bildir('Önce mali müşavirin e-postasını yazın', 'uyari'); } S.entegrasyon.musavir.otomatik = t.checked; kaydet(); bildir(t.checked ? 'Her ayın 1’inde otomatik gönderilecek' : 'Otomatik gönderim kapatıldı'); }
    if (t.matches('[data-akt-tur]')) { aktarim.tur = t.value; aktarim.satirlar = null; aktarim.esles = {}; yenile(); }
    if (t.matches('[data-esles]')) { aktarim.esles[t.dataset.esles] = t.value; yenile(); }
    if (t.matches('[data-gorunum]')) { let g = {}; try { g = JSON.parse(localStorage.getItem('sinyal-gorunum') || '{}'); } catch (x) { } g[t.dataset.gorunum] = t.value; try { localStorage.setItem('sinyal-gorunum', JSON.stringify(g)); } catch (x) { } temaUygula(); }
    const f = t.closest('[data-csv-yukle]');
    if (f && f.files[0]) {
      const r = new FileReader(); r.onload = () => {
        const sat = csvOku(String(r.result).replace(/^﻿/, ''));
        if (sat.length < 2) return bildir('Dosyada başlık ve en az bir satır olmalı', 'uyari');
        aktarim.baslik = sat[0]; aktarim.satirlar = sat.slice(1); aktarim.esles = {};
        const nb = sat[0].map(norm);
        TUR_ALAN().forEach(([k, , es]) => { const i = nb.findIndex(h => es.includes(h)); if (i >= 0) aktarim.esles[k] = String(i); });
        yenile();
      }; r.readAsText(f.files[0], 'utf-8');
    }
  });
  k.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-kul-ekle]')) return kullaniciFormu();
    const kp = t.closest('[data-kul-pin]'); if (kp) return pinDegistir(S.kullanicilar.find(u => u.id === kp.dataset.kulPin));
    const ks = t.closest('[data-kul-sil]'); if (ks) { const u = S.kullanicilar.find(x => x.id === ks.dataset.kulSil); if (u.rol === 'mudur' && S.kullanicilar.filter(x => x.rol === 'mudur').length < 2) return bildir('Son kurs müdürü kaldırılamaz', 'uyari'); return pencere({ baslik: u.ad + ' kaldırılsın mı?', icerik: '<p>Bu kişi artık giriş yapamaz. Yaptığı işlemler geçmişte kalır.</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaldır</button>', onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { S.kullanicilar = S.kullanicilar.filter(x => x !== u); islem('Kullanıcı kaldırdı', u.ad); kaydet(); kapatPencere(); bildir(u.ad + ' kaldırıldı'); yenile(); }); } }); }
    if (t.closest('[data-sozlesme-kaydet]')) { const v = k.querySelector('[data-sozlesme-metin]').value.split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean); if (v.length < 3) return bildir('Sözleşmede en az 3 madde olmalı', 'uyari'); const bilinmez = [...new Set((v.join(' ').match(/\{(\w+)\}/g) || []).filter(x => !['{kurs}', '{sinif}', '{teorik}', '{direksiyon}', '{hak}', '{tekrarE}', '{tekrarD}', '{ekDers}'].includes(x)))]; if (bilinmez.length) return bildir('Tanınmayan alan: ' + bilinmez.join(', '), 'uyari'); S.kurs.sozlesme = v; S.kurs.sozlesmeTarih = gun(0); islem('Sözleşme metnini değiştirdi', v.length + ' madde'); kaydet(); bildir('Sözleşme metni kaydedildi; yeni kayıtlar bu metinle hazırlanır'); return yenile(); }
    if (t.closest('[data-sozlesme-varsayilan]')) { S.kurs.sozlesme = null; islem('Sözleşmeyi varsayılana döndürdü'); kaydet(); bildir('Varsayılan metne dönüldü'); return yenile(); }
    if (t.closest('[data-sube-ekle]')) { const n = S.subeler.length + 1; S.subeler.push({ id: 's' + Date.now(), ad: 'Yeni şube ' + n, semt: '', kurumKodu: '', mudur: '', mebbis: '' }); islem('Şube ekledi'); kaydet(); bildir('Şube eklendi; kurum kodunu ve müdürünü yazın'); yenile(); }
    if (t.closest('[data-kural-onay]')) { S.kurs.kuralOnay = { kim: oturum.kullanici ? oturum.kullanici.ad : '', tarih: gun(0) }; islem('Kural değerlerini onayladı'); kaydet(); bildir('Kural değerleri onaylandı'); yenile(); }
    const bo = t.closest('[data-belge-ac]'); if (bo) import('./sayfalar3.js?v=32').then(m => m.belgeAc(bo.dataset.belgeAc));
    const ok = t.closest('[data-oturum-kapat]'); if (ok) { const o = S.guvenlik.oturumlar.splice(+ok.dataset.oturumKapat, 1)[0]; islem('Oturumu kapattırdı', o.kim + ' · ' + o.cihaz); kaydet(); bildir(o.kim + ' · ' + o.cihaz + ' oturumu kapatıldı'); yenile(); }
    const fs = t.closest('[data-fis]'); if (fs) { const n = +fs.dataset.fis, d = new Date(BUGUN); d.setMonth(d.getMonth() - n); csvIndir(`muhasebe-fisleri-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}.csv`, muhasebeFisi(n)); islem('Muhasebe fişlerini indirdi'); kaydet(); }
    if (t.closest('[data-parasut]')) { S.entegrasyon.muhasebe = { tur: 'Paraşüt', bagli: true }; islem('Paraşüt’ü bağladı'); kaydet(); bildir('Paraşüt bağlandı; tahsilatlar artık otomatik aktarılıyor'); yenile(); }
    if (t.closest('[data-personel-ozet]')) { csvIndir('personel-ozeti.csv', personelOzeti()); islem('Personel özetini indirdi'); kaydet(); }
    if (t.closest('[data-sablon-csv]')) csvIndir(`sinyal-${aktarim.tur}-sablonu.csv`, [TUR_ALAN().map(a => a[1]), { kursiyer: ['12345678950', 'Ali', 'Yıldız', '0532 000 00 01', '14.03.2004', 'B', '02.10.2026', '24000', '8000', 'Odunpazarı', '12', '3'], taksit: ['12345678950', '02.11.2026', '4000', '', 'Kart'], arac: ['26 AB 123', 'Renault Clio', '2023', 'B', '12.05.2027', '01.03.2027'] }[aktarim.tur]]);
    if (t.closest('[data-aktar-onay]')) { aktarimUygula(); yenile(); }
    if (t.closest('[data-aktarim-yeni]')) { aktarim.satirlar = null; aktarim.sonuc = null; yenile(); }
    if (t.closest('[data-aktarim-geri]')) { const id = aktarim.sonuc.id; S.kursiyerler = S.kursiyerler.filter(x => x.aktarim !== id); S.kursiyerler.forEach(k => { k.odeme.taksitler = k.odeme.taksitler.filter(x => x.aktarim !== id); }); S.hareket = S.hareket.filter(x => x.aktarim !== id); S.araclar = S.araclar.filter(x => x.aktarim !== id); islem('Aktarımı geri aldı', aktarim.sonuc.n + ' kayıt'); kaydet(); aktarim.sonuc = null; bildir('Aktarım geri alındı'); yenile(); }
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
        <li>Belgenin üzerindeki <b>geçerlilik (son) tarihini</b> girin; bitmesine 30 gün kala size ve kursiyere hatırlatma gider.<input class="girdi" type="date" style="margin-top:6px;max-width:200px" data-gecerlilik value="${e(v && v.gecerlilik ? v.gecerlilik : '')}"></li>
        <li>Eşleşiyorsa “Doğruladım”a basın; kim, ne zaman doğruladı kayda geçer ve denetim dosyasında görünür.</li></ol>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-dogruladim>Doğruladım</button>`,
    onAc(d) { d.querySelector('[data-dogruladim]').addEventListener('click', () => { const kod = d.querySelector('[data-kod]').value.trim(); if (!kod) return bildir('Önce belge numarasını yazın', 'uyari'); k.dogrulama = k.dogrulama || {}; k.dogrulama[tur] = { kod, kim: oturum.kullanici ? oturum.kullanici.ad : '', tarih: gun(0), gecerlilik: d.querySelector('[data-gecerlilik]').value || null }; if (tur === 'adli') k.adliSicil = { barkod: kod }; else { k.saglikRapor = k.saglikRapor || {}; k.saglikRapor.no = kod; } islem('Evrak doğruladı', tamAd(k) + ' · ' + ad); kaydet(); kapatPencere(); bildir(ad + ' doğrulandı'); yenile(); }); },
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

/* ================= MEBBİS TEK TUŞ AKTARIM (isteğe bağlı) =================
   Rakiplerdeki gibi: kurs bilgisayarındaki MEBBİS Aracı, kursun kendi MEBBİS oturumunu açar ve
   formları doldurur. Şifre bu bilgisayarda kalır, Sinyal sunucusuna gelmez. Güvenlik kodunu kullanıcı girer.
   ⚠ Basına yansıyan Temmuz 2026 MEB yazısı bot/makro/eklenti ve şifre paylaşımını yasaklıyor;
   bu yüzden varsayılan değil, kurs müdürünün onayıyla açılır. */
export const MEB_RISK = 'Basına yansıyan Temmuz 2026 tarihli MEB yazısına göre MEBBİS’te bot, makro, tarayıcı eklentisi gibi yetkisiz yazılımların kullanımı ve kullanıcı bilgilerinin paylaşılması yasaklandı. Tek tuş aktarımı da MEBBİS ekranlarını otomatik doldurur ve bu kapsama girebilir. Rakip programlar aynı yöntemi kullanıyor; kullanmadan önce il MEM’inize danışmanızı öneririz.';
export function mebKuyruk() {
  const kayit = sb(S.kursiyerler).filter(k => !k.mebIslendi && !eksikEvrak(k).length);
  const ders = sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && !d.meb);
  const gunler = [...new Set(ders.map(d => d.tarih))].sort();
  const sinav = sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && !s.mebBildirim);
  return { kayit, ders, gunler, sinav, toplam: kayit.length + gunler.length + sinav.length };
}
const isGunuSay = t => { let n = 0; const d = new Date(BUGUN), son = tarihOku(t); while (d < son) { d.setDate(d.getDate() + 1); if (d < son && d.getDay() !== 0 && d.getDay() !== 6) n++; } return n; };
export const mebAracHazir = () => S.kurs.mebYontem === 'arac' && S.mebArac && S.mebArac.kurulu;
export function mebAktarimKarti() {
  const q = mebKuyruk(), son = (S.mebAktarimlar || [])[0];
  if (!mebAracHazir()) return `<div class="kart" style="margin-bottom:16px"><div class="kart-govde" style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">${isaret('zorunlu', 30)}<div style="flex:1;min-width:240px"><b style="color:var(--murekkep);font-family:var(--baslik);font-size:16px">Tek tuşla MEBBİS aktarımı</b><p style="font-size:14px">Kursiyer kaydı, direksiyon programı ve sınav bildirimi tek tuşla MEBBİS’e girilir. Kurs bilgisayarına küçük bir araç kurulur; MEBBİS şifreniz o bilgisayarda kalır. İsteğe bağlıdır, varsayılan yöntem şifresiz sıralı giriştir.</p></div><button class="dg dg-ana" data-meb-arac-kur>Nasıl çalışır, kur</button></div></div>`;
  return `<div class="kart meb-aktar" style="margin-bottom:16px"><div class="kart-govde" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
    <div style="flex:1;min-width:240px"><b style="color:var(--murekkep);font-family:var(--baslik);font-size:17px">MEBBİS’e aktarılacak</b><p style="font-size:14px;margin-top:2px">${q.kayit.length} kursiyer kaydı · ${q.ders.length} ders (${q.gunler.length} gün) · ${q.sinav.length} sınav bildirimi</p>${son ? `<small style="color:var(--soluk)">Son aktarım: ${tarih(son.tarih)} ${e(son.saat)} · ${e(son.kim)} · ${son.ok} işlem${son.hata ? ', ' + son.hata + ' hata' : ''}</small>` : ''}</div>
    ${cokSube() && !seciliSube() ? `<span style="font-size:13.5px;color:var(--soluk);max-width:220px">Her şubenin MEBBİS hesabı ayrı; aktarmak için önce şube seçin.</span>` : `<button class="dg dg-ana" style="height:48px;padding:0 22px;font-size:16px" data-meb-aktar ${q.toplam ? '' : 'disabled'}>${ik('ok')}${seciliSube() ? e(seciliSube().ad) + ' için ' : ''}MEBBİS’e aktar</button>`}</div></div>`;
}
export function mebAracKur() {
  pencere({
    baslik: 'Tek tuşla MEBBİS aktarımı', genis: true,
    icerik: `<ol style="padding-left:18px;display:grid;gap:12px;font-size:14.5px">
      <li><b>Kurs bilgisayarına MEBBİS Aracı’nı kurun</b><br><small style="color:var(--soluk)">Windows için küçük bir program. MEBBİS’i kursun kendi bilgisayarında, kursun kendi oturumuyla açar.</small></li>
      <li><b>MEBBİS kullanıcı adınızı ve şifrenizi araca girin</b><br><small style="color:var(--soluk)">Şifre yalnızca o bilgisayarda, şifreli saklanır. Sinyal sunucusuna ve bize gelmez.</small></li>
      <li><b>Sinyal’den “Tek tuşla aktar”a basın</b><br><small style="color:var(--soluk)">Araç sıradaki kayıtları MEBBİS’e girer. MEBBİS’in güvenlik kodunu siz yazarsınız; kural dışı bir kayıt varsa girilmez, size raporlanır.</small></li></ol>
      <div class="ipucu uyari" style="margin-top:16px;align-items:flex-start">${isaret('uyari', 22)}<span>${MEB_RISK}</span></div>
      <label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;font-size:14.5px"><input type="checkbox" data-meb-onay style="width:18px;height:18px;margin-top:2px"><span>Yukarıdaki uyarıyı okudum. Aktarım kursun kendi MEBBİS hesabıyla, kursun bilgisayarından yapılır; bu yöntemi kullanma kararı ve sorumluluğu kurs yönetimindedir.</span></label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Şimdilik sıralı girişle devam</button><button class="dg dg-ana" data-meb-kur>Aracı kurdum, etkinleştir</button>`,
    onAc(d) {
      d.querySelector('[data-meb-kur]').addEventListener('click', () => {
        if (!d.querySelector('[data-meb-onay]').checked) return bildir('Önce uyarıyı onaylayın', 'uyari');
        S.mebArac = { kurulu: true, bilgisayar: 'KURS-PC (Windows)', onay: { kim: oturum.kullanici ? oturum.kullanici.ad : '', tarih: gun(0) } };
        S.kurs.mebYontem = 'arac'; islem('Tek tuş MEBBİS aktarımını etkinleştirdi', 'Uyarıyı onayladı'); kaydet(); kapatPencere(); bildir('Tek tuş aktarımı açıldı'); yenile();
      });
    },
  });
}
export function mebAktar() {
  const q = mebKuyruk(); if (!q.toplam) return bildir('Aktarılacak kayıt yok');
  const kod = Array.from({ length: 5 }, () => 'ABCDEFGHJKMNPRSTUVYZ23456789'[Math.floor(Math.random() * 28)]).join('');
  const satirlar = [
    ...q.kayit.map(k => ({ tur: 'kayit', ad: tamAd(k) + ' · kursiyer kaydı', k, hata: !tcGecerli(k.tc || '') ? 'TC kimlik numarası geçersiz; MEBBİS kabul etmez' : !k.dogumTarihi ? 'Doğum tarihi eksik' : null })),
    ...q.gunler.map(g => { const n = q.ders.filter(d => d.tarih === g).length; return { tur: 'program', ad: `${tarih(g)} direksiyon programı · ${n} ders`, g, hata: fark(g) < S.kurs.programOnGun ? `Program en az ${S.kurs.programOnGun} gün önce girilmeli; MEBBİS bu günü kabul etmez` : null }; }),
    ...q.sinav.map(s => { const ig = isGunuSay(s.tarih); return { tur: 'sinav', ad: `${tarih(s.tarih)} direksiyon sınavı bildirimi · ${s.kursiyerler.length} kursiyer`, s, hata: ig < S.kurs.sinavBildirimIsGunu ? `Bildirim sınavdan en geç ${S.kurs.sinavBildirimIsGunu} iş günü önce yapılmalıydı (kalan ${ig}); il MEM ile görüşün` : null }; }),
  ];
  pencere({
    baslik: 'MEBBİS’e aktarım', genis: true,
    icerik: `<div data-asama="kod"><p style="font-size:14.5px;margin-bottom:12px">MEBBİS Aracı kurs bilgisayarında oturumu açtı. MEBBİS’in gösterdiği güvenlik kodunu yazın:</p>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="guv-kod" aria-label="Güvenlik kodu görseli">${kod}</span><input class="girdi" style="max-width:180px;text-transform:uppercase" data-guv-kod placeholder="Güvenlik kodu" autocomplete="off"><button class="dg dg-ana" data-baslat>Aktarımı başlat</button></div>
        <p style="font-size:13px;color:var(--soluk);margin-top:10px">${satirlar.length} işlem sırada. Kural dışı olanlar girilmez, raporlanır.</p></div>
      <ul class="liste aktar-log" data-log hidden>${satirlar.map((x, i) => `<li data-i="${i}">${isaret('bilgi', 20)}<span style="flex:1">${e(x.ad)}</span><small style="color:var(--soluk)">Sırada</small></li>`).join('')}</ul>
      <div data-ozet></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc(d) {
      const kodIn = d.querySelector('[data-guv-kod]');
      const basla = () => {
        if (kodIn.value.trim().toUpperCase() !== kod) return bildir('Güvenlik kodu hatalı; tekrar yazın', 'uyari');
        d.querySelector('[data-asama="kod"]').hidden = true; d.querySelector('[data-log]').hidden = false;
        let i = 0, ok = 0, hata = 0;
        const adim = () => {
          if (i >= satirlar.length) {
            const kayit = { tarih: gun(0), saat: new Date().toTimeString().slice(0, 5), kim: oturum.kullanici ? oturum.kullanici.ad : '', ok, hata };
            S.mebAktarimlar = [kayit, ...(S.mebAktarimlar || [])].slice(0, 20);
            islem('MEBBİS’e tek tuşla aktardı', `${ok} işlem${hata ? ', ' + hata + ' hata' : ''}`); kaydet();
            d.querySelector('[data-ozet]').innerHTML = `<div class="ipucu ${hata ? 'uyari' : ''}" style="margin-top:12px">${isaret(hata ? 'uyari' : 'tamam', 22)}<span><b>${ok} işlem MEBBİS’e girildi.</b> ${hata ? hata + ' işlem kural dışı olduğu için girilmedi; düzeltip tekrar aktarın.' : 'Hepsi tamam.'} MEBBİS’in verdiği kayıt numaraları kursiyer dosyalarına yazıldı.</span></div>`;
            d.querySelector('[data-kapat]').textContent = 'Bitti'; d.querySelector('[data-kapat]').addEventListener('click', () => yenile(), { once: true });
            return;
          }
          const x = satirlar[i], li = d.querySelector(`[data-i="${i}"]`);
          li.querySelector('small').textContent = 'Giriliyor…';
          setTimeout(() => {
            if (x.hata) { hata++; li.innerHTML = `${isaret('dur', 20)}<span style="flex:1">${e(x.ad)}<small style="display:block;color:var(--kirmizi)">${e(x.hata)}</small></span><small style="color:var(--kirmizi)">Girilmedi</small>`; }
            else {
              ok++;
              if (x.tur === 'kayit') { x.k.mebIslendi = true; x.k.mebNo = 'MEB-' + (Date.now() % 1e7 + i); }
              if (x.tur === 'program') S.dersler.filter(dd => dd.tarih === x.g && dd.durum === 'Planlandı').forEach(dd => { dd.meb = true; });
              if (x.tur === 'sinav') x.s.mebBildirim = true;
              li.innerHTML = `${isaret('tamam', 20)}<span style="flex:1">${e(x.ad)}</span><small style="color:var(--yesil)">Girildi</small>`;
            }
            i++; adim();
          }, 260);
        };
        adim();
      };
      d.querySelector('[data-baslat]').addEventListener('click', basla);
      kodIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') basla(); });
    },
  });
}

/* ================= GENEL SIRALI GİRİŞ PENCERESİ (program, sınav bildirimi) ================= */
function panoya(metin) {
  try { if (navigator.clipboard) return navigator.clipboard.writeText(metin).then(() => true, () => yedek()); } catch (x) { }
  return Promise.resolve(yedek());
  function yedek() { const t = document.createElement('textarea'); t.value = metin; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { } t.remove(); return ok; }
}
// alanlar: [[grup, etiket, değer]] · bitince(): "Girdim" sonrası
export function siraliPencere(baslik, alanlar, bitince) {
  let i = 0; const bas = Date.now();
  pencere({
    baslik, icerik: `<p style="font-size:14px;margin-bottom:12px">MEBBİS’i yanda açın. Her Enter’da sıradaki değer panoya kopyalanır; MEBBİS’te ilgili alana yapıştırın.</p><div data-sira></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc(d) {
      const yer = d.querySelector('[data-sira]');
      const ciz = () => {
        const a = alanlar[i];
        yer.innerHTML = a ? `<div class="sira-bar" style="position:static;margin:0"><div class="sira-ust"><span>${i + 1}/${alanlar.length} · ${e(a[0])}</span></div><div class="sira-govde"><div style="min-width:0;flex:1"><small>${e(a[1])}</small><b class="mono">${e(a[2] || '—')}</b></div><button class="dg dg-ana" data-sk>Kopyala, sonrakine geç <kbd>Enter</kbd></button><button class="dg dg-cizgi dg-kucuk" data-sa>Atla</button></div></div>${ilerleme(i, alanlar.length, 'yesil')}`
          : `<div class="ipucu">${isaret('tamam', 22)}<span><b>Bütün değerler kopyalandı.</b> ${Math.round((Date.now() - bas) / 1000)} sn sürdü. MEBBİS’te kaydedip onaylayın.</span></div><button class="dg dg-ana" style="margin-top:12px" data-sb>MEBBİS’e girdim</button>`;
        const sk = yer.querySelector('[data-sk]'); if (sk) sk.focus();
      };
      const ileri = () => { const a = alanlar[i]; if (!a) return; panoya(a[2] || '').then(ok => { if (ok === false) bildir('Kopyalanamadı; değeri elle seçin', 'uyari'); i++; ciz(); }); };
      yer.addEventListener('click', ev => { if (ev.target.closest('[data-sk]')) ileri(); if (ev.target.closest('[data-sa]')) { i++; ciz(); } if (ev.target.closest('[data-sb]')) { kapatPencere(); bitince && bitince(); } });
      d.addEventListener('keydown', ev => { if (ev.key === 'Enter' && alanlar[i] && !ev.target.closest('[data-sk],[data-sa]')) { ev.preventDefault(); ileri(); } });
      ciz();
    },
  });
}
