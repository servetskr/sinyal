// mdSinyal → WhatsApp Cloud API köprüsü + kısa link deposu (Cloudflare Worker)
// Ortam: WA_TOKEN (gizli), PHONE_ID, ALICI; KV bağlaması LINK (kısa linkler 60 gün + gelen mesajlar)
// Link düzeni (sinyal-kaynak/belgeler/link-standardi.md): kısa kodlar mdsinyal.com/<kod>, /d/<kod> davet, /i/<kod> imza; site 404.html'i GET /k/<kod> ile çözer
// SABLON_AD (isteğe bağlı, ör. sinyal_bildirim) + SABLON_DIL (varsayılan tr): kişi son 24 saatte yazmadıysa (Meta 131047) mesaj bu onaylı
// şablonla, tek değişkene ({{1}}) konarak tekrar denenir. Kursun kendi hattında şablon adı hat kaydındaki 'sablon' alanından da gelebilir.
// /webhook: Meta'dan gelen WhatsApp mesajları → kurs asistanı cevaplar, mesaj mdSinyal'in gelen kutusuna (KV 'gelen') yazılır
// İki yol var:
//  · Demo (örnek kurs): Authorization başlığı yok → her mesaj ALICI'ya (demo telefonu) gider, yalnız ALICI'dan gelenler işlenir. Eskisi gibi.
//  · Gerçek kurs: Authorization (Firebase oturumu) + X-Kurs → kursun kendi WhatsApp hattından (KV 'hat:<kurs>') alıcının numarasına gider;
//    gelen mesajlar ve belgeler kursa ayrı tutulur ('gelen:<kurs>', 'medya-<kurs>-<id>'), yalnız kursun üyeleri okur.
// Güvenlik (v209): APP_SECRET (gizli; Meta › Uygulama ayarları › Temel › Uygulama gizli anahtarı, virgülle birden fazla) tanımlıysa
//   POST /webhook isteğinin X-Hub-Signature-256 başlığı (HMAC-SHA256, ham gövde) doğrulanır; uymazsa 403. Tanımlı değilse eski davranış sürer,
//   günlüğe bir kez uyarı yazılır. VERIFY_TOKEN (isteğe bağlı) abonelik belirtecini koddan çıkarır; yoksa eski sabit kullanılır.
// /hata: uygulama hatalarının kişisel veri içermeyen kısa kaydı (POST, sitenin kendi adresinden); KV 'hata:<gün>:<iz>' 7 gün.
//   GET /hata yalnız platform sahibine: Firebase oturum belirteci (sahip uid) ya da SAHIP_ANAHTAR (gizli) ile.
// /eposta: kursun rapor ve yedek e-postaları (onaylı adreslere); /eposta/sahip platform sahibinin analiz e-postası. Ayrıntı eposta() üstünde.
// /mebbis/ekran-alarm (YON-062): MEBBİS ekranı değişti alarmı sahibe WhatsApp şablonuyla, ekran başına günde bir; ayrıntı ekranAlarm() üstünde.
//   /eposta/ogrenci (PAR-058): öğrenciye tek alıcılı makbuz / ödeme hatırlatması; ayrıntı epOgrenci() üstünde.
// /mevzuat/*: mevzuat arama (sorgu gömme), kursa gelen MEB yazılarını yükleme/listeleme/silme, özet ve kaynaklı cevap. Ayrıntı mevzuatUc() üstünde.
// KAY-033 (18 Kas kararı): belge görüntüsü okuma ucu (belge/oku, OCR_MODEL) kaldırıldı; öğrenci belgesi hiçbir dış yapay zekâya gönderilmez.
//   env.AI ([ai] bağlaması) yalnız mevzuat gömme modeli ve PDF/DOCX → metin (toMarkdown) için kalır.
// /earsiv (PAR-011): kursun seçtiği e-Arşiv entegratörü (Nilvera, Uyumsoft, İzibiz; deneme kipi); ayrıntı 'E-ARŞİV' bölümünde.
//   Gizli EARSIV_ANAHTAR (en az 32 karakter) bir kez: openssl rand -base64 48 | npx wrangler secret put EARSIV_ANAHTAR. Değişirse kayıtlı hesaplar çözülmez, kurslar yeniden girer.
// /servis (UYG-012, MSJ-021): Firestore servis hesabı (FIREBASE_SA) ile ofis kapalıyken öğrenci istekleri ve hatırlatmalar; ayrıntı aşağıda 'SERVİS HESABI' bölümünde, kurulum SERVIS-HESABI.md.
const IZINLI = ['https://mdsinyal.com', 'http://localhost:4481', 'http://127.0.0.1:4481'];
const HEDEF = /^(https:\/\/mdsinyal\.com\/|https:\/\/servetskr\.github\.io\/sinyal\/|http:\/\/localhost:4481\/)/;
const kucuk = s => String(s || '').toLocaleLowerCase('tr');
// Demo kursun sınıfları (uygulamadaki örnek kursla aynı ücretler, KDV dahil). Örnek kursta ücreti olmayan B Engelli ve 100 ceza puanı eğitimi
// Eskişehir 2026 il taban fiyatıyla yazılır (js/taban.js F8 = 23.510, F11 = 10.030; MSJ-004). Diğerleri tabanın üstünde.
// [ad, ücret, teorik saat, direksiyon dersi, sorudaki kelimeler, ek not]. C: B belgesiyle (listede ilk kez belge satırı yok; B → C 22 ders, teorik yok).
const DEMO_SINIF = [
  ['B manuel (otomobil)', '24.000 TL', 34, 16, /manuel|otomobil|araba|\bb\b/],
  ['B otomatik', '26.500 TL', 34, 16, /otomatik/],
  ['B Engelli', '23.510 TL', 34, 16, /engelli|engel durum|aparatl/, 'Eğitim, sağlık raporunuzdaki şartlara uygun araçla verilir; raporunuzu kayıt görüşmesinde yetkilimiz değerlendirir.'],
  ['A2 motosiklet', '18.500 TL', 34, 14, /motor|motosiklet|\ba2\b/],
  ['C kamyon (B belgesiyle)', '31.000 TL', 0, 22, /kamyon|\bc\b/, 'B belgesi olanlar içindir; başka bir belgeniz varsa yetkilimiz ücreti ayrıca söyler.'],
  ['100 ceza puanı eğitimi', '10.030 TL', 34, 0, /ceza puan|100 ceza|el kon|geri al[ıi]n/, '100 ceza puanı nedeniyle geri alınan sürücü belgesi için yalnız teorik eğitimdir; derslerin tamamına devam gerekir.'],
];
const KDV = ' (KDV dahil)';
// İl taban fiyat listesi notu 6: hiçbir ad altında indirim ve kampanya yapılamaz (demo kurs Eskişehir'de)
const INDIRIM = /indirim|kampanya|promosyon|hediye|toplu kay[ıi]t|pazarl[ıi]k|son fiyat|daha ucuz|(kardeş|kardes|arkadaş|arkadas)\S*\s+(gel|kay|beraber|birlikte)/;
const INDIRIM_CEVAP = 'İl taban fiyat listesi gereği öğrenci, kardeş, arkadaş, toplu kayıt dahil hiçbir ad altında indirim ve kampanya yapılamıyor; ücretlerimiz il taban fiyatına uygundur.';
const egitimMetni = s => s[2] && s[3] ? `${s[2]} saat teorik ders ve ${s[3]} direksiyon dersi` : s[3] ? `${s[3]} direksiyon dersi (teorik ders yok)` : `${s[2]} saat teorik ders (direksiyon yok)`;
const ucretListesi = (ayrac = '\n') => DEMO_SINIF.map((s, i) => `${i + 1}. ${s[0]} · ${s[1]}`).join(ayrac);
const ASISTAN = [
  [INDIRIM, INDIRIM_CEVAP, 'İndirim sorusu · il taban listesi not 6'],
  [/süre|sure|kaç gün|kac gun|kaç ay|kac ay|kaç hafta|kac hafta|ne kadar sür|ne zaman biter|bitiyor/, 'B sınıfı kurs yaklaşık 6–8 hafta sürüyor: önce 34 saat teorik ders ve e-sınav, ardından 16 direksiyon dersi ve direksiyon sınavı. Akşam grubuyla çalışırken de rahatça bitirebilirsiniz.', 'Kurs süresi'],
  [/engelli|engel durum|aparatl/, 'B Engelli kurs ücretimiz 23.510 TL' + KDV + ' (Eskişehir 2026 il taban fiyatı). Eğitim, sağlık raporunuzdaki şartlara uygun araçla verilir; raporunuzu kayıt görüşmesinde yetkilimiz değerlendirir. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · B Engelli'],
  [/ceza puan|100 ceza|el kon|geri al[ıi]n/, '100 ceza puanı eğitimi ücretimiz 10.030 TL' + KDV + ' (Eskişehir 2026 il taban fiyatı). 100 ceza puanı nedeniyle geri alınan sürücü belgesi için 34 saatlik yalnız teorik eğitimdir; derslerin tamamına devam gerekir. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · 100 ceza'],
  [/kamyon|c sınıf|c sinif|\bc\b/, 'B belgesiyle C kamyon kurs ücretimiz 31.000 TL' + KDV + ', 22 direksiyon dersi; taksit yapabiliyoruz. Başka bir belgeniz varsa yetkilimiz ücreti ayrıca söyler.', 'Fiyat · C'],
  [/otomatik/, 'B otomatik kurs ücretimiz 26.500 TL' + KDV + '. Peşinattan sonra kalanı 5 aya kadar taksitle ödeyebilirsiniz. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · B otomatik'],
  [/manuel|b sınıf|b sinif|\bb\b|araba|otomobil/, 'B manuel kurs ücretimiz 24.000 TL' + KDV + '. Peşinattan sonra kalanı 5 aya kadar taksitle ödeyebilirsiniz. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · B manuel'],
  [/motor|motosiklet|a2/, 'A2 motosiklet kurs ücretimiz 18.500 TL' + KDV + '; taksit yapabiliyoruz. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · A2'],
  [/fiyat|ücret|ucret|kaç para|kac para|taksit|ne kadar/, 'Kurs ücretlerimiz' + KDV + ': ' + DEMO_SINIF.map(s => `${s[0]} ${s[1]}`).join(', ') + '. Peşinattan sonra 5 aya kadar taksit yapıyoruz. Hangi sınıf için düşünüyorsunuz?', 'Fiyat ve taksit'],
  [/evrak|belge|rapor|gerekli|neler lazım|ne lazım/, 'Kayıt için kimlik kartı, sürücü sağlık raporu, öğrenim belgesi, adli sicil kaydı ve biyometrik fotoğraf (kursta çekilir, ücret alınmaz) yeterli. Sağlık raporunu aile hekiminizden alabilirsiniz. Belgeleri önceden gönderebilirsiniz; kayıt kurs merkezinde tamamlanır.', 'Evrak'],
  [/saat|ne zaman|başla|basla|grup|kurs günleri|hafta/, 'Teorik dersler hafta içi her akşam 18:30 grubunda, salı ve perşembe 10:00 sabah grubunda yapılıyor. Yeni akşam grubumuz 3 Kasım’da başlıyor.', 'Ders saatleri'],
  [/adres|nerede|nerdesiniz|konum|yer/, 'Odunpazarı / Eskişehir’deyiz. Kayıt görüşmesi için uygun olduğunuz günü yazarsanız saat ayarlayalım.', 'Adres'],
  [/kayıt|kayit|kaydol|yazıl|yazil/, 'Kayıt için Örnek Sürücü Kursu’na uğrayabilirsiniz. Uygun olduğunuz günü yazarsanız saat ayarlayalım.', 'Kayıt'],
  [/^(merhaba|selam|slm|mrb|iyi günler|iyi akşamlar|günaydın)\b/, 'Merhaba, Örnek Sürücü Kursu’na hoş geldiniz. Ben kursun dijital asistanıyım. Kurs ücreti, evraklar, ders saatleri ya da kayıt hakkında sorabilirsiniz.', 'Karşılama'],
];
// Kursun sorusuna verilen kısa cevaplar (evet/hayır): asistan teşekkür eder, cevap mdSinyal'de ilgili mesaja işlenir
const CEVAP = [[/^(evet|olur|tamam|tamamd[ıi]r|gelece[ğg]im|gelirim|uygun|kat[ıi]l[ıi]yorum|onayl[ıi]yorum|ok|okey)(\s|$|[.!,])/, 'olumlu'], [/^(hay[ıi]r|gelemem|gelemeyece[ğg]im|olmaz|uygun de[ğg]il|kat[ıi]lam[ıi]yorum|iptal)(\s|$|[.!,])/, 'olumsuz']];
const cevapTuru = m => { const t = kucuk(m).trim(); for (const [r, k] of CEVAP) if (r.test(t)) return k; return null; };
const asistanCevap = m => { const t = kucuk(m).trim(); if (cevapTuru(t)) return { metin: 'Teşekkürler, cevabınızı aldık ve kursa ilettik.', konu: 'Cevap' }; for (const [r, c, k] of ASISTAN) if (r.test(t)) return { metin: c, konu: k }; return { metin: 'Sorunuzu kurs yetkilimize ilettim, kısa süre içinde size dönecek. Bu arada ücret, evrak ya da ders saatleriyle ilgili sorularınızı hemen cevaplayabilirim.', konu: 'Yetkiliye devredildi', devir: true }; };
// Demo hattına yazan adayla adım adım sohbet (durum KV'de 1 gün tutulur): kayıt → sınıf → bilgi → link / randevu / aranma
const KURS_AD = 'Örnek Sürücü Kursu', KURS_ADRES = 'Vişnelik Mah. Atatürk Blv. No:12, Odunpazarı / Eskişehir';
const MENU = 'Size nasıl yardımcı olabilirim?\n\n1. Kayıt ve ücretler\n2. Gerekli belgeler\n3. Ders saatleri\n4. Adres\n5. Yetkiliyle görüşmek\n\nSeçtiğiniz maddenin rakamını yazmanız yeterli (örneğin 1).';
const SINIF_MENU = 'Hangi ehliyet sınıfını düşünüyorsunuz? Ücretler KDV dahildir.\n\n' + ucretListesi() + '\n\nSeçtiğiniz sınıfın rakamını yazmanız yeterli (örneğin 1).';
const sinifBilgi = s => `*${s[0]}*\n\nÜcret: ${s[1]}, KDV dahil (peşinattan sonra 5 aya kadar taksit)\nEğitim: ${egitimMetni(s)}${s[5] ? '\n' + s[5] : ''}\nSüre: ${s[3] ? 'yaklaşık 6–8 hafta' : 'teorik grubun programı kadar'}\n\nNasıl devam edelim?\n\n1. Kayıt için gerekenleri gönder\n2. Kursa gelip kayıt olmak istiyorum\n3. Yetkili beni arasın\n\nSeçtiğiniz maddenin rakamını yazmanız yeterli.`;
const BELGE = 'Kayıt için gerekenler:\n\n• Kimlik kartı\n• Sürücü sağlık raporu (aile hekiminizden alabilirsiniz)\n• Öğrenim belgesi\n• Adli sicil kaydı (e-Devlet)\n• Biyometrik fotoğraf (kursta çekilir, ücret alınmaz)\n\nBelgelerin fotoğrafını önceden bu numaraya gönderebilirsiniz; kayıt kurs merkezinde tamamlanır.';
const SAAT = 'Teorik dersler:\n\n• Akşam grubu: hafta içi her akşam 18:30\n• Sabah grubu: salı ve perşembe 10:00\n\nYeni akşam grubumuz yakında başlıyor; kontenjan sınırlı.';
const ADRES = `Adresimiz: ${KURS_ADRES}\n\nGelmeden önce yazarsanız sizi bekleriz.`;
// Kayıtlı öğrencinin ders değişikliği: asistan isteği tanır, kursun uygulaması uygun saatleri hesaplayıp gönderir (POST / + sohbetDurum),
// öğrenci rakamla seçer, seçim kursun gelen kutusuna 'dersSecim' olarak düşer ve uygulama dersi taşır.
const DERS_NIYET = /(ders|direksiyon|randevu)\S*.{0,50}(de[gğ]i[sş]|ertele|kayd[ıi]r|ta[sş][ıi]|iptal|gelemeyece|gelemiyor|gelemem|ba[sş]ka (g[uü]n|saat))|(de[gğ]i[sş]tir|ertele|gelemeyece|gelemiyece)\S*.{0,40}(ders|direksiyon)/;
async function dersAkisi(env, kurs, kimden, metin) {
  const anahtar = 'sohbet:' + rakam(kimden); let d = {};
  try { d = JSON.parse((await env.LINK.get(anahtar)) || '{}'); } catch (x) { d = {}; }
  const t = kucuk(metin).trim(), no = (t.match(/^([0-9])\s*[.)]?$/) || [])[1];
  if (d.adim === 'dersSec' && no && no !== '0' && d.secenek && d.secenek[+no - 1]) {
    const secim = d.secenek[+no - 1]; await env.LINK.delete(anahtar).catch(() => {});
    return { metin: `Seçiminiz alındı: ${secim.etiket}. Dersiniz taşınıyor; birazdan onay mesajı gelecek.`, konu: 'Ders değişikliği · seçim', kurs, ek: { niyet: 'dersSecim', ders: d.ders, secim } };
  }
  if (d.adim === 'dersSec' && (no === '0' || /hi[cç]biri|olmaz|uymuyor|uygun de[gğ]il/.test(t))) {
    await env.LINK.delete(anahtar).catch(() => {});
    return { metin: 'Anladım. Talebinizi yetkilimize ilettim; size uygun bir saat için sizi arayacak.', konu: 'Ders değişikliği · yetkiliye', devir: true, kurs };
  }
  if (!DERS_NIYET.test(t)) return null;
  if (!kurs) return { metin: 'Ders değişikliği talebinizi kursa ilettim; kısa süre içinde size dönecekler.', konu: 'Ders değişikliği', devir: true };
  await env.LINK.put(anahtar, JSON.stringify({ adim: 'dersBekle' }), { expirationTtl: 3600 }).catch(() => {});
  return { metin: 'Talebinizi aldım, dersinize bakıyorum. Uygun saatleri birazdan buradan yazacağım.', konu: 'Ders değişikliği', kurs, ek: { niyet: 'dersDegistir' } };
}
// MSJ-009: gelen kutusu 60 gün saklanır — her yazışta 60 günden eski kayıtlar düşer, anahtar da 60 gün yazılmazsa kendiliğinden silinir
const GELEN_GUN = 60;
const gelenYaz = (env, an, l) => { const sinir = Date.now() - GELEN_GUN * 864e5; return env.LINK.put(an, JSON.stringify(l.filter(x => !x.zaman || Date.parse(x.zaman) >= sinir).slice(0, 200)), { expirationTtl: GELEN_GUN * 86400 }); };
async function kursaDusur(env, kurs, m, v, metin, c) {
  const l = JSON.parse((await env.LINK.get('gelen:' + kurs)) || '[]');
  l.unshift({ id: m.id, zaman: new Date(+m.timestamp * 1000 || Date.now()).toISOString(), ad: (v.contacts && v.contacts[0] && v.contacts[0].profile && v.contacts[0].profile.name) || '', tel: m.from, son4: m.from.slice(-4), metin, cevap: c.metin, konu: c.konu, devir: !!c.devir, yanit: null, cevapTur: null, medya: null, ...(c.ek || {}) });
  await gelenYaz(env, 'gelen:' + kurs, l);
}
async function sohbet(env, kimden, metin) {
  const anahtar = 'sohbet:' + rakam(kimden); let d = {};
  try { d = JSON.parse((await env.LINK.get(anahtar)) || '{}'); } catch (x) { d = {}; }
  const t = kucuk(metin).trim(), no = (t.match(/^([1-9])\s*[.)]?$/) || [])[1], selam = /^(merhaba|selam|slm|mrb|iyi günler|iyi akşamlar|günaydın)/.test(t);
  // ek notu olan sınıflar (B Engelli, C, 100 ceza) önce: "engelli otomatik" B Engelli, "B'm var C" C sayılır
  const sinifBul = () => { const l = DEMO_SINIF.map((s, i) => i).sort((a, b) => !!DEMO_SINIF[b][5] - !!DEMO_SINIF[a][5]); const i = l.find(i => DEMO_SINIF[i][4].test(t)); return i === undefined ? -1 : i; };
  let c = null;
  if (d.adim === 'sinif' && ((no && DEMO_SINIF[no - 1]) || sinifBul() >= 0)) { const i = no ? +no - 1 : sinifBul(); c = { metin: sinifBilgi(DEMO_SINIF[i]), konu: 'Kayıt · ' + DEMO_SINIF[i][0], d: { adim: 'devam', sinif: i } }; }
  else if (d.adim === 'devam' && no === '1') c = { metin: BELGE + '\n\nKayıt kurs merkezinde, müdür gözetiminde tamamlanır; sözleşme orada imzalanır. Gelmek istediğiniz günü belirlemek için 2, yetkilimizin aramasını isterseniz 3 yazın.', konu: 'Kayıt · evrak gönderildi', d: { adim: 'devam', sinif: d.sinif } };
  else if (d.adim === 'devam' && no === '2') c = { metin: `Memnuniyetle bekleriz. Hangi gün ve saat size uygun? Yazdığınız zamanı yetkilimize iletip size onaylatacağım.\n\n${ADRES}`, konu: 'Kayıt · randevu', d: { adim: 'randevu' } };
  else if ((d.adim === 'devam' && no === '3') || (d.adim === 'menu' && no === '5') || /yetkili|ara(y[ıi]n|s[ıi]n)|telefon edin|biri arasın/.test(t)) c = { metin: 'Talebinizi yetkilimize ilettim; en kısa sürede sizi bu numaradan arayacak. Uygun olmadığınız saat varsa yazabilirsiniz.', konu: 'Aranma talebi', devir: true, d: {} };
  else if (d.adim === 'randevu' && !no) c = { metin: `Teşekkürler. "${String(metin).trim().slice(0, 60)}" talebinizi yetkilimize ilettim; onaylayınca size buradan yazacağız.`, konu: 'Kayıt · randevu talebi', devir: true, d: {} };
  else if (d.adim === 'menu' && no) c = { '1': { metin: SINIF_MENU, konu: 'Kayıt', d: { adim: 'sinif' } }, '2': { metin: BELGE, konu: 'Evrak', d: { adim: 'menu' } }, '3': { metin: SAAT, konu: 'Ders saatleri', d: { adim: 'menu' } }, '4': { metin: ADRES, konu: 'Adres', d: { adim: 'menu' } } }[no] || null;
  else if (INDIRIM.test(t)) c = { metin: INDIRIM_CEVAP, konu: 'İndirim sorusu · il taban listesi not 6', d: { adim: 'menu' } };
  else if (/kay[ıi]t|kaydol|yaz[ıi]l|ehliyet al|ba[şs]vur/.test(t)) c = { metin: `${selam ? 'Merhaba, ' : ''}${KURS_AD}’na hoş geldiniz. Kayıt düşünmenize çok sevindik.\n\n${SINIF_MENU}`, konu: 'Kayıt', d: { adim: 'sinif' } };
  else if (sinifBul() >= 0 && /fiyat|ücret|ucret|ka[çc]|ne kadar|bilgi/.test(t)) { const i = sinifBul(); c = { metin: sinifBilgi(DEMO_SINIF[i]), konu: 'Fiyat · ' + DEMO_SINIF[i][0], d: { adim: 'devam', sinif: i } }; }
  else if (/fiyat|ücret|ucret|kaç para|kac para|taksit|ne kadar/.test(t)) c = { metin: 'Kurs ücretlerimiz (KDV dahil):\n\n' + ucretListesi() + '\n\nPeşinattan sonra 5 aya kadar taksit yapıyoruz. İl taban fiyat listesi gereği indirim ve kampanya yapılmaz. Hangi sınıfı düşünüyorsanız rakamını yazın (örneğin 1), ayrıntıları göndereyim.', konu: 'Fiyat ve taksit', d: { adim: 'sinif' } };
  else if (/evrak|belge|rapor|gerekli|neler lazım|ne lazım/.test(t)) c = { metin: BELGE, konu: 'Evrak', d: { adim: 'menu' } };
  else if (/saat|ne zaman|başla|basla|grup|kurs günleri/.test(t)) c = { metin: SAAT, konu: 'Ders saatleri', d: { adim: 'menu' } };
  else if (/adres|nerede|nerdesiniz|konum/.test(t)) c = { metin: ADRES, konu: 'Adres', d: { adim: 'menu' } };
  else if (selam || !d.adim) { const k = selam ? null : asistanCevap(metin); c = k && !k.devir ? { ...k, d: {} } : selam ? { metin: `Merhaba, ${KURS_AD}’na hoş geldiniz.\n\n${MENU}`, konu: 'Karşılama', d: { adim: 'menu' } } : { metin: `Sorunuzu kurs yetkilimize ilettim, kısa süre içinde size dönecek.\n\nBu arada:\n\n${MENU.split('\n\n').slice(1).join('\n\n')}`, konu: 'Yetkiliye devredildi', devir: true, d: { adim: 'menu' } }; }
  if (!c) c = { metin: `Anlayamadım, kusura bakmayın.\n\n${MENU}`, konu: 'Menü', d: { adim: 'menu' } };
  await env.LINK.put(anahtar, JSON.stringify(c.d || {}), { expirationTtl: 86400 }).catch(() => {});
  return c;
}
const sade = s => String(s || '').toLocaleLowerCase('tr').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const rakam = x => String(x || '').replace(/\D/g, '');
// İsteği yapan Firebase kullanıcısının kurstaki rolü (Firestore, kullanıcının kendi kimliğiyle okunur; sahte kimlik reddedilir)
async function uyeRol(req, kurs) {
  const tok = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!tok || !/^[A-Za-z0-9]{10,40}$/.test(kurs)) return null;
  let uid; try { uid = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).user_id; } catch (x) { return null; }
  if (!uid || !/^[A-Za-z0-9]{6,128}$/.test(uid)) return null;
  const r = await fetch('https://firestore.googleapis.com/v1/projects/sinyal-5d37a/databases/(default)/documents/kurslar/' + kurs + '/uyeler/' + uid, { headers: { Authorization: 'Bearer ' + tok } });
  if (!r.ok) return null;
  const d = await r.json();
  return (d.fields && d.fields.rol && d.fields.rol.stringValue) || null;
}
const PERSONEL = ['mudur', 'sekreter', 'usta', 'subemudur', 'teorik', 'muhasebe'];  // YON-073: ek roller
// kursun adı: isteği yapanın kimliğiyle kurs belgesinden (Firestore REST, yalnız ad alanı); okunamazsa boş
async function kursAdiOku(req, kurs) {
  try {
    const r = await fetch('https://firestore.googleapis.com/v1/projects/sinyal-5d37a/databases/(default)/documents/kurslar/' + kurs + '?mask.fieldPaths=ad', { headers: { Authorization: req.headers.get('Authorization') || '' } });
    if (!r.ok) return ''; const d = await r.json(); return String((d.fields && d.fields.ad && d.fields.ad.stringValue) || '').replace(/[\r\n<>]/g, ' ').trim().slice(0, 80);
  } catch (x) { return ''; }
}
// Demo hatları: öğrenci (PHONE_ID), usta öğretici (PHONE_ID_USTA), kurs müdürü (PHONE_ID_MUDUR). Hepsi demo telefonuna (ALICI) yazar.
// Usta ve müdür hatları tanımlıysa mesaj alıcının rolüne göre o hattan gider ve başındaki "ALICI: …" açıklaması silinir.
const demoHatlar = env => ({ ogrenci: [env.PHONE_ID, env.WA_TOKEN], usta: env.PHONE_ID_USTA ? [env.PHONE_ID_USTA, env.WA_TOKEN_USTA || env.WA_TOKEN] : null, mudur: env.PHONE_ID_MUDUR ? [env.PHONE_ID_MUDUR, env.WA_TOKEN_MUDUR || env.WA_TOKEN] : null });
const ETIKET = /^ALICI: ([^\n·(]+?)\s*(?:·[^\n]*)?\n\([^\n]*\)\n―+\n/, GELEN_ETIKET = /^[^\n]* GELEN MESAJ · gönderen:[^\n]*\n\([^\n]*\)\n―+\n/;
function demoHatSec(env, metin, rol) {
  const h = demoHatlar(env), cok = !!(h.usta || h.mudur), m = metin.match(ETIKET);
  if (!rol) rol = GELEN_ETIKET.test(metin) ? 'KURSA GELEN' : m ? m[1].trim() : '';
  const hat = rol === 'HOCA' ? h.usta : ['MÜDÜR', 'ÖN BÜRO', 'KURSA GELEN'].includes(rol) ? h.mudur : null;
  return { hat: hat || h.ogrenci, metin: cok ? metin.replace(ETIKET, '').replace(GELEN_ETIKET, '') : metin };
}
// Kursun kendi WhatsApp hattı (Meta'daki telefon numarası kimliği + kalıcı erişim anahtarı); anahtar tarayıcıya hiç dönmez
const kursHat = async (env, kurs) => { try { return JSON.parse((await env.LINK.get('hat:' + kurs)) || 'null'); } catch (x) { return null; } };
// Onaylı şablonla gönderim: tek gövde değişkeni ({{1}}); değişken satır sonu ve 4'ten fazla boşluk içeremez (Meta kuralı)
// MSJ-010/MSJ-023: Meta şablon gövdesi en çok 1.024 karakter (sabit metin + değişken). Onaylı şablonların sabit metni ~70 karakter
// (sinyal_bildirim, sinyal_kampanya, mebbis_ekran_alarmi); pay bırakılarak değişken 940 karakterde kesilir (sonuna …). Şablon metni uzarsa SABLON_SABIT artırılır.
const SABLON_GOVDE_SINIR = 1024, SABLON_SABIT = 84, SABLON_DEGISKEN = SABLON_GOVDE_SINIR - SABLON_SABIT;
// uzunluk UTF-16 birimiyle sayılır (emoji iki birim: hangi sayımla da sınır aşılmasın); yarım kalan emoji (vekil çift) atılır
const sablonKes = t => t.length > SABLON_DEGISKEN ? t.slice(0, SABLON_DEGISKEN - 1).replace(/[\uD800-\uDBFF]$/, '').trimEnd() + '…' : t;
// Meta kuralı: değişkende satır sonu, sekme ve art arda 4'ten fazla boşluk olamaz (132000 hatası). Satır sonu ' · ' olur; sekme ve öteki
// boşluk karakterleri (dikey sekme, form besleme, bölünmez boşluk, Unicode satır/paragraf ayırıcı) tek boşluğa, 4 ve daha uzun boşluk dizisi 3 boşluğa iner.
const sablonParam = metin => sablonKes(String(metin).replace(/\s*[\r\n\u2028\u2029]+\s*/g, ' · ').replace(/[\t\v\f\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ').replace(/ {4,}/g, '   ').trim());
const sablonGovde = (to, ad, dil, metin) => ({ messaging_product: 'whatsapp', to, type: 'template', template: { name: ad, language: { code: dil || 'tr' }, components: [{ type: 'body', parameters: [{ type: 'text', text: sablonParam(metin) }] }] } });
// Kişinin kursun hattına en son yazdığı an (webhook yazar, 25 saat tutulur). Pencere açık değilse serbest metin Meta'da sonradan
// 131047 ile düşer ve bu hata isteğin cevabında değil webhook'ta gelir; bu yüzden şablon tanımlı kursta pencere kapalıysa doğrudan şablon gider.
const pencereAcik = async (env, kurs, to) => { const t = +(await env.LINK.get('son:' + kurs + ':' + rakam(to)) || 0); return t > 0 && Date.now() - t < 23.5 * 3600e3; };
// Gönderim gövdesi: metin ya da belge (PDF/fotoğraf önce Meta'ya yüklenir)
async function mesajGovdesi(b, metin, to, phoneId, token) {
  if (!(b.belge && b.belge.base64)) return { govde: { messaging_product: 'whatsapp', to, type: 'text', text: { body: metin, preview_url: true } } };
  const bin = Uint8Array.from(atob(b.belge.base64), c => c.charCodeAt(0));
  const fd = new FormData(); fd.append('messaging_product', 'whatsapp'); const tur = /^image\/(jpeg|png)$/.test(b.belge.tur || '') ? b.belge.tur : 'application/pdf'; fd.append('type', tur); fd.append('file', new Blob([bin], { type: tur }), b.belge.dosya || 'belge.pdf');
  const up = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '/media', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
  const uj = await up.json().catch(() => ({}));
  if (!up.ok) return { hata: { ok: false, kod: uj.error && uj.error.code, hata: (uj.error && uj.error.message) || 'Belge yuklenemedi' } };
  return { govde: tur === 'application/pdf' ? { messaging_product: 'whatsapp', to, type: 'document', document: { id: uj.id, filename: b.belge.dosya || 'belge.pdf', caption: metin.slice(0, 1000) } } : { messaging_product: 'whatsapp', to, type: 'image', image: { id: uj.id, caption: metin.slice(0, 1000) } } };
}
// Gelen fotoğraf/PDF: Meta'dan indirilir, 14 gün saklanır
async function medyaAl(env, m, token, anahtar) {
  const o = m[m.type];
  try {
    const bilgi = await (await fetch('https://graph.facebook.com/v25.0/' + o.id, { headers: { Authorization: 'Bearer ' + token } })).json();
    if (bilgi.url && (bilgi.file_size || 0) <= 8e6) {
      const ham = await (await fetch(bilgi.url, { headers: { Authorization: 'Bearer ' + token } })).arrayBuffer();
      await env.LINK.put(anahtar, ham, { expirationTtl: 14 * 86400, metadata: { mime: bilgi.mime_type || o.mime_type || '', dosya: o.filename || '' } });
      return { id: m.id, mime: bilgi.mime_type || o.mime_type || '', dosya: o.filename || '', boyut: ham.byteLength };
    }
  } catch (x) { }
  return null;
}
// ---- Meta webhook imzası (X-Hub-Signature-256) ----
let imzaUyarisi = false;
const hex = u8 => [...new Uint8Array(u8)].map(x => x.toString(16).padStart(2, '0')).join('');
const esit = (a, b) => { if (a.length !== b.length) return false; let f = 0; for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i); return f === 0; };
async function hmacHex(gizli, veri) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(gizli), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, veri));
}
// true: geçerli imza ya da APP_SECRET tanımlı değil (geçiş dönemi); false: imza yok ya da uymuyor
async function metaImzaDogru(env, ham, baslik, ekGizli) {
  const gizliler = String(env.APP_SECRET || '').split(',').map(x => x.trim()).filter(Boolean);
  // kursun kendi uygulama anahtarı varsa imza zorunlu olur (global APP_SECRET tanımlı olmasa da)
  if (ekGizli) gizliler.push(ekGizli);
  // MSJ-005: IMZA_ZORUNLU=1 iken gizli anahtar tanımlı değilse webhook kabul edilmez (yanlış ayarla mesaj kaybolmasın diye ayrı adım)
  if (!gizliler.length) { if (String(env.IMZA_ZORUNLU || '') === '1') return false; if (!imzaUyarisi) { imzaUyarisi = true; console.warn(JSON.stringify({ tur: 'uyari', konu: 'APP_SECRET tanımlı değil; Meta webhook imzası denetlenmiyor' })); } return true; }
  const m = /^sha256=([0-9a-f]{64})$/i.exec(String(baslik || '').trim()); if (!m) return false;
  const gelen = m[1].toLowerCase();
  for (const g of gizliler) if (esit(await hmacHex(g, ham), gelen)) return true;
  return false;
}
// ---- MSJ-021: hat sağlığı (günlük Cron) ----
// Bağlı her kurs hattının ve demo hattının Meta belirteci GET graph/{PHONE_ID} ile denenir; sonuç 'saglik' anahtarında (7 günlük geçersiz imza sayılarıyla).
// Belirteç düşmüşse kurs fark etmeden önce platform sahibi /saglik'ta görür. Kursa ait belirteç ya da numara kayda yazılmaz (yalnız kurs kimliği, sonuç, kalite).
async function hatSaglik(env) {
  if (!env.LINK) return null;
  const dene = async (telId, token) => { if (!telId || !token) return { ok: false, kod: 'eksik' }; try { const r = await fetch('https://graph.facebook.com/v25.0/' + telId + '?fields=verified_name,quality_rating', { headers: { Authorization: 'Bearer ' + token } }); const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, kalite: j.quality_rating || '' } : { ok: false, kod: (j.error && j.error.code) || r.status }; } catch (x) { return { ok: false, kod: 'ag' }; } };
  const hatlar = [];
  if (env.PHONE_ID && env.WA_TOKEN) hatlar.push({ kurs: 'demo', ...(await dene(env.PHONE_ID, env.WA_TOKEN)) });
  let imlec; do { const l = await env.LINK.list({ prefix: 'hat:', cursor: imlec }); for (const k of l.keys) { const h = await kursHat(env, k.name.slice(4)); if (h) hatlar.push({ kurs: k.name.slice(4), ...(await dene(h.phoneId, h.token)) }); } imlec = l.list_complete ? null : l.cursor; } while (imlec);
  const imza = {}; for (let i = 0; i < 7; i++) { const g = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), n = +(await env.LINK.get('imzahata:' + g)) || 0; if (n) imza[g] = n; }
  const o = { zaman: new Date().toISOString(), hatlar, sorunlu: hatlar.filter(h => !h.ok).length, imzaHata: imza };
  await env.LINK.put('saglik', JSON.stringify(o));
  if (o.sorunlu) console.warn(JSON.stringify({ tur: 'uyari', konu: 'hat sağlığı', sorunlu: o.sorunlu, kurslar: hatlar.filter(h => !h.ok).map(h => h.kurs + ':' + h.kod) }));
  return o;
}
async function saglikOku(req, env, url, cevap) {
  if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (url.searchParams.get('yenile') === '1') return cevap({ ok: true, ...(await hatSaglik(env)) });
  return cevap({ ok: true, ...(JSON.parse((env.LINK && await env.LINK.get('saglik')) || 'null') || { zaman: null, hatlar: [] }) });
}
// ---- uygulama hata kayıtları ----
const SAHIP_UID = 'BRqadaBjfLdWjA3NtHL568z41Ng2', FIREBASE_KEY = 'AIzaSyDbcCLYjyvOBQgUNErTMHtWCCIVJulQ7F4';
const HATA_GUN = 7 * 86400, hataIp = new Map(), hataIpGun = new Map(), hataBekleyen = new Map();
let hataYazim = { gun: '', n: 0 };
// kişisel veri sızmasın: e-posta, uzun sayı (TC, telefon), adresin sorgu/parça kısmı silinir; yalnız izin verilen karakterler kalır
const hataTemiz = (s, n) => String(s || '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<e-posta>').replace(/\d[\d\s().-]{5,}\d/g, '<sayı>').replace(/(https?:\/\/[^\s/]+)?(\/[^\s?#:)]*)[?#][^\s:)]*/g, '$2').replace(/[^\p{L}\p{N}\s.,:;!?'"()<>\[\]{}\/\\_=+*&%$#@|~^`-]/gu, '').slice(0, n);
async function hataAl(req, env, cevap) {
  if (!env.LINK) return cevap({ ok: false }, 500);
  const ip = req.headers.get('CF-Connecting-IP') || '', dk = Math.floor(Date.now() / 60e3), sayac = hataIp.get(ip);
  if (sayac && sayac.dk === dk && sayac.n >= 20) return cevap({ ok: false, hata: 'sinir' }, 429);
  hataIp.set(ip, sayac && sayac.dk === dk ? { dk, n: sayac.n + 1 } : { dk, n: 1 }); if (hataIp.size > 5000) hataIp.clear();
  const ham = await req.text(); if (!ham || ham.length > 2048) return cevap({ ok: false, hata: 'boyut' }, 400);
  let b; try { b = JSON.parse(ham); } catch (x) { return cevap({ ok: false, hata: 'gecersiz' }, 400); }
  const k = {
    s: String(b.s || '').replace(/\D/g, '').slice(0, 6), r: String(b.r || '').replace(/[^#/a-z0-9-]/gi, '').slice(0, 40),
    rol: ['mudur', 'sekreter', 'usta', 'ortak', 'ogrenci', 'ziyaretci', 'demo', 'yok'].includes(b.rol) ? b.rol : 'yok',
    t: b.t === 'soz' ? 'soz' : 'hata', m: hataTemiz(b.m, 300), y: hataTemiz(b.y, 600), ks: /^[0-9a-f]{8}$|^demo$/.test(b.ks || '') ? b.ks : '',
    tr: String(b.tr || '').replace(/[^\w .()/-]/g, '').slice(0, 40),
  };
  if (!k.m) return cevap({ ok: false, hata: 'bos' }, 400);
  const iz = (await hmacHex('hata', new TextEncoder().encode([k.s, k.m, k.y.split('\n')[0]].join('|')))).slice(0, 12);
  console.log(JSON.stringify({ tur: 'uygulama-hatasi', iz, ...k }));  // Workers Logs (gözlem açık)
  const simdi = new Date(), gun = simdi.toISOString().slice(0, 10), anahtar = 'hata:' + gun + ':' + iz;
  const eski = await env.LINK.get(anahtar, { type: 'json' }).catch(() => null);
  // KV yazımı sınırlı (ücretsiz plan): aynı iz 10 dakikada bir yazılır, arada gelenler sayılır; günlük üst sınır
  if (eski && simdi - new Date(eski.son) < 10 * 60e3) { hataBekleyen.set(anahtar, (hataBekleyen.get(anahtar) || 0) + 1); return new Response(null, { status: 204, headers: cevap.cors }); }
  if (hataYazim.gun !== gun) hataYazim = { gun, n: 0 };
  // Origin başlığı tarayıcı dışından taklit edilebilir: tek kaynak KV yazım hakkını (kısa link, imza, durum kayıtlarıyla ortak) tüketmesin
  const ipg = hataIpGun.get(ip); if (ipg && ipg.gun === gun && ipg.n >= 10) return new Response(null, { status: 204, headers: cevap.cors });
  if (hataYazim.n >= (+env.HATA_GUNLUK_SINIR || 100)) return new Response(null, { status: 204, headers: cevap.cors });
  hataYazim.n++; hataIpGun.set(ip, ipg && ipg.gun === gun ? { gun, n: ipg.n + 1 } : { gun, n: 1 }); if (hataIpGun.size > 5000) hataIpGun.clear();
  const ek = hataBekleyen.get(anahtar) || 0; hataBekleyen.delete(anahtar);
  const kayit = { iz, ilk: eski ? eski.ilk : simdi.toISOString(), son: simdi.toISOString(), sayi: (eski ? eski.sayi : 0) + 1 + ek, ...k, kurslar: [...new Set([...(eski && eski.kurslar || []), k.ks].filter(Boolean))].slice(0, 8) };
  await env.LINK.put(anahtar, JSON.stringify(kayit), { expirationTtl: HATA_GUN, metadata: { sayi: kayit.sayi, son: kayit.son, s: k.s, r: k.r, rol: k.rol, m: k.m.slice(0, 160) } });
  return new Response(null, { status: 204, headers: cevap.cors });
}
// ---- site formları (SIT-009 iletişim, SIT-020 başvuru): girişsiz POST yalnız sitenin kendi adresinden; liste ve silme yalnız platform sahibi ----
// Kişi bilgisi (ad, telefon, e-posta) yalnız dönüş için tutulur; kayıt 180 gün sonra kendiliğinden silinir (gizlilik sayfası).
const TALEP_GUN = 180 * 86400, talepIp = new Map();
let talepYazim = { gun: '', n: 0 };
const talepMetin = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, n);
async function talepAl(req, env, cevap) {
  if (!env.LINK) return cevap({ ok: false }, 500);
  const ip = req.headers.get('CF-Connecting-IP') || '', on = Math.floor(Date.now() / 600e3), sayac = talepIp.get(ip);
  if (sayac && sayac.on === on && sayac.n >= 5) return cevap({ ok: false, hata: 'Çok fazla deneme; birkaç dakika sonra yeniden deneyin' }, 429);
  talepIp.set(ip, sayac && sayac.on === on ? { on, n: sayac.n + 1 } : { on, n: 1 }); if (talepIp.size > 5000) talepIp.clear();
  const ham = await req.text(); if (!ham || ham.length > 6000) return cevap({ ok: false, hata: 'boyut' }, 400);
  let b; try { b = JSON.parse(ham); } catch (x) { return cevap({ ok: false, hata: 'gecersiz' }, 400); }
  if (b.web) return cevap({ ok: true });  // bal tuzağı: botun doldurduğu gizli alan; kayıt yazılmaz
  const k = { tur: b.tur === 'basvuru' ? 'basvuru' : 'iletisim', ad: talepMetin(b.ad, 80), kurs: talepMetin(b.kurs, 120), sehir: talepMetin(b.sehir, 40), tel: String(b.tel || '').replace(/[^\d+]/g, '').slice(0, 16),
    eposta: /^[^\s@]{1,64}@[^\s@]{1,100}\.[a-z]{2,}$/i.test(String(b.eposta || '').trim()) ? String(b.eposta).trim().slice(0, 120) : '', konu: talepMetin(b.konu, 80), not: talepMetin(b.not, 1500),
    sube: talepMetin(b.sube, 20), program: talepMetin(b.program, 80), ogrenci: talepMetin(b.ogrenci, 20), gun: talepMetin(b.gun, 80) };
  if (!k.ad || !k.kurs) return cevap({ ok: false, hata: 'Ad soyad ve kurs adı gerekli' }, 400);
  if (k.tel.replace(/\D/g, '').length < 10 && !k.eposta) return cevap({ ok: false, hata: 'Size dönebilmemiz için telefon ya da e-posta gerekli' }, 400);
  if (b.kvkk !== true) return cevap({ ok: false, hata: 'Aydınlatma metni onayı gerekli' }, 400);
  const simdi = new Date(), gun = simdi.toISOString().slice(0, 10);
  if (talepYazim.gun !== gun) talepYazim = { gun, n: 0 };
  if (talepYazim.n >= (+env.TALEP_GUNLUK_SINIR || 200)) return cevap({ ok: false, hata: 'Şu an alınamıyor; WhatsApp’tan yazın' }, 503);
  talepYazim.n++;
  const id = simdi.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + crypto.randomUUID().slice(0, 6);
  await env.LINK.put('talep:' + id, JSON.stringify({ id, z: simdi.toISOString(), ...k }), { expirationTtl: TALEP_GUN, metadata: { z: simdi.toISOString(), tur: k.tur, ad: k.ad, kurs: k.kurs, sehir: k.sehir } });
  console.log(JSON.stringify({ tur: 'site-formu', form: k.tur, sehir: k.sehir }));  // kişi bilgisi günlüğe yazılmaz
  return cevap({ ok: true });
}
async function talepYonet(req, env, url, cevap) {
  if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (!env.LINK) return cevap({ ok: true, liste: [] });
  if (req.method === 'POST') {  // { sil: id } ya da { id, durum: 'yeni'|'arandi'|'kapandi', not }
    let b; try { b = await req.json(); } catch (x) { return cevap({ ok: false }, 400); }
    const id = String(b.sil || b.id || ''); if (!/^\d{14}-[0-9a-f]{6}$/.test(id)) return cevap({ ok: false }, 400);
    if (b.sil) { await env.LINK.delete('talep:' + id); return cevap({ ok: true }); }
    const v = await env.LINK.get('talep:' + id, { type: 'json' }); if (!v) return cevap({ ok: false }, 404);
    const y = { ...v, durum: ['yeni', 'arandi', 'kapandi'].includes(b.durum) ? b.durum : v.durum || 'yeni', sahipNot: talepMetin(b.not ?? v.sahipNot, 500) };
    const kalan = Math.max(60, Math.floor((new Date(v.z).getTime() + TALEP_GUN * 1000 - Date.now()) / 1000));
    await env.LINK.put('talep:' + id, JSON.stringify(y), { expirationTtl: kalan, metadata: { z: v.z, tur: v.tur, ad: v.ad, kurs: v.kurs, sehir: v.sehir, durum: y.durum } });
    return cevap({ ok: true, kayit: y });
  }
  const l = await env.LINK.list({ prefix: 'talep:', limit: 1000 });
  const kayitlar = (await Promise.all(l.keys.sort((a, b) => b.name.localeCompare(a.name)).slice(0, 100).map(x => env.LINK.get(x.name, { type: 'json' }).catch(() => null)))).filter(Boolean);
  return cevap({ ok: true, liste: kayitlar, toplam: l.keys.length });
}
// ---- hatalı soru bildirimi (UYG-018): öğrenci uygulamasından girişsiz POST (yalnız sitenin adresinden); soru başına tek kayıt, 1 yıl ----
// Sahip Destek › Soru bankası'nda görür ve 'düzeltildi' der; öğrenci uygulaması bildirdiği soruların durumunu herkese açık uçtan sorar (yalnız numara ve durum).
const SORU_GUN = 365 * 86400, soruIp = new Map();
async function soruBildirAl(req, env, cevap) {
  if (!env.LINK) return cevap({ ok: false }, 500);
  const ip = req.headers.get('CF-Connecting-IP') || '', on = Math.floor(Date.now() / 600e3), sy = soruIp.get(ip);
  if (sy && sy.on === on && sy.n >= 10) return cevap({ ok: false, hata: 'sinir' }, 429);
  soruIp.set(ip, sy && sy.on === on ? { on, n: sy.n + 1 } : { on, n: 1 }); if (soruIp.size > 5000) soruIp.clear();
  let b; try { const h = await req.text(); if (h.length > 3000) return cevap({ ok: false }, 400); b = JSON.parse(h); } catch (x) { return cevap({ ok: false }, 400); }
  // UYG-020: usta öğreticinin animasyon görüşü (doğru / düzeltilmeli) aynı kuyruğa, animasyon başına tek kayıt
  if (typeof b.anim === 'string') {
    if (!/^[a-z0-9:-]{2,40}$/.test(b.anim)) return cevap({ ok: false }, 400);
    const an = 'anim:' + b.anim, eski = await env.LINK.get(an, { type: 'json' }).catch(() => null), dogru = b.karar === 'dogru';
    const g = { karar: dogru ? 'dogru' : 'duzelt', not: hataTemiz(b.not, 300), ks: /^[0-9a-f]{8}$|^demo$/.test(b.ks || '') ? b.ks : '', z: new Date().toISOString() };
    const k = { anim: b.anim, ad: talepMetin(b.ad, 80) || (eski && eski.ad) || b.anim, ilk: eski ? eski.ilk : g.z, son: g.z, dogru: (eski ? eski.dogru : 0) + (dogru ? 1 : 0), duzelt: (eski ? eski.duzelt : 0) + (dogru ? 0 : 1), durum: !dogru ? 'yeni' : (eski && eski.durum) || 'onayli', bildirimler: [...((eski && eski.bildirimler) || []), g].slice(-10) };
    await env.LINK.put(an, JSON.stringify(k), { expirationTtl: SORU_GUN, metadata: { son: k.son, durum: k.durum } });
    return cevap({ ok: true });
  }
  const qi = +b.qi; if (!Number.isInteger(qi) || qi < 0 || qi > 99999) return cevap({ ok: false }, 400);
  const yeni = { neden: talepMetin(b.neden, 60), aciklama: hataTemiz(b.aciklama, 300), surum: String(b.surum || '').replace(/\D/g, '').slice(0, 6), ks: /^[0-9a-f]{8}$|^demo$/.test(b.ks || '') ? b.ks : '', z: new Date().toISOString() };
  const eski = await env.LINK.get('soru:' + qi, { type: 'json' }).catch(() => null);
  const k = { qi, metin: talepMetin(b.metin, 160) || (eski && eski.metin) || '', ilk: eski ? eski.ilk : yeni.z, son: yeni.z, sayi: (eski ? eski.sayi : 0) + 1, durum: eski && eski.durum === 'duzeltildi' ? 'yeni' : (eski && eski.durum) || 'yeni', bildirimler: [...((eski && eski.bildirimler) || []), yeni].slice(-10) };
  await env.LINK.put('soru:' + qi, JSON.stringify(k), { expirationTtl: SORU_GUN, metadata: { sayi: k.sayi, son: k.son, durum: k.durum } });
  return cevap({ ok: true });
}
async function soruBildirYonet(req, env, url, cevap) {
  if (!env.LINK) return cevap({ ok: true, liste: [] });
  // herkese açık: ?durum=1,2,3 → yalnız düzeltilenlerin numarası
  if (req.method === 'GET' && url.searchParams.has('durum')) {
    const ids = String(url.searchParams.get('durum')).split(',').map(Number).filter(x => Number.isInteger(x) && x >= 0).slice(0, 30);
    const l = await Promise.all(ids.map(i => env.LINK.get('soru:' + i, { type: 'json' }).catch(() => null)));
    return cevap({ ok: true, duzeltildi: l.filter(x => x && x.durum === 'duzeltildi').map(x => x.qi) });
  }
  if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (req.method === 'POST') {
    let b; try { b = await req.json(); } catch (x) { return cevap({ ok: false }, 400); }
    const qi = +b.qi, an = typeof b.anim === 'string' && /^[a-z0-9:-]{2,40}$/.test(b.anim) ? 'anim:' + b.anim : Number.isInteger(qi) ? 'soru:' + qi : null, v = an ? await env.LINK.get(an, { type: 'json' }) : null; if (!v) return cevap({ ok: false }, 404);
    if (b.sil) { await env.LINK.delete(an); return cevap({ ok: true }); }
    const y = { ...v, durum: ['yeni', 'duzeltildi', 'reddedildi', 'onayli'].includes(b.durum) ? b.durum : v.durum, sahipNot: talepMetin(b.not ?? v.sahipNot, 300), karar: new Date().toISOString() };
    await env.LINK.put(an, JSON.stringify(y), { expirationTtl: SORU_GUN, metadata: { sayi: y.sayi, son: y.son, durum: y.durum } });
    return cevap({ ok: true, kayit: y });
  }
  if (url.searchParams.get('tur') === 'anim') {
    const la = await env.LINK.list({ prefix: 'anim:', limit: 200 });
    return cevap({ ok: true, liste: (await Promise.all(la.keys.map(x => env.LINK.get(x.name, { type: 'json' }).catch(() => null)))).filter(Boolean) });
  }
  const l = await env.LINK.list({ prefix: 'soru:', limit: 1000 });
  const kayitlar = (await Promise.all(l.keys.sort((a, b) => String((b.metadata || {}).son).localeCompare(String((a.metadata || {}).son))).slice(0, 150).map(x => env.LINK.get(x.name, { type: 'json' }).catch(() => null)))).filter(Boolean);
  return cevap({ ok: true, liste: kayitlar, toplam: l.keys.length });
}
// platform sahibi mi: SAHIP_ANAHTAR (gizli) ya da Firebase kimliği (Google'ın Identity Toolkit'i belirteci doğrular)
async function sahipMi(req, env) {
  const tok = (req.headers.get('Authorization') || '').replace(/^Bearer /, '').trim(); if (!tok) return false;
  if (env.SAHIP_ANAHTAR && esit(tok, String(env.SAHIP_ANAHTAR))) return true;
  if (tok.split('.').length !== 3) return false;
  try {
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + (env.FIREBASE_KEY || FIREBASE_KEY), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tok }) });
    if (!r.ok) return false;
    const j = await r.json(); return !!(j.users && j.users[0] && j.users[0].localId === (env.SAHIP_UID || SAHIP_UID));
  } catch (x) { return false; }
}
async function hataListe(req, env, url, cevap) {
  if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (!env.LINK) return cevap({ ok: true, liste: [] });
  const id = url.searchParams.get('id');
  if (id) { if (!/^\d{4}-\d{2}-\d{2}:[0-9a-f]{12}$/.test(id)) return cevap({ ok: false }, 400); const v = await env.LINK.get('hata:' + id, { type: 'json' }); return v ? cevap({ ok: true, kayit: v }) : cevap({ ok: false }, 404); }
  const gun = url.searchParams.get('gun'), on = 'hata:' + (/^\d{4}-\d{2}-\d{2}$/.test(gun || '') ? gun + ':' : '');
  const l = await env.LINK.list({ prefix: on, limit: 1000 });
  const liste = l.keys.map(k => ({ id: k.name.slice(5), gun: k.name.slice(5, 15), ...(k.metadata || {}) })).sort((a, b) => String(b.son).localeCompare(String(a.son))).slice(0, 300);
  return cevap({ ok: true, liste, toplam: l.keys.length });
}
// Link önizlemesi (WhatsApp): mdsinyal.com/d/*, /i/*, /h/* bu servise route edilirse (Cloudflare vekili açık olmalı;
// belgeler/link-standardi.md), sitenin 404.html yönlendiricisi 200 durum koduyla ve linkin türüne uygun başlıkla döner.
// Route yoksa bu kod hiç çalışmaz; api.mdsinyal.com'a etkisi yoktur.
const ONIZLEME = {
  d: ['Çalışan daveti · mdSinyal', 'Kurs ekibine katılmak için dokunun.'],
  i: ['İmza isteği · mdSinyal', 'Belgeyi okuyup telefondan imzalamak için dokunun.'],
  h: ['Kurs hesabı açma · mdSinyal', 'Kursunuzun mdSinyal hesabını açmak için dokunun.'],
};

// ---- /eposta: kursun rapor ve yedek e-postaları (sinyal-kaynak/belgeler/eposta-gonderici.md) ----
// MSJ-040 kararı (18 Kas): bütün e-postalar mdSinyal'in kendi adresinden, Resend üzerinden: gönderen "mdSinyal <destek@mdsinyal.com>"
// (mdsinyal.com alan adı Resend'de doğrulanmış olmalı; bir Gmail adresi gönderen yapılamaz, Gmail DMARC'ı üçüncü taraf gönderimini reddeder).
// Firebase'in şifre yenileme / doğrulama e-postaları da aynı Resend hesabından SMTP ile gider (konsol ayarı; kod yok).
// Sağlayıcı: RESEND_API_KEY (asıl yol). GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN (Gmail API) yalnız YEDEK yoldur, Resend
// anahtarı yoksa kullanılır; o yolda gönderen Gmail hesabının kendi adresi ya da onaylı takma adı olmalı (EPOSTA_GONDEREN ile verin).
// Gönderen: EPOSTA_GONDEREN (varsayılan "mdSinyal <destek@mdsinyal.com>"). Sahibin analiz e-postası: SAHIP_EPOSTA.
// Resend ücretsiz planı günde 100 / ayda 3.000 e-posta: kurs sayısı artınca izlenmeli (öğrenci e-postası EPOSTA_OGRENCI_SINIR ile de sınırlı).
// Kötüye kullanım engeli: alıcı yalnız kursun ONAYLI adresleri (müdür ekler, adrese giden onay linkine dokunulunca açılır);
// gövde ve ek boyutu sınırlı; kurs başına günde EPOSTA_GUNLUK_SINIR (varsayılan 12) e-posta; günlük/haftalık/aylık rapor dönem başına bir kez.
// KV: 'epadres:<kurs>' adres listesi (belirteç tutulmaz) · 'eponay:<belirteç>' 7 gün · 'epsay:<kurs>:<gün>' sayaç 2 gün · 'epgitti:<kurs>:<tür>:<dönem>' 40 gün
// Bu anahtarlar GET /k/ okuyucusunda engelli (iç kayıt). Sayaç ve 'bir kez' kaydı KV'de oku-yaz: paralel isteklerde YAKLAŞIK sınırdır.
// Ücretsiz Workers planında istek başına işlemci süresi kısa: ek en çok ~1,2 milyon base64 karakter (~900 KB), worker eki ayrıştırmaz.
// YON-069: 'sozlesme' — sözleşme / onay metninin kopyası (metin + SHA-256): yalnız müdür; alıcı onaylayanın doğrulanmış hesap e-postası
// (Firebase belirtecindeki email, email_verified) ve kursun onaylı yönetici adresleri; belge + sürüm başına bir kez (donem), ek yok.
const EP_TUR = ['gunluk', 'haftalik', 'aylik', 'deneme', 'yedek', 'sozlesme'], EP_EN_FAZLA_ADRES = 3;
const epGecerli = a => /^[^\s@<>,;"]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/.test(a);
// isteği yapanın doğrulanmış hesap e-postası (belirteç uyeRol'de Firestore'a gösterilerek doğrulanır; öğrenci giriş adresleri hariç)
function belirtecEposta(req) {
  try { const p = JSON.parse(atob((req.headers.get('Authorization') || '').replace(/^Bearer /, '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))), a = String(p.email || '').trim().toLowerCase();
    return p.email_verified === true && epGecerli(a) && !/@ogrenci\.(mdsinyal\.com|sinyal\.app)$/i.test(a) ? a : ''; } catch (x) { return ''; }
}
const epGun = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const b64 = s => { const b = new TextEncoder().encode(s); let x = ''; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(x); };
const epKacis = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EP_GONDEREN = 'mdSinyal <destek@mdsinyal.com>';   // MSJ-040
function epSaglayici(env) {
  const kimden = env.EPOSTA_GONDEREN || EP_GONDEREN;
  if (env.RESEND_API_KEY) return { ad: 'resend', async gonder(o) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: kimden, to: o.kime, subject: o.konu, html: o.html, text: o.metin || undefined, ...(o.ek ? { attachments: [{ filename: o.ek.ad, content: o.ek.b64 }] } : {}) }) });
    if (!r.ok) throw new Error('Resend ' + r.status + ': ' + (await r.text()).slice(0, 200));
  } };
  if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) return { ad: 'gmail', async gonder(o) {
    const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.GMAIL_CLIENT_ID, client_secret: env.GMAIL_CLIENT_SECRET, refresh_token: env.GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' }) })).json();
    if (!t.access_token) throw new Error('Gmail belirteci alınamadı');
    const s1 = 'k' + crypto.randomUUID().replace(/-/g, ''), s2 = 'a' + crypto.randomUUID().replace(/-/g, ''), satir = x => { const l = []; for (let i = 0; i < x.length; i += 76) l.push(x.slice(i, i + 76)); return l.join('\r\n') + '\r\n'; };
    const govde = ['Content-Type: multipart/alternative; boundary=' + s2, '', '--' + s2, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', satir(b64(o.metin || '')),
      '--' + s2, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', satir(b64(o.html)), '--' + s2 + '--'].join('\r\n');
    const mime = ['From: ' + kimden, 'To: ' + o.kime.join(', '), 'Subject: =?UTF-8?B?' + b64(o.konu) + '?=', 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary=' + s1, '', '--' + s1, govde,
      ...(o.ek ? ['--' + s1, 'Content-Type: application/octet-stream; name="' + o.ek.ad + '"', 'Content-Disposition: attachment; filename="' + o.ek.ad + '"', 'Content-Transfer-Encoding: base64', '', satir(o.ek.b64)] : []), '--' + s1 + '--'].join('\r\n');
    const r = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media', { method: 'POST', headers: { Authorization: 'Bearer ' + t.access_token, 'Content-Type': 'message/rfc822' }, body: mime });
    if (!r.ok) throw new Error('Gmail ' + r.status + ': ' + (await r.text()).slice(0, 200));
  } };
  return null;
}
const epSay = async (env, kurs) => { const a = 'epsay:' + kurs + ':' + epGun(); return { a, n: +((await env.LINK.get(a)) || 0) }; };
const epSayYaz = (env, s) => env.LINK.put(s.a, String(s.n + 1), { expirationTtl: 2 * 86400 });
const epAdresler = async (env, kurs) => { try { return JSON.parse((await env.LINK.get('epadres:' + kurs)) || '[]'); } catch (x) { return []; } };
// e-posta kabuğu (onay e-postası): uygulamadaki js/eposta-kabuk.js ile aynı görünüm; renk değişirse ikisini birlikte değiştir
const epKabuk = (baslik, govde, alt, onizleme) => `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${epKacis(baslik)}</title></head><body style="margin:0;padding:0;background:#f3f5f9">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${epKacis(onizleme || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
<tr><td style="background:#0f1729;padding:16px 24px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle"><img src="https://mdsinyal.com/img/simge/mdsinyal-192.png" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px"></td><td style="vertical-align:middle;padding-left:10px;font-size:19px;color:#ffffff"><span style="opacity:.55;font-weight:500">md</span><b style="font-weight:800">Sinyal</b></td></tr></table></td></tr>
<tr><td style="height:4px;background:#ffc21a;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:24px 24px 28px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f1729;font-weight:800">${epKacis(baslik)}</h1>${govde}</td></tr>
<tr><td style="padding:16px 24px 20px;background:#fafbfc;border-top:1px solid #e8ebf1;font-size:12.5px;line-height:1.5;color:#6b7280">${alt ? `<div>${epKacis(alt)}</div>` : ''}<div style="margin-top:6px"><a href="https://mdsinyal.com" style="color:#6b7280;font-weight:700;text-decoration:none">mdSinyal</a> · sürücü kursu yönetim programı</div></td></tr>
</table></td></tr></table></body></html>`;
const epSayfa = (baslik, metin, form) => new Response(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${epKacis(baslik)} · mdSinyal</title></head><body style="margin:0;background:#0f1729;color:#e9edf5;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box"><main style="max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 8px">${epKacis(baslik)}</h1><p style="margin:0 0 20px;color:#b8c2d6">${epKacis(metin)}</p>${form ? `<form method="post" action="https://api.mdsinyal.com/eposta/onay"><input type="hidden" name="t" value="${epKacis(form)}"><button type="submit" style="font:inherit;color:#fff;background:#2563eb;border:0;padding:12px 20px;border-radius:12px;font-weight:600;cursor:pointer">Adresimi onayla</button></form>` : `<a href="https://mdsinyal.com/" style="color:#fff;background:#2563eb;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">mdSinyal’i aç</a>`}</main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
// ---- DIG-037: kurslar arası ilan panosu ----
// Kurs müdürü ilan verir (Genel, Araç, Ekipman, İş Birliği; başlık, açıklama, iletişim, yayın başlangıç/bitiş, en çok 10 küçük resim). İlan platform
// sahibi onaylayınca yayına girer; bütün kursların müdür ve ön bürosu yayındaki ilanları görür. 'ilan:<id>' (ilan), 'ilan:dizin' (kimlik, kurs, durum, tarihler).
const ILAN_KAT = ['Genel', 'Araç', 'Ekipman', 'İş Birliği'], ILAN_DURUM = ['bekliyor', 'yayinda', 'reddedildi', 'kaldirildi'];
const ilanDizin = async env => { try { return JSON.parse((await env.LINK.get('ilan:dizin')) || '[]'); } catch (x) { return []; } };
const ilanYayinda = (x, bugun) => x.durum === 'yayinda' && (!x.bas || x.bas <= bugun) && (!x.bit || x.bit >= bugun);
async function ilanlar(req, env, url, yol, cevap) {
  if (!env.LINK) return cevap({ ok: false, hata: 'Depo yok' }, 500);
  const bugun = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  if (yol === 'ilan/yonet') {   // platform sahibi: bütün ilanlar ve onay
    if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
    const d = await ilanDizin(env);
    if (req.method === 'GET') return cevap({ ok: true, liste: (await Promise.all(d.map(x => env.LINK.get('ilan:' + x.id, { type: 'json' })))).filter(Boolean) });
    let b = {}; try { b = await req.json(); } catch (x) { } const i = d.findIndex(x => x.id === b.id); if (i < 0 || !ILAN_DURUM.includes(b.durum)) return cevap({ ok: false }, 400);
    const v = await env.LINK.get('ilan:' + b.id, { type: 'json' }); if (!v) return cevap({ ok: false }, 404);
    v.durum = b.durum; v.yonetimNot = String(b.not || '').slice(0, 300); v.onayZaman = new Date().toISOString(); d[i].durum = b.durum;
    await env.LINK.put('ilan:' + b.id, JSON.stringify(v)); await env.LINK.put('ilan:dizin', JSON.stringify(d)); return cevap({ ok: true });
  }
  const kurs = req.headers.get('X-Kurs') || url.searchParams.get('kurs') || '', rol = await uyeRol(req, kurs);
  if (!rol || !['mudur', 'sekreter'].includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  const d = await ilanDizin(env);
  if (yol === 'ilan' && req.method === 'GET') {
    const sec = d.filter(x => ilanYayinda(x, bugun) || x.kurs === kurs).slice(-300);
    const l = (await Promise.all(sec.map(x => env.LINK.get('ilan:' + x.id, { type: 'json' })))).filter(Boolean).map(v => ({ ...v, benim: v.kurs === kurs, kurs: undefined }));
    return cevap({ ok: true, liste: l });
  }
  if (yol === 'ilan' && req.method === 'POST') {
    if (rol !== 'mudur') return cevap({ ok: false, hata: 'İlanı kurs müdürü verir' }, 403);
    const ham = await req.text(); if (ham.length > 2.2e6) return cevap({ ok: false, hata: 'Resimler çok büyük' }, 413);
    let b; try { b = JSON.parse(ham); } catch (x) { return cevap({ ok: false, hata: 'gecersiz' }, 400); }
    const baslik = String(b.baslik || '').trim().slice(0, 90), aciklama = String(b.aciklama || '').trim().slice(0, 2000), iletisim = String(b.iletisim || '').trim().slice(0, 120);
    const kat = ILAN_KAT.includes(b.kategori) ? b.kategori : null, tarihMi = t => /^\d{4}-\d{2}-\d{2}$/.test(t || ''), bas = tarihMi(b.bas) ? b.bas : bugun, bit = tarihMi(b.bit) ? b.bit : '';
    const resimler = (Array.isArray(b.resimler) ? b.resimler : []).slice(0, 10).filter(x => typeof x === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(x) && x.length < 220e3);
    if (!kat || baslik.length < 5 || aciklama.length < 10 || iletisim.length < 5) return cevap({ ok: false, hata: 'Kategori, başlık, açıklama ve iletişim gerekli' }, 400);
    if (bit && bit < bas) return cevap({ ok: false, hata: 'Bitiş başlangıçtan önce olamaz' }, 400);
    if (d.filter(x => x.kurs === kurs && ['bekliyor', 'yayinda'].includes(x.durum)).length >= 10) return cevap({ ok: false, hata: 'Aynı anda en çok 10 ilan' }, 429);
    const id = 'i' + Date.now().toString(36) + crypto.randomUUID().slice(0, 6), v = { id, kurs, kursAd: String(b.kursAd || '').slice(0, 80), kategori: kat, baslik, aciklama, iletisim, bas, bit, resimler, durum: 'bekliyor', zaman: new Date().toISOString() };
    await env.LINK.put('ilan:' + id, JSON.stringify(v)); d.push({ id, kurs, durum: 'bekliyor', bas, bit }); await env.LINK.put('ilan:dizin', JSON.stringify(d.slice(-2000)));
    return cevap({ ok: true, id, durum: 'bekliyor' });
  }
  if (yol === 'ilan/kaldir' && req.method === 'POST') {
    if (rol !== 'mudur') return cevap({ ok: false, hata: 'Yalnız kurs müdürü' }, 403);
    let b = {}; try { b = await req.json(); } catch (x) { } const i = d.findIndex(x => x.id === b.id && x.kurs === kurs); if (i < 0) return cevap({ ok: false }, 404);
    const v = await env.LINK.get('ilan:' + b.id, { type: 'json' }); if (v) { v.durum = 'kaldirildi'; await env.LINK.put('ilan:' + b.id, JSON.stringify(v)); } d[i].durum = 'kaldirildi'; await env.LINK.put('ilan:dizin', JSON.stringify(d)); return cevap({ ok: true });
  }
  return cevap({ ok: false }, 404);
}
// ---- DIG-035: kursun kendi web sitesindeki ön kayıt formu ----
// Kurs müdürü bir anahtar alır ('onkayit:k:<kurs>' ↔ 'onkayit:a:<anahtar>'); sitedeki form anahtarla POST /onkayit'a yazar (girişsiz, her kaynaktan; JSON ya da düz form).
// Ön kayıtlar 'onkayit:q:<kurs>' kuyruğunda bekler (en çok 200, 60 gün); kurs cihazı açılınca alır (GET onkayit/bekleyen) ve aldıklarını siler (POST onkayit/alindi).
// Kötüye kullanıma karşı: KVKK onayı zorunlu, gizli 'web' alanı (bot tuzağı) dolu gelirse sessizce kabul edilmiş gibi döner, IP başına saatte 10 kayıt.
// Onaylı e-posta adresi ve e-posta servisi varsa kursa kısa bildirim gider (günlük e-posta sınırından sayılır).
const OK_TTL = 60 * 86400;
const okTel = t => { const d = String(t || '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, ''); return /^5\d{9}$/.test(d) ? '0' + d : ''; };
const okKac = s => String(s == null ? '' : s).replace(/[<>]/g, '').trim();
async function onKayitAl(req, env, url) {
  const acikCors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...acikCors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers: acikCors });
  if (req.method !== 'POST') return json({ ok: false }, 405);
  if (!env.LINK) return json({ ok: false, hata: 'Depo yok' }, 500);
  const tur = req.headers.get('Content-Type') || '', duz = !tur.includes('json'); let b = {};
  try { const ham = await req.text(); if (ham.length > 20000) return json({ ok: false, hata: 'Çok uzun' }, 413); b = duz ? Object.fromEntries(new URLSearchParams(ham)) : JSON.parse(ham); } catch (x) { return json({ ok: false, hata: 'gecersiz' }, 400); }
  const geri = okKac(b.geri || req.headers.get('Referer') || ''), sayfa = (baslik, metin) => new Response(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${baslik}</title></head><body style="font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 16px;line-height:1.5"><h1 style="font-size:22px">${baslik}</h1><p>${metin}</p>${/^https?:\/\//.test(geri) ? `<p><a href="${geri.replace(/"/g, '')}">Siteye dön</a></p>` : ''}</body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  const yanit = (ok, metin, st = 200) => duz ? sayfa(ok ? 'Teşekkürler' : 'Gönderilemedi', metin) : json(ok ? { ok: true } : { ok: false, hata: metin }, ok ? 200 : st);
  const anahtar = String(b.anahtar || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40), kurs = anahtar && await env.LINK.get('onkayit:a:' + anahtar);
  if (!kurs) return yanit(false, 'Form anahtarı geçersiz. Kursa telefonla ulaşın.', 403);
  if (String(b.web || '').trim()) return yanit(true, 'Bilgileriniz alındı. Kurs sizi arayacak.');   // bot tuzağı
  const ad = okKac(b.ad).slice(0, 60), tel = okTel(b.tel), kvkk = b.kvkk === true || ['on', 'evet', 'true', '1'].includes(String(b.kvkk).toLowerCase());
  if (ad.length < 3 || !tel) return yanit(false, 'Ad soyad ve cep telefonu gerekli.', 400);
  if (!kvkk) return yanit(false, 'Kişisel verilerin işlenmesine onay vermeden ön kayıt alınamaz.', 400);
  const ip = req.headers.get('CF-Connecting-IP') || 'yok', sa = 'onkayit:ip:' + kurs + ':' + ip + ':' + new Date().toISOString().slice(0, 13), n = +((await env.LINK.get(sa)) || 0);
  if (n >= 10) return yanit(false, 'Çok fazla deneme; biraz sonra tekrar deneyin.', 429);
  await env.LINK.put(sa, String(n + 1), { expirationTtl: 3700 });
  const q = 'onkayit:q:' + kurs; let l = []; try { l = JSON.parse((await env.LINK.get(q)) || '[]'); } catch (x) { }
  const x = { id: 'w' + Date.now().toString(36) + crypto.randomUUID().slice(0, 6), zaman: new Date().toISOString(), ad, tel, sinif: okKac(b.sinif).slice(0, 12), mesaj: okKac(b.mesaj).slice(0, 600), kvkk: true, kaynak: okKac(b.kaynak || 'Web sitesi').slice(0, 40) };
  l.push(x); if (l.length > 200) l = l.slice(-200); await env.LINK.put(q, JSON.stringify(l), { expirationTtl: OK_TTL });
  // e-posta bildirimi (varsa): adın yalnız ilk harfi, telefon yok (e-posta kişi verisi taşımasın; ayrıntı uygulamada)
  try { const S = epSaglayici(env), kime = (await epAdresler(env, kurs)).filter(y => y.onay && y.tur !== 'kullanici').map(y => y.a);
    if (S && kime.length) { const s2 = await epSay(env, kurs); if (s2.n < (+env.EPOSTA_GUNLUK_SINIR || 12)) { await S.gonder({ kime, konu: 'Web sitesinden yeni ön kayıt', html: epKabuk('Yeni ön kayıt', `<p style="margin:0 0 12px;font-size:16px">Web sitenizdeki formdan ${epKacis(ad.charAt(0))}. adlı bir aday ön kayıt bıraktı${x.sinif ? ' (' + epKacis(x.sinif) + ' sınıfı)' : ''}.</p><p style="margin:0;font-size:15px">Ayrıntılar mdSinyal’de Yeni öğrenciler’de.</p>`, '', 'Yeni ön kayıt'), metin: 'Web sitenizden yeni ön kayıt geldi. Ayrıntılar mdSinyal’de Yeni öğrenciler’de.' }); await epSayYaz(env, s2); } } } catch (e) { console.error(e); }
  return yanit(true, 'Bilgileriniz alındı. Kurs en kısa sürede sizi arayacak.');
}
async function onKayitYonet(req, env, url, yol, cevap) {
  if (!env.LINK) return cevap({ ok: false, hata: 'Depo yok' }, 500);
  const kurs = req.headers.get('X-Kurs') || url.searchParams.get('kurs') || '', rol = await uyeRol(req, kurs);
  if (!rol || !['mudur', 'sekreter'].includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  const ka = 'onkayit:k:' + kurs, q = 'onkayit:q:' + kurs;
  if (yol === 'onkayit/anahtar' && req.method === 'GET') return cevap({ ok: true, anahtar: (await env.LINK.get(ka)) || '' });
  if (yol === 'onkayit/anahtar' && req.method === 'POST') {
    if (rol !== 'mudur') return cevap({ ok: false, hata: 'Yalnız kurs müdürü' }, 403);
    const eski = await env.LINK.get(ka); if (eski) await env.LINK.delete('onkayit:a:' + eski);
    const yeni = Array.from(crypto.getRandomValues(new Uint8Array(15)), x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
    await env.LINK.put(ka, yeni); await env.LINK.put('onkayit:a:' + yeni, kurs); return cevap({ ok: true, anahtar: yeni });
  }
  if (yol === 'onkayit/bekleyen' && req.method === 'GET') { let l = []; try { l = JSON.parse((await env.LINK.get(q)) || '[]'); } catch (x) { } return cevap({ ok: true, liste: l }); }
  if (yol === 'onkayit/alindi' && req.method === 'POST') { let b = {}; try { b = await req.json(); } catch (x) { } const ids = new Set(Array.isArray(b.idler) ? b.idler.map(String) : []);
    let l = []; try { l = JSON.parse((await env.LINK.get(q)) || '[]'); } catch (x) { } const kalan = l.filter(x => !ids.has(x.id));
    if (kalan.length) await env.LINK.put(q, JSON.stringify(kalan), { expirationTtl: OK_TTL }); else await env.LINK.delete(q); return cevap({ ok: true, kalan: kalan.length }); }
  return cevap({ ok: false }, 404);
}
// ---- MSJ-025: SMS yedeği (Netgsm) ----
// Kursun kendi Netgsm hesabı: kullanıcı kodu, şifre ve onaylı başlık sunucuda 'sms:<kurs>' anahtarında (istemciye geri dönmez). WhatsApp'ı olmayan
// numaraya ya da şablonla da gidemeyen mesaja yedek. Netgsm 'send/get' API: cevap '00 <id>' (01, 02 de başarı); hata kodları Türkçeye çevrilir.
const SMS_HATA = { '20': 'Mesaj metni hatalı ya da çok uzun', '30': 'Netgsm kullanıcı adı/şifresi geçersiz ya da API erişim izni (IP) yok', '40': 'SMS başlığı (gönderici adı) Netgsm’de tanımlı değil', '50': 'İYS kontrollü gönderimde alıcının izni yok', '51': 'İYS marka bilgisi bulunamadı', '70': 'Hatalı istek (eksik ya da yanlış alan)', '80': 'Gönderim sınırı aşıldı', '85': 'Aynı numaraya kısa sürede aynı mesaj (mükerrer)' };
const smsTel = t => { const d = String(t || '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, ''); return /^5\d{9}$/.test(d) ? d : ''; };
async function sms(req, env, url, yol, cevap) {
  if (!env.LINK) return cevap({ ok: false, hata: 'Depo yok' }, 500);
  const kurs = req.headers.get('X-Kurs') || url.searchParams.get('kurs') || '', rol = await uyeRol(req, kurs);
  if (!rol || !['mudur', 'sekreter'].includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  const an = 'sms:' + kurs, kayit = JSON.parse((await env.LINK.get(an)) || 'null');
  if (yol === 'sms/hat' && req.method === 'GET') return cevap({ ok: true, bagli: !!kayit, baslik: kayit ? kayit.baslik : '' });
  if (yol === 'sms/hat' && req.method === 'POST') {
    if (rol !== 'mudur') return cevap({ ok: false, hata: 'SMS hesabını yalnız kurs müdürü bağlar' }, 403);
    const b = await req.json().catch(() => ({}));
    if (b.sil) { await env.LINK.delete(an); return cevap({ ok: true, bagli: false }); }
    const kullanici = String(b.kullanici || '').replace(/\D/g, ''), sifre = String(b.sifre || ''), baslik = String(b.baslik || '').trim().slice(0, 11);
    if (!/^\d{10}$/.test(kullanici) || !sifre || !baslik) return cevap({ ok: false, hata: 'Netgsm kullanıcı kodu (10 hane), şifre ve onaylı SMS başlığı gerekli' }, 400);
    await env.LINK.put(an, JSON.stringify({ kullanici, sifre, baslik, z: new Date().toISOString() }));
    return cevap({ ok: true, bagli: true, baslik });
  }
  if (yol === 'sms' && req.method === 'POST') {
    if (!kayit) return cevap({ ok: false, hata: 'SMS hesabı bağlı değil (Ayarlar › Kurs bilgileri › SMS)' }, 409);
    const b = await req.json().catch(() => ({})), tel = smsTel(b.tel), metin = String(b.metin || '').trim().slice(0, 900);
    if (!tel) return cevap({ ok: false, hata: 'Alıcının cep telefonu geçersiz' }, 400);
    if (!metin) return cevap({ ok: false, hata: 'Mesaj boş' }, 400);
    const q = new URLSearchParams({ usercode: kayit.kullanici, password: kayit.sifre, gsmno: tel, message: metin, msgheader: kayit.baslik, dil: 'TR' });
    let t = ''; try { const r = await fetch('https://api.netgsm.com.tr/sms/send/get?' + q.toString()); t = (await r.text()).trim(); } catch (x) { return cevap({ ok: false, hata: 'Netgsm’e ulaşılamadı' }, 502); }
    const kod = t.split(/\s+/)[0];
    if (['00', '01', '02'].includes(kod)) return cevap({ ok: true, id: t.split(/\s+/)[1] || null, kanal: 'SMS' });
    return cevap({ ok: false, kod, hata: SMS_HATA[kod] || ('SMS gönderilemedi (Netgsm ' + (kod || 'cevap yok') + ')') }, 502);
  }
  return cevap({ ok: false }, 404);
}
// ---- YON-062: "MEBBİS ekranı değişti" alarmı platform sahibine WhatsApp şablonuyla ----
// Kursun mdSinyal'i Yardımcı'dan ekran değişti bildirimi alınca (js/mebkayit.js ekranDegisti) POST /mebbis/ekran-alarm {ekranlar:[{ekran,eksik}], yardimci}.
// Aynı ekran için günde bir ileti (bütün kurslar için ortak: ekran MEB'de değişince hepsini etkiler), günde en çok EKRAN_ALARM_GUNLUK (varsayılan 10) ileti.
// Gönderen mdSinyal'in kendi hattı (PHONE_ID + WA_TOKEN), alıcı SAHIP_TEL; şablon EKRAN_ALARM_SABLON (varsayılan mebbis_ekran_alarmi, hizmet/UTILITY)
// ve EKRAN_ALARM_DIL (varsayılan tr), tek gövde değişkeni. Meta'ya onaya gönderilecek şablon metni taslağı:
//   "mdSinyal uyarısı: MEBBİS ekranı değişti. {{1}}. Yardımcı bu ekranın işlerini durdurdu; ekran haritasını güncelleyin."
// KV: 'ekalarm:<EKRAN>:<gün>' 2 gün (kursun kimliği), 'ekalarm:say:<gün>' 2 gün. SAHIP_TEL tanımlı değilse yalnız {ok, kurulu:false} döner.
const EKRAN_KOD = /^SKT\d{5}$/;
async function ekranAlarm(req, env, cevap, kurs) {
  if (!env.LINK) return cevap({ ok: false, hata: 'Depo yok' }, 500);
  const b = await req.json().catch(() => ({}));
  const l = (Array.isArray(b.ekranlar) ? b.ekranlar : []).slice(0, 10).map(x => ({ kod: String((x && x.ekran) || '').toUpperCase(), eksik: (Array.isArray(x && x.eksik) ? x.eksik : []).map(String).filter(y => /^[\w$.:-]{1,40}$/.test(y)).slice(0, 6) })).filter(x => EKRAN_KOD.test(x.kod));
  if (!l.length) return cevap({ ok: false, hata: 'Ekran kodu geçersiz' }, 400);
  if (!env.SAHIP_TEL || !env.WA_TOKEN || !env.PHONE_ID) return cevap({ ok: true, kurulu: false, gonderildi: [] });
  const gun = epGun(), yeni = [];
  for (const x of l) { if (yeni.some(y => y.kod === x.kod)) continue; if (!(await env.LINK.get('ekalarm:' + x.kod + ':' + gun))) yeni.push(x); }
  if (!yeni.length) return cevap({ ok: true, gonderildi: [], zaten: true });
  const sa = 'ekalarm:say:' + gun, n = +((await env.LINK.get(sa)) || 0);
  if (n >= (+env.EKRAN_ALARM_GUNLUK || 10)) return cevap({ ok: true, gonderildi: [], sinir: true });
  // önce işaretlenir (aynı anda gelen iki bildirim iki ileti göndermesin), gönderilemezse işaret kaldırılır
  for (const x of yeni) await env.LINK.put('ekalarm:' + x.kod + ':' + gun, kurs, { expirationTtl: 2 * 86400 });
  await env.LINK.put(sa, String(n + 1), { expirationTtl: 2 * 86400 });
  const kursAd = (await kursAdiOku(req, kurs)) || 'bir kurs', yrd = String(b.yardimci || '').replace(/[^\w.-]/g, '').slice(0, 12);
  const metin = yeni.map(x => x.kod + (x.eksik.length ? ' (eksik: ' + x.eksik.join(', ') + ')' : '')).join('; ') + ' · bildiren: ' + kursAd + (yrd ? ' · Yardımcı ' + yrd : '');
  const r = await fetch('https://graph.facebook.com/v25.0/' + env.PHONE_ID + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + env.WA_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(sablonGovde(rakam(env.SAHIP_TEL), env.EKRAN_ALARM_SABLON || 'mebbis_ekran_alarmi', env.EKRAN_ALARM_DIL || 'tr', metin)) }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (!r || !r.ok) {
    for (const x of yeni) await env.LINK.delete('ekalarm:' + x.kod + ':' + gun).catch(() => {});
    await env.LINK.put(sa, String(n), { expirationTtl: 2 * 86400 }).catch(() => {});
    console.error(JSON.stringify({ tur: 'hata', konu: 'ekran alarmı WhatsApp', kod: j.error && j.error.code, hata: String((j.error && j.error.message) || 'ulaşılamadı').slice(0, 200) }));
    return cevap({ ok: false, hata: 'WhatsApp iletisi gönderilemedi' }, 502);
  }
  return cevap({ ok: true, gonderildi: yeni.map(x => x.kod) });
}
// ---- PAR-058: öğrenciye tek alıcılı e-posta (makbuz, ödeme hatırlatması) ----
// Alıcı istekteki tek adres (öğrencinin kayıttaki e-postası); kursun onaylı adres listesi aranmaz. Kötüye kullanım engeli: yalnız ofis rolleri
// (müdür, ön büro, şube müdürü); gövde istemciden HTML olarak alınmaz, worker kalıptan kurar (satırlar ve not düz metin, kaçışlı), konu
// kurs adı + türden oluşur; kurs başına günde EPOSTA_OGRENCI_SINIR (varsayılan 40), aynı adrese günde 3. İsteğe bağlı tek PDF eki (makbuz).
// KV 'epogr:<kurs>:<gün>' {n, a:{<adresin SHA-256 ilk 16 hanesi>: sayı}} 2 gün (adres açık yazılmaz). Sayaç oku-yaz: yaklaşık sınırdır.
const EP_OGR_TUR = { makbuz: ['Ödeme makbuzu', 'Ödemeniz alındı'], hatirlatma: ['Ödeme hatırlatması', 'Ödeme hatırlatması'] };
const EP_OGR_ROL = ['mudur', 'sekreter', 'subemudur'], EP_OGR_KISI = 3;
const sha256Hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s))))].map(x => x.toString(16).padStart(2, '0')).join('');
const epDuz = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, n);
async function epOgrenci(req, env, cevap, S, kurs, rol) {
  if (!rol || !EP_OGR_ROL.includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (!S) return cevap({ ok: false, kurulu: false, hata: 'E-posta servisi henüz kurulmadı' }, 503);
  const ham = await req.text(); if (ham.length > 1.4e6) return cevap({ ok: false, hata: 'Dosya çok büyük' }, 413);
  let b; try { b = JSON.parse(ham); } catch (x) { return cevap({ ok: false, hata: 'gecersiz' }, 400); }
  const T = EP_OGR_TUR[b.tur], adres = String(b.adres || '').trim().toLowerCase();
  if (!T) return cevap({ ok: false, hata: 'gecersiz' }, 400);
  if (!epGecerli(adres) || /@ogrenci\.(mdsinyal\.com|sinyal\.app)$/i.test(adres)) return cevap({ ok: false, hata: 'Öğrencinin e-posta adresi geçersiz' }, 400);
  const satir = (Array.isArray(b.satirlar) ? b.satirlar : []).slice(0, 12).map(x => Array.isArray(x) ? [epDuz(x[0], 60), epDuz(x[1], 160)] : null).filter(x => x && x[0]);
  const not = epDuz(b.not, 1000), ad = epDuz(b.ad, 80).replace(/[\r\n]/g, ' ');
  if (!satir.length && !not) return cevap({ ok: false, hata: 'E-posta boş' }, 400);
  let ek = null; if (b.ek) { const ead = String(b.ek.ad || '').replace(/[^\w.-]/g, '').slice(0, 80), v = b.ek.b64;
    if (!/\.pdf$/i.test(ead) || typeof v !== 'string' || v.length > 1.2e6 || v.length % 4 || !/^[A-Za-z0-9+/]{1,64}$/.test(v.slice(0, 64)) || !/^[A-Za-z0-9+/=]{1,64}$/.test(v.slice(-64))) return cevap({ ok: false, hata: 'ek geçersiz' }, 400); ek = { ad: ead, b64: v }; }
  const an = 'epogr:' + kurs + ':' + epGun(), h = (await sha256Hex(adres)).slice(0, 16);
  let say; try { say = JSON.parse((await env.LINK.get(an)) || 'null'); } catch (x) { say = null; } say = say && typeof say === 'object' ? say : { n: 0, a: {} }; say.a = say.a || {};
  const sinir = +env.EPOSTA_OGRENCI_SINIR || 40;
  if (say.n >= sinir) return cevap({ ok: false, hata: 'Bugünlük öğrenci e-postası sınırı doldu (' + sinir + '); yarın tekrar deneyin' }, 429);
  if ((say.a[h] || 0) >= EP_OGR_KISI) return cevap({ ok: false, hata: 'Bu adrese bugün ' + EP_OGR_KISI + ' e-posta gitti; yarın tekrar deneyin' }, 429);
  // kurs adı istemciden alınmaz (konuya istenen metin yazılamasın): isteği yapanın kimliğiyle kurs belgesinden okunur
  const kursAd = (await kursAdiOku(req, kurs)) || 'Sürücü kursunuz';
  const tablo = satir.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;border-collapse:collapse">${satir.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e8ebf1;font-size:14.5px;color:#6b7280">${epKacis(k)}</td><td align="right" style="padding:9px 0;border-bottom:1px solid #e8ebf1;font-size:14.5px;font-weight:700;color:#0f1729">${epKacis(v)}</td></tr>`).join('')}</table>` : '';
  const govde = `${ad ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">Sayın ${epKacis(ad)},</p>` : ''}${tablo}${not ? `<p style="margin:0;font-size:15px;line-height:1.55">${epKacis(not).replace(/\n/g, '<br>')}</p>` : ''}${ek ? '<p style="margin:14px 0 0;font-size:13px;color:#6b7280">Makbuz PDF olarak ektedir.</p>' : ''}`;
  const metin = [ad ? 'Sayın ' + ad + ',' : null, ...satir.map(([k, v]) => k + ': ' + v), not || null, '', kursAd].filter(x => x !== null).join('\n');
  try { await S.gonder({ kime: [adres], konu: kursAd + ' · ' + T[0], metin, html: epKabuk(T[1], govde, 'Bu e-posta ' + kursAd + ' tarafından mdSinyal üzerinden gönderildi. Sorunuz için kursunuzla görüşün.', kursAd + ' · ' + T[0]), ek }); }
  catch (x) { console.error(x); return cevap({ ok: false, hata: 'Gönderilemedi' }, 502); }
  say.n++; say.a[h] = (say.a[h] || 0) + 1; await env.LINK.put(an, JSON.stringify(say), { expirationTtl: 2 * 86400 });
  return cevap({ ok: true, kalan: Math.max(0, sinir - say.n) });
}
async function eposta(req, env, url, yol, cevap) {
  if (!env.LINK) return cevap({ ok: false, hata: 'Depo yok' }, 500);
  const S = epSaglayici(env);
  // onay linki (e-postadaki düğme): girişsiz; belirteç tek kullanımlık. GET yalnız sayfayı gösterir (e-posta güvenlik tarayıcıları
  // linkleri kendiliğinden açar); onay, sayfadaki 'Adresimi onayla' düğmesinin POST isteğiyle olur.
  if (yol === 'eposta/onay' && (req.method === 'GET' || req.method === 'POST')) {
    let t = url.searchParams.get('t') || '';
    if (req.method === 'POST') { const f = await req.formData().catch(() => null); t = (f && String(f.get('t') || '')) || t; }
    if (!/^[a-f0-9]{32}$/.test(t)) return epSayfa('Link geçersiz', 'Onay linki eksik ya da bozuk.');
    let o; try { o = JSON.parse((await env.LINK.get('eponay:' + t)) || 'null'); } catch (x) { o = null; }
    if (!o) return epSayfa('Linkin süresi dolmuş', 'Kurs müdürü adresi Ayarlar › Veri ve e-posta bölümünden yeniden ekleyebilir.');
    const l = await epAdresler(env, o.kurs), x = l.find(y => y.a === o.a);
    if (!x || (o.z && x.z !== o.z)) return epSayfa('Link geçersiz', 'Bu adres kursun listesinden çıkarılmış ya da yeni bir onay linki gönderilmiş.');
    if (x.onay) return epSayfa('E-posta adresi zaten onaylı', 'Bu sayfayı kapatabilirsiniz.');
    if (req.method === 'GET') return epSayfa('E-posta adresini onaylayın', o.a + ' adresine kursun mdSinyal raporları ve yedekleri gelecek. Onaylıyorsanız düğmeye basın.', t);
    x.onay = true; delete x.t; await env.LINK.put('epadres:' + o.kurs, JSON.stringify(l)); await env.LINK.delete('eponay:' + t).catch(() => {});
    return epSayfa('E-posta adresi onaylandı', 'Bu adrese artık kursun raporları ve yedekleri gelecek. Bu sayfayı kapatabilirsiniz.');
  }
  // kurs silinince (Yönetim › Hesaplar › Kursu sil): kursun e-posta kayıtları silinir; yalnız platform sahibi
  if (yol === 'eposta/sahip-sil' && req.method === 'POST') {
    if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
    const b = await req.json().catch(() => ({})), k = String(b.kurs || ''); if (!/^[A-Za-z0-9]{10,40}$/.test(k)) return cevap({ ok: false, hata: 'gecersiz' }, 400);
    await env.LINK.delete('epadres:' + k);
    const g = await env.LINK.list({ prefix: 'epgitti:' + k + ':', limit: 1000 }); for (const x of g.keys) await env.LINK.delete(x.name).catch(() => {});
    return cevap({ ok: true, silinen: g.keys.length + 1 });  // eponay:<belirteç> kayıtları 7 günde düşer; adres listesi olmadan onaylanamaz
  }
  // platform sahibinin haftalık analiz e-postası
  if (yol === 'eposta/sahip' && req.method === 'POST') {
    if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
    if (!S || !env.SAHIP_EPOSTA) return cevap({ ok: false, kurulu: false, hata: 'E-posta servisi henüz kurulmadı' }, 503);
    const b = await req.json().catch(() => ({})); if (typeof b.html !== 'string' || b.html.length > 300e3) return cevap({ ok: false, hata: 'gecersiz' }, 400);
    // haftalık analiz dönem başına bir kez (birden çok cihaz aynı hafta açsa da)
    const donem = String(b.donem || '').replace(/[^\w-]/g, '').slice(0, 20), tek = donem ? 'epgitti:_sahip:' + donem : null;
    if (tek && await env.LINK.get(tek)) return cevap({ ok: true, zatenGitti: true });
    const s = await epSay(env, '_sahip'); if (s.n >= 5) return cevap({ ok: false, hata: 'Bugünlük sınır doldu' }, 429);
    try { await S.gonder({ kime: [env.SAHIP_EPOSTA], konu: String(b.konu || 'mdSinyal kullanım analizi').slice(0, 150), html: b.html, metin: String(b.metin || '').slice(0, 50e3) }); } catch (x) { console.error(x); return cevap({ ok: false, hata: 'Gönderilemedi' }, 502); }
    await epSayYaz(env, s); if (tek) await env.LINK.put(tek, '1', { expirationTtl: 40 * 86400 }); return cevap({ ok: true });
  }
  const kurs = req.headers.get('X-Kurs') || url.searchParams.get('kurs') || '', rol = await uyeRol(req, kurs);
  if (yol === 'eposta/ogrenci' && req.method === 'POST') return epOgrenci(req, env, cevap, S, kurs, rol);   // PAR-058
  if (!rol || !['mudur', 'sekreter'].includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);  // öğretmen adresleri görmez
  const l = await epAdresler(env, kurs);
  if (yol === 'eposta' && req.method === 'GET') return cevap({ ok: true, kurulu: !!S, adresler: l.map(x => ({ a: x.a, onay: !!x.onay, tur: x.tur === 'kullanici' ? 'kullanici' : 'yonetici' })), enFazla: EP_EN_FAZLA_ADRES });
  // adres ekle / çıkar: yalnız kurs müdürü; eklenen adrese onay linki gider
  if (yol === 'eposta/adres' && req.method === 'POST') {
    if (rol !== 'mudur') return cevap({ ok: false, hata: 'Adresleri yalnız kurs müdürü değiştirir' }, 403);
    const b = await req.json().catch(() => ({})), a = String(b.adres || '').trim().toLowerCase();
    if (!epGecerli(a)) return cevap({ ok: false, hata: 'E-posta adresi geçersiz' }, 400);
    if (b.sil) { await env.LINK.put('epadres:' + kurs, JSON.stringify(l.filter(x => x.a !== a))); return cevap({ ok: true }); }
    // MSJ-037: adresin bildirim türü — yönetici (bütün raporlar ve yedek) ya da kullanıcı (yalnız günlük rapor); onay yeniden istenmez
    if (b.turDegistir) { if (!l.some(x => x.a === a)) return cevap({ ok: false, hata: 'Adres yok' }, 404); const tur = b.tur === 'kullanici' ? 'kullanici' : 'yonetici'; await env.LINK.put('epadres:' + kurs, JSON.stringify(l.map(x => x.a === a ? { ...x, tur } : x))); return cevap({ ok: true, tur }); }
    if (!S) return cevap({ ok: false, kurulu: false, hata: 'E-posta servisi henüz kurulmadı' }, 503);
    const var_ = l.find(x => x.a === a); if (var_ && var_.onay) return cevap({ ok: true, onay: true });
    if (!var_ && l.length >= EP_EN_FAZLA_ADRES) return cevap({ ok: false, hata: 'En fazla ' + EP_EN_FAZLA_ADRES + ' adres eklenebilir' }, 400);
    const s = await epSay(env, kurs); if (s.n >= (+env.EPOSTA_GUNLUK_SINIR || 12)) return cevap({ ok: false, hata: 'Bugünlük e-posta sınırı doldu; yarın tekrar deneyin' }, 429);
    const t = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
    // kurs adı istemciden alınmaz (konuya istenen metin yazılamasın): müdürün kimliğiyle kurs belgesinden okunur, okunamazsa genel ad
    const link = 'https://api.mdsinyal.com/eposta/onay?t=' + t, kursAd = (await kursAdiOku(req, kurs)) || 'mdSinyal kullanan bir sürücü kursu';
    try { await S.gonder({ kime: [a], konu: 'mdSinyal · e-posta adresinizi onaylayın', metin: `${kursAd}, bu adresi mdSinyal raporları ve yedekleri için ekledi. Onaylamak için linki açın: ${link}\nSiz eklemediyseniz bu e-postayı silin; onaylanmayan adrese başka e-posta gelmez.`,
      html: epKabuk('E-posta adresinizi onaylayın', `<p style="margin:0 0 12px;font-size:15px;line-height:1.55"><b>${epKacis(kursAd)}</b>, bu adresi mdSinyal’deki <b>rapor ve yedek e-postaları</b> için ekledi.</p>
<p style="margin:0;font-size:15px;line-height:1.55">Onaylarsanız günlük, haftalık ve aylık raporlar ile yedekler bu adrese gelir. Hangi raporların geleceğini kurs müdürü seçer.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="border-radius:10px;background:#ffc21a"><a href="${link}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:800;color:#0f1729;text-decoration:none;border-radius:10px">Adresimi onayla</a></td></tr></table>
<p style="margin:14px 0 0;font-size:13px;color:#6b7280">Link 7 gün geçerli. Açılan sayfada bir kez daha “Adresimi onayla” düğmesine basmanız istenir.</p>`, 'Siz eklemediyseniz bu e-postayı silin; onaylanmayan adrese başka e-posta gelmez.', kursAd + ' rapor ve yedek e-postaları için onayınızı bekliyor') }); }
    catch (x) { console.error(x); return cevap({ ok: false, hata: 'Onay e-postası gönderilemedi' }, 502); }
    await epSayYaz(env, s);
    if (var_ && var_.t) await env.LINK.delete('eponay:' + var_.t).catch(() => {});  // eski biçim kayıt
    // listede belirteç tutulmaz; yalnız son gönderilen linkin zamanı (z) onaylayabilir
    const z = new Date().toISOString(), yeni = { a, onay: false, z }; await env.LINK.put('epadres:' + kurs, JSON.stringify(var_ ? l.map(x => x.a === a ? yeni : x) : l.concat(yeni)));
    await env.LINK.put('eponay:' + t, JSON.stringify({ kurs, a, z }), { expirationTtl: 7 * 86400 });
    return cevap({ ok: true, onay: false });
  }
  // rapor / yedek gönder: müdür ve ön büro; alıcılar sunucudaki onaylı adresler (istekteki adres kullanılmaz)
  if (yol === 'eposta/gonder' && req.method === 'POST') {
    if (!['mudur', 'sekreter'].includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
    if (!S) return cevap({ ok: false, kurulu: false, hata: 'E-posta servisi henüz kurulmadı' }, 503);
    const ham = await req.text(); if (ham.length > 2e6) return cevap({ ok: false, hata: 'Dosya çok büyük' }, 413);  // istemci eki 1,2 milyon karakterle sınırlar
    let b; try { b = JSON.parse(ham); } catch (x) { return cevap({ ok: false, hata: 'gecersiz' }, 400); }
    const tur = EP_TUR.includes(b.tur) ? b.tur : null, donem = String(b.donem || '').replace(/[^\w-]/g, '').slice(0, 20);
    if (!tur || typeof b.html !== 'string' || b.html.length > 400e3) return cevap({ ok: false, hata: 'gecersiz' }, 400);
    if (tur === 'sozlesme' && (rol !== 'mudur' || !donem)) return cevap({ ok: false, hata: rol !== 'mudur' ? 'Sözleşme kopyasını yalnız kurs müdürü alır' : 'gecersiz' }, rol !== 'mudur' ? 403 : 400);
    // kullanıcı türündeki adreslere yalnız günlük rapor gider (haftalık/aylık mali özet ve bütün veriler yöneticiye)
    const kime = [...new Set([...(tur === 'sozlesme' ? [belirtecEposta(req)].filter(Boolean) : []), ...l.filter(x => x.onay && (x.tur !== 'kullanici' || tur === 'gunluk')).map(x => x.a)])];
    if (!kime.length) return cevap({ ok: false, adresYok: true, hata: 'Bu rapor için onaylı e-posta adresi yok' }, 400);
    let ek = null; if (b.ek && tur !== 'sozlesme') { const ad = String(b.ek.ad || '').replace(/[^\w.-]/g, '').slice(0, 80); const v = b.ek.b64;
      // eki baştan sona taramak işlemci süresini aşar: uzunluk ve uçlar denetlenir, geçersiz base64'ü sağlayıcı reddeder
      if (!/\.(xlsx|json|gz)$/.test(ad) || typeof v !== 'string' || v.length > 1.2e6 || v.length % 4 || !/^[A-Za-z0-9+/]{1,64}$/.test(v.slice(0, 64)) || !/^[A-Za-z0-9+/=]{1,64}$/.test(v.slice(-64))) return cevap({ ok: false, hata: 'ek geçersiz' }, 400); ek = { ad, b64: v }; }
    const tek = ['gunluk', 'haftalik', 'aylik', 'sozlesme'].includes(tur) && donem ? 'epgitti:' + kurs + ':' + tur + ':' + donem : null;
    if (tek && await env.LINK.get(tek)) return cevap({ ok: true, zatenGitti: true });
    const s = await epSay(env, kurs); if (s.n >= (+env.EPOSTA_GUNLUK_SINIR || 12)) return cevap({ ok: false, hata: 'Bugünlük e-posta sınırı doldu' }, 429);
    try { await S.gonder({ kime, konu: String(b.konu || 'mdSinyal raporu').slice(0, 150), html: b.html, metin: String(b.metin || '').slice(0, 100e3), ek }); } catch (x) { console.error(x); return cevap({ ok: false, hata: 'Gönderilemedi' }, 502); }
    await epSayYaz(env, s); if (tek) await env.LINK.put(tek, '1', { expirationTtl: 40 * 86400 });
    return cevap({ ok: true, kime: kime.length });
  }
  return cevap({ ok: false }, 404);
}

// ── Mevzuat ve MEB yazıları (/mevzuat/*) ──
// Gömme (embedding) Workers AI ile (env.AI); ortak derlem (site: veri/mevzuat/dizin.json + vektor.bin) ile AYNI model, boyut ve önekler olmalı.
// Kursa gelen yazılar KV'de: mbelge:<kurs> (dizin, en yeni başta), mbelge:<kurs>:<id> (meta + metin + parçalar), mbelge:<kurs>:hepsi
// (GET /mevzuat/hepsi cevabının kendisi: {"ok":true,"boyut","model","parcalar":[{b,t}],"v":"<base64 int8 N×D>"}; ekleme ve silme
// dize üstünde yapılır, büyük JSON çözülmez: işlemci sınırı). Yükleme 3 KV yazması yapar. Özet, cevap ve fotoğraf için
// OpenAI uyumlu dil modeli: LLM_KEY (gizli), LLM_URL, LLM_MODEL (düz değişken; varsayılanlar aşağıda). LLM_KEY yoksa bu uçlar 503 kurulu:false.
const MEVZUAT_GOM = { model: '@cf/google/embeddinggemma-2', boyut: 256, onekSorgu: 'task: search result | query: ', onekBelge: 'title: none | text: ' };  // veri/mevzuat/dizin.json (surum 2026-11-17) ile aynı
const MV_LLM_URL = 'https://api-cdn.deploy.com/api/v1/chat/completions', MV_LLM_MODEL = 'deepseek-ai/deepseek-v4.1-flash-1017';
const MV = { belge: 300, metin: 200000, dosya: 10e6, resim: 1.6e6, parca: 900, ortusme: 150, kaynak: 10, kaynakKar: 20000, gomKar: 400, soru: 400, ozetKar: 24000 };
const MV_TUR = { 'application/pdf': 'pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'image/jpeg': 'resim', 'image/png': 'resim', 'text/plain': 'metin', 'text/markdown': 'metin' };
class MvHata extends Error { constructor(m, s, ek) { super(m); this.s = s || 500; this.ek = ek || {}; } }
// izolat belleğinde dakikalık sayaç (KV yazması yok); izolatlar arası kesin değil, kötüye kullanımı kesmeye yeter
const MV_SAYAC = new Map();
const mvSinirAsti = (anahtar, enCok) => { const k = anahtar + '|' + Math.floor(Date.now() / 60000); if (MV_SAYAC.size > 5000) MV_SAYAC.clear(); const n = (MV_SAYAC.get(k) || 0) + 1; MV_SAYAC.set(k, n); return n > enCok; };
const mvB64 = u => { let x = ''; for (let i = 0; i < u.length; i += 0x8000) x += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(x); };
// base64 sonuna bayt ekler: yalnız son dörtlü çözülür (eski vektörler baştan kodlanmaz)
const mvB64Ekle = (eski, yeni) => {
  if (!eski) return mvB64(yeni);
  if (!eski.endsWith('=')) return eski + mvB64(yeni);
  const son = atob(eski.slice(-4)), u = new Uint8Array(son.length + yeni.length);
  for (let i = 0; i < son.length; i++) u[i] = son.charCodeAt(i);
  u.set(yeni, son.length); return eski.slice(0, -4) + mvB64(u);
};
// vektörler: L2 normalleştir → int8 (sözleşme: max(-127, min(127, round(x*127))))
function mvInt8(vekler, D) {
  const out = new Int8Array(vekler.length * D);
  for (let i = 0; i < vekler.length; i++) {
    const v = vekler[i]; let n = 0;
    for (let j = 0; j < D; j++) n += v[j] * v[j];
    n = Math.sqrt(n) || 1;
    for (let j = 0; j < D; j++) { const x = Math.round(v[j] / n * 127); out[i * D + j] = x > 127 ? 127 : x < -127 ? -127 : x; }
  }
  return new Uint8Array(out.buffer);
}
// Workers AI gömme: 50'şerlik gruplar. bge-m3 { text: [...] } → data: [[...]]; embeddinggemma-2 OpenAI biçimi { input: [...], dimensions }
// → data: [{ index, embedding }] (17 Kas 2026 yerel duman testinde doğrulandı).
// Model daha uzun vektör dönerse ilk D boyut alınır (Matryoshka) ve mvInt8 yeniden normalleştirir.
async function mvGom(env, metinler) {
  if (!env.AI) throw new MvHata('Arama servisi bağlı değil', 503);
  const { model, boyut: D } = MEVZUAT_GOM, out = [];
  for (let i = 0; i < metinler.length; i += 50) {
    const grup = metinler.slice(i, i + 50), girdi = /bge-m3/.test(model) ? { text: grup } : { input: grup, dimensions: D };
    let r; try { r = await env.AI.run(model, girdi); } catch (x) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'gömme', hata: String((x && x.message) || x).slice(0, 160) })); throw new MvHata('Arama şu an yapılamıyor (günlük sınır dolmuş olabilir); biraz sonra tekrar deneyin', 503); }
    let d = (r && (r.data || r.embeddings || r.response)) || [];
    if (d[0] && !Array.isArray(d[0]) && !ArrayBuffer.isView(d[0])) d = d.slice().sort((a, b) => a.index - b.index).map(x => x.embedding);
    if (d.length !== grup.length) throw new MvHata('Arama servisi beklenmeyen cevap verdi', 502);
    for (const v of d) { if (!v || v.length < D) throw new MvHata('Arama servisi beklenmeyen cevap verdi', 502); out.push(v.length > D ? v.slice(0, D) : v); }
  }
  return mvInt8(out, D);
}
// Metni ~900 karakterlik, 150 karakter örtüşen parçalara böler. Paragraflara saygılı; "Madde N" başlığı yeni parça açar (örtüşmesiz).
const MV_MADDE = /^(MADDE|Madde)\s+\d+/;
function mvParcala(metin) {
  const P = MV.parca, O = MV.ortusme, birim = [];  // birim: [metin, paragraf başı mı, madde başı mı]
  for (let p of metin.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').split(/\n\s*\n|\n(?=\s*(?:MADDE|Madde)\s+\d+)/)) {
    p = p.trim(); if (!p) continue;
    const madde = MV_MADDE.test(p);
    if (p.length <= P) { birim.push([p, true, madde]); continue; }
    // uzun paragraf: cümlelere, cümle de uzunsa boşluktan kes
    let ilk = true;
    for (let c of p.split(/(?<=[.!?;:])\s+/)) {
      while (c.length > P) { let k = c.lastIndexOf(' ', P); if (k < P / 2) k = P; birim.push([c.slice(0, k).trim(), ilk, ilk && madde]); ilk = false; c = c.slice(k).trim(); }
      if (c) { birim.push([c, ilk, ilk && madde]); ilk = false; }
    }
  }
  const parcalar = []; let cur = '';
  for (const [t, pb, madde] of birim) {
    const ara = pb ? '\n\n' : ' ';
    if (!cur) { cur = t; continue; }
    if (cur.length + ara.length + t.length <= P && !(madde && cur.length > P / 3)) { cur += ara + t; continue; }
    parcalar.push(cur);
    if (madde) { cur = t; continue; }
    let ek = cur.slice(-O); const k = ek.indexOf(' '); if (k > 0 && k < O / 2) ek = ek.slice(k + 1);
    cur = (ek.length < cur.length ? '… ' + ek + ara : '') + t;
  }
  if (cur.trim()) parcalar.push(cur.trim());
  return parcalar;
}
// toMarkdown çıktısından dosya adı, üst veri ve sayfa başlıkları atılır
const mvMdTemizle = md => String(md || '').replace(/[ \t]+\n/g, '\n').replace(/^#{1,3} [^\n]*\.(pdf|docx)\s*\n/i, '').replace(/^#{1,3} Metadata\s*\n[\s\S]*?(?=^#{1,3} |(?![\s\S]))/im, '').replace(/^#{1,3} Contents\s*$/gim, '').replace(/^#{1,4} Page \d+\s*$/gim, '').replace(/\n{3,}/g, '\n\n').trim();
// OpenAI uyumlu sohbet çağrısı; anahtar ve ham cevap günlüğe yazılmaz
// json: response_format json_object istenir; sağlayıcı bu alanı tanımazsa (400/422) bir kez onsuz denenir (istem zaten kesin JSON şart koşar)
async function mvLlm(env, mesajlar, enCok, { json = false } = {}) {
  if (!env.LLM_KEY) throw new MvHata('Yapay zekâ henüz bağlı değil', 503, { kurulu: false });
  let r;
  const istek = rf => fetch(env.LLM_URL || MV_LLM_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + env.LLM_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.LLM_MODEL || MV_LLM_MODEL, messages: mesajlar, reasoning_effort: 'none', temperature: 0.2, max_completion_tokens: enCok, ...(rf ? { response_format: { type: 'json_object' } } : {}) }), signal: AbortSignal.timeout(55000) });
  try {
    r = await istek(json);
    if (json && (r.status === 400 || r.status === 422)) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'yapay zekâ', not: 'response_format desteklenmedi; istemle JSON isteniyor', durum: r.status })); r = await istek(false); }
  }
  catch (x) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'yapay zekâ', hata: (x && x.name) || 'ag' })); throw new MvHata('Yapay zekâya ulaşılamadı; biraz sonra tekrar deneyin', 502); }
  if (!r.ok) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'yapay zekâ', durum: r.status })); throw new MvHata(r.status === 429 ? 'Yapay zekâ şu an yoğun; bir dakika sonra tekrar deneyin' : r.status === 401 || r.status === 403 ? 'Yapay zekâ anahtarı geçersiz; platform yöneticisine bildirin' : 'Yapay zekâ şu an cevap vermiyor; biraz sonra tekrar deneyin', 502); }
  const j = await r.json().catch(() => null), m = j && j.choices && j.choices[0] && j.choices[0].message;
  let c = m && m.content; if (Array.isArray(c)) c = c.map(x => (x && x.text) || '').join('');
  c = String(c || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!c) throw new MvHata('Yapay zekâ boş cevap verdi; tekrar deneyin', 502);
  return c;
}
const MV_OZET_ISTEM = 'Sürücü kursu müdürüne MEB\'den (il/ilçe millî eğitim müdürlüğü ya da bakanlık) gelen resmî yazıyı özetliyorsun. Kurallar:\n' +
  '- Yalnız verilen metne dayan. Metinde olmayan hiçbir şeyi yazma, tahmin yürütme.\n' +
  '- T.C. kimlik numarası, telefon, adres, e-posta gibi kişisel verileri özete taşıma.\n' +
  '- Sade ve doğru Türkçe yaz; resmî kısaltmaları (MEB, MTSK, e-sınav) olduğu gibi bırak.\n' +
  'Biçim tam olarak şu olsun (başka bir şey ekleme):\n' +
  'Ana fikir: <tek cümle>\n' +
  'Kursun yapması gerekenler:\n' +
  '- <madde; tarih, süre, sayı ve madde numarası varsa aynen yaz>\n' +
  'Kimi ilgilendirir: <kısa; örneğin kurs müdürü, ön büro, usta öğreticiler, kursiyerler>\n' +
  'Yazıda kursa düşen bir iş yoksa ikinci başlığın altına "- Kursa düşen bir iş yok." yaz.';
const MV_CEVAP_ISTEM = 'Sürücü kursu personelinin (kurs müdürü, ön büro, usta öğretici) mevzuat sorusunu YALNIZ aşağıda numaralanmış kaynaklara dayanarak cevaplıyorsun. Kurallar:\n' +
  '- Kaynaklarda olmayan bilgi ekleme, genel bilgini kullanma. Emin olmadığın şeyi yazma.\n' +
  '- Sayı, süre, tutar, yaş, saat, tarih ve oranları kaynaktaki gibi birebir yaz; yuvarlama yapma.\n' +
  '- Soru kaynaktaki rakamlardan bir hesap gerektiriyorsa (ör. 50 sorunun %70\'i, ders saatlerinin toplamı, ücretin yarısı) hesabı yap ve işlemi metinde açıkça göster: "50 × %70 = 35", "16 + 2 = 18 saat". İşlemdeki her rakam kaynakta geçmeli; sonucu kaynakta yazıyormuş gibi sunma, kaynağın numarasını yine yaz.\n' +
  '- Her ayrıntı ve adımda dayandığın kaynağın numarasını "kaynak" dizisine yaz (ör. [1] ya da [2,3]). Yalnız verilen numaraları kullan; kaynağı olmayan cümle yazma.\n' +
  '- Soru birden çok şey soruyorsa (ör. kaç saat ders, sınava girer mi, yaş şartı) her birini ayrı ayrıntı olarak cevapla.\n' +
  '- Bir şeyin kaynaklarda olmadığını söylemeden önce bütün kaynakları baştan sona oku; sorulan süre, gün, saat, yaş, tutar, belge ya da şart herhangi bir kaynakta geçiyorsa mutlaka yaz.\n' +
  '- Soruda "(Not: …)" varsa soruyu o açıklamaya göre anla.\n' +
  '- Soru bir işin nasıl yapılacağını soruyorsa "adimlar" alanına sırasıyla yaz (kim, ne zaman, hangi süre içinde). Değilse "adimlar" boş kalır.\n' +
  '- Cevabın bir kısmı kaynaklarda yoksa o kısmı uydurma: "eksik" alanına neyin bulunamadığını ve bakılacak resmî yeri yaz (il/ilçe millî eğitim müdürlüğü, ÖÖKGM, nüfus müdürlüğü, Resmî Gazete gibi).\n' +
  '- Kaynaklarda cevap hiç yoksa "bulunamadi": true ver, "kisa" alanına "Verilen kaynaklarda bu sorunun cevabı yok." yaz, "eksik" alanına bakılacak resmî yeri yaz; diğer alanlar boş kalır.\n' +
  '- Hukuki görüş ya da tavsiye verme; kaynağın ne dediğini aktar. Kaynaklar çelişiyorsa ikisini de "dikkat" alanında belgenin adıyla belirt (ör. "MTSK Yönetmeliği md.39 … der, MEB yazısı … der").\n' +
  '- Etiketi "mdSinyal Rehberi" ile başlayan kaynaklar açıklamadır; çelişkide resmî madde esastır. "(atıf)" etiketli kaynak, başka bir maddenin gönderme yaptığı maddedir.\n' +
  '- İstisna, ilden ile uygulama farkı ya da yürürlüğe girmemiş (taslak) hüküm varsa "dikkat" alanına yaz; yoksa boş dize bırak.\n' +
  '- "dikkat", "eksik" ve bütün metinler kurs müdürüne yazılır: "kaynak 2", "[2]’de", "verilen kaynaklar", "derlem", "araştırmamıza göre", "mdSinyal Rehberi" gibi iç ifadeler yazma; bir belgeden söz edeceksen adını yaz (ör. "Karayolları Trafik Yönetmeliği geçici madde 10").\n' +
  '- Sade, kısa Türkçe yaz; kurs müdürüne konuşur gibi. "kisa" 1–3 cümle ve sorunun doğrudan cevabı olsun (rakam varsa rakamla). En çok 6 ayrıntı, en çok 7 adım.\n' +
  'Cevabı YALNIZ şu biçimde, geçerli bir JSON nesnesi olarak ver (önce ya da sonra başka metin, kod bloğu yazma):\n' +
  '{"kisa":"doğrudan cevap","ayrinti":[{"metin":"sayı, süre ya da şart","kaynak":[1]}],"adimlar":[{"metin":"yapılacak iş","kaynak":[2]}],"dikkat":"","eksik":"","bulunamadi":false}';
// İstem 2 (v222): sorudaki her alt soru ayrı cevaplanır ("sorular"), bilgi atlanmaz. Ölçüm: arac/mevzuat/degerlendirme-asistan.md (istem 1 ile karşılaştırma).
const MV_CEVAP_ISTEM_2 = 'Sürücü kursu personelinin (kurs müdürü, ön büro, usta öğretici) mevzuat sorusunu YALNIZ aşağıda numaralanmış kaynaklara dayanarak cevaplıyorsun.\n' +
  'Önce soruyu oku ve içindeki ayrı soruları belirle (ör. "kaç saat ders alır", "e-Sınava girer mi", "kayıtta ne getirir"). Tek soru varsa tek alt soru yaz.\n' +
  'Kurallar:\n' +
  '- Her alt soru için "sorular" dizisine kısa bir soru başlığı ve cevabını yaz; cevapta kaynaklardaki ilgili bütün sayı, süre, yaş, saat, gün, tutar, belge ve şartları birebir yaz. Kısaltmak için bilgi atlama.\n' +
  '- Sayıları kaynaktaki gibi yaz; yuvarlama yapma. Soru kaynaktaki rakamlardan bir hesap gerektiriyorsa (ör. 50 sorunun %70\'i, saatlerin toplamı) hesabı yap ve işlemi cevapta açıkça göster: "50 × %70 = 35". İşlemdeki her rakam kaynakta geçmeli.\n' +
  '- Metne "kaynak 3" ya da "(kaynak 2 ve 5)" yazma; numaraları yalnız "kaynak" dizisine koy.\n' +
  '- Her cevabın "kaynak" dizisine dayandığın kaynak numaralarını yaz (yalnız verilen numaralar). Kaynağı olmayan cümle yazma; kaynaklarda olmayan bilgi ekleme, genel bilgini kullanma.\n' +
  '- Bir alt sorunun cevabı kaynaklarda yoksa o alt soruyu "yok": true ile işaretle ve "eksik" alanına neyin bulunamadığını ve bakılacak resmî yeri (il/ilçe millî eğitim müdürlüğü, ÖÖKGM, nüfus müdürlüğü, Resmî Gazete gibi) yaz. "Yok" demeden önce bütün kaynakları baştan sona oku.\n' +
  '- Soru bir işin nasıl yapılacağını soruyorsa "adimlar" alanına sırasıyla yaz (kim, ne zaman, hangi süre içinde); değilse boş bırak.\n' +
  '- "kisa": sorunun 1–2 cümlelik doğrudan cevabı (rakam varsa rakamla).\n' +
  '- Etiketi "mdSinyal Rehberi" ile başlayan kaynaklar açıklamadır; çelişkide resmî madde esastır. "(atıf)" etiketli kaynak, başka maddenin gönderme yaptığı maddedir. Soruda "(Not: …)" varsa soruyu o açıklamaya göre anla.\n' +
  '- Kaynaklar çelişiyorsa, istisna, ilden ile uygulama farkı ya da yürürlüğe girmemiş hüküm varsa "dikkat" alanına kısaca, belgenin adıyla yaz (numara yazma); yoksa boş bırak.\n' +
  '- "dikkat", "eksik" ve bütün metinler kurs müdürüne yazılır: "kaynak 2", "[2]’de", "verilen kaynaklar", "derlem", "araştırmamıza göre", "mdSinyal Rehberi" gibi iç ifadeler yazma; bir belgeden söz edeceksen adını yaz (ör. "Karayolları Trafik Yönetmeliği geçici madde 10").\n' +
  '- Hiçbir alt sorunun cevabı yoksa "bulunamadi": true ver, "kisa" alanına "Verilen kaynaklarda bu sorunun cevabı yok." yaz.\n' +
  '- Sade Türkçe, kurs müdürüne konuşur gibi. En çok 6 alt soru, en çok 7 adım.\n' +
  'YALNIZ şu JSON nesnesini ver:\n' +
  '{"kisa":"...","sorular":[{"soru":"kısa alt soru","cevap":"cevap","kaynak":[1],"yok":false}],"adimlar":[{"metin":"...","kaynak":[2]}],"dikkat":"","eksik":"","bulunamadi":false}';
const MV_ISTEM_SURUM = 2;  // 17 Kas ölçümü (set 3, 379 soru): beklenen rakam %60,1 → %63,3, dayanak %88,9 ≈ %88,6, uydurma rakam 0; istem 1 ölçüm ucunda seçilebilir
// Cevap biçimi: LLM'in JSON'u ayrıştırılır ve doğrulanır; kaynak numarası 1..n dışında olanlar atılır, kaynağı kalmayan ayrıntı/adım gösterilmez.
// JSON bozuksa düz metin { kisa: metin, duz: true } olur. cevap alanı eski istemciler için düz metin özetidir ([n] atıflarıyla).
const MV_CB = { kisa: 600, metin: 400, dikkat: 500, eksik: 400, liste: 8, kaynak: 4, duz: 3000 };
const MV_YOK = 'Verilen kaynaklarda bu sorunun cevabı yok.';
const mvKes = (s, n) => { s = String(s || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').replace(/[ \t]+/g, ' ').trim(); if (s.length <= n) return s; const k = s.lastIndexOf(' ', n - 1); return s.slice(0, k > n * 0.6 ? k : n - 1).trimEnd() + '…'; };
// metindeki [n] atıflarından aralık dışı olanlar silinir
const mvAtifSuz = (s, n) => s.replace(/\s*\[(\d{1,3})\]/g, (x, k) => (+k >= 1 && +k <= n ? x : '')).trim();
// metne yazıyla sızan kaynak anışları ("(kaynak 8 ve 10)", "kaynak 3'e göre") silinir; numaralar zaten kaynak dizisinde
const mvKaynakAnisSil = t => String(t || '').replace(/\s*\(\s*kaynak(?:lar)?\s*\d{1,2}(?:\s*(?:,|ve|-)\s*\d{1,2})*\s*\)/gi, '').replace(/\s*\bkaynak(?:lar)?\s*\d{1,2}(?:\s*(?:,|ve)\s*\d{1,2})*(?:['’]?(?:e|a|ye|ya|de|da|te|ta)\s+göre)?/gi, '');
// "dikkat"/"eksik" kursa gider: kaynak numarasıyla anış ("Kaynak [2]'de", "kaynak 5'te") silinir, iç not cümleleri ("derlemde yok", "araştırmamıza göre") atılır
const MV_IC_NOT = /derlem|araştırmamız|mdsinyal rehber|verilen kaynak|kaynak listesi|veri ?set/i;
const mvIcNotSil = t => {
  const s = String(t || '').replace(/\s*\(\s*(?:bkz\.?\s*)?\[\d{1,3}\](?:\s*(?:,|ve)\s*\[\d{1,3}\])*\s*\)/g, '')
    .replace(/\b[Kk]aynak(?:lar)?\s*\[?\d{1,2}\]?(?:\s*(?:,|ve|-)\s*\[?\d{1,2}\]?)*(?:['’]?(?:deki|daki|teki|taki|nde|nda|de|da|te|ta|ye|ya|e|a)\b)?(?:\s+göre)?\s*,?\s*/g, '')
    .replace(/\s*\[\d{1,3}\](?:['’]\p{L}+)?/gu, '');
  return s.split(/(?<=[^\d\s][.!?])\s+(?=[\p{Lu}"'“‘])/u).filter(c => c.trim() && !MV_IC_NOT.test(c)).map(c => c.trim().replace(/^\p{Ll}/u, h => h.toLocaleUpperCase('tr'))).join(' ').replace(/\s{2,}/g, ' ').trim();
};
function mvCevapCoz(ham, n) {
  const duz = () => { const t = mvKes(mvAtifSuz(String(ham || '').replace(/^```(?:json)?\s*|\s*```$/g, ''), n), MV_CB.duz) || MV_YOK; return { kisa: t, ayrinti: [], adimlar: [], dikkat: '', eksik: '', bulunamadi: false, duz: true, cevap: t }; };
  let j = null; const s = String(ham || ''), a = s.indexOf('{'), z = s.lastIndexOf('}');
  if (a >= 0 && z > a) { try { j = JSON.parse(s.slice(a, z + 1)); } catch (x) { j = null; } }
  if (!j || typeof j !== 'object' || Array.isArray(j) || (typeof j.kisa !== 'string' && j.bulunamadi !== true)) return duz();
  const liste = l => (Array.isArray(l) ? l : []).map(x => {
    if (typeof x === 'string') x = { metin: x };
    if (!x || typeof x.metin !== 'string') return null;
    const ks = new Set((Array.isArray(x.kaynak) ? x.kaynak : [x.kaynak]).map(Number).filter(k => Number.isInteger(k) && k >= 1 && k <= n));
    // metne gömülü [n] atıfları kaynağa taşınır
    const metin = mvKes(mvKaynakAnisSil(x.metin).replace(/\s*\[(\d{1,3})\]/g, (y, k) => { if (+k >= 1 && +k <= n) ks.add(+k); return ''; }), MV_CB.metin);
    const soru = mvKes(typeof x.soru === 'string' ? x.soru.replace(/\s*\[(\d{1,3})\]/g, '') : '', 120);
    return metin && ks.size ? { metin, kaynak: [...ks].sort((p, q) => p - q).slice(0, MV_CB.kaynak), ...(soru ? { soru } : {}) } : null;
  }).filter(Boolean).slice(0, MV_CB.liste);
  // istem 2: "sorular" [{ soru, cevap, kaynak, yok }] → ayrıntı { soru, metin, kaynak } (cevabı olmayan alt soru ayrıntıya girmez; eksik alanında anlatılır)
  if (Array.isArray(j.sorular) && j.sorular.length) j.ayrinti = j.sorular.filter(x => x && !x.yok && typeof x.cevap === 'string').map(x => ({ metin: x.cevap, kaynak: x.kaynak, soru: typeof x.soru === 'string' ? x.soru : '' }));
  const bulunamadi = j.bulunamadi === true;
  const o = { kisa: mvKes(mvAtifSuz(mvKaynakAnisSil(typeof j.kisa === 'string' ? j.kisa : ''), n), MV_CB.kisa), ayrinti: bulunamadi ? [] : liste(j.ayrinti), adimlar: bulunamadi ? [] : liste(j.adimlar), dikkat: bulunamadi ? '' : mvKes(mvIcNotSil(typeof j.dikkat === 'string' ? j.dikkat : ''), MV_CB.dikkat), eksik: mvKes(mvIcNotSil(typeof j.eksik === 'string' ? j.eksik : ''), MV_CB.eksik), bulunamadi };
  if (!o.kisa) { if (!bulunamadi && !o.ayrinti.length) return duz(); o.kisa = bulunamadi ? MV_YOK : ''; }
  const at = l => l.map(k => '[' + k + ']').join('');
  o.cevap = [o.kisa, o.ayrinti.map(x => '- ' + (x.soru ? x.soru + ': ' : '') + x.metin + ' ' + at(x.kaynak)).join('\n'), o.adimlar.length ? 'Yapılacaklar:\n' + o.adimlar.map((x, i) => (i + 1) + '. ' + x.metin + ' ' + at(x.kaynak)).join('\n') : '', o.dikkat ? 'Dikkat: ' + o.dikkat : '', o.eksik ? 'Kaynaklarda yok: ' + o.eksik : ''].filter(Boolean).join('\n\n');
  return o;
}
// Soruyu anlama (/mevzuat/anla): soruyu derlemin içindekiler listesindeki maddelere ve resmî terimli aramalara çevirir.
// İçindekiler sitenin kendi dosyasıdır (veri/mevzuat/icindekiler.txt; arac/mevzuat/kavram/yaz.mjs üretir); izolatta 10 dakika tutulur.
// Cevap { sorgular: [≤3], maddeler: [{ b, m }] (yalnız listede olanlar), konu }; site bu maddeleri ve aramaları kendi derleminde arar.
const MV_ANLA_ISTEM = 'Sürücü kursu personelinin sorusunu mevzuat aramasına hazırlıyorsun. Aşağıda derlemdeki resmî belgelerin içindekiler listesi var ' +
  '(her satır "belge: madde — başlık"). Görevin:\n' +
  '1) Sorunun cevabının bulunabileceği maddeleri listeden seç (en ilgili önce, en çok 6). Satırı tam yazıldığı gibi "belge: madde" olarak yaz ' +
  '(ör. "mtsk: Madde 39"). Belgenin tek satırı varsa yalnız "belge:" yaz. Listede olmayan madde yazma.\n' +
  '2) Soruyu resmî terimlerle 1–3 kısa arama cümlesine çevir (ehliyet → sürücü belgesi, hoca → usta öğretici, öğrenci → kursiyer, ' +
  'yazılı sınav → elektronik sınav, pratik → direksiyon eğitimi dersi sınavı). Sınıf geçişi sorularında hem farklı sınıf sertifika ' +
  'hem hedef sınıfın yaş/deneyim şartını düşün. Birden çok konuya değen soruda her konu için ayrı arama yaz.\n' +
  '3) Konuyu 2–5 kelimeyle adlandır.\n' +
  'YALNIZ şu JSON nesnesini ver: {"maddeler":["mtsk: Madde 39"],"sorgular":["..."],"konu":"..."}';
const MV_ICINDE = { t: '', zaman: 0, set: null };
async function mvIcindekiler() {
  if (MV_ICINDE.t && Date.now() - MV_ICINDE.zaman < 600000) return MV_ICINDE;
  const r = await fetch('https://mdsinyal.com/veri/mevzuat/icindekiler.txt', { cf: { cacheTtl: 600 } }).catch(() => null);
  const t = r && r.ok ? await r.text() : '';
  if (!t) { if (MV_ICINDE.t) return MV_ICINDE; throw new MvHata('Mevzuat listesi alınamadı; biraz sonra tekrar deneyin', 503); }
  const set = new Set();
  for (const s of t.split('\n')) { const m = s.match(/^([a-z0-9-]+):\s?(.*?)\s?— /); if (m) set.add(m[1] + ': ' + m[2].trim()); }
  Object.assign(MV_ICINDE, { t: t.slice(0, 40000), zaman: Date.now(), set });
  return MV_ICINDE;
}
function mvAnlaCoz(ham, set) {
  let j = null; const s = String(ham || ''), a = s.indexOf('{'), z = s.lastIndexOf('}');
  if (a >= 0 && z > a) { try { j = JSON.parse(s.slice(a, z + 1)); } catch (x) { j = null; } }
  if (!j || typeof j !== 'object') return { sorgular: [], maddeler: [], konu: '' };
  const maddeler = [];
  for (const x of (Array.isArray(j.maddeler) ? j.maddeler : []).slice(0, 10)) {
    const k = String(x || '').replace(/\s+/g, ' ').trim().replace(/^([a-z0-9-]+)\s*:\s*/, '$1: ');
    const m = k.match(/^([a-z0-9-]+): ?(.*)$/); if (!m) continue;
    if (m[2] ? !set.has(k) : ![...set].some(y => y.startsWith(m[1] + ': '))) continue;
    if (!maddeler.some(y => y.b === m[1] && y.m === m[2])) maddeler.push({ b: m[1], m: m[2] });
    if (maddeler.length >= 6) break;
  }
  const sorgular = (Array.isArray(j.sorgular) ? j.sorgular : []).filter(x => typeof x === 'string').map(x => mvKes(x, 160)).filter(Boolean).slice(0, 3);
  return { sorgular, maddeler, konu: mvKes(typeof j.konu === 'string' ? j.konu : '', 60) };
}
async function mvAnla(env, soru) {
  const ic = await mvIcindekiler();
  return mvAnlaCoz(await mvLlm(env, [{ role: 'system', content: MV_ANLA_ISTEM + '\n\nİçindekiler:\n' + ic.t }, { role: 'user', content: 'Soru: ' + soru }], 400, { json: true }), ic.set);
}
// Kurs başına günlük yapay zekâ sınırı: Cache API'de sayaç (KV yazması harcamaz; veri merkezi başına, kötüye kullanımı kesmeye yeter)
const MV_GUNLUK = 300;
async function mvGunlukAsti(kursId) {
  try {
    const c = caches.default, g = new Date().toISOString().slice(0, 10), k = new Request('https://sayac.mdsinyal.invalid/mv/' + encodeURIComponent(kursId) + '/' + g);
    const r = await c.match(k), n = (r ? +(await r.text()) || 0 : 0) + 1;
    await c.put(k, new Response(String(n), { headers: { 'Cache-Control': 'max-age=90000' } }));
    return n > MV_GUNLUK;
  } catch (x) { return false; }
}
// Ölçüm ucu (/mevzuat/olcum/anla, /mevzuat/olcum/cevapla): yalnız MV_OLCUM gizli değeri tanımlıyken ve X-Olcum başlığı eşleşirse.
// Asistanın cevap doğruluğu ölçülürken kullanılır; ölçüm bitince gizli değer silinir ve uç kapanır (404).
async function mvOlcumIzin(req, env) {
  if (!env.MV_OLCUM || String(env.MV_OLCUM).length < 32) return false;
  const a = new TextEncoder().encode(req.headers.get('X-Olcum') || ''), b = new TextEncoder().encode(env.MV_OLCUM);
  if (a.length !== b.length) return false;
  try { return crypto.subtle.timingSafeEqual(a, b); } catch (x) { let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
}
const MV_ETKI_ISTEM = 'Sürücü kurslarına (özel MTSK) hizmet veren platformun editörüsün. Verilen resmî belge ya da değişikliğin sürücü kurslarını nasıl etkilediğini kurs müdürüne anlatacak kısa bir duyuru taslağı hazırla. Kurallar:\n' +
  '- Yalnız verilen metne dayan; metinde olmayan hiçbir şeyi yazma, tahmin yürütme. Tarih, süre, tutar ve madde numaralarını aynen yaz.\n' +
  '- Kursu ilgilendirmeyen kısımları atla. Belge kursları hiç ilgilendirmiyorsa ozet alanına bunu yaz, yapilacaklar boş kalsın.\n' +
  '- Sade Türkçe, kurs müdürüne konuşur gibi.\n' +
  'YALNIZ şu JSON nesnesini ver: {"baslik":"en çok 10 kelime","ozet":"2-4 cümle: ne değişti, ne zamandan itibaren","yapilacaklar":["kursun yapması gereken somut iş (son tarih varsa yaz)"],"kimi":"kurs müdürü, ön büro, usta öğretici, kursiyer gibi","yururluk":"yürürlük tarihi metinde varsa, yoksa boş"}';
const MV_RESIM_ISTEM ='Bu fotoğraf resmî bir yazının sayfası. Sayfada yazan metni olduğu gibi, Türkçe karakterleri koruyarak düz metne çevir. Yorum, özet ya da açıklama ekleme; yalnız metni yaz. Okunamayan yerlere [okunamadı] yaz. Fotoğrafta metin yoksa yalnız BOS yaz.';
const mvOzetle = (env, ad, metin) => mvLlm(env, [{ role: 'system', content: MV_OZET_ISTEM }, { role: 'user', content: (ad ? 'Yazının adı: ' + ad + '\n\n' : '') + 'Metin:\n' + metin.slice(0, MV.ozetKar) }], 700);
const mvTemiz = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
// hepsi değeri (GET cevabıyla aynı dize)
const mvHepsiBas = () => '{"ok":true,"boyut":' + MEVZUAT_GOM.boyut + ',"model":' + JSON.stringify(MEVZUAT_GOM.model) + ',"parcalar":[';
const mvHepsiBos = () => mvHepsiBas() + '],"v":""}';
function mvHepsiEkle(ham, parcalar, bayt) {
  if (!ham || !ham.startsWith(mvHepsiBas())) { if (ham) console.warn(JSON.stringify({ tur: 'uyari', konu: 'mevzuat gömme modeli değişti; eski parçalar aramadan düştü' })); ham = mvHepsiBos(); }
  const iv = ham.lastIndexOf('],"v":"'), bas = ham.slice(0, iv), v = ham.slice(iv + 7, -2), ek = JSON.stringify(parcalar).slice(1, -1);
  return bas + (ek && !bas.endsWith('[') ? ',' : '') + ek + '],"v":"' + mvB64Ekle(v, bayt) + '"}';
}
// belgenin parçaları hepsi'de ardışık: dizeden çıkarılır, vektör satırları ikili dizede kesilir (JSON çözülmez)
function mvHepsiSil(ham, id) {
  if (!ham || !ham.startsWith(mvHepsiBas())) return ham;
  const D = MEVZUAT_GOM.boyut, i0 = mvHepsiBas().length, iv = ham.lastIndexOf('],"v":"'), bas = '{"b":' + JSON.stringify(id) + ',"t":';
  const s = ham.indexOf(bas, i0); if (s < 0 || s > iv) return ham;
  let once = 0; for (let p = ham.indexOf('{"b":"', i0); p >= 0 && p < s; p = ham.indexOf('{"b":"', p + 6)) once++;
  let k = 1, e = iv;
  for (let p = s; ;) { const n = ham.indexOf(',{"b":"', p + 1); if (n < 0 || n > iv) break; if (ham.startsWith(bas, n + 1)) { k++; p = n; continue; } e = n; break; }
  let a = s, z = e; if (z < iv) z++; else if (a > i0) a--;  // ayırıcı virgül
  const v = ham.slice(iv + 7, -2), bin = v ? atob(v) : '', v2 = bin ? btoa(bin.slice(0, once * D) + bin.slice((once + k) * D)) : '';
  return ham.slice(0, a) + ham.slice(z, iv) + '],"v":"' + v2 + '"}';
}
// belge kimliği: yüklemede üretilen 12 karakter; 'hepsi' (arama kümesinin anahtarı) belge sayılmaz
const mvId = id => /^[a-z0-9]{6,24}$/.test(id) && id !== 'hepsi';
const mvDizin = async (env, kurs) => { try { return JSON.parse((await env.LINK.get('mbelge:' + kurs)) || '[]'); } catch (x) { return []; } };
// /mevzuat/cevapla gövdesi: { soru, kaynaklar: [{ etiket, t, resmi? }] } (site seçer; en çok MV.kaynak kaynak, MV.kaynakKar karakter)
const mvSoru = b => {
  const soru = b && typeof b.soru === 'string' ? b.soru.trim() : '';
  if (!soru) throw new MvHata('Soru boş', 400);
  if (soru.length > MV.soru) throw new MvHata('Soru en çok ' + MV.soru + ' karakter olabilir', 400);
  return soru;
};
// Cevap hazırlığı: doğrulama, istem, önbellek anahtarı; önbellekte varsa hazir dolu döner
async function mvCevapHazirla(b, istem = 0) {
  const soru = mvSoru(b), k = Array.isArray(b.kaynaklar) ? b.kaynaklar : null;
  if (!k || !k.length) throw new MvHata('Kaynak yok', 400);
  if (k.length > MV.kaynak) throw new MvHata('En çok ' + MV.kaynak + ' kaynak gönderilebilir', 400);
  let top = 0; for (const x of k) { if (!x || typeof x.t !== 'string' || !x.t.trim()) throw new MvHata('Kaynak metni boş', 400); top += x.t.length + String(x.etiket || '').length; }
  if (top > MV.kaynakKar) throw new MvHata('Kaynaklar toplam ' + MV.kaynakKar.toLocaleString('tr-TR') + ' karakteri geçemez', 400);
  // resmî olmayan kaynak (mdSinyal rehberi ve sık sorulanlar) istemciden resmi:false ile gelir; etiketi her durumda "mdSinyal Rehberi" ile başlar
  const mvEtiket = x => { const et = mvTemiz(x.etiket, 200); return x.resmi === false && !/^mdSinyal Rehberi/.test(et) ? 'mdSinyal Rehberi · ' + et : et; };
  const govde = 'Soru: ' + soru + '\n\nKaynaklar:\n' + k.map((x, i) => '[' + (i + 1) + '] ' + mvEtiket(x) + '\n' + x.t.trim()).join('\n\n');
  const surum = istem === 1 || istem === 2 ? istem : MV_ISTEM_SURUM;
  const h = { n: k.length, surum, mesajlar: [{ role: 'system', content: surum === 2 ? MV_CEVAP_ISTEM_2 : MV_CEVAP_ISTEM }, { role: 'user', content: govde }], enCok: surum === 2 ? 1800 : 1400, anahtar: null, hazir: null };
  // önbellek (Cache API, 7 gün): aynı istem + soru + kaynaklar → aynı cevap; ücretsiz, KV yazması yok, veri merkezi başına
  try { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('d2\n' + surum + '\n' + govde))); h.anahtar = new Request('https://onbellek.mdsinyal.invalid/mv/cevap/' + [...d].map(x => x.toString(16).padStart(2, '0')).join('')); const r = await caches.default.match(h.anahtar); if (r) h.hazir = { ...(await r.json()), onbellek: true }; } catch (x) { h.anahtar = null; }
  return h;
}
const mvCevapSakla = async (h, o) => { if (h.anahtar && !o.duz) { try { await caches.default.put(h.anahtar, new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=604800' } })); } catch (x) { } } };
async function mvCevapla(env, b, istem = 0) {
  const h = await mvCevapHazirla(b, istem); if (h.hazir) return h.hazir;
  const o = mvCevapCoz(await mvLlm(env, h.mesajlar, h.enCok, { json: true }), h.n);
  await mvCevapSakla(h, o); return o;
}
// Akışlı dil modeli çağrısı (stream: true): her içerik parçası onParca'ya verilir, sonunda bütün metin döner
async function mvLlmAkis(env, mesajlar, enCok, { json = false } = {}, onParca = () => { }) {
  if (!env.LLM_KEY) throw new MvHata('Yapay zekâ henüz bağlı değil', 503, { kurulu: false });
  const istek = rf => fetch(env.LLM_URL || MV_LLM_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + env.LLM_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.LLM_MODEL || MV_LLM_MODEL, messages: mesajlar, reasoning_effort: 'none', temperature: 0.2, max_completion_tokens: enCok, stream: true, ...(rf ? { response_format: { type: 'json_object' } } : {}) }), signal: AbortSignal.timeout(55000) });
  let r;
  try { r = await istek(json); if (json && (r.status === 400 || r.status === 422)) r = await istek(false); }
  catch (x) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'yapay zekâ akış', hata: (x && x.name) || 'ag' })); throw new MvHata('Yapay zekâya ulaşılamadı; biraz sonra tekrar deneyin', 502); }
  if (!r.ok || !r.body) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'yapay zekâ akış', durum: r.status })); throw new MvHata(r.status === 429 ? 'Yapay zekâ şu an yoğun; bir dakika sonra tekrar deneyin' : 'Yapay zekâ şu an cevap vermiyor; biraz sonra tekrar deneyin', 502); }
  const okur = r.body.pipeThrough(new TextDecoderStream()).getReader();
  let tampon = '', tum = '';
  for (;;) {
    const { value, done } = await okur.read(); if (done) break;
    tampon += value; let i;
    while ((i = tampon.indexOf('\n')) >= 0) {
      const satir = tampon.slice(0, i).trim(); tampon = tampon.slice(i + 1);
      if (!satir.startsWith('data:')) continue;
      const d = satir.slice(5).trim(); if (!d || d === '[DONE]') continue;
      let j = null; try { j = JSON.parse(d); } catch (x) { continue; }
      const c = j && j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
      if (typeof c === 'string' && c) { tum += c; await onParca(c); }
    }
  }
  tum = tum.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!tum) throw new MvHata('Yapay zekâ boş cevap verdi; tekrar deneyin', 502);
  return tum;
}
// Olay akışı cevabı (text/event-stream): yaz({ d }) parça, yaz({ son }) doğrulanmış cevap, yaz({ hata, s }) hata
function mvAkisYanit(cors, is) {
  const { readable, writable } = new TransformStream(), w = writable.getWriter(), enc = new TextEncoder();
  const yaz = o => w.write(enc.encode('data: ' + JSON.stringify(o) + '\n\n'));
  (async () => {
    try { await is(yaz); }
    catch (x) { if (!(x instanceof MvHata)) console.error(JSON.stringify({ tur: 'hata', konu: 'mevzuat akış', hata: String((x && x.message) || x).slice(0, 200) })); await yaz({ hata: x instanceof MvHata ? x.message : 'Beklenmeyen bir hata oldu; tekrar deneyin', s: (x && x.s) || 500 }).catch(() => { }); }
    finally { await w.close().catch(() => { }); }
  })();
  return new Response(readable, { headers: { ...cors, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } });
}
// Asistan geri bildirimleri: yalnız platform sahibi okur (GET /mevzuat/geri?gun=YYYY-MM-DD; kurs üyeliği denetiminden önce yönlendirilir)
async function mvGeriListe(req, env, url, cevap) {
  if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (!env.LINK) return cevap({ ok: true, liste: [], toplam: 0 });
  const gun = url.searchParams.get('gun'), l = await env.LINK.list({ prefix: 'mvgeri:' + (/^\d{4}-\d{2}-\d{2}$/.test(gun || '') ? gun : ''), limit: 200 });
  const anahtar = l.keys.map(k => k.name).sort().reverse().slice(0, 100), liste = [];
  for (const k of anahtar) { const v = await env.LINK.get(k); if (v) { try { liste.push(JSON.parse(v)); } catch (x) { } } }
  return cevap({ ok: true, liste: liste.sort((a, b) => String(b.z).localeCompare(String(a.z))), toplam: l.keys.length });
}
// ── Ortak derlem: platform sahibinin eklediği belgeler, belge durumları, duyurular, günlük takip (/mevzuat/ortak/*) ──
// Sitenin statik derlemi (veri/mevzuat) yalnız yayınla değişir; mevzuat sık değiştiği için platform sahibi panelden yeni resmî belge ekler,
// eskiyen belgeyi işaretler ve duyuru yazar. Bunlar yayın beklemeden bütün kurslarda (demo dâhil) görünür.
// KV: mortak (belge listesi), mortak:<id>, mortak:hepsi (aramaya giren parçalar + vektörler), mortak:durum, mortak:duyuru, mortak:takip
// Okuma herkese açık (resmî belge metinleri, kişisel veri yok; 2 dakika önbellekli); yazma yalnız sahip (sahipMi).
const MO = 'mortak', MO_TUR = ['yonetmelik', 'kanun', 'yonerge', 'teblig', 'kilavuz', 'yazi', 'bilgilendirme', 'form', 'program'];
const MO_DURUM = { degisti: 'Değişti', kalkti: 'Yürürlükten kalktı', taslak: 'Taslak / yürürlükte değil' };
const moOnbellek = u => new Request('https://onbellek.mdsinyal.invalid/mortak/' + u);
async function moOnbellekSil() { try { for (const u of ['ozet', 'hepsi']) await caches.default.delete(moOnbellek(u)); } catch (x) { } }
async function moOku(env, ad, uret) {  // Cache API (2 dk) → KV
  const k = moOnbellek(ad);
  try { const r = await caches.default.match(k); if (r) return await r.text(); } catch (x) { }
  const t = await uret();
  try { await caches.default.put(k, new Response(t, { headers: { 'Cache-Control': 'max-age=120' } })); } catch (x) { }
  return t;
}
async function mevzuatOrtak(req, env, url, yol, cevap) {
  const GET = req.method === 'GET', POST = req.method === 'POST';
  const acik = (t, ct = 'application/json') => new Response(t, { headers: { ...cevap.cors, 'Content-Type': ct, 'Cache-Control': 'public, max-age=120' } });
  if (!env.LINK) return cevap({ ok: false, hata: 'Depo yok' }, 500);
  if (yol === 'mevzuat/ortak' && GET) return acik(await moOku(env, 'ozet', async () => JSON.stringify({ ok: true, belgeler: await mvJson(env, MO, []), durum: await mvJson(env, MO + ':durum', {}), duyurular: await mvJson(env, MO + ':duyuru', []), sss: await mvJson(env, MO + ':sss', { kayitlar: [], gizli: [] }) })));
  if (yol === 'mevzuat/ortak/hepsi' && GET) return acik(await moOku(env, 'hepsi', async () => (await env.LINK.get(MO + ':hepsi')) || mvHepsiBos()));
  if (yol.startsWith('mevzuat/ortak/belge/') && GET) {
    const id = yol.slice(20); if (!mvId(id)) return cevap({ ok: false, hata: 'Belge bulunamadı' }, 404);
    const v = await mvJson(env, MO + ':' + id, null); if (!v) return cevap({ ok: false, hata: 'Belge bulunamadı' }, 404);
    return acik(JSON.stringify({ ok: true, belge: v }));
  }
  if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (yol === 'mevzuat/ortak/takip' && GET) return cevap({ ok: true, takip: await mvJson(env, MO + ':takip', {}), bulten: await mvJson(env, MO + ':bulten', { acik: false }) });
  // haftalık bülten: { acik: true|false } ya da { dene: true } (yalnız sahibin adresine örnek)
  if (yol === 'mevzuat/ortak/bulten' && POST) {
    const b = await req.json().catch(() => ({})), v = await mvJson(env, MO + ':bulten', { acik: false });
    if (b.dene) { const r = await mvBulten(env, { dene: true, zorla: true }); return cevap({ ok: true, ...r }); }
    v.acik = b.acik === true; await env.LINK.put(MO + ':bulten', JSON.stringify(v)); return cevap({ ok: true, bulten: v });
  }
  if (yol === 'mevzuat/ortak/takip-calistir' && POST) { await mvTakip(env, { hepsi: true }); return cevap({ ok: true, takip: await mvJson(env, MO + ':takip', {}) }); }
  if (!POST) return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
  if (yol === 'mevzuat/ortak/yukle') {
    if (mvSinirAsti('oy', 20)) return cevap({ ok: false, hata: 'Çok sık yükleme yapıldı; bir dakika sonra tekrar deneyin' }, 429);
    const q = url.searchParams, tur = MO_TUR.includes(q.get('tur')) ? q.get('tur') : 'yazi', kaynak = /^https:\/\/[^\s<>"]{4,300}$/.test(q.get('kaynak') || '') ? q.get('kaynak') : '';
    const belge = await mvBelgeYukle(req, env, url, MO, { sinir: 'l:ortak', ek: { tur, kaynak, kurum: mvTemiz(q.get('kurum'), 80) } });
    await moOnbellekSil(); return cevap({ ok: true, belge });
  }
  const b = await req.json().catch(() => null); if (!b) return cevap({ ok: false, hata: 'Gecersiz istek' }, 400);
  if (yol === 'mevzuat/ortak/sil') {
    const id = String(b.id || ''), dizin = await mvJson(env, MO, []);
    if (!dizin.some(x => x.id === id)) return cevap({ ok: false, hata: 'Belge bulunamadı' }, 404);
    const ham = await env.LINK.get(MO + ':hepsi'); if (ham) await env.LINK.put(MO + ':hepsi', mvHepsiSil(ham, id));
    await env.LINK.put(MO, JSON.stringify(dizin.filter(x => x.id !== id))); await env.LINK.delete(MO + ':' + id);
    await moOnbellekSil(); return cevap({ ok: true });
  }
  // belge durumu: { belge: 'mtsk' | <eklenen belge id>, durum: degisti|kalkti|taslak|'' (temizle), not, yerine }
  if (yol === 'mevzuat/ortak/durum') {
    const id = String(b.belge || ''); if (!/^[a-z0-9-]{2,30}$/.test(id)) return cevap({ ok: false, hata: 'Belge kimliği geçersiz' }, 400);
    const d = await mvJson(env, MO + ':durum', {});
    if (!b.durum) delete d[id];
    else { if (!MO_DURUM[b.durum]) return cevap({ ok: false, hata: 'Durum geçersiz' }, 400); d[id] = { durum: b.durum, not: mvTemiz(b.not, 400), yerine: /^[a-z0-9-]{2,30}$/.test(b.yerine || '') ? b.yerine : '', tarih: new Date().toISOString().slice(0, 10) }; }
    await env.LINK.put(MO + ':durum', JSON.stringify(d)); await moOnbellekSil(); return cevap({ ok: true, durum: d });
  }
  // duyuru: { id? (düzenle), baslik, metin, bag?, sil? }; en yeni 30 duyuru tutulur
  if (yol === 'mevzuat/ortak/duyuru') {
    let l = await mvJson(env, MO + ':duyuru', []);
    if (b.sil) l = l.filter(x => x.id !== b.sil);
    else {
      const baslik = mvTemiz(b.baslik, 120), metin = mvKes(String(b.metin || '').replace(/[<>]/g, ' '), 800), bag = /^https:\/\/[^\s<>"]{4,300}$/.test(b.bag || '') ? b.bag : '';
      if (!baslik) return cevap({ ok: false, hata: 'Duyurunun başlığını yazın' }, 400);
      const yapilacaklar = (Array.isArray(b.yapilacaklar) ? b.yapilacaklar : String(b.yapilacaklar || '').split('\n')).map(x => mvKes(String(x || '').replace(/[<>]/g, ' '), 300)).filter(Boolean).slice(0, 8);
      const belge = /^[a-z0-9-]{2,30}$/.test(b.belge || '') ? b.belge : '', kimi = mvTemiz(b.kimi, 120), yururluk = /^\d{4}-\d{2}-\d{2}$/.test(b.yururluk || '') ? b.yururluk : '';
      const x = { id: b.id && l.some(y => y.id === b.id) ? b.id : Date.now().toString(36), baslik, metin, bag, yapilacaklar, belge, kimi, yururluk, tarih: new Date().toISOString().slice(0, 10) };
      l = [x, ...l.filter(y => y.id !== x.id)].slice(0, 30);
    }
    await env.LINK.put(MO + ':duyuru', JSON.stringify(l)); await moOnbellekSil(); return cevap({ ok: true, duyurular: l });
  }
  // "Bu değişiklik kursları nasıl etkiler" taslağı: eklenen belgenin metninden yapay zekâ özet, yapılacaklar ve kimi ilgilendirdiğini çıkarır.
  // Taslak yalnız sahibe döner; sahip düzenleyip duyuru olarak yayınlar (otomatik yayın yok).
  if (yol === 'mevzuat/ortak/etki') {
    if (!env.LLM_KEY) return cevap({ ok: false, kurulu: false, hata: 'Yapay zekâ henüz bağlı değil' }, 503);
    const id = String(b.belge || ''), kayit = mvId(id) ? await mvJson(env, MO + ':' + id, null) : null;
    const metin = kayit ? kayit.metin : mvKes(String(b.metin || ''), MV.ozetKar);
    if (!metin || metin.length < 40) return cevap({ ok: false, hata: 'Belge ya da metin bulunamadı' }, 404);
    if (mvSinirAsti('l:ortak', 10)) return cevap({ ok: false, hata: 'Çok sık istek; bir dakika sonra tekrar deneyin' }, 429);
    const ham = await mvLlm(env, [{ role: 'system', content: MV_ETKI_ISTEM }, { role: 'user', content: (kayit ? 'Belge: ' + kayit.ad + (kayit.tarih ? ' (' + kayit.tarih + ')' : '') + '\n\n' : '') + 'Metin:\n' + metin.slice(0, MV.ozetKar) }], 900, { json: true });
    let j = null; try { const a = ham.indexOf('{'), z = ham.lastIndexOf('}'); j = JSON.parse(ham.slice(a, z + 1)); } catch (x) { j = null; }
    if (!j || typeof j.ozet !== 'string') return cevap({ ok: false, hata: 'Taslak çıkarılamadı; tekrar deneyin' }, 502);
    const liste = l => (Array.isArray(l) ? l : []).map(x => mvKes(String(x || ''), 300)).filter(Boolean).slice(0, 8);
    return cevap({ ok: true, taslak: { baslik: mvKes(String(j.baslik || (kayit && kayit.ad) || ''), 120), metin: mvKes(j.ozet, 800), yapilacaklar: liste(j.yapilacaklar), kimi: mvKes(String(j.kimi || ''), 120), yururluk: mvKes(String(j.yururluk || ''), 120), belge: kayit ? kayit.id : '', bag: (kayit && kayit.kaynak) || '' } });
  }
  // Sık sorulanlar (platform): { id?, soru, esler[], kisa, ayrinti[], adimlar[], dikkat, dayanak: ['mtsk: Madde 7', …], yerine? (gizlenecek hazır cevap kimliği) }
  // Aramaya girer (parça b = 'sss:<id>', gömülü); dayanaklar içindekiler listesiyle doğrulanır (listede olmayan madde kabul edilmez).
  if (yol === 'mevzuat/ortak/sss') {
    const k = moSssDogrula(b, (await mvIcindekiler()).set); if (k.hata) return cevap({ ok: false, hata: k.hata }, 400);
    const v = await mvJson(env, MO + ':sss', { kayitlar: [], gizli: [] }), id = b.id && v.kayitlar.some(x => x.id === b.id) ? b.id : 's' + Date.now().toString(36);
    const kayit = { id, ...k.kayit, tarih: new Date().toISOString().slice(0, 10) };
    const metin = moSssMetin(kayit), bayt = await mvGom(env, [MEVZUAT_GOM.onekBelge + 'Sık sorulan\n' + metin]);
    let ham = await env.LINK.get(MO + ':hepsi'); if (ham) ham = mvHepsiSil(ham, 'sss:' + id);
    ham = mvHepsiEkle(ham, [{ b: 'sss:' + id, t: metin }], bayt);
    v.kayitlar = [kayit, ...v.kayitlar.filter(x => x.id !== id)].slice(0, 500);
    if (/^[a-z0-9-]{3,60}$/.test(b.yerine || '') && !v.gizli.includes(b.yerine)) v.gizli.push(b.yerine);
    await env.LINK.put(MO + ':hepsi', ham); await env.LINK.put(MO + ':sss', JSON.stringify(v)); await moOnbellekSil();
    return cevap({ ok: true, kayit, gizli: v.gizli });
  }
  if (yol === 'mevzuat/ortak/sss-sil') {
    const v = await mvJson(env, MO + ':sss', { kayitlar: [], gizli: [] }), id = String(b.id || '');
    if (!v.kayitlar.some(x => x.id === id)) return cevap({ ok: false, hata: 'Kayıt bulunamadı' }, 404);
    const ham = await env.LINK.get(MO + ':hepsi'); if (ham) await env.LINK.put(MO + ':hepsi', mvHepsiSil(ham, 'sss:' + id));
    v.kayitlar = v.kayitlar.filter(x => x.id !== id); await env.LINK.put(MO + ':sss', JSON.stringify(v)); await moOnbellekSil();
    return cevap({ ok: true });
  }
  // mevcut (statik derlemdeki) hazır cevabı gizle / geri aç: { id, gizle: true|false }
  if (yol === 'mevzuat/ortak/sss-gizle') {
    const id = String(b.id || ''); if (!/^[a-z0-9-]{3,60}$/.test(id)) return cevap({ ok: false, hata: 'Kimlik geçersiz' }, 400);
    const v = await mvJson(env, MO + ':sss', { kayitlar: [], gizli: [] });
    v.gizli = b.gizle === false ? v.gizli.filter(x => x !== id) : [...new Set([...v.gizli, id])];
    await env.LINK.put(MO + ':sss', JSON.stringify(v)); await moOnbellekSil(); return cevap({ ok: true, gizli: v.gizli });
  }
  return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
}
// SSS kaydı doğrulama ve arama metni (statik SSS parçalarıyla aynı biçim: "Soru: …\n(Diğer söylenişler: …)\nCevap: …")
function moSssDogrula(b, set) {
  const satirlar = (l, n, u) => (Array.isArray(l) ? l : String(l || '').split('\n')).map(x => mvKes(String(x || '').replace(/[<>]/g, ' '), u)).filter(Boolean).slice(0, n);
  const soru = mvKes(String(b.soru || '').replace(/[<>]/g, ' '), 200), kisa = mvKes(String(b.kisa || '').replace(/[<>]/g, ' '), 600);
  if (soru.length < 5) return { hata: 'Soruyu yazın' };
  if (kisa.length < 5) return { hata: 'Kısa cevabı yazın' };
  const dayanak = [];
  for (const d of satirlar(b.dayanak, 6, 200)) {
    const k = d.replace(/\s+—.*$/, '').replace(/^([a-z0-9-]+)\s*:\s*/, '$1: ').trim();
    if (!set || !set.has(k)) return { hata: 'Dayanak içindekiler listesinde yok: ' + d };
    const [belge, m] = k.split(': '); dayanak.push({ belge, m });
  }
  if (!dayanak.length) return { hata: 'En az bir dayanak madde seçin' };
  return { kayit: { soru, esler: satirlar(b.esler, 6, 200), kisa, ayrinti: satirlar(b.ayrinti, 8, 400), adimlar: satirlar(b.adimlar, 8, 300), dikkat: mvKes(String(b.dikkat || '').replace(/[<>]/g, ' '), 400), dayanak, konu: mvTemiz(b.konu, 60) } };
}
const moSssMetin = k => ['Soru: ' + k.soru, k.esler.length ? '(Diğer söylenişler: ' + k.esler.join(' / ') + ')' : '', 'Cevap: ' + k.kisa, ...k.ayrinti, ...k.adimlar.map((x, i) => (i + 1) + '. ' + x), k.dikkat ? 'Dikkat: ' + k.dikkat : '', 'Dayanak: ' + k.dayanak.map(d => d.belge + ' ' + d.m).join(', ')].filter(Boolean).join('\n');
// Haftalık bülten (pazartesi, cron): son 7 günün duyuruları, eklenen belgeleri ve Resmî Gazete başlıkları, onaylı e-posta adresi olan
// kurslara gider. Sahip panelden açar (varsayılan kapalı); yeni bir şey yoksa gönderilmez. Ücretsiz e-posta kotası için en çok 80 kurs.
async function mvBulten(env, { dene = false, zorla = false, simdi = new Date() } = {}) {
  const S = epSaglayici(env); if (!S || !env.LINK) return { gonderilen: 0, neden: 'e-posta servisi yok' };
  const v = await mvJson(env, MO + ':bulten', { acik: false });
  if (!dene && (!v.acik || (v.son && Date.now() - Date.parse(v.son) < 6 * 864e5))) return { gonderilen: 0, neden: 'kapalı ya da bu hafta gönderildi' };
  const sinir = new Date(simdi.getTime() - 7 * 864e5).toISOString().slice(0, 10);
  const duy = (await mvJson(env, MO + ':duyuru', [])).filter(x => x.tarih >= sinir), bel = (await mvJson(env, MO, [])).filter(x => String(x.eklenme).slice(0, 10) >= sinir), rg = ((await mvJson(env, MO + ':takip', {})).rg || []).filter(x => x.tarih >= sinir);
  if (!duy.length && !bel.length && !rg.length && !zorla) return { gonderilen: 0, neden: 'bu hafta yeni bir şey yok' };
  const k = epKacis, bol = (bas, ic) => ic ? `<h2 style="margin:20px 0 8px;font-size:16px;color:#0f1729">${bas}</h2>${ic}` : '';
  const govde = bol('Güncel değişiklikler', duy.map(x => `<div style="margin:0 0 12px"><b>${k(x.baslik)}</b>${x.yururluk ? ` <span style="color:#a45a00">· yürürlük ${k(x.yururluk)}</span>` : ''}<div style="color:#374151">${k(x.metin || '')}</div>${(x.yapilacaklar || []).length ? '<ul style="margin:6px 0 0;padding-left:18px">' + x.yapilacaklar.map(y => `<li>${k(y)}</li>`).join('') + '</ul>' : ''}</div>`).join(''))
    + bol('mdSinyal’e eklenen resmî belgeler', bel.length ? '<ul style="padding-left:18px;margin:0">' + bel.map(x => `<li>${k(x.ad)}${x.tarih ? ' (' + k(x.tarih) + ')' : ''}</li>`).join('') + '</ul>' : '')
    + bol('Resmî Gazete’de ilgili başlıklar', rg.length ? '<ul style="padding-left:18px;margin:0">' + rg.map(x => `<li>${k(x.tarih)}: <a href="${k(x.adres)}">${k(x.baslik)}</a></li>`).join('') + '</ul>' : '')
    + `<p style="margin:20px 0 0"><a href="https://mdsinyal.com/#/mevzuat" style="background:#ffc21a;color:#0f1729;padding:10px 16px;border-radius:10px;font-weight:700;text-decoration:none">Mevzuat asistanını aç</a></p>`;
  const html = epKabuk('Bu hafta mevzuatta', govde || '<p>Bu hafta yeni bir değişiklik yok.</p>', 'Bu e-postayı mdSinyal kullanan kursunuzun onaylı adresine gönderiyoruz.', 'Sürücü kursunuzu ilgilendiren değişiklikler');
  const metin = 'Bu hafta mevzuatta\n\n' + duy.map(x => '- ' + x.baslik + (x.metin ? ': ' + x.metin : '')).join('\n') + (bel.length ? '\n\nEklenen belgeler:\n' + bel.map(x => '- ' + x.ad).join('\n') : '') + '\n\nhttps://mdsinyal.com/#/mevzuat';
  if (dene) { if (!env.SAHIP_EPOSTA) return { gonderilen: 0, neden: 'SAHIP_EPOSTA tanımlı değil' }; await S.gonder({ kime: [env.SAHIP_EPOSTA], konu: 'Örnek: mdSinyal mevzuat bülteni', html, metin }); return { gonderilen: 1, neden: 'örnek sahibin adresine gitti' }; }
  const l = await env.LINK.list({ prefix: 'epadres:', limit: 200 }); let n = 0;
  for (const key of l.keys) {
    if (n >= 80) break;
    const adr = (await mvJson(env, key.name, [])).filter(x => x.onay).map(x => x.a); if (!adr.length) continue;
    try { await S.gonder({ kime: adr.slice(0, 3), konu: 'mdSinyal · Bu hafta mevzuatta', html, metin }); n++; } catch (x) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'bülten', hata: String((x && x.message) || x).slice(0, 120) })); }
  }
  v.son = new Date().toISOString(); v.sayi = n; await env.LINK.put(MO + ':bulten', JSON.stringify(v));
  return { gonderilen: n };
}
// Günlük takip (cron): derlemin kaynak adresleri (site: veri/mevzuat/kaynaklar.json) değişmiş mi (ETag / Last-Modified / boyut) ve
// Resmî Gazete fihristinde ilgili başlık var mı. Ücretsiz planda çağrı başına 50 alt istek: her gün adreslerin yarısı denetlenir.
// Değişiklik ve yeni başlık KV mortak:takip'e yazılır (1 yazma); SAHIP_EPOSTA kuruluysa sahibe e-posta gider.
const RG_ANAHTAR = ['motorlu taşıt sürücüleri', 'karayolları trafik', 'özel öğretim kurumları', 'sürücü', 'harçlar kanunu', 'değerli kağıt', 'trafik', 'millî eğitim bakanlığı özel'];
// windows-1254 (Resmî Gazete fihristi): Türkçe harfler dışında Latin-1 ile aynı
const W1254 = { 0xD0: 'Ğ', 0xDD: 'İ', 0xDE: 'Ş', 0xF0: 'ğ', 0xFD: 'ı', 0xFE: 'ş' };
const w1254 = u => { let o = ''; for (let i = 0; i < u.length; i++) { const c = u[i]; o += W1254[c] || String.fromCharCode(c); } return o; };
async function mvTakip(env, { hepsi = false, simdi = new Date() } = {}) {
  if (!env.LINK) return null;
  const t = await mvJson(env, MO + ':takip', {}), kay = t.kaynak || {}, gun = simdi.toISOString().slice(0, 10), yeni = [];
  let liste = [];
  try { const r = await fetch('https://mdsinyal.com/veri/mevzuat/kaynaklar.json', { cf: { cacheTtl: 3600 } }); if (r.ok) liste = (await r.json()).kaynaklar || []; } catch (x) { }
  const gunNo = Math.floor(simdi.getTime() / 864e5), secili = liste.filter((x, i) => hepsi ? i < 40 : i % 2 === gunNo % 2).slice(0, 40);
  for (const k of secili) {
    let iz = null;
    try {
      let r = await fetch(k.adres, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
      if (r.status === 405 || r.status === 403) { r = await fetch(k.adres, { redirect: 'follow', signal: AbortSignal.timeout(8000) }); try { r.body && r.body.cancel(); } catch (x) { } }
      iz = r.ok ? { e: r.headers.get('etag') || '', l: r.headers.get('last-modified') || '', b: r.headers.get('content-length') || '' } : { hata: r.status };
    } catch (x) { iz = { hata: 'ulasilamadi' }; }
    const once = kay[k.id] || null;
    const ozel = x => x && !x.hata ? (x.e || '') + '|' + (x.l || '') + '|' + (x.b || '') : '';
    const degisti = once && once.iz && ozel(once.iz) && ozel(iz) && ozel(iz) !== ozel(once.iz);
    kay[k.id] = { ad: k.ad || k.id, adres: k.adres, iz, son: gun, ...(once && once.degisti ? { degisti: once.degisti } : {}) };
    if (degisti) { kay[k.id].degisti = gun; yeni.push({ tur: 'kaynak', id: k.id, ad: k.ad || k.id, adres: k.adres }); }
    else if (iz && iz.hata && !(once && once.iz && once.iz.hata)) yeni.push({ tur: 'erisilemedi', id: k.id, ad: k.ad || k.id, adres: k.adres, hata: iz.hata });
  }
  // Resmî Gazete: bugünün fihristi (ana sayı ve 2 mükerrer)
  const rg = t.rg || [];
  const y = gun.slice(0, 4), a = gun.slice(5, 7), g = gun.slice(8, 10);
  let rgDurum = 'okundu';
  for (const ek of ['', 'M1', 'M2']) {
    try {
      const r = await fetch(`https://www.resmigazete.gov.tr/eskiler/${y}/${a}/${y}${a}${g}${ek}.htm`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok || !/html/i.test(r.headers.get('content-type') || '')) { if (!ek) rgDurum = r.status === 404 ? 'yayım yok' : 'ulaşılamadı (' + r.status + ')'; break; }
      const metin = w1254(new Uint8Array(await r.arrayBuffer()));
      for (const m of metin.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
        const baslik = m[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[–—-]+\s*/, '');
        if (!baslik || /ilânları|ilanları|döviz kurları/i.test(baslik)) continue;
        const kb = baslik.toLocaleLowerCase('tr-TR'), es = RG_ANAHTAR.filter(w => kb.includes(w)); if (!es.length) continue;
        const adres = /^https?:/.test(m[1]) ? m[1] : `https://www.resmigazete.gov.tr/eskiler/${y}/${a}/${m[1]}`;
        if (!rg.some(x => x.adres === adres)) { const x = { tarih: gun, baslik: baslik.slice(0, 200), adres, anahtar: es }; rg.unshift(x); yeni.push({ tur: 'rg', ...x }); }
      }
    } catch (x) { if (!ek) rgDurum = 'ulaşılamadı'; break; }
  }
  const sonuc = { son: new Date().toISOString(), rgSon: { tarih: gun, durum: rgDurum }, kaynak: kay, rg: rg.slice(0, 60), yeni: [...yeni, ...(t.yeni || [])].slice(0, 60) };
  await env.LINK.put(MO + ':takip', JSON.stringify(sonuc));
  const S = typeof epSaglayici === 'function' ? epSaglayici(env) : null;
  if (yeni.length && S && env.SAHIP_EPOSTA) {
    const satir = yeni.map(x => x.tur === 'rg' ? `Resmî Gazete (${x.tarih}): ${x.baslik} — ${x.adres}` : x.tur === 'kaynak' ? `Kaynak değişti: ${x.ad} — ${x.adres}` : `Kaynağa ulaşılamadı (${x.hata}): ${x.ad} — ${x.adres}`);
    try { await S.gonder({ kime: [env.SAHIP_EPOSTA], konu: 'mdSinyal mevzuat takibi · ' + yeni.length + ' yeni bildirim', metin: 'Bugünkü mevzuat takibi:\n\n' + satir.join('\n') + '\n\nAyrıntı ve belge ekleme: mdSinyal Yönetim › Destek › Mevzuat' }); } catch (x) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'takip e-postası' })); }
  }
  return sonuc;
}
// Belge yükleme (kurs yazısı ya da platformun ortak derleme eklediği belge): metni çıkarır, parçalar, gömer, özetler, KV'ye yazar (3 yazma)
// on: KV öneki (mbelge:<kurs> ya da mortak); sinir: dakikalık özet sınırı anahtarı; ek: { tur, kaynak, kurum } (ortak belge bilgileri)
async function mvBelgeYukle(req, env, url, on, { sinir, ek = {} }) {
  const ct = String(req.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase(), tur = MV_TUR[ct];
  if (!tur) throw new MvHata('Bu dosya türü desteklenmiyor. PDF, Word (DOCX), fotoğraf (JPEG/PNG) yükleyin ya da metni yapıştırın', 415);
  if (+req.headers.get('Content-Length') > MV.dosya) throw new MvHata('Dosya en çok 10 MB olabilir', 413);
  const dizin = await mvJson(env, on, []);
  if (dizin.length >= MV.belge) throw new MvHata('En çok ' + MV.belge + ' belge saklanabilir; önce eski belgeleri silin', 409);
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) throw new MvHata('Dosya boş', 400);
  if (buf.byteLength > MV.dosya) throw new MvHata('Dosya en çok 10 MB olabilir', 413);
  const q = url.searchParams, tarih = /^\d{4}-\d{2}-\d{2}$/.test(q.get('tarih') || '') ? q.get('tarih') : '', sayi = mvTemiz(q.get('sayi'), 80);
  let metin = '';
  if (tur === 'metin') metin = new TextDecoder().decode(buf);
  else if (tur === 'resim') {
    if (buf.byteLength > MV.resim) throw new MvHata('Fotoğraf çok büyük; daha yakından ve tek sayfa çekin ya da metni yapıştırın', 413);
    if (!env.LLM_KEY) throw new MvHata('Fotoğraf için yapay zekâ bağlı değil; metni yapıştırın', 503, { kurulu: false });
    metin = await mvLlm(env, [{ role: 'user', content: [{ type: 'text', text: MV_RESIM_ISTEM }, { type: 'image_url', image_url: { url: 'data:' + ct + ';base64,' + mvB64(new Uint8Array(buf)) } }] }], 3000);
    if (/^BOS\.?$/i.test(metin)) metin = '';
  } else {
    if (!env.AI || !env.AI.toMarkdown) throw new MvHata('Belge okuma servisi bağlı değil; metni yapıştırın', 503);
    let r; try { r = (await env.AI.toMarkdown([{ name: 'belge.' + tur, blob: new Blob([buf], { type: ct }) }]))[0]; } catch (x) { r = null; console.warn(JSON.stringify({ tur: 'uyari', konu: 'toMarkdown', hata: String((x && x.message) || x).slice(0, 160) })); }
    metin = r && r.format !== 'error' ? mvMdTemizle(r.data) : '';
  }
  metin = metin.replace(/\u0000/g, '').trim();
  if (metin.replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g, '').length < 20) throw new MvHata('Bu belgenin metni okunamadı (taranmış olabilir); metni yapıştırın', 422);
  metin = metin.slice(0, MV.metin);
  const ad = mvTemiz(q.get('ad'), 150) || mvTemiz((metin.split('\n').find(s => s.trim()) || '').replace(/^#+\s*/, ''), 100);
  const parcalar = mvParcala(metin);
  const bayt = await mvGom(env, parcalar.map(t => MEVZUAT_GOM.onekBelge + ad + '\n' + t));
  let ozet = '';
  if (env.LLM_KEY && !mvSinirAsti(sinir, 10)) { try { ozet = await mvOzetle(env, ad, metin); } catch (x) { ozet = ''; } }
  const id = Date.now().toString(36) + [...crypto.getRandomValues(new Uint8Array(4))].map(x => (x % 36).toString(36)).join('');
  const belge = { id, ad, tarih, sayi, tur: ek.tur || 'yazi', ozet, parca: parcalar.length, eklenme: new Date().toISOString(), ...(ek.kaynak ? { kaynak: ek.kaynak } : {}), ...(ek.kurum ? { kurum: ek.kurum } : {}) };
  const hepsi = mvHepsiEkle(await env.LINK.get(on + ':hepsi'), parcalar.map(t => ({ b: id, t })), bayt);
  if (hepsi.length > 20e6) throw new MvHata('Belge arşivi doldu; önce eski belgeleri silin', 409);  // KV değeri en çok 25 MiB bayt; sınır karakter: Türkçe harf 2, '…' 3 bayt
  await env.LINK.put(on + ':' + id, JSON.stringify({ ...belge, metin, parcalar }));
  await env.LINK.put(on + ':hepsi', hepsi);
  dizin.unshift(belge); await env.LINK.put(on, JSON.stringify(dizin));
  return belge;
}
const mvJson = async (env, k, v0) => { try { const v = await env.LINK.get(k); return v ? JSON.parse(v) : v0; } catch (x) { return v0; } };
async function mevzuat(req, env, url, yol, cevap, o) {
  try { return await mevzuatUc(req, env, url, yol, cevap, o); }
  catch (x) { if (x instanceof MvHata) return cevap({ ok: false, ...x.ek, hata: x.message }, x.s); console.error(JSON.stringify({ tur: 'hata', konu: 'mevzuat', yol, hata: String((x && x.message) || x).slice(0, 200) })); return cevap({ ok: false, hata: 'Beklenmeyen bir hata oldu; tekrar deneyin' }, 500); }
}
async function mevzuatUc(req, env, url, yol, cevap, { gercek, rol, kursId, origin }) {
  const POST = req.method === 'POST', GET = req.method === 'GET';
  // sorgu gömme: demo (kimliksiz, yalnız sitenin adresinden, IP başına dakikada 30) ve personel
  if (yol === 'mevzuat/gom') {
    if (!POST) return cevap({ ok: false }, 405);
    if (!gercek && !IZINLI.includes(origin)) return cevap({ ok: false, hata: 'Izin yok' }, 403);
    if (gercek ? mvSinirAsti('g:' + kursId, 120) : mvSinirAsti('gi:' + (req.headers.get('CF-Connecting-IP') || ''), 30)) return cevap({ ok: false, hata: 'Çok sık arama yapıldı; bir dakika sonra tekrar deneyin' }, 429);
    const b = await req.json().catch(() => null), metin = b && typeof b.metin === 'string' ? b.metin.trim() : '';
    if (!metin) return cevap({ ok: false, hata: 'Aranacak metin boş' }, 400);
    if (metin.length > MV.gomKar) return cevap({ ok: false, hata: 'Arama metni en çok ' + MV.gomKar + ' karakter olabilir' }, 400);
    // site motoru (js/mevzuat-ara.js) dizin.json'daki sorgu önekini kendisi ekler; önek zaten varsa ikinci kez eklenmez
    const girdi = MEVZUAT_GOM.onekSorgu && metin.startsWith(MEVZUAT_GOM.onekSorgu) ? metin : MEVZUAT_GOM.onekSorgu + metin;
    return cevap({ ok: true, v: mvB64(await mvGom(env, [girdi])) });
  }
  if (yol.startsWith('mevzuat/olcum/')) {
    if (!POST || !(await mvOlcumIzin(req, env))) return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
    if (mvSinirAsti('olcum', 120)) return cevap({ ok: false, hata: 'Çok sık istek' }, 429);
    const b = await req.json().catch(() => null);
    if (!b) return cevap({ ok: false, hata: 'Gecersiz istek' }, 400);
    if (yol === 'mevzuat/olcum/anla') return cevap({ ok: true, ...(await mvAnla(env, mvSoru(b))) });
    if (yol === 'mevzuat/olcum/cevapla' && b.akis === true) {  // canlı akış denemesi (sitedeki yol ile aynı)
      const h = await mvCevapHazirla(b, +b.istem || 0); if (h.hazir) return cevap({ ok: true, ...h.hazir });
      return mvAkisYanit(cevap.cors, async yaz => { const o = mvCevapCoz(await mvLlmAkis(env, h.mesajlar, h.enCok, { json: true }, d => yaz({ d })), h.n); await mvCevapSakla(h, o); await yaz({ son: { ok: true, ...o } }); });
    }
    if (yol === 'mevzuat/olcum/cevapla') return cevap({ ok: true, ...(await mvCevapla(env, b, +b.istem || 0)) });
    return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
  }
  if (!gercek || !PERSONEL.includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  if (!env.LINK) return cevap({ ok: false, hata: 'Depo yok' }, 500);
  const on = 'mbelge:' + kursId, buro = rol === 'mudur' || rol === 'sekreter';
  if (yol === 'mevzuat/belgeler' && GET) return cevap({ ok: true, liste: await mvDizin(env, kursId) });
  // akış olarak aktarılır: büyük değer çözülüp yeniden kodlanmaz (işlemci sınırı; 3,5 MB'ta ~12 ms)
  if (yol === 'mevzuat/hepsi' && GET) return new Response((await env.LINK.get(on + ':hepsi', { type: 'stream' })) || mvHepsiBos(), { headers: { ...cevap.cors, 'Content-Type': 'application/json' } });
  if (yol.startsWith('mevzuat/belge/') && GET) {
    const id = yol.slice(14); if (!mvId(id)) return cevap({ ok: false, hata: 'Belge bulunamadı' }, 404);
    const v = await env.LINK.get(on + ':' + id); if (!v) return cevap({ ok: false, hata: 'Belge bulunamadı' }, 404);
    return cevap({ ok: true, belge: JSON.parse(v) });
  }
  // kaydedilen maddeler (kurs başına): GET liste, POST { b, m, ad, not?, sil? } — KV mfav:<kurs> (en çok 200)
  if (yol === 'mevzuat/favori') {
    const fk = 'mfav:' + kursId, l = await mvJson(env, fk, []);
    if (GET) return cevap({ ok: true, liste: l });
    if (mvSinirAsti('fv:' + kursId, 30)) return cevap({ ok: false, hata: 'Çok sık işlem; bir dakika sonra tekrar deneyin' }, 429);
    const bb = await req.json().catch(() => null); if (!bb) return cevap({ ok: false, hata: 'Gecersiz istek' }, 400);
    const anahtar = String(bb.b || '').slice(0, 40) + '|' + String(bb.m || '').slice(0, 120);
    if (!/^[a-z0-9-]{2,40}\|/.test(anahtar)) return cevap({ ok: false, hata: 'Madde geçersiz' }, 400);
    let yeni = l.filter(x => x.k !== anahtar);
    if (!bb.sil) yeni = [{ k: anahtar, b: anahtar.split('|')[0], m: anahtar.split('|')[1], ad: mvTemiz(bb.ad, 160), not: mvTemiz(bb.not, 500), kim: rol, tarih: new Date().toISOString().slice(0, 10) }, ...yeni].slice(0, 200);
    await env.LINK.put(fk, JSON.stringify(yeni)); return cevap({ ok: true, liste: yeni });
  }
  if (!POST) return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
  if (yol === 'mevzuat/yukle') {
    if (!buro) return cevap({ ok: false, hata: 'Belgeyi yalnız kurs müdürü ve ön büro yükler' }, 403);
    if (mvSinirAsti('y:' + kursId, 20)) return cevap({ ok: false, hata: 'Çok sık yükleme yapıldı; bir dakika sonra tekrar deneyin' }, 429);
    const belge = await mvBelgeYukle(req, env, url, on, { sinir: 'l:' + kursId });
    return cevap({ ok: true, belge });
  }
  const b = await req.json().catch(() => null);
  if (!b) return cevap({ ok: false, hata: 'Gecersiz istek' }, 400);
  if (yol === 'mevzuat/sil') {
    if (rol !== 'mudur') return cevap({ ok: false, hata: 'Belgeyi yalnız kurs müdürü siler' }, 403);
    const id = String(b.id || ''), dizin = await mvDizin(env, kursId);
    if (!dizin.some(x => x.id === id)) return cevap({ ok: false, hata: 'Belge bulunamadı' }, 404);
    const ham = await env.LINK.get(on + ':hepsi');
    if (ham) await env.LINK.put(on + ':hepsi', mvHepsiSil(ham, id));
    await env.LINK.put(on, JSON.stringify(dizin.filter(x => x.id !== id)));
    await env.LINK.delete(on + ':' + id);
    return cevap({ ok: true });
  }
  if (yol === 'mevzuat/ozetle' || yol === 'mevzuat/cevapla') {
    if (!env.LLM_KEY) return cevap({ ok: false, kurulu: false, hata: 'Yapay zekâ henüz bağlı değil' }, 503);
    if (yol === 'mevzuat/ozetle') {
      let metin = typeof b.metin === 'string' ? b.metin.trim() : '', kayit = null;
      if (b.id) { const v = mvId(String(b.id)) ? await env.LINK.get(on + ':' + String(b.id)) : null; if (!v) return cevap({ ok: false, hata: 'Belge bulunamadı' }, 404); kayit = JSON.parse(v); metin = kayit.metin || ''; }
      if (!metin) return cevap({ ok: false, hata: 'Özetlenecek metin boş' }, 400);
      if (!kayit && metin.length > MV.metin) return cevap({ ok: false, hata: 'Metin çok uzun' }, 413);
      if (mvSinirAsti('l:' + kursId, 10)) return cevap({ ok: false, hata: 'Çok sık istek yapıldı; bir dakika sonra tekrar deneyin' }, 429);
      const ozet = await mvOzetle(env, kayit ? kayit.ad : '', metin);
      // kayıtlı belgenin özeti saklanır (ön büro ve müdür; 2 KV yazması)
      if (kayit && buro) {
        kayit.ozet = ozet; await env.LINK.put(on + ':' + kayit.id, JSON.stringify(kayit));
        const dizin = await mvDizin(env, kursId), x = dizin.find(y => y.id === kayit.id); if (x) { x.ozet = ozet; await env.LINK.put(on, JSON.stringify(dizin)); }
      }
      return cevap({ ok: true, ozet });
    }
    if (mvSinirAsti('l:' + kursId, 10)) return cevap({ ok: false, hata: 'Çok sık istek yapıldı; bir dakika sonra tekrar deneyin' }, 429);
    if (await mvGunlukAsti(kursId)) return cevap({ ok: false, hata: 'Bugünkü yapay zekâ sınırı doldu; yarın tekrar deneyin. Arama sonuçları çalışmaya devam eder' }, 429);
    if (b.akis !== true) return cevap({ ok: true, ...(await mvCevapla(env, b)) });
    // akış: doğrulama ve önbellek önce (hata düz JSON döner), sonra parça parça
    const h = await mvCevapHazirla(b);
    if (h.hazir) return cevap({ ok: true, ...h.hazir });
    if (!env.LLM_KEY) return cevap({ ok: false, kurulu: false, hata: 'Yapay zekâ henüz bağlı değil' }, 503);
    return mvAkisYanit(cevap.cors, async yaz => {
      const o = mvCevapCoz(await mvLlmAkis(env, h.mesajlar, h.enCok, { json: true }, d => yaz({ d })), h.n);
      await mvCevapSakla(h, o);
      await yaz({ son: { ok: true, ...o } });
    });
  }
  // asistan geri bildirimi: { soru, iyi: true|false, not?, kaynaklar?: [etiket] } → KV mvgeri:<gün>:<rastgele> (90 gün), kurs başı günde 30
  if (yol === 'mevzuat/geri') {
    const g = new Date().toISOString().slice(0, 10);
    if (mvSinirAsti('gb:' + kursId, 5)) return cevap({ ok: false, hata: 'Çok sık gönderildi' }, 429);
    const soru = mvSoru(b), iyi = b.iyi === true, not = mvTemiz(b.not, 300), etiketler = (Array.isArray(b.kaynaklar) ? b.kaynaklar : []).slice(0, 10).map(x => mvTemiz(x, 120));
    // kişisel veri en aza: 6+ haneli sayılar (TC kimlik, telefon) ve e-posta saklanmaz
    const kv = t => String(t || '').replace(/\d[\d\s-]{5,}\d/g, '…').replace(/\S+@\S+/g, '…');
    const kayit = { g, z: new Date().toISOString(), kurs: kursId, rol, soru: kv(mvTemiz(soru, 400)), iyi, not: kv(not), etiketler, cevap: kv(mvTemiz(b.cevap, 600)) };
    console.log(JSON.stringify({ tur: 'mevzuat-geri', ...kayit }));
    const id = g + ':' + [...crypto.getRandomValues(new Uint8Array(6))].map(x => x.toString(16).padStart(2, '0')).join('');
    await env.LINK.put('mvgeri:' + id, JSON.stringify(kayit), { expirationTtl: 90 * 86400, metadata: { iyi, kurs: kursId } });
    return cevap({ ok: true });
  }
  if (yol === 'mevzuat/anla') {
    if (!env.LLM_KEY) return cevap({ ok: false, kurulu: false, hata: 'Yapay zekâ henüz bağlı değil' }, 503);
    const soru = mvSoru(b);
    if (mvSinirAsti('a:' + kursId, 10)) return cevap({ ok: false, hata: 'Çok sık istek yapıldı; bir dakika sonra tekrar deneyin' }, 429);
    return cevap({ ok: true, ...(await mvAnla(env, soru)) });
  }
  return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
}

async function onizleme(req, url) {
  const t = ONIZLEME[url.pathname.split('/')[1].toLowerCase()];
  const r = await fetch('https://mdsinyal.com/404.html', { cf: { cacheTtl: 300 } }).catch(() => null);
  if (!r || !r.ok) return fetch(req);
  const icerik = v => ({ element(e) { e.setAttribute('content', v); } });
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(t[0]); } })
    .on('meta[property="og:title"]', icerik(t[0]))
    .on('meta[property="og:description"]', icerik(t[1]))
    .transform(new Response(r.body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' } }));
}

// ======== E-ARŞİV (PAR-011) ========
// Kurs kendi e-Arşiv entegratörünü seçer (Ayarlar › Entegrasyon); faturalar bu servis üzerinden entegratöre gider.
// Hesap bilgisi (API anahtarı / kullanıcı adı-şifre) müdürün cihazından bir kez gelir, EARSIV_ANAHTAR (gizli, en az 32 karakter) ile
// AES-GCM şifrelenip KV 'earsiv:<kurs>'a yazılır (ek veri: kurs kimliği; başka kursun kaydına taşınamaz). Tarayıcıya ve Firestore'a hiç dönmez.
// Deneme kipi: hiçbir entegratöre istek gitmez; fatura numarası, durum, iptal ve PDF bu serviste benzetilir (KV 'earsiv:deneme:…', 30 gün).
// Uçlar (Firebase oturumu + X-Kurs): GET earsiv (durum ve entegratör listesi; anahtar dönmez) · POST earsiv/hesap (müdür; kaydet ya da {sil})
//   · POST earsiv/dene (müdür; bağlantı denemesi) · POST earsiv/fatura · earsiv/iptal · earsiv/durum · earsiv/pdf (müdür, ön büro, şube müdürü).
// Bağlayıcı arayüzü (her entegratör): dene(h) · olustur(h, f) → { uuid, no, durum } · iptal(h, uuid, neden) · durum(h, uuid) → { durum } · pdf(h, uuid) → bayt
//   h = { kimlik, test (entegratörün test ortamı), f (fetch) }; durum: 'bekliyor' | 'tamam' | 'hata' | 'iptal'.
// e-Arşiv iptali (GİB): yalnız alıcı adı/unvanı ya da VKN/TCKN hatası gerekçesiyle; neden parametresi bu ikisinden biri olmalı.
const EA_ROL = ['mudur', 'sekreter', 'subemudur'];
export const EA_IPTAL_NEDEN = { alici_ad: 'Alıcı adı / unvanı hatalı', alici_vkn: 'Alıcı VKN / T.C. kimlik no hatalı' };
const EA_KDV = [0, 1, 10, 20];
const eaYuvarla = n => Math.round((+n + Number.EPSILON) * 100) / 100;
const eaMetin = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const eaXml = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const eaSaatTR = () => new Date(Date.now() + 3 * 3600e3).toISOString();
class EaHata extends Error { constructor(m, s = 400) { super(m); this.s = s; } }
// ---- normal fatura biçimi (istemciden) → denetlenmiş fatura ----
// { uuid?, no? (ABC2026000000001), seri? (3 harf), tarih: 'YYYY-MM-DD', saat?: 'HH:MM', not?, alici: { ad, soyad?, vkn? (10) | tckn? (11), vergiDairesi?, adres?, ilce, il, eposta?, tel? },
//   satirlar: [{ ad, miktar, birim? ('C62' adet), birimFiyat (KDV hariç), kdv (0/1/10/20) }], satici: { vkn|tckn, unvan, vergiDairesi?, adres?, ilce?, il? } }
export function eaFaturaDogrula(b, simdi = Date.now()) {
  const f = b && typeof b === 'object' ? b : {}, a = f.alici || {}, s = f.satici || {};
  const bugun = new Date(simdi + 3 * 3600e3).toISOString().slice(0, 10), once = new Date(simdi + 3 * 3600e3 - 7 * 864e5).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.tarih || '') || f.tarih > bugun) throw new EaHata('Fatura tarihi geçersiz ya da ileri tarihli');
  if (f.tarih < once) throw new EaHata('e-Arşiv fatura en geç 7 gün içinde düzenlenir (VUK 231/5); tarih çok eski');
  const vkn = String(a.vkn || '').replace(/\D/g, ''), tckn = String(a.tckn || '').replace(/\D/g, '');
  if (!(vkn.length === 10 || tckn.length === 11)) throw new EaHata('Alıcının VKN (10 hane) ya da T.C. kimlik numarası (11 hane) gerekli');
  if (!eaMetin(a.ad, 120)) throw new EaHata('Alıcı adı gerekli');
  if (!eaMetin(a.il, 40) || !eaMetin(a.ilce, 60)) throw new EaHata('Alıcının il ve ilçesi gerekli');
  const svkn = String(s.vkn || s.tckn || '').replace(/\D/g, '');
  if (!(svkn.length === 10 || svkn.length === 11) || !eaMetin(s.unvan, 160)) throw new EaHata('Kursun vergi numarası ve unvanı gerekli (Ayarlar › Entegrasyon)');
  if (!Array.isArray(f.satirlar) || !f.satirlar.length || f.satirlar.length > 50) throw new EaHata('Fatura satırı yok ya da çok fazla');
  const satirlar = f.satirlar.map((x, i) => {
    const miktar = +x.miktar, fiyat = +x.birimFiyat, kdv = +x.kdv;
    if (!eaMetin(x.ad, 200) || !(miktar > 0) || !(fiyat >= 0) || !EA_KDV.includes(kdv)) throw new EaHata((i + 1) + '. satır geçersiz (ad, miktar, birim fiyat, KDV oranı 0/1/10/20)');
    const tutar = eaYuvarla(miktar * fiyat);
    return { sira: i + 1, ad: eaMetin(x.ad, 200), miktar, birim: /^[A-Z0-9]{2,3}$/.test(x.birim || '') ? x.birim : 'C62', birimFiyat: eaYuvarla(fiyat), kdv, tutar, kdvTutar: eaYuvarla(tutar * kdv / 100) };
  });
  const matrah = eaYuvarla(satirlar.reduce((t, x) => t + x.tutar, 0)), kdvToplam = eaYuvarla(satirlar.reduce((t, x) => t + x.kdvTutar, 0));
  const kdvler = EA_KDV.map(o => ({ oran: o, matrah: eaYuvarla(satirlar.filter(x => x.kdv === o).reduce((t, x) => t + x.tutar, 0)), tutar: eaYuvarla(satirlar.filter(x => x.kdv === o).reduce((t, x) => t + x.kdvTutar, 0)) })).filter(x => satirlar.some(y => y.kdv === x.oran));
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(f.uuid || '') ? f.uuid.toLowerCase() : crypto.randomUUID();
  const no = /^[A-Z0-9]{3}\d{13}$/.test(f.no || '') ? f.no : '', seri = /^[A-Z0-9]{3}$/.test(String(f.seri || '').toLocaleUpperCase('tr')) ? String(f.seri).toLocaleUpperCase('tr') : (no ? no.slice(0, 3) : '');
  const ad = eaMetin(a.ad, 120), soyad = eaMetin(a.soyad, 80);
  return { uuid, no, seri, tarih: f.tarih, saat: /^\d{2}:\d{2}$/.test(f.saat || '') ? f.saat : '12:00', not: eaMetin(f.not, 500),
    alici: { ad, soyad, tamAd: (ad + ' ' + soyad).trim(), vkn, tckn, kisi: !vkn, vergiDairesi: eaMetin(a.vergiDairesi, 80), adres: eaMetin(a.adres, 250), ilce: eaMetin(a.ilce, 60), il: eaMetin(a.il, 40), eposta: eaMetin(a.eposta, 120), tel: eaMetin(a.tel, 20) },
    satici: { vkn: svkn, unvan: eaMetin(s.unvan, 160), vergiDairesi: eaMetin(s.vergiDairesi, 80), adres: eaMetin(s.adres, 250), ilce: eaMetin(s.ilce, 60), il: eaMetin(s.il, 40) },
    satirlar, matrah, kdvToplam, kdvler, toplam: eaYuvarla(matrah + kdvToplam) };
}
// UBL-TR 1.2 e-Arşiv faturası (imza ve XSLT'yi entegratör ekler). TODO(entegratör): gönderim şekli ve ek alanlar hesabın kılavuzuyla teyit edilmeli.
export function eaUbl(f) {
  const t = n => n.toFixed(2), para = n => `currencyID="TRY">${t(n)}`;
  const taraf = (p, kisi) => `<cac:Party><cac:PartyIdentification><cbc:ID schemeID="${p.vkn && p.vkn.length === 10 ? 'VKN' : 'TCKN'}">${eaXml(p.vkn || p.tckn)}</cbc:ID></cac:PartyIdentification>${kisi ? '' : `<cac:PartyName><cbc:Name>${eaXml(p.unvan || p.tamAd)}</cbc:Name></cac:PartyName>`}<cac:PostalAddress><cbc:StreetName>${eaXml(p.adres)}</cbc:StreetName><cbc:CitySubdivisionName>${eaXml(p.ilce)}</cbc:CitySubdivisionName><cbc:CityName>${eaXml(p.il)}</cbc:CityName><cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country></cac:PostalAddress>${p.vergiDairesi ? `<cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${eaXml(p.vergiDairesi)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>` : ''}${p.eposta ? `<cac:Contact><cbc:ElectronicMail>${eaXml(p.eposta)}</cbc:ElectronicMail></cac:Contact>` : ''}${kisi ? `<cac:Person><cbc:FirstName>${eaXml(p.ad)}</cbc:FirstName><cbc:FamilyName>${eaXml(p.soyad || '-')}</cbc:FamilyName></cac:Person>` : ''}</cac:Party>`;
  const vergi = (l, top) => `<cac:TaxTotal><cbc:TaxAmount ${para(top)}</cbc:TaxAmount>${l.map(x => `<cac:TaxSubtotal><cbc:TaxableAmount ${para(x.matrah)}</cbc:TaxableAmount><cbc:TaxAmount ${para(x.tutar)}</cbc:TaxAmount><cbc:Percent>${x.oran}</cbc:Percent><cac:TaxCategory>${x.oran === 0 ? '<cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode><cbc:TaxExemptionReason>İstisna olmayan diğer</cbc:TaxExemptionReason>' : ''}<cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`).join('')}</cac:TaxTotal>`;
  return `<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">`
    + `<cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:CustomizationID>TR1.2</cbc:CustomizationID><cbc:ProfileID>EARSIVFATURA</cbc:ProfileID><cbc:ID>${eaXml(f.no)}</cbc:ID><cbc:CopyIndicator>false</cbc:CopyIndicator><cbc:UUID>${f.uuid}</cbc:UUID>`
    + `<cbc:IssueDate>${f.tarih}</cbc:IssueDate><cbc:IssueTime>${f.saat}:00</cbc:IssueTime><cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>${f.not ? `<cbc:Note>${eaXml(f.not)}</cbc:Note>` : ''}<cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode><cbc:LineCountNumeric>${f.satirlar.length}</cbc:LineCountNumeric>`
    + `<cac:AdditionalDocumentReference><cbc:ID>ELEKTRONIK</cbc:ID><cbc:IssueDate>${f.tarih}</cbc:IssueDate><cbc:DocumentTypeCode>SEND_TYPE</cbc:DocumentTypeCode></cac:AdditionalDocumentReference>`
    + `<cac:AccountingSupplierParty>${taraf(f.satici, false)}</cac:AccountingSupplierParty><cac:AccountingCustomerParty>${taraf(f.alici, f.alici.kisi)}</cac:AccountingCustomerParty>`
    + vergi(f.kdvler, f.kdvToplam)
    + `<cac:LegalMonetaryTotal><cbc:LineExtensionAmount ${para(f.matrah)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount ${para(f.matrah)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount ${para(f.toplam)}</cbc:TaxInclusiveAmount><cbc:PayableAmount ${para(f.toplam)}</cbc:PayableAmount></cac:LegalMonetaryTotal>`
    + f.satirlar.map(x => `<cac:InvoiceLine><cbc:ID>${x.sira}</cbc:ID><cbc:InvoicedQuantity unitCode="${x.birim}">${x.miktar}</cbc:InvoicedQuantity><cbc:LineExtensionAmount ${para(x.tutar)}</cbc:LineExtensionAmount>${vergi([{ oran: x.kdv, matrah: x.tutar, tutar: x.kdvTutar }], x.kdvTutar)}<cac:Item><cbc:Name>${eaXml(x.ad)}</cbc:Name></cac:Item><cac:Price><cbc:PriceAmount ${para(x.birimFiyat)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`).join('')
    + `</Invoice>`;
}
const eaB64 = s => { const u = typeof s === 'string' ? new TextEncoder().encode(s) : s; let x = ''; for (let i = 0; i < u.length; i += 0x8000) x += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(x); };
const eaB64Bayt = s => Uint8Array.from(atob(String(s || '').replace(/\s+/g, '')), c => c.charCodeAt(0));
const eaEtiket = (xml, ad) => { const m = new RegExp('<(?:[\\w-]+:)?' + ad + '\\b([^>]*)>([\\s\\S]*?)</(?:[\\w-]+:)?' + ad + '>').exec(xml); return m ? { oz: m[1], ic: m[2] } : null; };
const eaOz = (oz, ad) => { const m = new RegExp('\\b' + ad + '="([^"]*)"').exec(oz || ''); return m ? m[1] : ''; };
async function eaSoap(h, url, eylem, govde, baslik = '') {
  const r = await h.f(url, { method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: eylem }, body: `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Header>${baslik}</s:Header><s:Body>${govde}</s:Body></s:Envelope>` });
  const x = await r.text(); const hata = eaEtiket(x, 'faultstring') || eaEtiket(x, 'Text');
  if (!r.ok || hata) throw new EaHata('Entegratör hatası: ' + eaMetin(hata ? hata.ic : r.status, 200), 502);
  return x;
}
// ---- bağlayıcılar ----
const EA_ENTEGRATOR = {
  // yerel benzetim: hiçbir dış istek yok. Alıcı VKN 1111111111 → GİB reddi benzetilir.
  deneme: { ad: 'Deneme (benzetim)', alanlar: [], hazir: true,
    async dene() { return { ok: true, ileti: 'Deneme kipi: bağlantı benzetildi, entegratöre istek gitmedi' }; },
    async olustur(h, f) {
      if (f.alici.vkn === '1111111111') throw new EaHata('Deneme: alıcı VKN GİB kayıtlarında bulunamadı (benzetim)', 422);
      const yil = f.tarih.slice(0, 4), sa = `earsiv:deneme:sayac:${h.kurs}:${yil}`, n = +((await h.env.LINK.get(sa)) || 0) + 1; await h.env.LINK.put(sa, String(n));
      const no = f.no || ((f.seri || 'DNM') + yil + String(n).padStart(9, '0'));
      await h.env.LINK.put(`earsiv:deneme:${h.kurs}:${f.uuid}`, JSON.stringify({ no, durum: 'tamam', tarih: f.tarih, toplam: f.toplam, alici: f.alici.tamAd }), { expirationTtl: 30 * 86400 });
      return { uuid: f.uuid, no, durum: 'tamam' };
    },
    async kayit(h, uuid) { const v = await h.env.LINK.get(`earsiv:deneme:${h.kurs}:${uuid}`); if (!v) throw new EaHata('Fatura bulunamadı', 404); return JSON.parse(v); },
    async iptal(h, uuid) { const v = await this.kayit(h, uuid); if (v.durum === 'iptal') throw new EaHata('Fatura zaten iptal edilmiş', 409); v.durum = 'iptal'; await h.env.LINK.put(`earsiv:deneme:${h.kurs}:${uuid}`, JSON.stringify(v), { expirationTtl: 30 * 86400 }); return { durum: 'iptal' }; },
    async durum(h, uuid) { const v = await this.kayit(h, uuid); return { durum: v.durum, no: v.no }; },
    async pdf(h, uuid) { const v = await this.kayit(h, uuid); return eaDenemePdf([`DENEME FATURASI - GECERLI DEGILDIR`, `No: ${v.no}`, `Tarih: ${v.tarih}`, `Toplam: ${v.toplam.toFixed(2)} TL`, v.durum === 'iptal' ? 'IPTAL EDILDI' : '']); },
  },
  // Nilvera REST (developer.nilvera.com, e-Arşiv API; Bearer API anahtarı). Test: apitest.nilvera.com.
  nilvera: { ad: 'Nilvera', alanlar: [['apiKey', 'API anahtarı', true]], hazir: true,
    kok: h => h.test ? 'https://apitest.nilvera.com' : 'https://api.nilvera.com',   // TODO: canlı adres Nilvera portalından teyit edilmeli
    istek(h, yol, o = {}) { return h.f(this.kok(h) + yol, { ...o, headers: { Authorization: 'Bearer ' + h.kimlik.apiKey, ...(o.govde ? { 'Content-Type': 'application/json' } : {}) }, ...(o.govde ? { body: JSON.stringify(o.govde) } : {}) }); },
    async cevap(r) { const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (x) { } if (!r.ok) throw new EaHata('Nilvera: ' + eaMetin((j && (j.Message || j.message || (Array.isArray(j) && j.join(', ')) || (j.Errors && JSON.stringify(j.Errors)))) || r.status, 200), r.status === 401 || r.status === 403 ? 401 : 502); return j; },
    async dene(h) { await this.cevap(await this.istek(h, '/general/Company')); return { ok: true, ileti: 'Nilvera hesabı doğrulandı' }; },   // TODO: firma bilgisi ucu (general API) teyit
    async olustur(h, f) {
      const a = f.alici;
      const govde = { ArchiveInvoice: {
        InvoiceInfo: { UUID: f.uuid, InvoiceType: 'SATIS', InvoiceSerieOrNumber: f.no || f.seri || null, IssueDate: f.tarih + 'T' + f.saat + ':00', CurrencyCode: 'TRY', SalesPlatform: 'NORMAL', SendType: 'ELEKTRONIK', LineExtensionAmount: f.matrah, KdvTotal: f.kdvToplam, PayableAmount: f.toplam },
        CustomerInfo: { TaxNumber: a.vkn || a.tckn, Name: a.tamAd, TaxOffice: a.vergiDairesi || null, Address: a.adres || null, District: a.ilce, City: a.il, Country: 'Türkiye', Mail: a.eposta || null, Phone: a.tel || null },   // TODO: şahısta ad/soyad ayrımı (Nilvera Name'i bölüyor mu) teyit
        InvoiceLines: f.satirlar.map(x => ({ Index: String(x.sira), Name: x.ad, Quantity: x.miktar, UnitType: x.birim, Price: x.birimFiyat, KDVPercent: x.kdv, KDVTotal: x.kdvTutar })),
        Notes: f.not ? [f.not] : null } };
      const j = await this.cevap(await this.istek(h, '/earchive/Send/Model', { method: 'POST', govde }));
      return { uuid: (j && j.UUID) || f.uuid, no: (j && j.InvoiceNumber) || f.no, durum: 'bekliyor' };
    },
    async iptal(h, uuid) { await this.cevap(await this.istek(h, '/earchive/Invoices/' + uuid + '/Cancel', { method: 'PUT' })); return { durum: 'iptal' }; },
    async durum(h, uuid) { const j = await this.cevap(await this.istek(h, '/earchive/Invoices/' + uuid + '/Status')) || {}; return { durum: j.CancelStatus ? 'iptal' : ({ succeed: 'tamam', waiting: 'bekliyor', error: 'hata' })[j.StatusCode] || 'bekliyor', ayrinti: eaMetin(j.StatusDetail, 200), raporlandi: j.ReportStatus === 'Reported' }; },
    async pdf(h, uuid) {
      const r = await this.istek(h, '/earchive/Invoices/' + uuid + '/pdf'); if (!r.ok) await this.cevap(r);
      // belgede içerik türü yazmıyor: ham PDF ya da base64 metin (tırnaklı olabilir) gelebilir
      const u = new Uint8Array(await r.arrayBuffer()); if (u[0] === 0x25 && u[1] === 0x50) return u;
      return eaB64Bayt(new TextDecoder().decode(u).replace(/^"|"$/g, ''));
    },
  },
  // Uyumsoft SOAP (efatura(-test).uyumsoft.com.tr/Services/Integration, ad alanı tempuri.org, eylem IIntegration/<işlem>).
  uyumsoft: { ad: 'Uyumsoft', alanlar: [['kullanici', 'Kullanıcı adı'], ['sifre', 'Şifre', true]], hazir: true,
    url: h => h.test ? 'https://efatura-test.uyumsoft.com.tr/Services/Integration' : 'https://efatura.uyumsoft.com.tr/Services/Integration',
    // TODO: kimlik doğrulama WS-Security UsernameToken (Uyumsoft entegrasyon kılavuzuyla teyit)
    baslik: h => `<o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" s:mustUnderstand="1"><o:UsernameToken><o:Username>${eaXml(h.kimlik.kullanici)}</o:Username><o:Password>${eaXml(h.kimlik.sifre)}</o:Password></o:UsernameToken></o:Security>`,
    async cagir(h, islem, ic) { const x = await eaSoap(h, this.url(h), 'http://tempuri.org/IIntegration/' + islem, `<${islem} xmlns="http://tempuri.org/">${ic}</${islem}>`, this.baslik(h)); const s = eaEtiket(x, islem + 'Result'); if (!s || eaOz(s.oz, 'IsSucceded') === 'false') throw new EaHata('Uyumsoft: ' + eaMetin(s ? eaOz(s.oz, 'Message') : 'boş cevap', 200), 502); return s; },
    // bağlantı denemesi: bilinmeyen bir kimlikle durum sorgusu; kimlik hatası SOAP hatası döner, 'bulunamadı' cevabı bağlantının çalıştığını gösterir
    async dene(h) { await eaSoap(h, this.url(h), 'http://tempuri.org/IIntegration/QueryOutboxInvoiceStatus', `<QueryOutboxInvoiceStatus xmlns="http://tempuri.org/"><invoiceIds><string xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${crypto.randomUUID()}</string></invoiceIds></QueryOutboxInvoiceStatus>`, this.baslik(h)); return { ok: true, ileti: 'Uyumsoft hesabı doğrulandı' }; },
    async olustur(h, f) {
      // TODO: Invoice öğesinin içi UBL ad alanında; EArchiveInvoiceInfo (DeliveryType) alan adları kılavuzla teyit edilmeli
      const ubl = eaUbl(f).replace(/^<\?xml[^>]*\?>/, '').replace(/^<Invoice xmlns="[^"]*" /, '<Invoice ');   // kök SendInvoice ad alanında, çocuklar cac/cbc önekli
      const s = await this.cagir(h, 'SendInvoice', `<invoices><InvoiceInfo LocalDocumentId="${f.uuid}">${ubl}<EArchiveInvoiceInfo DeliveryType="Electronic"/><Scenario>eArchive</Scenario><CreateDateUtc>${new Date().toISOString()}</CreateDateUtc></InvoiceInfo></invoices>`);
      const v = eaEtiket(s.ic, 'Value') || { oz: /<[^>]*Value\b([^>]*)\/>/.exec(s.ic) ? /<[^>]*Value\b([^>]*)\/>/.exec(s.ic)[1] : '' };
      return { uuid: eaOz(v.oz, 'Id') || f.uuid, no: eaOz(v.oz, 'Number') || f.no, durum: 'bekliyor' };
    },
    async iptal(h, uuid) { await this.cagir(h, 'CancelEArchiveInvoice', `<request InvoiceId="${eaXml(uuid)}" CancelDate="${new Date().toISOString()}"/>`); return { durum: 'iptal' }; },
    async durum(h, uuid) { const s = await this.cagir(h, 'QueryOutboxInvoiceStatus', `<invoiceIds><string xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${eaXml(uuid)}</string></invoiceIds>`); const m = /<[^>]*Value\b([^>]*)\/?>/.exec(s.ic) || []; const st = eaOz(m[1], 'Status'); return { durum: /Cancel/i.test(st) ? 'iptal' : /Error|Declined|Fail/i.test(st) ? 'hata' : /Approved|Succe|Sent|Archived/i.test(st) ? 'tamam' : 'bekliyor', ayrinti: eaMetin(eaOz(m[1], 'Message') || st, 200) }; },   // TODO: InvoiceStatus değer listesi
    async pdf(h, uuid) { const s = await this.cagir(h, 'GetOutboxInvoicePdf', `<invoiceId>${eaXml(uuid)}</invoiceId>`); const d = eaEtiket(s.ic, 'Data'); if (!d) throw new EaHata('Uyumsoft PDF boş', 502); return eaB64Bayt(d.ic); },
  },
  // İzibiz SOAP: AuthenticationWS Login → SESSION_ID, EArchiveInvoiceWS. TODO: işlem ve alan adları İzibiz e-Arşiv kılavuzuyla teyit edilmeli (belge herkese açık değil).
  izibiz: { ad: 'İzibiz', alanlar: [['kullanici', 'Kullanıcı adı'], ['sifre', 'Şifre', true]], hazir: true,
    kok: h => h.test ? 'https://efaturatest.izibiz.com.tr' : 'https://efatura.izibiz.com.tr',
    async oturum(h) {
      const x = await eaSoap(h, this.kok(h) + '/AuthenticationWS', 'login', `<Login xmlns="http://schemas.i2i.com/ei/wsdl"><REQUEST_HEADER><SESSION_ID>-1</SESSION_ID><APPLICATION_NAME>mdSinyal</APPLICATION_NAME></REQUEST_HEADER><USER_NAME>${eaXml(h.kimlik.kullanici)}</USER_NAME><PASSWORD>${eaXml(h.kimlik.sifre)}</PASSWORD></Login>`);
      const s = eaEtiket(x, 'SESSION_ID'); if (!s || !s.ic || s.ic === '-1') throw new EaHata('İzibiz oturumu açılamadı', 401); return s.ic;
    },
    bas: (sid) => `<REQUEST_HEADER><SESSION_ID>${eaXml(sid)}</SESSION_ID><COMPRESSED>N</COMPRESSED><APPLICATION_NAME>mdSinyal</APPLICATION_NAME></REQUEST_HEADER>`,
    async cagir(h, islem, ic) { const sid = await this.oturum(h); const x = await eaSoap(h, this.kok(h) + '/EArchiveInvoiceWS', islem, `<${islem}Request xmlns="http://schemas.i2i.com/ei/wsdl/archive">${this.bas(sid)}${ic}</${islem}Request>`); const e = eaEtiket(x, 'ERROR_TYPE'); if (e) throw new EaHata('İzibiz: ' + eaMetin((eaEtiket(e.ic, 'ERROR_SHORT_DES') || e).ic, 200), 502); return x; },
    async dene(h) { await this.oturum(h); return { ok: true, ileti: 'İzibiz oturumu açıldı' }; },
    async olustur(h, f) {
      const x = await this.cagir(h, 'WriteToArchiveExtended', `<ArchiveInvoiceExtendedContent><INVOICE_PROPERTIES><EARSIV_FLAG>Y</EARSIV_FLAG><EARSIV_PROPERTIES><EARSIV_TYPE>NORMAL</EARSIV_TYPE><SUB_STATUS>NEW</SUB_STATUS>${f.alici.eposta ? `<EARSIV_EMAIL>${eaXml(f.alici.eposta)}</EARSIV_EMAIL>` : ''}</EARSIV_PROPERTIES><INVOICE_CONTENT>${eaB64(eaUbl(f))}</INVOICE_CONTENT></INVOICE_PROPERTIES></ArchiveInvoiceExtendedContent>`);
      return { uuid: f.uuid, no: ((eaEtiket(x, 'INVOICE_ID') || {}).ic) || f.no, durum: 'bekliyor' };
    },
    async iptal(h, uuid) { await this.cagir(h, 'CancelEArchiveInvoice', `<CancelEArsivInvoiceContent><FATURA_UUID>${eaXml(uuid)}</FATURA_UUID><IPTAL_TARIHI>${eaSaatTR().slice(0, 10)}</IPTAL_TARIHI></CancelEArsivInvoiceContent>`); return { durum: 'iptal' }; },
    async durum(h, uuid) { const x = await this.cagir(h, 'GetEArchiveInvoiceStatus', `<UUID>${eaXml(uuid)}</UUID>`); const d = ((eaEtiket(x, 'INVOICE_STATUS') || eaEtiket(x, 'STATUS') || {}).ic || ''); return { durum: /IPTAL|CANCEL/i.test(d) ? 'iptal' : /HATA|ERROR/i.test(d) ? 'hata' : /RAPOR|SUCCE|BASARI|TAMAM/i.test(d) ? 'tamam' : 'bekliyor', ayrinti: eaMetin(d, 200) }; },
    async pdf(h, uuid) { const x = await this.cagir(h, 'ReadFromArchive', `<INVOICEID>${eaXml(uuid)}</INVOICEID><PORTAL_DIRECTION>OUT</PORTAL_DIRECTION><PROFILE>PDF</PROFILE>`); const d = eaEtiket(x, 'INVOICE') || eaEtiket(x, 'CONTENT'); if (!d) throw new EaHata('İzibiz PDF boş', 502); return eaB64Bayt(d.ic.replace(/<[^>]+>/g, '')); },
  },
  // TÜRMOB e-Entegratör (Luca): herkese açık API belgesi bulunamadı; kursun hesabıyla gelen kılavuz okununca eklenecek
  turmob: { ad: 'TÜRMOB e-Entegratör (Luca)', alanlar: [], hazir: false, not: 'Bağlantı belgesi TÜRMOB’dan istendiğinde eklenecek. O zamana kadar deneme kipiyle hazırlanabilir ya da faturayı mali müşavir keser.' },
};
// Deneme PDF'i: tek sayfa, ASCII metin (Türkçe harfler sadeleştirilir); geçerli PDF 1.4
function eaDenemePdf(satirlar) {
  const s = t => String(t).replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '\\$&');
  const akis = 'BT /F1 14 Tf 60 780 Td 18 TL ' + satirlar.filter(Boolean).map(x => `(${s(x)}) '`).join(' ') + ' ET';
  const nes = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>', `<< /Length ${akis.length} >>\nstream\n${akis}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let o = '%PDF-1.4\n'; const yer = []; nes.forEach((n, i) => { yer.push(o.length); o += `${i + 1} 0 obj\n${n}\nendobj\n`; });
  const x = o.length; o += `xref\n0 ${nes.length + 1}\n0000000000 65535 f \n` + yer.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${nes.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return new TextEncoder().encode(o);
}
// ---- hesap bilgisinin şifrelenmesi (AES-GCM, anahtar EARSIV_ANAHTAR'dan; ek veri kurs kimliği) ----
async function eaAnahtar(env) { if (String(env.EARSIV_ANAHTAR || '').length < 32) throw new EaHata('Sunucuda e-Arşiv şifreleme anahtarı tanımlı değil (EARSIV_ANAHTAR); mdSinyal ekibine yazın', 503); return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mdsinyal-earsiv|' + env.EARSIV_ANAHTAR)), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function eaSifrele(env, kurs, o) { const iv = crypto.getRandomValues(new Uint8Array(12)), c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(kurs) }, await eaAnahtar(env), new TextEncoder().encode(JSON.stringify(o)))); const t = new Uint8Array(12 + c.length); t.set(iv); t.set(c, 12); return eaB64(t); }
async function eaCoz(env, kurs, s) { const t = eaB64Bayt(s); try { return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: t.slice(0, 12), additionalData: new TextEncoder().encode(kurs) }, await eaAnahtar(env), t.slice(12)))); } catch (x) { if (x instanceof EaHata) throw x; throw new EaHata('Kayıtlı hesap bilgisi çözülemedi; hesabı yeniden girin', 409); } }
const eaMaske = v => { v = String(v || ''); return v.length <= 4 ? '••••' : '••••' + v.slice(-4); };
const eaHesapOku = async (env, kurs) => { try { return JSON.parse((await env.LINK.get('earsiv:' + kurs)) || 'null'); } catch (x) { return null; } };
async function eaGunluk(env, kurs, x) {   // PAR-011 hata günlüğü: kişisel veri yok (fatura kimliği, numara, işlem, sonuç)
  const a = 'earsiv:gunluk:' + kurs; let l = []; try { l = JSON.parse((await env.LINK.get(a)) || '[]'); } catch (e) { }
  l.unshift({ zaman: new Date().toISOString(), ...x }); await env.LINK.put(a, JSON.stringify(l.slice(0, 50)), { expirationTtl: 180 * 86400 });
}
async function earsiv(req, env, yol, cevap, { gercek, rol, kursId }) {
  if (!gercek) return cevap({ ok: false, hata: 'e-Arşiv kurs hesabıyla çalışır' }, 403);
  const GET = req.method === 'GET', POST = req.method === 'POST';
  const hesap = await eaHesapOku(env, kursId);
  const ozet = h => h ? { entegrator: h.entegrator, ad: (EA_ENTEGRATOR[h.entegrator] || {}).ad || h.entegrator, deneme: !!h.deneme, test: !!h.test, ozet: h.ozet || {}, zaman: h.zaman, son: h.son || null } : null;
  try {
    if (yol === 'earsiv' && GET) {
      let gunluk = []; if (rol === 'mudur') { try { gunluk = JSON.parse((await env.LINK.get('earsiv:gunluk:' + kursId)) || '[]').slice(0, 20); } catch (x) { } }
      return cevap({ ok: true, hesap: ozet(hesap), sunucuAnahtari: String(env.EARSIV_ANAHTAR || '').length >= 32, iptalNedenleri: EA_IPTAL_NEDEN, gunluk, entegratorler: Object.entries(EA_ENTEGRATOR).filter(([id]) => id !== 'deneme').map(([id, e]) => ({ id, ad: e.ad, hazir: e.hazir, alanlar: e.alanlar.map(([a, et, gizli]) => ({ ad: a, etiket: et, gizli: !!gizli })), not: e.not || '' })) });
    }
    if (!POST) return cevap({ ok: false }, 405);
    let b = {}; try { b = await req.json(); } catch (x) { return cevap({ ok: false, hata: 'İstek okunamadı' }, 400); }
    if (yol === 'earsiv/hesap') {
      if (rol !== 'mudur') return cevap({ ok: false, hata: 'e-Arşiv hesabını yalnız kurs müdürü bağlar' }, 403);
      if (b.sil) { await env.LINK.delete('earsiv:' + kursId); await eaGunluk(env, kursId, { islem: 'hesap kaldırıldı', ok: true }); return cevap({ ok: true, hesap: null }); }
      const id = String(b.entegrator || ''), E = EA_ENTEGRATOR[id];
      if (!E || id === 'deneme') return cevap({ ok: false, hata: 'Entegratör seçin' }, 400);
      const deneme = !!b.deneme;
      if (!E.hazir && !deneme) return cevap({ ok: false, hata: E.ad + ' bağlantısı henüz hazır değil; deneme kipini açın' }, 400);
      const k0 = b.kimlik && typeof b.kimlik === 'object' ? b.kimlik : {}, kimlik = {};
      E.alanlar.forEach(([a]) => { const v = String(k0[a] == null ? '' : k0[a]).trim(); if (v) kimlik[a] = v.slice(0, 400); });
      const eksik = E.alanlar.filter(([a]) => !kimlik[a]);
      // aynı entegratörde boş bırakılan alan eski değerini korur (anahtarı yeniden yazmak gerekmesin)
      let eski = {}; if (eksik.length && hesap && hesap.entegrator === id && hesap.sifre) eski = await eaCoz(env, kursId, hesap.sifre);
      eksik.forEach(([a]) => { if (eski[a]) kimlik[a] = eski[a]; });
      if (!deneme && E.alanlar.some(([a]) => !kimlik[a])) return cevap({ ok: false, hata: E.alanlar.filter(([a]) => !kimlik[a]).map(x => x[1]).join(', ') + ' gerekli' }, 400);
      const kayit = { entegrator: id, deneme, test: !!b.test, zaman: new Date().toISOString(), ozet: Object.fromEntries(E.alanlar.filter(([a]) => kimlik[a]).map(([a, , gizli]) => [a, gizli ? eaMaske(kimlik[a]) : eaMetin(kimlik[a], 60)])), ...(Object.keys(kimlik).length ? { sifre: await eaSifrele(env, kursId, kimlik) } : {}) };
      await env.LINK.put('earsiv:' + kursId, JSON.stringify(kayit));
      await eaGunluk(env, kursId, { islem: 'hesap kaydedildi', entegrator: id, deneme, ok: true });
      return cevap({ ok: true, hesap: ozet(kayit) });
    }
    if (!hesap) return cevap({ ok: false, hata: 'e-Arşiv entegratörü bağlı değil (Ayarlar › Entegrasyon)' }, 409);
    const E = hesap.deneme ? EA_ENTEGRATOR.deneme : EA_ENTEGRATOR[hesap.entegrator];
    if (!E || !E.hazir) return cevap({ ok: false, hata: 'Seçili entegratör henüz hazır değil' }, 409);
    if (mvSinirAsti('earsiv:' + kursId, 30)) return cevap({ ok: false, hata: 'Çok sık işlem; bir dakika sonra tekrar deneyin' }, 429);
    const h = { env, kurs: kursId, test: !!hesap.test, f: (u, o) => fetch(u, o), kimlik: !hesap.deneme && hesap.sifre ? await eaCoz(env, kursId, hesap.sifre) : {} };
    const uuidAl = () => { const u = String(b.uuid || '').toLowerCase(); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(u)) throw new EaHata('Fatura kimliği (uuid) geçersiz'); return u; };
    if (yol === 'earsiv/dene') {
      if (rol !== 'mudur') return cevap({ ok: false, hata: 'Yetki yok' }, 403);
      let s; try { s = await E.dene(h); } catch (x) { s = { ok: false, hata: x.message }; }
      hesap.son = { ok: !!s.ok, zaman: new Date().toISOString(), ileti: eaMetin(s.ileti || s.hata, 200) }; await env.LINK.put('earsiv:' + kursId, JSON.stringify(hesap));
      await eaGunluk(env, kursId, { islem: 'bağlantı denemesi', deneme: !!hesap.deneme, ok: !!s.ok, hata: s.ok ? undefined : eaMetin(s.hata, 160) });
      return cevap({ ok: !!s.ok, deneme: !!hesap.deneme, ileti: s.ileti, hata: s.hata, hesap: ozet(hesap) }, s.ok ? 200 : 502);
    }
    if (!EA_ROL.includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
    if (yol === 'earsiv/fatura') {
      const f = eaFaturaDogrula(b.fatura);
      try { const s = await E.olustur(h, f); await eaGunluk(env, kursId, { islem: 'fatura', uuid: s.uuid, no: s.no, deneme: !!hesap.deneme, ok: true }); return cevap({ ok: true, deneme: !!hesap.deneme, ...s, toplam: f.toplam, matrah: f.matrah, kdv: f.kdvToplam }); }
      catch (x) { await eaGunluk(env, kursId, { islem: 'fatura', uuid: f.uuid, deneme: !!hesap.deneme, ok: false, hata: eaMetin(x.message, 160) }); throw x; }
    }
    if (yol === 'earsiv/iptal') {
      const uuid = uuidAl(), neden = String(b.neden || '');
      if (!EA_IPTAL_NEDEN[neden]) return cevap({ ok: false, hata: 'e-Arşiv fatura yalnız alıcı adı/unvanı ya da VKN/TCKN hatası nedeniyle iptal edilir; öbür hatalarda iade faturası düzenleyin', nedenler: EA_IPTAL_NEDEN }, 400);
      try { const s = await E.iptal(h, uuid, EA_IPTAL_NEDEN[neden]); await eaGunluk(env, kursId, { islem: 'iptal', uuid, neden, deneme: !!hesap.deneme, ok: true }); return cevap({ ok: true, uuid, neden, ...s }); }
      catch (x) { await eaGunluk(env, kursId, { islem: 'iptal', uuid, neden, deneme: !!hesap.deneme, ok: false, hata: eaMetin(x.message, 160) }); throw x; }
    }
    if (yol === 'earsiv/durum') { const uuid = uuidAl(); return cevap({ ok: true, uuid, deneme: !!hesap.deneme, ...(await E.durum(h, uuid)) }); }
    if (yol === 'earsiv/pdf') { const uuid = uuidAl(), pdf = await E.pdf(h, uuid); return new Response(pdf, { headers: { ...cevap.cors, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="fatura-${uuid.slice(0, 8)}.pdf"`, 'Cache-Control': 'no-store' } }); }
    return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
  } catch (x) {
    if (x instanceof EaHata) return cevap({ ok: false, hata: x.message }, x.s);
    console.error(JSON.stringify({ tur: 'hata', konu: 'earsiv', hata: String((x && x.message) || x).slice(0, 200) }));
    return cevap({ ok: false, hata: 'Entegratöre ulaşılamadı; biraz sonra tekrar deneyin' }, 502);
  }
}
// ======== SERVİS HESABI ========
// UYG-012 / MSJ-021: worker'ın Firestore servis hesabı ve ofis kapalıyken çalışan işler (Cloudflare Cron).
// Kurulum ve kapatma: cloudflare/SERVIS-HESABI.md. FIREBASE_SA (gizli) tanımlı değilse burada hiçbir şey çalışmaz.
//
// 1) Google servis hesabı: FIREBASE_SA = Firebase konsolundan indirilen JSON (client_email, private_key, project_id).
//    RS256 JWT WebCrypto ile imzalanır, oauth2.googleapis.com/token'dan erişim jetonu alınır, süresi bitene kadar bellekte tutulur
//    (KV'ye ya da günlüğe yazılmaz). Kapsam yalnız Firestore (datastore).
// 2) Öğrenci istekleri (kurslar/{k}/ogrenciGelen): ofis cihazı açıkken saniyeler içinde işler ve siler. SERVIS_BEKLE_DK (varsayılan 10)
//    dakikadan uzun bekleyen istek "ofis kapalı" sayılır ve js/bulut.js ogrenciUygula'nın GÜVENLİ kısmı burada aynı denetimlerle işlenir:
//    çalışma alanları, hesap etkinleşmesi, müsaitlik, evrak ve e-Sınav dekontu yükleme, sınav deneyimi (onay bekler), ders iptali (24 saat),
//    ders puanı ve ders defteri onayı/itirazı, ders alma (saat/öğretmen/araç çakışması, günlük sınır, gece kısıtı), öğrenci bildirimleri.
//    Karar gerektiren istek ofise bırakılır (belge silinmez, ofis açılınca işler): ek ders teklifine cevap (ödeme planı değişir) ve
//    gece kısıtlı öğrencinin akşam saatindeki ders isteği (gün batımı ofis cihazında hesaplanır).
//    Her şey tek Firestore işleminde (transaction): istek belgesi silinir, kayıtlar aynı alan düzeniyle (kurslar/{k}/v kovaları) yazılır,
//    öğrencinin ekranı (ogrenciler/{kod}: v, islenen, sonuclar) güncellenir. Ofis cihazı aynı anda işlerse işlemlerden biri düşer, tekrar yazılmaz.
// 3) Zamanlı hatırlatmalar (js/zamanlayici.js): uygulama gerekmeden hesaplanabilen WhatsApp kuralları o1 (yarınki direksiyon dersi, öğrenciye),
//    o10 (yarınki program, öğretmene), o16 (doğum günü). Kuralın saatinden 30 dk sonra, 21:00'e kadar; kursun kendi hattı (KV hat:<kurs>) bağlıysa,
//    kural açıksa, demo sınırı kapalıysa (Zamanlı mesajlar › Demo sınırı) ve öğrencinin WhatsApp onayı varsa. Aynı mesaj iki kez gitmez:
//    uygulamanın kullandığı kilit belgesi (kurslar/{k}/gonderim/g…, anahtar 'z|<kural anahtarı>|<gün>') önce oluşturulur; oluşturamayan göndermez.
//    Gönderilen, zamanli.gonderilen ve gönderim geçmişine yazılır (ofis cihazı da 'gönderildi' görür).
// İstek bütçesi: ücretsiz planda bir çalıştırmada en çok 50 alt istek var (SERVIS_ISTEK, varsayılan 45); bitince iş sonraki çalıştırmaya kalır.

const TOKEN_URL = 'https://oauth2.googleapis.com/token', KAPSAM = 'https://www.googleapis.com/auth/datastore', PROJE = 'sinyal-5d37a';
export class SaHata extends Error { }
export class ButceBitti extends Error { }

// ---- servis hesabı ve jeton ----
export function saOku(env) {
  if (!env || !env.FIREBASE_SA) return null;
  try { const o = JSON.parse(env.FIREBASE_SA); if (!o.client_email || !/BEGIN PRIVATE KEY/.test(o.private_key || '')) return null; return { eposta: o.client_email, anahtar: o.private_key, proje: /^[a-z0-9-]{4,40}$/.test(o.project_id || '') ? o.project_id : PROJE }; } catch (x) { return null; }
}
const b64uBayt = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64u = s => b64uBayt(new TextEncoder().encode(s));
async function rsaImzala(pem, veri) {
  const der = Uint8Array.from(atob(pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const k = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k, new TextEncoder().encode(veri)));
}
let jeton = null;   // { t, son, eposta } — yalnız bu isolate'in belleğinde
export const jetonSifirla = () => { jeton = null; };
export async function saJeton(is) {
  const sa = is.sa, simdi = is.simdi();
  if (jeton && jeton.eposta === sa.eposta && jeton.son - 120e3 > simdi) return jeton.t;
  const iat = Math.floor(simdi / 1000), ic = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ iss: sa.eposta, scope: KAPSAM, aud: TOKEN_URL, iat, exp: iat + 3600 }));
  let imza; try { imza = await rsaImzala(sa.anahtar, ic); } catch (x) { throw new SaHata('FIREBASE_SA özel anahtarı okunamadı'); }
  const r = await is.f(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + ic + '.' + b64uBayt(imza) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new SaHata('Google erişim jetonu alınamadı: ' + String(j.error_description || j.error || r.status).slice(0, 120));
  jeton = { t: j.access_token, son: simdi + (+j.expires_in || 3600) * 1000, eposta: sa.eposta };
  return jeton.t;
}
// iş bağlamı: bütçeli fetch, saat, gönderim yardımcıları (sinyal-wa.js verir)
export function isBaglam(env, o = {}) {
  const is = { env, sa: saOku(env), kalan: +o.butce || +env.SERVIS_ISTEK || 45, simdi: o.simdi || (() => Date.now()), gonder: o.gonder, hatOku: o.hatOku };
  is.proje = is.sa ? is.sa.proje : PROJE;
  is.f = (u, i) => { if (--is.kalan < 0) throw new ButceBitti('istek bütçesi bitti'); return fetch(u, i); };
  return is;
}

// ---- Firestore REST ----
const fsKok = is => `https://firestore.googleapis.com/v1/projects/${is.proje}/databases/(default)/documents`;
export const fsAd = (is, yol) => `projects/${is.proje}/databases/(default)/documents/${yol}`;
export async function fsIstek(is, yol, govde) {
  const t = await saJeton(is);
  const r = await is.f(fsKok(is) + yol, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(govde || {}) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new SaHata('Firestore ' + r.status + ': ' + String((j && (j.error && j.error.message || (Array.isArray(j) && j[0] && j[0].error && j[0].error.message))) || '').slice(0, 160));
  return j;
}
export function fsDeger(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsDeger) } };
  return { mapValue: { fields: fsAlanlar(v) } };
}
export const fsAlanlar = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, fsDeger(v)]));
export function fsJs(d) {
  if (!d || typeof d !== 'object') return null;
  if ('stringValue' in d) return d.stringValue; if ('integerValue' in d) return Number(d.integerValue); if ('doubleValue' in d) return Number(d.doubleValue);
  if ('booleanValue' in d) return d.booleanValue; if ('timestampValue' in d) return d.timestampValue; if ('mapValue' in d) return fsNesne(d.mapValue.fields);
  if ('arrayValue' in d) return (d.arrayValue.values || []).map(fsJs); return null;
}
export const fsNesne = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, fsJs(v)]));
// alan yolu: kimlikte harf/rakam dışı karakter varsa ters tırnakla (Firestore field path)
export const alanYolu = (...p) => p.map(s => /^[A-Za-z_][A-Za-z_0-9]*$/.test(s) ? s : '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`').join('.');

// ---- istemcinin veri düzeni (js/bulut.js ile AYNI kalmalı: BUYUK, h32, kovaAd, dosya kimliği) ----
export const BUYUK = { dersler: 64, kursiyerler: 64, hareket: 64, islemler: 16, gonderimler: 16, teorik: 8, adaylar: 8, sinavlar: 8, kampanyalar: 8, imzaTalepleri: 8 };
export const h32 = (s, t = 2166136261) => { for (let i = 0; i < s.length; i++) { t ^= s.charCodeAt(i); t = Math.imul(t, 16777619); } return t >>> 0; };
export const kovaAd = (a, id) => a + '~' + (h32(String(id)) % (BUYUK[a] || 1));
const DOSYA_ON = 'sinyal-dosya:', DOSYA_SINIR = 3000, OZEL_EVRAK = new Set(['saglik', 'adli']), PARA = /^(hareket|kursiyerler|faturalar)~\d+$/;
const dosyaKimlik = s => 'd' + h32(s).toString(36) + h32(s, 5381).toString(36) + s.length.toString(36);
export const kilitKimlik = anahtar => 'g' + h32(anahtar).toString(36) + h32(anahtar, 5381).toString(36);
const rastgele = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('');
// kayda yazılacak JSON: büyük dosya metni ayrı belgeye (dosyalar/{id}) çıkar, sağlık raporu ve adli sicil 'oz' işaretli (bulut.js yaz())
function yazSun(v, dosyalar) {
  const ozel = new WeakSet();
  return JSON.stringify(v, function (k, x) {
    if (OZEL_EVRAK.has(k) && x && typeof x === 'object') ozel.add(x);
    if (typeof x === 'string' && x.length > DOSYA_SINIR && x.startsWith('data:')) { const id = dosyaKimlik(x), e = dosyalar.get(id); dosyalar.set(id, { v: x, oz: !!((e && e.oz) || ozel.has(this)) }); return DOSYA_ON + id; }
    return x;
  });
}
// öğrenci ekranına giden kopyada büyük dosyalar ve dosya bağları olmaz (bulut.js veriAt)
const veriAt = (k, x) => typeof x === 'string' && x.length > DOSYA_SINIR && x.startsWith('data:') ? null : (typeof x === 'string' && x.startsWith(DOSYA_ON) ? null : x);

// ---- Türkiye saati (UTC+3, yaz saati yok) ----
const tr = ms => new Date(ms + 3 * 3600e3).toISOString();
export const trGun = (ms, n = 0) => tr(ms + n * 864e5).slice(0, 10);
export const trSaat = ms => tr(ms).slice(11, 16);
const yerelZaman = ms => trGun(ms) + 'T' + trSaat(ms);

// ---- kurs verisini oku (kovalar), yaz (aynı düzen) ----
// diziler: { ad: 'hepsi' | [kimlik] }, tekler: ['kurs', …] (t~ belgeleri), ek: başka belge yolları
export async function kursOku(is, kurs, { diziler = {}, tekler = [], ek = [], islem = null }) {
  const vAdlar = [];
  for (const [a, s] of Object.entries(diziler)) vAdlar.push(...(s === 'hepsi' ? [...Array(BUYUK[a] || 1).keys()].map(i => a + '~' + i) : [...new Set(s.map(id => kovaAd(a, id)))]));
  tekler.forEach(a => vAdlar.push('t~' + a));
  const yollar = [...vAdlar.map(x => `kurslar/${kurs}/v/${x}`), ...ek];
  const c = yollar.length ? await fsIstek(is, ':batchGet', { documents: yollar.map(y => fsAd(is, y)), ...(islem ? { transaction: islem } : {}) }) : [];
  const bul = new Map(); (c || []).forEach(x => { if (x.found) bul.set(x.found.name, x.found); });
  const V = { dizi: {}, kayit: {}, kimlik: new WeakMap(), tek: {}, ek: {}, var: new Set() };
  Object.keys(diziler).forEach(a => { V.kayit[a] = new Map(); });
  for (const ad of vAdlar) {
    const b = bul.get(fsAd(is, `kurslar/${kurs}/v/${ad}`)); if (!b) continue; V.var.add(ad);
    const f = fsNesne(b.fields);
    if (ad.startsWith('t~')) { try { V.tek[ad.slice(2)] = JSON.parse(f.t); } catch (x) { } continue; }
    const a = ad.split('~')[0];
    Object.entries(f.i || {}).forEach(([id, o]) => { if (!o || typeof o.v !== 'string') return; let el; try { el = JSON.parse(o.v); } catch (x) { return; } V.kayit[a].set(id, { el, x: +o.x || 0 }); V.kimlik.set(el, id); });
  }
  Object.keys(diziler).forEach(a => { V.dizi[a] = [...V.kayit[a].values()].sort((p, q) => p.x - q.x).map(z => z.el); });
  ek.forEach(y => { const b = bul.get(fsAd(is, y)); V.ek[y] = b ? { alan: fsNesne(b.fields), zaman: b.updateTime } : null; });
  return V;
}
// Firestore yazıları: dizi kayıtları alan alan (i.`kimlik`), tek parça t~, düz belgeler
export class Yazim {
  constructor(is, kurs) { this.is = is; this.kurs = kurs; this.kovalar = new Map(); this.diger = []; this.dosyalar = new Map(); this.sira = 0; }
  dizi(a, id, el, x) { const k = kovaAd(a, id); let b = this.kovalar.get(k); if (!b) this.kovalar.set(k, b = { a, i: {} }); b.i[id] = el === null ? null : { v: yazSun(el, this.dosyalar), x }; }
  // başa eklenen kayıt (islemler, gonderimler, dersIptaller, devredilen: unshift): sıra sayısı mevcutların hepsinden küçük
  basa(a, el) { if (el.id == null && !el._k) el._k = rastgele(10); this.dizi(a, el.id != null ? String(el.id) : '_' + el._k, el, -(this.is.simdi() * 1000 + (++this.sira))); }
  sona(a, el) { this.dizi(a, String(el.id), el, this.is.simdi() * 1000 + (++this.sira)); }
  tek(a, o) { this.belge(`kurslar/${this.kurs}/v/t~${a}`, { a, t: yazSun(o, this.dosyalar) }); }
  belge(yol, alanlar, { maske, zaman = [] } = {}) { this.diger.push({ update: { name: fsAd(this.is, yol), fields: fsAlanlar(alanlar) }, ...(maske ? { updateMask: { fieldPaths: maske } } : {}), ...(zaman.length ? { updateTransforms: zaman.map(z => ({ fieldPath: z, setToServerValue: 'REQUEST_TIME' })) } : {}) }); }
  sil(yol) { this.diger.push({ delete: fsAd(this.is, yol) }); }
  kayit(ne, ayrinti, zaman) { this.belge(`kurslar/${this.kurs}/kayit/s${this.is.simdi().toString(36)}${rastgele(8)}`, { uid: 'sunucu', ad: 'Sunucu (ofis kapalıyken)', ne, ayrinti: String(ayrinti || '').slice(0, 300), yerel: zaman, cihaz: 'sunucu' }, { zaman: ['zaman'] }); }
  yazilar() {
    const w = [];
    this.dosyalar.forEach((d, id) => w.push({ update: { name: fsAd(this.is, `kurslar/${this.kurs}/dosyalar/${id}`), fields: fsAlanlar(d.oz ? { v: d.v, oz: true } : { v: d.v }) } }));
    this.kovalar.forEach((b, ad) => {
      const ic = {}, maske = ['a', 'd'];
      Object.entries(b.i).forEach(([id, o]) => { maske.push(alanYolu('i', id)); if (o) ic[id] = { mapValue: { fields: { v: { stringValue: o.v }, x: fsDeger(o.x) } } }; });
      const alan = { a: { stringValue: b.a }, d: { booleanValue: true }, i: { mapValue: { fields: ic } } };
      // PAR-053: para kovasına yazan paket aynı pakette iz belgesi oluşturur (kuralın istediği düzen; servis hesabı kuralsız yazsa da iz kalsın)
      if (PARA.test(ad)) { const izId = 'iz' + this.is.simdi().toString(36) + rastgele(6); alan.iz = { stringValue: izId }; maske.push('iz'); w.push({ update: { name: fsAd(this.is, `kurslar/${this.kurs}/kayit/${izId}`), fields: fsAlanlar({ uid: 'sunucu', ad: 'Sunucu (ofis kapalıyken)', tur: 'iz', ne: 'Para verisi kaydedildi', ayrinti: ad }) }, updateTransforms: [{ fieldPath: 'zaman', setToServerValue: 'REQUEST_TIME' }] }); }
      w.push({ update: { name: fsAd(this.is, `kurslar/${this.kurs}/v/${ad}`), fields: alan }, updateMask: { fieldPaths: maske } });
    });
    return [...w, ...this.diger];
  }
}
// tek seferde kilit belgeleri (oluşturulabilirse bizim): batchWrite atomik değildir, her yazının sonucu ayrı döner
async function kilitAl(is, kurs, anahtarlar) {
  if (!anahtarlar.length) return [];
  const c = await fsIstek(is, ':batchWrite', { writes: anahtarlar.map(a => ({ update: { name: fsAd(is, `kurslar/${kurs}/gonderim/${kilitKimlik(a)}`), fields: fsAlanlar({ uid: 'sunucu', cihaz: 'sunucu' }) }, currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'zaman', setToServerValue: 'REQUEST_TIME' }] })) });
  return anahtarlar.map((a, i) => !((c.status || [])[i] && (c.status || [])[i].code));
}
async function kilitBirak(is, kurs, anahtarlar) {
  if (!anahtarlar.length) return; try { await fsIstek(is, ':batchWrite', { writes: anahtarlar.map(a => ({ delete: fsAd(is, `kurslar/${kurs}/gonderim/${kilitKimlik(a)}`) })) }); } catch (x) { }
}

// ---- kurs ayarlarından yardımcılar (js/veri.js, js/ui.js ile aynı) ----
const rakamlar = t => { let n = String(t || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '90' + n.slice(1); else if (n.length === 10 && n.startsWith('5')) n = '90' + n; return n; };
export function waNumara(tel) { const ham = String(tel || '').trim(); let n = ham.replace(/\D/g, ''); if (ham.startsWith('+') || ham.startsWith('00')) { n = n.replace(/^00/, ''); return n.length >= 11 && n.length <= 15 ? n : ''; } if (n.startsWith('0')) n = '90' + n.slice(1); else if (n.length === 10 && n.startsWith('5')) n = '90' + n; return n.length >= 12 && n.length <= 15 ? n : ''; }
const mudurTel = K => { const t = rakamlar(K && K.mudurTel); if (t.length < 12) return ''; const hat = [K.wp, K.waHat && K.waHat.no].map(rakamlar).filter(Boolean); return hat.includes(t) ? '' : K.mudurTel; };
const tamAd = k => k.ad + ' ' + k.soyad;
const KURAL_ARALIK = { gunlukDersSiniri: [1, 2, 2] };
const kuralAyar = (K, a) => { const [en, ust, v] = KURAL_ARALIK[a], x = K ? K[a] : undefined; return x !== '' && x != null && isFinite(+x) && +x >= en && +x <= ust ? +x : v; };
function adEk(ad, hal) {
  ad = String(ad || '').trim(); if (!hal || !ad) return ad;
  const kc = ad.toLocaleLowerCase('tr'), sesliler = 'aeıioöuü', son = [...kc].reverse().find(c => sesliler.includes(c)) || 'e';
  const kalin = 'aıou'.includes(son), yuvarlak = 'ouöü'.includes(son), seslyBiter = sesliler.includes(kc.slice(-1)), iyelik = /(kursu|merkezi|okulu|akademisi|kurumu)$/.test(kc);
  const unlu = { e: kalin ? 'a' : 'e', de: kalin ? 'da' : 'de', den: kalin ? 'dan' : 'den', in: kalin ? (yuvarlak ? 'un' : 'ın') : (yuvarlak ? 'ün' : 'in') }[hal];
  if (iyelik) return ad + '’n' + unlu; if (seslyBiter) return ad + '’' + ({ e: 'y', in: 'n' }[hal] || '') + unlu;
  return ad + '’' + ('fstkçşhp'.includes(kc.slice(-1)) && unlu[0] === 'd' ? 't' + unlu.slice(1) : unlu);
}
const selamKisi = x => { const ilk = String(x.ad || '').trim().split(/\s+/)[0], tam = x.soyad != null ? tamAd(x) : String(x.ad || '').trim(); return x.cinsiyet === 'Kadın' ? `Merhaba ${ilk} Hanım,` : x.cinsiyet === 'Erkek' ? `Merhaba ${ilk} Bey,` : `Sayın ${tam},`; };
const SAAT_OKU = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki', 'on üç', 'on dört', 'on beş', 'on altı', 'on yedi', 'on sekiz', 'on dokuz', 'yirmi', 'yirmi bir', 'yirmi iki', 'yirmi üç'];
const sesli = s => { const h = (String(s).match(/^(\d{1,2})/) || [])[1], m = String(s).slice(-2); return (m === '00' ? SAAT_OKU[+h] : ({ '15': 'on beş', '30': 'otuz', '45': 'kırk beş' }[m] || 'sıfır')) || ''; };
const ince = w => 'eiöü'.includes((w.match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ['e'])[0]);
export const saatDe = s => { const w = sesli(s); return s + '’' + (/[çfhkpsşt]$/.test(w) ? 't' : 'd') + (ince(w) ? 'e' : 'a'); };
const SINIF_AD = { M: 'M · Motorlu bisiklet', A1: 'A1 · Hafif motosiklet', A2: 'A2 · Motosiklet', A: 'A · Motosiklet (sınırsız)', B1: 'B1 · Dört tekerlekli motosiklet', B: 'B · Manuel', 'B-O': 'B · Otomatik', 'B-EN': 'B · Engelli', BE: 'BE · Römorklu otomobil', C1: 'C1 · Hafif kamyon', C1E: 'C1E · Römorklu hafif kamyon', C: 'C · Kamyon', CE: 'CE · Çekici (tır)', D1: 'D1 · Minibüs', D1E: 'D1E · Römorklu minibüs', D: 'D · Otobüs', DE: 'DE · Römorklu otobüs', F: 'F · Traktör', G: 'G · İş makinesi' };

// ---- öğrenci isteği (js/bulut.js ogrenciUygula'nın güvenli kısmı) ----
const KIMLIK_BICIM = /^[A-Za-z0-9_-]{1,40}$/, TARIH_BICIM = /^\d{4}-\d{2}-\d{2}$/, SAAT_BICIM = /^\d{2}:\d{2}$/;
const DOSYA_BICIM = /^data:(image\/jpeg|image\/png|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/;
const EVRAK_AD = { saglik: 'Sürücü olur sağlık raporu', ogrenim: 'Öğrenim belgesi', adli: 'Adli sicil kaydı (barkodlu)', foto: 'Biyometrik fotoğraf', kimlik: 'Kimlik fotokopisi', sozlesme: 'İmzalı sözleşme' };
const CALISMA = ['deneme', 'denemeDetay', 'bildirilenSorular', 'bildirimDuzeltildi', 'yanlislar', 'konuAnaliz', 'okunan', 'tekrar', 'gorulen', 'dirCalisma', 'tehlike'];
const guvenliVeri = v => typeof v === 'string' ? v.replace(/[<>"'`]/g, '').slice(0, 500) : Array.isArray(v) ? v.slice(0, 2000).map(guvenliVeri)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).slice(0, 2000).map(([a, b]) => [String(a).replace(/[<>"'`]/g, '').slice(0, 80), guvenliVeri(b)]))
  : (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean' || v === null ? v : null;
const MUSAIT_GUN = [['1', 'Pzt'], ['2', 'Sal'], ['3', 'Çar'], ['4', 'Per'], ['5', 'Cum'], ['6', 'Cmt']], MUSAIT_DILIM = [['sabah', 'Sabah'], ['ogle', 'Öğle'], ['aksam', 'Akşam']];
function musaitlikTemizle(m, bugun) {
  if (!m || typeof m !== 'object' || !m.gun || typeof m.gun !== 'object') return null;
  const gl = {}; MUSAIT_GUN.forEach(([g]) => { const l = Array.isArray(m.gun[g]) ? MUSAIT_DILIM.map(d => d[0]).filter(d => m.gun[g].includes(d)) : []; if (l.length) gl[g] = l; });
  if (!Object.keys(gl).length) return null;
  const not = typeof m.not === 'string' ? m.not.replace(/[<>"'`]/g, '').trim().slice(0, 200) : '';
  return { gun: gl, ...(not ? { not } : {}), tarih: TARIH_BICIM.test(m.tarih || '') ? m.tarih : bugun, ...(m.kaynak === 'ofis' ? { kaynak: 'ofis' } : { kaynak: 'ogrenci' }) };
}
const musaitlikOzet = m => !m || !m.gun ? '' : MUSAIT_GUN.filter(([g]) => (m.gun[g] || []).length).map(([g, kisa]) => { const l = m.gun[g]; return kisa + ' ' + (l.length === 3 ? 'bütün gün' : MUSAIT_DILIM.filter(d => l.includes(d[0])).map(d => d[1].toLocaleLowerCase('tr')).join(', ')); }).join(' · ');
const dersKalanSaat = (d, simdi) => (Date.parse(d.tarih + 'T' + (SAAT_BICIM.test(d.saat || '') ? d.saat : '00:00') + ':00+03:00') - simdi) / 36e5;
const geceKisitli = k => !!(k && k.saglikRapor && k.saglikRapor.geceKisit);
// gece dersi mi: kursun elle girdiği gece başlangıcı (ay bazında) varsa ona göre; yoksa 16:00'dan önce kesin gündüz, sonrası belirsiz (null → ofis)
function geceMi(K, d) { const elle = K && K.geceSaatleri && K.geceSaatleri[String(d.tarih).slice(5, 7)]; if (SAAT_BICIM.test(elle || '')) return d.saat.slice(0, 5) >= elle; return d.saat < '16:00' ? false : null; }

// D: { kurs, kursiyerler, dersler, egitmenler, araclar, bosTeklif, kazanim }; g: ogrenciGelen belgesi. D yerinde değişir.
// Dönüş: { ofis: neden } (hiçbir şey yazılmaz) ya da { k, degisti: {...}, notlar, retler, gunluk, gonder }
export function ogrenciIsle(D, g, docId, simdi) {
  const k = D.kursiyerler.find(x => x.id === g.kursiyer); if (!k || !Array.isArray(g.d)) return { bos: true };
  const bugun = trGun(simdi), zaman = yerelZaman(simdi), saat = trSaat(simdi);
  const notlar = [], retler = [], gunluk = { islemler: [], gonderimler: [], dersIptaller: [], devredilen: [] }, gonder = [], dersDegisen = new Set(), dersEklenen = [], dersSilinen = [];
  let kDegisti = false, kazanim = false;
  const liste = g.d.slice(0, 30).map(x => { let y = null; try { y = x.v ? JSON.parse(x.v) : null; } catch (e) { return null; } return { x, y }; }).filter(Boolean);
  // karar gerektirenler: ofiste işlensin
  for (const { x, y } of liste) {
    if (x.a === 'kursiyerler' && x.id === k.id && y && k.ekDersTeklif && y.ekDersTeklif === null) return { ofis: 'ek ders teklifine cevap (ödeme planı ofiste işlenir)' };
    if (x.a === 'dersler' && y && !D.dersler.some(z => z.id === x.id) && geceKisitli(k) && SAAT_BICIM.test(y.saat || '') && TARIH_BICIM.test(y.tarih || '') && geceMi(D.kurs, y) === null) return { ofis: 'gece kısıtlı öğrencinin akşam ders isteği (gün batımı ofiste hesaplanır)' };
  }
  for (const { x, y } of liste) {
    if (x.a === 'kursiyerler' && x.id === k.id && y) {
      CALISMA.forEach(f => { if (y[f] !== undefined && JSON.stringify(y[f]).length < 50000) { const v = guvenliVeri(y[f]); if (JSON.stringify(v) !== JSON.stringify(k[f])) { k[f] = v; kDegisti = true; } } });
      ['hesapAktif', 'sonGiris'].forEach(f => { if (typeof y[f] === 'string' && TARIH_BICIM.test(y[f]) && y[f] !== k[f]) { k[f] = y[f]; kDegisti = true; if (f === 'hesapAktif') notlar.push('şifresini belirleyip hesabını kullanmaya başladı'); } });
      if ('musaitlik' in y) { const m = musaitlikTemizle(y.musaitlik, bugun); if (JSON.stringify(m) !== JSON.stringify(k.musaitlik || null)) { k.musaitlik = m; kDegisti = true; notlar.push(m ? 'müsait zamanlarını bildirdi: ' + musaitlikOzet(m) : 'müsaitlik bildirimini kaldırdı'); } }
      Object.entries(y.evrakYuklenen || {}).forEach(([key, e]) => {
        if (!e || !e.veri || !EVRAK_AD[key] || (k.evrak && k.evrak[key])) return;
        if (typeof e.veri !== 'string' || e.veri.length > 950000 || !DOSYA_BICIM.test(e.veri)) return;
        k.evrakYuklenen = k.evrakYuklenen || {}; k.evrakYuklenen[key] = { tarih: bugun, dosya: String(e.dosya || '').replace(/[<>"'`]/g, '').slice(0, 120), boyut: e.veri.length, tur: e.veri.startsWith('data:application/pdf') ? 'pdf' : 'resim', veri: e.veri };
        kDegisti = true; notlar.push(EVRAK_AD[key] + ' belgesini yükledi');
      });
      { const dk = y.esinavDekont; if (dk && typeof dk.veri === 'string' && dk.veri.length <= 950000 && DOSYA_BICIM.test(dk.veri) && /^\d{1,2}$/.test(String(dk.sira)) && !(k.esinavDekont && k.esinavDekont.veri === dk.veri)) {
        k.esinavDekont = { sira: +dk.sira, tarih: bugun, dosya: String(dk.dosya || '').replace(/[<>"'`]/g, '').slice(0, 120), tur: dk.veri.startsWith('data:application/pdf') ? 'pdf' : 'resim', veri: dk.veri, onay: null };
        kDegisti = true; notlar.push('e-Sınav ücreti dekontunu yükledi'); } }
      if (y.sinavDeneyimi && typeof y.sinavDeneyimi.metin === 'string' && y.sinavDeneyimi.metin.trim().length >= 10 && !(k.sinavDeneyimi && k.sinavDeneyimi.metin === y.sinavDeneyimi.metin)) {
        const sd = y.sinavDeneyimi; k.sinavDeneyimi = { metin: sd.metin.trim().slice(0, 1000), guzergah: String(sd.guzergah || '').slice(0, 40), sonuc: ['Geçti', 'Kaldı'].includes(sd.sonuc) ? sd.sonuc : '', tarih: bugun, onay: null };
        kDegisti = true; notlar.push('sınav deneyimini paylaştı (onayınızı bekliyor: Sınav güzergâhları)');
      }
    } else if (x.a === 'dersler') {
      const d = D.dersler.find(z => z.id === x.id);
      if (d && d.kursiyer === k.id) {
        if (!y) {
          if (d.durum === 'Planlandı' && dersKalanSaat(d, simdi) >= 24) {
            gunluk.dersIptaller.push({ id: d.id, kursiyer: d.kursiyer, egitmen: d.egitmen, arac: d.arac || null, tarih: d.tarih, saat: d.saat, meb: !!d.meb, iptal: { zaman, kim: 'Öğrenci paneli', neden: 'Kursiyer iptal etti (öğrenci paneli)', not: '' } });
            D.dersler = D.dersler.filter(z => z !== d); dersSilinen.push(d); notlar.push(d.tarih + ' ' + d.saat + ' dersini iptal etti');
          } else { notlar.push('iptal isteği reddedildi (24 saatten az kaldı)'); retler.push(d.tarih + ' ' + d.saat + ' dersinin iptali yapılamadı: derse 24 saatten az kaldı. Kursu arayın.'); }
        } else if (y.ogrenciPuan && typeof y.ogrenciPuan.puan === 'number' && d.durum === 'Yapıldı') { d.ogrenciPuan = { puan: Math.max(1, Math.min(5, Math.round(y.ogrenciPuan.puan))), yorum: String(y.ogrenciPuan.yorum || '').slice(0, 300), tarih: bugun }; dersDegisen.add(d); notlar.push('dersi puanladı'); }
        if (y && y.ogrenciOnay && ['onay', 'itiraz'].includes(y.ogrenciOnay.durum) && d.durum === 'Yapıldı' && !d.ogrenciOnay) {
          d.ogrenciOnay = { durum: y.ogrenciOnay.durum, not: String(y.ogrenciOnay.not || '').slice(0, 300), tarih: bugun }; dersDegisen.add(d);
          notlar.push(d.tarih + ' ' + d.saat + ' dersini ' + (d.ogrenciOnay.durum === 'onay' ? 'onayladı' : 'itiraz etti' + (d.ogrenciOnay.not ? ': ' + d.ogrenciOnay.not : '')));
          if (d.ogrenciOnay.durum === 'itiraz') gunluk.devredilen.push({ ad: tamAd(k), kanal: 'Ders defteri', konu: 'Ders itirazı', mesaj: d.tarih + ' ' + d.saat + ' dersi yapılmadı diyor' + (d.ogrenciOnay.not ? ': ' + d.ogrenciOnay.not : ''), neden: 'Öğrenci dersi onaylamadı', saat, bildirim: [] });
        }
      } else if (!d && y && KIMLIK_BICIM.test(String(x.id)) && y.kursiyer === k.id && y.durum === 'Planlandı' && TARIH_BICIM.test(y.tarih || '') && SAAT_BICIM.test(y.saat || '') && y.tarih >= bugun && D.egitmenler.some(e => e.id === y.egitmen)) {
        if (D.dersler.some(z => z.tarih === y.tarih && z.saat === y.saat && (z.egitmen === y.egitmen || z.kursiyer === k.id) && z.durum !== 'İptal')) { notlar.push(y.tarih + ' ' + y.saat + ' ders isteği reddedildi: saat dolu'); retler.push(y.tarih + ' ' + y.saat + ' ders isteğin alınamadı: o saat dolmuş. Başka bir saat seç.'); continue; }
        if (geceKisitli(k) && geceMi(D.kurs, y)) { notlar.push(y.tarih + ' ' + y.saat + ' ders isteği reddedildi: gece kısıtı'); retler.push(y.tarih + ' ' + y.saat + ' ders isteğin alınamadı: sağlık raporuna göre gece dersi alamazsın. Gün batımından önceki bir saat seç.'); continue; }
        { const sinir = kuralAyar(D.kurs, 'gunlukDersSiniri'), n = D.dersler.filter(z => z.kursiyer === k.id && z.tarih === y.tarih && z.durum !== 'İptal').length;
          if (n >= sinir) { notlar.push(y.tarih + ' ' + y.saat + ' ders isteği reddedildi: günlük sınır'); retler.push(y.tarih + ' ' + y.saat + ' ders isteğin alınamadı: aynı gün en çok ' + sinir + ' saat direksiyon dersi alınabilir. Başka bir gün seç.'); continue; } }
        const arac0 = D.araclar.some(a => a.id === y.arac) ? y.arac : null;
        if (arac0 && D.dersler.some(z => z.arac === arac0 && z.tarih === y.tarih && z.saat === y.saat && z.durum !== 'İptal')) { notlar.push(y.tarih + ' ' + y.saat + ' ders isteği reddedildi: araç dolu'); retler.push(y.tarih + ' ' + y.saat + ' ders isteğin alınamadı: o saatte araç başka derste. Başka bir saat seç.'); continue; }
        const yeni = { id: String(x.id), kursiyer: k.id, egitmen: y.egitmen, arac: arac0, tarih: y.tarih, saat: y.saat, durum: 'Planlandı', eklendi: bugun, kaynak: 'kursiyer' };
        D.dersler.push(yeni); dersEklenen.push(yeni);
        const t = (D.bosTeklif || []).find(z => z.tarih === y.tarih && z.saat === y.saat && z.egitmen === y.egitmen);
        if (t) { D.bosTeklif = D.bosTeklif.filter(z => z !== t); D.bosTeklifSilinen = [...(D.bosTeklifSilinen || []), t]; D.kazanim = D.kazanim || {}; D.kazanim.doldurulan = (D.kazanim.doldurulan || 0) + 1; kazanim = true; }
        notlar.push(y.tarih + ' ' + y.saat + ' direksiyon dersi aldı');
      }
    } else if (x.a === 'gonderimler' && y && !x.eski) {
      const m = { zaman: new Date(simdi).toISOString(), kime: String(y.kime || '').slice(0, 80), metin: String(y.metin || '').slice(0, 1000), tur: String(y.tur || 'Öğrenci').slice(0, 60) };
      const ustalari = new Set([k.egitmen, ...D.dersler.filter(z => z.kursiyer === k.id).map(z => z.egitmen)].filter(Boolean));
      const hoca = y.rol === 'HOCA' ? D.egitmenler.find(h => h.ad === m.kime && ustalari.has(h.id)) : null;
      const izinli = y.rol === 'MÜDÜR' || !!hoca;
      gunluk.gonderimler.push(m);
      if (!izinli && y.iletilecek) { gunluk.islemler.push({ zaman, kim: 'Sunucu', ne: 'Öğrenci panelinden izinsiz bildirim engellendi', ayrinti: tamAd(k) + ' → ' + m.kime }); continue; }
      if (retler.length && /dersi aldı|dersini iptal etti/.test(m.metin)) continue;
      if (y.iletilecek && D.kurs && D.kurs.waApi && !D.kurs.demoNumara) { const tel = waNumara(y.rol === 'MÜDÜR' ? mudurTel(D.kurs) : hoca && hoca.tel); if (tel) gonder.push({ anahtar: 'og|' + docId + '|' + x.id, tel, metin: m.metin, kime: m.kime }); }
    }
  }
  if (notlar.length) gunluk.islemler.push({ zaman, kim: 'Sunucu', ne: 'Öğrenci panelinden', ayrinti: tamAd(k) + ': ' + notlar.join(', ') });
  return { k, kDegisti, kazanim, dersDegisen: [...dersDegisen], dersEklenen, dersSilinen, notlar, retler, gunluk, gonder };
}
// öğrencinin ekranı: kayıt, dersler ve boş saat teklifleri yeniden hesaplanır (bulut.js ogrenciVerisiDen), öbür bölümler olduğu gibi kalır
function projeksiyon(eskiV, D, k, bugun) {
  let o = {}; try { o = JSON.parse(eskiV || '{}') || {}; } catch (x) { }
  const ben = { ...k, tc: k.tc ? '•••••••' + String(k.tc).slice(-4) : '' }; ['notlar', 'panelKod', 'hesap', 'ozelNot', 'ozelNotlar', 'ozelNotTarih'].forEach(f => delete ben[f]);
  const sec = (x, l) => { const r = {}; l.forEach(a => { if (x && x[a] !== undefined) r[a] = x[a]; }); return r; };
  o.kursiyerler = [ben];
  o.dersler = D.dersler.filter(d => d.kursiyer === k.id).map(d => { const x = { ...d }; delete x.konum; delete x.konumBit; delete x.iz; return x; })
    .concat(D.dersler.filter(d => d.kursiyer !== k.id && d.egitmen === k.egitmen && d.tarih >= bugun && d.durum === 'Planlandı').map(d => ({ ...sec(d, ['id', 'egitmen', 'arac', 'tarih', 'saat', 'durum']), kursiyer: null })));
  o.bosTeklif = (D.bosTeklif || []).filter(t => (t.adaylar || []).includes(k.id)).map(t => ({ ...t, adaylar: [k.id] }));
  return JSON.stringify(o, veriAt);
}

const gelenYolu = /documents\/kurslar\/([A-Za-z0-9]{10,40})\/ogrenciGelen\/([A-Za-z0-9_-]{1,64})$/;
const izinliKurs = (env, kurs) => { const l = String(env.SERVIS_KURSLAR || '').split(',').map(s => s.trim()).filter(Boolean); return !l.length || l.includes(kurs); };
// Bekleyen öğrenci isteklerini bul ve kurs kurs işle
export async function ogrenciGelenIsle(is, durum) {
  const simdi = is.simdi(), bekle = Math.max(1, +is.env.SERVIS_BEKLE_DK || 10) * 60e3;
  const q = await fsIstek(is, ':runQuery', { structuredQuery: { from: [{ collectionId: 'ogrenciGelen', allDescendants: true }], limit: 200 } });
  const kurslar = new Map();
  for (const r of q || []) {
    const b = r.document; if (!b) continue; const m = gelenYolu.exec(b.name); if (!m) continue;
    const [, kurs, id] = m, f = fsNesne(b.fields), t = Date.parse(f.zaman || b.createTime || '') || 0;
    if (!t || simdi - t < bekle || !izinliKurs(is.env, kurs)) continue;
    if (await is.env.LINK.get('srv:ofis:' + kurs + ':' + id)) continue;   // daha önce ofise bırakıldı
    if (!kurslar.has(kurs)) kurslar.set(kurs, []); kurslar.get(kurs).push({ id, t, g: f });
  }
  let n = 0;
  for (const [kurs, l] of kurslar) {
    if (n++ >= (+is.env.SERVIS_KURS || 3)) break;
    l.sort((a, b) => a.t - b.t);
    try { await kursOgrenciIsle(is, kurs, l.slice(0, 20), durum); }
    catch (x) { if (x instanceof ButceBitti) throw x; durum.hata.push('öğrenci ' + kurs.slice(0, 6) + ': ' + String(x.message || x).slice(0, 120)); }
  }
}
async function kursOgrenciIsle(is, kurs, gelenler, durum) {
  const simdi = is.simdi(), bugun = trGun(simdi), zaman = yerelZaman(simdi);
  const tx = (await fsIstek(is, ':beginTransaction', { options: { readWrite: {} } })).transaction;
  let isim = null, yazildi = false;
  try {
    const gelenYol = x => `kurslar/${kurs}/ogrenciGelen/${x.id}`, projeYol = kod => `kurslar/${kurs}/ogrenciler/${kod}`;
    const kodlar = [...new Set(gelenler.map(x => String(x.g.kod || '')).filter(k => /^[A-Za-z0-9]{6,64}$/.test(k)))];
    const V = await kursOku(is, kurs, { diziler: { kursiyerler: [...new Set(gelenler.map(x => String(x.g.kursiyer || '')))], dersler: 'hepsi', egitmenler: 'hepsi', araclar: 'hepsi', bosTeklif: 'hepsi' }, tekler: ['kurs', 'kazanim'], ek: [...gelenler.map(gelenYol), ...kodlar.map(projeYol)], islem: tx });
    const D = { kurs: V.tek.kurs || {}, kursiyerler: V.dizi.kursiyerler, dersler: V.dizi.dersler, egitmenler: V.dizi.egitmenler, araclar: V.dizi.araclar, bosTeklif: V.dizi.bosTeklif, kazanim: V.tek.kazanim };
    const Y = new Yazim(is, kurs), ofis = [], gonder = [], ofisteki = new Set(), proje = new Map(), xEski = (a, el) => { const id = V.kimlik.get(el); return id ? V.kayit[a].get(id).x : null; };
    let islenen = 0, kazanim = false; const dersD = new Set(), dersS = new Set(), dersE = new Set();
    for (const x of gelenler) {
      if (!V.ek[gelenYol(x)]) continue;   // bu arada ofis işledi
      if (ofisteki.has(x.g.kursiyer)) { ofis.push(x.id); durum.ogrenci.ofise++; continue; }   // aynı öğrencinin önceki isteği ofiste: sıra bozulmasın
      const r = ogrenciIsle(D, x.g, x.id, simdi);
      if (r.ofis) { ofis.push(x.id); ofisteki.add(x.g.kursiyer); durum.ogrenci.ofise++; continue; }
      Y.sil(gelenYol(x)); islenen++;
      if (r.bos) continue;
      const { k } = r;
      if (r.kDegisti) Y.dizi('kursiyerler', V.kimlik.get(k) || k.id, k, xEski('kursiyerler', k) ?? simdi * 1000);
      r.dersDegisen.forEach(d => dersD.add(d)); r.dersSilinen.forEach(d => dersS.add(d)); r.dersEklenen.forEach(d => dersE.add(d));
      Object.entries(r.gunluk).forEach(([a, l]) => l.forEach(el => Y.basa(a, el)));
      kazanim = kazanim || r.kazanim;
      r.gunluk.islemler.forEach(i => Y.kayit(i.ne, i.ayrinti, zaman));
      gonder.push(...r.gonder);
      const kod = /^[A-Za-z0-9]{6,64}$/.test(String(x.g.kod || '')) ? String(x.g.kod) : null;
      if (kod && V.ek[projeYol(kod)]) { const p = proje.get(kod) || { k, islenen: [...(V.ek[projeYol(kod)].alan.islenen || [])], sonuclar: [...(V.ek[projeYol(kod)].alan.sonuclar || [])] }; p.k = k; p.islenen.unshift(x.id); if (r.retler.length) p.sonuclar.unshift({ doc: x.id, ret: r.retler.slice(0, 5), zaman: simdi }); proje.set(kod, p); }
    }
    // aynı turda eklenip iptal edilen ders yazılmaz; yalnız sunucuda var olan silinir
    dersE.forEach(d => { if (D.dersler.includes(d)) Y.sona('dersler', d); });
    dersS.forEach(d => { if (V.kimlik.has(d)) Y.dizi('dersler', V.kimlik.get(d), null); });
    dersD.forEach(d => { if (D.dersler.includes(d) && !dersE.has(d)) Y.dizi('dersler', V.kimlik.get(d) || d.id, d, xEski('dersler', d) ?? simdi * 1000); });
    (D.bosTeklifSilinen || []).forEach(t => Y.dizi('bosTeklif', V.kimlik.get(t) || String(t.id), null));
    if (kazanim) Y.tek('kazanim', D.kazanim);
    proje.forEach((p, kod) => Y.belge(projeYol(kod), { v: projeksiyon(V.ek[projeYol(kod)].alan.v, D, p.k, bugun), islenen: p.islenen.slice(0, 20), sonuclar: p.sonuclar.slice(0, 10) }, { maske: ['v', 'islenen', 'sonuclar'], zaman: ['guncel'] }));
    const yazilar = Y.yazilar();
    if (yazilar.length) { await fsIstek(is, ':commit', { writes: yazilar, transaction: tx }); yazildi = true; }
    else { isim = tx; }
    durum.ogrenci.islenen += islenen;
    for (const id of ofis) await is.env.LINK.put('srv:ofis:' + kurs + ':' + id, '1', { expirationTtl: 14 * 86400 });
    // öğrenci bildirimleri (müdür / öğretmen): gece gitmez (kayıtta durur), uygulamanın kilidiyle bir kez
    const saat = trSaat(simdi);
    if (gonder.length && saat >= '08:00' && saat < '21:00') await kilitliGonder(is, kurs, gonder, durum, 'ogrenci');
  } catch (x) { if (!yazildi) isim = tx; throw x; }
  finally { if (isim) { try { await fsIstek(is, ':rollback', { transaction: isim }); } catch (y) { } } }
}
// kilit al → gönder → gönderilemeyenin kilidini bırak
async function kilitliGonder(is, kurs, l, durum, tur) {
  const h = await is.hatOku(is.env, kurs); if (!h) return [];
  const ok = await kilitAl(is, kurs, l.map(x => x.anahtar)), giden = [], birak = [];
  for (let i = 0; i < l.length; i++) {
    if (!ok[i]) continue;
    // gönderim (Meta) en çok 2 istek sayılır; kilit bırakmaya 1 istek kalmalı
    if (is.kalan < 3) { birak.push(...l.slice(i).filter((_, j) => ok[i + j]).map(z => z.anahtar)); durum.butce = true; break; }
    is.kalan -= 2;
    let s; try { s = await is.gonder(is.env, kurs, h, l[i].tel, l[i].metin); } catch (x) { s = { ok: false, hata: String(x.message || x) }; }
    if (s.ok) { giden.push(l[i]); durum[tur].gonderilen++; } else { birak.push(l[i].anahtar); durum.hata.push(tur + ' gönderilemedi: ' + String(s.hata || '').slice(0, 80)); }
  }
  if (birak.length) await kilitBirak(is, kurs, birak);
  return giden;
}

// ---- zamanlı hatırlatmalar (js/zamanlayici.js URET.o1, o10, o16) ----
const KURAL_SAAT = { o1: '18:30', o10: '18:30', o16: '10:30' };   // uygulamadaki saat + 30 dk: uygulama açıksa önce o gönderir
const DILIM = [['aksam', ['o1', 'o10']], ['sabah', ['o16']]];
const doldur = (K, sablon, alan) => { alan = { kurs: K.ad, kursa: adEk(K.ad, 'e'), kursta: adEk(K.ad, 'de'), ...alan }; ['tc', 'tckn', 'tcno', 'kimlik', 'sifre', 'parola', 'pin', 'iban'].forEach(a => { delete alan[a]; }); if (alan.kisi && !alan.selam) alan.selam = selamKisi(alan.kisi); return String(sablon || '').replace('{saat}’te', '{saatte}').replace(/\{(\w+)\}/g, (x, a) => alan[a] != null ? alan[a] : ''); };
// öğrenciye WhatsApp: arşivdeki, WhatsApp onayı vermeyen ya da başka kanal seçen öğrenciye sunucudan gitmez (uygulama e-posta/SMS kuyruğuna koyar)
const ogrWa = k => !k || (k.kapali && k.kapali.tur === 'arsiv') || (k.kvkk && k.kvkk.whatsapp === false) || (k.mesajKanal && k.mesajKanal !== 'WhatsApp') ? null : waNumara(k.tel);
export function hatirlatmaUret(V, kurallar, simdi) {
  const K = V.tek.kurs || {}, yarin = trGun(simdi, 1), bugun = trGun(simdi), oto = new Map((V.dizi.otomasyonlar || []).map(o => [o.id, o])), l = [];
  const kursiyer = id => V.dizi.kursiyerler.find(k => k.id === id), egitmen = id => V.dizi.egitmenler.find(e => e.id === id);
  for (const id of kurallar) {
    const o = oto.get(id); if (!o || !o.acik) continue;
    if (id === 'o1') V.dizi.dersler.filter(d => d.durum === 'Planlandı' && d.tarih === yarin).forEach(d => { const k = kursiyer(d.kursiyer), h = egitmen(d.egitmen), tel = ogrWa(k); if (k && h && tel) l.push({ kural: id, anahtar: 'o1|' + d.id, tel, kime: tamAd(k), rol: 'ÖĞRENCİ', kid: k.id, metin: doldur(K, o.sablon, { kisi: k, ad: k.ad, saat: d.saat, saatte: saatDe(d.saat), egitmen: h.ad }) }); });
    if (id === 'o10') V.dizi.egitmenler.forEach(h => { const ds = V.dizi.dersler.filter(d => d.egitmen === h.id && d.durum === 'Planlandı' && d.tarih === yarin).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)), tel = waNumara(h.tel);
      if (ds.length && tel) l.push({ kural: id, anahtar: 'o10|' + h.id + '|' + yarin, tel, kime: h.ad, rol: 'HOCA', metin: doldur(K, o.sablon, { ad: String(h.ad).split(' ')[0], liste: ds.map(d => { const k = kursiyer(d.kursiyer); return d.saat + ' ' + (k ? tamAd(k) + ' (' + (SINIF_AD[k.sinif] || k.sinif || '') + ')' : ''); }).join(', ') }) }); });
    if (id === 'o16') V.dizi.kursiyerler.filter(k => !k.kapali && k.dogumTarihi && String(k.dogumTarihi).slice(5) === bugun.slice(5)).forEach(k => { const tel = ogrWa(k); if (tel) l.push({ kural: id, anahtar: 'o16|' + k.id + '|' + bugun.slice(0, 4), tel, kime: tamAd(k), rol: 'ÖĞRENCİ', kid: k.id, metin: doldur(K, o.sablon, { kisi: k, ad: k.ad }) }); });
  }
  return l;
}
export async function hatirlatmalar(is, durum) {
  const simdi = is.simdi(), saat = trSaat(simdi), bugun = trGun(simdi);
  if (saat < '08:00' || saat >= '21:00') return;
  const kurslar = []; let imlec;
  do { const r = await is.env.LINK.list({ prefix: 'hat:', cursor: imlec }); r.keys.forEach(x => kurslar.push(x.name.slice(4))); imlec = r.list_complete === false ? r.cursor : null; } while (imlec);
  let n = 0;
  for (const kurs of kurslar) {
    if (!/^[A-Za-z0-9]{10,40}$/.test(kurs) || !izinliKurs(is.env, kurs)) continue;
    const dilimler = [];
    for (const [ad, kurallar] of DILIM) { const acik = kurallar.filter(k => saat >= KURAL_SAAT[k]); if (acik.length && !(await is.env.LINK.get(`srv:hat:${kurs}:${bugun}:${ad}`))) dilimler.push([ad, acik]); }
    if (!dilimler.length) continue;
    if (n++ >= (+is.env.SERVIS_KURS || 3)) break;
    try { await kursHatirlat(is, kurs, dilimler, durum); }
    catch (x) { if (x instanceof ButceBitti) throw x; durum.hata.push('hatırlatma ' + kurs.slice(0, 6) + ': ' + String(x.message || x).slice(0, 120)); }
  }
}
async function kursHatirlat(is, kurs, dilimler, durum) {
  const simdi = is.simdi(), bugun = trGun(simdi), bitti = () => Promise.all(dilimler.map(([ad]) => is.env.LINK.put(`srv:hat:${kurs}:${bugun}:${ad}`, '1', { expirationTtl: 2 * 86400 })));
  const V = await kursOku(is, kurs, { diziler: { dersler: 'hepsi', kursiyerler: 'hepsi', egitmenler: 'hepsi', otomasyonlar: 'hepsi' }, tekler: ['kurs', 'zamanli'] });
  const K = V.tek.kurs || {}, z = V.tek.zamanli;
  // demo kursu, demo yönlendirmesi ya da demo sınırı açık (her kuraldan günde 2): uygulamaya bırakılır
  if (K.waApiVarsayilan || K.demoNumara || !z || z.sinir !== false) { durum.hatirlatma.atlanan++; return bitti(); }
  const gonderilen = z.gonderilen || {}, enCok = +is.env.SERVIS_MESAJ || 20;
  const adaylar = hatirlatmaUret(V, dilimler.flatMap(([, l]) => l), simdi).filter(x => !gonderilen[x.anahtar]);
  const bu = adaylar.slice(0, Math.max(0, Math.min(enCok, Math.floor((is.kalan - 8) / 2))));
  const giden = await kilitliGonder(is, kurs, bu.map(x => ({ ...x, anahtar: 'z|' + x.anahtar + '|' + bugun })), durum, 'hatirlatma');
  if (giden.length) {
    // gönderildi bilgisi uygulamanın zamanli kaydına ve gönderim geçmişine (tek işlemde; zamanli o an yeniden okunur)
    const tx = (await fsIstek(is, ':beginTransaction', { options: { readWrite: {} } })).transaction;
    try {
      const V2 = await kursOku(is, kurs, { tekler: ['zamanli'], islem: tx }), z2 = V2.tek.zamanli || z, Y = new Yazim(is, kurs), zaman = yerelZaman(simdi);
      z2.gonderilen = z2.gonderilen || {}; z2.kayit = z2.kayit || []; z2.gunluk = z2.gunluk || {};
      giden.forEach(x => { const a = x.anahtar.slice(2, x.anahtar.lastIndexOf('|')); z2.gonderilen[a] = bugun; z2.kayit.unshift({ zaman, kural: x.kural, kime: x.kime, rol: x.rol, metin: x.metin, durum: 'gönderildi (sunucu)' }); z2.gunluk[bugun + x.kural] = (z2.gunluk[bugun + x.kural] || 0) + 1;
        Y.basa('gonderimler', { zaman: new Date(simdi).toISOString(), kime: x.kime, metin: x.metin, tur: ({ o1: 'Direksiyon dersi hatırlatması', o10: 'Hocaya yarınki program', o16: 'Doğum günü kutlaması' })[x.kural], ...(x.kid ? { kid: x.kid } : {}), oto: true }); });
      z2.kayit = z2.kayit.slice(0, 80); Y.tek('zamanli', z2);
      await fsIstek(is, ':commit', { writes: Y.yazilar(), transaction: tx });
    } catch (x) { try { await fsIstek(is, ':rollback', { transaction: tx }); } catch (y) { } throw x; }
  }
  if (bu.length === adaylar.length) await bitti(); else if (bu.length < enCok) durum.butce = true;   // kalanlar sonraki çalıştırmada
}

// ---- Cron girişi ----
export async function servisCalistir(env, o = {}) {
  if (!saOku(env) || !env.LINK) return { kapali: true };
  const is = isBaglam(env, o), durum = { zaman: new Date(is.simdi()).toISOString(), ogrenci: { islenen: 0, ofise: 0, gonderilen: 0 }, hatirlatma: { gonderilen: 0, atlanan: 0 }, hata: [], butce: false };
  for (const is0 of [ogrenciGelenIsle, hatirlatmalar]) {
    try { await is0(is, durum); } catch (x) { if (x instanceof ButceBitti) { durum.butce = true; break; } durum.hata.push(String(x.message || x).slice(0, 160)); }
  }
  durum.hata = durum.hata.slice(0, 10);
  try { await env.LINK.put('servis:durum', JSON.stringify(durum)); } catch (x) { }
  if (durum.hata.length) console.warn(JSON.stringify({ tur: 'uyari', konu: 'servis', hata: durum.hata.slice(0, 3) }));
  return durum;
}
// ---- UYG-012 / MSJ-021: servis hesabı işleri (kurulum SERVIS-HESABI.md) ----
// Kursun kendi hattından düz metin; şablon tanımlıysa ve kişi 24 saatte yazmadıysa doğrudan şablon, 131047'de şablonla tekrar (ana gönderim yoluyla aynı kural)
async function hatMetinGonder(env, kurs, h, to, metin) {
  const G = 'https://graph.facebook.com/v25.0/' + h.phoneId + '/messages', H = { Authorization: 'Bearer ' + h.token, 'Content-Type': 'application/json' };
  const yolla = async govde => { const r = await fetch(G, { method: 'POST', headers: H, body: JSON.stringify(govde) }); const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, id: j.messages && j.messages[0] && j.messages[0].id } : { ok: false, kod: j.error && j.error.code, hata: (j.error && j.error.message) || 'Meta hatasi' }; };
  if (h.sablon && env.LINK && !(await pencereAcik(env, kurs, to))) return yolla(sablonGovde(to, h.sablon, h.sablonDil, metin));
  const s = await yolla({ messaging_product: 'whatsapp', to, type: 'text', text: { body: metin, preview_url: true } });
  if (!s.ok && s.kod === 131047 && (h.sablon || env.SABLON_AD)) return yolla(sablonGovde(to, h.sablon || env.SABLON_AD, h.sablonDil || env.SABLON_DIL, metin));
  return s;
}
export const servisSecenek = { gonder: hatMetinGonder, hatOku: kursHat };
// GET /servis: son çalıştırmanın özeti (kurulu mu, işlenen, gönderilen, hatalar); POST /servis/calistir: şimdi bir kez çalıştır. Yalnız platform sahibi.
async function servisUc(req, env, yol, cevap) {
  if (!(await sahipMi(req, env))) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
  const kurulu = !!saOku(env);
  if (yol === 'servis/calistir' && req.method === 'POST') return kurulu ? cevap({ ok: true, kurulu, ...(await servisCalistir(env, servisSecenek)) }) : cevap({ ok: false, kurulu, hata: 'FIREBASE_SA tanımlı değil' }, 409);
  let son = null; try { son = JSON.parse((env.LINK && await env.LINK.get('servis:durum')) || 'null'); } catch (x) { }
  return cevap({ ok: true, kurulu, son });
}
export default {
  // Cron: "0 4 * * *" günlük (hat sağlığı, mevzuat takibi, pazartesi bülten); "*/" ile başlayan sık tetik (ör. "*/15 * * * *") servis hesabı işleri
  async scheduled(olay, env, ctx) {
    if (olay && String(olay.cron || '').startsWith('*/')) { ctx.waitUntil(servisCalistir(env, servisSecenek).catch(x => console.error(JSON.stringify({ tur: 'hata', konu: 'servis', hata: String((x && x.message) || x).slice(0, 200) })))); return; }
    ctx.waitUntil(hatSaglik(env).catch(x => console.error(JSON.stringify({ tur: 'hata', konu: 'hat sağlığı', hata: String((x && x.message) || x).slice(0, 200) })))); ctx.waitUntil(mvTakip(env).then(() => (new Date().getUTCDay() === 1 ? mvBulten(env) : null)).catch(x => console.error(JSON.stringify({ tur: 'hata', konu: 'mevzuat takip', hata: String((x && x.message) || x).slice(0, 200) }))));
  },
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    if (url.pathname.replace(/\/+$/, '') === '/onkayit') return onKayitAl(req, env, url);   // DIG-035: kursun kendi sitesindeki form, girişsiz
    if (url.hostname === 'mdsinyal.com' && req.method === 'GET' && /^\/[dihDIH]\/[A-Za-z0-9_-]/.test(url.pathname)) return onizleme(req, url);
    const cors = { 'Access-Control-Allow-Origin': IZINLI.includes(origin) ? origin : IZINLI[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Kurs, X-Yedek, X-Sikistirma', 'Access-Control-Expose-Headers': 'X-Sikistirma', 'Vary': 'Origin' };
    const cevap = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    cevap.cors = cors;
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const yol = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ''));
    // uygulama hataları: POST girişsiz (yalnız sitenin kendi adresinden), GET yalnız platform sahibi
    if (yol === 'hata') {
      if (req.method === 'POST') return IZINLI.includes(origin) ? hataAl(req, env, cevap) : cevap({ ok: false, hata: 'Izin yok' }, 403);
      if (req.method === 'GET') return hataListe(req, env, url, cevap);
      return cevap({ ok: false }, 405);
    }
    // site formları: POST girişsiz (yalnız sitenin kendi adresinden); yönetim (liste, durum, silme) yalnız platform sahibi
    if (yol === 'talep' && req.method === 'POST') return IZINLI.includes(origin) ? talepAl(req, env, cevap) : cevap({ ok: false, hata: 'Izin yok' }, 403);
    if (yol === 'talep/yonet') return talepYonet(req, env, url, cevap);
    if (yol === 'saglik') return saglikOku(req, env, url, cevap);   // MSJ-021
    if (yol === 'servis' || yol === 'servis/calistir') return servisUc(req, env, yol, cevap);   // UYG-012
    // YON-021: istemcinin IP adresi (IP yetkilendirme: ön büroyu kurs bilgisayarına bağlama); yalnız sitenin kendi adresinden, kayıt tutulmaz
    if (yol === 'ip' && req.method === 'GET') return IZINLI.includes(origin) ? cevap({ ok: true, ip: req.headers.get('CF-Connecting-IP') || '' }) : cevap({ ok: false, hata: 'Izin yok' }, 403);
    if (yol === 'soru-bildir' && req.method === 'POST') return IZINLI.includes(origin) ? soruBildirAl(req, env, cevap) : cevap({ ok: false, hata: 'Izin yok' }, 403);
    if (yol === 'soru-bildir/yonet') return soruBildirYonet(req, env, url, cevap);
    // kursun rapor ve yedek e-postaları (kimlik denetimi eposta() içinde)
    if (yol === 'eposta' || yol.startsWith('eposta/')) return eposta(req, env, url, yol, cevap);
    if (yol === 'sms' || yol === 'sms/hat') return sms(req, env, url, yol, cevap);   // MSJ-025
    if (yol.startsWith('onkayit/')) return onKayitYonet(req, env, url, yol, cevap);   // DIG-035 (kurs tarafı)
    if (yol === 'ilan' || yol.startsWith('ilan/')) return ilanlar(req, env, url, yol, cevap);   // DIG-037
    const G = 'https://graph.facebook.com/v25.0/' + env.PHONE_ID;
    // Gerçek kurs isteği: Firebase oturumu + kurs kimliği (yoksa demo yolu)
    // ortak derlem eklemeleri: okuma herkese açık, yazma platform sahibi (kurs üyeliği aranmaz)
    if (yol === 'mevzuat/ortak' || yol.startsWith('mevzuat/ortak/')) { try { return await mevzuatOrtak(req, env, url, yol, cevap); } catch (x) { if (x instanceof MvHata) return cevap({ ok: false, ...x.ek, hata: x.message }, x.s); console.error(JSON.stringify({ tur: 'hata', konu: 'mevzuat ortak', hata: String((x && x.message) || x).slice(0, 200) })); return cevap({ ok: false, hata: 'Beklenmeyen bir hata oldu; tekrar deneyin' }, 500); } }
    // asistan geri bildirim listesi (platform sahibi; kurs üyeliği aranmaz)
    if (yol === 'mevzuat/geri' && req.method === 'GET') { try { return await mvGeriListe(req, env, url, cevap); } catch (x) { return cevap({ ok: false, hata: 'Okunamadı' }, 500); } }
    const gercek = !!req.headers.get('Authorization') && yol !== 'yedek';
    const kursId = req.headers.get('X-Kurs') || url.searchParams.get('kurs') || '';
    let rol = null;
    if (gercek) { rol = await uyeRol(req, kursId); if (!rol || !PERSONEL.includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403); }
    if (yol === 'earsiv' || yol.startsWith('earsiv/')) return earsiv(req, env, yol, cevap, { gercek, rol, kursId });   // PAR-011
    if (yol === 'mebbis/ekran-alarm') return gercek && req.method === 'POST' ? ekranAlarm(req, env, cevap, kursId) : cevap({ ok: false, hata: 'Yetki yok' }, 403);   // YON-062
    // mevzuat ve MEB yazıları: arama, yükleme, özet, cevap (kimlik ve yetki mevzuatUc() içinde; /mevzuat/gom demoya da açık)
    if (yol === 'mevzuat' || yol.startsWith('mevzuat/')) return mevzuat(req, env, url, yol, cevap, { gercek, rol, kursId, origin });
    // Kurs verisinin günlük yedeği (Firestore'dan ayrı yerde): kimlik, kullanıcının kendi Firebase oturumuyla Firestore'dan doğrulanır
    if (yol === 'yedek') {
      const kurs = req.method === 'POST' ? req.headers.get('X-Kurs') || '' : url.searchParams.get('kurs') || '';
      const rol = await uyeRol(req, kurs);
      if (!rol) return cevap({ hata: 'yetki yok' }, 403);
      const on = 'yedek:' + kurs + ':';
      if (req.method === 'POST') {
        if (!['mudur', 'sekreter'].includes(rol)) return cevap({ hata: 'yetki yok' }, 403);
        const id = req.headers.get('X-Yedek') || '';
        if (!/^[\w-]{6,60}$/.test(id)) return cevap({ hata: 'ad geçersiz' }, 400);
        const veri = await req.arrayBuffer();
        if (!veri.byteLength || veri.byteLength > 20e6) return cevap({ hata: 'boyut' }, 400);
        if (await env.LINK.get(on + id, { type: 'stream' })) return cevap({ hata: 'bu yedek zaten var' }, 409);
        await env.LINK.put(on + id, veri, { expirationTtl: 35 * 86400, metadata: { boyut: veri.byteLength, sikistirma: req.headers.get('X-Sikistirma') || 'yok', zaman: new Date().toISOString() } });
        return cevap({ ok: true });
      }
      if (rol !== 'mudur') return cevap({ hata: 'yetki yok' }, 403);
      const id = url.searchParams.get('id');
      if (id) {
        const g = await env.LINK.getWithMetadata(on + id, { type: 'arrayBuffer' });
        if (!g.value) return cevap({ hata: 'yok' }, 404);
        return new Response(g.value, { headers: { ...cors, 'Content-Type': 'application/octet-stream', 'X-Sikistirma': (g.metadata && g.metadata.sikistirma) || 'yok' } });
      }
      const l = await env.LINK.list({ prefix: on });
      return cevap(l.keys.map(k => ({ id: k.name.slice(on.length), ...(k.metadata || {}) })));
    }
    // Kursun WhatsApp hattı: GET durumu verir (anahtarsız), POST bağlar ya da kaldırır (yalnız müdür)
    if (yol === 'hat') {
      if (!gercek) return cevap({ ok: false, hata: 'Yetki yok' }, 403);
      const h = await kursHat(env, kursId);
      if (req.method === 'GET') return cevap({ ok: true, bagli: !!h, no: h ? h.no : '', ad: h ? h.ad : '', sablon: (h && h.sablon) || '', sablonPazarlama: (h && h.sablonPazarlama) || '', gizli: !!(h && h.appSecret), ...(h && h.dog && rol === 'mudur' ? { webhook: { adres: new URL(req.url).origin + '/webhook', belirtec: h.dog } } : {}) });
      if (rol !== 'mudur') return cevap({ ok: false, hata: 'Hattı yalnız kurs müdürü bağlar' }, 403);
      let b; try { b = await req.json(); } catch (x) { return cevap({ ok: false, hata: 'Gecersiz istek' }, 400); }
      if (b.sil) { if (h) { await env.LINK.delete('hatno:' + h.phoneId); if (h.dog) await env.LINK.delete('hatdog:' + h.dog); } await env.LINK.delete('hat:' + kursId); return cevap({ ok: true, bagli: false }); }
      const phoneId = rakam(b.phoneId), token = String(b.token || '').trim(), wabaId = rakam(b.wabaId), appSecret = String(b.appSecret || '').trim(), pin = rakam(b.pin);
      const sablon = String(b.sablon || '').trim().toLowerCase(), sablonDil = String(b.sablonDil || 'tr').trim() || 'tr';
      // MSJ-023: pazarlama (tanıtım) mesajları için ayrı onaylı şablon (isteğe bağlı); yoksa genel şablon kullanılır
      // adı geçersizse sessizce temizlenmez: kaydedilmez, uyarı döner (bağlantı bozulmaz)
      const sablonPazHam = String(b.sablonPazarlama || '').trim().toLowerCase(), sablonPaz = /^[a-z0-9_]{1,512}$/.test(sablonPazHam) ? sablonPazHam : '';
      if (sablon && !/^[a-z0-9_]{1,512}$/.test(sablon)) return cevap({ ok: false, hata: 'Şablon adı yalnız küçük harf, rakam ve alt çizgi içerebilir' }, 400);
      if (appSecret && !/^[0-9a-f]{32}$/i.test(appSecret)) return cevap({ ok: false, hata: 'Uygulama gizli anahtarı 32 karakter olmalı (Meta › Uygulama ayarları › Temel)' }, 400);
      if (!phoneId || token.length < 20) return cevap({ ok: false, hata: 'Telefon numarası kimliği ve erişim anahtarı gerekli' }, 400);
      // DEMO_HAT_KURSLAR (virgülle kurs kimlikleri): mdSinyal'in kendi deneme kursları demo hattını gönderim için bağlayabilir; gelen mesajlar yine demoya gider
      const demoIzin = String(env.DEMO_HAT_KURSLAR || '').split(',').map(s => s.trim()).filter(Boolean).includes(kursId);
      if (!demoIzin && [env.PHONE_ID, env.PHONE_ID_USTA, env.PHONE_ID_MUDUR].filter(Boolean).map(rakam).includes(phoneId)) return cevap({ ok: false, hata: 'Bu, mdSinyal demo hattı; kursun kendi hattını girin' }, 400);
      const sahip = await env.LINK.get('hatno:' + phoneId);
      if (sahip && sahip !== kursId) return cevap({ ok: false, hata: 'Bu hat başka bir kursa bağlı' }, 409);
      const r = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '?fields=display_phone_number,verified_name,platform_type,name_status,quality_rating', { headers: { Authorization: 'Bearer ' + token } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return cevap({ ok: false, hata: 'Meta hattı doğrulamadı: ' + ((j.error && j.error.message) || r.status) }, 400);
      const G2 = 'https://graph.facebook.com/v25.0/', yetki = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, uyarilar = [];
      if (sablonPazHam && !sablonPaz) uyarilar.push('Pazarlama şablonu adı “' + sablonPazHam.slice(0, 60) + '” geçersiz (yalnız küçük harf, rakam ve alt çizgi); kaydedilmedi, tanıtım mesajları genel şablonla gider');
      // şablon Meta'da var mı, onaylı mı, beklenen sınıfta mı (MSJ-023: pazarlama şablonu da denetlenir); sorun bağlantıyı bozmaz, uyarı olur
      const sablonDenetle = async (ad, sinif, tanim) => {
        const rs = await fetch(G2 + wabaId + '/message_templates?fields=name,status,category,language&name=' + encodeURIComponent(ad), { headers: yetki });
        const js = await rs.json().catch(() => ({})), t = ((js && js.data) || []).find(x => x.name === ad && (x.language || '').toLowerCase().startsWith(sablonDil.toLowerCase().slice(0, 2)));
        if (!rs.ok) return tanim + ' denetlenemedi: ' + ((js.error && js.error.message) || rs.status);
        if (!t) return '“' + ad + '” ' + tanim.toLocaleLowerCase('tr') + ' bu hesapta (' + sablonDil + ') bulunamadı';
        if (t.status !== 'APPROVED') return '“' + ad + '” ' + tanim.toLocaleLowerCase('tr') + ' henüz onaylı değil (' + t.status + ')';
        if (t.category !== sinif) return sinif === 'UTILITY' ? '“' + ad + '” şablonu ' + t.category + ' sınıfında; hizmet (UTILITY) sınıfı daha ucuzdur'
          : '“' + ad + '” pazarlama şablonu ' + t.category + ' sınıfında; tanıtım mesajları pazarlama (MARKETING) sınıfında olmalı, yoksa Meta şablonu yeniden sınıflar ya da durdurur';
        return '';
      };
      // Numara Cloud API'ye kayıtlı değilse (platform_type ≠ CLOUD_API) mesaj gitmez (Meta 133010): iki adımlı doğrulama PIN'iyle kaydedilir
      if (j.platform_type && j.platform_type !== 'CLOUD_API') {
        if (!pin) return cevap({ ok: false, kayitGerekli: true, hata: 'Numara henüz Cloud API’ye kayıtlı değil. 6 haneli iki adımlı doğrulama PIN’ini girip yeniden deneyin (yeni numarada PIN’i siz belirlersiniz)' }, 400);
        if (!/^\d{6}$/.test(pin)) return cevap({ ok: false, kayitGerekli: true, hata: 'PIN 6 haneli olmalı' }, 400);
        const rk = await fetch(G2 + phoneId + '/register', { method: 'POST', headers: yetki, body: JSON.stringify({ messaging_product: 'whatsapp', pin }) });
        const jk = await rk.json().catch(() => ({}));
        if (!rk.ok) return cevap({ ok: false, kayitGerekli: true, hata: 'Numara Cloud API’ye kaydedilemedi: ' + ((jk.error && jk.error.message) || rk.status) }, 400);
      }
      if (j.name_status && !/^(APPROVED|AVAILABLE_WITHOUT_REVIEW)$/.test(j.name_status)) uyarilar.push('Görünen ad Meta onayında (' + j.name_status + '); onaylanana kadar mesajlarda numara görünür ve gönderim sınırlı olabilir');
      // Webhook aboneliği: WhatsApp hesabı (WABA) kursun uygulamasına abone edilmezse gelen mesajlar ve iletildi/okundu bilgisi hiç gelmez
      if (wabaId) {
        const ra = await fetch(G2 + wabaId + '/subscribed_apps', { method: 'POST', headers: yetki });
        if (!ra.ok) { const ja = await ra.json().catch(() => ({})); uyarilar.push('Gelen mesaj aboneliği açılamadı: ' + ((ja.error && ja.error.message) || ra.status)); }
        if (sablon) { const u = await sablonDenetle(sablon, 'UTILITY', 'Şablon'); if (u) uyarilar.push(u); }
        if (sablonPaz) { const u = await sablonDenetle(sablonPaz, 'MARKETING', 'Pazarlama şablonu'); if (u) uyarilar.push(u); }
      } else uyarilar.push('WhatsApp hesap kimliği (WABA ID) girilmedi: gelen mesaj aboneliği ve şablon denetlenmedi');
      if (h && h.phoneId !== phoneId) await env.LINK.delete('hatno:' + h.phoneId);
      // kursa özel webhook doğrulama belirteci (kursun kendi Meta uygulamasında girilir; ortak belirteç paylaşılmaz)
      const dog = (h && h.dog) || [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('');
      const kayit = { phoneId, token, no: j.display_phone_number || '', ad: j.verified_name || '', dog, ...(wabaId ? { wabaId } : {}), ...(sablon ? { sablon, sablonDil } : {}), ...(sablonPaz ? { sablonPazarlama: sablonPaz } : {}), ...(appSecret ? { appSecret } : h && h.appSecret ? { appSecret: h.appSecret } : {}) };
      await env.LINK.put('hat:' + kursId, JSON.stringify(kayit));
      await env.LINK.put('hatno:' + phoneId, kursId);
      if (!h || h.dog !== dog) await env.LINK.put('hatdog:' + dog, kursId);
      return cevap({ ok: true, bagli: true, no: kayit.no, ad: kayit.ad, kalite: j.quality_rating || '', sablon: kayit.sablon || '', sablonPazarlama: kayit.sablonPazarlama || '', gizli: !!kayit.appSecret, uyarilar, webhook: { adres: new URL(req.url).origin + '/webhook', belirtec: dog } });
    }
    // Meta webhook doğrulaması (abonelik kurulurken bir kez)
    if (yol === 'webhook' && req.method === 'GET') {
      const vt = String(url.searchParams.get('hub.verify_token') || '');
      if (url.searchParams.get('hub.mode') === 'subscribe' && (vt === (env.VERIFY_TOKEN || 'sinyal-dogrulama') || (/^[0-9a-f]{24}$/.test(vt) && env.LINK && await env.LINK.get('hatdog:' + vt)))) return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
      return new Response('Dogrulanamadi', { status: 403 });
    }
    if (yol === 'webhook' && req.method === 'POST') {
      // Meta her isteği uygulamanın gizli anahtarıyla imzalar; ham gövde üzerinden doğrulanır (APP_SECRET yoksa eski davranış)
      const ham = await req.arrayBuffer();
      // kursun kendi Meta uygulamasından gelen istek o uygulamanın gizli anahtarıyla imzalıdır: gövdedeki hat kimliğinden kurs bulunur, imza onunla da denenir
      let ekGizli = '';
      try { const on = JSON.parse(new TextDecoder().decode(ham)), pid = on.entry[0].changes[0].value.metadata.phone_number_id, ks = pid && env.LINK && await env.LINK.get('hatno:' + pid), hh = ks && await kursHat(env, ks); ekGizli = (hh && hh.appSecret) || ''; } catch (x) { }
      if (!(await metaImzaDogru(env, ham, req.headers.get('X-Hub-Signature-256'), ekGizli))) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'webhook imzası geçersiz', ip: req.headers.get('CF-Connecting-IP') || '' }));
        // MSJ-005: geçersiz imza sayacı (günlük; /saglik'ta görünür) ve 401
        if (env.LINK) { const an = 'imzahata:' + new Date().toISOString().slice(0, 10); try { await env.LINK.put(an, String((+(await env.LINK.get(an)) || 0) + 1), { expirationTtl: 8 * 86400 }); } catch (x) { } }
        return new Response('Imza gecersiz', { status: 401 }); }
      let p; try { p = JSON.parse(new TextDecoder().decode(ham)); } catch (x) { return new Response('ok'); }
      const v = p && p.entry && p.entry[0] && p.entry[0].changes && p.entry[0].changes[0] && p.entry[0].changes[0].value;
      // gönderilen mesajların durumu (gönderildi / iletildi / okundu): mdSinyal ekranında ✓✓ olarak görünür
      const st = v && v.statuses;
      if (st && st.length) {
        if (env.LINK) { const SIRA = { sent: 1, delivered: 2, read: 3, failed: 9 }; for (const s of st) { const k = 'durum-' + s.id, eski = await env.LINK.get(k); if ((SIRA[s.status] || 0) > (SIRA[eski] || 0)) await env.LINK.put(k, s.status, { expirationTtl: 1209600 }); const hk = s.status === 'failed' && s.errors && s.errors[0] && s.errors[0].code; if (hk) await env.LINK.put('hatakod-' + s.id, String(hk), { expirationTtl: 1209600 }); } }
        return new Response('ok');
      }
      const m = v && v.messages && v.messages[0];
      if (!m) return new Response('ok');
      const telId = v.metadata && v.metadata.phone_number_id;
      // Gerçek kursun hattına gelen mesaj: herkesten kabul edilir, yalnız o kursun gelen kutusuna yazılır (otomatik cevap yok)
      if (telId && telId !== env.PHONE_ID && telId !== env.PHONE_ID_USTA && telId !== env.PHONE_ID_MUDUR && env.LINK) {
        const kurs = await env.LINK.get('hatno:' + telId), h = kurs && await kursHat(env, kurs);
        if (!h) return new Response('ok');
        const medya = (m.type === 'image' || m.type === 'document') ? await medyaAl(env, m, h.token, 'medya-' + kurs + '-' + m.id) : null;
        const metin = m.type === 'text' ? m.text.body : (m[m.type] && m[m.type].caption) || (m.type === 'image' ? '(fotoğraf)' : m.type === 'document' ? '(belge)' : '(' + m.type + ')');
        await fetch('https://graph.facebook.com/v25.0/' + telId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + h.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: m.id }) }).catch(() => {});
        if (h.sablon) await env.LINK.put('son:' + kurs + ':' + rakam(m.from), String(Date.now()), { expirationTtl: 90000 }).catch(() => {});  // 24 saat penceresi (yalnız şablonlu kursta yazılır: KV yazma kotası)
        const da = !medya && m.type === 'text' ? await dersAkisi(env, kurs, m.from, metin) : null;
        if (da) {
          await fetch('https://graph.facebook.com/v25.0/' + telId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + h.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: m.from, type: 'text', text: { body: da.metin } }) }).catch(() => {});
          await kursaDusur(env, kurs, m, v, metin, da);
          return new Response('ok');
        }
        const l = JSON.parse((await env.LINK.get('gelen:' + kurs)) || '[]');
        l.unshift({ id: m.id, zaman: new Date(+m.timestamp * 1000 || Date.now()).toISOString(), ad: (v.contacts && v.contacts[0] && v.contacts[0].profile && v.contacts[0].profile.name) || '', tel: m.from, son4: m.from.slice(-4), metin, cevap: '', konu: medya ? 'Evrak' : '', devir: true, yanit: (m.context && m.context.id) || null, cevapTur: medya ? null : cevapTuru(metin), medya });
        await gelenYaz(env, 'gelen:' + kurs, l);
        return new Response('ok');
      }
      // Demo hattı: yalnızca kursun numarasına, kayıtlı ALICI'dan gelenler işlenir
      if ((telId && telId !== env.PHONE_ID) || rakam(m.from).slice(-10) !== rakam(env.ALICI).slice(-10)) return new Response('ok');
      // fotoğraf ya da PDF (evrak): Meta'dan indirilir, 14 gün saklanır; mdSinyal öğrencinin dosyasına alır
      const medya = (m.type === 'image' || m.type === 'document') && env.LINK ? await medyaAl(env, m, env.WA_TOKEN, 'medya-' + m.id) : null;
      const metin = m.type === 'text' ? m.text.body : (m[m.type] && m[m.type].caption) || (m.type === 'image' ? '(fotoğraf)' : m.type === 'document' ? '(belge)' : '(' + m.type + ')');
      const demoKurs = env.LINK && !medya && m.type === 'text' ? await env.LINK.get('hatno:' + env.PHONE_ID) : null;
      const da = env.LINK && !medya && m.type === 'text' ? await dersAkisi(env, demoKurs, m.from, metin) : null;
      const c = medya ? { metin: 'Belgenizi aldık, teşekkürler. Kurs kontrol edip kaydınıza işleyecek; eksik ya da okunmuyorsa size yazacağız. Kayıt kurs merkezinde tamamlanır.', konu: 'Evrak' } : da ? da : env.LINK ? await sohbet(env, m.from, metin) : asistanCevap(metin);
      if (da && da.kurs) await kursaDusur(env, da.kurs, m, v, metin, da).catch(() => {});
      const ust = '';  // asistan cevabı yazan kişiye gider; etiket gerekmez
      const yaz = body => fetch(G + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + env.WA_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await yaz({ messaging_product: 'whatsapp', status: 'read', message_id: m.id }).catch(() => {});
      await yaz({ messaging_product: 'whatsapp', to: env.ALICI, type: 'text', text: { body: ust + c.metin, preview_url: true } }).catch(() => {});
      if (env.LINK) {
        const l = JSON.parse((await env.LINK.get('gelen')) || '[]');
        l.unshift({ id: m.id, zaman: new Date(+m.timestamp * 1000 || Date.now()).toISOString(), ad: (v.contacts && v.contacts[0] && v.contacts[0].profile && v.contacts[0].profile.name) || '', son4: m.from.slice(-4), metin, cevap: c.metin, konu: c.konu, devir: !!c.devir, yanit: (m.context && m.context.id) || null, cevapTur: medya ? null : cevapTuru(metin), medya });
        await gelenYaz(env, 'gelen', l.slice(0, 50));
      }
      return new Response('ok');
    }
    if (yol === 'durum' && req.method === 'GET') {
      if (!gercek && !IZINLI.includes(origin)) return cevap({ ok: false, hata: 'Izin yok' }, 403);
      const ids = String(url.searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 100), durum = {};
      const kod = {};
      if (env.LINK) await Promise.all(ids.map(async id => { const d = await env.LINK.get('durum-' + id); if (d) durum[id] = d; if (d === 'failed') { const hk = await env.LINK.get('hatakod-' + id); if (hk) kod[id] = +hk; } }));
      return cevap({ ok: true, durum, kod });
    }
    if (yol.startsWith('medya/') && req.method === 'GET') {
      if (!gercek && !IZINLI.includes(origin)) return cevap({ ok: false, hata: 'Izin yok' }, 403);
      const g = await env.LINK.getWithMetadata((gercek ? 'medya-' + kursId + '-' : 'medya-') + yol.slice(6), { type: 'arrayBuffer' });
      if (!g.value) return cevap({ ok: false, hata: 'Bulunamadi' }, 404);
      return new Response(g.value, { headers: { ...cors, 'Content-Type': (g.metadata && g.metadata.mime) || 'application/octet-stream' } });
    }
    if (yol === 'gelen' && req.method === 'GET') {
      if (!gercek && !IZINLI.includes(origin)) return cevap({ ok: false, hata: 'Izin yok' }, 403);
      return cevap({ ok: true, liste: JSON.parse((env.LINK && (await env.LINK.get(gercek ? 'gelen:' + kursId : 'gelen'))) || '[]') });
    }
    if (req.method === 'GET') {
      if (!yol) return cevap({ ok: true, hazir: !!(env.WA_TOKEN && env.PHONE_ID && env.ALICI), belge: true, kisa: !!env.LINK, kursHatti: true, sablon: !!env.SABLON_AD, demoHatlari: { usta: !!env.PHONE_ID_USTA, mudur: !!env.PHONE_ID_MUDUR } });
      const anahtar = yol.startsWith('k/') ? yol.slice(2) : yol;
      if (/^(gelen$|(hat|hatno|gelen|medya|durum|yedek|kisaad|kursad|hata|sohbet|epadres|eponay|epsay|epgitti|epogr|ekalarm|mbelge)[:-])/.test(anahtar)) return cevap({ ok: false }, 404);  // iç kayıtlar (e-posta adresleri ve onay belirteçleri dahil) kısa link gibi okunamaz
      // imza dönüşü: sunucu kaydı (zaman, IP, ülke, tarayıcı) yalnız imza isteğinin mührünü bilen kursa verilir (?ka=)
      if (yol.startsWith('k/takip-') && env.LINK) {
        const g = await env.LINK.getWithMetadata(anahtar), md = g.metadata || null;
        if (!g.value) return cevap({ ok: false }, 404);
        const ka = url.searchParams.get('ka') || '';
        // imza paketi (ad, imza, cihaz) yalnız mührü bilen kursa verilir; mührü olmayan eski kayıtlar eskisi gibi okunur
        if (md && md.ka && !(ka && esit(ka, md.ka))) return cevap({ ok: false }, 404);
        const bilgi = md && md.ka ? { zaman: md.zaman || '', ip: md.ip || '', ulke: md.ulke || '', ua: md.ua || '', boyut: md.boyut || g.value.length } : null;
        return cevap({ ok: true, hedef: g.value, ...(bilgi ? { bilgi } : {}) });
      }
      if (anahtar.startsWith('takip-')) return cevap({ ok: false }, 404);  // imza dönüşü yalnız yukarıdaki k/takip- yolundan, mühürle okunur
      const v = env.LINK ? await env.LINK.get(anahtar) : null;
      if (yol.startsWith('k/')) return cevap(v ? { ok: true, hedef: v } : { ok: false }, v ? 200 : 404);
      if (v) return Response.redirect(v, 302);
      return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font:16px system-ui;padding:24px">Bu linkin süresi dolmuş ya da link hatalı. Sürücü kursunuza yazıp yeni bağlantı isteyin.</p>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (req.method !== 'POST' || (!gercek && !IZINLI.includes(origin))) return cevap({ ok: false, hata: 'Izin yok' }, 403);
    let b; try { b = await req.json(); } catch (x) { return cevap({ ok: false, hata: 'Gecersiz istek' }, 400); }
    // Kursa özel kısa link (mdsinyal.com/haller): yalnız kurs müdürü, kendi kursu için seçer. Ad başka kurstaysa verilmez; eski ad boşalır.
    if (yol === 'kisa-ad') {
      if (!env.LINK) return cevap({ ok: false, hata: 'Kisa link deposu bagli degil' }, 500);
      if (!gercek || rol !== 'mudur') return cevap({ ok: false, hata: 'Yalniz kurs muduru' }, 403);
      const ad = String((b && b.ad) || '').toLowerCase(), hedef = String((b && b.hedef) || '');
      const AYRILMIS = ['ozellikler', 'iletisim', 'giris', 'gizlilik', 'eklenti', 'fonts', 'demo', 'yonetim', 'sinyal', 'mdsinyal', 'admin', 'destek', 'kayit', 'blog', 'webhook', 'kisa', 'yedek', 'durum', 'gelen', 'medya', 'hata', 'ogrenci', 'ogretmen', 'hesap', 'sifre', 'davet', 'imza', 'prototip', 'mevzuat'];  // sitenin kendi adresleri (link-standardi.md)
      if (!/^[a-z0-9-]{4,30}$/.test(ad) || AYRILMIS.includes(ad) || /^(hat|hatno|gelen|medya|durum|yedek|kisaad|kursad|takip|hata|sohbet|mbelge)[:-]/.test(ad)) return cevap({ ok: false, hata: 'Bu ad kullanilamaz: 4-30 karakter, kucuk harf, rakam ve tire' }, 400);
      if (!HEDEF.test(hedef) || hedef.length > 2000) return cevap({ ok: false, hata: 'Gecersiz hedef' }, 400);
      const sahip = await env.LINK.get('kisaad:' + ad);
      if (sahip && sahip !== kursId) return cevap({ ok: false, hata: 'Bu ad baska bir kursta' }, 409);
      if (!sahip && await env.LINK.get(ad)) return cevap({ ok: false, hata: 'Bu ad dolu; baska bir ad secin' }, 409);
      const eski = await env.LINK.get('kursad:' + kursId);
      if (eski && eski !== ad) { await env.LINK.delete(eski); await env.LINK.delete('kisaad:' + eski); }
      await env.LINK.put(ad, hedef); await env.LINK.put('kisaad:' + ad, kursId); await env.LINK.put('kursad:' + kursId, ad);
      return cevap({ ok: true, ad });
    }
    if (yol === 'kisa') {
      if (!env.LINK) return cevap({ ok: false, hata: 'Kisa link deposu bagli degil' }, 500);
      const hedef = String((b && b.hedef) || '');
      if (!HEDEF.test(hedef) || hedef.length > 200000) return cevap({ ok: false, hata: 'Gecersiz hedef' }, 400);
      // kısa ve tahmin edilemez: kişinin adı linkte görünmez (32 harflik alfabe, 7 karakter, çakışırsa yeniden)
      // tur (isteğe bağlı): 'd' davet → mdsinyal.com/d/<kod>, 'i' imza → mdsinyal.com/i/<kod>; hedef türe uymalı. Davet kodu daha uzun (10 harf).
      // gun (isteğe bağlı, 1-60): linkin geçerlilik süresi; verilmezse 60 gün
      const tur = String((b && b.tur) || ''), gun = Math.min(60, Math.max(1, Math.round(+(b && b.gun) || 60)));
      if (tur && !({ d: /#\/davet\/|\/d\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/, i: /#\/imza(-geldi)?\// }[tur] || /^$/).test(hedef)) return cevap({ ok: false, hata: 'Gecersiz tur' }, 400);
      const harf = 'abcdefghijkmnpqrstuvwxyz23456789', boy = tur === 'd' ? 10 : 7, uret = () => [...crypto.getRandomValues(new Uint8Array(boy))].map(x => harf[x & 31]).join('');
      // imza dönüşü (takip): bir kez yazılır; üzerine başka imza konamaz. Yanına sunucu kanıtı (zaman, IP, ülke, tarayıcı) eklenir.
      const tk = b.takip ? 'takip-' + sade(b.takip) : '';
      let tkYaz = !!tk;
      if (tk) { const var0 = await env.LINK.get(tk); if (var0 && var0 !== hedef) return cevap({ ok: false, hata: 'Bu imza zaten gönderildi' }, 409); if (var0) tkYaz = false; }
      let slug = uret(); for (let i = 0; i < 4 && await env.LINK.get(slug); i++) slug = uret();
      await env.LINK.put(slug, hedef, { expirationTtl: gun * 86400 });
      if (tkYaz) {
        const ka = /^[0-9a-f]{16,64}$/.test(String(b.ka || '')) ? String(b.ka) : '';
        const md = { zaman: new Date().toISOString(), ip: req.headers.get('CF-Connecting-IP') || '', ulke: (req.cf && req.cf.country) || '', ua: String(req.headers.get('User-Agent') || '').slice(0, 300), boyut: hedef.length, ...(ka ? { ka } : {}) };  // YON-005: boyut da kanıta
        await env.LINK.put(tk, hedef, { expirationTtl: 5184000, metadata: md });
      }
      return cevap({ ok: true, slug, ...(tkYaz ? { sunucuZaman: new Date().toISOString() } : {}) });
    }
    if (yol) return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
    let metin = String((b && b.metin) || '').trim().slice(0, 4000);
    if (!metin) return cevap({ ok: false, hata: 'Mesaj bos' }, 400);
    // Gönderen hat ve alıcı: gerçek kursta kursun kendi hattı ve istekteki numara; demoda alıcının rolüne göre demo hattı ve ALICI
    let phoneId = env.PHONE_ID, token = env.WA_TOKEN, to = env.ALICI, h = null;
    if (!gercek) { const d = demoHatSec(env, metin, String(b.rol || '')); [phoneId, token] = d.hat; metin = d.metin; }
    if (gercek) {
      h = await kursHat(env, kursId);
      if (!h) return cevap({ ok: false, hata: 'Kursun WhatsApp hattı bağlı değil (Ayarlar › Kurs bilgileri)' }, 409);
      to = rakam(b.tel);
      if (!/^\d{11,15}$/.test(to)) return cevap({ ok: false, hata: 'Alıcının telefon numarası geçersiz' }, 400);
      phoneId = h.phoneId; token = h.token;
    }
    // şablonu tanımlı kursta, kişi son 24 saatte yazmadıysa serbest metin denenmez (Meta sonradan 131047 ile düşürür): doğrudan şablon
    // MSJ-023: mesaj türüne göre şablon (kategori 'pazarlama' → kursun pazarlama şablonu, yoksa genel şablon)
    const kSablon = h && (b.kategori === 'pazarlama' && h.sablonPazarlama ? h.sablonPazarlama : h.sablon);
    if (gercek && kSablon && !(b.belge && b.belge.base64) && env.LINK && !(await pencereAcik(env, kursId, to))) {
      const rs = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(sablonGovde(to, kSablon, h.sablonDil, metin)) });
      const js = await rs.json().catch(() => ({}));
      if (rs.ok) return cevap({ ok: true, id: js.messages && js.messages[0] && js.messages[0].id, sablon: true });
      return cevap({ ok: false, kod: js.error && js.error.code, hata: 'Şablonla gönderilemedi: ' + ((js.error && js.error.message) || 'Meta hatasi') }, 502);
    }
    const g = await mesajGovdesi(b, metin, to, phoneId, token);
    if (g.hata) return cevap(g.hata, 502);
    const r = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(g.govde) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const kod = j.error && j.error.code, sablon = kSablon || env.SABLON_AD;
      // 24 saat penceresi kapalı: onaylı şablonla tekrar (yalnız metin mesajı; şablon değişkeni satır sonu içeremez)
      if (kod === 131047 && sablon && !(b.belge && b.belge.base64)) {
        const r2 = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(sablonGovde(to, sablon, (h && h.sablonDil) || env.SABLON_DIL, metin)) });
        const j2 = await r2.json().catch(() => ({}));
        if (r2.ok) return cevap({ ok: true, id: j2.messages && j2.messages[0] && j2.messages[0].id, sablon: true });
        return cevap({ ok: false, kod: j2.error && j2.error.code, hata: 'Şablonla da gönderilemedi: ' + ((j2.error && j2.error.message) || 'Meta hatasi') }, 502);
      }
      return cevap({ ok: false, kod, hata: (j.error && j.error.message) || 'Meta hatasi' }, 502);
    }
    if (b.sohbetDurum && env.LINK && to) await env.LINK.put('sohbet:' + rakam(to), JSON.stringify(b.sohbetDurum), { expirationTtl: 6 * 3600 }).catch(() => {});
    return cevap({ ok: true, id: j.messages && j.messages[0] && j.messages[0].id });
  },
};
