// MEBBİS aktarım merkezi: MEBBİS'e gidecek işler türlerine göre sekmelerde, filtrelenir, seçilir, toplu aktarılır.
// Aktarımı MEBBİS Yardımcısı (Chrome eklentisi) kursun kendi MEBBİS oturumunda yürütür; MEBBİS'ten veri çekme de buradan başlar.
import { S, oturum, fark, SINIFLAR, egitmen, sb, seciliSube, cokSube, kursiyer, tamAd, islem, kaydet, esinavUcreti } from './veri.js?v=234';
import { e, tarih, rozet, isaret, ik, sekmeler, bos } from './ui.js?v=234';
import * as EK from './eklenti.js?v=234';
import * as MT from './mebtoplu.js?v=234';
import * as MK from './mebkayit.js?v=234';
import * as UY from './mebuyum.js?v=234';
import * as GR from './gruplar.js?v=234';
import * as MX from './mebekran.js?v=234';   // MEB-187: üst şerit, açık pencereler, aday × adım matrisi
import { pencere, kapatPencere, bildir, tl, waAc } from './ui.js?v=234';

const TURLER = [['kayit', 'Kayıt'], ['evrak', 'Evrak'], ['grup', 'Dönem grubu'], ['onay', 'Kurum onayı'], ['teorik', 'Teorik program'], ['program', 'Direksiyon programı'], ['esinav', 'e-Sınav başvurusu'], ['sinav', 'Sınav randevusu'], ['fatura', 'Fatura'], ['al', 'MEBBİS’ten al']];
const butunIsler = hepsi => [...EK.mebIsleri(hepsi), ...MT.ekIsler(hepsi)];
const CEK = [
  ['grup', 'Dönem grupları', 'MEBBİS’teki dönem, grup ve şubeler (ör. Kasım 1A) mdSinyal’e grup kartı olarak gelir. İlk kurulumda önce bunu çekin.'],
  ['sinav', 'Sınav sonuçları', 'e-Sınav ve direksiyon sonuçları mdSinyal’in sonuç penceresine dolar; siz kaydedersiniz.'],
  ['mutabakat', 'MEBBİS ile karşılaştır', 'MEBBİS’teki kursiyer listesi mdSinyal’le karşılaştırılır, farklar gösterilir.'],
  ['kursiyer', 'Kursiyer listesi', 'İlk geçiş için: açık listeyi Veri aktarımı ekranına getirir, sütunları kontrol edip siz aktarırsınız. “MEBBİS’ten güncelle” kursiyer aktarmaz, yalnız karşılaştırır.'],   // MEB-074
  ['ogretmen', 'Usta öğreticiler', 'Personel listesini alır.'],
  ['arac', 'Araçlar', 'Araç listesini plakalarıyla alır.'],
];
const m = { tur: 'kayit', ara: '', durum: 'bekleyen', tarih: '', sinif: '', egitmen: '', secili: new Set(), gorunum: 'liste', donem: '' };

const sonEtiket = t => { if (!t) return ['—', '']; const k = fark(t); return k < 0 ? ['Süresi geçti', 'kirmizi'] : k === 0 ? ['Bugün son gün', 'kirmizi'] : k <= 3 ? [k + ' gün kaldı', 'uyari'] : [tarih(t), 'notr']; };
// [etiket, renk, not, iz] · iz: aktarılan işte kim, ne zaman, nasıl doğrulandı (S.mebDurum başarıda da kalır)
function durumu(x) {
  const d = (S.mebDurum || {})[x.id];
  if (x.bitti) {
    if (d && d.durum === 'tamam' && d.dogrulama === 'mesaj') return ['Kontrol edin', 'uyari', 'Yardımcı yalnız MEBBİS’in mesajını gördü; kaydı MEBBİS listesinde kontrol edin', MK.izMetni(d)];
    return ['MEBBİS’te', 'yesil', '', MK.izMetni(d)];
  }
  // MEB-187: Yardımcı şu an bu kaydı yazıyorsa satırda canlı görünür (Wenntech şeffaflığı)
  { const sr = MT.suruyor() && ((MT.durum.son || {}).sonuc || {}).suruyor; if (sr && (sr === x.id || (x.tur === 'sinav' && String(sr).startsWith('randevu-' + ((x.ref || {}).sinav || '') + '|')))) return ['İşleniyor', 'mavi', 'Yardımcı şu an MEBBİS’e yazıyor', '']; }
  if (d && d.durum === 'hata' && d.hataTur === 'ekran') return ['Ekran değişti', 'kirmizi', 'MEBBİS ekranı değiştiği için gönderilmedi; “Elle gir” ile girin', ''];
  if (d && d.durum === 'hata') return ['Hata', 'kirmizi', MK.maskele(d.not || ''), ''];
  // Gönderilen iş, Yardımcı "bitti" ya da "hata" diyene kadar (en çok 7 gün) Gönderildi kalır; kendiliğinden Bekliyor'a dönüp iki kez girilmesin
  if (d && d.durum === 'gonderildi' && Date.now() - d.zaman < 7 * 864e5) return ['Gönderildi', 'mavi', 'Yardımcı sonucu bildirmedi; MEBBİS’te kontrol edip gerekirse yeniden gönderin'];
  return ['Bekliyor', 'notr', ''];
}
function suzulmus(hepsi) {
  const a = m.ara.toLocaleLowerCase('tr').trim();
  return hepsi.filter(x => x.tur === m.tur)
    .filter(x => { const d = durumu(x)[0]; return m.durum === 'hepsi' ? true : m.durum === 'aktarildi' ? x.bitti : m.durum === 'hata' ? ['Hata', 'Ekran değişti'].includes(d) : !x.bitti; })
    .filter(x => !m.tarih || (x.meta && x.meta.tarih && (m.tarih === 'bugun' ? fark(x.meta.tarih) === 0 : Math.abs(fark(x.meta.tarih)) <= (m.tarih === 'hafta' ? 7 : 31))))
    .filter(x => !m.sinif || (x.meta && x.meta.sinif === m.sinif))
    .filter(x => !m.egitmen || (x.meta && x.meta.egitmen === m.egitmen))
    .filter(x => !a || (x.baslik + ' ' + (x.meta ? x.meta.detay : '') + ' ' + x.alanlar.map(y => y.deger).join(' ')).toLocaleLowerCase('tr').includes(a))
    .sort((p, q) => (p.bitti - q.bitti) || (p.son || '9999').localeCompare(q.son || '9999') || String(p.meta && p.meta.tarih).localeCompare(String(q.meta && q.meta.tarih)));
}

export function merkezSayisi() { return butunIsler().length; }

// DIR-054: MEBBİS ile uyumsuzluklar — geri okumada (SKT04002, aday dosyası) bulunan farklar; açık olanlar üstte, bilerek bırakılanlar katlanır
let uyKapaliGoster = false;
function uyumsuzKarti() {
  const hepsi = (S.mebUyumsuz || []).filter(x => !x.kursiyer || kursiyer(x.kursiyer)), acik = hepsi.filter(x => !x.kapandi), kapali = hepsi.filter(x => x.kapandi);
  const ok = (S.mebAnaliz || {}).program; if (!hepsi.length && !ok) return '';
  const satir = x => { const m = UY.metin(x); return `<li class="uy-l"><div style="flex:1;min-width:0"><b>${e(m.baslik)}</b> ${m.etiket.map(t => rozet(t, /yok|Yalnız/.test(t) ? 'kirmizi' : 'sari')).join(' ')}
      ${m.gercek ? `<small><span class="uy-et">mdSinyal</span>${e(m.gercek)}</small>` : ''}${m.meb ? `<small><span class="uy-et">MEBBİS</span>${e(m.meb)}</small>` : ''}
      ${x.kapandi ? `<small style="color:var(--metin)">Bilerek bırakıldı (${tarih(x.kapandi.tarih)}${x.kapandi.kim ? ', ' + e(x.kapandi.kim) : ''}): “${e(x.kapandi.not)}”</small>` : `<small style="color:var(--metin)">${e(m.ne)}</small>`}
      <small style="color:var(--soluk)">İlk görüldüğü: ${e(String(x.ilk || '').replace(/^(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1'))}</small></div>
    <span class="uy-d">${x.kursiyer ? `<a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${e(x.kursiyer)}">Dosya</a>` : ''}${x.kapandi ? `<button class="dg dg-hafif dg-kucuk" data-uy-ac="${e(x.anahtar)}">Yeniden aç</button>` : `<button class="dg dg-cizgi dg-kucuk" data-uy-kapat="${e(x.anahtar)}">Bilerek bırak</button>`}</span></li>`; };
  return `<div class="kart" style="margin-bottom:14px${acik.length ? ';border-color:var(--kirmizi)' : ''}"><div class="kart-bas"><h3>MEBBİS ile uyumsuzluklar</h3><small>${acik.length ? acik.length + ' açık' : 'açık uyumsuzluk yok'}${ok ? ` · son okuma ${tarih(ok.okuma)}, ${ok.satir} ders (${tarih(ok.bas)}–${tarih(ok.son)})` : ''}</small></div>
    <p class="ipucu" style="margin:10px 16px 0">${isaret('bilgi', 18)}<span>mdSinyal dersi gerçekte yapıldığı gün ve saatle tutar; Yardımcı MEBBİS’e yalnız bunu yazar. MEBBİS’teki kayıt farklıysa burada görünür. Denetimde eğitimin Modül’e girilen gün ve saatte yapılıp yapılmadığına bakılır (MTSK md.46/A).</span></p>
    ${acik.length ? `<ul class="uy-liste">${acik.slice(0, 60).map(satir).join('')}</ul>${acik.length > 60 ? `<p style="padding:6px 16px;color:var(--soluk);font-size:13px">ve ${acik.length - 60} uyumsuzluk daha</p>` : ''}` : ''}
    ${kapali.length ? `<button type="button" class="uy-ac" data-uy-kapali>${uyKapaliGoster ? '▾' : '▸'} Bilerek bırakılanlar (${kapali.length})</button>${uyKapaliGoster ? `<ul class="uy-liste">${kapali.map(satir).join('')}</ul>` : ''}` : ''}
    <div style="height:8px"></div></div>`;
}
export function merkezSekme() {
  const hepsi = butunIsler(true), sayi = t => hepsi.filter(x => x.tur === t && !x.bitti).length;
  const subeSorun = cokSube() && !seciliSube();
  { const n = GR.mebGrupGoc(); if (n) { islem('Dönem gruplarını MEBBİS’te var saydı', n + ' grup (öğrencisi MEBBİS’e kayıtlı)'); kaydet(); } }   // DENETİM Ö5 göç
  EK.bekleyenleriIsle();   // girişten önce gelen Yardımcı bildirimi (harita-durum) varsa şimdi işlenir; kırmızı kart aşağıda çıkar
  let h = MK.alarmKarti() + MT.isKarti(m.tur === 'al');
  // DENETİM Ö3: 'Yardımcı kurulu değil' ve 'şube seçin' artık bir kez — durum şeridinde (Kur bağlantısıyla) ve sayfanın üstündeki şube uyarısında
  // MEBBİS'e girildikten sonra iptal edilen ya da silinen dersler: MEBBİS'teki programdan elle silinmeli (denetimde program ile fiili ders uyuşsun)
  const silinecek = [...new Map((S.mebSilinecek || []).map(x => [x.id, x])).values()];
  if (silinecek.length) h += `<div class="kart" style="margin-bottom:14px;border-color:var(--sari)"><div class="kart-bas"><h3>MEBBİS’ten silinecek dersler</h3><small>MEBBİS’e girildikten sonra iptal edildi ya da silindi · ${silinecek.length}</small></div><ul class="liste" style="margin-top:6px">${silinecek.map(x => { const kk = kursiyer(x.kursiyer); return `<li><span style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(kk ? tamAd(kk) : 'Silinmiş kursiyer')}</b><small style="display:block;color:var(--soluk)">${tarih(x.tarih)} ${e(x.saat)} · ${e((egitmen(x.egitmen) || {}).ad || '')}</small></span><button class="dg dg-cizgi dg-kucuk" data-meb-sildim="${e(x.id)}">MEBBİS’ten sildim</button></li>`; }).join('')}</ul><p class="og-not" style="margin:0 16px 14px">Taşınan dersler ise “Direksiyon programı” listesine “DEĞİŞTİ” notuyla yeniden düştü; MEBBİS’te eski kaydı düzeltin.</p></div>`;
  h += uyumsuzKarti();   // DIR-054
  // MEB-187: üst şerit (Yardımcı · MEBBİS oturumu · şu an) ve iki ana düğme; ötekiler ⋯ menüsünde. Kurum onayı 'Bekleyenleri yaz'a girmez (ayrı, yalnız müdür)
  { const bekleyen = hepsi.filter(x => !x.bitti && x.tur !== 'onay');
    const ozet = TURLER.filter(([k]) => k !== 'al' && k !== 'onay').map(([k, ad]) => [ad, sayi(k)]).filter(x => x[1]);
    h += `<div class="kart mx-ust"><div class="kart-govde" style="display:grid;gap:12px">
      ${MX.durumSeridi()}
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:240px"><b style="font-family:var(--baslik);font-size:20px;color:var(--murekkep);display:block">${bekleyen.length ? `MEBBİS’e girilecek ${bekleyen.length} iş` : 'MEBBİS’e girilecek iş yok'}</b>
          <small style="color:var(--soluk)">${ozet.length ? ozet.map(([ad, n]) => `${e(ad)} ${n}`).join(' · ') : 'Hepsi MEBBİS’te'}</small></div>
        <div class="mx-dugmeler"><button class="dg dg-cizgi" data-mm-guncelle ${subeSorun ? 'disabled' : ''} title="Dönem grupları, öğrenciler, öğrenci dosyaları, personel, araçlar ve sınav sonuçları okunur; MEBBİS’e bir şey yazılmaz">${ik('indir')}MEBBİS’ten güncelle</button>
        <button class="dg dg-ana" data-mm-hepsini ${bekleyen.length && !subeSorun ? '' : 'disabled'} style="height:46px;padding:0 20px;font-size:15.5px" title="Yazılacakları tek pencerede görüp onaylarsınız; kurum onayı ayrı">${ik('ok')}Bekleyenleri MEBBİS’e yaz${bekleyen.length ? ` (${bekleyen.length})` : ''}</button>
        <details class="mx-menu"><summary class="dg dg-hafif" aria-label="Diğer MEBBİS işlemleri">⋯ Diğer</summary><div>
          ${EK.eklenti.var ? `<button type="button" data-mt-denetle ${subeSorun ? 'disabled' : ''}>${ik('goz')}Ekranları denetle <small>yalnız okunur</small></button>` : ''}
          <button type="button" data-mm-kurulum ${subeSorun ? 'disabled' : ''}>${ik('indir')}Kurulum bilgilerini al <small>kurum, gruplar, personel, araçlar, ücret ilanı</small></button>
          <button type="button" data-mm-tur="al">${ik('indir')}Tek liste al <small>açık MEBBİS ekranından</small></button>
          <a href="#/meb/asistan">${ik('belge')}Elle giriş <small>Yardımcı’sız sıralı giriş</small></a></div></details></div></div>

      ${S.mebDenetim ? `<small style="color:var(--soluk)">${MK.denetimOzeti()} · <button type="button" data-mt-denetim-goster style="background:none;border:0;padding:0;color:var(--levha);font-weight:700;cursor:pointer;font:inherit">Ayrıntı</button></small>` : ''}</div></div>`;
    h += `<p class="mx-baslik">Şimdi açık olan MEBBİS işleri</p>${MX.pencerelerHtml(hepsi)}`; }
  // DENETİM Ö3: görünüm seçimi ayrı bir sekme katı değil, iş kartının başlığında sağda
  const gorunum = `<div class="mx-gorunum" role="tablist" aria-label="Görünüm">${[['liste', 'İş listesi'], ['matris', 'Öğrenci × adım']].map(([k, a]) => `<button type="button" role="tab" aria-selected="${m.gorunum === k}" class="${m.gorunum === k ? 'secili' : ''}" data-mx-gorunum="${k}">${a}</button>`).join('')}</div>`;
  if (m.gorunum === 'matris') { h += `<div class="kart"><div class="mx-kb"><b style="color:var(--murekkep);padding-top:8px">Öğrenci × adım</b>${gorunum}</div>${MX.matrisHtml(m.donem)}</div>`; return h; }
  h += `<div class="kart"><div class="mx-kb"><div>${sekmeler(TURLER.map(([k, ad]) => [k, ad, k === 'al' ? null : sayi(k)]), m.tur, 'mm-tur')}</div>${gorunum}</div>`;
  if (m.tur === 'esinav') h += `<div style="padding:12px 16px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label for="mm-esgun" style="font-weight:700;color:var(--murekkep)">Gün tercihi</label><select id="mm-esgun" class="girdi" data-mm-esgun>${[['0', 'En erken tarih'], ['1', 'Hafta içi'], ['2', 'Hafta sonu']].map(([v, t]) => `<option value="${v}" ${String(S.kurs.esinavGun || '0') === v ? 'selected' : ''}>${t}</option>`).join('')}</select><small style="color:var(--soluk)">MEBBİS randevuyu bu tercihe göre verir; öğrenci dosyasında (e-Sınav tercihleri) ayrı gün seçilmişse o geçerli. Ücreti yatmamış öğrenci gönderilmez.</small></div>`;
  if (m.tur === 'onay') h += `<p class="ipucu uyari" style="margin:12px 16px 0">${isaret('uyari', 18)}<span>Kurum onayından sonra MEBBİS’te fotoğraf ve bilgiler düzeltilemez. Yardımcı yalnız MEBBİS’te fotoğrafı ve evrak kontrolü tamam olanları onaylar.</span></p>`;
  if (m.tur === 'al') {
    h += `<div class="kart-govde">${MT.topluKart(subeSorun)}<b style="display:block;margin:6px 0 8px;color:var(--murekkep)">Tek liste (açık ekrandan)</b><p style="font-size:14px;color:var(--metin);margin-bottom:14px">Yardımcı MEBBİS sekmesine geçer, ilgili listeyi kendisi açar ve buraya getirir. mdSinyal hiçbir şeyi onayınız olmadan kaydetmez.</p>
      <div class="izgara iz-3">${CEK.map(([k, ad, a]) => { const z = (S.mebCekim || {})[k]; return `<div class="kart" style="box-shadow:none"><div class="kart-govde"><b style="color:var(--murekkep);font-size:15.5px;display:block">${ad}</b><p style="font-size:13.5px;color:var(--metin);margin:4px 0 12px">${a}</p><button class="dg dg-ana dg-kucuk" data-meb-cekbtn="${k}" ${subeSorun ? 'disabled' : ''}>${ik('indir')}MEBBİS’ten çek</button>${z ? `<small style="display:block;color:var(--soluk);margin-top:8px">Son: ${tarih(z.slice(0, 10))} ${z.slice(11, 16)}</small>` : ''}</div></div>`; }).join('')}</div></div></div>`;
    return h;
  }
  const l = suzulmus(hepsi), egler = [...new Set(hepsi.filter(x => x.tur === m.tur && x.meta && x.meta.egitmen).map(x => x.meta.egitmen))].map(egitmen).filter(Boolean);
  const siniflar = [...new Set(hepsi.filter(x => x.tur === m.tur && x.meta).map(x => x.meta.sinif))].filter(Boolean);
  // MEB-028: e-sınav başvurusunda ücreti yatmamış aday seçilemez (MEBBİS başvuruyu almaz); ücreti yatanlar önce ve seçili gelir
  const kilitli = x => m.tur === 'esinav' && !x.bitti && x.meta && x.meta.ucretYok;
  if (m.tur === 'esinav') l.sort((a, b) => (kilitli(a) ? 1 : 0) - (kilitli(b) ? 1 : 0));
  [...m.secili].forEach(id => { if (!l.some(x => x.id === id && !x.bitti && !kilitli(x))) m.secili.delete(id); });
  if (m.tur === 'esinav' && m.esOto) { l.filter(x => !x.bitti && !kilitli(x)).forEach(x => m.secili.add(x.id)); m.esOto = false; }
  if (m.tur === 'esinav') {
    const mz = [].concat(S.mebEsinavMerkez || (S.kurs.esinavMerkez ? [S.kurs.esinavMerkez] : [])).filter(Boolean), uy = S.mebUcretYok;
    if (mz.length) h += `<div style="display:flex;gap:8px;overflow-x:auto;padding:12px 16px 0">${mz.map(z => `<div style="flex:0 0 auto;border:1.5px solid var(--cizgi);border-radius:10px;padding:8px 12px;font-size:13.5px"><b style="color:var(--murekkep)">${e(z.ad || 'e-Sınav merkezi')}</b>${z.kontenjan != null ? ` · kalan kontenjan <b>${e(String(z.kontenjan))}</b>` : ''}${z.enErken ? ` · en erken <b>${tarih(z.enErken)}</b>` : ''}${z.onayBekleyen != null ? ` · onay bekleyen ${e(String(z.onayBekleyen))}` : ''}${z.okuma ? `<small style="display:block;color:var(--soluk)">MEBBİS ${tarih(String(z.okuma).slice(0, 10))}</small>` : ''}</div>`).join('')}</div>`;
    if (uy && uy.n) h += `<p style="padding:8px 16px 0;font-size:13.5px;color:var(--soluk)">MEBBİS’te ücret yatırmış, mdSinyal’de olmayan <b>${uy.n}</b> kişi (${tarih(uy.tarih)} okuması).</p>`;
  }
  const secilebilir = l.filter(x => !x.bitti && !kilitli(x)), hepsiSecili = secilebilir.length && secilebilir.every(x => m.secili.has(x.id));
  h += `<div class="filtre"><div class="ara-kutu"><input class="girdi" data-mm-ara placeholder="Ara: ad, TC, plaka, tarih" value="${e(m.ara)}" style="width:100%"></div>
    <select class="girdi" data-mm-durum>${[['bekleyen', 'Aktarılacaklar'], ['hata', 'Hata verenler'], ['aktarildi', 'Aktarılanlar'], ['hepsi', 'Hepsi']].map(([v, t]) => `<option value="${v}" ${m.durum === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <select class="girdi" data-mm-tarih>${[['', 'Tüm tarihler'], ['bugun', 'Bugün'], ['hafta', '±7 gün'], ['ay', '±30 gün']].map(([v, t]) => `<option value="${v}" ${m.tarih === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    ${siniflar.length > 1 ? `<select class="girdi" data-mm-sinif><option value="">Tüm sınıflar</option>${siniflar.map(s => `<option value="${e(s)}" ${m.sinif === s ? 'selected' : ''}>${e((SINIFLAR[s] || {}).ad || s)}</option>`).join('')}</select>` : ''}
    ${egler.length > 1 ? `<select class="girdi" data-mm-egitmen><option value="">Tüm öğretmenler</option>${egler.map(g => `<option value="${e(g.id)}" ${m.egitmen === g.id ? 'selected' : ''}>${e(g.ad)}</option>`).join('')}</select>` : ''}</div>`;
  if (!l.length) h += `<div class="kart-govde">${bos(m.durum === 'bekleyen' ? 'Aktarılacak iş yok' : 'Sonuç yok', m.durum === 'bekleyen' ? 'Bu türde MEBBİS’e girilmemiş kayıt kalmadı.' : 'Filtreleri değiştirmeyi deneyin.')}</div>`;
  else h += `<div class="tablo-kap"><table class="tablo"><thead><tr><th style="width:36px"><input type="checkbox" data-mm-hepsi ${hepsiSecili ? 'checked' : ''} ${secilebilir.length ? '' : 'disabled'} aria-label="Tümünü seç"></th><th>Kursiyer</th><th>Ayrıntı</th><th>Son gün</th><th>Durum</th></tr></thead><tbody>${l.slice(0, 200).map((x, j, a) => { const [st, sr] = sonEtiket(x.bitti ? null : x.son), [dt, dr, dn, di] = durumu(x), kl = kilitli(x);
      const bas = m.tur !== 'esinav' ? '' : j === 0 && !kl ? `<tr class="mm-bolum"><td colspan="5"><b>Ücreti yattı, başvuru bekliyor</b> <small>(${a.filter(y => !kilitli(y)).length})</small></td></tr>` : kl && (j === 0 || !kilitli(a[j - 1])) ? `<tr class="mm-bolum"><td colspan="5"><b>Ücret yatmamış</b> <small>(${a.filter(kilitli).length}) · MEBBİS başvuruyu ücret yatmadan almaz; seçilemez</small></td></tr>` : '';
      return `${bas}<tr data-mm-satir="${e(x.id)}" style="cursor:${x.bitti ? 'default' : 'pointer'}"><td><input type="checkbox" data-mm-sec="${e(x.id)}" ${m.secili.has(x.id) ? 'checked' : ''} ${x.bitti || kl ? 'disabled' : ''} aria-label="${e(x.baslik)} seç"></td><td><b style="color:var(--murekkep)">${e(x.meta ? x.meta.ad : x.baslik)}</b></td><td style="color:var(--metin);font-size:13.5px">${e(x.meta ? x.meta.detay : '')}</td><td>${x.bitti ? '' : rozet(st, sr)}</td><td>${rozet(dt, dr)}${dn ? `<small style="display:block;color:${dr === 'uyari' ? '#7a5200' : dr === 'mavi' ? 'var(--soluk)' : 'var(--kirmizi)'};margin-top:3px;max-width:260px">${e(dn)}</small>` : ''}${di ? `<small style="display:block;color:var(--soluk);margin-top:3px;max-width:260px">${e(di)}</small>` : ''}${kl ? `<button type="button" class="dg dg-hafif dg-kucuk" data-mm-esucret="${e(x.meta.kid)}" style="margin-top:6px">${ik('wp')}Ücreti yatırın</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>${l.length > 200 ? `<p style="padding:10px 16px;color:var(--soluk);font-size:13px">İlk 200 satır gösteriliyor; filtreyi daraltın.</p>` : ''}`;
  const n = m.secili.size;
  h += `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 16px;border-top:1.5px solid var(--cizgi);position:sticky;bottom:0;background:#fff;border-radius:0 0 12px 12px">
    <span style="flex:1;color:var(--soluk);font-size:14px">${n ? `<b style="color:var(--murekkep)">${n}</b> iş seçili` : `${secilebilir.length} iş aktarılmayı bekliyor`}</span>
    ${secilebilir.length ? `<button class="dg dg-cizgi" data-mm-tumu>${hepsiSecili ? 'Seçimi kaldır' : 'Tümünü seç'}</button>` : ''}
    <button class="dg dg-cizgi" data-mm-elle ${n && !subeSorun ? '' : 'disabled'} title="Yardımcı olmadan: değerleri MEBBİS sırasıyla kopyalatır, siz girersiniz">Elle gir</button>${['kayit', 'program', 'sinav'].includes(m.tur) && EK.eklenti.var ? `<button class="dg dg-cizgi" data-mm-aktar ${n && !subeSorun ? '' : 'disabled'} title="Yedek yol: MEBBİS'te formu açar, siz kaydedersiniz">Ekranda doldur</button>` : ''}<button class="dg dg-ana" style="height:46px;padding:0 20px;font-size:15.5px" data-mm-yaz ${n && !subeSorun ? '' : 'disabled'}>${ik('ok')}MEBBİS’e yaz${n ? ` (${n})` : ''}</button></div><p style="padding:0 16px 14px;font-size:13px;color:var(--soluk)">“MEBBİS’e yaz” önce yazılacakları gösterir; onaylayınca Yardımcı seçilen işleri MEBBİS’te ekran açmadan girer, kaydeder ve MEBBİS’ten okuyup doğrular. Güvenlik kodunu siz yazarsınız. “Elle gir” aynı değerleri Yardımcı olmadan kopyalatır.</p></div>`;
  return h;
}

// Elle gir: kayıt, direksiyon programı ve sınav randevusu mevcut sıralı giriş ekranlarına; diğer altı tür kopyalanabilir alan penceresine
// Kural bulguları önce bilgi olarak gösterilir (MT.kuralBilgi; bulgu yoksa doğrudan); altı türde bulgular elle giriş kartlarında görünür
function elleGir(ids) {
  const t = m.tur;
  if (t === 'kayit') return MT.kuralBilgi(ids, () => { const kid = ids[0] && ids[0].replace(/^kayit-/, ''); if (ids.length === 1) { location.hash = '#/mebbis/' + kid; return; } import('./sayfalar3.js?v=234').then(x => x.mebSiraBaslat(true)); }, { dugme: 'Elle girişe geç' });
  if (t === 'program') return MT.kuralBilgi(ids, () => import('./sayfalar3.js?v=234').then(x => x.programPenceresi()), { dugme: 'Elle girişe geç' });
  if (t === 'sinav') { const x0 = butunIsler(true).find(y => y.id === ids[0]); return MT.kuralBilgi(ids, () => import('./sayfalar3.js?v=234').then(x => x.sinavBildirimPenceresi(x0 && x0.ref.sinav)), { dugme: 'Elle girişe geç' }); }
  MT.elleGir(ids);
}
export function uyKapatPenceresi(anahtar, sonra) {
  const x = (S.mebUyumsuz || []).find(y => y.anahtar === anahtar); if (!x) return; const m = UY.metin(x);
  pencere({ baslik: 'Uyumsuzluğu bilerek bırak', icerik: `<p style="font-size:14px"><b>${e(m.baslik)}</b> · ${m.etiket.map(e).join(', ')}</p>${m.gercek ? `<p style="font-size:13.5px;margin-top:6px">mdSinyal: ${e(m.gercek)}</p>` : ''}${m.meb ? `<p style="font-size:13.5px">MEBBİS: ${e(m.meb)}</p>` : ''}
      <div class="alan" style="margin-top:12px"><label for="uy-not">Neden bırakıyorsunuz?</label><textarea id="uy-not" class="girdi" rows="3" maxlength="300" placeholder="Ör. Pazar yapılan ders, il MEM uygulaması gereği Cumartesi girildi"></textarea><small style="color:var(--soluk)">İşlem kaydına yazılır. Denetimde bu fark sizin sorumluluğunuzdadır (MTSK md.46/A).</small></div>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-uy-onay>Bilerek bırak</button>',
    onAc(p) { p.querySelector('[data-uy-onay]').addEventListener('click', () => { const n = p.querySelector('#uy-not').value.trim(); if (n.length < 5) return bildir('Kısa bir açıklama yazın', 'uyari'); UY.kapat(anahtar, n, (oturum.kullanici && oturum.kullanici.ad) || ''); kapatPencere(); bildir('Uyumsuzluk kapatıldı; işlem kaydına yazıldı'); sonra && sonra(); }); } });
}
export function merkezBaglan(k, yenile) {
  MT.topluBaglan(k, yenile);
  const odakla = sec => setTimeout(() => { const el = k.querySelector(sec); if (el) { el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } }, 0);
  k.addEventListener('click', ev => {
    const t = ev.target;
    const ms = t.closest('[data-meb-sildim]'); if (ms) { const x = (S.mebSilinecek || []).find(y => y.id === ms.dataset.mebSildim); S.mebSilinecek = (S.mebSilinecek || []).filter(y => y.id !== ms.dataset.mebSildim); islem('MEBBİS’ten dersi sildi', x ? x.tarih + ' ' + x.saat : ''); kaydet(); return yenile(); }
    { const g = t.closest('[data-mx-gorunum]'); if (g) { m.gorunum = g.dataset.mxGorunum; return yenile(); } }
    { const p = t.closest('[data-mx-tur]'); if (p) { m.gorunum = 'liste'; m.tur = p.dataset.mxTur; m.durum = 'bekleyen'; m.secili.clear(); m.esOto = m.tur === 'esinav'; yenile(); setTimeout(() => { const el = document.querySelector('.mx-gorunum'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); return; } }
    if (t.closest('.mx-menu button')) { const d = t.closest('details'); if (d) d.open = false; }
    const sk = t.closest('[data-mm-tur]'); if (sk) { m.tur = sk.dataset.mmTur; m.secili.clear(); m.sinif = m.egitmen = ''; m.esOto = m.tur === 'esinav'; return yenile(); }
    const eu = t.closest('[data-mm-esucret]'); if (eu) { ev.stopPropagation(); const kk = kursiyer(eu.dataset.mmEsucret); if (!kk) return; const x0 = butunIsler(true).find(y => y.id === 'esinav-' + kk.id), sira = (x0 && x0.meta && x0.meta.hak) || 1;
      if (!kk.tel) return bildir('Kursiyerin telefonu kayıtlı değil', 'uyari');
      waAc(kk.tel, `Merhaba ${String(kk.ad || '').split(' ')[0]}, e-sınav başvurunuzun MEBBİS’e girilebilmesi için ${sira}. hak e-sınav ücretini (${tl(esinavUcreti(sira))}) yatırmanız gerekiyor. Yatırdıktan sonra dekontu kursa iletin. ${S.kurs.ad || ''}`.trim(), 'WhatsApp', tamAd(kk), false, 'kursiyer', 'esinav-ucret'); return; }
    const cb = t.closest('[data-mm-sec]'); if (cb) { const id = cb.dataset.mmSec; cb.checked ? m.secili.add(id) : m.secili.delete(id); return yenile(); }
    const sat = t.closest('[data-mm-satir]'); if (sat && !t.closest('input')) { const id = sat.dataset.mmSatir, x = butunIsler().find(y => y.id === id); if (!x || x.bitti || (x.tur === 'esinav' && x.meta && x.meta.ucretYok)) return; m.secili.has(id) ? m.secili.delete(id) : m.secili.add(id); return yenile(); }
    const hp = t.closest('[data-mm-hepsi], [data-mm-tumu]'); if (hp) { const l = suzulmus(butunIsler(true)).filter(x => !x.bitti), hepsi = l.length && l.every(x => m.secili.has(x.id)); l.forEach(x => hepsi ? m.secili.delete(x.id) : m.secili.add(x.id)); return yenile(); }
    // Ekranda doldur: seçim yalnız iş Yardımcı'ya gerçekten gidince temizlenir (bilgi penceresinde Vazgeç denirse kalır)
    if (t.closest('[data-mm-aktar]')) { const ids = [...m.secili]; EK.yardimciyaGonder(ids, () => ids.forEach(id => m.secili.delete(id))); return yenile(); }
    if (t.closest('[data-mm-elle]')) { const ids = [...m.secili]; elleGir(ids); return; }
    if (t.closest('[data-uy-kapali]')) { uyKapaliGoster = !uyKapaliGoster; return yenile(); }
    { const ua = t.closest('[data-uy-ac]'); if (ua) { UY.ac(ua.dataset.uyAc); return yenile(); } }
    { const uk = t.closest('[data-uy-kapat]'); if (uk) return uyKapatPenceresi(uk.dataset.uyKapat, yenile); }
    if (t.closest('[data-mm-kurulum]')) return MT.topluCek(MT.KURULUM_CEK);   // MEB-188
    if (t.closest('[data-mm-guncelle]')) return MT.topluCek(['gruplar', 'kursiyerler', 'dosya', 'personel', 'araclar', 'sinavlar', 'direksiyonProgrami', 'randevular']);
    if (t.closest('[data-mm-hepsini]')) { const ids = butunIsler(true).filter(x => !x.bitti && x.tur !== 'onay').map(x => x.id); MT.yaz(ids).then(r => { if (r) m.secili.clear(); yenile(); }); return; }
    // seçim yalnız iş Yardımcı'ya gidince temizlenir; onay penceresinde vazgeçilirse seçim kalır
    if (t.closest('[data-mm-yaz]')) { const ids = [...m.secili]; MT.yaz(ids).then(r => { if (r) ids.forEach(id => m.secili.delete(id)); yenile(); }); return; }
  });
  k.addEventListener('change', ev => {
    { const d = ev.target.closest('[data-mx-donem]'); if (d) { m.donem = d.value; return yenile(); } }   // MEB-187
    const t = ev.target;
    if (t.matches('[data-mm-durum]')) { m.durum = t.value; return yenile(); }
    if (t.matches('[data-mm-esgun]')) { S.kurs.esinavGun = t.value; kaydet(); return; }
    if (t.matches('[data-mm-tarih]')) { m.tarih = t.value; return yenile(); }
    if (t.matches('[data-mm-sinif]')) { m.sinif = t.value; return yenile(); }
    if (t.matches('[data-mm-egitmen]')) { m.egitmen = t.value; return yenile(); }
  });
  k.addEventListener('input', ev => { if (ev.target.matches('[data-mm-ara]')) { m.ara = ev.target.value; yenile(); odakla('[data-mm-ara]'); } });
}
