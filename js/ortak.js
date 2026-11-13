// mdSinyal Yönetim: mdSinyal'in kendi gelir paylaşımı (satış ortağına %40 pay, borç ve anapara iadesi).
// Kurs hesaplarından ayrı bir hesapta çalışır (S.kurs.tur === 'yonetim'); kurs ekranları açılmaz.
// Üyeler: yönetici (müdür rolü, her şeyi girer) ve ortak (kendi e-posta ve şifresiyle girer, yalnız görür).
// Kursiyer bilgisi yoktur: yalnız müşteri kurs adı, tahsilat, pay ve ödemeler.
import { S, kaydet, gun, fark, tarihOku, iso, ayEkle, kapaliGun, islem, geriAlNoktasi } from './veri.js?v=187';
import { e, ik, rozet, pencere, kapatPencere, bildir, tarih, tarihUzun, ayAdi, olcumler, belgeYazdir, fotoKucult, csvIndir, gunKisa } from './ui.js?v=187';
import * as B from './bulut.js?v=187';

export const TURLER = ['İlk yıllık abonelik', 'Aylık abonelik', 'Abonelik yenileme', 'Ek şube', 'Kurulum', 'Eğitim', 'Destek', 'Ücretli modül', 'Diğer mdSinyal hizmeti'];
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
      <div class="kart"><div class="kart-bas"><h3>Müşteri kurslar</h3><small>mdSinyal kullanan ve ödeyen kurslar</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-ort-musteri-ekle>${ik('arti')}Müşteri</button></div></div><div class="kart-govde">${musteriHtml(v, true)}</div></div>
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
    if (t.closest('[data-ort-pdf]')) return belgeYazdir(dokumBelgesi(v, secAy), 'mdSinyal gelir paylaşımı · ' + ayAd(secAy));
    if (t.closest('[data-ort-davet]')) return davetPenceresi();
    const uc = t.closest('[data-ort-uye-cikar]'); if (uc) return silOnay('Bu kişinin mdSinyal Yönetim hesabına erişimi kaldırılsın mı? Kayıtlar silinmez; isterseniz yeniden davet edebilirsiniz.', () => B.uyeCikar(uc.dataset.ortUyeCikar).then(() => { islem('mdSinyal Yönetim: ortağın erişimini kaldırdı'); kaydet(); yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari')));
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
// Müşteri (Ortaklık › Müşteri kurslar) ile Kurslar'daki kart aynı kurstur: adla eşleşir, bağ k.musteri = m.id.
// Aktif ya da denemedeki müşteri Kurslar'da "Müşteri" durumunda görünür; ayrılan müşterinin kartı "Soğuk"a düşer.
const adEs = (a, b) => String(a || '').trim().toLocaleLowerCase('tr') === String(b || '').trim().toLocaleLowerCase('tr');
export function musteriKursEsle(v) {
  let degisti = false; v.kurslar = v.kurslar || [];
  for (const m of v.musteriler || []) {
    const k = v.kurslar.find(x => x.musteri === m.id) || v.kurslar.find(x => !x.musteri && adEs(x.ad, m.ad)), ayrildi = m.durum === 'Ayrıldı';
    if (!k) { if (!ayrildi) { v.kurslar.push({ id: kimlik(), ad: m.ad, durum: 'Müşteri', musteri: m.id, program: 'mdSinyal', kisiler: '', not: m.not || '', guncel: gun(0) }); degisti = true; } continue; }
    if (k.musteri !== m.id) { k.musteri = m.id; degisti = true; }
    if (!ayrildi && k.durum !== 'Müşteri') { k.durum = 'Müşteri'; k.program = 'mdSinyal'; k.guncel = gun(0); degisti = true; }
    if (ayrildi && k.durum === 'Müşteri') { k.durum = 'Soğuk'; k.guncel = gun(0); degisti = true; }
    if (!adEs(k.ad, m.ad) && k.musteri === m.id && k.adMusteri !== m.ad) { k.ad = m.ad; k.adMusteri = m.ad; degisti = true; }
  }
  return degisti;
}
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
      musteriKursEsle(v);
      kaydetYayinla(m ? 'Ortaklık: müşteriyi güncelledi' : 'Ortaklık: müşteri ekledi', ad); kapatPencere(); bildir(m ? 'Kaydedildi' : 'Kaydedildi; Kurslar’da da “Müşteri” olarak görünüyor'); yenile(); }); } });
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
  return `<h1>Gelir paylaşımı dökümü</h1><p class="a4-alt">mdSinyal · ${e(ayAd(ay))} · ${e(v.ortak.ad)} (%${h.oran}) · hazırlanma ${tarih(gun(0))}</p>
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
    islem('mdSinyal Yönetim: ortağa davet linki oluşturdu', o.ad); kaydet();
    pencere({ baslik: o.ad + ' · davet linki', icerik: `<p style="font-size:14.5px;margin-bottom:10px">Bu linki WhatsApp'tan ${e(o.ad.split(' ')[0])} Bey'e gönderin. Linki açınca kendi e-postasını ve bir şifre belirleyip hesaba katılır. Link ${d.son.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihine kadar geçerlidir ve bir kez kullanılır.</p>
      <p style="font-size:13.5px;word-break:break-all;background:var(--panel-2);border-radius:8px;padding:10px 12px">${e(d.link)}</p>`,
      altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-kopyala>Linki kopyala</button>',
      onAc(p) { p.querySelector('[data-kopyala]').addEventListener('click', () => { try { navigator.clipboard.writeText(d.link); bildir('Link kopyalandı'); } catch (x) { bildir(d.link); } }); } });
  }).catch(x => bildir(B.hataMetni(x), 'uyari'));
}

/* ---------- mdSinyal Yönetim ekranı (yeni tasarım): Özet · Kurslar · Defter ----------
   Yönetici her şeyi girer; ortak (rol "ortak") aynı ekranı yalnız görür. Hesaplar hesap()/aylik() ile aynıdır. */
let sekme = 'ozet', kursFiltre = 'hepsi', kasaAy = null, isEkTur = 'İş';
export const sekmeSec = k => { sekme = k; };
// kurs durumları: sıralama, renk ve simge (sıra = kartların dizilişi)
export const DURUMLAR = [['Müşteri', 'yr-yesil', 'tik'], ['Sıcak', 'yr-kirmizi', 'alev'], ['Riskli', 'yr-turuncu', 'uyari'], ['Görüşülüyor', 'yr-sari', 'tel'], ['Ortak', 'yr-mor', 'kursiyer'], ['Bekliyor', 'yr-gri', 'saat'], ['Soğuk', 'yr-soluk', 'kapat']];
// her durumun ne anlama geldiği (Kurslar ekranında grup başlığında yazar)
const DURUM_ACIKLAMA = { 'Müşteri': 'mdSinyal’i kullanıyor ve ödüyor', 'Sıcak': 'Satışa en yakın; ilk bunları takip et', 'Riskli': 'İlgili ama kaybedebiliriz; hızlı davran', 'Görüşülüyor': 'Görüşme sürüyor, karar bekleniyor', 'Ortak': 'Satış ortağı ya da iş birliği', 'Bekliyor': 'Zamanı gelince yeniden gidilecek', 'Soğuk': 'Şimdilik ilgisiz' };
const durumBul = d => DURUMLAR.find(x => x[0] === d) || DURUMLAR[5];
const bolum = (baslik, alt, dugme, ic, sinif = '') => `<section class="yn-bolum"><div class="yn-bolum-bas"><div><h2>${baslik}</h2>${alt ? `<small>${alt}</small>` : ''}</div>${dugme ? `<div class="yn-dg">${dugme}</div>` : ''}</div><div class="yn-kart ${sinif}">${ic}</div></section>`;
// Kurs kutusu: kısa ve okunur; uzun yazılar (notlar, çekinceler, sonraki adım) kutuya dokununca açılan sayfada
const teklifMetni = t => { const m = String(t || '').match(/\d{1,3}(?:[.\s]\d{3})+|\d+/); return m ? m[0].replace(/\s/g, '.') + ' ₺' : (t ? String(t) : ''); };
const ilkKisi = s => String(s || '').split(/[;,(]/)[0].trim();
function kursKart(k, yon) {
  const d = durumBul(k.durum), sayi = (et, deger) => `<div><small>${et}</small><b class="${deger ? '' : 'krs-yok'}">${deger ? e(deger) : '—'}</b></div>`;
  return `<article class="krs ${d[1]}" data-yn-kurs-ac="${e(k.id)}" tabindex="0" role="button" aria-label="${e(k.ad)}">
    <div class="krs-ust"><span class="krs-durum"><i></i>${e(d[0])}</span>${k.zaman ? `<span class="krs-zaman">${e(k.zaman)}</span>` : ''}</div>
    <b class="krs-ad">${e(k.ad)}</b>
    <small class="krs-kisi">${e(ilkKisi(k.kisiler)) || '&nbsp;'}</small>
    <div class="krs-sayilar">${sayi('Görüşme', k.gorusme ? String(k.gorusme) : '')}${sayi('Teklif', teklifMetni(k.teklif))}${sayi('Program', k.program)}</div>
  </article>`;
}
// kutuya dokununca: bütün bilgiler ve notlar
function kursDetay(k, yon, yenile) {
  const d = durumBul(k.durum), itiraz = String(k.itiraz || '').split(/\s*;\s*/).filter(Boolean);
  const satir = (et, deger) => deger ? `<div class="krsd-satir"><span>${et}</span><b>${e(deger)}</b></div>` : '';
  pencere({ baslik: k.ad, alt: true, icerik: `<div class="krsd">
      <div class="krsd-ust ${d[1]}"><span class="krs-durum"><i></i>${e(d[0])}</span>${k.guncel ? `<small>Son güncelleme ${tarih(k.guncel)}</small>` : ''}</div>
      <div class="krs-sayilar krsd-sayilar">${[['Görüşme', k.gorusme ? String(k.gorusme) : ''], ['Teklif', teklifMetni(k.teklif)], ['Program', k.program]].map(([a, b]) => `<div><small>${a}</small><b class="${b ? '' : 'krs-yok'}">${b ? e(b) : '—'}</b></div>`).join('')}</div>
      <div class="krsd-liste">${(m => m ? satir('Abonelik', [m.paket, (m.sube || 1) + ' şube', m.bas ? 'başlangıç ' + tarih(m.bas) : '', m.durum].filter(Boolean).join(' · ')) : '')(k.musteri && (S.isletme.musteriler || []).find(m => m.id === k.musteri))}${satir('Yetkili', k.kisiler)}${satir('Sıradaki adım', k.sonraki)}${satir('Ne zaman', k.zaman)}${k.teklif && teklifMetni(k.teklif) !== k.teklif ? satir('Teklif ayrıntısı', k.teklif) : ''}</div>
      ${k.not ? `<h3 class="krsd-bas">Notlar</h3><p class="krsd-not">${e(k.not).replace(/\n/g, '<br>')}</p>` : ''}
      ${itiraz.length ? `<h3 class="krsd-bas">Çekinceleri</h3><div class="krsd-etiketler">${itiraz.map(x => `<span>${e(x)}</span>`).join('')}</div>` : ''}
    </div>`,
    altlik: yon ? `<button class="dg dg-cizgi" data-ykd-gorusme>${ik('arti')}Görüşme ekle</button><button class="dg dg-ana" data-ykd-duzenle>Düzenle</button>` : '<button class="dg dg-ana" data-kapat>Tamam</button>',
    onAc(p) {
      if (!yon) return;
      p.querySelector('[data-ykd-duzenle]').addEventListener('click', () => kursPenceresi(k, yenile));
      p.querySelector('[data-ykd-gorusme]').addEventListener('click', () => { k.gorusme = (+k.gorusme || 0) + 1; k.guncel = gun(0); kaydetYayinla('mdSinyal Yönetim: görüşme ekledi', k.ad); bildir(k.ad + ': ' + k.gorusme + '. görüşme'); yenile(); kursDetay(k, yon, yenile); });
    } });
}
function kurslarHtml(v, yon) {
  const l = v.kurslar || [];
  const ekle = yon ? `<button class="u-hap" data-yn-kurs-ekle>${ik('arti')}Kurs ekle</button><label class="u-hap gri yn-dosya">Dosyadan ekle<input type="file" accept=".json,application/json" data-yn-kurs-dosya></label>` : '';
  if (!l.length) return `<div class="yn-bolum"><div class="u-bos">${ik('kursiyer')}<b>Henüz kurs eklenmedi</b><p>${yon ? 'Görüştüğün kursları ekle; durumunu, kiminle görüştüğünü ve sonraki adımı tek yerde takip et.' : 'Servet Sakar kursları ekleyince burada görünür.'}</p>${yon ? `<div class="yn-bos-dg">${ekle}</div>` : ''}</div></div>`;
  if (kursFiltre !== 'hepsi' && !l.some(k => k.durum === kursFiltre)) kursFiltre = 'hepsi';
  const say = d => l.filter(k => k.durum === d).length;
  // kurslar duruma göre gruplanır; her grubun başında o durumun ne demek olduğu yazar
  const gruplar = DURUMLAR.filter(([d]) => (kursFiltre === 'hepsi' || kursFiltre === d) && say(d)).map(([d, sinif, ikon]) => {
    const g = l.filter(k => k.durum === d).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
    return `<section class="yn-kurs-grup ${sinif}"><h3 class="krs-grup" title="${e(DURUM_ACIKLAMA[d] || '')}"><i></i>${e(d)}<span>${g.length}</span></h3><div class="krs-izgara">${g.map(k => kursKart(k, yon)).join('')}</div></section>`;
  }).join('');
  return `<div class="yn-kurs-ust"><div class="yn-filtre" role="tablist" aria-label="Duruma göre süz">${[['hepsi', 'Tümü', l.length], ...DURUMLAR.map(([d]) => [d, d, say(d)]).filter(x => x[2])].map(([k, t, n]) => `<button data-yn-filtre="${e(k)}" class="${kursFiltre === k ? 'secili' : ''}" aria-pressed="${kursFiltre === k}">${e(t)}<em>${n}</em></button>`).join('')}</div>${yon ? `<div class="yn-dg">${ekle}</div>` : ''}</div>
    ${gruplar}`;
}
// ---- Ajanda: yapılacaklar ve hedefler (yalnız yönetici) ----
const bugunMu = t => t === gun(0);
const gunEt = t => !t ? '' : t === gun(0) ? 'Bugün' : t === gun(1) ? 'Yarın' : t === gun(-1) ? 'Dün' : `${gunKisa(t)} ${tarih(t)}`;
function isSatir(x, v) {
  const gec = !x.bitti && x.tarih && x.tarih < gun(0), kurs = x.kurs && (v.kurslar || []).find(k => k.id === x.kurs);
  return `<div class="u-satir yn-is ${x.bitti ? 'bitti' : ''} ${gec ? 'gec' : ''}">
    <button class="yn-tik" data-yn-is-bitti="${e(x.id)}" aria-pressed="${!!x.bitti}" aria-label="${x.bitti ? 'Yapılmadı olarak işaretle' : 'Yapıldı olarak işaretle'}">${ik('tik')}</button>
    <span class="u-satir-govde" data-yn-is="${e(x.id)}" role="button" tabindex="0"><b>${x.tur === 'Hedef' ? `<span class="yn-hedef-et">Hedef</span>` : ''}${e(x.baslik)}</b><small>${[x.tarih ? (gec ? 'Gecikti · ' : '') + gunEt(x.tarih) + (x.saat ? ' ' + e(x.saat) : '') : '', kurs ? e(kurs.ad) : '', x.not ? e(x.not) : ''].filter(Boolean).join(' · ') || 'Tarihsiz'}</small></span>
    <button class="u-nokta yn-is-gider" data-yn-is-gider="${e(x.id)}" aria-label="Bu iş için harcama ekle" title="Harcama ekle">₺</button></div>`;
}
const isEkle = () => `<form class="yn-is-ekle" data-yn-is-form><div class="yn-tur">${['İş', 'Hedef'].map(t => `<button type="button" data-yn-is-tur="${t}" class="${isEkTur === t ? 'secili' : ''}">${t}</button>`).join('')}</div><input name="baslik" placeholder="${isEkTur === 'Hedef' ? 'Örn. Ay sonuna kadar 3 kurs' : 'Örn. Domain al'}" aria-label="Yeni ${isEkTur === 'Hedef' ? 'hedef' : 'iş'}" autocomplete="off" maxlength="200"><input name="tarih" type="date" value="${isEkTur === 'Hedef' ? '' : gun(0)}" aria-label="Tarih"><button class="u-hap" type="submit">${ik('arti')}Ekle</button></form>`;
function ajandaHtml(v) {
  const l = v.isler || [], acik = l.filter(x => !x.bitti && x.tur !== 'Hedef'), hedef = l.filter(x => !x.bitti && x.tur === 'Hedef');
  const sir = (a, b) => (a.tarih || '9999').localeCompare(b.tarih || '9999') || (a.saat || '').localeCompare(b.saat || '');
  const grup = (b, alt, liste, sinif = '') => liste.length ? `<section class="yn-bolum"><div class="yn-bolum-bas"><div><h2 class="${sinif}">${b}<span class="yn-say">${liste.length}</span></h2>${alt ? `<small>${alt}</small>` : ''}</div></div><div class="yn-kart">${liste.sort(sir).map(x => isSatir(x, v)).join('')}</div></section>` : '';
  const geciken = acik.filter(x => x.tarih && x.tarih < gun(0)), bugun = acik.filter(x => bugunMu(x.tarih)), yakin = acik.filter(x => x.tarih && x.tarih > gun(0)), tarihsiz = acik.filter(x => !x.tarih);
  const biten = l.filter(x => x.bitti).sort((a, b) => (b.bitti || '').localeCompare(a.bitti || '')).slice(0, 30);
  return `<section class="yn-bolum"><div class="yn-kart yn-ekle-kart">${isEkle()}</div></section>
    ${!acik.length && !hedef.length ? `<div class="yn-bolum"><div class="u-bos">${ik('takvim')}<b>Yapılacak bir şey yok</b><p>Yukarıdan iş ya da hedef ekle; tarih verirsen günü gelince "Bugün"de görünür.</p></div></div>` : ''}
    ${grup('Gecikenler', 'Tarihi geçmiş, yapılmamış', geciken, 'kirmizi')}${grup('Bugün', tarihUzun(gun(0)), bugun)}${grup('Yaklaşanlar', '', yakin)}${grup('Hedefler', 'Uzun vadeli', hedef)}${grup('Tarihsiz', '', tarihsiz)}
    ${biten.length ? `<details class="yn-bolum yn-biten"><summary>Tamamlananlar <span class="yn-say">${biten.length}</span></summary><div class="yn-kart">${biten.map(x => isSatir(x, v)).join('')}</div></details>` : ''}`;
}
// ---- Gelir-Gider: mdSinyal'in kendi defteri (yalnız yönetici). Kurslardan gelen tahsilatlar ortaklık defterinden otomatik gelir ----
export const GIDER_KAT = ['Alan adı ve barındırma', 'Yazılım ve abonelik', 'Reklam ve tanıtım', 'Basılı malzeme', 'Yol ve yakıt', 'Telefon ve internet', 'Ekipman', 'Danışmanlık ve muhasebe', 'Vergi ve harç', 'Yemek ve ağırlama', 'Diğer'];
const GELIR_KAT = ['Danışmanlık', 'Eğitim', 'Diğer gelir'];
function kasaAyHesap(v, h, ay) {
  const hr = (v.hareketler || []).filter(x => (x.tarih || '').slice(0, 7) === ay);
  const tah = h.satirlar.filter(t => t.tarih.slice(0, 7) === ay);
  const gelirSinyal = yuvarla(tah.reduce((a, t) => a + t.net, 0)), gelirDiger = yuvarla(hr.filter(x => x.tur === 'Gelir').reduce((a, x) => a + (+x.tutar || 0), 0));
  const gider = yuvarla(hr.filter(x => x.tur === 'Gider').reduce((a, x) => a + (+x.tutar || 0), 0)), pay = yuvarla(tah.reduce((a, t) => a + t.pay, 0));
  const kat = {}; hr.filter(x => x.tur === 'Gider').forEach(x => { kat[x.kategori || 'Diğer'] = (kat[x.kategori || 'Diğer'] || 0) + (+x.tutar || 0); });
  return { hr, tah, gelirSinyal, gelirDiger, gelir: yuvarla(gelirSinyal + gelirDiger), gider, pay, net: yuvarla(gelirSinyal + gelirDiger - gider - pay), kat };
}
function kasaHtml(v, h) {
  if (!kasaAy) kasaAy = gun(0).slice(0, 7);
  const k = kasaAyHesap(v, h, kasaAy), aylar = [...new Set([gun(0).slice(0, 7), ...(v.hareketler || []).map(x => (x.tarih || '').slice(0, 7)), ...h.satirlar.map(t => t.tarih.slice(0, 7))])].filter(Boolean).sort(), i = aylar.indexOf(kasaAy);
  const kart = (et, deger, alt, sinif = '') => `<div class="yn-kasa-kutu ${sinif}"><small>${et}</small><b>${deger}</b><span>${alt}</span></div>`;
  const katL = Object.entries(k.kat).sort((a, b) => b[1] - a[1]), katMax = katL.length ? katL[0][1] : 1;
  const satirlar = [...k.hr.map(x => ({ ...x, kendi: true })), ...k.tah.map(t => ({ id: t.id, tarih: t.tarih, tur: 'Gelir', kategori: 'mdSinyal tahsilatı', aciklama: t.musteriAd + ' · ' + t.tur, tutar: t.net, oto: true }))].sort((a, b) => b.tarih.localeCompare(a.tarih));
  return `<div class="yn-kasa-ust"><div class="yn-ay-gez"><button data-yn-kasa-ay="${i > 0 ? aylar[i - 1] : ''}" ${i > 0 ? '' : 'disabled'} aria-label="Önceki ay">${ik('sag', 'ters')}</button><b>${e(ayAd(kasaAy))}</b><button data-yn-kasa-ay="${i < aylar.length - 1 ? aylar[i + 1] : ''}" ${i < aylar.length - 1 ? '' : 'disabled'} aria-label="Sonraki ay">${ik('sag')}</button></div>
      <div class="yn-dg"><button class="u-hap" data-yn-hareket="Gider">${ik('arti')}Gider</button><button class="u-hap gri" data-yn-hareket="Gelir">${ik('arti')}Gelir</button><button class="u-hap gri" data-yn-kasa-excel>${ik('indir')}Excel</button></div></div>
    <div class="yn-kasa-kutular">${kart('Gelir', para(k.gelir), k.gelirDiger ? `mdSinyal ${para(k.gelirSinyal)} · diğer ${para(k.gelirDiger)}` : 'Kurs tahsilatları, KDV hariç', 'yesil')}${kart('Gider', para(k.gider), k.hr.filter(x => x.tur === 'Gider').length + ' kalem', 'kirmizi')}${kart('Ortak payı', para(k.pay), '%' + h.oran + ' · ' + e(v.ortak.ad.split(' ')[0]) + ' Bey')}${kart('Sana kalan', para(k.net), 'gelir − gider − ortak payı', k.net < 0 ? 'kirmizi koyu' : 'koyu')}</div>
    ${katL.length ? bolum('Giderin dağılımı', '', '', `<div class="yn-kat">${katL.map(([a, t]) => `<div class="yn-kat-sat"><span>${e(a)}</span><i style="--o:${Math.max(4, Math.round(t / katMax * 100))}%"></i><b>${para(t)}</b></div>`).join('')}</div>`) : ''}
    ${bolum('Hareketler', '', '', satirlar.length ? `<div class="tablo-kap"><table class="ort-tablo yn-kasa-tablo"><thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th class="sag">Tutar</th><th aria-label="Belge"></th><th aria-label="İşlemler"></th></tr></thead><tbody>${satirlar.map(x => `<tr class="${x.kendi ? 'tik' : 'oto'}" ${x.kendi ? `data-yn-hareket-ac="${e(x.id)}"` : ''}><td>${tarih(x.tarih)}</td><td><b>${e(x.aciklama || '')}</b>${x.yontem ? `<small class="ort-not">${e(x.yontem)}</small>` : ''}</td><td>${e(x.kategori || '')}</td><td class="sag ${x.tur === 'Gider' ? 'eksi' : 'arti'}">${x.tur === 'Gider' ? '−' : '+'}${para(x.tutar)}</td><td>${x.belge ? `<button class="yn-belge" data-yn-belge="${e(x.id)}" aria-label="Belgeyi aç">${ik('belge')}</button>` : ''}</td><td class="yn-h-dg">${x.kendi ? `<button data-yn-h-duzenle="${e(x.id)}" aria-label="Düzenle" title="Düzenle">${ik('kalem')}</button><button class="sil" data-yn-h-sil2="${e(x.id)}" aria-label="Sil" title="Sil">${ik('kapat')}</button>` : '<small title="Ortaklık bölümündeki tahsilattan gelir">otomatik</small>'}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="u-bos">${ik('kasa')}<b>${e(ayAd(kasaAy))} ayında hareket yok</b><p>Harcama yaptığında "Gider" ile ekle; faturanın fotoğrafını ya da PDF'ini de iliştirebilirsin.</p></div>`)}`;
}
function ozetHtml2(v, h) {
  const l = (v.isler || []).filter(x => !x.bitti && x.tur !== 'Hedef' && x.tarih && x.tarih <= gun(0)).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const sicak = (v.kurslar || []).filter(k => ['Sıcak', 'Riskli', 'Görüşülüyor'].includes(k.durum)).sort((a, b) => DURUMLAR.findIndex(x => x[0] === a.durum) - DURUMLAR.findIndex(x => x[0] === b.durum));
  const son = (v.hareketler || []).slice().sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 5);
  return `<div class="yn-izgara">
    <div>${bolum('Bugün', tarihUzun(gun(0)), `<button class="u-hap gri" data-yn-git="ajanda">Ajanda</button>`, `${isEkle()}${l.length ? l.map(x => isSatir(x, v)).join('') : '<p class="ort-bos">Bugün için iş yok.</p>'}`, 'yn-ekle-kart')}
      ${bolum('Son harcamalar', '', `<button class="u-hap gri" data-yn-git="kasa">Gelir-Gider</button>`, son.length ? son.map(x => `<div class="u-satir dokun" data-yn-hareket-ac="${e(x.id)}"><span class="u-satir-govde"><b>${e(x.aciklama || x.kategori || '')}</b><small>${tarih(x.tarih)} · ${e(x.kategori || '')}</small></span><span class="u-deger ${x.tur === 'Gider' ? 'eksi' : 'arti'}">${x.tur === 'Gider' ? '−' : '+'}${para(x.tutar)}</span></div>`).join('') : '<p class="ort-bos">Henüz harcama girilmedi.</p>')}</div>
    <div>${bolum('Takipteki kurslar', 'Sıcak, riskli ve görüşülenler', `<button class="u-hap gri" data-yn-git="kurslar">Kurslar</button>`, sicak.length ? sicak.map(k => { const d = DURUMLAR.find(x => x[0] === k.durum); return `<div class="u-satir dokun ${d[1]}" data-yn-kurs="${e(k.id)}"><span class="yn-nokta"></span><span class="u-satir-govde"><b>${e(k.ad)}</b><small>${e(k.sonraki || k.not || '')}${k.zaman ? ' · ' + e(k.zaman) : ''}</small></span><span class="yn-durum">${e(k.durum)}</span></div>`; }).join('') : '<p class="ort-bos">Takipte kurs yok.</p>')}</div>
  </div>`;
}
const BOLUMLER_YON = [['ozet', 'Özet', 'genel'], ['ajanda', 'Ajanda', 'takvim'], ['kurslar', 'Kurslar', 'kursiyer'], ['kasa', 'Gelir-Gider', 'kasa'], ['ortaklik', 'Ortaklık', 'rapor'], ['destek', 'Destek', 'mesaj'], ['hesaplar', 'Hesaplar', 'kilit']];
const BOLUMLER_ORT = [['ozet', 'Özet', 'genel'], ['kurslar', 'Kurslar', 'kursiyer'], ['ortaklik', 'Ortaklık', 'rapor']];
export function yonetimHtml(rol) {
  const v = S.isletme, h = hesap(v), o = v.ortak, yon = rol === 'mudur', bol = yon ? BOLUMLER_YON : BOLUMLER_ORT;
  v.isler = v.isler || []; v.hareketler = v.hareketler || [];
  if (!bol.some(b => b[0] === sekme)) sekme = 'ozet';
  if (!secAy) secAy = gun(0).slice(0, 7);
  const ay = aylik(v, h, gun(0).slice(0, 7)), kasa = kasaAyHesap(v, h, gun(0).slice(0, 7));
  const bugunIs = v.isler.filter(x => !x.bitti && x.tur !== 'Hedef' && x.tarih && x.tarih <= gun(0)).length;
  const say = { ajanda: bugunIs, kurslar: (v.kurslar || []).length };
  const borcAlt = h.kalanBorc ? (h.vadeGun != null && h.vadeGun >= 0 ? `${tarih(h.vade)} · ${h.vadeGun} gün` : 'son gün geçti') : 'kapandı';
  const olc = yon ? [[ayAd(ay.ay) + ' geliri', para(kasa.gelir), 'KDV hariç'], ['Gider', para(kasa.gider), kasa.hr.filter(x => x.tur === 'Gider').length + ' kalem'], ['Sana kalan', para(kasa.net), 'ortak payı düşülmüş'], ['Kalan borç', para(h.kalanBorc), borcAlt]]
    : [[ayAd(ay.ay) + ' tahsilat', para(ay.net), 'KDV hariç'], ['Bu ay pay', para(ay.pay), 'ödeme ' + tarih(ay.son)], ['Ödenmemiş pay', para(h.odenmemisPay), h.odenenPay ? para(h.odenenPay) + ' ödendi' : 'henüz ödeme yok'], ['Kalan borç', para(h.kalanBorc), borcAlt]];
  if (sekme === 'kurslar') { const kl = v.kurslar || [], ks = d => kl.filter(k => k.durum === d).length; olc.splice(0, 4, ['Toplam', kl.length + ' kurs', 'görüşülen ve takip edilen'], ['Sıcak', ks('Sıcak') + ' kurs', 'satışa en yakın'], ['Görüşülüyor', ks('Görüşülüyor') + ks('Riskli') + ' kurs', ks('Riskli') ? ks('Riskli') + ' tanesi riskli' : 'karar bekleniyor'], ['Müşteri', ks('Müşteri') + ' kurs', 'mdSinyal’i kullanan']); }
  const baslik = bol.find(b => b[0] === sekme)[1];
  const ust = `<section class="yn-hero"><div class="yn-ic"><small>${yon ? 'mdSinyal Yönetim' : 'Ortak paneli · yalnız görüntüleme'}</small><h1>${sekme === 'ozet' ? (yon ? 'Merhaba ' + e(String(S.kurs.yetkili || 'Servet').split(' ')[0]) : e(o.ad)) : baslik}</h1><p>${yon ? `${tarihUzun(gun(0))} · ${bugunIs ? bugunIs + ' iş seni bekliyor' : 'bugün için bekleyen iş yok'}` : `Satışlardan %${h.oran} pay · sözleşme ${tarih(o.baslangic)}`}</p>
    <div class="yn-olcum">${olc.map(([a, b, c]) => `<div><small>${a}</small><b>${b}</b><span>${c}</span></div>`).join('')}</div></div></section>`;
  const nav = sinif => `<nav class="${sinif}" aria-label="Bölümler">${bol.map(([k, t, i]) => `<button data-yn-sekme="${k}" class="${sekme === k ? 'secili' : ''}" ${sekme === k ? 'aria-current="page"' : ''}>${ik(i)}<span>${t}</span>${say[k] ? `<em>${say[k]}</em>` : ''}</button>`).join('')}</nav>`;
  let govde = '';
  if (sekme === 'ozet') govde = yon ? ozetHtml2(v, h) : bolum('Aylık döküm', 'Ödeme her ayın 10\'una kadar', `<button class="u-hap gri" data-ort-pdf>${ik('belge')}PDF</button>`, dokumHtml(v, h, secAy)) + bolum('Borç', 'Faizsiz, en geç 6 ayda', '', borcHtml(v, h)) + `<p class="u-dipnot">Bu ekran yalnız görüntüleme içindir; kayıtları Servet Sakar girer. Kursların öğrenci bilgileri burada yer almaz.</p>`;
  if (sekme === 'ajanda') govde = ajandaHtml(v);
  if (sekme === 'kurslar') govde = kurslarHtml(v, yon);
  if (sekme === 'kasa') govde = kasaHtml(v, h);
  if (sekme === 'hesaplar') govde = '<div data-sh-gomulu></div>';
  if (sekme === 'destek') govde = '<div data-sh-gomulu data-sh-gor="destek"></div>';  // destek talepleri ve verilen hizmetler  // bütün mdSinyal hesapları (sahip.js); yalnız Servet görür
  if (sekme === 'ortaklik') {
    const ortaklar = (S.kullanicilar || []).filter(u => u.rol === 'ortak');
    const ortakIc = ortaklar.length ? ortaklar.map(u => `<div class="u-satir"><span class="u-ik mor">${ik('kursiyer')}</span><span class="u-satir-govde"><b>${e(u.ad)}</b><small>${e(u.eposta || '')} · yalnız görüntüler</small></span>${yon ? `<button class="u-hap gri" data-ort-uye-cikar="${e(u.id)}">Erişimi kaldır</button>` : ''}</div>`).join('')
      : `<div class="u-satir"><span class="u-ik gri">${ik('kursiyer')}</span><span class="u-satir-govde"><b>${e(o.ad)}</b><small>Henüz katılmadı. Davet linkiyle kendi e-postası ve şifresiyle girer; her şeyi görür, değiştiremez. Ajanda ve Gelir-Gider ona gösterilmez.</small></span></div>`;
    govde = (yon ? bolum('Ortak', `Satışlardan %${h.oran} · sözleşme ${tarih(o.baslangic)}`, ortaklar.length ? '' : `<button class="u-hap" data-ort-davet>${ik('arti')}${e(o.ad.split(' ')[0])} Bey'i davet et</button>`, ortakIc) : '') +
      `<div class="yn-izgara"><div>${bolum('Aylık döküm', 'Ortağa her ayın 5\'ine kadar paylaşılır', `<button class="u-hap gri" data-ort-pdf>${ik('belge')}PDF</button>`, dokumHtml(v, h, secAy))}</div><div>${bolum('Borç', 'Faizsiz, en geç 6 ayda', '', borcHtml(v, h))}</div></div>` +
      bolum('Tahsilatlar', 'KDV hariç, kursun fiilen ödediği', yon ? `<button class="u-hap" data-ort-tahsilat ${(v.musteriler || []).length ? '' : 'disabled title="Önce müşteri ekleyin"'}>${ik('arti')}Tahsilat</button>` : '', tahsilatHtml(v, h, yon)) +
      `<div class="yn-izgara"><div>${bolum('Müşteri kurslar', 'mdSinyal kullanan ve ödeyen', yon ? `<button class="u-hap" data-ort-musteri-ekle>${ik('arti')}Müşteri</button>` : '', musteriHtml(v, yon))}</div><div>${bolum(yon ? 'Ortağa ödemeler' : 'Size yapılan ödemeler', 'Banka havalesiyle', yon ? `<button class="u-hap" data-ort-odeme>${ik('arti')}Ödeme</button>` : '', odemeHtml(v, yon))}</div></div>`;
  }
  return `<div class="yn ort">${nav('yn-yan')}<div class="yn-ana">${ust}<div class="yn-govde">${govde}</div></div>${nav('og-sekme yn-alt')}</div>`;
}
// iş ekle / düzenle
function isPenceresi(x, yenile) {
  const v = S.isletme, a = (et, ic) => `<label class="og-alan"><span class="og-alan-et">${et}</span>${ic}</label>`;
  pencere({ baslik: x.tur === 'Hedef' ? 'Hedef' : 'İş', alt: true, icerik: `<form id="f-ynis" class="og-giris-form yn-form">
      ${a('Başlık', `<span class="og-girdi"><input name="baslik" value="${e(x.baslik)}" required maxlength="200"></span>`)}
      ${a('Tür', `<span class="og-girdi"><select name="tur">${['İş', 'Hedef'].map(t => `<option ${x.tur === t ? 'selected' : ''}>${t}</option>`).join('')}</select></span>`)}
      <div class="yn-iki">${a('Tarih', `<span class="og-girdi"><input name="tarih" type="date" value="${e(x.tarih || '')}"></span>`)}${a('Saat', `<span class="og-girdi"><input name="saat" type="time" value="${e(x.saat || '')}"></span>`)}</div>
      ${a('Kurs <small>isteğe bağlı</small>', `<span class="og-girdi"><select name="kurs"><option value="">—</option>${(v.kurslar || []).map(k => `<option value="${e(k.id)}" ${x.kurs === k.id ? 'selected' : ''}>${e(k.ad)}</option>`).join('')}</select></span>`)}
      ${a('Not', `<span class="og-girdi yn-alan-uzun"><textarea name="not" rows="3">${e(x.not || '')}</textarea></span>`)}</form>`,
    altlik: `<button class="dg dg-cizgi" data-yn-is-sil style="margin-right:auto;color:var(--u-kirmizi)">Sil</button><button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-ynis">Kaydet</button>`,
    onAc(p) {
      const f = p.querySelector('form');
      f.addEventListener('submit', ev => { ev.preventDefault(); const b = f.baslik.value.trim(); if (!b) return bildir('Başlığı yaz', 'uyari');
        Object.assign(x, { baslik: b, tur: f.tur.value, tarih: f.tarih.value, saat: f.saat.value, kurs: f.kurs.value, not: f.not.value.trim() }); kaydetYayinla('mdSinyal Yönetim: işi güncelledi', b); kapatPencere(); yenile(); });
      p.querySelector('[data-yn-is-sil]').addEventListener('click', () => { kapatPencere(); silOnay('“' + x.baslik + '” silinsin mi?', () => { v.isler = v.isler.filter(y => y !== x); kaydetYayinla('mdSinyal Yönetim: işi sildi', x.baslik); yenile(); }); });
    } });
}
// gelir / gider ekle-düzenle; fatura ya da fiş: fotoğraf küçültülür (1600 px), PDF en çok 600 KB
function hareketPenceresi(x, tur, yenile, ilk = {}) {
  const v = S.isletme, yeni = !x, h0 = x || { tur, tarih: gun(0), kategori: tur === 'Gider' ? 'Diğer' : GELIR_KAT[0], aciklama: '', tutar: '', yontem: 'Kart', belge: '', ...ilk };
  const a = (et, ic) => `<label class="og-alan"><span class="og-alan-et">${et}</span>${ic}</label>`, kat = h0.tur === 'Gider' ? GIDER_KAT : GELIR_KAT;
  let belge = h0.belge || '';
  const belgeDurum = () => belge ? `<span class="yn-belge-var">${ik('belge')}${belge.startsWith('data:application/pdf') ? 'PDF iliştirildi' : belge.startsWith('data:image') ? 'Fotoğraf iliştirildi' : 'Belge kayıtlı'} <button type="button" class="u-bag" data-belge-kaldir>kaldır</button></span>` : '';
  pencere({ baslik: yeni ? (h0.tur === 'Gider' ? 'Yeni gider' : 'Yeni gelir') : (h0.tur === 'Gider' ? 'Gideri düzenle' : 'Geliri düzenle'), alt: true, icerik: `<form id="f-ynh" class="og-giris-form yn-form">
      ${a('Açıklama', `<span class="og-girdi"><input name="aciklama" value="${e(h0.aciklama || '')}" placeholder="${h0.tur === 'Gider' ? 'Örn. mdsinyal.com alan adı' : 'Örn. danışmanlık'}" required maxlength="200"></span>`)}
      <div class="yn-iki">${a('Tutar (₺)', `<span class="og-girdi"><input name="tutar" inputmode="decimal" value="${h0.tutar ? String(h0.tutar).replace('.', ',') : ''}" placeholder="0" required></span>`)}${a('Tarih', `<span class="og-girdi"><input name="tarih" type="date" value="${e(h0.tarih || gun(0))}"></span>`)}</div>
      <div class="yn-iki">${a('Kategori', `<span class="og-girdi"><select name="kategori">${kat.map(k => `<option ${h0.kategori === k ? 'selected' : ''}>${k}</option>`).join('')}</select></span>`)}${a('Ödeme', `<span class="og-girdi"><select name="yontem">${['Kart', 'Havale', 'Nakit'].map(k => `<option ${h0.yontem === k ? 'selected' : ''}>${k}</option>`).join('')}</select></span>`)}</div>
      ${a('Fatura ya da fiş <small>fotoğraf ya da PDF, isteğe bağlı</small>', `<span class="og-girdi yn-belge-sec"><input type="file" name="belge" accept="image/*,application/pdf" capture="environment"></span><span data-belge-durum>${belgeDurum()}</span>`)}
      ${a('Not', `<span class="og-girdi"><input name="not" value="${e(h0.not || '')}" maxlength="300"></span>`)}</form>`,
    altlik: `${yeni ? '' : '<button class="dg dg-cizgi" data-yn-h-sil style="margin-right:auto;color:var(--u-kirmizi)">Sil</button>'}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-ynh">Kaydet</button>`,
    onAc(p) {
      const f = p.querySelector('form'), durum = p.querySelector('[data-belge-durum]');
      p.addEventListener('click', ev => { if (ev.target.closest('[data-belge-kaldir]')) { belge = ''; durum.innerHTML = ''; } });
      f.belge.addEventListener('change', async () => {
        const d = f.belge.files[0]; if (!d) return;
        try {
          if (d.type === 'application/pdf') { if (d.size > 600 * 1024) { f.belge.value = ''; return bildir('PDF en çok 600 KB olabilir; telefonla fotoğrafını çekip ekleyebilirsin', 'uyari'); } belge = await new Promise((ok, red) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = red; r.readAsDataURL(d); }); }
          else if (d.type.startsWith('image/')) belge = await fotoKucult(d, 1600);
          else return bildir('Fotoğraf ya da PDF seç', 'uyari');
          durum.innerHTML = belgeDurum();
        } catch (x) { bildir('Belge okunamadı', 'uyari'); }
      });
      f.addEventListener('submit', ev => { ev.preventDefault(); const tutar = tutarOku(f.tutar.value), ac = f.aciklama.value.trim(); if (!ac) return bildir('Açıklamayı yaz', 'uyari'); if (!tutar) return bildir('Tutarı yaz', 'uyari');
        const y = { tur: h0.tur, tarih: f.tarih.value || gun(0), aciklama: ac, kategori: f.kategori.value, yontem: f.yontem.value, tutar, not: f.not.value.trim(), belge, is: h0.is || '' };
        if (x) Object.assign(x, y); else (v.hareketler = v.hareketler || []).push({ id: kimlik(), ...y });
        kaydetYayinla(yeni ? 'mdSinyal Yönetim: ' + h0.tur.toLocaleLowerCase('tr') + ' ekledi' : 'mdSinyal Yönetim: hareketi güncelledi', ac + ' · ' + para(tutar)); kapatPencere(); bildir((h0.tur === 'Gider' ? 'Gider' : 'Gelir') + ' kaydedildi'); kasaAy = y.tarih.slice(0, 7); yenile(); });
      const sil = p.querySelector('[data-yn-h-sil]'); if (sil) sil.addEventListener('click', () => { kapatPencere(); silOnay('“' + x.aciklama + '” silinsin mi?', () => { geriAlNoktasi(); v.hareketler = v.hareketler.filter(z => z !== x); kaydetYayinla('mdSinyal Yönetim: hareketi sildi', x.aciklama); yenile(); }); });
    } });
}
function belgeGoster(x) {
  const b = x.belge || '';
  if (!b.startsWith('data:')) return bildir('Belge yükleniyor; birkaç saniye sonra tekrar dene', 'uyari');
  const pdf = b.startsWith('data:application/pdf');
  pencere({ baslik: x.aciklama || 'Belge', genis: true, icerik: pdf ? `<iframe src="${b}" title="Belge" style="width:100%;height:70vh;border:0;border-radius:10px"></iframe>` : `<img src="${b}" alt="${e(x.aciklama || 'Belge')}" style="display:block;max-width:100%;max-height:72vh;margin:0 auto;border-radius:10px">`,
    altlik: `<a class="dg dg-cizgi" href="${b}" download="${e((x.aciklama || 'belge').replace(/[^\wçğıöşüÇĞİÖŞÜ .-]/g, '').slice(0, 60))}.${pdf ? 'pdf' : 'jpg'}">İndir</a><button class="dg dg-ana" data-kapat>Kapat</button>` });
}
async function kasaExcel(v, h) {
  const k = kasaAyHesap(v, h, kasaAy), sat = [['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Ödeme', 'Tutar (₺)', 'Belge'], ...k.hr.map(x => [x.tarih.split('-').reverse().join('.'), x.tur, x.kategori || '', x.aciklama || '', x.yontem || '', x.tur === 'Gider' ? -x.tutar : x.tutar, x.belge ? 'var' : '']), ...k.tah.map(t => [t.tarih.split('-').reverse().join('.'), 'Gelir', 'mdSinyal tahsilatı', t.musteriAd + ' · ' + t.tur, '', t.net, ''])];
  sat.push([], ['', '', '', 'Gelir', '', k.gelir, ''], ['', '', '', 'Gider', '', -k.gider, ''], ['', '', '', 'Ortak payı', '', -k.pay, ''], ['', '', '', 'Net', '', k.net, '']);
  const ad = 'mdsinyal-gelir-gider-' + kasaAy;
  try { if (!window.XLSX) await new Promise((ok, red) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = ok; sc.onerror = red; document.head.appendChild(sc); });
    const X = window.XLSX, ws = X.utils.aoa_to_sheet(sat), wb = X.utils.book_new(); ws['!cols'] = [12, 8, 22, 36, 10, 14, 8].map(w => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'Gelir-Gider'); X.writeFile(wb, ad + '.xlsx');
  } catch (x) { csvIndir(ad + '.csv', sat); }
}
// Kurs ekle/düzenle (yalnız yönetici): alttan açılan sayfa
function kursPenceresi(k, yenile) {
  const v = S.isletme, a = (ad, et, ic) => `<label class="og-alan"><span class="og-alan-et">${et}</span>${ic}</label>`;
  const girdi = (ad, deger, ek = '') => `<span class="og-girdi"><input name="${ad}" value="${e(deger || '')}" ${ek}></span>`;
  pencere({ baslik: k ? k.ad : 'Kurs ekle', alt: true, icerik: `<form id="f-ynk" class="og-giris-form yn-form">
      ${a('ad', 'Kurs adı', girdi('ad', k && k.ad, 'required placeholder="Örn. Kural Sürücü Kursu"'))}
      ${a('durum', 'Durum', `<span class="og-girdi"><select name="durum">${DURUMLAR.map(([d]) => `<option ${(k ? k.durum : 'Bekliyor') === d ? 'selected' : ''}>${d}</option>`).join('')}</select></span>`)}
      ${a('kisiler', 'Yetkili', girdi('kisiler', k && k.kisiler, 'placeholder="Örn. Pelin Hanım (kurs müdürü)"'))}
      <div class="yn-form-ikili">${a('gorusme', 'Görüşme sayısı', girdi('gorusme', k && k.gorusme, 'type="number" min="0" max="99" inputmode="numeric" placeholder="0"'))}${a('program', 'Kullandıkları program', girdi('program', k && k.program, 'placeholder="Örn. Tabim"'))}</div>
      ${a('not', 'Notlar', `<span class="og-girdi yn-alan-uzun"><textarea name="not" rows="4" placeholder="Ne konuşuldu, nerede kaldı, ek bilgiler">${e(k ? k.not || '' : '')}</textarea></span>`)}
      ${a('sonraki', 'Sonraki adım', girdi('sonraki', k && k.sonraki, 'placeholder="Örn. Cuma öğlen ara"'))}
      ${a('zaman', 'Ne zaman', girdi('zaman', k && k.zaman, 'placeholder="Örn. Salı 10:00"'))}
      ${a('teklif', 'Teklif', girdi('teklif', k && k.teklif, 'placeholder="Örn. 15.000 ₺"'))}
      ${a('itiraz', 'Çekinceleri <small>noktalı virgülle ayır</small>', girdi('itiraz', k && k.itiraz, 'placeholder="Örn. Fiyat pahalı; e-Arşiv"'))}</form>`,
    altlik: `${k ? '<button class="dg dg-cizgi" data-yn-kurs-sil style="margin-right:auto;color:var(--u-kirmizi)">Sil</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-ynk">Kaydet</button>`,
    onAc(p) {
      const f = p.querySelector('form');
      f.addEventListener('submit', ev => { ev.preventDefault(); const ad = f.ad.value.trim(); if (ad.length < 2) return bildir('Kurs adını yaz', 'uyari');
        const x = { ad, durum: f.durum.value, kisiler: f.kisiler.value.trim(), gorusme: Math.max(0, Math.min(99, parseInt(f.gorusme.value, 10) || 0)), program: f.program.value.trim(), not: f.not.value.trim(), sonraki: f.sonraki.value.trim(), zaman: f.zaman.value.trim(), teklif: f.teklif.value.trim(), itiraz: f.itiraz.value.trim(), guncel: gun(0) };
        if (k) Object.assign(k, x); else (v.kurslar = v.kurslar || []).push({ id: kimlik(), ...x });
        const kk = k || v.kurslar[v.kurslar.length - 1], bagli = kk.musteri && (v.musteriler || []).find(m => m.id === kk.musteri);
        if (x.durum === 'Müşteri' && !bagli) { const m = { id: kimlik(), ad, paket: 'Yıllık', sube: 1, bas: gun(0), durum: 'Aktif', not: '' }; (v.musteriler = v.musteriler || []).push(m); kk.musteri = m.id; kk.program = kk.program || 'mdSinyal'; bildir('Ortaklık › Müşteri kurslar listesine de eklendi'); }
        if (bagli && x.durum === 'Müşteri' && bagli.durum === 'Ayrıldı') bagli.durum = 'Aktif';
        if (bagli && x.durum !== 'Müşteri' && bagli.durum !== 'Ayrıldı') bagli.durum = 'Ayrıldı';
        if (bagli && !adEs(bagli.ad, ad)) bagli.ad = ad;
        kaydetYayinla(k ? 'mdSinyal Yönetim: kursu güncelledi' : 'mdSinyal Yönetim: kurs ekledi', ad); kapatPencere(); bildir('Kaydedildi'); yenile(); });
      const sil = p.querySelector('[data-yn-kurs-sil]'); if (sil) sil.addEventListener('click', () => { kapatPencere(); silOnay(k.ad + ' kurslar listesinden silinsin mi?', () => { geriAlNoktasi(); v.kurslar = v.kurslar.filter(y => y !== k); kaydetYayinla('mdSinyal Yönetim: kursu sildi', k.ad); yenile(); }); });
    } });
}
// Dosyadan kurs ekleme: { kurslar: [{ ad, durum, kisiler, not, sonraki, zaman, teklif, itiraz }] }; aynı adlı kurs varsa atlanır
function kursDosyasi(dosya, yenile) {
  dosya.text().then(t => {
    let d; try { d = JSON.parse(t); } catch (x) { return bildir('Dosya okunamadı; mdSinyal kurs dosyası (.json) seç', 'uyari'); }
    const l = Array.isArray(d) ? d : d && Array.isArray(d.kurslar) ? d.kurslar : null; if (!l) return bildir('Dosyada kurs listesi yok', 'uyari');
    const v = S.isletme, var_ = new Set((v.kurslar || []).map(k => k.ad.toLocaleLowerCase('tr'))), metin = x => String(x == null ? '' : x).slice(0, 600);
    let n = 0;
    l.forEach(k => { const ad = metin(k && k.ad).trim(); if (ad.length < 2 || var_.has(ad.toLocaleLowerCase('tr'))) return; var_.add(ad.toLocaleLowerCase('tr'));
      (v.kurslar = v.kurslar || []).push({ id: kimlik(), ad, durum: DURUMLAR.some(x => x[0] === k.durum) ? k.durum : 'Bekliyor', kisiler: metin(k.kisiler), not: metin(k.not), sonraki: metin(k.sonraki), zaman: metin(k.zaman), teklif: metin(k.teklif), itiraz: metin(k.itiraz), gorusme: Math.max(0, parseInt(k.gorusme, 10) || 0), program: metin(k.program).slice(0, 60), guncel: gun(0) }); n++; });
    if (!n) return bildir('Eklenecek yeni kurs yok; hepsi zaten listede', 'uyari');
    kaydetYayinla('mdSinyal Yönetim: dosyadan kurs ekledi', n + ' kurs'); bildir(n + ' kurs eklendi'); yenile();
  });
}
export function yonetimBaglan(k, rol, yenile) {
  const yon = rol === 'mudur';
  if (yon && S.isletme && musteriKursEsle(S.isletme)) { kaydetYayinla('mdSinyal Yönetim: müşteriler Kurslar ile eşleşti'); setTimeout(yenile, 0); }
  k.addEventListener('click', ev => {
    const t = ev.target, v = S.isletme;
    const sk = t.closest('[data-yn-sekme]'); if (sk) { sekme = sk.dataset.ynSekme; yenile(); return scrollTo(0, 0); }
    const gt = t.closest('[data-yn-git]'); if (gt) { sekme = gt.dataset.ynGit; yenile(); return scrollTo(0, 0); }
    const kac = t.closest('[data-yn-kurs-ac]'); if (kac) { const x = (v.kurslar || []).find(y => y.id === kac.dataset.ynKursAc); if (x) kursDetay(x, yon, yenile); return; }
    const fl = t.closest('[data-yn-filtre]'); if (fl) { kursFiltre = fl.dataset.ynFiltre; return yenile(); }
    const ay = t.closest('[data-ort-ay]'); if (ay && ay.dataset.ortAy && !yon) { secAy = ay.dataset.ortAy; return yenile(); }
    if (!yon) return;
    const ka = t.closest('[data-yn-kasa-ay]'); if (ka && ka.dataset.ynKasaAy) { kasaAy = ka.dataset.ynKasaAy; return yenile(); }
    if (t.closest('[data-yn-kasa-excel]')) return kasaExcel(v, hesap(v));
    const ht = t.closest('[data-yn-hareket]'); if (ht) return hareketPenceresi(null, ht.dataset.ynHareket, yenile);
    const bl = t.closest('[data-yn-belge]'); if (bl) { ev.stopPropagation(); return belgeGoster((v.hareketler || []).find(x => x.id === bl.dataset.ynBelge) || {}); }
    const hd = t.closest('[data-yn-h-duzenle]'); if (hd) { ev.stopPropagation(); const x = (v.hareketler || []).find(y => y.id === hd.dataset.ynHDuzenle); if (x) hareketPenceresi(x, x.tur, yenile); return; }
    const hs = t.closest('[data-yn-h-sil2]'); if (hs) { ev.stopPropagation(); const x = (v.hareketler || []).find(y => y.id === hs.dataset.ynHSil2); if (x) silOnay('“' + (x.aciklama || x.kategori) + '” (' + para(x.tutar) + ') silinsin mi?', () => { geriAlNoktasi(); v.hareketler = v.hareketler.filter(z => z !== x); kaydetYayinla('mdSinyal Yönetim: hareketi sildi', x.aciklama); yenile(); bildir('Silindi', 'tamam', true); }); return; }
    const ha = t.closest('[data-yn-hareket-ac]'); if (ha) { const x = (v.hareketler || []).find(y => y.id === ha.dataset.ynHareketAc); if (x) return hareketPenceresi(x, x.tur, yenile); }
    const tr = t.closest('[data-yn-is-tur]'); if (tr) { isEkTur = tr.dataset.ynIsTur; return yenile(); }
    const ib = t.closest('[data-yn-is-bitti]'); if (ib) { const x = v.isler.find(y => y.id === ib.dataset.ynIsBitti); if (x) { x.bitti = x.bitti ? '' : gun(0); kaydetYayinla(x.bitti ? 'mdSinyal Yönetim: işi tamamladı' : 'mdSinyal Yönetim: işi geri açtı', x.baslik); yenile(); } return; }
    const ig = t.closest('[data-yn-is-gider]'); if (ig) { const x = v.isler.find(y => y.id === ig.dataset.ynIsGider); return hareketPenceresi(null, 'Gider', yenile, { aciklama: x ? x.baslik : '', is: x ? x.id : '' }); }
    const is = t.closest('[data-yn-is]'); if (is) { const x = v.isler.find(y => y.id === is.dataset.ynIs); if (x) return isPenceresi(x, yenile); }
    if (t.closest('[data-yn-kurs-ekle]')) return kursPenceresi(null, yenile);
    const kk = t.closest('[data-yn-kurs]'); if (kk) return kursPenceresi((v.kurslar || []).find(x => x.id === kk.dataset.ynKurs), yenile);
  });
  k.addEventListener('submit', ev => {
    const f = ev.target.closest('[data-yn-is-form]'); if (!f || !yon) return; ev.preventDefault();
    const b = f.baslik.value.trim(); if (!b) return f.baslik.focus();
    const v = S.isletme; (v.isler = v.isler || []).push({ id: kimlik(), baslik: b, tur: isEkTur, tarih: f.tarih.value, saat: '', kurs: '', not: '', bitti: '', eklendi: gun(0) });
    kaydetYayinla('mdSinyal Yönetim: ' + (isEkTur === 'Hedef' ? 'hedef' : 'iş') + ' ekledi', b); bildir(isEkTur === 'Hedef' ? 'Hedef eklendi' : 'İş eklendi'); yenile();
    requestAnimationFrame(() => { const i = document.querySelector('[data-yn-is-form] input[name=baslik]'); if (i) i.focus(); });
  });
  k.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches('[data-yn-kurs],[data-yn-kurs-ac],[data-yn-is],[data-yn-hareket-ac]')) ev.target.click(); });
  k.addEventListener('change', ev => { const i = ev.target.closest('[data-yn-kurs-dosya]'); if (i && i.files[0] && yon) { kursDosyasi(i.files[0], yenile); i.value = ''; } });
  if (yon) ayarBaglan(k, yenile);
}
// Kurulum: yeni ve boş bir hesap bir kez "mdSinyal Yönetim" hesabına çevrilir (#/yonetim-kur, yalnız müdür)
export const kurulabilir = () => !S.isletme && !(S.kursiyerler || []).length && !(S.dersler || []).length && !(S.hareket || []).length;
export function kurulumHtml() {
  return `<div class="kart ort-kur"><div class="kart-bas"><h3>mdSinyal Yönetim hesabını kur</h3><small>Bu hesap kurs olarak değil, mdSinyal'in kendi gelir paylaşımı için kullanılır</small></div>
    <form class="kart-govde" id="f-yk">
      <div class="izgara iz-2" style="gap:12px">${alan('Ortağın adı soyadı', '<input name="ad" value="Eyüp Çağlar" required>')}${alan('Gelir payı (%)', '<input name="oran" inputmode="numeric" value="40">')}</div>
      <div class="izgara iz-2" style="gap:12px">${alan('Sözleşme tarihi', '<input name="bas" type="date" value="2026-11-10">')}${alan('Borcun aktarıldığı tarih', '<input name="bt" type="date" value="2026-11-11">')}</div>
      <div class="izgara iz-2" style="gap:12px">${alan('Anapara (₺)', '<input name="anapara" inputmode="numeric" value="50.000">')}${alan('Yeni satış başına anapara iadesi (₺)', '<input name="iade" inputmode="numeric" value="2.000">')}</div>
      <p class="ort-onizle">Kurulduktan sonra bu hesapta öğrenci, ders ve kasa ekranları açılmaz; yalnız gelir paylaşımı ekranı açılır. Bu işlem geri alınamaz, bu yüzden boş ve yeni bir hesapta yapın.</p>
      <button class="dg dg-ana" type="submit" style="margin-top:14px">mdSinyal Yönetim hesabını kur</button></form></div>`;
}
export function kurulumBaglan(k, bitti) {
  const f = k.querySelector('#f-yk'); if (!f) return;
  f.addEventListener('submit', ev => { ev.preventDefault(); if (!kurulabilir()) return bildir('Bu hesapta kurs kaydı var; yeni ve boş bir hesap açın', 'uyari');
    const oran = +f.oran.value.replace(/\D/g, '') || 40, anapara = tutarOku(f.anapara.value), satisIade = tutarOku(f.iade.value);
    isletmeKur({ ad: f.ad.value.trim(), oran, baslangic: f.bas.value, anapara, borcTarih: f.bt.value, satisIade });
    S.kurs.tur = 'yonetim'; S.kurs.ad = 'mdSinyal Yönetim'; kaydet(); bildir('mdSinyal Yönetim hesabı kuruldu'); bitti(); });
}

// İlk kurulum: hesapta işletme defteri yoksa sözleşme bilgileriyle açılır (yalnız kurulum adresinden)
export function isletmeKur({ ad, oran, baslangic, anapara, borcTarih, satisIade }) {
  if (S.isletme) return false;
  S.isletme = { ortak: { ad, oran, baslangic, link: null }, borc: { anapara, tarih: borcTarih, satisIade }, musteriler: [], tahsilatlar: [], odemeler: [] };
  islem('Ortaklık defterini açtı', ad + ' · %' + oran);
  kaydet(); return true;
}
