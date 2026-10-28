import { S, kaydet, gun, fark, iso, BUGUN, SINIFLAR, EVRAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, gonderimEkle } from './veri.js';
import { e, tl, ik, rozet, isaret, yonLevhasi, ekranNotu, aracGorsel, pencere, kapatPencere, bildir, tarih, tarihUzun, bugunMetni } from './ui.js';
import { yenile } from './app.js';

/* ================= BELGELER VE ÇIKTILAR ================= */
const SABLONLAR = [
  ['sozlesme', 'Kursiyer sözleşmesi', 'Ücret, taksit planı ve imza alanlarıyla', 'kursiyer'],
  ['bilgi', 'Kursiyer bilgi formu', 'Kimlik, iletişim, acil durum kişisi, evrak durumu', 'kursiyer'],
  ['takip', 'Direksiyon eğitimi takip formu', 'Yapılan dersler, eğitmen ve araç, imza sütunu', 'kursiyer'],
  ['makbuz', 'Tahsilat makbuzu', 'Son alınan ödeme için', 'kursiyer'],
  ['senet', 'Senet', 'Senetli ödeme planı olan kursiyerler için', 'senet'],
  ['program', 'Haftalık ders programı', 'Eğitmene göre, kapıya asılacak çizelge', 'egitmen'],
  ['sinav', 'Sınav listesi', 'Oturuma giden kursiyerler, imza sütunuyla', 'sinav'],
];
const kursBas = baslik => `<h1>${e(baslik)}</h1><p class="a4-alt">${e(S.kurs.ad)} · ${e(S.kurs.adres)} · ${e(S.kurs.tel)}</p>`;
function belgeHtml(tur, id) {
  if (tur === 'program') {
    const eg = egitmen(id), gunler = []; for (let n = 0; n < 7; n++) gunler.push(gun(n));
    return kursBas('Haftalık direksiyon programı') + `<p><b>Eğitmen:</b> ${e(eg.ad)} &nbsp; <b>Araç:</b> ${e((S.araclar.find(a => a.egitmen === eg.id) || {}).plaka || '—')}</p><table><tr><th>Gün</th><th>Saat</th><th>Kursiyer</th><th>Telefon</th></tr>${gunler.flatMap(g => S.dersler.filter(d => d.egitmen === eg.id && d.tarih === g).sort((a, b) => a.saat.localeCompare(b.saat)).map(d => `<tr><td>${tarihUzun(g)}</td><td>${d.saat}</td><td>${e(tamAd(kursiyer(d.kursiyer)))}</td><td>${e(kursiyer(d.kursiyer).tel)}</td></tr>`)).join('') || '<tr><td colspan="4">Bu hafta ders yok.</td></tr>'}</table>`;
  }
  if (tur === 'sinav') {
    const s = S.sinavlar.find(x => x.id === id);
    return kursBas(s.tur + ' listesi') + `<p><b>Tarih:</b> ${tarihUzun(s.tarih)} ${s.saat} &nbsp; <b>Yer:</b> ${e(s.yer)}</p><table><tr><th>#</th><th>Ad soyad</th><th>Sınıf</th><th>Telefon</th><th>İmza</th></tr>${s.kursiyerler.map(kursiyer).filter(Boolean).map((k, i) => `<tr><td>${i + 1}</td><td>${e(tamAd(k))}</td><td>${SINIFLAR[k.sinif].ad}</td><td>${e(k.tel)}</td><td style="width:120px"></td></tr>`).join('')}</table>`;
  }
  const k = kursiyer(id); if (!k) return '';
  const S0 = SINIFLAR[k.sinif];
  if (tur === 'sozlesme') return kursBas('Kursiyer sözleşmesi') + `<table><tr><th>Kursiyer</th><td>${e(tamAd(k))}</td><th>Telefon</th><td>${e(k.tel)}</td></tr><tr><th>Sınıf</th><td>${S0.ad}</td><th>Kayıt tarihi</th><td>${tarih(k.kayit)}</td></tr><tr><th>Kurs ücreti</th><td>${tl(k.odeme.toplam)}</td><th>Peşinat</th><td>${tl(k.odeme.pesin)}</td></tr></table>
    <p><b>Ödeme planı</b></p><table><tr><th>#</th><th>Vade</th><th>Tutar</th></tr>${k.odeme.taksitler.map((t, i) => `<tr><td>${i + 1}</td><td>${tarih(t.vade)}</td><td>${tl(t.tutar)}</td></tr>`).join('') || '<tr><td colspan="3">Peşin ödeme</td></tr>'}</table>
    <p>Kurs, ${S0.ad} sınıfı için teorik dersleri ve ${S0.direksiyon} direksiyon dersini verir. Kursiyer derslere zamanında katılmayı, ödeme planına uymayı kabul eder. Gelinemeyecek dersler en az bir gün önce bildirilir.</p>
    <p style="color:#666;font-size:11.5px">Bu örnek şablondur; kurs kendi sözleşme metnini Ayarlar’dan ekler.</p>
    <div class="imza"><div>Kursiyer · ${e(tamAd(k))}</div><div>Kurs müdürü · ${e(S.kurs.ad)}</div></div>`;
  if (tur === 'bilgi') return kursBas('Kursiyer bilgi formu') + `<table><tr><th>Ad soyad</th><td>${e(tamAd(k))}</td></tr><tr><th>Telefon</th><td>${e(k.tel)}</td></tr><tr><th>Doğum yılı</th><td>${e(k.dogum)}</td></tr><tr><th>Sınıf</th><td>${S0.ad}</td></tr><tr><th>Eğitmen</th><td>${e(egitmen(k.egitmen).ad)}</td></tr><tr><th>Acil durum kişisi</th><td>${e(k.acil ? k.acil.ad + ' (' + k.acil.yakinlik + ') ' + k.acil.tel : '—')}</td></tr><tr><th>Nereden duydu</th><td>${e(k.kaynak)}</td></tr></table>
    <p><b>Evrak durumu</b></p><table>${EVRAKLAR.map(([key, t]) => `<tr><td>${t}</td><td>${k.evrak[key] ? 'Teslim alındı' : 'Eksik'}</td></tr>`).join('')}</table><div class="imza"><div>Kursiyer</div><div>Teslim alan</div></div>`;
  if (tur === 'takip') { const d = S.dersler.filter(x => x.kursiyer === k.id && x.durum === 'Yapıldı').sort((a, b) => a.tarih.localeCompare(b.tarih)); return kursBas('Direksiyon eğitimi takip formu') + `<p><b>Kursiyer:</b> ${e(tamAd(k))} &nbsp; <b>Sınıf:</b> ${S0.ad}</p><table><tr><th>#</th><th>Tarih</th><th>Saat</th><th>Eğitmen</th><th>Araç</th><th>Kursiyer imza</th></tr>${Array.from({ length: S0.direksiyon }, (_, i) => d[i] ? `<tr><td>${i + 1}</td><td>${tarih(d[i].tarih)}</td><td>${d[i].saat}</td><td>${e(egitmen(d[i].egitmen).ad)}</td><td>${d[i].arac ? arac(d[i].arac).plaka : ''}</td><td></td></tr>` : `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}</table>`; }
  if (tur === 'makbuz') { const h = S.hareket.filter(x => x.kursiyer === k.id).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return kursBas('Tahsilat makbuzu') + `<table><tr><th>Makbuz no</th><td>${(h ? h.id : '').replace('h', 'M-')}</td><th>Tarih</th><td>${h ? tarih(h.tarih) : ''}</td></tr><tr><th>Ödeyen</th><td>${e(tamAd(k))}</td><th>Yöntem</th><td>${h ? e(h.yontem) : ''}</td></tr><tr><th>Açıklama</th><td colspan="3">${h ? e(h.aciklama) : ''}</td></tr><tr><th>Tutar</th><td colspan="3"><b>${h ? tl(h.tutar) : ''}</b></td></tr><tr><th>Kalan borç</th><td colspan="3">${tl(kalanBorc(k))}</td></tr></table><div class="imza"><div>Teslim eden</div><div>Teslim alan</div></div>`; }
  if (tur === 'senet') { const t = k.odeme.taksitler.find(x => !x.odendi) || k.odeme.taksitler[0]; return kursBas('Senet') + `<table><tr><th>Ödeme günü</th><td>${t ? tarih(t.vade) : ''}</td><th>Tutar</th><td><b>${t ? tl(t.tutar) : ''}</b></td></tr></table><p>İşbu senet mukabilinde ${t ? tarih(t.vade) : ''} tarihinde ${e(S.kurs.ad)}’na yukarıda yazılı tutarı ödeyeceğim. Bedeli eğitim hizmeti olarak alınmıştır.</p><table><tr><th>Borçlu</th><td>${e(tamAd(k))}</td></tr><tr><th>Telefon</th><td>${e(k.tel)}</td></tr><tr><th>Kefil</th><td>${e(k.acil ? k.acil.ad : '')}</td></tr></table><p style="color:#666;font-size:11.5px">Örnek şablon; kurs kendi senet formunu kullanabilir.</p><div class="imza"><div>Borçlu</div><div>Kefil</div></div>`; }
  return '';
}
export function belgeAc(tur, id) {
  const s = SABLONLAR.find(x => x[0] === tur);
  const secici = s[3] === 'kursiyer' ? S.kursiyerler.filter(k => tur !== 'takip' || k.direksiyon > 0) : s[3] === 'senet' ? S.kursiyerler.filter(k => k.odeme.senetli) : s[3] === 'egitmen' ? S.egitmenler : S.sinavlar;
  const ad = x => x.tur ? x.tur + ' · ' + tarih(x.tarih) : x.soyad ? tamAd(x) : x.ad;
  if (!id) id = secici[0].id;
  pencere({
    baslik: s[1], genis: true,
    icerik: `<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap"><select class="girdi" style="max-width:320px" data-kim aria-label="Seçim">${secici.map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${e(ad(x))}</option>`).join('')}</select><span style="color:var(--soluk);font-size:13.5px">Bilgiler kayıtlardan otomatik doldurulur.</span></div><div style="background:var(--zemin);padding:18px;border-radius:8px;max-height:62vh;overflow:auto"><div class="a4" id="a4">${belgeHtml(tur, id)}</div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-wp" data-wpb>${ik('wp')}WhatsApp’tan PDF gönder</button><button class="dg dg-ana" data-yazdir>${ik('belge')}Yazdır</button>`,
    onAc(d) {
      d.querySelector('[data-kim]').addEventListener('change', ev => { d.querySelector('#a4').innerHTML = belgeHtml(tur, ev.target.value); });
      d.querySelector('[data-yazdir]').addEventListener('click', () => window.print());
      d.querySelector('[data-wpb]').addEventListener('click', () => { const v = d.querySelector('[data-kim]').value, k = kursiyer(v); gonderimEkle(k ? tamAd(k) : S.kurs.ad, s[1] + ' (PDF)', 'Belge'); bildir(s[1] + ' PDF olarak gönderildi', 'wp'); });
    },
  });
}
export function belgeler() {
  return {
    baslik: 'Belgeler ve çıktılar', alt: 'Kayıtlardan otomatik dolan, yazdırmaya hazır formlar',
    html: `${ekranNotu('Formu seçin, kişiyi seçin; bilgiler kayıttan dolar. Yazdırın ya da WhatsApp’tan PDF olarak gönderin.')}
    <div class="belge-liste">${SABLONLAR.map(([k, t, a]) => `<button class="belge-kart" data-belge="${k}"><span class="kagit"><i></i><i></i><i style="width:80%"></i><i></i><i style="width:65%"></i><i style="width:90%"></i></span><b>${t}</b><small>${a}</small></button>`).join('')}</div>`,
    baglan(k) { k.addEventListener('click', ev => { const b = ev.target.closest('[data-belge]'); if (b) belgeAc(b.dataset.belge); }); },
  };
}

/* ================= EVDEN KAYIT SAYFASI (kursun web sitesi) ================= */
const SINIF_ARAC = { 'B': 'a1', 'B-O': 'a3', 'A2': 'a5', 'C': 'a6' };
let kayit = { adim: 0, sinif: 'B', bilgi: {}, evrak: {}, imza: false };
export function kayitSayfasi() {
  const adimlar = ['Sınıf', 'Bilgiler', 'Evraklar', 'Onay ve ödeme'];
  let govde = '';
  if (kayit.adim === 0) govde = `<h2 style="font-size:26px;margin-bottom:6px">Hangi ehliyeti alacaksın?</h2><p style="color:var(--soluk);margin-bottom:16px">Sınıfı seç; ücret ve taksit hemen görünür.</p>
    <div class="izgara iz-2" style="gap:10px">${Object.entries(SINIFLAR).map(([k, v]) => `<label style="cursor:pointer"><input type="radio" name="sinif" value="${k}" ${k === kayit.sinif ? 'checked' : ''} style="position:absolute;opacity:0"><span class="kart" style="display:block;padding:8px;${k === kayit.sinif ? 'border-color:var(--levha);box-shadow:0 0 0 2px var(--levha)' : ''}">${aracGorsel(arac(SINIF_ARAC[k]))}<b style="display:block;font-family:var(--baslik);font-size:17px;color:var(--murekkep);margin:8px 4px 0">${v.ad}</b><span style="display:block;margin:0 4px 4px;color:var(--metin)">${tl(v.ucret)} · 5 aya kadar taksit</span></span></label>`).join('')}</div>`;
  if (kayit.adim === 1) govde = `<h2 style="font-size:26px;margin-bottom:14px">Seni tanıyalım</h2><form class="form-izgara" id="f-k1">
    <div class="alan"><label>Ad</label><input name="ad" required value="${e(kayit.bilgi.ad || '')}" autocomplete="given-name"></div><div class="alan"><label>Soyad</label><input name="soyad" required value="${e(kayit.bilgi.soyad || '')}" autocomplete="family-name"></div>
    <div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" required value="${e(kayit.bilgi.tel || '')}" placeholder="05xx xxx xx xx" autocomplete="tel"></div><div class="alan"><label>Doğum yılı</label><input name="dogum" inputmode="numeric" value="${e(kayit.bilgi.dogum || '')}" placeholder="2006"></div>
    <div class="alan"><label>Acil durumda aranacak kişi</label><input name="acil" value="${e(kayit.bilgi.acil || '')}" placeholder="Ad soyad"></div><div class="alan"><label>Onun telefonu</label><input name="acilTel" inputmode="tel" value="${e(kayit.bilgi.acilTel || '')}"></div></form>`;
  if (kayit.adim === 2) govde = `<h2 style="font-size:26px;margin-bottom:6px">Evrakların</h2><p style="color:var(--soluk);margin-bottom:16px">Telefonla fotoğrafını çek, yükle. Eksik kalanı kursa getirebilirsin.</p>
    ${EVRAKLAR.filter(([k]) => k !== 'sozlesme').map(([k, t]) => `<label class="yukle" style="margin-bottom:8px;position:relative">${kayit.evrak[k] ? `<img src="${kayit.evrak[k]}" alt="">` : isaret('bilgi', 26)}<span style="flex:1"><b style="display:block;color:var(--murekkep)">${t}</b><small style="color:var(--soluk)">${kayit.evrak[k] ? 'Yüklendi' : 'Fotoğraf çek ya da seç'}</small></span>${kayit.evrak[k] ? isaret('tamam', 22) : ''}<input type="file" accept="image/*" capture="environment" data-evrak="${k}"></label>`).join('')}`;
  if (kayit.adim === 3) { const v = SINIFLAR[kayit.sinif], p = 8000, n = 4; govde = `<h2 style="font-size:26px;margin-bottom:14px">Son adım</h2>
    <div class="kart" style="padding:14px 16px;margin-bottom:12px"><div style="display:flex;justify-content:space-between"><b style="color:var(--murekkep)">${v.ad}</b><b class="sayi" style="color:var(--murekkep)">${tl(v.ucret)}</b></div><p style="font-size:14px;margin-top:4px">Bugün ${tl(p)} peşinat, sonra ${n} × ${tl((v.ucret - p) / n)}</p></div>
    <p class="et" style="margin-bottom:6px">Sözleşmeyi parmağınla imzala</p><canvas class="imza-alan" width="900" height="300" aria-label="İmza alanı"></canvas><button class="dg dg-hafif dg-kucuk" data-temizle type="button">Temizle</button>
    <div class="form-izgara" style="margin-top:12px"><div class="alan tam"><label>Kart numarası</label><input value="4111 1111 1111 1111" inputmode="numeric"></div><div class="alan"><label>Son kullanma</label><input value="12/30"></div><div class="alan"><label>CVC</label><input value="000"></div></div>
    <div class="ipucu uyari" style="margin-top:12px">${isaret('uyari', 20)}<span>Demo: test kartı dolu gelir, ödeme alınmaz. Canlıda kursun sanal POS’u ile 3D Secure çalışır.</span></div>`; }
  if (kayit.adim === 4) govde = `<div style="text-align:center;padding:30px 0">${isaret('tamam', 64)}<h2 style="font-size:28px;margin:16px 0 6px">Kaydın tamam!</h2><p style="color:var(--metin);max-width:380px;margin:0 auto 18px">Teorik ders programın ve ödeme planın WhatsApp’a gönderildi. Kurs da kaydını şu an panelinde görüyor.</p><a class="dg dg-ana" href="#/kursiyer/${kayit.yeniId}">Kurs panelinde gör</a> <button class="dg dg-cizgi" data-bastan>Yeni kayıt</button></div>`;
  return {
    baslik: 'Evden kayıt', alt: S.kurs.ad + ' · kursun web sitesindeki kayıt sayfası',
    html: `<div style="max-width:1120px;margin:0 auto;padding:4px 16px 0"><a class="dg dg-hafif" href="#/genel">${ik('sol')}Yönetici paneline dön</a></div>
    <div class="kayit-sayfa" style="padding-left:16px;padding-right:16px">
      <div class="kayit-gorsel"><img src="img/kayit.webp" alt="Direksiyon dersinde kursiyer ve eğitmen">${yonLevhasi([['Kayıt', '5 dk', '#/kayit', 'Kursa gelmeden, telefondan'], ['Taksit', '5 ay', '#/kayit', 'Peşinat sonrası'], ['Ehliyet', '2–3 ay', '#/kayit', 'Ortalama süre']], S.kurs.ad)}</div>
      <div class="kart" style="padding:22px 22px 18px;align-self:start">
        ${kayit.adim < 4 ? `<div class="adim-serit">${adimlar.map((a, i) => `<span class="${i <= kayit.adim ? 'ok' : ''}" title="${a}"></span>`).join('')}</div><p style="font-family:var(--baslik);font-weight:800;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--soluk);margin-bottom:8px">Adım ${kayit.adim + 1}/4 · ${adimlar[kayit.adim]}</p>` : ''}
        ${govde}
        ${kayit.adim < 4 ? `<div style="display:flex;gap:8px;margin-top:18px">${kayit.adim ? '<button class="dg dg-cizgi" data-geri>Geri</button>' : ''}<button class="dg dg-ana" style="flex:1" data-ileri>${kayit.adim === 3 ? 'Peşinatı öde ve kaydı tamamla' : 'Devam'}</button></div>` : ''}
      </div>
    </div>`,
    baglan(k) {
      k.addEventListener('change', ev => {
        if (ev.target.name === 'sinif') { kayit.sinif = ev.target.value; yenile(); }
        const f = ev.target.closest('[data-evrak]');
        if (f && f.files[0]) { const r = new FileReader(); r.onload = () => { kayit.evrak[f.dataset.evrak] = r.result; yenile(); }; r.readAsDataURL(f.files[0]); }
      });
      const cv = k.querySelector('canvas.imza-alan');
      if (cv) {
        const c = cv.getContext('2d'); c.lineWidth = 4; c.lineCap = 'round'; c.strokeStyle = '#111';
        let ciz = false; const nokta = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; };
        cv.addEventListener('pointerdown', ev => { ciz = true; c.beginPath(); c.moveTo(...nokta(ev)); cv.setPointerCapture(ev.pointerId); });
        cv.addEventListener('pointermove', ev => { if (!ciz) return; c.lineTo(...nokta(ev)); c.stroke(); kayit.imza = true; });
        cv.addEventListener('pointerup', () => ciz = false);
      }
      k.addEventListener('click', ev => {
        const t = ev.target;
        if (t.closest('[data-temizle]')) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); kayit.imza = false; }
        if (t.closest('[data-geri]')) { kayit.adim--; yenile(true); }
        if (t.closest('[data-bastan]')) { kayit = { adim: 0, sinif: 'B', bilgi: {}, evrak: {}, imza: false }; yenile(true); }
        if (t.closest('[data-ileri]')) {
          if (kayit.adim === 1) { const f = k.querySelector('#f-k1'); const b = Object.fromEntries(new FormData(f)); if (!b.ad.trim() || !b.soyad.trim() || b.tel.replace(/\D/g, '').length < 10) return bildir('Ad, soyad ve geçerli telefon gerekli', 'uyari'); kayit.bilgi = b; }
          if (kayit.adim === 3) {
            if (!kayit.imza) return bildir('Sözleşmeyi imzalayın', 'uyari');
            const v = SINIFLAR[kayit.sinif], p = 8000, n = 4, taksitler = [];
            for (let i = 0; i < n; i++) { const d = new Date(BUGUN); d.setMonth(d.getMonth() + i + 1); taksitler.push({ vade: iso(d), tutar: Math.round((v.ucret - p) / n / 50) * 50, odendi: null, yontem: null }); }
            const ev2 = {}; EVRAKLAR.forEach(([x]) => ev2[x] = x === 'sozlesme' ? true : !!kayit.evrak[x]);
            const eg = S.egitmenler.find(x => x.siniflar.includes(kayit.sinif));
            const yeni = { id: 'k' + Date.now(), ad: kayit.bilgi.ad.trim(), soyad: kayit.bilgi.soyad.trim(), tel: kayit.bilgi.tel, dogum: kayit.bilgi.dogum || '', sinif: kayit.sinif, kayit: gun(0), egitmen: eg.id, asama: Object.values(ev2).every(Boolean) ? 'Teorik' : 'Evrak', teorik: 0, direksiyon: 0, evrak: ev2, mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: v.ucret, pesin: p, pesinTarih: gun(0), taksitler, senetli: false }, kaynak: 'Web sitesi', yorum: null, notlar: [{ tarih: gun(0), metin: 'Evden kayıt sayfasından kaydoldu, sözleşmeyi telefondan imzaladı.' }], deneme: [], acil: { ad: kayit.bilgi.acil || '', yakinlik: '', tel: kayit.bilgi.acilTel || '' } };
            S.kursiyerler.unshift(yeni);
            S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Kurs ücreti', aciklama: tamAd(yeni) + ' · online peşinat', tutar: p, yontem: 'Kart', kursiyer: yeni.id });
            gonderimEkle(tamAd(yeni), 'Hoş geldin, ders programı ve ödeme planı', 'Otomatik');
            kaydet(); kayit.yeniId = yeni.id;
          }
          kayit.adim++; yenile(true);
        }
      });
    },
  };
}
