// e-Sınav yolu (TEO-007, TEO-008): teorikteki her aday tek bir bölümde. esinavAsamasi DOM'suzdur; ekran Sınavlar › "e-Sınav yolu" sekmesi.
// Bölüm sırası (ilk tutan bölüm): muaf → doldu → geçti → bekleyen → sonuç → randevu → derste → ücret → tekrar → başvuru.
import { esinavUcreti, S, gun, fark, SINIFLAR, tamAd, sb, sbSinav, egitimSinifi, esinavsizBelgeli, esinavHakDurum, esinavUcretiVar, esinavUcretiIsle, teorikSaat, islem, kaydet, sinifEtiket } from './veri.js?v=235';
import { e, rozet, tarih, ik, avatar, bildir, pencere, kapatPencere, bos } from './ui.js?v=235';
import * as GR from './gruplar.js?v=235';

export const YOL_BOLUM = [
  ['bekleyen', 'Kayıt bekliyor', 'Grup ya da evrak eksik'],
  ['derste', 'Teorik derste', 'Teorik dersleri bitmeden MEBBİS başvuru almaz'],
  ['ucret', 'Ücreti bekleniyor', 'Sıradaki hakkın e-sınav ücreti yatmadı'],
  ['basvuru', 'Başvurusu yapılacak', 'Ücret yattı; MEBBİS’te e-sınav başvurusu'],
  ['tekrar', 'Tekrar girecek', 'Kaldı ya da girmedi; ücret yattı, yeni başvuru'],
  ['randevu', 'Randevusu var', 'Yaklaşan e-sınav oturumunda ya da MEBBİS’e başvurulmuş'],
  ['sonuc', 'Sonuç girilecek', 'Oturum geçti, sonuç girilmedi'],
  ['doldu', 'Hakkı doldu', 'e-Sınav hakkı bitti; MEBBİS başvuruyu reddeder (“e-Sınava girebilecek aday bulunamadı”)'],
  ['gecti', 'Geçti · direksiyona geçecek', 'e-Sınavı geçti, başvuru gerekmez; direksiyon dersi henüz planlanmadı'],
  ['muaf', 'Muaf · belgeli', 'Belgeli, e-sınavdan muaf; MEBBİS başvuruyu kabul etmez, yalnız direksiyon'],
];
const tlK = n => (+n || 0).toLocaleString('tr-TR') + ' ₺';
const dersVar = k => (S.dersler || []).some(d => d.kursiyer === k.id && ['Planlandı', 'Yapıldı'].includes(d.durum));
const esOturumlari = k => sbSinav(S.sinavlar).filter(s => s.tur === 'e-Sınav' && (s.kursiyerler || []).includes(k.id));
// e-sınav yolundaki adaylar: kapanmamış, eğitim sınıfı (100 ceza) olmayan; teorikte ya da e-sınavı geçip henüz direksiyon dersi olmayan
export function yolAdaylari() {
  return sb(S.kursiyerler).filter(k => !k.kapali && SINIFLAR[k.sinif] && !egitimSinifi(k.sinif) && (['Kayıt', 'Evrak', 'Teorik'].includes(k.asama) || (k.asama === 'Direksiyon' && !dersVar(k))));
}
export function esinavAsamasi(k) {
  if (k.muaf || esinavsizBelgeli(k)) return 'muaf';
  const h = esinavHakDurum(k);
  if ((k.hakBitti && k.hakBitti.tur === 'e-Sınav' && !k.hakBitti.cozuldu) || h.meb.ham === 0) return 'doldu';
  if (k.esinav && k.esinav.sonuc === 'Geçti') return 'gecti';
  if (GR.bekleyenMi(k)) return 'bekleyen';
  const ot = esOturumlari(k);
  if (ot.some(s => fark(s.tarih) <= 0 && !(s.sonuc || {})[k.id])) return 'sonuc';
  if (ot.some(s => fark(s.tarih) > 0)) return 'randevu';
  const son = k.esinav && ['Kaldı', 'Girmedi'].includes(k.esinav.sonuc) ? k.esinav : null;
  if (!son && (k.teorik || 0) < teorikSaat(k)) return 'derste';
  if (!esinavUcretiVar(k, h.sira)) return 'ucret';
  // MEBBİS'e başvuru yazıldıysa (son sonuçtan sonra) randevu bekleniyor
  if (k.mebEsinav && (!son || !son.tarih || k.mebEsinav >= son.tarih)) return 'randevu';
  return son ? 'tekrar' : 'basvuru';
}
export function yolSayilari() { const n = Object.fromEntries(YOL_BOLUM.map(([id]) => [id, 0])); yolAdaylari().forEach(k => { n[esinavAsamasi(k)]++; }); return n; }

/* ---------- ekran ---------- */
export const yolDurum = { bolum: '' };
// son e-sınav randevusu: grup başlangıcı + 90 gün (md.15/1); MEBBİS "Haklarının Tamamlanacağı Tarih" ayrıca
const sonRandevu = k => { const g = GR.kursiyerGrubu(k); if (!g || !/^\d{4}-\d{2}-\d{2}/.test(g.baslangic || '')) return ''; const d = new Date(g.baslangic + 'T12:00'); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10); };
function kart(k, b) {
  const h = esinavHakDurum(k), sr = sonRandevu(k), ms = k.meb && k.meb.haklarSonGun, ot = esOturumlari(k).filter(s => fark(s.tarih) > 0).sort((a, c) => a.tarih.localeCompare(c.tarih))[0];
  const alt = [sinifEtiket(k.sinif, k), b === 'muaf' ? (k.muaf ? 'muaf (md.15/5)' : 'belgeli') : b === 'derste' ? `teorik ${k.teorik || 0}/${teorikSaat(k)} saat${(t => t ? ' · ' + (fark(t.tarih) < 0 ? 'bitti ' : 'bitiş ') + tarih(t.tarih) + (t.kaynak === 'MEBBİS' ? ' (MEBBİS)' : '') : '')(GR.teorikBitis(k))}` : `${h.sira}. hak / ${h.sinir}`, ot ? 'oturum ' + tarih(ot.tarih) : '', sr && !['muaf', 'gecti', 'doldu'].includes(b) ? `son randevu ${tarih(sr)}${ms ? ' · MEBBİS ' + tarih(ms) : ''}` : ''].filter(Boolean);
  // SNV-093 (d): başvuru öncesi onay durumu — MEBBİS Getir'i engellemiyor, Kaydet'in tutup tutmadığı bilinmiyor; uyarı
  const M = k.meb || {}, onayRz = ['basvuru', 'tekrar'].includes(b) ? (!k.mebOnay && !/onaylan/i.test(M.kurumOnay || '') ? rozet('Kurum onayı yapılmadı', 'sari') : /il[çc]e/i.test(M.durum || '') && /onay/i.test(M.durum || '') && /bekl/i.test(M.durum || '') ? rozet('İlçe onayı bekliyor', 'sari') : '') : '';
  const rz = [onayRz, b === 'ucret' ? rozet(`önce ${tlK(esinavUcreti(h.sira))} e-sınav ücreti`, 'sari') : '', h.meb.anlam ? rozet('MEBBİS: ' + h.meb.anlam, h.meb.ham === 0 || h.meb.ham === 5 ? 'kirmizi' : 'mavi') : '', h.fark ? rozet('Kayıt farkı', 'sari') : '', sr && fark(sr) <= 20 && fark(sr) >= 0 && !['muaf', 'gecti', 'doldu'].includes(b) ? rozet(fark(sr) + ' gün kaldı', fark(sr) <= 7 ? 'kirmizi' : 'sari') : ''].filter(Boolean).join(' ');
  const eylem = { ucret: `<button class="dg dg-cizgi dg-kucuk" data-ey-ucret="${k.id}">${ik('tik')}${h.sira}. hak ücreti yattı</button>`, basvuru: `<button class="dg dg-ana dg-kucuk" data-ey-ekle="${k.id}">${ik('arti')}Oturuma ekle</button>`, tekrar: `<button class="dg dg-ana dg-kucuk" data-ey-ekle="${k.id}">${ik('arti')}Oturuma ekle</button>`, sonuc: `<button class="dg dg-ana dg-kucuk" data-ey-sonuc="${k.id}">Sonucu gir</button>`, gecti: `<button type="button" class="dg dg-ana dg-kucuk" data-ey-plan="${k.id}">${ik('direksiyon')}Ders planı öner</button>`, bekleyen: `<a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}">Dosyayı aç</a>` }[b] || '';
  return `<li class="ey-kart"><a class="kisi" href="#/kursiyer/${k.id}">${avatar(k.ad, k.soyad, k.foto)}<div><b>${e(tamAd(k))}</b><small>${e(alt.join(' · '))}</small>${rz ? `<span class="ey-rozet">${rz}</span>` : ''}</div></a>${eylem ? `<span class="ey-eylem">${eylem}</span>` : ''}</li>`;
}
export function yolHtml() {
  const l = yolAdaylari().map(k => ({ k, b: esinavAsamasi(k) })), n = Object.fromEntries(YOL_BOLUM.map(([id]) => [id, l.filter(x => x.b === id).length]));
  const sec = yolDurum.bolum && n[yolDurum.bolum] != null ? yolDurum.bolum : '';
  const goster = YOL_BOLUM.filter(([id]) => (sec ? id === sec : n[id]));
  return `<div class="kart ey"><div class="ey-cipler" role="tablist" aria-label="e-Sınav yolu adımları"><button type="button" role="tab" class="ey-cip ${sec ? '' : 'secili'}" data-ey-bolum=""><b>${l.length}</b><span>Hepsi</span></button>${YOL_BOLUM.map(([id, ad]) => `<button type="button" role="tab" class="ey-cip ${sec === id ? 'secili' : ''} ${n[id] ? '' : 'bos'}" data-ey-bolum="${id}" aria-selected="${sec === id}"><b>${n[id]}</b><span>${e(ad)}</span></button>`).join('')}</div>
    ${goster.length ? goster.map(([id, ad, acik]) => `<div class="ey-bolum"><div class="ey-bolum-bas"><h3>${e(ad)}</h3><small>${e(acik)} · ${n[id]}</small></div>${n[id] ? `<ul class="ey-liste">${l.filter(x => x.b === id).map(x => kart(x.k, id)).join('')}</ul>` : '<p class="ipucu" style="margin:6px 0 4px">Bu adımda aday yok.</p>'}</div>`).join('')
      : `<div class="kart-govde">${bos('e-Sınav yolunda aday yok', 'Teorik derse başlayan öğrenciler burada adım adım görünür.')}</div>`}</div>`;
}
export function yolBaglan(k, yenile, { oturumaEkle, sonucGir } = {}) {
  k.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ey-bolum]'); if (b) { yolDurum.bolum = b.dataset.eyBolum; return yenile(); }
    const u = ev.target.closest('[data-ey-ucret]'); if (u) { const x = S.kursiyerler.find(y => y.id === u.dataset.eyUcret); if (!x) return; const h = esinavHakDurum(x); if (esinavUcretiIsle(x, 'elle', gun(0))) { islem('e-Sınav ücretini işaretledi', `${tamAd(x)} · ${h.sira}. hak`); kaydet(); bildir(`${tamAd(x)} · ${h.sira}. hak ücreti işaretlendi`, 'tamam'); } return yenile(); }
    { const p = ev.target.closest('[data-ey-plan]'); if (p) return import('./sayfalar1.js?v=235').then(m => m.otoPlanPenceresi({ kursiyerler: [p.dataset.eyPlan] })); }   // DIR-041
    const a = ev.target.closest('[data-ey-ekle]'); if (a && oturumaEkle) return oturumaEkle(S.kursiyerler.find(y => y.id === a.dataset.eyEkle));
    const s = ev.target.closest('[data-ey-sonuc]'); if (s && sonucGir) { const x = S.kursiyerler.find(y => y.id === s.dataset.eySonuc); const o = esOturumlari(x).filter(z => fark(z.tarih) <= 0 && !(z.sonuc || {})[x.id]).sort((p, q) => q.tarih.localeCompare(p.tarih))[0]; return o && sonucGir(o); }
  });
}
// Öğrenci dosyası ve öğrenci uygulaması için tek satır (TEO-011): "e-Sınav · 2. hak · ücret bekleniyor · son randevu 12 Ara"
export function esinavSatiri(k) {
  if (!SINIFLAR[k.sinif] || egitimSinifi(k.sinif)) return '';
  const b = esinavAsamasi(k), h = esinavHakDurum(k), sr = sonRandevu(k), ad = (YOL_BOLUM.find(x => x[0] === b) || [, ''])[1];
  if (b === 'muaf') return k.muaf ? 'e-Sınav · muaf (md.15/5)' : 'e-Sınav yok · belgeli aday';
  if (b === 'gecti') return 'e-Sınav · geçti' + (k.esinav && k.esinav.puan ? ' · ' + k.esinav.puan + ' puan' : '');
  if (b === 'doldu') return 'e-Sınav · hakkı doldu';
  const ucret = b === 'derste' || b === 'bekleyen' ? '' : esinavUcretiVar(k, h.sira) ? 'ücret yattı' : 'ücret bekleniyor';
  const tb = GR.teorikBitis(k), tbm = tb && b === 'derste' ? (fark(tb.tarih) < 0 ? 'teorik ' + tarih(tb.tarih) + '’te bitti' : 'teorik ' + tarih(tb.tarih) + '’te bitiyor') : '';
  return ['e-Sınav', `${h.sira}. hak`, b === 'derste' ? (tbm || 'teorik derste') : ucret, ['randevu', 'sonuc'].includes(b) ? ad.toLocaleLowerCase('tr') : '', sr && !['gecti'].includes(b) ? 'son randevu ' + tarih(sr) : ''].filter(Boolean).join(' · ');
}
