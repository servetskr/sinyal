import { S, kaydet, gun, fark, iso, tarihOku, BUGUN, SINIFLAR, ASAMALAR, EVRAKLAR, KAYNAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gecikenler, eksikEvrak, gonderimEkle, risk } from './veri.js';
import { e, tl, sayi, ik, rozet, asamaRozet, avatar, plaka, ilerleme, bos, pencere, kapatPencere, bildir, sekmeler, tarih, tarihUzun, goreli, cubukGrafik, halka, ayAdi, csvIndir, isaret, ekranNotu, aracGorsel, olcumler, yonLevhasi } from './ui.js';
import { yenile } from './app.js';
import { wpGonder, tahsilAl, ekDersOner } from './sayfalar1.js';

const durum = { sinav: 'yaklasan', kasa: 'hareket', filo: 'arac', mesaj: 'gelen', meb: 'aktarim', ayar: 'kurs' };
let secSohbet = null;

/* ================= SINAVLAR ================= */
export function sinavlar() {
  const gec = S.sinavlar.filter(s => Object.keys(s.sonuc).length);
  const oran = tur => { const l = gec.filter(s => s.tur === tur).flatMap(s => Object.values(s.sonuc)); return l.length ? Math.round(l.filter(x => x === 'Geçti').length / l.length * 100) : 0; };
  const kalanlar = S.kursiyerler.filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı');
  const riskli = S.kursiyerler.map(k => ({ k, r: risk(k) })).filter(x => x.r && x.r.puan >= 25).sort((a, b) => b.r.puan - a.r.puan);
  const liste = S.sinavlar.filter(s => durum.sinav === 'yaklasan' ? fark(s.tarih) >= 0 : fark(s.tarih) < 0).sort((a, b) => durum.sinav === 'yaklasan' ? a.tarih.localeCompare(b.tarih) : b.tarih.localeCompare(a.tarih));
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
      <div class="kart gosterge"><small>Sınava hazır</small><b>${S.kursiyerler.filter(k => k.asama === 'Sınav' && !k.dsinav && !k.dsinavPlan).length}</b><span>Direksiyon derslerini bitirdi, oturum bekliyor</span></div>
      <div class="kart gosterge"><small>Tekrar sınava girecek</small><b>${kalanlar.length}</b><span>Ek ders önerisi gönderildi</span></div>
    </div><div class="ara-bosluk"></div>
    <div class="bolum-bas"><div id="sek">${sekmeler([['yaklasan', 'Yaklaşan', S.sinavlar.filter(s => fark(s.tarih) >= 0).length], ['gecmis', 'Geçmiş', S.sinavlar.filter(s => fark(s.tarih) < 0).length], ['risk', 'Kalma riski', riskli.length]], durum.sinav)}</div><div class="sag"><button class="dg dg-ana" data-yeni>${ik('arti')}Sınav oturumu ekle</button></div></div>
    ${durum.sinav === 'risk' ? `<div class="kart"><div class="kart-bas"><h3>Sınavda kalabilecek kursiyerler</h3><small>Deneme puanı, gelmediği dersler ve eğitmen notlarından hesaplanır</small></div><ul class="liste" style="margin-top:8px">${riskli.map(({ k, r }) => `<li>${isaret(r.puan >= 50 ? 'uyari' : 'bilgi', 28)}<a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))} · ${r.puan >= 50 ? 'Yüksek' : 'Orta'} risk</b><small>${e(r.nedenler.join(' · '))}</small></div></a><span class="sag"><button class="dg dg-ana dg-kucuk" data-ekders="${k.id}">Ek ders öner</button></span></li>`).join('') || '<li>' + bos('Riskli kursiyer yok', 'Herkes sınava hazır görünüyor.') + '</li>'}</ul></div>` : `<div class="izgara iz-2">${liste.map(kartSinav).join('') || `<div class="kart">${bos('Oturum yok', 'Yeni bir sınav oturumu ekleyin.')}</div>`}</div>`}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.sinav = s.dataset.sekme; yenile(); }
        if (t.closest('[data-yeni]')) oturumEkle();
        const ed = t.closest('[data-ekders]'); if (ed) ekDersOner(kursiyer(ed.dataset.ekders));
        const so = t.closest('[data-sonuc]'); if (so) sonucGir(S.sinavlar.find(x => x.id === so.dataset.sonuc));
        const ek = t.closest('[data-ekle]'); if (ek) sinavaEkle(S.sinavlar.find(x => x.id === ek.dataset.ekle));
        const h = t.closest('[data-hatir]'); if (h) { const s2 = S.sinavlar.find(x => x.id === h.dataset.hatir); s2.kursiyerler.forEach(id => gonderimEkle(tamAd(kursiyer(id)), `${s2.tur} sınavın ${tarihUzun(s2.tarih)} ${s2.saat}’te`, 'Sınav hatırlatması')); bildir(s2.kursiyerler.length + ' kursiyere sınav hatırlatması gönderildi', 'wp'); }
        const l = t.closest('[data-liste]'); if (l) { const s2 = S.sinavlar.find(x => x.id === l.dataset.liste); csvIndir(`sinav-${s2.tur}-${s2.tarih}.csv`, [['Ad', 'Soyad', 'Telefon', 'Sınıf', 'Sonuç'], ...s2.kursiyerler.map(kursiyer).map(x => [x.ad, x.soyad, x.tel, SINIFLAR[x.sinif].ad, s2.sonuc[x.id] || ''])]); bildir('Sınav listesi indirildi'); }
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
      f.addEventListener('submit', ev => { ev.preventDefault(); S.sinavlar.push({ id: 's' + Date.now(), tur: f.tur.value, tarih: f.tarih.value, saat: f.saat.value, yer: f.yer.value, kursiyerler: [], sonuc: {} }); kaydet(); kapatPencere(); bildir('Sınav oturumu eklendi'); durum.sinav = 'yaklasan'; yenile(); });
    },
  });
}
function sinavaEkle(s) {
  const uygun = S.kursiyerler.filter(k => !s.kursiyerler.includes(k.id) && (s.tur === 'e-Sınav' ? (k.asama === 'Teorik' && k.teorik >= SINIFLAR[k.sinif].teorik - 4) || (k.esinav && k.esinav.sonuc === 'Kaldı') : (k.asama === 'Sınav' && !(k.dsinav && k.dsinav.sonuc === 'Geçti'))));
  pencere({
    baslik: s.tur + ' · kursiyer ekle',
    icerik: uygun.length ? `<p style="color:var(--soluk);margin-bottom:10px">${s.tur === 'e-Sınav' ? 'Teorik derslerini tamamlayan' : 'Direksiyon derslerini tamamlayan'} kursiyerler listelenir.</p>${uygun.map(k => `<label class="evrak" style="cursor:pointer"><input type="checkbox" value="${k.id}" checked style="width:18px;height:18px;accent-color:var(--levha)">${avatar(k.ad, k.soyad)}<span style="flex:1;color:var(--murekkep)">${e(tamAd(k))}</span>${rozet(SINIFLAR[k.sinif].ad.split(' ·')[0])}</label>`).join('')}` : bos('Eklenecek kursiyer yok', 'Bu sınav için şartları tamamlayan kursiyer bulunmuyor.'),
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${uygun.length ? '<button class="dg dg-ana" data-kaydet>Seçilenleri ekle</button>' : ''}`,
    onAc(d) { const b = d.querySelector('[data-kaydet]'); if (b) b.addEventListener('click', () => { const ids = [...d.querySelectorAll('input:checked')].map(x => x.value); s.kursiyerler.push(...ids); if (s.tur === 'Direksiyon') ids.forEach(id => kursiyer(id).dsinavPlan = s.tarih); kaydet(); kapatPencere(); bildir(ids.length + ' kursiyer sınava eklendi'); yenile(); }); },
  });
}
function sonucGir(s) {
  const ks = s.kursiyerler.map(kursiyer).filter(Boolean);
  pencere({
    baslik: s.tur + ' sonuçları', genis: false,
    icerik: `<p style="color:var(--soluk);margin-bottom:10px">${tarihUzun(s.tarih)} · ${ks.length} kursiyer</p>${ks.map(k => `<div class="evrak">${avatar(k.ad, k.soyad)}<span style="flex:1;color:var(--murekkep)">${e(tamAd(k))}</span><div class="secim"><label><input type="radio" name="${k.id}" value="Geçti" checked><span>Geçti</span></label><label><input type="radio" name="${k.id}" value="Kaldı"><span>Kaldı</span></label></div></div>`).join('')}
      <div class="ipucu" style="margin-top:14px">${ik('robot')}<span>Geçenlere tebrik ve Google yorum isteği, kalanlara ek ders önerisi otomatik gider.</span></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet>Sonuçları kaydet</button>`,
    onAc(d) {
      d.querySelector('[data-kaydet]').addEventListener('click', () => {
        let g = 0;
        ks.forEach(k => {
          const v = d.querySelector(`[name="${k.id}"]:checked`).value; s.sonuc[k.id] = v;
          if (s.tur === 'e-Sınav') { k.esinav = { sonuc: v, puan: v === 'Geçti' ? 70 + Math.floor(Math.random() * 25) : 50 + Math.floor(Math.random() * 18), hak: (k.esinav ? k.esinav.hak + 1 : 1) }; if (v === 'Geçti') { k.asama = 'Direksiyon'; g++; } }
          else { k.dsinav = { sonuc: v, hak: (k.dsinav ? k.dsinav.hak + 1 : 1), tarih: s.tarih }; delete k.dsinavPlan; if (v === 'Geçti') { k.asama = 'Ehliyet'; k.yorum = 'istendi'; g++; gonderimEkle(tamAd(k), 'Tebrikler! Google yorum isteği', 'Otomatik'); } else gonderimEkle(tamAd(k), 'Ek ders önerisi', 'Otomatik'); }
        });
        kaydet(); kapatPencere(); bildir(`${g}/${ks.length} geçti. Otomatik mesajlar gönderildi`, 'wp'); yenile();
      });
    },
  });
}

/* ================= KASA ================= */
export function kasa(alt) {
  if (alt === 'geciken') durum.kasa = 'geciken';
  const ayBas = new Date(BUGUN); ayBas.setDate(1);
  const ayToplam = (m, tur) => { const d = new Date(ayBas); d.setMonth(d.getMonth() - m); return S.hareket.filter(h => h.tur === tur && tarihOku(h.tarih).getMonth() === d.getMonth() && tarihOku(h.tarih).getFullYear() === d.getFullYear()).reduce((a, h) => a + h.tutar, 0); };
  const gelir = ayToplam(0, 'Gelir'), gider = ayToplam(0, 'Gider');
  const alacak = S.kursiyerler.reduce((a, k) => a + kalanBorc(k), 0);
  const gecikenK = S.kursiyerler.filter(k => gecikenler(k).length);
  const gecikenT = gecikenK.reduce((a, k) => a + gecikenler(k).reduce((x, t) => x + t.tutar, 0), 0);
  const grafik = []; for (let m = 5; m >= 0; m--) { const d = new Date(ayBas); d.setMonth(d.getMonth() - m); grafik.push({ e: ayAdi(d.getMonth()), v: ayToplam(m, 'Gelir'), v2: ayToplam(m, 'Gider'), vurgu: m === 0 }); }
  const yaklasan = S.kursiyerler.flatMap(k => k.odeme.taksitler.map((t, i) => ({ k, t, i }))).filter(x => !x.t.odendi && fark(x.t.vade) >= 0 && fark(x.t.vade) <= 30).sort((a, b) => a.t.vade.localeCompare(b.t.vade));
  const gec = S.kursiyerler.flatMap(k => k.odeme.taksitler.map((t, i) => ({ k, t, i }))).filter(x => !x.t.odendi && fark(x.t.vade) < 0).sort((a, b) => a.t.vade.localeCompare(b.t.vade));
  const hareketler = [...S.hareket].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 40);
  const taksitSatir = ({ k, t, i }, gecik) => `<tr><td><a class="kisi" href="#/kursiyer/${k.id}">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${i + 1}. taksit · ${e(k.tel)}</small></div></a></td><td class="m-gizle">${tarih(t.vade)}</td><td>${gecik ? rozet(-fark(t.vade) + ' gün gecikti', 'kirmizi') : rozet(goreli(t.vade), fark(t.vade) <= 3 ? 'sari' : 'notr')}</td><td class="sag sayi">${tl(t.tutar)}</td><td class="sag m-tam"><button class="dg dg-cizgi dg-kucuk" data-hat="${k.id}|${i}">${ik('wp')}Hatırlat</button> <button class="dg dg-ana dg-kucuk" data-tahsil="${k.id}|${i}">Tahsil et</button></td></tr>`;
  let govde = '';
  if (durum.kasa === 'hareket') govde = `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Son hareketler</h3><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-disa>${ik('indir')}Excel</button></div></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th>Yöntem</th><th class="sag">Tutar</th></tr></thead><tbody>${hareketler.map(h => `<tr><td class="m-gizle">${tarih(h.tarih)}</td><td class="m-tam"><b style="color:var(--murekkep);font-weight:500">${e(h.aciklama)}</b></td><td>${rozet(h.kategori, h.tur === 'Gelir' ? 'yesil' : 'notr')}</td><td class="m-gizle">${e(h.yontem)}</td><td class="sag sayi" style="color:${h.tur === 'Gelir' ? 'var(--yesil)' : 'var(--murekkep)'}">${h.tur === 'Gelir' ? '+' : '−'}${tl(h.tutar)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="kart"><div class="kart-bas"><h3>Gider dağılımı</h3><small>Bu ay</small></div><div class="kart-govde" style="display:flex;flex-direction:column;align-items:center;gap:18px">${(() => { const kat = {}; S.hareket.filter(h => h.tur === 'Gider' && fark(h.tarih) > -BUGUN.getDate()).forEach(h => kat[h.kategori] = (kat[h.kategori] || 0) + h.tutar); const renk = ['#13171c', '#0a5bb0', '#ffc61a', '#b96206', '#6744b8', '#868d97']; const p = Object.entries(kat).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ k, v, renk: renk[i % 6] })); return halka(p, { orta: `<div><b>${tl(gider).replace(' ₺', '')}</b><small>₺ gider</small></div>`, boyut: 150 }) + `<ul class="lejant" style="width:100%">${p.map(x => `<li><i style="background:${x.renk}"></i>${e(x.k)}<b>${tl(x.v)}</b></li>`).join('')}</ul>`; })()}</div></div></div>`;
  if (durum.kasa === 'takvim') govde = `<div class="kart"><div class="kart-bas"><h3>Önümüzdeki 30 gün</h3><small>${yaklasan.length} taksit · ${tl(yaklasan.reduce((a, x) => a + x.t.tutar, 0))}</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Vade</th><th>Durum</th><th class="sag">Tutar</th><th></th></tr></thead><tbody>${yaklasan.map(x => taksitSatir(x, false)).join('')}</tbody></table></div></div>`;
  const senetler = S.kursiyerler.filter(k => k.odeme.senetli).flatMap(k => k.odeme.taksitler.map((t, i) => ({ k, t, i }))).sort((a, b) => a.t.vade.localeCompare(b.t.vade));
  if (durum.kasa === 'senet') govde = `<div class="kart"><div class="kart-bas"><h3>Senetler</h3><small>${senetler.filter(x => !x.t.odendi).length} açık senet · ${tl(senetler.filter(x => !x.t.odendi).reduce((a, x) => a + x.t.tutar, 0))}</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Senet</th><th>Borçlu</th><th>Vade</th><th>Durum</th><th class="sag">Tutar</th><th></th></tr></thead><tbody>${senetler.map(({ k, t, i }) => `<tr><td class="m-gizle mono">S-${k.id.slice(1)}-${i + 1}</td><td class="m-tam"><a class="kisi" href="#/kursiyer/${k.id}"><div><b>${e(tamAd(k))}</b><small>Kefil: ${e(k.acil ? k.acil.ad : '—')}</small></div></a></td><td>${tarih(t.vade)}</td><td>${t.odendi ? rozet('Tahsil edildi', 'yesil') : fark(t.vade) < 0 ? rozet('Vadesi geçti', 'kirmizi') : rozet('Portföyde', 'mavi')}</td><td class="sag sayi">${tl(t.tutar)}</td><td class="sag"><button class="dg dg-cizgi dg-kucuk" data-senet="${k.id}">${ik('belge')}Yazdır</button></td></tr>`).join('') || `<tr><td colspan="6">${bos('Senetli ödeme yok', '')}</td></tr>`}</tbody></table></div></div>`;
  if (durum.kasa === 'hesap') { const bugunH = S.hareket.filter(h => h.tarih === gun(0)); const gG = bugunH.filter(h => h.tur === 'Gelir'), gC = bugunH.filter(h => h.tur === 'Gider'); const yon = y => bugunH.filter(h => h.tur === 'Gelir' && h.yontem === y).reduce((a, h) => a + h.tutar, 0); govde = `<div class="izgara iz-3">${S.hesaplar.map(h => `<div class="kart" style="padding:18px 20px"><div style="display:flex;align-items:center;gap:10px">${isaret(h.tur === 'Kasa' ? 'bilgi' : 'zorunlu', 26)}<b style="font-family:var(--baslik);font-size:16px;color:var(--murekkep)">${e(h.ad)}</b><span style="margin-left:auto">${rozet(h.tur)}</span></div><b style="display:block;font-family:var(--baslik);font-size:30px;font-weight:900;color:var(--murekkep);margin-top:10px">${tl(h.bakiye + (h.id === 'kasa' ? yon('Nakit') : h.id === 'pos' ? yon('Kart') : yon('Havale')))}</b><small style="color:var(--soluk)">Bugün +${tl(h.id === 'kasa' ? yon('Nakit') : h.id === 'pos' ? yon('Kart') : yon('Havale'))}</small></div>`).join('')}</div><div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Gün sonu</h3><small>${bugunMetni2()}</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-gunsonu ${S.gunSonu.includes(gun(0)) ? 'disabled' : ''}>${S.gunSonu.includes(gun(0)) ? 'Gün kapatıldı' : 'Günü kapat'}</button></div></div><div class="kart-govde"><dl class="bilgi-tablo"><dt>Nakit tahsilat</dt><dd>${tl(yon('Nakit'))}</dd><dt>Kartla tahsilat</dt><dd>${tl(yon('Kart'))}</dd><dt>Havale / EFT</dt><dd>${tl(yon('Havale'))}</dd><dt>Bugünkü gider</dt><dd>${tl(gC.reduce((a, h) => a + h.tutar, 0))}</dd><dt>İşlem sayısı</dt><dd>${gG.length + gC.length}</dd></dl><p style="font-size:13.5px;color:var(--soluk);margin-top:12px">Günü kapatınca özet kurs müdürüne WhatsApp’tan gider; kapatılan gün değiştirilemez.</p></div></div>`; }
  if (durum.kasa === 'geciken') govde = `<div class="kart"><div class="kart-bas"><h3>Geciken taksitler</h3><small>${gec.length} taksit · ${tl(gecikenT)}</small><div class="sag"><button class="dg dg-wp dg-kucuk" data-toplu>${ik('wp')}Hepsine hatırlat</button></div></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Vade</th><th>Gecikme</th><th class="sag">Tutar</th><th></th></tr></thead><tbody>${gec.map(x => taksitSatir(x, true)).join('') || `<tr><td colspan="5">${bos('Geciken taksit yok', 'Tüm ödemeler zamanında.')}</td></tr>`}</tbody></table></div></div>`;
  return {
    baslik: 'Kasa ve ödemeler', alt: ayAdi(BUGUN.getMonth(), true) + ' ' + BUGUN.getFullYear(),
    html: `${ekranNotu('Kim ne ödedi, kimin taksiti gecikti, kasada ve bankada ne var. Geciken taksite tek dokunuşla ödeme linki gider.')}<div class="izgara iz-4">
      <div class="kart gosterge"><small>Bu ay gelir</small><b>${tl(gelir)}</b><span>Peşinat ve taksitler</span></div>
      <div class="kart gosterge"><small>Bu ay gider</small><b>${tl(gider)}</b><span>Kira, maaş, yakıt, bakım</span></div>
      <div class="kart gosterge"><small>Açık alacak</small><b>${tl(alacak)}</b><span>${S.kursiyerler.filter(k => kalanBorc(k)).length} kursiyerde</span></div>
      <div class="kart gosterge"><small>Geciken</small><b style="color:var(--kirmizi)">${tl(gecikenT)}</b><span>${gecikenK.length} kursiyer</span></div>
    </div><div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Son 6 ay</h3><small><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:var(--levha)"></i> gelir &nbsp; <i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#f0c9c4"></i> gider</small></div><div class="kart-govde">${cubukGrafik(grafik, { bicim: v => sayi(Math.round(v / 1000)) + 'k', seri2: 'Gider' })}</div></div>
    <div class="ara-bosluk"></div>
    <div class="bolum-bas"><div id="sek">${sekmeler([['hareket', 'Hareketler'], ['takvim', 'Taksit takvimi', yaklasan.length], ['geciken', 'Gecikenler', gec.length], ['senet', 'Senetler', senetler.filter(x => !x.t.odendi).length], ['hesap', 'Kasa ve banka']], durum.kasa)}</div><div class="sag"><button class="dg dg-cizgi" data-fatura>${ik('belge')}e-Arşiv fatura</button><button class="dg dg-ana" data-hareket>${ik('arti')}Gelir / gider ekle</button></div></div>
    ${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.kasa = s.dataset.sekme; if (location.hash !== '#/kasa') location.hash = '#/kasa'; else yenile(); }
        const ta = t.closest('[data-tahsil]'); if (ta) { const [id, i] = ta.dataset.tahsil.split('|'); tahsilAl(kursiyer(id), +i); }
        const h = t.closest('[data-hat]'); if (h) { const [id, i] = h.dataset.hat.split('|'); const ks = kursiyer(id), tk = ks.odeme.taksitler[+i]; wpGonder(ks, `Merhaba ${ks.ad}, ${tarih(tk.vade)} vadeli ${tl(tk.tutar)} taksidinin hatırlatmasıdır. Kartla ödemek için: odeme.ornek/${ks.id}`, 'Taksit hatırlatması'); }
        if (t.closest('[data-toplu]')) { gec.forEach(x => gonderimEkle(tamAd(x.k), 'Taksit hatırlatması ve ödeme linki', 'Taksit hatırlatması')); bildir(new Set(gec.map(x => x.k.id)).size + ' kursiyere ödeme linkiyle hatırlatma gönderildi', 'wp'); }
        if (t.closest('[data-hareket]')) hareketEkle();
        const sn = t.closest('[data-senet]'); if (sn) import('./sayfalar3.js').then(m => m.belgeAc('senet', sn.dataset.senet));
        if (t.closest('[data-gunsonu]')) { S.gunSonu.push(gun(0)); kaydet(); gonderimEkle(S.kurs.yetkili, 'Gün sonu özeti', 'Gün sonu'); bildir('Gün kapatıldı, özet kurs müdürüne gönderildi', 'wp'); yenile(); }
        if (t.closest('[data-fatura]')) faturaKes();
        if (t.closest('[data-disa]')) { csvIndir('kasa-hareketleri.csv', [['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Yöntem', 'Tutar'], ...S.hareket.map(x => [x.tarih, x.tur, x.kategori, x.aciklama, x.yontem, x.tutar])]); bildir('Kasa hareketleri indirildi'); }
      });
    },
  };
}
function hareketEkle() {
  pencere({
    baslik: 'Gelir / gider ekle',
    icerik: `<form class="form-izgara" id="f-h"><div class="alan tam"><div class="secim"><label><input type="radio" name="tur" value="Gider" checked><span>Gider</span></label><label><input type="radio" name="tur" value="Gelir"><span>Gelir</span></label></div></div>
      <div class="alan"><label>Kategori</label><select name="kat">${['Yakıt', 'Bakım', 'Kira', 'Maaş', 'Fatura', 'Reklam', 'Sınav harcı', 'Diğer'].map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="alan"><label>Tutar (₺)</label><input name="tutar" inputmode="numeric" required placeholder="0"></div>
      <div class="alan"><label>Tarih</label><input type="date" name="tarih" value="${gun(0)}"></div>
      <div class="alan"><label>Yöntem</label><select name="y"><option>Kart</option><option>Nakit</option><option>Havale</option></select></div>
      <div class="alan tam"><label>Açıklama</label><input name="a" placeholder="Örn. 26 SN 214 yakıt"></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-h">Kaydet</button>`,
    onAc(d) { d.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target, v = +f.tutar.value.replace(/\D/g, ''); if (!v) return bildir('Tutar girin', 'uyari'); S.hareket.unshift({ id: 'h' + Date.now(), tarih: f.tarih.value, tur: f.tur.value, kategori: f.kat.value, aciklama: f.a.value || f.kat.value, tutar: v, yontem: f.y.value }); kaydet(); kapatPencere(); bildir('Kaydedildi'); yenile(); }); },
  });
}
function faturaKes() {
  const son = S.hareket.filter(h => h.tur === 'Gelir' && h.kursiyer).slice(0, 8);
  pencere({
    baslik: 'e-Arşiv fatura',
    icerik: `<p style="color:var(--soluk);margin-bottom:12px">Tahsilatı seçin; fatura kursiyerin bilgileriyle hazırlanır ve WhatsApp’tan PDF olarak gönderilir.</p>${son.map((h, i) => `<label class="evrak" style="cursor:pointer"><input type="radio" name="h" value="${h.id}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--levha)"><span style="flex:1;color:var(--murekkep)">${e(h.aciklama)}</span><span class="sayi">${tl(h.tutar)}</span></label>`).join('')}
      <div class="ipucu uyari" style="margin-top:14px">${ik('uyari')}<span>Demo: gerçek fatura kesilmez. Canlı kullanımda e-Arşiv entegratörünüzle bağlanır.</span></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kes>Faturayı oluştur</button>`,
    onAc(d) { d.querySelector('[data-kes]').addEventListener('click', () => { kapatPencere(); bildir('Fatura oluşturuldu ve kursiyere gönderildi (demo)', 'wp'); }); },
  });
}

/* ================= EKİP VE ARAÇLAR ================= */
export function filo() {
  if (!['arac', 'egitmen', 'personel', 'prim', 'izin', 'masraf'].includes(durum.filo)) durum.filo = 'arac';
  const ayBas = new Date(BUGUN); ayBas.setDate(1);
  const buAy = t => tarihOku(t) >= ayBas && fark(t) <= 0;
  const hafta = S.dersler.filter(d => fark(d.tarih) >= -6 && fark(d.tarih) <= 0);
  const tarihSatir = (t, ad) => { if (!t) return `<div class="belge-satir"><span>${ad}</span><b style="color:var(--soluk);font-weight:400">Yok</b></div>`; const f = fark(t); return `<div class="belge-satir"><span>${ad}</span><b>${tarih(t)}</b>${f < 0 ? rozet('Süresi doldu', 'kirmizi') : f <= 30 ? rozet(f + ' gün kaldı', 'uyari') : ''}</div>`; };
  const masraf = a => S.hareket.filter(h => h.arac === a.id && buAy(h.tarih)).reduce((x, h) => x + h.tutar, 0);
  const aylikKm = a => Math.round(S.dersler.filter(d => d.arac === a.id && buAy(d.tarih) && d.durum === 'Yapıldı').length * 22);
  let govde = '';
  if (durum.filo === 'arac') govde = `<div class="izgara iz-3">${S.araclar.map(a => { const b = S.dersler.filter(d => d.arac === a.id && d.tarih === gun(0)); const uyari = [a.muayene, a.sigorta, a.kasko].some(t => t && fark(t) <= 30); return `<div class="kart arac-kart">${aracGorsel(a)}
      <div class="ust-satir" style="padding:0 6px">${uyari ? isaret('uyari', 26) : isaret('tamam', 26)}<div><h3>${e(a.model)}</h3><small style="color:var(--soluk)">${a.yil} · ${a.vites} · ${SINIFLAR[a.sinif].ad.split(' ·')[0]} sınıfı · ${e(egitmen(a.egitmen).ad)}</small></div></div>
      <div style="padding:0 6px"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:5px"><span>Bakıma kalan</span><b class="sayi" style="color:var(--murekkep)">${sayi(Math.max(0, a.bakimKm - a.km))} km</b></div>${ilerleme(10000 - Math.max(0, a.bakimKm - a.km), 10000, a.bakimKm - a.km < 2000 ? 'sari' : '')}</div>
      ${tarihSatir(a.muayene, 'Muayene')}${tarihSatir(a.sigorta, 'Sigorta')}${tarihSatir(a.kasko, 'Kasko')}
      <div class="belge-satir"><span>Bugün</span><b>${b.length} ders</b></div><div class="belge-satir"><span>Bu ay</span><b>${tl(masraf(a))} masraf · ${sayi(aylikKm(a))} km</b></div>
      <div style="display:flex;gap:6px;padding:0 6px 4px"><button class="dg dg-cizgi dg-kucuk" data-km="${a.id}">${ik('kalem')}Km gir</button><button class="dg dg-cizgi dg-kucuk" data-masraf="${a.id}">${ik('arti')}Masraf ekle</button></div></div>`; }).join('')}</div>`;
  if (durum.filo === 'egitmen') govde = `<div class="izgara iz-3">${S.egitmenler.map(x => {
      const bugun = S.dersler.filter(d => d.egitmen === x.id && d.tarih === gun(0)), ks = S.kursiyerler.filter(k => k.egitmen === x.id && k.asama !== 'Ehliyet');
      const sin = S.sinavlar.filter(s => s.tur === 'Direksiyon').flatMap(s => Object.entries(s.sonuc)).filter(([id]) => kursiyer(id) && kursiyer(id).egitmen === x.id);
      const gec = sin.length ? Math.round(sin.filter(([, v]) => v === 'Geçti').length / sin.length * 100) : null;
      const ar = S.araclar.find(a => a.egitmen === x.id), iz = S.izinler.find(i => i.kim === x.id && fark(i.bit) >= 0);
      return `<div class="kart arac-kart">${ar ? aracGorsel(ar) : ''}<div style="padding:0 6px"><h3>${e(x.ad)}</h3><small style="color:var(--soluk)">${x.baslama}’ten beri · ${x.siniflar.map(s => SINIFLAR[s].ad).join(', ')}</small>${iz ? `<div style="margin-top:6px">${rozet(iz.tur + ' · ' + tarih(iz.bas), 'uyari')}</div>` : ''}</div>
      ${olcumler([['Bugün', bugun.length + ''], ['Bu hafta', hafta.filter(d => d.egitmen === x.id).length + ''], ['Geçme', gec == null ? '—' : '%' + gec]])}
      <div class="belge-satir"><span>Kursiyer</span><b>${ks.length} aktif</b></div><div class="belge-satir"><span>Telefon</span><b>${e(x.tel)}</b></div></div>`; }).join('')}</div>`;
  if (durum.filo === 'personel') { const tum = [...S.egitmenler.map(x => ({ ad: x.ad, gorev: 'Direksiyon eğitmeni', maas: x.maas, tel: x.tel })), ...S.personel]; govde = `<div class="kart"><div class="kart-bas"><h3>Personel</h3><small>${tum.length} kişi · aylık maaş toplamı ${tl(tum.reduce((a, x) => a + x.maas, 0))}</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Ad</th><th>Görev</th><th>Telefon</th><th class="sag">Net maaş</th></tr></thead><tbody>${tum.map(x => `<tr><td class="m-tam"><b style="color:var(--murekkep)">${e(x.ad)}</b></td><td>${e(x.gorev)}</td><td class="m-gizle">${e(x.tel)}</td><td class="sag sayi">${tl(x.maas)}</td></tr>`).join('')}</tbody></table></div></div>`; }
  if (durum.filo === 'prim') govde = `<div class="kart"><div class="kart-bas"><h3>Ders primi · ${ayAdi(BUGUN.getMonth(), true)}</h3><small>Yapılan her direksiyon dersi için eğitmene prim; maaşa eklenir</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Eğitmen</th><th class="sag">Yapılan ders</th><th class="sag">Ders başı</th><th class="sag">Prim</th><th class="sag">Maaş + prim</th></tr></thead><tbody>${S.egitmenler.map(x => { const n = S.dersler.filter(d => d.egitmen === x.id && d.durum === 'Yapıldı' && buAy(d.tarih)).length; return `<tr><td class="m-tam"><b style="color:var(--murekkep)">${e(x.ad)}</b></td><td class="sag sayi">${n}</td><td class="sag sayi m-gizle">${tl(x.prim)}</td><td class="sag sayi">${tl(n * x.prim)}</td><td class="sag sayi">${tl(x.maas + n * x.prim)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  if (durum.filo === 'izin') govde = `<div class="kart"><div class="kart-bas"><h3>İzinler</h3><small>İzinli eğitmenin günü planda kapalı görünür</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-izin>${ik('arti')}İzin ekle</button></div></div><ul class="liste" style="margin-top:8px">${S.izinler.slice().sort((a, b) => b.bas.localeCompare(a.bas)).map(i => { const kim = egitmen(i.kim) || S.personel.find(p => p.id === i.kim); return `<li>${isaret(fark(i.bit) < 0 ? 'tamam' : 'uyari', 26)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(kim ? kim.ad : '')}</b><small style="color:var(--soluk)">${e(i.tur)} · ${tarih(i.bas)}${i.bit !== i.bas ? ' – ' + tarih(i.bit) : ''}</small></div><span class="sag">${fark(i.bit) < 0 ? rozet('Bitti') : fark(i.bas) <= 0 ? rozet('Şu an izinde', 'kirmizi') : rozet(goreli(i.bas), 'mavi')}</span></li>`; }).join('')}</ul></div>`;
  if (durum.filo === 'masraf') { const top = S.araclar.map(a => ({ a, m: masraf(a), km: aylikKm(a) })); govde = `<div class="kart"><div class="kart-bas"><h3>Araç masrafları · ${ayAdi(BUGUN.getMonth(), true)}</h3><small>Yakıt, bakım, lastik; araç başına kilometre maliyeti</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Araç</th><th class="sag">Masraf</th><th class="sag">Ders km</th><th class="sag">Km başı</th></tr></thead><tbody>${top.map(({ a, m, km }) => `<tr><td class="m-tam"><div class="kisi">${aracGorsel(a, 'kucuk')}<div><b>${e(a.plaka)}</b><small>${e(a.model)}</small></div></div></td><td class="sag sayi">${tl(m)}</td><td class="sag sayi">${sayi(km)}</td><td class="sag sayi">${km ? tl(m / km) : '—'}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="ara-bosluk"></div><div class="kart"><div class="kart-bas"><h3>Son masraflar</h3></div><ul class="liste" style="margin-top:8px">${S.hareket.filter(h => h.arac).sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 12).map(h => `<li><span class="zaman" style="width:60px">${tarih(h.tarih)}</span><div style="flex:1"><b style="color:var(--murekkep)">${e(h.aciklama)}</b><small style="display:block;color:var(--soluk)">${e(h.kategori)} · ${e(h.yontem)}</small></div><b class="sayi sag">${tl(h.tutar)}</b></li>`).join('')}</ul></div>`; }
  return {
    baslik: 'Ekip ve araçlar', alt: S.egitmenler.length + ' eğitmen · ' + S.personel.length + ' personel · ' + S.araclar.length + ' araç',
    html: `${ekranNotu('Araçların muayene, sigorta ve bakım durumu; eğitmenlerin ders yükü, primi ve izinleri. Süresi dolacak belgeyi Sinyal 30 ve 7 gün önce hatırlatır.')}
      <div id="sek">${sekmeler([['arac', 'Araçlar', S.araclar.length], ['egitmen', 'Eğitmenler', S.egitmenler.length], ['personel', 'Personel ve maaş'], ['prim', 'Ders primi'], ['izin', 'İzinler'], ['masraf', 'Araç masrafları']], durum.filo)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.filo = s.dataset.sekme; yenile(); }
        const km = t.closest('[data-km]'); if (km) { const a = arac(km.dataset.km); pencere({ baslik: a.plaka + ' · kilometre', icerik: `<div style="display:flex;gap:14px;align-items:center">${aracGorsel(a, 'orta')}<div class="alan" style="flex:1"><label>Güncel kilometre</label><input name="km" inputmode="numeric" value="${a.km}"></div></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { a.km = +d.querySelector('[name=km]').value.replace(/\D/g, '') || a.km; kaydet(); kapatPencere(); bildir('Kilometre kaydedildi'); yenile(); }); } }); }
        const ms = t.closest('[data-masraf]'); if (ms) { const a = arac(ms.dataset.masraf); pencere({ baslik: a.plaka + ' · masraf ekle', icerik: `<form class="form-izgara" id="f-m"><div class="alan"><label>Tür</label><select name="kat"><option>Yakıt</option><option>Bakım</option><option>Lastik</option><option>Yıkama</option><option>Ceza</option></select></div><div class="alan"><label>Tutar (₺)</label><input name="t" inputmode="numeric" required></div><div class="alan tam"><label>Not</label><input name="n" placeholder="Örn. Opet, 40 litre"></div></form>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-m">Kaydet</button>`, onAc(d) { d.querySelector('form').addEventListener('submit', ev2 => { ev2.preventDefault(); const f = ev2.target, v = +f.t.value.replace(/\D/g, ''); if (!v) return bildir('Tutar girin', 'uyari'); S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gider', kategori: f.kat.value, aciklama: a.plaka + ' · ' + (f.n.value || f.kat.value.toLowerCase()), tutar: v, yontem: 'Kart', arac: a.id }); kaydet(); kapatPencere(); bildir('Masraf kasaya işlendi'); yenile(); }); } }); }
        if (t.closest('[data-izin]')) pencere({ baslik: 'İzin ekle', icerik: `<form class="form-izgara" id="f-iz"><div class="alan tam"><label>Kim?</label><select name="kim">${S.egitmenler.concat(S.personel).map(x => `<option value="${x.id}">${e(x.ad)}</option>`).join('')}</select></div><div class="alan"><label>Başlangıç</label><input type="date" name="bas" value="${gun(3)}"></div><div class="alan"><label>Bitiş</label><input type="date" name="bit" value="${gun(3)}"></div><div class="alan tam"><label>Tür</label><select name="tur"><option>Yıllık izin</option><option>Mazeret izni</option><option>Rapor</option></select></div></form>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-iz">Kaydet</button>`, onAc(d) { d.querySelector('form').addEventListener('submit', ev2 => { ev2.preventDefault(); const f = ev2.target; S.izinler.push({ kim: f.kim.value, bas: f.bas.value, bit: f.bit.value < f.bas.value ? f.bas.value : f.bit.value, tur: f.tur.value }); const etk = S.dersler.filter(x => x.egitmen === f.kim.value && x.tarih >= f.bas.value && x.tarih <= f.bit.value && x.durum === 'Planlandı').length; kaydet(); kapatPencere(); bildir(etk ? `İzin kaydedildi. O günlerde ${etk} ders var; planda başka eğitmene taşıyın` : 'İzin kaydedildi', etk ? 'uyari' : 'tamam'); yenile(); }); } });
      });
    },
  };
}

/* ================= MESAJLAR VE ASİSTAN ================= */
export function mesajlar() {
  const sohbetler = S.adaylar.filter(a => a.asama !== 'Kaybedildi');
  if (!secSohbet || !sohbetler.find(a => a.id === secSohbet)) secSohbet = sohbetler[0] && sohbetler[0].id;
  const sec = sohbetler.find(a => a.id === secSohbet);
  const toplamOto = S.otomasyonlar.reduce((a, o) => a + o.gonderim, 0) + S.gonderimler.length;
  let govde = '';
  if (durum.mesaj === 'gelen') govde = `<div class="kart" style="overflow:hidden"><div class="sohbet">
      <div class="sohbet-liste">${sohbetler.map(a => `<a href="#" data-sohbet="${a.id}" class="${a.id === secSohbet ? 'secili' : ''}">${avatar(...a.ad.split(' '))}<div style="min-width:0;flex:1"><div style="display:flex;gap:6px"><b style="color:var(--murekkep);font-size:13.5px">${e(a.ad)}</b><small style="margin-left:auto;color:var(--soluk);font-size:11.5px">${goreli(a.tarih)}</small></div><p>${a.mesajlar[a.mesajlar.length - 1].kim === 'aday' ? '' : 'Asistan: '}${e(a.mesajlar[a.mesajlar.length - 1].metin)}</p></div></a>`).join('')}</div>
      <div class="sohbet-pencere">${sec ? `<div class="sohbet-ust">${avatar(...sec.ad.split(' '))}<div><b style="color:var(--murekkep)">${e(sec.ad)}</b><small style="display:block;color:var(--soluk);font-size:12px">${e(sec.kanal)} · ${e(sec.kaynak)} · ${rozet(sec.asama)}</small></div><a class="dg dg-cizgi dg-kucuk" style="margin-left:auto" href="#/adaylar/${sec.id}">Aday kartı</a></div>
        <div class="sohbet-akis">${sec.mesajlar.map(m => `<div class="balon ${m.kim !== 'aday' ? 'giden' : ''}">${e(m.metin)}<small>${m.kim === 'asistan' ? ik('robot') + ' Asistan · otomatik' : m.kim === 'kurs' ? 'Siz' : sec.saat}</small></div>`).join('')}</div>
        <form class="sohbet-yaz" data-yaz><input class="girdi" name="m" placeholder="Asistanın yerine siz yazın" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('gonder')}Gönder</button></form>` : bos('Sohbet yok', '')}</div></div></div>`;
  if (durum.mesaj === 'oto') govde = `<div class="kart">${S.otomasyonlar.map(o => `<div class="oto"><span class="oto-ik">${ik({ o1: 'direksiyon', o2: 'kasa', o3: 'sinav', o4: 'belge', o5: 'yildiz', o6: 'sifirla', o7: 'aday' }[o.id] || 'mesaj')}</span><div style="min-width:0"><h4>${e(o.ad)}</h4><p>${e(o.ne)} · ${o.kanal} · ${sayi(o.gonderim)} gönderim</p><div class="sablon">${e(o.sablon)}</div></div><div class="sag"><button class="dg dg-hafif dg-kucuk" data-duzenle="${o.id}">Düzenle</button><span class="anahtar"><input type="checkbox" data-oto="${o.id}" ${o.acik ? 'checked' : ''} aria-label="${e(o.ad)}"><i></i></span></div></div>`).join('')}</div>`;
  if (durum.mesaj === 'toplu') govde = `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Toplu duyuru</h3><small>Bayram tatili, sınav takvimi, kampanya…</small></div><div class="kart-govde"><form id="f-toplu" class="form-izgara">
      <div class="alan tam"><span class="et">Kime?</span><div class="secim">${[['aktif', 'Tüm aktif kursiyerler'], ['Teorik', 'Teorik aşama'], ['Direksiyon', 'Direksiyon aşama'], ['Sınav', 'Sınav bekleyenler'], ['borclu', 'Taksiti gecikenler'], ['aday', 'Kaydolmayan adaylar']].map(([v, t], i) => `<label><input type="radio" name="hedef" value="${v}" ${i === 0 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <div class="alan tam"><span class="et">Kanal</span><div class="secim"><label><input type="radio" name="kanal" value="WhatsApp" checked><span>${ik('wp')}WhatsApp</span></label><label><input type="radio" name="kanal" value="SMS"><span>SMS · bakiye ${sayi(S.sms.bakiye)}</span></label></div></div>
      <div class="alan tam"><label>Mesaj</label><textarea name="m" style="min-height:120px">Merhaba {ad}, 29 Ekim Cumhuriyet Bayramı nedeniyle kursumuz kapalı olacaktır. Bu günkü direksiyon derslerin yeniden planlanacak. İyi bayramlar!</textarea></div>
      <div class="tam" style="display:flex;align-items:center;gap:12px"><span id="hedef-say" style="color:var(--soluk);font-size:13px"></span><button class="dg dg-wp" style="margin-left:auto" type="submit">${ik('wp')}Gönder</button></div></form></div></div>
    <div class="kart"><div class="kart-bas"><h3>Son gönderimler</h3></div><ul class="zaman-cizgisi" style="padding:16px 20px 16px 40px">${S.gonderimler.slice(0, 8).map(g => `<li>${e(g.kime)}<small>${e(g.tur)} · ${new Date(g.zaman).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</small></li>`).join('') || '<li style="color:var(--soluk)">Bu oturumda henüz gönderim yok<small>Gönderdiğiniz mesajlar burada listelenir.</small></li>'}</ul></div></div>`;
  if (durum.mesaj === 'yorum') {
    const ehl = S.kursiyerler.filter(k => k.asama === 'Ehliyet');
    govde = `<div class="izgara iz-3"><div class="kart gosterge"><small>Google puanı</small><b>${S.kurs.puan.toLocaleString('tr-TR')} ★</b><span>${S.kurs.yorumSayisi} değerlendirme</span></div><div class="kart gosterge"><small>Yorum istenen</small><b>${ehl.filter(k => k.yorum).length}</b><span>Ehliyet alan kursiyerler</span></div><div class="kart gosterge"><small>Yorum yapan</small><b>%${Math.round(ehl.filter(k => k.yorum === 'yapti').length / Math.max(1, ehl.length) * 100)}</b><span>${ehl.filter(k => k.yorum === 'yapti').length} kişi</span></div></div><div class="ara-bosluk"></div>
      <div class="kart"><div class="kart-bas"><h3>Ehliyet alanlar</h3><small>Sınavı geçince otomatik yorum isteği gider</small></div><ul class="liste" style="margin-top:8px">${ehl.map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${k.dsinav ? 'Sınav ' + goreli(k.dsinav.tarih) : ''}</small></div></a><span class="sag">${k.yorum === 'yapti' ? rozet('Yorum yaptı ★', 'yesil') : `${rozet('İstendi', 'sari')}<button class="dg dg-cizgi dg-kucuk" data-yorum="${k.id}">Tekrar hatırlat</button>`}</span></li>`).join('')}</ul></div>`;
  }
  return {
    baslik: 'Mesajlar ve asistan', alt: 'WhatsApp ve Instagram tek kutuda · ' + sayi(toplamOto) + ' otomatik mesaj gönderildi',
    html: `${ekranNotu('WhatsApp ve Instagram mesajları tek kutuda. Asistan kursun bilgileriyle anında cevap verir; hatırlatmalar ve duyurular buradan ayarlanır. WhatsApp kullanmayanlara SMS gider.')}<div id="sek">${sekmeler([['gelen', 'Gelen kutusu', sohbetler.length], ['oto', 'Otomatik mesajlar', S.otomasyonlar.filter(o => o.acik).length], ['toplu', 'Toplu duyuru'], ['yorum', 'Google yorumları']], durum.mesaj)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.mesaj = s.dataset.sekme; yenile(); }
        const so = t.closest('[data-sohbet]'); if (so) { ev.preventDefault(); secSohbet = so.dataset.sohbet; yenile(); }
        const du = t.closest('[data-duzenle]'); if (du) { const o = S.otomasyonlar.find(x => x.id === du.dataset.duzenle); pencere({ baslik: o.ad, icerik: `<div class="alan"><label>Mesaj şablonu</label><textarea name="s" style="min-height:130px">${e(o.sablon)}</textarea></div><p style="font-size:12.5px;color:var(--soluk);margin-top:8px">Süslü parantezdeki alanlar ({ad}, {saat}, {tutar}…) her kursiyer için otomatik doldurulur.</p>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydet</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { o.sablon = d.querySelector('textarea').value; kaydet(); kapatPencere(); bildir('Şablon kaydedildi'); yenile(); }); } }); }
        const y = t.closest('[data-yorum]'); if (y) wpGonder(kursiyer(y.dataset.yorum), 'Google yorum hatırlatması', 'Yorum isteği');
      });
      k.addEventListener('change', ev => { const o = ev.target.closest('[data-oto]'); if (o) { const x = S.otomasyonlar.find(z => z.id === o.dataset.oto); x.acik = o.checked; kaydet(); bildir(x.ad + (o.checked ? ' açıldı' : ' kapatıldı')); } });
      const yaz = k.querySelector('[data-yaz]'); if (yaz) yaz.addEventListener('submit', ev => { ev.preventDefault(); const m = ev.target.m.value.trim(); if (!m) return; const a = S.adaylar.find(x => x.id === secSohbet); a.mesajlar.push({ kim: 'kurs', metin: m }); kaydet(); wpGonder(a.ad, m); yenile(); });
      const ak = k.querySelector('.sohbet-akis'); if (ak) ak.scrollTop = 1e5;
      const ft = k.querySelector('#f-toplu');
      if (ft) {
        const hedef = () => { const v = ft.hedef.value; return v === 'aday' ? S.adaylar.filter(a => !['Kayıt', 'Kaybedildi'].includes(a.asama)).map(a => a.ad) : S.kursiyerler.filter(x => v === 'aktif' ? x.asama !== 'Ehliyet' : v === 'borclu' ? gecikenler(x).length : x.asama === v).map(tamAd); };
        const say = () => ft.querySelector('#hedef-say').textContent = hedef().length + ' kişiye gidecek';
        ft.addEventListener('change', say); say();
        ft.addEventListener('submit', ev => { ev.preventDefault(); const l = hedef(), kanal = ft.kanal.value; if (kanal === 'SMS') { if (S.sms.bakiye < l.length) return bildir('SMS bakiyesi yetersiz', 'uyari'); S.sms.bakiye -= l.length; } l.forEach(x => gonderimEkle(x, ft.m.value.slice(0, 60) + '…', 'Toplu duyuru · ' + kanal)); kaydet(); bildir(l.length + ' kişiye ' + kanal + ' ile duyuru gönderildi', kanal === 'SMS' ? 'tamam' : 'wp'); yenile(); });
      }
    },
  };
}

/* ================= MEB İŞLEMLERİ ================= */
export function meb() {
  const aktarim = S.kursiyerler.filter(k => !k.mebIslendi && !eksikEvrak(k).length);
  const eksik = S.kursiyerler.filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet');
  const esinav = S.kursiyerler.filter(k => k.asama === 'Teorik' && k.teorik >= SINIFLAR[k.sinif].teorik - 4 && !S.sinavlar.some(s => s.tur === 'e-Sınav' && fark(s.tarih) >= 0 && s.kursiyerler.includes(k.id)));
  const kontroller = (() => {
    const l = [];
    const gr = {}; S.dersler.filter(d => fark(d.tarih) >= 0 && fark(d.tarih) <= 7).forEach(d => { const a = d.kursiyer + '|' + d.tarih; gr[a] = (gr[a] || 0) + 1; });
    Object.entries(gr).filter(([, n]) => n > S.kurs.gunlukDersSiniri).forEach(([a, n]) => { const k = kursiyer(a.split('|')[0]); if (k) l.push(['uyari', `${tamAd(k)} için aynı güne ${n} direksiyon dersi planlanmış`, 'Kurs ayarlarındaki günlük sınır ' + S.kurs.gunlukDersSiniri + ' ders.', '#/plan']); });
    S.sinavlar.filter(s => s.tur === 'e-Sınav' && fark(s.tarih) >= 0).forEach(s => s.kursiyerler.map(kursiyer).filter(k => k && eksikEvrak(k).length).forEach(k => l.push(['kirmizi', `${tamAd(k)} e-sınava kayıtlı ama evrakı eksik`, eksikEvrak(k).map(x => x[1]).join(', '), '#/kursiyer/' + k.id])));
    S.kursiyerler.filter(k => k.mebIslendi === false && k.asama !== 'Kayıt' && k.asama !== 'Evrak' && !eksikEvrak(k).length).slice(0, 3).forEach(k => l.push(['uyari', `${tamAd(k)} derslere başladı ama MEBBİS kaydı işaretlenmedi`, 'Aktarım listesinden kontrol edin.', '#/meb']));
    S.araclar.filter(a => [a.muayene, a.sigorta].some(t => t && fark(t) < 0)).forEach(a => l.push(['kirmizi', `${a.plaka} belgesi süresi dolmuş araçla ders verilmemeli`, a.model, '#/filo']));
    return l;
  })();
  let govde = '';
  if (durum.meb === 'aktarim') govde = `<div class="kart"><div class="kart-bas"><h3>MEBBİS’e girilecek kursiyerler</h3><small>Evrakı tamam, kaydı işlenmemiş</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-csv="aktarim" ${aktarim.length ? '' : 'disabled'}>${ik('indir')}Excel listesi</button></div></div>
      <div class="tablo-kap" style="margin-top:10px"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Sınıf</th><th>Kayıt</th><th>Evrak</th><th></th></tr></thead><tbody>${aktarim.map(k => `<tr><td class="m-tam"><a class="kisi" href="#/kursiyer/${k.id}">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${e(k.tel)}</small></div></a></td><td>${rozet(SINIFLAR[k.sinif].ad)}</td><td class="m-gizle">${tarih(k.kayit)}</td><td class="m-gizle">${rozet('5/5 tamam', 'yesil')}</td><td class="sag"><button class="dg dg-ana dg-kucuk" data-isle="${k.id}">${ik('tik')}MEBBİS’e girildi</button></td></tr>`).join('') || `<tr><td colspan="5">${bos('Bekleyen kayıt yok', 'Evrakı tamamlanan herkes MEBBİS’e işlenmiş.')}</td></tr>`}</tbody></table></div></div>`;
  if (durum.meb === 'evrak') govde = `<div class="kart"><div class="kart-bas"><h3>Evrak kontrolü</h3><small>${eksik.length} kursiyerde eksik var</small><div class="sag"><button class="dg dg-wp dg-kucuk" data-evrak-toplu ${eksik.length ? '' : 'disabled'}>${ik('wp')}Hepsine hatırlat</button></div></div>
      <div class="tablo-kap" style="margin-top:10px"><table class="tablo"><thead><tr><th>Kursiyer</th>${EVRAKLAR.map(([, t]) => `<th style="text-align:center">${t}</th>`).join('')}</tr></thead><tbody>${eksik.map(k => `<tr><td><a class="kisi" href="#/kursiyer/${k.id}">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>Kayıt ${goreli(k.kayit)}</small></div></a></td>${EVRAKLAR.map(([key]) => `<td style="text-align:center"><span class="evrak" style="display:inline-flex;padding:0;border:0"><span class="durum ${k.evrak[key] ? 'var' : 'yok'}">${ik(k.evrak[key] ? 'tik' : 'kapat')}</span></span></td>`).join('')}</tr>`).join('') || `<tr><td colspan="6">${bos('Eksik evrak yok', '')}</td></tr>`}</tbody></table></div></div>`;
  if (durum.meb === 'esinav') govde = `<div class="kart"><div class="kart-bas"><h3>e-Sınav başvuru listesi</h3><small>Teorik derslerini tamamlayan, oturuma atanmamış kursiyerler</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-csv="esinav" ${esinav.length ? '' : 'disabled'}>${ik('indir')}Excel listesi</button><a class="dg dg-ana dg-kucuk" href="#/sinavlar">Oturuma ekle</a></div></div>
      <ul class="liste" style="margin-top:8px">${esinav.map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${SINIFLAR[k.sinif].ad} · ${k.teorik}/${SINIFLAR[k.sinif].teorik} saat</small></div></a><span class="sag">${eksikEvrak(k).length ? rozet('Evrak eksik', 'kirmizi') : rozet('Hazır', 'yesil')}</span></li>`).join('') || '<li>' + bos('Başvuru bekleyen yok', 'Teorik derslerini bitiren kursiyerler burada görünür.') + '</li>'}</ul>
      <div class="ipucu" style="margin:0 20px 20px">${ik('saat')}<span>MEB 2026 e-sınav kılavuzuna göre her e-sınav oturumu için KDV dahil 1.250 TL e-sınav ücreti alınır. Kursiyere sınav öncesi otomatik bilgilendirme gider.</span></div></div>`;
  if (durum.meb === 'kontrol') govde = `<div class="kart"><div class="kart-bas"><h3>Uygunluk kontrolleri</h3><small>Sinyal planı ve kayıtları sürekli tarar</small></div><ul class="liste" style="margin-top:8px">${kontroller.map(([t, b, a, h]) => `<li><span class="oto-ik" style="color:var(--${t === 'kirmizi' ? 'kirmizi' : 'uyari'})">${ik('uyari')}</span><a href="${h}" style="min-width:0;flex:1"><b style="color:var(--murekkep);font-weight:600;display:block">${e(b)}</b><small style="color:var(--soluk)">${e(a)}</small></a><span class="sag">${ik('sag')}</span></li>`).join('') || '<li>' + bos('Sorun bulunmadı', 'Plan ve kayıtlar kurallara uygun.') + '</li>'}</ul></div>`;
  if (durum.meb === 'duyuru') govde = `<div class="kart"><div class="kart-bas"><h3>Mevzuat ve duyurular</h3><small>MEB ve il MEM duyurularının sade özeti</small></div><ul class="liste" style="margin-top:8px">${S.duyurular.map(d => `<li style="align-items:flex-start"><span class="oto-ik">${ik('meb')}</span><div><b style="color:var(--murekkep);display:block">${e(d.baslik)}</b><p style="font-size:13px;margin-top:2px">${e(d.ozet)}</p><small style="color:var(--soluk)">${e(d.kaynak)} · ${e(d.tarih)}</small></div></li>`).join('')}</ul></div>`;
  return {
    baslik: 'MEB işlemleri', alt: 'MEBBİS’e girilecekler, evrak ve sınav başvuruları',
    html: `<div class="ipucu" style="margin-bottom:18px">${ik('meb')}<span>Sinyal MEBBİS’e sizin adınıza giriş yapmaz. Girilecek kayıtları hazır bir liste olarak önünüze koyar; MEBBİS’te işledikten sonra burada işaretlersiniz.</span></div>
      <div class="izgara iz-4">
        <div class="kart gosterge"><small>MEBBİS’e girilecek</small><b>${aktarim.length}</b><span>Evrakı tamam</span></div>
        <div class="kart gosterge"><small>Evrakı eksik</small><b>${eksik.length}</b><span>${eksik.reduce((a, k) => a + eksikEvrak(k).length, 0)} belge bekleniyor</span></div>
        <div class="kart gosterge"><small>e-Sınava başvurulacak</small><b>${esinav.length}</b><span>Teorik dersleri tamam</span></div>
        <div class="kart gosterge"><small>Uygunluk uyarısı</small><b style="color:${kontroller.length ? 'var(--turuncu)' : 'var(--yesil)'}">${kontroller.length}</b><span>${kontroller.length ? 'İnceleme bekliyor' : 'Sorun yok'}</span></div>
      </div><div class="ara-bosluk"></div>
      <div id="sek">${sekmeler([['aktarim', 'MEBBİS aktarım', aktarim.length], ['evrak', 'Evrak kontrolü', eksik.length], ['esinav', 'e-Sınav başvuruları', esinav.length], ['kontrol', 'Uygunluk', kontroller.length], ['duyuru', 'Mevzuat']], durum.meb)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { durum.meb = s.dataset.sekme; yenile(); }
        const i = t.closest('[data-isle]'); if (i) { kursiyer(i.dataset.isle).mebIslendi = true; kaydet(); bildir('MEBBİS’e girildi olarak işaretlendi'); yenile(); }
        if (t.closest('[data-evrak-toplu]')) { eksik.forEach(x => gonderimEkle(tamAd(x), 'Eksik evrak: ' + eksikEvrak(x).map(z => z[1]).join(', '), 'Evrak hatırlatması')); bildir(eksik.length + ' kursiyere eksik evrak hatırlatması gönderildi', 'wp'); }
        const c = t.closest('[data-csv]'); if (c) { const l = c.dataset.csv === 'aktarim' ? aktarim : esinav; csvIndir(c.dataset.csv === 'aktarim' ? 'mebbis-aktarim.csv' : 'esinav-basvuru.csv', [['Ad', 'Soyad', 'Telefon', 'Sınıf', 'Kayıt tarihi', 'Teorik saat'], ...l.map(x => [x.ad, x.soyad, x.tel, SINIFLAR[x.sinif].ad, x.kayit, x.teorik])]); bildir('Liste indirildi'); }
      });
    },
  };
}

/* ================= RAPORLAR ================= */
export function raporlar() {
  const ayBas = new Date(BUGUN); ayBas.setDate(1);
  const aylik = []; for (let m = 5; m >= 0; m--) { const d = new Date(ayBas); d.setMonth(d.getMonth() - m); const f = h => tarihOku(h.tarih).getMonth() === d.getMonth() && tarihOku(h.tarih).getFullYear() === d.getFullYear(); const g = S.hareket.filter(h => h.tur === 'Gelir' && f(h)).reduce((a, h) => a + h.tutar, 0), c = S.hareket.filter(h => h.tur === 'Gider' && f(h)).reduce((a, h) => a + h.tutar, 0); aylik.push({ e: ayAdi(d.getMonth()), v: g - c, vurgu: m === 0 }); }
  const renk = ['#0a5bb0', '#13171c', '#ffc61a', '#b96206', '#6744b8'];
  const kaynak = KAYNAKLAR.map((k, i) => ({ k, v: S.kursiyerler.filter(x => x.kaynak === k).length, renk: renk[i] })).filter(x => x.v);
  const sinif = Object.entries(SINIFLAR).map(([k, v], i) => ({ k: v.ad, v: S.kursiyerler.filter(x => x.sinif === k).length, renk: renk[i] }));
  const huniA = [['Gelen aday', S.adaylar.length], ['Bilgi verildi', S.adaylar.filter(a => a.asama !== 'Yeni').length], ['Görüşme', S.adaylar.filter(a => ['Görüşme', 'Kayıt'].includes(a.asama)).length], ['Kayıt', S.adaylar.filter(a => a.asama === 'Kayıt').length]];
  const egSatir = S.egitmenler.map(x => { const sin = S.sinavlar.filter(s => s.tur === 'Direksiyon').flatMap(s => Object.entries(s.sonuc)).filter(([id]) => kursiyer(id) && kursiyer(id).egitmen === x.id); const gec = sin.filter(([, v]) => v === 'Geçti').length; const d = S.dersler.filter(z => z.egitmen === x.id && z.durum !== 'Planlandı'); return { x, sin: sin.length, gec, ders: d.length, gelmedi: d.filter(z => z.durum === 'Gelmedi').length }; });
  const bitiren = S.kursiyerler.filter(k => k.dsinav && k.dsinav.sonuc === 'Geçti');
  const ortSure = bitiren.length ? Math.round(bitiren.reduce((a, k) => a + (tarihOku(k.dsinav.tarih) - tarihOku(k.kayit)) / 864e5, 0) / bitiren.length) : 0;
  return {
    baslik: 'Raporlar', alt: 'Son 6 ay',
    html: `${ekranNotu('Kurs nasıl gidiyor: kazanç, kursiyerlerin nereden geldiği, hangi eğitmenin öğrencisi sınavı geçiyor.')}<div class="izgara iz-4">
      <div class="kart gosterge"><small>Kayıttan ehliyete</small><b>${ortSure} gün</b><span>Ortalama süre</span></div>
      <div class="kart gosterge"><small>Gelmeyen ders oranı</small><b>%${Math.round(S.dersler.filter(d => d.durum === 'Gelmedi').length / Math.max(1, S.dersler.filter(d => d.durum !== 'Planlandı').length) * 100)}</b><span>Hatırlatmalar açıkken</span></div>
      <div class="kart gosterge"><small>Kursiyer başı gelir</small><b>${tl(S.kursiyerler.reduce((a, k) => a + k.odeme.toplam, 0) / S.kursiyerler.length)}</b><span>Ortalama ücret</span></div>
      <div class="kart gosterge"><small>Tahsilat oranı</small><b>%${Math.round(S.kursiyerler.reduce((a, k) => a + odenen(k), 0) / S.kursiyerler.reduce((a, k) => a + k.odeme.toplam, 0) * 100)}</b><span>Toplam ücretin ödenen kısmı</span></div>
    </div><div class="ara-bosluk"></div>
    <div class="izgara iz-21">
      <div class="kart"><div class="kart-bas"><h3>Aylık net (gelir − gider)</h3></div><div class="kart-govde">${cubukGrafik(aylik.map(a => ({ ...a, v: Math.max(0, a.v) })), { bicim: v => sayi(Math.round(v / 1000)) + 'k' })}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Kursiyerler nereden geliyor?</h3></div><div class="kart-govde" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">${halka(kaynak, { orta: `<div><b>${S.kursiyerler.length}</b><small>kursiyer</small></div>` })}<ul class="lejant" style="flex:1;min-width:160px">${kaynak.map(x => `<li><i style="background:${x.renk}"></i>${x.k}<b>%${Math.round(x.v / S.kursiyerler.length * 100)}</b></li>`).join('')}</ul></div></div>
    </div><div class="ara-bosluk"></div>
    <div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Eğitmen performansı</h3><small>Direksiyon sınavı</small></div><div class="tablo-kap" style="margin-top:10px"><table class="tablo"><thead><tr><th>Eğitmen</th><th class="sag">Ders</th><th class="sag">Gelmedi</th><th>Sınavı geçen</th></tr></thead><tbody>${egSatir.map(r => `<tr><td>${e(r.x.ad)}</td><td class="sag sayi">${r.ders}</td><td class="sag sayi">${r.gelmedi}</td><td style="min-width:140px">${r.sin ? `<span class="sayi" style="font-size:12.5px">${r.gec}/${r.sin} · %${Math.round(r.gec / r.sin * 100)}</span>${ilerleme(r.gec, r.sin, 'yesil')}` : '<span style="color:var(--soluk)">—</span>'}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="kart"><div class="kart-bas"><h3>Aday hunisi</h3><small>Asistanın getirdiği kayıtlar</small></div><div class="kart-govde">${huniA.map(([t, n], i) => `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span>${t}</span><b class="sayi" style="color:var(--murekkep)">${n}</b></div>${ilerleme(n, huniA[0][1], i === 3 ? 'yesil' : '')}</div>`).join('')}
        <div class="kart-bas" style="padding:14px 0 8px"><h3>Sınıflara göre</h3></div><ul class="lejant">${sinif.map(x => `<li><i style="background:${x.renk}"></i>${x.k}<b>${x.v}</b></li>`).join('')}</ul></div></div>
    </div>`,
  };
}

/* ================= AYARLAR ================= */
export function ayarlar() {
  let govde = '';
  if (durum.ayar === 'kurs') govde = `<div class="kart"><div class="kart-govde"><form class="form-izgara" id="f-kurs">
      <div class="alan"><label>Kurs adı</label><input name="ad" value="${e(S.kurs.ad)}"></div><div class="alan"><label>Şehir</label><input name="sehir" value="${e(S.kurs.sehir)}"></div>
      <div class="alan"><label>Telefon</label><input name="tel" value="${e(S.kurs.tel)}"></div><div class="alan"><label>Adres</label><input name="adres" value="${e(S.kurs.adres)}"></div>
      <div class="alan"><label>Kursiyer başı günlük direksiyon sınırı</label><input name="gds" type="number" min="1" max="4" value="${S.kurs.gunlukDersSiniri}"></div>
      <div class="alan"><label>Eğitmen başı günlük ders sınırı</label><input name="egs" type="number" min="1" max="12" value="${S.kurs.egitmenGunlukSinir}"></div>
      <div class="tam"><button class="dg dg-ana" type="submit">Değişiklikleri kaydet</button></div></form></div></div>`;
  if (durum.ayar === 'sinif') govde = `<div class="kart"><div class="tablo-kap"><table class="tablo"><thead><tr><th>Sınıf</th><th>Kurs ücreti (₺)</th><th>Teorik saat</th><th>Direksiyon dersi</th></tr></thead><tbody>${Object.entries(SINIFLAR).map(([k, v]) => `<tr><td><b style="color:var(--murekkep)">${v.ad}</b></td><td><input class="girdi" style="max-width:140px" data-ucret="${k}" inputmode="numeric" value="${v.ucret}"></td><td class="sayi">${v.teorik}</td><td class="sayi">${v.direksiyon}</td></tr>`).join('')}</tbody></table></div>
      <p style="font-size:12.5px;color:var(--soluk);padding:0 20px 18px">Ücretler il taban fiyatının altında olamaz. Ders saatlerini güncel mevzuata göre kurs müdürü belirler.</p></div>`;
  if (durum.ayar === 'asistan') govde = `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>Asistanın bildikleri</h3><small>Asistan sorulara yalnızca buradaki bilgilerle cevap verir</small></div><div class="kart-govde"><form id="f-asistan" class="form-izgara">
      ${[['Fiyat ve taksit', 'B manuel 24.000 TL, B otomatik 26.500 TL, A2 18.500 TL. Peşinat sonrası 5 aya kadar taksit. Öğrenciye 1.000 TL indirim.'], ['Evraklar', 'Sağlık raporu, öğrenim belgesi, biyometrik fotoğraf, kimlik. Fotoğrafı kursta çekiyoruz.'], ['Ders saatleri', 'Teorik dersler hafta içi 18:30. Direksiyon dersleri Pazartesi–Cumartesi 09:00–18:00.'], ['Süre', 'Teorik yaklaşık 4 hafta, ardından e-sınav ve direksiyon eğitimi; ortalama 2–3 ay.']].map(([t, v]) => `<div class="alan tam"><label>${t}</label><textarea>${v}</textarea></div>`).join('')}
      <div class="tam"><button class="dg dg-ana" type="submit">Kaydet</button></div></form></div></div>
      <div class="kart"><div class="kart-bas"><h3>Asistan ayarları</h3></div><div class="kart-govde">${[['WhatsApp’a cevap ver', true], ['Instagram mesajlarına cevap ver', true], ['Kayıt görüşmesi ayarla', true], ['Fiyat sorularına cevap ver', true], ['Bilmediği soruyu size devret', true]].map(([t, a]) => `<label class="evrak" style="cursor:pointer"><span style="flex:1;color:var(--murekkep)">${t}</span><span class="anahtar"><input type="checkbox" ${a ? 'checked' : ''}><i></i></span></label>`).join('')}</div></div></div>`;
  if (durum.ayar === 'kullanici') govde = `<div class="kart"><ul class="liste">${[['Kurs Müdürü', 'Yönetici', 'Her şeyi görür'], ['Sekreter', 'Ön büro', 'Kayıt, kasa, mesajlar'], ...S.egitmenler.map(x => [x.ad, 'Eğitmen', 'Kendi dersleri ve kursiyerleri'])].map(([a, r, y]) => `<li>${avatar(...a.split(' '))}<div><b style="color:var(--murekkep)">${e(a)}</b><small style="display:block;color:var(--soluk)">${y}</small></div><span class="sag">${rozet(r, r === 'Yönetici' ? 'sari' : 'notr')}</span></li>`).join('')}</ul><div style="padding:14px 20px;border-top:1px solid var(--cizgi-2)"><button class="dg dg-cizgi">${ik('arti')}Kullanıcı davet et</button></div></div>`;
  if (durum.ayar === 'aktarim') govde = `<div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Excel / CSV’den aktar</h3></div><div class="kart-govde">
        <p style="margin-bottom:12px">Kursiyer listenizi Excel’den CSV olarak kaydedin ve buraya bırakın. Sütunlar otomatik eşleşir: Ad, Soyad, Telefon, Sınıf.</p>
        <label class="yukle" style="position:relative">${isaret('zorunlu', 30)}<span style="flex:1"><b style="display:block;color:var(--murekkep)">CSV dosyası seç</b><small style="color:var(--soluk)">Örn. kursiyerler.csv</small></span><input type="file" accept=".csv,text/csv" data-csv-yukle></label>
        <div id="aktar-on" style="margin-top:14px"></div>
        <button class="dg dg-hafif dg-kucuk" data-ornek-csv style="margin-top:8px">${ik('indir')}Örnek CSV indir</button>
      </div></div>
      <div class="kart"><div class="kart-bas"><h3>Başka programdan geçiş</h3></div><div class="kart-govde">
        <ol style="margin-left:18px;display:grid;gap:10px">
          <li>Kullandığınız programdan (Akınsoft, Tabim ya da Excel) kursiyer, taksit ve araç listesini dışa aktarın.</li>
          <li>Dosyaları bize WhatsApp’tan gönderin; eşleştirmeyi ve kontrolü biz yapalım.</li>
          <li>Aynı gün Sinyal’de eski kayıtlarınızla çalışmaya başlayın. Eski program kapanana kadar ikisi yan yana kalabilir.</li>
        </ol>
        <div class="ipucu" style="margin-top:14px">${isaret('bilgi', 22)}<span>İlk aktarım ve kurulum ücretsizdir. Verileriniz sizindir; istediğiniz an Excel olarak geri alırsınız.</span></div>
      </div></div></div>`;
  if (durum.ayar === 'demo') govde = `<div class="kart"><div class="kart-govde"><b style="color:var(--murekkep)">Demo verisi</b><p style="margin:6px 0 14px;color:var(--soluk)">Bu demo örnek verilerle çalışır ve yaptığınız değişiklikler yalnızca bu tarayıcıda saklanır. Baştan başlamak için sıfırlayın.</p><button class="dg dg-koyu" data-sifirla>${ik('sifirla')}Demo verisini sıfırla</button></div></div>`;
  return {
    baslik: 'Ayarlar', alt: S.kurs.ad,
    html: `<div id="sek">${sekmeler([['kurs', 'Kurs bilgileri'], ['sinif', 'Sınıf ve ücretler'], ['asistan', 'Asistan'], ['kullanici', 'Kullanıcılar'], ['aktarim', 'Veri aktarımı'], ['demo', 'Demo']], durum.ayar)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const s = ev.target.closest('[data-sekme]'); if (s) { durum.ayar = s.dataset.sekme; yenile(); }
        if (ev.target.closest('[data-ornek-csv]')) csvIndir('ornek-kursiyerler.csv', [['Ad', 'Soyad', 'Telefon', 'Sınıf'], ['Ali', 'Yıldız', '0532 000 00 01', 'B'], ['Ayşe', 'Demir', '0533 000 00 02', 'B-O']]);
        const ak = ev.target.closest('[data-aktar]'); if (ak) { const l = JSON.parse(ak.dataset.aktar); l.forEach((r, i) => { const sn = SINIFLAR[r[3]] ? r[3] : 'B'; S.kursiyerler.push({ id: 'k' + Date.now() + i, ad: r[0], soyad: r[1], tel: r[2], dogum: '', sinif: sn, kayit: gun(0), egitmen: S.egitmenler.find(x => x.siniflar.includes(sn)).id, asama: 'Evrak', teorik: 0, direksiyon: 0, evrak: Object.fromEntries(EVRAKLAR.map(([x]) => [x, false])), mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: SINIFLAR[sn].ucret, pesin: 0, pesinTarih: gun(0), taksitler: [], senetli: false }, kaynak: 'Aktarım', yorum: null, notlar: [], deneme: [], acil: null }); }); kaydet(); bildir(l.length + ' kursiyer aktarıldı'); location.hash = '#/kursiyerler'; }
      });
      k.addEventListener('change', ev => {
        const f = ev.target.closest('[data-csv-yukle]'); if (!f || !f.files[0]) return;
        const r = new FileReader(); r.onload = () => {
          const satir = String(r.result).replace(/^\ufeff/, '').split(/\r?\n/).filter(x => x.trim()).map(x => x.split(/[;,]/).map(h => h.replace(/^"|"$/g, '').trim()));
          const veri = satir.slice(1).filter(x => x[0]);
          k.querySelector('#aktar-on').innerHTML = `<div class="tablo-kap"><table class="tablo"><thead><tr>${satir[0].slice(0, 4).map(h => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${veri.slice(0, 5).map(x => `<tr>${x.slice(0, 4).map(h => `<td>${e(h)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><button class="dg dg-ana" style="margin-top:12px" data-aktar='${e(JSON.stringify(veri.map(x => x.slice(0, 4))))}'>${veri.length} kursiyeri aktar</button>`;
        }; r.readAsText(f.files[0], 'utf-8');
      });
      k.addEventListener('change', ev => { const u = ev.target.closest('[data-ucret]'); if (u) { SINIFLAR[u.dataset.ucret].ucret = +u.value.replace(/\D/g, '') || SINIFLAR[u.dataset.ucret].ucret; bildir('Ücret güncellendi'); } });
      k.addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target;
        if (f.id === 'f-kurs') { Object.assign(S.kurs, { ad: f.ad.value, sehir: f.sehir.value, tel: f.tel.value, adres: f.adres.value, gunlukDersSiniri: +f.gds.value || 2, egitmenGunlukSinir: +f.egs.value || 8 }); kaydet(); document.querySelector('.logo small').textContent = S.kurs.ad; }
        bildir('Kaydedildi');
      });
    },
  };
}

function bugunMetni2() { const d = BUGUN; return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }); }
