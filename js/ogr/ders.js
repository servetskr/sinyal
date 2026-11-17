// Kısa ders oynatıcı (tam ekran katman, yeni tasarım): ders başlangıcı, okuma kartları, araya giren kısa sorular, video,
// akılda kalsın ve ders sonucu. Katman ui.js .ox-akis + akisUst/akisAlt/sik/cevapKutu ile kurulur; sınıflar ox-dr- önekli.
import { kaydet, gun, ogrOzellik } from '../veri.js?v=231';
import { MUFREDAT } from '../ogrenci.js?v=231';
import * as HZ from '../hazirlik.js?v=231';
import { SORU_KONU } from '../soruKonu.js?v=231';
import { UNITE_AD, kapakSvg, konular, bitti, sayac, yarimOku, yarimYaz, yarimSil, yukle, veriler } from './ogrveri.js?v=231';
import { esc, oi, gorsel as cizim, dugme, ikonKutu, satir, liste, serit, bolum, akisUst, akisAlt, sik, cevapKutu, stilEkle, odakTuzagi } from './ui.js?v=231';

/* ---------- ders içeriği ---------- */
// cümlelere böl ("md.", "vb." gibi kısaltmalarda bölme), ~430 karakterlik kartlara topla
const KISA = /(?:md|vb|vs|örn|bkz|no|sn|dk|yy|km\/s|Doç|Dr)\.$/i;
const uz = l => l.join(' ').length;
function cumleler(p) {
  const l = []; let bas = 0;
  for (const m of p.matchAll(/[.!?](?=\s+[A-ZÇĞİÖŞÜ0-9“"(])/g)) { const c = p.slice(bas, m.index + 1).trim(); if (KISA.test(c)) continue; l.push(c); bas = m.index + 1; }
  const kalan = p.slice(bas).trim(); if (kalan) l.push(kalan);
  return l;
}
function kartlara(paragraflar) {
  const kart = [];
  paragraflar.forEach(p => {
    let cur = [];
    cumleler(p).forEach(c => { if (cur.length && uz([...cur, c]) > 430) { kart.push(cur); cur = [c]; } else cur.push(c); });
    if (cur.length) kart.push(cur);
  });
  // çok kısa kartı öncekine ekle
  for (let i = kart.length - 1; i > 0; i--) if (uz(kart[i]) < 140) { kart[i - 1].push(...kart[i]); kart.splice(i, 1); }
  return kart;
}
// metindeki sayı + birim ifadelerini vurgula (öğrencinin aklında kalacak yerler)
const vurgu = t => esc(t).replace(/(%\s?\d+[\d.,]*|\d+[\d.,]*\s?(?:km\/s(?:aat)?|km|metre|m|cm|saniye|dakika|saat|gün|ay|yıl|yaş|promil|kg|ton|puan|kez)\b)/g, '<em>$1</em>');
const karistir = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function sorulariSec(id, n = 5) {
  const key = id.replace(/-\d+$/, ''), no = +id.split('-').pop(), c = no.toString(36), havuz = [], SR = veriler().SR;
  for (let i = 0; i < SORU_KONU.length && i < SR.length; i++) if (SORU_KONU[i] === c && SR[i][0] === key) havuz.push(i);
  return karistir(havuz).slice(0, n);
}
// yarım kayıttaki soru listesi hâlâ bu konunun sorularından mı (veri değişmiş olabilir)
function kayitliSorular(id, sor) {
  const key = id.replace(/-\d+$/, ''), c = (+id.split('-').pop()).toString(36), SR = veriler().SR;
  if (!Array.isArray(sor) || !sor.length || new Set(sor).size !== sor.length) return null;
  return sor.every(qi => Number.isInteger(qi) && qi >= 0 && qi < SR.length && qi < SORU_KONU.length && SORU_KONU[qi] === c && SR[qi][0] === key) ? sor : null;
}
// adımlar: kapak, okuma kartları (her iki kartta bir ara soru), video, akılda kalsın, kalan sorular, sonuç
// sor verilirse (yarım kalan derse dönüş) aynı sorularla aynı adımlar kurulur
function adimlar(id, sor = sorulariSec(id)) {
  const d = veriler().DR[id] || { paragraflar: [] }, kartlar = kartlara(d.paragraflar || []), l = [{ tur: 'kapak' }];
  const araSoru = Math.min(2, Math.max(0, sor.length - 3)); let si = 0;
  kartlar.forEach((m, i) => { l.push({ tur: 'oku', m }); if (si < araSoru && (i + 1) % 2 === 0 && i < kartlar.length - 1) l.push({ tur: 'soru', qi: sor[si++] }); });
  if ((d.videolar || []).length) l.push({ tur: 'video', v: d.videolar[0] });
  if ((d.akilda || []).length) l.push({ tur: 'akilda', l: d.akilda });
  while (si < sor.length) l.push({ tur: 'soru', qi: sor[si++] });
  l.push({ tur: 'son' });
  return l;
}
// ders kapağındaki çizim: modülün hazır çizimi (trafik için araç + ışık + yaya geçidi)
const CIZIM = { trafik: 'hero-arac', ilkyardim: 'modul-ilkyardim', motor: 'modul-motor', adab: 'modul-adab' };
const cizimAd = key => CIZIM[key] || 'hero-arac';
// soru görseli: "L:<kod>" levha kütüphanesinden, değilse hazır SVG
const soruGorsel = g => !g ? '' : String(g).startsWith('L:') ? ((veriler().LV && veriler().LV.LEVHA[g.slice(2)]) || {}).svg || '' : String(g);
// okuma kartındaki paragrafları ~220 karakterlik parçalara böl (uzun tek blok yerine)
function paragraflar(cumle) {
  const l = []; let cur = [];
  cumle.forEach(c => { if (cur.length && uz([...cur, c]) > 220) { l.push(cur); cur = [c]; } else cur.push(c); });
  if (cur.length) l.push(cur);
  return l;
}

/* ---------- sesli dinleme: telefonun Türkçe sesiyle o anki kart okunur (internet ya da ücret gerekmez) ---------- */
const sesVar = () => ogrOzellik('sesli') && typeof window !== 'undefined' && 'speechSynthesis' in window;
const sus = () => { try { speechSynthesis.cancel(); } catch (x) { } };
function oku(metinler, bitince) {
  sus();
  try {
    const ses = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang));
    metinler.filter(Boolean).forEach((t, i, l) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'tr-TR'; if (ses) u.voice = ses; u.rate = 0.95; if (i === l.length - 1) u.onend = bitince; speechSynthesis.speak(u); });
  } catch (x) { bitince && bitince(); }
}

/* ---------- css değişkenleri: oynatıcı eski ekranlardan da açılabilir (body.ox-modu yokken) ---------- */
function degiskenler() {
  if (document.body.classList.contains('ox-modu')) return '';
  const s = document.querySelector('style[data-ox="ox-temel"]'), m = s && /body\.ox-modu\{([^}]*)\}/.exec(s.textContent);
  return m ? m[1].split(';').map(x => x.trim()).filter(x => x.startsWith('--')).join(';') : '';
}

/* ---------- oynatıcı ---------- */
let acik = null;
export const dersBaslat = (k, id, yenile) => dersAc(k, id, yenile);

async function dersAc(k, id, yenile, { gecmisVar = false, odak = null } = {}) {
  if (acik) return;
  const key = id.replace(/-\d+$/, ''), no = +id.split('-').pop(), m = MUFREDAT.find(x => x[0] === key), ad = (m && m[3][no - 1]) || id;
  const geriOdak = odak || document.activeElement;
  const kok = document.createElement('div');
  kok.className = 'ox-akis ox-dr'; kok.dataset.tur = 'yukle';
  kok.setAttribute('role', 'dialog'); kok.setAttribute('aria-modal', 'true'); kok.setAttribute('aria-label', 'Ders: ' + ad);
  const dv = degiskenler(); if (dv) kok.setAttribute('style', dv);
  const sesDugme = sesVar() ? `<button type="button" class="ox-ikon-dg ox-dr-ses" data-ox-dr-ses aria-label="Sesli dinle" aria-pressed="false">${oi('ses')}</button>` : '';
  kok.innerHTML = akisUst({ kapat: 'data-ox-dr-kapat', orta: '<span class="ox-dr-sayac" data-ox-dr-sayac></span>', sag: sesDugme, ilerleme: 0 })
    + `<div class="ox-akis-govde" data-ox-dr-govde><div class="ox-dr-bekle" role="status">Ders hazırlanıyor…</div></div>`
    + akisAlt('');
  document.body.appendChild(kok); document.body.classList.add('ox-akis-acik'); acik = kok;
  // tam ekran katman açıkken arka plan inert: Tab ve ekran okuyucu katmanın içinde kalır
  const serbest = odakTuzagi(kok);
  requestAnimationFrame(() => requestAnimationFrame(() => kok.classList.add('gir')));

  const govde = kok.querySelector('[data-ox-dr-govde]'), alt = kok.querySelector('.ox-akis-alt');
  const sayacEl = kok.querySelector('[data-ox-dr-sayac]'), seritEl = kok.querySelector('.ox-akis-orta .ox-serit'), seritIc = seritEl.querySelector('i');
  const sesDg = kok.querySelector('[data-ox-dr-ses]');
  const sesKapat = () => { sus(); if (sesDg) sesDg.setAttribute('aria-pressed', 'false'); };

  // telefonun geri tuşu dersi kapatsın: açılışta geçmişe bir adım eklenir
  let gecmis = gecmisVar;
  if (!gecmis) { try { history.pushState({ oxDers: 1 }, ''); gecmis = true; } catch (x) { } }
  const sok = (gecmisten = false) => {
    sesKapat(); document.removeEventListener('keydown', tus); window.removeEventListener('popstate', geriTus);
    govde.removeEventListener('scroll', golge); acik = null; serbest();
    if (gecmis && !gecmisten) { try { if (history.state && history.state.oxDers) history.back(); } catch (x) { } }
  };
  const kapat = (gecmisten = false) => {
    if (acik !== kok) return;
    sok(gecmisten);
    kok.classList.remove('gir'); kok.classList.add('cik'); document.body.classList.remove('ox-akis-acik');
    // odak: katman kalkınca (Öğren o arada yeniden çizilmiş olabilir) dersi açan düğmeye, o yoksa aynı dersin satırına döner
    setTimeout(() => {
      kok.remove();
      const a = document.activeElement;
      if (a && a !== document.body && a.isConnected) return;
      const od = geriOdak && geriOdak.isConnected && geriOdak !== document.body ? geriOdak : document.querySelector(`[data-og-ders="${CSS.escape(id)}"]`);
      if (od && od.focus) try { od.focus({ preventScroll: true }); } catch (x) { }
    }, 280);
    yenile();
  };
  // Tab katmanın son düğmesinden ilkine (Shift+Tab tersine) döner; arka plan zaten inert
  const odaklar = () => [...kok.querySelectorAll('button:not([disabled]),a[href],iframe,[tabindex]:not([tabindex="-1"])')]
    .filter(el => el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : el.offsetParent !== null);
  const tus = ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); kapat(); return; }
    if (ev.key !== 'Tab' || acik !== kok) return;
    const l = odaklar(); if (!l.length) return;
    const a = document.activeElement, ilk = l[0], son = l[l.length - 1];
    if (ev.shiftKey ? (a === ilk || !kok.contains(a)) : (a === son || !kok.contains(a))) { ev.preventDefault(); (ev.shiftKey ? son : ilk).focus(); }
  };
  const geriTus = () => kapat(true);
  document.addEventListener('keydown', tus);
  window.addEventListener('popstate', geriTus);
  // alt düğmelerin üstünde, içerik altta devam ediyorsa ince çizgi; içerik kaydırılınca üst çubuğun altında da
  const golge = () => { alt.classList.toggle('ox-dr-cizgili', govde.scrollHeight - govde.scrollTop - govde.clientHeight > 2); kok.classList.toggle('ox-dr-kaydi', govde.scrollTop > 2); };
  govde.addEventListener('scroll', golge, { passive: true });
  kok.querySelector('[data-ox-dr-kapat]').addEventListener('click', () => kapat());

  try { await yukle(); } catch (x) { }
  if (acik !== kok) return;
  if (!veriler().DR || !veriler().SR) {
    kok.dataset.tur = 'hata';
    govde.innerHTML = `<div class="ox-dr-bekle" role="alert">Ders yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.</div>`;
    alt.innerHTML = dugme('Kapat', { 'data-ox-dr-kapat': true }, { tur: 'ikincil', genis: true });
    return;
  }

  // yarım kalan derse dönüş: kayıtta soru listesi varsa aynı sorular ve verilen cevaplar geri yüklenir
  // (eski biçimdeki {k, id, adim, top} kayıtlarında yoktur; o zaman sorular yeniden seçilir, kaldığı adımdan sürer)
  const y = yarimOku(k), ayni = !!(y && y.id === id), sor = ayni ? kayitliSorular(id, y.sor) : null;
  const L = sor ? adimlar(id, sor) : adimlar(id), DR = veriler().DR[id] || {}, SR = veriler().SR;
  let i = ayni && Number.isInteger(y.adim) && y.adim > 0 && y.adim < L.length - 1 ? y.adim : 0;
  const cevap = [];  // [qi, seçilen]
  if (sor && i > 0 && Array.isArray(y.cevap)) {
    const sorAdim = new Map(L.map((a, j) => [a.tur === 'soru' ? a.qi : -1, j]));
    y.cevap.forEach(e => {
      const [qi, c] = Array.isArray(e) ? e : [], j = sorAdim.get(qi);
      if (j == null || j < 0 || j > i || L[j].c != null || !Number.isInteger(c) || c < 0 || c >= SR[qi][2].length) return;
      L[j].c = c; cevap.push([qi, c]);
    });
  }
  const yarimKaydet = () => yarimYaz(k, id, i, L.length, { sor: L.filter(a => a.tur === 'soru').map(a => a.qi), cevap: cevap.map(e => e.slice()) });
  const okuSay = L.filter(x => x.tur === 'oku').length, soruSay = L.filter(x => x.tur === 'soru').length, icerikSay = Math.max(1, L.length - 2);
  const sonrakiKonu = () => { const l = konular(), j = l.findIndex(x => x.id === id); return l.slice(j + 1).find(x => !bitti(k, x.id)) || null; };
  const ileriDg = (metin = 'Devam', ek = {}) => dugme(metin, { 'data-ox-dr-ileri': true, ...ek }, { genis: true, ok: true });
  const levha = () => { const s = kapakSvg(id); return s ? `<div class="ox-dr-levha" aria-hidden="true">${s}</div>` : `<div class="ox-dr-levha resimli" aria-hidden="true">${cizim(cizimAd(key), '', 'ox-dr-levha-resim ox-dr-c-' + key)}</div>`; };

  function ust(a) {
    kok.dataset.tur = a.tur;
    const sira = tur => L.slice(0, i + 1).filter(x => x.tur === tur).length;
    sayacEl.textContent = a.tur === 'oku' ? `${sira('oku')}/${okuSay}` : a.tur === 'soru' ? `${sira('soru')}/${soruSay}` : '';
    const oran = a.tur === 'kapak' ? 0 : a.tur === 'son' ? 100 : Math.round(Math.min(i, icerikSay) / icerikSay * 100);
    seritIc.style.width = oran + '%'; seritEl.setAttribute('aria-valuenow', oran);
    seritEl.setAttribute('aria-label', 'Ders ilerlemesi');
  }

  function icerik(a) {
    if (a.tur === 'kapak') {
      const dk = Math.max(3, Math.round((okuSay * 40 + soruSay * 20) / 60)), hedef = (DR.akilda || []).slice(0, 3);
      return {
        h: `${cizim(cizimAd(key), '', 'ox-dr-hero ox-dr-c-' + key)}
          <p class="ox-dr-goz">${esc(UNITE_AD[key] || '')} · ${no}. konu</p>
          <h1 class="ox-dr-baslik">${esc(ad)}</h1>
          <p class="ox-dr-meta">${oi('kartlar')}<span>${okuSay} kart · ${soruSay} soru · yaklaşık ${dk} dakika</span></p>
          ${hedef.length ? `${bolum('Bu derste öğreneceklerin')}<ul class="ox-dr-maddeler">${hedef.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`,
        dg: ileriDg(i === 0 && y && y.id === id ? 'Baştan başla' : 'Derse başla'),
      };
    }
    if (a.tur === 'oku') {
      const [ilk, ...kalan] = a.m;
      return {
        h: `${levha()}<p class="ox-dr-ana${ilk.length > 150 ? ' uzun cok' : ilk.length > 110 ? ' uzun' : ''}">${vurgu(ilk)}</p>${paragraflar(kalan).map(p => `<p class="ox-dr-p">${vurgu(p.join(' '))}</p>`).join('')}`,
        dg: ileriDg(),
      };
    }
    if (a.tur === 'video') {
      return {
        h: `<p class="ox-dr-goz">Kısa video</p><h2 class="ox-dr-ana uzun">${esc(a.v.baslik)}</h2>
          <button type="button" class="ox-dr-video" data-ox-dr-video="${esc(a.v.id)}" aria-label="Videoyu oynat: ${esc(a.v.baslik)}"><img src="https://i.ytimg.com/vi/${encodeURIComponent(a.v.id)}/hqdefault.jpg" alt="" decoding="async" data-ox-dr-kucuk><span class="ox-dr-oynat">${oi('oynat', 'dolu')}</span></button>
          ${a.v.kanal ? `<p class="ox-dr-kanal">${esc(a.v.kanal)}</p>` : ''}`,
        dg: ileriDg(),
      };
    }
    if (a.tur === 'akilda') {
      return {
        h: `<p class="ox-dr-goz">Konunun özeti</p><h2 class="ox-dr-ana">Akılda kalsın</h2>
          <ul class="ox-dr-akilda">${a.l.map(x => `<li><span class="ox-dr-akilda-ik">${oi('tik')}</span><span>${vurgu(x)}</span></li>`).join('')}</ul>`,
        dg: ileriDg(),
      };
    }
    if (a.tur === 'soru') {
      const q = SR[a.qi], c = a.c, g = soruGorsel(q[4]), cevaplandi = c != null, iyi = c === q[3];
      const durum = j => !cevaplandi ? '' : j === q[3] ? 'dogru' : j === c ? 'yanlis' : '';
      return {
        h: `${g ? `<div class="ox-dr-soru-gorsel">${g}</div>` : ''}<p class="ox-dr-kok" id="ox-dr-kok" tabindex="-1">${esc(q[1])}</p>
          <div class="ox-dr-siklar" role="group" aria-labelledby="ox-dr-kok">${q[2].map((s, j) => sik('ABCD'[j], esc(s), durum(j), { 'data-ox-dr-sik': j, disabled: cevaplandi, 'aria-label': `${'ABCD'[j]}: ${s}${cevaplandi && j === q[3] ? ' (doğru cevap)' : cevaplandi && j === c ? ' (senin cevabın)' : ''}` })).join('')}</div>
          ${cevaplandi ? cevapKutu(true, `<span class="ox-dr-gizli">${iyi ? 'Doğru bildin. ' : 'Yanlış. '}</span>Doğru cevap: ${'ABCD'[q[3]]}`, q[5] ? esc(q[5]) : '') : ''}`,
        dg: ileriDg('Devam', { disabled: !cevaplandi }),
      };
    }
    // son
    const d = cevap.filter(([qi, c]) => SR[qi][3] === c).length, t = cevap.length, sk = sonrakiKonu(), [mb, mt] = sayac(k, key);
    const satirlar = [
      t ? satir({ ikon: 'dogru', ton: 'yesil', baslik: `${d} / ${t} doğru`, alt: d === t ? 'Hepsi doğru' : '' }) : '',
      t - d > 0 ? satir({ ikon: 'gecmis', ton: 'turuncu', baslik: `${t - d} soru tekrar listesinde`, alt: 'Birkaç gün sonra yeniden sorulacak' }) : '',
      mt ? satir({ ikon: 'grafik', ton: 'mavi', baslik: `${mb} / ${mt} modül ilerlemesi`, alt: serit(mb / mt * 100, 'mavi', true), cls: 'ox-dr-ilerleme' }) : '',
    ].filter(Boolean);
    return {
      h: `<div class="ox-dr-son">${cizim('ders-tamam', '', 'ox-dr-son-cizim')}<h1 class="ox-dr-baslik">Konuyu tamamladın</h1><p class="ox-dr-alt">${esc(ad)}</p></div>
        ${satirlar.length ? liste(satirlar, 'ox-dr-sonuc') : ''}
        ${sk ? `<button type="button" class="ox-dr-siradaki" data-ox-dr-sonraki="${esc(sk.id)}"><span><small>Sıradaki konu</small><b>${esc(sk.ad)}</b></span><span class="ox-chev">${oi('sag')}</span></button>` : ''}`,
      dg: `<div class="ox-dr-dgler">${sk ? dugme('Sıradaki konu', { 'data-ox-dr-sonraki': sk.id }, { genis: true, ok: true }) : ''}${dugme('Öğren’e dön', { 'data-ox-dr-kapat': true }, { tur: sk ? 'ikincil' : 'ana', genis: true })}</div>`,
    };
  }

  // yeni: yeni adıma geçiş (giriş hareketi, başa kaydır); değilse aynı adım yeniden çizilir (soru cevaplandı)
  function ciz(yeni = true) {
    sesKapat();
    const a = L[i];
    ust(a);
    if (yeni && i > 0 && a.tur !== 'son') yarimKaydet();
    const { h, dg } = icerik(a), kay = govde.scrollTop;
    govde.innerHTML = `<div class="ox-dr-ekran ox-dr-e-${a.tur}${yeni ? ' yeni' : ''}">${h}</div>`;
    alt.innerHTML = dg;
    if (yeni) govde.scrollTop = 0; else govde.scrollTop = kay;
    golge();
    const kr = govde.querySelector('[data-ox-dr-kucuk]');
    if (kr) { const bak = () => { if (!kr.naturalWidth || kr.naturalWidth <= 120) kr.classList.add('yok'); }; if (kr.complete) bak(); else { kr.addEventListener('load', bak, { once: true }); kr.addEventListener('error', bak, { once: true }); } }
    // odak katmanın içinde kalsın: soru adımında soru kökü (cevaplanmışsa, yarım dersten dönüşte, Devam), öteki adımlarda ana düğme
    if (yeni) {
      const f = a.tur !== 'soru' ? alt.querySelector('.ox-dg-ana') : a.c != null ? alt.querySelector('[data-ox-dr-ileri]') : govde.querySelector('.ox-dr-kok');
      if (f) f.focus({ preventScroll: true });
    }
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
    if (t.closest('[data-ox-dr-kapat]')) return kapat();
    if (t.closest('[data-ox-dr-ses]')) {
      if (sesDg.getAttribute('aria-pressed') === 'true') return sesKapat();
      const a = L[i], q = a.tur === 'soru' ? SR[a.qi] : null;
      const metin = a.tur === 'kapak' ? [ad, ...(DR.akilda || []).slice(0, 3)] : a.tur === 'oku' ? [a.m.join(' ')] : a.tur === 'akilda' ? ['Akılda kalsın.', ...a.l] : a.tur === 'video' ? [a.v.baslik] : q ? [q[1], ...q[2].map((x, j) => 'ABCD'[j] + ': ' + x), ...(a.c != null && q[5] ? [q[5]] : [])] : [govde.innerText];
      sesDg.setAttribute('aria-pressed', 'true'); return oku(metin, () => sesDg.setAttribute('aria-pressed', 'false'));
    }
    const v = t.closest('[data-ox-dr-video]');
    if (v) {
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.dataset.oxDrVideo) + '?autoplay=1&rel=0&playsinline=1';
      f.title = v.getAttribute('aria-label'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.className = 'ox-dr-video';
      v.replaceWith(f); return;
    }
    const s = t.closest('[data-ox-dr-sik]');
    if (s && L[i].tur === 'soru' && L[i].c == null) {
      const c = +s.dataset.oxDrSik; L[i].c = c; cevap.push([L[i].qi, c]);
      yarimKaydet();  // ileri basılmadan kapatılsa da cevap kaybolmasın
      ciz(false);
      const kutu = govde.querySelector('.ox-cevap'); if (kutu) kutu.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const g = alt.querySelector('[data-ox-dr-ileri]'); if (g) g.focus({ preventScroll: true });
      if (navigator.vibrate && c !== SR[L[i].qi][3]) try { navigator.vibrate(30); } catch (x) { }
      return;
    }
    const il = t.closest('[data-ox-dr-ileri]');
    if (il && !il.disabled) { if (i < L.length - 1) { i++; if (L[i].tur === 'son') bitir(); ciz(); } return; }
    const sn = t.closest('[data-ox-dr-sonraki]');
    if (sn) {
      // aynı geçmiş adımıyla sıradaki dersi aç (geri tuşu yine dersi kapatır)
      sok(true); document.body.classList.remove('ox-akis-acik'); kok.remove();
      return dersAc(k, sn.dataset.oxDrSonraki, yenile, { gecmisVar: gecmis, odak: geriOdak });
    }
  });
  ciz();
}

stilEkle('ox-ders', `
.ox-dr{z-index:300;opacity:0;transform:translateY(18px);transition:opacity .26s ease,transform .32s cubic-bezier(.2,.8,.2,1)}
.ox-dr.gir{opacity:1;transform:none}
.ox-dr.cik{opacity:0;transform:translateY(18px);pointer-events:none}
.ox-dr :focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px;border-radius:10px}
.ox-dr .ox-sik:focus-visible{border-radius:14px}
.ox-dr-gizli{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ox-dr .ox-akis-orta{min-height:32px;align-content:center}
.ox-dr[data-tur=kapak] .ox-akis-orta,.ox-dr[data-tur=son] .ox-akis-orta,.ox-dr[data-tur=yukle] .ox-akis-orta,.ox-dr[data-tur=hata] .ox-akis-orta{visibility:hidden}
.ox-dr[data-tur=kapak] .ox-dr-ses,.ox-dr[data-tur=son] .ox-dr-ses,.ox-dr[data-tur=yukle] .ox-dr-ses,.ox-dr[data-tur=hata] .ox-dr-ses{visibility:hidden}
.ox-dr-sayac{line-height:18px;min-height:18px}
.ox-dr-ses[aria-pressed=true]{background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-dr .ox-akis-govde{padding-top:4px}
.ox-dr .ox-akis-alt{position:relative;transition:box-shadow .2s}
.ox-dr .ox-akis-alt.ox-dr-cizgili{box-shadow:0 -1px 0 var(--ox-ayrac)}
.ox-dr .ox-akis-ust{position:relative;z-index:1;background:#fff;transition:box-shadow .2s}
.ox-dr.ox-dr-kaydi .ox-akis-ust{box-shadow:0 1px 0 var(--ox-ayrac)}
.ox-dr .ox-dg.okl{position:relative;justify-content:center;padding:0 52px}
.ox-dr .ox-dg.okl .ox-i:last-child{position:absolute;right:18px;top:50%;margin-top:-10.5px}
.ox-dr-dgler{flex:1;display:grid;gap:10px}
.ox-dr-bekle{display:grid;place-items:center;min-height:50vh;text-align:center;font-size:15.5px;color:var(--ox-ikincil);padding:0 12px}
.ox-dr-ekran.yeni{animation:ox-dr-gir .32s cubic-bezier(.2,.8,.2,1) both}
@keyframes ox-dr-gir{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
.ox-dr em{font-style:normal;font-weight:700;color:var(--ox-bas)}

/* ders başlangıcı */
.ox-dr-hero{width:min(90%,330px);aspect-ratio:3/2;height:auto;margin:0 auto 20px;object-fit:contain}
.ox-dr-goz{font-size:14.5px;color:var(--ox-ikincil);margin-bottom:6px}
.ox-dr-baslik{font-size:27px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:var(--ox-bas);text-wrap:balance}
.ox-dr-meta{display:flex;align-items:flex-start;gap:8px;margin-top:12px;font-size:15px;line-height:20px;color:var(--ox-ikincil)}
.ox-dr-meta .ox-i{width:20px;height:20px;color:var(--ox-mavi)}
.ox-dr-e-kapak .ox-bolum{margin:28px 0 12px}
.ox-dr-e-kapak .ox-dr-baslik{font-size:30px;line-height:1.1}
.ox-dr-maddeler{list-style:none;display:grid;gap:10px}
.ox-dr-maddeler li{position:relative;padding-left:20px;font-size:15.5px;line-height:1.4;color:var(--ox-metin)}
.ox-dr-maddeler li::before{content:"";position:absolute;left:3px;top:.52em;width:7px;height:7px;border-radius:50%;background:var(--ox-mavi);opacity:.45}

/* adab çiziminin sol üstünde kesimden kalan yazı parçası var: yalnız o köşe kırpılır (kutu çizimin kendi oranında, bulut kesilmez) */
.ox-dr-hero.ox-dr-c-adab,.ox-dr-levha-resim.ox-dr-c-adab{aspect-ratio:190/150}
.ox-dr-hero.ox-dr-c-adab{width:min(76%,280px)}

/* okuma kartı */
.ox-dr-levha{display:grid;place-items:center;height:184px;margin-bottom:22px;border-radius:var(--ox-r-b);background:linear-gradient(135deg,var(--ox-hero) 0%,var(--ox-hero-2) 100%);border:1px solid #dde9fb;overflow:hidden}
.ox-dr-levha svg{display:block;height:124px;width:auto;max-width:70%;filter:drop-shadow(0 6px 10px rgba(16,24,40,.14))}
.ox-dr-levha-resim{height:150px;width:auto;aspect-ratio:3/2;object-fit:contain;mix-blend-mode:multiply}
.ox-dr-ana{font-size:23px;line-height:1.2;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas)}
.ox-dr-ana.uzun{font-size:20px;line-height:1.25;letter-spacing:-.02em}
.ox-dr-ana.cok{font-weight:700;line-height:1.3}
.ox-dr-ana em{color:inherit;font-weight:inherit}
.ox-dr-p{margin-top:14px;font-size:16px;line-height:1.5;color:var(--ox-metin)}
.ox-dr-alt{margin-top:6px;font-size:15.5px;line-height:1.4;color:var(--ox-ikincil)}

/* video ve akılda kalsın */
.ox-dr-video{position:relative;display:block;width:100%;aspect-ratio:16/9;margin-top:18px;border-radius:var(--ox-r);overflow:hidden;background:#0f1d40;border:0}
.ox-dr-video img{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .2s}
.ox-dr-video img.yok{opacity:0}
.ox-dr-oynat{position:absolute;left:50%;top:50%;width:64px;height:64px;margin:-32px 0 0 -32px;display:grid;place-items:center;border-radius:50%;background:rgba(255,255,255,.94);color:var(--ox-mavi);box-shadow:0 6px 18px rgba(16,24,40,.25)}
.ox-dr-oynat .ox-i{width:26px;height:26px;margin-left:3px}
.ox-dr-kanal{margin-top:10px;font-size:14px;color:var(--ox-ikincil)}
.ox-dr-akilda{list-style:none;margin-top:18px;background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:var(--ox-r);box-shadow:var(--ox-golge)}
.ox-dr-akilda li{position:relative;display:flex;gap:12px;align-items:flex-start;padding:14px 16px;font-size:16px;line-height:1.45;color:var(--ox-metin)}
.ox-dr-akilda li+li::before{content:"";position:absolute;top:0;left:52px;right:16px;border-top:1px solid var(--ox-ayrac)}
.ox-dr-akilda-ik{flex:none;display:grid;place-items:center;width:24px;height:24px;margin-top:-1px;border-radius:50%;background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-dr-akilda-ik .ox-i{width:14px;height:14px;stroke-width:2.8}

/* soru */
.ox-dr-soru-gorsel{display:grid;place-items:center;height:132px;margin-bottom:16px}
.ox-dr-soru-gorsel svg{display:block;height:124px;width:auto;max-width:100%}
.ox-dr-kok:focus{outline:none}
.ox-dr-kok{margin:4px 0 18px;font-size:20px;line-height:1.3;font-weight:700;letter-spacing:-.015em;color:var(--ox-bas)}
.ox-dr .ox-sik:disabled{cursor:default}
.ox-dr .ox-sik:not(:disabled):active{background:var(--ox-gri-acik)}
.ox-dr .ox-cevap{animation:ox-dr-cevap .26s ease both}
@keyframes ox-dr-cevap{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ders sonucu */
.ox-dr-son{display:grid;justify-items:center;text-align:center;padding-top:8px}
.ox-dr-son .ox-ik-kutu.buyuk{width:96px;height:96px;border-radius:28px;margin-bottom:20px}
.ox-dr-son .ox-ik-kutu.buyuk .ox-i{width:50px;height:50px;stroke-width:1.6}
.ox-dr-sonuc{margin-top:24px}
.ox-dr-sonuc .ox-satir{min-height:60px}
.ox-dr-ilerleme .ox-satir-govde small{display:block;padding-top:8px}
.ox-dr-siradaki{display:flex;align-items:center;gap:12px;width:100%;min-height:68px;margin-top:12px;padding:12px 16px;border-radius:var(--ox-r);background:var(--ox-zemin);border:1px solid var(--ox-cizgi);text-align:left}
.ox-dr-siradaki>span:first-child{flex:1;min-width:0;display:grid;gap:3px}
.ox-dr-siradaki small{font-size:14px;color:var(--ox-ikincil)}
.ox-dr-siradaki b{font-size:16px;line-height:1.3;font-weight:700;color:var(--ox-bas)}
.ox-dr-siradaki:active{background:#f2f5fa}
@media (max-height:700px){.ox-dr-hero{width:min(64%,240px);margin-bottom:12px}.ox-dr-hero.ox-dr-c-adab{width:min(52%,200px)}.ox-dr-levha{height:144px}.ox-dr-levha svg{height:100px}.ox-dr-levha-resim{height:120px}.ox-dr-son .ox-ik-kutu.buyuk{width:72px;height:72px;border-radius:22px;margin-bottom:14px}.ox-dr-son .ox-ik-kutu.buyuk .ox-i{width:38px;height:38px}.ox-dr-sonuc{margin-top:18px}}
@media (prefers-reduced-motion:reduce){.ox-dr{transition:none}}
`);
stilEkle('ox-dr-son-cizim', '.ox-dr-son-cizim{display:block;width:min(220px,62%);height:auto;aspect-ratio:4/3;margin:0 auto 6px;object-fit:contain}');
