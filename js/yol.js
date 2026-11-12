// Gece yolu sahnesi: perspektifli iki şeritli yol, kayan orta çizgi, kedi gözleri, ufukta kasaba ışıkları, ara sıra karşıdan gelen araç.
// Her <canvas data-yol> için çalışır. Ekranda değilken ve sekme gizliyken durur; hareket azaltma tercihinde tek kare çizer.
(() => {
  const az = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // sabit rastgele (her açılışta aynı ufuk)
  const rs = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
  function kur(cv) {
    if (cv.__yol) return cv.__yol;
    const ctx = cv.getContext('2d');
    const UFUK = +(cv.dataset.ufuk || .56), VX = +(cv.dataset.x || .5), HIZ = +(cv.dataset.hiz || 16);
    const HC = 2.1, ZY = 3.2, PER = 12, CIZ = 4.5; // kamera yüksekliği, en yakın mesafe, orta çizgi aralığı ve uzunluğu (metre)
    const SOL = -3.6, ORTA = 0, SAG = 3.6, SERIT = .16;
    let w = 0, h = 0, f = 1, hy = 0, vx = 0, t = 0, son = 0, raf = 0, gorunur = false;
    let tepe = [], isik = [], arac = null, aracBekle = 3;
    const R = rs(7);
    const P = (X, Z, Y = 0) => [vx + X * f / Z, hy + (HC - Y) * f / Z];
    function boyut() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      w = r.width; h = r.height; if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hy = h * UFUK; vx = w * VX; f = (h - hy) * ZY / HC;
      // ufuk çizgisi: alçak tepeler; kasaba ışıkları
      const r2 = rs(11); tepe = []; for (let x = -20; x <= w + 40; x += 24) tepe.push([x, hy - 6 - r2() * 14 - Math.max(0, Math.sin(x / w * 3.1 + .6)) * 16]);
      const r3 = rs(29); isik = []; for (let i = 0; i < Math.round(w / 9); i++) { const x = r3() * w, uz = Math.abs(x - vx) / w; if (uz > .55) continue; isik.push([x, hy - 2 - r3() * 7 * (1 - uz), r3() < .7 ? 'f' : 'b', .25 + r3() * .6, r3() * 6]); }
      ciz();
    }
    function dortgen(X1, X2, Z1, Z2, Y = 0) { const a = P(X1, Z1, Y), b = P(X2, Z1, Y), c = P(X2, Z2, Y), d = P(X1, Z2, Y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }
    function ciz() {
      if (!w) return;
      // gök
      let g = ctx.createLinearGradient(0, 0, 0, hy);
      g.addColorStop(0, '#03060c'); g.addColorStop(.6, '#081022'); g.addColorStop(1, '#13203a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, hy + 1);
      // ufuk parıltısı (uzaktaki kasaba)
      ctx.save(); ctx.translate(vx, hy); ctx.scale(1, .28);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * .55); g.addColorStop(0, 'rgba(255,176,80,.30)'); g.addColorStop(.35, 'rgba(255,140,60,.10)'); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(-w, -w, w * 2, w * 2);
      g = ctx.createRadialGradient(-w * .25, 0, 0, -w * .25, 0, w * .6); g.addColorStop(0, 'rgba(70,120,255,.16)'); g.addColorStop(1, 'rgba(70,120,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-w * 2, -w, w * 4, w * 2); ctx.restore();
      // kasaba ışıkları
      for (const [x, y, tur, a, ph] of isik) { ctx.fillStyle = tur === 'f' ? `rgba(255,200,120,${a * (.75 + .25 * Math.sin(t * 1.3 + ph))})` : `rgba(200,220,255,${a * .8})`; ctx.fillRect(x, y, 1.6, 1.6); }
      // tepeler ve zemin
      ctx.fillStyle = '#04070d'; ctx.beginPath(); ctx.moveTo(-20, h); for (const [x, y] of tepe) ctx.lineTo(x, y); ctx.lineTo(w + 40, h); ctx.closePath(); ctx.fill();
      // yol yüzeyi
      g = ctx.createLinearGradient(0, hy, 0, h); g.addColorStop(0, '#0b0f17'); g.addColorStop(1, '#1c222d');
      ctx.fillStyle = g; dortgen(SOL - .6, SAG + .6, ZY * .9, 900);
      // farların aydınlattığı alan
      ctx.save(); const fy = P(0, 9)[1]; ctx.translate(P(0, 9)[0], fy); ctx.scale(1, .32);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * .32); g.addColorStop(0, 'rgba(255,236,200,.16)'); g.addColorStop(1, 'rgba(255,236,200,0)');
      ctx.fillStyle = g; ctx.fillRect(-w, -w * 2, w * 2, w * 4); ctx.restore();
      // kenar çizgileri (uzaklaştıkça söner)
      for (let z = ZY; z < 600; z *= 1.06) {
        const z2 = z * 1.06, a = Math.max(0, Math.min(.9, 1.15 - z / 140));
        if (a <= 0) break;
        ctx.fillStyle = `rgba(235,238,245,${a})`; dortgen(SOL, SOL + SERIT, z, z2); dortgen(SAG - SERIT, SAG, z, z2);
      }
      // orta kesik çizgi (akan)
      const kay = (t * HIZ) % PER;
      for (let k = -1; k < 60; k++) {
        const z1 = ZY + k * PER - kay, z2 = z1 + CIZ; if (z2 < ZY) continue; const za = Math.max(z1, ZY);
        const a = Math.max(0, Math.min(1, 1.2 - za / 160)); if (a <= 0) break;
        ctx.fillStyle = `rgba(255,205,90,${a})`; dortgen(ORTA - .07, ORTA + .07, za, z2);
      }
      // kedi gözleri: sağda kehribar, solda beyaz
      for (let k = 0; k < 40; k++) {
        const z = ZY + 1 + k * 18 - ((t * HIZ) % 18); if (z < ZY) continue; const a = Math.max(0, 1 - z / 260); if (a <= 0) break;
        const r = Math.max(.6, 7 / z * (w / 900));
        for (const [X, renk] of [[SAG + .25, '255,180,60'], [SOL - .25, '235,240,255']]) { const [x, y] = P(X, z); ctx.fillStyle = `rgba(${renk},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
      }
      // karşıdan gelen araç: iki far, yolda yansıma
      if (arac) {
        const z = arac.z; const a = Math.min(1, (320 - z) / 80) * Math.min(1, (z - ZY) / 6);
        if (a > 0) {
          for (const dx of [-.75, .75]) {
            const [x, y] = P(arac.x + dx, z, .65), r = Math.max(1.2, 90 / z * (w / 1400));
            g = ctx.createRadialGradient(x, y, 0, x, y, r * 7); g.addColorStop(0, `rgba(255,250,235,${a})`); g.addColorStop(.18, `rgba(255,240,210,${a * .55})`); g.addColorStop(1, 'rgba(255,240,210,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 7, 0, 6.283); ctx.fill();
            const [rx, ry] = P(arac.x + dx, z); const [, ry2] = P(arac.x + dx, Math.max(ZY, z * .55));
            g = ctx.createLinearGradient(0, ry, 0, ry2); g.addColorStop(0, `rgba(255,240,210,${a * .22})`); g.addColorStop(1, 'rgba(255,240,210,0)');
            ctx.fillStyle = g; ctx.fillRect(rx - r * 1.2, ry, r * 2.4, Math.max(0, ry2 - ry));
          }
        }
      }
      // ufukta pus ve alt kenarda koyulaşma (yazılar okunaklı kalsın)
      g = ctx.createLinearGradient(0, hy - 40, 0, hy + 60); g.addColorStop(0, 'rgba(20,30,52,0)'); g.addColorStop(.5, 'rgba(20,30,52,.35)'); g.addColorStop(1, 'rgba(20,30,52,0)');
      ctx.fillStyle = g; ctx.fillRect(0, hy - 40, w, 100);
      g = ctx.createLinearGradient(0, h * .82, 0, h); g.addColorStop(0, 'rgba(7,11,20,0)'); g.addColorStop(1, 'rgba(7,11,20,.85)');
      ctx.fillStyle = g; ctx.fillRect(0, h * .82, w, h * .18 + 1);
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
    cv.__yol = { dur: () => { cancelAnimationFrame(raf); raf = 0; ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', gor); cv.__yol = null; } };
    return cv.__yol;
  }
  const hepsi = () => document.querySelectorAll('canvas[data-yol]').forEach(kur);
  window.__yol = hepsi;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hepsi); else hepsi();
})();
