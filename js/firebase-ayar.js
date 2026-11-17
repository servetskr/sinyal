// Firebase web uygulaması ayarları (proje: sinyal-5d37a).
// Bu değerler gizli değildir; erişimi Firestore güvenlik kuralları ve kullanıcı girişi korur.
const CANLI = {
  apiKey: 'AIzaSyDbcCLYjyvOBQgUNErTMHtWCCIVJulQ7F4',
  authDomain: 'sinyal-5d37a.firebaseapp.com',
  projectId: 'sinyal-5d37a',
  storageBucket: 'sinyal-5d37a.firebasestorage.app',
  messagingSenderId: '451344576006',
  appId: '1:451344576006:web:8012914abf2815bc9c9d87',
};

// Geliştirici yolu: yerel Firebase Emulator Suite (sinyal-kaynak/arac/senkron, belgeler/senkron-testi.md).
// YALNIZ adres http://localhost ya da http://127.0.0.1 iken VE açık işaret varken (?emu=1 bir kez yazılınca sekmede kalır ya da
// localStorage 'sinyal-emu' = '1') devreye girer. Başka her adreste (mdsinyal.com, *.pages.dev, https, IP) EMU null kalır, canlı ayar
// değişmeden kullanılır. Proje kimliği 'demo-' önekli: emülatör bunu gerçek projeye hiç bağlamaz; bağlantı adresi sayfanın kendi yerel kökenidir.
function emuBul() {
  try {
    const h = location.hostname;
    if (location.protocol !== 'http:' || (h !== 'localhost' && h !== '127.0.0.1')) return null;
    let acik = false;
    if (new URLSearchParams(location.search).get('emu') === '1') { acik = true; try { sessionStorage.setItem('sinyal-emu', '1'); } catch (x) { } }
    try { if (sessionStorage.getItem('sinyal-emu') === '1' || localStorage.getItem('sinyal-emu') === '1') acik = true; } catch (x) { }
    if (!acik) return null;
    // emülatöre aynı kökenden gidilir (sinyal-kaynak/arac/senkron/sunucu.mjs vekili): index.html CSP'si connect-src 'self' dışında yerel adrese izin vermez
    return Object.freeze({ proje: 'demo-sinyal', auth: location.origin, fsHost: h, fsPort: +location.port || 80 });
  } catch (x) { return null; }
}
export const EMU = emuBul();
export const FIREBASE = EMU
  ? { apiKey: 'demo-anahtar', authDomain: EMU.proje + '.firebaseapp.com', projectId: EMU.proje, storageBucket: '', messagingSenderId: '0', appId: '1:0:web:0' }
  : CANLI;
// Emülatöre bağlama: bulut.js her initializeApp'ten sonra çağırır (ana uygulama ve öğrenci hesabı açarken kullanılan ikinci uygulama).
export function emuBagla(A, F, auth, db) {
  if (!EMU) return;
  if (auth && !auth.emulatorConfig) A.connectAuthEmulator(auth, EMU.auth, { disableWarnings: true });
  if (db) { try { F.connectFirestoreEmulator(db, EMU.fsHost, EMU.fsPort); } catch (x) { } }
}
