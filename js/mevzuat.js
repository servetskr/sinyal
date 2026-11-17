// Mevzuat uyum kuralları: ücret, tahsilat, iade, ücretsiz kontenjan, sınava hazır yazısı, planlama ve personel denetimleri.
// Dayanak: Özel Öğretim Kurumları Yönetmeliği (RG 5/9/2025-33008 değişikliği: m.54, m.55/3, m.56/3-b, m.56/4), MTSK Yönetmeliği
// (m.7/7 ve Danıştay 8. D. 8/10/2025 YD kararı, m.15, m.16/8, m.20, m.43), 5580 sayılı Kanun m.13 (%3 ücretsiz).
import { S, gun, fark, SINIFLAR, SINIF_VARSAYILAN, tamAd, islem, kaydet, oturum, egitmen, sb, sbDers, gerekliDireksiyon, direksiyonAyrinti, ustaAraci } from './veri.js?v=216';
import { e, tl, tarih, pencere, kapatPencere, bildir, belgeYazdir, isaret } from './ui.js?v=216';
import { denetimUyarilari } from './denetim.js?v=216';
import { kuralEkle } from './kurallar.js?v=216';

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
export function saatUcretleri(k) {
  // direksiyon saati öğrenciye özgü (farklı sınıf, eski kayıt): sözleşme ücreti bu öğrencinin asgari saatine bölünür
  const S0 = SINIFLAR[k.sinif] || { teorik: 34, direksiyon: 14 }, u = sozlesmeUcreti(k), su = (S0.saatUcret || {}), dir = gerekliDireksiyon(k);
  const pay = dir ? (S.kurs.teorikPay ?? 35) / 100 : 1;
  return { teorik: su.teorik || Math.round(u * pay / Math.max(1, S0.teorik)), direksiyon: dir ? (su.direksiyon || Math.round(u * (1 - pay) / dir)) : 0, kaynak: su.teorik ? 'tarife' : 'pay' };
}
// ÖÖKY m.56/3-b: dönem başlamadan ayrılana ücretin %10'u dışındaki kısım; başladıktan sonra %10 + aldığı ders saatleri düşülür.
export function yasalIade(k) {
  const u = sozlesmeUcreti(k), su = saatUcretleri(k), S0 = SINIFLAR[k.sinif] || {};
  const ts = Math.min(k.teorik || 0, S0.teorik || 0), ds = Math.min(k.direksiyon || 0, gerekliDireksiyon(k)), basladi = ts > 0 || ds > 0;
  const kesinti = Math.round(u * 0.1), teorikT = basladi ? ts * su.teorik : 0, direksiyonT = basladi ? ds * su.direksiyon : 0;
  const hak = Math.min(u, kesinti + teorikT + direksiyonT), od = odenenEgitim(k);
  return { ucret: u, kesinti, ts, ds, su, teorikT, direksiyonT, hak, odenen: od, iade: Math.max(0, od - hak), alacak: Math.max(0, hak - od), basladi };
}
export function iadeTablosu(r) {
  const s = (a, b, c) => `<tr><td>${a}</td><td style="text-align:right;white-space:nowrap">${b}</td>${c !== undefined ? `<td style="color:var(--soluk);font-size:12.5px">${c}</td>` : ''}</tr>`;
  return `<table class="tablo" style="font-size:14px"><tbody>
    ${s('Sözleşmedeki eğitim ücreti', tl(r.ucret), '')}
    ${s('Ücretin %10’u (kesinti)', '− ' + tl(r.kesinti), 'm.56/3-b')}
    ${r.basladi ? s(`Alınan teorik ders · ${r.ts} saat × ${tl(r.su.teorik)}`, '− ' + tl(r.teorikT), r.su.kaynak === 'tarife' ? 'tarifeden' : `ücretin %${S.kurs.teorikPay ?? 35}’i saatlere bölündü`) : s('Dönem başlamadan ayrıldı', '—', 'yalnız %10 düşülür')}
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
export function ucretsizDurum() {
  const y = yil(), l = S.kursiyerler.filter(k => String(k.kayit || '').slice(0, 4) === y);
  const n = l.length, gerek = Math.floor(n * 0.03 + 0.5), var_ = l.filter(k => k.ucretsiz).length;
  return { yil: y, n, gerek, var: var_, eksik: Math.max(0, gerek - var_) };
}
export function ucretsizYap(k, yenile) {
  const d0 = ucretsizDurum();
  pencere({
    baslik: 'Ücretsiz kursiyer · ' + tamAd(k),
    icerik: `<p style="font-size:14px;margin-bottom:12px">Kurs, kursiyer sayısının en az %3’ünü ücretsiz okutur (5580 sayılı Kanun m.13). ${d0.yil} kayıtları: ${d0.n} · gereken en az ${d0.gerek} · kayıtlı ${d0.var}.</p>
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
  if (ev.target.closest('[data-hazir-yazi]')) { import('./resmi.js?v=216').then(m => m.resmiAc('hazir', k.id)); return true; }
  if (ev.target.closest('[data-hazir-yuklendi]')) { k.hazirYazi.yuklendi = gun(0); islem('Sınava hazır yazısını MEBBİS’e yükledi', tamAd(k)); kaydet(); bildir('Kaydedildi'); if (yenile) yenile(); return true; }
  return false;
}

/* ---------- denetimler: MEB işlemleri › Kurallar ve takvim listesine eklenir ---------- */
export function mevzuatKurallari() {
  const K = S.kurs, l = [], ks = sb(S.kursiyerler);
  // Tahsilat kurum banka hesabına (ÖÖKY m.55/3, 5/9/2025)
  const nakit = (S.hareket || []).filter(h => h.tur === 'Gelir' && h.kursiyer && ['Kurs ücreti', 'Taksit'].includes(h.kategori) && h.yontem === 'Nakit' && fark(h.tarih) >= -30 && !h.bankaya);
  if (nakit.length) l.push(['uyari', `Son 30 günde ${nakit.length} eğitim ücreti nakit alındı (${tl(nakit.reduce((a, h) => a + h.tutar, 0))})`, `${OOKY} m.55/3 (5 Eylül 2025): eğitim ücreti kurum adına açılmış, MEB’e bildirilmiş banka hesabına yatırılarak tahsil edilir. Nakdi bankaya yatırın; tahsilatlar MEBBİS’e işlenir.`, '#/kasa']);
  // Tarife: il taban ücreti (MTSK m.43), ocak sonu ilanı (ÖÖKY m.54/1-a)
  Object.entries(SINIFLAR).filter(([, v]) => v.aktif && v.ucret && v.taban && v.ucret < v.taban).forEach(([, v]) => l.push(['yasak', `${v.ad} ücreti il taban ücretinin altında`, `${tl(v.ucret)} < taban ${tl(v.taban)}. Kurs, valilik komisyonunun belirlediği taban ücretten az ücret belirleyemez (MTSK Yönetmeliği m.43).`, '#/ayarlar/sinif']));
  if (K.tarifeIlan !== yil() && +gun(0).slice(5, 7) <= 2) l.push([+gun(0).slice(5, 7) === 1 ? 'uyari' : 'yasak', `${yil()} ücretleri MEBBİS’e ilan edilmedi`, `Ücret Ocak sonuna kadar ilan edilir; ilandan önce tahsilat yapılamaz (${OOKY} m.54). İlan ettiyseniz Ayarlar › Sınıf ve ücretler’den işaretleyin.`, '#/ayarlar/sinif']);
  // İndirim ilan edilen ücretin %50'sini aşamaz; ilanın üstünde ücret alınamaz (ÖÖKY m.54/1)
  ks.filter(k => !k.kapali && !k.ucretsiz && k.asama !== 'Ehliyet').forEach(k => { const ilan = (SINIFLAR[k.sinif] || {}).ucret, u = sozlesmeUcreti(k); if (!ilan) return;
    if (u < ilan * 0.5) l.push(['yasak', `${tamAd(k)} · indirim ilan edilen ücretin yarısını aşıyor`, `Sözleşme ${tl(u)}, ilan ${tl(ilan)}. İndirim oranı %50’yi aşamaz (${OOKY} m.54/1-a); %3 kontenjandaysa “Ücretsiz kursiyer” olarak işaretleyin.`, '#/kursiyer/' + k.id]);
    else if (u > ilan && String(k.kayit).slice(0, 4) === yil()) l.push(['uyari', `${tamAd(k)} · ilan edilen ücretin üstünde kayıt`, `Sözleşme ${tl(u)}, ilan ${tl(ilan)}. İlan edilenin üstünde ücret istenemez (${OOKY} m.54/1-d).`, '#/kursiyer/' + k.id]); });
  // %3 ücretsiz kontenjan
  const uc = ucretsizDurum(); if (uc.eksik) l.push(['bilgi', `Ücretsiz kursiyer kontenjanı: ${uc.var}/${uc.gerek}`, `${uc.yil} yılında ${uc.n} kayıt; en az %3’ü ücretsiz okutulur (5580 m.13). Yıllık kayıt üzerinden yaklaşık hesap; MEBBİS’teki dönem kontenjanıyla karşılaştırın.`, '#/kursiyerler']);
  // Yasal iade süresi (ÖÖKY m.56/4: en geç 1 ay)
  S.kursiyerler.filter(k => k.kapali && k.kapali.iadeSon && !k.kapali.iadeYapildi).forEach(k => { const kalan = fark(k.kapali.iadeSon); l.push([kalan < 0 ? 'dur' : kalan <= 7 ? 'yasak' : 'uyari', `${tamAd(k)} · ${tl(k.kapali.iadeTutar || 0)} iade ${kalan < 0 ? -kalan + ' gün gecikti' : kalan + ' gün içinde yapılmalı'}`, `Ayrılan kursiyere iade, ayrılıştan itibaren en geç 1 ay içinde yapılır (${OOKY} m.56/4).`, '#/kursiyer/' + k.id]); });
  // Sınava hazır yazısı
  ks.filter(k => hazirGerekli(k) && (!k.hazirYazi || !k.hazirYazi.yuklendi)).forEach(k => l.push([k.hazirYazi ? 'uyari' : 'yasak', `${tamAd(k)} · sınava hazır yazısı ${k.hazirYazi ? 'MEBBİS’e yüklenmedi' : 'yok'}`, 'Usta öğretici kararını yazıyla bildirir; kurs yazıyı tarayıp modüle yükler (md.7/7, Danıştay 8. D. 8/10/2025 YD).', '#/kursiyer/' + k.id]));
  // Direksiyonda kalan: tekrar sınavdan önce en az 2 saat ders (m.15)
  ks.filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı' && !k.dsinav.girmedi && k.dsinavPlan && !(k.hakBitti && !k.hakBitti.cozuldu)).forEach(k => { const n = S.dersler.filter(d => d.kursiyer === k.id && d.tarih > k.dsinav.tarih && d.tarih < k.dsinavPlan && d.durum !== 'Gelmedi').length; if (n < 2) l.push(['yasak', `${tamAd(k)} · tekrar sınavdan önce ${n}/2 saat ek ders`, 'Direksiyon sınavında başarısız olan, ilan edilen ücretle en az 2 saat ek ders almadan sınava giremez (MTSK Yönetmeliği m.15).', '#/plan']); });
  // Ders saatleri 07:00–23:00 (m.20)
  sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0 && d.saat && (d.saat < '07:00' || d.saat >= '23:00')).slice(0, 3).forEach(d => l.push(['yasak', `${tarih(d.tarih)} ${d.saat} dersi izin verilen saatlerin dışında`, 'Dersler 07:00–23:00 arasında yapılır (MTSK Yönetmeliği m.20).', '#/plan']));
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
    Object.entries(ak).forEach(([key, l2]) => { const [id, donem] = key.split('|'), a = S.araclar.find(x => x.id === id), a1b = l2.every(k => k.sinif === 'A1' && k.mevcutEhliyet === 'B'), sinir = a1b ? 24 : 12;
      if (a && l2.length > sinir) l.push([donem >= bu ? 'uyari' : 'bilgi', `${a.plaka} · ${donem.split('-').reverse().join('.')} döneminde ${l2.length} kursiyer`, `Bir eğitim döneminde bir direksiyon eğitim ve sınav aracı için en çok ${sinir} kursiyer kaydı yapılır (MTSK Yönetmeliği m.16/8${a1b ? ', m.39/5' : ''}). Kursiyerleri başka usta öğretici ve araçlara dağıtın.`, '#/filo']); }); }
  // Kursun sınıf ayarındaki direksiyon saati yönetmelik asgarisinin altında (md.7/1)
  Object.entries(SINIFLAR).filter(([key, v]) => v.aktif && SINIF_VARSAYILAN[key] && v.direksiyon < SINIF_VARSAYILAN[key].direksiyon).forEach(([key, v]) => l.push(['yasak', `${v.ad} · direksiyon ${v.direksiyon} ders, yönetmelik asgarisi ${SINIF_VARSAYILAN[key].direksiyon}`, 'İlk kez belge alan için alanda ya da simülatörde en az 2 saat ve akan trafikte asgari saat verilir (MTSK md.7/1). Ayarlar › Sınıf ve ücretler’den düzeltin; kural tarihinden önce kaydolan öğrencilerin sayısı değişmez.', '#/ayarlar/sinif']));
  // Elle girilen (il tablosu) direksiyon saati md.39 alt sınırının altında: M→B1 12 saat (madde 1), B→A1 2 yıllık B'de yarı süre (md.39/5), otomatikten manuele
  // yarı süre (madde 2, yorum: teyit bekliyor). md.7/6 yaptırımı yalnız md.7/1 sürelerine bağlı (madde 5), bu uyarıda anılmaz.
  ks.filter(k => !k.kapali && k.asama !== 'Ehliyet' && !(k.dsinav && k.dsinav.sonuc === 'Geçti')).forEach(k => { const r = direksiyonAyrinti(k); if (r.elle && r.altinda) l.push(['uyari', `${tamAd(k)} · ${r.saat} ders, alt sınır ${String(r.alt).replace('.', ',')} saat`, `Elle girilen ders sayısı (il tablosu) alt sınırın altında kalıyor (MTSK ${r.altDayanak || 'md.39'}). İl MEM’in yazılı uygulamasını kontrol edin.`, '#/kursiyer/' + k.id]); });
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
kuralEkle({ id: 'MZ', sira: 900, ad: 'Mevzuat uyumu: ücret, tahsilat, iade, ücretsiz kontenjan, hazır yazısı, ders saatleri, araç başına kursiyer, personel izni, denetim', dayanak: 'ÖÖKY m.54, 55/3, 56/3-b, 56/4; MTSK Yön. md.7/1, 7/7, 15, 16/8, 20, 43; 5580 m.7/2-e, m.13', kapsam: 'kurs', ciddiyet: 'uyari', kontrol(l) { l.push(...mevzuatKurallari()); } });
