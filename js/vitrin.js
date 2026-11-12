// Ana sayfa: üstteki uygulama penceresinde "Bugün kursunuzda" akışı; "Bir kursun günü"nde okunan adıma göre yandaki ekran değişir.
// Telefonda yapışkan ekran yerine her adımın altında kendi sahnesi gösterilir (aynı sahnenin kopyası).
// Tanıtım bölümü uygulama tarafından yeniden çizilebildiği için her şey baslat() ile kurulur ve eskisi temizlenir (window.__vitrin).
(() => {
  const OLAY = [
    ['08:31', 'wa', 'Adayın sorusu cevaplandı', 'WhatsApp asistanı · kayıt linki gönderildi'],
    ['08:45', 'wa', 'Taksit hatırlatması gitti', '12 öğrenciye, kursun numarasından'],
    ['09:02', 'kayit', 'Elif Yıldız evden kaydoldu', 'Sözleşmeyi telefondan imzaladı'],
    ['09:20', 'plan', 'Yarının 18 dersi planlandı', 'Araç ve öğretmen çakışması yok'],
    ['10:05', 'para', 'Ödeme alındı', 'Mert Kaya · makbuz 1043'],
    ['10:40', 'meb', '3 kayıt MEBBİS’e hazır', 'Onayınızı bekliyor'],
    ['11:15', 'plan', 'Hüseyin Hoca dersi bitirdi', 'Öğrencinin imzası alındı'],
    ['12:00', 'kayit', 'Eksik evrak hatırlatıldı', 'Sağlık raporu · 2 öğrenci'],
    ['13:30', 'wa', 'Ders değişikliği yapıldı', 'Öğrenci WhatsApp’tan yeni saati seçti'],
  ];
  let temizle = [];
  const azHareket = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function akis(ol) {
    if (!ol) return;
    const satir = ([saat, tur, b, s]) => { const li = document.createElement('li'); li.className = 'vt-olay'; li.dataset.tur = tur; li.innerHTML = '<time></time><div><b></b><span></span></div>'; li.querySelector('time').textContent = saat; li.querySelector('b').textContent = b; li.querySelector('span').textContent = s; return li; };
    ol.replaceChildren(...OLAY.slice(0, 5).reverse().map(satir));
    if (azHareket()) return;
    let i = 5;
    const t = setInterval(() => { if (document.hidden || !ol.isConnected) return; ol.prepend(satir(OLAY[i % OLAY.length])); i++; while (ol.children.length > 6) ol.lastElementChild.remove(); }, 2800);
    temizle.push(() => clearInterval(t));
  }
  function hikaye(kok) {
    const adimlar = [...kok.querySelectorAll('.vt-adim')], ekran = kok.querySelector('.vt-ekran');
    if (!adimlar.length || !ekran) return;
    const sahneler = [...ekran.querySelectorAll('.vt-sahne')];
    // telefon için: her adımın altına kendi sahnesinin kopyası
    adimlar.forEach(a => { if (a.querySelector('.vt-sahne-ici')) return; const s = sahneler[+a.dataset.sahne]; if (!s) return; const k = s.cloneNode(true); k.classList.add('vt-sahne-ici'); k.setAttribute('aria-hidden', 'true'); a.appendChild(k); });
    const oynat = s => { if (!s || s.classList.contains('oynat')) return; s.classList.add('oynat'); };
    const sec = a => {
      adimlar.forEach(x => x.classList.toggle('aktif', x === a));
      const n = +a.dataset.sahne; sahneler.forEach((s, i) => { s.classList.toggle('aktif', i === n); if (i === n) oynat(s); });
      oynat(a.querySelector('.vt-sahne-ici'));
    };
    sec(adimlar[0]);
    if (azHareket() || !('IntersectionObserver' in window)) { kok.querySelectorAll('.vt-sahne').forEach(oynat); return; }
    // etkin adım: üst kenarı ekranın ortasını geçmiş son adım (hızlı kaydırmada da doğru adım seçilir)
    let son = adimlar[0], bekliyor = false;
    const bak = () => { bekliyor = false; let a = adimlar[0]; for (const x of adimlar) if (x.getBoundingClientRect().top < innerHeight * .5) a = x; if (a !== son) { son = a; sec(a); } };
    const kaydir = () => { if (!bekliyor) { bekliyor = true; requestAnimationFrame(bak); } };
    addEventListener('scroll', kaydir, { passive: true }); addEventListener('resize', kaydir); bak();
    const io = { disconnect: () => { removeEventListener('scroll', kaydir); removeEventListener('resize', kaydir); } };
    // telefonda sahne ekrana girince oynasın
    const io2 = new IntersectionObserver(l => l.forEach(x => { if (x.isIntersecting) { oynat(x.target); io2.unobserve(x.target); } }), { rootMargin: '0px 0px -20% 0px' });
    kok.querySelectorAll('.vt-sahne-ici').forEach(s => io2.observe(s));
    temizle.push(() => { io.disconnect(); io2.disconnect(); });
  }
  function baslat() {
    temizle.forEach(f => f()); temizle = [];
    const kok = document.getElementById('tanitim');
    if (!kok || kok.hidden) return;
    akis(kok.querySelector('[data-vt-akis]'));
    hikaye(kok);
  }
  window.__vitrin = baslat;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
