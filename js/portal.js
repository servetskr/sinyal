import { oturum, islem, S, kaydet, gun, fark, tarihOku, SINIFLAR, ASAMALAR, EVRAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle } from './veri.js?v=29';
import { e, tl, ik, rozet, avatar, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, tarih, tarihUzun, goreli, gunKisa, aracGorsel, isaret, imzaAlani } from './ui.js?v=29';
import { yenile } from './app.js?v=29';
import { SORULAR, KONULAR } from './sorular.js?v=29';

let egId = 'e1', egSekme = 'bugun';
let ogId = null, ogSekme = 'durum';

const sekmeCubugu = (liste, secili, ad) => `<nav class="portal-sekme" aria-label="Sekmeler">${liste.map(([k, t, i]) => `<button data-${ad}="${k}" class="${k === secili ? 'secili' : ''}">${ik(i)}${t}</button>`).join('')}</nav>`;

/* ================= EĞİTMEN ================= */
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
      ${d.bas && d.durum === 'Planlandı' ? `<p class="ipucu" style="margin-top:10px">${isaret('tamam', 18)}<span>Ders ${d.bas}’te başladı · konum alındı. Bitirince imzalatın; süre otomatik yazılır.</span></p>` : ''}
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
        const db = t.closest('[data-ders-basla]'); if (db) { const d = S.dersler.find(x => x.id === db.dataset.dersBasla); d.bas = new Date().toTimeString().slice(0, 5); d.basZaman = Date.now(); d.konum = true; islem('Dersi başlattı', tamAd(kursiyer(d.kursiyer)) + ' · ' + d.bas); kaydet(); bildir('Ders başladı; başlangıç saati ve konum kaydedildi'); yenile(); return; }
        const y = t.closest('[data-yapildi]'); if (y) {
          const d = S.dersler.find(x => x.id === y.dataset.yapildi), ks = kursiyer(d.kursiyer);
          pencere({
            baslik: 'Dersi imzalayın',
            icerik: `<p style="margin-bottom:10px">${e(tamAd(ks))} · ${d.saat} · ${ks.direksiyon + 1}. ders. İmzalar direksiyon eğitimi takip formuna işlenir; kağıt form gerekmez.</p><p class="et">Kursiyer imzası</p><canvas class="imza-alan" width="900" height="300" data-imza="k" aria-label="Kursiyer imzası"></canvas><p class="et" style="margin-top:12px">Usta öğretici imzası · ${e(egitmen(d.egitmen).ad)}</p><canvas class="imza-alan" width="900" height="300" data-imza="u" aria-label="Usta öğretici imzası"></canvas>`,
            altlik: `<button class="dg dg-cizgi" data-temizle-imza>Temizle</button><button class="dg dg-ana" data-imza-kaydet>${ik('tik')}Ders yapıldı</button>`,
            onAc(p) {
              const ik_ = imzaAlani(p.querySelector('[data-imza=k]')), iu = imzaAlani(p.querySelector('[data-imza=u]'));
              p.querySelector('[data-temizle-imza]').addEventListener('click', () => { ik_.temizle(); iu.temizle(); });
              p.querySelector('[data-imza-kaydet]').addEventListener('click', () => {
                if (ik_.bos() || iu.bos()) return bildir('İki imza da gerekli', 'uyari');
                d.durum = 'Yapıldı'; d.imza = { zaman: new Date().toISOString().slice(0, 16), kursiyer: ik_.url(), usta: iu.url() };
                d.bit = new Date().toTimeString().slice(0, 5); d.sure = d.basZaman ? Math.round((Date.now() - d.basZaman) / 60e3) : null;
                if (d.sure != null && d.sure < 40) bildir(`Ders ${d.sure} dk sürdü; kısa ders olarak işaretlendi`, 'uyari');
                ks.direksiyon = Math.min(SINIFLAR[ks.sinif].direksiyon, ks.direksiyon + 1);
                islem('Ders imzalı tamamlandı', tamAd(ks) + ' · ' + d.saat); kaydet(); kapatPencere(); bildir('Ders imzalandı ve takip formuna işlendi'); yenile();
              });
            },
          });
        }
        const g = t.closest('[data-gelmedi]'); if (g) { const d = S.dersler.find(x => x.id === g.dataset.gelmedi); d.durum = 'Gelmedi'; kaydet(); gonderimEkle(tamAd(kursiyer(d.kursiyer)), 'Gelmedi bildirimi', 'Otomatik'); bildir('Kursiyere ve kursa bildirildi', 'wp'); yenile(); }
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
  if (!ogId || !kursiyer(ogId)) ogId = (S.kursiyerler.find(k => k.asama === 'Direksiyon' && k.odeme.taksitler.some(t => !t.odendi)) || S.kursiyerler[0]).id;
  const k = kursiyer(ogId), S0 = SINIFLAR[k.sinif], eg = egitmen(k.egitmen);
  const sd = sonrakiDers(k), sonraki = k.odeme.taksitler.map((t, i) => ({ t, i })).find(x => !x.t.odendi);
  const sinav = S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  let govde = '';
  if (ogSekme === 'durum') govde = `
    <div class="kart" style="padding:18px 6px 4px"><div style="padding:0 14px"><small style="color:var(--soluk)">Ehliyet yolculuğun</small><h3 style="font-size:18px;margin-top:2px">${k.asama === 'Ehliyet' ? 'Tebrikler, ehliyetini aldın!' : k.asama + ' aşamasındasın'}</h3></div>${yol(asamaNo(k), true)}</div>
    ${sd ? `<div class="kart" style="padding:8px">${sd.arac ? aracGorsel(arac(sd.arac)) : ''}<div style="padding:10px 10px 4px"><small style="color:var(--soluk)">Sıradaki direksiyon dersin</small><b style="display:block;font-family:var(--baslik);font-size:26px;font-weight:900;color:var(--murekkep)">${goreli(sd.tarih)} ${sd.saat}</b><p style="font-size:14.5px;margin-top:2px">${e(egitmen(sd.egitmen).ad)} ile · ${sd.arac ? e(arac(sd.arac).model) + ' · ' + arac(sd.arac).plaka : ''} · ${k.direksiyon + 1}. ders</p><button class="dg dg-cizgi dg-kucuk" style="margin-top:10px" data-degis="${sd.id}">Gelemeyeceğim, saati değiştir</button></div></div>` : ''}
    ${sinav ? `<div class="kart" style="padding:16px 18px;border-color:var(--serit-koyu)"><small style="color:var(--soluk)">Sınavın</small><b style="display:block;font-family:var(--baslik);font-size:20px;color:var(--murekkep);margin-top:4px">${sinav.tur} · ${goreli(sinav.tarih)} ${sinav.saat}</b><p style="font-size:13.5px">${e(sinav.yer)}. Kimliğini yanına almayı unutma.</p></div>` : ''}
    <div class="kart" style="padding:16px 18px"><div style="display:flex;justify-content:space-between;align-items:baseline"><small style="color:var(--soluk)">Ödeme durumun</small><b class="sayi" style="color:var(--murekkep)">${tl(odenen(k))} / ${tl(k.odeme.toplam)}</b></div>${ilerleme(odenen(k), k.odeme.toplam, 'yesil')}
      ${sonraki ? `<div style="display:flex;align-items:center;gap:10px;margin-top:12px"><div><b style="color:var(--murekkep)">${sonraki.i + 1}. taksit · ${tl(sonraki.t.tutar)}</b><small style="display:block;color:${fark(sonraki.t.vade) < 0 ? 'var(--kirmizi)' : 'var(--soluk)'}">Vade ${tarih(sonraki.t.vade)}${fark(sonraki.t.vade) < 0 ? ' · gecikti' : ''}</small></div><button class="dg dg-ana dg-kucuk" style="margin-left:auto" data-ode="${sonraki.i}">${ik('kart')}Öde</button></div>` : '<p style="margin-top:10px;color:var(--yesil);font-weight:600">Tüm ödemelerin tamam.</p>'}</div>
    <div class="izgara iz-2" style="gap:10px;grid-template-columns:1fr 1fr"><div class="kart gosterge"><small>Teorik</small><b style="font-size:22px">${k.teorik}/${S0.teorik}</b>${ilerleme(k.teorik, S0.teorik)}</div><div class="kart gosterge"><small>Direksiyon</small><b style="font-size:22px">${k.direksiyon}/${S0.direksiyon}</b>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</div></div>`;
  if (ogSekme === 'ders') {
    const l = S.dersler.filter(d => d.kursiyer === k.id).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
    govde = `<button class="dg dg-ana" style="width:100%;margin-bottom:14px" data-iste>${ik('arti')}Direksiyon dersi iste</button><div class="kart"><ul class="liste">${l.map(d => `<li><span class="zaman">${d.saat}</span><div><b style="color:var(--murekkep)">${goreli(d.tarih)}</b><small style="display:block;color:var(--soluk)">${e(egitmen(d.egitmen).ad)}</small></div><span class="sag">${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</span></li>`).join('') || '<li>' + bos('Henüz direksiyon dersin yok', 'e-Sınavı geçince derslerin planlanır.') + '</li>'}</ul></div>`;
  }
  if (ogSekme === 'odeme') govde = `<div class="kart"><div class="kart-govde">
      <div class="taksit-sira"><span class="no">P</span><div><b style="color:var(--murekkep)">Peşinat</b><small style="display:block;color:var(--soluk)">${tarih(k.odeme.pesinTarih)}</small></div><span class="sayi">${tl(k.odeme.pesin)}</span>${rozet('Ödendi', 'yesil')}</div>
      ${k.odeme.taksitler.map((t, i) => `<div class="taksit-sira"><span class="no">${i + 1}</span><div><b style="color:var(--murekkep)">${i + 1}. taksit</b><small style="display:block;color:${!t.odendi && fark(t.vade) < 0 ? 'var(--kirmizi)' : 'var(--soluk)'}">Vade ${tarih(t.vade)}</small></div><span class="sayi">${tl(t.tutar)}</span>${t.odendi ? rozet('Ödendi', 'yesil') : `<button class="dg dg-ana dg-kucuk" data-ode="${i}">Öde</button>`}</div>`).join('')}</div></div>`;
  if (ogSekme === 'test') {
    const MOD_AD = { deneme: 'Deneme sınavı', hizli: 'Hızlı test', konu: 'Konu çalışması', yanlis: 'Yanlışlarım' };
    if (!test.mod) {
      const son = (k.deneme || []).slice(-5);
      govde = `<div class="kart" style="padding:18px"><small style="color:var(--soluk)">e-Sınav provası</small><b style="display:block;font-family:var(--baslik);font-size:22px;color:var(--murekkep);margin:2px 0 6px">Deneme sınavı</b><p style="font-size:14px">50 soru · 45 dakika · geçme puanı 70. Sorular e-sınavdaki konu dağılımıyla gelir.</p><button class="dg dg-ana" style="width:100%;margin-top:12px" data-test-basla="deneme">Sınavı başlat</button></div>
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
  if (ogSekme === 'evrak') govde = `<div class="kart"><div class="kart-govde">${EVRAKLAR.map(([key, t]) => `<div class="evrak"><span class="durum ${k.evrak[key] ? 'var' : 'yok'}">${ik(k.evrak[key] ? 'tik' : 'kapat')}</span><span style="flex:1;color:var(--murekkep)">${t}</span>${k.evrak[key] ? '' : rozet('Kursa getir', 'uyari')}</div>`).join('')}</div></div>`;
  return {
    baslik: 'Kursiyer ekranı', alt: 'Kursiyerin telefonunda gördüğü ekran',
    html: `<div class="portal">
      <div class="portal-bas">${avatar(k.ad, k.soyad)}<div><small>Merhaba,</small><h2>${e(k.ad)}</h2></div>
        <select class="girdi" style="margin-left:auto;width:auto;height:34px;font-size:12.5px;max-width:150px" data-og aria-label="Kursiyer seç">${S.kursiyerler.slice(0, 40).map(x => `<option value="${x.id}" ${x.id === k.id ? 'selected' : ''}>${e(tamAd(x))}</option>`).join('')}</select></div>
      ${ogSekme === 'durum' ? `<p class="ipucu" style="font-size:13px">${isaret('bilgi', 18)}<span>Kursiyer bu ekrana telefon numarası ve SMS koduyla girer; yalnızca kendi bilgilerini görür. Bağlantı başka telefona iletilirse kod yeniden sorulur.</span></p>` : ''}
      ${govde}
      ${sekmeCubugu([['durum', 'Durumum', 'genel'], ['ders', 'Derslerim', 'direksiyon'], ['odeme', 'Ödemeler', 'kart'], ['test', 'Deneme', 'sinav'], ['evrak', 'Evrak', 'belge']], ogSekme, 'ogs')}
    </div>`,
    baglan(kap) {
      clearInterval(sayac);
      const kalanEl = kap.querySelector('[data-kalan]');
      if (kalanEl) { const yaz = () => { const kalan = 45 * 60e3 - (Date.now() - test.basla); if (kalan <= 0) { clearInterval(sayac); test.i = test.liste.length; testBitir(k); yenile(); return; } kalanEl.textContent = String(Math.floor(kalan / 60e3)).padStart(2, '0') + ':' + String(Math.floor(kalan / 1e3) % 60).padStart(2, '0'); }; yaz(); sayac = setInterval(() => { if (!document.body.contains(kalanEl)) return clearInterval(sayac); yaz(); }, 1000); }
      kap.addEventListener('change', ev => { if (ev.target.matches('[data-og]')) { ogId = ev.target.value; test = { mod: null }; yenile(); } });
      kap.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-ogs]'); if (s) { ogSekme = s.dataset.ogs; yenile(true); }
        const o = t.closest('[data-ode]'); if (o) odemeYap(k, +o.dataset.ode);
        const tb = t.closest('[data-test-basla]'); if (tb && !tb.disabled) { testBaslat(tb.dataset.testBasla, k, tb.dataset.konu); yenile(true); }
        if (t.closest('[data-test-menu]')) { test = { mod: null }; yenile(true); }
        const c = t.closest('[data-cevap]');
        if (c && test.mod && test.cevap == null) {
          const qi = test.liste[test.i], cv = +c.dataset.cevap; test.cevaplar.push([qi, cv]); if (cv === SORULAR[qi][3]) test.dogru++;
          if (test.mod === 'deneme') { test.i++; if (test.i >= test.liste.length) testBitir(k); } else test.cevap = cv;
          yenile();
        }
        if (t.closest('[data-sonraki]')) { test.i++; test.cevap = null; if (test.i >= test.liste.length) testBitir(k); yenile(); }
        const dg = t.closest('[data-degis]'); if (dg) { gonderimEkle(S.kurs.ad, tamAd(k) + ' ders saatini değiştirmek istiyor', 'Kursiyer talebi'); bildir('Talebin kursa iletildi; yeni saat WhatsApp’tan gelecek', 'wp'); }
        if (t.closest('[data-iste]')) pencere({ baslik: 'Direksiyon dersi iste', icerik: `<p style="color:var(--soluk);margin-bottom:10px">${e(eg.ad)} hocanın boş saatleri</p><div class="secim">${[1, 2, 3].flatMap(n => ['10:00', '15:00', '17:00'].filter(h => !S.dersler.some(d => d.egitmen === eg.id && d.tarih === gun(n) && d.saat === h)).map(h => `<label><input type="radio" name="s" value="${gun(n)} ${h}"><span>${gunKisa(gun(n))} ${tarihOku(gun(n)).getDate()} · ${h}</span></label>`)).join('')}</div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Talep gönder</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { const v = d.querySelector('[name=s]:checked'); if (!v) return bildir('Bir saat seçin', 'uyari'); kapatPencere(); gonderimEkle(S.kurs.ad, tamAd(k) + ' ders istiyor: ' + v.value, 'Kursiyer talebi'); bildir('Ders talebin kursa iletildi'); }); } });
      });
    },
  };
}
function odemeYap(k, i) {
  const t = k.odeme.taksitler[i];
  pencere({
    baslik: 'Kartla öde',
    icerik: `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px"><span>${i + 1}. taksit</span><b class="sayi" style="font-size:22px;color:var(--murekkep)">${tl(t.tutar)}</b></div>
      <div class="form-izgara"><div class="alan tam"><label>Kart numarası</label><input value="4111 1111 1111 1111" inputmode="numeric" aria-label="Kart numarası"></div><div class="alan"><label>Son kullanma</label><input value="12/30"></div><div class="alan"><label>CVC</label><input value="000"></div></div>
      <div class="ipucu uyari" style="margin-top:14px">${ik('kilit')}<span>Demo: test kartı dolu geliyor, gerçek ödeme alınmaz. Canlıda kursun sanal POS’u ile 3D Secure ödeme yapılır.</span></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>${tl(t.tutar)} öde</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { t.odendi = gun(0); t.yontem = 'Kart'; S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + (i + 1) + '. taksit (online)', tutar: t.tutar, yontem: 'Kart', kursiyer: k.id }); kaydet(); kapatPencere(); bildir('Ödeme alındı, makbuz WhatsApp’a gönderildi', 'wp'); yenile(); }); },
  });
}
