// Sinyal tanıtım sitesi: telefonda menü, beliren bölümler, Özellikler alt menüsü, SSS süzgeci ve arama, İletişim formu (WhatsApp'a hazır mesaj)
(() => {
  const d = document, kok = d.documentElement;
  // telefonda menü (ana sayfada tanıtım bölümü yeniden çizilebildiği için olay belgeye bağlı)
  const ac = acik => { const menu = d.getElementById('st-menu'), dg = d.querySelector('[data-st-menu]'); if (!menu) return; menu.classList.toggle('acik', acik); if (dg) dg.setAttribute('aria-expanded', acik); d.body.classList.toggle('st-menu-acik', acik); };
  d.addEventListener('click', ev => {
    if (ev.target.closest('[data-st-menu]')) { const m = d.getElementById('st-menu'); return ac(!(m && m.classList.contains('acik'))); }
    if (ev.target.closest('#st-menu a, #st-menu button')) ac(false);
  });
  d.addEventListener('keydown', ev => { if (ev.key === 'Escape') ac(false); });
  matchMedia('(min-width:901px)').addEventListener('change', m => { if (m.matches) ac(false); });
  // bölümler göründükçe yumuşak belirme (hareket azaltma tercihinde kapalı)
  const gor = d.querySelectorAll('[data-st-gor]');
  if (gor.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // ilk ekranda görünenler hemen görünür (açılışta boş alan kalmasın); yalnız aşağıdakiler kaydırınca belirir
    const io = new IntersectionObserver(l => l.forEach(x => { if (x.isIntersecting) { x.target.classList.add('gorundu'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
    gor.forEach(x => { if (x.getBoundingClientRect().top < innerHeight * 0.92) x.classList.add('gorundu'); else io.observe(x); });
    kok.classList.add('st-anim');
  }
  // Özellikler: sayfa içi menüde bulunulan bölüm işaretlenir
  const ici = d.querySelectorAll('.st-ici a[href^="#"]');
  if (ici.length && 'IntersectionObserver' in window) {
    const harita = new Map([...ici].map(a => [a.getAttribute('href').slice(1), a]));
    const io2 = new IntersectionObserver(l => l.forEach(x => { if (!x.isIntersecting) return; ici.forEach(a => a.classList.remove('secili')); const a = harita.get(x.target.id); if (a) { a.classList.add('secili'); a.scrollIntoView({ block: 'nearest', inline: 'center' }); } }), { rootMargin: '-45% 0px -50% 0px' });
    harita.forEach((a, id) => { const b = d.getElementById(id); if (b) io2.observe(b); });
  }
  // SSS: konu süzgeci ve arama
  const sss = d.querySelector('[data-st-sss]');
  if (sss) {
    const ara = d.querySelector('[data-st-ara]'), dgler = d.querySelectorAll('[data-st-konu]'), bos = d.querySelector('[data-st-bos]');
    let konu = 'hepsi';
    const kucuk = s => s.toLocaleLowerCase('tr').replace(/[ıi̇]/g, 'i').replace(/[şs]/g, 's').replace(/[ğg]/g, 'g').replace(/[üu]/g, 'u').replace(/[öo]/g, 'o').replace(/[çc]/g, 'c');
    const suz = () => {
      const q = kucuk((ara && ara.value || '').trim()); let n = 0;
      sss.querySelectorAll('details').forEach(x => { const uygun = (konu === 'hepsi' || x.dataset.konu === konu) && (!q || kucuk(x.textContent).includes(q)); x.hidden = !uygun; if (uygun) n++; if (q && uygun) x.open = true; });
      if (bos) bos.hidden = n > 0;
    };
    dgler.forEach(b => b.addEventListener('click', () => { konu = b.dataset.stKonu; dgler.forEach(x => x.setAttribute('aria-pressed', x === b)); suz(); }));
    if (ara) ara.addEventListener('input', suz);
  }
  // İletişim: form, WhatsApp'ta hazır mesaj olarak açılır (sunucuya bir şey gönderilmez)
  const f = d.querySelector('[data-st-form]');
  if (f) f.addEventListener('submit', ev => {
    ev.preventDefault();
    const v = n => (f.elements[n] && f.elements[n].value || '').trim();
    if (!v('ad') || !v('kurs')) { (v('ad') ? f.elements.kurs : f.elements.ad).focus(); return; }
    const bilgi = [`Ad soyad: ${v('ad')}`, `Kurs: ${v('kurs')}`, v('sehir') ? `Şehir: ${v('sehir')}` : '', v('tel') ? `Telefon: ${v('tel')}` : ''].filter(Boolean);
    const metin = [`Merhaba, ${v('konu') || 'Sinyal hakkında bilgi almak'} istiyorum.`, bilgi.join('\n'), v('not')].filter(Boolean).join('\n\n');
    window.open('https://wa.me/905013636536?text=' + encodeURIComponent(metin), '_blank', 'noopener');
  });
})();
