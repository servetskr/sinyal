// Öğretmen › Bugün sekmesi (yeni tasarım): tarih, selam ve günün özeti; sıradaki ders kartı (başlamamış / derste / saati geçmiş),
// kaydı eksik (kapatılmamış) dersler, günün programı (kalan dersler), bugün biten dersler (imza bekleyen dahil), Aracım ve Sınav güzergâhları kutuları.
// Alt ekran: 'kapanmamis' (geçmiş günlerden kapatılmamış dersler: Yapıldı / Gelmedi). Aracım, güzergâhlar ve hesap js/usta/arac.js'tedir.
// Eski portal.js egitmenPortal() "bugun" bölümünün bütün işlevleri burada: dersi başlat, bitir ve imzalat, ders menüsü (⋯), başlat (sıradaki dışındaki
// ders için, saati gelince), kapatılmamış derste Yapıldı / Gelmedi, imza linkini yeniden gönder, son not, konum durumu, araç ve bakım, güzergâh püf noktaları.
import { S, SINIFLAR, gun, fark, tarihOku, kursiyer, tamAd, sbDers, geceDersMi, geceGerekli, gerekliDireksiyon, sinifEtiket, DERS_TUR_AD, dersTurleri } from '../veri.js?v=234';
import { tarihUzun, ayAdi, gunAdi } from '../ui.js?v=234';
import { guzergahlar } from '../guzergah.js?v=234';
import { esc, oi, bolum, baglanti, kart, gorsel, dugme, satir, liste, cip, bos, geri, sayfaBas, stilEkle } from '../ogr/ui.js?v=234';

/* ---------- yardımcılar ---------- */
const SERT = /[çfhkpsşt]$/;
const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'], ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli'];
// "10:03" → "10:03’ten", "10:00" → "10:00’dan", "09:30" → "09:30’dan" (saatin okunuşunun son sözcüğüne göre)
export function saatDen(s) {
  const [h, m] = String(s || '').split(':').map(Number), n = m ? m : h;
  const w = !n ? 'sıfır' : n % 10 ? BIRLER[n % 10] : ONLAR[Math.floor(n / 10)] || 'sıfır';
  const unlu = (w.match(/[aıoueiöü](?=[^aıoueiöü]*$)/) || ['e'])[0];
  return `${s}’${SERT.test(w) ? 't' : 'd'}${'eiöü'.includes(unlu) ? 'e' : 'a'}n`;
}
const gunAy = t => { const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };
const goreli = t => { const f = fark(t); return f === 0 ? 'Bugün' : f === 1 ? 'Yarın' : f > 1 && f < 7 ? gunAdi(t) : gunAy(t); };
// "B sınıfı · Manuel/Otomatik/Engelli" (kart) ve "B Engelli" (satır); 100 ceza puanı eğitimi kendi adıyla (veri.js sinifEtiket)
export function sinifAd(k) {
  const uzun = sinifEtiket(k.sinif, k), kisa = uzun.replace(' sınıfı · ', ' ').replace(/ sınıfı$/, '');
  return { uzun, kisa, top: gerekliDireksiyon(k) };
}
// dersin planlı başlangıcına kalan saat (eksi: geçti)
const kalan = d => (new Date(d.tarih + 'T' + (/^\d{2}:\d{2}$/.test(d.saat || '') ? d.saat : '00:00') + ':00') - Date.now()) / 36e5;
const basMs = d => d.basZaman || (d.bas ? new Date(d.tarih + 'T' + d.bas + ':00').getTime() : Date.now());
const dakika = d => Math.max(0, Math.floor((Date.now() - basMs(d)) / 60e3));
const imzaBekliyor = d => d.durum === 'Yapıldı' && d.imza && d.imza.kursiyerBekliyor;
// Gece dersi (gün batımından sonra başlayan ders; veri.js geceDersMi). Program ve öğrenci ayrıntısı da bunları kullanır.
const AY_IK = '<svg class="ox-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
export const geceCip = d => geceDersMi(d) ? `<span class="ox-ugc">${AY_IK}Gece dersi</span>` : '';
// ders türü (UYG-007): alan ya da simülatör dersi ayrıca işaretlenir; akan trafik varsayılan, çipsiz
export const turCip = d => d && (d.tur === 'alan' || d.tur === 'simulator') ? `<span class="ox-ugc">${DERS_TUR_AD[d.tur]}</span>` : '';
// öğrencinin ders türlerine göre ilerlemesi tek satırda: "Alan / simülatör 1/2 · Akan trafik 8/14 · Gece 0/2"
export const turOzet = k => { const dt = dersTurleri(k); return dt && dt.length > 1 ? `<small class="ox-ubg-turler">${dt.map(x => `${esc(x.ad)} ${x.n}/${x.g}`).join(' · ')}</small>` : ''; };
// Öğrencinin gece dersi sayısı: kurallar.js (M04 ve ders ekleme notu) ile aynı sayım; gelmediği ve iptal dersler sayılmaz. Gerekmiyorsa null.
export function geceSayim(k) {
  const g = geceGerekli(k); if (!g) return null;
  const y = sbDers(S.dersler).filter(x => x.kursiyer === k.id && x.durum !== 'Gelmedi' && x.durum !== 'İptal' && geceDersMi(x)).length;
  return { y, g };
}

/* ---------- üst: tarih, selam, özet ---------- */
function ust(ctx, iptalsiz, yapilan) {
  const ad1 = esc(String(ctx.eg.ad || '').trim().split(/\s+/)[0] || '');
  let ozet;
  if (!iptalsiz.length) ozet = 'Bugün dersin yok';
  else if (!ctx.siradaki) { const y = iptalsiz.filter(d => d.durum === 'Yapıldı').length; ozet = y ? `Bugün ${y} ders yaptın` : 'Bugünkü derslerin kapandı'; }
  else ozet = `Bugün ${iptalsiz.length} dersin var${yapilan ? `, ${yapilan} tanesi bitti` : ''}`;
  return `<header class="ox-sayfa-bas ox-ubg-bas"><div><p class="ox-ubg-tarih">${esc(tarihUzun(gun(0)))}</p><h1>${ctx.P.selamla()}, ${ad1} Hoca</h1><p>${ozet}</p></div></header>`;
}

/* ---------- sıradaki ders kartı ---------- */
function siraKart(ctx, d) {
  const k = kursiyer(d.kursiyer); if (!k) return '';
  const s = sinifAd(k), no = ctx.P.dersNo(d, k), basladi = !!d.bas, gecti = !basladi && kalan(d) < -1;
  let etiket, saat, ek = '', dg;
  if (basladi) {
    etiket = `<p class="ox-ubg-etiket canli"><i aria-hidden="true"></i>Derste · ${esc(saatDen(d.bas))} beri</p>`;
    saat = `<div class="ox-ubg-saat sure" role="timer" aria-label="Geçen süre"><b><span data-ubg-sure="${basMs(d)}">${dakika(d)}</span><em> dk</em></b><small>geçen süre</small></div>`;
    const kn = d.konum ? ['yesil', 'Konum alındı'] : d.konum === false ? ['turuncu', 'Konum alınamadı'] : ['gri', 'Konum alınıyor…'];
    ek = `<p class="ox-ubg-durum ${kn[0]}">${oi('konum')}<span>${kn[1]}</span></p>`;
    dg = dugme('Bitir ve imzalat', { 'data-yapildi': d.id }, { genis: true, ok: true });
  } else if (gecti) {
    etiket = `<p class="ox-ubg-etiket turuncu"><i aria-hidden="true"></i>Kaydı bekliyor</p>`;
    saat = `<div class="ox-ubg-saat"><b>${esc(d.saat)}</b></div>`;
    ek = `<p class="ox-ubg-durum turuncu">${oi('saat')}<span>Saati geçti. Yapıldıysa kapat ve imzalat; öğrenci gelmediyse “Gelmedi”yi seç.</span></p>`;
    dg = `<div class="ox-ubg-iki">${dugme('Gelmedi', { 'data-gelmedi': d.id }, { tur: 'cizgi' })}${dugme('Yapıldı', { 'data-yapildi': d.id }, { ok: true })}</div>`;
  } else {
    etiket = `<p class="ox-ubg-etiket"><i aria-hidden="true"></i>Sıradaki ders</p>`;
    saat = `<div class="ox-ubg-saat"><b>${esc(d.saat)}</b></div>`;
    const nt = k.notlar && k.notlar[0];
    if (nt && nt.metin) ek = `<p class="ox-ubg-durum not">${oi('kalem')}<span>${esc(nt.metin)}</span></p>`;
    dg = dugme('Dersi başlat', { 'data-ders-basla': d.id }, { genis: true, ok: true });
  }
  return `<section class="ox-hero ox-ubg-sira${basladi ? ' derste' : ''}" aria-label="${basladi ? 'Süren ders' : 'Sıradaki ders'}: ${esc(tamAd(k))}">
    <div class="ox-ubg-sira-ust">${etiket}<button type="button" class="ox-ubg-diger" data-ders-diger="${esc(d.id)}" aria-label="${esc(tamAd(k))}: diğer işlemler">${oi('nokta3')}</button></div>
    <div class="ox-ubg-sira-orta"><div class="ox-ubg-kim"><h2${tamAd(k).length > 18 ? ' class="uzun"' : ''}>${esc(tamAd(k))}</h2><p>${esc(s.uzun)}</p>${turOzet(k)}${s.top || geceDersMi(d) ? `<small>${s.top ? (no <= s.top ? `${no}. ders / ${s.top}` : esc(ctx.P.dersEtiket(d, k))) : ''}${geceCip(d)}${turCip(d)}</small>` : ''}</div>${saat}</div>
    ${ek}<div class="ox-ubg-sira-dg">${dg}</div></section>`;
}

/* ---------- günün tamamı bitti ---------- */
function bittiKart(ctx) {
  const ym = yarinMetni(ctx);
  return `<section class="ox-hero gorselli ox-ubg-bitti"><div class="ox-hero-yazi"><p class="ox-hero-ust">Bugün</p><h2>Bütün derslerin bitti</h2><p class="ox-hero-alt">Eline sağlık.${ym ? ` ${ym}` : ''}</p></div>${gorsel('ders-tamam', '', 'ox-hero-gorsel')}
    <div class="ox-hero-dg">${baglanti('Haftanın programı', { 'data-egs': 'hafta' }, true)}</div></section>`;
}

/* ---------- kaydı eksik dersler (geçmiş günler) ---------- */
function eksikKart(ctx) {
  const l = ctx.kapanmamis; if (!l.length) return '';
  const d = l[0], k = kursiyer(d.kursiyer), kim = k ? ' · ' + esc(tamAd(k)) : '';
  const alt = l.length === 1 ? `${esc(gunAy(d.tarih))}${kim}` : `En eskisi ${esc(gunAy(d.tarih))}${kim}`;
  return `<div class="ox-ubg-eksik">${liste([satir({
    ikon: 'saat', ton: 'turuncu', baslik: `${l.length} dersin kaydı eksik`, alt,
    sag: `<span class="ox-ubg-tamamla">Tamamla${oi('sag')}</span>`, attrs: { 'data-ux-alt': 'kapanmamis' }, ok: false,
  })])}</div>`;
}

/* ---------- ders satırı (günün programı, biten dersler) ---------- */
function dersSatir(ctx, d, { gizli = false, aktifVar = false, erken = false } = {}) {
  const k = kursiyer(d.kursiyer); if (!k) return '';
  const s = sinifAd(k), no = ctx.P.dersNo(d, k), plan = d.durum === 'Planlandı', ka = plan ? kalan(d) : 0;
  const de = esc(ctx.P.dersEtiket(d, k));  // zorunlu sayının üstü "Ek ders 1/2"
  let alt = plan ? `${de} · ${esc(s.kisa)}` : de, sag = `<span class="ox-chev">${oi('sag')}</span>`, dis = '';
  if (plan) {
    if (d.bas) sag = cip('Derste');
    else if (ka < -1) sag = cip('Kaydı eksik', 'turuncu');
    else if ((ka <= .5 || erken) && !aktifVar) dis = dugme('Başlat', { 'data-ders-basla': d.id, 'aria-label': `${tamAd(k)}, ${d.saat}: dersi başlat` }, { tur: 'ikincil', kucuk: true });
  } else if (d.durum === 'Yapıldı') {
    if (d.sure != null) alt += ` · ${d.sure}\u00a0dk${d.sure < 40 ? '\u00a0(kısa)' : ''}`;
    sag = imzaBekliyor(d) ? cip('İmza bekliyor', 'turuncu') : cip(`${oi('tik')}Yapıldı`, 'yesil');
  } else if (d.durum === 'Gelmedi') sag = cip('Gelmedi', 'kirmizi');
  else sag = cip(esc(d.durum), 'gri');
  const imza = imzaBekliyor(d) ? `<div class="ox-ubg-imza"><button type="button" data-imza-tekrar="${esc(d.id)}">${oi('wp')}<span>İmza linkini yeniden gönder</span></button></div>` : '';
  return `<div class="ox-ubg-ders${plan ? '' : ' bitti'}"${gizli ? ' data-ubg-fazla hidden' : ''}>
    <div class="ox-ubg-ders-sat"><button type="button" class="ox-ubg-ders-ana" data-ders-diger="${esc(d.id)}" aria-label="${esc(d.saat)}, ${esc(tamAd(k))}, ${no}. ders: işlemler">
      <b class="ox-ubg-ders-saat">${esc(d.saat)}</b><span class="ox-ubg-ders-govde"><b>${esc(tamAd(k))}</b><small>${alt}${geceCip(d)}${turCip(d)}</small></span>${dis ? '' : `<span class="ox-ubg-ders-sag">${sag}</span>`}</button>${dis ? `<span class="ox-ubg-ders-dg">${dis}</span>` : ''}</div>${imza}</div>`;
}

function yarinMetni(ctx) {
  const s = ctx.benim.filter(d => d.durum === 'Planlandı' && d.tarih > gun(0)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  if (!s.length) return '';
  const ayni = s.filter(d => d.tarih === s[0].tarih).length;
  return `${goreli(s[0].tarih)} ${ayni} ders, ilki\u00a0${esc(s[0].saat)}.`;
}

function program(ctx, kalanlar, aktifVar) {
  const sag = baglanti('Tümü', { 'data-egs': 'hafta', 'aria-label': 'Programın tümü' }, true);
  if (!kalanlar.length) return bolum('Günün programı', sag) + liste([satir({ ikon: 'takvim', ton: 'gri', baslik: 'Bugün başka dersin yok', alt: yarinMetni(ctx) || 'Program değişirse WhatsApp’tan haber verilir.', ok: false })]);
  const gor = kalanlar.length > 3 ? 2 : kalanlar.length, fazla = kalanlar.length - gor;
  // sıradaki dersin saati geçtiyse (öğrenci gecikti ya da gelmedi) sonraki ders hemen başlatılabilir (eski ekranda her satırda "Başlat" vardı)
  const sd = ctx.siradaki, erken = !!(sd && !sd.bas && kalan(sd) < 0);
  const satirlar = kalanlar.map((d, i) => dersSatir(ctx, d, { gizli: i >= gor, aktifVar, erken: erken && i === 0 })).join('');
  const daha = fazla ? `<button type="button" class="ox-ubg-daha" data-ubg-daha aria-expanded="false"><span>Sonrasında ${fazla} ders daha</span>${oi('asagi')}</button>` : '';
  return bolum('Günün programı', sag) + `<div class="ox-liste ox-ubg-liste">${satirlar}${daha}</div>`;
}

function bitenler(ctx, l, iptalsiz) {
  if (!l.length) return '';
  const bek = l.filter(imzaBekliyor).length;
  return bolum('Bugün biten dersler', bek ? `<span class="ox-ubg-bek">${bek} imza bekleniyor</span>` : `${l.length} / ${iptalsiz.length}`)
    + `<div class="ox-liste ox-ubg-liste">${l.map(d => dersSatir(ctx, d)).join('')}</div>`;
}

/* ---------- Aracım ve Sınav güzergâhları kutuları ---------- */
function kutular(ctx) {
  const ar = ctx.ar, gz = guzergahlar(), l = [];
  if (ar) {
    const km = (+ar.bakimKm || 0) - (+ar.km || 0), yakin = ar.bakimKm && km <= 500;
    l.push(`<button type="button" class="ox-kart ox-ubg-kutu" data-ux-alt="arac" aria-label="Aracım: ${esc(ar.model || '')}, ${esc(ar.plaka || '')}${yakin ? ', bakım yaklaştı' : ''}">
      <span class="ox-ubg-kutu-g">${gorsel('usta-arac', '', 'ox-ubg-kutu-arac')}</span><span class="ox-chev">${oi('sag')}</span>
      <span class="ox-ubg-kutu-yazi"><b>Aracım</b><small>${esc(ar.plaka || ar.model || '')}${yakin ? ` · <em>bakım ${km <= 0 ? 'zamanı' : 'yakın'}</em>` : ''}</small></span></button>`);
  }
  if (gz.length) l.push(`<button type="button" class="ox-kart ox-ubg-kutu" data-ux-alt="guzergah" aria-label="Sınav güzergâhları: ${gz.length} güzergâh">
      <span class="ox-ubg-kutu-g">${gorsel('usta-guzergah', '', 'ox-ubg-kutu-gz')}</span><span class="ox-chev">${oi('sag')}</span>
      <span class="ox-ubg-kutu-yazi"><b>Sınav güzergâhları</b><small>${gz.length} güzergâh</small></span></button>`);
  return l.length ? `<div class="ox-ubg-kutular${l.length === 1 ? ' tek' : ''}">${l.join('')}</div>` : '';
}

/* ---------- kapatılmamış dersler (alt ekran) ---------- */
function kapanmamisHtml(ctx) {
  const l = ctx.kapanmamis;
  const ust = geri('Bugün', { 'data-ux-alt': '' }) + sayfaBas('Ders kaydını tamamla', l.length ? `${l.length} dersin kaydı eksik` : '');
  if (!l.length) return ust + kart(bos('tik', 'Eksik ders kaydı yok', 'Geçmiş derslerinin hepsi kapatıldı.', dugme('Bugün’e dön', { 'data-ux-alt': '' }, { tur: 'ikincil', kucuk: true })), 'ox-ubg-bos');
  return ust + l.map(d => {
    const k = kursiyer(d.kursiyer); if (!k) return '';
    const s = sinifAd(k), no = ctx.P.dersNo(d, k), ne = `${tamAd(k)}, ${gunAy(d.tarih)} ${d.saat}`;
    return kart(`<div class="ox-ubg-kd-bilgi">
        <p class="ox-ubg-kd-ad">${oi('kisi')}<b>${esc(tamAd(k))}</b></p>
        <p>${oi('takvim')}<span>${esc(gunAy(d.tarih))} ${esc(gunAdi(d.tarih))} · ${esc(d.saat)}</span></p>
        <p>${oi('direksiyon')}<span>${esc(s.uzun)}${s.top ? ` · ${esc(ctx.P.dersEtiket(d, k))}` : ''}</span></p></div>
      <div class="ox-ubg-kd-dg">${dugme('Yapıldı', { 'data-yapildi': d.id, 'aria-label': `${ne}: yapıldı olarak kapat` }, { tur: 'cizgi', ikon: 'tik' })}${dugme('Gelmedi', { 'data-gelmedi': d.id, 'aria-label': `${ne}: gelmedi olarak kapat` }, { tur: 'cizgi', ikon: 'yanlis' })}</div>`, 'ox-ubg-kd');
  }).join('') + `<p class="ox-ubg-dip">Ders sayısı ve takip formu seçimine göre yazılır. “Yapıldı” konuları, değerlendirmeyi ve imzaları sorar; “Gelmedi” öğrenciye ve kurs müdürüne haber verir.</p>`;
}

/* ---------- ekran ---------- */
let sayac = null;
export function ekran(ctx) {
  if (ctx.alt === 'kapanmamis') return { html: kapanmamisHtml(ctx) };
  const iptalsiz = ctx.bugun.filter(d => d.durum !== 'İptal');
  const yapilan = iptalsiz.filter(d => d.durum !== 'Planlandı').length;
  const sd = ctx.siradaki, aktifVar = ctx.bugun.some(d => d.durum === 'Planlandı' && d.bas);
  const kalanlar = ctx.bugun.filter(d => d.durum === 'Planlandı' && d !== sd);
  const biten = iptalsiz.filter(d => d.durum !== 'Planlandı');
  let govde;
  if (!iptalsiz.length) {
    const ym = yarinMetni(ctx);
    govde = eksikKart(ctx) + `<div class="ox-ubg-bos">${kart(bos('takvim', 'Bugün dersin yok', ym ? `Sıradaki: ${ym}` : 'Kurs sana ders planlayınca burada görünür.', dugme('Programı aç', { 'data-egs': 'hafta' }, { tur: 'ikincil', kucuk: true })))}</div>`;
  } else if (!sd) govde = bittiKart(ctx) + eksikKart(ctx) + bitenler(ctx, biten, iptalsiz);
  else govde = siraKart(ctx, sd) + eksikKart(ctx) + program(ctx, kalanlar, aktifVar) + bitenler(ctx, biten, iptalsiz);
  const k2 = kutular(ctx);
  const kural = liste([satir({ ikon: 'kalkan', baslik: 'Kurallar ve sık sorulanlar', alt: 'Ders, sınav ve görevle ilgili mevzuat', attrs: { 'data-ux-alt': 'kurallar' } })]);
  return {
    html: ust(ctx, iptalsiz, yapilan) + govde + `<div class="ox-ubg-alt">${k2}${kural}</div>`,
    baglan(kap) {
      clearInterval(sayac); sayac = null;
      const el = kap.querySelector('[data-ubg-sure]');
      if (el) {
        const bas = +el.dataset.ubgSure;
        sayac = setInterval(() => { if (!el.isConnected) { clearInterval(sayac); sayac = null; return; } el.textContent = Math.max(0, Math.floor((Date.now() - bas) / 60e3)); }, 15e3);
      }
      kap.addEventListener('click', ev => {
        const b = ev.target.closest('[data-ubg-daha]'); if (!b) return;
        const ac = b.getAttribute('aria-expanded') !== 'true', fazla = kap.querySelectorAll('[data-ubg-fazla]');
        fazla.forEach(r => { r.hidden = !ac; });
        b.setAttribute('aria-expanded', String(ac));
        b.querySelector('span').textContent = ac ? 'Daha az göster' : `Sonrasında ${fazla.length} ders daha`;
      });
    },
  };
}
export const sifirla = () => {};

stilEkle('ox-ubg', `
.ox-ubg-bas{margin-bottom:16px}
.ox-ubg-bas .ox-ubg-tarih{margin:0 0 4px;font-size:15px;color:var(--ox-ikincil)}
.ox-ubg-bas h1{overflow-wrap:anywhere}
/* sıradaki ders */
.ox-ubg-sira{padding:12px 20px 18px}
.ox-ubg-sira-ust{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}
.ox-ubg-etiket{display:flex;align-items:center;gap:8px;min-width:0;font-size:15px;font-weight:600;color:var(--ox-ikincil)}
.ox-ubg-etiket i{flex:none;width:3px;height:16px;border-radius:2px;background:var(--ox-mavi)}
.ox-ubg-etiket.canli{color:var(--ox-mavi)}
.ox-ubg-etiket.canli i{width:9px;height:9px;border-radius:50%;background:var(--ox-yesil);animation:ox-ubg-nabiz 1.8s ease-in-out infinite}
.ox-ubg-etiket.turuncu{color:#c26a00}.ox-ubg-etiket.turuncu i{background:var(--ox-turuncu)}
@keyframes ox-ubg-nabiz{0%,100%{transform:scale(.8);opacity:1}50%{transform:scale(1.15);opacity:.5}}
.ox-ubg-diger{position:relative;flex:none;display:grid;place-items:center;width:44px;height:44px;margin-right:-4px;color:var(--ox-bas)}
.ox-ubg-diger::before{content:"";position:absolute;inset:6px 4px;border-radius:10px;background:rgba(255,255,255,.85);box-shadow:0 1px 2px rgba(16,24,40,.06)}
.ox-ubg-diger .ox-i{position:relative}
.ox-ubg-diger .ox-i{width:24px;height:24px;stroke-width:2.2}
.ox-ubg-diger:active::before{background:#fff;transform:scale(.94)}
.ox-ubg-diger::before{transition:transform .1s}
.ox-ubg-sira-orta{display:flex;align-items:center;gap:14px;margin-top:2px}
.ox-ubg-kim{flex:1;min-width:0;overflow-wrap:break-word}
.ox-ubg-kim h2{font-size:25px;line-height:1.15;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas);overflow-wrap:break-word}
.ox-ubg-kim h2.uzun{font-size:21px;line-height:1.2}
.ox-ubg-kim p{margin-top:4px;font-size:16px;font-weight:500;color:var(--ox-metin)}
.ox-ubg-kim small{display:block;margin-top:6px;font-size:14.5px;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-ubg-saat{flex:none;display:grid;justify-items:center;align-content:center;min-width:104px;min-height:66px;padding:8px 14px;border-radius:14px;background:var(--ox-mavi-orta)}
.ox-ubg-saat b{font-size:31px;line-height:1;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-ubg-saat small{margin-top:4px;font-size:13px;font-weight:600;color:var(--ox-mavi)}
.ox-ubg-saat b em{font-style:normal;font-size:18px;font-weight:700;letter-spacing:0;color:var(--ox-ikincil)}
.ox-ubg-durum{display:flex;align-items:flex-start;gap:8px;margin-top:14px;font-size:14.5px;line-height:1.4;font-weight:600;color:var(--ox-bas)}
.ox-ubg-durum .ox-i{flex:none;width:20px;height:20px;color:var(--ox-mavi)}
.ox-ubg-durum small{font-size:14px;font-weight:400;color:var(--ox-ikincil)}
.ox-ubg-durum.yesil .ox-i{color:var(--ox-yesil)}.ox-ubg-durum.turuncu .ox-i{color:var(--ox-turuncu)}.ox-ubg-durum.gri .ox-i{color:var(--ox-soluk)}
.ox-ubg-durum.turuncu{font-weight:500;color:var(--ox-metin)}
.ox-ubg-durum.not{font-weight:400;color:var(--ox-metin)}
.ox-ubg-durum.not span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ox-ubg-durum.not .ox-i{color:var(--ox-ikincil)}
.ox-ubg-sira-dg{margin-top:16px}
.ox-ubg-iki{display:grid;grid-template-columns:1fr 1.4fr;gap:10px}
.ox-ubg-iki .ox-dg{width:100%;min-width:0;padding:0 16px}
/* günün tamamı bitti */
.ox-ubg-bitti .ox-hero-gorsel{top:50%;transform:translateY(-50%);right:10px;width:36%;max-width:150px;aspect-ratio:1/1;height:auto}
.ox-ubg-bitti.gorselli .ox-hero-yazi,.ox-ubg-bitti .ox-hero-dg{max-width:60%}
/* kaydı eksik */
.ox-ubg-eksik{margin-top:12px}
.ox-ubg-tamamla{display:inline-flex;align-items:center;gap:2px;color:var(--ox-mavi);font-size:15.5px;font-weight:600}
.ox-ubg-tamamla .ox-i{width:18px;height:18px;stroke-width:2.3}
/* ders satırları */
.ox-ubg-ders{position:relative;background:var(--ox-kart)}
.ox-ubg-liste>.ox-ubg-ders+.ox-ubg-ders::before{content:"";position:absolute;top:0;right:16px;left:16px;border-top:1px solid var(--ox-ayrac)}
.ox-ubg-ders-sat{display:flex;align-items:center}
.ox-ubg-ders-ana{flex:1;min-width:0;display:flex;align-items:center;min-height:68px;padding:12px 14px 12px 16px;text-align:left}
.ox-ubg-ders-ana:active,.ox-ubg-daha:active{background:#f2f5fa}
.ox-ubg-ders-saat{flex:none;width:64px;padding-right:12px;margin-right:14px;border-right:1px solid var(--ox-cizgi);font-size:17px;line-height:38px;font-weight:700;color:var(--ox-bas);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.ox-ubg-ders-govde{flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:2px}
.ox-ubg-ders-govde b{font-size:16px;line-height:1.25;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas);overflow-wrap:break-word}
.ox-ubg-ders-govde small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-ubg-ders-sag{flex:none;display:flex;align-items:center;margin-left:10px}
.ox-ubg-ders-sag .ox-cip .ox-i{width:15px;height:15px;stroke-width:2.6}
.ox-ubg-ders-dg{flex:none;padding-right:14px}
.ox-ubg-ders.bitti .ox-ubg-ders-saat{color:var(--ox-ikincil)}
.ox-ubg-imza{margin:-10px 16px 0 94px;padding:0 0 12px}
.ox-ubg-imza button{position:relative;display:inline-flex;align-items:center;gap:6px;min-height:32px;color:var(--ox-mavi);font-size:14.5px;font-weight:600}
.ox-ubg-imza button .ox-i{width:18px;height:18px;color:var(--ox-yesil)}
.ox-ubg-imza button::after{content:"";position:absolute;inset:-6px -8px}
.ox-ubg-daha{position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;min-height:50px;padding:0 16px;background:var(--ox-mavi-acik);color:var(--ox-mavi);font-size:15.5px;font-weight:600;text-align:left}
.ox-ubg-daha .ox-i{width:20px;height:20px;stroke-width:2.2;transition:transform .2s}
.ox-ubg-daha[aria-expanded=true] .ox-i{transform:rotate(180deg)}
.ox-ubg-bek{color:#c26a00;font-weight:600}
/* kutular */
.ox-ubg-alt{margin-top:24px}.ox-ubg-turler{display:block;margin-top:4px;color:var(--ox-ikincil);font-size:12.5px}.ox-ubg-kutular+.ox-liste{margin-top:12px}
.ox-ubg-kutular{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ox-ubg-kutu{position:relative;display:flex!important;flex-direction:column;min-width:0;padding:12px 12px 14px 14px;text-align:left}
.ox-ubg-kutu .ox-ubg-kutu-yazi{margin-top:auto}
.ox-ubg-kutu+.ox-ubg-kutu{margin-top:0}
.ox-ubg-kutu .ox-chev{position:absolute;top:12px;right:10px}
.ox-ubg-kutu-g{display:grid;place-items:center;height:80px;margin:8px 0 8px}
.ox-ubg-kutu-g .ox-gorsel{width:128px;height:80px;max-width:100%;object-fit:contain}
.ox-ubg-kutu-yazi{display:grid;gap:2px;min-width:0}
.ox-ubg-kutu-yazi b{font-size:16px;line-height:1.2;font-weight:800;letter-spacing:-.025em;color:var(--ox-bas);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:400px){.ox-ubg-kutu-yazi b{font-size:15px}}
.ox-ubg-kutu-yazi small{font-size:14px;line-height:1.3;color:var(--ox-ikincil);overflow-wrap:anywhere}
.ox-ubg-kutu-yazi em{font-style:normal;color:#c26a00;font-weight:600}
.ox-ubg-kutular.tek{grid-template-columns:1fr}
.ox-ubg-kutular.tek .ox-ubg-kutu{flex-direction:row;align-items:center;gap:14px;padding:12px 40px 12px 14px}
.ox-ubg-kutular.tek .ox-ubg-kutu-g{flex:none;width:112px;height:70px;margin:0}
.ox-ubg-kutular.tek .ox-ubg-kutu-g .ox-gorsel{width:112px;height:70px}
.ox-ubg-kutular.tek .ox-chev{top:50%;transform:translateY(-50%);right:12px}
.ox-ubg-bos{margin-top:4px}
.ox-ubg-eksik+.ox-ubg-bos{margin-top:12px}
/* kapatılmamış dersler */
.ox-ubg-kd{padding:16px}
.ox-ubg-kd-bilgi{display:grid;gap:8px;padding:14px;border-radius:14px;background:var(--ox-gri-acik)}
.ox-ubg-kd-bilgi p{display:flex;align-items:center;gap:10px;font-size:15px;color:var(--ox-metin)}
.ox-ubg-kd-bilgi .ox-i{width:20px;height:20px;color:var(--ox-ikincil)}
.ox-ubg-kd-ad b{min-width:0;font-size:18px;font-weight:800;letter-spacing:-.015em;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-ubg-kd-dg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.ox-ubg-kd-dg .ox-dg{width:100%;min-width:0;padding:0 12px}
.ox-ubg-kd-dg [data-yapildi] .ox-i{color:var(--ox-yesil)}
.ox-ubg-kd-dg [data-gelmedi] .ox-i{color:var(--ox-kirmizi)}
.ox-ubg-dip{margin-top:16px;font-size:14px;line-height:1.45;color:var(--ox-ikincil)}
@media (prefers-reduced-motion:reduce){.ox-ubg-etiket.canli i{animation:none}}
`);
// gece dersi çipi (Bugün, Program, öğrenci ayrıntısı)
stilEkle('ox-ugc', `.ox-ugc{display:inline-flex;align-items:center;gap:4px;height:22px;margin-left:8px;padding:0 8px 0 6px;border-radius:999px;background:var(--ox-mor-acik);color:var(--ox-mor);font-size:12.5px;line-height:1;font-weight:600;white-space:nowrap;vertical-align:middle;letter-spacing:0}
.ox-ugc .ox-i{width:13px;height:13px}
.ox-ubg-kim small:has(.ox-ugc),.ox-ubg-ders-govde small:has(.ox-ugc),.ox-upr-alt:has(.ox-ugc){display:flex!important;flex-wrap:wrap;align-items:center;column-gap:8px;row-gap:4px}
.ox-ubg-kim small .ox-ugc,.ox-ubg-ders-govde small .ox-ugc,.ox-upr-alt .ox-ugc{margin-left:0}`);
stilEkle('ox-ubg-dar', `.ox-ubg-kim h2{overflow-wrap:normal!important;word-break:normal!important;hyphens:none}
@media (max-width:350px){.ox-ubg-saat{min-width:84px!important}}`);
