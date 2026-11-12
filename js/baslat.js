// Uygulama kodu ana sayfayı bekletmesin: oturum, uygulama içi adres ya da kayıtlı hesap varsa hemen; yoksa ilk dokunuşta ya da sayfa boşta kalınca iner.
// Yazı tipleri ve uygulama stili engellemeden yüklenir (satır içi onload yerine; içerik güvenlik politikası satır içi koda izin vermez)
// yazı tipleri artık kendi sunucumuzdan, normal stil dosyası olarak yüklenir (css/fonts.css)
const css = document.getElementById('app-css');
const cssHazir = () => new Promise(r => { if (css.media === 'all' && css.sheet) return r(); css.media = 'all'; css.addEventListener('load', r, { once: true }); setTimeout(r, 5000); });
// Açılış animasyonu yalnız yükleme sürdüğü kadar görünür (yapay bekleme yok); uygulama kodu önceden indirilir (modulepreload)
const acilisBekle = () => Promise.resolve();
const onYukle = () => { try { const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = 'js/app.js?v=178'; document.head.appendChild(l); } catch (e) { } };
const yukle = () => window.__uyg || (window.__uyg = (onYukle(), Promise.all([cssHazir(), acilisBekle()])).then(() => import('./app.js?v=178')).then(m => { window.__hazir = true; return m; }));
let hemen = true;
try { hemen = /^#\/./.test(location.hash) || !!(sessionStorage.getItem('sinyal-oturum') || sessionStorage.getItem('sinyal-kapandi') || localStorage.getItem('sinyal-bulut') || localStorage.getItem('sinyal-ogrenci')); } catch (e) { }
if (hemen) yukle();
else {
  // tanıtımdaki düğme ya da uygulama linki: önce kod iner, sonra aynı dokunuş uygulamaya iletilir
  document.addEventListener('click', ev => {
    if (window.__hazir) return;
    const b = ev.target.closest('[data-demo], [data-giris], a[href^="#/"]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    b.setAttribute('aria-busy', 'true'); b.classList.add('w-yukleniyor');
    yukle().then(() => setTimeout(() => { b.removeAttribute('aria-busy'); b.classList.remove('w-yukleniyor'); b.click(); }, 30));
  }, true);
  addEventListener('load', () => { const n = navigator.connection; if (n && n.saveData) return; setTimeout(() => (window.requestIdleCallback || (f => f()))(() => yukle()), 3000); }, { once: true });
}
