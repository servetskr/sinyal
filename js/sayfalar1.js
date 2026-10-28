import { S, kaydet, gun, fark, iso, tarihOku, BUGUN, SINIFLAR, ASAMALAR, EVRAKLAR, KAYNAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, ekToplam, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle, risk, islem, geriAlNoktasi, oturum, tcGecerli, tcMaskele, ogretmen } from './veri.js';
import { e, tl, sayi, ik, rozet, asamaRozet, avatar, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, sekmeler, tarih, tarihUzun, goreli, gunKisa, cubukGrafik, halka, ayAdi, isaret, yonLevhasi, olcumler, aracGorsel, ekranNotu, bugunMetni, fotoKucult } from './ui.js';
import { yenile } from './app.js';

const aktifler = () => S.kursiyerler.filter(k => k.asama !== 'Ehliyet');
const buAyMi = s => { const d = tarihOku(s); return d.getMonth() === BUGUN.getMonth() && d.getFullYear() === BUGUN.getFullYear(); };
const gecenAyMi = s => { const d = tarihOku(s), g = new Date(BUGUN); g.setDate(1); g.setMonth(g.getMonth() - 1); return d.getMonth() === g.getMonth() && d.getFullYear() === g.getFullYear(); };
export const wpGonder = (k, metin, tur = 'Mesaj') => { gonderimEkle(typeof k === 'string' ? k : tamAd(k), metin, tur); bildir((typeof k === 'string' ? k : k.ad) + ' kişisine WhatsApp mesajı gönderildi', 'wp'); };

/* ================= GENEL BAKIŞ ================= */
export function genel() {
  const akt = aktifler();
  const bugunDers = S.dersler.filter(d => d.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  const tahsilBu = S.hareket.filter(h => h.tur === 'Gelir' && buAyMi(h.tarih)).reduce((a, h) => a + h.tutar, 0);
  const geciken = S.kursiyerler.filter(k => gecikenler(k).length);
  const gecikenTutar = geciken.reduce((a, k) => a + gecikenler(k).reduce((x, t) => x + t.tutar, 0), 0);
  const yeniAday = S.adaylar.filter(a => a.asama === 'Yeni');
  const evrakEksik = S.kursiyerler.filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet');
  const belgeBiten = S.araclar.filter(a => [a.sigorta, a.muayene].some(t => t && fark(t) <= 21));
  const haftaSinav = S.sinavlar.filter(s => fark(s.tarih) >= 0 && fark(s.tarih) <= 7);
  const asamaSay = ASAMALAR.map(a => S.kursiyerler.filter(k => k.asama === a && (a !== 'Ehliyet' || (k.dsinav && fark(k.dsinav.tarih) > -30))).length);
  const ortDers = S.kurs.ekDersUcreti;
  const kz = S.kazanim;

  const yapilacak = [
    yeniAday.length && ['bilgi', `${yeniAday.length} yeni öğrenci cevap bekliyor`, 'Asistan ilk cevabı verdi; kayıt görüşmesine çevirin.', '#/adaylar'],
    geciken.length && ['uyari', `${geciken.length} kursiyerin taksiti gecikti`, tl(gecikenTutar) + ' tahsil edilmedi.', '#/kasa/geciken'],
    evrakEksik.length && ['yasak', `${evrakEksik.length} kursiyerin evrakı eksik`, 'MEB kaydı bu evraklar tamamlanınca yapılabilir.', '#/meb'],
    ...belgeBiten.map(a => ['dur', `${a.plaka} · ${fark(a.sigorta) <= 21 ? 'sigorta' : 'muayene'} ${goreli(fark(a.sigorta) <= 21 ? a.sigorta : a.muayene)} bitiyor`, a.model, '#/filo']),
    ...haftaSinav.map(s => ['zorunlu', `${s.tur} · ${goreli(s.tarih)} ${s.saat}`, s.kursiyerler.length + ' kursiyer · ' + s.yer, '#/sinavlar']),
  ].filter(Boolean);

  const aracSerit = S.araclar.map(a => { const d = bugunDers.filter(x => x.arac === a.id), yp = d.filter(x => x.durum === 'Yapıldı').length, simdi = d.find(x => x.durum === 'Planlandı'); return `<a class="kart arac-kart" href="#/filo" style="padding:8px">${aracGorsel(a)}<div style="padding:2px 6px 4px"><b style="display:block;font-family:var(--baslik);font-size:15.5px;color:var(--murekkep)">${e(egitmen(a.egitmen).ad)}</b><span style="font-size:13.5px">${d.length ? `${yp}/${d.length} ders${simdi ? ' · sıradaki ' + simdi.saat : ' · bitti'}` : 'Bugün ders yok'}</span>${ilerleme(yp, Math.max(1, d.length), 'yesil')}</div></a>`; }).join('');

  const dersSatir = d => { const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac); return `<li>
      <span class="zaman">${d.saat}</span>
      <a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))}</b><small>${e(eg.ad)} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon}. ders</small></div></a>
      <span class="sag">${ar ? plaka(ar.plaka) : ''}${d.durum === 'Planlandı' ? rozet('Sırada', 'mavi') : rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : 'kirmizi')}</span></li>`; };

  const yolDurak = `<div class="yolculuk"><div class="yolculuk-serit"></div>${ASAMALAR.map((a, i) => `<a class="durak" href="#/kursiyerler/${encodeURIComponent(a)}" style="left:${i / (ASAMALAR.length - 1) * 100}%"><b>${asamaSay[i]}</b><span>${a}</span></a>`).join('')}</div>`;

  return {
    baslik: 'Genel bakış',
    html: `
    <div class="izgara iz-21">
      ${yonLevhasi([
        ['Kursiyerler', akt.length + '', '#/kursiyerler', S.kursiyerler.filter(k => buAyMi(k.kayit)).length + ' kişi bu ay kaydoldu'],
        ['Bugün direksiyon', bugunDers.length + ' ders', '#/plan', bugunDers.filter(d => d.durum === 'Yapıldı').length + ' tanesi bitti · ' + new Set(bugunDers.map(d => d.arac)).size + ' araç sahada'],
        ['Bu ay tahsilat', tl(tahsilBu), '#/kasa', 'Peşinat ve taksitler'],
        ['Geciken ödeme', `<span class="sari">${tl(gecikenTutar)}</span>`, '#/kasa/geciken', geciken.length + ' kursiyer · tek dokunuşla hatırlat'],
      ], S.kurs.ad + ' · ' + bugunMetni())}
      <div class="kart" style="display:flex;flex-direction:column">
        <div class="kart-bas"><h3>Sinyal bu ay ne kazandırdı?</h3></div>
        <ul class="liste" style="margin-top:6px;flex:1">
          <li>${isaret('tamam', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.doldurulan} boş saat dolduruldu</b><small style="color:var(--soluk)">İptal edilen dersler bekleme listesine teklif edildi · ders başı ${tl(ortDers)}</small></div><b class="sayi" style="color:var(--yesil);font-size:16px">+${tl(kz.doldurulan * ortDers)}</b></li>
          <li>${isaret('tamam', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.ekDers} ek ders satıldı</b><small style="color:var(--soluk)">Kalma riski olan kursiyerlere önerildi · ders başı ${tl(ortDers)}</small></div><b class="sayi" style="color:var(--yesil);font-size:16px">+${tl(kz.ekDers * ortDers)}</b></li>
          <li>${isaret('bilgi', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.yorum} yeni Google yorumu</b><small style="color:var(--soluk)">Ehliyet alanlara otomatik istendi</small></div><b class="sayi" style="color:var(--murekkep);font-size:16px">${S.kurs.puan.toLocaleString('tr-TR')} ★</b></li>
          <li>${isaret('bilgi', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${S.adaylar.filter(a => a.saat > '21:00' || a.saat < '08:30').length} gece mesajı cevaplandı</b><small style="color:var(--soluk)">Kurs kapalıyken asistan yanıtladı</small></div></li>
        </ul>
      </div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="bolum-bas"><div><h2>Bugün sahadaki araçlar</h2><p>Hangi araç kimde, kaç ders bitti.</p></div><div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/plan">Planı aç</a></div></div>
    <div class="arac-izgara">${aracSerit}</div>
    <div class="ara-bosluk"></div>
    <div class="izgara iz-21">
      <div class="kart">
        <div class="kart-bas"><h3>Bugünün direksiyon dersleri</h3><small>${bugunDers.filter(d => d.durum === 'Yapıldı').length}/${bugunDers.length} tamamlandı</small></div>
        <ul class="liste" style="margin-top:8px">${bugunDers.length ? bugunDers.slice(0, 8).map(dersSatir).join('') : '<li>' + bos('Bugün direksiyon dersi yok', 'Pazar günleri ders planlanmıyor.') + '</li>'}</ul>
        ${bugunDers.length > 8 ? `<div style="padding:8px 20px 16px"><a class="dg dg-hafif" href="#/plan">+${bugunDers.length - 8} ders daha → plan</a></div>` : ''}
      </div>
      <div class="kart">
        <div class="kart-bas"><h3>Dikkat edilecekler</h3><small>${yapilacak.length} iş</small></div>
        <ul class="liste" style="margin-top:8px">${yapilacak.map(([t, b, a, h]) => `<li>${isaret(t, 26)}<a href="${h}" style="min-width:0;flex:1"><b style="color:var(--murekkep);font-weight:700;display:block">${e(b)}</b><small style="color:var(--soluk);font-size:13px">${e(a)}</small></a></li>`).join('') || '<li>' + bos('Her şey yolunda', 'Bekleyen iş yok.') + '</li>'}</ul>
      </div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Kursiyerler hangi aşamada?</h3><small>Bir aşamaya dokunun, o kursiyerler açılsın</small></div><div class="kart-govde"><div class="yolculuk-kap">${yolDurak}</div></div></div>`,
  };
}

/* ================= ADAYLAR ================= */
const ADAY_ASAMA = [['Yeni', '#0a5bb0'], ['Bilgi verildi', '#b96206'], ['Görüşme', '#6744b8'], ['Kayıt', '#11804b'], ['Kaybedildi', '#868d97']];
export function adaylar(id) {
  const bu = S.adaylar.filter(a => fark(a.tarih) >= -7);
  const kayit = S.adaylar.filter(a => a.asama === 'Kayıt').length;
  const kapanan = S.adaylar.filter(a => ['Kayıt', 'Kaybedildi'].includes(a.asama)).length;
  const kaynak = KAYNAKLAR.map(k => [k, S.adaylar.filter(a => a.kaynak === k).length]).filter(x => x[1]);
  const kart = a => `<div class="aday-kart" data-aday="${a.id}" tabindex="0" role="button" aria-label="${e(a.ad)}">
      <div class="ust-satir">${avatar(...a.ad.split(' '))}<b>${e(a.ad)}</b><span class="kanal">${ik(a.kanal === 'Instagram' ? 'ig' : 'wp')}</span></div>
      <p>${e(a.mesajlar[a.mesajlar.length - 1].metin)}</p>
      <div class="alt-satir">${rozet(SINIFLAR[a.sinif].ad.split(' ·')[0] + ' sınıfı')}<span>${ik('harita').replace('class="ik ', 'style="width:13px;height:13px" class="ik ')} ${e(a.kaynak)}</span><span style="margin-left:auto">${goreli(a.tarih)} ${a.saat}</span></div>
      ${a.takip ? `<div class="alt-satir" style="color:${fark(a.takip) <= 0 ? 'var(--kirmizi)' : 'var(--levha)'}">${ik('saat')} Takip: ${goreli(a.takip)}</div>` : ''}
      ${a.not ? `<div class="alt-satir">${e(a.not)}</div>` : ''}
    </div>`;
  return {
    baslik: 'Yeni öğrenciler', alt: 'WhatsApp, Instagram ve Google Haritalar’dan gelen ön kayıtlar',
    html: `${ekranNotu('Kursu soran herkes burada. Asistan ilk cevabı verir; siz kartı açıp kayda çevirirsiniz.')}
    <div class="izgara iz-4">
      <div class="kart gosterge"><small>Son 7 günde gelen</small><b>${bu.length}</b><span>${bu.filter(a => fark(a.tarih) === 0).length} tanesi bugün</span></div>
      <div class="kart gosterge"><small>Kayda dönüşen</small><b>%${Math.round(kayit / Math.max(1, kapanan) * 100)}</b><span>${kayit} kayıt / ${kapanan} sonuçlanan</span></div>
      <div class="kart gosterge"><small>İlk cevap süresi</small><b>Anında</b><span>Asistan 7/24 cevaplıyor · gece gelen ${S.adaylar.filter(a => a.saat > '21:00' || a.saat < '08:30').length} mesaj</span></div>
      <div class="kart gosterge"><small>En çok aday getiren</small><b style="font-size:22px">${e(kaynak.sort((a, b) => b[1] - a[1])[0][0])}</b><span>${kaynak.map(([k, n]) => k + ' ' + n).join(' · ')}</span></div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="bolum-bas"><div><h2>Aday panosu</h2><p>Kartı açıp konuşmayı görün, aşamasını değiştirin ya da kursiyere çevirin.</p></div><div class="sag"><button class="dg dg-ana" data-yeni-aday>${ik('arti')}Aday ekle</button></div></div>
    <div class="pano">${ADAY_ASAMA.map(([a, renk]) => { const l = S.adaylar.filter(x => x.asama === a); return `<section class="pano-sutun" aria-label="${a}"><h3><i style="background:${renk}"></i>${a}<b>${l.length}</b></h3>${l.map(kart).join('') || '<p style="font-size:12.5px;color:var(--soluk);padding:6px">Bu aşamada aday yok.</p>'}</section>`; }).join('')}</div>`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const c = ev.target.closest('[data-aday]'); if (c) adayAc(c.dataset.aday);
        if (ev.target.closest('[data-yeni-aday]')) adayEkle();
      });
      k.addEventListener('keydown', ev => { const c = ev.target.closest('[data-aday]'); if (c && ev.key === 'Enter') adayAc(c.dataset.aday); });
      if (id) setTimeout(() => adayAc(id), 50);
    },
  };
}
function adayAc(id) {
  const a = S.adaylar.find(x => x.id === id); if (!a) return;
  pencere({
    baslik: a.ad, genis: true,
    icerik: `<div class="izgara" style="grid-template-columns:1.3fr 1fr;gap:20px" >
      <div class="kart" style="box-shadow:none;overflow:hidden"><div class="sohbet-pencere" style="min-height:340px">
        <div class="sohbet-ust">${ik(a.kanal === 'Instagram' ? 'ig' : 'wp')}<b style="color:var(--murekkep)">${e(a.kanal)}</b><small style="color:var(--soluk)">${e(a.tel)}</small></div>
        <div class="sohbet-akis">${a.mesajlar.map(m => `<div class="balon ${m.kim !== 'aday' ? 'giden' : ''}">${e(m.metin)}<small>${m.kim === 'asistan' ? ik('robot') + ' Asistan' : m.kim === 'kurs' ? 'Siz' : ''}</small></div>`).join('')}</div>
        <form class="sohbet-yaz" data-yaz><input class="girdi" name="m" placeholder="Mesaj yazın" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('gonder')}</button></form>
      </div></div>
      <div>
        <dl class="bilgi-tablo"><dt>Kaynak</dt><dd>${e(a.kaynak)}</dd><dt>Sınıf</dt><dd>${SINIFLAR[a.sinif].ad}</dd><dt>İlk mesaj</dt><dd>${goreli(a.tarih)} ${a.saat}</dd><dt>Telefon</dt><dd>${e(a.tel)}</dd></dl>
        <p class="et" style="margin:18px 0 8px">Aşama</p>
        <div class="secim">${ADAY_ASAMA.map(([x]) => `<label><input type="radio" name="asama" value="${x}" ${x === a.asama ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div>
        <div class="alan" style="margin-top:16px"><label for="a-takip">Takip tarihi</label><input id="a-takip" type="date" value="${a.takip || ''}"></div>
        <div class="alan" style="margin-top:12px"><label for="a-not">Not</label><textarea id="a-not" placeholder="Örn. hafta sonu ders istiyor">${e(a.not)}</textarea></div>
      </div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-donustur ${a.asama === 'Kaybedildi' ? 'disabled' : ''}>${ik('kursiyer')}Kursiyere çevir</button>`,
    onAc(d) {
      const kaydetAday = () => { a.asama = d.querySelector('[name=asama]:checked').value; a.takip = d.querySelector('#a-takip').value || null; a.not = d.querySelector('#a-not').value; kaydet(); };
      d.addEventListener('change', () => { kaydetAday(); yenile(); });
      d.querySelector('[data-yaz]').addEventListener('submit', ev => {
        ev.preventDefault(); const m = ev.target.m.value.trim(); if (!m) return;
        a.mesajlar.push({ kim: 'kurs', metin: m }); kaydet(); wpGonder(a.ad, m);
        const ak = d.querySelector('.sohbet-akis'); ak.insertAdjacentHTML('beforeend', `<div class="balon giden">${e(m)}<small>Siz</small></div>`); ak.scrollTop = 1e5; ev.target.reset();
      });
      d.querySelector('[data-donustur]').addEventListener('click', () => { kaydetAday(); kursiyerFormu({ ad: a.ad.split(' ')[0], soyad: a.ad.split(' ').slice(1).join(' '), tel: a.tel, sinif: a.sinif, kaynak: a.kaynak, adayId: a.id }); });
    },
  });
}
function adayEkle() {
  pencere({
    baslik: 'Aday ekle',
    icerik: `<form class="form-izgara" id="f-aday"><div class="alan"><label>Ad soyad</label><input name="ad" required></div><div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" required placeholder="05xx xxx xx xx"></div>
      <div class="alan"><label>Sınıf</label><select name="sinif">${Object.entries(SINIFLAR).map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select></div>
      <div class="alan"><label>Nereden geldi?</label><select name="kaynak">${KAYNAKLAR.map(k => `<option>${k}</option>`).join('')}</select></div>
      <div class="alan tam"><label>Ne sordu?</label><textarea name="m" placeholder="Örn. hafta sonu ders var mı?"></textarea></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" form="f-aday" type="submit">Adayı ekle</button>`,
    onAc(d) {
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target;
        if (!f.ad.value.trim() || !f.tel.value.trim()) return bildir('Ad ve telefon gerekli', 'uyari');
        S.adaylar.unshift({ id: 'l' + Date.now(), ad: f.ad.value.trim(), tel: f.tel.value.trim(), kaynak: f.kaynak.value, kanal: 'WhatsApp', sinif: f.sinif.value, asama: 'Yeni', tarih: gun(0), saat: new Date().toTimeString().slice(0, 5), takip: null, not: '', mesajlar: [{ kim: 'aday', metin: f.m.value.trim() || 'Bilgi almak istiyorum.' }] });
        kaydet(); kapatPencere(); bildir('Aday eklendi'); yenile();
      });
    },
  });
}

/* ================= KURSİYERLER ================= */
export function kursiyerFormu(on = {}) {
  pencere({
    baslik: 'Yeni kursiyer',
    icerik: `<form class="form-izgara" id="f-kursiyer">
      <div class="alan"><label for="k-ad">Ad</label><input id="k-ad" name="ad" value="${e(on.ad || '')}" required autocomplete="off"></div>
      <div class="alan"><label for="k-soyad">Soyad</label><input id="k-soyad" name="soyad" value="${e(on.soyad || '')}" required autocomplete="off"></div>
      <div class="alan"><label for="k-tel">Telefon</label><input id="k-tel" name="tel" inputmode="tel" value="${e(on.tel || '')}" placeholder="05xx xxx xx xx" required></div>
      <div class="alan"><label for="k-tc">TC kimlik no</label><input id="k-tc" name="tc" inputmode="numeric" maxlength="11" value="${e(on.tc || '')}" required autocomplete="off"><small class="tc-not" style="color:var(--soluk)">MEB kaydı için gerekli</small></div>
      <div class="alan"><label for="k-dogum">Doğum tarihi</label><input id="k-dogum" name="dogumTarihi" type="date" value="${e(on.dogumTarihi || '')}"></div>
      <div class="alan"><label for="k-ogrenim">Öğrenim durumu</label><select id="k-ogrenim" name="ogrenim">${['İlkokul', 'Ortaokul', 'Lise', 'Önlisans', 'Lisans', 'Yüksek lisans'].map(x => `<option ${x === 'Lise' ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="alan"><label for="k-mevcut">Mevcut ehliyeti</label><select id="k-mevcut" name="mevcut"><option value="">Yok</option><option>B</option><option>A2</option><option>A</option><option>C</option></select></div>
      <div class="alan tam"><label for="k-adres">Adres</label><input id="k-adres" name="adres" value="${e(on.adres || '')}" placeholder="Mahalle, ilçe" autocomplete="street-address"></div>
      <div class="alan"><label for="k-kaynak">Nereden geldi?</label><select id="k-kaynak" name="kaynak">${KAYNAKLAR.map(k => `<option ${k === on.kaynak ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <div class="alan tam"><span class="et">Sınıf</span><div class="secim">${Object.entries(SINIFLAR).map(([k, v], i) => `<label><input type="radio" name="sinif" value="${k}" ${(on.sinif ? k === on.sinif : i === 0) ? 'checked' : ''}><span>${v.ad} · ${tl(v.ucret)}</span></label>`).join('')}</div></div>
      <div class="alan"><label for="k-egitmen">Usta öğretici</label><select id="k-egitmen" name="egitmen"></select></div>
      <div class="alan"><label for="k-pesin">Peşinat</label><input id="k-pesin" name="pesin" inputmode="numeric" value="8000"></div>
      <div class="alan"><label for="k-taksit">Taksit sayısı</label><select id="k-taksit" name="taksit">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === 4 ? 'selected' : ''}>${n ? n + ' taksit' : 'Peşin'}</option>`).join('')}</select></div>
      <div class="alan"><span class="et">Ödeme planı</span><div id="k-plan" class="ipucu" style="min-height:40px"></div></div>
      <div class="alan tam"><span class="et">Teslim alınan evraklar</span><div class="secim">${EVRAKLAR.map(([k, t]) => `<label><input type="checkbox" name="ev-${k}"><span>${t}</span></label>`).join('')}</div></div>
    </form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-kursiyer">Kaydı oluştur</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      const guncelle = () => {
        const s = f.sinif.value, eg = S.egitmenler.filter(x => x.siniflar.includes(s));
        const onceki = f.egitmen.value;
        f.egitmen.innerHTML = eg.map(x => `<option value="${x.id}" ${x.id === onceki ? 'selected' : ''}>${x.ad}</option>`).join('');
        const u = SINIFLAR[s].ucret, p = Math.min(u, +f.pesin.value.replace(/\D/g, '') || 0), n = +f.taksit.value;
        d.querySelector('#k-plan').innerHTML = n ? `${tl(p)} peşin + ${n} × ${tl((u - p) / n)}` : `${tl(u)} peşin`;
      };
      f.addEventListener('input', guncelle); guncelle();
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        if (!f.ad.value.trim() || !f.soyad.value.trim() || f.tel.value.replace(/\D/g, '').length < 10) return bildir('Ad, soyad ve geçerli bir telefon gerekli', 'uyari');
        if (!tcGecerli(f.tc.value.trim())) { f.tc.focus(); f.querySelector('.tc-not').textContent = 'Bu TC kimlik numarası geçerli değil'; f.querySelector('.tc-not').style.color = 'var(--kirmizi)'; return bildir('TC kimlik numarası geçerli değil', 'uyari'); }
        const s = f.sinif.value, u = SINIFLAR[s].ucret, n = +f.taksit.value;
        const p = n ? Math.min(u, +f.pesin.value.replace(/\D/g, '') || 0) : u;
        const taksitler = [];
        for (let i = 0; i < n; i++) { const v = new Date(BUGUN); v.setMonth(v.getMonth() + i + 1); const t = Math.round((u - p) / n / 50) * 50; taksitler.push({ vade: iso(v), tutar: i === n - 1 ? (u - p) - t * (n - 1) : t, odendi: null, yontem: null }); }
        const ev2 = {}; EVRAKLAR.forEach(([k]) => ev2[k] = f['ev-' + k].checked);
        const yeni = { id: 'k' + Date.now(), ad: f.ad.value.trim(), soyad: f.soyad.value.trim(), tel: f.tel.value.trim(), tc: f.tc.value.trim(), dogumTarihi: f.dogumTarihi.value, ogrenim: f.ogrenim.value, adres: f.adres.value.trim(), mevcutEhliyet: f.mevcut.value, deneme: [], acil: null, teorikGrup: 'aksam', dogum: (f.dogumTarihi.value || '').slice(0, 4), sinif: s, kayit: gun(0), egitmen: f.egitmen.value, asama: Object.values(ev2).every(Boolean) ? 'Teorik' : 'Evrak', teorik: 0, direksiyon: 0, evrak: ev2, mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: u, pesin: p, pesinTarih: gun(0), taksitler }, kaynak: f.kaynak.value, yorum: null, notlar: [] };
        S.kursiyerler.unshift(yeni); islem('Kursiyer kaydetti', tamAd(yeni) + ' · ' + SINIFLAR[s].ad);
        if (p) S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Kurs ücreti', aciklama: tamAd(yeni) + ' · peşinat', tutar: p, yontem: 'Kart', kursiyer: yeni.id });
        if (on.adayId) { const a = S.adaylar.find(x => x.id === on.adayId); if (a) a.asama = 'Kayıt'; }
        kaydet(); kapatPencere();
        gonderimEkle(tamAd(yeni), 'Hoş geldin mesajı ve ödeme planı', 'Otomatik');
        bildir('Kayıt oluşturuldu, hoş geldin mesajı gönderildi', 'wp');
        location.hash = '#/kursiyer/' + yeni.id;
      });
    },
  });
}

export function kursiyerler(filtre) {
  let sekme = filtre && ASAMALAR.includes(filtre) ? filtre : 'Tümü', q = '', sinif = '', borclu = false;
  const say = a => a === 'Tümü' ? S.kursiyerler.length : S.kursiyerler.filter(k => k.asama === a).length;
  function satirlar() {
    let l = S.kursiyerler.filter(k => (sekme === 'Tümü' || k.asama === sekme) && (!sinif || k.sinif === sinif) && (!borclu || gecikenler(k).length));
    if (q) { const s = q.toLocaleLowerCase('tr'); l = l.filter(k => (tamAd(k) + ' ' + k.tel).toLocaleLowerCase('tr').includes(s)); }
    if (!l.length) return `<tr><td colspan="7">${bos('Bu filtreye uyan kursiyer yok', 'Filtreyi değiştirin ya da yeni kursiyer ekleyin.')}</td></tr>`;
    return l.map(k => {
      const g = gecikenler(k), sd = sonrakiDers(k), S0 = SINIFLAR[k.sinif];
      return `<tr class="tik" data-git="${k.id}" tabindex="0">
        <td class="m-tam"><div class="kisi">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${e(k.tel)}</small></div></div></td>
        <td class="m-gizle">${rozet(S0.ad.split(' ·')[0])} <small style="color:var(--soluk)">${S0.ad.split('· ')[1]}</small></td>
        <td style="min-width:150px">${yol(asamaNo(k))}<small style="color:var(--soluk);font-size:12px">${k.asama}${k.dsinav && k.dsinav.sonuc === 'Kaldı' ? ' · tekrar' : ''}</small></td>
        <td class="m-gizle" style="min-width:110px"><span class="sayi" style="font-size:12.5px">${k.direksiyon}/${S0.direksiyon}</span>${ilerleme(k.direksiyon, S0.direksiyon, k.direksiyon >= S0.direksiyon ? 'yesil' : '')}</td>
        <td>${kalanBorc(k) ? `<span class="sayi">${tl(kalanBorc(k))}</span>${g.length ? '<br>' + rozet(g.length + ' taksit gecikti', 'kirmizi') : ''}` : rozet('Ödendi', 'yesil')}</td>
        <td class="m-gizle">${(() => { const r = risk(k); if (!r) return '<span style="color:var(--soluk)">—</span>'; const renk = r.puan >= 50 ? 'var(--kirmizi)' : r.puan >= 25 ? 'var(--sari)' : 'var(--yesil)'; return `<span class="risk-cubuk" title="${e(r.nedenler.join(', ') || 'Risk yok')}"><i style="width:${Math.max(6, r.puan)}%;background:${renk}"></i></span> <small style="color:var(--soluk)">${r.puan >= 50 ? 'Yüksek' : r.puan >= 25 ? 'Orta' : 'Düşük'}</small>`; })()}</td>
        <td class="m-gizle">${sd ? goreli(sd.tarih) + ' <span class="mono">' + sd.saat + '</span>' : '<span style="color:var(--soluk)">—</span>'}</td>
      </tr>`;
    }).join('');
  }
  return {
    baslik: 'Kursiyerler', alt: S.kursiyerler.length + ' kayıt · ' + aktifler().length + ' aktif',
    html: `${ekranNotu('Her kursiyerin nerede olduğu, ne kadar borcu kaldığı ve sınavda kalma riski tek satırda. Satıra dokunun, dosyası açılsın.')}
    <div class="bolum-bas"><div><h2>Kursiyer listesi</h2></div><div class="sag"><button class="dg dg-cizgi" data-disa>${ik('indir')}Excel’e aktar</button><button class="dg dg-ana" data-yeni>${ik('arti')}Yeni kursiyer</button></div></div>
    <div id="sek">${sekmeler([['Tümü', 'Tümü', say('Tümü')], ...ASAMALAR.map(a => [a, a, say(a)])], sekme)}</div>
    <div class="kart">
      <div class="filtre">
        <div class="ara-kutu">${ik('ara')}<input class="girdi" type="search" placeholder="Ad ya da telefon" data-q aria-label="Kursiyer ara"></div>
        <select class="girdi" data-sinif aria-label="Sınıf"><option value="">Tüm sınıflar</option>${Object.entries(SINIFLAR).map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select>
        <button class="cip" data-borclu>${ik('uyari')}&nbsp;Taksiti gecikenler</button>
      </div>
      <div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Sınıf</th><th>Aşama</th><th>Direksiyon</th><th>Kalan ödeme</th><th>Sınav riski</th><th>Sonraki ders</th></tr></thead><tbody id="tb">${satirlar()}</tbody></table></div>
    </div>`,
    baglan(k) {
      const tb = k.querySelector('#tb'), ciz = () => tb.innerHTML = satirlar();
      k.addEventListener('click', ev => {
        const s = ev.target.closest('[data-sekme]'); if (s) { sekme = s.dataset.sekme; k.querySelector('#sek').innerHTML = sekmeler([['Tümü', 'Tümü', say('Tümü')], ...ASAMALAR.map(a => [a, a, say(a)])], sekme); ciz(); }
        const g = ev.target.closest('[data-git]'); if (g) location.hash = '#/kursiyer/' + g.dataset.git;
        if (ev.target.closest('[data-yeni]')) kursiyerFormu();
        const b = ev.target.closest('[data-borclu]'); if (b) { borclu = !borclu; b.classList.toggle('secili', borclu); ciz(); }
        if (ev.target.closest('[data-disa]')) import('./ui.js').then(u => { u.csvIndir('kursiyerler.csv', [['Ad', 'Soyad', 'Telefon', 'Sınıf', 'Aşama', 'Kayıt', 'Direksiyon', 'Toplam', 'Ödenen', 'Kalan'], ...S.kursiyerler.map(x => [x.ad, x.soyad, x.tel, SINIFLAR[x.sinif].ad, x.asama, x.kayit, x.direksiyon, x.odeme.toplam, odenen(x), kalanBorc(x)])]); bildir('Kursiyer listesi indirildi'); });
      });
      k.addEventListener('keydown', ev => { const g = ev.target.closest('[data-git]'); if (g && ev.key === 'Enter') location.hash = '#/kursiyer/' + g.dataset.git; });
      k.querySelector('[data-q]').addEventListener('input', ev => { q = ev.target.value; ciz(); });
      k.querySelector('[data-sinif]').addEventListener('change', ev => { sinif = ev.target.value; ciz(); });
    },
  };
}

/* ================= KURSİYER DOSYASI ================= */
let profilSekme = 'genel';
export function kursiyerDetay(id) {
  const k = kursiyer(id);
  if (!k) return { baslik: 'Kursiyer bulunamadı', html: `<div class="kart">${bos('Bu kursiyer bulunamadı', 'Silinmiş ya da demo verisi sıfırlanmış olabilir.', '<a class="dg dg-koyu" href="#/kursiyerler">Kursiyerlere dön</a>')}</div>` };
  const S0 = SINIFLAR[k.sinif], eg = egitmen(k.egitmen);
  const dersler = S.dersler.filter(d => d.kursiyer === k.id).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const sinavlar = S.sinavlar.filter(s => s.kursiyerler.includes(k.id)).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const mesajlar = S.gonderimler.filter(g => g.kime === tamAd(k));
  const eksik = eksikEvrak(k);
  const sekmeHtml = () => sekmeler([['genel', 'Genel'], ['dersler', 'Dersler', dersler.length], ['odeme', 'Ödemeler'], ['sinav', 'Sınavlar', sinavlar.length], ['mesaj', 'Mesajlar']], profilSekme, 'psekme');
  const govde = () => {
    if (profilSekme === 'genel') { const ar = S.araclar.find(a => a.egitmen === k.egitmen && (a.sinif === k.sinif || eg.siniflar.length === 1)) || S.araclar.find(a => a.sinif === k.sinif); const r = risk(k); return `<div class="izgara iz-3">
      <div class="kart" style="padding:10px">${ar ? aracGorsel(ar) : ''}<div style="padding:10px 6px 4px"><b style="display:block;font-family:var(--baslik);font-size:17px;color:var(--murekkep)">${ar ? e(ar.model) : ''} · ${e(eg.ad)}</b><span style="font-size:14px">Dersler bu araçla ve bu usta öğreticiyle yapılıyor.</span></div></div>
      <div class="kart"><div class="kart-bas"><h3>Sınav riski</h3></div><div class="kart-govde">${r ? `<div style="display:flex;align-items:center;gap:14px">${isaret(r.puan >= 50 ? 'uyari' : r.puan >= 25 ? 'bilgi' : 'tamam', 44)}<div><b style="display:block;font-family:var(--baslik);font-size:24px;color:var(--murekkep)">${r.puan >= 50 ? 'Yüksek' : r.puan >= 25 ? 'Orta' : 'Düşük'} risk</b><span style="font-size:14px">${r.ort != null ? 'Deneme ortalaması ' + r.ort : 'Henüz deneme sınavı yok'}</span></div></div>${r.nedenler.length ? `<ul style="margin:12px 0 0 18px;font-size:14px">${r.nedenler.map(n => `<li>${e(n)}</li>`).join('')}</ul>` : ''}${r.puan >= 25 ? `<button class="dg dg-ana dg-kucuk" style="margin-top:14px" data-ekders>Ek ders öner</button>` : ''}` : `<p style="font-size:14px">${k.asama === 'Ehliyet' ? 'Ehliyetini aldı.' : 'Teorik derslere başlayınca hesaplanır.'}</p>`}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Belgeler</h3></div><div class="kart-govde" style="display:grid;gap:8px">${[['sozlesme', 'Sözleşme'], ['bilgi', 'Bilgi formu'], ['takip', 'Direksiyon takip formu'], ['makbuz', 'Son makbuz']].concat(k.odeme.senetli ? [['senet', 'Senet']] : []).map(([t, a]) => `<button class="dg dg-cizgi dg-kucuk" style="justify-content:flex-start" data-belge="${t}">${ik('belge')}${a}</button>`).join('')}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Bilgiler</h3></div><div class="kart-govde"><dl class="bilgi-tablo">
        <dt>Sınıf</dt><dd>${S0.ad}</dd><dt>Kayıt</dt><dd>${tarih(k.kayit)} · ${e(k.kaynak)}</dd><dt>Usta öğretici</dt><dd>${e(eg.ad)}</dd><dt>Telefon</dt><dd>${e(k.tel)}</dd><dt>TC kimlik</dt><dd><span class="mono" data-tc-alan>${tcMaskele(k.tc)}</span> ${oturum.kullanici && oturum.kullanici.rol === 'mudur' && k.tc ? '<button class="dg dg-hafif dg-kucuk" data-tc-goster>Göster</button>' : ''}</dd><dt>Doğum tarihi</dt><dd>${k.dogumTarihi ? tarih(k.dogumTarihi) + ' ' + k.dogumTarihi.slice(0, 4) : e(k.dogum || '—')}</dd><dt>Öğrenim</dt><dd>${e(k.ogrenim || '—')}</dd><dt>Adres</dt><dd>${e(k.adres || '—')}</dd>${k.mevcutEhliyet ? `<dt>Mevcut ehliyet</dt><dd>${e(k.mevcutEhliyet)} · ${rozet('Sınıf geçişi', 'mavi')}</dd>` : ''}${k.acil && k.acil.ad ? `<dt>Acil durumda</dt><dd>${e(k.acil.ad)}${k.acil.yakinlik ? ' (' + e(k.acil.yakinlik) + ')' : ''} · ${e(k.acil.tel)}</dd>` : ''}
        <dt>MEB kaydı</dt><dd>${k.mebIslendi ? rozet('MEBBİS’e girildi', 'yesil') : rozet('Bekliyor', 'uyari')}</dd>
        <dt>Teorik</dt><dd><span class="sayi">${k.teorik}/${S0.teorik} saat</span>${ilerleme(k.teorik, S0.teorik)}</dd>
        <dt>Direksiyon</dt><dd><span class="sayi">${k.direksiyon}/${S0.direksiyon} ders</span>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</dd>
      </dl></div></div>
      <div class="kart"><div class="kart-bas"><h3>Evraklar</h3><small>${EVRAKLAR.length - eksik.length}/${EVRAKLAR.length}</small>${eksik.length ? `<div class="sag"><button class="dg dg-wp dg-kucuk" data-evrak-hatirlat>${ik('wp')}Hatırlat</button></div>` : ''}</div><div class="kart-govde">
        ${EVRAKLAR.map(([key, t]) => `<label class="evrak"><span class="durum ${k.evrak[key] ? 'var' : 'yok'}">${ik(k.evrak[key] ? 'tik' : 'kapat')}</span><span style="flex:1;color:var(--murekkep)">${t}</span>${(k.evrakFoto || {})[key] ? `<img src="${k.evrakFoto[key]}" alt="${t} fotoğrafı" data-foto-buyut="${key}" style="width:34px;height:34px;object-fit:cover;border-radius:4px;border:1px solid var(--cizgi);cursor:zoom-in">` : `<span class="dg dg-hafif dg-kucuk" style="position:relative;overflow:hidden">Fotoğraf<input type="file" accept="image/*" data-foto-yukle="${key}" style="position:absolute;inset:0;opacity:0;cursor:pointer"></span>`}<span class="anahtar"><input type="checkbox" data-evrak="${key}" ${k.evrak[key] ? 'checked' : ''} aria-label="${t} teslim alındı"><i></i></span></label>`).join('')}
      </div></div>
      <div class="kart"><div class="kart-bas"><h3>Notlar</h3></div><div class="kart-govde">
        <ul class="zaman-cizgisi">${k.notlar.map(n => `<li>${e(n.metin)}<small>${goreli(n.tarih)}</small></li>`).join('') || '<li style="color:var(--soluk)">Henüz not yok.<small>Usta öğretici notları ve görüşmeler burada birikir.</small></li>'}</ul>
        <form data-not style="display:flex;gap:8px;margin-top:10px"><input class="girdi" name="n" placeholder="Not ekleyin" aria-label="Not"><button class="dg dg-koyu" type="submit">Ekle</button></form>
      </div></div></div>`; }
    if (profilSekme === 'dersler') return `<div class="kart"><div class="kart-bas"><h3>Direksiyon dersleri</h3><small>${k.direksiyon} yapıldı · ${dersler.filter(d => d.durum === 'Planlandı').length} planlı</small><div class="sag"><a class="dg dg-ana dg-kucuk" href="#/plan">${ik('arti')}Ders planla</a></div></div>
      <ul class="liste" style="margin-top:8px">${dersler.map(d => `<li><span class="zaman">${d.saat}</span><div><b style="color:var(--murekkep)">${tarihUzun(d.tarih)}</b><small style="display:block;color:var(--soluk)">${e(egitmen(d.egitmen).ad)}</small></div><span class="sag">${d.arac ? plaka(arac(d.arac).plaka) : ''}${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</span></li>`).join('') || '<li>' + bos('Henüz direksiyon dersi yok', 'Teorik dersler ve e-sınav bittikten sonra planlanır.') + '</li>'}</ul></div>`;
    if (profilSekme === 'odeme') return `<div class="izgara iz-12">
      <div><div class="kart gosterge"><small>Kurs ücreti${ekToplam(k) ? ' + ek kalemler' : ''}</small><b>${tl(k.odeme.toplam + ekToplam(k))}</b><span>Ödenen ${tl(odenen(k))}${k.odeme.iade ? ' · iade ' + tl(k.odeme.iade) : ''}</span>${ilerleme(odenen(k), k.odeme.toplam + ekToplam(k), 'yesil')}<span style="margin-top:8px">Kalan <b style="font-size:15px;font-family:var(--mono)">${tl(kalanBorc(k))}</b></span></div>
        <div style="display:grid;gap:8px;margin-top:12px">${[['indirim', 'İndirim uygula'], ['plan', 'Planı yeniden böl'], ['ek', 'Ek kalem ekle'], ['iade', 'İade yap']].map(([t, a]) => `<button class="dg dg-cizgi dg-kucuk" style="justify-content:flex-start" data-odeme-islem="${t}">${a}</button>`).join('')}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Ödeme planı</h3>${k.odeme.senetli ? rozet('Senetli', 'mor') : ''}<div class="sag">${kalanBorc(k) ? `<button class="dg dg-cizgi dg-kucuk" data-link>${ik('kart')}Ödeme linki gönder</button>` : ''}</div></div><div class="kart-govde">
        <div class="taksit-sira"><span class="no">P</span><div><b style="color:var(--murekkep)">Peşinat</b><small style="display:block;color:var(--soluk)">${tarih(k.odeme.pesinTarih)}</small></div><span class="sayi">${tl(k.odeme.pesin)}</span>${rozet('Ödendi', 'yesil')}</div>
        ${k.odeme.taksitler.map((t, i) => `<div class="taksit-sira"><span class="no">${i + 1}</span><div><b style="color:var(--murekkep)">${i + 1}. taksit</b><small style="display:block;color:var(--soluk)">Vade ${tarih(t.vade)}${t.odendi ? ' · ödendi ' + tarih(t.odendi) + ' · ' + t.yontem : ''}</small></div><span class="sayi">${tl(t.tutar)}</span>${t.odendi ? rozet('Ödendi', 'yesil') : `<button class="dg ${fark(t.vade) < 0 ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" data-tahsil="${i}">${t.kismi ? tl(t.tutar - t.kismi) + ' kaldı · ' : ''}${fark(t.vade) < 0 ? 'Gecikti · tahsil et' : 'Tahsil et'}</button>`}</div>`).join('')}
        ${(k.odeme.ekler || []).map((x, j) => `<div class="taksit-sira"><span class="no">+</span><div><b style="color:var(--murekkep)">${e(x.ad)}</b><small style="display:block;color:var(--soluk)">Ek kalem${x.odendi ? ' · ödendi ' + tarih(x.odendi) : ''}</small></div><span class="sayi">${tl(x.tutar)}</span>${x.odendi ? rozet('Ödendi', 'yesil') : `<button class="dg dg-cizgi dg-kucuk" data-ek-tahsil="${j}">Tahsil et</button>`}</div>`).join('')}
      </div></div></div>`;
    if (profilSekme === 'sinav') return `<div class="izgara iz-2">${[['e-Sınav', k.esinav], ['Direksiyon sınavı', k.dsinav]].map(([t, s]) => `<div class="kart gosterge"><small>${t}</small><b>${s ? s.sonuc : '—'}</b><span>${s ? (s.puan ? s.puan + ' puan · ' : '') + s.hak + '. hak' : (t === 'e-Sınav' ? (k.teorik >= S0.teorik - 4 ? 'Sınava hazır' : 'Teorik dersler sürüyor') : k.dsinavPlan ? 'Sınav ' + goreli(k.dsinavPlan) : 'Direksiyon dersleri sürüyor')}</span></div>`).join('')}</div>
      <div class="ara-bosluk"></div><div class="kart"><div class="kart-bas"><h3>Sınav oturumları</h3></div><ul class="liste" style="margin-top:8px">${sinavlar.map(s => `<li><span class="oto-ik">${ik(s.tur === 'e-Sınav' ? 'teorik' : 'direksiyon')}</span><div><b style="color:var(--murekkep)">${s.tur} · ${tarihUzun(s.tarih)} ${s.saat}</b><small style="display:block;color:var(--soluk)">${e(s.yer)}</small></div><span class="sag">${s.sonuc[k.id] ? rozet(s.sonuc[k.id], s.sonuc[k.id] === 'Geçti' ? 'yesil' : 'kirmizi') : rozet(goreli(s.tarih), 'mavi')}</span></li>`).join('') || '<li>' + bos('Henüz sınava atanmadı', 'Sınavlar sayfasından oturuma ekleyebilirsiniz.') + '</li>'}</ul></div>`;
    return `<div class="kart"><div class="kart-bas"><h3>WhatsApp geçmişi</h3><small>Otomatik hatırlatmalar ve gönderdiğiniz mesajlar</small></div><div class="kart-govde">
      <ul class="zaman-cizgisi">${mesajlar.map(m => `<li>${e(m.metin)}<small>${e(m.tur)} · ${new Date(m.zaman).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</small></li>`).join('')}
      <li>Direksiyon dersi hatırlatması<small>Otomatik · dün 18:00</small></li><li>Hoş geldin mesajı ve ödeme planı<small>Otomatik · ${tarih(k.kayit)}</small></li></ul>
      <form data-mesaj style="display:flex;gap:8px;margin-top:12px"><input class="girdi" name="m" placeholder="${e(k.ad)} kişisine mesaj yazın" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('wp')}Gönder</button></form></div></div>`;
  };
  return {
    baslik: tamAd(k), alt: 'Kursiyer dosyası',
    html: `<a class="dg dg-hafif" href="#/kursiyerler" style="margin:-6px 0 10px -8px">${ik('sol')}Kursiyerler</a>
    <div class="kart">
      <div class="profil-bas"><div><span class="profil-no">No ${k.id.slice(1, 5)}</span><h2 style="margin-top:6px">${e(tamAd(k))}</h2><div class="meta"><span>${asamaRozet(k.asama)}</span><span>${ik('direksiyon')}${S0.ad}</span><span>${ik('tel')}${e(k.tel)}</span><span>${ik('kursiyer')}${e(eg.ad)}</span></div></div>
        <div class="sag"><button class="dg dg-wp" data-wp>${ik('wp')}WhatsApp</button><button class="dg dg-cizgi" data-ileri ${k.asama === 'Ehliyet' ? 'disabled' : ''}>${ik('ok')}Sonraki aşamaya geçir</button></div></div>
      ${yol(asamaNo(k), true)}
      <div style="height:18px"></div>
    </div>
    <div class="ara-bosluk"></div>
    <div id="ps">${sekmeHtml()}</div><div id="pg">${govde()}</div>`,
    baglan(kap) {
      const ciz = () => { kap.querySelector('#ps').innerHTML = sekmeHtml(); kap.querySelector('#pg').innerHTML = govde(); };
      kap.addEventListener('click', ev => {
        const s = ev.target.closest('[data-psekme]'); if (s) { profilSekme = s.dataset.psekme; ciz(); }
        if (ev.target.closest('[data-wp]')) { profilSekme = 'mesaj'; ciz(); kap.querySelector('[data-mesaj] input').focus(); }
        if (ev.target.closest('[data-ileri]')) { const i = asamaNo(k); if (i < ASAMALAR.length - 1) { geriAlNoktasi(); k.asama = ASAMALAR[i + 1]; islem('Aşama değiştirdi', tamAd(k) + ' → ' + k.asama); kaydet(); bildir(tamAd(k) + ' → ' + k.asama, 'tamam', true); yenile(); } }
        if (ev.target.closest('[data-evrak-hatirlat]')) wpGonder(k, `Merhaba ${k.ad}, kaydını tamamlamak için ${eksikEvrak(k).map(x => x[1].toLowerCase()).join(', ')} eksik.`, 'Evrak hatırlatması');
        if (ev.target.closest('[data-link]')) wpGonder(k, `Merhaba ${k.ad}, kalan ${tl(kalanBorc(k))} için kartla ödeme linkin: odeme.ornek/${k.id}`, 'Ödeme linki');
        const t = ev.target.closest('[data-tahsil]'); if (t) tahsilAl(k, +t.dataset.tahsil);
        if (ev.target.closest('[data-tc-goster]')) { kap.querySelector('[data-tc-alan]').textContent = k.tc; ev.target.closest('[data-tc-goster]').remove(); islem('TC kimlik görüntüledi', tamAd(k)); kaydet(); }
        const fb = ev.target.closest('[data-foto-buyut]'); if (fb) { ev.preventDefault(); pencere({ baslik: EVRAKLAR.find(x => x[0] === fb.dataset.fotoBuyut)[1] + ' · ' + tamAd(k), icerik: `<img src="${k.evrakFoto[fb.dataset.fotoBuyut]}" alt="" style="width:100%;border-radius:8px">` }); }
        const oi = ev.target.closest('[data-odeme-islem]'); if (oi) odemeIslem(k, oi.dataset.odemeIslem);
        const et = ev.target.closest('[data-ek-tahsil]'); if (et) ekKalemTahsil(k, +et.dataset.ekTahsil);
        const bl = ev.target.closest('[data-belge]'); if (bl) import('./sayfalar3.js').then(m => m.belgeAc(bl.dataset.belge, k.id));
        if (ev.target.closest('[data-ekders]')) ekDersOner(k);
      });
      kap.addEventListener('change', ev => {
        const fy = ev.target.closest('[data-foto-yukle]');
        if (fy && fy.files[0]) { fotoKucult(fy.files[0]).then(u => { k.evrakFoto = k.evrakFoto || {}; k.evrakFoto[fy.dataset.fotoYukle] = u; k.evrak[fy.dataset.fotoYukle] = true; islem('Evrak fotoğrafı yükledi', tamAd(k)); kaydet(); bildir('Evrak fotoğrafı kaydedildi'); yenile(); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); return; }
        const c = ev.target.closest('[data-evrak]'); if (!c) return;
        k.evrak[c.dataset.evrak] = c.checked; islem(c.checked ? 'Evrak teslim aldı' : 'Evrakı eksik işaretledi', tamAd(k) + ' · ' + EVRAKLAR.find(x => x[0] === c.dataset.evrak)[1]);
        if (!eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama)) { k.asama = 'Teorik'; bildir('Evraklar tamam, kursiyer teorik aşamaya geçti'); }
        kaydet(); yenile();
      });
      kap.addEventListener('submit', ev => {
        ev.preventDefault();
        if (ev.target.matches('[data-not]')) { const v = ev.target.n.value.trim(); if (!v) return; k.notlar.unshift({ tarih: gun(0), metin: v }); kaydet(); ciz(); }
        if (ev.target.matches('[data-mesaj]')) { const v = ev.target.m.value.trim(); if (!v) return; wpGonder(k, v); ciz(); }
      });
    },
  };
}
export function tahsilAl(k, i, sonra) {
  const t = k.odeme.taksitler[i], kalan = t.tutar - (t.kismi || 0);
  pencere({
    baslik: 'Tahsilat al',
    icerik: `<div class="kisi" style="margin-bottom:16px"><div><b>${e(tamAd(k))}</b><small>${i + 1}. taksit · vade ${tarih(t.vade)}${t.kismi ? ' · ' + tl(t.kismi) + ' önceden ödendi' : ''}</small></div><b class="sayi" style="margin-left:auto;font-size:20px">${tl(kalan)}</b></div>
      <div class="alan"><label for="t-tutar">Alınan tutar</label><input id="t-tutar" inputmode="numeric" value="${kalan}"><small style="color:var(--soluk)">Taksitin bir kısmı ödenirse kalan, aynı taksitte açık kalır.</small></div>
      <span class="et" style="display:block;margin-top:14px">Ödeme yöntemi</span><div class="secim" style="margin-top:6px">${['Nakit', 'Kart', 'Havale'].map((y, j) => `<label><input type="radio" name="y" value="${y}" ${j === 1 ? 'checked' : ''}><span>${y}</span></label>`).join('')}</div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:16px;font-size:14px"><input type="checkbox" checked name="mak"> Kursiyere WhatsApp’tan makbuz gönder</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-onay>Tahsil et</button>`,
    onAc(d) {
      d.querySelector('[data-onay]').addEventListener('click', () => {
        const y = d.querySelector('[name=y]:checked').value, v = Math.min(kalan, +d.querySelector('#t-tutar').value.replace(/\D/g, '') || 0);
        if (!v) return bildir('Tutar girin', 'uyari');
        geriAlNoktasi();
        t.kismi = (t.kismi || 0) + v;
        if (t.kismi >= t.tutar) { t.odendi = gun(0); t.yontem = y; delete t.kismi; }
        islem('Tahsilat aldı', tamAd(k) + ' · ' + (i + 1) + '. taksit · ' + tl(v) + (t.odendi ? '' : ' (kısmi)'));
        S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + (i + 1) + '. taksit' + (t.odendi ? '' : ' (kısmi)'), tutar: v, yontem: y, kursiyer: k.id });
        kaydet(); kapatPencere();
        if (d.querySelector('[name=mak]').checked) gonderimEkle(tamAd(k), tl(v) + ' ödeme makbuzu', 'Makbuz');
        bildir(tl(v) + ' tahsil edildi' + (t.odendi ? '' : ', taksitte ' + tl(t.tutar - t.kismi) + ' kaldı'), 'tamam', true);
        sonra ? sonra() : yenile();
      });
    },
  });
}
export function ekKalemTahsil(k, j) {
  const x = k.odeme.ekler[j]; geriAlNoktasi(); x.odendi = gun(0);
  S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: x.ad, aciklama: tamAd(k) + ' · ' + x.ad, tutar: x.tutar, yontem: 'Kart', kursiyer: k.id });
  islem('Tahsilat aldı', tamAd(k) + ' · ' + x.ad + ' · ' + tl(x.tutar)); kaydet(); bildir(x.ad + ' tahsil edildi', 'tamam', true); yenile();
}
export function odemeIslem(k, tur) {
  const acik = k.odeme.taksitler.filter(t => !t.odendi);
  const formlar = {
    indirim: ['İndirim uygula', `<div class="alan"><label>İndirim tutarı (₺)</label><input name="v" inputmode="numeric" placeholder="1000"></div><div class="alan" style="margin-top:12px"><label>Neden</label><select name="n"><option>Öğrenci indirimi</option><option>Kardeş indirimi</option><option>Peşin ödeme indirimi</option><option>Kampanya</option></select></div><p style="font-size:13.5px;color:var(--soluk);margin-top:10px">İndirim son açık taksitlerden düşülür.</p>`],
    iade: ['İade yap', `<div class="alan"><label>İade tutarı (₺)</label><input name="v" inputmode="numeric"></div><div class="alan" style="margin-top:12px"><label>Neden</label><select name="n"><option>Kurstan ayrıldı</option><option>Fazla ödeme</option><option>Diğer</option></select></div><p style="font-size:13.5px;color:var(--soluk);margin-top:10px">İade kasaya gider olarak işlenir; kursiyerin toplam ücreti aynı tutarda düşer.</p>`],
    plan: ['Planı yeniden böl', `<p style="margin-bottom:12px">Kalan <b>${tl(acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0))}</b> yeni taksitlere bölünecek. İlk vade gelecek ay.</p><div class="alan"><label>Taksit sayısı</label><select name="v">${[1, 2, 3, 4, 5, 6].map(n => `<option ${n === Math.max(1, acik.length) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`],
    ek: ['Ek kalem ekle', `<div class="alan"><label>Kalem</label><select name="n"><option data-t="1250">e-Sınav ücreti</option><option data-t="2000">Direksiyon sınavı tekrar ücreti</option><option data-t="900">Ek direksiyon dersi</option><option data-t="0">Harç / diğer</option></select></div><div class="alan" style="margin-top:12px"><label>Tutar (₺)</label><input name="v" inputmode="numeric" value="1250"></div>`],
  };
  const [baslik, ic] = formlar[tur];
  pencere({
    baslik: baslik + ' · ' + tamAd(k), icerik: `<form id="f-od">${ic}</form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-od">${baslik}</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      if (tur === 'ek') f.n.addEventListener('change', () => { f.v.value = f.n.selectedOptions[0].dataset.t; });
      f.addEventListener('submit', ev => {
        ev.preventDefault(); const v = +String(f.v.value).replace(/\D/g, '') || 0; geriAlNoktasi();
        if (tur === 'indirim') { if (!v) return bildir('Tutar girin', 'uyari'); let kalan = v; for (const t of acik.slice().reverse()) { const d2 = Math.min(kalan, t.tutar - (t.kismi || 0)); t.tutar -= d2; kalan -= d2; if (!kalan) break; } k.odeme.taksitler = k.odeme.taksitler.filter(t => t.odendi || t.tutar > 0); k.odeme.toplam -= v - kalan; islem('İndirim uyguladı', tamAd(k) + ' · ' + tl(v - kalan) + ' · ' + f.n.value); }
        if (tur === 'iade') { if (!v) return bildir('Tutar girin', 'uyari'); k.odeme.iade = (k.odeme.iade || 0) + v; k.odeme.toplam -= v; S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gider', kategori: 'İade', aciklama: tamAd(k) + ' · iade · ' + f.n.value, tutar: v, yontem: 'Havale' }); islem('İade yaptı', tamAd(k) + ' · ' + tl(v)); }
        if (tur === 'plan') { const top = acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0), n = +f.v.value || 1; k.odeme.taksitler = k.odeme.taksitler.filter(t => t.odendi); acik.forEach(t => { if (t.kismi) k.odeme.taksitler.push({ vade: t.vade, tutar: t.kismi, odendi: gun(0), yontem: 'Kısmi' }); }); for (let i = 0; i < n; i++) { const dt = new Date(BUGUN); dt.setMonth(dt.getMonth() + i + 1); const p = Math.round(top / n / 50) * 50; k.odeme.taksitler.push({ vade: iso(dt), tutar: i === n - 1 ? top - p * (n - 1) : p, odendi: null, yontem: null }); } islem('Ödeme planını değiştirdi', tamAd(k) + ' · ' + n + ' taksit'); }
        if (tur === 'ek') { if (!v) return bildir('Tutar girin', 'uyari'); k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: f.n.value, tutar: v, odendi: null }); islem('Ek kalem ekledi', tamAd(k) + ' · ' + f.n.value + ' · ' + tl(v)); }
        kaydet(); kapatPencere(); bildir(baslik + ': kaydedildi', 'tamam', true); yenile();
      });
    },
  });
}

/* ================= DİREKSİYON PLANI ================= */
let planGun = null, planGorunum = 'arac';
const SAATLER = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const izinli = (kim, g) => S.izinler.find(i => i.kim === kim && g >= i.bas && g <= i.bit);
export function plan() {
  if (!planGun || fark(planGun) < -14 || fark(planGun) > 13) planGun = gun(0);
  const gunler = []; for (let n = -3; n <= 13; n++) gunler.push(gun(n));
  const sutunlar = planGorunum === 'egitmen' ? S.egitmenler : S.araclar;
  const gDers = S.dersler.filter(d => d.tarih === planGun);
  const pazar = tarihOku(planGun).getDay() === 0;
  const sutunEg = sut => planGorunum === 'egitmen' ? sut.id : sut.egitmen;
  const hucre = (sut, s) => {
    if (s === '13:00') return `<div class="tk-hucre ogle" title="Öğle arası"></div>`;
    const iz = izinli(sutunEg(sut), planGun);
    const d = gDers.find(x => x.saat === s && (planGorunum === 'egitmen' ? x.egitmen === sut.id : x.arac === sut.id));
    if (!d) { if (iz || pazar) return `<div class="tk-hucre ${iz ? 'izinli' : ''}" title="${iz ? e(iz.tur) : 'Kapalı'}"></div>`; return `<div class="tk-hucre bos-hucre" data-ekle="${sut.id}|${s}" data-hucre="${sut.id}|${s}" tabindex="0" role="button" aria-label="${s} ders ekle"></div>`; }
    const k = kursiyer(d.kursiyer);
    return `<div class="tk-hucre" data-hucre="${sut.id}|${s}"><div class="ders ${d.durum === 'Yapıldı' ? 'yapildi' : d.durum === 'Gelmedi' ? 'gelmedi' : ''} ${d.tekrar ? 'tekrar' : ''}" data-ders="${d.id}" draggable="${d.durum === 'Planlandı'}" tabindex="0" role="button"><b>${e(tamAd(k))}</b><small>${planGorunum === 'egitmen' ? (d.arac ? arac(d.arac).plaka : '') : egitmen(d.egitmen).ad} · ${k.direksiyon + (d.durum === 'Planlandı' ? 1 : 0)}. ders</small></div></div>`;
  };
  const doluluk = Math.round(gDers.length / (sutunlar.length * (SAATLER.length - 1)) * 100);
  const bas = s => planGorunum === 'egitmen'
    ? (() => { const ar = S.araclar.find(a => a.egitmen === s.id), iz = izinli(s.id, planGun); return `<div class="tk-bas">${ar ? aracGorsel(ar, 'kucuk') : ''}<div><b>${e(s.ad)}</b><small>${iz ? '<span style="color:var(--kirmizi);font-weight:700">' + e(iz.tur) + '</span>' : gDers.filter(d => d.egitmen === s.id).length + ' ders · ' + (ar ? ar.plaka : '')}</small></div></div>`; })()
    : (() => { const iz = izinli(s.egitmen, planGun); return `<div class="tk-bas">${aracGorsel(s, 'kucuk')}<div><b>${e(s.plaka)}</b><small>${iz ? '<span style="color:var(--kirmizi);font-weight:700">' + e(egitmen(s.egitmen).ad.split(' ')[0]) + ' ' + e(iz.tur.toLowerCase()) + '</span>' : e(egitmen(s.egitmen).ad) + ' · ' + s.vites}</small></div></div>`; })();
  const bek = S.bekleme.map(b => ({ ...b, k: kursiyer(b.kursiyer) })).filter(b => b.k);
  return {
    baslik: 'Direksiyon planı', alt: tarihUzun(planGun) + ' · ' + gDers.length + ' ders · doluluk %' + doluluk,
    html: `${ekranNotu('Boş saate dokunun: ders ekleyin. Dersi sürükleyin: saatini ya da aracını değiştirin. İptal edilen saat bekleme listesine otomatik teklif edilir.')}
    <div class="bolum-bas" style="align-items:center">
      <div class="gun-sec" style="flex:1;min-width:0">${gunler.map(g => `<button data-gun="${g}" class="${g === planGun ? 'secili' : ''} ${fark(g) === 0 ? 'bugun' : ''}" aria-label="${tarihUzun(g)}"><small>${fark(g) === 0 ? 'Bugün' : gunKisa(g)}</small><b>${tarihOku(g).getDate()}</b></button>`).join('')}</div>
      <div class="sag" style="width:auto"><div class="rol" style="display:flex"><button data-gorunum="arac" class="${planGorunum === 'arac' ? 'secili' : ''}">Araca göre</button><button data-gorunum="egitmen" class="${planGorunum === 'egitmen' ? 'secili' : ''}">Usta öğreticiye göre</button></div></div>
    </div>
    <div class="kart" style="overflow:hidden">
      ${pazar ? `<div class="ipucu uyari" style="margin:14px">${isaret('dur', 20)}Pazar günü kurs kapalı; ders planlanamaz.</div>` : ''}
      <div class="takvim" style="--sutun:${sutunlar.length}">
        <div class="tk-bas"></div>
        ${sutunlar.map(bas).join('')}
        ${SAATLER.map(s => `<div class="tk-saat">${s}</div>` + sutunlar.map(su => hucre(su, s)).join('')).join('')}
      </div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Bekleme listesi</h3><small>Boşalan saat önce bu kişilere teklif edilir</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-bek-ekle>${ik('arti')}Listeye ekle</button></div></div>
      <ul class="liste" style="margin-top:8px">${bek.map(b => `<li><a class="kisi" href="#/kursiyer/${b.k.id}" style="flex:1"><div><b>${e(tamAd(b.k))}</b><small>${e(b.tercih)} · ${b.k.direksiyon}/${SINIFLAR[b.k.sinif].direksiyon} ders · ${goreli(b.eklendi)} eklendi</small></div></a><span class="sag"><button class="dg dg-hafif dg-kucuk" data-bek-cik="${b.k.id}">Çıkar</button></span></li>`).join('') || '<li>' + bos('Bekleme listesi boş', 'Erken ders isteyenleri buraya ekleyin.') + '</li>'}</ul></div>`,
    baglan(k) {
      const ekle = v => { const [sid, s] = v.split('|'); dersEkle(sid, s); };
      k.addEventListener('click', ev => {
        const t = ev.target;
        const g = t.closest('[data-gun]'); if (g) { planGun = g.dataset.gun; yenile(); }
        const v = t.closest('[data-gorunum]'); if (v) { planGorunum = v.dataset.gorunum; yenile(); }
        const h = t.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle);
        const d = t.closest('[data-ders]'); if (d) dersAc(d.dataset.ders);
        const c = t.closest('[data-bek-cik]'); if (c) { S.bekleme = S.bekleme.filter(b => b.kursiyer !== c.dataset.bekCik); kaydet(); yenile(); }
        if (t.closest('[data-bek-ekle]')) { const l = S.kursiyerler.filter(x => x.asama === 'Direksiyon' && !S.bekleme.some(b => b.kursiyer === x.id)); pencere({ baslik: 'Bekleme listesine ekle', icerik: `<div class="alan"><label>Kursiyer</label><select id="b-k">${l.map(x => `<option value="${x.id}">${e(tamAd(x))}</option>`).join('')}</select></div><div class="alan" style="margin-top:12px"><label>Tercih</label><select id="b-t"><option>Fark etmez</option><option>Hafta içi sabah</option><option>Hafta içi akşam</option><option>Cumartesi</option></select></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Ekle</button>`, onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { S.bekleme.push({ kursiyer: p.querySelector('#b-k').value, tercih: p.querySelector('#b-t').value, eklendi: gun(0) }); kaydet(); kapatPencere(); bildir('Bekleme listesine eklendi'); yenile(); }); } }); }
      });
      k.addEventListener('keydown', ev => { if (ev.key !== 'Enter') return; const h = ev.target.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle); const d = ev.target.closest('[data-ders]'); if (d) dersAc(d.dataset.ders); });
      // sürükle-bırak
      let suruklenen = null;
      k.addEventListener('dragstart', ev => { const d = ev.target.closest('[data-ders]'); if (!d) return; suruklenen = d.dataset.ders; ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', suruklenen); } catch (x) { } });
      k.addEventListener('dragover', ev => { const h = ev.target.closest('.bos-hucre'); if (h && suruklenen) { ev.preventDefault(); k.querySelectorAll('.surukle-ust').forEach(x => x.classList.remove('surukle-ust')); h.classList.add('surukle-ust'); } });
      k.addEventListener('dragend', () => { k.querySelectorAll('.surukle-ust').forEach(x => x.classList.remove('surukle-ust')); suruklenen = null; });
      k.addEventListener('drop', ev => {
        const h = ev.target.closest('.bos-hucre'); if (!h || !suruklenen) return; ev.preventDefault();
        const d = S.dersler.find(x => x.id === suruklenen), [sid, saat] = h.dataset.hucre.split('|');
        const yeniEg = planGorunum === 'egitmen' ? sid : arac(sid).egitmen, yeniAr = planGorunum === 'egitmen' ? (S.araclar.find(a => a.egitmen === sid) || {}).id : sid;
        if (S.dersler.some(x => x.id !== d.id && x.kursiyer === d.kursiyer && x.tarih === planGun && x.saat === saat)) return bildir('Kursiyerin o saatte başka dersi var', 'uyari');
        if (!egitmen(yeniEg).siniflar.includes(kursiyer(d.kursiyer).sinif)) return bildir(egitmen(yeniEg).ad + ' bu sınıfta ders vermiyor', 'uyari');
        geriAlNoktasi(); const eskiSaat = d.saat; Object.assign(d, { saat, egitmen: yeniEg, arac: yeniAr }); islem('Dersi taşıdı', tamAd(kursiyer(d.kursiyer)) + ' · ' + eskiSaat + ' → ' + saat); kaydet();
        const ks = kursiyer(d.kursiyer);
        wpGonder(ks, `Merhaba ${ks.ad}, ${tarihUzun(planGun)} dersin ${eskiSaat} yerine ${saat}’e alındı.`, 'Saat değişikliği');
        yenile();
      });
      const sec = k.querySelector('.gun-sec .secili'); if (sec) sec.scrollIntoView({ inline: 'center', block: 'nearest' });
    },
  };
}
function dersEkle(sutunId, saat) {
  const eg = planGorunum === 'egitmen' ? egitmen(sutunId) : egitmen(arac(sutunId).egitmen);
  const ar = planGorunum === 'egitmen' ? S.araclar.find(a => a.egitmen === eg.id) : arac(sutunId);
  const oGun = id => S.dersler.filter(x => x.kursiyer === id && x.tarih === planGun).length;
  const adaylar = S.kursiyerler.filter(k => ['Direksiyon', 'Sınav'].includes(k.asama) && eg.siniflar.includes(k.sinif)).sort((a, b) => (oGun(a.id) - oGun(b.id)) || ((a.egitmen === eg.id ? -1 : 1) - (b.egitmen === eg.id ? -1 : 1)));
  pencere({
    baslik: 'Direksiyon dersi ekle',
    icerik: `<div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">${ar ? aracGorsel(ar, 'orta') : ''}<div><b style="display:block;font-family:var(--baslik);font-size:18px;color:var(--murekkep)">${tarihUzun(planGun)} · ${saat}</b><span>${e(eg.ad)} · ${ar ? plaka(ar.plaka) : 'araç yok'}</span></div></div>
      <div class="alan"><label for="d-k">Kursiyer</label><select id="d-k">${adaylar.map(k => `<option value="${k.id}">${e(tamAd(k))} · ${SINIFLAR[k.sinif].ad.split(' ·')[0]} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon}${k.egitmen === eg.id ? '' : ' · başka usta öğretici'}</option>`).join('')}</select></div>
      <div id="d-uyari" style="margin-top:12px"></div>
      <div class="alan" style="margin-top:12px"><label for="d-tekrar">Tekrar</label><select id="d-tekrar"><option value="0">Tek seferlik</option><option value="2">Her hafta aynı saatte · 2 hafta</option><option value="4">Her hafta aynı saatte · 4 hafta</option><option value="6">Her hafta aynı saatte · 6 hafta</option></select></div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" checked name="hat"> Kursiyere WhatsApp’tan bildir</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet>Dersi ekle</button>`,
    onAc(d) {
      const sel = d.querySelector('#d-k'), uy = d.querySelector('#d-uyari'), dg = d.querySelector('[data-kaydet]');
      const kontrol = () => {
        const kid = sel.value, ayni = S.dersler.filter(x => x.kursiyer === kid && x.tarih === planGun);
        const cak = ayni.find(x => x.saat === saat);
        let m = '';
        if (cak) m = `<div class="ipucu uyari">${isaret('yasak', 20)}Bu kursiyerin aynı saatte ${egitmen(cak.egitmen).ad} ile dersi var.</div>`;
        else if (ayni.length >= S.kurs.gunlukDersSiniri) m = `<div class="ipucu uyari">${isaret('uyari', 20)}Kursiyerin o gün zaten ${ayni.length} dersi var. Kurs ayarlarındaki günlük sınır ${S.kurs.gunlukDersSiniri} ders.</div>`;
        uy.innerHTML = m; dg.disabled = !!cak;
      };
      sel.addEventListener('change', kontrol); kontrol();
      dg.addEventListener('click', () => {
        const k = kursiyer(sel.value), n = +d.querySelector('#d-tekrar').value;
        let eklenen = 0;
        for (let h = 0; h <= Math.max(0, n - 1); h++) {
          const t = tarihOku(planGun); t.setDate(t.getDate() + 7 * h); const ti = iso(t);
          if (S.dersler.some(x => x.tarih === ti && x.saat === saat && (x.egitmen === eg.id || x.kursiyer === k.id))) continue;
          S.dersler.push({ id: 'd' + Date.now() + h, kursiyer: k.id, egitmen: eg.id, arac: ar ? ar.id : null, tarih: ti, saat, durum: 'Planlandı', tekrar: n > 0 }); eklenen++;
        }
        islem('Ders ekledi', tamAd(k) + ' · ' + tarih(planGun) + ' ' + saat + (n ? ' · ' + eklenen + ' hafta' : '')); kaydet(); kapatPencere();
        const metin = n ? `Merhaba ${k.ad}, ${eklenen} hafta boyunca her ${gunKisa(planGun)} ${saat}’te ${eg.ad} ile direksiyon dersin var.` : `Merhaba ${k.ad}, ${tarihUzun(planGun)} ${saat}’te ${eg.ad} ile direksiyon dersin planlandı.`;
        if (d.querySelector('[name=hat]').checked) wpGonder(k, metin, 'Ders bildirimi'); else bildir(eklenen + ' ders eklendi');
        yenile();
      });
    },
  });
}
function bosSaatiDoldur(d) {
  const bek = S.bekleme.map(b => kursiyer(b.kursiyer)).filter(k => k && k.id !== d.kursiyer && egitmen(d.egitmen).siniflar.includes(k.sinif) && !S.dersler.some(x => x.kursiyer === k.id && x.tarih === d.tarih && x.saat === d.saat));
  if (!bek.length) { bildir('Ders iptal edildi'); return yenile(); }
  pencere({
    baslik: 'Boşalan saati dolduralım mı?',
    icerik: `<div class="ipucu" style="margin-bottom:14px">${isaret('bilgi', 22)}<span>${tarihUzun(d.tarih)} ${d.saat} boşaldı. Bekleme listesindeki ${bek.length} kişiye WhatsApp’tan teklif gidecek; ilk “evet” diyen dersi alır.</span></div>${bek.map(k => `<div class="evrak">${isaret('zorunlu', 20)}<span style="flex:1;color:var(--murekkep);font-weight:700">${e(tamAd(k))}</span><small style="color:var(--soluk)">${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders</small></div>`).join('')}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Boş kalsın</button><button class="dg dg-wp" data-teklif>${ik('wp')}Teklif gönder</button>`,
    onAc(p) {
      p.querySelector('[data-teklif]').addEventListener('click', () => {
        kapatPencere(); bek.forEach(k => gonderimEkle(tamAd(k), `${tarihUzun(d.tarih)} ${d.saat} boş saat teklifi`, 'Boş saat teklifi'));
        bildir(bek.length + ' kişiye boş saat teklifi gönderildi', 'wp'); yenile();
        setTimeout(() => {
          const k = bek[0];
          S.dersler.push({ id: 'd' + Date.now(), kursiyer: k.id, egitmen: d.egitmen, arac: d.arac, tarih: d.tarih, saat: d.saat, durum: 'Planlandı' });
          S.bekleme = S.bekleme.filter(b => b.kursiyer !== k.id); S.kazanim.doldurulan++; kaydet();
          bildir(k.ad + ' “Evet, gelirim” dedi; ders onun adına planlandı', 'wp'); yenile();
        }, 2200);
      });
    },
  });
}
function dersAc(id) {
  const d = S.dersler.find(x => x.id === id); const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac);
  pencere({
    baslik: 'Direksiyon dersi',
    icerik: `<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px;flex-wrap:wrap">${ar ? aracGorsel(ar, 'orta') : ''}<div style="flex:1;min-width:180px"><b style="display:block;font-family:var(--baslik);font-size:20px;color:var(--murekkep)">${e(tamAd(k))}</b><span>${SINIFLAR[k.sinif].ad} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders yapıldı</span></div><a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}" data-kapat>Dosyayı aç</a></div>
      <dl class="bilgi-tablo"><dt>Zaman</dt><dd>${tarihUzun(d.tarih)} · ${d.saat}${d.tekrar ? ' · haftalık' : ''}</dd><dt>Usta öğretici</dt><dd>${e(eg.ad)}</dd><dt>Araç</dt><dd>${ar ? plaka(ar.plaka) + ' ' + e(ar.model) : '—'}</dd><dt>Durum</dt><dd>${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</dd></dl>`,
    altlik: d.durum === 'Planlandı' ? `<button class="dg dg-cizgi" data-iptal style="margin-right:auto;color:var(--kirmizi);border-color:var(--kirmizi)">Dersi iptal et</button><button class="dg dg-cizgi" data-tasi>Taşı</button><button class="dg dg-cizgi" data-gelmedi>Gelmedi</button><button class="dg dg-ana" data-yapildi>${ik('tik')}Yapıldı</button>` : `<button class="dg dg-cizgi" data-geri>Planlandı’ya al</button><button class="dg dg-koyu" data-kapat>Tamam</button>`,
    onAc(p) {
      p.addEventListener('click', ev => {
        if (ev.target.closest('[data-yapildi]')) { geriAlNoktasi(); islem('Ders yapıldı işaretledi', tamAd(k) + ' · ' + d.saat); d.durum = 'Yapıldı'; k.direksiyon = Math.min(SINIFLAR[k.sinif].direksiyon, k.direksiyon + 1); kaydet(); kapatPencere(); bildir('Ders yapıldı olarak işaretlendi', 'tamam', true); yenile(); }
        if (ev.target.closest('[data-gelmedi]')) { d.durum = 'Gelmedi'; kaydet(); kapatPencere(); wpGonder(k, `Merhaba ${k.ad}, bugünkü dersine gelemedin. Yeni bir saat ayarlayalım mı?`, 'Gelmedi bildirimi'); yenile(); }
        if (ev.target.closest('[data-iptal]')) { geriAlNoktasi(); S.dersler = S.dersler.filter(x => x.id !== d.id); islem('Ders iptal etti', tamAd(k) + ' · ' + tarih(d.tarih) + ' ' + d.saat); kaydet(); kapatPencere(); gonderimEkle(tamAd(k), 'Ders iptali bildirimi', 'Otomatik'); bosSaatiDoldur(d); }
        if (ev.target.closest('[data-tasi]')) {
          const bos = SAATLER.filter(sa => sa !== '13:00' && sa !== d.saat && !S.dersler.some(x => x.tarih === d.tarih && x.saat === sa && (x.egitmen === d.egitmen || x.kursiyer === d.kursiyer)));
          const gov = p.querySelector('.pencere-govde');
          gov.insertAdjacentHTML('beforeend', `<div style="margin-top:16px"><p class="et" style="margin-bottom:6px">Aynı gün boş saatler</p><div class="secim">${bos.map(sa => `<label><input type="radio" name="yeni-saat" value="${sa}"><span>${sa}</span></label>`).join('') || '<span style="color:var(--soluk)">Boş saat yok</span>'}</div></div>`);
          p.querySelector('[data-tasi]').outerHTML = '<button class="dg dg-ana" data-tasi-onay>Yeni saate taşı</button>';
        }
        if (ev.target.closest('[data-tasi-onay]')) { const v = p.querySelector('[name=yeni-saat]:checked'); if (!v) return bildir('Bir saat seçin', 'uyari'); geriAlNoktasi(); const eski = d.saat; d.saat = v.value; islem('Dersi taşıdı', tamAd(k) + ' · ' + eski + ' → ' + d.saat); kaydet(); kapatPencere(); wpGonder(k, `Merhaba ${k.ad}, ${tarihUzun(d.tarih)} dersin ${eski} yerine ${d.saat}’e alındı.`, 'Saat değişikliği'); yenile(); }
        if (ev.target.closest('[data-geri]')) { if (d.durum === 'Yapıldı') k.direksiyon = Math.max(0, k.direksiyon - 1); d.durum = 'Planlandı'; kaydet(); kapatPencere(); yenile(); }
      });
    },
  });
}

/* ================= TEORİK DERSLER ================= */
const GRUP_AD = { aksam: 'Akşam grubu · Derslik 1', sabah: 'Sabah grubu · Derslik 2' };
// Kursiyerin devamsızlığı: grubunun geçmiş oturumlarında yoklamada işaretlenmediği sayısı (yoklama kaydı yoksa sayılmaz)
const devamsiz = k => S.teorik.filter(t => t.grup === k.teorikGrup && t.yoklama && !t.yoklama.includes(k.id)).length;
export function teorik() {
  const liste = [...S.teorik].sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const gelecek = liste.filter(t => fark(t.tarih) >= 0), gecmis = liste.filter(t => fark(t.tarih) < 0).reverse();
  const teorikte = S.kursiyerler.filter(k => k.asama === 'Teorik').sort((a, b) => b.teorik - a.teorik);
  const hazir = teorikte.filter(k => k.teorik >= SINIFLAR[k.sinif].teorik - 4);
  const grupKisi = g => teorikte.filter(k => k.teorikGrup === g);
  const ort = gecmis.length ? Math.round(gecmis.reduce((a, t) => a + (t.yoklama ? t.yoklama.length : t.katilim) / Math.max(1, t.yoklama ? grupKisi(t.grup).length : t.mevcut), 0) / gecmis.length * 100) : 0;
  const sinirda = teorikte.filter(k => devamsiz(k) >= S.kurs.devamsizlikSiniri - 1);
  const satir = (t, gec) => { const n = t.yoklama ? t.yoklama.length : t.katilim, top = t.yoklama ? grupKisi(t.grup).length : t.mevcut; const o = ogretmen(t.ogretmen); return `<li><span class="zaman">${t.saat}</span><div style="min-width:0"><b style="color:var(--murekkep)">${e(t.konu)}</b><small style="display:block;color:var(--soluk)">${goreli(t.tarih)} · ${t.sure} saat · ${e(GRUP_AD[t.grup] || t.salon)} · Öğretmen ${e(o ? o.ad : '')}</small></div>
    <span class="sag">${gec ? `<span class="sayi" style="font-size:13px">${n}/${top}</span>${ilerleme(n, top, n / Math.max(1, top) > .8 ? 'yesil' : 'sari')}` : ''}<button class="dg ${gec ? 'dg-cizgi' : 'dg-koyu'} dg-kucuk" data-yoklama="${t.id}">${gec ? 'Yoklamayı gör' : 'Yoklama al'}</button></span></li>`; };
  return {
    baslik: 'Teorik dersler', alt: 'Sınıf programı, yoklama ve e-sınava hazırlık',
    html: `${ekranNotu('Teorik dersleri öğretmenler verir. Yoklama, dersin grubundaki kursiyerlerle alınır; devamsızlık sınırına yaklaşan kursiyer ve velisi uyarılır.')}<div class="izgara iz-4">
      <div class="kart gosterge"><small>Teorik aşamada</small><b>${teorikte.length} kursiyer</b><span>Akşam ${grupKisi('aksam').length} · sabah ${grupKisi('sabah').length}</span></div>
      <div class="kart gosterge"><small>Ortalama katılım</small><b>%${ort}</b><span>Son ${gecmis.length} oturum</span></div>
      <div class="kart gosterge"><small>Devamsızlık sınırında</small><b>${sinirda.length}</b><span>Sınır ${S.kurs.devamsizlikSiniri} ders</span></div>
      <div class="kart gosterge"><small>e-Sınava hazır</small><b>${hazir.length} kursiyer</b><span><a href="#/meb/esinav">Başvuru listesi</a></span></div>
    </div><div class="ara-bosluk"></div>
    <div class="izgara iz-21">
      <div class="kart"><div class="kart-bas"><h3>Ders programı</h3><small>Yaklaşan ${gelecek.length} oturum</small></div>
        <ul class="liste" style="margin-top:8px">${gelecek.map(t => satir(t, false)).join('')}</ul>
        <div class="kart-bas" style="padding-top:22px"><h3>Geçmiş oturumlar</h3></div>
        <ul class="liste" style="margin-top:8px">${gecmis.slice(0, 6).map(t => satir(t, true)).join('')}</ul></div>
      <div>
        <div class="kart"><div class="kart-bas"><h3>Öğretmenler</h3></div><ul class="liste" style="margin-top:8px">${S.ogretmenler.map(o => `<li>${isaret('bilgi', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(o.ad)}</b><small style="color:var(--soluk)">${e(o.brans)} · ${S.teorik.filter(t => t.ogretmen === o.id && fark(t.tarih) >= 0).length} yaklaşan ders</small></div></li>`).join('')}</ul></div>
        <div class="ara-bosluk"></div>
        <div class="kart"><div class="kart-bas"><h3>Kursiyer ilerlemesi</h3><small>Teorik saat · devamsızlık</small></div>
        <ul class="liste" style="margin-top:8px">${teorikte.slice(0, 14).map(k => { const dv = devamsiz(k); return `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))}</b><small>${k.teorik}/${SINIFLAR[k.sinif].teorik} saat · ${k.teorikGrup === 'sabah' ? 'sabah' : 'akşam'}${dv ? ' · ' + dv + ' devamsız' : ''}</small></div></a><span class="sag" style="width:96px">${dv >= S.kurs.devamsizlikSiniri - 1 ? rozet('Sınırda', 'kirmizi') : ilerleme(k.teorik, SINIFLAR[k.sinif].teorik, k.teorik >= SINIFLAR[k.sinif].teorik - 4 ? 'yesil' : '')}</span></li>`; }).join('') || '<li>' + bos('Teorik aşamada kursiyer yok', '') + '</li>'}</ul></div>
      </div>
    </div>`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const y = ev.target.closest('[data-yoklama]'); if (!y) return;
        const t = S.teorik.find(x => x.id === y.dataset.yoklama);
        const sinif = grupKisi(t.grup);
        pencere({
          baslik: 'Yoklama · ' + t.konu,
          icerik: `<p style="color:var(--soluk);margin-bottom:12px">${tarihUzun(t.tarih)} · ${t.saat} · ${e(GRUP_AD[t.grup] || t.salon)} · ${sinif.length} kayıtlı kursiyer</p>${sinif.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px">${sinif.map(x => `<label class="evrak" style="cursor:pointer"><input type="checkbox" name="v" value="${x.id}" ${!t.yoklama || t.yoklama.includes(x.id) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--yesil)"><span style="color:var(--murekkep)">${e(tamAd(x))}</span>${devamsiz(x) ? `<small style="color:var(--kirmizi);margin-left:auto">${devamsiz(x)} devamsız</small>` : ''}</label>`).join('')}</div>` : bos('Bu grupta teorik aşamada kursiyer yok', '')}`,
          altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet ${sinif.length ? '' : 'disabled'}>Yoklamayı kaydet</button>`,
          onAc(d) {
            d.querySelector('[data-kaydet]').addEventListener('click', () => {
              const gelen = [...d.querySelectorAll('[name=v]:checked')].map(x => x.value), gelmeyen = sinif.filter(x => !gelen.includes(x.id));
              geriAlNoktasi(); t.yoklama = gelen; t.katilim = gelen.length;
              sinif.filter(x => gelen.includes(x.id)).forEach(x => x.teorik = Math.min(SINIFLAR[x.sinif].teorik, x.teorik + t.sure));
              gelmeyen.forEach(x => gonderimEkle(tamAd(x), 'Teorik derse gelmedin bilgisi' + (devamsiz(x) >= S.kurs.devamsizlikSiniri - 1 ? ' · devamsızlık sınırı uyarısı' : ''), 'Yoklama'));
              islem('Yoklama aldı', t.konu + ' · ' + gelen.length + '/' + sinif.length);
              kaydet(); kapatPencere(); bildir(`Yoklama kaydedildi: ${gelen.length}/${sinif.length}.${gelmeyen.length ? ' Gelmeyen ' + gelmeyen.length + ' kişiye bilgi gitti' : ''}`, gelmeyen.length ? 'wp' : 'tamam', true); yenile();
            });
          },
        });
      });
    },
  };
}

export function ekDersOner(k, sonra) {
  pencere({
    baslik: 'Ek ders öner · ' + tamAd(k),
    icerik: `<p style="margin-bottom:12px">Sınavdan önce kaç ek ders önerelim? Kursiyere WhatsApp’tan teklif gider, onaylarsa ders planlanır ve ücreti ödeme planına eklenir.</p><div class="secim">${[2, 4, 6].map(n => [n, n * S.kurs.ekDersUcreti]).map(([n, f], i) => `<label><input type="radio" name="n" value="${n}|${f}" ${i === 0 ? 'checked' : ''}><span>${n} ders · ${tl(f)}</span></label>`).join('')}</div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-wp" data-k>${ik('wp')}Teklifi gönder</button>`,
    onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { const [n, f] = p.querySelector('[name=n]:checked').value.split('|').map(Number); kapatPencere(); wpGonder(k, `Merhaba ${k.ad}, sınavdan önce ${n} ek direksiyon dersi (${tl(f)}) öneriyoruz. Onaylıyor musun?`, 'Ek ders teklifi'); setTimeout(() => { k.odeme.taksitler.push({ vade: gun(30), tutar: f, odendi: null, yontem: null }); k.odeme.toplam += f; S.kazanim.ekDers++; kaydet(); bildir(k.ad + ' ek dersi onayladı; ödeme planına eklendi', 'wp'); sonra ? sonra() : yenile(); }, 2000); }); },
  });
}
