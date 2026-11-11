// Sinyal Yönetim: Sinyal'in kendi gelir paylaşımı (satış ortağına %40 pay, borç ve anapara iadesi).
// Kurs hesaplarından ayrı bir hesapta çalışır (S.kurs.tur === 'yonetim'); kurs ekranları açılmaz.
// Üyeler: yönetici (müdür rolü, her şeyi girer) ve ortak (kendi e-posta ve şifresiyle girer, yalnız görür).
// Kursiyer bilgisi yoktur: yalnız müşteri kurs adı, tahsilat, pay ve ödemeler.
import { S, kaydet, gun, fark, tarihOku, iso, ayEkle, kapaliGun, islem, geriAlNoktasi } from './veri.js?v=126';
import { e, ik, rozet, pencere, kapatPencere, bildir, tarih, tarihUzun, ayAdi, olcumler, belgeYazdir } from './ui.js?v=126';
import * as B from './bulut.js?v=126';

export const TURLER = ['İlk yıllık abonelik', 'Aylık abonelik', 'Abonelik yenileme', 'Ek şube', 'Kurulum', 'Eğitim', 'Destek', 'Ücretli modül', 'Diğer Sinyal hizmeti'];
const PARA = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const para = n => PARA.format(Math.round((n || 0) * 100) / 100) + ' ₺';
const yuvarla = n => Math.round(n * 100) / 100;
const ayAd = ay => { const d = tarihOku(ay + '-01'); return ayAdi(d.getMonth(), true) + ' ' + d.getFullYear(); };
const sonrakiAy = (ay, n = 1) => ayEkle(ay + '-01', n).slice(0, 7);
const isGunu = t => { let x = t; while (kapaliGun(x) || tarihOku(x).getDay() === 6) { const d = tarihOku(x); d.setDate(d.getDate() + 1); x = iso(d); } return x; };

export const isletmeVar = () => !!(S.isletme && S.isletme.ortak);
export const yonetimModu = () => !!(S.kurs && S.kurs.tur === 'yonetim' && isletmeVar());

// Hesap: her tahsilatın payı ve (ilk yıllık abonelikte) anapara iadesi; borç bakiyesi tarih sırasıyla düşer
export function hesap(v) {
  const o = v.ortak || {}, oran = (o.oran ?? 40) / 100, b = v.borc || { anapara: 0 }, iadeTutar = b.satisIade ?? 2000;
  const mus = Object.fromEntries((v.musteriler || []).map(m => [m.id, m]));
  const odenenAnapara = (v.odemeler || []).filter(x => x.tur === 'Anapara').reduce((a, x) => a + (+x.tutar || 0), 0);
  let kalanTahakkuk = b.anapara || 0; const ilkGorulen = new Set();
  const satirlar = (v.tahsilatlar || []).slice().sort((a, c) => a.tarih.localeCompare(c.tarih) || String(a.id).localeCompare(String(c.id))).map(t => {
    const net = yuvarla((+t.tutar || 0) - (+t.iade || 0)), pay = yuvarla(net * oran);
    let anapara = 0;
    if (t.ilkYil && !ilkGorulen.has(t.musteri) && b.anapara) { ilkGorulen.add(t.musteri); anapara = Math.min(iadeTutar, Math.max(0, kalanTahakkuk)); kalanTahakkuk -= anapara; }
    return { ...t, musteriAd: (mus[t.musteri] || {}).ad || t.musteriAd || '—', net, pay, anapara };
  });
  const top = (l, k) => yuvarla(l.reduce((a, x) => a + (+x[k] || 0), 0));
  const odenenPay = top((v.odemeler || []).filter(x => x.tur === 'Pay'), 'tutar');
  const payTahakkuk = top(satirlar, 'pay'), anaparaTahakkuk = top(satirlar, 'anapara');
  const vade = b.tarih ? isGunu(ayEkle(b.tarih, 6)) : null;
  return {
    satirlar, oran: o.oran ?? 40, payTahakkuk, odenenPay, odenmemisPay: yuvarla(payTahakkuk - odenenPay),
    anaparaTahakkuk, odenenAnapara: yuvarla(odenenAnapara), kalanBorc: yuvarla(Math.max(0, (b.anapara || 0) - odenenAnapara)),
    gecikenAnapara: yuvarla(Math.max(0, anaparaTahakkuk - odenenAnapara)), vade, vadeGun: vade ? fark(vade) : null,
  };
}
// Ay dökümü: o ayın tahsilatları ve ödemeleri; döküm sonraki ayın 5'ine, ödeme 10'una kadar
export function aylik(v, h, ay) {
  const l = h.satirlar.filter(t => t.tarih.slice(0, 7) === ay), od = (v.odemeler || []).filter(x => x.tarih.slice(0, 7) === ay).sort((a, c) => a.tarih.localeCompare(c.tarih));
  const top = k => yuvarla(l.reduce((a, x) => a + (+x[k] || 0), 0));
  const s = sonrakiAy(ay);
  return { ay, l, od, tutar: top('tutar'), iade: top('iade'), net: top('net'), pay: top('pay'), anapara: top('anapara'), dokum: isGunu(s + '-05'), son: isGunu(s + '-10') };
}
const ayListesi = v => { const l = new Set([gun(0).slice(0, 7), ...(v.tahsilatlar || []).map(t => t.tarih.slice(0, 7)), ...(v.odemeler || []).map(x => x.tarih.slice(0, 7))]); if (v.borc && v.borc.tarih) l.add(v.borc.tarih.slice(0, 7)); return [...l].sort(); };

/* ---------- ortak görünümü (müdür ekranı ve ortağın paneli aynı parçaları kullanır) ---------- */
function ozetHtml(v, h) {
  const ay = aylik(v, h, gun(0).slice(0, 7));
  return olcumler([
    [ayAd(ay.ay) + ' tahsilat', para(ay.net), 'KDV hariç'],
    ['Bu ay pay (%' + h.oran + ')', para(ay.pay), 'ödeme ' + tarih(ay.son)],
    ['Ödenmemiş pay', para(h.odenmemisPay), h.odenenPay ? para(h.odenenPay) + ' ödendi' : 'henüz ödeme yok', h.odenmemisPay > 0 ? 'uyari' : ''],
    ['Kalan borç', para(h.kalanBorc), h.kalanBorc ? 'son gün ' + tarih(h.vade) + (h.vadeGun != null ? ' · ' + (h.vadeGun >= 0 ? h.vadeGun + ' gün' : 'geçti') : '') : 'kapandı'],
  ]);
}
function dokumHtml(v, h, ay, yazdir) {
  const a = aylik(v, h, ay), liste = ayListesi(v), i = liste.indexOf(ay);
  const gez = yazdir ? '' : `<div class="ort-gez"><button class="dg dg-cizgi dg-kucuk" data-ort-ay="${i > 0 ? liste[i - 1] : ''}" ${i > 0 ? '' : 'disabled'} aria-label="Önceki ay">‹</button><b>${e(ayAd(ay))}</b><button class="dg dg-cizgi dg-kucuk" data-ort-ay="${i < liste.length - 1 ? liste[i + 1] : ''}" ${i < liste.length - 1 ? '' : 'disabled'} aria-label="Sonraki ay">›</button></div>`;
  return `${gez}
    <div class="tablo-kap"><table class="tablo ort-tablo"><thead><tr><th>Tarih</th><th>Müşteri</th><th>İşlem</th><th class="sag">KDV hariç</th><th class="sag">İade</th><th class="sag">Pay %${h.oran}</th><th class="sag">Anapara</th></tr></thead><tbody>
      ${a.l.length ? a.l.map(t => `<tr><td data-et="Tarih">${tarih(t.tarih)}</td><td data-et="Müşteri"><b>${e(t.musteriAd)}</b></td><td data-et="İşlem">${e(t.tur)}${t.not ? `<small class="ort-not">${e(t.not)}</small>` : ''}</td><td class="sag mono" data-et="KDV hariç">${para(t.tutar)}</td><td class="sag mono" data-et="İade">${t.iade ? para(t.iade) : '—'}</td><td class="sag mono" data-et="Pay">${para(t.pay)}</td><td class="sag mono" data-et="Anapara">${t.anapara ? para(t.anapara) : '—'}</td></tr>`).join('') : `<tr><td colspan="7" class="ort-bos">${e(ayAd(ay))} ayında tahsilat yok.</td></tr>`}
      </tbody>${a.l.length ? `<tfoot><tr><td colspan="3"><b>Toplam</b></td><td class="sag mono" data-et="KDV hariç"><b>${para(a.tutar)}</b></td><td class="sag mono" data-et="İade">${a.iade ? para(a.iade) : '—'}</td><td class="sag mono" data-et="Pay"><b>${para(a.pay)}</b></td><td class="sag mono" data-et="Anapara"><b>${a.anapara ? para(a.anapara) : '—'}</b></td></tr></tfoot>` : ''}</table></div>
    <p class="ort-alt">${a.l.length ? `Bu ay ödenecek: <b>${para(a.pay + a.anapara)}</b> (pay ${para(a.pay)}${a.anapara ? ' + anapara ' + para(a.anapara) : ''}) · döküm ${tarih(a.dokum)}, ödeme en geç ${tarih(a.son)}.` : `Döküm ${tarih(a.dokum)}, ödeme ${tarih(a.son)} tarihine kadar.`}</p>
    ${a.od.length ? `<p class="ort-alt"><b>Bu ay yapılan ödemeler:</b> ${a.od.map(x => `${tarih(x.tarih)} ${e(x.tur.toLocaleLowerCase('tr'))} ${para(x.tutar)}`).join(' · ')}</p>` : ''}`;
}
function musteriHtml(v, duzenle) {
  const l = (v.musteriler || []).slice().sort((a, b) => (a.durum === 'Ayrıldı') - (b.durum === 'Ayrıldı') || (a.bas || '').localeCompare(b.bas || ''));
  if (!l.length) return `<p class="ort-bos">Henüz ücretli müşteri yok. Sözleşme başlangıcında (${tarih((v.ortak || {}).baslangic)}) müşteri listesi boştu.</p>`;
  return `<div class="tablo-kap"><table class="tablo ort-tablo"><thead><tr><th>Kurs</th><th>Paket</th><th class="sag">Şube</th><th>Başlangıç</th><th>Durum</th></tr></thead><tbody>
    ${l.map(m => `<tr ${duzenle ? `class="tik" data-ort-musteri="${m.id}"` : ''}><td><b>${e(m.ad)}</b>${m.not ? `<small class="ort-not">${e(m.not)}</small>` : ''}</td><td data-et="Paket">${e(m.paket || '')}</td><td class="sag mono" data-et="Şube">${m.sube || 1}</td><td data-et="Başlangıç">${m.bas ? tarih(m.bas) : '—'}</td><td data-et="Durum">${rozet(m.durum || 'Aktif', m.durum === 'Ayrıldı' ? 'notr' : m.durum === 'Deneme' ? 'sari' : 'yesil')}</td></tr>`).join('')}</tbody></table></div>`;
}
function tahsilatHtml(v, h, duzenle) {
  const l = h.satirlar.slice().reverse();
  if (!l.length) return '<p class="ort-bos">Henüz tahsilat yok.</p>';
  return `<div class="tablo-kap"><table class="tablo ort-tablo"><thead><tr><th>Tarih</th><th>Müşteri</th><th>İşlem</th><th class="sag">KDV hariç</th><th class="sag">Pay</th>${duzenle ? '<th></th>' : ''}</tr></thead><tbody>
    ${l.map(t => `<tr><td data-et="Tarih">${tarih(t.tarih)}</td><td data-et="Müşteri"><b>${e(t.musteriAd)}</b></td><td data-et="İşlem">${e(t.tur)}${t.iade ? `<small class="ort-not">iade ${para(t.iade)}</small>` : ''}${t.anapara ? `<small class="ort-not">+ anapara ${para(t.anapara)}</small>` : ''}</td><td class="sag mono" data-et="KDV hariç">${para(t.tutar)}</td><td class="sag mono" data-et="Pay">${para(t.pay)}</td>${duzenle ? `<td class="sag"><button class="dg dg-hafif dg-kucuk" data-ort-tsil="${t.id}" aria-label="Tahsilatı sil">Sil</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function odemeHtml(v, duzenle) {
  const l = (v.odemeler || []).slice().sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (!l.length) return '<p class="ort-bos">Henüz ödeme yapılmadı.</p>';
  return `<div class="tablo-kap"><table class="tablo ort-tablo"><thead><tr><th>Tarih</th><th>Tür</th><th class="sag">Tutar</th><th>Açıklama</th>${duzenle ? '<th></th>' : ''}</tr></thead><tbody>
    ${l.map(x => `<tr><td data-et="Tarih">${tarih(x.tarih)}</td><td data-et="Tür"><b>${e(x.tur === 'Pay' ? 'Gelir payı' : 'Anapara iadesi')}</b></td><td class="sag mono" data-et="Tutar">${para(x.tutar)}</td><td data-et="Açıklama">${e(x.not || '')}</td>${duzenle ? `<td class="sag"><button class="dg dg-hafif dg-kucuk" data-ort-osil="${x.id}" aria-label="Ödemeyi sil">Sil</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function borcHtml(v, h) {
  const b = v.borc || {};
  return `<ul class="ort-borc">
    <li><span>Anapara</span><b>${para(b.anapara)}</b><small>${b.tarih ? tarih(b.tarih) + ' tarihinde aktarıldı · faizsiz' : ''}</small></li>
    <li><span>İade edilen</span><b>${para(h.odenenAnapara)}</b><small>her yeni ilk yıllık abonelikte ${para(b.satisIade ?? 2000)}</small></li>
    <li><span>Kalan</span><b>${para(h.kalanBorc)}</b><small>${h.vade ? 'en geç ' + tarihUzun(h.vade) : ''}</small></li></ul>`;
}

/* ---------- müdür: Ayarlar › Ortaklık ---------- */
let secAy = null;
export function ayarHtml() {
  const v = S.isletme, h = hesap(v), o = v.ortak;
  if (!secAy) secAy = gun(0).slice(0, 7);
  const ortaklar = (S.kullanicilar || []).filter(u => u.rol === 'ortak');
  return `<div class="ort">
    <div class="kart"><div class="kart-bas"><h3>${e(o.ad)} · gelir paylaşımı</h3><small>Satışlardan %${h.oran} · sözleşme ${tarih(o.baslangic)}</small>
      <div class="sag">${ortaklar.length ? '' : `<button class="dg dg-ana dg-kucuk" data-ort-davet>${ik('arti')}${e(o.ad.split(' ')[0])} Bey'i davet et</button>`}</div></div>
      <div class="kart-govde ort-aciklama">${ortaklar.length ? `<ul class="ort-uyeler">${ortaklar.map(u => `<li><span><b>${e(u.ad)}</b><small>${e(u.eposta || '')} · yalnız görüntüler</small></span><button class="dg dg-hafif dg-kucuk" data-ort-uye-cikar="${e(u.id)}">Erişimi kaldır</button></li>`).join('')}</ul>` : `${e(o.ad.split(' ')[0])} Bey kendi e-posta ve şifresiyle bu hesaba girer ve her şeyi görür ama hiçbir şeyi değiştiremez. Davet linki 7 gün geçerlidir.`}</div>
    </div>
    <div class="ara-bosluk"></div>${ozetHtml(v, h)}<div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Aylık döküm</h3><small>Ortağa her ayın 5'ine kadar paylaşılır</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-ort-pdf>${ik('belge')}PDF</button></div></div><div class="kart-govde">${dokumHtml(v, h, secAy)}</div></div>
    <div class="ara-bosluk"></div>
    <div class="ort-yigin">
      <div class="kart"><div class="kart-bas"><h3>Tahsilatlar</h3><small>KDV hariç, kursun fiilen ödediği</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-ort-tahsilat ${(v.musteriler || []).length ? '' : 'disabled title="Önce müşteri ekleyin"'}>${ik('arti')}Tahsilat</button></div></div><div class="kart-govde">${tahsilatHtml(v, h, true)}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Müşteri kurslar</h3><small>Sinyal kullanan ve ödeyen kurslar</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-ort-musteri-ekle>${ik('arti')}Müşteri</button></div></div><div class="kart-govde">${musteriHtml(v, true)}</div></div>
    </div>
    <div class="ara-bosluk"></div>
    <div class="izgara iz-2">
      <div class="kart"><div class="kart-bas"><h3>Ortağa ödemeler</h3><small>Banka havalesiyle</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-ort-odeme>${ik('arti')}Ödeme</button></div></div><div class="kart-govde">${odemeHtml(v, true)}</div></div>
      <div class="kart"><div class="kart-bas"><h3>Borç</h3><small>Faizsiz, en geç 6 ayda</small></div><div class="kart-govde">${borcHtml(v, h)}</div></div>
    </div></div>`;
}
const kimlik = () => 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function kaydetYayinla(ne, ayrinti) { if (ne) islem(ne, ayrinti); kaydet(); }
export function ayarBaglan(k, yenile) {
  k.addEventListener('click', ev => {
    const t = ev.target, v = S.isletme;
    if (!t.closest('.ort')) return;
    const ay = t.closest('[data-ort-ay]'); if (ay && ay.dataset.ortAy) { secAy = ay.dataset.ortAy; return yenile(); }
    if (t.closest('[data-ort-pdf]')) return belgeYazdir(dokumBelgesi(v, secAy), 'Sinyal gelir paylaşımı · ' + ayAd(secAy));
    if (t.closest('[data-ort-davet]')) return davetPenceresi();
    const uc = t.closest('[data-ort-uye-cikar]'); if (uc) return silOnay('Bu kişinin Sinyal Yönetim hesabına erişimi kaldırılsın mı? Kayıtlar silinmez; isterseniz yeniden davet edebilirsiniz.', () => B.uyeCikar(uc.dataset.ortUyeCikar).then(() => { islem('Sinyal Yönetim: ortağın erişimini kaldırdı'); kaydet(); yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari')));
    if (t.closest('[data-ort-musteri-ekle]')) return musteriPenceresi(null, yenile);
    const mu = t.closest('[data-ort-musteri]'); if (mu) return musteriPenceresi((v.musteriler || []).find(m => m.id === mu.dataset.ortMusteri), yenile);
    if (t.closest('[data-ort-tahsilat]')) return tahsilatPenceresi(yenile);
    if (t.closest('[data-ort-odeme]')) return odemePenceresi(yenile);
    const ts = t.closest('[data-ort-tsil]'); if (ts) return silOnay('Bu tahsilat silinsin mi? Pay ve borç hesabı yeniden yapılır.', () => { geriAlNoktasi(); const x = v.tahsilatlar.find(y => y.id === ts.dataset.ortTsil); v.tahsilatlar = v.tahsilatlar.filter(y => y !== x); kaydetYayinla('Ortaklık: tahsilatı sildi', x ? x.tarih + ' · ' + para(x.tutar) : ''); yenile(); });
    const os = t.closest('[data-ort-osil]'); if (os) return silOnay('Bu ödeme kaydı silinsin mi?', () => { geriAlNoktasi(); const x = v.odemeler.find(y => y.id === os.dataset.ortOsil); v.odemeler = v.odemeler.filter(y => y !== x); kaydetYayinla('Ortaklık: ödeme kaydını sildi', x ? x.tarih + ' · ' + para(x.tutar) : ''); yenile(); });
  });
}
function silOnay(metin, f) { pencere({ baslik: 'Silinsin mi?', icerik: `<p style="font-size:14.5px">${e(metin)}</p>`, altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-evet>Sil</button>', onAc(p) { p.querySelector('[data-evet]').addEventListener('click', () => { kapatPencere(); f(); bildir('Silindi', 'tamam', true); }); } }); }
const alan = (et, ic) => `<div class="alan" style="margin-top:12px"><label>${et}</label>${ic}</div>`;
const tutarOku = s => { const v = String(s || '').trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''); return Math.round((+v || 0) * 100) / 100; };
function musteriPenceresi(m, yenile) {
  const v = S.isletme;
  pencere({ baslik: m ? 'Müşteri · ' + m.ad : 'Müşteri kurs ekle', icerik: `<form id="f-ortm">${alan('Kurs adı', `<input name="ad" value="${e(m ? m.ad : '')}" placeholder="Örn. Adalar Sürücü Kursu" required>`)}
      <div class="izgara iz-2" style="gap:12px">${alan('Paket', `<select name="paket">${['Yıllık', 'Aylık'].map(x => `<option ${m && m.paket === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}${alan('Şube sayısı', `<input name="sube" inputmode="numeric" value="${m ? m.sube || 1 : 1}">`)}</div>
      <div class="izgara iz-2" style="gap:12px">${alan('Başlangıç', `<input name="bas" type="date" value="${m ? m.bas || '' : gun(0)}">`)}${alan('Durum', `<select name="durum">${['Aktif', 'Deneme', 'Ayrıldı'].map(x => `<option ${(m ? m.durum : 'Aktif') === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}</div>
      ${alan('Not <small style="font-weight:400;color:var(--soluk)">isteğe bağlı</small>', `<input name="not" value="${e(m ? m.not || '' : '')}">`)}</form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-ortm">Kaydet</button>`,
    onAc(p) { p.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target, ad = f.ad.value.trim(); if (ad.length < 2) return bildir('Kurs adını yazın', 'uyari');
      const x = { ad, paket: f.paket.value, sube: Math.max(1, +f.sube.value.replace(/\D/g, '') || 1), bas: f.bas.value || gun(0), durum: f.durum.value, not: f.not.value.trim() };
      if (m) Object.assign(m, x); else (v.musteriler = v.musteriler || []).push({ id: kimlik(), ...x });
      kaydetYayinla(m ? 'Ortaklık: müşteriyi güncelledi' : 'Ortaklık: müşteri ekledi', ad); kapatPencere(); bildir('Kaydedildi'); yenile(); }); } });
}
function tahsilatPenceresi(yenile) {
  const v = S.isletme, ms = (v.musteriler || []).filter(m => m.durum !== 'Ayrıldı');
  const ilkVar = id => (v.tahsilatlar || []).some(t => t.musteri === id && t.ilkYil);
  pencere({ baslik: 'Tahsilat ekle', icerik: `<form id="f-ortt">
      <div class="izgara iz-2" style="gap:12px">${alan('Tarih', `<input name="tarih" type="date" value="${gun(0)}" required>`)}${alan('Müşteri', `<select name="musteri">${ms.map(m => `<option value="${m.id}">${e(m.ad)}</option>`).join('')}</select>`)}</div>
      ${alan('İşlem', `<select name="tur">${TURLER.map(x => `<option>${x}</option>`).join('')}</select>`)}
      <div class="izgara iz-2" style="gap:12px">${alan('Tutar, KDV hariç (₺)', `<input name="tutar" inputmode="decimal" placeholder="7500" required>`)}${alan('İade (₺) <small style="font-weight:400;color:var(--soluk)">varsa</small>', `<input name="iade" inputmode="decimal" placeholder="0">`)}</div>
      <label class="ort-onay" data-ilk-alan><input type="checkbox" name="ilk"> <span>İlk yıllık aboneliğin bedeli <b>tamamen</b> tahsil edildi <small>(borçtan ${para((v.borc || {}).satisIade ?? 2000)} anapara iadesi doğar; her müşteride bir kez)</small></span></label>
      ${alan('Not <small style="font-weight:400;color:var(--soluk)">isteğe bağlı</small>', `<input name="not" placeholder="Örn. fatura no, 3 şube">`)}
      <p class="ort-onizle" data-onizle></p></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-ortt">Tahsilatı kaydet</button>`,
    onAc(p) {
      const f = p.querySelector('form'), oran = hesap(v).oran;
      const guncelle = () => { const ilkOl = f.tur.value === 'İlk yıllık abonelik' && !ilkVar(f.musteri.value) && hesap(v).kalanBorc > 0; p.querySelector('[data-ilk-alan]').hidden = !ilkOl; if (!ilkOl) f.ilk.checked = false; const n = tutarOku(f.tutar.value) - tutarOku(f.iade.value); p.querySelector('[data-onizle]').innerHTML = n > 0 ? `Ortağın payı: <b>${para(n * oran / 100)}</b>${f.ilk.checked ? ' + anapara ' + para(Math.min((v.borc || {}).satisIade ?? 2000, hesap(v).kalanBorc)) : ''}` : ''; };
      f.addEventListener('input', guncelle); f.addEventListener('change', guncelle); guncelle();
      f.addEventListener('submit', ev => { ev.preventDefault(); const tutar = tutarOku(f.tutar.value), iade = tutarOku(f.iade.value); if (!tutar) return bildir('Tutarı yazın', 'uyari'); if (iade > tutar) return bildir('İade tutarı tahsilatı aşamaz', 'uyari');
        const m = ms.find(x => x.id === f.musteri.value);
        (v.tahsilatlar = v.tahsilatlar || []).push({ id: kimlik(), tarih: f.tarih.value || gun(0), musteri: m.id, musteriAd: m.ad, tur: f.tur.value, tutar, iade, ilkYil: f.ilk.checked, not: f.not.value.trim() });
        kaydetYayinla('Ortaklık: tahsilat ekledi', m.ad + ' · ' + para(tutar)); kapatPencere(); bildir('Tahsilat kaydedildi'); yenile(); });
    } });
}
function odemePenceresi(yenile) {
  const v = S.isletme, h = hesap(v), ay = aylik(v, h, sonrakiAy(gun(0).slice(0, 7), -1));
  pencere({ baslik: 'Ortağa ödeme', icerik: `<form id="f-orto"><div class="izgara iz-2" style="gap:12px">${alan('Tarih', `<input name="tarih" type="date" value="${gun(0)}">`)}${alan('Tür', `<select name="tur"><option value="Pay">Gelir payı</option><option value="Anapara">Anapara iadesi</option></select>`)}</div>
      ${alan('Tutar (₺)', `<input name="tutar" inputmode="decimal" value="${h.odenmemisPay > 0 ? String(h.odenmemisPay).replace('.', ',') : ''}">`)}
      ${alan('Açıklama', `<input name="not" value="${e(ayAd(ay.ay))} payı">`)}
      <p class="ort-onizle">Ödenmemiş pay ${para(h.odenmemisPay)} · ödenmesi gereken anapara ${para(h.gecikenAnapara)} · kalan borç ${para(h.kalanBorc)}</p></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-orto">Ödemeyi kaydet</button>`,
    onAc(p) { const f = p.querySelector('form');
      f.tur.addEventListener('change', () => { f.tutar.value = String(f.tur.value === 'Pay' ? Math.max(0, h.odenmemisPay) : Math.max(0, h.gecikenAnapara)).replace('.', ','); f.not.value = f.tur.value === 'Pay' ? ayAd(ay.ay) + ' payı' : 'Anapara iadesi'; });
      f.addEventListener('submit', ev => { ev.preventDefault(); const tutar = tutarOku(f.tutar.value); if (!tutar) return bildir('Tutarı yazın', 'uyari'); if (f.tur.value === 'Anapara' && tutar > h.kalanBorc) return bildir('Kalan borç ' + para(h.kalanBorc) + '; fazlası ödenemez', 'uyari');
        (v.odemeler = v.odemeler || []).push({ id: kimlik(), tarih: f.tarih.value || gun(0), tur: f.tur.value, tutar, not: f.not.value.trim() });
        kaydetYayinla('Ortaklık: ortağa ödeme kaydetti', f.tur.value + ' · ' + para(tutar)); kapatPencere(); bildir('Ödeme kaydedildi'); yenile(); }); } });
}
// Aylık döküm belgesi (PDF): sözleşme 6.1'deki alanlar
function dokumBelgesi(v, ay) {
  const h = hesap(v), a = aylik(v, h, ay);
  return `<h1>Gelir paylaşımı dökümü</h1><p class="a4-alt">Sinyal · ${e(ayAd(ay))} · ${e(v.ortak.ad)} (%${h.oran}) · hazırlanma ${tarih(gun(0))}</p>
    ${dokumHtml(v, h, ay, true)}
    <h2 style="margin-top:18px">Durum (${tarih(gun(0))})</h2>
    <table><tbody><tr><th>Toplam tahakkuk eden pay</th><td>${para(h.payTahakkuk)}</td></tr><tr><th>Ödenen pay</th><td>${para(h.odenenPay)}</td></tr><tr><th>Ödenmemiş pay</th><td><b>${para(h.odenmemisPay)}</b></td></tr>
      <tr><th>Anapara</th><td>${para((v.borc || {}).anapara)} · ${tarih((v.borc || {}).tarih)}</td></tr><tr><th>İade edilen anapara</th><td>${para(h.odenenAnapara)}</td></tr><tr><th>Kalan borç</th><td><b>${para(h.kalanBorc)}</b> · son gün ${h.vade ? tarih(h.vade) : '—'}</td></tr></tbody></table>
    <p style="margin-top:14px;font-size:11px;color:#555">Tutarlar KDV hariç, fiilen tahsil edilmiş ve iade edilmemiş gelirlerdir. Anapara iadesi her yeni müşterinin ilk yıllık aboneliği tamamen tahsil edildiğinde doğar.</p>`;
}

/* ---------- ortağı davet: kendi e-posta ve şifresiyle girer, rolü "ortak" (yalnız görür) ---------- */
function davetPenceresi() {
  const o = S.isletme.ortak;
  B.davetOlustur({ ad: o.ad, rol: 'ortak' }).then(d => {
    islem('Sinyal Yönetim: ortağa davet linki oluşturdu', o.ad); kaydet();
    pencere({ baslik: o.ad + ' · davet linki', icerik: `<p style="font-size:14.5px;margin-bottom:10px">Bu linki WhatsApp'tan ${e(o.ad.split(' ')[0])} Bey'e gönderin. Linki açınca kendi e-postasını ve bir şifre belirleyip hesaba katılır. Link ${d.son.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihine kadar geçerlidir ve bir kez kullanılır.</p>
      <p style="font-size:13.5px;word-break:break-all;background:var(--panel-2);border-radius:8px;padding:10px 12px">${e(d.link)}</p>`,
      altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-kopyala>Linki kopyala</button>',
      onAc(p) { p.querySelector('[data-kopyala]').addEventListener('click', () => { try { navigator.clipboard.writeText(d.link); bildir('Link kopyalandı'); } catch (x) { bildir(d.link); } }); } });
  }).catch(x => bildir(B.hataMetni(x), 'uyari'));
}

/* ---------- ortağın görünümü (rolü "ortak"): yalnız görüntüler ---------- */
export function ortakPanelHtml(v, ay = secAy || gun(0).slice(0, 7)) {
  const h = hesap(v), guncel = v.guncel ? new Date(v.guncel) : null;
  return `<div class="ort ort-panel">
    <header class="ort-panel-bas"><div><small>Sinyal · ortak paneli</small><h1>${e(v.ortak.ad)}</h1><p>Satışlardan %${h.oran} gelir payı · sözleşme ${tarih(v.ortak.baslangic)}</p></div>
      <span class="ort-guncel">${guncel ? 'Güncellendi ' + guncel.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + ' ' + guncel.toTimeString().slice(0, 5) : ''}</span></header>
    ${ozetHtml(v, h)}
    <section class="kart"><div class="kart-bas"><h3>Aylık döküm</h3><small>Ödeme her ayın 10'una kadar</small></div><div class="kart-govde">${dokumHtml(v, h, ay)}</div></section>
    <section class="kart"><div class="kart-bas"><h3>Müşteri kurslar</h3><small>${(v.musteriler || []).filter(m => m.durum !== 'Ayrıldı').length} aktif</small></div><div class="kart-govde">${musteriHtml(v, false)}</div></section>
    <section class="kart"><div class="kart-bas"><h3>Tahsilatlar</h3><small>KDV hariç</small></div><div class="kart-govde">${tahsilatHtml(v, h, false)}</div></section>
    <section class="kart"><div class="kart-bas"><h3>Size yapılan ödemeler</h3></div><div class="kart-govde">${odemeHtml(v, false)}</div></section>
    <section class="kart"><div class="kart-bas"><h3>Borç durumu</h3></div><div class="kart-govde">${borcHtml(v, h)}</div></section>
    <p class="ort-dip">Bu ekran yalnız görüntüleme içindir; kayıtları Servet Sakar girer. Kursların öğrenci bilgileri burada yer almaz.</p></div>`;
}
/* ---------- Sinyal Yönetim hesabının ekranı (uygulama kabuğu app.js'te) ---------- */
export const yonetimHtml = rol => rol === 'mudur' ? ayarHtml() : ortakPanelHtml(S.isletme);
export function yonetimBaglan(k, rol, yenile) {
  if (rol === 'mudur') return ayarBaglan(k, yenile);
  k.addEventListener('click', ev => { const ay = ev.target.closest('[data-ort-ay]'); if (ay && ay.dataset.ortAy) { secAy = ay.dataset.ortAy; yenile(); } });
}
// Kurulum: yeni ve boş bir hesap bir kez "Sinyal Yönetim" hesabına çevrilir (#/yonetim-kur, yalnız müdür)
export const kurulabilir = () => !S.isletme && !(S.kursiyerler || []).length && !(S.dersler || []).length && !(S.hareket || []).length;
export function kurulumHtml() {
  return `<div class="kart ort-kur"><div class="kart-bas"><h3>Sinyal Yönetim hesabını kur</h3><small>Bu hesap kurs olarak değil, Sinyal'in kendi gelir paylaşımı için kullanılır</small></div>
    <form class="kart-govde" id="f-yk">
      <div class="izgara iz-2" style="gap:12px">${alan('Ortağın adı soyadı', '<input name="ad" value="Eyüp Çağlar" required>')}${alan('Gelir payı (%)', '<input name="oran" inputmode="numeric" value="40">')}</div>
      <div class="izgara iz-2" style="gap:12px">${alan('Sözleşme tarihi', '<input name="bas" type="date" value="2026-11-10">')}${alan('Borcun aktarıldığı tarih', '<input name="bt" type="date" value="2026-11-11">')}</div>
      <div class="izgara iz-2" style="gap:12px">${alan('Anapara (₺)', '<input name="anapara" inputmode="numeric" value="50.000">')}${alan('Yeni satış başına anapara iadesi (₺)', '<input name="iade" inputmode="numeric" value="2.000">')}</div>
      <p class="ort-onizle">Kurulduktan sonra bu hesapta öğrenci, ders ve kasa ekranları açılmaz; yalnız gelir paylaşımı ekranı açılır. Bu işlem geri alınamaz, bu yüzden boş ve yeni bir hesapta yapın.</p>
      <button class="dg dg-ana" type="submit" style="margin-top:14px">Sinyal Yönetim hesabını kur</button></form></div>`;
}
export function kurulumBaglan(k, bitti) {
  const f = k.querySelector('#f-yk'); if (!f) return;
  f.addEventListener('submit', ev => { ev.preventDefault(); if (!kurulabilir()) return bildir('Bu hesapta kurs kaydı var; yeni ve boş bir hesap açın', 'uyari');
    const oran = +f.oran.value.replace(/\D/g, '') || 40, anapara = tutarOku(f.anapara.value), satisIade = tutarOku(f.iade.value);
    isletmeKur({ ad: f.ad.value.trim(), oran, baslangic: f.bas.value, anapara, borcTarih: f.bt.value, satisIade });
    S.kurs.tur = 'yonetim'; S.kurs.ad = 'Sinyal Yönetim'; kaydet(); bildir('Sinyal Yönetim hesabı kuruldu'); bitti(); });
}

// İlk kurulum: hesapta işletme defteri yoksa sözleşme bilgileriyle açılır (yalnız kurulum adresinden)
export function isletmeKur({ ad, oran, baslangic, anapara, borcTarih, satisIade }) {
  if (S.isletme) return false;
  S.isletme = { ortak: { ad, oran, baslangic, link: null }, borc: { anapara, tarih: borcTarih, satisIade }, musteriler: [], tahsilatlar: [], odemeler: [] };
  islem('Ortaklık defterini açtı', ad + ' · %' + oran);
  kaydet(); return true;
}
