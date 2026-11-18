// PAR-056, PAR-057: gider (alış) faturası ve tedarikçi carisi.
// Tedarikçi: S.tedarikciler [{ id, ad, vkn, vergiDairesi, tel, not }] (kira, akaryakıt istasyonu, tamirci, sigortacı…).
// Alış faturası: S.alisFaturalari [{ id, tedarikci, belgeNo, tarih, tutar (KDV dahil), kdv (%), kategori, aciklama, vade, odemeler: [hareket id], kim }].
// Ödenmiş gider: kasa hareketi (S.hareket, tür Gider) faturaya bağlanır (h.alis); vadeli gider kasaya girmez, tedarikçiye borç olur, "Öde" ile kasadan çıkar.
// Tedarikçi bakiyesi = faturalar − ödemeler. Müşavir paketine "Alış faturaları" sayfası (sayfalar5.js).
// Belge görseli (a.gorsel = { veri: data URL, tur: 'resim'|'pdf', ad, tarih }): fotoğraf ve imzalar gibi kurs verisinde durur; büyük metin
// bulut.js'te kurslar/{k}/dosyalar'a ayrı belge olarak gider (Firebase Storage gerekmez). Fotoğraf 1400 px JPEG'e küçültülür, PDF en çok 700 KB.
import { S, kaydet, gun, fark, islem, oturum, sb, tutarOku, YONTEMLER, yontemAd, geriAlNoktasi } from './veri.js?v=234';
import { e, tl, ik, rozet, tarih, pencere, kapatPencere, bildir, bos } from './ui.js?v=234';
import { fotoAl } from './sayfalar1.js?v=234';

// KAY-022 (SOR-060/061): firma carisi — kurumsal eğitimde ücreti firma öder; öğrenci k.firma ile bağlanır. S.firmalar [{ id, ad, vkn, vergiDairesi, tel, yetkili }]
export const firmalar = () => (S.firmalar = S.firmalar || []);
export const firma = id => firmalar().find(x => x.id === id);
export const firmaOgrencileri = id => sb(S.kursiyerler).filter(k => k.firma === id);
export function firmaEkle(ad) { ad = String(ad || '').trim().replace(/\s+/g, ' '); if (!ad) return null; const v = firmalar().find(y => y.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr')); if (v) return v; const y = { id: 'fr' + Date.now().toString(36), ad }; firmalar().push(y); islem('Firma ekledi', ad); return y; }
export const tedarikciler = () => (S.tedarikciler = S.tedarikciler || []);
export const alislar = () => (S.alisFaturalari = S.alisFaturalari || []);
export const tedarikci = id => tedarikciler().find(x => x.id === id);
const odenen = a => (a.odemeler || []).map(id => S.hareket.find(h => h.id === id)).filter(h => h && !h.iptal).reduce((t, h) => t + (+h.tutar || 0), 0);
export const alisKalan = a => Math.max(0, (+a.tutar || 0) - odenen(a));
export const tedarikciBakiye = id => alislar().filter(a => a.tedarikci === id && !a.iptal).reduce((t, a) => t + alisKalan(a), 0);
// PAR-056: belge görseli okuma (fotoğraf ya da PDF). Hata iletisi x.message'da (HEIC ve bozuk dosya için KAY-115 iletisi).
const PDF_SINIR = 700 * 1024;
export async function belgeGorseliOku(fl) {
  if (!fl) throw new Error('Dosya seçin');
  if (/pdf/i.test(fl.type || '') || /\.pdf$/i.test(fl.name || '')) {
    if (fl.size > PDF_SINIR) throw new Error('PDF en çok 700 KB olabilir; faturanın fotoğrafını çekip yükleyin');
    const veri = await new Promise((ok, red) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = red; r.readAsDataURL(fl); });
    if (!/^data:application\/pdf;base64,/.test(veri)) throw new Error('PDF okunamadı');
    return { veri, tur: 'pdf', ad: String(fl.name || '').slice(0, 80), tarih: gun(0) };
  }
  return { veri: await fotoAl(fl, 1400), tur: 'resim', ad: String(fl.name || '').slice(0, 80), tarih: gun(0) };
}
export function gorselGoster(a) {
  const g = a && a.gorsel; if (!g || !g.veri) return;
  const t = tedarikci(a.tedarikci) || {};
  pencere({ baslik: 'Fatura · ' + (t.ad || '') + (a.belgeNo ? ' · ' + a.belgeNo : ''), genis: g.tur === 'pdf', taslak: false,
    icerik: g.tur === 'pdf' ? `<iframe src="${g.veri}" style="width:100%;height:60vh;border:0" title="Fatura"></iframe>` : `<img src="${g.veri}" alt="Fatura görseli" style="max-width:100%;border-radius:8px">`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
}
const kdvAyir = (tutar, oran) => { const m = Math.round(tutar / (1 + oran / 100) * 100) / 100; return [m, Math.round((tutar - m) * 100) / 100]; };

// PAR-056 (mali cevaplar 9, 19): KDV indirimi kategoriye göre değil belgeye göre. Her gider faturasında KDV oranı girilir; KDV'li faturası olan her
// işletme gideri indirilir (KDVK m.29/1-a). Sürücü kursu eğitim araçlarını işletir: eğitim aracının alış, yakıt ve bakım KDV'si indirilir; yöneticinin
// binek aracında KDV indirilmez (KDVK m.30/b; GİB özelgesi 82476449-010-4502, 29/03/2023). Hareket/alış faturası: kdv (%), kdvIndirim: false (binek).
export const ARAC_KAT_RE = /yakıt|akaryakıt|bakım|lastik|araç|arac|muayene|kasko|tamir|servis/i;
export const KDV_SECENEK = [['', 'Faturasız / KDV yok'], ['20', '%20'], ['10', '%10'], ['1', '%1'], ['0', '%0 (istisna)']];
export function giderKdvHtml(h = {}) {
  const v = h.kdv == null ? '' : String(h.kdv);
  return `<div class="alan" data-gider-kdv><label for="gk-kdv">Faturadaki KDV</label><select id="gk-kdv" name="kdv">${KDV_SECENEK.map(([d, t]) => `<option value="${d}" ${d === v ? 'selected' : ''}>${t}</option>`).join('')}</select><small style="color:var(--soluk)">KDV’li faturası olan her gider indirilir</small></div>
    <div class="alan tam" data-arac-soru hidden><span class="et">Eğitim aracı mı?</span><div class="secim"><label><input type="radio" name="egitimArac" value="evet" ${h.kdvIndirim === false ? '' : 'checked'}><span>Evet, eğitim aracı (KDV indirilir)</span></label><label><input type="radio" name="egitimArac" value="hayir" ${h.kdvIndirim === false ? 'checked' : ''}><span>Hayır, yönetici aracı (KDV indirilmez)</span></label></div></div>`;
}
// form: tur (Gider/Gelir), kat (kategori), kdv, egitimArac; araç sorusu araç giderinde ve KDV'li faturada görünür
export function giderKdvBagla(f) {
  const g = () => { const gider = (f.querySelector('[name=tur]:checked') || { value: 'Gider' }).value !== 'Gelir', kat = (f.kat || {}).value || '', a = f.querySelector('[data-arac-soru]'), k = f.querySelector('[data-gider-kdv]');
    if (k) k.hidden = !gider; if (a) a.hidden = !(gider && ARAC_KAT_RE.test(kat) && f.kdv && +f.kdv.value > 0); };
  f.addEventListener('change', g); g();
}
export function giderKdvOku(f) {
  if (!f.kdv || f.kdv.value === '' || (f.querySelector('[name=tur]:checked') || {}).value === 'Gelir') return {};
  const arac = ARAC_KAT_RE.test((f.kat || {}).value || '') && +f.kdv.value > 0 && (f.querySelector('[name=egitimArac]:checked') || {}).value === 'hayir';
  return { kdv: +f.kdv.value, ...(arac ? { kdvIndirim: false } : {}) };
}
// Gelir/gider ekle penceresindeki fatura bölümü (yalnız giderde görünür)
export function faturaAlaniHtml() {
  const l = tedarikciler();
  return `<fieldset class="tam alis-alan" data-alis><legend>Fatura <small>isteğe bağlı · müşavir paketine gider</small></legend><div class="form-izgara">
    <div class="alan"><label for="al-t">Tedarikçi</label><input id="al-t" name="alTed" list="al-ted-l" maxlength="80" placeholder="Örn. Petrol Ofisi · Bayi"><datalist id="al-ted-l">${l.map(x => `<option value="${e(x.ad)}">`).join('')}</datalist></div>
    <div class="alan"><label for="al-v">Tedarikçi VKN / TC</label><input id="al-v" name="alVkn" inputmode="numeric" maxlength="11" placeholder="yeni tedarikçide"></div>
    <div class="alan"><label for="al-n">Belge no</label><input id="al-n" name="alNo" maxlength="30" autocomplete="off"></div>
    <div class="alan tam"><span class="et">Ödeme</span><div class="secim"><label><input type="radio" name="alOdeme" value="simdi" checked><span>Şimdi ödendi</span></label><label><input type="radio" name="alOdeme" value="vadeli"><span>Vadeli (tedarikçiye borç)</span></label></div></div>
    <div class="alan" data-al-vade hidden><label for="al-vd">Vade</label><input id="al-vd" name="alVade" type="date" value="${gun(30)}"></div>
    <div class="alan tam"><label for="al-g">Belge görseli <small style="color:var(--soluk);font-weight:400">fotoğraf ya da PDF · isteğe bağlı</small></label><input id="al-g" name="alGorsel" type="file" accept="image/*,application/pdf"><small data-al-g-durum style="color:var(--soluk)"></small></div></div></fieldset>`;
}
export function faturaAlaniBagla(f) {
  const a = f.querySelector('[data-alis]'); if (!a) return;
  const g = () => { const gider = (f.querySelector('[name=tur]:checked') || {}).value !== 'Gelir', vadeli = (f.querySelector('[name=alOdeme]:checked') || {}).value === 'vadeli'; a.hidden = !gider; f.querySelector('[data-al-vade]').hidden = !vadeli;
    ['y', 'hesap'].forEach(n => { const x = f.querySelector(`[name=${n}]`); if (x) x.closest('.alan').style.opacity = vadeli ? '.45' : ''; }); };
  f.addEventListener('change', g); g();
  // belge görseli seçilince hemen okunur (küçültme zaman alır); kaydette f._alGorsel kullanılır
  f.alGorsel.addEventListener('change', () => { const fl = f.alGorsel.files[0], dm = f.querySelector('[data-al-g-durum]'); f._alGorsel = null; if (!fl) { dm.textContent = ''; return; }
    f.dataset.alOkunuyor = '1'; dm.textContent = 'Hazırlanıyor…';
    belgeGorseliOku(fl).then(g => { f._alGorsel = g; dm.textContent = (g.tur === 'pdf' ? 'PDF' : 'Fotoğraf') + ' hazır · ' + Math.round(g.veri.length * 0.75 / 1024) + ' KB'; })
      .catch(x => { f.alGorsel.value = ''; dm.textContent = ''; bildir(x.message || 'Dosya okunamadı', 'uyari'); }).finally(() => { delete f.dataset.alOkunuyor; }); });
  f.alTed.addEventListener('change', () => { const t = tedarikciler().find(x => x.ad.toLocaleLowerCase('tr') === f.alTed.value.trim().toLocaleLowerCase('tr')); if (t && t.vkn) f.alVkn.value = t.vkn; });
}
// Formdan alış faturası: { vadeli } döner; vadeliyse kasa hareketi yazılmaz. Fatura alanı boşsa null (yalnız kasa hareketi).
export function faturaOku(f, { tutar, tarih: t, kategori, aciklama }) {
  if (!f.querySelector('[data-alis]') || (f.querySelector('[name=tur]:checked') || {}).value === 'Gelir') return null;
  const ad = f.alTed.value.trim().replace(/\s+/g, ' '), no = f.alNo.value.trim(), vadeli = (f.querySelector('[name=alOdeme]:checked') || {}).value === 'vadeli';
  if (f.dataset.alOkunuyor) return { hata: 'Belge görseli hazırlanıyor; biraz sonra yeniden Kaydet’e basın' };
  const gorsel = f._alGorsel || null;
  if (!ad && !no && !vadeli && !gorsel) return null;
  if (!ad) return { hata: 'Tedarikçinin adını yazın' };
  if (vadeli && !f.alVade.value) return { hata: 'Vade tarihini girin' };
  let td = tedarikciler().find(x => x.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'));
  if (!td) { td = { id: 'td' + Date.now().toString(36), ad, ...(f.alVkn.value.trim() ? { vkn: f.alVkn.value.replace(/\D/g, '') } : {}) }; tedarikciler().push(td); islem('Tedarikçi ekledi', ad); }
  else if (!td.vkn && f.alVkn.value.trim()) td.vkn = f.alVkn.value.replace(/\D/g, '');
  const kd = giderKdvOku(f), a = { id: 'al' + Date.now().toString(36), tedarikci: td.id, belgeNo: no, tarih: t, tutar, kdv: kd.kdv || 0, ...(kd.kdvIndirim === false ? { kdvIndirim: false } : {}), kategori, aciklama, vade: vadeli ? f.alVade.value : t, odemeler: [], kim: oturum.kullanici ? oturum.kullanici.ad : '', ...(gorsel ? { gorsel } : {}) };
  alislar().push(a); islem(vadeli ? 'Vadeli gider faturası girdi' : 'Gider faturası girdi', `${ad}${no ? ' · ' + no : ''} · ${tl(tutar)}`);
  return { a, vadeli };
}

// Kasa › Tedarikçiler sekmesi
function firmaHtml(kalanBorc) {
  const l = firmalar(); if (!l.length) return '';
  return `<div class="kart" style="margin-bottom:16px"><div class="kart-bas"><h3>Firmalar</h3><small>${l.length} firma · kurumsal eğitimde ücreti firma öder</small></div><ul class="liste">${l.map(f => { const o = firmaOgrencileri(f.id), b = o.reduce((t, k) => t + (kalanBorc ? kalanBorc(k) : 0), 0);
    return `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(f.ad)}</b><small style="display:block;color:var(--soluk)">${o.length} öğrenci${o.length ? ': ' + o.slice(0, 4).map(k => e(k.ad + ' ' + k.soyad)).join(', ') + (o.length > 4 ? '…' : '') : ''}</small></div><span class="sag">${b ? `<b class="sayi">${tl(b)}</b>` : rozet('Borç yok', 'yesil')}</span></li>`; }).join('')}</ul></div>`;
}
export function cariHtml(kalanBorc) {
  return firmaHtml(kalanBorc) + tedarikciHtml();
}
function tedarikciHtml() {
  const l = tedarikciler().slice().sort((x, y) => tedarikciBakiye(y.id) - tedarikciBakiye(x.id) || x.ad.localeCompare(y.ad, 'tr')), acik = alislar().filter(a => !a.iptal && alisKalan(a) > 0).sort((x, y) => String(x.vade).localeCompare(y.vade));
  const top = acik.reduce((t, a) => t + alisKalan(a), 0), gec = acik.filter(a => fark(a.vade) < 0);
  return `<div class="kart"><div class="kart-bas"><h3>Tedarikçiler</h3><small>${l.length} tedarikçi · borç <b>${tl(top)}</b>${gec.length ? ` · ${gec.length} faturanın vadesi geçti` : ''}</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-td-ekle>${ik('arti')}Tedarikçi ekle</button></div></div>
    ${acik.length ? `<div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Tedarikçi</th><th>Belge</th><th>Vade</th><th class="sag">Kalan</th><th>Belge</th><th></th></tr></thead><tbody>${acik.map(a => { const t = tedarikci(a.tedarikci) || {}; return `<tr><td class="m-tam"><b>${e(t.ad || '—')}</b><small style="display:block;color:var(--soluk)">${e(a.kategori || '')}${a.aciklama ? ' · ' + e(a.aciklama) : ''}</small></td><td class="mono">${e(a.belgeNo || '—')}</td><td>${fark(a.vade) < 0 ? rozet(tarih(a.vade) + ' geçti', 'kirmizi') : tarih(a.vade)}</td><td class="sag sayi">${tl(alisKalan(a))}</td><td>${gorselDugme(a)}</td><td class="sag"><button class="dg dg-ana dg-kucuk" data-al-ode="${e(a.id)}">Öde</button></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="ipucu" style="margin:0 20px 12px">Ödenmemiş gider faturası yok.</p>'}
    <ul class="liste cari-td">${l.map(t => { const n = alislar().filter(a => a.tedarikci === t.id && !a.iptal); return `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(t.ad)}</b><small style="display:block;color:var(--soluk)">${t.vkn ? 'VKN ' + e(t.vkn) + ' · ' : ''}${n.length} fatura · toplam ${tl(n.reduce((s, a) => s + (+a.tutar || 0), 0))}</small></div><span class="sag">${tedarikciBakiye(t.id) ? rozet('Borç ' + tl(tedarikciBakiye(t.id)), 'uyari') : rozet('Borç yok', 'yesil')}${n.length ? ` <button class="dg dg-hafif dg-kucuk" data-td-fat="${e(t.id)}">Faturalar</button>` : ''} <button class="dg dg-hafif dg-kucuk" data-td-duz="${e(t.id)}">Düzenle</button></span></li>`; }).join('') || `<li>${bos('Tedarikçi yok', 'Gider eklerken fatura bölümüne tedarikçiyi yazın ya da buradan ekleyin.')}</li>`}</ul></div>`;
}
// PAR-056: faturada görsel varsa "Gör", yoksa "Ekle" (sonradan eklenebilir; değiştirilemez, dosya içeriği kanıttır)
const gorselDugme = a => a.gorsel && a.gorsel.veri ? `<button class="dg dg-hafif dg-kucuk" data-al-gor="${e(a.id)}">${ik('goz')}Gör</button>` : `<label class="dg dg-hafif dg-kucuk" style="cursor:pointer">${ik('arti')}Ekle<input type="file" accept="image/*,application/pdf" data-al-gorsel="${e(a.id)}" hidden></label>`;
function faturalarPenceresi(id) {
  const t = tedarikci(id); if (!t) return;
  const l = alislar().filter(a => a.tedarikci === id && !a.iptal).sort((x, y) => String(y.tarih).localeCompare(String(x.tarih)));
  pencere({ baslik: 'Faturalar · ' + t.ad, taslak: false, icerik: `<ul class="liste" data-td-fat-l>${l.map(a => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(a.belgeNo || 'Belgesiz')} · ${tl(+a.tutar || 0)}</b><small style="display:block;color:var(--soluk)">${tarih(a.tarih)}${a.kategori ? ' · ' + e(a.kategori) : ''}${alisKalan(a) ? ' · kalan ' + tl(alisKalan(a)) : ' · ödendi'}${a.gorsel ? ' · ' + (a.gorsel.tur === 'pdf' ? 'PDF' : 'fotoğraf') + ' ' + tarih(a.gorsel.tarih) : ''}</small></div><span class="sag">${gorselDugme(a)}</span></li>`).join('') || `<li>${bos('Fatura yok', '')}</li>`}</ul>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>',
    onAc(p) { gorselBagla(p, () => { kapatPencere(); faturalarPenceresi(id); }); } });
}
function gorselBagla(k, sonra) {
  k.addEventListener('click', ev => { const g = ev.target.closest('[data-al-gor]'); if (g) gorselGoster(alislar().find(x => x.id === g.dataset.alGor)); });
  k.addEventListener('change', ev => { const i = ev.target.closest('[data-al-gorsel]'); if (!i || !i.files[0]) return; const a = alislar().find(x => x.id === i.dataset.alGorsel); if (!a || a.gorsel) return;
    belgeGorseliOku(i.files[0]).then(g => { a.gorsel = g; const t = tedarikci(a.tedarikci) || {}; islem('Fatura görseli ekledi', (t.ad || '') + (a.belgeNo ? ' · ' + a.belgeNo : '')); kaydet(); bildir('Fatura görseli eklendi', 'tamam'); sonra && sonra(); })
      .catch(x => { i.value = ''; bildir(x.message || 'Dosya okunamadı', 'uyari'); }); });
}
function tedarikciPenceresi(id, sonra) {
  const t = id ? tedarikci(id) : null, x = t || { ad: '', vkn: '', vergiDairesi: '', tel: '', not: '' };
  pencere({ baslik: t ? t.ad : 'Tedarikçi ekle', taslak: false, icerik: `<form id="f-td" class="form-izgara"><div class="alan tam"><label for="td-a">Ad / ünvan</label><input id="td-a" name="ad" maxlength="80" required value="${e(x.ad)}"></div>
      <div class="alan"><label for="td-v">VKN / TC</label><input id="td-v" name="vkn" inputmode="numeric" maxlength="11" value="${e(x.vkn || '')}"></div><div class="alan"><label for="td-d">Vergi dairesi</label><input id="td-d" name="vd" maxlength="60" value="${e(x.vergiDairesi || '')}"></div>
      <div class="alan"><label for="td-t">Telefon</label><input id="td-t" name="tel" inputmode="tel" maxlength="20" value="${e(x.tel || '')}"></div><div class="alan"><label for="td-n">Not</label><input id="td-n" name="not" maxlength="120" value="${e(x.not || '')}" placeholder="Örn. kira · her ayın 5'i"></div></form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-td">Kaydet</button>',
    onAc(p) { p.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target, ad = f.ad.value.trim().replace(/\s+/g, ' '); if (!ad) return bildir('Adını yazın', 'uyari');
      if (tedarikciler().some(y => y !== t && y.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'))) return bildir('Bu adla tedarikçi var', 'uyari');
      const y = t || { id: 'td' + Date.now().toString(36) }; Object.assign(y, { ad, vkn: f.vkn.value.replace(/\D/g, ''), vergiDairesi: f.vd.value.trim(), tel: f.tel.value.trim(), not: f.not.value.trim() }); if (!t) tedarikciler().push(y);
      islem(t ? 'Tedarikçiyi düzenledi' : 'Tedarikçi ekledi', ad); kaydet(); kapatPencere(); bildir('Kaydedildi'); sonra && sonra(); }); } });
}
function odePenceresi(id, sonra) {
  const a = alislar().find(x => x.id === id); if (!a) return; const t = tedarikci(a.tedarikci) || {}, kal = alisKalan(a);
  pencere({ baslik: 'Tedarikçiye öde · ' + (t.ad || ''), taslak: false, icerik: `<form id="f-alo" class="form-izgara"><p class="tam" style="font-size:14px">${e(a.belgeNo || 'Belgesiz')} · ${tarih(a.tarih)} · kalan <b>${tl(kal)}</b></p>
      <div class="alan"><label for="alo-t">Tutar (₺)</label><input id="alo-t" name="tutar" inputmode="decimal" value="${kal}"></div><div class="alan"><label for="alo-d">Tarih</label><input id="alo-d" name="tarih" type="date" value="${gun(0)}" max="${gun(0)}"></div>
      <div class="alan"><label for="alo-y">Yöntem</label><select id="alo-y" name="y">${YONTEMLER.map(y => `<option value="${y}" ${y === 'Havale' ? 'selected' : ''}>${yontemAd(y)}</option>`).join('')}</select></div></form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-alo">Ödendi</button>',
    onAc(p) { p.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target, v = tutarOku(f.tutar.value); if (!v || v <= 0) return bildir('Tutarı girin', 'uyari'); if (v > kal + 0.001) return bildir('Kalan borçtan (' + tl(kal) + ') fazla ödenemez', 'uyari');
      if ((S.gunSonu || []).includes(f.tarih.value)) return bildir('Bu gün kapatıldı; kayıt eklenemez', 'uyari'); geriAlNoktasi();
      const hid = 'h' + Date.now(); S.hareket.unshift({ id: hid, tarih: f.tarih.value || gun(0), tur: 'Gider', kategori: a.kategori || 'Diğer', aciklama: (t.ad || 'Tedarikçi') + (a.belgeNo ? ' · ' + a.belgeNo : '') + ' ödemesi', tutar: v, yontem: f.y.value, alis: a.id, tedarikci: a.tedarikci, ...(a.kdv != null ? { kdv: +a.kdv || 0 } : {}), ...(a.kdvIndirim === false ? { kdvIndirim: false } : {}) });
      a.odemeler = [...(a.odemeler || []), hid]; islem('Tedarikçiye ödedi', (t.ad || '') + ' · ' + tl(v)); kaydet(); kapatPencere(); bildir(tl(v) + ' ödendi; kalan ' + tl(alisKalan(a))); sonra && sonra(); }); } });
}
export function cariBagla(k, yenile) {
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-td-ekle]')) return tedarikciPenceresi(null, yenile);
    const d = ev.target.closest('[data-td-duz]'); if (d) return tedarikciPenceresi(d.dataset.tdDuz, yenile);
    const o = ev.target.closest('[data-al-ode]'); if (o) return odePenceresi(o.dataset.alOde, yenile);
    const ft = ev.target.closest('[data-td-fat]'); if (ft) return faturalarPenceresi(ft.dataset.tdFat);
  });
  gorselBagla(k, yenile);
}
// Müşavir paketi: ayın alış faturaları (tedarikçi, VKN, belge no, matrah, KDV, toplam, ödeme)
export function alisSatirlari(buAy) {
  return [['Tarih', 'Tedarikçi', 'VKN / TC', 'Belge no', 'Kategori', 'Matrah', 'KDV oranı (%)', 'KDV', 'KDV indirilir mi', 'Toplam', 'Ödenen', 'Kalan', 'Vade', 'Belge görseli'],
    ...alislar().filter(a => !a.iptal && buAy(a.tarih)).sort((x, y) => x.tarih.localeCompare(y.tarih)).map(a => { const t = tedarikci(a.tedarikci) || {}, [m, k] = kdvAyir(+a.tutar || 0, +a.kdv || 0); return [a.tarih.split('-').reverse().join('.'), t.ad || '', t.vkn || '', a.belgeNo || '', a.kategori || '', m, a.kdv, k, !(+a.kdv > 0) ? '' : a.kdvIndirim === false ? 'Hayır (binek, KDVK 30/b)' : 'Evet', a.tutar, odenen(a), alisKalan(a), a.vade ? a.vade.split('-').reverse().join('.') : '', a.gorsel ? (a.gorsel.tur === 'pdf' ? 'PDF' : 'Fotoğraf') : '']; })];
}
