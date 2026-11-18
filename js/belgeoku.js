// KAY-033/034: belgeden okuma — yalnız cihazda. Kullanıcı kararı: görüntü hiçbir sunucuya, yapay zekâya gitmez.
// T.C. kimlik kartının arka yüzündeki MRZ (3 satır) tarayıcıda OCR ile okunur (js/tesseract: tesseract.js, depoda; CDN yok),
// kontrol haneleri ve T.C. algoritması js/mrz.js'te denetlenir. Tutan alanlar yalnız formdaki BOŞ alanlara, kullanıcı seçip onaylayınca yazılır.
// Sürücü belgesinde (Karayolları Trafik Yönetmeliği Ek-28) makine okunur alan yok; desteklenmez.
// Okuyucu dosyaları (~6 MB) ancak "Belgeden oku" açılınca yüklenir; pencere kapanınca işçi kapatılır. Görsel okumadan sonra bırakılır.
import { e, ik, pencere, kapatPencere, bildir } from './ui.js?v=234';
import { mrzBul } from './mrz.js?v=234';

const AD = { tc: 'T.C. kimlik no', soyad: 'Soyad', ad: 'Ad', dogumTarihi: 'Doğum tarihi', cinsiyet: 'Cinsiyet', belgeNo: 'Kimlik kartı seri no', sonGecerlilik: 'Son geçerlilik' };
// okunan alan → kayıt formundaki alan (name); listede olmayanlar yalnız bilgi olarak gösterilir
const HEDEF = { tc: 'tc', soyad: 'soyad', ad: 'ad', dogumTarihi: 'dogumTarihi', cinsiyet: 'cinsiyet', belgeNo: 'kimlikSeri' };
const ADLAR = new Set(['ad', 'soyad']);   // MRZ'de Türkçe harf yok: kullanıcı karşılaştırıp kendisi seçer

const hataTr = m => Object.assign(new Error(m), { tr: true });   // kullanıcıya olduğu gibi gösterilen Türkçe hata

// --- yerel OCR (tesseract.js, js/tesseract/) ---
const KOK = new URL('./tesseract/', import.meta.url).href;
const simdVar = () => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (x) { return false; } };
let hazirlik = null, durumBildir = null;
function okuyucu() {
  if (hazirlik) return hazirlik;
  hazirlik = (async () => {
    if (typeof WebAssembly !== 'object' || typeof Worker !== 'function') throw hataTr('Bu tarayıcı cihazda okumayı desteklemiyor. Bilgileri elle girin.');
    const T = (await import('./tesseract/tesseract.esm.min.js?v=234')).default;
    const w = await T.createWorker('ocrb_int', 1, {
      workerPath: KOK + 'worker.min.js', corePath: KOK + (simdVar() ? 'tesseract-core-simd-lstm.js' : 'tesseract-core-lstm.js'), langPath: KOK,
      workerBlobURL: false, cacheMethod: 'none', gzip: true, logger: m => durumBildir && durumBildir(m),
    }, { load_system_dawg: '0', load_freq_dawg: '0' });
    // user_defined_dpi: verilmezse tesseract her okumada konsola "Estimating resolution" yazar
    await w.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<', user_defined_dpi: '300' });
    return w;
  })();
  hazirlik.catch(() => { hazirlik = null; });
  return hazirlik;
}
function okuyucuKapat() { const h = hazirlik; hazirlik = null; durumBildir = null; if (h) h.then(w => w.terminate()).catch(() => { }); }

// Dosya → <img> (EXIF yönü tarayıcıca uygulanır). Nesne adresi hemen bırakılır.
function gorselAc(dosya) {
  return new Promise((ok, red) => {
    if (!/^image\//.test(dosya.type || '') && !/\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(dosya.name || '')) return red(hataTr('Fotoğraf seçin (JPEG, PNG).'));
    const u = URL.createObjectURL(dosya), img = new Image();
    img.onload = () => { URL.revokeObjectURL(u); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(u); red(hataTr('Fotoğraf açılamadı. Başka bir fotoğraf deneyin.')); };
    img.src = u;
  });
}
// Döndür (aci: derece, eğim düzeltmesi dahil), gerekirse alt kısmı kes (MRZ kartın altında), griye çevir, karşıtlığı aç;
// esik: yerel ortalamayla siyah-beyaz; en: hedef genişlik (eğim ölçümü için küçük kopya)
function hazirla(img, aci, alt, esik, en) {
  const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height, r = aci * Math.PI / 180, cs = Math.abs(Math.cos(r)), sn = Math.abs(Math.sin(r));
  const gw = W0 * cs + H0 * sn, gh = W0 * sn + H0 * cs;   // döndürülmüş görselin kutusu
  // MRZ harfleri ~30-60 piksel boy olsun: geniş görsel küçültülür, küçük görsel en çok 2 kat büyütülür
  const k = en ? en / gw : Math.min(gw > 2000 ? 2000 / gw : gw < 1400 ? Math.min(2, 1400 / gw) : 1, 3000 / gh);
  const w = Math.max(1, Math.round(gw * k)), h = Math.max(1, Math.round(gh * k));
  const y0 = alt ? Math.round(h * 0.4) : 0, c = document.createElement('canvas'); c.width = w; c.height = h - y0;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.translate(w / 2, h / 2 - y0); x.rotate(r);
  x.drawImage(img, -W0 * k / 2, -H0 * k / 2, W0 * k, H0 * k);
  x.setTransform(1, 0, 0, 1, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data, n = c.width * c.height, g = new Uint8ClampedArray(n), sayi = new Uint32Array(256);
  for (let i = 0; i < n; i++) { const v = (d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 | 0; g[i] = v; sayi[v]++; }
  let lo = 0, hi = 255, t = 0; for (; lo < 255 && (t += sayi[lo]) < n * 0.02; lo++); t = 0; for (; hi > 0 && (t += sayi[hi]) < n * 0.02; hi--);
  const ol = hi > lo + 10 ? 255 / (hi - lo) : 1;
  for (let i = 0; i < n; i++) g[i] = Math.max(0, Math.min(255, (g[i] - lo) * ol));
  if (esik) {   // yerel ortalama eşiği (parlak/gölgeli kartta tek eşik yetmez): integral görüntü
    const W = c.width, H = c.height, I = new Float64Array((W + 1) * (H + 1)), r = Math.max(8, Math.round(W / 40));
    for (let yy = 1; yy <= H; yy++) { let s = 0; for (let xx = 1; xx <= W; xx++) { s += g[(yy - 1) * W + xx - 1]; I[yy * (W + 1) + xx] = I[(yy - 1) * (W + 1) + xx] + s; } }
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const a = Math.max(0, xx - r), b = Math.max(0, yy - r), cx = Math.min(W, xx + r + 1), cy = Math.min(H, yy + r + 1);
      const ort = (I[cy * (W + 1) + cx] - I[b * (W + 1) + cx] - I[cy * (W + 1) + a] + I[b * (W + 1) + a]) / ((cx - a) * (cy - b));
      g[yy * W + xx] = g[yy * W + xx] < ort * 0.85 ? 0 : 255;
    }
  }
  for (let i = 0; i < n; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g[i]; d[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0);
  return c;
}
// Eğim: koyu piksellerin satır izdüşümünün en keskin olduğu açı (−12°…12°). Dönüş: düzeltmek için eklenecek derece.
function egimBul(img, aci) {
  const c = hazirla(img, aci, false, false, 640), W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data; c.width = c.height = 0;
  const px = [], py = [];
  // yalnız yazı izleri: koyu ve yatayda yakınında açık piksel olan (koyu zemin, kartın kenarı sayılmaz)
  const k = (x, y) => d[(y * W + x) * 4] < 90;
  for (let y = 0; y < H; y++) for (let x = 3; x < W - 3; x++) if (k(x, y) && (!k(x - 3, y) || !k(x + 3, y))) { px.push(x); py.push(y); }
  if (px.length < 200) return 0;
  const adim = Math.max(1, Math.floor(px.length / 40000)), pay = W + H;
  const puan = a => { const r = a * Math.PI / 180, s = Math.sin(r), co = Math.cos(r), h = new Uint32Array(2 * pay + 1); let t = 0; for (let i = 0; i < px.length; i += adim) h[Math.round(py[i] * co - px[i] * s) + pay]++; for (const v of h) t += v * v; return t; };
  let en = 0, ep = -1;
  for (let a = -12; a <= 12; a += 0.5) { const p = puan(a); if (p > ep) { ep = p; en = a; } }
  for (let a = en - 0.4; a <= en + 0.41; a += 0.1) { const p = puan(a); if (p > ep) { ep = p; en = a; } }
  return Math.abs(en) < 0.3 ? 0 : -en;
}
// Birkaç deneme: alt kısım / bütün görsel, ters tutulmuşsa 180°, dik çekilmişse 90° / 270° (eğim her yön için düzeltilir); sonra yerel eşikle.
// Bütün kontroller tutunca durur.
async function mrzOku(w, img, ilerle) {
  const dik = (img.naturalHeight || img.height) > (img.naturalWidth || img.width) * 1.15;
  const plan = dik ? [[90, 1], [270, 1], [90, 0], [270, 0]] : [[0, 1], [180, 1], [0, 0], [180, 0]];
  const egim = {};
  let en = null, enAci = plan[0][0];
  const dene = async (aci, alt, esik) => {
    if (!(aci in egim)) egim[aci] = egimBul(img, aci);
    const c = hazirla(img, aci + egim[aci], alt, esik);
    await w.setParameters({ tessedit_pageseg_mode: alt ? '6' : '3' });
    const { data } = await w.recognize(c);
    c.width = c.height = 0;
    const r = mrzBul(data.text);
    if (r && (!en || r.puan > en.puan)) { en = r; enAci = aci; }
    return en && en.tamam;
  };
  const esikli = () => en ? [1, 0] : [1], n = () => plan.length + esikli().length;   // hiç MRZ izi yoksa yerel eşik yalnız alt kısımda denenir
  for (let i = 0; i < plan.length; i++) { ilerle(i + 1, n()); if (await dene(...plan[i], false)) return en; }
  const l = esikli();
  for (let i = 0; i < l.length; i++) { ilerle(plan.length + i + 1, n()); if (await dene(enAci, l[i], true)) return en; }
  return en;
}

// form alanına değer koy (select'te seçenek yoksa koymaz; radyo düğmesinde değeri eşleşeni seçer); doldurulanı işaretle
function koy(f, ad, deger) {
  const radyo = f.querySelector(`input[type=radio][name="${ad}"][value="${CSS.escape(deger)}"]`);
  const el = radyo || f.querySelector(`[name="${ad}"]`); if (!el || (!radyo && (el.type === 'radio' || el.type === 'checkbox'))) return false;
  if (el.tagName === 'SELECT' && ![...el.options].some(o => (o.value || o.textContent) === deger)) return false;
  if (radyo) radyo.checked = true; else el.value = deger;
  const dt = el.closest('details'); if (dt) dt.open = true;
  (radyo ? radyo.closest('label') || radyo : el).classList.add('oku-dolu');
  el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
const deger = (f, ad) => { const r = f.querySelector(`input[type=radio][name="${ad}"]`); if (r) return (f.querySelector(`input[type=radio][name="${ad}"]:checked`) || {}).value || ''; const el = f.querySelector(`[name="${ad}"]`); return el ? String(el.value || '').trim() : ''; };
const alanVar = (f, ad) => !!f.querySelector(`[name="${ad}"]`);
const tarihTr = v => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('.') : v;

const IPUCU = `<ul style="margin:6px 0 0;padding-left:18px;font-size:14px">
  <li>Kartın <b>arka yüzünü</b> çekin; alttaki üç satır (<b>I&lt;TUR…</b>) tam görünsün.</li>
  <li>Kartı düz bir yüzeye koyun, ışık yansımasın, gölge düşmesin.</li>
  <li>Yaklaşın: kart fotoğrafın çoğunu kaplasın, yazılar net olsun.</li></ul>`;

// kap: kayıt formunun penceresi (içinde <form>). Açık pencere üstte açılır, kapanınca form aynen geri gelir.
export function belgeOkuAc(kap) {
  const f = kap.querySelector('form'); if (!f) return;
  pencere({ baslik: 'Belgeden oku', ust: true, taslak: false,
    icerik: `<p style="font-size:14px;margin:0 0 6px"><b>T.C. kimlik kartı (arka yüz)</b> · alttaki üç satırlık makine okunur alan (MRZ) okunur.</p>
      <p style="font-size:14px;color:var(--soluk);margin:0 0 12px">Okunan bilgiler yalnız <b>boş</b> alanlara, siz onaylayınca yazılır. Sürücü belgesinde okunabilir alan yok; onu elle girin.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label class="dg dg-ana" style="cursor:pointer;display:inline-flex">${ik('kart')}Fotoğraf çek<input type="file" accept="image/*" capture="environment" data-bo-dosya hidden></label>
        <label class="dg dg-cizgi" style="cursor:pointer;display:inline-flex">${ik('belge')}Görsel seç<input type="file" accept="image/*" data-bo-dosya hidden></label>
      </div>
      <div data-bo-sonuc data-taslak-yok aria-live="polite" style="margin-top:14px"></div>
      <p class="ipucu" style="margin-top:12px">${ik('kilit')}<span><b>Görüntü cihazınızdan çıkmaz.</b> Okuma bu cihazda yapılır; fotoğraf hiçbir yere gönderilmez ve okumadan sonra bırakılır. Okunanı belgeyle karşılaştırın.</span></p>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-bo-yaz disabled>Boş alanlara yaz</button>',
    onAc(p) {
      const sonuc = p.querySelector('[data-bo-sonuc]'), yazB = p.querySelector('[data-bo-yaz]');
      let okunan = null, calisiyor = false;
      const yaz = h => { sonuc.innerHTML = h; };
      const satir = m => `<p style="font-size:14px;margin:0">${ik('saat')} ${e(m)}</p>`;
      // okuyucu pencere açılınca hazırlanır (ilk seferde indirilir); pencere kapanınca kapatılır
      durumBildir = m => { if (calisiyor && m && /loading|initializing/.test(m.status || '')) yaz(satir('Okuyucu hazırlanıyor…' + (m.progress ? ' %' + Math.round(m.progress * 100) : ''))); };
      okuyucu().catch(() => { });
      const izle = new MutationObserver(() => { if (!p.isConnected) { izle.disconnect(); okuyucuKapat(); } });
      izle.observe(document.body, { childList: true });

      p.addEventListener('change', async ev => {
        if (!ev.target.matches('[data-bo-dosya]') || !ev.target.files[0] || calisiyor) return;
        let dosya = ev.target.files[0]; ev.target.value = '';
        calisiyor = true; yazB.disabled = true; okunan = null;
        yaz(satir('Okuyucu hazırlanıyor…'));
        let img = null;
        try {
          const w = await okuyucu();
          img = await gorselAc(dosya); dosya = null;
          const r = await mrzOku(w, img, (i, n) => yaz(satir(`Okunuyor… (${i}/${n})`)));
          img.src = ''; img = null;
          const l = r ? Object.entries(r.alanlar) : [];
          if (!l.length) { yaz(`<p style="font-size:14px;color:var(--turuncu);margin:0"><b>Kimliğin alttaki üç satırı okunamadı.</b> Yeniden deneyin ya da bilgileri elle girin.</p>${IPUCU}<p style="margin:10px 0 0"><button type="button" class="dg dg-hafif dg-kucuk" data-kapat>Elle gireceğim</button></p>`); return; }
          okunan = r.alanlar;
          const eksik = ['tc', 'dogumTarihi', 'belgeNo'].filter(k => !okunan[k]).map(k => AD[k]);
          const bitti = okunan.sonGecerlilik && okunan.sonGecerlilik < new Date().toISOString().slice(0, 10);
          yaz(`${bitti ? `<p style="font-size:14px;color:var(--kirmizi);margin:0 0 6px">${ik('uyari')} Kimliğin geçerlilik süresi dolmuş (${e(tarihTr(okunan.sonGecerlilik))}).</p>` : ''}<ul class="liste">${l.map(([k, v]) => {
            const hedef = HEDEF[k], var_ = hedef && alanVar(f, hedef), mevcut = var_ ? deger(f, hedef) : '', dolu = !!mevcut, adMi = ADLAR.has(k);
            const not = !var_ ? 'yalnız bilgi' : adMi ? `MRZ’de Türkçe harf yok (Ö→O, Ş→S, İ→I): belgeyle karşılaştırıp seçin${dolu ? ' · formda: ' + e(mevcut) : ''}` : dolu ? 'formda dolu: ' + e(mevcut) + ' · seçerseniz değiştirilir' : 'kontrol hanesi tuttu · boş alana yazılacak';
            return `<li><label style="display:flex;gap:10px;align-items:flex-start;width:100%">${var_ ? `<input type="checkbox" data-bo-al="${e(k)}" ${dolu || adMi ? '' : 'checked'}>` : '<span style="width:18px"></span>'}<span style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(AD[k] || k)}</b> <span>${e(tarihTr(v))}</span><small style="display:block;color:var(--soluk)">${not}</small></span></label></li>`;
          }).join('')}</ul>${eksik.length ? `<p style="font-size:13px;color:var(--soluk);margin:8px 0 0">Doğrulanamadığı için gösterilmeyen: ${e(eksik.join(', '))}. Daha net bir fotoğrafla yeniden deneyebilir ya da elle girebilirsiniz.</p>` : ''}`);
          yazB.disabled = !p.querySelector('[data-bo-al]');
        } catch (x) {   // kitaplığın İngilizce hataları gösterilmez
          const m = x.tr ? x.message : 'Okuyucu çalışmadı. Bağlantınızı kontrol edip yeniden deneyin ya da bilgileri elle girin.';
          yaz(`<p style="font-size:14px;color:var(--kirmizi);margin:0">${e(m)}</p>${x.tr ? '' : IPUCU}`);
        } finally { if (img) img.src = ''; img = null; dosya = null; calisiyor = false; }
      });
      yazB.addEventListener('click', () => {
        if (!okunan) return; let n = 0;
        p.querySelectorAll('[data-bo-al]:checked').forEach(c => { const k = c.dataset.boAl; if (koy(f, HEDEF[k], okunan[k])) n++; });
        okunan = null; kapatPencere();
        bildir(n ? `${n} alan dolduruldu; sarı alanları belgeyle karşılaştırın` : 'Yazılacak alan seçilmedi', n ? 'tamam' : 'uyari');
      });
    } });
}
