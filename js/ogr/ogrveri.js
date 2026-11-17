// Öğren ortak verisi: konu listesi, ilerleme, yarım ders, kapak levhaları ve içerik yükleme (Öğren ekranları ve ders oynatıcı birlikte kullanır)
import { MUFREDAT } from '../ogrenci.js?v=218';

export const UNITE_AD = { trafik: 'Trafik ve çevre', ilkyardim: 'İlk yardım', motor: 'Araç tekniği', adab: 'Trafik adabı' };
// konu kapağı: o konuyu en iyi anlatan doğrulanmış levha; yoksa ünitenin levhası
export const KAPAK = {
  'trafik-1': 'T-19', 'trafik-2': 'T-20', 'trafik-3': 'T-16', 'trafik-4': 'T-21', 'trafik-5': 'TT-25', 'trafik-6': 'TT-27', 'trafik-7': 'P-3a',
  'trafik-8': 'B-49a', 'trafik-9': 'B-20', 'trafik-12': 'TT-30', 'trafik-13': 'T-26', 'trafik-14': 'T-12', 'trafik-15': 'T-37', 'trafik-16': 'TT-24',
  'trafik-20': 'T-13', 'motor-2': 'B-26', 'motor-11': 'B-24', 'adab-3': 'T-11', 'adab-5': 'T-20',
};
export const UNITE_KAPAK = { trafik: 'T-20', motor: 'B-24', adab: 'T-11' };
// İlk yardım bilgi işareti (mavi levha, beyaz zemin üstünde kırmızı haç): levha kütüphanesinde yok, burada çizilir
export const ILKYARDIM_SVG = '<svg viewBox="0 0 120 120" role="img" aria-label="İlk yardım"><rect x="18" y="8" width="84" height="104" rx="8" fill="#0a4da2"/><rect x="24" y="14" width="72" height="92" rx="5" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="31" y="24" width="58" height="58" fill="#fff"/><path d="M53 31h14v16h16v14H67v16H53V61H37V47h16z" fill="#d52b1e"/></svg>';

let LV = null, SR = null, DR = null;
export const veriler = () => ({ LV, SR, DR });
export const levhaYukle = () => LV ? Promise.resolve(LV) : import('../levha.js?v=218').then(m => (LV = m)).catch(() => (LV = { LEVHA: {} }));
export const yukle = () => Promise.all([levhaYukle(), SR || import('../sorular.js?v=218').then(m => (SR = m.SORULAR)), DR || import('../dersler.js?v=218').then(m => (DR = m.DERSLER))]);
export const onYukle = cb => { if (!LV) levhaYukle().then(() => cb && cb()); };

export const kapakSvg = id => { const key = id.replace(/-\d+$/, ''); const kod = KAPAK[id] || UNITE_KAPAK[key]; if (!kod) return ILKYARDIM_SVG; const l = LV && LV.LEVHA[kod]; return l ? l.svg : ''; };
export const konular = () => MUFREDAT.flatMap(([key, , , bas]) => bas.map((b, i) => ({ id: key + '-' + (i + 1), key, no: i + 1, ad: b })));
export const bitti = (k, id) => !!(k.okunan || {})[id];
export const sonuc = (k, id) => (k.dersSonuc || {})[id];
export const YARIM = 'sinyal-ders-yarim';
export const yarimOku = k => { try { const y = JSON.parse(localStorage.getItem(YARIM) || 'null'); return y && y.k === k.id ? y : null; } catch (x) { return null; } };
// ek: { sor: [qi...], cevap: [[qi, seçilen]...] } — derse dönünce aynı sorular ve verilen cevaplar geri gelir (eski kayıtlarda yoktur)
export const yarimYaz = (k, id, adim, top, ek = {}) => { try { localStorage.setItem(YARIM, JSON.stringify({ k: k.id, id, adim, top, ...ek })); } catch (x) { } };
export const yarimSil = () => { try { localStorage.removeItem(YARIM); } catch (x) { } };
export function siradaki(k) {
  const y = yarimOku(k), l = konular();
  if (y && l.some(x => x.id === y.id) && !bitti(k, y.id)) return { ...l.find(x => x.id === y.id), adim: y.adim, top: y.top };
  return l.find(x => !bitti(k, x.id)) || null;
}
export const sayac = (k, key) => { const l = konular().filter(x => x.key === key); return [l.filter(x => bitti(k, x.id)).length, l.length]; };


// Öğren sekmesinin alt ekranı (modül sayfası, tüm konular, deneme girişi, çalışma araçları…). null = Öğren ana ekranı.
// Değerler: 'trafik' | 'ilkyardim' | 'motor' | 'adab' (modül sayfası), 'tum' ya da 'tum:<modül>' (tüm konular),
// 'deneme' | 'araclar' | 'test-ayar' | 'tekrar' | 'yanlislar' (sinav.js), 'tehlike' | 'etkilesim' | 'etkilesim:<sekme>' | 'direksiyon' (araclar.js)
const ALT_ANAHTAR = 'sinyal-og-alt';
let alt = (() => { try { return sessionStorage.getItem(ALT_ANAHTAR) || null; } catch (x) { return null; } })();
export const altEkran = () => alt;
export const altAc = a => { alt = a || null; try { if (alt) sessionStorage.setItem(ALT_ANAHTAR, alt); else sessionStorage.removeItem(ALT_ANAHTAR); } catch (x) { } };
export const altKapat = () => altAc(null);
