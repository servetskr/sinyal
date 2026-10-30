// Sinyal → WhatsApp Cloud API köprüsü + kısa link deposu (Cloudflare Worker)
// Ortam: WA_TOKEN (gizli), PHONE_ID, ALICI; KV bağlaması LINK (kısa linkler 60 gün + gelen mesajlar)
// /webhook: Meta'dan gelen WhatsApp mesajları → kurs asistanı cevaplar, mesaj Sinyal'in gelen kutusuna (KV 'gelen') yazılır
// İki yol var:
//  · Demo (örnek kurs): Authorization başlığı yok → her mesaj ALICI'ya (demo telefonu) gider, yalnız ALICI'dan gelenler işlenir. Eskisi gibi.
//  · Gerçek kurs: Authorization (Firebase oturumu) + X-Kurs → kursun kendi WhatsApp hattından (KV 'hat:<kurs>') alıcının numarasına gider;
//    gelen mesajlar ve belgeler kursa ayrı tutulur ('gelen:<kurs>', 'medya-<kurs>-<id>'), yalnız kursun üyeleri okur.
const IZINLI = ['https://servetskr.github.io', 'http://localhost:4481', 'http://127.0.0.1:4481'];
const HEDEF = /^(https:\/\/servetskr\.github\.io\/sinyal\/|http:\/\/localhost:4481\/)/;
const kucuk = s => String(s || '').toLocaleLowerCase('tr');
const ASISTAN = [
  [/süre|sure|kaç gün|kac gun|kaç ay|kac ay|kaç hafta|kac hafta|ne kadar sür|ne zaman biter|bitiyor/, 'Kurs yaklaşık 6–8 hafta sürüyor: önce 34 saat teorik ders ve e-sınav, ardından 14 direksiyon dersi ve direksiyon sınavı. Akşam grubuyla çalışırken de rahatça bitirebilirsiniz.', 'Kurs süresi'],
  [/otomatik/, 'B otomatik kurs ücretimiz 26.500 TL. Peşinattan sonra kalanı 5 aya kadar taksitle ödeyebilirsiniz. Kayıt için evden başvurabilirsiniz: https://servetskr.github.io/sinyal/#/kayit', 'Fiyat · B otomatik'],
  [/manuel|b sınıf|b sinif|\bb\b|araba|otomobil/, 'B manuel kurs ücretimiz 24.000 TL. Peşinattan sonra kalanı 5 aya kadar taksitle ödeyebilirsiniz. Kayıt için evden başvurabilirsiniz: https://servetskr.github.io/sinyal/#/kayit', 'Fiyat · B manuel'],
  [/motor|motosiklet|a2/, 'A2 motosiklet kurs ücretimiz 18.500 TL; taksit yapabiliyoruz. Kayıt için evden başvurabilirsiniz: https://servetskr.github.io/sinyal/#/kayit', 'Fiyat · A2'],
  [/kamyon|c sınıf|c sinif|\bc\b/, 'C kamyon kurs ücretimiz 31.000 TL; taksit yapabiliyoruz. B ehliyetiniz varsa yetkilimiz size ayrıca bilgi verecek.', 'Fiyat · C'],
  [/fiyat|ücret|ucret|kaç para|kac para|taksit|ne kadar/, 'Kurs ücretlerimiz: B manuel 24.000 TL, B otomatik 26.500 TL, A2 motosiklet 18.500 TL, C kamyon 31.000 TL. Peşinattan sonra 5 aya kadar taksit yapıyoruz. Hangi sınıf için düşünüyorsunuz?', 'Fiyat ve taksit'],
  [/evrak|belge|rapor|gerekli|neler lazım|ne lazım/, 'Kayıt için kimlik kartı, sürücü sağlık raporu, öğrenim belgesi, adli sicil kaydı ve 2 vesikalık fotoğraf yeterli. Sağlık raporunu aile hekiminizden alabilirsiniz.', 'Evrak'],
  [/saat|ne zaman|başla|basla|grup|kurs günleri|hafta/, 'Teorik dersler hafta içi her akşam 18:30 grubunda, salı ve perşembe 10:00 sabah grubunda yapılıyor. Yeni akşam grubumuz 3 Kasım’da başlıyor.', 'Ders saatleri'],
  [/adres|nerede|nerdesiniz|konum|yer/, 'Odunpazarı / Eskişehir’deyiz. Kayıt görüşmesi için uygun olduğunuz günü yazarsanız saat ayarlayalım.', 'Adres'],
  [/kayıt|kayit|kaydol|yazıl|yazil/, 'Kaydınızı evden de yapabilirsiniz: https://servetskr.github.io/sinyal/#/kayit — isterseniz Sinyal Sürücü Kursu’na uğrayarak da kayıt olabilirsiniz.', 'Kayıt'],
  [/^(merhaba|selam|slm|mrb|iyi günler|iyi akşamlar|günaydın)\b/, 'Merhaba, Sinyal Sürücü Kursu’na hoş geldiniz. Ben kursun dijital asistanıyım. Kurs ücreti, evraklar, ders saatleri ya da kayıt hakkında sorabilirsiniz.', 'Karşılama'],
];
// Kursun sorusuna verilen kısa cevaplar (evet/hayır): asistan teşekkür eder, cevap Sinyal'de ilgili mesaja işlenir
const CEVAP = [[/^(evet|olur|tamam|tamamd[ıi]r|gelece[ğg]im|gelirim|uygun|kat[ıi]l[ıi]yorum|onayl[ıi]yorum|ok|okey)(\s|$|[.!,])/, 'olumlu'], [/^(hay[ıi]r|gelemem|gelemeyece[ğg]im|olmaz|uygun de[ğg]il|kat[ıi]lam[ıi]yorum|iptal)(\s|$|[.!,])/, 'olumsuz']];
const cevapTuru = m => { const t = kucuk(m).trim(); for (const [r, k] of CEVAP) if (r.test(t)) return k; return null; };
const asistanCevap = m => { const t = kucuk(m).trim(); if (cevapTuru(t)) return { metin: 'Teşekkürler, cevabınızı aldık ve kursa ilettik.', konu: 'Cevap' }; for (const [r, c, k] of ASISTAN) if (r.test(t)) return { metin: c, konu: k }; return { metin: 'Sorunuzu kurs yetkilimize ilettim, kısa süre içinde size dönecek. Bu arada ücret, evrak ya da ders saatleriyle ilgili sorularınızı hemen cevaplayabilirim.', konu: 'Yetkiliye devredildi', devir: true }; };
// Demo hattına yazan adayla adım adım sohbet (durum KV'de 1 gün tutulur): kayıt → sınıf → bilgi → link / randevu / aranma
const KURS_AD = 'Sinyal Sürücü Kursu', KAYIT_LINK = 'https://servetskr.github.io/sinyal/#/kayit', KURS_ADRES = 'Vişnelik Mah. Atatürk Blv. No:12, Odunpazarı / Eskişehir';
const DEMO_SINIF = [
  ['B manuel (otomobil)', '24.000 TL', 34, 14, /manuel|otomobil|araba|\bb\b/],
  ['B otomatik', '26.500 TL', 34, 14, /otomatik/],
  ['A2 motosiklet', '18.500 TL', 34, 14, /motor|motosiklet|\ba2\b/],
  ['C kamyon', '31.000 TL', 34, 20, /kamyon|\bc\b/],
];
const MENU = 'Size nasıl yardımcı olabilirim?\n\n1. Kayıt ve ücretler\n2. Gerekli belgeler\n3. Ders saatleri\n4. Adres\n5. Yetkiliyle görüşmek\n\nSeçtiğiniz maddenin rakamını yazmanız yeterli (örneğin 1).';
const SINIF_MENU = 'Hangi ehliyet sınıfını düşünüyorsunuz?\n\n' + DEMO_SINIF.map((s, i) => `${i + 1}. ${s[0]} · ${s[1]}`).join('\n') + '\n\nSeçtiğiniz sınıfın rakamını yazmanız yeterli (örneğin 1).';
const sinifBilgi = s => `*${s[0]}*\n\nÜcret: ${s[1]} (peşinattan sonra 5 aya kadar taksit)\nEğitim: ${s[2]} saat teorik ders ve ${s[3]} direksiyon dersi\nSüre: yaklaşık 6–8 hafta\n\nNasıl devam edelim?\n\n1. Evden kayıt linkini gönder\n2. Kursa gelip kayıt olmak istiyorum\n3. Yetkili beni arasın\n\nSeçtiğiniz maddenin rakamını yazmanız yeterli.`;
const BELGE = 'Kayıt için gerekenler:\n\n• Kimlik kartı\n• Sürücü sağlık raporu (aile hekiminizden alabilirsiniz)\n• Öğrenim belgesi\n• Adli sicil kaydı (e-Devlet)\n• 2 vesikalık fotoğraf\n\nBelgelerin fotoğrafını bu numaraya gönderebilirsiniz.';
const SAAT = 'Teorik dersler:\n\n• Akşam grubu: hafta içi her akşam 18:30\n• Sabah grubu: salı ve perşembe 10:00\n\nYeni akşam grubumuz yakında başlıyor; kontenjan sınırlı.';
const ADRES = `Adresimiz: ${KURS_ADRES}\n\nGelmeden önce yazarsanız sizi bekleriz.`;
async function sohbet(env, kimden, metin) {
  const anahtar = 'sohbet:' + rakam(kimden); let d = {};
  try { d = JSON.parse((await env.LINK.get(anahtar)) || '{}'); } catch (x) { d = {}; }
  const t = kucuk(metin).trim(), no = (t.match(/^([1-9])\s*[.)]?$/) || [])[1], selam = /^(merhaba|selam|slm|mrb|iyi günler|iyi akşamlar|günaydın)/.test(t);
  const sinifBul = () => DEMO_SINIF.findIndex(s => s[4].test(t));
  let c = null;
  if (d.adim === 'sinif' && ((no && DEMO_SINIF[no - 1]) || sinifBul() >= 0)) { const i = no ? +no - 1 : sinifBul(); c = { metin: sinifBilgi(DEMO_SINIF[i]), konu: 'Kayıt · ' + DEMO_SINIF[i][0], d: { adim: 'devam', sinif: i } }; }
  else if (d.adim === 'devam' && no === '1') c = { metin: `Kaydınızı evden birkaç dakikada yapabilirsiniz:\n${KAYIT_LINK}\n\nBilgilerinizi girip belgelerinizin fotoğrafını yüklüyor, sözleşmeyi telefondan imzalıyorsunuz. Takıldığınız yerde buraya yazmanız yeterli.`, konu: 'Kayıt · link gönderildi', d: {} };
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
export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': IZINLI.includes(origin) ? origin : IZINLI[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Kurs, X-Yedek, X-Sikistirma', 'Access-Control-Expose-Headers': 'X-Sikistirma', 'Vary': 'Origin' };
    const cevap = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const yol = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ''));
    const G = 'https://graph.facebook.com/v25.0/' + env.PHONE_ID;
    // Gerçek kurs isteği: Firebase oturumu + kurs kimliği (yoksa demo yolu)
    const gercek = !!req.headers.get('Authorization') && yol !== 'yedek';
    const kursId = req.headers.get('X-Kurs') || url.searchParams.get('kurs') || '';
    let rol = null;
    if (gercek) { rol = await uyeRol(req, kursId); if (!rol || !PERSONEL.includes(rol)) return cevap({ ok: false, hata: 'Yetki yok' }, 403); }
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
      if (req.method === 'GET') return cevap({ ok: true, bagli: !!h, no: h ? h.no : '', ad: h ? h.ad : '' });
      if (rol !== 'mudur') return cevap({ ok: false, hata: 'Hattı yalnız kurs müdürü bağlar' }, 403);
      let b; try { b = await req.json(); } catch (x) { return cevap({ ok: false, hata: 'Gecersiz istek' }, 400); }
      if (b.sil) { if (h) await env.LINK.delete('hatno:' + h.phoneId); await env.LINK.delete('hat:' + kursId); return cevap({ ok: true, bagli: false }); }
      const phoneId = rakam(b.phoneId), token = String(b.token || '').trim();
      if (!phoneId || token.length < 20) return cevap({ ok: false, hata: 'Telefon numarası kimliği ve erişim anahtarı gerekli' }, 400);
      // DEMO_HAT_KURSLAR (virgülle kurs kimlikleri): Sinyal'in kendi deneme kursları demo hattını gönderim için bağlayabilir; gelen mesajlar yine demoya gider
      const demoIzin = String(env.DEMO_HAT_KURSLAR || '').split(',').map(s => s.trim()).filter(Boolean).includes(kursId);
      if (!demoIzin && [env.PHONE_ID, env.PHONE_ID_USTA, env.PHONE_ID_MUDUR].filter(Boolean).map(rakam).includes(phoneId)) return cevap({ ok: false, hata: 'Bu, Sinyal demo hattı; kursun kendi hattını girin' }, 400);
      const sahip = await env.LINK.get('hatno:' + phoneId);
      if (sahip && sahip !== kursId) return cevap({ ok: false, hata: 'Bu hat başka bir kursa bağlı' }, 409);
      const r = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '?fields=display_phone_number,verified_name', { headers: { Authorization: 'Bearer ' + token } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return cevap({ ok: false, hata: 'Meta hattı doğrulamadı: ' + ((j.error && j.error.message) || r.status) }, 400);
      if (h && h.phoneId !== phoneId) await env.LINK.delete('hatno:' + h.phoneId);
      await env.LINK.put('hat:' + kursId, JSON.stringify({ phoneId, token, no: j.display_phone_number || '', ad: j.verified_name || '' }));
      await env.LINK.put('hatno:' + phoneId, kursId);
      return cevap({ ok: true, bagli: true, no: j.display_phone_number || '', ad: j.verified_name || '' });
    }
    // Meta webhook doğrulaması (abonelik kurulurken bir kez)
    if (yol === 'webhook' && req.method === 'GET') {
      if (url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === 'sinyal-dogrulama') return new Response(url.searchParams.get('hub.challenge') || '', { status: 200 });
      return new Response('Dogrulanamadi', { status: 403 });
    }
    if (yol === 'webhook' && req.method === 'POST') {
      let p; try { p = await req.json(); } catch (x) { return new Response('ok'); }
      const v = p && p.entry && p.entry[0] && p.entry[0].changes && p.entry[0].changes[0] && p.entry[0].changes[0].value;
      // gönderilen mesajların durumu (gönderildi / iletildi / okundu): Sinyal ekranında ✓✓ olarak görünür
      const st = v && v.statuses;
      if (st && st.length) {
        if (env.LINK) { const SIRA = { sent: 1, delivered: 2, read: 3, failed: 9 }; for (const s of st) { const k = 'durum-' + s.id, eski = await env.LINK.get(k); if ((SIRA[s.status] || 0) > (SIRA[eski] || 0)) await env.LINK.put(k, s.status, { expirationTtl: 1209600 }); } }
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
        const l = JSON.parse((await env.LINK.get('gelen:' + kurs)) || '[]');
        l.unshift({ id: m.id, zaman: new Date(+m.timestamp * 1000 || Date.now()).toISOString(), ad: (v.contacts && v.contacts[0] && v.contacts[0].profile && v.contacts[0].profile.name) || '', tel: m.from, son4: m.from.slice(-4), metin, cevap: '', konu: medya ? 'Evrak' : '', devir: true, yanit: (m.context && m.context.id) || null, cevapTur: medya ? null : cevapTuru(metin), medya });
        await env.LINK.put('gelen:' + kurs, JSON.stringify(l.slice(0, 200)));
        return new Response('ok');
      }
      // Demo hattı: yalnızca kursun numarasına, kayıtlı ALICI'dan gelenler işlenir
      if ((telId && telId !== env.PHONE_ID) || rakam(m.from).slice(-10) !== rakam(env.ALICI).slice(-10)) return new Response('ok');
      // fotoğraf ya da PDF (evrak): Meta'dan indirilir, 14 gün saklanır; Sinyal öğrencinin dosyasına alır
      const medya = (m.type === 'image' || m.type === 'document') && env.LINK ? await medyaAl(env, m, env.WA_TOKEN, 'medya-' + m.id) : null;
      const metin = m.type === 'text' ? m.text.body : (m[m.type] && m[m.type].caption) || (m.type === 'image' ? '(fotoğraf)' : m.type === 'document' ? '(belge)' : '(' + m.type + ')');
      const c = medya ? { metin: 'Belgenizi aldık, teşekkürler. Kurs kontrol edip kaydınıza işleyecek; eksik ya da okunmuyorsa size yazacağız.', konu: 'Evrak' } : env.LINK ? await sohbet(env, m.from, metin) : asistanCevap(metin);
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
      if (env.LINK) await Promise.all(ids.map(async id => { const d = await env.LINK.get('durum-' + id); if (d) durum[id] = d; }));
      return cevap({ ok: true, durum });
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
      if (!yol) return cevap({ ok: true, hazir: !!(env.WA_TOKEN && env.PHONE_ID && env.ALICI), belge: true, kisa: !!env.LINK, kursHatti: true, demoHatlari: { usta: !!env.PHONE_ID_USTA, mudur: !!env.PHONE_ID_MUDUR } });
      const anahtar = yol.startsWith('k/') ? yol.slice(2) : yol;
      if (/^(gelen$|(hat|hatno|gelen|medya|durum|yedek)[:-])/.test(anahtar)) return cevap({ ok: false }, 404);  // iç kayıtlar kısa link gibi okunamaz
      const v = env.LINK ? await env.LINK.get(anahtar) : null;
      if (yol.startsWith('k/')) return cevap(v ? { ok: true, hedef: v } : { ok: false }, v ? 200 : 404);
      if (v) return Response.redirect(v, 302);
      return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font:16px system-ui;padding:24px">Bu linkin süresi dolmuş ya da link hatalı. Sürücü kursunuza yazıp yeni bağlantı isteyin.</p>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (req.method !== 'POST' || (!gercek && !IZINLI.includes(origin))) return cevap({ ok: false, hata: 'Izin yok' }, 403);
    let b; try { b = await req.json(); } catch (x) { return cevap({ ok: false, hata: 'Gecersiz istek' }, 400); }
    if (yol === 'kisa') {
      if (!env.LINK) return cevap({ ok: false, hata: 'Kisa link deposu bagli degil' }, 500);
      const hedef = String((b && b.hedef) || '');
      if (!HEDEF.test(hedef) || hedef.length > 200000) return cevap({ ok: false, hata: 'Gecersiz hedef' }, 400);
      const harf = 'abcdefghjkmnpqrstuvwxyz23456789', rast = [...crypto.getRandomValues(new Uint8Array(6))].map(x => harf[x % harf.length]).join('');
      const slug = (sade(b.ad) || 'link') + '-' + rast;
      await env.LINK.put(slug, hedef, { expirationTtl: 5184000 });
      if (b.takip) await env.LINK.put('takip-' + sade(b.takip), hedef, { expirationTtl: 5184000 });
      return cevap({ ok: true, slug });
    }
    if (yol) return cevap({ ok: false, hata: 'Bilinmeyen adres' }, 404);
    let metin = String((b && b.metin) || '').trim().slice(0, 4000);
    if (!metin) return cevap({ ok: false, hata: 'Mesaj bos' }, 400);
    // Gönderen hat ve alıcı: gerçek kursta kursun kendi hattı ve istekteki numara; demoda alıcının rolüne göre demo hattı ve ALICI
    let phoneId = env.PHONE_ID, token = env.WA_TOKEN, to = env.ALICI;
    if (!gercek) { const d = demoHatSec(env, metin, String(b.rol || '')); [phoneId, token] = d.hat; metin = d.metin; }
    if (gercek) {
      const h = await kursHat(env, kursId);
      if (!h) return cevap({ ok: false, hata: 'Kursun WhatsApp hattı bağlı değil (Ayarlar › Kurs bilgileri)' }, 409);
      to = rakam(b.tel);
      if (!/^\d{11,15}$/.test(to)) return cevap({ ok: false, hata: 'Alıcının telefon numarası geçersiz' }, 400);
      phoneId = h.phoneId; token = h.token;
    }
    const g = await mesajGovdesi(b, metin, to, phoneId, token);
    if (g.hata) return cevap(g.hata, 502);
    const r = await fetch('https://graph.facebook.com/v25.0/' + phoneId + '/messages', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(g.govde) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return cevap({ ok: false, kod: j.error && j.error.code, hata: (j.error && j.error.message) || 'Meta hatasi' }, 502);
    return cevap({ ok: true, id: j.messages && j.messages[0] && j.messages[0].id });
  },
};
