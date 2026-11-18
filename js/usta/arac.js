// Öğretmen › Bugün alt ekranları (yeni tasarım): Aracım (arac), Sınav güzergâhları (guzergah), Hesabım (hesap).
// Eski portal.js "Aracın" bölümü (model, plaka, bakıma kalan km), guzergah.js ustaHtml (güzergâhlar, püf noktaları, kursa iletilen notlar,
// "Püf noktası ekle" formu: data-gz-usta, guzergah.js'teki ortak submit dinleyicisi işler) ve app.js hesap penceresi (Kursu ara, mdSinyal Destek:
// data-destek, Çıkış yap / Kullanıcı değiştir: data-cikis; ikisi de app.js'teki belge dinleyicisinde çalışır) buraya taşındı.
import { S, SINIFLAR, oturum, tarihOku, sinifEtiket, anaSinif, fark, kaydet } from '../veri.js?v=234';
import { haftaYuku, izinKarti } from './bugun.js?v=234';
import { ayAdi, tarih, bildir } from '../ui.js?v=234';
import { guzergahlar } from '../guzergah.js?v=234';
import { kisaMetin } from '../guncelleme.js?v=234';
import * as ARC from '../ogr/araclar.js?v=234';
import * as B from '../bulut.js?v=234';
import { esc, oi, sayfaBas, geri, bolum, kart, gorsel, dugme, satir, liste, radyo, ikonKutu, bos, not, stilEkle } from '../ogr/ui.js?v=234';

const geriBugun = () => geri('Bugün', { 'data-ux-alt': '' });
const uzunTarih = t => { if (!t) return ''; const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true) + ' ' + d.getFullYear(); };
const sayi = n => (Math.round(+n) || 0).toLocaleString('tr-TR');
const harfler = ad => String(ad || '?').trim().split(/\s+/).filter(Boolean).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr') || '?';

/* ---------- Aracım ---------- */
function aracKart(a) {
  // sınıf: "B sınıfı · Otomatik/Engelli" (veri.js sinifEtiket); vites satırı yalnız manuel/otomatik bilgisi varsa ("Vites: Engelli" yazılmaz)
  const kod = a.sinif ? anaSinif(a.sinif) : '', S0 = SINIFLAR[a.sinif] || {}, parca = String(S0.ad || '').split(' · ')[1] || '';
  const vites = a.vites || (/manuel|otomatik/i.test(parca) ? parca : '');
  const km = (+a.bakimKm || 0) - (+a.km || 0);
  const bakim = a.bakimKm ? liste([satir({
    sol: ikonKutu('ayar', km <= 0 ? 'kirmizi' : km <= 500 ? 'turuncu' : 'mavi'),
    baslik: km <= 0 ? 'Bakım zamanı geldi' : `Bakıma ${sayi(km)} km`,
    alt: `Bakım ${sayi(a.bakimKm)} km’de${a.km ? ` · şu an ${sayi(a.km)} km` : ''}`, altTon: km <= 0 ? 'kirmizi' : '', ok: false,
  })], 'ox-uar-bakim') : '';
  const tablo = [
    ['Marka / Model', a.model], ['Plaka', a.plaka], ['Vites', vites], ['Sınıf', kod], ['Model yılı', a.yil],
    ['Kilometre', a.km ? sayi(a.km) + ' km' : ''], ['Muayene', uzunTarih(a.muayene)], ['Trafik sigortası', uzunTarih(a.sigorta)], ['Kasko', uzunTarih(a.kasko)],
  ].filter(([, v]) => v != null && v !== '');
  return `<section class="ox-hero ox-uar-arac">${gorsel('usta-arac', a.model || 'Araç', 'ox-uar-arac-g')}
      <div class="ox-uar-arac-yazi"><h2>${esc(a.model || 'Araç')}</h2><p class="ox-uar-plaka">${esc(a.plaka || '')}</p>${a.sinif ? `<p>${esc(sinifEtiket(a.sinif))}${vites && !/manuel|otomatik/i.test(sinifEtiket(a.sinif)) ? ' · ' + esc(vites) : ''}</p>` : ''}</div></section>`
    + (bakim ? `<div class="ox-uar-ara">${bakim}</div>` : '')
    + bolum('Araç bilgileri')
    + `<div class="ox-liste ox-uar-tablo">${tablo.map(([e, v]) => `<div class="ox-uar-tsat"><span>${esc(e)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
}
function aracHtml(ctx) {
  const l = S.araclar.filter(a => a.egitmen === ctx.eg.id);
  if (!l.length) return geriBugun() + sayfaBas('Aracım') + kart(bos('arac', 'Sana araç verilmemiş', 'Kurs müdürü sana araç verince plakası ve bakım bilgisi burada görünür.'), 'ox-uar-bos');
  return geriBugun() + sayfaBas(l.length > 1 ? 'Araçlarım' : 'Aracım') + l.map(aracKart).join('<div class="ox-uar-aralik"></div>')
    + not('Araçta arıza ya da hasar varsa kurs müdürüne hemen haber ver; dersi iptal etmen gerekirse ders menüsünde “Araç arızalı” nedenini seç.');
}

/* ---------- Sınav güzergâhları ---------- */
let gzSecili = null;
function gzHtml() {
  const l = guzergahlar(), u = oturum.kullanici;
  if (!l.length) return geriBugun() + sayfaBas('Sınav güzergâhları') + kart(bos('harita', 'Henüz güzergâh yok', 'Kurs uygulama sınavının başladığı yeri ve güzergâhları ekleyince burada görünür.'), 'ox-uar-bos');
  if (!l.some(g => g.id === gzSecili)) gzSecili = l[0].id;
  const bekleyen = (S.pufGelen || []).filter(p => !l.some(g => (g.puflar || []).some(x => x.id === p.id)));
  const mesafe = g => g.mesafe ? String(g.mesafe).replace('.', ',') + (/km$/i.test(String(g.mesafe)) ? '' : ' km') : '';
  const altYazi = g => [g.baslangic, mesafe(g)].filter(Boolean).map(esc).join(' · ') || `${(g.puflar || []).length} püf noktası`;
  const secim = l.length > 1 ? `<div class="ox-liste ox-uar-gz-sec" role="radiogroup" aria-label="Güzergâh seç">${l.map(g => radyo(`<span class="ox-uar-gz-ad"><b>${esc(g.ad)}</b><small>${altYazi(g)}</small></span>`, g.id === gzSecili, { 'data-uar-gz': g.id })).join('')}</div>` : '';
  const ayrinti = l.map(g => {
    const pl = [...(g.puflar || []), ...bekleyen.filter(p => p.guzergah === g.id).map(p => ({ ...p, bekliyor: true }))];
    const harita = g.harita || (g.baslangic ? 'https://www.google.com/maps/search/' + encodeURIComponent(g.baslangic + ' ' + (S.kurs.sehir || '')) : '');
    const bilgi = [
      satir({ ikon: 'konum', baslik: esc(g.baslangic || 'Başlangıç yeri girilmedi'), alt: ['Başlangıç', mesafe(g)].filter(Boolean).map(esc).join(' · '), ok: false, etiket: 'a', attrs: harita ? { href: harita, target: '_blank', rel: 'noopener', 'aria-label': `${g.baslangic || g.ad}: haritada aç` } : null, sag: harita ? `<span class="ox-uar-dis">Harita${oi('dis')}</span>` : '' }),
    ];
    const notlar = pl.length ? pl.map(p => `<figure class="ox-kart ox-uar-not${p.bekliyor ? ' bekliyor' : ''}"><blockquote>“${esc(p.metin)}”</blockquote><figcaption>${p.bekliyor ? `${oi('saat')}Kursa iletildi · ${esc(tarih(p.tarih))}` : `${esc(p.kim || 'Kurs')}${p.tarih ? ' · ' + esc(tarih(p.tarih)) : ''}`}</figcaption></figure>`).join('')
      : liste([satir({ ikon: 'ampul', ton: 'gri', baslik: 'Henüz püf noktası yok', alt: 'Bu güzergâhta dikkat edilecek bir yer biliyorsan ilk notu sen ekle.', ok: false })]);
    const form = u && u.rol === 'usta' ? `<button type="button" class="ox-dg ox-dg-cizgi genis ox-uar-ekle" data-uar-ekle="${esc(g.id)}" aria-expanded="false">${oi('kalem')}<span>Püf noktası ekle</span></button>
      <form class="ox-kart ox-uar-form" data-gz-usta="${esc(g.id)}" hidden><label for="ox-uar-m-${esc(g.id)}">Püf noktası · ${esc(g.ad)}</label><textarea id="ox-uar-m-${esc(g.id)}" name="m" rows="3" maxlength="300" placeholder="Örn. Okul geçidinde mutlaka tam dur" required></textarea>
        <div class="ox-uar-form-dg">${dugme('Vazgeç', { 'data-uar-vazgec': g.id }, { tur: 'cizgi', kucuk: true })}<button type="submit" class="ox-dg ox-dg-ana kucuk"><span>Kursa gönder</span></button></div>
        <p>Not kursa iletilir; kurs işleyince bütün öğretmenler ve öğrenciler görür.</p></form>` : '';
    return `<section class="ox-uar-gz" data-uar-gz-ic="${esc(g.id)}"${g.id === gzSecili ? '' : ' hidden'}>
      ${l.length > 1 ? bolum(esc(g.ad)) : ''}${liste(bilgi)}
      ${g.tarif ? `<div class="ox-kart ox-uar-tarif"><b>Güzergâh tarifi</b><p>${esc(g.tarif)}</p></div>` : ''}
      ${bolum('Öğretmen notları', pl.length ? `${pl.length} püf noktası` : '')}${notlar}${form}</section>`;
  }).join('');
  return geriBugun() + sayfaBas('Sınav güzergâhları', l.length > 1 ? `${l.length} güzergâh · uygulama sınavı` : esc(l[0].ad)) + secim + ayrinti;
}
function gzBagla(kap) {
  kap.addEventListener('click', ev => {
    const r = ev.target.closest('[data-uar-gz]');
    if (r) {
      gzSecili = r.dataset.uarGz;
      kap.querySelectorAll('[data-uar-gz]').forEach(b => { const s = b === r; b.classList.toggle('secili', s); b.setAttribute('aria-checked', String(s)); });
      kap.querySelectorAll('[data-uar-gz-ic]').forEach(s => { s.hidden = s.dataset.uarGzIc !== gzSecili; });
      return;
    }
    const e = ev.target.closest('[data-uar-ekle]');
    if (e) {
      const f = kap.querySelector(`form[data-gz-usta="${CSS.escape(e.dataset.uarEkle)}"]`); if (!f) return;
      f.hidden = false; e.hidden = true; e.setAttribute('aria-expanded', 'true'); f.m.focus({ preventScroll: true });
      f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const v = ev.target.closest('[data-uar-vazgec]');
    if (v) {
      const f = v.closest('form'), b = kap.querySelector(`[data-uar-ekle="${CSS.escape(v.dataset.uarVazgec)}"]`);
      f.hidden = true; f.m.value = ''; if (b) { b.hidden = false; b.setAttribute('aria-expanded', 'false'); b.focus({ preventScroll: true }); }
    }
  });
}

/* ---------- Hesabım ---------- */
function hesapHtml(ctx) {
  const eg = ctx.eg, u = oturum.kullanici || {}, tel = String(S.kurs.tel || '').replace(/\s/g, '');
  const foto = eg.foto ? `<img src="${esc(eg.foto)}" alt="">` : esc(harfler(eg.ad || u.ad));
  const kim = `<div class="ox-kart ox-uar-kim"><span class="ox-uar-av" aria-hidden="true">${foto}</span><div><h2>${esc(eg.ad || u.ad || '')}</h2><p>${esc(S.kurs.ad || '')}</p><p>Öğretmen</p></div></div>`;
  const satirlar = [
    tel ? satir({ ikon: 'tel', baslik: 'Kursu ara', alt: esc(S.kurs.tel), etiket: 'a', attrs: { href: 'tel:' + tel } }) : '',
    satir({ ikon: 'oynat', baslik: 'Animasyonlar · görüşün', alt: 'Öğrencilerin izlediği animasyonları gözden geçir', attrs: { 'data-ux-alt': 'anim' } }),
    satir({ ikon: 'takvim', baslik: 'Müsait olmadığım gün', alt: 'İzin ya da mazeret bildir; kurs onaylayınca o gün ders verilmez', attrs: { 'data-ux-alt': 'izin' } }),
    satir({ ikon: 'mesaj', baslik: 'mdSinyal Destek', alt: 'Sorun, soru ya da istek bildir', attrs: { 'data-destek': true } }),
    // kurulu sürüm ve güncelleme denetimi (tıklama js/guncelleme.js'te)
    satir({ ikon: 'sifirla', ton: 'gri', baslik: 'Uygulama sürümü', alt: `<span data-sg-metin>${esc(kisaMetin())}</span>`, attrs: { 'data-sg-denetle': true } }),
  ].filter(Boolean);
  // UYG-009: çalışma izni ve haftalık ders yükü
  const iz = eg.mebIzinBitis ? satir({ ikon: 'kimlik', ton: fark(eg.mebIzinBitis) <= 30 ? 'turuncu' : 'gri', baslik: 'Çalışma izni', alt: esc(`${tarih(eg.mebIzinBitis)} tarihine kadar${fark(eg.mebIzinBitis) < 0 ? ' · bitti' : fark(eg.mebIzinBitis) <= 30 ? ` · ${fark(eg.mebIzinBitis)} gün kaldı` : ''}`), ok: false }) : '';
  const hy = haftaYuku(eg), hs = hy.n || hy.sinir ? satir({ ikon: 'takvim', ton: 'gri', baslik: 'Bu hafta', alt: `${hy.n}${hy.sinir ? ' / ' + hy.sinir : ''} ders`, ok: false }) : '';
  return geriBugun() + sayfaBas('Hesabım') + kim + izinKarti(eg)
    + (iz || hs ? `<div class="ox-uar-ara">${liste([iz, hs].filter(Boolean))}</div>` : '')
    + `<div class="ox-uar-ara">${liste(satirlar)}</div>`
    + `<div class="ox-uar-ara">${liste([satir({ ikon: 'cikis', ton: 'kirmizi', baslik: u.bulut ? 'Çıkış yap' : 'Kullanıcı değiştir', attrs: { 'data-cikis': true }, ok: false, cls: 'ox-uar-cikis' })])}</div>`
    + not('Bilgilerin yanlışsa kurs müdürüne söyle; adını ve telefonunu kurs günceller.');
}

export function altEkran(ad, ctx) {
  const a = String(ad || '').split(':')[0];
  if (a === 'arac') return { html: aracHtml(ctx) };
  if (a === 'guzergah') return { html: gzHtml(), baglan: gzBagla };
  if (a === 'hesap') return { html: hesapHtml(ctx) };
  if (a === 'izin') return { html: izinHtml(ctx), baglan: kap => izinBagla(kap, ctx) };
  if (a === 'anim') return { html: animListeHtml() };
  if (a === 'onizle') return animOnizle(String(ad).slice(7), ctx);
  return null;
}

stilEkle('ox-uar', `
.ox-uar-ara{margin-top:12px}
.ox-uar-aralik{height:28px}
.ox-uar-bos{margin-top:4px}
/* araç */
.ox-uar-arac{padding:14px 20px 20px}
.ox-uar-arac-g{width:min(84%,300px);aspect-ratio:16/10;height:auto;margin:-10px auto -4px;mix-blend-mode:multiply}
.ox-uar-arac-yazi{margin-top:6px}
.ox-uar-arac-yazi h2{font-size:23px;line-height:1.15;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas)}
.ox-uar-arac-yazi p{margin-top:4px;font-size:15px;color:var(--ox-ikincil)}
.ox-uar-arac-yazi .ox-uar-plaka{margin-top:6px;font-size:18px;font-weight:700;letter-spacing:.02em;color:var(--ox-metin);font-variant-numeric:tabular-nums}
.ox-uar-tablo{overflow:hidden}
.ox-uar-tsat{position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:50px;padding:12px 16px;font-size:15.5px}
.ox-uar-tsat+.ox-uar-tsat::before{content:"";position:absolute;top:0;right:16px;left:16px;border-top:1px solid var(--ox-ayrac)}
.ox-uar-tsat span{flex:none;color:var(--ox-ikincil)}
.ox-uar-tsat b{min-width:0;text-align:right;font-weight:600;color:var(--ox-bas);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
/* güzergâh */
.ox-uar-gz-sec{margin-bottom:4px}
.ox-uar-gz-sec .ox-radyo{min-height:64px;gap:14px}
.ox-uar-gz-ad{display:grid;gap:2px;min-width:0}
.ox-uar-gz-ad b{font-size:16px;line-height:1.25;font-weight:700;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-uar-gz-ad small{font-size:14px;line-height:1.3;color:var(--ox-ikincil);overflow-wrap:anywhere}
.ox-uar-gz>.ox-liste:first-child{margin-top:12px}
.ox-uar-dis{display:inline-flex;align-items:center;gap:4px;color:var(--ox-mavi);font-size:15px;font-weight:600}
.ox-uar-dis .ox-i{width:17px;height:17px;stroke-width:2.1}
.ox-uar-gz a.ox-satir{text-decoration:none;color:inherit}
.ox-uar-tarif{margin-top:12px;padding:14px 16px}
.ox-uar-tarif b{display:block;font-size:15px;font-weight:700;color:var(--ox-bas)}
.ox-uar-tarif p{margin-top:4px;font-size:15px;line-height:1.45;color:var(--ox-metin);white-space:pre-wrap;overflow-wrap:anywhere}
.ox-uar-not{margin:0;padding:14px 16px}
.ox-uar-not+.ox-uar-not{margin-top:10px}
.ox-uar-not blockquote{margin:0;font-size:16px;line-height:1.45;font-style:italic;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-uar-not figcaption{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:13.5px;color:var(--ox-ikincil)}
.ox-uar-not figcaption .ox-i{width:16px;height:16px;color:var(--ox-turuncu)}
.ox-uar-not.bekliyor{background:#fffaf2;border-color:#f6e3c4}
.ox-uar-ekle{margin-top:14px;color:var(--ox-mavi)!important;border-color:#cfe0fb!important}
.ox-uar-form{margin-top:14px;padding:14px 16px;display:grid;gap:10px}
.ox-uar-form label{font-size:15px;font-weight:700;color:var(--ox-bas)}
.ox-uar-form textarea{width:100%;min-height:92px;padding:12px 14px;border:1px solid var(--ox-cizgi);border-radius:12px;font:inherit;font-size:16px;line-height:1.4;color:var(--ox-bas);background:#fff;resize:vertical}
.ox-uar-form textarea:focus{outline:2.5px solid var(--ox-mavi);outline-offset:1px;border-color:transparent}
.ox-uar-form-dg{display:flex;justify-content:flex-end;gap:10px}
.ox-uar-form p{font-size:13.5px;line-height:1.4;color:var(--ox-ikincil)}
/* hesap */
.ox-uar-kim{display:flex;align-items:center;gap:16px;padding:18px 16px}
.ox-uar-av{flex:none;display:grid;place-items:center;width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--ox-mavi-orta);color:var(--ox-mavi);font-size:25px;font-weight:700;box-shadow:0 0 0 3px #fff,0 1px 6px rgba(16,24,40,.12)}
.ox-uar-av img{width:100%;height:100%;object-fit:cover}
.ox-uar-kim>div{min-width:0}
.ox-uar-kim h2{font-size:20px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-uar-kim p{margin-top:3px;font-size:15px;color:var(--ox-ikincil);overflow-wrap:anywhere}
.ox-uar-cikis .ox-satir-govde b{color:var(--ox-kirmizi)}
a.ox-satir{text-decoration:none;color:inherit}
`);

/* UYG-010: 'müsait değilim' bildirimi — öğretmen gün (ya da aralık) ve neden yazar; ofiste onay bekleyen izin talebi olur (bulut.js ustaUygula) */
const IZ_DURUM = { bekliyor: ['Kursun onayında', 'turuncu'], onaylandi: ['Onaylandı', 'yesil'], reddedildi: ['Onaylanmadı', 'kirmizi'] };
function izinHtml(ctx) {
  const l = (S.izinTalepleri || []).filter(t => t.kim === ctx.eg.id).slice(0, 12), bugun = new Date().toISOString().slice(0, 10);
  return geri('Hesabım', { 'data-ux-alt': 'hesap' }) + sayfaBas('Müsait olmadığım gün', 'Kurs onaylayınca o günlere ders planlanmaz.')
    + kart(`<form class="ox-uiz-form" data-uiz-form novalidate><label>İlk gün<input type="date" name="bas" min="${bugun}" value="${bugun}" required></label><label>Son gün<input type="date" name="bit" min="${bugun}" value="${bugun}" required></label><label class="tam">Neden <small>isteğe bağlı</small><input name="neden" maxlength="200" placeholder="Ör. hastane randevusu"></label><p class="ox-uiz-hata" data-uiz-hata hidden></p><button type="submit" class="ox-dg ox-dg-ana genis"><span>Kursa bildir</span></button></form>`)
    + (l.length ? bolum('Bildirimlerin') + liste(l.map(t => satir({ ikon: 'takvim', ton: IZ_DURUM[t.durum] ? IZ_DURUM[t.durum][1] : 'gri', baslik: esc(t.bas === t.bit ? tarih(t.bas) : tarih(t.bas) + ' – ' + tarih(t.bit)), alt: esc([IZ_DURUM[t.durum] ? IZ_DURUM[t.durum][0] : t.durum, t.neden].filter(Boolean).join(' · ')), ok: false }))) : '');
}
function izinBagla(kap, ctx) {
  stilEkle('ox-uiz', '.ox-uiz-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px}.ox-uiz-form label{display:grid;gap:6px;font-size:14px;font-weight:600}.ox-uiz-form label.tam,.ox-uiz-form button,.ox-uiz-form p{grid-column:1/-1}.ox-uiz-form input{height:46px;border:1.5px solid var(--ox-cizgi);border-radius:12px;padding:0 12px;font:inherit;font-size:16px;background:var(--ox-kart);min-width:0}.ox-uiz-form small{font-weight:400;color:var(--ox-ikincil)}.ox-uiz-hata{color:var(--ox-kirmizi);font-size:14px;margin:0}');
  const f = kap.querySelector('[data-uiz-form]'); if (!f) return;
  f.addEventListener('submit', ev => {
    ev.preventDefault(); const h = f.querySelector('[data-uiz-hata]'), bas = f.bas.value, bit = f.bit.value || bas;
    if (!bas || bit < bas) { h.hidden = false; h.textContent = 'Son gün ilk günden önce olamaz.'; return; }
    S.izinTalepleri = [{ id: 'it' + Date.now().toString(36), kim: ctx.eg.id, bas, bit, neden: f.neden.value.trim().slice(0, 200), tarih: new Date().toISOString().slice(0, 10), durum: 'bekliyor' }, ...(S.izinTalepleri || [])];
    kaydet(); ctx.altAc('izin');
  });
}

/* UYG-020 (SOR-098): öğrencinin izlediği animasyonları usta öğretici gözden geçirir; her birinin altında "Doğru mu?" görüşü mdSinyal'e gider
   (worker /soru-bildir, anim). Animasyon öğrenci uygulamasının kendi ekranıyla (ogr/araclar.js) örnek bir B sınıfı öğrenciyle çizilir. */
const ANIM = [['etkilesim:motor', 'Motorun çalışması'], ['etkilesim:ikaz', 'Gösterge paneli ve ikaz lambaları'], ['etkilesim:kalkis', 'Debriyajla kalkış'], ['tehlike', 'Tehlike algısı sahneleri'], ['direksiyon', 'Uygulama sınavı şemaları']];
const GORUS = 'sinyal-anim-gorus';
const gorusOku = () => { try { return JSON.parse(localStorage.getItem(GORUS) || '{}'); } catch (x) { return {}; } };
function animListeHtml() {
  const g = gorusOku();
  return geri('Hesabım', { 'data-ux-alt': 'hesap' }) + sayfaBas('Animasyonlar', 'Öğrenciler bunları izleyip çalışıyor. Bir usta öğretici olarak doğru olup olmadığını söyle.')
    + liste(ANIM.map(([id, ad]) => satir({ ikon: 'oynat', ton: g[id] === 'dogru' ? 'yesil' : g[id] ? 'turuncu' : 'mavi', baslik: esc(ad), alt: g[id] === 'dogru' ? 'Doğru dedin' : g[id] ? 'Düzeltilmeli dedin' : 'Henüz bakmadın', attrs: { 'data-ux-alt': 'onizle:' + id } })))
    + not('Görüşün mdSinyal ekibine gider; düzeltilmesi gereken yerleri yazarsan içerik buna göre düzeltilir.');
}
function animOnizle(id, ctx) {
  const x = ANIM.find(y => y[0] === id.split('|')[0]) || ANIM.find(y => id.startsWith(y[0]));
  let y = null;
  const ogrCtx = { k: { id: 'onizleme', ad: 'Örnek', soyad: 'Öğrenci', sinif: 'B', direksiyon: 0, tehlike: [] }, yenile: ctx.yenile, git: () => { }, S0: SINIFLAR.B };
  try { y = ARC.altEkran(id, ogrCtx); } catch (e) { y = null; }
  if (!y) return { html: geri('Animasyonlar', { 'data-ux-alt': 'anim' }) + kart(bos('uyari', 'Açılamadı', 'Bu animasyon şu an gösterilemiyor.')) };
  // öğrenci ekranının iç gezinmesi öğretmen ekranında da çalışsın: data-ox-alt → data-ux-alt="onizle:…", Öğren'e dönüş → animasyon listesi
  const html = y.html.replace(/data-ox-alt="([^"]*)"/g, (_, a) => a ? `data-ux-alt="onizle:${esc(a)}"` : 'data-ux-alt="anim"').replace(/data-ox-arc-sekme="([^"]*)"/g, (m, a) => `${m} data-ux-alt="onizle:etkilesim:${esc(a)}"`).replace(/(<button type="button" class="ox-geri" data-ux-alt="anim">[\s\S]*?<span>)[^<]*(<\/span>)/, '$1Animasyonlar$2');
  const ad = x ? x[1] : id, g = gorusOku()[x ? x[0] : id];
  const gorus = `<div class="ox-kart ox-uan-gorus" data-uan="${esc(x ? x[0] : id)}" data-uan-ad="${esc(ad)}"><b>Bu animasyon doğru mu?</b>${g ? `<small>${g === 'dogru' ? 'Doğru dedin; teşekkürler.' : 'Düzeltilmeli dedin; teşekkürler.'} İstersen yeniden gönderebilirsin.</small>` : ''}<textarea data-uan-not maxlength="300" placeholder="Düzeltilmesi gereken yer (isteğe bağlı)"></textarea><div class="ox-uan-dg"><button type="button" class="ox-dg ox-dg-ikincil" data-uan-karar="duzelt"><span>Düzeltilmeli</span></button><button type="button" class="ox-dg ox-dg-ana" data-uan-karar="dogru"><span>Doğru</span></button></div></div>`;
  return { html: `<div class="ox-uan">${html}</div>` + gorus, baglan: kap => { if (y.baglan) { try { y.baglan(kap); } catch (e) { console.error(e); } } animGorusBagla(kap); } };
}
function animGorusBagla(kap) {
  stilEkle('ox-uan', '.ox-uan-gorus{display:grid;gap:10px;padding:16px;margin-top:16px}.ox-uan-gorus small{color:var(--ox-ikincil)}.ox-uan-gorus textarea{min-height:70px;border:1.5px solid var(--ox-cizgi);border-radius:12px;padding:10px 12px;font:inherit;font-size:15px;resize:vertical}.ox-uan-dg{display:grid;grid-template-columns:1fr 1fr;gap:10px}');
  const k = kap.querySelector('[data-uan]'); if (!k) return;
  k.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-uan-karar]'); if (!b) return;
    const karar = b.dataset.uanKarar, notu = k.querySelector('[data-uan-not]').value.trim();
    if (karar === 'duzelt' && !notu) { k.querySelector('[data-uan-not]').focus(); return bildir('Neyin düzeltilmesi gerektiğini kısaca yaz', 'uyari'); }
    const o = gorusOku(); o[k.dataset.uan] = karar; try { localStorage.setItem(GORUS, JSON.stringify(o)); } catch (x) { }
    if (B.bulut && B.bulut.kurs) { try { await fetch(B.WORKER + '/soru-bildir', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ anim: k.dataset.uan, ad: k.dataset.uanAd, karar, not: notu }), mode: 'cors', credentials: 'omit' }); } catch (x) { } }
    bildir('Görüşün iletildi, teşekkürler'); k.querySelector('small') ? k.querySelector('small').textContent = (karar === 'dogru' ? 'Doğru dedin; teşekkürler.' : 'Düzeltilmeli dedin; teşekkürler.') : k.querySelector('b').insertAdjacentHTML('afterend', `<small>${karar === 'dogru' ? 'Doğru dedin; teşekkürler.' : 'Düzeltilmeli dedin; teşekkürler.'}</small>`);
  });
}
