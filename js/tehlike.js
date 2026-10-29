// Tehlike algısı (öğrenci ekranı): kuşbakışı kısa sahneler. Öğrenci gelişen tehlikeyi fark ettiği an dokunur;
// tehlike penceresinin başında fark ederse 5, sonuna doğru 1 puan, pencereden sonra 0. Art arda rastgele dokunma puanı sıfırlar.
// Konu: MEB Trafik ve Çevre programı (2022) “trafikte tehlike algısı”; sahneler temsilîdir.
import { S, kaydet, gun } from './veri.js?v=87';
import { e, pencere } from './ui.js?v=87';

const T = 8;  // saniye
// nesne: tur, renk, kare: [[t, x, y, açı]] (metre; y aşağı; bizim araç sağ şeritte yukarı gider)
const BIZ = { tur: 'arac', renk: '#2fa36b', kare: [[0, 1.75, 30, -90], [T, 1.75, -6, -90]] };
const parkSira = (x, y0, n, renk = ['#8a8f99', '#3b4cc0', '#c0392b', '#b9a37a', '#555']) => Array.from({ length: n }, (_, i) => ({ tur: 'arac', renk: renk[i % renk.length], kare: [[0, x, y0 - i * 5.2, -90]] }));
export const SAHNELER = [
  { id: 'top', ad: 'Park etmiş araçlar arasından', pencere: [3.0, 4.6], ipucu: 'Park etmiş araçların arasından yola yuvarlanan top: arkasından çoğu zaman bir çocuk gelir. Topu görünce gazı bırak, frene hazırlan.',
    nesne: [...parkSira(4.6, 24, 7), { tur: 'top', kare: [[0, 6.5, 6], [3.0, 6.5, 6], [4.2, 2.6, 5.4], [6, -1.5, 5]] }, { tur: 'insan', renk: '#f2a20c', kare: [[0, 7.2, 5.8], [4.3, 7.2, 5.8], [5.6, 3.6, 5.6], [8, 3.4, 5.6]] }] },
  { id: 'kapi', ad: 'Park hâlindeki araçta biri var', pencere: [2.4, 4.0], ipucu: 'Park etmiş araçta sürücü görünüyor ve stop lambaları yandı: kapı açılabilir ya da araç birden çıkabilir. Yanından geçerken hızını düşür, kapı mesafesi bırak.',
    nesne: [...parkSira(4.6, 22, 3), { tur: 'arac', renk: '#7d5ba6', kapi: 3.8, stop: 2.4, insanIci: true, kare: [[0, 4.6, 6.4, -90]] }, ...parkSira(4.6, 0.6, 2)] },
  { id: 'yanyol', ad: 'Sağdaki yan yoldan', pencere: [2.6, 4.2], ipucu: 'Yan yoldan gelen araç yavaşlamıyor: kavşağa girip önüne çıkabilir. Geçiş hakkın olsa bile hızını düşür ve göz teması kur.',
    yanYol: 8, nesne: [{ tur: 'arac', renk: '#c0392b', kare: [[0, 14, 6.2, 180], [2.6, 9.2, 6.2, 180], [4.4, 6.4, 6.2, 180], [5.4, 4.0, 6.2, 180], [8, 4.0, 6.2, 180]] }] },
  { id: 'otobus', ad: 'Durakta duran otobüs', pencere: [3.2, 4.8], ipucu: 'Duraktaki otobüsün önü görünmüyor: inen yolcular otobüsün önünden karşıya geçebilir. Otobüsün yanından yavaş geç, ayak görürsen dur.',
    nesne: [{ tur: 'otobus', renk: '#e9c23a', kare: [[0, 4.8, 6, -90]] }, { tur: 'insan', renk: '#2f6fde', kare: [[0, 4.6, 0.4], [3.2, 4.6, 0.4], [4.2, 3.2, 0.9], [6.5, -2, 1.2], [8, -4, 1.2]] }] },
  { id: 'onfren', ad: 'Öndeki araç', pencere: [3.0, 4.2], ipucu: 'Öndeki aracın stop lambaları yandı ve hızla yaklaşıyorsun: takip mesafen kısaldı. Fren lambasını görür görmez gazı bırak.',
    nesne: [{ tur: 'arac', renk: '#555', stop: 3.0, kare: [[0, 1.75, 16, -90], [3.0, 1.75, 4.5, -90], [4.6, 1.75, 1.2, -90], [8, 1.75, 0.6, -90]] }], biz: [[0, 1.75, 30, -90], [3.0, 1.75, 16, -90], [5, 1.75, 9.5, -90], [8, 1.75, 7.5, -90]] },
  { id: 'bisiklet', ad: 'Sağda bisikletli', pencere: [2.2, 3.8], ipucu: 'Bisikletlinin önünde park etmiş araç var: onu geçmek için sola, senin şeridine açılacak. Bisikletliyi geçerken en az 1,5 metre yan mesafe bırak.',
    nesne: [{ tur: 'arac', renk: '#8a8f99', kare: [[0, 4.6, 4, -90]] }, { tur: 'bisiklet', kare: [[0, 3.6, 16, -90], [2.2, 3.6, 10.5, -90], [3.8, 2.0, 7.2, -112], [5.5, 2.0, 3.5, -90], [8, 3.4, -2, -80]] }] },
  { id: 'sollama', ad: 'Karşıdan gelen trafik', pencere: [2.0, 3.6], ipucu: 'Karşıdan gelen araç öndekini sollamak için senin şeridine giriyor. Hızını azalt, sağa yanaş, kaçış alanı bırak.',
    nesne: [{ tur: 'arac', renk: '#b9a37a', kare: [[0, -1.75, -4, 90], [8, -1.75, 22, 90]] }, { tur: 'arac', renk: '#c0392b', kare: [[0, -1.75, -10, 90], [2.0, -1.75, -1.5, 90], [3.4, 1.0, 4, 75], [5, -1.75, 11, 90], [8, -1.75, 24, 90]] }] },
  { id: 'okul', ad: 'Okul bölgesi', okul: true, pencere: [3.4, 5.0], ipucu: 'Okul bölgesinde kaldırımda koşan çocuklar ani hareket eder; biri yola inebilir. Okul levhasını görünce hızını düşür, çocukları gözle.',
    nesne: [{ tur: 'insan', renk: '#e0362c', kare: [[0, 6.2, 18], [3.4, 6.2, 10], [4.6, 4.4, 8.5], [5.4, 4.6, 7.6], [8, 6.4, 6]] }, { tur: 'insan', renk: '#f2a20c', kare: [[0, 6.8, 20], [8, 6.8, 9]] }, { tur: 'insan', renk: '#2fae5a', kare: [[0, -6.2, 6], [8, -6.2, 14]] }] },
];

const ara = (k, t) => { let i = 0; while (i < k.length - 1 && k[i + 1][0] <= t) i++; const a = k[i], b = k[Math.min(i + 1, k.length - 1)]; if (b === a || t >= b[0]) return a.slice(1); const r = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, j) => v + ((b[j + 1] ?? v) - v) * r); };
const ARAC = (n, t) => `<g><rect x="-2.1" y="-.9" width="4.2" height="1.8" rx=".45" fill="${n.renk}" stroke="#111" stroke-width=".05"/><rect x=".55" y="-.72" width=".9" height="1.44" rx=".2" fill="#cfe3f5" opacity=".9"/><rect x="-1.75" y="-.66" width=".6" height="1.32" rx=".15" fill="#cfe3f5" opacity=".7"/>${n.stop != null && t >= n.stop ? '<rect x="-2.2" y="-.85" width=".22" height=".42" fill="#ff2a1a"/><rect x="-2.2" y=".43" width=".22" height=".42" fill="#ff2a1a"/><circle cx="-2.6" cy="0" r=".9" fill="#ff2a1a" opacity=".25"/>' : ''}${n.insanIci ? '<circle cx=".1" cy="-.35" r=".32" fill="#f1c9a5"/>' : ''}${n.kapi != null && t >= n.kapi ? `<line x1=".2" y1="-.9" x2="${-.3 + Math.min(1, (t - n.kapi) / .6) * .2}" y2="${-.9 - Math.min(1, (t - n.kapi) / .6) * 1.1}" stroke="${n.renk}" stroke-width=".22" stroke-linecap="round"/>` : ''}</g>`;
const CIZ = {
  arac: ARAC,
  otobus: n => `<g><rect x="-6" y="-1.25" width="12" height="2.5" rx=".4" fill="${n.renk}" stroke="#111" stroke-width=".05"/><rect x="4.4" y="-1" width="1.3" height="2" rx=".2" fill="#cfe3f5"/></g>`,
  insan: n => `<g><circle r=".45" fill="${n.renk}" stroke="#111" stroke-width=".05"/><circle r=".22" fill="#f1c9a5"/></g>`,
  top: () => `<circle r=".3" fill="#fff" stroke="#e0362c" stroke-width=".12"/>`,
  bisiklet: () => `<g><line x1="-.9" y1="0" x2=".9" y2="0" stroke="#111" stroke-width=".12"/><circle cx="-.9" r=".25" fill="#333"/><circle cx=".9" r=".25" fill="#333"/><circle r=".38" fill="#2f6fde" stroke="#111" stroke-width=".05"/></g>`,
};
export function sahneSvg(s, t) {
  const yan = s.yanYol != null ? `<rect x="5.8" y="${s.yanYol - 3.5}" width="10" height="7" fill="#4a4d52"/><line x1="5.8" y1="${s.yanYol}" x2="16" y2="${s.yanYol}" stroke="#fff" stroke-width=".1" stroke-dasharray="1 1"/>` : '';
  const okul = s.okul ? `<g transform="translate(-6.4 24)"><polygon points="0,-1.2 1.1,.8 -1.1,.8" fill="#fff" stroke="#e0362c" stroke-width=".22"/><circle cx="-.25" cy=".1" r=".2" fill="#111"/><circle cx=".3" cy=".1" r=".2" fill="#111"/></g><text x="-7.6" y="26.4" font-size=".7" fill="#fff" font-family="system-ui,sans-serif">OKUL</text>` : '';
  const biz = { ...BIZ, kare: s.biz || BIZ.kare };
  const nesne = [...s.nesne, biz].map(n => { const [x, y, a = 0] = ara(n.kare, t); return `<g transform="translate(${x} ${y}) rotate(${a})">${CIZ[n.tur](n, t)}</g>`; }).join('');
  return `<rect x="-9" y="-8" width="20" height="40" fill="#cfcac0"/><rect x="-3.5" y="-8" width="9.3" height="40" fill="#4a4d52"/>${yan}${[-6, -2, 2, 6, 10, 14, 18, 22, 26].map(y => `<line x1="0" y1="${y}" x2="0" y2="${y + 2}" stroke="#fff" stroke-width=".12"/>`).join('')}<line x1="3.5" y1="-8" x2="3.5" y2="32" stroke="#fff" stroke-width=".05" stroke-dasharray=".4 .6" opacity=".6"/><line x1="5.8" y1="-8" x2="5.8" y2="32" stroke="#fff" stroke-width=".08"/><line x1="-3.5" y1="-8" x2="-3.5" y2="32" stroke="#fff" stroke-width=".08"/>${okul}${nesne}`;
}
const puanla = (s, l) => { if (l.length > 5) return { p: 0, neden: 'Çok sık dokundun; gerçek sınavlarda rastgele basmak puanı sıfırlar.' }; const [a, b] = s.pencere, d = l.find(x => x >= a && x <= b); if (d == null) return { p: 0, neden: l.some(x => x < a) && !l.some(x => x > b) ? 'Tehlike henüz gelişmemişken dokundun; tehlike başladıktan sonra yeniden dokunman gerekiyordu.' : 'Tehlikeyi geç fark ettin.' }; return { p: Math.max(1, 5 - Math.floor((d - a) / (b - a) * 5)), neden: '' }; };

export function tehlikeAc(k) {
  const durum = { i: 0, puanlar: [] };
  pencere({
    baslik: 'Tehlike algısı', genis: true,
    icerik: `<div data-th></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc(p) {
      const g = p.querySelector('[data-th]'); let anim = null;
      const giris = () => { g.innerHTML = `<p style="font-size:15px">Her sahnede yolda ilerleyen yeşil araç sensin. Bir tehlikenin <b>geliştiğini fark ettiğin anda</b> sahneye dokun. Ne kadar erken fark edersen o kadar çok puan alırsın (en çok 5). Rastgele ya da art arda dokunmak puanı sıfırlar.</p><p class="og-not" style="margin-top:8px">${SAHNELER.length} sahne · her biri ${T} saniye. Konu: MEB Trafik ve Çevre programı, trafikte tehlike algısı. Sahneler temsilîdir.</p><button class="dg dg-ana" style="width:100%;margin-top:12px" data-th-basla>Başla</button>`; };
      const sahne = () => {
        const s = SAHNELER[durum.i], tik = [];
        g.innerHTML = `<p style="font-size:13px;color:var(--soluk)">${durum.i + 1}/${SAHNELER.length} · ${e(s.ad)}</p><div class="th-sahne" data-th-dokun role="button" tabindex="0" aria-label="Tehlikeyi fark edince dokun"><svg viewBox="-9 -8 20 40" preserveAspectRatio="xMidYMid slice">${sahneSvg(s, 0)}</svg><span class="th-isaret" hidden>!</span></div><div class="th-cubuk"><i></i></div>`;
        const svg = g.querySelector('svg'), cubuk = g.querySelector('.th-cubuk i'), isaret = g.querySelector('.th-isaret'); let t0 = null;
        const dokun = () => { if (t0 == null) return; tik.push((performance.now() - t0) / 1000); isaret.hidden = false; isaret.style.animation = 'none'; void isaret.offsetWidth; isaret.style.animation = ''; };
        const alan = g.querySelector('[data-th-dokun]'); alan.addEventListener('pointerdown', dokun); alan.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); dokun(); } }); alan.focus();
        const kare = now => { if (t0 == null) t0 = now; const t = (now - t0) / 1000; svg.innerHTML = sahneSvg(s, Math.min(t, T)); cubuk.style.width = Math.min(100, t / T * 100) + '%'; if (t < T) anim = requestAnimationFrame(kare); else sonuc(s, tik); };
        anim = requestAnimationFrame(kare);
      };
      const sonuc = (s, tik) => {
        const r = puanla(s, tik); durum.puanlar.push(r.p);
        const son = durum.i === SAHNELER.length - 1;
        g.innerHTML = `<div class="th-sahne"><svg viewBox="-9 -8 20 40" preserveAspectRatio="xMidYMid slice">${sahneSvg(s, s.pencere[0] + .3)}</svg></div>
          <p style="margin-top:10px"><b style="font-family:var(--baslik);font-size:24px;color:${r.p >= 3 ? 'var(--yesil)' : r.p ? 'var(--sari-koyu, #b07a00)' : 'var(--kirmizi)'}">${r.p}/5</b> ${r.neden ? '<span style="font-size:14px">' + e(r.neden) + '</span>' : ''}</p>
          <p class="soru-aciklama"><b>Tehlike:</b> ${e(s.ipucu)}</p>
          <button class="dg dg-koyu" style="width:100%;margin-top:8px" data-th-sonraki>${son ? 'Sonucu gör' : 'Sonraki sahne'}</button>`;
      };
      const bitir = () => {
        const top = durum.puanlar.reduce((a, b) => a + b, 0), en = SAHNELER.length * 5;
        k.tehlike = [...(k.tehlike || []), { tarih: gun(0), puan: top, en }].slice(-10); kaydet();
        g.innerHTML = `<div style="text-align:center"><small style="color:var(--soluk)">Tehlike algısı puanın</small><b style="display:block;font-family:var(--baslik);font-size:44px;color:${top >= en * .6 ? 'var(--yesil)' : 'var(--kirmizi)'}">${top}/${en}</b><p>${top >= en * .6 ? 'Tehlikeleri erken fark ediyorsun.' : 'Sahneleri bir daha izle; ipuçlarına dikkat et: park etmiş araçların arası, duran otobüsün önü, yan yollar ve öndeki aracın stop lambaları.'}</p></div><button class="dg dg-ana" style="width:100%;margin-top:12px" data-th-basla>Yeniden dene</button>`;
      };
      g.addEventListener('click', ev => {
        if (ev.target.closest('[data-th-basla]')) { durum.i = 0; durum.puanlar = []; sahne(); }
        if (ev.target.closest('[data-th-sonraki]')) { if (durum.i < SAHNELER.length - 1) { durum.i++; sahne(); } else bitir(); }
      });
      const izle = setInterval(() => { if (!document.body.contains(p)) { cancelAnimationFrame(anim); clearInterval(izle); } }, 800);
      giris();
    },
  });
}
