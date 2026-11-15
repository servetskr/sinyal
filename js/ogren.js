// Öğren: içerik haritası (ana ekran) ve modül sayfaları. Ders oynatıcı js/ogr/ders.js, ortak veri js/ogr/ogrveri.js.
import { S, ogrOzellik } from './veri.js?v=205';
import { e, ik } from './ui.js?v=205';
import { MUFREDAT } from './ogrenci.js?v=205';
import { UNITE_AD, ILKYARDIM_SVG, kapakSvg, konular, bitti, sonuc, siradaki, sayac, levhaYukle, veriler, altEkran, altAc, altKapat } from './ogr/ogrveri.js?v=205';
import { dersBaslat } from './ogr/ders.js?v=205';
import { SAHNELER } from './tehlike.js?v=205';
import { esc, oi, sayfaBas, geri, bolum, heroKart, gorsel, dugme, liste, satir, konuSatir, serit, bos, stilEkle } from './ogr/ui.js?v=205';
export { siradaki, dersBaslat };
export const onYukle = cb => { if (!veriler().LV) levhaYukle().then(() => cb && cb()); };

/* ---------- Öğren ana ekranı ---------- */
export function ustHtml(k) {
  const s = siradaki(k), tum = konular(), biten = tum.filter(x => bitti(k, x.id)).length;
  if (!s) return `<section class="ogn-ust"><div class="ogn-ust-ic"><p class="ogn-goz">Öğren</p><h1 class="ogn-h1">Bütün konuları bitirdin</h1><p class="ogn-ust-alt">${tum.length} konunun hepsini tamamladın. Deneme sınavlarıyla hazır kal.</p><button class="ogn-dg-sari" data-test-basla="deneme">Deneme sınavı çöz ${ik('sag')}</button></div></section>`;
  const adim = s.adim || 0, top = s.top || 0, yuzde = top ? Math.round(adim / top * 100) : 0;
  return `<section class="ogn-ust"><div class="ogn-ust-ic">
    <div class="ogn-ust-sat"><p class="ogn-goz">Öğren</p><p class="ogn-ilerle"><b>${biten}</b>/${tum.length} konu</p></div>
    <button class="ogn-devam" data-ogn-ders="${s.id}" aria-label="${e(s.ad)} konusuna ${adim ? 'devam et' : 'başla'}">
      <span class="ogn-kapak" aria-hidden="true">${kapakSvg(s.id)}</span>
      <span class="ogn-devam-yazi"><small>${adim ? 'Kaldığın yer' : 'Sıradaki konu'}</small><b>${e(s.ad)}</b>
        ${top ? `<span class="ogn-cubuk" role="progressbar" aria-valuenow="${yuzde}" aria-valuemin="0" aria-valuemax="100"><i style="width:${yuzde}%"></i></span>` : `<span class="ogn-sure">${s.no}. konu · yaklaşık 6 dk</span>`}</span>
    </button>
    <button class="ogn-dg-sari" data-ogn-ders="${s.id}">${adim ? 'Devam et' : 'Başla'} ${ik('sag')}</button>
  </div></section>`;
}
// İçerik haritası: dört ünite + sınava hazırlık; her biri ayrı modül sayfası açar
export const modulAcik = () => altEkran();
export const modulKapat = () => altKapat();
const SINAV_SVG = '<svg viewBox="0 0 120 120" role="img" aria-label="e-Sınav"><rect x="10" y="22" width="100" height="76" rx="8" fill="#0a4da2"/><rect x="16" y="28" width="88" height="64" rx="5" fill="none" stroke="#fff" stroke-width="2.5"/><text x="60" y="58" text-anchor="middle" font-family="Overpass,Arial,sans-serif" font-weight="800" font-size="19" fill="#fff">e-SINAV</text><text x="60" y="80" text-anchor="middle" font-family="Overpass,Arial,sans-serif" font-weight="700" font-size="14" fill="#fff">50 SORU</text></svg>';
const modulSvg = key => key === 'sinav' ? SINAV_SVG : key === 'ilkyardim' ? ILKYARDIM_SVG : ((veriler().LV && veriler().LV.LEVHA[{ trafik: 'T-20', motor: 'B-24', adab: 'T-11' }[key]]) || {}).svg || '';
export function haritaHtml(k) {
  const s = siradaki(k), son = (k.deneme || []).slice(-1)[0];
  const sat = (key, no, ad, alt, b, t, cip) => `<li class="ogn-mod ${cip[0]}"><button data-ogn-modul="${key}"><span class="ogn-mod-art" aria-hidden="true">${modulSvg(key)}</span>
    <span class="ogn-mod-yazi"><small>${no}. modül</small><b>${e(ad)}</b><span>${alt}</span>${t ? `<span class="ogn-mod-cubuk"><i style="width:${Math.round(b / t * 100)}%"></i></span>` : ''}</span>
    <span class="ogn-cip ${cip[0]}">${cip[1]}</span></button></li>`;
  const uniteler = MUFREDAT.map(([key, ad], n) => { const [b, t] = sayac(k, key); const cip = b === t ? ['bitti', 'Tamamlandı'] : s && s.key === key ? ['simdi', 'Sıradaki'] : b ? ['', 'Devam'] : ['', 'Başla']; return sat(key, n + 1, ad, `${b}/${t} konu`, b, t, cip); }).join('');
  const sinav = sat('sinav', MUFREDAT.length + 1, 'Sınava hazırlan', son != null ? `Son deneme puanın ${son}` : 'Deneme sınavı, yanlışların, tekrar', 0, 0, (k.esinav && k.esinav.sonuc === 'Geçti') ? ['bitti', 'Geçtin'] : !s ? ['simdi', 'Sıradaki'] : ['', 'Aç']);
  return `<h2 class="ogn-bolum-bas ilk">İçerik haritası</h2><ol class="ogn-harita">${uniteler}${sinav}</ol>`;
}
export function modulBas(baslik, alt, b, t) {
  return `<header class="ogn-mod-bas"><button class="ogn-geri-dg" data-ogn-harita>${ik('sol')}İçerik haritası</button><h1>${e(baslik)}</h1>${alt ? `<p>${alt}</p>` : ''}${t ? `<span class="ogn-mod-cubuk buyuk"><i style="width:${Math.round(b / t * 100)}%"></i></span>` : ''}</header>`;
}
const ARACLAR = { trafik: [['data-tehlike', 'Tehlike algısı']], motor: [['data-ikaz', 'İkaz lambaları'], ['data-motor4', '4 zamanlı motor'], ['data-debriyaj', 'Debriyaj ve kalkış']] };
export function modulHtml(k, key) {
  const m = MUFREDAT.find(x => x[0] === key), s = siradaki(k), [b, t] = sayac(k, key);
  const liste = `<ol class="ogn-yol tek">${m[3].map((baslik, i) => {
    const id = key + '-' + (i + 1), ok = bitti(k, id), simdi = s && s.id === id, r = sonuc(k, id);
    const durum = ok ? (r ? `${r[0]}/${r[1]} doğru` : 'Tamamlandı') : simdi ? (s.adim ? 'Kaldığın yer' : 'Sıradaki') : 'Kısa kartlar · 5 soru';
    return `<li class="${ok ? 'bitti' : simdi ? 'simdi' : 'sonra'}"><button data-ogn-ders="${id}"><span class="ogn-isaret" aria-hidden="true">${ok ? ik('tik') : simdi ? `<b>${i + 1}</b>` : i + 1}</span><span class="ogn-konu"><b>${e(baslik)}</b><small>${durum}</small></span></button></li>`;
  }).join('')}</ol>`;
  const ar = (ARACLAR[key] || []).length ? `<h2 class="ogn-bolum-bas">Bu modülde ayrıca</h2><div class="ogn-araclar">${ARACLAR[key].map(([a, t2]) => `<button class="ogn-arac" ${a}>${e(t2)}${ik('sag')}</button>`).join('')}</div>` : '';
  return modulBas(m[1], `${b}/${t} konu tamamlandı`, b, t) + liste + ar;
}
export function bagla(kap, k, yenile) {
  kap.addEventListener('click', ev => {
    const md = ev.target.closest('[data-ogn-modul]'); if (md) { altAc(md.dataset.ognModul); yenile(); return scrollTo(0, 0); }
    if (ev.target.closest('[data-ogn-harita]')) { altKapat(); yenile(); return scrollTo(0, 0); }
    const d = ev.target.closest('[data-ogn-ders]'); if (d) dersBaslat(k, d.dataset.ognDers, yenile);
  });
}

/* ---------- yeni tasarım (js/ogr/ekran.js yönlendiricisi çağırır) ---------- */
// Öğren ana ekranı, modül sayfaları (trafik|ilkyardim|motor|adab) ve tüm konular (tum | tum:<modül>).
const MODUL_GORSEL = { trafik: 'modul-trafik', ilkyardim: 'modul-ilkyardim', motor: 'modul-motor', adab: 'modul-adab' };
const DERS_SORU = 5; // her kısa derste 5 soru (ogr/ders.js sorulariSec; her konunun havuzunda en az 5 soru var)
const KESFET = [['etkilesim:ikaz', 'İkaz lambaları', 'ikaz'], ['etkilesim:motor', '4 zamanlı motor', 'motor'], ['etkilesim:kalkis', 'Debriyaj ve kalkış', 'motor']];
const buyukHarf = t => t ? t.charAt(0).toLocaleUpperCase('tr') + t.slice(1) : t;
// "Trafik işaretleri: uyarı, tanzim ve bilgi levhaları" → ["Trafik işaretleri", "Uyarı, tanzim ve bilgi levhaları"]
const baslikBol = ad => { const i = ad.indexOf(':'); return i > 0 ? [ad.slice(0, i).trim(), buyukHarf(ad.slice(i + 1).trim())] : [ad, '']; };
// arama için sadeleştir: küçük harf, Türkçe harfler ve noktalama yok sayılır ("isaret" → "işaretleri")
const sade = t => String(t).toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' }[c])).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const modulKonular = key => konular().filter(x => x.key === key);
// modülde sıradaki konu: yarım ders bu modüldeyse o, yoksa modülün ilk bitmemiş konusu
const modulSiradaki = (k, key) => { const s = siradaki(k); if (s && s.key === key) return s.id; const x = modulKonular(key).find(y => !bitti(k, y.id)); return x ? x.id : null; };
function konuSatiri(k, x, siraId = null) {
  const ok = bitti(k, x.id), r = sonuc(k, x.id);
  const ek = ok && r ? `<small class="ox-ogr-sonuc">${r[0]} / ${r[1]} doğru</small>` : '';
  return konuSatir({ no: x.no, ad: `<span>${esc(x.ad)}</span>${ek}`, durum: ok ? 'bitti' : x.id === siraId ? 'siradaki' : '', attrs: { 'data-og-ders': x.id, 'data-ox-ogr-sade': sade(x.ad), 'aria-label': `${x.no}. konu: ${x.ad}${ok ? ', tamamlandı' : x.id === siraId ? ', sıradaki' : ''}` } });
}

function anaHtml(k) {
  const tum = konular(), biten = tum.filter(x => bitti(k, x.id)).length, s = siradaki(k);
  const esGecti = !!(k.esinav && k.esinav.sonuc === 'Geçti');
  let hero;
  if (!s) {
    hero = heroKart({ ust: 'Eğitim konuları', baslik: 'Hepsini bitirdin', alt: `${tum.length} konunun hepsi tamam.`, meta: esGecti ? 'Bilgini denemeyle taze tut.' : 'Sırada deneme sınavı var.', gorsel: 'hero-arac', cls: 'ox-ogr-hero', dugme: dugme('Deneme sınavına geç', { 'data-ox-alt': 'deneme' }, { genis: true, ok: true }) });
  } else {
    const ilk = !biten && !s.adim, yarim = !!s.adim, [bas, kalan] = baslikBol(s.ad);
    const yuzde = yarim && s.top ? Math.round(s.adim / s.top * 100) : 0;
    hero = heroKart({
      ust: ilk ? 'İlk adımın' : yarim ? 'Kaldığın yer' : 'Sıradaki konu',
      baslik: esc(ilk ? 'Trafiğe ilk adım' : bas),
      alt: esc(ilk ? s.ad : kalan || UNITE_AD[s.key]),
      meta: yarim ? `${s.no}. konu · %${yuzde} tamamlandı` : `${s.no}. konu · ${DERS_SORU} soru`,
      gorsel: 'hero-arac', cls: 'ox-ogr-hero',
      icerik: yarim ? `<div class="ox-ogr-hero-serit">${serit(yuzde)}</div>` : '',
      dugme: dugme(ilk ? 'İlk dersine başla' : 'Derse devam et', { 'data-og-ders': s.id }, { genis: true, ok: true }),
    });
  }
  const moduller = MUFREDAT.map(([key]) => {
    const [b, t] = sayac(k, key);
    const alt = b === t ? `<small class="yesil">Tamamlandı</small>` : `<small>${b ? `${b} / ${t}` : t} konu</small>`;
    return `<button type="button" class="ox-ogr-mod" data-ox-alt="${key}" aria-label="${esc(UNITE_AD[key])}: ${b} / ${t} konu tamamlandı"><span class="ox-ogr-mod-yazi"><b>${esc(UNITE_AD[key])}</b>${alt}</span>${gorsel(MODUL_GORSEL[key], '', 'ox-ogr-mod-g ' + key)}</button>`;
  }).join('');
  const son = (k.deneme || []).slice(-1)[0], gecti = esGecti;
  const denemeAlt = `50 soru · 45 dakika<br>${gecti ? 'E-sınavı geçtin.' : son != null ? `Son deneme puanın: ${son}` : 'Hazır olduğunda kendini dene.'}`;
  return `<header class="ox-sayfa-bas ox-ogr-bas"><div><h1>Öğren</h1><p>İyi sürücülük, sağlam bilgiyle başlar.</p></div><span class="ox-sayfa-sag" aria-label="${biten} / ${tum.length} konu tamamlandı">${biten} / ${tum.length} konu</span></header>`
    + hero
    + bolum('Eğitim konuları', `${MUFREDAT.length} alan`)
    + `<div class="ox-ogr-izgara">${moduller}</div>`
    + `<div class="ox-ogr-araclar">`
    + liste([satir({ ikon: 'panoSoru', baslik: 'Deneme sınavı', alt: denemeAlt, sag: `<span class="ox-bag">İncele${oi('ok')}</span>`, ok: false, attrs: { 'data-ox-alt': 'deneme' }, cls: 'ox-ogr-deneme' })])
    + liste([satir({ ikon: 'kartlar', baslik: 'Çalışma araçları', alt: 'Hızlı test ve konu tekrarı', attrs: { 'data-ox-alt': 'araclar' } })])
    + `</div>`;
}

function modulSayfa(k, key) {
  const l = modulKonular(key), [b, t] = sayac(k, key), siraId = modulSiradaki(k, key);
  // ilk 5 konu; ilerlemiş öğrencide sıradaki konu görünsün diye pencere kayar (bir önceki biten konu da görünür)
  const i0 = siraId ? l.findIndex(x => x.id === siraId) : 0, bas0 = Math.max(0, Math.min(i0 - 1, l.length - 5));
  // Tehlike algısı ve Keşfet araçları kursun öğrenci uygulaması ayarına bağlı (Ayarlar › Öğrenci uygulaması)
  const th = (k.tehlike || []).slice(-1)[0], kesfet = KESFET.filter(([, , oz]) => ogrOzellik(oz));
  const ek = key === 'trafik' && ogrOzellik('tehlike')
    ? `<button type="button" class="ox-ogr-mod genis ox-ogr-teh" data-ox-alt="tehlike"><span class="ox-ogr-mod-yazi"><b>Tehlike algısı</b><small>${SAHNELER.length} sahne${th ? ` · son puanın ${th.puan} / ${th.en}` : ''}</small></span>${gorsel('modul-adab', '', 'ox-ogr-mod-g adab')}</button>`
    : key === 'motor' && kesfet.length ? bolum('Keşfet') + liste(kesfet.map(([a, ad]) => satir({ baslik: ad, attrs: { 'data-ox-alt': a }, cls: 'ox-ogr-kesfet' }))) : '';
  return geri('Öğren', { 'data-ox-alt': '' })
    + `<div class="ox-ogr-mbas">${sayfaBas(esc(UNITE_AD[key]), `${t} konu · ${b} tamamlandı`, gorsel(MODUL_GORSEL[key], '', 'ox-ogr-mbas-g ' + key))}</div>`
    + liste(l.slice(bas0, bas0 + 5).map(x => konuSatiri(k, x, siraId)), 'ox-ogr-konular')
    + dugme(`Tüm ${t} konuyu gör`, { 'data-ox-alt': 'tum:' + key }, { tur: 'ikincil', genis: true, ok: true }).replace('class="ox-dg', 'class="ox-ogr-tumdg ox-dg')
    + ek;
}

function tumHtml(k, key) {
  const tek = MUFREDAT.some(m => m[0] === key);
  const grup = m => { const l = modulKonular(m), [b, t] = sayac(k, m); return `<section class="ox-ogr-grup" data-ox-ogr-grup>${tek ? '' : bolum(esc(UNITE_AD[m]), `${b} / ${t}`)}${liste(l.map(x => konuSatiri(k, x)))}</section>`; };
  return geri(tek ? esc(UNITE_AD[key]) : 'Öğren', { 'data-ox-alt': tek ? key : '' })
    + sayfaBas('Tüm konular', tek ? `${esc(UNITE_AD[key])} (${modulKonular(key).length} konu)` : `${MUFREDAT.length} alan · ${konular().length} konu`)
    + `<label class="ox-ogr-ara">${oi('ara')}<input type="search" placeholder="Konu ara…" aria-label="Konu ara" autocomplete="off" enterkeyhint="search" data-ox-ogr-ara></label>`
    + `<div class="ox-ogr-tum${tek ? ' tek' : ''}">${(tek ? [key] : MUFREDAT.map(m => m[0])).map(grup).join('')}</div>`
    + `<div class="ox-ogr-yok" data-ox-ogr-yok hidden>${bos('ara', 'Bu aramayla konu bulunamadı', 'Başka bir kelimeyle dene.')}</div>`;
}
// arama: ekran yeniden çizilmez (klavye ve odak kaybolmasın); satırlar yalnız gizlenir
function tumBagla(kap) {
  const girdi = kap.querySelector('[data-ox-ogr-ara]'); if (!girdi) return;
  const yok = kap.querySelector('[data-ox-ogr-yok]');
  girdi.addEventListener('input', () => {
    const q = sade(girdi.value); let toplam = 0;
    kap.querySelectorAll('[data-ox-ogr-grup]').forEach(g => {
      let ilk = true, say = 0;
      g.querySelectorAll('.ox-konu').forEach(r => {
        const gor = !q || r.dataset.oxOgrSade.includes(q);
        r.hidden = !gor; r.classList.toggle('ox-ogr-ilk', gor && ilk); if (gor) { ilk = false; say++; }
      });
      g.hidden = !say; toplam += say;
    });
    yok.hidden = !!toplam;
  });
}

export function ekran(ctx) {
  const { k } = ctx, a = altEkran() || '';
  if (MODUL_GORSEL[a]) return { html: modulSayfa(k, a) };
  if (a === 'tum' || a.startsWith('tum:')) return { html: tumHtml(k, a.slice(4)), baglan: tumBagla };
  return { html: anaHtml(k) };
}

stilEkle('ox-ogren', `
.ox-ogr-bas{display:block;position:relative}
.ox-ogr-bas h1{padding-right:120px}
.ox-ogr-bas .ox-sayfa-sag{position:absolute;right:0;top:6px;padding:0}
/* modul-adab.webp temizlendi; kırpma gerekmez */
/* hero: referanstaki gibi alt başlık ("Trafikle ilgili temel kavramlar") 393 genişlikte tek satıra sığsın diye yazı sütunu %61, çizim %38 */
.ox-ogr-hero .ox-hero-gorsel{top:22px;right:6px;width:38%;max-width:176px;height:auto;aspect-ratio:3/2}
.ox-ogr-hero.gorselli .ox-hero-yazi{max-width:61%}
.ox-ogr-hero .ox-hero-alt{color:var(--ox-metin)}
.ox-ogr-hero-serit{position:relative;z-index:1;max-width:61%;margin-top:10px}
.ox-ogr-izgara{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ox-ogr-mod{position:relative;display:block;width:100%;min-height:100px;padding:16px 14px 14px 16px;text-align:left;background:var(--ox-kart);border:1px solid var(--ox-cizgi)!important;border-radius:var(--ox-r);box-shadow:var(--ox-golge);overflow:hidden}
.ox-ogr-mod:active{background:#f2f5fa}
.ox-ogr-mod-yazi{position:relative;z-index:1;display:grid;gap:4px;max-width:66%}
.ox-ogr-mod-yazi b{font-size:16px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-ogr-mod-yazi small{display:flex;align-items:center;gap:3px;font-size:14px;line-height:1.3;color:var(--ox-ikincil);white-space:nowrap}
.ox-ogr-mod-yazi small.yesil{color:var(--ox-yesil)}
.ox-ogr-mod-yazi small .ox-i{width:15px;height:15px;stroke-width:2.6}
.ox-ogr-mod-g{position:absolute;right:4px;bottom:8px;width:42%;max-width:80px;height:auto;aspect-ratio:6/5;object-fit:contain;pointer-events:none}
@media (max-width:389px){.ox-ogr-mod-g{width:38%}.ox-ogr-mod-yazi{max-width:70%}}
.ox-ogr-mod.genis{min-height:104px;margin-top:20px;padding:20px 16px;display:flex;align-items:center}
.ox-ogr-mod.genis .ox-ogr-mod-yazi{max-width:58%}
.ox-ogr-mod.genis .ox-ogr-mod-g{width:120px;max-width:none;right:12px;top:auto;bottom:4px}
.ox-ogr-araclar{display:grid;gap:12px;margin-top:20px}
.ox-ogr-deneme .ox-satir-govde small{line-height:1.4}
.ox-ogr-deneme .ox-satir-sag .ox-bag{font-size:16px}
.ox-ogr-mbas .ox-sayfa-bas{align-items:center;margin:0 0 24px}
.ox-ogr-mbas .ox-sayfa-bas>div{min-width:0}
.ox-ogr-mbas .ox-sayfa-sag{padding:0;display:block}
.ox-ogr-mbas-g{width:min(140px,34vw);height:auto;aspect-ratio:6/5;object-fit:contain}
.ox-ogr-konular .ox-konu-ad,.ox-ogr-tum .ox-konu-ad{display:grid;gap:2px}
.ox-ogr-sonuc{font-size:14px;font-weight:500;color:var(--ox-ikincil)}
.ox-ogr-tumdg{margin-top:16px}
.ox-ogr-tumdg span{flex:1;text-align:center;padding-left:29px}
.ox-ogr-kesfet{min-height:52px}
.ox-ogr-kesfet .ox-satir-govde b{font-weight:500}
.ox-ogr-ara{display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;margin-bottom:16px;background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:var(--ox-r-dg);box-shadow:var(--ox-golge);color:var(--ox-soluk);cursor:text}
.ox-ogr-ara:focus-within{border-color:var(--ox-mavi);box-shadow:0 0 0 3px var(--ox-mavi-acik)}
.ox-ogr-ara .ox-i{width:20px;height:20px;stroke-width:2}
.ox-ogr-ara input{flex:1;min-width:0;height:100%;border:0;outline:0;background:none;padding:0;font:inherit;font-size:16px;color:var(--ox-bas);-webkit-appearance:none;appearance:none}
.ox-ogr-ara input::placeholder{color:var(--ox-soluk)}
.ox-ogr-ara input::-webkit-search-cancel-button{-webkit-appearance:none}
.ox-ogr-tum [hidden],.ox-ogr-yok[hidden]{display:none!important}
.ox-ogr-tum .ox-konu.ox-ogr-ilk::before{display:none}
.ox-ogr-grup .ox-bolum{margin-top:24px}
.ox-ogr-grup:first-child .ox-bolum{margin-top:4px}
`);
