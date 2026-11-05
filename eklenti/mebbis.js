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
  // her çerçevede: kısayollar (Alt+Shift+D doldur, S kaydettim, N atla) ve MEBBİS'in Kaydet düğmesine basıldığını panele bildirme
  document.addEventListener('keydown', ev => { if (ev.altKey && ev.shiftKey && /^Key[DSN]$/.test(ev.code)) { ev.preventDefault(); window.top.postMessage({ [ISARET]: 'kisayol', k: ev.code }, '*'); } }, true);
  const KAYDET = /kaydet|ekle|güncelle|onayla/i;
  document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('input[type=submit], input[type=button], input[type=image], button, a'); if (!b) return; const t = String(b.value || b.textContent || b.title || '').trim(); if (t && t.length < 30 && KAYDET.test(t)) window.top.postMessage({ [ISARET]: 'kaydet-basildi' }, '*'); }, true);
  window.addEventListener('message', ev => { const d = ev.data; if (d && d[ISARET] === 'metin' && ev.source === window.top) window.top.postMessage({ [ISARET]: 'metin-cevap', no: d.no, metin: document.body ? document.body.innerText.slice(0, 20000) : '', alan: alanlar().length }, '*'); });
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
  const sayfaMetni = async () => { const r = await herkese('metin', {}, 600); return { metin: r.map(x => x.metin).join('\n'), alan: r.reduce((a, x) => a + (x.alan || 0), 0) }; };
  const BASARI = /başarı(yla|lı)|kaydedil(di|miştir)|işlem(iniz)? tamamlan|eklendi|güncellendi/i;
  const HATA = /hata|geçersiz|zorunlu alan|boş bırakılamaz|hatalı|başarısız|bulunamadı/i;

  // iş türleri: aciliyet eşitse sınav > program > kayıt > tahsilat
  const TURLER = [
    ['sinav', 'Sınav bildirimi', 'direksiyon sınavına kursiyer bildirimi'],
    ['program', 'Direksiyon programı', 'direksiyon eğitimi programı giriş'],
    ['kayit', 'Kursiyer kaydı', 'kursiyer kayıt'],
    ['odeme', 'Tahsilat', 'kursiyer ödeme bilgisi giriş'],
  ];
  const AD = Object.fromEntries(TURLER.map(x => [x[0], x[1]])), FORM = Object.fromEntries(TURLER.map(x => [x[0], x[2]])), SIRA = Object.fromEntries(TURLER.map((x, i) => [x[0], i]));
  const AL = [
    ['kursiyer', 'Kursiyer listesi', 'kayıtlı kursiyer listesi', 'Geçişte kursiyerleri Sinyal’e alır.'],
    ['sinav', 'Sınav sonuçları', 'e-sınav ya da direksiyon sınavı sonuç listesi', 'Sonuçlar Sinyal’in sonuç penceresine dolar.'],
    ['mutabakat', 'MEBBİS ile karşılaştır', 'kursiyer listesi', 'Sinyal’de olup MEBBİS’te olmayanları gösterir.'],
    ['taksit', 'Ödemeler', 'kursiyer ödeme listesi', 'Ödenen ve kalan taksitleri alır.'],
    ['ogretmen', 'Usta öğreticiler', 'personel (usta öğretici) listesi', 'Öğretmenleri Sinyal’e alır.'],
    ['arac', 'Araçlar', 'araç listesi', 'Araçları plakalarıyla alır.'],
  ];
  const bugun = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const kalan = t => t ? Math.round((new Date(t + 'T12:00:00') - new Date(bugun() + 'T12:00:00')) / 864e5) : 99;
  const etiket = t => { if (!t) return ['Acil değil', '']; const k = kalan(t); return k < 0 ? ['Süresi geçti', 'gecti'] : k === 0 ? ['Bugün son gün', 'bugun'] : k === 1 ? ['Yarın son gün', 'yakin'] : k <= 7 ? [k + ' gün kaldı', 'yakin'] : [t.split('-').reverse().join('.') + '’e kadar', '']; };

  const kok = document.createElement('div'); kok.id = 'sinyal-mebbis-panel';
  const g = kok.attachShadow({ mode: 'open' });
  g.innerHTML = `<style>
    :host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0}
    .p{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:360px;max-height:82vh;display:flex;flex-direction:column;background:#fff;color:#1d1d1d;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.28);border:1px solid #dcdcdc;font-size:13.5px;line-height:1.35}
    .b{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#14284b;color:#fff;border-radius:14px 14px 0 0;cursor:pointer;user-select:none}.b b{flex:1;font-size:14px}.b i{width:14px;height:14px;background:#f2b705;transform:rotate(45deg);border-radius:2px;flex:none}.b small{opacity:.85}
    .gizli .b{border-radius:14px}.gizli .g{display:none}
    .g{padding:10px 12px 12px;overflow:auto}
    h4{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;margin:12px 0 6px}
    input.ara{width:100%;border:1px solid #d6d9de;border-radius:9px;padding:8px 10px;font-size:13.5px;margin-bottom:10px}
    .sir{border:2px solid #2f6fde;border-radius:12px;padding:10px 11px;background:#f6f9ff}.sir small{display:block;color:#555;font-size:12px;margin-top:2px}.sir b{display:block;font-size:14.5px;margin-top:4px}
    .et{display:inline-block;font-size:11px;font-weight:700;border-radius:20px;padding:2px 8px;background:#eef0f3;color:#374151}.et.gecti{background:#fde2e0;color:#a12a20}.et.bugun{background:#fde2e0;color:#a12a20}.et.yakin{background:#fff1c2;color:#7a5600}
    .k{display:flex;align-items:center;gap:8px;border:1px solid #e3e3e3;border-radius:10px;padding:7px 10px;margin-bottom:6px;cursor:pointer;background:#fff;width:100%;text-align:left;font-size:13px;font-weight:400}
    .k:hover{border-color:#2f6fde;background:#f6f9ff}.k div{flex:1;min-width:0}.k b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.k small{display:block;color:#666;font-size:12px}
    .cip{display:flex;gap:6px;flex-wrap:wrap}.cip button{background:#eef0f3;color:#1d1d1d;font-weight:600;font-size:12.5px;padding:6px 9px;border-radius:20px}.cip button span{opacity:.6;margin-left:3px}.cip button[disabled]{opacity:.45;cursor:default}
    .ozet{display:flex;gap:10px;font-size:12px;color:#555;margin:8px 0 2px}.ozet b{color:#1d1d1d}
    .uy{border:1px solid #f0c2bd;background:#fdf0ee;color:#7a2318;border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:12.5px}
    .ust{display:flex;align-items:center;gap:8px;margin:6px 0 6px}.ust b{flex:1;font-size:14px}.ust small{color:#666}
    .a{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0f0}.a span{color:#555}.a b{font-weight:600;word-break:break-all;cursor:copy;text-align:right}.a b:hover{color:#2f6fde}.a em{grid-column:1/-1;font-style:normal;font-size:12px}
    .ok{color:#1f8a46}.no{color:#c0392b}
    button{border:0;border-radius:8px;padding:8px 10px;font-weight:600;cursor:pointer;font-size:13px}.ana{background:#2f6fde;color:#fff}.ana[disabled]{background:#a9bde6;cursor:default}.cz{background:#eef0f3;color:#1d1d1d}.kc{padding:4px 8px;font-size:12px}.geri{background:none;padding:2px 0;color:#2f6fde}.yesil{background:#1f8a46;color:#fff}
    .r{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center}.n{font-size:12px;color:#666;margin-top:8px}.m{font-size:12.5px;color:#14284b;background:#eef4ff;border-radius:8px;padding:7px 9px;margin-top:8px}
    .bar{height:5px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:2px 0 8px}.bar i{display:block;height:100%;background:#1f8a46}
    .ac{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;padding:6px 0;color:#14284b;font-size:13px;border-top:1px solid #eee;border-radius:0;margin-top:10px}
    .oto{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#374151;cursor:pointer}.oto i{width:30px;height:17px;border-radius:10px;background:#cbd5e1;position:relative;flex:none}.oto i::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;border-radius:50%;background:#fff;transition:left .15s}.oto.acik i{background:#1f8a46}.oto.acik i::after{left:15px}
    kbd{font:11px ui-monospace,monospace;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;padding:0 4px;color:#374151}
    </style>
    <div class="p" lang="tr"><div class="b" data-k><i></i><b>Sinyal MEBBİS Yardımcısı</b><small data-sayi></small></div><div class="g" data-g></div></div>`;
  (document.body || document.documentElement).appendChild(kok);
  const p = g.querySelector('.p'), govde = g.querySelector('[data-g]');
  const durum = { ekran: 'ana', filtre: null, sec: null, al: null, sonuc: {}, mesaj: '', ara: '', q: { isler: [] }, sayfa: {}, tablo: null, temizle: false, alAcik: false, oto: true, soru: false, bekle: null, dolanId: null };
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // bekleyen işler en acilden: son gün, sonra tür sırası
  const sirali = (tur) => durum.q.isler.filter(x => !x.bitti && (!tur || x.tur === tur)).sort((a, b) => (a.son || '9999').localeCompare(b.son || '9999') || SIRA[a.tur] - SIRA[b.tur]);
  const aranan = () => { const a = durum.ara.toLocaleLowerCase('tr').trim(); return a ? sirali().filter(x => (x.baslik + ' ' + x.alanlar.map(y => y.deger).join(' ')).toLocaleLowerCase('tr').includes(a)) : null; };
  const saat = t => t ? new Date(t).toTimeString().slice(0, 5) : '';
  const aktifKaydet = () => gonder({ tur: 'aktif-koy', aktif: { sec: durum.sec, filtre: durum.filtre, ekran: durum.ekran, bekle: durum.bekle } });

  const isSatir = x => { const [t, c] = etiket(x.son); return `<button class="k" data-is="${e(x.id)}"><div><b>${e(x.baslik)}</b><small>${e(AD[x.tur] || x.tur)}</small></div><span class="et ${c}">${t}</span></button>`; };

  function ciz() {
    const hepsi = sirali(), giris = girisSayfasi();
    g.querySelector('[data-sayi]').textContent = hepsi.length ? hepsi.length + ' iş' : '';
    let h = '';
    if (durum.ekran === 'ana') {
      if (giris) h += `<div class="uy"><b>MEBBİS giriş sayfası.</b> Kendi şifrenizle girin; Yardımcı burada hiçbir şey doldurmaz.</div>`;
      h += `<input class="ara" data-ara placeholder="Ara: ad, TC, plaka, tarih…" value="${e(durum.ara)}">`;
      const ar = aranan();
      if (ar) h += ar.length ? `<p class="n" style="margin:0 0 6px">${ar.length} sonuç</p>` + ar.slice(0, 30).map(isSatir).join('') : `<p class="n">Sonuç yok.</p>`;
      else if (!hepsi.length) h += `<p class="m" style="margin-top:0">Sırada iş yok. Sinyal’de <b>MEB işlemleri › MEBBİS Yardımcısına gönder</b>’e basın; Yardımcı bu sekmeye gelir.</p>`;
      else {
        const x = hepsi[0], [t, c] = etiket(x.son), gec = hepsi.filter(y => y.son && kalan(y.son) < 0).length, hafta = hepsi.filter(y => y.son && kalan(y.son) >= 0 && kalan(y.son) <= 7).length;
        h += `<div class="sir"><span class="et ${c}">${t}</span><b>${e(x.baslik)}</b><small>${e(AD[x.tur])} · ${e(x.neden || '')}</small><div class="r"><button class="ana" data-basla>Sırayla başla</button><span class="n" style="margin:0">${hepsi.length} iş, en aciliyle başlar</span></div></div>`;
        h += `<div class="ozet">${gec ? `<span><b style="color:#a12a20">${gec}</b> süresi geçti</span>` : ''}<span><b>${hafta}</b> bu hafta</span><span><b>${hepsi.length - gec - hafta}</b> sonra</span></div>`;
        h += `<h4>Türe göre</h4><div class="cip">${TURLER.map(([k, ad]) => { const n = sirali(k).length; return `<button data-filtre="${k}" ${n ? '' : 'disabled'}>${ad}<span>${n}</span></button>`; }).join('')}</div>`;
        h += `<h4>En acil</h4>` + hepsi.slice(1, 5).map(isSatir).join('');
      }
      h += `<button class="ac" data-alac><span>MEBBİS’ten Sinyal’e al</span><span>${durum.alAcik ? '▾' : '▸'}</span></button>`;
      if (durum.alAcik) h += AL.map(([k, ad, , a]) => `<button class="k" data-al="${k}"><div><b>${ad}</b><small>${a}</small></div></button>`).join('');
      h += `<div class="r" style="justify-content:space-between"><span class="oto ${durum.oto ? 'acik' : ''}" data-oto><i></i>Otomatik doldur ve ilerle</span><span><button class="cz kc" data-yenile>Yenile</button>${durum.q.isler.length ? ` <button class="cz kc" data-temizle>${durum.temizle ? 'Emin misiniz?' : 'Temizle'}</button>` : ''}</span></div>`;
      if (durum.q.kurs) h += `<p class="n">${e(durum.q.kurs)} · Sinyal’den ${saat(durum.q.zaman)}’de gönderildi.</p>`;
    }
    if (durum.ekran === 'is') {
      const is = durum.q.isler.find(x => x.id === durum.sec); if (!is || is.bitti) { durum.ekran = 'ana'; return ciz(); }
      const l = sirali(durum.filtre), sira = l.findIndex(x => x.id === is.id) + 1, [t, c] = etiket(is.son), kayitli = durum.sayfa[is.tur];
      const biten = durum.q.isler.filter(x => x.bitti && (!durum.filtre || x.tur === durum.filtre)).length;
      h += `<button class="geri" data-ana>← Ana menü</button><div class="ust"><b>${durum.filtre ? AD[durum.filtre] : 'Tüm işler'}</b><small>${sira}/${l.length}</small></div><div class="bar"><i style="width:${Math.round(100 * biten / (biten + l.length || 1))}%"></i></div>`;
      if (giris) h += `<div class="uy">Giriş sayfası: önce kendi şifrenizle girin.</div>`;
      h += `<span class="et ${c}">${t}</span><p style="margin:6px 0 2px;font-weight:700;font-size:14.5px">${e(is.baslik)}</p><p class="n" style="margin:0 0 6px">${e(AD[is.tur])}: MEBBİS’te <b>${e(FORM[is.tur])}</b> ekranı${kayitli && kayitli.yol !== location.pathname ? ` · <button class="cz kc" data-formac="${is.tur}">Formu aç</button>` : ''}</p>`;
      h += is.alanlar.map((a, i) => { const s = durum.sonuc[a.etiket]; return `<div class="a"><span>${e(a.etiket)}</span><b data-kopya="${i}" title="Kopyalamak için tıklayın">${e(a.deger)}</b>${s === 'ok' ? '<em class="ok">✓ dolduruldu</em>' : s === 'yok' ? `<em class="no">Alan bulunamadı · <button class="cz kc" data-ogret="${i}">Alanı göster</button> ya da değere tıklayıp kopyalayın</em>` : s === 'secenek' ? '<em class="no">Listede bu seçenek yok; elle seçin</em>' : ''}</div>`; }).join('');
      if (durum.soru) h += `<div class="m"><b>Kayıt tamamlandı mı?</b> MEBBİS’in mesajını kontrol edin.<div class="r" style="margin-top:6px"><button class="yesil" data-evet>Evet, sıradakine geç</button><button class="cz" data-hayir>Hayır</button></div></div>`;
      else if (durum.bekle) h += `<p class="m">MEBBİS’in cevabı kontrol ediliyor…</p>`;
      h += `<div class="r"><button class="ana" data-doldur ${giris ? 'disabled' : ''}>Formu doldur</button><button class="cz" data-bitti>Kaydettim</button><button class="cz" data-atla>Atla</button></div>`;
      h += durum.mesaj ? `<p class="m">${e(durum.mesaj)}</p>` : '';
      h += `<p class="n">${durum.oto ? 'Otomatik: form açılınca doldurulur; Kaydet’e bastığınızda sonuç kontrol edilip sıradakine geçilir.' : 'Otomatik kapalı: “Formu doldur” ve “Kaydettim” ile ilerleyin.'} Kaydet’e ve güvenlik koduna her zaman siz basarsınız. <kbd>Alt+Shift+D</kbd> doldur · <kbd>S</kbd> kaydettim · <kbd>N</kbd> atla</p>`;
    }
    if (durum.ekran === 'al') {
      const [, ad, liste, a] = AL.find(x => x[0] === durum.al), tb = durum.tablo;
      h += `<button class="geri" data-ana>← Ana menü</button><div class="ust"><b>${ad}</b></div><p class="n" style="margin:0 0 8px">${a}</p>`;
      h += `<p style="margin-bottom:6px">MEBBİS’te <b>${liste}</b> ekranını açıp listeyi getirin (sayfalama varsa tümünü gösterin).</p>`;
      h += tb ? `<p class="m">Bu sayfada <b>${tb.s.length - 1} satırlık</b> liste var: ${e(tb.s[0].slice(0, 5).join(' · '))}${tb.s[0].length > 5 ? ' …' : ''}</p>` : `<p class="m">Bu sayfada henüz liste görünmüyor; liste ekrana gelince kendiliğinden bulunur.</p>`;
      h += `<div class="r"><button class="ana" data-gonder ${tb ? '' : 'disabled'}>Listeyi Sinyal’e gönder</button></div>`;
      h += durum.mesaj ? `<p class="m">${e(durum.mesaj)}</p>` : '';
      h += `<p class="n">Sinyal hiçbir şeyi onayınız olmadan kaydetmez; liste Sinyal’de kontrol ekranına gelir.</p>`;
    }
    const odak = g.activeElement && g.activeElement.matches && g.activeElement.matches('[data-ara]');
    govde.innerHTML = h; durum.mesaj = '';
    if (odak) { const ara = govde.querySelector('[data-ara]'); if (ara) { ara.focus(); ara.setSelectionRange(ara.value.length, ara.value.length); } }
  }

  async function yukle() {
    durum.q = await gonder({ tur: 'kuyruk-al' }) || { isler: [] }; durum.q.isler = durum.q.isler || [];
    durum.sayfa = await gonder({ tur: 'sayfa-al' }) || {};
    ciz();
  }
  async function tara() {
    const r = await herkese('tablo', {}), hepsi = r.flatMap(x => (x.tablolar || []).map(s => ({ s, baslik: x.baslik })));
    durum.tablo = hepsi.sort((a, b) => b.s.length * b.s[0].length - a.s.length * a.s[0].length)[0] || null; ciz();
  }
  function isAc(id, otomatikDoldur) {
    durum.sec = id; durum.sonuc = {}; durum.ekran = 'is'; durum.soru = false; durum.dolanId = null; aktifKaydet(); ciz();
    if (otomatikDoldur && durum.oto) setTimeout(() => kendiligindenDoldur(), 500);
  }
  // form bu sayfadaysa (alan var, giriş değil) bir kez kendiliğinden doldurur
  async function kendiligindenDoldur() {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is || durum.dolanId === is.id || girisSayfasi()) return;
    const { alan } = await sayfaMetni(); if (alan < 2) return;
    const once = durum.sayfa[is.tur]; if (once && once.yol !== location.pathname) return;
    durum.dolanId = is.id; panelDoldur(true);
  }
  async function panelDoldur(oto) {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) return;
    if (girisSayfasi()) { durum.mesaj = 'Önce MEBBİS’e girin ve ilgili formu açın.'; return ciz(); }
    const r = await herkese('doldur', { is });
    durum.sonuc = {}; r.forEach(x => Object.entries(x.sonuc || {}).forEach(([a, s]) => { if (durum.sonuc[a] !== 'ok') durum.sonuc[a] = s === 'yok' && durum.sonuc[a] ? durum.sonuc[a] : s; }));
    const ok = Object.values(durum.sonuc).filter(s => s === 'ok').length;
    durum.mesaj = ok ? `${ok}/${is.alanlar.length} alan ${oto ? 'kendiliğinden ' : ''}dolduruldu. Kontrol edip MEBBİS’te Kaydet’e basın.` : 'Bu sayfada formun alanları bulunamadı. Doğru ekranı açtığınızdan emin olun.';
    ciz();
  }
  // iş tamam: Sinyal'e bildir, formun adresini hatırla, sıradakine geç; aynı formdaysa doldur, başka formdaysa onu aç
  async function tamamla() {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) return;
    const l = sirali(durum.filtre), i = l.findIndex(x => x.id === is.id), sonraki = l[i + 1] || l.find(x => x.id !== is.id);
    await gonder({ tur: 'is-bitti', id: is.id }); await gonder({ tur: 'sayfa-koy', is: is.tur, yol: location.pathname, adres: location.href });
    durum.bekle = null; durum.soru = false; await yukle();
    if (!sonraki) { Object.assign(durum, { ekran: 'ana', sec: null }); aktifKaydet(); durum.mesaj = ''; return ciz(); }
    const ayniForm = sonraki.tur === is.tur, adres = durum.sayfa[sonraki.tur];
    isAc(sonraki.id, ayniForm);
    durum.mesaj = ayniForm ? 'Kaydedildi. Sıradaki iş açıldı.' : `Kaydedildi. Sıradaki iş başka formda: ${AD[sonraki.tur]}.`; ciz();
    if (!ayniForm && durum.oto && adres && /^https:\/\/mebbis\.meb\.gov\.tr\//.test(adres.adres)) setTimeout(() => { location.href = adres.adres; }, 1200);
  }
  // Kaydet'e basıldı: MEBBİS'in cevabını birkaç saniye izle
  async function kaydetIzle(yenilendi) {
    if (!durum.bekle) return;
    const b = durum.bekle;
    for (let i = 0; i < 10 && durum.bekle === b; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const { metin } = await sayfaMetni();
      if (BASARI.test(metin) && !b.basari0) return durum.oto ? tamamla() : (durum.soru = true, durum.bekle = null, aktifKaydet(), ciz());
      if (HATA.test(metin) && !b.hata0) { durum.bekle = null; aktifKaydet(); durum.mesaj = 'MEBBİS bir uyarı gösteriyor. Düzeltip yeniden Kaydet’e basın.'; return ciz(); }
    }
    if (durum.bekle === b) { durum.bekle = null; durum.soru = true; aktifKaydet(); ciz(); }
  }
  function panelAtla() { const l = sirali(durum.filtre), i = l.findIndex(x => x.id === durum.sec), s = l[i + 1] || l[0]; if (s && s.id !== durum.sec) isAc(s.id, true); else { durum.mesaj = 'Başka iş yok.'; ciz(); } }

  g.addEventListener('input', ev => { if (ev.target.matches('[data-ara]')) { durum.ara = ev.target.value; ciz(); } });
  g.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.closest('[data-k]')) { p.classList.toggle('gizli'); gonder({ tur: 'ayar-koy', ad: 'kapali', deger: p.classList.contains('gizli') }); return; }
    if (t.closest('[data-yenile]')) return yukle();
    if (t.closest('[data-ana]')) { Object.assign(durum, { ekran: 'ana', sec: null, al: null, filtre: null, soru: false, bekle: null }); aktifKaydet(); return ciz(); }
    if (t.closest('[data-oto]')) { durum.oto = !durum.oto; gonder({ tur: 'ayar-koy', ad: 'oto', deger: durum.oto }); return ciz(); }
    if (t.closest('[data-alac]')) { durum.alAcik = !durum.alAcik; return ciz(); }
    if (t.closest('[data-temizle]')) { if (!durum.temizle) { durum.temizle = true; ciz(); setTimeout(() => { durum.temizle = false; ciz(); }, 4000); return; } durum.temizle = false; await gonder({ tur: 'kuyruk-temizle' }); return yukle(); }
    if (t.closest('[data-basla]')) { durum.filtre = null; const x = sirali()[0]; return x && isAc(x.id, true); }
    const fi = t.closest('[data-filtre]'); if (fi) { durum.filtre = fi.dataset.filtre; const x = sirali(durum.filtre)[0]; return x && isAc(x.id, true); }
    const fa = t.closest('[data-formac]'); if (fa) { const s = durum.sayfa[fa.dataset.formac]; if (s && /^https:\/\/mebbis\.meb\.gov\.tr\//.test(s.adres)) location.href = s.adres; return; }
    const k = t.closest('[data-is]'); if (k) { const x = durum.q.isler.find(y => y.id === k.dataset.is); durum.filtre = null; return isAc(k.dataset.is, true); }
    const al = t.closest('[data-al]'); if (al) { Object.assign(durum, { ekran: 'al', al: al.dataset.al, tablo: null }); ciz(); return tara(); }
    if (t.closest('[data-doldur]')) return panelDoldur(false);
    if (t.closest('[data-bitti]') || t.closest('[data-evet]')) return tamamla();
    if (t.closest('[data-hayir]')) { durum.soru = false; durum.mesaj = 'Formu düzeltip yeniden Kaydet’e basın.'; return ciz(); }
    if (t.closest('[data-atla]')) return panelAtla();
    const kp = t.closest('[data-kopya]'); if (kp) { const is = durum.q.isler.find(x => x.id === durum.sec), a = is && is.alanlar[+kp.dataset.kopya]; if (a) { try { await navigator.clipboard.writeText(a.deger); durum.mesaj = `“${a.etiket}” kopyalandı; MEBBİS’te alana yapıştırın.`; } catch (x) { durum.mesaj = 'Kopyalanamadı; değeri elle yazın.'; } ciz(); } return; }
    const og = t.closest('[data-ogret]'); if (og) { const is = durum.q.isler.find(x => x.id === durum.sec), a = is.alanlar[+og.dataset.ogret]; cerceveler().forEach(w => w.postMessage({ [ISARET]: 'ogret', alan: a }, '*')); durum.mesaj = `MEBBİS’te “${a.etiket}” alanına tıklayın; Yardımcı bir dahakine kendisi bulur.`; return ciz(); }
    if (t.closest('[data-gonder]')) {
      if (!durum.tablo) return;
      const [, ad] = AL.find(x => x[0] === durum.al);
      await gonder({ tur: 'tablo-koy', tablo: { satirlar: durum.tablo.s, baslik: durum.tablo.baslik, adres: location.pathname, amac: durum.al } });
      durum.mesaj = `${durum.tablo.s.length - 1} satır gönderildi. Sinyal sekmesine geçin; ${ad.toLocaleLowerCase('tr')} kontrol ekranında bekliyor.`; return ciz();
    }
  });
  window.addEventListener('message', async ev => {
    const d = ev.data; if (!d || !d[ISARET]) return;
    if (d[ISARET] === 'ogrenildi') { durum.sonuc[d.etiket] = 'ok'; durum.mesaj = 'Alan öğrenildi.'; ciz(); }
    if (d[ISARET] === 'kisayol' && durum.ekran === 'is') { if (d.k === 'KeyD') panelDoldur(false); if (d.k === 'KeyS') tamamla(); if (d.k === 'KeyN') panelAtla(); }
    if (d[ISARET] === 'kaydet-basildi' && durum.ekran === 'is' && durum.sec && !durum.bekle) {
      const { metin } = await sayfaMetni();
      durum.bekle = { id: durum.sec, zaman: Date.now(), basari0: BASARI.test(metin), hata0: HATA.test(metin) }; aktifKaydet(); ciz(); kaydetIzle(false);
    }
  });

  // açılış: ayarlar, yarım kalan iş ve Sinyal'den yeni gelen sıra
  (async () => {
    const [kapali, oto, aktif, yeni] = await Promise.all([gonder({ tur: 'ayar-al', ad: 'kapali' }), gonder({ tur: 'ayar-al', ad: 'oto' }), gonder({ tur: 'aktif-al' }), gonder({ tur: 'yeni-al' })]);
    durum.oto = oto !== false;
    if (kapali && !yeni) p.classList.add('gizli');
    await yukle();
    if (yeni) { Object.assign(durum, { ekran: 'ana', sec: null, filtre: null }); aktifKaydet(); durum.mesaj = ''; return ciz(); }
    if (aktif && aktif.sec && durum.q.isler.some(x => x.id === aktif.sec && !x.bitti) && aktif.ekran === 'is') {
      Object.assign(durum, { sec: aktif.sec, filtre: aktif.filtre || null, ekran: 'is', bekle: aktif.bekle || null }); ciz();
      if (durum.bekle && Date.now() - durum.bekle.zaman < 60000) kaydetIzle(true); else { durum.bekle = null; setTimeout(() => kendiligindenDoldur(), 800); }
    }
  })();
  setInterval(() => { if (durum.ekran === 'ana' && !(g.activeElement && g.activeElement.matches && g.activeElement.matches('[data-ara]'))) yukle(); if (durum.ekran === 'al' && !durum.tablo) tara(); }, 5000);
})();
