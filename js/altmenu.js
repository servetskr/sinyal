// DIG-057: bağlama göre alt menü. Her genişlikte görünen, o ekrana özel en çok 5 kısayol; sayılar rozetle.
// Sayfa geçişleri yan menüde (drawer) kalır; bu çubuk açık ekranın işlerine kısayoldur. Ekran kendi baglan(kap) içinde goster() çağırır;
// sayfa değişip kap belgeden çıkınca çubuk kendiliğinden kalkar ve genel alt menü (telefonda) geri gelir.
// Kısayol: { id, ad, kisa?, ik, rozet?, acil?, nokta?, hedef? (#/… adres), kaydir? (bu sayfada seçici), eylem? (fonksiyon), baslik? }
import { e, ik } from './ui.js?v=235';

let aktif = null;   // { kap, l, secili }
let gozcu = null;

const kalkar = () => { if (aktif && !(aktif.kap && aktif.kap.isConnected)) kaldir(); };
function gozle() {
  if (gozcu) return;
  const yer = document.getElementById('icerik'); if (!yer) return;
  // sayfa çizimi içeriği değiştirir, yeni ekranın baglan'ı aynı görevde çalışır; gözcü sonra bakar: kap yoksa çubuk kalkar
  gozcu = new MutationObserver(kalkar); gozcu.observe(yer, { childList: true });
  addEventListener('hashchange', () => setTimeout(kalkar, 0));
}

export function kaldir() {
  aktif = null;
  const n = document.querySelector('.am-cubuk'); if (n) n.remove();
  document.body.classList.remove('am-var');
}

const rozetMetni = n => n > 99 ? '99+' : String(n);

export function goster(kap, l, { secili = '', etiket = 'Bu ekranın kısayolları' } = {}) {
  l = (l || []).slice(0, 5);
  aktif = { kap, l, secili };
  let n = document.querySelector('.am-cubuk');
  if (!n) { n = document.createElement('nav'); n.className = 'am-cubuk'; document.body.appendChild(n); n.addEventListener('click', tik); }
  n.setAttribute('aria-label', etiket);
  n.innerHTML = `<div class="am-ic">${l.map((x, i) => {
    const r = +x.rozet > 0 ? `<b class="am-rozet${x.acil ? ' am-acil' : ''}" aria-hidden="true">${rozetMetni(+x.rozet)}</b>` : x.nokta ? '<i class="am-nokta" aria-hidden="true"></i>' : '';
    const ar = `${x.ad}${+x.rozet > 0 ? ` (${x.rozet}${x.acil ? ', süresi geçen var' : ''})` : ''}`;
    return `<button type="button" class="am-k${x.id === secili ? ' am-secili' : ''}" data-am="${i}" aria-label="${e(ar)}" title="${e((x.baslik || x.ad) + ' · Alt+' + (i + 1))}"${x.id === secili ? ' aria-current="page"' : ''}>
      <span class="am-ik">${ik(x.ik)}</span><span class="am-ad"><span class="am-uzun">${e(x.ad)}</span><span class="am-kisa">${e(x.kisa || x.ad)}</span></span>${r}</button>`; }).join('')}</div>`;
  document.body.classList.add('am-var');
  gozle();
}

function calistir(x) {
  if (!x) return;
  // telefonda yan menü açıksa kapanır (kısayol bu ekranda iş görür)
  const yan = document.getElementById('yan'); if (yan && yan.classList.contains('acik')) { const p = document.querySelector('.yan-perde'); if (p) p.click(); else yan.classList.remove('acik'); }
  if (x.eylem) return x.eylem();
  const git = () => { if (!x.kaydir) return window.scrollTo({ top: 0, behavior: 'smooth' }); const el = document.querySelector(x.kaydir); if (!el) return;
    const ust = (document.querySelector('.ust') || {}).offsetHeight || 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - ust - 12, behavior: 'smooth' });
    document.querySelectorAll(x.kaydir).forEach(y => { y.classList.remove('am-vurgu'); void y.offsetWidth; y.classList.add('am-vurgu'); }); };
  if (x.hedef && location.hash !== x.hedef) { location.hash = x.hedef; setTimeout(git, 120); } else git();
}
function tik(ev) {
  const b = ev.target.closest('[data-am]'); if (!b || !aktif) return;
  calistir(aktif.l[+b.dataset.am]);
}
// Alt+1…5: yazı alanında değilken kısayolu çalıştırır
addEventListener('keydown', ev => {
  if (!aktif || !ev.altKey || ev.ctrlKey || ev.metaKey) return;
  const t = ev.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  const m = /^Digit([1-5])$/.exec(ev.code || ''); if (!m || document.querySelector('.perde')) return;
  ev.preventDefault(); calistir(aktif.l[+m[1] - 1]);
});
