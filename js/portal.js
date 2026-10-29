import { oturum, islem, S, kaydet, gun, fark, tarihOku, SINIFLAR, ASAMALAR, EVRAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle, yerelZaman, BECERI, risk, ekToplam, selam, kursAdi } from './veri.js?v=59';
import { e, saatDe, saatE, tl, ik, rozet, avatar, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, tarih, tarihUzun, goreli, gunKisa, aracGorsel, isaret, imzaAlani, kartFormu, kartBagla, kartDogrula, waAc } from './ui.js?v=59';
import { yenile } from './app.js?v=59';
import { ekDersKabul, bosTeklifKabul, wpGonder, bildirimler } from './sayfalar1.js?v=59';
import { SORULAR, KONULAR } from './sorular.js?v=59';
import { randevuAl, randevuIptal } from './ozellik.js?v=59';
import * as OG from './ogrenci.js?v=59';

let egId = 'e1', egSekme = 'bugun';
let ogId = null, ogSekme = 'durum';

const sekmeCubugu = (liste, secili, ad) => `<nav class="portal-sekme" aria-label="Sekmeler">${liste.map(([k, t, i]) => `<button data-${ad}="${k}" class="${k === secili ? 'secili' : ''}">${ik(i)}${t}</button>`).join('')}</nav>`;

/* ================= EĞİTMEN ================= */
const beceriGiris = () => `<p class="et">Bu dersin beceri puanı <small style="font-weight:400;color:var(--soluk)">1 zayıf · 5 sınava hazır</small></p><div class="beceri-giris">${BECERI.map(([b, ad]) => `<div class="beceri-sat"><span>${ad}</span><div class="secim">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="b-${b}" value="${n}"><span>${n}</span></label>`).join('')}</div></div>`).join('')}</div>`;
const beceriOku = p => { const o = {}; BECERI.forEach(([b]) => { const v = p.querySelector(`[name="b-${b}"]:checked`); if (v) o[b] = +v.value; }); return Object.keys(o).length ? o : null; };
// Ders sonu: beceri puanı kaydedilir; kalma riski "yüksek"e çıkarsa müdüre haber gider
function riskKontrol(ks, once) {
  const r = risk(ks); if (!r || r.puan < 50 || (once && once.puan >= 50)) return;
  bildirimler([{ kim: 'mudur', metin: `${tamAd(ks)} için direksiyon sınavı kalma riski yüksek (${r.puan}/100): ${r.nedenler.join('; ')}. Ek ders önermek için kursiyer dosyasını açın.`, tur: 'Sınav riski' }], 'Sınav riski yükseldi');
}
export function egitmenPortal() {
  const usta = oturum.kullanici && oturum.kullanici.rol === 'usta';
  if (usta) egId = oturum.kullanici.usta;
  const eg = egitmen(egId);
  const bugun = S.dersler.filter(d => d.egitmen === eg.id && d.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  const ar = S.araclar.find(a => a.egitmen === eg.id);
  let govde = '';
  if (egSekme === 'bugun') govde = `
    <div class="kart" style="padding:8px">${ar ? aracGorsel(ar) : ''}<div style="display:flex;align-items:center;gap:10px;padding:10px 8px 6px"><div><b style="color:var(--murekkep);font-family:var(--baslik);font-size:17px">${ar ? e(ar.model) + ' · bugün senin aracın' : 'Araç atanmadı'}</b><small style="display:block;color:var(--soluk)">${ar ? 'Bakıma ' + Math.max(0, ar.bakimKm - ar.km).toLocaleString('tr-TR') + ' km' : ''}</small></div><span style="margin-left:auto">${rozet(bugun.filter(d => d.durum === 'Yapıldı').length + '/' + bugun.length + ' ders', 'sari')}</span></div></div>
    ${bugun.map(d => { const k = kursiyer(d.kursiyer), S0 = SINIFLAR[k.sinif]; return `<div class="kart" style="padding:16px 18px">
      <div style="display:flex;align-items:center;gap:12px"><span class="mono" style="font-size:20px;font-weight:600;color:var(--murekkep)">${d.saat}</span><div class="kisi">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${S0.ad} · ${k.direksiyon + (d.durum === 'Planlandı' ? 1 : 0)}. ders / ${S0.direksiyon}</small></div></div></div>
      ${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}
      ${k.notlar[0] ? `<p class="ipucu" style="margin-top:10px">${ik('kalem')}<span>${e(k.notlar[0].metin)}</span></p>` : ''}
      ${d.bas && d.durum === 'Planlandı' ? `<p class="ipucu" style="margin-top:10px">${isaret('tamam', 18)}<span>Ders ${saatDe(d.bas)} başladı · ${d.konum ? 'konum alındı' : d.konum === false ? 'konum alınamadı' : 'konum alınıyor'}. Bitirince imzalatın; süre otomatik yazılır.</span></p>` : ''}
      ${d.durum === 'Yapıldı' && d.imza && d.imza.kursiyerBekliyor ? `<p class="ipucu uyari" style="margin-top:10px">${isaret('uyari', 18)}<span>Kursiyer imzası bekleniyor. <button class="dg dg-hafif dg-kucuk" data-imza-tekrar="${d.id}">Linki yeniden gönder</button></span></p>` : ''}
      ${d.durum === 'Yapıldı' && d.bas ? `<small style="display:block;margin-top:8px;color:${(d.sure || 0) < 40 ? 'var(--kirmizi)' : 'var(--soluk)'}">${d.bas}–${d.bit} · ${d.sure} dk${(d.sure || 0) < 40 ? ' · kısa ders' : ''}${d.konum ? ' · konum kayıtlı' : ''}</small>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px">${d.durum === 'Planlandı' ? (d.bas ? `<button class="dg dg-ana" style="flex:1" data-yapildi="${d.id}">${ik('tik')}Bitir ve imzalat</button>` : `<button class="dg dg-ana" style="flex:1" data-ders-basla="${d.id}">${ik('direksiyon')}Dersi başlat</button><button class="dg dg-cizgi" data-gelmedi="${d.id}">Gelmedi</button>`) : rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : 'kirmizi')}<a class="dg dg-cizgi" style="${d.durum === 'Planlandı' ? '' : 'margin-left:auto'}" href="tel:${k.tel.replace(/\s/g, '')}" aria-label="Ara">${ik('tel')}</a><button class="dg dg-cizgi" data-not="${k.id}" aria-label="Not ekle">${ik('kalem')}</button></div>
    </div>`; }).join('') || `<div class="kart">${bos('Bugün dersiniz yok', 'Yeni ders planlandığında burada görünür.')}</div>`}`;
  if (egSekme === 'hafta') {
    const gunler = []; for (let n = 0; n < 7; n++) gunler.push(gun(n));
    govde = gunler.map(g => { const l = S.dersler.filter(d => d.egitmen === eg.id && d.tarih === g).sort((a, b) => a.saat.localeCompare(b.saat)); return `<div class="kart"><div class="kart-bas" style="padding-bottom:12px"><h3>${goreli(g) === tarih(g) ? tarihUzun(g) : goreli(g) + ' · ' + tarih(g)}</h3><small>${l.length} ders</small></div>${l.length ? `<ul class="liste">${l.map(d => `<li><span class="zaman">${d.saat}</span><span style="color:var(--murekkep)">${e(tamAd(kursiyer(d.kursiyer)))}</span></li>`).join('')}</ul>` : ''}</div>`; }).join('');
  }
  if (egSekme === 'kursiyer') {
    const ks = S.kursiyerler.filter(k => k.egitmen === eg.id && ['Direksiyon', 'Sınav'].includes(k.asama));
    govde = `<div class="kart"><ul class="liste">${ks.map(k => { const sd = sonrakiDers(k); return `<li><div class="kisi" style="flex:1">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders${sd ? ' · sonraki ' + goreli(sd.tarih) : ''}</small></div></div><span class="sag" style="width:70px">${ilerleme(k.direksiyon, SINIFLAR[k.sinif].direksiyon, 'yesil')}</span></li>`; }).join('') || '<li>' + bos('Aktif kursiyer yok', '') + '</li>'}</ul></div>`;
  }
  return {
    baslik: 'Usta öğretici ekranı', alt: 'Telefondan kullanılan ekran',
    html: `<div class="portal">
      <div class="portal-bas">${avatar(...eg.ad.split(' '), eg.renk + '22')}<div><small>Merhaba,</small><h2>${e(eg.ad.split(' ')[0])} Hoca</h2></div>
        <select class="girdi" style="margin-left:auto;width:auto;height:34px;font-size:12.5px${usta ? ';display:none' : ''}" data-eg aria-label="Usta öğretici seç">${S.egitmenler.map(x => `<option value="${x.id}" ${x.id === eg.id ? 'selected' : ''}>${e(x.ad)}</option>`).join('')}</select></div>
      ${govde}
      ${sekmeCubugu([['bugun', 'Bugün', 'direksiyon'], ['hafta', 'Haftam', 'takvim'], ['kursiyer', 'Kursiyerlerim', 'kursiyer']], egSekme, 'egs')}
    </div>`,
    baglan(k) {
      k.addEventListener('change', ev => { if (ev.target.matches('[data-eg]')) { egId = ev.target.value; yenile(); } });
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-egs]'); if (s) { egSekme = s.dataset.egs; yenile(true); }
        const db = t.closest('[data-ders-basla]'); if (db) {
          const d = S.dersler.find(x => x.id === db.dataset.dersBasla);
          if (d.tarih !== gun(0)) return bildir('Yalnız bugünkü ders başlatılabilir', 'uyari');
          d.bas = new Date().toTimeString().slice(0, 5); d.basZaman = Date.now(); d.konum = null; islem('Dersi başlattı', tamAd(kursiyer(d.kursiyer)) + ' · ' + d.bas); kaydet(); yenile();
          if (!navigator.geolocation) return bildir('Ders başladı; bu cihaz konum vermiyor', 'uyari');
          navigator.geolocation.getCurrentPosition(p => { d.konum = { enlem: +p.coords.latitude.toFixed(5), boylam: +p.coords.longitude.toFixed(5), dogruluk: Math.round(p.coords.accuracy) }; kaydet(); bildir('Ders başladı; başlangıç saati ve konum kaydedildi'); yenile(); }, () => { d.konum = false; kaydet(); bildir('Ders başladı; konum izni verilmediği için konum kaydedilmedi', 'uyari'); yenile(); }, { timeout: 10000, maximumAge: 60000 });
          return; }
        const y = t.closest('[data-yapildi]'); if (y) {
          const d = S.dersler.find(x => x.id === y.dataset.yapildi), ks = kursiyer(d.kursiyer);
          pencere({
            baslik: 'Dersi imzalayın',
            icerik: `<p style="margin-bottom:10px">${e(tamAd(ks))} · ${d.saat} · ${ks.direksiyon + 1}. ders. İmzalar direksiyon eğitimi takip formuna işlenir; kağıt form gerekmez.</p>${beceriGiris()}<p class="et" style="margin-top:14px">Kursiyer imzası</p><canvas class="imza-alan" width="900" height="300" data-imza="k" aria-label="Kursiyer imzası"></canvas><p class="et" style="margin-top:12px">Usta öğretici imzası · ${e(egitmen(d.egitmen).ad)}</p><canvas class="imza-alan" width="900" height="300" data-imza="u" aria-label="Usta öğretici imzası"></canvas>`,
            altlik: `<button class="dg dg-cizgi" data-temizle-imza>Temizle</button><button class="dg dg-wp" data-imza-uzak>${ik('wp')}Kursiyer imzası WhatsApp’tan</button><button class="dg dg-ana" data-imza-kaydet>${ik('tik')}Ders yapıldı</button>`,
            onAc(p) {
              const ik_ = imzaAlani(p.querySelector('[data-imza=k]')), iu = imzaAlani(p.querySelector('[data-imza=u]'));
              p.querySelector('[data-temizle-imza]').addEventListener('click', () => { ik_.temizle(); iu.temizle(); });
              p.querySelector('[data-imza-uzak]').addEventListener('click', async () => {
                if (iu.bos()) return bildir('Önce siz imzalayın; kursiyerin imzası WhatsApp’tan istenir', 'uyari');
                const once = risk(ks); d.beceri = beceriOku(p);
                d.durum = 'Yapıldı'; d.imza = { zaman: yerelZaman(), kursiyer: null, kursiyerBekliyor: true, usta: iu.url() };
                d.bit = new Date().toTimeString().slice(0, 5); d.sure = d.basZaman ? Math.round((Date.now() - d.basZaman) / 60e3) : null;
                ks.direksiyon = Math.min(SINIFLAR[ks.sinif].direksiyon, ks.direksiyon + 1);
                islem('Ders tamamlandı, kursiyer imzası istendi', tamAd(ks) + ' · ' + d.saat); kaydet(); kapatPencere();
                const m = await import('./imza.js?v=59'); await m.imzaIste('ders', ks, [d.id]); bildir('Ders kaydedildi; WhatsApp’ta imza linkini gönderin', 'wp'); yenile(); riskKontrol(ks, once);
              });
              p.querySelector('[data-imza-kaydet]').addEventListener('click', () => {
                if (ik_.bos() || iu.bos()) return bildir('İki imza da gerekli', 'uyari');
                const once = risk(ks); d.beceri = beceriOku(p);
                d.durum = 'Yapıldı'; d.imza = { zaman: yerelZaman(), kursiyer: ik_.url(), usta: iu.url() };
                d.bit = new Date().toTimeString().slice(0, 5); d.sure = d.basZaman ? Math.round((Date.now() - d.basZaman) / 60e3) : null;
                if (d.sure != null && d.sure < 40) bildir(`Ders ${d.sure} dk sürdü; kısa ders olarak işaretlendi`, 'uyari');
                ks.direksiyon = Math.min(SINIFLAR[ks.sinif].direksiyon, ks.direksiyon + 1);
                islem('Ders imzalı tamamlandı', tamAd(ks) + ' · ' + d.saat); kaydet(); kapatPencere(); bildir('Ders imzalandı ve takip formuna işlendi'); yenile(); riskKontrol(ks, once);
              });
            },
          });
        }
        const it = t.closest('[data-imza-tekrar]'); if (it) { const d = S.dersler.find(x => x.id === it.dataset.imzaTekrar); import('./imza.js?v=59').then(m => m.imzaIste('ders', kursiyer(d.kursiyer), [d.id])); return; }
        const g = t.closest('[data-gelmedi]'); if (g) { const d = S.dersler.find(x => x.id === g.dataset.gelmedi); d.durum = 'Gelmedi'; islem('Gelmedi işaretledi', tamAd(kursiyer(d.kursiyer)) + ' · ' + d.saat); kaydet(); const ks = kursiyer(d.kursiyer); bildirimler([{ kim: ks, metin: `${selam(ks)} ${d.saat} direksiyon dersinde sizi bekledim ancak gelmediniz. Yeni saat için ${kursAdi('e')} yazabilirsiniz. ${egitmen(d.egitmen).ad}`, tur: 'Gelmedi bildirimi' }, { kim: 'mudur', metin: `${tamAd(ks)} ${d.saat} dersine gelmedi; ${egitmen(d.egitmen).ad} işaretledi.`, tur: 'Gelmedi bildirimi' }], 'Derse gelmedi'); yenile(); }
        const n = t.closest('[data-not]'); if (n) { const ks = kursiyer(n.dataset.not); pencere({ baslik: 'Not · ' + tamAd(ks), icerik: `<div class="alan"><label>Ders notu</label><textarea placeholder="Örn. park etmede iyi, şerit değiştirmede ayna kontrolünü unutuyor"></textarea></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { const v = d.querySelector('textarea').value.trim(); if (v) { ks.notlar.unshift({ tarih: gun(0), metin: v }); kaydet(); } kapatPencere(); bildir('Not kaydedildi; kurs müdürü de görür'); yenile(); }); } }); }
      });
    },
  };
}

/* ================= KURSİYER ================= */
const konuOran = (k, kn) => { const a = (k.konuAnaliz || {})[kn]; return a && a[1] ? Math.round(a[0] / a[1] * 100) : null; };
const karistir = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const idx = SORULAR.map((_, i) => i);
let test = { mod: null };
let sayac = null;
function testBaslat(mod, k, konu) {
  let liste;
  if (mod === 'deneme') liste = Object.entries(KONULAR).flatMap(([kn, [, n]]) => karistir(idx.filter(i => SORULAR[i][0] === kn)).slice(0, n));
  else if (mod === 'konu') liste = karistir(idx.filter(i => SORULAR[i][0] === konu)).slice(0, 10);
  else if (mod === 'yanlis') liste = karistir(k.yanlislar || []).slice(0, 10);
  else liste = karistir(idx).slice(0, 10);
  test = { mod, konu, liste, i: 0, dogru: 0, cevap: null, basla: Date.now(), cevaplar: [] };
}
function testBitir(k) {
  const konu = {};
  test.cevaplar.forEach(([qi, c]) => { const kn = SORULAR[qi][0]; konu[kn] = konu[kn] || [0, 0]; konu[kn][1]++; if (c === SORULAR[qi][3]) konu[kn][0]++; });
  k.konuAnaliz = k.konuAnaliz || {};
  Object.entries(konu).forEach(([kn, [d, t]]) => { const a = k.konuAnaliz[kn] || [0, 0]; k.konuAnaliz[kn] = [a[0] + d, a[1] + t]; });
  const yanlis = test.cevaplar.filter(([qi, c]) => c !== SORULAR[qi][3]).map(([qi]) => qi), dogruQ = test.cevaplar.filter(([qi, c]) => c === SORULAR[qi][3]).map(([qi]) => qi);
  k.yanlislar = [...new Set([...(k.yanlislar || []).filter(x => !dogruQ.includes(x)), ...yanlis])];
  if (test.mod === 'deneme') { k.deneme = k.deneme || []; k.deneme.push(test.dogru * 2); }
  test.sonuc = { konu, yanlis: yanlis.length };
  kaydet();
}
export function ogrenciPortal() {
  // önizlemede ilk açılan öğrenci dolu bir örnek olsun: planlı dersi, ödenmemiş taksiti ve puanlanmış dersleri olan
  if (!ogId || !kursiyer(ogId)) { const puan = k => (sonrakiDers(k) ? 4 : 0) + (k.odeme.taksitler.some(t => !t.odendi) ? 2 : 0) + (S.dersler.some(d => d.kursiyer === k.id && d.beceri) ? 2 : 0) + (k.asama === 'Direksiyon' ? 1 : 0); ogId = [...S.kursiyerler].sort((a, b) => puan(b) - puan(a))[0].id; }
  const k = kursiyer(ogId), S0 = SINIFLAR[k.sinif], eg = egitmen(k.egitmen);
  const sd = sonrakiDers(k), sonraki = k.odeme.taksitler.map((t, i) => ({ t, i })).find(x => !x.t.odendi && !x.t.iptal);
  const sinav = S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  let govde = '';
  if (ogSekme === 'durum') govde = `
    <div class="kart" style="padding:18px 6px 4px"><div style="padding:0 14px"><small style="color:var(--soluk)">Ehliyet yolculuğun</small><h3 style="font-size:18px;margin-top:2px">${k.asama === 'Ehliyet' ? 'Tebrikler, ehliyetini aldın!' : k.asama + ' aşamasındasın'}</h3></div>${yol(asamaNo(k), true)}</div>
    ${sd ? `<div class="kart" style="padding:8px">${sd.arac ? aracGorsel(arac(sd.arac)) : ''}<div style="padding:10px 10px 4px"><small style="color:var(--soluk)">Sıradaki direksiyon dersin</small><b style="display:block;font-family:var(--baslik);font-size:26px;font-weight:900;color:var(--murekkep)">${goreli(sd.tarih)} ${sd.saat}</b><p style="font-size:14.5px;margin-top:2px">${e(egitmen(sd.egitmen).ad)} ile · ${sd.arac ? e(arac(sd.arac).model) + ' · ' + arac(sd.arac).plaka : ''} · ${k.direksiyon + 1}. ders</p><button class="dg dg-cizgi dg-kucuk" style="margin-top:10px" data-degis="${sd.id}">Gelemeyeceğim, saati değiştir</button></div></div>` : ''}
    ${k.ekDersTeklif ? `<div class="kart" style="padding:16px 18px;border-color:var(--levha)"><small style="color:var(--soluk)">Kursun önerisi</small><b style="display:block;font-family:var(--baslik);font-size:19px;color:var(--murekkep);margin:4px 0">${k.ekDersTeklif.n} ek direksiyon dersi · ${tl(k.ekDersTeklif.tutar)}</b><p style="font-size:13.5px">Kabul edersen ücret ödeme planına eklenir, dersler planlanır.</p><div style="display:flex;gap:8px;margin-top:10px"><button class="dg dg-ana dg-kucuk" data-og-ekders="evet">Kabul et</button><button class="dg dg-cizgi dg-kucuk" data-og-ekders="hayir">İstemiyorum</button></div></div>` : ''}
    ${(S.bosTeklif || []).filter(t => t.adaylar.includes(k.id) && fark(t.tarih) >= 0).map(t => `<div class="kart" style="padding:16px 18px;border-color:var(--levha)"><small style="color:var(--soluk)">Boş saat teklifi</small><b style="display:block;font-family:var(--baslik);font-size:19px;color:var(--murekkep);margin:4px 0">${goreli(t.tarih)} ${t.saat} · ${e(egitmen(t.egitmen).ad)}</b><p style="font-size:13.5px">İlk kabul eden alır.</p><button class="dg dg-ana dg-kucuk" style="margin-top:10px" data-og-bos="${t.id}">Bu saati al</button></div>`).join('')}
    ${S.entegrasyon.pos.bagli && k.odeme.otoTalep && !k.odeme.otomatik ? `<div class="kart" style="padding:16px 18px"><small style="color:var(--soluk)">Kursun isteği</small><b style="display:block;font-family:var(--baslik);font-size:19px;color:var(--murekkep);margin:4px 0">Taksitlerin otomatik çekilsin mi?</b><p style="font-size:13.5px">Kartını bir kez kaydet; taksitler vadesinde çekilir, istediğin zaman kapatırsın.</p><button class="dg dg-ana dg-kucuk" style="margin-top:10px" data-og-oto>${ik('kart')}Kartımı kaydet</button></div>` : ''}
    ${sinav ? `<div class="kart" style="padding:16px 18px;border-color:var(--serit-koyu)"><small style="color:var(--soluk)">Sınavın</small><b style="display:block;font-family:var(--baslik);font-size:20px;color:var(--murekkep);margin-top:4px">${sinav.tur} · ${goreli(sinav.tarih)} ${sinav.saat}</b><p style="font-size:13.5px">${e(sinav.yer)}. Kimliğini yanına almayı unutma.</p></div>` : ''}
    <div class="kart" style="padding:16px 18px"><div style="display:flex;justify-content:space-between;align-items:baseline"><small style="color:var(--soluk)">Ödeme durumun</small><b class="sayi" style="color:var(--murekkep)">${tl(odenen(k))} / ${tl(k.odeme.toplam + ekToplam(k))}</b></div>${ilerleme(odenen(k), k.odeme.toplam + ekToplam(k), 'yesil')}${ekToplam(k) ? `<small style="display:block;color:var(--soluk);margin-top:4px">Kurs ücreti ${tl(k.odeme.toplam)} + ek kalemler ${tl(ekToplam(k))}</small>` : ''}
      ${sonraki ? `<div style="display:flex;align-items:center;gap:10px;margin-top:12px"><div><b style="color:var(--murekkep)">${sonraki.i + 1}. taksit · ${tl(sonraki.t.tutar)}</b><small style="display:block;color:${fark(sonraki.t.vade) < 0 ? 'var(--kirmizi)' : 'var(--soluk)'}">Vade ${tarih(sonraki.t.vade)}${fark(sonraki.t.vade) < 0 ? ' · gecikti' : ''}</small></div><button class="dg dg-ana dg-kucuk" style="margin-left:auto" data-ode="${sonraki.i}">${ik('kart')}Öde</button></div>` : '<p style="margin-top:10px;color:var(--yesil);font-weight:600">Tüm ödemelerin tamam.</p>'}</div>
    <div class="izgara iz-2" style="gap:10px;grid-template-columns:1fr 1fr"><div class="kart gosterge"><small>Teorik</small><b style="font-size:22px">${k.teorik}/${S0.teorik}</b>${ilerleme(k.teorik, S0.teorik)}</div><div class="kart gosterge"><small>Direksiyon</small><b style="font-size:22px">${k.direksiyon}/${S0.direksiyon}</b>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</div></div>`;
  if (ogSekme === 'ders') {
    const l = S.dersler.filter(d => d.kursiyer === k.id).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
    govde = OG.derslerHtml(k, `<button class="dg dg-ana" style="width:100%;margin:4px 0 10px" data-iste>${ik('arti')}Direksiyon dersi al</button><ul class="liste og-liste">${l.map(d => `<li><span class="zaman">${d.saat}</span><div><b style="color:var(--murekkep)">${goreli(d.tarih)}</b><small style="display:block;color:var(--soluk)">${e(egitmen(d.egitmen).ad)}</small></div><span class="sag">${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}${d.durum === 'Planlandı' && fark(d.tarih) >= 1 ? `<button class="dg dg-hafif dg-kucuk" data-og-iptal="${d.id}">İptal</button>` : ''}</span></li>`).join('') || '<li>' + bos('Henüz direksiyon dersin yok', 'e-Sınavı geçince derslerin planlanır.') + '</li>'}</ul>`);
  }
  if (ogSekme === 'program') govde = OG.programHtml(k);
  if (ogSekme === 'odeme') govde = OG.odemelerHtml(k);
  if (ogSekme === 'sinav') {
    const MOD_AD = { deneme: 'Deneme sınavı', hizli: 'Hızlı test', konu: 'Konu çalışması', yanlis: 'Yanlışlarım' };
    if (!test.mod) {
      const son = (k.deneme || []).slice(-5);
      govde = OG.sinavlarHtml(k) + `<h3 class="og-ara-baslik">Sınava hazırlan</h3><div class="kart" style="padding:18px"><small style="color:var(--soluk)">e-Sınav provası</small><b style="display:block;font-family:var(--baslik);font-size:22px;color:var(--murekkep);margin:2px 0 6px">Deneme sınavı</b><p style="font-size:14px">50 soru · 45 dakika · geçme puanı 70. Sorular e-sınavdaki konu dağılımıyla gelir.</p><button class="dg dg-ana" style="width:100%;margin-top:12px" data-test-basla="deneme">Sınavı başlat</button></div>
        ${son.length ? `<div class="kart" style="padding:14px 18px"><small style="color:var(--soluk)">Son denemelerin</small><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">${son.map(p => `<span class="rozet rozet-${p >= 70 ? 'yesil' : 'kirmizi'}" style="font-size:14px;padding:6px 10px">${p}</span>`).join('')}</div></div>` : ''}
        <div class="kart" style="padding:14px 18px"><small style="color:var(--soluk)">Konu çalış · başarı oranın</small><div style="display:grid;gap:10px;margin-top:10px">${Object.entries(KONULAR).map(([kn, [ad]]) => { const o = konuOran(k, kn); return `<button class="konu-sat" data-test-basla="konu" data-konu="${kn}"><span>${ad}</span>${o != null && o < 70 ? rozet('Çalış', 'kirmizi') : ''}<b class="mono" style="color:${o != null && o < 70 ? 'var(--kirmizi)' : 'var(--murekkep)'}">${o == null ? '–' : '%' + o}</b>${ilerleme(o || 0, 100, o != null && o < 70 ? '' : 'yesil')}</button>`; }).join('')}</div></div>
        <div class="izgara iz-2" style="gap:10px;grid-template-columns:1fr 1fr"><button class="dg dg-cizgi" style="height:auto;padding:12px" data-test-basla="hizli">Hızlı test<br><small>10 soru</small></button><button class="dg dg-cizgi" style="height:auto;padding:12px" data-test-basla="yanlis" ${(k.yanlislar || []).length ? '' : 'disabled'}>Yanlışlarım<br><small>${(k.yanlislar || []).length} soru</small></button></div>
        <p style="font-size:12.5px;color:var(--soluk);text-align:center">Havuzda ${SORULAR.length} soru var. Sonuçların teorik öğretmenine konu konu gider; zayıf olduğun konuya ek ders konur.</p>`;
    } else if (test.i >= test.liste.length) {
      const toplam = test.liste.length, puan = test.mod === 'deneme' ? test.dogru * 2 : Math.round(test.dogru / Math.max(1, toplam) * 100);
      govde = `<div class="kart soru" style="text-align:center">${test.mod === 'deneme' ? `<small style="color:var(--soluk)">Deneme sınavı puanın</small><b style="display:block;font-family:var(--baslik);font-size:46px;color:${puan >= 70 ? 'var(--yesil)' : 'var(--kirmizi)'}">${puan}</b><p>${puan >= 70 ? 'Geçme puanının üstündesin.' : 'Geçme puanı 70; biraz daha çalışalım.'}</p>` : `<h4 style="font-size:20px">${test.dogru}/${toplam} doğru</h4>`}
        <ul class="liste" style="text-align:left;margin:12px -20px">${Object.entries(test.sonuc.konu).map(([kn, [d, t]]) => `<li><span style="flex:1">${KONULAR[kn][0]}</span><b class="mono">${d}/${t}</b></li>`).join('')}</ul>
        <p style="font-size:13.5px;color:var(--soluk)">${test.sonuc.yanlis} yanlışın “Yanlışlarım”a eklendi.</p><button class="dg dg-koyu" style="margin-top:10px" data-test-menu>Tamam</button></div>`;
    } else {
      const [kn, q, sec, dogru, gorsel] = SORULAR[test.liste[test.i]], aninda = test.mod !== 'deneme';
      govde = `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--soluk);margin-bottom:8px"><span>${MOD_AD[test.mod]} · ${KONULAR[kn][0]}</span><span>${test.mod === 'deneme' ? '<b class="mono" data-kalan></b> · ' : ''}${test.i + 1}/${test.liste.length}</span></div>${ilerleme(test.i, test.liste.length)}<div class="ara-bosluk" style="height:12px"></div>
        <div class="kart soru">${gorsel ? `<div class="soru-gorsel">${gorsel}</div>` : ''}<h4>${e(q)}</h4>${sec.map((s2, i) => `<button class="secenek ${aninda && test.cevap != null ? (i === dogru ? 'dogru' : i === test.cevap ? 'yanlis' : '') : ''}" data-cevap="${i}" ${test.cevap != null ? 'disabled' : ''}><b>${'ABCD'[i]}</b>${e(s2)}</button>`).join('')}${aninda && test.cevap != null ? `<button class="dg dg-koyu" style="width:100%;margin-top:6px" data-sonraki>Sonraki soru</button>` : ''}</div>
        <button class="dg dg-hafif dg-kucuk" data-test-menu>Testi bırak</button>`;
    }
  }
  if (ogSekme === 'evrak') govde = OG.belgelerHtml(k);
  return {
    baslik: 'Kursiyer ekranı', alt: 'Kursiyerin telefonunda gördüğü ekran',
    html: `<div class="portal">
      <div class="portal-bas">${avatar(k.ad, k.soyad)}<div><small>Merhaba,</small><h2>${e(k.ad)}</h2></div>
        <select class="girdi" style="margin-left:auto;width:auto;height:34px;font-size:12.5px;max-width:150px" data-og aria-label="Kursiyer seç">${S.kursiyerler.slice(0, 40).map(x => `<option value="${x.id}" ${x.id === k.id ? 'selected' : ''}>${e(tamAd(x))}</option>`).join('')}</select></div>
      ${ogSekme === 'durum' ? `<p class="ipucu" style="font-size:13px">${isaret('bilgi', 18)}<span>Personel önizlemesi: kursiyerin telefonunda göreceği ekran. Kursiyerlerin kendi girişi sunucu kurulumuyla açılacak.</span></p>` : ''}
      ${govde}
      ${sekmeCubugu([['durum', 'Durum', 'genel'], ['program', 'Program', 'takvim'], ['ders', 'Dersler', 'teorik'], ['sinav', 'Sınavlar', 'sinav'], ['odeme', 'Ödemeler', 'kart'], ['evrak', 'Belgeler', 'belge']], ogSekme, 'ogs')}
    </div>`,
    baglan(kap) {
      clearInterval(sayac);
      const kalanEl = kap.querySelector('[data-kalan]');
      if (kalanEl) { const yaz = () => { const kalan = 45 * 60e3 - (Date.now() - test.basla); if (kalan <= 0) { clearInterval(sayac); test.i = test.liste.length; testBitir(k); yenile(); return; } kalanEl.textContent = String(Math.floor(kalan / 60e3)).padStart(2, '0') + ':' + String(Math.floor(kalan / 1e3) % 60).padStart(2, '0'); }; yaz(); sayac = setInterval(() => { if (!document.body.contains(kalanEl)) return clearInterval(sayac); yaz(); }, 1000); }
      kap.addEventListener('change', ev => { if (ev.target.matches('[data-og]')) { ogId = ev.target.value; test = { mod: null }; yenile(); } });
      OG.ogBagla(kap, k, yenile);
      kap.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-ogs]'); if (s) { ogSekme = s.dataset.ogs; yenile(true); }
        const o = t.closest('[data-ode]'); if (o) odemeYap(k, +o.dataset.ode);
        const oe = t.closest('[data-og-ekders]'); if (oe) { if (oe.dataset.ogEkders === 'evet') ekDersKabul(k); else { k.ekDersTeklif = null; gonderimEkle(S.kurs.ad, tamAd(k) + ' ek ders teklifini istemedi', 'Kursiyer cevabı'); kaydet(); bildir('Cevabın kursa iletildi'); yenile(); } }
        const ob = t.closest('[data-og-bos]'); if (ob) bosTeklifKabul(ob.dataset.ogBos, k.id, true);
        if (t.closest('[data-og-oto]')) pencere({ baslik: 'Otomatik çekim talimatı', icerik: `<p style="margin-bottom:12px;font-size:14px">Kalan ${k.odeme.taksitler.filter(x => !x.odendi).length} taksitin vadesinde bu karttan çekilecek.</p>${kartFormu()}`, altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Talimatı onayla</button>', onAc(d) { kartBagla(d); d.querySelector('[data-k]').addEventListener('click', () => { const kr = kartDogrula(d); if (kr.hata) return bildir(kr.hata, 'uyari'); k.odeme.otomatik = { son4: kr.son4, onay: gun(0) }; k.odeme.otoTalep = null; gonderimEkle(S.kurs.ad, tamAd(k) + ' otomatik çekim talimatı verdi (•••• ' + kr.son4 + ')', 'Kursiyer cevabı'); kaydet(); kapatPencere(); bildir('Talimat kaydedildi; taksitlerin vadesinde çekilecek'); yenile(); }); } });
        const tb = t.closest('[data-test-basla]'); if (tb && !tb.disabled) { if (tb.matches('[data-og-sinava]')) ogSekme = 'sinav'; testBaslat(tb.dataset.testBasla, k, tb.dataset.konu); yenile(true); }
        if (t.closest('[data-test-menu]')) { test = { mod: null }; yenile(true); }
        const c = t.closest('[data-cevap]');
        if (c && test.mod && test.cevap == null) {
          const qi = test.liste[test.i], cv = +c.dataset.cevap; test.cevaplar.push([qi, cv]); if (cv === SORULAR[qi][3]) test.dogru++;
          if (test.mod === 'deneme') { test.i++; if (test.i >= test.liste.length) testBitir(k); } else test.cevap = cv;
          yenile();
        }
        if (t.closest('[data-sonraki]')) { test.i++; test.cevap = null; if (test.i >= test.liste.length) testBitir(k); yenile(); }
        const dg = t.closest('[data-degis]'); if (dg) { const sd2 = sonrakiDers(k), m = `Merhaba, ben ${tamAd(k)}. ${sd2 ? tarihUzun(sd2.tarih) + ' ' + sd2.saat + ' direksiyon dersimin saatini' : 'Ders saatimi'} değiştirmek istiyorum.`; gonderimEkle(S.kurs.ad, m, 'Kursiyer talebi'); if (waAc(S.kurs.wp, m, 'WhatsApp', tamAd(k), false, 'KURSA GELEN') !== 'api') bildir('WhatsApp açıldı; mesajı kursa gönder', 'wp'); }
        if (t.closest('[data-iste]')) return randevuAl(k);
        const oi = t.closest('[data-og-iptal]'); if (oi) return randevuIptal(k, oi.dataset.ogIptal);
      });
    },
  };
}
function odemeYap(k, i) {
  const t = k.odeme.taksitler[i];
  if (!S.entegrasyon.pos.bagli) return pencere({ baslik: 'Taksit ödemesi', icerik: `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px"><span>${i + 1}. taksit · vade ${tarih(t.vade)}</span><b class="sayi" style="font-size:22px;color:var(--murekkep)">${tl(t.tutar - (t.kismi || 0))}</b></div><p class="ipucu">${isaret('bilgi', 18)}<span>Kartla online ödeme için kursun sanal POS bağlantısı henüz kurulmadı. ${S.kurs.iban ? 'Havale/EFT ile ödeyebilirsin: <b>' + e(S.kurs.iban) + '</b> (' + e(S.kurs.ad) + '); açıklamaya adını yaz.' : 'Kursta nakit ya da kartla ödeyebilirsin.'}</span></p>`, altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' });
  pencere({
    baslik: 'Kartla öde',
    icerik: `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px"><span>${i + 1}. taksit · vade ${tarih(t.vade)}</span><b class="sayi" style="font-size:22px;color:var(--murekkep)">${tl(t.tutar - (t.kismi || 0))}</b></div>${kartFormu()}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>${tl(t.tutar - (t.kismi || 0))} öde</button>`,
    onAc(d) {
      kartBagla(d);
      d.querySelector('[data-k]').addEventListener('click', () => {
        const kr = kartDogrula(d); if (kr.hata) return bildir(kr.hata, 'uyari');
        const tutar = t.tutar - (t.kismi || 0); t.odendi = gun(0); t.yontem = 'Kart'; delete t.kismi;
        S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + (i + 1) + '. taksit (online, kart •••• ' + kr.son4 + ')', tutar, yontem: 'Kart', kursiyer: k.id, kim: 'Online ödeme' });
        gonderimEkle(S.kurs.ad, tamAd(k) + ' online ödeme yaptı: ' + tl(tutar), 'Online ödeme'); kaydet(); kapatPencere(); bildir('Ödeme alındı. Makbuzun kursta hazır'); yenile();
      });
    },
  });
}
