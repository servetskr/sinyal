// MEBBİS ile uyumsuzluklar (DIR-054, DIR-026, DIR-027, DIR-053).
// İlke: mdSinyal dersi gerçekte yapıldığı tarih ve saatle tutar; Yardımcı MEBBİS'e yalnız bu gerçek kaydı yazar. Kurs MEBBİS'e farklı bir tarih ya da saat
// girdiyse (ör. Pazar yapılan ders Cumartesi girilmiş, son dakika saat değişikliği işlenmemiş) geri okumada (SKT04002 haftalık program, SKT02009 aday dosyası)
// fark burada yakalanır: ders satırında rozet, MEB işlemleri'nde liste, Bugün'de hatırlatma. Kurs açıklama yazıp "bilerek bırakıldı" diye kapatabilir.
// MTSK md.46/A: denetimde eğitimin Modül'e girilen gün ve saatte yapılıp yapılmadığına bakılır; uyumsuzluk denetim riskidir.
import { donemKodu } from './mebnorm.js?v=235';
import { S, geceDersMi, gun, kursiyer, egitmen, arac, tamAd, islem, kaydet, EGITIM_TURU, egitimTuruOf } from './veri.js?v=235';

export const nrm = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const plakaN = p => String(p || '').toLocaleUpperCase('tr').replace(/\(.*?\)/g, '').replace(/[^A-Z0-9]/g, '');
const tarihIso = v => { const m = String(v || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const saatIlk = v => { const m = String(v || '').match(/(\d{1,2})[:.](\d{2})/); return m ? m[1].padStart(2, '0') + ':' + m[2] : ''; };
const trT = t => t ? t.split('-').reverse().join('.') : '';
const GUN_AD = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const gunAd = t => GUN_AD[new Date(t + 'T12:00:00').getDay()];
const gunFark = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const sutun = (baslik, ...l) => (baslik || []).map(nrm).findIndex(h => l.some(x => x instanceof RegExp ? x.test(h) : h.includes(x)));
const turKod = t => { const n = nrm(t); return /telafi/.test(n) ? 'onSinav' : /2direksiyon|ikinci/.test(n) ? 'ikinci' : /basarisiz/.test(n) ? 'basarisiz' : n ? 'normal' : ''; };
const yerKod = y => { const n = nrm(y); return /simulator/.test(n) ? 'simulator' : /alan/.test(n) ? 'alan' : n ? 'trafik' : ''; };
const izinNo = p => (String(p || '').match(/(\d{5,})/) || [])[1] || '';

// MEBBİS ders satırını ortak biçime çevirir: { ad, tarih, saat, plaka, izinNo, personel, yer, tur, donem, grup, sube }
export function satirlariOku(t) {
  const b = (t && t.baslik) || [], i = { d: sutun(b, /^donemi?$/), g: sutun(b, 'grupadi', /^grubu?$/), s: sutun(b, 'subesi', /^sube$/), a: sutun(b, 'adayadi', 'adisoyadi', /^adsoyad/), p: sutun(b, 'plaka'), y: sutun(b, 'dersyeri', 'egitimyeri', /yeri$/), t: sutun(b, 'derstarihi', /^tarih/), sa: sutun(b, 'derssaati', /saat/), pe: sutun(b, 'personel', 'ogretmen', 'usta'), et: sutun(b, 'egitimturu', /turu$/) };
  return ((t && t.satirlar) || []).map(r => ({ ad: r[i.a] || '', tarih: tarihIso(r[i.t]), saat: saatIlk(r[i.sa]), plaka: r[i.p] || '', izinNo: izinNo(r[i.pe]), personel: String(r[i.pe] || '').replace(/İzin\s*No\s*:?\s*\d*/i, '').replace(/\(.*?\)/g, '').trim(), yer: yerKod(r[i.y]), tur: turKod(r[i.et]), donem: r[i.d] || '', grup: r[i.g] || '', sube: r[i.s] || '' })).filter(x => x.tarih && x.saat);
}
// Aday adıyla öğrenci eşleşmesi (SKT04002'de TC yok; dönemler MEB-040 gereği donemKodu ile karşılaştırılır). Aynı adda birden çok öğrenci varsa MEBBİS grubu/şubesiyle ayrılır; yine ayrılmıyorsa eşleşmez.
export function adEsle(satirlar) {
  const adlar = new Map(); (S.kursiyerler || []).forEach(k => { const a = nrm(tamAd(k)); if (!adlar.has(a)) adlar.set(a, []); adlar.get(a).push(k); });
  let belirsiz = 0, yok = 0;
  satirlar.forEach(x => { const l = adlar.get(nrm(x.ad)) || [];
    let k = l.length === 1 ? l[0] : null;
    if (l.length > 1) { const g = l.filter(y => y.meb && y.meb.donem && donemKodu(y.meb.donem) && donemKodu(y.meb.donem) === donemKodu(x.donem)); k = g.length === 1 ? g[0] : null; if (!k) belirsiz++; }
    if (!l.length) yok++;
    x.kursiyer = k ? k.id : null; });
  return { belirsiz, yok };
}

// Karşılaştırma. meb: kursiyeri belli MEBBİS satırları; kapsam: { bas, son, kursiyerler? (Set) }
// Döner: [{ anahtar, tur: ['tarih'|'saat'|'ogretmen'|'arac'|'egitim'|'yalnizMeb'|'mebdeYok'], ders, kursiyer, gercek, meb }]
export function karsilastir(meb, { bas, son, kursiyerler = null } = {}) {
  const icinde = d => d.tarih >= bas && d.tarih <= son && (!kursiyerler || kursiyerler.has(d.kursiyer));
  const ds = (S.dersler || []).filter(d => d && d.durum !== 'İptal' && icinde(d)), kalanD = new Set(ds), kalanM = new Set(meb.filter(x => x.kursiyer && icinde(x)));
  const sonuc = [], egIzin = id => { const h = egitmen(id); return h ? String(h.calismaIzinNo || h.izinNo || '') : ''; };
  const farklar = (d, x) => { const l = [];
    if (d.tarih !== x.tarih) l.push('tarih'); else if (d.saat !== x.saat) l.push('saat');
    const iz = egIzin(d.egitmen); if (x.izinNo && iz && x.izinNo !== iz) l.push('ogretmen'); else if (!x.izinNo && x.personel && egitmen(d.egitmen) && nrm(egitmen(d.egitmen).ad) !== nrm(x.personel)) l.push('ogretmen');
    const ar = d.arac && arac(d.arac); if (x.yer !== 'simulator' && x.plaka && ar && plakaN(ar.plaka) !== plakaN(x.plaka)) l.push('arac');
    if (x.tur && d.durum !== 'Gelmedi') { const k = kursiyer(d.kursiyer), et = k ? egitimTuruOf(k, d) : null; if (et && et !== x.tur) l.push('egitim'); }
    return l; };
  const gercek = d => ({ tarih: d.tarih, saat: d.saat, egitmen: d.egitmen, arac: d.arac || null, durum: d.durum });
  const mebOz = x => ({ tarih: x.tarih, saat: x.saat, plaka: x.plaka, izinNo: x.izinNo, personel: x.personel, yer: x.yer, tur: x.tur });
  // 1) aynı öğrenci, aynı gün ve saat
  [...kalanM].forEach(x => { const d = [...kalanD].find(y => y.kursiyer === x.kursiyer && y.tarih === x.tarih && y.saat === x.saat); if (!d) return;
    kalanD.delete(d); kalanM.delete(x); if (!d.meb && d.durum !== 'Gelmedi') { d.meb = true; d.mebKaynak = 'okuma'; delete d.mebDegisti; }
    const f = farklar(d, x); if (f.length) sonuc.push({ anahtar: 'd:' + d.id, tur: f, ders: d.id, kursiyer: d.kursiyer, gercek: gercek(d), meb: mebOz(x) }); });
  // 2) aynı öğrenci, en yakın gün (en çok 3 gün) ya da aynı gün başka saat: tarih/saat farkı
  [...kalanM].sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(x => {
    const ad = [...kalanD].filter(y => y.kursiyer === x.kursiyer && Math.abs(gunFark(y.tarih, x.tarih)) <= 3).sort((a, b) => Math.abs(gunFark(a.tarih, x.tarih)) - Math.abs(gunFark(b.tarih, x.tarih)) || (a.saat === x.saat ? -1 : b.saat === x.saat ? 1 : 0))[0];
    if (!ad) return; kalanD.delete(ad); kalanM.delete(x);
    sonuc.push({ anahtar: 'd:' + ad.id, tur: farklar(ad, x), ders: ad.id, kursiyer: ad.kursiyer, gercek: gercek(ad), meb: mebOz(x) }); });
  // 3) yalnız MEBBİS'te
  kalanM.forEach(x => sonuc.push({ anahtar: 'm:' + x.kursiyer + ':' + x.tarih + ':' + x.saat, tur: ['yalnizMeb'], ders: null, kursiyer: x.kursiyer, gercek: null, meb: mebOz(x) }));
  // 4) mdSinyal'de var, MEBBİS'te yok: MEBBİS'e yazılmış (d.meb) ya da tarihi geçmiş ders. Henüz yazılmamış ileri ders "MEBBİS'e girilecek" listesindedir, burada sayılmaz.
  kalanD.forEach(d => { if (d.durum === 'Gelmedi' && !d.meb) return; if (!d.meb && d.tarih > gun(0)) return;
    sonuc.push({ anahtar: 'y:' + d.id, tur: ['mebdeYok'], ders: d.id, kursiyer: d.kursiyer, gercek: gercek(d), meb: null }); });
  return sonuc;
}
// Kalıcı liste: S.mebUyumsuz. Okunan kapsamdaki eski kayıtlar silinir, yeniler eklenir; aynı anahtarın ilk görülme anı ve "bilerek bırakıldı" kaydı korunur.
export function guncelle(yeni, { bas, son, kursiyerler = null, kaynak }) {
  const eski = new Map((S.mebUyumsuz || []).map(x => [x.anahtar, x])), zaman = gun(0) + ' ' + new Date().toTimeString().slice(0, 5);
  const kapsamda = x => { const t = (x.gercek || x.meb || {}).tarih || ''; return t >= bas && t <= son && (!kursiyerler || kursiyerler.has(x.kursiyer)); };
  const kalan = (S.mebUyumsuz || []).filter(x => !kapsamda(x));
  const eklenen = yeni.map(x => { const o = eski.get(x.anahtar); const ayni = o && o.tur.join() === x.tur.join() && JSON.stringify(o.meb) === JSON.stringify(x.meb);
    return { ...x, kaynak, ilk: o && ayni ? o.ilk : zaman, son: zaman, ...(o && ayni && o.kapandi ? { kapandi: o.kapandi } : {}) }; });
  S.mebUyumsuz = [...kalan, ...eklenen].sort((a, b) => ((a.gercek || a.meb).tarih + (a.gercek || a.meb).saat).localeCompare((b.gercek || b.meb).tarih + (b.gercek || b.meb).saat));
  return { acik: eklenen.filter(x => !x.kapandi).length, toplam: eklenen.length };
}
export const acikUyumsuzlar = () => (S.mebUyumsuz || []).filter(x => !x.kapandi && (!x.kursiyer || kursiyer(x.kursiyer)));
export const dersUyumsuz = id => (S.mebUyumsuz || []).find(x => x.ders === id && !x.kapandi) || null;
export function kapat(anahtar, not, kim) { const x = (S.mebUyumsuz || []).find(y => y.anahtar === anahtar); if (!x) return false;
  x.kapandi = { not: String(not || '').trim(), kim: kim || '', tarih: gun(0) }; islem('MEBBİS uyumsuzluğunu bilerek bıraktı', `${metin(x).baslik} · ${x.kapandi.not}`); kaydet(); return true; }
export function ac(anahtar) { const x = (S.mebUyumsuz || []).find(y => y.anahtar === anahtar); if (!x || !x.kapandi) return false; delete x.kapandi; islem('MEBBİS uyumsuzluğunu yeniden açtı', metin(x).baslik); kaydet(); return true; }

// İnsan diliyle: başlık (öğrenci · tarih), gerçek ve MEBBİS satırı, ne yapılmalı
export function metin(x) {
  const k = kursiyer(x.kursiyer), ad = k ? tamAd(k) : '', g = x.gercek, m = x.meb;
  const gs = g ? `${trT(g.tarih)} ${gunAd(g.tarih)} ${g.saat}` : '', ms = m ? `${trT(m.tarih)} ${gunAd(m.tarih)} ${m.saat}` : '';
  const ETK = { tarih: 'Tarih farklı', saat: 'Saat farklı', ogretmen: 'Öğretmen farklı', arac: 'Araç farklı', egitim: 'Eğitim türü farklı', yalnizMeb: 'Yalnız MEBBİS’te', mebdeYok: 'MEBBİS’te yok' };
  const etiket = x.tur.map(t => ETK[t] || t);
  const ne = x.tur.includes('mebdeYok') ? (g && g.tarih > gun(0) ? 'Ders MEBBİS’e yazılmıştı ama programda görünmüyor (MEM silmiş olabilir: tatil saati, yetki). Yeniden yazın ya da nedenini öğrenin.' : 'Yapılan ders MEBBİS’te yok. Denetimde ders yapılmamış sayılır; il/ilçe MEM’e başvurun.')
    : x.tur.includes('yalnizMeb') ? 'MEBBİS’te ders var, mdSinyal’de yok. Ders gerçekten yapıldıysa mdSinyal’e ekleyin; yapılmadıysa MEBBİS’ten silin.'
    : g && g.tarih > gun(0) ? 'Ders henüz yapılmadı: MEBBİS’teki kaydı gerçek gün ve saate göre düzeltin.' : 'MEBBİS kaydı gerçekte yapılan dersle uyuşmuyor; denetimde Modül’e girilen gün ve saat esas alınır (MTSK md.46/A).';
  const meb = m ? `${ms}${m.yer === 'simulator' ? ' · simülatör' : m.plaka ? ' · ' + m.plaka : ''}${m.personel ? ' · ' + m.personel : ''}${m.tur && m.tur !== 'normal' ? ' · ' + EGITIM_TURU[m.tur].kisa : ''}` : '';
  const ger = g ? `${gs}${g.arac && arac(g.arac) ? ' · ' + arac(g.arac).plaka : ''}${egitmen(g.egitmen) ? ' · ' + egitmen(g.egitmen).ad : ''}${g.durum ? ' · ' + g.durum.toLocaleLowerCase('tr') : ''}` : '';
  return { baslik: `${ad}${(g || m) ? ' · ' + (gs || ms) : ''}`, etiket, gercek: ger, meb, ne, kisa: x.tur.includes('tarih') || x.tur.includes('saat') ? `MEBBİS: ${ms}` : etiket[0] };
}

// SKT04002 okuması (DIR-026): kurum programı, kapsam okunan tarih aralığı. DIR-053 için aynı gün ardışık derslerin aynı öğretmen/araç oranı.
export function programIsle(v) {
  const l = satirlariOku(v), e = adEsle(l), bas = v.bas || l.map(x => x.tarih).sort()[0] || gun(0), son = v.son || l.map(x => x.tarih).sort().pop() || gun(0);
  const sonuc = karsilastir(l, { bas, son }), g = guncelle(sonuc, { bas, son, kaynak: 'skt04002' });
  // ardışık dersler: aynı aday, aynı gün, saat farkı 1
  const gr = new Map(); l.forEach(x => { const a = nrm(x.ad) + '|' + x.tarih; if (!gr.has(a)) gr.set(a, []); gr.get(a).push(x); });
  let cift = 0, ayniUsta = 0, ayniArac = 0;
  gr.forEach(y => { y.sort((a, b) => a.saat.localeCompare(b.saat)); for (let i = 1; i < y.length; i++) { const p = y[i - 1], q = y[i]; if (+q.saat.slice(0, 2) - +p.saat.slice(0, 2) !== 1) continue; cift++; if ((p.izinNo || nrm(p.personel)) === (q.izinNo || nrm(q.personel))) ayniUsta++; if (plakaN(p.plaka) === plakaN(q.plaka)) ayniArac++; } });
  S.mebAnaliz = { ...(S.mebAnaliz || {}), ardisik: { cift, ayniUsta, ayniArac, bas, son, okuma: gun(0) }, program: { satir: l.length, bas, son, okuma: gun(0) } };
  if (l.length) islem('MEBBİS’ten direksiyon programını aldı', `${l.length} ders · ${trT(bas)}–${trT(son)}${g.acik ? ' · ' + g.acik + ' uyumsuzluk' : ''}`);
  return { satir: l.length, eslesmeyen: e.yok, belirsiz: e.belirsiz, uyumsuz: g.acik, bas, son };
}
// SKT02009 aday dosyası (DIR-027): adayın MEBBİS'teki ders listesi; bu kayıttan (kayıt tarihinden) sonraki dersler sayılır ve karşılaştırılır
export function dosyaDersleri(k, tablo) {
  if (!k || !tablo) return null;
  const l = satirlariOku(tablo).filter(x => !k.kayit || x.tarih >= String(k.kayit).slice(0, 10)); l.forEach(x => { x.kursiyer = k.id; });
  const yap = l.filter(x => x.tarih <= gun(0)).length, tl = l.map(x => x.tarih).sort(), say = f => l.filter(f).length;
  // MEB-017: MEBBİS'teki bu dönemin dersleri kompakt saklanır [tarih, saat, tür, yer, plaka/seri, personel]; tür N/B/2/T, yer S/A/(boş = akan trafik)
  const TUR = { normal: 'N', basarisiz: 'B', ikinci: '2', onSinav: 'T' }, YER = { simulator: 'S', alan: 'A', trafik: '' };
  const dersler = l.map(x => [x.tarih, x.saat, TUR[x.tur] || '', YER[x.yer] ?? '', String(x.plaka || '').replace(/\s/g, ''), x.personel || '']);
  const dersOzet = { sayi: l.length, toplam: l.length, yapilmis: yap, ileri: l.length - yap, simulator: say(x => x.yer === 'simulator'), alan: say(x => x.yer === 'alan'), trafik: say(x => x.yer === 'trafik'),
    gece: say(x => { try { return geceDersMi({ tarih: x.tarih, saat: x.saat }); } catch (h) { return false; } }), normal: say(x => x.tur === 'normal'), basarisiz: say(x => x.tur === 'basarisiz'), ikinciDir: say(x => x.tur === 'ikinci'), onSinav: say(x => x.tur === 'onSinav'),
    ilk: tl[0] || '', son: tl[tl.length - 1] || '', okuma: gun(0), okundu: gun(0) };
  const eski = k.meb || {}, ayni = JSON.stringify(eski.dersler || []) === JSON.stringify(dersler);   // veri değişmediyse dizi yeniden yazılmaz
  k.meb = { ...eski, dersler: ayni ? eski.dersler : dersler, dersOzet };
  if (!l.length) return k.meb.dersOzet;
  const bas = String(k.kayit || l[0].tarih).slice(0, 10), son = l.map(x => x.tarih).sort().pop() > gun(60) ? l.map(x => x.tarih).sort().pop() : gun(60);
  guncelle(karsilastir(l, { bas, son, kursiyerler: new Set([k.id]) }), { bas, son, kursiyerler: new Set([k.id]), kaynak: 'skt02009' });
  return k.meb.dersOzet;
}
