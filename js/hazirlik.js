// e-Sınava hazırlık: son denemeler, konu başarısı ve soru bankasında görülen soru oranından tek puan;
// yanlış yapılan sorular aralıklı tekrar takvimine girer (1, 3, 7, 14, 30 gün sonra yeniden sorulur).
import { gun } from './veri.js?v=97';
import { e, ilerleme } from './ui.js?v=97';
import { SORU_KONU } from './soruKonu.js?v=97';

const N = SORU_KONU.length;
const KAT = { trafik: ['Trafik ve çevre', 23], ilkyardim: ['İlk yardım', 12], motor: ['Motor ve araç tekniği', 9], adab: ['Trafik adabı', 6] };
export const ARALIK = [0, 1, 3, 7, 14, 30];

/* ---------- görülen sorular: soru başına 1 bit (öğrenci kaydında küçük kalsın) ---------- */
const bitler = k => { const b = new Uint8Array(Math.ceil(N / 8)); if (k.gorulen) { try { const s = atob(k.gorulen); for (let i = 0; i < Math.min(s.length, b.length); i++) b[i] = s.charCodeAt(i); } catch (x) { } } return b; };
export function gorulenEkle(k, liste) { const b = bitler(k); liste.forEach(i => { if (i >= 0 && i < N) b[i >> 3] |= 1 << (i & 7); }); k.gorulen = btoa(String.fromCharCode(...b)); }
export function gorulenSay(k) { if (!k.gorulen) return 0; let n = 0; bitler(k).forEach(x => { while (x) { n += x & 1; x >>= 1; } }); return n; }

/* ---------- aralıklı tekrar ---------- */
// sonuclar: [[soru sırası, doğru mu], ...]
export function tekrarGuncelle(k, sonuclar) {
  const t = k.tekrar = k.tekrar || {};
  sonuclar.forEach(([qi, dogru]) => {
    const x = t[qi];
    if (!dogru) t[qi] = [1, gun(ARALIK[1])];
    else if (x) { const kutu = x[0] + 1; if (kutu >= ARALIK.length) delete t[qi]; else t[qi] = [kutu, gun(ARALIK[kutu])]; }
  });
}
export const tekrarBugun = k => Object.entries(k.tekrar || {}).filter(([, x]) => x[1] <= gun(0)).map(([qi]) => +qi);
export const tekrarToplam = k => Object.keys(k.tekrar || {}).length;

/* ---------- hazırlık puanı ---------- */
const konuOran = (k, kn) => { const a = (k.konuAnaliz || {})[kn]; return a && a[1] >= 5 ? Math.round(a[0] / a[1] * 100) : null; };
export function hazirlik(k) {
  const den = (k.deneme || []).slice(-3), dOrt = den.length ? Math.round(den.reduce((a, b) => a + b, 0) / den.length) : 0;
  const konular = Object.entries(KAT).map(([kn, [ad, w]]) => ({ kn, ad, w, o: konuOran(k, kn) }));
  const konuP = Math.round(konular.reduce((a, x) => a + (x.o || 0) * x.w, 0) / 50);
  const gor = gorulenSay(k), kaps = Math.min(100, Math.round(gor / (N * 0.5) * 100));
  const puan = Math.round(dOrt * 0.5 + konuP * 0.3 + kaps * 0.2), gecen = den.filter(p => p >= 70).length;
  const durum = puan >= 75 && gecen >= 2 ? 'hazir' : puan >= 50 ? 'yaklasti' : 'calis';
  const oneri = [], tb = tekrarBugun(k).length, zayif = konular.filter(x => x.o == null || x.o < 70).sort((a, b) => (a.o ?? -1) - (b.o ?? -1));
  if (tb) oneri.push(`Bugün ${tb} tekrar sorun var`);
  if (den.length < 2) oneri.push(`${den.length ? 'Bir' : 'İki'} deneme sınavı daha çöz`);
  else if (gecen < 2) oneri.push('Son denemelerinden en az ikisinde 70’i geç');
  zayif.slice(0, 2).forEach(x => oneri.push(x.o == null ? `${x.ad} konusundan test çöz` : `${x.ad} konusunu çalış (%${x.o})`));
  if (kaps < 100 && oneri.length < 3) oneri.push(`Soru bankasının ${gor}/${N} sorusunu gördün; çözmeye devam`);
  return { puan, durum, dOrt, konuP, kaps, gor, deneme: den.length, gecen, konular, oneri };
}
const DURUM = { hazir: ['Sınava hazırsın', 'var(--yesil)'], yaklasti: ['Yaklaşıyorsun', 'var(--sari-koyu, #b07a00)'], calis: ['Biraz daha çalışmalısın', 'var(--kirmizi)'] };
const DURUM_PERSONEL = { hazir: 'e-Sınava hazır', yaklasti: 'Yaklaşıyor', calis: 'Hazır değil' };
// ogrenci: öğrencinin kendi ekranı (sen dili), değilse kurs personeli
export function hazirlikKarti(k, ogrenci) {
  const h = hazirlik(k), [ad, renk] = DURUM[h.durum];
  const cubuk = (et, v, alt) => `<div style="display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:baseline"><span style="font-size:13.5px">${et}</span><b class="mono" style="color:var(--murekkep)">%${v}</b><div style="grid-column:1/-1">${ilerleme(v, 100, v >= 70 ? 'yesil' : '')}</div>${alt ? `<small style="grid-column:1/-1;color:var(--soluk)">${alt}</small>` : ''}</div>`;
  return `<div class="kart" style="padding:16px 18px${ogrenci ? '' : ';margin-bottom:14px'}"><div style="display:flex;align-items:center;gap:14px">
      <div style="width:76px;height:76px;border-radius:50%;flex:none;display:grid;place-items:center;background:conic-gradient(${renk} ${h.puan * 3.6}deg, var(--cizgi-2, #e6e6e6) 0)"><div style="width:60px;height:60px;border-radius:50%;background:var(--panel, #fff);display:grid;place-items:center"><b style="font-family:var(--baslik);font-size:22px;color:var(--murekkep)">${h.puan}</b></div></div>
      <div><small style="color:var(--soluk)">${ogrenci ? 'e-Sınava hazırlığın' : 'e-Sınava hazırlık (öğrencinin çalışmasından)'}</small><b style="display:block;font-family:var(--baslik);font-size:19px;color:${renk}">${ogrenci ? ad : DURUM_PERSONEL[h.durum]}</b><small style="color:var(--soluk)">${h.deneme ? `Son ${h.deneme} deneme ortalaması ${h.dOrt}` : 'Henüz deneme sınavı yok'}</small></div></div>
    <div style="display:grid;gap:10px;margin-top:14px">${cubuk('Deneme sınavları', h.dOrt, h.deneme ? `${h.gecen}/${h.deneme} denemede 70 ve üstü` : '')}${cubuk('Konu başarısı', h.konuP, h.konular.filter(x => x.o != null).map(x => x.ad + ' %' + x.o).join(' · '))}${cubuk('Soru bankası', h.kaps, `${h.gor}/${N} soru görüldü`)}</div>
    ${h.oneri.length ? `<p style="font-size:13.5px;margin-top:12px"><b style="color:var(--murekkep)">${ogrenci ? 'Şimdi ne yapmalısın' : 'Öneri'}:</b> ${e(h.oneri.join(' · '))}</p>` : ''}</div>`;
}
