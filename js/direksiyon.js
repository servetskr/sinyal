// Direksiyon sınavına hazırlık (öğrenci ekranı): sınavın her bölümü resmî değerlendirme formundan (EK-4 otomobil / EK-3 motosiklet)
// gelir; öğrenci hangi davranışın sınavı bitirdiğini (kırmızı) ya da iki kez yapılınca bitirdiğini (sarı) görür. Geri park (EK-13),
// L dönüşü (EK-19) ve dar alanda geri dönüş (EK-20) yönetmelikteki ölçülerle çizilip adım adım oynatılır.
// Kural: sınav alanına konan kolaylaştırıcı işaretlere dayalı tarif verilmez (MTSK Yön. md.26/9); anlatım ayna, sinyal ve ölçüyle.
import { S, kaydet, gun, motorSinif, ek3Sinif, SINIFLAR, ogrOzellik } from './veri.js?v=99';
import { e, ik, pencere, rozet, tarih } from './ui.js?v=99';
import { EK3, EK4 } from './formlar.js?v=99';

const RENK_AD = { m: 'Mavi', s: 'Sarı', k: 'Kırmızı' };
const KAYNAK_HATA = 'MEB verisi: Mart 2018–Mart 2019, 76.491 aday, 898.618 hata (Hatipoğlu, 2020)';
// bölüm numarası (EK-4) → ek içerik
const EK = {
  I: { ad: 'Araç bilgisi', ozet: 'Sınavın ilk 5 dakikası. Sınav aracında gösterilir; 5 maddeyi bilemezsen sınav başlamadan biter.', oran: 'Hataların %15,2’si burada; en sık: lastik kontrolü, kumanda kolları, yağ ve su yeri.',
    adim: ['Sınava gireceğin aracı kursta öğretmeninle bir kez baştan sona gez: kaput, akü, yağ çubuğu ve yağ kapağı, soğutma suyu deposu, silecek suyu, bagajdaki stepne, kriko, bijon anahtarı, reflektör ve ilk yardım çantası.', 'Lastik kontrolünü unutma: dört lastiğe de gözle bak ya da ayağınla bas.', 'Gösterge panelinde yağ ve hararet uyarılarını, yakıt, hız ve devir göstergesini göster; hangi lambanın neyi uyardığını söyle.', 'Kumanda kolları: uzun/kısa far, sinyal, silecek, korna; iç aydınlatma, ayna ayarları, el freni, pedallar ve vites sayısı.'] },
  1: { ad: 'Sürüşe hazırlık', ozet: 'Kemer takılmazsa sınav biter.', adim: ['Koltuğu pedallara rahat basacağın, kolların hafif bükük kalacağı şekilde ayarla.', 'İç ve dış aynaları ayarla.', 'Emniyet kemerini tak.'] },
  2: { ad: 'Aracı çalıştırma', adim: ['Manuel araçta debriyaja bas ve vitesi boşa al; otomatikte P konumunda çalıştır.', 'Motor çalışınca anahtarı bırak (marşta tutma).'] },
  3: { ad: 'Kalkış', ozet: 'Aynaya bakmamak ve sinyal vermemek sınavı bitirir.', oran: 'Hataların %24,8’i kalkışta; bunların %82’si stop ettirme.',
    adim: ['Aynalardan trafiği kontrol et.', 'Doğru yöne, zamanında sinyal ver.', 'Omuz üstünden bakarak kör noktayı kontrol et.', 'El frenini indir; birinci viteste (otomatikte D) kalk.', 'Stop ettirmemek için debriyajı kavrama noktasına kadar yavaş bırak, orada bekletirken hafif gaz ver.', 'Kalkınca doğru şeride geç.'] },
  4: { ad: 'Dar alanda geri dönüş', sema: 'ek20', ozet: '9 × 8 metre alanda en fazla üç hamlede dönülür (EK-20). Alan dışına çıkmak, koniye değmek ya da üç hamlede bitirememek sınavı bitirir.',
    adim: ['Alana girmeden önce zamanında ve doğru yöne sinyal ver.', '1. hamle: ileri giderek direksiyonu sola çevir, alanın sınırına yaklaşınca dur.', '2. hamle: geri vitese tak, arkayı aynalardan ve omuz üstünden kontrol ederek direksiyonu sağa çevirip geri git.', '3. hamle: ileri vitese tak, direksiyonu sola çevirerek alandan çık.', 'Sık sık durup vites değiştirmeden yeniden hareket etmek “manevra becerisi zayıf” sayılır.'] },
  5: { ad: 'Geri park', sema: 'ek13', ozet: 'Park yeri araç boyunun 1,5 katı uzunlukta, araçtan 50 cm geniş (EK-13). Koniler arasına tek hamlede ya da ikinci hakta girilir, içeride en fazla iki hamlede park edilir.', oran: 'Sınav hatalarının %28’i geri parkta; bunların %42’si kaldırıma ya da koniye değme, %19’u kaldırıma 50 cm’den uzak kalma.',
    adim: ['Park yerine yaklaşırken aynaları kontrol et, zamanında sağa sinyal ver.', 'Park yerinin önündeki aracın yanında, ona paralel ve yakın dur.', 'Geri vitese tak; sağ ayna ve omuz üstünden kontrol ederek çok yavaş geri git, direksiyonu sağa çevirerek aracı park yerine açıyla sok.', 'Araç park yerine yeterince girince direksiyonu sola çevir; sağ aynadan kaldırımı izleyerek aracı kaldırıma paralel getir.', 'Gerekirse en fazla iki hamlede düzelt. Kaldırıma ve konilere değme, kaldırıma 50 cm’den uzak kalma; arka tampon kaldırım hizasını geçmesin.', 'Çıkarken aynalar, sola sinyal ve omuz üstü bakış.'] },
  6: { ad: 'Römorklu araçta geri park', adim: ['Geri hamleye sol şeritten başla; konilere değme; içeride en fazla iki hamlede park et.'] },
  7: { ad: 'Geri düz gitme · 25 metre', ozet: 'Çizgiye ya da dubaya değmek ve arkayı kontrol etmemek sınavı bitirir.', adim: ['Kalkmadan önce aynalar, sinyal ve omuz üstü bakış.', 'Geri vitese tak; aynalardan ya da geriye dönerek arkayı sürekli kontrol et.', 'Direksiyonu küçük hareketlerle düzelterek aracı şeridin ortasında tut; yavaş git.'] },
  8: { ad: 'Geri giderken sağa L dönüşü', sema: 'ek19', ozet: 'B sınıfında şerit 3,5 m, kol 6 m, park yeri 6 × 3,5 m (EK-19). Tek hamlede 90 derece dönülür; lastik çizgiye ya da kaldırıma değerse sınav biter.', oran: 'Hataların %7,6’sı L dönüşünde.',
    adim: ['Dönüşten önce aynaları kontrol et ve zamanında sinyal ver.', 'Aracı park yerine düz yerleştir; geri vitese tak.', 'Çok yavaş geri giderken arkayı sağ aynadan izle; aracın arka tekeri köşeye yaklaşınca direksiyonu sağa çevir.', 'Araç kola paralel olunca direksiyonu düzelt ve kolun içinde dur; tek hamlede tamamla.', 'Tekrar yola çıkarken aynalar, sinyal ve omuz üstü bakış.'] },
  13: { ad: 'Seyir hâlinde', ozet: 'Akan trafikte en çok kırmızı madde buradadır.' },
  18: { ad: 'Eğimli yolda kalkış', ozet: 'En az %7 eğimli yolda durup kalkılır.', oran: 'Hataların %7,9’u rampada; bunların %86’sı stop ettirme.',
    adim: ['Sağ şeritte durmadan önce aynalar ve sinyal.', 'Dur ve el frenini çek.', 'Kalkmadan önce aynalar, sinyal ve omuz üstü bakış.', 'Debriyajı kavrama noktasına getir, hafif gaz ver; aracın öne doğru “çekmeye” başladığını hissedince el frenini indir.', 'Araç 50 cm’den fazla geri kaymasın; stop ettirme.'] },
  19: { ad: 'Ani fren', ozet: 'Saatte 30 km hızla giderken aracı ani frenle durdurabilmelisin.', adim: ['Hızı 30 km/sa’e getir; komutla frene kuvvetlice bas.', 'Manuel araçta stop ettirmemek için frenle birlikte debriyaja da bas.', 'Yeniden kalkarken aynalar ve sinyal.'] },
};
const bolumNo = bas => { const m = /^(\d+)\./.exec(bas); return m ? +m[1] : null; };
function bolumler(k) {
  const motor = ek3Sinif(k.sinif), f = motor ? EK3 : EK4, romorkSinif = /E$/.test(k.sinif);
  return f.map(([bol, bas, l], i) => {
    const no = bol === 'I' ? 'I' : bolumNo(bas), ek = motor ? {} : (EK[no] || {});
    const ad = ek.ad || bas.replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)\s*$/, '').toLocaleLowerCase('tr').replace(/^./, c => c.toLocaleUpperCase('tr'));
    if (/Sadece "B"/.test(bas) && !/^B(-O)?$/.test(k.sinif)) return null;
    if (/RÖMORKLU/.test(bas) && !romorkSinif) return null;
    if (!motor && /^8\./.test(bas) && romorkSinif) return null;
    return { id: 'b' + i, bol, bas, ad, l, ek, no };
  }).filter(Boolean);
}
// deneme sınavında hata yapılan bölümler
const hataBolum = k => { const s = new Set(); (k.dDeneme || []).slice(-3).forEach(d => (d.hatalar || []).forEach(h => s.add(h.bas))); return s; };

export function direksiyonHtml(k) {
  if (!SINIFLAR[k.sinif] || !SINIFLAR[k.sinif].direksiyon) return '';
  const l = bolumler(k), h = hataBolum(k), cal = k.dirCalisma || {};
  const onemli = ['I', 3, 5, 18, 8, 4];
  const sira = [...l].sort((a, b) => (h.has(b.bas) ? 1 : 0) - (h.has(a.bas) ? 1 : 0) || (onemli.indexOf(a.no) < 0 ? 99 : onemli.indexOf(a.no)) - (onemli.indexOf(b.no) < 0 ? 99 : onemli.indexOf(b.no)));
  return `<div class="kart og-kart"><div class="og-bas"><div><small>Direksiyon sınavına hazırlık</small><b>Sınavda neye bakılır</b></div>${rozet(Object.keys(cal).length + '/' + l.length + ' çalışıldı', 'mavi')}</div>
    <p class="og-not" style="padding:0 2px 8px">Sınav resmî değerlendirme formuyla yapılır: kırmızı bir hata ya da aynı sarı hatanın ikinci kez yapılması sınavı bitirir; araç bilgisinde 5 soruyu bilememek de. Önce en çok kalınan bölümler.</p>
    <ul class="og-basliklar">${sira.map(b => `<li><button type="button" data-dir="${b.id}" class="${cal[b.id] ? 'okundu' : ''}"><span>${cal[b.id] ? '✓' : b.ek.sema ? '▶' : '•'}</span>${e(b.ad)}${h.has(b.bas) ? ' <b style="color:var(--kirmizi);font-size:12px">· denemede hata</b>' : ''}</button></li>`).join('')}</ul></div>`;
}

/* ---------- şemalar: metre cinsinden; araç pozları [x, y, açı°] (açı 0 = sağa bakar, SVG’de saat yönü pozitif) ---------- */
const ARAC = { u: 4.2, g: 1.8 };
const arac = (renk, id) => `<g ${id ? `id="${id}"` : ''}><rect x="${-ARAC.u / 2}" y="${-ARAC.g / 2}" width="${ARAC.u}" height="${ARAC.g}" rx=".45" fill="${renk}" stroke="#1d1d1d" stroke-width=".05"/><rect x=".55" y="-.72" width=".9" height="1.44" rx=".2" fill="#cfe3f5" opacity=".9"/><rect x="-1.75" y="-.66" width=".6" height="1.32" rx=".15" fill="#cfe3f5" opacity=".7"/><rect x="1.85" y="-.8" width=".18" height=".38" rx=".05" fill="#fff6b0"/><rect x="1.85" y=".42" width=".18" height=".38" rx=".05" fill="#fff6b0"/></g>`;
const koni = (x, y) => `<circle cx="${x}" cy="${y}" r=".22" fill="#e8532b" stroke="#fff" stroke-width=".06"/>`;
const olcu = (x1, y1, x2, y2, t, d = 0) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dik = y1 === y2; return `<g><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width=".05" marker-start="url(#ok)" marker-end="url(#ok)"/><text x="${mx + (dik ? 0 : d || .35)}" y="${my + (dik ? (d || -.3) : 0)}" font-size=".55" font-weight="700" font-family="system-ui,sans-serif" fill="#fff" stroke="#1d1d1d" stroke-width=".14" paint-order="stroke" text-anchor="${dik ? 'middle' : 'start'}" dominant-baseline="middle">${t}</text></g>`; };
const SEMA = {
  ek13: {
    baslik: 'Geri park · EK-13 (B, C1, C, D1, D)', vb: '-7 -2.6 21 10',
    zemin: () => { const L = 1.5 * ARAC.u, G = ARAC.g + .5; return `<rect x="-7" y="-2.6" width="21" height="2.6" fill="#cfcac0"/><text x="-6.6" y="-1.2" font-size=".7" font-weight="700" fill="#6b655a" font-family="system-ui,sans-serif">KALDIRIM</text><rect x="-7" y="0" width="21" height="7.4" fill="#4a4d52"/><line x1="-7" y1="0" x2="14" y2="0" stroke="#fff" stroke-width=".08"/>${[-6, -2, 2, 6, 10].map(x => `<line x1="${x}" y1="5.2" x2="${x + 2}" y2="5.2" stroke="#fff" stroke-width=".12"/>`).join('')}
      <rect x="0" y="0" width="${L}" height="${G}" fill="none" stroke="#f2c200" stroke-width=".06" stroke-dasharray=".2 .15"/><line x1="0" y1=".5" x2="${L}" y2=".5" stroke="#f2c200" stroke-width=".1"/><text x="${L / 2}" y=".3" font-size=".38" text-anchor="middle" fill="#f2c200" font-family="system-ui,sans-serif">50 cm</text>
      ${koni(0, 0)}${koni(0, G)}${koni(L, 0)}${koni(L, G)}<g transform="translate(-2.9 1.25)">${arac('#3b4cc0')}</g><g transform="translate(${L + 2.9} 1.25)">${arac('#c0392b')}</g>
      ${olcu(0, 6.6, L, 6.6, 'araç boyunun 1,5 katı')}`; },
    yol: [[-4, 4.1, 0], [3, 4.1, 0], [9.3, 3.45, 0], 'Adım 1: aynalar, sağa sinyal; öndeki aracın yanında paralel dur', [8.2, 3.25, 6], [6.9, 2.75, 22], [5.6, 2.15, 34], 'Adım 2: geri vites; sağ ayna ve omuz üstü kontrolle direksiyon sağa, araç açıyla girer', [4.5, 1.6, 22], [3.7, 1.38, 8], 'Adım 3: direksiyon sola; sağ aynadan kaldırımı izleyerek paralel ol', [3.25, 1.3, 0], 'Adım 4: gerekirse en fazla iki hamlede düzelt; kaldırıma 50 cm’den yakın, değmeden'],
  },
  ek19: {
    baslik: 'Geri giderken sağa L dönüşü · EK-19 (B)', vb: '-6 -1.2 19.4 12',
    zemin: () => `<rect x="-6" y="-1.2" width="19.4" height="12" fill="#cfcac0"/><rect x="-6" y="-1.2" width="19.4" height="4.7" fill="#4a4d52"/><rect x="0" y="3.5" width="3.5" height="7.3" fill="#4a4d52"/>${[-5, -1, 6, 10].map(x => `<line x1="${x}" y1="-.6" x2="${x + 2}" y2="-.6" stroke="#fff" stroke-width=".1"/>`).join('')}
      <rect x="4" y="0" width="6" height="3.5" fill="none" stroke="#f2c200" stroke-width=".1"/><rect x="0" y="3.5" width="3.5" height="6" fill="none" stroke="#f2c200" stroke-width=".1"/>${[[4, 0], [7, 0], [10, 0], [10, 3.5], [0, 3.5], [0, 6.5], [0, 9.5], [3.5, 9.5]].map(([x, y]) => koni(x, y)).join('')}
      ${olcu(4, -.9 + .3, 10, -.9 + .3, '6 m')}${olcu(10.6, 0, 10.6, 3.5, '3,5 m')}${olcu(-.6, 3.5, -.6, 9.5, '6 m', -1.1)}${olcu(0, 10.2, 3.5, 10.2, '3,5 m')}`,
    yol: [[-4, 1.75, 0], [2, 1.75, 0], [7, 1.75, 0], 'Aynalar ve sinyal; aracı park yerine düz yerleştir', [4.9, 1.75, 0], [3.9, 2.0, -20], [2.9, 2.6, -45], 'Geri vites; arka teker köşeye yaklaşınca direksiyon sağa', [2.1, 3.6, -70], [1.75, 5.0, -88], 'Kola paralel olunca düzelt', [1.75, 7.2, -90], 'Tek hamlede, lastik çizgiye değmeden tamamla'],
  },
  ek20: {
    baslik: 'Dar alanda geri dönüş · EK-20 (yalnız B)', vb: '-5 -1.2 16.4 10.4',
    zemin: () => `<rect x="-5" y="-1.2" width="16.4" height="10.4" fill="#4a4d52"/><path d="M0 0 H9 V8 H0" fill="none" stroke="#f2c200" stroke-width=".18"/>${koni(0, 0)}${koni(-.2, 4.1)}${koni(.3, 4.1)}${koni(0, 8)}
      ${olcu(0, 8.6, 9, 8.6, '9 m')}${olcu(9.6, 0, 9.6, 8, '8 m')}${olcu(-.6, 0, -.6, 4, '4 m', -1)}`,
    yol: [[-4, 6.1, 0], [0.5, 6.1, 0], 'Alana girmeden önce sinyal', [3.6, 5.7, -25], [5.6, 4.0, -70], [5.7, 2.5, -115], 'Hamle 1: ileri, direksiyon sola; sınıra yaklaşınca dur', [6.3, 3.5, -122], [6.7, 4.4, -128], 'Hamle 2: geri vites, kontrol et, direksiyon sağa', [6.3, 2.7, -155], [4.6, 2.1, -178], [0.5, 2.0, -180], [-4, 2.0, -180], 'Hamle 3: ileri, direksiyon sola; alandan çık'],
  },
};
function semaHtml(ad) {
  const s = SEMA[ad];
  return `<figure class="dir-sema"><figcaption style="font-weight:700;color:var(--murekkep);margin-bottom:6px">${e(s.baslik)}</figcaption>
    <svg viewBox="${s.vb}" role="img" aria-label="${e(s.baslik)}" style="width:100%;height:auto;border-radius:10px;display:block;background:#4a4d52"><defs><marker id="ok" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#fff"/></marker></defs>${s.zemin()}<g data-arac>${arac('#2fa36b')}</g></svg>
    <p data-adim style="min-height:2.6em;font-size:14px;margin:8px 0 6px;color:var(--murekkep)"></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="dg dg-ana dg-kucuk" data-oynat>▶ Oynat</button><button type="button" class="dg dg-cizgi dg-kucuk" data-adim-ileri>Adım adım</button><button type="button" class="dg dg-hafif dg-kucuk" data-basa>Başa al</button></div>
    <figcaption style="font-size:12px;color:var(--soluk);margin-top:6px">Ölçüler yönetmelik ekindeki şemadan (MTSK Yönetmeliği, RG 9/7/2024). Anlatım temsilîdir; dönüş anlarını öğretmeninle sınav aracında çalış.</figcaption></figure>`;
}
// yol: pozlar ve adım açıklamaları; adım açıklaması kendinden önceki pozlarla biter
function semaBagla(p, ad) {
  const s = SEMA[ad], g = p.querySelector('[data-arac]'), yaz = p.querySelector('[data-adim]');
  const adimlar = []; let cur = [];
  s.yol.forEach(x => { if (typeof x === 'string') { adimlar.push({ pozlar: cur, metin: x }); cur = [cur[cur.length - 1]]; } else cur.push(x); });
  const koy = ([x, y, a]) => g.setAttribute('transform', `translate(${x} ${y}) rotate(${a})`);
  const ilk = adimlar[0].pozlar[0]; let i = 0, anim = null, durdu = true;
  const sifirla = () => { cancelAnimationFrame(anim); i = 0; durdu = true; koy(ilk); yaz.textContent = 'Oynat’a bas ya da adım adım ilerle.'; };
  const oyna = (n, sonra) => {
    const l = adimlar[n].pozlar, sure = 900 * Math.max(1, l.length - 1); let t0 = null; yaz.textContent = adimlar[n].metin;
    const kare = t => { if (t0 == null) t0 = t; const u = Math.min(1, (t - t0) / sure), f = u * (l.length - 1), j = Math.min(l.length - 2, Math.floor(f)), r = f - j, a = l[j], b = l[j + 1] || a; koy([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r, a[2] + (b[2] - a[2]) * r]); if (u < 1) anim = requestAnimationFrame(kare); else if (sonra) sonra(); };
    cancelAnimationFrame(anim); anim = requestAnimationFrame(kare);
  };
  p.querySelector('[data-oynat]').addEventListener('click', () => { sifirla(); durdu = false; const zincir = n => oyna(n, () => { if (!durdu && n + 1 < adimlar.length) setTimeout(() => zincir(n + 1), 700); }); zincir(0); });
  p.querySelector('[data-adim-ileri]').addEventListener('click', () => { durdu = true; if (i >= adimlar.length) { sifirla(); } oyna(i); i++; });
  p.querySelector('[data-basa]').addEventListener('click', sifirla);
  sifirla();
}

export function direksiyonAc(k, id, yenile) {
  const b = bolumler(k).find(x => x.id === id); if (!b) return;
  const h = (k.dDeneme || []).slice(-3).flatMap(d => (d.hatalar || []).filter(x => x.bas === b.bas).map(x => x.sira));
  const kirmizi = b.l.filter(x => x[2] === 'k'), sari = b.l.filter(x => x[2] === 's'), mavi = b.l.filter(x => x[2] === 'm');
  const liste = (l, renk) => l.length ? `<ul class="dir-madde">${l.map(([sira, metin]) => `<li class="${h.includes(sira) ? 'dir-hata' : ''}"><span class="dn-renk dn-${renk}"></span><span>${e(metin.replace(/\s*\((?:"|“)[^)]*\)\s*\.?$/, ''))}${h.includes(sira) ? ' <b style="color:var(--kirmizi)">· denemede yaptın</b>' : ''}</span></li>`).join('')}</ul>` : '';
  const ek = b.ek, cal = k.dirCalisma || {};
  pencere({
    baslik: b.ad, genis: true,
    icerik: `<article class="og-ders">${ek.ozet ? `<p style="font-size:15px">${e(ek.ozet)}</p>` : ''}${ek.oran ? `<p class="ipucu" style="margin:8px 0">${ik('bilgi')}<span>${e(ek.oran)} <small style="display:block;color:var(--soluk)">${KAYNAK_HATA}</small></span></p>` : ''}
      ${ek.sema ? semaHtml(ek.sema) : ''}${b.no === 'I' && ogrOzellik('ikaz') ? `<button type="button" class="dg dg-ana dg-kucuk" data-ikaz style="margin-top:8px">${ik('uyari')}Gösterge paneli ve ikaz lambaları</button>` : ''}${[3, 18, 4, 5].includes(b.no) && !motorSinif(k.sinif) && ogrOzellik('motor') ? `<button type="button" class="dg dg-ana dg-kucuk" data-debriyaj style="margin-top:8px">Debriyajı dene: stop ettirmeden kalkış</button>` : ''}
      ${ek.adim ? `<h4 style="margin-top:14px">Adım adım</h4><ol class="dir-adim">${ek.adim.map(x => `<li>${e(x)}</li>`).join('')}</ol>` : ''}
      <h4 style="margin-top:14px">Sınavda değerlendirilenler</h4>
      ${kirmizi.length ? `<p class="et" style="margin-top:6px">Kırmızı · bir kez yapılırsa sınav biter</p>${liste(kirmizi, 'k')}` : ''}
      ${sari.length ? `<p class="et" style="margin-top:10px">Sarı · aynı madde iki kez yapılırsa sınav biter</p>${liste(sari, 's')}` : ''}
      ${mavi.length ? `<p class="et" style="margin-top:6px">Mavi · 5 maddeyi bilemezsen sınav biter</p>${liste(mavi, 'm')}` : ''}
      <p class="og-kaynak">Kaynak: MTSK Yönetmeliği ${motorSinif(k.sinif) ? 'EK-3' : 'EK-4'} direksiyon sınavı değerlendirme formu (RG 9/7/2024, yürürlük 9/1/2025)${ek.sema ? ' ve ' + ek.sema.toUpperCase().replace('EK', 'EK-') + ' şeması' : ''}.</p></article>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-dir-tamam>${cal[id] ? 'Çalıştım ✓' : 'Çalıştım'}</button>`,
    onAc(p) {
      if (ek.sema) semaBagla(p, ek.sema);
      const iz = p.querySelector('[data-ikaz]'); if (iz) iz.addEventListener('click', () => import('./ikaz.js?v=99').then(m => m.ikazAc()));
      const db = p.querySelector('[data-debriyaj]'); if (db) db.addEventListener('click', () => import('./motor.js?v=99').then(m => m.debriyajAc()));
      p.querySelector('[data-dir-tamam]').addEventListener('click', () => { k.dirCalisma = { ...(k.dirCalisma || {}), [id]: gun(0) }; kaydet(); p.querySelector('[data-kapat]').click(); if (yenile) yenile(); });
    },
  });
}
