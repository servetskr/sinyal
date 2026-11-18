// mdSinyal tanıtım sitesi: telefonda menü, beliren bölümler, Özellikler alt menüsü, SSS süzgeci ve arama, İletişim formu (WhatsApp'a hazır mesaj)
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
    const io2 = new IntersectionObserver(l => l.forEach(x => { if (!x.isIntersecting) return; ici.forEach(a => a.classList.remove('secili')); const a = harita.get(x.target.id); if (a) { a.classList.add('secili'); const k = a.parentElement; k.scrollTo({ left: a.offsetLeft - (k.clientWidth - a.offsetWidth) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } }), { rootMargin: '-45% 0px -50% 0px' });
    harita.forEach((a, id) => { const b = d.getElementById(id); if (b) io2.observe(b); });
  }
  // Özellikler: özellik gezgini (soldaki listeden seçilen özelliğin cihaz ekranı sağda; ok tuşlarıyla da gezilir)
  const gz = d.querySelector('.oz-gezgin');
  if (gz) {
    const sek = [...gz.querySelectorAll('[data-oz]')], pan = [...gz.querySelectorAll('[data-oz-panel]')], liste = gz.querySelector('.oz-liste');
    // cihaz gerçek boyutunda çizilir, sahneye sığacak kadar orantılı küçültülür
    const sigdir = () => pan.forEach(p => { const sh = p.querySelector('.oz-cihaz'), c = sh && sh.firstElementChild; if (!c) return; c.style.transform = ''; const o = Math.min(1, sh.clientWidth / c.offsetWidth, sh.clientHeight / c.offsetHeight); if (o < .999) c.style.transform = `scale(${o.toFixed(3)})`; });
    const sec = (n, odak) => {
      sek.forEach((b, i) => { b.setAttribute('aria-selected', i === n); b.tabIndex = i === n ? 0 : -1; if (i === n && odak) b.focus({ preventScroll: true }); });
      pan.forEach((p, i) => { const ac = i === n; p.classList.toggle('aktif', ac); p.inert = !ac; const an = p.querySelector('.vt-an'); if (ac && an) { an.classList.remove('oynat'); void an.offsetWidth; an.classList.add('oynat'); } });
      if (liste.scrollWidth > liste.clientWidth) { const b = sek[n]; liste.scrollTo({ left: b.offsetLeft - 20, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    };
    gz.addEventListener('click', ev => { const b = ev.target.closest('[data-oz]'); if (b) sec(+b.dataset.oz); });
    gz.addEventListener('keydown', ev => { const b = ev.target.closest('[data-oz]'); if (!b) return; const d2 = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[ev.key]; if (d2) { ev.preventDefault(); sec((+b.dataset.oz + d2 + sek.length) % sek.length, true); } });
    sigdir(); sec(0); addEventListener('resize', sigdir); if (d.fonts && d.fonts.ready) d.fonts.ready.then(sigdir);
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
  // İletişim ve başvuru formu (SIT-009, SIT-020): önce mdSinyal'e gönderilir (api.mdsinyal.com/talep); gönderilemezse ya da
  // kullanıcı isterse aynı bilgiler WhatsApp'ta hazır mesaj olarak açılır.
  d.querySelectorAll('[data-st-form]').forEach(f => {
    const v = n => (f.elements[n] && f.elements[n].value || '').trim(), durum = f.querySelector('[data-st-form-durum]');
    const yaz = m => { if (durum) { durum.textContent = m; durum.hidden = !m; } };
    const waMetni = () => {
      const bilgi = [`Ad soyad: ${v('ad')}`, `Kurs: ${v('kurs')}`, v('sehir') ? `Şehir: ${v('sehir')}` : '', v('tel') ? `Telefon: ${v('tel')}` : '', v('eposta') ? `E-posta: ${v('eposta')}` : '',
        v('sube') ? `Şube sayısı: ${v('sube')}` : '', v('ogrenci') ? `Yıllık öğrenci: ${v('ogrenci')}` : '', v('program') ? `Kullandığımız program: ${v('program')}` : '', v('gun') ? `Uygun gün: ${v('gun')}` : ''].filter(Boolean);
      return [`Merhaba, ${v('konu') || (f.dataset.tur === 'basvuru' ? 'kursumuzu mdSinyal’e geçirmek' : 'mdSinyal hakkında bilgi almak')} istiyorum.`, bilgi.join('\n'), v('not')].filter(Boolean).join('\n\n');
    };
    const waAc = () => window.open('https://wa.me/905013636536?text=' + encodeURIComponent(waMetni()), '_blank', 'noopener');
    const wa = f.querySelector('[data-st-wa]'); if (wa) wa.addEventListener('click', () => { if (!v('ad') || !v('kurs')) { yaz('WhatsApp mesajı için ad soyad ve kurs adını yazın.'); (v('ad') ? f.elements.kurs : f.elements.ad).focus(); return; } waAc(); });
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (!v('ad') || !v('kurs')) { yaz('Ad soyad ve kurs adını yazın.'); (v('ad') ? f.elements.kurs : f.elements.ad).focus(); return; }
      const telOk = v('tel').replace(/\D/g, '').length >= 10, epOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v('eposta'));
      if (!telOk && !epOk) { yaz('Size dönebilmemiz için telefon ya da e-posta yazın.'); f.elements.tel.focus(); return; }
      if (f.elements.kvkk && !f.elements.kvkk.checked) { yaz('Göndermek için aydınlatma metnini okuduğunuzu işaretleyin.'); f.elements.kvkk.focus(); return; }
      const dg = f.querySelector('[type=submit]'); dg.disabled = true; const eski = dg.textContent; dg.textContent = 'Gönderiliyor…'; yaz('');
      const govde = { tur: f.dataset.tur || 'iletisim', kvkk: true, web: v('web') };
      ['ad', 'kurs', 'sehir', 'tel', 'eposta', 'konu', 'not', 'sube', 'ogrenci', 'program', 'gun'].forEach(n => { if (f.elements[n]) govde[n] = v(n); });
      try {
        const ac = new AbortController(), zt = setTimeout(() => ac.abort(), 12000);
        const r = await fetch('https://api.mdsinyal.com/talep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde), signal: ac.signal });
        clearTimeout(zt);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw Object.assign(new Error(j.hata || 'gönderilemedi'), { kullanici: r.status === 400 || r.status === 429 ? j.hata : '' });
        const kart = f.closest('[data-st-form-kart]') || f;
        kart.innerHTML = `<div class="st-form-tamam" role="status" tabindex="-1"><b>${govde.tur === 'basvuru' ? 'Başvurunuz' : 'Mesajınız'} bize ulaştı.</b><span>En geç bir iş günü içinde ${telOk ? 'sizi arıyoruz' : 'e-postanıza yazıyoruz'}${govde.tur === 'basvuru' ? '; kurulum gününü birlikte belirleriz' : ''}. Acele ederseniz WhatsApp’tan da yazabilirsiniz: 0501 363 65 36.</span></div>`;
        kart.querySelector('.st-form-tamam').focus();
      } catch (x) {
        dg.disabled = false; dg.textContent = eski;
        yaz(x.kullanici || 'Mesaj şu an gönderilemedi. “WhatsApp’ta mesajı hazırla” ile aynı bilgileri WhatsApp’tan iletebilirsiniz.');
      }
    });
  });
})();
