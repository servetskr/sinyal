// KAY-033: belgeden okuma (yapay zekâ). Kimlik, ehliyet, sağlık raporu, adli sicil, öğrenim belgesi ve ikametgâh fotoğrafı ya da PDF'i
// okunur; bulunan değerler yalnız formdaki BOŞ alanlara, kullanıcı seçip onaylayınca yazılır. Dolu alan değiştirilmez (yalnız gösterilir).
// Okuma worker'ın belge/oku ucunda (KVKK: görüntü ve sonuç orada saklanmaz). PDF'in ilk sayfası tarayıcıda pdf.js ile JPEG'e çevrilir.
// Örnek kursta (demo) ağa gidilmez: uydurma bir örnek okuma gösterilir.
import { S, bulutKanca } from './veri.js?v=234';
import { e, ik, pencere, kapatPencere, bildir, fotoKucult } from './ui.js?v=234';
import { WORKER } from './bulut.js?v=234';

const TURLER = [['kimlik', 'Kimlik kartı'], ['ehliyet', 'Sürücü belgesi'], ['saglik', 'Sağlık raporu'], ['sabika', 'Adli sicil kaydı'], ['ogrenim', 'Öğrenim belgesi'], ['ikametgah', 'İkametgâh']];
const AD = { tc: 'T.C. kimlik no', ad: 'Ad', soyad: 'Soyad', adSoyad: 'Ad soyad', dogumTarihi: 'Doğum tarihi', babaAdi: 'Baba adı', anaAdi: 'Ana adı', dogumYeri: 'Doğum yeri', seriNo: 'Seri no',
  belgeNo: 'Belge no', siniflar: 'Sınıflar', verilisTarihi: 'Veriliş tarihi', kanGrubu: 'Kan grubu', raporTarihi: 'Rapor tarihi', raporNo: 'Rapor no', tani: 'Tanı', kurum: 'Sağlık kuruluşu',
  doktor: 'Doktor', karar: 'Karar', veren: 'Veren yer', nufusIl: 'Nüfus ili', belgeTarihi: 'Belge tarihi', okul: 'Okul', belgeTuru: 'Belge türü', adres: 'Adres' };
// okunan alan → kayıt formundaki alan (name); listede olmayanlar yalnız bilgi olarak gösterilir
const HEDEF = {
  kimlik: { tc: 'tc', ad: 'ad', soyad: 'soyad', dogumTarihi: 'dogumTarihi' },
  ehliyet: { tc: 'tc', ad: 'ad', soyad: 'soyad', dogumTarihi: 'dogumTarihi', belgeNo: 'mevcutNo', verilisTarihi: 'mevcutTarih' },
  saglik: { tc: 'tc', dogumTarihi: 'dogumTarihi', kanGrubu: 'kanGrubu', raporTarihi: 'raporTarih', raporNo: 'raporNo' },
  sabika: { tc: 'tc', dogumTarihi: 'dogumTarihi', belgeNo: 'meAdSayi', belgeTarihi: 'meAdTarih', veren: 'meAdVeren' },
  ogrenim: { belgeTuru: 'meOgTur', belgeNo: 'meOgSayi', belgeTarihi: 'meOgTarih', okul: 'meOgVeren' },
  ikametgah: { tc: 'tc', adres: 'adres' },
};
// öğrenim belgesinden öğrenim durumu (formdaki "Öğrenim durumu" listesine)
export const ogrenimDurumu = tur => /Üniversite Diploma/.test(tur) ? 'Lisans' : /Lise/.test(tur) ? 'Lise' : /Ortaokul/.test(tur) ? 'Ortaokul' : /İlköğretim/.test(tur) ? 'İlköğretim' : /İlkokul|Okur Yazar/.test(tur) ? 'İlkokul' : '';
const ORNEK = {
  kimlik: { tc: '10000000146', ad: 'DENEME', soyad: 'ÖRNEK', dogumTarihi: '2001-04-12', babaAdi: 'ALİ', anaAdi: 'AYŞE' },
  ehliyet: { tc: '10000000146', ad: 'DENEME', soyad: 'ÖRNEK', belgeNo: '123456', siniflar: 'B', verilisTarihi: '2020-05-04' },
  saglik: { tc: '10000000146', adSoyad: 'DENEME ÖRNEK', kanGrubu: 'A Rh+', raporTarihi: '2026-11-10', raporNo: 'SR-2026-0001', kurum: 'Örnek Devlet Hastanesi', karar: 'Sürücü olur' },
  sabika: { tc: '10000000146', belgeNo: 'ADL-0001', belgeTarihi: '2026-11-12', veren: 'e-Devlet', karar: 'Adli sicil kaydı yoktur' },
  ogrenim: { okul: 'Örnek Anadolu Lisesi', belgeTuru: 'Lise Diploma', belgeNo: '4567', belgeTarihi: '2019-06-14' },
  ikametgah: { adres: 'Örnek Mah. Deneme Sok. No: 1 Tepebaşı / Eskişehir', belgeTarihi: '2026-11-12' },
};

// PDF'in ilk sayfası → JPEG (pdf.js cdnjs'ten, yalnız gerekince yüklenir)
let pdfYuk = null;
const pdfjsYukle = () => pdfYuk || (pdfYuk = new Promise((ok, red) => {
  if (window.pdfjsLib) return ok(window.pdfjsLib);
  const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); };
  sc.onerror = () => { pdfYuk = null; red(new Error('PDF okuyucu yüklenemedi')); }; document.head.appendChild(sc);
}));
async function pdfIlkSayfa(dosya) {
  const L = await pdfjsYukle(), pdf = await L.getDocument({ data: new Uint8Array(await dosya.arrayBuffer()) }).promise, s = await pdf.getPage(1);
  const v0 = s.getViewport({ scale: 1 }), olcek = Math.min(2.5, 1600 / Math.max(v0.width, v0.height)), v = s.getViewport({ scale: olcek });
  const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
  await s.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
  return c.toDataURL('image/jpeg', 0.85);
}
export async function gorseleCevir(dosya) {
  if (/pdf/i.test(dosya.type) || /\.pdf$/i.test(dosya.name || '')) return pdfIlkSayfa(dosya);
  if (!/^image\//.test(dosya.type)) throw new Error('Fotoğraf ya da PDF seçin');
  return fotoKucult(dosya, 1600);
}
async function oku(tur, gorsel) {
  if (!S._bulut) { await new Promise(r => setTimeout(r, 700)); return { ok: true, tur, alanlar: { ...ORNEK[tur] }, ornek: true }; }
  const r = await fetch(WORKER + '/belge/oku', { method: 'POST', headers: { ...(await bulutKanca.yetki()), 'Content-Type': 'application/json' }, body: JSON.stringify({ tur, gorsel }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.hata || 'Belge okunamadı');
  return j;
}
// form alanına değer koy (select'te seçenek yoksa koymaz); doldurulanı işaretle
function koy(f, ad, deger) {
  const el = f.querySelector(`[name="${ad}"]`); if (!el || el.type === 'radio' || el.type === 'checkbox') return false;
  if (el.tagName === 'SELECT' && ![...el.options].some(o => (o.value || o.textContent) === deger)) return false;
  el.value = deger; el.classList.add('oku-dolu'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
const bos = (f, ad) => { const el = f.querySelector(`[name="${ad}"]`); return !!el && !String(el.value || '').trim(); };

// kap: kayıt formunun penceresi (içinde <form>). Açık pencere üstte açılır, kapanınca form aynen geri gelir.
export function belgeOkuAc(kap) {
  const f = kap.querySelector('form'); if (!f) return;
  let tur = 'kimlik';
  pencere({ baslik: 'Belgeden oku', ust: true, taslak: false,
    icerik: `<p style="font-size:14px;color:var(--soluk);margin:0 0 10px">Belgenin fotoğrafını çekin ya da PDF'ini seçin. Okunan bilgiler yalnız <b>boş</b> alanlara, siz onaylayınca yazılır.</p>
      <div class="secim" role="radiogroup" aria-label="Belge türü" style="flex-wrap:wrap;margin-bottom:12px">${TURLER.map(([k, a], i) => `<label><input type="radio" name="boTur" value="${k}" ${i ? '' : 'checked'}><span>${a}</span></label>`).join('')}</div>
      <label class="dg dg-ana" style="cursor:pointer;display:inline-flex">${ik('belge')}Fotoğraf çek ya da dosya seç<input type="file" accept="image/*,application/pdf" data-bo-dosya hidden></label>
      <div data-bo-sonuc style="margin-top:14px"></div>
      <p class="ipucu" style="margin-top:12px"><span>Okuma %100 doğru olmayabilir; yazılan bilgileri belgeyle karşılaştırın. Belgedeki kişisel veriler okuma için yapay zekâ sistemlerince işlenir; kişiden izin almak kurumun sorumluluğundadır. Görüntü saklanmaz.</span></p>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-bo-yaz disabled>Boş alanlara yaz</button>',
    onAc(p) {
      const sonuc = p.querySelector('[data-bo-sonuc]'), yazB = p.querySelector('[data-bo-yaz]');
      let okunan = null;
      p.addEventListener('change', async ev => {
        if (ev.target.name === 'boTur') { tur = ev.target.value; return; }
        if (!ev.target.matches('[data-bo-dosya]') || !ev.target.files[0]) return;
        const dosya = ev.target.files[0]; ev.target.value = '';
        sonuc.innerHTML = `<p style="font-size:14px">${ik('saat')} Okunuyor…</p>`; yazB.disabled = true; okunan = null;
        try {
          const g = await gorseleCevir(dosya), j = await oku(tur, g); okunan = j;
          const H = HEDEF[tur], l = Object.entries(j.alanlar || {});
          if (!l.length) { sonuc.innerHTML = `<p style="font-size:14px;color:var(--turuncu)">Belgede okunabilen bilgi bulunamadı. Daha net, düz ve ışıklı bir fotoğrafla tekrar deneyin.</p>`; return; }
          sonuc.innerHTML = `${j.ornek ? '<p style="font-size:13px;color:var(--soluk);margin:0 0 6px">Örnek kurs: ağa gidilmedi, örnek okuma gösteriliyor.</p>' : ''}<ul class="liste">${l.map(([k, v]) => {
            const hedef = H[k], yer = hedef && f.querySelector(`[name="${hedef}"]`), dolu = yer && !bos(f, hedef);
            return `<li><label style="display:flex;gap:10px;align-items:flex-start;width:100%">${hedef && yer ? `<input type="checkbox" data-bo-al="${e(k)}" ${dolu ? '' : 'checked'}>` : '<span style="width:18px"></span>'}<span style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(AD[k] || k)}</b> <span>${e(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('.') : v)}</span><small style="display:block;color:var(--soluk)">${!hedef || !yer ? 'yalnız bilgi (formda alanı yok)' : dolu ? 'formda dolu: ' + e(yer.value) + ' · seçerseniz değiştirilir' : 'boş alana yazılacak'}</small></span></label></li>`;
          }).join('')}</ul>`;
          yazB.disabled = !p.querySelector('[data-bo-al]');
        } catch (x) { sonuc.innerHTML = `<p style="font-size:14px;color:var(--kirmizi)">${e(x.message || 'Belge okunamadı')}</p>`; }
      });
      yazB.addEventListener('click', () => {
        if (!okunan) return; const H = HEDEF[tur]; let n = 0;
        p.querySelectorAll('[data-bo-al]:checked').forEach(c => { const k = c.dataset.boAl; if (koy(f, H[k], okunan.alanlar[k])) n++; });
        if (tur === 'ogrenim' && okunan.alanlar.belgeTuru && p.querySelector('[data-bo-al="belgeTuru"]:checked')) { const d = ogrenimDurumu(okunan.alanlar.belgeTuru); if (d && koy(f, 'ogrenim', d)) n++; }
        kapatPencere();
        bildir(n ? `${n} alan dolduruldu; sarı alanları belgeyle karşılaştırın` : 'Yazılacak alan seçilmedi', n ? 'tamam' : 'uyari');
      });
    } });
}
