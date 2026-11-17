// Derslerim sekmesi (yeni tasarım): Programım (hafta şeridi, günün dersleri, ders ayrıntısı), Gelişim (ilerleme, beceri puanları,
// öğretmen notları) ve Geçmiş (yapılan dersler, öğrenci onayı, değerlendirme).
// Eski ogrenci.js derslerHtml / programHtml / yaklasanHtml / degerlendirKart / ders defteri işlevleri buraya taşındı;
// onay, itiraz, yıldız, takvim dosyası (data-og-*) ogrenci.js ogBagla'da; ders al, kursa yaz, saat değiştir, iptal portal.js ogGenelTik'te çalışır.
import { S, BECERI, DERS_TUR_AD, egitmen, arac, ogretmen, fark, gun, tarihOku, iso, iptalEdilebilir, dersSirasi, kapaliGun, ogrOzellik, tamAd } from '../veri.js?v=221';
import { gerekliDireksiyon, teorikVar, egitimSinifi } from '../veri.js?v=221';
import { tarihUzun, gunAdi, gunKisa, ayAdi } from '../ui.js?v=221';
import * as TK from '../takvim.js?v=221';
import { onayBekleyen, MUFREDAT, sinavAdi, hakDurum, dirSayac, TEORIKSIZ_METIN } from '../ogrenci.js?v=221';
import { randevuEngeli, engelYazilir } from '../risk.js?v=221';
import { kursaYaz } from '../ozellik.js?v=221';
import { esc, oi, sayfaBas, geri, bolum, kart, liste, satir, ikonKutu, cip, serit, not, bos, dugme, sekmeler, stilEkle } from './ui.js?v=221';

/* ---------- ekran durumu (yeniden çizimde korunur) ---------- */
let sekme = 'program';   // 'program' | 'gelisim' | 'gecmis'
let secili = null;       // seçili gün (YYYY-AA-GG); null → varsayılan gün
let ayAcik = false;      // ay görünümü (başlıktaki "Kasım 2026 ⌄")
let acik = null;         // ayrıntısı açık dersin kimliği
let onayHepsi = false;   // Geçmiş: onay bekleyen derslerin hepsi görünsün mü

const ekleGun = (t, n) => { const d = tarihOku(t); d.setDate(d.getDate() + n); return iso(d); };
const ayKaydir = (t, n) => { const d = tarihOku(t); d.setDate(1); d.setMonth(d.getMonth() + n); return iso(d); };
const gunAy = t => { const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };
const gunBaslik = t => { const f = fark(t); return (f === 0 ? 'Bugün' : f === 1 ? 'Yarın' : f === -1 ? 'Dün' : gunAdi(t)) + ', ' + gunAy(t); };
const goreliKisa = t => { const f = fark(t); return f === 0 ? 'Bugün' : f === 1 ? 'Yarın' : f === -1 ? 'Dün' : f > 1 && f < 7 ? f + ' gün sonra' : f < -1 && f > -7 ? -f + ' gün önce' : gunAy(t); };
const virgul = v => v.toFixed(1).replace('.', ',');
const yildizlar = n => `<span class="ox-drs-yildizlar" role="img" aria-label="${n}/5 yıldız">${[1, 2, 3, 4, 5].map(i => oi('yildiz', i <= n ? 'dolu' : '')).join('')}</span>`;

/* ---------- veriler ---------- */
const teorikDonem = k => (teorikVar(k) && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama)) || (S.teorik || []).some(t => (t.yoklama || []).includes(k.id));
// Takvimdeki bütün olaylar: direksiyon dersleri (iptal ve tarihi geçmiş planlı hariç), teorik dersler, sınavlar (eski takvimOlaylari)
function olaylar(k) {
  const l = [];
  S.dersler.filter(d => d.kursiyer === k.id && d.durum !== 'İptal' && !(d.durum === 'Planlandı' && fark(d.tarih) < 0)).forEach(d => l.push({ tur: 'direksiyon', id: d.id, tarih: d.tarih, saat: d.saat, d }));
  if (teorikDonem(k)) (S.teorik || []).filter(t => t.grup === (k.teorikGrup || 'aksam') && t.tarih >= (k.kayit || '')).forEach(t => l.push({ tur: 'teorik', id: 't-' + t.id, tarih: t.tarih, saat: t.saat, t }));
  S.sinavlar.filter(s => s.kursiyerler.includes(k.id)).forEach(s => l.push({ tur: 'sinav', id: 's-' + s.id, tarih: s.tarih, saat: s.saat, s }));
  return l.sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
}
// Açılışta seçilen gün: bugün ders varsa bugün, yoksa önümüzdeki 14 gündeki ilk dersin günü, o da yoksa bugün
function varsayilanGun(l) {
  const bugun = gun(0);
  if (l.some(o => o.tarih === bugun)) return bugun;
  const s = l.find(o => o.tarih > bugun && fark(o.tarih) <= 14);
  return s ? s.tarih : bugun;
}
// Hafta değişince: aynı gün dersliyse o gün; değilse haftada bugün varsa bugün, yoksa haftanın ilk dersli günü
function haftaSec(t, l) {
  const h = TK.haftaGunleri(t), var_ = x => l.some(o => o.tarih === x);
  if (var_(t)) return t;
  if (h.includes(gun(0))) return gun(0);
  return h.find(var_) || t;
}
const yapilanlar = k => S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
// Becerilerin son 3 dersteki ortalaması ve öncekilere göre yönü (eski beceriOzet)
function beceriOzet(k) {
  const l = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && d.beceri).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const ort = x => BECERI.map(([id, ad]) => { const v = x.map(d => d.beceri[id]).filter(z => z != null); return [ad, v.length ? v.reduce((a, b) => a + b, 0) / v.length : null]; });
  return { l, son: ort(l.slice(-3)), once: l.length > 3 ? ort(l.slice(0, -3)) : null };
}
const puanTon = v => v < 3 ? 'kirmizi' : v < 3.8 ? 'turuncu' : 'yesil';

/* ---------- ders kartı ---------- */
function kartBilgi(o, k, sd) {
  const bugun = gun(0);
  if (o.tur === 'direksiyon') {
    const d = o.d, h = egitmen(d.egitmen), a = d.arac && arac(d.arac), plan = d.durum === 'Planlandı';
    const ad = d.tur && d.tur !== 'trafik' ? DERS_TUR_AD[d.tur] : 'Direksiyon dersi';
    let c = '', ton = '';
    if (plan) {
      if (sd && d.id === sd.id) { c = cip('Sıradaki'); ton = 'mavi'; }
      else if (d.onayBekliyor) c = cip('Onay bekliyor', 'turuncu');
      else if (o.tarih === bugun) { c = cip('Bugün', 'gri'); ton = 'turuncu'; }
      else c = cip(fark(o.tarih) === 1 ? 'Yarın' : 'Planlı', 'gri');
    } else c = d.durum === 'Yapıldı' ? cip('Yapıldı', 'yesil') : cip(d.durum === 'Gelmedi' ? 'Gelmedin' : esc(d.durum), 'kirmizi');
    return { ikon: 'direksiyon', ad, cip: c, ton, kim: h ? h.ad : '', kimIkon: 'kisi', sag2: a ? a.plaka : d.kendiArac || k.kendiArac ? 'Kendi aracın' : '', sag2Ikon: 'arac', ac: true };
  }
  if (o.tur === 'teorik') {
    const t = o.t, og = ogretmen(t.ogretmen), gecti = o.tarih < bugun, vardi = (t.yoklama || []).includes(k.id);
    return { ikon: 'kitap', ad: 'Teorik ders', cip: gecti ? (t.yoklama ? cip(vardi ? 'Katıldın' : 'Katılmadın', vardi ? 'yesil' : 'kirmizi') : cip('Bitti', 'gri')) : o.tarih === bugun ? cip('Bugün', 'gri') : cip('Teorik', 'mor'),
      ton: !gecti && o.tarih === bugun ? 'turuncu' : '', kim: t.konu + (og ? ' · ' + og.ad : ''), kimIkon: 'kitap', sag2: t.salon || '', sag2Ikon: 'harita', ac: false };
  }
  // sınav sonucu s.sonuc[k.id] içinde düz metin ('Geçti' | 'Kaldı' | 'Girmedi'); eski kayıtta { sonuc } olabilir
  const s = o.s, r0 = (s.sonuc || {})[k.id], r = typeof r0 === 'string' ? r0 : r0 && r0.sonuc;
  return { ikon: 'bayrak', ad: sinavAdi(s.tur), cip: r ? cip(esc(r), r === 'Geçti' ? 'yesil' : 'kirmizi') : cip('Sınav', 'mor'), ton: '',
    kim: s.yer || '', kimIkon: 'harita', sag2: '', sag2Ikon: '', ac: false };
}
function dersKart(o, k, sd) {
  const b = kartBilgi(o, k, sd), t = b.ac ? 'button' : 'div';
  const aria = b.ac ? ` aria-label="${esc(b.ad)}, ${esc(gunBaslik(o.tarih))} ${esc(o.saat)}${b.kim ? ', ' + esc(b.kim) : ''}: ayrıntılar"` : '';
  const kutuTon = b.ton === 'turuncu' ? 'turuncu' : o.tur === 'direksiyon' ? 'mavi' : 'mor';
  return `<${t}${b.ac ? ` type="button" data-ox-drs-ac="${esc(o.id)}"${aria}` : ''} class="ox-drs-kart ${b.ton}">
    <span class="ox-drs-bas">${ikonKutu(b.ikon, kutuTon)}<b>${esc(b.ad)}</b></span>
    <span class="ox-drs-cip">${b.cip}</span>
    <b class="ox-drs-saat">${esc(o.saat)}</b>
    <span class="ox-drs-m ox-drs-tarih">${oi('takvim')}<span>${esc(gunAy(o.tarih))}</span></span>
    ${b.ac ? `<span class="ox-chev ox-drs-ok">${oi('sag')}</span>` : ''}
    <span class="ox-drs-m ox-drs-kim">${b.kim ? oi(b.kimIkon) + `<span>${esc(b.kim)}</span>` : ''}</span>
    <span class="ox-drs-m ox-drs-plaka">${b.sag2 ? oi(b.sag2Ikon) + `<span>${esc(b.sag2)}</span>` : ''}</span>
  </${t}>`;
}

/* ---------- Programım ---------- */
function gunHucre(t, l, ay) {
  const n = l.filter(o => o.tarih === t).length, kap = kapaliGun(t), dt = tarihOku(t);
  const cls = [t === secili ? 'secili' : '', t === gun(0) ? 'bugun' : '', ay && t.slice(0, 7) !== secili.slice(0, 7) ? 'disari' : '', kap ? 'kapali' : ''].filter(Boolean).join(' ');
  return `<button type="button" class="ox-drs-gun ${cls}" data-ox-drs-gun="${t}" aria-pressed="${t === secili}" aria-label="${esc(tarihUzun(t))}${t === gun(0) ? ', bugün' : ''}${n ? ', ' + n + ' ders' : kap ? ', kurs kapalı' : ''}">${ay ? '' : `<small>${gunKisa(t)}</small>`}<b>${dt.getDate()}</b><i class="${n ? 'var' : ''}"></i></button>`;
}
function programHtml(k, ctx, l) {
  const dir = !!gerekliDireksiyon(k), sd = ctx.sd, dt = tarihOku(secili), bitti = k.asama === 'Ehliyet', hd = hakDurum(k);  // hd: sınav hakkı doldu, karar kursta
  const ay = `<div class="ox-drs-ay"><button type="button" class="ox-drs-ay-ad" data-ox-drs-ay aria-expanded="${ayAcik}" aria-label="${ayAcik ? 'Hafta görünümüne dön' : 'Ay görünümünü aç'}"><span>${ayAdi(dt.getMonth(), true)} ${dt.getFullYear()}</span>${oi(ayAcik ? 'yukari' : 'asagi')}</button>
    <span class="ox-drs-gez"><button type="button" data-ox-drs-git="-1" aria-label="${ayAcik ? 'Önceki ay' : 'Önceki hafta'}"><span>${oi('sol')}</span></button><button type="button" data-ox-drs-git="1" aria-label="${ayAcik ? 'Sonraki ay' : 'Sonraki hafta'}"><span>${oi('sag')}</span></button></span></div>`;
  const takvim = ayAcik
    ? `<div class="ox-drs-takvim ay"><div class="ox-drs-ay-gunler" aria-hidden="true">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(g => `<small>${g}</small>`).join('')}</div><div class="ox-drs-izgara">${TK.ayGunleri(secili).map(t => gunHucre(t, l, true)).join('')}</div></div>`
    : `<div class="ox-drs-takvim"><div class="ox-drs-izgara">${TK.haftaGunleri(secili).map(t => gunHucre(t, l, false)).join('')}</div></div>`;
  const gunun = l.filter(o => o.tarih === secili), kap = kapaliGun(secili);
  const sayi = gunun.length ? (gunun.every(o => o.tur === 'sinav') ? gunun.length + ' sınav' : gunun.length + ' ders') : '';
  let govde;
  if (gunun.length) govde = gunun.map(o => dersKart(o, k, sd)).join('');
  else {
    const sonraki = l.find(o => o.tarih > secili && fark(o.tarih) >= 0), ileride = l.some(o => fark(o.tarih) >= 0);
    const tamam = bitti && !ileride;  // ehliyetini almış: yeni ders beklenmez
    const baslik = tamam ? 'Kursun tamamlandı' : kap ? (kap === 'Pazar' ? 'Pazar günü kurs kapalı' : 'Resmî tatil, kurs kapalı') : ileride ? 'Bu gün dersin yok' : 'Planlı dersin yok';
    const alt = tamam ? 'Yeni dersin yok.' : sonraki ? `Sıradaki dersin: ${esc(gunBaslik(sonraki.tarih))}, ${esc(sonraki.saat)}`
      : ileride ? 'Bu günden sonra planlı dersin yok.' : hd ? 'Kurs seninle görüşünce programın burada görünür.' : dir && k.asama === 'Direksiyon' ? 'Aşağıdan direksiyon dersi alabilirsin.' : 'Programın belli olunca burada görünür.';
    govde = kart(bos('takvim', baslik, alt, sonraki ? dugme('Sıradaki derse git', { 'data-ox-drs-gun': sonraki.tarih }, { tur: 'ikincil', kucuk: true }) : ''), 'ox-drs-bos');
  }
  // Ders alma: alınabiliyorsa düğme; alınamıyorsa nedeni ve (işe yarıyorsa) kursa yazma yolu
  let al = '';
  if (dir && !bitti && !hd) {
    const engel = randevuEngeli(k);
    if (!engel) al = `<button type="button" class="ox-drs-ekle" data-iste>${oi('arti')}<span>Direksiyon dersi al</span></button>`;
    else if (engelYazilir(engel)) { const ek = /hepsi planlandı/.test(engel); al = liste([satir({ ikon: 'wp', ton: 'yesil', baslik: ek ? 'Ek ders için kursa yaz' : 'Ders için kursa yaz', alt: esc(engel.split(/(?<=\.)\s/)[0]), attrs: { 'data-kursa-yaz': ek ? 'ek' : 'ders' } })], 'ox-drs-engel'); }
    else if (k.asama === 'Direksiyon') al = `<div class="ox-drs-engel-not">${not(esc(engel))}</div>`;
  }
  const ileri = l.some(o => o.tarih >= gun(0) && !(o.tur === 'direksiyon' && o.d.durum !== 'Planlandı'));
  return ay + takvim
    + `<div class="ox-bolum ox-drs-gun-bas"><h2>${esc(gunBaslik(secili))}</h2>${sayi ? `<span class="ox-bolum-sag">${sayi}</span>` : ''}</div>`
    + `<div class="ox-drs-kartlar">${govde}</div>` + al
    + (ileri ? `<button type="button" class="ox-drs-tel" data-og-takvim>${oi('takvim')}<span>Telefon takvimine ekle</span></button>` : '')
    + (bitti ? '' : `<p class="ox-drs-dip">Program değişirse WhatsApp’tan haber verilir.</p>`);
}

/* ---------- ders ayrıntısı ---------- */
function ayrintiHtml(k, ctx, o) {
  const d = o.d, h = egitmen(d.egitmen), a = d.arac && arac(d.arac), plan = d.durum === 'Planlandı', b = kartBilgi(o, k, ctx.sd), sira = dersSirasi(d, k);
  const kalan = plan ? (new Date(d.tarih + 'T' + d.saat + ':00') - Date.now()) / 36e5 : 0;
  const ozet = `<div class="ox-kart ox-drs-ozet ${b.ton}"><div class="ox-drs-ozet-ust">${ikonKutu('direksiyon', b.ton === 'turuncu' ? 'turuncu' : 'mavi')}<span class="ox-drs-ozet-ad"><b>${esc(b.ad)}</b><small>${sira ? (gerekliDireksiyon(k) && sira > gerekliDireksiyon(k) ? (sira - gerekliDireksiyon(k)) + '. ek dersin' : sira + '. direksiyon dersin') : 'Direksiyon dersi'}</small></span>${b.cip}</div>
    <b class="ox-drs-ozet-saat">${esc(d.saat)}</b><p class="ox-drs-ozet-tarih">${esc(tarihUzun(d.tarih))} · ${esc(goreliKisa(d.tarih))}</p></div>`;
  const kurs = S.kurs || {}, adres = [kurs.ad, kurs.adres].filter(Boolean).join(', ');
  const bilgi = [
    satir({ ikon: 'kisi', baslik: esc(h ? h.ad : 'Öğretmen belli değil'), alt: 'Usta öğretici', ok: false }),
    a ? satir({ ikon: 'arac', baslik: esc(a.plaka), alt: esc([a.model, a.vites].filter(Boolean).join(' · ')), ok: false })
      : d.kendiArac || k.kendiArac ? satir({ ikon: 'arac', baslik: 'Kendi aracın', alt: 'Raporuna uygun kendi aracınla ders', ok: false }) : '',
    plan && adres ? satir({ ikon: 'harita', baslik: 'Yol tarifi', alt: esc(adres), etiket: 'a', attrs: { href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(adres), target: '_blank', rel: 'noopener' } }) : '',
    !plan && d.sure ? satir({ ikon: 'saat', baslik: `${esc(d.bas || d.saat)}–${esc(d.bit || '')} · ${d.sure} dakika`, alt: [d.konum ? 'Konum alındı' : '', d.meb ? 'MEBBİS’e işlendi' : ''].filter(Boolean).join(' · ') || 'Ders süresi', ok: false }) : '',
  ].filter(Boolean);
  let islem = '';
  if (plan) {
    if (d.onayBekliyor) islem += not('Bu ders isteğin kursun onayını bekliyor; onaylanınca kesinleşir.', 'saat');
    if (kalan >= 24 && iptalEdilebilir(d)) {
      // sıradaki ders için ortak "data-degis" (portal.js), diğer dersler için aynı mesaj bu derse göre yazılır
      const degis = ctx.sd && ctx.sd.id === d.id ? { 'data-degis': true } : { 'data-ox-drs-degis': d.id };
      islem += bolum('Değişiklik') + liste([
        satir({ ikon: 'saat', baslik: 'Saatini değiştir', alt: 'Kursa WhatsApp’tan istek gönderilir', attrs: degis }),
        satir({ ikon: 'yanlis', ton: 'kirmizi', baslik: 'Dersi iptal et', alt: 'Dersten 24 saat öncesine kadar', attrs: { 'data-og-iptal': d.id } }),
      ]) + not('Dersten 24 saat öncesine kadar saatini değiştirebilir ya da iptal edebilirsin. İptal edilen saat başka bir kursiyere açılır.');
    } else {
      islem += bolum('Değişiklik') + liste([
        kurs.tel ? satir({ ikon: 'tel', baslik: 'Kursu ara', alt: esc(kurs.tel), etiket: 'a', attrs: { href: 'tel:' + String(kurs.tel).replace(/[^\d+]/g, '') } }) : '',
        satir({ ikon: 'mesaj', baslik: 'Kursa yaz', alt: 'WhatsApp’tan mesaj gönderilir', attrs: { 'data-ox-drs-yaz': d.id } }),
      ].filter(Boolean)) + not('Derse 24 saatten az kaldı; saat değişikliği ve iptal için kursa ulaş.', 'uyari');
    }
  } else if (d.durum === 'Yapıldı') {
    if (d.beceri) islem += bolum('Bu dersteki puanların', '1–5') + kart(BECERI.filter(([x]) => d.beceri[x] != null).map(([x, ad]) => beceriSatir(ad, d.beceri[x])).join(''), 'ox-drs-beceri');
    if (d.not) islem += bolum('Öğretmeninin notu') + notKart(d);
    const o2 = d.ogrenciOnay;
    if (ogrOzellik('dersOnay')) {
      if (o2) islem += bolum('Ders onayın') + liste([satir({ sol: ikonKutu(o2.durum === 'onay' ? 'tik' : 'yanlis', o2.durum === 'onay' ? 'yesil' : 'kirmizi'), baslik: o2.durum === 'onay' ? 'Dersin yapıldığını onayladın' : 'Derse itiraz ettin', alt: o2.not ? '“' + esc(o2.not) + '”' : '', ok: false })]);
      else if (fark(d.tarih) >= -14) islem += bolum('Ders yapıldı mı?') + onayKart(d, false);
    }
    if (d.ogrenciPuan) islem += bolum('Değerlendirmen') + kart(`<div class="ox-drs-puan">${yildizlar(d.ogrenciPuan.puan)}${d.ogrenciPuan.yorum ? `<p>“${esc(d.ogrenciPuan.yorum)}”</p>` : ''}</div>`);
    else if (fark(d.tarih) >= -7) islem += bolum('Dersin nasıldı?') + degerlendirKutu(d, false);
  } else islem += bolum('Bir yanlışlık mı var?') + liste([satir({ ikon: 'mesaj', baslik: 'Kursa yaz', alt: 'WhatsApp’tan mesaj gönderilir', attrs: { 'data-ox-drs-yaz': d.id } })]) + not('Bu ders “gelmedin” olarak işlendi. Derse geldiysen kursa yaz.', 'uyari');
  return geri('Derslerim', { 'data-ox-drs-geri': true }) + sayfaBas('Ders ayrıntısı') + ozet + bolum('Bilgiler') + liste(bilgi) + islem;
}

/* ---------- Gelişim ---------- */
const beceriSatir = (ad, v, once) => `<div class="ox-drs-bs"><span class="ox-drs-bs-ad">${esc(ad)}</span><span class="ox-drs-bs-d ${puanTon(v)}">${virgul(v)}${once != null ? `<em class="${v >= once ? 'yukari' : 'asagi'}" role="img" aria-label="${v >= once ? 'öncekine göre arttı' : 'öncekine göre azaldı'}">${oi(v >= once ? 'yukari' : 'asagi')}</em>` : ''}</span>${serit(v / 5 * 100, puanTon(v))}</div>`;
const notKart = d => `<figure class="ox-kart ox-drs-not"><blockquote>“${esc(d.not)}”</blockquote><figcaption>${esc((egitmen(d.egitmen) || {}).ad || '')} · ${esc(gunAy(d.tarih))}</figcaption></figure>`;
function gelisimHtml(k, ctx) {
  const S0 = ctx.S0, dir = !!gerekliDireksiyon(k), tv = teorikVar(k), ds = dirSayac(k);
  const kutu = (ust, n, top, birim) => `<div class="ox-kart ox-drs-ilerleme"><small>${ust}</small><b>${n}<span>/${top} ${birim}</span></b>${serit(top ? Math.min(100, n / top * 100) : 0, n >= top ? 'yesil' : 'mavi')}</div>`;
  // teorik eğitimi olmayan öğrencide (fark, muaf, otomatikten manuele, römork) teorik ilerlemesi yerine kısa açıklama; ek dersler ayrı sayılır
  let h = `<div class="ox-drs-ilerlemeler ${dir && tv ? '' : 'tek'}">${dir ? kutu(ds.ek ? `Direksiyon · ${ds.ek} ek ders` : 'Direksiyon', ds.n, ds.g, 'ders') : ''}${tv ? kutu('Teorik', k.teorik, S0.teorik, 'saat') : ''}</div>${tv ? '' : not(TEORIKSIZ_METIN)}`;
  if (dir) {
    const { l, son, once } = beceriOzet(k), sayi = Math.min(3, l.length);
    if (l.length) {
      const zayif = son.filter(([, v]) => v != null).sort((a, b) => a[1] - b[1])[0];
      h += bolum('Beceri puanların', `Son ${sayi} ders`) + kart(son.map(([ad, v], i) => v == null ? '' : beceriSatir(ad, v, once && once[i][1] != null ? once[i][1] : null)).join(''), 'ox-drs-beceri')
        + not(zayif && zayif[1] < 3.8 ? `Üzerinde çalış: <b>${esc(zayif[0])}</b> (${virgul(zayif[1])}). Puanları öğretmenin verir; 1 zayıf, 5 sınava hazır demek.` : `Son ${sayi} derste iyi gidiyorsun. Puanları öğretmenin verir; 1 zayıf, 5 sınava hazır demek.`, zayif && zayif[1] < 3.8 ? 'hedef' : 'bilgi');
      const notlar = l.filter(d => d.not).slice(-3).reverse();
      h += bolum('Öğretmen notları', notlar.length ? notlar.length + ' not' : '') + (notlar.length ? notlar.map(notKart).join('') : liste([satir({ ikon: 'mesaj', ton: 'gri', baslik: 'Henüz not yok', alt: 'Öğretmenin dersten sonra not yazınca burada görünür.', ok: false })]));
    } else h += bolum('Beceri puanların') + kart(bos('grafik', 'Henüz puan yok', 'İlk direksiyon dersinden sonra öğretmeninin verdiği puanlar burada görünür.'), 'ox-drs-bos');
  }
  const okunan = Object.keys(k.okunan || {}).length, konuTop = MUFREDAT.reduce((a, x) => a + x[3].length, 0);
  if (!egitimSinifi(k.sinif)) h += bolum('Teorik') + liste([satir({ ikon: 'kitap', ton: 'mor', baslik: 'Konu anlatımları ve testler', alt: `${okunan}/${konuTop} konu tamamlandı`, attrs: { 'data-ogs': 'sinav' } })]);
  return h;
}

/* ---------- Geçmiş ---------- */
// Ders defteri onayı: ogrenci.js ogBagla data-og-onay / data-og-itiraz işler
function onayKart(d, baslikli = true) {
  const h = egitmen(d.egitmen);
  return `<div class="ox-kart ox-drs-onay">${baslikli ? `<div class="ox-drs-onay-ust"><b>${esc(tarihUzun(d.tarih))} · ${esc(d.bas || d.saat)}${d.bit ? '–' + esc(d.bit) : ''}</b><small>${esc([h && h.ad, d.sure ? d.sure + ' dk' : '', d.konum ? 'konum alındı' : '', d.meb ? 'MEBBİS’te' : ''].filter(Boolean).join(' · '))}</small></div>` : ''}
    <div class="ox-drs-onay-dg">${dugme('Yapıldı', { 'data-og-onay': d.id }, { ikon: 'tik', kucuk: true })}${dugme('Yapılmadı', { 'data-og-itiraz': d.id }, { tur: 'cizgi', kucuk: true })}</div></div>`;
}
// Yıldızlı değerlendirme: ogrenci.js ogBagla (.og-degerlendir, data-og-yildiz, data-og-yorum, data-og-puan) işler
function degerlendirKutu(d, baslikli = true) {
  const h = egitmen(d.egitmen);
  return `<div class="ox-kart ox-drs-deg og-degerlendir">${baslikli ? `<div class="ox-drs-deg-ust"><b>Son dersin nasıldı?</b><small>${esc(goreliKisa(d.tarih))} ${esc(d.saat)} · ${esc(h ? h.ad : '')}</small></div>` : ''}
    <div class="ox-drs-yildiz" role="radiogroup" aria-label="Puan">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" data-og-yildiz="${n}" aria-label="${n} yıldız">${oi('yildiz')}</button>`).join('')}</div>
    <textarea data-og-yorum rows="2" maxlength="300" placeholder="İstersen kısa bir not yaz" aria-label="Not"></textarea>
    <div class="ox-drs-deg-alt"><small>Puanını yalnız kurs yönetimi görür.</small>${dugme('Gönder', { 'data-og-puan': d.id, disabled: true }, { kucuk: true })}</div></div>`;
}
function gecmisHtml(k, ctx) {
  const S0 = ctx.S0, onayAcik = !!gerekliDireksiyon(k) && ogrOzellik('dersOnay');
  const gecmis = S.dersler.filter(d => d.kursiyer === k.id && d.durum !== 'Planlandı' && d.durum !== 'İptal').sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const yap = yapilanlar(k);
  if (!gecmis.length) return kart(bos('gecmis', 'Henüz yapılan dersin yok', gerekliDireksiyon(k) ? 'Direksiyon derslerin yapıldıkça burada listelenir.' : 'Yapılan derslerin burada listelenir.'), 'ox-drs-bos');
  let h = '';
  const deg = yap.find(d => fark(d.tarih) >= -7 && !d.ogrenciPuan);
  if (deg) h += degerlendirKutu(deg);
  const bekleyen = onayAcik ? yap.filter(d => !d.ogrenciOnay && fark(d.tarih) >= -14) : [];
  if (bekleyen.length) h += bolum('Onayın bekleniyor', bekleyen.length + ' ders') + (onayHepsi ? bekleyen : bekleyen.slice(0, 3)).map(d => onayKart(d)).join('')
    + (bekleyen.length > 3 ? dugme(onayHepsi ? 'Daha az göster' : `${bekleyen.length - 3} ders daha`, { 'data-ox-drs-onay-hepsi': true }, { tur: 'metin', ikon: onayHepsi ? 'yukari' : 'asagi' }) : '') + not('Ders yapıldıysa “Yapıldı”ya dokun. Yapılmadıysa ya da süresi eksikse “Yapılmadı” de; kurs müdürüne hemen iletilir.');
  if (onayAcik) {
    const onay = yap.filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'onay').length, itiraz = yap.filter(d => d.ogrenciOnay && d.ogrenciOnay.durum === 'itiraz').length;
    const c = (ad, n, ton = '') => `<div><small>${ad}</small><b class="${ton}">${n}</b></div>`;
    h += bolum('Ders defterin') + `<div class="ox-kart ox-drs-defter">${c('Sözleşmede', gerekliDireksiyon(k) + (k.ekDersHakki || 0))}${c('Yapıldı', yap.length)}${c('Onayladın', onay, onay ? 'yesil' : '')}${itiraz ? c('İtiraz', itiraz, 'kirmizi') : c('MEBBİS’te', yap.filter(d => d.meb).length)}</div>`;
  }
  const gelmedi = gecmis.filter(d => d.durum === 'Gelmedi').length;
  const dsy = dirSayac(k);
  h += bolum('Yapılan dersler', `${dsy.n}/${dsy.g}${dsy.ek ? ' · ' + dsy.ek + ' ek ders' : ''}${gelmedi ? ' · ' + gelmedi + ' gelmedin' : ''}`) + liste(gecmis.map(d => {
    const ok = d.durum === 'Yapıldı', o2 = d.ogrenciOnay, h2 = egitmen(d.egitmen);
    const sag = !ok ? cip(d.durum === 'Gelmedi' ? 'Gelmedin' : esc(d.durum), 'kirmizi') : o2 ? cip(o2.durum === 'onay' ? 'Onayladın' : 'İtiraz', o2.durum === 'onay' ? 'yesil' : 'kirmizi') : d.ogrenciPuan ? `<span class="ox-drs-puan-k" aria-label="${d.ogrenciPuan.puan}/5 yıldız">${oi('yildiz', 'dolu')}${d.ogrenciPuan.puan}</span>` : '';
    return satir({ sol: ikonKutu(ok ? 'tik' : 'yanlis', ok ? 'yesil' : 'kirmizi'), baslik: `${esc(gunAy(d.tarih))} · ${esc(d.saat)}`, alt: esc([h2 && h2.ad, d.sure ? d.sure + ' dk' : ''].filter(Boolean).join(' · ')), sag, attrs: { 'data-ox-drs-ac': d.id } });
  }), 'ox-drs-gecmis');
  return h;
}

/* ---------- ekran ---------- */
export function ekran(ctx) {
  const { k } = ctx, l = olaylar(k);
  if (!secili) secili = varsayilanGun(l);
  let html;
  const ac = acik && S.dersler.find(d => d.id === acik && d.kursiyer === k.id && d.durum !== 'İptal');
  if (ac) html = ayrintiHtml(k, ctx, { tur: 'direksiyon', id: ac.id, tarih: ac.tarih, saat: ac.saat, d: ac });
  else {
    acik = null;
    const ob = gerekliDireksiyon(k) && ogrOzellik('dersOnay') ? onayBekleyen(k) : 0;
    const sekmeAd = [['program', 'Programım'], ['gelisim', 'Gelişim'], ['gecmis', ob ? `Geçmiş<em class="ox-drs-rozet" aria-label=", ${ob} onay bekliyor">${ob}</em>` : 'Geçmiş']];
    html = `<div class="ox-drs-sayfa">` + sayfaBas('Derslerim') + sekmeler(sekmeAd, sekme, 'data-ox-drs-sekme', 'cizgi')
      + `<div class="ox-drs-govde ${sekme}" role="tabpanel">${sekme === 'gelisim' ? gelisimHtml(k, ctx) : sekme === 'gecmis' ? gecmisHtml(k, ctx) : programHtml(k, ctx, l)}</div></div>`;
  }
  return {
    html,
    baglan(kap) {
      // alt sekmeden Derslerim'e yeniden dokunulursa ayrıntı ve ay görünümü kapanır (ortak işleyici çizmeden önce, yakalama evresinde)
      kap.addEventListener('click', ev => { if (ev.target.closest('[data-ogs="ders"]')) { acik = null; ayAcik = false; } }, true);
      kap.addEventListener('click', ev => {
        const t = ev.target;
        const sk = t.closest('[data-ox-drs-sekme]'); if (sk) { if (sk.dataset.oxDrsSekme !== sekme) { sekme = sk.dataset.oxDrsSekme; ctx.yenile(); } return; }
        const g = t.closest('[data-ox-drs-gun]'); if (g) { secili = g.dataset.oxDrsGun; ayAcik = false; ctx.yenile(); return; }
        const gt = t.closest('[data-ox-drs-git]'); if (gt) { const n = +gt.dataset.oxDrsGit; secili = ayAcik ? ayKaydir(secili, n) : haftaSec(ekleGun(secili, 7 * n), olaylar(k)); ctx.yenile(); return; }
        if (t.closest('[data-ox-drs-ay]')) { ayAcik = !ayAcik; ctx.yenile(); return; }
        const a = t.closest('[data-ox-drs-ac]'); if (a) { acik = a.dataset.oxDrsAc; ctx.yenile(true); return; }
        if (t.closest('[data-ox-drs-onay-hepsi]')) { onayHepsi = !onayHepsi; ctx.yenile(); return; }
        if (t.closest('[data-ox-drs-geri]')) { acik = null; ctx.yenile(true); return; }
        const dg = t.closest('[data-ox-drs-degis]'); if (dg) { const d = S.dersler.find(x => x.id === dg.dataset.oxDrsDegis); if (d) kursaYaz(k, 'ders', `Merhaba, ben ${tamAd(k)}. ${tarihUzun(d.tarih)} ${d.saat} direksiyon dersimin saatini değiştirmek istiyorum.`); return; }
        const yz = t.closest('[data-ox-drs-yaz]'); if (yz) { const d = S.dersler.find(x => x.id === yz.dataset.oxDrsYaz); if (d) kursaYaz(k, 'ders', `Merhaba, ben ${tamAd(k)}. ${tarihUzun(d.tarih)} ${d.saat} direksiyon dersimle ilgili yazıyorum.`); }
      });
    },
  };
}

/* ---------- stiller ---------- */
stilEkle('ox-derslerim', `
/* sekmeler: referanstaki 36px çubuk; dokunma alanı 44px (düğmeler çubuğun üstüne/altına 4px taşar) */
.ox-drs-sayfa>.ox-sekmeler.cizgi{margin:-6px 0 14px}
.ox-drs-sayfa>.ox-sekmeler.cizgi button{min-height:44px;margin:-4px 0;padding-bottom:6px;font-size:15.5px}
.ox-drs-sayfa>.ox-sekmeler.cizgi button.secili::after{bottom:3px}
.ox-drs-govde.gelisim,.ox-drs-govde.gecmis{padding-top:8px}
.ox-drs-rozet{display:inline-grid;place-items:center;min-width:19px;height:19px;margin-left:6px;padding:0 5px;border-radius:999px;background:var(--ox-kirmizi);color:#fff;font-size:11.5px;line-height:1;font-weight:700;font-style:normal;vertical-align:2px}

/* ay başlığı ve gezinme */
.ox-drs-ay{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 13px}
.ox-drs-ay-ad{display:inline-flex;align-items:center;gap:8px;min-height:44px;font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--ox-bas);border-radius:10px}
.ox-drs-ay-ad .ox-i{width:20px;height:20px;stroke-width:2.2}
.ox-drs-gez{display:flex;gap:2px;margin-right:-6px}
.ox-drs-gez button{display:grid;place-items:center;width:44px;height:44px;border-radius:12px}
.ox-drs-gez button>span{display:grid;place-items:center;width:31px;height:31px;border-radius:9px;background:transparent;border:1px solid var(--ox-cizgi);color:var(--ox-bas);box-shadow:0 1px 2px rgba(16,24,40,.04);transition:transform .1s}
.ox-drs-gez button:active>span{transform:scale(.94)}
.ox-drs-gez .ox-i{width:17px;height:17px;stroke-width:2.2}

/* hafta şeridi / ay ızgarası */
.ox-drs-takvim{margin:0 -4px}
.ox-drs-izgara{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}
.ox-drs-gun{position:relative;display:grid;justify-items:center;align-content:start;height:60px;padding-top:4px;border-radius:12px;font-variant-numeric:tabular-nums;transition:background-color .15s}
.ox-drs-gun small{font-size:13px;line-height:16px;font-weight:500;color:var(--ox-ikincil)}
.ox-drs-gun b{margin-top:1px;font-size:17px;line-height:22px;font-weight:600;color:#5d6783}
.ox-drs-gun i{display:block;width:5px;height:5px;border-radius:50%;margin-top:4px}
.ox-drs-gun i.var{background:var(--ox-mavi)}
.ox-drs-gun.kapali b{color:var(--ox-soluk)}
.ox-drs-gun.bugun b{color:var(--ox-mavi)}
.ox-drs-gun:active{background:var(--ox-gri-acik)}
.ox-drs-gun.secili{background:var(--ox-mavi);box-shadow:0 4px 12px -4px rgba(10,102,242,.45)}
.ox-drs-gun.secili small,.ox-drs-gun.secili b{color:#fff}
.ox-drs-gun.secili i.var{background:#fff}
.ox-drs-takvim.ay .ox-drs-gun{height:46px;align-content:center;padding-top:0}
.ox-drs-takvim.ay .ox-drs-gun b{font-size:16px}
.ox-drs-gun.disari b{color:var(--ox-soluk);font-weight:500}
.ox-drs-gun.secili.disari b{color:#fff}
.ox-drs-ay-gunler{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;margin-bottom:2px;text-align:center}
.ox-drs-ay-gunler small{font-size:13px;line-height:24px;font-weight:500;color:var(--ox-soluk)}

/* günün başlığı ve ders kartları */
.ox-drs-gun-bas{margin:32px 0 24px}
.ox-drs-gun-bas h2{font-size:19px;font-weight:700;letter-spacing:-.015em}
.ox-drs-gun-bas .ox-bolum-sag{font-weight:500}
.ox-drs-kart{display:grid;grid-template-columns:minmax(0,1fr) 12px auto 29px;grid-template-areas:"bas bas cip cip" "saat . tarih ok" "kim . plaka .";align-items:center;width:100%;padding:6px 8px 9px 18px;text-align:left;background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:var(--ox-r);box-shadow:var(--ox-golge);transition:transform .12s}
.ox-drs-kart+.ox-drs-kart{margin-top:12px}
button.ox-drs-kart:active{transform:scale(.985)}
/* sıradaki ders: sağ üstten yayılan açık mavi; bugünkü ders: çok açık şeftali */
.ox-drs-kart.mavi,.ox-drs-ozet.mavi{background:radial-gradient(62% 120% at 100% 0%,var(--ox-hero) 0%,color-mix(in srgb,var(--ox-hero) 45%,var(--ox-kart)) 45%,var(--ox-kart) 100%);border-color:#dfe9f8}
.ox-drs-kart.turuncu,.ox-drs-ozet.turuncu{--ox-drs-seftali:color-mix(in srgb,var(--ox-turuncu),var(--ox-kirmizi));background:linear-gradient(100deg,color-mix(in srgb,var(--ox-drs-seftali) 3%,var(--ox-kart)) 0%,color-mix(in srgb,var(--ox-drs-seftali) 5.5%,var(--ox-kart)) 100%);border-color:color-mix(in srgb,var(--ox-drs-seftali) 10%,var(--ox-cizgi))}
.ox-drs-bas{grid-area:bas;display:flex;align-items:center;gap:16px;min-width:0;height:24px}
.ox-drs-bas .ox-ik-kutu{width:24px;height:24px;border-radius:7px}
.ox-drs-bas .ox-ik-kutu .ox-i{width:17px;height:17px;stroke-width:2}
.ox-drs-kart .ox-ik-kutu.mavi,.ox-drs-kart .ox-ik-kutu.turuncu,.ox-drs-ozet .ox-ik-kutu{color:var(--ox-bas)}
.ox-drs-kart .ox-ik-kutu.mavi,.ox-drs-ozet .ox-ik-kutu.mavi{background:var(--ox-mavi-orta)}
.ox-drs-kart .ox-ik-kutu.turuncu,.ox-drs-ozet .ox-ik-kutu.turuncu{background:color-mix(in srgb,var(--ox-turuncu) 15%,#fff)}
.ox-drs-bas b{min-width:0;font-size:16px;line-height:1.25;font-weight:600;letter-spacing:-.012em;color:var(--ox-bas);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-drs-cip{grid-area:cip;justify-self:end;margin-right:19px}
.ox-drs-cip .ox-cip{height:20px;padding:0 9px;font-size:12px}
.ox-drs-kart.mavi .ox-cip,.ox-drs-ozet.mavi .ox-cip{background:var(--ox-mavi-orta)}
.ox-drs-kart.turuncu .ox-cip.gri{background:color-mix(in srgb,var(--ox-bas) 7%,var(--ox-kart))}
.ox-drs-saat{grid-area:saat;margin-top:6px;font-size:22px;line-height:1.2;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-drs-m{display:flex;align-items:center;gap:6px;min-width:0;height:18px;font-size:13px;line-height:1.35;color:var(--ox-ikincil)}
.ox-drs-m span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-drs-m .ox-i{width:17px;height:17px;stroke-width:1.7;color:#5d6783}
.ox-drs-tarih{grid-area:tarih;margin-top:6px}
.ox-drs-ok{grid-area:ok;margin-top:6px;justify-self:end}
.ox-drs-kim{grid-area:kim;margin-top:2px}
.ox-drs-plaka{grid-area:plaka;margin-top:2px}
.ox-drs-bos .ox-bos{padding:20px 20px 22px;gap:6px}
.ox-drs-bos .ox-ik-kutu.buyuk{width:52px;height:52px;border-radius:15px}
.ox-drs-bos .ox-ik-kutu.buyuk .ox-i{width:27px;height:27px}
.ox-drs-bos .ox-bos b{margin-top:4px;font-size:17px}
.ox-drs-bos .ox-bos .ox-dg{margin-top:8px}
.ox-drs-ekle{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;margin-top:12px;border:1.5px dashed #c9d6ea;border-radius:var(--ox-r);color:var(--ox-mavi);font-size:16px;font-weight:600}
.ox-drs-ekle .ox-i{width:20px;height:20px;stroke-width:2.2}
.ox-drs-ekle:active{background:var(--ox-mavi-acik)}
.ox-drs-engel{margin-top:12px}
.ox-drs-engel .ox-satir-govde small{line-height:1.35}
.ox-drs-engel-not .ox-not{margin-top:14px}
.ox-drs-tel{display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;margin:14px auto 0;padding:0 16px;color:var(--ox-mavi);font-size:15px;font-weight:600;border-radius:12px}
.ox-drs-tel .ox-i{width:24px;height:24px;stroke-width:1.8}
.ox-drs-tel:active{background:var(--ox-mavi-acik)}
.ox-drs-dip{margin-top:8px;text-align:center;font-size:13.5px;color:var(--ox-soluk)}

/* ayrıntı */
.ox-drs-ozet{padding:16px 18px 18px}
.ox-drs-ozet-ust{display:flex;align-items:center;gap:12px}
.ox-drs-ozet-ad{flex:1;min-width:0;display:grid;gap:1px}
.ox-drs-ozet-ad b{font-size:17px;font-weight:700;color:var(--ox-bas);line-height:1.25}
.ox-drs-ozet-ad small{font-size:14px;color:var(--ox-ikincil)}
.ox-drs-ozet-saat{display:block;margin-top:14px;font-size:34px;line-height:1.1;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-drs-ozet-tarih{margin-top:4px;font-size:15.5px;color:var(--ox-ikincil)}

/* gelişim */
.ox-drs-ilerlemeler{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ox-drs-ilerlemeler.tek{grid-template-columns:1fr}
.ox-drs-ilerlemeler .ox-kart+.ox-kart{margin-top:0}
.ox-drs-ilerleme{display:grid;gap:6px;padding:14px 16px 16px}
.ox-drs-ilerleme small{font-size:14px;color:var(--ox-ikincil)}
.ox-drs-ilerleme b{margin-bottom:4px;font-size:23px;line-height:1.15;font-weight:800;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-drs-ilerleme b span{margin-left:2px;font-size:15px;font-weight:500;color:var(--ox-ikincil)}
.ox-drs-beceri{padding:4px 16px}
.ox-drs-bs{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:12px;row-gap:8px;padding:12px 0}
.ox-drs-bs+.ox-drs-bs{border-top:1px solid var(--ox-ayrac)}
.ox-drs-bs .ox-serit{grid-column:1/-1}
.ox-drs-bs-ad{min-width:0;font-size:16px;font-weight:600;color:var(--ox-bas)}
.ox-drs-bs-d{display:inline-flex;align-items:center;gap:4px;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}
.ox-drs-bs-d.yesil{color:var(--ox-yesil)}.ox-drs-bs-d.turuncu{color:#c26a00}.ox-drs-bs-d.kirmizi{color:var(--ox-kirmizi)}
.ox-drs-bs-d em{display:grid;font-style:normal}
.ox-drs-bs-d em .ox-i{width:16px;height:16px;stroke-width:2.4}
.ox-drs-bs-d em.yukari{color:var(--ox-yesil)}.ox-drs-bs-d em.asagi{color:var(--ox-kirmizi)}
.ox-drs-not{margin:0;padding:16px 18px}
.ox-drs-not blockquote{margin:0;font-size:16px;line-height:1.45;color:var(--ox-bas)}
.ox-drs-not figcaption{margin-top:8px;font-size:14px;color:var(--ox-ikincil)}
.ox-drs-not+.ox-drs-not{margin-top:12px}

/* geçmiş */
.ox-drs-onay{padding:14px 16px}
.ox-drs-onay+.ox-drs-onay{margin-top:12px}
.ox-drs-onay-ust{display:grid;gap:2px;margin-bottom:12px}
.ox-drs-onay-ust b{font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-drs-onay-ust small{font-size:14px;color:var(--ox-ikincil)}
.ox-drs-onay-dg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ox-drs-onay-dg .ox-dg{min-height:44px}
.ox-drs-govde>.ox-dg-metin{display:flex;margin:6px auto 0}
.ox .ox-drs-deg{padding:16px;border-color:var(--ox-cizgi)}
.ox-drs-deg-ust{display:grid;gap:2px}
.ox-drs-deg-ust b{font-size:17px;font-weight:700;color:var(--ox-bas)}
.ox-drs-deg-ust small{font-size:14px;color:var(--ox-ikincil)}
.ox-drs-yildiz{display:flex;gap:4px;margin:8px 0 8px -6px}
.ox-drs-deg>.ox-drs-yildiz:first-child{margin-top:-6px}
.ox-drs-yildiz button{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;color:#c3cad8}
.ox-drs-yildiz button .ox-i{width:30px;height:30px;stroke-width:1.6;transition:transform .12s}
.ox-drs-yildiz button.secili{color:var(--ox-sari)}
.ox-drs-yildiz button.secili .ox-i{fill:currentColor}
.ox-drs-yildiz button:active .ox-i{transform:scale(.88)}
.ox .ox-drs-deg textarea{display:block;width:100%;min-height:64px;margin:0;padding:10px 12px;border:1px solid var(--ox-cizgi);border-radius:12px;background:var(--ox-zemin);font:inherit;font-size:16px;color:var(--ox-bas);resize:none;box-shadow:none}
.ox .ox-drs-deg textarea:focus{outline:2px solid var(--ox-mavi);outline-offset:0;background:#fff}
.ox-drs-deg-alt{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}
.ox-drs-deg-alt small{font-size:13.5px;color:var(--ox-soluk)}
.ox-drs-puan{padding:14px 16px}
.ox-drs-puan p{margin-top:8px;font-size:15px;color:var(--ox-metin)}
.ox-drs-yildizlar{display:inline-flex;gap:2px}
.ox-drs-yildizlar .ox-i{width:22px;height:22px;stroke-width:1.6;color:#c3cad8}
.ox-drs-yildizlar .ox-i.dolu{color:var(--ox-sari)}
.ox-drs-puan-k{display:inline-flex;align-items:center;gap:3px;font-size:15px;font-weight:700;color:var(--ox-bas)}
.ox-drs-puan-k .ox-i{width:17px;height:17px;color:var(--ox-sari)}
.ox-drs-defter{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:14px 6px}
.ox-drs-defter div{display:grid;justify-items:center;gap:2px;min-width:0;text-align:center}
.ox-drs-defter div+div{border-left:1px solid var(--ox-ayrac)}
.ox-drs-defter small{font-size:12.5px;color:var(--ox-ikincil);white-space:nowrap}
.ox-drs-defter b{font-size:21px;font-weight:800;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-drs-defter b.yesil{color:var(--ox-yesil)}.ox-drs-defter b.kirmizi{color:var(--ox-kirmizi)}
.ox-drs-gecmis .ox-satir-sag{display:flex;align-items:center}
.ox-drs-deg+.ox-bolum{margin-top:28px}
`);
// yönlendirici kancaları: 'program' | 'gelisim' | 'gecmis' sekmesini açar
export const ac = g => { sekme = ['program', 'gelisim', 'gecmis'].includes(g) ? g : 'program'; acik = null; ayAcik = false; };
export const sifirla = () => { sekme = 'program'; secili = null; acik = null; ayAcik = false; };
stilEkle('ox-drs-dar', `@media (max-width:360px){.ox-drs-kart{grid-template-areas:"bas bas bas bas" "cip cip cip cip" "saat . tarih ok" "kim . plaka ."}.ox-drs-cip{justify-self:start;margin:2px 0 4px 54px}.ox-drs-bas b{white-space:normal;overflow:visible;text-overflow:clip}}`);
