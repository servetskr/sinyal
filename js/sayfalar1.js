import { S, kaydet, gun, fark, iso, tarihOku, BUGUN, SINIFLAR, ASAMALAR, EVRAKLAR, KAYNAKLAR, kursiyer, egitmen, arac, tamAd, odenen, kalanBorc, ekToplam, gecikenler, eksikEvrak, asamaNo, sonrakiDers, gonderimEkle, risk, BECERI, islem, geriAlNoktasi, oturum, tcGecerli, tcMaskele, ogretmen, yas, mebOnKontrol, sb, sbDers, sbSinav, kapaliGun, ustaAraci, dersAraci, yerelZaman, aktifSiniflar, satistaSiniflar, YONTEMLER, yontemAd, ayEkle, gecikenTutar, selam, kursAdi, tuketim, beklenenTuketim } from './veri.js?v=76';
import { e, saatDe, saatE, tl, sayi, ik, rozet, asamaRozet, avatar, plaka, yol, ilerleme, bos, pencere, kapatPencere, bildir, sekmeler, tarih, tarihUzun, goreli, gunKisa, cubukGrafik, halka, ayAdi, isaret, yonLevhasi, olcumler, aracGorsel, ekranNotu, bugunMetni, fotoKucult, waAc, waSirali, tamTarih, pinSor } from './ui.js?v=76';
import { yenile } from './app.js?v=76';
import { denetimEksikleri, sozlesmeImzalat } from './sayfalar3.js?v=76';
import { bosSaatler } from './sayfalar4.js?v=76';
import { evrakDogrula, kurulumAdimlari } from './sayfalar5.js?v=76';
import { KONULAR } from './konular.js?v=76';
import * as MZ from './mevzuat.js?v=76';
import { aksamOzeti } from './zamanlayici.js?v=76';
import * as B from './bulut.js?v=76';

const aktifler = () => sb(S.kursiyerler).filter(k => k.asama !== 'Ehliyet' && !k.kapali);
const buAyMi = s => { const d = tarihOku(s); return d.getMonth() === BUGUN.getMonth() && d.getFullYear() === BUGUN.getFullYear(); };
const gecenAyMi = s => { const d = tarihOku(s), g = new Date(BUGUN); g.setDate(1); g.setMonth(g.getMonth() - 1); return d.getMonth() === g.getMonth() && d.getFullYear() === g.getFullYear(); };
// Mesajın gideceği kişi ve numarası (kursiyer, aday, usta ya da kullanıcı)
const ROL_ETIKET = { mudur: 'MÜDÜR', sekreter: 'ÖN BÜRO', usta: 'HOCA' };
export const alici = k => {
  if (k === 'mudur') return { ad: S.kurs.yetkili || 'Kurs müdürü', tel: S.kurs.wp || '', kanal: 'WhatsApp', rol: 'MÜDÜR' };
  if (k && typeof k === 'object') return k.siniflar ? { ad: k.ad, tel: k.tel, kanal: 'WhatsApp', rol: 'HOCA' } : { ad: tamAd(k), tel: k.tel, kanal: 'WhatsApp', rol: 'ÖĞRENCİ' };
  const a = S.adaylar.find(x => x.ad === k); if (a) return { ad: a.ad, tel: a.tel, kanal: a.kanal, rol: 'ADAY' };
  const ks = S.kursiyerler.find(x => tamAd(x) === k); if (ks) return { ad: k, tel: ks.tel, kanal: 'WhatsApp', rol: 'ÖĞRENCİ' };
  const eg = S.egitmenler.find(x => x.ad === k); if (eg) return { ad: k, tel: eg.tel, kanal: 'WhatsApp', rol: 'HOCA' };
  const u = S.kullanicilar.find(x => x.ad === k); return { ad: String(k || ''), tel: (u && u.tel) || '', kanal: 'WhatsApp', rol: u ? ROL_ETIKET[u.rol] : '' };
};
// Bir olayın birden çok kişiye bildirimi (ör. ders saati değişti → öğrenci + hoca). API açıksa sessizce gider.
export function bildirimler(liste, baslik = 'Bildirimler') {
  const l = liste.filter(x => x && x.kim && x.metin).map(x => { const a = alici(x.kim); return { ad: a.ad, tel: a.tel, rol: a.rol, metin: x.metin, tur: x.tur || baslik }; });
  waSirali(l, baslik, { sessiz: true });
}
// Elle gönderilen mesaj: WhatsApp kişinin sohbetinde hazır mesajla açılır (Instagram adayında metin kopyalanır, DM kutusu açılır).
export const mudurMu = () => !!(oturum.kullanici && oturum.kullanici.rol === 'mudur');
export const wpGonder = (k, metin, tur = 'Mesaj') => {
  const a = alici(k);
  if (a.kanal === 'Instagram') { gonderimEkle(a.ad, metin, tur + ' (Instagram, elle)'); try { navigator.clipboard.writeText(metin); } catch (x) { } window.open('https://www.instagram.com/direct/inbox/', '_blank'); return bildir('Mesaj kopyalandı; Instagram’da ' + a.ad.split(' ')[0] + ' sohbetine yapıştırıp gönderin'); }
  if (waAc(a.tel, metin, 'WhatsApp', a.ad, false, a.rol, tur) === 'api') return; bildir(a.ad.split(' ')[0] + ' için WhatsApp açıldı; mesajı gönderin', 'wp');
};
export const kisiListe = (l, metinFn) => l.map(k => { const a = alici(k); return { ad: a.ad, tel: a.tel, rol: a.rol, metin: metinFn(k) }; });
export const odemeBilgisi = () => S.kurs.iban ? `Havale/EFT için IBAN: ${S.kurs.iban} (${S.kurs.ad}); açıklamaya adınızı ve soyadınızı yazmanız yeterli. ${kursAdi('de')} nakit ya da kartla da ödeyebilirsiniz.` : `${kursAdi('e')} uğrayıp nakit ya da kartla ödeyebilirsiniz.`;
export const yorumMetni = k => `${selam(k)} ehliyetiniz hayırlı olsun! ${kursAdi()} hakkında birkaç cümle yazarsanız çok seviniriz${S.kurs.yorumLink ? ': ' + S.kurs.yorumLink : '. Google’da “' + S.kurs.ad + '” aratıp yorum yazabilirsiniz.'}`;

/* ================= GENEL BAKIŞ ================= */
export function genel(alt) {
  const akt = aktifler();
  const bugunDers = sbDers(S.dersler).filter(d => d.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  const tahsilBu = sb(S.hareket).filter(h => h.tur === 'Gelir' && buAyMi(h.tarih)).reduce((a, h) => a + h.tutar, 0);
  const geciken = sb(S.kursiyerler).filter(k => gecikenler(k).length);
  const gecikenTutar = geciken.reduce((a, k) => a + gecikenler(k).reduce((x, t) => x + t.tutar, 0), 0);
  const yeniAday = S.adaylar.filter(a => a.asama === 'Yeni');
  const evrakEksik = sb(S.kursiyerler).filter(k => eksikEvrak(k).length && k.asama !== 'Ehliyet');
  const belgeBiten = sb(S.araclar).filter(a => [a.sigorta, a.muayene].some(t => t && fark(t) <= 21));
  const haftaSinav = S.sinavlar.filter(s => fark(s.tarih) >= 0 && fark(s.tarih) <= 7);
  const asamaSay = ASAMALAR.map(a => sb(S.kursiyerler).filter(k => k.asama === a && (a !== 'Ehliyet' || (k.dsinav && fark(k.dsinav.tarih) > -30))).length);
  const ortDers = S.kurs.ekDersUcreti;
  const kz = S.kazanim;

  const devir = (S.devredilen || []).length + ((S.sosyal && S.sosyal.yorumlar.filter(y => y.durum === 'devir').length) || 0);
  const mebBekleyen = sb(S.kursiyerler).filter(k => !k.mebIslendi && !eksikEvrak(k).length).length;
  const kapanmayan = sb(S.kursiyerler).filter(k => k.asama === 'Ehliyet' && k.kapanis && !k.kapanis.arsiv);
  const hakBitti = sb(S.kursiyerler).filter(k => k.hakBitti && !k.hakBitti.cozuldu);
  const devirAday = S.adaylar.filter(a => a.devir).length;
  const sahipsiz = (S.sahipsizEvrak || []).length, onayBekleyen = sb(S.kursiyerler).filter(k => Object.keys(k.evrakYuklenen || {}).some(x => !k.evrak[x]));
  const yapilacak = [
    sahipsiz && ['uyari', `WhatsApp’tan gelen ${sahipsiz} belge kime ait?`, 'Gönderen numara bir öğrenciyle eşleşmedi; öğrenciyi ve belge türünü seçin.', '#/genel/evrak', 'Eşleştir'],
    onayBekleyen.length && ['bilgi', `${onayBekleyen.length} öğrencinin gönderdiği belge onay bekliyor`, 'Telefondan ya da WhatsApp’tan geldi; açıp kontrol edin, onaylayın.', '#/kursiyer/' + onayBekleyen[0].id, 'Aç'],
    ...denetimEksikleri().filter(x => x[0] === 'dur' && !x[1].includes('SN ')).slice(0, 2).map(x => [x[0], x[1], x[2], x[3], 'Düzelt']),
    ...sb(S.araclar).filter(a => { const t = tuketim(a); return t && t.yuksek; }).slice(0, 2).map(a => { const t = tuketim(a); return ['uyari', `${a.plaka} yakıt tüketimi yüksek`, `Son dolum ${String(t.son || t.ort).replace('.', ',')} L/100 km; aracın ortalaması ${String(t.ort).replace('.', ',')}, beklenen ~${String(beklenenTuketim(a)).replace('.', ',')}. Kaçak, lastik basıncı, sürüş ya da yanlış kayıt olabilir.`, '#/filo/masraf', 'Gör']; }),
    ...belgeBiten.map(a => ['dur', `${a.plaka} · ${fark(a.sigorta) <= 21 ? 'sigorta' : 'muayene'} ${goreli(fark(a.sigorta) <= 21 ? a.sigorta : a.muayene)} bitiyor`, a.model, '#/filo', 'Gör']),
    devir && ['uyari', `${devir} müşteri sizi bekliyor`, 'Asistanın size devrettiği konuşmalar.', '#/sosyal/devir', 'Cevapla'],
    geciken.length && ['uyari', `${geciken.length} kursiyerin taksiti gecikti`, tl(gecikenTutar) + ' tahsil edilmedi.', '#/kasa/geciken', 'Hatırlat'],
    hakBitti.length && ['yasak', `${hakBitti.length} kursiyerin sınav hakkı doldu`, 'Yeniden kayıt ya da kayıt kapatma kararı bekliyor.', '#/kursiyer/' + hakBitti[0].id, 'Karar ver'],
    yeniAday.length && ['bilgi', `${yeniAday.length} yeni öğrenci cevap bekliyor`, devirAday ? `Asistan ${devirAday} soruyu bilemedi ve size devretti; diğerlerine ilk cevabı verdi.` : 'Asistan ilk cevabı verdi; kayıt görüşmesine çevirin.', '#/adaylar', 'Aç'],
    kapanmayan.length && ['bilgi', `${kapanmayan.length} kursiyerin dosyası kapanmadı`, 'Ehliyet sınavını geçtiler; sertifika ya da arşiv adımı bekliyor.', '#/kursiyerler/Ehliyet', 'Kapat'],
    mebBekleyen && ['zorunlu', `${mebBekleyen} kursiyer MEBBİS’e girilecek`, S.kurs.mebYontem === 'arac' ? 'Evrakları tamam; tek tuşla aktarın.' : 'Evrakları tamam; sıralı girişle sırayla girin.', '#/meb', S.kurs.mebYontem === 'arac' ? 'Aktar' : 'Başla'],
    evrakEksik.length && ['yasak', `${evrakEksik.length} kursiyerin evrakı eksik`, 'MEB kaydı bu evraklar tamamlanınca yapılabilir.', '#/meb/evrak', 'Hatırlat'],
    ...haftaSinav.map(s => ['zorunlu', `${s.tur} · ${goreli(s.tarih)} ${s.saat}`, s.kursiyerler.length + ' kursiyer · ' + s.yer, '#/sinavlar', 'Listeyi aç']),
  ].filter(Boolean);
  const gorusme = ((S.sosyal && S.sosyal.slotlar) || []).filter(x => x.dolu && x.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  if (gorusme.length) yapilacak.splice(2, 0, ['zorunlu', `${gorusme.length} kayıt görüşmesi bugün`, gorusme.map(x => x.saat + ' ' + x.dolu).join(', '), '#/sosyal/kural', 'Gör']);
  const isD = S.isDurum || (S.isDurum = {}), bugunT = gun(0), anahtar = x => x[3] + '|' + x[1];
  const gorunen = yapilacak.filter(x => { const d = isD[anahtar(x)]; return !d || !((d.durum === 'tamam' && d.tarih === bugunT) || (d.durum === 'ertele' && d.tarih >= bugunT)); });
  const benim = oturum.kullanici && oturum.kullanici.rol === 'sekreter';
  if (benim) gorunen.sort((a, b) => ((isD[anahtar(b)] || {}).durum === 'atandi') - ((isD[anahtar(a)] || {}).durum === 'atandi'));
  const bitenSay = yapilacak.length - gorunen.length;
  const ilk5 = gorunen.slice(0, 5), kalan = gorunen.slice(5);
  const isSatir = x => { const [t, b, a, h, f] = x, d = isD[anahtar(x)], key = e(anahtar(x)); return `<li>${isaret(t, 26)}<a href="${h}" style="min-width:0;flex:1"><b style="color:var(--murekkep);font-weight:700;display:block">${e(b)}${d && d.durum === 'atandi' ? ' ' + rozet(e(d.kim) + '’da', 'mor') : ''}</b><small style="color:var(--soluk);font-size:13px">${e(a)}</small></a><span class="is-eylem"><a class="dg ${t === 'dur' ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" href="${h}">${f}</a><button class="dg-ikon is-btn" data-is="tamam" data-key="${key}" title="Tamamlandı" aria-label="Tamamlandı">${ik('tik')}</button><button class="dg-ikon is-btn" data-is="ertele" data-key="${key}" title="Yarına ertele" aria-label="Yarına ertele">${ik('saat')}</button>${benim ? '' : `<button class="dg-ikon is-btn" data-is="ata" data-key="${key}" title="Ön büroya ver" aria-label="Ön büroya ver">${ik('kursiyer')}</button>`}</span></li>`; };
  const kurBitmedi = kurulumAdimlari().filter(x => !x[1]).length;

  const aracSerit = sb(S.araclar).map(a => { const d = bugunDers.filter(x => x.arac === a.id), yp = d.filter(x => x.durum === 'Yapıldı').length, simdi = d.find(x => x.durum === 'Planlandı'); return `<a class="kart arac-kart" href="#/filo" style="padding:8px">${aracGorsel(a)}<div style="padding:2px 6px 4px"><b style="display:block;font-family:var(--baslik);font-size:15.5px;color:var(--murekkep)">${e((egitmen(a.egitmen) || { ad: 'Havuz aracı' }).ad)}</b><span style="font-size:13.5px">${d.length ? `${yp}/${d.length} ders${simdi ? ' · sıradaki ' + simdi.saat : ' · bitti'}` : 'Bugün ders yok'}</span>${ilerleme(yp, Math.max(1, d.length), 'yesil')}</div></a>`; }).join('');

  const dersSatir = d => { const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac); return `<li>
      <span class="zaman">${d.saat}</span>
      <a class="kisi" href="#/kursiyer/${k.id}" style="flex:1"><div><b>${e(tamAd(k))}</b><small>${e(eg.ad)} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon}. ders</small></div></a>
      <span class="sag">${ar ? plaka(ar.plaka) : ''}${d.durum === 'Planlandı' ? rozet('Sırada', 'mavi') : rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : 'kirmizi')}</span></li>`; };

  const yolDurak = `<div class="yolculuk"><div class="yolculuk-serit"></div>${ASAMALAR.map((a, i) => `<a class="durak" href="#/kursiyerler/${encodeURIComponent(a)}" style="left:${i / (ASAMALAR.length - 1) * 100}%"><b>${asamaSay[i]}</b><span>${a}</span></a>`).join('')}</div>`;

  return {
    baslik: 'Genel bakış',
    html: `
    ${kurBitmedi && oturum.kullanici && oturum.kullanici.rol === 'mudur' ? `<a class="kurulum-serit" href="#/kurulum">${isaret('zorunlu', 22)}<span>Kurulumda <b>${kurBitmedi} adım</b> kaldı. Kalanların çoğunu biz yapıyoruz.</span><span class="dg dg-cizgi dg-kucuk">Kuruluma git</span></a>` : ''}
    <div class="izgara iz-21">
      <div class="kart bugun-kart"><div class="kart-bas"><h3>Bugün yapılacaklar</h3><small>${gorunen.length ? 'Önem sırasıyla' : ''}${bitenSay ? ' · ' + bitenSay + ' iş tamamlandı ya da ertelendi' : ''}</small></div>
        <ul class="liste" style="margin-top:8px">${ilk5.map(isSatir).join('') || '<li>' + bos('Her şey yolunda', 'Bugün sizi bekleyen iş yok.') + '</li>'}</ul>
        ${kalan.length ? `<details class="daha"><summary>${kalan.length} iş daha</summary><ul class="liste">${kalan.map(isSatir).join('')}</ul></details>` : ''}</div>
      ${yonLevhasi([
        ['Bugün direksiyon', bugunDers.length + ' ders', '#/plan', bugunDers.filter(d => d.durum === 'Yapıldı').length + ' tanesi bitti · ' + new Set(bugunDers.map(d => d.arac)).size + ' araç sahada'],
        ['Kursiyerler', akt.length + '', '#/kursiyerler', sb(S.kursiyerler).filter(k => buAyMi(k.kayit)).length + ' kişi bu ay kaydoldu'],
        ['Bu ay tahsilat', tl(tahsilBu), '#/kasa', 'Peşinat ve taksitler'],
        ['Geciken ödeme', `<span class="sari">${tl(gecikenTutar)}</span>`, '#/kasa/geciken', geciken.length + ' kursiyer'],
      ], S.kurs.ad + ' · ' + bugunMetni())}
    </div>
    <div class="ara-bosluk"></div>
    <div class="kart">
      <div class="kart-bas"><h3>Bugünün direksiyon dersleri</h3><small>${bugunDers.filter(d => d.durum === 'Yapıldı').length}/${bugunDers.length} tamamlandı</small><div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/plan">Planı aç</a></div></div>
      <ul class="liste" style="margin-top:8px">${bugunDers.length ? bugunDers.slice(0, 6).map(dersSatir).join('') : '<li>' + bos('Bugün direksiyon dersi yok', kapaliGun(gun(0)) ? (kapaliGun(gun(0)) === 'Pazar' ? 'Pazar günü kurs kapalı.' : 'Bugün resmî tatil; kurs kapalı.') : 'Plandan boş saatlere ders ekleyebilirsiniz.') + '</li>'}</ul>
      ${bugunDers.length > 6 ? `<div style="padding:8px 20px 16px"><a class="dg dg-hafif" href="#/plan">+${bugunDers.length - 6} ders daha → plan</a></div>` : ''}
    </div>
    <div class="ara-bosluk"></div>
    ${oturum.kullanici && oturum.kullanici.rol === 'mudur' ? `<div class="kart" style="margin-bottom:16px"><div class="kart-govde" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${isaret('bilgi', 26)}<div style="flex:1;min-width:220px"><b style="color:var(--murekkep)">Akşam özeti</b><p style="font-size:14px">Her akşam 19:00’da günün özeti telefonunuza WhatsApp’tan gelir: tahsilat, dersler, yeni kayıtlar, sizi bekleyenler.</p></div><span class="anahtar"><input type="checkbox" data-aksam ${(S.otomasyonlar.find(o => o.id === 'o12') || {}).acik ? 'checked' : ''} aria-label="Akşam özeti"><i></i></span><button class="dg dg-cizgi dg-kucuk" data-aksam-onizle>Önizle</button></div></div>` : ''}
    <details class="detay-blok"><summary>Diğer göstergeler: araçlar, bu ayın kazancı, kursiyer aşamaları</summary>
    <div class="ara-bosluk"></div>
    <div class="arac-izgara">${aracSerit}</div>
    <div class="ara-bosluk"></div>
    <div class="kart" style="display:flex;flex-direction:column">
        <div class="kart-bas"><h3>Sinyal bu ay ne kazandırdı?</h3></div>
        <ul class="liste" style="margin-top:6px;flex:1">
          <li>${isaret('tamam', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.doldurulan} boş saat dolduruldu</b><small style="color:var(--soluk)">İptal edilen dersler bekleme listesine teklif edildi · ders başı ${tl(ortDers)}</small></div><b class="sayi" style="color:var(--yesil);font-size:16px">+${tl(kz.doldurulan * ortDers)}</b></li>
          <li>${isaret('tamam', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.ekDers} ek ders satıldı</b><small style="color:var(--soluk)">Kalma riski olan kursiyerlere önerildi · ders başı ${tl(ortDers)}</small></div><b class="sayi" style="color:var(--yesil);font-size:16px">+${tl(kz.ekDers * ortDers)}</b></li>
          <li>${isaret('bilgi', 28)}<div style="flex:1"><b style="display:block;color:var(--murekkep);font-family:var(--baslik);font-size:16px">${kz.yorum} yeni Google yorumu</b><small style="color:var(--soluk)">Ehliyet alanlara otomatik istendi</small></div><b class="sayi" style="color:var(--murekkep);font-size:16px">${S.kurs.puan != null ? S.kurs.puan.toLocaleString('tr-TR') + ' ★' : ''}</b></li>
        </ul>
    </div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Kursiyerler hangi aşamada?</h3><small>Bir aşamaya dokunun, o kursiyerler açılsın</small></div><div class="kart-govde"><div class="yolculuk-kap">${yolDurak}</div></div></div>
    </details>`,
    baglan(k) {
      if (alt === 'evrak') { history.replaceState(null, '', '#/genel'); import('./evrak.js?v=76').then(m => m.sahipsizPencere(yenile)); }
      k.addEventListener('click', ev => {
        const b = ev.target.closest('[data-is]');
        if (b) { ev.preventDefault(); const key = b.dataset.key, ad = { tamam: 'Tamamlandı', ertele: 'Yarına ertelendi', ata: 'Ön büroya verildi' }[b.dataset.is]; S.isDurum[key] = b.dataset.is === 'tamam' ? { durum: 'tamam', tarih: gun(0) } : b.dataset.is === 'ertele' ? { durum: 'ertele', tarih: gun(1) } : { durum: 'atandi', tarih: gun(0), kim: 'Selda Korkmaz' }; islem('Görev: ' + ad, key.split('|')[1]); kaydet(); bildir(ad); yenile(); return; }
        if (ev.target.closest('[data-aksam-onizle]')) {
          const metin = aksamOzeti();
          pencere({ baslik: 'Akşam özeti · önizleme', icerik: `<div class="balon giden" style="max-width:100%;white-space:pre-line">${e(metin)}</div><p style="font-size:13px;color:var(--soluk);margin-top:10px">Kurs müdürünün telefonuna her akşam 19:00’da bu biçimde gelir.</p>` });
        }
      });
      k.addEventListener('change', ev => { if (ev.target.matches('[data-aksam]')) { S.kurs.aksamOzet = ev.target.checked; const o12 = S.otomasyonlar.find(o => o.id === 'o12'); if (o12) o12.acik = ev.target.checked; kaydet(); bildir(ev.target.checked ? 'Akşam özeti her gün 19:00’da gelecek' : 'Akşam özeti kapatıldı'); } });
    },
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
      ${a.devir ? `<div class="alt-satir" style="color:var(--kirmizi);font-weight:700">${ik('uyari')} Asistan bilemedi · cevap sizde</div>` : ''}
      ${adayGorusme(a) ? `<div class="alt-satir" style="color:var(--levha);font-weight:700">${ik('takvim')} Görüşme ${goreli(adayGorusme(a).tarih)} ${adayGorusme(a).saat}</div>` : ''}
      ${a.not ? `<div class="alt-satir">${e(a.not)}</div>` : ''}
    </div>`;
  return {
    baslik: 'Yeni öğrenciler', alt: 'WhatsApp, Instagram ve Google Haritalar’dan gelen ön kayıtlar',
    html: `${ekranNotu('Kursu soran herkes burada. Asistan ilk cevabı verir; siz kartı açıp kayda çevirirsiniz.')}
    <div class="izgara iz-4">
      <div class="kart gosterge"><small>Son 7 günde gelen</small><b>${bu.length}</b><span>${bu.filter(a => fark(a.tarih) === 0).length} tanesi bugün</span></div>
      <div class="kart gosterge"><small>Kayda dönüşen</small><b>%${Math.round(kayit / Math.max(1, kapanan) * 100)}</b><span>${kayit} kayıt / ${kapanan} sonuçlanan</span></div>
      <div class="kart gosterge"><small>İlk cevap süresi</small><b>Anında</b><span>Asistan 7/24 cevaplıyor · gece gelen ${S.adaylar.filter(a => a.saat > '21:00' || a.saat < '08:30').length} mesaj</span></div>
      <div class="kart gosterge"><small>En çok aday getiren</small><b style="font-size:22px">${kaynak.length ? e(kaynak.sort((a, b) => b[1] - a[1])[0][0]) : '—'}</b><span>${kaynak.map(([k, n]) => k + ' ' + n).join(' · ')}</span></div>
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
// Kayıt görüşmeleri tek takvimde: S.sosyal.slotlar (asistanın verdiği ve sizin verdiğiniz randevular birlikte)
const adayGorusme = a => ((S.sosyal && S.sosyal.slotlar) || []).filter(x => x.dolu && (x.aday === a.id || (!x.aday && x.dolu === a.ad)) && fark(x.tarih) >= 0).sort((x, y) => (x.tarih + x.saat).localeCompare(y.tarih + y.saat))[0];
const telAc = t => (t || '').replace(/\D/g, '').replace(/^0/, '');
function gorusmeAyarla(a) {
  const sl = bosSaatler(9), g = adayGorusme(a);
  if (!sl.length) return bildir('Önümüzdeki 3 haftada boş görüşme saati yok. Sosyal medya › Kurallar’dan saat ekleyin.', 'uyari');
  pencere({
    baslik: 'Kayıt görüşmesi · ' + a.ad,
    icerik: `${g ? `<p class="ipucu" style="margin-bottom:12px">${isaret('bilgi', 18)}<span>Şu anki görüşme ${tarihUzun(g.tarih)} ${g.saat}. Yeni saati seçince eskisi boşalır.</span></p>` : ''}<p style="margin-bottom:10px;font-size:14px">Asistanın da kullandığı takvimdeki boş saatler:</p>
      <div class="secim" style="flex-direction:column;align-items:stretch">${sl.map((x, i) => `<label><input type="radio" name="sl" value="${i}" ${i === 0 ? 'checked' : ''}><span>${tarihUzun(x.tarih)} · ${x.saat}</span></label>`).join('')}</div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" checked name="bildir"> Adaya ${e(a.kanal)}’tan bildir</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Görüşmeyi kaydet</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        const x = sl[+d.querySelector('[name=sl]:checked').value], L = S.sosyal.slotlar;
        if (g) L.splice(L.indexOf(g), 1);
        L.push({ tarih: x.tarih, saat: x.saat, dolu: a.ad, aday: a.id, kanal: a.kanal });
        if (!['Kayıt', 'Kaybedildi'].includes(a.asama)) a.asama = 'Görüşme';
        a.takip = x.tarih;
        const metin = `${selam(a.ad)} ${tarihUzun(x.tarih)} ${x.saat} için ${kursAdi('de')} kayıt görüşmenizi ayarladık. Adresimiz ${S.kurs.adres}. Gelirken kimliğinizi getirin.`;
        a.mesajlar.push({ kim: 'kurs', metin }); islem('Kayıt görüşmesi ayarladı', a.ad + ' · ' + tarih(x.tarih) + ' ' + x.saat); kaydet();
        if (!d.querySelector('[name=bildir]').checked) bildir('Görüşme kaydedildi'); else wpGonder(a.ad, metin, 'Görüşme bildirimi');
        adayAc(a.id); yenile();
      });
    },
  });
}
function adayAc(id) {
  const a = S.adaylar.find(x => x.id === id); if (!a) return;
  const g = adayGorusme(a), sonSoru = (a.mesajlar.filter(m => m.kim === 'aday').slice(-1)[0] || {}).metin || '';
  pencere({
    baslik: a.ad, genis: true,
    icerik: `<div class="izgara" style="grid-template-columns:1.3fr 1fr;gap:20px" >
      <div class="kart" style="box-shadow:none;overflow:hidden"><div class="sohbet-pencere" style="min-height:340px">
        <div class="sohbet-ust">${ik(a.kanal === 'Instagram' ? 'ig' : 'wp')}<b style="color:var(--murekkep)">${e(a.kanal)}</b><small style="color:var(--soluk)">${e(a.tel)}</small></div>
        <div class="sohbet-akis">${a.mesajlar.map(m => `<div class="balon ${m.kim !== 'aday' ? 'giden' : ''}">${e(m.metin)}<small>${m.kim === 'asistan' ? ik('robot') + ' Asistan' : m.kim === 'kurs' ? 'Siz' : ''}</small></div>`).join('')}</div>
        <form class="sohbet-yaz" data-yaz><input class="girdi" name="m" placeholder="${a.devir ? 'Adayın sorusuna cevabınızı yazın' : 'Mesaj yazın'}" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('gonder')}</button></form>
        ${a.devir ? `<label style="display:flex;gap:8px;align-items:center;padding:0 14px 12px;font-size:13.5px"><input type="checkbox" data-ogret checked> Bu cevabı asistana da öğret; bir dahakine kendisi cevaplasın</label>` : ''}
      </div></div>
      <div>
        ${a.devir ? `<div class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span><b>Asistan bu soruyu bilemedi ve size devretti.</b> ${e(a.devir)}. Adaya “yetkilimiz 30 dakika içinde dönecek” dedi.</span></div>` : ''}
        <dl class="bilgi-tablo"><dt>Kaynak</dt><dd>${e(a.kaynak)}</dd><dt>Sınıf</dt><dd>${SINIFLAR[a.sinif].ad}</dd><dt>İlk mesaj</dt><dd>${goreli(a.tarih)} ${a.saat}</dd><dt>Telefon</dt><dd>${e(a.tel)}</dd></dl>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          <a class="dg dg-cizgi dg-kucuk" href="tel:+90${telAc(a.tel)}">${ik('tel')}Ara</a>
          <a class="dg dg-wp dg-kucuk" href="https://wa.me/90${telAc(a.tel)}" target="_blank" rel="noopener">${ik('wp')}WhatsApp’ta aç</a>
          <button class="dg dg-cizgi dg-kucuk" data-gorusme-ayarla ${a.asama === 'Kaybedildi' ? 'disabled' : ''}>${ik('takvim')}${g ? 'Görüşmeyi değiştir' : 'Görüşme ayarla'}</button>
        </div>
        ${g ? `<div class="ipucu" style="margin-top:12px">${isaret('tamam', 18)}<span>Kayıt görüşmesi <b>${tarihUzun(g.tarih)} ${g.saat}</b> · ${g.aday ? 'takvimde' : 'asistan verdi'} <button class="dg dg-hafif dg-kucuk" data-gorusme-iptal>İptal et</button></span></div>` : ''}
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
        a.mesajlar.push({ kim: 'kurs', metin: m });
        if (a.devir) {
          const og = d.querySelector('[data-ogret]');
          if (og && og.checked) { S.asistanBilgi.push({ konu: 'Aday sorusu: ' + sonSoru.slice(0, 48), soru: sonSoru, metin: m, onay: gun(0) }); islem('Asistana bilgi ekledi', sonSoru); }
          S.sosyal.bilinmeyen = S.sosyal.bilinmeyen.filter(x => x.soru !== sonSoru); S.devredilen = S.devredilen.filter(x => x.aday !== a.id);
          a.devir = null; if (a.asama === 'Yeni') a.asama = 'Bilgi verildi';
          kaydet(); wpGonder(a.ad, m, 'Devredilen konuşma'); adayAc(a.id); yenile(); return;
        }
        kaydet(); wpGonder(a.ad, m);
        const ak = d.querySelector('.sohbet-akis'); ak.insertAdjacentHTML('beforeend', `<div class="balon giden">${e(m)}<small>Siz</small></div>`); ak.scrollTop = 1e5; ev.target.reset();
      });
      d.querySelector('[data-gorusme-ayarla]').addEventListener('click', () => gorusmeAyarla(a));
      const gi = d.querySelector('[data-gorusme-iptal]'); if (gi) gi.addEventListener('click', () => { const L = S.sosyal.slotlar; L.splice(L.indexOf(g), 1); islem('Görüşmeyi iptal etti', a.ad + ' · ' + tarih(g.tarih) + ' ' + g.saat); kaydet(); bildir('Görüşme iptal edildi; saat yeniden boş'); adayAc(a.id); yenile(); });
      const ogrenci = a.mesajlar.some(m => m.kim === 'aday' && /öğrenci/i.test(m.metin)) && a.mesajlar.some(m => m.kim !== 'aday' && /indirim/i.test(m.metin));
      d.querySelector('[data-donustur]').addEventListener('click', () => { kaydetAday(); kursiyerFormu({ ad: a.ad.split(' ')[0], soyad: a.ad.split(' ').slice(1).join(' '), tel: a.tel, sinif: a.sinif, kaynak: a.kaynak, adayId: a.id, indirim: ogrenci ? 'Öğrenci belgesi' : '' }); });
    },
  });
}
export function adayEkle() {
  pencere({
    baslik: 'Aday ekle',
    icerik: `<form class="form-izgara" id="f-aday"><div class="alan"><label>Ad soyad</label><input name="ad" required></div><div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" required placeholder="05xx xxx xx xx"></div>
      <div class="alan"><label>Sınıf</label><select name="sinif">${aktifSiniflar().map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select></div>
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
function kayitOnayGoster(f, devam) {
  const pen = f.closest('.pencere'); if (!pen) return devam();
  const B = x => String(x || '').trim().toLocaleUpperCase('tr'), g = (S.gruplar || []).find(x => x.id === f.grup.value), cins = (f.querySelector('[name=cinsiyet]:checked') || {}).value;
  const eksik = [...f.querySelectorAll('#k-kontrol li')].filter(li => { const sp = li.querySelector('span'); return sp && sp.style.fontWeight === '700'; }).map(li => li.textContent.trim());
  const satir = (a, b) => `<div><span>${a}</span><b>${e(b || '—')}</b></div>`;
  const o = document.createElement('div'); o.className = 'kayit-onay';
  o.innerHTML = `<div class="kayit-onay-ic"><h3>MEBBİS’e gidecek bilgiler doğru mu?</h3>
    <p class="ipucu uyari">${isaret('uyari', 20)}<span>MEB modülüne girilen ad, soyad, TC, doğum tarihi ve fotoğraf <b>o dönem düzeltilemez</b>. Kimlik kartıyla bir kez karşılaştırın.</span></p>
    <div class="kayit-onay-tablo">${satir('Ad', B(f.ad.value))}${satir('Soyad', B(f.soyad.value))}${satir('TC kimlik no', f.tc.value.trim())}${satir('Doğum tarihi', f.dogumTarihi.value ? f.dogumTarihi.value.split('-').reverse().join('.') : '')}${satir('Cinsiyet', cins)}${satir('Sınıf', SINIFLAR[f.sinif.value].ad)}${satir('Teorik grup', g ? g.ad + ' · ' + g.baslangic.split('-').reverse().join('.') : '')}${satir('Telefon', f.tel.value.trim())}</div>
    ${eksik.length ? `<p class="kayit-onay-eksik"><b>${eksik.length} eksik:</b> ${e(eksik.join(' · '))}. Kayıt yapılabilir; eksikler tamamlanmadan MEBBİS’e aktarılmaz.</p>` : `<p class="kayit-onay-tamam">${isaret('tamam', 18)}MEBBİS ön kontrolünün hepsi tamam.</p>`}
    <p style="font-size:13px;color:var(--soluk)">Kayıttan sonra dosyada öğrencinin fotoğrafını çekin; MEBBİS’e o aktarılır.</p>
    <div class="kayit-onay-dugme"><button type="button" class="dg dg-cizgi" data-onay-duzelt>Düzelt</button><button type="button" class="dg dg-ana" data-onay-tamam>${isaret('tamam', 18)}Bilgiler doğru, kaydet</button></div></div>`;
  pen.appendChild(o);
  o.querySelector('[data-onay-duzelt]').addEventListener('click', () => o.remove());
  o.querySelector('[data-onay-tamam]').addEventListener('click', () => { o.remove(); devam(); });
  o.querySelector('[data-onay-tamam]').focus();
}
export function kursiyerFormu(on = {}) {
  pencere({
    baslik: 'Yeni kursiyer',
    icerik: `<form class="form-izgara" id="f-kursiyer">
      <div class="alan"><label for="k-ad">Ad</label><input id="k-ad" name="ad" value="${e(on.ad || '')}" required autocomplete="off"></div>
      <div class="alan"><label for="k-soyad">Soyad</label><input id="k-soyad" name="soyad" value="${e(on.soyad || '')}" required autocomplete="off"></div>
      <div class="alan"><label for="k-tel">Telefon</label><input id="k-tel" name="tel" inputmode="tel" value="${e(on.tel || '')}" placeholder="05xx xxx xx xx" required></div>
      <div class="alan"><label for="k-tc">TC kimlik no</label><input id="k-tc" name="tc" inputmode="numeric" maxlength="11" value="${e(on.tc || '')}" required autocomplete="off"><small class="tc-not" style="color:var(--soluk)">MEB kaydı için gerekli</small></div>
      <div class="alan"><label for="k-dogum">Doğum tarihi</label><input id="k-dogum" name="dogumTarihi" type="date" value="${e(on.dogumTarihi || '')}"></div>
      <div class="alan"><span class="et">Cinsiyet</span><div class="secim">${['Kadın', 'Erkek'].map(x => `<label><input type="radio" name="cinsiyet" value="${x}" ${on.cinsiyet === x ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
      <div class="alan"><label for="k-ogrenim">Öğrenim durumu</label><select id="k-ogrenim" name="ogrenim">${['İlkokul', 'Ortaokul', 'Lise', 'Önlisans', 'Lisans', 'Yüksek lisans'].map(x => `<option ${x === 'Lise' ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="alan"><label for="k-mevcut">Mevcut ehliyeti</label><select id="k-mevcut" name="mevcut"><option value="">Yok</option><option>B</option><option>A2</option><option>A</option><option>C</option></select></div>
      <div class="alan tam"><label for="k-adres">Adres</label><input id="k-adres" name="adres" value="${e(on.adres || '')}" placeholder="Mahalle, ilçe" autocomplete="street-address"></div>
      <div class="alan"><label for="k-kaynak">Nereden geldi?</label><select id="k-kaynak" name="kaynak">${KAYNAKLAR.map(k => `<option ${k === on.kaynak ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <div class="alan tam"><span class="et">Sınıf</span><div class="secim">${satistaSiniflar().map(([k, v], i) => `<label><input type="radio" name="sinif" value="${k}" ${(on.sinif ? k === on.sinif : i === 0) ? 'checked' : ''}><span>${v.ad} · ${tl(v.ucret)}</span></label>`).join('')}</div></div>
      <div class="alan"><label for="k-egitmen">Usta öğretici</label><select id="k-egitmen" name="egitmen"></select><small id="k-arac" style="color:var(--soluk)"></small></div>
      <div class="alan"><label for="k-indirim">İndirim</label><select id="k-indirim" name="indirim"><option value="">Yok</option>${(S.kurs.indirimler || []).map((x, i) => `<option value="${i}" ${on.indirim === x.ad ? 'selected' : ''}>${e(x.ad)} · −${tl(x.tutar)}</option>`).join('')}<option value="ozel">Özel tutar</option></select>${on.indirim ? `<small style="color:var(--levha);font-weight:700">Asistan yazışmada bu indirimi söyledi</small>` : ''}</div>
      <div class="alan" id="k-ozel-alan" hidden><label for="k-ozel">İndirim tutarı (₺)</label><input id="k-ozel" name="ozel" inputmode="numeric" placeholder="Örn. 1500"></div>
      <div class="alan"><label for="k-pesin">Peşinat</label><input id="k-pesin" name="pesin" inputmode="numeric" value="8000"></div>
      <div class="alan"><label for="k-yontem">Peşinat nasıl ödendi?</label><select id="k-yontem" name="yontem"><option value="">Seçin</option>${YONTEMLER.map(y => `<option value="${y}">${yontemAd(y)}</option>`).join('')}</select></div>
      <div class="alan"><label for="k-taksit">Taksit sayısı</label><select id="k-taksit" name="taksit">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === 4 ? 'selected' : ''}>${n ? n + ' taksit' : 'Peşin'}</option>`).join('')}</select></div>
      <div class="alan"><span class="et">Ödeme planı</span><div id="k-plan" class="ipucu" style="min-height:40px"></div></div>
      <div class="alan"><label for="k-grup">Teorik grup</label><select id="k-grup" name="grup">${S.gruplar.map(g => `<option value="${g.id}">${g.ad} · ${tarih(g.baslangic)} başlıyor</option>`).join('')}</select></div>
      <div class="alan tam"><span class="et">Teslim alınan evraklar</span><div class="secim">${EVRAKLAR.filter(([k]) => k !== 'sozlesme').map(([k, t]) => `<label><input type="checkbox" name="ev-${k}"><span>${t}</span></label>`).join('')}</div><small style="color:var(--soluk)">Sözleşme, kayıt oluşunca ekranda imzalatılır ya da yazdırılır.</small></div>
      <div class="alan"><label for="k-rno">Sağlık raporu no</label><input id="k-rno" name="raporNo" placeholder="Rapordaki numara" autocomplete="off"></div>
      <div class="alan"><label for="k-rtar">Rapor tarihi</label><input id="k-rtar" name="raporTarih" type="date"></div>
      <div class="alan tam"><label for="k-adli">Adli sicil barkodu</label><input id="k-adli" name="adliBarkod" placeholder="e-Devlet belgesinin altındaki barkod numarası" autocomplete="off"></div>
      <label class="tam" style="display:flex;gap:10px;align-items:center;font-size:14px"><input type="checkbox" name="hos" checked style="width:18px;height:18px"> Hoş geldin mesajı ve ödeme planını WhatsApp’tan gönder</label>
      <label class="tam" style="display:flex;gap:10px;align-items:flex-start;font-size:14px"><input type="checkbox" name="kvkk" style="width:18px;height:18px;margin-top:2px"> <span>KVKK aydınlatma metni verildi, açık rıza alındı <small style="color:var(--soluk);display:block">Sağlık raporu ve adli sicil özel nitelikli veridir; rıza olmadan kaydedilemez.</small></span></label>
      <div class="tam kart" style="padding:12px 14px"><b class="et" style="display:block;margin-bottom:6px">MEBBİS ön kontrol</b><ul id="k-kontrol" style="list-style:none;display:grid;gap:5px;font-size:13.5px"></ul></div>
    </form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-kursiyer">Kaydı oluştur</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      const indirimTutar = () => { const v = f.indirim.value; if (!v) return 0; if (v === 'ozel') return +f.ozel.value.replace(/\D/g, '') || 0; return S.kurs.indirimler[+v].tutar; };
      const indirimAd = () => { const v = f.indirim.value; return !v ? null : v === 'ozel' ? 'Özel indirim' : S.kurs.indirimler[+v].ad; };
      const guncelle = () => {
        const s = f.sinif.value, eg = S.egitmenler.filter(x => x.siniflar.includes(s));
        const onceki = f.egitmen.value;
        f.egitmen.innerHTML = eg.map(x => `<option value="${x.id}" ${x.id === onceki ? 'selected' : ''}>${x.ad}</option>`).join('');
        const ar = ustaAraci(f.egitmen.value, s); d.querySelector('#k-arac').textContent = ar ? 'Araç: ' + ar.model + ' · ' + ar.plaka + ' · ' + ar.vites : 'Bu usta öğreticinin bu sınıfta aracı yok';
        d.querySelector('#k-ozel-alan').hidden = f.indirim.value !== 'ozel';
        const u = SINIFLAR[s].ucret - indirimTutar(), p = Math.min(u, +f.pesin.value.replace(/\D/g, '') || 0), n = +f.taksit.value;
        d.querySelector('#k-plan').innerHTML = (indirimTutar() ? `<s style="color:var(--soluk)">${tl(SINIFLAR[s].ucret)}</s> ${tl(u)} · ` : '') + (n ? `${tl(p)} peşin + ${n} × ${tl((u - p) / n)}` : `${tl(u)} peşin`);
        const gec = { id: '_yeni', tc: f.tc.value.trim(), dogumTarihi: f.dogumTarihi.value, sinif: s, asama: 'Kayıt', kayit: gun(0), teorikGrup: f.grup.value, evrak: Object.fromEntries(EVRAKLAR.map(([x]) => [x, x === 'sozlesme' || f['ev-' + x].checked])), kvkk: { riza: f.kvkk.checked }, cinsiyet: (f.querySelector('[name=cinsiyet]:checked') || {}).value, saglikRapor: { no: f.raporNo.value.trim(), tarih: f.raporTarih.value }, adliSicil: { barkod: f.adliBarkod.value.trim() } };
        d.querySelector('#k-kontrol').innerHTML = mebOnKontrol(gec).map(([ok, t]) => `<li style="display:flex;gap:8px;align-items:center">${isaret(ok ? 'tamam' : 'uyari', 16)}<span style="color:${ok ? 'var(--metin)' : 'var(--murekkep);font-weight:700'}">${t}</span></li>`).join('');
      };
      f.addEventListener('input', guncelle); f.addEventListener('change', guncelle); guncelle();
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        if (!f.ad.value.trim() || !f.soyad.value.trim() || f.tel.value.replace(/\D/g, '').length < 10) return bildir('Ad, soyad ve geçerli bir telefon gerekli', 'uyari');
        const asg = SINIFLAR[f.sinif.value].yas || S.kurs.asgariYas, yasi = yas(f.dogumTarihi.value); if (yasi != null && yasi < asg) return bildir(`Kursiyer ${yasi} yaşında; ${SINIFLAR[f.sinif.value].ad} için en az ${asg} yaş gerekir`, 'uyari');
        if (S.kursiyerler.some(x => x.tc === f.tc.value.trim() && x.sinif === f.sinif.value && x.asama !== 'Ehliyet')) return bildir('Bu TC ile aynı sınıfa açık bir kayıt zaten var', 'uyari');
        if (!f.querySelector('[name=cinsiyet]:checked')) return bildir('Cinsiyeti seçin; MEBBİS’te zorunlu alan', 'uyari');
        if (!f.kvkk.checked) return bildir('KVKK aydınlatma ve açık rıza alınmadan kayıt yapılamaz', 'uyari');
        if (indirimTutar() >= SINIFLAR[f.sinif.value].ucret) return bildir('İndirim kurs ücretinden büyük olamaz', 'uyari');
        if (+f.taksit.value && (+f.pesin.value.replace(/\D/g, '') || 0) > 0 && !f.yontem.value) { f.yontem.focus(); return bildir('Peşinatın nasıl ödendiğini seçin', 'uyari'); }
        if (!+f.taksit.value && !f.yontem.value) { f.yontem.focus(); return bildir('Ödemenin nasıl alındığını seçin', 'uyari'); }
        if (!tcGecerli(f.tc.value.trim())) { f.tc.focus(); f.querySelector('.tc-not').textContent = 'Bu TC kimlik numarası geçerli değil'; f.querySelector('.tc-not').style.color = 'var(--kirmizi)'; return bildir('TC kimlik numarası geçerli değil', 'uyari'); }
        // MEBBİS'e gidecek bilgiler kayıttan önce bir kez gösterilir: MEB'de hatalı bilgi o dönem düzeltilemez
        if (!f.dataset.onay) return kayitOnayGoster(f, () => { f.dataset.onay = '1'; f.requestSubmit(); });
        const s = f.sinif.value, ind = indirimTutar(), u = SINIFLAR[s].ucret - ind, n = +f.taksit.value;
        const p = n ? Math.min(u, +f.pesin.value.replace(/\D/g, '') || 0) : u;
        const taksitler = [];
        if (n && p >= u) { f.pesin.focus(); return bildir('Taksit seçildiyse peşinat kurs ücretinden küçük olmalı', 'uyari'); }
        for (let i = 0; i < n; i++) { const t = Math.floor((u - p) / n / 50) * 50; taksitler.push({ vade: ayEkle(gun(0), i + 1), tutar: i === n - 1 ? (u - p) - t * (n - 1) : t, odendi: null, yontem: null }); }
        const ev2 = {}; EVRAKLAR.forEach(([k]) => ev2[k] = k !== 'sozlesme' && f['ev-' + k].checked);
        const yeni = { id: 'k' + Date.now(), ad: f.ad.value.trim(), soyad: f.soyad.value.trim(), tel: f.tel.value.trim(), tc: f.tc.value.trim(), dogumTarihi: f.dogumTarihi.value, ogrenim: f.ogrenim.value, adres: f.adres.value.trim(), cinsiyet: f.querySelector('[name=cinsiyet]:checked').value, saglikRapor: f.raporNo.value.trim() ? { no: f.raporNo.value.trim(), tarih: f.raporTarih.value ? f.raporTarih.value.split('-').reverse().join('.') : '' } : null, adliSicil: f.adliBarkod.value.trim() ? { barkod: f.adliBarkod.value.trim() } : null, mevcutEhliyet: f.mevcut.value, deneme: [], acil: null, teorikGrup: f.grup.value, kvkk: { tarih: gun(0), kanal: 'Kursta imzalı form', riza: true }, dogum: (f.dogumTarihi.value || '').slice(0, 4), sinif: s, kayit: gun(0), egitmen: f.egitmen.value, asama: Object.values(ev2).every(Boolean) ? 'Teorik' : 'Evrak', teorik: 0, direksiyon: 0, evrak: ev2, mebIslendi: false, esinav: null, dsinav: null, odeme: { toplam: u, pesin: p, pesinTarih: gun(0), taksitler, ekler: [], indirim: ind ? { ad: indirimAd(), tutar: ind } : null }, kaynak: f.kaynak.value, yorum: null, notlar: [] };
        S.kursiyerler.unshift(yeni); islem('Kursiyer kaydetti', tamAd(yeni) + ' · ' + SINIFLAR[s].ad);
        if (p) S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gelir', kategori: 'Kurs ücreti', aciklama: tamAd(yeni) + (n ? ' · peşinat' : ' · peşin ödeme'), tutar: p, yontem: f.yontem.value, kursiyer: yeni.id });
        if (on.adayId) { const a = S.adaylar.find(x => x.id === on.adayId); if (a) a.asama = 'Kayıt'; }
        kaydet(); kapatPencere();
        if (f.hos.checked) { const g = S.gruplar.find(x => x.id === yeni.teorikGrup); wpGonder(yeni, `${selam(yeni)} ${kursAdi('e')} hoş geldiniz. Sınıfınız: ${SINIFLAR[s].ad}.${g ? ` Teorik dersleriniz ${tamTarih(g.baslangic)} tarihinde ${g.ad.toLocaleLowerCase('tr')} ile başlıyor.` : ''} Ödeme planınız: peşinat ${tl(p)}${taksitler.length ? '; ' + taksitler.map((t, i) => `${i + 1}) ${tamTarih(t.vade)} · ${tl(t.tutar)}`).join(', ') : ' (peşin)'}. ${odemeBilgisi()}`, 'Hoş geldin'); }
        else bildir('Kayıt oluşturuldu');
        location.hash = '#/kursiyer/' + yeni.id;
        setTimeout(() => sozlesmeImzalat(yeni), 250);
      });
    },
  });
}

export function kursiyerler(filtre) {
  let sekme = filtre && ASAMALAR.includes(filtre) ? filtre : 'Tümü', q = '', sinif = '', borclu = false;
  const say = a => a === 'Tümü' ? sb(S.kursiyerler).length : sb(S.kursiyerler).filter(k => k.asama === a).length;
  function satirlar() {
    let l = sb(S.kursiyerler).filter(k => (sekme === 'Tümü' || k.asama === sekme) && (!sinif || k.sinif === sinif) && (!borclu || gecikenler(k).length));
    if (q) { const s = q.toLocaleLowerCase('tr'); l = l.filter(k => (tamAd(k) + ' ' + k.tel).toLocaleLowerCase('tr').includes(s)); }
    if (!l.length) return `<tr><td colspan="7">${bos('Bu filtreye uyan kursiyer yok', 'Filtreyi değiştirin ya da yeni kursiyer ekleyin.')}</td></tr>`;
    return l.map(k => {
      const g = gecikenler(k), sd = sonrakiDers(k), S0 = SINIFLAR[k.sinif];
      return `<tr class="tik" data-git="${k.id}" tabindex="0">
        <td class="m-tam"><div class="kisi">${avatar(k.ad, k.soyad)}<div><b>${e(tamAd(k))}</b><small>${e(k.tel)}</small></div></div></td>
        <td class="m-gizle">${rozet(S0.ad.split(' ·')[0])} <small style="color:var(--soluk)">${S0.ad.split('· ')[1]}</small></td>
        <td style="min-width:150px">${yol(asamaNo(k))}<small style="color:var(--soluk);font-size:12px">${k.asama}${k.dsinav && k.dsinav.sonuc === 'Kaldı' ? ' · tekrar' : ''}${k.kapali ? ' · <b style="color:var(--kirmizi)">' + (k.kapali.tur === 'dondur' ? 'donduruldu' : 'kayıt kapalı') + '</b>' : ''}</small></td>
        <td class="m-gizle" style="min-width:110px"><span class="sayi" style="font-size:12.5px">${k.direksiyon}/${S0.direksiyon}</span>${ilerleme(k.direksiyon, S0.direksiyon, k.direksiyon >= S0.direksiyon ? 'yesil' : '')}</td>
        <td>${kalanBorc(k) ? `<span class="sayi">${tl(kalanBorc(k))}</span>${g.length ? '<br>' + rozet(g.length + ' taksit gecikti', 'kirmizi') : ''}` : rozet('Ödendi', 'yesil')}</td>
        <td class="m-gizle">${(() => { const r = risk(k); if (!r) return '<span style="color:var(--soluk)">—</span>'; const renk = r.puan >= 50 ? 'var(--kirmizi)' : r.puan >= 25 ? 'var(--sari)' : 'var(--yesil)'; return `<span class="risk-cubuk" title="${e(r.nedenler.join(', ') || 'Risk yok')}"><i style="width:${Math.max(6, r.puan)}%;background:${renk}"></i></span> <small style="color:var(--soluk)">${r.puan >= 50 ? 'Yüksek' : r.puan >= 25 ? 'Orta' : 'Düşük'}</small>`; })()}</td>
        <td class="m-gizle">${sd ? goreli(sd.tarih) + ' <span class="mono">' + sd.saat + '</span>' : '<span style="color:var(--soluk)">—</span>'}</td>
      </tr>`;
    }).join('');
  }
  return {
    baslik: 'Kursiyerler', alt: sb(S.kursiyerler).length + ' kayıt · ' + aktifler().length + ' aktif',
    html: `${ekranNotu('Her kursiyerin nerede olduğu, ne kadar borcu kaldığı ve sınavda kalma riski tek satırda. Satıra dokunun, dosyası açılsın.')}
    <div class="bolum-bas"><div><h2>Kursiyer listesi</h2></div><div class="sag"><button class="dg dg-cizgi" data-disa>${ik('indir')}Excel’e aktar</button><button class="dg dg-ana" data-yeni>${ik('arti')}Yeni kursiyer</button></div></div>
    <div id="sek">${sekmeler([['Tümü', 'Tümü', say('Tümü')], ...ASAMALAR.map(a => [a, a, say(a)])], sekme)}</div>
    <div class="kart">
      <div class="filtre">
        <div class="ara-kutu">${ik('ara')}<input class="girdi" type="search" placeholder="Ad ya da telefon" data-q aria-label="Kursiyer ara"></div>
        <select class="girdi" data-sinif aria-label="Sınıf"><option value="">Tüm sınıflar</option>${aktifSiniflar().map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select>
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
        if (ev.target.closest('[data-disa]')) import('./ui.js?v=76').then(u => { u.csvIndir('kursiyerler.csv', [['Ad', 'Soyad', 'Telefon', 'Sınıf', 'Aşama', 'Kayıt', 'Direksiyon', 'Toplam', 'Ödenen', 'Kalan'], ...S.kursiyerler.map(x => [x.ad, x.soyad, x.tel, SINIFLAR[x.sinif].ad, x.asama, x.kayit, x.direksiyon, x.odeme.toplam, odenen(x), kalanBorc(x)])]); bildir('Kursiyer listesi indirildi'); });
      });
      k.addEventListener('keydown', ev => { const g = ev.target.closest('[data-git]'); if (g && ev.key === 'Enter') location.hash = '#/kursiyer/' + g.dataset.git; });
      k.querySelector('[data-q]').addEventListener('input', ev => { q = ev.target.value; ciz(); });
      k.querySelector('[data-sinif]').addEventListener('change', ev => { sinif = ev.target.value; ciz(); });
    },
  };
}

/* ================= KURSİYER DOSYASI ================= */
let profilSekme = 'genel';
// Ehliyet aşaması: sınavı geçti → MEBBİS'te sertifika → borç kapandı → dosya arşivlendi
function kapanisKart(k) {
  const kp = k.kapanis || (k.kapanis = {}), borc = kalanBorc(k);
  const adim = (ok, b, a, eylem) => `<li style="display:flex;gap:10px;align-items:flex-start">${isaret(ok ? 'tamam' : 'zorunlu', 20)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--soluk)">${a}</small></div>${eylem || ''}</li>`;
  return `<div class="kart" style="grid-column:1/-1"><div class="kart-bas"><h3>Dosya kapanışı</h3><small>${kp.arsiv ? 'Arşivde · ' + tarih(kp.arsiv) : 'Ehliyete giden son adımlar'}</small></div><div class="kart-govde"><ul style="list-style:none;display:grid;gap:12px">
    ${adim(true, 'Direksiyon sınavını geçti', k.dsinav ? tarihUzun(k.dsinav.tarih) + ' · ' + k.dsinav.hak + '. hak' : '')}
    ${adim(!!kp.sertifika, 'MEBBİS’te sertifika düzenlendi', kp.sertifika ? tarih(kp.sertifika) + ' · kursiyere nüfus müdürlüğü randevusu bildirildi' : 'MEBBİS › Sertifika işlemleri’nde düzenleyin, sonra işaretleyin.', kp.sertifika ? '' : '<button class="dg dg-ana dg-kucuk" data-kapanis="sertifika">Düzenlendi</button>')}
    ${adim(!borc, 'Ödeme kapandı', borc ? tl(borc) + ' borç kaldı; arşivden önce tahsil edin.' : 'Borç yok', borc ? '<button class="dg dg-cizgi dg-kucuk" data-psekme="odeme">Ödemeler</button>' : '')}
    ${adim(k.yorum === 'yapti', 'Google yorumu', k.yorum === 'yapti' ? 'Yorum yaptı' : 'Yorum isteği gönderildi; zorunlu değil.')}
    ${adim(!!kp.arsiv, 'Dosya arşivlendi', kp.arsiv ? `${tarih(kp.arsiv)} · ${S.kurs.saklamaYil} yıl saklanır` : 'Evrak ve takip formları arşive kaldırılır, kursiyer aktif listeden çıkar.', kp.arsiv ? '' : `<button class="dg ${kp.sertifika && !borc ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" data-kapanis="arsiv">Arşivle</button>`)}
  </ul></div></div>`;
}
function kapanisAdim(k, adim) {
  const kp = k.kapanis || (k.kapanis = {});
  if (adim === 'sertifika') { kp.sertifika = gun(0); islem('Sertifika düzenlendi işaretledi', tamAd(k)); kaydet(); wpGonder(k, `${selam(k)} tebrikler! Sertifikanız MEBBİS’te düzenlendi. Nüfus müdürlüğünden randevu alıp kimliğinizle sürücü belgenizi teslim alabilirsiniz.`, 'Sertifika bildirimi'); return yenile(); }
  if (adim === 'arsiv') {
    const eksik = [!kp.sertifika && 'sertifika işaretlenmedi', kalanBorc(k) && tl(kalanBorc(k)) + ' borç var'].filter(Boolean);
    const yap = () => { kp.arsiv = gun(0); islem('Dosyayı arşivledi', tamAd(k)); kaydet(); kapatPencere(); bildir('Dosya arşivlendi'); yenile(); };
    if (!eksik.length) return yap();
    pencere({ baslik: 'Yine de arşivlensin mi?', icerik: `<div class="ipucu uyari">${isaret('uyari', 20)}<span>${e(eksik.join(', '))}.</span></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Arşivle</button>`, onAc(d) { d.querySelector('[data-k]').addEventListener('click', yap); } });
  }
}
// Sınav hakkı dolan kursiyer: kurs karar verir (yeniden kayıt ya da kaydı kapatma)
function hakBittiKart(k) {
  return `<div class="kart" style="grid-column:1/-1;border-color:var(--kirmizi)"><div class="kart-bas"><h3>${e(k.hakBitti.tur)} hakkı doldu</h3><small>${S.kurs.sinavHak} hakkın tamamı kullanıldı · ${tarih(k.hakBitti.tarih)}</small></div><div class="kart-govde">
    <p style="font-size:14px;margin-bottom:12px">Kursiyer bu sınava yeniden girebilmek için yeni dönem kaydı yaptırmalı. Kararı verin; kursiyere WhatsApp’tan bilgi gider.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-ana dg-kucuk" data-hak-karar="yeniden">Yeniden kayıt aç</button><button class="dg dg-cizgi dg-kucuk" data-hak-karar="kapat">Kaydı kapat</button></div></div></div>`;
}
function hakKarar(k, karar, ucret) {
  if (karar === 'yeniden') return pencere({
    baslik: 'Yeniden kayıt · ' + tamAd(k),
    icerik: `<p style="font-size:14px;margin-bottom:12px">Yeni dönem kaydı ödeme planına ek kalem olarak eklenir; MEBBİS kaydı yenilenmek üzere kuyruğa düşer.</p><div class="alan"><label>Yeniden kayıt ücreti (₺)</label><input name="u" inputmode="numeric" placeholder="Kursun yeniden kayıt ücreti"></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydı aç</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { const u = +d.querySelector('[name=u]').value.replace(/\D/g, ''); if (!u) return bildir('Ücreti girin', 'uyari'); kapatPencere(); hakKarar(k, 'yeniden-onay', u); }); },
  });
  geriAlNoktasi();
  if (karar === 'yeniden-onay') {
    k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: 'Yeniden kayıt (' + k.hakBitti.tur + ')', tutar: ucret, odendi: null });
    if (k.hakBitti.tur === 'e-Sınav') { k.esinav = null; k.asama = 'Teorik'; } else { k.dsinav = null; k.asama = 'Direksiyon'; }
    k.hakBitti.cozuldu = 'yeniden'; k.mebIslendi = false;
    islem('Yeniden kayıt açtı', tamAd(k) + ' · ' + tl(ucret)); kaydet();
    wpGonder(k, `${selam(k)} ${k.hakBitti.tur.toLowerCase()} için yeni dönem kaydınızı açtık. Yeniden kayıt ücreti ${tl(ucret)}; MEBBİS kaydınız yenilenecek.`, 'Yeniden kayıt');
  } else { k.hakBitti.cozuldu = 'kapandı'; k.asama = 'Ehliyet'; k.kapanis = { arsiv: gun(0), neden: k.hakBitti.tur + ' hakkı doldu' }; islem('Kaydı kapattı', tamAd(k) + ' · hak doldu'); kaydet(); bildir('Kayıt kapatıldı ve arşive alındı'); }
  yenile();
}
// Aşama geçişinin ön koşulları; müdür gerekçe yazıp geçebilir
const ASAMA_SART = {
  Evrak: k => null,
  Teorik: k => eksikEvrak(k).length ? 'Evrak eksik: ' + eksikEvrak(k).map(x => x[1].toLocaleLowerCase('tr')).join(', ') : null,
  Direksiyon: k => SINIFLAR[k.sinif].direksiyon === 0 ? 'Bu sınıfta direksiyon eğitimi yok; e-sınavı geçince doğrudan “Ehliyet”e geçer.' : !(k.esinav && k.esinav.sonuc === 'Geçti') ? 'e-Sınavı geçmedi' : null,
  Sınav: k => k.direksiyon < SINIFLAR[k.sinif].direksiyon ? `Direksiyon dersleri tamamlanmadı (${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon})` : null,
  Ehliyet: k => SINIFLAR[k.sinif].direksiyon === 0 ? (!(k.esinav && k.esinav.sonuc === 'Geçti') ? 'e-Sınavı geçmedi' : null) : !(k.dsinav && k.dsinav.sonuc === 'Geçti') ? 'Direksiyon sınavını geçmedi' : null,
};
function asamaIlerlet(k) {
  const i = asamaNo(k); if (i >= ASAMALAR.length - 1) return;
  let hedef = ASAMALAR[i + 1];
  if (SINIFLAR[k.sinif].direksiyon === 0 && k.asama === 'Teorik' && k.esinav && k.esinav.sonuc === 'Geçti') hedef = 'Ehliyet';
  const sorun = ASAMA_SART[hedef] && ASAMA_SART[hedef](k);
  const gec = (not) => { geriAlNoktasi(); k.asama = hedef; if (hedef === 'Ehliyet') { k.kapanis = k.kapanis || {}; } islem('Aşama değiştirdi', tamAd(k) + ' → ' + hedef + (not ? ' · ' + not : '')); kaydet(); bildir(tamAd(k) + ' → ' + hedef, 'tamam', true); yenile(); };
  if (!sorun) return gec();
  pencere({
    baslik: hedef + ' aşamasına geçiş',
    icerik: `<div class="ipucu uyari" style="margin-bottom:12px">${isaret('dur', 22)}<span>${e(sorun)}</span></div>${mudurMu() ? `<div class="alan"><label>Yine de geçirmek için gerekçe (işlem geçmişine yazılır)</label><input class="girdi" data-gerekce placeholder="Örn. evrak aslı kursta, sisteme sonra işlenecek"></div>` : '<p style="font-size:14px">Ön koşul tamamlanınca geçebilirsiniz. Gerekirse kurs müdürü gerekçe yazarak geçirebilir.</p>'}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${mudurMu() ? '<button class="dg dg-ana" data-k>Gerekçeyle geçir</button>' : ''}`,
    onAc(d) { const b = d.querySelector('[data-k]'); if (b) b.addEventListener('click', () => { const g = d.querySelector('[data-gerekce]').value.trim(); if (g.length < 5) return bildir('Gerekçe yazın', 'uyari'); kapatPencere(); gec('gerekçe: ' + g); }); },
  });
}
// Kaydı kapatma (kurstan ayrıldı) ya da dondurma: planlı dersler ve sınav listeleri temizlenir
function kayitKapat(k) {
  const planli = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı' && fark(d.tarih) >= 0);
  const acik = k.odeme.taksitler.filter(t => !t.odendi && !t.iptal), acikTutar = acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
  const S0 = SINIFLAR[k.sinif], yapilan = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').length;
  const yi = MZ.yasalIade(k), iadeOneri = k.ucretsiz ? 0 : yi.iade;
  pencere({
    baslik: 'Kaydı kapat · ' + tamAd(k),
    icerik: `<div class="secim" style="margin-bottom:12px"><label><input type="radio" name="tur" value="kapat" checked><span>Kurstan ayrıldı</span></label><label><input type="radio" name="tur" value="dondur"><span>Dondur (sonra devam edecek)</span></label></div>
      <div class="alan"><label>Neden</label><input class="girdi" data-neden placeholder="Örn. şehir değiştirdi"></div>
      <ul class="liste" style="margin-top:12px;font-size:14px"><li>${isaret('bilgi', 20)}<span>${planli.length} planlı direksiyon dersi iptal edilir; usta öğretici bilgilendirilir.</span></li>
        <li data-kapat-bilgi>${isaret('bilgi', 20)}<span>${acik.length} açık taksit (${tl(acikTutar)}) iptal edilir.</span></li>
        </ul>${k.ucretsiz ? '' : `<div data-kapat-bilgi style="margin-top:12px"><b style="color:var(--murekkep);display:block;margin-bottom:6px">Yasal iade hesabı (Özel Öğretim Kurumları Yönetmeliği m.56)</b>${MZ.iadeTablosu(yi)}<button class="dg dg-cizgi dg-kucuk" style="margin-top:8px" data-iade-yazdir type="button">${ik('belge')}Hesabı yazdır</button></div>`}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Kaydı kapat</button>`,
    onAc(d) {
      const iy = d.querySelector('[data-iade-yazdir]'); if (iy) iy.addEventListener('click', () => MZ.iadeBelgesi(k, yi));
      d.querySelectorAll('[name=tur]').forEach(r => r.addEventListener('change', () => { const kp = d.querySelector('[name=tur]:checked').value === 'kapat'; d.querySelectorAll('[data-kapat-bilgi]').forEach(x => { x.hidden = !kp; }); d.querySelector('[data-k]').textContent = kp ? 'Kaydı kapat' : 'Dondur'; }));
      d.querySelector('[data-k]').addEventListener('click', () => {
        const tur = d.querySelector('[name=tur]:checked').value, neden = d.querySelector('[data-neden]').value.trim();
        if (neden.length < 3) return bildir('Neden yazın', 'uyari');
        pinSor(tur === 'kapat' ? 'Kaydı kapatmak' : 'Kaydı dondurmak').then(onay => {
          if (!onay) return;
          geriAlNoktasi();
          const hocalar = [...new Set(planli.map(x => x.egitmen))].map(egitmen).filter(Boolean);
          S.dersler = S.dersler.filter(x => !planli.includes(x));
          S.sinavlar.filter(s => fark(s.tarih) >= 0 && !Object.keys(s.sonuc).length).forEach(s => { s.kursiyerler = s.kursiyerler.filter(x => x !== k.id); });
          S.bekleme = (S.bekleme || []).filter(b => b.kursiyer !== k.id);
          if (tur === 'kapat') { k.odeme.sozlesme = MZ.sozlesmeUcreti(k); acik.forEach(t => { t.iptal = gun(0); }); k.odeme.toplam -= acikTutar; }
          k.kapali = { tur, tarih: gun(0), neden, kim: oturum.kullanici ? oturum.kullanici.ad : '', iptalTutar: tur === 'kapat' ? acikTutar : 0, ...(tur === 'kapat' && iadeOneri ? { iadeTutar: iadeOneri, iadeSon: gun(30) } : {}) };
          islem(tur === 'kapat' ? 'Kaydı kapattı' : 'Kaydı dondurdu', tamAd(k) + ' · ' + neden); kaydet(); yenile();
          bildir(tamAd(k) + (tur === 'kapat' ? ' kaydı kapatıldı' : ' kaydı donduruldu'));
          if (hocalar.length) bildirimler(hocalar.map(h => ({ kim: h, metin: `${h.ad.split(' ')[0]} Hoca, ${tamAd(k)} ${tur === 'kapat' ? 'kurstan ayrıldı' : 'kaydını dondurdu'}; ${planli.filter(x => x.egitmen === h.id).map(x => tarih(x.tarih) + ' ' + x.saat).join(', ')} dersleri iptal edildi.`, tur: 'Ders iptali' })), 'Dersler iptal edildi');
          if (tur === 'kapat' && iadeOneri) setTimeout(() => odemeIslem(k, 'iade', iadeOneri), 600);
        });
      });
    },
  });
}
function bilgiDuzenle(k) {
  pencere({
    baslik: 'Bilgileri düzenle · ' + tamAd(k),
    icerik: `<form class="form-izgara" id="f-bilgi">
      <div class="alan"><label>Ad</label><input name="ad" value="${e(k.ad)}" required></div>
      <div class="alan"><label>Soyad</label><input name="soyad" value="${e(k.soyad)}" required></div>
      <div class="alan"><label>TC kimlik no${mudurMu() ? '' : ' · yalnız müdür'}</label><input name="tc" value="${mudurMu() ? e(k.tc) : e(tcMaskele(k.tc))}" inputmode="numeric" maxlength="11" ${mudurMu() ? '' : 'disabled'}></div>
      <div class="alan"><label>Doğum tarihi</label><input name="dogum" type="date" value="${e(k.dogumTarihi || '')}"></div>
      <div class="alan"><label>Sınıf${mudurMu() ? '' : ' · yalnız müdür'}</label><select name="sinif" ${mudurMu() ? '' : 'disabled'}>${Object.entries(SINIFLAR).filter(([key, v]) => v.aktif || key === k.sinif).map(([key, v]) => `<option value="${key}" ${key === k.sinif ? 'selected' : ''}>${e(v.ad)}</option>`).join('')}</select></div>
      <div class="alan"><label>Usta öğretici</label><select name="usta">${S.egitmenler.map(h => `<option value="${h.id}" ${h.id === k.egitmen ? 'selected' : ''}>${e(h.ad)}</option>`).join('')}</select></div>
      <div class="alan"><label>Telefon</label><input name="tel" value="${e(k.tel)}" inputmode="tel"></div>
      <div class="alan"><span class="et">Cinsiyet</span><div class="secim">${['Kadın', 'Erkek'].map(x => `<label><input type="radio" name="cinsiyet" value="${x}" ${k.cinsiyet === x ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
      <div class="alan tam"><label>Adres</label><input name="adres" value="${e(k.adres || '')}"></div>
      <div class="alan"><label>Sağlık raporu no</label><input name="rno" value="${e((k.saglikRapor || {}).no || '')}"></div>
      <div class="alan"><label>Rapor tarihi</label><input name="rtar" type="date" value="${(k.saglikRapor || {}).tarih ? k.saglikRapor.tarih.split('.').reverse().join('-') : ''}"></div>
      <div class="alan tam"><label>Adli sicil barkodu</label><input name="adli" value="${e((k.adliSicil || {}).barkod || '')}"></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-bilgi">Kaydet</button>`,
    onAc(d) {
      d.querySelector('form').addEventListener('submit', ev => {
        ev.preventDefault(); const f = ev.target;
        if (f.tel.value.replace(/\D/g, '').length < 10) return bildir('Geçerli bir telefon girin', 'uyari');
        if (!f.ad.value.trim() || !f.soyad.value.trim()) return bildir('Ad ve soyad gerekli', 'uyari');
        const degisen = [];
        if (mudurMu()) {
          const tc = f.tc.value.trim(); if (tc !== k.tc) { if (!tcGecerli(tc)) return bildir('TC kimlik numarası geçersiz', 'uyari'); if (S.kursiyerler.some(x => x !== k && x.tc === tc)) return bildir('Bu TC ile başka bir kursiyer kayıtlı', 'uyari'); degisen.push('TC'); k.tc = tc; k.mebIslendi = false; }
          if (f.sinif.value !== k.sinif) { degisen.push('sınıf ' + k.sinif + ' → ' + f.sinif.value); k.sinif = f.sinif.value; k.mebIslendi = false; }
        }
        if (f.usta.value !== k.egitmen) { degisen.push('usta → ' + egitmen(f.usta.value).ad); k.egitmen = f.usta.value; }
        if ((f.dogum.value || '') !== (k.dogumTarihi || '')) { degisen.push('doğum tarihi'); k.dogumTarihi = f.dogum.value; }
        if (f.ad.value.trim() !== k.ad || f.soyad.value.trim() !== k.soyad) degisen.push('ad soyad');
        Object.assign(k, { ad: f.ad.value.trim(), soyad: f.soyad.value.trim(), tel: f.tel.value.trim(), adres: f.adres.value.trim(), cinsiyet: (f.querySelector('[name=cinsiyet]:checked') || {}).value || k.cinsiyet || null });
        k.saglikRapor = f.rno.value.trim() ? { no: f.rno.value.trim(), tarih: f.rtar.value ? f.rtar.value.split('-').reverse().join('.') : '' } : null;
        k.adliSicil = f.adli.value.trim() ? { barkod: f.adli.value.trim() } : null;
        islem('Kursiyer bilgisi düzenledi', tamAd(k) + (degisen.length ? ' · ' + degisen.join(', ') : '')); kaydet(); kapatPencere(); bildir('Bilgiler kaydedildi' + (degisen.some(x => /TC|sınıf/.test(x)) ? '; MEBBİS kaydı yeniden girilmeli' : '')); yenile();
      });
    },
  });
}
const imzasiz = d => d.durum === 'Yapıldı' && (!d.imza || d.imza.kursiyerBekliyor);
const imzasizDers = k => S.dersler.filter(d => d.kursiyer === k.id && imzasiz(d)).sort((a, b) => a.tarih.localeCompare(b.tarih));
// Dosyanın en üstünde önem sırasıyla dört şey: evrak, ödeme, sıradaki, MEBBİS
function dosyaSeridi(k, eksik) {
  const yuk = Object.keys(k.evrakYuklenen || {}).filter(x => !k.evrak[x]).length, gec = gecikenler(k), sd = sonrakiDers(k), sn = S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  const meb = mebOnKontrol(k), mebTamam = meb.filter(x => x[0]).length, sonraki = sn && (!sd || sn.tarih <= sd.tarih) ? [sn.tur + ' sınavı', goreli(sn.tarih) + ' ' + sn.saat] : sd ? ['Direksiyon dersi', goreli(sd.tarih) + ' ' + sd.saat] : null;
  const kutu = (tur, et, deger, alt, git) => `<button type="button" class="serit-kutu ${tur}" data-dosya-git="${git}"><small>${et}</small><b>${deger}</b><span>${alt}</span></button>`;
  return `<div class="dosya-serit">
    ${kutu(eksik.length ? (yuk ? 'uyari' : 'kirmizi') : 'yesil', 'Evrak', `${EVRAKLAR.length - eksik.length}/${EVRAKLAR.length}`, eksik.length ? (yuk ? yuk + ' belge onay bekliyor' : eksik.map(x => x[1].split(' ')[0]).slice(0, 2).join(', ') + (eksik.length > 2 ? '…' : '') + ' eksik') : 'Tamam', 'genel|dosya-evrak')}
    ${kutu(gec.length ? 'kirmizi' : kalanBorc(k) ? 'notr' : 'yesil', 'Ödeme', kalanBorc(k) ? tl(kalanBorc(k)) : 'Tamam', gec.length ? tl(gecikenTutar(k)) + ' gecikti' : kalanBorc(k) ? 'kalan borç' : 'Borcu yok', 'odeme|')}
    ${kutu('notr', 'Sıradaki', sonraki ? e(sonraki[1]) : '—', sonraki ? e(sonraki[0]) : 'Planlı ders ya da sınav yok', sn && sonraki && sonraki[0] !== 'Direksiyon dersi' ? 'sinav|' : 'dersler|')}
    ${kutu(k.mebIslendi ? 'yesil' : mebTamam === meb.length ? 'mavi' : 'uyari', 'MEBBİS', k.mebIslendi ? 'Girildi' : `${mebTamam}/${meb.length}`, k.mebIslendi ? (k.mebNo ? e(k.mebNo) : 'kayıt tamam') : mebTamam === meb.length ? 'aktarıma hazır' : (meb.length - mebTamam) + ' eksik var', 'genel|dosya-meb')}
  </div>`;
}
// Deneme direksiyon sınavları (EK-3/EK-4 maddeleriyle; öğretmen ekranından ya da buradan)
function denemeKarti(k) {
  if (!SINIFLAR[k.sinif].direksiyon || !['Direksiyon', 'Sınav'].includes(k.asama)) return '';
  const l = (k.dDeneme || []).slice().reverse();
  return `<div class="kart" style="margin-bottom:14px"><div class="kart-bas"><h3>Deneme direksiyon sınavı</h3><small>${/^(A|M)/.test(k.sinif) ? 'EK-3' : 'EK-4'} maddeleriyle · gerçek sınavın kurallarıyla</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-deneme-yeni>${ik('arti')}Deneme yap</button></div></div>
    ${l.length ? `<ul class="liste">${l.map(x => `<li><div style="flex:1;min-width:0"><b style="color:${x.sonuc === 'Geçti' ? 'var(--yesil)' : 'var(--kirmizi)'}">${x.sonuc === 'Geçti' ? 'Geçerdi' : 'Kalırdı'}${x.neden ? ' · ' + e(x.neden) : ''}</b><small style="display:block;color:var(--soluk)">${tarih(x.tarih)} · ${e(x.kim || '')} · mavi ${x.say.m}, sarı ${x.say.s}, kırmızı ${x.say.k}${x.hatalar.length ? ' · ' + e(x.hatalar.slice(0, 3).map(h => h.bas.replace(/^\d+\.\s*/, '').toLocaleLowerCase('tr')).filter((v, i, a) => a.indexOf(v) === i).join(', ')) : ''}${x.not ? ' · “' + e(x.not) + '”' : ''}</small></div><button class="dg dg-hafif dg-kucuk" data-deneme-yazdir="${x.id}">Formu yazdır</button></li>`).join('')}</ul>` : `<div class="kart-govde"><p style="font-size:14px;color:var(--soluk)">Henüz deneme yapılmadı. Sınavdan önce bir deneme, öğrencinin hangi maddeden kalacağını gösterir.</p></div>`}</div>`;
}
// Kayıt fotoğrafı: MEBBİS'e aktarılan fotoğraf biyometrik kurallara uymalı; yanlış fotoğraf o dönem düzeltilemez
function profilFoto(k) {
  const KURAL = ['Son 6 ay içinde çekilmiş', 'Beyaz ya da açık renk düz fon', 'Yüz tam karşıdan, gözler açık ve net', 'Şapka, gözlük yansıması ve gölge yok', 'Yüz kadrajı dolduruyor, kimlikteki kişiyle aynı'];
  let veri = k.foto || null;
  pencere({
    baslik: 'Kayıt fotoğrafı · ' + tamAd(k),
    icerik: `<div class="foto-cek"><div class="foto-onizle">${veri ? `<img src="${veri}" alt="">` : `${ik('kursiyer')}<small>Henüz fotoğraf yok</small>`}</div>
      <div><label class="dg dg-ana" style="cursor:pointer">${ik('arti')}${veri ? 'Yeniden çek / yükle' : 'Fotoğraf çek / yükle'}<input type="file" accept="image/*" capture="user" data-foto-sec hidden></label>
      <p class="et" style="margin-top:14px">Biyometrik kontrol</p><div class="foto-kural">${KURAL.map((x, i) => `<label><input type="checkbox" data-kural="${i}" ${k.foto ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:10px">Bu fotoğraf MEBBİS’e aktarılır. MEB modülünde hatalı fotoğraf o dönem düzeltilemez.</p></div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-foto-kaydet>Kaydet</button>`,
    onAc(d) {
      d.querySelector('[data-foto-sec]').addEventListener('change', ev => { const f = ev.target.files[0]; if (!f) return; fotoKucult(f, 480).then(u => { veri = u; d.querySelector('.foto-onizle').innerHTML = `<img src="${u}" alt="">`; d.querySelectorAll('[data-kural]').forEach(c => { c.checked = false; }); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); });
      d.querySelector('[data-foto-kaydet]').addEventListener('click', () => {
        if (!veri) return bildir('Önce fotoğraf çekin ya da yükleyin', 'uyari');
        if ([...d.querySelectorAll('[data-kural]')].some(c => !c.checked)) return bildir('Biyometrik kontrolün hepsini işaretleyin; uymayan fotoğraf MEB’den döner', 'uyari');
        k.foto = veri; k.fotoTarih = gun(0); islem('Kayıt fotoğrafı ekledi', tamAd(k)); kaydet(); kapatPencere(); bildir('Fotoğraf kaydedildi'); yenile();
      });
    },
  });
}
export function kursiyerDetay(id) {
  const k = kursiyer(id);
  if (!k) return { baslik: 'Kursiyer bulunamadı', html: `<div class="kart">${bos('Bu kursiyer bulunamadı', 'Kayıt silinmiş ya da bağlantı hatalı olabilir.', '<a class="dg dg-koyu" href="#/kursiyerler">Kursiyerlere dön</a>')}</div>` };
  const S0 = SINIFLAR[k.sinif], eg = egitmen(k.egitmen);
  const dersler = S.dersler.filter(d => d.kursiyer === k.id).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat));
  const sinavlar = S.sinavlar.filter(s => s.kursiyerler.includes(k.id)).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const mesajlar = S.gonderimler.filter(g => g.kime === tamAd(k));
  const eksik = eksikEvrak(k);
  const sekmeHtml = () => sekmeler([['genel', 'Genel'], ['dersler', 'Dersler', dersler.length], ['odeme', 'Ödemeler'], ['sinav', 'Sınavlar', sinavlar.length], ['mesaj', 'Mesajlar']], profilSekme, 'psekme');
  const govde = () => {
    if (profilSekme === 'genel') { const ar = ustaAraci(k.egitmen, k.sinif); const r = risk(k); return `<div class="izgara iz-3">
      ${k.ekDersTeklif ? `<div class="kart" style="grid-column:1/-1"><div class="kart-bas"><h3>Ek ders teklifi cevap bekliyor</h3><small>${tarih(k.ekDersTeklif.tarih)} · ${k.ekDersTeklif.n} ders · ${tl(k.ekDersTeklif.tutar)}</small><div class="sag" style="gap:6px"><button class="dg dg-ana dg-kucuk" data-ekders-kabul>Kabul etti</button><button class="dg dg-hafif dg-kucuk" data-ekders-ret>Reddetti</button></div></div><div class="kart-govde"><small style="color:var(--soluk)">Kursiyer kursiyer ekranından da kabul edebilir; telefonda kabul ettiyse buradan işaretleyin.</small></div></div>` : ''}${k.asama === 'Ehliyet' ? kapanisKart(k) : ''}${k.hakBitti && !k.hakBitti.cozuldu ? hakBittiKart(k) : ''}
      <div class="kart" style="padding:10px;order:6">${ar ? aracGorsel(ar) : ''}<div style="padding:10px 6px 4px"><b style="display:block;font-family:var(--baslik);font-size:17px;color:var(--murekkep)">${ar ? e(ar.model) + ' · ' : ''}${e(eg.ad)}</b><span style="font-size:14px">${ar ? `${e(ar.plaka)} · ${e(ar.vites)}. Dersler bu araçla ve bu usta öğreticiyle yapılıyor.` : `${e(eg.ad)} adına kayıtlı ${S0.ad} aracı yok; dersler o saatte boş olan ${S0.ad} aracıyla yapılır.`}</span></div></div>
      ${k.konuAnaliz ? `<div class="kart" style="order:5"><div class="kart-bas"><h3>Deneme sınavları</h3><small>Son: ${(k.deneme || []).slice(-4).join(' · ')}</small></div><div class="kart-govde" style="display:grid;gap:8px">${Object.entries(KONULAR).map(([kn, [ad]]) => { const a = k.konuAnaliz[kn] || [0, 0], o = a[1] ? Math.round(a[0] / a[1] * 100) : 0; return `<div><div style="display:flex;justify-content:space-between;font-size:13.5px"><span>${ad}</span><b class="mono" style="color:${o < 70 ? 'var(--kirmizi)' : 'var(--murekkep)'}">%${o}</b></div>${ilerleme(o, 100, o < 70 ? '' : 'yesil')}</div>`; }).join('')}${Object.entries(KONULAR).some(([kn]) => { const a = k.konuAnaliz[kn] || [0, 1]; return a[0] / Math.max(1, a[1]) < 0.7; }) ? `<p style="font-size:13.5px;margin-top:4px;display:flex;gap:6px;align-items:center">${isaret('uyari', 16)}<span>Zayıf konu teorik öğretmenin listesine eklendi.</span></p>` : ''}</div></div>` : ''}
      <div class="kart" style="order:4"><div class="kart-bas"><h3>Sınav riski</h3></div><div class="kart-govde">${r ? `<div style="display:flex;align-items:center;gap:14px">${isaret(r.puan >= 50 ? 'uyari' : r.puan >= 25 ? 'bilgi' : 'tamam', 44)}<div><b style="display:block;font-family:var(--baslik);font-size:24px;color:var(--murekkep)">${r.puan >= 50 ? 'Yüksek' : r.puan >= 25 ? 'Orta' : 'Düşük'} risk</b><span style="font-size:14px">${r.tur} · ${r.puan}/100</span></div></div>${r.nedenler.length ? `<ul style="margin:12px 0 0 18px;font-size:14px">${r.nedenler.map(n => `<li>${e(n)}</li>`).join('')}</ul>` : ''}${r.beceri ? `<p class="et" style="margin-top:14px">Son ${r.beceri.ders} dersin beceri puanı</p><div style="display:grid;gap:6px">${BECERI.map(([b, ad]) => { const v = r.beceri.beceri[b]; return v == null ? '' : `<div class="beceri-cubuk"><span>${ad}</span><i><b style="width:${v / 5 * 100}%;background:${v < 3 ? 'var(--kirmizi)' : v < 3.8 ? 'var(--sari)' : 'var(--yesil)'}"></b></i><b class="mono">${v.toFixed(1).replace('.', ',')}</b></div>`; }).join('')}</div>` : ''}${r.puan >= 25 ? `<button class="dg dg-ana dg-kucuk" style="margin-top:14px" data-ekders>Ek ders öner</button>` : ''}` : `<p style="font-size:14px">${k.asama === 'Ehliyet' ? 'Ehliyetini aldı.' : 'Teorik derslere başlayınca hesaplanır.'}</p>`}</div></div>
      <div class="kart" style="order:2" id="dosya-meb"><div class="kart-bas"><h3>MEBBİS ön kontrol</h3><small>${(() => { const l = mebOnKontrol(k); return l.filter(x => x[0]).length + '/' + l.length; })()}</small>${k.mebNo ? `<span class="rozet rozet-yesil" title="MEBBİS kayıt numarası">${e(k.mebNo)}</span>` : ''}<div class="sag">${k.mebIslendi ? rozet('Girildi', 'yesil') : `<a class="dg dg-ana dg-kucuk" href="#/mebbis/${k.id}">Giriş kartı</a>`}</div></div><div class="kart-govde"><ul style="list-style:none;display:grid;gap:6px;font-size:14px">${mebOnKontrol(k).map(([ok, t]) => `<li style="display:flex;gap:8px;align-items:center">${isaret(ok ? 'tamam' : 'uyari', 18)}<span style="${ok ? '' : 'font-weight:700;color:var(--murekkep)'}">${t}</span></li>`).join('')}</ul></div></div>
      <div class="kart" style="order:7"><div class="kart-bas"><h3>Belgeler</h3></div><div class="kart-govde" style="display:grid;gap:8px">${[['sozlesme', 'Sözleşme'], ['bilgi', 'Bilgi formu'], ['ek1', 'Müracaat formu (EK-1)'], ['takip', 'Direksiyon takip formu'], ['makbuz', 'Son makbuz']].concat(SINIFLAR[k.sinif].direksiyon ? [['ek5', '“K” aday belgesi (EK-5)'], ['ek34', 'Sınav değerlendirme formu (' + (/^(A|M)/.test(k.sinif) ? 'EK-3' : 'EK-4') + ')']] : []).concat(k.odeme.senetli ? [['senet', 'Senet']] : []).map(([t, a]) => `<button class="dg dg-cizgi dg-kucuk" style="justify-content:flex-start" data-belge="${t}">${ik('belge')}${a}</button>`).join('')}</div></div>
      <div class="kart" style="order:3"><div class="kart-bas"><h3>Bilgiler</h3><div class="sag"><button class="dg dg-hafif dg-kucuk" data-bilgi-duzenle>${ik('kalem')}Düzenle</button></div></div><div class="kart-govde"><dl class="bilgi-tablo">
        <dt>Sınıf</dt><dd>${S0.ad}</dd><dt>Kayıt</dt><dd>${tarih(k.kayit)} · ${e(k.kaynak)}</dd><dt>Usta öğretici</dt><dd>${e(eg.ad)}</dd><dt>Telefon</dt><dd>${e(k.tel)}</dd><dt>TC kimlik</dt><dd><span class="mono" data-tc-alan>${tcMaskele(k.tc)}</span> ${oturum.kullanici && oturum.kullanici.rol === 'mudur' && k.tc ? '<button class="dg dg-hafif dg-kucuk" data-tc-goster>Göster</button>' : ''}</dd><dt>Doğum tarihi</dt><dd>${k.dogumTarihi ? tarih(k.dogumTarihi) + ' ' + k.dogumTarihi.slice(0, 4) : e(k.dogum || '—')}</dd><dt>Öğrenim</dt><dd>${e(k.ogrenim || '—')}</dd><dt>Adres</dt><dd>${e(k.adres || '—')}</dd><dt>Cinsiyet</dt><dd>${k.cinsiyet ? e(k.cinsiyet) : rozet('Girilmedi', 'uyari')}</dd><dt>Sağlık raporu</dt><dd>${k.saglikRapor && k.saglikRapor.no ? e(k.saglikRapor.no) + (k.saglikRapor.tarih ? ' · ' + e(k.saglikRapor.tarih) : '') : rozet('No girilmedi', 'uyari')}</dd><dt>Adli sicil</dt><dd>${k.adliSicil && k.adliSicil.barkod ? `<span class="mono">${e(k.adliSicil.barkod)}</span>` : rozet('Barkod girilmedi', 'uyari')}</dd>${k.odeme.indirim ? `<dt>İndirim</dt><dd>${e(k.odeme.indirim.ad)} · −${tl(k.odeme.indirim.tutar)}</dd>` : ''}${k.mevcutEhliyet ? `<dt>Mevcut ehliyet</dt><dd>${e(k.mevcutEhliyet)} · ${rozet('Sınıf geçişi', 'mavi')}</dd>` : ''}${k.acil && k.acil.ad ? `<dt>Acil durumda</dt><dd>${e(k.acil.ad)}${k.acil.yakinlik ? ' (' + e(k.acil.yakinlik) + ')' : ''} · ${e(k.acil.tel)}</dd>` : ''}
        <dt>MEB kaydı</dt><dd>${k.mebIslendi ? rozet('MEBBİS’e girildi', 'yesil') : rozet('Bekliyor', 'uyari')}</dd>
        <dt>Teorik</dt><dd><span class="sayi">${k.teorik}/${S0.teorik} saat</span>${ilerleme(k.teorik, S0.teorik)}</dd>
        <dt>Direksiyon</dt><dd><span class="sayi">${k.direksiyon}/${S0.direksiyon} ders</span>${ilerleme(k.direksiyon, S0.direksiyon, 'yesil')}</dd>
      </dl></div></div>
      <div class="kart" style="order:1" id="dosya-evrak"><div class="kart-bas"><h3>Evraklar</h3><small>${EVRAKLAR.length - eksik.length}/${EVRAKLAR.length}</small>${eksik.length ? `<div class="sag"><button class="dg dg-wp dg-kucuk" data-evrak-hatirlat>${ik('wp')}Hatırlat</button></div>` : ''}</div><div class="kart-govde">
        ${EVRAKLAR.map(([key, t]) => `<label class="evrak"><span class="durum ${k.evrak[key] ? 'var' : 'yok'}">${ik(k.evrak[key] ? 'tik' : 'kapat')}</span><span style="flex:1;color:var(--murekkep)">${t}${(k.evrakYuklenen || {})[key] && !k.evrak[key] ? `<small class="evrak-yuklendi">${k.evrakYuklenen[key].kanal === 'WhatsApp' ? 'WhatsApp’tan geldi' : 'Öğrenci telefondan yükledi'} · ${tarih(k.evrakYuklenen[key].tarih)}${k.evrakYuklenen[key].bulanik ? ' · <b style="color:var(--kirmizi)">bulanık olabilir</b>' : ''}${k.evrakYuklenen[key].tahmin ? ' · başlık tahmini' : ''}</small>` : ''}</span>${(k.evrakYuklenen || {})[key] && !k.evrak[key] ? `${k.evrakYuklenen[key].veri ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-evrak-gor="${key}">Gör</button>` : ''}<button type="button" class="dg dg-ana dg-kucuk" data-evrak-onay="${key}">Onayla</button><button type="button" class="dg dg-hafif dg-kucuk" data-evrak-geri="${key}">Yeniden iste</button>` : ''}${(k.evrakFoto || {})[key] ? `<img src="${k.evrakFoto[key]}" alt="${t} fotoğrafı" data-foto-buyut="${key}" style="width:34px;height:34px;object-fit:cover;border-radius:4px;border:1px solid var(--cizgi);cursor:zoom-in">` : `<span class="dg dg-hafif dg-kucuk" style="position:relative;overflow:hidden">Fotoğraf<input type="file" accept="image/*" data-foto-yukle="${key}" style="position:absolute;inset:0;opacity:0;cursor:pointer"></span>`}${['saglik', 'adli'].includes(key) && k.evrak[key] ? ((k.dogrulama || {})[key] ? (() => { const v = k.dogrulama[key], f = v.gecerlilik ? fark(v.gecerlilik) : null; return `<button class="rozet rozet-${f != null && f < 0 ? 'kirmizi' : f != null && f <= 30 ? 'sari' : 'yesil'}" data-dogrula="${key}" title="${e(v.kim)} · ${tarih(v.tarih)}">${f != null && f < 0 ? 'Süresi doldu' : 'Doğrulandı'}${v.gecerlilik ? ' · ' + tarih(v.gecerlilik) : ''}</button>`; })() : `<button class="dg dg-cizgi dg-kucuk" data-dogrula="${key}">Doğrula</button>`) : ''}${key === 'sozlesme' ? (k.evrak.sozlesme ? (k.sozlesmeImza ? `<span class="rozet rozet-yesil" title="${e(k.sozlesmeImza.yontem)}">${k.sozlesmeImza.yontem === 'Ekranda' ? 'Ekranda imzalandı' : /^Uzaktan/.test(k.sozlesmeImza.yontem || '') ? 'Uzaktan imzalandı' : 'Islak imza'} · ${tarih(k.sozlesmeImza.tarih)}</span>` : '') : `${(S.imzaTalepleri || []).some(t => t.kursiyer === k.id && t.tur === 'sozlesme' && t.durum === 'bekliyor') ? '<span class="rozet rozet-sari">Link gönderildi</span>' : ''}<button class="dg dg-ana dg-kucuk" data-sozlesme>İmzalat</button>`) : ''}<span class="anahtar"><input type="checkbox" data-evrak="${key}" ${k.evrak[key] ? 'checked' : ''} aria-label="${t} teslim alındı"><i></i></span></label>`).join('')}
      </div></div>
      <div class="kart" style="order:8"><div class="kart-bas"><h3>Notlar</h3></div><div class="kart-govde">
        <ul class="zaman-cizgisi">${k.notlar.map(n => `<li>${e(n.metin)}<small>${goreli(n.tarih)}</small></li>`).join('') || '<li style="color:var(--soluk)">Henüz not yok.<small>Usta öğretici notları ve görüşmeler burada birikir.</small></li>'}</ul>
        <form data-not style="display:flex;gap:8px;margin-top:10px"><input class="girdi" name="n" placeholder="Not ekleyin" aria-label="Not"><button class="dg dg-koyu" type="submit">Ekle</button></form>
      </div></div></div>`; }
    if (profilSekme === 'dersler') return `<div class="kart"><div class="kart-bas"><h3>Direksiyon dersleri</h3><small>${k.direksiyon} yapıldı · ${dersler.filter(d => d.durum === 'Planlandı').length} planlı${imzasizDers(k).length ? ' · ' + imzasizDers(k).length + ' dersin kursiyer imzası eksik' : ''}</small><div class="sag" style="gap:6px">${imzasizDers(k).length ? `<button class="dg dg-wp dg-kucuk" data-ders-imza>${ik('wp')}İmzaya gönder</button>` : ''}<a class="dg dg-ana dg-kucuk" href="#/plan">${ik('arti')}Ders planla</a></div></div>
      <ul class="liste" style="margin-top:8px">${dersler.map(d => `<li><span class="zaman">${d.saat}</span><div><b style="color:var(--murekkep)">${tarihUzun(d.tarih)}</b><small style="display:block;color:var(--soluk)">${e(egitmen(d.egitmen).ad)}</small></div><span class="sag">${d.arac ? plaka(arac(d.arac).plaka) : ''}${d.durum === 'Yapıldı' ? (imzasiz(d) ? rozet(d.imza && d.imza.kursiyerBekliyor ? 'İmza bekleniyor' : 'İmzasız', 'uyari') : rozet(d.imza && d.imza.kursiyerUzaktan ? 'Uzaktan imzalı' : 'İmzalı', 'yesil')) : ''}${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</span></li>`).join('') || '<li>' + bos('Henüz direksiyon dersi yok', 'Teorik dersler ve e-sınav bittikten sonra planlanır.') + '</li>'}</ul></div>`;
    if (profilSekme === 'odeme') return `<div class="izgara iz-12">
      <div><div class="kart gosterge"><small>Kurs ücreti${ekToplam(k) ? ' + ek kalemler' : ''}</small><b>${tl(k.odeme.toplam + ekToplam(k))}</b><span>Ödenen ${tl(odenen(k))}${k.odeme.iade ? ' · iade ' + tl(k.odeme.iade) : ''}${k.ucretsiz ? ' · ücretsiz kursiyer (' + e(k.ucretsiz.neden) + ')' : ''}</span>${ilerleme(odenen(k), k.odeme.toplam + ekToplam(k), 'yesil')}<span style="margin-top:8px">Kalan <b style="font-size:15px;font-family:var(--mono)">${tl(kalanBorc(k))}</b></span></div>
        <div style="display:grid;gap:8px;margin-top:12px">${[['indirim', 'İndirim uygula'], ['plan', 'Planı yeniden böl'], ['ek', 'Ek kalem ekle'], ['iade', 'İade yap'], ...(k.ucretsiz ? [] : [['ucretsiz', 'Ücretsiz kursiyer (%3)']])].filter(([t]) => mudurMu() || !['indirim', 'iade', 'ucretsiz'].includes(t)).map(([t, a]) => `<button class="dg dg-cizgi dg-kucuk" style="justify-content:flex-start" data-odeme-islem="${t}">${a}</button>`).join('')}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Ödeme planı</h3>${k.odeme.senetli ? rozet('Senetli', 'mor') : ''}<div class="sag">${kalanBorc(k) ? `<button class="dg dg-cizgi dg-kucuk" data-link>${ik('kart')}Ödeme linki gönder</button>` : ''}</div></div><div class="kart-govde">
        ${kalanBorc(k) ? (k.odeme.otomatik ? `<p class="ipucu" style="margin-bottom:10px">${isaret('tamam', 18)}<span>Otomatik çekim açık · kart •••• ${e(k.odeme.otomatik.son4)} · taksitler vadesinde çekilir. Onay: ${tarih(k.odeme.otomatik.onay)} <button class="dg dg-hafif dg-kucuk" data-oto-kapat>Kapat</button></span></p>` : (k.odeme.otoTalep ? `<p class="ipucu" style="margin-bottom:10px">${isaret('bilgi', 18)}<span>Otomatik çekim talimatı ${tarih(k.odeme.otoTalep.tarih)} tarihinde istendi; kursiyer kartını kursiyer ekranından kaydedince açılır. <button class="dg dg-hafif dg-kucuk" data-oto-talimat>Yeniden gönder</button> <button class="dg dg-hafif dg-kucuk" data-oto-iptal>Geri çek</button></span></p>` : (S.entegrasyon.pos.bagli ? `<p class="ipucu" style="margin-bottom:10px">${isaret('bilgi', 18)}<span>Taksitler her ay hatırlatmayla ödeniyor. <button class="dg dg-cizgi dg-kucuk" data-oto-talimat>${ik('kart')}Otomatik çekim talimatı iste</button></span></p>` : `<p class="ipucu" style="margin-bottom:10px">${isaret('bilgi', 18)}<span>Otomatik kart çekimi için sanal POS bağlı değil; taksitler hatırlatmayla tahsil ediliyor.</span></p>`))) : ''}
        <div class="taksit-sira"><span class="no">P</span><div><b style="color:var(--murekkep)">Peşinat</b><small style="display:block;color:var(--soluk)">${tarih(k.odeme.pesinTarih)}</small></div><span class="sayi">${tl(k.odeme.pesin)}</span>${rozet('Ödendi', 'yesil')}</div>
        ${k.odeme.taksitler.map((t, i) => `<div class="taksit-sira"><span class="no">${i + 1}</span><div><b style="color:var(--murekkep)">${i + 1}. taksit</b><small style="display:block;color:var(--soluk)">Vade ${tarih(t.vade)}${t.odendi ? ' · ödendi ' + tarih(t.odendi) + ' · ' + t.yontem : ''}</small></div><span class="sayi">${tl(t.tutar)}</span>${t.odendi ? rozet('Ödendi', 'yesil') : t.iptal ? rozet('İptal', 'notr') : `<button class="dg ${fark(t.vade) < 0 ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" data-tahsil="${i}">${t.kismi ? tl(t.tutar - t.kismi) + ' kaldı · ' : ''}${fark(t.vade) < 0 ? 'Gecikti · tahsil et' : 'Tahsil et'}</button>`}</div>`).join('')}
        ${(k.odeme.ekler || []).map((x, j) => `<div class="taksit-sira"><span class="no">+</span><div><b style="color:var(--murekkep)">${e(x.ad)}</b><small style="display:block;color:var(--soluk)">Ek kalem${x.odendi ? ' · ödendi ' + tarih(x.odendi) : ''}</small></div><span class="sayi">${tl(x.tutar)}</span>${x.odendi ? rozet('Ödendi', 'yesil') : `<button class="dg dg-cizgi dg-kucuk" data-ek-tahsil="${j}">Tahsil et</button>`}</div>`).join('')}
      </div></div></div>`;
    if (profilSekme === 'sinav') return MZ.hazirKarti(k) + denemeKarti(k) + `<div class="izgara iz-2">${[['e-Sınav', k.esinav], ['Direksiyon sınavı', k.dsinav]].map(([t, s]) => `<div class="kart gosterge"><small>${t}</small><b>${s ? s.sonuc : '—'}</b><span>${s ? (s.puan ? s.puan + ' puan · ' : '') + s.hak + '. hak' + (s.sonuc === 'Kaldı' ? ' · ' + Math.max(0, (S.kurs.sinavHak || 4) - s.hak) + ' hak kaldı' : '') : (t === 'e-Sınav' ? (k.teorik >= S0.teorik - 4 ? 'Sınava hazır' : 'Teorik dersler sürüyor') : k.dsinavPlan ? 'Sınav ' + goreli(k.dsinavPlan) : 'Direksiyon dersleri sürüyor')}</span></div>`).join('')}</div>
      <div class="ara-bosluk"></div><div class="kart"><div class="kart-bas"><h3>Sınav oturumları</h3></div><ul class="liste" style="margin-top:8px">${sinavlar.map(s => `<li><span class="oto-ik">${ik(s.tur === 'e-Sınav' ? 'teorik' : 'direksiyon')}</span><div><b style="color:var(--murekkep)">${s.tur} · ${tarihUzun(s.tarih)} ${s.saat}</b><small style="display:block;color:var(--soluk)">${e(s.yer)}</small></div><span class="sag">${s.sonuc[k.id] ? rozet(s.sonuc[k.id], s.sonuc[k.id] === 'Geçti' ? 'yesil' : 'kirmizi') : rozet(goreli(s.tarih), 'mavi')}</span></li>`).join('') || '<li>' + bos('Henüz sınava atanmadı', 'Sınavlar sayfasından oturuma ekleyebilirsiniz.') + '</li>'}</ul></div>`;
    return `<div class="kart"><div class="kart-bas"><h3>WhatsApp geçmişi</h3><small>Otomatik hatırlatmalar ve gönderdiğiniz mesajlar</small></div><div class="kart-govde">
      <ul class="zaman-cizgisi">${mesajlar.map(m => `<li>${e(m.metin)}<small>${e(m.tur)} · ${new Date(m.zaman).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}</small></li>`).join('')}
${mesajlar.length ? '' : '<li style="color:var(--soluk)">Bu kursiyere henüz mesaj gönderilmedi.<small>Gönderilen her mesaj burada listelenir.</small></li>'}</ul>
      <form data-mesaj style="display:flex;gap:8px;margin-top:12px"><input class="girdi" name="m" placeholder="${e(k.ad)} kişisine mesaj yazın" aria-label="Mesaj"><button class="dg dg-wp" type="submit">${ik('wp')}Gönder</button></form></div></div>`;
  };
  return {
    baslik: tamAd(k), alt: 'Kursiyer dosyası',
    html: `<a class="dg dg-hafif" href="#/kursiyerler" style="margin:-6px 0 10px -8px">${ik('sol')}Kursiyerler</a>
    <div class="kart">
      <div class="profil-bas"><button type="button" class="profil-foto ${k.foto ? 'var' : ''}" data-profil-foto title="${k.foto ? 'Fotoğrafı değiştir' : 'Fotoğraf çek ya da yükle'}">${k.foto ? `<img src="${k.foto}" alt="${e(tamAd(k))} fotoğrafı">` : `${ik('kursiyer')}<small>Fotoğraf</small>`}</button><div><span class="profil-no">No ${k.id.slice(1, 5)}</span><h2 style="margin-top:6px">${e(tamAd(k))}</h2><div class="meta"><span>${asamaRozet(k.asama)}</span><span>${ik('direksiyon')}${S0.ad}</span><span>${ik('tel')}${e(k.tel)}</span><span>${ik('kursiyer')}${e(eg.ad)}</span></div></div>
        <div class="sag"><button class="dg dg-wp" data-wp>${ik('wp')}WhatsApp</button><button class="dg dg-cizgi" data-ileri ${k.asama === 'Ehliyet' || k.kapali ? 'disabled' : ''}>${ik('ok')}Sonraki aşamaya geçir</button>${mudurMu() && !k.kapali && k.asama !== 'Ehliyet' ? '<button class="dg dg-hafif" data-kapat-kayit>Kaydı kapat</button>' : ''}</div></div>
      ${k.kapali ? `<div class="ipucu uyari" style="margin:0 20px 14px">${isaret('uyari', 22)}<span style="flex:1"><b>${k.kapali.tur === 'dondur' ? 'Kayıt donduruldu' : 'Kayıt kapatıldı'}</b> · ${tarih(k.kapali.tarih)} · ${e(k.kapali.neden)}${k.kapali.kim ? ' · ' + e(k.kapali.kim) : ''}</span>${mudurMu() ? '<button class="dg dg-cizgi dg-kucuk" data-kayit-ac>Yeniden aç</button>' : ''}</div>` : ''}
      ${yol(asamaNo(k), true)}
      <div style="height:18px"></div>
    </div>
    ${dosyaSeridi(k, eksik)}
    ${B.bulutta() && oturum.kullanici.rol !== 'usta' ? `<div class="panel-serit"><span>${ik('tel')}<b>Öğrenci paneli</b><small>${k.panelKod ? 'Link açık · öğrenci kendi programını, derslerini, ödemelerini görür; evrak yükler, ders alır' : 'Öğrenci kendi telefonundan program, ders, ödeme ve evrağını görsün'}</small></span><span class="sag" style="gap:6px">${k.panelKod ? `<button type="button" class="dg dg-hafif dg-kucuk" data-panel-gonder>Linki tekrar gönder</button><button type="button" class="dg dg-hafif dg-kucuk" data-panel-kapat>Linki kapat</button>` : `<button type="button" class="dg dg-ana dg-kucuk" data-panel-gonder>Linki WhatsApp’tan gönder</button>`}</span></div>` : ''}
    <div id="ps">${sekmeHtml()}</div><div id="pg">${govde()}</div>`,
    baglan(kap) {
      const ciz = () => { kap.querySelector('#ps').innerHTML = sekmeHtml(); kap.querySelector('#pg').innerHTML = govde(); };
      kap.addEventListener('click', ev => {
        const s = ev.target.closest('[data-psekme]'); if (s) { profilSekme = s.dataset.psekme; ciz(); }
        if (ev.target.closest('[data-wp]')) { profilSekme = 'mesaj'; ciz(); kap.querySelector('[data-mesaj] input').focus(); }
        if (ev.target.closest('[data-ileri]')) asamaIlerlet(k);
        if (ev.target.closest('[data-kapat-kayit]')) kayitKapat(k);
        if (ev.target.closest('[data-kayit-ac]')) { const eski = k.kapali; if (eski && eski.tur === 'kapat') { k.odeme.taksitler.forEach(t => { if (t.iptal === eski.tarih) delete t.iptal; }); k.odeme.toplam += eski.iptalTutar || 0; } k.kapali = null; islem('Kaydı yeniden açtı', tamAd(k)); kaydet(); bildir(tamAd(k) + ' kaydı yeniden açıldı' + (eski && eski.tur === 'kapat' ? '; iptal edilen taksitler geri alındı, vadelerini kontrol edin' : '')); yenile(); }
        if (ev.target.closest('[data-evrak-hatirlat]')) wpGonder(k, `${selam(k)} kaydınızı tamamlamak için ${eksikEvrak(k).map(x => x[1].toLocaleLowerCase('tr')).join(', ')} eksik. Belgelerin fotoğrafını bu numaraya WhatsApp’tan gönderebilir ya da ${kursAdi('e')} getirebilirsiniz.`, 'Evrak hatırlatması');
        if (ev.target.closest('[data-link]')) wpGonder(k, `${selam(k)} ${kursAdi('e')} kalan ödemeniz ${tl(kalanBorc(k))}. ${odemeBilgisi()}`, 'Ödeme bilgisi');
        const t = ev.target.closest('[data-tahsil]'); if (t) tahsilAl(k, +t.dataset.tahsil);
        const tg = ev.target.closest('[data-tc-goster]'); if (tg) pinSor('TC kimlik numarasını tam göstermek').then(onay => { if (!onay) return; const al = document.querySelector('[data-tc-alan]'); if (al) al.textContent = k.tc; const b = document.querySelector('[data-tc-goster]'); if (b) b.remove(); islem('TC kimlik görüntüledi', tamAd(k)); kaydet(); });
        if (ev.target.closest('[data-oto-talimat]')) { k.odeme.otoTalep = { tarih: gun(0) }; wpGonder(k, `${selam(k)} taksitlerinizi her ay hatırlamanıza gerek kalmasın: kursiyer ekranındaki “Otomatik çekim” adımından kartınızı kaydederseniz taksitler vadesinde otomatik çekilir. Kartınız bankanın güvenli sayfasında saklanır.`, 'Otomatik çekim talimatı'); islem('Otomatik çekim talimatı istedi', tamAd(k)); kaydet(); yenile(); return; }
        if (ev.target.closest('[data-oto-iptal]')) { k.odeme.otoTalep = null; islem('Otomatik çekim talebini geri çekti', tamAd(k)); kaydet(); yenile(); return; }
        const eo = ev.target.closest('[data-evrak-onay]'); if (eo) { ev.preventDefault(); const key = eo.dataset.evrakOnay, ad = EVRAKLAR.find(x => x[0] === key)[1]; k.evrak[key] = true; const yv = k.evrakYuklenen[key]; if (yv && yv.veri) { if (yv.tur === 'pdf') { k.evrakPdf = k.evrakPdf || {}; k.evrakPdf[key] = yv.veri; } else { k.evrakFoto = k.evrakFoto || {}; k.evrakFoto[key] = yv.veri; } } delete k.evrakYuklenen[key]; islem('Öğrencinin yüklediği evrakı onayladı', tamAd(k) + ' · ' + ad); if (!eksikEvrak(k).length && ['Kayıt', 'Evrak'].includes(k.asama)) { k.asama = 'Teorik'; bildir('Evraklar tamam, öğrenci teorik aşamaya geçti'); } else bildir(ad + ' onaylandı'); kaydet(); return yenile(); }
        const eg2 = ev.target.closest('[data-evrak-geri]'); if (eg2) { ev.preventDefault(); const key = eg2.dataset.evrakGeri, ad = EVRAKLAR.find(x => x[0] === key)[1]; delete k.evrakYuklenen[key]; islem('Evrakı yeniden istedi', tamAd(k) + ' · ' + ad); kaydet(); wpGonder(k, `${selam(k)} yüklediğiniz ${ad.toLocaleLowerCase('tr')} okunamadı. Lütfen belgenin net ve tamamı görünen bir fotoğrafını öğrenci ekranınızdan ya da bu mesaja yanıt olarak tekrar gönderin.`, 'Evrak geri istendi'); return yenile(); }
        if (ev.target.closest('[data-profil-foto]')) return profilFoto(k);
        if (ev.target.closest('[data-deneme-yeni]')) return import('./deneme.js?v=76').then(m => m.denemeAc(k, yenile));
        const dy = ev.target.closest('[data-deneme-yazdir]'); if (dy) return import('./deneme.js?v=76').then(m => m.denemeYazdir(k, (k.dDeneme || []).find(x => x.id === dy.dataset.denemeYazdir)));
        if (ev.target.closest('[data-panel-gonder]')) { const b = ev.target.closest('[data-panel-gonder]'); b.disabled = true; return B.panelAc(k).then(link => { islem('Öğrenci paneli linki gönderdi', tamAd(k)); kaydet(); wpGonder(k, `${selam(k)} ${kursAdi('in')} öğrenci paneli: ${link} Ders programınızı, derslerinizi, ödemelerinizi buradan görebilir, evraklarınızı yükleyebilir, direksiyon dersi alabilirsiniz. Link size özeldir, başkasıyla paylaşmayın.`, 'Öğrenci paneli'); yenile(); }).catch(x => { b.disabled = false; bildir(B.hataMetni(x), 'uyari'); }); }
        if (ev.target.closest('[data-panel-kapat]')) return pencere({ baslik: 'Öğrenci paneli linki kapatılsın mı?', icerik: '<p>Gönderilen link artık açılmaz. Link başkasının eline geçtiyse ya da öğrenci kurstan ayrıldıysa kapatın; gerekirse yeni link gönderebilirsiniz.</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Linki kapat</button>', onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => B.panelKapat(k).then(() => { islem('Öğrenci paneli linkini kapattı', tamAd(k)); kaydet(); kapatPencere(); bildir('Link kapatıldı'); yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari'))); } });
        const ds = ev.target.closest('[data-dosya-git]'); if (ds) { const [sek, hedef] = ds.dataset.dosyaGit.split('|'); profilSekme = sek; ciz(); if (hedef) setTimeout(() => { const h = kap.querySelector('#' + hedef); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); return; }
        if (ev.target.closest('[data-ekders-kabul]')) return ekDersKabul(k);
        if (ev.target.closest('[data-ekders-ret]')) { k.ekDersTeklif = null; islem('Ek ders teklifi reddedildi', tamAd(k)); kaydet(); bildir('Teklif kapatıldı'); return yenile(); }
        if (ev.target.closest('[data-oto-kapat]')) { k.odeme.otomatik = null; islem('Otomatik çekimi kapattı', tamAd(k)); kaydet(); bildir('Otomatik çekim kapatıldı'); yenile(); return; }
        const dg = ev.target.closest('[data-dogrula]'); if (dg) { ev.preventDefault(); return evrakDogrula(k, dg.dataset.dogrula); }
        const eg3 = ev.target.closest('[data-evrak-gor]'); if (eg3) { ev.preventDefault(); const key = eg3.dataset.evrakGor, y = k.evrakYuklenen[key], ad = EVRAKLAR.find(x => x[0] === key)[1]; islem('Öğrenci evrakını açtı', tamAd(k) + ' · ' + ad); kaydet(); return pencere({ baslik: ad + ' · ' + tamAd(k), genis: y.tur === 'pdf', icerik: `${y.bulanik ? `<p class="ipucu uyari" style="margin-bottom:10px">${isaret('uyari', 20)}<span>Fotoğraf bulanık görünüyor; yazılar okunmuyorsa “Yeniden iste” ile öğrenciden tekrar isteyin.</span></p>` : ''}<div class="alan" style="margin-bottom:10px"><label>Bu belge hangisi?${y.tahmin ? ' <small style="color:var(--soluk);font-weight:400">(başlık tahmin edildi, kontrol edin)</small>' : ''}</label><select class="girdi" data-evrak-baslik style="max-width:320px">${EVRAKLAR.filter(([x]) => x === key || !k.evrak[x]).map(([x, t]) => `<option value="${x}" ${x === key ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` + (y.tur === 'pdf' ? `<iframe data-pdf title="${e(ad)}" style="width:100%;height:62vh;border:0;border-radius:8px"></iframe>` : `<img src="${y.veri}" alt="${e(ad)}" style="width:100%;border-radius:8px">`), altlik: `<a class="dg dg-cizgi" href="${y.veri}" download="${e(tamAd(k) + ' - ' + ad + (y.tur === 'pdf' ? '.pdf' : '.jpg'))}">İndir</a><button class="dg dg-cizgi" data-yeniden>Yeniden iste</button><button class="dg dg-hafif" data-kapat>Kapat</button><button class="dg dg-ana" data-evrak-onay="${key}">Onayla</button>`, onAc(d) { let anahtar = key; d.querySelector('[data-evrak-baslik]').addEventListener('change', ev => { import('./evrak.js?v=76').then(m => { const ob = kap.querySelector('[data-evrak-onay="' + anahtar + '"]'); m.evrakTasi(k, anahtar, ev.target.value); anahtar = ev.target.value; d.querySelector('[data-evrak-onay]').dataset.evrakOnay = anahtar; if (ob) ob.dataset.evrakOnay = anahtar; }); }); d.querySelector('[data-yeniden]').addEventListener('click', () => import('./evrak.js?v=76').then(m => { const yy = k.evrakYuklenen[anahtar]; delete k.evrakYuklenen[anahtar]; islem('Evrakı yeniden istedi', tamAd(k) + ' · ' + EVRAKLAR.find(x => x[0] === anahtar)[1]); kaydet(); kapatPencere(); wpGonder(k, m.yenidenIsteMetni(k, anahtar, yy && yy.bulanik), 'Evrak isteği'); yenile(); })); const fr = d.querySelector('[data-pdf]'); if (fr) fetch(y.veri).then(r => r.blob()).then(bl => { fr.src = URL.createObjectURL(bl); }); d.querySelector('[data-evrak-onay]').addEventListener('click', () => { kapatPencere(); const b = kap.querySelector('[data-evrak-onay="' + anahtar + '"]'); if (b) b.click(); }); } }); }
        const fb = ev.target.closest('[data-foto-buyut]'); if (fb) { ev.preventDefault(); islem('Evrak fotoğrafını açtı', tamAd(k) + ' · ' + EVRAKLAR.find(x => x[0] === fb.dataset.fotoBuyut)[1]); kaydet(); pencere({ baslik: EVRAKLAR.find(x => x[0] === fb.dataset.fotoBuyut)[1] + ' · ' + tamAd(k), icerik: `<img src="${k.evrakFoto[fb.dataset.fotoBuyut]}" alt="" style="width:100%;border-radius:8px">` }); }
        const oi = ev.target.closest('[data-odeme-islem]'); if (oi) odemeIslem(k, oi.dataset.odemeIslem);
        if (MZ.hazirTikla(ev, k, ciz)) return;
        const et = ev.target.closest('[data-ek-tahsil]'); if (et) ekKalemTahsil(k, +et.dataset.ekTahsil);
        const bl = ev.target.closest('[data-belge]'); if (bl) import('./sayfalar3.js?v=76').then(m => m.belgeAc(bl.dataset.belge, k.id));
        if (ev.target.closest('[data-ekders]')) ekDersOner(k);
        if (ev.target.closest('[data-sozlesme]')) sozlesmeImzalat(k);
        if (ev.target.closest('[data-ders-imza]')) import('./imza.js?v=76').then(m => m.imzayaGonderPenceresi(k, 'ders', imzasizDers(k).map(d => d.id)));
        if (ev.target.closest('[data-bilgi-duzenle]')) bilgiDuzenle(k);
        const kp = ev.target.closest('[data-kapanis]'); if (kp) kapanisAdim(k, kp.dataset.kapanis);
        const hb = ev.target.closest('[data-hak-karar]'); if (hb) hakKarar(k, hb.dataset.hakKarar);
      });
      kap.addEventListener('change', ev => {
        const fy = ev.target.closest('[data-foto-yukle]');
        if (fy && fy.files[0]) { fotoKucult(fy.files[0]).then(u => { k.evrakFoto = k.evrakFoto || {}; k.evrakFoto[fy.dataset.fotoYukle] = u; k.evrak[fy.dataset.fotoYukle] = true; islem('Evrak fotoğrafı yükledi', tamAd(k)); kaydet(); bildir('Evrak fotoğrafı kaydedildi'); yenile(); }).catch(() => bildir('Fotoğraf okunamadı', 'uyari')); return; }
        const c = ev.target.closest('[data-evrak]'); if (!c) return;
        k.evrak[c.dataset.evrak] = c.checked; if (c.dataset.evrak === 'sozlesme') k.sozlesmeImza = c.checked ? (k.sozlesmeImza || { tarih: gun(0), yontem: 'Islak imza' }) : null; islem(c.checked ? 'Evrak teslim aldı' : 'Evrakı eksik işaretledi', tamAd(k) + ' · ' + EVRAKLAR.find(x => x[0] === c.dataset.evrak)[1]);
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
      <span class="et" style="display:block;margin-top:14px">Ödeme yöntemi</span><div class="secim" style="margin-top:6px">${YONTEMLER.map((y, j) => `<label><input type="radio" name="y" value="${y}" ${j === 1 ? 'checked' : ''}><span>${y}</span></label>`).join('')}</div>
      <p class="ipucu uyari" data-nakit hidden style="margin-top:10px">${isaret('uyari', 18)}<span>Eğitim ücreti kurumun MEB’e bildirilmiş banka hesabına yatırılarak tahsil edilir (Özel Öğretim Kurumları Yönetmeliği m.55/3, 5 Eylül 2025). Nakit aldıysanız bankaya yatırın.</span></p>
      <label style="display:flex;gap:8px;align-items:center;margin-top:16px;font-size:14px"><input type="checkbox" checked name="mak"> Kursiyere WhatsApp’tan makbuz gönder</label><label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" name="yaz"> Makbuzu yazdır</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-onay>Tahsil et</button>`,
    onAc(d) {
      const nk = () => { d.querySelector('[data-nakit]').hidden = d.querySelector('[name=y]:checked').value !== 'Nakit'; }; d.querySelectorAll('[name=y]').forEach(r => r.addEventListener('change', nk)); nk();
      d.querySelector('[data-onay]').addEventListener('click', () => {
        const y = d.querySelector('[name=y]:checked').value, v = Math.min(kalan, +d.querySelector('#t-tutar').value.replace(/\D/g, '') || 0);
        if (!v) return bildir('Tutar girin', 'uyari');
        geriAlNoktasi();
        t.kismi = (t.kismi || 0) + v;
        if (t.kismi >= t.tutar) { t.odendi = gun(0); t.yontem = y; delete t.kismi; }
        islem('Tahsilat aldı', tamAd(k) + ' · ' + (i + 1) + '. taksit · ' + tl(v) + (t.odendi ? '' : ' (kısmi)'));
        const hid = 'h' + Date.now(); S.hareket.unshift({ id: hid, tarih: gun(0), tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + (i + 1) + '. taksit' + (t.odendi ? '' : ' (kısmi)'), tutar: v, yontem: y, kursiyer: k.id });
        kaydet(); kapatPencere();
        if (d.querySelector('[name=mak]').checked) wpGonder(k, `${selam(k)} ${tl(v)} ödemeniz alındı, teşekkür ederiz. Kalan borcunuz ${tl(kalanBorc(k))}. ${S.kurs.ad}`, 'Makbuz');
        if (d.querySelector('[name=yaz]').checked) setTimeout(() => import('./sayfalar3.js?v=76').then(m => m.belgeAc('makbuz', hid)), 200);
        bildir(tl(v) + ' tahsil edildi' + (t.odendi ? '' : ', taksitte ' + tl(t.tutar - t.kismi) + ' kaldı'), 'tamam', true);
        sonra ? sonra() : yenile();
      });
    },
  });
}
export function ekKalemTahsil(k, j) {
  const x = k.odeme.ekler[j];
  pencere({
    baslik: x.ad + ' · ' + tl(x.tutar),
    icerik: `<div class="alan"><span class="et">Ödeme yöntemi</span><div class="secim">${YONTEMLER.map((y, i) => `<label><input type="radio" name="y" value="${y}" ${i === 0 ? 'checked' : ''}><span>${y}</span></label>`).join('')}</div></div><label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" name="mak"> Makbuzu yazdır</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Tahsil et</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        geriAlNoktasi(); x.odendi = gun(0); const hid = 'h' + Date.now();
        S.hareket.unshift({ id: hid, tarih: gun(0), tur: 'Gelir', kategori: x.ad, aciklama: tamAd(k) + ' · ' + x.ad, tutar: x.tutar, yontem: d.querySelector('[name=y]:checked').value, kursiyer: k.id });
        islem('Tahsilat aldı', tamAd(k) + ' · ' + x.ad + ' · ' + tl(x.tutar)); kaydet(); kapatPencere(); bildir(x.ad + ' tahsil edildi', 'tamam', true); yenile();
        if (d.querySelector('[name=mak]').checked) import('./sayfalar3.js?v=76').then(m => m.belgeAc('makbuz', hid));
      });
    },
  });
}
export function odemeIslem(k, tur, oneri) {
  if (tur === 'ucretsiz') return MZ.ucretsizYap(k, yenile);
  const yi = tur === 'iade' ? MZ.yasalIade(k) : null;
  const acik = k.odeme.taksitler.filter(t => !t.odendi && !t.iptal);
  const formlar = {
    indirim: ['İndirim uygula', `<div class="alan"><label>İndirim tutarı (₺)</label><input name="v" inputmode="numeric" placeholder="1000"></div><div class="alan" style="margin-top:12px"><label>Neden</label><select name="n"><option>Öğrenci indirimi</option><option>Kardeş indirimi</option><option>Peşin ödeme indirimi</option><option>Kampanya</option></select></div><p style="font-size:13.5px;color:var(--soluk);margin-top:10px">İndirim son açık taksitlerden düşülür.</p>`],
    iade: ['İade yap', `<div class="alan"><label>İade tutarı (₺)</label><input name="v" inputmode="numeric" value="${oneri || ''}"></div><div class="alan" style="margin-top:12px"><label>Neden</label><select name="n"><option>Kurstan ayrıldı</option><option>Fazla ödeme</option><option>Diğer</option></select></div><p style="font-size:13.5px;color:var(--soluk);margin-top:10px">İade kasaya gider olarak işlenir; kursiyerin toplam ücreti aynı tutarda düşer. İade kursiyerin banka hesabına yapılır.</p>${yi && !k.ucretsiz ? `<details style="margin-top:10px"${oneri ? '' : ' open'}><summary style="cursor:pointer;font-weight:700;color:var(--murekkep)">Kurstan ayrılırsa yasal iade: ${tl(yi.iade)}</summary><div style="margin-top:8px">${MZ.iadeTablosu(yi)}</div></details>` : ''}`],
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
        if (tur === 'indirim') { if (!v) return bildir('Tutar girin', 'uyari'); if (!mudurMu()) return bildir('İndirim yalnız kurs müdürü tarafından yapılabilir', 'uyari'); let kalan = v; for (const t of acik.slice().reverse()) { const d2 = Math.min(kalan, t.tutar - (t.kismi || 0)); t.tutar -= d2; kalan -= d2; if (!kalan) break; } k.odeme.taksitler = k.odeme.taksitler.filter(t => t.odendi || t.tutar > 0); k.odeme.toplam -= v - kalan; islem('İndirim uyguladı', tamAd(k) + ' · ' + tl(v - kalan) + ' · ' + f.n.value); }
        if (tur === 'iade') { if (!v) return bildir('Tutar girin', 'uyari'); if (!mudurMu()) return bildir('İade yalnız kurs müdürü tarafından yapılabilir', 'uyari'); if (v > odenen(k)) return bildir('İade, kursiyerin ödediği ' + tl(odenen(k)) + '’yi aşamaz', 'uyari'); const neden = f.n.value; return pinSor(tl(v) + ' iade').then(onay => { if (!onay) return; k.odeme.iade = (k.odeme.iade || 0) + v; k.odeme.toplam -= v; if (k.kapali && k.kapali.iadeSon && !k.kapali.iadeYapildi) k.kapali.iadeYapildi = gun(0); S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gider', kategori: 'İade', aciklama: tamAd(k) + ' · iade · ' + neden, tutar: v, yontem: 'Havale' }); islem('İade yaptı', tamAd(k) + ' · ' + tl(v)); kaydet(); bildir('İade kaydedildi: ' + tl(v)); yenile(); }); }
        if (tur === 'plan') { const top = acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0), n = +f.v.value || 1; k.odeme.taksitler = k.odeme.taksitler.filter(t => t.odendi); acik.forEach(t => { if (t.kismi) k.odeme.taksitler.push({ vade: t.vade, tutar: t.kismi, odendi: gun(0), yontem: 'Kısmi' }); }); for (let i = 0; i < n; i++) { const p = Math.floor(top / n / 50) * 50; k.odeme.taksitler.push({ vade: ayEkle(gun(0), i + 1), tutar: i === n - 1 ? top - p * (n - 1) : p, odendi: null, yontem: null }); } islem('Ödeme planını değiştirdi', tamAd(k) + ' · ' + n + ' taksit'); }
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
  const sutunlar = planGorunum === 'egitmen' ? sb(S.egitmenler) : sb(S.araclar);
  const gDers = sbDers(S.dersler).filter(d => d.tarih === planGun);
  const kapali = kapaliGun(planGun);
  const sutunEg = sut => planGorunum === 'egitmen' ? sut.id : sut.egitmen;
  const hucre = (sut, s) => {
    if (s === '13:00') return `<div class="tk-hucre ogle" title="Öğle arası"></div>`;
    const iz = izinli(sutunEg(sut), planGun);
    const d = gDers.find(x => x.saat === s && (planGorunum === 'egitmen' ? x.egitmen === sut.id : x.arac === sut.id));
    if (!d) { if (iz || kapali) return `<div class="tk-hucre ${iz ? 'izinli' : ''}" title="${iz ? e(iz.tur) : e(kapali)}"></div>`; return `<div class="tk-hucre bos-hucre" data-ekle="${sut.id}|${s}" data-hucre="${sut.id}|${s}" tabindex="0" role="button" aria-label="${s} ders ekle"></div>`; }
    const k = kursiyer(d.kursiyer);
    return `<div class="tk-hucre" data-hucre="${sut.id}|${s}"><div class="ders ${d.durum === 'Yapıldı' ? 'yapildi' : d.durum === 'Gelmedi' ? 'gelmedi' : ''} ${d.tekrar ? 'tekrar' : ''}" data-ders="${d.id}" draggable="${d.durum === 'Planlandı'}" tabindex="0" role="button"><b>${e(tamAd(k))}</b><small>${planGorunum === 'egitmen' ? (d.arac ? arac(d.arac).plaka : '') : egitmen(d.egitmen).ad} · ${k.direksiyon + (d.durum === 'Planlandı' ? 1 : 0)}. ders</small></div></div>`;
  };
  const doluluk = Math.round(gDers.length / (sutunlar.length * (SAATLER.length - 1)) * 100);
  const bas = s => planGorunum === 'egitmen'
    ? (() => { const ar = sb(S.araclar).find(a => a.egitmen === s.id), plk = S.araclar.filter(a => a.egitmen === s.id).map(a => a.plaka).join(' · '), iz = izinli(s.id, planGun); return `<div class="tk-bas">${ar ? aracGorsel(ar, 'kucuk') : ''}<div><b>${e(s.ad)}</b><small>${iz ? '<span style="color:var(--kirmizi);font-weight:700">' + e(iz.tur) + '</span>' : gDers.filter(d => d.egitmen === s.id).length + ' ders · ' + plk}</small></div></div>`; })()
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
      ${kapali ? `<div class="ipucu uyari" style="margin:14px">${isaret('dur', 20)}${kapali === 'Pazar' ? 'Pazar günü' : 'Resmî tatil;'} kurs kapalı, ders planlanamaz.</div>` : ''}
      <div class="takvim" style="--sutun:${sutunlar.length}">
        <div class="tk-bas"></div>
        ${sutunlar.map(bas).join('')}
        ${SAATLER.map(s => `<div class="tk-saat">${s}</div>` + sutunlar.map(su => hucre(su, s)).join('')).join('')}
      </div>
    </div>
    <div class="ara-bosluk"></div>
    ${(S.bosTeklif || []).filter(t => fark(t.tarih) >= 0).map(t => `<div class="kart" style="margin-bottom:14px"><div class="kart-bas"><h3>Açık teklif · ${tarihUzun(t.tarih)} ${t.saat}</h3><small>${e(egitmen(t.egitmen).ad)} · ${t.adaylar.length} kişiye gönderildi</small><div class="sag"><button class="dg dg-hafif dg-kucuk" data-bt-kapat="${t.id}">Teklifi kapat</button></div></div><ul class="liste" style="margin-top:6px">${t.adaylar.map(kursiyer).filter(Boolean).map(x => `<li><span style="flex:1;color:var(--murekkep);font-weight:700">${e(tamAd(x))}</span><button class="dg dg-cizgi dg-kucuk" data-bt-kabul="${t.id}|${x.id}">Kabul etti</button></li>`).join('')}</ul></div>`).join('')}
    <div class="kart"><div class="kart-bas"><h3>Bekleme listesi</h3><small>Boşalan saat önce bu kişilere teklif edilir</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-bek-ekle>${ik('arti')}Listeye ekle</button></div></div>
      <ul class="liste" style="margin-top:8px">${bek.map(b => `<li><a class="kisi" href="#/kursiyer/${b.k.id}" style="flex:1"><div><b>${e(tamAd(b.k))}</b><small>${e(b.tercih)} · ${b.k.direksiyon}/${SINIFLAR[b.k.sinif].direksiyon} ders · ${goreli(b.eklendi)} eklendi</small></div></a><span class="sag"><button class="dg dg-hafif dg-kucuk" data-bek-cik="${b.k.id}">Çıkar</button></span></li>`).join('') || '<li>' + bos('Bekleme listesi boş', 'Erken ders isteyenleri buraya ekleyin.') + '</li>'}</ul></div>`,
    baglan(k) {
      { const sg = k.querySelector('.gun-sec .secili'); if (sg) { const gs = sg.parentElement; gs.scrollLeft = Math.max(0, sg.offsetLeft - gs.offsetLeft - 8); } }
      const ekle = v => { const [sid, s] = v.split('|'); dersEkle(sid, s); };
      k.addEventListener('click', ev => {
        const t = ev.target;
        const g = t.closest('[data-gun]'); if (g) { planGun = g.dataset.gun; yenile(); }
        const v = t.closest('[data-gorunum]'); if (v) { planGorunum = v.dataset.gorunum; yenile(); }
        const h = t.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle);
        const d = t.closest('[data-ders]'); if (d) dersAc(d.dataset.ders);
        const bk = t.closest('[data-bt-kabul]'); if (bk) { const [tid, kid] = bk.dataset.btKabul.split('|'); return bosTeklifKabul(tid, kid); }
        const bkp = t.closest('[data-bt-kapat]'); if (bkp) { S.bosTeklif = S.bosTeklif.filter(x => x.id !== bkp.dataset.btKapat); islem('Boş saat teklifini kapattı'); kaydet(); return yenile(); }
        const c = t.closest('[data-bek-cik]'); if (c) { S.bekleme = S.bekleme.filter(b => b.kursiyer !== c.dataset.bekCik); kaydet(); yenile(); }
        if (t.closest('[data-bek-ekle]')) { const l = sb(S.kursiyerler).filter(x => x.asama === 'Direksiyon' && !S.bekleme.some(b => b.kursiyer === x.id)); pencere({ baslik: 'Bekleme listesine ekle', icerik: `<div class="alan"><label>Kursiyer</label><select id="b-k">${l.map(x => `<option value="${x.id}">${e(tamAd(x))}</option>`).join('')}</select></div><div class="alan" style="margin-top:12px"><label>Tercih</label><select id="b-t"><option>Fark etmez</option><option>Hafta içi sabah</option><option>Hafta içi akşam</option><option>Cumartesi</option></select></div>`, altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Ekle</button>`, onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { S.bekleme.push({ kursiyer: p.querySelector('#b-k').value, tercih: p.querySelector('#b-t').value, eklendi: gun(0) }); kaydet(); kapatPencere(); bildir('Bekleme listesine eklendi'); yenile(); }); } }); }
      });
      k.addEventListener('keydown', ev => { if (ev.key !== 'Enter') return; const h = ev.target.closest('[data-ekle]'); if (h) ekle(h.dataset.ekle); const d = ev.target.closest('[data-ders]'); if (d) dersAc(d.dataset.ders); });
      // sürükle-bırak
      let suruklenen = null;
      k.addEventListener('dragstart', ev => { const d = ev.target.closest('[data-ders]'); if (!d) return; suruklenen = d.dataset.ders; ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', suruklenen); } catch (x) { } });
      k.addEventListener('dragover', ev => { const h = ev.target.closest('.bos-hucre'); if (h && suruklenen) { ev.preventDefault(); k.querySelectorAll('.surukle-ust').forEach(x => x.classList.remove('surukle-ust')); h.classList.add('surukle-ust'); } });
      k.addEventListener('dragend', () => { k.querySelectorAll('.surukle-ust').forEach(x => x.classList.remove('surukle-ust')); suruklenen = null; });
      k.addEventListener('drop', ev => {
        const h = ev.target.closest('.bos-hucre'); if (!h || !suruklenen) return; ev.preventDefault();
        const d = sbDers(S.dersler).find(x => x.id === suruklenen), [sid, saat] = h.dataset.hucre.split('|');
        const ksn = kursiyer(d.kursiyer).sinif, yeniEg = planGorunum === 'egitmen' ? sid : arac(sid).egitmen;
        if (planGorunum === 'arac' && arac(sid).sinif !== ksn) return bildir(arac(sid).plaka + ' ' + SINIFLAR[arac(sid).sinif].ad + ' aracı; kursiyer ' + SINIFLAR[ksn].ad, 'uyari');
        const yeniAr = planGorunum === 'egitmen' ? (dersAraci(sid, ksn, planGun, saat, d) || {}).id : sid;
        if (!yeniAr) return bildir('Bu saatte boş ' + SINIFLAR[ksn].ad + ' aracı yok', 'uyari');
        if (sbDers(S.dersler).some(x => x.id !== d.id && x.kursiyer === d.kursiyer && x.tarih === planGun && x.saat === saat)) return bildir('Kursiyerin o saatte başka dersi var', 'uyari');
        if (!egitmen(yeniEg).siniflar.includes(kursiyer(d.kursiyer).sinif)) return bildir(egitmen(yeniEg).ad + ' bu sınıfta ders vermiyor', 'uyari');
        geriAlNoktasi(); const eskiSaat = d.saat, eskiEg = d.egitmen; Object.assign(d, { saat, egitmen: yeniEg, arac: yeniAr }); islem('Dersi taşıdı', tamAd(kursiyer(d.kursiyer)) + ' · ' + eskiSaat + ' → ' + saat); kaydet();
        const ks = kursiyer(d.kursiyer), egY = egitmen(yeniEg);
        yenile();
        bildirimler([{ kim: ks, metin: `${selam(ks)} ${tarihUzun(planGun)} direksiyon dersiniz ${eskiSaat} yerine ${saatE(saat)} saatine alındı${eskiEg !== yeniEg ? '; usta öğreticiniz ' + egY.ad : ''}.`, tur: 'Saat değişikliği' }, { kim: egY, metin: `${egY.ad.split(' ')[0]} Hoca, ${tarihUzun(planGun)} ${ks.ad} ${ks.soyad} dersi ${eskiEg !== yeniEg ? 'size verildi, saat ' + saat : eskiSaat + ' yerine ' + saat + '’e alındı'}.`, tur: 'Saat değişikliği' }, eskiEg !== yeniEg && { kim: egitmen(eskiEg), metin: `${egitmen(eskiEg).ad.split(' ')[0]} Hoca, ${tarihUzun(planGun)} ${eskiSaat} ${ks.ad} ${ks.soyad} dersi programınızdan çıkarıldı.`, tur: 'Saat değişikliği' }], 'Ders saati değişti');
      });
      const sec = k.querySelector('.gun-sec .secili'); if (sec) sec.scrollIntoView({ inline: 'center', block: 'nearest' });
    },
  };
}
// “+ Yeni” penceresinden: belirli öğretmen, gün ve saat için ders ekleme penceresini açar
export function dersPlanlaAc(egId, tarih, saat) { planGun = tarih; planGorunum = 'egitmen'; dersEkle(egId, saat); }
function dersEkle(sutunId, saat) {
  const kapali = kapaliGun(planGun); if (kapali) return bildir(tarihUzun(planGun) + ' ' + kapali.toLowerCase() + '; kurs kapalı, ders planlanamaz', 'uyari');
  const aracGor = planGorunum === 'arac', ar0 = aracGor ? arac(sutunId) : null;
  const eg = aracGor ? (egitmen(ar0.egitmen) || S.egitmenler.find(h => h.siniflar.includes(ar0.sinif) && !S.dersler.some(d => d.egitmen === h.id && d.tarih === planGun && d.saat === saat))) : egitmen(sutunId);
  if (!eg) return bildir('Bu saatte bu araç için boş usta öğretici yok', 'uyari');
  const oGun = id => S.dersler.filter(x => x.kursiyer === id && x.tarih === planGun).length;
  const planli = id => S.dersler.filter(x => x.kursiyer === id && x.durum === 'Planlandı').length;
  const adaylar = sb(S.kursiyerler).filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && (aracGor ? k.sinif === ar0.sinif : eg.siniflar.includes(k.sinif))).sort((a, b) => (oGun(a.id) - oGun(b.id)) || ((a.egitmen === eg.id ? -1 : 1) - (b.egitmen === eg.id ? -1 : 1)));
  if (!adaylar.length) return bildir(aracGor ? `${ar0.plaka} (${SINIFLAR[ar0.sinif].ad}) için direksiyon aşamasında kursiyer yok` : `${eg.ad} için direksiyon aşamasında kursiyer yok`, 'uyari');
  const aracBul = k => aracGor ? ar0 : dersAraci(eg.id, k.sinif, planGun, saat);
  pencere({
    baslik: 'Direksiyon dersi ekle',
    icerik: `<div style="display:flex;gap:14px;align-items:center;margin-bottom:16px" id="d-bas"></div>
      <div class="alan"><label for="d-k">Kursiyer</label><select id="d-k">${adaylar.map(k => `<option value="${k.id}">${e(tamAd(k))} · ${SINIFLAR[k.sinif].ad} · ${k.direksiyon + planli(k.id)}/${SINIFLAR[k.sinif].direksiyon}${k.egitmen === eg.id ? '' : ' · başka usta öğretici'}</option>`).join('')}</select></div>
      <div id="d-uyari" style="margin-top:12px;display:grid;gap:6px"></div>
      <label id="d-ek-alan" hidden style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input type="checkbox" checked name="ek"> Ek ders ücretini (${tl(S.kurs.ekDersUcreti)}) ödeme planına ekle</label>
      <div class="alan" style="margin-top:12px"><label for="d-tekrar">Tekrar</label><select id="d-tekrar"><option value="0">Tek seferlik</option><option value="2">Her hafta aynı saatte · 2 hafta</option><option value="4">Her hafta aynı saatte · 4 hafta</option><option value="6">Her hafta aynı saatte · 6 hafta</option></select></div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px"><input type="checkbox" checked name="hat"> Kursiyere WhatsApp’tan bildir</label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet>Dersi ekle</button>`,
    onAc(d) {
      const sel = d.querySelector('#d-k'), uy = d.querySelector('#d-uyari'), dg = d.querySelector('[data-kaydet]'), ekAlan = d.querySelector('#d-ek-alan');
      const kontrol = () => {
        const k = kursiyer(sel.value), ar = aracBul(k), sorun = [], not = [];
        d.querySelector('#d-bas').innerHTML = `${ar ? aracGorsel(ar, 'orta') : ''}<div><b style="display:block;font-family:var(--baslik);font-size:18px;color:var(--murekkep)">${tarihUzun(planGun)} · ${saat}</b><span>${e(eg.ad)} · ${ar ? plaka(ar.plaka) + ' · ' + e(ar.vites) + (ar.egitmen !== eg.id ? ' · havuz aracı' : '') : 'araç yok'}</span></div>`;
        if (!ar) sorun.push(`Bu saatte boş ${SINIFLAR[k.sinif].ad} aracı yok.`);
        if (ar && [ar.muayene, ar.sigorta].some(t => t && t < planGun)) sorun.push(ar.plaka + ' muayene/sigorta süresi dolmuş; bu tarihte ders planlanamaz.');
        Object.entries(eg.belgeler || {}).filter(([, t]) => t < planGun).forEach(([b]) => sorun.push(eg.ad + ' · ' + ({ sertifika: 'usta öğretici sertifikası', saglik: 'sağlık raporu', adli: 'adli sicil kaydı' }[b]) + ' süresi dolmuş; bu tarihte ders planlanamaz.'));
        const ayni = S.dersler.filter(x => x.kursiyer === k.id && x.tarih === planGun), cak = ayni.find(x => x.saat === saat);
        if (cak) sorun.push(`Bu kursiyerin aynı saatte ${egitmen(cak.egitmen).ad} ile dersi var.`);
        const ustaGun = S.dersler.filter(x => x.egitmen === eg.id && x.tarih === planGun).length, ustaSinir = S.kurs.ustaGunlukSinir || 8;
        if (ustaGun >= ustaSinir) not.push(`${eg.ad} o gün ${ustaGun} ders veriyor; usta başına günlük sınır ${ustaSinir} ders. Yorgunluk denetimde sorulabilir.`);
        if (!cak && ayni.length >= S.kurs.gunlukDersSiniri) not.push(`Kursiyerin o gün zaten ${ayni.length} dersi var. Kurs ayarlarındaki günlük sınır ${S.kurs.gunlukDersSiniri} ders.`);
        const gec = gecikenler(k).reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
        if (gec) (S.kurs.borcluDers === 'engelle' ? sorun : not).push(`Taksiti gecikmiş: ${tl(gec)}.${S.kurs.borcluDers === 'engelle' ? ' Kurs ayarı: borcu gecikene ders planlanmaz.' : ' Dersten önce tahsil etmeyi unutmayın.'}`);
        const ek = k.direksiyon + planli(k.id) >= SINIFLAR[k.sinif].direksiyon;
        if (ek) not.push(`Zorunlu ${SINIFLAR[k.sinif].direksiyon} ders ${k.direksiyon >= SINIFLAR[k.sinif].direksiyon ? 'tamamlandı' : 'planla doluyor'}; bu ders ek ders sayılır.`);
        ekAlan.hidden = !ek;
        uy.innerHTML = sorun.map(x => `<div class="ipucu uyari">${isaret('dur', 20)}${e(x)}</div>`).join('') + not.map(x => `<div class="ipucu">${isaret('uyari', 20)}${e(x)}</div>`).join('');
        dg.disabled = !!sorun.length;
      };
      sel.addEventListener('change', kontrol); kontrol();
      dg.addEventListener('click', () => {
        const k = kursiyer(sel.value), n = +d.querySelector('#d-tekrar').value, atlanan = [];
        let eklenen = 0;
        for (let h = 0; h <= Math.max(0, n - 1); h++) {
          const t = tarihOku(planGun); t.setDate(t.getDate() + 7 * h); const ti = iso(t);
          if (kapaliGun(ti)) { atlanan.push(tarih(ti) + ' ' + kapaliGun(ti).toLowerCase()); continue; }
          if (S.dersler.some(x => x.tarih === ti && x.saat === saat && (x.egitmen === eg.id || x.kursiyer === k.id))) { atlanan.push(tarih(ti) + ' dolu'); continue; }
          const ar = aracGor ? (S.dersler.some(x => x.tarih === ti && x.saat === saat && x.arac === ar0.id) ? null : ar0) : dersAraci(eg.id, k.sinif, ti, saat);
          if (!ar) { atlanan.push(tarih(ti) + ' araç yok'); continue; }
          S.dersler.push({ id: 'd' + Date.now() + h, kursiyer: k.id, egitmen: eg.id, arac: ar.id, tarih: ti, saat, durum: 'Planlandı', tekrar: n > 0 }); eklenen++;
        }
        if (!ekAlan.hidden && d.querySelector('[name=ek]').checked && eklenen) { k.odeme.ekler = k.odeme.ekler || []; k.odeme.ekler.push({ ad: 'Ek direksiyon dersi × ' + eklenen, tutar: S.kurs.ekDersUcreti * eklenen, odendi: null }); }
        islem('Ders ekledi', tamAd(k) + ' · ' + tarih(planGun) + ' ' + saat + (n ? ' · ' + eklenen + ' hafta' : '')); kaydet(); kapatPencere();
        const metin = n ? `${selam(k)} ${eklenen} hafta boyunca her ${gunKisa(planGun)} ${saatDe(saat)} ${eg.ad} ile direksiyon dersiniz var.` : `${selam(k)} ${tarihUzun(planGun)} ${saatDe(saat)} ${eg.ad} ile direksiyon dersiniz planlandı.`;
        if (d.querySelector('[name=hat]').checked) bildirimler([{ kim: k, metin, tur: 'Ders bildirimi' }, { kim: eg, metin: `${eg.ad.split(' ')[0]} Hoca, ${n ? eklenen + ' hafta boyunca her ' + gunKisa(planGun) : tarihUzun(planGun)} ${saatDe(saat)} ${tamAd(k)} (${SINIFLAR[k.sinif].ad}) ile direksiyon dersiniz var. Kursiyerin ${k.direksiyon + 1}. dersi.`, tur: 'Ders bildirimi' }], 'Ders planlandı'); else bildir(eklenen + ' ders eklendi');
        if (atlanan.length) setTimeout(() => bildir('Atlanan haftalar: ' + atlanan.join(', '), 'uyari'), 900);
        yenile();
      });
    },
  });
}
function bosSaatiDoldur(d) {
  const bek = S.bekleme.map(b => kursiyer(b.kursiyer)).filter(k => k && k.id !== d.kursiyer && (arac(d.arac) ? arac(d.arac).sinif === k.sinif : egitmen(d.egitmen).siniflar.includes(k.sinif)) && !S.dersler.some(x => x.kursiyer === k.id && x.tarih === d.tarih && x.saat === d.saat));
  if (!bek.length) { bildir('Ders iptal edildi'); return yenile(); }
  pencere({
    baslik: 'Boşalan saati dolduralım mı?',
    icerik: `<div class="ipucu" style="margin-bottom:14px">${isaret('bilgi', 22)}<span>${tarihUzun(d.tarih)} ${d.saat} boşaldı. Bekleme listesindeki ${bek.length} kişiye WhatsApp’tan teklif gidecek; ilk “evet” diyen dersi alır.</span></div>${bek.map(k => `<div class="evrak">${isaret('zorunlu', 20)}<span style="flex:1;color:var(--murekkep);font-weight:700">${e(tamAd(k))}</span><small style="color:var(--soluk)">${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders</small></div>`).join('')}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Boş kalsın</button><button class="dg dg-wp" data-teklif>${ik('wp')}Teklif gönder</button>`,
    onAc(p) {
      p.querySelector('[data-teklif]').addEventListener('click', () => {
        kapatPencere(); const teklifMetni = k => `${selam(k)} ${tarihUzun(d.tarih)} ${saatDe(d.saat)} ${egitmen(d.egitmen).ad} ile direksiyon saati boşaldı. İsterseniz “evet” yazın; ilk yazan alır.`;         S.bosTeklif = S.bosTeklif || []; S.bosTeklif.push({ id: 'b' + Date.now(), tarih: d.tarih, saat: d.saat, egitmen: d.egitmen, arac: d.arac, adaylar: bek.map(k => k.id), gonderildi: yerelZaman() });
        islem('Boş saat teklifi gönderdi', tarih(d.tarih) + ' ' + d.saat + ' · ' + bek.length + ' kişi'); kaydet();
        yenile(); waSirali(kisiListe(bek, teklifMetni), 'Boş saat teklifi', { aciklama: 'Kabul eden olunca Plan’daki “Açık teklif”ten işaretleyin.' });
      });
    },
  });
}
// Boş saat teklifini kabul eden: ders onun adına planlanır, diğer adaylara saat doldu bilgisi gider.
export function bosTeklifKabul(tid, kid, kursiyerden = false) {
  const t = (S.bosTeklif || []).find(x => x.id === tid), k = kursiyer(kid); if (!t || !k) return;
  if (S.dersler.some(x => x.tarih === t.tarih && x.saat === t.saat && (x.egitmen === t.egitmen || x.kursiyer === k.id))) { S.bosTeklif = S.bosTeklif.filter(x => x !== t); kaydet(); yenile(); return bildir('Bu saat artık dolu; teklif kapatıldı', 'uyari'); }
  S.dersler.push({ id: 'd' + Date.now(), kursiyer: k.id, egitmen: t.egitmen, arac: t.arac, tarih: t.tarih, saat: t.saat, durum: 'Planlandı' });
  S.bekleme = S.bekleme.filter(b => b.kursiyer !== k.id); S.kazanim.doldurulan++; S.bosTeklif = S.bosTeklif.filter(x => x !== t);
  const digerleri = t.adaylar.filter(x => x !== k.id).map(kursiyer).filter(Boolean);
  islem('Boş saati doldurdu', tamAd(k) + ' · ' + tarih(t.tarih) + ' ' + t.saat); kaydet(); yenile();
  const liste = [{ k, m: `${selam(k)} ${tarihUzun(t.tarih)} ${t.saat} dersiniz ${egitmen(t.egitmen).ad} ile planlandı.` }, ...digerleri.map(o => ({ k: o, m: `${selam(o)} ${tarihUzun(t.tarih)} ${t.saat} saati doldu; bir sonraki boşlukta yine haber vereceğiz.` }))];
    const hoca = egitmen(t.egitmen), hm = `${hoca.ad.split(' ')[0]} Hoca, ${tarihUzun(t.tarih)} ${t.saat} boşalan saatinize ${tamAd(k)} yazıldı.`;
  if (kursiyerden) { bildirimler([{ kim: hoca, metin: hm, tur: 'Boş saat' }, { kim: 'mudur', metin: `${tamAd(k)} ${tarihUzun(t.tarih)} ${t.saat} boş saat teklifini kabul etti.`, tur: 'Boş saat' }], 'Boş saat doldu'); return bildir('Saat senin; dersin planlandı'); }
  waSirali([...liste.map(x => ({ ad: tamAd(x.k), tel: x.k.tel, rol: 'ÖĞRENCİ', metin: x.m })), { ad: hoca.ad, tel: hoca.tel, rol: 'HOCA', metin: hm }], 'Boş saati doldurdu · bilgilendirme', { sessiz: true });
}
// Ek ders teklifi kabul: ücret ödeme planına yeni taksit olarak eklenir.
export function ekDersKabul(k) {
  const t = k.ekDersTeklif; if (!t) return;
  k.odeme.taksitler.push({ vade: gun(30), tutar: t.tutar, odendi: null, yontem: null, aciklama: t.n + ' ek direksiyon dersi' }); k.odeme.toplam += t.tutar; S.kazanim.ekDers++;
  k.ekDersHakki = (k.ekDersHakki || 0) + t.n; k.ekDersTeklif = null;
  islem('Ek ders teklifi kabul edildi', tamAd(k) + ' · ' + t.n + ' ders · ' + tl(t.tutar)); kaydet();
  bildir(k.ad + ' ' + t.n + ' ek dersi kabul etti; ' + tl(t.tutar) + ' ödeme planına eklendi'); yenile();
}
function dersAc(id) {
  const d = S.dersler.find(x => x.id === id); const k = kursiyer(d.kursiyer), eg = egitmen(d.egitmen), ar = arac(d.arac);
  pencere({
    baslik: 'Direksiyon dersi',
    icerik: `<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px;flex-wrap:wrap">${ar ? aracGorsel(ar, 'orta') : ''}<div style="flex:1;min-width:180px"><b style="display:block;font-family:var(--baslik);font-size:20px;color:var(--murekkep)">${e(tamAd(k))}</b><span>${SINIFLAR[k.sinif].ad} · ${k.direksiyon}/${SINIFLAR[k.sinif].direksiyon} ders yapıldı</span></div><a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}" data-kapat>Dosyayı aç</a></div>
      <dl class="bilgi-tablo"><dt>Zaman</dt><dd>${tarihUzun(d.tarih)} · ${d.saat}${d.tekrar ? ' · haftalık' : ''}</dd><dt>Usta öğretici</dt><dd>${e(eg.ad)}</dd><dt>Araç</dt><dd>${ar ? plaka(ar.plaka) + ' ' + e(ar.model) : '—'}</dd><dt>Durum</dt><dd>${rozet(d.durum, d.durum === 'Yapıldı' ? 'yesil' : d.durum === 'Gelmedi' ? 'kirmizi' : 'mavi')}</dd>${d.durum === 'Yapıldı' ? `<dt>İmza</dt><dd>${d.imza ? (d.imza.kursiyer ? `<img src="${d.imza.kursiyer}" alt="Kursiyer imzası" style="height:38px;background:#fff;border:1px solid var(--cizgi);border-radius:4px"> <img src="${d.imza.usta}" alt="Usta öğretici imzası" style="height:38px;background:#fff;border:1px solid var(--cizgi);border-radius:4px">` : rozet('İmzalı', 'yesil')) : rozet('İmza eksik', 'kirmizi') + ' <small style="color:var(--soluk)">Usta öğretici ekranından imzalatılır</small>'}</dd>` : ''}</dl>`,
    altlik: d.durum === 'Planlandı' ? `<button class="dg dg-cizgi" data-iptal style="margin-right:auto;color:var(--kirmizi);border-color:var(--kirmizi)">Dersi iptal et</button><button class="dg dg-cizgi" data-tasi>Taşı</button><button class="dg dg-cizgi" data-gelmedi>Gelmedi</button><button class="dg dg-ana" data-yapildi>${ik('tik')}Yapıldı</button>` : `<button class="dg dg-cizgi" data-geri>Planlandı’ya al</button><button class="dg dg-koyu" data-kapat>Tamam</button>`,
    onAc(p) {
      p.addEventListener('click', ev => {
        const henuz = () => d.tarih > gun(0) || (d.tarih === gun(0) && d.saat > new Date().toTimeString().slice(0, 5));
        if (ev.target.closest('[data-yapildi]') && henuz()) return bildir(`Bu ders ${tarihUzun(d.tarih)} ${d.saat}; saati gelmeden “Yapıldı” işaretlenemez`, 'uyari');
        if (ev.target.closest('[data-gelmedi]') && henuz()) return bildir('Dersin saati gelmeden “Gelmedi” işaretlenemez', 'uyari');
        if (ev.target.closest('[data-yapildi]')) { geriAlNoktasi(); islem('Ders yapıldı işaretledi', tamAd(k) + ' · ' + d.saat); d.durum = 'Yapıldı'; k.direksiyon = Math.min(SINIFLAR[k.sinif].direksiyon, k.direksiyon + 1); kaydet(); kapatPencere(); bildir('Ders yapıldı olarak işaretlendi', 'tamam', true); yenile(); }
        if (ev.target.closest('[data-gelmedi]')) { d.durum = 'Gelmedi'; islem('Gelmedi işaretledi', tamAd(k) + ' · ' + tarih(d.tarih) + ' ' + d.saat); kaydet(); kapatPencere(); bildirimler([{ kim: k, metin: `${selam(k)} ${d.saat} direksiyon dersine gelmediniz. Yeni bir saat ayarlayalım mı?`, tur: 'Gelmedi bildirimi' }, { kim: 'mudur', metin: `${tamAd(k)} ${d.saat} dersine gelmedi (${eg.ad}).`, tur: 'Gelmedi bildirimi' }], 'Derse gelmedi'); yenile(); }
        if (ev.target.closest('[data-iptal]')) { geriAlNoktasi(); S.dersler = S.dersler.filter(x => x.id !== d.id); islem('Ders iptal etti', tamAd(k) + ' · ' + tarih(d.tarih) + ' ' + d.saat); kaydet(); kapatPencere(); bildirimler([{ kim: k, metin: `${selam(k)} ${tarihUzun(d.tarih)} ${d.saat} direksiyon dersiniz iptal edildi. Yeni saat için ${kursAdi('e')} yazabilirsiniz.`, tur: 'Ders iptali' }, { kim: eg, metin: `${eg.ad.split(' ')[0]} Hoca, ${tarihUzun(d.tarih)} ${d.saat} ${tamAd(k)} dersi iptal edildi; o saat boş.`, tur: 'Ders iptali' }], 'Ders iptal edildi'); bosSaatiDoldur(d); }
        if (ev.target.closest('[data-tasi]')) {
          const bos = SAATLER.filter(sa => sa !== '13:00' && sa !== d.saat && !S.dersler.some(x => x.tarih === d.tarih && x.saat === sa && (x.egitmen === d.egitmen || x.kursiyer === d.kursiyer)) && dersAraci(d.egitmen, k.sinif, d.tarih, sa, d) && (d.tarih > gun(0) || sa > new Date().toTimeString().slice(0, 5)));
          const gov = p.querySelector('.pencere-govde');
          gov.insertAdjacentHTML('beforeend', `<div style="margin-top:16px"><p class="et" style="margin-bottom:6px">Aynı gün boş saatler</p><div class="secim">${bos.map(sa => `<label><input type="radio" name="yeni-saat" value="${sa}"><span>${sa}</span></label>`).join('') || '<span style="color:var(--soluk)">Boş saat yok</span>'}</div></div>`);
          p.querySelector('[data-tasi]').outerHTML = '<button class="dg dg-ana" data-tasi-onay>Yeni saate taşı</button>';
        }
        if (ev.target.closest('[data-tasi-onay]')) { const v = p.querySelector('[name=yeni-saat]:checked'); if (!v) return bildir('Bir saat seçin', 'uyari'); geriAlNoktasi(); const eski = d.saat, yeniAr = dersAraci(d.egitmen, k.sinif, d.tarih, v.value, d); if (!yeniAr) return bildir('Bu saatte boş araç kalmadı', 'uyari'); d.saat = v.value; d.arac = yeniAr.id; islem('Dersi taşıdı', tamAd(k) + ' · ' + eski + ' → ' + d.saat); kaydet(); kapatPencere(); yenile(); bildirimler([{ kim: k, metin: `${selam(k)} ${tarihUzun(d.tarih)} direksiyon dersiniz ${eski} yerine ${saatE(d.saat)} saatine alındı.`, tur: 'Saat değişikliği' }, { kim: eg, metin: `${eg.ad.split(' ')[0]} Hoca, ${tarihUzun(d.tarih)} ${tamAd(k)} dersi ${eski} yerine ${saatE(d.saat)} alındı.`, tur: 'Saat değişikliği' }], 'Ders saati değişti'); }
        if (ev.target.closest('[data-geri]')) { if (d.durum === 'Yapıldı') k.direksiyon = Math.max(0, k.direksiyon - 1); d.durum = 'Planlandı'; kaydet(); kapatPencere(); yenile(); }
      });
    },
  });
}

/* ================= TEORİK DERSLER ================= */
const GRUP_AD = { aksam: 'Akşam grubu · Derslik 1', sabah: 'Sabah grubu · Derslik 2' };
// Kursiyerin devamsızlığı: grubunun geçmiş oturumlarında yoklamada işaretlenmediği sayısı (yoklama kaydı yoksa sayılmaz)
const devamsiz = k => S.teorik.filter(t => t.grup === k.teorikGrup && t.yoklama && t.tarih >= k.kayit && !t.yoklama.includes(k.id)).length;
export function teorik() {
  const liste = [...S.teorik].sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const gelecek = liste.filter(t => fark(t.tarih) >= 0), gecmis = liste.filter(t => fark(t.tarih) < 0).reverse();
  const teorikte = sb(S.kursiyerler).filter(k => k.asama === 'Teorik').sort((a, b) => b.teorik - a.teorik);
  const hazir = teorikte.filter(k => k.teorik >= SINIFLAR[k.sinif].teorik - 4);
  const grupKisi = g => teorikte.filter(k => k.teorikGrup === g);
  const ort = gecmis.length ? Math.round(gecmis.reduce((a, t) => a + (t.yoklama ? t.yoklama.length : t.katilim) / Math.max(1, t.yoklama ? grupKisi(t.grup).length : t.mevcut), 0) / gecmis.length * 100) : 0;
  const sinirda = teorikte.filter(k => devamsiz(k) >= S.kurs.devamsizlikSiniri - 1);
  const satir = (t, gec) => { const n = t.yoklama ? t.yoklama.length : t.katilim, top = t.yoklama ? grupKisi(t.grup).length : t.mevcut; const o = ogretmen(t.ogretmen); return `<li><span class="zaman">${t.saat}</span><div style="min-width:0"><b style="color:var(--murekkep)">${e(t.konu)}</b><small style="display:block;color:var(--soluk)">${goreli(t.tarih)} · ${t.sure} saat · ${e(GRUP_AD[t.grup] || t.salon)} · Öğretmen ${e(o ? o.ad : '')}</small></div>
    <span class="sag">${gec ? `<span class="sayi" style="font-size:13px">${n}/${top}</span>${ilerleme(n, top, n / Math.max(1, top) > .8 ? 'yesil' : 'sari')}` : ''}<button class="dg ${gec ? 'dg-cizgi' : 'dg-koyu'} dg-kucuk" data-yoklama="${t.id}">${gec ? 'Yoklamayı gör' : 'Yoklama al'}</button></span></li>`; };
  return {
    baslik: 'Teorik dersler', alt: 'Sınıf programı, yoklama ve e-sınava hazırlık',
    html: `${ekranNotu('Teorik dersleri öğretmenler verir. Yoklama, dersin grubundaki kursiyerlerle alınır; devamsızlık sınırına yaklaşan kursiyere uyarı gider.')}<div class="izgara iz-4">
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
        if (fark(t.tarih) > 0) return bildir('Bu ders henüz yapılmadı; yoklama ders günü alınır', 'uyari');
        const sinif = grupKisi(t.grup).filter(x => x.kayit <= t.tarih);
        pencere({
          baslik: 'Yoklama · ' + t.konu,
          icerik: `<p style="color:var(--soluk);margin-bottom:12px">${tarihUzun(t.tarih)} · ${t.saat} · ${e(GRUP_AD[t.grup] || t.salon)} · ${sinif.length} kayıtlı kursiyer</p>${sinif.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px">${sinif.map(x => `<label class="evrak" style="cursor:pointer"><input type="checkbox" name="v" value="${x.id}" ${!t.yoklama || t.yoklama.includes(x.id) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--yesil)"><span style="color:var(--murekkep)">${e(tamAd(x))}</span>${devamsiz(x) ? `<small style="color:var(--kirmizi);margin-left:auto">${devamsiz(x)} devamsız</small>` : ''}</label>`).join('')}</div>` : bos('Bu grupta teorik aşamada kursiyer yok', '')}`,
          altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-kaydet ${sinif.length ? '' : 'disabled'}>Yoklamayı kaydet</button>`,
          onAc(d) {
            d.querySelector('[data-kaydet]').addEventListener('click', () => {
              const gelen = [...d.querySelectorAll('[name=v]:checked')].map(x => x.value), gelmeyen = sinif.filter(x => !gelen.includes(x.id));
              geriAlNoktasi(); const once = t.yoklama || []; t.yoklama = gelen; t.katilim = gelen.length;
              // aynı yoklama ikinci kez kaydedilirse saatler iki kez sayılmaz: yalnız değişen kişiler güncellenir
              sinif.forEach(x => { const vardi = once.includes(x.id), var_ = gelen.includes(x.id); if (var_ && !vardi) x.teorik = Math.min(SINIFLAR[x.sinif].teorik, x.teorik + t.sure); if (!var_ && vardi) x.teorik = Math.max(0, x.teorik - t.sure); });
              const yokMetin = x => `${selam(x)} bugünkü teorik derse (${t.konu}) katılmadınız.${devamsiz(x) >= S.kurs.devamsizlikSiniri - 1 ? ' Devamsızlık sınırına yaklaştınız; bir derse daha gelmezseniz sınava giremeyebilirsiniz.' : ` Kaçırdığınız konuyu telafi etmek için ${kursAdi('e')} yazabilirsiniz.`}`;
                            islem('Yoklama aldı', t.konu + ' · ' + gelen.length + '/' + sinif.length);
              kaydet(); kapatPencere(); bildir(`Yoklama kaydedildi: ${gelen.length}/${sinif.length}`, 'tamam', true); yenile(); if (gelmeyen.length) waSirali(kisiListe(gelmeyen, yokMetin), 'Gelmeyenlere bilgi ver');
            });
          },
        });
      });
    },
  };
}

export function ekDersOner(k, sonra) {
  if (k.ekDersTeklif) return bildir(`${k.ad} kişisine ${tarih(k.ekDersTeklif.tarih)} tarihinde ${k.ekDersTeklif.n} ders teklif edildi; cevabı bekleniyor`, 'uyari');
  pencere({
    baslik: 'Ek ders öner · ' + tamAd(k),
    icerik: `<p style="margin-bottom:12px">Sınavdan önce kaç ek ders önerelim? Teklif kursiyerin WhatsApp’ına ve kursiyer ekranına gider. Kabul ederse ücret ödeme planına eklenir; telefonda kabul ederse kursiyer dosyasından siz işaretlersiniz.</p><div class="secim">${[2, 4, 6].map(n => [n, n * S.kurs.ekDersUcreti]).map(([n, f], i) => `<label><input type="radio" name="n" value="${n}|${f}" ${i === 0 ? 'checked' : ''}><span>${n} ders · ${tl(f)}</span></label>`).join('')}</div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-wp" data-k>${ik('wp')}Teklifi gönder</button>`,
    onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { const [n, f] = p.querySelector('[name=n]:checked').value.split('|').map(Number); k.ekDersTeklif = { n, tutar: f, tarih: gun(0) }; islem('Ek ders teklif etti', tamAd(k) + ' · ' + n + ' ders'); kaydet(); kapatPencere(); wpGonder(k, `${selam(k)} sınavdan önce ${n} ek direksiyon dersi (${tl(f)}) öneriyoruz. Kursiyer ekranından ya da bu mesaja “evet” yazarak onaylayabilirsiniz.`, 'Ek ders teklifi'); sonra ? sonra() : yenile(); }); },
  });
}
