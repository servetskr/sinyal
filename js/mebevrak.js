// MEBBİS aday evrak ekranlarının istediği bilgiler (belge değil, belge üzerindeki bilgiler):
// Öğrenim (SKT02003), Sağlık raporu (SKT02004), Sabıka/adli sicil (SKT02005), Parmak izi (SKT02010, menüde "İmza").
// Kayıt formunda ve öğrenci dosyasında girilir; "MEBBİS'e yaz" kayıtla birlikte bu ekranları da doldurur.
import { e } from './ui.js?v=203';

export const OGRENIM_BELGELERI = ['Diploma', 'Mezuniyet Belgesi', 'Öğrenim Belgesi', 'Tasdikname', 'Geçici Mezuniyet Belgesi'];
// MEBBİS metin kuralı: " < > ' ! & = yasak, baş/son boşluk yasak, uzunluk sınırı
export const temiz = (v, n) => String(v || '').replace(/["<>'!&=]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 100);
const tarihGir = t => { const m = String(t || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(t || '').slice(0, 10); };
const tarihYaz = v => v ? v.split('-').reverse().join('.') : '';

export function evrakHtml(k) {
  const v = (k && k.mebEvrak) || {}, o = v.ogrenim || {}, a = v.adli || {}, p = v.parmak || {}, s = v.saglik || {};
  const alan = (ad, et, deger, ek = '') => `<div class="alan"><label>${et}</label><input name="${ad}" value="${e(deger || '')}" autocomplete="off" ${ek}></div>`;
  const tarihAlan = (ad, et, deger) => `<div class="alan"><label>${et}</label><input name="${ad}" type="date" value="${e(tarihGir(deger))}"></div>`;
  return `<details class="alan tam me-evrak" ${k && k.mebEvrak ? '' : ''}><summary style="cursor:pointer;font-weight:700;color:var(--murekkep)">MEBBİS evrak bilgileri <small style="font-weight:400;color:var(--soluk)">belgelerin üzerinde yazar; MEBBİS’e kayıtla birlikte gider</small></summary>
    <div class="form-izgara" style="margin-top:10px">
      <b class="tam" style="font-size:13.5px">Öğrenim belgesi</b>
      ${alan('meOgVeren', 'Belgeyi veren okul', o.veren, 'maxlength="100" placeholder="ör. Tepebaşı Anadolu Lisesi"')}
      <div class="alan"><label>Belge türü</label><select name="meOgTur"><option value="">Seçin</option>${OGRENIM_BELGELERI.map(x => `<option ${o.tur === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      ${tarihAlan('meOgTarih', 'Belge tarihi', o.tarih)}${alan('meOgSayi', 'Belge sayısı', o.sayi, 'maxlength="10"')}
      <b class="tam" style="font-size:13.5px">Sağlık raporu</b>
      <div class="alan"><label>Engel durumu</label><select name="meSgOzur"><option value="Yok" ${s.ozur !== 'Var' ? 'selected' : ''}>Engeli yok</option><option value="Var" ${s.ozur === 'Var' ? 'selected' : ''}>Engeli var</option></select></div>
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
  const sg = { ozur: g('meSgOzur') || 'Yok', refNo: temiz(g('meSgRef'), 30) };
  return { ogrenim: o, saglik: sg, adli: blok('meAdVeren', 'meAdTarih', 'meAdSayi'), parmak: blok('mePiVeren', 'mePiTarih', 'mePiSayi') };
}
// MEBBİS'e gidecek evrak paketi (motor: evrakYaz); eksik blok gönderilmez, eksik listesine yazılır
const trT = t => String(t || '').split('.').join('/');   // 07.12.2026 → 07/12/2026
export function evrakPaketi(k) {
  const v = k.mebEvrak || {}, l = {}, eksik = [];
  if (v.ogrenim && v.ogrenim.tur) l.ogrenim = { veren: v.ogrenim.veren, tur: v.ogrenim.tur, tarih: trT(v.ogrenim.tarih), sayi: v.ogrenim.sayi }; else eksik.push('öğrenim belgesi');
  l.saglik = { ozur: (v.saglik || {}).ozur || 'Yok', refNo: (v.saglik || {}).refNo || '' };   // rapor no e-Nabız referans no ile aynı olmayabilir: yalnız elle girilen gider
  if (v.adli) l.adli = { veren: v.adli.veren, tarih: trT(v.adli.tarih), sayi: v.adli.sayi }; else eksik.push('adli sicil');
  if (v.parmak) l.parmak = { veren: v.parmak.veren, tarih: trT(v.parmak.tarih), sayi: v.parmak.sayi }; else eksik.push('parmak izi');
  return { l, eksik };
}
