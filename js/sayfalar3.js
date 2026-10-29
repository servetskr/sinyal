import { S, kaydet, gun, fark, iso, BUGUN, SINIFLAR, EVRAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gonderimEkle, tcGecerli, islem, oturum, eksikEvrak, mebOnKontrol, tcMaskele, yas } from './veri.js?v=24';
import { e, tl, ik, rozet, plaka, bos, isaret, yonLevhasi, ekranNotu, aracGorsel, pencere, kapatPencere, bildir, tarih, tarihUzun, bugunMetni, fotoKucult, csvIndir, olcumler } from './ui.js?v=24';
import { yenile } from './app.js?v=24';

/* ================= BELGELER VE ÇIKTILAR ================= */
const SABLONLAR = [
  ['sozlesme', 'Kursiyer sözleşmesi', 'Ücret, taksit planı ve imza alanlarıyla', 'kursiyer'],
  ['bilgi', 'Kursiyer bilgi formu', 'Kimlik, iletişim, acil durum kişisi, evrak durumu', 'kursiyer'],
  ['takip', 'Direksiyon eğitimi takip formu', 'Yapılan dersler, usta öğretici ve araç, imza sütunu', 'kursiyer'],
  ['makbuz', 'Tahsilat makbuzu', 'Son alınan ödeme için', 'kursiyer'],
  ['senet', 'Senet', 'Senetli ödeme planı olan kursiyerler için', 'senet'],
  ['program', 'Haftalık ders programı', 'Usta öğreticiye göre, kapıya asılacak çizelge', 'egitmen'],
  ['sinav', 'Sınav listesi', 'Oturuma giden kursiyerler, imza sütunuyla', 'sinav'],
  ['denetim', 'Denetim dosyası', 'Kursiyer, ders, araç ve personel kayıtları; eksikler en başta', 'tek'],
  ['ek1', 'Kursiyer kayıt formu (EK-1 düzeni)', 'MTSK Yönetmeliği ekindeki kayıt formu düzeninde', 'kursiyer'],
  ['devam', 'Teorik devam çizelgesi', 'Gruplara göre katılım ve imza sütunu', 'tek'],
  ['hizmet', 'Sinyal hizmet sözleşmesi', 'Erişilebilirlik, sorumluluk, veri teslimi, fesih', 'tek'],
  ['vis', 'Veri işleme sözleşmesi', 'KVKK: kurs veri sorumlusu, Sinyal veri işleyen', 'tek'],
  ['aydinlatma', 'Asistan aydınlatma metni', 'Mesajlaşma kanallarında kişiye gösterilen metin', 'tek'],
];
const imzaHucre = (d, kim) => `<td style="width:90px;text-align:center">${d.imza ? (d.imza[kim] ? `<img src="${d.imza[kim]}" alt="" style="height:26px">` : '<small>dijital ✓</small>') : ''}</td>`;
const kursBas = baslik => `<h1>${e(baslik)}</h1><p class="a4-alt">${e(S.kurs.ad)} · ${e(S.kurs.adres)} · ${e(S.kurs.tel)}</p>`;
function belgeHtml(tur, id) {
  if (tur === 'denetim') {
    const eks = denetimEksikleri(), akt = S.kursiyerler.filter(k => k.asama !== 'Ehliyet');
    const yap = S.dersler.filter(d => d.durum === 'Yapıldı'), imz = yap.filter(d => d.imza).length;
    const BG = { sertifika: 'Sertifika', saglik: 'Sağlık raporu', adli: 'Adli sicil' };
    return kursBas('Denetim dosyası') + `<p><b>Hazırlanma:</b> ${tarihUzun(gun(0))} · ${e(oturum.kullanici ? oturum.kullanici.ad : '')}</p>
      <p><b>1. Eksikler (${eks.length})</b></p><table>${eks.map(x => `<tr><td>${e(x[1])}</td><td>${e(x[2])}</td></tr>`).join('') || '<tr><td>Eksik yok.</td></tr>'}</table>
      <p><b>2. Aktif kursiyerler (${akt.length})</b></p><table><tr><th>TC</th><th>Ad soyad</th><th>Sınıf</th><th>Aşama</th><th>Evrak</th><th>MEBBİS</th><th>KVKK</th></tr>${akt.map(k => `<tr><td>${tcMaskele(k.tc)}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${k.asama}</td><td>${EVRAKLAR.length - eksikEvrak(k).length}/${EVRAKLAR.length}</td><td>${k.mebIslendi ? 'Girildi' : 'Bekliyor'}</td><td>${k.kvkk && k.kvkk.riza ? 'Rıza var' : 'YOK'}</td></tr>`).join('')}</table>
      <p><b>3. Direksiyon dersleri</b></p><table><tr><th>Yapılan ders</th><td>${yap.length}</td><th>İmzalı</th><td>${imz} (%${Math.round(imz / Math.max(1, yap.length) * 100)})</td></tr></table>
      <p><b>4. Araçlar</b></p><table><tr><th>Plaka</th><th>Model</th><th>Muayene</th><th>Sigorta</th><th>Kasko</th></tr>${S.araclar.map(a => `<tr><td>${a.plaka}</td><td>${e(a.model)}</td><td>${tarih(a.muayene)}</td><td>${tarih(a.sigorta)}</td><td>${a.kasko ? tarih(a.kasko) : '—'}</td></tr>`).join('')}</table>
      <p><b>5. Usta öğreticiler</b></p><table><tr><th>Ad</th>${Object.values(BG).map(x => `<th>${x}</th>`).join('')}</tr>${S.egitmenler.map(x => `<tr><td>${e(x.ad)}</td>${Object.keys(BG).map(b => `<td>${tarih((x.belgeler || {})[b])}${(x.belgeler || {})[b] < gun(0) ? ' (DOLMUŞ)' : ''}</td>`).join('')}</tr>`).join('')}</table>
      <div class="imza"><div>Hazırlayan</div><div>Kurs müdürü</div></div>`;
  }
  if (tur === 'devam') {
    const gr = { aksam: 'Akşam grubu', sabah: 'Sabah grubu' };
    return kursBas('Teorik ders devam çizelgesi') + Object.entries(gr).map(([g, ad]) => { const l = S.kursiyerler.filter(k => k.asama === 'Teorik' && (k.teorikGrup || 'aksam') === g); return `<p><b>${ad}</b> · ${l.length} kursiyer</p><table><tr><th>#</th><th>TC</th><th>Ad soyad</th><th>Sınıf</th><th>Katıldığı ders</th><th>Devamsızlık</th><th>İmza</th></tr>${l.map((k, i) => `<tr><td>${i + 1}</td><td>${e(k.tc)}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${k.teorik} / ${SINIFLAR[k.sinif].teorik}</td><td>${k.devamsiz || 0}</td><td style="width:90px"></td></tr>`).join('') || '<tr><td colspan="7">Bu grupta teorik aşamada kursiyer yok.</td></tr>'}</table>`; }).join('') + `<div class="imza"><div>Teorik öğretmen</div><div>Kurs müdürü</div></div>`;
  }
  if (tur === 'hizmet') return kursBas('Sinyal hizmet sözleşmesi (özet taslak)') + `<p><b>Taraflar:</b> ${e(S.kurs.ad)} (“Kurs”) ile Sinyal yazılım hizmetini sunan şirket (“Sağlayıcı”). Unvan, vergi ve MERSİS bilgileri imza aşamasında doldurulur.</p>
      <p><b>1. Erişilebilirlik.</b> Aylık en az %99,5. Altına düşen her tam gün için o ayın ücretinin 1/30’u iade edilir. Sınav günlerinde (Cumartesi dahil) destek öncelikli ve 30 dakika içinde döner. Planlı bakım gece 02:00–05:00 arasında ve 48 saat önceden bildirilir.</p>
      <p><b>2. Mevzuat kontrolleri.</b> Sinyal’in MEB kural kontrolleri yardımcıdır; değerlerin kaynağı ekranda gösterilir. Sağlayıcı mevzuat değişikliklerini haftalık izler ve yayımından itibaren 5 iş günü içinde kursa bildirir. Bildirimi yapılmamış bir değişiklikten doğan idari para cezasında Sağlayıcı, ödenen yıllık ücret tutarına kadar sorumludur. MEBBİS’e giriş ve son karar Kurs’tadır.</p>
      <p><b>3. Veriler.</b> Kurs veri sorumlusu, Sağlayıcı veri işleyendir (ayrı Veri İşleme Sözleşmesi). Veriler Türkiye’deki sunucuda, şifreli saklanır; her gece yedeklenir. Kurs istediği an tüm verisini indirebilir.</p>
      <p><b>4. Hizmetin devamlılığı.</b> Sağlayıcı faaliyetini durdurursa: en az 90 gün önceden bildirir, tüm veriyi Excel ve veritabanı yedeği olarak teslim eder ve yazılımın Kurs’un kendi sunucusunda çalışacak sürümünü kaynak koduyla birlikte ücretsiz verir (kaynak kod emaneti noterde tutulur).</p>
      <p><b>5. Sosyal medya hesapları.</b> Asistan Meta’nın resmî bağlantısıyla, yalnızca gelen mesajlara cevap verir. Meta’nın hesap kısıtlaması hâlinde asistan durdurulur, itiraz sürecinde Sağlayıcı ücretsiz destek verir. Kısıtlama Sağlayıcı’nın kural dışı bir gönderiminden kaynaklanırsa o ayın ücreti alınmaz.</p>
      <p><b>6. Ücret ve fesih.</b> Aylık ücret, pakette yazılı WhatsApp ve SMS kotası dahil sabittir; kota aşımında kursa önceden onay sorulur. Taahhüt yoktur; Kurs ay sonunda feshedebilir. Fesihten sonra veriler 30 gün içinde teslim edilip silinir.</p>
      <div class="imza"><div>Kurs</div><div>Sağlayıcı</div></div>`;
  if (tur === 'vis') return kursBas('Veri işleme sözleşmesi (KVKK, özet taslak)') + `<p><b>Veri sorumlusu:</b> ${e(S.kurs.ad)} · <b>Veri işleyen:</b> Sinyal hizmet sağlayıcısı</p>
      <table><tr><th>İşlenen veri</th><td>Kimlik, iletişim, öğrenim, sağlık raporu ve adli sicil (özel nitelikli), ödeme, ders ve sınav kayıtları, mesajlaşma içerikleri</td></tr>
      <tr><th>Amaç</th><td>Sürücü kursu eğitiminin yürütülmesi, MEB mevzuatı gereği kayıtlar, ödeme ve iletişim</td></tr>
      <tr><th>Yer</th><td>Türkiye’deki veri merkezi. Asistanın dil modeli ${(S.sosyal && S.sosyal.ayar.veri.konum === 'ab') ? 'AB’de çalışır; yurt dışı aktarım standart sözleşmeyle yapılır ve KVKK Kurulu’na bildirilir' : 'Türkiye’de çalışır; yurt dışına aktarım yoktur'}.</td></tr>
      <tr><th>Güvenlik</th><td>Diskte ve aktarımda şifreleme, iki adımlı giriş, rol bazlı yetki, erişim kaydı, gece yedeği (30 gün)</td></tr>
      <tr><th>Alt işleyenler</th><td>Veri merkezi, e-Arşiv entegratörü, WhatsApp/Meta (yalnızca mesaj iletimi), SMS sağlayıcısı. Değişiklik 30 gün önce bildirilir.</td></tr>
      <tr><th>İhlal bildirimi</th><td>Öğrenildiği andan itibaren en geç 24 saat içinde kursa</td></tr>
      <tr><th>Saklama ve imha</th><td>Kursun belirlediği sürelerle; sözleşme bitince 30 gün içinde teslim ve imha</td></tr></table>
      <div class="imza"><div>Veri sorumlusu</div><div>Veri işleyen</div></div>`;
  if (tur === 'aydinlatma') { const v = S.sosyal ? S.sosyal.ayar.veri : { konum: 'tr', saklamaAy: 12 }; return kursBas('Mesajlaşma kanalları aydınlatma metni') + `<p>${e(S.kurs.ad)} olarak Instagram, Facebook ve WhatsApp üzerinden bize yazdığınız mesajları; kurs hakkında bilgi vermek, kayıt görüşmesi ayarlamak ve sizi geri aramak amacıyla işliyoruz.</p>
      <p>Mesajlarınıza ilk olarak bir yapay zekâ asistanı cevap verir. Asistan yalnızca kursun onayladığı bilgileri kullanır; sağlık durumu, şikâyet ve pazarlık gibi konuları kurs yetkilisine aktarır. TC kimlik numarası, telefon ve sağlık bilgisi gibi hassas veriler, asistanın dil modeline gönderilmeden gizlenir.</p>
      <p>Mesajlarınız ${v.konum === 'tr' ? 'Türkiye’deki sunucularda işlenir, yurt dışına aktarılmaz' : 'Avrupa Birliği’ndeki bir sunucuda işlenir; bu aktarım KVKK’ya uygun standart sözleşmeyle yapılır'}. Konuşmalar ${v.saklamaAy} ay saklanır, ardından silinir.</p>
      <p>KVKK’nın 11. maddesi kapsamındaki haklarınız (bilgi talep etme, düzeltme, silme, itiraz) için ${e(S.kurs.tel)} numarasından ya da kursa yazılı olarak başvurabilirsiniz.</p>`; }
  if (tur === 'program') {
    const eg = egitmen(id), gunler = []; for (let n = 0; n < 7; n++) gunler.push(gun(n));
    return kursBas('Haftalık direksiyon programı') + `<p><b>Usta öğretici:</b> ${e(eg.ad)} &nbsp; <b>Araç:</b> ${e((S.araclar.find(a => a.egitmen === eg.id) || {}).plaka || '—')}</p><table><tr><th>Gün</th><th>Saat</th><th>Kursiyer</th><th>Telefon</th></tr>${gunler.flatMap(g => S.dersler.filter(d => d.egitmen === eg.id && d.tarih === g).sort((a, b) => a.saat.localeCompare(b.saat)).map(d => `<tr><td>${tarihUzun(g)}</td><td>${d.saat}</td><td>${e(tamAd(kursiyer(d.kursiyer)))}</td><td>${e(kursiyer(d.kursiyer).tel)}</td></tr>`)).join('') || '<tr><td colspan="4">Bu hafta ders yok.</td></tr>'}</table>`;
  }
  if (tur === 'sinav') {
    const s = S.sinavlar.find(x => x.id === id);
    return kursBas(s.tur + ' listesi') + `<p><b>Tarih:</b> ${tarihUzun(s.tarih)} ${s.saat} &nbsp; <b>Yer:</b> ${e(s.yer)}</p><table><tr><th>#</th><th>Ad soyad</th><th>Sınıf</th><th>Telefon</th><th>İmza</th></tr>${s.kursiyerler.map(kursiyer).filter(Boolean).map((k, i) => `<tr><td>${i + 1}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${e(k.tel)}</td><td style="width:120px"></td></tr>`).join('')}</table>`;
  }
  const k = kursiyer(id); if (!k) return '';
  const S0 = SINIFLAR[k.sinif];
  if (tur === 'sozlesme') return kursBas('Kursiyer sözleşmesi') + `<table><tr><th>Kursiyer</th><td>${e(tamAd(k))}</td><th>Telefon</th><td>${e(k.tel)}</td></tr><tr><th>Sınıf</th><td>${S0.ad}</td><th>Kayıt tarihi</th><td>${tarih(k.kayit)}</td></tr><tr><th>Kurs ücreti</th><td>${tl(k.odeme.toplam)}</td><th>Peşinat</th><td>${tl(k.odeme.pesin)}</td></tr></table>
    <p><b>Ödeme planı</b></p><table><tr><th>#</th><th>Vade</th><th>Tutar</th></tr>${k.odeme.taksitler.map((t, i) => `<tr><td>${i + 1}</td><td>${tarih(t.vade)}</td><td>${tl(t.tutar)}</td></tr>`).join('') || '<tr><td colspan="3">Peşin ödeme</td></tr>'}</table>
    <p>Kurs, ${S0.ad} sınıfı için teorik dersleri ve ${S0.direksiyon} direksiyon dersini verir. Kursiyer derslere zamanında katılmayı, ödeme planına uymayı kabul eder. Gelinemeyecek dersler en az bir gün önce bildirilir.</p>
    <p style="color:#666;font-size:11.5px">Bu örnek şablondur; kurs kendi sözleşme metnini Ayarlar’dan ekler.</p>
    <div class="imza"><div>Kursiyer · ${e(tamAd(k))}</div><div>Kurs müdürü · ${e(S.kurs.ad)}</div></div>`;
  if (tur === 'ek1') return kursBas('Motorlu taşıt sürücüleri kursu kursiyer kayıt formu') + `<p style="font-size:11.5px;color:#555">MTSK Yönetmeliği ekindeki kayıt formu düzeninde hazırlanmıştır. İl MEM’inizin örneğiyle farklılık varsa bildirin, 1 iş günü içinde güncellenir.</p>
      <table><tr><th>TC kimlik no</th><td>${e(k.tc || '')}</td><th>Kayıt tarihi</th><td>${tarih(k.kayit)}</td></tr>
      <tr><th>Adı</th><td>${e(k.ad)}</td><th>Soyadı</th><td>${e(k.soyad)}</td></tr>
      <tr><th>Doğum tarihi</th><td>${e(k.dogumTarihi ? k.dogumTarihi.split('-').reverse().join('.') : k.dogum || '')}</td><th>Öğrenim durumu</th><td>${e(k.ogrenim || '')}</td></tr>
      <tr><th>İstenen sertifika</th><td>${S0.ad}</td><th>Mevcut sürücü belgesi</th><td>${e(k.mevcutEhliyet || 'Yok')}</td></tr>
      <tr><th>Adres</th><td colspan="3">${e(k.adres || '')}</td></tr><tr><th>Telefon</th><td>${e(k.tel)}</td><th>Dönem / grup</th><td>${(k.teorikGrup || 'aksam') === 'sabah' ? 'Sabah' : 'Akşam'}</td></tr></table>
      <p><b>Teslim alınan belgeler</b></p><table>${EVRAKLAR.map(([x, t]) => `<tr><td>${t}</td><td style="width:80px">${k.evrak[x] ? 'Var' : 'Yok'}</td></tr>`).join('')}</table>
      <p style="font-size:12px">Beyan ettiğim bilgilerin doğru olduğunu, kişisel verilerimin aydınlatma metninde belirtilen amaçlarla işlenmesine onay verdiğimi kabul ederim.</p>
      <div class="imza"><div>Kursiyer</div><div>Kurs müdürü</div></div>`;
  if (tur === 'bilgi') return kursBas('Kursiyer bilgi formu') + `<table><tr><th>Ad soyad</th><td>${e(tamAd(k))}</td></tr><tr><th>Telefon</th><td>${e(k.tel)}</td></tr><tr><th>Doğum yılı</th><td>${e(k.dogum)}</td></tr><tr><th>Sınıf</th><td>${S0.ad}</td></tr><tr><th>Usta öğretici</th><td>${e(egitmen(k.egitmen).ad)}</td></tr><tr><th>Acil durum kişisi</th><td>${e(k.acil ? k.acil.ad + ' (' + k.acil.yakinlik + ') ' + k.acil.tel : '—')}</td></tr><tr><th>Nereden duydu</th><td>${e(k.kaynak)}</td></tr></table>
    <p><b>Evrak durumu</b></p><table>${EVRAKLAR.map(([key, t]) => `<tr><td>${t}</td><td>${k.evrak[key] ? 'Teslim alındı' : 'Eksik'}</td></tr>`).join('')}</table><div class="imza"><div>Kursiyer</div><div>Teslim alan</div></div>`;
  if (tur === 'takip') { const d = S.dersler.filter(x => x.kursiyer === k.id && x.durum === 'Yapıldı').sort((a, b) => a.tarih.localeCompare(b.tarih)); return kursBas('Direksiyon eğitimi takip formu') + `<p><b>Kursiyer:</b> ${e(tamAd(k))} &nbsp; <b>Sınıf:</b> ${S0.ad}</p>${(() => { const y = S.kurs.imzaYontemi || 'ikili', dij = y !== 'islak', isl = y !== 'dijital'; return `<table><tr><th>#</th><th>Tarih</th><th>Saat</th><th>Usta öğretici</th><th>Araç</th>${dij ? '<th>Kursiyer (dijital)</th><th>Usta öğr. (dijital)</th>' : ''}${isl ? '<th>Kursiyer ıslak imza</th><th>Usta öğr. ıslak imza</th>' : ''}</tr>${Array.from({ length: Math.max(S0.direksiyon, d.length) }, (_, i) => d[i] ? `<tr><td>${i + 1}</td><td>${tarih(d[i].tarih)}</td><td>${d[i].saat}</td><td>${e(egitmen(d[i].egitmen).ad)}</td><td>${d[i].arac ? arac(d[i].arac).plaka : ''}</td>${dij ? imzaHucre(d[i], 'kursiyer') + imzaHucre(d[i], 'usta') : ''}${isl ? '<td style="width:90px"></td><td style="width:90px"></td>' : ''}</tr>` : `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td>${dij ? '<td></td><td></td>' : ''}${isl ? '<td></td><td></td>' : ''}</tr>`).join('')}</table><p style="font-size:11.5px;color:#555">${{ ikili: 'Dijital imzalar ders sonunda usta öğreticinin telefonunda alınmış, zaman damgasıyla saklanmıştır. Islak imza sütunları haftalık olarak doldurulur.', dijital: 'Dijital imzalar ders sonunda alınmış, zaman damgasıyla saklanmıştır. Kurs, il MEM’in dijital imza onayını dosyasında saklar.', islak: 'Her ders sonunda ıslak imzalanır.' }[y]}</p>`; })()}`; }
  if (tur === 'makbuz') { const h = S.hareket.filter(x => x.kursiyer === k.id).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return kursBas('Tahsilat makbuzu') + `<table><tr><th>Makbuz no</th><td>${(h ? h.id : '').replace('h', 'M-')}</td><th>Tarih</th><td>${h ? tarih(h.tarih) : ''}</td></tr><tr><th>Ödeyen</th><td>${e(tamAd(k))}</td><th>Yöntem</th><td>${h ? e(h.yontem) : ''}</td></tr><tr><th>Açıklama</th><td colspan="3">${h ? e(h.aciklama) : ''}</td></tr><tr><th>Tutar</th><td colspan="3"><b>${h ? tl(h.tutar) : ''}</b></td></tr><tr><th>Kalan borç</th><td colspan="3">${tl(kalanBorc(k))}</td></tr></table><div class="imza"><div>Teslim eden</div><div>Teslim alan</div></div>`; }
  if (tur === 'senet') { const t = k.odeme.taksitler.find(x => !x.odendi) || k.odeme.taksitler[0]; return kursBas('Senet') + `<table><tr><th>Ödeme günü</th><td>${t ? tarih(t.vade) : ''}</td><th>Tutar</th><td><b>${t ? tl(t.tutar) : ''}</b></td></tr></table><p>İşbu senet mukabilinde ${t ? tarih(t.vade) : ''} tarihinde ${e(S.kurs.ad)}’na yukarıda yazılı tutarı ödeyeceğim. Bedeli eğitim hizmeti olarak alınmıştır.</p><table><tr><th>Borçlu</th><td>${e(tamAd(k))}</td></tr><tr><th>Telefon</th><td>${e(k.tel)}</td></tr><tr><th>Kefil</th><td>${e(k.acil ? k.acil.ad : '')}</td></tr></table><p style="color:#666;font-size:11.5px">Örnek şablon; kurs kendi senet formunu kullanabilir.</p><div class="imza"><div>Borçlu</div><div>Kefil</div></div>`; }
  return '';
}
export function belgeAc(tur, id) {
  const s = SABLONLAR.find(x => x[0] === tur);
  if (s[3] === 'tek') { pencere({ baslik: s[1], genis: true, icerik: `<div style="background:var(--zemin);padding:18px;border-radius:8px;max-height:66vh;overflow:auto"><div class="a4" id="a4">${belgeHtml(tur)}</div></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-yazdir>${ik('belge')}Yazdır / PDF</button>`, onAc(d) { d.querySelector('[data-yazdir]').addEventListener('click', () => window.print()); islem('Denetim dosyası oluşturdu'); kaydet(); } }); return; }
  const secici = s[3] === 'kursiyer' ? S.kursiyerler.filter(k => tur !== 'takip' || k.direksiyon > 0) : s[3] === 'senet' ? S.kursiyerler.filter(k => k.odeme.senetli) : s[3] === 'egitmen' ? S.egitmenler : S.sinavlar;
  const ad = x => x.tur ? x.tur + ' · ' + tarih(x.tarih) : x.soyad ? tamAd(x) : x.ad;
  if (!id) id = secici[0].id;
  pencere({
    baslik: s[1], genis: true,
    icerik: `<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap"><select class="girdi" style="max-width:320px" data-kim aria-label="Seçim">${secici.map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${e(ad(x))}</option>`).join('')}</select><span style="color:var(--soluk);font-size:13.5px">Bilgiler kayıtlardan otomatik doldurulur.</span></div><div style="background:var(--zemin);padding:18px;border-radius:8px;max-height:62vh;overflow:auto"><div class="a4" id="a4">${belgeHtml(tur, id)}</div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-wp" data-wpb>${ik('wp')}WhatsApp’tan PDF gönder</button><button class="dg dg-ana" data-yazdir>${ik('belge')}Yazdır</button>`,
    onAc(d) {
      d.querySelector('[data-kim]').addEventListener('change', ev => { d.querySelector('#a4').innerHTML = belgeHtml(tur, ev.target.value); });
      d.querySelector('[data-yazdir]').addEventListener('click', () => window.print());
      d.querySelector('[data-wpb]').addEventListener('click', () => { const v = d.querySelector('[data-kim]').value, k = kursiyer(v); gonderimEkle(k ? tamAd(k) : S.kurs.ad, s[1] + ' (PDF)', 'Belge'); bildir(s[1] + ' PDF olarak gönderildi', 'wp'); });
    },
  });
}
export function belgeler() {
  return {
    baslik: 'Belgeler ve çıktılar', alt: 'Kayıtlardan otomatik dolan, yazdırmaya hazır formlar',
    html: `${ekranNotu('Formu seçin, kişiyi seçin; bilgiler kayıttan dolar. Yazdırın ya da WhatsApp’tan PDF olarak gönderin.')}
    <div class="belge-liste">${SABLONLAR.map(([k, t, a]) => `<button class="belge-kart" data-belge="${k}"><span class="kagit"><i></i><i></i><i style="width:80%"></i><i></i><i style="width:65%"></i><i style="width:90%"></i></span><b>${t}</b><small>${a}</small></button>`).join('')}</div>`,
    baglan(k) { k.addEventListener('click', ev => { const b = ev.target.closest('[data-belge]'); if (b) belgeAc(b.dataset.belge); }); },
  };
}

/* ================= EVDEN KAYIT SAYFASI (kursun web sitesi) ================= */
const SINIF_ARAC = { 'B': 'a1', 'B-O': 'a3', 'A2': 'a5', 'C': 'a6' };
let kayit = { adim: 0, sinif: 'B', bilgi: {}, evrak: {}, imza: false };
export function kayitSayfasi() {
  const adimlar = ['Sınıf', 'Bilgiler', 'Evraklar', 'Onay ve ödeme'];
  let govde = '';
  if (kayit.adim === 0) govde = `<h2 style="font-size:26px;margin-bottom:6px">Hangi ehliyeti alacaksın?</h2><p style="color:var(--soluk);margin-bottom:16px">Sınıfı seç; ücret ve taksit hemen görünür.</p>
    <div class="izgara iz-2" style="gap:10px">${Object.entries(SINIFLAR).map(([k, v]) => `<label style="cursor:pointer"><input type="radio" name="sinif" value="${k}" ${k === kayit.sinif ? 'checked' : ''} style="position:absolute;opacity:0"><span class="kart" style="display:block;padding:8px;${k === kayit.sinif ? 'border-color:var(--levha);box-shadow:0 0 0 2px var(--levha)' : ''}">${aracGorsel(arac(SINIF_ARAC[k]))}<b style="display:block;font-family:var(--baslik);font-size:17px;color:var(--murekkep);margin:8px 4px 0">${v.ad}</b><span style="display:block;margin:0 4px 4px;color:var(--metin)">${tl(v.ucret)} · 5 aya kadar taksit</span></span></label>`).join('')}</div>`;
  if (kayit.adim === 1) govde = `<h2 style="font-size:26px;margin-bottom:14px">Seni tanıyalım</h2><form class="form-izgara" id="f-k1">
    <div class="alan"><label>Ad</label><input name="ad" required value="${e(kayit.bilgi.ad || '')}" autocomplete="given-name"></div><div class="alan"><label>Soyad</label><input name="soyad" required value="${e(kayit.bilgi.soyad || '')}" autocomplete="family-name"></div>
    <div class="alan"><label>TC kimlik no</label><input name="tc" inputmode="numeric" maxlength="11" required value="${e(kayit.bilgi.tc || '')}"></div><div class="alan"><label>Doğum tarihi</label><input name="dogumTarihi" type="date" value="${e(kayit.bilgi.dogumTarihi || '')}"></div>
    <div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" required value="${e(kayit.bilgi.tel || '')}" placeholder="05xx xxx xx xx" autocomplete="tel"></div><div class="alan"><label>Adres</label><input name="adres" value="${e(kayit.bilgi.adres || '')}" placeholder="Mahalle, ilçe"></div>
    <div class="alan"><label>Acil durumda aranacak kişi</label><input name="acil" value="${e(kayit.bilgi.acil || '')}" placeholder="Ad soyad"></div><div class="alan"><label>Onun telefonu</label><input name="acilTel" inputmode="tel" value="${e(kayit.bilgi.acilTel || '')}"></div></form>`;
  if (kayit.adim === 2) govde = `<h2 style="font-size:26px;margin-bottom:6px">Evrakların</h2><p style="color:var(--soluk);margin-bottom:16px">Telefonla fotoğrafını çek, yükle. Eksik kalanı kursa getirebilirsin.</p>
    ${EVRAKLAR.filter(([k]) => k !== 'sozlesme').map(([k, t]) => `<label class="yukle" style="margin-bottom:8px;position:relative">${kayit.evrak[k] ? `<img src="${kayit.evrak[k]}" alt="">` : isaret('bilgi', 26)}<span style="flex:1"><b style="display:block;color:var(--murekkep)">${t}</b><small style="color:var(--soluk)">${kayit.evrak[k] ? 'Yüklendi' : 'Fotoğraf çek ya da seç'}</small></span>${kayit.evrak[k] ? isaret('tamam', 22) : ''}<input type="file" accept="image/*" capture="environment" data-evrak="${k}"></label>`).join('')}`;
  if (kayit.adim === 3) { const v = SINIFLAR[kayit.sinif], p = 8000, n = 4; govde = `<h2 style="font-size:26px;margin-bottom:14px">Son adım</h2>
    <div class="kart" style="padding:14px 16px;margin-bottom:12px"><div style="display:flex;justify-content:space-between"><b style="color:var(--murekkep)">${v.ad}</b><b class="sayi" style="color:var(--murekkep)">${tl(v.ucret)}</b></div><p style="font-size:14px;margin-top:4px">Bugün ${tl(p)} peşinat, sonra ${n} × ${tl((v.ucret - p) / n)}</p></div>
    <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-bottom:12px"><input type="checkbox" data-kvkk ${kayit.kvkk ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px"><span>Aydınlatma metnini okudum; sağlık raporu ve adli sicil bilgilerimin MEB kaydı için işlenmesine açık rıza veriyorum. <a href="#" data-aydinlatma-oku style="color:var(--levha);font-weight:700">Metni oku</a></span></label>
    <p class="et" style="margin-bottom:6px">Sözleşmeyi parmağınla imzala</p><canvas class="imza-alan" width="900" height="300" aria-label="İmza alanı"></canvas><button class="dg dg-hafif dg-kucuk" data-temizle type="button">Temizle</button>
    <div class="form-izgara" style="margin-top:12px"><div class="alan tam"><label>Kart numarası</label><input value="4111 1111 1111 1111" inputmode="numeric"></div><div class="alan"><label>Son kullanma</label><input value="12/30"></div><div class="alan"><label>CVC</label><input value="000"></div></div>
    <div class="ipucu uyari" style="margin-top:12px">${isaret('uyari', 20)}<span>Demo: test kartı dolu gelir, ödeme alınmaz. Canlıda kursun sanal POS’u ile 3D Secure çalışır.</span></div>`; }
  if (kayit.adim === 4) govde = `<div style="text-align:center;padding:30px 0">${isaret('tamam', 64)}<h2 style="font-size:28px;margin:16px 0 6px">Kaydın tamam!</h2><p style="color:var(--metin);max-width:380px;margin:0 auto 18px">Teorik ders programın ve ödeme planın WhatsApp’a gönderildi. Kurs da kaydını şu an panelinde görüyor.</p><a class="dg dg-ana" href="#/kursiyer/${kayit.yeniId}">Kurs panelinde gör</a> <button class="dg dg-cizgi" data-bastan>Yeni kayıt</button></div>`;
  return {
    baslik: 'Evden kayıt', alt: S.kurs.ad + ' · kursun web sitesindeki kayıt sayfası',
    html: `<div style="max-width:1120px;margin:0 auto;padding:4px 16px 0"><a class="dg dg-hafif" href="#/genel">${ik('sol')}Yönetici paneline dön</a></div>
    <div class="kayit-sayfa" style="padding-left:16px;padding-right:16px">
      <div class="kayit-gorsel"><img src="img/kayit.webp" alt="Direksiyon dersinde kursiyer ve usta öğretici">${yonLevhasi([['Kayıt', '5 dk', '#/kayit', 'Kursa gelmeden, telefondan'], ['Taksit', '5 ay', '#/kayit', 'Peşinat sonrası'], ['Ehliyet', '2–3 ay', '#/kayit', 'Ortalama süre']], S.kurs.ad)}</div>
      <div class="kart" style="padding:22px 22px 18px;align-self:start">
        ${kayit.adim < 4 ? `<div class="adim-serit">${adimlar.map((a, i) => `<span class="${i <= kayit.adim ? 'ok' : ''}" title="${a}"></span>`).join('')}</div><p style="font-family:var(--baslik);font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--soluk);margin-bottom:8px">Adım ${kayit.adim + 1}/4 · ${adimlar[kayit.adim]}</p>` : ''}
        ${govde}
        ${kayit.adim < 4 ? `<div style="display:flex;gap:8px;margin-top:18px">${kayit.adim ? '<button class="dg dg-cizgi" data-geri>Geri</button>' : ''}<button class="dg dg-ana" style="flex:1" data-ileri>${kayit.adim === 3 ? 'Peşinatı öde ve kaydı tamamla' : 'Devam'}</button></div>` : ''}
      </div>
    </div>`,
    baglan(k) {
      k.addEventListener('change', ev => {
        if (ev.target.name === 'sinif') { kayit.sinif = ev.target.value; yenile(); }
        const f = ev.target.closest('[data-evrak]');
        if (f && f.files[0]) { fotoKucult(f.files[0]).then(u => { kayit.evrak[f.dataset.evrak] = u; yenile(); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); }
      });
      const cv = k.querySelector('canvas.imza-alan');
      if (cv) {
        const c = cv.getContext('2d'); c.lineWidth = 4; c.lineCap = 'round'; c.strokeStyle = '#111';
        let ciz = false; const nokta = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; };
        cv.addEventListener('pointerdown', ev => { ciz = true; c.beginPath(); c.moveTo(...nokta(ev)); cv.setPointerCapture(ev.pointerId); });
        cv.addEventListener('pointermove', ev => { if (!ciz) return; c.lineTo(...nokta(ev)); c.stroke(); kayit.imza = true; });
        cv.addEventListener('pointerup', () => ciz = false);
      }
      k.addEventListener('click', ev => {
        const t = ev.target;
        if (t.closest('[data-aydinlatma-oku]')) { ev.preventDefault(); pencere({ baslik: 'KVKK aydınlatma metni', icerik: `<p>${e(S.kurs.aydinlatma || S.kurs.ad + ' olarak kişisel verilerinizi sürücü kursu eğitimi ve MEB mevzuatı gereği MEBBİS kaydı amacıyla işliyoruz. Verileriniz yalnızca yetkili kurumlarla paylaşılır, mevzuattaki süre boyunca saklanır.')}</p>` }); }
        if (t.closest('[data-temizle]')) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); kayit.imza = false; }
        if (t.closest('[data-geri]')) { kayit.adim--; yenile(true); }
        if (t.closest('[data-bastan]')) { kayit = { adim: 0, sinif: 'B', bilgi: {}, evrak: {}, imza: false }; yenile(true); }
        if (t.closest('[data-ileri]')) {
          if (kayit.adim === 1) { const f = k.querySelector('#f-k1'); const b = Object.fromEntries(new FormData(f)); if (!b.ad.trim() || !b.soyad.trim() || b.tel.replace(/\D/g, '').length < 10) return bildir('Ad, soyad ve geçerli telefon gerekli', 'uyari'); if (!tcGecerli(b.tc.trim())) return bildir('TC kimlik numarası geçerli değil', 'uyari'); const y = yas(b.dogumTarihi); if (!b.dogumTarihi) return bildir('Doğum tarihini girin', 'uyari'); if (y < S.kurs.asgariYas) return bildir(`Ehliyet için en az ${S.kurs.asgariYas} yaşında olmalısın`, 'uyari'); kayit.bilgi = b; }
          if (kayit.adim === 3) {
            if (!k.querySelector('[data-kvkk]').checked) return bildir('Devam etmek için KVKK onayı gerekli', 'uyari');
            if (!kayit.imza) return bildir('Sözleşmeyi imzalayın', 'uyari');
            const v = SINIFLAR[kayit.sinif], p = 8000, n = 4, taksitler = [];
            for (let i = 0; i < n; i++) { const d = new Date(BUGUN); d.setMonth(d.getMonth() + i + 1); taksitler.push({ vade: iso(d), tutar: Math.round((v.ucret - p) / n / 50) * 50, odendi: null, yontem: null }); }
            const ev2 = {}; EVRAKLAR.forEach(([x]) => ev2[x] = x === 'sozlesme' ? true : !!kayit.evrak[x]);
            const eg = S.egitmenler.find(x => x.siniflar.includes(kayit.sinif));
            const yeni = { id: 'k' + Date.now(), ad: kayit.bilgi.ad.trim(), soyad: kayit.bilgi.soyad.trim(), tel: kayit.bilgi.tel, tc: kayit.bilgi.tc.trim(), dogumTarihi: kayit.bilgi.dogumTarihi || '', adres: kayit.bilgi.adres || '', ogrenim: '', dogum: (kayit.bilgi.dogumTarihi || '').slice(0, 4), teorikGrup: 'aksam', kvkk: { tarih: gun(0), kanal: 'Online kayıt', riza: true }, evrakFoto: Object.fromEntries(Object.entries(kayit.evrak)), sinif: kayit.sinif, kayit: gun(0), egitmen: eg.id, asama: Object.values(ev2).every(Boolean) ? 'Teorik' : 'Evrak', teorik: 0, direksiyon: 0, evrak: ev2, mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: v.ucret, pesin: p, pesinTarih: gun(0), taksitler, senetli: false }, kaynak: 'Web sitesi', yorum: null, notlar: [{ tarih: gun(0), metin: 'Evden kayıt sayfasından kaydoldu, sözleşmeyi telefondan imzaladı.' }], deneme: [], acil: { ad: kayit.bilgi.acil || '', yakinlik: '', tel: kayit.bilgi.acilTel || '' } };
            S.kursiyerler.unshift(yeni);
            S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Kurs ücreti', aciklama: tamAd(yeni) + ' · online peşinat', tutar: p, yontem: 'Kart', kursiyer: yeni.id });
            gonderimEkle(tamAd(yeni), 'Hoş geldin, ders programı ve ödeme planı', 'Otomatik');
            kaydet(); kayit.yeniId = yeni.id;
          }
          kayit.adim++; yenile(true);
        }
      });
    },
  };
}

/* ================= MEBBİS GİRİŞ KARTI ================= */
function kopyala(metin) {
  try { if (navigator.clipboard) return navigator.clipboard.writeText(metin).then(() => true, () => yedek()); } catch (x) { }
  return Promise.resolve(yedek());
  function yedek() { const t = document.createElement('textarea'); t.value = metin; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { } t.remove(); return ok; }
}
// Sıralı giriş: her dokunuşta sıradaki alan panoya kopyalanır; zincir modunda kursiyerden kursiyere geçer.
export const mebSira = { kid: null, i: 0, basla: 0, zincir: false, sureler: [] };
export const bekleyenMeb = () => S.kursiyerler.filter(k => !k.mebIslendi && !eksikEvrak(k).length);
export function mebSiraBaslat(zincir = true) { const l = bekleyenMeb(); if (!l.length) return; Object.assign(mebSira, { kid: l[0].id, i: 0, basla: Date.now(), zincir, sureler: zincir ? [] : mebSira.sureler }); location.hash = '#/mebbis/' + l[0].id; }
const sureMetni = ms => { const sn = Math.round(ms / 1000); return (sn >= 60 ? Math.floor(sn / 60) + ' dk ' : '') + (sn % 60) + ' sn'; };
const ayAdiUzun = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export function mebbisAsistani(id) {
  const k = kursiyer(id);
  if (!k) return { baslik: 'MEBBİS giriş kartı', html: `<div class="kart">${bos('Kursiyer seçilmedi', 'MEB işlemleri ekranından bir kursiyerin giriş kartını açın.', '<a class="dg dg-koyu" href="#/meb">MEB işlemleri</a>')}</div>` };
  k.mebGirildi = k.mebGirildi || {};
  const ilce = (k.adres || '').includes('Tepebaşı') ? 'Tepebaşı' : 'Odunpazarı';
  const kd = new Date(k.kayit); const donem = ayAdiUzun[(kd.getMonth() + 1) % 12] + ' ' + (kd.getMonth() === 11 ? kd.getFullYear() + 1 : kd.getFullYear());
  const dosya = key => `${k.tc}_${key}.jpg`;
  const bolumler = [
    ['Kimlik bilgileri', 'TC kimlik numarasını girince ad, soyad ve fotoğraf MERNİS’ten gelir; gelenle karşılaştırın.', [['tc', 'TC kimlik no', k.tc], ['ad', 'Ad', k.ad.toLocaleUpperCase('tr')], ['soyad', 'Soyad', k.soyad.toLocaleUpperCase('tr')], ['dogum', 'Doğum tarihi', k.dogumTarihi ? k.dogumTarihi.split('-').reverse().join('.') : ''], ['cinsiyet', 'Cinsiyet', k.cinsiyet || '']]],
    ['Kurs ve sertifika', 'Kayıt, grubun başlama tarihinden önce yapılmalı.', [['sinif', 'İstenen sertifika sınıfı', k.sinif.replace('-O', ' (otomatik)')], ['mevcut', 'Mevcut sürücü belgesi', k.mevcutEhliyet || 'Yok'], ['donem', 'Dönem / grup', donem + ' · ' + (k.teorikGrup === 'sabah' ? 'Sabah grubu' : 'Akşam grubu')], ['kayit', 'Kayıt tarihi', k.kayit.split('-').reverse().join('.')]]],
    ['Öğrenim', 'Belgenin aslı görülür, örneği taranıp yüklenir.', [['ogrenim', 'Öğrenim durumu', k.ogrenim || ''], ['ogrenim-dosya', 'Yüklenecek dosya', dosya('ogrenim')]]],
    ['Sağlık raporu', 'Sürücü olur raporu taranıp yüklenir.', [['rapor-no', 'Rapor numarası', (k.saglikRapor || {}).no || ''], ['rapor-tarih', 'Rapor tarihi', (k.saglikRapor || {}).tarih || ''], ['saglik-dosya', 'Yüklenecek dosya', dosya('saglik')]]],
    ['Adli sicil', 'Barkodlu adli sicil kaydı yüklenir.', [['adli-barkod', 'Belge barkodu', (k.adliSicil || {}).barkod || ''], ['adli-dosya', 'Yüklenecek dosya', dosya('adli')]]],
    ['İletişim', 'İl ve ilçe seçilir, açık adres elle girilir.', [['il', 'İl', 'Eskişehir'], ['ilce', 'İlçe', ilce], ['adres', 'Açık adres', k.adres || ''], ['tel', 'Cep telefonu', (k.tel || '').replace(/\s/g, '')]]],
    ['Son adım', 'Sistemden alınan teyit belgesi kursiyere imzalatılıp yüklenir; fatura taranıp girilir.', [['teyit', 'Teyit belgesi imzalatıldı', 'Evet'], ['fatura', 'Fatura tutarı', String(k.odeme.toplam)]]],
  ];
  const tum = bolumler.flatMap(b => b[2]), girilen = tum.filter(([key]) => k.mebGirildi[key]).length;
  const bosAlan = tum.filter(([, , v]) => !v).map(([, l]) => l);
  const sirali = mebSira.kid === k.id, adim = sirali ? tum[mebSira.i] : null;
  const sonraki = bekleyenMeb().filter(x => x.id !== k.id);
  const ortalama = mebSira.sureler.length ? mebSira.sureler.reduce((a, b) => a + b, 0) / mebSira.sureler.length : 0;
  const siraBar = sirali ? `<div class="sira-bar" role="region" aria-label="Sıralı giriş">
      ${adim ? `<div class="sira-ust"><span>Alan ${mebSira.i + 1}/${tum.length} · ${e(bolumler.find(b => b[2].includes(adim))[0])}</span>${mebSira.zincir ? `<span>Kuyrukta ${sonraki.length} kursiyer daha</span>` : ''}</div>
      <div class="sira-govde"><div style="min-width:0;flex:1"><small>${e(adim[1])}</small><b class="mono">${e(adim[2]) || '<span style="color:var(--kirmizi)">eksik</span>'}</b></div>
        <button class="dg dg-ana" data-sira-kopyala ${adim[2] ? '' : 'disabled'}>${ik('ok')}Kopyala, sonrakine geç <kbd>Enter</kbd></button><button class="dg dg-cizgi dg-kucuk" data-sira-atla>Atla</button><button class="dg dg-hafif dg-kucuk" data-sira-bitir>Durdur</button></div>`
      : `<div class="sira-govde">${isaret('tamam', 28)}<div style="flex:1"><b>Bütün alanlar kopyalandı · ${sureMetni(Date.now() - mebSira.basla)}</b><small>MEBBİS’te kaydı tamamlayın, sonra onaylayın.${ortalama ? ' Bu oturumda kursiyer başı ortalama ' + sureMetni(ortalama) + '.' : ''}</small></div><button class="dg dg-ana" data-tamam>${mebSira.zincir && sonraki.length ? 'Girdim, sıradaki kursiyer →' : 'Hepsini MEBBİS’e girdim'}</button></div>`}
    </div>` : `<div class="kart" style="margin-bottom:14px"><div class="kart-govde" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${isaret('zorunlu', 30)}<div style="flex:1;min-width:240px"><b style="color:var(--murekkep);font-family:var(--baslik);font-size:16px">Sıralı giriş</b><p style="font-size:14px">MEBBİS’i yanda açın. Her dokunuşta sıradaki alan panoya kopyalanır; MEBBİS’e yapıştırıp devam edersiniz. Alan aramazsınız, sıra kaçmaz.</p></div><button class="dg dg-ana" data-sira-basla>Sıralı girişi başlat</button></div></div>`;
  return {
    baslik: 'MEBBİS giriş kartı', alt: tamAd(k) + ' · ' + SINIFLAR[k.sinif].ad,
    html: `<a class="dg dg-hafif" href="#/meb" style="margin:-6px 0 10px -8px">${ik('sol')}MEB işlemleri</a>
    ${ekranNotu('MEBBİS’i kendi oturumunuzda açın. Her alanın yanındaki “Kopyala”ya dokunun, MEBBİS’e yapıştırın; alan yeşile döner. Sinyal MEBBİS’e bağlanmaz.')}
    ${olcumler([['Kursiyer', e(tamAd(k))], ['Girilen alan', girilen + '/' + tum.length], ['Eksik bilgi', bosAlan.length + '', bosAlan.length ? 'Önce tamamlayın' : 'Hazır', bosAlan.length ? 'uyari' : '']])}
    <div class="ara-bosluk"></div>${siraBar}
    <div class="izgara iz-2">${bolumler.map(([b, not, alanlar], bi) => `<div class="kart"><div class="kart-bas"><h3>${bi + 1} · ${b}</h3></div><div class="kart-govde"><p style="font-size:13.5px;color:var(--soluk);margin:-4px 0 10px">${not}</p>${alanlar.map(([key, l, v]) => `<div class="evrak"><span class="durum ${k.mebGirildi[key] ? 'var' : 'yok'}" style="${k.mebGirildi[key] ? '' : 'box-shadow:inset 0 0 0 2px var(--cizgi);color:var(--cizgi)'}">${ik('tik')}</span><div style="flex:1;min-width:0"><small style="color:var(--soluk);display:block">${l}</small>${['rapor-no', 'rapor-tarih', 'adli-barkod'].includes(key) ? `<input class="girdi" style="height:34px;margin-top:2px" data-alan="${key}" value="${e(v)}" placeholder="Belgeden girin">` : `<b class="mono" style="color:var(--murekkep);word-break:break-all">${e(v) || '<span style="color:var(--kirmizi)">eksik</span>'}</b>`}</div>${key.endsWith('-dosya') && (k.evrakFoto || {})[key.split('-')[0]] ? `<a class="dg dg-cizgi dg-kucuk" href="${k.evrakFoto[key.split('-')[0]]}" download="${e(v)}">İndir</a>` : ''}<button class="dg ${k.mebGirildi[key] ? 'dg-cizgi' : 'dg-ana'} dg-kucuk" data-kopyala="${key}" ${v ? '' : 'disabled'}>${k.mebGirildi[key] ? 'Tekrar kopyala' : 'Kopyala'}</button></div>`).join('')}</div></div>`).join('')}</div>
    <div class="ara-bosluk"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="dg dg-ana" data-tamam ${k.mebIslendi ? 'disabled' : ''}>${k.mebIslendi ? 'MEBBİS’e girildi' : 'Hepsini MEBBİS’e girdim'}</button><a class="dg dg-cizgi" href="#/kursiyer/${k.id}">Kursiyer dosyası</a></div>`,
    baglan(kap) {
      const siraKopyala = () => { const al = tum[mebSira.i]; if (!al || !al[2]) return; kopyala(al[2]).then(ok => { k.mebGirildi[al[0]] = true; kaydet(); if (ok === false) bildir('Kopyalanamadı; değeri elle seçin', 'uyari'); mebSira.i++; yenile(); }); };
      mebKlavye = ev => { if (mebSira.kid !== k.id || ev.key !== 'Enter' || (ev.target.closest && ev.target.closest('input,textarea,select,button'))) return; ev.preventDefault(); if (tum[mebSira.i]) siraKopyala(); else kap.querySelector('[data-tamam]')?.click(); };
      kap.addEventListener('change', ev => { const a = ev.target.closest('[data-alan]'); if (!a) return; const v = a.value.trim(); if (a.dataset.alan === 'adli-barkod') k.adliSicil = { barkod: v }; else { k.saglikRapor = k.saglikRapor || {}; k.saglikRapor[a.dataset.alan === 'rapor-no' ? 'no' : 'tarih'] = v; } kaydet(); yenile(); });
      kap.addEventListener('click', ev => {
        const c = ev.target.closest('[data-kopyala]');
        if (c) { const al = tum.find(x => x[0] === c.dataset.kopyala); kopyala(al[2]).then(ok => { k.mebGirildi[al[0]] = true; kaydet(); bildir(ok === false ? 'Kopyalanamadı; değeri elle seçin' : al[1] + ' kopyalandı'); yenile(); }); }
        if (ev.target.closest('[data-tamam]')) {
          if (bosAlan.length) return bildir('Önce eksik bilgileri tamamlayın: ' + bosAlan.join(', '), 'uyari');
          k.mebIslendi = true; islem('MEBBİS’e girildi işaretledi', tamAd(k)); kaydet(); bildir(tamAd(k) + ' MEBBİS’e girildi olarak işaretlendi');
          if (mebSira.kid === k.id) { mebSira.sureler.push(Date.now() - mebSira.basla); const n = bekleyenMeb()[0]; if (mebSira.zincir && n) { Object.assign(mebSira, { kid: n.id, i: 0, basla: Date.now() }); location.hash = '#/mebbis/' + n.id; return; } mebSira.kid = null; }
          location.hash = '#/meb';
        }
        if (ev.target.closest('[data-sira-basla]')) { Object.assign(mebSira, { kid: k.id, i: 0, basla: Date.now(), zincir: false }); yenile(); }
        if (ev.target.closest('[data-sira-bitir]')) { mebSira.kid = null; yenile(); }
        if (ev.target.closest('[data-sira-atla]')) { mebSira.i++; yenile(); }
        if (ev.target.closest('[data-sira-kopyala]')) siraKopyala();
      });
    },
  };
}
let mebKlavye = null;
document.addEventListener('keydown', ev => { if (mebKlavye && location.hash.startsWith('#/mebbis/')) mebKlavye(ev); });
export function programPenceresi() {
  const l = S.dersler.filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && !d.meb).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const gunler = [...new Set(l.map(d => d.tarih))];
  pencere({
    baslik: 'Direksiyon programı · MEBBİS’e girilecek', genis: true,
    icerik: `<p style="margin-bottom:12px">Gün gün girin; girdiğiniz günü işaretleyin. ${S.kurs.programOnGun} günden yakın dersler kırmızıdır.</p>${gunler.map(g => `<div class="kart" style="margin-bottom:10px"><div class="kart-bas" style="padding-bottom:6px"><h3 style="${fark(g) < S.kurs.programOnGun ? 'color:var(--kirmizi)' : ''}">${tarihUzun(g)}</h3><div class="sag"><button class="dg dg-ana dg-kucuk" data-gun-girildi="${g}">Bu günü girdim</button></div></div><div class="tablo-kap"><table class="tablo"><thead><tr><th>Saat</th><th>TC</th><th>Kursiyer</th><th>Usta öğretici</th><th>Araç</th></tr></thead><tbody>${l.filter(d => d.tarih === g).map(d => { const k = kursiyer(d.kursiyer); return `<tr><td class="mono">${d.saat}</td><td class="mono">${e(k.tc)}</td><td>${e(tamAd(k))}</td><td>${e(egitmen(d.egitmen).ad)}</td><td>${d.arac ? arac(d.arac).plaka : ''}</td></tr>`; }).join('')}</tbody></table></div></div>`).join('') || bos('Girilecek ders yok', '')}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-program-csv>${ik('indir')}Excel</button>`,
    onAc(p) {
      p.addEventListener('click', ev => {
        const g = ev.target.closest('[data-gun-girildi]'); if (g) { l.filter(d => d.tarih === g.dataset.gunGirildi).forEach(d => d.meb = true); islem('Direksiyon programını MEBBİS’e girdi', tarih(g.dataset.gunGirildi)); kaydet(); g.closest('.kart').remove(); bildir(tarih(g.dataset.gunGirildi) + ' programı girildi'); yenile(); }
        if (ev.target.closest('[data-program-csv]')) csvIndir('direksiyon-programi.csv', [['Tarih', 'Saat', 'TC', 'Ad', 'Soyad', 'Usta öğretici', 'Araç'], ...l.map(d => { const k = kursiyer(d.kursiyer); return [d.tarih, d.saat, k.tc, k.ad, k.soyad, egitmen(d.egitmen).ad, d.arac ? arac(d.arac).plaka : '']; })]);
      });
    },
  });
}
export function sinavBildirimPenceresi(id) {
  const s = S.sinavlar.find(x => x.id === id), ks = s.kursiyerler.map(kursiyer).filter(Boolean);
  const aracBul = k => S.araclar.find(a => a.egitmen === k.egitmen && (a.sinif === k.sinif || a.sinif === k.sinif.split('-')[0])) || S.araclar.find(a => a.sinif === k.sinif);
  pencere({
    baslik: `${tarih(s.tarih)} direksiyon sınavı · MEBBİS bildirimi`, genis: true,
    icerik: `<p style="margin-bottom:12px">Sınavdan en geç ${S.kurs.sinavBildirimIsGunu} iş günü önce her kursiyerin usta öğreticisi ve aracı MEBBİS’e girilir.</p><div class="tablo-kap"><table class="tablo"><thead><tr><th>TC</th><th>Kursiyer</th><th>Sınıf</th><th>Usta öğretici</th><th>Araç</th></tr></thead><tbody>${ks.map(k => { const a = aracBul(k); return `<tr><td class="mono">${e(k.tc)}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${e(egitmen(k.egitmen).ad)}</td><td>${a ? plakaMetin(a) : ''}</td></tr>`; }).join('')}</tbody></table></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-bildirildi>MEBBİS’e girdim</button>`,
    onAc(p) { p.querySelector('[data-bildirildi]').addEventListener('click', () => { s.mebBildirim = true; islem('Sınav bildirimini MEBBİS’e girdi', tarih(s.tarih) + ' · ' + ks.length + ' kursiyer'); kaydet(); kapatPencere(); bildir('Sınav bildirimi işaretlendi'); yenile(); }); },
  });
}
const plakaMetin = a => e(a.plaka) + ' · ' + e(a.model);

/* ================= PAKET VE GÜVENCE ================= */
export function guven() {
  const paketler = [
    ['Kurs', '1.490', ['Kursiyer, evrak, ödeme ve senet takibi', 'Direksiyon ve teorik program, yoklama', 'MEBBİS: sıralı giriş ya da tek tuş aktarımı, kural kontrolü', 'Belge çıktıları, kasa, raporlar, muhasebe aktarımı', 'Ayda 300 SMS ve 300 e-Arşiv fatura dahil', '3 kullanıcı']],
    ['Kurs + WhatsApp', '2.490', ['Kurs paketindeki her şey', 'Ders, taksit, sınav hatırlatmaları', 'Ayda 2.000 WhatsApp mesajı, 500 SMS, 500 e-Arşiv dahil', 'Evden kayıt sayfası ve kartla ödeme linki', 'Usta öğretici ve kursiyer ekranları, deneme sınavları', 'Sınırsız kullanıcı, çoklu şube'], true],
    ['Kurs + Asistan', '3.990', ['WhatsApp paketindeki her şey', 'Sosyal medya asistanı: Instagram mesajları ve yorumları, WhatsApp, Facebook', 'Ayda 5.000 WhatsApp mesajı ve 1.000 SMS dahil', 'Boşalan saati doldurma, sınav riski ve ek ders', 'Google yorum toplama']],
  ];
  const KOTA = { 'Kurs': 0, 'Kurs + WhatsApp': 2000, 'Kurs + Asistan': 5000 };
  return {
    baslik: 'Paket ve güvence', alt: 'Fiyat, veri sahipliği, kurulum ve destek',
    html: `${ekranNotu('Ne ödeyeceğiniz, verilerinizin kimde durduğu ve geçişin nasıl yapılacağı: karar vermeden önce bilmeniz gerekenler.')}
    <div class="izgara iz-3">${paketler.map(([ad, f, l, one]) => `<div class="kart" style="padding:22px;${one ? 'border-color:var(--levha);box-shadow:0 0 0 2px var(--levha)' : ''}">${one ? rozet('En çok seçilen', 'mavi') : ''}<h3 style="font-size:22px;margin-top:${one ? 10 : 0}px">${ad}</h3><b style="display:block;font-family:var(--baslik);font-size:40px;font-weight:900;color:var(--murekkep);margin:8px 0 2px">${f} ₺<small style="font-size:16px;font-weight:700;color:var(--soluk)"> / ay</small></b><small style="color:var(--soluk)">KDV hariç · taahhüt yok</small><ul style="list-style:none;margin-top:16px;display:grid;gap:9px">${l.map(x => `<li style="display:flex;gap:8px;align-items:flex-start">${isaret('tamam', 18)}<span>${x}</span></li>`).join('')}</ul></div>`).join('')}</div>
    <p style="font-size:13.5px;color:var(--soluk);margin-top:10px">Fiyata dahil olmayan tek kalem bankanızın sanal POS komisyonudur; o da bankayla sizin aranızdadır. Kota aşılacaksa önce size sorulur: ek 1.000 WhatsApp mesajı 250 ₺.</p>
    <div class="ara-bosluk"></div>
    <div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Ayda ne ödersiniz?</h3><small>Kendi rakamlarınızla hesaplayın</small></div><div class="kart-govde"><form class="form-izgara" data-hesap>
        <div class="alan"><label for="h-paket">Paket</label><select id="h-paket" name="paket">${paketler.map(([a], i) => `<option ${i === 1 ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
        <div class="alan"><label for="h-k">Aktif kursiyer</label><input id="h-k" name="k" type="number" min="1" value="${S.kursiyerler.filter(k => k.asama !== 'Ehliyet').length}"></div>
        <div class="alan"><label for="h-kart">Ayda kartla tahsilat (₺)</label><input id="h-kart" name="kart" type="number" min="0" step="1000" value="120000"></div>
        <div class="alan"><label for="h-eski">Şu anki programınızın yıllık maliyeti (₺)</label><input id="h-eski" name="eski" type="number" min="0" step="500" value="18000"></div>
      </form><div data-hesap-sonuc style="margin-top:14px"></div></div></div>
      <div class="kart"><div class="kart-bas"><h3>Hizmet güvencesi</h3><small>Sözleşmede yazılı</small></div><ul class="liste" style="margin-top:8px">${[
        ['tamam', '%99,5 erişilebilirlik', 'Altına düşen her tam gün için o ayın ücretinin 1/30’u iade edilir. Bakım gece 02:00–05:00 ve 48 saat önceden bildirilir.'],
        ['tamam', 'Sınav günü öncelikli destek', 'Cumartesi dahil sınav günlerinde sorunlara 30 dakika içinde dönülür.'],
        ['tamam', 'Biz kapanırsak da çalışır', 'Faaliyet durursa 90 gün önceden haber verilir; verileriniz ve yazılımın kendi sunucunuzda çalışan sürümü kaynak koduyla teslim edilir (noterde emanet).'],
        ['tamam', 'Mevzuat sorumluluğu', 'Bildirilmeyen bir mevzuat değişikliğinden doğan cezada yıllık ücret tutarına kadar biz sorumluyuz.'],
      ].map(([t, b, a]) => `<li style="align-items:flex-start">${isaret(t, 24)}<div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:14px">${a}</small></div></li>`).join('')}</ul>
      <div style="padding:6px 20px 20px;display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-cizgi" data-belge-ac="hizmet">${ik('belge')}Hizmet sözleşmesi</button><button class="dg dg-cizgi" data-belge-ac="vis">${ik('belge')}Veri işleme sözleşmesi</button></div></div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Verileriniz sizindir</h3></div><ul class="liste" style="margin-top:8px">${[
        ['tamam', 'Her an tam döküm', 'Tüm kursiyer, ödeme, ders ve kasa kayıtlarınızı tek tuşla indirin.'],
        ['tamam', 'MEBBİS şifreniz bize gelmez', 'Sıralı girişte şifre hiç gerekmez. Tek tuş aktarımını seçerseniz şifre yalnızca kurs bilgisayarındaki MEBBİS Aracı’nda kalır; Sinyal sunucusu görmez.'],
        ['tamam', 'Kim neye baktı, kayıtlı', 'TC görüntüleme dahil her işlem kullanıcı adıyla işlem geçmişine yazılır.'],
        ['tamam', 'Yetkiye göre ekran', 'Sekreter maaşları görmez, usta öğretici yalnızca kendi derslerini görür.'],
        ['bilgi', 'KVKK', 'Kayıt formunda aydınlatma metni ve açık rıza alınır. Sağlık raporu ve adli sicil özel nitelikli veridir; Türkiye’deki sunucuda, şifreli saklanır ve her gece yedeklenir. Asistanın dil modeli de Türkiye’de çalışır.'],
        ['bilgi', 'Ayrılırsanız', 'Sözleşme bitince verileriniz 30 gün içinde Excel olarak teslim edilir, ardından silinir.'],
      ].map(([t, b, a]) => `<li style="align-items:flex-start">${isaret(t, 24)}<div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:14px">${a}</small></div></li>`).join('')}</ul>
        <div style="padding:6px 20px 20px"><button class="dg dg-ana" data-dokum>${ik('indir')}Tüm verimi şimdi indir</button></div></div>
      <div class="kart"><div class="kart-bas"><h3>Kurulum ve geçiş</h3></div><ul class="liste" style="margin-top:8px">${[
        ['1. gün', 'Mevcut programınızdan (Akınsoft, Tabim ya da Excel) kursiyer, taksit ve araç listesi aktarılır; kontrolü biz yaparız.'],
        ['2. gün', 'Kurs müdürü, ön büro ve usta öğreticilere 1 saatlik kullanım eğitimi.'],
        ['İlk hafta', 'Eski programınız yan yana açık kalır; her şey doğru görünene kadar geçiş zorunlu değil.'],
        ['İlk ay', 'Ücret yok. Memnun kalmazsanız verilerinizi alır, ayrılırsınız.'],
      ].map(([a, b]) => `<li style="align-items:flex-start"><b class="mono" style="color:var(--levha);width:76px;flex:none">${a}</b><span>${b}</span></li>`).join('')}</ul>
        <div class="kart-bas" style="padding-top:8px"><h3>Destek</h3></div><div class="kart-govde"><p>Hafta içi 09:00–19:00 WhatsApp destek hattı; sınav günlerinde Cumartesi de açık. Mesai içinde ilk cevap en geç 1 saat, sınav günü 30 dakika. Destek ekibi nöbetleşe çalışır; tek bir kişiye bağlı değildir.</p></div></div>
    </div>
`,
    baglan(k) {
      const f = k.querySelector('[data-hesap]'), out = k.querySelector('[data-hesap-sonuc]');
      const hesapla = () => {
        const p = paketler.find(x => x[0] === f.paket.value), ay = +p[1].replace('.', ''), kk = +f.k.value || 0, kart = +f.kart.value || 0, eski = +f.eski.value || 0;
        const mesaj = kk * 14, kota = KOTA[p[0]], asim = kota ? Math.max(0, Math.ceil((mesaj - kota) / 1000)) * 250 : 0, pos = kart * 0.0249;
        const aylik = ay + asim, yil3 = aylik * 36, eski3 = eski * 3;
        out.innerHTML = `<ul class="liste" style="margin:0 -20px">${[[p[0] + ' paketi', tl(ay)], ['Tahmini mesaj', kota ? `${sayiTr(mesaj)} / ${sayiTr(kota)} kota${asim ? ' · ek ' + tl(asim) : ' · dahil'}` : 'WhatsApp yok, SMS dahil'], ['Sinyal’e aylık toplam', '<b>' + tl(aylik) + '</b>'], ['Bankaya POS komisyonu (bilgi)', tl(pos)], ['3 yılda Sinyal', tl(yil3)], ['3 yılda şu anki programınız', tl(eski3)]].map(([a, b]) => `<li><span style="flex:1">${a}</span><span class="mono">${b}</span></li>`).join('')}</ul><p style="font-size:13.5px;margin-top:10px">Mesaj tahmini kursiyer başına ayda 14 hatırlatmadır (ders, taksit, sınav). Sinyal, şu anki programınızın yapmadığı hatırlatma, asistan ve kayıt sayfası işlerini de kapsar; fark yalnızca fiyat değil, yapılan iştir.</p>`;
      };
      const sayiTr = n => new Intl.NumberFormat('tr-TR').format(n);
      if (f) { f.addEventListener('input', hesapla); f.addEventListener('change', hesapla); hesapla(); }
      k.addEventListener('click', ev => {
        const bo = ev.target.closest('[data-belge-ac]'); if (bo) return belgeAc(bo.dataset.belgeAc);
        if (!ev.target.closest('[data-dokum]')) return;
        csvIndir('sinyal-kursiyerler.csv', [['TC', 'Ad', 'Soyad', 'Telefon', 'Doğum tarihi', 'Adres', 'Öğrenim', 'Sınıf', 'Aşama', 'Kayıt', 'Teorik', 'Direksiyon', 'Toplam', 'Ödenen', 'Kalan'], ...S.kursiyerler.map(x => [x.tc, x.ad, x.soyad, x.tel, x.dogumTarihi, x.adres, x.ogrenim, SINIFLAR[x.sinif].ad, x.asama, x.kayit, x.teorik, x.direksiyon, x.odeme.toplam, odenen(x), kalanBorc(x)])]);
        setTimeout(() => csvIndir('sinyal-kasa.csv', [['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Yöntem', 'Tutar'], ...S.hareket.map(x => [x.tarih, x.tur, x.kategori, x.aciklama, x.yontem, x.tutar])]), 400);
        setTimeout(() => csvIndir('sinyal-dersler.csv', [['Tarih', 'Saat', 'Kursiyer', 'Usta öğretici', 'Araç', 'Durum'], ...S.dersler.map(d => [d.tarih, d.saat, tamAd(kursiyer(d.kursiyer) || { ad: '', soyad: '' }), (egitmen(d.egitmen) || {}).ad, d.arac ? arac(d.arac).plaka : '', d.durum])]), 800);
        islem('Tam veri dökümü indirdi'); kaydet(); bildir('Kursiyer, kasa ve ders dökümleri indirildi');
      });
    },
  };
}

// Denetimde sorun çıkarabilecek eksikler: [işaret, başlık, ayrıntı, bağlantı]
export function denetimEksikleri() {
  const l = [];
  const BG = { sertifika: 'usta öğretici sertifikası', saglik: 'sağlık raporu', adli: 'adli sicil kaydı' };
  S.egitmenler.forEach(x => Object.entries(x.belgeler || {}).forEach(([b, t]) => { const f = fark(t); if (f < 0) l.push(['dur', `${x.ad} · ${BG[b]} süresi dolmuş`, 'Bu usta öğreticiyle ders ve sınav yapılamaz.', '#/filo']); else if (f <= 30) l.push(['uyari', `${x.ad} · ${BG[b]} ${f} gün içinde bitiyor`, 'Yenileme için hatırlatıldı.', '#/filo']); }));
  S.araclar.forEach(a => [['muayene', a.muayene], ['sigorta', a.sigorta], ['kasko', a.kasko]].forEach(([b, t]) => { if (!t) return; const f = fark(t); if (f < 0) l.push(['dur', `${a.plaka} · ${b} süresi dolmuş`, a.model, '#/filo']); else if (f <= 30) l.push(['uyari', `${a.plaka} · ${b} ${f} gün içinde bitiyor`, a.model, '#/filo']); }));
  const imzasiz = S.dersler.filter(d => d.durum === 'Yapıldı' && !d.imza);
  if (imzasiz.length) l.push(['yasak', `${imzasiz.length} direksiyon dersi imzasız`, 'Takip formunda imza eksik; usta öğretici ekranından imzalatın.', '#/plan']);
  const evr = S.kursiyerler.filter(k => k.asama !== 'Ehliyet' && eksikEvrak(k).length);
  if (evr.length) l.push(['yasak', `${evr.length} kursiyerin evrakı eksik`, evr.slice(0, 4).map(tamAd).join(', ') + (evr.length > 4 ? '…' : ''), '#/meb/evrak']);
  const dogrulanmamis = S.kursiyerler.filter(k => k.asama !== 'Ehliyet' && ['saglik', 'adli'].some(x => k.evrak[x] && !(k.dogrulama || {})[x]));
  if (dogrulanmamis.length) l.push(['uyari', `${dogrulanmamis.length} kursiyerin sağlık raporu ya da adli sicili doğrulanmadı`, 'Barkod ve rapor numarasını e-Devlet’te kontrol edip “Doğruladım”a basın.', '#/kursiyer/' + dogrulanmamis[0].id]);
  const riza = S.kursiyerler.filter(k => !(k.kvkk && k.kvkk.riza));
  if (riza.length) l.push(['yasak', `${riza.length} kursiyerde KVKK rızası yok`, 'Özel nitelikli veri rızasız işlenemez.', '#/ayarlar/kvkk']);
  const meb = S.kursiyerler.filter(k => !k.mebIslendi && k.asama !== 'Kayıt' && k.asama !== 'Evrak');
  if (meb.length) l.push(['uyari', `${meb.length} kursiyer derste ama MEBBİS kaydı işaretlenmemiş`, meb.slice(0, 4).map(tamAd).join(', '), '#/meb']);
  return l;
}
