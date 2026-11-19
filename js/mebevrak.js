// MEBBİS aday evrak ekranlarının istediği bilgiler (belge değil, belge üzerindeki bilgiler):
// Öğrenim (SKT02003), Sağlık raporu (SKT02004), Sabıka/adli sicil (SKT02005), Parmak izi (SKT02010, menüde "İmza").
// Kayıt formunda ve öğrenci dosyasında girilir; "MEBBİS'e yaz" kayıtla birlikte bu ekranları da doldurur.
import { e, isaret } from './ui.js?v=235';
import { S, gun } from './veri.js?v=235';

// KAY-011: engel bilgisi (MEBBİS'e 'Var/Yok' gider; ayrıntı e-sınav ve aday belgesi için kursta tutulur)
export const ENGEL_TURLERI = ['Ortopedik (el/kol)', 'Ortopedik (yürüyemiyor)', 'İşitme, dil ve konuşma', 'Görme (bir gözü görmüyor)', 'Görme (büyüteçle)', 'Süreğen hastalık'];
export const AB_KODLARI = [['01', 'Görüş düzeltme / koruma'], ['01.01', 'Gözlük'], ['01.02', 'Kontakt lens'], ['01.05', 'Göz siperi'], ['01.06', 'Gözlük veya kontakt lens'], ['01.07', 'Özel optik araç'], ['02', 'İşitme cihazı / iletişim yardımı'], ['03', 'Protez / ortez'], ['03.01', 'Kol protezi / ortezi'], ['03.02', 'Bacak protezi / ortezi']];
// KAY-116: MEBBİS skt02003 'Öğrenim Belgesi Türü' listesinin 14 değeri (Çizgi'nin MEBBİS listesi); motor seçeneği metniyle seçer
export const OGRENIM_BELGELERI = ['II. Kademe Okur Yazarlık Belgesi', 'İlkokul Diploma', 'İlköğretim Diploma', 'İlköğretim Tasdikname', 'Açık İlköğretim Öğrenci Belgesi', 'Ortaokul Diploma', 'Ortaokul Tasdikname', 'Lise Diploma', 'Lise Tasdikname', 'Lise Öğrenci Belgesi', 'Üniversite Öğrenci Belgesi', 'Üniversite Diploma', 'Üniversite Geçici Mezuniyet Belgesi', 'Denklik/Öğrenim Belgesinin Noter Tasdikli Türkçe Tercümesi'];
// MEBBİS metin kuralı: " < > ' ! & = yasak, baş/son boşluk yasak, uzunluk sınırı
export const temiz = (v, n) => String(v || '').replace(/["<>'!&=]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n || 100);
const tarihGir = t => { const m = String(t || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(t || '').slice(0, 10); };
const tarihYaz = v => v ? v.split('-').reverse().join('.') : '';

/* ---------- Evrak tarih denetimi (uyarı, engel değil) ----------
   Kesin: belge tarihi gelecekte ya da doğumdan önce olamaz; biyometrik fotoğraf son 6 ayda çekilmiş olmalı (MTSK Yön. md.11/1-a-3).
   Sağlık raporu: MTSK süre koymuyor. Varsayılan 12 ay, Sağlık Raporları Yönetmeliği md.66/1'in genel kuralı (durum bildirir rapor, başka tarih yazmıyorsa
   1 yıl); sürücü raporuna uygulanışı teyit bekliyor. Raporda geçerlilik (bitiş) tarihi girildiyse ay hesabı yapılmaz, o tarih kullanılır.
   Adli sicil: mevzuatta süre yok; 6 ay kurs kararıdır (belirleyici olan Bakanlığın adli mercilerden teyidi). eyup-sorular-cevaplar.md madde 16.
   Süreler Ayarlar › MEB kuralları'ndan değişir; 0 yazılırsa o denetim kapanır. MEBBİS'e işlenmiş kayıtta süre uyarısı çıkmaz (belge kabul edilmiş). */
// Yeni Sağlık Raporları Yönetmeliği yürürlüğü (RG 19/5/2026); öncesinde verilen raporlar kendi süreleri bitene kadar geçerli (geçici md.1/2)
const SAGLIK_YON_TARIH = '2026-05-19';
export const BELGE_SURE = { saglikGecerlilikAy: 12, adliGecerlilikAy: 6, fotoGecerlilikAy: 6, evrakAlinmaAy: 1 };  // KAY-119: evrakAlinmaAy kurs kararı (son N ayda alınmış)
export const belgeSure = key => { const v = S && S.kurs ? S.kurs[key] : undefined; return v === 0 ? 0 : +v > 0 ? +v : BELGE_SURE[key]; };
// Kurs Ayarlar'da kendi değerini girmediyse sağlık raporu süresi "teyit bekliyor" sayılır (fotoğrafın 6 ayı yönetmelikte yazılı; adli sicilin 6 ayı kurs kararı)
export const sureTeyitli = key => key === 'fotoGecerlilikAy' || key === 'adliGecerlilikAy' || !!(S && S.kurs && S.kurs[key] !== undefined);
// Geçersiz tarih (31.02 gibi) boş sayılır; yanlış uyarı üretmesin
const isoYap = t => { const x = String(t || '').trim(), m = x.match(/^(\d{2})[./](\d{2})[./](\d{4})$/), v = m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : ''; if (!v) return ''; const d = new Date(v + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === v ? v : ''; };
const ayEkleIso = (t, n) => { const [y, a, g] = t.split('-').map(Number), d = new Date(Date.UTC(y, a - 1 + n, g)); if (d.getUTCDate() !== g) d.setUTCDate(0); return d.toISOString().slice(0, 10); };
const ayFarki = (bas, bit) => { const [y1, a1, g1] = bas.split('-').map(Number), [y2, a2, g2] = bit.split('-').map(Number); return (y2 - y1) * 12 + (a2 - a1) - (g2 < g1 ? 1 : 0); };
const tYaz = t => t ? t.split('-').reverse().join('.') : '';
// k: kursiyer (yoksa yeni kayıt); ham: formdan okunan değerler (yyyy-aa-gg) kayıttakilerin yerine geçer
export function tarihUyarilari(k, ham = {}) {
  k = k || {}; const v = k.mebEvrak || {}, bugun = gun(0), l = [];
  const dogum = isoYap(ham.dogum !== undefined ? ham.dogum : k.dogumTarihi), ref = isoYap(k.kayit) || bugun;
  const belgeler = [
    ['saglik', 'Sağlık raporu', isoYap(ham.saglik !== undefined ? ham.saglik : (k.saglikRapor || {}).tarih), 'saglikGecerlilikAy', 'MTSK Yön. md.11/1-a-4 (sürücü olur raporu); süre yönetmelikte yok, 12 ay Sağlık Raporları Yön. md.66/1 genel kuralı'],
    ['adli', 'Adli sicil belgesi', isoYap(ham.adli !== undefined ? ham.adli : (v.adli || {}).tarih), 'adliGecerlilikAy', 'MTSK Yön. md.11/1-a-5 (barkotlu adli sicil belgesi); süre mevzuatta yok, kurs kararı'],
    ['ogrenim', 'Öğrenim belgesi', isoYap(ham.ogrenim !== undefined ? ham.ogrenim : (v.ogrenim || {}).tarih), null, ''],
    ['parmak', 'Parmak izi belgesi', isoYap(ham.parmak !== undefined ? ham.parmak : (v.parmak || {}).tarih), null, ''],
  ];
  const dg0 = k.dogrulama || {};
  belgeler.forEach(([alan, ad, t, sure, dayanak]) => {
    if (!t) return;
    if (t > bugun) return l.push({ alan, metin: `${ad} tarihi (${tYaz(t)}) bugünden sonra görünüyor; belgedeki tarihi kontrol edin.`, dayanak: 'Tarih denetimi' });
    if (dogum && t < dogum) return l.push({ alan, metin: `${ad} tarihi (${tYaz(t)}) doğum tarihinden önce; yanlış girilmiş olabilir.`, dayanak: 'Tarih denetimi' });
    // belgenin üzerindeki geçerlilik tarihi girildiyse (doğrulamada) ay hesabı yerine o tarih kullanılır (aşağıda)
    const ay = sure && !(alan === 'saglik' && dg0.saglik && isoYap(dg0.saglik.gecerlilik)) ? belgeSure(sure) : 0;
    // 19.05.2026'dan önce verilen sağlık raporu kendi süresi bitene kadar geçerli (Sağlık Raporları Yön. geçici md.1/2): 12 ay kuralı ona doğrudan uygulanmaz, uyarıya not eklenir
    const gecis = alan === 'saglik' && t < SAGLIK_YON_TARIH ? ` Rapor ${tYaz(SAGLIK_YON_TARIH)} öncesi: yeni Sağlık Raporları Yönetmeliği’ne göre kendi süresi bitene kadar geçerli; raporda yazan süreye bakın.` : '';
    if (ay && !k.mebIslendi && ayEkleIso(t, ay) < ref) l.push({ alan, metin: `${ad} ${k.kayit ? 'kayıt tarihinde' : 'bugün'} ${ayFarki(t, ref)} aylık; kurs ayarı en fazla ${ay} ay. ${gecis ? gecis.trim() : 'Yeni belge istenebilir.'}`, dayanak: dayanak + (gecis ? '; Sağlık Raporları Yön. geçici md.1/2' : '') + '; Ayarlar › MEB kuralları', teyit: !sureTeyitli(sure) });
  });
  // KAY-119: belgenin kendi geçerliliğinden ayrı, kursun 'son N ay içinde alınmış olsun' kuralı (kayıt günü ya da bugün); MEBBİS'e işlenmiş kayıtta sorulmaz
  { const ay = belgeSure('evrakAlinmaAy'); if (ay && !k.mebIslendi) belgeler.forEach(([alan, ad, t]) => { if (!t || t > bugun || l.some(x => x.alan === alan)) return; if (ayEkleIso(t, ay) < ref) { const af = ayFarki(t, ref); l.push({ alan, metin: `Bu ${ad.toLocaleLowerCase('tr')} ${af ? af + ' ay' : 'bir aydan fazla'} önce alınmış; kursunuz son ${ay} ayda alınmışını istiyor.`, dayanak: 'Kurs kararı (Ayarlar › MEB kuralları › evrak alınma süresi)' }); } }); }
  const dg = k.dogrulama || {};
  [['saglik', 'Sağlık raporu'], ['adli', 'Adli sicil belgesi']].forEach(([x, ad]) => { const gs = dg[x] && isoYap(dg[x].gecerlilik); if (gs && gs < bugun) l.push({ alan: x, metin: `${ad} üzerindeki geçerlilik tarihi (${tYaz(gs)}) geçmiş.`, dayanak: 'Belgenin kendi geçerlilik tarihi (doğrulamada girildi)' }); });
  const ft = isoYap(k.fotoTarih), fa = belgeSure('fotoGecerlilikAy');
  if (ft && fa && !k.mebIslendi && ayEkleIso(ft, fa) < bugun) l.push({ alan: 'foto', metin: `Biyometrik fotoğraf ${tYaz(ft)} tarihinde eklendi, ${fa} aydan eski. MEBBİS'e gitmeden yenisini isteyin.`, dayanak: 'MTSK Yön. md.11/1-a-3 (son altı ayda çekilmiş biyometrik fotoğraf)' });
  if (k.foto && !k.mebIslendi && S.kurs && S.kurs.mebYalnizBiyometrik && k.fotoKaynak === 'kamera') l.push({ alan: 'foto', metin: 'Fotoğraf kurs kamerasıyla çekildi; ayara göre MEBBİS’e gönderilmez. Fotoğrafçıdan alınan biyometrik fotoğrafı yükleyin.', dayanak: 'Ayarlar › MEB kuralları › MEBBİS’e yalnız biyometrik fotoğraf gönder (MEB-068)' });
  return l;
}
export const tarihUyariHtml = l => l.length ? `<div class="ipucu uyari" style="display:block"><b style="display:flex;gap:6px;align-items:center;margin-bottom:4px">${isaret('uyari', 18)}Belge tarihi uyarıları <small style="font-weight:400;color:var(--soluk)">kayıt engellenmez</small></b>${l.map(x => `<p style="margin:4px 0 0;font-size:13.5px">${e(x.metin)} <small style="color:var(--soluk)">Dayanak: ${e(x.dayanak)}</small>${x.teyit ? ' <b style="color:var(--turuncu);font-size:12px">· süre teyit bekliyor</b>' : ''}</p>`).join('')}</div>` : '';
// Formda tarih değişince uyarılar yenilenir (kayıt formu ve öğrenci düzenleme formu; alan adları iki formda farklı)
const formDeger = (f, adlar) => { for (const n of adlar) { const el = f.querySelector(`[name="${n}"]`); if (el) return el.value || ''; } return undefined; };
function formUyariYenile(f) {
  const kutu = f.querySelector('[data-me-tarih]'); if (!kutu) return;
  const k = kutu.dataset.kid ? (S.kursiyerler || []).find(x => x.id === kutu.dataset.kid) : null;
  const h = tarihUyariHtml(tarihUyarilari(k, { dogum: formDeger(f, ['dogumTarihi', 'dogum']), saglik: formDeger(f, ['raporTarih', 'rtar']), adli: formDeger(f, ['meAdTarih']), ogrenim: formDeger(f, ['meOgTarih']), parmak: formDeger(f, ['mePiTarih']) }));
  kutu.innerHTML = h; kutu.style.display = h ? '' : 'none';
}
// B Engelli (B-EN) kursiyerde engel durumu varsayılan "Var" (sağlık raporunda engel kaydı olan aday). Kayıt formunda sınıf B-EN seçilince
// engel durumu elle değiştirilmediyse "Var" olur; elle seçilen değer korunur.
const ENGEL_VARSAYILAN = sinif => sinif === 'B-EN' ? 'Var' : 'Yok';
if (typeof document !== 'undefined') document.addEventListener('change', ev => { const t = ev.target; if (!t || !t.name) return; const f0 = t.closest('form');
  if (f0 && t.name === 'meSgOzur') t.dataset.elle = '1';
  if (f0 && t.name === 'meSgOzur') f0.querySelectorAll('[data-me-engel]').forEach(x => { x.hidden = t.value !== 'Var' && !(x.querySelector('[name=meSgAb]') || {}).value; });
  if (f0 && t.name === 'sinif') { const oz = f0.querySelector('[name=meSgOzur]'); if (oz && !oz.dataset.elle) oz.value = ENGEL_VARSAYILAN(t.value); }
  if (!/^(dogumTarihi|dogum|raporTarih|rtar|meAdTarih|meOgTarih|mePiTarih)$/.test(t.name)) return; const f = t.closest('form'); if (f) formUyariYenile(f); });

export function evrakHtml(k) {
  const v = (k && k.mebEvrak) || {}, o = v.ogrenim || {}, a = v.adli || {}, p = v.parmak || {}, s = v.saglik || {}, oz = s.ozur || ENGEL_VARSAYILAN(k && k.sinif);
  const alan = (ad, et, deger, ek = '') => `<div class="alan"><label>${et}</label><input name="${ad}" value="${e(deger || '')}" autocomplete="off" ${ek}></div>`;
  const tarihAlan = (ad, et, deger) => `<div class="alan"><label>${et}</label><input name="${ad}" type="date" value="${e(tarihGir(deger))}"></div>`;
  const tu = tarihUyariHtml(tarihUyarilari(k));
  // KAY-035: belgeyi veren alanında son 5 farklı kayıt önerilir (en yeni kayıttan)
  const son5 = blok => [...new Set((S.kursiyerler || []).filter(x => x !== k && x.mebEvrak && x.mebEvrak[blok] && x.mebEvrak[blok].veren).sort((a, b) => String(b.kayit || '').localeCompare(String(a.kayit || ''))).map(x => x.mebEvrak[blok].veren))].slice(0, 5);
  const dl = (id, l) => `<datalist id="${id}">${l.map(x => `<option value="${e(x)}">`).join('')}</datalist>`;
  return `<div class="alan tam" data-me-tarih data-kid="${e((k && k.id) || '')}"${tu ? '' : ' style="display:none"'}>${tu}</div><details class="alan tam me-evrak" ${k && k.mebEvrak ? '' : ''}><summary style="cursor:pointer;font-weight:700;color:var(--murekkep)">MEBBİS evrak bilgileri <small style="font-weight:400;color:var(--soluk)">belgelerin üzerinde yazar; MEBBİS’e kayıtla birlikte gider</small></summary>
    <div class="form-izgara" style="margin-top:10px">
      <b class="tam" style="font-size:13.5px">Öğrenim belgesi</b>
      ${alan('meOgVeren', 'Belgeyi veren okul', o.veren, 'maxlength="100" list="me-dl-og" placeholder="ör. Tepebaşı Anadolu Lisesi"')}${dl('me-dl-og', son5('ogrenim'))}
      <div class="alan"><label>Belge türü</label><select name="meOgTur"><option value="">Seçin</option>${o.tur && !OGRENIM_BELGELERI.includes(o.tur) ? `<option value="" selected>Eski kayıt: ${e(o.tur)} · yeniden seçin</option>` : ''}${OGRENIM_BELGELERI.map(x => `<option ${o.tur === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      ${tarihAlan('meOgTarih', 'Belge tarihi', o.tarih)}${alan('meOgSayi', 'Belge sayısı', o.sayi, 'maxlength="10"')}
      <b class="tam" style="font-size:13.5px">Sağlık raporu</b>
      <div class="alan"><label>Engel durumu</label><select name="meSgOzur"><option value="Yok" ${oz !== 'Var' ? 'selected' : ''}>Engeli yok</option><option value="Var" ${oz === 'Var' ? 'selected' : ''}>Engeli var</option></select>${k && k.sinif === 'B-EN' && oz !== 'Var' ? '<small style="color:var(--kirmizi)">B Engelli: engel durumu “Var” olmalı</small>' : ''}</div>
      ${alan('meSgRef', 'Rapor referans no (e-Nabız)', s.refNo, 'maxlength="30"')}
      <div class="alan" data-me-engel ${oz === 'Var' ? '' : 'hidden'}><label>Engel türü</label><select name="meSgEngel"><option value="">Seçin</option>${ENGEL_TURLERI.map(x => `<option ${s.engelTur === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="alan" data-me-engel ${oz === 'Var' || s.abKod ? '' : 'hidden'}><label>AB kodu (raporda)</label><select name="meSgAb"><option value="">Yok</option>${AB_KODLARI.map(([k, a]) => `<option value="${k}" ${s.abKod === k ? 'selected' : ''}>${k} · ${a}</option>`).join('')}</select></div>
      <b class="tam" style="font-size:13.5px">Adli sicil (sabıka) belgesi</b>
      ${alan('meAdVeren', 'Belgeyi veren', a.veren || 'E-DEVLET', 'maxlength="100" list="me-dl-ad"')}${dl('me-dl-ad', son5('adli'))}${tarihAlan('meAdTarih', 'Belge tarihi', a.tarih)}${alan('meAdSayi', 'Belge sayısı', a.sayi, 'maxlength="10"')}
      <b class="tam" style="font-size:13.5px">Parmak izi belgesi</b>
      ${alan('mePiVeren', 'Belgeyi veren', p.veren, 'maxlength="100" list="me-dl-pi"')}${dl('me-dl-pi', son5('parmak'))}${tarihAlan('mePiTarih', 'Belge tarihi', p.tarih)}${alan('mePiSayi', 'Belge sayısı', p.sayi, 'maxlength="10"')}
    </div></details>`;
}
export function evrakOku(f) {
  const g = n => (f.querySelector(`[name="${n}"]`) || {}).value || '';
  const blok = (veren, tarih, sayi) => (g(veren).trim() && (g(tarih) || g(sayi).trim())) ? { veren: temiz(g(veren)), tarih: tarihYaz(g(tarih)), sayi: temiz(g(sayi), 10) } : null;
  const o = blok('meOgVeren', 'meOgTarih', 'meOgSayi'); if (o) o.tur = g('meOgTur');
  const sg = { ozur: g('meSgOzur') || ENGEL_VARSAYILAN((f.querySelector('[name="sinif"]:checked') || f.querySelector('[name="sinif"]') || {}).value), refNo: temiz(g('meSgRef'), 30) };
  if (sg.ozur === 'Var' && g('meSgEngel')) sg.engelTur = g('meSgEngel'); if (g('meSgAb')) sg.abKod = g('meSgAb');
  return { ogrenim: o, saglik: sg, adli: blok('meAdVeren', 'meAdTarih', 'meAdSayi'), parmak: blok('mePiVeren', 'mePiTarih', 'mePiSayi') };
}
// MEBBİS'e gidecek evrak paketi (motor: evrakYaz); eksik blok gönderilmez, eksik listesine yazılır
const trT = t => String(t || '').split('.').join('/');   // 07.12.2026 → 07/12/2026
export function evrakPaketi(k) {
  const v = k.mebEvrak || {}, l = {}, eksik = [];
  if (v.ogrenim && v.ogrenim.tur && !OGRENIM_BELGELERI.includes(v.ogrenim.tur)) eksik.push('öğrenim belge türü MEBBİS listesinden yeniden seçilmeli'); else if (v.ogrenim && v.ogrenim.tur) l.ogrenim = { veren: v.ogrenim.veren, tur: v.ogrenim.tur, tarih: trT(v.ogrenim.tarih), sayi: v.ogrenim.sayi }; else eksik.push('öğrenim belgesi');
  // MEB-068: Ayarlar 'Sağlık raporunu referans numarasıyla gönder' açıksa numarasız rapor eksik sayılır; kapalıyken (varsayılan) numara varsa gönderilir
  const refZorunlu = !!(S.kurs && S.kurs.mebSaglikRef === true), ref = String((v.saglik || {}).refNo || '').trim();
  l.saglik = { ozur: (v.saglik || {}).ozur || ENGEL_VARSAYILAN(k.sinif), refNo: ref };
  if (refZorunlu && !ref) eksik.push('sağlık raporu referans no (e-Nabız)');
  if (k.sinif === 'B-EN' && l.saglik.ozur !== 'Var') eksik.push('B Engelli: engel durumu Var olmalı');   // rapor no e-Nabız referans no ile aynı olmayabilir: yalnız elle girilen gider
  if (v.adli) l.adli = { veren: v.adli.veren, tarih: trT(v.adli.tarih), sayi: v.adli.sayi }; else eksik.push('adli sicil');
  if (v.parmak) l.parmak = { veren: v.parmak.veren, tarih: trT(v.parmak.tarih), sayi: v.parmak.sayi }; else eksik.push('parmak izi');
  return { l, eksik };
}

// MEB-077: kayıt dosyasında adım adım MEBBİS ön kontrolü (MEBBİS'in giriş sırasıyla 6 grup, madde madde "seçilmemiş / girilmemiş / yüklenmemiş")
export function mebAdimKontrol(k) {
  const v = k.mebEvrak || {}, ev = k.evrak || {}, g = (S.gruplar || []).find(x => x.id === k.teorikGrup && x.donem && x.grupNo && x.sube);
  const m = (ok, ad, eksik) => ({ ok: !!ok, ad, eksik: ok ? '' : eksik }), cep = String(k.tel || '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
  const blok = (b, tur) => [m(b && b.veren, 'Belgeyi veren kurum', 'girilmemiş'), ...(tur ? [m(b && b.tur && OGRENIM_BELGELERI.includes(b.tur), 'Belge türü', b && b.tur ? 'MEBBİS listesinden yeniden seçilmeli' : 'seçilmemiş')] : []), m(b && b.tarih, 'Belge tarihi', 'girilmemiş'), m(b && b.sayi, 'Belge sayısı', 'girilmemiş')];
  return [
    { ad: 'Dönem kaydı', l: [m(g, 'Dönem, grup ve şube', 'seçilmemiş'), m(k.sinif && k.sinif !== 'B-EN', 'İstenen sertifika', k.sinif === 'B-EN' ? 'B Engelli: MEBBİS’te elle seçilir' : 'seçilmemiş'), m(/^5\d{9}$/.test(cep), 'Cep telefonu', 'girilmemiş'), m(k.kimlikSeri, 'Kimlik kartı seri no', 'girilmemiş')] },
    { ad: 'Evrak', l: [m(k.foto, 'Biyometrik fotoğraf', 'yüklenmemiş'), m(ev.ogrenim, 'Öğrenim belgesi', 'teslim alınmamış'), m(ev.saglik, 'Sağlık raporu', 'teslim alınmamış'), m(ev.adli, 'Adli sicil kaydı', 'teslim alınmamış'), m(v.parmak, 'Parmak izi / imza', 'girilmemiş'), m(k.sozlesmeImza || ev.sozlesme, 'Sözleşme', 'imzalanmamış'), m(ev.kimlik, 'Kimlik fotokopisi', 'teslim alınmamış'), m(k.adres, 'Adres beyanı', 'adres girilmemiş')] },
    { ad: 'Öğrenim', l: blok(v.ogrenim, true) },
    { ad: 'Sağlık', l: [m(true, `Özür durumu: ${(v.saglik && v.saglik.ozur) || ENGEL_VARSAYILAN(k.sinif)}`, ''), m(k.saglikRapor && k.saglikRapor.tarih, 'Rapor tarihi', 'girilmemiş'), m((v.saglik && v.saglik.refNo) || (k.saglikRapor && k.saglikRapor.no), 'Rapor no / e-Nabız referans no', 'girilmemiş')] },
    { ad: 'Adli sicil', l: blok(v.adli) },
    { ad: 'Adres', l: [m(k.adres, 'Açık adres', 'girilmemiş')], not: 'MEBBİS adres beyanında il › ilçe › mahalle › cadde › dış ve iç kapı UAVT listelerinden seçilir (MEB-066).' },
  ];
}
export function mebAdimHtml(k) {
  const gr = mebAdimKontrol(k);
  return `<div class="adim-kontrol"><p class="et" style="margin:14px 0 6px">Adım adım (MEBBİS sırası)</p>${gr.map(x => { const n = x.l.filter(y => y.ok).length, tam = n === x.l.length;
    return `<details ${tam ? '' : 'open'}><summary>${isaret(tam ? 'tamam' : 'uyari', 16)}<b>${e(x.ad)}</b><small>${n}/${x.l.length}</small></summary><ul>${x.l.map(y => `<li class="${y.ok ? 'ok' : 'yok'}"><span>${e(y.ad)}</span>${y.ok ? '' : `<small>${e(y.eksik)}</small>`}</li>`).join('')}</ul>${x.not ? `<small class="adim-not">${e(x.not)}</small>` : ''}</details>`; }).join('')}</div>`;
}
