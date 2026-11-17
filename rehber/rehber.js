// Sürücü Kursu Rehberi: SSS sayfasında arama, bağlantıyla gelinen sorunun açık gelmesi (arac/mevzuat/rehber-site.mjs üretir)
(() => {
  const ac = () => { const id = decodeURIComponent(location.hash.slice(1)); const x = id && document.getElementById(id); if (x && x.tagName === 'DETAILS') { x.open = true; x.scrollIntoView({ block: 'start' }); } };
  ac(); window.addEventListener('hashchange', ac);
})();
(() => {
  const d = document, kap = d.querySelector('[data-st-rh-sss]'), ara = d.querySelector('[data-st-rh-ara]');
  if (!kap || !ara) return;
  const bos = d.querySelector('[data-st-rh-bos]');
  const kucuk = s => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/i̇/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[’']/g, '');
  const kartlar = [...kap.querySelectorAll('[data-st-rh-cv]')].map(k => ({ k, m: kucuk(k.textContent) }));
  const gruplar = [...kap.querySelectorAll('[data-st-rh-grup]')];
  ara.addEventListener('input', () => {
    const q = kucuk(ara.value.trim()).split(/\s+/).filter(Boolean); let n = 0;
    kartlar.forEach(({ k, m }) => { const u = q.every(w => m.includes(w)); k.hidden = !u; if (u) n++; });
    if (q.length && n <= 3) kartlar.forEach(({ k }) => { if (!k.hidden) k.open = true; });
    gruplar.forEach(g => { g.hidden = !g.querySelector('[data-st-rh-cv]:not([hidden])'); });
    if (bos) bos.hidden = n > 0;
  });
})();
