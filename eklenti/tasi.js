// mdSinyal MEBBİS Yardımcısı · kayan pencereler (panel ve iş kartı) için ortak davranış:
// başlıktan tutup sürükleme, bırakınca en yakın kenara yumuşakça yaslanma, ekran dışına taşmama ve konumu hatırlama.
// Pencere ekranın hangi yarısındaysa o kenara bağlanır; küçülüp büyürken taşmaz (alttaysa yukarı doğru büyür).
(() => {
  if (window !== window.top || window.__sinyalTasi) return;
  const gonder = m => new Promise(ok => { try { chrome.runtime.sendMessage(m, ok); } catch (x) { ok(null); } });
  const KENAR = 12, YASLA = 28, EGRI = 'cubic-bezier(.2,.8,.2,1)';
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  window.__sinyalTasi = (el, tutamak, anahtar) => {
    let konum = null;   // { yatay: 'sol'|'sag', dikey: 'ust'|'alt', x, y } — bağlı kenarlara uzaklık (px)
    const uygula = k => {
      const r = el.getBoundingClientRect(), w = innerWidth, h = innerHeight;
      const x = Math.min(Math.max(KENAR, k.x), Math.max(KENAR, w - r.width - KENAR)), y = Math.min(Math.max(KENAR, k.y), Math.max(KENAR, h - r.height - KENAR));
      el.style.left = k.yatay === 'sol' ? x + 'px' : 'auto'; el.style.right = k.yatay === 'sag' ? x + 'px' : 'auto';
      el.style.top = k.dikey === 'ust' ? y + 'px' : 'auto'; el.style.bottom = k.dikey === 'alt' ? y + 'px' : 'auto';
    };
    // FLIP: eski görünen yerden yeni yerine kayarak gider
    const kaydir = (once) => {
      const sonra = el.getBoundingClientRect(), dx = once.left - sonra.left, dy = once.top - sonra.top;
      el.style.transition = 'none'; el.style.transform = `translate(${dx}px, ${dy}px)`; el.getBoundingClientRect();
      el.style.transition = azalt.matches ? 'none' : `transform .32s ${EGRI}`; el.style.transform = '';
    };
    gonder({ tur: 'ayar-al', ad: 'konum-' + anahtar }).then(k => { if (k && k.yatay) { konum = k; uygula(k); } });
    addEventListener('resize', () => { if (konum) uygula(konum); });

    let surukle = null, yut = false;
    tutamak.style.touchAction = 'none'; tutamak.style.cursor = 'grab';
    tutamak.addEventListener('pointerdown', ev => {
      if (ev.button !== 0 || ev.target.closest('button:not([data-k]), input, a, select')) return;
      const r = el.getBoundingClientRect();
      surukle = { x0: ev.clientX, y0: ev.clientY, r, oynadi: false, id: ev.pointerId };
    });
    tutamak.addEventListener('pointermove', ev => {
      if (!surukle || ev.pointerId !== surukle.id) return;
      const dx = ev.clientX - surukle.x0, dy = ev.clientY - surukle.y0;
      if (!surukle.oynadi && Math.hypot(dx, dy) < 5) return;
      if (!surukle.oynadi) { surukle.oynadi = true; try { tutamak.setPointerCapture(ev.pointerId); } catch (x) { } tutamak.style.cursor = 'grabbing'; el.style.transition = 'none'; el.style.willChange = 'transform'; }
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const birak = ev => {
      if (!surukle || ev.pointerId !== surukle.id) return;
      const s = surukle; surukle = null; tutamak.style.cursor = 'grab'; el.style.willChange = '';
      if (!s.oynadi) return;
      yut = true; setTimeout(() => { yut = false; }, 0);   // sürükleme sonundaki tıklama küçültmeyi tetiklemesin
      const once = el.getBoundingClientRect(), w = innerWidth, h = innerHeight;
      let sol = once.left, ust = once.top;
      // kenara yakınsa yasla
      if (sol < YASLA) sol = KENAR; if (w - (sol + once.width) < YASLA) sol = w - once.width - KENAR;
      if (ust < YASLA) ust = KENAR; if (h - (ust + once.height) < YASLA) ust = h - once.height - KENAR;
      const yatay = sol + once.width / 2 > w / 2 ? 'sag' : 'sol', dikey = ust + once.height / 2 > h / 2 ? 'alt' : 'ust';
      konum = { yatay, dikey, x: Math.round(yatay === 'sol' ? sol : w - sol - once.width), y: Math.round(dikey === 'ust' ? ust : h - ust - once.height) };
      el.style.transform = ''; uygula(konum); kaydir(once);
      gonder({ tur: 'ayar-koy', ad: 'konum-' + anahtar, deger: konum });
    };
    tutamak.addEventListener('pointerup', birak); tutamak.addEventListener('pointercancel', birak);
    tutamak.addEventListener('click', ev => { if (yut) { ev.stopPropagation(); ev.preventDefault(); } }, true);
    // çift tıklama: varsayılan köşesine döner
    tutamak.addEventListener('dblclick', () => { const once = el.getBoundingClientRect(); konum = null; ['left', 'right', 'top', 'bottom'].forEach(k => { el.style[k] = ''; }); kaydir(once); gonder({ tur: 'ayar-koy', ad: 'konum-' + anahtar, deger: null }); });
  };
})();
