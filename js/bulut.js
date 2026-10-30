// Gerçek kurs hesabı: Google Firebase (Frankfurt). Giriş e-posta + şifreyle; kurs verisi Firestore'da
// kurslar/{kurs}/v altında parça parça durur. Her kayıt ayrı alan olarak yazılır: iki kişi aynı anda
// farklı kayıtları değiştirirse ikisi de korunur. Fotoğraf ve imzalar kurslar/{kurs}/dosyalar'da ayrı belge.
import { FIREBASE } from './firebase-ayar.js?v=96';
import { S, bulutVeri, bosVeri, kaydetDinle, kaydet, oturum, bulutKanca, makbuzSira, islem, iso, EVRAKLAR, gun, fark, tamAd } from './veri.js?v=96';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const YEREL = 'sinyal-bulut';
const BUYUK = { dersler: 64, kursiyerler: 64, hareket: 64, islemler: 16, gonderimler: 16, teorik: 8, adaylar: 8, sinavlar: 8, kampanyalar: 8, imzaTalepleri: 8 };
const HARIC = new Set(['kullanicilar', '_gun', '_bulut']);
const DOSYA_SINIR = 3000, DOSYA_ON = 'sinyal-dosya:';

export const bulut = { kurs: null, uid: null, ad: '', rol: '', usta: null, eposta: '', durum: 'kapali', bekleyen: 0, hata: '', sifreTalep: [] };
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
        if (!o || o.v !== j || o.x !== x) { belge(d, a, true).i[id] = { v: j, x }; if (o && o.v === j) return; kirlet(a, v[n], o); }
      });
      eski.forEach((o, id) => { if (!yeni.has(id)) { belge(o.d, a, true).i[id] = null; kirlet(a, null, o); } });
      son.set(a, yeni); tekSon.delete(a);
    } else {
      if (v === undefined) continue;
      const j = yaz(v);
      if (tekSon.get(a) !== j) { if (tekSon.has(a) && ['kurs', 'entegrasyon'].includes(a)) projeKirli.add('*'); belge('t~' + a, a).t = j; tekSon.set(a, j); }
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
  if (projeKirli.size) setTimeout(projeksiyonYaz, 1500);
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
  kancalariKur(u);
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

// ---- tek cihazdan gönderim, makbuz sayacı, sunucu işlem kaydı ----
const cihaz = (() => { try { let c = localStorage.getItem('sinyal-cihaz'); if (!c) { c = rastgele(12); localStorage.setItem('sinyal-cihaz', c); } return c; } catch (x) { return rastgele(12); } })();
const sure = (p, ms) => Promise.race([p, new Promise((_, red) => setTimeout(() => red(new Error('zaman aşımı')), ms))]);
const sahipler = new Map();
// Zamanlı mesajı yalnız ilk sahiplenen cihaz gönderir: belge yalnız bir kez oluşturulabilir (kural: update yok)
function sahiplen(anahtar) {
  if (sahipler.has(anahtar)) return sahipler.get(anahtar);
  const { db, F } = fb, ref = F.doc(db, 'kurslar', bulut.kurs, 'gonderim', 'g' + h32(anahtar).toString(36) + h32(anahtar, 5381).toString(36));
  const p = (async () => {
    try { await sure(F.setDoc(ref, { uid: bulut.uid, cihaz, zaman: F.serverTimestamp() }), 8000); return true; }
    catch (x) {
      try { const d = await F.getDoc(ref); return d.exists() && d.data().uid === bulut.uid && d.data().cihaz === cihaz; } catch (y) { sahipler.delete(anahtar); return false; }
    }
  })();
  sahipler.set(anahtar, p);
  return p;
}
// Makbuz numarası: sunucudaki sayaçtan önceden bir numara ayrılır, tahsilatta beklemeden kullanılır
const REZ = () => 'sinyal-makbuz-' + bulut.kurs;
const rezervOku = () => { try { return JSON.parse(localStorage.getItem(REZ()) || 'null'); } catch (x) { return null; } };
const rezervYaz = r => { try { r ? localStorage.setItem(REZ(), JSON.stringify(r)) : localStorage.removeItem(REZ()); } catch (x) { } };
const enBuyukMakbuz = yil => Math.max(0, ...(S.hareket || []).map(h => { const m = makbuzSira(h.no); return m && m[0] === yil ? m[1] : 0; }));
async function sayacAyir(yil, enAz = 0) {
  const { db, F } = fb, ref = F.doc(db, 'kurslar', bulut.kurs, 'sayac', 'makbuz-' + yil);
  return F.runTransaction(db, async t => { const d = await t.get(ref); const n = Math.max(d.exists() ? d.data().n || 0 : 0, enBuyukMakbuz(yil), enAz) + 1; t.set(ref, { n }); return n; });
}
let rezervSuruyor = null;
function rezervAl(yil) {
  if (rezervSuruyor) return rezervSuruyor;
  rezervSuruyor = sure(sayacAyir(yil), 10000).then(n => { rezervYaz({ yil, n }); }).catch(() => { }).finally(() => { rezervSuruyor = null; });
  return rezervSuruyor;
}
function makbuzNo(yil) {
  const r = rezervOku();
  const kullanildi = n => (S.hareket || []).some(h => { const m = makbuzSira(h.no); return m && m[0] === yil && m[1] === n; });
  if (r && r.yil === yil && !kullanildi(r.n)) { rezervYaz(null); setTimeout(() => rezervAl(yil), 50); return r.n; }
  rezervYaz(null); setTimeout(() => rezervAl(yil), 50);
  return null;
}
// Çevrimdışıyken verilen geçici numaralar: bağlantı gelince başka cihazın numarasıyla çakışıyorsa yenisi verilir
let denetimSuruyor = false;
async function makbuzDenetle() {
  if (denetimSuruyor || bulut.durum !== 'cevrimici') return;
  const benim = (S.hareket || []).filter(h => h.noGecici === cihaz); if (!benim.length) return;
  denetimSuruyor = true;
  try {
    for (const h of benim) {
      const m = makbuzSira(h.no); if (!m) { delete h.noGecici; continue; }
      const cakisan = S.hareket.some(x => x !== h && x.no === h.no);
      if (cakisan) { const eski = h.no, n = await sayacAyir(m[0]); h.no = 'M' + m[0] + '-' + String(n).padStart(5, '0'); islem('Makbuz numarası değişti', eski + ' başka cihazda da verilmişti; yeni numara ' + h.no); import('./ui.js?v=96').then(m => m.bildir(`Makbuz ${eski} çevrimdışıyken verilmişti ve başka cihazdaki makbuzla çakıştı; yeni numarası ${h.no}. Makbuzu verdiyseniz yenisini yazdırın.`, 'uyari')); }
      else await sayacAyir(m[0], m[1] - 1);
      delete h.noGecici;
    }
    kaydet();
  } catch (x) { console.error(x); } finally { denetimSuruyor = false; }
}
// Sunucu işlem kaydı: yalnız eklenebilir, değiştirilemez ve silinemez (Firestore kuralı)
function kayitYaz(x) {
  const { db, F } = fb;
  F.addDoc(F.collection(db, 'kurslar', bulut.kurs, 'kayit'), { uid: bulut.uid, ad: bulut.ad, ne: String(x.ne || ''), ayrinti: String(x.ayrinti || '').slice(0, 300), yerel: x.zaman, cihaz, zaman: F.serverTimestamp() }).catch(e => console.error(e));
}
export async function kayitlar(n = 300) {
  const { db, F } = await sdk();
  const q = await F.getDocs(F.query(F.collection(db, 'kurslar', bulut.kurs, 'kayit'), F.orderBy('zaman', 'desc'), F.limit(n)));
  return q.docs.map(d => { const v = d.data(); return { ...v, zaman: v.zaman ? v.zaman.toDate() : null }; });
}
function kancalariKur(u) {
  bulutKanca.sahiplen = sahiplen;
  bulutKanca.kayit = kayitYaz;
  bulutKanca.makbuzNo = makbuzNo; bulutKanca.cihaz = cihaz;
  // WhatsApp servisine kursun kimliğiyle gidilir (servis, Firebase oturumundan kursun üyesi olduğunu doğrular)
  bulutKanca.yetki = async () => ({ Authorization: 'Bearer ' + await fb.auth.currentUser.getIdToken(), 'X-Kurs': bulut.kurs });
  rezervAl(String(new Date().getFullYear()));
  setInterval(makbuzDenetle, 30000); setTimeout(makbuzDenetle, 5000);
  if (['mudur', 'sekreter'].includes(u.rol)) { setTimeout(() => gunlukYedek().catch(x => console.error(x)), 45000); gelenDinle(); }
}

// ---- yedek ----
// Her gün ilk açılışta kurs verisinin tam kopyası alınır: (1) Firestore'da kurslar/{kurs}/yedekler (30 gün silinemez),
// (2) ayrı bir yerde, Cloudflare'de (sunucu Google'dan bağımsız). Fotoğraflar ayrı belgede kaldığı için kopyada yalnız işaretleri durur.
export const WORKER = 'https://sinyal-wa.sinemsavar0.workers.dev';
// Kursun kendi WhatsApp Business hattı: durum, bağlama, kaldırma (erişim anahtarı yalnız servisde saklanır)
export async function waHat(govde) {
  const h = { ...(await bulutKanca.yetki()), 'Content-Type': 'application/json' };
  const r = await fetch(WORKER + '/hat', govde ? { method: 'POST', headers: h, body: JSON.stringify(govde) } : { headers: h });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw Object.assign(new Error(j.hata || 'WhatsApp servisine ulaşılamadı'), { kullanici: j.hata || 'WhatsApp servisine ulaşılamadı' });
  return j;
}
const PARCA = 900000;
async function sikistir(metin) {
  const b = new TextEncoder().encode(metin);
  if (typeof CompressionStream === 'undefined') return { veri: b, sikistirma: 'yok' };
  const c = await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  return { veri: new Uint8Array(c), sikistirma: 'gzip' };
}
async function ac(veri, sikistirma) {
  if (sikistirma !== 'gzip') return new TextDecoder().decode(veri);
  return new Response(new Blob([veri]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
function anlikMetin() { const o = {}; Object.keys(S).forEach(k => { if (!HARIC.has(k)) o[k] = S[k]; }); return yaz(o); }
export async function yedekAl(etiket) {
  await akit();
  const { db, F } = fb, tarih = iso(new Date()), id = etiket ? tarih + '-' + etiket + '-' + new Date().toTimeString().slice(0, 5).replace(':', '') : tarih;
  const { veri, sikistirma } = await sikistir(anlikMetin());
  const parca = Math.max(1, Math.ceil(veri.length / PARCA)), b = F.writeBatch(db), kok = ['kurslar', bulut.kurs, 'yedekler'];
  for (let i = 0; i < parca; i++) b.set(F.doc(db, ...kok, id + '~' + i), { v: F.Bytes.fromUint8Array(veri.slice(i * PARCA, (i + 1) * PARCA)), olusturma: F.serverTimestamp() });
  b.set(F.doc(db, ...kok, id), { meta: true, tarih, etiket: etiket || '', parca, boyut: veri.length, sikistirma, kim: bulut.ad, olusturma: F.serverTimestamp(), ogrenci: (S.kursiyerler || []).length, hareket: (S.hareket || []).length });
  await b.commit();
  // ayrı yerdeki kopya (Cloudflare); başarısız olursa ertesi gün yine denenir
  try {
    const tok = await fb.auth.currentUser.getIdToken();
    const r = await fetch(WORKER + '/yedek', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'X-Kurs': bulut.kurs, 'X-Yedek': id, 'X-Sikistirma': sikistirma, 'Content-Type': 'application/octet-stream' }, body: veri });
    if (!r.ok) throw new Error('yedek ' + r.status);
    await F.setDoc(F.doc(db, ...kok, id + '~dis'), { tamam: true, olusturma: F.serverTimestamp() }).catch(() => { });
  } catch (x) { console.error(x); }
  return id;
}
async function gunlukYedek() {
  if (!bulut.kurs || bulut.durum !== 'cevrimici') return;
  const { db, F } = fb, tarih = iso(new Date());
  const d = await F.getDoc(F.doc(db, 'kurslar', bulut.kurs, 'yedekler', tarih)).catch(() => null);
  if (d && d.exists()) return;
  try { await yedekAl(); } catch (x) { if (x.code !== 'permission-denied') throw x; }  // başka cihaz aynı anda aldıysa ikinci kopya reddedilir
  if (bulut.rol === 'mudur') eskiYedekleriSil().catch(() => { });
}
export async function yedekler() {
  const { db, F } = await sdk();
  const q = await F.getDocs(F.query(F.collection(db, 'kurslar', bulut.kurs, 'yedekler'), F.where('meta', '==', true)));
  let dis = new Set();
  try { const tok = await fb.auth.currentUser.getIdToken(); const r = await fetch(WORKER + '/yedek?kurs=' + encodeURIComponent(bulut.kurs), { headers: { Authorization: 'Bearer ' + tok } }); if (r.ok) dis = new Set((await r.json()).map(x => x.id)); } catch (x) { }
  return q.docs.map(d => ({ id: d.id, ...d.data(), olusturma: d.data().olusturma && d.data().olusturma.toDate(), dis: dis.has(d.id) })).sort((a, b) => (b.olusturma || 0) - (a.olusturma || 0));
}
async function eskiYedekleriSil() {
  const { db, F } = fb, sinir = Date.now() - 31 * 864e5;
  for (const y of await yedekler()) {
    if (!y.olusturma || y.olusturma.getTime() > sinir) continue;
    const b = F.writeBatch(db), kok = ['kurslar', bulut.kurs, 'yedekler'];
    for (let i = 0; i < y.parca; i++) b.delete(F.doc(db, ...kok, y.id + '~' + i));
    b.delete(F.doc(db, ...kok, y.id + '~dis')); b.delete(F.doc(db, ...kok, y.id)); await b.commit().catch(() => { });
  }
}
export async function yedekOku(y) {
  const { db, F } = await sdk(), kok = ['kurslar', bulut.kurs, 'yedekler'], parcalar = [];
  try {
    for (let i = 0; i < y.parca; i++) { const d = await F.getDoc(F.doc(db, ...kok, y.id + '~' + i)); parcalar.push(d.data().v.toUint8Array()); }
  } catch (x) {
    // Firestore'daki kopya okunamazsa Cloudflare'deki kopyaya dön
    const tok = await fb.auth.currentUser.getIdToken();
    const r = await fetch(WORKER + '/yedek?kurs=' + encodeURIComponent(bulut.kurs) + '&id=' + encodeURIComponent(y.id), { headers: { Authorization: 'Bearer ' + tok } });
    if (!r.ok) throw hata('Yedek okunamadı');
    parcalar.length = 0; parcalar.push(new Uint8Array(await r.arrayBuffer()));
  }
  const tum = new Uint8Array(parcalar.reduce((a, p) => a + p.length, 0)); let o = 0; parcalar.forEach(p => { tum.set(p, o); o += p.length; });
  return JSON.parse(await ac(tum, y.sikistirma));
}
// Seçilen güne geri dön: önce şimdiki hâlin yedeği alınır, sonra her kayıt yedekteki hâline getirilir
export async function geriYukle(y) {
  const veri = await yedekOku(y);
  await yedekAl('geri-donus-oncesi');
  const dosyaCoz = o => JSON.parse(JSON.stringify(o), (k, x) => typeof x === 'string' && x.startsWith(DOSYA_ON) && dosyaVeri.has(x.slice(DOSYA_ON.length)) ? dosyaVeri.get(x.slice(DOSYA_ON.length)) : x);
  const yeni = dosyaCoz(veri);
  Object.keys(S).forEach(k => { if (!HARIC.has(k) && !(k in yeni)) delete S[k]; });
  Object.keys(yeni).forEach(k => { if (!HARIC.has(k)) S[k] = yeni[k]; });
  islem('Yedekten geri döndü', y.tarih + (y.etiket ? ' · ' + y.etiket : ''));
  kaydet(); await akit();
  return true;
}
export function yedekIndir(veri, ad) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(veri)], { type: 'application/json' })); a.download = ad; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---- öğrenci paneli: öğrencinin kendi telefonundan girişi ----
// Her öğrenciye tahmin edilemez bir link (kurslar/{kurs}/ogrenciler/{kod}). Belgede yalnız o öğrencinin kayıtları durur;
// öğrencinin yaptıkları (evrak, ders alma/iptal, puan, test) ogrenciGelen'e yazılır, kurs cihazı denetleyip işler.
const projeKirli = new Set(), projeSon = new Map(), islenen = new Map();
const DIZI_OGR = ['kursiyerler', 'dersler', 'gonderimler'];
function kirlet(a, el, o) {
  const eski = o && o.v ? (() => { try { return JSON.parse(o.v); } catch (x) { return null; } })() : null;
  if (a === 'kursiyerler') { if (el) projeKirli.add(el.id); else if (eski) projeKirli.add(eski.id); }
  else if (a === 'dersler' || a === 'hareket') { [el && el.kursiyer, eski && eski.kursiyer].forEach(k => k && projeKirli.add(k)); if (a === 'dersler') [el, eski].forEach(d => d && d.egitmen && S.kursiyerler.forEach(k => { if (k.panelKod && k.egitmen === d.egitmen && k.id !== d.kursiyer) projeKirli.add(k.id); })); }
  else if (a === 'sinavlar') [el, eski].forEach(x => x && (x.kursiyerler || []).forEach(k => projeKirli.add(k)));
  else if (['teorik', 'gruplar', 'egitmenler', 'araclar', 'bosTeklif', 'subeler'].includes(a)) projeKirli.add('*');
}
const sec = (o, l) => { const r = {}; l.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; };
const veriAt = (k, x) => typeof x === 'string' && x.length > DOSYA_SINIR && x.startsWith('data:') ? null : (typeof x === 'string' && x.startsWith(DOSYA_ON) ? null : x);
export function ogrenciVerisi(k) {
  const id = k.id, bugun = iso(new Date());
  const kurs = { ...S.kurs }; ['waApi', 'waApiVarsayilan', 'waHat', 'demoNumara', 'demoKime', 'maliyet', 'kuralDegisen', 'kuralOnay', 'aydinlatma'].forEach(x => delete kurs[x]);
  const ben = { ...k, tc: k.tc ? '•••••••' + String(k.tc).slice(-4) : '' }; delete ben.notlar; delete ben.panelKod; delete ben.hesap;
  return {
    kurs, subeler: (S.subeler || []).filter(x => x.id === k.sube).map(x => sec(x, ['id', 'ad', 'semt'])),
    kursiyerler: [ben],
    dersler: S.dersler.filter(d => d.kursiyer === id).concat(S.dersler.filter(d => d.kursiyer !== id && d.egitmen === k.egitmen && d.tarih >= bugun && d.durum === 'Planlandı').map(d => ({ ...sec(d, ['id', 'egitmen', 'arac', 'tarih', 'saat', 'durum']), kursiyer: null }))),
    hareket: S.hareket.filter(h => h.kursiyer === id).map(h => sec(h, ['id', 'tarih', 'tur', 'kategori', 'aciklama', 'tutar', 'yontem', 'kursiyer', 'no'])),
    sinavlar: S.sinavlar.filter(x => (x.kursiyerler || []).includes(id)).map(x => ({ ...x, kursiyerler: [id], sonuc: x.sonuc ? { [id]: x.sonuc[id] } : x.sonuc })),
    teorik: S.teorik.filter(t => !k.teorikGrup || !t.grup || t.grup === k.teorikGrup).map(t => sec(t, ['id', 'tarih', 'saat', 'sure', 'konu', 'salon', 'grup', 'ogretmen'])),
    gruplar: S.gruplar || [], bosTeklif: (S.bosTeklif || []).filter(t => (t.adaylar || []).includes(id)).map(t => ({ ...t, adaylar: [id] })),
    egitmenler: S.egitmenler.map(x => sec(x, ['id', 'ad', 'renk', 'siniflar', 'sube', 'sinif'])),
    araclar: S.araclar.map(x => sec(x, ['id', 'plaka', 'model', 'sinif', 'vites', 'egitmen', 'renk', 'yil'])),
    ogretmenler: (S.ogretmenler || []).map(x => sec(x, ['id', 'ad'])),
    entegrasyon: { kdv: (S.entegrasyon || {}).kdv, earsiv: { bagli: false }, muhasebe: {}, musavir: {} },
  };
}
async function projeksiyonYaz() {
  if (!bulut.kurs || !fb || !projeKirli.size) return;
  const hepsi = projeKirli.has('*'), ids = new Set(projeKirli); projeKirli.clear();
  const { db, F } = fb;
  for (const k of S.kursiyerler) {
    if (!k.panelKod || (!hepsi && !ids.has(k.id))) continue;
    const v = JSON.stringify(ogrenciVerisi(k), veriAt);
    if (projeSon.get(k.panelKod) === v) continue;
    projeSon.set(k.panelKod, v);
    F.setDoc(F.doc(db, 'kurslar', bulut.kurs, 'ogrenciler', k.panelKod), { kursiyer: k.id, uid: (k.hesap || {}).uid || null, v, islenen: islenen.get(k.id) || [], guncel: F.serverTimestamp() }).catch(x => console.error(x));
  }
}
export const panelLinki = (k) => location.origin + location.pathname + '#/ogr/' + bulut.kurs + '/' + k.panelKod;
export async function panelAc(k, yeniden) {
  const { db, F } = await sdk();
  if (k.panelKod && yeniden) { await F.deleteDoc(F.doc(db, 'kurslar', bulut.kurs, 'ogrenciler', k.panelKod)).catch(() => { }); projeSon.delete(k.panelKod); k.panelKod = null; }
  if (!k.panelKod) { k.panelKod = rastgele(24); kaydet(); }
  const v = JSON.stringify(ogrenciVerisi(k), veriAt); projeSon.set(k.panelKod, v);
  await F.setDoc(F.doc(db, 'kurslar', bulut.kurs, 'ogrenciler', k.panelKod), { kursiyer: k.id, uid: (k.hesap || {}).uid || null, v, islenen: [], guncel: F.serverTimestamp() });
  return panelLinki(k);
}
export async function panelKapat(k) {
  if (!k.panelKod) return; const { db, F } = await sdk();
  await F.deleteDoc(F.doc(db, 'kurslar', bulut.kurs, 'ogrenciler', k.panelKod)); projeSon.delete(k.panelKod); k.panelKod = null; kaydet();
}

// Kurs cihazı: öğrenciden gelenleri sırayla, denetleyerek işler (aynı kaydı iki cihaz işlemesin diye işlem içinde silinir)
function gelenDinle() {
  const { db, F } = fb;
  dinleyiciler.push(F.onSnapshot(F.collection(db, 'kurslar', bulut.kurs, 'sifreTalep'), q => { bulut.sifreTalep = q.docs.map(d => ({ tel: d.id, zaman: d.data().zaman })); yenileFn(); }, () => { }));
  dinleyiciler.push(F.onSnapshot(F.collection(db, 'kurslar', bulut.kurs, 'ogrenciGelen'), q => {
    q.docChanges().filter(c => c.type === 'added').forEach(c => {
      F.runTransaction(db, async t => { const d = await t.get(c.doc.ref); if (!d.exists()) return null; t.delete(c.doc.ref); return d.data(); })
        .then(v => { if (v) ogrenciUygula(c.doc.id, v); }).catch(x => console.error(x));
    });
  }, () => { }));
}
function ogrenciUygula(docId, g) {
  const k = S.kursiyerler.find(x => x.id === g.kursiyer); if (!k || !Array.isArray(g.d)) return;
  const notlar = [], bugun = iso(new Date());
  for (const x of g.d.slice(0, 30)) {
    let y = null; try { y = x.v ? JSON.parse(x.v) : null; } catch (e) { continue; }
    if (x.a === 'kursiyerler' && x.id === k.id && y) {
      ['deneme', 'yanlislar', 'konuAnaliz', 'okunan', 'tekrar', 'gorulen', 'dirCalisma', 'tehlike'].forEach(f => { if (y[f] !== undefined && JSON.stringify(y[f]).length < 50000) k[f] = y[f]; });
      ['hesapAktif', 'sonGiris'].forEach(f => { if (typeof y[f] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(y[f]) && y[f] !== k[f]) { k[f] = y[f]; if (f === 'hesapAktif') notlar.push('şifresini belirleyip hesabını kullanmaya başladı'); } });
      Object.entries(y.evrakYuklenen || {}).forEach(([key, e]) => {
        if (!e || !e.veri || !EVRAKLAR.some(z => z[0] === key) || k.evrak[key]) return;
        if (!/^data:(image\/jpeg|image\/png|application\/pdf);base64,/.test(e.veri) || e.veri.length > 950000) return;
        k.evrakYuklenen = k.evrakYuklenen || {}; k.evrakYuklenen[key] = { tarih: bugun, dosya: String(e.dosya || '').slice(0, 120), boyut: e.veri.length, tur: e.veri.startsWith('data:application/pdf') ? 'pdf' : 'resim', veri: e.veri };
        notlar.push((EVRAKLAR.find(z => z[0] === key) || [0, key])[1] + ' belgesini yükledi');
      });
      if (k.ekDersTeklif && y.ekDersTeklif === null) {
        const t = k.ekDersTeklif;
        if ((y.ekDersHakki || 0) > (k.ekDersHakki || 0)) { k.odeme.taksitler.push({ vade: gun(30), tutar: t.tutar, odendi: null, yontem: null, aciklama: t.n + ' ek direksiyon dersi' }); k.odeme.toplam += t.tutar; S.kazanim.ekDers++; k.ekDersHakki = (k.ekDersHakki || 0) + t.n; notlar.push(t.n + ' ek ders teklifini kabul etti'); }
        else notlar.push('ek ders teklifini istemedi');
        k.ekDersTeklif = null;
      }
    } else if (x.a === 'dersler') {
      const d = S.dersler.find(z => z.id === x.id);
      if (d && d.kursiyer === k.id) {
        if (!y) { if (d.durum === 'Planlandı' && fark(d.tarih) >= 1) { S.dersler = S.dersler.filter(z => z !== d); notlar.push(d.tarih + ' ' + d.saat + ' dersini iptal etti'); } else notlar.push('iptal isteği reddedildi (24 saatten az kaldı)'); }
        else if (y.ogrenciPuan && typeof y.ogrenciPuan.puan === 'number' && d.durum === 'Yapıldı') { d.ogrenciPuan = { puan: Math.max(1, Math.min(5, Math.round(y.ogrenciPuan.puan))), yorum: String(y.ogrenciPuan.yorum || '').slice(0, 300), tarih: bugun }; notlar.push('dersi puanladı'); }
        // ders defteri: öğrenci dersi onaylar ya da itiraz eder (bir kez); itiraz müdüre düşer
        if (y && y.ogrenciOnay && ['onay', 'itiraz'].includes(y.ogrenciOnay.durum) && d.durum === 'Yapıldı' && !d.ogrenciOnay) {
          d.ogrenciOnay = { durum: y.ogrenciOnay.durum, not: String(y.ogrenciOnay.not || '').slice(0, 300), tarih: bugun };
          notlar.push(d.tarih + ' ' + d.saat + ' dersini ' + (d.ogrenciOnay.durum === 'onay' ? 'onayladı' : 'itiraz etti' + (d.ogrenciOnay.not ? ': ' + d.ogrenciOnay.not : '')));
          if (d.ogrenciOnay.durum === 'itiraz') (S.devredilen = S.devredilen || []).unshift({ ad: tamAd(k), kanal: 'Ders defteri', konu: 'Ders itirazı', mesaj: d.tarih + ' ' + d.saat + ' dersi yapılmadı diyor' + (d.ogrenciOnay.not ? ': ' + d.ogrenciOnay.not : ''), neden: 'Öğrenci dersi onaylamadı', saat: new Date().toTimeString().slice(0, 5), bildirim: [] });
        }
      } else if (!d && y && y.kursiyer === k.id && y.durum === 'Planlandı' && y.tarih >= bugun && S.egitmenler.some(e => e.id === y.egitmen)) {
        if (S.dersler.some(z => z.tarih === y.tarih && z.saat === y.saat && (z.egitmen === y.egitmen || z.kursiyer === k.id) && z.durum !== 'İptal')) { notlar.push(y.tarih + ' ' + y.saat + ' ders isteği reddedildi: saat dolu'); continue; }
        S.dersler.push({ id: String(x.id).slice(0, 40), kursiyer: k.id, egitmen: y.egitmen, arac: S.araclar.some(a => a.id === y.arac) ? y.arac : null, tarih: y.tarih, saat: String(y.saat).slice(0, 5), durum: 'Planlandı', eklendi: bugun, kaynak: 'kursiyer' });
        const t = (S.bosTeklif || []).find(z => z.tarih === y.tarih && z.saat === y.saat && z.egitmen === y.egitmen); if (t) { S.bosTeklif = S.bosTeklif.filter(z => z !== t); S.kazanim.doldurulan++; }
        notlar.push(y.tarih + ' ' + y.saat + ' direksiyon dersi aldı');
      }
    } else if (x.a === 'gonderimler' && y && !x.eski) {
      const m = { zaman: new Date().toISOString(), kime: String(y.kime || '').slice(0, 80), metin: String(y.metin || '').slice(0, 1000), tur: String(y.tur || 'Öğrenci').slice(0, 60) };
      S.gonderimler.unshift(m);
      if (y.iletilecek && S.kurs.waApi) sahiplen('og|' + docId + '|' + x.id).then(ok => { if (ok) import('./ui.js?v=96').then(u => u.apiGonder(u.etiket(m.kime, y.rol || '') + m.metin, undefined, undefined, { ad: m.kime, rol: y.rol || '' })); });
    }
  }
  if (notlar.length) islem('Öğrenci panelinden', tamAd(k) + ': ' + notlar.join(', '));
  const l = islenen.get(k.id) || []; l.unshift(docId); islenen.set(k.id, l.slice(0, 20)); projeKirli.add(k.id);
  kaydet(); yenileFn();
}

// Öğrencinin telefonu: kendi belgesini dinler, yaptıklarını kursa gönderir
const ogr = { kurs: null, kod: null, taban: new Map(), bekleyen: [] };
const tabanAl = () => { DIZI_OGR.forEach(a => { const m = new Map(); const l = S[a] || []; kimlikler(l).forEach((id, n) => m.set(id, JSON.stringify(l[n]))); ogr.taban.set(a, m); }); };
function ogrenciKur(veri) {
  const taban = bosVeri({}); delete taban._gun;
  Object.keys(veri).forEach(a => { taban[a] = veri[a]; });
  taban.kullanicilar = []; taban.gonderimler = [];
  bulutVeri(taban, 'ogr-' + ogr.kod);
  // henüz kurs tarafından işlenmemiş kendi değişikliklerini üstüne koy
  ogr.bekleyen.forEach(p => p.d.forEach(x => { const l = S[x.a]; if (!Array.isArray(l)) return; const i = kimlikler(l).indexOf(x.id); if (x.v === null) { if (i >= 0) l.splice(i, 1); } else { const y = JSON.parse(x.v); if (i >= 0) l[i] = y; else l.push(y); } }));
  tabanAl();
}
export async function ogrenciBaglan(kurs, kod) {
  const { db, F } = await sdk();
  Object.assign(ogr, { kurs, kod });
  try { ogr.bekleyen = JSON.parse(localStorage.getItem('sinyal-ogr-bekleyen-' + kod) || '[]').filter(p => Date.now() - p.t < 864e5); } catch (x) { ogr.bekleyen = []; }
  return new Promise((coz, red) => {
    let ilk = true;
    dinleyiciler.push(F.onSnapshot(F.doc(db, 'kurslar', kurs, 'ogrenciler', kod), d => {
      if (!d.exists()) { if (ilk) { ilk = false; red(hata('Öğrenci hesabınız kapatılmış. Kursunuzla görüşün.')); } else location.reload(); return; }
      const v = d.data(), isl = new Set(v.islenen || []);
      ogr.bekleyen = ogr.bekleyen.filter(p => !isl.has(p.id) && Date.now() - p.t < 3 * 60e3);
      ogrenciKur(JSON.parse(v.v));
      if (ilk) { ilk = false; kaydetDinle(ogrenciPlanla); coz(S.kursiyerler[0]); } else yenileFn();
    }, x => { if (ilk) { ilk = false; red(x); } else location.reload(); }));  // hesap kapatıldı ya da şifre yenilendi: yeniden giriş
  });
}
let ogrZaman = null;
function ogrenciPlanla() { clearTimeout(ogrZaman); ogrZaman = setTimeout(ogrenciGonder, 600); }
async function ogrenciGonder() {
  const d = [];
  DIZI_OGR.forEach(a => {
    const eski = ogr.taban.get(a) || new Map(), l = S[a] || [], ids = kimlikler(l), gor = new Set();
    ids.forEach((id, n) => { gor.add(id); const j = JSON.stringify(l[n]); if (eski.get(id) !== j) d.push({ a, id, v: j }); });
    if (a !== 'gonderimler') eski.forEach((j, id) => { if (!gor.has(id)) d.push({ a, id, v: null }); });
  });
  if (!d.length) return;
  tabanAl();
  const boyut = JSON.stringify(d).length;
  if (boyut > 950000) { import('./ui.js?v=96').then(u => u.bildir('Gönderilen belge çok büyük; daha küçük bir fotoğraf dene', 'uyari')); return; }
  const { db, F } = fb;
  try {
    const ref = await F.addDoc(F.collection(db, 'kurslar', ogr.kurs, 'ogrenciGelen'), { kod: ogr.kod, kursiyer: S.kursiyerler[0].id, d, zaman: F.serverTimestamp() });
    ogr.bekleyen.push({ id: ref.id, t: Date.now(), d });
    try { localStorage.setItem('sinyal-ogr-bekleyen-' + ogr.kod, JSON.stringify(ogr.bekleyen.map(p => ({ ...p, d: p.d.map(x => x.v && x.v.length > 20000 ? { ...x, v: null, buyuk: true } : x).filter(x => !x.buyuk) })))); } catch (x) { }
  } catch (x) { console.error(x); import('./ui.js?v=96').then(u => u.bildir('Kursa iletilemedi; internet bağlantını kontrol et', 'uyari')); }
}
export function ogrenciAyril() { try { localStorage.removeItem('sinyal-ogrenci'); } catch (x) { } }

// ---- öğrenci hesabı: telefon numarası + şifre ----
// Ücretsiz Firebase planında SMS yok: telefon numarası arka planda bir giriş adresine çevrilir (telefonlar/{90…} → adres).
// Müdür hesabı ayrı bir Firebase bağlantısıyla açar (kendi oturumu kapanmaz); geçici şifre WhatsApp'tan gider,
// öğrenci ilk girişte kendi şifresini belirler. Aynı telefonu kullanan kardeşler ayrı şifreyle girer.
export const telNorm = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('0')) d = d.slice(1); if (d.length === 10) d = '90' + d; return /^905\d{9}$/.test(d) ? d : null; };
export const telGoster = tel => tel ? '0' + tel.slice(2, 5) + ' ' + tel.slice(5, 8) + ' ' + tel.slice(8, 10) + ' ' + tel.slice(10) : '';
export const geciciSifre = () => rastgele(8);
export const ogrenciGirisLinki = () => location.origin + location.pathname + '#/ogrenci-giris';
export async function ogrenciHesapAc(k) {
  const tel = telNorm(k.tel); if (!tel) throw hata('Öğrencinin cep telefonu numarası geçersiz; önce bilgilerini düzeltin');
  const { db, F, A } = await sdk();
  const tref = F.doc(db, 'telefonlar', tel), t = await F.getDoc(tref);
  if (t.exists() && t.data().k !== bulut.kurs) throw hata('Bu telefon numarasıyla başka bir kursta öğrenci hesabı var. Öğrencinin başka bir numarasını girin');
  const sifre = geciciSifre(), eposta = tel + '.' + rastgele(6) + '@ogrenci.sinyal.app';
  if (!k.panelKod) k.panelKod = rastgele(24);
  const { initializeApp, deleteApp } = await import(SDK + 'firebase-app.js');
  const app2 = initializeApp(FIREBASE, 'ogr-' + Date.now());
  let uid;
  try {
    const a2 = A.initializeAuth(app2, { persistence: A.inMemoryPersistence });
    uid = (await A.createUserWithEmailAndPassword(a2, eposta, sifre)).user.uid;
    await F.setDoc(F.doc(F.getFirestore(app2), 'kullanicilar', uid), { kurs: bulut.kurs, rol: 'ogrenci', kod: k.panelKod, kursiyer: k.id, ilkGiris: true });
    await A.signOut(a2);
  } finally { deleteApp(app2).catch(() => { }); }
  const yeniden = !!(k.hesap && k.hesap.uid);
  k.hesap = { tel, uid, acildi: gun(0), kim: bulut.ad, sifirlandi: yeniden ? gun(0) : null };
  delete k.hesapAktif;
  await panelAc(k);
  await F.setDoc(tref, { k: bulut.kurs, h: { [k.id]: eposta } }, { merge: true });
  F.deleteDoc(F.doc(db, 'kurslar', bulut.kurs, 'sifreTalep', tel)).catch(() => { });
  kaydet();
  return { tel, sifre, yeniden };
}
export async function ogrenciHesapKapat(k) {
  const { db, F } = await sdk(), tel = (k.hesap || {}).tel;
  if (tel) await F.updateDoc(F.doc(db, 'telefonlar', tel), { ['h.' + k.id]: F.deleteField() }).catch(() => { });
  await panelKapat(k).catch(() => { });
  k.hesap = null; delete k.hesapAktif; kaydet();
}
// öğrencinin telefonu
async function ogrenciUyelik(user) {
  const { db, F, auth, A } = await sdk();
  const p = await F.getDoc(F.doc(db, 'kullanicilar', user.uid)), d = p.exists() ? p.data() : null;
  if (!d || d.rol !== 'ogrenci') { await A.signOut(auth); throw hata('Bu hesap bir öğrenci hesabı değil'); }
  try { localStorage.setItem('sinyal-ogrenci', JSON.stringify({ kurs: d.kurs, kod: d.kod, hesap: true })); } catch (x) { }
  return { ...d, uid: user.uid };
}
export async function ogrenciGiris(telGiris, sifre) {
  const tel = telNorm(telGiris); if (!tel) throw hata('Cep telefonu numaranızı 05xx xxx xx xx biçiminde yazın');
  if (!sifre) throw hata('Şifrenizi girin');
  const { auth, db, F, A } = await sdk();
  const t = await F.getDoc(F.doc(db, 'telefonlar', tel)), adresler = t.exists() ? Object.values(t.data().h || {}) : [];
  if (!adresler.length) throw hata('Bu numarayla açılmış öğrenci hesabı yok. Kursunuzdan hesap açmasını isteyin');
  let son = null;
  for (const a of adresler) {
    try { return await ogrenciUyelik((await A.signInWithEmailAndPassword(auth, a, sifre)).user); }
    catch (x) { if (x.kullanici || x.code === 'auth/too-many-requests' || x.code === 'auth/network-request-failed') throw x; son = x; }
  }
  throw hata('Telefon numarası ya da şifre hatalı');
}
export async function ogrenciOturumu() {
  const { auth, A } = await sdk();
  const user = await new Promise(coz => { const kapat = A.onAuthStateChanged(auth, u => { kapat(); coz(u); }); });
  if (!user) return null;
  try { return await ogrenciUyelik(user); } catch (x) { return null; }
}
export async function ogrenciSifreBelirle(yeni, eski) {
  if (String(yeni).length < 8) throw hata('Şifre en az 8 karakter olmalı');
  const { auth, db, F, A } = await sdk(), u = auth.currentUser; if (!u) throw hata('Oturum kapanmış; tekrar giriş yapın');
  if (eski !== undefined) { try { await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, eski)); } catch (x) { throw hata('Mevcut şifreniz hatalı'); } }
  await A.updatePassword(u, yeni);
  await F.updateDoc(F.doc(db, 'kullanicilar', u.uid), { ilkGiris: false });
}
export async function ogrenciCikis() {
  try { localStorage.removeItem('sinyal-ogrenci'); } catch (x) { }
  if (fb) { try { await fb.A.signOut(fb.auth); } catch (x) { } }
}
// şifresini unutan öğrenci: talep kursa düşer, kurs yeni geçici şifre gönderir
export async function ogrenciSifreTalep(telGiris) {
  const tel = telNorm(telGiris); if (!tel) throw hata('Önce cep telefonu numaranızı yazın');
  const { db, F } = await sdk();
  const t = await F.getDoc(F.doc(db, 'telefonlar', tel));
  if (!t.exists() || !Object.keys(t.data().h || {}).length) throw hata('Bu numarayla açılmış öğrenci hesabı yok');
  await F.setDoc(F.doc(db, 'kurslar', t.data().k, 'sifreTalep', tel), { zaman: F.serverTimestamp() });
}
