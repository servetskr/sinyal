// Ödeme sekmesi (yeni tasarım): kalan borç, sıradaki taksit, ödeme planı; taksit ayrıntısı (makbuz, ödeme yolu),
// peşinat ve ek ücretler, makbuzlar ve hesap dökümü. Eski js/ogrenci.js odemelerHtml/dokumTablo/hesapDokumu işlevlerinin yerini alır.
// "Nasıl öderim?" düğmesi taksit ayrıntısını açar: eski portal.js odemeYap() penceresindeki IBAN, ödeme kodu ve dekont gönderme orada, yeni düzende.
import { S, SINIFLAR, tarihOku, fark, gun, tamAd, odenen, kalanBorc, ekToplam, ibanlar, ibanBicim, odemeKodu } from '../veri.js?v=235';
import { ayAdi } from '../ui.js?v=235';
import { kursaYaz } from '../ozellik.js?v=235';
import { ekTur } from '../veri.js?v=235';
import { kursOzet, kursEkleri, kursUcretiAdi, odemeNotu, RESMI_METIN } from '../ogrenci.js?v=235';
import { esc, oi, tl, sayfaBas, geri, bolum, kart, dugme, liste, satir, ikonKutu, cip, serit, not, bos, stilEkle } from './ui.js?v=235';

let gorunum = 'ana'; // 'ana' | 'diger' | 't:<taksit-i>'

/* ---------- yardımcılar ---------- */
const gunAy = s => { if (!s || typeof s !== 'string') return '—'; const d = tarihOku(s); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };
const yuzde = (od, top) => { const o = top > 0 ? Math.max(0, Math.min(100, od / top * 100)) : 100; return { o, metin: '%' + o.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) }; };
const pesinatMi = t => t.aciklama === 'Peşinat';
// taksit adı: listenin başındaki "Peşinat" taksit sayılmaz (eski taksitAd ile aynı kural)
const taksitNo = (k, i) => { const l = k.odeme.taksitler; return i + 1 - (l[0] && pesinatMi(l[0]) ? 1 : 0); };
const taksitAd = (k, i) => pesinatMi(k.odeme.taksitler[i]) ? 'Peşinat' : taksitNo(k, i) + '. taksit';
const kalanT = t => Math.max(0, t.tutar - (t.kismi || 0));
const odemeGunu = t => typeof t.odendi === 'string' ? t.odendi : t.vade;
const sonraki = k => k.odeme.taksitler.map((t, i) => ({ t, i })).find(x => !x.t.odendi && !x.t.iptal);
// vadesi bir hafta içindeyse kısa hatırlatma (eski ekrandaki "3 gün sonra" bilgisi)
const yakin = v => { if (!v) return ''; const f = fark(v); return f < 0 || f > 7 ? '' : `<p class="ox-ode-sira-not">${f === 0 ? 'Vadesi bugün.' : f === 1 ? 'Vadesi yarın.' : `Vadesine ${f} gün kaldı.`}</p>`; };
const gecikti = t => !t.odendi && !t.iptal && t.vade && fark(t.vade) < 0;
const makbuzlar = k => (S.hareket || []).filter(h => h.kursiyer === k.id && h.tur === 'Gelir').sort((a, b) => String(b.tarih).localeCompare(String(a.tarih)));
// bir taksitin makbuzları: tahsilat dağılımı → açıklamadaki taksit no → tarih ve tutar eşleşmesi
function taksitMakbuz(k, i) {
  const t = k.odeme.taksitler[i], hs = makbuzlar(k), no = i + 1;
  const d = hs.filter(h => Array.isArray(h.dagilim) && h.dagilim.some(x => x.i === i));
  if (d.length) return d;
  const re = new RegExp('(^|\\D)' + no + '\\. taksit');
  const a = hs.filter(h => !h.dagilim && re.test(h.aciklama || ''));
  if (a.length) return a;
  return hs.filter(h => t.odendi && h.tarih === odemeGunu(t) && h.tutar === t.tutar);
}

/* ---------- parçalar ---------- */
const durumDaire = (tur, icerik = '') => `<span class="ox-ode-d ${tur}" aria-hidden="true">${tur === 'odendi' ? oi('tik') : icerik}</span>`;
const fisSimge = () => `<span class="ox-ode-fis" aria-hidden="true">${oi('fis')}</span>`;

/* ---------- ana ekran ---------- */
function heroHtml(k) {
  // kurs borcu: resmî masraflar (sınav ücreti, harç, kart) kurs ücretine dahil değil, burada sayılmaz (il taban listesi not 5)
  const oz = kursOzet(k), toplam = oz.toplam, od = oz.odenen, kalan = oz.kalan, y = yuzde(od, toplam);
  return `<section class="ox-hero ox-ode-hero"><p class="ox-hero-ust">Kalan borcun</p><p class="ox-ode-tutar${kalan ? '' : ' tamam'}">${tl(kalan)}</p>
    <div class="ox-ode-ilerleme">${serit(y.o, kalan ? 'mavi' : 'yesil')}<span>${y.metin}</span></div>
    <div class="ox-ode-iki"><div><small>Ödenen</small><b>${tl(od)}</b></div><div><small>Toplam</small><b>${tl(toplam)}</b></div></div></section>`;
}

function siradakiHtml(k) {
  const sn = sonraki(k);
  if (!sn) {
    const kalan = kursOzet(k).kalan;
    if (kalan > 0) {
      const ekAcik = kursEkleri(k).filter(x => !x.odendi).map(x => esc(x.ad));
      return kart(`<div class="ox-ode-sira-bas"><b>Kalan ödemen</b><span>${ekAcik.length ? 'Ek ücret' : ''}</span></div>
        <div class="ox-ode-sira-orta ad"><b>${ekAcik.length ? ekAcik.join(', ') : 'Kalan tutar'}</b><b>${tl(kalan)}</b></div>
        <p class="ox-ode-sira-not">Kursta kartla ya da havale/EFT ile ödeyebilirsin.</p>
        <button type="button" class="ox-dg ox-dg-ana genis ox-ode-dg" data-ox-ode-yaz=""><span>Kursa sor</span>${oi('ok')}</button>`, 'ox-ode-sira');
    }
    const son = k.odeme.taksitler.filter(t => t.odendi).map(odemeGunu).sort().pop() || k.odeme.pesinTarih;
    return kart(`<div class="ox-ode-tamam">${ikonKutu('tik', 'yesil')}<span><b>Tüm ödemelerin tamam</b>${son ? `<small>Son ödeme ${gunAy(son)}</small>` : ''}</span></div>`, 'ox-ode-sira');
  }
  const t = sn.t, g = gecikti(t), kismi = t.kismi || 0;
  return kart(`<div class="ox-ode-sira-bas"><b>Sıradaki taksit</b><span>${g ? cip(oi('uyari') + 'Gecikti', 'kirmizi') : ''}${taksitAd(k, sn.i)}</span></div>
    <div class="ox-ode-sira-orta${g ? ' gec' : ''}"><b>${gunAy(t.vade)}</b><b>${tl(kalanT(t))}</b></div>
    ${kismi ? `<p class="ox-ode-sira-not">${tl(kismi)} ödendi · taksit ${tl(t.tutar)}</p>` : g ? `<p class="ox-ode-sira-not gec">Vadesi ${-fark(t.vade)} gün geçti.</p>` : yakin(t.vade)}
    <button type="button" class="ox-dg ox-dg-ana genis ox-ode-dg" data-ox-ode="t:${sn.i}"><span>Nasıl öderim?</span>${oi('ok')}</button>`, 'ox-ode-sira' + (g ? ' gec' : ''));
}

function planSatir(k, t, i, siraI) {
  const no = taksitNo(k, i), g = gecikti(t), sira = i === siraI;
  const tur = t.odendi ? 'odendi' : t.iptal ? 'iptal' : g ? 'gec' : sira ? 'sira' : '';
  const ek = t.odendi ? 'Ödendi' : t.iptal ? 'İptal edildi' : g ? 'Gecikti' : sira ? 'Sıradaki' : '';
  const kismi = !t.odendi && !t.iptal && t.kismi ? (ek ? ' · kısmi' : ` · ${tl(t.kismi)} ödendi`) : '';
  return satir({
    sol: durumDaire(tur, pesinatMi(t) ? 'P' : no),
    baslik: taksitAd(k, i),
    alt: gunAy(t.vade) + (ek ? ' · ' + ek : '') + kismi,
    altTon: g ? 'kirmizi' : sira ? 'mavi' : '',
    sag: `<span class="ox-ode-t${t.iptal ? ' iptal' : ''}">${tl(t.tutar)}</span>`,
    attrs: { 'data-ox-ode': 't:' + i, 'aria-label': `${taksitAd(k, i)}, ${gunAy(t.vade)}${ek ? ', ' + ek : ''}, ${tl(t.tutar)}` },
    cls: 'ox-ode-satir',
  });
}

function planHtml(k) {
  const l = k.odeme.taksitler, sn = sonraki(k), siraI = sn ? sn.i : -1;
  const satirlar = l.map((t, i) => ({ t, i })).filter(x => !pesinatMi(x.t)).map(x => planSatir(k, x.t, x.i, siraI));
  const taksitVar = satirlar.length > 0;
  // taksit yoksa (peşin ödeme) plan tek satır: peşin ödeme
  if (!taksitVar) {
    if (k.odeme.pesin) satirlar.push(satir({ sol: durumDaire('odendi'), baslik: 'Peşin ödeme', alt: gunAy(k.odeme.pesinTarih) + ' · Ödendi', sag: `<span class="ox-ode-t">${tl(k.odeme.pesin)}</span>`, attrs: { 'data-ox-ode': 'diger' }, cls: 'ox-ode-satir' }));
    l.forEach((t, i) => { if (pesinatMi(t)) satirlar.push(planSatir(k, t, i, siraI)); });
  }
  const ekler = kursEkleri(k).map(x => x.ad);
  const parca = [taksitVar && (k.odeme.pesin || l.some(pesinatMi)) ? 'Peşinat' : '', ...ekler, kursOzet(k).resmi.length ? 'Resmî masrafların' : ''].filter(Boolean);
  const dBas = parca[0] === 'Peşinat' ? 'Peşinat ve diğer ödemeler' : parca.length ? 'Diğer ödemeler' : 'Makbuzlar ve hesap dökümü';
  const dAlt = parca.length ? parca.map(esc).join(' · ') : 'Ödediğin her tutar kalem kalem';
  return bolum('Ödeme planın')
    + (satirlar.length ? liste(satirlar, 'ox-ode-plan') : kart(bos('kart', 'Ödeme planı yok', 'Ücret ve taksitlerin kursta belirlenince burada görünür.'), 'ox-ode-bos'))
    + liste([satir({ sol: fisSimge(), baslik: dBas, alt: dAlt, attrs: { 'data-ox-ode': 'diger' }, cls: 'ox-ode-satir' })], 'ox-ode-diger')
    + not('Tutarlar KDV dahildir.');
}

const anaHtml = k => sayfaBas('Ödeme', 'Ödemelerin tek yerde.') + heroHtml(k) + siradakiHtml(k) + planHtml(k);

/* ---------- ödeme yolu (IBAN, ödeme kodu, dekont) ---------- */
function odemeYoluHtml(k, i) {
  const h = ibanlar(), kod = odemeKodu(k);
  const kopya = (attr, deger, etiket) => `<button type="button" class="ox-ode-kopya" ${attr}="${esc(deger)}" aria-label="${etiket}">${oi('pano')}<span>Kopyala</span></button>`;
  if (!h.length) {
    return bolum('Nasıl öderim?') + not('Ödemeyi kursta kartla ya da kursun banka hesabına havale/EFT ile yapabilirsin. Banka bilgisini kursa sor.')
      + `<div class="ox-ode-alt-dg">${dugme('Kursa sor', { 'data-ox-ode-yaz': i }, { tur: 'ana', genis: true, ikon: 'wp' })}</div>`;
  }
  const blok = (bas, deger, alt, dg) => `<div class="ox-ode-hesap"><div class="ox-ode-hesap-bas"><b>${bas}</b>${dg}</div><p class="ox-ode-iban">${deger}</p>${alt.map(a => `<small>${a}</small>`).join('')}</div>`;
  const satirlar = h.map(x => {
    const kim = [x.banka, x.alici || S.kurs.ad].filter(Boolean).join(' · ');
    return blok(esc(x.ad || 'Havale / EFT'), esc(ibanBicim(x.iban)), [kim && esc(kim), x.not && esc(x.not)].filter(Boolean), kopya('data-og-iban', x.iban, 'IBAN’ı kopyala'));
  });
  satirlar.push(blok('Ödeme kodun', esc(kod), ['Havale açıklamasına yaz'], kopya('data-og-kod', kod, 'Ödeme kodunu kopyala')));
  return bolum('Nasıl öderim?') + liste(satirlar)
    + not('Başkası yatırsa da ödeme kodu sayesinde ödemenin sana ait olduğu anlaşılır. Ödemen kursa ulaşınca makbuzun burada görünür.')
    + `<div class="ox-ode-alt-dg">${dugme('Dekontu gönder', { 'data-ox-ode-yaz': i }, { tur: 'ana', genis: true, ikon: 'wp' })}</div>`;
}

const makbuzSatir = h => satir({
  sol: fisSimge(), baslik: tl(h.tutar),
  alt: esc([gunAy(h.tarih), h.yontem, h.no].filter(Boolean).join(' · ')),
  attrs: { 'data-og-makbuz': h.id, 'aria-label': `${tl(h.tutar)} makbuzu, ${gunAy(h.tarih)}` }, cls: 'ox-ode-satir',
});

/* ---------- taksit ayrıntısı ---------- */
function taksitHtml(k, i) {
  const t = k.odeme.taksitler[i], sn = sonraki(k), g = gecikti(t), sira = sn && sn.i === i;
  const durum = t.odendi ? `${gunAy(odemeGunu(t))} tarihinde ödendi.` : t.iptal ? 'Bu taksit iptal edildi.' : g ? `Vadesi ${-fark(t.vade)} gün geçti.` : sira ? 'Sıradaki taksitin.' : 'Henüz vadesi gelmedi.';
  const kv = [['Tutar', tl(t.tutar)], ['Vade', gunAy(t.vade)]];
  if (t.odendi) { kv.push(['Ödeme tarihi', gunAy(odemeGunu(t))]); if (t.yontem) kv.push(['Ödeme şekli', esc(t.yontem)]); }
  else if (!t.iptal && t.kismi) { kv.push(['Ödenen', tl(t.kismi)]); kv.push(['Kalan', tl(kalanT(t))]); }
  const rozetH = t.odendi ? cip(oi('tik') + 'Ödendi', 'yesil') : t.iptal ? cip('İptal', 'gri') : g ? cip(oi('uyari') + 'Gecikti', 'kirmizi') : sira ? cip('Sıradaki', 'mavi') : cip('Bekliyor', 'gri');
  let alt = '';
  if (t.odendi) {
    const m = taksitMakbuz(k, i);
    alt = bolum('Makbuz') + (m.length ? liste(m.map(makbuzSatir)) : not('Bu ödemenin makbuzu kursta düzenlendi. Örneği gerekirse kursa yaz.'));
  } else if (!t.iptal) alt = odemeYoluHtml(k, i);
  return geri('Ödeme', { 'data-ox-ode': 'ana' })
    + sayfaBas(taksitAd(k, i), durum)
    + kart(`<div class="ox-ode-kv-bas">${rozetH}</div>${kv.map(([a, b]) => `<div class="ox-ode-kv"><span>${a}</span><b>${b}</b></div>`).join('')}`, 'ox-ode-ozet' + (g ? ' gec' : ''))
    + alt;
}

/* ---------- peşinat, ek ücretler, makbuzlar, hesap dökümü ---------- */
// eski dokumTablo ile aynı satırlar: kurs ücreti, ek kalemler, ödemeler ve iade; yürüyen bakiyeyle
function dokumSatirlari(k) {
  // resmî masraflar kurs hesabına girmez (Resmî masrafların bölümünde ayrı); son satırın kalanı kurs borcudur
  const o = k.odeme, l = [[k.kayit, kursUcretiAdi(k), o.toplam, 0]], ekler = kursEkleri(k);
  ekler.forEach(x => l.push([x.tarih || k.kayit, x.ad, x.tutar, 0]));
  if (o.pesin) l.push([o.pesinTarih || k.kayit, 'Peşinat ödendi', 0, o.pesin]);
  o.taksitler.forEach((t, i) => { const ad = pesinatMi(t) ? 'Peşinat' : (t.aciklama || taksitAd(k, i)); if (t.odendi) l.push([odemeGunu(t), ad + ' ödendi', 0, t.tutar]); else if (t.kismi) l.push([t.vade, ad + ' · kısmi ödeme', 0, t.kismi]); });
  ekler.filter(x => x.odendi).forEach(x => l.push([x.odendi === true ? (x.tarih || k.kayit) : x.odendi, x.ad + ' ödendi', 0, x.tutar]));
  if (o.iade) l.push([o.iadeTarih || gun(0), 'İade', 0, -o.iade]);
  l.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || (b[2] ? 1 : 0) - (a[2] ? 1 : 0));
  let b = 0;
  return l.map(([t, ad, borc, od]) => { b += borc - od; return { t, ad, borc, od, kalan: Math.max(0, b) }; });
}

function digerHtml(k) {
  const o = k.odeme, ekS = [];
  if (o.pesin) ekS.push(satir({ sol: durumDaire('odendi'), baslik: o.taksitler.some(t => !pesinatMi(t)) ? 'Peşinat' : 'Peşin ödeme', alt: gunAy(o.pesinTarih) + ' · Ödendi', sag: `<span class="ox-ode-t">${tl(o.pesin)}</span>`, ok: false, cls: 'ox-ode-satir' }));
  o.taksitler.forEach((t, i) => { if (pesinatMi(t)) ekS.push(planSatir(k, t, i, -1)); });
  const ekSatir = (x, bekler) => satir({
    sol: x.odendi ? durumDaire('odendi') : durumDaire('', '+'), baslik: esc(x.ad),
    alt: x.odendi ? (typeof x.odendi === 'string' ? gunAy(x.odendi) + ' · ' : '') + 'Ödendi' : bekler,
    sag: `<span class="ox-ode-t">${tl(x.tutar)}</span>`, ok: false, cls: 'ox-ode-satir',
  });
  kursEkleri(k).forEach(x => ekS.push(ekSatir(x, ekTur(x) === 'ders' ? 'İlave direksiyon dersi · kursta ödenir' : 'Ek ücret · kursta ödenir')));
  const res = kursOzet(k).resmi;
  const m = makbuzlar(k), d = dokumSatirlari(k);
  return geri('Ödeme', { 'data-ox-ode': 'ana' })
    + sayfaBas('Diğer ödemeler', 'Peşinat, ek ücretler ve makbuzların.')
    + (ekS.length ? bolum('Peşinat ve ek ücretler') + liste(ekS) : '')
    + (res.length ? bolum('Resmî masrafların') + liste(res.map(x => ekSatir(x, 'Senin masrafın'))) + not(RESMI_METIN) : '')
    + bolum('Makbuzların', m.length ? m.length + ' ödeme' : '')
    + (m.length ? liste(m.map(makbuzSatir)) : kart(bos('fis', 'Henüz makbuz yok', 'Ödeme yapınca makbuzun burada görünür.'), 'ox-ode-bos'))
    + bolum('Hesap dökümün')
    + liste(d.map(x => satir({
      baslik: esc(x.ad), alt: `${gunAy(x.t)} · Kalan ${tl(x.kalan)}`,
      sag: x.borc ? `<span class="ox-ode-t">${tl(x.borc)}</span>` : `<span class="ox-ode-t ${x.od < 0 ? 'iade' : 'od'}">${x.od < 0 ? '−' + tl(-x.od) : '+' + tl(x.od)}</span>`,
      ok: false, cls: 'ox-ode-satir ox-ode-dokum',
    })))
    + not(odemeNotu())
    + `<button type="button" class="ox-ode-yaz" data-ox-ode-yaz="">${oi('mesaj')}<span>Ödemenle ilgili kursa yaz</span></button>`;
}

/* ---------- ekran ---------- */
export function ekran(ctx) {
  const { k } = ctx;
  if (!k || !k.odeme || !Array.isArray(k.odeme.taksitler)) return null;
  let html;
  const ti = /^t:(\d+)$/.exec(gorunum);
  if (ti && k.odeme.taksitler[+ti[1]]) html = taksitHtml(k, +ti[1]);
  else if (gorunum === 'diger') html = digerHtml(k);
  else { gorunum = 'ana'; html = anaHtml(k); }
  return {
    html,
    baglan(kap) {
      kap.addEventListener('click', ev => {
        const g = ev.target.closest('[data-ox-ode]'); if (g) { gorunum = g.dataset.oxOde; ctx.yenile(true); return; }
        const w = ev.target.closest('[data-ox-ode-yaz]'); if (!w) return;
        const i = w.dataset.oxOdeYaz, t = i !== '' ? k.odeme.taksitler[+i] : null, kod = odemeKodu(k);
        const metin = !t ? `Merhaba, ben ${tamAd(k)}. Ödememle ilgili bir sorum var.`
          : ibanlar().length ? `Merhaba, ben ${tamAd(k)}. ${taksitAd(k, +i)} (${tl(kalanT(t))}) ödemesini havale/EFT ile yaptım (ödeme kodu ${kod}); dekontu gönderiyorum.`
            : `Merhaba, ben ${tamAd(k)}. ${taksitAd(k, +i)} (${tl(kalanT(t))}) ödemesini yapmak istiyorum; banka bilgisini paylaşır mısınız?`;
        kursaYaz(k, 'odeme', metin);
      });
    },
  };
}

stilEkle('ox-odeme', `
.ox-ode-hero{padding:12px 20px 16px}
.ox-ode-hero .ox-hero-ust{margin-bottom:2px;line-height:1.25}
.ox-ode-tutar{font-size:36px;line-height:1.1;font-weight:800;letter-spacing:-.03em;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-ode-tutar.tamam{color:var(--ox-yesil)}
.ox-ode-ilerleme{display:flex;align-items:center;gap:12px;margin-top:6px}
.ox-ode-ilerleme .ox-serit{flex:1;height:11px;background:#d9e2ee}
.ox-ode-ilerleme span{flex:none;font-size:15px;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-ode-iki{display:grid;grid-template-columns:1fr 1fr;margin-top:12px}
.ox-ode-iki>div{display:grid;gap:0;min-width:0}
.ox-ode-iki>div+div{position:relative;padding-left:26px}
.ox-ode-iki>div+div::before{content:"";position:absolute;left:0;top:3px;bottom:3px;border-left:1px solid #cad8ec}
.ox-ode-iki small{font-size:14.5px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ode-iki b{font-size:18.5px;line-height:1.2;font-weight:600;letter-spacing:-.01em;color:var(--ox-bas);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-ode-hero+.ox-kart{margin-top:16px}
.ox-ode-sira{padding:11px 16px 10px}
.ox-ode-sira.gec{border-color:#f5c2c4}
.ox-ode-sira-bas{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:30px;padding-bottom:8px;border-bottom:1px solid var(--ox-ayrac)}
.ox-ode-sira-bas b{font-size:17px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-ode-sira-bas>span{display:flex;align-items:center;gap:8px;flex:none;font-size:15px;color:var(--ox-ikincil);white-space:nowrap}
.ox-ode-sira-bas .ox-cip .ox-i,.ox-ode-kv-bas .ox-cip .ox-i{width:15px;height:15px;stroke-width:2.2}
.ox-ode-sira-orta{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:5px 0 0}
.ox-ode-sira-orta b{font-size:24px;line-height:1.2;font-weight:700;letter-spacing:-.022em;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-ode-sira-orta b:last-child{white-space:nowrap}
.ox-ode-sira-orta.gec b:first-child{color:var(--ox-kirmizi)}
.ox-ode-sira-orta.ad{align-items:center}
.ox-ode-sira-orta.ad b:first-child{min-width:0;font-size:17px;line-height:1.3;font-weight:600;letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ox-ode-diger .ox-satir-govde small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ox-ode-sira-not{margin-top:4px;font-size:14px;color:var(--ox-ikincil)}
.ox-ode-sira-not.gec{color:var(--ox-kirmizi)}
.ox-ode-dg.genis{width:calc(100% + 12px);margin:14px -6px 0;min-height:44px}
.ox-ode-dg span{flex:1;text-align:center;padding-left:21px}
.ox-ode-tamam{display:flex;align-items:center;gap:14px}
.ox-ode-tamam span{display:grid;gap:2px;min-width:0}
.ox-ode-tamam b{font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-ode-tamam small{font-size:14px;color:var(--ox-ikincil)}
.ox-ode-sira:has(.ox-ode-tamam){padding:14px 16px}
.ox-ode-d{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1.6px solid #ccd3df;background:#fff;font-size:14.5px;font-weight:700;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-ode-d.odendi{border-color:transparent;background:var(--ox-yesil-acik);color:var(--ox-yesil)}
.ox-ode-d.odendi .ox-i{width:17px;height:17px;stroke-width:2.6}
.ox-ode-d.sira{border:2px solid var(--ox-mavi);color:var(--ox-mavi)}
.ox-ode-d.gec{border:2px solid var(--ox-kirmizi);color:var(--ox-kirmizi);background:var(--ox-kirmizi-acik)}
.ox-ode-d.iptal{color:var(--ox-soluk);border-style:dashed}
.ox-ode-satir{gap:16px;min-height:54px;padding:7px 10px 7px 13px}
.ox-ode-satir .ox-chev{margin-left:-5px}
.ox-ode-satir:not(:has(.ox-chev)){padding-right:16px}
.ox-ode-dokum.ox-ode-satir{min-height:60px;padding:9px 16px}
.ox-ode-satir .ox-satir-govde b{font-size:16.5px}
.ox-ode-satir .ox-satir-sag{display:flex;align-items:center}
.ox-ode-t{font-size:16.5px;font-weight:600;color:var(--ox-bas);white-space:nowrap}
.ox-ode-t.iptal{color:var(--ox-soluk);text-decoration:line-through}
.ox-ode-t.od{color:var(--ox-yesil)}.ox-ode-t.iade{color:var(--ox-kirmizi)}
.ox-ode-plan+.ox-ode-diger,.ox-ode-bos+.ox-ode-diger{margin-top:16px}
.ox-ode-fis{flex:none;display:grid;place-items:center;width:28px;height:28px;color:#59627a}
.ox-ode-fis .ox-i{width:28px;height:28px;stroke-width:1.6}
.ox-ode-ozet{padding:4px 16px}
.ox-ode-ozet.gec{border-color:#f5c2c4}
.ox-ode-kv-bas{display:flex;padding:14px 0 6px}
.ox-ode-kv{display:flex;align-items:baseline;justify-content:space-between;gap:12px;min-height:48px;padding:12px 0;font-size:15.5px}
.ox-ode-kv+.ox-ode-kv{border-top:1px solid var(--ox-ayrac)}
.ox-ode-kv span{color:var(--ox-ikincil)}
.ox-ode-kv b{font-size:16.5px;font-weight:700;color:var(--ox-bas);font-variant-numeric:tabular-nums;text-align:right}
.ox-ode-hesap{position:relative;display:grid;gap:3px;padding:12px 16px 14px}
.ox-liste>.ox-ode-hesap+.ox-ode-hesap::before{content:"";position:absolute;top:0;left:16px;right:16px;border-top:1px solid var(--ox-ayrac)}
.ox-ode-hesap-bas{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:36px}
.ox-ode-hesap-bas b{min-width:0;font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-ode-iban{font-size:16px;font-weight:600;letter-spacing:.005em;color:var(--ox-bas);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ox-ode-hesap small{font-size:14px;color:var(--ox-ikincil)}
.ox-ode-kopya{position:relative;flex:none;display:inline-flex;align-items:center;gap:5px;height:38px;min-width:44px;padding:0 12px;border-radius:10px;background:var(--ox-mavi-acik);color:var(--ox-mavi);font-size:14.5px;font-weight:600}
.ox-ode-kopya .ox-i{width:17px;height:17px;stroke-width:2}
.ox-ode-kopya::after{content:"";position:absolute;inset:-4px -2px}
.ox-ode-kopya:active{background:var(--ox-mavi-orta)}
.ox-ode-alt-dg{margin-top:20px}
.ox-ode-dokum .ox-satir-govde b{font-size:15.5px;font-weight:600}
.ox-ode-yaz{display:flex;align-items:center;gap:10px;min-height:44px;margin-top:14px;color:var(--ox-mavi);font-size:15.5px;font-weight:600}
.ox-ode-yaz .ox-i{width:21px;height:21px}
.ox-ode-bos .ox-bos{padding:24px 20px}
@media (max-width:380px){.ox-ode-tutar{font-size:34px}.ox-ode-iki b{font-size:17.5px}.ox-ode-sira-orta b{font-size:22px}.ox-ode-iki>div+div{padding-left:16px}}
`);
// yönlendirici kancaları: başka ekrandan bir görünüm aç ('t:<i>' taksit ayrıntısı, 'diger'), sekmeye dönünce baştan başla
export const ac = g => { gorunum = g || 'ana'; };
export const sifirla = () => { gorunum = 'ana'; };
