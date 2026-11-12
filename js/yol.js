// Yol sahnesi: perspektifli iki şeritli yol, kayan orta çizgi, kedi gözleri, sokak lambaları, ufuk ışıkları, ara sıra karşıdan gelen araç.
// Her <canvas data-yol> için çalışır. data-saat (0 sabah … 1 gece) gökyüzünü belirler; ana sayfadaki yolculuk sahnesi
// kaydırmayla tuval.__yol.ayarla({ saat, yol }) çağırır: gün sabahtan geceye döner, kamera kaydırdıkça ileri gider.
// Ekranda değilken ve sekme gizliyken durur; hareket azaltma tercihinde yalnız kaydırmayla çizilir.
(() => {
  const az = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rs = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // günün renkleri: saat 0 = 08:30 şafak, 1 = 23:00 gece
  const PALET = [
    { q: 0, ust: '#13244a', orta: '#4a5f96', ufuk: '#f0b088', isik: [255, 176, 110], isikA: .5, yildiz: .15, far: .25, lamba: .35, tepe: '#141c33', yol1: '#161c27', yol2: '#2c3340', gunes: 1 },
    { q: .3, ust: '#123a6b', orta: '#2f6aa8', ufuk: '#b9d8ef', isik: [255, 244, 220], isikA: .28, yildiz: 0, far: 0, lamba: 0, tepe: '#1b2a44', yol1: '#262d38', yol2: '#454d59', gunes: 1 },
    { q: .58, ust: '#1c1f4a', orta: '#5b3f7c', ufuk: '#ff9a58', isik: [255, 150, 70], isikA: .6, yildiz: 0, far: .3, lamba: .35, tepe: '#151230', yol1: '#1a1e29', yol2: '#353a47', gunes: 1 },
    { q: .8, ust: '#0a0c24', orta: '#2a1f4c', ufuk: '#c45a3c', isik: [255, 125, 65], isikA: .4, yildiz: .45, far: .75, lamba: 1, tepe: '#080a1c', yol1: '#10141d', yol2: '#242a35', gunes: 0 },
    { q: 1, ust: '#03060c', orta: '#081022', ufuk: '#13203a', isik: [255, 176, 80], isikA: .3, yildiz: 1, far: 1, lamba: 1, tepe: '#04070d', yol1: '#0b0f17', yol2: '#1c222d', gunes: 0 },
  ];
  const karis = (a, b, k) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
  function palet(q) {
    let i = 0; while (i < PALET.length - 2 && q > PALET[i + 1].q) i++;
    const a = PALET[i], b = PALET[i + 1], k = Math.max(0, Math.min(1, (q - a.q) / (b.q - a.q)));
    const r = {}; for (const ad of ['ust', 'orta', 'ufuk', 'tepe', 'yol1', 'yol2']) r[ad] = `rgb(${karis(hex(a[ad]), hex(b[ad]), k).join(',')})`;
    r.isik = karis(a.isik, b.isik, k); for (const ad of ['isikA', 'yildiz', 'far', 'lamba', 'gunes']) r[ad] = a[ad] + (b[ad] - a[ad]) * k;
    return r;
  }
  function kur(cv) {
    if (cv.__yol) return cv.__yol;
    const ctx = cv.getContext('2d');
    const UFUK = +(cv.dataset.ufuk || .56), VX = +(cv.dataset.x || .5), HIZ = +(cv.dataset.hiz || 16);
    const HC = 2.1, ZY = 3.2, PER = 12, CIZ = 4.5, LAMBA = 42; // kamera yüksekliği, en yakın mesafe, çizgi aralığı/uzunluğu, lamba aralığı (metre)
    const SOL = -3.6, ORTA = 0, SAG = 3.6, SERIT = .16;
    let w = 0, h = 0, f = 1, hy = 0, vx = 0, t = 0, son = 0, raf = 0, gorunur = false;
    let saat = cv.dataset.saat != null ? +cv.dataset.saat : 1, yolEk = 0, P0 = palet(saat);
    let tepe = [], isik = [], yildiz = [], arac = null, aracBekle = 3;
    const R = rs(7);
    const P = (X, Z, Y = 0) => [vx + X * f / Z, hy + (HC - Y) * f / Z];
    function boyut() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      w = r.width; h = r.height; if (!w || !h) return;
      if (w > 5000 || h > 5000) { w = 0; return; } // güvenlik: tuvalin boyutu CSS'ten gelmiyorsa büyüme döngüsüne girme
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hy = h * UFUK; vx = w * VX; f = (h - hy) * ZY / HC;
      const r2 = rs(11); tepe = []; for (let x = -20; x <= w + 40; x += 24) tepe.push([x, hy - 6 - r2() * 14 - Math.max(0, Math.sin(x / w * 3.1 + .6)) * 16]);
      const r3 = rs(29); isik = []; for (let i = 0; i < Math.round(w / 9); i++) { const x = r3() * w, uz = Math.abs(x - vx) / w; if (uz > .55) continue; isik.push([x, hy - 2 - r3() * 7 * (1 - uz), r3() < .7 ? 'f' : 'b', .25 + r3() * .6, r3() * 6]); }
      const r4 = rs(43); yildiz = []; for (let i = 0; i < Math.round(w * hy / 9000); i++) yildiz.push([r4() * w, r4() * hy * .85, .3 + r4() * .7, r4() * 6]);
      ciz();
    }
    function dortgen(X1, X2, Z1, Z2, Y = 0) { const a = P(X1, Z1, Y), b = P(X2, Z1, Y), c = P(X2, Z2, Y), d = P(X1, Z2, Y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }
    function ciz() {
      if (!w) return;
      const pl = P0, mesafe = t * HIZ + yolEk;
      // gök
      let g = ctx.createLinearGradient(0, 0, 0, hy);
      g.addColorStop(0, pl.ust); g.addColorStop(.62, pl.orta); g.addColorStop(1, pl.ufuk);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, hy + 1);
      // yıldızlar
      if (pl.yildiz > .02) for (const [x, y, a, ph] of yildiz) { ctx.fillStyle = `rgba(255,255,255,${a * pl.yildiz * (.75 + .25 * Math.sin(t * 1.7 + ph))})`; ctx.fillRect(x, y, 1.3, 1.3); }
      // güneş (sabah solda doğar, öğlen yükselir, akşam sağda batar) ve ay
      if (pl.gunes > .02) {
        const k = Math.min(1, saat / .78), gx = w * (w < 700 ? .12 + .8 * k : .46 + .5 * k), gy = hy - Math.sin(Math.PI * Math.min(1, k)) * hy * (w < 700 ? .2 : .5) + 8; // dar ekranda güneş ufka yakın (yazıların arkasına düşmesin)
        const rr = Math.max(16, h * .035), renk = karis([255, 214, 160], [255, 248, 230], Math.sin(Math.PI * k));
        g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr * 7); g.addColorStop(0, `rgba(${renk},${.55 * pl.gunes})`); g.addColorStop(1, `rgba(${renk},0)`);
        ctx.fillStyle = g; ctx.fillRect(gx - rr * 7, gy - rr * 7, rr * 14, rr * 14);
        ctx.fillStyle = `rgba(${renk},${pl.gunes})`; ctx.beginPath(); ctx.arc(gx, gy, rr, 0, 6.283); ctx.fill();
      }
      if (pl.yildiz > .3) {
        const mx = w * .82, my = w < 700 ? hy * .82 : hy * .22, rr = Math.max(12, h * .022), a = Math.min(1, (pl.yildiz - .3) / .5);
        g = ctx.createRadialGradient(mx, my, 0, mx, my, rr * 5); g.addColorStop(0, `rgba(244,233,196,${.25 * a})`); g.addColorStop(1, 'rgba(244,233,196,0)');
        ctx.fillStyle = g; ctx.fillRect(mx - rr * 5, my - rr * 5, rr * 10, rr * 10);
        ctx.fillStyle = `rgba(244,233,196,${a})`; ctx.beginPath(); ctx.arc(mx, my, rr, 0, 6.283); ctx.fill();
      }
      // ufuk parıltısı
      ctx.save(); ctx.translate(vx, hy); ctx.scale(1, .28);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * .55); g.addColorStop(0, `rgba(${pl.isik},${pl.isikA})`); g.addColorStop(.35, `rgba(${pl.isik},${pl.isikA * .35})`); g.addColorStop(1, `rgba(${pl.isik},0)`);
      ctx.fillStyle = g; ctx.fillRect(-w, -w, w * 2, w * 2); ctx.restore();
      // kasaba ışıkları (karanlıkta)
      if (pl.lamba > .05) for (const [x, y, tur, a, ph] of isik) { ctx.fillStyle = tur === 'f' ? `rgba(255,200,120,${a * pl.lamba * (.75 + .25 * Math.sin(t * 1.3 + ph))})` : `rgba(200,220,255,${a * .8 * pl.lamba})`; ctx.fillRect(x, y, 1.6, 1.6); }
      // tepeler
      ctx.fillStyle = pl.tepe; ctx.beginPath(); ctx.moveTo(-20, h); for (const [x, y] of tepe) ctx.lineTo(x, y); ctx.lineTo(w + 40, h); ctx.closePath(); ctx.fill();
      // yol yüzeyi
      g = ctx.createLinearGradient(0, hy, 0, h); g.addColorStop(0, pl.yol1); g.addColorStop(1, pl.yol2);
      ctx.fillStyle = g; dortgen(SOL - .6, SAG + .6, ZY * .9, 900);
      // farların aydınlattığı alan
      if (pl.far > .02) {
        ctx.save(); const [fx, fy] = P(0, 9); ctx.translate(fx, fy); ctx.scale(1, .32);
        g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * .32); g.addColorStop(0, `rgba(255,236,200,${.16 * pl.far})`); g.addColorStop(1, 'rgba(255,236,200,0)');
        ctx.fillStyle = g; ctx.fillRect(-w, -w * 2, w * 2, w * 4); ctx.restore();
      }
      // kenar çizgileri
      for (let z = ZY; z < 600; z *= 1.06) {
        const z2 = z * 1.06, a = Math.max(0, Math.min(.9, 1.15 - z / 140)); if (a <= 0) break;
        ctx.fillStyle = `rgba(235,238,245,${a})`; dortgen(SOL, SOL + SERIT, z, z2); dortgen(SAG - SERIT, SAG, z, z2);
      }
      // orta kesik çizgi
      const kay = mesafe % PER;
      for (let k = -1; k < 60; k++) {
        const z1 = ZY + k * PER - kay, z2 = z1 + CIZ; if (z2 < ZY) continue; const za = Math.max(z1, ZY);
        const a = Math.max(0, Math.min(1, 1.2 - za / 160)); if (a <= 0) break;
        ctx.fillStyle = `rgba(255,205,90,${a})`; dortgen(ORTA - .07, ORTA + .07, za, z2);
      }
      // sokak lambaları (sağda): direk, kol, ışık ve yoldaki ışık havuzu; uzaktan yakına
      const lk = mesafe % LAMBA, direkler = [];
      for (let k = 0; k < 14; k++) { const z = ZY + 4 + k * LAMBA - lk; if (z > ZY + .5 && z < 520) direkler.push(z); }
      for (const z of direkler.reverse()) {
        const a = Math.max(0, Math.min(1, 1.25 - z / 320)), X = SAG + 1.4;
        const [x0, y0] = P(X, z), [, y1] = P(X, z, 8), [x2, y2] = P(X - 2.2, z, 8), en = Math.max(.6, 1.8 * f / z / 40);
        if (pl.lamba > .02) {
          const [px, py] = P(X - 2.6, z); ctx.save(); ctx.translate(px, py); ctx.scale(1, .3);
          const rr = 5.5 * f / z; g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr); g.addColorStop(0, `rgba(255,200,120,${.22 * pl.lamba * a})`); g.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = g; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
        }
        ctx.strokeStyle = `rgba(6,9,16,${.85 * a})`; ctx.lineWidth = en; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (pl.lamba > .02) {
          const rr = Math.min(Math.max(1.5, .9 * f / z), 9); g = ctx.createRadialGradient(x2, y2, 0, x2, y2, rr * 4); g.addColorStop(0, `rgba(255,226,170,${pl.lamba * a})`); g.addColorStop(1, 'rgba(255,226,170,0)');
          ctx.fillStyle = g; ctx.fillRect(x2 - rr * 4, y2 - rr * 4, rr * 8, rr * 8);
        }
      }
      // kedi gözleri
      for (let k = 0; k < 40; k++) {
        const z = ZY + 1 + k * 18 - (mesafe % 18); if (z < ZY) continue; const a = Math.max(0, 1 - z / 260); if (a <= 0) break;
        const r = Math.max(.6, 7 / z * (w / 900)), parla = .35 + .65 * Math.max(pl.far, .3);
        for (const [X, renk] of [[SAG + .25, '255,180,60'], [SOL - .25, '235,240,255']]) { const [x, y] = P(X, z); ctx.fillStyle = `rgba(${renk},${a * parla})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
      }
      // karşıdan gelen araç
      if (arac) {
        const z = arac.z, a = Math.min(1, (320 - z) / 80) * Math.min(1, (z - ZY) / 6) * (.35 + .65 * pl.far);
        if (a > 0) for (const dx of [-.75, .75]) {
          const [x, y] = P(arac.x + dx, z, .65), r = Math.max(1.2, 90 / z * (w / 1400));
          g = ctx.createRadialGradient(x, y, 0, x, y, r * 7); g.addColorStop(0, `rgba(255,250,235,${a})`); g.addColorStop(.18, `rgba(255,240,210,${a * .55})`); g.addColorStop(1, 'rgba(255,240,210,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 7, 0, 6.283); ctx.fill();
          const [rx, ry] = P(arac.x + dx, z), [, ry2] = P(arac.x + dx, Math.max(ZY, z * .55));
          g = ctx.createLinearGradient(0, ry, 0, ry2); g.addColorStop(0, `rgba(255,240,210,${a * .22})`); g.addColorStop(1, 'rgba(255,240,210,0)');
          ctx.fillStyle = g; ctx.fillRect(rx - r * 1.2, ry, r * 2.4, Math.max(0, ry2 - ry));
        }
      }
      // ufukta pus ve alt kenarda koyulaşma
      g = ctx.createLinearGradient(0, hy - 40, 0, hy + 60); g.addColorStop(0, 'rgba(20,30,52,0)'); g.addColorStop(.5, 'rgba(20,30,52,.3)'); g.addColorStop(1, 'rgba(20,30,52,0)');
      ctx.fillStyle = g; ctx.fillRect(0, hy - 40, w, 100);
      g = ctx.createLinearGradient(0, h * .8, 0, h); g.addColorStop(0, 'rgba(7,11,20,0)'); g.addColorStop(1, 'rgba(7,11,20,1)'); // alt kenar sayfanın zemin rengine erir (bölüm geçişi görünmez)
      ctx.fillStyle = g; ctx.fillRect(0, h * .8, w, h * .2 + 1);
    }
    function kare(n) {
      raf = 0; if (!gorunur || document.hidden) return;
      const dt = Math.min(.05, (n - (son || n)) / 1000); son = n; t += dt;
      aracBekle -= dt;
      if (!arac && aracBekle <= 0) arac = { x: -1.8, z: 320 };
      if (arac) { arac.z -= (HIZ + 18) * dt; if (arac.z < ZY + .5) { arac = null; aracBekle = 5 + R() * 6; } }
      ciz(); raf = requestAnimationFrame(kare);
    }
    const basla = () => { if (!raf && gorunur && !az()) { son = 0; raf = requestAnimationFrame(kare); } };
    const ro = new ResizeObserver(boyut); ro.observe(cv);
    const io = new IntersectionObserver(l => { gorunur = l[0].isIntersecting; if (gorunur) basla(); }, { threshold: 0 }); io.observe(cv);
    const gor = () => { if (!document.hidden) basla(); }; document.addEventListener('visibilitychange', gor);
    boyut();
    cv.__yol = {
      // kaydırmadan: saat 0…1 (sabah → gece), yol metre olarak ek mesafe
      ayarla: ({ saat: s, yol }) => { if (s != null) { saat = Math.max(0, Math.min(1, s)); P0 = palet(saat); } if (yol != null) yolEk = yol; if (!raf) ciz(); },
      dur: () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', gor); cv.__yol = null; }
    };
    return cv.__yol;
  }
  const hepsi = () => document.querySelectorAll('canvas[data-yol]').forEach(kur);
  window.__yol = hepsi;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
})();
