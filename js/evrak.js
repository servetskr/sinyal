// WhatsApp'tan gelen evrak: öğrenci belgenin fotoğrafını ya da PDF'ini kursun numarasına atar; belge doğru öğrencinin
// dosyasına, doğru başlığa düşer. Okunmayacak kadar bulanıksa işaretlenir, tek tuşla yeniden istenir.
import { S, kaydet, gun, EVRAKLAR, tamAd, islem, eksikEvrak, gonderimEkle, selam, evrakKaynak } from './veri.js?v=195';
import { e, pencere, kapatPencere, bildir, fotoKucult, ik, waIstek, waAc, apiAcik } from './ui.js?v=195';

const rakam = x => String(x || '').replace(/\D/g, '');
const kucuk = s => String(s || '').toLocaleLowerCase('tr');
// Açıklamadaki kelimeden belge türü
const TUR_SOZ = [['saglik', /sağlık|saglik|rapor/], ['ogrenim', /diploma|öğrenim|ogrenim|mezun|okul/], ['adli', /adli|sicil|sabıka|sabika/], ['foto', /vesikalık|vesikalik|biyometrik|fotoğraf(ım)?$/], ['kimlik', /kimlik|nüfus|nufus|tc kart/], ['sozlesme', /sözleşme|sozlesme/]];
const turAd = key => (EVRAKLAR.find(x => x[0] === key) || [0, key])[1];

// Sahibi: önce gönderen numara (öğrencinin telefonu), yoksa son 7 günde evrak istediğimiz öğrenci
function sahibiBul(x) {
  const aktif = S.kursiyerler.filter(k => k.asama !== 'Ehliyet');
  if (x.tel) { const k = aktif.find(k => rakam(k.tel).slice(-10) === String(x.tel).slice(-10)); if (k) return { k, neden: 'telefon numarası' }; }
  if (x.son4) { const l = aktif.filter(k => rakam(k.tel).slice(-4) === String(x.son4)); if (l.length === 1) return { k: l[0], neden: 'telefon numarası' }; }
  const sinir = Date.now() - 7 * 864e5;
  const g = (S.gonderimler || []).find(m => new Date(m.zaman).getTime() > sinir && /evrak|belge/i.test((m.tur || '') + ' ' + (m.metin || '')) && aktif.some(k => tamAd(k) === m.kime));
  if (g) return { k: aktif.find(k => tamAd(k) === g.kime), neden: 'son evrak isteği', istek: g };
  return null;
}
function turBul(metin, k, istek) {
  const t = kucuk(metin);
  for (const [key, r] of TUR_SOZ) if (r.test(t) && (!k || !k.evrak[key])) return { key, tahmin: false };
  const eksik = k ? eksikEvrak(k).map(x => x[0]).filter(key => !(k.evrakYuklenen || {})[key]) : [];
  if (istek) { const iste = EVRAKLAR.find(([key, ad]) => eksik.includes(key) && kucuk(istek.metin).includes(kucuk(ad).split(' ')[0])); if (iste) return { key: iste[0], tahmin: true }; }
  return { key: eksik[0] || (k ? eksikEvrak(k)[0] || [null] : [null])[0] || 'saglik', tahmin: true };
}
// Bulanıklık: küçültülmüş gri görüntüde Laplace varyansı (düşükse yazı seçilmiyor demektir)
async function netlik(veri) {
  const im = new Image(); im.src = veri; await im.decode();
  const g = 360, o = g / Math.max(im.width, im.height), w = Math.round(im.width * o), h = Math.round(im.height * o);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
  const p = x.getImageData(0, 0, w, h).data, gri = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gri[i] = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2];
  let t = 0, t2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let z = 1; z < w - 1; z++) { const i = y * w + z, l = 4 * gri[i] - gri[i - 1] - gri[i + 1] - gri[i - w] - gri[i + w]; t += l; t2 += l * l; n++; }
  return n ? Math.round(t2 / n - (t / n) ** 2) : 0;
}
export const BULANIK_SINIR = 250;  // net belge fotoğrafında binlerce, belirgin bulanıkta ~100
async function indir(x) {
  const r = await waIstek('/medya/' + encodeURIComponent(x.medya.id));
  if (!r.ok) throw new Error('indirilemedi');
  const b = await r.blob();
  if (/^image\//.test(x.medya.mime || b.type)) { const veri = await fotoKucult(b, 1600); return { veri, tur: 'resim', net: await netlik(veri).catch(() => null) }; }
  if (/pdf/.test(x.medya.mime || b.type) && b.size <= 700 * 1024) return { veri: await new Promise(coz => { const f = new FileReader(); f.onload = () => coz(f.result); f.readAsDataURL(b); }), tur: 'pdf', net: null };
  return { veri: null, tur: 'pdf', net: null, buyuk: true };
}
function dosyayaKoy(k, key, b, ek) {
  k.evrakYuklenen = k.evrakYuklenen || {};
  k.evrakYuklenen[key] = { tarih: gun(0), dosya: ek.dosya || (b.tur === 'pdf' ? 'whatsapp.pdf' : 'whatsapp.jpg'), boyut: b.veri ? b.veri.length : 0, tur: b.tur, veri: b.veri, kanal: 'WhatsApp', net: b.net, bulanik: b.net != null && b.net < BULANIK_SINIR, tahmin: !!ek.tahmin, buyuk: !!b.buyuk };
}
// gelenKontrol'den çağrılır
export async function evrakGeldi(x) {
  let b; try { b = await indir(x); } catch (y) { bildir('WhatsApp’tan bir belge geldi ama indirilemedi; birkaç dakika sonra tekrar denenecek', 'uyari'); return false; }
  const s = sahibiBul(x);
  if (!s) {
    S.sahipsizEvrak = S.sahipsizEvrak || [];
    S.sahipsizEvrak.unshift({ id: x.id, zaman: x.zaman, ad: x.ad || '', son4: x.son4 || '', metin: x.metin || '', ...b, dosya: x.medya.dosya || '' });
    islem('WhatsApp’tan belge geldi', 'sahibi belli değil · ···' + (x.son4 || ''));
    bildir('WhatsApp’tan bir belge geldi; kime ait olduğunu seçin (Genel bakış)', 'wp');
    kaydet(); return true;
  }
  const t = turBul(x.metin, s.k, s.istek);
  dosyayaKoy(s.k, t.key, b, { dosya: x.medya.dosya, tahmin: t.tahmin });
  islem('WhatsApp’tan evrak geldi', tamAd(s.k) + ' · ' + turAd(t.key) + (t.tahmin ? ' (tür tahmini)' : '') + ' · ' + s.neden);
  gonderimEkle(S.kurs.ad, tamAd(s.k) + ' “' + turAd(t.key) + '” belgesini WhatsApp’tan gönderdi; kontrol bekliyor', 'Öğrenci evrakı');
  bildir(`${tamAd(s.k)} WhatsApp’tan ${turAd(t.key).toLocaleLowerCase('tr')} gönderdi${b.net != null && b.net < BULANIK_SINIR ? ' · bulanık olabilir' : ''}`, b.net != null && b.net < BULANIK_SINIR ? 'uyari' : 'wp');
  kaydet();
  // otomatik gönderim açıksa öğrenciye alındı cevabı ve kalan belgeler (bulanıksa yeniden iste)
  if (apiAcik()) {
    const kalan = eksikEvrak(s.k).filter(([x]) => x !== 'sozlesme' && !(s.k.evrakYuklenen || {})[x]).map(([, ad]) => ad.toLocaleLowerCase('tr'));
    const bulanik = b.net != null && b.net < BULANIK_SINIR;
    waAc(s.k.tel, bulanik ? `${selam(s.k)} gönderdiğiniz ${turAd(t.key).toLocaleLowerCase('tr')} bulanık görünüyor; yazılar okunacak şekilde, ışıkta yeniden çekip gönderebilir misiniz?` : `${selam(s.k)} ${turAd(t.key).toLocaleLowerCase('tr')} belgeniz alındı, teşekkürler.${kalan.length ? ' Kalan belgeler: ' + kalan.join(', ') + '.' : ' Belgeleriniz tamam; kurs kontrol edip kaydınıza işleyecek.'}`, 'WhatsApp', tamAd(s.k), false, 'ÖĞRENCİ', 'Evrak alındı');
  }
  return true;
}

// Sahibi bulunamayan belgeler: kime ait ve hangi belge olduğunu seçin
export function sahipsizPencere(yenile) {
  const l = S.sahipsizEvrak || []; if (!l.length) return bildir('Bekleyen belge yok');
  const x = l[0], adaylar = S.kursiyerler.filter(k => k.asama !== 'Ehliyet').sort((a, b) => (eksikEvrak(b).length ? 1 : 0) - (eksikEvrak(a).length ? 1 : 0) || tamAd(a).localeCompare(tamAd(b), 'tr'));
  pencere({
    baslik: 'WhatsApp’tan gelen belge · ' + (l.length > 1 ? '1/' + l.length : 'kime ait?'), genis: true,
    icerik: `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start" class="sahipsiz">
      <div>${x.veri ? (x.tur === 'pdf' ? `<p>PDF belge · ${e(x.dosya || '')}</p>` : `<img src="${x.veri}" alt="Gelen belge" style="width:100%;border-radius:8px;border:1px solid var(--cizgi)">`) : '<p>Belge büyük olduğu için önizlenemiyor; WhatsApp’tan açın.</p>'}
        ${x.bulanik ? `<p class="ipucu uyari" style="margin-top:8px">${ik('uyari')}<span>Bulanık olabilir; yazılar okunmuyorsa yeniden isteyin.</span></p>` : ''}</div>
      <div><p style="margin-bottom:10px;color:var(--soluk);font-size:14px">${e(x.ad || 'WhatsApp')} · ···${e(x.son4)} · ${new Date(x.zaman).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}${x.metin && !/^\(/.test(x.metin) ? '<br>“' + e(x.metin) + '”' : ''}</p>
        <div class="alan" style="margin-bottom:10px"><label>Öğrenci</label><select class="girdi" data-sahip>${adaylar.map(k => `<option value="${k.id}">${e(tamAd(k))}${eksikEvrak(k).length ? ' · ' + eksikEvrak(k).length + ' eksik' : ''}</option>`).join('')}</select></div>
        <div class="alan"><label>Hangi belge?</label><select class="girdi" data-tur>${EVRAKLAR.map(([key, ad]) => `<option value="${key}">${e(ad)}</option>`).join('')}</select></div></div></div>`,
    altlik: `<button class="dg dg-cizgi" data-sil style="margin-right:auto">Belgeyi sil</button><button class="dg dg-cizgi" data-kapat>Sonra</button><button class="dg dg-ana" data-ekle>Dosyaya ekle</button>`,
    onAc(d) {
      const sec = d.querySelector('[data-sahip]'), tur = d.querySelector('[data-tur]');
      const turSec = () => { const k = S.kursiyerler.find(y => y.id === sec.value); const t = turBul(x.metin, k, null); tur.value = t.key; };
      sec.addEventListener('change', turSec); turSec();
      d.querySelector('[data-ekle]').addEventListener('click', () => {
        const k = S.kursiyerler.find(y => y.id === sec.value); dosyayaKoy(k, tur.value, x, { dosya: x.dosya });
        S.sahipsizEvrak = l.filter(y => y !== x); islem('WhatsApp belgesini dosyaya ekledi', tamAd(k) + ' · ' + turAd(tur.value)); kaydet(); kapatPencere();
        bildir(tamAd(k) + ' dosyasına eklendi; onaylamayı unutmayın'); if (yenile) yenile(); if (S.sahipsizEvrak.length) setTimeout(() => sahipsizPencere(yenile), 250);
      });
      d.querySelector('[data-sil]').addEventListener('click', () => { S.sahipsizEvrak = l.filter(y => y !== x); islem('WhatsApp belgesini sildi', '···' + x.son4); kaydet(); kapatPencere(); if (yenile) yenile(); });
    },
  });
}
// Yanlış başlığa düşen belgeyi başka başlığa taşı
export function evrakTasi(k, eskiKey, yeniKey) {
  const y = (k.evrakYuklenen || {})[eskiKey]; if (!y || eskiKey === yeniKey) return;
  k.evrakYuklenen[yeniKey] = { ...y, tahmin: false }; delete k.evrakYuklenen[eskiKey];
  islem('Evrak başlığını düzeltti', tamAd(k) + ' · ' + turAd(eskiKey) + ' → ' + turAd(yeniKey)); kaydet();
}
export const yenidenIsteMetni = (k, key, bulanik) => `${selam(k)} ${bulanik ? 'gönderdiğiniz ' + turAd(key).toLocaleLowerCase('tr') + ' fotoğrafı okunmuyor.' : turAd(key).toLocaleLowerCase('tr') + ' belgeniz eksik ya da uygun değil.'} Belgeyi düz bir zemine koyup, gölge düşürmeden ve yazıları net seçilecek şekilde yeniden çekip bu numaraya WhatsApp’tan gönderebilirsiniz.`;

// MEBBİS belge yüklemede JPEG kabul etmez, PDF ister. Belge fotoğrafını tarayıcıda tek sayfalık A4 PDF'e çevirir:
// fotoğraf en fazla 1600 px'e küçültülür, JPEG olarak (DCTDecode) PDF'e gömülür; 1 MB'ı geçerse kalite, sonra boyut düşürülür.
const PDF_SINIR = 950 * 1024;
const dosyaAdi = s => String(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
// onload: decode() görünmeyen sekmede saniyelerce bekleyebiliyor; drawImage zaten çözer
const resimAc = veri => new Promise((ok, red) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => red(new Error('resim açılamadı')); im.src = veri; });
// Fotoğrafı döndürüp (0/90/180/270) küçültülmüş tuvale çizer; saydam alan beyaz olur
function tuval(im, donme, uzun) {
  const o = Math.min(1, uzun / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * o)), h = Math.max(1, Math.round(im.naturalHeight * o)), yan = donme % 180 !== 0;
  const c = document.createElement('canvas'); c.width = yan ? h : w; c.height = yan ? w : h;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.translate(c.width / 2, c.height / 2); x.rotate(donme * Math.PI / 180); x.drawImage(im, -w / 2, -h / 2, w, h);
  return c;
}
// Tek JPEG'li en küçük geçerli PDF: katalog, sayfa ağacı, A4 sayfa (fotoğraf yataysa yatay A4, 1 cm kenar), görüntü, içerik, bilgi
function pdfYaz(jpeg, w, h, baslik) {
  const [W, H] = w > h ? [841.89, 595.28] : [595.28, 841.89], m = 28.35, o = Math.min((W - 2 * m) / w, (H - 2 * m) / h);
  const f = n => n.toFixed(2), gw = w * o, gh = h * o, ciz = `q ${f(gw)} 0 0 ${f(gh)} ${f((W - gw) / 2)} ${f((H - gh) / 2)} cm /Im0 Do Q`;
  const utf16 = s => '<FEFF' + Array.from({ length: s.length }, (_, i) => s.charCodeAt(i).toString(16).padStart(4, '0')).join('').toUpperCase() + '>';
  const enc = new TextEncoder(), parca = [], yer = []; let n = 0;
  const ekle = p => { const b = typeof p === 'string' ? enc.encode(p) : p; parca.push(b); n += b.length; };
  const nesne = (no, sozluk, akis) => { yer[no] = n; ekle(`${no} 0 obj\n${sozluk}\n`); if (akis) { ekle('stream\n'); ekle(akis); ekle('\nendstream\n'); } ekle('endobj\n'); };
  ekle(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));  // %PDF-1.4 ve ikili işaret satırı
  nesne(1, '<< /Type /Catalog /Pages 2 0 R >>');
  nesne(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  nesne(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  nesne(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
  nesne(5, `<< /Length ${ciz.length} >>`, ciz);
  nesne(6, `<< /Title ${utf16(baslik || 'Belge')} /Producer (mdSinyal) >>`);
  const xref = n;
  ekle('xref\n0 7\n0000000000 65535 f \n' + yer.slice(1).map(x => String(x).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parca, { type: 'application/pdf' });
}
export async function resimPdf(veri, donme = 0, baslik = '') {
  const im = await resimAc(veri);
  let uzun = 1600, kalite = 0.8, c, jpeg;
  for (let i = 0; i < 10; i++) {
    c = tuval(im, donme, uzun);
    // toDataURL eşzamanlı; toBlob arka planda/gizli sekmede saniyelerce bekleyebiliyor
    const u = c.toDataURL('image/jpeg', kalite); if (!u.startsWith('data:image/jpeg')) throw new Error('JPEG üretilemedi');
    const s = atob(u.slice(u.indexOf(',') + 1)); jpeg = new Uint8Array(s.length); for (let j = 0; j < s.length; j++) jpeg[j] = s.charCodeAt(j);
    if (jpeg.length + 2048 <= PDF_SINIR) break;
    if (kalite > 0.55) kalite = Math.round((kalite - 0.1) * 100) / 100; else uzun = Math.round(uzun * 0.8);
  }
  return pdfYaz(jpeg, c.width, c.height, baslik);
}
function blobIndir(blob, ad) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
// Tek belgeyi MEB için PDF olarak üretir (indirmeden). kaynak: 'foto' | 'pdf' | 'yuklenen' | boş (önce onaylı olan)
export async function evrakPdf(k, key, { kaynak, donme = 0 } = {}) {
  const x = evrakKaynak(k, key, kaynak); if (!x) throw new Error('belge yok');
  const blob = x.tur === 'pdf' ? await (await fetch(x.veri)).blob() : await resimPdf(x.veri, donme, tamAd(k) + ' - ' + turAd(key));
  return blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
}
export async function evrakPdfIndir(k, key, { kaynak, donme = 0, ad, sessiz = false } = {}) {
  try {
    const blob = await evrakPdf(k, key, { kaynak, donme });
    blobIndir(blob, dosyaAdi(ad || tamAd(k) + ' - ' + turAd(key)).replace(/(\.pdf)?$/i, '.pdf'));
    if (!sessiz) { islem('Evrakı PDF olarak indirdi', tamAd(k) + ' · ' + turAd(key)); kaydet(); bildir(`${turAd(key)} PDF olarak indirildi · ${Math.max(1, Math.round(blob.size / 1024))} KB`); }
    return blob;
  } catch (y) { bildir(turAd(key) + ' PDF’e çevrilemedi', 'uyari'); return null; }
}
// Dosyadaki bütün belgeler, her biri ayrı PDF (tarayıcı birden fazla indirmeye bir kez izin isteyebilir)
export async function tumEvrakPdf(k) {
  const l = EVRAKLAR.filter(([key]) => evrakKaynak(k, key));
  if (!l.length) return bildir('Bu dosyada görüntüsü olan belge yok', 'uyari');
  let n = 0;
  for (const [key] of l) { if (await evrakPdfIndir(k, key, { sessiz: true })) n++; await new Promise(r => setTimeout(r, 450)); }
  if (!n) return;
  islem('Evrakları PDF olarak indirdi', tamAd(k) + ' · ' + n + ' belge'); kaydet();
  bildir(n + ' belge PDF olarak indirildi');
}
// Önizleme penceresindeki “Döndür” ve “PDF indir” düğmeleri; görüntü img[data-onizle]. al() → { k, key, kaynak }
export function pdfOnizleme(d, al) {
  let donme = 0, im = null;
  const img = d.querySelector('[data-onizle]');
  d.querySelectorAll('[data-dondur]').forEach(b => b.addEventListener('click', async () => {
    if (!img) return;
    try { const { k, key, kaynak } = al(); im = im || await resimAc(evrakKaynak(k, key, kaynak).veri); donme = (donme + 90) % 360; img.src = tuval(im, donme, 1600).toDataURL('image/jpeg', 0.85); } catch (y) { bildir('Fotoğraf döndürülemedi', 'uyari'); }
  }));
  d.querySelectorAll('[data-pdf-indir]').forEach(b => b.addEventListener('click', async () => {
    const { k, key, kaynak } = al(); b.disabled = true;
    await evrakPdfIndir(k, key, { kaynak, donme }); b.disabled = false;
  }));
}
