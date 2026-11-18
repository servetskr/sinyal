// Ana sayfa sekmesi (yeni tasarım): selam, ehliyet yolculuğu (Teorik · Direksiyon · Sınav), yapılacaklar (teklif, onay, uyarı),
// sıradaki ders (takvim yaprağı) ve son dersin değerlendirmesi, sınava hazırlık kartı, kurs işlemleri (ödeme, belgeler), ana ekrana ekle.
import { S, ASAMALAR, EVRAKLAR, egitmen, arac, ogretmen, fark, tarihOku, kalanBorc, ogrOzellik, gerekliDireksiyon, sinifEtiket, egitimSinifi, teorikVar } from '../veri.js?v=234';
import { gerekliDireksiyon } from '../veri.js?v=234';
import { gunKisa, gunAdi, ayAdi, tarih } from '../ui.js?v=234';
import * as OG from '../ogrenci.js?v=234';
import * as HZ from '../hazirlik.js?v=234';
import { esc, oi, tl, sayfaBas, bolum, baglanti, kart, heroKart, gorsel, dugme, ikonKutu, bos, stilEkle } from './ui.js?v=234';

// sınav simgesi: kontrol listeli pano ve küçük bayrak (ui.js'te yok)
const SINAV_IK = '<svg class="ox-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 20.5H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5"/><path d="M8.5 4.5V3.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v.7"/><path d="m7.2 9.6 1.2 1.2 2.2-2.3M12.6 9.6h1.9M7.2 14.6l1.2 1.2 2.2-2.3M12.6 14.6h.4"/><path d="M16 21.5v-7.3h4.8l-.9 1.8.9 1.8H16"/></svg>';

const ASAMA = {
  teorik: ['Teorik', oi('kitap'), 'mavi'],
  direksiyon: ['Direksiyon', oi('direksiyon'), 'mavi'],
  sinav: ['Sınav', SINAV_IK, 'mor'],
  belge: ['Belge', oi('belge'), 'mor'],  // eğitim türü sınıf (100 ceza puanı): sınav yok, kurs eğitim belgesi verir
};

// "Bugün, 11:00" · "Yarın, 12:00" · "Cumartesi, 10:00" · "28 Kasım, 10:00"
function zaman(t, saat) {
  const f = fark(t), d = tarihOku(t);
  const g = f === 0 ? 'Bugün' : f === 1 ? 'Yarın' : f > 1 && f < 7 ? gunAdi(t) : d.getDate() + ' ' + ayAdi(d.getMonth(), true);
  return `${g}, ${saat}`;
}
// "Taksitin yarın" · "Taksitine 4 gün kaldı"
const kalanGun = (t, a, b) => { const f = fark(t); return f <= 0 ? `${a} bugün` : f === 1 ? `${a} yarın` : `${b} ${f} gün kaldı`; };
const uzunTarih = t => { const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };

// sınıf satırı: "B sınıfı · Manuel/Otomatik/Engelli", "100 ceza puanı eğitimi"
const sinifMetni = k => sinifEtiket(k.sinif, k);

/* ---------- ehliyet yolculuğu ---------- */
// Teorik eğitimi olmayan (fark, e-sınav muafı, otomatikten manuele, römork) öğrencide Teorik adımı yok;
// eğitim türü sınıfta (100 ceza puanı) adımlar Teorik · Belge (sınav ve ehliyet yok, MTSK md.16/3)
function yolculuk(k, S0, sinav) {
  const dir = gerekliDireksiyon(k) > 0, tv = teorikVar(k), egt = egitimSinifi(k.sinif);
  const adimlar = egt ? ['teorik', 'belge'] : [...(tv ? ['teorik'] : []), ...(dir ? ['direksiyon'] : []), 'sinav'];
  const n = ASAMALAR.indexOf(k.asama), esGecti = !!(k.esinav && k.esinav.sonuc === 'Geçti'), bitti = k.asama === 'Ehliyet';
  const teorikBitti = !tv || (egt ? k.teorik >= S0.teorik : n >= 3 || esGecti);
  const simdi = bitti ? adimlar.length : !teorikBitti ? 0 : egt ? 1 : adimlar.indexOf(dir && k.asama !== 'Sınav' ? 'direksiyon' : 'sinav');
  const ds = OG.dirSayac(k);
  const sayac = teorikBitti && dir ? `${ds.n} / ${ds.g} ders${ds.ek ? ` · ${ds.ek} ek` : ''}` : tv ? `${k.teorik} / ${S0.teorik} saat` : '';
  const adim = adimlar[Math.min(simdi, adimlar.length - 1)];
  const sinavMetni = s => `${esc(OG.sinavAdi(s.tur, 'in'))} ${zaman(s.tarih, s.saat).replace(', ', ' ')}.`;
  const hd = OG.hakDurum(k);
  let cumle;
  if (bitti) cumle = egt ? OG.EGITIM_BITTI_METIN : 'Tebrikler, ehliyetini aldın.';
  else if (egt) cumle = k.teorik >= S0.teorik ? 'Teorik derslerin bitti; eğitim belgen kurstan verilir.' : 'Teorik derslerine devam ediyorsun; eğitim belgesi için derslerin tamamına katılman gerekir.';
  else if (hd && !sinav) cumle = esc(hd.metin);  // sınav hakkı doldu: kursun kararını bekliyor
  else if (adim === 'teorik') cumle = sinav && sinav.tur === 'e-Sınav' ? sinavMetni(sinav)
    : k.esinav && k.esinav.sonuc && !esGecti ? 'e-Sınava yeniden hazırlanıyorsun.'
      : k.teorik >= S0.teorik ? 'Teorik derslerin bitti; sıra e-Sınavda.' : 'Teorik derslerine devam ediyorsun.';
  else if (adim === 'direksiyon') cumle = !k.direksiyon ? (tv ? 'Direksiyon eğitimin başlıyor.' : OG.TEORIKSIZ_METIN) : k.direksiyon >= gerekliDireksiyon(k) ? 'Direksiyon derslerin tamamlandı.' : 'Direksiyon eğitimine devam ediyorsun.';
  else cumle = sinav ? sinavMetni(sinav) : k.dsinav && k.dsinav.sonuc && k.dsinav.sonuc !== 'Geçti' ? 'Sınava yeniden gireceksin; tarihi kurs bildirecek.' : 'Sınav tarihin kurs tarafından bildirilecek.';
  const li = adimlar.map((a, i) => {
    const [ad, ik, ton] = ASAMA[a], durum = i < simdi ? 'bitti' : i === simdi ? 'simdi' : 'sonra';
    const aria = `${ad}: ${durum === 'bitti' ? 'tamamlandı' : durum === 'simdi' ? 'şu an buradasın' : 'sırada'}`;
    return `<li class="ox-ana-adim ${durum}" aria-label="${aria}"${durum === 'simdi' ? ' aria-current="step"' : ''}><span class="ox-ana-adim-k ${durum === 'bitti' ? 'yesil' : durum === 'simdi' ? 'mavi' : ton}">${ik}${durum === 'bitti' ? `<em>${oi('tik')}</em>` : ''}</span><b>${ad}</b><i></i></li>`;
  }).join('');
  return heroKart({
    cls: 'ox-ana-yol',
    icerik: `<div class="ox-ana-yol-bas"><h2>${S0.tur && S0.tur !== 'ehliyet' ? 'Eğitim yolculuğun' : 'Ehliyet yolculuğun'}</h2>${sayac ? `<span>${sayac}</span>` : ''}</div>
      <ol class="ox-ana-adimlar" style="--n:${adimlar.length}">${li}</ol><p class="ox-ana-yol-not">${cumle}</p>`,
  });
}

/* ---------- yapılacaklar (teklif, onay, uyarı): yalnız varsa görünür ---------- */
const isKart = ({ ikon, ton, baslik, alt = '', sag = '', alttaki = '' }) => kart(
  `<div class="ox-ana-is-ust">${ikonKutu(ikon, ton)}<span class="ox-ana-is-govde"><b>${baslik}</b>${alt ? `<small>${alt}</small>` : ''}</span>${sag}</div>${alttaki ? `<div class="ox-ana-is-dg">${alttaki}</div>` : ''}`, 'ox-ana-is');

function yapilacaklar(k, S0, sd, sinav) {
  const l = [], sn = OG.sonrakiTaksit(k);
  if (sn && fark(sn.t.vade) < 0) l.push(isKart({ ikon: 'kart', ton: 'kirmizi', baslik: 'Taksitin gecikti', alt: `${tl(sn.t.tutar - (sn.t.kismi || 0))} · vade ${tarih(sn.t.vade).replace(/ /g, '\u00a0')}`, sag: dugme('Öde', { 'data-ode': sn.i }, { kucuk: true }) }));
  const et = OG.ekDersTeklifBilgi(k);  // birim ücret il tabanının altındaysa kabul yerine kursa sorulur
  if (et) l.push(isKart({
    ikon: 'direksiyon', ton: 'mavi', baslik: esc(et.baslik), alt: esc(et.alt),
    alttaki: dugme('Hayır', { 'data-og-ekders': 'hayir' }, { tur: 'cizgi', kucuk: true }) + (et.kabul ? dugme('Kabul et', { 'data-og-ekders': 'evet' }, { kucuk: true }) : dugme('Kursa sor', { 'data-kursa-yaz': 'ekTeklif' }, { kucuk: true })),
  }));
  (S.bosTeklif || []).filter(t => (t.adaylar || []).includes(k.id) && fark(t.tarih) >= 0).forEach(t => l.push(isKart({
    ikon: 'saat', ton: 'mavi', baslik: `Boş saat: ${zaman(t.tarih, esc(t.saat))}`,
    alt: esc((egitmen(t.egitmen) || {}).ad || 'Öğretmen') + ' · ' + esc(OG.bosSaatUcret(k)) + ' · ilk kabul eden alır',
    sag: dugme('Al', { 'data-og-bos': t.id }, { kucuk: true }),
  })));
  if (gerekliDireksiyon(k) && ogrOzellik('dersOnay')) {
    const bek = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && !d.ogrenciOnay && fark(d.tarih) >= -14).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
    if (bek.length) {
      const d = bek[0], h = egitmen(d.egitmen);
      l.push(isKart({
        ikon: 'panoTik', ton: 'sari', baslik: bek.length > 1 ? `${bek.length} dersin onay bekliyor` : 'Dersin yapıldı mı?',
        alt: `${tarih(d.tarih)} ${esc(d.saat)} dersi${h ? ' · ' + esc(h.ad) : ''}`,
        alttaki: dugme('Yapılmadı', { 'data-og-itiraz': d.id }, { tur: 'cizgi', kucuk: true }) + dugme('Onayla', { 'data-og-onay': d.id }, { kucuk: true }),
      }));
    }
  }
  if (sn && fark(sn.t.vade) >= 0 && fark(sn.t.vade) <= 10) l.push(isKart({ ikon: 'kart', ton: 'turuncu', baslik: kalanGun(sn.t.vade, 'Taksitin', 'Taksitine'), alt: `${tl(sn.t.tutar - (sn.t.kismi || 0))} · vade ${tarih(sn.t.vade).replace(/ /g, '\u00a0')}`, sag: dugme('Öde', { 'data-ode': sn.i }, { tur: 'ikincil', kucuk: true }) }));
  const tb = ogrOzellik('tekrar') ? HZ.tekrarBugun(k).length : 0;
  if (tb) l.push(isKart({ ikon: 'sifirla', ton: 'mor', baslik: `Bugün ${tb} tekrar sorun var`, alt: 'Yanlış yaptığın sorular aralıklarla yeniden gelir', sag: dugme('Başla', { 'data-ox-git': 'sinav:tekrar' }, { tur: 'ikincil', kucuk: true }) }));
  if (sinav && sd && fark(sinav.tarih) <= 14) l.push(isKart({ ikon: SINAV_IK, ton: 'mor', baslik: kalanGun(sinav.tarih, esc(OG.sinavAdi(sinav.tur, 'in')), esc(OG.sinavAdi(sinav.tur, 'a'))), alt: [`${uzunTarih(sinav.tarih)} ${esc(sinav.saat)}`, esc(sinav.yer || '')].filter(Boolean).join(' · '), sag: dugme('Gör', { 'data-ogs': 'ders' }, { tur: 'ikincil', kucuk: true }) }));
  return l.length ? `<div class="ox-ana-isler">${l.join('')}</div>` : '';
}

/* ---------- sıradaki ders ---------- */
const yaprak = t => { const d = tarihOku(t); return `<span class="ox-ana-yaprak" aria-hidden="true"><i>${ayAdi(d.getMonth(), true).toLocaleUpperCase('tr')}</i><b>${d.getDate()}</b><small>${gunKisa(t)}</small></span>`; };
const dersSatir = ({ t, saat, kim, alt, aria }) => `<button type="button" class="ox-ana-ders" data-ogs="ders" aria-label="${esc(aria)}">${yaprak(t)}<span class="ox-ana-dik"></span>
  <span class="ox-ana-ders-govde"><b>${zaman(t, esc(saat))}</b>${kim ? `<span class="ox-ana-kim">${kim}</span>` : ''}${alt ? `<small>${alt}</small>` : ''}</span><span class="ox-chev">${oi('sag')}</span></button>`;

// değerlendirilmemiş son ders (son 7 gün) — eski OG.degerlendirKart ile aynı seçim
function sonDers(k) {
  return S.dersler.filter(x => x.kursiyer === k.id && x.durum === 'Yapıldı' && fark(x.tarih) >= -7 && !x.ogrenciPuan).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat))[0];
}
let degAcik = false;
function degSatir(k) {
  const d = sonDers(k); if (!d) return '';
  const h = egitmen(d.egitmen);
  return `<div class="ox-ana-deg og-degerlendir${degAcik ? ' acik' : ''}">
    <button type="button" class="ox-ana-deg-ac" data-ox-ana-deg aria-expanded="${degAcik}" aria-controls="ox-ana-deg-p"><span class="ox-ana-yildiz-k">${oi('yildiz', 'dolu')}</span><span>Son dersini değerlendir</span><span class="ox-chev">${oi('sag')}</span></button>
    <div class="ox-ana-deg-p" id="ox-ana-deg-p"${degAcik ? '' : ' hidden'}>
      <p>${tarih(d.tarih)} ${esc(d.saat)} dersi${h ? ' · ' + esc(h.ad) : ''}</p>
      <div class="ox-ana-yildiz" role="radiogroup" aria-label="Puanın">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="false" data-og-yildiz="${n}" aria-label="${n} yıldız">${oi('yildiz', 'dolu')}</button>`).join('')}</div>
      <textarea class="ox-ana-yorum" data-og-yorum rows="2" maxlength="300" placeholder="İstersen kısa bir not yaz" aria-label="Not (isteğe bağlı)"></textarea>
      <div class="ox-ana-deg-alt"><small>Puanını yalnız kurs yönetimi görür.</small>${dugme('Gönder', { 'data-og-puan': d.id, disabled: true }, { kucuk: true })}</div>
    </div></div>`;
}

function siradaki(k, S0, sd, sinav) {
  const deg = degSatir(k);
  if (k.asama === 'Ehliyet') return deg ? `<div class="ox-ana-blok">${kart(deg, 'ox-ana-ders-kart yalniz')}</div>` : '';
  let baslik = 'Sıradaki ders', ic;
  const teorikDonem = teorikVar(k) && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama) && !(k.esinav && k.esinav.sonuc === 'Geçti');
  const td = teorikDonem ? (S.teorik || []).filter(t => t.grup === (k.teorikGrup || 'aksam') && fark(t.tarih) >= 0).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))[0] : null;
  if (sd) {
    const h = egitmen(sd.egitmen), a = sd.arac && arac(sd.arac);
    const alt = ['Direksiyon', a ? a.plaka : sd.kendiArac || k.kendiArac ? 'kendi aracın' : ''].filter(Boolean).map(esc).join(' · ');
    ic = dersSatir({ t: sd.tarih, saat: sd.saat, kim: h ? esc(h.ad) : '', alt, aria: `Sıradaki ders: ${zaman(sd.tarih, sd.saat)}${h ? ', ' + h.ad : ''}. Programımı aç` });
  } else if (td) {
    const o = ogretmen(td.ogretmen);
    ic = dersSatir({ t: td.tarih, saat: td.saat, kim: o ? esc(o.ad) : '', alt: esc(['Teorik', td.konu].filter(Boolean).join(' · ')), aria: `Sıradaki teorik ders: ${zaman(td.tarih, td.saat)}. Programımı aç` });
  } else if (sinav) {
    baslik = 'Sıradaki sınav';
    ic = dersSatir({ t: sinav.tarih, saat: sinav.saat, kim: esc(OG.sinavAdi(sinav.tur)), alt: esc(sinav.yer || ''), aria: `Sıradaki sınav: ${OG.sinavAdi(sinav.tur)}, ${zaman(sinav.tarih, sinav.saat)}. Programımı aç` });
  } else if (OG.hakDurum(k)) {
    ic = bos('takvim', 'Planlı dersin yok', 'Kurs seninle görüşünce programın burada görünür.');  // hak doldu: ders istenmez, karar kursta
  } else if (gerekliDireksiyon(k) && !teorikDonem) {
    ic = bos('takvim', 'Planlı dersin yok', 'Uygun olduğun gün ve saati kursa bildir; dersini planlasınlar.', dugme('Ders iste', { 'data-iste': true }, { ikon: 'arti', kucuk: true }));
  } else {
    ic = bos('takvim', 'Planlı dersin yok', 'Programın belli olunca burada görünür.');
  }
  return bolum(baslik, baglanti('Programım', { 'data-ogs': 'ders' })) + kart(ic + deg, 'ox-ana-ders-kart');
}

/* ---------- sınava hazırlık ---------- */
function hazirlik(k, S0) {
  const esGecti = !!(k.esinav && k.esinav.sonuc === 'Geçti'), n = ASAMALAR.indexOf(k.asama);
  if (k.asama === 'Ehliyet') return '';
  const kutu = (g, baslik, alt, dg) => kart(`<span class="ox-ana-haz-g">${g}</span><div class="ox-ana-haz-yazi"><h3>${baslik}</h3><p>${alt}</p>${dg}</div>`, 'ox-ana-haz');
  if (egitimSinifi(k.sinif)) return '';  // 100 ceza puanı eğitiminde sınav yok
  if (OG.esinavVar(k) && !esGecti && n <= 2) return kutu(gorsel('modul-trafik', '', 'ox-ana-haz-trafik'), 'e-Sınava hazırlan', 'Deneme sınavı ve konu testleri', dugme('Deneme çöz', { 'data-ox-git': 'sinav:deneme' }, { kucuk: true }));
  const dGecti = !!(k.dsinav && k.dsinav.sonuc === 'Geçti');
  if (gerekliDireksiyon(k) && ogrOzellik('direksiyon') && !dGecti) return kutu(gorsel('yol-koni', '', 'ox-ana-haz-yol'), 'Uygulama sınavına hazırlan', 'Kriterler ve güzergâhlar', dugme('Hazırlığa başla', { 'data-ox-git': 'sinav:direksiyon' }, { kucuk: true }));
  return '';
}

/* ---------- kurs işlemleri ---------- */
function islemler(k) {
  const sn = OG.sonrakiTaksit(k), kalan = OG.kursOzet(k).kalan;  // resmî masraflar (sınav ücreti, harç) kurs borcuna sayılmaz
  let odeAlt;
  if (sn && kalan) {
    const t = sn.t, tut = tl(t.tutar - (t.kismi || 0)).replace(' ', '\u00a0');
    odeAlt = fark(t.vade) < 0 ? `<span class="kirmizi">${tut} gecikti</span>` : `${uzunTarih(t.vade).replace(' ', '\u00a0')} · ${tut}`;
  } else odeAlt = kalan ? `Kalan ${tl(kalan)}` : `<span class="yesil">${oi('tik')}Borcun yok</span>`;
  const y = k.evrakYuklenen || {}, top = EVRAKLAR.length, onayli = EVRAKLAR.filter(([x]) => k.evrak[x]).length;
  const eksik = EVRAKLAR.filter(([x]) => !k.evrak[x] && !y[x]).length, kontrol = top - onayli - eksik;
  const blgAlt = onayli === top ? `<span class="yesil">${oi('tik')}${onayli}\u00a0/\u00a0${top} tamamlandı</span>`
    : eksik ? `<span class="turuncu">${eksik} belge eksik</span>` : `${kontrol} belge kontrolde`;
  const kutu = (sekme, ik, ad, alt) => `<button type="button" class="ox-kart ox-ana-kutu" data-ogs="${sekme}">${oi(ik)}<span class="ox-ana-kutu-g"><b>${ad}</b><small>${alt}</small></span></button>`;
  return bolum('Kurs işlemleri') + `<div class="ox-ana-islem">${kutu('odeme', 'kart', 'Ödeme', odeAlt)}${kutu('evrak', 'belge', 'Belgeler', blgAlt)}</div>`;
}

/* ---------- ana ekrana ekle (eski OG.kurulumKart): yapılacakların sonunda, yalnız tarayıcıda ---------- */
function kurulum() {
  try { if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return ''; } catch (x) { }
  if (navigator.standalone) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return isKart({
    ikon: 'indir', ton: 'mavi', baslik: 'mdSinyal’i telefonuna ekle',
    alt: window.__kurulum ? 'Tek dokunuşla yükle; uygulama gibi açılır.' : ios ? 'Safari’de Paylaş düğmesine (kare ve ok), sonra “Ana Ekrana Ekle”ye dokun.' : 'Tarayıcı menüsünden “Ana ekrana ekle”yi seç; uygulama gibi açılır.',
    sag: dugme('Yükle', { 'data-kur-android': true, hidden: !window.__kurulum }, { tur: 'ikincil', kucuk: true }),
  });
}

export function ekran(ctx) {
  const { k, S0, sd, sinav } = ctx;
  const html = sayfaBas(`Merhaba, ${esc(k.ad)}`, esc(sinifMetni(k, S0)))
    + yolculuk(k, S0, sinav)
    + yapilacaklar(k, S0, sd, sinav)
    + siradaki(k, S0, sd, sinav)
    + `<div class="ox-ana-blok">${hazirlik(k, S0)}</div>`
    + islemler(k)
    + (() => { const kur = kurulum(); return kur ? `<div class="ox-ana-kur">${kur}</div>` : ''; })();
  return {
    html,
    baglan(kap) {
      kap.addEventListener('click', ev => {
        const ac = ev.target.closest('[data-ox-ana-deg]');
        if (ac) {
          degAcik = !degAcik;
          const kutu = ac.closest('.ox-ana-deg'), p = kutu.querySelector('.ox-ana-deg-p');
          kutu.classList.toggle('acik', degAcik); ac.setAttribute('aria-expanded', String(degAcik)); p.hidden = !degAcik;
          if (degAcik) { const ilk = p.querySelector('[data-og-yildiz]'); if (ilk) ilk.focus({ preventScroll: true }); }
          return;
        }
        const yz = ev.target.closest('[data-og-yildiz]');
        if (yz) { const n = +yz.dataset.ogYildiz; yz.parentElement.querySelectorAll('[data-og-yildiz]').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.ogYildiz === n))); }
      });
      // gönderimde panel kapansın: ogBagla yeniden çizmeden önce (yakalama evresi)
      kap.addEventListener('click', ev => { if (ev.target.closest('[data-og-puan]')) degAcik = false; }, true);
    },
  };
}

stilEkle('ox-anasayfa', `
.ox-ana-yol{padding:11px 14px 6px}
.ox-ana-yol-bas{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.ox-ana-yol-bas h2{font-size:18px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas)}
.ox-ana-yol-bas span{flex:none;font-size:16px;font-weight:700;color:var(--ox-mavi);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-ana-adimlar{list-style:none;margin:16px -8px 0;padding:0;display:grid;grid-template-columns:repeat(var(--n),1fr)}
.ox-ana-adim{position:relative;display:grid;justify-items:center;text-align:center;min-width:0}
.ox-ana-adim+.ox-ana-adim::before{content:"";position:absolute;top:27px;left:calc(-50% + 34px);right:calc(50% + 34px);height:2px;border-radius:2px;background:#a9c7f2}
.ox-ana-adim-k{position:relative;display:grid;place-items:center;width:56px;height:56px;border-radius:15px;border:1.5px solid transparent;background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-ana-adim-k .ox-i{width:46px;height:46px;stroke-width:1.7}
.ox-ana-adim-k.yesil{background:var(--ox-yesil-acik);color:var(--ox-yesil);border-color:#cdebd8}
.ox-ana-adim-k.mor{background:var(--ox-mor-acik);color:var(--ox-mor);border-color:#e0d8fa}
.ox-ana-adim-k.mavi{border-color:#cfe0fb}
.ox-ana-adim.simdi .ox-ana-adim-k{background:var(--ox-mavi-acik);border:2px solid var(--ox-mavi)}
.ox-ana-adim.simdi .ox-ana-adim-k .ox-i{stroke-width:1.9}
.ox-ana-adim-k em{position:absolute;right:4px;bottom:8px;display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--ox-yesil);color:#fff;box-shadow:0 0 0 2px #fff}
.ox-ana-adim-k em .ox-i{width:12px;height:12px;stroke-width:3.2}
.ox-ana-adim b{margin-top:2px;font-size:15px;line-height:1.2;font-weight:700;color:var(--ox-metin);letter-spacing:-.01em;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-ana-adim.simdi b{color:var(--ox-mavi)}
.ox-ana-adim i{display:block;width:6px;height:6px;margin-top:1px;border-radius:50%;background:transparent}
.ox-ana-adim.simdi i{background:var(--ox-mavi)}
.ox-ana-yol-not{margin-top:3px;text-align:center;font-size:14.5px;line-height:1.35;color:var(--ox-metin)}

.ox-ana-isler{margin-top:12px}
.ox-ana-is{padding:14px 16px}
.ox-ana-is-ust{display:flex;align-items:center;gap:14px}
.ox-ana-is-govde{flex:1;min-width:0;display:grid;gap:2px}
.ox-ana-is-govde b{font-size:16px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas)}
.ox-ana-is-govde small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ana-is-ust>.ox-dg{flex:none}
.ox-ana-is-dg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;padding-left:58px}

.ox-ana-ders-kart{overflow:hidden}
.ox-ana-ders{display:flex;align-items:center;gap:0;width:100%;min-height:80px;padding:10px 12px 10px 16px;text-align:left}
.ox-ana-ders:active,.ox-ana-deg-ac:active,.ox-ana-kutu:active{background:#f2f5fa}
.ox-ana-yaprak{position:relative;flex:none;display:grid;grid-template-rows:19px 22px 13px;align-content:start;justify-items:center;width:57px;height:58px;border:1.5px solid var(--ox-cizgi);border-radius:12px;background:#fff;text-align:center}
.ox-ana-yaprak::before,.ox-ana-yaprak::after{content:"";position:absolute;top:-6px;left:14px;width:3.5px;height:9px;border-radius:2px;background:#7eaef5;box-shadow:0 0 0 1.5px #fff}
.ox-ana-yaprak::after{left:auto;right:14px}
.ox-ana-yaprak i{align-self:stretch;justify-self:stretch;margin:-1.5px -1.5px 0;border-radius:11px 11px 0 0;background:var(--ox-mavi);color:#fff;font-style:normal;font-size:10.5px;line-height:22px;font-weight:700;letter-spacing:.04em}
.ox-ana-yaprak b{margin-top:1px;font-size:22px;line-height:22px;font-weight:800;color:var(--ox-bas);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.ox-ana-yaprak small{margin-top:-1px;font-size:12px;line-height:13px;color:var(--ox-ikincil)}
.ox-ana-dik{flex:none;align-self:stretch;width:1px;margin:4px 16px 4px 12px;background:var(--ox-cizgi)}
.ox-ana-ders-govde{flex:1;min-width:0;display:grid;gap:2px}
.ox-ana-ders-govde b{font-size:18px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas)}
.ox-ana-kim{font-size:15px;line-height:1.3;font-weight:600;color:var(--ox-metin);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-ana-ders-govde small{font-size:14px;line-height:1.3;color:var(--ox-ikincil);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-ana-ders .ox-chev{margin-left:8px}
.ox-ana-ders-kart .ox-bos{padding:24px 20px}

.ox-ana-deg{position:relative}
.ox-ana-ders-kart>*+.ox-ana-deg::before{content:"";position:absolute;top:0;left:16px;right:16px;border-top:1px solid var(--ox-ayrac)}
.ox-ana-deg-ac{display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:8px 12px 8px 16px;text-align:left;font-size:15px;color:var(--ox-metin)}
.ox-ana-deg-ac>span:nth-child(2){flex:1;min-width:0}
.ox-ana-yildiz-k{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--ox-sari-acik)}
.ox-ana-yildiz-k .ox-i{width:18px;height:18px;color:var(--ox-sari);stroke:var(--ox-turuncu);stroke-width:1.3}
.ox-ana-deg.acik .ox-ana-deg-ac .ox-chev{transform:rotate(90deg)}
.ox-ana-deg-ac .ox-chev{transition:transform .2s}
.ox-ana-deg-p{padding:0 16px 16px}
.ox-ana-deg-p[hidden]{display:none}
.ox-ana-deg-p>p{font-size:14px;color:var(--ox-ikincil)}
.ox-ana-yildiz{display:flex;gap:4px;margin:6px 0 10px -6px}
.ox-ana-yildiz button{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;color:#d5dbe6}
.ox-ana-yildiz button .ox-i{width:30px;height:30px;stroke-width:1.2}
.ox-ana-yildiz button.secili{color:var(--ox-sari)}
.ox-ana-yildiz button.secili .ox-i{stroke:var(--ox-turuncu)}
.ox-ana-yorum{display:block;width:100%;min-height:64px;padding:10px 12px;border:1px solid var(--ox-cizgi);border-radius:12px;background:var(--ox-zemin);font:inherit;font-size:16px;line-height:1.4;color:var(--ox-bas);resize:vertical}
.ox-ana-yorum:focus{outline:2px solid var(--ox-mavi);outline-offset:0;border-color:transparent;background:#fff}
.ox-ana-deg-alt{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}
.ox-ana-deg-alt small{font-size:13.5px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ana-deg-alt .ox-dg{flex:none}

.ox-ana-blok:not(:empty){margin-top:16px}
.ox-ana-ders-kart.yalniz{margin-top:16px}
.ox-ana-haz{display:flex;align-items:center;gap:16px;padding:12px 14px}
.ox-ana-haz-g{flex:none;display:grid;place-items:center;width:108px;aspect-ratio:235/218;border-radius:12px;overflow:hidden;background:var(--ox-mavi-acik)}
.ox-ana-haz-g .ox-gorsel{width:100%;height:100%;object-fit:cover}
.ox-ana-haz-g .ox-ana-haz-trafik{width:88%;height:auto;aspect-ratio:180/150;object-fit:contain;mix-blend-mode:multiply}
.ox-ana-haz-yazi{flex:1;min-width:0}
.ox-ana-haz-yazi h3{font-size:20px;line-height:1.12;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas)}
.ox-ana-haz-yazi p{margin-top:2px;font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ana-haz-yazi .ox-dg{margin-top:10px;max-width:100%;padding:0 24px}

.ox-ana-islem{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ox-ana-kutu{display:flex!important;align-items:center;gap:10px;min-height:56px;padding:8px 4px 8px 10px;margin:0!important}
.ox-ana-kutu>.ox-i{width:30px;height:30px;color:var(--ox-mavi);stroke-width:1.6}
.ox-ana-kutu-g{flex:1;min-width:0;display:grid;gap:2px;container-type:inline-size}
.ox-ana-kutu-g b{font-size:16px;line-height:1.2;font-weight:700;color:var(--ox-bas)}
.ox-ana-kutu-g small{font-size:13px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ana-kutu-g small .ox-i{display:inline-block;vertical-align:-3px;width:14px;height:14px;margin-right:2px;stroke-width:2.6}
@container (max-width:116px){.ox-ana-kutu-g small .ox-i{display:none}}
.ox-ana-kutu-g .yesil{color:var(--ox-ikincil)}.ox-ana-kutu-g .yesil .ox-i{color:var(--ox-yesil)}
.ox-ana-kutu-g .kirmizi{color:var(--ox-kirmizi);font-weight:600}.ox-ana-kutu-g .turuncu{color:#c26a00;font-weight:600}

.ox-ana-is .ox-dg[hidden]{display:none}
@media (max-width:389px){
  .ox-ana-dik{margin:4px 12px 4px 12px}
  .ox-ana-haz{gap:14px}
  .ox-ana-haz-g{width:92px}
  .ox-ana-is-dg{padding-left:0}
}
`);
export const sifirla = () => {};
export const ac = () => {};
stilEkle('ox-ana-kur', '.ox-ana-kur{margin-top:12px}');
