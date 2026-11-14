// Öğren: öğrencinin teorik çalışma yolu. Üstte "kaldığın yer", altında ünite ünite konular (asfalt yol üstünde),
// her konu kısa okuma kartları + araya giren kısa sorular + "akılda kalsın" + sonuç ekranından oluşan bir ders.
// Oyunlaştırma yok (seri, puan, can): yalnız tamamlanan konu ve doğru sayısı tutulur.
// Kayıt: k.okunan[id] = tarih (eski "Okudum" ile aynı alan), k.dersSonuc[id] = [doğru, toplam, tarih]; yarım ders yalnız bu cihazda.
import { S, kaydet, gun, ogrOzellik } from './veri.js?v=203';
import { e, ik } from './ui.js?v=203';
import { MUFREDAT } from './ogrenci.js?v=203';
import * as HZ from './hazirlik.js?v=203';
import { SORU_KONU } from './soruKonu.js?v=203';

const UNITE_AD = { trafik: 'Trafik ve çevre', ilkyardim: 'İlk yardım', motor: 'Araç tekniği', adab: 'Trafik adabı' };
// konu kapağı: o konuyu en iyi anlatan doğrulanmış levha; yoksa ünitenin levhası
const KAPAK = {
  'trafik-1': 'T-19', 'trafik-2': 'T-20', 'trafik-3': 'T-16', 'trafik-4': 'T-21', 'trafik-5': 'TT-25', 'trafik-6': 'TT-27', 'trafik-7': 'P-3a',
  'trafik-8': 'B-49a', 'trafik-9': 'B-20', 'trafik-12': 'TT-30', 'trafik-13': 'T-26', 'trafik-14': 'T-12', 'trafik-15': 'T-37', 'trafik-16': 'TT-24',
  'trafik-20': 'T-13', 'motor-2': 'B-26', 'motor-11': 'B-24', 'adab-3': 'T-11', 'adab-5': 'T-20',
};
const UNITE_KAPAK = { trafik: 'T-20', motor: 'B-24', adab: 'T-11' };
// İlk yardım bilgi işareti (mavi levha, beyaz zemin üstünde kırmızı haç): levha kütüphanesinde yok, burada çizilir
const ILKYARDIM_SVG = '<svg viewBox="0 0 120 120" role="img" aria-label="İlk yardım"><rect x="18" y="8" width="84" height="104" rx="8" fill="#0a4da2"/><rect x="24" y="14" width="72" height="92" rx="5" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="31" y="24" width="58" height="58" fill="#fff"/><path d="M53 31h14v16h16v14H67v16H53V61H37V47h16z" fill="#d52b1e"/></svg>';

let LV = null, SR = null, DR = null;
const levhaYukle = () => LV ? Promise.resolve(LV) : import('./levha.js?v=203').then(m => (LV = m)).catch(() => (LV = { LEVHA: {} }));
const yukle = () => Promise.all([levhaYukle(), SR || import('./sorular.js?v=203').then(m => (SR = m.SORULAR)), DR || import('./dersler.js?v=203').then(m => (DR = m.DERSLER))]);
export const onYukle = cb => { if (!LV) levhaYukle().then(() => cb && cb()); };

const kapakSvg = id => { const key = id.replace(/-\d+$/, ''); const kod = KAPAK[id] || UNITE_KAPAK[key]; if (!kod) return ILKYARDIM_SVG; const l = LV && LV.LEVHA[kod]; return l ? l.svg : ''; };
const konular = () => MUFREDAT.flatMap(([key, , , bas]) => bas.map((b, i) => ({ id: key + '-' + (i + 1), key, no: i + 1, ad: b })));
const bitti = (k, id) => !!(k.okunan || {})[id];
const sonuc = (k, id) => (k.dersSonuc || {})[id];
const YARIM = 'sinyal-ders-yarim';
const yarimOku = k => { try { const y = JSON.parse(localStorage.getItem(YARIM) || 'null'); return y && y.k === k.id ? y : null; } catch (x) { return null; } };
const yarimYaz = (k, id, adim, top) => { try { localStorage.setItem(YARIM, JSON.stringify({ k: k.id, id, adim, top })); } catch (x) { } };
const yarimSil = () => { try { localStorage.removeItem(YARIM); } catch (x) { } };
export function siradaki(k) {
  const y = yarimOku(k), l = konular();
  if (y && l.some(x => x.id === y.id) && !bitti(k, y.id)) return { ...l.find(x => x.id === y.id), adim: y.adim, top: y.top };
  return l.find(x => !bitti(k, x.id)) || null;
}
const sayac = (k, key) => { const l = konular().filter(x => x.key === key); return [l.filter(x => bitti(k, x.id)).length, l.length]; };

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
let modul = null;
export const modulAcik = () => modul;
export const modulKapat = () => { modul = null; };
const SINAV_SVG = '<svg viewBox="0 0 120 120" role="img" aria-label="e-Sınav"><rect x="10" y="22" width="100" height="76" rx="8" fill="#0a4da2"/><rect x="16" y="28" width="88" height="64" rx="5" fill="none" stroke="#fff" stroke-width="2.5"/><text x="60" y="58" text-anchor="middle" font-family="Overpass,Arial,sans-serif" font-weight="800" font-size="19" fill="#fff">e-SINAV</text><text x="60" y="80" text-anchor="middle" font-family="Overpass,Arial,sans-serif" font-weight="700" font-size="14" fill="#fff">50 SORU</text></svg>';
const modulSvg = key => key === 'sinav' ? SINAV_SVG : key === 'ilkyardim' ? ILKYARDIM_SVG : ((LV && LV.LEVHA[{ trafik: 'T-20', motor: 'B-24', adab: 'T-11' }[key]]) || {}).svg || '';
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
    const md = ev.target.closest('[data-ogn-modul]'); if (md) { modul = md.dataset.ognModul; yenile(); return scrollTo(0, 0); }
    if (ev.target.closest('[data-ogn-harita]')) { modul = null; yenile(); return scrollTo(0, 0); }
    const d = ev.target.closest('[data-ogn-ders]'); if (d) dersAc(k, d.dataset.ognDers, yenile);
  });
}

/* ---------- ders oynatıcı ---------- */
// cümlelere böl ("md.", "vb." gibi kısaltmalarda bölme), ~240 karakterlik kartlara topla
const KISA = /(?:md|vb|vs|örn|bkz|no|sn|dk|yy|km\/s|Doç|Dr)\.$/i;
function kartlara(paragraflar) {
  const kart = [], uz = l => l.join(' ').length;
  paragraflar.forEach(p => {
    const cumle = []; let bas = 0;
    for (const m of p.matchAll(/[.!?](?=\s+[A-ZÇĞİÖŞÜ0-9“"(])/g)) { const c = p.slice(bas, m.index + 1).trim(); if (KISA.test(c)) continue; cumle.push(c); bas = m.index + 1; }
    const kalan = p.slice(bas).trim(); if (kalan) cumle.push(kalan);
    let cur = [];
    const uz = l => l.join(' ').length;
    cumle.forEach(c => { if (cur.length && uz([...cur, c]) > 430) { kart.push(cur); cur = [c]; } else cur.push(c); });
    if (cur.length) kart.push(cur);
  });
  // çok kısa kartı öncekine ekle
  for (let i = kart.length - 1; i > 0; i--) if (uz(kart[i]) < 140) { kart[i - 1].push(...kart[i]); kart.splice(i, 1); }
  return kart;
}
// metindeki sayı + birim, yasak ve zorunluluk ifadelerini vurgula (öğrencinin aklında kalacak yerler)
const vurgu = t => e(t).replace(/(%\s?\d+[\d.,]*|\d+[\d.,]*\s?(?:km\/s(?:aat)?|km|metre|m|cm|saniye|dakika|saat|gün|ay|yıl|yaş|promil|kg|ton|puan|kez)\b)/g, '<em>$1</em>');
const karistir = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function sorulariSec(id, n = 5) {
  const key = id.replace(/-\d+$/, ''), no = +id.split('-').pop(), c = no.toString(36), havuz = [];
  for (let i = 0; i < SORU_KONU.length && i < SR.length; i++) if (SORU_KONU[i] === c && SR[i][0] === key) havuz.push(i);
  return karistir(havuz).slice(0, n);
}
function adimlar(id) {
  const d = DR[id] || { paragraflar: [] }, kartlar = kartlara(d.paragraflar), sor = sorulariSec(id), l = [{ tur: 'kapak' }];
  const araSoru = Math.min(2, Math.max(0, sor.length - 3)); let si = 0;
  kartlar.forEach((m, i) => { l.push({ tur: 'oku', m }); if (si < araSoru && (i + 1) % 2 === 0 && i < kartlar.length - 1) l.push({ tur: 'soru', qi: sor[si++] }); });
  if ((d.videolar || []).length) l.push({ tur: 'video', v: d.videolar[0] });
  if ((d.akilda || []).length) l.push({ tur: 'akilda', l: d.akilda });
  while (si < sor.length) l.push({ tur: 'soru', qi: sor[si++] });
  l.push({ tur: 'son' });
  return l;
}
const gorsel = g => !g ? '' : String(g).startsWith('L:') ? ((LV && LV.LEVHA[g.slice(2)]) || {}).svg || '' : g;

let acik = null;
export const dersBaslat = (k, id, yenile) => dersAc(k, id, yenile);
// sesli dinleme: telefonun Türkçe sesiyle o anki kart okunur (internet ya da ücret gerekmez)
const sesVar = () => ogrOzellik('sesli') && 'speechSynthesis' in window;
const sus = () => { try { speechSynthesis.cancel(); } catch (x) { } };
function oku(metinler, bitince) { sus(); const ses = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang)); metinler.filter(Boolean).forEach((t, i, l) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'tr-TR'; if (ses) u.voice = ses; u.rate = 0.95; if (i === l.length - 1) u.onend = bitince; speechSynthesis.speak(u); }); }
async function dersAc(k, id, yenile) {
  if (acik) return;
  const kok = document.createElement('div');
  kok.className = 'ogn-oyn'; kok.setAttribute('role', 'dialog'); kok.setAttribute('aria-modal', 'true');
  kok.innerHTML = `<div class="ogn-oyn-ust"><button class="ogn-kapat" data-ogn-kapat aria-label="Dersi kapat">${ik('kapat')}</button><div class="ogn-serit"><i></i></div>${sesVar() ? `<button class="ogn-ses" data-ogn-ses aria-label="Sesli dinle" aria-pressed="false">${ik('ses')}</button>` : ''}</div><div class="ogn-sahne"><p class="ogn-yukleniyor">Ders hazırlanıyor…</p></div>`;
  document.body.appendChild(kok); document.body.classList.add('ogn-acik'); acik = kok;
  requestAnimationFrame(() => kok.classList.add('gir'));
  try { await yukle(); } catch (x) { kok.querySelector('.ogn-sahne').innerHTML = '<p class="ogn-yukleniyor">Ders yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.</p>'; }
  const key = id.replace(/-\d+$/, ''), no = +id.split('-').pop(), m = MUFREDAT.find(x => x[0] === key), ad = m ? m[3][no - 1] : id;
  const L = adimlar(id), y = yarimOku(k);
  let i = y && y.id === id && y.adim < L.length - 1 ? Math.min(y.adim, L.length - 2) : 0;
  const cevap = [];  // [qi, seçilen]
  const sahne = kok.querySelector('.ogn-sahne'), serit = kok.querySelector('.ogn-serit i');
  const sesDg = kok.querySelector('[data-ogn-ses]'), sesKapat = () => { sus(); if (sesDg) sesDg.setAttribute('aria-pressed', 'false'); };
  const kapat = () => { sesKapat(); kok.classList.remove('gir'); kok.classList.add('cik'); document.body.classList.remove('ogn-acik'); acik = null; document.removeEventListener('keydown', tus); setTimeout(() => kok.remove(), 260); yenile(); };
  const tus = ev => { if (ev.key === 'Escape') kapat(); };
  document.addEventListener('keydown', tus);
  const sonrakiKonu = () => { const l = konular(), j = l.findIndex(x => x.id === id); return l.slice(j + 1).find(x => !bitti(k, x.id)) || null; };

  function ciz(yon = 1) {
    sesKapat();
    const a = L[i], ilerle = Math.round(i / (L.length - 1) * 100);
    serit.style.width = ilerle + '%';
    if (i > 0 && a.tur !== 'son') yarimYaz(k, id, i, L.length);
    let h = '';
    if (a.tur === 'kapak') {
      const okuSay = L.filter(x => x.tur === 'oku').length, soruSay = L.filter(x => x.tur === 'soru').length;
      h = `<div class="ogn-kart kapak"><div class="ogn-sanat" aria-hidden="true">${kapakSvg(id)}</div>
        <p class="ogn-goz koyu">${e(UNITE_AD[key])} · ${no}. konu</p><h2 class="ogn-h2">${e(ad)}</h2>
        <p class="ogn-meta">${okuSay} kart · ${soruSay} soru · yaklaşık ${Math.max(3, Math.round((okuSay * 40 + soruSay * 20) / 60))} dakika</p>
        ${(DR[id] && DR[id].akilda || []).length ? `<div class="ogn-hedef"><p>Bu konuda öğreneceklerin</p><ul>${DR[id].akilda.slice(0, 3).map(x => `<li>${e(x)}</li>`).join('')}</ul></div>` : ''}</div>
        <div class="ogn-alt"><button class="ogn-dg" data-ogn-ileri>${i === 0 && y && y.id === id ? 'Baştan başla' : 'Başla'}</button></div>`;
    } else if (a.tur === 'oku') {
      const sira = L.slice(0, i + 1).filter(x => x.tur === 'oku').length, top = L.filter(x => x.tur === 'oku').length;
      h = `<div class="ogn-kart"><div class="ogn-kart-bas"><span class="ogn-mini" aria-hidden="true">${kapakSvg(id)}</span><span><b>${e(ad)}</b><small>${sira} / ${top}</small></span></div>
        <p class="ogn-lead">${vurgu(a.m[0])}</p>${a.m.length > 1 ? `<p class="ogn-okur">${vurgu(a.m.slice(1).join(' '))}</p>` : ''}</div>
        <div class="ogn-alt"><button class="ogn-dg" data-ogn-ileri>Devam</button></div>`;
    } else if (a.tur === 'video') {
      h = `<div class="ogn-kart"><p class="ogn-goz">Kısa video</p><h2 class="ogn-h2 kucuk">${e(a.v.baslik)}</h2>
        <button class="ogn-video" data-ogn-video="${e(a.v.id)}" aria-label="Videoyu oynat: ${e(a.v.baslik)}"><img src="https://i.ytimg.com/vi/${encodeURIComponent(a.v.id)}/hqdefault.jpg" alt="" loading="lazy"><span aria-hidden="true">${ik('sag')}</span></button>
        <p class="ogn-meta">${e(a.v.kanal || '')}</p></div>
        <div class="ogn-alt"><button class="ogn-dg" data-ogn-ileri>Devam</button></div>`;
    } else if (a.tur === 'akilda') {
      h = `<div class="ogn-kart"><div class="ogn-akilda"><p class="ogn-akilda-bas">Akılda kalsın</p><ul>${a.l.map(x => `<li>${vurgu(x)}</li>`).join('')}</ul></div></div>
        <div class="ogn-alt"><button class="ogn-dg" data-ogn-ileri>Devam</button></div>`;
    } else if (a.tur === 'soru') {
      const q = SR[a.qi], c = a.c;
      h = `<div class="ogn-kart ogn-soru"><p class="ogn-goz sari"><i aria-hidden="true"></i>Kısa soru</p>
        ${q[4] ? `<div class="ogn-soru-gorsel">${gorsel(q[4])}</div>` : ''}<p class="ogn-kok">${e(q[1])}</p>
        <div class="ogn-siklar">${q[2].map((s, j) => `<button class="ogn-sik ${c == null ? '' : j === q[3] ? 'dogru' : j === c ? 'yanlis' : 'soluk'}" data-ogn-sik="${j}" ${c == null ? '' : 'disabled'}><kbd>${'ABCD'[j]}</kbd><span>${e(s)}</span></button>`).join('')}</div></div>
        ${c == null ? '' : `<div class="ogn-geri ${c === q[3] ? 'iyi' : 'kotu'}" role="status"><p class="ogn-geri-bas"><span>${ik(c === q[3] ? 'tik' : 'kapat')}</span>${c === q[3] ? 'Doğru' : 'Doğrusu ' + 'ABCD'[q[3]]}</p>${q[5] ? `<p>${e(q[5])}</p>` : ''}<button class="ogn-dg" data-ogn-ileri>Devam</button></div>`}`;
    } else if (a.tur === 'son') {
      const d = cevap.filter(([qi, c]) => SR[qi][3] === c).length, t = cevap.length, sk = sonrakiKonu();
      h = `<div class="ogn-kart son"><div class="ogn-sanat kucuk" aria-hidden="true">${kapakSvg(id)}</div><p class="ogn-goz koyu">Konu tamamlandı</p><h2 class="ogn-h2">${e(ad)}</h2>
        ${t ? `<div class="ogn-skor"><b>${d}</b><span>/${t}</span><small>soruyu doğru cevapladın</small></div>
        <p class="ogn-meta">${d === t ? 'Hepsi doğru.' : `Yanlış yaptığın ${t - d} soru tekrar listene eklendi; birkaç gün sonra yeniden sorulacak.`}</p>` : ''}</div>
        <div class="ogn-alt">${sk ? `<button class="ogn-dg cift" data-ogn-sonraki="${sk.id}"><small>Sıradaki konu</small><span>${e(sk.ad)}</span></button>` : ''}<button class="ogn-dg ikinci" data-ogn-kapat>Öğren'e dön</button></div>`;
    }
    sahne.innerHTML = `<div class="ogn-ekran ${yon < 0 ? 'geri' : ''}">${h}</div>`;
    const ilk = sahne.querySelector('[data-ogn-ileri],[data-ogn-sik],[data-ogn-sonraki]'); if (ilk && a.tur !== 'soru') ilk.focus({ preventScroll: true });
  }
  function bitir() {
    const d = cevap.filter(([qi, c]) => SR[qi][3] === c).length;
    k.okunan = k.okunan || {}; k.okunan[id] = k.okunan[id] || gun(0);
    k.dersSonuc = k.dersSonuc || {}; k.dersSonuc[id] = [d, cevap.length, gun(0)];
    if (cevap.length) {
      const yanlis = cevap.filter(([qi, c]) => SR[qi][3] !== c).map(([qi]) => qi), dogru = cevap.filter(([qi, c]) => SR[qi][3] === c).map(([qi]) => qi);
      k.yanlislar = [...new Set([...(k.yanlislar || []).filter(x => !dogru.includes(x)), ...yanlis])];
      k.konuAnaliz = k.konuAnaliz || {}; const a = k.konuAnaliz[key] || [0, 0]; k.konuAnaliz[key] = [a[0] + d, a[1] + cevap.length];
      HZ.gorulenEkle(k, cevap.map(([qi]) => qi)); HZ.tekrarGuncelle(k, cevap.map(([qi, c]) => [qi, SR[qi][3] === c]));
    }
    yarimSil(); kaydet();
  }
  kok.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-ogn-kapat]')) return kapat();
    if (t.closest('[data-ogn-ses]')) {
      if (sesDg.getAttribute('aria-pressed') === 'true') return sesKapat();
      const a = L[i], q = a.tur === 'soru' ? SR[a.qi] : null;
      const metin = a.tur === 'kapak' ? [ad, ...((DR[id] && DR[id].akilda) || []).slice(0, 3)] : a.tur === 'oku' ? [a.m.join(' ')] : a.tur === 'akilda' ? ['Akılda kalsın.', ...a.l] : a.tur === 'video' ? [a.v.baslik] : q ? [q[1], ...q[2].map((x, j) => 'ABCD'[j] + ': ' + x), ...(a.c != null && q[5] ? [q[5]] : [])] : [sahne.innerText];
      sesDg.setAttribute('aria-pressed', 'true'); return oku(metin, () => sesDg.setAttribute('aria-pressed', 'false'));
    }
    const v = t.closest('[data-ogn-video]'); if (v) { const f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.dataset.ognVideo) + '?autoplay=1&rel=0&playsinline=1'; f.title = v.getAttribute('aria-label'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.className = 'ogn-video'; v.replaceWith(f); return; }
    const s = t.closest('[data-ogn-sik]'); if (s && L[i].c == null) { const c = +s.dataset.ognSik; L[i].c = c; cevap.push([L[i].qi, c]); ciz(); const g = sahne.querySelector('.ogn-geri .ogn-dg'); if (g) g.focus({ preventScroll: true }); if (navigator.vibrate && c !== SR[L[i].qi][3]) try { navigator.vibrate(30); } catch (x) { } return; }
    if (t.closest('[data-ogn-ileri]')) { if (i < L.length - 1) { i++; if (L[i].tur === 'son') bitir(); ciz(1); } return; }
    const sn = t.closest('[data-ogn-sonraki]'); if (sn) { sesKapat(); kok.remove(); document.body.classList.remove('ogn-acik'); acik = null; document.removeEventListener('keydown', tus); return dersAc(k, sn.dataset.ognSonraki, yenile); }
  });
  ciz();
}
