// WhatsApp'tan gelen evrak: öğrenci belgenin fotoğrafını ya da PDF'ini kursun numarasına atar; belge doğru öğrencinin
// dosyasına, doğru başlığa düşer. Okunmayacak kadar bulanıksa işaretlenir, tek tuşla yeniden istenir.
import { S, kaydet, gun, EVRAKLAR, tamAd, islem, eksikEvrak, gonderimEkle, selam } from './veri.js?v=95';
import { e, pencere, kapatPencere, bildir, fotoKucult, ik } from './ui.js?v=95';

const rakam = x => String(x || '').replace(/\D/g, '');
const kucuk = s => String(s || '').toLocaleLowerCase('tr');
// Açıklamadaki kelimeden belge türü
const TUR_SOZ = [['saglik', /sağlık|saglik|rapor/], ['ogrenim', /diploma|öğrenim|ogrenim|mezun|okul/], ['adli', /adli|sicil|sabıka|sabika/], ['foto', /vesikalık|vesikalik|biyometrik|fotoğraf(ım)?$/], ['kimlik', /kimlik|nüfus|nufus|tc kart/], ['sozlesme', /sözleşme|sozlesme/]];
const turAd = key => (EVRAKLAR.find(x => x[0] === key) || [0, key])[1];

// Sahibi: önce gönderen numara (öğrencinin telefonu), yoksa son 7 günde evrak istediğimiz öğrenci
function sahibiBul(x) {
  const aktif = S.kursiyerler.filter(k => k.asama !== 'Ehliyet');
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
  const r = await fetch(new URL(S.kurs.waApi).origin + '/medya/' + encodeURIComponent(x.medya.id));
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
  kaydet(); return true;
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
