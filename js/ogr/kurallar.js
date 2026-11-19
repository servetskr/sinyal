// Kurallar ve sık sorulanlar (MEV-009): öğrenci ve öğretmen uygulamasında mevzuat araması.
// Veri veri/mevzuat/sss-uygulama.json (derlemin SSS'sinden; kime gösterileceği 'kim' alanında). İnternet yoksa ya da dosya inmezse ekran bunu söyler.
// Arama telefonda, bağlantısız: soru, farklı söylenişleri, kısa cevap ve ayrıntıda Türkçe sadeleştirilmiş kelime eşleşmesi.
import { esc, oi, sayfaBas, geri, bolum, kart, bos, not, stilEkle } from './ui.js?v=235';

let veri = null, sozu = null, hata = '';
const durum = { q: '', konu: '', acik: '' };
const nrm = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9 ]/g, ' ');
const kok = w => w.length > 5 ? w.slice(0, 5) : w;
const esle = (w, y) => { const n = Math.min(w.length, y.length); return n >= 3 && w.slice(0, n) === y.slice(0, n) && (n >= 4 || w.length === y.length); };
const BOS = new Set(['icin', 'ile', 'nasil', 'neden', 'nedir', 'olur', 'olursa', 'zaman', 'hangi', 'kadar', 'gerek', 'var', 'yok', 'mi', 'ne']);
const kelimeler = s => nrm(s).split(/\s+/).filter(w => w.length > 2 && !BOS.has(w)).map(kok);
export function yukle() {
  if (veri || sozu) return sozu || Promise.resolve(veri);
  sozu = fetch(new URL('../../veri/mevzuat/sss-uygulama.json', import.meta.url).href + '?v=235').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(j => { veri = (j.sorular || []).map(x => ({ ...x, ara: kelimeler([x.soru, ...(x.esler || []), x.kisa, ...(x.ayrinti || [])].join(' ')), baslikAra: kelimeler([x.soru, ...(x.esler || [])].join(' ')) })); hata = ''; return veri; })
    .catch(() => { hata = 'Sorular yüklenemedi; internet bağlantınızı kontrol edip yeniden açın.'; sozu = null; return null; });
  return sozu;
}
// rol: 'ogrenci' | 'usta'; öncelik o rolün soruları, ardından ötekiler
function sonuclar(rol) {
  const l = (veri || []).filter(x => !durum.konu || x.konu === durum.konu), q = kelimeler(durum.q);
  // arama yokken: konu seçiliyse o konunun hepsi (önce bu kişiye yazılanlar), seçili değilse yalnız bu kişiye yazılanlar
  if (!q.length) return durum.konu ? [...l.filter(x => x.kim.includes(rol)), ...l.filter(x => !x.kim.includes(rol))] : l.filter(x => x.kim.includes(rol)).slice(0, 40);
  // her kelime soruda ya da cevapta geçmeli (ekler farklı olabilir: 'dersi' ~ 'dersler'); soruda geçen kelime daha çok sayılır
  // hiçbiri bütün kelimeleri taşımıyorsa en az yarısını taşıyanlar gösterilir
  // aynı kelime ek farkıyla eşleşenden (gece ~ geçerken) önde gelir
  const en = (w, l2) => l2.reduce((m, y) => Math.max(m, y === w ? 2 : esle(w, y) ? 1 : 0), 0);
  const puanla = x => { let p = 0, bulunan = 0; for (const w of q) { const b = en(w, x.baslikAra), a = b ? 0 : en(w, x.ara); if (b || a) bulunan++; p += b * 3 + a; } return { x, p: p + (x.kim.includes(rol) ? 0.5 : 0), bulunan }; };
  const hepsi = l.map(puanla), tam = hepsi.filter(o => o.bulunan === q.length);
  return (tam.length ? tam : hepsi.filter(o => o.bulunan && o.bulunan >= q.length / 2)).sort((a, b) => b.p - a.p).slice(0, 30).map(o => o.x);
}
const KISA = { ogrenci: 'Kurs, sınav ve trafik kurallarıyla ilgili sık sorulanlar', usta: 'Ders, sınav ve görevle ilgili sık sorulanlar' };
export function ekran(rol, { geriAttrs, geriEtiket = 'Geri', yenile }) {
  stilEkle('ox-kural', `.ox-kural-ara{display:flex;align-items:center;gap:10px;padding:0 14px;height:50px;border-radius:14px;background:var(--ox-kart);border:1.5px solid var(--ox-cizgi);margin:2px 0 12px;color:var(--ox-ikincil)}.ox-kural-ara:focus-within{border-color:var(--ox-mavi)}
    .ox-kural-ara input{flex:1;border:0;outline:0;font:inherit;font-size:16px;background:transparent;min-width:0;color:var(--ox-bas)}
    .ox-kural-konu{display:flex;gap:8px;overflow-x:auto;padding:0 0 12px;scrollbar-width:none}.ox-kural-konu::-webkit-scrollbar{display:none}
    .ox-kural-konu button{flex:0 0 auto;border:1.5px solid var(--ox-cizgi);background:var(--ox-kart);border-radius:999px;padding:0 14px;min-height:36px;font:inherit;font-size:13px;font-weight:700;color:var(--ox-metin)}
    .ox-kural-konu button.secili{background:var(--ox-bas);border-color:var(--ox-bas);color:#fff}
    .ox-kural-s{padding:0;overflow:hidden}.ox-kural-s+.ox-kural-s{margin-top:8px}
    .ox-kural-s>button{display:flex;width:100%;text-align:left;gap:10px;align-items:flex-start;padding:14px 16px;background:none;border:0;font:inherit;color:var(--ox-bas)}
    .ox-kural-s>button b{flex:1;font-size:15px;line-height:1.35}
    .ox-kural-s>button .ox-i{flex:0 0 auto;margin-top:2px;transition:transform .2s}
    .ox-kural-s.acik>button .ox-i{transform:rotate(180deg)}
    .ox-kural-c{padding:0 16px 14px;font-size:14.5px;line-height:1.5;color:var(--ox-metin)}
    .ox-kural-c p{margin:0 0 8px}.ox-kural-c ul{margin:0 0 8px 18px;display:grid;gap:4px}
    .ox-kural-dk{background:var(--ox-sari-acik);border-radius:10px;padding:8px 10px;font-size:13.5px;margin:6px 0 8px}
    .ox-kural-dy{font-size:12px;color:var(--ox-ikincil)}`);
  const ust = geri(geriEtiket, geriAttrs) + sayfaBas('Kurallar ve sık sorulanlar', KISA[rol] || '');
  if (!veri) { yukle().then(() => yenile && yenile()); return { html: ust + (hata ? kart(bos('uyari', 'Açılamadı', hata)) : kart(`<p style="padding:16px">Sorular yükleniyor…</p>`)) }; }
  const konular = [...new Set(veri.filter(x => x.kim.includes(rol)).map(x => x.konu))];
  const l = sonuclar(rol);
  const html = ust + `<label class="ox-kural-ara">${oi('ara')}<input type="search" data-kural-q value="${esc(durum.q)}" placeholder="Örn. gece dersi, sınav hakkı" enterkeyhint="search" aria-label="Kurallarda ara"></label>
    <div class="ox-kural-konu" role="tablist"><button type="button" class="${durum.konu ? '' : 'secili'}" data-kural-konu="">Hepsi</button>${konular.map(k => `<button type="button" class="${durum.konu === k ? 'secili' : ''}" data-kural-konu="${esc(k)}">${esc(k)}</button>`).join('')}</div>
    ${bolum(durum.q ? `${l.length} sonuç` : 'Sık sorulanlar')}
    <div data-kural-liste>${l.length ? l.map(x => `<div class="ox-kart ox-kural-s${durum.acik === x.id ? ' acik' : ''}"><button type="button" data-kural-ac="${esc(x.id)}" aria-expanded="${durum.acik === x.id}"><b>${esc(x.soru)}</b>${oi('asagi')}</button>${durum.acik === x.id ? `<div class="ox-kural-c"><p><b>${esc(x.kisa)}</b></p>${x.ayrinti.length ? `<ul>${x.ayrinti.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}${x.adimlar.length ? `<ol style="margin:0 0 8px 18px">${x.adimlar.map(a => `<li>${esc(a)}</li>`).join('')}</ol>` : ''}${x.dikkat ? `<p class="ox-kural-dk">${esc(x.dikkat)}</p>` : ''}<p class="ox-kural-dy">Dayanak: ${esc(x.dayanak.map(d => d.join(' ')).join(' · '))}</p></div>` : ''}</div>`).join('')
      : kart(bos('ara', 'Sonuç yok', 'Başka kelimelerle deneyin ya da kursunuza sorun.'))}</div>
    ${not('Cevaplar MTSK Yönetmeliği ve trafik mevzuatına dayanır; kursunuza özel durumlar için kursunuza danışın.')}`;
  return {
    html,
    baglan(kap) {
      const inp = kap.querySelector('[data-kural-q]'); let zm = 0;
      if (inp) inp.addEventListener('input', () => { clearTimeout(zm); zm = setTimeout(() => { durum.q = inp.value; durum.acik = ''; const p = inp.selectionStart; yenile && yenile(); setTimeout(() => { const y = document.querySelector('[data-kural-q]'); if (y) { y.focus(); try { y.setSelectionRange(p, p); } catch (x) { } } }, 0); }, 250); });
      kap.addEventListener('click', ev => {
        const k = ev.target.closest('[data-kural-konu]'); if (k) { durum.konu = k.dataset.kuralKonu; durum.acik = ''; return yenile && yenile(); }
        const a = ev.target.closest('[data-kural-ac]'); if (a) { durum.acik = durum.acik === a.dataset.kuralAc ? '' : a.dataset.kuralAc; return yenile && yenile(); }
      });
    },
  };
}
