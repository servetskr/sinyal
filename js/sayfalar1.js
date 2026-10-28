import { S, kaydet, gun, fark, iso, tarihOku, BUGUN, SINIFLAR, ASAMALAR, EVRAKLAR, KAYNAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle } from './veri.js';
import { e, tl, sayi, ik, rozet, asamaRozet, avatar, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, sekmeler, tarih, tarihUzun, goreli, gunKisa, cubukGrafik, halka, ayAdi } from './ui.js';
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
  const tahsilGecen = S.hareket.filter(h => h.tur === 'Gelir' && gecenAyMi(h.tarih) && tarihOku(h.tarih).getDate() <= BUGUN.getDate()).reduce((a, h) => a + h.tutar, 0);
  const geciken = S.kursiyerler.filter(k => gecikenler(k).length);
  const gecikenTutar = geciken.reduce((a, k) => a + gecikenler(k).reduce((x, t) => x + t.tutar, 0), 0);
  const yeniAday = S.adaylar.filter(a => a.asama === 'Yeni');
  const evrakEksik = S.kursiyerler.filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet');
  const sigorta = S.araclar.filter(a => [a.sigorta, a.muayene].some(t => t && fark(t) <= 21));
  const yarinSinav = S.sinavlar.filter(s => fark(s.tarih) >= 0 && fark(s.tarih) <= 7);
  const asamaSay = ASAMALAR.map(a => S.kursiyerler.filter(k => k.asama === a && (a !== 'Ehliyet' || (k.dsinav && fark(k.dsinav.tarih) > -30))).length);

  const yapilacak = [
    yeniAday.length && [`${yeniAday.length} yeni aday cevap bekliyor`, 'Asistan ilk cevabı verdi; kayıt görüşmesine çevirin.', '#/adaylar', 'aday', 'mavi'],
    geciken.length && [`${geciken.length} kursiyerin taksiti gecikti`, tl(gecikenTutar) + ' tahsil edilmedi.', '#/kasa/geciken', 'kasa', 'kirmizi'],
    evrakEksik.length && [`${evrakEksik.length} kursiyerin evrakı eksik`, 'MEB kaydı bu evraklar tamamlanınca yapılabilir.', '#/meb', 'belge', 'uyari'],
    ...sigorta.map(a => [`${a.plaka} · ${fark(a.sigorta) <= 21 ? 'sigorta' : 'muayene'} ${fark(a.sigorta) <= 21 ? goreli(a.sigorta) : goreli(a.muayene)} bitiyor`, a.model, '#/filo', 'filo', 'uyari']),
  ].filter(Boolean);

  const dersSatir = d => { const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac); return `<li>
      <span class="zaman">${d.saat}</span>
      <a class="kisi" href="#/kursiyer/${k.id}">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${e(eg.ad)} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders</small></div></a>
      <span class="sag">${ar ? plaka(ar.plaka) : ''}${d.durum === 'Planlandı' ? rozet('Planlandı', 'mavi') : rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : 'kirmizi')}</span></li>`; };

  const yolDurak = `<div class="yolculuk">
    <div class="yolculuk-serit"></div>
    ${ASAMALAR.map((a, i) => `<a class="durak" href="#/kursiyerler/${encodeURIComponent(a)}" style="left:${i / (ASAMALAR.length - 1) * 100}%"><b>${asamaSay[i]}</b><span>${a}</span></a>`).join('')}
  </div>`;

  return {
    baslik: 'Genel bakış',
    html: `
    <div class="izgara iz-4">
      <div class="kart gosterge"><small>${ik('kursiyer')} Aktif kursiyer</small><b>${akt.length}</b><span>${S.kursiyerler.filter(k => buAyMi(k.kayit)).length} kişi bu ay kaydoldu</span></div>
      <div class="kart gosterge"><small>${ik('direksiyon')} Bugünkü direksiyon</small><b>${bugunDers.length} ders</b><span>${new Set(bugunDers.map(d => d.egitmen)).size} eğitmen, ${new Set(bugunDers.map(d => d.arac)).size} araç</span></div>
      <div class="kart gosterge"><small>${ik('kasa')} Bu ay tahsilat</small><b>${tl(tahsilBu)}</b><span>${S.hareket.filter(h => h.tur === 'Gelir' && buAyMi(h.tarih)).length} ödeme alındı · ${S.hareket.filter(h => h.tur === 'Gelir' && h.tarih === gun(0)).length} tanesi bugün</span></div>
      <div class="kart gosterge"><small>${ik('uyari')} Geciken ödeme</small><b>${tl(gecikenTutar)}</b><span>${geciken.length} kursiyer · <a class="dg-hafif" style="padding:0;height:auto" href="#/kasa/geciken">Hatırlat</a></span></div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="kart">
      <div class="kart-bas"><h3>Kursiyer yolculuğu</h3><small>Kayıttan ehliyete, kim hangi aşamada</small><div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/kursiyerler">Tüm kursiyerler</a></div></div>
      <div class="kart-govde"><div class="yolculuk-kap">${yolDurak}</div></div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="izgara iz-21">
      <div class="kart">
        <div class="kart-bas"><h3>Bugünün direksiyon programı</h3><small>${bugunDers.filter(d => d.durum === 'Yapıldı').length}/${bugunDers.length} tamamlandı</small><div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/plan">Planı aç</a></div></div>
        <ul class="liste" style="margin-top:8px">${bugunDers.length ? bugunDers.slice(0, 9).map(dersSatir).join('') : '<li>' + bos('Bugün direksiyon dersi yok', 'Pazar günleri ders planlanmıyor.') + '</li>'}</ul>
        ${bugunDers.length > 9 ? `<div style="padding:10px 20px 16px"><a class="dg-hafif dg" href="#/plan">+${bugunDers.length - 9} ders daha</a></div>` : ''}
      </div>
      <div class="izgara" style="align-content:start">
        <div class="kart">
          <div class="kart-bas"><h3>Yapılacaklar</h3><small>${yapilacak.length} iş</small></div>
          <ul class="liste yapilacak" style="margin-top:8px">${yapilacak.map(([b, a, h, i, t]) => `<li><span class="oto-ik yp-${t}">${ik(i)}</span><a href="${h}" style="min-width:0"><b style="color:var(--murekkep);font-weight:600;display:block">${e(b)}</b><small style="color:var(--soluk);font-size:12.5px">${e(a)}</small></a><span class="sag">${ik('sag')}</span></li>`).join('') || '<li>' + bos('Her şey yolunda', 'Bekleyen iş yok.') + '</li>'}</ul>
        </div>
        <div class="kart">
          <div class="kart-bas"><h3>Bu hafta sınavlar</h3></div>
          <ul class="liste" style="margin-top:8px">${yarinSinav.map(s => `<li><span class="oto-ik">${ik(s.tur === 'e-Sınav' ? 'teorik' : 'direksiyon')}</span><a href="#/sinavlar" style="min-width:0"><b style="color:var(--murekkep);font-weight:600;display:block">${s.tur} · ${goreli(s.tarih)} ${s.saat}</b><small style="color:var(--soluk);font-size:12.5px">${s.kursiyerler.length} kursiyer · ${e(s.yer)}</small></a></li>`).join('') || '<li>' + bos('Bu hafta sınav yok', '') + '</li>'}</ul>
        </div>
      </div>
    </div>`,
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
    baslik: 'Adaylar', alt: 'WhatsApp, Instagram ve Google Haritalar’dan gelen ön kayıtlar',
    html: `
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
      <div class="alan"><label for="k-kaynak">Nereden geldi?</label><select id="k-kaynak" name="kaynak">${KAYNAKLAR.map(k => `<option ${k === on.kaynak ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <div class="alan tam"><span class="et">Sınıf</span><div class="secim">${Object.entries(SINIFLAR).map(([k, v], i) => `<label><input type="radio" name="sinif" value="${k}" ${(on.sinif ? k === on.sinif : i === 0) ? 'checked' : ''}><span>${v.ad} · ${tl(v.ucret)}</span></label>`).join('')}</div></div>
      <div class="alan"><label for="k-egitmen">Eğitmen</label><select id="k-egitmen" name="egitmen"></select></div>
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
        const s = f.sinif.value, u = SINIFLAR[s].ucret, n = +f.taksit.value;
        const p = n ? Math.min(u, +f.pesin.value.replace(/\D/g, '') || 0) : u;
        const taksitler = [];
        for (let i = 0; i < n; i++) { const v = new Date(BUGUN); v.setMonth(v.getMonth() + i + 1); const t = Math.round((u - p) / n / 50) * 50; taksitler.push({ vade: iso(v), tutar: i === n - 1 ? (u - p) - t * (n - 1) : t, odendi: null, yontem: null }); }
        const ev2 = {}; EVRAKLAR.forEach(([k]) => ev2[k] = f['ev-' + k].checked);
        const yeni = { id: 'k' + Date.now(), ad: f.ad.value.trim(), soyad: f.soyad.value.trim(), tel: f.tel.value.trim(), dogum: '', sinif: s, kayit: gun(0), egitmen: f.egitmen.value, asama: Object.values(ev2).every(Boolean) ? 'Teorik' : 'Evrak', teorik: 0, direksiyon: 0, evrak: ev2, mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: u, pesin: p, pesinTarih: gun(0), taksitler }, kaynak: f.kaynak.value, yorum: null, notlar: [] };
        S.kursiyerler.unshift(yeni);
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
        <td class="m-gizle">${e(egitmen(k.egitmen).ad)}</td>
        <td class="m-gizle">${sd ? goreli(sd.tarih) + ' <span class="mono">' + sd.saat + '</span>' : '<span style="color:var(--soluk)">—</span>'}</td>
      </tr>`;
    }).join('');
  }
  return {
    baslik: 'Kursiyerler', alt: S.kursiyerler.length + ' kayıt · ' + aktifler().length + ' aktif',
    html: `
    <div class="bolum-bas"><div><h2>Kursiyer listesi</h2><p>Bir satıra dokunarak kursiyerin dosyasını açın.</p></div><div class="sag"><button class="dg dg-cizgi" data-disa>${ik('indir')}Excel’e aktar</button><button class="dg dg-ana" data-yeni>${ik('arti')}Yeni kursiyer</button></div></div>
    <div id="sek">${sekmeler([['Tümü', 'Tümü', say('Tümü')], ...ASAMALAR.map(a => [a, a, say(a)])], sekme)}</div>
    <div class="kart">
      <div class="filtre">
        <div class="ara-kutu">${ik('ara')}<input class="girdi" type="search" placeholder="Ad ya da telefon" data-q aria-label="Kursiyer ara"></div>
        <select class="girdi" data-sinif aria-label="Sınıf"><option value="">Tüm sınıflar</option>${Object.entries(SINIFLAR).map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select>
        <button class="cip" data-borclu>${ik('uyari')}&nbsp;Taksiti gecikenler</button>
      </div>
      <div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th>Sınıf</th><th>Aşama</th><th>Direksiyon</th><th>Kalan ödeme</th><th>Eğitmen</th><th>Sonraki ders</th></tr></thead><tbody id="tb">${satirlar()}</tbody></table></div>
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
    if (profilSekme === 'genel') return `<div class="izgara iz-3">
      <div class="kart"><div class="kart-bas"><h3>Bilgiler</h3></div><div class="kart-govde"><dl class="bilgi-tablo">
        <dt>Sınıf</dt><dd>${S0.ad}</dd><dt>Kayıt</dt><dd>${tarih(k.kayit)} · ${e(k.kaynak)}</dd><dt>Eğitmen</dt><dd>${e(eg.ad)}</dd><dt>Telefon</dt><dd>${e(k.tel)}</dd>
        <dt>MEB kaydı</dt><dd>${k.mebIslendi ? rozet('MEBBİS’e girildi', 'yesil') : rozet('Bekliyor', 'uyari')}</dd>
        <dt>Teorik</dt><dd><span class="sayi">${k.teorik}/${S0.teorik} saat</span>${ilerleme(k.teorik, S0.teorik)}</dd>
        <dt>Direksiyon</dt><dd><span class="sayi">${k.direksiyon}/${S0.direksiyon} ders</span>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</dd>
      </dl></div></div>
      <div class="kart"><div class="kart-bas"><h3>Evraklar</h3><small>${EVRAKLAR.length - eksik.length}/${EVRAKLAR.length}</small>${eksik.length ? `<div class="sag"><button class="dg dg-wp dg-kucuk" data-evrak-hatirlat>${ik('wp')}Hatırlat</button></div>` : ''}</div><div class="kart-govde">
        ${EVRAKLAR.map(([key, t]) => `<label class="evrak"><span class="durum ${k.evrak[key] ? 'var' : 'yok'}">${ik(k.evrak[key] ? 'tik' : 'kapat')}</span><span style="flex:1;color:var(--murekkep)">${t}</span><span class="anahtar"><input type="checkbox" data-evrak="${key}" ${k.evrak[key] ? 'checked' : ''} aria-label="${t} teslim alındı"><i></i></span></label>`).join('')}
      </div></div>
      <div class="kart"><div class="kart-bas"><h3>Notlar</h3></div><div class="kart-govde">
        <ul class="zaman-cizgisi">${k.notlar.map(n => `<li>${e(n.metin)}<small>${goreli(n.tarih)}</small></li>`).join('') || '<li style="color:var(--soluk)">Henüz not yok.<small>Eğitmen notları ve görüşmeler burada birikir.</small></li>'}</ul>
        <form data-not style="display:flex;gap:8px;margin-top:10px"><input class="girdi" name="n" placeholder="Not ekleyin" aria-label="Not"><button class="dg dg-koyu" type="submit">Ekle</button></form>
      </div></div></div>`;
    if (profilSekme === 'dersler') return `<div class="kart"><div class="kart-bas"><h3>Direksiyon dersleri</h3><small>${k.direksiyon} yapıldı · ${dersler.filter(d => d.durum === 'Planlandı').length} planlı</small><div class="sag"><a class="dg dg-ana dg-kucuk" href="#/plan">${ik('arti')}Ders planla</a></div></div>
      <ul class="liste" style="margin-top:8px">${dersler.map(d => `<li><span class="zaman">${d.saat}</span><div><b style="color:var(--murekkep)">${tarihUzun(d.tarih)}</b><small style="display:block;color:var(--soluk)">${e(egitmen(d.egitmen).ad)}</small></div><span class="sag">${d.arac ? plaka(arac(d.arac).plaka) : ''}${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</span></li>`).join('') || '<li>' + bos('Henüz direksiyon dersi yok', 'Teorik dersler ve e-sınav bittikten sonra planlanır.') + '</li>'}</ul></div>`;
    if (profilSekme === 'odeme') return `<div class="izgara iz-12">
      <div class="kart gosterge"><small>Toplam ücret</small><b>${tl(k.odeme.toplam)}</b><span>Ödenen ${tl(odenen(k))}</span>${ilerleme(odenen(k), k.odeme.toplam, 'yesil')}<span style="margin-top:8px">Kalan <b style="font-size:15px;font-family:var(--mono)">${tl(kalanBorc(k))}</b></span></div>
      <div class="kart"><div class="kart-bas"><h3>Ödeme planı</h3><div class="sag">${kalanBorc(k) ? `<button class="dg dg-cizgi dg-kucuk" data-link>${ik('kart')}Ödeme linki gönder</button>` : ''}</div></div><div class="kart-govde">
        <div class="taksit-sira"><span class="no">P</span><div><b style="color:var(--murekkep)">Peşinat</b><small style="display:block;color:var(--soluk)">${tarih(k.odeme.pesinTarih)}</small></div><span class="sayi">${tl(k.odeme.pesin)}</span>${rozet('Ödendi', 'yesil')}</div>
        ${k.odeme.taksitler.map((t, i) => `<div class="taksit-sira"><span class="no">${i + 1}</span><div><b style="color:var(--murekkep)">${i + 1}. taksit</b><small style="display:block;color:var(--soluk)">Vade ${tarih(t.vade)}${t.odendi ? ' · ödendi ' + tarih(t.odendi) + ' · ' + t.yontem : ''}</small></div><span class="sayi">${tl(t.tutar)}</span>${t.odendi ? rozet('Ödendi', 'yesil') : `<button class="dg ${fark(t.vade) < 0 ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" data-tahsil="${i}">${fark(t.vade) < 0 ? 'Gecikti · tahsil et' : 'Tahsil et'}</button>`}</div>`).join('')}
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
      <div class="profil-bas">${avatar(k.ad, k.soyad)}<div><h2>${e(tamAd(k))}</h2><div class="meta"><span>${asamaRozet(k.asama)}</span><span>${ik('direksiyon')}${S0.ad}</span><span>${ik('tel')}${e(k.tel)}</span><span>${ik('kursiyer')}${e(eg.ad)}</span></div></div>
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
        if (ev.target.closest('[data-ileri]')) { const i = asamaNo(k); if (i < ASAMALAR.length - 1) { k.asama = ASAMALAR[i + 1]; kaydet(); bildir(tamAd(k) + ' → ' + k.asama); yenile(); } }
        if (ev.target.closest('[data-evrak-hatirlat]')) wpGonder(k, `Merhaba ${k.ad}, kaydını tamamlamak için ${eksikEvrak(k).map(x => x[1].toLowerCase()).join(', ')} eksik.`, 'Evrak hatırlatması');
        if (ev.target.closest('[data-link]')) wpGonder(k, `Merhaba ${k.ad}, kalan ${tl(kalanBorc(k))} için kartla ödeme linkin: odeme.ornek/${k.id}`, 'Ödeme linki');
        const t = ev.target.closest('[data-tahsil]'); if (t) tahsilAl(k, +t.dataset.tahsil);
      });
      kap.addEventListener('change', ev => {
        const c = ev.target.closest('[data-evrak]'); if (!c) return;
        k.evrak[c.dataset.evrak] = c.checked;
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
  const t = k.odeme.taksitler[i];
  pencere({
    baslik: 'Tahsilat al',
    icerik: `<div class="kisi" style="margin-bottom:16px">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${i + 1}. taksit · vade ${tarih(t.vade)}</small></div><b class="sayi" style="margin-left:auto;font-size:20px">${tl(t.tutar)}</b></div>
      <span class="et">Ödeme yöntemi</span><div class="secim" style="margin-top:6px">${['Nakit', 'Kart', 'Havale'].map((y, j) => `<label><input type="radio" name="y" value="${y}" ${j === 1 ? 'checked' : ''}><span>${y}</span></label>`).join('')}</div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:16px;font-size:13.5px"><input type="checkbox" checked name="mak"> Kursiyere WhatsApp’tan makbuz gönder</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-onay>${tl(t.tutar)} tahsil et</button>`,
    onAc(d) {
      d.querySelector('[data-onay]').addEventListener('click', () => {
        const y = d.querySelector('[name=y]:checked').value;
        t.odendi = gun(0); t.yontem = y;
        S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + (i + 1) + '. taksit', tutar: t.tutar, yontem: y, kursiyer: k.id });
        kaydet(); kapatPencere();
        if (d.querySelector('[name=mak]').checked) wpGonder(k, `${tl(t.tutar)} tutarındaki ${i + 1}. taksit ödemen alındı. Teşekkürler!`, 'Makbuz'); else bildir('Tahsilat kaydedildi');
        sonra ? sonra() : yenile();
      });
    },
  });
}

/* ================= DİREKSİYON PLANI ================= */
let planGun = null, planGorunum = 'egitmen';
const SAATLER = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
export function plan() {
  if (!planGun || fark(planGun) < -14 || fark(planGun) > 13) planGun = gun(0);
  const gunler = []; for (let n = -3; n <= 13; n++) gunler.push(gun(n));
  const sutunlar = planGorunum === 'egitmen' ? S.egitmenler : S.araclar;
  const gDers = S.dersler.filter(d => d.tarih === planGun);
  const pazar = tarihOku(planGun).getDay() === 0;
  const hucre = (sut, s) => {
    if (s === '13:00') return `<div class="tk-hucre ogle" title="Öğle arası"></div>`;
    const d = gDers.find(x => x.saat === s && (planGorunum === 'egitmen' ? x.egitmen === sut.id : x.arac === sut.id));
    if (!d) return `<div class="tk-hucre ${pazar ? '' : 'bos-hucre'}" ${pazar ? '' : `data-ekle="${sut.id}|${s}"`} ${pazar ? '' : 'tabindex="0" role="button" aria-label="' + s + ' ders ekle"'}></div>`;
    const k = kursiyer(d.kursiyer);
    return `<div class="tk-hucre"><div class="ders ${d.durum === 'Yapıldı' ? 'yapildi' : d.durum === 'Gelmedi' ? 'gelmedi' : ''}" data-ders="${d.id}" tabindex="0" role="button"><b>${e(tamAd(k))}</b><small>${planGorunum === 'egitmen' ? (d.arac ? arac(d.arac).plaka : '') : egitmen(d.egitmen).ad} · ${k.direksiyon + (d.durum === 'Planlandı' ? 1 : 0)}. ders</small></div></div>`;
  };
  const doluluk = Math.round(gDers.length / (sutunlar.length * (SAATLER.length - 1)) * 100);
  return {
    baslik: 'Direksiyon planı', alt: tarihUzun(planGun) + ' · ' + gDers.length + ' ders · doluluk %' + doluluk,
    html: `
    <div class="bolum-bas" style="align-items:center">
      <div class="gun-sec" style="flex:1;min-width:0">${gunler.map(g => `<button data-gun="${g}" class="${g === planGun ? 'secili' : ''} ${fark(g) === 0 ? 'bugun' : ''}" aria-label="${tarihUzun(g)}"><small>${fark(g) === 0 ? 'Bugün' : gunKisa(g)}</small><b>${tarihOku(g).getDate()}</b></button>`).join('')}</div>
      <div class="sag" style="width:auto"><div class="rol" style="display:flex"><button data-gorunum="egitmen" class="${planGorunum === 'egitmen' ? 'secili' : ''}">Eğitmene göre</button><button data-gorunum="arac" class="${planGorunum === 'arac' ? 'secili' : ''}">Araca göre</button></div></div>
    </div>
    <div class="kart" style="overflow:hidden">
      ${pazar ? `<div class="ipucu uyari" style="margin:14px">${ik('uyari')}Pazar günü kurs kapalı; ders planlanamaz.</div>` : ''}
      <div class="takvim" style="--sutun:${sutunlar.length}">
        <div class="tk-bas"></div>
        ${sutunlar.map(s => planGorunum === 'egitmen' ? `<div class="tk-bas">${avatar(...s.ad.split(' '), s.renk + '22')}<div><b>${e(s.ad)}</b><small>${gDers.filter(d => d.egitmen === s.id).length} ders · ${s.siniflar.map(x => SINIFLAR[x].ad.split(' ·')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</small></div></div>` : `<div class="tk-bas"><div>${plaka(s.plaka)}<small style="display:block;margin-top:3px">${e(s.model)} · ${s.vites}</small></div></div>`).join('')}
        ${SAATLER.map(s => `<div class="tk-saat">${s}</div>` + sutunlar.map(su => hucre(su, s)).join('')).join('')}
      </div>
    </div>
    <p style="font-size:12.5px;color:var(--soluk);margin-top:10px">Boş bir saate dokunarak ders ekleyin. Kursiyere dersten bir gün önce WhatsApp hatırlatması otomatik gider.</p>`,
    baglan(k) {
      const ekle = v => { const [sid, s] = v.split('|'); dersEkle(sid, s); };
      k.addEventListener('click', ev => {
        const g = ev.target.closest('[data-gun]'); if (g) { planGun = g.dataset.gun; yenile(); }
        const v = ev.target.closest('[data-gorunum]'); if (v) { planGorunum = v.dataset.gorunum; yenile(); }
        const h = ev.target.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle);
        const d = ev.target.closest('[data-ders]'); if (d) dersAc(d.dataset.ders);
      });
      k.addEventListener('keydown', ev => { if (ev.key !== 'Enter') return; const h = ev.target.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle); const d = ev.target.closest('[data-ders]'); if (d) dersAc(d.dataset.ders); });
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
    icerik: `<div class="ipucu" style="margin-bottom:16px">${ik('takvim')}<span>${tarihUzun(planGun)} · <b>${saat}</b> · ${e(eg.ad)} · ${ar ? ar.plaka : 'araç yok'}</span></div>
      <div class="alan"><label for="d-k">Kursiyer</label><select id="d-k">${adaylar.map(k => `<option value="${k.id}">${e(tamAd(k))} · ${SINIFLAR[k.sinif].ad.split(' ·')[0]} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon}${k.egitmen === eg.id ? '' : ' · başka eğitmen'}</option>`).join('')}</select></div>
      <div id="d-uyari" style="margin-top:12px"></div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:13.5px"><input type="checkbox" checked name="hat"> Kursiyere WhatsApp’tan bildir</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet>Dersi ekle</button>`,
    onAc(d) {
      const sel = d.querySelector('#d-k'), uy = d.querySelector('#d-uyari'), dg = d.querySelector('[data-kaydet]');
      const kontrol = () => {
        const kid = sel.value, ayni = S.dersler.filter(x => x.kursiyer === kid && x.tarih === planGun);
        const cak = ayni.find(x => x.saat === saat);
        let m = '';
        if (cak) m = `<div class="ipucu uyari">${ik('uyari')}Bu kursiyerin aynı saatte ${egitmen(cak.egitmen).ad} ile dersi var.</div>`;
        else if (ayni.length >= S.kurs.gunlukDersSiniri) m = `<div class="ipucu uyari">${ik('uyari')}Kursiyerin o gün zaten ${ayni.length} dersi var. Kurs ayarlarındaki günlük sınır ${S.kurs.gunlukDersSiniri} ders.</div>`;
        uy.innerHTML = m; dg.disabled = !!cak;
      };
      sel.addEventListener('change', kontrol); kontrol();
      dg.addEventListener('click', () => {
        const k = kursiyer(sel.value);
        S.dersler.push({ id: 'd' + Date.now(), kursiyer: k.id, egitmen: eg.id, arac: ar ? ar.id : null, tarih: planGun, saat, durum: 'Planlandı' });
        kaydet(); kapatPencere();
        if (d.querySelector('[name=hat]').checked) wpGonder(k, `Merhaba ${k.ad}, ${tarihUzun(planGun)} ${saat}’te ${eg.ad} ile direksiyon dersin planlandı.`, 'Ders bildirimi'); else bildir('Ders eklendi');
        yenile();
      });
    },
  });
}
function dersAc(id) {
  const d = S.dersler.find(x => x.id === id); const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac);
  pencere({
    baslik: 'Direksiyon dersi',
    icerik: `<div class="kisi" style="margin-bottom:16px">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${SINIFLAR[k.sinif].ad} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders yapıldı</small></div><a class="dg dg-cizgi dg-kucuk" style="margin-left:auto" href="#/kursiyer/${k.id}" data-kapat>Dosyayı aç</a></div>
      <dl class="bilgi-tablo"><dt>Zaman</dt><dd>${tarihUzun(d.tarih)} · ${d.saat}</dd><dt>Eğitmen</dt><dd>${e(eg.ad)}</dd><dt>Araç</dt><dd>${ar ? plaka(ar.plaka) + ' ' + e(ar.model) : '—'}</dd><dt>Durum</dt><dd>${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</dd></dl>`,
    altlik: d.durum === 'Planlandı' ? `<button class="dg dg-cizgi" data-iptal style="margin-right:auto;color:var(--kirmizi)">Dersi iptal et</button><button class="dg dg-cizgi" data-gelmedi>Gelmedi</button><button class="dg dg-ana" data-yapildi>${ik('tik')}Yapıldı</button>` : `<button class="dg dg-cizgi" data-geri>Planlandı’ya al</button><button class="dg dg-koyu" data-kapat>Tamam</button>`,
    onAc(p) {
      p.addEventListener('click', ev => {
        if (ev.target.closest('[data-yapildi]')) { d.durum = 'Yapıldı'; k.direksiyon = Math.min(SINIFLAR[k.sinif].direksiyon, k.direksiyon + 1); kaydet(); kapatPencere(); bildir('Ders yapıldı olarak işaretlendi'); yenile(); }
        if (ev.target.closest('[data-gelmedi]')) { d.durum = 'Gelmedi'; kaydet(); kapatPencere(); wpGonder(k, `Merhaba ${k.ad}, bugünkü dersine gelemedin. Yeni bir saat ayarlayalım mı?`, 'Gelmedi bildirimi'); yenile(); }
        if (ev.target.closest('[data-iptal]')) { S.dersler = S.dersler.filter(x => x.id !== d.id); kaydet(); kapatPencere(); bildir('Ders iptal edildi'); yenile(); }
        if (ev.target.closest('[data-geri]')) { if (d.durum === 'Yapıldı') k.direksiyon = Math.max(0, k.direksiyon - 1); d.durum = 'Planlandı'; kaydet(); kapatPencere(); yenile(); }
      });
    },
  });
}

/* ================= TEORİK DERSLER ================= */
export function teorik() {
  const liste = [...S.teorik].sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const gelecek = liste.filter(t => fark(t.tarih) >= 0), gecmis = liste.filter(t => fark(t.tarih) < 0).reverse();
  const teorikte = S.kursiyerler.filter(k => k.asama === 'Teorik').sort((a, b) => b.teorik - a.teorik);
  const hazir = teorikte.filter(k => k.teorik >= SINIFLAR[k.sinif].teorik - 4);
  const ort = gecmis.length ? Math.round(gecmis.reduce((a, t) => a + t.katilim / t.mevcut, 0) / gecmis.length * 100) : 0;
  const satir = (t, gec) => `<li><span class="zaman">${t.saat}</span><div style="min-width:0"><b style="color:var(--murekkep)">${e(t.konu)}</b><small style="display:block;color:var(--soluk)">${goreli(t.tarih)} · ${t.sure} saat · ${e(t.salon)} · ${e(egitmen(t.egitmen).ad)}</small></div>
    <span class="sag">${gec ? `<span class="sayi" style="font-size:12.5px">${t.katilim}/${t.mevcut}</span>${ilerleme(t.katilim, t.mevcut, t.katilim / t.mevcut > .8 ? 'yesil' : 'sari')}` : ''}<button class="dg ${gec ? 'dg-cizgi' : 'dg-koyu'} dg-kucuk" data-yoklama="${t.id}">${gec ? 'Yoklamayı gör' : 'Yoklama al'}</button></span></li>`;
  return {
    baslik: 'Teorik dersler', alt: 'Sınıf programı, yoklama ve e-sınava hazırlık',
    html: `<div class="izgara iz-3">
      <div class="kart gosterge"><small>Teorik aşamada</small><b>${teorikte.length} kursiyer</b><span>${new Set(teorikte.map(k => k.sinif)).size} farklı sınıf</span></div>
      <div class="kart gosterge"><small>Ortalama katılım</small><b>%${ort}</b><span>Son ${gecmis.length} oturum</span></div>
      <div class="kart gosterge"><small>e-Sınava hazır</small><b>${hazir.length} kursiyer</b><span><a class="dg-hafif dg" style="padding:0;height:auto" href="#/sinavlar">Sınava kaydet</a></span></div>
    </div><div class="ara-bosluk"></div>
    <div class="izgara iz-21">
      <div class="kart"><div class="kart-bas"><h3>Ders programı</h3><small>Yaklaşan ${gelecek.length} oturum</small></div>
        <ul class="liste" style="margin-top:8px">${gelecek.map(t => satir(t, false)).join('')}</ul>
        <div class="kart-bas" style="padding-top:22px"><h3>Geçmiş oturumlar</h3></div>
        <ul class="liste" style="margin-top:8px">${gecmis.slice(0, 6).map(t => satir(t, true)).join('')}</ul></div>
      <div class="kart"><div class="kart-bas"><h3>Kursiyer ilerlemesi</h3><small>Teorik saat</small></div>
        <ul class="liste" style="margin-top:8px">${teorikte.slice(0, 14).map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${k.teorik}/${SINIFLAR[k.sinif].teorik} saat</small></div></a><span class="sag" style="width:90px">${ilerleme(k.teorik, SINIFLAR[k.sinif].teorik, k.teorik >= SINIFLAR[k.sinif].teorik - 4 ? 'yesil' : '')}</span></li>`).join('') || '<li>' + bos('Teorik aşamada kursiyer yok', '') + '</li>'}</ul></div>
    </div>`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const y = ev.target.closest('[data-yoklama]'); if (!y) return;
        const t = S.teorik.find(x => x.id === y.dataset.yoklama);
        const sinif = S.kursiyerler.filter(x => x.asama === 'Teorik').slice(0, t.mevcut);
        pencere({
          baslik: 'Yoklama · ' + t.konu,
          icerik: `<p style="color:var(--soluk);margin-bottom:12px">${tarihUzun(t.tarih)} · ${t.saat} · ${e(t.salon)}</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px">${sinif.map((x, i) => `<label class="evrak" style="cursor:pointer"><input type="checkbox" name="v" ${t.katilim == null || i < t.katilim ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--yesil)"><span style="color:var(--murekkep)">${e(tamAd(x))}</span></label>`).join('')}</div>`,
          altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet>Yoklamayı kaydet</button>`,
          onAc(d) { d.querySelector('[data-kaydet]').addEventListener('click', () => { t.katilim = d.querySelectorAll('[name=v]:checked').length; kaydet(); kapatPencere(); bildir(`Yoklama kaydedildi: ${t.katilim}/${sinif.length}. Gelmeyenlere bilgi mesajı gitti`, 'wp'); yenile(); }); },
        });
      });
    },
  };
}
