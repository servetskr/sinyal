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
  // MEBBİS menüsünde hedef ekranı bulma: yalnız gezinme bağlantıları; silme, kaydetme, çıkış gibi düğmelere asla basılmaz
  const TEHLIKE = /sil|iptal|çıkış|kapat|onay|kaydet|gönder|güncelle|vazgeç|reddet|yazdır|indir|excel/i;
  const elMetin = el => String(el.innerText || el.textContent || el.value || el.title || '').replace(/\s+/g, ' ').trim();
  const tiklanabilir = () => [...document.querySelectorAll('a, button, [role=menuitem], [onclick], input[type=button], li > span')].filter(el => !el.closest('#sinyal-mebbis-panel'));
  function menuAday(gruplar, yasak) {
    let en = null;
    tiklanabilir().forEach(el => {
      const m = elMetin(el); if (!m || m.length > 60 || TEHLIKE.test(m) || yasak.includes(m)) return; const n = norm(m);
      gruplar.forEach((l, gi) => l.forEach(ph => { const k = norm(ph); if (k && n.includes(k)) { const sk = 100 - gi * 30 + (n === k ? 10 : 0) - n.length / 20; if (!en || sk > en.skor) en = { skor: sk, metin: m }; } }));
    });
    return en;
  }
  const LISTE_BASLIK = { kursiyer: [/tc|kimlik/, /ad/], mutabakat: [/tc|kimlik/, /ad/], taksit: [/tutar|odeme|miktar/], ogretmen: [/ad/, /brans|gorev|unvan|personel|ogretici|sertifika/], arac: [/plaka/], sinav: [/tc|kimlik/, /sonuc|puan|basari|durum/] };
  function listeUygun(amac) {
    const k = LISTE_BASLIK[amac] || []; let en = null;
    tablolar().forEach(t => { const b = norm(t[0].join(' ')); if (t.length >= 2 && k.every(r => r.test(b)) && (!en || t.length > en)) en = t.length; });
    return en ? en - 1 : 0;
  }
  window.addEventListener('message', async ev => {
    const d = ev.data; if (!d || !d[ISARET] || ev.source !== window.top) return;
    if (d[ISARET] === 'menu-ara') window.top.postMessage({ [ISARET]: 'menu-aday', no: d.no, aday: menuAday(d.gruplar, d.yasak || []) }, '*');
    if (d[ISARET] === 'menu-tikla') { const el = tiklanabilir().find(x => elMetin(x) === d.metin && !TEHLIKE.test(d.metin)); if (el) el.click(); window.top.postMessage({ [ISARET]: 'menu-tiklandi', no: d.no, ok: !!el }, '*'); }
    if (d[ISARET] === 'olc') { const esleme = d.is ? await gonder({ tur: 'esleme-al' }) || {} : {}; window.top.postMessage({ [ISARET]: 'olcum', no: d.no, form: d.is && !document.querySelector('input[type=password]') ? d.is.alanlar.filter(a => bul(a, esleme)).length : 0, liste: d.amac ? listeUygun(d.amac) : 0 }, '*'); }
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
    .kucuk{font-size:12px;color:#6b7280;margin-bottom:4px}
    .sir{border:1px solid #e3e3e3;border-radius:12px;padding:11px 12px;margin-bottom:10px}.sir b{display:block;font-size:15px}.sir small{display:block;color:#555;margin:2px 0 6px}
    .buyuk{display:block;width:100%;background:#2f6fde;color:#fff;font-size:15px;padding:12px;border-radius:10px;margin-bottom:8px}
    .satir{display:flex;justify-content:space-between;align-items:center;width:100%;background:#f3f4f6;color:#1d1d1d;padding:9px 11px;border-radius:9px;font-weight:600;margin-top:6px}
    .alt{display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid #eee}.alt button{flex:1;background:none;color:#2f6fde;padding:6px 4px;font-size:12.5px}
    .bos{text-align:center;padding:10px 4px}.bos>b{display:block;font-size:15px;margin-bottom:6px}.bos p{color:#555;font-size:13px}
    .not{font-size:12px;color:#666;margin-top:8px}
    .ad{font-size:16px;font-weight:700}
    .adim{border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:13.5px;font-weight:600}.adim.bilgi{background:#eef4ff;color:#14284b}.adim.tamam{background:#e7f6ec;color:#14532d}.adim.uyari{background:#fdf0ee;color:#7a2318}.adim.soru{background:#fff6d6;color:#5c4400}
    .iki{display:flex;gap:6px;margin-bottom:8px}.iki button{flex:1;padding:11px;font-size:14px}
    .cip .sec{background:#14284b;color:#fff}
    .ayar{padding:10px 0;border-bottom:1px solid #eee;margin-top:6px}.oto span small{display:block;color:#666;font-weight:400;font-size:12px}.oto span b{display:block}
    .e2{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0}.e2 span{color:#555;font-size:12.5px}.e2 b{text-align:right;cursor:copy;word-break:break-word}.e2 b:hover{color:#2f6fde}.gst{background:none;color:#8a94a6;font-size:11px;padding:0;font-weight:500;text-decoration:underline}
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
  const geri = (hedef = 'ana', yazi = 'Geri') => `<button class="geri" data-git="${hedef}">← ${yazi}</button>`;

  function ciz() {
    const hepsi = sirali(), giris = girisSayfasi();
    g.querySelector('[data-sayi]').textContent = hepsi.length ? hepsi.length + ' iş' : '';
    let h = '';
    // ANA: yalnız sıradaki iş ve Başla
    if (durum.ekran === 'ana') {
      if (!hepsi.length) h += `<div class="bos"><b>Sırada iş yok</b><p>Sinyal’de <b>MEB işlemleri</b> ekranında <b>MEBBİS Yardımcısına gönder</b>’e basın. İşler buraya gelir.</p></div>`;
      else {
        const x = hepsi[0], [t, c] = etiket(x.son);
        h += `<p class="kucuk">Sıradaki iş</p><div class="sir"><b>${e(x.baslik)}</b><small>${e(AD[x.tur])}</small><span class="et ${c}">${t}</span></div>`;
        h += `<button class="buyuk" data-basla>Başla</button>`;
        h += `<button class="satir" data-git="liste"><span>Bekleyen işler</span><b>${hepsi.length}</b></button>`;
      }
      if (giris) h += `<p class="not">MEBBİS’e kendi şifrenizle girin; Yardımcı giriş sayfasında hiçbir şey yazmaz.</p>`;
      h += `<div class="alt"><button data-git="alsec">MEBBİS’ten veri al</button><button data-git="ayar">Ayarlar</button></div>`;
    }
    // İŞ: ne yapılacağı tek cümle, bilgiler gizli
    if (durum.ekran === 'is') {
      const is = durum.q.isler.find(x => x.id === durum.sec); if (!is || is.bitti) { durum.ekran = 'ana'; return ciz(); }
      const l = sirali(durum.filtre), sira = l.findIndex(x => x.id === is.id) + 1, kayitli = durum.sayfa[is.tur];
      const ok = Object.values(durum.sonuc).filter(x => x === 'ok').length, eksik = is.alanlar.filter(a => durum.sonuc[a.etiket] && durum.sonuc[a.etiket] !== 'ok');
      h += `<div class="ust">${geri('ana', 'Kapat')}<small>${sira} / ${l.length}</small></div>`;
      h += `<p class="ad">${e(is.baslik)}</p><p class="kucuk" style="margin:0 0 10px">${e(AD[is.tur])}</p>`;
      let adim, dugme = '';
      const hd = durum.hedef && durum.hedef.tip === 'gir' ? durum.hedef : null;
      if (giris) adim = ['bilgi', 'MEBBİS’e kendi şifrenizle girin; Yardımcı sonra ekranı kendisi açar.'];
      else if (hd && hd.durum === 'gidiyor') adim = ['bilgi', `${FORM[is.tur]} ekranı açılıyor…`];
      else if (hd && hd.durum === 'ogren') { adim = ['uyari', `“${FORM[is.tur]}” ekranını menüde bulamadım. Menüden bir kez siz açın; Yardımcı yerini öğrenir, bir dahakine kendisi açar.`]; dugme = `<button class="cz" data-hedef-iptal style="width:100%">Vazgeç</button>`; }
      else if (durum.soru) { adim = ['soru', 'Kayıt tamamlandı mı?']; dugme = `<div class="iki"><button class="yesil" data-evet>Evet</button><button class="cz" data-hayir>Hayır</button></div>`; }
      else if (durum.bekle) adim = ['bilgi', 'MEBBİS’in cevabı bekleniyor…'];
      else if (ok) adim = ['tamam', eksik.length ? `${ok} bilgi yazıldı. ${eksik.length} bilgiyi elle girin, sonra MEBBİS’te Kaydet’e basın.` : 'Form dolduruldu. Kontrol edin, MEBBİS’te Kaydet’e basın.'];
      else if (Object.keys(durum.sonuc).length) { adim = ['uyari', `Bu sayfada form bulunamadı.`]; dugme = `<button class="buyuk" data-formac="${is.tur}">Ekranı aç</button>`; }
      else { adim = ['bilgi', `${FORM[is.tur]} ekranı`]; dugme = `<button class="buyuk" data-formac="${is.tur}">Ekranı aç ve doldur</button>`; }
      h += `<div class="adim ${adim[0]}">${adim[1]}</div>${dugme}`;
      if (durum.mesaj) h += `<p class="not">${e(durum.mesaj)}</p>`;
      if (eksik.length) h += `<p class="kucuk" style="margin-top:2px">Elle girilecekler · değere dokunun, kopyalanır</p>` + eksik.map(a => { const i = is.alanlar.indexOf(a); return `<div class="e2"><span>${e(a.etiket)}</span><b data-kopya="${i}">${e(a.deger)}</b><button class="gst" data-ogret="${i}" title="MEBBİS’te bu alanın yerini gösterin; bir dahakine kendisi yazar">yerini göster</button></div>`; }).join('');
      h += `<button class="satir" data-bilgi><span>Bilgileri ${durum.bilgiAcik ? 'gizle' : 'göster'}</span><b>${durum.bilgiAcik ? '▾' : '▸'}</b></button>`;
      if (durum.bilgiAcik) h += is.alanlar.map((a, i) => `<div class="a"><span>${e(a.etiket)}</span><b data-kopya="${i}" title="Kopyala">${e(a.deger)}</b></div>`).join('');
      h += `<div class="alt"><button data-bitti>Kaydettim</button><button data-atla>Atla</button>${ok ? '<button data-doldur>Tekrar doldur</button>' : ''}</div>`;
    }
    // LİSTE: arama ve tüm işler
    if (durum.ekran === 'liste') {
      h += geri() + `<input class="ara" data-ara placeholder="Ara: ad, TC, plaka, tarih" value="${e(durum.ara)}">`;
      const l = aranan() || sirali(durum.filtre);
      h += `<div class="cip"><button data-filtre="" class="${durum.filtre ? '' : 'sec'}">Hepsi</button>${TURLER.map(([k, ad]) => { const n = sirali(k).length; return n ? `<button data-filtre="${k}" class="${durum.filtre === k ? 'sec' : ''}">${ad} ${n}</button>` : ''; }).join('')}</div>`;
      h += l.length ? l.slice(0, 40).map(isSatir).join('') + (l.length > 40 ? `<p class="not">+${l.length - 40} iş; aramayı daraltın.</p>` : '') : '<p class="not">Sonuç yok.</p>';
    }
    // MEBBİS'TEN AL: önce seçim, sonra tek düğme
    if (durum.ekran === 'alsec') {
      h += geri() + `<p class="kucuk" style="margin:8px 0">MEBBİS’ten Sinyal’e ne alınacak?</p>` + AL.map(([k, ad, , a]) => `<button class="k" data-al="${k}"><div><b>${ad}</b><small>${a}</small></div></button>`).join('');
    }
    if (durum.ekran === 'al') {
      const [, ad, liste] = AL.find(x => x[0] === durum.al), tb = durum.tablo;
      h += geri('alsec') + `<p class="ad" style="margin-top:8px">${ad}</p>`;
      const hd = durum.hedef && durum.hedef.tip === 'al' ? durum.hedef : null;
      if (giris) h += `<div class="adim bilgi">MEBBİS’e kendi şifrenizle girin; Yardımcı sonra ${liste} ekranını kendisi açar.</div>`;
      else if (hd && hd.durum === 'gidiyor') h += `<div class="adim bilgi">${liste[0].toLocaleUpperCase('tr') + liste.slice(1)} ekranı açılıyor…</div>`;
      else if (hd && hd.durum === 'ogren') h += `<div class="adim uyari">“${liste}” ekranını menüde bulamadım. Menüden bir kez siz açın; Yardımcı listeyi kendisi alıp gönderir ve yerini öğrenir.</div><button class="cz" data-hedef-iptal style="width:100%">Vazgeç</button>`;
      else h += tb ? `<div class="adim tamam">Bu sayfada ${tb.s.length - 1} satırlık liste var.</div><button class="buyuk" data-gonder>Sinyal’e gönder</button>` : `<div class="adim bilgi">Liste bekleniyor.</div><button class="buyuk" data-alyeniden>Ekranı aç ve listeyi al</button>`;
      if (durum.mesaj) h += `<p class="not">${e(durum.mesaj)}</p>`;
    }
    if (durum.ekran === 'ayar') {
      h += geri() + `<div class="ayar"><span class="oto ${durum.oto ? 'acik' : ''}" data-oto><i></i><span><b>Otomatik</b><small>Formu kendisi doldurur, Kaydet’ten sonra sıradakine geçer</small></span></span></div>`;
      h += `<p class="not">Kısayollar: Alt+Shift+D doldur · Alt+Shift+S kaydettim · Alt+Shift+N atla</p>`;
      if (durum.q.kurs) h += `<p class="not">${e(durum.q.kurs)} · Sinyal’den ${saat(durum.q.zaman)}’de gönderildi.</p>`;
      if (durum.q.isler.length) h += `<button class="satir" data-temizle><span>${durum.temizle ? 'Emin misiniz? Tekrar basın' : 'Bekleyen işleri temizle'}</span><b></b></button>`;
    }
    const odak = g.activeElement && g.activeElement.matches && g.activeElement.matches('[data-ara]');
    govde.innerHTML = h; durum.mesaj = '';
    if (odak) { const ara = govde.querySelector('[data-ara]'); if (ara) { ara.focus(); ara.setSelectionRange(ara.value.length, ara.value.length); } }
  }

  // MEBBİS menüsünde aranacak adlar: en özelden genele (tahmin; bulunamazsa kullanıcı bir kez gösterir, adres öğrenilir)
  const MODUL = ['özel mtsk', 'motorlu taşıt sürücüleri kursu', 'mtsk modülü', 'sürücü kursu'];
  const YOL = {
    kayit: [['kursiyer kayıt', 'kursiyer kaydı', 'yeni kursiyer', 'kursiyer ekle', 'kesin kayıt'], ['kursiyer işlemleri'], MODUL],
    program: [['direksiyon eğitim programı', 'direksiyon eğitimi programı', 'direksiyon programı', 'ders programı', 'eğitim planı'], ['direksiyon eğitim işlemleri', 'direksiyon işlemleri', 'eğitim işlemleri'], MODUL],
    sinav: [['direksiyon sınav başvuru', 'sınav başvurusu', 'sınava gireceklerin', 'sınav bildirimi', 'sınav listesi'], ['sınav işlemleri'], MODUL],
    odeme: [['kursiyer ödeme', 'ödeme bilgi', 'ödeme girişi', 'tahsilat'], ['ödeme işlemleri', 'mali işlemler', 'kursiyer işlemleri'], MODUL],
    'al-kursiyer': [['kursiyer listesi', 'kursiyer listele', 'kursiyer sorgula', 'kursiyer arama'], ['kursiyer işlemleri', 'raporlar'], MODUL],
    'al-mutabakat': [['kursiyer listesi', 'kursiyer listele', 'kursiyer sorgula'], ['kursiyer işlemleri', 'raporlar'], MODUL],
    'al-taksit': [['ödeme listesi', 'ödeme raporu', 'ödeme bilgileri'], ['ödeme işlemleri', 'raporlar'], MODUL],
    'al-ogretmen': [['personel listesi', 'usta öğretici listesi', 'personel bilgileri', 'öğretici listesi'], ['personel işlemleri', 'kurum işlemleri'], MODUL],
    'al-arac': [['araç listesi', 'araç bilgileri', 'araçlar'], ['araç işlemleri', 'kurum işlemleri'], MODUL],
    'al-sinav': [['sınav sonuçları', 'sınav sonuç', 'e-sınav sonuç', 'sonuç listesi'], ['sınav işlemleri', 'raporlar'], MODUL],
  };
  const anahtarOf = h => h.tip === 'gir' ? h.tur : 'al-' + h.amac;
  const hedefAd = h => h.tip === 'gir' ? FORM[h.tur] + ' ekranı' : (AL.find(x => x[0] === h.amac) || [, , 'liste'])[2] + ' ekranı';
  async function olc(is, amac) { const r = await herkese('olc', { is, amac }, 900); return { form: Math.max(0, ...r.map(x => x.form || 0)), liste: Math.max(0, ...r.map(x => x.liste || 0)) }; }
  async function menuTikla(gruplar, yasak) {
    const r = await herkese('menu-ara', { gruplar, yasak }, 700), en = r.filter(x => x.aday).sort((a, b) => b.aday.skor - a.aday.skor)[0];
    if (!en) return null;
    await herkese('menu-tikla', { metin: en.aday.metin }, 300); return en.aday.metin;
  }
  const hedefKaydet = () => gonder({ tur: 'hedef-koy', hedef: durum.hedef });
  async function hedefeGit(h) {
    durum.hedef = { ...h, zaman: Date.now(), tik: [], dogrudan: false, durum: 'gidiyor' }; await hedefKaydet(); ciz(); ilerle();
  }
  async function ilerle() {
    const h = durum.hedef; if (!h || durum.ilerliyor) return; durum.ilerliyor = true; let sonra = false;
    try {
      if (girisSayfasi()) { h.durum = 'giris'; return hedefKaydet(); }
      const deneme = h.tip === 'gir' ? (durum.q.isler.find(x => x.id === durum.sec && x.tur === h.tur) || sirali(h.tur)[0]) : null;
      const o = await olc(deneme, h.tip === 'al' ? h.amac : null);
      if ((h.tip === 'gir' && o.form >= 2) || (h.tip === 'al' && o.liste > 0)) { durum.ilerliyor = false; return vardi(h); }
      const ogr = durum.sayfa[anahtarOf(h)];
      if (ogr && !h.dogrudan && /^https:\/\/mebbis\.meb\.gov\.tr\//.test(ogr.adres) && location.href !== ogr.adres) { h.dogrudan = true; await hedefKaydet(); location.href = ogr.adres; return; }
      if (h.tik.length < 5) { const m = await menuTikla(YOL[anahtarOf(h)], h.tik); if (m) { h.tik.push(m); h.durum = 'gidiyor'; await hedefKaydet(); sonra = true; setTimeout(() => { durum.ilerliyor = false; ilerle(); }, 1500); return; } }
      h.durum = 'ogren'; await hedefKaydet();
    } finally { if (!sonra) durum.ilerliyor = false; ciz(); }
  }
  // hedef ekrana ulaşıldı: adresi öğren, sonra doldur ya da listeyi alıp Sinyal'e gönder
  async function vardi(h) {
    await gonder({ tur: 'sayfa-koy', is: anahtarOf(h), yol: location.pathname, adres: location.href }); durum.sayfa = await gonder({ tur: 'sayfa-al' }) || {};
    durum.hedef = null; await gonder({ tur: 'hedef-sil' }); durum.ilerliyor = false;
    if (h.tip === 'gir') { durum.dolanId = null; return kendiligindenDoldur(); }
    Object.assign(durum, { ekran: 'al', al: h.amac }); await tara();
    if (durum.tablo) return listeGonder(true);
  }
  async function listeGonder(oto) {
    if (!durum.tablo) return; const [, ad] = AL.find(x => x[0] === durum.al);
    await gonder({ tur: 'tablo-koy', tablo: { satirlar: durum.tablo.s, baslik: durum.tablo.baslik, adres: location.pathname, amac: durum.al } });
    await gonder({ tur: 'sayfa-koy', is: 'al-' + durum.al, yol: location.pathname, adres: location.href });
    durum.mesaj = `${durum.tablo.s.length - 1} satır Sinyal’e gönderildi${oto ? '; Sinyal açılıyor' : ''}. ${ad} kontrol ekranında bekliyor.`; ciz();
    if (oto) setTimeout(() => gonder({ tur: 'sinyal-ac' }), 900);
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
    durum.sec = id; durum.sonuc = {}; durum.ekran = 'is'; durum.soru = false; durum.dolanId = null; durum.bilgiAcik = false; aktifKaydet(); ciz();
    if (otomatikDoldur && durum.oto) setTimeout(() => kendiligindenDoldur(), 500);
  }
  // form bu sayfadaysa (alan var, giriş değil) bir kez kendiliğinden doldurur
  async function kendiligindenDoldur() {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is || durum.dolanId === is.id) return;
    if (!girisSayfasi()) { const o = await olc(is, null); if (o.form >= 2) { durum.dolanId = is.id; return panelDoldur(true); } }
    if (durum.oto && !durum.hedef) hedefeGit({ tip: 'gir', tur: is.tur });
  }
  async function panelDoldur(oto) {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) return;
    if (girisSayfasi()) { durum.mesaj = 'Önce MEBBİS’e girin ve ilgili formu açın.'; return ciz(); }
    const r = await herkese('doldur', { is });
    durum.sonuc = {}; r.forEach(x => Object.entries(x.sonuc || {}).forEach(([a, s]) => { if (durum.sonuc[a] !== 'ok') durum.sonuc[a] = s === 'yok' && durum.sonuc[a] ? durum.sonuc[a] : s; }));
    ciz();
  }
  // iş tamam: Sinyal'e bildir, formun adresini hatırla, sıradakine geç; aynı formdaysa doldur, başka formdaysa onu aç
  async function tamamla() {
    const is = durum.q.isler.find(x => x.id === durum.sec); if (!is) return;
    const l = sirali(durum.filtre), i = l.findIndex(x => x.id === is.id), sonraki = l[i + 1] || l.find(x => x.id !== is.id);
    await gonder({ tur: 'is-bitti', id: is.id }); await gonder({ tur: 'sayfa-koy', is: is.tur, yol: location.pathname, adres: location.href });
    durum.bekle = null; durum.soru = false; await yukle();
    if (!sonraki) { Object.assign(durum, { ekran: 'ana', sec: null }); aktifKaydet(); durum.mesaj = ''; return ciz(); }
    const ayniForm = sonraki.tur === is.tur;
    isAc(sonraki.id, true);
    durum.mesaj = ayniForm ? '✓ Önceki iş kaydedildi.' : `✓ Önceki iş kaydedildi. Sıradaki iş: ${AD[sonraki.tur]}; ekran açılıyor.`; ciz();
  }
  // Kaydet'e basıldı: MEBBİS'in cevabını birkaç saniye izle
  async function kaydetIzle(yenilendi) {
    if (!durum.bekle) return;
    const b = durum.bekle;
    for (let i = 0; i < 10 && durum.bekle === b; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const { metin } = await sayfaMetni();
      if (BASARI.test(metin) && !b.basari0) return durum.oto ? tamamla() : (durum.soru = true, durum.bekle = null, aktifKaydet(), ciz());
      if (HATA.test(metin) && !b.hata0) { durum.bekle = null; aktifKaydet(); durum.mesaj = 'MEBBİS bir hata gösteriyor. Düzeltip yeniden Kaydet’e basın.'; return ciz(); }
    }
    if (durum.bekle === b) { durum.bekle = null; durum.soru = true; aktifKaydet(); ciz(); }
  }
  function panelAtla() { const l = sirali(durum.filtre), i = l.findIndex(x => x.id === durum.sec), s = l[i + 1] || l[0]; if (s && s.id !== durum.sec) isAc(s.id, true); else { durum.mesaj = 'Başka iş yok.'; ciz(); } }

  g.addEventListener('input', ev => { if (ev.target.matches('[data-ara]')) { durum.ara = ev.target.value; ciz(); } });
  g.addEventListener('click', async ev => {
    const t = ev.target;
    if (t.closest('[data-k]')) { p.classList.toggle('gizli'); gonder({ tur: 'ayar-koy', ad: 'kapali', deger: p.classList.contains('gizli') }); return; }
    if (t.closest('[data-yenile]')) return yukle();
    const git = t.closest('[data-git]'); if (git) { const h = git.dataset.git; Object.assign(durum, { ekran: h, soru: false, bekle: null, bilgiAcik: false }); if (h === 'ana') Object.assign(durum, { sec: null, al: null, filtre: null, ara: '' }); aktifKaydet(); return ciz(); }
    if (t.closest('[data-bilgi]')) { durum.bilgiAcik = !durum.bilgiAcik; return ciz(); }
    if (t.closest('[data-oto]')) { durum.oto = !durum.oto; gonder({ tur: 'ayar-koy', ad: 'oto', deger: durum.oto }); return ciz(); }
    if (t.closest('[data-temizle]')) { if (!durum.temizle) { durum.temizle = true; ciz(); setTimeout(() => { durum.temizle = false; ciz(); }, 4000); return; } durum.temizle = false; await gonder({ tur: 'kuyruk-temizle' }); return yukle(); }
    if (t.closest('[data-basla]')) { durum.filtre = null; const x = sirali()[0]; return x && isAc(x.id, true); }
    const fi = t.closest('[data-filtre]'); if (fi) { durum.filtre = fi.dataset.filtre || null; durum.ara = ''; return ciz(); }
    const fa = t.closest('[data-formac]'); if (fa) { durum.dolanId = null; if (!girisSayfasi()) { const is = durum.q.isler.find(x => x.id === durum.sec); const o = await olc(is, null); if (o.form >= 2) { durum.dolanId = is.id; return panelDoldur(false); } } return hedefeGit({ tip: 'gir', tur: fa.dataset.formac }); }
    if (t.closest('[data-hedef-iptal]')) { durum.hedef = null; await gonder({ tur: 'hedef-sil' }); return ciz(); }
    if (t.closest('[data-alyeniden]')) return hedefeGit({ tip: 'al', amac: durum.al });
    const k = t.closest('[data-is]'); if (k) { if (durum.ara) durum.filtre = null; return isAc(k.dataset.is, true); }
    const al = t.closest('[data-al]'); if (al) { Object.assign(durum, { ekran: 'al', al: al.dataset.al, tablo: null }); ciz(); await tara(); return durum.tablo ? ciz() : hedefeGit({ tip: 'al', amac: al.dataset.al }); }
    if (t.closest('[data-doldur]')) return panelDoldur(false);
    if (t.closest('[data-bitti]') || t.closest('[data-evet]')) return tamamla();
    if (t.closest('[data-hayir]')) { durum.soru = false; durum.mesaj = 'Formu düzeltip yeniden Kaydet’e basın.'; return ciz(); }
    if (t.closest('[data-atla]')) return panelAtla();
    const kp = t.closest('[data-kopya]'); if (kp) { const is = durum.q.isler.find(x => x.id === durum.sec), a = is && is.alanlar[+kp.dataset.kopya]; if (a) { try { await navigator.clipboard.writeText(a.deger); durum.mesaj = `“${a.etiket}” kopyalandı; MEBBİS’te alana yapıştırın.`; } catch (x) { durum.mesaj = 'Kopyalanamadı; değeri elle yazın.'; } ciz(); } return; }
    const og = t.closest('[data-ogret]'); if (og) { const is = durum.q.isler.find(x => x.id === durum.sec), a = is.alanlar[+og.dataset.ogret]; cerceveler().forEach(w => w.postMessage({ [ISARET]: 'ogret', alan: a }, '*')); durum.mesaj = `MEBBİS’te “${a.etiket}” alanına tıklayın; Yardımcı bir dahakine kendisi bulur.`; return ciz(); }
    if (t.closest('[data-gonder]')) return listeGonder(false);
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

  // açılış: ayarlar, yarım kalan iş, yarım kalan gezinme ve Sinyal'den yeni gelen sıra; Sinyal'den komut gelince yeniden çalışır
  const basla = async () => {
    const [kapali, oto, aktif, yeni, hedef] = await Promise.all([gonder({ tur: 'ayar-al', ad: 'kapali' }), gonder({ tur: 'ayar-al', ad: 'oto' }), gonder({ tur: 'aktif-al' }), gonder({ tur: 'yeni-al' }), gonder({ tur: 'hedef-al' })]);
    durum.oto = oto !== false;
    if (kapali && !yeni) p.classList.add('gizli');
    await yukle();
    if (hedef && Date.now() - hedef.zaman < 10 * 60000) {
      durum.hedef = hedef; p.classList.remove('gizli');
      if (hedef.tip === 'al') Object.assign(durum, { ekran: 'al', al: hedef.amac }); else if (aktif && aktif.sec) Object.assign(durum, { ekran: 'is', sec: aktif.sec, filtre: aktif.filtre || null });
      ciz(); return setTimeout(() => ilerle(), 1200);
    }
    if (yeni) { Object.assign(durum, { ekran: 'ana', sec: null, filtre: null }); aktifKaydet(); durum.mesaj = ''; return ciz(); }
    if (aktif && aktif.sec && durum.q.isler.some(x => x.id === aktif.sec && !x.bitti) && aktif.ekran === 'is') {
      Object.assign(durum, { sec: aktif.sec, filtre: aktif.filtre || null, ekran: 'is', bekle: aktif.bekle || null }); ciz();
      if (durum.bekle && Date.now() - durum.bekle.zaman < 60000) kaydetIzle(true); else { durum.bekle = null; setTimeout(() => kendiligindenDoldur(), 800); }
    }
  };
  basla();
  chrome.runtime.onMessage.addListener(m => { if (m && m.tur === 'yeniden-bak') { durum.hedef = null; durum.ilerliyor = false; basla(); } });
  setInterval(() => { if (durum.hedef && ['ogren', 'giris'].includes(durum.hedef.durum)) ilerle(); }, 2500);
  setInterval(() => { if (durum.ekran === 'ana' && !(g.activeElement && g.activeElement.matches && g.activeElement.matches('[data-ara]'))) yukle(); if (durum.ekran === 'al' && !durum.tablo) tara(); }, 5000);
})();
