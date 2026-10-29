// Gerçek kurs hesabı: Google Firebase (Frankfurt). Giriş e-posta + şifreyle; kurs verisi Firestore'da
// kurslar/{kurs}/v altında parça parça durur. Her kayıt ayrı alan olarak yazılır: iki kişi aynı anda
// farklı kayıtları değiştirirse ikisi de korunur. Fotoğraf ve imzalar kurslar/{kurs}/dosyalar'da ayrı belge.
import { FIREBASE } from './firebase-ayar.js?v=65';
import { S, bulutVeri, bosVeri, kaydetDinle, kaydet, oturum } from './veri.js?v=65';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const YEREL = 'sinyal-bulut';
const BUYUK = { dersler: 64, kursiyerler: 64, hareket: 64, islemler: 16, gonderimler: 16, teorik: 8, adaylar: 8, sinavlar: 8, kampanyalar: 8, imzaTalepleri: 8 };
const HARIC = new Set(['kullanicilar', '_gun', '_bulut']);
const DOSYA_SINIR = 3000, DOSYA_ON = 'sinyal-dosya:';

export const bulut = { kurs: null, uid: null, ad: '', rol: '', usta: null, eposta: '', durum: 'kapali', bekleyen: 0, hata: '' };
export const bulutKayitli = () => { try { return JSON.parse(localStorage.getItem(YEREL) || 'null'); } catch (x) { return null; } };
export const bulutta = () => !!bulut.kurs;

let fb = null;
async function sdk() {
  if (fb) return fb;
  const [{ initializeApp }, A, F] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  const app = initializeApp(FIREBASE);
  const auth = A.getAuth(app); auth.languageCode = 'tr';
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch (x) { db = F.getFirestore(app); }
  fb = { auth, db, A, F };
  return fb;
}

// ---- hata metinleri ----
const HATA = {
  'auth/invalid-credential': 'E-posta ya da şifre hatalı', 'auth/wrong-password': 'E-posta ya da şifre hatalı', 'auth/user-not-found': 'Bu e-postayla açılmış hesap yok',
  'auth/invalid-email': 'E-posta adresi geçersiz', 'auth/email-already-in-use': 'Bu e-postayla zaten hesap var; giriş yapın', 'auth/weak-password': 'Şifre en az 8 karakter olmalı',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı; birkaç dakika sonra tekrar deneyin', 'auth/network-request-failed': 'İnternet bağlantısı yok', 'permission-denied': 'Bu işlem için yetkiniz yok',
  'auth/missing-password': 'Şifre girin', 'auth/requires-recent-login': 'Güvenlik için tekrar giriş yapın',
};
export const hataMetni = x => HATA[x && x.code] || (x && x.kullanici) || 'İşlem tamamlanamadı; bağlantınızı kontrol edip tekrar deneyin';
const hata = m => Object.assign(new Error(m), { kullanici: m });

// ---- giriş ----
async function uyelikBul(user) {
  const { db, F } = await sdk();
  const p = await F.getDoc(F.doc(db, 'kullanicilar', user.uid));
  if (!p.exists()) return null;
  const kurs = p.data().kurs, u = await F.getDoc(F.doc(db, 'kurslar', kurs, 'uyeler', user.uid));
  if (!u.exists()) return null;
  const d = u.data();
  return { kurs, uid: user.uid, ad: d.ad || user.displayName || user.email, rol: d.rol, usta: d.usta || null, eposta: user.email };
}
export async function girisYap(eposta, sifre) {
  const { auth, A } = await sdk();
  const c = await A.signInWithEmailAndPassword(auth, eposta.trim(), sifre);
  const u = await uyelikBul(c.user);
  if (!u) { await A.signOut(auth); throw hata('Bu hesap bir kursa bağlı değil. Kurs müdürünüzden davet linki isteyin ya da yeni kurs hesabı açın'); }
  return baglan(u);
}
export async function sifreSifirla(eposta) { const { auth, A } = await sdk(); await A.sendPasswordResetEmail(auth, eposta.trim()); }
export async function sifreDogrula(sifre) {
  const { auth, A } = await sdk();
  try { await A.reauthenticateWithCredential(auth.currentUser, A.EmailAuthProvider.credential(auth.currentUser.email, sifre)); return true; } catch (x) { return false; }
}
export async function cikisYap() {
  try { await akit(); } catch (x) { }
  try { localStorage.removeItem(YEREL); } catch (x) { }
  if (fb) { try { await fb.A.signOut(fb.auth); } catch (x) { } }
}
async function hesapAc(eposta, sifre, ad) {
  const { auth, A } = await sdk();
  if (sifre.length < 8) throw hata('Şifre en az 8 karakter olmalı');
  let user;
  try { user = (await A.createUserWithEmailAndPassword(auth, eposta.trim(), sifre)).user; }
  catch (x) {
    if (x.code !== 'auth/email-already-in-use') throw x;
    user = (await A.signInWithEmailAndPassword(auth, eposta.trim(), sifre)).user;
    if (await uyelikBul(user)) throw hata('Bu e-posta zaten bir kursa bağlı; giriş ekranından girin');
  }
  if (ad) try { await A.updateProfile(user, { displayName: ad }); } catch (x) { }
  return user;
}
// Yeni kurs: müdür hesabı + boş kurs verisi
export async function kursAc({ kursAd, yetkili, sehir, eposta, sifre }) {
  const user = await hesapAc(eposta, sifre, yetkili);
  const { db, F } = fb;
  const kRef = F.doc(F.collection(db, 'kurslar'));
  const b = F.writeBatch(db);
  b.set(kRef, { ad: kursAd, sahip: user.uid, sehir: sehir || '', olusturma: F.serverTimestamp() });
  b.set(F.doc(db, 'kurslar', kRef.id, 'uyeler', user.uid), { ad: yetkili, rol: 'mudur', eposta: user.email, katilma: F.serverTimestamp() });
  b.set(F.doc(db, 'kullanicilar', user.uid), { kurs: kRef.id });
  await b.commit();
  return baglan({ kurs: kRef.id, uid: user.uid, ad: yetkili, rol: 'mudur', usta: null, eposta: user.email }, bosVeri({ kursAd, yetkili, sehir }));
}

// ---- davet ----
const rastgele = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join(''); };
export const davetLinki = (kurs, kod) => location.origin + location.pathname + '#/davet/' + kurs + '/' + kod;
export async function davetOlustur({ ad, rol, usta }) {
  const { db, F } = await sdk();
  const kod = rastgele(20), son = new Date(Date.now() + 7 * 864e5);
  await F.setDoc(F.doc(db, 'kurslar', bulut.kurs, 'davetler', kod), { ad, rol, usta: usta || null, kursAd: S.kurs.ad, davetEden: bulut.ad, tarih: F.serverTimestamp(), son: F.Timestamp.fromDate(son) });
  return { kod, link: davetLinki(bulut.kurs, kod), son };
}
export async function davetler() {
  const { db, F } = await sdk();
  const q = await F.getDocs(F.collection(db, 'kurslar', bulut.kurs, 'davetler'));
  return q.docs.map(d => ({ kod: d.id, ...d.data(), son: d.data().son && d.data().son.toDate() })).filter(d => d.son > new Date());
}
export async function davetSil(kod) { const { db, F } = await sdk(); await F.deleteDoc(F.doc(db, 'kurslar', bulut.kurs, 'davetler', kod)); }
export async function davetGetir(kurs, kod) {
  const { db, F } = await sdk();
  const d = await F.getDoc(F.doc(db, 'kurslar', kurs, 'davetler', kod));
  if (!d.exists()) return null;
  const v = d.data(); if (v.son && v.son.toDate() < new Date()) return null;
  return v;
}
export async function davetKabul(kurs, kod, { eposta, sifre, ad, yeni }) {
  const dv = await davetGetir(kurs, kod);
  if (!dv) throw hata('Bu davetin süresi dolmuş ya da kullanılmış; kurs müdüründen yeni link isteyin');
  const { auth, A, db, F } = fb;
  const user = yeni ? await hesapAc(eposta, sifre, ad) : (await A.signInWithEmailAndPassword(auth, eposta.trim(), sifre)).user;
  if (!yeni && await uyelikBul(user)) throw hata('Bu hesap zaten bir kursa bağlı');
  const b = F.writeBatch(db);
  b.set(F.doc(db, 'kurslar', kurs, 'uyeler', user.uid), { ad: ad || dv.ad, rol: dv.rol, usta: dv.usta || null, eposta: user.email, davet: kod, katilma: F.serverTimestamp() });
  b.set(F.doc(db, 'kullanicilar', user.uid), { kurs });
  b.delete(F.doc(db, 'kurslar', kurs, 'davetler', kod));
  await b.commit();
  return baglan({ kurs, uid: user.uid, ad: ad || dv.ad, rol: dv.rol, usta: dv.usta || null, eposta: user.email });
}
export async function uyeGuncelle(uid, alan) { const { db, F } = await sdk(); await F.updateDoc(F.doc(db, 'kurslar', bulut.kurs, 'uyeler', uid), alan); }
export async function uyeCikar(uid) { const { db, F } = await sdk(); await F.deleteDoc(F.doc(db, 'kurslar', bulut.kurs, 'uyeler', uid)); }

// Sayfa açılırken: kayıtlı oturum varsa Firebase'in hatırladığı kullanıcıyla bağlan
export async function bulutBaslat() {
  const k = bulutKayitli(); if (!k) return null;
  const { auth, A } = await sdk();
  const user = await new Promise(coz => { const kapat = A.onAuthStateChanged(auth, u => { kapat(); coz(u); }); });
  if (!user || user.uid !== k.uid) { try { localStorage.removeItem(YEREL); } catch (x) { } return null; }
  let u = null;
  try { u = await uyelikBul(user); } catch (x) { u = k; }  // çevrimdışı: son bilinen üyelikle aç
  if (!u) { await cikisYap(); throw hata('Bu kursa erişiminiz kaldırılmış; kurs müdürüyle görüşün'); }
  return baglan(u);
}

// ---- eşitleme ----
const h32 = (s, t = 2166136261) => { for (let i = 0; i < s.length; i++) { t ^= s.charCodeAt(i); t = Math.imul(t, 16777619); } return t >>> 0; };
const kovaAd = (a, id) => a + '~' + (h32(String(id)) % (BUYUK[a] || 1));
const son = new Map();        // dizi adı → Map(id → { v, x, d })
const tekSon = new Map();     // nesne adı → json
const belgeler = new Map();   // belge id → veri (sunucudaki son hâl)
const dosyaId = new Map(), dosyaVeri = new Map(), yuklu = new Set(), eksik = new Set();
let yeniDosya = new Map();
let dinleyiciler = [], zamanla = null, ilkHazir = null, yenileFn = () => { };
export const bulutYenileDinle = f => { yenileFn = f; };

function dosyaRef(s) {
  let id = dosyaId.get(s);
  if (!id) { id = 'd' + h32(s).toString(36) + h32(s, 5381).toString(36) + s.length.toString(36); dosyaId.set(s, id); dosyaVeri.set(id, s); }
  if (!yuklu.has(id)) yeniDosya.set(id, s);
  return DOSYA_ON + id;
}
const yaz = v => JSON.stringify(v, (k, x) => typeof x === 'string' && x.length > DOSYA_SINIR && x.startsWith('data:') ? dosyaRef(x) : x);
const oku = j => JSON.parse(j, (k, x) => { if (typeof x === 'string' && x.startsWith(DOSYA_ON)) { const id = x.slice(DOSYA_ON.length); yuklu.add(id); if (dosyaVeri.has(id)) return dosyaVeri.get(id); eksik.add(id); } return x; });
const nesneDizisi = v => Array.isArray(v) && v.every(x => x && typeof x === 'object' && !Array.isArray(x));
function kimlikler(dizi) {
  const gor = new Set();
  return dizi.map(el => {
    let id = el.id != null ? String(el.id) : null;
    if (id == null || gor.has(id)) { if (!el._k) el._k = rastgele(10); id = '_' + el._k; }
    gor.add(id); return id;
  });
}
// Sıralama: her kaydın kalıcı bir sıra sayısı var; yeni kayıt komşularının arasına girer, eskiler yeniden yazılmaz
function siralar(ids, eski) {
  let xs = ids.map(id => eski.has(id) ? eski.get(id).x : null), onc = -Infinity;
  for (const x of xs) if (x != null) { if (!(x > onc)) { return ids.map((_, i) => i + 1); } onc = x; }
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] != null) continue;
    let j = i; while (j < xs.length && xs[j] == null) j++;
    const a = i > 0 ? xs[i - 1] : null, b = j < xs.length ? xs[j] : null, n = j - i;
    for (let t = 0; t < n; t++) xs[i + t] = a == null && b == null ? t + 1 : a == null ? b - (n - t) : b == null ? a + t + 1 : a + (b - a) * (t + 1) / (n + 1);
    i = j;
  }
  return xs;
}
// Yerel değişiklikleri bul ve yaz
function farklar() {
  const yazilar = new Map(); // belge → { a, d?, i?: {}, t? }
  const belge = (id, a, dizi) => { if (!yazilar.has(id)) yazilar.set(id, dizi ? { a, d: true, i: {} } : { a }); return yazilar.get(id); };
  for (const a of Object.keys(S)) {
    if (HARIC.has(a)) continue;
    const v = S[a];
    if (nesneDizisi(v) && (v.length || son.has(a))) {
      const eski = son.get(a) || new Map(), yeni = new Map(), ids = kimlikler(v), xs = siralar(ids, eski);
      ids.forEach((id, n) => {
        const j = yaz(v[n]), x = xs[n], d = kovaAd(a, id), o = eski.get(id);
        yeni.set(id, { v: j, x, d });
        if (!o || o.v !== j || o.x !== x) belge(d, a, true).i[id] = { v: j, x };
      });
      eski.forEach((o, id) => { if (!yeni.has(id)) belge(o.d, a, true).i[id] = null; });
      son.set(a, yeni); tekSon.delete(a);
    } else {
      if (v === undefined) continue;
      const j = yaz(v);
      if (tekSon.get(a) !== j) { belge('t~' + a, a).t = j; tekSon.set(a, j); }
    }
  }
  return yazilar;
}
export async function akit() {
  if (!bulut.kurs || !fb) return;
  clearTimeout(zamanla); zamanla = null;
  const yazilar = farklar(), dosyalar = yeniDosya; yeniDosya = new Map();
  if (!yazilar.size && !dosyalar.size) return;
  const { db, F } = fb, kok = ['kurslar', bulut.kurs];
  let b = F.writeBatch(db), n = 0, boy = 0; const isler = [];
  const ekle = (ref, veri, boyut) => { if (n >= 450 || boy + boyut > 6e6) { isler.push(b.commit()); b = F.writeBatch(db); n = 0; boy = 0; } b.set(ref, veri, { merge: true }); n++; boy += boyut; };
  dosyalar.forEach((v, id) => { if (v.length > 950000) return; ekle(F.doc(db, ...kok, 'dosyalar', id), { v }, v.length); yuklu.add(id); });
  yazilar.forEach((w, id) => {
    const veri = { a: w.a };
    if (w.d) { veri.d = true; veri.i = {}; Object.entries(w.i).forEach(([k, x]) => { veri.i[k] = x === null ? F.deleteField() : x; }); }
    else veri.t = w.t;
    ekle(F.doc(db, ...kok, 'v', id), veri, JSON.stringify(w).length);
  });
  isler.push(b.commit());
  bulut.bekleyen += isler.length; durumYaz();
  await Promise.all(isler.map(p => p.then(() => { bulut.bekleyen--; bulut.hata = ''; durumYaz(); }, x => { bulut.bekleyen--; bulut.hata = hataMetni(x); console.error(x); durumYaz(); })));
}
function planla() { if (!bulut.kurs) return; clearTimeout(zamanla); zamanla = setTimeout(() => akit(), 400); }

// Sunucudan gelen değişiklikleri S'ye uygula (nesneler yerinde güncellenir; açık pencereler bayatlamaz)
function uygula(degisen) {
  let oldu = false;
  const diziler = new Map();
  degisen.forEach(([id, veri]) => {
    const once = belgeler.get(id); if (veri) belgeler.set(id, veri); else belgeler.delete(id);
    const a = (veri || once || {}).a; if (!a || HARIC.has(a)) return;
    if ((veri || once).d) {
      const s = son.get(a) || new Map(); son.set(a, s);
      const yeni = (veri && veri.i) || {};
      let ds = diziler.get(a); if (!ds) diziler.set(a, ds = new Map());
      Object.entries(yeni).forEach(([k, o]) => { const e = s.get(k); if (!e || e.v !== o.v || e.x !== o.x) { s.set(k, { v: o.v, x: o.x, d: id }); ds.set(k, o.v); } });
      s.forEach((o, k) => { if (o.d === id && !(k in yeni)) { s.delete(k); ds.set(k, null); } });
    } else if (veri && veri.t !== undefined && tekSon.get(a) !== veri.t) {
      tekSon.set(a, veri.t);
      const v = oku(veri.t);
      if (v && typeof v === 'object' && !Array.isArray(v) && S[a] && typeof S[a] === 'object' && !Array.isArray(S[a])) { Object.keys(S[a]).forEach(k => delete S[a][k]); Object.assign(S[a], v); } else S[a] = v;
      oldu = true;
    }
  });
  diziler.forEach((ds, a) => {
    if (!ds.size && Array.isArray(S[a])) return;
    const dizi = Array.isArray(S[a]) ? S[a] : (S[a] = []);
    const mevcut = new Map(); kimlikler(dizi).forEach((id, n) => mevcut.set(id, dizi[n]));
    ds.forEach((v, k) => { if (v === null) { mevcut.delete(k); return; } const yeni = oku(v), o = mevcut.get(k); if (o) { Object.keys(o).forEach(x => delete o[x]); Object.assign(o, yeni); } else mevcut.set(k, yeni); });
    const s = son.get(a), sirali = [...s.entries()].sort((p, q) => p[1].x - q[1].x).map(([k]) => mevcut.get(k) || oku(s.get(k).v));
    dizi.length = 0; dizi.push(...sirali); oldu = true;
  });
  if (eksik.size) dosyalariGetir();
  return oldu;
}
async function dosyalariGetir() {
  const { db, F } = fb, ids = [...eksik]; eksik.clear();
  await Promise.all(ids.map(async id => {
    const ref = F.doc(db, 'kurslar', bulut.kurs, 'dosyalar', id);
    let d; try { d = await F.getDocFromCache(ref); } catch (x) { try { d = await F.getDoc(ref); } catch (y) { return; } }
    if (d.exists()) { const v = d.data().v; dosyaVeri.set(id, v); dosyaId.set(v, id); }
  }));
  const gez = o => { if (!o || typeof o !== 'object') return; for (const k of Object.keys(o)) { const x = o[k]; if (typeof x === 'string') { if (x.startsWith(DOSYA_ON) && dosyaVeri.has(x.slice(DOSYA_ON.length))) o[k] = dosyaVeri.get(x.slice(DOSYA_ON.length)); } else if (x && typeof x === 'object') gez(x); } };
  gez(S); yenileFn();
}

// Bağlan: üyelik bilgisini sakla, kurs verisini dinlemeye başla, ilk veri gelince S'yi kur
async function baglan(u, ilkVeri) {
  await sdk();
  Object.assign(bulut, { kurs: u.kurs, uid: u.uid, ad: u.ad, rol: u.rol, usta: u.usta, eposta: u.eposta, durum: 'baglaniyor' });
  try { localStorage.setItem(YEREL, JSON.stringify(u)); } catch (x) { }
  const { db, F } = fb;
  if (ilkVeri) { bulutVeri(ilkVeri, u.kurs); S.kullanicilar = [{ id: u.uid, ad: u.ad, rol: u.rol }]; await akit(); }
  ilkHazir = new Promise(coz => {
    let ilk = true;
    dinleyiciler.push(F.onSnapshot(F.collection(db, 'kurslar', u.kurs, 'v'), { includeMetadataChanges: true }, q => {
      bulut.durum = q.metadata.fromCache ? 'cevrimdisi' : 'cevrimici';
      if (ilk) {
        if (q.metadata.fromCache && q.empty) return;  // yeni cihaz: sunucuyu bekle
        ilk = false;
        if (!ilkVeri) {
          const taban = bosVeri({}); delete taban._gun;
          bulutVeri(taban, u.kurs); S.kullanicilar = [{ id: u.uid, ad: u.ad, rol: u.rol, usta: u.usta || undefined }];
          q.docs.forEach(d => { if (d.data().d && !son.has(d.data().a)) S[d.data().a] = []; });
          uygula(q.docs.map(d => [d.id, d.data()]));
          bulutVeri(S, u.kurs);  // eski kayıtları güncel yapıya taşı
          kaydetDinle(planla); planla();
        } else kaydetDinle(planla);
        coz(); durumYaz(); return;
      }
      const d = q.docChanges().filter(c => !c.doc.metadata.hasPendingWrites).map(c => [c.doc.id, c.type === 'removed' ? null : c.doc.data()]);
      if (d.length) { if (zamanla) akit(); if (uygula(d)) { kaydet(); yenileFn(); } }
      durumYaz();
    }, x => { bulut.durum = 'hata'; bulut.hata = hataMetni(x); console.error(x); durumYaz(); coz(); }));
    dinleyiciler.push(F.onSnapshot(F.collection(db, 'kurslar', u.kurs, 'uyeler'), q => {
      S.kullanicilar = q.docs.map(d => ({ id: d.id, ad: d.data().ad, rol: d.data().rol, eposta: d.data().eposta, ...(d.data().usta ? { usta: d.data().usta } : {}) }));
      if (!q.docs.some(d => d.id === u.uid)) { cikisYap().then(() => location.reload()); return; }
      const ben = q.docs.find(d => d.id === u.uid).data();
      if (oturum.kullanici && oturum.kullanici.bulut && (ben.rol !== oturum.kullanici.rol || (ben.usta || null) !== (oturum.kullanici.usta || null))) { Object.assign(oturum.kullanici, { rol: ben.rol, usta: ben.usta || undefined }); }
      yenileFn();
    }, () => { }));
  });
  await ilkHazir;
  addEventListener('pagehide', () => { akit(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') akit(); });
  return { id: u.uid, ad: u.ad, rol: u.rol, ...(u.usta ? { usta: u.usta } : {}), bulut: true };
}

// Üst çubuktaki küçük durum yazısı
export function durumYaz() {
  const el = document.getElementById('bulut-durum'); if (!el) return;
  const [t, c] = bulut.hata ? ['Kaydedilemedi · ' + bulut.hata, 'hata'] : bulut.durum === 'cevrimdisi' ? [bulut.bekleyen ? 'Çevrimdışı · değişiklikler bu cihazda bekliyor' : 'Çevrimdışı', 'uyari'] : bulut.bekleyen ? ['Kaydediliyor…', ''] : ['Kaydedildi', 'tamam'];
  el.textContent = t; el.className = 'bulut-durum ' + c;
}
