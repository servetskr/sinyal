// Öğretmen › Kazancım (yeni tasarım): ay seçici, bu ayın kalan alacağı (brüt), kazanç dökümü (sabit ücret, ders primi, avans, yapılan ödeme),
// kontrol bekleyen dersler (imza eksik, 40 dakikadan kısa) ve önceki ayların ödeme durumu. Alt ekran 'ayrinti': ayın dersleri (süzgeçli) ve ödemeler.
// Hesap js/risk.js ustaAlacak() ile yapılır; ofisin hakediş tablosu da aynı işlevi kullanır. Eski portal.js "Kazancım" bilgilerinin hepsi burada.
import { S, kursiyer, tamAd, tarihOku } from '../veri.js?v=220';
import { ayAdi, gunKisa } from '../ui.js?v=220';
import { ustaAlacak } from '../risk.js?v=220';
import { esc, oi, tl, geri, bolum, baglanti, kart, liste, satir, ikonKutu, cip, not, bos, sekmeler, gorsel, stilEkle } from '../ogr/ui.js?v=220';

/* ---------- ekran durumu (yeniden çizimde korunur) ---------- */
const DURUM = 'sinyal-eg-kazanc';
const _d = (() => { try { return JSON.parse(sessionStorage.getItem(DURUM) || '{}'); } catch (x) { return {}; } })();
let ayGeri = +_d.ayGeri || 0;        // seçili ay: 0 bu ay, 1 geçen ay … (sayfa yenilense de kalır)
let filtre = _d.filtre || 'tumu';   // ayrıntı süzgeci: 'tumu' | 'imza' | 'kisa'
const durumYaz = () => { try { sessionStorage.setItem(DURUM, JSON.stringify({ ayGeri, filtre })); } catch (x) { } };
let hepsi = false;     // ödeme geçmişinde bütün aylar
let dersHepsi = false; // ayrıntıda bütün dersler (ilk 8'den sonrası)
const DERS_ILK = 8;
let P = null;          // portal.js iş mantığı (ctx.P)
const AY_SAY = 12;     // ay seçicide ve geçmişte geriye en çok bu kadar ay

/* ---------- yardımcılar ---------- */
const ayAd = ay => { const [y, m] = ay.split('-').map(Number); return ayAdi(m - 1, true) + ' ' + y; };
const ayKisa = ay => ayAdi(+ay.slice(5, 7) - 1).toLocaleUpperCase('tr');
const gunAy = t => { const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };
const veriVar = a => a.ders || a.odenen || a.avans;
const imzaEksik = d => !d.imza || d.imza.kursiyerBekliyor;
const kisaMi = d => d.sure != null && d.sure < 40;
const ucretYok = eg => !(+eg.maas) && !(+eg.prim);
// ay seçicideki aylar: bu ay, seçili ay ve son 12 ayda dersi ya da ödemesi olan aylar
function aylar(eg) {
  const l = [];
  for (let g = 0; g < AY_SAY; g++) { const a = ustaAlacak(eg, g); if (g === 0 || g === ayGeri || veriVar(a)) l.push([g, a]); }
  return l;
}
const dersleri = (eg, ay) => S.dersler.filter(d => d.egitmen === eg.id && d.durum === 'Yapıldı' && (d.tarih || '').slice(0, 7) === ay)
  .sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
// seçili aya kadar yapılan ödemeler ve verilen avanslar (yeniden eskiye)
function odemeler(eg, ay) {
  const o = (S.ustaOdemeleri || []).filter(x => x.egitmen === eg.id && (x.ay || '') <= ay).map(x => ({ tur: 'odeme', tarih: x.tarih || '', tutar: +x.tutar || 0, yontem: x.yontem || '', ay: x.ay }));
  const a = (S.avanslar || []).filter(x => x.kim === eg.ad && (x.tarih || '').slice(0, 7) <= ay).map(x => ({ tur: 'avans', tarih: x.tarih || '', tutar: +x.tutar || 0, yontem: x.yontem || '', not: x.not || '' }));
  return [...o, ...a].sort((x, y) => y.tarih.localeCompare(x.tarih));
}

/* ---------- parçalar ---------- */
function ayDugme(eg, a) {
  const l = aylar(eg);
  return `<label class="ox-ukz-ay"><span>${esc(ayAd(a.ay))}</span>${oi('asagi')}
    <select data-ox-ukz-ay aria-label="Ay seç: ${esc(ayAd(a.ay))}">${l.map(([g, x]) => `<option value="${g}"${g === ayGeri ? ' selected' : ''}>${esc(ayAd(x.ay))}</option>`).join('')}</select></label>`;
}
const baslik = (eg, a, ad = 'Kazancım') => `<header class="ox-sayfa-bas ox-ukz-bas"><div><h1>${ad}</h1></div>${a ? ayDugme(eg, a) : ''}</header>`;
const yaprak = (ust, alt, cls = '') => `<span class="ox-ukz-yaprak ${cls}" aria-hidden="true"><i>${esc(ust)}</i><b>${esc(alt)}</b></span>`;

function hero(a) {
  const buAy = ayGeri === 0, odendi = !a.kalan && a.odenen > 0;
  return `<section class="ox-hero gorselli ox-ukz-hero">
    <div class="ox-hero-yazi"><p class="ox-hero-ust">${odendi ? esc(ayAd(a.ay)) + ' kazancın' : buAy ? 'Bu ay kalan alacağın' : esc(ayAd(a.ay)) + ' kalan alacağın'}</p>
      <p class="ox-ukz-tutar">${tl(odendi ? a.brut : a.kalan)}</p>
      <p class="ox-ukz-brut${odendi ? ' odendi' : ''}">${odendi ? oi('tik') + '<span>Brüt · tamamı ödendi</span>' : 'Brüt tutar'}</p></div>
    ${gorsel('usta-cuzdan', '', 'ox-hero-gorsel ox-ukz-cuzdan')}
    <div class="ox-ukz-serit">${oi('takvim')}<span>${a.ders ? `${a.ders} ders tamamlandı` : 'Henüz ders yok'}</span><small>${buAy ? 'Bu ay' : esc(ayAd(a.ay))}</small></div>
  </section>`;
}

function dokum(a) {
  const kutu = (ust, n, alt) => `<div class="ox-kart ox-ukz-kutu"><small>${ust}</small><b>${tl(n)}</b><span>${alt}</span></div>`;
  const kutular = [a.maas ? kutu('Sabit ücret', a.maas, 'Aylık ücret') : '', a.primBirim ? kutu('Ders primi', a.prim, `${a.ders} ders × ${tl(a.primBirim)}`) : ''].filter(Boolean);
  const ek = `<div class="ox-ukz-ek"><span>Avans<b>${a.avans ? '−' : ''}${tl(a.avans)}</b></span><span>Yapılan ödeme<b>${a.odenen ? '−' : ''}${tl(a.odenen)}</b></span></div>`;
  const kontrol = a.imzasiz || a.kisa ? `<button type="button" class="ox-kart ox-ukz-kontrol" data-ox-ukz-kontrol>${ikonKutu('bilgi', 'turuncu')}<span class="ox-ukz-kontrol-g"><b>Kontrol bekleyen dersler</b><small>${[a.imzasiz ? a.imzasiz + ' imza eksik' : '', a.kisa ? a.kisa + ' kısa ders' : ''].filter(Boolean).join(' · ')}</small></span><span class="ox-chev">${oi('sag')}</span></button>` : '';
  return bolum('Kazanç dökümü', baglanti('Ayrıntı', { 'data-ox-ukz-ayrinti': true }, true))
    + `<div class="ox-ukz-iki${kutular.length < 2 ? ' tek' : ''}">${kutular.join('')}</div>` + ek + kontrol
    + '<p class="ox-ukz-dip">Ders primleri kurs kontrolüne tabidir.</p>';
}

function gecmis(eg) {
  const l = [];
  for (let g = 1; g <= AY_SAY; g++) { const a = ustaAlacak(eg, g); if (veriVar(a)) l.push([g, a]); }
  if (!l.length) return '';
  const gor = hepsi ? l : l.slice(0, 3);
  const sag = l.length > 3 ? baglanti(hepsi ? 'Daha az' : 'Tümü', { 'data-ox-ukz-hepsi': true, 'aria-expanded': String(hepsi) }, !hepsi) : '';
  return bolum('Ödeme geçmişi', sag) + liste(gor.map(([g, a]) => {
    const durum = a.kalan ? `<small class="bekliyor">${tl(a.kalan)} kaldı</small>` : `<small class="odendi">${oi('tik')}Ödendi</small>`;
    return `<button type="button" class="ox-satir ox-ukz-gecmis${g === ayGeri ? ' secili' : ''}" data-ox-ukz-sec="${g}" aria-label="${esc(ayAd(a.ay))}: ${a.ders} ders, ${esc(tl(a.brut))} brüt, ${a.kalan ? esc(tl(a.kalan)) + ' bekliyor' : 'ödendi'}. Bu ayı göster">
      ${yaprak(ayKisa(a.ay), a.ay.slice(0, 4))}
      <span class="ox-satir-govde"><b>${esc(ayAd(a.ay))}</b><small>${a.ders} ders${a.avans ? ' · avans ' + tl(a.avans) : ''}</small></span>
      <span class="ox-ukz-gecmis-sag"><b>${tl(a.brut)}</b>${durum}</span></button>`;
  }), 'ox-ukz-gecmisler');
}

function anaHtml(eg) {
  if (ucretYok(eg)) return baslik(eg, null) + kart(bos('cuzdan', 'Ücret bilgin henüz girilmemiş', 'Kurs müdürü ücretini ve ders primini girince bu ayki alacağın burada görünür.'), 'ox-ukz-bos');
  const a = ustaAlacak(eg, ayGeri);
  return baslik(eg, a) + hero(a) + dokum(a) + gecmis(eg)
    + not('Tutarlar brüttür; net ödeme SGK ve vergi kesintilerinden sonra bordroda belirlenir. Kurs ödeme yaptığında burada görünür; bir yanlışlık görürsen kurs müdürüne söyle.');
}

/* ---------- Kazanç ayrıntısı ---------- */
function dersSatir(d) {
  const k = kursiyer(d.kursiyer), no = k && P && P.dersNo ? P.dersNo(d, k) : '';
  const im = imzaEksik(d), ks = kisaMi(d);
  const sag = im || ks ? `<span class="ox-ukz-cipler">${im ? cip('İmza eksik', 'turuncu') : ''}${ks ? cip('Kısa ders', 'ox-ukz-sari') : ''}</span>`
    : `<span class="ox-ukz-tamam" role="img" aria-label="Kontrol tamam">${oi('tik')}</span>`;
  const dt = tarihOku(d.tarih);
  return satir({
    sol: yaprak(gunKisa(d.tarih).toLocaleUpperCase('tr'), String(dt.getDate()), 'kucuk'),
    baslik: esc(k ? tamAd(k) : 'Öğrenci'),
    alt: [esc(d.saat || ''), no ? no + '. ders' : '', d.sure != null ? d.sure + ' dk' : ''].filter(Boolean).join(' · '),
    sag, ok: false, cls: 'ox-ukz-ders',
  });
}

function ayrintiHtml(eg) {
  const a = ustaAlacak(eg, ayGeri), l = dersleri(eg, a.ay);
  const imz = l.filter(imzaEksik), ksa = l.filter(kisaMi);
  const gorunen = filtre === 'imza' ? imz : filtre === 'kisa' ? ksa : l;
  const say = n => n ? ` <em>${n}</em>` : '';
  const ozet = `<div class="ox-kart ox-ukz-ozet"><div class="ox-ukz-ozet-sol"><b>${esc(ayAd(a.ay))}</b><small>${a.ders} ders${a.primBirim ? ' · ' + tl(a.primBirim) + ' ders primi' : ''}</small></div>
    <div class="ox-ukz-ozet-sag"><small>Brüt tutar</small><b>${tl(a.brut)}</b></div></div>`;
  const bosMetin = filtre === 'imza' ? ['İmzası eksik ders yok', 'Bu aydaki derslerin hepsinde öğrenci imzası var.']
    : filtre === 'kisa' ? ['Kısa ders yok', '40 dakikadan kısa süren ders yok.'] : ['Bu ay tamamlanan ders yok', 'Yapıldı olarak kapattığın dersler burada görünür.'];
  const kes = !dersHepsi && gorunen.length > DERS_ILK + 2, sira = kes ? gorunen.slice(0, DERS_ILK) : gorunen;
  const dahaDg = kes ? `<button type="button" class="ox-ukz-daha" data-ox-ukz-daha>${oi('asagi')}<span>${gorunen.length} dersin hepsini göster</span></button>` : '';
  const dersler = gorunen.length ? liste(sira.map(dersSatir).concat(dahaDg ? [dahaDg] : []), 'ox-ukz-dersler') : kart(bos(filtre === 'tumu' ? 'takvim' : 'tik', bosMetin[0], bosMetin[1]), 'ox-ukz-bos');
  const od = odemeler(eg, a.ay).slice(0, 6);
  const odHtml = liste(od.length ? od.map(o => satir({
    ikon: o.tur === 'avans' ? 'cuzdan' : 'kart', ton: o.tur === 'avans' ? 'gri' : 'yesil',
    baslik: o.tur === 'avans' ? 'Avans' : esc(ayAd(o.ay)) + ' hakedişi',
    alt: [o.tarih ? gunAy(o.tarih) : '', esc(o.yontem), o.not ? esc(o.not) : ''].filter(Boolean).join(' · '),
    sag: `<span class="ox-ukz-od-sag"><b>${tl(o.tutar)}</b><small>${oi('tik')}Ödendi</small></span>`, ok: false,
  })) : [satir({ ikon: 'cuzdan', ton: 'gri', baslik: 'Henüz ödeme yok', alt: 'Kurs ödeme yaptığında burada görünür.', ok: false })]);
  const formul = `Brüt tutar: Sabit ücret (${tl(a.maas)}) + Ders primi (${tl(a.prim)}).`
    + (a.avans || a.odenen ? ` Kalan alacak: brüt${a.avans ? ' − avans (' + tl(a.avans) + ')' : ''}${a.odenen ? ' − yapılan ödeme (' + tl(a.odenen) + ')' : ''} = ${tl(a.kalan)}.` : '');
  return geri('Kazancım', { 'data-ox-ukz-geri': true })
    + baslik(eg, null, 'Kazanç ayrıntısı')
    + ozet
    + `<div class="ox-ukz-filtre">${sekmeler([['tumu', 'Tümü' + say(l.length)], ['imza', 'İmza eksik' + say(imz.length)], ['kisa', 'Kısa ders' + say(ksa.length)]], filtre, 'data-ox-ukz-f', 'hap')}</div>`
    + dersler
    + (filtre !== 'tumu' && gorunen.length ? not(filtre === 'imza' ? 'Öğrenci imzası gelmeyen dersler. Prim hesaplanırken kurs bunları kontrol eder.' : 'Kısa ders: 40 dakikadan kısa süren ders. Prim hesaplanırken kurs bunları kontrol eder.') : '')
    + bolum('Ödeme geçmişi') + odHtml
    + not(formul + ' Tutarlar brüttür.');
}

/* ---------- dışa açılan ---------- */
export function ekran(ctx) {
  durumYaz();  // seçili ay ve süzgeç sayfa yenilense de kalsın
  const { eg } = ctx; P = ctx.P;
  const ayr = ctx.alt === 'ayrinti' && !ucretYok(eg);
  return {
    html: ayr ? ayrintiHtml(eg) : anaHtml(eg),
    baglan(kap) {
      kap.addEventListener('change', ev => {
        const s = ev.target.closest('[data-ox-ukz-ay]'); if (!s) return;
        ayGeri = Math.max(0, Math.min(AY_SAY - 1, +s.value || 0)); ctx.yenile(false);
      });
      kap.addEventListener('click', ev => {
        const t = ev.target;
        if (t.closest('[data-ox-ukz-geri]')) { filtre = 'tumu'; dersHepsi = false; return ctx.altAc(''); }
        if (t.closest('[data-ox-ukz-ayrinti]')) { filtre = 'tumu'; dersHepsi = false; return ctx.altAc('ayrinti'); }
        if (t.closest('[data-ox-ukz-kontrol]')) { const a = ustaAlacak(eg, ayGeri); filtre = a.imzasiz ? 'imza' : 'kisa'; dersHepsi = false; return ctx.altAc('ayrinti'); }
        const f = t.closest('[data-ox-ukz-f]'); if (f) { if (f.dataset.oxUkzF !== filtre) { filtre = f.dataset.oxUkzF; dersHepsi = false; ctx.yenile(false); } return; }
        if (t.closest('[data-ox-ukz-daha]')) { dersHepsi = true; return ctx.yenile(false); }
        if (t.closest('[data-ox-ukz-hepsi]')) { hepsi = !hepsi; return ctx.yenile(false); }
        const g = t.closest('[data-ox-ukz-sec]'); if (g) { ayGeri = +g.dataset.oxUkzSec || 0; return ctx.yenile(true); }
      });
    },
  };
}
export const sifirla = () => { ayGeri = 0; filtre = 'tumu'; hepsi = false; dersHepsi = false; };

stilEkle('ox-ukazanc', `
.ox-ukz-bas{align-items:center}
.ox-ukz-ay{position:relative;flex:none;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px 0 16px;border-radius:12px;background:var(--ox-mavi-acik);color:var(--ox-bas);font-size:15.5px;font-weight:600;white-space:nowrap;cursor:pointer}
.ox-ukz-ay .ox-i{width:19px;height:19px;stroke-width:2.1;color:var(--ox-mavi)}
.ox-ukz-ay select{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;cursor:pointer;-webkit-appearance:none;appearance:none;border:0}
.ox-ukz-ay:focus-within{outline:2.5px solid var(--ox-mavi);outline-offset:2px}
.ox-ukz-ay:active{background:var(--ox-mavi-orta)}

.ox-ukz-hero{padding:16px 16px 14px 20px}
.ox-ukz-hero.gorselli .ox-hero-yazi{max-width:62%}
.ox-ukz-hero .ox-hero-ust{margin-bottom:2px;line-height:1.25}
.ox-ukz-tutar{font-size:36px;line-height:1.1;font-weight:800;letter-spacing:-.03em;color:var(--ox-bas);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-ukz-brut{display:flex;align-items:center;gap:4px;margin-top:3px;font-size:14.5px;color:var(--ox-ikincil)}
.ox-ukz-brut.odendi{color:var(--ox-yesil);font-weight:600}
.ox-ukz-brut .ox-i{width:17px;height:17px;stroke-width:2.4}
.ox-ukz-hero .ox-ukz-cuzdan{top:12px;right:8px;width:36%;max-width:128px;aspect-ratio:4/3;height:auto}
.ox-ukz-serit{position:relative;z-index:1;display:flex;align-items:center;gap:10px;min-height:44px;margin:14px -4px 0 -8px;padding:8px 14px 8px 12px;border-radius:12px;background:rgba(255,255,255,.7);border:1px solid #d6e4f8;font-size:15px;color:var(--ox-metin)}
.ox-ukz-serit .ox-i{width:21px;height:21px;color:var(--ox-mavi)}
.ox-ukz-serit span{flex:1;min-width:0;font-weight:600;color:var(--ox-bas);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-ukz-serit small{flex:none;font-size:14px;color:var(--ox-ikincil)}

.ox-ukz-iki{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ox-ukz-iki.tek{grid-template-columns:1fr}
.ox-ukz-kutu{display:grid;gap:2px;min-width:0;padding:14px 16px 13px;margin:0!important}
.ox-ukz-kutu small{font-size:14.5px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ukz-kutu b{font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-.025em;color:var(--ox-bas);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-ukz-kutu span{font-size:14px;line-height:1.3;color:var(--ox-ikincil);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-ukz-ek{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;padding:12px 4px 0;font-size:15px;color:var(--ox-ikincil)}
.ox-ukz-ek span{min-width:0;white-space:nowrap}
.ox-ukz-ek b{margin-left:6px;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-ukz-kontrol{display:flex!important;align-items:center;gap:14px;min-height:64px;margin-top:16px!important;padding:12px 16px;border-color:#f5dcb8;background:linear-gradient(90deg,#fff6e9 0,#fffbf5 40%,#fff 75%)}
.ox-ukz-kontrol:active{background:#fff3e2!important}
.ox-ukz-kontrol-g{flex:1;min-width:0;display:grid;gap:2px}
.ox-ukz-kontrol-g b{font-size:16px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-ukz-kontrol-g small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ukz-dip{margin:8px 4px 0;font-size:13.5px;line-height:1.35;color:var(--ox-ikincil)}

.ox-ukz-yaprak{position:relative;flex:none;display:grid;grid-template-rows:20px 1fr;justify-items:center;align-items:center;width:56px;height:50px;border:1.5px solid var(--ox-cizgi);border-radius:12px;background:#fff;text-align:center}
.ox-ukz-yaprak::before,.ox-ukz-yaprak::after{content:"";position:absolute;top:-6px;left:10px;width:3.5px;height:9px;border-radius:2px;background:#7eaef5;box-shadow:0 0 0 1.5px #fff}
.ox-ukz-yaprak::after{left:auto;right:10px}
.ox-ukz-yaprak i{align-self:stretch;justify-self:stretch;margin:-1.5px -1.5px 0;border-radius:11px 11px 0 0;background:var(--ox-mavi);color:#fff;font-style:normal;font-size:11px;line-height:21px;font-weight:700;letter-spacing:.04em}
.ox-ukz-yaprak b{font-size:15px;line-height:1;font-weight:700;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-ukz-yaprak.kucuk{width:44px;height:46px;grid-template-rows:18px 1fr}
.ox-ukz-yaprak.kucuk::before,.ox-ukz-yaprak.kucuk::after{display:none}
.ox-ukz-yaprak.kucuk i{font-size:10px;line-height:19px;background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-ukz-yaprak.kucuk b{font-size:18px;font-weight:800;letter-spacing:-.02em}
.ox-ukz-gecmis{min-height:78px;padding:14px 16px}
.ox-liste>.ox-ukz-gecmis+.ox-ukz-gecmis::before{left:86px}
.ox-ukz-gecmis-sag{flex:none;display:grid;justify-items:end;gap:3px}
.ox-ukz-gecmis-sag b{font-size:17px;line-height:1.2;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-ukz-gecmis-sag small,.ox-ukz-od-sag small{display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:600;white-space:nowrap}
.ox-ukz-gecmis-sag small .ox-i,.ox-ukz-od-sag small .ox-i{width:16px;height:16px;stroke-width:2.6}
.ox-ukz-gecmis-sag .odendi,.ox-ukz-od-sag small{color:var(--ox-yesil)}
.ox-ukz-gecmis-sag .bekliyor{color:#c26a00}

.ox-ukz-ozet{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px}
.ox-ukz-ozet-sol,.ox-ukz-ozet-sag{display:grid;gap:2px;min-width:0}
.ox-ukz-ozet-sol b{font-size:18px;line-height:1.25;font-weight:800;letter-spacing:-.015em;color:var(--ox-bas)}
.ox-ukz-ozet small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ukz-ozet-sag{flex:none;justify-items:end}
.ox-ukz-ozet-sag b{font-size:22px;line-height:1.2;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-ukz-filtre{margin-top:16px}
.ox-ukz-filtre .ox-sekmeler{margin:0 0 12px}
.ox-ukz-filtre .ox-sekmeler em{font-style:normal;font-variant-numeric:tabular-nums;opacity:.7;margin-left:2px}
.ox-ukz-filtre .ox-sekmeler button.secili em{opacity:.85}
.ox-ukz-ders{gap:12px;padding:10px 14px 10px 16px}
.ox-liste>.ox-ukz-ders+.ox-ukz-ders::before{left:72px}
.ox-ukz-ders .ox-satir-govde b{overflow-wrap:break-word}
.ox-ukz-cipler{display:grid;justify-items:end;gap:4px}
.ox-ukz-cipler .ox-cip{height:24px;padding:0 9px;font-size:12.5px}
.ox-cip.ox-ukz-sari{background:var(--ox-sari-acik);color:#a26e00}
.ox-ukz-tamam{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ox-yesil-acik);color:var(--ox-yesil)}
.ox-ukz-tamam .ox-i{width:16px;height:16px;stroke-width:2.6}
.ox-ukz-od-sag{display:grid;justify-items:end;gap:3px}
.ox-ukz-od-sag b{font-size:16px;font-weight:700;color:var(--ox-bas);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-ukz-bos{margin-top:4px}
.ox-ukz-daha{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:52px;color:var(--ox-mavi);font-size:15.5px;font-weight:600}
.ox-ukz-daha .ox-i{width:19px;height:19px;stroke-width:2.1}
.ox-liste>.ox-ukz-daha::before{content:"";position:absolute;top:0;left:16px;right:16px;border-top:1px solid var(--ox-ayrac)}
.ox-ukz-daha:active{background:#f2f5fa}
@media (max-width:380px){.ox-ukz-tutar{font-size:32px}.ox-ukz-kutu b{font-size:22px}.ox-ukz-kutu{padding:13px 14px 12px}}
`);
stilEkle('ox-ukz-dar', `.ox-ukz-gecmis .ox-satir-govde{min-width:84px}
.ox-ukz-gecmis .ox-satir-govde b{white-space:nowrap}
@media (max-width:360px){.ox-ukz-gecmis{gap:10px;padding:12px 12px}.ox-ukz-gecmis-sag b{font-size:16px}}`);
