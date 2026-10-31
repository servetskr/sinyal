import { planlilariGonder } from './mesaj.js?v=107';
import { S, kaydet, gun, fark, kursiyer, egitmen, tamAd, eksikEvrak, gecikenler, kalanBorc, islem, gonderimEkle, yerelZaman, oturum, kapaliGun, SINIFLAR, risk, selam, kursAdi, bulutKanca, mudurTel } from './veri.js?v=107';
import { tl, tamTarih, tarihUzun, saatDe, apiAcik, apiGonder, etiket, bildir, waSirali } from './ui.js?v=107';
import { denetimSkoru } from './ozellik.js?v=107';

/* ================= ZAMANLI MESAJLAR =================
   Sinyal açıkken her dakika zamanı gelen mesajları bulur. WhatsApp API bağlıysa kendiliğinden gönderir;
   bağlı değilse "zamanı gelen mesajlar" kuyruğuna koyar, ön büro tek ekrandan sırayla gönderir.
   Aynı mesaj iki kez gitmez (anahtar defteri). Demo sınırı açıkken her kuraldan günde en fazla 2 mesaj gider. */

const YENI_KURALLAR = [
  { id: 'o10', ad: 'Hocaya yarınki program', ne: 'Her akşam 18:00’de', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: 'Merhaba {ad} Hoca, yarınki direksiyon programınız: {liste}.' },
  { id: 'o11', ad: 'Kayıt görüşmesi hatırlatması', ne: 'Görüşmeden bir gün önce 18:00’de', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} yarın {saatte} {kursta} kayıt görüşmeniz var. Adresimiz: {adres}. Kimliğinizi getirmeyi unutmayın.' },
  { id: 'o12', ad: 'Müdüre akşam özeti', ne: 'Her akşam 19:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{kurs} · {tarih} akşam özeti\n{ozet}' },
  { id: 'o13', ad: 'Belge ve araç süresi uyarısı', ne: 'Bitmeden 30, 7 ve 1 gün önce 09:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{konu} {kalan} bitiyor ({tarih}). Yenilemeyi unutmayın.' },
  { id: 'o15', ad: 'Kalma riski yüksek kursiyere ek ders teklifi', ne: 'Risk yükselince ertesi gün 12:00’de', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} son derslerinize göre sınavdan önce {n} ek direksiyon dersi ({tutar}) öneriyoruz{odak}. Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.' },
  { id: 'o16', ad: 'Doğum günü kutlaması', ne: 'Doğum gününde 10:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} doğum gününüz kutlu olsun! {kurs} olarak size sağlıklı, mutlu ve kazasız bir yıl dileriz.' },
  { id: 'o14', ad: 'Teorik grup başlangıcı', ne: 'Gruptan iki gün önce 10:00’da', kanal: 'WhatsApp', acik: true, gonderim: 0, sablon: '{selam} teorik dersleriniz {tarih} {saatte} başlıyor ({grup}, {derslik}). Görüşmek üzere. {kurs}' },
];
// Eski “sen” dilli şablonları “siz” diline ve hitaba ({selam}) çevir
const SIZ_SABLON = {
  o1: '{selam} yarın {saat}’te {egitmen} ile direksiyon dersiniz var. Gelemeyecekseniz bu mesajı yanıtlamanız yeterli. {kurs}',
  o11: '{selam} yarın {saatte} {kursta} kayıt görüşmeniz var. Adresimiz: {adres}. Kimliğinizi getirmeyi unutmayın.',
  o14: '{selam} teorik dersleriniz {tarih} {saatte} başlıyor ({grup}, {derslik}). Görüşmek üzere. {kurs}',
  o15: '{selam} son derslerinize göre sınavdan önce {n} ek direksiyon dersi ({tutar}) öneriyoruz{odak}. Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.',
  o2: '{selam} {vade} tarihli {tutar} taksidinizin hatırlatmasıdır. {odeme}',
  o3: '{selam} {tur} sınavınız {tarih} {saatte}, yer: {yer}. Kimliğinizi yanınıza almayı unutmayın. {kurs}',
  o4: '{selam} kaydınızı tamamlamak için {evrak} eksik. {kursa} getirdiğinizde işlemlerinizi hemen başlatıyoruz.',
  o5: '{selam} tebrikler, artık ehliyetiniz var! {kurs} hakkında Google’da birkaç cümle yazarsanız çok seviniriz: {link}',
  o6: '{selam} bu sefer olmadı ama çok yakındınız. Bir sonraki sınava kadar 2 ek ders ayarlayalım mı?',
  o7: '{selam} kayıtla ilgili aklınıza takılan bir şey var mı? Bu hafta başlayan gruba hâlâ yer var. {kurs}',
  o8: '{selam} e-sınav randevunuz {tarih} {saatte}, yer: {yer}. Kimliğinizi ve e-sınav ücreti dekontunu yanınıza alın.',
  o9: '{selam} {tur} sınav sonucunuz: {sonuc}. {kalan_hak}'
};
// Eski kayıtlara yeni kuralları ve düzeltilmiş şablonları ekle
export function kurallariHazirla() {
  if (!S.otomasyonlar) return;
  YENI_KURALLAR.forEach(k => { if (!S.otomasyonlar.some(o => o.id === k.id)) S.otomasyonlar.push({ ...k }); });
  S.otomasyonlar.forEach(o => { o.sablon = o.sablon.replace('{saat}’te', '{saatte}').replace('Kartla ödemek için: {link}', '{odeme}'); });
  S.otomasyonlar.forEach(o => { if (SIZ_SABLON[o.id] && !o.sablon.includes('{selam}') && o.sablon.includes('{ad}')) o.sablon = SIZ_SABLON[o.id]; if (o.id === 'o10' && o.sablon.startsWith('{ad} Hoca')) o.sablon = 'Merhaba ' + o.sablon; if (o.id === 'o2') o.sablon = o.sablon.replace('{odeme} {kurs}', '{odeme}'); });
  S.zamanli = S.zamanli || { gonderilen: {}, kayit: [], kuyruk: [], son: null, sinir: true };
}
const SAAT = { o1: '18:00', o10: '18:00', o11: '18:00', o12: '19:00', o13: '09:00', o2: '10:00', o3: '10:00', o14: '10:00', o4: '11:00', o7: '11:00', o15: '12:00', o16: '10:00' };
export const kuralSaati = id => SAAT[id] || null;
const kural = id => S.otomasyonlar.find(o => o.id === id);
const doldur = (id, alan) => { alan = { kurs: S.kurs.ad, kursa: kursAdi('e'), kursta: kursAdi('de'), ...alan }; if (alan.kisi && !alan.selam) alan.selam = selam(alan.kisi); return (kural(id) ? kural(id).sablon : '').replace(/\{(\w+)\}/g, (x, a) => alan[a] != null ? alan[a] : ''); };
const ogr = k => ({ ad: tamAd(k), tel: k.tel, rol: 'ÖĞRENCİ' });
const hoca = h => ({ ad: h.ad, tel: h.tel, rol: 'HOCA' });
const mudur = () => ({ ad: S.kurs.yetkili || 'Kurs müdürü', tel: mudurTel(), rol: 'MÜDÜR' });
const odeme = () => S.kurs.iban ? `Havale/EFT için IBAN: ${S.kurs.iban}; ${kursAdi('de')} nakit ya da kartla da ödeyebilirsiniz.` : `${kursAdi('e')} uğrayıp nakit ya da kartla ödeyebilirsiniz.`;
const TEORIK_SAAT = { aksam: '18:30', sabah: '10:00' };

// Her kural: o gün gönderilmesi gerekenler. ornek=true ise tarih şartı aranmaz (demo için tek örnek).
const URET = {
  o1: ornek => { const t = gun(1); return S.dersler.filter(d => d.durum === 'Planlandı' && (ornek ? fark(d.tarih) >= 0 : d.tarih === t)).map(d => { const k = kursiyer(d.kursiyer), h = egitmen(d.egitmen); return k && h && { anahtar: 'o1|' + d.id, kim: ogr(k), metin: doldur('o1', { kisi: k, ad: k.ad, saat: d.saat, saatte: saatDe(d.saat), egitmen: h.ad }) }; }); },
  o10: ornek => { const t = gun(1); return S.egitmenler.map(h => { const l = S.dersler.filter(d => d.egitmen === h.id && d.durum === 'Planlandı' && (ornek ? fark(d.tarih) >= 0 : d.tarih === t)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)); if (ornek && l.length) { const g = l[0].tarih; l.splice(0, l.length, ...l.filter(d => d.tarih === g)); } return l.length && { anahtar: 'o10|' + h.id + '|' + t, kim: hoca(h), metin: doldur('o10', { ad: h.ad.split(' ')[0], liste: l.map(d => { const k = kursiyer(d.kursiyer); return d.saat + ' ' + (k ? tamAd(k) + ' (' + SINIFLAR[k.sinif].ad + ')' : ''); }).join(', ') }) }; }); },
  o2: ornek => S.kursiyerler.filter(k => !k.kapali).flatMap(k => k.odeme.taksitler.map((tk, i) => ({ k, tk, i })).filter(({ tk }) => !tk.odendi && !tk.iptal && (ornek ? fark(tk.vade) >= 0 : [3, 0, -1].includes(fark(tk.vade))))).sort((a, b) => a.tk.vade.localeCompare(b.tk.vade)).map(({ k, tk, i }) => { const f = fark(tk.vade); return { anahtar: 'o2|' + k.id + '|' + i + '|' + f, kim: ogr(k), metin: f < 0 ? `${selam(k)} ${tamTarih(tk.vade)} vadeli ${tl(tk.tutar - (tk.kismi || 0))} taksidiniz henüz ödenmedi. ${odeme()}` : doldur('o2', { kisi: k, ad: k.ad, vade: tamTarih(tk.vade), tutar: tl(tk.tutar - (tk.kismi || 0)), odeme: odeme() }) }; }),
  o3: ornek => S.sinavlar.filter(s => ornek ? fark(s.tarih) >= 0 : [3, 1].includes(fark(s.tarih))).flatMap(s => { const f = fark(s.tarih), l = s.kursiyerler.map(kursiyer).filter(Boolean); const ogrenci = l.map(k => ({ anahtar: 'o3|' + s.id + '|' + k.id + '|' + f, kim: ogr(k), metin: doldur('o3', { kisi: k, ad: k.ad, tur: s.tur.toLocaleLowerCase('tr'), tarih: tarihUzun(s.tarih), saat: s.saat, saatte: saatDe(s.saat), yer: s.yer }) })); const hocalar = s.tur === 'Direksiyon' && (ornek || f === 1) ? [...new Set(l.map(k => k.egitmen))].map(egitmen).filter(Boolean).map(h => ({ anahtar: 'o3h|' + s.id + '|' + h.id, kim: hoca(h), metin: `Merhaba ${h.ad.split(' ')[0]} Hoca, ${tarihUzun(s.tarih)} ${saatDe(s.saat)} direksiyon sınavı var (${s.yer}). Öğrencileriniz: ${l.filter(k => k.egitmen === h.id).map(tamAd).join(', ')}. Araçla 30 dakika önce orada olun.` })) : []; return [...hocalar, ...ogrenci]; }),
  o4: ornek => S.kursiyerler.filter(k => eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama) && (ornek || [-3, -10].includes(fark(k.kayit)))).map(k => ({ anahtar: 'o4|' + k.id + '|' + fark(k.kayit), kim: ogr(k), metin: doldur('o4', { kisi: k, ad: k.ad, evrak: eksikEvrak(k).map(x => x[1].toLocaleLowerCase('tr')).join(', ') }) })),
  o7: ornek => S.adaylar.filter(a => a.asama === 'Bilgi verildi' && (ornek || fark(a.tarih) === -2)).map(a => ({ anahtar: 'o7|' + a.id, kim: { ad: a.ad, tel: a.tel, rol: 'ADAY' }, metin: doldur('o7', { kisi: a, ad: a.ad.split(' ')[0] }) })),
  o11: ornek => ((S.sosyal && S.sosyal.slotlar) || []).filter(x => x.dolu && (ornek ? fark(x.tarih) >= 0 : x.tarih === gun(1))).map(x => { const a = S.adaylar.find(y => y.id === x.aday) || { ad: x.dolu, tel: '' }; return { anahtar: 'o11|' + x.tarih + '|' + x.saat, kim: { ad: a.ad, tel: a.tel, rol: 'ADAY' }, metin: doldur('o11', { kisi: a, ad: a.ad.split(' ')[0], saatte: saatDe(x.saat), adres: S.kurs.adres }) }; }),
  o12: () => [{ anahtar: 'o12|' + gun(0), kim: mudur(), metin: aksamOzeti() }],
  o13: ornek => { const l = [], uyar = (f, hedef, konu, t, ek) => { if (ornek || [30, 7, 1].includes(f)) l.push({ anahtar: 'o13|' + konu + '|' + t, kim: hedef, metin: doldur('o13', { konu, kalan: f <= 1 ? 'yarın' : f + ' gün sonra', tarih: tamTarih(t) }) + (ek || '') }); };
    S.araclar.forEach(a => [['muayene', 'muayenesi'], ['sigorta', 'trafik sigortası'], ['kasko', 'kaskosu']].forEach(([x, ad]) => { if (a[x] && fark(a[x]) > 0) uyar(fark(a[x]), mudur(), a.plaka + ' ' + ad, a[x]); }));
    S.egitmenler.forEach(h => Object.entries(h.belgeler || {}).forEach(([b, t]) => { if (t && fark(t) > 0) { const ad = { sertifika: 'usta öğretici sertifikanız', saglik: 'sağlık raporunuz', adli: 'adli sicil kaydınız' }[b]; uyar(fark(t), hoca(h), h.ad.split(' ')[0] + ' Hoca, ' + ad, t, ' Süresi dolarsa ders veremezsiniz.'); } }));
    return ornek ? l.sort((a, b) => a.anahtar.split('|').pop().localeCompare(b.anahtar.split('|').pop())).slice(0, 1) : l; },
  o14: ornek => (S.gruplar || []).filter(g => ornek ? fark(g.baslangic) >= 0 : fark(g.baslangic) === 2).flatMap(g => S.kursiyerler.filter(k => k.teorikGrup === g.id && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama) && !k.teorik).map(k => ({ anahtar: 'o14|' + g.id + '|' + k.id, kim: ogr(k), metin: doldur('o14', { kisi: k, ad: k.ad, tarih: tarihUzun(g.baslangic), saatte: saatDe(TEORIK_SAAT[g.id] || '18:30'), grup: g.ad.toLocaleLowerCase('tr'), derslik: g.derslik }) }))),
};
URET.o16 = ornek => { const bg = gun(0).slice(5); const l = S.kursiyerler.filter(k => !k.kapali && k.dogumTarihi && (ornek || k.dogumTarihi.slice(5) === bg)); return (ornek ? l.slice(0, 1) : l).map(k => ({ anahtar: 'o16|' + k.id + '|' + gun(0).slice(0, 4), kim: ogr(k), metin: doldur('o16', { kisi: k, ad: k.ad }) })); };
URET.o15 = ornek => S.kursiyerler.map(k => ({ k, r: risk(k) })).filter(({ k, r }) => r && r.oneri && (ornek ? r.puan >= 25 : r.puan >= 50) && !k.ekDersTeklif).sort((a, b) => b.r.puan - a.r.puan).map(({ k, r }) => ({ anahtar: 'o15|' + k.id, kim: ogr(k), etki: { tur: 'ekders', k: k.id, n: r.oneri, tutar: r.oneri * S.kurs.ekDersUcreti }, metin: doldur('o15', { kisi: k, ad: k.ad, n: r.oneri, tutar: tl(r.oneri * S.kurs.ekDersUcreti), odak: r.beceri && r.beceri.zayif.length ? '; özellikle ' + r.beceri.zayif.join(', ').toLocaleLowerCase('tr') + ' üzerinde çalışacağız' : '' }) }));
// Mesaj gidince kayda işlenecek sonuç (ör. ek ders teklifi kursiyer ekranında görünür)
function etkiUygula(x) {
  if (!x.etki || x.etki.tur !== 'ekders') return;
  const k = kursiyer(x.etki.k); if (k && !k.ekDersTeklif) { k.ekDersTeklif = { n: x.etki.n, tutar: x.etki.tutar, tarih: gun(0), neden: 'risk' }; islem('Otomatik ek ders teklifi', tamAd(k) + ' · ' + x.etki.n + ' ders'); }
}
// Müdüre akşam özeti: önizleme ve gerçek gönderim aynı metni kullanır
export function aksamOzeti() {
  kurallariHazirla();
  const t = gun(1), bd = S.dersler.filter(d => d.tarih === gun(0)), yd = S.dersler.filter(d => d.tarih === t && d.durum === 'Planlandı').length, ys = S.sinavlar.filter(s => s.tarih === t);
  const gel = S.hareket.filter(h => h.tarih === gun(0) && h.tur === 'Gelir').reduce((a, h) => a + h.tutar, 0), gk = S.kursiyerler.filter(k => gecikenler(k).length), ev = S.kursiyerler.filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet').length;
  const ds = denetimSkoru(), rk = S.kursiyerler.filter(k => { const r = risk(k); return r && r.puan >= 50; }).length;
  const yeni = S.adaylar.filter(a => a.tarih === gun(0)).length, kayit = S.kursiyerler.filter(k => k.kayit === gun(0)).length;
  return doldur('o12', { kurs: S.kurs.ad, tarih: tamTarih(gun(0)), ozet: [
    `Bugün tahsilat: ${tl(gel)}`,
    `Direksiyon: ${bd.filter(d => d.durum === 'Yapıldı').length}/${bd.length} ders yapıldı${bd.some(d => d.durum === 'Gelmedi') ? ', ' + bd.filter(d => d.durum === 'Gelmedi').length + ' gelmedi' : ''}`,
    `Yeni öğrenci: ${yeni} · yeni kayıt: ${kayit}`,
    `Yarın: ${kapaliGun(t) ? 'kurs kapalı (' + kapaliGun(t).toLocaleLowerCase('tr') + ')' : yd + ' direksiyon dersi' + (ys.length ? ', ' + ys.map(s => s.tur + ' sınavı ' + s.saat).join(', ') : '')}`,
    `Geciken taksit: ${gk.length} kursiyer, ${tl(gk.reduce((a, k) => a + gecikenler(k).reduce((x, tk) => x + tk.tutar - (tk.kismi || 0), 0), 0))}`,
    `Eksik evrak: ${ev} kursiyer`,
    `Denetim hazırlığı: %${ds.puan}${ds.kritik ? ' (' + ds.kritik + ' kritik madde)' : ''}`,
    `Sınav riski yüksek: ${rk} kursiyer`,
  ].join('\n') });
}
export const zamanliKural = id => !!URET[id];
// Bugün bu kuraldan kimlere gidecek (henüz gitmemiş olanlar); kurallar sekmesindeki önizleme bunu gösterir
export function gidecekler(id) { kurallariHazirla(); if (!URET[id]) return []; const z = S.zamanli; return URET[id](false).filter(Boolean).filter(x => !z.gonderilen[x.anahtar]); }

// Şu an zamanı gelmiş, gönderilmemiş mesajlar
export function zamaniGelenler() {
  kurallariHazirla();
  const simdi = new Date().toTimeString().slice(0, 5), z = S.zamanli, l = [];
  S.otomasyonlar.filter(o => o.acik && URET[o.id] && simdi >= SAAT[o.id]).forEach(o => {
    const adaylar = URET[o.id](false).filter(Boolean).filter(x => !z.gonderilen[x.anahtar] && !z.kuyruk.some(q => q.anahtar === x.anahtar));
    adaylar.forEach(x => l.push({ ...x, kural: o.id }));
  });
  return l;
}
let calisiyor = false;
export async function zamanlayiciCalistir(elle = false) {
  if (calisiyor || !oturum.kullanici || !['mudur', 'sekreter'].includes(oturum.kullanici.rol)) return 0;
  // demo: WhatsApp bu cihazda Ayarlar’dan bilerek bağlanmadıysa saatli mesajlar kendiliğinden gitmez (her yeni cihaz aynı mesajları tekrar atmasın); elle “Şimdi kontrol et” çalışır
  if (S.kurs.waApiVarsayilan && !elle) return 0;
  calisiyor = true;
  try {
    const z = (kurallariHazirla(), S.zamanli), l = zamaniGelenler(), bugun = gun(0);
    let gonderilen = 0;
    try { await planlilariGonder(); } catch (x) { console.error(x); }
    for (const x of l) {
      const atla = z.sinir && apiAcik() && ((z.gunluk || {})[bugun + x.kural] || 0) >= 2;
      if (atla) { z.gonderilen[x.anahtar] = bugun; z.kayit.unshift({ zaman: yerelZaman(), kural: x.kural, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, durum: 'demo sınırı' }); continue; }
      if (apiAcik()) {
        // gerçek kursta birden çok cihaz açık olabilir: mesajı ilk sahiplenen cihaz gönderir, öbürleri atlar
        if (bulutKanca.sahiplen && !(await bulutKanca.sahiplen('z|' + x.anahtar + '|' + bugun))) continue;  // öbür cihaz gönderdi; kaydı eşitlemeyle gelir
        const s = await apiGonder(etiket(x.kim.ad, x.kim.rol) + x.metin, undefined, undefined, x.kim);
        z.kayit.unshift({ zaman: yerelZaman(), kural: x.kural, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, id: s.id || null, durum: s.ok ? 'gönderildi' : 'hata: ' + s.hata });
        // gönderilemeyen mesaj öbürlerini durdurmaz; aynı mesaj 3 kez denenince bugünlük bırakılır
        if (!s.ok) { z.hata = z.hata || {}; z.hata[x.anahtar] = (z.hata[x.anahtar] || 0) + 1; if (z.hata[x.anahtar] >= 3) z.gonderilen[x.anahtar] = bugun; continue; }
        z.gonderilen[x.anahtar] = bugun; z.gunluk = z.gunluk || {}; z.gunluk[bugun + x.kural] = (z.gunluk[bugun + x.kural] || 0) + 1;
        gonderimEkle(x.kim.ad, x.metin, kural(x.kural).ad); kural(x.kural).gonderim++; gonderilen++; etkiUygula(x);
      } else z.kuyruk.push({ ...x, eklendi: yerelZaman() });
    }
    // eski kayıtları temizle
    Object.keys(z.gonderilen).forEach(k => { if (fark(z.gonderilen[k]) < -7) delete z.gonderilen[k]; });
    z.kayit = z.kayit.slice(0, 80); z.son = yerelZaman(); kaydet();
    if (gonderilen) bildir(`Zamanlı mesaj: ${gonderilen} mesaj WhatsApp’tan gönderildi ✓`, 'wp');
    else if (elle) bildir(z.kuyruk.length ? `${z.kuyruk.length} zamanlı mesaj gönderilmeyi bekliyor` : 'Şu an zamanı gelen mesaj yok');
    return gonderilen;
  } finally { calisiyor = false; }
}
// API yokken kuyruktakileri sırayla WhatsApp’ta aç
export function kuyruguGonder(sonra) {
  const z = S.zamanli; if (!z || !z.kuyruk.length) return bildir('Bekleyen zamanlı mesaj yok');
  const l = z.kuyruk.slice();
  waSirali(l.map(x => ({ ad: x.kim.ad, tel: x.kim.tel, rol: x.kim.rol, metin: x.metin, tur: kural(x.kural).ad })), 'Zamanı gelen mesajlar', { bitince: acilan => { const ac = acilan || new Set(l.map((x, i) => i)); l.forEach((x, i) => { if (!ac.has(i)) return; z.gonderilen[x.anahtar] = gun(0); z.kuyruk = z.kuyruk.filter(q => q.anahtar !== x.anahtar); z.kayit.unshift({ zaman: yerelZaman(), kural: x.kural, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, durum: 'gönderildi' }); kural(x.kural).gonderim++; etkiUygula(x); }); kaydet(); if (sonra) sonra(); } });
}
// Demo: bir kuraldan tek örnek mesajı hemen gönder (tarih şartı aranmaz)
export async function ornekGonder(id) {
  kurallariHazirla();
  const x = (URET[id](true) || []).filter(Boolean)[0];
  if (!x) return bildir('Bu kural için uygun kayıt yok', 'uyari');
  islem('Zamanlı mesaj örneği gönderdi', kural(id).ad);
  if (apiAcik()) { const s = await apiGonder(etiket(x.kim.ad, x.kim.rol) + x.metin, undefined, undefined, x.kim); S.zamanli.kayit.unshift({ zaman: yerelZaman(), kural: id, kime: x.kim.ad, rol: x.kim.rol, metin: x.metin, id: s.id || null, durum: s.ok ? 'örnek gönderildi' : 'hata: ' + s.hata }); if (s.ok) etkiUygula(x); kaydet(); return bildir(s.ok ? `“${kural(id).ad}” örneği gönderildi ✓` : s.hata, s.ok ? 'wp' : 'uyari'); }
  waSirali([{ ad: x.kim.ad, tel: x.kim.tel, rol: x.kim.rol, metin: x.metin }], kural(id).ad + ' · örnek');
}
let zamanlayici = null;
export function zamanlayiciBaslat() {
  if (zamanlayici) return;
  setTimeout(() => zamanlayiciCalistir(), 4000);
  zamanlayici = setInterval(() => zamanlayiciCalistir(), 60000);
}
