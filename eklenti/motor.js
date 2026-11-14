// mdSinyal MEBBİS Yardımcısı · arka plan motoru (yalnız üst çerçeve, MEBBİS sekmesinde).
// mdSinyal'den gelen toplu işi kursun kendi MEBBİS oturumuyla, ekran açmadan yürütür:
//  - Çekme: dönem grupları, bütün kursiyerler (her öğrenci durumu ayrı sorgulanır), aday dosyaları, personel, araçlar, sınav sonuçları.
//  - Yazma: direksiyon ders programı; her kayıttan sonra MEBBİS'in listesi yeniden okunup kaydın gerçekten oluştuğu doğrulanır.
// MEBBİS ASP.NET WebForms: her istek formun bütün alanlarını (ViewState dahil) geri gönderir; seçim kutularının bir kısmı sayfayı yeniler (postback).
// İstekler insan hızında, sırayla gider. Güvenlik kodu istenirse resmi gösterilir, kodu kullanıcı yazar.
(() => {
  if (window !== window.top || window.__sinyalMotor) return; window.__sinyalMotor = true;
  const KOK = location.origin;
  const gonder = m => new Promise(ok => { try { chrome.runtime.sendMessage(m, ok); } catch (x) { ok(null); } });
  const uyku = ms => new Promise(ok => setTimeout(ok, ms));
  const ARA = 1100;   // iki istek arası bekleme (ms)
  const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
  const metin = el => String(el ? el.textContent : '').replace(/\s+/g, ' ').trim();

  /* ---------- istek katmanı ---------- */
  // MEBBİS sayfaları windows-1254; form verisi de aynı kodlamayla gönderilir (tarayıcının kendi form gönderimi gibi)
  const TR = { 'ç': 0xE7, 'Ç': 0xC7, 'ğ': 0xF0, 'Ğ': 0xD0, 'ı': 0xFD, 'İ': 0xDD, 'ö': 0xF6, 'Ö': 0xD6, 'ş': 0xFE, 'Ş': 0xDE, 'ü': 0xFC, 'Ü': 0xDC };
  const hex = b => '%' + b.toString(16).toUpperCase().padStart(2, '0');
  function kodla(s) {
    let o = '';
    for (const c of String(s ?? '')) {
      const k = c.codePointAt(0);
      if (/[A-Za-z0-9*\-._]/.test(c)) o += c; else if (c === ' ') o += '+'; else if (k < 128) o += hex(k);
      else if (TR[c] != null) o += hex(TR[c]); else if (k < 256) o += hex(k); else o += '%3F';
    }
    return o;
  }
  async function coz(r) {
    const b = await r.arrayBuffer(), ct = r.headers.get('content-type') || '';
    const kod = /utf-8/i.test(ct) ? 'utf-8' : 'windows-1254';
    let h = new TextDecoder(kod).decode(b);
    if (kod !== 'utf-8' && /<meta[^>]+charset=["']?utf-8/i.test(h.slice(0, 2000))) h = new TextDecoder('utf-8').decode(b);
    return { html: h, url: r.url };
  }
  class MebHata extends Error { constructor(m, tur) { super(m); this.tur = tur || 'hata'; } }
  function denetle({ html, url }) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (/oturumsonu|giris\.aspx|login/i.test(url) || doc.querySelector('input[type=password]') || /Oturum S[üu]reniz Dolmu/i.test(html)) throw new MebHata('MEBBİS oturumu kapandı. MEBBİS’e yeniden girin; iş kaldığı yerden devam eder.', 'oturum');
    if (/Hata Kayna/i.test(html) && /MEBB/i.test(html) && !doc.querySelector('form[id^="FRM" i]')) throw new MebHata('MEBBİS genel hata sayfası döndü (geçersiz değer ya da geçici sorun).', 'mebbis');
    doc.__url = url; return doc;
  }
  let sonIstek = 0;
  async function bekle() { const k = ARA - (Date.now() - sonIstek); if (k > 0) await uyku(k); sonIstek = Date.now(); }
  async function getir(yol) {
    await bekle();
    const r = await fetch(new URL(yol, KOK).href, { credentials: 'include', redirect: 'follow' });
    return { doc: denetle(await coz(r)), yol };
  }
  const anaForm = doc => doc.querySelector('form[id^="FRM" i]') || [...doc.forms].find(f => f.querySelector('[name="__VIEWSTATE"], [name="__VIEWSTATEFIELDCOUNT"]')) || doc.forms[0];
  const elBul = (doc, ad) => doc.getElementById(ad) || doc.querySelector(`[name="${CSS.escape(ad)}"]`) || doc.querySelector(`[id$="${CSS.escape(ad)}"]`);
  const adOf = (doc, ad) => { const el = elBul(doc, ad); return el ? (el.name || el.id) : ad; };
  function alanlar(doc) {
    const f = anaForm(doc), l = []; if (!f) return l;
    f.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.name || el.disabled) return; const t = (el.type || '').toLowerCase();
      if (['submit', 'button', 'image', 'reset', 'file'].includes(t)) return;
      if ((t === 'checkbox' || t === 'radio') && !el.checked) return;
      if (el.tagName === 'SELECT') { const o = el.querySelector('option[selected]') || el.options[0]; if (o) l.push([el.name, o.value]); return; }
      l.push([el.name, el.value || el.getAttribute('value') || '']);
    });
    return l;
  }
  // Formu gönderir. degis: { alanKimliğiYaAdı: değer }. tetik: autopostback yapan alan. dugme: basılan düğme (görselse .x/.y)
  async function postla({ doc, yol }, degis = {}, { tetik = null, dugme = null } = {}) {
    const f = anaForm(doc); if (!f) throw new MebHata('MEBBİS sayfasında form bulunamadı');
    const hedef = new URL(f.getAttribute('action') || yol, doc.__url || new URL(yol, KOK).href).href;
    const m = new Map(alanlar(doc));
    Object.entries(degis).forEach(([k, v]) => m.set(adOf(doc, k), v));
    m.set('__EVENTTARGET', tetik ? adOf(doc, tetik) : ''); m.set('__EVENTARGUMENT', '');
    const govde = [...m].map(([k, v]) => kodla(k) + '=' + kodla(v));
    if (dugme) { const d = elBul(doc, dugme), ad = d ? d.name || d.id : dugme; if (d && (d.type || '').toLowerCase() === 'image') govde.push(kodla(ad + '.x') + '=7', kodla(ad + '.y') + '=7'); else govde.push(kodla(ad) + '=' + kodla(d ? d.value || '' : '')); }
    await bekle();
    const r = await fetch(hedef, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: govde.join('&') });
    return { doc: denetle(await coz(r)), yol };
  }
  // Seçim kutusunda değeri bul: önce değer, sonra metin (tam, baş, içerir); yoksa açık hata (MEBBİS'e geçersiz değer gitmez)
  function secenek(doc, ad, aranan, { metinle = false } = {}) {
    const el = elBul(doc, ad); if (!el || el.tagName !== 'SELECT') throw new MebHata(`MEBBİS formunda “${ad}” alanı yok`);
    const o = [...el.options], a = String(aranan), n = norm(a);
    const x = (!metinle && o.find(y => y.value === a)) || o.find(y => norm(y.textContent) === n) || o.find(y => n && norm(y.textContent).startsWith(n)) || o.find(y => n && norm(y.textContent).includes(n));
    if (!x || x.value === '-1' || x.value === '') throw new MebHata(`“${a}” MEBBİS’te seçeneklerde yok (${ad})`);
    return x.value;
  }
  const autopostback = (doc, ad) => { const el = elBul(doc, ad); return !!(el && /__doPostBack/.test(el.getAttribute('onchange') || '')); };
  // Seçim yapar; seçim sayfayı yeniliyorsa postback ile yeni sayfayı döndürür, yenilemiyorsa bekleyen değişikliklere ekler
  async function sec(s, bekleyen, ad, deger, opt) {
    const v = secenek(s.doc, ad, deger, opt);
    if (autopostback(s.doc, ad)) { const y = await postla(s, { ...bekleyen, [ad]: v }, { tetik: ad }); Object.keys(bekleyen).forEach(k => delete bekleyen[k]); return y; }
    bekleyen[ad] = v; return s;
  }

  /* ---------- tablo okuma ---------- */
  function tabloOku(t) {
    if (!t) return null;
    const satirlar = [...t.rows].filter(r => r.closest('table') === t).map(r => [...r.cells].map(c => metin(c)));
    const stiller = [...t.rows].filter(r => r.closest('table') === t).map(r => r.getAttribute('style') || r.getAttribute('bgcolor') || '');
    const l = satirlar.map((r, i) => ({ r, s: stiller[i] })).filter(x => x.r.some(Boolean));
    if (!l.length) return null;
    return { baslik: l[0].r, satirlar: l.slice(1).map(x => x.r), stil: l.slice(1).map(x => x.s) };
  }
  const tabloId = (doc, id) => tabloOku(doc.querySelector(`table[id$="${id}"]`));
  const tabloBaslikla = (doc, ...desen) => { for (const t of doc.querySelectorAll('table')) { if (t.querySelector('table')) continue; const b = norm(metin(t.rows[0])); if (desen.every(d => d.test(b))) return tabloOku(t); } return null; };
  // MEBBİS'in yanıt sayfasındaki mesajlar: alert(...), IslemSonucu("OK"|"IPTAL"), uyarı etiketleri
  function mesajlar(doc, html) {
    const l = [];
    (html || doc.documentElement.innerHTML).replace(/alert\(\s*(['"])([\s\S]*?)\1\s*\)/g, (_, __, m) => { l.push(m.replace(/\\n/g, ' ').replace(/\\'/g, "'")); return ''; });
    const ok = /IslemSonucu\(\s*["']OK["']/.test(html || ''), iptal = /IslemSonucu\(\s*["']IPTAL["']/.test(html || '');
    doc.querySelectorAll('[id*="lblHata" i], [id*="lblMesaj" i], [id*="lblUyari" i], .hata, .uyari').forEach(el => { const t = metin(el); if (t) l.push(t); });
    return { l, ok, iptal };
  }

  /* ---------- çekme ---------- */
  const SON_DURUMLAR = new Set(['5', '6', '11']);   // sertifika, sertifika iptal, kaydı silindi: yalnız son dönemler
  const CEKME = {
    async gruplar() {
      const a = await getir('/SKT/skt03002.aspx'), b = await getir('/SKT/skt03001.aspx');
      return { sube: tabloBaslikla(a.doc, /sube/, /baslama/), acilis: tabloBaslikla(b.doc, /grup/, /aday/) };
    },
    async kursiyerler(ilerle) {
      const t = await getir('/SKT/skt02006.aspx');
      const durum = [...(elBul(t.doc, 'cmbOgrenciDurumu') || { options: [] }).options].map(o => [o.value, metin(o)]).filter(([v]) => v !== '' && v !== '-1');
      const donemler = [...(elBul(t.doc, 'cmbEgitimDonemi') || { options: [] }).options].map(o => o.value).filter(v => /^\d{6}$/.test(v)).sort().reverse().slice(0, 6);
      if (!durum.length) throw new MebHata('Dönem Adaylarını Onaylama ekranında öğrenci durumu listesi okunamadı');
      const onay = secenek(t.doc, 'cmbDurumu', '4');
      const sonuc = []; let i = 0;
      for (const [dv, dad] of durum) {
        const dl = SON_DURUMLAR.has(dv) ? donemler : ['1'];
        for (const dn of dl) {
          ilerle(`Kursiyerler: ${dad}${dn !== '1' ? ' · ' + dn.slice(0, 4) + '/' + dn.slice(4) : ''}`, ++i / (durum.length + 3 * donemler.length));
          const r = await postla(t, { cmbEgitimDonemi: dn, cmbDurumu: onay, cmbOgrenciDurumu: dv }, { dugme: 'btnListele' });
          const tb = tabloId(r.doc, 'dgListele'); if (tb) sonuc.push({ durum: dv, durumAd: dad, donemSuzgec: dn, ...tb });
        }
      }
      return sonuc;
    },
    async personel() {
      try {
        const t = await getir('/Ookgm/ook12001.aspx');
        const r = await postla(t, { hdnPageMode: 'Sorgulama' });
        const tb = tabloId(r.doc, 'dgPersonelArama'); if (tb) return { kaynak: 'ook12001', ...tb, gecmis: tb.stil.map(s => /ffdcdc/i.test(s)) };
      } catch (x) { if (x.tur === 'oturum') throw x; }
      let t = await getir('/Ookgm/ook54001.aspx'), tb = tabloBaslikla(t.doc, /izinno/);
      if (!tb) { await getir('/Ookgm/ook00001.aspx'); t = await getir('/Ookgm/ook54001.aspx'); tb = tabloBaslikla(t.doc, /izinno/); }
      return tb ? { kaynak: 'ook54001', ...tb, gecmis: tb.satirlar.map(() => false) } : null;
    },
    async araclar() {
      const t = await getir('/SKT/skt01002.aspx'), o = {};
      try { const a = await postla(t, { dropTurSecim: secenek(t.doc, 'dropTurSecim', '1') }, { tetik: 'dropTurSecim' }); o.arac = tabloId(a.doc, 'dgAracBilgileri') || tabloBaslikla(a.doc, /plaka/, /muayene/); } catch (x) { if (x.tur === 'oturum') throw x; }
      try { const s = await postla(t, { dropTurSecim: secenek(t.doc, 'dropTurSecim', '2') }, { tetik: 'dropTurSecim' }); o.simulator = tabloId(s.doc, 'dgSimulatorBilgileri'); } catch (x) { if (x.tur === 'oturum') throw x; }
      return o;
    },
    // Sınav Bilgileri Görüntüleme: uygulamada seçenek bir sınav dönemi (kod), e-sınavda bir ay; son 3 dönem / 2 ay
    async sinavlar(ilerle) {
      const t = await getir('/SKT/skt04003.aspx'), o = { uygulama: [], esinav: [] };
      for (const [tur, adet, tablo] of [['2', 3, 'dgDonemler1'], ['3', 2, 'dgDonemler2']]) {
        const a = await postla(t, { cmbSinavTuru: secenek(t.doc, 'cmbSinavTuru', tur) }, { tetik: 'cmbSinavTuru' });
        const deger = [...new Set([...(elBul(a.doc, 'cmbSinavTarihi') || { options: [] }).options].map(x => x.value).filter(v => v && v !== '0' && v !== '-1'))].slice(0, adet);
        for (const v of deger) { ilerle(`Sınav sonuçları (${tur === '2' ? 'uygulama' : 'e-sınav'})`, 0.5); const r = await postla(a, { cmbSinavTarihi: v }, { dugme: 'btnListeleGrid' }); const tb = tabloId(r.doc, tablo); if (tb) o[tur === '2' ? 'uygulama' : 'esinav'].push({ kod: v, ...tb }); }
      }
      return o;
    },
  };
  // Aday Durum Görüntüleme: tek adayın bütün dosyası
  async function adayDosyasi(taban, tc) {
    const r = await postla(taban, { txtTcKimlikNo: tc }, { dugme: 'ImageButton1' });
    const d = r.doc, govde = metin(d.body);
    const tarihSonra = et => { const m = govde.match(new RegExp(et + '[^0-9]{0,40}(\\d{2}[./]\\d{2}[./]\\d{4})', 'i')); return m ? m[1] : ''; };
    return {
      tc, donem: tabloId(d, 'dgDonemBilgileri'), esinav: tabloId(d, 'dgTeorikSinavlar'), uygulama: tabloId(d, 'dgUygulamaNot'),
      dersler: tabloId(d, 'dgDersProgrami'), sertifika: tabloId(d, 'dgSertifika'),
      ikinciDireksiyon: tarihSonra('İkinci Direksiyon Aşamasına Geçtiği Tarih'), uygunluk: tarihSonra('Uygulama Sınavına Uygunluk Tarihi'),
    };
  }

  /* ---------- yazma: direksiyon ders programı (SKT03004) ---------- */
  // is: { id, tc, donem, grupNo, subeNo, tarih (gg/aa/yyyy), saat (SS:DD), yer ('Akan Trafik'|'Simülatör'), plaka, simulator, izinNo, personelAd, egitimTuru (metin) }
  async function programYaz(is, kodIste) {
    let s = await getir('/SKT/skt03004.aspx'); const b = {};
    s = await sec(s, b, 'cmbDonem', is.donem); s = await sec(s, b, 'cmbGrup', String(is.grupNo)); s = await sec(s, b, 'cmbSube', String(is.subeNo));
    s = await postla(s, b, { dugme: 'btnAdayGetir' }); Object.keys(b).forEach(k => delete b[k]);
    const aday = elBul(s.doc, 'cmbAday');
    if (aday && ![...aday.options].some(o => o.value === is.tc)) throw new MebHata('Aday bu dönem/grup/şubenin direksiyon listesinde yok (MEBBİS’te direksiyona geçmemiş ya da başka şubede)');
    s = await postla(s, { txtTC: is.tc }, { dugme: 'ImageButton1' });
    if (!elBul(s.doc, 'cmbEgitimYeri')) throw new MebHata('Direksiyon ders giriş formu açılmadı');
    const varMi = d => { const t = d.querySelector('table[id$="dgDonemler"]'); return !!t && [...t.querySelectorAll('tr')].some(tr => { const x = metin(tr); return x.includes(is.tarih) && x.includes(is.saat); }); };
    if (varMi(s.doc)) return { ok: true, not: 'MEBBİS’te zaten vardı' };   // aynı ders iki kez girilmez
    s = await sec(s, b, 'cmbEgitimYeri', is.yer, { metinle: true });
    if (/sim/i.test(norm(is.yer))) { const so = elBul(s.doc, 'cmbSimulatorSeriNo'), tek = so ? [...so.options].filter(x => x.value && x.value !== '-1') : []; s = await sec(s, b, 'cmbSimulatorSeriNo', is.simulator || (tek.length === 1 ? tek[0].value : ''), { metinle: !!is.simulator }); }
    else s = await sec(s, b, 'cmbAracBilgileri', is.plaka, { metinle: true });
    b[adOf(s.doc, 'Ustarih1_txtTarihGiris')] = is.tarih;
    s = await sec(s, b, 'cmbDersSaati', is.saat, { metinle: true });
    s = await sec(s, b, 'cmbDersiVerenPersonel', is.izinNo ? 'İzin No:' + is.izinNo : is.personelAd, { metinle: true });
    s = await sec(s, b, 'cmbEgitimTuru', is.egitimTuru || 'Normal', { metinle: true });
    const kaydet = async kod => { const r = await postla(s, { ...b, hiddenKaydet: 'Kaydet', ...(kod ? { txtGirisResmi: kod } : {}) }); return { r, ...mesajlar(r.doc, r.doc.documentElement.innerHTML) }; };
    const dogrula = varMi;
    let k = await kaydet(null);
    for (let deneme = 0; deneme < 3 && !dogrula(k.r.doc) && k.l.some(m => /g[üu]venlik|kod|resim/i.test(m)); deneme++) {
      const kod = await kodIste(s.doc); if (!kod) throw new MebHata('Güvenlik kodu girilmedi');
      k = await kaydet(kod);
    }
    if (dogrula(k.r.doc)) return { ok: true, not: k.l.join(' · ') };
    throw new MebHata(k.l.join(' · ') || 'Kayıt MEBBİS listesinde görünmedi');
  }
  const YAZMA = { program: programYaz };

  /* ---------- durum kartı (sayfanın sol altında) ---------- */
  const kok = document.createElement('div'); kok.id = 'sinyal-motor';
  const g = kok.attachShadow({ mode: 'open' });
  g.innerHTML = `<style>:host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0}
    .k{position:fixed;left:16px;bottom:16px;z-index:2147483647;width:340px;background:#0f1d33;color:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:14px 16px;font-size:13.5px;line-height:1.45}
    .k.gizli{display:none}b{font-weight:700}.ust{display:flex;align-items:center;gap:8px;margin-bottom:6px}.ust i{width:10px;height:10px;border-radius:50%;background:#ffc21a;flex:none}
    .bar{height:6px;background:rgba(255,255,255,.15);border-radius:3px;margin:10px 0 6px;overflow:hidden}.bar i{display:block;height:100%;background:#ffc21a;transition:width .3s}
    small{color:#b9c3d6;display:block}.kod{margin-top:10px;background:#fff;color:#14284b;border-radius:10px;padding:10px}.kod img{display:block;max-width:100%;margin:6px 0;border:1px solid #ddd;border-radius:6px}
    input{width:100%;height:38px;border:1.5px solid #c8d0de;border-radius:8px;padding:0 10px;font-size:16px;letter-spacing:2px}
    button{cursor:pointer;border:0;border-radius:8px;height:34px;padding:0 12px;font-weight:700;font-size:13px}.ana{background:#ffc21a;color:#14284b}.cz{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.35)}
    .alt{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}</style>
    <div class="k gizli"><div class="ust"><i></i><b>mdSinyal · MEBBİS’te çalışıyor</b></div><div data-adim></div><div class="bar"><i style="width:0"></i></div><small data-alt></small><div data-kod></div><div class="alt"><button class="cz" data-dur>Durdur</button></div></div>`;
  const kart = g.querySelector('.k'), q = s => g.querySelector(s);
  let durdur = false;
  q('[data-dur]').addEventListener('click', () => { durdur = true; q('[data-alt]').textContent = 'Durduruluyor…'; });
  const goster = (adim, oran, alt) => { kart.classList.remove('gizli'); if (adim != null) q('[data-adim]').textContent = adim; if (oran != null) q('.bar i').style.width = Math.round(Math.min(1, oran) * 100) + '%'; if (alt != null) q('[data-alt]').textContent = alt; };
  // Güvenlik kodu: MEBBİS'in o anki kod resmi gösterilir, kullanıcı yazar (kod otomatik çözülmez)
  function kodIste(doc) {
    return new Promise(async ok => {
      const giris = elBul(doc, 'txtGirisResmi'); let src = '';
      const img = doc.querySelector('img[src*="uvenlik" i], img[src*="aptcha" i], img[src*="Resim" i][src*=".aspx" i], img[id*="Guvenlik" i], img[id*="Resim" i]') || (giris && giris.parentElement && giris.parentElement.querySelector('img'));
      if (img) { try { const r = await fetch(new URL(img.getAttribute('src'), doc.__url || location.href).href, { credentials: 'include' }); src = URL.createObjectURL(await r.blob()); } catch (x) { } }
      const k = q('[data-kod]');
      k.innerHTML = `<div class="kod"><b>MEBBİS güvenlik kodu istiyor</b>${src ? `<img src="${src}" alt="Güvenlik kodu">` : '<small style="color:#a12a20">Kod resmi alınamadı; MEBBİS sayfasının üstündeki kodu yazın.</small>'}<input maxlength="6" autocomplete="off" aria-label="Güvenlik kodu"><div class="alt"><button class="cz" style="color:#14284b;border-color:#c8d0de" data-iptal>Atla</button><button class="ana" data-tamam>Devam</button></div></div>`;
      const inp = k.querySelector('input'); inp.focus();
      const bit = v => { k.innerHTML = ''; ok(v); };
      k.querySelector('[data-tamam]').addEventListener('click', () => bit(inp.value.trim()));
      k.querySelector('[data-iptal]').addEventListener('click', () => bit(''));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') bit(inp.value.trim()); });
    });
  }

  /* ---------- toplu işi yürütme ---------- */
  let calisiyor = false;
  async function yurut() {
    if (calisiyor) return; const is = await gonder({ tur: 'toplu-al' }); if (!is || is.bitti) return;
    if (document.querySelector('input[type=password]')) { goster('MEBBİS’e kendi şifrenizle girin', 0, 'Girişten sonra mdSinyal’in işi kendiliğinden başlar.'); return; }
    calisiyor = true; durdur = false;
    const sonuc = is.sonuc || { veri: {}, yazilan: [], hata: null }; sonuc.hata = null;
    const kaydet = async (bitti) => gonder({ tur: 'toplu-durum', id: is.id, sonuc, bitti: !!bitti });
    const ilerle = (adim, oran) => { goster(adim, oran, 'Bu sekmeyi kapatmayın; MEBBİS’te başka işlem yapabilirsiniz.'); sonuc.adim = adim; };
    try {
      for (const ne of is.cek || []) {
        if (durdur) break; if (sonuc.veri[ne] !== undefined) continue;
        ilerle({ gruplar: 'Dönem grupları okunuyor', kursiyerler: 'Kursiyerler okunuyor', personel: 'Personel okunuyor', araclar: 'Araçlar okunuyor', sinavlar: 'Sınav sonuçları okunuyor' }[ne] || ne, 0);
        try { sonuc.veri[ne] = await CEKME[ne](ilerle); } catch (x) { if (x.tur === 'oturum') throw x; sonuc.veri[ne] = { hata: x.message }; }
        await kaydet(false);
      }
      if ((is.dosya || []).length && !durdur) {
        const taban = await getir('/SKT/skt02009.aspx'); sonuc.veri.dosya = sonuc.veri.dosya || [];
        const yapilan = new Set(sonuc.veri.dosya.map(x => x.tc));
        for (const [i, tc] of is.dosya.entries()) { if (durdur) break; if (yapilan.has(tc)) continue; ilerle(`Aday dosyaları ${i + 1}/${is.dosya.length}`, (i + 1) / is.dosya.length); try { sonuc.veri.dosya.push(await adayDosyasi(taban, tc)); } catch (x) { if (x.tur === 'oturum') throw x; sonuc.veri.dosya.push({ tc, hata: x.message }); } if (i % 5 === 4) await kaydet(false); }
        await kaydet(false);
      }
      const yazilacak = (is.yaz || []).filter(x => !sonuc.yazilan.some(y => y.id === x.id));
      for (const [i, x] of yazilacak.entries()) {
        if (durdur) break;
        ilerle(`MEBBİS’e yazılıyor ${i + 1}/${yazilacak.length}: ${x.baslik || x.tur}`, (i + 1) / yazilacak.length);
        try { const r = await YAZMA[x.tur](x, kodIste); sonuc.yazilan.push({ id: x.id, ok: true, not: r.not || '' }); }
        catch (h) { if (h.tur === 'oturum') throw h; sonuc.yazilan.push({ id: x.id, ok: false, not: h.message }); }
        await kaydet(false);
      }
      await kaydet(!durdur);
      const ok = sonuc.yazilan.filter(x => x.ok).length, hata = sonuc.yazilan.filter(x => !x.ok).length;
      goster(durdur ? 'Durduruldu' : '✓ Bitti', 1, (is.yaz || []).length ? `${ok} kayıt MEBBİS’e girildi ve doğrulandı${hata ? `, ${hata} kayıt girilemedi` : ''}. Sonuç mdSinyal’de.` : 'Veriler mdSinyal’e gönderildi.');
      if (!durdur) setTimeout(() => gonder({ tur: 'sinyal-ac' }), 1500);
      setTimeout(() => kart.classList.add('gizli'), 12000);
    } catch (x) {
      sonuc.hata = x.message; await kaydet(false);
      goster(x.tur === 'oturum' ? 'MEBBİS oturumu kapandı' : 'Durdu', null, x.message);
    } finally { calisiyor = false; }
  }
  const ekle = () => { if (!document.body) return setTimeout(ekle, 300); document.body.appendChild(kok); yurut(); };
  ekle();
  chrome.runtime.onMessage.addListener(m => { if (m && (m.tur === 'yeniden-bak' || m.tur === 'toplu-basla')) yurut(); });
})();
