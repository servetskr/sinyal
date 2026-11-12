// Ders takvimi: günlük, haftalık ve aylık görünüm. Öğretmen, öğrenci ve müdür ekranları aynı bileşeni kullanır.
// Çağıran ekran olayları verir ({ tarih, saat, ton, baslik, alt, ek }), seçili günü ve görünümü kendisi tutar (takvimDurum).
import { gun, fark, iso, tarihOku, kapaliGun } from './veri.js?v=179';
import { e, tarih, tarihUzun, gunKisa, ayAdi } from './ui.js?v=179';

export const MODLAR = [['gun', 'Gün'], ['hafta', 'Hafta'], ['ay', 'Ay']];
const ekle = (t, n) => { const d = tarihOku(t); d.setDate(d.getDate() + n); return iso(d); };
// Hafta pazartesi başlar
export const haftaBasi = t => { const d = tarihOku(t), g = (d.getDay() + 6) % 7; d.setDate(d.getDate() - g); return iso(d); };
const ayBasi = t => t.slice(0, 8) + '01';
const ayKaydir = (t, n) => { const d = tarihOku(t), g = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const son = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(g, son)); return iso(d); };
export const haftaGunleri = t => { const b = haftaBasi(t); return [0, 1, 2, 3, 4, 5, 6].map(n => ekle(b, n)); };
export function ayGunleri(t) {
  const b = ayBasi(t), bas = haftaBasi(b), d = tarihOku(b), son = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const l = []; for (let x = bas; x <= son || l.length % 7; x = ekle(x, 1)) l.push(x);
  return l;
}
// Görünümün kapsadığı tarih aralığı (çağıran ekran olayları bu aralıkta toplar)
// Telefon ekranlarında hafta bugünden başlayan 7 gündür (kayan hafta); geçmiş günler ekranı doldurmaz
const yediGun = d => d.kayan ? [0, 1, 2, 3, 4, 5, 6].map(n => ekle(d.secili, n)) : haftaGunleri(d.secili);
export function aralik(d) {
  if (d.mod === 'gun') return [d.secili, d.secili];
  if (d.mod === 'hafta') { const l = yediGun(d); return [l[0], l[6]]; }
  const l = ayGunleri(d.secili); return [l[0], l[l.length - 1]];
}

// Görünüm tercihi cihazda saklanır (her ekran için ayrı)
export function takvimDurum(anahtar, varsayilan = 'hafta', kayan = false) {
  let mod = varsayilan; try { mod = localStorage.getItem('sinyal-takvim-' + anahtar) || varsayilan; } catch (x) { }
  if (!MODLAR.some(([m]) => m === mod)) mod = varsayilan;
  return { anahtar, mod, secili: gun(0), kayan };
}
const modSakla = d => { try { localStorage.setItem('sinyal-takvim-' + d.anahtar, d.mod); } catch (x) { } };

// Başlıktaki tarih yazısı
function baslik(d) {
  const { mod, secili } = d;
  if (mod === 'gun') return (fark(secili) === 0 ? 'Bugün · ' : fark(secili) === 1 ? 'Yarın · ' : fark(secili) === -1 ? 'Dün · ' : '') + tarihUzun(secili);
  if (mod === 'hafta') { const l = yediGun(d), a = tarihOku(l[0]), b = tarihOku(l[6]); return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${ayAdi(b.getMonth(), true)}` : `${tarih(l[0])} – ${tarih(l[6])}`; }
  const t = tarihOku(secili); return ayAdi(t.getMonth(), true) + ' ' + t.getFullYear();
}
const sirala = l => l.slice().sort((a, b) => (a.saat || '').localeCompare(b.saat || ''));
const gunOlay = (olaylar, t) => sirala(olaylar.filter(o => o.tarih === t));

// Tek olay satırı: saat, ad, alt bilgi; geçmiş olay soluk görünür
const satirHtml = o => `<div class="tk2-olay tk2-${o.ton || 'direksiyon'} ${o.tarih < gun(0) ? 'gecmis' : ''}" ${o.ek || ''}><b class="mono">${e(o.saat || '')}</b><span><b>${e(o.baslik)}</b>${o.alt ? `<small>${e(o.alt)}</small>` : ''}</span>${o.sag || ''}</div>`;

export function takvimHtml(d, olaylar, { bosMetin = 'Bu güne planlı ders yok.', ozet } = {}) {
  const { mod, secili } = d, bugun = gun(0);
  const ust = `<div class="tk2-ust">
      <div class="tk2-mod" role="tablist" aria-label="Görünüm">${MODLAR.map(([m, a]) => `<button role="tab" aria-selected="${m === mod}" class="${m === mod ? 'secili' : ''}" data-tk-mod="${m}">${a}</button>`).join('')}</div>
      <div class="tk2-gez"><button data-tk-git="-1" aria-label="Önceki">‹</button><b>${e(baslik(d))}</b><button data-tk-git="1" aria-label="Sonraki">›</button></div>
      ${(mod === 'gun' ? secili === bugun : mod === 'hafta' ? (d.kayan ? secili === bugun : haftaGunleri(secili).includes(bugun)) : secili.slice(0, 7) === bugun.slice(0, 7)) ? '' : '<button class="tk2-bugun" data-tk-git="0">Bugün</button>'}
    </div>`;
  let govde = '';
  if (mod === 'gun') {
    const l = gunOlay(olaylar, secili), kap = kapaliGun(secili);
    govde = l.length ? `<div class="tk2-liste">${l.map(satirHtml).join('')}</div>` : `<p class="tk2-bos">${kap ? (kap === 'Pazar' ? 'Pazar: kurs kapalı.' : 'Resmî tatil: kurs kapalı.') : e(bosMetin)}</p>`;
  }
  if (mod === 'hafta') {
    govde = `<div class="tk2-hafta">${yediGun(d).map(t => { const l = gunOlay(olaylar, t), kap = kapaliGun(t);
      return `<div class="tk2-hgun ${t === bugun ? 'bugun' : ''} ${t < bugun ? 'gecmis' : ''}"><button class="tk2-hbas" data-tk-gun="${t}" aria-label="${e(tarihUzun(t))}: gün görünümü"><small>${gunKisa(t)}</small><b>${tarihOku(t).getDate()}</b></button>
        <div class="tk2-hic">${l.length ? l.map(satirHtml).join('') : `<span class="tk2-hbos">${kap ? (kap === 'Pazar' ? 'Kapalı' : 'Tatil') : '—'}</span>`}</div></div>`; }).join('')}</div>`;
  }
  if (mod === 'ay') {
    const ay = secili.slice(0, 7), l = gunOlay(olaylar, secili);
    govde = `<div class="tk2-ay" role="grid">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(g => `<span class="tk2-agun">${g}</span>`).join('')}
      ${ayGunleri(secili).map(t => { const o = olaylar.filter(x => x.tarih === t), tonlar = [...new Set(o.map(x => x.ton || 'direksiyon'))].slice(0, 3);
        return `<button class="tk2-ahucre ${t.slice(0, 7) !== ay ? 'disari' : ''} ${t === bugun ? 'bugun' : ''} ${t === secili ? 'secili' : ''} ${kapaliGun(t) ? 'kapali' : ''}" data-tk-sec="${t}" aria-label="${e(tarihUzun(t))}${o.length ? ', ' + o.length + ' ders' : ''}"><b>${tarihOku(t).getDate()}</b>${o.length ? `<i>${o.length}</i><span class="tk2-nokta">${tonlar.map(x => `<em class="tk2-${x}"></em>`).join('')}</span>` : ''}</button>`; }).join('')}</div>
      <div class="tk2-asecili"><p class="tk2-abas">${e(tarihUzun(secili))}</p>${l.length ? `<div class="tk2-liste">${l.map(satirHtml).join('')}</div>` : `<p class="tk2-bos">${kapaliGun(secili) ? 'Kurs kapalı.' : e(bosMetin)}</p>`}</div>`;
  }
  const [a, b] = aralik(d), say = olaylar.filter(o => o.tarih >= a && o.tarih <= b).length;
  return `<div class="tk2" data-tk="${e(d.anahtar)}">${ust}${ozet !== false ? `<p class="tk2-ozet">${ozet ? ozet(say) : (say ? say + ' ders' : 'Ders yok')}</p>` : ''}${govde}</div>`;
}

// Takvim düğmeleri: işlendiyse true döner, çağıran ekran yeniden çizer
export function takvimTikla(t, d) {
  const m = t.closest('[data-tk-mod]'); if (m) { d.mod = m.dataset.tkMod; modSakla(d); return true; }
  const g = t.closest('[data-tk-git]'); if (g) {
    const n = +g.dataset.tkGit;
    d.secili = n === 0 ? gun(0) : d.mod === 'gun' ? ekle(d.secili, n) : d.mod === 'hafta' ? ekle(d.secili, 7 * n) : ayKaydir(d.secili, n);
    return true;
  }
  const hg = t.closest('[data-tk-gun]'); if (hg) { d.secili = hg.dataset.tkGun; d.mod = 'gun'; modSakla(d); return true; }
  const s = t.closest('[data-tk-sec]'); if (s) { d.secili = s.dataset.tkSec; return true; }
  return false;
}
