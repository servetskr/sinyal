// Sınav güzergâhları ve püf noktaları.
// Müdür/ön büro güzergâhları (başlangıç yeri, harita, tarif) ekler. Öğretmen telefondan püf noktası ekler; ofis cihazı işler, hemen görünür.
// Aday sınavdan sonra deneyimini yazar; kurs müdürü onaylayınca diğer adaylar görür (adı "Elif Ö." gibi kısaltılır).
// Veri S.kurs.guzergahlar içinde durur; böylece öğrenci ve öğretmen ekranlarına kendiliğinden gider. Onay bekleyen deneyim yalnız adayın kendi kaydındadır.
import { S, kaydet, gun, islem, oturum, tamAd, kursiyer } from './veri.js?v=195';
import { e, ik, tarih, pencere, kapatPencere, bildir } from './ui.js?v=195';

const yenile = () => import('./app.js?v=195').then(m => m.yenile());
export const guzergahlar = () => S.kurs.guzergahlar || [];
const yeniId = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const kisaAd = k => [k.ad, k.soyad ? k.soyad.charAt(0) + '.' : ''].filter(Boolean).join(' ');
const haritaLink = g => g.harita ? g.harita : g.baslangic ? 'https://www.google.com/maps/search/' + encodeURIComponent(g.baslangic + ' ' + (S.kurs.sehir || '')) : '';
const yonetici = () => oturum.kullanici && ['mudur', 'sekreter'].includes(oturum.kullanici.rol);
const mudur = () => oturum.kullanici && oturum.kullanici.rol === 'mudur';

/* ---------- Ofis: Sınav güzergâhları sayfası ---------- */
export function sayfa() {
  const l = guzergahlar(), bekleyen = (S.kursiyerler || []).filter(k => k.sinavDeneyimi && k.sinavDeneyimi.onay == null);
  const gAd = id => (l.find(g => g.id === id) || {}).ad || '';
  return {
    baslik: 'Sınav güzergâhları', alt: l.length + ' güzergâh · ' + l.reduce((a, g) => a + (g.puflar || []).length, 0) + ' püf noktası',
    html: `<p class="ekran-notu">${ik('bilgi')}<span>Uygulama sınavının başladığı yerleri ve olası güzergâhları ekleyin. Öğretmenler telefondan püf noktası ekler; adayların sınav sonrası deneyimleri sizin onayınızla diğer adaylara görünür.</span></p>
      ${bekleyen.length ? `<div class="kart" style="margin-bottom:16px"><div class="kart-bas"><h3>Onay bekleyen deneyimler</h3><small>${bekleyen.length} aday</small></div><ul class="liste">${bekleyen.map(k => `<li style="align-items:flex-start"><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(tamAd(k))}</b><small style="display:block;color:var(--soluk)">${[gAd(k.sinavDeneyimi.guzergah), k.sinavDeneyimi.sonuc, tarih(k.sinavDeneyimi.tarih)].filter(Boolean).map(e).join(' · ')}</small><p style="margin-top:6px;font-size:14px;white-space:pre-wrap">${e(k.sinavDeneyimi.metin)}</p></div><span class="sag" style="gap:6px"><button class="dg dg-ana dg-kucuk" data-gz-onay="${e(k.id)}">Onayla</button><button class="dg dg-hafif dg-kucuk" data-gz-ret="${e(k.id)}">Yayınlama</button></span></li>`).join('')}</ul></div>` : ''}
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="dg dg-ana" data-gz-ekle>${ik('arti')}Güzergâh ekle</button></div>
      ${l.length ? l.map(g => `<div class="kart" style="margin-bottom:16px"><div class="kart-bas"><h3>${e(g.ad)}</h3><small>${e(g.baslangic || 'Başlangıç yeri girilmedi')}</small><div class="sag" style="gap:6px">${haritaLink(g) ? `<a class="dg dg-cizgi dg-kucuk" href="${e(haritaLink(g))}" target="_blank" rel="noopener">${ik('harita')}Harita</a>` : ''}<button class="dg dg-hafif dg-kucuk" data-gz-duzenle="${e(g.id)}">${ik('kalem')}Düzenle</button></div></div><div class="kart-govde" style="display:grid;gap:12px">
        ${g.tarif ? `<p style="font-size:14px;white-space:pre-wrap">${e(g.tarif)}</p>` : ''}
        <div><b style="color:var(--murekkep);font-size:14px">Püf noktaları</b>${(g.puflar || []).length ? `<ul class="liste" style="margin-top:6px">${g.puflar.map(p => `<li><div style="flex:1;min-width:0"><span style="font-size:14px">${e(p.metin)}</span><small style="display:block;color:var(--soluk)">${e(p.kim || '')} · ${tarih(p.tarih)}</small></div>${yonetici() ? `<button class="dg dg-hafif dg-kucuk" data-gz-puf-sil="${e(g.id)}|${e(p.id)}" aria-label="Püf noktasını sil">${ik('kapat')}</button>` : ''}</li>`).join('')}</ul>` : '<p style="color:var(--soluk);font-size:13.5px;margin-top:4px">Henüz yok. Öğretmenler telefondan ekleyebilir.</p>'}
          ${yonetici() ? `<div style="display:flex;gap:8px;margin-top:8px"><input class="girdi" style="flex:1" data-gz-puf-metin="${e(g.id)}" placeholder="Örn. Okul geçidinde mutlaka tam dur" maxlength="300"><button class="dg dg-cizgi dg-kucuk" data-gz-puf-ekle="${e(g.id)}">Ekle</button></div>` : ''}</div>
        ${(g.deneyimler || []).length ? `<div><b style="color:var(--murekkep);font-size:14px">Adayların deneyimleri</b><ul class="liste" style="margin-top:6px">${g.deneyimler.map(d => `<li style="align-items:flex-start"><div style="flex:1;min-width:0"><p style="font-size:14px;white-space:pre-wrap">${e(d.metin)}</p><small style="color:var(--soluk)">${e(d.ad)}${d.sonuc ? ' · ' + e(d.sonuc) : ''} · ${tarih(d.tarih)}</small></div>${yonetici() ? `<button class="dg dg-hafif dg-kucuk" data-gz-den-sil="${e(g.id)}|${e(d.id)}" aria-label="Deneyimi kaldır">${ik('kapat')}</button>` : ''}</li>`).join('')}</ul></div>` : ''}
      </div></div>`).join('') : `<div class="kart"><div class="bos">${ik('harita')}<b>Henüz güzergâh yok</b><p>Sınavın başladığı yeri ve bilinen güzergâhları ekleyin; adaylar telefondan görür.</p></div></div>`}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        if (t.closest('[data-gz-ekle]')) return duzenlePenceresi(null);
        const dz = t.closest('[data-gz-duzenle]'); if (dz) return duzenlePenceresi(guzergahlar().find(g => g.id === dz.dataset.gzDuzenle));
        const pe = t.closest('[data-gz-puf-ekle]'); if (pe) {
          const i = k.querySelector(`[data-gz-puf-metin="${pe.dataset.gzPufEkle}"]`), m = i.value.trim(); if (!m) return i.focus();
          const g = guzergahlar().find(x => x.id === pe.dataset.gzPufEkle); if (!g) return;
          g.puflar = [...(g.puflar || []), { id: yeniId(), metin: m.slice(0, 300), kim: (oturum.kullanici && oturum.kullanici.ad) || 'Kurs', rol: 'ofis', tarih: gun(0) }];
          islem('Püf noktası ekledi', g.ad); kaydet(); bildir('Eklendi'); return yenile();
        }
        const ps = t.closest('[data-gz-puf-sil]'); if (ps) { const [gid, pid] = ps.dataset.gzPufSil.split('|'), g = guzergahlar().find(x => x.id === gid); if (!g) return; g.puflar = (g.puflar || []).filter(p => p.id !== pid); islem('Püf noktasını sildi', g.ad); kaydet(); return yenile(); }
        const ds = t.closest('[data-gz-den-sil]'); if (ds) { const [gid, did] = ds.dataset.gzDenSil.split('|'), g = guzergahlar().find(x => x.id === gid); if (!g) return; g.deneyimler = (g.deneyimler || []).filter(p => p.id !== did); islem('Aday deneyimini kaldırdı', g.ad); kaydet(); return yenile(); }
        const on = t.closest('[data-gz-onay]'); if (on) {
          if (!mudur()) return bildir('Deneyimleri kurs müdürü onaylar', 'uyari');
          const kk = kursiyer(on.dataset.gzOnay); if (!kk || !kk.sinavDeneyimi) return;
          const sd = kk.sinavDeneyimi, g = guzergahlar().find(x => x.id === sd.guzergah) || guzergahlar()[0];
          if (!g) return bildir('Önce bir güzergâh ekleyin', 'uyari');
          g.deneyimler = [{ id: yeniId(), metin: sd.metin, ad: kisaAd(kk), sonuc: sd.sonuc || '', tarih: sd.tarih || gun(0) }, ...(g.deneyimler || [])].slice(0, 60);
          sd.onay = gun(0); islem('Aday deneyimini yayınladı', tamAd(kk)); kaydet(); bildir('Deneyim adaylara açıldı'); return yenile();
        }
        const rt = t.closest('[data-gz-ret]'); if (rt) { const kk = kursiyer(rt.dataset.gzRet); if (!kk || !kk.sinavDeneyimi) return; kk.sinavDeneyimi.onay = false; islem('Aday deneyimini yayınlamadı', tamAd(kk)); kaydet(); return yenile(); }
      });
    },
  };
}
function duzenlePenceresi(g) {
  const yeni = !g; g = g || { id: yeniId(), ad: '', baslangic: '', harita: '', tarif: '', puflar: [], deneyimler: [] };
  pencere({
    baslik: yeni ? 'Güzergâh ekle' : 'Güzergâhı düzenle',
    icerik: `<form class="form-izgara" id="f-gz" novalidate>
      <div class="alan tam"><label>Güzergâh adı</label><input name="ad" required maxlength="60" placeholder="Örn. Sınav alanı · 1. güzergâh" value="${e(g.ad)}"></div>
      <div class="alan tam"><label>Sınavın başladığı yer</label><input name="baslangic" maxlength="120" placeholder="Örn. Eskişehir Sürücü Sınav Alanı" value="${e(g.baslangic)}"></div>
      <div class="alan tam"><label>Harita linki (isteğe bağlı)</label><input name="harita" type="url" data-kucuk maxlength="500" placeholder="Google Haritalar paylaş linki" value="${e(g.harita)}"></div>
      <div class="alan tam"><label>Güzergâh tarifi</label><textarea name="tarif" rows="4" maxlength="1500" placeholder="Sokak sokak tarif, dönüşler, dikkat edilecek kavşaklar">${e(g.tarif)}</textarea></div></form>`,
    altlik: `${yeni ? '' : '<button class="dg dg-cizgi" data-gz-sil style="margin-right:auto">Sil</button>'}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-gz-kaydet>Kaydet</button>`,
    onAc(d) {
      const f = d.querySelector('#f-gz');
      d.querySelector('[data-gz-kaydet]').addEventListener('click', () => {
        if (!f.ad.value.trim()) { bildir('Güzergâh adını yazın', 'uyari'); return f.ad.focus(); }
        const h = f.harita.value.trim(); if (h && !/^https:\/\//.test(h)) { bildir('Harita linki https:// ile başlamalı', 'uyari'); return f.harita.focus(); }
        const x = { ...g, ad: f.ad.value.trim(), baslangic: f.baslangic.value.trim(), harita: h, tarif: f.tarif.value.trim() };
        const l = guzergahlar().slice(), i = l.findIndex(y => y.id === x.id); if (i >= 0) l[i] = x; else l.push(x);
        S.kurs.guzergahlar = l; islem(yeni ? 'Güzergâh ekledi' : 'Güzergâhı güncelledi', x.ad); kaydet(); kapatPencere(); bildir('Kaydedildi'); yenile();
      });
      const s = d.querySelector('[data-gz-sil]');
      if (s) s.addEventListener('click', () => { if (!confirm('“' + g.ad + '” ve püf noktaları silinsin mi?')) return; S.kurs.guzergahlar = guzergahlar().filter(y => y.id !== g.id); islem('Güzergâhı sildi', g.ad); kaydet(); kapatPencere(); yenile(); });
    },
  });
}

/* ---------- Öğrenci: güzergâhlar ve deneyim paylaşma ---------- */
export function ogrenciHtml(k) {
  const l = guzergahlar(); if (!l.length) return '';
  const sd = k.sinavDeneyimi, sinavaGirdi = !!(k.dsinav && k.dsinav.sonuc);
  return `<section class="kart og-kart og-guzergah"><div class="og-bas"><div><small>Uygulama sınavı</small><b>Sınav güzergâhları</b></div></div>
    ${l.map(g => `<details class="og-gz"><summary><b>${e(g.ad)}</b><small>${e(g.baslangic || '')}</small></summary>
      ${haritaLink(g) ? `<a class="dg dg-cizgi dg-kucuk" href="${e(haritaLink(g))}" target="_blank" rel="noopener" style="margin:8px 0">${ik('harita')}Haritada aç</a>` : ''}
      ${g.tarif ? `<p class="og-not" style="white-space:pre-wrap">${e(g.tarif)}</p>` : ''}
      ${(g.puflar || []).length ? `<p class="et" style="margin-top:10px">Püf noktaları</p><ul class="og-getir">${g.puflar.map(p => `<li>${ik('tik')}<span>${e(p.metin)}<small style="display:block;opacity:.7">${e(p.kim || '')}</small></span></li>`).join('')}</ul>` : ''}
      ${(g.deneyimler || []).length ? `<p class="et" style="margin-top:10px">Sınava girenler anlatıyor</p>${g.deneyimler.slice(0, 10).map(d => `<blockquote class="og-deneyim">${e(d.metin)}<small>${e(d.ad)}${d.sonuc ? ' · ' + e(d.sonuc) : ''} · ${tarih(d.tarih)}</small></blockquote>`).join('')}` : ''}
    </details>`).join('')}
    ${sd && sd.onay == null ? `<p class="og-not" style="margin-top:10px">${ik('saat')} Deneyimin kursa iletildi; onaylanınca diğer adaylar görecek.</p>`
      : sd && sd.onay ? `<p class="og-not" style="margin-top:10px">${ik('tik')} Deneyimin yayında. Teşekkürler!</p>`
      : sinavaGirdi ? `<form class="og-gz-form" data-gz-deneyim style="margin-top:12px;display:grid;gap:8px"><p class="et">Sınav deneyimini paylaş</p>
        <select name="g">${l.map(g => `<option value="${e(g.id)}">${e(g.ad)}</option>`).join('')}</select>
        <textarea name="m" rows="4" maxlength="1000" placeholder="Nerede zorlandın, neye dikkat etmeli? Sonraki adaylara yardımcı olur." required></textarea>
        <button class="dg dg-ana" type="submit">Gönder</button><small style="opacity:.75">Kurs müdürü onaylayınca adın kısaltılarak (ör. ${e(kisaAd(k))}) görünür.</small></form>` : ''}
  </section>`;
}

/* ---------- Öğretmen: güzergâhlar ve püf noktası ekleme ---------- */
export function ustaHtml(eg) {
  const l = guzergahlar(); if (!l.length) return '';
  const bekleyen = (S.pufGelen || []).filter(p => !l.some(g => (g.puflar || []).some(x => x.id === p.id)));
  return `<section class="u-grup"><h2 class="u-grup-bas">Sınav güzergâhları</h2><div class="u-liste">${l.map(g => {
    const pl = [...(g.puflar || []), ...bekleyen.filter(p => p.guzergah === g.id).map(p => ({ ...p, bekliyor: true }))];
    return `<details class="u-satir u-gz" style="display:block"><summary style="cursor:pointer"><b>${e(g.ad)}</b><small style="display:block;opacity:.75">${e(g.baslangic || '')} · ${pl.length} püf noktası</small></summary>
      ${pl.length ? `<ul style="margin:8px 0 0 18px;display:grid;gap:4px;font-size:14px">${pl.map(p => `<li>${e(p.metin)} <small style="opacity:.7">${p.bekliyor ? '· iletiliyor' : '· ' + e(p.kim || '')}</small></li>`).join('')}</ul>` : ''}
      <form data-gz-usta="${e(g.id)}" style="display:flex;gap:8px;margin-top:10px"><input class="girdi" name="m" maxlength="300" placeholder="Püf noktası ekle" style="flex:1"><button class="dg dg-ana dg-kucuk" type="submit">Ekle</button></form></details>`;
  }).join('')}</div></section>`;
}

// Öğrenci ve öğretmen formları (portal ekranları kendi olaylarını tutar; bu formlar tek yerden dinlenir)
document.addEventListener('submit', ev => {
  const dn = ev.target.closest('[data-gz-deneyim]');
  if (dn) {
    ev.preventDefault(); const k = S.kursiyerler && S.kursiyerler[0], m = dn.m.value.trim();
    if (!k || !oturum.kullanici || oturum.kullanici.rol !== 'ogrenci') return;
    if (m.length < 10) return bildir('Biraz daha ayrıntı yaz (en az 10 karakter)', 'uyari');
    k.sinavDeneyimi = { metin: m.slice(0, 1000), guzergah: dn.g.value, sonuc: (k.dsinav && k.dsinav.sonuc) || '', tarih: gun(0), onay: null };
    kaydet(); bildir('Teşekkürler! Kurs onaylayınca diğer adaylar görecek'); yenile(); return;
  }
  const us = ev.target.closest('[data-gz-usta]');
  if (us) {
    ev.preventDefault(); const m = us.m.value.trim(); if (!m) return us.m.focus();
    if (!oturum.kullanici || oturum.kullanici.rol !== 'usta') return;
    (S.pufGelen = S.pufGelen || []).push({ id: yeniId(), guzergah: us.dataset.gzUsta, metin: m.slice(0, 300), tarih: gun(0) });
    kaydet(); bildir('Püf noktası kursa iletildi'); yenile();
  }
});
