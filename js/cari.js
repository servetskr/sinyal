// PAR-056, PAR-057: gider (alış) faturası ve tedarikçi carisi.
// Tedarikçi: S.tedarikciler [{ id, ad, vkn, vergiDairesi, tel, not }] (kira, akaryakıt istasyonu, tamirci, sigortacı…).
// Alış faturası: S.alisFaturalari [{ id, tedarikci, belgeNo, tarih, tutar (KDV dahil), kdv (%), kategori, aciklama, vade, odemeler: [hareket id], kim }].
// Ödenmiş gider: kasa hareketi (S.hareket, tür Gider) faturaya bağlanır (h.alis); vadeli gider kasaya girmez, tedarikçiye borç olur, "Öde" ile kasadan çıkar.
// Tedarikçi bakiyesi = faturalar − ödemeler. Müşavir paketine "Alış faturaları" sayfası (sayfalar5.js).
// Belge görseli: dosya deposu (Firebase Storage kuralı) gelince eklenecek; şimdilik belge no ve tedarikçi VKN'si tutulur.
import { S, kaydet, gun, fark, islem, oturum, sb, tutarOku, YONTEMLER, yontemAd, geriAlNoktasi } from './veri.js?v=234';
import { e, tl, ik, rozet, tarih, pencere, kapatPencere, bildir, bos } from './ui.js?v=234';

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
const kdvAyir = (tutar, oran) => { const m = Math.round(tutar / (1 + oran / 100) * 100) / 100; return [m, Math.round((tutar - m) * 100) / 100]; };

// Gelir/gider ekle penceresindeki fatura bölümü (yalnız giderde görünür)
export function faturaAlaniHtml() {
  const l = tedarikciler();
  return `<fieldset class="tam alis-alan" data-alis><legend>Fatura <small>isteğe bağlı · müşavir paketine gider</small></legend><div class="form-izgara">
    <div class="alan"><label for="al-t">Tedarikçi</label><input id="al-t" name="alTed" list="al-ted-l" maxlength="80" placeholder="Örn. Petrol Ofisi · Bayi"><datalist id="al-ted-l">${l.map(x => `<option value="${e(x.ad)}">`).join('')}</datalist></div>
    <div class="alan"><label for="al-v">Tedarikçi VKN / TC</label><input id="al-v" name="alVkn" inputmode="numeric" maxlength="11" placeholder="yeni tedarikçide"></div>
    <div class="alan"><label for="al-n">Belge no</label><input id="al-n" name="alNo" maxlength="30" autocomplete="off"></div>
    <div class="alan"><label for="al-k">KDV</label><select id="al-k" name="alKdv">${[20, 10, 1, 0].map(n => `<option value="${n}">%${n}</option>`).join('')}</select></div>
    <div class="alan tam"><span class="et">Ödeme</span><div class="secim"><label><input type="radio" name="alOdeme" value="simdi" checked><span>Şimdi ödendi</span></label><label><input type="radio" name="alOdeme" value="vadeli"><span>Vadeli (tedarikçiye borç)</span></label></div></div>
    <div class="alan" data-al-vade hidden><label for="al-vd">Vade</label><input id="al-vd" name="alVade" type="date" value="${gun(30)}"></div></div></fieldset>`;
}
export function faturaAlaniBagla(f) {
  const a = f.querySelector('[data-alis]'); if (!a) return;
  const g = () => { const gider = (f.querySelector('[name=tur]:checked') || {}).value !== 'Gelir', vadeli = (f.querySelector('[name=alOdeme]:checked') || {}).value === 'vadeli'; a.hidden = !gider; f.querySelector('[data-al-vade]').hidden = !vadeli;
    ['y', 'hesap'].forEach(n => { const x = f.querySelector(`[name=${n}]`); if (x) x.closest('.alan').style.opacity = vadeli ? '.45' : ''; }); };
  f.addEventListener('change', g); g();
  f.alTed.addEventListener('change', () => { const t = tedarikciler().find(x => x.ad.toLocaleLowerCase('tr') === f.alTed.value.trim().toLocaleLowerCase('tr')); if (t && t.vkn) f.alVkn.value = t.vkn; });
}
// Formdan alış faturası: { vadeli } döner; vadeliyse kasa hareketi yazılmaz. Fatura alanı boşsa null (yalnız kasa hareketi).
export function faturaOku(f, { tutar, tarih: t, kategori, aciklama }) {
  if (!f.querySelector('[data-alis]') || (f.querySelector('[name=tur]:checked') || {}).value === 'Gelir') return null;
  const ad = f.alTed.value.trim().replace(/\s+/g, ' '), no = f.alNo.value.trim(), vadeli = (f.querySelector('[name=alOdeme]:checked') || {}).value === 'vadeli';
  if (!ad && !no && !vadeli) return null;
  if (!ad) return { hata: 'Tedarikçinin adını yazın' };
  if (vadeli && !f.alVade.value) return { hata: 'Vade tarihini girin' };
  let td = tedarikciler().find(x => x.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'));
  if (!td) { td = { id: 'td' + Date.now().toString(36), ad, ...(f.alVkn.value.trim() ? { vkn: f.alVkn.value.replace(/\D/g, '') } : {}) }; tedarikciler().push(td); islem('Tedarikçi ekledi', ad); }
  else if (!td.vkn && f.alVkn.value.trim()) td.vkn = f.alVkn.value.replace(/\D/g, '');
  const a = { id: 'al' + Date.now().toString(36), tedarikci: td.id, belgeNo: no, tarih: t, tutar, kdv: +f.alKdv.value, kategori, aciklama, vade: vadeli ? f.alVade.value : t, odemeler: [], kim: oturum.kullanici ? oturum.kullanici.ad : '' };
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
    ${acik.length ? `<div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Tedarikçi</th><th>Belge</th><th>Vade</th><th class="sag">Kalan</th><th></th></tr></thead><tbody>${acik.map(a => { const t = tedarikci(a.tedarikci) || {}; return `<tr><td class="m-tam"><b>${e(t.ad || '—')}</b><small style="display:block;color:var(--soluk)">${e(a.kategori || '')}${a.aciklama ? ' · ' + e(a.aciklama) : ''}</small></td><td class="mono">${e(a.belgeNo || '—')}</td><td>${fark(a.vade) < 0 ? rozet(tarih(a.vade) + ' geçti', 'kirmizi') : tarih(a.vade)}</td><td class="sag sayi">${tl(alisKalan(a))}</td><td class="sag"><button class="dg dg-ana dg-kucuk" data-al-ode="${e(a.id)}">Öde</button></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="ipucu" style="margin:0 20px 12px">Ödenmemiş gider faturası yok.</p>'}
    <ul class="liste">${l.map(t => { const n = alislar().filter(a => a.tedarikci === t.id && !a.iptal); return `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(t.ad)}</b><small style="display:block;color:var(--soluk)">${t.vkn ? 'VKN ' + e(t.vkn) + ' · ' : ''}${n.length} fatura · toplam ${tl(n.reduce((s, a) => s + (+a.tutar || 0), 0))}</small></div><span class="sag">${tedarikciBakiye(t.id) ? rozet('Borç ' + tl(tedarikciBakiye(t.id)), 'uyari') : rozet('Borç yok', 'yesil')} <button class="dg dg-hafif dg-kucuk" data-td-duz="${e(t.id)}">Düzenle</button></span></li>`; }).join('') || `<li>${bos('Tedarikçi yok', 'Gider eklerken fatura bölümüne tedarikçiyi yazın ya da buradan ekleyin.')}</li>`}</ul></div>`;
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
      const hid = 'h' + Date.now(); S.hareket.unshift({ id: hid, tarih: f.tarih.value || gun(0), tur: 'Gider', kategori: a.kategori || 'Diğer', aciklama: (t.ad || 'Tedarikçi') + (a.belgeNo ? ' · ' + a.belgeNo : '') + ' ödemesi', tutar: v, yontem: f.y.value, alis: a.id, tedarikci: a.tedarikci });
      a.odemeler = [...(a.odemeler || []), hid]; islem('Tedarikçiye ödedi', (t.ad || '') + ' · ' + tl(v)); kaydet(); kapatPencere(); bildir(tl(v) + ' ödendi; kalan ' + tl(alisKalan(a))); sonra && sonra(); }); } });
}
export function cariBagla(k, yenile) {
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-td-ekle]')) return tedarikciPenceresi(null, yenile);
    const d = ev.target.closest('[data-td-duz]'); if (d) return tedarikciPenceresi(d.dataset.tdDuz, yenile);
    const o = ev.target.closest('[data-al-ode]'); if (o) return odePenceresi(o.dataset.alOde, yenile);
  });
}
// Müşavir paketi: ayın alış faturaları (tedarikçi, VKN, belge no, matrah, KDV, toplam, ödeme)
export function alisSatirlari(buAy) {
  return [['Tarih', 'Tedarikçi', 'VKN / TC', 'Belge no', 'Kategori', 'Matrah', 'KDV oranı (%)', 'KDV', 'Toplam', 'Ödenen', 'Kalan', 'Vade'],
    ...alislar().filter(a => !a.iptal && buAy(a.tarih)).sort((x, y) => x.tarih.localeCompare(y.tarih)).map(a => { const t = tedarikci(a.tedarikci) || {}, [m, k] = kdvAyir(+a.tutar || 0, +a.kdv || 0); return [a.tarih.split('-').reverse().join('.'), t.ad || '', t.vkn || '', a.belgeNo || '', a.kategori || '', m, a.kdv, k, a.tutar, odenen(a), alisKalan(a), a.vade ? a.vade.split('-').reverse().join('.') : '']; })];
}
