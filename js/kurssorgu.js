// Kurs verisi sorguları (DIG-048): asistan kutusuna yazılan "… olan öğrenciler / adaylar" sorusu kurs verisinden liste olarak cevaplanır.
// Bütün hesap cihazda; yapay zekâya ve sunucuya kişi verisi gitmez. Anlaşılan ölçüt cevabın başında cümleyle yazılır (yanlış anlaşıldıysa görülsün).
// Konu: teorik ders, direksiyon eğitimi, e-sınav, uygulama sınavı, evrak, ödeme. Durum: bitti / bitmedi / başlamadı / sürüyor / geçti / kaldı / girmedi / eksik / gecikti.
// Tarih: "24 Kasım", "24.11.2026", "bugün", "yarın", "bu hafta" + önce / sonra / kadar / itibaren. "MEBBİS'e göre": MEBBİS'ten okunan veri esas alınır.
import { S, gun, fark, iso, tarihOku, SINIFLAR, tamAd, sb, gerekliDireksiyon, kalanBorc, gecikenler, eksikEvrak, kursiyerDersleri } from './veri.js?v=234';
import * as GR from './gruplar.js?v=234';
import { e, tl, tarih, bos } from './ui.js?v=234';

const sade = v => String(v || '').toLocaleLowerCase('tr').replace(/[’'`]/g, '').replace(/\s+/g, ' ').trim();
const AY = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const LISTE_SOZ = /(^|\s)(öğrenci|ogrenci|aday|kursiyer|kimler|kimin|hangi|liste|listesi|kaç kişi|kişiler)/;   // \b Türkçe harfte çalışmaz
const KONU = [['teorik', /teorik/], ['esinav', /e-?\s?sınav/], ['uygulama', /uygulama sınav|direksiyon sınav|sürüş sınav/], ['direksiyon', /direksiyon|uygulama eğitim|direksiyon ders/], ['evrak', /evrak|belge(si)? eksik|sağlık rapor|adli sicil/], ['odeme', /borç|borcu|taksit|ödeme|tahsil/]];
const DURUM = [['gecikti', /gecik/], ['baslamadi', /başlama(mış|yan|dı)|hiç ders/], ['bitmedi', /bitme(miş|yen|di)|tamamlanma|eksik ders/], ['bitti', /bit(miş|en|ti|ecek|iyor)|tamamla(n|mış)|tamam/], ['suruyor', /devam eden|süren|sürüyor|devam ediyor/],
  ['girmedi', /girme(miş|yen|di)|katılma/], ['kaldi', /kal(mış|an|dı)(?![a-zçğıöşü])|başarısız/], ['gecti', /geç(miş|en|ti)(?![a-zçğıöşü])|başarılı/], ['eksik', /eksik|tamamlanmamış/], ['var', /olan|bulunan/]];
function tarihCoz(q) {
  let m = q.match(/(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?/), t = null;
  if (m) { const y = m[3] || gun(0).slice(0, 4); t = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  else if ((m = q.match(new RegExp('(\\d{1,2})\\s*(' + AY.join('|') + ')(?:\\s*(\\d{4}))?')))) t = `${m[3] || gun(0).slice(0, 4)}-${String(AY.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  else if (/(^|\s)bugün/.test(q)) t = gun(0); else if (/(^|\s)yarın/.test(q)) t = gun(1); else if (/bu hafta/.test(q)) { const d = tarihOku(gun(0)); d.setDate(d.getDate() + (7 - d.getDay()) % 7); t = iso(d); }
  if (!t || isNaN(tarihOku(t))) return null;
  const yon = /önce|öncesi|kadar|den evvel/.test(q) ? (/kadar/.test(q) ? '<=' : '<') : /sonra|itibaren|den beri/.test(q) ? (/itibaren/.test(q) ? '>=' : '>') : '=';
  return { t, yon };
}
// Soruyu anlar; kurs verisi sorusu değilse null (mevzuat asistanı devam eder)
export function coz(soru) {
  const q = sade(soru); if (!q || q.length < 6) return null;
  // birden çok koşul: "e-sınavı geçmiş, direksiyonu başlamamış" → her parçanın kendi konusu ve durumu; sonuç kesişim
  const parcalar = q.split(/,|;| ve | ama | fakat | ancak /).map(x => x.trim()).filter(Boolean), kosullar = [];
  parcalar.forEach(x => { const konu = (KONU.find(([, r]) => r.test(x)) || [])[0]; if (!konu) return; kosullar.push({ konu, durum: (DURUM.find(([, r]) => r.test(x)) || [])[0] || null, tarih: tarihCoz(x) }); });
  if (!LISTE_SOZ.test(q) || !kosullar.length) return null;
  const { konu, durum } = kosullar[0];
  if (/(^|\s)(nedir|ne demek|ne yapar|ne yapmalı|kaç saat|kaç gün|zorunlu mu|yasal mı|nasıl yapılır|gerekir mi|mevzuat|yönetmelik|madde)(?![a-zçğıöşü])/.test(q) && !/listesi|kimler|hangi öğrenci|hangi aday/.test(q)) return null;
  const sinif = (q.match(/\b(a1|a2|b1|be|c1e|c1|ce|d1e|d1|de|a|b|c|d|m|f|g)\s*sınıf/) || [])[1];
  const grup = sb(S.gruplar || []).find(g => g.ad && q.includes(sade(g.ad)));
  return { soru: String(soru).trim(), konu, durum, kosullar, meb: /mebbis/.test(q), sinif: sinif ? sinif.toUpperCase() : null, grup: grup ? grup.id : null };
}
const kosul = (t, x) => !x ? true : !t ? false : x.yon === '<' ? t < x.t : x.yon === '<=' ? t <= x.t : x.yon === '>' ? t > x.t : x.yon === '>=' ? t >= x.t : t === x.t;
// Öğrencinin konuya göre durumu: { tarih, durum: 'bitti'|'suruyor'|'baslamadi'|…, not, kaynak }
function hal(k, konu, meb) {
  if (konu === 'teorik') { const b = GR.teorikBitis(k); if (meb && (!b || b.kaynak !== 'MEBBİS')) return { durum: 'bilinmiyor', not: 'MEBBİS’te teorik program okunmadı' };
    if (!b) { const gerek = +((SINIFLAR[k.sinif] || {}).teorik || 0), tamam = (gerek && (k.teorik || 0) >= gerek) || ['Direksiyon', 'Sınav', 'Ehliyet'].includes(k.asama) || (k.esinav && k.esinav.sonuc === 'Geçti');
      return { durum: tamam ? 'bitti' : (k.teorik || 0) ? 'suruyor' : 'baslamadi', not: `${k.teorik || 0}/${gerek} saat · mdSinyal yoklaması` }; }
    return { tarih: b.tarih, durum: b.tarih <= gun(0) ? 'bitti' : 'suruyor', not: `${b.saat || ''} saat · ${b.kaynak === 'MEBBİS' ? 'MEBBİS' : 'plan'}`, kaynak: b.kaynak }; }
  if (konu === 'direksiyon') { const G = gerekliDireksiyon(k); if (!G) return { durum: 'yok' };
    if (meb) { const o = k.meb && k.meb.dersOzet; if (!o) return { durum: 'bilinmiyor', not: 'MEBBİS aday dosyası okunmadı' };
      return { tarih: o.son, durum: o.sayi >= G ? (o.son <= gun(0) ? 'bitti' : 'suruyor') : o.sayi ? 'bitmedi' : 'baslamadi', not: `MEBBİS’te ${o.sayi}/${G} ders`, kaynak: 'MEBBİS' }; }
    const l = kursiyerDersleri(k.id).filter(d => d.durum === 'Yapıldı' || d.durum === 'Planlandı').sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)), yap = l.filter(d => d.durum === 'Yapıldı').length + Math.max(0, (+k.direksiyon || 0) - kursiyerDersleri(k.id).filter(d => d.durum === 'Yapıldı').length);
    if (yap >= G) return { tarih: (l.filter(d => d.durum === 'Yapıldı').pop() || {}).tarih || '', durum: 'bitti', not: `${yap}/${G} ders` };
    if (yap + l.filter(d => d.durum === 'Planlandı').length >= G) return { tarih: (l[l.length - 1] || {}).tarih, durum: 'suruyor', not: `${yap}/${G} yapıldı, kalanı planlı` };
    return { durum: yap ? 'bitmedi' : 'baslamadi', not: `${yap}/${G} ders` }; }
  if (konu === 'esinav') { const x = k.esinav; if (!x) return { durum: 'girmedi' }; return { tarih: x.tarih || '', durum: x.sonuc === 'Geçti' ? 'gecti' : x.sonuc === 'Kaldı' ? 'kaldi' : 'girmedi', not: x.puan ? x.puan + ' puan' : '' }; }
  if (konu === 'uygulama') { const x = k.dsinav; if (!x) return { durum: 'girmedi', tarih: k.dsinavPlan || '' }; return { tarih: x.tarih || '', durum: x.sonuc === 'Geçti' ? 'gecti' : x.girmedi || x.sonuc === 'Girmedi' ? 'girmedi' : 'kaldi', not: (x.hak || '') + '. hak' }; }
  if (konu === 'evrak') { const x = eksikEvrak(k); return { durum: x.length ? 'eksik' : 'tamam', not: x.map(y => y[1]).join(', ') }; }
  if (konu === 'odeme') { const g = gecikenler(k), b = kalanBorc(k); return { durum: g.length ? 'gecikti' : b ? 'var' : 'tamam', tarih: g.length ? g[0].vade : '', not: b ? tl(b) : 'borcu yok' }; }
  return { durum: 'bilinmiyor' };
}
const UYAR = { bitti: ['bitti'], bitmedi: ['bitmedi', 'baslamadi', 'suruyor'], baslamadi: ['baslamadi'], suruyor: ['suruyor'], gecti: ['gecti'], kaldi: ['kaldi'], girmedi: ['girmedi'], eksik: ['eksik', 'bitmedi', 'baslamadi'], gecikti: ['gecikti'], var: ['var', 'gecikti'] };
const VARSAYILAN = { teorik: 'bitti', direksiyon: 'bitti', esinav: 'gecti', uygulama: 'gecti', evrak: 'eksik', odeme: 'var' };
const KONU_AD = { teorik: 'teorik dersleri', direksiyon: 'direksiyon eğitimi', esinav: 'e-sınavı', uygulama: 'uygulama sınavı', evrak: 'evrakı', odeme: 'ödemesi' };
const DURUM_AD = { bitti: 'bitmiş', bitmedi: 'bitmemiş', baslamadi: 'başlamamış', suruyor: 'süren', gecti: 'geçmiş', kaldi: 'kalmış', girmedi: 'girmemiş', eksik: 'eksik', gecikti: 'geciken', var: 'borcu olan', tamam: 'tamam' };
export function calistir(p) {
  const ks = (p.kosullar || [{ konu: p.konu, durum: p.durum, tarih: p.tarih }]).map(c => { const d = c.durum && UYAR[c.durum] ? c.durum : VARSAYILAN[c.konu]; return { ...c, d, kabul: UYAR[d] || [d] }; });
  const uyar = k => ks.every(c => { const h = hal(k, c.konu, p.meb); return c.kabul.includes(h.durum) && (!c.tarih || kosul(h.tarih, c.tarih)); });
  const l = sb(S.kursiyerler).filter(k => !k.kapali && (!p.sinif || k.sinif === p.sinif || (p.sinif === 'B' && /^B/.test(k.sinif))) && (!p.grup || k.teorikGrup === p.grup))
    .filter(uyar).map(k => ({ k, h: hal(k, ks[0].konu, p.meb) }))
    .sort((a, b) => String(a.h.tarih || '9').localeCompare(String(b.h.tarih || '9')) || tamAd(a.k).localeCompare(tamAd(b.k), 'tr'));
  const bilinmiyor = p.meb ? sb(S.kursiyerler).filter(k => !k.kapali && hal(k, p.konu, true).durum === 'bilinmiyor').length : 0;
  const yonAd = { '<': 'önce', '<=': 'kadar', '>': 'sonra', '>=': 'itibaren', '=': '' };
  const olcut = `${p.meb ? 'MEBBİS’e göre ' : ''}${ks.map(c => `${KONU_AD[c.konu]} ${DURUM_AD[c.d] || c.d}${c.tarih ? ` (${tarih(c.tarih.t)} ${yonAd[c.tarih.yon]})`.replace(' )', ')') : ''}`).join(', ')}${p.sinif ? ' · ' + p.sinif + ' sınıfı' : ''}${p.grup ? ' · ' + (GR.grupBul(p.grup) || {}).ad : ''} öğrenciler`;
  return { p, olcut, satirlar: l, bilinmiyor };
}
export function sonucHtml(r) {
  const s = r.satirlar;
  return `<div class="kart ks-kart"><div class="kart-bas"><h3>Kurs verisinden cevap</h3><small>${s.length} öğrenci</small>${s.length ? '<div class="sag"><button class="dg dg-cizgi dg-kucuk" data-ks-csv>CSV indir</button></div>' : ''}</div>
    <p class="ipucu" style="margin:8px 16px 0"><span><b>Anlaşılan:</b> ${e(r.olcut)}. Bu liste cihazınızdaki kurs verisinden çıkarıldı; yapay zekâya gönderilmedi.${r.bilinmiyor ? ` ${r.bilinmiyor} öğrencinin MEBBİS verisi okunmadığı için listede değil (MEB işlemleri › MEBBİS’ten güncelle).` : ''}</span></p>
    ${s.length ? `<div class="tablo-kap"><table class="tablo"><thead><tr><th>Öğrenci</th><th>Sınıf · grup</th><th>Tarih</th><th>Durum</th></tr></thead><tbody>${s.slice(0, 300).map(({ k, h }) => `<tr><td><a href="#/kursiyer/${k.id}" style="color:var(--murekkep);font-weight:600">${e(tamAd(k))}</a></td><td>${e(((SINIFLAR[k.sinif] || {}).ad || k.sinif).split(' ·')[0])}${GR.kursiyerGrubu(k) ? ' · ' + e(GR.kursiyerGrubu(k).ad) : ''}</td><td>${h.tarih ? tarih(h.tarih) : '—'}</td><td>${e(DURUM_AD[h.durum] || h.durum)}${h.not ? ' <small style="color:var(--soluk)">· ' + e(h.not) + '</small>' : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="kart-govde">${bos('Bu ölçüte uyan öğrenci yok', 'Soruyu farklı sözcüklerle deneyin ya da tarihi değiştirin.')}</div>`}</div>`;
}
export const csvSatirlari = r => [['Ad soyad', 'Telefon', 'Sınıf', 'Grup', 'Tarih', 'Durum', 'Not'], ...r.satirlar.map(({ k, h }) => [tamAd(k), k.tel || '', k.sinif, (GR.kursiyerGrubu(k) || {}).ad || '', h.tarih || '', DURUM_AD[h.durum] || h.durum, h.not || ''])];
export const ORNEKLER = ['MEBBİS’e göre direksiyon eğitimi 24 Kasım’dan önce biten adaylar', 'Teorik dersleri bitmiş öğrenciler', 'e-Sınavı geçmiş, direksiyonu başlamamış öğrenciler', 'Evrakı eksik öğrenciler', 'Taksiti geciken öğrenciler'];
