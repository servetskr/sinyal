import { S, kaydet, gun, fark, iso, tarihOku, BUGUN, SINIFLAR, ASAMALAR, EVRAKLAR, KAYNAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gecikenler, eksikEvrak, gonderimEkle, risk, islem, geriAlNoktasi, oturum, sb, sbDers, sbSinav, gorunum, seciliSube, cokSube, kapaliGun, YONTEMLER, yontemAd, gecikenTutar, aktifSiniflar, sinifKaydet, ayEkle, isGunuSay, arsivle, selam, kursAdi } from './veri.js?v=53';
import { e, saatDe, saatE, tl, sayi, ik, rozet, asamaRozet, avatar, plaka, ilerleme, bos, pencere, kapatPencere, bildir, sekmeler, tarih, tarihUzun, goreli, cubukGrafik, halka, ayAdi, csvIndir, waAc, waSirali, tamTarih, apiAcik, isaret, ekranNotu, aracGorsel, olcumler, yonLevhasi } from './ui.js?v=53';
import { yenile } from './app.js?v=53';
import { AYAR_SEKMELERI, ayarBaglan, personelOzeti, mebAktarimKarti, mebAracKur, mebAktar, MEB_RISK } from './sayfalar5.js?v=53';
import { wpGonder, tahsilAl, ekDersOner, kisiListe, odemeBilgisi, yorumMetni, alici, mudurMu, bildirimler } from './sayfalar1.js?v=53';
import { denetimEksikleri, mebSiraBaslat } from './sayfalar3.js?v=53';
import * as OZ from './ozellik.js?v=53';
import { kurallariHazirla, zamanliKural, kuralSaati, ornekGonder, zamanlayiciCalistir, kuyruguGonder, gidecekler } from './zamanlayici.js?v=53';
import * as MM from './mesaj.js?v=53';

const durum = { sinav: 'yaklasan', kasa: 'hareket', filo: 'arac', mesaj: 'gelen', meb: 'asistan', ayar: 'kurs' };
let secSohbet = null, gecmisKim = '';

/* ================= SINAVLAR ================= */
export function sinavlar(alt) {
  if (['yaklasan', 'gecmis', 'risk'].includes(alt)) durum.sinav = alt;
  const gec = sbSinav(S.sinavlar).filter(s => Object.keys(s.sonuc).length);
  const oran = tur => { const l = gec.filter(s => s.tur === tur).flatMap(s => Object.values(s.sonuc)); return l.length ? Math.round(l.filter(x => x === 'Geçti').length / l.length * 100) : 0; };
  const kalanlar = sb(S.kursiyerler).filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı');
  const riskli = sb(S.kursiyerler).map(k => ({ k, r: risk(k) })).filter(x => x.r && x.r.puan >= 25).sort((a, b) => b.r.puan - a.r.puan);
  const liste = sbSinav(S.sinavlar).filter(s => durum.sinav === 'yaklasan' ? fark(s.tarih) >= 0 : fark(s.tarih) < 0).sort((a, b) => durum.sinav === 'yaklasan' ? a.tarih.localeCompare(b.tarih) : b.tarih.localeCompare(a.tarih));
  const kartSinav = s => {
    const ks = s.kursiyerler.map(kursiyer).filter(Boolean), sonucVar = Object.keys(s.sonuc).length;
    const gecen = Object.values(s.sonuc).filter(x => x === 'Geçti').length;
    return `<div class="kart"><div class="kart-bas" style="padding-bottom:4px"><span class="oto-ik">${ik(s.tur === 'e-Sınav' ? 'teorik' : 'direksiyon')}</span><div><h3>${s.tur} · ${tarihUzun(s.tarih)}</h3><small>${s.saat} · ${e(s.yer)}</small></div>
      <div class="sag">${sonucVar ? rozet(`${gecen}/${ks.length} geçti`, gecen / ks.length > .7 ? 'yesil' : 'turuncu') : rozet(goreli(s.tarih), fark(s.tarih) <= 3 ? 'sari' : 'mavi')}</div></div>
      <ul class="liste" style="margin-top:6px">${ks.slice(0, 6).map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${SINIFLAR[k.sinif].ad}${k.dsinav && k.dsinav.sonuc === 'Kaldı' && !s.sonuc[k.id] ? ' · ' + (k.dsinav.hak + 1) + '. hak' : ''}</small></div></a><span class="sag">${s.sonuc[k.id] ? rozet(s.sonuc[k.id], s.sonuc[k.id] === 'Geçti' ? 'yesil' : 'kirmizi') : ''}</span></li>`).join('') || '<li>' + bos('Bu oturuma kursiyer eklenmedi', '') + '</li>'}
        ${ks.length > 6 ? `<li style="color:var(--soluk);font-size:13px">+${ks.length - 6} kursiyer daha</li>` : ''}</ul>
      <div style="display:flex;gap:8px;padding:12px 20px 16px;border-top:1px solid var(--cizgi-2);flex-wrap:wrap">
        ${fark(s.tarih) <= 0 && !sonucVar ? `<button class="dg dg-ana dg-kucuk" data-sonuc="${s.id}">Sonuçları gir</button>` : ''}
        ${fark(s.tarih) >= 0 ? `<button class="dg dg-cizgi dg-kucuk" data-ekle="${s.id}">${ik('arti')}Kursiyer ekle</button><button class="dg dg-wp dg-kucuk" data-hatir="${s.id}">${ik('wp')}Hepsine hatırlat</button>` : ''}
        <button class="dg dg-hafif dg-kucuk" data-liste="${s.id}">${ik('indir')}Listeyi indir</button>
      </div></div>`;
  };
  return {
    baslik: 'Sınavlar', alt: 'e-Sınav ve direksiyon sınavı oturumları',
    html: `${ekranNotu('Sınav günleri, kimlerin gireceği ve sonuçlar. “Kalma riski” sekmesi kalabilecek kursiyeri önceden gösterir; ek ders önerip hem kursiyeri hem geliri kurtarın.')}<div class="izgara iz-4">
      <div class="kart gosterge"><small>e-Sınav geçme oranı</small><b>%${oran('e-Sınav')}</b><span>Son oturumlar</span></div>
      <div class="kart gosterge"><small>Direksiyon geçme oranı</small><b>%${oran('Direksiyon')}</b><span>Son oturumlar</span></div>
      <div class="kart gosterge"><small>Sınava hazır</small><b>${sb(S.kursiyerler).filter(k => k.asama === 'Sınav' && !k.dsinav && !k.dsinavPlan).length}</b><span>Direksiyon derslerini bitirdi, oturum bekliyor</span></div>
      <div class="kart gosterge"><small>Tekrar sınava girecek</small><b>${kalanlar.length}</b><span>${(() => { const t = kalanlar.filter(k => k.ekDersTeklif).length, y = kalanlar.filter(k => S.sinavlar.some(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && s.kursiyerler.includes(k.id))).length; return kalanlar.length ? `${y} kişi yeni oturuma yazıldı · ${t} kişiye ek ders teklif edildi` : 'Kalan kursiyer yok'; })()}</span></div>
    </div><div class="ara-bosluk"></div>
    <div class="bolum-bas"><div id="sek">${sekmeler([['yaklasan', 'Yaklaşan', sbSinav(S.sinavlar).filter(s => fark(s.tarih) >= 0).length], ['gecmis', 'Geçmiş', sbSinav(S.sinavlar).filter(s => fark(s.tarih) < 0).length], ['risk', 'Kalma riski', riskli.length]], durum.sinav)}</div><div class="sag"><button class="dg dg-ana" data-yeni>${ik('arti')}Sınav oturumu ekle</button></div></div>
    ${durum.sinav === 'risk' ? `<div class="kart"><div class="kart-bas"><h3>Sınavda kalabilecek kursiyerler</h3><small>Usta öğreticinin ders sonu beceri puanları, deneme sınavları, devamsızlık ve önceki sonuçlardan hesaplanır</small>${riskli.some(x => x.r.puan >= 50 && x.r.oneri && !x.k.ekDersTeklif) ? `<div class="sag"><button class="dg dg-wp dg-kucuk" data-toplu-ekders>${ik('wp')}Yüksek risklilere ek ders teklif et</button></div>` : ''}</div><ul class="liste" style="margin-top:8px">${riskli.map(({ k, r }) => `<li>${isaret(r.puan >= 50 ? 'uyari' : 'bilgi', 28)}<a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))} · ${r.seviye} risk · ${r.puan}/100</b><small>${r.tur} · ${e(r.nedenler.join(' · '))}</small></div></a><span class="sag">${k.ekDersTeklif ? rozet(k.ekDersTeklif.n + ' ders teklif edildi', 'mavi') : `<button class="dg dg-ana dg-kucuk" data-ekders="${k.id}">Ek ders öner</button>`}</span></li>`).join('') || '<li>' + bos('Riskli kursiyer yok', 'Herkes sınava hazır görünüyor.') + '</li>'}</ul></div>` : `<div class="izgara iz-2">${liste.map(kartSinav).join('') || `<div class="kart">${bos('Oturum yok', 'Yeni bir sınav oturumu ekleyin.')}</div>`}</div>`}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.sinav = s.dataset.sekme; yenile(); }
        if (t.closest('[data-yeni]')) oturumEkle();
        const ed = t.closest('[data-ekders]'); if (ed) ekDersOner(kursiyer(ed.dataset.ekders));
        if (t.closest('[data-toplu-ekders]')) {
          const l = riskli.filter(x => x.r.puan >= 50 && x.r.oneri && !x.k.ekDersTeklif);
          l.forEach(({ k, r }) => { k.ekDersTeklif = { n: r.oneri, tutar: r.oneri * S.kurs.ekDersUcreti, tarih: gun(0), neden: 'risk' }; });
          islem('Riskli kursiyerlere ek ders teklif etti', l.length + ' kursiyer'); kaydet(); yenile();
          waSirali(l.map(({ k, r }) => { const a = alici(k); return { ad: a.ad, tel: a.tel, rol: a.rol, tur: 'Ek ders teklifi', metin: `${selam(k)} son derslerinize göre ${r.tur.toLocaleLowerCase('tr')} öncesi ${r.oneri} ek direksiyon dersi (${tl(r.oneri * S.kurs.ekDersUcreti)}) öneriyoruz${r.beceri && r.beceri.zayif.length ? '; özellikle ' + r.beceri.zayif.join(', ').toLocaleLowerCase('tr') + ' üzerinde çalışacağız' : ''}. Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.` }; }), 'Ek ders teklifi');
        }
        const so = t.closest('[data-sonuc]'); if (so) sonucGir(S.sinavlar.find(x => x.id === so.dataset.sonuc));
        const ek = t.closest('[data-ekle]'); if (ek) sinavaEkle(S.sinavlar.find(x => x.id === ek.dataset.ekle));
        const h = t.closest('[data-hatir]'); if (h) { const s2 = sbSinav(S.sinavlar).find(x => x.id === h.dataset.hatir); const ml = k => `${selam(k)} ${s2.tur === 'e-Sınav' ? 'e-sınavınız' : 'direksiyon sınavınız'} ${tarihUzun(s2.tarih)} ${saatDe(s2.saat)}, yer: ${s2.yer}. Kimliğinizi yanınıza almayı unutmayın. Başarılar!`; const l = s2.kursiyerler.map(kursiyer).filter(Boolean); waSirali(kisiListe(l, ml), s2.tur + ' hatırlatması'); }
        const l = t.closest('[data-liste]'); if (l) { const s2 = sbSinav(S.sinavlar).find(x => x.id === l.dataset.liste); csvIndir(`sinav-${s2.tur}-${s2.tarih}.csv`, [['Ad', 'Soyad', 'Telefon', 'Sınıf', 'Sonuç'], ...s2.kursiyerler.map(kursiyer).map(x => [x.ad, x.soyad, x.tel, SINIFLAR[x.sinif].ad, s2.sonuc[x.id] || ''])]); bildir('Sınav listesi indirildi'); }
      });
    },
  };
}
function oturumEkle() {
  pencere({
    baslik: 'Sınav oturumu ekle',
    icerik: `<form class="form-izgara" id="f-sinav"><div class="alan tam"><span class="et">Sınav türü</span><div class="secim"><label><input type="radio" name="tur" value="e-Sınav" checked><span>e-Sınav</span></label><label><input type="radio" name="tur" value="Direksiyon"><span>Direksiyon sınavı</span></label></div></div>
      <div class="alan"><label>Tarih</label><input type="date" name="tarih" value="${gun(7)}" required></div><div class="alan"><label>Saat</label><input type="time" name="saat" value="09:00" required></div>
      <div class="alan tam"><label>Yer</label><input name="yer" value="Odunpazarı e-Sınav Merkezi" required></div></form>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:12px">Tarihi MEB’den gelen sınav takvimine göre girin; kursiyerleri sonra ekleyebilirsiniz.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-sinav">Oturumu ekle</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      f.addEventListener('change', () => { if (f.tur.value === 'Direksiyon' && f.yer.value.includes('e-Sınav')) f.yer.value = 'Sınav güzergâhı · Organize Sanayi'; });
      f.addEventListener('submit', ev => { ev.preventDefault(); const kg = kapaliGun(f.tarih.value); if (kg && !f.dataset.onay) { f.dataset.onay = '1'; return bildir(`${tarihUzun(f.tarih.value)} ${kg.toLowerCase()}. Tarih MEB takviminden doğruysa yeniden “Oturumu ekle”ye basın.`, 'uyari'); } S.sinavlar.push({ id: 's' + Date.now(), tur: f.tur.value, tarih: f.tarih.value, saat: f.saat.value, yer: f.yer.value, kursiyerler: [], sonuc: {} }); kaydet(); kapatPencere(); bildir('Sınav oturumu eklendi'); durum.sinav = 'yaklasan'; yenile(); });
    },
  });
}
// Otomatik mesaj kuralı açık mı (Mesajlar › Otomatik mesajlar)
const kuralAcik = id => (S.otomasyonlar.find(o => o.id === id) || {}).acik !== false;
// Sınav ücreti oturuma yazılınca eklenir: e-sınav her oturumda, direksiyon sınavı tekrarda
function sinavUcreti(k, s) {
  const es = s.tur === 'e-Sınav', o = es ? k.esinav : k.dsinav, hak = (o && o.sonuc !== 'Geçti' ? o.hak : 0) + 1;
  const tutar = es ? (hak === 1 ? (S.kurs.esinavUcreti || 1250) : S.kurs.tekrarUcret.esinav) : hak > 1 ? S.kurs.tekrarUcret.dsinav : 0;
  k.odeme.ekler = k.odeme.ekler || [];
  if (!tutar || k.odeme.ekler.some(x => x.sinav === s.id)) return;
  k.odeme.ekler.push({ ad: `${es ? 'e-Sınav ücreti' : 'Direksiyon sınavı tekrar ücreti'} (${hak}. hak · ${tarih(s.tarih)})`, tutar, odendi: null, sinav: s.id });
}
// Sınava yazılan kursiyere randevu bilgisi, direksiyon sınavında hocasına liste
function sinavBildir(s, ks) {
  const es = s.tur === 'e-Sınav', l = [];
  if (es && kuralAcik('o8')) ks.forEach(k => l.push({ kim: k, tur: 'e-Sınav randevusu', metin: `${selam(k)} e-sınav randevunuz ${tarihUzun(s.tarih)} ${saatDe(s.saat)}, yer: ${s.yer}. Kimliğinizi ve e-sınav ücreti dekontunu yanınıza alın.` }));
  if (!es) {
    ks.forEach(k => l.push({ kim: k, tur: 'Sınav bildirimi', metin: `${selam(k)} direksiyon sınavınız ${tarihUzun(s.tarih)} ${saatDe(s.saat)}, yer: ${s.yer}. Kimliğinizi unutmayın; sınavdan önce bir tekrar dersi isterseniz ${kursAdi('e')} yazın.` }));
    const hocaya = {}; ks.forEach(k => { const h = egitmen(k.egitmen); if (h) (hocaya[h.id] = hocaya[h.id] || { h, l: [] }).l.push(tamAd(k)); });
    Object.values(hocaya).forEach(({ h, l: ad }) => l.push({ kim: h, tur: 'Sınav listesi', metin: `${h.ad.split(' ')[0]} Hoca, ${tarihUzun(s.tarih)} ${saatDe(s.saat)} direksiyon sınavına kursiyerleriniz yazıldı: ${ad.join(', ')}.` }));
  }
  if (l.length) bildirimler(l, s.tur + ' · sınava yazıldı');
}
function sinavaEkle(s) {
  const uygun = sb(S.kursiyerler).filter(k => !s.kursiyerler.includes(k.id) && !(k.hakBitti && !k.hakBitti.cozuldu) && (s.tur === 'e-Sınav' ? (k.asama === 'Teorik' && k.teorik >= SINIFLAR[k.sinif].teorik - 4) || (k.esinav && k.esinav.sonuc === 'Kaldı') : (k.asama === 'Sınav' && !(k.dsinav && k.dsinav.sonuc === 'Geçti'))));
  pencere({
    baslik: s.tur + ' · kursiyer ekle',
    icerik: uygun.length ? `<p style="color:var(--soluk);margin-bottom:10px">${s.tur === 'e-Sınav' ? 'Teorik derslerini tamamlayan' : 'Direksiyon derslerini tamamlayan'} kursiyerler listelenir.</p>${uygun.map(k => `<label class="evrak" style="cursor:pointer"><input type="checkbox" value="${k.id}" checked style="width:18px;height:18px;accent-color:var(--levha)">${avatar(k.ad, k.soyad)}<span style="flex:1;color:var(--murekkep)">${e(tamAd(k))}</span>${rozet(SINIFLAR[k.sinif].ad.split(' ·')[0])}</label>`).join('')}` : bos('Eklenecek kursiyer yok', 'Bu sınav için şartları tamamlayan kursiyer bulunmuyor.'),
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${uygun.length ? '<button class="dg dg-ana" data-kaydet>Seçilenleri ekle</button>' : ''}`,
    onAc(d) { const b = d.querySelector('[data-kaydet]'); if (b) b.addEventListener('click', () => { const ids = [...d.querySelectorAll('input:checked')].map(x => x.value); s.kursiyerler.push(...ids); const ks = ids.map(kursiyer); ks.forEach(k => { if (s.tur === 'Direksiyon') k.dsinavPlan = s.tarih; sinavUcreti(k, s); }); islem('Sınava kursiyer yazdı', s.tur + ' · ' + tarih(s.tarih) + ' · ' + ids.length + ' kişi'); kaydet(); kapatPencere(); bildir(ids.length + ' kursiyer sınava eklendi' + (s.tur === 'e-Sınav' ? '; e-sınav ücreti ödeme planına eklendi' : '')); yenile(); sinavBildir(s, ks); }); },
  });
}
function sonucGir(s) {
  const ks = s.kursiyerler.map(kursiyer).filter(Boolean), es = s.tur === 'e-Sınav', HAK = S.kurs.sinavHak || 4, ESIK = 70;
  const onceki = k => es ? k.esinav : k.dsinav, hakNo = k => (onceki(k) && onceki(k).sonuc !== 'Geçti' ? onceki(k).hak : 0) + 1;
  pencere({
    baslik: s.tur + ' sonuçları', genis: false,
    icerik: `<p style="color:var(--soluk);margin-bottom:10px">${tarihUzun(s.tarih)} · ${ks.length} kursiyer · ${es ? `sonuç belgesindeki puanı girin, ${ESIK} ve üstü geçer` : 'sınav komisyonunun sonucunu işaretleyin'}</p>${ks.map(k => `<div class="evrak" style="flex-wrap:wrap" data-satir="${k.id}">${avatar(k.ad, k.soyad)}<span style="flex:1;color:var(--murekkep);min-width:140px">${e(tamAd(k))}<small style="display:block;color:${hakNo(k) >= HAK ? 'var(--kirmizi);font-weight:700' : 'var(--soluk)'}">${hakNo(k)}. hak${hakNo(k) >= HAK ? ' · son hak' : ''}</small></span>
        ${es ? `<input class="girdi" name="p-${k.id}" inputmode="numeric" maxlength="3" placeholder="Puan" aria-label="${e(tamAd(k))} puanı" style="width:78px;text-align:center"><span data-durum="${k.id}" style="width:56px;font-size:13px;font-weight:700"></span><label style="font-size:13px;display:flex;gap:4px;align-items:center"><input type="checkbox" name="g-${k.id}"> Girmedi</label>`
        : `<div class="secim"><label><input type="radio" name="${k.id}" value="Geçti"><span>Geçti</span></label><label><input type="radio" name="${k.id}" value="Kaldı"><span>Kaldı</span></label><label><input type="radio" name="${k.id}" value="Girmedi"><span>Girmedi</span></label></div>`}</div>`).join('')}
      <div class="ipucu" style="margin-top:14px">${ik('robot')}<span>Geçenlere tebrik ve Google yorum isteği gider. Kalanların tekrar ücreti (${tl(es ? S.kurs.tekrarUcret.esinav : S.kurs.tekrarUcret.dsinav)}) ödeme planına eklenir; sonraki adımı bir sonraki ekranda seçersiniz. Girmeyen kursiyerin hakkı düşer.</span></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet>Sonuçları kaydet</button>`,
    onAc(d) {
      const oku = k => {
        if (es) { if (d.querySelector(`[name="g-${k.id}"]`).checked) return { v: 'Girmedi' }; const t = d.querySelector(`[name="p-${k.id}"]`).value.trim(); if (t === '' || isNaN(+t) || +t < 0 || +t > 100) return null; return { v: +t >= ESIK ? 'Geçti' : 'Kaldı', puan: +t }; }
        const r = d.querySelector(`[name="${k.id}"]:checked`); return r ? { v: r.value } : null;
      };
      if (es) d.addEventListener('input', () => ks.forEach(k => { const o = oku(k), el = d.querySelector(`[data-durum="${k.id}"]`); el.textContent = o ? (o.v === 'Girmedi' ? '' : o.v) : ''; el.style.color = o && o.v === 'Geçti' ? 'var(--yesil)' : 'var(--kirmizi)'; d.querySelector(`[name="p-${k.id}"]`).disabled = d.querySelector(`[name="g-${k.id}"]`).checked; }));
      d.querySelector('[data-kaydet]').addEventListener('click', () => {
        const eksik = ks.filter(k => !oku(k)); if (eksik.length) return bildir(`${eksik.length} kursiyerin sonucu eksik ya da puan 0–100 dışında: ${eksik.slice(0, 3).map(tamAd).join(', ')}`, 'uyari');
        geriAlNoktasi(); let g = 0; const kalan = [], mesaj = []; islem('Sınav sonucu girdi', s.tur + ' · ' + tarih(s.tarih) + ' · ' + ks.length + ' kursiyer');
        ks.forEach(k => {
          const o = oku(k), hak = hakNo(k), gecti = o.v === 'Geçti'; s.sonuc[k.id] = o.v;
          const kayit = { sonuc: gecti ? 'Geçti' : 'Kaldı', hak, tarih: s.tarih, ...(o.puan != null ? { puan: o.puan } : {}), ...(o.v === 'Girmedi' ? { girmedi: true } : {}) };
          if (es) k.esinav = kayit; else { k.dsinav = kayit; delete k.dsinavPlan; }
          if (gecti) { g++; if (es) { k.asama = SINIFLAR[k.sinif].direksiyon ? 'Direksiyon' : 'Ehliyet'; if (kuralAcik('o9')) mesaj.push([k, `${selam(k)} tebrikler, e-sınavı ${o.puan} puanla geçtiniz! ${SINIFLAR[k.sinif].direksiyon ? 'Sıradaki adım direksiyon dersleri; saatlerini birlikte ayarlayalım.' : 'Belgeniz için sizi arayacağız.'}`]); } else { k.asama = 'Ehliyet'; k.kapanis = {}; if (kuralAcik('o5')) { k.yorum = 'istendi'; mesaj.push([k, yorumMetni(k)]); } else if (kuralAcik('o9')) mesaj.push([k, `${selam(k)} tebrikler, direksiyon sınavını geçtiniz! Ehliyetiniz hayırlı olsun.`]); } return; }
          if (hak >= HAK) { k.hakBitti = { tur: s.tur, tarih: s.tarih }; mesaj.push([k, `${selam(k)} ${es ? 'e-sınav' : 'direksiyon sınavı'} bu sefer olmadı ve sınav haklarınız doldu. Yeni dönem kaydı için sizi arayacağız.`]); }
          else {
            const teklif = !es && kuralAcik('o6') && !k.ekDersTeklif;
            if (teklif) k.ekDersTeklif = { n: 2, tutar: 2 * S.kurs.ekDersUcreti, tarih: gun(0), neden: 'kaldi' };
            if (kuralAcik('o9') || teklif) mesaj.push([k, `${selam(k)} ${es ? 'e-sınav' : 'direksiyon sınavı'} bu sefer olmadı. Üzülmeyin, ${HAK - hak} hakkınız daha var; sonraki oturumu birlikte planlayalım.${teklif ? ` Sınava kadar 2 ek direksiyon dersi (${tl(2 * S.kurs.ekDersUcreti)}) ayarlayalım mı? Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.` : ''}`]);
          }
          kalan.push(k);
        });
        kaydet(); kapatPencere(); bildir(`${g}/${ks.length} geçti`); yenile();
        const hocaya = {}; ks.forEach(k => { const h = egitmen(k.egitmen); if (h) (hocaya[h.id] = hocaya[h.id] || { h, l: [] }).l.push(tamAd(k) + ': ' + (s.sonuc[k.id] === 'Geçti' ? 'geçti' : s.sonuc[k.id] === 'Girmedi' ? 'girmedi' : 'kaldı')); });
        waSirali([...mesaj.map(([k, m]) => ({ ad: tamAd(k), tel: k.tel, rol: 'ÖĞRENCİ', metin: m })), ...Object.values(hocaya).map(({ h, l }) => ({ ad: h.ad, tel: h.tel, rol: 'HOCA', metin: `${h.ad.split(' ')[0]} Hoca, ${tarih(s.tarih)} ${s.tur.toLocaleLowerCase('tr')} sonuçları: ${l.join('; ')}.` }))], 'Sonuçları bildir', { bitince: () => { if (kalan.length) kalanlarSonraki(s, kalan); } });
      });
    },
  });
}
// Kalanlar: sonraki oturuma yaz, direksiyonda ek ders öner; hakkı dolanı kursiyer dosyasına yönlendir.
function kalanlarSonraki(s, kalan) {
  const sonraki = S.sinavlar.filter(x => x.tur === s.tur && x.id !== s.id && fark(x.tarih) > 0).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const bekleme = S.kurs.tekrarBekleme || 0;
  pencere({
    baslik: 'Kalanlar için sonraki adım',
    icerik: `<p style="color:var(--soluk);margin-bottom:12px">${s.tur} · ${kalan.length} kursiyer${!sonraki.length ? ' · yaklaşan oturum yok, önce Sınavlar’dan oturum ekleyin' : ''}</p>${kalan.map(k => `<div class="evrak" style="flex-wrap:wrap">${avatar(k.ad, k.soyad)}<span style="flex:1;color:var(--murekkep);min-width:140px">${e(tamAd(k))}<small style="display:block;color:var(--soluk)">${(s.tur === 'e-Sınav' ? k.esinav : k.dsinav).hak}. hak kullanıldı</small></span>
      ${k.hakBitti ? `<a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}" data-kapat>Hakkı doldu · karar ver</a>` : `<select class="girdi" name="o-${k.id}" style="width:auto"><option value="">Sonra planla</option>${sonraki.map(x => `<option value="${x.id}" ${fark(x.tarih) < bekleme ? 'disabled' : ''}>${tarih(x.tarih)} ${x.saat}${fark(x.tarih) < bekleme ? ' · ' + bekleme + ' gün dolmadı' : ''}</option>`).join('')}</select>${s.tur === 'Direksiyon' ? `<button class="dg dg-hafif dg-kucuk" data-ekd="${k.id}">Ek ders öner</button>` : ''}`}</div>`).join('')}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Sonra</button><button class="dg dg-ana" data-k>Kaydet</button>`,
    onAc(d) {
      d.querySelectorAll('[data-ekd]').forEach(b => b.addEventListener('click', () => ekDersOner(kursiyer(b.dataset.ekd), () => kalanlarSonraki(s, kalan))));
      d.querySelector('[data-k]').addEventListener('click', () => {
        let n = 0;
        const ml = []; kalan.filter(k => !k.hakBitti).forEach(k => { const v = (d.querySelector(`[name="o-${k.id}"]`) || {}).value; if (!v) return; const x = S.sinavlar.find(y => y.id === v); if (!x.kursiyerler.includes(k.id)) x.kursiyerler.push(k.id); if (x.tur === 'Direksiyon') k.dsinavPlan = x.tarih; sinavUcreti(k, x); const m = `${selam(k)} yeni ${x.tur === 'e-Sınav' ? 'e-sınavınız' : 'direksiyon sınavınız'} ${tarihUzun(x.tarih)} ${saatDe(x.saat)}, yer: ${x.yer}.`; ml.push({ ad: tamAd(k), tel: k.tel, rol: 'ÖĞRENCİ', metin: m, tur: 'Sınav bildirimi' }); n++; });
        kaydet(); kapatPencere(); bildir(n ? n + ' kursiyer sonraki oturuma yazıldı' : 'Kaydedildi'); yenile(); waSirali(ml, 'Yeni sınav tarihini bildir');
      });
    },
  });
}

/* ================= KASA ================= */
export function kasa(alt) {
  if (alt === 'geciken') durum.kasa = 'geciken';
  const ayBas = new Date(BUGUN); ayBas.setDate(1);
  const ayToplam = (m, tur) => { const d = new Date(ayBas); d.setMonth(d.getMonth() - m); return sb(S.hareket).filter(h => h.tur === tur && tarihOku(h.tarih).getMonth() === d.getMonth() && tarihOku(h.tarih).getFullYear() === d.getFullYear()).reduce((a, h) => a + h.tutar, 0); };
  const gelir = ayToplam(0, 'Gelir'), gider = ayToplam(0, 'Gider');
  const alacak = sb(S.kursiyerler).reduce((a, k) => a + kalanBorc(k), 0);
  const gecikenK = sb(S.kursiyerler).filter(k => gecikenler(k).length);
  const gecikenT = gecikenK.reduce((a, k) => a + gecikenTutar(k), 0);
  const grafik = []; for (let m = 5; m >= 0; m--) { const d = new Date(ayBas); d.setMonth(d.getMonth() - m); grafik.push({ e: ayAdi(d.getMonth()), v: ayToplam(m, 'Gelir'), v2: ayToplam(m, 'Gider'), vurgu: m === 0 }); }
  const yaklasan = sb(S.kursiyerler).flatMap(k => k.odeme.taksitler.map((t, i) => ({ k, t, i }))).filter(x => !x.t.odendi && !x.t.iptal && fark(x.t.vade) >= 0 && fark(x.t.vade) <= 30).sort((a, b) => a.t.vade.localeCompare(b.t.vade));
  const gec = sb(S.kursiyerler).flatMap(k => k.odeme.taksitler.map((t, i) => ({ k, t, i }))).filter(x => !x.t.odendi && !x.t.iptal && fark(x.t.vade) < 0).sort((a, b) => a.t.vade.localeCompare(b.t.vade));
  const hareketler = [...sb(S.hareket)].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 40);
  const taksitSatir = ({ k, t, i }, gecik) => `<tr><td><a class="kisi" href="#/kursiyer/${k.id}">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${i + 1}. taksit · ${e(k.tel)}</small></div></a></td><td class="m-gizle">${tarih(t.vade)}</td><td>${gecik ? rozet(-fark(t.vade) + ' gün gecikti', 'kirmizi') : rozet(goreli(t.vade), fark(t.vade) <= 3 ? 'sari' : 'notr')}</td><td class="sag sayi">${tl(t.tutar)}</td><td class="sag m-tam"><button class="dg dg-cizgi dg-kucuk" data-hat="${k.id}|${i}">${ik('wp')}Hatırlat</button> <button class="dg dg-ana dg-kucuk" data-tahsil="${k.id}|${i}">Tahsil et</button></td></tr>`;
  let govde = '';
  if (durum.kasa === 'hareket') govde = `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Son hareketler</h3><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-disa>${ik('indir')}Excel</button></div></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th>Yöntem</th><th class="sag">Tutar</th></tr></thead><tbody>${hareketler.map(h => `<tr><td class="m-gizle">${tarih(h.tarih)}</td><td class="m-tam"><b style="color:var(--murekkep);font-weight:500">${e(h.aciklama)}</b>${h.no ? `<small style="display:block;color:var(--soluk)">${e(h.no)}${h.fatura ? ' · ' + e(h.fatura) : ''}</small>` : ''}${mudurMu() ? ` <button class="dg dg-hafif dg-kucuk" data-h-duz="${h.id}">Düzelt</button>` : ''}</td><td>${rozet(h.kategori, h.tur === 'Gelir' ? 'yesil' : 'notr')}</td><td class="m-gizle">${e(yontemAd(h.yontem))}</td><td class="sag sayi" style="color:${h.tur === 'Gelir' ? 'var(--yesil)' : 'var(--murekkep)'}">${h.tur === 'Gelir' ? '+' : '−'}${tl(h.tutar)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="kart"><div class="kart-bas"><h3>Gider dağılımı</h3><small>Bu ay</small></div><div class="kart-govde" style="display:flex;flex-direction:column;align-items:center;gap:18px">${(() => { const kat = {}; sb(S.hareket).filter(h => h.tur === 'Gider' && fark(h.tarih) > -BUGUN.getDate()).forEach(h => kat[h.kategori] = (kat[h.kategori] || 0) + h.tutar); const renk = ['#13171c', '#0a5bb0', '#ffc61a', '#b96206', '#6744b8', '#868d97']; const p = Object.entries(kat).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ k, v, renk: renk[i % 6] })); return halka(p, { orta: `<div><b>${tl(gider).replace(' ₺', '')}</b><small>₺ gider</small></div>`, boyut: 150 }) + `<ul class="lejant" style="width:100%">${p.map(x => `<li><i style="background:${x.renk}"></i>${e(x.k)}<b>${tl(x.v)}</b></li>`).join('')}</ul>`; })()}</div></div></div>`;
  if (durum.kasa === 'takvim') govde = `<div class="kart"><div class="kart-bas"><h3>Önümüzdeki 30 gün</h3><small>${yaklasan.length} taksit · ${tl(yaklasan.reduce((a, x) => a + x.t.tutar, 0))}</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Vade</th><th>Durum</th><th class="sag">Tutar</th><th></th></tr></thead><tbody>${yaklasan.map(x => taksitSatir(x, false)).join('')}</tbody></table></div></div>`;
  const senetler = sb(S.kursiyerler).filter(k => k.odeme.senetli).flatMap(k => k.odeme.taksitler.map((t, i) => ({ k, t, i }))).sort((a, b) => a.t.vade.localeCompare(b.t.vade));
  if (durum.kasa === 'senet') govde = `<div class="kart"><div class="kart-bas"><h3>Senetler</h3><small>${senetler.filter(x => !x.t.odendi).length} açık senet · ${tl(senetler.filter(x => !x.t.odendi).reduce((a, x) => a + x.t.tutar, 0))}</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Senet</th><th>Borçlu</th><th>Vade</th><th>Durum</th><th class="sag">Tutar</th><th></th></tr></thead><tbody>${senetler.map(({ k, t, i }) => `<tr><td class="m-gizle mono">S-${k.id.slice(1)}-${i + 1}</td><td class="m-tam"><a class="kisi" href="#/kursiyer/${k.id}"><div><b>${e(tamAd(k))}</b><small>Kefil: ${e(k.acil ? k.acil.ad : '—')}</small></div></a></td><td>${tarih(t.vade)}</td><td>${t.odendi ? rozet('Tahsil edildi', 'yesil') : fark(t.vade) < 0 ? rozet('Vadesi geçti', 'kirmizi') : rozet('Portföyde', 'mavi')}</td><td class="sag sayi">${tl(t.tutar)}</td><td class="sag"><button class="dg dg-cizgi dg-kucuk" data-senet="${k.id}">${ik('belge')}Yazdır</button></td></tr>`).join('') || `<tr><td colspan="6">${bos('Senetli ödeme yok', '')}</td></tr>`}</tbody></table></div></div>`;
  if (durum.kasa === 'hesap') { const bugunH = sb(S.hareket).filter(h => h.tarih === gun(0)); const gG = bugunH.filter(h => h.tur === 'Gelir'), gC = bugunH.filter(h => h.tur === 'Gider'); const yon = y => bugunH.filter(h => h.tur === 'Gelir' && h.yontem === y).reduce((a, h) => a + h.tutar, 0) - bugunH.filter(h => h.tur === 'Gider' && h.yontem === y).reduce((a, h) => a + h.tutar, 0); govde = `<div class="izgara iz-3">${S.hesaplar.map(h => `<div class="kart" style="padding:18px 20px"><div style="display:flex;align-items:center;gap:10px">${isaret(h.tur === 'Kasa' ? 'bilgi' : 'zorunlu', 26)}<b style="font-family:var(--baslik);font-size:16px;color:var(--murekkep)">${e(h.ad)}</b><span style="margin-left:auto">${rozet(h.tur)}</span></div><b style="display:block;font-family:var(--baslik);font-size:30px;font-weight:900;color:var(--murekkep);margin-top:10px">${tl(h.bakiye + (h.id === 'kasa' ? yon('Nakit') : h.id === 'pos' ? yon('Kart') : yon('Havale')))}</b><small style="color:var(--soluk)">Bugün +${tl(h.id === 'kasa' ? yon('Nakit') : h.id === 'pos' ? yon('Kart') : yon('Havale'))}</small></div>`).join('')}</div><div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Gün sonu</h3><small>${bugunMetni2()}</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-gunsonu ${S.gunSonu.includes(gun(0)) ? 'disabled' : ''}>${S.gunSonu.includes(gun(0)) ? 'Gün kapatıldı' : 'Günü kapat'}</button></div></div><div class="kart-govde"><dl class="bilgi-tablo"><dt>Nakit (gelir − gider)</dt><dd>${tl(yon('Nakit'))}</dd><dt>Kart (gelir − gider)</dt><dd>${tl(yon('Kart'))}</dd><dt>Havale / EFT (gelir − gider)</dt><dd>${tl(yon('Havale'))}</dd><dt>Bugünkü gider</dt><dd>${tl(gC.reduce((a, h) => a + h.tutar, 0))}</dd><dt>Kasada olması gereken</dt><dd>${tl(S.hesaplar[0].bakiye + yon('Nakit'))}</dd><dt>İşlem sayısı</dt><dd>${gG.length + gC.length}</dd></dl><div class="alan" style="margin-top:14px;max-width:320px"><label for="sayim">Kasada sayılan nakit (₺)</label><input id="sayim" inputmode="numeric" placeholder="${S.hesaplar[0].bakiye + yon('Nakit')}" ${S.gunSonu.includes(gun(0)) ? 'disabled' : ''}><small id="sayim-fark" style="color:var(--soluk)"></small></div><p style="font-size:13.5px;color:var(--soluk);margin-top:12px">Kasadaki nakdi sayıp yazın. Günü kapatınca özet kurs müdürüne WhatsApp’tan gider; kapatılan güne kayıt eklenemez.</p></div></div>`; }
  const otoBekleyen = sb(S.kursiyerler).filter(k => k.odeme.otomatik).flatMap(k => k.odeme.taksitler.map((t, i) => ({ k, t, i })).filter(x => !x.t.odendi && fark(x.t.vade) <= 0));
  const otoKart = `<div class="kart" style="margin-bottom:16px"><div class="kart-govde" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${isaret(otoBekleyen.length ? 'zorunlu' : 'tamam', 28)}<div style="flex:1;min-width:220px"><b style="color:var(--murekkep);font-family:var(--baslik);font-size:16px">Otomatik çekim</b><p style="font-size:14px">${sb(S.kursiyerler).filter(k => k.odeme.otomatik).length} kursiyerin kartı kayıtlı. ${otoBekleyen.length ? `Vadesi gelen <b>${otoBekleyen.length} taksit · ${tl(otoBekleyen.reduce((a, x) => a + x.t.tutar, 0))}</b> çekilmeyi bekliyor${S.entegrasyon.pos.bagli ? '; her sabah 09:00’da kendiliğinden çekilir' : '; çekim için kursun sanal POS’u bağlanmalı'}.` : 'Bugün çekilecek taksit yok.'} Çekilemeyenlere ödeme linki gider.</p></div>${!S.entegrasyon.pos.bagli ? `<span class="rozet rozet-uyari">Sanal POS bağlı değil</span>` : otoBekleyen.length ? `<button class="dg dg-ana" data-oto-cek>Şimdi çek</button>` : ''}</div></div>`;
  if (durum.kasa === 'geciken') govde = otoKart + `<div class="kart"><div class="kart-bas"><h3>Geciken taksitler</h3><small>${gec.length} taksit · ${tl(gecikenT)}</small><div class="sag"><button class="dg dg-wp dg-kucuk" data-toplu>${ik('wp')}Hepsine hatırlat</button></div></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Vade</th><th>Gecikme</th><th class="sag">Tutar</th><th></th></tr></thead><tbody>${gec.map(x => taksitSatir(x, true)).join('') || `<tr><td colspan="5">${bos('Geciken taksit yok', 'Tüm ödemeler zamanında.')}</td></tr>`}</tbody></table></div></div>`;
  return {
    baslik: 'Kasa ve ödemeler', alt: ayAdi(BUGUN.getMonth(), true) + ' ' + BUGUN.getFullYear(),
    html: `${ekranNotu('Kim ne ödedi, kimin taksiti gecikti, kasada ve bankada ne var. Geciken taksite tek dokunuşla ödeme linki gider.')}<div class="izgara iz-4">
      <div class="kart gosterge"><small>Bu ay gelir</small><b>${tl(gelir)}</b><span>Peşinat ve taksitler</span></div>
      <div class="kart gosterge"><small>Bu ay gider</small><b>${tl(gider)}</b><span>Kira, maaş, yakıt, bakım</span></div>
      <div class="kart gosterge"><small>Açık alacak</small><b>${tl(alacak)}</b><span>${sb(S.kursiyerler).filter(k => kalanBorc(k)).length} kursiyerde</span></div>
      <div class="kart gosterge"><small>Geciken</small><b style="color:var(--kirmizi)">${tl(gecikenT)}</b><span>${gecikenK.length} kursiyer</span></div>
    </div><div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Son 6 ay</h3><small><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--levha)"></i> gelir &nbsp; <i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#f0c9c4"></i> gider</small></div><div class="kart-govde">${cubukGrafik(grafik, { bicim: v => sayi(Math.round(v / 1000)) + 'k', seri2: 'Gider' })}</div></div>
    <div class="ara-bosluk"></div>
    <div class="bolum-bas"><div id="sek">${sekmeler([['hareket', 'Hareketler'], ['takvim', 'Taksit takvimi', yaklasan.length], ['geciken', 'Gecikenler', gec.length], ['senet', 'Senetler', senetler.filter(x => !x.t.odendi).length], ['hesap', 'Kasa ve banka']], durum.kasa)}</div><div class="sag"><button class="dg dg-cizgi" data-fatura>${ik('belge')}e-Arşiv fatura</button><button class="dg dg-ana" data-hareket>${ik('arti')}Gelir / gider ekle</button></div></div>
    ${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => { if (!ev.target.closest('[data-oto-cek]')) return; if (!S.entegrasyon.pos.bagli) return bildir('Sanal POS bağlı değil; otomatik çekim için Ayarlar › Muhasebe ve fatura’dan POS bağlanmalı', 'uyari'); let ok = 0, red = 0; otoBekleyen.forEach(({ k: ks, t, i }, n) => { if (n % 5 === 4) { red++; gonderimEkle(tamAd(ks), `${selam(ks)} ${i + 1}. taksitiniz kartınızdan çekilemedi. ${odemeBilgisi()}`, 'Çekim başarısız'); return; } t.odendi = gun(0); t.yontem = 'Kart'; S.hareket.unshift({ id: 'h' + Date.now() + n, tarih: gun(0), tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(ks) + ' · ' + (i + 1) + '. taksit (otomatik çekim)', tutar: t.tutar, yontem: 'Kart', kursiyer: ks.id }); ok++; }); islem('Otomatik çekimleri çalıştırdı', ok + ' başarılı, ' + red + ' başarısız'); kaydet(); bildir(`${ok} taksit çekildi${red ? ', ' + red + ' kişiye ödeme linki gitti' : ''}`); yenile(); });
      const sy = k.querySelector('#sayim'); if (sy) sy.addEventListener('input', () => { const f = (+sy.value.replace(/\D/g, '') || 0) - +sy.placeholder; k.querySelector('#sayim-fark').innerHTML = sy.value ? (f ? `<b style="color:var(--kirmizi)">Fark ${f > 0 ? '+' : ''}${tl(f)}</b>` : '<b style="color:var(--yesil)">Kasa tutuyor</b>') : ''; });
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.kasa = s.dataset.sekme; if (location.hash !== '#/kasa') location.hash = '#/kasa'; else yenile(); }
        const ta = t.closest('[data-tahsil]'); if (ta) { const [id, i] = ta.dataset.tahsil.split('|'); tahsilAl(kursiyer(id), +i); }
        const h = t.closest('[data-hat]'); if (h) { const [id, i] = h.dataset.hat.split('|'); const ks = kursiyer(id), tk = ks.odeme.taksitler[+i]; wpGonder(ks, `${selam(ks)} ${tamTarih(tk.vade)} vadeli ${tl(tk.tutar)} taksidinizin hatırlatmasıdır. ${odemeBilgisi()}`, 'Taksit hatırlatması'); }
        if (t.closest('[data-toplu]')) { const ks = [...new Set(gec.map(x => x.k))], ml = k => `${selam(k)} vadesi geçen ${tl(gecikenler(k).reduce((a, t) => a + t.tutar - (t.kismi || 0), 0))} taksidiniz var. ${odemeBilgisi()}`; waSirali(kisiListe(ks, ml), 'Geciken taksit hatırlatması'); }
        if (t.closest('[data-hareket]')) hareketEkle();
        const hd = t.closest('[data-h-duz]'); if (hd) hareketDuzelt(S.hareket.find(x => x.id === hd.dataset.hDuz));
        const sn = t.closest('[data-senet]'); if (sn) import('./sayfalar3.js?v=53').then(m => m.belgeAc('senet', sn.dataset.senet));
        if (t.closest('[data-gunsonu]')) { const sy = k.querySelector('#sayim'); if (!sy.value.trim()) { sy.focus(); return bildir('Önce kasadaki nakdi sayıp yazın', 'uyari'); } const bek = +sy.placeholder, say = +String(sy.value).replace(/\D/g, ''), fk = say - bek; S.gunSonu.push(gun(0)); islem('Günü kapattı', 'Sayım ' + tl(say) + (fk ? ' · fark ' + tl(fk) : ' · fark yok')); kaydet(); const bh = sb(S.hareket).filter(h => h.tarih === gun(0)), gel = bh.filter(h => h.tur === 'Gelir').reduce((a, h) => a + h.tutar, 0), gid = bh.filter(h => h.tur === 'Gider').reduce((a, h) => a + h.tutar, 0); const ozet = `${S.kurs.ad} · ${tamTarih(gun(0))} gün sonu\nTahsilat: ${tl(gel)} (${bh.filter(h => h.tur === 'Gelir').length} işlem)\nGider: ${tl(gid)}\nKasa sayımı: ${tl(say)}${fk ? ' · fark ' + tl(fk) : ' · fark yok'}\nKapatan: ${oturum.kullanici ? oturum.kullanici.ad : ''}`; yenile(); if (waAc(S.kurs.wp, ozet, 'WhatsApp', S.kurs.yetkili, false, 'MÜDÜR', 'Gün sonu') !== 'api') bildir(S.kurs.wp ? 'Gün kapatıldı; özet kursun WhatsApp hattına hazır' : 'Gün kapatıldı. Özeti göndereceğiniz kişiyi WhatsApp’ta seçin', 'wp'); }
        if (t.closest('[data-fatura]')) faturaKes();
        if (t.closest('[data-disa]')) { csvIndir('kasa-hareketleri.csv', [['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Yöntem', 'Tutar'], ...S.hareket.map(x => [x.tarih, x.tur, x.kategori, x.aciklama, x.yontem, x.tutar])]); bildir('Kasa hareketleri indirildi'); }
      });
    },
  };
}
function hareketDuzelt(h) {
  if (!h || !mudurMu()) return;
  const kursiyerli = !!h.kursiyer, kapali = S.gunSonu.includes(h.tarih);
  pencere({
    baslik: 'Hareketi düzelt',
    icerik: `<form class="form-izgara" id="f-hd"><div class="alan tam"><label>Açıklama</label><input name="a" value="${e(h.aciklama)}"></div>
      <div class="alan"><label>Yöntem</label><select name="y">${YONTEMLER.map(y => `<option value="${y}" ${h.yontem === y ? 'selected' : ''}>${yontemAd(y)}</option>`).join('')}</select></div>
      <div class="alan"><label>Tutar (₺)</label><input name="tutar" inputmode="numeric" value="${h.tutar}" ${kursiyerli || kapali ? 'disabled' : ''}></div></form>
      <p style="font-size:13px;color:var(--soluk);margin-top:10px">${kursiyerli ? 'Kursiyer tahsilatının tutarı buradan değişmez; yanlışsa kursiyer dosyasından iade yapın.' : kapali ? 'Bu gün kapatıldığı için tutar değiştirilemez ve kayıt silinemez.' : 'Değişiklik işlem geçmişine yazılır.'}</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${!kursiyerli && !kapali ? '<button class="dg dg-cizgi" data-sil style="color:var(--kirmizi)">Sil</button>' : ''}<button class="dg dg-ana" type="submit" form="f-hd">Kaydet</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      f.addEventListener('submit', ev => { ev.preventDefault(); const eski = h.aciklama + ' · ' + tl(h.tutar) + ' · ' + h.yontem; h.aciklama = f.a.value.trim() || h.aciklama; h.yontem = f.y.value; if (!kursiyerli && !kapali) h.tutar = +f.tutar.value.replace(/\D/g, '') || h.tutar; islem('Kasa hareketini düzeltti', eski + ' → ' + h.aciklama + ' · ' + tl(h.tutar) + ' · ' + h.yontem); kaydet(); kapatPencere(); bildir('Hareket düzeltildi'); yenile(); });
      const sl = d.querySelector('[data-sil]'); if (sl) sl.addEventListener('click', () => { S.hareket = S.hareket.filter(x => x !== h); islem('Kasa hareketini sildi', h.aciklama + ' · ' + tl(h.tutar)); kaydet(); kapatPencere(); bildir('Hareket silindi'); yenile(); });
    },
  });
}
function hareketEkle() {
  pencere({
    baslik: 'Gelir / gider ekle',
    icerik: `<form class="form-izgara" id="f-h"><div class="alan tam"><div class="secim"><label><input type="radio" name="tur" value="Gider" checked><span>Gider</span></label><label><input type="radio" name="tur" value="Gelir"><span>Gelir</span></label></div></div>
      <div class="alan"><label>Kategori</label><select name="kat">${['Yakıt', 'Bakım', 'Kira', 'Maaş', 'Fatura', 'Reklam', 'Sınav harcı', 'Diğer'].map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="alan"><label>Tutar (₺)</label><input name="tutar" inputmode="numeric" required placeholder="0"></div>
      <div class="alan"><label>Tarih</label><input type="date" name="tarih" value="${gun(0)}"></div>
      <div class="alan"><label>Yöntem</label><select name="y">${YONTEMLER.map(y => `<option value="${y}">${yontemAd(y)}</option>`).join('')}</select></div>
      <div class="alan tam"><label>Açıklama</label><input name="a" placeholder="Örn. 26 SN 214 yakıt"></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-h">Kaydet</button>`,
    onAc(d) { d.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target, v = +f.tutar.value.replace(/\D/g, ''); if (!v) return bildir('Tutar girin', 'uyari'); if (S.gunSonu.includes(f.tarih.value)) return bildir(tamTarih(f.tarih.value) + ' günü kapatıldı; bu tarihe kayıt eklenemez', 'uyari'); S.hareket.unshift({ id: 'h' + Date.now(), tarih: f.tarih.value, tur: f.tur.value, kategori: f.kat.value, aciklama: f.a.value || f.kat.value, tutar: v, yontem: f.y.value }); islem(f.tur.value + ' ekledi', (f.a.value || f.kat.value) + ' · ' + tl(v)); kaydet(); kapatPencere(); bildir('Kaydedildi'); yenile(); }); },
  });
}
function faturaKes() {
  const g = S.entegrasyon, son = sb(S.hareket).filter(h => h.tur === 'Gelir' && h.kursiyer && kursiyer(h.kursiyer)).sort((a, b) => (b.tarih + b.id).localeCompare(a.tarih + a.id)).slice(0, 12);
  const taslak = !g.earsiv.bagli;
  pencere({
    baslik: taslak ? 'Fatura taslağı' : 'e-Arşiv fatura kes',
    icerik: `${taslak ? `<div class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 20)}<span>e-Arşiv entegratörü bağlı değil. Hazırlanan belge <b>taslaktır</b>, GİB’e iletilmez; entegratör bağlanınca aynı bilgilerle resmî fatura kesilir.</span></div>` : ''}<p style="color:var(--soluk);margin-bottom:12px">Tahsilatı seçin; fatura kursiyerin TC ve adresiyle, %${g.kdv ?? 20} KDV dahil hazırlanır.</p>${son.map((h, i) => { const k = kursiyer(h.kursiyer); return `<label class="evrak" style="cursor:${h.fatura ? 'default' : 'pointer'}"><input type="radio" name="h" value="${h.id}" ${h.fatura ? 'disabled' : ''} style="accent-color:var(--levha)"><span style="flex:1;color:var(--murekkep)">${e(h.aciklama)}<small style="display:block;color:var(--soluk)">${tarih(h.tarih)} · ${e(h.yontem || '')}${!k.tc || !k.adres ? ' · kursiyerin TC ya da adresi eksik' : ''}</small></span>${h.fatura ? `<button class="dg dg-hafif dg-kucuk" type="button" data-fatura-ac="${e(h.fatura)}">${e(h.fatura)}</button>` : `<span class="sayi">${tl(h.tutar)}</span>`}</label>`; }).join('')}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kes>${taslak ? 'Taslağı hazırla' : 'Faturayı kes'}</button>`,
    onAc(d) {
      const ilk = d.querySelector('[name=h]:not([disabled])'); if (ilk) ilk.checked = true;
      d.querySelectorAll('[data-fatura-ac]').forEach(b => b.addEventListener('click', ev => { ev.preventDefault(); import('./sayfalar3.js?v=53').then(m => m.belgeAc('fatura', b.dataset.faturaAc)); }));
      d.querySelector('[data-kes]').addEventListener('click', () => {
        const sec = d.querySelector('[name=h]:checked'); if (!sec) return bildir('Faturası kesilmemiş bir tahsilat seçin', 'uyari');
        const h = S.hareket.find(x => x.id === sec.value), k = kursiyer(h.kursiyer);
        if (!k.adres) return bildir(tamAd(k) + ' için adres eksik; kursiyer dosyasından girin', 'uyari');
        S.faturalar = S.faturalar || [];
        const yil = gun(0).slice(0, 4), seri = (g.earsiv.seri || 'SNY').toUpperCase().slice(0, 3), sira = S.faturalar.filter(f => f.no.startsWith(seri + yil)).length + 1;
        const no = seri + yil + String(sira).padStart(9, '0');
        const ettn = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).toUpperCase();
        S.faturalar.push({ no, ettn, tarih: gun(0), kursiyer: k.id, hareket: h.id, tutar: h.tutar, kdv: g.kdv ?? 20, aciklama: SINIFLAR[k.sinif].ad + ' sertifika sınıfı sürücü kursu eğitim hizmeti' + (h.kategori && h.kategori !== 'Kurs ücreti' ? ' · ' + h.kategori.toLowerCase() : ''), yontem: h.yontem, odemeTarih: h.tarih, durum: taslak ? 'taslak' : 'sira' });
        h.fatura = no; islem('Fatura kesti', no + ' · ' + tamAd(k) + ' · ' + tl(h.tutar)); kaydet();
        bildir((taslak ? 'Fatura taslağı ' : 'Fatura ') + no + (taslak ? ' hazırlandı' : ' kesildi')); yenile();
        import('./sayfalar3.js?v=53').then(m => m.belgeAc('fatura', no));
      });
    },
  });
}

/* ================= EKİP VE ARAÇLAR ================= */
const tarihGir = t => t || '';
function aracDuzenle(id) {
  const a = id ? arac(id) : { plaka: '', model: '', yil: new Date().getFullYear(), sinif: 'B', vites: 'Manuel', km: 0, bakimKm: 15000, muayene: '', sigorta: '', kasko: '', egitmen: '' };
  pencere({
    baslik: id ? a.plaka + ' · düzenle' : 'Araç ekle', genis: true,
    icerik: `<form class="form-izgara" id="f-arac">
      <div class="alan"><label>Plaka</label><input name="plaka" value="${e(a.plaka)}" placeholder="26 AB 123" required></div>
      <div class="alan"><label>Marka model</label><input name="model" value="${e(a.model)}" placeholder="Renault Clio" required></div>
      <div class="alan"><label>Model yılı</label><input name="yil" inputmode="numeric" value="${a.yil}"></div>
      <div class="alan"><label>Sınıf</label><select name="sinif">${Object.entries(SINIFLAR).filter(([key, v]) => v.direksiyon > 0 && (v.aktif || key === a.sinif)).map(([key, v]) => `<option value="${key}" ${key === a.sinif ? 'selected' : ''}>${e(v.ad)}</option>`).join('')}</select></div>
      <div class="alan"><label>Vites</label><select name="vites">${['Manuel', 'Otomatik'].map(v => `<option ${v === a.vites ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="alan"><label>Sorumlu usta öğretici</label><select name="egitmen"><option value="">Havuz aracı</option>${S.egitmenler.map(h => `<option value="${h.id}" ${h.id === a.egitmen ? 'selected' : ''}>${e(h.ad)}</option>`).join('')}</select></div>
      <div class="alan"><label>Güncel km</label><input name="km" inputmode="numeric" value="${a.km}"></div>
      <div class="alan"><label>Sonraki bakım km</label><input name="bakimKm" inputmode="numeric" value="${a.bakimKm}"></div>
      <div class="alan"><label>Muayene bitişi</label><input name="muayene" type="date" value="${tarihGir(a.muayene)}" required></div>
      <div class="alan"><label>Trafik sigortası bitişi</label><input name="sigorta" type="date" value="${tarihGir(a.sigorta)}" required></div>
      <div class="alan"><label>Kasko bitişi</label><input name="kasko" type="date" value="${tarihGir(a.kasko)}"></div></form>`,
    altlik: `${id ? '<button class="dg dg-hafif" data-sil style="margin-right:auto">Aracı çıkar</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-arac">${id ? 'Kaydet' : 'Aracı ekle'}</button>`,
    onAc(d) {
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target, pl = f.plaka.value.toLocaleUpperCase('tr').replace(/\s+/g, ' ').trim();
        if (!/^\d{2} ?[A-ZÇĞİÖŞÜ]{1,3} ?\d{2,4}$/.test(pl)) return bildir('Plaka biçimi hatalı (ör. 26 AB 123)', 'uyari');
        if (S.araclar.some(x => x !== a && x.plaka.replace(/\s/g, '') === pl.replace(/\s/g, ''))) return bildir('Bu plaka zaten kayıtlı', 'uyari');
        const yeni = { plaka: pl, model: f.model.value.trim(), yil: +f.yil.value || a.yil, sinif: f.sinif.value, vites: f.vites.value, egitmen: f.egitmen.value || null, km: +String(f.km.value).replace(/\D/g, '') || 0, bakimKm: +String(f.bakimKm.value).replace(/\D/g, '') || 0, muayene: f.muayene.value, sigorta: f.sigorta.value, kasko: f.kasko.value || null };
        if (id) { Object.assign(a, yeni); islem('Araç bilgisini düzenledi', pl); } else { S.araclar.push({ id: 'a' + Date.now(), ...yeni, sube: seciliSube() ? seciliSube().id : (S.subeler || [{}])[0].id }); islem('Araç ekledi', pl + ' · ' + yeni.model); }
        kaydet(); kapatPencere(); bildir(id ? 'Araç bilgisi kaydedildi' : pl + ' eklendi'); yenile();
      });
      const sl = d.querySelector('[data-sil]'); if (sl) sl.addEventListener('click', () => {
        const ileri = S.dersler.filter(x => x.arac === a.id && x.durum === 'Planlandı' && fark(x.tarih) >= 0).length;
        if (ileri) return bildir(`Bu araçla ${ileri} planlı ders var; önce dersleri başka araca taşıyın`, 'uyari');
        arsivle('arac', a); S.araclar = S.araclar.filter(x => x !== a); islem('Aracı filodan çıkardı', a.plaka); kaydet(); kapatPencere(); bildir(a.plaka + ' filodan çıkarıldı'); yenile();
      });
    },
  });
}
function ustaDuzenle(id) {
  const x = id ? egitmen(id) : { ad: '', tel: '', siniflar: ['B'], maas: 32000, prim: 150, baslama: String(new Date().getFullYear()), belgeler: {}, renk: '#2f6fde' };
  pencere({
    baslik: id ? x.ad + ' · düzenle' : 'Usta öğretici ekle', genis: true,
    icerik: `<form class="form-izgara" id="f-usta">
      <div class="alan"><label>Ad soyad</label><input name="ad" value="${e(x.ad)}" required></div>
      <div class="alan"><label>Telefon</label><input name="tel" value="${e(x.tel)}" inputmode="tel" required></div>
      <div class="alan tam"><span class="et">Ders verebildiği sınıflar</span><div class="secim">${Object.entries(SINIFLAR).filter(([key, v]) => v.direksiyon > 0 && (v.aktif || x.siniflar.includes(key))).map(([key, v]) => `<label><input type="checkbox" name="sinif" value="${key}" ${x.siniflar.includes(key) ? 'checked' : ''}><span>${e(v.ad)}</span></label>`).join('')}</div></div>
      <div class="alan"><label>Brüt maaş (₺)</label><input name="maas" inputmode="numeric" value="${x.maas}"></div>
      <div class="alan"><label>Ders başı prim (₺)</label><input name="prim" inputmode="numeric" value="${x.prim}"></div>
      <div class="alan"><label>Usta öğretici sertifikası bitişi</label><input name="sertifika" type="date" value="${tarihGir(x.belgeler.sertifika)}"></div>
      <div class="alan"><label>Sağlık raporu bitişi</label><input name="saglik" type="date" value="${tarihGir(x.belgeler.saglik)}"></div>
      <div class="alan"><label>Adli sicil kaydı geçerliliği</label><input name="adli" type="date" value="${tarihGir(x.belgeler.adli)}"></div>
      <div class="alan"><label>Kursta başlama yılı</label><input name="baslama" inputmode="numeric" value="${e(x.baslama)}"></div></form>
      ${id ? '' : '<p style="font-size:13px;color:var(--soluk);margin-top:10px">Usta öğreticinin telefondan kendi ekranına girmesi için Ayarlar › Kullanıcılar’dan PIN verin.</p>'}`,
    altlik: `${id ? '<button class="dg dg-hafif" data-sil style="margin-right:auto">Ekipten çıkar</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-usta">${id ? 'Kaydet' : 'Ekle'}</button>`,
    onAc(d) {
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target, sin = [...f.querySelectorAll('[name=sinif]:checked')].map(i => i.value);
        if (!f.ad.value.trim()) return bildir('Ad soyad gerekli', 'uyari');
        if (f.tel.value.replace(/\D/g, '').length < 10) return bildir('Geçerli bir telefon girin', 'uyari');
        if (!sin.length) return bildir('En az bir sınıf seçin', 'uyari');
        const yeni = { ad: f.ad.value.trim(), tel: f.tel.value.trim(), siniflar: sin, maas: +String(f.maas.value).replace(/\D/g, '') || 0, prim: +String(f.prim.value).replace(/\D/g, '') || 0, baslama: f.baslama.value.trim(), belgeler: { sertifika: f.sertifika.value || null, saglik: f.saglik.value || null, adli: f.adli.value || null } };
        Object.keys(yeni.belgeler).forEach(b => { if (!yeni.belgeler[b]) delete yeni.belgeler[b]; });
        if (id) { Object.assign(x, yeni); islem('Usta öğretici bilgisini düzenledi', yeni.ad); } else { S.egitmenler.push({ id: 'e' + Date.now(), renk: ['#2f6fde', '#0f8a5f', '#b45309', '#7c3aed', '#be123c'][S.egitmenler.length % 5], ...yeni, sube: seciliSube() ? seciliSube().id : (S.subeler || [{}])[0].id }); islem('Usta öğretici ekledi', yeni.ad); }
        kaydet(); kapatPencere(); bildir(id ? 'Bilgiler kaydedildi' : yeni.ad + ' ekibe eklendi'); yenile();
      });
      const sl = d.querySelector('[data-sil]'); if (sl) sl.addEventListener('click', () => {
        const ileri = S.dersler.filter(y => y.egitmen === x.id && y.durum === 'Planlandı' && fark(y.tarih) >= 0).length, ks = S.kursiyerler.filter(k => k.egitmen === x.id && k.asama !== 'Ehliyet' && !k.kapali).length;
        if (ileri || ks) return bildir(`${x.ad}: ${ileri} planlı ders, ${ks} aktif kursiyer var; önce başka ustaya aktarın`, 'uyari');
        arsivle('egitmen', x); S.egitmenler = S.egitmenler.filter(y => y !== x); S.araclar.forEach(a => { if (a.egitmen === x.id) a.egitmen = null; }); islem('Usta öğreticiyi ekipten çıkardı', x.ad); kaydet(); kapatPencere(); bildir(x.ad + ' ekipten çıkarıldı'); yenile();
      });
    },
  });
}
export function filo() {
  if (!['arac', 'egitmen', 'personel', 'prim', 'izin', 'masraf'].includes(durum.filo) || (['personel', 'prim'].includes(durum.filo) && !(oturum.kullanici && oturum.kullanici.rol === 'mudur'))) durum.filo = 'arac';
  const ayBas = new Date(BUGUN); ayBas.setDate(1);
  const buAy = t => tarihOku(t) >= ayBas && fark(t) <= 0;
  const hafta = sbDers(S.dersler).filter(d => fark(d.tarih) >= -6 && fark(d.tarih) <= 0);
  const tarihSatir = (t, ad) => { if (!t) return `<div class="belge-satir"><span>${ad}</span><b style="color:var(--soluk);font-weight:400">Yok</b></div>`; const f = fark(t); return `<div class="belge-satir"><span>${ad}</span><b>${tarih(t)}</b>${f < 0 ? rozet('Süresi doldu', 'kirmizi') : f <= 30 ? rozet(f + ' gün kaldı', 'uyari') : ''}</div>`; };
  const masraf = a => sb(S.hareket).filter(h => h.arac === a.id && buAy(h.tarih)).reduce((x, h) => x + h.tutar, 0);
  const aylikKm = a => Math.round(sbDers(S.dersler).filter(d => d.arac === a.id && buAy(d.tarih) && d.durum === 'Yapıldı').length * 22);
  let govde = '';
  if (durum.filo === 'arac') govde = `<div class="izgara iz-3">${sb(S.araclar).map(a => { const b = sbDers(S.dersler).filter(d => d.arac === a.id && d.tarih === gun(0)); const uyari = [a.muayene, a.sigorta, a.kasko].some(t => t && fark(t) <= 30); return `<div class="kart arac-kart">${aracGorsel(a)}
      <div class="ust-satir" style="padding:0 6px">${uyari ? isaret('uyari', 26) : isaret('tamam', 26)}<div><h3>${e(a.model)}</h3><small style="color:var(--soluk)">${a.yil} · ${a.vites} · ${SINIFLAR[a.sinif].ad.split(' ·')[0]} sınıfı · ${e((egitmen(a.egitmen) || { ad: 'Havuz aracı' }).ad)}</small></div></div>
      <div style="padding:0 6px"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:5px"><span>Bakıma kalan</span><b class="sayi" style="color:var(--murekkep)">${sayi(Math.max(0, a.bakimKm - a.km))} km</b></div>${ilerleme(10000 - Math.max(0, a.bakimKm - a.km), 10000, a.bakimKm - a.km < 2000 ? 'sari' : '')}</div>
      ${tarihSatir(a.muayene, 'Muayene')}${tarihSatir(a.sigorta, 'Sigorta')}${tarihSatir(a.kasko, 'Kasko')}
      <div class="belge-satir"><span>Bugün</span><b>${b.length} ders</b></div><div class="belge-satir"><span>Bu ay</span><b>${tl(masraf(a))} masraf · ${sayi(aylikKm(a))} km</b></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 6px 4px"><button class="dg dg-cizgi dg-kucuk" data-km="${a.id}">${ik('kalem')}Km gir</button><button class="dg dg-cizgi dg-kucuk" data-masraf="${a.id}">${ik('arti')}Masraf ekle</button>${mudurMu() ? `<button class="dg dg-hafif dg-kucuk" data-arac-duzenle="${a.id}">Düzenle</button>` : ''}</div></div>`; }).join('')}${mudurMu() ? `<button class="kart ekle-kart" data-arac-duzenle="">${ik('arti')}<b>Araç ekle</b><small>Plaka, sınıf, muayene ve sigorta tarihleri</small></button>` : ''}</div>`;
  if (durum.filo === 'egitmen') govde = `<div class="izgara iz-3">${sb(S.egitmenler).map(x => {
      const bugun = sbDers(S.dersler).filter(d => d.egitmen === x.id && d.tarih === gun(0)), ks = sb(S.kursiyerler).filter(k => k.egitmen === x.id && k.asama !== 'Ehliyet');
      const sin = S.sinavlar.filter(s => s.tur === 'Direksiyon').flatMap(s => Object.entries(s.sonuc)).filter(([id]) => kursiyer(id) && kursiyer(id).egitmen === x.id);
      const gec = sin.length ? Math.round(sin.filter(([, v]) => v === 'Geçti').length / sin.length * 100) : null;
      const ar = sb(S.araclar).find(a => a.egitmen === x.id), iz = S.izinler.find(i => i.kim === x.id && fark(i.bit) >= 0);
      return `<div class="kart arac-kart">${ar ? aracGorsel(ar) : ''}<div style="padding:0 6px"><h3>${e(x.ad)}</h3><small style="color:var(--soluk)">${x.baslama}’ten beri · ${x.siniflar.map(s => SINIFLAR[s].ad).join(', ')}</small>${iz ? `<div style="margin-top:6px">${rozet(iz.tur + ' · ' + tarih(iz.bas), 'uyari')}</div>` : ''}</div>
      ${olcumler([['Bugün', bugun.length + ''], ['Bu hafta', hafta.filter(d => d.egitmen === x.id).length + ''], ['Geçme', gec == null ? '—' : '%' + gec]])}
      ${Object.entries({ sertifika: 'Sertifika', saglik: 'Sağlık', adli: 'Adli sicil' }).map(([b, ad]) => tarihSatir((x.belgeler || {})[b], ad)).join('')}
      <div class="belge-satir"><span>Kursiyer</span><b>${ks.length} aktif</b></div><div class="belge-satir"><span>Telefon</span><b>${e(x.tel)}</b></div>${mudurMu() ? `<div style="padding:8px 0 4px"><button class="dg dg-hafif dg-kucuk" data-usta-duzenle="${x.id}">${ik('kalem')}Düzenle</button></div>` : ''}</div></div>`; }).join('')}${mudurMu() ? `<button class="kart ekle-kart" data-usta-duzenle="">${ik('arti')}<b>Usta öğretici ekle</b><small>Sınıflar, ders primi, sertifika ve sağlık raporu tarihleri</small></button>` : ''}</div>`;
  if (durum.filo === 'personel') { const tum = [...S.egitmenler.map(x => ({ ad: x.ad, gorev: 'Direksiyon usta öğreticiyi', maas: x.maas, tel: x.tel })), ...S.personel]; govde = `<div class="kart"><div class="kart-bas"><h3>Personel</h3><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-personel-ozet>${ik('indir')}Bu ayın özeti (müşavir için)</button></div><small>${tum.length} kişi · aylık maaş toplamı ${tl(tum.reduce((a, x) => a + x.maas, 0))}</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Ad</th><th>Görev</th><th>Telefon</th><th class="sag">Net maaş</th></tr></thead><tbody>${tum.map(x => `<tr><td class="m-tam"><b style="color:var(--murekkep)">${e(x.ad)}</b></td><td>${e(x.gorev)}</td><td class="m-gizle">${e(x.tel)}</td><td class="sag sayi">${tl(x.maas)}</td></tr>`).join('')}</tbody></table></div></div>`; }
  if (durum.filo === 'prim') govde = `<div class="kart"><div class="kart-bas"><h3>Ders primi · ${ayAdi(BUGUN.getMonth(), true)}</h3><small>Yapılan her direksiyon dersi için usta öğreticiye prim; maaşa eklenir</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Usta öğretici</th><th class="sag">Yapılan ders</th><th class="sag">Ders başı</th><th class="sag">Prim</th><th class="sag">Maaş + prim</th></tr></thead><tbody>${sb(S.egitmenler).map(x => { const n = sbDers(S.dersler).filter(d => d.egitmen === x.id && d.durum === 'Yapıldı' && buAy(d.tarih)).length; return `<tr><td class="m-tam"><b style="color:var(--murekkep)">${e(x.ad)}</b></td><td class="sag sayi">${n}</td><td class="sag sayi m-gizle">${tl(x.prim)}</td><td class="sag sayi">${tl(n * x.prim)}</td><td class="sag sayi">${tl(x.maas + n * x.prim)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  if (durum.filo === 'izin') govde = `<div class="kart"><div class="kart-bas"><h3>İzinler</h3><small>İzinli usta öğreticinin günü planda kapalı görünür</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-izin>${ik('arti')}İzin ekle</button></div></div><ul class="liste" style="margin-top:8px">${S.izinler.slice().sort((a, b) => b.bas.localeCompare(a.bas)).map(i => { const kim = egitmen(i.kim) || sb(S.personel).find(p => p.id === i.kim); return `<li>${isaret(fark(i.bit) < 0 ? 'tamam' : 'uyari', 26)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(kim ? kim.ad : '')}</b><small style="color:var(--soluk)">${e(i.tur)} · ${tarih(i.bas)}${i.bit !== i.bas ? ' – ' + tarih(i.bit) : ''}</small></div><span class="sag">${fark(i.bit) < 0 ? rozet('Bitti') : fark(i.bas) <= 0 ? rozet('Şu an izinde', 'kirmizi') : rozet(goreli(i.bas), 'mavi')}</span></li>`; }).join('')}</ul></div>`;
  if (durum.filo === 'masraf') { const top = sb(S.araclar).map(a => ({ a, m: masraf(a), km: aylikKm(a) })); govde = `<div class="kart"><div class="kart-bas"><h3>Araç masrafları · ${ayAdi(BUGUN.getMonth(), true)}</h3><small>Yakıt, bakım, lastik; araç başına kilometre maliyeti</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Araç</th><th class="sag">Masraf</th><th class="sag">Ders km</th><th class="sag">Km başı</th></tr></thead><tbody>${top.map(({ a, m, km }) => `<tr><td class="m-tam"><div class="kisi">${aracGorsel(a, 'kucuk')}<div><b>${e(a.plaka)}</b><small>${e(a.model)}</small></div></div></td><td class="sag sayi">${tl(m)}</td><td class="sag sayi">${sayi(km)}</td><td class="sag sayi">${km ? tl(m / km) : '—'}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="ara-bosluk"></div><div class="kart"><div class="kart-bas"><h3>Son masraflar</h3></div><ul class="liste" style="margin-top:8px">${sb(S.hareket).filter(h => h.arac).sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 12).map(h => `<li><span class="zaman" style="width:60px">${tarih(h.tarih)}</span><div style="flex:1"><b style="color:var(--murekkep)">${e(h.aciklama)}</b><small style="display:block;color:var(--soluk)">${e(h.kategori)} · ${e(h.yontem)}</small></div><b class="sayi sag">${tl(h.tutar)}</b></li>`).join('')}</ul></div>`; }
  return {
    baslik: 'Ekip ve araçlar', alt: sb(S.egitmenler).length + ' usta öğretici · ' + sb(S.personel).length + ' personel · ' + sb(S.araclar).length + ' araç',
    html: `${ekranNotu('Araçların muayene, sigorta ve bakım durumu; usta öğreticilerin ders yükü, primi ve izinleri. Süresi dolacak belgeyi Sinyal 30 ve 7 gün önce hatırlatır.')}
      <div id="sek">${sekmeler([['arac', 'Araçlar', sb(S.araclar).length], ['egitmen', 'Usta öğreticiler', sb(S.egitmenler).length], ...(oturum.kullanici && oturum.kullanici.rol === 'mudur' ? [['personel', 'Personel ve maaş'], ['prim', 'Ders primi']] : []), ['izin', 'İzinler'], ['masraf', 'Araç masrafları']], durum.filo)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => { if (ev.target.closest('[data-personel-ozet]')) csvIndir('personel-ozeti.csv', personelOzeti()); });
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.filo = s.dataset.sekme; yenile(); }
        const ad_ = t.closest('[data-arac-duzenle]'); if (ad_) return aracDuzenle(ad_.dataset.aracDuzenle);
        const ud = t.closest('[data-usta-duzenle]'); if (ud) return ustaDuzenle(ud.dataset.ustaDuzenle);
        const km = t.closest('[data-km]'); if (km) { const a = arac(km.dataset.km); pencere({ baslik: a.plaka + ' · kilometre', icerik: `<div style="display:flex;gap:14px;align-items:center">${aracGorsel(a, 'orta')}<div class="alan" style="flex:1"><label>Güncel kilometre</label><input name="km" inputmode="numeric" value="${a.km}"></div></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { a.km = +d.querySelector('[name=km]').value.replace(/\D/g, '') || a.km; kaydet(); kapatPencere(); bildir('Kilometre kaydedildi'); yenile(); }); } }); }
        const ms = t.closest('[data-masraf]'); if (ms) { const a = arac(ms.dataset.masraf); pencere({ baslik: a.plaka + ' · masraf ekle', icerik: `<form class="form-izgara" id="f-m"><div class="alan"><label>Tür</label><select name="kat"><option>Yakıt</option><option>Bakım</option><option>Lastik</option><option>Yıkama</option><option>Ceza</option></select></div><div class="alan"><label>Tutar (₺)</label><input name="t" inputmode="numeric" required></div><div class="alan tam"><label>Not</label><input name="n" placeholder="Örn. Opet, 40 litre"></div></form>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-m">Kaydet</button>`, onAc(d) { d.querySelector('form').addEventListener('submit', ev2 => { ev2.preventDefault(); const f = ev2.target, v = +f.t.value.replace(/\D/g, ''); if (!v) return bildir('Tutar girin', 'uyari'); S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gider', kategori: f.kat.value, aciklama: a.plaka + ' · ' + (f.n.value || f.kat.value.toLowerCase()), tutar: v, yontem: 'Kart', arac: a.id }); kaydet(); kapatPencere(); bildir('Masraf kasaya işlendi'); yenile(); }); } }); }
        if (t.closest('[data-izin]')) pencere({ baslik: 'İzin ekle', icerik: `<form class="form-izgara" id="f-iz"><div class="alan tam"><label>Kim?</label><select name="kim">${sb(S.egitmenler).concat(sb(S.personel)).map(x => `<option value="${x.id}">${e(x.ad)}</option>`).join('')}</select></div><div class="alan"><label>Başlangıç</label><input type="date" name="bas" value="${gun(3)}"></div><div class="alan"><label>Bitiş</label><input type="date" name="bit" value="${gun(3)}"></div><div class="alan tam"><label>Tür</label><select name="tur"><option>Yıllık izin</option><option>Mazeret izni</option><option>Rapor</option></select></div></form>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-iz">Kaydet</button>`, onAc(d) { d.querySelector('form').addEventListener('submit', ev2 => { ev2.preventDefault(); const f = ev2.target; S.izinler.push({ kim: f.kim.value, bas: f.bas.value, bit: f.bit.value < f.bas.value ? f.bas.value : f.bit.value, tur: f.tur.value }); const etk = sbDers(S.dersler).filter(x => x.egitmen === f.kim.value && x.tarih >= f.bas.value && x.tarih <= f.bit.value && x.durum === 'Planlandı').length; kaydet(); kapatPencere(); bildir(etk ? `İzin kaydedildi. O günlerde ${etk} ders var; planda başka usta öğreticiye taşıyın` : 'İzin kaydedildi', etk ? 'uyari' : 'tamam'); yenile(); }); } });
      });
    },
  };
}

/* ================= MESAJLAR VE ASİSTAN ================= */
export function mesajlar(alt) {
  if (alt === 'toplu') alt = 'yeni';
  if (alt && ['gelen', 'yeni', 'oto', 'bilgi', 'yorum'].includes(alt)) durum.mesaj = alt;
  if (durum.mesaj === 'toplu') durum.mesaj = 'yeni';
  const sohbetler = S.adaylar.filter(a => a.asama !== 'Kaybedildi');
  if (!secSohbet || !sohbetler.find(a => a.id === secSohbet)) secSohbet = sohbetler[0] && sohbetler[0].id;
  const sec = sohbetler.find(a => a.id === secSohbet);
  const toplamOto = S.otomasyonlar.reduce((a, o) => a + o.gonderim, 0) + S.gonderimler.length;
  let govde = '';
  if (durum.mesaj === 'gelen') govde = `<div class="kart" style="overflow:hidden"><div class="sohbet">
      <div class="sohbet-liste">${sohbetler.map(a => `<a href="#" data-sohbet="${a.id}" class="${a.id === secSohbet ? 'secili' : ''}">${avatar(...a.ad.split(' '))}<div style="min-width:0;flex:1"><div style="display:flex;gap:6px"><b style="color:var(--murekkep);font-size:13.5px">${e(a.ad)}</b><small style="margin-left:auto;color:var(--soluk);font-size:11.5px">${goreli(a.tarih)}</small></div><p>${a.mesajlar[a.mesajlar.length - 1].kim === 'aday' ? '' : 'Asistan: '}${e(a.mesajlar[a.mesajlar.length - 1].metin)}</p></div></a>`).join('')}</div>
      <div class="sohbet-pencere">${sec ? `<div class="sohbet-ust">${avatar(...sec.ad.split(' '))}<div><b style="color:var(--murekkep)">${e(sec.ad)}</b><small style="display:block;color:var(--soluk);font-size:12px">${e(sec.kanal)} · ${e(sec.kaynak)} · ${rozet(sec.asama)}</small></div><a class="dg dg-cizgi dg-kucuk" style="margin-left:auto" href="#/adaylar/${sec.id}">Aday kartı</a></div>
        <div class="sohbet-akis">${sec.mesajlar.map(m => `<div class="balon ${m.kim !== 'aday' ? 'giden' : ''}">${e(m.metin)}<small>${m.kim === 'asistan' ? ik('robot') + ' Asistan · kaynak: ' + kaynakBul(m.metin) : m.kim === 'kurs' ? 'Siz' : sec.saat}</small></div>`).join('')}</div>
        <form class="sohbet-yaz" data-yaz><input class="girdi" name="m" placeholder="Asistanın yerine siz yazın" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('gonder')}Gönder</button></form>` : bos('Sohbet yok', '')}</div></div></div>`;
  if (durum.mesaj === 'oto') { kurallariHazirla(); const z = S.zamanli, bugunK = z.kayit.filter(x => x.zaman.slice(0, 10) === gun(0)), KURAL_AD = Object.fromEntries(S.otomasyonlar.map(o => [o.id, o.ad])); govde = `
    <div class="kart" style="margin-bottom:14px"><div class="kart-bas">${isaret(apiAcik() ? 'tamam' : 'bilgi', 24)}<div><h3>Zamanlı mesajlar</h3><small>${apiAcik() ? 'WhatsApp API bağlı: zamanı gelen mesajlar kendiliğinden gider' : 'WhatsApp API bağlı değil: zamanı gelenler aşağıda birikir, tek tuşla sırayla gönderilir'} · son kontrol ${z.son ? z.son.slice(11, 16) : '—'} · bugün ${bugunK.filter(x => /gönderildi/.test(x.durum)).length} mesaj</small></div><div class="sag" style="gap:6px">${z.kuyruk.length ? `<button class="dg dg-wp dg-kucuk" data-kuyruk>${ik('wp')}${z.kuyruk.length} mesajı gönder</button>` : ''}<button class="dg dg-cizgi dg-kucuk" data-zaman-kontrol>Şimdi kontrol et</button></div></div>
      <div class="kart-govde" style="padding-top:0"><label style="display:flex;gap:8px;align-items:center;font-size:13.5px"><input type="checkbox" data-zaman-sinir ${z.sinir ? 'checked' : ''}> Demo sınırı: her kuraldan günde en fazla 2 mesaj (bütün mesajlar tek telefona gittiği için)</label></div></div>
    <div class="kart">${S.otomasyonlar.map(o => `<div class="oto"><span class="oto-ik">${ik({ o1: 'direksiyon', o2: 'kasa', o3: 'sinav', o4: 'belge', o5: 'yildiz', o6: 'sifirla', o7: 'aday', o8: 'teorik', o9: 'sinav', o10: 'kursiyer', o11: 'aday', o12: 'rapor', o13: 'filo', o14: 'teorik', o15: 'sinav' }[o.id] || 'mesaj')}</span><div style="min-width:0"><h4>${e(o.ad)}</h4><p>${e(o.ne)} · ${zamanliKural(o.id) ? 'zamanlı, ' + kuralSaati(o.id) : 'olay anında'} · ${sayi(o.gonderim)} gönderim</p><div class="sablon">${e(o.sablon)}</div>${o.acik && zamanliKural(o.id) ? ((n, g, gecti) => n ? `<button type="button" class="oto-gidecek" data-gidecek="${o.id}">${ik('wp')}${gecti ? `Sırada <b>${n} kişi</b> bekliyor` : `Bugün ${kuralSaati(o.id)}’de <b>${n} kişiye</b> gidecek`} · kimlere?</button>` : `<small class="oto-gidecek bos">${g ? `Bugün ${g} kişiye gönderildi` : 'Bugün gidecek mesaj yok'}</small>`)(gidecekler(o.id).length, bugunK.filter(x => x.kural === o.id && /gönderildi/.test(x.durum)).length, new Date().toTimeString().slice(0, 5) >= kuralSaati(o.id)) : ''}</div><div class="sag">${zamanliKural(o.id) ? `<button class="dg dg-cizgi dg-kucuk" data-ornek="${o.id}">${ik('wp')}Örnek gönder</button>` : ''}<button class="dg dg-hafif dg-kucuk" data-duzenle="${o.id}">Düzenle</button><span class="anahtar"><input type="checkbox" data-oto="${o.id}" ${o.acik ? 'checked' : ''} aria-label="${e(o.ad)}"><i></i></span></div></div>`).join('')}</div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Zamanlı mesaj geçmişi</h3><small>Son ${Math.min(30, z.kayit.length)} kayıt</small></div><ul class="liste" style="margin-top:6px">${z.kayit.slice(0, 30).map(x => `<li style="align-items:flex-start"><span class="zaman">${x.zaman.slice(11, 16)}</span><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(x.rol || '')} · ${e(x.kime)}</b><small style="display:block;color:var(--soluk)">${e(KURAL_AD[x.kural] || '')} · ${e(x.metin.slice(0, 120))}</small></div><span class="sag">${x.id ? MM.tik(x.id) : ''}${rozet(x.durum, /gönderildi/.test(x.durum) ? 'yesil' : /sınır/.test(x.durum) ? 'notr' : 'kirmizi')}</span></li>`).join('') || '<li>' + bos('Henüz zamanlı mesaj gitmedi', 'Kuralların saati gelince burada görünür. “Örnek gönder” ile hemen deneyebilirsiniz.') + '</li>'}</ul></div>`; }
  if (durum.mesaj === 'yeni') govde = MM.yeniMesajHtml();
  if (durum.mesaj === 'bilgi') govde = `<div class="izgara iz-21">
    <div class="kart"><div class="kart-bas"><h3>Asistanın bildikleri</h3><small>Asistan yalnızca bu onaylı bilgilerle cevap verir</small></div><ul class="liste" style="margin-top:8px">${S.asistanBilgi.map((b, i) => `<li style="align-items:flex-start">${isaret('tamam', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(b.konu)}</b><p style="font-size:14px">${e(b.metin)}</p><small style="color:var(--soluk)">Onaylayan: kurs müdürü · ${goreli(b.onay)}</small></div><button class="dg dg-cizgi dg-kucuk" data-bilgi-duzenle="${i}">Düzenle</button></li>`).join('')}</ul></div>
    <div><div class="kart"><div class="kart-bas"><h3>Kurallar</h3></div><ul class="liste" style="margin-top:8px">${[['Fiyatı yalnızca onaylı tablodan söyler', 'İndirim, pazarlık ya da özel fiyat sözü veremez.'], ['Bilmediğini uydurmaz', 'Cevabı bilgilerde yoksa “Kurs sizi arayacak” der ve konuşmayı size devreder.'], ['Sağlık ve hukuki sorular insana', 'Rapor, engel durumu, ceza gibi konular doğrudan size gelir.'], ['Her cevabın kaynağı görünür', 'Gelen kutusunda her asistan cevabının altında hangi bilgiden geldiği yazar.']].map(([b, a]) => `<li style="align-items:flex-start">${isaret('zorunlu', 22)}<div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div></li>`).join('')}</ul></div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Size devredilenler</h3><small>${S.devredilen.length} konuşma</small></div><ul class="liste" style="margin-top:8px">${S.devredilen.map((d, i) => `<li style="align-items:flex-start">${isaret('uyari', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(d.ad)} · ${e(d.konu)}</b><p style="font-size:14px">“${e(d.mesaj)}”</p><small style="color:var(--soluk)">${e(d.kanal)} · ${d.saat} · ${e(d.neden)}</small></div><button class="dg dg-wp dg-kucuk" data-devir="${i}">${ik('wp')}Cevapla</button></li>`).join('') || '<li>' + bos('Devredilen konuşma yok', '') + '</li>'}</ul></div></div></div>`;
  if (durum.mesaj === 'yorum') {
    const ehl = sb(S.kursiyerler).filter(k => k.asama === 'Ehliyet');
    govde = `<div class="izgara iz-3"><div class="kart gosterge"><small>Google puanı</small><b>${S.kurs.puan.toLocaleString('tr-TR')} ★</b><span>${S.kurs.yorumSayisi} değerlendirme</span></div><div class="kart gosterge"><small>Yorum istenen</small><b>${ehl.filter(k => k.yorum).length}</b><span>Ehliyet alan kursiyerler</span></div><div class="kart gosterge"><small>Yorum yapan</small><b>%${Math.round(ehl.filter(k => k.yorum === 'yapti').length / Math.max(1, ehl.length) * 100)}</b><span>${ehl.filter(k => k.yorum === 'yapti').length} kişi</span></div></div><div class="ara-bosluk"></div>
      <div class="kart"><div class="kart-bas"><h3>Ehliyet alanlar</h3><small>Sınavı geçince otomatik yorum isteği gider</small></div><ul class="liste" style="margin-top:8px">${ehl.map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${k.dsinav ? 'Sınav ' + goreli(k.dsinav.tarih) : ''}</small></div></a><span class="sag">${k.yorum === 'yapti' ? rozet('Yorum yaptı ★', 'yesil') : `${rozet('İstendi', 'sari')}<button class="dg dg-cizgi dg-kucuk" data-yorum="${k.id}">Tekrar hatırlat</button>`}</span></li>`).join('')}</ul></div>`;
  }
  return {
    baslik: 'Mesajlar ve asistan', alt: 'WhatsApp ve Instagram tek kutuda · ' + sayi(toplamOto) + ' otomatik mesaj gönderildi',
    html: `${ekranNotu('WhatsApp ve Instagram mesajları tek kutuda. Asistan kursun bilgileriyle anında cevap verir; hatırlatmalar kendiliğinden gider; istediğiniz gruba kişiye özel mesajı buradan yazarsınız.')}<div id="sek">${sekmeler([['gelen', 'Gelen kutusu', sohbetler.length], ['yeni', 'Yeni mesaj'], ['oto', 'Otomatik mesajlar', S.otomasyonlar.filter(o => o.acik).length], ['bilgi', 'Asistanın bildikleri', S.devredilen.length], ['yorum', 'Google yorumları']], durum.mesaj)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.mesaj = s.dataset.sekme; yenile(); }
        const so = t.closest('[data-sohbet]'); if (so) { ev.preventDefault(); secSohbet = so.dataset.sohbet; yenile(); }
        const du = t.closest('[data-duzenle]'); if (du) { const o = S.otomasyonlar.find(x => x.id === du.dataset.duzenle); pencere({ baslik: o.ad, icerik: `<div class="alan"><label>Mesaj şablonu</label><textarea name="s" style="min-height:130px">${e(o.sablon)}</textarea></div><p style="font-size:12.5px;color:var(--soluk);margin-top:8px">Süslü parantezdeki alanlar ({selam}, {kurs}, {saat}, {tutar}…) her kursiyer için otomatik doldurulur.</p>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { o.sablon = d.querySelector('textarea').value; kaydet(); kapatPencere(); bildir('Şablon kaydedildi'); yenile(); }); } }); }
        const bd = t.closest('[data-bilgi-duzenle]'); if (bd) { const b = S.asistanBilgi[+bd.dataset.bilgiDuzenle]; pencere({ baslik: b.konu, icerik: `<div class="alan"><label>Asistanın söyleyeceği bilgi</label><textarea style="min-height:130px">${e(b.metin)}</textarea></div><p style="font-size:13.5px;color:var(--soluk);margin-top:8px">Kaydettiğiniz an asistan yeni bilgiyle cevap verir.</p>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Onayla ve kaydet</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { b.metin = d.querySelector('textarea').value; b.onay = gun(0); islem('Asistan bilgisini güncelledi', b.konu); kaydet(); kapatPencere(); bildir('Asistan bilgisi güncellendi'); yenile(); }); } }); }
        const dv = t.closest('[data-devir]'); if (dv) { const d = S.devredilen[+dv.dataset.devir]; pencere({ baslik: d.ad + ' · ' + d.konu, icerik: `<div class="balon" style="max-width:100%;margin-bottom:12px">${e(d.mesaj)}</div><div class="alan"><label>Cevabınız</label><textarea></textarea></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-wp" data-k>${ik('wp')}Gönder</button>`, onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { const m = p.querySelector('textarea').value.trim(); if (!m) return bildir('Cevabınızı yazın', 'uyari'); S.devredilen.splice(S.devredilen.indexOf(d), 1); kaydet(); kapatPencere(); wpGonder(d.ad, m, 'Devredilen konuşma'); yenile(); }); } }); }
        const y = t.closest('[data-yorum]'); if (y) { const ky = kursiyer(y.dataset.yorum); wpGonder(ky, yorumMetni(ky), 'Yorum isteği'); }
        const gd = t.closest('[data-gidecek]'); if (gd) { const o = S.otomasyonlar.find(x => x.id === gd.dataset.gidecek), l = gidecekler(o.id); pencere({ baslik: o.ad, genis: true, icerik: `<p style="font-size:14px;margin-bottom:12px">${new Date().toTimeString().slice(0, 5) >= kuralSaati(o.id) ? `Saati (${kuralSaati(o.id)}) geldi; ${l.length} kişiye sıradaki kontrolde gidecek.` : `Bugün ${kuralSaati(o.id)}’de ${l.length} kişiye kendiliğinden gidecek.`} Her mesaj kişinin kendi bilgileriyle yazılır.</p><ul class="liste" style="max-height:56vh;overflow:auto">${l.map(x => `<li style="align-items:flex-start;flex-direction:column;gap:6px"><b style="color:var(--murekkep)">${e(x.kim.ad)} <small style="color:var(--soluk);font-weight:400">${e(x.kim.rol === 'ÖĞRENCİ' ? 'Öğrenci' : x.kim.rol === 'HOCA' ? 'Öğretmen' : x.kim.rol === 'MÜDÜR' ? 'Müdür' : x.kim.rol === 'ADAY' ? 'Aday' : x.kim.rol)}</small></b><div class="balon giden" style="max-width:100%;white-space:pre-line">${e(x.metin)}</div></li>`).join('')}</ul>`, altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>' }); }
        const or = t.closest('[data-ornek]'); if (or) { or.disabled = true; ornekGonder(or.dataset.ornek).then(() => yenile()); }
        if (t.closest('[data-zaman-kontrol]')) zamanlayiciCalistir(true).then(() => yenile());
        if (t.closest('[data-kuyruk]')) kuyruguGonder(() => yenile());
      });
      k.addEventListener('change', ev => { if (ev.target.matches('[data-zaman-sinir]')) { S.zamanli.sinir = ev.target.checked; kaydet(); return bildir(ev.target.checked ? 'Demo sınırı açık' : 'Demo sınırı kapalı: zamanı gelen bütün mesajlar gider'); } const o = ev.target.closest('[data-oto]'); if (o) { const x = S.otomasyonlar.find(z => z.id === o.dataset.oto); x.acik = o.checked; kaydet(); bildir(x.ad + (o.checked ? ' açıldı' : ' kapatıldı')); } });
      const yaz = k.querySelector('[data-yaz]'); if (yaz) yaz.addEventListener('submit', ev => { ev.preventDefault(); const m = ev.target.m.value.trim(); if (!m) return; const a = S.adaylar.find(x => x.id === secSohbet); a.mesajlar.push({ kim: 'kurs', metin: m }); kaydet(); wpGonder(a.ad, m); yenile(); });
      const ak = k.querySelector('.sohbet-akis'); if (ak) ak.scrollTop = 1e5;
      MM.yeniMesajBagla(k, yenile);
      if (['yeni', 'oto'].includes(durum.mesaj)) MM.durumlariGuncelle().then(d => { if (d && location.hash.startsWith('#/mesajlar')) yenile(); });
      const ft = k.querySelector('#f-toplu');
      if (ft) {
        // kişiler kimlikle (nesne) adreslenir: aynı adlı iki kişi karışmaz
        const hedef = () => { const v = ft.hedef.value; return v === 'aday' ? S.adaylar.filter(a => !['Kayıt', 'Kaybedildi'].includes(a.asama)).map(a => ({ ad: a.ad, tel: a.tel, rol: 'ADAY' })) : sb(S.kursiyerler).filter(x => !x.kapali && (v === 'aktif' ? x.asama !== 'Ehliyet' : v === 'borclu' ? gecikenler(x).length : x.asama === v)); };
        const say = () => ft.querySelector('#hedef-say').textContent = hedef().length + ' kişiye gidecek';
        ft.addEventListener('change', say); say();
        ft.addEventListener('submit', ev => { ev.preventDefault(); const l = hedef(), kanal = ft.kanal.value, m = ft.m.value.trim(); if (!m) return bildir('Duyuru metnini yazın', 'uyari'); if (!l.length) return bildir('Bu grupta kimse yok', 'uyari'); islem('Toplu duyuru hazırladı', l.length + ' kişi · ' + kanal); kaydet(); waSirali(l.map(x => { const a = x.rol === 'ADAY' ? x : alici(x); return { ad: a.ad, tel: a.tel, rol: a.rol, tur: 'Toplu duyuru', metin: m.replace(/\{selam\}/g, selam(x.rol === 'ADAY' ? x : (S.egitmenler.includes(x) ? x : a.ad))).replace(/\{kurs\}/g, S.kurs.ad).replace(/\{ad\}/g, a.ad.split(' ')[0]) }; }), 'Toplu duyuru · ' + kanal, { kanal }); });
      }
    },
  };
}

/* ================= MEB İŞLEMLERİ ================= */
const isGunu = n => { let d = 0, t = new Date(BUGUN); for (let i = 0; i < n; i++) { t.setDate(t.getDate() + 1); if (t.getDay() !== 0 && t.getDay() !== 6) d++; } return d; };
export function mebKurallari() {
  const K = S.kurs, l = [];
  const yakin = sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0);
  yakin.filter(d => d.eklendi && (tarihOku(d.tarih) - tarihOku(d.eklendi)) / 864e5 < K.programOnGun).slice(0, 4).forEach(d => l.push(['uyari', `${tamAd(kursiyer(d.kursiyer))} · ${tarih(d.tarih)} ${d.saat} dersi ${K.programOnGun} günden kısa sürede planlandı`, `Direksiyon programı MEBBİS’e en az ${K.programOnGun} gün önce girilmeli.`, '#/plan']));
  const gr = {}; yakin.forEach(d => { const a = d.kursiyer + '|' + d.tarih; gr[a] = (gr[a] || 0) + 1; });
  Object.entries(gr).filter(([, n]) => n > K.gunlukDersSiniri).forEach(([a, n]) => { const k = kursiyer(a.split('|')[0]); if (k) l.push(['yasak', `${tamAd(k)} için ${tarih(a.split('|')[1])} günü ${n} saat direksiyon var`, `Günde en fazla ${K.gunlukDersSiniri} saat.`, '#/plan']); });
  sb(S.kursiyerler).filter(k => k.asama === 'Sınav' && !k.dsinav && k.direksiyon < SINIFLAR[k.sinif].direksiyon).forEach(k => l.push(['yasak', `${tamAd(k)} sınava hazır görünüyor ama ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders`, 'Sınıfın asgari direksiyon saati tamamlanmadan sınava giremez.', '#/kursiyer/' + k.id]));
  sb(S.kursiyerler).filter(k => ['Direksiyon', 'Sınav'].includes(k.asama) && k.direksiyon >= SINIFLAR[k.sinif].direksiyon - 4).forEach(k => { const g = sbDers(S.dersler).filter(d => d.kursiyer === k.id && d.saat >= '18:00' && d.durum !== 'Gelmedi').length; if (g < K.geceDersi) l.push(['bilgi', `${tamAd(k)} · gece dersi ${g}/${K.geceDersi}`, `Gün batımından sonra en az ${K.geceDersi} saat ders planlanmalı.`, '#/plan']); });
  sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && !s.mebBildirim && isGunu(fark(s.tarih)) <= K.sinavBildirimIsGunu + 2).forEach(s => l.push(['dur', `${tarih(s.tarih)} direksiyon sınavı MEBBİS’e bildirilmedi`, `Kursiyer, usta öğretici ve araç bilgileri sınavdan en geç ${K.sinavBildirimIsGunu} iş günü önce girilmeli. Kalan: ${isGunu(fark(s.tarih))} iş günü.`, '#/meb']));
  sbSinav(S.sinavlar).filter(s => s.tur === 'e-Sınav' && fark(s.tarih) >= 0).forEach(s => s.kursiyerler.map(kursiyer).filter(k => k && eksikEvrak(k).length).forEach(k => l.push(['yasak', `${tamAd(k)} e-sınava kayıtlı ama evrakı eksik`, eksikEvrak(k).map(x => x[1]).join(', '), '#/kursiyer/' + k.id])));
  sb(S.kursiyerler).filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı' && k.dsinavPlan && (tarihOku(k.dsinavPlan) - tarihOku(k.dsinav.tarih)) / 864e5 < K.tekrarBekleme).forEach(k => l.push(['uyari', `${tamAd(k)} tekrar sınavı bekleme süresinden önce`, `Kaldıktan sonra en az ${K.tekrarBekleme} gün (kurs ayarı).`, '#/sinavlar']));
  S.araclar.filter(a => [a.muayene, a.sigorta].some(t => t && fark(t) < 0)).forEach(a => l.push(['dur', `${a.plaka} belgesi süresi dolmuş`, 'Bu araçla ders ve sınav yapılamaz.', '#/filo']));
  S.egitmenler.forEach(x => Object.entries(x.belgeler || {}).filter(([, t]) => fark(t) < 0).forEach(([b]) => l.push(['dur', `${x.ad} · ${{ sertifika: 'sertifika', saglik: 'sağlık raporu', adli: 'adli sicil' }[b]} süresi dolmuş`, 'Yenilenene kadar ders ve sınav planlanamaz.', '#/filo'])));
  return l;
}
export function meb(alt) {
  const SEK = ['asistan', 'denetim', 'mutabakat', 'evrak', 'esinav', 'kontrol', 'duyuru'];
  if (alt && SEK.includes(alt)) durum.meb = alt;
  if (!SEK.includes(durum.meb)) durum.meb = 'asistan';
  const eks = denetimEksikleri(), yap = sbDers(S.dersler).filter(d => d.durum === 'Yapıldı'), imz = yap.filter(d => d.imza).length;
  const hazir = Math.max(0, 100 - eks.reduce((a, x) => a + (x[0] === 'dur' ? 15 : x[0] === 'yasak' ? 8 : 3), 0));
  const aktarim = sb(S.kursiyerler).filter(k => !k.mebIslendi && !eksikEvrak(k).length);
  const eksik = sb(S.kursiyerler).filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet');
  const esinav = sb(S.kursiyerler).filter(k => k.asama === 'Teorik' && k.teorik >= SINIFLAR[k.sinif].teorik - 4 && !sbSinav(S.sinavlar).some(s => s.tur === 'e-Sınav' && fark(s.tarih) >= 0 && s.kursiyerler.includes(k.id)));
  const program = sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && !d.meb).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const sinavBildir = sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && !s.mebBildirim);
  const kurallar = mebKurallari();
  let govde = '';
  if (durum.meb === 'asistan') govde = `${mebAktarimKarti()}<div class="izgara iz-3">
    <div class="kart"><div class="kart-bas"><h3>1 · Kursiyer kayıtları</h3><small>${aktarim.length} kişi</small>${aktarim.length > 1 ? `<div class="sag"><button class="dg dg-ana dg-kucuk" data-meb-zincir>Hepsini sırayla gir</button></div>` : ''}</div><ul class="liste" style="margin-top:8px">${aktarim.map(k => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(tamAd(k))}</b><small style="color:var(--soluk)">${SINIFLAR[k.sinif].ad} · evrak tamam</small></div><a class="dg dg-ana dg-kucuk" href="#/mebbis/${k.id}">Giriş kartı</a></li>`).join('') || '<li>' + bos('Girilecek kayıt yok', 'Evrakı tamamlanan kursiyer burada görünür.') + '</li>'}</ul></div>
    <div class="kart"><div class="kart-bas"><h3>2 · Direksiyon programı</h3><small>${program.length} ders girilecek</small></div><div class="kart-govde">${program.length ? `<p style="font-size:14px;margin-bottom:10px">En yakın: <b>${tarih(program[0].tarih)} ${program[0].saat}</b>. Program MEBBİS’e en az ${S.kurs.programOnGun} gün önce girilmeli.</p><p style="font-size:14px"><b>${program.filter(d => fark(d.tarih) < 7).length}</b> ders bu hafta · <b>${program.filter(d => fark(d.tarih) >= 7).length}</b> ders sonrası</p><button class="dg dg-ana dg-kucuk" style="margin-top:12px" data-program>Programı MEBBİS sırasıyla aç</button>` : bos('Girilecek program yok', 'Tüm planlı dersler MEBBİS’e girilmiş.')}</div></div>
    <div class="kart"><div class="kart-bas"><h3>3 · Sınav bildirimi</h3><small>${sinavBildir.length} oturum</small></div><ul class="liste" style="margin-top:8px">${sinavBildir.map(s => `<li>${isaret(isGunu(fark(s.tarih)) <= S.kurs.sinavBildirimIsGunu ? 'dur' : 'uyari', 26)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${tarih(s.tarih)} direksiyon sınavı</b><small style="color:var(--soluk)">${s.kursiyerler.length} kursiyer · ${isGunu(fark(s.tarih))} iş günü kaldı</small></div><button class="dg dg-ana dg-kucuk" data-sinav-bildir="${s.id}">Bilgileri aç</button></li>`).join('') || '<li>' + bos('Bildirilecek sınav yok', '') + '</li>'}</ul></div>
  </div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-govde" style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">${isaret('bilgi', 34)}<div style="flex:1;min-width:260px"><b style="font-family:var(--baslik);font-size:17px;color:var(--murekkep)">İki yöntem: sıralı giriş ya da tek tuş</b><p style="margin-top:4px"><b>Sıralı giriş</b> şifre istemez: Sinyal girilecek her bilgiyi MEBBİS’teki sırasıyla hazırlar, tek dokunuşla kopyalatır ve kuralları önceden kontrol eder. <b>Tek tuş aktarımı</b> kurs bilgisayarındaki MEBBİS Aracı ile kayıtları sizin yerinize girer; şifreniz o bilgisayarda kalır. ${e(MEB_RISK)} Şu anki yöntem: <b>${S.kurs.mebYontem === 'arac' ? 'Tek tuş aktarımı' : 'Sıralı giriş'}</b> · <a href="#/ayarlar/kurallar" style="color:var(--levha);font-weight:700">değiştir</a></p></div></div></div>`;
  if (durum.meb === 'denetim') govde = `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Denetimden önce düzeltilecekler</h3><small>${eks.length} madde</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-denetim-dosya>${ik('belge')}Denetim dosyasını oluştur</button></div></div><ul class="liste" style="margin-top:8px">${eks.map(([t, b, a, h]) => `<li>${isaret(t, 28)}<a href="${h}" style="min-width:0;flex:1"><b style="color:var(--murekkep);display:block">${e(b)}</b><small style="color:var(--soluk)">${e(a)}</small></a></li>`).join('') || '<li>' + bos('Denetime hazırsınız', 'Eksik bulunmadı.') + '</li>'}</ul></div>
    <div><div class="kart" style="padding:20px"><small class="et" style="color:var(--soluk)">DENETİME HAZIRLIK</small><b style="display:block;font-family:var(--baslik);font-size:56px;font-weight:900;color:${hazir >= 80 ? 'var(--yesil)' : hazir >= 50 ? 'var(--turuncu)' : 'var(--kirmizi)'};line-height:1.1">%${hazir}</b>${ilerleme(hazir, 100, hazir >= 80 ? 'yesil' : 'sari')}<p style="font-size:14px;margin-top:10px">Denetim dosyası tek tuşla hazır: kursiyerlerin evrak, MEBBİS ve KVKK durumu, imzalı ders kayıtları, araç ve usta öğretici belgeleri.</p></div>
    <div class="ara-bosluk"></div><div class="kart" style="padding:20px"><small class="et" style="color:var(--soluk)">İMZALI DERS KAYDI</small><b style="display:block;font-family:var(--baslik);font-size:40px;font-weight:900;color:var(--murekkep)">${imz}/${yap.length}</b><p style="font-size:14px">Usta öğretici ders sonunda kursiyere telefonda imzalatır; takip formu kendiliğinden dolar, kağıt gerekmez.</p></div></div></div>`;
  if (durum.meb === 'mutabakat') govde = OZ.mutabakatSekme();
  if (durum.meb === 'evrak') govde = `<div class="kart"><div class="kart-bas"><h3>Evrak kontrolü</h3><small>${eksik.length} kursiyerde eksik var</small><div class="sag"><button class="dg dg-wp dg-kucuk" data-evrak-toplu ${eksik.length ? '' : 'disabled'}>${ik('wp')}Hepsine hatırlat</button></div></div>
      <div class="tablo-kap" style="margin-top:10px"><table class="tablo"><thead><tr><th>Kursiyer</th>${EVRAKLAR.map(([, t]) => `<th style="text-align:center;white-space:normal;min-width:90px">${t}</th>`).join('')}</tr></thead><tbody>${eksik.map(k => `<tr><td><a class="kisi" href="#/kursiyer/${k.id}"><div><b>${e(tamAd(k))}</b><small>Kayıt ${goreli(k.kayit)}</small></div></a></td>${EVRAKLAR.map(([key]) => `<td style="text-align:center"><span class="evrak" style="display:inline-flex;padding:0;border:0"><span class="durum ${k.evrak[key] ? 'var' : 'yok'}">${ik(k.evrak[key] ? 'tik' : 'kapat')}</span></span></td>`).join('')}</tr>`).join('') || `<tr><td colspan="7">${bos('Eksik evrak yok', '')}</td></tr>`}</tbody></table></div>
      <p style="font-size:13.5px;color:var(--soluk);padding:0 20px 18px">MEBBİS kaydı için belgelerin taranıp yüklenmesi gerekiyor; kursiyerin gönderdiği fotoğraflar kursiyer dosyasında saklanır.</p></div>`;
  if (durum.meb === 'esinav') govde = `<div class="kart"><div class="kart-bas"><h3>e-Sınav başvuru listesi</h3><small>Teorik derslerini tamamlayan, oturuma atanmamış kursiyerler</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-csv="esinav" ${esinav.length ? '' : 'disabled'}>${ik('indir')}Excel listesi</button><a class="dg dg-ana dg-kucuk" href="#/sinavlar">Oturuma ekle</a></div></div>
      <ul class="liste" style="margin-top:8px">${esinav.map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))}</b><small>${SINIFLAR[k.sinif].ad} · ${k.teorik}/${SINIFLAR[k.sinif].teorik} saat</small></div></a><span class="sag">${eksikEvrak(k).length ? rozet('Evrak eksik', 'kirmizi') : rozet('Hazır', 'yesil')}</span></li>`).join('') || '<li>' + bos('Başvuru bekleyen yok', 'Teorik derslerini bitiren kursiyerler burada görünür.') + '</li>'}</ul>
      <div class="ipucu" style="margin:0 20px 20px">${isaret('bilgi', 20)}<span>Kursiyer e-sınav ücretini bankaya yatırır, kurs MEBBİS’ten başvurur, müdürlük onaylar. MEB 2026 kılavuzuna göre e-sınav ücreti oturum başına 1.250 TL; kursiyer dosyasına ek kalem olarak eklenir.</span></div></div>`;
  if (durum.meb === 'kontrol') govde = `<div class="kart"><div class="kart-bas"><h3>Kurallar ve takvim</h3><small>Plan ve kayıtlar yönetmelik kurallarına göre sürekli taranır</small><div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/ayarlar/kurallar">Değerler ve kaynakları</a></div></div><ul class="liste" style="margin-top:8px">${kurallar.map(([t, b, a, h]) => `<li>${isaret(t, 28)}<a href="${h}" style="min-width:0;flex:1"><b style="color:var(--murekkep);font-weight:700;display:block">${e(b)}</b><small style="color:var(--soluk)">${e(a)}</small></a></li>`).join('') || '<li>' + bos('Kural ihlali yok', 'Plan ve kayıtlar uygun.') + '</li>'}</ul>
      <p style="font-size:13px;color:var(--soluk);padding:0 20px 18px">Kural değerleri MTSK Yönetmeliği esas alınarak varsayılan girildi; güncel mevzuata göre Ayarlar’dan değiştirilebilir.</p></div>`;
  if (durum.meb === 'duyuru') govde = `<div class="kart"><div class="kart-bas"><h3>Mevzuat takibi</h3><small>Son tarama: ${goreli(S.mevzuat[0].tarih)} · her ay MEB, ÖÖKGM ve Resmî Gazete taranır</small></div><ul class="liste" style="margin-top:8px">${S.mevzuat.map(m => `<li style="align-items:flex-start">${isaret(m.uygulandi ? 'tamam' : 'bilgi', 26)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(m.konu)}</b><p style="font-size:14px;margin-top:2px">${e(m.ne)}</p><small style="color:var(--soluk)">${m.tarih.length === 10 && m.tarih[4] === '-' ? tarih(m.tarih) + ' ' + m.tarih.slice(0, 4) : e(m.tarih)}${m.uygulandi ? ' · Sinyal’de uygulandı' : ''}</small></div></li>`).join('')}</ul><p style="font-size:13.5px;color:var(--soluk);padding:0 20px 18px">Kural ya da ücret değiştiğinde değerleri Sinyal ekibi günceller; kursa bildirim gider.</p></div>`;
  return {
    baslik: 'MEB işlemleri', alt: 'MEBBİS’e girilecekler, evrak, sınav başvuruları ve kurallar',
    html: `${ekranNotu('MEBBİS’e girilecek her şey burada sırayla hazır: kayıtlar, direksiyon programı, sınav bildirimi. Yönetmelik kurallarına aykırı bir plan önceden işaretlenir.')}
      ${cokSube() ? (seciliSube() ? `<div class="kurum-serit">${isaret('bilgi', 22)}<span><b>MEBBİS kurumu: ${e(seciliSube().ad)}</b> · kurum kodu <span class="mono">${e(seciliSube().kurumKodu)}</span> · müdür ${e(seciliSube().mudur)} · ${e(seciliSube().mebbis)}</span></div>` : `<div class="kurum-serit uyari">${isaret('uyari', 22)}<span><b>MEB işlemleri şube başına yapılır.</b> Her şube ayrı izinli kurumdur: ayrı kurum kodu, müdür ve MEBBİS hesabı. Aşağıda iki şubenin işleri birlikte görünüyor; girmek için şube seçin.</span><span style="display:flex;gap:6px;flex-wrap:wrap">${S.subeler.map(x => `<button class="dg dg-ana dg-kucuk" data-sube-sec="${x.id}">${e(x.ad)}</button>`).join('')}</span></div>`) : ''}
      ${olcumler([['Girilecek kayıt', aktarim.length + '', 'Evrakı tamam'], ['Girilecek program', program.length + ' ders', 'MEBBİS’e girilmemiş'], ['Sınav bildirimi', sinavBildir.length + '', 'Bekleyen oturum'], ['Kural uyarısı', kurallar.length + '', kurallar.length ? 'İnceleme bekliyor' : 'Sorun yok', kurallar.length ? 'uyari' : '']])}
      <div class="ara-bosluk"></div>
      <div id="sek">${sekmeler([['asistan', 'MEBBİS giriş asistanı', aktarim.length + (program.length ? 1 : 0) + sinavBildir.length], ['denetim', 'Denetim hazırlığı', eks.length], ['mutabakat', 'MEBBİS mutabakatı', S.mutabakat ? ['yalnizSinyal', 'yalnizMeb', 'sinif', 'ders'].reduce((a, x) => a + S.mutabakat.sonuc[x].length, 0) : null], ['evrak', 'Evrak kontrolü', eksik.length], ['esinav', 'e-Sınav başvuruları', esinav.length], ['kontrol', 'Kurallar ve takvim', kurallar.length], ['duyuru', 'Mevzuat']], durum.meb)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => { const ss = ev.target.closest('[data-sube-sec]'); if (ss) { document.querySelectorAll('[data-sube]').forEach(x => { x.value = ss.dataset.subeSec; x.dispatchEvent(new Event('change', { bubbles: true })); }); return; } if (ev.target.closest('[data-meb-zincir]')) mebSiraBaslat(true); if (ev.target.closest('[data-meb-arac-kur]')) mebAracKur(); if (ev.target.closest('[data-meb-aktar]')) mebAktar(); });
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.meb = s.dataset.sekme; if (location.hash !== '#/meb') location.hash = '#/meb'; else yenile(); }
        if (t.closest('[data-evrak-toplu]')) { const ml = x => `${selam(x)} kaydınızı tamamlamak için şu evraklar eksik: ${eksikEvrak(x).map(z => z[1].toLocaleLowerCase('tr')).join(', ')}. ${kursAdi('e')} getirebilir ya da fotoğraflarını buraya gönderebilirsiniz.`; waSirali(kisiListe(eksik, ml), 'Eksik evrak hatırlatması'); }
        const c = t.closest('[data-csv]'); if (c) { csvIndir('esinav-basvuru.csv', [['TC', 'Ad', 'Soyad', 'Telefon', 'Sınıf', 'Teorik saat'], ...esinav.map(x => [x.tc, x.ad, x.soyad, x.tel, SINIFLAR[x.sinif].ad, x.teorik])]); bildir('Liste indirildi'); }
        if (t.closest('[data-denetim-dosya]')) import('./sayfalar3.js?v=53').then(m => m.belgeAc('denetim'));
      });
      if (durum.meb === 'mutabakat') OZ.mutabakatBaglan(k);
      k.addEventListener('click', ev => {
        const t = ev.target;
        if (t.closest('[data-program]')) import('./sayfalar3.js?v=53').then(m => m.programPenceresi());
        const sb = t.closest('[data-sinav-bildir]'); if (sb) import('./sayfalar3.js?v=53').then(m => m.sinavBildirimPenceresi(sb.dataset.sinavBildir));
      });
    },
  };
}

/* ================= RAPORLAR ================= */
let raporAy = 6;
export function raporlar() {
  const ayBas = new Date(BUGUN); ayBas.setDate(1);
  const aylik = []; for (let m = raporAy - 1; m >= 0; m--) { const d = new Date(ayBas); d.setMonth(d.getMonth() - m); const f = h => tarihOku(h.tarih).getMonth() === d.getMonth() && tarihOku(h.tarih).getFullYear() === d.getFullYear(); const g = sb(S.hareket).filter(h => h.tur === 'Gelir' && f(h)).reduce((a, h) => a + h.tutar, 0), c = sb(S.hareket).filter(h => h.tur === 'Gider' && f(h)).reduce((a, h) => a + h.tutar, 0); aylik.push({ e: ayAdi(d.getMonth()), v: g - c, vurgu: m === 0 }); }
  const renk = ['#0a5bb0', '#13171c', '#ffc61a', '#b96206', '#6744b8'];
  const kaynak = KAYNAKLAR.map((k, i) => ({ k, v: sb(S.kursiyerler).filter(x => x.kaynak === k).length, renk: renk[i] })).filter(x => x.v);
  const sinif = aktifSiniflar().map(([k, v], i) => ({ k: v.ad, v: sb(S.kursiyerler).filter(x => x.sinif === k).length, renk: renk[i % renk.length] })).filter(x => x.v);
  const huniA = [['Gelen aday', S.adaylar.length], ['Bilgi verildi', S.adaylar.filter(a => a.asama !== 'Yeni').length], ['Görüşme', S.adaylar.filter(a => ['Görüşme', 'Kayıt'].includes(a.asama)).length], ['Kayıt', S.adaylar.filter(a => a.asama === 'Kayıt').length]];
  const egSatir = sb(S.egitmenler).map(x => { const sin = S.sinavlar.filter(s => s.tur === 'Direksiyon').flatMap(s => Object.entries(s.sonuc)).filter(([id]) => kursiyer(id) && kursiyer(id).egitmen === x.id); const gec = sin.filter(([, v]) => v === 'Geçti').length; const d = sbDers(S.dersler).filter(z => z.egitmen === x.id && z.durum !== 'Planlandı'); return { x, sin: sin.length, gec, ders: d.length, gelmedi: d.filter(z => z.durum === 'Gelmedi').length }; });
  const bitiren = sb(S.kursiyerler).filter(k => k.dsinav && k.dsinav.sonuc === 'Geçti');
  const ortSure = bitiren.length ? Math.round(bitiren.reduce((a, k) => a + (tarihOku(k.dsinav.tarih) - tarihOku(k.kayit)) / 864e5, 0) / bitiren.length) : 0;
  return {
    baslik: 'Raporlar', alt: 'Son ' + raporAy + ' ay',
    html: `${ekranNotu('Kurs nasıl gidiyor: kazanç, kursiyerlerin nereden geldiği, hangi usta öğreticinin öğrencisi sınavı geçiyor.')}<div class="bolum-bas"><div>${sekmeler([['3', 'Son 3 ay'], ['6', 'Son 6 ay']], String(raporAy), 'donem')}</div><div class="sag"><button class="dg dg-cizgi" data-yazdir-rapor>${ik('belge')}Yazdır / PDF</button></div></div><div class="izgara iz-4">
      <div class="kart gosterge"><small>Kayıttan ehliyete</small><b>${ortSure} gün</b><span>Ortalama süre</span></div>
      <div class="kart gosterge"><small>Gelmeyen ders oranı</small><b>%${Math.round(sbDers(S.dersler).filter(d => d.durum === 'Gelmedi').length / Math.max(1, sbDers(S.dersler).filter(d => d.durum !== 'Planlandı').length) * 100)}</b><span>Hatırlatmalar açıkken</span></div>
      <div class="kart gosterge"><small>Kursiyer başı gelir</small><b>${tl(sb(S.kursiyerler).reduce((a, k) => a + k.odeme.toplam, 0) / sb(S.kursiyerler).length)}</b><span>Ortalama ücret</span></div>
      <div class="kart gosterge"><small>Tahsilat oranı</small><b>%${Math.round(sb(S.kursiyerler).reduce((a, k) => a + odenen(k), 0) / sb(S.kursiyerler).reduce((a, k) => a + k.odeme.toplam, 0) * 100)}</b><span>Toplam ücretin ödenen kısmı</span></div>
    </div><div class="ara-bosluk"></div>
    <div class="izgara iz-21">
      <div class="kart"><div class="kart-bas"><h3>Aylık net (gelir − gider)</h3></div><div class="kart-govde">${cubukGrafik(aylik.map(a => ({ ...a, v: Math.max(0, a.v) })), { bicim: v => sayi(Math.round(v / 1000)) + 'k' })}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Kursiyerler nereden geliyor?</h3></div><div class="kart-govde" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">${halka(kaynak, { orta: `<div><b>${sb(S.kursiyerler).length}</b><small>kursiyer</small></div>` })}<ul class="lejant" style="flex:1;min-width:160px">${kaynak.map(x => `<li><i style="background:${x.renk}"></i>${x.k}<b>%${Math.round(x.v / sb(S.kursiyerler).length * 100)}</b></li>`).join('')}</ul></div></div>
    </div><div class="ara-bosluk"></div>
    <div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Usta öğretici performansı</h3><small>Direksiyon sınavı</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo"><thead><tr><th>Usta öğretici</th><th class="sag">Ders</th><th class="sag">Gelmedi</th><th>Sınavı geçen</th></tr></thead><tbody>${egSatir.map(r => `<tr><td>${e(r.x.ad)}</td><td class="sag sayi">${r.ders}</td><td class="sag sayi">${r.gelmedi}</td><td style="min-width:140px">${r.sin ? `<span class="sayi" style="font-size:12.5px">${r.gec}/${r.sin} · %${Math.round(r.gec / r.sin * 100)}</span>${ilerleme(r.gec, r.sin, 'yesil')}` : '<span style="color:var(--soluk)">—</span>'}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="kart"><div class="kart-bas"><h3>Yıllar içinde kurs</h3><small>Kursun kendi arşivi</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-yil-csv>${ik('indir')}Excel</button></div></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo"><thead><tr><th>Yıl</th><th class="sag">Kursiyer</th><th class="sag">e-Sınav geçme</th><th class="sag">Direksiyon geçme</th><th class="sag">Gelir</th></tr></thead><tbody>${S.arsiv.map(y => `<tr><td><b style="color:var(--murekkep)">${y.yil}</b></td><td class="sag sayi">${y.kursiyer}</td><td class="sag sayi">%${y.gecmeE}</td><td class="sag sayi">%${y.gecmeD}</td><td class="sag sayi">${tl(y.gelir)}</td></tr>`).join('')}<tr><td><b style="color:var(--murekkep)">${BUGUN.getFullYear()}</b> <small style="color:var(--soluk)">devam ediyor</small></td><td class="sag sayi">${sb(S.kursiyerler).length}</td><td class="sag sayi">—</td><td class="sag sayi">—</td><td class="sag sayi">${tl(sb(S.hareket).filter(h => h.tur === 'Gelir' && h.tarih.startsWith(String(BUGUN.getFullYear()))).reduce((a, h) => a + h.tutar, 0))}</td></tr></tbody></table></div><p style="font-size:12.5px;color:var(--soluk);padding:0 20px 14px">Önceki yıllar, kursun geçmiş kayıtlarından aktarılmıştır.</p></div>
      <div class="kart"><div class="kart-bas"><h3>Aday hunisi</h3><small>Asistanın getirdiği kayıtlar</small></div><div class="kart-govde">${huniA.map(([t, n], i) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>${t}</span><b class="sayi" style="color:var(--murekkep)">${n}</b></div>${ilerleme(n, huniA[0][1], i === 3 ? 'yesil' : '')}</div>`).join('')}
        <div class="kart-bas" style="padding:14px 0 8px"><h3>Sınıflara göre</h3></div><ul class="lejant">${sinif.map(x => `<li><i style="background:${x.renk}"></i>${x.k}<b>${x.v}</b></li>`).join('')}</ul></div></div>
    </div>`,
    baglan(k) { k.addEventListener('click', ev => { if (ev.target.closest('[data-yil-csv]')) csvIndir('kurs-yillar.csv', [['Yıl', 'Kursiyer', 'e-Sınav geçme %', 'Direksiyon geçme %', 'Gelir'], ...S.arsiv.map(y => [y.yil, y.kursiyer, y.gecmeE, y.gecmeD, y.gelir])]); const d = ev.target.closest('[data-donem]'); if (d) { raporAy = +d.dataset.donem; yenile(); } if (ev.target.closest('[data-yazdir-rapor]')) { document.body.classList.add('rapor-yazdir'); window.print(); setTimeout(() => document.body.classList.remove('rapor-yazdir'), 500); } }); },
  };
}

/* ================= AYARLAR ================= */
export function ayarlar(alt) {
  if (alt) durum.ayar = alt;
  if (durum.ayar === 'asistan') { durum.ayar = 'kurs'; location.hash = '#/sosyal/kural'; return { baslik: 'Ayarlar', html: '' }; }
  let govde = '';
  if (durum.ayar === 'kurs') govde = `<div class="kart"><div class="kart-govde"><form class="form-izgara" id="f-kurs">
      <div class="alan"><label>Kurs adı</label><input name="ad" value="${e(S.kurs.ad)}"></div><div class="alan"><label>Şehir</label><input name="sehir" value="${e(S.kurs.sehir)}"></div>
      <div class="alan"><label>Telefon</label><input name="tel" value="${e(S.kurs.tel)}"></div><div class="alan"><label>WhatsApp hattı</label><input name="wp" inputmode="tel" placeholder="05xx xxx xx xx" value="${e(S.kurs.wp || '')}"><small style="color:var(--soluk)">Kursiyer imzaları, talepleri ve gün sonu özeti bu numaraya gelir</small></div><div class="alan tam" style="border:1px dashed var(--cizgi);border-radius:8px;padding:12px"><label>Mesaj yönlendirme (demo) · bütün kursiyer mesajları bu numaraya gitsin</label><input name="demo" inputmode="tel" placeholder="Boş bırakırsanız mesajlar kursiyerin kendi numarasına gider" value="${e(S.kurs.demoNumara || '')}"><label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:13.5px;font-weight:400"><input type="checkbox" name="demoKime" ${S.kurs.demoKime !== false ? 'checked' : ''}> Mesajın başına kime gittiğini yaz (“[Ayşe Yılmaz için]”)</label></div>
      <div class="alan tam" style="border:1px dashed var(--cizgi);border-radius:8px;padding:12px"><label>WhatsApp otomatik gönderim (API adresi)</label><div style="display:flex;gap:8px"><input name="waApi" style="flex:1" placeholder="https://…workers.dev" value="${e(S.kurs.waApi || '')}"><button type="button" class="dg dg-cizgi dg-kucuk" data-api-dene>Bağlantıyı dene</button></div><small style="color:var(--soluk)">Doluysa mesajlar WhatsApp açılmadan otomatik gider. Boşsa her mesajda WhatsApp hazır metinle açılır.</small></div><div class="alan"><label>IBAN (havale/EFT için)</label><input name="iban" placeholder="TR00 0000 0000 0000 0000 0000 00" value="${e(S.kurs.iban || '')}"><small style="color:var(--soluk)">Taksit hatırlatmalarında kursiyere yazılır</small></div><div class="alan tam"><label>Google yorum linki</label><input name="yorum" placeholder="Google İşletme Profili › Yorum iste bağlantısı" value="${e(S.kurs.yorumLink || '')}"></div><div class="alan"><label>Adres</label><input name="adres" value="${e(S.kurs.adres)}"></div>
      <div class="alan"><label>Kursiyer başı günlük direksiyon sınırı</label><input name="gds" type="number" min="1" max="4" value="${S.kurs.gunlukDersSiniri}"></div>
      <div class="alan"><label>Usta öğretici başı günlük ders sınırı</label><input name="egs" type="number" min="1" max="12" value="${S.kurs.egitmenGunlukSinir}"></div>
      <div class="alan"><label>Sınav hakkı (her sınav için)</label><input name="hak" type="number" min="1" max="8" value="${S.kurs.sinavHak || 4}"></div>
      <div class="alan"><label>Taksiti geciken kursiyere ders</label><select name="borclu"><option value="uyar" ${S.kurs.borcluDers !== 'engelle' ? 'selected' : ''}>Planlanır, uyarı çıkar</option><option value="engelle" ${S.kurs.borcluDers === 'engelle' ? 'selected' : ''}>Planlanmaz</option></select></div>
      <div class="alan"><label>e-Sınav tekrar ücreti (₺)</label><input name="tue" inputmode="numeric" value="${S.kurs.tekrarUcret.esinav}"></div>
      <div class="alan"><label>Direksiyon sınavı tekrar ücreti (₺)</label><input name="tud" inputmode="numeric" value="${S.kurs.tekrarUcret.dsinav}"></div>
      <div class="alan"><label>Ek direksiyon dersi ücreti (₺)</label><input name="edu" inputmode="numeric" value="${S.kurs.ekDersUcreti}"></div>
      <div class="alan"><label>Öğrenci indirimi (₺)</label><input name="oin" inputmode="numeric" value="${((S.kurs.indirimler || [])[0] || {}).tutar || 0}"></div>
      <div class="tam"><button class="dg dg-ana" type="submit">Değişiklikleri kaydet</button></div></form></div></div>`;
  if (durum.ayar === 'sinif') govde = `<p class="ekran-notu">${isaret('bilgi', 20)}<span>Kursun verdiği sınıfları açın, ücretini girin. “Teyit edin” yazan saat ve yaş değerleri yönetmelikten varsayılandır; il MEM uygulamanızla karşılaştırın. Ücreti girilmemiş sınıf kayıt formunda çıkmaz.</span></p>
    <div class="kart"><div class="tablo-kap"><table class="tablo"><thead><tr><th>Veriyor</th><th>Sınıf</th><th>Kurs ücreti (₺)</th><th>Teorik saat</th><th>Direksiyon dersi</th><th>Asgari yaş</th></tr></thead><tbody>${['ehliyet', 'src', 'operator'].map(tur => `<tr><td colspan="6" style="background:var(--panel-2);font-weight:700;color:var(--murekkep)">${{ ehliyet: 'Sürücü belgesi sınıfları', src: 'SRC mesleki yeterlilik', operator: 'İş makinesi' }[tur]}</td></tr>` + Object.entries(SINIFLAR).filter(([, v]) => (v.tur || 'ehliyet') === tur).map(([k, v]) => `<tr><td><span class="anahtar"><input type="checkbox" data-sinif-alan="${k}:aktif" ${v.aktif ? 'checked' : ''} aria-label="${e(v.ad)} veriliyor"><i></i></span></td><td><b style="color:var(--murekkep)">${e(v.ad)}</b>${v.teyit ? ' <span class="rozet rozet-uyari" title="Saat ve yaş varsayılan">teyit edin</span>' : ''}</td><td><input class="girdi" style="max-width:130px" data-sinif-alan="${k}:ucret" inputmode="numeric" value="${v.ucret || ''}" placeholder="girilmedi"></td><td><input class="girdi" style="max-width:80px" data-sinif-alan="${k}:teorik" inputmode="numeric" value="${v.teorik}"></td><td><input class="girdi" style="max-width:80px" data-sinif-alan="${k}:direksiyon" inputmode="numeric" value="${v.direksiyon}"></td><td><input class="girdi" style="max-width:70px" data-sinif-alan="${k}:yas" inputmode="numeric" value="${v.yas || ''}"></td></tr>`).join('')).join('')}</tbody></table></div>
      <p style="font-size:12.5px;color:var(--soluk);padding:0 20px 18px">Ücretler il taban fiyatının altında olamaz. Ders saatlerini güncel mevzuata göre kurs müdürü belirler.</p></div>`;
  if (durum.ayar === 'asistan') govde = `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Asistanın bildikleri</h3><small>Asistan sorulara yalnızca buradaki bilgilerle cevap verir</small></div><div class="kart-govde"><form id="f-asistan" class="form-izgara">
      ${[['Fiyat ve taksit', 'B manuel 24.000 TL, B otomatik 26.500 TL, A2 18.500 TL. Peşinat sonrası 5 aya kadar taksit. Öğrenciye 1.000 TL indirim.'], ['Evraklar', 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf, kimlik. Fotoğrafı kursta çekiyoruz.'], ['Ders saatleri', 'Teorik dersler hafta içi 18:30. Direksiyon dersleri Pazartesi–Cumartesi 09:00–18:00.'], ['Süre', 'Teorik yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi; ortalama 2–3 ay.']].map(([t, v]) => `<div class="alan tam"><label>${t}</label><textarea>${v}</textarea></div>`).join('')}
      <div class="tam"><button class="dg dg-ana" type="submit">Kaydet</button></div></form></div></div>
      <div class="kart"><div class="kart-bas"><h3>Asistan ayarları</h3></div><div class="kart-govde">${[['WhatsApp’a cevap ver', true], ['Instagram mesajlarına cevap ver', true], ['Kayıt görüşmesi ayarla', true], ['Fiyat sorularına cevap ver', true], ['Bilmediği soruyu size devret', true]].map(([t, a]) => `<label class="evrak" style="cursor:pointer"><span style="flex:1;color:var(--murekkep)">${t}</span><span class="anahtar"><input type="checkbox" ${a ? 'checked' : ''}><i></i></span></label>`).join('')}</div></div></div>`;
  if (durum.ayar === 'gecmis') govde = `<div class="kart"><div class="kart-bas"><h3>İşlem geçmişi</h3><small>Kim, ne zaman, ne yaptı</small><div class="sag"><select class="girdi" style="height:34px;width:auto" data-gecmis-kim><option value="">Herkes</option>${[...new Set(S.islemler.map(x => x.kim))].map(x => `<option ${x === gecmisKim ? 'selected' : ''}>${e(x)}</option>`).join('')}</select></div></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Zaman</th><th>Kullanıcı</th><th>İşlem</th><th>Ayrıntı</th></tr></thead><tbody>${S.islemler.filter(x => !gecmisKim || x.kim === gecmisKim).slice(0, 80).map(x => `<tr><td class="mono m-gizle">${x.zaman.replace('T', ' ')}</td><td><b style="color:var(--murekkep)">${e(x.kim)}</b></td><td>${e(x.ne)}</td><td class="m-tam" style="color:var(--metin)">${e(x.ayrinti)}</td></tr>`).join('')}</tbody></table></div></div>`;
  if (durum.ayar === 'kvkk') { const rizasiz = S.kursiyerler.filter(k => !(k.kvkk && k.kvkk.riza)); const imha = S.kursiyerler.filter(k => k.dsinav && k.dsinav.sonuc === 'Geçti' && fark(k.dsinav.tarih) < -365 * S.kurs.saklamaYil); govde = `<div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Aydınlatma metni</h3><small>Kayıtta kursiyere verilir, online kayıtta onaylatılır</small></div><div class="kart-govde"><textarea class="girdi" style="height:200px;padding:10px 12px" data-aydinlatma>${e(S.kurs.aydinlatma || S.kurs.ad + ' olarak kişisel verilerinizi (kimlik, iletişim, sağlık raporu, adli sicil, öğrenim) sürücü kursu eğitimi ve MEB mevzuatı gereği MEBBİS kaydı amacıyla işliyoruz. Verileriniz yalnızca yetkili kurumlarla paylaşılır, mevzuattaki süre boyunca saklanır. KVKK 11. madde kapsamındaki haklarınız için kursa başvurabilirsiniz.')}</textarea><button class="dg dg-ana dg-kucuk" style="margin-top:10px" data-aydinlatma-kaydet>Kaydet</button></div></div>
      <div><div class="kart"><div class="kart-bas"><h3>Açık rıza kayıtları</h3></div><div class="kart-govde">${olcumler([['Rıza alınan', (S.kursiyerler.length - rizasiz.length) + ''], ['Eksik', rizasiz.length + '', '', rizasiz.length ? 'uyari' : '']])}<p style="font-size:14px;margin-top:10px">Her kursiyerin rıza tarihi ve kanalı (kursta imzalı form / online kayıt) dosyasında saklanır.</p></div></div>
      <div class="ara-bosluk"></div><div class="kart"><div class="kart-bas"><h3>Saklama ve imha</h3></div><div class="kart-govde"><p style="font-size:14px">Saklama süresi: <b>${S.kurs.saklamaYil} yıl</b> (kurs ayarı; mevzuata göre belirleyin). Süresi dolan ${imha.length} kayıt var.</p>${imha.length ? `<button class="dg dg-cizgi dg-kucuk" style="margin-top:10px" data-anonim>Süresi dolanları anonimleştir</button>` : ''}<p style="font-size:14px;margin-top:10px">Kim hangi kişisel veriye baktı: <a href="#/ayarlar/gecmis" style="color:var(--levha);font-weight:700">İşlem geçmişi</a></p></div></div></div></div>`; }
  if (AYAR_SEKMELERI[durum.ayar]) govde = AYAR_SEKMELERI[durum.ayar]();
  return {
    baslik: 'Ayarlar', alt: S.kurs.ad,
    html: `<div id="sek" class="ayar-gruplar">${[['Kurs', [['kurs', 'Kurs bilgileri'], ['subeler', 'Şubeler'], ['sinif', 'Sınıf ve ücretler'], ['kurallar', 'MEB kuralları'], ['sozlesme', 'Sözleşme metni']]], ['Kişiler ve güvenlik', [['kullanici', 'Kullanıcılar'], ['guvenlik', 'Güvenlik'], ['kvkk', 'KVKK'], ['gecmis', 'İşlem geçmişi']]], ['Bağlantılar', [['entegrasyon', 'Muhasebe ve fatura'], ['aktarim', 'Veri aktarımı']]], ['Diğer', [['gorunum', 'Görünüm']]]].map(([g, l]) => `<div class="ayar-grup"><small>${g}</small>${sekmeler(l, durum.ayar)}</div>`).join('')}</div>${durum.ayar === 'kvkk' ? `<p class="ekran-notu">${isaret('bilgi', 20)}<span>Mesajlaşma asistanının KVKK ayarları (model konumu, gizleme, saklama) <a href="#/sosyal/kural" style="color:var(--levha);font-weight:700">Sosyal medya asistanı › Kurallar</a> sayfasında.</span></p>` : ''}${govde}`,
    baglan(k) {
      ayarBaglan(k);
      k.addEventListener('click', ev => {
        const s = ev.target.closest('[data-sekme]'); if (s) { durum.ayar = s.dataset.sekme; yenile(); }
        if (ev.target.closest('[data-api-dene]')) { const u = k.querySelector('[name=waApi]').value.trim(); if (!/^https:\/\//.test(u)) return bildir('https:// ile başlayan adresi girin', 'uyari'); fetch(u).then(r => r.json()).then(j => bildir(j.hazir ? 'Bağlantı hazır; kaydedip mesaj gönderebilirsiniz' : 'Servis çalışıyor ama erişim anahtarı (WA_TOKEN) eksik', j.hazir ? 'tamam' : 'uyari')).catch(() => bildir('Servise ulaşılamadı; adresi kontrol edin', 'uyari')); }
        if (ev.target.closest('[data-aydinlatma-kaydet]')) { S.kurs.aydinlatma = k.querySelector('[data-aydinlatma]').value; islem('Aydınlatma metnini güncelledi'); kaydet(); bildir('Aydınlatma metni kaydedildi'); }
      });
      k.addEventListener('change', ev => { const gk = ev.target.closest('[data-gecmis-kim]'); if (gk) { gecmisKim = gk.value; yenile(); return; } const u = ev.target.closest('[data-sinif-alan]'); if (u) { if (!mudurMu()) return bildir('Sınıf ve ücretleri yalnız müdür değiştirir', 'uyari'); const [k, alan] = u.dataset.sinifAlan.split(':'), eski = SINIFLAR[k][alan]; const v = alan === 'aktif' ? u.checked : (+u.value.replace(/\D/g, '') || (alan === 'ucret' ? null : eski)); if (alan === 'aktif' && v && !SINIFLAR[k].ucret) bildir(SINIFLAR[k].ad + ' açıldı; kayıtta görünmesi için ücretini girin', 'uyari'); sinifKaydet(k, { [alan]: v, ...(alan !== 'aktif' && alan !== 'ucret' ? { teyit: false } : {}) }); islem('Sınıf ayarını değiştirdi', SINIFLAR[k].ad + ' · ' + alan + ': ' + (eski ?? '—') + ' → ' + (v ?? '—')); kaydet(); if (alan !== 'aktif' || !v || SINIFLAR[k].ucret) bildir('Kaydedildi'); } });
      k.addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target;
        if (f.id === 'f-kurs') { Object.assign(S.kurs, { ad: f.ad.value, sehir: f.sehir.value, tel: f.tel.value, wp: f.wp.value.trim(), waApi: f.waApi.value.trim(), waApiVarsayilan: false, demoNumara: f.demo.value.trim(), demoKime: f.demoKime.checked, iban: f.iban.value.trim().toLocaleUpperCase('tr'), yorumLink: f.yorum.value.trim(), adres: f.adres.value, gunlukDersSiniri: +f.gds.value || 2, egitmenGunlukSinir: +f.egs.value || 8, sinavHak: +f.hak.value || 4, borcluDers: f.borclu.value, tekrarUcret: { esinav: +f.tue.value.replace(/\D/g, '') || 0, dsinav: +f.tud.value.replace(/\D/g, '') || 0 }, ekDersUcreti: +f.edu.value.replace(/\D/g, '') || 0, indirimler: [{ ad: 'Öğrenci belgesi', tutar: +f.oin.value.replace(/\D/g, '') || 0 }].filter(x => x.tutar) }); kaydet(); document.querySelector('.logo small').textContent = S.kurs.ad; }
        bildir('Kaydedildi');
      });
    },
  };
}

function bugunMetni2() { const d = BUGUN; return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }); }

function kaynakBul(m) { const t = m.toLocaleLowerCase('tr'); if (/tl|taksit|ücret|indirim|fiyat/.test(t)) return 'Fiyat ve taksit'; if (/rapor|belge|fotoğraf|evrak/.test(t)) return 'Evraklar'; if (/saat|cumartesi|ders/.test(t)) return 'Ders saatleri'; if (/hafta|ay|süre/.test(t)) return 'Süre'; return 'Kurs bilgileri'; }

