// Öğren › deneme sınavı ve çalışma araçları (yeni tasarım).
// Kendi test motorunu taşır (portal.js'teki testBaslat / testBitir / testSakla / testGeriYukle / testBirak ve deneme sayacı buraya taşındı;
// aynı localStorage anahtarı 'sinyal-test-'+k.id, aynı veri etkileri: k.konuAnaliz, k.yanlislar, k.deneme, HZ.gorulenEkle, HZ.tekrarGuncelle, kaydet()).
// Ekranlar: deneme girişi, deneme sorusu, soru listesi, bitirme onayı, sonuç, yanlış inceleme (tam ekran akışlar);
// çalışma araçları, test ayarları, bugünkü tekrar, yanlışlarım (Öğren alt ekranları).
import { S, kaydet, SINIFLAR, fark, gonderimEkle, ogrOzellik, tamAd, sinavHakSiniri } from '../veri.js?v=221';
import { bildir, tarih, goreli, gunKisa } from '../ui.js?v=221';
import * as HZ from '../hazirlik.js?v=221';
import { hakDurum, tekrarUcret, esinavVar, TEORIKSIZ_METIN } from '../ogrenci.js?v=221';
import { gerekliDireksiyon, egitimSinifi } from '../veri.js?v=221';
import { KONULAR } from '../konular.js?v=221';
import { soruKonu, SORU_KONU } from '../soruKonu.js?v=221';
import { UNITE_AD, konular, altAc, altKapat, altEkran as altSimdi } from './ogrveri.js?v=221';
import { esc, oi, sayfaBas, geri, bolum, kart, heroKart, dugme, ikonKutu, satir, liste, cip, serit, not, bos, sekmeler, kutucuk, radyo, akisUst, akisAlt, sik, cevapKutu, baglanti, stilEkle, tl, odakTuzagi, gorsel } from './ui.js?v=221';

const SURE = 45 * 60e3, GECME = 70, HARF = 'ABCD';
const MOD_AD = { deneme: 'Deneme sınavı', hizli: 'Hızlı test', konu: 'Konu testi', yanlis: 'Yanlışlarım', tekrar: 'Bugünkü tekrar' };
const UNITE_IK = { trafik: ['trafik', 'mavi'], ilkyardim: ['ilkyardim', 'kirmizi'], motor: ['piston', 'mor'], adab: ['arac', 'yesil'] };
const uniteAd = kn => UNITE_AD[kn] || (KONULAR[kn] || [])[0] || kn;
const sayi = n => (+n || 0).toLocaleString('tr-TR');

/* ---------- soru bankası (yalnız gerekince yüklenir) ---------- */
let SR = null, LV = null, yuk = null, DISI = new Set();
const sorulariYukle = () => SR ? Promise.resolve() : yuk || (yuk = Promise.all([import('../sorular.js?v=221'), import('../levha.js?v=221').catch(() => null)])
  .then(([m, l]) => { SR = m.SORULAR; DISI = new Set(m.HAVUZ_DISI || []); LV = l; }).catch(x => { yuk = null; throw x; }));
const gorselHtml = g => !g ? '' : String(g).startsWith('L:') ? (LV && LV.levhaSvg ? LV.levhaSvg(g.slice(2)) : '') : String(g);
const karistir = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const idx = () => SR.map((_, i) => i).filter(i => !DISI.has(i));

/* ---------- test motoru ---------- */
let test = { mod: null };
let gorunum = 'soru';   // deneme: 'soru' | 'liste'
let modal = null;       // null | { tur: 'onay' } | { tur: 'bildir', qi }
let incele = null;      // yanlış incelemede sıra (test.sonuc.inceleme içinde)
let gecis = false;      // soru değişince kısa giriş hareketi
let sayac = null;
const ayar = { tur: 'karisik', uniteler: ['trafik', 'ilkyardim', 'motor', 'adab'], dersler: [], n: 10 };

// Devam eden test telefonda saklanır: uygulama kapansa da kaldığı yerden sürer; süre yalnız sınav ekranı açıkken işler
const ANAHTAR = k => 'sinyal-test-' + k.id;
function testSakla(k) {
  try { if (test.mod && !test.sonuc && test.i < test.liste.length) localStorage.setItem(ANAHTAR(k), JSON.stringify({ ...test, sonuc: undefined, duraklat: undefined })); else localStorage.removeItem(ANAHTAR(k)); } catch (x) { }
}
function testGeriYukle(k) {
  if (test.mod && test.k === k.id) return;
  if (test.mod) test = { mod: null };
  try {
    const t = JSON.parse(localStorage.getItem(ANAHTAR(k)) || 'null');
    if (t && t.mod && Array.isArray(t.liste) && t.i < t.liste.length) {
      test = { cevaplar: [], dogru: 0, harcanan: 0, ...t, k: k.id, duraklat: true };
      // eski düzende (portal.js) başlamış deneme: cevaplar sırayla verilmişti
      if (test.mod === 'deneme' && !Array.isArray(test.sec)) { test.sec = test.liste.map((_, j) => j < test.cevaplar.length ? test.cevaplar[j][1] : null); test.i = Math.min(test.i, test.liste.length - 1); }
      if (test.mod === 'deneme' && !Array.isArray(test.isaret)) test.isaret = [];
      // eski düzende başlamış konu testi: ayar (opts) saklanmamıştı; "Yeniden çöz" aynı ünitede 10 soruluk yeni test açsın
      if (test.mod === 'konu' && !test.opts && test.konu) test.opts = { tur: 'karisik', uniteler: [test.konu], n: 10 };
    }
  } catch (x) { }
}
function testBirak(k) {
  test = { mod: null }; gorunum = 'soru'; modal = null; incele = null;
  try { localStorage.removeItem(ANAHTAR(k)); } catch (x) { }
}
function listeKur(mod, k, o = {}) {
  if (mod === 'deneme') return Object.entries(KONULAR).flatMap(([kn, [, n]]) => karistir(idx().filter(i => SR[i][0] === kn)).slice(0, n));
  if (mod === 'konu') {
    const n = o.n || 10;
    if (o.tur === 'konu') { const s = new Set(o.dersler || []); return karistir(idx().filter(i => s.has(soruKonu(i, SR[i][0])))).slice(0, n); }
    const s = new Set(o.uniteler || []); return karistir(idx().filter(i => s.has(SR[i][0]))).slice(0, n);
  }
  if (mod === 'yanlis') return karistir((k.yanlislar || []).filter(i => i < SR.length && !DISI.has(i))).slice(0, 10);
  if (mod === 'tekrar') return karistir(HZ.tekrarBugun(k).filter(i => i < SR.length && !DISI.has(i))).slice(0, 20);
  return karistir(idx()).slice(0, 10);
}
// Başka ekranlar da kullanabilir (ör. ana sayfadaki "Deneme sınavı çöz"): baslat('deneme', ctx)
// Yarım kalan test varsa önce sorulur (yeni test aynı kaydı ezer); zorla: soru sorma
export async function baslat(mod, ctx, o = {}, zorla = false) {
  testGeriYukle(ctx.k);
  if (!zorla && test.mod && test.duraklat && !test.sonuc) return degisOnay(ctx, () => baslat(mod, ctx, o, true));
  try { await sorulariYukle(); } catch (x) { bildir('Sorular yüklenemedi; internet bağlantını kontrol edip tekrar dene', 'uyari'); return; }
  const { k } = ctx, l = listeKur(mod, k, o);
  if (!l.length) { bildir(mod === 'konu' ? 'Seçtiğin konularda soru bulunamadı' : 'Çözülecek soru yok', 'uyari'); return; }
  test = { mod, k: k.id, konu: o.uniteler && o.uniteler.length === 1 && o.tur !== 'konu' ? o.uniteler[0] : undefined, opts: o, liste: l, i: 0, dogru: 0, cevap: null, basla: Date.now(), harcanan: 0, sonTik: Date.now(), cevaplar: [] };
  if (mod === 'deneme') { test.sec = l.map(() => null); test.isaret = []; }
  // yenilemede ya da çıkışta yarım test kartının göründüğü ekran açılsın (deneme girişi ya da Çalışma araçları)
  altAc(mod === 'deneme' ? 'deneme' : 'araclar');
  gorunum = 'soru'; modal = null; incele = null; gecis = true;
  testSakla(k); ctx.yenile(true);
}
const cevapAl = j => test.mod === 'deneme' ? (test.sec[j] ?? null) : ((test.cevaplar[j] || [])[1] ?? null);
function denemeEsitle() {
  test.cevaplar = test.liste.map((qi, j) => [qi, test.sec[j]]).filter(x => x[1] != null);
  test.dogru = test.cevaplar.filter(([qi, c]) => SR && c === SR[qi][3]).length;
}
function bitir(k) {
  if (test.mod === 'deneme') denemeEsitle();
  const konu = {};
  test.cevaplar.forEach(([qi, c]) => { const kn = SR[qi][0]; konu[kn] = konu[kn] || [0, 0]; konu[kn][1]++; if (c === SR[qi][3]) konu[kn][0]++; });
  k.konuAnaliz = k.konuAnaliz || {};
  Object.entries(konu).forEach(([kn, [d, t]]) => { const a = k.konuAnaliz[kn] || [0, 0]; k.konuAnaliz[kn] = [a[0] + d, a[1] + t]; });
  const yanlis = test.cevaplar.filter(([qi, c]) => c !== SR[qi][3]).map(([qi]) => qi), dogruQ = test.cevaplar.filter(([qi, c]) => c === SR[qi][3]).map(([qi]) => qi);
  k.yanlislar = [...new Set([...(k.yanlislar || []).filter(x => !dogruQ.includes(x)), ...yanlis])];
  test.eksik = test.liste.length - test.cevaplar.length;
  if (test.mod === 'deneme' && !test.eksik) { k.deneme = k.deneme || []; k.deneme.push(test.dogru * 2); }
  HZ.gorulenEkle(k, test.cevaplar.map(([qi]) => qi));
  HZ.tekrarGuncelle(k, test.cevaplar.map(([qi, c]) => [qi, c === SR[qi][3]]));
  // sonuç tablosu: her konuda kaç soru vardı (boşlar dahil), kaçı doğru
  const tablo = {};
  test.liste.forEach((qi, j) => { const kn = SR[qi][0]; tablo[kn] = tablo[kn] || [0, 0]; tablo[kn][1]++; if (cevapAl(j) === SR[qi][3]) tablo[kn][0]++; });
  const inceleme = test.liste.map((qi, j) => [qi, cevapAl(j)]).filter(([qi, c]) => c !== SR[qi][3]);
  test.sonuc = { konu, tablo, yanlis: yanlis.length, yanlisListe: test.cevaplar.filter(([qi, c]) => c !== SR[qi][3]), inceleme };
  test.i = test.liste.length; test.duraklat = false; modal = null; gorunum = 'soru';
  clearInterval(sayac); sayac = null;
  try { localStorage.removeItem(ANAHTAR(k)); } catch (x) { }
  kaydet();
}
const cevaplanan = () => test.mod === 'deneme' ? test.sec.filter(x => x != null).length : test.cevaplar.length;
const sureYaz = ms => { const s = Math.max(0, Math.ceil(ms / 1e3)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const kalanMs = () => SURE - (test.harcanan || 0);
// Yarım kalan test (Öğren ve ana sayfa da gösterebilir): null ya da { mod, ad, cevaplanan, top, kalanDk }
export function yarim(ctx) {
  testGeriYukle(ctx.k);
  if (!test.mod || test.sonuc || !test.duraklat) return null;
  return { mod: test.mod, ad: MOD_AD[test.mod], cevaplanan: cevaplanan(), top: test.liste.length, kalanDk: test.mod === 'deneme' ? Math.max(1, Math.ceil(kalanMs() / 60e3)) : 0 };
}

/* ---------- deneme süresi: yalnız sınav ekranı açık ve görünürken işler; 45 dakika dolunca kendiliğinden biter ---------- */
function sayacKur(ctx) {
  clearInterval(sayac);
  const tik = () => {
    const acik = document.querySelector('[data-snv-ekran="deneme"]');
    if (!acik || test.mod !== 'deneme' || test.duraklat || test.sonuc) { clearInterval(sayac); sayac = null; return; }
    const simdi = Date.now();
    if (document.visibilityState === 'visible') test.harcanan = (test.harcanan || 0) + Math.min(2000, Math.max(0, simdi - (test.sonTik || simdi)));
    test.sonTik = simdi;
    const kalan = kalanMs();
    if (kalan <= 0) { test.sureDoldu = true; bitir(ctx.k); altAc('deneme'); ctx.yenile(true); return; }
    if (Math.floor(kalan / 1e3) % 15 === 0) testSakla(ctx.k);
    document.querySelectorAll('[data-snv-kalan]').forEach(el => { el.textContent = sureYaz(kalan); });
    const s = document.querySelector('.ox-snv-saat'); if (s) s.classList.toggle('az', kalan < 5 * 60e3);
  };
  tik(); sayac = setInterval(tik, 1000);
}

/* ---------- ortak parçalar ---------- */
const gorselKutu = q => { const g = gorselHtml(q[4]); return g ? `<div class="ox-snv-gorsel" aria-hidden="true">${g}</div>` : ''; };
const kaynakHtml = q => q[6] ? `<small class="ox-snv-kaynak">${esc(q[6])}</small>` : '';
const baglarHtml = (qi, konuyuOku = true) => { const id = konuyuOku ? soruKonu(qi, SR[qi][0]) : null; return `<div class="ox-snv-baglar">${id ? baglanti('Konuyu oku', { 'data-og-ders': id }, true) : '<span></span>'}${baglanti('Soruda hata var', { 'data-snv': 'bildir', 'data-qi': qi }, true)}</div>`; };
const NEDEN = ['Doğru cevap yanlış işaretlenmiş', 'Soru ya da şıklar anlaşılmıyor', 'Bilgi güncel değil', 'Görsel hatalı', 'Diğer'];
function modalHtml() {
  if (!modal) return '';
  let ic = '';
  if (modal.tur === 'onay') {
    const n = cevaplanan(), b = test.liste.length - n;
    ic = `<h2 id="ox-snv-m-bas">Sınavı bitir?</h2><p class="ox-snv-modal-alt">${n} yanıtlandı · ${b} boş</p>${b ? `<p class="ox-snv-modal-not">Boş soru kalırsa bu deneme puanlarına sayılmaz.</p>` : ''}
      <div class="ox-snv-modal-dg">${dugme('Kontrol et', { 'data-snv': 'liste' }, { tur: 'ikincil' })}${dugme('Sınavı bitir', { 'data-snv': 'bitir' })}</div>`;
  } else if (modal.tur === 'bildir') {
    const q = SR[modal.qi];
    ic = `<h2 id="ox-snv-m-bas">Soruyu bildir</h2><p class="ox-snv-alinti">“${esc(q[1].length > 120 ? q[1].slice(0, 118) + '…' : q[1])}”</p>
      <p class="ox-snv-et">Sorun ne?</p><div class="ox-liste ox-snv-neden" role="radiogroup">${NEDEN.map((t, i) => radyo(t, i === 0, { 'data-snv-neden': i })).join('')}</div>
      <label class="ox-snv-alan"><span class="ox-snv-et">Açıklama <small>isteğe bağlı</small></span><textarea data-snv-aciklama rows="2" maxlength="300"></textarea></label>
      <div class="ox-snv-modal-dg">${dugme('Vazgeç', { 'data-snv': 'modal-kapat' }, { tur: 'ikincil' })}${dugme('Gönder', { 'data-snv': 'bildir-gonder' })}</div>`;
  }
  return `<div class="ox-snv-perde" data-snv-perde><div class="ox-snv-modal ox-snv-m-${modal.tur}" role="dialog" aria-modal="true" aria-labelledby="ox-snv-m-bas">
    <button type="button" class="ox-ikon-dg ox-snv-modal-x" data-snv="modal-kapat" aria-label="Kapat">${oi('kapat')}</button>${ic}</div></div>`;
}
const akis = (ic, ekranAd = '') => `<div class="ox-akis ox-snv-akis"${ekranAd ? ` data-snv-ekran="${ekranAd}"` : ''}>${ic}${modalHtml()}</div>`;
const govde = (ic, cls = '') => `<div class="ox-akis-govde"><div class="ox-snv-ic ${cls} ${gecis ? 'gir' : ''}">${ic}</div></div>`;

/* ---------- 14 · deneme sorusu ---------- */
function denemeSoruHtml() {
  const j = test.i, qi = test.liste[j], q = SR[qi], sec = test.sec[j], top = test.liste.length, isr = test.isaret.includes(j), son = j === top - 1;
  const ust = akisUst({ kapat: 'data-snv="durdur"', orta: `<span class="ox-snv-saat ${kalanMs() < 5 * 60e3 ? 'az' : ''}" role="timer" aria-label="Kalan süre">${oi('kronometre')}<b data-snv-kalan>${sureYaz(kalanMs())}</b></span>`, sag: `<span class="ox-snv-sayi">${j + 1} / ${top}</span>` });
  const ic = `${gorselKutu(q)}<div class="ox-snv-soru-bas"><span>${esc(uniteAd(q[0]))}</span><button type="button" class="ox-snv-isaret ${isr ? 'acik' : ''}" data-snv="isaret" aria-pressed="${isr}">${oi('bayrak', isr ? 'dolu' : '')}<span>${isr ? 'İşaretlendi' : 'İşaretle'}</span></button></div>
    <h2 class="ox-snv-kok">${esc(q[1])}</h2>
    <div class="ox-snv-siklar">${q[2].map((s, x) => sik(HARF[x], esc(s), sec === x ? 'secili' : '', { 'data-snv-sik': x, 'aria-pressed': String(sec === x) })).join('')}</div>`;
  return akis(ust + govde(ic) + akisAlt(dugme('Soru listesi', { 'data-snv': 'liste' }, { tur: 'ikincil' }) + dugme(son ? 'Bitir' : 'Sonraki', { 'data-snv': son ? 'onay' : 'sonraki' }, { ok: true })), 'deneme');
}
/* ---------- 15 · soru listesi ---------- */
function soruListesiHtml() {
  const top = test.liste.length, n = cevaplanan(), isr = test.isaret.length;
  const ust = akisUst({ kapat: 'data-snv="soru"', orta: '<b class="ox-snv-ust-bas">Soru listesi</b>', sag: '<button type="button" class="ox-snv-ust-bag" data-snv="onay">Bitir</button>' });
  const hucre = test.liste.map((_, j) => {
    const dolu = test.sec[j] != null, simdi = j === test.i, im = test.isaret.includes(j);
    const durum = [dolu ? 'yanıtlandı' : 'yanıtlanmadı', im ? 'işaretli' : '', simdi ? 'şu anki soru' : ''].filter(Boolean).join(', ');
    return `<button type="button" class="ox-snv-no ${dolu ? 'dolu' : ''} ${simdi ? 'simdi' : ''} ${im ? 'isaretli' : ''}" data-snv-git="${j}" aria-label="${j + 1}. soru: ${durum}"${simdi ? ' aria-current="true"' : ''}>${j + 1}${im ? `<i>${oi('bayrak', 'dolu')}</i>` : ''}</button>`;
  }).join('');
  const lejant = `<div class="ox-snv-lejant"><span><i class="dolu"></i>Yanıtlandı (${n})</span><span><i class="isaretli">${oi('bayrak', 'dolu')}</i>İşaretli (${isr})</span><span><i></i>Yanıtlanmadı (${top - n})</span></div>`;
  return akis(ust + govde(`<div class="ox-snv-izgara">${hucre}</div>${lejant}<p class="ox-snv-sure-not">${oi('kronometre')}<span>Kalan süre <b data-snv-kalan>${sureYaz(kalanMs())}</b></span></p>`, 'ox-snv-lst') + akisAlt(dugme('Sınava dön', { 'data-snv': 'soru' }, { ok: true, genis: true })), 'deneme');
}
/* ---------- hızlı test, konu testi, yanlışlarım, tekrar: anında geri bildirim ---------- */
function anindaSoruHtml() {
  const j = test.i, qi = test.liste[j], q = SR[qi], cv = test.cevap, cevapli = cv != null, top = test.liste.length, son = j === top - 1, iyi = cv === q[3];
  const ust = akisUst({ kapat: 'data-snv="durdur"', orta: `<span>${j + 1} / ${top}</span>`, ilerleme: Math.round((j + (cevapli ? 1 : 0)) / top * 100) });
  const ic = `<p class="ox-snv-goz">${esc(MOD_AD[test.mod])} · ${esc(uniteAd(q[0]))}</p>${gorselKutu(q)}<h2 class="ox-snv-kok">${esc(q[1])}</h2>
    <div class="ox-snv-siklar">${q[2].map((s, x) => sik(HARF[x], esc(s), cevapli ? (x === q[3] ? 'dogru' : x === cv ? 'yanlis' : '') : '', { 'data-snv-sik': x, disabled: cevapli })).join('')}</div>
    ${cevapli ? cevapKutu(true, iyi ? 'Doğru' : `Doğru cevap: ${HARF[q[3]]}`, esc(q[5] || ''), kaynakHtml(q)) + baglarHtml(qi, !iyi) : ''}`;
  return akis(ust + govde(ic) + akisAlt(dugme(son ? 'Sonucu gör' : 'Devam', { 'data-snv': 'devam-soru', disabled: !cevapli }, { ok: true, genis: true })), 'aninda');
}
/* ---------- 18 · yanlış inceleme ---------- */
function inceleHtml() {
  const l = test.sonuc.inceleme, n = Math.min(incele, l.length - 1), [qi, c] = l[n], q = SR[qi], son = n === l.length - 1;
  const ust = akisUst({ kapat: 'data-snv="incele-kapat"', sag: `<span>${n + 1} / ${l.length}</span>` });
  const ic = `<h2 class="ox-snv-kok ox-snv-ust">${esc(q[1])}</h2>${gorselKutu(q)}
    <div class="ox-snv-siklar">${q[2].map((s, x) => sik(HARF[x], esc(s), x === q[3] ? 'dogru' : x === c ? 'yanlis' : '', { disabled: true })).join('')}</div>
    ${cevapKutu(true, `${c == null ? 'Boş bıraktın · ' : ''}Doğru cevap: ${HARF[q[3]]}`, esc(q[5] || ''), kaynakHtml(q))}${baglarHtml(qi)}`;
  return akis(ust + govde(ic) + akisAlt(dugme(son ? 'Sonuca dön' : 'Sonraki', { 'data-snv': 'incele-sonraki' }, { ok: true, genis: true })), 'incele');
}
/* ---------- 17 · sonuç ---------- */
function sonucHtml() {
  const s = test.sonuc, top = test.liste.length, d = test.dogru, b = test.eksik || 0, y = top - d - b, deneme = test.mod === 'deneme';
  const puan = deneme ? d * 2 : Math.round(d / Math.max(1, top) * 100), gecti = puan >= GECME;
  const hero = heroKart({
    cls: 'ox-snv-puan ' + (gecti ? 'gecti' : 'kaldi'),
    ust: deneme ? 'Deneme sınavı' : esc(MOD_AD[test.mod] + (test.konu ? ' · ' + uniteAd(test.konu) : '')),
    baslik: deneme ? `${puan} puan` : `${d} / ${top} doğru`,
    alt: deneme ? `${d} doğru · ${y} yanlış · ${b} boş` : `%${puan} başarı · ${y} yanlış${b ? ` · ${b} boş` : ''}`,
    meta: deneme ? `<span class="ox-snv-durum">${oi(gecti ? 'dogru' : 'uyari')}${gecti ? 'Geçme puanının üstündesin.' : `Geçme puanı ${GECME}; biraz daha çalışalım.`}</span>` : '',
  });
  const sira = Object.keys(KONULAR).filter(kn => s.tablo[kn]);
  const konuH = kart(sira.map(kn => { const [dd, t] = s.tablo[kn], o = Math.round(dd / t * 100); return `<div class="ox-snv-kr"><div class="ox-snv-kr-ust"><span>${esc(uniteAd(kn))}</span><b>${dd} / ${t}</b></div>${serit(o, o >= GECME ? 'mavi' : 'turuncu')}</div>`; }).join(''), 'ox-snv-konular');
  const eksikNot = deneme && b ? not(`${test.sureDoldu ? 'Süre doldu. ' : ''}${top - b}/${top} soru cevapladın; bu deneme puanlarına sayılmadı. Tam bir deneme çözünce hazırlık puanın güncellenir.`, 'uyari') : '';
  const geriH = deneme ? geri('Öğren', { 'data-snv': 'sonuc-kapat' }) : geri('Çalışma araçları', { 'data-snv': 'sonuc-kapat' });
  return geriH + `<div class="ox-snv-sonuc">${hero}${konuH}
    <div class="ox-snv-dgler">${s.inceleme.length ? dugme(y ? 'Yanlışlarını incele' : 'Boş sorularını incele', { 'data-snv': 'incele' }, { ok: true, genis: true }) : ''}${dugme('Yeniden çöz', { 'data-snv': 'yeniden' }, { tur: s.inceleme.length ? 'ikincil' : 'ana', genis: true, ok: !s.inceleme.length })}</div>
    ${eksikNot}${not(s.yanlis ? `${s.yanlis} yanlışın tekrar listene eklendi; yarın yeniden sorulacak.` : 'Hiç yanlışın yok.', s.yanlis ? 'sifirla' : 'dogru')}</div>`;
}

/* ---------- 13 · deneme girişi ---------- */
function denemeGirisHtml(k) {
  const son = (k.deneme || []).slice(-3), y = test.mod === 'deneme' && test.duraklat ? test : null;
  const madde = ['Tüm konulardan 50 soru sorulur.', 'Süren 45 dakika; süre yalnız bu ekran açıkken işler.', `Geçme puanı ${GECME}.`];
  const sonH = son.length
    ? liste(son.map((p, i) => ({ p, no: (k.deneme.length - son.length) + i + 1 })).reverse().map(({ p, no }) => satir({ ikon: p >= GECME ? 'dogru' : 'yanlis', ton: p >= GECME ? 'yesil' : 'kirmizi', baslik: `${no}. deneme`, alt: p >= GECME ? 'Geçti' : 'Kaldı', altTon: p >= GECME ? 'yesil' : 'kirmizi', sag: `${p} puan` })))
    : `<div class="ox-snv-gri">Henüz deneme çözmedin.</div>`;
  const yarimH = y ? heroKart({ ust: 'Yarım kalan denemen', baslik: `${cevaplanan()} / ${y.liste.length} soru yanıtlandı`, alt: `${Math.max(1, Math.ceil(kalanMs() / 60e3))} dakikan kaldı. Süre, ekranı açınca kaldığı yerden işler.`, cls: 'ox-snv-yarim',
    dugme: `<div class="ox-snv-dgler ox-snv-yan">${dugme('Devam et', { 'data-snv': 'devam' }, { ok: true })}${dugme('Baştan başla', { 'data-snv': 'bastan' }, { tur: 'metin' })}</div>` }) : '';
  const dg = y ? '' : `<div class="ox-snv-dgler">${dugme('Denemeye başla', { 'data-snv-basla': 'deneme' }, { ok: true, genis: true })}</div>`;
  return geri('Öğren', { 'data-ox-alt': '' })
    + `<div class="ox-snv-simge">${gorsel('deneme-pano', '', 'ox-snv-cizim')}</div>`
    + sayfaBas('Deneme sınavı', `50 soru · 45 dakika · ${GECME} geçme puanı`) + yarimH
    + kart(`<ol class="ox-snv-madde">${madde.map((m, i) => `<li><span>${i + 1}</span>${m}</li>`).join('')}</ol>`, 'ox-snv-kural')
    + bolum('Son denemelerin', son.length ? `${k.deneme.length} deneme` : '') + sonH + dg;
}

/* ---------- 19 · çalışma araçları ---------- */
function yarimHero() {
  if (!test.mod || !test.duraklat || test.sonuc) return '';
  const dn = test.mod === 'deneme', kalan = dn ? ` · ${Math.max(1, Math.ceil(kalanMs() / 60e3))} dakikan kaldı` : '';
  return heroKart({ ust: dn ? 'Yarım kalan denemen' : 'Yarım kalan test', baslik: esc(MOD_AD[test.mod] + (test.konu ? ' · ' + uniteAd(test.konu) : '')), alt: `${cevaplanan()} / ${test.liste.length} soru yanıtlandı${kalan}`, cls: 'ox-snv-yarim',
    dugme: `<div class="ox-snv-dgler ox-snv-yan">${dugme('Devam et', { 'data-snv': 'devam' }, { ok: true })}${dugme(dn ? 'Denemeyi bırak' : 'Testi bırak', { 'data-snv': 'birak' }, { tur: 'metin' })}</div>` });
}
// Öğren ana ekranı için: yarım test kartı (yoksa '') ve düğmeleri
export function yarimKart(ctx) { testGeriYukle(ctx.k); return yarimHero(); }
export function yarimBagla(kap, ctx) {
  const y = kap.querySelector('.ox-snv-yarim'); if (!y) return;
  y.addEventListener('click', ev => {
    const a = ev.target.closest('[data-snv]'); if (!a) return;
    if (a.dataset.snv === 'devam') devamEt(ctx);
    else if (a.dataset.snv === 'birak') { testBirak(ctx.k); ctx.yenile(); }
  });
}
function devamEt(ctx) {
  if (!test.mod) return;
  // yenilemede yarım test kartının göründüğü ekran açılsın (test-ayar/tekrar/yanlislar ya da Öğren ana ekranından devam edilmiş olabilir)
  return sorulariYukle().then(() => { test.duraklat = false; test.sonTik = Date.now(); gorunum = 'soru'; gecis = true; altAc(test.mod === 'deneme' ? 'deneme' : 'araclar'); ctx.yenile(true); }).catch(() => bildir('Sorular yüklenemedi; internet bağlantını kontrol edip tekrar dene', 'uyari'));
}
function hazirlikHtml(k) {
  if (!esinavVar(k)) return '';  // e-sınavı olmayan öğrenci (fark, muaf, 100 ceza): e-Sınav hazırlık puanı gösterilmez
  const esGecti = k.esinav && k.esinav.sonuc === 'Geçti';
  if (esGecti) return bolum('Sınava hazırlığın') + liste([satir({ ikon: 'dogru', ton: 'yesil', baslik: 'e-Sınavı geçtin', alt: `${k.esinav.puan ? k.esinav.puan + ' puan · ' : ''}İstersen çalışmaya devam edebilirsin.` })]);
  if (!ogrOzellik('hazirlik')) return '';
  const h = HZ.hazirlik(k), DUR = { hazir: ['Sınava hazırsın', 'yesil'], yaklasti: ['Yaklaşıyorsun', 'turuncu'], calis: ['Biraz daha çalışmalısın', 'kirmizi'] }[h.durum];
  const satirH = (et, v, alt) => `<div class="ox-snv-hz-s"><div class="ox-snv-kr-ust"><span>${et}</span><b>%${v}</b></div>${serit(v, v >= GECME ? 'yesil' : 'mavi')}${alt ? `<small>${alt}</small>` : ''}</div>`;
  return bolum('Sınava hazırlığın', `${h.puan} / 100`) + kart(`<div class="ox-snv-hz-ust">${ikonKutu(h.durum === 'hazir' ? 'kalkan' : 'hedef', DUR[1])}<span class="ox-satir-govde"><b class="ox-snv-ton ${DUR[1]}">${DUR[0]}</b><small>${h.deneme ? `Son ${h.deneme} deneme ortalaması ${h.dOrt}` : 'Henüz deneme sınavı yok'}</small></span></div>
    ${satirH('Deneme sınavları', h.dOrt, h.deneme ? `${h.gecen}/${h.deneme} denemede ${GECME} ve üstü` : '')}
    ${satirH('Konu başarısı', h.konuP, h.konular.filter(x => x.o != null).map(x => esc(uniteAd(x.kn)) + ' %' + x.o).join(' · '))}
    ${satirH('Soru bankası', h.kaps, `Hedef ${sayi(h.hedef)} soru: ${sayi(h.gor)} soru gördün`)}
    ${h.oneri.length ? `<div class="ox-snv-oneri"><b>Şimdi ne yapmalısın</b><ul>${h.oneri.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}`, 'ox-snv-hz');
}
function konuBasariHtml(k) {
  const oran = kn => { const a = (k.konuAnaliz || {})[kn]; return a && a[1] ? [Math.round(a[0] / a[1] * 100), a[1]] : [null, 0]; };
  return bolum('Konu konu başarın', 'Dokun, 10 soru') + liste(Object.keys(KONULAR).map(kn => {
    const [o, t] = oran(kn), zayif = o != null && o < GECME, [ik, ton] = UNITE_IK[kn];
    return `<button type="button" class="ox-satir ox-snv-ks" data-snv-basla="konu" data-unite="${kn}">${ikonKutu(ik, ton)}<span class="ox-satir-govde"><b>${esc(uniteAd(kn))}</b>${serit(o || 0, zayif ? 'turuncu' : 'yesil', true)}<small class="${zayif ? 'kirmizi' : ''}">${o == null ? 'Henüz soru çözmedin' : `${sayi(t)} soru${zayif ? ' · çalışman gerek' : ''}`}</small></span><span class="ox-satir-sag ${zayif ? 'zayif' : ''}">${o == null ? '–' : '%' + o}</span><span class="ox-chev">${oi('sag')}</span></button>`;
  }));
}
function sinavlarHtml(k) {
  // hak sınırı öğrenciye göre (md.15): e-Sınav 4; uygulama ilk 4, ikinci dört hak başlatıldıysa 8
  // tekrar sınav ücreti hak sırasına göre (veri.js uygulamaSinavUcreti / esinavUcreti); öğrencinin kendi masrafı, kurs ücretine dahil değil (liste not 5)
  const dir = gerekliDireksiyon(k) > 0;
  const sonr = tur => (S.sinavlar || []).filter(s => s.tur === tur && (s.kursiyerler || []).includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  const kartH = (tur, x, sn, getir, bilgi, ek = '') => {
    if (x && x.sonuc === 'Geçti') return kart(`<div class="ox-snv-sv-bas">${ikonKutu('dogru', 'yesil')}<span class="ox-satir-govde"><b>${tur}</b><small class="yesil">Geçtin${x.puan ? ' · ' + x.puan + ' puan' : ''}</small></span>${cip('Tamam', 'yesil')}</div>`, 'ox-snv-sv');
    const veri = tur === 'e-Sınav' ? 'e-Sınav' : 'Direksiyon', hak = sinavHakSiniri(k, veri), kalan = Math.max(0, hak - ((x && x.hak) || 0)), tk = tekrarUcret(k, veri, x);
    // hak doldu (kurs henüz karar vermedi): "Bekliyor", randevu, tekrar ücreti ve "yanına al" satırları yerine durum metni
    const hd = hakDurum(k);
    if (hd && hd.tur === veri && !sn) return kart(`<div class="ox-snv-sv-bas">${ikonKutu('uyari', 'turuncu')}<span class="ox-satir-govde"><b>${tur}</b><small>Sınav hakkın kalmadı</small></span>${cip('Hak doldu', 'turuncu')}</div>
      <p class="ox-snv-sv-yer">${oi('bilgi')}<span>${esc(hd.metin)}</span></p>
      <div class="ox-snv-sv-dl"><div><span>Kalan sınav hakkın</span><b>${kalan} / ${hak}</b></div></div>`, 'ox-snv-sv');
    return kart(`<div class="ox-snv-sv-bas">${ikonKutu('takvim', sn ? 'mavi' : 'gri')}<span class="ox-satir-govde"><b>${tur}</b><small>${sn ? `${gunKisa(sn.tarih)} ${tarih(sn.tarih)} · ${esc(sn.saat)}` : 'Henüz tarih yok'}</small></span>${sn ? cip(esc(goreli(sn.tarih))) : cip('Bekliyor', 'gri')}</div>
      <p class="ox-snv-sv-yer">${sn && sn.yer ? `${oi('harita')}<span>${esc(sn.yer)}</span>` : `${oi('bilgi')}<span>${bilgi}</span>`}</p>
      <div class="ox-snv-sv-dl"><div><span>Kalan sınav hakkın</span><b>${kalan} / ${hak}</b></div><div><span>${tk.etiket} <small>${tk.not}</small></span><b>${tk.tutar ? tl(tk.tutar) : '—'}</b></div></div>
      <details class="ox-snv-sv-getir"${sn && fark(sn.tarih) <= 7 ? ' open' : ''}><summary><span>Sınav günü yanına al</span>${oi('asagi')}</summary><ul>${getir.map(g => `<li>${oi('tik')}<span>${esc(g)}</span></li>`).join('')}</ul></details>${ek}`, 'ox-snv-sv');
  };
  if (egitimSinifi(k.sinif)) return bolum('Sınavların') + not('Bu eğitimin sınavı yok. Teorik derslerin tamamına katılınca eğitim belgen kurstan verilir.');
  return bolum('Sınavların') + (esinavVar(k) ? kartH('e-Sınav', k.esinav, sonr('e-Sınav'), ['T.C. kimlik kartın (fotokopi geçmez)', 'e-Sınav ücreti dekontu', 'Sınavdan 30 dakika önce sınav merkezinde ol'], 'Teorik derslerin bitince kurs e-Sınav randevunu alır.') : not(TEORIKSIZ_METIN))
    + (dir ? kartH('Uygulama sınavı', k.dsinav, sonr('Direksiyon'), ['T.C. kimlik kartın', 'Gözlük ya da lens kullanıyorsan yanında olsun', 'Sınavdan 30 dakika önce sınav yerinde ol'], 'Direksiyon derslerin bitince kurs sınav tarihini bildirir.',
      ogrOzellik('direksiyon') ? `<div class="ox-snv-sv-bag">${baglanti('Uygulama sınavına hazırlan', { 'data-ox-alt': 'direksiyon:|araclar' }, true)}</div>` : '') : '');
}
function araclarHtml(k) {
  const yn = (k.yanlislar || []).length, tb = ogrOzellik('tekrar') ? HZ.tekrarBugun(k).length : null, th = k.tehlike || [];
  const kutu = (ik, bas, alt, attrs) => `<button type="button" class="ox-kart ox-snv-kutu"${Object.entries(attrs).map(([a, v]) => ` ${a}="${esc(v)}"`).join('')}>${ikonKutu(ik)}<b>${bas}</b><small>${alt}</small></button>`;
  const satirlar = [
    satir({ ikon: 'yanlis', baslik: 'Yanlışlarım', alt: yn ? `${yn} soru` : 'Henüz yanlış sorun yok.', attrs: { 'data-ox-alt': 'yanlislar' } }),
    tb != null ? satir({ ikon: 'sifirla', baslik: 'Bugünkü tekrar', alt: tb ? `${tb} soru hazır` : 'Bugün tekrar sorun yok.', altTon: tb ? 'mavi' : '', attrs: { 'data-ox-alt': 'tekrar' } }) : '',
    ogrOzellik('tehlike') ? satir({ ikon: 'ikaz', baslik: 'Tehlike algısı', alt: th.length ? `Son puan ${th[th.length - 1].puan}/${th[th.length - 1].en}` : '8 sahne', attrs: { 'data-ox-alt': 'tehlike:|araclar' } }) : '',
  ].filter(Boolean);
  const cozulen = Object.values(k.konuAnaliz || {}).reduce((a, x) => a + ((x && x[1]) || 0), 0), dn = (k.deneme || []).length;
  return geri('Öğren', { 'data-ox-alt': '' }) + sayfaBas('Çalışma araçları', 'Pratik yap, eksiklerini tamamla.')
    + yarimHero()
    + `<div class="ox-snv-kutular">${kutu('kronometre', 'Hızlı test', '10 soru', { 'data-snv-basla': 'hizli' })}${kutu('panoListe', 'Konu testi', `${ayar.n} soru`, { 'data-ox-alt': 'test-ayar' })}</div>`
    + liste(satirlar, 'ox-snv-araclar')
    + `<p class="ox-snv-toplam">Toplam: ${sayi(dn)} deneme · ${sayi(cozulen)} soru çözüldü</p>`
    + hazirlikHtml(k) + konuBasariHtml(k) + sinavlarHtml(k)
    + not(`Havuzda ${sayi(SORU_KONU.length)} soru var. Sonuçların kursun ekranında görünür.`);
}

/* ---------- 20 · test ayarları ---------- */
const grupIdler = kn => konular().filter(x => x.key === kn).map(x => x.id);
const grupTam = kn => { const l = grupIdler(kn); return !!l.length && l.every(id => ayar.dersler.includes(id)); };
const grupDugme = kn => `<button type="button" class="ox-snv-grup-bag" data-snv-grup="${kn}">${grupTam(kn) ? 'Seçimi kaldır' : 'Tümünü seç'}</button>`;
// kutucukları, grup düğmelerini ve başlat düğmesini yeniden çizmeden günceller (kaydırma yeri kaymaz)
function ayarGuncelle(kap) {
  kap.querySelectorAll('[data-snv-ders]').forEach(b => { const s = ayar.dersler.includes(b.dataset.snvDers); b.classList.toggle('secili', s); b.setAttribute('aria-checked', String(s)); });
  kap.querySelectorAll('[data-snv-grup]').forEach(b => { b.textContent = grupTam(b.dataset.snvGrup) ? 'Seçimi kaldır' : 'Tümünü seç'; });
  const bosS = !(ayar.tur === 'konu' ? ayar.dersler : ayar.uniteler).length, dg = kap.querySelector('[data-snv="ayar-basla"]'), ip = kap.querySelector('[data-snv-ipucu]');
  if (dg) dg.disabled = bosS; if (ip) ip.hidden = !bosS;
}
function testAyarHtml() {
  const secim = ayar.tur === 'konu'
    ? Object.keys(KONULAR).map(kn => `<div class="ox-snv-grup"><span>${esc(uniteAd(kn))}</span>${grupDugme(kn)}</div>` + liste(konular().filter(x => x.key === kn).map(x => kutucuk(esc(x.ad), ayar.dersler.includes(x.id), { 'data-snv-ders': x.id })))).join('')
    : liste(Object.keys(KONULAR).map(kn => kutucuk(esc(uniteAd(kn)), ayar.uniteler.includes(kn), { 'data-snv-unite': kn })));
  const bosSecim = ayar.tur === 'konu' ? !ayar.dersler.length : !ayar.uniteler.length;
  return geri('Çalışma araçları', { 'data-ox-alt': 'araclar' }) + sayfaBas('Test ayarları', 'İstediğin konularda test çöz.')
    + sekmeler([['karisik', 'Karışık'], ['konu', 'Konu seç']], ayar.tur, 'data-snv-tur', 'hap')
    + `<div class="ox-snv-secim">${secim}</div>`
    + kart(`<span>Soru sayısı</span><label class="ox-snv-sec"><select data-snv-n aria-label="Soru sayısı">${[10, 20, 30].map(n => `<option value="${n}"${ayar.n === n ? ' selected' : ''}>${n} soru</option>`).join('')}</select>${oi('asagi')}</label>`, 'ox-snv-adet')
    + `<div class="ox-snv-dgler">${dugme('Testi başlat', { 'data-snv': 'ayar-basla', disabled: bosSecim }, { ok: true, genis: true })}</div>`
    + `<p class="ox-snv-ipucu" data-snv-ipucu ${bosSecim ? '' : 'hidden'}>En az bir konu seç.</p>`;
}

/* ---------- 21 · bugünkü tekrar ---------- */
function tekrarHtml(k) {
  const tb = HZ.tekrarBugun(k).length, top = HZ.tekrarToplam(k);
  const ic = tb
    ? `<div class="ox-snv-merkez">${gorsel('tekrar-kartlar', '', 'ox-snv-cizim')}<b>${tb} soru hazır.</b><p>${tb > 20 ? 'Bu turda 20 soru sorulur. ' : ''}Tekrar listende toplam ${top} soru var.</p></div><div class="ox-snv-dgler">${dugme('Tekrara başla', { 'data-snv-basla': 'tekrar' }, { ok: true, genis: true })}</div>`
    : bos('kartlar', 'Bugün tekrar sorun yok', top ? `Tekrar listende ${top} soru var; zamanı gelince burada görünür.` : 'Yanlış yaptığın sorular burada birikir ve ertesi gün yeniden sorulur.', dugme('Hızlı test çöz', { 'data-snv-basla': 'hizli' }, { tur: 'ikincil' }));
  return geri('Çalışma araçları', { 'data-ox-alt': 'araclar' }) + sayfaBas('Bugünkü tekrar', 'Önceki yanlışlarını pekiştir.') + ic
    + `<div class="ox-snv-bilgi">${oi('bilgi')}<span><b>Nasıl çalışır?</b>Yanlış yaptığın sorular 1, 3, 7, 14 ve 30 gün sonra yeniden sorulur. Doğru bildikçe aralık uzar, beşinci doğruda listeden çıkar.</span></div>`;
}

/* ---------- yanlışlarım ---------- */
function yanlislarHtml(k) {
  const l = (k.yanlislar || []), n = l.length;
  const bas = geri('Çalışma araçları', { 'data-ox-alt': 'araclar' }) + sayfaBas('Yanlışlarım', 'Yanlış yaptığın sorular.', n ? `${n} soru` : '');
  if (!n) return bas + bos('yanlis', 'Henüz yanlış sorun yok.', 'Test çözdükçe yanlış yaptığın sorular burada toplanır; doğru bildiğin anda listeden çıkar.', dugme('Hızlı test çöz', { 'data-snv-basla': 'hizli' }, { tur: 'ikincil' }));
  const goster = l.slice(-30).reverse();
  const sat = SR ? goster.filter(qi => SR[qi]).map(qi => { const q = SR[qi], [ik, ton] = UNITE_IK[q[0]] || ['bilgi', 'mavi']; return `<div class="ox-satir ox-snv-ys">${ikonKutu(ik, ton)}<span class="ox-satir-govde"><b>${esc(q[1])}</b><small>${esc(uniteAd(q[0]))} · Doğrusu ${HARF[q[3]]}) ${esc(q[2][q[3]])}</small></span></div>`; })
    : goster.map(() => `<div class="ox-satir ox-snv-ys yer">${ikonKutu('bilgi', 'gri')}<span class="ox-satir-govde"><i></i><i></i></span></div>`);
  return bas + `<div class="ox-snv-dgler ox-snv-ust">${dugme('Yanlışlarını çöz', { 'data-snv-basla': 'yanlis' }, { ok: true, genis: true })}</div>`
    + not('Her turda 10 soru gelir; doğru bildiğin soru listeden çıkar.')
    + bolum('Sorular', n > 30 ? `Son 30 / ${n}` : '') + liste(sat);
}

/* ---------- dışa açılanlar ---------- */
// devam eden ya da sonucu gösterilecek test var mı (varsa Öğren sekmesi bu modülün ekran()'ını gösterir)
export function aktif(ctx) {
  testGeriYukle(ctx.k);
  return !!(test.mod && (test.sonuc || !test.duraklat));
}
export function ekran(ctx) {
  if (!SR) {
    sorulariYukle().then(() => ctx.yenile()).catch(() => bildir('Sorular yüklenemedi; internet bağlantını kontrol edip tekrar dene', 'uyari'));
    return { html: akis(akisUst({ kapat: 'data-snv="durdur"' }) + govde('<div class="ox-snv-yuk" aria-busy="true">Sorular hazırlanıyor…</div>')), baglan: kap => bagla(kap, ctx), tam: true };
  }
  let html, tam = true;
  if (test.sonuc && incele != null && test.sonuc.inceleme.length) html = inceleHtml();
  else if (test.sonuc) { html = sonucHtml(); tam = false; }
  else if (test.mod === 'deneme') html = gorunum === 'liste' ? soruListesiHtml() : denemeSoruHtml();
  else html = anindaSoruHtml();
  gecis = false;
  return { html, tam, baglan: kap => bagla(kap, ctx) };
}
export function altEkran(ad, ctx) {
  const a = String(ad || '').split(':')[0], { k } = ctx;
  testGeriYukle(k);
  let html;
  if (a === 'deneme') html = denemeGirisHtml(k);
  else if (a === 'araclar') html = araclarHtml(k);
  else if (a === 'test-ayar') html = testAyarHtml();
  else if (a === 'tekrar') html = tekrarHtml(k);
  else if (a === 'yanlislar') { html = yanlislarHtml(k); if (!SR && (k.yanlislar || []).length) sorulariYukle().then(() => ctx.yenile()).catch(() => { }); }
  else return null;
  return { html, baglan: kap => bagla(kap, ctx) };
}

/* ---------- yarım test varken yeni test: onay penceresi (sayfa içinde, akış dışında) ---------- */
let degis = null; // { perde, birak }
function degisKapat() {
  if (!degis) return;
  const d = degis; degis = null; d.birak(); d.perde.remove();
}
function degisOnay(ctx, yeni) {
  degisKapat();
  const kok = document.querySelector('.ox') || document.body, dn = test.mod === 'deneme';
  const ad = esc(MOD_AD[test.mod] + (test.konu ? ' · ' + uniteAd(test.konu) : ''));
  kok.insertAdjacentHTML('beforeend', `<div class="ox-snv-perde ox-snv-sabit" data-snv-degis><div class="ox-snv-modal" role="dialog" aria-modal="true" aria-labelledby="ox-snv-d-bas" aria-describedby="ox-snv-d-not">
    <button type="button" class="ox-ikon-dg ox-snv-modal-x" data-snv-d="kapat" aria-label="Kapat">${oi('kapat')}</button>
    <h2 id="ox-snv-d-bas">${dn ? 'Yarım denemen var' : 'Yarım testin var'}</h2>
    <p class="ox-snv-modal-alt">${ad} · ${cevaplanan()} / ${test.liste.length} soru yanıtlandı</p>
    <p class="ox-snv-modal-not" id="ox-snv-d-not">Yeni test başlarsan ${dn ? 'yarım denemen ve kalan süresi' : 'yarım testin'} silinir.</p>
    <div class="ox-snv-modal-dg sar">${dugme(dn ? 'Denemeye dön' : 'Teste dön', { 'data-snv-d': 'devam' }, { tur: 'ikincil' })}${dugme('Yeni test başlat', { 'data-snv-d': 'yeni' })}</div></div></div>`);
  const perde = kok.lastElementChild, cik = odakTuzagi(perde);
  degis = { perde, birak: cik };
  perde.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); degisKapat(); } });
  perde.addEventListener('click', ev => {
    ev.stopPropagation();
    const b = ev.target.closest('[data-snv-d]');
    if (!b) { if (!ev.target.closest('.ox-snv-modal')) degisKapat(); return; }
    const is = b.dataset.snvD;
    degisKapat();
    if (is === 'devam') devamEt(ctx);
    else if (is === 'yeni') yeni();
  });
  const od = perde.querySelector('[data-snv-d="devam"]'); if (od) od.focus({ preventScroll: true });
}

/* ---------- olaylar ---------- */
let tusBagli = false;
// pencere açıkken odak içeride kalır, arkadaki sayfa etkisizdir (odakTuzagi); kapanınca ya da ekran yeniden çizilince bırakılır
let serbest = null;
const tuzakBirak = () => { if (serbest) { const f = serbest; serbest = null; f(); } };
const tuzakKur = p => { tuzakBirak(); if (p) serbest = odakTuzagi(p); };
function modalKapat() { modal = null; const p = document.querySelector('[data-snv-perde]'); tuzakBirak(); if (p) p.remove(); }
function modalAc(m) {
  modal = m; const a = document.querySelector('.ox-snv-akis'); if (!a) return;
  const eski = a.querySelector('[data-snv-perde]'); if (eski) eski.remove();
  a.insertAdjacentHTML('beforeend', modalHtml());
  tuzakKur(a.querySelector('[data-snv-perde]'));
  const odak = a.querySelector('.ox-snv-modal [data-snv="bitir"], .ox-snv-modal [data-snv-neden]'); if (odak) odak.focus({ preventScroll: true });
}
// yeniden çizerken soru gövdesinin kaydırma yerini koru
function yerinde(ctx, sonra) {
  const g = document.querySelector('.ox-snv-akis .ox-akis-govde'), y = g ? g.scrollTop : 0;
  ctx.yenile();
  const g2 = document.querySelector('.ox-snv-akis .ox-akis-govde'); if (g2) g2.scrollTop = y;
  if (sonra) sonra(g2);
}
function bagla(kap, ctx) {
  const { k } = ctx;
  tuzakBirak(); degisKapat();
  if (!tusBagli) { tusBagli = true; document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && modal && document.querySelector('[data-snv-perde]')) modalKapat(); }); }
  if (kap.querySelector('[data-snv-ekran="deneme"]')) sayacKur(ctx);
  { const p = kap.querySelector('[data-snv-perde]'); if (p) tuzakKur(p); }
  // sekme değişirken: gösterilen sonuç kapanır, süren test duraklar (ekran.js'in dinleyicisinden önce çalışır)
  kap.addEventListener('click', ev => {
    if (!ev.target.closest('[data-ogs]') || !test.mod) return;
    if (test.sonuc) { test = { mod: null }; incele = null; }
    else if (!test.duraklat) { test.duraklat = true; testSakla(k); }
  }, true);
  kap.addEventListener('change', ev => {
    const s = ev.target.closest('[data-snv-n]'); if (s) ayar.n = +s.value || 10;
  });
  kap.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-snv-perde]') && !t.closest('.ox-snv-modal')) return modalKapat();
    const nd = t.closest('[data-snv-neden]');
    if (nd) { kap.querySelectorAll('[data-snv-neden]').forEach(b => { const s = b === nd; b.classList.toggle('secili', s); b.setAttribute('aria-checked', String(s)); }); return; }
    const sk = t.closest('[data-snv-sik]');
    if (sk && !sk.disabled && test.mod && !test.sonuc) {
      const x = +sk.dataset.snvSik, qi = test.liste[test.i];
      if (test.mod === 'deneme') {
        test.sec[test.i] = test.sec[test.i] === x ? null : x; denemeEsitle(); testSakla(k);
        kap.querySelectorAll('[data-snv-sik]').forEach(b => { const s = +b.dataset.snvSik === test.sec[test.i]; b.classList.toggle('secili', s); b.setAttribute('aria-pressed', String(s)); });
        return;
      }
      if (test.cevap != null) return;
      test.cevaplar.push([qi, x]); if (x === SR[qi][3]) test.dogru++; else if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) { }
      test.cevap = x; testSakla(k);
      return yerinde(ctx, g => { const c = g && g.querySelector('.ox-cevap'); if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); const d = document.querySelector('[data-snv="devam-soru"]'); if (d) d.focus({ preventScroll: true }); });
    }
    const gt = t.closest('[data-snv-git]');
    if (gt) { test.i = +gt.dataset.snvGit; gorunum = 'soru'; gecis = true; testSakla(k); return ctx.yenile(); }
    const bs = t.closest('[data-snv-basla]');
    if (bs && !bs.disabled) { const m = bs.dataset.snvBasla; if (m === 'konu') return baslat('konu', ctx, { tur: 'karisik', uniteler: [bs.dataset.unite], n: 10 }); return baslat(m, ctx); }
    const ut = t.closest('[data-snv-unite]'), dr = t.closest('[data-snv-ders]');
    if (ut || dr) {
      const l = ut ? ayar.uniteler : ayar.dersler, v = ut ? ut.dataset.snvUnite : dr.dataset.snvDers, b = ut || dr, i = l.indexOf(v);
      if (i < 0) l.push(v); else l.splice(i, 1);
      b.classList.toggle('secili', i < 0); b.setAttribute('aria-checked', String(i < 0));
      ayarGuncelle(kap);
      return;
    }
    const gr = t.closest('[data-snv-grup]');
    if (gr) { const ids = grupIdler(gr.dataset.snvGrup); ayar.dersler = grupTam(gr.dataset.snvGrup) ? ayar.dersler.filter(id => !ids.includes(id)) : [...new Set([...ayar.dersler, ...ids])]; ayarGuncelle(kap); return; }
    const tr = t.closest('[data-snv-tur]'); if (tr) { if (ayar.tur !== tr.dataset.snvTur) { ayar.tur = tr.dataset.snvTur; ctx.yenile(); } return; }
    const a = t.closest('[data-snv]'); if (!a || a.disabled) return;
    const is = a.dataset.snv;
    if (is === 'durdur') { // sınavdan çık: test duraklar, kaldığı yer ve süre saklanır
      if (test.mod && !test.sonuc) { test.duraklat = true; testSakla(k); clearInterval(sayac); sayac = null; }
      modal = null; gorunum = 'soru'; altAc(test.mod === 'deneme' ? 'deneme' : 'araclar'); return ctx.yenile(true);
    }
    if (is === 'devam') return devamEt(ctx);
    if (is === 'birak') { testBirak(k); return ctx.yenile(); }
    if (is === 'bastan') { testBirak(k); return baslat('deneme', ctx, {}, true); }
    if (is === 'isaret') { const j = test.i, l = test.isaret, i = l.indexOf(j); if (i < 0) l.push(j); else l.splice(i, 1); testSakla(k); a.classList.toggle('acik', i < 0); a.setAttribute('aria-pressed', String(i < 0)); a.innerHTML = `${oi('bayrak', i < 0 ? 'dolu' : '')}<span>${i < 0 ? 'İşaretlendi' : 'İşaretle'}</span>`; return; }
    if (is === 'sonraki') { if (test.i < test.liste.length - 1) { test.i++; gecis = true; testSakla(k); } return ctx.yenile(); }
    if (is === 'liste') { modal = null; gorunum = 'liste'; return ctx.yenile(); }
    if (is === 'soru') { gorunum = 'soru'; return ctx.yenile(); }
    if (is === 'onay') return modalAc({ tur: 'onay' });
    if (is === 'modal-kapat') return modalKapat();
    if (is === 'bitir') { bitir(k); return ctx.yenile(true); }
    if (is === 'devam-soru') { if (test.cevap == null) return; test.i++; test.cevap = null; gecis = true; if (test.i >= test.liste.length) { bitir(k); return ctx.yenile(true); } testSakla(k); return ctx.yenile(); }
    if (is === 'incele') { incele = 0; gecis = true; return ctx.yenile(true); }
    if (is === 'incele-sonraki') { if (incele < test.sonuc.inceleme.length - 1) { incele++; gecis = true; } else incele = null; return ctx.yenile(true); }
    if (is === 'incele-kapat') { incele = null; return ctx.yenile(true); }
    if (is === 'sonuc-kapat') { const dn = test.mod === 'deneme'; test = { mod: null }; incele = null; if (dn) altKapat(); else altAc('araclar'); return ctx.yenile(true); }
    if (is === 'yeniden') { const m = test.mod, o = test.opts || {}; test = { mod: null }; incele = null; return baslat(m, ctx, o, true); }
    if (is === 'ayar-basla') { const o = ayar.tur === 'konu' ? { tur: 'konu', dersler: ayar.dersler.slice(), n: ayar.n } : { tur: 'karisik', uniteler: ayar.uniteler.slice(), n: ayar.n }; return baslat('konu', ctx, o); }
    if (is === 'bildir') return sorulariYukle().then(() => modalAc({ tur: 'bildir', qi: +a.dataset.qi }));
    if (is === 'bildir-gonder' && modal && modal.tur === 'bildir') {
      const qi = modal.qi, q = SR[qi], m = document.querySelector('.ox-snv-modal'), sn = m.querySelector('[data-snv-neden].secili'), ac = (m.querySelector('[data-snv-aciklama]').value || '').trim().slice(0, 300);
      gonderimEkle(S.kurs.ad, `${tamAd(k)} soru bildirdi (#${qi + 1}): ${NEDEN[sn ? +sn.dataset.snvNeden : 0]}${ac ? ' · ' + ac : ''} · “${q[1].slice(0, 90)}”`, 'Soru bildirimi');
      kaydet(); modalKapat(); bildir('Teşekkürler, soru incelenmek üzere iletildi');
    }
  });
}

/* ---------- stiller (yalnız ui.js değişkenleri) ---------- */
stilEkle('ox-sinav', `
.ox-snv-akis .ox-akis-ust{grid-template-columns:72px 1fr 72px}
.ox-snv-akis .ox-akis-sag{font-size:14.5px;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums;padding-right:8px}
.ox-snv-akis .ox-akis-sag:has(.ox-snv-ust-bag){padding-right:0}
.ox-snv-saat{display:inline-flex;align-items:center;gap:6px;font-size:16px;font-weight:700;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-snv-saat .ox-i{width:21px;height:21px;color:var(--ox-mavi);stroke-width:2}
.ox-snv-saat.az,.ox-snv-saat.az .ox-i{color:var(--ox-kirmizi)}
.ox-snv-ust-bas{justify-self:start;font-size:18px;font-weight:700;color:var(--ox-bas);letter-spacing:-.01em}
.ox-snv-akis .ox-akis-orta:has(.ox-snv-ust-bas){justify-items:start}
.ox-snv-akis .ox-akis-ust:has(.ox-snv-ust-bas){grid-template-columns:44px 1fr auto}
.ox-snv-ust-bag{min-height:44px;padding:0 8px;color:var(--ox-mavi);font-size:15.5px;font-weight:600;border-radius:10px}
.ox-snv-akis .ox-akis-alt .ox-dg.okl{justify-content:center}
.ox-snv-akis .ox-akis-alt .ox-dg.okl.genis{justify-content:space-between}
.ox-snv-ic.gir{animation:oxSnvGir .24s cubic-bezier(.2,.8,.2,1)}
@keyframes oxSnvGir{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
.ox-snv-gorsel{width:min(46vw,184px);aspect-ratio:1;margin:4px auto 14px;display:grid;place-items:center}
.ox-snv-gorsel svg{width:100%;height:100%;display:block}
.ox-snv-soru-bas{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;margin:0 0 2px}
.ox-snv-soru-bas>span,.ox-snv-goz{font-size:14px;color:var(--ox-ikincil);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ox-snv-goz{margin:6px 0 12px}
.ox-snv-isaret{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 0 0 10px;font-size:14.5px;font-weight:600;color:var(--ox-ikincil);border-radius:10px}
.ox-snv-isaret .ox-i{width:18px;height:18px;stroke-width:2}
.ox-snv-isaret.acik{color:var(--ox-turuncu)}
.ox-snv-kok{font-size:18px;line-height:1.35;font-weight:700;letter-spacing:-.01em;color:var(--ox-bas);margin:0 0 16px}
.ox-snv-kok.ox-snv-ust{margin-top:6px}
.ox-snv-baglar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:6px}
.ox-snv-baglar .ox-bag{min-height:44px}
.ox-snv-kaynak{display:block;margin-top:6px;font-size:13px;opacity:.75}
.ox-snv-yuk{min-height:60vh;display:grid;place-items:center;color:var(--ox-soluk);font-size:15px}
/* soru listesi */
.ox-snv-izgara{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:4px}
.ox-snv-no{position:relative;display:grid;place-items:center;height:44px;border-radius:10px;border:1px solid var(--ox-cizgi)!important;background:#fff!important;font-size:15px;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums;text-align:center!important}
.ox-snv-no.dolu{background:var(--ox-mavi)!important;border-color:var(--ox-mavi)!important;color:#fff}
.ox-snv-no.simdi{box-shadow:0 0 0 2px #fff,0 0 0 4px var(--ox-mavi)}
.ox-snv-no:not(.dolu).simdi{border-color:var(--ox-mavi)!important;color:var(--ox-mavi);box-shadow:inset 0 0 0 1px var(--ox-mavi)}
.ox-snv-no i{position:absolute;top:3px;right:3px;display:grid;color:var(--ox-turuncu)}
.ox-snv-no.dolu i{color:#ffd59a}
.ox-snv-no i .ox-i{width:11px;height:11px;stroke-width:2}
.ox-snv-lejant{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:18px;font-size:13px;color:var(--ox-ikincil)}
.ox-snv-lejant span{display:inline-flex;align-items:center;gap:6px}
.ox-snv-lejant i{display:grid;place-items:center;width:16px;height:16px;border-radius:5px;border:1px solid var(--ox-cizgi);background:#fff}
.ox-snv-lejant i.dolu{background:var(--ox-mavi);border-color:var(--ox-mavi)}
.ox-snv-lejant i.isaretli{border-color:var(--ox-turuncu);color:var(--ox-turuncu)}
.ox-snv-lejant i .ox-i{width:10px;height:10px}
.ox-snv-sure-not{display:flex;align-items:center;gap:8px;margin-top:16px;font-size:14px;color:var(--ox-ikincil)}
.ox-snv-sure-not .ox-i{width:18px;height:18px;color:var(--ox-soluk)}
.ox-snv-sure-not b{color:var(--ox-bas);font-variant-numeric:tabular-nums}
/* pencere (bitirme onayı, soru bildirimi) */
.ox-snv-perde{position:absolute;inset:0;z-index:5;display:grid;place-items:center;padding:24px 16px;background:rgba(15,29,64,.42);animation:oxSnvPerde .2s ease}
.ox-snv-modal{position:relative;width:100%;max-width:400px;max-height:100%;overflow-y:auto;background:#fff;border-radius:var(--ox-r-b);padding:28px 20px 20px;box-shadow:0 24px 48px -16px rgba(16,24,40,.35);text-align:center;animation:oxSnvModal .24s cubic-bezier(.2,.8,.2,1)}
.ox-snv-perde.ox-snv-sabit{position:fixed;z-index:70}
.ox-snv-modal-x{position:absolute;top:6px;right:6px}
.ox-snv-modal h2{font-size:23px;line-height:1.15;font-weight:800;letter-spacing:-.022em;color:var(--ox-bas);padding:0 32px}
.ox-snv-modal-alt{margin-top:8px;font-size:16px;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-snv-modal-not{margin-top:6px;font-size:14px;color:var(--ox-soluk)}
.ox-snv-modal-dg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:22px}
.ox-snv-modal-dg .ox-dg{padding:0 12px}
.ox-snv-modal-dg.sar{display:flex;flex-wrap:wrap}.ox-snv-modal-dg.sar .ox-dg{flex:1 1 auto}
.ox-snv-modal.ox-snv-m-bildir{text-align:left}
.ox-snv-modal.ox-snv-m-bildir h2{padding:0 32px 0 0}
.ox-snv-alinti{margin-top:8px;font-size:14.5px;line-height:1.4;color:var(--ox-ikincil)}
.ox-snv-et{display:block;margin:16px 0 8px;font-size:14px;font-weight:600;color:var(--ox-bas)}
.ox-snv-et small{font-weight:400;color:var(--ox-soluk)}
.ox-snv-neden{box-shadow:none}
.ox-snv-neden .ox-radyo{min-height:46px;font-size:15px}
.ox-snv-alan{display:block}
.ox-snv-alan textarea{display:block;width:100%;min-height:64px;padding:10px 12px;border:1px solid var(--ox-cizgi);border-radius:var(--ox-r-dg);font:inherit;font-size:16px;color:var(--ox-bas);background:#fff;resize:vertical}
.ox-snv-alan textarea:focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:1px}
@keyframes oxSnvPerde{from{opacity:0}to{opacity:1}}
@keyframes oxSnvModal{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
/* deneme girişi */
.ox-snv-simge{display:grid;place-items:center;margin:12px 0 2px}
.ox-snv-simge .ox-ik-kutu.buyuk{width:88px;height:88px;border-radius:24px}
.ox-snv-simge .ox-ik-kutu.buyuk .ox-i{width:46px;height:46px;stroke-width:1.6}
.ox-snv-kural{padding:6px 16px}
.ox-snv-madde{list-style:none}
.ox-snv-madde li{display:flex;align-items:center;gap:12px;min-height:48px;padding:8px 0;font-size:15.5px;line-height:1.35;color:var(--ox-bas)}
.ox-snv-madde li+li{border-top:1px solid var(--ox-ayrac)}
.ox-snv-madde li span{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--ox-mavi-acik);color:var(--ox-mavi);font-size:13px;font-weight:700}
.ox-snv-gri{display:grid;place-items:center;min-height:56px;padding:12px 16px;border-radius:var(--ox-r);background:var(--ox-gri-acik);font-size:15px;color:var(--ox-ikincil);text-align:center}
.ox-snv-dgler{display:grid;gap:10px;margin-top:20px}
.ox-snv-dgler.ox-snv-ust{margin-top:4px}
.ox-snv-dgler.ox-snv-yan{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;margin-top:0}
.ox .ox-not+.ox-snv-dgler{margin-top:14px}
/* sonuç */
.ox-snv-puan{text-align:center;padding:24px 20px 20px}
.ox-snv-puan h2{font-size:34px;letter-spacing:-.03em}
.ox-snv-puan .ox-hero-ust{margin-bottom:4px}
.ox-snv-puan .ox-hero-alt{margin-top:6px;font-size:16px;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-snv-puan .ox-hero-meta{margin-top:12px}
.ox-snv-durum{display:inline-flex;align-items:center;gap:6px;font-size:15px;font-weight:600}
.ox-snv-durum .ox-i{width:20px;height:20px}
.ox-snv-puan.gecti .ox-snv-durum{color:var(--ox-yesil)}
.ox-snv-puan.kaldi .ox-snv-durum{color:#c26a00}
.ox-snv-sonuc>.ox-not{margin-top:14px}
.ox-snv-konular{padding:4px 16px;margin-top:12px}
.ox-snv-sonuc .ox-not+.ox-not{margin-top:10px}
.ox-snv-kr{padding:12px 0}
.ox-snv-kr+.ox-snv-kr{border-top:1px solid var(--ox-ayrac)}
.ox-snv-kr-ust{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px;font-size:15.5px;color:var(--ox-bas)}
.ox-snv-kr-ust span{min-width:0;font-weight:600}
.ox-snv-kr-ust b{flex:none;font-weight:600;font-variant-numeric:tabular-nums;color:var(--ox-ikincil)}
/* çalışma araçları */
.ox-snv-kutular{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ox-snv-kutu.ox-kart{display:grid;justify-items:center;align-content:center;gap:4px;min-height:132px;padding:18px 12px 16px;text-align:center;margin:0}
.ox-snv-kutu .ox-ik-kutu{margin-bottom:6px}
.ox-snv-kutu b{font-size:16px;font-weight:700;color:var(--ox-bas);letter-spacing:-.01em}
.ox-snv-kutu small{font-size:14px;color:var(--ox-ikincil)}
.ox-snv-kutu:active{background:#f2f5fa}
.ox-snv-araclar{margin-top:12px}
.ox-snv-toplam{margin-top:12px;text-align:center;font-size:14px;color:var(--ox-ikincil);font-variant-numeric:tabular-nums}
.ox-snv-yarim{margin-bottom:12px}
.ox-snv-yarim .ox-hero-dg{margin-top:14px}
.ox-snv-hz{padding:16px}
.ox-snv-hz-ust{display:flex;align-items:center;gap:14px;margin-bottom:6px}
.ox-snv-ton{font-size:16px}
.ox-snv-ton.yesil{color:var(--ox-yesil)!important}.ox-snv-ton.turuncu{color:#c26a00!important}.ox-snv-ton.kirmizi{color:var(--ox-kirmizi)!important}
.ox-snv-hz-s{padding:12px 0 0}
.ox-snv-hz-s .ox-snv-kr-ust{margin-bottom:6px;font-size:15px}
.ox-snv-hz-s .ox-snv-kr-ust b{color:var(--ox-bas)}
.ox-snv-hz-s small{display:block;margin-top:6px;font-size:13px;line-height:1.35;color:var(--ox-soluk)}
.ox-snv-oneri{margin-top:14px;padding-top:12px;border-top:1px solid var(--ox-ayrac);font-size:14.5px;color:var(--ox-metin)}
.ox-snv-oneri b{display:block;margin-bottom:4px;font-size:15px;color:var(--ox-bas)}
.ox-snv-oneri ul{margin:0;padding-left:18px}
.ox-snv-oneri li+li{margin-top:2px}
.ox-snv-ks .ox-serit{margin:6px 0 2px;max-width:220px}
.ox-snv-ks .ox-satir-sag.zayif{color:var(--ox-kirmizi)}
.ox-snv-sv{padding:14px 16px}
.ox-snv-sv-bas{display:flex;align-items:center;gap:14px}
.ox-snv-sv-yer{display:flex;align-items:flex-start;gap:8px;margin-top:12px;font-size:14.5px;line-height:1.4;color:var(--ox-ikincil)}
.ox-snv-sv-yer .ox-i{width:18px;height:18px;margin-top:1px;color:var(--ox-soluk)}
.ox-snv-sv-dl{margin-top:10px;border-top:1px solid var(--ox-ayrac)}
.ox-snv-sv-dl div{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-bottom:1px solid var(--ox-ayrac);font-size:15px;color:var(--ox-metin)}
.ox-snv-sv-dl b{flex:none;font-weight:600;color:var(--ox-bas);font-variant-numeric:tabular-nums}
.ox-snv-sv-dl:last-child div:last-child{border-bottom:0;padding-bottom:0}
.ox-snv-sv-getir summary{display:flex;align-items:center;justify-content:space-between;min-height:44px;list-style:none;cursor:pointer;font-size:15px;font-weight:600;color:var(--ox-mavi)}
.ox-snv-sv-getir summary::-webkit-details-marker{display:none}
.ox-snv-sv-getir summary .ox-i{width:20px;height:20px;transition:transform .2s}
.ox-snv-sv-getir[open] summary .ox-i{transform:rotate(180deg)}
.ox-snv-sv-getir ul{list-style:none;display:grid;gap:8px;padding:0 0 6px}
.ox-snv-sv-getir li{display:flex;gap:8px;font-size:14.5px;line-height:1.4;color:var(--ox-metin)}
.ox-snv-sv-getir li .ox-i{width:18px;height:18px;margin-top:1px;color:var(--ox-yesil);stroke-width:2.4}
.ox-snv-sv-bag{padding-top:6px;border-top:1px solid var(--ox-ayrac)}
.ox-snv-sv-bag .ox-bag{min-height:44px}
/* test ayarları */
.ox-snv-secim .ox-liste+.ox-snv-grup{margin-top:12px}
.ox-snv-grup{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 2px 4px;font-size:14px;font-weight:600;color:var(--ox-ikincil)}
.ox-snv-grup span{min-width:0}
.ox-snv-grup-bag{flex:none;min-height:44px;padding:0 4px 0 8px;color:var(--ox-mavi);font-size:14.5px;font-weight:600;border-radius:10px}
.ox-snv-adet{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px;padding:10px 12px 10px 16px;margin-top:12px;font-size:16px;font-weight:600;color:var(--ox-bas)}
.ox-snv-sec{position:relative;display:block;flex:none}
.ox-snv-sec select{-webkit-appearance:none;appearance:none;min-width:132px;height:44px;padding:0 40px 0 14px;border:1px solid var(--ox-cizgi);border-radius:var(--ox-r-dg);background:#fff;font:inherit;font-size:16px;font-weight:500;color:var(--ox-bas);cursor:pointer}
.ox-snv-sec select:focus-visible{outline:2.5px solid var(--ox-mavi);outline-offset:2px}
.ox-snv-sec .ox-i{position:absolute;right:12px;top:50%;width:18px;height:18px;margin-top:-9px;color:var(--ox-ikincil);pointer-events:none}
.ox-snv-ipucu{margin-top:10px;text-align:center;font-size:14px;color:var(--ox-ikincil)}
/* bugünkü tekrar */
.ox-snv-merkez{display:grid;justify-items:center;text-align:center;gap:6px;padding:20px 0 4px}
.ox-snv-merkez .ox-ik-kutu.buyuk{width:88px;height:88px;border-radius:24px;margin-bottom:10px}
.ox-snv-merkez .ox-ik-kutu.buyuk .ox-i{width:46px;height:46px;stroke-width:1.6}
.ox-snv-merkez b{font-size:18px;font-weight:700;color:var(--ox-bas)}
.ox-snv-merkez p{font-size:15px;color:var(--ox-ikincil)}
.ox-snv-bilgi{display:flex;gap:12px;align-items:flex-start;margin-top:24px;padding:14px 16px;border-radius:var(--ox-r);background:var(--ox-mavi-acik);font-size:14.5px;line-height:1.4;color:var(--ox-metin)}
.ox-snv-bilgi .ox-i{width:22px;height:22px;color:var(--ox-mavi)}
.ox-snv-bilgi b{display:block;margin-bottom:2px;font-size:15px;color:var(--ox-bas)}
/* yanlışlarım */
.ox-snv-ys{align-items:flex-start}
.ox-snv-ys .ox-satir-govde b{font-size:15px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ox-snv-ys .ox-satir-govde small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ox-snv-ys.yer .ox-satir-govde i{display:block;height:12px;border-radius:6px;background:var(--ox-gri-acik)}
.ox-snv-ys.yer .ox-satir-govde i+i{width:60%;margin-top:8px}
`);
stilEkle('ox-snv-cizim', '.ox-snv-cizim{display:block;width:min(220px,62%);height:auto;aspect-ratio:4/3;margin:0 auto 4px;object-fit:contain}');
