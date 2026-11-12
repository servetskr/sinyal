// Sinyal sahip araçları: bütün hesaplar tek yerde (kurs personeli, öğrenciler, Sinyal Yönetim ve ortak).
// Sinyal Yönetim panelinin “Hesaplar” bölümünde açılır (yalnız Servet; ortak görmez).
// Yetki Firebase güvenlik kurallarından değil, Google hesabından gelir: Firebase projesinin sahibi olan Google hesabıyla
// bağlanılır, Google IAM izin verirse işlem yapılır. Sunucu, gizli anahtar yok; erişim belirteci yalnız bellekte durur (1 saat).
import { e, ik, pencere, kapatPencere, bildir } from './ui.js?v=146';

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

let belirtec = null, bitis = 0, hesaplar = null, talepler = [], suzgec = 'hepsi', arama = '', kok = null, yukleniyor = false, hataMetni = '', gomulu = false, ipucu = '';

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
      callback: r => { if (r.error) return red(new Error(r.error_description || r.error)); belirtec = r.access_token; bitis = Date.now() + ((+r.expires_in || 3600) - 60) * 1000; coz(); },
      error_callback: x => red(new Error(x && x.type === 'popup_closed' ? 'Google penceresi kapatıldı' : 'Google penceresi açılamadı; açılır pencerelere izin ver')),
    });
    c.requestAccessToken();
  });
}
const bagli = () => !!belirtec && Date.now() < bitis;

async function api(url, govde, yontem) {
  if (!bagli()) { belirtec = null; throw Object.assign(new Error('Google bağlantısının süresi doldu; yeniden bağlan'), { yetki: true }); }
  const r = await fetch(url, { method: yontem || (govde ? 'POST' : 'GET'), headers: { Authorization: 'Bearer ' + belirtec, ...(govde ? { 'Content-Type': 'application/json' } : {}) }, body: govde ? JSON.stringify(govde) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) belirtec = null;
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
async function hesapSil(h) {
  await api(IT + '/accounts:delete', { localId: h.uid });
  await belgeSil('kullanicilar/' + h.uid).catch(() => { });
  if (h.kurs && h.rol && h.rol !== 'ogrenci') await belgeSil('kurslar/' + h.kurs + '/uyeler/' + h.uid).catch(() => { });
  hesaplar = hesaplar.filter(x => x !== h);
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
export function sahipGomulu(yer, eposta) {
  kok = yer; gomulu = true; ipucu = /@/.test(eposta || '') && !/\.invalid$/.test(eposta) ? eposta : '';
  ciz();
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
        <h1>Bütün hesaplar tek yerde</h1>
        <p>Kurs müdürleri, ön büro, öğretmenler, öğrenciler ve Sinyal Yönetim. Şifresini unutan olursa buradan tek dokunuşla yeni şifre verirsin.</p>
        <button class="dg dg-ana sh-giris-dg" data-sh-baglan>${ik('kilit')}Google hesabınla bağlan</button>
        ${hataMetni ? `<p class="sh-hata">${ik('uyari')}<span>${e(hataMetni)}</span></p>` : ''}
        <p class="sh-dip">Güvenlik için hesaplara Google hesabınla bir kez daha onay verirsin (${ipucu ? e(ipucu) : 'Sinyal projesinin sahibi olan Google hesabı'}); onay bir saat geçerli. Şifreler ve anahtarlar hiçbir yerde saklanmaz.</p>
      </div>`, true);
    return;
  }
  if (!hesaplar) { kok.innerHTML = kabuk(`<div class="sh-bos">${ik('saat')}<b>Hesaplar yükleniyor…</b></div>`); return; }
  const kursSay = new Set(hesaplar.filter(h => h.kurs && !h.yonetim).map(h => h.kurs)).size;
  const talepHtml = talepler.length ? `<section class="sh-talep"><h2>${ik('uyari')}Şifre isteyenler <span>${talepler.length}</span></h2>${talepler.map(t => {
    const h = hesaplar.find(x => x.tel === t.tel && x.kurs === t.kurs);
    return `<div class="sh-talep-satir"><span><b>${e(h ? h.ad : telGoster(t.tel))}</b><small>${e(h ? h.kursAd : 'Öğrenci')} · ${e(telGoster(t.tel))}</small></span>${h ? `<button class="dg dg-ana dg-kucuk" data-sh-sifre="${h.uid}">Yeni şifre ver</button>` : ''}</div>`;
  }).join('')}</section>` : '';
  kok.innerHTML = kabuk(`
    <div class="sh-bas"><div><h1>Hesaplar</h1><p>${hesaplar.length} hesap · ${kursSay} kurs</p></div>
      <div class="sh-bas-dg">${gomulu ? `<button class="dg dg-cizgi dg-kucuk" data-sh-yenile ${yukleniyor ? 'disabled' : ''}>${ik('sifirla')}${yukleniyor ? 'Yükleniyor…' : 'Yenile'}</button>` : ''}<button class="dg dg-cizgi dg-kucuk" data-sh-davet="kurs">${ik('arti')}Kurs hesabı linki</button><button class="dg dg-cizgi dg-kucuk" data-sh-davet="yonetim">${ik('arti')}Yönetim hesabı linki</button></div></div>
    ${talepHtml}
    <div class="sh-arac"><label class="sh-ara">${ik('ara')}<input type="search" data-sh-ara placeholder="İsim, telefon, e-posta ya da kurs ara" value="${e(arama)}" autocomplete="off"></label>
      <div class="sh-suz" role="tablist">${SUZGEC.map(([k, a]) => `<button role="tab" aria-selected="${suzgec === k}" class="${suzgec === k ? 'secili' : ''}" data-sh-suz="${k}">${a}</button>`).join('')}</div></div>
    <div data-sh-sonuc>${sonucHtml()}</div>`);
}
// arama yazılırken yalnız liste yenilenir (kutu odağını kaybetmez)
function sonucHtml() {
  const q = arama.trim().toLocaleLowerCase('tr'), qr = q.replace(/\D/g, '');
  const uygun = h => (suzgec === 'hepsi' || (suzgec === 'ogrenci' ? h.rol === 'ogrenci' : suzgec === 'yonetim' ? h.yonetim : h.rol && h.rol !== 'ogrenci' && !h.yonetim))
    && (!q || [h.ad, h.eposta, h.kursAd, h.kullaniciAdi, rolAd(h)].some(x => String(x || '').toLocaleLowerCase('tr').includes(q)) || (qr.length >= 3 && (h.tel.includes(qr) || ('0' + h.tel.slice(2)).includes(qr))));
  const gorunen = hesaplar.filter(uygun);
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
        ${h.rol === 'ogrenci' || benMi(h) ? '' : `<button class="sh-islem-dg tehlike" data-p-sil>${ik('kapat')}<span><b>Hesabı sil</b><small>Kalıcıdır; kursun verileri silinmez</small></span></button>`}
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
    icerik: `<p style="font-size:15px;line-height:1.5"><b>${e(h.ad)}</b> (${e(kimlik(h))}) kalıcı olarak silinir ve bir daha giremez. Geri alınamaz.</p><p class="sh-dip">${h.yonetim ? 'Sinyal Yönetim verileri (kurslar, gelir-gider) silinmez; yeni hesap aynı linkle değil, yeni bir “Yönetim hesabı linki” ile açılır.' : 'Kursun öğrenci, ders ve kasa verileri silinmez; yalnız bu kişinin girişi kaldırılır.'}</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg sh-tehlike" data-p-evet>Kalıcı olarak sil</button>`,
    onAc: p => p.querySelector('[data-p-evet]').addEventListener('click', async ev => {
      const b = ev.currentTarget; b.disabled = true; b.textContent = 'Siliniyor…';
      try { await hesapSil(h); kapatPencere(); bildir(h.ad + ' silindi'); ciz(); } catch (x) { b.disabled = false; b.textContent = 'Kalıcı olarak sil'; islemHata(x); }
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

// Henüz Yönetim hesabı yokken (ilk kurulum ya da hesap silindiyse): Google'da yetkili kişi kendine kurulum linki açar.
// Yetkiyi yine Google IAM verir; projede yetkisi olmayan Google hesabı link oluşturamaz.
export async function yonetimKurulumLinki() { await baglan(); return davetLinki(true); }

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
