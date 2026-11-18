// Sürücü Kursu Rehberi: bağlantıyla gelinen sorunun açık gelmesi, SSS ve konu araması, "asistana sor" kutusu (arac/mevzuat/rehber-site.mjs üretir)
(() => {
  const d = document;
  const ac = () => { const id = decodeURIComponent(location.hash.slice(1)); const x = id && d.getElementById(id); if (x && x.tagName === 'DETAILS') { x.open = true; x.scrollIntoView({ block: 'start' }); } };
  ac(); window.addEventListener('hashchange', ac);
  const kucuk = s => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/i̇/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[’']/g, '');
  const kelimeler = v => kucuk(v.trim()).split(/\s+/).filter(Boolean);
  // Türkçe ses düşmesi ve ek: "nakil" → "nakl" (nakli), "dersi" → "ders"; kelime biçimlerinden biri geçiyorsa eşleşir
  const bicimler = w => [...new Set([w, w.replace(/([aeiou])([^aeiou])$/, '$2'), w.length >= 5 ? w.slice(0, -1) : w])];
  const uyar = (m, q) => q.every(w => bicimler(w).some(b => m.includes(b)));

  // asistana sor: demoda mevzuat asistanı bu soruyla açılır
  d.querySelectorAll('[data-st-rh-sor]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const q = f.querySelector('input').value.trim() || f.dataset.ornek || '';
    location.href = f.dataset.kok + '#/demo' + (q ? '?mevzuat=' + encodeURIComponent(q) : '');
  }));

  // SSS sayfası
  const kap = d.querySelector('[data-st-rh-sss]'), ara = d.querySelector('[data-st-rh-ara]');
  if (kap && ara) {
    const bos = d.querySelector('[data-st-rh-bos]');
    const kartlar = [...kap.querySelectorAll('[data-st-rh-cv]')].map(k => ({ k, m: kucuk(k.textContent) }));
    const gruplar = [...kap.querySelectorAll('[data-st-rh-grup]')];
    ara.addEventListener('input', () => {
      const q = kelimeler(ara.value); let n = 0;
      kartlar.forEach(({ k, m }) => { const u = uyar(m, q); k.hidden = !u; if (u) n++; });
      if (q.length && n <= 3) kartlar.forEach(({ k }) => { if (!k.hidden) k.open = true; });
      gruplar.forEach(g => { g.hidden = !g.querySelector('[data-st-rh-cv]:not([hidden])'); });
      if (bos) bos.hidden = n > 0;
    });
  }

  // rehber ana sayfası: konu süzgeci
  const suz = d.querySelector('[data-st-rh-suz]');
  if (suz) {
    const satirlar = [...d.querySelectorAll('[data-st-rh-m]')].map(s => ({ s, m: s.dataset.stRhM + ' ' + kucuk(s.textContent) }));
    const duraklar = [...d.querySelectorAll('[data-st-rh-durak]')], bos2 = d.querySelector('[data-st-rh-bos2]');
    suz.addEventListener('input', () => {
      const q = kelimeler(suz.value); let n = 0;
      satirlar.forEach(({ s, m }) => { const u = uyar(m, q); s.hidden = !u; if (u) n++; });
      duraklar.forEach(x => { x.hidden = !x.querySelector('[data-st-rh-m]:not([hidden])'); });
      d.querySelectorAll('.st-rh-yol').forEach(y => { const b = y.closest('section'); if (b) b.hidden = !y.querySelector('[data-st-rh-durak]:not([hidden])'); });
      if (bos2) bos2.hidden = n > 0;
    });
  }
})();
