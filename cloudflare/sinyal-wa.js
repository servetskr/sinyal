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
// /mevzuat/*: mevzuat arama (sorgu gömme), kursa gelen MEB yazılarını yükleme/listeleme/silme, özet ve kaynaklı cevap. Ayrıntı mevzuatUc() üstünde.
const IZINLI = ['https://mdsinyal.com', 'http://localhost:4481', 'http://127.0.0.1:4481'];
const HEDEF = /^(https:\/\/mdsinyal\.com\/|https:\/\/servetskr\.github\.io\/sinyal\/|http:\/\/localhost:4481\/)/;
const kucuk = s => String(s || '').toLocaleLowerCase('tr');
const ASISTAN = [
  [/süre|sure|kaç gün|kac gun|kaç ay|kac ay|kaç hafta|kac hafta|ne kadar sür|ne zaman biter|bitiyor/, 'Kurs yaklaşık 6–8 hafta sürüyor: önce 34 saat teorik ders ve e-sınav, ardından 14 direksiyon dersi ve direksiyon sınavı. Akşam grubuyla çalışırken de rahatça bitirebilirsiniz.', 'Kurs süresi'],
  [/otomatik/, 'B otomatik kurs ücretimiz 26.500 TL. Peşinattan sonra kalanı 5 aya kadar taksitle ödeyebilirsiniz. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · B otomatik'],
  [/manuel|b sınıf|b sinif|\bb\b|araba|otomobil/, 'B manuel kurs ücretimiz 24.000 TL. Peşinattan sonra kalanı 5 aya kadar taksitle ödeyebilirsiniz. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · B manuel'],
  [/motor|motosiklet|a2/, 'A2 motosiklet kurs ücretimiz 18.500 TL; taksit yapabiliyoruz. Kayıt için kursa uğrayabilir ya da buradan randevu alabilirsiniz.', 'Fiyat · A2'],
  [/kamyon|c sınıf|c sinif|\bc\b/, 'C kamyon kurs ücretimiz 31.000 TL; taksit yapabiliyoruz. B ehliyetiniz varsa yetkilimiz size ayrıca bilgi verecek.', 'Fiyat · C'],
  [/fiyat|ücret|ucret|kaç para|kac para|taksit|ne kadar/, 'Kurs ücretlerimiz: B manuel 24.000 TL, B otomatik 26.500 TL, A2 motosiklet 18.500 TL, C kamyon 31.000 TL. Peşinattan sonra 5 aya kadar taksit yapıyoruz. Hangi sınıf için düşünüyorsunuz?', 'Fiyat ve taksit'],
  [/evrak|belge|rapor|gerekli|neler lazım|ne lazım/, 'Kayıt için kimlik kartı, sürücü sağlık raporu, öğrenim belgesi, adli sicil kaydı ve 2 vesikalık fotoğraf yeterli. Sağlık raporunu aile hekiminizden alabilirsiniz.', 'Evrak'],
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
const DEMO_SINIF = [
  ['B manuel (otomobil)', '24.000 TL', 34, 14, /manuel|otomobil|araba|\bb\b/],
  ['B otomatik', '26.500 TL', 34, 14, /otomatik/],
  ['A2 motosiklet', '18.500 TL', 34, 14, /motor|motosiklet|\ba2\b/],
  ['C kamyon', '31.000 TL', 34, 20, /kamyon|\bc\b/],
];
const MENU = 'Size nasıl yardımcı olabilirim?\n\n1. Kayıt ve ücretler\n2. Gerekli belgeler\n3. Ders saatleri\n4. Adres\n5. Yetkiliyle görüşmek\n\nSeçtiğiniz maddenin rakamını yazmanız yeterli (örneğin 1).';
const SINIF_MENU = 'Hangi ehliyet sınıfını düşünüyorsunuz?\n\n' + DEMO_SINIF.map((s, i) => `${i + 1}. ${s[0]} · ${s[1]}`).join('\n') + '\n\nSeçtiğiniz sınıfın rakamını yazmanız yeterli (örneğin 1).';
const sinifBilgi = s => `*${s[0]}*\n\nÜcret: ${s[1]} (peşinattan sonra 5 aya kadar taksit)\nEğitim: ${s[2]} saat teorik ders ve ${s[3]} direksiyon dersi\nSüre: yaklaşık 6–8 hafta\n\nNasıl devam edelim?\n\n1. Kayıt için gerekenleri gönder\n2. Kursa gelip kayıt olmak istiyorum\n3. Yetkili beni arasın\n\nSeçtiğiniz maddenin rakamını yazmanız yeterli.`;
const BELGE = 'Kayıt için gerekenler:\n\n• Kimlik kartı\n• Sürücü sağlık raporu (aile hekiminizden alabilirsiniz)\n• Öğrenim belgesi\n• Adli sicil kaydı (e-Devlet)\n• 2 vesikalık fotoğraf\n\nBelgelerin fotoğrafını bu numaraya gönderebilirsiniz.';
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
async function kursaDusur(env, kurs, m, v, metin, c) {
  const l = JSON.parse((await env.LINK.get('gelen:' + kurs)) || '[]');
  l.unshift({ id: m.id, zaman: new Date(+m.timestamp * 1000 || Date.now()).toISOString(), ad: (v.contacts && v.contacts[0] && v.contacts[0].profile && v.contacts[0].profile.name) || '', tel: m.from, son4: m.from.slice(-4), metin, cevap: c.metin, konu: c.konu, devir: !!c.devir, yanit: null, cevapTur: null, medya: null, ...(c.ek || {}) });
  await env.LINK.put('gelen:' + kurs, JSON.stringify(l.slice(0, 200)));
}
async function sohbet(env, kimden, metin) {
  const anahtar = 'sohbet:' + rakam(kimden); let d = {};
  try { d = JSON.parse((await env.LINK.get(anahtar)) || '{}'); } catch (x) { d = {}; }
  const t = kucuk(metin).trim(), no = (t.match(/^([1-9])\s*[.)]?$/) || [])[1], selam = /^(merhaba|selam|slm|mrb|iyi günler|iyi akşamlar|günaydın)/.test(t);
  const sinifBul = () => DEMO_SINIF.findIndex(s => s[4].test(t));
  let c = null;
  if (d.adim === 'sinif' && ((no && DEMO_SINIF[no - 1]) || sinifBul() >= 0)) { const i = no ? +no - 1 : sinifBul(); c = { metin: sinifBilgi(DEMO_SINIF[i]), konu: 'Kayıt · ' + DEMO_SINIF[i][0], d: { adim: 'devam', sinif: i } }; }
  else if (d.adim === 'devam' && no === '1') c = { metin: BELGE + '\n\nKayıt kurs ofisinde yapılır. Gelmek istediğiniz günü belirlemek için 2, yetkilimizin aramasını isterseniz 3 yazın.', konu: 'Kayıt · evrak gönderildi', d: { adim: 'devam', sinif: d.sinif } };
  else if (d.adim === 'devam' && no === '2') c = { metin: `Memnuniyetle bekleriz. Hangi gün ve saat size uygun? Yazdığınız zamanı yetkilimize iletip size onaylatacağım.\n\n${ADRES}`, konu: 'Kayıt · randevu', d: { adim: 'randevu' } };
  else if ((d.adim === 'devam' && no === '3') || (d.adim === 'menu' && no === '5') || /yetkili|ara(y[ıi]n|s[ıi]n)|telefon edin|biri arasın/.test(t)) c = { metin: 'Talebinizi yetkilimize ilettim; en kısa sürede sizi bu numaradan arayacak. Uygun olmadığınız saat varsa yazabilirsiniz.', konu: 'Aranma talebi', devir: true, d: {} };
  else if (d.adim === 'randevu' && !no) c = { metin: `Teşekkürler. "${String(metin).trim().slice(0, 60)}" talebinizi yetkilimize ilettim; onaylayınca size buradan yazacağız.`, konu: 'Kayıt · randevu talebi', devir: true, d: {} };
  else if (d.adim === 'menu' && no) c = { '1': { metin: SINIF_MENU, konu: 'Kayıt', d: { adim: 'sinif' } }, '2': { metin: BELGE, konu: 'Evrak', d: { adim: 'menu' } }, '3': { metin: SAAT, konu: 'Ders saatleri', d: { adim: 'menu' } }, '4': { metin: ADRES, konu: 'Adres', d: { adim: 'menu' } } }[no] || null;
  else if (/kay[ıi]t|kaydol|yaz[ıi]l|ehliyet al|ba[şs]vur/.test(t)) c = { metin: `${selam ? 'Merhaba, ' : ''}${KURS_AD}’na hoş geldiniz. Kayıt düşünmenize çok sevindik.\n\n${SINIF_MENU}`, konu: 'Kayıt', d: { adim: 'sinif' } };
  else if (sinifBul() >= 0 && /fiyat|ücret|ucret|ka[çc]|ne kadar|bilgi/.test(t)) { const i = sinifBul(); c = { metin: sinifBilgi(DEMO_SINIF[i]), konu: 'Fiyat · ' + DEMO_SINIF[i][0], d: { adim: 'devam', sinif: i } }; }
  else if (/fiyat|ücret|ucret|kaç para|kac para|taksit|ne kadar/.test(t)) c = { metin: 'Kurs ücretlerimiz:\n\n' + DEMO_SINIF.map((s, i) => `${i + 1}. ${s[0]} · ${s[1]}`).join('\n') + '\n\nPeşinattan sonra 5 aya kadar taksit yapıyoruz. Hangi sınıfı düşünüyorsanız rakamını yazın (örneğin 1), ayrıntıları göndereyim.', konu: 'Fiyat ve taksit', d: { adim: 'sinif' } };
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
const PERSONEL = ['mudur', 'sekreter', 'usta'];
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
const sablonParam = metin => metin.replace(/\s*\n+\s*/g, ' · ').replace(/[\t ]{4,}/g, '   ').slice(0, 1000);
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
  if (!gizliler.length) { if (!imzaUyarisi) { imzaUyarisi = true; console.warn(JSON.stringify({ tur: 'uyari', konu: 'APP_SECRET tanımlı değil; Meta webhook imzası denetlenmiyor' })); } return true; }
  const m = /^sha256=([0-9a-f]{64})$/i.exec(String(baslik || '').trim()); if (!m) return false;
  const gelen = m[1].toLowerCase();
  for (const g of gizliler) if (esit(await hmacHex(g, ham), gelen)) return true;
  return false;
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
// Sağlayıcı soyut: RESEND_API_KEY (önerilen) ya da GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN (Gmail API).
// Gönderen: EPOSTA_GONDEREN (ör. "mdSinyal <rapor@mdsinyal.com>"). Sahibin analiz e-postası: SAHIP_EPOSTA.
// Kötüye kullanım engeli: alıcı yalnız kursun ONAYLI adresleri (müdür ekler, adrese giden onay linkine dokunulunca açılır);
// gövde ve ek boyutu sınırlı; kurs başına günde EPOSTA_GUNLUK_SINIR (varsayılan 12) e-posta; günlük/haftalık/aylık rapor dönem başına bir kez.
// KV: 'epadres:<kurs>' adres listesi (belirteç tutulmaz) · 'eponay:<belirteç>' 7 gün · 'epsay:<kurs>:<gün>' sayaç 2 gün · 'epgitti:<kurs>:<tür>:<dönem>' 40 gün
// Bu anahtarlar GET /k/ okuyucusunda engelli (iç kayıt). Sayaç ve 'bir kez' kaydı KV'de oku-yaz: paralel isteklerde YAKLAŞIK sınırdır.
// Ücretsiz Workers planında istek başına işlemci süresi kısa: ek en çok ~1,2 milyon base64 karakter (~900 KB), worker eki ayrıştırmaz.
const EP_TUR = ['gunluk', 'haftalik', 'aylik', 'deneme', 'yedek'], EP_EN_FAZLA_ADRES = 3;
const epGecerli = a => /^[^\s@<>,;"]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/.test(a);
const epGun = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const b64 = s => { const b = new TextEncoder().encode(s); let x = ''; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(x); };
const epKacis = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function epSaglayici(env) {
  const kimden = env.EPOSTA_GONDEREN || 'mdSinyal <rapor@mdsinyal.com>';
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
const epSayfa = (baslik, metin, form) => new Response(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${epKacis(baslik)} · mdSinyal</title></head><body style="margin:0;background:#0f1729;color:#e9edf5;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box"><main style="max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 8px">${epKacis(baslik)}</h1><p style="margin:0 0 20px;color:#b8c2d6">${epKacis(metin)}</p>${form ? `<form method="post" action="https://api.mdsinyal.com/eposta/onay"><input type="hidden" name="t" value="${epKacis(form)}"><button type="submit" style="font:inherit;color:#fff;background:#2563eb;border:0;padding:12px 20px;border-radius:12px;font-weight:600;cursor:pointer">Adresimi onayla</button></form>` : `<a href="https://mdsinyal.com/" style="color:#fff;background:#2563eb;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">mdSinyal’i aç</a>`}</main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
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
  if (!rol || !['mudur', 'sekreter'].includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403);  // öğretmen adresleri görmez
  const l = await epAdresler(env, kurs);
  if (yol === 'eposta' && req.method === 'GET') return cevap({ ok: true, kurulu: !!S, adresler: l.map(x => ({ a: x.a, onay: !!x.onay })), enFazla: EP_EN_FAZLA_ADRES });
  // adres ekle / çıkar: yalnız kurs müdürü; eklenen adrese onay linki gider
  if (yol === 'eposta/adres' && req.method === 'POST') {
    if (rol !== 'mudur') return cevap({ ok: false, hata: 'Adresleri yalnız kurs müdürü değiştirir' }, 403);
    const b = await req.json().catch(() => ({})), a = String(b.adres || '').trim().toLowerCase();
    if (!epGecerli(a)) return cevap({ ok: false, hata: 'E-posta adresi geçersiz' }, 400);
    if (b.sil) { await env.LINK.put('epadres:' + kurs, JSON.stringify(l.filter(x => x.a !== a))); return cevap({ ok: true }); }
    if (!S) return cevap({ ok: false, kurulu: false, hata: 'E-posta servisi henüz kurulmadı' }, 503);
    const var_ = l.find(x => x.a === a); if (var_ && var_.onay) return cevap({ ok: true, onay: true });
    if (!var_ && l.length >= EP_EN_FAZLA_ADRES) return cevap({ ok: false, hata: 'En fazla ' + EP_EN_FAZLA_ADRES + ' adres eklenebilir' }, 400);
    const s = await epSay(env, kurs); if (s.n >= (+env.EPOSTA_GUNLUK_SINIR || 12)) return cevap({ ok: false, hata: 'Bugünlük e-posta sınırı doldu; yarın tekrar deneyin' }, 429);
    const t = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
    // kurs adı istemciden alınmaz (konuya istenen metin yazılamasın): müdürün kimliğiyle kurs belgesinden okunur, okunamazsa genel ad
    const link = 'https://api.mdsinyal.com/eposta/onay?t=' + t, kursAd = (await kursAdiOku(req, kurs)) || 'mdSinyal kullanan bir sürücü kursu';
    try { await S.gonder({ kime: [a], konu: 'mdSinyal · e-posta adresinizi onaylayın', metin: `${kursAd}, bu adresi mdSinyal raporları ve yedekleri için ekledi. Onaylamak için linki açın: ${link}\nSiz eklemediyseniz bu e-postayı silin; onaylanmayan adrese başka e-posta gelmez.`,
      html: `<div style="font:15px/1.5 system-ui,sans-serif;color:#111827;max-width:520px"><p><b>${epKacis(kursAd)}</b>, bu adresi mdSinyal raporları ve yedekleri için ekledi.</p><p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Adresimi onayla</a></p><p style="color:#6b7280;font-size:13px">Siz eklemediyseniz bu e-postayı silin; onaylanmayan adrese başka e-posta gelmez. Link 7 gün geçerli.</p></div>` }); }
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
    const kime = l.filter(x => x.onay).map(x => x.a); if (!kime.length) return cevap({ ok: false, adresYok: true, hata: 'Onaylı e-posta adresi yok' }, 400);
    const ham = await req.text(); if (ham.length > 2e6) return cevap({ ok: false, hata: 'Dosya çok büyük' }, 413);  // istemci eki 1,2 milyon karakterle sınırlar
    let b; try { b = JSON.parse(ham); } catch (x) { return cevap({ ok: false, hata: 'gecersiz' }, 400); }
    const tur = EP_TUR.includes(b.tur) ? b.tur : null, donem = String(b.donem || '').replace(/[^\w-]/g, '').slice(0, 20);
    if (!tur || typeof b.html !== 'string' || b.html.length > 400e3) return cevap({ ok: false, hata: 'gecersiz' }, 400);
    let ek = null; if (b.ek) { const ad = String(b.ek.ad || '').replace(/[^\w.-]/g, '').slice(0, 80); const v = b.ek.b64;
      // eki baştan sona taramak işlemci süresini aşar: uzunluk ve uçlar denetlenir, geçersiz base64'ü sağlayıcı reddeder
      if (!/\.(xlsx|json|gz)$/.test(ad) || typeof v !== 'string' || v.length > 1.2e6 || v.length % 4 || !/^[A-Za-z0-9+/]{1,64}$/.test(v.slice(0, 64)) || !/^[A-Za-z0-9+/=]{1,64}$/.test(v.slice(-64))) return cevap({ ok: false, hata: 'ek geçersiz' }, 400); ek = { ad, b64: v }; }
    const tek = ['gunluk', 'haftalik', 'aylik'].includes(tur) && donem ? 'epgitti:' + kurs + ':' + tur + ':' + donem : null;
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
const MV = { belge: 300, metin: 200000, dosya: 10e6, resim: 1.6e6, parca: 900, ortusme: 150, kaynak: 8, kaynakKar: 14000, gomKar: 400, soru: 400, ozetKar: 24000 };
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
async function mvLlm(env, mesajlar, enCok) {
  if (!env.LLM_KEY) throw new MvHata('Yapay zekâ henüz bağlı değil', 503, { kurulu: false });
  let r;
  try { r = await fetch(env.LLM_URL || MV_LLM_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + env.LLM_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.LLM_MODEL || MV_LLM_MODEL, messages: mesajlar, reasoning_effort: 'none', temperature: 0.2, max_completion_tokens: enCok }), signal: AbortSignal.timeout(55000) }); }
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
const MV_CEVAP_ISTEM = 'Sürücü kursu personelinin mevzuat sorusunu YALNIZ aşağıda numaralanmış kaynaklara dayanarak cevaplıyorsun. Kurallar:\n' +
  '- Kaynaklarda olmayan bilgi ekleme, genel bilgini kullanma.\n' +
  '- Her cümlenin sonunda dayandığı kaynağın numarasını [1] ya da [2][3] biçiminde ver.\n' +
  '- Kaynaklarda cevap yoksa yalnız şunu yaz: Verilen kaynaklarda bu sorunun cevabı yok.\n' +
  '- Hukuki görüş ya da tavsiye verme; kaynağın ne dediğini aktar. Kaynaklar çelişiyorsa ikisini de numarasıyla belirt.\n' +
  '- Sade Türkçe, kısa yaz (en çok 6 cümle ya da madde).';
const MV_RESIM_ISTEM = 'Bu fotoğraf resmî bir yazının sayfası. Sayfada yazan metni olduğu gibi, Türkçe karakterleri koruyarak düz metne çevir. Yorum, özet ya da açıklama ekleme; yalnız metni yaz. Okunamayan yerlere [okunamadı] yaz. Fotoğrafta metin yoksa yalnız BOS yaz.';
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
  if (!POST) return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
  if (yol === 'mevzuat/yukle') {
    if (!buro) return cevap({ ok: false, hata: 'Belgeyi yalnız kurs müdürü ve ön büro yükler' }, 403);
    if (mvSinirAsti('y:' + kursId, 20)) return cevap({ ok: false, hata: 'Çok sık yükleme yapıldı; bir dakika sonra tekrar deneyin' }, 429);
    const ct = String(req.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase(), tur = MV_TUR[ct];
    if (!tur) return cevap({ ok: false, hata: 'Bu dosya türü desteklenmiyor. PDF, Word (DOCX), fotoğraf (JPEG/PNG) yükleyin ya da metni yapıştırın' }, 415);
    if (+req.headers.get('Content-Length') > MV.dosya) return cevap({ ok: false, hata: 'Dosya en çok 10 MB olabilir' }, 413);
    const dizin = await mvDizin(env, kursId);
    if (dizin.length >= MV.belge) return cevap({ ok: false, hata: 'En çok ' + MV.belge + ' belge saklanabilir; önce eski belgeleri silin' }, 409);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return cevap({ ok: false, hata: 'Dosya boş' }, 400);
    if (buf.byteLength > MV.dosya) return cevap({ ok: false, hata: 'Dosya en çok 10 MB olabilir' }, 413);
    const q = url.searchParams, tarih = /^\d{4}-\d{2}-\d{2}$/.test(q.get('tarih') || '') ? q.get('tarih') : '', sayi = mvTemiz(q.get('sayi'), 80);
    let metin = '';
    if (tur === 'metin') metin = new TextDecoder().decode(buf);
    else if (tur === 'resim') {
      if (buf.byteLength > MV.resim) return cevap({ ok: false, hata: 'Fotoğraf çok büyük; daha yakından ve tek sayfa çekin ya da metni yapıştırın' }, 413);
      if (!env.LLM_KEY) return cevap({ ok: false, kurulu: false, hata: 'Fotoğraf için yapay zekâ bağlı değil; metni yapıştırın' }, 503);
      metin = await mvLlm(env, [{ role: 'user', content: [{ type: 'text', text: MV_RESIM_ISTEM }, { type: 'image_url', image_url: { url: 'data:' + ct + ';base64,' + mvB64(new Uint8Array(buf)) } }] }], 3000);
      if (/^BOS\.?$/i.test(metin)) metin = '';
    } else {
      if (!env.AI || !env.AI.toMarkdown) return cevap({ ok: false, hata: 'Belge okuma servisi bağlı değil; metni yapıştırın' }, 503);
      let r; try { r = (await env.AI.toMarkdown([{ name: 'belge.' + tur, blob: new Blob([buf], { type: ct }) }]))[0]; } catch (x) { r = null; console.warn(JSON.stringify({ tur: 'uyari', konu: 'toMarkdown', hata: String((x && x.message) || x).slice(0, 160) })); }
      metin = r && r.format !== 'error' ? mvMdTemizle(r.data) : '';
    }
    metin = metin.replace(/\u0000/g, '').trim();
    if (metin.replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]/g, '').length < 20) return cevap({ ok: false, hata: 'Bu belgenin metni okunamadı (taranmış olabilir); metni yapıştırın' }, 422);
    metin = metin.slice(0, MV.metin);
    const ad = mvTemiz(q.get('ad'), 150) || mvTemiz((metin.split('\n').find(s => s.trim()) || '').replace(/^#+\s*/, ''), 100);
    const parcalar = mvParcala(metin);
    const bayt = await mvGom(env, parcalar.map(t => MEVZUAT_GOM.onekBelge + ad + '\n' + t));
    let ozet = '';
    if (env.LLM_KEY && !mvSinirAsti('l:' + kursId, 10)) { try { ozet = await mvOzetle(env, ad, metin); } catch (x) { ozet = ''; } }
    const id = Date.now().toString(36) + [...crypto.getRandomValues(new Uint8Array(4))].map(x => (x % 36).toString(36)).join('');
    const belge = { id, ad, tarih, sayi, tur: 'yazi', ozet, parca: parcalar.length, eklenme: new Date().toISOString() };
    const hepsi = mvHepsiEkle(await env.LINK.get(on + ':hepsi'), parcalar.map(t => ({ b: id, t })), bayt);
    if (hepsi.length > 20e6) return cevap({ ok: false, hata: 'Belge arşivi doldu; önce eski belgeleri silin' }, 409);  // KV değeri en çok 25 MiB bayt; sınır karakter: Türkçe harf 2, '…' 3 bayt
    await env.LINK.put(on + ':' + id, JSON.stringify({ ...belge, metin, parcalar }));
    await env.LINK.put(on + ':hepsi', hepsi);
    dizin.unshift(belge); await env.LINK.put(on, JSON.stringify(dizin));
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
    const soru = typeof b.soru === 'string' ? b.soru.trim() : '', k = Array.isArray(b.kaynaklar) ? b.kaynaklar : null;
    if (!soru) return cevap({ ok: false, hata: 'Soru boş' }, 400);
    if (soru.length > MV.soru) return cevap({ ok: false, hata: 'Soru en çok ' + MV.soru + ' karakter olabilir' }, 400);
    if (!k || !k.length) return cevap({ ok: false, hata: 'Kaynak yok' }, 400);
    if (k.length > MV.kaynak) return cevap({ ok: false, hata: 'En çok ' + MV.kaynak + ' kaynak gönderilebilir' }, 400);
    let top = 0; for (const x of k) { if (!x || typeof x.t !== 'string' || !x.t.trim()) return cevap({ ok: false, hata: 'Kaynak metni boş' }, 400); top += x.t.length + String(x.etiket || '').length; }
    if (top > MV.kaynakKar) return cevap({ ok: false, hata: 'Kaynaklar toplam ' + MV.kaynakKar.toLocaleString('tr-TR') + ' karakteri geçemez' }, 400);
    if (mvSinirAsti('l:' + kursId, 10)) return cevap({ ok: false, hata: 'Çok sık istek yapıldı; bir dakika sonra tekrar deneyin' }, 429);
    const govde = 'Soru: ' + soru + '\n\nKaynaklar:\n' + k.map((x, i) => '[' + (i + 1) + '] ' + mvTemiz(x.etiket, 200) + '\n' + x.t.trim()).join('\n\n');
    return cevap({ ok: true, cevap: await mvLlm(env, [{ role: 'system', content: MV_CEVAP_ISTEM }, { role: 'user', content: govde }], 900) });
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

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
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
    // kursun rapor ve yedek e-postaları (kimlik denetimi eposta() içinde)
    if (yol === 'eposta' || yol.startsWith('eposta/')) return eposta(req, env, url, yol, cevap);
    const G = 'https://graph.facebook.com/v25.0/' + env.PHONE_ID;
    // Gerçek kurs isteği: Firebase oturumu + kurs kimliği (yoksa demo yolu)
    const gercek = !!req.headers.get('Authorization') && yol !== 'yedek';
    const kursId = req.headers.get('X-Kurs') || url.searchParams.get('kurs') || '';
    let rol = null;
    if (gercek) { rol = await uyeRol(req, kursId); if (!rol || !PERSONEL.includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403); }
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
      if (req.method === 'GET') return cevap({ ok: true, bagli: !!h, no: h ? h.no : '', ad: h ? h.ad : '', sablon: (h && h.sablon) || '', gizli: !!(h && h.appSecret), ...(h && h.dog && rol === 'mudur' ? { webhook: { adres: new URL(req.url).origin + '/webhook', belirtec: h.dog } } : {}) });
      if (rol !== 'mudur') return cevap({ ok: false, hata: 'Hattı yalnız kurs müdürü bağlar' }, 403);
      let b; try { b = await req.json(); } catch (x) { return cevap({ ok: false, hata: 'Gecersiz istek' }, 400); }
      if (b.sil) { if (h) { await env.LINK.delete('hatno:' + h.phoneId); if (h.dog) await env.LINK.delete('hatdog:' + h.dog); } await env.LINK.delete('hat:' + kursId); return cevap({ ok: true, bagli: false }); }
      const phoneId = rakam(b.phoneId), token = String(b.token || '').trim(), wabaId = rakam(b.wabaId), appSecret = String(b.appSecret || '').trim(), pin = rakam(b.pin);
      const sablon = String(b.sablon || '').trim().toLowerCase(), sablonDil = String(b.sablonDil || 'tr').trim() || 'tr';
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
        if (sablon) {
          const rs = await fetch(G2 + wabaId + '/message_templates?fields=name,status,category,language&name=' + encodeURIComponent(sablon), { headers: yetki });
          const js = await rs.json().catch(() => ({})), t = ((js && js.data) || []).find(x => x.name === sablon && (x.language || '').toLowerCase().startsWith(sablonDil.toLowerCase().slice(0, 2)));
          if (!rs.ok) uyarilar.push('Şablon denetlenemedi: ' + ((js.error && js.error.message) || rs.status));
          else if (!t) uyarilar.push('“' + sablon + '” şablonu bu hesapta (' + sablonDil + ') bulunamadı');
          else if (t.status !== 'APPROVED') uyarilar.push('“' + sablon + '” şablonu henüz onaylı değil (' + t.status + ')');
          else if (t.category !== 'UTILITY') uyarilar.push('“' + sablon + '” şablonu ' + t.category + ' sınıfında; hizmet (UTILITY) sınıfı daha ucuzdur');
        }
      } else uyarilar.push('WhatsApp hesap kimliği (WABA ID) girilmedi: gelen mesaj aboneliği ve şablon denetlenmedi');
      if (h && h.phoneId !== phoneId) await env.LINK.delete('hatno:' + h.phoneId);
      // kursa özel webhook doğrulama belirteci (kursun kendi Meta uygulamasında girilir; ortak belirteç paylaşılmaz)
      const dog = (h && h.dog) || [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('');
      const kayit = { phoneId, token, no: j.display_phone_number || '', ad: j.verified_name || '', dog, ...(wabaId ? { wabaId } : {}), ...(sablon ? { sablon, sablonDil } : {}), ...(appSecret ? { appSecret } : h && h.appSecret ? { appSecret: h.appSecret } : {}) };
      await env.LINK.put('hat:' + kursId, JSON.stringify(kayit));
      await env.LINK.put('hatno:' + phoneId, kursId);
      if (!h || h.dog !== dog) await env.LINK.put('hatdog:' + dog, kursId);
      return cevap({ ok: true, bagli: true, no: kayit.no, ad: kayit.ad, kalite: j.quality_rating || '', sablon: kayit.sablon || '', gizli: !!kayit.appSecret, uyarilar, webhook: { adres: new URL(req.url).origin + '/webhook', belirtec: dog } });
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
      if (!(await metaImzaDogru(env, ham, req.headers.get('X-Hub-Signature-256'), ekGizli))) { console.warn(JSON.stringify({ tur: 'uyari', konu: 'webhook imzası geçersiz', ip: req.headers.get('CF-Connecting-IP') || '' })); return new Response('Imza gecersiz', { status: 403 }); }
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
        await env.LINK.put('gelen:' + kurs, JSON.stringify(l.slice(0, 200)));
        return new Response('ok');
      }
      // Demo hattı: yalnızca kursun numarasına, kayıtlı ALICI'dan gelenler işlenir
      if ((telId && telId !== env.PHONE_ID) || rakam(m.from).slice(-10) !== rakam(env.ALICI).slice(-10)) return new Response('ok');
      // fotoğraf ya da PDF (evrak): Meta'dan indirilir, 14 gün saklanır; mdSinyal öğrencinin dosyasına alır
      const medya = (m.type === 'image' || m.type === 'document') && env.LINK ? await medyaAl(env, m, env.WA_TOKEN, 'medya-' + m.id) : null;
      const metin = m.type === 'text' ? m.text.body : (m[m.type] && m[m.type].caption) || (m.type === 'image' ? '(fotoğraf)' : m.type === 'document' ? '(belge)' : '(' + m.type + ')');
      const demoKurs = env.LINK && !medya && m.type === 'text' ? await env.LINK.get('hatno:' + env.PHONE_ID) : null;
      const da = env.LINK && !medya && m.type === 'text' ? await dersAkisi(env, demoKurs, m.from, metin) : null;
      const c = medya ? { metin: 'Belgenizi aldık, teşekkürler. Kurs kontrol edip kaydınıza işleyecek; eksik ya da okunmuyorsa size yazacağız.', konu: 'Evrak' } : da ? da : env.LINK ? await sohbet(env, m.from, metin) : asistanCevap(metin);
      if (da && da.kurs) await kursaDusur(env, da.kurs, m, v, metin, da).catch(() => {});
      const ust = '';  // asistan cevabı yazan kişiye gider; etiket gerekmez
      const yaz = body => fetch(G + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + env.WA_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await yaz({ messaging_product: 'whatsapp', status: 'read', message_id: m.id }).catch(() => {});
      await yaz({ messaging_product: 'whatsapp', to: env.ALICI, type: 'text', text: { body: ust + c.metin, preview_url: true } }).catch(() => {});
      if (env.LINK) {
        const l = JSON.parse((await env.LINK.get('gelen')) || '[]');
        l.unshift({ id: m.id, zaman: new Date(+m.timestamp * 1000 || Date.now()).toISOString(), ad: (v.contacts && v.contacts[0] && v.contacts[0].profile && v.contacts[0].profile.name) || '', son4: m.from.slice(-4), metin, cevap: c.metin, konu: c.konu, devir: !!c.devir, yanit: (m.context && m.context.id) || null, cevapTur: medya ? null : cevapTuru(metin), medya });
        await env.LINK.put('gelen', JSON.stringify(l.slice(0, 50)));
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
      if (/^(gelen$|(hat|hatno|gelen|medya|durum|yedek|kisaad|kursad|hata|sohbet|epadres|eponay|epsay|epgitti|mbelge)[:-])/.test(anahtar)) return cevap({ ok: false }, 404);  // iç kayıtlar (e-posta adresleri ve onay belirteçleri dahil) kısa link gibi okunamaz
      // imza dönüşü: sunucu kaydı (zaman, IP, ülke, tarayıcı) yalnız imza isteğinin mührünü bilen kursa verilir (?ka=)
      if (yol.startsWith('k/takip-') && env.LINK) {
        const g = await env.LINK.getWithMetadata(anahtar), md = g.metadata || null;
        if (!g.value) return cevap({ ok: false }, 404);
        const ka = url.searchParams.get('ka') || '';
        // imza paketi (ad, imza, cihaz) yalnız mührü bilen kursa verilir; mührü olmayan eski kayıtlar eskisi gibi okunur
        if (md && md.ka && !(ka && esit(ka, md.ka))) return cevap({ ok: false }, 404);
        const bilgi = md && md.ka ? { zaman: md.zaman || '', ip: md.ip || '', ulke: md.ulke || '', ua: md.ua || '' } : null;
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
        const md = { zaman: new Date().toISOString(), ip: req.headers.get('CF-Connecting-IP') || '', ulke: (req.cf && req.cf.country) || '', ua: String(req.headers.get('User-Agent') || '').slice(0, 300), ...(ka ? { ka } : {}) };
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
    if (gercek && h.sablon && !(b.belge && b.belge.base64) && env.LINK && !(await pencereAcik(env, kursId, to))) {
      const rs = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(sablonGovde(to, h.sablon, h.sablonDil, metin)) });
      const js = await rs.json().catch(() => ({}));
      if (rs.ok) return cevap({ ok: true, id: js.messages && js.messages[0] && js.messages[0].id, sablon: true });
      return cevap({ ok: false, kod: js.error && js.error.code, hata: 'Şablonla gönderilemedi: ' + ((js.error && js.error.message) || 'Meta hatasi') }, 502);
    }
    const g = await mesajGovdesi(b, metin, to, phoneId, token);
    if (g.hata) return cevap(g.hata, 502);
    const r = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(g.govde) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const kod = j.error && j.error.code, sablon = (h && h.sablon) || env.SABLON_AD;
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
