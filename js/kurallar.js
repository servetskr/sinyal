// MEB kural motoru: plan ve kayıtları yönetmeliğe göre tarayan kuralların tek yeri (uyari-guvenlik.md §4.2).
// Kural: { id, ad, dayanak (madde no), kapsam: 'kursiyer'|'ders'|'sinav'|'grup'|'arac'|'personel'|'kurs', ciddiyet: 'engel'|'uyari'|'bilgi',
//          teyit (dayanağı ya da sayısı teyit bekliyor), ayar (S.kurs alanı), bugun (Genel bakış › Bugün yapılacaklar'da görünür), kontrol(l, K, c) }
// kontrol bulguları l'ye [tur, baslik, aciklama, link] dizisi olarak ekler (MEB işlemleri › Kurallar listesinin biçimi). tur: 'dur'/'yasak' = engel,
// 'uyari', 'bilgi'. Dizinin üstünde ek alanlar: kural (kimlik), kursiyer (id), kursiyerler (birden çok kişiye ait oturum bulgusunda kimlik listesi, ör. Y04), kisa (öğrenci dosyasında ad olmadan başlık), yalnizDosya, eylem.
// DOM yok; yalnız veri.js'e bağlı (Node'da denenebilir). Bugün: veri.js BUGUN / gun().
// Yeni kurallar ilk sürümde yalnız "uyarı"dır; Eyüp Bey teyit edince engele çevrilebilir (belgeler/eksikler/eyup-sorular.md).
import { S, gun, fark, aracUygun, izinDurumu, haftalikSinir, haftaDers, ustaYetkili, tarihOku, iso, SINIFLAR, kursiyer, egitmen, tamAd, sb, sbDers, sbSinav, eksikEvrak, gecikenler, gerekliDireksiyon, geceGerekli, geceKisitli, geceDersMi, geceBaslangic, mebIsGunuSay, mebIsGunuGeri, IKINCI_HAK_GUN, KURAL_ARALIK, kuralAyar, sinifEtiket, esinavsizBelgeli } from './veri.js?v=234';

/* ---------- yardımcılar (ui.js'teki biçimlerle aynı; ui.js DOM'a bağlı olduğu için burada kopyası) ---------- */
const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
// MTSK md.17/2-d: araç yaşı = yıl − imal (model) yılı; sınır sınıfa göre
const HAFIF_ARAC = ['M', 'A1', 'A2', 'A', 'B1', 'B', 'B-O', 'B-EN', 'BE'];
export const aracYasi = (a, yil = new Date().getFullYear()) => { const m = +((a && (a.yil || (a.meb || {}).yil)) || 0); return m > 1900 ? yil - m : null; };
export const aracYasSiniri = a => a && a.sinif ? (HAFIF_ARAC.includes(a.sinif) ? 12 : 22) : null;
const tarih = s => { if (!s) return '—'; const d = tarihOku(s); return d.getDate() + ' ' + AY[d.getMonth()]; };
const TL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const tl = n => TL.format(Math.round(n)) + ' ₺';
// MEB süreleri iş günüyle sayılır: tek tanım veri.js mebIsGunuMu (Pazartesi–Cuma; resmî tatil, bayram, arife ve idari izin hariç; eyup-sorular-cevaplar.md madde 11)
const isGunu = n => n > 0 ? mebIsGunuSay(gun(0), gun(n)) : 0;
const gunEkle = (t, n) => { const d = tarihOku(t); d.setDate(d.getDate() + n); return iso(d); };
const bul = (tur, baslik, aciklama, link, ek) => Object.assign([tur, baslik, aciklama, link], ek || {});
const simdi = () => Date.now();
// İş günüyle sayılan son güne kalan süre (sınav gününe değil): "Son güne 2 iş günü kaldı." / "Son gün bugün." / "Süre geçti."
// tarihli: son gün başlıkta yazmıyorsa metne eklenir
const sonGunMetni = (son, tarihli) => { const n = mebIsGunuSay(gun(0), son); return fark(son) < 0 ? (tarihli ? `Son gün ${tarih(son)} idi; süre geçti.` : 'Süre geçti.') : fark(son) === 0 ? 'Son gün bugün.' : tarihli ? `Son gün ${tarih(son)}; ${n} iş günü kaldı.` : `Son güne ${n} iş günü kaldı.`; };
const grupAdi = id => { const g = (S.gruplar || []).find(x => x.id === id); return g ? g.ad : id === 'sabah' ? 'Sabah grubu' : id === 'aksam' ? 'Akşam grubu' : 'Teorik grup'; };
const CIDDIYET_TUR = { engel: 'yasak', uyari: 'uyari', bilgi: 'bilgi' };
// MEBBİS'ten çekilen "Haklarının Tamamlanacağı Tarih": yönetmelikte 120 gün geçmiyor; büyük olasılıkla MEBBİS'in iç sınırı, il MEM yazısı olup olmadığı
// teyit bekliyor (eyup-sorular-cevaplar.md madde 7). Ne "MEB kuralı" ne "MEB kuralı değil" denir: yalnız MEBBİS'in gösterdiği tarih olarak ayrı yazılır.
const mebSinir = k => k && k.meb && /^\d{4}-\d{2}-\d{2}/.test(k.meb.haklarSonGun || '') ? ` MEBBİS’in gösterdiği son tarih (yönetmelikte yok): ${tarih(k.meb.haklarSonGun)}.` : '';

/* ---------- kurallar ---------- */
const KURALLAR = [
  // —— MEB işlemleri › Kurallar listesinden taşınanlar (sayfalar2.js mebKurallari; çıktı aynı) ——
  // Bütün dersler bulgu verir (MEBBİS’e yaz onayı her dersi eşler); Kurallar listesi ilk 4’ten sonrasını tek satırda toplar (sayfalar2.js mebKurallari)
  { id: 'M01', sira: 10, ad: 'Direksiyon programı MEBBİS’e önceden girilir', dayanak: 'MTSK Yön. md.23/1 (direksiyon dersleri en az 5 gün önce Özel MTSK Modülü’ne işlenir)', kapsam: 'ders', ciddiyet: 'uyari', ayar: 'programOnGun',
    kontrol(l, K, c) { c.yakin.filter(d => d.eklendi && (tarihOku(d.tarih) - tarihOku(d.eklendi)) / 864e5 < K.programOnGun).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)).forEach(d => l.push(['uyari', `${tamAd(kursiyer(d.kursiyer))} · ${tarih(d.tarih)} ${d.saat} dersi ${K.programOnGun} günden kısa sürede planlandı`, `Direksiyon programı MEBBİS’e en az ${K.programOnGun} gün önce girilmeli.`, '#/plan'])); } },
  // md.16/4: "Direksiyon eğitimi dersleri her bir kursiyer için ayrı ayrı olmak üzere günde 2 saatten fazla yapılamaz." Engel: ders ekleme penceresi kaydı durdurur (dersKontrol).
  { id: 'M02', sira: 20, ad: 'Kursiyer başına günlük direksiyon sınırı', dayanak: 'MTSK Yön. md.16/4 (günde en fazla 2 saat)', kapsam: 'ders', ciddiyet: 'engel', ayar: 'gunlukDersSiniri',
    kontrol(l, K, c) { const gr = {}, sinir = gunlukSinir(); c.yakin.forEach(d => { const a = d.kursiyer + '|' + d.tarih; gr[a] = (gr[a] || 0) + 1; });
      Object.entries(gr).filter(([, n]) => n > sinir).forEach(([a, n]) => { const k = kursiyer(a.split('|')[0]); if (k) l.push(['yasak', `${tamAd(k)} için ${tarih(a.split('|')[1])} günü ${n} saat direksiyon var`, `Günde en fazla ${sinir} saat (MTSK Yön. md.16/4).`, '#/plan']); }); } },
  { id: 'M03', sira: 30, ad: 'Asgari direksiyon saati tamamlanmadan sınav yok', dayanak: 'MTSK Yön. md.7/1, md.39', kapsam: 'kursiyer', ciddiyet: 'engel',
    kontrol(l) { sb(S.kursiyerler).filter(k => k.asama === 'Sınav' && !k.dsinav && k.direksiyon < gerekliDireksiyon(k)).forEach(k => l.push(['yasak', `${tamAd(k)} sınava hazır görünüyor ama ${k.direksiyon}/${gerekliDireksiyon(k)} ders`, 'Asgari direksiyon saati tamamlanmadan sınava giremez (MTSK md.7/1, farklı sınıfta md.39).', '#/kursiyer/' + k.id])); } },
  // gece dersi: gün batımından sonra başlayan ders (md.20/1; başlangıç kurs ayarı: il MEM saati ya da gün batımı hesabı, madde 6), en az 2 saat (md.7/3).
  // CE ve G md.7/3 listesinde yok: zorunlu değil (madde 5; CE'de kurs ayarı geceCE ile açılabilir). Sağlık raporunda gece kısıtı olana gece dersi planlanmaz (md.7/3 son cümle).
  { id: 'M04', sira: 40, ad: 'Gece direksiyon dersi', dayanak: 'MTSK Yön. md.7/3, md.20/1 (CE ve G’de zorunlu değil)', kapsam: 'kursiyer', ciddiyet: 'bilgi', ayar: 'geceDersi',
    kontrol(l, K, c) { sb(S.kursiyerler).filter(k => ['Direksiyon', 'Sınav'].includes(k.asama) && geceGerekli(k) && k.direksiyon >= gerekliDireksiyon(k) - 4).forEach(k => { const gg = geceGerekli(k), g = sbDers(S.dersler).filter(d => d.kursiyer === k.id && d.durum !== 'Gelmedi' && d.durum !== 'İptal' && geceDersMi(d)).length; if (g < gg) l.push(['bilgi', `${tamAd(k)} · gece dersi ${g}/${gg}`, `Gün batımından sonra en az ${gg} saat ders planlanmalı (MTSK md.7/3). Bugün gece dersi başlangıcı ${geceBaslangic(gun(0))}; bu saatten sonra başlayan ders gece dersi sayılır.`, '#/plan']); });
      c.yakin.filter(d => geceDersMi(d) && geceKisitli(kursiyer(d.kursiyer))).forEach(d => l.push(['uyari', `${tamAd(kursiyer(d.kursiyer))} · ${tarih(d.tarih)} ${d.saat} gece dersi`, 'Sağlık raporunda gece kısıtı var; bu kursiyere gece eğitimi verilmez (MTSK md.7/3). Dersi gün batımından önceye alın.', '#/plan'])); } },
  { id: 'M05', sira: 50, ad: 'Uygulama sınavı MEBBİS’e iş günü öncesinden bildirilir', dayanak: 'MTSK Yön. md.15/1, md.30/2 (sınavdan en geç 4 iş günü önce; ikinci dört hakta md.15/4)', kapsam: 'sinav', ciddiyet: 'engel', ayar: 'sinavBildirimIsGunu',
    kontrol(l, K) { sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && !s.mebBildirim && isGunu(fark(s.tarih)) <= K.sinavBildirimIsGunu + 2).forEach(s => l.push(['dur', `${tarih(s.tarih)} uygulama sınavı MEBBİS’e bildirilmedi`, `Kursiyer, usta öğretici ve araç bilgileri sınavdan en geç ${K.sinavBildirimIsGunu} iş günü önce girilmeli. ${sonGunMetni(mebIsGunuGeri(s.tarih, K.sinavBildirimIsGunu), true)}`, '#/meb'])); } },
  { id: 'M06', sira: 60, ad: 'Sağlık raporunda “sürücü olur”', dayanak: 'Sürücü adaylarının sağlık şartları; MEBBİS kayıt şartı', kapsam: 'kursiyer', ciddiyet: 'engel',
    kontrol(l) { sb(S.kursiyerler).filter(k => k.asama !== 'Ehliyet' && k.saglikRapor && k.saglikRapor.surucuOlur === false).forEach(k => l.push(['yasak', `${tamAd(k)}: sağlık raporunda “sürücü olur” işaretli değil`, 'Bu raporla MEB kaydı yapılamaz; adaydan yeni rapor ya da uzman hekim sevk raporu isteyin.', '#/kursiyer/' + k.id])); } },
  { id: 'M07', sira: 70, ad: 'e-Sınava yazılanın evrakı tam', dayanak: 'MTSK Yön. (kayıt evrakı)', kapsam: 'sinav', ciddiyet: 'engel',
    kontrol(l) { sbSinav(S.sinavlar).filter(s => s.tur === 'e-Sınav' && fark(s.tarih) >= 0).forEach(s => s.kursiyerler.map(kursiyer).filter(k => k && eksikEvrak(k).length).forEach(k => l.push(['yasak', `${tamAd(k)} e-sınava kayıtlı ama evrakı eksik`, eksikEvrak(k).map(x => x[1]).join(', '), '#/kursiyer/' + k.id]))); } },
  // uygulama sınavında kalan: tekrar sınavdan önce en az 2 ek direksiyon dersi (yapılmış) gerekir
  { id: 'M08', sira: 80, ad: 'Kaldıktan sonra 2 ek ders yapılmadan tekrar sınav yok', dayanak: 'MTSK Yön. md.15', kapsam: 'kursiyer', ciddiyet: 'uyari',
    kontrol(l) { sb(S.kursiyerler).filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı' && !k.dsinav.girmedi && k.dsinavPlan && S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı' && d.tarih > k.dsinav.tarih).length < 2).forEach(k => l.push(['uyari', `${tamAd(k)} tekrar uygulama sınavına yazıldı ama kaldıktan sonra 2 ek ders tamamlanmadı`, 'Sınavdan önce en az 2 saat ek direksiyon dersi yapılmalı.', '#/kursiyer/' + k.id])); } },
  { id: 'M09', sira: 90, ad: 'Tekrar sınav öncesi bekleme', dayanak: 'Kurs ayarı (mevzuatta sabit gün yok)', kapsam: 'kursiyer', ciddiyet: 'uyari', ayar: 'tekrarBekleme',
    kontrol(l, K) { sb(S.kursiyerler).filter(k => k.dsinav && k.dsinav.sonuc === 'Kaldı' && !k.dsinav.girmedi && k.dsinavPlan && (tarihOku(k.dsinavPlan) - tarihOku(k.dsinav.tarih)) / 864e5 < K.tekrarBekleme).forEach(k => l.push(bul('uyari', `${tamAd(k)} tekrar sınavı bekleme süresinden önce`, `Kaldıktan sonra en az ${K.tekrarBekleme} gün (kurs ayarı).`, '#/sinavlar', { kursiyer: k.id }))); } },
  // Grup başlama tarihinden itibaren son e-sınav hakkı için randevu alma süresi 90 günü geçemez (MTSK md.15/1, ilk cümle): grup başlangıcı + 90 gün = son e-sınav randevusu.
  // Yaklaşınca (20 gün kala) ve geçince uyarı (eyup-sorular-cevaplar.md madde 7). MEBBİS'ten çekilen "Haklarının Tamamlanacağı Tarih" (çoğu zaman 120 gün)
  // yönetmelikte geçmiyor: "MEBBİS’in gösterdiği son tarih (yönetmelikte yok)" diye ayrı gösterilir (mebSinir).
  { id: 'M10', sira: 100, ad: 'Grup başlangıcından 90 gün içinde son e-sınav randevusu', dayanak: 'MTSK Yön. md.15/1', kapsam: 'kursiyer', ciddiyet: 'uyari',
    kontrol(l) { sb(S.kursiyerler).filter(k => !k.kapali && !k.muaf && !esinavsizBelgeli(k) && !(k.esinav && k.esinav.sonuc === 'Geçti') && ['Kayıt', 'Evrak', 'Teorik', 'Sınav'].includes(k.asama)).forEach(k => { const g = (S.gruplar || []).find(x => x.id === k.teorikGrup); if (!g || !/^\d{4}-\d{2}-\d{2}/.test(g.baslangic || '') || fark(g.baslangic) > 0) return; const kalan = 90 + fark(g.baslangic); if (kalan <= 20) l.push([kalan < 0 ? 'dur' : kalan <= 7 ? 'yasak' : 'uyari', `${tamAd(k)} · grup başlangıcından bu yana ${90 - kalan} gün, e-sınavı geçmedi`, (kalan < 0 ? `Son e-sınav hakkı için randevu süresi (grup başlangıcı ${tarih(g.baslangic)} + 90 gün = ${tarih(gunEkle(g.baslangic, 90))}) ${-kalan} gün önce doldu. Süresi içinde mazeretsiz e-sınava girmeyen kursiyer yeniden kayıt yaptırabilir; durumu MEBBİS’ten kontrol edin.` : `Son e-sınav hakkı için randevu en geç ${tarih(gunEkle(g.baslangic, 90))} tarihine kadar alınmalı; ${kalan} gün kaldı (MTSK md.15/1: grup başlama tarihinden itibaren 90 gün).`) + mebSinir(k), '#/kursiyer/' + k.id]); }); } },
  // e-sınavı geçtikten sonra direksiyon derslerinin tamamlanma süresi (MTSK md.15/1-b: bütün sınıflarda 90 gün; sınav tarihini MEM belirler). MEBBİS'ten çekilen
  // "Haklarının Tamamlanacağı Tarih" varsa mebSinir ile ayrıca gösterilir. Eski "60 gün" kuralı (md.12/4, RG 12/9/2019) 9/1/2025'te kalktı;
  // M, A1, A2, B1 dahil hiçbir sınıfa 60 gün uygulanmaz (eyup-sorular-cevaplar.md madde 8).
  { id: 'M11', sira: 110, ad: 'e-Sınavdan sonra direksiyon süresi', dayanak: 'MTSK Yön. md.15/1-b (bütün sınıflar 90 gün)', kapsam: 'kursiyer', ciddiyet: 'uyari', ayar: 'direksiyonSure',
    kontrol(l, K) { const SURE = K.direksiyonSure || 90;
      sb(S.kursiyerler).filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && !(k.dsinav && k.dsinav.sonuc === 'Geçti')).forEach(k => { const es = S.sinavlar.filter(s => s.tur === 'e-Sınav' && (s.sonuc || {})[k.id] === 'Geçti').sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; if (!es) return; const gecen = -fark(es.tarih), kalan = SURE - gecen; if (kalan <= 20) l.push([kalan < 0 ? 'dur' : kalan <= 7 ? 'yasak' : 'uyari', `${tamAd(k)} · e-sınavdan bu yana ${gecen} gün`, (kalan < 0 ? `${SURE} günlük süre ${-kalan} gün önce doldu; durumu MEBBİS’ten kontrol edin.` : `Direksiyon derslerinin tamamlanması için ${kalan} gün kaldı (MTSK md.15/1-b, ${SURE} gün).`) + mebSinir(k), '#/kursiyer/' + k.id]); }); } },
  { id: 'M12', sira: 120, ad: 'Araç muayene ve sigortası', dayanak: 'MTSK Yön. (eğitim aracı belgeleri)', kapsam: 'arac', ciddiyet: 'engel',
    kontrol(l) { S.araclar.filter(a => [a.muayene, a.sigorta].some(t => t && fark(t) < 0)).forEach(a => l.push(['dur', `${a.plaka} belgesi süresi dolmuş`, 'Bu araçla ders ve sınav yapılamaz.', '#/filo']));
      // ARC-002 (SOR-048): 30 gün kala uyarı; MEBBİS'te muayene doldu ya da hizmet dışı görünen araç planlamadan çıkar
      S.araclar.filter(a => !a.kapali && /muayene\s*tarihi\s*doldu|hizmet\s*d[ıi]ş/i.test(a.mebDurum || '')).forEach(a => l.push(['dur', `${a.plaka} MEBBİS’te “${a.mebDurum}”`, 'Bu araçla ders ve sınav planlanamaz. MEBBİS’te durumu düzeltilince araç listesi yeniden çekilmeli.', '#/filo']));
      // ARC-006: araç yaşı (MTSK md.17/2-d): M, A1, A2, A, B1, B, BE 12; ağır sınıflar ve F 22. İmal yılından sonraki ilk takvim yılında 1 yaş.
      S.araclar.forEach(a => { const y = aracYasi(a), s = aracYasSiniri(a); if (y == null || !s) return; if (y > s) l.push(['dur', `${a.plaka} ${y} yaşında (sınır ${s})`, `MTSK Yön. md.17/2-d: bu sınıfın eğitim ve sınav aracı ${s} yaşından büyük olamaz. Bu araçla ders ve sınav yapılamaz.`, '#/filo']); else if (y === s) l.push(['uyari', `${a.plaka} bu yıl yaş sınırında (${s})`, `1 Ocak’tan sonra bu araçla ders ve sınav yapılamaz (MTSK Yön. md.17/2-d). Yerine araç planlayın.`, '#/filo']); });
      // ARC-005: MTV taksitleri Ocak ve Temmuz sonuna kadar ödenir (197 sayılı Kanun md.10); araç masrafında 'MTV' kaydı olmayan araçlar hatırlatılır
      { const bugunD = new Date(), ay = bugunD.getMonth() + 1, yil = bugunD.getFullYear();
        if (ay === 1 || ay === 7) { const bas = `${yil}-${ay === 1 ? '01' : '07'}-01`, son = `${yil}-${ay === 1 ? '01' : '07'}-31`;
          const l2 = S.araclar.filter(a => !a.kapali && !(S.hareket || []).some(h => h.arac === a.id && h.kategori === 'MTV' && h.tarih >= bas && h.tarih <= son));
          if (l2.length) l.push(['uyari', `MTV ${ay === 1 ? '1' : '2'}. taksit: ${l2.length} aracın ödemesi kayıtlı değil`, `Son gün ${ay === 1 ? '31 Ocak' : '31 Temmuz'}. Ödeyince Ekip ve araçlar’da araç kartından “Masraf ekle › MTV” ile kaydedin: ${l2.slice(0, 6).map(a => a.plaka).join(', ')}${l2.length > 6 ? '…' : ''}.`, '#/filo']); } }
      // ARC-003: bakım km (sonraki bakım km'ye 500 km ya da daha az)
      S.araclar.forEach(a => { if (!(+a.bakimKm > 0) || !(+a.km > 0)) return; const k = +a.bakimKm - +a.km; if (k <= 500) l.push(['uyari', `${a.plaka} · bakım ${k <= 0 ? 'zamanı geçti' : k + ' km sonra'}`, `Sonraki bakım ${a.bakimKm.toLocaleString('tr-TR')} km, araç ${(+a.km).toLocaleString('tr-TR')} km’de.`, '#/filo']); });
      S.araclar.forEach(a => [['muayene', 'Muayene'], ['sigorta', 'Trafik sigortası'], ['kasko', 'Kasko']].forEach(([f, ad]) => { const g = a[f] ? fark(a[f]) : null; if (g != null && g >= 0 && g <= 30) l.push(['uyari', `${a.plaka} · ${ad} ${g ? g + ' gün sonra' : 'bugün'} bitiyor`, `${ad} bitişi ${tarih(a[f])}. Yenilenmezse bu araçla ders ve sınav yapılamaz.`, '#/filo']); })); } },
  { id: 'M13', sira: 130, ad: 'Usta öğretici belgeleri', dayanak: 'MTSK Yön. (personel belgeleri)', kapsam: 'personel', ciddiyet: 'engel',
    kontrol(l) { S.egitmenler.forEach(x => Object.entries(x.belgeler || {}).filter(([, t]) => fark(t) < 0).forEach(([b]) => l.push(['dur', `${x.ad} · ${{ sertifika: 'sertifika', saglik: 'sağlık raporu', adli: 'adli sicil' }[b]} süresi dolmuş`, 'Yenilenene kadar ders ve sınav planlanamaz.', '#/filo']))); } },

  // —— yeni kurallar (uyarı; Bugün ekranında ve öğrenci dosyasında da görünür) ——
  // 7/7: hazır onayından sonra en geç ikinci farklı kodlu sınava girmeyenin bir hakkı kullanılmış sayılır. İlçe sınav takvimi MEBBİS'ten
  // çekilmediği sürece (S.mebIlceSinavlari) kursun kendi uygulama sınavı oturumları "farklı kod" sayılır: teyit bekliyor.
  { id: 'Y01', sira: 200, ad: 'Hazır onayından sonra ikinci farklı kodlu sınav (görünmeden yanan hak)', dayanak: 'MTSK Yön. md.7/7', kapsam: 'kursiyer', ciddiyet: 'uyari', teyit: 'İlçe sınav takvimi (sınav kodları) MEBBİS’ten çekilmiyor; kursun girdiği uygulama sınavı oturumları kullanılıyor.', bugun: true, bugunAd: n => `${n} öğrencinin sınav hakkı yanabilir (hazır onayı, md.7/7)`,
    kontrol(l) {
      const takvim = ilceTakvimi();
      sb(S.kursiyerler).filter(k => !k.kapali && k.asama === 'Sınav' && !(k.dsinav && k.dsinav.sonuc === 'Geçti') && !(k.hakBitti && !k.hakBitti.cozuldu)).forEach(k => {
        const onay = hazirOnayi(k); if (!onay) return;
        if (k.dsinav && k.dsinav.tarih >= onay) return;   // onaydan sonra sınava girdi
        const [s1, s2] = takvim.filter(s => s.tarih > onay); if (!s1 || !s2) return;
        if ([s1, s2].some(s => (s.kursiyerler || []).includes(k.id))) return;
        // MEBBİS'ten çekilen sınav kayıtlarında onaydan sonra bu iki koddan birine (ya da ikinci sınava kadar bir sınava) yazılmışsa uyarı yok
        if (((k.meb || {}).uygulamaSinavlari || []).some(x => x && ((x.kod && [s1.kod, s2.kod].includes(x.kod)) || (/^\d{4}-\d{2}-\d{2}/.test(x.tarih || '') && x.tarih > onay && x.tarih <= s2.tarih)))) return;
        const kisaT = `${tarih(s2.tarih)} sınavına yazılmazsa 1 hak yanar`, ac = `Sınava hazır onayı ${tarih(onay)}. Onaydan sonraki ikinci farklı kodlu sınava girmeyen kursiyerin bir sınav hakkı kullanılmış sayılır (MTSK Yön. md.7/7). Sonraki sınavlar: ${tarih(s1.tarih)}, ${tarih(s2.tarih)}.${(() => { const sl = takvim.filter(s => s.tarih > s2.tarih), i = sl.findIndex(s => (s.kursiyerler || []).includes(k.id)); return i >= 0 ? ` Şu an ${tarih(sl[i].tarih)} sınavına yazılı; bu, onaydan sonraki ${i + 3}. sınav.` : ''; })()}${takvim.kurs ? ' İlçe sınav takvimi MEBBİS’ten alınmadı; kursun oturumları esas alındı (teyit bekliyor).' : ''}`;
        // hak düştüyse öğrenci dosyasından sınav kaydı olmadan işlenir (eylem 'hak-yandi'; eyup-sorular-cevaplar.md madde 10)
        if (fark(s2.tarih) < 0) l.push(bul('uyari', `${tamAd(k)} · hazır onayından sonraki iki sınava girmedi`, `${ac} Bir hak düşmüş olabilir; MEBBİS’te kalan hakkı kontrol edin, düştüyse öğrenci dosyasından işleyin.`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: 'Hazır onayından sonraki iki sınava girmedi: 1 hak düşmüş olabilir', eylem: 'hak-yandi', tarih: s2.tarih }));
        else if (fark(s1.tarih) < 0 || fark(s2.tarih) <= 10) l.push(bul('uyari', `${tamAd(k)} · ${kisaT}`, ac, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: kisaT.charAt(0).toLocaleUpperCase('tr') + kisaT.slice(1) }));
      });
    } },
  // 15/4: dört uygulama sınavında kalan, son sonuçtan itibaren 60 gün içinde ücreti öder ve sınıfın direksiyon saati kadar dersi yeniden alırsa ikinci dört hak;
  // 15/5: süre geçerse yeniden kayıt (3 yıl içinde teorikten muaf); 13/2: kalan haklardan vazgeçip başka kursa nakil, dört hak bitmeden de olur;
// 15/6: ilk haklarını manuelde kullanan kalan haklarından vazgeçip ikinci dört hakta otomatikle (ya da tersi) devam eder, değişiklik modüle işlenir.
  // Direksiyon hakkı 4+4 sayılır, e-sınavın 4 hakkından ayrı (veri.js sinavHakSiniri). eyup-sorular-cevaplar.md madde 9.
  { id: 'Y02', sira: 210, ad: 'İkinci dört sınav hakkı için 60 gün', dayanak: 'MTSK Yön. md.15/4, md.15/5, md.13/2', kapsam: 'kursiyer', ciddiyet: 'uyari', teyit: '60 günün yalnız ödeme ve başvuru için mi, derslerin bitmesi için de mi geçerli olduğu yönetmelikte ayrılmıyor.', bugun: true, bugunAd: n => `${n} öğrenci ikinci dört hak süresinde (md.15/4)`,
    kontrol(l) {
      sb(S.kursiyerler).filter(k => !k.kapali && k.hakBitti && k.hakBitti.tur === 'Direksiyon' && !k.hakBitti.cozuldu && !k.ikinciHak).forEach(k => {
        const son = ikinciHakSonGun(k); if (!son) return l.push(bul('bilgi', `${tamAd(k)} · ikinci dört hak süresi hesaplanamadı`, `Dört uygulama sınavı hakkı bitti ama son sınavın tarihi kayıtlı değil. Son sınav sonucundan itibaren ${IKINCI_HAK_GUN} gün içinde başvurursa dört hak daha verilir (MTSK Yön. md.15/4); tarihi MEBBİS’ten kontrol edin.`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `İkinci dört hak: son sınav tarihi kayıtlı değil, ${IKINCI_HAK_GUN} günlük süreyi MEBBİS’ten kontrol edin`, bugun: false }));
        const kalan = fark(son);
        if (kalan < 0) return l.push(bul('bilgi', `${tamAd(k)} · ikinci dört hak süresi doldu`, `Son sınav sonucundan itibaren ${IKINCI_HAK_GUN} günlük başvuru süresi ${tarih(son)} tarihinde doldu (MTSK Yön. md.15/4). Kursiyer yeniden kayıt yaptırabilir; 3 yıl içinde kaydolursa teorik eğitim ve sınavdan muaftır (md.15/5).`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `İkinci dört hak süresi ${tarih(son)} tarihinde doldu`, bugun: false }));
        l.push(bul(kalan <= 15 ? 'uyari' : 'bilgi', `${tamAd(k)} · ikinci dört hak için ${kalan} gün kaldı`, `Dört uygulama sınavı hakkı bitti. ${tarih(son)} tarihine kadar başvurup ilan edilen ders ücretini öder ve sınıfının direksiyon saati kadar ders alırsa dört sınav hakkı daha verilir (MTSK Yön. md.15/4). Süre son sınavın tarihinden sayılıyor; sonuç daha geç açıklandıysa MEBBİS’teki tarihe bakın. Kursiyer kalan haklarından vazgeçip başka kursa nakil de olabilir (md.13/2). İlk haklarını manuel araçta kullanan, kalan haklarından vazgeçerek ikinci dört hakta otomatik araçla (ya da tersi) devam edebilir; değişiklik Özel MTSK Modülü’ne işlenir (md.15/6).`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `İkinci dört hak için ${kalan} gün kaldı (son gün ${tarih(son)})`, bugun: kalan <= 15 }));
      });
      // ikinci dört hak başladı: sınıfın direksiyon saati kadar ders tamamlanmadan sınava yazılmaz; sınava 4 iş günü önce onay (md.15/4)
      sb(S.kursiyerler).filter(k => !k.kapali && k.ikinciHak && !(k.dsinav && k.dsinav.sonuc === 'Geçti')).forEach(k => {
        const gd = gerekliDireksiyon(k), s = sbSinav(S.sinavlar).find(x => x.tur === 'Direksiyon' && fark(x.tarih) >= 0 && x.kursiyerler.includes(k.id) && !(x.sonuc || {})[k.id]);
        if (s && k.direksiyon < gd) l.push(bul('uyari', `${tamAd(k)} · ikinci dört hak dersleri bitmeden sınava yazıldı`, `${k.direksiyon}/${gd} ders. İkinci dört hak için sınıfın direksiyon saati kadar ders yeniden alınır; dersler bitmeden ${tarih(s.tarih)} sınavına giremez (MTSK Yön. md.15/4).`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `İkinci dört hak dersleri ${k.direksiyon}/${gd}; ${tarih(s.tarih)} sınavından önce bitmeli` }));
      });
    } },
  // e-Sınav Kılavuzu 2026: yabancı dil tercihi ve "İşitme ve Konuşma Engelli" durumu randevu saatinden en az 48 saat önce Özel MTSK Modülü'ne işlenir
  { id: 'Y03', sira: 220, ad: 'e-Sınavda yabancı dil ve işaret dili için 48 saat', dayanak: 'MTSK e-Sınav Kılavuzu 2026 (yabancı dil ve işitme engelli maddeleri)', kapsam: 'kursiyer', ciddiyet: 'uyari', bugun: true, bugunAd: n => `${n} öğrencinin e-sınav dili ya da işaret dili kaydı bekliyor (48 saat)`,
    kontrol(l) {
      sbSinav(S.sinavlar).filter(s => s.tur === 'e-Sınav' && fark(s.tarih) >= 0).forEach(s => {
        const saat = (new Date(s.tarih + 'T' + (/^\d{2}:\d{2}/.test(s.saat || '') ? s.saat.slice(0, 5) : '00:00') + ':00') - simdi()) / 36e5; if (saat < 0) return;
        (s.kursiyerler || []).map(kursiyer).filter(k => k && !k.kapali).forEach(k => {
          const t = k.esinavTercih || {}, ne = [t.dil && t.dil !== 'Türkçe' ? t.dil + ' dil seçeneği' : '', t.isitme ? '“İşitme ve Konuşma Engelli” durumu' : ''].filter(Boolean).join(' ve ');
          const son = new Date(new Date(s.tarih + 'T' + (s.saat || '00:00').slice(0, 5) + ':00').getTime() - 48 * 36e5), sonM = `${tarih(iso(son))} ${String(son.getHours()).padStart(2, '0')}:${String(son.getMinutes()).padStart(2, '0')}`;
          if (ne && !t.islendi) {
            if (saat <= 48) l.push(bul('uyari', `${tamAd(k)} · e-sınav ${ne} için süre geçti`, `${ne} randevu saatinden en az 48 saat önce Özel MTSK Modülü’ne işlenir (e-Sınav Kılavuzu 2026). Süre ${sonM} itibarıyla geçti: ${t.dil && t.dil !== 'Türkçe' ? 'sorular Türkçe gelir' : ''}${t.dil && t.dil !== 'Türkçe' && t.isitme ? ', ' : ''}${t.isitme ? 'işaret dili videosu çıkmaz' : ''}. Randevu en geç 24 saat önce il/ilçe MEM’den değiştirilebilir.`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `e-Sınav (${tarih(s.tarih)}${s.saat ? ' ' + s.saat : ''}): ${ne} için 48 saat geçti`, eylem: 'esinav-tercih' }));
            else if (saat <= 120) l.push(bul('uyari', `${tamAd(k)} · e-sınav ${ne} MEBBİS’e işlenmedi`, `${ne} randevu saatinden en az 48 saat önce, yani en geç ${sonM}’e kadar Özel MTSK Modülü’ne işlenmeli (e-Sınav Kılavuzu 2026); işlenmezse ${t.dil && t.dil !== 'Türkçe' ? 'sorular Türkçe gelir' : 'işaret dili videosu çıkmaz'}. İşlediyseniz öğrenci dosyasından işaretleyin.`, '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `e-Sınav (${tarih(s.tarih)}): ${ne} en geç ${sonM}’e kadar MEBBİS’e işlenmeli`, eylem: 'esinav-tercih' }));
          } else if (!k.esinavTercih && saat > 48 && saat <= 168) {
            // tercih hiç sorulmadıysa yalnız öğrenci dosyasında hatırlatılır (MEB listesine girmez)
            l.push(bul('bilgi', `${tamAd(k)} · e-sınav dili belirtilmedi`, '', '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `e-Sınav ${tarih(s.tarih)}: yabancı dil ya da işaret dili gerekiyor mu? (en geç ${sonM}’e kadar MEBBİS’e işlenir)`, eylem: 'esinav-tercih', yalnizDosya: true }));
          }
        });
      });
      // yabancı dilde e-sınav: teorik eğitim valilik izniyle görevlendirilen tercümanla alınır; tercüman kaydı yoksa yalnız öğrenci dosyasında hatırlatılır (madde 13)
      sb(S.kursiyerler).filter(k => !k.kapali && !(k.esinav && k.esinav.sonuc === 'Geçti') && k.esinavTercih && k.esinavTercih.dil && k.esinavTercih.dil !== 'Türkçe' && !(k.esinavTercih.tercuman && k.esinavTercih.tercuman.ad)).forEach(k =>
        l.push(bul('bilgi', `${tamAd(k)} · e-sınav tercümanı kayıtlı değil`, '', '#/kursiyer/' + k.id, { kursiyer: k.id, kisa: `${k.esinavTercih.dil} e-sınav: teorik derslerdeki tercümanı kaydedin (valilik izniyle görevlendirilir)`, eylem: 'esinav-tercih', yalnizDosya: true })));
    } },
  // 43/5: sınav ücretleri sınavdan 6 iş günü önce döner sermaye hesabına yatırılır; liste ve makbuz il/ilçe MEM'e verilir.
  // mdSinyal'de döner sermaye ödemesi tutulmuyor: kursiyerin sınav ücreti kalemi ödenmediyse uyarı, yoksa yalnız hatırlatma.
  // Sınav ücreti kursiyerin ek kalemidir: k.odeme.ekler[{ sinav: oturum id, odendi }] (sayfalar2.js sinavUcreti, oturuma yazılınca eklenir).
  // kursiyerler: ücreti ödenmemiş kursiyerlerin kimlikleri (ödeyen ve ücret kalemi olmayan listede yok; hatırlatmada boş). MEBBİS onay ekranı bununla eşler.
  // Kural kesinleşti (madde 12: 6 iş günü, kurs ücretinden ayrı, tutar yıllık tarife); yalnız arife ve idari izin günlerinin iş günü sayılıp sayılmadığı teyit bekliyor (madde 11).
  // dosya: ücreti ödenmemiş her kursiyere öğrenci dosyasında ayrıca geri sayım (yalnizDosya; kursiyerBulgulari)
  { id: 'Y04', sira: 230, ad: 'Sınav ücreti 6 iş günü önce yatırılır', dayanak: 'MTSK Yön. md.43/5', kapsam: 'sinav', dosya: true, ciddiyet: 'uyari', ayar: 'sinavUcretIsGunu', teyit: 'Arife ve idari izin günlerinin iş günü sayılıp sayılmadığı; şimdilik sayılmıyor, son gün erkene çekiliyor.', bugun: true, bugunAd: n => `${n} uygulama sınavının ücret makbuzu bekliyor (6 iş günü, md.43/5)`,
    kontrol(l, K) {
      const N = +K.sinavUcretIsGunu || 6;
      sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && (s.kursiyerler || []).length && !s.ucretMem).forEach(s => {
        const kalan = mebIsGunuSay(gun(0), s.tarih), son = mebIsGunuGeri(s.tarih, N); if (kalan > N + 2) return;  // kalan: sınava iş günü (yalnız gösterme eşiği)
        const ks = s.kursiyerler.map(kursiyer).filter(Boolean), odenmedi = ks.filter(k => ((k.odeme || {}).ekler || []).some(x => x.sinav === s.id && !x.odendi));
        const gecti = fark(son) < 0, sure = gecti ? `son gün ${tarih(son)} geçti` : fark(son) === 0 ? 'son gün bugün' : `son gün ${tarih(son)}`;
        const metin = `Sınav ücretleri sınav tarihinden ${N} iş günü önce döner sermaye hesabına yatırılır; liste ve makbuz il/ilçe MEM’e verilir (MTSK Yön. md.43/5). ${sonGunMetni(son)}`;
        if (odenmedi.length) l.push(bul('uyari', `${tarih(s.tarih)} uygulama sınavı · ${odenmedi.length} kursiyerin sınav ücreti ödenmedi (${sure})`, `${metin} Ödemeyenler: ${odenmedi.slice(0, 4).map(tamAd).join(', ')}${odenmedi.length > 4 ? '…' : ''}.`, '#/sinavlar', { sinav: s.id, kursiyerler: odenmedi.map(k => k.id) }));
        else l.push(bul(gecti ? 'uyari' : 'bilgi', `${tarih(s.tarih)} uygulama sınavı · ücret ve makbuz listesi (${sure})`, `${metin} Yatırılıp makbuz verildiyse Sınavlar ekranında oturumda “Makbuz MEM’e verildi”yi işaretleyin.`, '#/sinavlar', { sinav: s.id, kursiyerler: [] }));
        // öğrenci dosyası: ücreti ödenmemiş kursiyere geri sayım
        odenmedi.forEach(k => l.push(bul('uyari', `${tamAd(k)} · uygulama sınavı ücreti ödenmedi`, metin, '#/kursiyer/' + k.id, { kursiyer: k.id, yalnizDosya: true, eylem: 'odeme', kisa: `Uygulama sınavı (${tarih(s.tarih)}) ücreti ödenmedi: ${gecti ? `son gün ${tarih(son)} geçti` : fark(son) === 0 ? 'son gün bugün' : `son gün ${tarih(son)}, ${mebIsGunuSay(gun(0), son)} iş günü kaldı`}. Ücret sınavdan ${N} iş günü önce döner sermayeye yatırılır.` })));
      });
    } },
  // 16/4: kurslarda günde 2 saatten az, 6 saatten fazla teorik ders yapılamaz (grup ve gün başına toplam)
  { id: 'Y05', sira: 240, ad: 'Teorik ders günde 2–6 saat', dayanak: 'MTSK Yön. md.16/4', kapsam: 'grup', ciddiyet: 'uyari', bugun: true, bugunAd: n => `${n} günde teorik ders 2–6 saat dışında (md.16/4)`,
    kontrol(l) { teorikGunleri().filter(x => x.saat < 2 || x.saat > 6).forEach(x => l.push(bul('uyari', `${grupAdi(x.grup)} · ${tarih(x.tarih)} günü ${x.saat} saat teorik ders`, `Kurslarda günde 2 saatten az, 6 saatten fazla teorik ders yapılamaz (MTSK Yön. md.16/4). ${x.saat > 6 ? 'Dersleri iki güne bölün' : 'O güne en az 2 saat planlayın ya da dersi başka güne taşıyın'}; MEBBİS teorik programı bu haliyle kabul etmeyebilir.`, '#/teorik', { grup: x.grup }))); } },
  // Personel fotoğrafı: MEBBİS RSI01001 “Fotoğrafı Olmayanları Listele”, denetimde fotoğraflı kurum kimlik kartı (md.46/A-7). Personel listesi aşağıdaki personelKisileri.
  // Ayarlar › MEB kuralları › Personel fotoğrafları kartı (sayfalar5.js) ve personelFotoUyarilari aynı listeyi buradan alır (personelKisileri).
  { id: 'P01', sira: 250, ad: 'Personel fotoğrafı', dayanak: 'MEBBİS personel fotoğraf ekranı (RSI01001); MTSK Yön. md.46/A-7', kapsam: 'personel', ciddiyet: 'uyari',
    // PER-016: MEBBİS personel listesinde fotoğraf sütunu okunduysa (eg.meb.fotoVar) ayrım: MEBBİS'te var mdSinyal'de yok / MEBBİS'te de yok
    kontrol(l) { const p = personelKisileri().filter(x => !x.x.foto).map(x => x.x); if (!p.length) return;
      const ad = q => q.slice(0, 5).map(x => x.ad).join(', ') + (q.length > 5 ? ` ve ${q.length - 5} kişi daha` : '');
      const mebVar = p.filter(x => x.meb && x.meb.fotoVar === true), mebYok = p.filter(x => x.meb && x.meb.fotoVar === false), bilinmez = p.filter(x => !x.meb || x.meb.fotoVar == null);
      const parca = [mebYok.length ? `MEBBİS’te de yok (RSI01001 “Fotoğrafı Olmayanlar” listesine düşer): ${ad(mebYok)}.` : '', mebVar.length ? `MEBBİS’te fotoğrafı var, mdSinyal’de yok (kimlik kartı için ekleyin): ${ad(mebVar)}.` : '', bilinmez.length ? `${mebYok.length || mebVar.length ? 'MEBBİS durumu bilinmeyen' : ''}${mebYok.length || mebVar.length ? ': ' : ''}${ad(bilinmez)}.${mebYok.length || mebVar.length ? '' : ' Fotoğrafı olmayan personel MEBBİS’in fotoğraf ekranında eksik listesine düşer.'}` : ''].filter(Boolean).join(' ');
      l.push(bul('uyari', `${p.length} personelin fotoğrafı yok${mebYok.length ? ` (${mebYok.length} kişi MEBBİS’te de yok)` : ''}`, `${parca} Denetimde fotoğraflı kurum kimlik kartı aranır. Ders ve kayıt engellenmez.`, '#/ayarlar/kurallar', { personel: p.map(x => x.id) })); } },
  // PER-004: sınav günü öğretmenin (adayı sınava götüren usta: son dersindeki aracın öğretmeni, yoksa kendi öğretmeni) çalışma izni ve izin günü.
  // İzin sınavdan önce bitmişse aday bu öğretmenle sınava giremez (MEBBİS izni bitmiş personeli listelemez; aday alınmaz, hak yanabilir) → engel.
  // Sınav günü biterse ya da sınavdan sonraki 15 gün içinde bitiyorsa, ya da öğretmen o gün izinliyse → uyarı (bitiş günü sınavı il MEM'e soruldu, SOR-037).
  { id: 'Y07', sira: 245, ad: 'Sınav günü öğretmenin çalışma izni ve izin günü', dayanak: 'MTSK Yön. md.28/A; usta öğretici çalışma izni (OOK)', kapsam: 'sinav', ciddiyet: 'engel', bugun: true, bugunAd: n => `${n} sınavda öğretmenin izni sorunlu`,
    kontrol(l) {
      (S.sinavlar || []).filter(s => s && s.tur === 'Direksiyon' && s.tarih && fark(s.tarih) >= 0 && (s.kursiyerler || []).length).forEach(s => {
        const gr = new Map(); (s.kursiyerler || []).forEach(id => { const k = kursiyer(id); if (!k || k.kapali) return; const eg = sinavUstasi(k); if (!eg) return; if (!gr.has(eg)) gr.set(eg, []); gr.get(eg).push(k.id); });
        gr.forEach((ks, eg) => {
          const d = izinDurumu(eg, s.tarih), izin = (S.izinler || []).find(i => i.kim === eg.id && i.bas <= s.tarih && (i.bit || i.bas) >= s.tarih), n = ks.length, bas = `${tarih(s.tarih)} sınavı · ${eg.ad}`;
          if (d.tur === 'bitti') l.push(bul('dur', `${bas}: çalışma izni ${tarih(d.bit)} tarihinde bitiyor; ${n} aday bu öğretmenle sınava giremez`, 'MEBBİS izni bitmiş personeli listelemez; aday sınava alınmaz, hakkı yanabilir. İzin yenilendiyse MEBBİS’ten güncelleyin; yoksa adayları başka öğretmenle sınava yazın.', '#/sinavlar', { sinav: s.id, kursiyerler: ks, usta: eg.ad }));
          else if (d.tur === 'bugun') l.push(bul('uyari', `${bas}: çalışma izni sınav günü bitiyor (${n} aday)`, 'Bitiş günü sınava girilip girilemeyeceği il MEM’e soruldu; yanıt gelene kadar izni uzatın ya da adayları başka öğretmenle yazın.', '#/sinavlar', { sinav: s.id, kursiyerler: ks, usta: eg.ad }));
          else if (d.kalan != null && d.kalan <= 15) l.push(bul('uyari', `${bas}: çalışma izni sınavdan ${d.kalan} gün sonra bitiyor (${tarih(d.bit)})`, 'İzin süresi dolmadan uzatılmazsa sonraki sınav ve dersler MEBBİS’e yazılamaz.', '#/filo/egitmen', { sinav: s.id, kursiyerler: ks, usta: eg.ad }));
          if (izin) l.push(bul('uyari', `${bas}: öğretmen o gün izinli (${izin.tur})`, `${n} adayı sınava başka öğretmen götürmeli ya da izin değişmeli.`, '#/filo/izin', { sinav: s.id, kursiyerler: ks, usta: eg.ad }));
        });
      });
    } },
  // PER-019, PER-021: personel evrakı bitişi (kişi kartındaki evraklar; usta öğreticinin sertifika/sağlık/adli tarihleri M13'te) ve teslim günü geçmiş zimmet
  { id: 'P04', sira: 258, ad: 'Personel evrakı ve zimmet', dayanak: 'Kurum içi takip (MTSK Yön. md.46: personel dosyası)', kapsam: 'personel', ciddiyet: 'uyari', bugun: true, bugunAd: n => `${n} personel evrakı ya da zimmeti takipte`,
    kontrol(l) {
      const kisiler = [...(S.egitmenler || []), ...(S.ogretmenler || []), ...(S.personel || [])].filter(x => x && !x.pasif && !x.ayrildi);
      kisiler.forEach(x => {
        (x.evraklar || []).filter(v => v.bitis && fark(v.bitis) <= 30).forEach(v => { const g = fark(v.bitis), ad = ({ saglik: 'Sağlık raporu', adli: 'Adli sicil kaydı', sertifika: 'Usta öğretici sertifikası', ogrenim: 'Öğrenim belgesi', ehliyet: 'Sürücü belgesi', sozlesme: 'İş sözleşmesi', sgk: 'SGK bildirgesi', kimlik: 'Nüfus cüzdanı sureti', ikamet: 'Yerleşim yeri belgesi', askerlik: 'Askerlik belgesi', ilkyardim: 'İlk yardım sertifikası' }[v.tur] || 'Evrak');
          l.push(bul('uyari', `${x.ad} · ${ad} ${g < 0 ? tarih(v.bitis) + ' tarihinde bitti' : g === 0 ? 'bugün bitiyor' : g + ' gün sonra bitiyor'}`, 'Yenisini alıp personel kartına ekleyin (Ekip ve araçlar › Personel ve maaş › kişi › Evraklar).', '#/filo/personel', { personel: [x.id] })); });
        (x.zimmet || []).filter(z => !z.iade && z.teslim && fark(z.teslim) < 0).forEach(z => l.push(bul('uyari', `${x.ad} · ${z.tur} zimmeti teslim günü geçti (${tarih(z.teslim)})`, `${z.ne} ${tarih(z.verildi)} tarihinde verildi. İade alındıysa personel kartında “İade alındı” deyin.`, '#/filo/personel', { personel: [x.id] })));
      });
    } },
  // PER-003: çalışma izni bitişi (MEBBİS OOK12001'den; kartta elle de girilir). Bitti ya da bugün → engel; 30 gün ve daha az → uyarı (uzatma sözleşmesi
  // bitişten en geç 30 gün önce MEM'e verilir, ÖÖKY 27/1; süresi dolan personel MEBBİS'te her gün kendiliğinden pasife çekilir, ders/randevu listesinden düşer).
  // Ders ve sınav randevusu MEBBİS'e yazılırken (mebtoplu kuralDenetimi) ve ders planlanırken (dersKontrol) aynı izinDurumu o günün tarihiyle bakılır.
  { id: 'P02', sira: 255, ad: 'Usta öğretici çalışma izni (bitiyor)', dayanak: 'ÖÖKY md.27/1; MEBBİS OOK çalışma izni', kapsam: 'personel', ciddiyet: 'engel', bugun: true, bugunAd: n => `${n} öğretmenin çalışma izni bitti ya da bitiyor`,
    kontrol(l) { personelKisileri().forEach(({ x, gorev }) => { const d = izinDurumu(x); if (d.tur === 'yok' || d.tur === 'ok') return;
      const ileri = sbDers(S.dersler).filter(y => y.egitmen === x.id && y.durum === 'Planlandı' && y.tarih > d.bit).length;
      const dersNot = ileri ? ` İzin bitişinden sonraya ${ileri} planlı dersi var; izin yenilenmezse bu dersler MEBBİS’e yazılmaz.` : '';
      if (d.tur === 'bitti' || d.tur === 'bugun') l.push(bul('dur', `${x.ad} · çalışma izni ${d.tur === 'bugun' ? 'bugün bitiyor' : tarih(d.bit) + ' tarihinde bitti'}`, `${gorev}; yenilenmeden ders ve sınav randevusu MEBBİS’e girilemez (MEBBİS süresi dolan personeli kendiliğinden pasife çeker).${dersNot} İzin yenilendiyse MEB işlemleri’nden “MEBBİS’ten güncelle” ile yeni bitişi alın.`, '#/filo/egitmen', { personel: [x.id], usta: x.ad }));
      else l.push(bul('uyari', `${x.ad} · çalışma izni ${d.kalan} gün sonra bitiyor (${tarih(d.bit)})`, `Uzatma için yeni sözleşme bitişten en geç 30 gün önce il/ilçe MEM’e verilir (ÖÖKY md.27/1); toplu onay süre dolmadan istenmeli.${dersNot}`, '#/filo/egitmen', { personel: [x.id], usta: x.ad })); }); } },
];

/* ---------- yeni kuralların veri yardımcıları ---------- */
// Adayı uygulama sınavına götüren öğretmen: son dersindeki aracın öğretmeni, yoksa kursiyerin öğretmeni (mebtoplu sinavAraci ile aynı ölçü)
export const sinavUstasi = k => { const d = k && S.dersler.filter(y => y.kursiyer === k.id && y.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0], ar = d && (S.araclar || []).find(a => a.id === d.arac); return egitmen(ar && ar.egitmen) || egitmen(k && k.egitmen) || null; };
// Görevdeki personel (usta öğretici + teorik öğretmen; pasif ve ayrılanlar hariç): [{ x, tur: 'usta'|'ogretmen', gorev }]
export const personelKisileri = () => [...(S.egitmenler || []).map(x => ({ x, tur: 'usta', gorev: 'Usta öğretici' })), ...(S.ogretmenler || []).map(x => ({ x, tur: 'ogretmen', gorev: 'Teorik öğretmen' }))].filter(p => p.x && !p.x.pasif && !p.x.ayrildi);
// Hazır onayı: MEBBİS'ten çekilen "Uygulama Sınavına Uygunluk Tarihi", yoksa usta öğretici yazısının MEBBİS'e yüklendiği gün
export const hazirOnayi = k => (k.meb && /^\d{4}-\d{2}-\d{2}$/.test(k.meb.uygunluk || '') && k.meb.uygunluk) || (k.hazirYazi && k.hazirYazi.yuklendi) || null;
// Sınav kodları: MEBBİS ilçe takvimi (S.mebIlceSinavlari [{kod, tarih}]) varsa o; yoksa kursun uygulama sınavı oturumları (gün başına bir kod)
export function ilceTakvimi() {
  const il = (S.mebIlceSinavlari || []).filter(x => x && /^\d{4}-\d{2}-\d{2}/.test(x.tarih || ''));
  const kursOt = (S.sinavlar || []).filter(s => s && s.tur === 'Direksiyon' && s.tarih && (!(s.kursiyerler || []).length || sbSinav([s]).length));
  if (il.length) { const kodlar = new Map(); il.forEach(x => { const kod = x.kod || x.tarih, t = x.tarih.slice(0, 10), o = kodlar.get(kod) || { kod, tarih: t, gunler: [] }; if (t < o.tarih) o.tarih = t; o.gunler.push(t); kodlar.set(kod, o); });
    const l = [...kodlar.values()].sort((a, b) => a.tarih.localeCompare(b.tarih)); l.forEach(x => { x.kursiyerler = kursOt.filter(s => x.gunler.includes(s.tarih)).flatMap(s => s.kursiyerler || []); delete x.gunler; }); return l; }
  const gunler = new Map(); kursOt.forEach(s => { const g = gunler.get(s.tarih) || { kod: s.tarih, tarih: s.tarih, kursiyerler: [] }; g.kursiyerler.push(...(s.kursiyerler || [])); gunler.set(s.tarih, g); });
  return Object.assign([...gunler.values()].sort((a, b) => a.tarih.localeCompare(b.tarih)), { kurs: true });
}
// Süre son uygulama sınavının tarihinden sayılır (sonuç aynı gün açıklanır varsayımı); eski kayıtta hakBitti.tarih yoksa k.dsinav.tarih, o da yoksa null
export const ikinciHakSonGun = k => { const t = String((k.hakBitti && k.hakBitti.tarih) || (k.dsinav && k.dsinav.tarih) || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? gunEkle(t, IKINCI_HAK_GUN) : null; };
// Teorik derslerin grup ve gün toplamı (bugün ve sonrası)
export function teorikGunleri(bas = gun(0)) {
  const m = new Map(); (S.teorik || []).filter(t => t && t.tarih >= bas).forEach(t => { const a = (t.grup || '') + '|' + t.tarih, x = m.get(a) || { grup: t.grup || '', tarih: t.tarih, saat: 0 }; x.saat += +t.sure || 1; m.set(a, x); });
  return [...m.values()].sort((a, b) => a.tarih.localeCompare(b.tarih));
}
// Teorik plan denetimi (gruplar.js teorik ders penceresi için): o gün grubun mevcut saati + eklenecek saat
export function teorikKontrol(grup, t, ekSaat = 0) {
  const var_ = (S.teorik || []).filter(x => x.grup === grup && x.tarih === t).reduce((a, x) => a + (+x.sure || 1), 0), top = var_ + (+ekSaat || 0);
  return { saat: top, mesaj: top > 6 ? `${tarih(t)} günü ${grupAdi(grup)} için ${top} saat teorik ders olur; günde en fazla 6 saat (MTSK Yön. md.16/4).` : top && top < 2 ? `${tarih(t)} günü ${top} saat teorik ders; günde en az 2 saat (MTSK Yön. md.16/4).` : null };
}

/* ---------- günlük direksiyon sınırı (M02, md.16/4) ---------- */
// Kurs ayarı gunlukDersSiniri yönetmeliğin 2 saatini aşamaz; geçersiz (0, boş, eksi) değerde 2 kullanılır
export const gunlukSinir = () => { const v = Math.floor(+((S.kurs || {}).gunlukDersSiniri)); return v >= 1 ? Math.min(v, 2) : 2; };
// Kursiyerin o günkü dersleri sınırı dolduruyorsa engel metni, yoksa null. DL: sayılacak ders listesi (taslak öneriler dahil olabilir). İptal edilen ders sayılmaz.
// Ders ekleme penceresi, tekrarlı ders kaydı (sayfalar1 dersEkle) ve otomatik dağıtım (dersKontrol üzerinden) aynı denetimi kullanır.
export function gunlukDersSorun(kid, t, DL = S.dersler) {
  const n = DL.filter(x => x.kursiyer === kid && x.tarih === t && x.durum !== 'İptal').length, sinir = gunlukSinir();
  return n >= sinir ? `Kursiyerin ${tarih(t)} günü zaten ${n} saat direksiyon dersi var; günde en fazla ${sinir} saat (MTSK Yön. md.16/4).` : null;
}

/* ---------- direksiyon dersi ekleme denetimi (Direksiyon planı › Ders ekle penceresi) ---------- */
// o: { k, eg, ar (araç ya da null), tur ('trafik'|'alan'|'simulator'), tarih, saat, taslak? }. sorun: dersi engeller; not: uyarı. ek: zorunlu dersler doluyor (ek ders).
// taslak: henüz kaydedilmemiş, aynı seferde eklenecek dersler (otomatik dağıtım önerisi); planlı ders gibi sayılır.
export function dersKontrol(o) {
  const { k, eg, ar, tur, tarih: planGun, saat } = o, sorun = [], not = [], DL = o.taslak && o.taslak.length ? S.dersler.concat(o.taslak.map(x => ({ durum: 'Planlandı', ...x }))) : S.dersler;
  const planli = DL.filter(x => x.kursiyer === k.id && x.durum === 'Planlandı').length;
  // B Engelli kendi aracıyla (md.7/5): kurs aracı gerekmez; araç MEBBİS'te modüle tanımlı olmalı (araçsız ders uyarıyla serbest)
  if (!ar && tur !== 'simulator') { if (k.sinif === 'B-EN' && k.kendiArac) not.push('Kendi aracıyla (md.7/5): araç modüle tanımlı olmalı.'); else sorun.push(`Bu saatte boş ${sinifEtiket(k.sinif, k)} aracı yok.`); }
  // Bütün sınıflar: e-sınavı geçtiği tarihten itibaren direksiyon dersleri 90 günü geçmeyecek şekilde planlanır (MTSK md.15/1-b; ek dersler de bu süreyi aşamaz, md.7/7)
  { const sure = kuralAyar('direksiyonSure'); if (k.esinav && k.esinav.sonuc === 'Geçti' && k.esinav.tarih && !k.esinav.muaf && fark(k.esinav.tarih) <= 0 && (tarihOku(planGun) - tarihOku(k.esinav.tarih)) / 864e5 > sure) not.push(`e-Sınavı ${tarih(k.esinav.tarih)} tarihinde geçti; direksiyon dersleri e-sınavdan sonra ${sure} gün içinde tamamlanacak şekilde planlanır (MTSK md.15/1-b). Bu ders süreyi aşıyor.`); }
  { const gg = geceGerekli(k), gy = DL.filter(x => x.kursiyer === k.id && x.durum !== 'Gelmedi' && x.durum !== 'İptal' && geceDersMi(x)).length, gc = geceDersMi({ tarih: planGun, saat });
    if (gc && geceKisitli(k)) sorun.push(`Sağlık raporunda gece kısıtı var; gece eğitimi verilmez (MTSK md.7/3). O gün gece dersi başlangıcı ${geceBaslangic(planGun)}.`);
    else if (gg && gc) not.push(`Gece dersi sayılır (gün batımından sonra; o gün gece ${geceBaslangic(planGun)}). Gece: ${gy}/${gg} saat.`); }
  // md.23/1: direksiyon programı MEBBİS’e dersten en az N gün önce girilir (M01 ile aynı ölçü: ders tarihi − ekleme günü)
  { const n = kuralAyar('programOnGun'), g = (tarihOku(planGun) - tarihOku(gun(0))) / 864e5; if (g >= 0 && g < n) not.push(`MEBBİS’e en az ${n} gün önce girilmeli; geç girilen program md.23/1’e aykırı.`); }
  if (ar && [ar.muayene, ar.sigorta].some(t => t && t < planGun)) sorun.push(ar.plaka + ' muayene/sigorta süresi dolmuş; bu tarihte ders planlanamaz.');
  // ARC-018, ARC-023: araç öğrencinin sınıfına uygun olmalı (kendi sınıfı ya da kartta işaretli ek sınıf); CE adayına yalnız CE aracı
  if (ar && tur !== 'simulator' && !(k.sinif === 'B-EN' && k.kendiArac) && !aracUygun(ar, k.sinif)) sorun.push(k.sinif === 'CE' ? `CE adayına yalnız CE sınıfı tanımlı araçla ders verilir; ${ar.plaka} ${ar.sinif} aracı.` : `${ar.plaka} ${ar.sinif} aracı; ${sinifEtiket(k.sinif, k)} dersine uygun değil (araç kartında ek sınıf işaretli değil).`);
  // ARC-006: yaş sınırını aşmış araçla ders planlanmaz (yaş planlanan tarihin yılına göre)
  if (ar && aracYasSiniri(ar) && aracYasi(ar, +planGun.slice(0, 4)) > aracYasSiniri(ar)) sorun.push(`${ar.plaka} ${aracYasi(ar, +planGun.slice(0, 4))} yaşında; bu sınıfta eğitim aracı ${aracYasSiniri(ar)} yaşından büyük olamaz (MTSK md.17/2-d).`);
  // ARC-002: MEBBİS'te 'Muayene Tarihi Doldu' ya da 'Hizmet Dışı' görünen araçla ders planlanmaz
  if (ar && /muayene\s*tarihi\s*doldu|hizmet\s*d[ıi]ş/i.test(ar.mebDurum || '')) sorun.push(`${ar.plaka} MEBBİS’te “${ar.mebDurum}” görünüyor; bu araçla ders planlanamaz.`);
  // PER-012: MEBBİS'te öğretmenin derse gireceği programlarında bu sınıfın uygulaması yoksa MEBBİS ders formunda öğretmen çıkmaz
  if (tur !== 'simulator' && !ustaYetkili(eg, k.sinif)) sorun.push(`${eg.ad} MEBBİS’te ${sinifEtiket(k.sinif, k)} uygulama dersine yetkili görünmüyor (derse gireceği programlar: ${eg.mebYetki.uygulama.join(', ')}). Yetki MEM onayıyla eklenir; eklendiyse MEBBİS’ten güncelleyin.`);
  // PER-003/028: öğretmenin çalışma izni ders gününden önce bittiyse planlanmaz (MEBBİS bu tarihte personeli listelemez)
  { const iz = izinDurumu(eg, planGun); if (iz.tur === 'bitti') sorun.push(`${eg.ad}: çalışma izninin bitişi ${tarih(iz.bit)}; ${tarih(planGun)} dersine atanamaz. İzin yenilendiyse MEBBİS’ten güncelleyin.`); else if (iz.tur === 'bugun') not.push(`${eg.ad}: çalışma izni bu ders günü bitiyor.`); }
  Object.entries(eg.belgeler || {}).filter(([, t]) => t < planGun).forEach(([b]) => sorun.push(eg.ad + ' · ' + ({ sertifika: 'usta öğretici sertifikası', saglik: 'sağlık raporu', adli: 'adli sicil kaydı' }[b]) + ' süresi dolmuş; bu tarihte ders planlanamaz.'));
  const ayni = DL.filter(x => x.kursiyer === k.id && x.tarih === planGun && x.durum !== 'İptal'), cak = ayni.find(x => x.saat === saat);  // iptal edilen ders saati boş sayılır (otomatik dağıtımla aynı)
  if (cak) sorun.push(`Bu kursiyerin aynı saatte ${(egitmen(cak.egitmen) || { ad: 'başka bir usta öğretici' }).ad} ile dersi var.`);
  { const egDolu = DL.find(x => x.egitmen === eg.id && x.tarih === planGun && x.saat === saat && x.durum !== 'İptal'); if (egDolu) sorun.push(`${eg.ad} bu saatte ${tamAd(kursiyer(egDolu.kursiyer) || { ad: 'başka bir öğrenci', soyad: '' })} ile derste.`); }
  // PER-011: haftalık ders sınırı (elle / MEBBİS KDS / müdür 20 / 40; ÖÖKY 26/5-6): bu dersle aşılıyorsa planlanmaz
  { const hs = haftalikSinir(eg), n = haftaDers(eg.id, planGun, DL); if (n + 1 > hs.n) sorun.push(`${eg.ad} o hafta ${n} ders saati veriyor; haftalık sınır ${hs.n} (${hs.kaynak === 'elle' ? 'kartta yazılı' : hs.kaynak === 'varsayılan' ? 'ÖÖKY md.26/5' : hs.kaynak === 'müdür' ? 'müdür, ÖÖKY md.26/6' : 'MEBBİS ' + hs.kaynak}). Başka öğretmene ya da başka haftaya alın.`); }
  const ustaGun = DL.filter(x => x.egitmen === eg.id && x.tarih === planGun).length, ustaSinir = S.kurs.egitmenGunlukSinir || S.kurs.ustaGunlukSinir || 8;
  if (ustaGun >= ustaSinir) not.push(`${eg.ad} o gün ${ustaGun} ders veriyor; usta başına günlük sınır ${ustaSinir} ders. Yorgunluk denetimde sorulabilir.`);
  { const g = cak ? null : gunlukDersSorun(k.id, planGun, DL); if (g) sorun.push(g); }
  const gec = gecikenler(k).reduce((a, t) => a + t.tutar - (t.kismi || 0), 0);
  if (gec) (S.kurs.borcluDers === 'engelle' ? sorun : not).push(`Taksiti gecikmiş: ${tl(gec)}.${S.kurs.borcluDers === 'engelle' ? ' Kurs ayarı: borcu gecikene ders planlanmaz.' : ' Dersten önce tahsil etmeyi unutmayın.'}`);
  const ek = k.direksiyon + planli >= gerekliDireksiyon(k);
  if (ek) not.push(`Zorunlu ${gerekliDireksiyon(k)} ders ${k.direksiyon >= gerekliDireksiyon(k) ? 'tamamlandı' : 'planla doluyor'}; bu ders ek ders sayılır.`);
  return { sorun, not, ek };
}

/* ---------- motor ---------- */
// Başka modüllerin kural grubu (ör. mevzuat.js mevzuatKurallari) motora buradan eklenir
export function kuralEkle(r) { const i = KURALLAR.findIndex(x => x.id === r.id); if (i >= 0) KURALLAR[i] = r; else KURALLAR.push(r); KURALLAR.sort((a, b) => (a.sira ?? 500) - (b.sira ?? 500)); }
// Kural tanımları (ekranda liste için; kontrol işlevi olmadan)
export const kurallar = () => KURALLAR.map(({ kontrol, bugunAd, ...r }) => ({ ...r, tur: CIDDIYET_TUR[r.ciddiyet] || 'uyari' }));
// Kuralları çalıştırır; bir kural hata verirse diğerleri sürer (hata konsola yazılır)
export function calistir(secim = () => true) {
  // K: kurs ayarları; sayı ayarları geçerli aralıkta okunur (veri.js kuralAyar): eskiden kaydedilmiş 0 ya da eksi değer kuralı sessizce kapatmaz
  const K = { ...S.kurs }, l = [], c = {}; Object.keys(KURAL_ARALIK).forEach(a => { K[a] = kuralAyar(a); });
  Object.defineProperty(c, 'yakin', { get() { return this._y || (this._y = sbDers(S.dersler).filter(d => d.durum === 'Planlandı' && fark(d.tarih) >= 0)); } });
  KURALLAR.filter(secim).forEach(r => { const b = []; try { r.kontrol(b, K, c); } catch (x) { console.error('Kural ' + r.id, x); } b.forEach(x => { if (!x.kural) x.kural = r.id; if (!x.dayanak) x.dayanak = r.dayanak; if (x.bugun === undefined && r.bugun) x.bugun = true; l.push(x); }); });
  return l;
}
// MEB işlemleri › Kurallar ve takvim: bütün bulgular (yalnız öğrenci dosyasına ait hatırlatmalar hariç)
export const tumu = () => calistir().filter(x => !x.yalnizDosya);
// Genel bakış › Bugün yapılacaklar: Bugün'e işaretli kuralların bulguları, kural başına tek satır: [tur, baslik, aciklama, link, eylem]
export function bugunListesi() {
  const l = calistir(r => r.bugun).filter(x => x.bugun && !x.yalnizDosya), gr = new Map();
  l.forEach(x => { if (!gr.has(x.kural)) gr.set(x.kural, []); gr.get(x.kural).push(x); });
  const agir = t => ({ dur: 0, yasak: 1, uyari: 2, bilgi: 3 }[t] ?? 4);
  return [...gr.entries()].map(([id, b]) => {
    if (b.length === 1) return [b[0][0], b[0][1], b[0][2], b[0][3], 'Gör'];
    const r = KURALLAR.find(x => x.id === id) || { ad: id }, tur = b.map(x => x[0]).sort((a, c) => agir(a) - agir(c))[0];
    return [tur, r.bugunAd ? r.bugunAd(b.length) : `${r.ad}: ${b.length} uyarı`, b.slice(0, 3).map(x => x[1]).join(' · ') + (b.length > 3 ? ' …' : ''), '#/meb/kontrol', 'Gör'];
  });
}
// Öğrenci dosyası: bu kursiyere ait bulgular (yalnız Bugün'e açık, yani yeni kurallar; eski kurallar dosyada ayrıca gösteriliyor)
// dosya: kapsamı kursiyer olmayan ama kişiye özel satır da üreten kurallar (ör. Y04 sınav ücreti)
export const kursiyerBulgulari = k => calistir(r => r.bugun && (r.kapsam === 'kursiyer' || r.dosya)).filter(x => x.kursiyer === k.id);
// MEBBİS'e yazmayı durduracak engel var mı (ileride mebtoplu kullanır): verilen kursiyer için engel seviyesindeki bulgular
export const mebEngel = kid => calistir(r => r.ciddiyet === 'engel').filter(x => ['dur', 'yasak'].includes(x[0]) && (x.kursiyer === kid || String(x[3]).endsWith('/' + kid)));
