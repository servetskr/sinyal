// Öğretmen uygulaması · Öğrenciler sekmesi (yeni tasarım; tasarım dili js/ogr/ui.js, öğrenci uygulamasıyla ortak).
// Ekranlar: liste (arama + aşama sekmeleri + aşama/sınıf grupları) · 'ogr:<id>' öğrenci ayrıntısı · 'deneme:<id>' deneme uygulama sınavı
// (tam ekran; MEB EK-3/EK-4 formu) · 'sonuc:<id>' son denemenin sonucu.
// Eski portal.js'ten taşınanlar: kursiyer listesi ve araSuz (yeniden çizmeden arama), egOgrAc (ayrıntı penceresi), deneme.js denemeAc (pencere).
// Deneme mantığı (form, 5 mavi / 2 sarı / 1 kırmızı kuralı, kayıt) deneme.js'teki dışa aktarımlardan gelir; burada kopyası yok.
import { S, SINIFLAR, kursiyer, tamAd, sonrakiDers, risk, fark, tarihOku, dersSirasi } from '../veri.js?v=218';
import { gerekliDireksiyon } from '../veri.js?v=218';
import { gunAdi, ayAdi } from '../ui.js?v=218';
import { sonucHesap, denemeFormu, denemeKaydet, denemeAraci, denemeBolumAd, denemeFormAd, sonDeneme } from '../deneme.js?v=218';
import { geceSayim } from './bugun.js?v=218';
import { esc, oi, sayfaBas, geri, bolum, baglanti, kart, liste, satir, ikonKutu, cip, serit, ayrac, not, bos, dugme, sekmeler, akisUst, akisAlt, odakTuzagi, stilEkle } from '../ogr/ui.js?v=218';

/* ---------- ekran durumu (yeniden çizimde korunur) ---------- */
let filtre = 'tumu';        // 'tumu' | 'direksiyon' | 'sinav' | 'diger'
let ara = '';               // arama metni
let gecmisHepsi = false;    // öğrenci ayrıntısı: ders geçmişinin tamamı
// { id, isaret: {}, not: '', acik: [bölüm anahtarları] }: kaydedilmemiş deneme; ekran kapansa ya da sayfa yenilense de korunur
const TASLAK = 'sinyal-eg-deneme';
let taslak = (() => { try { return JSON.parse(sessionStorage.getItem(TASLAK) || 'null'); } catch (x) { return null; } })();
const taslakYaz = () => { try { if (taslak) sessionStorage.setItem(TASLAK, JSON.stringify(taslak)); else sessionStorage.removeItem(TASLAK); } catch (x) { } };
let serbest = null;         // tam ekran denemenin odak tuzağı

const tuzakBirak = () => { if (serbest) { const f = serbest; serbest = null; f(); } };

/* ---------- yardımcılar ---------- */
const AS_GRUP = { Direksiyon: 'direksiyon', 'Sınav': 'sinav' };
const GRUP_AD = { direksiyon: 'Direksiyon aşamasında', sinav: 'Sınav aşamasında', diger: 'Diğer öğrenciler' };
const grupOf = k => AS_GRUP[k.asama] || 'diger';
const araMetin = t => String(t || '').toLocaleLowerCase('tr');
const gunAy = t => { const d = tarihOku(t); return d.getDate() + ' ' + ayAdi(d.getMonth(), true); };
const gunEtiket = t => { const f = fark(t); return f === 0 ? 'Bugün' : f === 1 ? 'Yarın' : f > 1 && f < 7 ? gunAdi(t) : gunAy(t); };
// "B · Manuel" → "B sınıfı · Manuel"
const sinifYaz = k => { const S0 = SINIFLAR[k.sinif]; if (!S0) return esc(k.sinif || ''); const [kod, ...r] = S0.ad.split(' · '); return esc(`${kod} sınıfı${r.length ? ' · ' + r.join(' · ') : ''}`); };
const harf = k => esc(((k.ad || '?')[0] + ((k.soyad || '')[0] || '')).toLocaleUpperCase('tr'));
const avatar = (k, cls = '') => `<span class="ox-uog-av ${cls}" aria-hidden="true">${k.foto ? `<img src="${esc(k.foto)}" alt="" decoding="async">` : harf(k)}</span>`;
const riskli = k => { const r = risk(k); return r && r.puan >= 50 ? r : null; };
const sinavi = k => S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))[0];
const ogrBul = (ctx, id) => ctx.ogrenciler.find(k => k.id === id) || (() => { const k = kursiyer(id); return k && k.egitmen === ctx.eg.id ? k : null; })();

/* ---------- 15 · liste ---------- */
function ogrSatir(k) {
  const S0 = SINIFLAR[k.sinif] || {}, sd = sonrakiDers(k), r = riskli(k), sv = !sd && sinavi(k);
  const sonraki = sd ? `${gunEtiket(sd.tarih)} · ${esc(sd.saat)}` : sv ? `Sınav: ${gunEtiket(sv.tarih)} · ${esc(sv.saat)}` : k.asama === 'Direksiyon' ? 'Planlı ders yok' : esc(k.asama) + ' aşamasında';
  const dir = gerekliDireksiyon(k) && (k.direksiyon > 0 || k.asama === 'Direksiyon' || k.asama === 'Sınav');
  const ilerleme = dir ? `<span class="ox-uog-il">${serit(k.direksiyon / gerekliDireksiyon(k) * 100, k.direksiyon >= gerekliDireksiyon(k) ? 'yesil' : 'mavi', true)}<small>${k.direksiyon} ders tamamlandı</small></span>` : '';
  const ad = esc(tamAd(k));
  return `<button type="button" class="ox-satir ox-uog-ogr" data-ogr-ac="${esc(k.id)}" data-uog-m="${esc(araMetin(tamAd(k) + ' ' + (k.tel || '') + ' ' + (k.no || '')))}" aria-label="${ad}${r ? ', ek çalışma öneriliyor' : ''}: ayrıntılar">
    ${avatar(k)}<span class="ox-uog-ogr-g"><b>${ad}${r ? '<i class="ox-uog-nokta"></i>' : ''}</b><small>${sonraki}</small>${ilerleme}${r ? '<em class="ox-uog-risk">Ek çalışma öneriliyor</em>' : ''}</span><span class="ox-chev">${oi('sag')}</span></button>`;
}
function listeHtml(ctx) {
  const l = ctx.ogrenciler;
  if (!l.length) return sayfaBas('Öğrenciler') + kart(bos('kisiler', 'Öğrencin yok', 'Kurs sana öğrenci atayınca burada ders sayısını ve sonraki dersini görürsün.'), 'ox-uog-bos');
  const siniflar = [...new Set(l.map(k => k.sinif))], cokSinif = siniflar.length > 1;
  // grup içinde sırası: sonraki dersi (ya da sınavı) en yakın olan önce; planı olmayanlar adına göre sonda
  const anahtar = k => { const sd = sonrakiDers(k), sv = !sd && sinavi(k), x = sd || sv; return x ? x.tarih + x.saat : '~'; };
  const gruplar = ['direksiyon', 'sinav', 'diger'].map(g => [g, l.filter(k => grupOf(k) === g).map(k => [anahtar(k), k]).sort((a, b) => a[0].localeCompare(b[0])).map(x => x[1])]).filter(([, x]) => x.length);
  const govde = gruplar.map(([g, x]) => {
    const kartlar = cokSinif
      ? siniflar.filter(s => x.some(k => k.sinif === s)).map(s => `<div class="ox-uog-sinif" data-ara-alt><p class="ox-uog-sinif-ad">${sinifYaz({ sinif: s })}</p>${liste(x.filter(k => k.sinif === s).map(ogrSatir), 'ox-uog-liste')}</div>`).join('')
      : liste(x.map(ogrSatir), 'ox-uog-liste');
    return `<section class="ox-uog-grup" data-ara-grup="${g}">${bolum(GRUP_AD[g], `<span data-ara-say>${x.length} öğrenci</span>`)}${kartlar}</section>`;
  }).join('');
  // dört sekme her zaman görünür (referanstaki düzen); boş aşamanın sekmesinde boş durum gösterilir
  const sek = [['tumu', 'Tümü'], ['direksiyon', 'Direksiyon'], ['sinav', 'Sınav'], ['diger', 'Diğer']];
  return `<div class="ox-uog-sayfa">${sayfaBas(`Öğrenciler<span class="ox-uog-sayi">${l.length}</span>`)}
    <label class="ox-uog-ara">${oi('ara')}<input type="search" data-uog-ara placeholder="İsim veya telefonla ara" value="${esc(ara)}" autocomplete="off" autocapitalize="words" enterkeyhint="search" aria-label="Öğrenci ara"><button type="button" class="ox-uog-ara-sil" data-uog-ara-sil aria-label="Aramayı temizle"${ara ? '' : ' hidden'}>${oi('kapat')}</button></label>
    ${sekmeler(sek, filtre, 'data-uog-filtre', 'cizgi')}
    <div class="ox-uog-gruplar">${govde}</div>
    <div class="ox-uog-yok" data-ara-yok hidden>${kart(bos('ara', 'Eşleşen öğrenci yok', 'Adı ya da telefonu farklı yazmayı dene.'), 'ox-uog-bos')}</div></div>`;
}
// sekmede kimse yoksa (arama boşken) gösterilecek boş durum metni
const BOS_SEKME = { direksiyon: ['direksiyon', 'Direksiyon aşamasında öğrencin yok', 'Direksiyon dersine başlayan öğrencilerin burada görünür.'], sinav: ['bayrak', 'Sınav aşamasında öğrencin yok', 'Uygulama sınavına yazılan öğrencilerin burada görünür.'], diger: ['kisiler', 'Başka aşamada öğrencin yok', 'Teorik, evrak ve kayıt aşamasındaki öğrencilerin burada görünür.'] };
function yokYaz(kap, q) {
  const y = kap.querySelector('[data-ara-yok]'); if (!y) return;
  const [ik, b, p] = !q && BOS_SEKME[filtre] ? BOS_SEKME[filtre] : ['ara', 'Eşleşen öğrenci yok', 'Adı ya da telefonu farklı yazmayı dene.'];
  const kb = y.querySelector('.ox-ik-kutu'); if (kb && kb.dataset.ik !== ik) { kb.dataset.ik = ik; kb.innerHTML = oi(ik); }
  y.querySelector('.ox-bos b').textContent = b; y.querySelector('.ox-bos p').textContent = p;
}
// arama ve sekme: satırlar yeniden çizilmeden süzülür (yazarken odak kaybolmaz); boş kalan grup ve sınıf kartı gizlenir
function suz(kap) {
  const q = araMetin(ara).trim(), qb = q.replace(/\s/g, ''), sil = kap.querySelector('[data-uog-ara-sil]'); if (sil) sil.hidden = !q;
  let gorunen = 0;
  kap.querySelectorAll('[data-ara-grup]').forEach(g => {
    const sekmede = filtre === 'tumu' || filtre === g.dataset.araGrup; let n = 0;
    g.querySelectorAll('[data-uog-m]').forEach(r => { const v = sekmede && (!q || r.dataset.uogM.includes(q) || r.dataset.uogM.replace(/\s/g, '').includes(qb)); r.hidden = !v; if (v) n++; });
    g.querySelectorAll('[data-ara-alt]').forEach(s => { s.hidden = !s.querySelector('[data-uog-m]:not([hidden])'); });
    g.hidden = !n; const sy = g.querySelector('[data-ara-say]'); if (sy) sy.textContent = n + ' öğrenci'; gorunen += n;
  });
  const yok = kap.querySelector('[data-ara-yok]'); if (yok) { yok.hidden = gorunen > 0; if (!gorunen) yokYaz(kap, q); }
}

/* ---------- 16 · öğrenci ayrıntısı ---------- */
function ayrintiHtml(ctx, k) {
  const S0 = SINIFLAR[k.sinif] || {}, sd = sonrakiDers(k), r = riskli(k), dd = sonDeneme(k), sv = sinavi(k), tel = String(k.tel || '').replace(/[^\d+]/g, '');
  const sdGun = sd && (fark(sd.tarih) <= 1 ? gunEtiket(sd.tarih) : gunAy(sd.tarih)), gc = geceSayim(k);
  const meta = [
    gerekliDireksiyon(k) ? `<span>${oi('tik')}${k.direksiyon} ders tamamlandı</span>` : '',
    gc ? `<span class="ox-uog-gece${gc.y >= gc.g ? ' tamam' : ''}"><svg class="ox-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>Gece dersi ${Math.min(gc.y, gc.g)}/${gc.g}</span>` : '',
    sd ? `<span>${oi('saat')}Sonraki ders: ${esc(sd.saat)} (${sdGun})</span>` : sv ? `<span>${oi('bayrak')}Sınav: ${gunAy(sv.tarih)} · ${esc(sv.saat)}</span>` : `<span>${oi('saat')}Planlı ders yok</span>`,
  ].filter(Boolean).join('');
  const profil = `<div class="ox-kart ox-uog-profil"><div class="ox-uog-profil-ust">${avatar(k, 'buyuk')}<div class="ox-uog-profil-ad"><h1>${esc(tamAd(k))}</h1><p>${sinifYaz(k)}</p>${cip(esc(k.asama) + ' aşamasında', k.asama === 'Sınav' ? 'mor' : k.asama === 'Direksiyon' ? 'mavi' : 'gri')}</div></div>
    ${ayrac()}<div class="ox-uog-meta">${meta}</div>${gerekliDireksiyon(k) ? `<div class="ox-uog-profil-il">${serit(k.direksiyon / gerekliDireksiyon(k) * 100, k.direksiyon >= gerekliDireksiyon(k) ? 'yesil' : 'mavi')}<small>${k.direksiyon}/${gerekliDireksiyon(k)}</small></div>` : ''}</div>`;
  const uyari = r ? `<div class="ox-uog-uyari" role="note">${oi('uyari')}<div><b>Ek çalışma öneriliyor</b>${r.nedenler.length ? `<p>${esc(r.nedenler.slice(0, 2).join(' · '))}</p>` : ''}</div></div>` : '';
  const ddSatir = dd
    ? satir({ sol: ikonKutu(dd.sonuc === 'Geçti' ? 'dogru' : 'uyari', dd.sonuc === 'Geçti' ? 'yesil' : 'turuncu'), baslik: dd.sonuc === 'Geçti' ? 'Sınavı geçerdi' : 'Sınavdan kalırdı', alt: esc(`${gunAy(dd.tarih)}${dd.neden ? ' · ' + dd.neden : ''}${dd.hatalar && dd.hatalar.length ? ' · ' + dd.hatalar.length + ' madde' : ''}`), attrs: { 'data-ux-alt': 'sonuc:' + k.id } })
    : satir({ sol: ikonKutu('panoTik', 'gri'), baslik: 'Henüz deneme yapılmadı', alt: 'Resmî formla deneme yapınca sonucu burada görünür.', ok: false });
  const tsk = taslak && taslak.id === k.id ? Object.keys(taslak.isaret).length : -1;
  const dgler = `<div class="ox-uog-dgler">${dugme(tsk >= 0 ? 'Denemeye devam et' : 'Deneme sınavı yap', { 'data-ux-alt': 'deneme:' + k.id }, { ikon: 'panoTik', genis: true })}
    ${tel ? `<a class="ox-dg ox-dg-cizgi genis" href="tel:${esc(tel)}">${oi('tel')}<span>Ara</span></a>` : ''}</div>
    ${tsk >= 0 ? `<p class="ox-uog-taslak">${oi('kalem')}<span>Kaydedilmemiş deneme${tsk ? ` · ${tsk} madde işaretli` : ''}</span><button type="button" data-uog-taslak-sil>Sil</button></p>` : ''}`;
  const gecmis = S.dersler.filter(d => d.kursiyer === k.id && (d.durum === 'Yapıldı' || d.durum === 'Gelmedi')).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const gosterilen = gecmisHepsi ? gecmis : gecmis.slice(0, 4);
  const gSatir = d => {
    const ok = d.durum === 'Yapıldı', no = ok ? dersSirasi(d, k) : null, bek = ok && d.imza && d.imza.kursiyerBekliyor, eks = ok && !d.imza;
    return satir({ sol: ikonKutu(ok ? 'tik' : 'yanlis', ok ? 'yesil' : 'kirmizi'), baslik: `${esc(gunAy(d.tarih))} · ${esc(d.saat)}`, alt: esc([no ? no + '. ders' : 'Ders yapılmadı', ok && d.sure != null ? d.sure + ' dk' : ''].filter(Boolean).join(' · ')),
      sag: !ok ? cip('Gelmedi', 'kirmizi') : bek ? cip('İmza bekliyor', 'turuncu') : eks ? cip('İmza eksik', 'turuncu') : `<span class="ox-uog-imzali" role="img" aria-label="İmzalı">${oi('imza')}</span>`, ok: false });
  };
  const gecmisH = bolum('Ders geçmişi', gecmis.length > 4 ? baglanti(gecmisHepsi ? 'Daha az' : 'Tümü', { 'data-uog-gecmis': true }) : gecmis.length ? `${gecmis.length} ders` : '')
    + (gecmis.length ? liste(gosterilen.map(gSatir), 'ox-uog-gecmis') : liste([satir({ sol: ikonKutu('gecmis', 'gri'), baslik: 'Henüz yapılan ders yok', alt: 'Dersler yapıldıkça burada listelenir.', ok: false })]));
  return geri('Öğrenciler', { 'data-ux-alt': '' }) + `<div class="ox-uog-ayr">${profil}${uyari}`
    + `<div class="ox-bolum"><h2>Son deneme sınavı</h2>${dd ? `<span class="ox-bolum-sag">${dd.sonuc === 'Geçti' ? cip('Geçerdi', 'yesil') : cip('Tekrar öneriliyor', 'turuncu')}</span>` : ''}</div>`
    + liste([ddSatir]) + dgler + gecmisH + '</div>';
}

/* ---------- 17 · deneme sınavı (tam ekran) ---------- */
const RENK_AD = { m: 'Mavi', s: 'Sarı', k: 'Kırmızı' };
const isaretSay = (b, isr) => b.maddeler.reduce((a, x) => a + (isr[x.id] ? 1 : 0), 0);
const bolumTon = (b, isr) => { const l = b.maddeler.filter(x => isr[x.id]); return l.some(x => x.renk === 'k') ? 'kirmizi' : l.some(x => x.renk === 's') ? 'turuncu' : 'mavi'; };
const bolumCip = (b, isr) => { const n = isaretSay(b, isr); return n ? cip(n + ' ihlal', bolumTon(b, isr)) : ''; };
const durumYaz = n => n === 2 ? '2 ihlal' : n ? 'ihlal işaretli' : 'işaretli değil';
const isaretHtml = (renk, cls = '') => `<span class="ox-uog-r ${renk} ${cls}" aria-hidden="true">${renk === 's' ? '<i></i><i></i>' : oi('kapat')}</span>`;
function maddeHtml(x, n) {
  return `<button type="button" class="ox-uog-md ${x.renk}${n ? ' secili' : ''}" data-uog-md="${x.id}" data-n="${n || ''}" aria-pressed="${!!n}">
    ${isaretHtml(x.renk)}<span class="ox-uog-md-m"><b>${esc(x.sira)})</b> ${esc(x.metin)}<span class="ox-uog-gizli" data-uog-durum>, ${RENK_AD[x.renk]} madde: ${durumYaz(n)}</span></span></button>`;
}
function sayacHtml(r) {
  const c = (t, n, top, ton) => `<div class="ox-uog-sy ${ton}${n >= top ? ' dolu' : ''}"><small>${t}</small><b>${n}/${top}</b></div>`;
  return c('Mavi', r.say.m, 5, 'm') + c('Sarı', r.say.s, 2, 's') + c('Kırmızı', r.say.k, 1, 'k');
}
const durumCip = r => r.bitti ? cip('Sınav biterdi', 'kirmizi') : cip('Devam ediyor', 'mavi');
function denemeHtml(ctx, k) {
  if (!taslak || taslak.id !== k.id) { taslak = { id: k.id, isaret: {}, not: '', acik: [] }; taslakYaz(); }
  const t = taslak, f = denemeFormu(k.sinif), r = sonucHesap(t.isaret, k.sinif), ar = denemeAraci(k);
  const bolumler = f.bolumler.map(b => {
    const acik = t.acik.includes(b.key), n = b.maddeler.length;
    return `<div class="ox-uog-bl${acik ? ' acik' : ''}" data-uog-bl="${esc(b.key)}"><button type="button" class="ox-uog-bl-bas" data-uog-bl-ac aria-expanded="${acik}">
      <span class="ox-uog-bl-no">${esc(b.no)}</span><span class="ox-uog-bl-ad"><b>${esc(b.ad)}</b><small>${n} madde${b.not ? ' · ' + esc(b.not.toLocaleLowerCase('tr')) : ''}</small></span>
      <span class="ox-uog-bl-cip" data-uog-bl-cip>${bolumCip(b, t.isaret)}</span><span class="ox-chev ox-uog-bl-ok">${oi('asagi')}</span></button>
      <div class="ox-uog-bl-icerik"${acik ? '' : ' hidden'}>${b.maddeler.map(x => maddeHtml(x, t.isaret[x.id])).join('')}</div></div>`;
  }).join('');
  const ust = akisUst({ kapat: 'data-uog-kapat', orta: '<b class="ox-uog-dn-bas">Deneme sınavı</b>' });
  const serit2 = `<div class="ox-uog-dn-ust"><div class="ox-uog-dn-kim">${avatar(k)}<span class="ox-uog-dn-ad"><b>${esc(tamAd(k))}</b><small>${sinifYaz(k)}${ar ? ` · <span class="ox-uog-nw">${esc(ar.plaka)}</span>` : ''}</small></span><span data-uog-durum-cip>${durumCip(r)}</span></div>
    <div class="ox-uog-sayac" data-uog-sayac>${sayacHtml(r)}</div><p class="ox-uog-biter" data-uog-biter role="status"${r.bitti ? '' : ' hidden'}>${oi('uyari')}<span>Gerçek sınavda burada biterdi: ${esc(r.neden)}</span></p></div>`;
  const govde = `<div class="ox-akis-govde ox-uog-dn-govde" data-uog-govde>
    ${not('Hatalı davranışın maddesine dokun. Sarı maddeye ikinci dokunuş ikinci ihlali işaretler, üçüncüsü siler.', 'bilgi')}
    ${bolum('Değerlendirme konuları', f.form + ' formu')}<div class="ox-liste ox-uog-form">${bolumler}</div>
    ${bolum('Öğretmen notu')}<textarea class="ox-uog-not" data-uog-not rows="3" maxlength="300" placeholder="Örn. geri parkta direksiyonu geç kırıyor" aria-label="Öğretmen notu">${esc(t.not)}</textarea>
    <p class="ox-uog-not-alt">Not ve işaretlenen maddeler öğrencinin kaydına işlenir; öğrenci kendi uygulamasında görür.</p></div>`;
  return `<div class="ox-akis ox-uog-dn" role="dialog" aria-modal="true" aria-label="Deneme sınavı: ${esc(tamAd(k))}">${ust}${serit2}${govde}${akisAlt(dugme('Sınavı bitir ve kaydet', { 'data-uog-bitir': true }, { genis: true }))}</div>`;
}
function denemeBagla(ctx, k, kap) {
  const kok = kap.querySelector('.ox-uog-dn'); if (!kok) return;
  document.body.classList.add('ox-akis-acik');
  tuzakBirak(); const bu = odakTuzagi(kok); serbest = bu;
  // ekran başka bir yoldan (geri tuşu, yeniden çizim) kalkarsa odak tuzağı ve kaydırma kilidi bırakılır
  const izle = new MutationObserver(() => { if (!kok.isConnected) { izle.disconnect(); if (serbest === bu) tuzakBirak(); if (!document.querySelector('.ox-akis')) document.body.classList.remove('ox-akis-acik'); } });
  izle.observe(document.body, { childList: true, subtree: true });
  const f = denemeFormu(k.sinif), bul = key => f.bolumler.find(b => b.key === key), t = taslak;
  const kapat = () => { tuzakBirak(); document.body.classList.remove('ox-akis-acik'); ctx.altAc('ogr:' + k.id); };
  const guncelle = () => {
    const r = sonucHesap(t.isaret, k.sinif);
    kok.querySelector('[data-uog-sayac]').innerHTML = sayacHtml(r);
    kok.querySelector('[data-uog-durum-cip]').innerHTML = durumCip(r);
    const bt = kok.querySelector('[data-uog-biter]'); bt.hidden = !r.bitti; if (r.bitti) bt.querySelector('span').textContent = 'Gerçek sınavda burada biterdi: ' + r.neden;
  };
  kok.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); kapat(); } });
  kok.addEventListener('input', ev => { if (ev.target.matches('[data-uog-not]')) { t.not = ev.target.value; taslakYaz(); } });
  kok.addEventListener('click', ev => {
    ev.stopPropagation();
    const e = ev.target;
    if (e.closest('[data-uog-kapat]')) return kapat();
    const ba = e.closest('[data-uog-bl-ac]');
    if (ba) {
      const bl = ba.closest('[data-uog-bl]'), key = bl.dataset.uogBl, ac = !t.acik.includes(key);
      t.acik = ac ? [...t.acik, key] : t.acik.filter(x => x !== key);
      bl.classList.toggle('acik', ac); ba.setAttribute('aria-expanded', ac); bl.querySelector('.ox-uog-bl-icerik').hidden = !ac;
      taslakYaz(); return;
    }
    const md = e.closest('[data-uog-md]');
    if (md) {
      const id = md.dataset.uogMd, renk = md.classList.contains('s') ? 's' : md.classList.contains('k') ? 'k' : 'm', n = ((t.isaret[id] || 0) + 1) % (renk === 's' ? 3 : 2);
      if (n) t.isaret[id] = n; else delete t.isaret[id];
      md.dataset.n = n || ''; md.classList.toggle('secili', !!n); md.setAttribute('aria-pressed', !!n);
      md.querySelector('[data-uog-durum]').textContent = `, ${RENK_AD[renk]} madde: ${durumYaz(n)}`;
      const bl = md.closest('[data-uog-bl]'), b = bul(bl.dataset.uogBl); if (b) bl.querySelector('[data-uog-bl-cip]').innerHTML = bolumCip(b, t.isaret);
      taslakYaz(); return guncelle();
    }
    if (e.closest('[data-uog-bitir]')) {
      const nt = kok.querySelector('[data-uog-not]');
      denemeKaydet(k, t.isaret, nt ? nt.value : t.not);
      taslak = null; taslakYaz(); tuzakBirak(); document.body.classList.remove('ox-akis-acik');
      ctx.altAc('sonuc:' + k.id);
    }
  });
  // kaydırınca üst şeridin altına ince çizgi
  const gv = kok.querySelector('[data-uog-govde]'), us = kok.querySelector('.ox-uog-dn-ust');
  gv.addEventListener('scroll', () => us.classList.toggle('golge', gv.scrollTop > 2), { passive: true });
}

/* ---------- 18 · deneme sonucu ---------- */
function sonucHtml(ctx, k) {
  const dd = sonDeneme(k);
  if (!dd) return geri(esc(tamAd(k)), { 'data-ux-alt': 'ogr:' + k.id }) + kart(bos('panoTik', 'Kayıtlı deneme yok', 'Deneme sınavı yapınca sonucu burada görünür.', dugme('Deneme sınavı yap', { 'data-ux-alt': 'deneme:' + k.id }, { kucuk: true })), 'ox-uog-bos');
  const gecti = dd.sonuc === 'Geçti', say = dd.say || { m: 0, s: 0, k: 0 }, h = dd.hatalar || [];
  const c = (t, n, top, ton) => `<div class="${ton}${n >= top ? ' dolu' : ''}"><small>${t}</small><b>${n}<span>/${top}</span></b></div>`;
  const ozet = `<div class="ox-kart ox-uog-sn ${gecti ? 'gecti' : 'kaldi'}"><div class="ox-uog-sn-ust">${ikonKutu(gecti ? 'dogru' : 'uyari', gecti ? 'yesil' : 'turuncu')}<div><h2>${gecti ? 'Sınavı geçerdi' : 'Ek çalışma gerekiyor'}</h2>
    <p>${gecti ? 'İşaretlenen hatalar sınırın altında kaldı.' : 'Gerçek sınavda burada biterdi: ' + esc(dd.neden)}</p></div></div><div class="ox-uog-sn-say">${c('Mavi', say.m, 5, 'm')}${c('Sarı', say.s, 2, 's')}${c('Kırmızı', say.k, 1, 'k')}</div></div>`;
  // hatalar bölüme göre: en ağır renk başta
  const AG = { k: 0, s: 1, m: 2 }, gruplar = new Map();
  h.forEach(x => { const ad = denemeBolumAd(String(x.id).startsWith('0.') ? 'I' : '', x.bas, k.sinif); if (!gruplar.has(ad)) gruplar.set(ad, []); gruplar.get(ad).push(x); });
  const agir = l => Math.min(...l.map(x => AG[x.renk]));
  const alanlar = [...gruplar].sort((a, b) => agir(a[1]) - agir(b[1])).map(([ad, l]) => {
    const en = ['k', 's', 'm'][agir(l)];
    return satir({ sol: isaretHtml(en, 'dolu'), baslik: esc(ad), alt: l.map(x => `${esc(x.sira)}) ${esc(x.metin)}${x.n === 2 ? ' <em>(2 ihlal)</em>' : ''}`).join('<br>'), ok: false, cls: 'ox-uog-alan' });
  });
  const once = (k.dDeneme || []).slice(0, -1).reverse().slice(0, 3);
  return geri(esc(tamAd(k)), { 'data-ux-alt': 'ogr:' + k.id }) + `<div class="ox-uog-sonuc">`
    + sayfaBas('Deneme sınavı sonucu', `${esc(gunAy(dd.tarih))} · ${denemeFormAd(k.sinif)} formu${dd.kim ? ' · ' + esc(dd.kim) : ''}`) + ozet
    + bolum('Geliştirilmesi gereken alanlar', h.length ? h.length + ' madde' : '')
    + (alanlar.length ? liste(alanlar) : liste([satir({ sol: ikonKutu('tik', 'yesil'), baslik: 'Hata işaretlenmedi', alt: 'Formdaki bütün maddeleri doğru yaptı.', ok: false })]))
    + (dd.not ? bolum('Öğretmen notu') + `<figure class="ox-kart ox-uog-notk"><blockquote>“${esc(dd.not)}”</blockquote></figure>` : '')
    + `<div class="ox-uog-kayit" role="status">${oi('dogru')}<div><b>Öğrenciye kaydedildi</b><p>Öğrenci sonucu ve çalışması gereken maddeleri kendi uygulamasında görür.</p></div></div>`
    + (once.length ? bolum('Önceki denemeler', `${k.dDeneme.length - 1} deneme`) + liste(once.map(x => satir({ sol: ikonKutu(x.sonuc === 'Geçti' ? 'dogru' : 'uyari', x.sonuc === 'Geçti' ? 'yesil' : 'turuncu'), baslik: x.sonuc === 'Geçti' ? 'Geçerdi' : 'Kalırdı', alt: esc(`${gunAy(x.tarih)}${x.neden ? ' · ' + x.neden : ''}${x.hatalar && x.hatalar.length ? ' · ' + x.hatalar.length + ' madde' : ''}`), ok: false }))) : '')
    + `<div class="ox-uog-dgler">${dugme('Öğrenciye dön', { 'data-ux-alt': 'ogr:' + k.id }, { genis: true })}</div></div>`;
}

/* ---------- ekran ---------- */
export function ekran(ctx) {
  tuzakBirak();
  const [tur, id] = String(ctx.alt || '').split(':');
  const k = id ? ogrBul(ctx, id) : null;
  if (k && tur === 'deneme') return { tam: true, html: denemeHtml(ctx, k), baglan: kap => denemeBagla(ctx, k, kap) };
  let html;
  if (k && tur === 'sonuc') html = sonucHtml(ctx, k);
  else if (k && tur === 'ogr') html = ayrintiHtml(ctx, k);
  else { gecmisHepsi = false; html = listeHtml(ctx); }
  return {
    html,
    baglan(kap) {
      if (!document.querySelector('.ox-akis')) document.body.classList.remove('ox-akis-acik');
      if (kap.querySelector('[data-uog-ara]')) suz(kap);
      kap.addEventListener('input', ev => { if (ev.target.matches('[data-uog-ara]')) { ara = ev.target.value; suz(kap); } });
      kap.addEventListener('click', ev => {
        const t = ev.target;
        if (t.closest('[data-uog-ara-sil]')) { ara = ''; const i = kap.querySelector('[data-uog-ara]'); i.value = ''; suz(kap); i.focus(); return; }
        const fl = t.closest('[data-uog-filtre]');
        if (fl) {
          filtre = fl.dataset.uogFiltre;
          kap.querySelectorAll('[data-uog-filtre]').forEach(b => { const s = b === fl; b.classList.toggle('secili', s); b.setAttribute('aria-selected', s); });
          suz(kap); return;
        }
        if (t.closest('[data-uog-gecmis]')) { gecmisHepsi = !gecmisHepsi; ctx.yenile(); return; }
        if (t.closest('[data-uog-taslak-sil]')) { taslak = null; taslakYaz(); ctx.yenile(); }
      });
    },
  };
}
export const sifirla = () => { filtre = 'tumu'; ara = ''; gecmisHepsi = false; tuzakBirak(); };

/* ---------- stiller ---------- */
stilEkle('ox-uogrenciler', `
.ox-uog-sayi{margin-left:12px;font-size:20px;font-weight:600;letter-spacing:-.01em;color:var(--ox-soluk);font-variant-numeric:tabular-nums;vertical-align:2px}
.ox-uog-nw{white-space:nowrap}
.ox-uog-gizli{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ox-uog-bos .ox-bos{padding:24px 20px}

/* arama */
.ox-uog-ara{display:flex;align-items:center;gap:10px;height:50px;margin:0 0 14px;padding:0 4px 0 14px;background:var(--ox-kart);border:1px solid var(--ox-cizgi);border-radius:14px;box-shadow:var(--ox-golge);transition:border-color .15s,box-shadow .15s;cursor:text}
.ox-uog-ara>.ox-i{width:21px;height:21px;color:var(--ox-soluk)}
.ox-uog-ara:focus-within{border-color:var(--ox-mavi);box-shadow:0 0 0 3px var(--ox-mavi-acik)}
.ox .ox-uog-ara input{flex:1;min-width:0;height:46px;margin:0;padding:0;border:0;outline:0;background:transparent;box-shadow:none;font:inherit;font-size:16px;color:var(--ox-bas);-webkit-appearance:none;appearance:none;border-radius:0}
.ox .ox-uog-ara input::placeholder{color:var(--ox-soluk);opacity:1}
.ox .ox-uog-ara input::-webkit-search-cancel-button,.ox .ox-uog-ara input::-webkit-search-decoration{-webkit-appearance:none;display:none}
.ox .ox-uog-ara input:focus-visible{outline:0}
.ox-uog-ara-sil{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:10px;color:var(--ox-soluk)}
.ox-uog-ara-sil[hidden]{display:none}
.ox-uog-ara-sil .ox-i{width:18px;height:18px;stroke-width:2.2}

/* sekmeler (Derslerim ile aynı çubuk) */
.ox-uog-sayfa>.ox-sekmeler.cizgi{margin:0 0 4px}
.ox-uog-sayfa>.ox-sekmeler.cizgi button{min-height:44px;margin:-4px 0;padding-bottom:6px;font-size:15.5px}
.ox-uog-sayfa>.ox-sekmeler.cizgi button.secili::after{bottom:3px}
.ox-uog-grup[hidden],.ox-uog-sinif[hidden],.ox-uog-yok[hidden]{display:none}
.ox-uog-grup .ox-bolum{margin:26px 0 12px}
.ox-uog-sinif+.ox-uog-sinif{margin-top:16px}
.ox-uog-sinif-ad{margin:0 0 8px 4px;font-size:13.5px;font-weight:600;color:var(--ox-ikincil)}
.ox-uog-yok{margin-top:20px}

/* öğrenci satırı */
.ox-uog-ogr{align-items:center;padding:14px 12px 14px 16px;min-height:76px}
.ox-uog-ogr[hidden]{display:none}
.ox-liste>.ox-uog-ogr::before{display:none}
.ox-liste>.ox-uog-ogr:not([hidden])~.ox-uog-ogr:not([hidden])::before{display:block;left:74px}
.ox-uog-av{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;overflow:hidden;background:var(--ox-mavi-orta);color:var(--ox-mavi);font-size:15.5px;font-weight:700;letter-spacing:.01em}
.ox-uog-av img{width:100%;height:100%;object-fit:cover}
.ox-uog-av.buyuk{width:68px;height:68px;font-size:23px;box-shadow:0 0 0 3px #fff,0 1px 4px rgba(16,24,40,.12)}
.ox-uog-ogr-g{flex:1;min-width:0;display:grid;gap:2px}
.ox-uog-ogr-g b{font-size:16.5px;line-height:1.25;font-weight:700;letter-spacing:-.012em;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-uog-ogr-g small{font-size:14px;line-height:1.3;color:var(--ox-ikincil)}
.ox-uog-nokta{display:inline-block;width:8px;height:8px;margin-left:7px;border-radius:50%;background:var(--ox-turuncu);vertical-align:2px}
.ox-uog-il{display:grid;grid-template-columns:minmax(48px,88px) auto;align-items:center;justify-content:start;gap:10px;margin-top:6px}
.ox-uog-il small{font-size:13px;color:var(--ox-ikincil);font-variant-numeric:tabular-nums;white-space:nowrap}
.ox-uog-risk{margin-top:3px;font-style:normal;font-size:13.5px;font-weight:600;color:#c26a00}

/* öğrenci ayrıntısı */
.ox-uog-ayr{margin-top:6px}
.ox-uog-profil{padding:18px 18px 16px}
.ox-uog-profil-ust{display:flex;align-items:center;gap:16px}
.ox-uog-profil-ad{min-width:0;display:grid;justify-items:start;gap:3px}
.ox-uog-profil-ad h1{font-size:23px;line-height:1.15;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-uog-profil-ad p{font-size:15px;color:var(--ox-ikincil)}
.ox-uog-profil-ad .ox-cip{margin-top:6px}
.ox-uog-profil .ox-ayrac{margin:16px 0 12px}
.ox-uog-meta{display:flex;flex-wrap:wrap;gap:6px 16px}
.ox-uog-meta span{display:inline-flex;align-items:center;gap:6px;font-size:14.5px;color:var(--ox-metin)}
.ox-uog-meta .ox-i{width:18px;height:18px;stroke-width:2;color:var(--ox-mavi)}
.ox-uog-meta .ox-uog-gece .ox-i{color:var(--ox-mor)}.ox-uog-meta .ox-uog-gece.tamam .ox-i{color:var(--ox-yesil)}
.ox-uog-profil-il{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;margin-top:12px}
.ox-uog-profil-il small{font-size:13.5px;font-weight:600;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-uog-uyari{display:flex;gap:12px;align-items:flex-start;margin-top:12px;padding:14px 16px;border-radius:var(--ox-r);background:var(--ox-turuncu-acik);border:1px solid color-mix(in srgb,var(--ox-turuncu) 22%,#fff)}
.ox-uog-uyari>.ox-i{width:22px;height:22px;color:var(--ox-turuncu);margin-top:1px}
.ox-uog-uyari b{display:block;font-size:16px;font-weight:700;color:#8a4b00}
.ox-uog-uyari p{margin-top:3px;font-size:14px;line-height:1.4;color:#9a5a0c}
.ox-uog-dgler{display:grid;gap:10px;margin-top:16px}
.ox-uog-dgler a.ox-dg{text-decoration:none}
.ox-uog-taslak{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:14px;color:var(--ox-ikincil)}
.ox-uog-taslak .ox-i{width:18px;height:18px;color:var(--ox-soluk)}
.ox-uog-taslak span{flex:1;min-width:0}
.ox-uog-taslak button{position:relative;padding:0 6px;color:var(--ox-kirmizi);font-size:14.5px;font-weight:600}
.ox-uog-taslak button::after{content:"";position:absolute;inset:-13px -6px}
.ox-uog-imzali{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ox-yesil-acik);color:var(--ox-yesil)}
.ox-uog-imzali .ox-i{width:16px;height:16px;stroke-width:2}

/* deneme sınavı (tam ekran) */
.ox-uog-dn-bas{font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--ox-bas)}
.ox-uog-dn-ust{flex:none;width:100%;max-width:560px;margin:0 auto;padding:0 20px 12px;background:#fff;border-bottom:1px solid transparent;transition:border-color .2s}
.ox-uog-dn-ust.golge{border-bottom-color:var(--ox-ayrac)}
.ox-uog-dn-kim{display:flex;align-items:center;gap:12px}
.ox-uog-dn-kim .ox-uog-av{width:40px;height:40px;font-size:14.5px}
.ox-uog-dn-ad{flex:1;min-width:0;display:grid;gap:1px}
.ox-uog-dn-ad b{font-size:17px;line-height:1.25;font-weight:700;letter-spacing:-.012em;color:var(--ox-bas);overflow-wrap:anywhere}
.ox-uog-dn-ad small{font-size:13.5px;line-height:1.3;color:var(--ox-ikincil);overflow-wrap:anywhere}
.ox-uog-sayac{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.ox-uog-sy{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;height:40px;padding:0 12px;border-radius:12px;transition:background-color .15s,color .15s}
.ox-uog-sy small{font-size:14px;font-weight:600}
.ox-uog-sy b{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}
.ox-uog-sy.m{background:var(--ox-mavi-acik);color:var(--ox-mavi)}
.ox-uog-sy.s{background:var(--ox-sari-acik);color:#a87400}
.ox-uog-sy.k{background:var(--ox-kirmizi-acik);color:var(--ox-kirmizi)}
.ox-uog-sy.m.dolu{background:var(--ox-mavi);color:#fff}.ox-uog-sy.s.dolu{background:var(--ox-sari);color:#4a3500}.ox-uog-sy.k.dolu{background:var(--ox-kirmizi);color:#fff}
.ox-uog-biter{display:flex;align-items:flex-start;gap:8px;margin-top:8px;font-size:14px;line-height:1.35;font-weight:600;color:var(--ox-kirmizi)}
.ox-uog-biter[hidden]{display:none}
.ox-uog-biter .ox-i{width:18px;height:18px;margin-top:1px}
.ox-uog-dn-govde{padding-top:4px}
.ox-uog-dn-govde>.ox-not{margin-top:6px}
.ox-uog-dn-govde .ox-bolum{margin-top:24px}
.ox-uog-bl+.ox-uog-bl{border-top:1px solid var(--ox-ayrac)}
.ox-uog-bl-bas{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;padding:10px 14px 10px 16px;text-align:left;background:var(--ox-kart)}
.ox-uog-bl-bas:active{background:#f2f5fa}
.ox-uog-bl-no{flex:none;width:22px;font-size:14px;font-weight:600;color:var(--ox-soluk);font-variant-numeric:tabular-nums}
.ox-uog-bl-ad{flex:1;min-width:0;display:grid;gap:1px}
.ox-uog-bl-ad b{font-size:15.5px;line-height:1.3;font-weight:600;color:var(--ox-bas)}
.ox-uog-bl-ad small{font-size:13px;color:var(--ox-soluk)}
.ox-uog-bl-cip{flex:none}
.ox-uog-bl-cip:empty{display:none}
.ox-uog-bl-ok .ox-i{transition:transform .2s}
.ox-uog-bl.acik .ox-uog-bl-ok .ox-i{transform:rotate(180deg)}
.ox-uog-bl-icerik{padding:0 0 8px}
.ox-uog-bl-icerik[hidden]{display:none}
.ox-uog-md{position:relative;display:flex;align-items:flex-start;gap:12px;width:calc(100% - 16px);margin:0 8px;min-height:48px;padding:10px 10px 10px 8px;text-align:left;border-radius:12px;transition:background-color .15s}
.ox-uog-md+.ox-uog-md{margin-top:2px}
.ox-uog-md:active{background:var(--ox-gri-acik)}
.ox-uog-md-m{flex:1;min-width:0;font-size:15px;line-height:1.4;color:var(--ox-metin)}
.ox-uog-md-m b{font-weight:600;color:var(--ox-bas)}
.ox-uog-md.secili.m{background:var(--ox-mavi-acik)}
.ox-uog-md.secili.s{background:var(--ox-sari-acik)}
.ox-uog-md.secili.k{background:var(--ox-kirmizi-acik)}
.ox-uog-md.secili .ox-uog-md-m{color:var(--ox-bas)}
/* renk işareti: boşken beyaz zemin + renkli çerçeve; işaretliyken dolu (sarıda iki ihlal için iki yuva) */
.ox-uog-r{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:8px;border:1.5px solid;color:transparent;transition:background-color .15s,border-color .15s,color .15s}
.ox-uog-r .ox-i{width:16px;height:16px;stroke-width:2.6}
.ox-uog-r.m{border-color:#a9c6f7;background:#fff}
.ox-uog-r.k{border-color:#f3b1b3;background:#fff}
.ox-uog-r.s{grid-template-columns:1fr 1fr;gap:3px;padding:4px;border-color:#f1d27a;background:#fff}
.ox-uog-r.s i{display:block;width:100%;height:100%;border-radius:3px;background:var(--ox-sari-acik);transition:background-color .15s}
.secili>.ox-uog-r.m,.ox-uog-r.m.dolu{background:var(--ox-mavi);border-color:var(--ox-mavi);color:#fff}
.secili>.ox-uog-r.k,.ox-uog-r.k.dolu{background:var(--ox-kirmizi);border-color:var(--ox-kirmizi);color:#fff}
.secili>.ox-uog-r.s,.ox-uog-r.s.dolu{border-color:#e9b100}
.secili>.ox-uog-r.s i:first-child,.ox-uog-md[data-n="2"]>.ox-uog-r.s i,.ox-uog-r.s.dolu i{background:var(--ox-sari)}
.ox .ox-uog-not,.ox-akis .ox-uog-not{display:block;width:100%;min-height:84px;margin:0;padding:12px 14px;border:1px solid var(--ox-cizgi);border-radius:14px;background:var(--ox-zemin);font:inherit;font-size:16px;line-height:1.4;color:var(--ox-bas);resize:none;box-shadow:none;-webkit-appearance:none;appearance:none}
.ox-akis .ox-uog-not:focus{outline:2px solid var(--ox-mavi);outline-offset:0;background:#fff}
.ox-uog-not::placeholder{color:var(--ox-soluk)}
.ox-uog-not-alt{margin-top:8px;font-size:13.5px;line-height:1.4;color:var(--ox-soluk)}
.ox-uog-dn .ox-akis-alt{border-top:1px solid var(--ox-ayrac)}
.ox-uog-dn :focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px}

/* sonuç */
.ox-uog-sonuc>.ox-sayfa-bas{margin-top:4px}
.ox-uog-sn{padding:18px 18px 14px}
.ox-uog-sn.kaldi{background:linear-gradient(135deg,var(--ox-turuncu-acik) 0%,#fff9ef 100%);border-color:color-mix(in srgb,var(--ox-turuncu) 22%,#fff)}
.ox-uog-sn.gecti{background:linear-gradient(135deg,var(--ox-yesil-acik) 0%,#f3fbf6 100%);border-color:color-mix(in srgb,var(--ox-yesil) 20%,#fff)}
.ox-uog-sn-ust{display:flex;align-items:flex-start;gap:14px}
.ox-uog-sn-ust .ox-ik-kutu{background:#fff}
.ox-uog-sn-ust h2{font-size:21px;line-height:1.2;font-weight:800;letter-spacing:-.02em;color:var(--ox-bas)}
.ox-uog-sn-ust p{margin-top:4px;font-size:15px;line-height:1.4;color:var(--ox-metin)}
.ox-uog-sn-say{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:16px;padding-top:12px;border-top:1px solid rgba(15,29,64,.08)}
.ox-uog-sn-say div{display:grid;justify-items:center;gap:1px;text-align:center}
.ox-uog-sn-say div+div{border-left:1px solid rgba(15,29,64,.08)}
.ox-uog-sn-say small{font-size:13px;color:var(--ox-ikincil)}
.ox-uog-sn-say b{font-size:20px;font-weight:800;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-uog-sn-say b span{font-size:14px;font-weight:500;color:var(--ox-ikincil)}
.ox-uog-sn-say .dolu b{color:var(--ox-kirmizi)}
.ox-uog-alan{align-items:flex-start}
.ox-uog-alan .ox-uog-r{margin-top:1px}
.ox-uog-alan .ox-satir-govde small{line-height:1.45}
.ox-uog-alan .ox-satir-govde em{font-style:normal;font-weight:600;color:#a87400}
.ox-liste>.ox-uog-alan+.ox-uog-alan::before{left:56px}
.ox-uog-notk{margin:0;padding:16px 18px}
.ox-uog-notk blockquote{margin:0;font-size:16px;line-height:1.45;color:var(--ox-bas)}
.ox-uog-notk figcaption{margin-top:8px;font-size:14px;color:var(--ox-ikincil)}
.ox-uog-kayit{display:flex;align-items:flex-start;gap:12px;margin-top:16px;padding:14px 16px;border-radius:var(--ox-r);background:var(--ox-yesil-acik)}
.ox-uog-kayit>.ox-i{width:22px;height:22px;color:var(--ox-yesil);margin-top:1px}
.ox-uog-kayit b{display:block;font-size:16px;font-weight:700;color:#127a44}
.ox-uog-kayit p{margin-top:2px;font-size:14px;line-height:1.4;color:#2d6b48}
.ox-uog-sonuc .ox-uog-dgler{margin-top:20px}
@media (prefers-reduced-motion:reduce){.ox-uog-bl-ok .ox-i,.ox-uog-r,.ox-uog-md{transition:none}}
`);
