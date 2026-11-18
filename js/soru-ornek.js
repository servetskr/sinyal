// DIG-029: yeni soru bankası örneği (100 soru) önizlemesi. Yalnız demo görünümünde, sarı demo şeridindeki
// "Yeni soru örneği (100)" düğmesiyle açılır (app.js). Mevcut bankaya (sorular.js) ve öğrenci kayıtlarına dokunmaz:
// cevaplar yalnız bu pencerede tutulur, hiçbir yere yazılmaz.
import { e, pencere, sekmeler } from './ui.js?v=234';

const DERS = [['hepsi', 'Tümü'], ['ilkyardim', 'İlk Yardım'], ['trafik', 'Trafik ve Çevre'], ['motor', 'Araç Tekniği'], ['adab', 'Trafik Adabı']];
const HARF = 'ABCD';
let SR = [], LV = null;
const d = { ders: 'hepsi', mod: 'coz', i: 0, sec: {} };   // sec: soru indeksi → seçilen şık

const liste = () => SR.map((q, i) => i).filter(i => d.ders === 'hepsi' || SR[i][0] === d.ders);
const gorsel = g => !g ? '' : String(g).startsWith('L:') ? (LV ? LV.levhaSvg(g.slice(2)) : '') : '';
const stil = `<style>
.so-ust{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:12px}
.so-ust .sekmeler{margin-bottom:0;flex:1 1 100%}
.so-not{font-size:13px;color:var(--metin);margin:0 0 12px;line-height:1.45}
.so-mod{display:flex;gap:6px}
.so-kart{border:1.5px solid var(--cizgi-2);border-radius:10px;padding:14px 16px;margin-bottom:12px;background:var(--panel)}
.so-etiket{font-size:12px;font-weight:700;color:var(--metin);margin:0 0 6px;text-transform:none}
.so-kok{font-size:16px;font-weight:700;color:var(--murekkep);margin:0 0 12px;line-height:1.4}
.so-siklar{display:grid;gap:8px}
.so-sik{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;padding:10px 12px;border:1.5px solid var(--cizgi-2);border-radius:8px;background:var(--zemin, #fff);font:inherit;font-size:15px;color:var(--murekkep);cursor:pointer;line-height:1.35}
.so-sik b{flex:none;width:22px}
.so-sik:disabled{cursor:default}
.so-sik.dogru{border-color:var(--yesil);background:var(--yesil-acik, #e7f6ec)}
.so-sik.yanlis{border-color:var(--kirmizi);background:var(--kirmizi-acik, #fdecea)}
.so-acik{margin-top:12px;font-size:14px;line-height:1.5;color:var(--murekkep)}
.so-acik small{display:block;color:var(--metin);margin-top:4px;font-size:12.5px}
.so-alt{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:4px}
.so-say{font-size:13px;color:var(--metin)}
.so-gorsel{display:flex;justify-content:center;margin:0 0 10px}.so-gorsel svg{width:110px;height:110px}
.so-liste-sik{font-size:14px;margin:2px 0;color:var(--murekkep)}.so-liste-sik.dogru{font-weight:700;color:var(--yesil)}
</style>`;

function kartHtml(qi, n, toplam, listeModu) {
  const [kn, kok, siklar, dogru, g, aciklama, kaynak, ek] = SR[qi], ad = (DERS.find(x => x[0] === kn) || [, kn])[1];
  const sec = d.sec[qi], cevapli = listeModu || sec != null;
  const sik = (s, j) => listeModu
    ? `<p class="so-liste-sik ${j === dogru ? 'dogru' : ''}">${HARF[j]}) ${e(s)}${j === dogru ? ' ✓' : ''}</p>`
    : `<button type="button" class="so-sik ${cevapli && j === dogru ? 'dogru' : ''} ${cevapli && j === sec && j !== dogru ? 'yanlis' : ''}" data-so-sik="${j}" ${cevapli ? 'disabled' : ''}><b>${HARF[j]})</b><span>${e(s)}</span></button>`;
  return `<div class="so-kart">
    <p class="so-etiket">${n}/${toplam} · ${e(ad)} · ${e((ek && ek.alt) || '')}</p>
    ${g ? `<div class="so-gorsel">${gorsel(g)}</div>` : ''}
    <p class="so-kok">${e(kok)}</p>
    <div class="so-siklar">${siklar.map(sik).join('')}</div>
    ${cevapli ? `<div class="so-acik">${listeModu ? '' : `<b>${sec === dogru ? 'Doğru.' : `Doğru cevap ${HARF[dogru]}.`}</b> `}${e(aciklama)}<small>Dayanak: ${e(kaynak)}</small></div>` : ''}
  </div>`;
}

function ciz(kok) {
  const l = liste(), dogruSay = l.filter(i => d.sec[i] === SR[i][3]).length, cevapSay = l.filter(i => d.sec[i] != null).length;
  d.i = Math.min(d.i, l.length - 1);
  const sayac = Object.fromEntries(DERS.map(([k]) => [k, k === 'hepsi' ? SR.length : SR.filter(q => q[0] === k).length]));
  const govde = d.mod === 'liste'
    ? l.map((qi, n) => kartHtml(qi, n + 1, l.length, true)).join('')
    : `${kartHtml(l[d.i], d.i + 1, l.length, false)}
      <div class="so-alt"><button type="button" class="dg dg-cizgi dg-kucuk" data-so-git="-1" ${d.i ? '' : 'disabled'}>Önceki</button>
      <span class="so-say">${cevapSay} cevap · ${dogruSay} doğru</span>
      <button type="button" class="dg dg-ana dg-kucuk" data-so-git="1" ${d.i < l.length - 1 ? '' : 'disabled'}>Sonraki</button></div>`;
  kok.innerHTML = `${stil}<p class="so-not">Yeni soru bankası için hazırlanan örnek. MEB müfredatı ve e-sınav üslubunda, dağılım e-sınavdaki gibi (12/23/9/6 oranında). Mevcut sorular değişmedi; buradaki cevaplar kaydedilmez.</p>
    <div class="so-ust">${sekmeler(DERS.map(([k, t]) => [k, t, sayac[k]]), d.ders, 'so-ders')}
      <div class="so-mod" role="group" aria-label="Görünüm"><button type="button" class="dg dg-kucuk ${d.mod === 'coz' ? 'dg-koyu' : 'dg-cizgi'}" data-so-mod="coz" aria-pressed="${d.mod === 'coz'}">Tek tek çöz</button><button type="button" class="dg dg-kucuk ${d.mod === 'liste' ? 'dg-koyu' : 'dg-cizgi'}" data-so-mod="liste" aria-pressed="${d.mod === 'liste'}">Cevaplı liste</button></div></div>
    ${govde}`;
}

export function soruOrnekAc() {
  return Promise.all([import('./sorular-ornek.js?v=234'), import('./levha.js?v=234').catch(() => null)]).then(([m, l]) => {
    SR = m.SORULAR_ORNEK; LV = l;
    pencere({ baslik: `Yeni soru örneği (${SR.length})`, genis: true, taslak: false, icerik: '<div data-so-kok></div>', onAc(p) {
      const kok = p.querySelector('[data-so-kok]'), ust = () => { const g = p.querySelector('.pencere-govde'); if (g) g.scrollTop = 0; };
      ciz(kok);
      kok.addEventListener('click', ev => {
        const t = ev.target, ders = t.closest('[data-so-ders]'), mod = t.closest('[data-so-mod]'), sik = t.closest('[data-so-sik]'), git = t.closest('[data-so-git]');
        if (ders) { d.ders = ders.dataset.soDers; d.i = 0; ciz(kok); ust(); }
        else if (mod) { d.mod = mod.dataset.soMod; ciz(kok); ust(); }
        else if (sik && !sik.disabled) { d.sec[liste()[d.i]] = +sik.dataset.soSik; ciz(kok); }
        else if (git && !git.disabled) { d.i += +git.dataset.soGit; ciz(kok); ust(); }
      });
    } });
  });
}
