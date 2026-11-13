// Gerçek kurs hesabı: Google Firebase (Frankfurt). Giriş e-posta + şifreyle; kurs verisi Firestore'da
// kurslar/{kurs}/v altında parça parça durur. Her kayıt ayrı alan olarak yazılır: iki kişi aynı anda
// farklı kayıtları değiştirirse ikisi de korunur. Fotoğraf ve imzalar kurslar/{kurs}/dosyalar'da ayrı belge.
import { FIREBASE } from './firebase-ayar.js?v=191';
import { S, bulutVeri, bosVeri, kaydetDinle, kaydet, oturum, bulutKanca, makbuzSira, islem, iso, EVRAKLAR, gun, fark, tamAd, iptalEdilebilir, dersIptalIz } from './veri.js?v=191';

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
  'auth/missing-password': 'Şifre girin', 'auth/user-disabled': 'Bu hesabın girişi kapatılmış; mdSinyal’e yazın', 'auth/requires-recent-login': 'Güvenlik için çıkış yapıp tekrar giriş yapın, sonra yeniden deneyin',
  'auth/invalid-verification-code': 'Doğrulama kodu hatalı', 'auth/operation-not-allowed': 'İki adımlı giriş bu mdSinyal kurulumunda henüz açılmadı; mdSinyal ekibine yazın', 'auth/unverified-email': 'Önce e-posta adresinizi doğrulayın (gelen kutunuza doğrulama linki gönderildi)',
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
// kodSor: iki adımlı giriş açıksa doğrulama uygulamasındaki 6 haneli kodu isteyen fonksiyon (Promise<string|null>)
export async function girisYap(eposta, sifre, kodSor) {
  const { auth, A } = await sdk();
  let c;
  try { c = await A.signInWithEmailAndPassword(auth, eposta.trim(), sifre); }
  catch (x) {
    if (x.code !== 'auth/multi-factor-auth-required' || !kodSor) throw x;
    const r = A.getMultiFactorResolver(auth, x), ipucu = r.hints.find(h => h.factorId === A.TotpMultiFactorGenerator.FACTOR_ID);
    if (!ipucu) throw x;
    for (;;) {
      const kod = await kodSor(); if (!kod) throw hata('Giriş iptal edildi');
      try { c = await r.resolveSignIn(A.TotpMultiFactorGenerator.assertionForSignIn(ipucu.uid, kod)); break; }
      catch (y) { if (y.code !== 'auth/invalid-verification-code') throw y; }
    }
  }
  const u = await uyelikBul(c.user);
  if (!u) { await A.signOut(auth); throw hata('Bu hesap bir kursa bağlı değil. Kurs müdürünüzden davet linki isteyin ya da yeni kurs hesabı açın'); }
  return baglan(u);
}
// İki adımlı giriş (doğrulama uygulaması / TOTP). Firebase projesinde Identity Platform ve TOTP açık olmalı.
export async function ikiAdimDurum() { const { auth, A } = await sdk(); return A.multiFactor(auth.currentUser).enrolledFactors.some(f => f.factorId === A.TotpMultiFactorGenerator.FACTOR_ID); }
export async function ikiAdimBaslat() {
  const { auth, A } = await sdk();
  const oturum = await A.multiFactor(auth.currentUser).getSession();
  const gizli = await A.TotpMultiFactorGenerator.generateSecret(oturum);
  return { anahtar: gizli.secretKey, url: gizli.generateQrCodeUrl(auth.currentUser.email, 'mdSinyal'), bitir: kod => A.multiFactor(auth.currentUser).enroll(A.TotpMultiFactorGenerator.assertionForEnrollment(gizli, kod), 'Doğrulama uygulaması') };
}
export async function epostaDogrula() { const { auth, A } = await sdk(); await A.sendEmailVerification(auth.currentUser); }
export async function ikiAdimKapat() { const { auth, A } = await sdk(); const m = A.multiFactor(auth.currentUser), f = m.enrolledFactors.find(x => x.factorId === A.TotpMultiFactorGenerator.FACTOR_ID); if (f) await m.unenroll(f); }
export async function sifreSifirla(eposta) { const { auth, A } = await sdk(); await A.sendPasswordResetEmail(auth, eposta.trim()); }
export async function sifreDogrula(sifre) {
  const { auth, A } = await sdk();
  try { await A.reauthenticateWithCredential(auth.currentUser, A.EmailAuthProvider.credential(auth.currentUser.email, sifre)); return true; } catch (x) { return x.code === 'auth/multi-factor-auth-required'; }  // iki adımlı hesapta şifre doğruysa ikinci adım istenir
}
// Çıkış: bekleyen yazılar en fazla 4 sn beklenir; cihazda kalan kurs verisi (yerel kopya ve Firestore önbelleği) silinir
export const yerelTemizle = () => { try { Object.keys(localStorage).filter(a => a.startsWith('sinyal-bulut-') || a.startsWith('sinyal-ogr-bekleyen-') || a.startsWith('sinyal-usta-bekleyen-')).forEach(a => localStorage.removeItem(a)); } catch (x) { } };
async function onbellekSil() { if (!fb) return; try { await fb.F.terminate(fb.db); await fb.F.clearIndexedDbPersistence(fb.db); } catch (x) { } }
export async function cikisYap() {
  try { await Promise.race([akit(), new Promise(r => setTimeout(r, 4000))]); } catch (x) { }
  try { localStorage.removeItem(YEREL); localStorage.removeItem('sinyal-son-hareket'); } catch (x) { }
  if (fb) { try { await fb.A.signOut(fb.auth); } catch (x) { } }
  yerelTemizle(); await onbellekSil();
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
// Yeni kurs hesabı yalnız mdSinyal ekibinin verdiği tek kullanımlık davet koduyla açılır (Firestore kuralı da zorunlu kılar)
export const kursDavetLinki = kod => location.origin + location.pathname + '#/yeni-kurs/' + kod;
export async function kursDavetGetir(kod) {
  const { db, F } = await sdk();
  const d = await F.getDoc(F.doc(db, 'kursDavetleri', kod)).catch(() => null);
  if (!d || !d.exists()) return null; const v = d.data(); if (v.son && v.son.toDate() < new Date()) return null; return v;
}
export async function yoneticiMi() {
  if (!fb || !fb.auth.currentUser) return false;
  const { db, F } = fb; const d = await F.getDoc(F.doc(db, 'yoneticiler', fb.auth.currentUser.uid)).catch(() => null);
  return !!(d && d.exists());
}
export async function kursDavetOlustur(not) {
  const { db, F, auth } = await sdk();
  const kod = rastgele(20), son = new Date(Date.now() + 30 * 864e5);
  await F.setDoc(F.doc(db, 'kursDavetleri', kod), { olusturan: auth.currentUser.uid, not: String(not || '').slice(0, 120), tarih: F.serverTimestamp(), son: F.Timestamp.fromDate(son) });
  return { kod, link: kursDavetLinki(kod), son };
}
export async function kursAc({ kursAd, yetkili, sehir, eposta, sifre, mudurTel, davetKod }) {
  if (!davetKod || !(await kursDavetGetir(davetKod))) throw hata('Bu hesap açma linki geçersiz ya da süresi dolmuş; mdSinyal ekibinden yeni link isteyin');
  const user = await hesapAc(eposta, sifre, yetkili);
  const { db, F } = fb;
  const kRef = F.doc(F.collection(db, 'kurslar'));
  const b = F.writeBatch(db);
  b.set(kRef, { ad: kursAd, sahip: user.uid, sehir: sehir || '', olusturma: F.serverTimestamp(), davetKod });
  b.delete(F.doc(db, 'kursDavetleri', davetKod));  // kod tek kullanımlık
  b.set(F.doc(db, 'kurslar', kRef.id, 'uyeler', user.uid), { ad: yetkili, rol: 'mudur', eposta: user.email, katilma: F.serverTimestamp() });
  b.set(F.doc(db, 'kullanicilar', user.uid), { kurs: kRef.id });
  await b.commit();
  return baglan({ kurs: kRef.id, uid: user.uid, ad: yetkili, rol: 'mudur', usta: null, eposta: user.email }, bosVeri({ kursAd, yetkili, sehir, mudurTel }));
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
      // kurs ayarları tek parça yazılır: cihaz sunucudan güncel veriyi almadan (yalnız önbellekle açılmışken) yazmaz; eski kopya yenisini ezmesin
      if (!sunucuGeldi && ['kurs', 'entegrasyon'].includes(a)) continue;
      if (tekSon.get(a) !== j) { if (tekSon.has(a) && ['kurs', 'entegrasyon'].includes(a)) projeKirli.add('*'); belge('t~' + a, a).t = j; tekSon.set(a, j); }
    }
  }
  return yazilar;
}
let sunucuGeldi = false;  // bu oturumda sunucudan en az bir güncel anlık görüntü geldi mi
export const sunucuHazir = () => sunucuGeldi;
export async function akit() {
  if (!bulut.kurs || !fb) return;
  if (bulut.rol === 'ortak') return;  // mdSinyal Yönetim'de ortak yalnız görür; sunucu kuralı da yazmasına izin vermez
  if (bulut.rol === 'usta') return ustaGonder();  // öğretmen kurs verisine doğrudan yazmaz; yaptıkları ustaGelen'e gider
  clearTimeout(zamanla); zamanla = null;
  const yazilar = farklar(), dosyalar = yeniDosya; yeniDosya = new Map();
  if (!yazilar.size && !dosyalar.size) return;
  const { db, F } = fb, kok = ['kurslar', bulut.kurs];
  // Her paketin içeriği tutulur: sunucu reddederse (yetki, boyut) değişiklikler kaybolmasın diye cihaza "kurtarma" kaydı düşer ve uyarı kalıcı olur
  let b = F.writeBatch(db), n = 0, boy = 0, icerik = []; const isler = [];
  const kapat = () => { const ic = icerik; isler.push(b.commit().then(() => null, x => { kurtarmaYaz(ic, x); throw x; })); };
  const ekle = (ref, veri, boyut, kayit) => { if (n >= 450 || boy + boyut > 6e6) { kapat(); b = F.writeBatch(db); n = 0; boy = 0; icerik = []; } b.set(ref, veri, { merge: true }); n++; boy += boyut; if (kayit) icerik.push(kayit); };
  // Firestore belge sınırı 1 MiB: 700 KB'lık PDF base64'te ~956 bin karakter eder, sığar
  dosyalar.forEach((v, id) => { if (v.length > 1040000) { bulut.kalici = 'Bir dosya çok büyük olduğu için kaydedilemedi; daha küçük bir fotoğraf ya da PDF yükleyin'; return; } ekle(F.doc(db, ...kok, 'dosyalar', id), { v }, v.length); yuklu.add(id); });
  yazilar.forEach((w, id) => {
    const veri = { a: w.a };
    if (w.d) { veri.d = true; veri.i = {}; Object.entries(w.i).forEach(([k, x]) => { veri.i[k] = x === null ? F.deleteField() : x; }); }
    else veri.t = w.t;
    ekle(F.doc(db, ...kok, 'v', id), veri, JSON.stringify(w).length, { id, w });
  });
  kapat();
  bulut.bekleyen += isler.length; durumYaz();
  if (projeKirli.size) setTimeout(projeksiyonYaz, 1500);
  await Promise.all(isler.map(p => p.then(() => { bulut.bekleyen--; bulut.hata = ''; durumYaz(); }, x => { bulut.bekleyen--; bulut.hata = hataMetni(x); bulut.kalici = 'Bazı değişiklikler sunucuya kaydedilemedi (' + bulut.hata + '). Ayarlar › Veri aktarımı’ndan indirip mdSinyal ekibine gönderin.'; console.error(x); durumYaz(); })));
}
// Kaydedilemeyen değişiklikler cihazda saklanır (en çok 30 paket); Ayarlar › Veri aktarımı'ndan indirilir
export const KURTARMA = 'sinyal-kurtarma';
function kurtarmaYaz(icerik, x) {
  try { const l = JSON.parse(localStorage.getItem(KURTARMA) || '[]'); l.unshift({ zaman: new Date().toISOString(), kurs: bulut.kurs, hata: String((x && (x.code || x.message)) || x).slice(0, 200), kayitlar: icerik.map(({ id, w }) => ({ belge: id, a: w.a, ...(w.d ? { i: w.i } : { t: w.t }) })) }); localStorage.setItem(KURTARMA, JSON.stringify(l.slice(0, 30))); } catch (e) { }
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
  if (u.rol === 'usta') return ustaBaglan(u);
  Object.assign(bulut, { kurs: u.kurs, uid: u.uid, ad: u.ad, rol: u.rol, usta: u.usta, eposta: u.eposta, durum: 'baglaniyor' });
  try { localStorage.setItem(YEREL, JSON.stringify(u)); } catch (x) { }
  const { db, F } = fb;
  if (ilkVeri) { bulutVeri(ilkVeri, u.kurs); S.kullanicilar = [{ id: u.uid, ad: u.ad, rol: u.rol }]; await akit(); }
  ilkHazir = new Promise(coz0 => {
    let ilk = true;
    // yeni cihazda ilk veri sunucudan gelmezse giriş ekranı sonsuza kadar beklemesin: oturum kayıtlı, sayfa bir kez yenilenir (önbellekli açılış yolu çalışır)
    const bekci = setTimeout(() => { if (!ilk) return; try { if (!sessionStorage.getItem('sinyal-yeniden')) { sessionStorage.setItem('sinyal-yeniden', '1'); location.reload(); } } catch (x) { } }, 25000);
    const coz = () => { clearTimeout(bekci); try { sessionStorage.removeItem('sinyal-yeniden'); } catch (x) { } coz0(); };
    dinleyiciler.push(F.onSnapshot(F.collection(db, 'kurslar', u.kurs, 'v'), { includeMetadataChanges: true }, q => {
      bulut.durum = q.metadata.fromCache ? 'cevrimdisi' : 'cevrimici';
      if (!q.metadata.fromCache && !sunucuGeldi) { sunucuGeldi = true; if (!ilk) planla(); }
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
  const [t, c] = bulut.kalici ? [bulut.kalici, 'hata'] : bulut.hata ? ['Kaydedilemedi · ' + bulut.hata, 'hata'] : bulut.durum === 'cevrimdisi' ? [bulut.bekleyen ? 'Çevrimdışı · değişiklikler bu cihazda bekliyor' : 'Çevrimdışı', 'uyari'] : bulut.bekleyen ? ['Kaydediliyor…', ''] : ['Kaydedildi', 'tamam'];
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
      if (cakisan) { const eski = h.no, n = await sayacAyir(m[0]); h.no = 'M' + m[0] + '-' + String(n).padStart(5, '0'); islem('Makbuz numarası değişti', eski + ' başka cihazda da verilmişti; yeni numara ' + h.no); import('./ui.js?v=191').then(m => m.bildir(`Makbuz ${eski} çevrimdışıyken verilmişti ve başka cihazdaki makbuzla çakıştı; yeni numarası ${h.no}. Makbuzu verdiyseniz yenisini yazdırın.`, 'uyari')); }
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
  if (u.rol === 'usta') return;  // öğretmen makbuz kesmez, yedek almaz, gelenleri işlemez
  rezervAl(String(new Date().getFullYear()));
  setInterval(makbuzDenetle, 30000); setTimeout(makbuzDenetle, 5000);
  if (['mudur', 'sekreter'].includes(u.rol)) { setTimeout(() => gunlukYedek().catch(x => console.error(x)), 45000); gelenDinle(); ustaGelenDinle(); setTimeout(() => { ustaKirli.add('*'); ustaProjeksiyonYaz(); }, 3000); }
}

// ---- yedek ----
// Her gün ilk açılışta kurs verisinin tam kopyası alınır: (1) Firestore'da kurslar/{kurs}/yedekler (30 gün silinemez),
// (2) ayrı bir yerde, Cloudflare'de (sunucu Google'dan bağımsız). Fotoğraflar ayrı belgede kaldığı için kopyada yalnız işaretleri durur.
export const WORKER = 'https://api.mdsinyal.com';
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
// Saklama: son 31 günün her günü + son 12 ayın her ayının ilk yedeği (ayın sonunda fark edilen hata da geri alınabilsin)
async function eskiYedekleriSil() {
  const { db, F } = fb, sinir = Date.now() - 31 * 864e5, yilSinir = Date.now() - 366 * 864e5;
  const l = await yedekler(), ayIlk = new Set();
  [...l].sort((a, b) => (a.olusturma || 0) - (b.olusturma || 0)).forEach(y => { if (!y.olusturma) return; const ay = y.olusturma.toISOString().slice(0, 7); if (![...ayIlk].some(x => x.startsWith(ay + '|'))) ayIlk.add(ay + '|' + y.id); });
  const aylik = new Set([...ayIlk].map(x => x.split('|')[1]));
  for (const y of l) {
    if (!y.olusturma || y.olusturma.getTime() > sinir) continue;
    if (aylik.has(y.id) && y.olusturma.getTime() > yilSinir) continue;
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
export async function dosyadanGeriYukle(veri, ad) {
  await yedekAl('geri-donus-oncesi');
  const yeni = JSON.parse(JSON.stringify(veri), (k, x) => typeof x === 'string' && x.startsWith(DOSYA_ON) && dosyaVeri.has(x.slice(DOSYA_ON.length)) ? dosyaVeri.get(x.slice(DOSYA_ON.length)) : x);
  Object.keys(S).forEach(k => { if (!HARIC.has(k) && !(k in yeni)) delete S[k]; });
  Object.keys(yeni).forEach(k => { if (!HARIC.has(k)) S[k] = yeni[k]; });
  islem('Yedek dosyasından geri döndü', String(ad || '').slice(0, 80));
  kaydet(); await akit();
  return true;
}
export function yedekIndir(veri, ad) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(veri)], { type: 'application/json' })); a.download = ad; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---- öğrenci paneli: öğrencinin kendi telefonundan girişi ----
// Her öğrenciye tahmin edilemez bir link (kurslar/{kurs}/ogrenciler/{kod}). Belgede yalnız o öğrencinin kayıtları durur;
// öğrencinin yaptıkları (evrak, ders alma/iptal, puan, test) ogrenciGelen'e yazılır, kurs cihazı denetleyip işler.
const projeKirli = new Set(), projeSon = new Map(), islenen = new Map(), sonuclar = new Map();  // sonuclar: öğrenci isteklerinin reddi, öğrencinin ekranına döner
const DIZI_OGR = ['kursiyerler', 'dersler', 'gonderimler'];
function kirlet(a, el, o) {
  const eski = o && o.v ? (() => { try { return JSON.parse(o.v); } catch (x) { return null; } })() : null;
  if (a === 'kursiyerler') { if (el) projeKirli.add(el.id); else if (eski) projeKirli.add(eski.id); }
  else if (a === 'dersler' || a === 'hareket') { [el && el.kursiyer, eski && eski.kursiyer].forEach(k => k && projeKirli.add(k)); if (a === 'dersler') [el, eski].forEach(d => d && d.egitmen && S.kursiyerler.forEach(k => { if (k.panelKod && k.egitmen === d.egitmen && k.id !== d.kursiyer) projeKirli.add(k.id); })); }
  else if (a === 'sinavlar') [el, eski].forEach(x => x && (x.kursiyerler || []).forEach(k => projeKirli.add(k)));
  else if (['teorik', 'gruplar', 'egitmenler', 'araclar', 'bosTeklif', 'subeler'].includes(a)) projeKirli.add('*');
  else if (['avanslar', 'ustaOdemeleri'].includes(a)) { ustaKirli.add('*'); setTimeout(ustaProjeksiyonYaz, 0); }  // öğretmenin kazanç ekranı
}
const sec = (o, l) => { const r = {}; l.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; };
const veriAt = (k, x) => typeof x === 'string' && x.length > DOSYA_SINIR && x.startsWith('data:') ? null : (typeof x === 'string' && x.startsWith(DOSYA_ON) ? null : x);
export function ogrenciVerisi(k) {
  const id = k.id, bugun = iso(new Date());
  const kurs = { ...S.kurs, wpGenel: S.kurs.wp || (S.kurs.waHat && S.kurs.waHat.no) || S.kurs.tel || '' }; ['waApi', 'waApiVarsayilan', 'waHat', 'demoNumara', 'demoKime', 'maliyet', 'kuralDegisen', 'kuralOnay', 'aydinlatma', 'mudurTel', 'onburoTel', 'isletme'].forEach(x => delete kurs[x]);
  const ben = { ...k, tc: k.tc ? '•••••••' + String(k.tc).slice(-4) : '' }; delete ben.notlar; delete ben.panelKod; delete ben.hesap; delete ben.ozelNot; delete ben.ozelNotlar; delete ben.ozelNotTarih;  // özel not yalnız müdürün; öğrenciye gitmez
  return {
    kurs, subeler: (S.subeler || []).filter(x => x.id === k.sube).map(x => sec(x, ['id', 'ad', 'semt'])),
    kursiyerler: [ben],
    // konum ve iz (GPS) öğrenciye gitmez
    dersler: S.dersler.filter(d => d.kursiyer === id).map(d => { const x = { ...d }; delete x.konum; delete x.konumBit; delete x.iz; return x; }).concat(S.dersler.filter(d => d.kursiyer !== id && d.egitmen === k.egitmen && d.tarih >= bugun && d.durum === 'Planlandı').map(d => ({ ...sec(d, ['id', 'egitmen', 'arac', 'tarih', 'saat', 'durum']), kursiyer: null }))),
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
  if (projeKirli.size) { ustaKirli.add('*'); setTimeout(ustaProjeksiyonYaz, 0); }
  if (!bulut.kurs || !fb || !projeKirli.size) return;
  const hepsi = projeKirli.has('*'), ids = new Set(projeKirli); projeKirli.clear();
  const { db, F } = fb;
  for (const k of S.kursiyerler) {
    if (!k.panelKod || (!hepsi && !ids.has(k.id))) continue;
    const v = JSON.stringify(ogrenciVerisi(k), veriAt);
    if (projeSon.get(k.panelKod) === v) continue;
    projeSon.set(k.panelKod, v);
    F.setDoc(F.doc(db, 'kurslar', bulut.kurs, 'ogrenciler', k.panelKod), { kursiyer: k.id, uid: (k.hesap || {}).uid || null, v, islenen: islenen.get(k.id) || [], sonuclar: sonuclar.get(k.id) || [], guncel: F.serverTimestamp() }).catch(x => console.error(x));
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
// Öğrenciden gelen veri personel ekranında gösterilir: HTML karakteri taşıyan metin süzülür, biçimler katı denetlenir
const guvenliVeri = v => typeof v === 'string' ? v.replace(/[<>"'`]/g, '').slice(0, 500) : Array.isArray(v) ? v.slice(0, 2000).map(guvenliVeri)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).slice(0, 2000).map(([a, b]) => [String(a).replace(/[<>"'`]/g, '').slice(0, 80), guvenliVeri(b)]))
  : (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean' || v === null ? v : null;
const DOSYA_BICIM = /^data:(image\/jpeg|image\/png|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/;
const KIMLIK_BICIM = /^[A-Za-z0-9_-]{1,40}$/, TARIH_BICIM = /^\d{4}-\d{2}-\d{2}$/, SAAT_BICIM = /^\d{2}:\d{2}$/;
function ogrenciUygula(docId, g) {
  const k = S.kursiyerler.find(x => x.id === g.kursiyer); if (!k || !Array.isArray(g.d)) return;
  const notlar = [], retler = [], bugun = iso(new Date());
  for (const x of g.d.slice(0, 30)) {
    let y = null; try { y = x.v ? JSON.parse(x.v) : null; } catch (e) { continue; }
    if (x.a === 'kursiyerler' && x.id === k.id && y) {
      ['deneme', 'yanlislar', 'konuAnaliz', 'okunan', 'tekrar', 'gorulen', 'dirCalisma', 'tehlike'].forEach(f => { if (y[f] !== undefined && JSON.stringify(y[f]).length < 50000) k[f] = guvenliVeri(y[f]); });
      ['hesapAktif', 'sonGiris'].forEach(f => { if (typeof y[f] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(y[f]) && y[f] !== k[f]) { k[f] = y[f]; if (f === 'hesapAktif') notlar.push('şifresini belirleyip hesabını kullanmaya başladı'); } });
      Object.entries(y.evrakYuklenen || {}).forEach(([key, e]) => {
        if (!e || !e.veri || !EVRAKLAR.some(z => z[0] === key) || k.evrak[key]) return;
        if (typeof e.veri !== 'string' || e.veri.length > 950000 || !DOSYA_BICIM.test(e.veri)) return;
        k.evrakYuklenen = k.evrakYuklenen || {}; k.evrakYuklenen[key] = { tarih: bugun, dosya: String(e.dosya || '').replace(/[<>"'`]/g, '').slice(0, 120), boyut: e.veri.length, tur: e.veri.startsWith('data:application/pdf') ? 'pdf' : 'resim', veri: e.veri };
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
        if (!y) { if (iptalEdilebilir(d)) { dersIptalIz(d, 'Kursiyer iptal etti (öğrenci paneli)'); S.dersler = S.dersler.filter(z => z !== d); notlar.push(d.tarih + ' ' + d.saat + ' dersini iptal etti'); } else { notlar.push('iptal isteği reddedildi (24 saatten az kaldı)'); retler.push(d.tarih + ' ' + d.saat + ' dersinin iptali yapılamadı: derse 24 saatten az kaldı. Kursu arayın.'); } }
        else if (y.ogrenciPuan && typeof y.ogrenciPuan.puan === 'number' && d.durum === 'Yapıldı') { d.ogrenciPuan = { puan: Math.max(1, Math.min(5, Math.round(y.ogrenciPuan.puan))), yorum: String(y.ogrenciPuan.yorum || '').slice(0, 300), tarih: bugun }; notlar.push('dersi puanladı'); }
        // ders defteri: öğrenci dersi onaylar ya da itiraz eder (bir kez); itiraz müdüre düşer
        if (y && y.ogrenciOnay && ['onay', 'itiraz'].includes(y.ogrenciOnay.durum) && d.durum === 'Yapıldı' && !d.ogrenciOnay) {
          d.ogrenciOnay = { durum: y.ogrenciOnay.durum, not: String(y.ogrenciOnay.not || '').slice(0, 300), tarih: bugun };
          notlar.push(d.tarih + ' ' + d.saat + ' dersini ' + (d.ogrenciOnay.durum === 'onay' ? 'onayladı' : 'itiraz etti' + (d.ogrenciOnay.not ? ': ' + d.ogrenciOnay.not : '')));
          if (d.ogrenciOnay.durum === 'itiraz') (S.devredilen = S.devredilen || []).unshift({ ad: tamAd(k), kanal: 'Ders defteri', konu: 'Ders itirazı', mesaj: d.tarih + ' ' + d.saat + ' dersi yapılmadı diyor' + (d.ogrenciOnay.not ? ': ' + d.ogrenciOnay.not : ''), neden: 'Öğrenci dersi onaylamadı', saat: new Date().toTimeString().slice(0, 5), bildirim: [] });
        }
      } else if (!d && y && KIMLIK_BICIM.test(String(x.id)) && y.kursiyer === k.id && y.durum === 'Planlandı' && TARIH_BICIM.test(y.tarih || '') && SAAT_BICIM.test(y.saat || '') && y.tarih >= bugun && S.egitmenler.some(e => e.id === y.egitmen)) {
        if (S.dersler.some(z => z.tarih === y.tarih && z.saat === y.saat && (z.egitmen === y.egitmen || z.kursiyer === k.id) && z.durum !== 'İptal')) { notlar.push(y.tarih + ' ' + y.saat + ' ders isteği reddedildi: saat dolu'); retler.push(y.tarih + ' ' + y.saat + ' ders isteğin alınamadı: o saat dolmuş. Başka bir saat seç.'); continue; }
        S.dersler.push({ id: String(x.id), kursiyer: k.id, egitmen: y.egitmen, arac: S.araclar.some(a => a.id === y.arac) ? y.arac : null, tarih: y.tarih, saat: y.saat, durum: 'Planlandı', eklendi: bugun, kaynak: 'kursiyer' });
        const t = (S.bosTeklif || []).find(z => z.tarih === y.tarih && z.saat === y.saat && z.egitmen === y.egitmen); if (t) { S.bosTeklif = S.bosTeklif.filter(z => z !== t); S.kazanim.doldurulan++; }
        notlar.push(y.tarih + ' ' + y.saat + ' direksiyon dersi aldı');
      }
    } else if (x.a === 'gonderimler' && y && !x.eski) {
      const m = { zaman: new Date().toISOString(), kime: String(y.kime || '').slice(0, 80), metin: String(y.metin || '').slice(0, 1000), tur: String(y.tur || 'Öğrenci').slice(0, 60) };
      // Öğrenci panelinden tetiklenen bildirim yalnız kurs müdürüne ve öğrencinin kendi ustasına (ya da ders yaptığı ustaya) gider
      const ustalari = new Set([k.egitmen, ...S.dersler.filter(z => z.kursiyer === k.id).map(z => z.egitmen)].filter(Boolean));
      const izinli = y.rol === 'MÜDÜR' || (y.rol === 'HOCA' && S.egitmenler.some(h => h.ad === m.kime && ustalari.has(h.id)));
      S.gonderimler.unshift(m);
      if (!izinli && y.iletilecek) { islem('Öğrenci panelinden izinsiz bildirim engellendi', tamAd(k) + ' → ' + m.kime); continue; }
      if (retler.length && /dersi aldı|dersini iptal etti/.test(m.metin)) continue;  // istek reddedildiyse "ders aldı / iptal etti" bildirimi gitmez
      if (y.iletilecek && S.kurs.waApi) sahiplen('og|' + docId + '|' + x.id).then(ok => { if (ok) import('./ui.js?v=191').then(u => u.apiGonder(u.etiket(m.kime, y.rol || '') + m.metin, undefined, undefined, { ad: m.kime, rol: y.rol || '' }).then(s => { if (!s.ok) { islem('Öğrenci bildirimi gönderilemedi', m.kime + ' · ' + m.tur + ': ' + s.hata); kaydet(); } })); });
    }
  }
  if (notlar.length) islem('Öğrenci panelinden', tamAd(k) + ': ' + notlar.join(', '));
  const l = islenen.get(k.id) || []; l.unshift(docId); islenen.set(k.id, l.slice(0, 20)); projeKirli.add(k.id);
  if (retler.length) { const r = sonuclar.get(k.id) || []; r.unshift({ doc: docId, ret: retler.slice(0, 5), zaman: Date.now() }); sonuclar.set(k.id, r.slice(0, 10)); }
  kaydet(); yenileFn();
}

// Öğrencinin telefonu: kendi belgesini dinler, yaptıklarını kursa gönderir
const ogr = { kurs: null, kod: null, taban: new Map(), bekleyen: [] };
const tabanAl = () => { DIZI_OGR.forEach(a => { const m = new Map(); const l = S[a] || []; kimlikler(l).forEach((id, n) => m.set(id, JSON.stringify(l[n]))); ogr.taban.set(a, m); }); };
function retBildir(kod, l) {
  let gor = []; try { gor = JSON.parse(localStorage.getItem('sinyal-ogr-ret-' + kod) || '[]'); } catch (x) { }
  const yeni = l.filter(r => !gor.includes(r.doc)); if (!yeni.length) return;
  try { localStorage.setItem('sinyal-ogr-ret-' + kod, JSON.stringify([...yeni.map(r => r.doc), ...gor].slice(0, 30))); } catch (x) { }
  import('./ui.js?v=191').then(u => yeni.flatMap(r => r.ret).forEach((m, i) => setTimeout(() => u.bildir(m, 'uyari'), 400 + i * 3500)));
}
function ogrenciKur(veri) {
  const taban = bosVeri({}); delete taban._gun;
  Object.keys(veri).forEach(a => { taban[a] = veri[a]; });
  taban.kullanicilar = []; taban.gonderimler = [];
  bulutVeri(taban, 'ogr-' + ogr.kod);
  // henüz kurs tarafından işlenmemiş kendi değişikliklerini üstüne koy
  ogr.bekleyen.forEach(p => p.d.forEach(x => { const l = S[x.a]; if (!Array.isArray(l)) return; const i = kimlikler(l).indexOf(x.id); if (x.v === null) { if (i >= 0) l.splice(i, 1); } else { const y = JSON.parse(x.v); if (x.a === 'dersler' && i < 0) y.onayBekliyor = true; if (i >= 0) l[i] = y; else l.push(y); } }));
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
      // kursun henüz işlemediği istekler 24 saate kadar "onay bekliyor" olarak görünür; reddedilen istek öğrenciye bir kez bildirilir
      ogr.bekleyen = ogr.bekleyen.filter(p => !isl.has(p.id) && Date.now() - p.t < 864e5);
      try { localStorage.setItem('sinyal-ogr-bekleyen-' + kod, JSON.stringify(ogr.bekleyen.map(p => ({ ...p, d: p.d.map(x => x.v && x.v.length > 20000 ? { ...x, v: null, buyuk: true } : x).filter(x => !x.buyuk) })))); } catch (x) { }
      retBildir(kod, v.sonuclar || []);
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
  if (boyut > 950000) { import('./ui.js?v=191').then(u => u.bildir('Gönderilen belge çok büyük; daha küçük bir fotoğraf dene', 'uyari')); return; }
  const { db, F } = fb;
  try {
    const ref = await F.addDoc(F.collection(db, 'kurslar', ogr.kurs, 'ogrenciGelen'), { kod: ogr.kod, kursiyer: S.kursiyerler[0].id, d, zaman: F.serverTimestamp() });
    ogr.bekleyen.push({ id: ref.id, t: Date.now(), d });
    try { localStorage.setItem('sinyal-ogr-bekleyen-' + ogr.kod, JSON.stringify(ogr.bekleyen.map(p => ({ ...p, d: p.d.map(x => x.v && x.v.length > 20000 ? { ...x, v: null, buyuk: true } : x).filter(x => !x.buyuk) })))); } catch (x) { }
  } catch (x) { console.error(x); import('./ui.js?v=191').then(u => u.bildir('Kursa iletilemedi; internet bağlantını kontrol et', 'uyari')); }
}
export function ogrenciAyril() { try { localStorage.removeItem('sinyal-ogrenci'); } catch (x) { } }

// ---- öğretmen (usta) hesabı: yalnız kendi öğrencileri ve dersleri ----
// Ofis cihazı (müdür / ön büro) her öğretmen için kurslar/{kurs}/ustalar/{öğretmen} belgesini hazırlar; öğretmenin telefonu
// kurs verisinin tamamını değil yalnız bu belgeyi okur. Öğretmenin yaptıkları (ders başlat/bitir, imza, not, deneme) ustaGelen'e
// yazılır, ofis cihazı denetleyip kayda işler. Kendi telefonunda değişiklik hemen görünür; ofiste mdSinyal açık değilse kayda sonra geçer.
const DIZI_USTA = ['dersler', 'kursiyerler', 'gonderimler', 'imzaTalepleri', 'dersIptaller', 'islemler'];
const KURSIYER_USTA = ['id', 'no', 'ad', 'soyad', 'tel', 'foto', 'sinif', 'asama', 'egitmen', 'sube', 'kapali', 'direksiyon', 'teorik', 'deneme', 'dDeneme', 'esinav', 'dsinav', 'kayit', 'teorikGrup', 'mevcutEhliyet', 'ekDersHakki', 'cinsiyet'];
const DERS_KORUNAN = new Set(['id', 'kursiyer', 'egitmen', 'tarih', 'saat', 'arac', 'meb', 'mebDegisti', 'ogrenciOnay', 'ogrenciPuan', 'tur', 'kaynak', 'eklendi', 'onayBekliyor']);
const ustaKirli = new Set(), ustaSon = new Map(), ustaIslenen = new Map();
export function ustaVerisi(egId, gunSiniri = 180) {
  const bugun = iso(new Date()), eski = iso(new Date(Date.now() - gunSiniri * 864e5));
  // kendi dersleri; bugünden eskilerinin konum izi gönderilmez (belge küçük kalsın)
  const benim = S.dersler.filter(d => d.egitmen === egId && (d.tarih >= eski || d.durum === 'Planlandı')).map(d => { if (d.tarih >= bugun) return d; const x = { ...d }; delete x.iz; delete x.konum; delete x.konumBit; return x; });
  const kIds = new Set([...S.kursiyerler.filter(k => k.egitmen === egId && !k.kapali).map(k => k.id), ...benim.map(d => d.kursiyer)]);
  // öğrencilerinin başka öğretmenle yaptığı dersler: ders sayısı ve risk için gerekir (konum, imza, not olmadan)
  const diger = S.dersler.filter(d => d.egitmen !== egId && kIds.has(d.kursiyer)).map(d => sec(d, ['id', 'kursiyer', 'egitmen', 'arac', 'tarih', 'saat', 'durum', 'tur', 'beceri', 'sure', 'bas', 'bit']));
  const kurs = { ...S.kurs }; ['maliyet', 'isletme', 'aydinlatma', 'kuralDegisen', 'kuralOnay', 'ucretOnay'].forEach(x => delete kurs[x]);
  return {
    kurs, imzaAnahtari: S.imzaAnahtari || null, subeler: S.subeler || [], gruplar: S.gruplar || [],
    egitmenler: S.egitmenler.map(x => x.id === egId ? x : sec(x, ['id', 'ad', 'renk', 'siniflar', 'sube', 'sinif', 'tel'])),
    araclar: S.araclar || [], ogretmenler: (S.ogretmenler || []).map(x => sec(x, ['id', 'ad'])),
    teorik: (S.teorik || []).map(t => sec(t, ['id', 'tarih', 'saat', 'sure', 'konu', 'salon', 'grup', 'ogretmen'])),
    // ödeme ve evrak öğretmene gitmez; uygulama yapısı bozulmasın diye boş alan konur (ofis bu alanları öğretmenden almaz)
    kursiyerler: S.kursiyerler.filter(k => kIds.has(k.id)).map(k => ({ ...sec(k, KURSIYER_USTA), notlar: [], evrak: {}, odeme: { toplam: 0, pesin: 0, taksitler: [], ekler: [] } })),
    dersler: benim.concat(diger),
    sinavlar: S.sinavlar.filter(x => (x.kursiyerler || []).some(k => kIds.has(k))).map(x => ({ ...x, kursiyerler: x.kursiyerler.filter(k => kIds.has(k)), sonuc: x.sonuc ? Object.fromEntries(Object.entries(x.sonuc).filter(([k]) => kIds.has(k))) : x.sonuc })),
    bosTeklif: (S.bosTeklif || []).filter(t => t.egitmen === egId),
    // kendi kazancı: yalnız kendi avansları ve kendisine yapılan ödemeler
    avanslar: (S.avanslar || []).filter(a => a.kim === (S.egitmenler.find(x => x.id === egId) || {}).ad),
    ustaOdemeleri: (S.ustaOdemeleri || []).filter(o => o.egitmen === egId),
    imzaTalepleri: (S.imzaTalepleri || []).filter(t => kIds.has(t.kursiyer)).map(t => { const x = { ...t }; delete x.metin; return x; }),
    entegrasyon: { kdv: (S.entegrasyon || {}).kdv, earsiv: { bagli: false }, muhasebe: {}, musavir: {} },
  };
}
async function ustaProjeksiyonYaz() {
  if (!bulut.kurs || !fb || !['mudur', 'sekreter'].includes(bulut.rol) || !ustaKirli.size || !sunucuGeldi) return;
  ustaKirli.clear();
  const { db, F } = fb;
  const ustalar = new Set((S.kullanicilar || []).filter(u => u.rol === 'usta' && u.usta).map(u => u.usta));
  for (const egId of ustalar) {
    if (!S.egitmenler.some(x => x.id === egId)) continue;
    let v = JSON.stringify(ustaVerisi(egId), veriAt);
    if (v.length > 900000) v = JSON.stringify(ustaVerisi(egId, 45), veriAt);
    const isl = ustaIslenen.get(egId) || [], anahtar = v + '|' + isl.join(',');
    if (ustaSon.get(egId) === anahtar) continue;
    ustaSon.set(egId, anahtar);
    F.setDoc(F.doc(db, 'kurslar', bulut.kurs, 'ustalar', egId), { v, islenen: isl, guncel: F.serverTimestamp() }).catch(x => { ustaSon.delete(egId); console.error(x); });
  }
}
// Ofis cihazı: öğretmenden gelenleri işler (aynı kaydı iki cihaz işlemesin diye işlem içinde silinir)
function ustaGelenDinle() {
  const { db, F } = fb;
  dinleyiciler.push(F.onSnapshot(F.collection(db, 'kurslar', bulut.kurs, 'ustaGelen'), q => {
    q.docChanges().filter(c => c.type === 'added').forEach(c => {
      F.runTransaction(db, async t => { const d = await t.get(c.doc.ref); if (!d.exists()) return null; t.delete(c.doc.ref); return d.data(); })
        .then(v => { if (v) ustaUygula(c.doc.id, v); }).catch(x => console.error(x));
    });
  }, () => { }));
}
function ustaUygula(docId, g) {
  const egId = g.usta; if (!S.egitmenler.some(x => x.id === egId) || !Array.isArray(g.d)) return;
  const benimMi = k => k && (k.egitmen === egId || S.dersler.some(d => d.kursiyer === k.id && d.egitmen === egId));
  for (const x of g.d.slice(0, 300)) {
    let y = null; try { y = x.v ? JSON.parse(x.v) : null; } catch (e) { continue; }
    if (x.a === 'dersler') {
      const d = S.dersler.find(z => z.id === x.id);
      if (!d || d.egitmen !== egId) continue;
      if (!y) { if (d.durum === 'Planlandı') S.dersler = S.dersler.filter(z => z !== d); continue; }  // öğretmen iptali; iz kaydı dersIptaller'le gelir
      if (y.durum && !['Planlandı', 'Yapıldı', 'Gelmedi'].includes(y.durum)) continue;
      Object.keys(y).forEach(f => {
        if (DERS_KORUNAN.has(f)) return; const v = y[f];
        // imza resimleri öğretmene gönderilmez (null gelir): var olan imza silinmez
        if (f === 'imza') { if (v && typeof v === 'object') { const i = { ...(d.imza || {}) }; Object.entries(v).forEach(([a, b]) => { if (b != null || !(a in i)) i[a] = b; }); d.imza = i; } return; }
        if (f === 'iz') { if (Array.isArray(v) && v.length >= (d.iz || []).length) d.iz = v; return; }
        if (['konum', 'konumBit'].includes(f) && v == null && d[f]) return;
        d[f] = v;
      });
    } else if (x.a === 'kursiyerler' && y) {
      const k = S.kursiyerler.find(z => z.id === x.id); if (!benimMi(k)) continue;
      (y.notlar || []).slice(0, 50).forEach(n => { if (n && typeof n.metin === 'string' && !(k.notlar || []).some(m => m.tarih === n.tarih && m.metin === n.metin)) (k.notlar = k.notlar || []).unshift({ tarih: String(n.tarih || '').slice(0, 10), metin: n.metin.slice(0, 500) }); });
      if (Array.isArray(y.dDeneme) && y.dDeneme.length > (k.dDeneme || []).length) k.dDeneme = y.dDeneme.slice(-100);
    } else if (x.a === 'imzaTalepleri' && y) {
      if (!benimMi(S.kursiyerler.find(z => z.id === y.kursiyer))) continue;
      const i = (S.imzaTalepleri = S.imzaTalepleri || []).findIndex(t => t.id === y.id);
      if (i < 0) S.imzaTalepleri.push(y); else if (S.imzaTalepleri[i].durum === 'bekliyor') S.imzaTalepleri[i] = { ...S.imzaTalepleri[i], ...y };
    } else if (['gonderimler', 'islemler', 'dersIptaller'].includes(x.a) && y) {
      if (x.a === 'dersIptaller' && y.egitmen !== egId) continue;
      (S[x.a] = S[x.a] || []).unshift(y);
    }
  }
  const l = ustaIslenen.get(egId) || []; l.unshift(docId); ustaIslenen.set(egId, l.slice(0, 30)); ustaKirli.add(egId);
  kaydet(); yenileFn(); setTimeout(ustaProjeksiyonYaz, 1500);
}

// Öğretmenin telefonu
const ust = { kurs: null, usta: null, uid: null, taban: new Map(), bekleyen: [], zaman: null, kurulu: false };
const BEKLEYEN_USTA = () => 'sinyal-usta-bekleyen-' + ust.usta;
const ustaTabanAl = () => { DIZI_USTA.forEach(a => { const m = new Map(); const l = S[a] || []; kimlikler(l).forEach((id, n) => m.set(id, JSON.stringify(l[n]))); ust.taban.set(a, m); }); };
function ustaBekleyenYaz() { try { localStorage.setItem(BEKLEYEN_USTA(), JSON.stringify(ust.bekleyen.map(p => ({ id: p.id, t: p.t, d: p.d })))); } catch (x) { } }
function ustaKur(veri, u) {
  // açık pencereler (ör. "Dersi bitir") eski nesneyi tutar: aynı kayıtlar yerinde güncellenir, öğretmenin girdiği bilgi kaybolmaz
  const onceki = S && S._bulut && ust.kurulu ? new Map(['dersler', 'kursiyerler'].map(a => [a, new Map((S[a] || []).map(o => [o.id, o]))])) : null;
  const taban = bosVeri({}); delete taban._gun;
  Object.keys(veri || {}).forEach(a => { taban[a] = veri[a]; });
  ['gonderimler', 'islemler', 'dersIptaller'].forEach(a => { taban[a] = []; });
  bulutVeri(taban, 'usta-' + u.usta);
  S.kullanicilar = [{ id: u.uid, ad: u.ad, rol: 'usta', usta: u.usta }];
  // ofisin henüz işlemediği kendi değişikliklerini üstüne koy
  ust.bekleyen.forEach(p => p.d.forEach(x => { const l = S[x.a]; if (!Array.isArray(l) || ['gonderimler', 'islemler', 'dersIptaller'].includes(x.a)) return; const i = kimlikler(l).indexOf(x.id); if (x.v === null) { if (i >= 0) l.splice(i, 1); } else { let y; try { y = JSON.parse(x.v); } catch (e) { return; } if (i >= 0) l[i] = y; else l.push(y); } }));
  if (onceki) ['dersler', 'kursiyerler'].forEach(a => { const m = onceki.get(a); S[a] = (S[a] || []).map(o => { const e = m.get(o.id); if (!e || e === o) return o; Object.keys(e).forEach(k => delete e[k]); Object.assign(e, o); return e; }); });
  ust.kurulu = true;
  ustaTabanAl();
}
async function ustaBaglan(u) {
  const { db, F } = fb;
  Object.assign(bulut, { kurs: u.kurs, uid: u.uid, ad: u.ad, rol: 'usta', usta: u.usta, eposta: u.eposta, durum: 'baglaniyor' });
  try { localStorage.setItem(YEREL, JSON.stringify(u)); } catch (x) { }
  // eski sürümde bu cihazın önbelleğine kurs verisinin tamamı inmişti: bir kez silinir
  try { if (!localStorage.getItem('sinyal-usta-onbellek')) { localStorage.setItem('sinyal-usta-onbellek', '1'); await onbellekSil(); location.reload(); return new Promise(() => { }); } } catch (x) { }
  Object.assign(ust, { kurs: u.kurs, usta: u.usta, uid: u.uid });
  try { ust.bekleyen = JSON.parse(localStorage.getItem(BEKLEYEN_USTA()) || '[]').filter(p => Date.now() - p.t < 7 * 864e5); } catch (x) { ust.bekleyen = []; }
  if (!u.usta) { ustaKur({}, u); kaydetDinle(ustaPlanla); return { id: u.uid, ad: u.ad, rol: 'usta', bulut: true }; }
  await new Promise(coz => {
    let ilk = true;
    const bitir = () => { if (ilk) { ilk = false; kaydetDinle(ustaPlanla); coz(); } else yenileFn(); };
    dinleyiciler.push(F.onSnapshot(F.doc(db, 'kurslar', u.kurs, 'ustalar', u.usta), { includeMetadataChanges: true }, d => {
      bulut.durum = d.metadata.fromCache ? 'cevrimdisi' : 'cevrimici';
      if (d.metadata.hasPendingWrites) return;
      if (!d.exists()) { if (d.metadata.fromCache && ilk) return; bulut.hata = ''; bulut.kalici = 'Dersleriniz kurs bilgisayarında mdSinyal açılınca burada görünecek'; ustaKur({}, u); bitir(); durumYaz(); return; }
      bulut.kalici = '';
      if (ust.zaman) ustaGonder();  // henüz gönderilmemiş değişiklik: önce ayrılır, sonra üstüne konur
      const v = d.data(), isl = new Set(v.islenen || []);
      ust.bekleyen = ust.bekleyen.filter(p => !(p.id && isl.has(p.id)) && Date.now() - p.t < 7 * 864e5); ustaBekleyenYaz();
      let veri = {}; try { veri = JSON.parse(v.v); } catch (x) { }
      ustaKur(veri, u); bitir(); durumYaz();
    }, x => { bulut.durum = 'hata'; bulut.hata = hataMetni(x); console.error(x); ustaKur({}, u); bitir(); durumYaz(); }));
  });
  // hesabı kapatılan ya da rolü değişen öğretmen çıkarılır
  dinleyiciler.push(F.onSnapshot(F.doc(db, 'kurslar', u.kurs, 'uyeler', u.uid), d => {
    if (!d.exists()) { cikisYap().then(() => location.reload()); return; }
    const ben = d.data(); if (ben.rol !== 'usta' || (ben.usta || null) !== (u.usta || null)) location.reload();
  }, () => { }));
  kancalariKur(u);
  addEventListener('pagehide', () => { ustaGonder(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') ustaGonder(); });
  return { id: u.uid, ad: u.ad, rol: 'usta', usta: u.usta, bulut: true };
}
function ustaPlanla() { clearTimeout(ust.zaman); ust.zaman = setTimeout(ustaGonder, 600); }
async function ustaGonder() {
  clearTimeout(ust.zaman); ust.zaman = null;
  if (!fb || !ust.kurs || !ust.usta) return;
  ust.bekleyen.filter(p => !p.id && !p.gidiyor).forEach(p => ustaYolla(p));  // önceden gönderilemeyenler yeniden denenir
  const d = [];
  DIZI_USTA.forEach(a => {
    const eski = ust.taban.get(a) || new Map(), l = S[a] || [], ids = kimlikler(l), gor = new Set();
    ids.forEach((id, n) => { gor.add(id); const j = JSON.stringify(l[n]); if (eski.get(id) !== j) d.push({ a, id, v: j }); });
    if (a === 'dersler') eski.forEach((j, id) => { if (!gor.has(id)) d.push({ a, id, v: null }); });
  });
  if (!d.length) return;
  ustaTabanAl();
  if (JSON.stringify(d).length > 950000) { bulut.kalici = 'Gönderilecek veri çok büyük; kurs müdürüne haber verin'; durumYaz(); return; }
  const p = { id: null, t: Date.now(), d }; ust.bekleyen.push(p); ustaBekleyenYaz();
  await ustaYolla(p);
}
async function ustaYolla(p) {
  const { db, F } = fb;
  p.gidiyor = true; bulut.bekleyen++; durumYaz();
  try {
    const ref = await F.addDoc(F.collection(db, 'kurslar', ust.kurs, 'ustaGelen'), { usta: ust.usta, uid: ust.uid, d: p.d, zaman: F.serverTimestamp() });
    p.id = ref.id; bulut.hata = '';
  } catch (x) { console.error(x); bulut.hata = hataMetni(x); if (!p.kurtarma) { p.kurtarma = true; kurtarmaYaz(p.d.map(z => ({ id: 'ustaGelen', w: { a: z.a, d: true, i: { [z.id]: z.v } } })), x); } }
  p.gidiyor = false; ustaBekleyenYaz(); bulut.bekleyen--; durumYaz();
}

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
    // öğrenci girişi bu cihazdaki personel oturumunun yerini alır
    try { const u = await ogrenciUyelik((await A.signInWithEmailAndPassword(auth, a, sifre)).user); try { localStorage.removeItem(YEREL); } catch (z) { } return u; }
    catch (x) { if (x.kullanici || x.code === 'auth/too-many-requests' || x.code === 'auth/network-request-failed') throw x; son = x; }
  }
  throw hata('Telefon numarası ya da şifre hatalı');
}
// Giriş ekranı açılınca Firebase arka planda hazırlanır; öğrenci yazarken iner
export const sdkHazirla = () => { sdk().catch(() => { }); };
// Yeniden açılışta son görülen panel hemen çizilir; güncel veri bağlantı kurulunca gelir
export function ogrenciOnbellek(kod) {
  try { const v = JSON.parse(localStorage.getItem('sinyal-bulut-ogr-' + kod) || 'null'); if (!v || !v.kursiyerler || !v.kursiyerler[0]) return null; bulutVeri(v, 'ogr-' + kod); tabanAl(); return S.kursiyerler[0]; } catch (x) { return null; }
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
  yerelTemizle(); await onbellekSil();
}
// şifresini unutan öğrenci: talep kursa düşer, kurs yeni geçici şifre gönderir
export async function ogrenciSifreTalep(telGiris) {
  const tel = telNorm(telGiris); if (!tel) throw hata('Önce cep telefonu numaranızı yazın');
  const { db, F } = await sdk();
  const t = await F.getDoc(F.doc(db, 'telefonlar', tel));
  if (!t.exists() || !Object.keys(t.data().h || {}).length) throw hata('Bu numarayla açılmış öğrenci hesabı yok');
  await F.setDoc(F.doc(db, 'kurslar', t.data().k, 'sifreTalep', tel), { zaman: F.serverTimestamp() });
}
