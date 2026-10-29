import { S, kaydet, kursiyer, egitmen, arac, tamAd, SINIFLAR, islem, gonderimEkle, yerelZaman, eksikEvrak } from './veri.js?v=32';
import { e, tl, ik, isaret, bildir, tamTarih, pencere, kapatPencere, waAc } from './ui.js?v=32';
import { sozlesmeMaddeleri } from './sayfalar3.js?v=32';

/* ================= UZAKTAN İMZA =================
   1) Kurs "WhatsApp'tan imzaya gönder" der: belge özeti linke paketlenir, kursun anahtarıyla mühürlenir,
      WhatsApp kursiyerin numarasına hazır mesajla açılır.
   2) Kursiyer linki açar (giriş gerekmez), belgeyi okur, parmağıyla imzalar. İmza dönüş linkine paketlenir,
      WhatsApp kursun hattına hazır mesajla açılır; kursiyer gönderir.
   3) Kurs dönüş linkine dokunur: mühür ve belge özeti doğrulanır, imza kayda (sözleşme / takip formu) işlenir. */

const b64 = u8 => { let s = ''; u8.forEach(c => { s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function paketle(o) {
  const json = JSON.stringify(o);
  if (typeof CompressionStream === 'undefined') return 'j' + b64(new TextEncoder().encode(json));
  const akis = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return 'z' + b64(new Uint8Array(await new Response(akis).arrayBuffer()));
}
async function paketAc(t) {
  const bayt = unb64(t.slice(1));
  if (t[0] === 'j') return JSON.parse(new TextDecoder().decode(bayt));
  const akis = new Blob([bayt]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(akis).text());
}
async function muhur(metin) {
  if (!S.imzaAnahtari) { S.imzaAnahtari = b64(crypto.getRandomValues(new Uint8Array(24))); kaydet(); }
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(S.imzaAnahtari), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(metin)))).slice(0, 22);
}
const adres = () => location.origin + location.pathname;
export { waAc };
const kursWp = () => S.kurs.wp || '';

function belgeModeli(tur, k, dersIdleri) {
  const kurs = { ad: S.kurs.ad, tel: S.kurs.tel, adres: S.kurs.adres, yetkili: S.kurs.yetkili, wp: kursWp() };
  const kisi = { ad: tamAd(k), tc: k.tc ? k.tc.slice(0, 3) + '•••••' + k.tc.slice(-3) : '', tel: k.tel };
  if (tur === 'sozlesme') return { kurs, kisi, sinif: SINIFLAR[k.sinif].ad, kayit: k.kayit, odeme: { toplam: k.odeme.toplam, pesin: k.odeme.pesin, pesinTarih: k.odeme.pesinTarih, taksit: k.odeme.taksitler.map(t => [t.vade, t.tutar]), indirim: k.odeme.indirim || null }, madde: sozlesmeMaddeleri(k) };
  return { kurs, kisi, sinif: SINIFLAR[k.sinif].ad, ders: dersIdleri.map(id => S.dersler.find(d => d.id === id)).filter(Boolean).map(d => [d.tarih, d.bas ? d.bas + '–' + d.bit : d.saat, egitmen(d.egitmen).ad, d.arac ? arac(d.arac).plaka : '', d.sure || null]) };
}

// Kurs tarafı: imza isteği oluştur ve WhatsApp'ı aç.
export async function imzaIste(tur, k, dersIdleri = []) {
  if (tur === 'ders' && !dersIdleri.length) return bildir('İmzası eksik ders yok', 'uyari');
  const belge = belgeModeli(tur, k, dersIdleri), ozet = await muhur(JSON.stringify(belge));
  const id = 'i' + Date.now().toString(36);
  const m = await muhur([id, tur, k.id, ozet].join('|'));
  const link = adres() + '#/imza/' + await paketle({ v: 1, id, tur, k: k.id, ozet, m, belge });
  S.imzaTalepleri = (S.imzaTalepleri || []).filter(t => !(t.durum === 'bekliyor' && t.kursiyer === k.id && t.tur === tur && (tur === 'sozlesme' || dersIdleri.every(x => t.dersler.includes(x)))));
  S.imzaTalepleri.push({ id, tur, kursiyer: k.id, dersler: dersIdleri, ozet, tarih: yerelZaman(), durum: 'bekliyor' });
  const ne = tur === 'sozlesme' ? 'kurs sözleşmeni' : (dersIdleri.length > 1 ? dersIdleri.length + ' direksiyon dersinin' : 'direksiyon dersinin') + ' takip formunu';
  const metin = `Merhaba ${k.ad}, ${S.kurs.ad} olarak ${ne} imzalamanı rica ediyoruz. Linke dokun, okuyup parmağınla imzala:\n${link}`;
  islem('İmzaya gönderdi', tamAd(k) + ' · ' + (tur === 'sozlesme' ? 'sözleşme' : dersIdleri.length + ' ders')); gonderimEkle(tamAd(k), (tur === 'sozlesme' ? 'Sözleşme' : 'Takip formu') + ' imza linki', 'İmza isteği'); kaydet();
  waAc(k.tel, metin);
  return id;
}
export const bekleyenImza = (k, tur) => (S.imzaTalepleri || []).filter(t => t.kursiyer === k.id && t.durum === 'bekliyor' && (!tur || t.tur === tur));

/* --- imza tuvali: çizgileri vektör olarak tutar (linke sığsın diye) --- */
function tuval(cv) {
  const c = cv.getContext('2d'); c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111';
  let cizgiler = [], su = null;
  const n = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', ev => { su = [n(ev)]; cizgiler.push(su); c.beginPath(); c.moveTo(...su[0]); try { cv.setPointerCapture(ev.pointerId); } catch (x) { } });
  cv.addEventListener('pointermove', ev => { if (!su) return; const p = n(ev), o = su[su.length - 1]; if (Math.hypot(p[0] - o[0], p[1] - o[1]) < 4) return; su.push(p); c.lineTo(...p); c.stroke(); });
  const bitir = () => { su = null; }; cv.addEventListener('pointerup', bitir); cv.addEventListener('pointercancel', bitir);
  return {
    bos: () => !cizgiler.some(s => s.length > 2),
    temizle: () => { cizgiler = []; c.clearRect(0, 0, cv.width, cv.height); },
    vektor: () => cizgiler.filter(s => s.length > 1).map(s => s.map(([x, y]) => [Math.round(x * 300 / cv.width), Math.round(y * 100 / cv.height)])),
  };
}
function vektordenResim(v) {
  const cv = document.createElement('canvas'); cv.width = 600; cv.height = 200;
  const c = cv.getContext('2d'); c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111';
  v.forEach(s => { c.beginPath(); s.forEach(([x, y], i) => (i ? c.lineTo(x * 2, y * 2) : c.moveTo(x * 2, y * 2))); c.stroke(); });
  return cv.toDataURL('image/png');
}

function belgeGorunumu(p) {
  const b = p.belge;
  const bas = `<h1>${p.tur === 'sozlesme' ? 'Kursiyer eğitim sözleşmesi' : 'Direksiyon eğitimi takip formu'}</h1><p class="a4-alt">${e(b.kurs.ad)} · ${e(b.kurs.adres)} · ${e(b.kurs.tel)}</p>`;
  if (p.tur === 'sozlesme') return bas + `<table><tr><th>Kursiyer</th><td>${e(b.kisi.ad)}</td><th>TC kimlik no</th><td>${e(b.kisi.tc)}</td></tr><tr><th>Sertifika sınıfı</th><td>${e(b.sinif)}</td><th>Kayıt tarihi</th><td>${tamTarih(b.kayit)}</td></tr><tr><th>Kurs ücreti</th><td>${tl(b.odeme.toplam)}${b.odeme.indirim ? `<br><small>${e(b.odeme.indirim.ad)} indirimi −${tl(b.odeme.indirim.tutar)}</small>` : ''}</td><th>Peşinat</th><td>${tl(b.odeme.pesin)} · ${tamTarih(b.odeme.pesinTarih)}</td></tr></table>
    <p><b>Ödeme planı</b></p><table><tr><th>#</th><th>Vade</th><th>Tutar</th></tr>${b.odeme.taksit.map(([v, t], i) => `<tr><td>${i + 1}</td><td>${tamTarih(v)}</td><td>${tl(t)}</td></tr>`).join('') || '<tr><td colspan="3">Peşin ödendi</td></tr>'}</table>
    ${b.madde.map((m, i) => { const n = m.indexOf('. '); const bk = n > 0 && n < 40; return `<p><b>${i + 1}. ${bk ? e(m.slice(0, n)) + '.' : ''}</b> ${e(bk ? m.slice(n + 2) : m)}</p>`; }).join('')}`;
  return bas + `<p><b>Kursiyer:</b> ${e(b.kisi.ad)} · ${e(b.sinif)}</p><table><tr><th>Tarih</th><th>Saat</th><th>Usta öğretici</th><th>Araç</th></tr>${b.ders.map(([t, s, u, pl, su]) => `<tr><td>${tamTarih(t)}</td><td>${e(s)}${su ? ' (' + su + ' dk)' : ''}</td><td>${e(u)}</td><td>${e(pl)}</td></tr>`).join('')}</table><p>Yukarıdaki direksiyon derslerini aldığımı onaylarım.</p>`;
}

// Kursiyer tarafı: girişsiz imza sayfası.
export async function imzaSayfasi(kok, paket) {
  document.body.classList.add('portal-modu');
  let p;
  try { p = await paketAc(paket); if (!p || !p.belge || !p.id) throw 0; } catch (x) {
    kok.innerHTML = `<div class="imza-sayfa"><div class="kart" style="padding:24px">${isaret('dur', 40)}<h2 style="margin:12px 0 6px">Link açılamadı</h2><p>Link eksik kopyalanmış olabilir. Kursa yazıp yeni link isteyin.</p></div></div>`; return;
  }
  const b = p.belge;
  kok.innerHTML = `<div class="imza-sayfa">
    <div class="imza-ust"><b>${e(b.kurs.ad)}</b><small>İmza isteği · ${e(b.kisi.ad)}</small></div>
    <div class="kart" style="padding:12px;overflow:auto"><div class="a4">${belgeGorunumu(p)}</div></div>
    <div class="kart" style="padding:18px">
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:14.5px"><input type="checkbox" data-okudum style="width:20px;height:20px;margin-top:2px"><span>${p.tur === 'sozlesme' ? 'Sözleşmeyi okudum, kabul ediyorum.' : 'Bu dersleri aldığımı onaylıyorum.'}</span></label>
      <div class="alan" style="margin-top:12px"><label for="i-ad">Adınız soyadınız</label><input id="i-ad" class="girdi" autocomplete="name" placeholder="${e(b.kisi.ad)}"></div>
      <p class="et" style="margin:14px 0 6px">İmzanız · parmağınızla çizin</p><canvas class="imza-alan" width="900" height="300" aria-label="İmza alanı"></canvas>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="dg dg-cizgi" data-temizle type="button">Temizle</button><button class="dg dg-ana" style="flex:1" data-imzala>${ik('wp')}İmzala ve kursa gönder</button></div>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:10px">İmzanız WhatsApp’tan ${e(b.kurs.ad)}’na gider; WhatsApp açılınca mesajı göndermeniz yeterli.</p>
    </div></div>`;
  const t = tuval(kok.querySelector('canvas'));
  kok.querySelector('[data-temizle]').addEventListener('click', () => t.temizle());
  kok.querySelector('[data-imzala]').addEventListener('click', async () => {
    const ad = kok.querySelector('#i-ad').value.trim();
    if (!kok.querySelector('[data-okudum]').checked) return bildir('Önce okuyup onay kutusunu işaretleyin', 'uyari');
    if (ad.length < 3) return bildir('Adınızı soyadınızı yazın', 'uyari');
    if (t.bos()) return bildir('İmza alanına imzanızı çizin', 'uyari');
    const donus = adres() + '#/imza-geldi/' + await paketle({ v: 1, id: p.id, tur: p.tur, k: p.k, ozet: p.ozet, m: p.m, ad, z: new Date().toISOString(), cihaz: (navigator.userAgent.match(/\(([^)]+)\)/) || [])[1] || '', s: t.vektor() });
    const metin = `${b.kisi.ad} · ${p.tur === 'sozlesme' ? 'sözleşme' : 'takip formu'} imzam:\n${donus}`;
    waAc(b.kurs.wp, metin);
    kok.querySelector('.imza-sayfa').innerHTML = `<div class="imza-ust"><b>${e(b.kurs.ad)}</b><small>${e(b.kisi.ad)}</small></div><div class="kart" style="padding:24px;text-align:center">${isaret('tamam', 56)}<h2 style="margin:14px 0 6px">Son adım: WhatsApp mesajını gönderin</h2><p>İmzanız hazır. WhatsApp açıldı; mesajı ${e(b.kurs.ad)}’na gönderince imzanız kayda geçer.</p>
      <div style="display:grid;gap:8px;margin-top:16px"><button class="dg dg-wp" data-tekrar>${ik('wp')}WhatsApp’ı yeniden aç</button><button class="dg dg-cizgi" data-kopyala>Linki kopyala</button></div></div>`;
    kok.querySelector('[data-tekrar]').addEventListener('click', () => waAc(b.kurs.wp, metin));
    kok.querySelector('[data-kopyala]').addEventListener('click', () => { navigator.clipboard.writeText(donus).then(() => bildir('Link kopyalandı'), () => bildir('Kopyalanamadı; WhatsApp’ı yeniden açın', 'uyari')); });
  });
}

// Kurs tarafı: dönüş linki → doğrula, kayda işle.
export function imzaGeldi(paket) {
  return {
    baslik: 'Gelen imza', alt: 'Kursiyerin WhatsApp’tan gönderdiği imza',
    html: `<div class="kart" style="max-width:640px;padding:22px" id="imza-sonuc"><p>İmza doğrulanıyor…</p></div>`,
    async baglan(kap) {
      const yer = kap.querySelector('#imza-sonuc');
      const hata = (b, a) => { yer.innerHTML = `${isaret('dur', 40)}<h2 style="margin:12px 0 6px">${b}</h2><p>${a}</p>`; };
      let r; try { r = await paketAc(paket || ''); } catch (x) { return hata('Link okunamadı', 'Mesajdaki link eksik kopyalanmış olabilir.'); }
      const t = (S.imzaTalepleri || []).find(x => x.id === r.id), k = kursiyer(r.k);
      if (!t || !k) return hata('Bu imza isteği bulunamadı', 'İstek bu kursa ait değil ya da silinmiş.');
      if (await muhur([r.id, r.tur, r.k, r.ozet].join('|')) !== r.m || r.ozet !== t.ozet) return hata('İmza doğrulanamadı', 'Link değiştirilmiş görünüyor. Kursiyere yeni link gönderin.');
      const resim = vektordenResim(r.s || []);
      if (t.durum === 'imzalandi') { yer.innerHTML = `${isaret('tamam', 40)}<h2 style="margin:12px 0 6px">Bu imza zaten işlendi</h2><p>${tamTarih(t.imzaZaman.slice(0, 10))} ${t.imzaZaman.slice(11, 16)}</p><a class="dg dg-ana" href="#/kursiyer/${k.id}">Kursiyer dosyası</a>`; return; }
      const zaman = r.z ? new Date(r.z) : new Date(), z = zaman.toISOString().slice(0, 10) === yerelZaman().slice(0, 10) ? yerelZaman() : r.z.slice(0, 16);
      if (t.tur === 'sozlesme') {
        k.sozlesmeImza = { tarih: z.slice(0, 10), yontem: 'Uzaktan (WhatsApp linki)', url: resim, ad: r.ad, cihaz: r.cihaz };
        k.evrak.sozlesme = true; if (!eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama)) k.asama = 'Teorik';
      } else t.dersler.forEach(id => { const d = S.dersler.find(x => x.id === id); if (d) d.imza = { ...(d.imza || {}), zaman: d.imza && d.imza.zaman ? d.imza.zaman : z, kursiyer: resim, kursiyerUzaktan: z, kursiyerBekliyor: false, usta: d.imza ? d.imza.usta : null }; });
      t.durum = 'imzalandi'; t.imzaZaman = z; t.imzalayan = r.ad;
      islem('Uzaktan imza işlendi', tamAd(k) + ' · ' + (t.tur === 'sozlesme' ? 'sözleşme' : t.dersler.length + ' ders')); kaydet();
      yer.innerHTML = `${isaret('tamam', 40)}<h2 style="margin:12px 0 6px">İmza kayda işlendi</h2><p>${e(tamAd(k))} · ${t.tur === 'sozlesme' ? 'kursiyer sözleşmesi' : t.dersler.length + ' dersin takip formu'}</p>
        <div style="border:1px solid var(--cizgi);border-radius:8px;background:#fff;margin:14px 0;padding:8px;max-width:320px"><img src="${resim}" alt="Kursiyerin imzası" style="width:100%"></div>
        <dl class="bilgi-tablo"><dt>İmzalayan</dt><dd>${e(r.ad)}</dd><dt>Zaman</dt><dd>${zaman.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</dd><dt>Cihaz</dt><dd>${e(r.cihaz || '—')}</dd><dt>Doğrulama</dt><dd>Mühür ve belge özeti eşleşti</dd></dl>
        <div style="display:flex;gap:8px;margin-top:16px"><a class="dg dg-ana" href="#/kursiyer/${k.id}">Kursiyer dosyası</a></div>`;
    },
  };
}

// Kurs tarafı: imza gönderme penceresi (kursiyer yanında değilse)
export function imzayaGonderPenceresi(k, tur, dersIdleri) {
  const b = bekleyenImza(k, tur)[0];
  pencere({
    baslik: 'WhatsApp’tan imzaya gönder',
    icerik: `<p style="font-size:14.5px">${e(tamAd(k))} kişisine ${tur === 'sozlesme' ? 'sözleşme' : dersIdleri.length + ' dersin takip formu'} için imza linki gidecek. WhatsApp, ${e(k.tel)} numarasına hazır mesajla açılır; siz gönderirsiniz.</p>
      ${kursWp() ? `<p class="ipucu" style="margin-top:12px">${isaret('bilgi', 18)}<span>Kursiyer imzalayınca imza kursun WhatsApp hattına (${e(kursWp())}) link olarak gelir. O linke dokunduğunuzda imza doğrulanır ve kayda işlenir.</span></p>` : `<div class="alan" style="margin-top:14px"><label for="i-wp">İmzalar hangi WhatsApp numarasına gelsin?</label><input id="i-wp" class="girdi" inputmode="tel" placeholder="05xx xxx xx xx" autocomplete="tel"><small style="color:var(--soluk)">Kursun WhatsApp hattı; bir kez girilir, Ayarlar › Kurs bilgileri’nden değişir.</small></div>`}${b ? `<p style="margin-top:10px;font-size:13.5px;color:var(--soluk)">Önceki link ${b.tarih.slice(0, 10).split('-').reverse().join('.')} ${b.tarih.slice(11, 16)}’de gönderildi; yenisi eskisinin yerine geçer.</p>` : ''}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-wp" data-k>${ik('wp')}WhatsApp’ı aç</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', async () => { const w = d.querySelector('#i-wp'); if (w) { const n = w.value.replace(/\D/g, ''); if (!/^0?5\d{9}$/.test(n) && !/^905\d{9}$/.test(n)) return bildir('Geçerli bir cep telefonu girin', 'uyari'); S.kurs.wp = w.value.trim(); islem('Kursun WhatsApp hattını girdi'); kaydet(); } await imzaIste(tur, k, dersIdleri); kapatPencere(); bildir('İmza linki hazırlandı; WhatsApp’ta mesajı gönderin', 'wp'); import('./app.js?v=32').then(m => m.yenile()); }); },
  });
}
