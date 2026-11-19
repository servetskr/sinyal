// Duyurular ve sürüm notları (DIG-040): kurslara yeni özellik ve MEBBİS değişikliği duyurusu. Kaynak duyurular.json (sitede, her açılışta sunucudan).
// Önemli ve okunmamış duyuru kurs ana ekranında bir kez pencere olarak açılır: "Devamını oku", "Okudum, tekrar gösterme", "Sonra" (bu oturumda bir daha açılmaz).
// Okundu kaydı kullanıcı başına kurs verisinde (S.duyuruOkundu[kullanıcı] = [id…]): öteki cihazda tekrar çıkmaz. Bütün duyurular tarih sırasıyla "Duyurular" penceresinde.
import { S, oturum, kaydet, tarihOku } from './veri.js?v=235';
import { pencere, kapatPencere, e } from './ui.js?v=235';

let liste = null, yukleniyor = null, buOturumdaKapandi = false;
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const tarihYaz = t => { try { const d = tarihOku(t); return `${d.getDate()} ${AY[d.getMonth()]} ${d.getFullYear()}`; } catch (x) { return t; } };
export async function yukle() {
  if (liste) return liste; if (yukleniyor) return yukleniyor;
  yukleniyor = fetch('duyurular.json?surum=' + Date.now().toString(36), { cache: 'no-store' }).then(r => r.ok ? r.json() : { duyurular: [] }).then(j => (liste = (j.duyurular || []).filter(x => x && x.id && x.baslik).sort((a, b) => String(b.tarih).localeCompare(String(a.tarih))))).catch(() => (liste = []));
  return yukleniyor;
}
const kim = () => (oturum.kullanici && (oturum.kullanici.id || oturum.kullanici.ad)) || 'cihaz';
const rol = () => (oturum.kullanici && oturum.kullanici.rol) || '';
const bana = x => !x.kime || !x.kime.length || x.kime.includes(rol());
const okunanlar = () => new Set(((S.duyuruOkundu || {})[kim()]) || []);
function okunduYaz(ids) { if (!ids.length) return; const k = kim(), o = { ...(S.duyuruOkundu || {}) }; o[k] = [...new Set([...(o[k] || []), ...ids])].slice(-200); S.duyuruOkundu = o; kaydet(); }
export const okunmamis = () => (liste || []).filter(x => bana(x) && !okunanlar().has(x.id));
const kart = (x, acik) => `<article class="dy-kart" data-dy="${e(x.id)}"><small class="dy-tarih">${e(tarihYaz(x.tarih))}</small><h3>${e(x.baslik)}</h3><p>${e(x.ozet || '')}</p>${x.metin ? `<div class="dy-metin"${acik ? '' : ' hidden'}>${String(x.metin).split(/\n+/).map(p => `<p>${e(p)}</p>`).join('')}</div>${acik ? '' : '<button type="button" class="dy-devam" data-dy-devam>Devamını oku</button>'}` : ''}</article>`;
// Kurs ana ekranında çağrılır: önemli ve okunmamış duyuru varsa bir kez pencere
export async function goster() {
  if (buOturumdaKapandi || !oturum.kullanici || ['ogrenci', 'usta'].includes(rol()) || (oturum.kullanici && oturum.kullanici.ziyaretci && !S._demoDuyuru)) return;
  await yukle(); const l = okunmamis().filter(x => x.onemli); if (!l.length || document.querySelector('.perde')) return;
  pencere({ baslik: l.length > 1 ? `${l.length} yeni duyuru` : 'Yeni duyuru', icerik: `<div class="dy-liste">${l.map(x => kart(x, false)).join('')}</div>`,
    altlik: '<button class="dg dg-cizgi" data-dy-sonra>Sonra</button><button class="dg dg-ana" data-dy-okudum>Okudum, tekrar gösterme</button>',
    onAc(p) { p.addEventListener('click', ev => {
      const d = ev.target.closest('[data-dy-devam]'); if (d) { const m = d.closest('.dy-kart').querySelector('.dy-metin'); if (m) m.hidden = false; d.remove(); return; }
      if (ev.target.closest('[data-dy-okudum]')) { okunduYaz(l.map(x => x.id)); kapatPencere(); }
      if (ev.target.closest('[data-dy-sonra]')) { buOturumdaKapandi = true; kapatPencere(); } }); } });
}
// Bütün duyurular (zaman çizelgesi); açılınca okunmamışlar okundu sayılır
export async function listeAc() {
  await yukle(); const l = (liste || []).filter(bana), yeni = okunanlar();
  pencere({ baslik: 'Duyurular', icerik: l.length ? `<div class="dy-liste dy-cizelge">${l.map(x => kart(x, true).replace('<article class="dy-kart"', `<article class="dy-kart${yeni.has(x.id) ? '' : ' dy-yeni'}"`)).join('')}</div>` : '<p>Henüz duyuru yok.</p>', altlik: '<button class="dg dg-ana" data-kapat>Kapat</button>' });
  okunduYaz(l.map(x => x.id));
}
