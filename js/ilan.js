// Kurslar arası ilan panosu (DIG-037, karar SOR-052): satılık araç, ekipman, iş birliği… Kurs müdürü ilan verir, mdSinyal onaylayınca bütün kurslar görür.
// Veri sunucuda (worker KV); kursun kimliği başka kurslara gösterilmez, iletişim bilgisi ilanda yazandır. Demo hesapta çalışmaz (örnek ilanlarla anlatılır).
import { S, oturum, islem, kaydet } from './veri.js?v=234';
import { e, ik, rozet, bos, pencere, kapatPencere, bildir, tarih, fotoKucult, ekranNotu, onaySor } from './ui.js?v=234';
import * as BL from './bulut.js?v=234';
import { yenile } from './app.js?v=234';

const KAT = ['Genel', 'Araç', 'Ekipman', 'İş Birliği'];
const st = { liste: null, hata: '', kat: '', yukleniyor: false };
const bulutta = () => !!(oturum.kullanici && oturum.kullanici.bulut);
const mudur = () => oturum.kullanici && oturum.kullanici.rol === 'mudur';
async function yukle() { if (st.yukleniyor) return; st.yukleniyor = true; try { st.liste = (await BL.ilanIstek('ilan')).liste || []; st.hata = ''; } catch (x) { st.hata = x.message; } st.yukleniyor = false; if (location.hash.startsWith('#/ilanlar')) yenile(); }
const ORNEK = [{ id: 'o1', kategori: 'Araç', baslik: 'Satılık çift pedallı eğitim aracı', aciklama: '2021 model, 84.000 km, muayenesi yeni. Kurs kapanışı nedeniyle.', iletisim: 'Örnek MTSK · 0532 000 00 00', bas: '', durum: 'yayinda', resimler: [] }, { id: 'o2', kategori: 'İş Birliği', baslik: 'Ortak simülatör kullanımı', aciklama: 'Simülatörümüzü hafta içi öğleden sonra paylaşabiliriz.', iletisim: 'Deneme Sürücü Kursu', durum: 'yayinda', resimler: [] }];
const DURUM = { bekliyor: ['Onay bekliyor', 'sari'], yayinda: ['Yayında', 'yesil'], reddedildi: ['Reddedildi', 'kirmizi'], kaldirildi: ['Kaldırıldı', 'notr'] };
const kart = x => `<article class="kart il-kart">${(x.resimler || []).length ? `<div class="il-resim">${x.resimler.slice(0, 3).map(r => `<img src="${r}" alt="" loading="lazy">`).join('')}</div>` : ''}
  <div class="kart-govde"><small class="il-kat">${e(x.kategori)}${x.benim ? ' · ' + rozet(DURUM[x.durum] ? DURUM[x.durum][0] : x.durum, DURUM[x.durum] ? DURUM[x.durum][1] : 'notr') : ''}</small><h3>${e(x.baslik)}</h3><p>${e(x.aciklama)}</p>
  <p class="il-iletisim">${ik('tel')}${e(x.iletisim)}</p><small style="color:var(--soluk)">${x.bas ? tarih(x.bas) : ''}${x.bit ? ' – ' + tarih(x.bit) : ''}</small>
  ${x.benim && mudur() && ['bekliyor', 'yayinda'].includes(x.durum) ? `<div style="margin-top:8px"><button class="dg dg-cizgi dg-kucuk" data-il-kaldir="${e(x.id)}">Kaldır</button></div>` : ''}</div></article>`;
export function ilanlar() {
  const ornek = !bulutta(); if (!ornek && st.liste === null && !st.hata) yukle();
  const l = (ornek ? ORNEK : st.liste || []).filter(x => !st.kat || x.kategori === st.kat), benim = l.filter(x => x.benim), diger = l.filter(x => !x.benim);
  return { baslik: 'İlan panosu', alt: 'Kurslar arası: araç, ekipman, iş birliği',
    html: `${ekranNotu(ornek ? 'Kurs hesabıyla açılır; aşağıdakiler örnek ilandır. Kurs müdürü ilan verir, mdSinyal onaylayınca bütün kurslar görür. İlanda yazdığınız iletişim bilgisi görünür, kursunuzun hesabı görünmez.' : 'Kurs müdürü ilan verir; mdSinyal onaylayınca bütün mdSinyal kursları görür. İlanda yalnız yazdığınız iletişim bilgisi görünür.')}
    <div class="bolum-bas" style="align-items:center"><div class="sh-suz" role="tablist">${['', ...KAT].map(k => `<button class="dg dg-kucuk ${st.kat === k ? 'dg-koyu' : 'dg-cizgi'}" data-il-kat="${e(k)}">${k || 'Hepsi'}</button>`).join(' ')}</div>${mudur() && !ornek ? `<div class="sag"><button class="dg dg-ana" data-il-ver>${ik('arti')}İlan ver</button></div>` : ''}</div>
    ${st.hata ? `<p class="ipucu uyari">${e(st.hata)}</p>` : ''}${!ornek && st.liste === null ? `<div class="kart"><div class="kart-govde">${bos('İlanlar yükleniyor…', '')}</div></div>` : ''}
    ${benim.length ? `<h3 class="il-bas">İlanlarınız</h3><div class="izgara iz-3">${benim.map(kart).join('')}</div>` : ''}
    ${diger.length ? `<h3 class="il-bas">${ornek ? 'Örnek ilanlar' : 'Yayındaki ilanlar'}</h3><div class="izgara iz-3">${diger.map(kart).join('')}</div>` : !benim.length && st.liste ? `<div class="kart"><div class="kart-govde">${bos('Bu kategoride ilan yok', 'İlk ilanı siz verin.')}</div></div>` : ''}`,
    baglan(k) {
      k.addEventListener('click', async ev => {
        const c = ev.target.closest('[data-il-kat]'); if (c) { st.kat = c.dataset.ilKat; return yenile(); }
        if (ev.target.closest('[data-il-ver]')) return ilanVer();
        const kd = ev.target.closest('[data-il-kaldir]'); if (kd && await onaySor('İlan sitede ve ilan listesinde görünmez olur.', { baslik: 'İlan yayından kaldırılsın mı?', evet: 'Kaldır', tehlike: true })) BL.ilanIstek('ilan/kaldir', { id: kd.dataset.ilKaldir }).then(() => { islem('İlanı kaldırdı', ''); kaydet(); bildir('İlan kaldırıldı'); st.liste = null; yukle(); }).catch(x => bildir(x.message, 'uyari'));
      });
    } };
}
function ilanVer() {
  const resim = [];
  pencere({ baslik: 'İlan ver', icerik: `<form id="f-ilan" class="form-izgara" novalidate>
      <div class="alan"><label for="il-k">Kategori</label><select id="il-k" name="kategori">${KAT.map(k => `<option>${k}</option>`).join('')}</select></div>
      <div class="alan"><label for="il-i">İletişim (görünür)</label><input id="il-i" name="iletisim" maxlength="120" value="${e([S.kurs.ad, S.kurs.tel].filter(Boolean).join(' · '))}"></div>
      <div class="alan tam"><label for="il-b">Başlık</label><input id="il-b" name="baslik" maxlength="90" placeholder="Ör. Satılık çift pedallı eğitim aracı"></div>
      <div class="alan tam"><label for="il-a">Açıklama</label><textarea id="il-a" name="aciklama" rows="4" maxlength="2000"></textarea></div>
      <div class="alan"><label for="il-bs">Yayın başlangıcı</label><input id="il-bs" name="bas" type="date"></div>
      <div class="alan"><label for="il-bt">Yayın bitişi</label><input id="il-bt" name="bit" type="date"></div>
      <div class="alan tam"><label>Resimler <small style="font-weight:400">en çok 10</small></label><input type="file" accept="image/*" multiple data-il-resim><div class="il-onizle" data-il-onizle></div></div>
      <p class="tam" style="font-size:13px;color:var(--soluk)">İlan mdSinyal onaylayınca yayına girer. Kişisel veri (öğrenci adı, T.C.) yazmayın.</p></form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-ilan">Onaya gönder</button>',
    onAc(p) { const f = p.querySelector('form'), on = p.querySelector('[data-il-onizle]');
      p.querySelector('[data-il-resim]').addEventListener('change', async ev => { for (const d of [...ev.target.files].slice(0, 10 - resim.length)) { try { resim.push(await fotoKucult(d, 900)); } catch (x) { } } on.innerHTML = resim.map(r => `<img src="${r}" alt="">`).join(''); ev.target.value = ''; });
      f.addEventListener('submit', ev => { ev.preventDefault(); const b = f.baslik.value.trim(), a = f.aciklama.value.trim(), i = f.iletisim.value.trim();
        if (b.length < 5 || a.length < 10 || i.length < 5) return bildir('Başlık, açıklama ve iletişim yazın', 'uyari');
        const dg = p.querySelector('[form=f-ilan]'); dg.disabled = true;
        BL.ilanIstek('ilan', { kategori: f.kategori.value, baslik: b, aciklama: a, iletisim: i, bas: f.bas.value, bit: f.bit.value, kursAd: S.kurs.ad, resimler: resim.filter(r => r.length < 220e3) })
          .then(() => { islem('İlan verdi', b); kaydet(); kapatPencere(); bildir('İlan onaya gönderildi'); st.liste = null; yukle(); }).catch(x => { dg.disabled = false; bildir(x.message, 'uyari'); }); }); } });
}
