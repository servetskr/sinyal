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
    const oynat = (s, bastan) => { if (!s) return; if (bastan) { s.classList.remove('oynat'); void s.offsetWidth; } s.classList.add('oynat'); };
    const hik = kok.querySelector('.vt-hikaye'), masa = matchMedia('(min-width:980px)');
    // masaüstü: soldaki listeden bir adım seçilir, sağdaki ekran o adımın sahnesini baştan oynatır
    let n = 0;
    const sec = (i, bastan) => {
      n = i;
      if (bastan) { adimlar[i].classList.remove('aktif'); void adimlar[i].offsetWidth; } // ilerleme çizgisi baştan başlasın
      adimlar.forEach((x, j) => { x.classList.toggle('aktif', j === i); const b = x.querySelector('.vt-adim-bas'); if (b) b.setAttribute('aria-pressed', j === i); });
      const k = +adimlar[i].dataset.sahne; sahneler.forEach((s, j) => { s.classList.toggle('aktif', j === k); if (j === k) oynat(s, bastan); });
    };
    hik.classList.add('vt-ilk'); // ilk açılışta geçiş oynamasın; sonraki adım değişimleri yumuşak
    sec(0, false);
    requestAnimationFrame(() => requestAnimationFrame(() => hik.classList.remove('vt-ilk')));
    // liste, en uzun açılmış adıma göre sabit yükseklikte durur: adım değişince bölüm boyu ve altındaki her şey yerinde kalır
    const ol = kok.querySelector('.vt-adimlar');
    const sabitle = () => {
      ol.style.minHeight = ''; if (!masa.matches) return;
      const k = ol.cloneNode(true); k.classList.add('vt-olc'); k.setAttribute('aria-hidden', 'true');
      k.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:' + ol.getBoundingClientRect().width + 'px';
      hik.appendChild(k); const li = [...k.children]; let en = 0;
      li.forEach((x, i) => { li.forEach((y, j) => y.classList.toggle('aktif', i === j)); en = Math.max(en, k.offsetHeight); });
      k.remove(); ol.style.minHeight = Math.ceil(en) + 12 + 'px';
    };
    sabitle();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sabitle);
    let rz = 0; const rzf = () => { clearTimeout(rz); rz = setTimeout(sabitle, 150); };
    addEventListener('resize', rzf); temizle.push(() => removeEventListener('resize', rzf));
    if (azHareket() || !('IntersectionObserver' in window)) { kok.querySelectorAll('.vt-sahne').forEach(s => oynat(s)); return; }
    // kendiliğinden ilerleme: bölüm göründüğünde başlar, fare üstündeyken durur, kullanıcı bir adıma tıklayınca kapanır
    const SURE = 7000; let zaman = null, basla = 0, kalan = SURE, gorunur = false, dur = false, oto = true;
    hik.style.setProperty('--sure', SURE / 1000 + 's');
    const durdur = () => { clearTimeout(zaman); zaman = null; };
    const kur = ms => { durdur(); if (!oto || !gorunur || dur || !masa.matches || document.hidden) return; basla = Date.now(); kalan = ms; zaman = setTimeout(() => { sec((n + 1) % adimlar.length, true); kur(SURE); }, ms); };
    hik.classList.add('vt-oto');
    const tik = ev => { const b = ev.target.closest('.vt-adim-bas'); if (!b || !masa.matches) return; const i = adimlar.indexOf(b.closest('.vt-adim')); oto = false; hik.classList.remove('vt-oto'); durdur(); if (i !== n) sec(i, true); };
    const gir = () => { if (!oto) return; dur = true; hik.classList.add('vt-dur'); if (zaman) { durdur(); kalan = Math.max(400, kalan - (Date.now() - basla)); } };
    const cik = () => { if (!oto) return; dur = false; hik.classList.remove('vt-dur'); kur(kalan); };
    hik.addEventListener('click', tik); hik.addEventListener('mouseenter', gir); hik.addEventListener('mouseleave', cik);
    const io = new IntersectionObserver(l => l.forEach(x => { gorunur = x.isIntersecting; if (gorunur) { sec(n, true); kur(SURE); } else durdur(); }), { threshold: .35 });
    io.observe(hik);
    // telefonda her adımın altındaki sahne ekrana girince oynar
    const io2 = new IntersectionObserver(l => l.forEach(x => { if (x.isIntersecting) { oynat(x.target); io2.unobserve(x.target); } }), { rootMargin: '0px 0px -20% 0px' });
    kok.querySelectorAll('.vt-sahne-ici').forEach(s => io2.observe(s));
    temizle.push(() => { durdur(); io.disconnect(); io2.disconnect(); hik.removeEventListener('click', tik); hik.removeEventListener('mouseenter', gir); hik.removeEventListener('mouseleave', cik); });
  }
  // "Herkes kendi ekranında": rol sekmeleri (ok tuşlarıyla da gezilir)
  function roller(kok) {
    const sekmeler = [...kok.querySelectorAll('[data-rol]')], paneller = [...kok.querySelectorAll('[data-rol-panel]')];
    if (!sekmeler.length) return;
    const sec = (n, odak) => {
      sekmeler.forEach((b, i) => { b.setAttribute('aria-selected', i === n); b.tabIndex = i === n ? 0 : -1; if (i === n && odak) b.focus(); });
      // paneller üst üste durur (bölüm boyu sekmeye göre değişmez); görünmeyen panel klavye ve ekran okuyucudan gizlenir
      paneller.forEach((p, i) => { const ac = i === n; p.classList.toggle('aktif', ac); p.inert = !ac; p.setAttribute('aria-hidden', !ac); });
    };
    const tik = ev => { const b = ev.target.closest('[data-rol]'); if (b) sec(+b.dataset.rol); };
    const tus = ev => { const b = ev.target.closest('[data-rol]'); if (!b) return; const n = +b.dataset.rol, d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (d) { ev.preventDefault(); sec((n + d + sekmeler.length) % sekmeler.length, true); } };
    const kap = sekmeler[0].parentElement;
    kap.addEventListener('click', tik); kap.addEventListener('keydown', tus);
    sec(0);
    temizle.push(() => { kap.removeEventListener('click', tik); kap.removeEventListener('keydown', tus); });
  }
  function baslat() {
    temizle.forEach(f => f()); temizle = [];
    const kok = document.getElementById('tanitim');
    if (!kok || kok.hidden) return;
    if (window.__yol) window.__yol(); // gece yolu sahnesi (tanıtım yeniden çizildiyse yeni tuval)
    akis(kok.querySelector('[data-vt-akis]'));
    hikaye(kok);
    roller(kok);
  }
  window.__vitrin = baslat;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
