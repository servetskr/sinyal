// YON-063: kişisel görünüm tercihleri — kişi başına, cihazlar arası (S.kisisel[kişi]); açılışta veri gelmeden önce de
// uygulanabilsin diye bu cihazda da tutulur (localStorage 'sinyal-gorunum'). Yapışkan süzgeç ve sekme hatırlama cihaza özeldir.
import { S, kaydet, oturum } from './veri.js?v=234';
import { e } from './ui.js?v=234';

const YEREL = 'sinyal-gorunum';
export const TERCIH_VARSAYILAN = { tema: 'levha', yazi: 'normal', sayfaBasi: 0, yapiskan: false, sekmeHatirla: false, dugme: 'sag', kayitOtoIleri: true, gizliSutun: [] };
const kimlik = () => { try { const u = oturum.kullanici || {}; return String(u.uid || u.id || ''); } catch (x) { return ''; } };
const yerelOku = (a, v = {}) => { try { return JSON.parse(localStorage.getItem(a) || 'null') || v; } catch (x) { return v; } };
const yerelYaz = (a, v) => { try { localStorage.setItem(a, JSON.stringify(v)); } catch (x) { } };
export function tercihler() {
  let k = {}; try { k = ((S && S.kisisel) || {})[kimlik()] || {}; } catch (x) { }
  return { ...TERCIH_VARSAYILAN, ...yerelOku(YEREL), ...k };
}
export function tercihUygula() {
  const t = tercihler(), b = document.body; if (!b) return t;
  b.classList.toggle('tema-sade', t.tema === 'sade');
  b.classList.toggle('yazi-buyuk', t.yazi === 'buyuk');
  b.classList.toggle('yazi-kucuk', t.yazi === 'kucuk');
  b.classList.toggle('dugme-sol', t.dugme === 'sol');
  b.classList.toggle('suzgec-yapiskan', !!t.yapiskan);
  return t;
}
export function tercihYaz(ad, v) {
  if (!(ad in TERCIH_VARSAYILAN)) return;
  yerelYaz(YEREL, { ...yerelOku(YEREL), [ad]: v });
  const id = kimlik(); if (id && S && S.kurs) { S.kisisel = { ...(S.kisisel || {}), [id]: { ...((S.kisisel || {})[id] || {}), [ad]: v } }; kaydet(); }
  tercihUygula();
}
// yapışkan süzgeç: ekran başına son süzgeç (bu cihazda, kişiye göre)
export const suzgecOku = ekran => tercihler().yapiskan ? (yerelOku('sinyal-suzgec-' + kimlik())[ekran] || null) : null;
export const suzgecYaz = (ekran, v) => { if (!tercihler().yapiskan) return; const l = yerelOku('sinyal-suzgec-' + kimlik()); l[ekran] = v; yerelYaz('sinyal-suzgec-' + kimlik(), l); };
// sekme hatırlama: menüden sayfaya gelince en son açılan sekme
export const SEKMELI = ['ayarlar', 'meb', 'raporlar', 'mesajlar', 'sosyal'];
export const sekmeOku = ad => tercihler().sekmeHatirla ? (yerelOku('sinyal-sekme-' + kimlik())[ad] || null) : null;
export const sekmeYaz = (ad, hash) => { if (!tercihler().sekmeHatirla) return; const l = yerelOku('sinyal-sekme-' + kimlik()); if (l[ad] === hash) return; l[ad] = hash; yerelYaz('sinyal-sekme-' + kimlik(), l); };

export function tercihHtml() {
  const t = tercihler();
  const sec = (ad, l) => `<div class="secim" style="margin-top:8px">${l.map(([v, a]) => `<label><input type="radio" name="tc-${ad}" value="${v}" data-gorunum="${ad}" ${String(t[ad]) === String(v) ? 'checked' : ''}><span>${a}</span></label>`).join('')}</div>`;
  const tik = (ad, a, alt) => `<label class="ind-tik"><input type="checkbox" data-gorunum="${ad}" ${t[ad] ? 'checked' : ''}> ${a}${alt ? `<small style="display:block;color:var(--soluk);margin-left:26px">${alt}</small>` : ''}</label>`;
  return `<div style="display:grid;gap:16px">
    <div><b style="color:var(--murekkep)">Tema</b>${sec('tema', [['levha', 'Levha (mavi)'], ['sade', 'Sade (açık)']])}</div>
    <div><b style="color:var(--murekkep)">Yazı boyutu</b>${sec('yazi', [['kucuk', 'Küçük'], ['normal', 'Normal'], ['buyuk', 'Büyük']])}</div>
    <div><b style="color:var(--murekkep)">Listelerde sayfa başına kayıt</b>${sec('sayfaBasi', [[0, 'Hepsi'], [25, '25'], [50, '50'], [100, '100']])}<small style="color:var(--soluk)">Kursiyer listesinde; fazlası “Daha fazla göster” ile açılır.</small></div>
    <div><b style="color:var(--murekkep)">Pencere düğmeleri</b>${sec('dugme', [['sag', 'Sağda'], ['sol', 'Solda']])}</div>
    <div style="display:grid;gap:6px">${tik('yapiskan', 'Yapışkan süzgeç', 'Kursiyer listesindeki süzgeç sayfadan çıkınca da kalır; liste kayarken süzgeç üstte durur.')}${tik('kayitOtoIleri', 'Kayıtta adım bitince ilerle', 'Öğrenci kayıt formunda bir adımın zorunlu seçimleri tamamlanınca kısa bir beklemeyle sonraki adıma geçilir; Enter da ilerletir.')}${tik('sekmeHatirla', 'Sekmeyi hatırla', 'Ayarlar, MEB işlemleri, Raporlar, Mesajlar menüden açılınca en son baktığınız sekmede açılır.')}</div>
    <p style="font-size:13px;color:var(--soluk)">Tercihler ${e((oturum.kullanici || {}).ad || 'sizin')} hesabına kaydedilir; başka cihazdan girince de geçerlidir.</p></div>`;
}
// değişiklik dinleyicisi (Ayarlar › Görünüm ve kullanıcı menüsündeki pencere ortak)
export function tercihDegisti(t) {
  if (!t.matches || !t.matches('[data-gorunum]')) return false;
  const ad = t.dataset.gorunum, v = t.type === 'checkbox' ? t.checked : ad === 'sayfaBasi' ? +t.value : t.value;
  tercihYaz(ad, v); return true;
}
