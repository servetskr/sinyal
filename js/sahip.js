// mdSinyal sahip araçları: bütün hesaplar tek yerde (kurs personeli, öğrenciler, mdSinyal Yönetim ve ortak).
// mdSinyal Yönetim panelinin “Hesaplar” bölümünde açılır (yalnız Servet; ortak görmez).
// Yetki Firebase güvenlik kurallarından değil, Google hesabından gelir: Firebase projesinin sahibi olan Google hesabıyla
// bağlanılır, Google IAM izin verirse işlem yapılır. Sunucu, gizli anahtar yok; erişim belirteci yalnız bellekte durur (1 saat).
import { e, ik, pencere, kapatPencere, bildir, tl, siteLink } from './ui.js?v=224';
import { S, kaydet, islem, bulutKanca } from './veri.js?v=224';
import { ogrenciPanelMetni, WORKER } from './bulut.js?v=224';
import { EMU } from './firebase-ayar.js?v=224';
import { kabuk as epKabuk, kutular, bolum, satirlar, bos, not, nokta, dugme, R, SITE } from './eposta-kabuk.js?v=224';

// EMU (firebase-ayar.js, yalnız localhost + açık işaret): REST istekleri yerel emülatöre gider, Google onayı yerine emülatörün yönetici belirteci kullanılır
const PROJE = EMU ? EMU.proje : 'sinyal-5d37a';
const ISTEMCI = '451344576006-sua0mu4d4qcssc0lv8g01qic26hr6os7.apps.googleusercontent.com';  // Google OAuth istemci kimliği (herkese açık bilgidir; yetkiyi Google hesabı verir)
const KAPSAM = 'https://www.googleapis.com/auth/cloud-platform';
const IT = (EMU ? EMU.auth + '/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com') + '/v1/projects/' + PROJE;
const FS_AD = 'projects/' + PROJE + '/databases/(default)/documents';
const FS = (EMU ? 'http://' + EMU.fsHost + ':' + EMU.fsPort : 'https://firestore.googleapis.com') + '/v1/' + FS_AD;
export const DESTEK_TEL = '905013636536';
const YONETIM_KURS = 'mdSinyal Yönetim';
const ROL = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Öğretmen', ortak: 'Ortak', ogrenci: 'Öğrenci', demo: 'Demo' };
const SUZGEC = [['hepsi', 'Hepsi'], ['personel', 'Kurs personeli'], ['ogrenci', 'Öğrenciler'], ['yonetim', 'Yönetim']];

const SIL_GUN = 7;  // silinen hesap bu kadar gün geri alınabilir, sonra kalıcı silinir
let silinecekler = [], kursIst = {}, destekler = [], gorunum = 'hesaplar', alt = 'kurslar', destekAlt = 'talepler';
let belirtec = null, bitis = 0, hesaplar = null, suzgec = 'hepsi', arama = '', kok = null, yukleniyor = false, hataMetni = '', gomulu = false, ipucu = '';

// Google onayı sekme açık kaldıkça (en çok 1 saat) hatırlanır; her yenilemede yeniden onay istenmez
const SAKLA = 'sinyal-sahip-onay';
try { const o = JSON.parse(sessionStorage.getItem(SAKLA) || 'null'); if (o && o.bitis > Date.now()) { belirtec = o.t; bitis = o.bitis; } } catch (x) { }
const rastgele = (n, harf = 'abcdefghijkmnpqrstuvwxyz23456789') => [...crypto.getRandomValues(new Uint8Array(n))].map(x => harf[x % harf.length]).join('');
// okunması ve WhatsApp'tan yazılması kolay geçici şifre: 4 harf + 4 rakam (karışan harfler yok)
const geciciSifre = () => rastgele(4, 'abcdefghkmnprstuvyz') + rastgele(4, '23456789');
const girisAdresi = () => location.origin + location.pathname;
// Mesajlardaki giriş linkleri (belgeler/link-standardi.md): mdsinyal.com/ogrenci, /ogretmen, /yonetim; kurs ekibi /giris
const girisLinki = rol => siteLink({ ogrenci: 'ogrenci', usta: 'ogretmen', yonetim: 'yonetim' }[rol] || 'giris');

// ---- Google bağlantısı ----
function gsiYukle() {
  return new Promise((coz, red) => {
    if (window.google && google.accounts && google.accounts.oauth2) return coz();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => coz(); s.onerror = () => red(new Error('Google girişi yüklenemedi; bağlantını kontrol et'));
    document.head.appendChild(s);
  });
}
async function baglan() {
  if (EMU) { belirtec = 'owner'; bitis = Date.now() + 3600e3; return; }  // emülatörde 'Bearer owner' yönetici yetkisidir (kurallara takılmaz, IAM gibi)
  if (!ISTEMCI) throw new Error('Sahip paneli henüz Google’a tanıtılmadı (istemci kimliği eksik)');
  await gsiYukle();
  await new Promise((coz, red) => {
    const c = google.accounts.oauth2.initTokenClient({
      client_id: ISTEMCI, scope: KAPSAM, ...(ipucu ? { login_hint: ipucu } : {}),
      callback: r => { if (r.error) return red(new Error(r.error_description || r.error)); belirtec = r.access_token; bitis = Date.now() + ((+r.expires_in || 3600) - 60) * 1000; try { sessionStorage.setItem(SAKLA, JSON.stringify({ t: belirtec, bitis })); } catch (x) { } coz(); },
      error_callback: x => red(new Error(x && x.type === 'popup_closed' ? 'Google penceresi kapatıldı' : 'Google penceresi açılamadı; açılır pencerelere izin ver')),
    });
    c.requestAccessToken({ prompt: '' });  // daha önce izin verildiyse Google penceresi kendiliğinden kapanır
  });
}
const bagli = () => !!belirtec && Date.now() < bitis;
// Google bağlantısı olmadan da liste açılır: Firestore okumaları Yönetim oturumunun Firebase kimliğiyle yapılır
// (güvenlik kuralı: sahip hesabı her şeyi okuyabilir). Şifre, kapatma, silme ve link işlemleri Google ister.
const okuyabilir = () => bagli() || !!(bulutKanca && bulutKanca.yetki);

async function api(url, govde, yontem) {
  let yetki = null;
  if (bagli()) yetki = 'Bearer ' + belirtec;
  else if (url.startsWith(FS) && bulutKanca && bulutKanca.yetki && (!yontem || yontem === 'GET') && (!govde || /:(batchGet|runQuery)$/.test(url))) { try { yetki = (await bulutKanca.yetki()).Authorization; } catch (x) { } }
  if (!yetki) { belirtec = null; throw Object.assign(new Error('Bu işlem için Google hesabınla onay ver'), { yetki: true }); }
  const r = await fetch(url, { method: yontem || (govde ? 'POST' : 'GET'), headers: { Authorization: yetki, ...(govde ? { 'Content-Type': 'application/json' } : {}) }, body: govde ? JSON.stringify(govde) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) { belirtec = null; try { sessionStorage.removeItem(SAKLA); } catch (x) { } }
    const m = (j.error && j.error.message) || ('HTTP ' + r.status);
    throw Object.assign(new Error(r.status === 401 ? 'Google bağlantısının süresi doldu; yeniden bağlan' : r.status === 403 ? 'Bu Google hesabının mdSinyal projesinde yetkisi yok (' + m + ')' : 'Google: ' + m), { yetki: r.status === 401, durum: (j.error && j.error.status) || '' });
  }
  return j;
}

// ---- Firestore (REST) ----
const deger = v => !v ? null : 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue
  : 'timestampValue' in v ? v.timestampValue : 'mapValue' in v ? alanlar(v.mapValue.fields) : 'arrayValue' in v ? (v.arrayValue.values || []).map(deger) : null;
const alanlar = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, deger(v)]));
async function belgeler(yollar, maske) {
  const sonuc = {};
  for (let i = 0; i < yollar.length; i += 100) {
    const j = await api(FS + ':batchGet', { documents: yollar.slice(i, i + 100).map(y => FS_AD + '/' + y), ...(maske ? { mask: { fieldPaths: maske } } : {}) });
    for (const x of j) if (x.found) sonuc[x.found.name.slice(FS_AD.length + 1)] = alanlar(x.found.fields);
  }
  return sonuc;
}
const belgeSil = yol => api(FS + '/' + yol, null, 'DELETE');

// ---- veriler ----
async function yukle() {
  let users = [], sayfa = '';
  if (bagli()) do {
    const j = await api(IT + '/accounts:batchGet?maxResults=1000' + (sayfa ? '&nextPageToken=' + encodeURIComponent(sayfa) : ''));
    users = users.concat(j.users || []); sayfa = j.nextPageToken || '';
  } while (sayfa);
  else do {
    const j = await api(FS + '/kullanicilar?pageSize=300' + (sayfa ? '&pageToken=' + encodeURIComponent(sayfa) : ''));
    users = users.concat((j.documents || []).map(d => ({ localId: d.name.split('/').pop(), firestore: true }))); sayfa = j.nextPageToken || '';
  } while (sayfa);
  const kd = await belgeler(users.map(u => 'kullanicilar/' + u.localId));
  const kb = uid => kd['kullanicilar/' + uid] || null;
  // kurs listesi hesaplardan ve kurslar koleksiyonunun kendisinden gelir: hesabı kalmamış (yetim) kurs da görünür ve silinebilir.
  // showMissing: kurs belgesi silinmiş ama alt verisi (v, uyeler…) kalmış kurs da listelenir ("Adı bilinmeyen kurs"), yoksa veri gizli kalır
  let tumKurs = [];
  const kursListe = async ek => { let l = [], sy = ''; do { const j = await api(FS + '/kurslar?pageSize=300' + ek + '&mask.fieldPaths=ad' + (sy ? '&pageToken=' + encodeURIComponent(sy) : '')); l = l.concat((j.documents || []).map(d => d.name.split('/').pop())); sy = j.nextPageToken || ''; } while (sy); return l; };
  try { tumKurs = await kursListe('&showMissing=true'); } catch (x) { try { tumKurs = await kursListe(''); } catch (y) { } }
  const kursIdler = [...new Set(Object.values(kd).map(d => d.kurs).filter(x => typeof x === 'string' && x).concat(tumKurs))];
  const kurslar = await belgeler(kursIdler.map(k => 'kurslar/' + k), ['ad', 'sehir']);
  const uyeler = await belgeler(users.filter(u => kb(u.localId) && kb(u.localId).kurs && kb(u.localId).rol !== 'ogrenci').map(u => 'kurslar/' + kb(u.localId).kurs + '/uyeler/' + u.localId));
  const ogr = await belgeler(users.filter(u => kb(u.localId) && kb(u.localId).rol === 'ogrenci' && kb(u.localId).kod).map(u => 'kurslar/' + kb(u.localId).kurs + '/ogrenciler/' + kb(u.localId).kod), ['v']);
  hesaplar = users.map(u => {
    const d = kb(u.localId) || {}, kurs = d.kurs || null, kursAd = kurs ? ((kurslar['kurslar/' + kurs] || {}).ad || 'Adı bilinmeyen kurs') : null;
    const uye = kurs ? uyeler['kurslar/' + kurs + '/uyeler/' + u.localId] || null : null;
    const rol = d.demo === true ? 'demo' : d.rol === 'ogrenci' ? 'ogrenci' : uye ? uye.rol : null;
    const telM = String(u.email || '').match(/^(90\d{10})\./);
    let ad = (uye && uye.ad) || u.displayName || '';
    let ogrTel = '';
    if (rol === 'ogrenci') { try { const k = JSON.parse((ogr['kurslar/' + kurs + '/ogrenciler/' + d.kod] || {}).v || '{}').kursiyerler[0]; ad = [k.ad, k.soyad].filter(Boolean).join(' ') || ad; ogrTel = String(k.tel || '').replace(/\D/g, '').replace(/^0/, '90'); } catch (x) { } }
    const yonetim = kursAd === YONETIM_KURS || /@yonetim\.sinyal\.invalid$/.test(u.email || '');
    const kullaniciAdi = /@yonetim\.sinyal\.invalid$/.test(u.email || '') ? u.email.split('@')[0] : '';
    return {
      uid: u.localId, eposta: u.email || (uye && uye.eposta) || '', kullaniciAdi, ad: ad || kullaniciAdi || (telM || rol === 'ogrenci' ? 'Öğrenci' : u.email || (uye && uye.eposta) || 'Adsız hesap'),
      tel: telM ? telM[1] : ogrTel, rol, usta: (uye && uye.usta) || null, kurs, kursAd, yonetim, kapali: !!u.disabled,
      olusturma: u.createdAt ? +u.createdAt : 0, sonGiris: u.firestore ? null : u.lastLoginAt ? +u.lastLoginAt : 0,
    };
  });
  // silinen hesaplar: 7 gün içinde geri alınabilir; süresi dolanlar şimdi kalıcı silinir
  let sl = [];
  try { const j = await api(FS + '/sahipSilinecek?pageSize=300'); sl = (j.documents || []).map(d => ({ ...alanlar(d.fields), uid: d.name.split('/').pop() })); } catch (x) { }
  if (bagli()) for (const x of sl.filter(x => kalanGun(x) <= 0)) { try { await kaliciSil(x); } catch (y) { } }
  silinecekler = sl.filter(x => kalanGun(x) > 0);
  for (const h of hesaplar) { const x = silinecekler.find(y => y.uid === h.uid); if (x) h.silinecek = x.zaman; }
  // her kursun verisi: istatistik ve destek talepleri
  kursIst = {}; destekler = [];
  for (const k of kursIdler) {
    const ad = (kurslar['kurslar/' + k] || {}).ad || 'Adı bilinmeyen kurs';
    if (ad === YONETIM_KURS) continue;
    try { kursIst[k] = await kursIstatistik(k, ad, (kurslar['kurslar/' + k] || {}).sehir || ''); } catch (x) { kursIst[k] = { ad, hata: turkceHata(x) }; }
    if (!kurslar['kurslar/' + k]) kursIst[k].belgeYok = true;  // kurs kaydı silinmiş, alt verisi kalmış: yalnız silinebilir, hesap açılmaz
  }
}
const kalanGun = x => SIL_GUN - Math.floor((Date.now() - Date.parse(x.zaman)) / 864e5);
// kursun mdSinyal verisi (kurslar/{kurs}/v): diziler parça parça, diğerleri tek belge
async function kursVerisi(k) {
  let docs = [], sayfa = '';
  do { const j = await api(FS + '/kurslar/' + k + '/v?pageSize=300' + (sayfa ? '&pageToken=' + encodeURIComponent(sayfa) : '')); docs = docs.concat(j.documents || []); sayfa = j.nextPageToken || ''; } while (sayfa);
  const V = {}, parca = {}, yer = new Map();
  for (const d of docs) {
    const f = alanlar(d.fields); if (!f.a) continue;
    if (f.d) {
      const l = parca[f.a] = parca[f.a] || []; for (const x of Object.values(f.i || {})) { if (x && typeof x.v === 'string') try { l.push([+x.x || 0, JSON.parse(x.v)]); } catch (y) { } }
      // öğrenci kaydının hangi parça belgesinde durduğu ve ham sıra değeri: Hesap oluştur › Öğrenci kaydı yerinde günceller (bulut.js biçimi: i.{kimlik} = { v, x })
      if (f.a === 'kursiyerler') { const ham = (d.fields.i && d.fields.i.mapValue && d.fields.i.mapValue.fields) || {}; for (const [id, r] of Object.entries(ham)) yer.set(id, { belge: d.name, zaman: d.updateTime, x: r && r.mapValue && r.mapValue.fields ? r.mapValue.fields.x : undefined }); }
    }
    else if (typeof f.t === 'string') { try { V[f.a] = JSON.parse(f.t); } catch (y) { } }
  }
  for (const [a, l] of Object.entries(parca)) V[a] = l.sort((p, q) => p[0] - q[0]).map(p => p[1]);
  Object.defineProperty(V, '_yer', { value: yer, enumerable: false });  // yedek dosyasına yazılmaz
  return V;
}
async function kursIstatistik(k, ad, sehir) {
  const V = await kursVerisi(k), ay = new Date().toISOString().slice(0, 7), otuz = new Date(Date.now() - 30 * 864e5).toISOString();
  let kayit = [];
  try {
    const j = await api(FS + '/kurslar/' + k + ':runQuery', { structuredQuery: { from: [{ collectionId: 'kayit' }], where: { fieldFilter: { field: { fieldPath: 'zaman' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: otuz } } }, select: { fields: [{ fieldPath: 'ne' }, { fieldPath: 'uid' }, { fieldPath: 'zaman' }] }, limit: 5000 } });
    kayit = j.filter(x => x.document).map(x => alanlar(x.document.fields));
  } catch (x) { }
  const ks = V.kursiyerler || [], cevap = V.destekCevap || {};
  (V.destek || []).forEach(t => destekler.push({ ...t, kurs: k, kursAd: ad, kanal: 'mdSinyal', ...(cevap[t.id] || {}) }));
  return {
    ad, sehir, kursiyer: ks.length, aktif: ks.filter(x => x.asama !== 'Ehliyet' && !x.pasif && !x.silindi).length,
    dersAy: (V.dersler || []).filter(x => String(x.tarih || '').startsWith(ay)).length,
    tahsilAy: (V.hareket || []).filter(x => x.tur === 'Gelir' && String(x.tarih || '').startsWith(ay)).reduce((t, x) => t + (+x.tutar || 0), 0),
    gonderimAy: (V.gonderimler || []).filter(x => String(x.zaman || '').startsWith(ay)).length,
    adaylar: (V.adaylar || []).length,
    oturum: kayit.filter(x => x.ne === 'Giriş yaptı').length, islem: kayit.length,
    aktifKisi: new Set(kayit.map(x => x.uid).filter(Boolean)).size,
    son: kayit.reduce((m, x) => (x.zaman || '') > m ? x.zaman : m, ''), destekCevap: cevap,
  };
}

// ---- işlemler ----
async function sifreVer(h) {
  const sifre = geciciSifre();
  await api(IT + '/accounts:update', { localId: h.uid, password: sifre, ...(h.kapali ? { disableUser: false } : {}) });
  h.kapali = false;
  // öğrenci ilk girişte kendi şifresini belirler
  if (h.rol === 'ogrenci') await api(FS + '/kullanicilar/' + h.uid + '?updateMask.fieldPaths=ilkGiris&currentDocument.exists=true', { fields: { ilkGiris: { booleanValue: true } } }, 'PATCH').catch(() => { });
  return sifre;
}
const girisKapat = async (h, kapat) => { await api(IT + '/accounts:update', { localId: h.uid, disableUser: kapat }); h.kapali = kapat; };
// Silme: hesap hemen kapanır (kimse giremez), 7 gün içinde geri alınabilir; süre dolunca kalıcı silinir
async function hesapSil(h) {
  const zaman = new Date().toISOString();
  await api(IT + '/accounts:update', { localId: h.uid, disableUser: true });
  const x = { uid: h.uid, eposta: h.eposta, ad: h.ad, kurs: h.kurs || '', kursAd: h.kursAd || '', rol: h.rol || '', zaman };
  await api(FS + '/sahipSilinecek/' + h.uid, { fields: Object.fromEntries(Object.entries(x).map(([a, b]) => [a, { stringValue: String(b) }])) }, 'PATCH');
  h.kapali = true; h.silinecek = zaman; silinecekler = silinecekler.filter(y => y.uid !== h.uid).concat(x);
}
async function silmeGeriAl(x) {
  await api(IT + '/accounts:update', { localId: x.uid, disableUser: false });
  await belgeSil('sahipSilinecek/' + x.uid);
  silinecekler = silinecekler.filter(y => y.uid !== x.uid);
  const h = (hesaplar || []).find(y => y.uid === x.uid); if (h) { h.kapali = false; delete h.silinecek; }
}
async function kaliciSil(x) {
  try { await api(IT + '/accounts:delete', { localId: x.uid }); } catch (y) { if (!/USER_NOT_FOUND/.test(y.message)) throw y; }
  await belgeSil('kullanicilar/' + x.uid).catch(() => { });
  if (x.kurs && x.rol && x.rol !== 'ogrenci') await belgeSil('kurslar/' + x.kurs + '/uyeler/' + x.uid).catch(() => { });
  await belgeSil('sahipSilinecek/' + x.uid).catch(() => { });
  silinecekler = silinecekler.filter(y => y.uid !== x.uid); if (hesaplar) hesaplar = hesaplar.filter(y => y.uid !== x.uid);
}
async function davetKodu(yonetim) {
  const kod = rastgele(20), simdi = new Date();
  await api(FS + '/kursDavetleri?documentId=' + kod, { fields: { olusturan: { stringValue: 'sahip' }, not: { stringValue: yonetim ? YONETIM_KURS : 'Sahip panelinden' }, tarih: { timestampValue: simdi.toISOString() }, son: { timestampValue: new Date(+simdi + 30 * 864e5).toISOString() } } });
  return kod;
}
// Hesap açma linki: mdsinyal.com/h/<kod> (kurs), mdsinyal.com/yonetim/<kod> (Yönetim kurulumu); 404.html uygulama ekranına çevirir
async function davetLinki(yonetim) { return siteLink((yonetim ? 'yonetim/' : 'h/') + await davetKodu(yonetim)); }

// ---- metinler ----
const zamanMetni = ms => {
  if (ms === null) return '';
  if (!ms) return 'hiç girmedi';
  const g = Math.floor((Date.now() - ms) / 864e5);
  if (g <= 0) return 'bugün girdi'; if (g === 1) return 'dün girdi'; if (g < 30) return g + ' gün önce girdi';
  return new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' girdi';
};
const telGoster = t => t ? '0' + t.slice(2, 5) + ' ' + t.slice(5, 8) + ' ' + t.slice(8, 10) + ' ' + t.slice(10) : '';
const rolAd = h => h.yonetim ? (h.rol === 'ortak' ? 'Ortak · yalnız görür' : 'mdSinyal Yönetim') : ROL[h.rol] || 'Kursa bağlı değil';
const kimlik = h => h.kullaniciAdi ? 'kullanıcı adı ' + h.kullaniciAdi : h.tel ? telGoster(h.tel) : h.eposta;
function sifreMesaji(h, sifre) {
  const ad = h.ad && !/^(Öğrenci|Adsız hesap)$/.test(h.ad) ? ' ' + h.ad.split(' ')[0] : '';
  if (h.rol === 'ogrenci') return `Merhaba${ad}, mdSinyal öğrenci girişin için yeni geçici şifren: ${sifre}\n\nGiriş: ${girisLinki('ogrenci')}\nCep telefonun ve bu şifreyle gir; ilk girişte kendi şifreni belirleyeceksin.`;
  if (h.rol === 'demo') return `Merhaba${ad}, mdSinyal demo hesabın için yeni şifren: ${sifre}\n\nGiriş: ${girisLinki('giris')}\nE-posta: ${h.eposta}`;
  if (h.yonetim) return `Merhaba${ad}, mdSinyal Yönetim için yeni şifren: ${sifre}\n\nGiriş: ${girisLinki('yonetim')}\n${h.kullaniciAdi ? 'Kullanıcı adı: ' + h.kullaniciAdi : 'E-posta: ' + h.eposta}`;
  return `Merhaba${ad}, mdSinyal için yeni şifren: ${sifre}\n\nGiriş: ${girisLinki(h.rol)}\nE-posta: ${h.eposta}\nŞifreni değiştirmek istersen giriş ekranında “Şifremi unuttum”a bas; e-postana yenileme linki gelir.`;
}
const benMi = h => !!ipucu && h.eposta.toLocaleLowerCase('tr') === ipucu.toLocaleLowerCase('tr');
const waLinki = (tel, metin) => 'https://wa.me/' + (tel || '') + '?text=' + encodeURIComponent(metin);

// ---- ekran ----
// mdSinyal Yönetim içinde (Hesaplar bölümü): üst çubuk ve sayfa kabuğu Yönetim panelinden gelir
export function sahipGomulu(yer, eposta, gor = 'hesaplar') {
  kok = yer; gomulu = true; gorunum = gor; ipucu = /@/.test(eposta || '') && !/\.invalid$/.test(eposta) ? eposta : '';
  ciz();
  if (okuyabilir() && !hesaplar && !yukleniyor) yenile();
  if (!kok.dataset.shBagli) { kok.dataset.shBagli = '1'; kok.addEventListener('click', tikla); kok.addEventListener('input', yaz); kok.addEventListener('submit', gonder); }
}
export function sahipEkrani(yer) {
  kok = yer || document.getElementById('uyg'); gomulu = false;
  document.body.classList.remove('portal-modu', 'yonetim-modu'); document.body.classList.add('sahip-modu');
  document.title = 'mdSinyal · Sahip paneli';
  ciz();
  if (!kok.dataset.shBagli) { kok.dataset.shBagli = '1'; kok.addEventListener('click', tikla); kok.addEventListener('input', yaz); kok.addEventListener('submit', gonder); }
}
const ust = () => `<header class="sh-ust"><div class="sh-marka"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="#141e33"/><path d="M32 0C55 0 64 9 64 32S55 64 32 64 0 55 0 32 9 0 32 0Z" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/><g fill="none" stroke="#ffc21a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20l12 12-12 12" stroke-opacity=".38"/><path d="M33 20l12 12-12 12"/></g></svg><span><b><span class="mk">md</span>Sinyal</b><small>Sahip paneli</small></span></div>
  ${okuyabilir() ? `<button class="sh-yenile" data-sh-yenile ${yukleniyor ? 'disabled' : ''}>${ik('sifirla')}<span>${yukleniyor ? 'Yükleniyor…' : 'Yenile'}</span></button>` : ''}</header>`;

const kabuk = (ic, giris) => gomulu ? `<div class="sh sh-gomulu${giris ? ' sh-giris' : ''}">${ic}</div>` : `<div class="sh">${ust()}<main class="sh-govde${giris ? ' sh-giris' : ''}">${ic}</main></div>`;
function ciz() {
  if (!kok || (gomulu ? !kok.isConnected : !document.body.classList.contains('sahip-modu'))) return;
  if (!okuyabilir() || (!bagli() && hataMetni && !hesaplar && !yukleniyor)) {
    kok.innerHTML = kabuk(`<div class="sh-giris-kart">
        <span class="sh-giris-ik">${ik('kilit')}</span>
        <h1>${gorunum === 'destek' ? 'Destek talepleri ve hizmetler' : 'Bütün hesaplar ve kurslar'}</h1>
        <p>${gorunum === 'destek' ? 'Kursların mdSinyal’den açtığı talepler, WhatsApp’tan gelenler ve verdiğin hizmetler tek yerde.' : 'Her kursun kullanımı, öğrenci ve personel hesapları. Şifresini unutana tek dokunuşla yeni şifre verir, hesabı silersin.'}</p>
        <button class="dg dg-ana sh-giris-dg" data-sh-baglan>${ik('kilit')}Google hesabınla bağlan</button>
        ${hataMetni ? `<p class="sh-hata">${ik('uyari')}<span>${e(hataMetni)}</span></p>` : ''}
        <p class="sh-dip">Güvenlik için hesaplara Google hesabınla bir kez daha onay verirsin (${ipucu ? e(ipucu) : 'mdSinyal projesinin sahibi olan Google hesabı'}); onay bir saat geçerli. Şifreler ve anahtarlar hiçbir yerde saklanmaz.</p>
      </div>`, true);
    return;
  }
  if (!hesaplar) { kok.innerHTML = kabuk(`<div class="sh-bos">${ik('saat')}<b>${gorunum === 'destek' ? 'Destek talepleri' : 'Hesaplar ve kurs verileri'} yükleniyor…</b></div>`); return; }
  if (gorunum === 'destek') { kok.innerHTML = kabuk(destekHtml()); return; }
  const kursSay = Object.keys(kursIst).length, gorunur = hesaplar.filter(h => !h.silinecek);
  const sekme = [['kurslar', 'Kurslar', kursSay], ['hesaplar', 'Hesaplar', gorunur.length], ['kullanim', 'Kullanım', 0], ['silinen', 'Silinenler', silinecekler.length]];
  kok.innerHTML = kabuk(`
    <div class="sh-bas"><div><h1>Hesaplar</h1><p>${kursSay} kurs · ${gorunur.length} hesap</p></div>
      <div class="sh-bas-dg">${!bagli() ? `<button class="dg dg-hafif dg-kucuk" data-sh-baglan title="Son giriş tarihleri, şifre ve silme işlemleri için">${ik('kilit')}Google ile bağlan</button>` : ''}${gomulu ? `<button class="dg dg-cizgi dg-kucuk" data-sh-yenile ${yukleniyor ? 'disabled' : ''}>${ik('sifirla')}${yukleniyor ? 'Yükleniyor…' : 'Yenile'}</button>` : ''}<button class="dg dg-ana dg-kucuk" data-sh-hesap-ac>${ik('arti')}Hesap oluştur</button><button class="dg dg-cizgi dg-kucuk" data-sh-numara>${ik('tel')}Numarayı serbest bırak</button><button class="dg dg-cizgi dg-kucuk" data-sh-davet="kurs">${ik('arti')}Kurs hesabı linki</button><button class="dg dg-cizgi dg-kucuk" data-sh-davet="yonetim">${ik('arti')}Yönetim hesabı linki</button></div></div>
    <div class="sh-suz sh-alt" role="tablist">${sekme.map(([k, a, n]) => `<button role="tab" aria-selected="${alt === k}" class="${alt === k ? 'secili' : ''}" data-sh-alt="${k}">${a}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div>
    ${alt === 'kurslar' ? kursIstHtml() : alt === 'kullanim' ? kullanimHtml() : alt === 'silinen' ? silinenHtml() : `<div class="sh-arac"><label class="sh-ara">${ik('ara')}<input type="search" data-sh-ara placeholder="İsim, telefon, e-posta ya da kurs ara" value="${e(arama)}" autocomplete="off"></label>
      <div class="sh-suz" role="tablist">${SUZGEC.map(([k, a]) => `<button role="tab" aria-selected="${suzgec === k}" class="${suzgec === k ? 'secili' : ''}" data-sh-suz="${k}">${a}</button>`).join('')}</div></div>
    <div data-sh-sonuc>${sonucHtml()}</div>`}`);
}
const gunOnce = iso => { if (!iso) return 'hiç'; const g = Math.floor((Date.now() - Date.parse(iso)) / 864e5); return g <= 0 ? 'bugün' : g === 1 ? 'dün' : g + ' gün önce'; };
// her kurs için kısa istatistik kutusu
function kursIstHtml() {
  const l = Object.entries(kursIst).sort((a, b) => (b[1].son || '').localeCompare(a[1].son || ''));
  if (!l.length) return `<div class="sh-bos">${ik('kursiyer')}<b>Henüz kurs hesabı yok</b><small>“Kurs hesabı linki” ile ilk kursu aç.</small></div>`;
  const kutu = (et, d, alt2) => `<div><small>${et}</small><b>${d}</b>${alt2 ? `<span>${alt2}</span>` : ''}</div>`;
  return `<div class="sh-ist-izgara">${l.map(([k, x]) => {
    const hs = hesaplar.filter(h => h.kurs === k && !h.silinecek), per = hs.filter(h => h.rol && h.rol !== 'ogrenci').length, ogr = hs.filter(h => h.rol === 'ogrenci').length;
    const ogrAktif = hs.filter(h => h.rol === 'ogrenci' && h.sonGiris > Date.now() - 30 * 864e5).length, acik = destekler.filter(t => t.kurs === k && (t.durum || 'Açık') !== 'Çözüldü').length;
    return `<article class="sh-ist" data-sh-kurs="${e(k)}" role="button" tabindex="0">
      <header><b>${e(x.ad)}</b><small>${e(x.belgeYok ? 'Kurs kaydı silinmiş, eski verisi kalmış · silmek için dokun' : [x.sehir, 'son hareket ' + gunOnce(x.son), per + ogr ? '' : 'hesabı yok'].filter(Boolean).join(' · '))}</small></header>
      ${x.hata ? `<p class="sh-hata">${ik('uyari')}<span>Veri okunamadı: ${e(x.hata)}</span></p>` : `<div class="sh-ist-kutular">
        ${kutu('Kursiyer', x.aktif, x.kursiyer + ' kayıtlı')}${kutu('Bu ay ders', x.dersAy, '')}${kutu('Bu ay tahsilat', tl(x.tahsilAy), '')}
        ${kutu('Oturum', x.oturum, 'son 30 gün')}${kutu('Aktif kişi', x.aktifKisi, per + ' personel hesabı')}${kutu('Öğrenci girişi', ogrAktif, ogr + ' öğrenci hesabı')}</div>
      <footer><span>${ik('mesaj')}${x.gonderimAy} mesaj bu ay</span><span>${ik('aday')}${x.adaylar} aday</span>${acik ? `<span class="uyar">${ik('uyari')}${acik} açık destek</span>` : ''}</footer>`}
    </article>`;
  }).join('')}</div><p class="sh-dip">Oturum ve aktif kişi son 30 günün işlem kaydından sayılır. Kutuya dokununca kursun hesapları, hesap oluşturma ve kursu silme açılır.</p>`;
}
function silinenHtml() {
  if (!silinecekler.length) return `<div class="sh-bos">${ik('tik')}<b>Silinen hesap yok</b><small>Sildiğin hesaplar ${SIL_GUN} gün burada durur; bu sürede geri alabilirsin.</small></div>`;
  return `<div class="sh-liste">${silinecekler.slice().sort((a, b) => b.zaman.localeCompare(a.zaman)).map(x => `<div class="sh-satir sh-silinen">
    <span class="sh-av sh-av-${x.rol || 'yok'}">${e((x.ad || '?').charAt(0).toLocaleUpperCase('tr'))}</span>
    <span class="sh-satir-ic"><b>${e(x.ad)}</b><small>${e([x.kursAd, x.eposta].filter(Boolean).join(' · '))}</small></span>
    <span class="sh-satir-sag"><em class="sh-rozet">${kalanGun(x)} gün kaldı</em><button class="dg dg-ana dg-kucuk" data-sh-geri="${e(x.uid)}">Geri al</button></span></div>`).join('')}</div>
    <p class="sh-dip">Silinen hesap hemen kapanır, kimse giremez. ${SIL_GUN} gün içinde “Geri al” ile eski haline döner; süre dolunca kalıcı silinir. Hesap silmek kursun verisini silmez; kursu bütün verisiyle kaldırmak için Kurslar sekmesinde kursa dokunup “Kursu sil”i seç.</p>`;
}
// arama yazılırken yalnız liste yenilenir (kutu odağını kaybetmez)
function sonucHtml() {
  const q = arama.trim().toLocaleLowerCase('tr'), qr = q.replace(/\D/g, '');
  const uygun = h => (suzgec === 'hepsi' || (suzgec === 'ogrenci' ? h.rol === 'ogrenci' : suzgec === 'yonetim' ? h.yonetim : h.rol && h.rol !== 'ogrenci' && h.rol !== 'demo' && !h.yonetim))
    && (!q || [h.ad, h.eposta, h.kursAd, h.kullaniciAdi, rolAd(h)].some(x => String(x || '').toLocaleLowerCase('tr').includes(q)) || (qr.length >= 3 && (h.tel.includes(qr) || ('0' + h.tel.slice(2)).includes(qr))));
  const gorunen = hesaplar.filter(h => !h.silinecek && uygun(h));
  const gruplar = new Map();
  for (const h of gorunen) { const a = h.yonetim ? '0' : h.kurs ? '1' + h.kursAd : '2'; if (!gruplar.has(a)) gruplar.set(a, []); gruplar.get(a).push(h); }
  const sira = [...gruplar.keys()].sort((a, b) => a.localeCompare(b, 'tr'));
  const rolSira = { mudur: 0, ortak: 1, sekreter: 2, usta: 3, ogrenci: 4 };
  return sira.length ? sira.map(a => {
      const l = gruplar.get(a).sort((x, y) => (rolSira[x.rol] ?? 9) - (rolSira[y.rol] ?? 9) || x.ad.localeCompare(y.ad, 'tr'));
      const baslik = a === '0' ? YONETIM_KURS : a === '2' ? 'Kursa bağlı olmayan hesaplar' : a.slice(1);
      return `<section class="sh-grup"><h2>${e(baslik)}<span>${l.length}</span></h2><div class="sh-liste">${l.map(h => `<button class="sh-satir${h.kapali ? ' kapali' : ''}" data-sh-hesap="${h.uid}">
        <span class="sh-av sh-av-${h.rol || 'yok'}">${e((h.ad || '?').trim().charAt(0).toLocaleUpperCase('tr'))}</span>
        <span class="sh-satir-ic"><b>${e(h.ad)}${benMi(h) ? ' <em class="sh-sen">sen</em>' : ''}</b><small>${e(rolAd(h))} · ${e(kimlik(h))}</small></span>
        <span class="sh-satir-sag">${h.kapali ? '<em class="sh-rozet">Giriş kapalı</em>' : `<small>${e(zamanMetni(h.sonGiris))}</small>`}${ik('sag')}</span></button>`).join('')}</div></section>`;
    }).join('') : `<div class="sh-bos">${ik('ara')}<b>Eşleşen hesap yok</b><small>Aramayı ya da süzgeci değiştir.</small></div>`;
}

// Tarayıcının ham ağ hatası (Chrome 'Failed to fetch', Safari 'Load failed', Firefox 'NetworkError…') Türkçe gösterilir
const turkceHata = x => { const m = (x && x.message) || String(x || ''); return /^(Failed to fetch|Load failed)$|NetworkError|network error/i.test(m) ? 'Sunucuya ulaşılamadı; internet bağlantını kontrol et' : m; };

async function yenile() {
  yukleniyor = true; ciz();
  try { await yukle(); hataMetni = ''; } catch (x) { hataMetni = turkceHata(x); if (x.yetki) belirtec = null; bildir(turkceHata(x), 'uyari'); }
  yukleniyor = false; if (hesaplar) KU.veri = null; ciz();
  if (hesaplar) kullanimHaftalik();
}

function yaz(ev) {
  const a = ev.target.closest('[data-sh-ara]'); if (!a) return;
  arama = a.value; const s = kok.querySelector('[data-sh-sonuc]'); if (s) s.innerHTML = sonucHtml();
}
async function tikla(ev) {
  const t = ev.target;
  if (t.closest('[data-sh-baglan]')) {
    const b = t.closest('button'); b.disabled = true;
    try { await baglan(); hataMetni = ''; hesaplar = null; ciz(); await yenile(); } catch (x) { hataMetni = turkceHata(x); b.disabled = false; ciz(); }
    return;
  }
  if (t.closest('[data-sh-yenile]')) return yenile();
  const al = t.closest('[data-sh-alt]'); if (al) { alt = al.dataset.shAlt; return ciz(); }
  if (alt === 'kullanim' && gorunum !== 'destek' && await kullanimTikla(t)) return;
  const kr = t.closest('[data-sh-kurs]'); if (kr) return kursPenceresi(kr.dataset.shKurs);
  if (!bagli() && t.closest('[data-sh-davet],[data-sh-sifre],[data-sh-hesap],[data-sh-geri],[data-sh-hesap-ac],[data-sh-numara]')) { try { await baglan(); hataMetni = ''; } catch (x) { return bildir(turkceHata(x), 'uyari'); } }
  const gr = t.closest('[data-sh-geri]'); if (gr) { const x = silinecekler.find(y => y.uid === gr.dataset.shGeri); if (!x) return; gr.disabled = true; try { await silmeGeriAl(x); bildir(x.ad + ' geri alındı; yeniden girebilir'); ciz(); } catch (y) { gr.disabled = false; islemHata(y); } return; }
  if (gorunum === 'destek' && await destekTikla(t)) return;
  const s = t.closest('[data-sh-suz]'); if (s) { suzgec = s.dataset.shSuz; kok.querySelectorAll('[data-sh-suz]').forEach(b => { b.classList.toggle('secili', b === s); b.setAttribute('aria-selected', b === s); }); const r = kok.querySelector('[data-sh-sonuc]'); if (r) r.innerHTML = sonucHtml(); return; }
  const d = t.closest('[data-sh-davet]'); if (d) return davetPenceresi(d.dataset.shDavet === 'yonetim');
  const ha = t.closest('[data-sh-hesap-ac]'); if (ha) return hesapAcPenceresi({ kurs: ha.dataset.shHesapAc || '' });
  if (t.closest('[data-sh-numara]')) return numaraPenceresi();
  const sf = t.closest('[data-sh-sifre]'); if (sf) { const h = hesaplar.find(x => x.uid === sf.dataset.shSifre); if (h) sifrePenceresi(h); return; }
  const h = t.closest('[data-sh-hesap]'); if (h) { const x = hesaplar.find(y => y.uid === h.dataset.shHesap); if (x) hesapPenceresi(x); }
}
const islemHata = x => { bildir(turkceHata(x), 'uyari'); if (x.yetki) { kapatPencere(); ciz(); } };

function hesapPenceresi(h) {
  const satir = (et, d) => d ? `<div class="sh-bilgi-satir"><span>${et}</span><b>${e(d)}</b></div>` : '';
  pencere({
    baslik: h.ad,
    icerik: `<div class="sh-bilgi">${satir('Rol', rolAd(h))}${satir('Kurs', h.yonetim ? '' : h.kursAd)}${satir(h.kullaniciAdi ? 'Kullanıcı adı' : h.tel ? 'Telefon' : 'E-posta', h.kullaniciAdi || (h.tel ? telGoster(h.tel) : h.eposta))}${h.sonGiris === null ? '' : satir('Son giriş', zamanMetni(h.sonGiris).replace(/ girdi$/, ''))}${satir('Açıldı', h.olusturma ? new Date(h.olusturma).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')}${h.kapali ? satir('Durum', 'Giriş kapalı') : ''}</div>
      <div class="sh-islem">
        <button class="sh-islem-dg birincil" data-p-sifre>${ik('kilit')}<span><b>Yeni şifre ver</b><small>Geçici şifre oluşur, WhatsApp’tan gönderirsin${h.rol === 'ogrenci' ? '; öğrenci ilk girişte kendi şifresini belirler' : ''}</small></span></button>
        <button class="sh-islem-dg" data-p-kapat>${ik(h.kapali ? 'tik' : 'kapat')}<span><b>${h.kapali ? 'Girişi aç' : 'Girişi kapat'}</b><small>${h.kapali ? 'Hesap yeniden kullanılabilir' : 'Veriler kalır; bu kişi giremez'}</small></span></button>
        ${benMi(h) ? '' : `<button class="sh-islem-dg tehlike" data-p-sil>${ik('kapat')}<span><b>Hesabı sil</b><small>Hemen kapanır; ${SIL_GUN} gün içinde geri alabilirsin</small></span></button>`}
      </div>`,
    onAc: p => {
      p.querySelector('[data-p-sifre]').addEventListener('click', () => sifrePenceresi(h));
      p.querySelector('[data-p-kapat]').addEventListener('click', async ev => {
        const b = ev.currentTarget; b.disabled = true;
        try { await girisKapat(h, !h.kapali); bildir(h.kapali ? h.ad + ' artık giremez' : h.ad + ' yeniden girebilir'); kapatPencere(); ciz(); } catch (x) { b.disabled = false; islemHata(x); }
      });
      const sl = p.querySelector('[data-p-sil]'); if (sl) sl.addEventListener('click', () => silPenceresi(h));
    },
  });
}

async function sifrePenceresi(h) {
  pencere({ baslik: 'Yeni şifre', icerik: `<div class="sh-bos">${ik('saat')}<b>${e(h.ad)} için şifre oluşturuluyor…</b></div>`, korumali: true });
  let sifre;
  try { sifre = await sifreVer(h); } catch (x) { kapatPencere(); return islemHata(x); }
  hazirPenceresi(h, sifre, sifreMesaji(h, sifre), 'Yeni şifre hazır', `${e(h.ad)} artık bu şifreyle girer. Eski şifresi geçersiz oldu.`);
  ciz();
}
// şifre ve gönderilecek mesaj: kopyala ya da WhatsApp'tan gönder (yeni şifre ve yeni hesap için ortak)
function hazirPenceresi(h, sifre, metin, baslik, notHtml) {
  pencere({
    baslik,
    icerik: `<p class="sh-sifre-not">${notHtml}</p>
      <div class="sh-sifre"><span data-resmi>${e(sifre)}</span><button class="dg dg-hafif" data-p-kopya-sifre>Kopyala</button></div>
      <p class="sh-sifre-et">Gönderilecek mesaj</p><pre class="sh-mesaj" data-resmi>${e(metin)}</pre>
      ${h.tel ? '' : `<p class="sh-dip">${e(h.ad)} kişisinin numarası mdSinyal’de kayıtlı değil; WhatsApp açılınca kişiyi sen seçersin.</p>`}`,
    altlik: `<button class="dg dg-cizgi" data-p-kopya>Mesajı kopyala</button><a class="dg dg-wp" target="_blank" rel="noopener" href="${e(waLinki(h.tel, metin))}">${ik('wp')}WhatsApp’tan gönder</a>`,
    onAc: p => {
      const kopya = (m, a) => navigator.clipboard.writeText(m).then(() => bildir(a + ' kopyalandı')).catch(() => bildir('Kopyalanamadı; elle seç', 'uyari'));
      p.querySelector('[data-p-kopya-sifre]').addEventListener('click', () => kopya(sifre, 'Şifre'));
      p.querySelector('[data-p-kopya]').addEventListener('click', () => kopya(metin, 'Mesaj'));
    },
  });
}

function silPenceresi(h) {
  pencere({
    baslik: 'Hesap silinsin mi?',
    icerik: `<p style="font-size:15px;line-height:1.5"><b>${e(h.ad)}</b> (${e(kimlik(h))}) hemen kapanır ve giremez.</p><p class="sh-dip">${SIL_GUN} gün içinde Hesaplar › Silinenler’den geri alabilirsin; süre dolunca kalıcı silinir. ${h.rol === 'ogrenci' ? 'Öğrencinin kurs kaydı, dersleri ve ödemeleri silinmez.' : 'Kursun öğrenci, ders ve kasa verileri silinmez; yalnız bu kişinin girişi kaldırılır.'}</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg sh-tehlike" data-p-evet>Hesabı sil</button>`,
    onAc: p => p.querySelector('[data-p-evet]').addEventListener('click', async ev => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Siliniyor…';
      try { await hesapSil(h); kapatPencere(); bildir(h.ad + ' silindi; ' + SIL_GUN + ' gün içinde geri alabilirsin'); ciz(); } catch (x) { b.disabled = false; b.textContent = 'Hesabı sil'; islemHata(x); }
    }),
  });
}

// ---- kurs ve hesap oluşturma, kurs silme (16 Kas 2026) ----
// Hepsi Google onayıyla (proje sahibinin IAM yetkisi) Identity Toolkit ve Firestore REST'e gider; Firestore güvenlik kuralı gerekmez,
// kural taslağına sahip için yazma yetkisi eklenmez. Gizli anahtar yok; belirteç yalnız bellekte.
const fsDeger = v => v === null || v === undefined ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : v instanceof Date ? { timestampValue: v.toISOString() }
  : Array.isArray(v) ? { arrayValue: { values: v.map(fsDeger) } } : typeof v === 'object' ? { mapValue: { fields: fsAlanlar(v) } } : { stringValue: String(v) };
const fsAlanlar = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, fsDeger(v)]));
// alan yolu parçası: harf/rakam dışı ya da rakamla başlayan anahtar ters tırnakla yazılır (ör. h.`905321234567`)
const yolParca = x => /^[A-Za-z_][A-Za-z_0-9]*$/.test(x) ? x : '`' + String(x).replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
const tamYol = y => FS_AD + '/' + y;
const commit = writes => api(FS + ':commit', { writes });
async function topluSil(adlar, ilerle) {
  for (let i = 0; i < adlar.length; i += 400) { await commit(adlar.slice(i, i + 400).map(n => ({ delete: n }))); if (ilerle) ilerle(Math.min(i + 400, adlar.length), adlar.length); }
}
async function sorgu(koleksiyon, alan, deger) {
  const j = await api(FS + ':runQuery', { structuredQuery: { from: [{ collectionId: koleksiyon }], where: { fieldFilter: { field: { fieldPath: alan }, op: 'EQUAL', value: { stringValue: deger } } }, select: { fields: [{ fieldPath: '__name__' }] } } });
  return j.filter(x => x.document).map(x => x.document.name);
}
async function koleksiyonBelgeleri(yol) {
  let adlar = [], sy = '';
  do { const j = await api(FS + '/' + yol + '?pageSize=300&mask.fieldPaths=a' + (sy ? '&pageToken=' + encodeURIComponent(sy) : '')); adlar = adlar.concat((j.documents || []).map(d => d.name)); sy = j.nextPageToken || ''; } while (sy);
  return adlar;
}
const telNorm = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = d.slice(1); if (d.length === 10) d = '90' + d; return /^905\d{9}$/.test(d) ? d : null; };
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const kursAd = k => (kursIst[k] || {}).ad || 'Adı bilinmeyen kurs';
const kursSecenek = () => Object.entries(kursIst).filter(([, x]) => !x.belgeYok).sort((a, b) => (a[1].ad || '').localeCompare(b[1].ad || '', 'tr'));
let veriOnbellek = {};
const kursVerisiAl = async (k, taze) => { if (taze || !veriOnbellek[k]) veriOnbellek[k] = await kursVerisi(k); return veriOnbellek[k]; };
const googleIste = async () => { if (!bagli()) { await baglan(); hataMetni = ''; } };
function indir(ad, metin) {
  const u = URL.createObjectURL(new Blob([metin], { type: 'application/json' })), a = document.createElement('a');
  a.href = u; a.download = ad; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
}
const dosyaAdi = x => String(x || 'kurs').toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'kurs';
const bugunTarih = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// Kurslar sekmesinde bir kursa dokununca: hesapları, bu kursta hesap oluşturma ve kursu silme
function kursPenceresi(k) {
  const x = kursIst[k]; if (!x) return;
  const hs = (hesaplar || []).filter(h => h.kurs === k && !h.silinecek), per = hs.filter(h => h.rol && h.rol !== 'ogrenci').length, ogr = hs.filter(h => h.rol === 'ogrenci').length;
  const satir = (et, d) => d ? `<div class="sh-bilgi-satir"><span>${et}</span><b>${e(d)}</b></div>` : '';
  pencere({
    baslik: x.ad,
    icerik: `<div class="sh-bilgi">${satir('Şehir', x.sehir)}${satir('Hesaplar', per + ' personel · ' + ogr + ' öğrenci' + ((n => n ? ' · ' + n + ' silinen' : '')((hesaplar || []).filter(h => h.kurs === k && h.silinecek).length)))}${x.hata ? '' : satir('Kursiyer', x.aktif + ' aktif · ' + x.kursiyer + ' kayıtlı')}${satir('Son hareket', gunOnce(x.son))}</div>
      <div class="sh-islem">
        <button class="sh-islem-dg birincil" data-p-hesaplar>${ik('kursiyer')}<span><b>Hesaplarını göster</b><small>Bu kursun personel ve öğrenci hesapları</small></span></button>
        ${x.belgeYok ? '' : `<button class="sh-islem-dg" data-p-olustur>${ik('arti')}<span><b>Bu kursta hesap oluştur</b><small>Müdür, ön büro, öğretmen ya da öğrenci hesabı</small></span></button>`}
        <button class="sh-islem-dg tehlike" data-p-kurs-sil>${ik('kapat')}<span><b>Kursu sil</b><small>Kursun bütün verisi ve hesapları kalıcı silinir; önce yedeği iner</small></span></button>
      </div>`,
    onAc: p => {
      p.querySelector('[data-p-hesaplar]').addEventListener('click', () => { kapatPencere(); alt = 'hesaplar'; suzgec = 'hepsi'; arama = x.ad; ciz(); });
      const ol = p.querySelector('[data-p-olustur]'); if (ol) ol.addEventListener('click', async () => { try { await googleIste(); } catch (y) { return islemHata(y); } hesapAcPenceresi({ kurs: k }); });
      p.querySelector('[data-p-kurs-sil]').addEventListener('click', () => kursSilPenceresi(k));
    },
  });
}

// Kursu silme: adını yazarak onaylanır; önce kursun BÜTÜN verisi (kurs belgesi ve bütün alt koleksiyonları ham alanlarıyla:
// v, dosyalar, kayit, yedekler, uyeler, ogrenciler, ustalar, sayac…) tek yedek dosyası olarak hazırlanır. Yedek kullanıcının
// dokunuşuyla iner (iOS ve ana ekran uygulamasında await sonrası indirme düşebilir) ve "indi" onayı verilmeden silme başlamaz.
// Sonra kursa bağlı hesaplar (giriş + kullanicilar + üyelik), telefon kayıtları, kursun bütün alt koleksiyonları ve kurs belgesi silinir.
// Bir adım hata verirse durur, hata pencerede görünür; "Tekrar dene" kaldığı yerden sürdürür (silinmiş olanı yeniden silmek zararsız).
// Silinmeyen: Cloudflare KV'deki kursun WhatsApp hattı bağlantısı ('hat:<kurs>') ve gelen WhatsApp mesajları ('gelen:<kurs>'); pencerede yazılı.
function kursSilPenceresi(k) {
  const x = kursIst[k] || { ad: kursAd(k) }, ad = x.ad, hs = (hesaplar || []).filter(h => h.kurs === k);
  const dolu = !x.hata && (x.kursiyer || x.dersAy || x.tahsilAy);
  let yedek = null, indi = false;
  pencere({
    baslik: 'Kurs kalıcı silinsin mi?', korumali: true,
    icerik: `<p style="font-size:15px;line-height:1.5"><b>${e(ad)}</b> ve bütün verisi kalıcı silinir: öğrenciler, dersler, kasa, yüklenen belgeler ve imzalar, yedekler ve işlem kaydı. ${hs.length ? `Kursa bağlı <b>${hs.length} hesap</b> da silinir; bu kişiler artık giremez.` : 'Kursa bağlı hesap yok.'}</p>
      ${dolu ? `<p class="sh-hata">${ik('uyari')}<span>Bu kursta ${x.kursiyer} kayıtlı öğrenci var${x.tahsilAy ? ', bu ay ' + tl(x.tahsilAy) + ' tahsilat' : ''}. Deneme kursu değilse silme.</span></p>` : ''}
      <p class="sh-dip">Önce kursun bütün verisi (yüklenen belgeler ve işlem kaydı dahil) tek bir yedek dosyası (.json) olarak hazırlanır. Dosyayı indirip indiğini onaylamadan silme başlamaz. Kursun WhatsApp hattı bağlantısı ve WhatsApp’tan gelen mesajları ayrı yerde durur; bu adım onları silmez. Silme geri alınamaz.</p>
      <label class="og-alan" style="margin-top:14px"><span class="og-alan-et">Onaylamak için kursun adını yaz: <b>${e(ad)}</b></span><span class="og-girdi"><input name="onay" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Kursun adı"></span></label>
      <div data-p-yedek hidden>
        <p class="sh-dip" data-p-yedek-bilgi></p>
        <label class="giris-onay" style="margin-top:12px"><input type="checkbox" name="indi"><span>Yedek dosyası bu cihaza indi (İndirilenler klasöründe görüyorum)</span></label>
      </div>
      <div data-p-durum aria-live="polite"></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-cizgi" data-p-indir hidden>Yedeği indir</button><button class="dg dg-ana" data-p-hazirla disabled>Yedeği hazırla</button><button class="dg sh-tehlike" data-p-evet hidden disabled>Kursu kalıcı sil</button>`,
    onAc: p => {
      const i = p.querySelector('[name=onay]'), hz = p.querySelector('[data-p-hazirla]'), ind = p.querySelector('[data-p-indir]'), b = p.querySelector('[data-p-evet]');
      const kutu = p.querySelector('[data-p-yedek]'), bilgi = p.querySelector('[data-p-yedek-bilgi]'), onay = p.querySelector('[name=indi]'), durum = p.querySelector('[data-p-durum]');
      const ayni = () => i.value.trim().toLocaleLowerCase('tr') === String(ad).trim().toLocaleLowerCase('tr');
      const hataGoster = y => { durum.innerHTML = `<p class="sh-hata">${ik('uyari')}<span>${e(turkceHata(y))}</span></p>`; if (y.yetki) { kapatPencere(); islemHata(y); } };
      const sil = () => { b.disabled = !(yedek && indi && onay.checked && ayni()); };
      i.addEventListener('input', () => { hz.disabled = !ayni(); sil(); });
      onay.addEventListener('change', sil);
      // 1) yedeği hazırla (ağdan okunur); 2) "Yedeği indir" doğrudan dokunuşla iner; 3) "indi" onayı; 4) sil
      hz.addEventListener('click', async () => {
        if (!ayni()) return;
        hz.disabled = true; i.disabled = true; durum.innerHTML = '';
        try {
          await googleIste();
          yedek = await kursYedegi(k, m => { hz.textContent = m; });
          hz.hidden = true; ind.hidden = false; b.hidden = false; kutu.hidden = false;
          bilgi.innerHTML = `Yedek hazır: <b>${yedek.belge}</b> kayıt, ${e(boyutYaz(yedek.metin.length))}. “Yedeği indir”e dokun.`;
          ind.classList.add('dg-ana'); ind.classList.remove('dg-cizgi');
        } catch (y) { hz.disabled = false; i.disabled = false; hz.textContent = 'Yedeği hazırla'; hataGoster(y); }
      });
      ind.addEventListener('click', () => {
        if (!yedek) return;
        indir(yedek.dosya, yedek.metin); indi = true; ind.textContent = 'Yeniden indir';
        bilgi.innerHTML = `Yedek: <b>${e(yedek.dosya)}</b> (${yedek.belge} kayıt, ${e(boyutYaz(yedek.metin.length))}). İndirilenler klasörüne bak; inmediyse “Yeniden indir”e dokun.`;
        ind.classList.remove('dg-ana'); ind.classList.add('dg-cizgi'); sil();
      });
      b.addEventListener('click', async () => {
        if (b.disabled) return;
        b.disabled = true; ind.disabled = true; onay.disabled = true; durum.innerHTML = '';
        const adim = m => { b.textContent = m; };
        try {
          await googleIste();
          await kursSil(k, adim);
          kapatPencere(); bildir(ad + ' silindi. Yedeği İndirilenler klasöründe');
          islem('mdSinyal Yönetim: kursu sildi', ad); kaydet(); ciz();
        } catch (y) {
          b.disabled = false; ind.disabled = false; onay.disabled = false; b.textContent = 'Tekrar dene';
          hataGoster(y);
        }
      });
    },
  });
}
const boyutYaz = n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toLocaleString('tr', { maximumFractionDigits: 1 }) + ' MB';
// Kursun bütün verisi ham Firestore alanlarıyla (tür bilgisi kaybolmaz; dosya içerikleri dahil) + okunur kurs verisi (veri)
async function kursYedegi(k, adim) {
  const ad = kursAd(k), hs = (hesaplar || []).filter(h => h.kurs === k);
  if (ad === YONETIM_KURS || hs.some(h => h.yonetim || benMi(h))) throw new Error('mdSinyal Yönetim kursu ve kendi hesabının bağlı olduğu kurs buradan silinmez');
  adim('Yedek hazırlanıyor…');
  const kb = await api(FS + ':batchGet', { documents: [tamYol('kurslar/' + k)] }), kf = (kb.find(y => y.found) || {}).found;
  const j = await api(FS + '/kurslar/' + k + ':listCollectionIds', { pageSize: 100 });
  const koleksiyonlar = {}; let belge = kf ? 1 : 0;
  for (const c of j.collectionIds || []) {
    adim('Yedek: ' + c + '…');
    let l = [], sy = '';
    do { const r = await api(FS + '/kurslar/' + k + '/' + c + '?pageSize=' + (c === 'dosyalar' ? 20 : 300) + (sy ? '&pageToken=' + encodeURIComponent(sy) : '')); l = l.concat((r.documents || []).map(d => ({ id: d.name.split('/').pop(), guncel: d.updateTime, alanlar: d.fields || {} }))); sy = r.nextPageToken || ''; } while (sy);
    koleksiyonlar[c] = l; belge += l.length;
  }
  const veri = await kursVerisi(k);
  const metin = JSON.stringify({ tur: 'mdSinyal kurs yedeği (silmeden önce)', kurs: k, ad, tarih: new Date().toISOString(),
    aciklama: 'koleksiyonlar: kurslar/' + k + ' altındaki bütün belgeler, Firestore REST ham alanlarıyla (dosyalar = yüklenen belge ve imzalar, kayit = işlem kaydı). veri: kurs verisinin okunur hâli.',
    hesaplar: hs.map(h => ({ uid: h.uid, ad: h.ad, rol: h.rol, eposta: h.eposta, tel: h.tel })), kursBelgesi: kf ? kf.fields || {} : null, koleksiyonlar, veri });
  return { metin, belge, dosya: 'mdSinyal-yedek-' + dosyaAdi(ad) + '-' + bugunTarih() + '.json' };
}
async function kursSil(k, adim) {
  const ad = kursAd(k), hs = (hesaplar || []).filter(h => h.kurs === k);
  if (ad === YONETIM_KURS || hs.some(h => h.yonetim || benMi(h))) throw new Error('mdSinyal Yönetim kursu ve kendi hesabının bağlı olduğu kurs buradan silinmez');
  const hatalar = [];
  for (const [n, h] of hs.entries()) {
    adim(`Hesaplar siliniyor ${n + 1}/${hs.length}…`);
    try { await kaliciSil({ uid: h.uid, kurs: k, rol: h.rol }); } catch (y) { if (y.yetki) throw y; hatalar.push(h.ad + ': ' + turkceHata(y)); }
  }
  if (hatalar.length) throw new Error(hatalar.length + ' hesap silinemedi (' + hatalar[0] + '). Kurs verisi silinmedi; tekrar dene.');
  adim('Bağlı kayıtlar siliniyor…');
  // giriş hesabı önceden silinmiş ama kullanicilar belgesi kalmış olanlar ve öğrenci telefon kayıtları
  const bagli_ = (await sorgu('kullanicilar', 'kurs', k)).concat(await sorgu('telefonlar', 'k', k));
  await topluSil(bagli_);
  adim('Kurs verisi siliniyor…');
  const j = await api(FS + '/kurslar/' + k + ':listCollectionIds', { pageSize: 100 });
  let adlar = [];
  for (const c of j.collectionIds || []) adlar = adlar.concat(await koleksiyonBelgeleri('kurslar/' + k + '/' + c));
  await topluSil(adlar, (a, t) => adim(`Kurs verisi siliniyor ${a}/${t}…`));
  await topluSil([tamYol('kurslar/' + k)]);
  // kursun rapor e-postası adresleri worker'da (api.mdsinyal.com KV): onlar da silinir. Ulaşılamazsa kurs yine silinmiş sayılır; elle silme adımı eposta-gonderici.md'de
  adim('E-posta kayıtları siliniyor…');
  try { const yetki = await hataYetki(); const r = yetki ? await fetch(WORKER + '/eposta/sahip-sil', { method: 'POST', headers: { Authorization: yetki, 'Content-Type': 'application/json' }, body: JSON.stringify({ kurs: k }) }) : null; if (!r || !r.ok) console.warn('E-posta kayıtları silinemedi', k, r && r.status); } catch (y) { console.warn('E-posta kayıtları silinemedi', k, y); }
  delete kursIst[k]; delete veriOnbellek[k];
  hesaplar = (hesaplar || []).filter(h => h.kurs !== k);
  silinecekler = silinecekler.filter(y => y.kurs !== k);
}

// ---- Numarayı serbest bırak: öğrenci telefonu başka (çoğu zaman deneme ya da eski) bir kursa bağlı kaldıysa yeni kurs hesap açamaz.
// Kayıt bulunur, hangi kursa bağlı olduğu ve kaç hesabın girişinde kullanıldığı gösterilir; onayla silinir. O kurstaki eski öğrenci hesabı
// bu numarayla artık giriş yapamaz (kurs isterse yeniden hesap açar).
function numaraPenceresi() {
  pencere({
    baslik: 'Numarayı serbest bırak',
    icerik: `<p style="font-size:14px">Öğrenci hesabı açılırken “Bu telefon numarasıyla başka bir kursta öğrenci hesabı var” uyarısı çıkıyorsa numara eski bir kursa bağlı kalmıştır. Numarayı yaz, hangi kursa bağlı olduğuna bak ve serbest bırak.</p>
      <div class="form-izgara" style="margin-top:12px"><div class="alan tam"><label>Telefon</label><input name="tel" inputmode="tel" placeholder="05xx xxx xx xx" autocomplete="off"></div></div><div data-sonuc style="margin-top:10px"></div>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-bul>Bul</button>',
    onAc(d) {
      const sonuc = d.querySelector('[data-sonuc]');
      d.querySelector('[data-bul]').addEventListener('click', async ev => {
        const tel = telNorm(d.querySelector('[name=tel]').value); if (!tel) return bildir('Geçerli bir cep telefonu yazın', 'uyari');
        ev.target.disabled = true; sonuc.textContent = 'Aranıyor…';
        try {
          const tj = await api(FS + ':batchGet', { documents: [tamYol('telefonlar/' + tel)] });
          const tb = (tj.find(y => y.found) || {}).found;
          if (!tb) { sonuc.innerHTML = '<p>Bu numara hiçbir kursa bağlı değil; hesap açılabilir.</p>'; return; }
          const a = alanlar(tb.fields), kb = await api(FS + ':batchGet', { documents: [tamYol('kurslar/' + a.k)] });
          const kd = (kb.find(y => y.found) || {}).found, kursAd = kd ? (alanlar(kd.fields).ad || 'Adı bilinmeyen kurs') : 'Silinmiş kurs';
          const n = Object.keys(a.h || {}).length;
          sonuc.innerHTML = `<div class="ipucu" style="display:block"><b>${e(kursAd)}</b> kursuna bağlı · ${n ? n + ' öğrenci hesabının girişinde kullanılıyor' : 'açık öğrenci hesabı yok'}</div><button class="dg dg-ana" style="margin-top:10px" data-birak>Serbest bırak</button>`;
          sonuc.querySelector('[data-birak]').addEventListener('click', async b => {
            b.target.disabled = true;
            try { await commit([{ delete: tamYol('telefonlar/' + tel) }]); islem('Telefon numarasını serbest bıraktı', kursAd); bildir('Numara serbest; artık yeni kursta öğrenci hesabı açılabilir', 'tamam'); kapatPencere(); }
            catch (x) { b.target.disabled = false; bildir(turkceHata(x), 'uyari'); }
          });
        } catch (x) { sonuc.textContent = ''; bildir(turkceHata(x), 'uyari'); } finally { ev.target.disabled = false; }
      });
    },
  });
}

// ---- Hesap oluştur: önce kurs ve rol, sonra kişi ----
// Müdür, ön büro, öğretmen: e-posta + geçici şifre; kurs üyeliği (kurslar/{kurs}/uyeler) ve kullanicilar belgesi yazılır.
// Öğrenci: kursun öğrenci listesinden seçilir; bulut.js ogrenciHesapAc ile aynı yapı (telefon girişi, öğrenci paneli belgesi, ilk girişte şifre belirleme).
// Demo: hiçbir kursa bağlanmaz (kullanicilar/{uid} = { demo: true }); girişte bu cihazdaki örnek verili demo açılır, buluttaki
// hiçbir kurs verisini okuyamaz ve yazamaz (kurallar üyelik ister). Gerçek ya da paylaşılan "demo kurs" açılmaz.
const HESAP_ROL = [['mudur', 'Kurs müdürü'], ['sekreter', 'Ön büro'], ['usta', 'Öğretmen'], ['ogrenci', 'Öğrenci'], ['demo', 'Demo']];
const a_ = (et, ic, ek = '') => `<label class="og-alan"${ek}><span class="og-alan-et">${et}</span>${ic}</label>`;
const g_ = (ad, ek = '') => `<span class="og-girdi"><input name="${ad}" ${ek}></span>`;
function hesapAcPenceresi({ kurs = '', rol = '' } = {}) {
  const l = kursSecenek();
  pencere({
    baslik: 'Hesap oluştur', alt: true,
    icerik: `<form id="f-sho" class="og-giris-form yn-form" novalidate>
      <div class="og-alan"><span class="og-alan-et">Rol</span><div class="sh-durum-sec" role="radiogroup" aria-label="Rol">${HESAP_ROL.map(([r, ad]) => `<button type="button" role="radio" aria-checked="${rol === r}" class="${rol === r ? 'secili' : ''}" data-p-rol="${r}">${ad}</button>`).join('')}</div></div>
      ${a_('Kurs', `<span class="og-girdi"><select name="kurs"><option value="">Kurs seç</option>${l.map(([k, x]) => `<option value="${e(k)}" ${k === kurs ? 'selected' : ''}>${e(x.ad)}${x.sehir ? ' · ' + e(x.sehir) : ''}</option>`).join('')}</select></span>`, ' data-p-kurs-alan')}
      <p class="sh-dip" data-p-demo-not hidden>Demo hesabı hiçbir kursa bağlanmaz: girince örnek verilerle çalışan demo açılır, gerçek kurs verisi görünmez, mesaj gönderilmez.</p>
    </form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-p-devam>Devam</button>`,
    onAc: p => {
      const f = p.querySelector('form'), ka = p.querySelector('[data-p-kurs-alan]'), dn = p.querySelector('[data-p-demo-not]');
      const goster = () => { ka.hidden = rol === 'demo'; dn.hidden = rol !== 'demo'; };
      p.querySelectorAll('[data-p-rol]').forEach(b => b.addEventListener('click', () => { rol = b.dataset.pRol; p.querySelectorAll('[data-p-rol]').forEach(y => { y.classList.toggle('secili', y === b); y.setAttribute('aria-checked', y === b); }); goster(); }));
      goster();
      const devam = async ev => {
        if (ev) ev.preventDefault();
        if (!rol) return bildir('Önce rolü seç', 'uyari');
        const k = rol === 'demo' ? '' : f.kurs.value;
        if (rol !== 'demo' && !k) { bildir('Kursu seç', 'uyari'); return f.kurs.focus(); }
        try { await googleIste(); } catch (y) { return islemHata(y); }
        hesapAcDetay(k, rol);
      };
      f.addEventListener('submit', devam); p.querySelector('[data-p-devam]').addEventListener('click', devam);
    },
  });
}
async function hesapAcDetay(k, rol) {
  const rolAdi = (HESAP_ROL.find(x => x[0] === rol) || [])[1] || rol, ust = rol === 'demo' ? 'Demo hesabı' : rolAdi + ' · ' + kursAd(k);
  let V = null;
  if (rol === 'usta' || rol === 'ogrenci') {
    pencere({ baslik: ust, icerik: `<div class="sh-bos">${ik('saat')}<b>Kursun ${rol === 'usta' ? 'öğretmenleri' : 'öğrencileri'} yükleniyor…</b></div>`, korumali: true });
    try { V = await kursVerisiAl(k, true); } catch (y) { kapatPencere(); return islemHata(y); }
  }
  const ustalar = V ? (V.egitmenler || []).filter(x => x && x.id && !x.silindi && !x.pasif) : [];
  const ustaVar = new Set((hesaplar || []).filter(h => h.kurs === k && h.rol === 'usta').map(h => h.usta).filter(Boolean).map(String));
  const ogrenciler = V ? (V.kursiyerler || []).filter(x => x && x.id && !x.silindi && !x.kapali && !(x.hesap && x.hesap.uid) && telNorm(x.tel)).sort((a, b) => [a.ad, a.soyad].join(' ').localeCompare([b.ad, b.soyad].join(' '), 'tr')) : [];
  const ogrAd = x => [x.ad, x.soyad].filter(Boolean).join(' ') || 'Adsız öğrenci';
  let govde;
  if (rol === 'ogrenci') govde = ogrenciler.length
    ? `${a_('Öğrenci', `<span class="og-girdi"><select name="ogr"><option value="">Öğrenci seç</option>${ogrenciler.map(x => `<option value="${e(x.id)}">${e(ogrAd(x))} · ${e(telGoster(telNorm(x.tel)))}</option>`).join('')}</select></span>`)}
       <p class="sh-dip">Hesabı olan ve cep telefonu geçersiz öğrenciler listede yok. Öğrenci cep telefonu ve geçici şifreyle girer, ilk girişte kendi şifresini belirler. Kursun cihazında bu öğrencinin kaydı düzenlenirken hesap açma; açma kursun işlem kaydına yazılır.</p>`
    : `<div class="sh-bos">${ik('kursiyer')}<b>Hesap açılacak öğrenci yok</b><small>Bu kursta hesabı olmayan ve cep telefonu geçerli öğrenci bulunamadı. Öğrenci önce kursun listesine eklenmeli.</small></div>`;
  else if (rol === 'usta') govde = ustalar.length
    ? `${a_('Öğretmen', `<span class="og-girdi"><select name="usta"><option value="">Öğretmen seç</option>${ustalar.map(x => `<option value="${e(x.id)}">${e(x.ad || 'Adsız')}${ustaVar.has(String(x.id)) ? ' (hesabı var)' : ''}</option>`).join('')}</select></span>`)}
       ${a_('E-posta', g_('eposta', 'type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" required placeholder="ornek@gmail.com"'))}
       <p class="sh-dip">Öğretmen bu e-posta ve geçici şifreyle öğretmen girişinden girer; yalnız kendi derslerini görür. Hesap açıldığı kursun işlem kaydına yazılır; kurs müdürüne de haber ver.</p>`
    : `<div class="sh-bos">${ik('kursiyer')}<b>Kursta öğretmen yok</b><small>Öğretmen önce kursun Personel listesine eklenmeli.</small></div>`;
  else govde = `${a_('Ad soyad', g_('ad', `required autocomplete="off" placeholder="${rol === 'demo' ? 'Örn. Ayşe Yılmaz (Kural Sürücü Kursu)' : 'Örn. Pelin Kaya'}"`))}
       ${a_(rol === 'demo' ? 'E-posta <small>boş bırakırsan demo kullanıcı adı üretilir</small>' : 'E-posta', g_('eposta', `type="email" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" ${rol === 'demo' ? '' : 'required'} placeholder="ornek@gmail.com"`))}
       ${a_('Cep telefonu <small>giriş bilgileri WhatsApp’tan bu numaraya gider</small>', g_('tel', 'type="tel" inputmode="tel" autocomplete="off" placeholder="05xx xxx xx xx"'))}
       ${rol === 'demo' ? '<p class="sh-dip">Demo hesabı gerçek bir kursa bağlı değildir. Girince giriş ekranındaki herkese açık Demo ile aynı örnek verili ekran açılır: veriler kişiye özel değildir, cihazlar arasında taşınmaz, hiçbir mesaj gönderilmez. E-postayı boş bırakırsan “Şifremi unuttum” bu hesapta çalışmaz.</p>' : '<p class="sh-dip">Bu kişi kursun bütün kayıtlarını görür. Hesap açıldığı kursun işlem kaydına yazılır; kurs müdürüne de haber ver.</p>'}`;
  const hazir = !((rol === 'ogrenci' && !ogrenciler.length) || (rol === 'usta' && !ustalar.length));
  pencere({
    baslik: ust, alt: true,
    icerik: `<form id="f-shd" class="og-giris-form yn-form" novalidate>${govde}<div data-p-hata aria-live="polite"></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-p-geri>Geri</button>${hazir ? '<button class="dg dg-ana" type="submit" form="f-shd">Hesabı oluştur</button>' : ''}`,
    onAc: p => {
      p.querySelector('[data-p-geri]').addEventListener('click', () => hesapAcPenceresi({ kurs: k, rol }));
      const f = p.querySelector('form'), hk = p.querySelector('[data-p-hata]');
      if (f.usta) f.usta.addEventListener('change', () => { const u = ustalar.find(x => String(x.id) === f.usta.value); if (u && u.eposta && !f.eposta.value) f.eposta.value = u.eposta; });
      f.addEventListener('submit', async ev => {
        ev.preventDefault(); hk.innerHTML = '';
        const b = p.querySelector('[type=submit]'); if (!b || b.disabled) return;
        let girdi;
        if (rol === 'ogrenci') { const x = ogrenciler.find(y => String(y.id) === f.ogr.value); if (!x) return bildir('Öğrenciyi seç', 'uyari'); girdi = { kursiyer: x }; }
        else if (rol === 'usta') { const u = ustalar.find(y => String(y.id) === f.usta.value); if (!u) return bildir('Öğretmeni seç', 'uyari'); if (!EPOSTA.test(f.eposta.value.trim())) { bildir('E-posta adresini kontrol et', 'uyari'); return f.eposta.focus(); } girdi = { ad: u.ad || 'Öğretmen', eposta: f.eposta.value.trim(), tel: u.tel || '', usta: u.id }; }
        else {
          const ad = f.ad.value.trim(), ep = f.eposta.value.trim();
          if (ad.length < 2) { bildir('Adı yaz', 'uyari'); return f.ad.focus(); }
          if ((rol !== 'demo' || ep) && !EPOSTA.test(ep)) { bildir('E-posta adresini kontrol et', 'uyari'); return f.eposta.focus(); }
          if (f.tel.value.trim() && !telNorm(f.tel.value)) { bildir('Cep telefonunu 05xx xxx xx xx biçiminde yaz', 'uyari'); return f.tel.focus(); }
          girdi = { ad, eposta: ep, tel: f.tel.value.trim() };
        }
        b.disabled = true; b.textContent = 'Oluşturuluyor…';
        try {
          const r = await hesapOlustur(k, rol, girdi);
          islem('mdSinyal Yönetim: hesap oluşturdu', [rol === 'demo' ? 'Demo' : kursAd(k), rolAdi, r.h.ad].join(' · ')); kaydet();
          hazirPenceresi(r.h, r.sifre, r.metin, rol === 'demo' ? 'Demo hesabı hazır' : 'Hesap hazır', `${e(r.h.ad)} artık bu bilgilerle girer.${rol === 'ogrenci' ? ' İlk girişte kendi şifresini belirler.' : rol === 'demo' ? ' Demo örnek verilerle açılır.' : ' Şifresini değiştirmek isterse giriş ekranındaki “Şifremi unuttum” e-postasına link gönderir.'}`);
          ciz();
        } catch (y) {
          b.disabled = false; b.textContent = 'Hesabı oluştur';
          const m = /EMAIL_EXISTS/.test(y.message || '') ? 'Bu e-posta başka bir hesapta kullanılıyor. Başka bir e-posta yaz.' : turkceHata(y);
          hk.innerHTML = `<p class="sh-hata">${ik('uyari')}<span>${e(m)}</span></p>`;
          if (y.yetki) islemHata(y);
        }
      });
    },
  });
}
// Giriş hesabı açılır, sonra Firestore belgeleri tek işlemde (commit) yazılır; yazım başarısız olursa açılan giriş hesabı geri silinir.
// Kurs, kendi verisine erişim verildiğini işlem geçmişinde (Ayarlar › İşlem kaydı) görür: bulut.js islemYaz ile aynı alanlar
const kursKaydi = (k, rol, kim, simdi) => ({ update: { name: tamYol('kurslar/' + k + '/kayit/' + rastgele(20)), fields: fsAlanlar({ uid: 'mdSinyal', ad: 'mdSinyal Yönetim', ne: 'mdSinyal hesap açtı', ayrinti: ((HESAP_ROL.find(x => x[0] === rol) || [])[1] || rol) + ' · ' + String(kim).slice(0, 200), yerel: simdi.toISOString(), cihaz: 'mdSinyal Yönetim › Hesaplar', zaman: simdi }) }, currentDocument: { exists: false } });
async function hesapOlustur(k, rol, girdi) {
  const sifre = geciciSifre(), simdi = new Date();
  if (rol === 'ogrenci') return ogrenciOlustur(k, girdi.kursiyer, sifre);
  const eposta = girdi.eposta || ('demo-' + rastgele(6) + '@demo.sinyal.invalid');
  const j = await api(IT + '/accounts', { email: eposta, password: sifre, displayName: girdi.ad });
  const uid = j.localId; if (!uid) throw new Error('Google hesap kimliği dönmedi');
  const yaz = rol === 'demo'
    ? [{ update: { name: tamYol('kullanicilar/' + uid), fields: fsAlanlar({ demo: true, rol: 'demo', ad: girdi.ad, acan: 'mdSinyal', acildi: simdi }) }, currentDocument: { exists: false } }]
    : [{ update: { name: tamYol('kullanicilar/' + uid), fields: fsAlanlar({ kurs: k }) }, currentDocument: { exists: false } },
       { update: { name: tamYol('kurslar/' + k + '/uyeler/' + uid), fields: fsAlanlar({ ad: girdi.ad, rol, usta: girdi.usta || null, eposta, katilma: simdi, acan: 'mdSinyal' }) }, currentDocument: { exists: false } },
       kursKaydi(k, rol, girdi.ad + ' · ' + eposta, simdi)];
  try { await commit(yaz); } catch (y) { await api(IT + '/accounts:delete', { localId: uid }).catch(() => { }); throw y; }
  const h = { uid, eposta, kullaniciAdi: '', ad: girdi.ad, tel: telNorm(girdi.tel) || '', rol, usta: girdi.usta || null, kurs: rol === 'demo' ? null : k, kursAd: rol === 'demo' ? null : kursAd(k), yonetim: false, kapali: false, olusturma: +simdi, sonGiris: 0 };
  (hesaplar = hesaplar || []).push(h);
  return { h, sifre, metin: yeniHesapMesaji(h, sifre) };
}
// Aynı yapı bulut.js ogrenciHesapAc'ta (kurs cihazından açılış); birinde alan değişirse öbürünü de güncelle.
async function ogrenciOlustur(k, x, sifre) {
  const tel = telNorm(x.tel); if (!tel) throw new Error('Öğrencinin cep telefonu geçersiz; önce kursun listesinde düzeltin');
  const V = await kursVerisiAl(k, true), guncel = (V.kursiyerler || []).find(y => String(y.id) === String(x.id));
  if (!guncel) throw new Error('Öğrenci kursun listesinde bulunamadı; listeyi yenileyip tekrar dene');
  if (guncel.hesap && guncel.hesap.uid) throw new Error('Bu öğrencinin hesabı az önce açılmış; Hesaplar listesine bak');
  const yer = V._yer.get(String(guncel.id)); if (!yer) throw new Error('Öğrenci kaydının yeri bulunamadı; kursun cihazından “Hesap aç” ile açın');
  const tj = await api(FS + ':batchGet', { documents: [tamYol('telefonlar/' + tel)] });
  const tb = (tj.find(y => y.found) || {}).found, tk = tb ? alanlar(tb.fields).k : null;
  if (tk && tk !== k) throw new Error('Bu telefon numarasıyla başka bir kursta öğrenci hesabı var. Öğrencinin başka bir numarasını girin');
  const eposta = tel + '.' + rastgele(6) + '@ogrenci.sinyal.app', kod = guncel.panelKod || rastgele(24), simdi = new Date();
  const ad = [guncel.ad, guncel.soyad].filter(Boolean).join(' ') || 'Öğrenci';
  const j = await api(IT + '/accounts', { email: eposta, password: sifre });
  const uid = j.localId; if (!uid) throw new Error('Google hesap kimliği dönmedi');
  // öğrenci kaydı (kurs verisinde): hesap ve panel kodu; kurs cihazı değişikliği canlı dinleyiciyle alır
  const yeni = { ...guncel, panelKod: kod, hesap: { tel, uid, acildi: bugunTarih(), kim: 'mdSinyal', sifirlandi: null } }; delete yeni.hesapAktif;
  const kayitAnahtar = String(guncel.id);
  const oge = { mapValue: { fields: { v: { stringValue: JSON.stringify(yeni) }, ...(yer.x ? { x: yer.x } : {}) } } };
  const yaz = [
    { update: { name: tamYol('kullanicilar/' + uid), fields: fsAlanlar({ kurs: k, rol: 'ogrenci', kod, kursiyer: guncel.id, ilkGiris: true }) }, currentDocument: { exists: false } },
    { update: { name: tamYol('kurslar/' + k + '/ogrenciler/' + kod), fields: fsAlanlar({ kursiyer: guncel.id, uid, v: ogrenciPanelMetni(V, yeni), islenen: [], guncel: simdi }) } },
    { update: { name: tamYol('telefonlar/' + tel), fields: fsAlanlar({ k, h: { [kayitAnahtar]: eposta } }) }, updateMask: { fieldPaths: ['k', 'h.' + yolParca(kayitAnahtar)] } },
    // kova belgesi okunduğundan beri değiştiyse (kurs cihazı bu arada yazdıysa) yazılmaz: eski kopya yeni değişikliği ezmesin
    { update: { name: yer.belge, fields: { i: { mapValue: { fields: { [kayitAnahtar]: oge } } } } }, updateMask: { fieldPaths: ['i.' + yolParca(kayitAnahtar)] }, currentDocument: yer.zaman ? { updateTime: yer.zaman } : { exists: true } },
    kursKaydi(k, 'ogrenci', ad + ' · ' + telGoster(tel), simdi),
  ];
  try { await commit(yaz); } catch (y) {
    await api(IT + '/accounts:delete', { localId: uid }).catch(() => { }); delete veriOnbellek[k];
    if (y.durum === 'FAILED_PRECONDITION') throw new Error('Kursun cihazında bu sırada öğrenci listesi değişti; hesap açılmadı. Tekrar dene.');
    throw y;
  }
  delete veriOnbellek[k];
  const h = { uid, eposta, kullaniciAdi: '', ad, tel, rol: 'ogrenci', kurs: k, kursAd: kursAd(k), yonetim: false, kapali: false, olusturma: +simdi, sonGiris: 0 };
  (hesaplar = hesaplar || []).push(h);
  return { h, sifre, metin: yeniHesapMesaji(h, sifre) };
}
function yeniHesapMesaji(h, sifre) {
  const ad = h.ad ? ' ' + h.ad.split(' ')[0] : '';
  if (h.rol === 'ogrenci') return `Merhaba${ad}, ${h.kursAd} öğrenci uygulamasında hesabın açıldı.\n\nGiriş: ${girisLinki('ogrenci')}\nTelefon: ${telGoster(h.tel)}\nGeçici şifre: ${sifre}\n\nİlk girişte kendi şifreni belirleyeceksin. Şifreni kimseyle paylaşma.`;
  if (h.rol === 'demo') return `Merhaba${ad}, mdSinyal demo hesabın hazır.\n\nGiriş: ${girisLinki('giris')}\nE-posta: ${h.eposta}\nŞifre: ${sifre}\n\nDemo örnek verilerle çalışır; gerçek bir kursa bağlı değildir, hiçbir mesaj gönderilmez.`;
  return `Merhaba${ad}, ${h.kursAd} için mdSinyal hesabın açıldı (${ROL[h.rol] || ''}).\n\nGiriş: ${girisLinki(h.rol)}\nE-posta: ${h.eposta}\nGeçici şifre: ${sifre}\n\nŞifreni değiştirmek istersen giriş ekranında “Şifremi unuttum”a bas; e-postana yenileme linki gelir.`;
}

async function davetPenceresi(yonetim) {
  pencere({ baslik: yonetim ? 'Yönetim hesabı linki' : 'Kurs hesabı linki', icerik: `<div class="sh-bos">${ik('saat')}<b>Link oluşturuluyor…</b></div>`, korumali: true });
  let link;
  try { link = await davetLinki(yonetim); } catch (x) { kapatPencere(); return islemHata(x); }
  pencere({
    baslik: yonetim ? 'Yönetim hesabı linki' : 'Kurs hesabı linki',
    icerik: `<p class="sh-sifre-not">${yonetim ? 'Bu linki açan kişi mdSinyal Yönetim hesabını kurar. Kendin açacaksan linke dokun.' : 'Satıştan sonra kurs müdürüne gönder; kurs kendi e-postası ve şifresiyle hesabını açar.'} Tek kullanımlık, 30 gün geçerli.</p><pre class="sh-mesaj">${e(link)}</pre>`,
    altlik: `<button class="dg dg-cizgi" data-p-kopya>Linki kopyala</button>${yonetim ? `<a class="dg dg-ana" href="${e(link)}" data-p-ac>Linki aç</a>` : `<a class="dg dg-wp" target="_blank" rel="noopener" href="${e(waLinki('', 'mdSinyal kurs hesabınızı bu linkten açabilirsiniz: ' + link))}">${ik('wp')}WhatsApp’tan gönder</a>`}`,
    onAc: p => {
      p.querySelector('[data-p-kopya]').addEventListener('click', () => navigator.clipboard.writeText(link).then(() => bildir('Link kopyalandı')).catch(() => bildir('Kopyalanamadı; elle seç', 'uyari')));
      const ac = p.querySelector('[data-p-ac]'); if (ac) ac.addEventListener('click', () => { kapatPencere(); document.body.classList.remove('sahip-modu'); });
    },
  });
}

// Hesaplar sekmesine dokununca (kullanıcı hareketi içinde) Google onayı kendiliğinden alınır; ayrıca düğmeye basmak gerekmez
export const hazirla = () => { gsiYukle().catch(() => { }); };
export function otoBaglan() {
  if (bagli() || !ISTEMCI) return;
  if (okuyabilir()) { if (!hesaplar && !yukleniyor) yenile(); return; }  // Google penceresi açılmaz; işlemde istenir
  baglan().then(() => { hataMetni = ''; hesaplar = null; ciz(); return yenile(); }).catch(x => { hataMetni = turkceHata(x); ciz(); });
}
// Henüz Yönetim hesabı yokken (ilk kurulum ya da hesap silindiyse): Google'da yetkili kişi kendine kurulum linki açar.
// Yetkiyi yine Google IAM verir; projede yetkisi olmayan Google hesabı link oluşturamaz.
// kendi cihazında hemen açıldığı için doğrudan uygulama ekranı (#/yonetim/kur/<kod>) verilir
export async function yonetimKurulumLinki() { await baglan(); return girisAdresi() + '#/yonetim/kur/' + await davetKodu(true); }

// ---- Destek talepleri ve verilen hizmetler (mdSinyal Yönetim › Destek) ----
// Kurslar mdSinyal'den (Hesabım › mdSinyal Destek) talep açar; talep kursun verisinde durur, cevap ve durum kursa geri yazılır.
// WhatsApp ya da telefonla gelenler elle eklenir; hizmetler Yönetim verisinde tutulur.
const TALEP_TUR = ['Hata', 'Soru', 'İstek', 'Eğitim'], KANAL = ['WhatsApp', 'Telefon', 'Yüz yüze', 'E-posta'];
const HIZMET_TUR = ['Kurulum', 'Eğitim', 'Destek', 'Veri aktarımı', 'Geliştirme', 'Ziyaret'];
const TDURUM = [['Açık', 'acik'], ['İnceleniyor', 'inceleniyor'], ['Çözüldü', 'cozuldu']];
const isl = () => { const v = S.isletme || {}; v.destekElle = v.destekElle || []; v.hizmetler = v.hizmetler || []; return v; };
const tKey = t => (t.elle ? 'e:' : t.kurs + ':') + t.id;
const tDurum = t => t.durum || 'Açık';
const tumTalepler = () => destekler.concat(isl().destekElle.map(t => ({ ...t, elle: true })))
  .sort((a, b) => (tDurum(a) === 'Çözüldü') - (tDurum(b) === 'Çözüldü') || String(b.zaman || '').localeCompare(String(a.zaman || '')));
const waTel = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = d.slice(1); if (d.length === 10) d = '90' + d; return /^90\d{10}$/.test(d) ? d : ''; };
const gunTarih = d => d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '';
const ayBaslik = ym => new Date(ym + '-01T12:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const kursAdlari = () => [...new Set(Object.values(kursIst).map(x => x.ad).concat((S.isletme && S.isletme.kurslar || []).map(k => k.ad)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
const bugunIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const kimlikUret = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function destekHtml() {
  const v = isl(), l = tumTalepler(), acik = l.filter(t => tDurum(t) !== 'Çözüldü').length, ay = bugunIso().slice(0, 7), hAy = v.hizmetler.filter(h => String(h.tarih || '').startsWith(ay));
  const sek = [['talepler', 'Talepler', acik], ['hizmetler', 'Hizmetler', v.hizmetler.length], ['hatalar', 'Son hatalar', hataRozet()], ['asistan', 'Asistan', ag.liste ? ag.liste.filter(x => !x.iyi).length : 0], ['mevzuat', 'Mevzuat', mo.takip ? (mo.takip.yeni || []).length : 0]];
  return `<div class="sh-bas"><div><h1>Destek</h1><p>${acik} açık talep · bu ay ${hAy.length} hizmet</p></div>
      <div class="sh-bas-dg"><button class="dg dg-cizgi dg-kucuk" data-sh-yenile ${yukleniyor ? 'disabled' : ''}>${ik('sifirla')}${yukleniyor ? 'Yükleniyor…' : 'Yenile'}</button><button class="dg dg-cizgi dg-kucuk" data-sh-talep-ekle>${ik('arti')}Talep ekle</button><button class="dg dg-ana dg-kucuk" data-sh-hizmet-ekle>${ik('arti')}Hizmet ekle</button></div></div>
    <div class="sh-suz sh-alt" role="tablist">${sek.map(([k, a, n]) => `<button role="tab" aria-selected="${destekAlt === k}" class="${destekAlt === k ? 'secili' : ''}" data-sh-dalt="${k}">${a}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div>
    ${destekAlt === 'talepler' ? talepListeHtml(l) : destekAlt === 'hatalar' ? hataListeHtml() : destekAlt === 'asistan' ? asistanGeriHtml() : destekAlt === 'mevzuat' ? mevzuatYonetHtml() : hizmetListeHtml(v.hizmetler)}`;
}
// ---- Kullanım (kullanim.js özetleri) ----
// Her cihaz günde bir kez kurslar/{kurs}/kullanim/{gün}_{cihaz} belgesine { o: JSON metni, g: gün } yazar. Kişisel veri yok:
// yalnız ekran adı, düğmenin data-* adı, süre, sayılar ve hata türü. Okuma sahip hesabıyla (kural: sahip her şeyi okur) ya da Google onayıyla.
const KU = { gun: 7, veri: null, yukleniyor: false, hata: '', gonderiliyor: false };
const isoYerel = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const sonGunler = n => Array.from({ length: n }, (_, i) => isoYerel(new Date(Date.now() - (i + 1) * 864e5)));
const aralikGunler = (bas, bit) => { const l = []; for (let d = new Date(bas + 'T12:00:00'); isoYerel(d) <= bit; d.setDate(d.getDate() + 1)) l.push(isoYerel(d)); return l; };
async function kullanimOku(gunler) {
  const kl = Object.entries(kursIst).filter(([, x]) => !x.belgeYok);
  // kurs başına tek sorgu: dönemin günleri (g alanı; tek alan dizini Firestore'da hazır)
  const ilk = gunler.slice().sort()[0], son = gunler.slice().sort().pop(), b = {};
  await Promise.all(kl.map(async ([k]) => {
    const j = await api(FS + '/kurslar/' + k + ':runQuery', { structuredQuery: { from: [{ collectionId: 'kullanim' }], where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'g' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: ilk } } }, { fieldFilter: { field: { fieldPath: 'g' }, op: 'LESS_THAN_OR_EQUAL', value: { stringValue: son } } }] } }, limit: 3000 } });
    for (const x of j) if (x.document) { const d = alanlar(x.document.fields), ad = x.document.name.split('/').pop(), g = String(d.g || ''); const yol = 'kurslar/' + k + '/kullanim/' + g; (b[yol] = b[yol] || {})['c_' + ad.slice(g.length + 1)] = d.o; }
  }));
  const T = { kurs: {}, ekran: {}, dugme: {}, hata: {}, cihaz: { telefon: 0, genis: 0 }, rol: {}, cg: 0, sn: 0, ot: 0, gunler };
  for (const [k, x] of kl) {
    const K = { ad: x.ad, cg: 0, cihaz: new Set(), gun: new Set(), sn: 0, ot: 0, hata: 0 };
    for (const g of gunler) {
      const d = b['kurslar/' + k + '/kullanim/' + g]; if (!d) continue;
      for (const [a, v] of Object.entries(d)) {
        if (!a.startsWith('c_') || typeof v !== 'string') continue;
        let o; try { o = JSON.parse(v); } catch (y) { continue; }
        K.cg++; K.cihaz.add(a); K.gun.add(g); K.sn += +o.sn || 0; K.ot += +o.ot || 0; T.cg++; T.sn += +o.sn || 0; T.ot += +o.ot || 0;
        T.cihaz[o.cihaz === 'telefon' ? 'telefon' : 'genis']++; if (o.rol) T.rol[o.rol] = (T.rol[o.rol] || 0) + 1;
        for (const [ad, s] of Object.entries(o.ekran || {})) { if (!Array.isArray(s)) continue; const t = T.ekran[ad] = T.ekran[ad] || [0, 0, 0, 0, 0, 0]; s.slice(0, 6).forEach((n, i) => { t[i] += +n || 0; }); K.hata += +s[2] || 0; }
        for (const [ad, n] of Object.entries(o.dugme || {})) T.dugme[ad] = (T.dugme[ad] || 0) + (+n || 0);
        for (const [ad, n] of Object.entries(o.hata || {})) T.hata[ad] = (T.hata[ad] || 0) + (+n || 0);
      }
    }
    if (K.cg) T.kurs[k] = { ...K, cihaz: K.cihaz.size, gun: K.gun.size };
  }
  return T;
}
async function kullanimYukle() {
  if (KU.yukleniyor) return;
  KU.yukleniyor = true; KU.hata = ''; ciz();
  try { KU.veri = await kullanimOku(sonGunler(KU.gun)); } catch (x) { KU.hata = turkceHata(x); }
  KU.yukleniyor = false; ciz();
}
const dk = sn => sn >= 3600 ? (sn / 3600).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' sa' : Math.round(sn / 60) + ' dk';
const ekranYaz = a => a.replace(/\//g, ' › ');
const dugmeYaz = a => a.replace(/^yarim:/, 'yarım bırakılan form: ').replace(/:git:/, ' → ').replace(/:/, ' › ').replace(/\//g, ' › ');
// sıralı listeler (ekranda ve e-postada aynı)
function kullanimListeleri(T) {
  const ekran = Object.entries(T.ekran).sort((a, b) => b[1][1] - a[1][1]).slice(0, 10);
  const dugme = Object.entries(T.dugme).filter(([a]) => !a.startsWith('yarim:')).sort((a, b) => b[1] - a[1]).slice(0, 12);
  // takılma puanı: açılış başına hata + uyarı + geri dönüş + yarım form (en az 5 açılışı olan ekranlar)
  const takil = Object.entries(T.ekran).filter(([, s]) => s[0] >= 5 && s[2] + s[3] + s[4] + s[5] > 0).map(([a, s]) => [a, s, (s[2] * 3 + s[3] + s[4] + s[5] * 2) / s[0]]).sort((a, b) => b[2] - a[2]).slice(0, 8);
  const hata = Object.entries(T.hata).sort((a, b) => b[1] - a[1]).slice(0, 8), kurs = Object.entries(T.kurs).sort((a, b) => b[1].sn - a[1].sn);
  return { ekran, dugme, takil, hata, kurs };
}
const takilMetni = s => [s[2] && s[2] + ' hata', s[3] && s[3] + ' uyarı', s[4] && s[4] + ' geri dönüş', s[5] && s[5] + ' yarım form'].filter(Boolean).join(' · ');
function kullanimHtml() {
  if (KU.veri === null && !KU.yukleniyor && !KU.hata) setTimeout(kullanimYukle, 0);
  const sec = `<div class="sh-suz" role="tablist" style="margin:0 0 12px">${[7, 30].map(n => `<button role="tab" aria-selected="${KU.gun === n}" class="${KU.gun === n ? 'secili' : ''}" data-sh-ku-gun="${n}">Son ${n} gün</button>`).join('')}</div>`;
  if (KU.hata && !KU.veri) return sec + `<div class="sh-bos">${ik('uyari')}<b>Kullanım verisi okunamadı</b><small>${e(KU.hata)}</small><button class="dg dg-cizgi dg-kucuk" data-sh-ku-yenile>Yeniden dene</button></div>`;
  if (!KU.veri || KU.yukleniyor) return sec + `<div class="sh-bos">${ik('saat')}<b>Kullanım verisi yükleniyor…</b></div>`;
  const T = KU.veri, L = kullanimListeleri(T), kutu = (et, d, a) => `<div><small>${et}</small><b>${d}</b>${a ? `<span>${a}</span>` : ''}</div>`;
  const cubuk = (n, en) => `<i aria-hidden="true" style="display:block;height:4px;margin-top:6px;border-radius:2px;background:var(--levha);opacity:.75;width:${Math.max(3, Math.round(n / (en || 1) * 100))}%"></i>`;
  const bolum = (b, ic) => `<h3 style="font-size:15px;font-weight:700;color:var(--murekkep);margin:20px 0 8px">${b}</h3>${ic}`;
  const liste = (l, bosM) => l.length ? `<div class="sh-liste">${l.join('')}</div>` : `<p class="sh-dip" style="margin-top:0">${bosM}</p>`;
  const satir = (b, s, sag) => `<div class="sh-satir"><span class="sh-satir-ic"><b>${b}</b>${s ? `<small>${s}</small>` : ''}</span>${sag ? `<span class="sh-satir-sag"><small style="display:inline">${sag}</small></span>` : ''}</div>`;
  const tel = T.cg ? Math.round(T.cihaz.telefon / T.cg * 100) : 0, haftalik = !!(S.kurs && S.kurs.sahipAnaliz);
  const ust = `<div class="sh-ist" style="cursor:default;margin-bottom:4px"><header><b>Bütün kurslar</b><small>Son ${KU.gun} gün · bugün henüz sayılmaz (cihazlar günün özetini ertesi gün yazar)</small></header>
    <div class="sh-ist-kutular">${kutu('Kullanan kurs', Object.keys(T.kurs).length, Object.keys(kursIst).length + ' kurs içinde')}${kutu('Cihaz-gün', T.cg, 'günde bir özet')}${kutu('Kullanım süresi', dk(T.sn), T.cg ? 'cihaz başına ' + dk(T.sn / T.cg) + '/gün' : '')}${kutu('Açılış', T.ot, '')}${kutu('Telefondan', '%' + tel, '')}${kutu('Hata', Object.values(T.hata).reduce((a, n) => a + n, 0), '')}</div></div>`;
  if (!T.cg) return sec + ust + `<div class="sh-bos">${ik('saat')}<b>Bu dönemde kullanım özeti yok</b><small>Kurslar uygulamayı kullandıkça her cihaz günde bir özet yazar. Özetin yazılması için Firestore kuralında kullanim bloğunun yayında olması gerekir (sinyal-kaynak/belgeler/firestore_taslak_2026-11-16.rules).</small></div>` + kullanimEpostaKart(haftalik);
  const enE = L.ekran.length ? L.ekran[0][1][1] : 1, enD = L.dugme.length ? L.dugme[0][1] : 1;
  return sec + ust
    + bolum('En çok zaman geçirilen ekranlar', liste(L.ekran.map(([a, s]) => satir(e(ekranYaz(a)), `${s[0]} açılış · açılış başına ${dk(s[1] / Math.max(1, s[0]))}` + cubuk(s[1], enE), dk(s[1]))), 'Veri yok.'))
    + bolum('En çok yapılan işlemler', liste(L.dugme.map(([a, n]) => satir(e(dugmeYaz(a)), cubuk(n, enD), n + ' kez')), 'Veri yok.'))
    + bolum('Takılınan yerler', liste(L.takil.map(([a, s]) => satir(e(ekranYaz(a)), e(takilMetni(s)) + ' · ' + s[0] + ' açılış', '')), 'En az 5 kez açılan ekranlarda hata, geri dönüş ya da yarım bırakılan form yok.'))
    + (L.hata.length ? bolum('Hata türleri', liste(L.hata.map(([a, n]) => satir(e(a === 'form' ? 'Form uyarısı' : a), '', n + ' kez')), '')) : '')
    + bolum('Kurslar', liste(L.kurs.map(([, k]) => satir(e(k.ad), `${k.cihaz} cihaz · ${k.gun} gün kullanıldı · ${k.ot} açılış${k.hata ? ' · ' + k.hata + ' hata' : ''}`, dk(k.sn))), 'Veri yok.'))
    + kullanimEpostaKart(haftalik)
    + `<p class="sh-dip">Sayılanlar: ekran adı, düğme adı, ekranda geçen süre (tek seferde en çok 30 dakika), açılış sayısı, hata türü, uyarı, hemen geri dönme ve doldurulup kaydedilmeden bırakılan form. Ad, telefon, T.C. kimlik numarası, tutar ya da yazılan metin alınmaz. Kurs müdürü Ayarlar › Veri ve e-posta’dan kapatabilir; öğrenci uygulaması ve demo sayılmaz.</p>`;
}
const kullanimEpostaKart = haftalik => `<div class="sh-ist" style="cursor:default;margin-top:20px"><header><b>Analiz e-postası</b><small>Bütün kursların kullanım özeti platform sahibinin adresine (worker’daki SAHIP_EPOSTA)</small></header>
  <label style="display:flex;align-items:center;gap:12px;margin-top:12px;cursor:pointer"><span style="flex:1;min-width:0;font-size:14px;color:var(--murekkep)">Her pazartesi geçen haftanın analizini gönder<br><small style="color:var(--soluk)">Yönetim’i haftanın ilk açışında gider; aynı hafta ikinci kez gitmez</small></span><span class="anahtar"><input type="checkbox" data-sh-ku-haftalik ${haftalik ? 'checked' : ''}><i></i></span></label>
  <button class="dg dg-cizgi dg-kucuk" style="margin-top:12px" data-sh-ku-gonder ${KU.gonderiliyor || !KU.veri ? 'disabled' : ''}>${ik('mesaj')}${KU.gonderiliyor ? 'Gönderiliyor…' : 'Bu görünümü şimdi gönder'}</button></div>`;
// e-posta gövdesi: satır içi stil
function kullanimEpostaHtml(T, baslik) {
  const L = kullanimListeleri(T), kursN = Object.keys(T.kurs).length, tel = T.cg ? Math.round(T.cihaz.telefon / T.cg * 100) : 0;
  const ac = s => `<span style="color:${R.soluk};font-weight:400">${s}</span>`;
  const govde = !T.cg ? [
    kutular([['Kullanan kurs', '0', 'bu dönemde'], ['Kullanım süresi', '0 dk', 'toplam']]),
    not('<b>Bu dönemde kullanım özeti yok.</b> Kurslar uygulamayı kullandıkça her cihaz günde bir özet yazar; özet ertesi gün burada görünür. Hiç gelmiyorsa Firestore kuralında <b>kullanim</b> bloğunun yayında olduğunu kontrol edin.'),
    dugme('Kullanım sayfasını aç', SITE + '/#/yonetim')].join('\n') : [
    kutular([['Kullanan kurs', String(kursN), T.cg + ' cihaz-gün'], ['Kullanım süresi', dk(T.sn), T.ot + ' açılış'], ['Telefondan', '%' + tel, 'cihaz-günlerin'], ['Hata', String(Object.values(T.hata).reduce((a, n) => a + n, 0)), L.takil.length + ' ekranda takılma']]),
    bolum('En çok zaman geçirilen ekranlar', L.ekran.length ? satirlar(L.ekran.map(([a, s]) => [e(ekranYaz(a)) + ' ' + ac('· ' + s[0] + ' açılış'), e(dk(s[1]))])) : bos('Veri yok.')),
    bolum('En çok yapılan işlemler', L.dugme.length ? satirlar(L.dugme.map(([a, n]) => [e(dugmeYaz(a)), n + ' kez'])) : bos('Veri yok.')),
    bolum('Takılınan yerler', L.takil.length ? satirlar(L.takil.map(([a, s]) => [nokta('#d97706') + e(ekranYaz(a)), '', { alt: e(takilMetni(s)) }])) : bos('Belirgin bir takılma yok.'), L.takil.length || null),
    L.hata.length ? bolum('Hata türleri', satirlar(L.hata.map(([a, n]) => [e(a === 'form' ? 'Form uyarısı' : a), String(n), { renk: R.kirmizi }]))) : '',
    bolum('Kurslar', satirlar(L.kurs.map(([, x]) => [`<b>${e(x.ad)}</b>`, e(dk(x.sn)), { alt: `${x.cihaz} cihaz · ${x.gun} gün` }])), kursN),
    dugme('Kullanım sayfasını aç', SITE + '/#/yonetim')].join('\n');
  return epKabuk({ ust: 'mdSinyal Yönetim · ' + baslik, baslik: 'Kullanım analizi', govde,
    onizleme: T.cg ? `${kursN} kurs · ${dk(T.sn)} kullanım · %${tel} telefondan` : 'Bu dönemde kullanım özeti yok',
    alt: 'Kişisel veri içermez: yalnız ekran ve düğme adları, süreler ve sayılar. Ayrıntı: mdSinyal Yönetim › Hesaplar › Kullanım.' });
}
async function kullanimGonder(T, baslik, donem) {
  const yetki = await hataYetki(); if (!yetki) throw new Error('Yetki yok: platform sahibinin hesabıyla gir');
  const r = await fetch(WORKER + '/eposta/sahip', { method: 'POST', headers: { Authorization: yetki, 'Content-Type': 'application/json' }, body: JSON.stringify({ konu: 'mdSinyal kullanım analizi · ' + baslik, html: kullanimEpostaHtml(T, baslik), metin: 'mdSinyal kullanım analizi · ' + baslik + '\nAyrıntı: mdSinyal Yönetim › Hesaplar › Kullanım', ...(donem ? { donem } : {}) }) }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (!r) throw new Error('Sunucuya ulaşılamadı');
  if (r.status === 503 || j.kurulu === false) throw new Error('E-posta servisi henüz kurulmadı');
  if (!r.ok || !j.ok) throw new Error(j.hata || 'Gönderilemedi');
  return j;
}
// haftalık analiz: açıksa ve bu hafta gitmediyse geçen haftanınki (Yönetim açılınca, hesaplar yüklendikten sonra)
let kuOtoBakildi = false;
async function kullanimHaftalik() {
  if (kuOtoBakildi || !(S.kurs && S.kurs.sahipAnaliz) || !Object.keys(kursIst).length) return; kuOtoBakildi = true;
  try {
    const { gecenHafta } = await import('./eposta.js?v=224'), h = gecenHafta();
    if (S.kurs.sahipAnalizSon === h.donem) return;
    const T = await kullanimOku(aralikGunler(h.bas, h.bit));
    const j = await kullanimGonder(T, h.bas.split('-').reverse().join('.') + ' – ' + h.bit.split('-').reverse().join('.'), h.donem);
    if (j.ok) { S.kurs.sahipAnalizSon = h.donem; kaydet(); }
  } catch (x) { console.warn('Haftalık analiz e-postası', x.message); }
}
async function kullanimTikla(t) {
  const g = t.closest('[data-sh-ku-gun]'); if (g) { KU.gun = +g.dataset.shKuGun; KU.veri = null; kullanimYukle(); return true; }
  if (t.closest('[data-sh-ku-yenile]')) { KU.veri = null; kullanimYukle(); return true; }
  const hk = t.closest('[data-sh-ku-haftalik]'); if (hk) { S.kurs.sahipAnaliz = hk.checked; islem('Haftalık kullanım analizi e-postasını ' + (hk.checked ? 'açtı' : 'kapattı')); kaydet(); bildir(hk.checked ? 'Her pazartesi gönderilecek' : 'Haftalık analiz kapatıldı'); return true; }
  if (t.closest('[data-sh-ku-gonder]') && KU.veri) {
    KU.gonderiliyor = true; ciz();
    try { await kullanimGonder(KU.veri, 'son ' + KU.gun + ' gün'); bildir('Analiz e-postası gönderildi'); } catch (x) { bildir(turkceHata(x), 'uyari'); }
    KU.gonderiliyor = false; ciz(); return true;
  }
  return false;
}

// ---- Son hatalar (worker GET /hata) ----
// Uygulama hataları kişisel veri içermeden worker'da 7 gün tutulur (app.js gönderir; e-posta, uzun sayı, adres sorgusu silinir).
// Okuma yalnız platform sahibine: Yönetim oturumunun Firebase kimliği (sahip hesabı) ya da worker'daki SAHIP_ANAHTAR.
// Anahtar yalnız bu sekmenin belleğinde durur; hiçbir yere yazılmaz.
const HATA_API = WORKER + '/hata';
const hata = { liste: null, toplam: 0, toplamBilinir: false, yukleniyor: false, hata: '', yetkisiz: false, anahtar: '' };
// sekme rozeti: worker toplamı verirse o (KV listesi en çok 1000 anahtar okur: 1000 ise '1000+'), vermezse yüklenen liste (en çok 300: '300+')
const HATA_LISTE_EN = 300, HATA_SAY_EN = 1000;
const hataRozet = () => !hata.liste ? 0 : hata.toplamBilinir ? (hata.toplam >= HATA_SAY_EN ? HATA_SAY_EN + '+' : hata.toplam) : (hata.liste.length >= HATA_LISTE_EN ? HATA_LISTE_EN + '+' : hata.liste.length);
async function hataYetki() {
  if (hata.anahtar) return 'Bearer ' + hata.anahtar;
  if (bulutKanca && bulutKanca.yetki) { try { return (await bulutKanca.yetki()).Authorization || ''; } catch (x) { } }
  return '';
}
async function hataGetir(ek = '') {
  const yetki = await hataYetki();
  if (!yetki) throw Object.assign(new Error('Yetki yok'), { yetkisiz: true });
  const r = await fetch(HATA_API + ek, { headers: { Authorization: yetki } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 403 || r.status === 401) throw Object.assign(new Error('Yetki yok'), { yetkisiz: true });
  if (!r.ok || !j.ok) throw new Error(j.hata || ('Sunucu ' + r.status + ' döndü'));
  return j;
}
async function hatalarYukle() {
  if (hata.yukleniyor) return;
  hata.yukleniyor = true; hata.hata = ''; ciz();
  try { const j = await hataGetir(); hata.liste = j.liste || []; hata.toplamBilinir = typeof j.toplam === 'number' && j.toplam >= hata.liste.length; hata.toplam = hata.toplamBilinir ? j.toplam : hata.liste.length; hata.yetkisiz = false; }
  catch (x) { if (x.yetkisiz) { hata.yetkisiz = true; if (hata.anahtar) { hata.anahtar = ''; hata.hata = 'Anahtar kabul edilmedi'; } } else hata.hata = turkceHata(x); }
  hata.yukleniyor = false; ciz();
}
const hataZaman = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const ROL_KISA = { mudur: 'müdür', sekreter: 'ön büro', usta: 'öğretmen', ortak: 'ortak', ogrenci: 'öğrenci', ziyaretci: 'ziyaretçi', demo: 'demo', yok: '' };
function hataListeHtml() {
  if (hata.liste === null && !hata.yukleniyor && !hata.yetkisiz && !hata.hata) { setTimeout(hatalarYukle, 0); }
  const anahtarFormu = `<form data-sh-hata-anahtar style="display:flex;gap:8px;margin-top:14px;width:100%;max-width:360px"><span class="og-girdi" style="flex:1;min-width:0"><input type="password" name="anahtar" autocomplete="off" placeholder="SAHIP_ANAHTAR" aria-label="Sahip anahtarı"></span><button class="dg dg-ana dg-kucuk" type="submit">Göster</button></form>`;
  if (hata.yetkisiz) return `<div class="sh-bos">${ik('kilit')}<b>Hata kayıtlarını yalnız platform sahibi görür</b><small>mdSinyal Yönetim’e platform sahibinin hesabıyla girdiysen liste kendiliğinden açılır. Başka hesapla girdiysen worker’daki SAHIP_ANAHTAR değerini yaz; anahtar bu sekmenin belleğinde kalır, hiçbir yere kaydedilmez. Anahtar tanımlı değilse: <code>wrangler secret put SAHIP_ANAHTAR</code>.</small>${anahtarFormu}${hata.hata ? `<p class="sh-hata">${ik('uyari')}<span>${e(hata.hata)}</span></p>` : ''}</div>`;
  if (hata.hata && !hata.liste) return `<div class="sh-bos">${ik('uyari')}<b>Hata kayıtları okunamadı</b><small>${e(hata.hata)}</small><button class="dg dg-cizgi dg-kucuk" data-sh-hata-yenile>Yeniden dene</button></div>`;
  if (!hata.liste) return `<div class="sh-bos">${ik('saat')}<b>Hata kayıtları yükleniyor…</b></div>`;
  const ust = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:4px 0 12px"><small style="color:var(--soluk);font-size:13px">Son 7 gün · ${hataRozet()} kayıt${(hata.toplamBilinir ? hata.toplam > hata.liste.length : hata.liste.length >= HATA_LISTE_EN) ? ' (en yeni ' + hata.liste.length + ')' : ''}</small><button class="dg dg-cizgi dg-kucuk" data-sh-hata-yenile ${hata.yukleniyor ? 'disabled' : ''}>${ik('sifirla')}${hata.yukleniyor ? 'Yükleniyor…' : 'Yenile'}</button></div>`;
  if (!hata.liste.length) return ust + `<div class="sh-bos">${ik('tik')}<b>Son 7 günde hata yok</b><small>Uygulamada beklenmeyen bir hata olunca burada görünür: tarih, sürüm, sayfa, mesaj ve kaç kez yaşandığı.</small></div>`;
  // data-resmi: teknik metin (rota, yığın) sade dil çevirisine uğramasın (ui.js sadelestir)
  return ust + `<div class="sh-liste" data-resmi>${hata.liste.map(x => `<button class="sh-satir" data-sh-hata="${e(x.id)}">
    <span class="sh-av sh-av-yok">${ik('uyari')}</span>
    <span class="sh-satir-ic"><b>${e(String(x.m || 'Mesaj yok').slice(0, 140))}</b><small>${e([hataZaman(x.son), x.s ? 'v' + x.s : '', x.r || '', ROL_KISA[x.rol] || ''].filter(Boolean).join(' · '))}</small></span>
    <span class="sh-satir-sag">${+x.sayi > 1 ? `<em class="sh-rozet">${+x.sayi} kez</em>` : '<small>1 kez</small>'}${ik('sag')}</span></button>`).join('')}</div>
    <p class="sh-dip">Kayıtlar kişisel veri içermez: e-posta, telefon ve T.C. gibi uzun sayılar sunucuda silinir; kurs yalnız kısaltılmış kimliğiyle sayılır. Aynı hata 10 dakikada bir kez yazılır, arada gelenler sayıya eklenir. Kayıtlar 7 gün sonra kendiliğinden silinir.</p>`;
}
// ---- Mevzuat asistanı geri bildirimleri (worker GET /mevzuat/geri) ----
// Kurs personeli "Bu cevap işinize yaradı mı?" dediğinde soru, kısa cevap, kaynak etiketleri ve notu 90 gün tutulur (TC, telefon, e-posta silinir).
// Okuma yalnız platform sahibine, hata listesiyle aynı yetkiyle.
const ag = { liste: null, toplam: 0, yukleniyor: false, hata: '', yetkisiz: false, suz: 'kotu' };
async function asistanGeriYukle() {
  if (ag.yukleniyor) return;
  ag.yukleniyor = true; ag.hata = ''; ciz();
  try {
    const yetki = await hataYetki(); if (!yetki) throw Object.assign(new Error('Yetki yok'), { yetkisiz: true });
    const r = await fetch(WORKER + '/mevzuat/geri', { headers: { Authorization: yetki } }), j = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Yetki yok'), { yetkisiz: true });
    if (!r.ok || !j.ok) throw new Error(j.hata || ('Sunucu ' + r.status + ' döndü'));
    ag.liste = j.liste || []; ag.toplam = j.toplam || ag.liste.length; ag.yetkisiz = false;
  } catch (x) { if (x.yetkisiz) ag.yetkisiz = true; else ag.hata = turkceHata(x); }
  ag.yukleniyor = false; ciz();
}
function asistanGeriHtml() {
  if (ag.liste === null && !ag.yukleniyor && !ag.yetkisiz && !ag.hata) setTimeout(asistanGeriYukle, 0);
  if (ag.yetkisiz) return `<div class="sh-bos">${ik('kilit')}<b>Geri bildirimleri yalnız platform sahibi görür</b><small>mdSinyal Yönetim’e platform sahibinin hesabıyla gir; “Son hatalar” sekmesindeki anahtarla da açılır.</small></div>`;
  if (ag.hata && !ag.liste) return `<div class="sh-bos">${ik('uyari')}<b>Geri bildirimler okunamadı</b><small>${e(ag.hata)}</small><button class="dg dg-cizgi dg-kucuk" data-sh-ag-yenile>Yeniden dene</button></div>`;
  if (!ag.liste) return `<div class="sh-bos">${ik('saat')}<b>Geri bildirimler yükleniyor…</b></div>`;
  const iyi = ag.liste.filter(x => x.iyi).length, kotu = ag.liste.length - iyi;
  const l = ag.liste.filter(x => ag.suz === 'hepsi' || (ag.suz === 'kotu' ? !x.iyi : x.iyi));
  const ust = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:4px 0 12px">
    <div class="sh-suz" role="tablist">${[['kotu', 'Eksik ya da yanlış', kotu], ['iyi', 'İşe yaradı', iyi], ['hepsi', 'Hepsi', ag.liste.length]].map(([k, a, n]) => `<button role="tab" aria-selected="${ag.suz === k}" class="${ag.suz === k ? 'secili' : ''}" data-sh-ag-suz="${k}">${a} <em>${n}</em></button>`).join('')}</div>
    <button class="dg dg-cizgi dg-kucuk" data-sh-ag-yenile ${ag.yukleniyor ? 'disabled' : ''}>${ik('sifirla')}Yenile</button></div>`;
  if (!l.length) return ust + `<div class="sh-bos">${ik('tik')}<b>${ag.liste.length ? 'Bu süzgeçte kayıt yok' : 'Henüz geri bildirim yok'}</b><small>Kurslar mevzuat asistanının cevabına “İşe yaradı” ya da “Eksik ya da yanlış” dediğinde burada görünür. Yanlış denenleri inceleyip rehbere, sık sorulanlara ya da derleme eklemek asistanı iyileştirir.</small></div>`;
  return ust + `<div class="sh-liste" data-resmi>${l.map(x => `<div class="sh-satir" style="cursor:default;align-items:flex-start">
    <span class="sh-av ${x.iyi ? 'sh-av-hizmet' : 'sh-av-yok'}">${ik(x.iyi ? 'tik' : 'uyari')}</span>
    <span class="sh-satir-ic"><b>${e(String(x.soru || '').slice(0, 200))}</b>${x.cevap ? `<small style="white-space:normal">Cevap: ${e(String(x.cevap).slice(0, 300))}</small>` : ''}${x.not ? `<small style="white-space:normal;color:var(--murekkep)">Not: ${e(x.not)}</small>` : ''}<small>${e([hataZaman(x.z), ROL_KISA[x.rol] || '', x.kurs ? 'kurs ' + String(x.kurs).slice(0, 6) : '', (x.etiketler || []).slice(0, 3).join(', ')].filter(Boolean).join(' · '))}</small></span></div>`).join('')}</div>
    <p class="sh-dip">Son ${ag.toplam} kayıttan en yeni 100’ü. Kayıtlar 90 gün tutulur; T.C. kimlik, telefon ve e-posta sunucuda silinir.</p>`;
}
// ---- Mevzuat derlemi yönetimi (worker /mevzuat/ortak/*) ----
// Platform sahibi, yayın beklemeden bütün kursların mevzuat aramasına ve asistanına belge ekler, eskiyen belgeyi işaretler, duyuru yazar.
// Günlük takip (worker cron, 07:00) derlem kaynaklarının değişip değişmediğini ve Resmî Gazete'deki ilgili başlıkları bildirir.
const MO_TUR = [['yonetmelik', 'Yönetmelik'], ['kanun', 'Kanun'], ['yonerge', 'Yönerge'], ['teblig', 'Tebliğ'], ['kilavuz', 'Kılavuz'], ['yazi', 'MEB yazısı'], ['bilgilendirme', 'Resmî bilgilendirme'], ['form', 'Form'], ['program', 'Ders programı']];
const MO_DURUM = [['degisti', 'Değişti'], ['kalkti', 'Yürürlükten kalktı'], ['taslak', 'Taslak / yürürlükte değil']];
const mo = { veri: null, takip: null, statik: null, yukleniyor: false, hata: '', yetkisiz: false, denetleniyor: false };
async function moIstek(yol, { yontem = 'GET', govde } = {}) {
  const yetki = await hataYetki(); if (!yetki) throw Object.assign(new Error('Yetki yok'), { yetkisiz: true });
  const r = await fetch(WORKER + yol, { method: yontem, headers: { Authorization: yetki, ...(govde ? { 'Content-Type': 'application/json' } : {}) }, body: govde ? JSON.stringify(govde) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Yetki yok'), { yetkisiz: true });
  if (!r.ok || !j.ok) throw new Error(j.hata || ('Sunucu ' + r.status + ' döndü'));
  return j;
}
async function mevzuatYonetYukle() {
  if (mo.yukleniyor) return; mo.yukleniyor = true; mo.hata = ''; ciz();
  try {
    const [o, t] = await Promise.all([fetch(WORKER + '/mevzuat/ortak?t=' + Date.now()).then(r => r.json()), moIstek('/mevzuat/ortak/takip')]);
    mo.veri = o; mo.takip = t.takip || {}; mo.yetkisiz = false;
    if (!mo.statik) { try { const ic = await (await fetch(siteLink('veri/mevzuat/icindekiler.txt'))).text(); mo.statik = (ic.split('\n')[0].replace(/^Belgeler:\s*/, '').split('; ').map(x => x.split(' = ')).filter(x => x.length === 2)); } catch (x) { mo.statik = []; } }
  } catch (x) { if (x.yetkisiz) mo.yetkisiz = true; else mo.hata = turkceHata(x); }
  mo.yukleniyor = false; ciz();
}
const moTarih = t => t ? new Date(t.length === 10 ? t + 'T12:00:00' : t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
function mevzuatYonetHtml() {
  if (mo.veri === null && !mo.yukleniyor && !mo.yetkisiz && !mo.hata) setTimeout(mevzuatYonetYukle, 0);
  if (mo.yetkisiz) return `<div class="sh-bos">${ik('kilit')}<b>Mevzuat yönetimi yalnız platform sahibine açık</b><small>mdSinyal Yönetim’e platform sahibinin hesabıyla gir.</small></div>`;
  if (mo.hata && !mo.veri) return `<div class="sh-bos">${ik('uyari')}<b>Mevzuat bilgisi okunamadı</b><small>${e(mo.hata)}</small><button class="dg dg-cizgi dg-kucuk" data-sh-mo-yenile>Yeniden dene</button></div>`;
  if (!mo.veri) return `<div class="sh-bos">${ik('saat')}<b>Mevzuat bilgisi yükleniyor…</b></div>`;
  const { belgeler = [], durum = {}, duyurular = [] } = mo.veri, t = mo.takip || {}, yeni = t.yeni || [];
  const tumBelge = [...belgeler.map(b => [b.id, b.ad + ' (eklenen)']), ...(mo.statik || [])];
  const adi = id => (tumBelge.find(x => x[0] === id) || [id, id])[1];
  const secenek = (l, sec = '') => l.map(([k, a]) => `<option value="${e(k)}"${k === sec ? ' selected' : ''}>${e(a)}</option>`).join('');
  const bildirim = x => x.tur === 'rg' ? `<b>Resmî Gazete · ${e(moTarih(x.tarih))}</b><small style="white-space:normal">${e(x.baslik)}</small>` : x.tur === 'kaynak' ? `<b>Kaynak değişti: ${e(x.ad)}</b><small style="white-space:normal">Resmî dosya güncellenmiş olabilir. Yeni metni indirip “Belge ekle” ile yükle, eskisini “Değişti” olarak işaretle.</small>` : `<b>Kaynağa ulaşılamadı: ${e(x.ad)}</b><small>${e(String(x.hata || ''))}</small>`;
  return `<div class="sh-mz" data-resmi>
    <section class="sh-grup"><h2>Takip<span>${t.son ? 'son denetim ' + e(moTarih(t.son)) + ' · her gün 07:00' : 'henüz denetlenmedi · her gün 07:00'}</span></h2>
      <div class="sh-mz-dg"><button class="dg dg-cizgi dg-kucuk" data-sh-mo-denetle ${mo.denetleniyor ? 'disabled' : ''}>${ik('sifirla')}${mo.denetleniyor ? 'Denetleniyor…' : 'Şimdi denetle'}</button><button class="dg dg-cizgi dg-kucuk" data-sh-mo-yenile>${ik('sifirla')}Yenile</button></div>
      ${yeni.length ? `<div class="sh-liste">${yeni.slice(0, 20).map(x => `<a class="sh-satir" href="${e(x.adres)}" target="_blank" rel="noopener"><span class="sh-av ${x.tur === 'erisilemedi' ? 'sh-av-yok' : 'sh-av-hizmet'}">${ik(x.tur === 'rg' ? 'belge' : 'uyari')}</span><span class="sh-satir-ic">${bildirim(x)}</span>${ik('sag')}</a>`).join('')}</div>` : `<p class="sh-dip">Yeni bildirim yok. ${Object.keys(t.kaynak || {}).length} kaynak adresi ve Resmî Gazete fihristi her gün denetlenir; değişiklik olunca burada ve e-postanda görünür.</p>`}
    </section>
    <section class="sh-grup"><h2>Platforma eklenen belgeler<span>${belgeler.length} belge · bütün kurslarda aramada ve asistanda</span></h2>
      <div class="sh-mz-dg"><button class="dg dg-ana dg-kucuk" data-sh-mo-ekle>${ik('arti')}Belge ekle</button></div>
      ${belgeler.length ? `<div class="sh-liste">${belgeler.map(b => `<div class="sh-satir" style="cursor:default"><span class="sh-av sh-av-hizmet">${ik('belge')}</span><span class="sh-satir-ic"><b>${e(b.ad)}</b><small>${e([(MO_TUR.find(x => x[0] === b.tur) || [, b.tur])[1], b.kurum, b.tarih ? moTarih(b.tarih) : '', b.parca + ' parça', 'eklendi ' + moTarih(b.eklenme)].filter(Boolean).join(' · '))}</small></span><button class="dg dg-hafif dg-kucuk" data-sh-mo-sil="${e(b.id)}">Sil</button></div>`).join('')}</div>` : `<p class="sh-dip">Yeni bir yönetmelik değişikliği, MEB yazısı, harç tebliği ya da kılavuz çıktığında buradan ekle. PDF, Word, fotoğraf ya da metin olur; metni okunur, özetlenir, bütün kursların aramasına ve asistanına hemen girer.</p>`}
    </section>
    <section class="sh-grup"><h2>Belge durumları<span>eskiyen belge aramada geri düşer, asistan uyarır</span></h2>
      <form class="sh-mz-form" data-sh-mo-durum>
        <label>Belge<select name="belge" required><option value="">Seç</option>${secenek(tumBelge)}</select></label>
        <label>Durum<select name="durum">${secenek(MO_DURUM)}</select></label>
        <label>Yerine geçen (isteğe bağlı)<select name="yerine"><option value="">—</option>${secenek(tumBelge)}</select></label>
        <label class="tam">Not<input name="not" maxlength="400" placeholder="Ör. 1 Ocak 2027'den itibaren yeni tutarlar geçerli"></label>
        <button class="dg dg-ana dg-kucuk" type="submit">Kaydet</button>
      </form>
      ${Object.keys(durum).length ? `<div class="sh-liste">${Object.entries(durum).map(([id, d]) => `<div class="sh-satir" style="cursor:default"><span class="sh-av sh-av-yok">${ik('uyari')}</span><span class="sh-satir-ic"><b>${e(adi(id))} · ${e((MO_DURUM.find(x => x[0] === d.durum) || [, d.durum])[1])}</b><small style="white-space:normal">${e([d.not, d.yerine ? 'yerine: ' + adi(d.yerine) : '', moTarih(d.tarih)].filter(Boolean).join(' · '))}</small></span><button class="dg dg-hafif dg-kucuk" data-sh-mo-durum-sil="${e(id)}">Kaldır</button></div>`).join('')}</div>` : ''}
    </section>
    <section class="sh-grup"><h2>Duyurular<span>kursların mevzuat ekranında “Güncel değişiklikler”</span></h2>
      <form class="sh-mz-form" data-sh-mo-duyuru>
        <label class="tam">Başlık<input name="baslik" maxlength="120" required placeholder="Ör. 2027 sürücü belgesi harçları yayımlandı"></label>
        <label class="tam">Açıklama<textarea name="metin" rows="2" maxlength="800" placeholder="Kurslar için kısa açıklama: ne değişti, ne zamandan itibaren"></textarea></label>
        <label class="tam">Resmî bağlantı (isteğe bağlı)<input name="bag" type="url" placeholder="https://www.resmigazete.gov.tr/..."></label>
        <button class="dg dg-ana dg-kucuk" type="submit">Yayınla</button>
      </form>
      ${duyurular.length ? `<div class="sh-liste">${duyurular.map(d => `<div class="sh-satir" style="cursor:default"><span class="sh-av sh-av-hizmet">${ik('bilgi')}</span><span class="sh-satir-ic"><b>${e(d.baslik)}</b><small style="white-space:normal">${e([moTarih(d.tarih), d.metin].filter(Boolean).join(' · '))}</small></span><button class="dg dg-hafif dg-kucuk" data-sh-mo-duyuru-sil="${e(d.id)}">Sil</button></div>`).join('')}</div>` : ''}
    </section>
  </div>`;
}
function mevzuatBelgePenceresi() {
  pencere({ baslik: 'Platforma belge ekle', korumali: false,
    icerik: `<form class="sh-mz-form tek" data-p-mo novalidate>
      <label class="tam">Dosya<input type="file" name="dosya" accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"></label>
      <label class="tam">ya da metni yapıştır<textarea name="metin" rows="4"></textarea></label>
      <label class="tam">Başlık<input name="ad" maxlength="150" required placeholder="Ör. Harçlar Kanunu Genel Tebliği (Seri No: 99)"></label>
      <label>Tür<select name="tur">${MO_TUR.map(([k, a]) => `<option value="${k}">${a}</option>`).join('')}</select></label>
      <label>Kurum<input name="kurum" maxlength="80" placeholder="Ör. ÖÖKGM, GİB, Resmî Gazete"></label>
      <label>Belgenin tarihi<input type="date" name="tarih"></label>
      <label>Sayı<input name="sayi" maxlength="80"></label>
      <label class="tam">Resmî bağlantı<input type="url" name="kaynak" placeholder="https://..."></label>
      <p class="sh-dip tam">Yalnız resmî kaynaktan alınmış belge yükle (mevzuat.gov.tr, Resmî Gazete, meb.gov.tr, il/ilçe MEM). Belge bütün kursların aramasına ve asistanına girer; özeti yapay zekâ çıkarır.</p>
      <p class="sh-hata tam" data-p-mo-durum hidden></p>
    </form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-p-mo-gonder>Yükle</button>`,
    onAc: p => p.querySelector('[data-p-mo-gonder]').addEventListener('click', async () => {
      const f = p.querySelector('form'), x = f.dosya.files[0], metin = f.metin.value.trim(), ad = f.ad.value.trim(), dg = p.querySelector('[data-p-mo-gonder]'), d = p.querySelector('[data-p-mo-durum]');
      const yaz = (m, h) => { d.hidden = false; d.textContent = m; d.style.color = h ? '' : 'var(--soluk)'; };
      if (!x && metin.length < 20) return yaz('Bir dosya seç ya da metni yapıştır', true);
      if (!ad) return yaz('Başlık yaz', true);
      if (x && x.size > 10 * 1024 * 1024) return yaz('Dosya 10 MB’tan büyük', true);
      const tur = x ? (x.type || (/\.docx$/i.test(x.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : /\.pdf$/i.test(x.name) ? 'application/pdf' : '')) : 'text/plain;charset=utf-8';
      const q = new URLSearchParams({ ad, tur: f.tur.value, kurum: f.kurum.value.trim(), tarih: f.tarih.value || '', sayi: f.sayi.value.trim(), kaynak: f.kaynak.value.trim() });
      dg.disabled = true; yaz('Yükleniyor; metin okunuyor, parçalanıyor ve özetleniyor… Bu bir dakika sürebilir.');
      try {
        const yetki = await hataYetki(); if (!yetki) throw new Error('Yetki yok: platform sahibi hesabıyla gir');
        const r = await fetch(WORKER + '/mevzuat/ortak/yukle?' + q, { method: 'POST', headers: { Authorization: yetki, 'Content-Type': tur }, body: x || metin });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.hata || ('Sunucu ' + r.status + ' döndü'));
        kapatPencere(); bildir('Belge eklendi: ' + j.belge.parca + ' parça bütün kursların aramasına girdi'); mo.veri = null; ciz();
      } catch (y) { dg.disabled = false; yaz(turkceHata(y), true); }
    }) });
}
async function moIslem(yol, govde, basari) {
  try { await moIstek(yol, { yontem: 'POST', govde }); bildir(basari); mo.veri = null; ciz(); }
  catch (x) { bildir(x.yetkisiz ? 'Yetki yok' : turkceHata(x), 'uyari'); }
}
function gonder(ev) {
  const fd = ev.target.closest('[data-sh-mo-durum]');
  if (fd) { ev.preventDefault(); if (!fd.belge.value) return bildir('Belge seç', 'uyari'); return moIslem('/mevzuat/ortak/durum', { belge: fd.belge.value, durum: fd.durum.value, not: fd.not.value.trim(), yerine: fd.yerine.value }, 'Belge durumu kaydedildi'); }
  const fu = ev.target.closest('[data-sh-mo-duyuru]');
  if (fu) { ev.preventDefault(); if (!fu.baslik.value.trim()) return bildir('Başlık yaz', 'uyari'); return moIslem('/mevzuat/ortak/duyuru', { baslik: fu.baslik.value.trim(), metin: fu.metin.value.trim(), bag: fu.bag.value.trim() }, 'Duyuru yayınlandı'); }
  const f = ev.target.closest('[data-sh-hata-anahtar]'); if (!f) return;
  ev.preventDefault(); const v = f.anahtar.value.trim(); if (!v) return bildir('Anahtarı yaz', 'uyari');
  hata.anahtar = v; hata.yetkisiz = false; hata.hata = ''; hata.liste = null; hatalarYukle();
}
async function hataPenceresi(id) {
  const x = (hata.liste || []).find(y => y.id === id); if (!x) return;
  const satir = (et, d) => d ? `<div class="krsd-satir"><span>${et}</span><b>${e(d)}</b></div>` : '';
  const ic = k => `<div class="krsd" data-resmi><div class="krsd-liste">${satir('Son', hataZaman(k.son))}${satir('İlk', hataZaman(k.ilk))}${satir('Kaç kez', String(k.sayi || 1))}${satir('Sürüm', k.s ? 'v' + k.s : '')}${satir('Sayfa', k.r)}${satir('Rol', ROL_KISA[k.rol] || '')}${satir('Tarayıcı', k.tr)}${k.kurslar ? satir('Kurs sayısı', String(k.kurslar.length)) : ''}${satir('Tür', k.t === 'soz' ? 'Söz (promise) hatası' : '')}</div>
    <h3 class="krsd-bas">Mesaj</h3><p class="krsd-not">${e(k.m || '')}</p>
    ${k.y ? `<h3 class="krsd-bas">Yığın</h3><pre style="white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,Menlo,monospace;background:var(--panel-2,#f4f4f7);border-radius:10px;padding:10px 12px;margin:0;max-height:260px;overflow:auto">${e(k.y)}</pre>` : k.y === undefined ? '<p class="sh-dip" data-sh-hata-bekle>Ayrıntı yükleniyor…</p>' : ''}</div>`;
  pencere({ baslik: 'Hata ayrıntısı', alt: true, icerik: `<div data-sh-hata-ic>${ic(x)}</div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc: async p => {
      try { const j = await hataGetir('?id=' + encodeURIComponent(x.id)); const yer = p.querySelector('[data-sh-hata-ic]'); if (yer && j.kayit) yer.innerHTML = ic({ ...x, ...j.kayit, y: j.kayit.y || '' }); }
      catch (y) { const b = p.querySelector('[data-sh-hata-bekle]'); if (b) b.textContent = 'Ayrıntı okunamadı: ' + (y.yetkisiz ? 'yetki yok' : turkceHata(y)); }
    } });
}
function talepListeHtml(l) {
  if (!l.length) return `<div class="sh-bos">${ik('mesaj')}<b>Destek talebi yok</b><small>Kurslar mdSinyal’de Hesabım › mdSinyal Destek’ten talep açınca burada görünür. WhatsApp ya da telefonla gelenleri “Talep ekle” ile kaydet.</small></div>`;
  return `<div class="sh-liste">${l.map(t => `<button class="sh-satir sh-t-${TDURUM.find(d => d[0] === tDurum(t))[1]}" data-sh-talep="${e(tKey(t))}">
    <span class="sh-t-nokta" aria-hidden="true"></span>
    <span class="sh-satir-ic"><b>${e(t.tur || 'Talep')} · ${e(String(t.metin || '').slice(0, 90))}</b><small>${e([t.kursAd, t.kim, gunOnce(t.zaman), t.kanal || 'mdSinyal'].filter(Boolean).join(' · '))}</small></span>
    <span class="sh-satir-sag"><em class="sh-durum-r">${e(tDurum(t))}</em>${ik('sag')}</span></button>`).join('')}</div>`;
}
function hizmetListeHtml(l) {
  if (!l.length) return `<div class="sh-bos">${ik('belge')}<b>Kayıtlı hizmet yok</b><small>Kurulum, eğitim, destek gibi verdiğin her hizmeti “Hizmet ekle” ile kaydet; ay ay toplamı burada görünür.</small></div>`;
  const ay = new Map(); l.slice().sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))).forEach(h => { const k = String(h.tarih || '').slice(0, 7); if (!ay.has(k)) ay.set(k, []); ay.get(k).push(h); });
  return [...ay].map(([k, hs]) => { const ucret = hs.reduce((t, h) => t + (+h.ucret || 0), 0), sure = hs.reduce((t, h) => t + (+h.sure || 0), 0);
    return `<section class="sh-grup"><h2>${e(ayBaslik(k))}<span>${hs.length} hizmet${sure ? ' · ' + (sure >= 60 ? (Math.round(sure / 6) / 10).toLocaleString('tr-TR') + ' saat' : sure + ' dk') : ''}${ucret ? ' · ' + tl(ucret) : ''}</span></h2><div class="sh-liste">${hs.map(h => `<button class="sh-satir" data-sh-hizmet="${e(h.id)}">
      <span class="sh-av sh-av-hizmet">${ik('tik')}</span>
      <span class="sh-satir-ic"><b>${e(h.kursAd || 'Kurs')} · ${e(h.tur || 'Hizmet')}</b><small>${e([gunTarih(h.tarih), h.aciklama, h.sure ? h.sure + ' dk' : ''].filter(Boolean).join(' · '))}</small></span>
      <span class="sh-satir-sag">${+h.ucret ? `<b class="sh-ucret">${tl(+h.ucret)}</b>` : ''}${ik('sag')}</span></button>`).join('')}</div></section>`; }).join('');
}
async function talepDurumYaz(t, durum, cevap) {
  const zaman = new Date().toISOString();
  if (t.elle) { const x = isl().destekElle.find(y => y.id === t.id); if (x) Object.assign(x, { durum, cevap, cevapZaman: zaman }); islem('mdSinyal Destek: talep güncellendi', (t.kursAd || '') + ' · ' + durum); kaydet(); return; }
  const ist = kursIst[t.kurs] || {}, cur = { ...(ist.destekCevap || {}), [t.id]: { durum, cevap, zaman } };
  await api(FS + '/kurslar/' + t.kurs + '/v/t~destekCevap', { fields: { a: { stringValue: 'destekCevap' }, t: { stringValue: JSON.stringify(cur) } } }, 'PATCH');
  ist.destekCevap = cur; const y = destekler.find(z => z.kurs === t.kurs && z.id === t.id); if (y) Object.assign(y, { durum, cevap, zaman });
}
function talepPenceresi(t) {
  const satir = (et, d) => d ? `<div class="krsd-satir"><span>${et}</span><b>${e(d)}</b></div>` : '';
  pencere({ baslik: (t.tur || 'Talep') + ' · ' + (t.kursAd || ''), alt: true, icerik: `<div class="krsd">
      <div class="krsd-liste">${satir('Kurs', t.kursAd)}${satir('Kişi', t.kim)}${satir('Telefon', t.tel)}${satir('Tarih', t.zaman ? new Date(t.zaman).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '')}${satir('Kanal', t.kanal || 'mdSinyal')}</div>
      <h3 class="krsd-bas">Talep</h3><p class="krsd-not">${e(t.metin || '').replace(/\n/g, '<br>')}</p>
      <h3 class="krsd-bas">Durum</h3><div class="sh-durum-sec" role="radiogroup">${TDURUM.map(([d, c]) => `<button type="button" role="radio" aria-checked="${tDurum(t) === d}" class="sh-t-${c}${tDurum(t) === d ? ' secili' : ''}" data-p-durum="${d}"><i></i>${d}</button>`).join('')}</div>
      <label class="og-alan" style="margin-top:14px"><span class="og-alan-et">Cevap ya da not ${t.elle ? '' : '<small>kurs mdSinyal’de görür</small>'}</span><span class="og-girdi yn-alan-uzun"><textarea name="cevap" rows="3" placeholder="Örn. Hata düzeltildi, sayfayı yenileyin">${e(t.cevap || '')}</textarea></span></label></div>`,
    altlik: `${waTel(t.tel) ? `<a class="dg dg-wp" target="_blank" rel="noopener" href="${e(waLinki(waTel(t.tel), 'Merhaba, mdSinyal destek talebiniz hakkında yazıyorum.'))}">${ik('wp')}WhatsApp</a>` : ''}<button class="dg dg-cizgi" data-p-hizmet>Hizmet olarak kaydet</button><button class="dg dg-ana" data-p-kaydet>Kaydet</button>`,
    onAc: p => {
      let durum = tDurum(t);
      p.querySelectorAll('[data-p-durum]').forEach(b => b.addEventListener('click', () => { durum = b.dataset.pDurum; p.querySelectorAll('[data-p-durum]').forEach(x => { x.classList.toggle('secili', x === b); x.setAttribute('aria-checked', x === b); }); }));
      p.querySelector('[data-p-kaydet]').addEventListener('click', async ev => { const b = ev.currentTarget; b.disabled = true;
        try { await talepDurumYaz(t, durum, p.querySelector('[name=cevap]').value.trim()); kapatPencere(); bildir('Talep güncellendi'); ciz(); } catch (x) { b.disabled = false; islemHata(x); } });
      p.querySelector('[data-p-hizmet]').addEventListener('click', () => hizmetPenceresi(null, { kursAd: t.kursAd, tur: 'Destek', aciklama: (t.tur || 'Talep') + ': ' + String(t.metin || '').slice(0, 80), talep: t }));
    } });
}
function talepEklePenceresi() {
  const a = (et, ic) => `<label class="og-alan"><span class="og-alan-et">${et}</span>${ic}</label>`, g = (ad, ek = '') => `<span class="og-girdi"><input name="${ad}" ${ek}></span>`;
  const sec = (ad, l) => `<span class="og-girdi"><select name="${ad}">${l.map(x => `<option>${x}</option>`).join('')}</select></span>`;
  pencere({ baslik: 'Talep ekle', alt: true, icerik: `<form id="f-sht" class="og-giris-form yn-form">
      ${a('Kurs', g('kurs', 'list="sh-kurslar" required placeholder="Örn. Kural" autocomplete="off"'))}<datalist id="sh-kurslar">${kursAdlari().map(k => `<option value="${e(k)}">`).join('')}</datalist>
      <div class="yn-form-ikili">${a('Kişi', g('kim', 'placeholder="Örn. Pelin Hanım"'))}${a('Telefon', g('tel', 'type="tel" inputmode="tel" placeholder="05xx xxx xx xx"'))}</div>
      <div class="yn-form-ikili">${a('Konu', sec('tur', TALEP_TUR))}${a('Nereden geldi', sec('kanal', KANAL))}</div>
      ${a('Talep', `<span class="og-girdi yn-alan-uzun"><textarea name="metin" rows="4" required placeholder="Ne istediler, sorun ne"></textarea></span>`)}</form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-sht">Kaydet</button>`,
    onAc: p => p.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target;
      if (!f.kurs.value.trim()) return bildir('Kurs adını yaz', 'uyari'); if (!f.metin.value.trim()) return bildir('Talebi yaz', 'uyari');
      isl().destekElle.unshift({ id: kimlikUret(), zaman: new Date().toISOString(), kursAd: f.kurs.value.trim(), kim: f.kim.value.trim(), tel: f.tel.value.trim(), tur: f.tur.value, kanal: f.kanal.value, metin: f.metin.value.trim(), durum: 'Açık' });
      if (!S.isletme.destekElle) S.isletme.destekElle = isl().destekElle;
      islem('mdSinyal Destek: talep ekledi', f.kurs.value.trim()); kaydet(); kapatPencere(); bildir('Talep kaydedildi'); destekAlt = 'talepler'; ciz(); }) });
}
function hizmetPenceresi(h, on = {}) {
  const v = isl(), x = h || on, a = (et, ic) => `<label class="og-alan"><span class="og-alan-et">${et}</span>${ic}</label>`, g = (ad, d, ek = '') => `<span class="og-girdi"><input name="${ad}" value="${e(d == null ? '' : d)}" ${ek}></span>`;
  pencere({ baslik: h ? 'Hizmeti düzenle' : 'Hizmet ekle', alt: true, icerik: `<form id="f-shh" class="og-giris-form yn-form">
      <div class="yn-form-ikili">${a('Tarih', g('tarih', x.tarih || bugunIso(), 'type="date" required'))}${a('Tür', `<span class="og-girdi"><select name="tur">${HIZMET_TUR.map(t => `<option ${(x.tur || 'Destek') === t ? 'selected' : ''}>${t}</option>`).join('')}</select></span>`)}</div>
      ${a('Kurs', g('kurs', x.kursAd, 'list="sh-kurslar2" required placeholder="Örn. Kural" autocomplete="off"'))}<datalist id="sh-kurslar2">${kursAdlari().map(k => `<option value="${e(k)}">`).join('')}</datalist>
      ${a('Ne yapıldı', `<span class="og-girdi yn-alan-uzun"><textarea name="aciklama" rows="3" placeholder="Örn. Ön büroya kayıt ekranı eğitimi">${e(x.aciklama || '')}</textarea></span>`)}
      <div class="yn-form-ikili">${a('Süre (dakika)', g('sure', x.sure || '', 'type="number" min="0" inputmode="numeric" placeholder="Örn. 45"'))}${a('Ücret (₺)', g('ucret', x.ucret || '', 'type="number" min="0" inputmode="numeric" placeholder="Ücretsizse boş bırak"'))}</div></form>`,
    altlik: `${h ? '<button class="dg dg-cizgi" data-p-sil style="margin-right:auto;color:var(--kirmizi)">Sil</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-shh">Kaydet</button>`,
    onAc: p => {
      p.querySelector('form').addEventListener('submit', async ev => { ev.preventDefault(); const f = ev.target;
        if (!f.kurs.value.trim()) return bildir('Kurs adını yaz', 'uyari');
        const y = { tarih: f.tarih.value || bugunIso(), tur: f.tur.value, kursAd: f.kurs.value.trim(), aciklama: f.aciklama.value.trim(), sure: Math.max(0, parseInt(f.sure.value, 10) || 0), ucret: Math.max(0, parseFloat(f.ucret.value) || 0) };
        if (h) Object.assign(h, y); else v.hizmetler.unshift({ id: kimlikUret(), ...y, ...(on.talep ? { talep: tKey(on.talep) } : {}) });
        if (S.isletme && !S.isletme.hizmetler) S.isletme.hizmetler = v.hizmetler;
        islem(h ? 'mdSinyal Destek: hizmeti güncelledi' : 'mdSinyal Destek: hizmet kaydetti', y.kursAd + ' · ' + y.tur); kaydet();
        if (on.talep && tDurum(on.talep) !== 'Çözüldü') { try { await talepDurumYaz(on.talep, 'Çözüldü', on.talep.cevap || ''); } catch (x) { islemHata(x); } }
        kapatPencere(); bildir(h ? 'Hizmet güncellendi' : 'Hizmet kaydedildi'); if (!h) destekAlt = on.talep ? destekAlt : 'hizmetler'; ciz(); });
      const sl = p.querySelector('[data-p-sil]'); if (sl) sl.addEventListener('click', () => { v.hizmetler.splice(v.hizmetler.indexOf(h), 1); islem('mdSinyal Destek: hizmeti sildi', h.kursAd || ''); kaydet(); kapatPencere(); bildir('Hizmet silindi'); ciz(); });
    } });
}
async function destekTikla(t) {
  const d = t.closest('[data-sh-dalt]'); if (d) { destekAlt = d.dataset.shDalt; ciz(); return true; }
  if (t.closest('[data-sh-hata-yenile]')) { hatalarYukle(); return true; }
  if (t.closest('[data-sh-ag-yenile]')) { asistanGeriYukle(); return true; }
  if (t.closest('[data-sh-mo-yenile]')) { mo.veri = null; mevzuatYonetYukle(); return true; }
  if (t.closest('[data-sh-mo-ekle]')) { mevzuatBelgePenceresi(); return true; }
  if (t.closest('[data-sh-mo-denetle]')) { mo.denetleniyor = true; ciz(); try { const j = await moIstek('/mevzuat/ortak/takip-calistir', { yontem: 'POST', govde: {} }); mo.takip = j.takip; bildir('Denetim bitti'); } catch (x) { bildir(turkceHata(x), 'uyari'); } mo.denetleniyor = false; ciz(); return true; }
  const ms = t.closest('[data-sh-mo-sil]'); if (ms) { if (!ms.dataset.onay) { ms.dataset.onay = '1'; ms.textContent = 'Silmeyi onayla'; return true; } await moIslem('/mevzuat/ortak/sil', { id: ms.dataset.shMoSil }, 'Belge silindi'); return true; }
  const md = t.closest('[data-sh-mo-durum-sil]'); if (md) { await moIslem('/mevzuat/ortak/durum', { belge: md.dataset.shMoDurumSil, durum: '' }, 'Durum kaldırıldı'); return true; }
  const mu = t.closest('[data-sh-mo-duyuru-sil]'); if (mu) { await moIslem('/mevzuat/ortak/duyuru', { sil: mu.dataset.shMoDuyuruSil }, 'Duyuru silindi'); return true; }
  const agz = t.closest('[data-sh-ag-suz]'); if (agz) { ag.suz = agz.dataset.shAgSuz; ciz(); return true; }
  const hk = t.closest('[data-sh-hata]'); if (hk) { hataPenceresi(hk.dataset.shHata); return true; }
  if (t.closest('[data-sh-talep-ekle]')) { talepEklePenceresi(); return true; }
  if (t.closest('[data-sh-hizmet-ekle]')) { hizmetPenceresi(null); return true; }
  const tk = t.closest('[data-sh-talep]'); if (tk) { const x = tumTalepler().find(y => tKey(y) === tk.dataset.shTalep); if (x) talepPenceresi(x); return true; }
  const hz = t.closest('[data-sh-hizmet]'); if (hz) { const x = isl().hizmetler.find(y => y.id === hz.dataset.shHizmet); if (x) hizmetPenceresi(x); return true; }
  return false;
}

// ---- giriş ekranları için: giremeyene kendiliğinden yardım ----
// Şifre yanlış girilince form altında açılır; kişi “şifremi unuttum”u aramak zorunda kalmaz.
export function yardimHtml({ kim = '', tur = 'kurs', eposta = false }) {
  // Kurs ve Yönetim hesabında yeni şifre yalnız e-postaya gelen sıfırlama linkiyle alınır (WhatsApp'tan şifre istenmez).
  // E-postası olmayan Yönetim kullanıcı adı için: hesabı açan yöneticiden yeni şifre istenir (Yönetim › Hesaplar › Yeni şifre ver).
  // Öğrenci hesabını kurs açar; yeni geçici şifreyi de kurs verir (öğrenci dosyası › Öğrenci hesabı › Yeni geçici şifre gönder).
  // Girişten "şifremi WhatsApp'tan iste" talebi gönderilmez (16 Kas 2026'da kaldırıldı).
  if (tur === 'ogrenci') return `<div class="og-yardim" role="status">
    <b>Giremedin mi?</b>
    <p>Telefon numaranı kontrol et. Şifreni hatırlamıyorsan kursuna söyle; kurs sana yeni geçici şifre verir.</p>
  </div>`;
  return `<div class="og-yardim" role="status">
    <b>Giremediniz mi?</b>
    ${eposta ? `<p>Şifrenizi hatırlamaya uğraşmayın. E-postanıza bir sıfırlama linki gönderelim, yeni şifrenizi kendiniz belirleyin.</p>
    <button type="button" class="dg dg-ana og-yardim-dg" data-yardim-eposta>E-postama sıfırlama linki gönder</button>`
    : `<p>${tur === 'yonetim' ? 'Kullanıcı adıyla açılan hesaplarda yeni şifreyi hesabı açan yönetici verir. E-posta adresinizle girdiyseniz e-postanızı yazıp “Şifremi unuttum”a basın.' : 'E-posta adresinizi yazıp “Şifremi unuttum”a basın; sıfırlama linki gelen kutunuza gelir.'}</p>`}
  </div>`;
}
export const girisHatasiMi = x => !!x && (/invalid-credential|wrong-password|user-not-found|invalid-login|user-disabled/.test(x.code || '') || /hatalı|hesap yok/.test(x.kullanici || ''));
