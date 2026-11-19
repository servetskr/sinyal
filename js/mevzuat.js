// Mevzuat uyum kuralları: ücret, tahsilat, iade, ücretsiz kontenjan, sınava hazır yazısı, planlama ve personel denetimleri.
// Dayanak: Özel Öğretim Kurumları Yönetmeliği (RG 5/9/2025-33008 değişikliği: m.54, m.55/3, m.56/3-b, m.56/4), MTSK Yönetmeliği
// (m.7/7 ve Danıştay 8. D. 8/10/2025 YD kararı, m.15, m.16/8, m.20, m.43), 5580 sayılı Kanun m.13 (%3 ücretsiz).
import { tutarOku, S, gun, fark, kuralAyar, SINIFLAR, SINIF_VARSAYILAN, tamAd, islem, kaydet, oturum, egitmen, sb, sbDers, gerekliDireksiyon, direksiyonAyrinti, ustaAraci, iso, kursiyerDonemi, ekTur, teorikVar, tabanListesi, tabanDurumu, kursiyerTaban, sinifTabani, satirUcreti, ekDersTabani, ozelDersTabani, ekDersFiyat, ozelDersFiyat, digerUcretler } from './veri.js?v=235';
import { e, tl, tarih, pencere, kapatPencere, bildir, belgeYazdir, isaret } from './ui.js?v=235';
import { denetimUyarilari } from './denetim.js?v=235';
import { kuralEkle } from './kurallar.js?v=235';
import { listeAdi, satirAdi, gecisSatirlari, gecerlilikMetni, donemAdi, donemi, satirBul, tabanTutar } from './taban.js?v=235';

const OOKY = 'Özel Öğretim Kurumları Yönetmeliği';
const yil = () => gun(0).slice(0, 4);
const kim = () => (oturum.kullanici ? oturum.kullanici.ad : '');

/* ---------- ücret ve iade ---------- */
// Sözleşmedeki eğitim ücreti: indirimler sonrası anlaşılan tutar (ek kalemler, sınav ücretleri hariç)
export const sozlesmeUcreti = k => k.odeme.sozlesme || (k.odeme.toplam + (k.odeme.iade || 0) + ((k.kapali || {}).iptalTutar || 0));
// Eğitim ücretinden ödenen (ek kalemler hariç; yapılmış iadeler düşülmüş)
export const odenenEgitim = k => k.odeme.pesin + k.odeme.taksitler.reduce((a, t) => a + (t.odendi ? t.tutar : (t.kismi || 0)), 0) - (k.odeme.iade || 0);
// Teorik ve direksiyon ders saati ücretleri ayrı hesaplanır (ÖÖKY m.55/1-ç). Kurs saat ücreti girmediyse sözleşme ücreti,
// kursun belirlediği teorik payına göre saatlere bölünür.
// Teorik payı: kursun saat tarifesi yoksa il taban listesindeki satırın oranı (B ilk belge 6.630/23.510 = %28; e-sınav muaf, fark ve
// otomatikten manuele satırlarında teorik yok: %0); liste yoksa kursun Ayarlar'daki payı (varsayılan %35).
// Bölünen direksiyon saati ikinci dört hak derslerini içermez (o dersler ayrıca ücretlendirilir, md.15/4).
// PAR-007: sözleşmenin saatleri kayıtta (ve imzada) dondurulur (k.sozlesmeSaat { teorik, direksiyon, tarih }); kurs sonradan sınıf saatini değiştirse de
// bu öğrencinin saat başı ücreti ve iade hesabı imzaladığı sözleşmeye göre kalır. Dondurulmamış eski kayıtta güncel değer kullanılır.
export function sozlesmeSaatDondur(k) { if (!k || k.sozlesmeSaat) return; const S0 = SINIFLAR[k.sinif] || {}, g = direksiyonAyrinti(k); k.sozlesmeSaat = { teorik: +S0.teorik || 0, direksiyon: g.ilk ?? g.saat, tarih: gun(0) }; }
export function saatUcretleri(k) {
  const fz = k.sozlesmeSaat, S0 = SINIFLAR[k.sinif] || { teorik: 34, direksiyon: 14 }, u = sozlesmeUcreti(k), su = (S0.saatUcret || {}), g = direksiyonAyrinti(k), dir = fz ? fz.direksiyon : g.ilk ?? g.saat, tv = teorikVar(k);
  const x = kursiyerTaban(k), r = x && x.satir;
  let pay, kaynak;
  if (su.teorik) { pay = null; kaynak = 'tarife'; }
  else if (!tv) { pay = 0; kaynak = 'teoriksiz'; }
  else if (r && r.teorik) { const tT = r.teorik.toplam, dT = r.direksiyon ? r.direksiyon.toplam * (k.kendiArac ? 0.5 : 1) : 0; pay = tT / (tT + dT); kaynak = 'taban'; }
  else { pay = dir ? (S.kurs.teorikPay ?? 35) / 100 : 1; kaynak = 'pay'; }
  const teorikSaat = tv ? Math.max(1, fz ? fz.teorik : S0.teorik) : 0;
  return { teorik: su.teorik || (teorikSaat ? Math.round(u * pay / teorikSaat) : 0), direksiyon: dir ? (su.direksiyon || Math.round(u * (1 - (pay ?? 0)) / dir)) : 0, kaynak, pay, satir: r || null, teorikSaat, dirSaat: dir || 0 };
}
// ÖÖKY m.56/3-b: dönem başlamadan ayrılana ücretin %10'u dışındaki kısım; başladıktan sonra %10 + aldığı ders saatleri düşülür.
export function yasalIade(k) {
  const u = sozlesmeUcreti(k), su = saatUcretleri(k), S0 = SINIFLAR[k.sinif] || {};
  const g = direksiyonAyrinti(k), fz = k.sozlesmeSaat, ts = teorikVar(k) ? Math.min(k.teorik || 0, fz ? fz.teorik : S0.teorik || 0) : 0, ds = Math.min(k.direksiyon || 0, fz ? fz.direksiyon : g.ilk ?? g.saat), basladi = ts > 0 || ds > 0;  // teoriksiz satırda (muaf, fark) alınmamış teorik düşülmez
  const kesinti = Math.round(u * 0.1), teorikT = basladi ? ts * su.teorik : 0, direksiyonT = basladi ? ds * su.direksiyon : 0;
  const hak = Math.min(u, kesinti + teorikT + direksiyonT), od = odenenEgitim(k);
  return { ucret: u, kesinti, ts, ds, su, teorikT, direksiyonT, hak, odenen: od, iade: Math.max(0, od - hak), alacak: Math.max(0, hak - od), basladi };
}
export function iadeTablosu(r) {
  const s = (a, b, c) => `<tr><td>${a}</td><td style="text-align:right;white-space:nowrap">${b}</td>${c !== undefined ? `<td style="color:var(--soluk);font-size:12.5px">${c}</td>` : ''}</tr>`;
  return `<table class="tablo" style="font-size:14px"><tbody>
    ${s('Sözleşmedeki eğitim ücreti', tl(r.ucret), '')}
    ${s('Ücretin %10’u (kesinti)', '− ' + tl(r.kesinti), 'm.56/3-b')}
    ${r.basladi ? s(`Alınan teorik ders · ${r.ts} saat × ${tl(r.su.teorik)}`, '− ' + tl(r.teorikT), r.su.kaynak === 'tarife' ? 'tarifeden' : r.su.kaynak === 'taban' ? `il taban listesi oranı: teorik %${Math.round(r.su.pay * 100)}` : `ücretin %${S.kurs.teorikPay ?? 35}’i saatlere bölündü`) : s('Dönem başlamadan ayrıldı', '—', 'yalnız %10 düşülür')}
    ${r.basladi && r.su.direksiyon ? s(`Alınan direksiyon dersi · ${r.ds} saat × ${tl(r.su.direksiyon)}`, '− ' + tl(r.direksiyonT), '') : ''}
    ${s('<b>Kursun hak ettiği</b>', '<b>' + tl(r.hak) + '</b>', '')}
    ${s('Kursiyerin ödediği eğitim ücreti', tl(r.odenen), 'sınav ücretleri hariç')}
    ${s(`<b>${r.iade ? 'Yasal iade' : r.alacak ? 'Kursun kalan alacağı' : 'İade'}</b>`, '<b>' + tl(r.iade || r.alacak) + '</b>', r.iade ? 'en geç 1 ay içinde (m.56/4)' : '')}
  </tbody></table>${r.alacak ? `<p style="font-size:12.5px;color:var(--soluk);margin-top:6px">Kaydı kapatınca açık taksitler iptal edilir. Kalan alacağı sözleşmenize göre tahsil edecekseniz kapatmadan önce ek kalem olarak ekleyin.</p>` : ''}`;
}
export function iadeBelgesi(k, r, odenen) {
  const satir = (a, b) => `<tr><td style="border:1px solid #000;padding:5px 8px">${a}</td><td style="border:1px solid #000;padding:5px 8px;text-align:right">${b}</td></tr>`;
  belgeYazdir(`<div style="font-family:Arial,sans-serif;font-size:12px;color:#000">
    <p style="text-align:center;font-weight:700;font-size:14px;margin-bottom:14px">${e(S.kurs.resmiAd || S.kurs.ad)}<br>KURSİYER ÜCRET İADE HESABI</p>
    <p>Kursiyer: <b>${e(tamAd(k))}</b> · T.C. ${e(k.tc || '')} · ${e((SINIFLAR[k.sinif] || {}).ad || k.sinif)} · kayıt ${tarih(k.kayit)}<br>Ayrılış: ${tarih((k.kapali || {}).tarih || gun(0))} · Neden: ${e((k.kapali || {}).neden || '')}</p>
    <table style="border-collapse:collapse;width:100%;margin:10px 0">
      ${satir('Sözleşmedeki eğitim ücreti', tl(r.ucret))}${satir('Ücretin %10’u', '− ' + tl(r.kesinti))}
      ${r.basladi ? satir(`Alınan teorik ders (${r.ts} saat × ${tl(r.su.teorik)})`, '− ' + tl(r.teorikT)) + (r.su.direksiyon ? satir(`Alınan direksiyon dersi (${r.ds} saat × ${tl(r.su.direksiyon)})`, '− ' + tl(r.direksiyonT)) : '') : satir('Dönem başlamadan ayrıldı', '—')}
      ${satir('<b>Kursun hak ettiği tutar</b>', '<b>' + tl(r.hak) + '</b>')}${satir('Kursiyerin ödediği eğitim ücreti', tl(r.odenen))}${satir('<b>İade edilecek tutar</b>', '<b>' + tl(odenen ?? r.iade) + '</b>')}
    </table>
    <p>Hesap, Özel Öğretim Kurumları Yönetmeliği m.56/3-b’ye göre yapılmıştır. İade, ayrılış tarihinden itibaren en geç bir ay içinde kursiyerin banka hesabına yapılır (m.56/4).</p>
    <div style="display:flex;justify-content:space-between;margin-top:40px;text-align:center"><div>Kursiyer<br>${e(tamAd(k))}<br><br>İmza</div><div>Kurs Müdürü<br>${e(S.kurs.yetkili || '')}<br><br>İmza</div></div></div>`, 'İade hesabı · ' + tamAd(k));
}

/* ---------- ücretsiz kursiyer kontenjanı (5580 m.13: en az %3) ---------- */
// Kontenjan her kurs dönemi için ayrı sayılır (denetim rehberi 5.2; ücretsiz kursiyer kılavuzu: yerleştirme dönem başlamadan yapılır).
// Dönem: kursiyerin MEBBİS dönem grubunun ayı, grubu yoksa kayıt ayı (veri.js kursiyerDonemi). donem verilmezse bugünün dönemi.
export function ucretsizDurum(donem = donemi(gun(0))) {
  const l = S.kursiyerler.filter(k => kursiyerDonemi(k) === donem);  // dönemde kaydolan herkes (sonradan ayrılan dahil)
  const n = l.length, gerek = Math.floor(n * 0.03 + 0.5), var_ = l.filter(k => k.ucretsiz).length;
  return { donem, donemAd: donemAdi(donem), yil: donem.slice(0, 4), n, gerek, var: var_, eksik: Math.max(0, gerek - var_) };
}
export function ucretsizYap(k, yenile) {
  const d0 = ucretsizDurum(kursiyerDonemi(k));
  pencere({
    baslik: 'Ücretsiz kursiyer · ' + tamAd(k),
    icerik: `<p style="font-size:14px;margin-bottom:12px">Kurs, her dönemde kursiyer sayısının en az %3’ünü ücretsiz okutur (5580 sayılı Kanun m.13). ${d0.donemAd} dönemi: ${d0.n} kursiyer · gereken en az ${d0.gerek} · ücretsiz ${d0.var}.</p>
      <div class="alan"><label>Dayanak</label><select class="girdi" data-n><option>Şehit / gazi yakını</option><option>Koruma kararı bulunan</option><option>Kurul kararı (müdür + iki eğitim personeli)</option><option>MEBBİS yerleştirmesi</option></select></div>
      <div class="alan" style="margin-top:12px"><label>Karar ya da yazı no (isteğe bağlı)</label><input class="girdi" data-no></div>
      <p class="ipucu" style="margin-top:12px">${isaret('bilgi', 18)}<span>Açık taksitler iptal edilir. Ücretsiz kursiyerler program başlamadan MEBBİS’e işlenir; EK-7 başvuru ve EK-8 değerlendirme formu ücretsiz kursiyer dosyasında saklanır.</span></p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Ücretsiz kursiyer yap</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        const acik = k.odeme.taksitler.filter(t => !t.odendi && !t.iptal), tutar = acik.reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
        k.odeme.sozlesme = k.odeme.sozlesme || k.odeme.toplam; acik.forEach(t => { t.iptal = gun(0); }); k.odeme.toplam -= tutar;
        k.ucretsiz = { tarih: gun(0), neden: d.querySelector('[data-n]').value, no: d.querySelector('[data-no]').value.trim(), kim: kim() };
        islem('Ücretsiz kursiyer yaptı', tamAd(k) + ' · ' + k.ucretsiz.neden); kaydet(); kapatPencere(); bildir(tamAd(k) + ' ücretsiz kursiyer olarak işaretlendi'); if (yenile) yenile();
      });
    },
  });
}

/* ---------- sınava hazır yazısı (m.7/7; Danıştay 8. D. 8/10/2025 YD: modül onayı yetmez, yazı taranıp yüklenir) ---------- */
export const hazirGerekli = k => k.asama === 'Sınav' && !(k.dsinav && k.dsinav.sonuc === 'Geçti') && gerekliDireksiyon(k) > 0;
export function hazirKarti(k) {
  if (!gerekliDireksiyon(k)) return '';
  const h = k.hazirYazi, gd = gerekliDireksiyon(k), tamam = k.direksiyon >= gd;
  return `<div class="kart" style="margin-bottom:14px${hazirGerekli(k) && !h ? ';border-color:var(--kirmizi)' : ''}"><div class="kart-bas"><h3>Sınava hazır yazısı</h3><small>Usta öğretici yazıyla bildirir, kurs tarayıp MEBBİS’e yükler (md.7/7)</small></div><div class="kart-govde">
    <p style="font-size:14px;margin-bottom:10px">${h ? `${e((egitmen(h.egitmen) || {}).ad || '')} · ${tarih(h.tarih)} · ${h.yuklendi ? 'MEBBİS’e yüklendi ' + tarih(h.yuklendi) : '<b style="color:var(--kirmizi)">MEBBİS’e yüklenmedi</b>'}` : tamam ? 'Direksiyon dersleri tamam; yazı henüz verilmedi.' : `${k.direksiyon}/${gd} ders · dersler bitince verilir.`}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg ${h ? 'dg-cizgi' : 'dg-ana'} dg-kucuk" data-hazir-yazi>${h ? 'Yazıyı yeniden yazdır' : 'Yazıyı hazırla ve yazdır'}</button>${h && !h.yuklendi ? '<button class="dg dg-cizgi dg-kucuk" data-hazir-yuklendi>MEBBİS’e yükledim</button>' : ''}</div>
    <p style="font-size:12.5px;color:var(--soluk);margin-top:8px">Danıştay 8. Dairesi 8 Ekim 2025’te “onay modülden de verilebilir” hükmünü durdurdu; karar imzalı yazıyla bildirilir, yazı kursta saklanır.</p></div></div>`;
}
// öğrenci dosyasındaki tıklamalar (dosya yeniden çizildiği için olay yetkisiyle)
export function hazirTikla(ev, k, yenile) {
  if (ev.target.closest('[data-hazir-yazi]')) { import('./resmi.js?v=235').then(m => m.resmiAc('hazir', k.id)); return true; }
  if (ev.target.closest('[data-hazir-yuklendi]')) { k.hazirYazi.yuklendi = gun(0); islem('Sınava hazır yazısını MEBBİS’e yükledi', tamAd(k)); kaydet(); bildir('Kaydedildi'); if (yenile) yenile(); return true; }
  return false;
}

/* ---------- denetimler: MEB işlemleri › Kurallar ve takvim listesine eklenir ---------- */
export function mevzuatKurallari() {
  const K = S.kurs, l = [], ks = sb(S.kursiyerler);
  // Tahsilat kurum banka hesabına (ÖÖKY m.55/3, 5/9/2025)
  const nakit = (S.hareket || []).filter(h => h.tur === 'Gelir' && h.kursiyer && (['Kurs ücreti', 'Taksit'].includes(h.kategori) || ekTur({ ad: h.kategori }) === 'ders') && h.yontem === 'Nakit' && fark(h.tarih) >= -30 && !h.bankaya);
  if (nakit.length) l.push(['uyari', `Son 30 günde ${nakit.length} eğitim ücreti nakit alındı (${tl(nakit.reduce((a, h) => a + h.tutar, 0))})`, `${OOKY} m.55/3 (5 Eylül 2025): eğitim ücreti kurum adına açılmış, MEB’e bildirilmiş banka hesabına yatırılarak tahsil edilir. Nakdi bankaya yatırın; tahsilatlar MEBBİS’e işlenir.`, '#/kasa']);
  // Tarife: il taban ücreti (MTSK m.43) — il taban listesi varsa T01–T06 kuralları (aşağıda), yoksa kursun elle girdiği taban ücret; ocak sonu ilanı (ÖÖKY m.54/1-a)
  if (!tabanListesi()) Object.entries(SINIFLAR).filter(([, v]) => v.aktif && v.ucret && v.taban && v.ucret < v.taban).forEach(([, v]) => l.push(['yasak', `${v.ad} ücreti il taban ücretinin altında`, `${tl(v.ucret)} < taban ${tl(v.taban)}. Kurs, valilik komisyonunun belirlediği taban ücretten az ücret belirleyemez (MTSK Yönetmeliği m.43).`, '#/ayarlar/sinif']));
  if (K.tarifeIlan !== yil() && +gun(0).slice(5, 7) <= 2) l.push([+gun(0).slice(5, 7) === 1 ? 'uyari' : 'yasak', `${yil()} ücretleri MEBBİS’e ilan edilmedi`, `Ücret Ocak sonuna kadar ilan edilir; ilandan önce tahsilat yapılamaz (${OOKY} m.54). İlan ettiyseniz Ayarlar › Sınıf ve ücretler’den işaretleyin.`, '#/ayarlar/sinif']);
  // İndirim ilan edilen ücretin %50'sini aşamaz; ilanın üstünde ücret alınamaz (ÖÖKY m.54/1)
  ks.filter(k => !k.kapali && !k.ucretsiz && k.asama !== 'Ehliyet').forEach(k => { const x = kursiyerTaban(k), ilan = (x && x.satir && x.ucret) || (SINIFLAR[k.sinif] || {}).ucret, u = sozlesmeUcreti(k); if (!ilan) return;  // fark ve muaf öğrencide ilan edilen ücret kendi satırının ücreti
    if (u < ilan * 0.5) l.push(['yasak', `${tamAd(k)} · indirim ilan edilen ücretin yarısını aşıyor`, `Sözleşme ${tl(u)}, ilan ${tl(ilan)}. İndirim oranı %50’yi aşamaz (${OOKY} m.54/1-a); %3 kontenjandaysa “Ücretsiz kursiyer” olarak işaretleyin.`, '#/kursiyer/' + k.id]);
    else if (u > ilan && String(k.kayit).slice(0, 4) === yil()) l.push(['uyari', `${tamAd(k)} · ilan edilen ücretin üstünde kayıt`, `Sözleşme ${tl(u)}, ilan ${tl(ilan)}. İlan edilenin üstünde ücret istenemez (${OOKY} m.54/1-d).`, '#/kursiyer/' + k.id]); });
  // %3 ücretsiz kontenjan
  // içinde bulunulan ve bir sonraki dönem (yerleştirme dönem başlamadan yapılır); kaydı olmayan dönem atlanır
  { const bu = donemi(gun(0)), d = new Date(gun(0) + 'T12:00'); d.setDate(1); d.setMonth(d.getMonth() + 1); const sonra = donemi(iso(d));
    [bu, sonra].map(ucretsizDurum).filter(uc => uc.n && uc.eksik).forEach(uc => l.push(['bilgi', `${uc.donemAd} dönemi ücretsiz kursiyer kontenjanı: ${uc.var}/${uc.gerek}`, `Bu dönemde ${uc.n} kursiyer; en az %3’ü ücretsiz okutulur (5580 m.13). Yerleştirmeyi il/ilçe MEM MEBBİS’ten yapar; kurs program başlamadan kontenjanı kadar adayı sistemden çeker. MEBBİS’teki dönem kontenjanıyla karşılaştırın.`, '#/kursiyerler'])); }
  // Yasal iade süresi (ÖÖKY m.56/4: en geç 1 ay)
  S.kursiyerler.filter(k => k.kapali && k.kapali.iadeSon && !k.kapali.iadeYapildi).forEach(k => { const kalan = fark(k.kapali.iadeSon); l.push([kalan < 0 ? 'dur' : kalan <= 7 ? 'yasak' : 'uyari', `${tamAd(k)} · ${tl(k.kapali.iadeTutar || 0)} iade ${kalan < 0 ? -kalan + ' gün gecikti' : kalan + ' gün içinde yapılmalı'}`, `Ayrılan kursiyere iade, ayrılıştan itibaren en geç 1 ay içinde yapılır (${OOKY} m.56/4).`, '#/kursiyer/' + k.id]); });
  // PAR-009: MEBBİS'teki kayıt ücreti sözleşme ücretinden farklı (fatura sözleşmedeki gerçek ücretle kesilir; düzeltilecek olan MEBBİS kaydı)
  ks.filter(k => !k.kapali && !k.ucretsiz && !k.prova).forEach(k => { const d = faturaDenetimi(k); if (d.mebFark) l.push(['uyari', `${tamAd(k)} · MEBBİS’teki ücret sözleşmeden farklı`, `MEBBİS’te ${tl(d.mebU)}, sözleşmede ${tl(d.hesap)}. MEBBİS’e alınan gerçek ücret işlenir (MTSK Yön. m.43/2); fatura sözleşme ücretiyle kesilir. MEBBİS kaydını düzeltin.`, '#/kursiyer/' + k.id]); });
  // PAR-054: hizmet tamamlandı (son sınav), 7 gün geçti, fatura eksik (VUK m.231/5)
  faturasizBitenler().forEach(x => l.push(['uyari', `${tamAd(x.k)} · son sınavdan ${x.gun} gün geçti, ${tl(x.eksik)} faturasız`, `Hizmet son sınavla tamamlanır; fatura en geç 7 gün içinde kesilir (VUK m.231/5). Kalan tutarı faturalayın (Kasa › Faturalar).`, '#/kasa']));
  // Sınava hazır yazısı
  ks.filter(k => hazirGerekli(k) && (!k.hazirYazi || !k.hazirYazi.yuklendi)).forEach(k => l.push([k.hazirYazi ? 'uyari' : 'yasak', `${tamAd(k)} · sınava hazır yazısı ${k.hazirYazi ? 'MEBBİS’e yüklenmedi' : 'yok'}`, 'Usta öğretici kararını yazıyla bildirir; kurs yazıyı tarayıp modüle yükler (md.7/7, Danıştay 8. D. 8/10/2025 YD).', '#/kursiyer/' + k.id]));
  // Direksiyonda kalan: tekrar sınavdan önce en az 2 saat ders (m.15)
  ks.filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı' && !k.dsinav.girmedi && k.dsinavPlan && !(k.hakBitti && !k.hakBitti.cozuldu)).forEach(k => { const n = S.dersler.filter(d => d.kursiyer === k.id && d.tarih > k.dsinav.tarih && d.tarih < k.dsinavPlan && d.durum !== 'Gelmedi').length; if (n < 2) l.push(['yasak', `${tamAd(k)} · tekrar sınavdan önce ${n}/2 saat ek ders`, 'Direksiyon sınavında başarısız olan, ilan edilen ücretle en az 2 saat ek ders almadan sınava giremez (MTSK Yönetmeliği m.15).', '#/plan']); });
  // Ders saatleri 07:00–23:00 (m.20)
  sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && d.saat && (d.saat < '07:00' || d.saat >= '23:00')).slice(0, 3).forEach(d => l.push(['yasak', `${tarih(d.tarih)} ${d.saat} dersi izin verilen saatlerin dışında`, 'Dersler 07:00–23:00 arasında yapılır (MTSK Yönetmeliği m.20).', '#/plan']));
  // Kursun sınıf ayarındaki direksiyon saati yönetmelik asgarisinin altında (md.7/1)
  Object.entries(SINIFLAR).filter(([key, v]) => v.aktif && SINIF_VARSAYILAN[key] && v.direksiyon < SINIF_VARSAYILAN[key].direksiyon).forEach(([key, v]) => l.push(['yasak', `${v.ad} · direksiyon ${v.direksiyon} ders, yönetmelik asgarisi ${SINIF_VARSAYILAN[key].direksiyon}`, 'İlk kez belge alan için alanda ya da simülatörde en az 2 saat ve akan trafikte asgari saat verilir (MTSK md.7/1). Ayarlar › Sınıf ve ücretler’den düzeltin; kural tarihinden önce kaydolan öğrencilerin sayısı değişmez.', '#/ayarlar/sinif']));
  // Elle girilen (il tablosu) direksiyon saati md.39 alt sınırının altında: M→B1 12 saat (madde 1), B→A1 2 yıllık B'de yarı süre (md.39/5), otomatikten manuele
  // yarı süre (madde 2, yorum: teyit bekliyor). md.7/6 yaptırımı yalnız md.7/1 sürelerine bağlı (madde 5), bu uyarıda anılmaz.
  ks.filter(k => !k.kapali && k.asama !== 'Ehliyet' && !(k.dsinav && k.dsinav.sonuc === 'Geçti')).forEach(k => { const r = direksiyonAyrinti(k); if ((r.elle || r.kursTablo) && r.altinda) l.push(['uyari', `${tamAd(k)} · ${r.saat} ders, alt sınır ${String(r.alt).replace('.', ',')} saat`, `${r.kursTablo ? 'Kursun geçiş tablosundaki' : 'Elle girilen'} ders sayısı (il tablosu) alt sınırın altında kalıyor (MTSK ${r.altDayanak || 'md.39'}). İl MEM’in yazılı uygulamasını kontrol edin.`, '#/kursiyer/' + k.id]); });
  // Kural tarihinden önce kaydolup eski ders sayısında dondurulan, eğitimi süren öğrenciler: güncel asgari daha yüksekse müdür dosyadan karar verir (md.7/1, md.7/6)
  { const dn = ks.filter(k => !k.kapali && k.asama !== 'Ehliyet' && !(k.dsinav && k.dsinav.sonuc === 'Geçti')).map(k => ({ k, r: direksiyonAyrinti(k) })).filter(({ r }) => r.donuk && r.yeni && r.yeni.saat > r.saat);
    if (dn.length) l.push(['uyari', `${dn.length} öğrenci eski direksiyon ders sayısında (${dn.slice(0, 3).map(({ k, r }) => tamAd(k) + ' ' + r.saat + '→' + r.yeni.saat).join(', ')}${dn.length > 3 ? '…' : ''})`, 'Bu öğrenciler kural tarihinden önce kaydoldu; sayıları bozulmasın diye eski değerde tutuluyor. Güncel mevzuatın asgarisi daha yüksek (MTSK md.7/1, farklı sınıfta md.39). Asgari saatin altında eğitim usta öğretici ve kurs hakkında işlem sebebidir (md.7/6): öğrenci dosyasında “Güncel mevzuata geçir” ile güncelleyin ya da il MEM’in uygulamasını sorun.', '#/kursiyer/' + dn[0].k.id]); }
  // Çalışma izni olmayan usta öğreticiye ders (eksik personel çalıştırma: 5580 m.7/2-e, 10 brüt asgari ücret)
  const yakin = sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && fark(d.tarih) <= 7);
  S.egitmenler.filter(x => !x.calismaIzinNo && yakin.some(d => d.egitmen === x.id)).forEach(x => l.push(['uyari', `${x.ad} · MEB çalışma izni no girilmemiş`, 'Çalışma izni onaylanmamış personelle ders yapılamaz; eksik personel çalıştırmanın cezası brüt asgari ücretin 10 katı (5580 m.7/2-e). İzin varsa numarasını girin.', '#/filo/egitmen']));
  l.push(...denetimUyarilari());
  return l;
}
// Kural motoruna kayıt: MEB işlemleri › Kurallar listesinde MEB kurallarından sonra gelir (kurallar.js)

// ARC-001: araç başına kursiyer sayımı ayrı kural (sınır Ayarlar › MEB kuralları'nda; varsayılan 12, md.16/8; B belgeliye A1'de iki katı, md.39/5)
function aracKursiyerSayimi(l, ks) {
  // Araç başına bir eğitim döneminde en fazla 12 kursiyer kaydı (m.16/8). Dönem: kursiyerin MEB grubu (yoksa kayıt ayı); araç: usta öğreticisinin o sınıftaki aracı,
  // yoksa son dersindeki araç. Kontenjan dışı (m.6/4: belgeli, özel ders alan) sayılmaz; nakil gelen (m.13/2) ve B belgesiyle A1 alan (m.39/5) sayılır,
  // B belgeliye A1 eğitimi veren araçta sınır 24 (eyup-sorular-cevaplar.md madde 15). Direksiyon dersi olmayan (G, yalnız teorik) sayıma girmez.
  // KTK md.118 ile belgesi geri alınıp teorik derse gelen sürücü (k.ktk118, MEB istisnaları penceresinden işaretlenir) cevap gelene kadar sayıma alınmaz (madde 15, teyit bekliyor).
  // Sınav aracı başına 10 aday (m.30/2) sınav randevusunda ayrıca denetlenir.
  { const bu = gun(0).slice(0, 7), ilk = (() => { const d = new Date(gun(0) + 'T12:00'); d.setMonth(d.getMonth() - 2); return d.toISOString().slice(0, 7); })(), ak = {};
    ks.filter(k => !k.kontenjanDisi && !k.ktk118 && gerekliDireksiyon(k) > 0).forEach(k => {
      const g = (S.gruplar || []).find(x => x.id === k.teorikGrup), gd = g && g.donem ? String(g.donem).replace(/^(\d{4})-?(\d{2}).*$/, '$1-$2') : '', donem = (/^\d{4}-\d{2}$/.test(gd) ? gd : '') || String(k.kayit || '').slice(0, 7); if (!/^\d{4}-\d{2}$/.test(donem) || donem < ilk) return;  // grup dönemi MEBBİS biçiminde (202611)
      const a = ustaAraci(k.egitmen, k.sinif) || (S.araclar || []).find(x => x.id === ((S.dersler.filter(d => d.kursiyer === k.id && d.arac).sort((x, y) => (y.tarih + y.saat).localeCompare(x.tarih + x.saat))[0]) || {}).arac);
      if (!a) return; const key = a.id + '|' + donem; (ak[key] = ak[key] || []).push(k); });
    Object.entries(ak).forEach(([key, l2]) => { const [id, donem] = key.split('|'), a = S.araclar.find(x => x.id === id), a1b = l2.every(k => k.sinif === 'A1' && k.mevcutEhliyet === 'B'), sinir = (a1b ? 2 : 1) * kuralAyar('aracKursiyer');
      if (a && l2.length > sinir) l.push([donem >= bu ? 'uyari' : 'bilgi', `${a.plaka} · ${donem.split('-').reverse().join('.')} döneminde ${l2.length} kursiyer`, `Bir eğitim döneminde bir direksiyon eğitim ve sınav aracı için en çok ${sinir} kursiyer kaydı yapılır (MTSK Yönetmeliği m.16/8${a1b ? ', m.39/5' : ''}). Kursiyerleri başka usta öğretici ve araçlara dağıtın.`, '#/filo']); }); }
}
kuralEkle({ id: 'M16', sira: 165, ad: 'Araç başına eğitim döneminde kursiyer sınırı', dayanak: 'MTSK Yön. md.16/8 (araç başına en çok 12 kayıt), md.39/5 (B belgeliye A1’de 24), md.6/4 (kontenjan dışı sayılmaz)', kapsam: 'arac', ciddiyet: 'uyari', ayar: 'aracKursiyer',
  kontrol(l) { aracKursiyerSayimi(l, sb(S.kursiyerler)); } });
kuralEkle({ id: 'MZ', sira: 900, ad: 'Mevzuat uyumu: ücret, tahsilat, iade, ücretsiz kontenjan, hazır yazısı, ders saatleri, araç başına kursiyer, personel izni, denetim', dayanak: 'ÖÖKY m.54, 55/3, 56/3-b, 56/4; MTSK Yön. md.7/1, 7/7, 15, 16/8, 20, 43; 5580 m.7/2-e, m.13', kapsam: 'kurs', ciddiyet: 'uyari', kontrol(l) { l.push(...mevzuatKurallari()); } });

/* ---------- il taban fiyat listesi (valilik maliyet tablosu; veri js/taban.js) ---------- */
// Listesi olmayan ilde bu kurallar hiçbir şey üretmez (T05 hariç: ilin eski listesi varsa yenisinin gelmediğini hatırlatır).
// Not numaraları belgedeki sırayla: 4 kurs ücreti dışında ücret yok, 5 sınav/harç/kart kursiyere ait, 6 kampanya yok, 7 taban altı burs yok, 8 kayıt kurs merkezinde.
const bul = (tur, baslik, aciklama, link, ek) => Object.assign([tur, baslik, aciklama, link], ek || {});  // kurallar.js ile aynı biçim
const TABAN_DAYANAK = 'Valilik Sürücü Eğitimi Maliyetlerini Belirleme Komisyonu kararı (il taban fiyat listesi); MTSK Yön. md.43/4';
const tabanAd = r => r.tur === 'ilave' ? 'İlave direksiyon dersi' : r.tur === 'ozel' ? 'Belgeliye özel direksiyon dersi' : satirAdi(r);
// Kursiyerden kurs ücreti dışında alınabilecek ek kalemler: ek ve özel ders, ikinci dört hak dersi, sınav ücretleri (kursiyerin kendi masrafı, döner sermayeye yatırılır)
const yasalEk = x => !!x && ekTur(x) !== 'diger';  // ders (ilave/özel/ikinci hak) ve resmî masraf (sınav ücreti: emanet) dışındakiler not 4'e aykırı
const aktifKursiyerler = () => sb(S.kursiyerler).filter(k => !k.kapali && k.asama !== 'Ehliyet');
kuralEkle({ id: 'T01', sira: 860, ad: 'Kurs ücretleri il taban fiyatının altında olamaz', dayanak: TABAN_DAYANAK, kapsam: 'kurs', ciddiyet: 'engel',
  kontrol(l) { const L = tabanListesi(); if (!L) return; const A = listeAdi(L);
    Object.entries(SINIFLAR).filter(([, v]) => v.aktif && v.ucret).forEach(([k, v]) => { const t = sinifTabani(k, L); if (t != null && v.ucret < t) l.push(['yasak', `${v.ad} ücreti taban ücretin altında`, `Kurs ücreti ${tl(v.ucret)}, ${A} ${tl(t)}. Taban altında ücret işlem sebebidir (MTSK Yön. md.43/4).`, '#/ayarlar/sinif']); });
    const g = gecisSatirlari(L).filter(r => satirUcreti(r, r.s[0], L) < r.toplam); if (g.length) l.push(['yasak', `${g.length} geçiş ücreti taban ücretin altında`, `${g.slice(0, 3).map(r => `${tabanAd(r)} ${tl(satirUcreti(r, r.s[0], L))} < ${tl(r.toplam)}`).join(' · ')}${g.length > 3 ? ' …' : ''} (${A}).`, '#/ayarlar/sinif']);
    const ek = ekDersTabani(L), oz = ozelDersTabani(L), dusuk = [];
    Object.entries(SINIFLAR).filter(([, v]) => v.aktif && v.ucret).forEach(([k, v]) => { if (ek && ekDersFiyat(k) < ek) dusuk.push(`${v.ad.split(' ·')[0]} ek ders ${tl(ekDersFiyat(k))}`); if (oz && ozelDersFiyat(k) < oz) dusuk.push(`${v.ad.split(' ·')[0]} özel ders ${tl(ozelDersFiyat(k))}`); });
    if (dusuk.length) l.push(['yasak', 'Ek ya da özel ders ücreti taban ücretin altında', `${[...new Set(dusuk)].slice(0, 4).join(' · ')}${dusuk.length > 4 ? ' …' : ''}. ${A}: ilave direksiyon dersi ${tl(ek || 0)}, sürücü belgelilere özel direksiyon eğitimi ${tl(oz || 0)} (ders başına).`, '#/ayarlar/sinif']); } });
kuralEkle({ id: 'T02', sira: 861, ad: 'Kursiyerin ücreti taban fiyatın altında (indirim ve burs dahil)', dayanak: TABAN_DAYANAK + '; liste notu 7', kapsam: 'kursiyer', ciddiyet: 'uyari', bugun: true, bugunAd: n => `${n} öğrencinin ücreti il taban fiyatının altında`,
  kontrol(l) { aktifKursiyerler().filter(k => !k.ucretsiz).forEach(k => { const x = kursiyerTaban(k); if (!x || x.taban == null) return; const u = sozlesmeUcreti(k); if (u >= x.taban) return;
    l.push(bul('uyari', `${tamAd(k)} · ücret ${tl(u)}, taban ${tl(x.taban)}`, `${listeAdi(x.liste)}, “${satirAdi(x.satir)}” satırı ${tl(x.taban)}. İndirim, kampanya ya da burs dahil bu ücretin altında ücret alınamaz (liste notu 6–7; MTSK Yön. md.43/4). %3 ücretsiz kontenjandaysa “Ücretsiz kursiyer” olarak işaretleyin.`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `Ücret ${tl(u)}: ${listeAdi(x.liste)} tabanı ${tl(x.taban)} (${satirAdi(x.satir)})`, eylem: 'odeme' })); }); } });
kuralEkle({ id: 'T03', sira: 862, ad: 'Kurs ücreti dışında ücret alınmaz (kitap, evrak, materyal)', dayanak: 'İl taban fiyat listesi notu 4 ve 5; MTSK Yön. md.43/4', kapsam: 'kursiyer', ciddiyet: 'uyari', bugun: true, bugunAd: n => `${n} kurs ücreti dışı kalem (il taban listesi notu 4)`,
  kontrol(l) { const L = tabanListesi(); if (!L) return; const A = listeAdi(L);
    if (digerUcretler().length) l.push(['uyari', `Ayarlar’da ${digerUcretler().length} kurs ücreti dışı kalem tanımlı (${digerUcretler().slice(0, 3).map(x => x.ad).join(', ')})`, `${A}, not 4: eğitim materyalleri dahil kursiyerlerden kurs ücretleri dışında hiçbir isim altında ücret talep edilemez. Not 5: sınav ücretleri, kayıt belgelerinin masrafları, harç ve kart ücreti kursiyerin kendi masrafıdır, kurs ücretine eklenemez.`, '#/ayarlar/sinif']);
    aktifKursiyerler().forEach(k => { const d = ((k.odeme || {}).ekler || []).filter(x => !yasalEk(x)); if (!d.length) return; const t = d.reduce((a, x) => a + (+x.tutar || 0), 0);
      l.push(bul('uyari', `${tamAd(k)} · kurs ücreti dışında ${d.length} kalem (${tl(t)})`, `${d.map(x => x.ad).join(', ')}. ${A}, not 4: eğitim materyalleri dahil kurs ücreti dışında hiçbir ad altında ücret talep edilemez.`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `Kurs ücreti dışı kalem: ${d.map(x => x.ad).join(', ')} (${A}, not 4)`, eylem: 'odeme' })); }); } });
kuralEkle({ id: 'T04', sira: 863, ad: 'İndirim kampanyası düzenlenmez (kardeş, arkadaş, toplu kayıt, promosyon)', dayanak: 'İl taban fiyat listesi notu 6; MTSK Yön. md.43/4', kapsam: 'kursiyer', ciddiyet: 'uyari',
  kontrol(l) { const L = tabanListesi(); if (!L) return; const A = listeAdi(L);
    const ki = (S.kurs.indirimler || []).filter(x => x && +x.tutar > 0); if (ki.length) l.push(['uyari', `Kayıt indirimi tanımlı: ${ki.map(x => `${x.ad} ${tl(x.tutar)}`).join(', ')}`, `${A}, not 6: promosyon, ödül, hediye, kardeş, arkadaş, toplu kayıt indirimi vb. hiçbir isim altında kampanya düzenlenemez. İndirimi Ayarlar › Kurs’tan kaldırın ya da il MEM’e danışın.`, '#/ayarlar/kurs']);
    const ks = aktifKursiyerler().filter(k => !k.ucretsiz && ((k.odeme || {}).indirim || ((k.odeme || {}).indirimler || []).length) && String(k.kayit || '') >= L.donemBas);
    if (ks.length) l.push(['uyari', `${ks.length} kursiyere indirim uygulandı (${ks.slice(0, 3).map(tamAd).join(', ')}${ks.length > 3 ? '…' : ''})`, `${A}, not 6: hiçbir isim altında indirim kampanyası düzenlenemez; not 7: taban ücretin altında burs verilemez. Taban altına düşenler ayrıca “ücret taban fiyatın altında” uyarısında görünür.`, '#/kursiyerler']); } });
kuralEkle({ id: 'T05', sira: 864, ad: 'İl taban fiyat listesi güncel', dayanak: 'İl taban fiyat listesi notu 9 (geçerlilik dönemi)', kapsam: 'kurs', ciddiyet: 'uyari', bugun: true, bugunAd: () => 'Yeni il taban fiyat listesi bekleniyor',
  kontrol(l) { const d = tabanDurumu(); if (d.durum === 'bitti') l.push(bul('uyari', `${listeAdi(d.son)} süresi doldu`, `Liste ${gecerlilikMetni(d.son)} geçerliydi. Valiliğin yeni listesini mdSinyal’e iletin; gelene kadar taban ücret denetimi yapılmaz ve yeni kayıtlarda taban görünmez.`, '#/ayarlar/sinif'));
    else if (d.durum === 'bitiyor') l.push(bul('bilgi', `${listeAdi(d.son)} bu ay bitiyor`, `Liste ${donemAdi(d.son.donemBit)} kurs dönemine kadar geçerli. Valilik komisyonunun yeni yıl listesini gelir gelmez bize iletin; yeni liste girilince ücretleriniz yeni tabanla karşılaştırılır.`, '#/ayarlar/sinif')); } });
kuralEkle({ id: 'T06', sira: 865, ad: 'Kayıt kurs merkezinde ve müdür gözetiminde', dayanak: 'İl taban fiyat listesi notu 8; MTSK Yön. md.12/1, md.43/4', kapsam: 'kursiyer', ciddiyet: 'uyari', bugun: true, bugunAd: n => `${n} kaydın kurs merkezinde müdür onayı yok (il taban listesi notu 8)`,
  kontrol(l) { const L = tabanListesi(); if (!L) return; const A = listeAdi(L);
    // kayıt formundan gelen ya da sözleşmesi uzaktan imzalanan, müdür gözetimi kaydı olmayan kursiyerler (son 90 gün)
    aktifKursiyerler().filter(k => fark(k.kayit) >= -90 && !k.mudurGozetim && k.sozlesmeImza && (/online|kayıt formu/i.test(k.sozlesmeImza.kanal || '') || /uzaktan/i.test(k.sozlesmeImza.yontem || ''))).forEach(k =>
      l.push(bul('uyari', `${tamAd(k)} · kayıt kurs merkezinde müdür onayıyla tamamlanmadı`, `${A}, not 8: kursiyer kayıt iş ve işlemleri kurs merkezinde ve kurs müdürünün gözetiminde yapılır (MTSK md.12/1); gözetimsiz kayıt tespitinde md.43/4 uygulanır. Kimlikle kursa geldiğinde öğrenci dosyasından “Kursta tamamlandı” ile onaylayın.`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: 'Kayıt kurs merkezinde müdür onayıyla tamamlanmadı (il taban listesi notu 8)', eylem: 'gozetim' }))); } });
// MEBBİS'ten çekilen kayıt ücreti (k.meb.kayitUcreti) tabanın altında ya da sözleşme ücretinden farklı
kuralEkle({ id: 'T07', sira: 866, ad: 'MEBBİS’teki kayıt ücreti taban ve sözleşmeyle uyumlu', dayanak: TABAN_DAYANAK + '; ÖÖKY m.55/3 (ücret MEBBİS’e işlenir)', kapsam: 'kursiyer', ciddiyet: 'uyari',
  kontrol(l) { const mebTL = k => { const m = k && k.meb; if (!m) return null; if (m.kayitUcretiTL != null && isFinite(+m.kayitUcretiTL)) return +m.kayitUcretiTL; if (m.kayitUcreti == null || m.kayitUcreti === '') return null; const v = +String(m.kayitUcreti).replace(/[^\d,]/g, '').replace(',', '.'); return isFinite(v) ? v : null; };  // mebtoplu.js aday dosyasından kayitUcretiTL yazar
    aktifKursiyerler().filter(k => mebTL(k) != null).forEach(k => { const m = mebTL(k), x = kursiyerTaban(k), u = sozlesmeUcreti(k);
    if (k.ucretsiz) { if (m > 0) l.push(bul('uyari', `${tamAd(k)} · ücretsiz kursiyerin MEBBİS kayıt ücreti ${tl(m)}`, 'Ücretsiz kursiyerde MEBBİS’teki kayıt ücreti 0 olmalı (5580 m.13).', '#/kursiyer/' + k.id, { kursiyer: k.id })); return; }
    if (x && x.taban != null && m < x.taban) l.push(bul('uyari', `${tamAd(k)} · MEBBİS kayıt ücreti ${tl(m)}, taban ${tl(x.taban)}`, `${listeAdi(x.liste)}, “${satirAdi(x.satir)}”. MEBBİS’e taban altında ücret işlenmiş (MTSK Yön. md.43/4).`, '#/kursiyer/' + k.id, { kursiyer: k.id }));
    else if (Math.abs(m - u) >= 1) l.push(bul('bilgi', `${tamAd(k)} · MEBBİS kayıt ücreti ${tl(m)}, sözleşme ${tl(u)}`, 'MEBBİS’teki kayıt ücreti ile sözleşme ücreti aynı olmalı; birini düzeltin.', '#/kursiyer/' + k.id, { kursiyer: k.id })); }); } });
// KDV oranı: 5580 kapsamındaki eğitim hizmeti %10 (KDV kararı II sayılı liste B-15; 10/7/2023'ten beri). İl taban listesindeki tutarlar KDV dahildir (not 1).
kuralEkle({ id: 'T08', sira: 867, ad: 'Kurs ücretinde KDV oranı %10', dayanak: 'KDV Kanunu md.28; Cumhurbaşkanı kararı II sayılı liste B-15 (5580 kapsamındaki eğitim)', kapsam: 'kurs', ciddiyet: 'uyari',
  kontrol(l) { const k = (S.entegrasyon || {}).kdv; if (k != null && +k !== 10) l.push(['uyari', `Fatura ve müşavir ayarında KDV oranı %${k}`, 'Sürücü kursunun eğitim hizmeti %10 KDV’ye tabidir (II sayılı liste B-15). İl taban fiyat listesindeki tutarlar KDV dahildir. Oranı müşavirinizle teyit edip Ayarlar › Entegrasyon’dan düzeltin.', '#/ayarlar/entegrasyon']); } });
/* ---------- MEB onaylı ücret ilanı (SIT-006; MEBBİS OOK01002 dgUcret, Yardımcı 1.15 ile çekilir → S.kurs.mebUcretIlani) ---------- */
// İlandaki "Sınıfı" metni: 'Sertifika Yok, İstenen "B Otomatik"' ya da '"A1-A2-A" Mevcut, İstenen "B"'. Kurs sınıf koduna çevrilir.
const ILAN_DAYANAK = 'ÖÖKY md.54/1-d (ilan edilen ücretin üzerinde ücret istenemez), md.54/1-a (MTSK öğrenim ücreti ocak sonuna kadar MEBBİS’e ilan edilir)';
const ilanKod = t => { const u = String(t || '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/\s+/g, ' ').trim(); if (/CEZA/.test(u)) return 'CEZA'; if (/^B\s*-?\s*OTOMAT/.test(u)) return 'B-O'; if (/^B\s*-?\s*ENGEL/.test(u)) return 'B-EN'; if (/^B\s*-?\s*MANU/.test(u)) return 'B'; const m = u.match(/^(A1|A2|B1|BE|C1E|C1|CE|D1E|D1|DE|[ABCDFGM])\b/); return m ? m[1] : ''; };
export function ilanSatirlari(I = S.kurs.mebUcretIlani) {
  return ((I && I.satirlar) || []).map(r => { const t = String(r.sinif || ''), ist = (t.match(/İstenen\s*"([^"]+)"/i) || t.match(/Istenen\s*"([^"]+)"/i) || [])[1] || t, mev = /Sertifika\s*Yok/i.test(t) ? '' : ((t.match(/"([^"]+)"\s*Mevcut/i) || [])[1] || '');
    return { ...r, istenen: ilanKod(ist), mevcut: mev ? mev.split(/\s*-\s*(?=[A-Z])/).map(ilanKod).filter(Boolean) : [], mevcutOtomatik: /OTOMAT/i.test(mev) }; }).filter(r => r.istenen && r.toplam > 0);
}
// kursiyerin sınıfı ve mevcut belgesine uyan ilan satırı (belgesiz: "Sertifika Yok"; belgeli: mevcut grubunda belgesi olan satır)
export function ilanSatiri(sinif, mevcut, I) {
  const l = ilanSatirlari(I), m = mevcut && mevcut !== 'Yok' ? String(mevcut).replace(/\s*\(.*$/, '').trim() : '';
  return m ? l.find(r => r.istenen === sinif && r.mevcut.includes(ilanKod(m))) || null : l.find(r => r.istenen === sinif && !r.mevcut.length) || null;
}
kuralEkle({ id: 'T09', sira: 868, ad: 'Kurs ücretleri MEB’e bildirilen ücret ilanıyla uyumlu', dayanak: ILAN_DAYANAK + '; MTSK Yön. md.43/4', kapsam: 'kurs', ciddiyet: 'engel',
  // PAR-066: ilan yılının il listesi (1 Şubat değişimi: '2026-2027' ilanı → Şubat 2026'da geçerli liste); bütün ilan satırları (belgeli/fark satırları dahil) tabanla karşılaştırılır
  kontrol(l) { const I = S.kurs.mebUcretIlani; if (!I || !(I.satirlar || []).length) return; const L = (/^\d{4}/.test(I.yil || '') && tabanListesi(String(I.yil).slice(0, 4) + '-02-01')) || tabanListesi(), yil = I.yil ? I.yil + ' ilanı' : 'ücret ilanı';
    if (L) ilanSatirlari(I).filter(r => r.mevcut.length).forEach(r => { const x = satirBul(L, { sinif: r.istenen, mevcut: r.mevcut[0], otomatik: r.mevcutOtomatik }); const tt = x && x.satir ? tabanTutar(x.satir) : null, t = tt ? tt.tutar : null; if (t != null && r.toplam < t) l.push(['uyari', `İlan satırı il tabanının altında: ${r.sinif}`, `MEBBİS’teki ${yil} ${tl(r.toplam)}, ${listeAdi(L)} (${satirAdi(x.satir)}) ${tl(t)}. Taban altında ücret alınamaz (MTSK Yön. md.43/2, 43/4); ilanı MEBBİS’te en az taban ücrete güncelleyin.`, '#/ayarlar/sinif']); });
    Object.entries(SINIFLAR).filter(([, v]) => v.aktif && v.ucret).forEach(([k, v]) => { const r = ilanSatiri(k, '', I); if (!r) return;
      if (v.ucret > r.toplam) l.push(['yasak', `${v.ad} ücreti MEB’e bildirilen ilanın üzerinde`, `Kurs ücreti ${tl(v.ucret)}, MEBBİS’teki ${yil} ${tl(r.toplam)}${r.saatUcret ? ` (${tl(r.saatUcret)} × ${r.dersSayisi || '?'} ders)` : ''}. İlan edilen ücretin üzerinde ücret istenemez (ÖÖKY md.54/1-d): ilanı MEBBİS’te güncelleyin ya da ücreti düşürün.`, '#/ayarlar/sinif']);
      const t = L ? sinifTabani(k, L) : null; if (t != null && r.toplam < t) l.push(['uyari', `${v.ad}: MEB’e bildirilen ilan il taban fiyatının altında`, `MEBBİS’teki ${yil} ${tl(r.toplam)}, ${listeAdi(L)} ${tl(t)}. Taban altında ücret alınamaz, ilanın üzerinde de ücret istenemez; ücret ilanını MEBBİS’te en az taban ücrete güncelleyin (Özel Öğretim Kurumları › ücret ilanı).`, '#/ayarlar/sinif']); }); } });
kuralEkle({ id: 'T10', sira: 869, ad: 'Kursiyerin sözleşme ücreti ücret ilanının üzerinde değil', dayanak: ILAN_DAYANAK, kapsam: 'kursiyer', ciddiyet: 'uyari', bugun: true, bugunAd: n => `${n} öğrencinin ücreti MEB ücret ilanının üzerinde`,
  kontrol(l) { const I = S.kurs.mebUcretIlani; if (!I || !(I.satirlar || []).length) return;
    aktifKursiyerler().filter(k => k.odeme && String(k.kayit || '') >= (I.gecerliBas || '')).forEach(k => { const r = ilanSatiri(k.sinif, k.mevcutEhliyet, I); if (!r) return; const u = sozlesmeUcreti(k); if (!(u > r.toplam)) return;
      l.push(bul('uyari', `${tamAd(k)} · ücret ${tl(u)}, ilan ${tl(r.toplam)}`, `MEBBİS’teki ${I.yil || ''} ücret ilanında “${r.sinif}” satırı ${tl(r.toplam)}. İlan edilen ücretin üzerinde ücret istenemez (ÖÖKY md.54/1-d).`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `Ücret ${tl(u)}: MEB ilanı ${tl(r.toplam)} (ÖÖKY 54/1-d)`, eylem: 'odeme' })); }); } });
// PAR-009 (mali cevaplar 4, 10): fatura sözleşmedeki gerçek ücret üzerinden kesilir (VUK m.229; KDVK m.20, 27). Hesaplanan = sözleşme ücreti,
// kesilen = iptal edilmemiş kurs faturaları (sınav ücreti emaneti ve ek ders faturaları hariç: onlar sözleşme ücretinin dışında). MEBBİS'e de alınan
// gerçek ücret işlenir (MTSK Yön. m.43/2); MEBBİS'teki kayıt ücreti sözleşmeden farklıysa ayrı uyumsuzluk (mebFark = MEBBİS − sözleşme; düzeltilecek olan MEBBİS kaydı).
export function faturaDenetimi(k) {
  if (k.ucretsiz) return { hesap: 0, kaynak: 'ücretsiz', kesilen: 0, eksik: 0, ucretsiz: true, mebU: 0, mebFark: 0 };  // PAR-021: %3 ücretsiz kursiyerde fatura beklenmez (KDVK 17/2-b)
  const mebU = +(k.meb && (k.meb.kayitUcretiTL || tutarOku(k.meb.kayitUcreti))) || 0, hesap = +(sozlesmeUcreti(k) || 0), disi = f => { const h = f.hareket && S.hareket.find(x => x.id === f.hareket); return !!h && ['resmi', 'ders'].includes(ekTur({ ad: h.kategori })); };
  const kesilen = (S.faturalar || []).filter(f => f.kursiyer === k.id && f.durum !== 'iptal' && !disi(f)).reduce((a, f) => a + (+f.tutar || 0), 0);
  return { hesap, kaynak: 'sözleşme', kesilen, eksik: Math.max(0, Math.round((hesap - kesilen) * 100) / 100), mebU, mebFark: mebU && Math.abs(mebU - hesap) >= 1 ? Math.round((mebU - hesap) * 100) / 100 : 0 };
}
// PAR-054 (mali cevaplar 3): hizmet son sınavla tamamlanır; fatura en geç 7 gün içinde kesilir (VUK m.231/5). Son sınavdan 7 günü geçmiş ve faturası eksik
// kalan öğrenci: { k, sinav, gun (geçen gün), eksik }. Kurs mdSinyal'de hiç fatura tutmuyorsa (S.faturalar boş) liste boştur.
export function faturasizBitenler() {
  if (!(S.faturalar || []).length) return [];
  return sb(S.kursiyerler).filter(k => !k.ucretsiz && !k.prova && k.dsinav && k.dsinav.sonuc === 'Geçti' && k.dsinav.tarih && fark(k.dsinav.tarih) < -7 && fark(k.dsinav.tarih) > -400)
    .map(k => ({ k, sinav: k.dsinav.tarih, gun: -fark(k.dsinav.tarih), eksik: faturaDenetimi(k).eksik })).filter(x => x.eksik > 0).sort((a, b) => b.gun - a.gun);
}
