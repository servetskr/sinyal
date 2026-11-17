/* Mevzuat arama motoru (tarayıcıda çalışır, DOM kullanmaz; node'da da sınanır: arac/mevzuat/arayuz-test.mjs)
   İki küme: 'ortak' (bütün kurslara aynı derlem: veri/mevzuat/dizin.json + vektor.bin) ve 'kurs' (kursa gelen yazılar: worker /mevzuat/hepsi).
   Arama üç yoldan gelir ve birleşir:
   1) Madde yakalama: "madde 15", "md.15", "m.15/1", "mtsk 15", "ööky 56", "15. madde" → o maddenin parçaları en üstte.
   2) Kelime: Türkçe sadeleştirme + hafif kök kırpma + BM25 (parça metni, belge kısa adı, madde no ve başlık).
   3) Anlam: sorgu vektörü (worker /mevzuat/gom, dışarıdan verilen gom() ile) × N×D int8 vektörler (nokta çarpımı).
   Kelime ve anlam listeleri RRF (k=60) ile birleşir. gom() yoksa ya da hata verirse yalnız kelime araması döner, anlamKapali: true. */

const SURUM = '?v=216';
const RRF_K = 60, LISTE_N = 60;
const BM25_K1 = 1.2, BM25_B = 0.75;

/* ---------- Türkçe sadeleştirme ---------- */
const HARF = { 'ı': 'i', 'İ': 'i', 'ğ': 'g', 'ş': 's', 'ç': 'c', 'ö': 'o', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
// Kesme işaretinden sonrası ek sayılır: "MEB'in" → "meb", "5580'de" → "5580"
export function sadele(s) {
  return String(s || '').toLocaleLowerCase('tr-TR')
    .replace(/([\p{L}\p{N}])['’`´]\p{L}+/gu, '$1')
    .replace(/[ıİğşçöüâîû]/g, c => HARF[c] || c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Yaygın durak kelimeleri (sadeleşmiş biçimde)
const DURAK = new Set(('ve veya ile ya yada ama fakat ancak ki de da mi mu bir bu su o bunlar bunun bunu suna sunu onun ona onu ne neden nasil nedir hangi hangisi ' +
  'icin gibi kadar sonra once en daha cok az her hep tum butun hic olan olarak olur olup oldugu olmasi olmak ise yani ayrica dahi ' +
  'uzere gore dair ait itibaren arasinda icinde uzerine karsi bile sey seyi ben sen biz siz onlar var yok mudur midir midir mi mu degil ' +
  'eger diye hem nin nun in un dir dur tir tur the').split(' '));

// Ekler uzundan kısaya; kök en az 4 harf (kısa eklerde 3 değil) kalacak şekilde kırpılır
const EKLER = [
  'lerinden', 'larindan', 'lerinde', 'larinda', 'lerine', 'larina', 'lerini', 'larini', 'lerin', 'larin', 'leri', 'lari',
  'inden', 'indan', 'unden', 'undan', 'sinden', 'sindan', 'sunden', 'sundan', 'sinde', 'sinda', 'sunde', 'sunda', 'sine', 'sina', 'sini', 'sunu',
  'ndeki', 'ndaki', 'deki', 'daki', 'teki', 'taki',
  'mesi', 'masi', 'meyi', 'mayi', 'mek', 'mak',
  'imiz', 'umuz', 'iniz', 'unuz',
  'nden', 'ndan', 'nde', 'nda', 'den', 'dan', 'ten', 'tan',
  'nin', 'nun', 'lik', 'luk', 'ler', 'lar',
  'dir', 'dur', 'tir', 'tur',
  'ine', 'ina', 'une', 'una', 'ini', 'unu',
  'si', 'su', 'de', 'da', 'te', 'ta', 'in', 'un', 'ya', 'ye', 'yi', 'yu',
  'i', 'u', 'a', 'e',
];
const SON_SES = { b: 'p', d: 't', g: 'k' };
const COGUL = new Set(['lerinden', 'larindan', 'lerinde', 'larinda', 'lerine', 'larina', 'lerini', 'larini', 'lerin', 'larin', 'leri', 'lari', 'ler', 'lar']);
// ses düşmesi ve ikizleşme: kaydı → kayıt, hakkı → hak, izni → izin
const DUSME = { izni: 'izin', kayt: 'kayit', hakk: 'hak', izn: 'izin', resm: 'resim', ism: 'isim', sehr: 'sehir', akl: 'akil', bagr: 'bagir', hukm: 'hukum' };  // yumuşama: kitab → kitap, yurd → yurt, belgeg… → k
const kokOnbellek = new Map();
export function kok(w) {
  w = String(w || '');
  if (w.length < 4 || /\d/.test(w)) return w;
  const h = kokOnbellek.get(w); if (h) return h;
  let k = w;
  for (let tur = 0; tur < 4; tur++) {
    let kirpti = false;
    if (tur && SON_SES[k[k.length - 1]]) k = k.slice(0, -1) + SON_SES[k[k.length - 1]];  // yönetmeliğ-in → yönetmelik → aynı kök
    for (const ek of EKLER) {
      const kalan = k.length - ek.length;
      if (k.endsWith(ek) && kalan >= (COGUL.has(ek) ? 3 : 4)) { k = k.slice(0, kalan); kirpti = true; break; }
    }
    if (!kirpti) break;
  }
  if (k.length >= 4 && SON_SES[k[k.length - 1]]) k = k.slice(0, -1) + SON_SES[k[k.length - 1]];
  k = DUSME[k] || k;
  if (kokOnbellek.size > 50000) kokOnbellek.clear();
  kokOnbellek.set(w, k);
  return k;
}
const KELIME = /[\p{L}\p{N}]+/gu;
// Metni köklere çevirir (durak kelimeleri atılır, tek harfler atılır; sayılar kalır). Kök en çok 5 harfe kısaltılır (F5):
// 53 soruluk değerlendirmede (arac/mevzuat/degerlendirme-seti.json) recall@5 kelimeyle 36 → 40, kelime+anlamla 42 → 45.
const KOK_UZ = 5;
// sadeleşmiş tek kelimenin arama terimi (dizin, sorgu ve vurgu aynı terimi kullanır)
export const terim = w => { const k = kok(w); return /\d/.test(k) ? k : k.slice(0, KOK_UZ); };
export function kokler(metin) {
  const l = sadele(metin).match(KELIME) || [];
  const o = [];
  for (const w of l) { if (DURAK.has(w) || (w.length < 2 && !/\d/.test(w))) continue; o.push(terim(w)); }
  return o;
}

/* ---------- madde yakalama ---------- */
// Sorgudaki madde numarasını (ve varsa fıkra ile belge adını) bulur. takmalar: [{ ad: 'mtsk', b: 0 }, …] (sadeleşmiş belge adları)
export function maddeYakala(sorgu, takmalar = []) {
  const s = sadele(sorgu).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  let no = null, fikra = null;
  const sil = [];  // kalan kelimelerden çıkarılacak [baş, son] aralıkları
  const kalip = [
    /(?:^|[^\p{L}])((?:madde(?:si|nin|de)?|md|m)\s*\.?\s*(\d{1,3})(?:\s*[/\-.]\s*(\d{1,2}))?)(?!\d)/u,
    /(?:^|[^\p{L}\d])((\d{1,3})(?:\s*[/\-]\s*(\d{1,2}))?\s*\.?\s*madde(?:si)?)/u,
  ];
  for (const r of kalip) { const m = s.match(r); if (m) { no = m[2]; fikra = m[3] || null; const a = m.index + m[0].length - m[1].length; sil.push([a, a + m[1].length]); break; } }
  // belge adıyla: "mtsk 15", "ook 56/2", "5580 sayili kanun 12" (madde kelimesi olmadan da)
  let belge = null;
  const sirali = takmalar.slice().sort((a, b) => b.ad.length - a.ad.length);
  for (const t of sirali) {
    const r = new RegExp('(?:^|[^\\p{L}\\d])(' + t.ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=[^\\p{L}\\d]|$)', 'u');
    const m = s.match(r); if (!m) continue;
    belge = t.b;
    const a = m.index + m[0].length - m[1].length, z = m.index + m[0].length;
    sil.push([a, z]);
    if (!no) {
      // araya en çok iki kelime yalnız madde kelimesinden önce ("mtsk yönetmeliğinin 15. maddesi"); madde kelimesi yoksa sayı belge adının
      // ardından gelir (araya yalnız yönetmelik/kanun/kılavuz/sayılı) ve ölçü bildirmez: "sağlık raporu 2 yıl", "ktk 2 yıl ceza" madde sanılmaz
      const arka = s.slice(z).match(/^\s*(?:(?:\p{L}+\s+){0,2}?(madde(?:si)?\s*|md\.?\s*|m\.\s*)|(?:(?:yonetmeli\p{L}*|kanun\p{L}*|kilavuz\p{L}*|sayili)\s+){0,2})(\d{1,3})(?:\s*[/\-]\s*(\d{1,2}))?(?!\d)/u);
      const olcu = arka && !arka[1] && /^\s*\.?\s*(?:yil|yas|gun|saat|hafta|dakika|kez|defa|hak(?!kinda)|tl\b|lira|km\b|metre|kisi|ogrenci|kursiyer|aday|arac|sinif|puan|ay(?:\b|lik|da\b|dir))/u.test(s.slice(z + arka[0].length));
      if (arka && !olcu) { no = arka[2]; fikra = arka[3] || null; sil.push([z, z + arka[0].length]); }
    }
    break;
  }
  if (!no) return null;
  let kalan = '';
  for (let i = 0; i < s.length; i++) if (!sil.some(([a, z]) => i >= a && i < z)) kalan += s[i];
  return { no: String(+no), fikra: fikra ? String(+fikra) : null, belge, gecici: /gecici/.test(s), kalan: kalan.replace(/\s+/g, ' ').trim() };
}
const maddeNo = m => { const x = String(m || '').match(/(\d+)/); return x ? String(+x[1]) : null; };
// madde etiketinin türü: "Madde 15", "Geçici Madde 2", "Ek Madde 2", "1 Sayılı Cetvel Madde 5", diğer ("Bölüm 4", "EK-4")
const maddeTuru = m => { m = String(m || ''); return /cetvel/i.test(m) ? 'cetvel' : /ge[cç]ici/i.test(m) ? 'gecici' : /^\s*ek\s+madde/i.test(m) ? 'ek' : /madde/i.test(m) ? 'madde' : 'diger'; };

/* ---------- alıntı ve vurgu ---------- */
// Metinden sorgu köklerinin en sık geçtiği pencereyi seçer; [{ t, m }] parçaları döner (m: vurgulanacak).
// Arayüz her parçayı ayrıca kaçışlar (e()); bu fonksiyon HTML üretmez.
export function alinti(metin, sorguKok, uzunluk = 280) {
  metin = String(metin || '');
  const set = sorguKok instanceof Set ? sorguKok : new Set(sorguKok || []);
  const esler = [];
  if (set.size) for (const m of metin.matchAll(KELIME)) { const k = terim(sadele(m[0])); if (set.has(k)) esler.push([m.index, m.index + m[0].length]); }
  let bas = 0;
  if (metin.length > uzunluk && esler.length) {
    let enIyi = 0, enN = -1;
    for (let i = 0; i < esler.length; i++) { let n = 0; for (let j = i; j < esler.length && esler[j][0] < esler[i][0] + uzunluk * 0.8; j++) n++; if (n > enN) { enN = n; enIyi = i; } }
    bas = Math.max(0, esler[enIyi][0] - Math.round(uzunluk * 0.2));
    const bosluk = metin.lastIndexOf(' ', bas); if (bosluk > 0 && bas - bosluk < 20) bas = bosluk + 1;
  }
  let son = Math.min(metin.length, bas + uzunluk);
  if (son < metin.length) { const b = metin.lastIndexOf(' ', son); if (b > bas + uzunluk * 0.6) son = b; }
  const o = []; let i = bas;
  for (const [a, z] of esler) { if (z <= bas || a >= son) continue; const a2 = Math.max(a, bas), z2 = Math.min(z, son); if (a2 > i) o.push({ t: metin.slice(i, a2), m: false }); o.push({ t: metin.slice(a2, z2), m: true }); i = z2; }
  if (i < son) o.push({ t: metin.slice(i, son), m: false });
  return { parcalar: o, bastaKesik: bas > 0, sondaKesik: son < metin.length };
}

/* ---------- vektör yardımcıları ---------- */
export function base64Int8(s) {
  if (!s) return new Int8Array(0);
  const b = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  const o = new Int8Array(b.length);
  for (let i = 0; i < b.length; i++) { const c = b.charCodeAt(i); o[i] = c > 127 ? c - 256 : c; }
  return o;
}
// float dizisini derlemle aynı biçime çevirir (L2 normalleştir, ×127, yuvarla, [-127,127])
export function int8Yap(v) {
  let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1;
  return Int8Array.from(v, x => Math.max(-127, Math.min(127, Math.round(x / n * 127))));
}
function noktalar(sorgu, vek, D, N) {
  const o = new Float32Array(N);
  for (let i = 0, p = 0; i < N; i++, p += D) { let s = 0; for (let j = 0; j < D; j++) s += sorgu[j] * vek[p + j]; o[i] = s / 16129; }
  return o;
}

/* ---------- filtreler ---------- */
export const FILTRELER = [
  ['hepsi', 'Hepsi'],
  ['mevzuat', 'Yönetmelik ve kanunlar'],
  ['yazi', 'MEB yazıları'],
  ['program', 'Ders programları'],
  ['kurs', 'Kursumuza gelenler'],
];
const FILTRE_UYAR = {
  hepsi: () => true,
  mevzuat: (k, b) => k === 'ortak' && (b.tur === 'yonetmelik' || b.tur === 'kanun'),
  yazi: (k, b) => b.tur === 'yazi',
  program: (k, b) => b.tur === 'program' || b.tur === 'kilavuz',
  kurs: k => k === 'kurs',
};

/* ---------- motor ---------- */
export function yeniMotor() {
  const kume = { ortak: null, kurs: null };  // { belgeler, parcalar, vek: Int8Array, D, takma }
  let dizin = null;  // birleşik BM25 dizini (iki kümenin parçaları)
  let model = '', boyut = 0, onek = { sorgu: '', belge: '' };

  function kumeKur(ad, belgeler, parcalar, vek, D) {
    const k = { ad, belgeler, parcalar, vek: vek && vek.length === parcalar.length * D ? vek : null, D };
    kume[ad] = k; dizin = null;
    return k;
  }
  // Birleşik BM25 dizini: belge = parça; alanlar parça metni + belge kısa adı + madde + başlık (başlık iki kez sayılır)
  function dizinKur() {
    const t0 = Date.now();
    const kayit = [];  // [küme, sıra]
    const terim = new Map(); const uz = [];
    for (const ad of ['ortak', 'kurs']) {
      const k = kume[ad]; if (!k) continue;
      for (let i = 0; i < k.parcalar.length; i++) {
        const p = k.parcalar[i], b = k.belgeler[p.b] || {};
        const l = kokler(`${p.t || ''} ${b.kisa || b.ad || ''} ${p.m || ''} ${p.baslik || ''} ${p.baslik || ''}`);
        const id = kayit.length; kayit.push([ad, i]); uz.push(l.length);
        const sayac = new Map(); for (const w of l) sayac.set(w, (sayac.get(w) || 0) + 1);
        for (const [w, f] of sayac) { let x = terim.get(w); if (!x) terim.set(w, x = []); x.push(id, f); }
      }
    }
    const ort = uz.reduce((a, x) => a + x, 0) / (uz.length || 1);
    dizin = { kayit, terim, uz, ort, N: kayit.length, sure: Date.now() - t0 };
    return dizin;
  }
  const hazirDizin = () => dizin || dizinKur();

  function bm25(qk, uygun) {
    const d = hazirDizin(), skor = new Map();
    for (const w of new Set(qk)) {
      const p = d.terim.get(w); if (!p) continue;
      const df = p.length / 2, idf = Math.log(1 + (d.N - df + 0.5) / (df + 0.5));
      for (let j = 0; j < p.length; j += 2) {
        const id = p[j], f = p[j + 1];
        if (!uygun(id)) continue;
        const s = idf * (f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + BM25_B * d.uz[id] / d.ort));
        skor.set(id, (skor.get(id) || 0) + s);
      }
    }
    return [...skor].sort((a, b) => b[1] - a[1]);
  }

  // Belge takma adları (madde yakalama için): kimlik, kısa adın tamamı, kısa addaki büyük harfli kısaltmalar (MTSK, ÖÖK)
  function takmalar() {
    const o = [];
    const k = kume.ortak; if (!k) return o;
    // ortak kısaltmada (KVKK: 6698 sayılı Kanun ve BİGM yazısı) kanun ve yönetmelik önce gelir
    const once = b => b.tur === 'kanun' || b.tur === 'yonetmelik' ? 0 : 1;
    k.belgeler.map((b, i) => [b, i]).sort((x, y) => once(x[0]) - once(y[0]) || x[1] - y[1]).forEach(([b, i]) => {
      const ekle = ad => { ad = sadele(ad).replace(/\s+/g, ' ').trim(); if (ad.length >= 3 && !o.some(x => x.ad === ad)) o.push({ ad, b: i }); };
      ekle(b.id || '');
      if (b.kisa) { ekle(b.kisa); (String(b.kisa).match(/(?<!\p{L})\p{Lu}{3,}(?!\p{L})|\d{4}/gu) || []).forEach(ekle); }
    });
    return o;
  }

  const kayitAl = id => { const [ad, i] = hazirDizin().kayit[id]; const k = kume[ad]; const p = k.parcalar[i]; return { ad, i, p, b: k.belgeler[p.b] || {} }; };

  async function ara(sorgu, { filtre = 'hepsi', n = 30, gom = null, anlam = true } = {}) {
    const t0 = Date.now();
    sorgu = String(sorgu || '').trim();
    const sonuc = { sonuc: [], anlamKapali: false, madde: null, kokler: [], sure: 0 };
    if (!sorgu || !kume.ortak && !kume.kurs) return sonuc;
    const d = hazirDizin();
    const uyar = FILTRE_UYAR[filtre] || FILTRE_UYAR.hepsi;
    const uygun = id => { const [ad, i] = d.kayit[id]; const k = kume[ad]; return uyar(ad, k.belgeler[k.parcalar[i].b] || {}); };

    // 1) madde
    const md = maddeYakala(sorgu, takmalar());
    sonuc.madde = md;
    const qk = md ? kokler(md.kalan) : [];
    const tumKok = kokler(sorgu);
    sonuc.kokler = [...new Set(tumKok)];
    const maddeIdler = [];
    const ss = sadele(sorgu), mdTur = /cetvel/.test(ss) ? 'cetvel' : md && md.gecici ? 'gecici' : /(?:^|[^\p{L}])ek\s*(?:madde|md)/u.test(ss) ? 'ek' : 'madde';
    if (md) {
      for (let id = 0; id < d.N; id++) {
        const [ad, i] = d.kayit[id]; if (ad !== 'ortak' || !uygun(id)) continue;
        const p = kume.ortak.parcalar[i];
        if (md.belge != null && p.b !== md.belge) continue;
        if (maddeNo(p.m) !== md.no) continue;
        // "KTK madde 2" Ek Madde 2'yi, "madde 4" e-Sınav Bölüm 4'ü getirmez; "Bölüm/EK-" etiketleri yalnız belge adıyla aranınca
        const pt = maddeTuru(p.m); if (pt !== mdTur && !(pt === 'diger' && md.belge != null)) continue;
        maddeIdler.push(id);
      }
      // fıkra verilmişse o fıkra önce; belge verilmemişse kalan kelimelere göre, sonra belge sırasına göre
      const ek = new Map(bm25(qk, id => maddeIdler.includes(id)));
      // parçanın fıkra aralığı: "15/3" ya da "15/1-2" (fıkra 2 de bu parçada)
      const fk = id => { const p = kayitAl(id).p; if (!md.fikra || !p.f) return 0; const [a, z = a] = String(p.f).split('/')[1].split('-').map(Number); return +md.fikra >= a && +md.fikra <= z ? 1 : 0; };
      maddeIdler.sort((a, b) => fk(b) - fk(a) || (ek.get(b) || 0) - (ek.get(a) || 0) || kayitAl(a).p.b - kayitAl(b).p.b || a - b);
    }

    // istenen madde derlemde yoksa (bilerek alınmayan bölüm ya da hatalı numara) ekran bunu söyler
    sonuc.maddeYok = !!md && !maddeIdler.length;

    // 2) kelime (madde yakalandıysa kalan kelimelerle; kalan yoksa bütün sorguyla)
    const kelime = bm25(md && qk.length ? qk : tumKok, uygun).slice(0, LISTE_N);

    // 3) anlam
    let anlamL = [];
    if (anlam && gom) {
      let v = null;
      try { v = await gom((onek.sorgu || '') + sorgu); } catch (x) { v = null; }
      if (v && v.length === boyut) {
        const aday = [];
        for (const ad of ['ortak', 'kurs']) {
          const k = kume[ad]; if (!k || !k.vek || k.D !== boyut) continue;
          const s = noktalar(v, k.vek, k.D, k.parcalar.length);
          aday.push([ad, s]);
        }
        // küme sırasını birleşik dizindeki sıraya çevir
        const bas = { ortak: 0, kurs: kume.ortak ? kume.ortak.parcalar.length : 0 };
        const l = [];
        for (const [ad, s] of aday) for (let i = 0; i < s.length; i++) { const id = bas[ad] + i; if (s[i] > 0 && uygun(id)) l.push([id, s[i]]); }
        l.sort((a, b) => b[1] - a[1]);
        anlamL = l.slice(0, LISTE_N);
      } else sonuc.anlamKapali = true;
    } else sonuc.anlamKapali = true;

    // RRF birleştirme
    const rrf = new Map(), kSira = new Map(), aSira = new Map();
    kelime.forEach(([id], r) => { kSira.set(id, r); rrf.set(id, (rrf.get(id) || 0) + 1 / (RRF_K + r + 1)); });
    anlamL.forEach(([id], r) => { aSira.set(id, r); rrf.set(id, (rrf.get(id) || 0) + 1 / (RRF_K + r + 1)); });
    const sira = [...rrf].sort((a, b) => b[1] - a[1]);
    const goruldu = new Set();
    const ekle = (id, skor, neden) => {
      if (goruldu.has(id)) return; goruldu.add(id);
      const { ad, i, p, b } = kayitAl(id);
      const set = new Set(tumKok), pk = new Set(kokler(`${p.t || ''} ${p.baslik || ''}`));
      sonuc.sonuc.push({ kaynak: ad, belge: b, parca: p, sira: i, skor, neden, vurgu: [...set].filter(w => pk.has(w)) });
    };
    maddeIdler.forEach((id, r) => ekle(id, 1 + 1 / (r + 1), 'madde'));
    for (const [id, s] of sira) {
      // neden: iki listenin de ilk 20'sindeyse 'ikisi'; değilse sırası daha iyi olan liste (kelimede hiç yoksa 'anlam')
      const k = kSira.has(id), a = aSira.has(id), ks = k ? kSira.get(id) : 1e9, as = a ? aSira.get(id) : 1e9;
      ekle(id, s, ks < 20 && as < 20 ? 'ikisi' : as < ks ? 'anlam' : 'kelime');
      if (sonuc.sonuc.length >= n + maddeIdler.length) break;
    }
    sonuc.sonuc = sonuc.sonuc.slice(0, Math.max(n, Math.min(maddeIdler.length, n)));
    sonuc.sure = Date.now() - t0;
    return sonuc;
  }

  // Bir parçanın bulunduğu maddenin bütün parçaları, aynı belgedeki önceki ve sonraki madde
  function madde(kaynak, i) {
    const k = kume[kaynak]; if (!k) return null;
    const p = k.parcalar[i]; if (!p) return null;
    const ayni = j => k.parcalar[j] && k.parcalar[j].b === p.b && (k.parcalar[j].m || '') === (p.m || '');
    let a = i, z = i;
    if (p.m) { while (ayni(a - 1)) a--; while (ayni(z + 1)) z++; }
    const parcalar = []; for (let j = a; j <= z; j++) parcalar.push(k.parcalar[j]);
    const onceki = a > 0 && k.parcalar[a - 1].b === p.b ? a - 1 : null;
    const sonraki = z + 1 < k.parcalar.length && k.parcalar[z + 1].b === p.b ? z + 1 : null;
    return { belge: k.belgeler[p.b] || {}, m: p.m || '', baslik: parcalar.map(x => x.baslik).find(Boolean) || '', parcalar, bas: a, onceki, sonraki,
      oncekiAd: onceki != null ? k.parcalar[onceki].m || '' : '', sonrakiAd: sonraki != null ? k.parcalar[sonraki].m || '' : '' };
  }

  return {
    // Ortak derlem: dizin.json içeriği ve vektor.bin (Int8Array ya da ArrayBuffer)
    ortakKur(dz, vek) {
      model = dz.model || ''; boyut = +dz.boyut || 0; onek = Object.assign({ sorgu: '', belge: '' }, dz.onek || {});
      const v = vek ? (vek instanceof Int8Array ? vek : new Int8Array(vek)) : null;
      return kumeKur('ortak', dz.belgeler || [], dz.parcalar || [], v, boyut);
    },
    // Kursun belgeleri: hepsi = /mevzuat/hepsi cevabı ({ boyut, model, parcalar:[{b:'<id>', t}], v }), liste = /mevzuat/belgeler listesi
    kursKur(hepsi, liste) {
      const belgeler = (liste || []).map(x => ({ ...x, kisa: x.ad, tur: x.tur || 'yazi', kurs: true }));
      const yer = new Map(belgeler.map((b, i) => [b.id, i]));
      const parcalar = [];
      for (const p of (hepsi && hepsi.parcalar) || []) {
        let bi = yer.get(p.b);
        if (bi == null) { bi = belgeler.length; belgeler.push({ id: p.b, ad: 'Kurs belgesi', kisa: 'Kurs belgesi', tur: 'yazi', kurs: true }); yer.set(p.b, bi); }
        const m = (String(p.t || '').match(/^\s*((?:Geçici\s+)?Madde\s+\d+)/i) || [])[1] || '';
        parcalar.push({ b: bi, m, t: p.t || '', id: p.b });
      }
      const D = +(hepsi && hepsi.boyut) || boyut;
      const v = hepsi && hepsi.v ? (typeof hepsi.v === 'string' ? base64Int8(hepsi.v) : hepsi.v) : null;
      const uyumlu = !model || !hepsi || !hepsi.model || hepsi.model === model;
      return kumeKur('kurs', belgeler, parcalar, uyumlu ? v : null, D);
    },
    kursSil() { kume.kurs = null; dizin = null; },
    ara, madde,
    dizinKur, takmalar,
    get kume() { return kume; },
    get bilgi() { const d = hazirDizin(); return { model, boyut, onek, parca: d.N, terim: d.terim.size, kurulum: d.sure, ortak: kume.ortak ? kume.ortak.parcalar.length : 0, kurs: kume.kurs ? kume.kurs.parcalar.length : 0, ortakVektor: !!(kume.ortak && kume.ortak.vek), kursVektor: !!(kume.kurs && kume.kurs.vek) }; },
  };
}

/* ---------- sitenin ortak derlemi (tarayıcı) ---------- */
export const motor = yeniMotor();
let yukleniyor = null;
// veri/mevzuat/dizin.json ve vektor.bin ilk kullanımda indirilir, bellekte kalır. Vektör dosyası inmezse kelime araması yine çalışır.
export function yukle({ getir = (u, s) => fetch(u, s), kok = new URL('../veri/mevzuat/', import.meta.url).href } = {}) {
  if (yukleniyor) return yukleniyor;
  yukleniyor = (async () => {
    const r = await getir(kok + 'dizin.json' + SURUM);
    if (!r.ok) throw new Error('Mevzuat dizini indirilemedi (' + r.status + ')');
    const dz = await r.json();
    let vek = null;
    try { const v = await getir(kok + 'vektor.bin' + SURUM); if (v.ok) vek = new Int8Array(await v.arrayBuffer()); } catch (x) { vek = null; }
    motor.ortakKur(dz, vek);
    motor.dizinKur();
    return motor;
  })();
  yukleniyor.catch(() => { yukleniyor = null; });
  return yukleniyor;
}
export const yuklendi = () => !!motor.kume.ortak;
