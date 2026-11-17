// Öğretmen › Program sekmesi (yeni tasarım): hafta şeridi ya da ay ızgarası, seçili günün dersleri, dönemin ders sayısı, Excel'e indirme.
// Eski portal.js programı (Excel tablosu gibi hafta/ay, önceki/sonraki dönem, Bugün'e dönüş, durumlar, .xlsx indirme) buraya taşındı.
// Durumlar portal.js progDurum'dan, ders sırası dersNo'dan gelir. Ders menüsü (data-ders-diger), dersi kapatma (data-yapildi / data-gelmedi)
// ve öğrenci ayrıntısı (data-ogr-ac) yönlendiricide (usta/ekran.js) çalışır.
// İndirme: P.progIndir(eg) portal.js'in kendi (eski ekrandaki) dönemine bakar; yeni ekranın gösterdiği dönemi (seçili hafta ya da ay)
// indirmek için data-prog-indir burada yakalanır ve aynı sütunlarla o dönemin dosyası üretilir.
import { S, gun, fark, tarihOku, iso, kursiyer, arac, tamAd, SINIFLAR, kapaliGun } from '../veri.js?v=215';
import { gunAdi, gunKisa, ayAdi, tarihUzun, bildir, csvIndir } from '../ui.js?v=215';
import * as TK from '../takvim.js?v=215';
import { esc, oi, sayfaBas, kart, bos, dugme, cip, sekmeler, stilEkle } from '../ogr/ui.js?v=215';
import { geceCip } from './bugun.js?v=215';

/* ---------- ekran durumu (yeniden çizimde korunur) ---------- */
let mod = 'hafta';   // 'hafta' | 'ay'
let secili = null;   // seçili gün (YYYY-AA-GG); null → varsayılan gün

const ekleGun = (t, n) => { const d = tarihOku(t); d.setDate(d.getDate() + n); return iso(d); };
const ayKaydir = (t, n) => { const d = tarihOku(t); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d); };
const ayGunleri = t => { const d = tarihOku(t), n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return Array.from({ length: n }, (_, i) => iso(new Date(d.getFullYear(), d.getMonth(), i + 1))); };
const gunAy = t => { const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };
const gunBaslik = t => { const f = fark(t); return (f === 1 ? 'Yarın' : f === -1 ? 'Dün' : gunAdi(t)) + ', ' + gunAy(t); };
const aralikMetin = g => { const a = tarihOku(g[0]), b = tarihOku(g[g.length - 1]); return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${ayAdi(b.getMonth(), true)}` : `${gunAy(g[0])} – ${gunAy(g[g.length - 1])}`; };
const sinifAd = k => { const S0 = k && SINIFLAR[k.sinif]; return S0 ? S0.ad.replace(' · ', ' ') : ''; };

// gösterilen dönemin günleri: pazartesiden başlayan hafta ya da takvim ayı
const donem = () => mod === 'ay' ? ayGunleri(secili) : TK.haftaGunleri(secili);
const sirali = l => l.slice().sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
const sayilan = d => d.durum !== 'İptal';

// Açılışta seçilen gün: bugün dersin varsa bugün; yoksa önümüzdeki 7 gündeki ilk dersin günü; o da yoksa bugün
function varsayilanGun(benim) {
  const b = gun(0);
  if (benim.some(d => d.tarih === b && sayilan(d))) return b;
  const s = sirali(benim.filter(d => d.tarih > b && sayilan(d) && fark(d.tarih) <= 7))[0];
  return s ? s.tarih : b;
}
// Hafta değişince: haftada bugün varsa bugün; yoksa haftanın ilk dersli günü; o da yoksa aynı gün adı
function haftaSec(t, benim) {
  const h = TK.haftaGunleri(t);
  if (h.includes(gun(0))) return gun(0);
  return h.find(x => benim.some(d => d.tarih === x && sayilan(d))) || t;
}
// Ay değişince: ayda bugün varsa bugün; yoksa ayın ilk dersli günü; o da yoksa ayın biri
function aySec(t, benim) {
  const g = ayGunleri(t);
  if (g.includes(gun(0))) return gun(0);
  return g.find(x => benim.some(d => d.tarih === x && sayilan(d))) || g.find(x => !kapaliGun(x)) || g[0];
}

/* ---------- ders kartı ---------- */
// Dokununca: bugünkü ve ileriki açık ders → ders menüsü; geçmişte açık kalmış ders → Gelmedi / Yapıldı; kapanmış ders → öğrenci ayrıntısı
function dersKart(d, ctx) {
  const k = kursiyer(d.kursiyer); if (!k) return '';
  const ad = esc(tamAd(k)), acik = d.durum === 'Planlandı', gecmis = d.tarih < gun(0), sira = ctx.siradaki && ctx.siradaki.id === d.id && !d.bas;
  const imzaBek = d.durum === 'Yapıldı' && d.imza && d.imza.kursiyerBekliyor;
  let [dt, ton] = ctx.P.progDurum(d); if (dt === 'Kapanmadı') dt = 'Kaydı eksik';  // Bugün ekranıyla aynı ad
  const alt = `${esc(sinifAd(k))} · ${ctx.P.dersNo(d, k)}. ders${d.durum === 'İptal' ? '' : geceCip(d)}`;
  const sag = sira ? '<span class="ox-upr-sira">Sıradaki</span>'
    : imzaBek ? cip('İmza bekliyor', 'turuncu')
    : acik && !gecmis && !d.bas ? ''
    : cip(esc(d.durum === 'İptal' ? 'İptal' : dt), ton || 'gri');
  // Izgara: saat | ad + alt satır | sağ | ›. Durum çipi adın satırında durur, alt satır ("B Manuel · 12. ders") çipin altına uzanır:
  // dar ekranda "İmza bekliyor" gibi uzun çip alt satırı kesmez. "Sıradaki" yazısı kartın ortasında durur (referans).
  const cipli = !!sag && !sira;
  const govde = `<b class="ox-upr-saat">${esc(d.saat)}</b><b class="ox-upr-ad">${ad}</b><small class="ox-upr-alt">${alt}</small>${sag ? `<span class="ox-upr-sag">${sag}</span>` : ''}`;
  const cls = `ox-upr-ders${sira || (acik && d.bas && !gecmis) ? ' sira' : ''}${d.durum === 'İptal' ? ' iptal' : ''}`;
  const ic = `ox-upr-ic${cipli ? ' cipli' : ''}`;
  if (acik && gecmis) // kapatılmamış ders: iki kısa düğme
    return `<div class="${cls} kapanmadi"><div class="ox-upr-ders-ust ${ic} okuz">${govde}</div>
      <div class="ox-upr-kapat">${dugme('Gelmedi', { 'data-gelmedi': d.id, 'aria-label': `${tamAd(k)}, ${gunAy(d.tarih)} ${d.saat}: gelmedi` }, { tur: 'cizgi', kucuk: true })}${dugme('Yapıldı', { 'data-yapildi': d.id, 'aria-label': `${tamAd(k)}, ${gunAy(d.tarih)} ${d.saat}: yapıldı` }, { tur: 'ikincil', kucuk: true })}</div></div>`;
  const attrs = acik ? `data-ders-diger="${esc(d.id)}" aria-label="${ad}, ${esc(d.saat)}${sira ? ', sıradaki ders' : d.bas ? ', derste' : ''}: ders işlemleri"`
    : `data-ogr-ac="${esc(k.id)}" aria-label="${ad}, ${esc(d.saat)}, ${esc(d.durum)}: öğrenci ayrıntısı"`;
  return `<button type="button" class="${cls} ${ic}" ${attrs}>${govde}<span class="ox-chev">${oi('sag')}</span></button>`;
}

/* ---------- takvim ---------- */
function gunHucre(t, benim, ay) {
  const n = benim.filter(d => d.tarih === t && sayilan(d)).length, kap = kapaliGun(t), dt = tarihOku(t);
  const cls = [t === secili ? 'secili' : '', t === gun(0) ? 'bugun' : '', kap ? 'kapali' : ''].filter(Boolean).join(' ');
  return `<button type="button" class="ox-upr-gun ${cls}" data-upr-gun="${t}" aria-pressed="${t === secili}" aria-label="${esc(tarihUzun(t))}${t === gun(0) ? ', bugün' : ''}${n ? ', ' + n + ' ders' : kap ? ', kurs kapalı' : ', ders yok'}">${ay ? '' : `<small>${gunKisa(t)}</small>`}<b>${dt.getDate()}</b><i class="${n ? 'var' : ''}"></i></button>`;
}
function takvimHtml(benim) {
  const dt = tarihOku(secili), ayAd = `${ayAdi(dt.getMonth(), true)} ${dt.getFullYear()}`;
  const ok = (n, et) => `<button type="button" class="ox-upr-ok" data-upr-git="${n}" aria-label="${et}">${oi(n < 0 ? 'sol' : 'sag')}</button>`;
  const modlar = sekmeler([['hafta', 'Hafta'], ['ay', 'Ay']], mod, 'data-upr-mod', 'hap');
  if (mod === 'ay') {
    const l = TK.ayGunleri(secili), ay0 = secili.slice(0, 7);
    return kart(`<div class="ox-upr-kbas ay">${ok(-1, 'Önceki ay')}<b class="ox-upr-ayad" aria-live="polite">${ayAd}</b>${ok(1, 'Sonraki ay')}<span class="ox-upr-bosluk"></span>${modlar}</div>
      <div class="ox-upr-haftagun" aria-hidden="true">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(g => `<small>${g}</small>`).join('')}</div>
      <div class="ox-upr-izgara ay">${l.map(t => t.slice(0, 7) === ay0 ? gunHucre(t, benim, true) : '<span class="ox-upr-gun-bos"></span>').join('')}</div>`, 'ox-upr-takvim ay');
  }
  return kart(`<div class="ox-upr-kbas"><button type="button" class="ox-upr-ayad" data-upr-mod="ay" aria-label="${ayAd}: ay görünümünü aç"><span>${ayAd}</span>${oi('asagi')}</button><span class="ox-upr-bosluk"></span>${modlar}</div>
    <div class="ox-upr-serit">${ok(-1, 'Önceki hafta')}<div class="ox-upr-izgara">${TK.haftaGunleri(secili).map(t => gunHucre(t, benim, false)).join('')}</div>${ok(1, 'Sonraki hafta')}</div>`, 'ox-upr-takvim');
}

/* ---------- ekran ---------- */
export function ekran(ctx) {
  const benim = ctx.benim;
  if (!secili) secili = varsayilanGun(benim);
  const gunler = donem(), set = new Set(gunler), bugunIcinde = set.has(gun(0));
  const donemDers = benim.filter(d => set.has(d.tarih) && sayilan(d)).length;
  const gunun = sirali(benim.filter(d => d.tarih === secili));
  const gununSayi = gunun.filter(sayilan).length;

  const ileri = sirali(benim.filter(d => d.tarih > secili && d.tarih >= gun(0) && d.durum === 'Planlandı'))[0];
  let govde;
  if (gunun.length) govde = gunun.map(d => dersKart(d, ctx)).join('');
  else {
    const kap = kapaliGun(secili);
    const baslik = kap ? (kap === 'Pazar' ? 'Pazar günü kurs kapalı' : 'Resmî tatil, kurs kapalı') : !donemDers ? (mod === 'ay' ? 'Bu ay dersin yok' : 'Bu hafta dersin yok') : 'Bu gün dersin yok';
    const alt = ileri ? `Sıradaki dersin: ${esc(gunBaslik(ileri.tarih))}, ${esc(ileri.saat)}` : kap ? '' : secili < gun(0) ? 'Bu günde ders yapılmamış.' : 'Kurs sana ders planlayınca burada görünür.';
    const dg = ileri ? dugme('Sıradaki derse git', { 'data-upr-gun': ileri.tarih }, { tur: 'ikincil', kucuk: true })
      : !bugunIcinde ? dugme('Bugüne dön', { 'data-upr-bugun': true }, { tur: 'ikincil', kucuk: true }) : '';
    govde = kart(bos('takvim', baslik, alt, dg), 'ox-upr-bos');
  }

  // Hafta: bugün "Günün dersleri", başka gün "Yarın, 17 Kasım" (öğrencinin Programım'ı gibi); ay: "16 Kasım" (sema-14)
  const baslik = mod === 'ay' ? esc(gunAy(secili)) : secili === gun(0) ? 'Günün dersleri' : esc(gunBaslik(secili));
  const dip = mod === 'ay'
    ? `${ayAdi(tarihOku(secili).getMonth(), true)} ayında ${donemDers} ders`
    : bugunIcinde ? `Bu hafta ${donemDers} ders` : `${aralikMetin(gunler)} · ${donemDers} ders`;
  const bosDonem = !gunun.length && !ileri && !bugunIcinde; // boş kartta zaten "Bugüne dön" var
  const html = `<div class="ox-upr">`
    // Ay görünümünde indirme alttaki "Excel olarak indir" düğmesindedir (sema-14); üstteki bağlantı yerini korur, başlık kaymaz
    + sayfaBas('Program', '', mod === 'ay'
      ? `<span class="ox-bag ox-upr-indir gizli" aria-hidden="true">${oi('indir')}<span>İndir</span></span>`
      : `<button type="button" class="ox-bag ox-upr-indir" data-prog-indir aria-label="Haftanın programını Excel olarak indir">${oi('indir')}<span>İndir</span></button>`)
    + takvimHtml(benim)
    + `<div class="ox-bolum ox-upr-gun-bas"><h2>${baslik}</h2>${gununSayi ? `<span class="ox-bolum-sag">${gununSayi} ders</span>` : ''}</div>`
    + `<div class="ox-upr-dersler">${govde}</div>`
    + `<div class="ox-upr-dip"><span>${donemDers ? dip : dip.replace(/ 0 ders$/, ' ders yok').replace(' · ders yok', ': ders yok')}</span>${bugunIcinde || bosDonem ? '' : `<button type="button" class="ox-bag" data-upr-bugun>Bugüne dön</button>`}</div>`
    + (mod === 'ay' && donemDers ? `<div class="ox-upr-excel">${dugme('Excel olarak indir', { 'data-prog-indir': true }, { tur: 'ikincil', genis: true, ikon: 'indir' })}</div>` : '')
    + `</div>`;

  return {
    html,
    baglan(kap) {
      // İndir: gösterilen dönem burada üretilir; yönlendiricideki genel işleyiciye (eski dönem) düşmesin
      kap.querySelectorAll('[data-prog-indir]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); indir(ctx); }));
      kap.addEventListener('click', ev => {
        const t = ev.target;
        const g = t.closest('[data-upr-gun]'); if (g) { if (g.dataset.uprGun !== secili) { secili = g.dataset.uprGun; ctx.yenile(); } return; }
        const m = t.closest('[data-upr-mod]'); if (m) { if (m.dataset.uprMod !== mod) { mod = m.dataset.uprMod; ctx.yenile(); } return; }
        const gt = t.closest('[data-upr-git]'); if (gt) { const n = +gt.dataset.uprGit; secili = mod === 'ay' ? aySec(ayKaydir(secili, n), benim) : haftaSec(ekleGun(secili, 7 * n), benim); ctx.yenile(); return; }
        if (t.closest('[data-upr-bugun]')) { secili = gun(0); ctx.yenile(); }
      });
    },
  };
}
export const sifirla = () => { mod = 'hafta'; secili = null; };

/* ---------- Excel ---------- */
// Gösterilen dönemin dersleri (eski progIndir ile aynı sütunlar; telefon ve kimlik bilgisi yok)
async function indir(ctx) {
  const gunler = donem(), set = new Set(gunler), eg = ctx.eg;
  const l = sirali(S.dersler.filter(d => d.egitmen === eg.id && set.has(d.tarih)));
  if (!l.length) return bildir(mod === 'ay' ? 'Bu ay ders yok' : 'Bu hafta ders yok', 'uyari');
  const sat = [['Tarih', 'Gün', 'Saat', 'Öğrenci', 'Sınıf', 'Ders no', 'Araç', 'Durum', 'Süre (dk)'], ...l.map(d => {
    const k = kursiyer(d.kursiyer), a = d.arac && arac(d.arac);
    return [d.tarih.split('-').reverse().join('.'), gunKisa(d.tarih), d.saat, k ? tamAd(k) : '', k ? SINIFLAR[k.sinif].ad : '', k ? ctx.P.dersNo(d, k) : '', a ? a.plaka : '', ctx.P.progDurum(d)[0], d.sure != null ? d.sure : ''];
  })];
  const ad = 'ders-programi-' + gunler[0] + '_' + gunler[gunler.length - 1];
  const metin = mod === 'ay' ? `${ayAdi(tarihOku(secili).getMonth(), true)} ${tarihOku(secili).getFullYear()}` : aralikMetin(gunler);
  try {
    await import('../sayfalar5.js?v=215').then(m => m.xlsxYukle());
    const X = window.XLSX, ws = X.utils.aoa_to_sheet(sat), wb = X.utils.book_new();
    ws['!cols'] = [12, 6, 7, 24, 14, 8, 12, 11, 9].map(w => ({ wch: w })); ws['!autofilter'] = { ref: 'A1:I' + sat.length };
    X.utils.book_append_sheet(wb, ws, 'Program'); X.writeFile(wb, ad + '.xlsx');
  } catch (x) { csvIndir(ad + '.csv', sat); }
  bildir(metin + ' programı indirildi');
}

/* ---------- stiller ---------- */
stilEkle('ox-uprogram', `
.ox-upr .ox-sayfa-bas{align-items:center}
.ox-upr-indir{min-height:44px;padding:0 2px;font-size:16px;font-weight:600}
.ox-upr-indir::after{inset:0 -8px}
.ox-upr-indir .ox-i{width:21px;height:21px;stroke-width:2}
.ox-upr-indir.gizli{visibility:hidden}

/* takvim kartı */
.ox-upr-takvim{padding:10px 4px 10px}
.ox-upr-kbas{display:flex;align-items:center;gap:4px;min-height:44px;padding:0 8px 0 12px}
.ox-upr-bosluk{flex:1;min-width:4px}
.ox-upr-ayad{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--ox-bas);white-space:nowrap;border-radius:10px}
.ox-upr-ayad .ox-i{width:20px;height:20px;stroke-width:2.2}
.ox-upr-kbas .ox-sekmeler.hap{flex:none;width:132px;margin:0}
.ox-upr-kbas .ox-sekmeler.hap button{min-height:34px;font-size:15px}
.ox-upr-kbas.ay{padding-left:2px}
.ox-upr-kbas.ay .ox-upr-ayad{flex:none;padding:0 2px}
.ox-upr-ok{position:relative;flex:none;display:grid;place-items:center;width:30px;height:44px;border-radius:10px;color:var(--ox-bas)}
.ox-upr-ok .ox-i{width:20px;height:20px;stroke-width:2.2}
.ox-upr-ok:active{background:var(--ox-gri-acik)}
.ox-upr-serit .ox-upr-ok::after{content:"";position:absolute;inset:0 -6px}
.ox-upr-serit{display:flex;align-items:center;gap:0;margin-top:8px}
.ox-upr-serit .ox-upr-izgara{flex:1;min-width:0}

/* hafta şeridi / ay ızgarası (öğrencinin Programım şeridiyle aynı) */
.ox-upr-izgara{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}
.ox-upr-gun{position:relative;display:grid;justify-items:center;align-content:start;height:60px;padding-top:4px;border-radius:12px;font-variant-numeric:tabular-nums;transition:background-color .15s}
.ox-upr-gun small{font-size:13px;line-height:16px;font-weight:500;color:var(--ox-ikincil)}
.ox-upr-gun b{margin-top:1px;font-size:17px;line-height:22px;font-weight:600;color:#5d6783}
.ox-upr-gun i{display:block;width:5px;height:5px;border-radius:50%;margin-top:4px}
.ox-upr-gun i.var{background:var(--ox-mavi)}
.ox-upr-gun.kapali b{color:var(--ox-soluk)}
.ox-upr-gun.bugun b{color:var(--ox-mavi)}
.ox-upr-gun:active{background:var(--ox-gri-acik)}
.ox-upr-gun.secili{background:var(--ox-mavi);box-shadow:0 4px 12px -4px rgba(10,102,242,.45)}
.ox-upr-gun.secili small,.ox-upr-gun.secili b{color:#fff}
.ox-upr-gun.secili i.var{background:#fff}
.ox-upr-haftagun{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;margin:6px 0 2px;text-align:center}
.ox-upr-haftagun small{font-size:13px;line-height:24px;font-weight:500;color:var(--ox-soluk)}
.ox-upr-izgara.ay .ox-upr-gun{height:46px;align-content:center;padding-top:3px}
.ox-upr-izgara.ay .ox-upr-gun b{font-size:16px;line-height:20px}
.ox-upr-izgara.ay .ox-upr-gun i{margin-top:3px}

/* günün başlığı ve ders kartları */
.ox-upr-gun-bas{margin:28px 0 12px}
.ox-upr-gun-bas .ox-bolum-sag{font-weight:500}
.ox-upr-ders{position:relative;width:100%;min-height:62px;padding:9px 10px 9px 16px;text-align:left;background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:var(--ox-r);box-shadow:var(--ox-golge);transition:transform .12s}
.ox-upr-ic{display:grid;grid-template-columns:66px minmax(0,1fr) auto 34px;grid-template-rows:auto auto;align-items:center;row-gap:2px}
.ox-upr-ic.okuz{grid-template-columns:66px minmax(0,1fr) auto}
.ox-upr-ic>.ox-upr-saat{grid-row:1/3;grid-column:1}
.ox-upr-ic>.ox-upr-ad{grid-row:1;grid-column:2;align-self:end}
.ox-upr-ic>.ox-upr-alt{grid-row:2;grid-column:2;align-self:start}
.ox-upr-ic>.ox-upr-sag{grid-row:1/3;grid-column:3;margin-left:12px}
.ox-upr-ic>.ox-chev{grid-row:1/3;grid-column:4;justify-self:end}
.ox-upr-ic.cipli>.ox-upr-ad{align-self:center}
.ox-upr-ic.cipli>.ox-upr-alt{grid-column:2/4}
.ox-upr-ic.cipli>.ox-upr-sag{grid-row:1;margin-block:-2px}
.ox-upr-ders+.ox-upr-ders{margin-top:12px}
button.ox-upr-ders:active{transform:scale(.985)}
.ox-upr-ders.sira{background:radial-gradient(62% 120% at 100% 0%,var(--ox-hero) 0%,color-mix(in srgb,var(--ox-hero) 45%,var(--ox-kart)) 45%,var(--ox-kart) 100%);border-color:#cfe0fa}
.ox-upr-saat{font-size:18px;line-height:1.2;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-upr-ad,.ox-upr-alt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-upr-ad{font-size:16px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-upr-alt{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-upr-sag{display:flex;align-items:center}
.ox-upr-sira{font-size:15px;font-weight:600;color:var(--ox-mavi)}
.ox-upr-ders .ox-cip{height:24px;padding:0 10px;font-size:12.5px}
.ox-upr-ders.iptal .ox-upr-saat,.ox-upr-ders.iptal .ox-upr-ad,.ox-upr-ders.iptal .ox-upr-alt{color:var(--ox-soluk)}
.ox-upr-ders.kapanmadi{padding:11px 14px 12px 16px}
.ox-upr-ders-ust{min-height:44px}
.ox-upr-kapat{display:flex;justify-content:flex-end;gap:8px;margin-top:10px;padding-top:12px;border-top:1px solid var(--ox-ayrac)}
.ox-upr-kapat .ox-dg{flex:1;max-width:150px}
.ox-upr-bos .ox-bos{padding:24px 20px}
.ox-upr-dip{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;margin-top:12px;font-size:15px;color:var(--ox-ikincil)}
.ox-upr-dip .ox-bag{min-height:44px;font-size:15px}
.ox-upr-excel{margin-top:8px}
`);
stilEkle('ox-upr-dar', `@media (max-width:400px){.ox-upr-ad,.ox-upr-alt{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}}
.ox-upr-kbas .ox-sekmeler.hap button{min-height:38px}`);
