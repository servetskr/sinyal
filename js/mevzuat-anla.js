/* Mevzuat asistanı: soruyu anlama ve çok kaynaktan kanıt toplama (tarayıcıda, yapay zekâsız kısım).
   - Kavram haritası (veri/mevzuat/kavram.json): her kavram bir rehber bölümü ya da ek konu; tetik kalıpları ve dayanak maddeleri var.
   - Sınıf geçişi çözümleyici: "A'dan B'ye", "B ehliyetim var C almak istiyorum" → { mevcut, hedef } ve MTSK md.39 tablosundan ders saati.
   - Çok sorgulu arama: asıl soru (kelime + anlam) + kavramın resmî terimli arama cümlesi + kavramın dayanak maddeleri (+ varsa yapay zekânın
     önerdiği aramalar ve maddeler), ağırlıklı RRF ile tek listede birleşir.
   - Atıf takibi: seçilen maddelerin içinde geçen "39 uncu madde", "Karayolları Trafik Yönetmeliğinin 85 inci maddesi" gibi atıflar
     yapay zekâya giden kaynaklara eklenir (çok adımlı kanıt).
   Ölçüm: sinyal-kaynak arac/mevzuat/olc-asistan.mjs (soru-seti-2 ve bağımsız soru-seti-3). */
import { sadele, kokler, dengele, resmiDegil, kaynakSec, KAYNAK } from './mevzuat-ara.js?v=227';

/* ---------- kavramlar ---------- */
// kavram.json → derlenmiş kalıplar (bir kez)
export function kavramKur(kv) {
  if (!kv || !Array.isArray(kv.kavramlar)) return null;
  const kavramlar = kv.kavramlar.map(k => ({ ...k, re: (k.tetik || []).map(t => { try { return new RegExp('(?:^|[^\\p{L}\\p{N}])(?:' + t + ')', 'u'); } catch (x) { return null; } }).filter(Boolean) }));
  return { asamalar: kv.asamalar || [], kavramlar, harita: new Map(kavramlar.map(k => [k.id, k])) };
}
// Soru → [{ k, puan }] (tetiklenen kalıp sayısı; eşitlikte haritadaki sıra)
export function kavramBul(soru, kh, enCok = 3) {
  if (!kh) return [];
  const s = ' ' + sadele(soru).replace(/[^\p{L}\p{N}%]+/gu, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const o = [];
  kh.kavramlar.forEach((k, i) => { let p = 0; for (const r of k.re) if (r.test(s)) p++; if (p) o.push({ k, puan: p, i }); });
  return o.sort((a, b) => b.puan - a.puan || a.i - b.i).slice(0, enCok);
}

/* ---------- sınıf geçişi ---------- */
export const SINIFLAR = ['A1', 'A2', 'B1', 'BE', 'C1E', 'C1', 'CE', 'D1E', 'D1', 'DE', 'M', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
const SINIF_SET = new Set(SINIFLAR.map(x => x.toLowerCase()));
const BELGE_SOZ = /^(sinif|ehliyet|belge|surucu|sertifika|ehliyeti|ehliyetim|belgesi|belgem|sinifi|sinifina|sinifindan|ehliyetinden|ehliyetine|belgesinden|belgesine|ehliyetli|ehliyetimle|belgesiyle|ehliyetiyle|sertifikasi|sertifikasina|li|lu|den|dan|ten|tan|ye|ya|e|a|yi|yu)$/;
// Sorudaki sınıf adları sırasıyla. Tek harfli belirsiz kelimeler (de, e, a, be) yalnız sınıf bağlamında: büyük harfle yazılmış ya da
// ardından ehliyet/sınıf/ek ("b den", "c ye") ya da öncesinde başka bir sınıf varsa.
export function siniflarBul(soru) {
  const ham = String(soru || '');
  const l = [...ham.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ h: m[0], s: sadele(m[0]) }));
  const o = [];
  for (let i = 0; i < l.length; i++) {
    const w = l[i].s; if (!SINIF_SET.has(w)) continue;
    const buyuk = l[i].h === l[i].h.toLocaleUpperCase('tr-TR') && /\p{Lu}/u.test(l[i].h);
    const sonra = (l[i + 1] || {}).s || '', once = (l[i - 1] || {}).s || '';
    if (w === 'e' && /^sinav/.test(sonra)) continue;  // e-sınav
    const baglam = BELGE_SOZ.test(sonra) || SINIF_SET.has(once) || SINIF_SET.has(sonra);
    if ((w === 'de' || w === 'da' || w === 'e' || w === 'a' || w === 'be' || w === 'ce') && !buyuk && !baglam) continue;
    if (w.length === 1 && !buyuk && !baglam && !/^(sinif|ehliyet|belge)/.test(sonra)) continue;
    o.push(w.toUpperCase());
  }
  return o;
}
// İki farklı sınıf + geçiş sözü → { mevcut, hedef, eski }. "B'li C" / "B ehliyeti olan C" / "A'dan B'ye" / "B'den C'ye geçiş".
const GECIS_SOZ = /(gec|fark|al(mak|ma|abil|acak|ir|sin)|iste|var|olan|sahib|ekle|yukselt|li|lu|den|dan|ten|tan)/;
export function sinifGecisi(soru) {
  const s = siniflarBul(soru), u = [...new Set(s)];
  const sd = sadele(soru);
  if (u.length < 2 || !GECIS_SOZ.test(sd)) return null;
  // "C almak istiyorum, B ehliyetim var" gibi ters sıra: "var/olan/sahibi" sözüne yakın olan mevcut sayılır
  let mevcut = u[0], hedef = u[1];
  const l = (sd.match(/[\p{L}\p{N}]+/gu) || []);
  const yer = c => l.indexOf(c.toLowerCase());
  const varY = l.findIndex(w => /^(var|olan|sahibi|sahip)$/.test(w));
  if (varY >= 0 && yer(hedef) >= 0 && yer(hedef) < varY && Math.abs(varY - yer(hedef)) < Math.abs(varY - yer(mevcut))) [mevcut, hedef] = [hedef, mevcut];
  return { mevcut, hedef, eski: /eski (tip|sinif|ehliyet)|1997|2016 (once|oncesi)/.test(sd) };
}
// MTSK md.39 Tablo 1/2 parçasından ders saati: "Mevcut belgesi B olan: A1 için 12, …, C için 20 …"
export function farkSaati(gecis, motor) {
  const k = motor.kume.ortak; if (!gecis || !k) return null;
  const bi = k.belgeler.findIndex(b => b.id === 'mtsk'); if (bi < 0) return null;
  const tablo = gecis.eski ? 'Tablo 2' : 'Tablo 1';
  for (let i = 0; i < k.parcalar.length; i++) {
    const p = k.parcalar[i]; if (p.b !== bi || p.m !== 'Madde 39' || !String(p.t).startsWith(tablo)) continue;
    const satir = String(p.t).split('\n').find(x => x.startsWith('Mevcut belgesi ' + gecis.mevcut + ' olan:'));
    if (!satir) return { tablo, i, saat: null };
    const m = satir.match(new RegExp('(?:: |, )' + gecis.hedef + ' için (\\d+)'));
    return { tablo, i, saat: m ? +m[1] : null, satir };
  }
  return null;
}

/* ---------- atıflar ---------- */
const ATIF_BELGE = [
  [/karayollar[ıi] trafik y[öo]netmeli/i, 'kty'], [/karayollar[ıi] trafik kanunu|2918 say[ıi]l[ıi]/i, 'ktk'],
  [/[öo]zel [öo]ğretim kurumlar[ıi] y[öo]netmeli/i, 'ooky'], [/[öo]zel [öo]ğretim kurumlar[ıi] kanunu|5580 say[ıi]l[ıi]/i, 'k5580'],
  [/motorlu ta[şs][ıi]t s[üu]r[üu]c[üu]leri kursu y[öo]netmeli/i, 'mtsk'], [/kabahatler kanunu|5326 say[ıi]l[ıi]/i, 'k5326'],
];
const SIRA_EK = '(?:\\s*(?:inci|ıncı|uncu|üncü|nci|ncı|ncu|ncü|\\.))';
// Metindeki madde atıfları → [{ b: belge id, m: 'Madde N' }]. Belge adı geçmiyorsa atıf metnin kendi belgesine sayılır.
export function atiflar(metin, belgeId) {
  const o = [], t = String(metin || '');
  const re = new RegExp('((?:[\\p{Lu}][\\p{L}]+\\s+){0,7}?)(?:[\\p{L}]*[’\']?n[ıiuü]n\\s+)?(\\d{1,3})' + SIRA_EK + '?\\s+madde(?:si|sinin|sine|sinde|lerinde|leri)?', 'gu');
  for (const m of t.matchAll(re)) {
    const on = t.slice(Math.max(0, m.index - 90), m.index + m[0].length);
    let b = belgeId;
    for (const [r, id] of ATIF_BELGE) if (r.test(on)) { b = id; break; }
    if (/kanun/i.test(m[1] || '') && b === belgeId && !/bu kanun/i.test(on) && /y[öo]netmelik/.test(belgeId || '')) continue;  // başka bir kanuna atıf (adı tanınmıyor)
    const x = { b, m: 'Madde ' + (+m[2]) };
    if (!o.some(y => y.b === x.b && y.m === x.m)) o.push(x);
  }
  return o;
}

/* ---------- soru parçalama ---------- */
// Çok parçalı soru ("kaç saat ders alır, e-sınava girer mi, kayıtta ne getirir") parçalarına bölünür; her parça ayrıca aranır ki
// ikinci, üçüncü parçanın maddesi de kaynaklara girsin. Ayırıcı: soru işareti, noktalı virgül, virgül ya da "ve/peki/ayrıca" + soru sözü.
const SORU_SOZ = /(?:^|\s)(kac|ne|neler|nasil|hangi|kim|nerede|nereye|neden|mi|mu|mı|mü|midir|olur mu|gerekir|lazim|zorunlu)(?:\s|$)/;
export function soruParcala(soru, enCok = 4) {
  const ham = String(soru || '').replace(/\s+/g, ' ').trim();
  const l = ham.split(/[?;]+|,\s+|\s+(?:ve|peki|ayrıca|bir de|hem de|yoksa)\s+(?=\S+\s+\S+)/iu).map(x => x.trim()).filter(Boolean);
  const o = [];
  for (const x of l) {
    const sx = ' ' + sadele(x) + ' ', kk = kokler(x);
    if (!kk.length || (!SORU_SOZ.test(sx) && kk.length < 2)) { if (o.length) o[o.length - 1] += ' ' + x; else o.push(x); continue; }
    o.push(x);
  }
  if (o.length < 2) return [];
  // kısa parçaya ilk parçanın konusu eklenir: "gece dersi zorunlu mu, kaçta başlıyor" → "gece dersi kaçta başlıyor"
  const konu = (o[0].match(/[\p{L}\p{N}]+/gu) || []).filter(w => (kokler(w).length || SINIF_SET.has(sadele(w))) && !SORU_SOZ.test(' ' + sadele(w) + ' ')).slice(0, 4).join(' ');
  return o.slice(0, enCok).map((x, i) => (i && kokler(x).length < 3 && konu ? konu + ' ' + x : x));
}

/* ---------- çok sorgulu arama ---------- */
// Ağırlıklar iki sette birlikte seçildi: set 2'ye göre ayarlanan 1/0,3 bağımsız set 3'te geriletiyordu (87,8 → 82,3); 0,3/0 ikisinde de iyileştirir (olc-asistan.mjs).
export const ASISTAN = { k: 60, parca: 0.4, asil: 1, kavramSorgu: 0, kavramMadde: 0.3, kavramN: 2, maddeN: 6, llmSorgu: 0.6, llmMadde: 0.6, gecis: 1.2, rehber: 0.6 };

// Belge id + madde → o maddenin, soruyla en çok kökü paylaşan parçası (yoksa ilki)
function maddeParcasi(motor, b, m, qk) {
  const k = motor.kume.ortak; if (!k) return null;
  const bi = k.belgeler.findIndex(x => x.id === b); if (bi < 0) return null;
  let en = null, enP = -1;
  for (let i = 0; i < k.parcalar.length; i++) {
    const p = k.parcalar[i]; if (p.b !== bi || (m && p.m !== m)) continue;
    if (!m && en != null) break;  // maddesiz belge (bilgilendirme): ilk parça
    let s = 0; if (qk.size) { const pk = new Set(kokler(p.t + ' ' + (p.baslik || ''))); for (const w of qk) if (pk.has(w)) s++; }
    if (s > enP) { en = i; enP = s; }
  }
  return en;
}
// Rehber bölümünün soruya en yakın parçası (m "14. Gece dersi")
function rehberParcasi(motor, ad, qk) {
  const k = motor.kume.ortak; if (!k || !ad) return null;
  const bi = k.belgeler.findIndex(x => x.id === 'rehber'); if (bi < 0) return null;
  return maddeParcasi(motor, 'rehber', ad, qk);
}
const sonucOl = (motor, i, neden) => { const k = motor.kume.ortak, p = k.parcalar[i]; return { kaynak: 'ortak', belge: k.belgeler[p.b] || {}, parca: p, sira: i, skor: 0, neden, vurgu: [] }; };
const anahtar = s => s.kaynak + '|' + s.sira;

// Soruyu anlar ve birleşik sonuç listesini döner.
// secenek: { gom, kh (kavramKur çıktısı), llm: { sorgular:[], maddeler:[{b,m}] } | null, n }
export async function asistanAra(motor, soru, { gom = null, kh = null, llm = null, n = 40, filtre = 'hepsi', A = ASISTAN } = {}) {
  const asil = await motor.ara(soru, { n: 60, gom, filtre });
  const kav = kavramBul(soru, kh, A.kavramN);
  const gecis = sinifGecisi(soru);
  const qk = new Set(kokler(soru));
  const listeler = [{ l: asil.sonuc, w: A.asil }];
  const ek = [];  // { i (ortak parça), w, r }
  // çok parçalı soru: her parça ayrıca aranır (kelime + anlam)
  const parcalar = A.parca > 0 ? soruParcala(soru) : [];
  for (const q of parcalar) { const r = await motor.ara(q, { n: 30, gom, filtre }); listeler.push({ l: r.sonuc, w: A.parca }); }
  // sınıf geçişi: fark sınıfı kavramı ve hedef sınıfın yaş/deneyim şartı; tablo parçası en üste
  let fark = null;
  if (gecis) {
    fark = farkSaati(gecis, motor);
    if (fark) ek.push({ i: fark.i, w: A.gecis, r: 0 });
    for (const id of ['r25', 'r5']) { const k = kh && kh.harita.get(id); if (k && !kav.some(x => x.k.id === id)) kav.push({ k, puan: 1, i: 99 }); }
  }
  // gece, nakil gibi kavramlar: arama cümlesi + dayanak maddeleri + rehber bölümü
  for (const { k } of kav) {
    if (k.sorgu && A.kavramSorgu > 0) { const r = await motor.ara(k.sorgu + ' ' + soru, { n: 30, anlam: false, filtre }); listeler.push({ l: r.sonuc, w: A.kavramSorgu }); }
    k.maddeler.slice(0, A.maddeN).forEach((x, r) => { const i = maddeParcasi(motor, x.b, x.m, qk); if (i != null) ek.push({ i, w: A.kavramMadde, r }); });
    if (k.rehber) { const i = rehberParcasi(motor, k.rehber, qk); if (i != null) ek.push({ i, w: A.rehber, r: 0 }); }
  }
  // yapay zekânın soruyu yeniden yazışı (isteğe bağlı)
  if (llm) {
    for (const q of (llm.sorgular || []).slice(0, 3)) { const r = await motor.ara(q, { n: 30, anlam: false, filtre }); listeler.push({ l: r.sonuc, w: A.llmSorgu }); }
    (llm.maddeler || []).slice(0, 6).forEach((x, r) => { const i = maddeParcasi(motor, x.b, x.m, qk); if (i != null) ek.push({ i, w: A.llmMadde, r }); });
  }
  // ağırlıklı RRF (parça düzeyinde)
  const puan = new Map(), nesne = new Map();
  for (const { l, w } of listeler) l.forEach((s, r) => { const a = anahtar(s); puan.set(a, (puan.get(a) || 0) + w / (A.k + r + 1)); if (!nesne.has(a)) nesne.set(a, s); });
  for (const { i, w, r } of ek) { const s = sonucOl(motor, i, 'kavram'), a = anahtar(s); puan.set(a, (puan.get(a) || 0) + w / (A.k + r + 1)); if (!nesne.has(a)) nesne.set(a, s); }
  // kelimeyle aranan madde ("MTSK 15") en üstte kalır
  const madde = asil.sonuc.filter(s => s.neden === 'madde').map(anahtar);
  // çeşitlilik (aynı maddenin 2. parçası sona) ve mdSinyal dengesi, motorla aynı kural
  const sirali = [...puan].sort((a, b) => b[1] - a[1]).filter(([a]) => !madde.includes(a));
  const mSay = new Map(), once = [], ertele = [];
  for (const x of sirali) { const s = nesne.get(x[0]), p = s.parca; if (!p.m) { once.push(x); continue; } const key = s.kaynak + '|' + p.b + '|' + p.m, c = mSay.get(key) || 0; mSay.set(key, c + 1); (c < 1 ? once : ertele).push(x); }
  const sira = dengele(once.concat(ertele), a => resmiDegil(nesne.get(a).belge));
  const sonuc = madde.map(a => nesne.get(a)).concat(sira.map(([a, p]) => ({ ...nesne.get(a), skor: p }))).slice(0, n);
  return { ...asil, sonuc, kavramlar: kav.map(x => x.k), gecis, fark, parcalar };
}

// Yapay zekâya gidecek kaynaklar: kaynakSec + yer kalırsa seçilen resmî maddelerin atıf yaptığı maddeler (çok adımlı kanıt).
export function asistanKaynak(motor, r, { atif = true, ...secenek } = {}) {
  const k = kaynakSec(r.sonuc, secenek), K = { ...KAYNAK, ...secenek };
  if (!atif || k.length >= K.encok) return k;
  const kume = motor.kume.ortak; if (!kume) return k;
  const var_ = new Set(r.sonuc.slice(0, K.bakilan).map(s => s.kaynak + '|' + s.parca.b + '|' + s.parca.m));
  let toplam = k.reduce((a, x) => a + x.t.length + x.etiket.length, 0);
  const ekler = [];
  for (const s of r.sonuc.slice(0, 8)) {
    if (s.kaynak !== 'ortak' || resmiDegil(s.belge)) continue;
    for (const a of atiflar(s.parca.t, s.belge.id)) {
      const bi = kume.belgeler.findIndex(b => b.id === a.b); if (bi < 0) continue;
      if (var_.has('ortak|' + bi + '|' + a.m) || ekler.some(e => e.bi === bi && e.m === a.m)) continue;
      const parcalar = kume.parcalar.map((p, i) => [p, i]).filter(([p]) => p.b === bi && p.m === a.m);
      if (!parcalar.length) continue;
      ekler.push({ bi, m: a.m, parcalar });
    }
  }
  for (const e of ekler) {
    if (k.length >= K.encok) break;
    const b = kume.belgeler[e.bi], et = (b.kisa || b.ad) + ' ' + e.m + ' (atıf)';
    const kalan = K.kar - toplam - et.length; if (kalan < 400) break;
    const t = e.parcalar.map(([p]) => p.t.trim()).join('\n').slice(0, Math.min(K.parcaKar, kalan));
    toplam += t.length + et.length;
    k.push({ etiket: et, t, i: -1, atif: true, b: b.id, m: e.m, sira: e.parcalar[0][1] });
  }
  return k;
}

/* ---------- sitede yükleme ---------- */
let kavramYukleniyor = null;
// veri/mevzuat/kavram.json: ilk kullanımda indirilir; inmezse asistan kavramsız (yalnız arama ve yapay zekâ) çalışır
export function kavramYukle({ getir = (u) => fetch(u), kok = new URL('../veri/mevzuat/', import.meta.url).href } = {}) {
  if (kavramYukleniyor) return kavramYukleniyor;
  kavramYukleniyor = getir(kok + 'kavram.json?v=227').then(r => (r.ok ? r.json() : null)).then(kavramKur).catch(() => null);
  return kavramYukleniyor;
}

// Yapay zekâya giden soru: sınıf geçişi algılandıysa yorum farkı olmasın diye açık not eklenir ("A'dan B'ye" genel bir kalıp sanılmasın)
export function asistanSoru(soru, r) {
  const g = r && r.gecis;
  if (!g) return soru;
  return (soru + `\n(Not: soruda ${g.mevcut} sınıfı sürücü belgesi olan kişinin ${g.hedef} sınıfı sertifika almak istemesi soruluyor${g.eski ? '; belge eski tip' : ''}.)`).slice(0, 400);
}

/* ---------- cevap doğrulama (tarayıcıda) ---------- */
// Cevap satırının dayandığı kaynaklarda: en çok kökü paylaşan cümle (gösterilir) ve satırdaki rakamların kaynakta geçip geçmediği.
// Yazıyla sayılar ("beş", "kırkbeş", "ikinci") ve biçim farkları ("2.500" = "2500", "0.20" = "0,20") eşlenir. Madde, fıkra ve [n] atıfları rakam sayılmaz.
const YAZI_SAYI = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, onbeş: 15, yirmi: 20, otuz: 30, kırk: 40, kırkbeş: 45, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90, yüz: 100, birinci: 1, ikinci: 2, üçüncü: 3, dördüncü: 4, beşinci: 5 };
export function sayilarBul(t, yazili = false) {
  t = String(t || '').replace(/\[[\d,\s]+\]/g, ' ').replace(/\b(?:md\.?|madde(?:si|sinin|sine)?|fıkra(?:sı)?|bent)\s*\d+(?:\/\d+)*/giu, ' ').replace(/\d+\s*(?:inci|ıncı|uncu|üncü|nci|ncı|ncu|ncü|\.)\s*(?:madde|fıkra|bent)/giu, ' ');
  const o = [...t.matchAll(/(?<![\p{L}\d])(\d{1,2}:\d{2}|\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)(?![\d])/gu)].map(m => { const x = m[1]; return /^0[.,]\d+$/.test(x) ? x.replace('.', ',').replace(/0+$/, '') : x.replace(/\.(?=\d{3}(\D|$))/g, '').replace(/,0+$/, ''); });
  if (yazili) for (const m of t.toLocaleLowerCase('tr-TR').matchAll(/\p{L}+/gu)) if (YAZI_SAYI[m[0]] != null) o.push(String(YAZI_SAYI[m[0]]));
  return o;
}
export function kanitDenetle(metin, kaynaklar) {
  const qk = new Set(kokler(metin)), say = [...new Set(sayilarBul(metin))];
  let en = null;
  kaynaklar.forEach(({ no, t }) => {
    for (const c of String(t || '').split(/(?<=[.;:!?])\s+|\n+/)) {
      const cc = c.trim(); if (cc.length < 12) continue;
      const ck = new Set(kokler(cc)); let p = 0; for (const w of qk) if (ck.has(w)) p++;
      const ps = say.filter(x => sayilarBul(cc, true).includes(x)).length * 2;
      if (!en || p + ps > en.p) en = { p: p + ps, cumle: cc.length > 360 ? cc.slice(0, 357) + '…' : cc, no };
    }
  });
  const hepsi = new Set(kaynaklar.flatMap(x => sayilarBul(x.t, true)));
  return { cumle: en && en.p > 0 ? en.cumle : '', no: en ? en.no : null, sayi: say.length, eksik: say.filter(x => !hepsi.has(x)) };
}
