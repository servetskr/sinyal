// MEB-193: MEB işlemleri ekranı sekreterin diliyle — sekmeler ve tek "Başla" yerine iş kartları.
// Her kart tek bir işi yapar ("Yeni öğrenci kayıtlarını MEBBİS’e aktar"); karta basınca o işin öğrenci listesi açılır, seçilenler yalnız o işle gönderilir.
// Aktarım, doğrulama ve elle giriş mevcut kodla yapılır: iş listesi mebmerkez/eklenti/mebtoplu (butunIsler), yazma MT.yaz, elle giriş MT.elleGir ve
// sayfalar3'teki sıralı giriş ekranları, engel ve eksikler MT.hazirla + MT.kuralDenetimi. Bu dosya yalnız gösterir ve bunları çağırır.
// DIG-057: ekranın alt menüsü (altmenu.js) buradan kurulur.
import { S, oturum, fark, gun, sb, kursiyer, tamAd, seciliSube, cokSube, eksikEvrak, egitmen, arac, islem, kaydet, selam, kursAdi, mebKurum, programAcik, SINIFLAR } from './veri.js?v=235';
import { e, ik, tarih, bildir, isaret, rozet, waSirali, csvIndir } from './ui.js?v=235';
import { yenile } from './app.js?v=235';
import * as MB from './mebmerkez.js?v=235';
import * as MT from './mebtoplu.js?v=235';
import * as EK from './eklenti.js?v=235';
import * as MK from './mebkayit.js?v=235';
import * as MX from './mebekran.js?v=235';
import * as GR from './gruplar.js?v=235';
import * as KR from './kurallar.js?v=235';
import * as UY from './mebuyum.js?v=235';
import * as AM from './altmenu.js?v=235';
import { onkosulSeridi } from './onkosul.js?v=235';
import { kisiListe, mudurMu } from './sayfalar1.js?v=235';
import { denetimEksikleri } from './sayfalar3.js?v=235';
import { mebKurallari } from './sayfalar2.js?v=235';

/* ---------- işler ---------- */
// k: kartın adresi (#/meb/<k>); turler: butunIsler'deki iş türleri. 'evrak' kartı MEBBİS işi değil, kayıttan önce öğrenciden alınacak belgeler.
const IS = [
  { k: 'kayit', turler: ['kayit', 'evrak'], ad: 'Yeni öğrenci kayıtlarını MEBBİS’e aktar', kisa: 'Öğrenci kaydı', ik: 'kursiyer', dg: 'Aktar', birim: 'öğrenci' },
  { k: 'teorik', turler: ['teorik'], ad: 'Teorik ders programını MEBBİS’e gönder', kisa: 'Teorik ders programı', ik: 'teorik', dg: 'Gönder', birim: 'ders' },
  { k: 'program', turler: ['program'], ad: 'Direksiyon programını MEBBİS’e gönder', kisa: 'Direksiyon programı', ik: 'direksiyon', dg: 'Gönder', birim: 'ders' },
  { k: 'esinav', turler: ['esinav'], ad: 'e-Sınav başvurusu yap', kisa: 'e-Sınav başvurusu', ik: 'sinav', dg: 'Başvur', birim: 'öğrenci' },
  { k: 'sinav', turler: ['sinav'], ad: 'Uygulama sınavı randevusu al', kisa: 'Sınav randevusu', ik: 'takvim', dg: 'Randevu al', birim: 'öğrenci' },
  { k: 'evrak', turler: [], ad: 'Eksik evrakları tamamla', kisa: 'Eksik evrak', ik: 'belge', dg: 'Hatırlat', birim: 'öğrenci' },
  { k: 'onay', turler: ['onay'], ad: 'Kurum onayı ver', kisa: 'Kurum onayı', ek: 'yalnız müdür', ik: 'tik', dg: 'Onayla', birim: 'öğrenci' },
  { k: 'fatura', turler: ['fatura'], ad: 'Faturaları MEBBİS’e gir', kisa: 'Fatura kaydı', ik: 'kasa', dg: 'Gönder', birim: 'fatura', yalnizVarsa: true },
];
const IS_K = IS.map(x => x.k);
const ESKI = { aktarim: '', asistan: '' };   // eski sekme adresleri ana ekrana
export const sayfaMi = alt => !alt || alt in ESKI || IS_K.includes(alt) || ['tablo', 'diger'].includes(alt);

const subeSorun = () => cokSube() && !seciliSube();
const eksikOgrenciler = () => sb(S.kursiyerler).filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet');   // eski 'Evrak kontrolü' sekmesiyle aynı tanım
const enYakin = l => l.map(x => x.son).filter(Boolean).sort()[0] || '';
const secilebilir = (c, x) => !x.bitti && !(c.k === 'esinav' && x.meta && x.meta.ucretYok) && !(c.k === 'onay' && !mudurMu());

// bütün kartlar tek hesapta (aynı çizimde yeniden hesaplanmaz)
function kartlar() {
  const hepsi = MB.butunIsler(true);
  return IS.map(t => {
    if (t.k === 'evrak') { const l = eksikOgrenciler(); return { ...t, hepsi: [], l: [], ogr: l, n: l.length, son: '' }; }
    const tum = hepsi.filter(x => t.turler.includes(x.tur)), l = tum.filter(x => !x.bitti);
    return { ...t, hepsi: tum, l, n: l.length, son: enYakin(l), grup: t.k === 'kayit' ? hepsi.filter(x => x.tur === 'grup' && !x.bitti) : [] };
  }).filter(c => !c.yalnizVarsa || c.hepsi.length);
}
// Kenar menüsündeki sayı ve ekranın başlığı aynı şeyi sayar: bekleyen işi olan kart sayısı
export function bekleyenIsSayisi() { try { return kartlar().filter(c => c.n).length; } catch (x) { return 0; } }

/* ---------- küçük parçalar ---------- */
const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const zamanMetni = z => z ? `${+z.slice(8, 10)} ${AY[+z.slice(5, 7) - 1]} ${z.slice(11, 16)}` : '';
function sure(son) {
  if (!son) return null; const k = fark(son);
  return k < 0 ? { t: `Süresi geçti · ${tarih(son)}`, c: 'gecti' } : k === 0 ? { t: 'Bugün son gün', c: 'gecti' } : k === 1 ? { t: 'Yarın son gün', c: 'yakin' } : k <= 3 ? { t: `${k} gün kaldı · ${tarih(son)}`, c: 'yakin' } : { t: `Son gün ${tarih(son)}`, c: '' };
}
const cip = s => s ? `<span class="mi-cip${s.c ? ' mi-' + s.c : ''}">${e(s.t)}</span>` : '';
function altMetin(c) {
  const say = t => c.l.filter(x => x.tur === t).length;
  if (c.k === 'kayit') return [say('kayit') && `${say('kayit')} kayıt`, say('evrak') && `${say('evrak')} evrak bilgisi`].filter(Boolean).join(' · ');
  if (c.k === 'esinav') { const y = c.l.filter(x => x.meta && x.meta.ucretYok).length; return `${c.n} öğrenci${y ? ` · ücreti yatmayan ${y}` : ''}`; }
  if (c.k === 'sinav') { const g = new Set(c.l.map(x => x.meta && x.meta.tarih).filter(Boolean)); return `${c.n} öğrenci${g.size > 1 ? ` · ${g.size} sınav günü` : ''}`; }
  return `${c.n} ${c.birim}`;
}
const dugmeAdi = (c, n) => !EK.eklenti.var && c.k !== 'evrak' ? 'Bilgileri kopyala' : c.dg + (n != null ? ` (${n})` : '');

// eksik bilgi (göndermeyi durdurmaz ama MEBBİS'te seçimi zorlaştırır): öğretmenin çalışma izni no'su, aracın MEB izin no'su
function eksikBilgi(c) {
  const l = [];
  if (c.k === 'program' || c.k === 'sinav') {
    const eg = new Map(), ar = new Map();
    c.l.forEach(x => {
      const r = x.ref || {}, d = r.ders && (S.dersler || []).find(y => y.id === r.ders), k = r.kursiyer && kursiyer(r.kursiyer);
      const o = egitmen(d ? d.egitmen : k && k.egitmen); if (o && (!o.tc || !String(o.calismaIzinNo || o.izinNo || '').replace(/\D/g, ''))) eg.set(o.id, o.ad);
      const a = d && arac(d.arac); if (a && !a.mebIzinNo) ar.set(a.id, a.plaka);
    });
    if (eg.size) l.push({ tur: 'uyari', metin: `${eg.size} öğretmenin TC ya da çalışma izni no’su eksik: ${[...eg.values()].slice(0, 3).join(', ')}${eg.size > 3 ? '…' : ''}`, dg: 'Tamamla', hedef: '#/filo/egitmen' });
    if (ar.size) l.push({ tur: 'uyari', metin: `${ar.size} aracın MEB izin no’su eksik: ${[...ar.values()].slice(0, 3).join(', ')}${ar.size > 3 ? '…' : ''}`, dg: 'Tamamla', hedef: '#/filo/arac' });
  }
  return l;
}
// karta özel bilgi satırları (MEBBİS ile farklar, önce yapılacaklar)
function bilgiSatirlari(c) {
  const l = [], r = (S.mutabakat || {}).sonuc;
  if (c.k === 'kayit') {
    if (c.grup.length) l.push({ tur: 'engel', metin: `Önce ${c.grup.length} dönem grubu MEBBİS’te açılmalı: ${c.grup.slice(0, 3).map(x => (x.meta || {}).ad || '').join(', ')}${c.grup.length > 3 ? '…' : ''}`, dg: EK.eklenti.var ? 'Grupları aç' : 'Bilgileri kopyala', veri: 'data-mi-grup' });
    const bl = GR.mebDurumuBilinmeyenGruplar(); if (bl.length) l.push({ tur: 'uyari', metin: `${bl.length} grubun MEBBİS’te açık olduğu doğrulanmadı`, dg: 'MEBBİS’ten bilgileri çek', veri: 'data-mi-cek' });
    const n = r ? r.yalnizSinyal.length + r.yalnizMeb.length + r.sinif.length : 0;
    if (n) l.push({ tur: 'bilgi', metin: `MEBBİS’te ${n} öğrencinin bilgisi farklı`, dg: 'Farkları gör', hedef: '#/meb/mutabakat' });
  }
  if (c.k === 'program') {
    const sil = new Set((S.mebSilinecek || []).map(x => x.id)).size; if (sil) l.push({ tur: 'uyari', metin: `${sil} ders MEBBİS’ten silinmeli (iptal edildi ya da taşındı)`, dg: 'Gör', hedef: '#/meb/program' });
    const uy = UY.acikUyumsuzlar().length; if (uy) l.push({ tur: 'bilgi', metin: `MEBBİS’te ${uy} dersin kaydı farklı`, dg: 'Farkları gör', hedef: '#/meb/program' });
    if (r && r.ders.length) l.push({ tur: 'bilgi', metin: `MEBBİS’te ${r.ders.length} öğrencinin ders sayısı farklı`, dg: 'Farkları gör', hedef: '#/meb/mutabakat' });
  }
  if (c.k === 'esinav') { const y = c.l.filter(x => x.meta && x.meta.ucretYok).length; if (y) l.push({ tur: 'uyari', metin: `${y} öğrencinin e-sınav ücreti yatmadı; MEBBİS ücret yatmadan başvuru almaz`, dg: 'Hatırlat', hedef: '#/meb/esinav' }); }
  if (c.k === 'onay' && c.n && !mudurMu()) l.push({ tur: 'bilgi', metin: 'Kurum onayını yalnız kurs müdürü verir; onaydan sonra fotoğraf ve bilgiler düzeltilemez.' });
  return l;
}
const satirHtml = (x, i) => `<div class="mi-not mi-${x.tur}">${isaret(x.tur === 'engel' ? 'dur' : x.tur === 'uyari' ? 'uyari' : 'bilgi', 16)}<span>${e(x.metin)}</span>${x.dg ? (x.hedef ? `<a class="mi-bag" href="${e(x.hedef)}">${e(x.dg)} ›</a>` : `<button type="button" class="mi-bag" ${x.veri || ''}>${e(x.dg)} ›</button>`) : ''}</div>`;

/* ---------- engeller: MT.hazirla + kural motoru, arka planda ---------- */
// Döner: { id: [mesaj, …] }. hazirla MEBBİS'e yazmadan önceki denetimin kendisidir; burada yalnız okunur (fotoğraf hazırlanmaz, bir şey gönderilmez).
let engelSoz = null, engelAnahtar = '', engelSon = null;
function engeller(ids) {
  const a = ids.join(',') + '|' + (S.mebDurum ? Object.keys(S.mebDurum).length : 0);
  if (a === engelAnahtar && engelSoz) return engelSoz;
  engelAnahtar = a;
  engelSoz = (async () => {
    const o = {}, ekle = (id, m) => { (o[id] = o[id] || []); if (!o[id].includes(m)) o[id].push(m); };
    try {
      const { l, hata } = await MT.hazirla(ids, { foto: false });
      hata.forEach(([id, m]) => ekle(id, m));
      let kural = {}; try { kural = MT.kuralDenetimi(l); } catch (x) { }
      const adi = Object.fromEntries(KR.kurallar().map(r => [r.id, r.ad]));
      Object.entries(kural).forEach(([id, r]) => (r.engel || []).forEach(b => ekle(id, adi[b.kural] ? `${adi[b.kural]}` : b.metin)));
    } catch (x) { console.warn('MEB engel denetimi', x); }
    engelSon = o; return o;
  })();
  return engelSoz;
}
const kisalt = (m, n = 110) => { const s = String(m).split(/;\s|\.\s(?=[A-ZÇĞİÖŞÜ“])/)[0]; return s.length > n ? s.slice(0, n - 1) + '…' : s; };
// iş ve mesaja göre "Tamamla" nereye gider
function hedefi(x, m = '') {
  const r = x.ref || {}, t = String(m);
  if (/öğretmen|usta öğretici|çalışma izn|personel|yetkili görünmüyor/i.test(t)) return '#/filo/egitmen';
  if (/simülatör|araç yok|araç belg|muayene/i.test(t)) return '#/filo/arac';
  if (/grub|dönem/i.test(t) && !r.kursiyer) return '#/ayarlar/donem';
  if (r.kursiyer) return '#/kursiyer/' + r.kursiyer;
  if (r.ders) { const d = (S.dersler || []).find(y => y.id === r.ders); return d ? '#/kursiyer/' + d.kursiyer : '#/plan'; }
  if (r.teorik) return '#/teorik';
  if (r.grup) return '#/ayarlar/donem';
  if (r.sinav) return '#/sinavlar';
  if (r.fatura) { const f = (S.faturalar || []).find(y => y.no === r.fatura); return f ? '#/kursiyer/' + f.kursiyer : '#/kasa'; }
  return '';
}
// bir kartın engellerini mesaja göre toplar: [{ metin, ids, hedef }]
function engelGruplari(c, o) {
  const g = new Map();
  c.l.forEach(x => (o[x.id] || []).forEach(m => { const k = kisalt(m); const v = g.get(k) || { metin: k, l: [] }; v.l.push(x); g.set(k, v); }));
  return [...g.values()].map(v => { const h = [...new Set(v.l.map(x => hedefi(x, v.metin)))]; return { tur: 'engel', metin: `${v.l.length} ${c.birim}: ${v.metin}`, dg: 'Tamamla', hedef: h.length === 1 && h[0] ? h[0] : `#/meb/${c.k}`, sorunlu: !(h.length === 1 && h[0]) }; });
}
// çizimden sonra engeller gelince kartlara yazılır (sayfa yeniden çizilmez)
function engelleriYaz(kap, cl) {
  const ids = cl.flatMap(c => c.l.map(x => x.id)); if (!ids.length) return;
  engeller(ids).then(o => {
    if (!kap.isConnected) return;
    cl.forEach(c => {
      const yer = kap.querySelector(`[data-mi-engel="${c.k}"]`); if (!yer) return;
      const gr = engelGruplari(c, o); yer.innerHTML = gr.map(x => satirHtml(x)).join('');
      yer.querySelectorAll('a.mi-bag').forEach((a, i) => { if (gr[i] && gr[i].sorunlu) a.dataset.miSorunlu = c.k; });
      kap.querySelectorAll(`[data-mi-sat-engel]`).forEach(s => { const m = o[s.dataset.miSatEngel]; if (!m || !m.length) return; const x = c.l.find(y => y.id === s.dataset.miSatEngel); if (!x) return; const h = hedefi(x, m[0]); s.innerHTML = `${isaret('dur', 14)}<span>${e(kisalt(m[0], 140))}</span>${h ? `<a class="mi-bag" href="${e(h)}">Düzelt ›</a>` : ''}`; s.hidden = false; });
    });
  });
}

/* ---------- üst durum satırı ---------- */
const saat = t => new Date(t).toTimeString().slice(0, 5);
function durumSatiri() {
  const E = EK.eklenti, o = E.oturum, yas = o ? Date.now() - o.zaman : Infinity;
  const p = [], nokta = c => `<i class="mi-nokta mi-n-${c}"></i>`; let eylem = '';
  if (!E.var) { p.push(`${nokta('kirmizi')}Yardımcı bu tarayıcıda kurulu değil`); eylem = '<button type="button" class="mi-bag" data-mi-kur>Yardımcı’yı kur ›</button>'; }
  else if (!MT.surumEnAz(MT.ONERILEN_SURUM, E.surum)) { p.push(`${nokta('sari')}Yardımcı ${e(E.surum || '')} eski`); eylem = '<button type="button" class="mi-bag" data-mi-kur>Güncelle ›</button>'; }
  else p.push(`${nokta('yesil')}Yardımcı hazır`);
  if (E.var) {
    if (!o || !o.acik) { p.push(`${nokta(o ? 'kirmizi' : 'gri')}${o ? 'MEBBİS oturumu kapandı' : 'MEBBİS’e girilmedi'}`); if (!eylem) eylem = '<a class="mi-bag" href="https://mebbis.meb.gov.tr" target="_blank" rel="noopener">MEBBİS’e girin ›</a>'; }
    else p.push(`${nokta(yas > 6 * 60e3 ? 'sari' : 'yesil')}MEBBİS ${yas > 6 * 60e3 ? 'oturumu son görülme ' + saat(o.zaman) : 'açık'}`);
  }
  if (MT.suruyor()) p.push(`${nokta('mavi')}Yardımcı çalışıyor: ${e(MT.durum.adim || 'başlıyor')}`);
  const z = (S.mebCekim || {}).toplu; p.push(`<span class="mi-soluk">${z ? 'Bilgiler ' + e(zamanMetni(z)) + ' çekildi' : 'MEBBİS’ten bilgi çekilmedi'}</span>`);
  const sube = cokSube() ? `<span class="mi-sube" role="group" aria-label="MEBBİS kurumu (şube)">${S.subeler.map(x => `<button type="button" data-mi-sube="${e(x.id)}" aria-pressed="${seciliSube() && seciliSube().id === x.id}">${e(x.ad)}</button>`).join('')}</span>` : '';
  return `<div class="mi-durum">${p.map(x => `<span>${x}</span>`).join('')}${eylem}${sube ? `<span class="mi-durum-sag">${subeSorun() ? '<span class="mi-uyari-metin">Şube seçin:</span>' : ''}${sube}</span>` : ''}</div>`;
}

/* ---------- ana ekran ---------- */
let sonAdres = '';
function anaEkran(cl) {
  { const n = GR.mebGrupGoc(); if (n) { islem('Dönem gruplarını MEBBİS’te var saydı', n + ' grup (öğrencisi MEBBİS’e kayıtlı)'); kaydet(); } }   // DENETİM Ö5 göç (eski aktarım ekranından)
  EK.bekleyenleriIsle();
  const bekleyen = cl.filter(c => c.n), biten = cl.filter(c => !c.n), gecen = bekleyen.filter(c => c.son && fark(c.son) < 0).length, bugun = bekleyen.filter(c => c.son && fark(c.son) === 0).length;
  const sirali = [...bekleyen].sort((a, b) => (a.son || '9999').localeCompare(b.son || '9999'));
  const yazilacak = cl.filter(c => c.k !== 'onay' && c.k !== 'evrak').flatMap(c => c.l.filter(x => secilebilir(c, x)).map(x => x.id));
  const kartHtml = c => { const s = sure(c.son), bl = [...bilgiSatirlari(c), ...eksikBilgi(c)], sec = c.k === 'evrak' ? c.n : c.l.filter(x => secilebilir(c, x)).length;
    const kapali = c.k !== 'evrak' && (subeSorun() || !sec);
    return `<article class="mi-kart" data-mi-kart="${c.k}" data-mi-ac="${c.k}" tabindex="0" aria-label="${e(c.ad)}: ${e(altMetin(c))}">
      <span class="mi-ik">${ik(c.ik)}</span>
      <h3 class="mi-kg">${e(c.ad)}${c.ek ? ` <small>(${e(c.ek)})</small>` : ''}</h3><p class="mi-kp"><b>${e(altMetin(c))}</b>${cip(s)}</p>
      <button type="button" class="dg ${s && s.c === 'gecti' ? 'dg-ana' : 'dg-cizgi'} dg-kucuk mi-yap" data-mi-yap="${c.k}" ${kapali ? 'disabled' : ''}${c.k === 'onay' && !mudurMu() ? ' title="Yalnız kurs müdürü"' : ''}>${e(dugmeAdi(c))}</button>
      <div class="mi-satirlar">${bl.map(satirHtml).join('')}<div data-mi-engel="${c.k}"></div></div>
      <span class="mi-ok" aria-hidden="true">›</span></article>`; };
  const bitenHtml = biten.length ? `<h2 class="mi-bolum">Bekleyeni olmayanlar</h2><div class="mi-grup">${biten.map(c => `<a class="mi-sat" href="#/meb/${c.k}" data-mi-kart="${c.k}"><span class="mi-ik mi-ik-tamam">${ik('tik')}</span><span class="mi-sat-ad"><b>${e(c.kisa)}</b><small>${c.k === 'evrak' ? 'Bütün öğrencilerin evrakı tamam' : c.hepsi.length ? 'Hepsi MEBBİS’te' : 'Şu an iş yok'}</small></span><span class="mi-ok">›</span></a>`).join('')}</div>` : '';
  const eks = denetimEksikleri(), kur = mebKurallari(), r = (S.mutabakat || {}).sonuc, mfark = r ? r.yalnizSinyal.length + r.yalnizMeb.length + r.sinif.length + r.ders.length : 0;
  const bag = (h, ad, alt, sag = '', veri = '') => h ? `<a class="mi-sat" href="${h}"><span class="mi-sat-ad"><b>${ad}</b>${alt ? `<small>${alt}</small>` : ''}</span>${sag ? `<span class="mi-sat-sag">${sag}</span>` : ''}<span class="mi-ok">›</span></a>`
    : `<button type="button" class="mi-sat" ${veri}><span class="mi-sat-ad"><b>${ad}</b>${alt ? `<small>${alt}</small>` : ''}</span>${sag ? `<span class="mi-sat-sag">${sag}</span>` : ''}<span class="mi-ok">›</span></button>`;
  const E = EK.eklenti, kapali = subeSorun() ? 'disabled' : '';
  const mk = mebKurum();
  const kontrol = `<h2 class="mi-bolum">Kontrol ve diğer işler</h2><div class="mi-grup">
    ${bag('#/meb/denetim', 'MEB denetimine hazır mıyız?', 'Denetimde bakılan eksikler, denetim modu ve dosyası', eks.length ? `${eks.length} eksik` : 'Hazır')}
    ${bag('#/meb/kontrol', 'Plan kurallara uygun mu?', 'Yönetmeliğe aykırı ders, sınav ve süreler', kur.length ? `${kur.length} uyarı` : 'Uygun')}
    ${bag('#/meb/mutabakat', 'MEBBİS’teki listeyle karşılaştır', 'Kimin bilgisi farklı, kim bir tarafta yok', mfark ? `${mfark} fark` : '')}
    ${bag('#/meb/tablo', 'Kim hangi adımda?', 'Öğrenci × adım tablosu: kayıt, evrak, onay')}
    ${bag('', 'Kurulum bilgilerini MEBBİS’ten al', 'Kurum, dönem grupları, personel, araçlar, ücret ilanı, banka hesabı', '', `data-mm-kurulum ${kapali}`)}
    ${bag('#/meb/diger', 'Tek bir listeyi MEBBİS’ten al', 'Açık MEBBİS ekranından: sınav sonuçları, personel, araçlar')}
    ${E.var ? bag('', 'Yardımcı MEBBİS ekranlarını tanıyor mu?', 'Ekranları denetle · yalnız okunur', '', `data-mt-denetle ${kapali}`) : ''}
    ${E.var ? `<label class="mi-sat mi-sat-anahtar"><span class="mi-sat-ad"><b>Yardımcı çalışırken izle</b><small>MEBBİS sekmesi öne gelir; doldurduğu her formu görürsünüz</small></span><input type="checkbox" role="switch" data-mm-izle ${MT.izleAcik() ? 'checked' : ''}></label>` : ''}
    ${bag('#/meb/duyuru', 'Mevzuat ve duyurular', 'Yönetmelik ve MEB yazılarındaki değişiklikler')}
    ${mudurMu() && E.var ? bag('', 'Aday dönem kaydını sil', 'Yalnız müdür · tek aday · geri alınamaz', '', `data-mm-donemsil ${kapali}`) : ''}
  </div>${mk ? `<p class="mi-dip">MEBBİS kurum bilgisi: bina kontenjanı ${e(String(mk.binaKontenjan || '—'))} · açık programlar ${e((mk.programlar || []).filter(p => programAcik(mk, p.kod)).map(p => p.kod).join(', ') || '—')} · ${(mk.derslikler || []).length} derslik · ${e(String(mk.okundu || '').split('-').reverse().join('.'))} okundu</p>` : ''}`;
  const farkG = (S.gruplar || []).filter(g => g.mebBaslangic && g.mebBaslangic !== g.baslangic).length;
  const ust = [MK.alarmKarti(), MT.isKarti(), MT.ibanKarti(), onkosulSeridi('MEBBİS’e yazma'), farkG ? `<p class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 18)}<span><b>${farkG} dönem grubunun başlangıcı MEBBİS’tekinden farklı.</b> MEBBİS’teki tarih esastır; <a href="#/ayarlar/donem" style="color:inherit;font-weight:800">Dönem ve gruplar</a>’da düzeltin.</span></p>` : ''].join('');
  const gir = sonAdres !== '#/meb' ? ' mi-gir' : ''; sonAdres = '#/meb';
  return `<div class="mi${gir}">${durumSatiri()}${ust}
    <div class="mi-bas"><div><h2>${bekleyen.length ? `${bekleyen.length} iş bekliyor` : 'Bekleyen iş yok'}</h2><p>${bekleyen.length ? [gecen && `${gecen} işin süresi geçti`, bugun && `${bugun} işin son günü bugün`].filter(Boolean).join(' · ') || 'Süresi geçen yok' : 'Bütün kayıtlar, dersler ve randevular MEBBİS’te.'}${bekleyen.length ? ' · Karta basınca öğrenci listesi açılır' : ''}</p></div>
      ${E.var && yazilacak.length ? `<button type="button" class="dg dg-cizgi mi-hepsi" data-mm-hepsini ${kapali} title="Kurum onayı dışındaki bütün işler tek onay penceresinde; Yardımcı MEBBİS’e sırayla yazar">Hepsini sırayla yap</button>` : ''}</div>
    ${sirali.length ? `<div class="mi-izgara">${sirali.map(kartHtml).join('')}</div>` : ''}
    ${bitenHtml}${kontrol}</div>`;
}

/* ---------- iş ekranı (öğrenci listesi) ---------- */
const sec = { k: '', set: new Set(), suz: 'bekleyen', ilk: false };
function secimHazirla(c, sorunluIste) {
  if (sec.k !== c.k) { sec.k = c.k; sec.set = new Set(); sec.suz = 'bekleyen'; sec.ilk = true; }
  if (sorunluIste) sec.suz = 'sorunlu';
  // ilk açılışta seçilebilenlerin hepsi seçili gelir (karttaki düğme de hepsini yapar); onay penceresi yine her şeyi gösterir
  if (sec.ilk) { c.l.filter(x => secilebilir(c, x)).forEach(x => sec.set.add(x.id)); sec.ilk = false; }
  [...sec.set].forEach(id => { if (!c.l.some(x => x.id === id && secilebilir(c, x))) sec.set.delete(id); });
}
const ADIM = { kayit: 'Kayıt', evrak: 'Evrak bilgisi' };
function liste(c) {
  const durumlu = c.hepsi.map(x => ({ x, d: MB.durumu(x) }));
  const say = { bekleyen: c.l.length, hata: durumlu.filter(y => !y.x.bitti && ['Hata', 'Ekran değişti'].includes(y.d[0])).length, sorunlu: engelSon ? c.l.filter(x => (engelSon[x.id] || []).length).length : 0, bitti: c.hepsi.length - c.l.length };
  if (sec.suz === 'sorunlu' && !engelSon) sec.suz = 'bekleyen';
  const l = durumlu.filter(({ x, d }) => sec.suz === 'bitti' ? x.bitti : sec.suz === 'hata' ? !x.bitti && ['Hata', 'Ekran değişti'].includes(d[0]) : sec.suz === 'sorunlu' ? (engelSon[x.id] || []).length : !x.bitti)
    .sort((a, b) => (secilebilir(c, a.x) ? 0 : 1) - (secilebilir(c, b.x) ? 0 : 1) || (a.x.son || '9999').localeCompare(b.x.son || '9999') || String((a.x.meta || {}).tarih).localeCompare(String((b.x.meta || {}).tarih)));
  const suz = [['bekleyen', 'Bekleyenler'], ['sorunlu', 'Eksiği olanlar'], ['hata', 'Hata verenler'], ['bitti', 'MEBBİS’te']].filter(([k]) => k === 'bekleyen' || say[k]);
  const segilebilen = c.l.filter(x => secilebilir(c, x)), hepsiSecili = segilebilen.length && segilebilen.every(x => sec.set.has(x.id));
  const satir = ({ x, d }) => { const s = !x.bitti && sure(x.son), ok = secilebilir(c, x), m = x.meta || {};
    const not = c.k === 'esinav' && m.ucretYok && !x.bitti ? `<span class="mi-sat-not mi-uyari-metin">Ücret yatmadı · MEBBİS başvuruyu almaz <button type="button" class="mi-bag" data-mm-esucret="${e(m.kid)}">WhatsApp’tan hatırlat ›</button></span>` : '';
    return `<li class="mi-ogr${ok ? '' : ' mi-kilitli'}" data-mi-satir="${e(x.id)}"><label class="mi-ogr-sec"><input type="checkbox" data-mi-sec="${e(x.id)}" ${sec.set.has(x.id) ? 'checked' : ''} ${ok ? '' : 'disabled'} aria-label="${e(m.ad || x.baslik)} seç"></label>
      <div class="mi-ogr-ad"><b>${e(m.ad || x.baslik)}${x.tur === 'evrak' ? ` <span class="mi-adim">${ADIM[x.tur]}</span>` : ''}</b><small>${e(m.detay || '')}</small>${not}<span class="mi-sat-not mi-engel-metin" data-mi-sat-engel="${e(x.id)}" hidden></span>${d[2] && d[0] !== 'Bekliyor' ? `<span class="mi-sat-not">${e(d[2])}</span>` : ''}${d[3] ? `<span class="mi-sat-not mi-soluk">${e(d[3])}</span>` : ''}</div>
      <div class="mi-ogr-sag">${cip(s)}${d[0] !== 'Bekliyor' ? rozet(d[0], d[1]) : ''}</div></li>`; };
  const n = sec.set.size, kap = subeSorun() || !n;
  const birincil = EK.eklenti.var ? `<button type="button" class="dg dg-ana" data-mi-aktar ${kap ? 'disabled' : ''}>${ik('ok')}${e(c.k === 'onay' ? 'Onayla' : c.k === 'esinav' ? 'Başvuruyu gönder' : c.k === 'sinav' ? 'Randevuyu al' : 'MEBBİS’e aktar')}<span data-mi-n>${n ? ` (${n})` : ''}</span></button>` : '';
  const kopya = `<button type="button" class="dg ${EK.eklenti.var ? 'dg-cizgi' : 'dg-ana'}" data-mi-kopyala ${kap ? 'disabled' : ''} title="Değerleri MEBBİS’teki sırasıyla tek dokunuşla kopyalatır; siz yapıştırıp kaydedersiniz">Bilgileri kopyala${EK.eklenti.var ? '' : `<span data-mi-n>${n ? ` (${n})` : ''}</span>`}</button>`;
  return `<div class="mi-liste">
    ${(segilebilen.length && sec.suz === 'bekleyen') || suz.length > 1 ? `<div class="mi-liste-bas">${segilebilen.length && sec.suz === 'bekleyen' ? `<label class="mi-hepsini"><input type="checkbox" data-mi-hepsi ${hepsiSecili ? 'checked' : ''}> Hepsini seç</label>` : '<span></span>'}
      ${suz.length > 1 ? `<div class="mi-seg" role="tablist" aria-label="Liste">${suz.map(([k, a]) => `<button type="button" role="tab" aria-selected="${sec.suz === k}" data-mi-suz="${k}">${a}<small>${say[k]}</small></button>`).join('')}</div>` : ''}</div>` : ''}
    ${l.length ? `<ul>${l.slice(0, 300).map(satir).join('')}</ul>${l.length > 300 ? `<p class="mi-dip">İlk 300 satır gösteriliyor.</p>` : ''}` : `<div class="mi-bos">${isaret('tamam', 30)}<b>${sec.suz === 'bitti' ? 'MEBBİS’e aktarılmış kayıt yok' : 'Bekleyen yok'}</b><small>${sec.suz === 'bitti' ? 'Aktarılanlar burada görünür.' : 'Bu işte MEBBİS’e girilmemiş kayıt kalmadı.'}</small></div>`}
    ${c.l.length ? `<div class="mi-eylem"><span class="mi-eylem-say" data-mi-say>${subeSorun() ? 'Önce üstten şube seçin' : n ? `<b>${n}</b> seçili` : 'Seçili yok'}</span>${kopya}${birincil}</div>
    <p class="mi-dip">${EK.eklenti.var ? '“MEBBİS’e aktar” önce gidecekleri gösterir; onaylayınca Yardımcı yalnız bu işi MEBBİS’e yazar ve geri okuyup doğrular. Güvenlik kodunu siz yazarsınız.' : 'Yardımcı kurulu değil: “Bilgileri kopyala” değerleri MEBBİS’teki sırasıyla hazırlar, siz yapıştırıp kaydedersiniz. <button type="button" class="mi-bag" data-mi-kur>Yardımcı’yı kurun, MEBBİS’e kendisi yazsın ›</button>'}${EK.eklenti.var && ['kayit', 'program', 'sinav'].includes(c.k) ? ' <button type="button" class="mi-bag" data-mi-ekranda>Yazamazsa: formu MEBBİS’te açtırın ›</button>' : ''}</p>` : ''}
  </div>`;
}
function evrakListe(c) {
  return `<div class="mi-liste">${c.ogr.length ? `<ul>${c.ogr.map(k => `<li class="mi-ogr"><span class="mi-ik mi-ik-kucuk">${ik('belge')}</span><div class="mi-ogr-ad"><b>${e(tamAd(k))}</b><small>Eksik: ${e(eksikEvrak(k).map(z => z[1]).join(', '))}</small></div><div class="mi-ogr-sag"><a class="mi-bag" href="#/kursiyer/${e(k.id)}">Dosyayı aç ›</a></div></li>`).join('')}</ul>
    <div class="mi-eylem"><span class="mi-eylem-say"><b>${c.n}</b> öğrenci</span><button type="button" class="dg dg-wp" data-mi-hatirlat>${ik('wp')}Hepsine WhatsApp’tan hatırlat</button></div>
    <p class="mi-dip">Evrakı tamamlanmayan öğrenci MEBBİS’e kaydedilemez. Öğrencinin gönderdiği fotoğraflar öğrenci dosyasında saklanır.</p>`
    : `<div class="mi-bos">${isaret('tamam', 30)}<b>Eksik evrak yok</b><small>Bütün öğrencilerin evrakı tamam.</small></div>`}</div>`;
}
// işe özel ek bölümler (eski aktarım ekranındakiler)
function ekBolum(c) {
  if (c.k === 'esinav') {
    const mz = [].concat(S.mebEsinavMerkez || (S.kurs.esinavMerkez ? [S.kurs.esinavMerkez] : [])).filter(Boolean), on = MT.enErkenMerkez();
    return `<div class="mi-ayar"><label for="mi-esgun">Gün tercihi</label><select id="mi-esgun" class="girdi" data-mm-esgun>${[['0', 'En erken tarih'], ['1', 'Hafta içi'], ['2', 'Hafta sonu']].map(([v, t]) => `<option value="${v}" ${String(S.kurs.esinavGun || '0') === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      ${EK.eklenti.var ? `<button type="button" class="mi-bag" data-mm-merkez ${subeSorun() ? 'disabled' : ''}>Merkezlerin boş yerini MEBBİS’ten oku ›</button>` : ''}<button type="button" class="mi-bag" data-mi-csv>Excel listesi ›</button></div>
      ${mz.length ? `<div class="mi-merkez">${mz.map(z => `<span${on && z.kod === on.kod ? ' class="mi-merkez-on"' : ''}><b>${e(z.ad || 'e-Sınav merkezi')}</b>${z.kontenjan != null ? ` · boş yer ${e(String(z.kontenjan))}` : ''}${z.enErken ? ` · en erken ${tarih(z.enErken)}` : ''}${on && z.kod === on.kod ? ' · önerilen' : ''}</span>`).join('')}</div>` : ''}`;
  }
  if (c.k === 'sinav') return MT.randevuUygunKarti();
  if (c.k === 'program') {
    const sil = [...new Map((S.mebSilinecek || []).map(x => [x.id, x])).values()];
    return (sil.length ? `<h2 class="mi-bolum">MEBBİS’ten silinecek dersler</h2><div class="mi-grup">${sil.map(x => { const kk = kursiyer(x.kursiyer); return `<div class="mi-sat"><span class="mi-sat-ad"><b>${e(kk ? tamAd(kk) : 'Silinmiş öğrenci')}</b><small>${tarih(x.tarih)} ${e(x.saat)} · ${e((egitmen(x.egitmen) || {}).ad || '')}</small></span><button type="button" class="dg dg-cizgi dg-kucuk" data-meb-sildim="${e(x.id)}">MEBBİS’ten sildim</button></div>`; }).join('')}</div>` : '') + MB.uyumsuzKarti();
  }
  return '';
}
function isEkrani(c, cl) {
  const gir = sonAdres !== '#/meb/' + c.k ? ' mi-gir' : ''; sonAdres = '#/meb/' + c.k;
  const s = sure(c.son), bl = [...bilgiSatirlari(c), ...eksikBilgi(c)].filter(x => x.hedef !== '#/meb/' + c.k);
  return `<div class="mi mi-is${gir}">${durumSatiri()}${MT.isKarti()}
    <a class="mi-geri" href="#/meb">‹ MEB işlemleri</a>
    <div class="mi-bas"><div><h2>${e(c.ad)}</h2><p><b>${!c.n ? 'Bekleyen yok' : c.k === 'kayit' ? e(altMetin(c)) + ' bekliyor' : `${c.n} ${c.birim} bekliyor`}</b>${cip(s)}${c.ek ? ` · ${e(c.ek)}` : ''}</p></div></div>
    <div class="mi-satirlar mi-satirlar-ust">${bl.map(satirHtml).join('')}<div data-mi-engel="${c.k}"></div></div>
    ${ekBolum(c)}${c.k === 'evrak' ? evrakListe(c) : liste(c)}</div>`;
}

/* ---------- ek ekranlar: öğrenci × adım, tek liste ---------- */
let tabloDonem = '';
const geriHtml = (baslik, alt) => `<a class="mi-geri" href="#/meb">‹ MEB işlemleri</a><div class="mi-bas"><div><h2>${baslik}</h2>${alt ? `<p>${alt}</p>` : ''}</div></div>`;
export const geriBag = () => `<a class="mi-geri" href="#/meb">‹ MEB işlemleri</a>`;
function tabloEkrani() { sonAdres = '#/meb/tablo'; return `<div class="mi">${geriHtml('Kim hangi adımda?', 'MEBBİS’in giriş sırasıyla: dönem grubu, kayıt, evrak, onay. Kutunun üstüne gelince eksik yazılır.')}<div class="kart">${MX.matrisHtml(tabloDonem)}</div></div>`; }
const CEK = [['sinav', 'Sınav sonuçları', 'e-Sınav ve direksiyon sonuçları sonuç penceresine dolar; siz kaydedersiniz.'], ['mutabakat', 'MEBBİS ile karşılaştır', 'MEBBİS’teki öğrenci listesi mdSinyal’le karşılaştırılır.'], ['kursiyer', 'Öğrenci listesi', 'İlk geçiş için: açık listeyi Veri aktarımı ekranına getirir.'], ['ogretmen', 'Usta öğreticiler', 'Personel listesini alır.'], ['arac', 'Araçlar', 'Araç listesini plakalarıyla alır.'], ['grup', 'Dönem grupları', 'Dönem, grup ve şubeler grup kartı olarak gelir.']];
function digerEkrani() {
  sonAdres = '#/meb/diger';
  return `<div class="mi">${geriHtml('MEBBİS’ten liste al', 'Yardımcı MEBBİS sekmesine geçer, listeyi açar ve buraya getirir. mdSinyal onayınız olmadan bir şey kaydetmez.')}${MT.topluKart(subeSorun())}
    <div class="mi-grup">${CEK.map(([k, ad, a]) => { const z = (S.mebCekim || {})[k]; return `<div class="mi-sat"><span class="mi-sat-ad"><b>${ad}</b><small>${a}${z ? ` · son: ${e(zamanMetni(z))}` : ''}</small></span><button type="button" class="dg dg-cizgi dg-kucuk" data-meb-cekbtn="${k}" ${subeSorun() ? 'disabled' : ''}>${ik('indir')}Al</button></div>`; }).join('')}</div></div>`;
}

/* ---------- eylemler ---------- */
// kayıtla birlikte o öğrencinin MEBBİS'te açılmamış dönem grubu da gider (MEBBİS sırası: grup → şube → kayıt)
function grupEkle(ids) {
  const acik = new Set(MB.butunIsler(false).filter(x => x.tur === 'grup').map(x => x.id)), g = new Set();
  ids.forEach(id => { if (!String(id).startsWith('kayit-')) return; const kk = kursiyer(id.slice(6)), gg = kk && GR.kursiyerGrubu(kk); if (gg && acik.has('grup-' + gg.id)) g.add('grup-' + gg.id); });
  return [...g, ...ids];
}
function aktar(ids) {
  if (!ids.length) return bildir('Seçili kayıt yok', 'uyari');
  if (subeSorun()) return bildir('Önce üstten şube seçin; her şubenin MEBBİS hesabı ayrı', 'uyari');
  if (!EK.eklenti.var) return kopyala(ids);
  MT.yaz(grupEkle(ids)).then(r => { if (r) ids.forEach(id => sec.set.delete(id)); yenile(); });
}
// Yardımcı'sız giriş: kayıt, direksiyon programı ve sınav randevusu mevcut sıralı giriş ekranlarına; ötekiler kopyalanabilir alan penceresine (eski "Elle gir")
function kopyala(ids) {
  if (!ids.length) return bildir('Seçili kayıt yok', 'uyari');
  if (subeSorun()) return bildir('Önce üstten şube seçin; her şubenin MEBBİS hesabı ayrı', 'uyari');
  const tur = String(ids[0]).split('-')[0], s3 = () => import('./sayfalar3.js?v=235');
  if (ids.some(id => String(id).startsWith('kayit-'))) { const k = ids.filter(id => String(id).startsWith('kayit-')); return MT.kuralBilgi(k, () => { if (k.length === 1) { location.hash = '#/mebbis/' + k[0].slice(6); return; } s3().then(x => x.mebSiraBaslat(true)); }, { dugme: 'Elle girişe geç' }); }
  if (tur === 'ders') return MT.kuralBilgi(ids, () => s3().then(x => x.programPenceresi()), { dugme: 'Elle girişe geç' });
  if (tur === 'sinav') { const x0 = MB.butunIsler(true).find(y => y.id === ids[0]); return MT.kuralBilgi(ids, () => s3().then(x => x.sinavBildirimPenceresi(x0 && x0.ref.sinav)), { dugme: 'Elle girişe geç' }); }
  MT.elleGir(ids);
}
function hatirlat() {
  const l = eksikOgrenciler(); if (!l.length) return bildir('Eksik evrakı olan öğrenci yok');
  const ml = x => `${selam(x)} kaydınızı tamamlamak için şu evraklar eksik: ${eksikEvrak(x).map(z => z[1].toLocaleLowerCase('tr')).join(', ')}. ${kursAdi('e')} getirebilir ya da fotoğraflarını buraya gönderebilirsiniz.`;
  waSirali(kisiListe(l, ml), 'Eksik evrak hatırlatması');
}
function bilgiCek() {
  if (!EK.eklenti.var) return EK.kurulumPenceresi();
  if (subeSorun()) return bildir('Önce üstten şube seçin; her şubenin MEBBİS hesabı ayrı', 'uyari');
  MT.topluCek(MB.GUNCELLE);
}

/* ---------- alt menü (DIG-057) ---------- */
export function altMenu(kap, secili = '') {
  let cl; try { cl = kartlar(); } catch (x) { cl = []; }
  const c = k => cl.find(x => x.k === k) || { n: 0, son: '' }, gecti = (...l) => l.some(x => x.son && fark(x.son) < 0);
  const te = c('teorik'), pr = c('program'), z = (S.mebCekim || {}).toplu, eski = !z || Date.now() - new Date(z.replace(' ', 'T')).getTime() > 24 * 3600e3;
  AM.goster(kap, [
    { id: 'kayit', ad: 'Kayıt aktar', ik: 'kursiyer', rozet: c('kayit').n, acil: gecti(c('kayit')), hedef: '#/meb/kayit', baslik: 'Yeni öğrenci kayıtlarını MEBBİS’e aktar' },
    { id: 'program', ad: 'Programları gönder', kisa: 'Programlar', ik: 'direksiyon', rozet: te.n + pr.n, acil: gecti(te, pr), ...(te.n && pr.n ? { hedef: '#/meb', kaydir: '[data-mi-kart=teorik],[data-mi-kart=program]' } : { hedef: te.n ? '#/meb/teorik' : '#/meb/program' }), baslik: 'Teorik ve direksiyon programını MEBBİS’e gönder' },
    { id: 'sinav', ad: 'Sınav randevusu', kisa: 'Randevu', ik: 'takvim', rozet: c('sinav').n, acil: gecti(c('sinav')), hedef: '#/meb/sinav', baslik: 'Uygulama sınavı randevusu al' },
    { id: 'evrak', ad: 'Eksik evrak', ik: 'belge', rozet: c('evrak').n, hedef: '#/meb/evrak', baslik: 'Eksik evrakları tamamla' },
    { id: 'cek', ad: 'MEBBİS’ten çek', kisa: 'Bilgi çek', ik: 'indir', nokta: eski, eylem: bilgiCek, baslik: 'MEBBİS’ten bilgileri çek (MEBBİS’e bir şey yazılmaz)' },
  ], { secili: secili === 'teorik' ? 'program' : secili, etiket: 'MEB işlemleri kısayolları' });
}

/* ---------- sayfa ---------- */
let sorunluIste = false;
export function sayfa(alt) {
  if (alt in ESKI) alt = '';
  let cl = kartlar();
  let html, c = null;
  if (alt === 'tablo') html = tabloEkrani();
  else if (alt === 'diger') html = digerEkrani();
  else if (alt && (c = cl.find(x => x.k === alt))) { secimHazirla(c, sorunluIste); sorunluIste = false; html = isEkrani(c, cl); }
  else html = anaEkran(cl);
  return {
    baslik: 'MEB işlemleri', alt: c ? `MEBBİS’e girilecek işler · ${c.kisa}` : 'MEBBİS’e girilecek işler ve son günleri',
    html,
    baglan(k) {
      MB.merkezBaglan(k, yenile);   // MEBBİS'ten güncelle, kurulum, izle, e-sınav gün tercihi, merkezler, ücret hatırlatma, silinecek ders, uyumsuzluk, iş kartı düğmeleri
      altMenu(k, c ? c.k : '');
      engelleriYaz(k, c ? [c] : cl.filter(x => x.n && x.k !== 'evrak'));
      const kartAc = el => { const x = el && el.closest('[data-mi-ac]'); if (x) location.hash = '#/meb/' + x.dataset.miAc; };
      k.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[data-mi-ac]')) { ev.preventDefault(); kartAc(ev.target); } });
      k.addEventListener('click', ev => {
        const t = ev.target;
        { const s = t.closest('[data-mi-sube]'); if (s) { document.querySelectorAll('[data-sube]').forEach(x => { x.value = s.dataset.miSube; x.dispatchEvent(new Event('change', { bubbles: true })); }); return; } }
        if (t.closest('[data-mi-kur]')) return EK.kurulumPenceresi();
        if (t.closest('[data-mi-cek]')) return bilgiCek();
        if (t.closest('[data-mi-hatirlat]')) return hatirlat();
        { const so = t.closest('[data-mi-sorunlu]'); if (so) { sorunluIste = true; if (location.hash === '#/meb/' + so.dataset.miSorunlu) { ev.preventDefault(); yenile(); } return; } }
        { const y = t.closest('[data-mi-yap]'); if (y) { const x = cl.find(z => z.k === y.dataset.miYap); if (!x) return; if (x.k === 'evrak') return hatirlat(); return aktar(x.l.filter(z => secilebilir(x, z)).map(z => z.id)); } }
        if (t.closest('[data-mi-grup]')) { const g = (cl.find(z => z.k === 'kayit') || { grup: [] }).grup.map(z => z.id); return EK.eklenti.var ? aktar(g) : kopyala(g); }
        { const m = t.closest('[data-mx-tur]'); if (m) { location.hash = '#/meb/' + (m.dataset.mxTur === 'evrak' ? 'kayit' : m.dataset.mxTur); return; } }
        if (c) {
          if (t.closest('[data-mi-aktar]')) return aktar([...sec.set]);
          if (t.closest('[data-mi-kopyala]')) return kopyala([...sec.set]);
          if (t.closest('[data-mi-ekranda]')) { const ids = [...sec.set]; if (!ids.length) return bildir('Seçili kayıt yok', 'uyari'); return EK.yardimciyaGonder(ids, () => ids.forEach(id => sec.set.delete(id))); }
          if (t.closest('[data-mi-csv]')) { const l = c.l.map(x => kursiyer((x.ref || {}).kursiyer)).filter(Boolean); csvIndir('esinav-basvuru.csv', [['TC', 'Ad', 'Soyad', 'Telefon', 'Sınıf', 'Teorik saat'], ...l.map(x => [x.tc, x.ad, x.soyad, x.tel, (SINIFLAR[x.sinif] || {}).ad || x.sinif, x.teorik])]); return bildir('Liste indirildi'); }
          { const s = t.closest('[data-mi-suz]'); if (s) { sec.suz = s.dataset.miSuz; return yenile(); } }
          // seçim: sayfa yeniden çizilmez, yalnız sayaç ve düğmeler güncellenir
          const guncelle = () => { const n = sec.set.size; k.querySelectorAll('[data-mi-n]').forEach(x => { x.textContent = n ? ` (${n})` : ''; }); const sy = k.querySelector('[data-mi-say]'); if (sy && !subeSorun()) sy.innerHTML = n ? `<b>${n}</b> seçili` : 'Seçili yok'; k.querySelectorAll('[data-mi-aktar],[data-mi-kopyala]').forEach(b => { b.disabled = subeSorun() || !n; }); const sl = c.l.filter(x => secilebilir(c, x)), h = k.querySelector('[data-mi-hepsi]'); if (h) h.checked = sl.length && sl.every(x => sec.set.has(x.id)); };
          const hp = t.closest('[data-mi-hepsi]'); if (hp) { const sl = c.l.filter(x => secilebilir(c, x)); sl.forEach(x => hp.checked ? sec.set.add(x.id) : sec.set.delete(x.id)); k.querySelectorAll('[data-mi-sec]').forEach(cb => { if (!cb.disabled) cb.checked = sec.set.has(cb.dataset.miSec); }); return guncelle(); }
          const cb = t.closest('[data-mi-sec]'); if (cb) { cb.checked ? sec.set.add(cb.dataset.miSec) : sec.set.delete(cb.dataset.miSec); return guncelle(); }
          const sat = t.closest('[data-mi-satir]'); if (sat && !t.closest('a, button, input, label')) { const i = sat.querySelector('[data-mi-sec]'); if (i && !i.disabled) { i.checked = !i.checked; i.checked ? sec.set.add(i.dataset.miSec) : sec.set.delete(i.dataset.miSec); guncelle(); } return; }
        }
        if (!t.closest('a, button, input, select, label, summary')) kartAc(t);
      });
      k.addEventListener('change', ev => { const d = ev.target.closest('[data-mx-donem]'); if (d) { tabloDonem = d.value; } });
    },
  };
}
