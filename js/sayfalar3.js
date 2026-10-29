import { S, kaydet, gun, fark, iso, BUGUN, SINIFLAR, EVRAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gonderimEkle, tcGecerli, islem, oturum, eksikEvrak, mebOnKontrol, tcMaskele, yas, sb, sbDers, sbSinav, gorunum, subede, SOZLESME_VARSAYILAN, satistaSiniflar, ayEkle, YONTEMLER, yontemAd, selam, kursAdi } from './veri.js?v=65';
import { e, tl, ik, rozet, plaka, bos, isaret, yonLevhasi, ekranNotu, aracGorsel, pencere, kapatPencere, bildir, tarih, tarihUzun, bugunMetni, fotoKucult, csvIndir, olcumler, imzaAlani, tamTarih, yaziyla, belgeYazdir, kartFormu, kartBagla, kartDogrula, waAc, apiAcik, belgeWhatsApp } from './ui.js?v=65';
import { yenile } from './app.js?v=65';
import { siraliPencere } from './sayfalar5.js?v=65';

/* ================= BELGELER VE ÇIKTILAR ================= */
const gorunumSube = () => gorunum.sube;
const BELGE_GRUP = { fatura: 'Kursiyer', sozlesme: 'Kursiyer', bilgi: 'Kursiyer', takip: 'Kursiyer', makbuz: 'Kursiyer', senet: 'Kursiyer', ek1: 'Kursiyer', denetim: 'MEB ve denetim', devam: 'MEB ve denetim', program: 'MEB ve denetim', sinav: 'MEB ve denetim', dilekce: 'MEB ve denetim', hizmet: 'Sözleşme ve KVKK', vis: 'Sözleşme ve KVKK', aydinlatma: 'Sözleşme ve KVKK' };
const SABLONLAR = [
  ['sozlesme', 'Kursiyer sözleşmesi', 'Ücret, taksit planı ve imza alanlarıyla', 'kursiyer'],
  ['bilgi', 'Kursiyer bilgi formu', 'Kimlik, iletişim, acil durum kişisi, evrak durumu', 'kursiyer'],
  ['takip', 'Direksiyon eğitimi takip formu', 'Yapılan dersler, usta öğretici ve araç, imza sütunu', 'kursiyer'],
  ['makbuz', 'Tahsilat makbuzu', 'Seçtiğiniz tahsilat için, tutar yazıyla', 'makbuz'],
  ['fatura', 'e-Arşiv fatura', 'Kesilmiş faturaların çıktısı', 'fatura'],
  ['senet', 'Senet', 'Senetli ödeme planı olan kursiyerler için', 'senet'],
  ['program', 'Haftalık ders programı', 'Usta öğreticiye göre, kapıya asılacak çizelge', 'egitmen'],
  ['sinav', 'Sınav listesi', 'Oturuma giden kursiyerler, imza sütunuyla', 'sinav'],
  ['denetim', 'Denetim dosyası', 'Kursiyer, ders, araç ve personel kayıtları; eksikler en başta', 'tek'],
  ['ek1', 'Kursiyer kayıt formu (EK-1 düzeni)', 'MTSK Yönetmeliği ekindeki kayıt formu düzeninde', 'kursiyer'],
  ['devam', 'Teorik devam çizelgesi', 'Gruplara göre katılım ve imza sütunu', 'tek'],
  ['hizmet', 'Sinyal hizmet sözleşmesi', 'Erişilebilirlik, sorumluluk, veri teslimi, fesih', 'tek'],
  ['vis', 'Veri işleme sözleşmesi', 'KVKK: kurs veri sorumlusu, Sinyal veri işleyen', 'tek'],
  ['aydinlatma', 'Asistan aydınlatma metni', 'Mesajlaşma kanallarında kişiye gösterilen metin', 'tek'],
  ['dilekce', 'İl MEM’e dijital imza dilekçesi', 'Takip formunda dijital imzanın kabulünü sorar', 'tek'],
];
const imzaHucre = (d, kim) => `<td style="width:90px;text-align:center">${d.imza ? (d.imza[kim] ? `<img src="${d.imza[kim]}" alt="" style="height:26px">${kim === 'kursiyer' && d.imza.kursiyerUzaktan ? '<br><small>uzaktan</small>' : ''}` : kim === 'kursiyer' && d.imza.kursiyerBekliyor ? '<small>bekleniyor</small>' : '<small>dijital ✓</small>') : ''}</td>`;
export function sozlesmeMaddeleri(k) {
  const K = S.kurs, S0 = SINIFLAR[k.sinif], alan = { kurs: K.ad, sinif: S0.ad, teorik: S0.teorik, direksiyon: S0.direksiyon, hak: K.sinavHak || 4, tekrarE: tl((K.tekrarUcret || {}).esinav || 0), tekrarD: tl((K.tekrarUcret || {}).dsinav || 0), ekDers: tl(K.ekDersUcreti || 0) };
  return (K.sozlesme && K.sozlesme.length ? K.sozlesme : SOZLESME_VARSAYILAN).map(m => m.replace(/\{(\w+)\}/g, (x, a) => alan[a] != null ? alan[a] : x));
}
export const dosyaAdi = (belge, kime) => (belge + ' ' + (kime || '')).trim().toLocaleLowerCase('tr').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c])).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
export const makbuzNo = h => { const yil = h.tarih.slice(0, 4), l = S.hareket.filter(x => x.tur === 'Gelir' && x.tarih.slice(0, 4) === yil).sort((a, b) => (a.tarih + a.id).localeCompare(b.tarih + b.id)); return 'M' + yil + '-' + String(l.indexOf(h) + 1).padStart(5, '0'); };
function faturaHtml(no) {
  const f = (S.faturalar || []).find(x => x.no === no); if (!f) return '<p>Fatura bulunamadı.</p>';
  const k = kursiyer(f.kursiyer) || {}, oran = f.kdv, matrah = Math.round(f.tutar / (1 + oran / 100) * 100) / 100, kdv = Math.round((f.tutar - matrah) * 100) / 100, para = n => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
  return `<h1>${f.durum === 'taslak' ? 'e-Arşiv fatura taslağı' : 'e-Arşiv fatura'}</h1>${f.durum === 'taslak' ? '<p style="text-align:center;color:#b45309;font-weight:700;margin:0 0 10px">TASLAK · GİB’e iletilmedi, mali değeri yoktur</p>' : ''}<p class="a4-alt">${e(S.kurs.ad)} · ${e(S.kurs.adres)} · ${e(S.kurs.tel)}${S.entegrasyon && S.entegrasyon.vkn ? ' · VKN ' + e(S.entegrasyon.vkn) : ''}</p>
    <table><tr><th>Fatura no</th><td>${e(f.no)}</td><th>Düzenleme tarihi</th><td>${tamTarih(f.tarih)}</td></tr><tr><th>ETTN</th><td colspan="3" style="font-family:monospace;font-size:11px">${e(f.ettn)}</td></tr><tr><th>Senaryo</th><td>e-Arşiv · temel</td><th>Tip</th><td>Satış</td></tr></table>
    <table><tr><th colspan="4">Alıcı</th></tr><tr><th>Ad soyad</th><td>${e(k.ad ? tamAd(k) : '')}</td><th>TC kimlik no</th><td>${e(k.tc || '11111111111')}</td></tr><tr><th>Adres</th><td colspan="3">${e(k.adres || '')}</td></tr></table>
    <table><tr><th>#</th><th>Mal / hizmet</th><th>Miktar</th><th>Birim fiyat</th><th>KDV %</th><th>Tutar</th></tr><tr><td>1</td><td>${e(f.aciklama)}</td><td>1 adet</td><td>${para(matrah)}</td><td>${oran}</td><td>${para(matrah)}</td></tr></table>
    <table style="width:55%;margin-left:auto"><tr><th>Mal/hizmet toplamı</th><td>${para(matrah)}</td></tr><tr><th>Hesaplanan KDV (%${oran})</th><td>${para(kdv)}</td></tr><tr><th>Ödenecek tutar</th><td><b>${para(f.tutar)}</b></td></tr></table>
    <p>Yalnız: ${yaziyla(f.tutar)}</p><p style="font-size:11px;color:#555">Ödeme: ${e(f.yontem || '')} · ${tamTarih(f.odemeTarih)} tarihli tahsilat. ${f.durum === 'gib' ? 'GİB’e raporlandı.' : f.durum === 'taslak' ? 'Entegratör bağlanınca resmî fatura olarak kesilecek.' : 'e-Arşiv raporuna eklenmek üzere sırada.'}</p>`;
}
const kursBas = baslik => `<h1>${e(baslik)}</h1><p class="a4-alt">${e(S.kurs.ad)} · ${e(S.kurs.adres)} · ${e(S.kurs.tel)}</p>`;
export function belgeHtml(tur, id, hid) {
  if (tur === 'denetim') {
    const eks = denetimEksikleri(), akt = S.kursiyerler.filter(k => k.asama !== 'Ehliyet');
    const yap = S.dersler.filter(d => d.durum === 'Yapıldı'), imz = yap.filter(d => d.imza).length;
    const BG = { sertifika: 'Sertifika', saglik: 'Sağlık raporu', adli: 'Adli sicil' };
    return kursBas('Denetim dosyası') + `<p><b>Hazırlanma:</b> ${tarihUzun(gun(0))} · ${e(oturum.kullanici ? oturum.kullanici.ad : '')}</p>
      <p><b>1. Eksikler (${eks.length})</b></p><table>${eks.map(x => `<tr><td>${e(x[1])}</td><td>${e(x[2])}</td></tr>`).join('') || '<tr><td>Eksik yok.</td></tr>'}</table>
      <p><b>2. Aktif kursiyerler (${akt.length})</b></p><table><tr><th>TC</th><th>Ad soyad</th><th>Sınıf</th><th>Aşama</th><th>Evrak</th><th>MEBBİS</th><th>KVKK</th></tr>${akt.map(k => `<tr><td>${tcMaskele(k.tc)}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${k.asama}</td><td>${EVRAKLAR.length - eksikEvrak(k).length}/${EVRAKLAR.length}</td><td>${k.mebIslendi ? 'Girildi' : 'Bekliyor'}</td><td>${k.kvkk && k.kvkk.riza ? 'Rıza var' : 'YOK'}</td></tr>`).join('')}</table>
      <p><b>3. Direksiyon dersleri</b></p><table><tr><th>Yapılan ders</th><td>${yap.length}</td><th>İmzalı</th><td>${imz} (%${Math.round(imz / Math.max(1, yap.length) * 100)})</td></tr></table>
      <p><b>4. Araçlar</b></p><table><tr><th>Plaka</th><th>Model</th><th>Muayene</th><th>Sigorta</th><th>Kasko</th></tr>${S.araclar.map(a => `<tr><td>${a.plaka}</td><td>${e(a.model)}</td><td>${tamTarih(a.muayene)}</td><td>${tamTarih(a.sigorta)}</td><td>${a.kasko ? tamTarih(a.kasko) : '—'}</td></tr>`).join('')}</table>
      <p><b>5. Usta öğreticiler</b></p><table><tr><th>Ad</th>${Object.values(BG).map(x => `<th>${x}</th>`).join('')}</tr>${S.egitmenler.map(x => `<tr><td>${e(x.ad)}</td>${Object.keys(BG).map(b => `<td>${tamTarih((x.belgeler || {})[b])}${(x.belgeler || {})[b] < gun(0) ? ' (DOLMUŞ)' : ''}</td>`).join('')}</tr>`).join('')}</table>
      <div class="imza"><div>Hazırlayan</div><div>Kurs müdürü</div></div>`;
  }
  if (tur === 'devam') {
    const gr = { aksam: 'Akşam grubu', sabah: 'Sabah grubu' };
    return kursBas('Teorik ders devam çizelgesi') + Object.entries(gr).map(([g, ad]) => { const l = S.kursiyerler.filter(k => k.asama === 'Teorik' && (k.teorikGrup || 'aksam') === g); return `<p><b>${ad}</b> · ${l.length} kursiyer</p><table><tr><th>#</th><th>TC</th><th>Ad soyad</th><th>Sınıf</th><th>Katıldığı ders</th><th>Devamsızlık</th><th>İmza</th></tr>${l.map((k, i) => `<tr><td>${i + 1}</td><td>${e(k.tc)}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${k.teorik} / ${SINIFLAR[k.sinif].teorik}</td><td>${k.devamsiz || 0}</td><td style="width:90px"></td></tr>`).join('') || '<tr><td colspan="7">Bu grupta teorik aşamada kursiyer yok.</td></tr>'}</table>`; }).join('') + `<div class="imza"><div>Teorik öğretmen</div><div>Kurs müdürü</div></div>`;
  }
  if (tur === 'dilekce') { const sb_ = (S.subeler || []).find(x => x.id === (gorunumSube() || 's1')) || {}; return `<p style="text-align:right">${tamTarih(gun(0))}</p><p style="text-align:center;font-weight:700;margin:18px 0">${e(S.kurs.sehir.toLocaleUpperCase('tr'))} İL MİLLÎ EĞİTİM MÜDÜRLÜĞÜNE</p>
      <p>Kurumumuz ${e(S.kurs.ad)}${sb_.kurumKodu ? ' (kurum kodu ' + e(sb_.kurumKodu) + ')' : ''} bünyesinde verilen direksiyon eğitimlerinde, “Direksiyon Eğitimi Takip Formu”ndaki kursiyer ve usta öğretici imzalarının ders bitiminde mobil cihaz üzerinden alınması, imzaların zaman damgası ve ders başlangıç-bitiş saatleriyle birlikte elektronik ortamda saklanması ve denetimde çıktı olarak sunulması planlanmaktadır.</p>
      <p>Bu şekilde alınan elektronik imzaların Motorlu Taşıt Sürücüleri Kursu Yönetmeliği kapsamındaki takip formu için geçerli kabul edilip edilmeyeceği, kabul edilmiyorsa ıslak imzalı formun hangi sıklıkla düzenlenmesi gerektiği hususunda bilgi verilmesini arz ederim.</p>
      <div class="imza"><div></div><div>${e(sb_.mudur || S.kurs.yetkili)}<br>Kurs müdürü</div></div>
      <p style="font-size:12px;margin-top:20px">Adres: ${e(S.kurs.adres)} · Tel: ${e(S.kurs.tel)}</p>`; }
  if (tur === 'hizmet') return kursBas('Sinyal hizmet sözleşmesi (taslak)') + `<p style="font-size:12px;color:#666">Taslak metindir; imzadan önce taraflarca ve hukuk danışmanınızca gözden geçirilir.</p>
    <p><b>Taraflar.</b> ${e(S.kurs.ad)} (“Kurs”) ile Sinyal yazılım hizmetini sunan taraf (“Sağlayıcı”). Sağlayıcının kimlik ve vergi bilgileri imza aşamasında doldurulur.</p>
    <p><b>1. Hizmet.</b> Sinyal yazılımının tarayıcı ve telefon üzerinden kullanımı; kurulum, mevcut kayıtların aktarımı ve kullanıcılara kullanım eğitimi.</p>
    <p><b>2. Erişim ve destek.</b> Sağlayıcı hizmetin kesintisiz çalışması için gereken özeni gösterir. Planlı bakım önceden bildirilir. Destek WhatsApp üzerinden verilir.</p>
    <p><b>3. Mevzuat.</b> Sinyal’in MEB kural kontrolleri yardımcıdır; kuralın kaynağı ekranda gösterilir. MEBBİS’e girilen bilginin doğruluğu ve son karar Kurs’tadır.</p>
    <p><b>4. Veriler.</b> Kurs veri sorumlusu, Sağlayıcı veri işleyendir (ayrı Veri İşleme Sözleşmesi). Veriler Google Firebase altyapısında, Avrupa Birliği’ndeki veri merkezinde şifreli saklanır. Kurs istediği an tüm verisini indirebilir.</p>
    <p><b>5. Ücret.</b> Ücret ve ödeme koşulları bu sözleşmenin ekinde belirlenir.</p>
    <p><b>6. Fesih.</b> Taraflar ekte belirtilen bildirim süresiyle sözleşmeyi feshedebilir. Fesihten sonra veriler 30 gün içinde Excel olarak teslim edilir, ardından silinir.</p>
    <div class="imza"><div>Kurs</div><div>Sağlayıcı</div></div>`;
  if (tur === 'vis') return kursBas('Veri işleme sözleşmesi (KVKK, taslak)') + `<p style="font-size:12px;color:#666">Taslak metindir; imzadan önce taraflarca ve hukuk danışmanınızca gözden geçirilir.</p><table>
    <tr><th>Veri sorumlusu</th><td>${e(S.kurs.ad)}</td></tr><tr><th>Veri işleyen</th><td>Sinyal hizmet sağlayıcısı</td></tr>
    <tr><th>İşlenen veri</th><td>Kimlik, iletişim, öğrenim, sağlık raporu ve adli sicil (özel nitelikli), fotoğraf, ödeme, ders ve sınav kayıtları, mesajlaşma içerikleri</td></tr>
    <tr><th>Amaç</th><td>Sürücü kursu eğitiminin yürütülmesi, MEB mevzuatı gereği kayıtlar, ödeme ve iletişim</td></tr>
    <tr><th>Yer</th><td>Google Firebase (Google Cloud), Avrupa Birliği’ndeki (Frankfurt) veri merkezi. Yurt dışına aktarım KVKK’nın 9. maddesine göre standart sözleşmeyle yapılır ve Kurul’a bildirilir.</td></tr>
    <tr><th>Güvenlik</th><td>Aktarımda ve depolamada şifreleme, kullanıcıya özel giriş, rol bazlı yetki, işlem kaydı, düzenli yedek</td></tr>
    <tr><th>Alt işleyenler</th><td>Google (barındırma), Meta/WhatsApp (mesaj iletimi), Cloudflare (mesaj köprüsü ve kısa bağlantılar); Kurs’un seçtiği e-Arşiv entegratörü ve ödeme kuruluşu. Değişiklik önceden bildirilir.</td></tr>
    <tr><th>İhlal bildirimi</th><td>Öğrenildiği anda, gecikmeksizin Kurs’a</td></tr>
    <tr><th>Saklama ve imha</th><td>Kurs’un belirlediği sürelerle; sözleşme bitince 30 gün içinde teslim ve imha</td></tr>
  </table><div class="imza"><div>Veri sorumlusu</div><div>Veri işleyen</div></div>`;
  if (tur === 'aydinlatma') { const v = S.sosyal ? S.sosyal.ayar.veri : { konum: 'tr', saklamaAy: 12 }; return kursBas('Mesajlaşma kanalları aydınlatma metni') + `<p>${e(S.kurs.ad)} olarak Instagram, Facebook ve WhatsApp üzerinden bize yazdığınız mesajları; kurs hakkında bilgi vermek, kayıt görüşmesi ayarlamak ve sizi geri aramak amacıyla işliyoruz.</p>
      <p>Mesajlarınıza ilk olarak kursun otomatik asistanı cevap verir. Asistan yalnızca kursun onayladığı bilgileri kullanır; cevabını bilmediği soruları, sağlık durumu, şikâyet ve pazarlık gibi konuları kurs yetkilisine aktarır.</p>
      <p>Mesajlarınız ${v.konum === 'tr' ? 'Türkiye’deki sunucularda işlenir, yurt dışına aktarılmaz' : 'Avrupa Birliği’ndeki bir sunucuda işlenir; bu aktarım KVKK’ya uygun standart sözleşmeyle yapılır'}. Konuşmalar ${v.saklamaAy} ay saklanır, ardından silinir.</p>
      <p>KVKK’nın 11. maddesi kapsamındaki haklarınız (bilgi talep etme, düzeltme, silme, itiraz) için ${e(S.kurs.tel)} numarasından ya da kursa yazılı olarak başvurabilirsiniz.</p>`; }
  if (tur === 'program') {
    const eg = egitmen(id), gunler = []; for (let n = 0; n < 7; n++) gunler.push(gun(n));
    return kursBas('Haftalık direksiyon programı') + `<p><b>Usta öğretici:</b> ${e(eg.ad)} &nbsp; <b>Araç:</b> ${e(S.araclar.filter(a => a.egitmen === eg.id).map(a => a.plaka + ' (' + a.vites.toLowerCase() + ')').join(', ') || '—')}</p><table><tr><th>Gün</th><th>Saat</th><th>Kursiyer</th><th>Telefon</th></tr>${gunler.flatMap(g => S.dersler.filter(d => d.egitmen === eg.id && d.tarih === g).sort((a, b) => a.saat.localeCompare(b.saat)).map(d => `<tr><td>${tarihUzun(g)}</td><td>${d.saat}</td><td>${e(tamAd(kursiyer(d.kursiyer)))}</td><td>${e(kursiyer(d.kursiyer).tel)}</td></tr>`)).join('') || '<tr><td colspan="4">Bu hafta ders yok.</td></tr>'}</table>`;
  }
  if (tur === 'sinav') {
    const s = S.sinavlar.find(x => x.id === id);
    return kursBas(s.tur + ' listesi') + `<p><b>Tarih:</b> ${tarihUzun(s.tarih)} ${s.saat} &nbsp; <b>Yer:</b> ${e(s.yer)}</p><table><tr><th>#</th><th>Ad soyad</th><th>Sınıf</th><th>Telefon</th><th>İmza</th></tr>${s.kursiyerler.map(kursiyer).filter(Boolean).map((k, i) => `<tr><td>${i + 1}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${e(k.tel)}</td><td style="width:120px"></td></tr>`).join('')}</table>`;
  }
  if (tur === 'fatura') return faturaHtml(id);
  if (tur === 'makbuz' && String(id).startsWith('h')) { const h = S.hareket.find(x => x.id === id); return h && kursiyer(h.kursiyer) ? belgeHtml('makbuz', h.kursiyer, id) : ''; }
  const k = kursiyer(id); if (!k) return '';
  const S0 = SINIFLAR[k.sinif];
  if (tur === 'sozlesme') {
    const K = S.kurs, maddeler = sozlesmeMaddeleri(k);
    const imz = k.sozlesmeImza;
    return kursBas('Kursiyer eğitim sözleşmesi') + `<p style="text-align:right">Sözleşme no: ${e(k.id.replace('k', 'S-'))} · ${tamTarih(k.kayit)}</p>
    <table><tr><th colspan="4">Kursiyer</th></tr><tr><th>Ad soyad</th><td>${e(tamAd(k))}</td><th>TC kimlik no</th><td>${e(k.tc || '')}</td></tr><tr><th>Doğum tarihi</th><td>${tamTarih(k.dogumTarihi)}</td><th>Telefon</th><td>${e(k.tel)}</td></tr><tr><th>Adres</th><td colspan="3">${e(k.adres || '')}</td></tr>
    <tr><th colspan="4">Kurs</th></tr><tr><th>Unvan</th><td>${e(K.ad)}</td><th>Telefon</th><td>${e(K.tel)}</td></tr><tr><th>Adres</th><td colspan="3">${e(K.adres)}</td></tr></table>
    <table><tr><th>Sertifika sınıfı</th><td>${S0.ad}</td><th>Kayıt tarihi</th><td>${tamTarih(k.kayit)}</td></tr><tr><th>Kurs ücreti</th><td>${tl(k.odeme.toplam)}${k.odeme.indirim ? `<br><small>${e(k.odeme.indirim.ad)} indirimi −${tl(k.odeme.indirim.tutar)} uygulandı</small>` : ''}</td><th>Peşinat</th><td>${tl(k.odeme.pesin)} · ${tamTarih(k.odeme.pesinTarih)}</td></tr></table>
    <p><b>Ödeme planı</b></p><table><tr><th>#</th><th>Vade</th><th>Tutar</th></tr>${k.odeme.taksitler.map((t, i) => `<tr><td>${i + 1}</td><td>${tamTarih(t.vade)}</td><td>${tl(t.tutar)}</td></tr>`).join('') || '<tr><td colspan="3">Peşin ödendi</td></tr>'}</table>
    ${maddeler.map((m, i) => { const n = m.indexOf('. '); return `<p><b>${i + 1}. ${e(n > 0 && n < 40 ? m.slice(0, n) : '')}${n > 0 && n < 40 ? '.' : ''}</b> ${e(n > 0 && n < 40 ? m.slice(n + 2) : m)}</p>`; }).join('')}
    <div class="son"><p>İki nüsha düzenlenmiş, birer nüshası taraflarda kalmıştır.</p>
    <div class="imza"><div>${imz && imz.url ? `<img src="${imz.url}" alt="Kursiyer imzası" style="height:50px;display:block;margin:-56px auto 4px">` : ''}Kursiyer · ${e(tamAd(k))}${imz ? `<small style="display:block">${imz.yontem === 'Islak imza' ? 'Islak imza' : /^Uzaktan/.test(imz.yontem || '') ? 'Elektronik imza · WhatsApp linki' : 'Elektronik imza · kursta'} · ${tamTarih(imz.tarih)}</small>` : ''}</div><div>Kurs müdürü · ${e(K.yetkili || '')}<small style="display:block">${e(K.ad)}</small></div></div></div>`;
  }
  if (tur === 'ek1') return kursBas('Motorlu taşıt sürücüleri kursu kursiyer kayıt formu') + `<p style="font-size:11.5px;color:#555">MTSK Yönetmeliği ekindeki kayıt formu düzeninde hazırlanmıştır. İl MEM’inizin örneğiyle farklılık varsa bildirin, 1 iş günü içinde güncellenir.</p>
      <table><tr><th>TC kimlik no</th><td>${e(k.tc || '')}</td><th>Kayıt tarihi</th><td>${tamTarih(k.kayit)}</td></tr>
      <tr><th>Adı</th><td>${e(k.ad)}</td><th>Soyadı</th><td>${e(k.soyad)}</td></tr><tr><th>Cinsiyet</th><td>${e(k.cinsiyet || '')}</td><th>Sağlık raporu</th><td>${e(k.saglikRapor ? k.saglikRapor.no + ' · ' + (k.saglikRapor.tarih || '') : '')}</td></tr>
      <tr><th>Doğum tarihi</th><td>${e(k.dogumTarihi ? k.dogumTarihi.split('-').reverse().join('.') : k.dogum || '')}</td><th>Öğrenim durumu</th><td>${e(k.ogrenim || '')}</td></tr>
      <tr><th>İstenen sertifika</th><td>${S0.ad}</td><th>Mevcut sürücü belgesi</th><td>${e(k.mevcutEhliyet || 'Yok')}</td></tr>
      <tr><th>Adres</th><td colspan="3">${e(k.adres || '')}</td></tr><tr><th>Telefon</th><td>${e(k.tel)}</td><th>Dönem / grup</th><td>${(k.teorikGrup || 'aksam') === 'sabah' ? 'Sabah' : 'Akşam'}</td></tr></table>
      <p><b>Teslim alınan belgeler</b></p><table>${EVRAKLAR.map(([x, t]) => `<tr><td>${t}</td><td style="width:80px">${k.evrak[x] ? 'Var' : 'Yok'}</td></tr>`).join('')}</table>
      <p style="font-size:12px">Beyan ettiğim bilgilerin doğru olduğunu, kişisel verilerimin aydınlatma metninde belirtilen amaçlarla işlenmesine onay verdiğimi kabul ederim.</p>
      <div class="imza"><div>Kursiyer</div><div>Kurs müdürü</div></div>`;
  if (tur === 'bilgi') return kursBas('Kursiyer bilgi formu') + `<table><tr><th>Ad soyad</th><td>${e(tamAd(k))}</td><th>TC kimlik no</th><td>${e(k.tc || '')}</td></tr><tr><th>Doğum tarihi</th><td>${tamTarih(k.dogumTarihi)}</td><th>Cinsiyet</th><td>${e(k.cinsiyet || '')}</td></tr><tr><th>Telefon</th><td>${e(k.tel)}</td><th>Öğrenim</th><td>${e(k.ogrenim || '')}</td></tr><tr><th>Adres</th><td colspan="3">${e(k.adres || '')}</td></tr>
    <tr><th>Sınıf</th><td>${S0.ad}</td><th>Kayıt tarihi</th><td>${tamTarih(k.kayit)}</td></tr><tr><th>Usta öğretici</th><td>${e(egitmen(k.egitmen).ad)}</td><th>Teorik grup</th><td>${(k.teorikGrup || 'aksam') === 'sabah' ? 'Sabah' : 'Akşam'}</td></tr><tr><th>Mevcut ehliyet</th><td>${e(k.mevcutEhliyet || 'Yok')}</td><th>Nereden duydu</th><td>${e(k.kaynak)}</td></tr>
    <tr><th>Acil durum kişisi</th><td colspan="3">${e(k.acil && k.acil.ad ? k.acil.ad + (k.acil.yakinlik ? ' (' + k.acil.yakinlik + ')' : '') + ' · ' + k.acil.tel : '—')}</td></tr>
    <tr><th>Sağlık raporu</th><td>${e(k.saglikRapor ? k.saglikRapor.no + ' · ' + (k.saglikRapor.tarih || '') : '—')}</td><th>Adli sicil barkodu</th><td>${e(k.adliSicil ? k.adliSicil.barkod : '—')}</td></tr></table>
    <p><b>Evrak durumu</b></p><table>${EVRAKLAR.map(([key, t]) => `<tr><td>${t}</td><td style="width:140px">${k.evrak[key] ? 'Teslim alındı' : 'Eksik'}</td></tr>`).join('')}</table><div class="imza"><div>Kursiyer</div><div>Teslim alan</div></div>`;
  if (tur === 'takip') { const d = S.dersler.filter(x => x.kursiyer === k.id && x.durum === 'Yapıldı').sort((a, b) => a.tarih.localeCompare(b.tarih)); return kursBas('Direksiyon eğitimi takip formu') + `<i data-yatay></i><p><b>Kursiyer:</b> ${e(tamAd(k))} &nbsp; <b>Sınıf:</b> ${S0.ad}</p>${(() => { const y = S.kurs.imzaYontemi || 'ikili', dij = y !== 'islak', isl = y !== 'dijital'; return `<table><tr><th>#</th><th>Tarih</th><th>Başlangıç–bitiş</th><th>Usta öğretici</th><th>Araç</th>${dij ? '<th>Kursiyer (dijital)</th><th>Usta öğr. (dijital)</th>' : ''}${isl ? '<th>Kursiyer ıslak imza</th><th>Usta öğr. ıslak imza</th>' : ''}</tr>${Array.from({ length: Math.max(S0.direksiyon, d.length) }, (_, i) => d[i] ? `<tr><td>${i + 1}</td><td>${tamTarih(d[i].tarih)}</td><td>${d[i].bas ? d[i].bas + '–' + d[i].bit + ' (' + d[i].sure + ' dk)' : d[i].saat}</td><td>${e(egitmen(d[i].egitmen).ad)}</td><td>${d[i].arac ? arac(d[i].arac).plaka : ''}</td>${dij ? imzaHucre(d[i], 'kursiyer') + imzaHucre(d[i], 'usta') : ''}${isl ? '<td style="width:90px"></td><td style="width:90px"></td>' : ''}</tr>` : `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td>${dij ? '<td></td><td></td>' : ''}${isl ? '<td></td><td></td>' : ''}</tr>`).join('')}</table><p style="font-size:11.5px;color:#555">${{ ikili: 'Dijital imzalar ders sonunda usta öğreticinin telefonunda alınmış, zaman damgasıyla saklanmıştır. Islak imza sütunları haftalık olarak doldurulur.', dijital: 'Dijital imzalar ders sonunda alınmış, zaman damgasıyla saklanmıştır. Kurs, il MEM’in dijital imza onayını dosyasında saklar.', islak: 'Her ders sonunda ıslak imzalanır.' }[y]}${d.some(x => x.imza && x.imza.kursiyerUzaktan) ? ' “Uzaktan” yazan kursiyer imzaları, kursiyerin kendi telefonundan kursun gönderdiği imza linkiyle alınmış ve mühürle doğrulanmıştır.' : ''}</p>`; })()}`; }
  if (tur === 'makbuz') {
    const h = (hid && S.hareket.find(x => x.id === hid)) || S.hareket.filter(x => x.kursiyer === k.id && x.tur === 'Gelir').sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
    if (!h) return kursBas('Tahsilat makbuzu') + '<p>Bu kursiyerden henüz tahsilat yok.</p>';
    return kursBas('Tahsilat makbuzu') + `<table><tr><th>Makbuz no</th><td>${makbuzNo(h)}</td><th>Tarih</th><td>${tamTarih(h.tarih)}</td></tr><tr><th>Ödeyen</th><td>${e(tamAd(k))}</td><th>TC kimlik no</th><td>${e(k.tc || '')}</td></tr><tr><th>Ödeme yöntemi</th><td>${e(h.yontem || '')}</td><th>Kategori</th><td>${e(h.kategori || '')}</td></tr><tr><th>Açıklama</th><td colspan="3">${e(h.aciklama)}</td></tr><tr><th>Tutar</th><td colspan="3"><b>${tl(h.tutar)}</b> · ${yaziyla(h.tutar)}</td></tr><tr><th>Kalan borç</th><td colspan="3">${tl(kalanBorc(k))}</td></tr></table>
      <p style="font-size:11px;color:#555">Bu makbuz tahsilatın alındığını gösterir; fatura yerine geçmez.${h.fatura ? ' Fatura no: ' + e(h.fatura) : ''}</p><div class="imza"><div>Ödeyen</div><div>Tahsil eden${h.kim ? '<small style="display:block">' + e(h.kim) + '</small>' : ''}</div></div>`;
  }
  if (tur === 'senet') {
    const acik = k.odeme.taksitler.map((t, i) => ({ t, i })).filter(x => !x.t.odendi && !x.t.iptal);
    if (!acik.length) return kursBas('Senet') + '<p>Ödenmemiş taksit yok; senet düzenlenecek borç kalmadı.</p>';
    return acik.map(({ t, i }, n) => `<div class="${n < acik.length - 1 ? 'sayfa-sonu' : ''}"><h1>Bono (emre muharrer senet)</h1><p class="a4-alt">${i + 1}. taksit · ${n + 1}/${acik.length}</p>
      <table><tr><th>Düzenleme yeri</th><td>${e(S.kurs.sehir || '')}</td><th>Düzenleme tarihi</th><td>${tamTarih(k.odeme.pesinTarih || k.kayit)}</td></tr><tr><th>Ödeme günü</th><td>${tamTarih(t.vade)}</td><th>Ödeme yeri</th><td>${e(S.kurs.sehir || '')}</td></tr><tr><th>Tutar</th><td colspan="3"><b>${tl(t.tutar)}</b> · #${yaziyla(t.tutar)}#</td></tr></table>
      <p>İşbu bononun karşılığında ${tamTarih(t.vade)} tarihinde ${e(S.kurs.ad)} veya emrühavalesine yukarıda yazılı tutarı kayıtsız şartsız ödeyeceğim. Bedeli eğitim hizmeti olarak alınmıştır. Ödenmediği takdirde ${e(S.kurs.sehir || '')} mahkeme ve icra daireleri yetkilidir.</p>
      <table><tr><th colspan="2">Borçlu (düzenleyen)</th></tr><tr><th style="width:30%">Ad soyad</th><td>${e(tamAd(k))}</td></tr><tr><th>TC kimlik no</th><td>${e(k.tc || '')}</td></tr><tr><th>Adres</th><td>${e(k.adres || '')}</td></tr></table>
      <table><tr><th colspan="2">Kefil (aval veren) · isteğe bağlı</th></tr><tr><th style="width:30%">Ad soyad</th><td></td></tr><tr><th>TC kimlik no</th><td></td></tr><tr><th>Adres</th><td></td></tr></table>
      <div class="imza"><div>Borçlu imzası</div><div>Kefil imzası</div></div></div>`).join('');
  }
  return '';
}
// Kayıt sonrası sözleşme: ekranda parmakla imza ya da yazdırıp ıslak imza
export function sozlesmeImzalat(k) {
  pencere({
    baslik: 'Sözleşme · ' + tamAd(k), genis: true,
    icerik: `<div style="background:var(--zemin);padding:14px;border-radius:8px;max-height:44vh;overflow:auto"><div class="a4">${belgeHtml('sozlesme', k.id)}</div></div>
      <p class="et" style="margin:14px 0 6px">Kursiyer imzası · tablete ya da ekrana parmakla</p><canvas class="imza-alan" width="900" height="260" data-imza aria-label="Kursiyer imza alanı"></canvas><button class="dg dg-hafif dg-kucuk" data-temizle type="button" style="margin-top:6px">Temizle</button>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Sonra</button><button class="dg dg-wp" data-uzaktan>${ik('wp')}WhatsApp’tan imzaya gönder</button><button class="dg dg-cizgi" data-yazdir>${ik('belge')}Yazdır, ıslak imza</button><button class="dg dg-ana" data-imzala>Ekranda imzayı kaydet</button>`,
    onAc(d) {
      const ia = imzaAlani(d.querySelector('[data-imza]'));
      d.querySelector('[data-temizle]').addEventListener('click', () => ia.temizle());
      d.querySelector('[data-uzaktan]').addEventListener('click', () => import('./imza.js?v=65').then(m => m.imzayaGonderPenceresi(k, 'sozlesme')));
      d.querySelector('[data-yazdir]').addEventListener('click', () => { belgeYazdir(belgeHtml('sozlesme', k.id) + '<div class="sayfa-sonu"></div>' + belgeHtml('sozlesme', k.id), 'Sözleşme · ' + tamAd(k)); islem('Sözleşme yazdırdı', tamAd(k)); kaydet(); bildir('İki nüsha yazdırıldı. İmzalı nüshayı teslim alınca Evraklar’da “İmzalı sözleşme”yi işaretleyin'); });
      d.querySelector('[data-imzala]').addEventListener('click', () => {
        if (ia.bos()) return bildir('Kursiyer imza alanına imzalasın', 'uyari');
        k.sozlesmeImza = { tarih: gun(0), yontem: 'Ekranda', url: ia.url() }; k.evrak.sozlesme = true;
        if (!eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama)) k.asama = 'Teorik';
        islem('Sözleşme imzalattı', tamAd(k) + ' · ekranda'); kaydet(); kapatPencere(); yenile();
        if (apiAcik()) belgeWhatsApp(belgeHtml('sozlesme', k.id), dosyaAdi('Sözleşme', tamAd(k)), `${selam(k)} imzaladığınız kurs sözleşmesinin kopyası ekte. ${S.kurs.ad}`, tamAd(k), 'ÖĞRENCİ'); else bildir('Sözleşme imzalandı. Kopyasını Belgeler › Sözleşme › “PDF’i WhatsApp’tan gönder”le iletebilirsiniz');
      });
    },
  });
}
export function belgeAc(tur, id) {
  const s = SABLONLAR.find(x => x[0] === tur);
  const yazdirBtn = `<button class="dg dg-ana" data-yazdir>${ik('belge')}Yazdır / PDF</button>`;
  if (s[3] === 'tek') { pencere({ baslik: s[1], genis: true, icerik: `<div style="background:var(--zemin);padding:18px;border-radius:8px;max-height:66vh;overflow:auto"><div class="a4" id="a4">${belgeHtml(tur)}</div></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${yazdirBtn}`, onAc(d) { d.querySelector('[data-yazdir]').addEventListener('click', () => { belgeYazdir(belgeHtml(tur), s[1]); islem(s[1] + ' yazdırdı'); kaydet(); }); } }); return; }
  const gelir = () => S.hareket.filter(h => h.tur === 'Gelir' && h.kursiyer && subede(kursiyer(h.kursiyer))).sort((a, b) => (b.tarih + b.id).localeCompare(a.tarih + a.id));
  const secici = { kursiyer: () => sb(S.kursiyerler).filter(k => tur !== 'takip' || k.direksiyon > 0 || S.dersler.some(d => d.kursiyer === k.id && d.durum === 'Yapıldı')), senet: () => sb(S.kursiyerler).filter(k => k.odeme.senetli), egitmen: () => sb(S.egitmenler), sinav: () => sbSinav(S.sinavlar).slice().sort((a, b) => b.tarih.localeCompare(a.tarih)), makbuz: gelir, fatura: () => (S.faturalar || []).slice().reverse() }[s[3]]();
  const kimOf = x => x.no ? x.no : x.id, ad = x => x.no ? x.no + ' · ' + (kursiyer(x.kursiyer) ? tamAd(kursiyer(x.kursiyer)) : '') + ' · ' + tl(x.tutar) : s[3] === 'makbuz' ? tamAd(kursiyer(x.kursiyer)) + ' · ' + tamTarih(x.tarih) + ' · ' + tl(x.tutar) : x.tur ? x.tur + ' · ' + tamTarih(x.tarih) : x.soyad ? tamAd(x) : x.ad;
  if (s[3] === 'makbuz' && id && kursiyer(id)) id = (S.hareket.filter(h => h.tur === 'Gelir' && h.kursiyer === id).sort((a, b) => (b.tarih + b.id).localeCompare(a.tarih + a.id))[0] || {}).id;
  if (id && !secici.some(x => kimOf(x) === id)) { const x = { kursiyer: () => kursiyer(id), senet: () => kursiyer(id), egitmen: () => egitmen(id), sinav: () => S.sinavlar.find(y => y.id === id), makbuz: () => S.hareket.find(y => y.id === id), fatura: () => (S.faturalar || []).find(y => y.no === id) }[s[3]](); if (x) secici.unshift(x); }
  if (!secici.length) return pencere({ baslik: s[1], icerik: bos(s[3] === 'fatura' ? 'Henüz fatura kesilmedi' : s[3] === 'makbuz' ? 'Henüz tahsilat yok' : 'Bu belge için kayıt yok', s[3] === 'fatura' ? 'Kasa › Fatura kes’ten tahsilatı seçip faturalayın.' : 'Kayıt oluşunca belge burada hazırlanır.'), altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
  if (!id || !secici.some(x => kimOf(x) === id)) id = kimOf(secici[0]);
  const alici = v => { if (s[3] === 'egitmen') return (egitmen(v) || {}).ad; if (s[3] === 'sinav') return null; if (s[3] === 'makbuz') { const h = S.hareket.find(x => x.id === v); return h && kursiyer(h.kursiyer); } if (s[3] === 'fatura') { const f = S.faturalar.find(x => x.no === v); return f && kursiyer(f.kursiyer); } return kursiyer(v); };
  pencere({
    baslik: s[1], genis: true,
    icerik: `<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap"><select class="girdi" style="max-width:360px" data-kim aria-label="Seçim">${secici.map(x => `<option value="${e(kimOf(x))}" ${kimOf(x) === id ? 'selected' : ''}>${e(ad(x))}</option>`).join('')}</select><span style="color:var(--soluk);font-size:13.5px">Bilgiler kayıtlardan otomatik doldurulur.</span></div><div style="background:var(--zemin);padding:18px;border-radius:8px;max-height:62vh;overflow:auto"><div class="a4" id="a4">${belgeHtml(tur, id)}</div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${s[3] === 'sinav' ? '' : `<button class="dg dg-wp" data-wpb>${ik('wp')}PDF’i WhatsApp’tan gönder</button>`}${yazdirBtn}`,
    onAc(d) {
      const sec = d.querySelector('[data-kim]');
      sec.addEventListener('change', () => { d.querySelector('#a4').innerHTML = belgeHtml(tur, sec.value); });
      d.querySelector('[data-yazdir]').addEventListener('click', () => { const a = alici(sec.value); belgeYazdir(belgeHtml(tur, sec.value), s[1] + (a ? ' · ' + (typeof a === 'string' ? a : tamAd(a)) : '')); islem(s[1] + ' yazdırdı', a ? (typeof a === 'string' ? a : tamAd(a)) : ''); kaydet(); });
      const w = d.querySelector('[data-wpb]'); if (w) w.addEventListener('click', () => { const a = alici(sec.value); if (!a) return bildir('Bu belgenin alıcısı yok', 'uyari'); const kime = typeof a === 'string' ? a : tamAd(a), tel = typeof a === 'string' ? ((S.egitmenler.find(x => x.ad === a) || {}).tel || '') : a.tel;
        if (apiAcik()) { w.disabled = true; w.textContent = 'PDF hazırlanıyor…'; return belgeWhatsApp(belgeHtml(tur, sec.value), dosyaAdi(s[1], kime), `${selam(kime)} ${s[1].toLocaleLowerCase('tr')} ekte. ${S.kurs.ad}`, kime, typeof a === 'string' ? 'HOCA' : 'ÖĞRENCİ').then(r => { w.disabled = false; w.innerHTML = 'PDF’i WhatsApp’tan gönder'; if (r.ok) { gonderimEkle(kime, s[1] + ' (PDF)', 'Belge'); islem(s[1] + ' gönderdi', kime); kaydet(); } }); } bildir('Yazdırma penceresinde “PDF olarak kaydet”i seçin; sonra WhatsApp açılınca dosyayı ekleyin'); belgeYazdir(belgeHtml(tur, sec.value), s[1] + ' · ' + kime).then(() => { waAc(tel, `${selam(kime)} ${s[1].toLocaleLowerCase('tr')} ekte. ${S.kurs.ad}`, 'WhatsApp', kime, true); gonderimEkle(kime, s[1] + ' (PDF)', 'Belge'); islem(s[1] + ' gönderdi', kime); kaydet(); }); });
    },
  });
}
export function belgeler() {
  return {
    baslik: 'Belgeler ve çıktılar', alt: 'Kayıtlardan otomatik dolan, yazdırmaya hazır formlar',
    html: `${ekranNotu('Formu seçin, kişiyi seçin; bilgiler kayıttan dolar. Yazdırın ya da WhatsApp’tan PDF olarak gönderin.')}
    ${['Kursiyer', 'MEB ve denetim', 'Sözleşme ve KVKK'].map(g => `<div class="bolum-bas" style="margin-top:6px"><div><h2>${g}</h2></div></div><div class="belge-liste" style="margin-bottom:18px">${SABLONLAR.filter(x => BELGE_GRUP[x[0]] === g).map(([k, t, a]) => `<button class="belge-kart" data-belge="${k}"><span class="kagit"><i></i><i></i><i style="width:80%"></i><i></i><i style="width:65%"></i><i style="width:90%"></i></span><b>${t}</b><small>${a}</small></button>`).join('')}</div>`).join('')}`,
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
    <div class="izgara iz-2" style="gap:10px">${satistaSiniflar().map(([k, v]) => `<label style="cursor:pointer"><input type="radio" name="sinif" value="${k}" ${k === kayit.sinif ? 'checked' : ''} style="position:absolute;opacity:0"><span class="kart" style="display:block;padding:8px;${k === kayit.sinif ? 'border-color:var(--levha);box-shadow:0 0 0 2px var(--levha)' : ''}">${(() => { const ar = S.araclar.find(a => a.sinif === k) || arac(SINIF_ARAC[k]); return ar ? aracGorsel(ar) : ''; })()}<b style="display:block;font-family:var(--baslik);font-size:17px;color:var(--murekkep);margin:8px 4px 0">${v.ad}</b><span style="display:block;margin:0 4px 4px;color:var(--metin)">${tl(v.ucret)} · 5 aya kadar taksit</span></span></label>`).join('')}</div>`;
  if (kayit.adim === 1) govde = `<h2 style="font-size:26px;margin-bottom:14px">Seni tanıyalım</h2><form class="form-izgara" id="f-k1">
    <div class="alan"><label>Ad</label><input name="ad" required value="${e(kayit.bilgi.ad || '')}" autocomplete="given-name"></div><div class="alan"><label>Soyad</label><input name="soyad" required value="${e(kayit.bilgi.soyad || '')}" autocomplete="family-name"></div>
    <div class="alan"><label>TC kimlik no</label><input name="tc" inputmode="numeric" maxlength="11" required value="${e(kayit.bilgi.tc || '')}"></div><div class="alan"><label>Doğum tarihi</label><input name="dogumTarihi" type="date" value="${e(kayit.bilgi.dogumTarihi || '')}"></div>
    <div class="alan"><label>Cinsiyet</label><select name="cinsiyet"><option value="">Seçin</option>${['Kadın', 'Erkek'].map(x => `<option ${kayit.bilgi.cinsiyet === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="alan"><label>Öğrenim durumu</label><select name="ogrenim">${['İlkokul', 'Ortaokul', 'Lise', 'Önlisans', 'Lisans', 'Yüksek lisans'].map(x => `<option ${(kayit.bilgi.ogrenim || 'Lise') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" required value="${e(kayit.bilgi.tel || '')}" placeholder="05xx xxx xx xx" autocomplete="tel"></div><div class="alan"><label>Adres</label><input name="adres" value="${e(kayit.bilgi.adres || '')}" placeholder="Mahalle, ilçe"></div>
    <div class="alan"><label>Acil durumda aranacak kişi</label><input name="acil" value="${e(kayit.bilgi.acil || '')}" placeholder="Ad soyad"></div><div class="alan"><label>Onun telefonu</label><input name="acilTel" inputmode="tel" value="${e(kayit.bilgi.acilTel || '')}"></div></form>`;
  if (kayit.adim === 2) govde = `<h2 style="font-size:26px;margin-bottom:6px">Evrakların</h2><p style="color:var(--soluk);margin-bottom:16px">Telefonla fotoğrafını çek, yükle. Eksik kalanı ${kursAdi('e')} getirebilirsin.</p>
    ${EVRAKLAR.filter(([k]) => k !== 'sozlesme').map(([k, t]) => `<label class="yukle" style="margin-bottom:8px;position:relative">${kayit.evrak[k] ? `<img src="${kayit.evrak[k]}" alt="">` : isaret('bilgi', 26)}<span style="flex:1"><b style="display:block;color:var(--murekkep)">${t}</b><small style="color:var(--soluk)">${kayit.evrak[k] ? 'Yüklendi' : 'Fotoğraf çek ya da seç'}</small></span>${kayit.evrak[k] ? isaret('tamam', 22) : ''}<input type="file" accept="image/*" capture="environment" data-evrak="${k}"></label>`).join('')}`;
  if (kayit.adim === 3) { const v = SINIFLAR[kayit.sinif], p = Math.min(8000, Math.round(v.ucret * 0.3 / 500) * 500), n = 4, pos = S.entegrasyon.pos.bagli, mad = sozlesmeMaddeleri({ sinif: kayit.sinif }); govde = `<h2 style="font-size:26px;margin-bottom:14px">Son adım</h2>
    <div class="kart" style="padding:14px 16px;margin-bottom:12px"><div style="display:flex;justify-content:space-between"><b style="color:var(--murekkep)">${v.ad}</b><b class="sayi" style="color:var(--murekkep)">${tl(v.ucret)}</b></div><p style="font-size:14px;margin-top:4px">Bugün ${tl(p)} peşinat, sonra ${n} × ${tl((v.ucret - p) / n)}</p></div>
    <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-bottom:12px"><input type="checkbox" data-kvkk ${kayit.kvkk ? 'checked' : ''} style="width:18px;height:18px;margin-top:2px"><span>Aydınlatma metnini okudum; sağlık raporu ve adli sicil bilgilerimin MEB kaydı için işlenmesine açık rıza veriyorum. <a href="#" data-aydinlatma-oku style="color:var(--levha);font-weight:700">Metni oku</a></span></label>
    <details data-resmi class="kart" style="padding:12px 14px;margin-bottom:12px" open><summary style="cursor:pointer;font-weight:700;color:var(--murekkep)">Kurs sözleşmesini oku</summary><div style="max-height:240px;overflow:auto;font-size:13px;margin-top:8px">${mad.map((m, i) => `<p style="margin:6px 0"><b>${i + 1}.</b> ${e(m)}</p>`).join('')}<p style="margin:6px 0"><b>Cayma hakkı.</b> Kayıttan itibaren 14 gün içinde ve eğitim başlamadıysa gerekçe göstermeden cayabilirsin; ödediğin tutar 14 gün içinde iade edilir. Cayma için ${e(S.kurs.tel)} numarasını araman ya da ${kursAdi('e')} yazman yeterli.</p></div></details>
    <p class="et" style="margin-bottom:6px">Sözleşmeyi okudum, parmağımla imzalıyorum</p><canvas class="imza-alan" width="900" height="300" aria-label="İmza alanı"></canvas><button class="dg dg-hafif dg-kucuk" data-temizle type="button">Temizle</button>
    <p class="et" style="margin:16px 0 6px">Peşinat · ${tl(p)}</p>${pos ? kartFormu() + `
    <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-top:12px"><input type="checkbox" data-oto-onay checked style="width:18px;height:18px;margin-top:2px"><span>Kalan ${n} taksitim vadesinde bu karttan otomatik çekilsin. İstediğim zaman kapatabilirim.</span></label>` : `<p class="ipucu">${isaret('bilgi', 18)}<span>Peşinatı ilk 3 gün içinde ${kursAdi('e')} gelip ya da ${S.kurs.iban ? 'havaleyle (IBAN: ' + e(S.kurs.iban) + ')' : 'havaleyle'} ödeyebilirsin. Ödeme gelince kaydın kesinleşir.</span></p>`}
`; }
  if (kayit.adim === 4) govde = `<div style="text-align:center;padding:30px 0">${isaret('tamam', 64)}<h2 style="font-size:28px;margin:16px 0 6px">Kaydın tamam!</h2><p style="color:var(--metin);max-width:380px;margin:0 auto 18px">${kayit.mesaj ? 'Ödeme planın ve teorik ders başlangıcın WhatsApp’a gönderildi.' : 'Kurs kaydını şu an panelinde görüyor; seni arayıp ödeme ve ders programını konuşacak.'}</p><a class="dg dg-ana" href="#/kursiyer/${kayit.yeniId}">Kurs panelinde gör</a> <button class="dg dg-cizgi" data-bastan>Yeni kayıt</button></div>`;
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
      if (k.querySelector('[name=kno]')) kartBagla(k);
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
          if (kayit.adim === 1) { const f = k.querySelector('#f-k1'); const b = Object.fromEntries(new FormData(f)); if (!b.ad.trim() || !b.soyad.trim() || b.tel.replace(/\D/g, '').length < 10) return bildir('Ad, soyad ve geçerli telefon gerekli', 'uyari'); if (!tcGecerli(b.tc.trim())) return bildir('TC kimlik numarası geçerli değil', 'uyari'); const y = yas(b.dogumTarihi); if (!b.dogumTarihi) return bildir('Doğum tarihini girin', 'uyari'); const asg = SINIFLAR[kayit.sinif].yas || S.kurs.asgariYas; if (y < asg) return bildir(`${SINIFLAR[kayit.sinif].ad} için en az ${asg} yaşında olmalısın`, 'uyari'); if (!b.cinsiyet) return bildir('Cinsiyetini seç', 'uyari'); if (S.kursiyerler.some(x => x.tc === b.tc.trim() && x.sinif === kayit.sinif && x.asama !== 'Ehliyet')) return bildir('Bu TC ile bu sınıfa açık bir kayıt zaten var; kursu arayın', 'uyari'); kayit.bilgi = b; }
          if (kayit.adim === 3) {
            if (!k.querySelector('[data-kvkk]').checked) return bildir('Devam etmek için KVKK onayı gerekli', 'uyari');
            if (!kayit.imza) return bildir('Sözleşmeyi imzalayın', 'uyari');
            const pos = S.entegrasyon.pos.bagli, kr = pos ? kartDogrula(k) : {}; if (kr.hata) return bildir(kr.hata, 'uyari');
            const imzaUrl = (() => { const c2 = document.createElement('canvas'); c2.width = 300; c2.height = 100; c2.getContext('2d').drawImage(cv, 0, 0, 300, 100); return c2.toDataURL('image/png'); })();
            const v = SINIFLAR[kayit.sinif], p0 = Math.min(8000, Math.round(v.ucret * 0.3 / 500) * 500), p = pos ? p0 : 0, n = 4, taksitler = [];
            if (!pos) taksitler.push({ vade: ayEkle(gun(0), 0), tutar: p0, odendi: null, yontem: null, aciklama: 'Peşinat' });
            for (let i = 0; i < n; i++) { const t = Math.floor((v.ucret - p0) / n / 50) * 50; taksitler.push({ vade: ayEkle(gun(0), i + 1), tutar: i === n - 1 ? (v.ucret - p0) - t * (n - 1) : t, odendi: null, yontem: null }); }
            const ev2 = {}; EVRAKLAR.forEach(([x]) => ev2[x] = x === 'sozlesme' ? true : !!kayit.evrak[x]);
            const eg = S.egitmenler.find(x => x.siniflar.includes(kayit.sinif) && S.araclar.some(a => a.egitmen === x.id && a.sinif === kayit.sinif)) || S.egitmenler.find(x => x.siniflar.includes(kayit.sinif)) || null;
            const grup = (S.gruplar || []).filter(g => fark(g.baslangic) >= 0).sort((a, b) => a.baslangic.localeCompare(b.baslangic))[0];
            const yeni = { id: 'k' + Date.now(), ad: kayit.bilgi.ad.trim(), soyad: kayit.bilgi.soyad.trim(), tel: kayit.bilgi.tel, tc: kayit.bilgi.tc.trim(), dogumTarihi: kayit.bilgi.dogumTarihi || '', adres: kayit.bilgi.adres || '', ogrenim: '', dogum: (kayit.bilgi.dogumTarihi || '').slice(0, 4), teorikGrup: grup ? grup.id : 'aksam', kvkk: { tarih: gun(0), kanal: 'Online kayıt', riza: true }, evrakFoto: Object.fromEntries(Object.entries(kayit.evrak)), sinif: kayit.sinif, kayit: gun(0), egitmen: eg ? eg.id : null, asama: Object.values(ev2).every(Boolean) ? 'Teorik' : 'Evrak', teorik: 0, direksiyon: 0, evrak: ev2, mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: v.ucret, pesin: p, pesinTarih: gun(0), taksitler, ekler: [], senetli: false, otomatik: pos && k.querySelector('[data-oto-onay]') && k.querySelector('[data-oto-onay]').checked ? { son4: kr.son4, onay: gun(0) } : null }, kaynak: 'Web sitesi', yorum: null, notlar: [{ tarih: gun(0), metin: 'Evden kayıt sayfasından kaydoldu, sözleşmeyi telefondan imzaladı.' }], deneme: [], acil: { ad: kayit.bilgi.acil || '', yakinlik: '', tel: kayit.bilgi.acilTel || '' } };
            S.kursiyerler.unshift(yeni);
            if (pos) S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Kurs ücreti', aciklama: tamAd(yeni) + ' · online peşinat (kart •••• ' + kr.son4 + ')', tutar: p, yontem: 'Kart', kursiyer: yeni.id, kim: 'Online kayıt' });
            Object.assign(yeni, { cinsiyet: kayit.bilgi.cinsiyet, ogrenim: kayit.bilgi.ogrenim || '', sozlesmeImza: { tarih: gun(0), yontem: 'Ekranda', url: imzaUrl, kanal: 'Online kayıt' } });
            kayit.mesaj = apiAcik(); if (kayit.mesaj) waAc(yeni.tel, `${selam(yeni)} ${kursAdi('e')} kaydınız alındı. Sınıfınız: ${v.ad}.${grup ? ` Teorik dersleriniz ${tamTarih(grup.baslangic)} tarihinde başlıyor.` : ''} Ödeme planınız: ${yeni.odeme.taksitler.map(t => `${tamTarih(t.vade)} · ${tl(t.tutar)}${t.aciklama ? ' (' + t.aciklama.toLocaleLowerCase('tr') + ')' : ''}`).join(', ')}.`, 'WhatsApp', tamAd(yeni), false, 'ÖĞRENCİ', 'Hoş geldin');
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
export const bekleyenMeb = () => sb(S.kursiyerler).filter(k => !k.mebIslendi && !eksikEvrak(k).length);
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
  const l = sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && !d.meb).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const gunler = [...new Set(l.map(d => d.tarih))];
  pencere({
    baslik: 'Direksiyon programı · MEBBİS’e girilecek', genis: true,
    icerik: `<p style="margin-bottom:12px">Gün gün girin; girdiğiniz günü işaretleyin. ${S.kurs.programOnGun} günden yakın dersler kırmızıdır.</p>${gunler.map(g => `<div class="kart" style="margin-bottom:10px"><div class="kart-bas" style="padding-bottom:6px"><h3 style="${fark(g) < S.kurs.programOnGun ? 'color:var(--kirmizi)' : ''}">${tarihUzun(g)}</h3><div class="sag"><button class="dg dg-ana dg-kucuk" data-gun-sirali="${g}">Sıralı gir</button><button class="dg dg-cizgi dg-kucuk" data-gun-girildi="${g}">Bu günü girdim</button></div></div><div class="tablo-kap"><table class="tablo"><thead><tr><th>Saat</th><th>TC</th><th>Kursiyer</th><th>Usta öğretici</th><th>Araç</th></tr></thead><tbody>${l.filter(d => d.tarih === g).map(d => { const k = kursiyer(d.kursiyer); return `<tr><td class="mono">${d.saat}</td><td class="mono">${e(k.tc)}</td><td>${e(tamAd(k))}</td><td>${e(egitmen(d.egitmen).ad)}</td><td>${d.arac ? arac(d.arac).plaka : ''}</td></tr>`; }).join('')}</tbody></table></div></div>`).join('') || bos('Girilecek ders yok', '')}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-program-csv>${ik('indir')}Excel</button>`,
    onAc(p) {
      p.addEventListener('click', ev => {
        const gs = ev.target.closest('[data-gun-sirali]');
        if (gs) { const t = gs.dataset.gunSirali, dl = l.filter(d => d.tarih === t); siraliPencere(tarihUzun(t) + ' · direksiyon programı', dl.flatMap(d => { const k = kursiyer(d.kursiyer), gr = d.saat + ' · ' + tamAd(k); return [[gr, 'TC kimlik no', k.tc], [gr, 'Ders saati', d.saat], [gr, 'Usta öğretici', egitmen(d.egitmen).ad], [gr, 'Araç plakası', d.arac ? arac(d.arac).plaka : '']]; }), () => { dl.forEach(d => d.meb = true); islem('Direksiyon programını MEBBİS’e girdi', tarih(t) + ' · sıralı'); kaydet(); bildir(tarih(t) + ' programı girildi'); yenile(); }); return; }
        const g = ev.target.closest('[data-gun-girildi]'); if (g) { l.filter(d => d.tarih === g.dataset.gunGirildi).forEach(d => d.meb = true); islem('Direksiyon programını MEBBİS’e girdi', tarih(g.dataset.gunGirildi)); kaydet(); g.closest('.kart').remove(); bildir(tarih(g.dataset.gunGirildi) + ' programı girildi'); yenile(); }
        if (ev.target.closest('[data-program-csv]')) csvIndir('direksiyon-programi.csv', [['Tarih', 'Saat', 'TC', 'Ad', 'Soyad', 'Usta öğretici', 'Araç'], ...l.map(d => { const k = kursiyer(d.kursiyer); return [d.tarih, d.saat, k.tc, k.ad, k.soyad, egitmen(d.egitmen).ad, d.arac ? arac(d.arac).plaka : '']; })]);
      });
    },
  });
}
export function sinavBildirimPenceresi(id) {
  const s = S.sinavlar.find(x => x.id === id), ks = s.kursiyerler.map(kursiyer).filter(Boolean).filter(subede);
  const aracBul = k => S.araclar.find(a => a.egitmen === k.egitmen && a.sinif === k.sinif) || S.araclar.find(a => a.sinif === k.sinif);
  pencere({
    baslik: `${tarih(s.tarih)} direksiyon sınavı · MEBBİS bildirimi`, genis: true,
    icerik: `<p style="margin-bottom:12px">Sınavdan en geç ${S.kurs.sinavBildirimIsGunu} iş günü önce her kursiyerin usta öğreticisi ve aracı MEBBİS’e girilir.</p><div class="tablo-kap"><table class="tablo"><thead><tr><th>TC</th><th>Kursiyer</th><th>Sınıf</th><th>Usta öğretici</th><th>Araç</th></tr></thead><tbody>${ks.map(k => { const a = aracBul(k); return `<tr><td class="mono">${e(k.tc)}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${e(egitmen(k.egitmen).ad)}</td><td>${a ? plakaMetin(a) : ''}</td></tr>`; }).join('')}</tbody></table></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-sinav-sirali>Sıralı gir</button><button class="dg dg-ana" data-bildirildi>MEBBİS’e girdim</button>`,
    onAc(p) {
      p.querySelector('[data-sinav-sirali]').addEventListener('click', () => siraliPencere(`${tarih(s.tarih)} sınav bildirimi`, ks.flatMap(k => { const a = aracBul(k), gr = tamAd(k); return [[gr, 'TC kimlik no', k.tc], [gr, 'Usta öğretici', egitmen(k.egitmen).ad], [gr, 'Araç plakası', a ? a.plaka : '']]; }), () => { s.mebBildirim = true; islem('Sınav bildirimini MEBBİS’e girdi', tarih(s.tarih) + ' · sıralı'); kaydet(); bildir('Sınav bildirimi işaretlendi'); yenile(); }));
      p.querySelector('[data-bildirildi]').addEventListener('click', () => { s.mebBildirim = true; islem('Sınav bildirimini MEBBİS’e girdi', tarih(s.tarih) + ' · ' + ks.length + ' kursiyer'); kaydet(); kapatPencere(); bildir('Sınav bildirimi işaretlendi'); yenile(); });
    },
  });
}
const plakaMetin = a => e(a.plaka) + ' · ' + e(a.model);

/* ================= PAKET VE GÜVENCE ================= */
export function guven() {
  const dk = (S.guvenlik && S.guvenlik.oturumDk) || 30, bulutta = !!(oturum.kullanici && oturum.kullanici.bulut);
  const madde = (t, b, a, etiket) => `<li style="align-items:flex-start">${isaret(t, 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${b}${etiket ? ` <span class="rozet rozet-${etiket === 'Bugün' ? 'yesil' : 'mavi'}" style="font-size:11px;vertical-align:middle">${etiket}</span>` : ''}</b><small style="color:var(--metin);font-size:14px">${a}</small></div></li>`;
  return {
    baslik: 'Verileriniz ve güvenlik', alt: 'Veriler nerede durur, nasıl korunur, kimin elindedir',
    html: `${ekranNotu('Yöneticinin “verilerimiz nerede, saldırı olursa ne olur?” sorusunun cevabı. “Bugün” etiketli korumalar şu an çalışıyor; “Kurulumda” etiketliler henüz yapım aşamasında.')}
    <div class="kart guven-kahraman"><div>
      <small>Verileriniz nerede durur?</small>
      <h2>Google’ın bulut altyapısında, şifreli.</h2>
      <p>Kurs hesabında öğrenci, ödeme ve ders kayıtlarınız Google Firebase’de, Avrupa Birliği’ndeki (Frankfurt) veri merkezinde tutulur. Kurs bilgisayarında veri durmaz: bilgisayar bozulsa, çalınsa ya da virüs bulaşsa da kayıtlarınız kaybolmaz.</p>
      <p class="guven-not">${bulutta ? 'Bu hesabın kayıtları şu an Firebase’de (Frankfurt) duruyor; internet kesilirse cihazda bekler, bağlantı gelince gönderilir.' : 'Bu demoda veriler yalnız açık olduğu tarayıcıda durur; hiçbir sunucuya gönderilmez.'}</p>
    </div><div class="guven-katman" aria-hidden="true">${[['Kurs ekranı', 'tarayıcı · telefon'], ['Şifreli bağlantı', 'HTTPS'], ['Google Firebase', 'Frankfurt · şifreli'], ['Günlük yedek', 'geri dönüş']].map(([a, b], n) => `<div style="--n:${n}"><b>${a}</b><small>${b}</small></div>`).join('')}</div></div>
    <div class="ara-bosluk"></div>
    <div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Kim neyi görür, ne yapar</h3></div><ul class="liste" style="margin-top:8px">
        ${madde('tamam', 'Her çalışana ayrı hesap', 'Her çalışan kendi e-postası ve şifresiyle girer; çalışan yalnız müdürün gönderdiği tek kullanımlık davet linkiyle katılır. Ayrılan çalışanın erişimi “Kaldır”la o anda kapanır.', 'Bugün')}
        ${madde('tamam', 'Yetkiye göre ekran', 'Ön büro maaşları ve kârlılığı görmez; öğretmen yalnız kendi derslerini ve öğrencilerini görür.', 'Bugün')}
        ${madde('tamam', 'Hassas işlemde ikinci onay', 'TC kimlik numarasını tam göstermek gibi işlemler şifreyi yeniden ister; TC listelerde maskeli görünür.', 'Bugün')}
        ${madde('tamam', 'Kim ne yaptı, kayıtlı', 'Her işlem kullanıcı adı ve saatiyle işlem geçmişine yazılır; yanlış işlem geri alınabilir.', 'Bugün')}
        ${madde('tamam', 'Bırakılan ekran kapanır', `${dk} dakika işlem yapılmazsa oturum kendiliğinden kapanır (Ayarlar › Güvenlik).`, 'Bugün')}
        ${madde('bilgi', 'İki adımlı giriş', 'Yöneticiler için şifreye ek olarak telefona gelen doğrulama kodu.', 'Kurulumda')}
      </ul></div>
      <div class="kart"><div class="kart-bas"><h3>Saldırı ya da arıza olursa</h3></div><ul class="liste" style="margin-top:8px">
        ${madde('tamam', 'Şifreli bağlantı ve şifreli depolama', 'Ekranla sunucu arasındaki her şey şifreli (HTTPS) gider; veriler Google’ın sunucularında şifreli saklanır. Kursa üye olmayan hiçbir hesap kayıtları okuyamaz.', 'Bugün')}
        ${madde('tamam', 'İki cihaz aynı anda çalışabilir', 'Ön büro ve müdür aynı anda kayıt girse de iki değişiklik de korunur; ekranlar birkaç saniyede güncellenir.', 'Bugün')}
        ${madde('bilgi', 'Her gece otomatik yedek', 'Veriler her gece ayrı bir yere yedeklenir; bir kayıt silinir ya da bozulursa önceki güne dönülebilir.', 'Kurulumda')}
        ${madde('bilgi', 'Belgeler ayrı ve korumalı depoda', 'Sağlık raporu, adli sicil ve fotoğraflar yalnız yetkili kullanıcının açabildiği depoda durur.', 'Kurulumda')}
        ${madde('bilgi', 'Erişim kayıtları sunucuda', 'Hangi hesabın hangi kayda ne zaman eriştiği sunucuda tutulur; kurs bilgisayarından silinemez.', 'Kurulumda')}
        ${madde('tamam', 'USB’ye yedek, uzaktan bağlanma yok', 'Yedek almak için flaş bellek, destek için bilgisayarınıza uzaktan bağlanma programı gerekmez.', '')}
      </ul></div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Verileriniz sizindir</h3></div><ul class="liste" style="margin-top:8px">
        ${madde('tamam', 'İstediğiniz an tam döküm', 'Öğrenci, kasa ve ders kayıtlarınızı tek tuşla Excel’e uygun dosya olarak indirirsiniz.', 'Bugün')}
        ${madde('bilgi', 'Ayrılırsanız', 'Verileriniz Excel olarak teslim edilir, ardından sunucudan silinir.', '')}
        ${madde('bilgi', 'MEBBİS şifreniz', 'MEBBİS aktarımı sizin hesabınızla yapılır; şifreniz Sinyal sunucusunda düz metin olarak tutulmaz.', 'Kurulumda')}
      </ul><div style="padding:6px 20px 20px"><button class="dg dg-ana" data-dokum>${ik('indir')}Tüm verimi şimdi indir</button></div></div>
      <div class="kart"><div class="kart-bas"><h3>KVKK</h3></div><ul class="liste" style="margin-top:8px">
        ${madde('tamam', 'Aydınlatma ve açık rıza kayıtta alınır', 'Kayıt formunda ve evden kayıtta aydınlatma metni gösterilir, onay kaydedilir.', 'Bugün')}
        ${madde('bilgi', 'Kurs veri sorumlusu, Sinyal veri işleyen', 'Aradaki sorumluluklar veri işleme sözleşmesinde yazılı olur.', '')}
        ${madde('bilgi', 'Yurt dışında saklama', 'Veriler AB’deki veri merkezinde durduğu için KVKK’nın 9. maddesine göre standart sözleşme imzalanır ve Kurul’a bildirilir. Kurulumda birlikte yapılır.', 'Kurulumda')}
      </ul></div>
    </div>`,
    baglan(k) {
      k.addEventListener('click', ev => {
        if (!ev.target.closest('[data-dokum]')) return;
        csvIndir('sinyal-kursiyerler.csv', [['TC', 'Ad', 'Soyad', 'Telefon', 'Doğum tarihi', 'Adres', 'Öğrenim', 'Sınıf', 'Aşama', 'Kayıt', 'Teorik', 'Direksiyon', 'Toplam', 'Ödenen', 'Kalan'], ...S.kursiyerler.map(x => [x.tc, x.ad, x.soyad, x.tel, x.dogumTarihi, x.adres, x.ogrenim, SINIFLAR[x.sinif].ad, x.asama, x.kayit, x.teorik, x.direksiyon, x.odeme.toplam, odenen(x), kalanBorc(x)])]);
        setTimeout(() => csvIndir('sinyal-kasa.csv', [['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Yöntem', 'Tutar'], ...S.hareket.map(x => [x.tarih, x.tur, x.kategori, x.aciklama, x.yontem, x.tutar])]), 400);
        setTimeout(() => csvIndir('sinyal-dersler.csv', [['Tarih', 'Saat', 'Öğrenci', 'Öğretmen', 'Araç', 'Durum'], ...S.dersler.map(d => [d.tarih, d.saat, tamAd(kursiyer(d.kursiyer) || { ad: '', soyad: '' }), (egitmen(d.egitmen) || {}).ad, d.arac ? arac(d.arac).plaka : '', d.durum])]), 800);
        islem('Tam veri dökümü indirdi'); kaydet(); bildir('Öğrenci, kasa ve ders dökümleri indirildi');
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
  const kisa = sbDers(S.dersler).filter(d => d.durum === 'Yapıldı' && d.sure != null && d.sure < 40);
  if (kisa.length) l.push(['uyari', `${kisa.length} direksiyon dersi 40 dakikadan kısa sürmüş`, 'Başlangıç-bitiş saatleri takip formunda görünür; nedenini not edin.', '#/plan']);
  const imzasiz = sbDers(S.dersler).filter(d => d.durum === 'Yapıldı' && !d.imza);
  if (imzasiz.length) l.push(['yasak', `${imzasiz.length} direksiyon dersi imzasız`, 'Takip formunda imza eksik; usta öğretici ekranından imzalatın.', '#/plan']);
  const evr = sb(S.kursiyerler).filter(k => k.asama !== 'Ehliyet' && eksikEvrak(k).length);
  if (evr.length) l.push(['yasak', `${evr.length} kursiyerin evrakı eksik`, evr.slice(0, 4).map(tamAd).join(', ') + (evr.length > 4 ? '…' : ''), '#/meb/evrak']);
  sb(S.kursiyerler).filter(k => k.asama !== 'Ehliyet').forEach(k => ['saglik', 'adli'].forEach(x => { const v = (k.dogrulama || {})[x]; if (!v || !v.gecerlilik) return; const f = fark(v.gecerlilik), ad = x === 'saglik' ? 'sağlık raporu' : 'adli sicil kaydı'; if (f < 0) l.push(['dur', `${tamAd(k)} · ${ad} süresi dolmuş`, 'Yenisi gelmeden sınava başvurulamaz.', '#/kursiyer/' + k.id]); else if (f <= 30) l.push(['uyari', `${tamAd(k)} · ${ad} ${f} gün içinde bitiyor`, 'Kursiyere hatırlatma gitti.', '#/kursiyer/' + k.id]); }));
  const dogrulanmamis = sb(S.kursiyerler).filter(k => k.asama !== 'Ehliyet' && ['saglik', 'adli'].some(x => k.evrak[x] && !(k.dogrulama || {})[x]));
  if (dogrulanmamis.length) l.push(['uyari', `${dogrulanmamis.length} kursiyerin sağlık raporu ya da adli sicili doğrulanmadı`, 'Barkod ve rapor numarasını e-Devlet’te kontrol edip “Doğruladım”a basın.', '#/kursiyer/' + dogrulanmamis[0].id]);
  const riza = sb(S.kursiyerler).filter(k => !(k.kvkk && k.kvkk.riza));
  if (riza.length) l.push(['yasak', `${riza.length} kursiyerde KVKK rızası yok`, 'Özel nitelikli veri rızasız işlenemez.', '#/ayarlar/kvkk']);
  const meb = sb(S.kursiyerler).filter(k => !k.mebIslendi && k.asama !== 'Kayıt' && k.asama !== 'Evrak');
  if (meb.length) l.push(['uyari', `${meb.length} kursiyer derste ama MEBBİS kaydı işaretlenmemiş`, meb.slice(0, 4).map(tamAd).join(', '), '#/meb']);
  return l;
}
