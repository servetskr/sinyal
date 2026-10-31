// Araç tekniği canlandırmaları (öğrenci ekranı): 4 zamanlı motor ve debriyaj/kalkış denemesi.
// 4 zaman: MEB Araç Tekniği programı (2020) A bölümü, motorun çalışma prensibi. Debriyaj denemesi temsilîdir:
// pedal hızlı bırakılırsa motor yük altında düşük devire iner ve stop eder (direksiyon sınavında kalkış/rampa hatalarının çoğu).
import { e, pencere } from './ui.js?v=104';

const ZAMAN = [
  ['Emme', 'Piston aşağı iner, emme supabı açıktır; silindire hava (benzinli motorda hava-yakıt karışımı) dolar.', '#5aa9e6'],
  ['Sıkıştırma', 'İki supap da kapalıdır; piston yukarı çıkarak karışımı sıkıştırır.', '#3d7cc4'],
  ['İş (ateşleme)', 'Benzinli motorda buji kıvılcım çakar (dizelde yakıt sıcak havaya püskürtülüp kendiliğinden tutuşur); yanan gaz pistonu aşağı iter. Krank milini döndüren tek zaman budur.', '#f08a24'],
  ['Egzoz', 'Egzoz supabı açılır; piston yukarı çıkarak yanmış gazları dışarı atar.', '#8f8f8f'],
];
function motorSvg(a) {  // a: krank açısı 0–720
  const r = 1.6, l = 4.6, th = a * Math.PI / 180, py = -(r * Math.cos(th) + Math.sqrt(l * l - (r * Math.sin(th)) ** 2)), z = Math.floor((a % 720) / 180), [, , renk] = ZAMAN[z];
  const cx = r * Math.sin(th), cy = -r * Math.cos(th), tepe = -(r + l) - .3, ust = py - 1.1;
  const emme = z === 0 ? .45 : 0, egz = z === 3 ? .45 : 0, kivilcim = z === 2 && (a % 180) < 25;
  return `<rect x="-2.6" y="${tepe - .9}" width="5.2" height="${-(tepe - .9) + .2}" fill="#d9dde3" stroke="#555" stroke-width=".08"/>
    <rect x="-2.1" y="${tepe}" width="4.2" height="${ust - tepe}" fill="${renk}" opacity="${z === 2 ? .85 : .55}"/>
    <rect x="-2.1" y="${ust}" width="4.2" height="1.1" rx=".1" fill="#9aa3ad" stroke="#555" stroke-width=".06"/>
    <line x1="0" y1="${py - .3}" x2="${cx}" y2="${cy}" stroke="#666" stroke-width=".35" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="${r + .5}" fill="#c5cbd3" stroke="#555" stroke-width=".08"/><circle cx="${cx}" cy="${cy}" r=".35" fill="#555"/><circle r=".3" fill="#333"/>
    <g transform="translate(-1.1 ${tepe - .9 + emme})"><line y1="-1.4" y2="0" stroke="#2f6fde" stroke-width=".18"/><path d="M-.7 0h1.4" stroke="#2f6fde" stroke-width=".3"/></g>
    <g transform="translate(1.1 ${tepe - .9 + egz})"><line y1="-1.4" y2="0" stroke="#666" stroke-width=".18"/><path d="M-.7 0h1.4" stroke="#666" stroke-width=".3"/></g>
    <rect x="-.12" y="${tepe - 1.5}" width=".24" height=".7" fill="#333"/>${kivilcim ? `<path d="M0 ${tepe - .7}l-.4 .5h.35l-.3 .6" stroke="#ffd400" stroke-width=".12" fill="none"/><circle cx="0" cy="${tepe - .3}" r=".5" fill="#ffd400" opacity=".7"/>` : ''}
    <text x="-3.6" y="${tepe - 1.6}" font-size=".55" fill="#2f6fde" font-family="system-ui,sans-serif">emme supabı</text><text x="1.2" y="${tepe - 1.6}" font-size=".55" fill="#555" font-family="system-ui,sans-serif">egzoz supabı</text><text x="2.3" y="0" font-size=".55" fill="#555" font-family="system-ui,sans-serif">krank mili</text><text x="2.3" y="${ust + .7}" font-size=".55" fill="#555" font-family="system-ui,sans-serif">piston</text>`;
}
export function motorAc() {
  let a = 0, oyna = true, hiz = 120, anim = null, son = null;
  pencere({
    baslik: '4 zamanlı motor nasıl çalışır?', genis: true,
    icerik: `<svg viewBox="-4.5 -10.2 9.5 12.6" style="width:100%;max-width:340px;display:block;margin:0 auto" role="img" aria-label="4 zamanlı motor canlandırması" data-motor></svg>
      <div class="motor-zaman">${ZAMAN.map(([ad], i) => `<button type="button" data-zaman="${i}">${i + 1}. ${e(ad)}</button>`).join('')}</div>
      <p data-motor-yazi style="min-height:3.2em;font-size:14.5px;margin-top:8px"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="dg dg-ana dg-kucuk" data-motor-oyna>Durdur</button><button type="button" class="dg dg-cizgi dg-kucuk" data-motor-hiz>Yavaş</button></div>
      <p class="og-kaynak">Krank mili her 4 zamanda iki tur döner; supaplar bu sırada bir kez açılıp kapanır. Kaynak: MEB Araç Tekniği Dersi Öğretim Programı (2020), motor ve çalışma prensibi.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc(p) {
      let canli = true; const izle = setInterval(() => { if (!document.body.contains(p)) { canli = false; clearInterval(izle); } }, 800);
      const svg = p.querySelector('[data-motor]'), yazi = p.querySelector('[data-motor-yazi]'), ob = p.querySelector('[data-motor-oyna]');
      const ciz = () => { svg.innerHTML = motorSvg(a); const z = Math.floor((a % 720) / 180); yazi.innerHTML = `<b>${z + 1}. ${e(ZAMAN[z][0])}:</b> ${e(ZAMAN[z][1])}`; p.querySelectorAll('[data-zaman]').forEach(b => b.classList.toggle('secili', +b.dataset.zaman === z)); };
      const kare = t => { if (son != null && oyna) a = (a + (t - son) / 1000 * hiz) % 720; son = t; ciz(); if (canli) anim = requestAnimationFrame(kare); };
      anim = requestAnimationFrame(kare);
      ob.addEventListener('click', () => { oyna = !oyna; ob.textContent = oyna ? 'Durdur' : 'Oynat'; });
      p.querySelector('[data-motor-hiz]').addEventListener('click', ev => { hiz = hiz === 120 ? 40 : 120; ev.target.textContent = hiz === 120 ? 'Yavaş' : 'Normal hız'; });
      p.querySelectorAll('[data-zaman]').forEach(b => b.addEventListener('click', () => { a = +b.dataset.zaman * 180 + 60; oyna = false; ob.textContent = 'Oynat'; }));
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { oyna = false; ob.textContent = 'Oynat'; }
    },
  });
}

/* ---------- debriyaj ve kalkış ---------- */
// pedal: 0 = sonuna kadar basılı, 100 = bırakılmış. Kavrama 35–65 arası (aracın kavrama noktası).
const kavra = ped => { const x = Math.min(1, Math.max(0, (ped - 35) / 30)); return x * x * (3 - 2 * x); };
export function debriyajAc() {
  const d = { ped: 0, gaz: 0, devir: 850, tekerDevir: 0, motorAci: 0, diskAci: 0, stop: false, hiz: 0 };
  let anim = null, son = null;
  pencere({
    baslik: 'Debriyaj: stop ettirmeden kalkış', genis: true,
    icerik: `<p style="font-size:14px">Araç birinci viteste, el freni indirilmiş. Debriyaj pedalını <b>yavaşça</b> bırak, kavrama noktasında hafif gaz ver. Pedalı birden bırakırsan motor stop eder: direksiyon sınavında kalkış ve rampa hatalarının çoğu budur.</p>
      <svg viewBox="-10 -5 20 10" style="width:100%;max-width:420px;display:block;margin:10px auto" data-db role="img" aria-label="Debriyaj diskleri"></svg>
      <div class="db-gosterge"><span>Motor devri <b data-db-devir>850</b> d/dk</span><span>Hız <b data-db-hiz>0</b> km/sa</span></div>
      <p data-db-durum style="min-height:2.6em;font-size:14.5px;font-weight:600;margin:6px 0"></p>
      <label class="db-surgu">Debriyaj pedalı <small>basılı ← → bırakılmış</small><input type="range" min="0" max="100" value="0" data-db-ped></label>
      <label class="db-surgu">Gaz pedalı<input type="range" min="0" max="100" value="0" data-db-gaz></label>
      <button type="button" class="dg dg-cizgi dg-kucuk" data-db-sifir style="margin-top:8px">Yeniden başla</button>
      <p class="og-kaynak">Temsilî canlandırma; kavrama noktası her araçta farklıdır, öğretmeninle sınav aracında çalış.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>`,
    onAc(p) {
      let canli = true; const izle = setInterval(() => { if (!document.body.contains(p)) { canli = false; clearInterval(izle); } }, 800);
      const svg = p.querySelector('[data-db]'), ped = p.querySelector('[data-db-ped]'), gaz = p.querySelector('[data-db-gaz]'), durum = p.querySelector('[data-db-durum]');
      const sifirla = () => { Object.assign(d, { ped: 0, gaz: 0, devir: 850, tekerDevir: 0, stop: false, hiz: 0 }); ped.value = 0; gaz.value = 0; };
      ped.addEventListener('input', () => { d.ped = +ped.value; });
      gaz.addEventListener('input', () => { d.gaz = +gaz.value; });
      p.querySelector('[data-db-sifir]').addEventListener('click', sifirla);
      const disk = (x, aci, renk) => `<g transform="translate(${x} 0)"><rect x="-.6" y="-3.6" width="1.2" height="7.2" rx=".3" fill="${renk}" stroke="#333" stroke-width=".08"/>${[0, 1, 2, 3].map(i => { const y = 3 * Math.cos((aci + i * 90) * Math.PI / 180); return `<rect x="-.55" y="${y - .25}" width="1.1" height=".5" fill="#fff" opacity="${.35 + .5 * Math.max(0, Math.sin((aci + i * 90) * Math.PI / 180))}"/>`; }).join('')}</g>`;
      const kare = t => {
        const dt = son == null ? 0 : Math.min(.05, (t - son) / 1000); son = t;
        const k = kavra(d.ped);
        if (!d.stop) {
          const hedef = 850 + d.gaz * 30;                          // gazla motorun boşta gideceği devir
          d.devir += (hedef - d.devir) * Math.min(1, dt * 8);      // motor gaza yanıt verir
          const fark = d.devir - d.tekerDevir;
          d.devir -= k * fark * dt * 16;                            // kavrayan disk motoru yükler
          d.tekerDevir += k * fark * dt * 1.2;                     // araç hızlanır (birinci vites)
          d.tekerDevir = Math.max(0, d.tekerDevir - dt * 40);      // sürtünme
          if (d.devir < 500 && k > .3) { d.stop = true; d.devir = 0; }
        } else { d.tekerDevir = Math.max(0, d.tekerDevir - dt * 600); }
        d.hiz = Math.round(d.tekerDevir / 3000 * 25);
        d.motorAci = (d.motorAci + d.devir / 60 * 360 * dt * .05) % 360; d.diskAci = (d.diskAci + d.tekerDevir / 60 * 360 * dt * .05) % 360;
        const ayrik = (1 - k) * 1.4;
        svg.innerHTML = `<line x1="-9" y1="0" x2="${-1.2 - ayrik / 2}" y2="0" stroke="#555" stroke-width=".5"/><line x1="${1.2 + ayrik / 2}" y1="0" x2="9" y2="0" stroke="#555" stroke-width=".5"/>${disk(-.7 - ayrik / 2, d.motorAci, '#c5cbd3')}${disk(.7 + ayrik / 2, d.diskAci, '#e3b26b')}<text x="-9" y="-4" font-size=".7" fill="#555" font-family="system-ui,sans-serif">motor (volan)</text><text x="9" y="-4" font-size=".7" text-anchor="end" fill="#555" font-family="system-ui,sans-serif">debriyaj diski → vites kutusu</text>`;
        p.querySelector('[data-db-devir]').textContent = Math.round(d.devir); p.querySelector('[data-db-hiz]').textContent = d.hiz;
        durum.style.color = d.stop ? 'var(--kirmizi)' : k > .05 && k < .95 ? 'var(--sari-koyu, #b07a00)' : d.hiz > 3 && k >= .95 ? 'var(--yesil)' : 'var(--murekkep)';
        durum.textContent = d.stop ? 'Motor stop etti. Debriyajı çok hızlı bıraktın ya da gaz vermedin. Sınavda bu sarı hata; iki kez olursa sınav biter.' : k <= .05 ? 'Debriyaj basılı: motor ile tekerlekler ayrık.' : k < .95 ? 'Kavrama noktası: diskler sürtünerek kavrıyor, araç yavaşça ilerlemeye başlar. Burada pedalı bir an bekletip hafif gaz ver.' : d.hiz > 3 ? 'Kalkış tamam: diskler tam kavradı.' : 'Debriyaj bırakıldı.';
        if (canli) anim = requestAnimationFrame(kare);
      };
      anim = requestAnimationFrame(kare);
    },
  });
}
