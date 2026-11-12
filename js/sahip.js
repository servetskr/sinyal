// Sinyal sahip araçları: bütün hesaplar tek yerde (kurs personeli, öğrenciler, Sinyal Yönetim ve ortak).
// Sinyal Yönetim panelinin “Hesaplar” bölümünde açılır (yalnız Servet; ortak görmez).
// Yetki Firebase güvenlik kurallarından değil, Google hesabından gelir: Firebase projesinin sahibi olan Google hesabıyla
// bağlanılır, Google IAM izin verirse işlem yapılır. Sunucu, gizli anahtar yok; erişim belirteci yalnız bellekte durur (1 saat).
import { e, ik, pencere, kapatPencere, bildir, tl } from './ui.js?v=180';
import { S, kaydet, islem } from './veri.js?v=180';

const PROJE = 'sinyal-5d37a';
const ISTEMCI = '451344576006-sua0mu4d4qcssc0lv8g01qic26hr6os7.apps.googleusercontent.com';  // Google OAuth istemci kimliği (herkese açık bilgidir; yetkiyi Google hesabı verir)
const KAPSAM = 'https://www.googleapis.com/auth/cloud-platform';
const IT = 'https://identitytoolkit.googleapis.com/v1/projects/' + PROJE;
const FS_AD = 'projects/' + PROJE + '/databases/(default)/documents';
const FS = 'https://firestore.googleapis.com/v1/' + FS_AD;
export const DESTEK_TEL = '905013636536';
const YONETIM_KURS = 'Sinyal Yönetim';
const ROL = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Öğretmen', ortak: 'Ortak', ogrenci: 'Öğrenci' };
const SUZGEC = [['hepsi', 'Hepsi'], ['personel', 'Kurs personeli'], ['ogrenci', 'Öğrenciler'], ['yonetim', 'Yönetim']];

const SIL_GUN = 7;  // silinen hesap bu kadar gün geri alınabilir, sonra kalıcı silinir
let silinecekler = [], kursIst = {}, destekler = [], gorunum = 'hesaplar', alt = 'kurslar', destekAlt = 'talepler';
let belirtec = null, bitis = 0, hesaplar = null, talepler = [], suzgec = 'hepsi', arama = '', kok = null, yukleniyor = false, hataMetni = '', gomulu = false, ipucu = '';

// Google onayı sekme açık kaldıkça (en çok 1 saat) hatırlanır; her yenilemede yeniden onay istenmez
const SAKLA = 'sinyal-sahip-onay';
try { const o = JSON.parse(sessionStorage.getItem(SAKLA) || 'null'); if (o && o.bitis > Date.now()) { belirtec = o.t; bitis = o.bitis; } } catch (x) { }
const rastgele = (n, harf = 'abcdefghijkmnpqrstuvwxyz23456789') => [...crypto.getRandomValues(new Uint8Array(n))].map(x => harf[x % harf.length]).join('');
// okunması ve WhatsApp'tan yazılması kolay geçici şifre: 4 harf + 4 rakam (karışan harfler yok)
const geciciSifre = () => rastgele(4, 'abcdefghkmnprstuvyz') + rastgele(4, '23456789');
const girisAdresi = () => location.origin + location.pathname;

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

async function api(url, govde, yontem) {
  if (!bagli()) { belirtec = null; throw Object.assign(new Error('Google bağlantısının süresi doldu; yeniden bağlan'), { yetki: true }); }
  const r = await fetch(url, { method: yontem || (govde ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + belirtec, ...(govde ? { 'Content-Type': 'application/json' } : {}) }, body: govde ? JSON.stringify(govde) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) { belirtec = null; try { sessionStorage.removeItem(SAKLA); } catch (x) { } }
    const m = (j.error && j.error.message) || ('HTTP ' + r.status);
    throw Object.assign(new Error(r.status === 401 ? 'Google bağlantısının süresi doldu; yeniden bağlan' : r.status === 403 ? 'Bu Google hesabının Sinyal projesinde yetkisi yok (' + m + ')' : 'Google: ' + m), { yetki: r.status === 401 });
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
  do {
    const j = await api(IT + '/accounts:batchGet?maxResults=1000' + (sayfa ? '&nextPageToken=' + encodeURIComponent(sayfa) : ''));
    users = users.concat(j.users || []); sayfa = j.nextPageToken || '';
  } while (sayfa);
  const kd = await belgeler(users.map(u => 'kullanicilar/' + u.localId));
  const kb = uid => kd['kullanicilar/' + uid] || null;
  const kursIdler = [...new Set(Object.values(kd).map(d => d.kurs).filter(Boolean))];
  const kurslar = await belgeler(kursIdler.map(k => 'kurslar/' + k), ['ad', 'sehir']);
  const uyeler = await belgeler(users.filter(u => kb(u.localId) && kb(u.localId).kurs && kb(u.localId).rol !== 'ogrenci').map(u => 'kurslar/' + kb(u.localId).kurs + '/uyeler/' + u.localId));
  const ogr = await belgeler(users.filter(u => kb(u.localId) && kb(u.localId).rol === 'ogrenci' && kb(u.localId).kod).map(u => 'kurslar/' + kb(u.localId).kurs + '/ogrenciler/' + kb(u.localId).kod), ['v']);
  let tl = [];
  try {
    const j = await api(FS + ':runQuery', { structuredQuery: { from: [{ collectionId: 'sifreTalep', allDescendants: true }] } });
    tl = j.filter(x => x.document).map(x => { const p = x.document.name.slice(FS_AD.length + 1).split('/'); return { yol: p.join('/'), kurs: p[1], tel: p[3], zaman: alanlar(x.document.fields).zaman }; });
  } catch (x) { }
  hesaplar = users.map(u => {
    const d = kb(u.localId) || {}, kurs = d.kurs || null, kursAd = kurs ? ((kurslar['kurslar/' + kurs] || {}).ad || 'Adı bilinmeyen kurs') : null;
    const uye = kurs ? uyeler['kurslar/' + kurs + '/uyeler/' + u.localId] || null : null;
    const rol = d.rol === 'ogrenci' ? 'ogrenci' : uye ? uye.rol : null;
    const telM = String(u.email || '').match(/^(90\d{10})\./);
    let ad = (uye && uye.ad) || u.displayName || '';
    if (rol === 'ogrenci') { try { const k = JSON.parse((ogr['kurslar/' + kurs + '/ogrenciler/' + d.kod] || {}).v || '{}').kursiyerler[0]; ad = [k.ad, k.soyad].filter(Boolean).join(' ') || ad; } catch (x) { } }
    const yonetim = kursAd === YONETIM_KURS || /@yonetim\.sinyal\.invalid$/.test(u.email || '');
    const kullaniciAdi = /@yonetim\.sinyal\.invalid$/.test(u.email || '') ? u.email.split('@')[0] : '';
    return {
      uid: u.localId, eposta: u.email || '', kullaniciAdi, ad: ad || kullaniciAdi || (telM ? 'Öğrenci' : u.email || 'Adsız hesap'),
      tel: telM ? telM[1] : '', rol, kurs, kursAd, yonetim, kapali: !!u.disabled,
      olusturma: u.createdAt ? +u.createdAt : 0, sonGiris: u.lastLoginAt ? +u.lastLoginAt : 0,
    };
  });
  talepler = tl;
  // silinen hesaplar: 7 gün içinde geri alınabilir; süresi dolanlar şimdi kalıcı silinir
  let sl = [];
  try { const j = await api(FS + '/sahipSilinecek?pageSize=300'); sl = (j.documents || []).map(d => ({ ...alanlar(d.fields), uid: d.name.split('/').pop() })); } catch (x) { }
  for (const x of sl.filter(x => kalanGun(x) <= 0)) { try { await kaliciSil(x); } catch (y) { } }
  silinecekler = sl.filter(x => kalanGun(x) > 0);
  for (const h of hesaplar) { const x = silinecekler.find(y => y.uid === h.uid); if (x) h.silinecek = x.zaman; }
  // her kursun verisi: istatistik ve destek talepleri
  kursIst = {}; destekler = [];
  for (const k of kursIdler) {
    const ad = (kurslar['kurslar/' + k] || {}).ad || 'Adı bilinmeyen kurs';
    if (ad === YONETIM_KURS) continue;
    try { kursIst[k] = await kursIstatistik(k, ad, (kurslar['kurslar/' + k] || {}).sehir || ''); } catch (x) { kursIst[k] = { ad, hata: x.message }; }
  }
}
const kalanGun = x => SIL_GUN - Math.floor((Date.now() - Date.parse(x.zaman)) / 864e5);
// kursun Sinyal verisi (kurslar/{kurs}/v): diziler parça parça, diğerleri tek belge
async function kursVerisi(k) {
  let docs = [], sayfa = '';
  do { const j = await api(FS + '/kurslar/' + k + '/v?pageSize=300' + (sayfa ? '&pageToken=' + encodeURIComponent(sayfa) : '')); docs = docs.concat(j.documents || []); sayfa = j.nextPageToken || ''; } while (sayfa);
  const V = {}, parca = {};
  for (const d of docs) {
    const f = alanlar(d.fields); if (!f.a) continue;
    if (f.d) { const l = parca[f.a] = parca[f.a] || []; for (const x of Object.values(f.i || {})) { if (x && typeof x.v === 'string') try { l.push([+x.x || 0, JSON.parse(x.v)]); } catch (y) { } } }
    else if (typeof f.t === 'string') { try { V[f.a] = JSON.parse(f.t); } catch (y) { } }
  }
  for (const [a, l] of Object.entries(parca)) V[a] = l.sort((p, q) => p[0] - q[0]).map(p => p[1]);
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
  (V.destek || []).forEach(t => destekler.push({ ...t, kurs: k, kursAd: ad, kanal: 'Sinyal', ...(cevap[t.id] || {}) }));
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
  const acik = talepler.filter(t => h.tel && t.tel === h.tel && t.kurs === h.kurs);
  for (const t of acik) await belgeSil(t.yol).catch(() => { });
  talepler = talepler.filter(t => !acik.includes(t));
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
async function davetLinki(yonetim) {
  const kod = rastgele(20), simdi = new Date();
  await api(FS + '/kursDavetleri?documentId=' + kod, { fields: { olusturan: { stringValue: 'sahip' }, not: { stringValue: yonetim ? YONETIM_KURS : 'Sahip panelinden' }, tarih: { timestampValue: simdi.toISOString() }, son: { timestampValue: new Date(+simdi + 30 * 864e5).toISOString() } } });
  return girisAdresi() + (yonetim ? '#/yonetim/kur/' : '#/yeni-kurs/') + kod;
}

// ---- metinler ----
const zamanMetni = ms => {
  if (!ms) return 'hiç girmedi';
  const g = Math.floor((Date.now() - ms) / 864e5);
  if (g <= 0) return 'bugün girdi'; if (g === 1) return 'dün girdi'; if (g < 30) return g + ' gün önce girdi';
  return new Date(ms).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' girdi';
};
const telGoster = t => t ? '0' + t.slice(2, 5) + ' ' + t.slice(5, 8) + ' ' + t.slice(8, 10) + ' ' + t.slice(10) : '';
const rolAd = h => h.yonetim ? (h.rol === 'ortak' ? 'Ortak · yalnız görür' : 'Sinyal Yönetim') : ROL[h.rol] || 'Kursa bağlı değil';
const kimlik = h => h.kullaniciAdi ? 'kullanıcı adı ' + h.kullaniciAdi : h.tel ? telGoster(h.tel) : h.eposta;
function sifreMesaji(h, sifre) {
  const ad = h.ad && !/^(Öğrenci|Adsız hesap)$/.test(h.ad) ? ' ' + h.ad.split(' ')[0] : '';
  if (h.rol === 'ogrenci') return `Merhaba${ad}, Sinyal öğrenci girişin için yeni geçici şifren: ${sifre}\n\nGiriş: ${girisAdresi()}#/ogrenci-giris\nCep telefonun ve bu şifreyle gir; ilk girişte kendi şifreni belirleyeceksin.`;
  if (h.yonetim) return `Merhaba${ad}, Sinyal Yönetim için yeni şifren: ${sifre}\n\nGiriş: ${girisAdresi()}#/yonetim\n${h.kullaniciAdi ? 'Kullanıcı adı: ' + h.kullaniciAdi : 'E-posta: ' + h.eposta}`;
  return `Merhaba${ad}, Sinyal için yeni şifren: ${sifre}\n\nGiriş: ${girisAdresi()}\nE-posta: ${h.eposta}\nGirdikten sonra Hesabım bölümünden kendi şifreni belirleyebilirsin.`;
}
const benMi = h => !!ipucu && h.eposta.toLocaleLowerCase('tr') === ipucu.toLocaleLowerCase('tr');
const waLinki = (tel, metin) => 'https://wa.me/' + (tel || '') + '?text=' + encodeURIComponent(metin);

// ---- ekran ----
// Sinyal Yönetim içinde (Hesaplar bölümü): üst çubuk ve sayfa kabuğu Yönetim panelinden gelir
export function sahipGomulu(yer, eposta, gor = 'hesaplar') {
  kok = yer; gomulu = true; gorunum = gor; ipucu = /@/.test(eposta || '') && !/\.invalid$/.test(eposta) ? eposta : '';
  ciz();
  if (bagli() && !hesaplar && !yukleniyor) yenile();
  if (!kok.dataset.shBagli) { kok.dataset.shBagli = '1'; kok.addEventListener('click', tikla); kok.addEventListener('input', yaz); }
}
export function sahipEkrani(yer) {
  kok = yer || document.getElementById('uyg'); gomulu = false;
  document.body.classList.remove('portal-modu', 'yonetim-modu'); document.body.classList.add('sahip-modu');
  document.title = 'Sinyal · Sahip paneli';
  ciz();
  if (!kok.dataset.shBagli) { kok.dataset.shBagli = '1'; kok.addEventListener('click', tikla); kok.addEventListener('input', yaz); }
}
const ust = () => `<header class="sh-ust"><div class="sh-marka"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="#f2b705" stroke="#fff" stroke-width="1.2"/><path d="M12 8v5M12 15.6v.3" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg><span><b>Sinyal</b><small>Sahip paneli</small></span></div>
  ${bagli() ? `<button class="sh-yenile" data-sh-yenile ${yukleniyor ? 'disabled' : ''}>${ik('sifirla')}<span>${yukleniyor ? 'Yükleniyor…' : 'Yenile'}</span></button>` : ''}</header>`;

const kabuk = (ic, giris) => gomulu ? `<div class="sh sh-gomulu${giris ? ' sh-giris' : ''}">${ic}</div>` : `<div class="sh">${ust()}<main class="sh-govde${giris ? ' sh-giris' : ''}">${ic}</main></div>`;
function ciz() {
  if (!kok || (gomulu ? !kok.isConnected : !document.body.classList.contains('sahip-modu'))) return;
  if (!bagli()) {
    kok.innerHTML = kabuk(`<div class="sh-giris-kart">
        <span class="sh-giris-ik">${ik('kilit')}</span>
        <h1>${gorunum === 'destek' ? 'Destek talepleri ve hizmetler' : 'Bütün hesaplar ve kurslar'}</h1>
        <p>${gorunum === 'destek' ? 'Kursların Sinyal’den açtığı talepler, WhatsApp’tan gelenler ve verdiğin hizmetler tek yerde.' : 'Her kursun kullanımı, öğrenci ve personel hesapları. Şifresini unutana tek dokunuşla yeni şifre verir, hesabı silersin.'}</p>
        <button class="dg dg-ana sh-giris-dg" data-sh-baglan>${ik('kilit')}Google hesabınla bağlan</button>
        ${hataMetni ? `<p class="sh-hata">${ik('uyari')}<span>${e(hataMetni)}</span></p>` : ''}
        <p class="sh-dip">Güvenlik için hesaplara Google hesabınla bir kez daha onay verirsin (${ipucu ? e(ipucu) : 'Sinyal projesinin sahibi olan Google hesabı'}); onay bir saat geçerli. Şifreler ve anahtarlar hiçbir yerde saklanmaz.</p>
      </div>`, true);
    return;
  }
  if (!hesaplar) { kok.innerHTML = kabuk(`<div class="sh-bos">${ik('saat')}<b>${gorunum === 'destek' ? 'Destek talepleri' : 'Hesaplar ve kurs verileri'} yükleniyor…</b></div>`); return; }
  if (gorunum === 'destek') { kok.innerHTML = kabuk(destekHtml()); return; }
  const kursSay = Object.keys(kursIst).length, gorunur = hesaplar.filter(h => !h.silinecek);
  const talepHtml = talepler.length ? `<section class="sh-talep"><h2>${ik('uyari')}Şifre isteyenler <span>${talepler.length}</span></h2>${talepler.map(t => {
    const h = hesaplar.find(x => x.tel === t.tel && x.kurs === t.kurs);
    return `<div class="sh-talep-satir"><span><b>${e(h ? h.ad : telGoster(t.tel))}</b><small>${e(h ? h.kursAd : 'Öğrenci')} · ${e(telGoster(t.tel))}</small></span>${h ? `<button class="dg dg-ana dg-kucuk" data-sh-sifre="${h.uid}">Yeni şifre ver</button>` : ''}</div>`;
  }).join('')}</section>` : '';
  const sekme = [['kurslar', 'Kurslar', kursSay], ['hesaplar', 'Hesaplar', gorunur.length], ['silinen', 'Silinenler', silinecekler.length]];
  kok.innerHTML = kabuk(`
    <div class="sh-bas"><div><h1>Hesaplar</h1><p>${kursSay} kurs · ${gorunur.length} hesap</p></div>
      <div class="sh-bas-dg">${gomulu ? `<button class="dg dg-cizgi dg-kucuk" data-sh-yenile ${yukleniyor ? 'disabled' : ''}>${ik('sifirla')}${yukleniyor ? 'Yükleniyor…' : 'Yenile'}</button>` : ''}<button class="dg dg-cizgi dg-kucuk" data-sh-davet="kurs">${ik('arti')}Kurs hesabı linki</button><button class="dg dg-cizgi dg-kucuk" data-sh-davet="yonetim">${ik('arti')}Yönetim hesabı linki</button></div></div>
    ${talepHtml}
    <div class="sh-suz sh-alt" role="tablist">${sekme.map(([k, a, n]) => `<button role="tab" aria-selected="${alt === k}" class="${alt === k ? 'secili' : ''}" data-sh-alt="${k}">${a}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div>
    ${alt === 'kurslar' ? kursIstHtml() : alt === 'silinen' ? silinenHtml() : `<div class="sh-arac"><label class="sh-ara">${ik('ara')}<input type="search" data-sh-ara placeholder="İsim, telefon, e-posta ya da kurs ara" value="${e(arama)}" autocomplete="off"></label>
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
      <header><b>${e(x.ad)}</b><small>${e([x.sehir, 'son hareket ' + gunOnce(x.son)].filter(Boolean).join(' · '))}</small></header>
      ${x.hata ? `<p class="sh-hata">${ik('uyari')}<span>Veri okunamadı: ${e(x.hata)}</span></p>` : `<div class="sh-ist-kutular">
        ${kutu('Kursiyer', x.aktif, x.kursiyer + ' kayıtlı')}${kutu('Bu ay ders', x.dersAy, '')}${kutu('Bu ay tahsilat', tl(x.tahsilAy), '')}
        ${kutu('Oturum', x.oturum, 'son 30 gün')}${kutu('Aktif kişi', x.aktifKisi, per + ' personel hesabı')}${kutu('Öğrenci girişi', ogrAktif, ogr + ' öğrenci hesabı')}</div>
      <footer><span>${ik('mesaj')}${x.gonderimAy} mesaj bu ay</span><span>${ik('aday')}${x.adaylar} aday</span>${acik ? `<span class="uyar">${ik('uyari')}${acik} açık destek</span>` : ''}</footer>`}
    </article>`;
  }).join('')}</div><p class="sh-dip">Oturum ve aktif kişi son 30 günün işlem kaydından sayılır. Kutuya dokununca o kursun hesapları açılır.</p>`;
}
function silinenHtml() {
  if (!silinecekler.length) return `<div class="sh-bos">${ik('tik')}<b>Silinen hesap yok</b><small>Sildiğin hesaplar ${SIL_GUN} gün burada durur; bu sürede geri alabilirsin.</small></div>`;
  return `<div class="sh-liste">${silinecekler.slice().sort((a, b) => b.zaman.localeCompare(a.zaman)).map(x => `<div class="sh-satir sh-silinen">
    <span class="sh-av sh-av-${x.rol || 'yok'}">${e((x.ad || '?').charAt(0).toLocaleUpperCase('tr'))}</span>
    <span class="sh-satir-ic"><b>${e(x.ad)}</b><small>${e([x.kursAd, x.eposta].filter(Boolean).join(' · '))}</small></span>
    <span class="sh-satir-sag"><em class="sh-rozet">${kalanGun(x)} gün kaldı</em><button class="dg dg-ana dg-kucuk" data-sh-geri="${e(x.uid)}">Geri al</button></span></div>`).join('')}</div>
    <p class="sh-dip">Silinen hesap hemen kapanır, kimse giremez. ${SIL_GUN} gün içinde “Geri al” ile eski haline döner; süre dolunca kalıcı silinir. Kursun öğrenci, ders ve kasa verileri hiçbir durumda silinmez.</p>`;
}
// arama yazılırken yalnız liste yenilenir (kutu odağını kaybetmez)
function sonucHtml() {
  const q = arama.trim().toLocaleLowerCase('tr'), qr = q.replace(/\D/g, '');
  const uygun = h => (suzgec === 'hepsi' || (suzgec === 'ogrenci' ? h.rol === 'ogrenci' : suzgec === 'yonetim' ? h.yonetim : h.rol && h.rol !== 'ogrenci' && !h.yonetim))
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

async function yenile() {
  yukleniyor = true; ciz();
  try { await yukle(); hataMetni = ''; } catch (x) { hataMetni = x.message; if (x.yetki) belirtec = null; bildir(x.message, 'uyari'); }
  yukleniyor = false; ciz();
}

function yaz(ev) {
  const a = ev.target.closest('[data-sh-ara]'); if (!a) return;
  arama = a.value; const s = kok.querySelector('[data-sh-sonuc]'); if (s) s.innerHTML = sonucHtml();
}
async function tikla(ev) {
  const t = ev.target;
  if (t.closest('[data-sh-baglan]')) {
    const b = t.closest('button'); b.disabled = true;
    try { await baglan(); hataMetni = ''; hesaplar = null; ciz(); await yenile(); } catch (x) { hataMetni = x.message; b.disabled = false; ciz(); }
    return;
  }
  if (t.closest('[data-sh-yenile]')) return yenile();
  const al = t.closest('[data-sh-alt]'); if (al) { alt = al.dataset.shAlt; return ciz(); }
  const kr = t.closest('[data-sh-kurs]'); if (kr) { alt = 'hesaplar'; suzgec = 'hepsi'; arama = (kursIst[kr.dataset.shKurs] || {}).ad || ''; return ciz(); }
  const gr = t.closest('[data-sh-geri]'); if (gr) { const x = silinecekler.find(y => y.uid === gr.dataset.shGeri); if (!x) return; gr.disabled = true; try { await silmeGeriAl(x); bildir(x.ad + ' geri alındı; yeniden girebilir'); ciz(); } catch (y) { gr.disabled = false; islemHata(y); } return; }
  if (gorunum === 'destek' && await destekTikla(t)) return;
  const s = t.closest('[data-sh-suz]'); if (s) { suzgec = s.dataset.shSuz; kok.querySelectorAll('[data-sh-suz]').forEach(b => { b.classList.toggle('secili', b === s); b.setAttribute('aria-selected', b === s); }); const r = kok.querySelector('[data-sh-sonuc]'); if (r) r.innerHTML = sonucHtml(); return; }
  const d = t.closest('[data-sh-davet]'); if (d) return davetPenceresi(d.dataset.shDavet === 'yonetim');
  const sf = t.closest('[data-sh-sifre]'); if (sf) { const h = hesaplar.find(x => x.uid === sf.dataset.shSifre); if (h) sifrePenceresi(h); return; }
  const h = t.closest('[data-sh-hesap]'); if (h) { const x = hesaplar.find(y => y.uid === h.dataset.shHesap); if (x) hesapPenceresi(x); }
}
const islemHata = x => { bildir(x.message, 'uyari'); if (x.yetki) { kapatPencere(); ciz(); } };

function hesapPenceresi(h) {
  const satir = (et, d) => d ? `<div class="sh-bilgi-satir"><span>${et}</span><b>${e(d)}</b></div>` : '';
  pencere({
    baslik: h.ad,
    icerik: `<div class="sh-bilgi">${satir('Rol', rolAd(h))}${satir('Kurs', h.yonetim ? '' : h.kursAd)}${satir(h.kullaniciAdi ? 'Kullanıcı adı' : h.tel ? 'Telefon' : 'E-posta', h.kullaniciAdi || (h.tel ? telGoster(h.tel) : h.eposta))}${satir('Son giriş', zamanMetni(h.sonGiris).replace(/ girdi$/, ''))}${satir('Açıldı', h.olusturma ? new Date(h.olusturma).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')}${h.kapali ? satir('Durum', 'Giriş kapalı') : ''}</div>
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
  const metin = sifreMesaji(h, sifre);
  pencere({
    baslik: 'Yeni şifre hazır',
    icerik: `<p class="sh-sifre-not">${e(h.ad)} artık bu şifreyle girer. Eski şifresi geçersiz oldu.</p>
      <div class="sh-sifre"><span>${e(sifre)}</span><button class="dg dg-hafif" data-p-kopya-sifre>Kopyala</button></div>
      <p class="sh-sifre-et">Gönderilecek mesaj</p><pre class="sh-mesaj">${e(metin)}</pre>
      ${h.tel ? '' : `<p class="sh-dip">${e(h.ad)} kişisinin numarası Sinyal’de kayıtlı değil; WhatsApp açılınca kişiyi sen seçersin.</p>`}`,
    altlik: `<button class="dg dg-cizgi" data-p-kopya>Mesajı kopyala</button><a class="dg dg-wp" target="_blank" rel="noopener" href="${e(waLinki(h.tel, metin))}">${ik('wp')}WhatsApp’tan gönder</a>`,
    onAc: p => {
      const kopya = (m, a) => navigator.clipboard.writeText(m).then(() => bildir(a + ' kopyalandı')).catch(() => bildir('Kopyalanamadı; elle seç', 'uyari'));
      p.querySelector('[data-p-kopya-sifre]').addEventListener('click', () => kopya(sifre, 'Şifre'));
      p.querySelector('[data-p-kopya]').addEventListener('click', () => kopya(metin, 'Mesaj'));
    },
  });
  ciz();
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

async function davetPenceresi(yonetim) {
  pencere({ baslik: yonetim ? 'Yönetim hesabı linki' : 'Kurs hesabı linki', icerik: `<div class="sh-bos">${ik('saat')}<b>Link oluşturuluyor…</b></div>`, korumali: true });
  let link;
  try { link = await davetLinki(yonetim); } catch (x) { kapatPencere(); return islemHata(x); }
  pencere({
    baslik: yonetim ? 'Yönetim hesabı linki' : 'Kurs hesabı linki',
    icerik: `<p class="sh-sifre-not">${yonetim ? 'Bu linki açan kişi Sinyal Yönetim hesabını kurar. Kendin açacaksan linke dokun.' : 'Satıştan sonra kurs müdürüne gönder; kurs kendi e-postası ve şifresiyle hesabını açar.'} Tek kullanımlık, 30 gün geçerli.</p><pre class="sh-mesaj">${e(link)}</pre>`,
    altlik: `<button class="dg dg-cizgi" data-p-kopya>Linki kopyala</button>${yonetim ? `<a class="dg dg-ana" href="${e(link)}" data-p-ac>Linki aç</a>` : `<a class="dg dg-wp" target="_blank" rel="noopener" href="${e(waLinki('', 'Sinyal kurs hesabınızı bu linkten açabilirsiniz: ' + link))}">${ik('wp')}WhatsApp’tan gönder</a>`}`,
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
  baglan().then(() => { hataMetni = ''; hesaplar = null; ciz(); return yenile(); }).catch(x => { hataMetni = x.message; ciz(); });
}
// Henüz Yönetim hesabı yokken (ilk kurulum ya da hesap silindiyse): Google'da yetkili kişi kendine kurulum linki açar.
// Yetkiyi yine Google IAM verir; projede yetkisi olmayan Google hesabı link oluşturamaz.
export async function yonetimKurulumLinki() { await baglan(); return davetLinki(true); }

// ---- Destek talepleri ve verilen hizmetler (Sinyal Yönetim › Destek) ----
// Kurslar Sinyal'den (Hesabım › Sinyal Destek) talep açar; talep kursun verisinde durur, cevap ve durum kursa geri yazılır.
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
  const sek = [['talepler', 'Talepler', acik], ['hizmetler', 'Hizmetler', v.hizmetler.length]];
  return `<div class="sh-bas"><div><h1>Destek</h1><p>${acik} açık talep · bu ay ${hAy.length} hizmet</p></div>
      <div class="sh-bas-dg"><button class="dg dg-cizgi dg-kucuk" data-sh-yenile ${yukleniyor ? 'disabled' : ''}>${ik('sifirla')}${yukleniyor ? 'Yükleniyor…' : 'Yenile'}</button><button class="dg dg-cizgi dg-kucuk" data-sh-talep-ekle>${ik('arti')}Talep ekle</button><button class="dg dg-ana dg-kucuk" data-sh-hizmet-ekle>${ik('arti')}Hizmet ekle</button></div></div>
    <div class="sh-suz sh-alt" role="tablist">${sek.map(([k, a, n]) => `<button role="tab" aria-selected="${destekAlt === k}" class="${destekAlt === k ? 'secili' : ''}" data-sh-dalt="${k}">${a}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div>
    ${destekAlt === 'talepler' ? talepListeHtml(l) : hizmetListeHtml(v.hizmetler)}`;
}
function talepListeHtml(l) {
  if (!l.length) return `<div class="sh-bos">${ik('mesaj')}<b>Destek talebi yok</b><small>Kurslar Sinyal’de Hesabım › Sinyal Destek’ten talep açınca burada görünür. WhatsApp ya da telefonla gelenleri “Talep ekle” ile kaydet.</small></div>`;
  return `<div class="sh-liste">${l.map(t => `<button class="sh-satir sh-t-${TDURUM.find(d => d[0] === tDurum(t))[1]}" data-sh-talep="${e(tKey(t))}">
    <span class="sh-t-nokta" aria-hidden="true"></span>
    <span class="sh-satir-ic"><b>${e(t.tur || 'Talep')} · ${e(String(t.metin || '').slice(0, 90))}</b><small>${e([t.kursAd, t.kim, gunOnce(t.zaman), t.kanal || 'Sinyal'].filter(Boolean).join(' · '))}</small></span>
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
  if (t.elle) { const x = isl().destekElle.find(y => y.id === t.id); if (x) Object.assign(x, { durum, cevap, cevapZaman: zaman }); islem('Sinyal Destek: talep güncellendi', (t.kursAd || '') + ' · ' + durum); kaydet(); return; }
  const ist = kursIst[t.kurs] || {}, cur = { ...(ist.destekCevap || {}), [t.id]: { durum, cevap, zaman } };
  await api(FS + '/kurslar/' + t.kurs + '/v/t~destekCevap', { fields: { a: { stringValue: 'destekCevap' }, t: { stringValue: JSON.stringify(cur) } } }, 'PATCH');
  ist.destekCevap = cur; const y = destekler.find(z => z.kurs === t.kurs && z.id === t.id); if (y) Object.assign(y, { durum, cevap, zaman });
}
function talepPenceresi(t) {
  const satir = (et, d) => d ? `<div class="krsd-satir"><span>${et}</span><b>${e(d)}</b></div>` : '';
  pencere({ baslik: (t.tur || 'Talep') + ' · ' + (t.kursAd || ''), alt: true, icerik: `<div class="krsd">
      <div class="krsd-liste">${satir('Kurs', t.kursAd)}${satir('Kişi', t.kim)}${satir('Telefon', t.tel)}${satir('Tarih', t.zaman ? new Date(t.zaman).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '')}${satir('Kanal', t.kanal || 'Sinyal')}</div>
      <h3 class="krsd-bas">Talep</h3><p class="krsd-not">${e(t.metin || '').replace(/\n/g, '<br>')}</p>
      <h3 class="krsd-bas">Durum</h3><div class="sh-durum-sec" role="radiogroup">${TDURUM.map(([d, c]) => `<button type="button" role="radio" aria-checked="${tDurum(t) === d}" class="sh-t-${c}${tDurum(t) === d ? ' secili' : ''}" data-p-durum="${d}"><i></i>${d}</button>`).join('')}</div>
      <label class="og-alan" style="margin-top:14px"><span class="og-alan-et">Cevap ya da not ${t.elle ? '' : '<small>kurs Sinyal’de görür</small>'}</span><span class="og-girdi yn-alan-uzun"><textarea name="cevap" rows="3" placeholder="Örn. Hata düzeltildi, sayfayı yenileyin">${e(t.cevap || '')}</textarea></span></label></div>`,
    altlik: `${waTel(t.tel) ? `<a class="dg dg-wp" target="_blank" rel="noopener" href="${e(waLinki(waTel(t.tel), 'Merhaba, Sinyal destek talebiniz hakkında yazıyorum.'))}">${ik('wp')}WhatsApp</a>` : ''}<button class="dg dg-cizgi" data-p-hizmet>Hizmet olarak kaydet</button><button class="dg dg-ana" data-p-kaydet>Kaydet</button>`,
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
      islem('Sinyal Destek: talep ekledi', f.kurs.value.trim()); kaydet(); kapatPencere(); bildir('Talep kaydedildi'); destekAlt = 'talepler'; ciz(); }) });
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
        islem(h ? 'Sinyal Destek: hizmeti güncelledi' : 'Sinyal Destek: hizmet kaydetti', y.kursAd + ' · ' + y.tur); kaydet();
        if (on.talep && tDurum(on.talep) !== 'Çözüldü') { try { await talepDurumYaz(on.talep, 'Çözüldü', on.talep.cevap || ''); } catch (x) { islemHata(x); } }
        kapatPencere(); bildir(h ? 'Hizmet güncellendi' : 'Hizmet kaydedildi'); if (!h) destekAlt = on.talep ? destekAlt : 'hizmetler'; ciz(); });
      const sl = p.querySelector('[data-p-sil]'); if (sl) sl.addEventListener('click', () => { v.hizmetler.splice(v.hizmetler.indexOf(h), 1); islem('Sinyal Destek: hizmeti sildi', h.kursAd || ''); kaydet(); kapatPencere(); bildir('Hizmet silindi'); ciz(); });
    } });
}
async function destekTikla(t) {
  const d = t.closest('[data-sh-dalt]'); if (d) { destekAlt = d.dataset.shDalt; ciz(); return true; }
  if (t.closest('[data-sh-talep-ekle]')) { talepEklePenceresi(); return true; }
  if (t.closest('[data-sh-hizmet-ekle]')) { hizmetPenceresi(null); return true; }
  const tk = t.closest('[data-sh-talep]'); if (tk) { const x = tumTalepler().find(y => tKey(y) === tk.dataset.shTalep); if (x) talepPenceresi(x); return true; }
  const hz = t.closest('[data-sh-hizmet]'); if (hz) { const x = isl().hizmetler.find(y => y.id === hz.dataset.shHizmet); if (x) hizmetPenceresi(x); return true; }
  return false;
}

// ---- giriş ekranları için: giremeyene kendiliğinden yardım ----
// Şifre yanlış girilince form altında açılır; kişi “şifremi unuttum”u aramak zorunda kalmaz.
export function yardimHtml({ kim = '', tur = 'kurs', eposta = false }) {
  const metin = `Merhaba, Sinyal${tur === 'yonetim' ? ' Yönetim' : ''}’e giremiyorum. ${kim ? 'Hesabım: ' + kim + '. ' : ''}Yeni şifre rica ediyorum.`;
  return `<div class="og-yardim" role="status">
    <b>Giremedin mi?</b>
    <p>${tur === 'ogrenci' ? 'Şifreni hatırlamaya uğraşma. Kursuna haber ver, yeni şifren WhatsApp’tan gelsin.' : 'Şifreni hatırlamaya uğraşma. Sinyal’e WhatsApp’tan yaz, birkaç dakikada yeni şifren gelsin.'}</p>
    ${tur === 'ogrenci' ? '<button type="button" class="dg dg-ana og-yardim-dg" data-yardim-kurs>Kursuma haber ver</button>' : `<a class="dg dg-wp og-yardim-dg" target="_blank" rel="noopener" href="${e(waLinki(DESTEK_TEL, metin))}">${ik('wp')}WhatsApp’tan yeni şifre iste</a>`}
    ${eposta ? '<button type="button" class="og-bag" data-yardim-eposta>Ya da e-postama sıfırlama linki gönder</button>' : ''}
    ${tur === 'ogrenci' ? `<a class="og-bag" target="_blank" rel="noopener" href="${e(waLinki(DESTEK_TEL, metin))}">Kursuna ulaşamıyorsan Sinyal’e yaz</a>` : ''}
  </div>`;
}
export const girisHatasiMi = x => !!x && (/invalid-credential|wrong-password|user-not-found|invalid-login|user-disabled/.test(x.code || '') || /hatalı|hesap yok/.test(x.kullanici || ''));
