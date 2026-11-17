// MEBBİS aday evrak ekranlarının istediği bilgiler (belge değil, belge üzerindeki bilgiler):
// Öğrenim (SKT02003), Sağlık raporu (SKT02004), Sabıka/adli sicil (SKT02005), Parmak izi (SKT02010, menüde "İmza").
// Kayıt formunda ve öğrenci dosyasında girilir; "MEBBİS'e yaz" kayıtla birlikte bu ekranları da doldurur.
import { e, isaret } from './ui.js?v=223';
import { S, gun } from './veri.js?v=223';

export const OGRENIM_BELGELERI = ['Diploma', 'Mezuniyet Belgesi', 'Öğrenim Belgesi', 'Tasdikname', 'Geçici Mezuniyet Belgesi'];
// MEBBİS metin kuralı: " < > ' ! & = yasak, baş/son boşluk yasak, uzunluk sınırı
export const temiz = (v, n) => String(v || '').replace(/["<>'!&=]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 100);
const tarihGir = t => { const m = String(t || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(t || '').slice(0, 10); };
const tarihYaz = v => v ? v.split('-').reverse().join('.') : '';

/* ---------- Evrak tarih denetimi (uyarı, engel değil) ----------
   Kesin: belge tarihi gelecekte ya da doğumdan önce olamaz; biyometrik fotoğraf son 6 ayda çekilmiş olmalı (MTSK Yön. md.11/1-a-3).
   Sağlık raporu: MTSK süre koymuyor. Varsayılan 12 ay, Sağlık Raporları Yönetmeliği md.66/1'in genel kuralı (durum bildirir rapor, başka tarih yazmıyorsa
   1 yıl); sürücü raporuna uygulanışı teyit bekliyor. Raporda geçerlilik (bitiş) tarihi girildiyse ay hesabı yapılmaz, o tarih kullanılır.
   Adli sicil: mevzuatta süre yok; 6 ay kurs kararıdır (belirleyici olan Bakanlığın adli mercilerden teyidi). eyup-sorular-cevaplar.md madde 16.
   Süreler Ayarlar › MEB kuralları'ndan değişir; 0 yazılırsa o denetim kapanır. MEBBİS'e işlenmiş kayıtta süre uyarısı çıkmaz (belge kabul edilmiş). */
// Yeni Sağlık Raporları Yönetmeliği yürürlüğü (RG 19/5/2026); öncesinde verilen raporlar kendi süreleri bitene kadar geçerli (geçici md.1/2)
const SAGLIK_YON_TARIH = '2026-05-19';
export const BELGE_SURE = { saglikGecerlilikAy: 12, adliGecerlilikAy: 6, fotoGecerlilikAy: 6 };
export const belgeSure = key => { const v = S && S.kurs ? S.kurs[key] : undefined; return v === 0 ? 0 : +v > 0 ? +v : BELGE_SURE[key]; };
// Kurs Ayarlar'da kendi değerini girmediyse sağlık raporu süresi "teyit bekliyor" sayılır (fotoğrafın 6 ayı yönetmelikte yazılı; adli sicilin 6 ayı kurs kararı)
export const sureTeyitli = key => key === 'fotoGecerlilikAy' || key === 'adliGecerlilikAy' || !!(S && S.kurs && S.kurs[key] !== undefined);
// Geçersiz tarih (31.02 gibi) boş sayılır; yanlış uyarı üretmesin
const isoYap = t => { const x = String(t || '').trim(), m = x.match(/^(\d{2})[./](\d{2})[./](\d{4})$/), v = m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : ''; if (!v) return ''; const d = new Date(v + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === v ? v : ''; };
const ayEkleIso = (t, n) => { const [y, a, g] = t.split('-').map(Number), d = new Date(Date.UTC(y, a - 1 + n, g)); if (d.getUTCDate() !== g) d.setUTCDate(0); return d.toISOString().slice(0, 10); };
const ayFarki = (bas, bit) => { const [y1, a1, g1] = bas.split('-').map(Number), [y2, a2, g2] = bit.split('-').map(Number); return (y2 - y1) * 12 + (a2 - a1) - (g2 < g1 ? 1 : 0); };
const tYaz = t => t ? t.split('-').reverse().join('.') : '';
// k: kursiyer (yoksa yeni kayıt); ham: formdan okunan değerler (yyyy-aa-gg) kayıttakilerin yerine geçer
export function tarihUyarilari(k, ham = {}) {
  k = k || {}; const v = k.mebEvrak || {}, bugun = gun(0), l = [];
  const dogum = isoYap(ham.dogum !== undefined ? ham.dogum : k.dogumTarihi), ref = isoYap(k.kayit) || bugun;
  const belgeler = [
    ['saglik', 'Sağlık raporu', isoYap(ham.saglik !== undefined ? ham.saglik : (k.saglikRapor || {}).tarih), 'saglikGecerlilikAy', 'MTSK Yön. md.11/1-a-4 (sürücü olur raporu); süre yönetmelikte yok, 12 ay Sağlık Raporları Yön. md.66/1 genel kuralı'],
    ['adli', 'Adli sicil belgesi', isoYap(ham.adli !== undefined ? ham.adli : (v.adli || {}).tarih), 'adliGecerlilikAy', 'MTSK Yön. md.11/1-a-5 (barkotlu adli sicil belgesi); süre mevzuatta yok, kurs kararı'],
    ['ogrenim', 'Öğrenim belgesi', isoYap(ham.ogrenim !== undefined ? ham.ogrenim : (v.ogrenim || {}).tarih), null, ''],
    ['parmak', 'Parmak izi belgesi', isoYap(ham.parmak !== undefined ? ham.parmak : (v.parmak || {}).tarih), null, ''],
  ];
  const dg0 = k.dogrulama || {};
  belgeler.forEach(([alan, ad, t, sure, dayanak]) => {
    if (!t) return;
    if (t > bugun) return l.push({ alan, metin: `${ad} tarihi (${tYaz(t)}) bugünden sonra görünüyor; belgedeki tarihi kontrol edin.`, dayanak: 'Tarih denetimi' });
    if (dogum && t < dogum) return l.push({ alan, metin: `${ad} tarihi (${tYaz(t)}) doğum tarihinden önce; yanlış girilmiş olabilir.`, dayanak: 'Tarih denetimi' });
    // belgenin üzerindeki geçerlilik tarihi girildiyse (doğrulamada) ay hesabı yerine o tarih kullanılır (aşağıda)
    const ay = sure && !(alan === 'saglik' && dg0.saglik && isoYap(dg0.saglik.gecerlilik)) ? belgeSure(sure) : 0;
    // 19.05.2026'dan önce verilen sağlık raporu kendi süresi bitene kadar geçerli (Sağlık Raporları Yön. geçici md.1/2): 12 ay kuralı ona doğrudan uygulanmaz, uyarıya not eklenir
    const gecis = alan === 'saglik' && t < SAGLIK_YON_TARIH ? ` Rapor ${tYaz(SAGLIK_YON_TARIH)} öncesi: yeni Sağlık Raporları Yönetmeliği’ne göre kendi süresi bitene kadar geçerli; raporda yazan süreye bakın.` : '';
    if (ay && !k.mebIslendi && ayEkleIso(t, ay) < ref) l.push({ alan, metin: `${ad} ${k.kayit ? 'kayıt tarihinde' : 'bugün'} ${ayFarki(t, ref)} aylık; kurs ayarı en fazla ${ay} ay. ${gecis ? gecis.trim() : 'Yeni belge istenebilir.'}`, dayanak: dayanak + (gecis ? '; Sağlık Raporları Yön. geçici md.1/2' : '') + '; Ayarlar › MEB kuralları', teyit: !sureTeyitli(sure) });
  });
  const dg = k.dogrulama || {};
  [['saglik', 'Sağlık raporu'], ['adli', 'Adli sicil belgesi']].forEach(([x, ad]) => { const gs = dg[x] && isoYap(dg[x].gecerlilik); if (gs && gs < bugun) l.push({ alan: x, metin: `${ad} üzerindeki geçerlilik tarihi (${tYaz(gs)}) geçmiş.`, dayanak: 'Belgenin kendi geçerlilik tarihi (doğrulamada girildi)' }); });
  const ft = isoYap(k.fotoTarih), fa = belgeSure('fotoGecerlilikAy');
  if (ft && fa && !k.mebIslendi && ayEkleIso(ft, fa) < bugun) l.push({ alan: 'foto', metin: `Biyometrik fotoğraf ${tYaz(ft)} tarihinde eklendi, ${fa} aydan eski. MEBBİS'e gitmeden yenisini isteyin.`, dayanak: 'MTSK Yön. md.11/1-a-3 (son altı ayda çekilmiş biyometrik fotoğraf)' });
  return l;
}
export const tarihUyariHtml = l => l.length ? `<div class="ipucu uyari" style="display:block"><b style="display:flex;gap:6px;align-items:center;margin-bottom:4px">${isaret('uyari', 18)}Belge tarihi uyarıları <small style="font-weight:400;color:var(--soluk)">kayıt engellenmez</small></b>${l.map(x => `<p style="margin:4px 0 0;font-size:13.5px">${e(x.metin)} <small style="color:var(--soluk)">Dayanak: ${e(x.dayanak)}</small>${x.teyit ? ' <b style="color:var(--turuncu);font-size:12px">· süre teyit bekliyor</b>' : ''}</p>`).join('')}</div>` : '';
// Formda tarih değişince uyarılar yenilenir (kayıt formu ve öğrenci düzenleme formu; alan adları iki formda farklı)
const formDeger = (f, adlar) => { for (const n of adlar) { const el = f.querySelector(`[name="${n}"]`); if (el) return el.value || ''; } return undefined; };
function formUyariYenile(f) {
  const kutu = f.querySelector('[data-me-tarih]'); if (!kutu) return;
  const k = kutu.dataset.kid ? (S.kursiyerler || []).find(x => x.id === kutu.dataset.kid) : null;
  const h = tarihUyariHtml(tarihUyarilari(k, { dogum: formDeger(f, ['dogumTarihi', 'dogum']), saglik: formDeger(f, ['raporTarih', 'rtar']), adli: formDeger(f, ['meAdTarih']), ogrenim: formDeger(f, ['meOgTarih']), parmak: formDeger(f, ['mePiTarih']) }));
  kutu.innerHTML = h; kutu.style.display = h ? '' : 'none';
}
// B Engelli (B-EN) kursiyerde engel durumu varsayılan "Var" (sağlık raporunda engel kaydı olan aday). Kayıt formunda sınıf B-EN seçilince
// engel durumu elle değiştirilmediyse "Var" olur; elle seçilen değer korunur.
const ENGEL_VARSAYILAN = sinif => sinif === 'B-EN' ? 'Var' : 'Yok';
if (typeof document !== 'undefined') document.addEventListener('change', ev => { const t = ev.target; if (!t || !t.name) return; const f0 = t.closest('form');
  if (f0 && t.name === 'meSgOzur') t.dataset.elle = '1';
  if (f0 && t.name === 'sinif') { const oz = f0.querySelector('[name=meSgOzur]'); if (oz && !oz.dataset.elle) oz.value = ENGEL_VARSAYILAN(t.value); }
  if (!/^(dogumTarihi|dogum|raporTarih|rtar|meAdTarih|meOgTarih|mePiTarih)$/.test(t.name)) return; const f = t.closest('form'); if (f) formUyariYenile(f); });

export function evrakHtml(k) {
  const v = (k && k.mebEvrak) || {}, o = v.ogrenim || {}, a = v.adli || {}, p = v.parmak || {}, s = v.saglik || {}, oz = s.ozur || ENGEL_VARSAYILAN(k && k.sinif);
  const alan = (ad, et, deger, ek = '') => `<div class="alan"><label>${et}</label><input name="${ad}" value="${e(deger || '')}" autocomplete="off" ${ek}></div>`;
  const tarihAlan = (ad, et, deger) => `<div class="alan"><label>${et}</label><input name="${ad}" type="date" value="${e(tarihGir(deger))}"></div>`;
  const tu = tarihUyariHtml(tarihUyarilari(k));
  return `<div class="alan tam" data-me-tarih data-kid="${e((k && k.id) || '')}"${tu ? '' : ' style="display:none"'}>${tu}</div><details class="alan tam me-evrak" ${k && k.mebEvrak ? '' : ''}><summary style="cursor:pointer;font-weight:700;color:var(--murekkep)">MEBBİS evrak bilgileri <small style="font-weight:400;color:var(--soluk)">belgelerin üzerinde yazar; MEBBİS’e kayıtla birlikte gider</small></summary>
    <div class="form-izgara" style="margin-top:10px">
      <b class="tam" style="font-size:13.5px">Öğrenim belgesi</b>
      ${alan('meOgVeren', 'Belgeyi veren okul', o.veren, 'maxlength="100" placeholder="ör. Tepebaşı Anadolu Lisesi"')}
      <div class="alan"><label>Belge türü</label><select name="meOgTur"><option value="">Seçin</option>${OGRENIM_BELGELERI.map(x => `<option ${o.tur === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      ${tarihAlan('meOgTarih', 'Belge tarihi', o.tarih)}${alan('meOgSayi', 'Belge sayısı', o.sayi, 'maxlength="10"')}
      <b class="tam" style="font-size:13.5px">Sağlık raporu</b>
      <div class="alan"><label>Engel durumu</label><select name="meSgOzur"><option value="Yok" ${oz !== 'Var' ? 'selected' : ''}>Engeli yok</option><option value="Var" ${oz === 'Var' ? 'selected' : ''}>Engeli var</option></select>${k && k.sinif === 'B-EN' && oz !== 'Var' ? '<small style="color:var(--kirmizi)">B Engelli: engel durumu “Var” olmalı</small>' : ''}</div>
      ${alan('meSgRef', 'Rapor referans no (e-Nabız)', s.refNo, 'maxlength="30"')}
      <b class="tam" style="font-size:13.5px">Adli sicil (sabıka) belgesi</b>
      ${alan('meAdVeren', 'Belgeyi veren', a.veren || 'E-DEVLET', 'maxlength="100"')}${tarihAlan('meAdTarih', 'Belge tarihi', a.tarih)}${alan('meAdSayi', 'Belge sayısı', a.sayi, 'maxlength="10"')}
      <b class="tam" style="font-size:13.5px">Parmak izi belgesi</b>
      ${alan('mePiVeren', 'Belgeyi veren', p.veren, 'maxlength="100"')}${tarihAlan('mePiTarih', 'Belge tarihi', p.tarih)}${alan('mePiSayi', 'Belge sayısı', p.sayi, 'maxlength="10"')}
    </div></details>`;
}
export function evrakOku(f) {
  const g = n => (f.querySelector(`[name="${n}"]`) || {}).value || '';
  const blok = (veren, tarih, sayi) => (g(veren).trim() && (g(tarih) || g(sayi).trim())) ? { veren: temiz(g(veren)), tarih: tarihYaz(g(tarih)), sayi: temiz(g(sayi), 10) } : null;
  const o = blok('meOgVeren', 'meOgTarih', 'meOgSayi'); if (o) o.tur = g('meOgTur');
  const sg = { ozur: g('meSgOzur') || ENGEL_VARSAYILAN((f.querySelector('[name="sinif"]:checked') || f.querySelector('[name="sinif"]') || {}).value), refNo: temiz(g('meSgRef'), 30) };
  return { ogrenim: o, saglik: sg, adli: blok('meAdVeren', 'meAdTarih', 'meAdSayi'), parmak: blok('mePiVeren', 'mePiTarih', 'mePiSayi') };
}
// MEBBİS'e gidecek evrak paketi (motor: evrakYaz); eksik blok gönderilmez, eksik listesine yazılır
const trT = t => String(t || '').split('.').join('/');   // 07.12.2026 → 07/12/2026
export function evrakPaketi(k) {
  const v = k.mebEvrak || {}, l = {}, eksik = [];
  if (v.ogrenim && v.ogrenim.tur) l.ogrenim = { veren: v.ogrenim.veren, tur: v.ogrenim.tur, tarih: trT(v.ogrenim.tarih), sayi: v.ogrenim.sayi }; else eksik.push('öğrenim belgesi');
  l.saglik = { ozur: (v.saglik || {}).ozur || ENGEL_VARSAYILAN(k.sinif), refNo: (v.saglik || {}).refNo || '' };
  if (k.sinif === 'B-EN' && l.saglik.ozur !== 'Var') eksik.push('B Engelli: engel durumu Var olmalı');   // rapor no e-Nabız referans no ile aynı olmayabilir: yalnız elle girilen gider
  if (v.adli) l.adli = { veren: v.adli.veren, tarih: trT(v.adli.tarih), sayi: v.adli.sayi }; else eksik.push('adli sicil');
  if (v.parmak) l.parmak = { veren: v.parmak.veren, tarih: trT(v.parmak.tarih), sayi: v.parmak.sayi }; else eksik.push('parmak izi');
  return { l, eksik };
}
