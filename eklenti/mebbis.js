// Sinyal MEBBİS Yardımcısı · MEBBİS tarafı. Kursun kendi MEBBİS oturumunda çalışır; şifre istemez, saklamaz.
// 1) Sinyal’in sıraya koyduğu işin alanlarını açık formda etiketlerinden bulup doldurur; bulamadığını kullanıcı bir kez gösterir (öğrenilir).
// 2) Sayfadaki listeyi (tablo) Sinyal’e aktarır. Kaydet’e ve güvenlik koduna her zaman kullanıcı basar; eklenti formu göndermez.
(() => {
  if (window.__sinyalMebbis) return; window.__sinyalMebbis = true;
  const UST = window === window.top, ISARET = 'sinyal-mebbis';
  const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
  const gonder = m => new Promise(ok => { try { chrome.runtime.sendMessage(m, ok); } catch (x) { ok(null); } });

  /* ---------- her çerçevede: alan bulma, doldurma, tablo okuma, öğretme ---------- */
  const gorunur = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const alanlar = () => [...document.querySelectorAll('input, select, textarea')].filter(el => !/^(hidden|submit|button|image|reset|checkbox|radio|file|password)$/i.test(el.type || '') && !el.disabled && !el.readOnly && gorunur(el));
  function etiketler(el) {
    const l = [];
    (el.labels ? [...el.labels] : []).forEach(x => l.push(x.textContent));
    ['aria-label', 'placeholder', 'title', 'name', 'id'].forEach(a => el.getAttribute(a) && l.push(el.getAttribute(a)));
    const td = el.closest('td, th'); if (td) { let p = td.previousElementSibling; for (let i = 0; p && i < 2; i++, p = p.previousElementSibling) l.push(p.textContent); }
    const tr = el.closest('tr'); if (tr && tr.cells && tr.cells[0] && !tr.cells[0].contains(el)) l.push(tr.cells[0].textContent);
    let s = el.previousSibling; for (let i = 0; s && i < 3; i++, s = s.previousSibling) if (s.textContent && s.textContent.trim()) { l.push(s.textContent); break; }
    const kap = el.closest('div, span'); if (kap && kap.previousElementSibling) l.push(kap.previousElementSibling.textContent);
    return l.map(x => norm(String(x).slice(0, 80))).filter(Boolean);
  }
  const secici = el => el.id ? '#' + CSS.escape(el.id) : el.name ? `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]` : null;
  function bul(alan, esleme) {
    const anahtar = location.pathname + '|' + norm(alan.etiket);
    if (esleme[anahtar]) { const el = document.querySelector(esleme[anahtar]); if (el) return el; }
    const es = [alan.etiket, ...(alan.es || [])].map(norm).filter(Boolean);
    let en = null, ep = 0;
    alanlar().forEach(el => { const et = etiketler(el); let p = 0; et.forEach((t, i) => es.forEach(x => { const agirlik = i < 2 ? 1 : .8; if (t === x) p = Math.max(p, 3 * agirlik); else if (x.length > 3 && (t.includes(x) || (t.length > 3 && x.includes(t)))) p = Math.max(p, 2 * agirlik); })); if (p > ep) { ep = p; en = el; } });
    return ep >= 1.6 ? en : null;
  }
  function yaz(el, deger) {
    const v = String(deger ?? '');
    if (el.tagName === 'SELECT') {
      const n = norm(v), o = [...el.options].find(x => norm(x.textContent) === n || norm(x.value) === n) || [...el.options].find(x => n && (norm(x.textContent).includes(n) || (norm(x.textContent).length > 2 && n.includes(norm(x.textContent)))));
      if (!o) return false; el.value = o.value;
    } else {
      const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value'); set && set.set ? set.set.call(el, v) : (el.value = v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true }));
    el.style.outline = '3px solid #2fae5a'; el.style.outlineOffset = '1px'; setTimeout(() => { el.style.outline = ''; }, 4000);
    return true;
  }
  async function doldur(is) {
    const esleme = await gonder({ tur: 'esleme-al' }) || {};
    // seçim kutuları sayfayı yenileyebilir (MEBBİS’te seçim değişince sayfa yeniden yüklenen formlar var): önce metin alanları
    const l = is.alanlar.map(a => ({ a, el: bul(a, esleme) })), sonuc = {};
    [...l.filter(x => !x.el || x.el.tagName !== 'SELECT'), ...l.filter(x => x.el && x.el.tagName === 'SELECT')].forEach(({ a, el }) => { sonuc[a.etiket] = el ? (yaz(el, a.deger) ? 'ok' : 'secenek') : 'yok'; });
    return sonuc;
  }
  function tablolar() {
    // liste tabloları: içinde form alanı olmayan, en az 3 sütunlu; iç içe tablolarda en içteki
    return [...document.querySelectorAll('table')].filter(t => !t.querySelector('input:not([type=hidden]):not([type=checkbox]), select, textarea, table')).map(t => {
      const sat = [...t.rows].map(r => [...r.cells].map(c => c.textContent.replace(/\s+/g, ' ').trim()));
      return sat.filter(r => r.some(Boolean));
    }).filter(s => s.length >= 2 && s[0].length >= 3 && !s.some(r => r.length > 40));
  }
  let ogrenilen = null;
  document.addEventListener('click', ev => {
    if (!ogrenilen) return;
    const el = ev.target.closest('input, select, textarea'); if (!el) return;
    const s = secici(el); if (!s) return;
    ev.preventDefault(); ev.stopPropagation();
    const a = ogrenilen; ogrenilen = null; document.body.style.cursor = '';
    gonder({ tur: 'esleme-koy', anahtar: location.pathname + '|' + norm(a.etiket), secici: s }).then(() => { yaz(el, a.deger); window.top.postMessage({ [ISARET]: 'ogrenildi', etiket: a.etiket }, '*'); });
  }, true);
  // üst çerçeveden gelen komutlar
  window.addEventListener('message', async ev => {
    const d = ev.data; if (!d || !d[ISARET] || ev.source !== window.top) return;
    if (d[ISARET] === 'doldur') { const r = await doldur(d.is); window.top.postMessage({ [ISARET]: 'doldu', no: d.no, sonuc: r }, '*'); }
    if (d[ISARET] === 'tablo') window.top.postMessage({ [ISARET]: 'tablolar', no: d.no, tablolar: tablolar(), baslik: document.title }, '*');
    if (d[ISARET] === 'ogret') { ogrenilen = d.alan; document.body.style.cursor = 'crosshair'; }
    if (d[ISARET] === 'ogret-iptal') { ogrenilen = null; document.body.style.cursor = ''; }
  });
  if (!UST) return;

  /* ---------- üst çerçeve: panel ---------- */
  const cerceveler = () => { const l = [window]; const gez = w => { for (let i = 0; i < w.frames.length; i++) { try { l.push(w.frames[i]); gez(w.frames[i]); } catch (x) { } } }; gez(window); return l; };
  let no = 0;
  const herkese = (komut, ek, bekle = 900) => new Promise(ok => {
    const n = ++no, gelen = [];
    const dinle = ev => { if (ev.data && ev.data[ISARET] && ev.data.no === n) gelen.push(ev.data); };
    window.addEventListener('message', dinle);
    cerceveler().forEach(w => w.postMessage({ [ISARET]: komut, no: n, ...ek }, '*'));
    setTimeout(() => { window.removeEventListener('message', dinle); ok(gelen); }, bekle);
  });

  const kok = document.createElement('div'); kok.id = 'sinyal-mebbis-panel';
  const g = kok.attachShadow({ mode: 'open' });
  g.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    .p{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:340px;max-height:78vh;display:flex;flex-direction:column;background:#fff;color:#1d1d1d;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.28);border:1px solid #dcdcdc;font-size:13.5px}
    .b{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#14284b;color:#fff;border-radius:14px 14px 0 0;cursor:pointer}.b b{flex:1;font-size:14px}.b i{width:14px;height:14px;background:#f2b705;transform:rotate(45deg);border-radius:2px}
    .g{padding:10px 12px;overflow:auto}.k{border:1px solid #e3e3e3;border-radius:10px;padding:8px 10px;margin-bottom:8px;cursor:pointer}.k.s{border-color:#2f6fde;background:#f2f6ff}.k small{display:block;color:#666}
    .a{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;padding:4px 0;border-bottom:1px solid #f0f0f0}.a span{color:#555}.a b{font-weight:600;word-break:break-all}.a em{grid-column:1/-1;font-style:normal;font-size:12px}
    .ok{color:#1f8a46}.no{color:#c0392b}button{border:0;border-radius:8px;padding:8px 10px;font-weight:600;cursor:pointer;font-size:13px}.ana{background:#2f6fde;color:#fff}.cz{background:#eef0f3;color:#1d1d1d}.kc{padding:3px 8px;font-size:12px}
    .r{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.n{font-size:12px;color:#666;margin-top:8px;line-height:1.4}.gizli .g{display:none}</style>
    <div class="p"><div class="b" data-k><i></i><b>Sinyal MEBBİS Yardımcısı</b><span data-sayi></span></div><div class="g" data-g></div></div>`;
  document.documentElement.appendChild(kok);
  const p = g.querySelector('.p'), govde = g.querySelector('[data-g]');
  const durum = { isler: [], sec: null, sonuc: {}, mesaj: '' };
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TUR = { kayit: 'Kursiyer kaydı', program: 'Direksiyon programı', sinav: 'Sınav bildirimi', odeme: 'Ödeme' };
  async function yukle() { const q = await gonder({ tur: 'kuyruk-al' }) || { isler: [] }; durum.isler = (q.isler || []).filter(x => !x.bitti); if (durum.sec && !durum.isler.some(x => x.id === durum.sec)) durum.sec = null; ciz(); }
  function ciz() {
    g.querySelector('[data-sayi]').textContent = durum.isler.length ? durum.isler.length + ' iş' : '';
    const is = durum.isler.find(x => x.id === durum.sec);
    if (is) {
      govde.innerHTML = `<button class="cz kc" data-geri>← Liste</button><p style="margin:8px 0 4px"><b>${e(is.baslik)}</b><small style="display:block;color:#666">${e(TUR[is.tur] || is.tur)} · MEBBİS’te ilgili formu açın, sonra doldurun.</small></p>
        ${is.alanlar.map((a, i) => { const s = durum.sonuc[a.etiket]; return `<div class="a"><span>${e(a.etiket)}</span><b>${e(a.deger)}</b>${s === 'ok' ? '<em class="ok">✓ dolduruldu</em>' : s === 'yok' ? `<em class="no">Alan bulunamadı · <button class="cz kc" data-ogret="${i}">Alanı göster</button></em>` : s === 'secenek' ? `<em class="no">Listede bu seçenek yok; elle seçin</em>` : ''}</div>`; }).join('')}
        <div class="r"><button class="ana" data-doldur>Formu doldur</button><button class="cz" data-bitti>Kaydettim, sonraki</button></div>
        <p class="n">${e(durum.mesaj)}Kontrol edin; Kaydet’e ve güvenlik koduna siz basarsınız. Bulunamayan alanı bir kez gösterirseniz bir dahakine kendisi bulur.</p>`;
    } else {
      govde.innerHTML = `${durum.isler.length ? durum.isler.map(x => `<div class="k" data-is="${e(x.id)}"><b>${e(x.baslik)}</b><small>${e(TUR[x.tur] || x.tur)} · ${x.alanlar.length} alan</small></div>`).join('') : '<p class="n" style="margin-top:0">Sırada iş yok. Sinyal’de MEB işlemleri › “MEBBİS Yardımcısına gönder”e basın.</p>'}
        <div class="r"><button class="cz" data-tablo>Bu sayfadaki listeyi Sinyal’e aktar</button><button class="cz kc" data-yenile>Yenile</button></div>
        <p class="n">${e(durum.mesaj)}Liste aktarımı: MEBBİS’te kursiyer, araç ya da personel listesini açın; tablo Sinyal’in aktarım ekranına gelir, orada kontrol edip kaydedersiniz.</p>`;
    }
    durum.mesaj = '';
  }
  g.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.closest('[data-k]')) { p.classList.toggle('gizli'); return; }
    if (t.closest('[data-yenile]')) return yukle();
    const k = t.closest('[data-is]'); if (k) { durum.sec = k.dataset.is; durum.sonuc = {}; return ciz(); }
    if (t.closest('[data-geri]')) { durum.sec = null; return ciz(); }
    if (t.closest('[data-doldur]')) {
      const is = durum.isler.find(x => x.id === durum.sec); const r = await herkese('doldur', { is });
      durum.sonuc = {}; r.forEach(x => Object.entries(x.sonuc || {}).forEach(([a, s]) => { if (durum.sonuc[a] !== 'ok') durum.sonuc[a] = s === 'yok' && durum.sonuc[a] ? durum.sonuc[a] : s; }));
      const ok = Object.values(durum.sonuc).filter(s => s === 'ok').length; durum.mesaj = `${ok}/${is.alanlar.length} alan dolduruldu. `; return ciz();
    }
    const og = t.closest('[data-ogret]'); if (og) { const is = durum.isler.find(x => x.id === durum.sec), a = is.alanlar[+og.dataset.ogret]; cerceveler().forEach(w => w.postMessage({ [ISARET]: 'ogret', alan: a }, '*')); durum.mesaj = `“${a.etiket}” alanına tıklayın. `; return ciz(); }
    if (t.closest('[data-bitti]')) { await gonder({ tur: 'is-bitti', id: durum.sec }); durum.sec = null; durum.sonuc = {}; durum.mesaj = 'İş Sinyal’de işlendi olarak işaretlenecek. '; return yukle(); }
    if (t.closest('[data-tablo]')) {
      const r = await herkese('tablo', {}), hepsi = r.flatMap(x => (x.tablolar || []).map(s => ({ s, baslik: x.baslik })));
      if (!hepsi.length) { durum.mesaj = 'Bu sayfada aktarılacak tablo bulunamadı. '; return ciz(); }
      const en = hepsi.sort((a, b) => b.s.length * b.s[0].length - a.s.length * a.s[0].length)[0];
      await gonder({ tur: 'tablo-koy', tablo: { satirlar: en.s, baslik: en.baslik, adres: location.pathname } });
      durum.mesaj = `${en.s.length - 1} satırlık liste Sinyal’e gönderildi; Sinyal sekmesine geçin. `; return ciz();
    }
  });
  window.addEventListener('message', ev => { if (ev.data && ev.data[ISARET] === 'ogrenildi') { durum.sonuc[ev.data.etiket] = 'ok'; durum.mesaj = 'Alan öğrenildi. '; ciz(); } });
  yukle(); setInterval(() => { if (!durum.sec) yukle(); }, 5000);
})();
