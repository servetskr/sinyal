// Ana sayfa vitrini: canlı akış (Sinyal'in kursta yaptığı işler), "Bir kursun günü" yolunda ilerleyen kurs arabası ve duraklardaki sahneler.
// Tanıtım bölümü uygulama tarafından yeniden çizilebildiği için her şey baslat() ile kurulur ve eskisi temizlenir (window.__vitrin).
(() => {
  const OLAY = [
    ['08:31', 'wa', 'Adayın sorusu cevaplandı', 'WhatsApp asistanı · kayıt linki gönderildi'],
    ['08:45', 'wa', 'Taksit hatırlatması gitti', '12 öğrenciye, kursun kendi numarasından'],
    ['09:02', 'kayit', 'Elif Yıldız evden kaydoldu', 'Sözleşmeyi telefondan imzaladı'],
    ['09:20', 'plan', 'Yarının 18 dersi planlandı', 'Araç ve öğretmen çakışması yok'],
    ['10:05', 'para', 'Ödeme alındı', 'Mert Kaya · makbuz 1043'],
    ['10:40', 'meb', '3 kayıt MEBBİS’e hazır', 'Formlar dolu, onayınızı bekliyor'],
    ['11:15', 'plan', 'Hüseyin Hoca dersi bitirdi', 'Öğrencinin imzası alındı'],
    ['12:00', 'kayit', 'Eksik evrak hatırlatıldı', 'Sağlık raporu · 2 öğrenci'],
    ['13:30', 'wa', 'Ders değişikliği yapıldı', 'Öğrenci WhatsApp’tan seçti, öğretmene bildirildi'],
    ['14:10', 'para', 'Gün sonu kasa hazır', 'Nakit, kart ve havale ayrı ayrı'],
  ];
  let temizle = [];
  const azHareket = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function akis(ol) {
    if (!ol) return;
    let i = 0;
    const satir = ([saat, tur, b, s]) => { const li = document.createElement('li'); li.className = 'vt-olay'; li.dataset.tur = tur; li.innerHTML = `<time>${saat}</time><b></b><span></span>`; li.querySelector('b').textContent = b; li.querySelector('span').textContent = s; return li; };
    ol.replaceChildren(...OLAY.slice(0, 4).reverse().map(satir)); i = 4;
    if (azHareket()) return;
    const t = setInterval(() => { if (document.hidden || !ol.isConnected) return; ol.prepend(satir(OLAY[i % OLAY.length])); i++; while (ol.children.length > 5) ol.lastElementChild.remove(); }, 2600);
    temizle.push(() => clearInterval(t));
  }
  function yol(kok) {
    const kap = kok.querySelector('.vt-yol-kap'), araba = kok.querySelector('[data-vt-araba]'), yolEl = kok.querySelector('.vt-yol');
    if (!kap || !araba || !yolEl) return;
    let bekliyor = false;
    const ciz = () => {
      bekliyor = false;
      const r = yolEl.getBoundingClientRect(), h = r.height, ah = araba.offsetHeight || 60;
      const ilerleme = Math.min(1, Math.max(0, (innerHeight * .55 - r.top) / h));
      araba.style.transform = `translateY(${Math.round(18 + ilerleme * (h - ah - 36))}px)`;
    };
    const kaydir = () => { if (!bekliyor) { bekliyor = true; requestAnimationFrame(ciz); } };
    ciz();
    if (azHareket()) return;
    addEventListener('scroll', kaydir, { passive: true }); addEventListener('resize', kaydir);
    temizle.push(() => { removeEventListener('scroll', kaydir); removeEventListener('resize', kaydir); });
  }
  function sahneler(kok) {
    const l = kok.querySelectorAll('.vt-durak');
    if (!('IntersectionObserver' in window) || azHareket()) { l.forEach(d => { d.classList.add('gorundu'); const s = d.querySelector('.vt-sahne'); if (s) s.classList.add('oynat'); }); return; }
    const io = new IntersectionObserver(g => g.forEach(x => { if (!x.isIntersecting) return; x.target.classList.add('gorundu'); const s = x.target.querySelector('.vt-sahne'); if (s) s.classList.add('oynat'); io.unobserve(x.target); }), { rootMargin: '0px 0px -25% 0px' });
    l.forEach(d => io.observe(d));
    temizle.push(() => io.disconnect());
  }
  function baslat() {
    temizle.forEach(f => f()); temizle = [];
    const kok = document.getElementById('tanitim');
    if (!kok || kok.hidden) return;
    akis(kok.querySelector('[data-vt-akis]'));
    yol(kok); sahneler(kok);
  }
  window.__vitrin = baslat;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
