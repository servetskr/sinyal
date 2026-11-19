// Görüşme kaydı ve listesi (DIG-009, Çizgi Ö2): telefon, yüz yüze ya da mesaj görüşmesi; "tekrar ara" kontrol zamanı; kursun tanımladığı etiketler.
// Kişi: yeni öğrenci (ön kayıt, S.adaylar), öğrenci ya da başka biri (ad + telefon). Ön kayıt öğrenciye dönüşünce görüşmeleri öğrencinin dosyasında görünür (telefonla eşleşir).
// Bugün: kontrol günü bugün ya da geçmiş, kapatılmamış görüşmeler (kural G01). Liste süzgeçleri ve Bugün sayacı aynı ölçütü kullanır (Çizgi'deki sayaç/liste farkı olmasın).
// Model: S.gorusmeler = [{ id, zaman, kontrol ('YYYY-AA-GGTSS:DD' | ''), kisi: { tur: 'aday'|'kursiyer'|'diger', id?, ad, tel }, konu, etiket, detay,
//                          kanal, kaydeden, kayitZaman, degistiren?, degisZaman?, kapandi? }]
import { S, oturum, kaydet, gun, kursiyer, tamAd, islem } from './veri.js?v=235';
import { e, ik, rozet, pencere, kapatPencere, bildir, tarih, bos, isaret } from './ui.js?v=235';

export const KANALLAR = ['Telefon', 'Yüz yüze', 'WhatsApp', 'Diğer'];
const VARSAYILAN_ETIKET = ['Fiyat sordu', 'Kayıt olacak', 'Düşünüyor', 'Ödeme', 'Şikâyet', 'Vazgeçti'];
export const etiketler = () => { const l = (S.kurs && S.kurs.gorusmeEtiketleri) || VARSAYILAN_ETIKET; return [...new Set([...l, ...liste().map(g => g.etiket).filter(Boolean)])]; };
const liste = () => (S.gorusmeler = S.gorusmeler || []);
const simdi = () => gun(0) + 'T' + new Date().toTimeString().slice(0, 5);
const zamanYaz = t => { if (!t) return ''; const [g, s] = String(t).split('T'); return tarih(g) + (s ? ' ' + s : ''); };
const telN = t => String(t || '').replace(/\D/g, '').slice(-10);
// Ön kayıt öğrenciye dönüştüyse (aynı telefon) görüşme öğrencinin sayılır
export function kisiAc(g) {
  const k = g.kisi || {};
  if (k.tur === 'kursiyer') { const x = kursiyer(k.id); return x ? { ad: tamAd(x), tel: x.tel, link: '#/kursiyer/' + x.id, tur: 'Öğrenci' } : { ad: k.ad, tel: k.tel, tur: 'Öğrenci' }; }
  if (k.tur === 'aday') { const a = (S.adaylar || []).find(y => y.id === k.id), t = telN((a && a.tel) || k.tel), x = t && (S.kursiyerler || []).find(y => telN(y.tel) === t);
    if (x) return { ad: tamAd(x), tel: x.tel, link: '#/kursiyer/' + x.id, tur: 'Öğrenci (ön kayıttan)' };
    return { ad: (a && a.ad) || k.ad, tel: (a && a.tel) || k.tel, link: a ? '#/adaylar/' + a.id : '', tur: 'Ön kayıt' }; }
  return { ad: k.ad, tel: k.tel, tur: 'Diğer' };
}
// Kontrol zamanı gelen: günü bugün ya da geçmiş (bugünün ileri saati de dahil), kapatılmamış
export const kontrolGelen = () => liste().filter(g => g.kontrol && !g.kapandi && g.kontrol.slice(0, 10) <= gun(0));
export const kisininGorusmeleri = (tur, id, tel) => liste().filter(g => (g.kisi && g.kisi.tur === tur && g.kisi.id === id) || (tel && telN(kisiAc(g).tel) === telN(tel))).sort((a, b) => String(b.zaman).localeCompare(String(a.zaman)));

export function gorusmePenceresi({ kisi = null, mevcut = null, sonra } = {}) {
  const g = mevcut || {}, ks = (S.kursiyerler || []).filter(k => !k.kapali).sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr')), ad = (S.adaylar || []).filter(a => !['Kayıt', 'Kaybedildi'].includes(a.asama));
  const k0 = mevcut ? g.kisi : kisi || { tur: 'diger' }, secDeger = k0.tur === 'diger' ? '' : k0.tur + ':' + k0.id;
  pencere({ baslik: mevcut ? 'Görüşmeyi düzenle' : 'Görüşme kaydı', icerik: `<form id="f-gor" class="form-izgara" novalidate>
      <div class="alan tam"><label for="gr-k">Görüşülen kişi</label><select id="gr-k" name="kisi"><option value="">Başka biri (ad ve telefon yazın)</option>${ad.length ? `<optgroup label="Yeni öğrenciler (ön kayıt)">${ad.map(a => `<option value="aday:${e(a.id)}" ${secDeger === 'aday:' + a.id ? 'selected' : ''}>${e(a.ad)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Öğrenciler">${ks.map(k => `<option value="kursiyer:${e(k.id)}" ${secDeger === 'kursiyer:' + k.id ? 'selected' : ''}>${e(tamAd(k))}</option>`).join('')}</optgroup></select></div>
      <div class="alan gr-dis"><label for="gr-ad">Ad soyad</label><input id="gr-ad" name="ad" maxlength="60" value="${e(k0.tur === 'diger' ? k0.ad || '' : '')}"></div>
      <div class="alan gr-dis"><label for="gr-tel">Telefon</label><input id="gr-tel" name="tel" inputmode="tel" value="${e(k0.tur === 'diger' ? k0.tel || '' : '')}"></div>
      <div class="alan"><label for="gr-z">Görüşme zamanı</label><input id="gr-z" name="zaman" type="datetime-local" value="${e(g.zaman || simdi())}"></div>
      <div class="alan"><label for="gr-kn">Kanal</label><select id="gr-kn" name="kanal">${KANALLAR.map(x => `<option ${(g.kanal || 'Telefon') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="alan"><label for="gr-ko">Konu</label><input id="gr-ko" name="konu" maxlength="80" value="${e(g.konu || '')}" placeholder="Ör. B sınıfı fiyat"></div>
      <div class="alan"><label for="gr-et">Etiket</label><input id="gr-et" name="etiket" maxlength="30" list="gr-etl" value="${e(g.etiket || '')}"><datalist id="gr-etl">${etiketler().map(x => `<option value="${e(x)}">`).join('')}</datalist></div>
      <div class="alan tam"><label for="gr-d">Ayrıntı</label><textarea id="gr-d" name="detay" rows="3" maxlength="1000">${e(g.detay || '')}</textarea></div>
      <div class="alan"><label for="gr-kt">Tekrar ara (kontrol zamanı)</label><input id="gr-kt" name="kontrol" type="datetime-local" value="${e(g.kontrol || '')}"><small style="color:var(--soluk)">Günü gelince Bugün listesine düşer</small></div>
      ${mevcut ? `<label class="tam" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="kapandi" ${g.kapandi ? 'checked' : ''} style="width:18px;height:18px"> Takip bitti (Bugün’e düşmez)</label>` : ''}</form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-gor">Kaydet</button>',
    onAc(p) { const f = p.querySelector('form'), dis = () => p.querySelectorAll('.gr-dis').forEach(x => { x.hidden = !!f.kisi.value; }); f.kisi.addEventListener('change', dis); dis();
      f.addEventListener('submit', ev => { ev.preventDefault();
        let ks_; if (f.kisi.value) { const [tur, id] = f.kisi.value.split(':'), x = tur === 'kursiyer' ? kursiyer(id) : (S.adaylar || []).find(a => a.id === id); ks_ = { tur, id, ad: x ? (tur === 'kursiyer' ? tamAd(x) : x.ad) : '', tel: (x && x.tel) || '' }; }
        else { const a = f.ad.value.trim(); if (a.length < 2) return bildir('Görüşülen kişinin adını yazın', 'uyari'); ks_ = { tur: 'diger', ad: a, tel: f.tel.value.trim() }; }
        if (!f.konu.value.trim() && !f.detay.value.trim()) return bildir('Konu ya da ayrıntı yazın', 'uyari');
        if (f.kontrol.value && f.zaman.value && f.kontrol.value < f.zaman.value) return bildir('Tekrar arama zamanı görüşmeden önce olamaz', 'uyari');
        const u = (oturum.kullanici && oturum.kullanici.ad) || '', v = { kisi: ks_, zaman: f.zaman.value || simdi(), kanal: f.kanal.value, konu: f.konu.value.trim(), etiket: f.etiket.value.trim(), detay: f.detay.value.trim(), kontrol: f.kontrol.value || '' };
        if (mevcut) { Object.assign(mevcut, v, { degistiren: u, degisZaman: simdi(), kapandi: f.kapandi && f.kapandi.checked ? simdi() : undefined }); if (!mevcut.kapandi) delete mevcut.kapandi; islem('Görüşme kaydını düzenledi', ks_.ad); }
        else { liste().push({ id: 'gr' + Date.now().toString(36), ...v, kaydeden: u, kayitZaman: simdi() }); islem('Görüşme kaydetti', `${ks_.ad}${v.konu ? ' · ' + v.konu : ''}`); }
        if (v.etiket && !etiketler().includes(v.etiket)) S.kurs.gorusmeEtiketleri = [...etiketler(), v.etiket];
        kaydet(); kapatPencere(); bildir(v.kontrol ? `Kaydedildi; ${zamanYaz(v.kontrol)} için hatırlatılacak` : 'Görüşme kaydedildi'); sonra && sonra(); }); } });
}
const satir = g => { const k = kisiAc(g), gec = g.kontrol && !g.kapandi && g.kontrol.slice(0, 10) < gun(0), bugun = g.kontrol && !g.kapandi && g.kontrol.slice(0, 10) === gun(0);
  return `<li class="gr-satir" data-gr="${e(g.id)}"><div style="flex:1;min-width:0"><b>${k.link ? `<a href="${k.link}">${e(k.ad || '—')}</a>` : e(k.ad || '—')}</b> <small style="color:var(--soluk)">${e(k.tur)}${k.tel ? ' · <span class="num">' + e(k.tel) + '</span>' : ''}</small>${g.etiket ? ' ' + rozet(g.etiket, 'mavi') : ''}
    <small style="display:block;color:var(--metin)">${e(zamanYaz(g.zaman))} · ${e(g.kanal || '')}${g.konu ? ' · <b>' + e(g.konu) + '</b>' : ''}${g.detay ? ' · ' + e(g.detay.slice(0, 160)) : ''}</small>
    <small style="display:block;color:var(--soluk)">Kaydeden ${e(g.kaydeden || '—')} · ${e(zamanYaz(g.kayitZaman))}${g.degistiren ? ` · değiştiren ${e(g.degistiren)} · ${e(zamanYaz(g.degisZaman))}` : ''}</small></div>
    <span class="sag" style="flex-direction:column;align-items:flex-end;gap:4px">${g.kontrol ? `<span class="gr-kontrol${gec ? ' gec' : bugun ? ' bugun' : ''}${g.kapandi ? ' bitti' : ''}">${ik('saat')}${g.kapandi ? 'Takip bitti' : 'Tekrar ara ' + e(zamanYaz(g.kontrol))}</span>` : ''}<span style="display:flex;gap:6px">${g.kontrol && !g.kapandi ? `<button class="dg dg-cizgi dg-kucuk" data-gr-bitti>Arandı</button>` : ''}<button class="dg dg-hafif dg-kucuk" data-gr-duz>${ik('kalem')}</button></span></span></li>`; };
let suzgec = 'kontrol';
export function gorusmeKarti({ kisi = null, baslik = 'Görüşme kayıtları' } = {}) {
  const hepsi = kisi ? kisininGorusmeleri(kisi.tur, kisi.id, kisi.tel) : liste().slice().sort((a, b) => String(b.zaman).localeCompare(String(a.zaman)));
  const kg = kisi ? [] : kontrolGelen(), l = kisi || suzgec === 'hepsi' ? hepsi : kg.sort((a, b) => a.kontrol.localeCompare(b.kontrol));
  return `<div class="kart gr-kart"><div class="kart-bas"><h3>${e(baslik)}</h3><small>${kisi ? hepsi.length + ' görüşme' : `Tekrar aranacak ${kg.length} · toplam ${hepsi.length}`}</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-gr-yeni>${ik('arti')}Görüşme ekle</button></div></div>
    ${kisi ? '' : `<div style="padding:8px 16px 0;display:flex;gap:6px"><button class="dg dg-kucuk ${suzgec === 'kontrol' ? 'dg-koyu' : 'dg-cizgi'}" data-gr-suz="kontrol">Tekrar aranacaklar (${kg.length})</button><button class="dg dg-kucuk ${suzgec === 'hepsi' ? 'dg-koyu' : 'dg-cizgi'}" data-gr-suz="hepsi">Hepsi (${hepsi.length})</button></div>`}
    ${l.length ? `<ul class="liste gr-liste">${l.slice(0, 80).map(satir).join('')}</ul>` : `<div class="kart-govde">${bos(kisi ? 'Görüşme kaydı yok' : suzgec === 'kontrol' ? 'Bugün aranacak kimse yok' : 'Görüşme kaydı yok', 'Telefon ya da yüz yüze görüşmeleri buraya yazın; tekrar arama zamanı verirseniz günü gelince Bugün’e düşer.')}</div>`}</div>`;
}
// Tıklama işleyicisi (sayfa yeniden çizilse de çalışsın diye kapsayıcıya bağlanır); işlediyse true
export function gorusmeTikla(ev, yenile, kisi = null) {
  const kart = ev.target.closest('.gr-kart'); if (!kart) return false;
  if (ev.target.closest('[data-gr-yeni]')) { gorusmePenceresi({ kisi, sonra: yenile }); return true; }
  const s = ev.target.closest('[data-gr-suz]'); if (s) { suzgec = s.dataset.grSuz; yenile(); return true; }
  const li = ev.target.closest('[data-gr]'), g = li && liste().find(x => x.id === li.dataset.gr); if (!g) return false;
  if (ev.target.closest('[data-gr-duz]')) { gorusmePenceresi({ mevcut: g, sonra: yenile }); return true; }
  if (ev.target.closest('[data-gr-bitti]')) { g.kapandi = simdi(); g.degistiren = (oturum.kullanici && oturum.kullanici.ad) || ''; g.degisZaman = simdi(); islem('Görüşme takibini kapattı', kisiAc(g).ad); kaydet(); bildir('Takip kapandı'); yenile(); return true; }
  return false;
}
export function gorusmeBaglan(k, yenile, kisi = null) { k.addEventListener('click', ev => gorusmeTikla(ev, yenile, kisi)); }
