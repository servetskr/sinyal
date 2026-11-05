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
    // Giriş sayfasında (şifre alanı olan çerçeve) asla doldurma: kullanıcı adı kutusuna kursiyer bilgisi yazılmasın
    if (document.querySelector('input[type=password]')) return {};
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
  // kısayollar her çerçevede yakalanır, panele iletilir: Alt+Shift+D doldur, Alt+Shift+S kaydettim-sonraki, Alt+Shift+N atla
  document.addEventListener('keydown', ev => { if (ev.altKey && ev.shiftKey && /^Key[DSN]$/.test(ev.code)) { ev.preventDefault(); window.top.postMessage({ [ISARET]: 'kisayol', k: ev.code }, '*'); } }, true);
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
  const girisSayfasi = () => cerceveler().some(w => { try { return !!w.document.querySelector('input[type=password]'); } catch (x) { return false; } });

  // MEBBİS'e yazılacak iş türleri ve MEBBİS'ten alınabilecek listeler
  const GIR = [
    ['kayit', 'Kursiyer kaydı', 'kursiyer kayıt'],
    ['program', 'Direksiyon programı', 'direksiyon eğitimi programı giriş'],
    ['sinav', 'Sınav bildirimi', 'direksiyon sınavına kursiyer bildirimi'],
    ['odeme', 'Tahsilat', 'kursiyer ödeme bilgisi giriş'],
  ];
  const AL = [
    ['kursiyer', 'Kursiyer listesi', 'kayıtlı kursiyer listesi', 'Geçişte kursiyerleri Sinyal’e alır.'],
    ['taksit', 'Ödemeler', 'kursiyer ödeme listesi', 'Ödenen ve kalan taksitleri alır.'],
    ['ogretmen', 'Usta öğreticiler', 'personel (usta öğretici) listesi', 'Öğretmenleri Sinyal’e alır.'],
    ['arac', 'Araçlar', 'araç listesi', 'Araçları plakalarıyla alır.'],
    ['sinav', 'Sınav sonuçları', 'e-sınav ya da direksiyon sınavı sonuç listesi', 'Sonuçlar Sinyal’in sonuç penceresine dolar; siz kaydedersiniz.'],
    ['mutabakat', 'MEBBİS ile karşılaştır', 'kursiyer listesi', 'Sinyal’de olup MEBBİS’te olmayanları ve farkları gösterir.'],
  ];
  const AD = Object.fromEntries(GIR.map(x => [x[0], x[1]]));

  const kok = document.createElement('div'); kok.id = 'sinyal-mebbis-panel';
  const g = kok.attachShadow({ mode: 'open' });
  g.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0}
    .p{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:360px;max-height:80vh;display:flex;flex-direction:column;background:#fff;color:#1d1d1d;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.28);border:1px solid #dcdcdc;font-size:13.5px;line-height:1.35}
    .b{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#14284b;color:#fff;border-radius:14px 14px 0 0;cursor:pointer;user-select:none}.b b{flex:1;font-size:14px}.b i{width:14px;height:14px;background:#f2b705;transform:rotate(45deg);border-radius:2px;flex:none}.b small{opacity:.85}
    .gizli .b{border-radius:14px}.gizli .g{display:none}
    .g{padding:10px 12px 12px;overflow:auto}
    h4{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;margin:12px 0 6px}h4:first-child{margin-top:2px}
    .k{display:flex;align-items:center;gap:8px;border:1px solid #e3e3e3;border-radius:10px;padding:8px 10px;margin-bottom:6px;cursor:pointer;background:#fff;width:100%;text-align:left;font-size:13.5px;font-weight:400}
    .k:hover{border-color:#2f6fde;background:#f6f9ff}.k div{flex:1;min-width:0}.k b{display:block;font-weight:600}.k small{display:block;color:#666;font-size:12px}
    .k .say{min-width:26px;text-align:center;font-weight:700;background:#14284b;color:#fff;border-radius:20px;padding:2px 7px;font-size:12px}.k .say.bos{background:#e5e7eb;color:#6b7280}
    .k.sonra{opacity:.55}.k.sec{border-color:#2f6fde;background:#f2f6ff}
    .one{border:1px solid #f2b705;background:#fff8e0;border-radius:10px;padding:9px 10px;margin-bottom:8px}.one b{display:block}
    .uy{border:1px solid #f0c2bd;background:#fdf0ee;color:#7a2318;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:12.5px}
    .ust{display:flex;align-items:center;gap:8px;margin-bottom:6px}.ust b{flex:1;font-size:14px}.ust small{color:#666}
    .a{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0}.a span{color:#555}.a b{font-weight:600;word-break:break-all;cursor:copy;text-align:right}.a b:hover{color:#2f6fde}.a em{grid-column:1/-1;font-style:normal;font-size:12px}
    .ok{color:#1f8a46}.no{color:#c0392b}
    button{border:0;border-radius:8px;padding:8px 10px;font-weight:600;cursor:pointer;font-size:13px}.ana{background:#2f6fde;color:#fff}.ana[disabled]{background:#a9bde6;cursor:default}.cz{background:#eef0f3;color:#1d1d1d}.kc{padding:4px 8px;font-size:12px}.geri{background:none;padding:2px 0;color:#2f6fde}
    .r{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.n{font-size:12px;color:#666;margin-top:8px}.m{font-size:12.5px;color:#14284b;background:#eef4ff;border-radius:8px;padding:7px 9px;margin-top:8px}
    input.ara{width:100%;border:1px solid #d6d9de;border-radius:8px;padding:7px 9px;font-size:13px;margin:4px 0 8px}
    .bar{height:5px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:2px 0 8px}.bar i{display:block;height:100%;background:#1f8a46}
    kbd{font:11px ui-monospace,monospace;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;padding:0 4px;color:#374151}
    </style>
    <div class="p" lang="tr"><div class="b" data-k><i></i><b>Sinyal MEBBİS Yardımcısı</b><small data-sayi></small></div><div class="g" data-g></div></div>`;
  (document.body || document.documentElement).appendChild(kok);
  const p = g.querySelector('.p'), govde = g.querySelector('[data-g]');
  const durum = { ekran: 'ana', tur: null, sec: null, al: null, sonuc: {}, mesaj: '', ara: '', q: { isler: [] }, sayfa: {}, tablo: null, temizle: false };
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bekleyen = tur => durum.q.isler.filter(x => x.tur === tur && !x.bitti);
  const biten = tur => durum.q.isler.filter(x => x.tur === tur && x.bitti).length;
  const saat = t => t ? new Date(t).toTimeString().slice(0, 5) : '';

  async function yukle() {
    durum.q = await gonder({ tur: 'kuyruk-al' }) || { isler: [] }; durum.q.isler = durum.q.isler || [];
    durum.sayfa = await gonder({ tur: 'sayfa-al' }) || {};
    if (durum.sec && !durum.q.isler.some(x => x.id === durum.sec && !x.bitti)) { durum.sec = null; if (durum.ekran === 'is') durum.ekran = 'grup'; }
    ciz();
  }
  async function tara() {
    const r = await herkese('tablo', {}), hepsi = r.flatMap(x => (x.tablolar || []).map(s => ({ s, baslik: x.baslik })));
    durum.tablo = hepsi.sort((a, b) => b.s.length * b.s[0].length - a.s.length * a.s[0].length)[0] || null; ciz();
  }
  function isAc(id) { durum.sec = id; durum.sonuc = {}; durum.ekran = 'is'; ciz(); }
  function sonrakiId(tur, sonra) {
    const l = bekleyen(tur); if (!l.length) return null;
    const i = l.findIndex(x => x.id === sonra); return (i >= 0 ? l[(i + 1) % l.length] : l[0]).id;
  }

  function ciz() {
    const toplam = durum.q.isler.filter(x => !x.bitti).length;
    g.querySelector('[data-sayi]').textContent = toplam ? toplam + ' iş' : '';
    const giris = girisSayfasi();
    let h = '';
    if (durum.ekran === 'ana') {
      if (giris) h += `<div class="uy"><b>MEBBİS giriş sayfası.</b> Kendi şifrenizle girin. Yardımcı bu sayfada hiçbir şey doldurmaz.</div>`;
      const burada = GIR.find(([t]) => durum.sayfa[t] && durum.sayfa[t].yol === location.pathname && bekleyen(t).length);
      if (burada && !giris) h += `<div class="one"><b>Bu sayfa: ${e(burada[1])}</b><small>${bekleyen(burada[0]).length} iş bekliyor</small><div class="r"><button class="ana" data-basla="${burada[0]}">Kaldığım yerden devam et</button></div></div>`;
      h += `<h4>MEBBİS’e bilgi gir</h4>`;
      if (!durum.q.isler.length) h += `<p class="n" style="margin:0 0 6px">Sırada iş yok. Sinyal’de <b>MEB işlemleri › MEBBİS Yardımcısına gönder</b>’e basın.</p>`;
      else h += GIR.map(([t, ad]) => { const n = bekleyen(t).length, b = biten(t); return `<button class="k ${n ? '' : 'sonra'}" data-grup="${t}"><div><b>${ad}</b><small>${n ? n + ' bekliyor' : 'Bekleyen yok'}${b ? ' · ' + b + ' bitti' : ''}</small></div><span class="say ${n ? '' : 'bos'}">${n}</span></button>`; }).join('');
      h += `<h4>MEBBİS’ten Sinyal’e al</h4>` + AL.map(([t, ad, , a]) => `<button class="k" data-al="${t}"><div><b>${ad}</b><small>${a}</small></div></button>`).join('');
      h += `<div class="r"><button class="cz kc" data-yenile>Yenile</button>${durum.q.isler.length ? `<button class="cz kc" data-temizle>${durum.temizle ? 'Emin misiniz? Sırayı temizle' : 'Sırayı temizle'}</button>` : ''}</div>`;
      if (durum.q.kurs) h += `<p class="n">${e(durum.q.kurs)} · Sinyal’den ${saat(durum.q.zaman)}’de gönderildi.</p>`;
    }
    if (durum.ekran === 'grup') {
      const [t, ad, form] = GIR.find(x => x[0] === durum.tur), l = bekleyen(t), b = biten(t), kayitli = durum.sayfa[t];
      const ara = durum.ara.toLocaleLowerCase('tr'), goster = ara ? l.filter(x => x.baslik.toLocaleLowerCase('tr').includes(ara)) : l;
      h += `<button class="geri" data-ana>← Ana menü</button><div class="ust" style="margin-top:6px"><b>${ad}</b><small>${l.length} bekliyor · ${b} bitti</small></div><div class="bar"><i style="width:${l.length + b ? Math.round(100 * b / (l.length + b)) : 0}%"></i></div>`;
      h += `<p class="n" style="margin:0 0 6px">MEBBİS’te <b>${form}</b> ekranını açın, sonra işe başlayın.</p>`;
      if (kayitli && kayitli.yol !== location.pathname) h += `<div class="r" style="margin:0 0 8px"><button class="cz kc" data-formac="${t}">Son kullandığınız formu aç</button></div>`;
      if (!l.length) h += `<p class="m">Bu türde bekleyen iş kalmadı.</p>`;
      else {
        h += `<div class="r" style="margin:0 0 8px"><button class="ana" data-basla="${t}">Sıradakine başla</button></div>`;
        if (l.length > 6) h += `<input class="ara" data-ara placeholder="Ad, tarih ya da tutar ara" value="${e(durum.ara)}">`;
        h += goster.slice(0, 60).map(x => `<button class="k" data-is="${e(x.id)}"><div><b>${e(x.baslik)}</b><small>${x.alanlar.length} alan</small></div></button>`).join('') + (goster.length > 60 ? `<p class="n">+${goster.length - 60} iş daha; aramayı daraltın.</p>` : '');
      }
    }
    if (durum.ekran === 'is') {
      const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) { durum.ekran = 'grup'; return ciz(); }
      const l = bekleyen(is.tur), sira = l.findIndex(x => x.id === is.id) + 1;
      h += `<button class="geri" data-grup="${is.tur}">← ${AD[is.tur] || is.tur}</button><div class="ust" style="margin-top:6px"><b>${e(is.baslik)}</b><small>${sira}/${l.length}</small></div>`;
      if (giris) h += `<div class="uy">Bu MEBBİS giriş sayfası. Önce kendi şifrenizle girin ve ilgili formu açın.</div>`;
      h += is.alanlar.map((a, i) => { const s = durum.sonuc[a.etiket]; return `<div class="a"><span>${e(a.etiket)}</span><b data-kopya="${i}" title="Kopyalamak için tıklayın">${e(a.deger)}</b>${s === 'ok' ? '<em class="ok">✓ dolduruldu</em>' : s === 'yok' ? `<em class="no">Alan bulunamadı · <button class="cz kc" data-ogret="${i}">Alanı göster</button> ya da değere tıklayıp kopyalayın</em>` : s === 'secenek' ? '<em class="no">Listede bu seçenek yok; elle seçin</em>' : ''}</div>`; }).join('');
      h += `<div class="r"><button class="ana" data-doldur ${giris ? 'disabled' : ''}>Formu doldur</button><button class="cz" data-bitti>Kaydettim, sonraki</button><button class="cz" data-atla>Atla</button></div>`;
      h += durum.mesaj ? `<p class="m">${e(durum.mesaj)}</p>` : '';
      h += `<p class="n">Kontrol edin; Kaydet’e ve güvenlik koduna siz basarsınız. Kısayollar: <kbd>Alt+Shift+D</kbd> doldur · <kbd>Alt+Shift+S</kbd> kaydettim · <kbd>Alt+Shift+N</kbd> atla</p>`;
    }
    if (durum.ekran === 'al') {
      const [t, ad, liste, a] = AL.find(x => x[0] === durum.al), tb = durum.tablo;
      h += `<button class="geri" data-ana>← Ana menü</button><div class="ust" style="margin-top:6px"><b>${ad}</b></div><p class="n" style="margin:0 0 8px">${a}</p>`;
      h += `<p style="margin-bottom:6px">1. MEBBİS’te <b>${liste}</b> ekranını açın ve listeyi getirin. Sayfalama varsa tümünü gösterin.</p><p>2. Liste ekrandayken aşağıdaki düğmeye basın.</p>`;
      h += tb ? `<p class="m">Bu sayfada <b>${tb.s.length - 1} satırlık</b> liste bulundu: ${e(tb.s[0].slice(0, 5).join(' · '))}${tb.s[0].length > 5 ? ' …' : ''}</p>` : `<p class="m">Bu sayfada henüz liste görünmüyor.</p>`;
      h += `<div class="r"><button class="ana" data-gonder ${tb ? '' : 'disabled'}>Listeyi Sinyal’e gönder</button><button class="cz" data-tara>Yeniden tara</button></div>`;
      h += durum.mesaj ? `<p class="m">${e(durum.mesaj)}</p>` : '';
      h += `<p class="n">Sinyal hiçbir şeyi onayınız olmadan kaydetmez; liste Sinyal’de kontrol ekranına gelir.</p>`;
    }
    govde.innerHTML = h; durum.mesaj = '';
    const ara = govde.querySelector('[data-ara]'); if (ara && durum.araOdak) { ara.focus(); ara.setSelectionRange(ara.value.length, ara.value.length); }
  }

  async function panelDoldur() {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) return;
    if (girisSayfasi()) { durum.mesaj = 'Önce MEBBİS’e girin ve ilgili formu açın.'; return ciz(); }
    const r = await herkese('doldur', { is });
    durum.sonuc = {}; r.forEach(x => Object.entries(x.sonuc || {}).forEach(([a, s]) => { if (durum.sonuc[a] !== 'ok') durum.sonuc[a] = s === 'yok' && durum.sonuc[a] ? durum.sonuc[a] : s; }));
    const ok = Object.values(durum.sonuc).filter(s => s === 'ok').length; durum.mesaj = `${ok}/${is.alanlar.length} alan dolduruldu.`; ciz();
  }
  async function panelBitti() {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) return;
    const sonra = sonrakiId(is.tur, is.id);
    await gonder({ tur: 'is-bitti', id: is.id }); await gonder({ tur: 'sayfa-koy', is: is.tur, yol: location.pathname, adres: location.href });
    await yukle();
    const yeni = sonra && sonra !== is.id && bekleyen(is.tur).some(x => x.id === sonra) ? sonra : null;
    if (yeni) { isAc(yeni); durum.mesaj = 'Kaydedildi olarak işaretlendi. Sıradaki iş açıldı.'; ciz(); }
    else { durum.ekran = 'grup'; durum.tur = is.tur; durum.sec = null; ciz(); }
  }
  function panelAtla() { const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) return; const s = sonrakiId(is.tur, is.id); if (s && s !== is.id) isAc(s); else { durum.mesaj = 'Bu türde başka iş yok.'; ciz(); } }

  g.addEventListener('input', ev => { if (ev.target.matches('[data-ara]')) { durum.ara = ev.target.value; durum.araOdak = true; ciz(); durum.araOdak = false; } });
  g.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.closest('[data-k]')) { p.classList.toggle('gizli'); gonder({ tur: 'ayar-koy', ad: 'kapali', deger: p.classList.contains('gizli') }); return; }
    if (t.closest('[data-yenile]')) return yukle();
    if (t.closest('[data-ana]')) { Object.assign(durum, { ekran: 'ana', sec: null, al: null, ara: '' }); return ciz(); }
    if (t.closest('[data-temizle]')) { if (!durum.temizle) { durum.temizle = true; ciz(); setTimeout(() => { durum.temizle = false; ciz(); }, 4000); return; } durum.temizle = false; await gonder({ tur: 'kuyruk-temizle' }); return yukle(); }
    const gr = t.closest('[data-grup]'); if (gr) { Object.assign(durum, { ekran: 'grup', tur: gr.dataset.grup, sec: null, ara: '' }); return ciz(); }
    const ba = t.closest('[data-basla]'); if (ba) { durum.tur = ba.dataset.basla; const id = sonrakiId(durum.tur); return id ? isAc(id) : ciz(); }
    const fa = t.closest('[data-formac]'); if (fa) { const s = durum.sayfa[fa.dataset.formac]; if (s && /^https:\/\/mebbis\.meb\.gov\.tr\//.test(s.adres)) location.href = s.adres; return; }
    const k = t.closest('[data-is]'); if (k) return isAc(k.dataset.is);
    const al = t.closest('[data-al]'); if (al) { Object.assign(durum, { ekran: 'al', al: al.dataset.al, tablo: null }); ciz(); return tara(); }
    if (t.closest('[data-tara]')) return tara();
    if (t.closest('[data-doldur]')) return panelDoldur();
    if (t.closest('[data-bitti]')) return panelBitti();
    if (t.closest('[data-atla]')) return panelAtla();
    const kp = t.closest('[data-kopya]'); if (kp) { const is = durum.q.isler.find(x => x.id === durum.sec), a = is && is.alanlar[+kp.dataset.kopya]; if (a) { try { await navigator.clipboard.writeText(a.deger); durum.mesaj = `“${a.etiket}” kopyalandı; MEBBİS’te alana yapıştırın.`; } catch (x) { durum.mesaj = 'Kopyalanamadı; değeri elle yazın.'; } ciz(); } return; }
    const og = t.closest('[data-ogret]'); if (og) { const is = durum.q.isler.find(x => x.id === durum.sec), a = is.alanlar[+og.dataset.ogret]; cerceveler().forEach(w => w.postMessage({ [ISARET]: 'ogret', alan: a }, '*')); durum.mesaj = `MEBBİS’te “${a.etiket}” alanına tıklayın; Yardımcı bir dahakine kendisi bulur.`; return ciz(); }
    if (t.closest('[data-gonder]')) {
      if (!durum.tablo) return;
      const [, ad] = AL.find(x => x[0] === durum.al);
      await gonder({ tur: 'tablo-koy', tablo: { satirlar: durum.tablo.s, baslik: durum.tablo.baslik, adres: location.pathname, amac: durum.al } });
      durum.mesaj = `${durum.tablo.s.length - 1} satır gönderildi. Sinyal sekmesine geçin; ${ad.toLocaleLowerCase('tr')} sizi kontrol ekranında bekliyor.`; return ciz();
    }
  });
  window.addEventListener('message', ev => {
    const d = ev.data; if (!d || !d[ISARET]) return;
    if (d[ISARET] === 'ogrenildi') { durum.sonuc[d.etiket] = 'ok'; durum.mesaj = 'Alan öğrenildi.'; ciz(); }
    if (d[ISARET] === 'kisayol' && durum.ekran === 'is') { if (d.k === 'KeyD') panelDoldur(); if (d.k === 'KeyS') panelBitti(); if (d.k === 'KeyN') panelAtla(); }
  });
  gonder({ tur: 'ayar-al', ad: 'kapali' }).then(k => { if (k) p.classList.add('gizli'); });
  yukle(); setInterval(() => { if (durum.ekran !== 'is' && !g.activeElement) yukle(); }, 5000);
})();
