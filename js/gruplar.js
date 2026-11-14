// MEBBİS dönem grupları. MEBBİS'teki "Dönem Grup Açılış Tarihi" ve "Grup Şube Tanımlama" ekranlarıyla birebir:
// dönem YYYYAA, grup 1–3 (her grubun tek başlangıç tarihi, ayın 1'i ile 10'u arası), şube A–H. Ad: "Kasım 1A".
// Kursiyer kaydı grubun başlangıcından önce yapılır (MTSK Yönetmeliği 12/2); evrakı tamam ve gruba atanmış kursiyer aktiftir.
import { S, kaydet, gun, fark, iso, SINIFLAR, tamAd, islem, eksikEvrak, sb } from './veri.js?v=195';
import { e, pencere, kapatPencere, bildir, rozet, tarih, isaret, ik } from './ui.js?v=195';

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const SUBELER = 'ABCDEFGH'.split('');   // MEBBİS'te şube seçenekleri A..H (8 şube)
export const GRUP_NOLAR = [1, 2, 3];          // bir dönemde en çok 3 grup tarihi (16/7)

const ayAd = donem => AYLAR[+String(donem).slice(4, 6) - 1] || '';
export const donemAdi = donem => `${String(donem).slice(0, 4)} - ${ayAd(donem)}`;          // MEBBİS biçimi: "2026 - Kasım"
export const grupAdi = (donem, no, sube) => `${ayAd(donem)} ${no}${sube}`;               // "Kasım 1A"
export const mebGrubuMu = g => !!(g && g.donem && g.grupNo && g.sube);
export const grupBul = id => (S.gruplar || []).find(g => g.id === id) || null;
export const kursiyerGrubu = k => (k && grupBul(k.teorikGrup)) || null;
export const grupMetni = g => !g ? '' : mebGrubuMu(g) ? `${g.ad} · ${tarih(g.baslangic)} başlıyor${g.sinif ? ' · ' + ((SINIFLAR[g.sinif] || {}).ad || g.sinif).split(' ·')[0] : ''}` : `${g.ad} · ${tarih(g.baslangic)} başlıyor`;
const donemOf = t => String(t).slice(0, 4) + String(t).slice(5, 7);
const kisiler = g => sb(S.kursiyerler).filter(k => !k.kapali && k.asama !== 'Ehliyet' && k.teorikGrup === g.id);

/* ---------- e-sınavdan muafiyet: son 3 yılda e-sınavı (yazılı sınavı) geçen, yalnız direksiyon sınavına girer (15/5) ---------- */
// Sınır 3 yıl eksi 1 gün: 14.11.2023'te geçen 13.11.2026 dahil muaftır
export const muafSonGun = t => { const d = new Date(t + 'T12:00:00'); d.setFullYear(d.getFullYear() + 3); d.setDate(d.getDate() - 1); return iso(d); };
export const muafMi = (k, gunu) => !!(k && k.muaf && k.muaf.esinavTarih && (gunu || k.kayit || gun(0)) <= muafSonGun(k.muaf.esinavTarih));

/* ---------- bekleyen / aktif ---------- */
// Bekleyen: kaydı yapılmış ama bir dönem grubuna alınmamış ya da evrakı eksik kursiyer
export function bekleyenMi(k) {
  if (!k || k.kapali) return false;
  if (['Kayıt', 'Evrak'].includes(k.asama)) return true;
  return k.asama === 'Teorik' && !kursiyerGrubu(k);
}
export function bekleyenNedeni(k) {
  const l = [];
  if (!kursiyerGrubu(k)) l.push('dönem grubuna atanmadı');
  const ev = eksikEvrak(k); if (ev.length) l.push('eksik evrak: ' + ev.map(x => x[1].toLocaleLowerCase('tr')).join(', '));
  return l;
}
// Evrakı tamam ve gruba atanmış kursiyer aktif olur: teorik aşamaya (muafsa doğrudan direksiyona) geçer
export function aktifEt(k) {
  if (!k || k.kapali || !['Kayıt', 'Evrak'].includes(k.asama) || eksikEvrak(k).length || !kursiyerGrubu(k)) return false;
  k.asama = muafMi(k) ? 'Direksiyon' : 'Teorik';
  return true;
}

/* ---------- seçenekler ---------- */
// Kayıtta seçilebilecek gruplar: başlamamış (kayıt başlangıçtan önce) ve sınıfa uygun (grup sınıfa ayrılmışsa)
export function kayitGruplari(sinif) {
  return (S.gruplar || []).filter(g => g.baslangic && fark(g.baslangic) >= 0 && (!g.sinif || !sinif || g.sinif === sinif || g.sinif === String(sinif).replace('-O', '')))
    .sort((a, b) => a.baslangic.localeCompare(b.baslangic) || String(a.ad).localeCompare(String(b.ad), 'tr'));
}
// Var olan kursiyeri atarken: son 4 ay ve sonrası (MEBBİS'te zaten o grupta olan eski kursiyerler de eşlenebilsin)
function atanabilirGruplar(sinif) {
  const sinir = iso(new Date(Date.now() - 120 * 864e5));
  return (S.gruplar || []).filter(g => !g.baslangic || g.baslangic >= sinir).filter(g => !g.sinif || !sinif || g.sinif === sinif || g.sinif === String(sinif).replace('-O', ''))
    .sort((a, b) => String(b.baslangic).localeCompare(String(a.baslangic)));
}
export const grupSecenekleri = (l, secili) => l.map(g => `<option value="${e(g.id)}" ${g.id === secili ? 'selected' : ''}>${e(grupMetni(g))}</option>`).join('');

/* ---------- grup kartı oluşturma / düzenleme ---------- */
function donemSecenekleri(secili) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  const l = []; for (let i = 0; i < 4; i++) { l.push(iso(d).slice(0, 4) + iso(d).slice(5, 7)); d.setMonth(d.getMonth() + 1); }
  if (secili && !l.includes(secili)) l.unshift(secili);
  return l.map(x => `<option value="${x}" ${x === secili ? 'selected' : ''}>${e(donemAdi(x))}</option>`).join('');
}
const ayBasi = donem => `${String(donem).slice(0, 4)}-${String(donem).slice(4, 6)}`;
export function grupHatasi(g, haric) {
  if (!/^\d{6}$/.test(g.donem)) return 'Dönemi seçin';
  if (!GRUP_NOLAR.includes(+g.grupNo)) return 'Grup 1, 2 ya da 3 olmalı';
  if (!SUBELER.includes(g.sube)) return 'Şube A ile H arasında olmalı (MEBBİS’te 8 şube var)';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.baslangic || '')) return 'Başlangıç tarihini seçin';
  if (g.baslangic.slice(0, 7) !== ayBasi(g.donem) || +g.baslangic.slice(8, 10) > 10) return `Grup, dönemin ayında 1’i ile 10’u arasında başlamalı (${donemAdi(g.donem)}: 01–10)`;
  const ayni = (S.gruplar || []).filter(x => x.id !== haric && mebGrubuMu(x) && x.donem === g.donem);
  if (ayni.some(x => +x.grupNo === +g.grupNo && x.sube === g.sube)) return `${grupAdi(g.donem, g.grupNo, g.sube)} zaten var`;
  const kardes = ayni.find(x => +x.grupNo === +g.grupNo && x.baslangic !== g.baslangic);
  if (kardes) return `Grup ${g.grupNo}’in başlangıcı ${tarih(kardes.baslangic)} (${kardes.ad}). Aynı grubun bütün şubeleri aynı gün başlar; başka tarih için Grup ${[1, 2, 3].find(n => !ayni.some(x => +x.grupNo === n)) || '—'} kullanın`;
  return '';
}
export function grupFormu(on = {}, sonra) {
  const g0 = on.id ? grupBul(on.id) : null, kilit = g0 && kisiler(g0).length;
  // ayın 10'u geçtiyse yeni grup ancak gelecek aya açılır
  const bugunDonem = (() => { const d = new Date(); if (d.getDate() > 10) { d.setDate(1); d.setMonth(d.getMonth() + 1); } return donemOf(iso(d)); })();
  const v = { donem: (g0 && g0.donem) || on.donem || bugunDonem, grupNo: (g0 && g0.grupNo) || on.grupNo || 1, sube: (g0 && g0.sube) || on.sube || 'A', baslangic: (g0 && g0.baslangic) || '', sinif: (g0 && g0.sinif) || on.sinif || '', derslik: (g0 && g0.derslik) || '', kontenjan: (g0 && g0.kontenjan) || '' };
  const sinifler = Object.entries(SINIFLAR).filter(([k, x]) => x.aktif !== false && !/^(SRC|OP)/.test(k));
  pencere({
    baslik: g0 ? 'Grubu düzenle · ' + g0.ad : 'Yeni dönem grubu',
    icerik: `<form id="f-grup" class="form-izgara" novalidate>
      <p class="ipucu tam">${isaret('bilgi', 18)}<span>MEBBİS’teki dönem grubuyla aynı olmalı: dönem, grup (1–3), şube (A–H) ve başlangıç tarihi (ayın 1’i ile 10’u arası). Kursiyer, grubun başlangıcından önce kaydedilir.</span></p>
      <div class="alan"><label for="g-donem">Dönem</label><select id="g-donem" name="donem" ${kilit ? 'disabled' : ''}>${donemSecenekleri(v.donem)}</select></div>
      <div class="alan"><label for="g-no">Grup</label><select id="g-no" name="grupNo" ${kilit ? 'disabled' : ''}>${GRUP_NOLAR.map(n => `<option value="${n}" ${+v.grupNo === n ? 'selected' : ''}>Grup ${n}</option>`).join('')}</select></div>
      <div class="alan"><label for="g-sube">Şube</label><select id="g-sube" name="sube" ${kilit ? 'disabled' : ''}>${SUBELER.map(s => `<option value="${s}" ${v.sube === s ? 'selected' : ''}>${s} Şubesi</option>`).join('')}</select></div>
      <div class="alan"><label for="g-bas">Başlangıç tarihi</label><input id="g-bas" name="baslangic" type="date" value="${e(v.baslangic)}" ${kilit ? 'disabled' : ''}></div>
      <div class="alan"><label for="g-sinif">Sınıf</label><select id="g-sinif" name="sinif"><option value="">Bütün sınıflar</option>${sinifler.map(([k, x]) => `<option value="${k}" ${v.sinif === k ? 'selected' : ''}>${e(x.ad.split(' ·')[0])}</option>`).join('')}</select><small style="color:var(--soluk)">İlk kez ehliyet alanlar genelde aynı gruptadır; ehliyet türüne göre ayrı grup gerekiyorsa sınıf seçin.</small></div>
      <div class="alan"><label for="g-dl">Derslik</label><input id="g-dl" name="derslik" value="${e(v.derslik)}" placeholder="Derslik 1"></div>
      <div class="alan"><label for="g-kon">Kontenjan</label><input id="g-kon" name="kontenjan" inputmode="numeric" value="${e(v.kontenjan)}" placeholder="Boş bırakılabilir"></div>
      <div class="alan tam"><span class="et">MEBBİS’teki adı</span><b id="g-ad" style="font-size:18px;color:var(--murekkep)"></b> <small id="g-hata" style="display:block;color:var(--kirmizi);font-weight:700;margin-top:4px"></small></div>
      ${kilit ? `<p class="ipucu uyari tam">${isaret('uyari', 18)}<span>Bu gruba ${kilit} kursiyer atanmış; dönem, grup, şube ve tarih değiştirilemez (MEBBİS’te de açılış tarihi sonradan değişmez).</span></p>` : ''}
    </form>`,
    altlik: `${g0 && !kilit ? '<button class="dg dg-cizgi" data-grup-sil style="margin-right:auto;color:var(--kirmizi)">Grubu sil</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-grup">${g0 ? 'Kaydet' : 'Grubu oluştur'}</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      const oku = () => ({ donem: f.donem.value, grupNo: +f.grupNo.value, sube: f.sube.value, baslangic: f.baslangic.value, sinif: f.sinif.value, derslik: f.derslik.value.trim(), kontenjan: +String(f.kontenjan.value).replace(/\D/g, '') || null });
      const guncelle = () => {
        const x = oku();
        f.baslangic.min = ayBasi(x.donem) + '-01'; f.baslangic.max = ayBasi(x.donem) + '-10';
        // aynı grubun başka şubesi varsa başlangıç tarihi ondan gelir
        const kardes = (S.gruplar || []).find(y => y.id !== (g0 && g0.id) && mebGrubuMu(y) && y.donem === x.donem && +y.grupNo === x.grupNo);
        if (kardes && !kilit && f.baslangic.value !== kardes.baslangic) f.baslangic.value = kardes.baslangic;
        d.querySelector('#g-ad').textContent = grupAdi(x.donem, x.grupNo, x.sube);
        d.querySelector('#g-hata').textContent = f.baslangic.value ? grupHatasi(oku(), g0 && g0.id) : '';
      };
      f.addEventListener('change', guncelle); f.addEventListener('input', guncelle); guncelle();
      const sil = d.querySelector('[data-grup-sil]'); if (sil) sil.addEventListener('click', () => { if (!confirm(g0.ad + ' silinsin mi? MEBBİS’teki grup silinmez.')) return; S.gruplar = S.gruplar.filter(y => y.id !== g0.id); islem('Dönem grubunu sildi', g0.ad); kaydet(); kapatPencere(); bildir(g0.ad + ' silindi'); sonra && sonra(null); });
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const x = oku(), h = grupHatasi(x, g0 && g0.id); if (h) return bildir(h, 'uyari');
        const g = g0 || { id: 'g' + x.donem + '-' + x.grupNo + x.sube, kaynak: 'mdSinyal' };
        Object.assign(g, { ...x, ad: grupAdi(x.donem, x.grupNo, x.sube) });
        if (!g0) { S.gruplar = [...(S.gruplar || []), g]; islem('Dönem grubu açtı', g.ad + ' · ' + g.baslangic); } else islem('Dönem grubunu düzenledi', g.ad);
        kaydet(); kapatPencere(); bildir(`${g.ad} ${g0 ? 'güncellendi' : 'oluşturuldu'}. MEBBİS’te de aynı grubu (${donemAdi(g.donem)}, Grup ${g.grupNo}, ${g.sube} Şubesi, ${tarih(g.baslangic)}) açın.`, 'tamam');
        sonra && sonra(g);
      });
    },
  });
}

/* ---------- atama ---------- */
export function grupAta(k, g) {
  k.teorikGrup = g.id;
  const aktif = aktifEt(k);
  return aktif;
}
// Öğrenci ekranından tek kursiyeri gruba atama
export function grupAtaPencere(k, sonra) {
  const l = atanabilirGruplar(k.sinif), mevcut = kursiyerGrubu(k);
  pencere({
    baslik: 'Dönem grubu · ' + tamAd(k),
    icerik: l.length ? `<div class="alan"><label for="ga-g">Grup</label><select id="ga-g" class="girdi">${grupSecenekleri(l, mevcut && mevcut.id)}</select></div>
      <p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>MEBBİS’te kursiyer aynı dönem, grup ve şubeye kaydedilir. Kayıt grubun başlangıcından önce yapılmalı.</span></p>`
      : `<p>${SINIFLAR[k.sinif] ? e(SINIFLAR[k.sinif].ad.split(' ·')[0]) + ' sınıfına' : 'Bu kursiyere'} uygun grup yok. Önce bir dönem grubu açın.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-cizgi" data-yeni-grup>${ik('arti')}Yeni grup</button>${l.length ? '<button class="dg dg-ana" data-ata>Ata</button>' : ''}`,
    onAc(d) {
      d.querySelector('[data-yeni-grup]').addEventListener('click', () => { kapatPencere(); grupFormu({ sinif: '' }, g => g && grupAtaPencere(k, sonra)); });
      const b = d.querySelector('[data-ata]'); if (!b) return;
      b.addEventListener('click', () => {
        const g = grupBul(d.querySelector('#ga-g').value); if (!g) return;
        if (k.kayit && g.baslangic && k.kayit > g.baslangic && !confirm(`${tamAd(k)} ${tarih(k.kayit)} tarihinde kaydolmuş; ${g.ad} ${tarih(g.baslangic)} tarihinde başladı. Kayıt grubun başlangıcından önce olmalı (12/2). MEBBİS’te zaten bu gruptaysa devam edin. Atansın mı?`)) return;
        const aktif = grupAta(k, g); islem('Gruba atadı', tamAd(k) + ' · ' + g.ad); kaydet(); kapatPencere();
        bildir(`${tamAd(k)} ${g.ad} grubuna atandı${aktif ? '; evrakı tam olduğu için aktif oldu' : bekleyenMi(k) ? '; evrakı tamamlanınca aktif olur' : ''}`, 'tamam');
        sonra && sonra();
      });
    },
  });
}
// Grup kartından toplu atama: gruba uygun, grubu olmayan ya da bekleyen kursiyerler
export function topluAtaPencere(g, sonra) {
  const aday = sb(S.kursiyerler).filter(k => !k.kapali && k.teorikGrup !== g.id && (!kursiyerGrubu(k) || bekleyenMi(k)) && ['Kayıt', 'Evrak', 'Teorik'].includes(k.asama) && (!g.sinif || k.sinif === g.sinif || k.sinif.replace('-O', '') === g.sinif))
    .sort((a, b) => String(b.kayit).localeCompare(String(a.kayit)));
  pencere({
    baslik: g.ad + ' · kursiyer ata',
    icerik: aday.length ? `<p style="color:var(--soluk);margin-bottom:10px">${tarih(g.baslangic)} başlıyor${g.sinif ? ' · ' + e(SINIFLAR[g.sinif].ad.split(' ·')[0]) : ''} · şu an ${kisiler(g).length} kursiyer${g.kontenjan ? ' / ' + g.kontenjan : ''}</p>
      <label class="evrak" style="cursor:pointer;margin-bottom:6px"><input type="checkbox" data-hepsi style="width:18px;height:18px"><b>Hepsini seç (${aday.length})</b></label>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px 18px;max-height:52vh;overflow:auto">${aday.map(k => { const gg = kursiyerGrubu(k); return `<label class="evrak" style="cursor:pointer"><input type="checkbox" name="k" value="${k.id}" style="width:18px;height:18px"><span><b>${e(tamAd(k))}</b><small style="display:block;color:var(--soluk)">${e(SINIFLAR[k.sinif].ad.split(' ·')[0])} · kayıt ${tarih(k.kayit)}${gg ? ' · şu an ' + e(gg.ad) : ''}${eksikEvrak(k).length ? ' · evrak eksik' : ''}</small></span></label>`; }).join('')}</div>`
      : `<p>Bu gruba atanabilecek kursiyer yok. Grubu olmayan ya da bekleyen kursiyerler burada listelenir.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${aday.length ? '<button class="dg dg-ana" data-ata>Seçilenleri ata</button>' : ''}`,
    onAc(d) {
      const h = d.querySelector('[data-hepsi]'); if (h) h.addEventListener('change', () => d.querySelectorAll('[name=k]').forEach(x => { x.checked = h.checked; }));
      const b = d.querySelector('[data-ata]'); if (!b) return;
      b.addEventListener('click', () => {
        const l = [...d.querySelectorAll('[name=k]:checked')].map(x => S.kursiyerler.find(k => k.id === x.value)).filter(Boolean);
        if (!l.length) return bildir('Kursiyer seçin', 'uyari');
        if (g.kontenjan && kisiler(g).length + l.length > g.kontenjan && !confirm(`${g.ad} kontenjanı ${g.kontenjan}; atanınca ${kisiler(g).length + l.length} olacak. Devam edilsin mi?`)) return;
        const aktif = l.filter(k => grupAta(k, g)).length;
        islem('Gruba toplu atadı', g.ad + ' · ' + l.length + ' kursiyer'); kaydet(); kapatPencere();
        bildir(`${l.length} kursiyer ${g.ad} grubuna atandı${aktif ? ` · ${aktif} kişi aktif oldu` : ''}`, 'tamam');
        sonra && sonra();
      });
    },
  });
}

/* ---------- teorik dersler ekranındaki kart ---------- */
export function gruplarKarti() {
  const l = (S.gruplar || []).filter(g => !g.baslangic || fark(g.baslangic) >= -120).sort((a, b) => String(b.baslangic).localeCompare(String(a.baslangic)) || String(a.ad).localeCompare(String(b.ad), 'tr'));
  const bek = sb(S.kursiyerler).filter(bekleyenMi);
  return `<div class="kart"><div class="kart-bas"><h3>Dönem grupları</h3><small>MEBBİS’teki dönem, grup ve şubelerle aynı</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-grup-yeni>${ik('arti')}Yeni grup</button></div></div>
    ${l.length ? `<ul class="liste" style="margin-top:8px">${l.map(g => { const n = kisiler(g).length, bas = fark(g.baslangic); return `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(g.ad)}</b>${mebGrubuMu(g) ? '' : ' ' + rozet('MEBBİS dışı', 'notr')}<small style="display:block;color:var(--soluk)">${mebGrubuMu(g) ? e(donemAdi(g.donem)) + ' · Grup ' + g.grupNo + ' · ' + g.sube + ' Şubesi · ' : ''}${bas > 0 ? tarih(g.baslangic) + ' başlıyor' : bas === 0 ? 'bugün başlıyor' : tarih(g.baslangic) + ' başladı'}${g.sinif ? ' · ' + e(((SINIFLAR[g.sinif] || {}).ad || g.sinif).split(' ·')[0]) : ''}${g.derslik ? ' · ' + e(g.derslik) : ''}</small></div>
      <span class="sag"><span class="sayi" style="font-size:13px">${n}${g.kontenjan ? '/' + g.kontenjan : ''} kişi</span><button class="dg dg-cizgi dg-kucuk" data-grup-ata="${e(g.id)}">Kursiyer ata</button>${mebGrubuMu(g) ? `<button class="dg dg-hafif dg-kucuk" data-grup-duzenle="${e(g.id)}" aria-label="Düzenle">${ik('kalem')}</button>` : ''}</span></li>`; }).join('')}</ul>`
      : `<div class="kart-govde"><p style="color:var(--metin)">Henüz dönem grubu yok. MEBBİS’te açtığınız grubu burada da açın (ör. <b>Kasım 1A</b>); kayıtta grup seçimi zorunlu. MEBBİS Yardımcısı kuruluysa <b>MEB işlemleri › MEBBİS’ten al › Dönem grupları</b> ile MEBBİS’teki grupları da çekebilirsiniz.</p></div>`}
    ${bek.length ? `<div class="kart-bas" style="padding-top:18px"><h3>Bekleyen kursiyerler</h3><small>Kaydı yapıldı; gruba atanmadı ya da evrakı eksik · ${bek.length}</small></div>
      <ul class="liste" style="margin-top:6px">${bek.slice(0, 30).map(k => `<li><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1;min-width:0"><div><b>${e(tamAd(k))}</b><small>${e(SINIFLAR[k.sinif].ad.split(' ·')[0])} · ${e(bekleyenNedeni(k).join(' · '))}</small></div></a>${kursiyerGrubu(k) ? '' : `<button class="dg dg-cizgi dg-kucuk" data-kursiyer-grup="${k.id}">Gruba ata</button>`}</li>`).join('')}</ul>` : ''}
  </div>`;
}
export function gruplarBaglan(k, yenile) {
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-grup-yeni]')) return grupFormu({}, () => yenile());
    const a = ev.target.closest('[data-grup-ata]'); if (a) { const g = grupBul(a.dataset.grupAta); return g && topluAtaPencere(g, yenile); }
    const d = ev.target.closest('[data-grup-duzenle]'); if (d) return grupFormu({ id: d.dataset.grupDuzenle }, () => yenile());
    const kg = ev.target.closest('[data-kursiyer-grup]'); if (kg) { const x = S.kursiyerler.find(y => y.id === kg.dataset.kursiyerGrup); return x && grupAtaPencere(x, yenile); }
  });
}

/* ---------- MEBBİS'ten gelen grup/şube listesi (SKT03002 Grup Şube Tanımlama) ---------- */
// Sütunlar: Dönemi · Grup Adı · Şubesi · Grup Başlama Tarihi · Kurum Onay Durumu. Son 4 ay ve sonrası alınır.
const nrm = x => String(x || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');
export function mebbisGruplariAl(sat, sessiz) {
  const bas = (sat[0] || []).map(nrm), bul = (...l) => bas.findIndex(h => l.some(x => h.includes(x)));
  const iD = bul('donem'), iG = bul('grup adi', 'grubu', 'grup'), iS = bul('sube'), iT = bul('baslama', 'baslangic', 'tarih');
  if (iD < 0 || iS < 0 || iT < 0) return sessiz ? { yeni: 0, var_: 0, atla: sat.length - 1 } : bildir('Listede dönem, şube ya da başlama tarihi sütunu bulunamadı. MEBBİS’te “Grup Şube Tanımlama” ekranından gönderin.', 'uyari');
  const sinir = iso(new Date(Date.now() - 120 * 864e5)); let yeni = 0, var_ = 0, atla = 0;
  sat.slice(1).forEach(r => {
    const dm = nrm(r[iD]), yil = (dm.match(/\d{4}/) || [])[0], ay = AYLAR.findIndex(a => dm.includes(nrm(a))) + 1;
    // "Grup 1" / "Grup-1" ve "A Şubesi" / "A ŞUBESİ" / "A" biçimleri
    const no = +((String(r[iG] || '').match(/[123]/) || [])[0] || 0), sb_ = ((String(r[iS] || '').trim().toLocaleUpperCase('tr').match(/(?:^|[^A-ZÇĞİÖŞÜ])([A-H])(?=$|[^A-ZÇĞİÖŞÜ0-9])/) || [])[1]) || '';
    const t = String(r[iT] || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/), bt = t ? `${t[3]}-${t[2].padStart(2, '0')}-${t[1].padStart(2, '0')}` : '';
    if (!yil || !ay || !no || !SUBELER.includes(sb_) || !bt) { atla++; return; }
    if (bt < sinir) return;
    const donem = yil + String(ay).padStart(2, '0'), id = 'g' + donem + '-' + no + sb_;
    const g = (S.gruplar || []).find(x => x.id === id || (mebGrubuMu(x) && x.donem === donem && +x.grupNo === no && x.sube === sb_));
    if (g) { g.meb = true; if (!g.baslangic) g.baslangic = bt; var_++; return; }
    S.gruplar = [...(S.gruplar || []), { id, donem, grupNo: no, sube: sb_, baslangic: bt, ad: grupAdi(donem, no, sb_), sinif: '', derslik: '', kontenjan: null, meb: true, kaynak: 'MEBBİS' }]; yeni++;
  });
  if (yeni) { islem('MEBBİS’ten dönem grupları aldı', yeni + ' grup'); kaydet(); }
  if (sessiz) return { yeni, var_, atla };
  location.hash = '#/teorik';
  bildir(yeni ? `MEBBİS’ten ${yeni} dönem grubu eklendi${var_ ? `; ${var_} grup zaten vardı` : ''}. Kursiyerleri gruplara atayabilirsiniz.` : var_ ? `MEBBİS’teki ${var_} grubun hepsi mdSinyal’de zaten var` : `Son 4 ayda açılmış grup bulunamadı${atla ? ` (${atla} satır okunamadı)` : ''}`, yeni || var_ ? 'tamam' : 'uyari');
}
