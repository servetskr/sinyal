// Belgeler sekmesi (yeni tasarım): kayıt evraklarının durumu, evrak listesi (yükleme), sözleşme ve formlar.
import { EVRAKLAR, SINIFLAR, tamAd } from '../veri.js?v=216';
import { tarih } from '../ui.js?v=216';
import { kursaYaz } from '../ozellik.js?v=216';
import { esc, oi, sayfaBas, geri, bolum, heroKart, baglanti, liste, satir, ikonKutu, cip, not, stilEkle } from './ui.js?v=216';

let gorunum = 'ana'; // 'ana' | 'evrak'

function evrakDurum(k) {
  const y = k.evrakYuklenen || {};
  const onayli = EVRAKLAR.filter(([x]) => k.evrak[x]).length;
  const bekleyen = EVRAKLAR.filter(([x]) => !k.evrak[x] && y[x]).length; // yüklendi, kurs kontrol ediyor
  const eksik = EVRAKLAR.filter(([x]) => !k.evrak[x] && !y[x]).length;
  return { onayli, bekleyen, eksik, top: EVRAKLAR.length };
}

function anaHtml(k) {
  const d = evrakDurum(k), tamam = d.onayli === d.top;
  const hero = heroKart({
    ust: 'Kayıt evrakların',
    baslik: tamam ? 'Hepsi tamam' : d.eksik ? `${d.eksik} belge bekleniyor` : 'Kurs kontrol ediyor',
    alt: tamam ? `${d.onayli} / ${d.top} belge kurs tarafından onaylandı.` : `${d.onayli} / ${d.top} belge onaylandı${d.bekleyen ? ` · ${d.bekleyen} belge kontrolde` : ''}.`,
    gorsel: 'belge-tamam',
    dugme: baglanti(tamam ? 'Evraklarını görüntüle' : 'Eksikleri tamamla', { 'data-ox-blg': 'evrak' }, true),
    cls: 'ox-blg-hero',
  });
  const dir = SINIFLAR[k.sinif].direksiyon;
  const formlar = [
    ['sozlesme', 'Kurs sözleşmesi', 'Ücret, taksit planı ve şartlar', 'belge', 'mavi'],
    dir ? ['takip', 'Direksiyon eğitimi takip formu', `${k.direksiyon} ders işlendi`, 'panoListe', 'gri'] : null,
    ['bilgi', 'Bilgi formu', 'Kayıtta verdiğin bilgiler', 'kimlik', 'gri'],
  ].filter(Boolean);
  return sayfaBas('Belgeler', 'Kayıt evrakların ve kurs belgelerin.')
    + hero
    + bolum('Sözleşme ve formlar')
    + liste(formlar.map(([tur, ad, alt, ik, ton]) => satir({ ikon: ik, ton, baslik: ad, alt: esc(alt), attrs: { 'data-og-belge': tur, 'data-ad': ad } })))
    + `<div class="ox-blg-not">${not('Belgeleri açabilir ve yazdırabilirsin.', 'yazici')}<button type="button" class="ox-blg-yaz" data-ox-blg-yaz>${oi('mesaj')}<span>Belgenle ilgili kursa yaz</span></button></div>`;
}

function evrakHtml(k) {
  const y = k.evrakYuklenen || {}, d = evrakDurum(k);
  const satirlar = EVRAKLAR.map(([key, ad]) => {
    const ok = !!k.evrak[key], yuk = !ok && y[key];
    const sol = ikonKutu(ok ? 'tik' : yuk ? 'saat' : 'belge', ok ? 'yesil' : yuk ? 'turuncu' : 'gri');
    const alt = ok ? 'Onaylandı' : yuk ? `Yüklendi ${tarih(y[key].tarih)} · kurs kontrol ediyor` : key === 'sozlesme' ? 'Kursta imzalanır' : 'Henüz yüklenmedi';
    const sag = ok ? '' : key === 'sozlesme' ? cip('Kursta', 'gri')
      : `<label class="ox-blg-yukle">${oi(yuk ? 'sifirla' : 'arti')}<span>${yuk ? 'Yenile' : 'Yükle'}</span><input type="file" accept="image/*,application/pdf" data-og-evrak="${key}" hidden></label>`;
    return satir({ sol, baslik: ad, alt, altTon: ok ? 'yesil' : '', sag, ok: false });
  });
  return geri('Belgeler', { 'data-ox-blg': 'ana' })
    + sayfaBas('Kayıt evrakların', `${d.onayli} / ${d.top} belge onaylandı`)
    + liste(satirlar)
    + not('Belgenin fotoğrafını buradan yükle ya da kursun WhatsApp numarasına gönder; kurs kontrol edince burada onaylanır. Asıllarını ilk geldiğinde kursa teslim et.');
}

export function ekran(ctx) {
  const { k } = ctx;
  return {
    html: gorunum === 'evrak' ? evrakHtml(k) : anaHtml(k),
    baglan(kap) {
      kap.addEventListener('click', ev => {
        const g = ev.target.closest('[data-ox-blg]'); if (g) { gorunum = g.dataset.oxBlg; ctx.yenile(true); return; }
        if (ev.target.closest('[data-ox-blg-yaz]')) kursaYaz(k, 'belge', `Merhaba, ben ${tamAd(k)}. Belgelerimle ilgili bir sorum var.`);
      });
    },
  };
}

stilEkle('ox-belgeler', `
.ox-blg-hero .ox-hero-gorsel{top:50%;transform:translateY(-50%);right:14px;width:32%;max-width:132px;aspect-ratio:210/230;height:auto}
.ox-blg-hero.gorselli .ox-hero-yazi{max-width:66%}
.ox-blg-hero .ox-hero-dg{max-width:66%}
.ox-blg-hero .ox-hero-dg{margin-top:16px}
.ox-blg-not{margin-top:22px;display:grid;gap:6px}
.ox-blg-not .ox-not{margin:0}
.ox-blg-yaz{display:flex;align-items:center;gap:10px;min-height:44px;color:var(--ox-mavi);font-size:15.5px;font-weight:600}
.ox-blg-yaz .ox-i{width:21px;height:21px}
.ox-blg-yukle{position:relative;display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;border-radius:10px;background:var(--ox-mavi-acik);color:var(--ox-mavi);font-size:14.5px;font-weight:600;cursor:pointer}
.ox-blg-yukle .ox-i{width:17px;height:17px;stroke-width:2.2}
.ox-blg-yukle::after{content:"";position:absolute;inset:-5px -2px}
`);
// yönlendirici kancaları: 'evrak' evrak listesini açar
export const ac = g => { gorunum = g || 'ana'; };
export const sifirla = () => { gorunum = 'ana'; };
