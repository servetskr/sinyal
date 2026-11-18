// Kişisel not defteri (DIG-011, Çizgi Ö3): yalnız ekleyen görür (kullanıcı başına S.notlarim[kullanıcı]; ekranda başkasınınki listelenmez).
// Yaz + Enter ile eklenir; düzenle, renk, alarm (tarihi gelince panel açılır açılmaz uyarı), sabitle, tamamlandı (listeden kalkar), sil + geri al.
// Sıra: sabitlenenler, sonra alarmı yakın olanlar, sonra yeniler.
import { S, oturum, kaydet, gun, geriAlNoktasi } from './veri.js?v=234';
import { e, ik, bildir, pencere, kapatPencere } from './ui.js?v=234';

const RENK = { '': 'Renksiz', sari: 'Sarı', yesil: 'Yeşil', mavi: 'Mavi', kirmizi: 'Kırmızı' };
const kim = () => (oturum.kullanici && (oturum.kullanici.id || oturum.kullanici.ad)) || 'cihaz';
export const notlarim = () => { const o = S.notlarim = S.notlarim || {}; return (o[kim()] = o[kim()] || []); };
const simdi = () => gun(0) + 'T' + new Date().toTimeString().slice(0, 5);
const alarmYazi = t => { const [g, s] = String(t).split('T'); return g.split('-').reverse().join('.') + (s ? ' ' + s : ''); };
let tamamGoster = false;
const sirala = l => l.slice().sort((a, b) => (b.sabit ? 1 : 0) - (a.sabit ? 1 : 0) || (a.alarm && !a.alarmGoruldu ? 0 : 1) - (b.alarm && !b.alarmGoruldu ? 0 : 1) || String(a.alarm || '9').localeCompare(String(b.alarm || '9')) || String(b.zaman).localeCompare(String(a.zaman)));
const satir = n => `<li class="nd-satir${n.renk ? ' nd-' + n.renk : ''}${n.tamam ? ' nd-tamam' : ''}" data-nd="${e(n.id)}">
    <button type="button" class="nd-onay" data-nd-tamam aria-label="${n.tamam ? 'Tamamlanmadı yap' : 'Tamamlandı'}" aria-pressed="${!!n.tamam}">${n.tamam ? ik('tik') : ''}</button>
    <div class="nd-metin"><span>${e(n.metin)}</span>${n.aciklama ? `<small>${e(n.aciklama)}</small>` : ''}${n.alarm ? `<small class="nd-alarm${!n.alarmGoruldu && n.alarm <= simdi() ? ' gecti' : ''}">${ik('saat')}${alarmYazi(n.alarm)}</small>` : ''}</div>
    <span class="nd-dg"><button type="button" class="dg-ikon" data-nd-sabit aria-label="${n.sabit ? 'Sabitlemeyi kaldır' : 'Sabitle'}" title="${n.sabit ? 'Sabitlemeyi kaldır' : 'Sabitle'}"${n.sabit ? ' style="color:var(--levha)"' : ''}>${ik('yildiz')}</button><button type="button" class="dg-ikon" data-nd-duzenle aria-label="Düzenle">${ik('kalem')}</button><button type="button" class="dg-ikon" data-nd-sil aria-label="Sil" title="Sil">${ik('kapat')}</button></span></li>`;
export function notKarti() {
  if (!oturum.kullanici) return '';
  const l = notlarim(), acik = sirala(l.filter(n => !n.tamam)), biten = l.filter(n => n.tamam);
  return `<div class="kart nd-kart"><div class="kart-bas"><h3>Notlarım</h3><small>Yalnız siz görürsünüz</small></div>
    <form class="nd-ekle" data-nd-form autocomplete="off"><input class="girdi" name="metin" maxlength="300" placeholder="Not yazın, Enter’a basın" aria-label="Yeni not"></form>
    <ul class="nd-liste">${acik.map(satir).join('') || '<li class="nd-bos">Not yok. Hatırlamak istediğinizi yazın; alarm kurabilirsiniz.</li>'}</ul>
    ${biten.length ? `<button type="button" class="nd-ac" data-nd-biten>${tamamGoster ? '▾' : '▸'} Tamamlananlar (${biten.length})</button>${tamamGoster ? `<ul class="nd-liste">${biten.map(satir).join('')}</ul>` : ''}` : ''}</div>`;
}
function duzenle(n, sonra) {
  pencere({ baslik: 'Notu düzenle', taslak: false, icerik: `<form id="f-nd" class="form-izgara" novalidate>
      <div class="alan tam"><label for="nd-m">Not</label><input id="nd-m" name="metin" maxlength="300" value="${e(n.metin)}"></div>
      <div class="alan tam"><label for="nd-a">Açıklama</label><textarea id="nd-a" name="aciklama" rows="2" maxlength="600">${e(n.aciklama || '')}</textarea></div>
      <div class="alan"><label for="nd-r">Renk</label><select id="nd-r" name="renk">${Object.entries(RENK).map(([v, t]) => `<option value="${v}" ${(n.renk || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="alan"><label for="nd-al">Alarm</label><input id="nd-al" name="alarm" type="datetime-local" value="${e(n.alarm || '')}"><small style="color:var(--soluk)">Zamanı gelince panel açılır açılmaz uyarı çıkar</small></div></form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-nd">Kaydet</button>',
    onAc(p) { p.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target, m = f.metin.value.trim(); if (!m) return bildir('Not boş olamaz', 'uyari');
      const al = f.alarm.value; if (al !== (n.alarm || '')) delete n.alarmGoruldu; Object.assign(n, { metin: m, aciklama: f.aciklama.value.trim(), renk: f.renk.value, alarm: al || '', degisti: simdi() }); if (!n.alarm) delete n.alarm;
      kaydet(); kapatPencere(); bildir('Not kaydedildi'); sonra && sonra(); }); } });
}
export function notBaglan(k, yenile) {
  const f = k.querySelector('[data-nd-form]'); if (!f) return;
  f.addEventListener('submit', ev => { ev.preventDefault(); const m = f.metin.value.trim(); if (!m) return; notlarim().push({ id: 'n' + Date.now().toString(36), metin: m.slice(0, 300), zaman: simdi() }); kaydet(); yenile(); setTimeout(() => { const i = document.querySelector('[data-nd-form] input'); if (i) i.focus(); }, 50); });
  k.querySelector('.nd-kart').addEventListener('click', ev => {
    if (ev.target.closest('[data-nd-biten]')) { tamamGoster = !tamamGoster; return yenile(); }
    const li = ev.target.closest('[data-nd]'); if (!li) return; const l = notlarim(), n = l.find(x => x.id === li.dataset.nd); if (!n) return;
    if (ev.target.closest('[data-nd-tamam]')) { n.tamam = !n.tamam; if (n.tamam) n.bitti = simdi(); kaydet(); return yenile(); }
    if (ev.target.closest('[data-nd-sabit]')) { n.sabit = !n.sabit; kaydet(); return yenile(); }
    if (ev.target.closest('[data-nd-duzenle]')) return duzenle(n, yenile);
    if (ev.target.closest('[data-nd-sil]')) { geriAlNoktasi(); l.splice(l.indexOf(n), 1); kaydet(); yenile(); bildir('Not silindi', 'tamam', true); }
  });
}
// Panel açılınca zamanı gelmiş alarmlar: bir kez uyarı penceresi, "Tamam" ile görüldü sayılır
export function alarmlariGoster() {
  if (!oturum.kullanici || document.querySelector('.perde')) return;
  const l = notlarim().filter(n => !n.tamam && n.alarm && !n.alarmGoruldu && n.alarm <= simdi()); if (!l.length) return;
  pencere({ baslik: l.length > 1 ? `${l.length} not hatırlatması` : 'Not hatırlatması', taslak: false, icerik: `<ul class="nd-liste">${l.map(n => `<li class="nd-satir${n.renk ? ' nd-' + n.renk : ''}"><div class="nd-metin"><span>${e(n.metin)}</span>${n.aciklama ? `<small>${e(n.aciklama)}</small>` : ''}<small class="nd-alarm gecti">${ik('saat')}${alarmYazi(n.alarm)}</small></div></li>`).join('')}</ul>`,
    altlik: '<button class="dg dg-ana" data-nd-gordum>Tamam</button>',
    onAc(p) { p.querySelector('[data-nd-gordum]').addEventListener('click', () => { l.forEach(n => { n.alarmGoruldu = simdi(); }); kaydet(); kapatPencere(); }); } });
}
