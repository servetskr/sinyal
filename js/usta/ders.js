// Ders akışı (öğretmen, yeni tasarım): dersi bitir (1 Konular → 2 Değerlendirme → 3 İmzalar), "Ders kaydedildi" sonucu,
// dersi iptal et, not ekle, kapatılmamış dersin kaydını tamamla (tam ekran, .ox-akis) ile ders menüsü (alttan sayfa) ve
// "Öğrenci gelmedi mi?" onayı (pencere). Kayıt kuralları portal.js'te: dersKaydet, dersIptalEt, gelmediYap, notEkle (eski pencereler de onları çağırır).
// Akış durumu sessionStorage'da tutulur (adım, seçilen konular, puanlar, not); sayfa yenilenirse aynı adımdan sürer, imzalar yeniden atılır.
import { S, BECERI, SINIFLAR, kursiyer, egitmen, tamAd, gun, fark, tarihOku, konuListesi, konuOner, geceDersMi } from '../veri.js?v=213';
import { gerekliDireksiyon } from '../veri.js?v=213';
import { bildir, bildirimKapat, imzaAlani, tarihUzun, ayAdi } from '../ui.js?v=213';
import * as P from '../portal.js?v=213';
import { esc, oi, dugme, satir, liste, kutucuk, radyo, not, stilEkle, odakTuzagi } from '../ogr/ui.js?v=213';

/* ---------- akış durumu ---------- */
// A: { ekran: 'bitir' | 'sonuc' | 'iptal' | 'not' | 'kayit', id, adim, konular, beceri, not, neden, iptalNot, metin, gir, anim }
const ANAHTAR = 'sinyal-eg-akis';
let A = (() => { try { return JSON.parse(sessionStorage.getItem(ANAHTAR) || 'null'); } catch (x) { return null; } })();
const sakla = () => { try { if (A) sessionStorage.setItem(ANAHTAR, JSON.stringify(A)); else sessionStorage.removeItem(ANAHTAR); } catch (x) { } };
let birak = null;         // açık akışın odak tuzağını serbest bırakır
let tuval = null;         // imza tuvalleri: yeniden çizimde (ör. arka planda gelen yenileme) atılmış imzalar kaybolmasın
const temizle = () => { if (birak) { birak(); birak = null; } document.body.classList.remove('ox-akis-acik'); };
const ders = () => A && S.dersler.find(x => x.id === A.id);
const ac = (yeni, ctx) => { A = yeni; tuval = null; sakla(); ctx.yenile(true); };
// kullanıcı akışı kapatınca bekleyen uyarılar da kapanır (ör. "konusunu seç" uyarısı Bugün ekranında kalmasın)
const kapat = ctx => { bildirimKapat('uyari'); A = null; tuval = null; sakla(); temizle(); ctx.yenile(true); };

/* ---------- metin yardımcıları ---------- */
const gunAy = t => { const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };
const gunMetin = t => { const f = fark(t); return f === 0 ? 'Bugün' : f === -1 ? 'Dün' : f === 1 ? 'Yarın' : gunAy(t); };
// "B sınıfı · Manuel" (Bugün ekranındaki sıradaki ders kartıyla aynı yazım)
const sinifAd = k => { const S0 = SINIFLAR[k.sinif] || {}, kod = String(k.sinif || '').replace(/-O$/, ''), v = k.vites || String(S0.ad || '').split(' · ')[1] || ''; return kod ? `${kod} sınıfı${v ? ' · ' + v : ''}` : ''; };
const harf = k => ((k.ad || '?')[0] + ((k.soyad || '')[0] || '')).toLocaleUpperCase('tr');
const avatar = k => `<span class="ox-udr-av" aria-hidden="true">${k.foto ? `<img src="${esc(k.foto)}" alt="">` : esc(harf(k))}</span>`;
const dersAlt = (d, k) => `${gunMetin(d.tarih)} · ${esc(d.saat)} · ${P.dersNo(d, k)}. ders${geceDersMi(d) ? ' · gece dersi' : ''}`;
// küçük ders kartı: öğrenci, gün, saat, kaçıncı ders (iptal ve not ekranlarının başında)
const dersKart = (d, k) => liste([satir({ sol: avatar(k), baslik: esc(tamAd(k)), alt: dersAlt(d, k), ok: false })], 'ox-udr-ders');

// üst çubuk: solda geri (ya da kapat), yanında başlık ve tek satır alt bilgi
const ust = (baslik, alt, attr, ikon = 'sol') => `<div class="ox-akis-ust ox-udr-ust"><button type="button" class="ox-ikon-dg" ${attr} aria-label="${ikon === 'kapat' ? 'Kapat' : 'Geri'}">${oi(ikon)}</button>
  <div class="ox-udr-ust-bas"><b id="ox-udr-bas">${baslik}</b>${alt ? `<small>${alt}</small>` : ''}</div><span></span></div>`;
const govde = (ic, cls = '') => `<div class="ox-akis-govde ox-udr-govde ${cls}"><div class="ox-udr-ic ${A && A.gir ? 'gir' : ''}">${ic}</div></div>`;
const baslikH = (metin, sag = '') => `<div class="ox-udr-bolum"><h2>${metin}</h2>${sag ? `<span>${sag}</span>` : ''}</div>`;
const alan = (et, ek, ic) => `<label class="ox-udr-alan"><span class="ox-udr-et">${et}${ek ? ` <small>${ek}</small>` : ''}</span>${ic}</label>`;

/* ---------- 1–3 · dersi bitir ---------- */
const ADIMLAR = ['Konular', 'Değerlendirme', 'İmza'];
const adimlar = n => `<ol class="ox-udr-adim" aria-label="Adım ${n} / 3: ${ADIMLAR[n - 1]}">${ADIMLAR.map((t, i) => {
  const k = i + 1, c = k < n ? 'bitti' : k === n ? 'simdi' : '';
  return `<li class="${c}"${k === n ? ' aria-current="step"' : ''}><span class="ox-udr-adim-n">${k < n ? oi('tik') : k}</span><small>${t}</small></li>`;
}).join('')}</ol>`;
const secimSay = n => n ? `${n} konu seçili` : 'Seçilmedi';

function konularHtml(d, k) {
  const on = A.oner || [], l = konuListesi(k.sinif).slice().sort((a, b) => (on.includes(b[0]) ? 1 : 0) - (on.includes(a[0]) ? 1 : 0));
  return baslikH('Bu derste işlenen konular', `<span data-udr-sayi>${secimSay(A.konular.length)}</span>`)
    + liste(l.map(([id, ad]) => kutucuk(esc(ad), A.konular.includes(id), { 'data-udr-konu': id })), 'ox-udr-konular')
    + not('Bu ders için önerilen konular işaretli geldi; değiştirebilirsin. Seçtiğin konular takip formuna yazılır.');
}
function degerHtml(d, k) {
  const b = A.beceri || {};
  return baslikH('Sürücü becerisi değerlendirmesi')
    + `<p class="ox-udr-olcek">1 zayıf · 5 sınava hazır</p>`
    + `<div class="ox-kart ox-udr-beceri">${BECERI.map(([id, ad]) => `<div class="ox-udr-b"><span class="ox-udr-b-ad" id="ox-udr-b-${id}">${esc(ad)}</span>
      <span class="ox-udr-b-sec" role="radiogroup" aria-labelledby="ox-udr-b-${id}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="${b[id] === n}" class="${b[id] === n ? 'secili' : ''}" data-udr-beceri="${id}" data-n="${n}" aria-label="${n}">${n}</button>`).join('')}</span></div>`).join('')}</div>`
    + alan('Not', 'isteğe bağlı', `<textarea data-udr-not rows="3" maxlength="300" placeholder="Kısa not ekleyin…">${esc(A.not || '')}</textarea>`)
    + `<p class="ox-udr-ipucu-y">Öğrenci notu kendi ekranında görür.</p>`;
}
const tuvalHtml = (kim, baslik, ek = '') => `<div class="ox-udr-imza"><div class="ox-udr-imza-bas"><span><b>${baslik}</b>${ek ? `<small>· ${ek}</small>` : ''}</span><button type="button" class="ox-udr-temizle" data-udr-temizle="${kim}" hidden>${oi('sifirla')}<span>Temizle</span></button></div>
  <div class="ox-udr-tuval"><canvas data-udr-imza="${kim}" aria-label="${baslik}: parmağınızla imza atın"></canvas><span class="ox-udr-tuval-ip" aria-hidden="true">${oi('kalem')}<span>İmza atın</span></span></div><p class="ox-udr-imza-uyari" data-udr-uyari="${kim}" role="status" hidden></p></div>`;
function imzaHtml(d, k) {
  const h = egitmen(d.egitmen);
  return baslikH('İmzalar') + tuvalHtml('k', 'Öğrenci imzası', esc(tamAd(k))) + tuvalHtml('u', 'Öğretmen imzası', esc(h ? h.ad : ''))
    + not('Öğrenci yanında değilse önce sen imzala, sonra “WhatsApp’tan imzalat”a dokun; imza linki öğrenciye gider.');
}
function bitirHtml(d, k) {
  const n = A.adim;
  const ic = n === 1 ? konularHtml(d, k) : n === 2 ? degerHtml(d, k) : imzaHtml(d, k);
  const alt = n < 3 ? dugme('Devam et', { 'data-udr-ileri': true }, { ok: true, genis: true })
    : dugme('Dersi tamamla', { 'data-udr-tamam': true }, { genis: true, ikon: 'tik' }) + dugme('WhatsApp’tan imzalat', { 'data-udr-uzak': true }, { tur: 'cizgi', genis: true, ikon: 'wp' });
  // uzun adda yalnız ad kısalır, ders sırası görünür kalır; geçmiş günden kalan derste gün ve saat de yazılır
  const ek = `${d.tarih !== gun(0) ? `${esc(gunMetin(d.tarih))} ${esc(d.saat)} · ` : ''}${P.dersNo(d, k)}. ders`;
  return ust('Dersi bitir', `<span class="ox-udr-ust-ad">${esc(tamAd(k))}</span><span class="ox-udr-ust-ek">· ${ek}</span>`, n === 1 ? 'data-udr-kapat' : 'data-udr-geri', n === 1 ? 'kapat' : 'sol')
    + `<div class="ox-udr-adim-kap">${adimlar(n)}</div>`
    + govde(ic, 'adim' + n)
    + (n < 3 ? `<div class="ox-udr-kaydir" aria-hidden="true">${oi('asagi')}<span>${n === 1 ? 'Daha fazla konu için kaydırın' : 'Not eklemek için kaydırın'}</span></div>` : '')
    + `<div class="ox-akis-alt ox-udr-alt ${n === 3 ? 'dikey' : ''}">${alt}</div>`;
}

/* ---------- sonuç: ders kaydedildi ---------- */
function sonucHtml(d, k) {
  const uzak = !!(d.imza && d.imza.kursiyerBekliyor), kl = konuListesi(k.sinif);
  const konuAd = (d.konular || []).map(id => (kl.find(x => x[0] === id) || [0, id])[1]);
  const kisa = d.sure != null && d.sure < 40;
  const satirlar = [
    d.sure != null ? satir({ ikon: 'saat', ton: kisa ? 'turuncu' : 'mavi', baslik: `${esc(d.bas || d.saat)}–${esc(d.bit || '')} · ${d.sure} dakika`, alt: kisa ? 'Kısa ders olarak işaretlendi' : 'Süre takip formuna yazıldı', altTon: kisa ? 'turuncu' : '', ok: false })
      : satir({ ikon: 'saat', ton: 'gri', baslik: `${esc(gunAy(d.tarih))} · ${esc(d.saat)}`, alt: 'Sonradan kapatıldı; süre yazılmadı', ok: false }),
    satir({ ikon: 'panoListe', baslik: `${konuAd.length} konu takip formuna yazıldı`, alt: esc(konuAd.slice(0, 3).join(', ') + (konuAd.length > 3 ? ` ve ${konuAd.length - 3} konu daha` : '')), ok: false }),
    d.beceri ? satir({ ikon: 'grafik', baslik: 'Beceri puanı verildi', alt: 'Öğrenci Gelişim bölümünde görür', ok: false }) : '',
    uzak ? '' : satir({ ikon: 'imza', ton: 'yesil', baslik: 'İki imza alındı', alt: 'Takip formuna işlendi', ok: false }),
  ].filter(Boolean);
  const uyari = uzak ? `<div class="ox-udr-uyari" role="status">${oi('saat')}<span><b>Öğrenci imzası bekleniyor</b><small>Öğrenci WhatsApp’taki linkten imzalayınca takip formuna işlenir. Link ulaşmadıysa yeniden gönder.</small></span></div>` : '';
  const ic = `<div class="ox-udr-sonuc ${A.anim ? '' : 'gir'}"><span class="ox-udr-tik" aria-hidden="true">${oi('tik')}</span><h1 id="ox-udr-bas">Ders kaydedildi</h1>
    <p>${esc(tamAd(k))}</p><p class="ox-udr-sonuc-alt">${esc(sinifAd(k))} · ${P.dersNo(d, k)}. ders</p></div>${uyari}${liste(satirlar, 'ox-udr-ozet')}`;
  const alt = (uzak ? dugme('İmza linkini yeniden gönder', { 'data-imza-tekrar': d.id }, { tur: 'ikincil', ikon: 'wp', genis: true }) : '')
    + dugme('Bugün’e dön', { 'data-udr-bugun': true }, { genis: true });
  return `<div class="ox-akis-ust"><button type="button" class="ox-ikon-dg" data-udr-kapat aria-label="Kapat">${oi('kapat')}</button><span></span><span></span></div>`
    + `<div class="ox-akis-govde ox-udr-govde">${ic}</div><div class="ox-akis-alt ox-udr-alt ${uzak ? 'dikey' : ''}">${alt}</div>`;
}

/* ---------- dersi iptal et ---------- */
function iptalHtml(d, k) {
  const ic = dersKart(d, k) + baslikH('İptal nedeni')
    + `<div class="ox-liste ox-udr-neden" role="radiogroup" aria-label="İptal nedeni">${P.IPTAL_NEDEN.map(([id, t]) => radyo(esc(t), A.neden === id, { 'data-udr-neden': id })).join('')}</div>`
    + alan('Not', 'isteğe bağlı', `<textarea data-udr-iptal-not rows="3" maxlength="200" placeholder="Kısa bir not yazın…">${esc(A.iptalNot || '')}</textarea>`)
    + not('Ders programdan silinir. Öğrenciye ve kurs müdürüne nedeniyle haber gider; müdür yeni saat verir.');
  return ust('Dersi iptal et', '', 'data-udr-kapat') + govde(ic)
    + `<div class="ox-akis-alt ox-udr-alt">${dugme('Vazgeç', { 'data-udr-kapat': true }, { tur: 'ikincil' })}${dugme('Dersi iptal et', { 'data-udr-iptal-et': true }, { tur: 'tehlike' })}</div>`;
}

/* ---------- not ekle ---------- */
function notHtml(d, k) {
  const ic = dersKart(d, k)
    + alan('Ders notu', '', `<textarea data-udr-metin rows="5" maxlength="500" placeholder="Bu derse ilişkin notunuzu yazın…">${esc(A.metin || '')}</textarea>`)
    + not('Kurs müdürü de görebilir.');
  return ust('Not ekle', '', 'data-udr-kapat') + govde(ic)
    + `<div class="ox-akis-alt ox-udr-alt">${dugme('Vazgeç', { 'data-udr-kapat': true }, { tur: 'ikincil' })}${dugme('Kaydet', { 'data-udr-not-kaydet': true, disabled: !(A.metin || '').trim() })}</div>`;
}

/* ---------- kapatılmamış ders: ders kaydını tamamla ---------- */
function kayitHtml(d, k) {
  const gecen = -fark(d.tarih);
  const ic = liste([
    satir({ sol: avatar(k), baslik: esc(tamAd(k)), alt: `${esc(sinifAd(k))} · ${P.dersNo(d, k)}. ders`, ok: false }),
    satir({ ikon: 'takvim', ton: 'turuncu', baslik: `${esc(tarihUzun(d.tarih))} · ${esc(d.saat)}`, alt: gecen > 0 ? `${gecen === 1 ? 'Dün' : gecen + ' gün önce'} · kapatılmadı` : 'Kapatılmadı', altTon: 'turuncu', ok: false }),
  ], 'ox-udr-ders')
    + baslikH('Ders durumunu tamamla')
    + `<div class="ox-udr-iki">${dugme('Yapıldı', { 'data-udr-kayit': 'yapildi' }, { tur: 'cizgi', ikon: 'tik' })}${dugme('Gelmedi', { 'data-udr-kayit': 'gelmedi' }, { tur: 'cizgi', ikon: 'yanlis' })}</div>`
    + not('“Yapıldı” dersen konular, değerlendirme ve imza adımları açılır; ders sayısı bir artar. “Gelmedi” dersen öğrenciye ve kurs müdürüne haber gider.');
  return ust('Ders kaydını tamamla', '', 'data-udr-kapat') + govde(ic);
}

/* ---------- yönlendirici kancaları ---------- */
// Akış açık mı? Ders silinmiş, kapanmış ya da başka öğretmenin dersiyse akış kendiliğinden kapanır.
export function aktif(ctx) {
  const d = ders();
  const ok = !!d && (!ctx || !ctx.eg || d.egitmen === ctx.eg.id) && (A.ekran === 'sonuc' ? d.durum === 'Yapıldı' : A.ekran === 'not' || d.durum === 'Planlandı');
  if (!ok) { if (A) { A = null; tuval = null; sakla(); } temizle(); }
  return ok;
}

export function ekran(ctx) {
  const d = ders(), k = d && kursiyer(d.kursiyer);
  if (!d || !k) return null;
  const html = A.ekran === 'bitir' ? bitirHtml(d, k) : A.ekran === 'sonuc' ? sonucHtml(d, k) : A.ekran === 'iptal' ? iptalHtml(d, k) : A.ekran === 'not' ? notHtml(d, k) : kayitHtml(d, k);
  return {
    tam: true,
    html: `<div class="ox-akis ox-udr ox-udr-e-${A.ekran}" role="dialog" aria-modal="true" aria-labelledby="ox-udr-bas">${html}</div>`,
    baglan(kap) { bagla(kap.querySelector('.ox-udr'), d, k, ctx); },
  };
}

// Dersi bitir akışını açar (geçmiş günden kalan ders de buradan kapanır); önerilen konular işaretli gelir
export function bitirAc(d, ctx) {
  if (!d || d.durum !== 'Planlandı') return;
  const k = kursiyer(d.kursiyer); if (!k) return;
  const no = k.direksiyon + 1, l = konuListesi(k.sinif).map(x => x[0]);
  const oner = konuOner(k.sinif, no, gerekliDireksiyon(k)).filter(x => l.includes(x));
  ac({ ekran: 'bitir', id: d.id, adim: 1, konular: oner.slice(), oner, beceri: {}, not: '', gir: false }, ctx);
}
export const iptal = (d, ctx) => { if (d && d.durum === 'Planlandı') ac({ ekran: 'iptal', id: d.id, neden: P.IPTAL_NEDEN[0][0], iptalNot: '' }, ctx); };
export const notAc = (d, ctx) => { if (d) ac({ ekran: 'not', id: d.id, metin: '' }, ctx); };
export const kayitAc = (d, ctx) => { if (d && d.durum === 'Planlandı') ac({ ekran: 'kayit', id: d.id }, ctx); };

/* ---------- etkileşim ---------- */
function bagla(kok, d, k, ctx) {
  if (!kok) return;
  if (birak) birak();
  birak = odakTuzagi(kok);
  document.body.classList.add('ox-akis-acik');
  const odak = kok.querySelector('.ox-akis-ust .ox-ikon-dg'); if (odak) try { odak.focus({ preventScroll: true }); } catch (x) { }
  if (A.gir) { A.gir = false; sakla(); }
  if (A.ekran === 'sonuc' && !A.anim) { A.anim = true; sakla(); }
  const g = kok.querySelector('.ox-akis-govde');
  // adım değişince önceki adımın uyarıları kapanır (adım göstergesinin üstünde kalmasın)
  const adimGit = n => { bildirimKapat('uyari'); A.adim = n; A.gir = true; sakla(); ctx.yenile(true); };

  // 1–2: "Daha fazla konu için kaydırın" / "Not eklemek için kaydırın" yalnız aşağıda içerik kaldıkça görünür
  const ip = kok.querySelector('.ox-udr-kaydir');
  if (ip && g) { const bak = () => ip.classList.toggle('gor', g.scrollHeight - g.clientHeight - g.scrollTop > 48); g.addEventListener('scroll', bak, { passive: true }); requestAnimationFrame(bak); }

  // 3 · imzalar
  if (A.ekran === 'bitir' && A.adim === 3) imzalariKur(kok, d);

  kok.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-udr-bugun]')) { bildirimKapat('uyari'); A = null; tuval = null; sakla(); temizle(); return ctx.git('bugun'); }
    if (t.closest('[data-udr-kapat]')) return kapat(ctx);
    if (t.closest('[data-udr-geri]')) return adimGit(Math.max(1, A.adim - 1));
    const kn = t.closest('[data-udr-konu]');
    if (kn) {
      const id = kn.dataset.udrKonu, var_ = A.konular.includes(id);
      A.konular = var_ ? A.konular.filter(x => x !== id) : [...A.konular, id]; sakla();
      kn.classList.toggle('secili', !var_); kn.setAttribute('aria-checked', String(!var_));
      const s = kok.querySelector('[data-udr-sayi]'); if (s) s.textContent = secimSay(A.konular.length);
      return;
    }
    const bc = t.closest('[data-udr-beceri]');
    if (bc) {
      const id = bc.dataset.udrBeceri, n = +bc.dataset.n;
      A.beceri = { ...(A.beceri || {}) }; if (A.beceri[id] === n) delete A.beceri[id]; else A.beceri[id] = n; sakla();
      bc.parentElement.querySelectorAll('button').forEach(b => { const s = A.beceri[id] === +b.dataset.n; b.classList.toggle('secili', s); b.setAttribute('aria-checked', String(s)); });
      return;
    }
    if (t.closest('[data-udr-ileri]')) {
      if (A.adim === 1 && !A.konular.length) return bildir('Takip formu için dersin konusunu seç', 'uyari');
      return adimGit(A.adim + 1);
    }
    if (t.closest('[data-udr-tamam]') || t.closest('[data-udr-uzak]')) return kaydet(kok, d, ctx, !!t.closest('[data-udr-uzak]'));
    const tm = t.closest('[data-udr-temizle]');
    if (tm && tuval) { const x = tuval[tm.dataset.udrTemizle]; if (x) { clearTimeout(x.zs); x.uyar = false; x.api.temizle(); ipucuSil(x.cv); tuvalDurum(kok); } return; }
    const nd = t.closest('[data-udr-neden]');
    if (nd) { A.neden = nd.dataset.udrNeden; sakla(); kok.querySelectorAll('[data-udr-neden]').forEach(b => { const s = b === nd; b.classList.toggle('secili', s); b.setAttribute('aria-checked', String(s)); }); return; }
    if (t.closest('[data-udr-iptal-et]')) return P.dersIptalEt(d, A.neden, A.iptalNot || '', { kapat: () => { A = null; tuval = null; sakla(); temizle(); } });
    if (t.closest('[data-udr-not-kaydet]')) {
      if (!P.notEkle(k, A.metin)) return bildir('Önce notunu yaz', 'uyari');
      bildir('Not kaydedildi; kurs müdürü de görür');
      return kapat(ctx);
    }
    const ky = t.closest('[data-udr-kayit]');
    if (ky) return ky.dataset.udrKayit === 'yapildi' ? bitirAc(d, ctx) : gelmedi(d, ctx);
  });
  kok.addEventListener('input', ev => {
    const t = ev.target;
    if (t.matches('[data-udr-not]')) { A.not = t.value; sakla(); }
    else if (t.matches('[data-udr-iptal-not]')) { A.iptalNot = t.value; sakla(); }
    else if (t.matches('[data-udr-metin]')) { A.metin = t.value; sakla(); const b = kok.querySelector('[data-udr-not-kaydet]'); if (b) b.disabled = !t.value.trim(); }
  });
  kok.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape' || katman) return;
    if (A.ekran === 'bitir' && A.adim > 1) adimGit(A.adim - 1); else kapat(ctx);
  });
}

// imzaAlani (js/ui.js) tuvale kendi soluk yazısını çizer; tasarımda yerine HTML ipucu ("İmza atın") var, o çizim silinir
const ipucuSil = cv => cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
function imzalariKur(kok, d) {
  if (!tuval || tuval.id !== d.id) tuval = { id: d.id };
  ['k', 'u'].forEach(kim => {
    const yeni = kok.querySelector(`[data-udr-imza="${kim}"]`); if (!yeni) return;
    const eski = tuval[kim];
    if (eski) { yeni.replaceWith(eski.cv); return; }   // yeniden çizimde atılmış imza korunur
    const r = yeni.getBoundingClientRect(), o = Math.min(3, window.devicePixelRatio || 1);
    yeni.width = Math.round((r.width || 335) * o); yeni.height = Math.round((r.height || 112) * o);
    const api = imzaAlani(yeni); ipucuSil(yeni);
    yeni.getContext('2d').lineWidth = Math.max(2.5, 2.2 * o);
    // geçersiz imza uyarısı çizim bitince (1,2 sn yeni çizgi gelmezse) ya da kaydetmeye basınca çıkar; çok çizgili imzanın ilk çizgisinde değil
    const x = { cv: yeni, api, uyar: false, zs: 0 };
    const bak = () => { tuvalDurum(yeni.closest('.ox-udr')); clearTimeout(x.zs); x.zs = setTimeout(() => { x.uyar = true; tuvalDurum(yeni.closest('.ox-udr')); }, 1200); };
    yeni.addEventListener('pointerdown', () => { clearTimeout(x.zs); if (x.uyar) { x.uyar = false; tuvalDurum(yeni.closest('.ox-udr')); } });
    yeni.addEventListener('pointerup', bak); yeni.addEventListener('pointercancel', bak);
    tuval[kim] = x;
  });
  tuvalDurum(kok);
}
// Temizle ve "dolu" görünümü tuvalde çizgi olup olmadığına bakar (murekkep); geçerlilik ayrı (bos(): ölçünün altındaki çizgi de "imza yok").
// Çizgi var ama geçersizse (tek dokunuş, düz/kısa çizgi) tuvalin altında açık uyarı çıkar, Temizle görünür kalır.
const murekkepVar = x => x.api.murekkep ? x.api.murekkep() : !x.api.bos();
const imzaSorun = x => (x.api.sorun ? x.api.sorun() : '') || 'İmza çok kısa; yeniden atın';
function tuvalDurum(kok) {
  if (!kok || !tuval) return;
  ['k', 'u'].forEach(kim => {
    const x = tuval[kim]; if (!x) return;
    const kap = x.cv.closest('.ox-udr-imza'); if (!kap) return;
    const dolu = murekkepVar(x), gecersiz = dolu && x.uyar && x.api.bos();
    kap.classList.toggle('dolu', dolu); kap.classList.toggle('gecersiz', gecersiz);
    const b = kap.querySelector('[data-udr-temizle]'); if (b) b.hidden = !dolu;
    const u = kap.querySelector('[data-udr-uyari]'); if (u) { u.hidden = !gecersiz; u.textContent = gecersiz ? imzaSorun(x) : ''; }
  });
}
// kaydetmeden önce: boş ya da geçersiz imza için kimin imzası olduğunu söyleyen mesaj ('' = geçerli)
const imzaEksik = (x, ad) => !x.api.bos() ? '' : murekkepVar(x) ? `${ad}: ${imzaSorun(x)}` : '';

function kaydet(kok, d, ctx, uzak) {
  const ik = tuval && tuval.k, iu = tuval && tuval.u;
  if (!ik || !iu) return;
  iu.uyar = true; if (!uzak) ik.uyar = true;   // geçersiz imzanın uyarısı tuvalin altında hemen görünsün
  if (uzak) { if (iu.api.bos()) { tuvalDurum(kok); return bildir(imzaEksik(iu, 'Öğretmen imzası') || 'Önce sen imzala; öğrencinin imzası WhatsApp’tan istenir', 'uyari'); } }
  else if (ik.api.bos() || iu.api.bos()) { tuvalDurum(kok); return bildir(imzaEksik(ik, 'Öğrenci imzası') || imzaEksik(iu, 'Öğretmen imzası') || 'İki imza da gerekli. Öğrenci yanında değilse “WhatsApp’tan imzalat”', 'uyari'); }
  kok.querySelectorAll('[data-udr-tamam],[data-udr-uzak]').forEach(b => { b.disabled = true; });
  const imza = uzak ? P.imzaUzaktan(iu.api.url()) : P.imzaYerinde(ik.api.url(), iu.api.url());
  const secim = { konular: A.konular.slice(), beceri: A.beceri && Object.keys(A.beceri).length ? { ...A.beceri } : null, not: A.not || '', imza };
  // kayıttan hemen sonra sonuç ekranı; uzaktan imzada link hazırlanırken (kısa link, WhatsApp) sonuç ekranı açık durur
  // kayıt başarılı: bekleyen bütün bildirimler kapanır (kısa ders uyarısı sonuç ekranında zaten yazıyor)
  P.dersKaydet(d, secim, { sessiz: true, kapat: () => { bildirimKapat(); A = { ekran: 'sonuc', id: d.id }; tuval = null; sakla(); if (uzak) ctx.yenile(true); } })
    .catch(x => { console.error(x); bildir('İmza linki gönderilemedi; “Yeniden gönder”e dokun', 'uyari'); });
}

/* ---------- katmanlar: ders menüsü (alttan sayfa) ve gelmedi onayı ---------- */
let katman = null;
function katmanAc(html, alttan, kur) {
  katmanKapat(true);
  const el = document.createElement('div');
  el.className = 'ox-akis ox-udr-katman' + (alttan ? ' alttan' : '');
  el.innerHTML = html;
  document.body.appendChild(el);
  katman = { el, serbest: odakTuzagi(el) };
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('acik')));
  el.addEventListener('click', ev => { if (ev.target === el || ev.target.closest('[data-udr-k-kapat]')) katmanKapat(); });
  el.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); katmanKapat(); } });
  kur(el);
  const ilk = el.querySelector('[data-udr-k-odak]') || el.querySelector('.ox-satir[href], button.ox-satir'); if (ilk) try { ilk.focus({ preventScroll: true }); } catch (x) { }
}
function katmanKapat(hemen = false) {
  if (!katman) return;
  const { el, serbest } = katman; katman = null;
  serbest();
  const az = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hemen || az) return el.remove();
  el.classList.remove('acik'); el.classList.add('kapan');
  setTimeout(() => el.remove(), 240);
}

// Ders menüsü: ara, not ekle, (kapatılmamış derste) kaydı tamamla, dersi iptal et, gelmedi olarak kapat
export function menu(d, ctx) {
  if (!d) return;
  const k = kursiyer(d.kursiyer); if (!k) return;
  const tel = String(k.tel || '').replace(/[^\d+]/g, ''), acik = d.durum === 'Planlandı', gecmis = acik && d.tarih < gun(0);
  const sat = [
    tel ? satir({ ikon: 'tel', baslik: 'Ara', alt: esc(k.tel), etiket: 'a', attrs: { href: 'tel:' + tel, 'data-udr-m': 'ara' } }) : satir({ ikon: 'tel', ton: 'gri', baslik: 'Ara', alt: 'Telefon numarası yok', ok: false }),
    acik && d.tarih === gun(0) && !d.bas ? satir({ ikon: 'direksiyon', baslik: 'Dersi başlat', alt: 'Başlangıç saati ve konum kaydedilir', attrs: { 'data-udr-m': 'basla' } }) : '',
    satir({ ikon: 'kalem', baslik: 'Not ekle', alt: 'Kurs müdürü de görür', attrs: { 'data-udr-m': 'not' } }),
    gecmis ? satir({ ikon: 'panoListe', ton: 'turuncu', baslik: 'Ders kaydını tamamla', alt: 'Yapıldı ya da gelmedi olarak kapat', attrs: { 'data-udr-m': 'kayit' } }) : '',
    acik ? satir({ ikon: 'kapat', ton: 'kirmizi', baslik: 'Dersi iptal et', alt: 'Öğrenciye ve müdüre haber gider', attrs: { 'data-udr-m': 'iptal' } }) : '',
    acik && (d.bas || P.gelmediOlur(d)) ? satir({ ikon: 'yanlis', ton: 'kirmizi', baslik: 'Gelmedi olarak kapat', alt: d.bas ? 'Ders yanlışlıkla başlatıldıysa' : 'Öğrenci derse gelmediyse', attrs: { 'data-udr-m': 'gelmedi' } }) : '',
  ].filter(Boolean);
  katmanAc(`<div class="ox-udr-sayfa" role="dialog" aria-modal="true" aria-labelledby="ox-udr-m-bas"><span class="ox-udr-tutamac" aria-hidden="true"></span>
    <header class="ox-udr-sayfa-bas">${avatar(k)}<span><b id="ox-udr-m-bas">${esc(tamAd(k))}</b><small>${dersAlt(d, k)}</small></span><button type="button" class="ox-ikon-dg" data-udr-k-kapat aria-label="Kapat">${oi('kapat')}</button></header>
    ${liste(sat, 'ox-udr-menu')}</div>`, true, el => {
    el.addEventListener('click', ev => {
      const m = ev.target.closest('[data-udr-m]'); if (!m) return;
      const ne = m.dataset.udrM;
      if (ne === 'ara') return katmanKapat();
      katmanKapat(true);
      if (ne === 'basla') P.dersBaslat(d, ctx.eg);
      else if (ne === 'not') notAc(d, ctx);
      else if (ne === 'kayit') kayitAc(d, ctx);
      else if (ne === 'iptal') iptal(d, ctx);
      else if (ne === 'gelmedi') gelmedi(d, ctx);
    });
  });
}

// "Öğrenci gelmedi mi?" onayı; ders saati gelmeden açılmaz (portal.js gelmediOlur)
export function gelmedi(d, ctx) {
  if (!d) return;
  if (!P.gelmediOlur(d)) return bildir('Ders saati gelmeden “gelmedi” işaretlenemez', 'uyari');
  const k = kursiyer(d.kursiyer); if (!k) return;
  katmanAc(`<div class="ox-udr-modal" role="alertdialog" aria-modal="true" aria-labelledby="ox-udr-g-bas" aria-describedby="ox-udr-g-not">
    <button type="button" class="ox-ikon-dg ox-udr-modal-x" data-udr-k-kapat aria-label="Kapat">${oi('kapat')}</button>
    <h2 id="ox-udr-g-bas">Öğrenci gelmedi mi?</h2><p class="ox-udr-modal-alt">${esc(tamAd(k))} · ${Math.abs(fark(d.tarih)) <= 1 ? gunMetin(d.tarih).toLocaleLowerCase('tr') : gunMetin(d.tarih)} ${esc(d.saat)}</p>
    <p class="ox-udr-modal-not" id="ox-udr-g-not">Ders “gelmedi” olarak kapanır; öğrenciye ve kurs müdürüne haber gider.</p>
    <div class="ox-udr-modal-dg">${dugme('Vazgeç', { 'data-udr-k-kapat': true, 'data-udr-k-odak': true }, { tur: 'ikincil' })}${dugme('Gelmedi', { 'data-udr-gelmedi': true })}</div></div>`, false, el => {
    el.querySelector('[data-udr-gelmedi]').addEventListener('click', () => {
      P.gelmediYap(d, { kapat: () => { katmanKapat(); if (A && A.id === d.id) { A = null; tuval = null; sakla(); temizle(); } } });
    });
  });
}

/* ---------- stiller ---------- */
stilEkle('ox-uders', `
.ox-udr{background:#fff}
.ox-udr :focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px;border-radius:10px}
.ox-udr-ust{grid-template-columns:44px minmax(0,1fr) 44px}
.ox-udr-ust-bas{display:grid;min-width:0;line-height:1.2}
.ox-udr-ust-bas b{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ox-udr-ust-bas small{display:flex;min-width:0;margin-top:1px;font-size:13.5px;color:var(--ox-ikincil);white-space:nowrap}
.ox-udr-ust-ad{min-width:0;overflow:hidden;text-overflow:ellipsis}
.ox-udr-ust-ek{flex:none;padding-left:4px}
.ox-udr-govde{position:relative;padding-top:4px}
.ox-udr-ic.gir{animation:oxUdrGir .26s cubic-bezier(.2,.8,.2,1)}
@keyframes oxUdrGir{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}

/* adım göstergesi: Konular · Değerlendirme · İmza */
.ox-udr-adim-kap{flex:none;width:100%;max-width:560px;margin:0 auto;padding:2px 20px 10px}
.ox-udr-adim{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;padding:0;list-style:none}
.ox-udr-adim li{position:relative;display:grid;justify-items:center;gap:6px;min-width:0}
.ox-udr-adim li+li::before{content:"";position:absolute;top:13px;right:calc(50% + 20px);left:calc(-50% + 20px);height:2px;border-radius:2px;background:var(--ox-cizgi)}
.ox-udr-adim li.bitti::before,.ox-udr-adim li.simdi::before{background:var(--ox-mavi)}
.ox-udr-adim-n{position:relative;z-index:1;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;border:1.8px solid #c3cad8;background:#fff;font-size:14px;font-weight:700;color:var(--ox-soluk);font-variant-numeric:tabular-nums}
.ox-udr-adim-n .ox-i{width:16px;height:16px;stroke-width:2.8}
.ox-udr-adim li.bitti .ox-udr-adim-n,.ox-udr-adim li.simdi .ox-udr-adim-n{background:var(--ox-mavi);border-color:var(--ox-mavi);color:#fff}
.ox-udr-adim li.simdi .ox-udr-adim-n{box-shadow:0 0 0 4px var(--ox-mavi-acik)}
.ox-udr-adim small{font-size:13px;line-height:1.2;font-weight:500;color:var(--ox-soluk);white-space:nowrap}
.ox-udr-adim li.bitti small{color:var(--ox-ikincil)}
.ox-udr-adim li.simdi small{color:var(--ox-mavi);font-weight:600}

/* bölüm başlığı ve alanlar */
.ox-udr-bolum{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:14px 0 12px}
.ox-udr-bolum h2{min-width:0;font-size:20px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas)}
.ox-udr-bolum>span{flex:none;font-size:14px;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-udr-ders+.ox-udr-bolum{margin-top:28px}
.ox-udr-olcek{margin:-4px 0 12px;font-size:14px;line-height:1.4;color:var(--ox-ikincil)}
.ox-udr-alan{display:grid;gap:8px;margin-top:22px}
.ox-udr-et{font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-udr-et small{font-size:14px;font-weight:400;color:var(--ox-ikincil)}
.ox-udr textarea{display:block;width:100%;min-height:92px;margin:0;padding:12px 14px;border:1px solid var(--ox-cizgi);border-radius:12px;background:var(--ox-zemin);font:inherit;font-size:16px;line-height:1.4;color:var(--ox-bas);resize:none;box-shadow:none;-webkit-appearance:none;appearance:none}
.ox-udr textarea::placeholder{color:var(--ox-soluk)}
.ox-udr textarea:focus{outline:2px solid var(--ox-mavi);outline-offset:0;background:#fff;border-color:transparent}
.ox-udr-ipucu-y{margin-top:8px;font-size:13.5px;color:var(--ox-soluk)}

/* 1 · konular */
.ox-udr-konular .ox-kutucuk{min-height:52px;line-height:1.3}
.ox-udr-konular .ox-kutucuk:active{background:#f2f5fa}
.ox-udr-kaydir{position:absolute;left:0;right:0;bottom:calc(70px + env(safe-area-inset-bottom));z-index:2;display:flex;align-items:center;justify-content:center;gap:6px;height:56px;padding-top:16px;font-size:13.5px;font-weight:500;color:var(--ox-ikincil);background:linear-gradient(rgba(255,255,255,0),#fff 42%);pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s}
.ox-udr-kaydir .ox-i{width:17px;height:17px;stroke-width:2.2}
.ox-udr-kaydir.gor{opacity:1;transform:none}

/* 2 · değerlendirme */
.ox-udr-beceri{padding:2px 16px}
.ox-udr-b{display:grid;gap:9px;padding:12px 0 13px}
.ox-udr-b+.ox-udr-b{border-top:1px solid var(--ox-ayrac)}
.ox-udr-b-ad{font-size:16px;font-weight:600;color:var(--ox-bas)}
.ox-udr-b-sec{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:3px;border-radius:12px;background:var(--ox-gri-acik)}
.ox-udr-b-sec button{position:relative;min-height:40px;border-radius:9px;font-size:16px;font-weight:600;color:var(--ox-ikincil);text-align:center;font-variant-numeric:tabular-nums;transition:background-color .15s,color .15s,transform .1s}
.ox-udr-b-sec button::after{content:"";position:absolute;inset:-5px 0}
.ox-udr-b-sec button.secili{background:var(--ox-mavi);color:#fff;box-shadow:0 1px 2px rgba(10,102,242,.25)}
.ox-udr-b-sec button:active{transform:scale(.95)}

/* 3 · imzalar */
.ox-udr-imza+.ox-udr-imza{margin-top:18px}
.ox-udr-imza-bas{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:32px;margin-bottom:6px}
.ox-udr-imza-bas>span{flex:1;min-width:0;display:flex;align-items:baseline;gap:5px;white-space:nowrap}
.ox-udr-imza-bas b{flex:none;font-size:16px;font-weight:700;color:var(--ox-bas)}
.ox-udr-imza-bas small{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:14px;font-weight:400;color:var(--ox-ikincil)}
.ox-udr-temizle{position:relative;flex:none;display:inline-flex;align-items:center;gap:5px;min-height:32px;margin-right:-4px;padding:0 4px;color:var(--ox-mavi);font-size:14.5px;font-weight:600;border-radius:8px}
.ox-udr-temizle::after{content:"";position:absolute;inset:-6px -4px}
.ox-udr-temizle .ox-i{width:16px;height:16px;stroke-width:2.2}
.ox-udr-temizle[hidden]{display:none}
.ox-udr-tuval{position:relative;aspect-ratio:3/1;border:1.5px dashed #c9d6ea;border-radius:14px;background:var(--ox-zemin);overflow:hidden;transition:border-color .15s,background-color .15s}
.ox-udr-imza.dolu .ox-udr-tuval{border-style:solid;border-color:var(--ox-cizgi);background:#fff}
.ox-udr-tuval canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}
.ox-udr-tuval-ip{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:7px;font-size:15px;font-weight:500;color:var(--ox-soluk);pointer-events:none;transition:opacity .15s}
.ox-udr-tuval-ip .ox-i{width:19px;height:19px}
.ox-udr-imza.dolu .ox-udr-tuval-ip{opacity:0}
.ox-udr-imza.gecersiz .ox-udr-tuval{border-color:var(--ox-turuncu)}
.ox-udr-imza-uyari{margin-top:6px;font-size:14px;line-height:1.35;font-weight:500;color:color-mix(in srgb,var(--ox-kirmizi) 78%,#000)}
.ox-udr-imza-uyari[hidden]{display:none}
.ox-udr-alt.dikey{flex-direction:column;gap:10px}
.ox-udr-alt .ox-dg-cizgi .ox-i,.ox-udr-alt .ox-dg-ikincil .ox-i{color:#1fa855}

/* sonuç */
.ox-udr-sonuc{display:grid;justify-items:center;text-align:center;padding:24px 8px 4px}
.ox-udr-tik{display:grid;place-items:center;width:88px;height:88px;border-radius:50%;background:var(--ox-yesil-acik);color:var(--ox-yesil);box-shadow:0 0 0 10px color-mix(in srgb,var(--ox-yesil-acik) 45%,#fff)}
.ox-udr-tik .ox-i{width:46px;height:46px;stroke-width:2.6}
.ox-udr-sonuc h1{margin-top:28px;font-size:27px;line-height:1.12;font-weight:800;letter-spacing:-.025em;color:var(--ox-bas)}
.ox-udr-sonuc p{margin-top:8px;font-size:17px;font-weight:600;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-udr-sonuc p.ox-udr-sonuc-alt{margin-top:2px;font-size:15.5px;font-weight:400;color:var(--ox-ikincil)}
.ox-udr-sonuc.gir .ox-udr-tik{animation:oxUdrTik .5s cubic-bezier(.2,1.3,.4,1) both}
.ox-udr-sonuc.gir .ox-udr-tik .ox-i{animation:oxUdrTikIc .45s .18s cubic-bezier(.2,1.2,.4,1) both}
.ox-udr-sonuc.gir h1,.ox-udr-sonuc.gir p{animation:oxUdrYuksel .4s .12s ease both}
@keyframes oxUdrTik{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes oxUdrTikIc{from{opacity:0;transform:scale(.4) rotate(-12deg)}to{opacity:1;transform:none}}
@keyframes oxUdrYuksel{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ox-udr-uyari{display:flex;gap:12px;align-items:flex-start;margin-top:24px;padding:14px 16px;border-radius:14px;background:var(--ox-turuncu-acik);color:#8a4b00}
.ox-udr-uyari>.ox-i{width:22px;height:22px;margin-top:1px;color:var(--ox-turuncu)}
.ox-udr-uyari b{display:block;font-size:16px;font-weight:700;color:#8a4b00}
.ox-udr-uyari small{display:block;margin-top:2px;font-size:14px;line-height:1.4}
.ox-udr-ozet{margin-top:24px}
.ox-udr .ox-satir-govde small.turuncu{color:#c26a00}
.ox-udr-uyari+.ox-udr-ozet{margin-top:12px}

/* ders kartı, kayıt */
.ox-udr-av{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;overflow:hidden;background:var(--ox-mavi-orta);color:var(--ox-mavi);font-size:16px;font-weight:700}
.ox-udr-av img{width:100%;height:100%;object-fit:cover}
.ox-udr-ders{margin-top:6px}
.ox-liste.ox-udr-ders>.ox-satir+.ox-satir::before{left:74px}
.ox-udr-iki{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ox-udr-iki .ox-dg{padding:0 12px}
.ox-udr-iki .ox-dg:first-child .ox-i{color:var(--ox-yesil)}
.ox-udr-iki .ox-dg:last-child .ox-i{color:var(--ox-kirmizi)}
.ox-udr-alt .ox-dg{padding:0 14px}

/* katman: alttan sayfa (ders menüsü) ve onay penceresi */
.ox-udr-katman{z-index:80;display:grid;place-items:center;padding:24px 16px;background:rgba(15,29,64,0);transition:background-color .22s ease}
.ox-udr-katman.acik{background:rgba(15,29,64,.42)}
.ox-udr-katman :focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px;border-radius:10px}
.ox-udr-katman.alttan{place-items:end center;padding:0}
.ox-udr-sayfa{width:100%;max-width:560px;max-height:calc(100% - 40px);overflow-y:auto;background:#fff;border-radius:22px 22px 0 0;padding:8px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px -16px rgba(15,29,64,.35);transform:translateY(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
.ox-udr-katman.acik .ox-udr-sayfa{transform:none}
.ox-udr-tutamac{display:block;width:38px;height:5px;margin:0 auto 6px;border-radius:3px;background:#d5dbe5}
.ox-udr-sayfa-bas{display:flex;align-items:center;gap:12px;padding:6px 0 14px 4px}
.ox-udr-sayfa-bas>span:not(.ox-udr-av){flex:1;min-width:0;display:grid;line-height:1.25}
.ox-udr-sayfa-bas b{font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-udr-sayfa-bas small{margin-top:2px;font-size:14px;color:var(--ox-ikincil)}
.ox-udr-sayfa-bas .ox-ikon-dg{margin-right:-6px}
.ox-udr-menu .ox-satir{text-decoration:none;color:inherit}
.ox-udr-menu .ox-satir:active{background:#f2f5fa}
.ox-udr-modal{position:relative;width:100%;max-width:400px;background:#fff;border-radius:var(--ox-r-b);padding:28px 20px 20px;box-shadow:0 24px 48px -16px rgba(16,24,40,.35);text-align:center;opacity:0;transform:scale(.96) translateY(6px);transition:opacity .2s ease,transform .24s cubic-bezier(.2,.8,.2,1)}
.ox-udr-katman.acik .ox-udr-modal{opacity:1;transform:none}
.ox-udr-modal-x{position:absolute;top:6px;right:6px}
.ox-udr-modal h2{padding:0 32px;font-size:23px;line-height:1.15;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas)}
.ox-udr-modal-alt{margin-top:8px;font-size:16px;color:var(--ox-ikincil);overflow-wrap:anywhere}
.ox-udr-modal-not{margin-top:6px;font-size:14px;line-height:1.4;color:var(--ox-soluk)}
.ox-udr-modal-dg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px}
.ox-udr-modal-dg .ox-dg{padding:0 12px}
.ox-udr-katman.kapan{background:rgba(15,29,64,0)}
.ox-udr-katman.kapan .ox-udr-sayfa{transform:translateY(100%)}
.ox-udr-katman.kapan .ox-udr-modal{opacity:0;transform:scale(.97)}
@media (prefers-reduced-motion:reduce){.ox-udr,.ox-udr *,.ox-udr-katman,.ox-udr-katman *{transition:none!important;animation:none!important}}
`);
