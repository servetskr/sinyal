// Denetim modu: habersiz denetimde (MTSK Yön. m.46/A) tek ekran: şu an hangi derste kim, hangi araçta, MEBBİS programına uygun mu;
// araçta bulunması gereken belgeler (m.17/3), öz kontrol listesi (EK-16/17 maddelerinden) ve tek tıkla çıktılar.
// Denetim kayıtları: bulgu, eksik giderme süresi (m.46: 20 gün) ve 5580 m.7/2 cezalarında tekerrür (7590 sayılı Kanun: tekrarda 5 kat, üçüncüde ruhsat iptali).
import { S, kaydet, gun, fark, tamAd, islem, kursiyer, egitmen, arac, oturum, sbDers, sb } from './veri.js?v=96';
import { e, ik, isaret, pencere, kapatPencere, bildir, tarih, rozet } from './ui.js?v=96';

const simdi = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const dk = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const ayEkle = (t, n) => { const d = new Date(t + 'T12:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
export const BENT = { a: ['a', 'Yerleşim planında izinsiz değişiklik', 5, 4], b: ['b', 'Yanıltıcı reklam ya da ilan', 5, 4], c: ['c', 'İzinsiz ders çizelgesi ya da program uygulama', 5, 4], d: ['d', 'Yönetmeliğe aykırı diğer fiiller', 5, 4], e: ['e', 'Eksik ya da mevzuata aykırı personel çalıştırma', 10, 5], f: ['f', 'Millî Eğitim Temel Kanunu’na aykırılık', 10, 5], g: ['g', 'Kurum açma şartını kaybetme', 20, 5] };

function anlik() {
  const bugun = gun(0), n = dk(simdi());
  const dersler = sbDers(S.dersler).filter(d => d.tarih === bugun && d.durum !== 'İptal');
  const suan = dersler.filter(d => dk(d.saat) <= n && n < dk(d.saat) + 50 + 10);
  const teorik = (S.teorik || []).filter(t => t.tarih === bugun && dk(t.saat) <= n && n < dk(t.saat) + (t.sure || 1) * 60);
  return { dersler, suan, teorik, kalan: dersler.filter(d => dk(d.saat) > n).length };
}
const kBelge = k => { const t = (k.kBelge || {}).tarih; return t ? (ayEkle(t, 6) >= gun(0) ? ['tamam', 'K belgesi geçerli (' + tarih(ayEkle(t, 6)) + '’e kadar)'] : ['dur', 'K belgesinin 6 ayı dolmuş']) : ['uyari', 'K belgesi (EK-5) yazdırılmamış']; };
function dersSatir(d) {
  const k = kursiyer(d.kursiyer) || {}, eg = egitmen(d.egitmen) || {}, ar = arac(d.arac) || {};
  const l = [
    d.meb ? ['tamam', 'MEBBİS programında'] : ['dur', 'MEBBİS programına girilmemiş'],
    eg.calismaIzinNo ? ['tamam', 'Öğretmenin çalışma izni: ' + eg.calismaIzinNo] : ['uyari', 'Çalışma izni numarası girilmemiş'],
    ar.mebIzinNo ? ['tamam', 'Araç izni (EK-8): ' + ar.mebIzinNo] : ['uyari', 'Araç izin no (EK-8) girilmemiş'],
    [ar.muayene, ar.sigorta].some(t => t && fark(t) < 0) ? ['dur', 'Araç muayene ya da sigortası dolmuş'] : ['tamam', 'Muayene ve sigorta geçerli'],
    kBelge(k),
    S.dersler.some(x => x.kursiyer === k.id && x.durum === 'Yapıldı' && !x.imza) ? ['uyari', 'Takip formunda imzasız ders var'] : ['tamam', 'Takip formu imzaları tam'],
  ];
  const kotu = l.some(x => x[0] === 'dur');
  return `<div class="kart" style="padding:12px 14px;margin-bottom:10px${kotu ? ';border-color:var(--kirmizi)' : ''}"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><b style="font-family:var(--baslik);font-size:18px;color:var(--murekkep)">${e(d.saat)} · ${e(ar.plaka || 'araç yok')}</b><span>${e(tamAd(k))} · ${e(eg.ad || '')}</span>${d.durum === 'Yapıldı' ? rozet('Yapıldı', 'yesil') : ''}</div>
    <ul class="dn-kontrol">${l.map(([t, m]) => `<li>${isaret(t, 18)}<span>${e(m)}</span></li>`).join('')}</ul>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${ar.id ? `<button class="dg dg-cizgi dg-kucuk" data-dn-yazdir="aracdosya|${ar.id}">${ik('belge')}Araç evrak dosyası</button>` : ''}<button class="dg dg-cizgi dg-kucuk" data-dn-yazdir="ek5|${k.id}">${ik('belge')}K belgesi (EK-5)</button><button class="dg dg-cizgi dg-kucuk" data-dn-yazdir="takip|${k.id}">${ik('belge')}Takip formu</button></div></div>`;
}
// öz kontrol: otomatik kontrol edilebilenler işaretli gelir; diğerlerini kullanıcı işaretler (gün içinde saklanır)
function kontroller(a) {
  const bugunDers = a.dersler, imzasiz = S.dersler.filter(d => d.durum === 'Yapıldı' && !d.imza).length;
  return [
    ['program', 'Bugünkü direksiyon dersleri MEBBİS’e girilen gün ve saatte', bugunDers.every(d => d.meb), bugunDers.filter(d => !d.meb).length + ' ders MEBBİS programında görünmüyor'],
    ['personel', 'Dersleri MEBBİS’te izni olan personel veriyor', bugunDers.every(d => (egitmen(d.egitmen) || {}).calismaIzinNo), 'Çalışma izni numarası girilmemiş öğretmen var'],
    ['yaka', 'Eğitim personeli fotoğraflı kurum kimlik kartını yakasında taşıyor (m.46/A/7)', null],
    ['ruhsat', 'Her eğitim aracında ruhsat aslı var (m.17/3-a)', null],
    ['izin', 'Araçlarda öğretmenin çalışma izni örneği ve EK-8 araç izin formu var (m.17/3-b, ç)', S.araclar.every(x => x.mebIzinNo) ? null : false, 'Bazı araçların EK-8 izin numarası girilmemiş'],
    ['liste', 'Araçlarda o araçla eğitim görecek kursiyerlerin isim ve saat listesi var (m.17/3-c)', null, '', 'aracdosya'],
    ['takip', 'Direksiyon eğitim takip formları imzalı (m.17/3-d)', imzasiz ? false : true, imzasiz + ' ders imzasız'],
    ['ek5', 'Akan trafikteki kursiyerlerin K sınıfı aday belgesi (EK-5) geçerli', sb(S.kursiyerler).filter(k => k.asama === 'Direksiyon').every(k => kBelge(k)[0] === 'tamam') ? true : false, 'Bazı kursiyerlerin K belgesi yok ya da süresi dolmuş', 'ek5'],
    ['yoklama', 'Teorik derste yoklama alındı; kursta olmayan kursiyer devamsız yazıldı (m.46/A/8)', null, '', 'dersdefteri'],
    ['ilan', 'Ücret ilanı kursta görünür yerde asılı', S.kurs.tarifeIlan === gun(0).slice(0, 4) ? null : false, 'Bu yılın ücret ilanı işaretlenmemiş'],
    ['defter', 'Gelen-giden evrak defteri, personel özlük dosyaları ve ücretsiz kursiyer dosyası güncel (m.42)', null],
  ];
}
export function denetimModuAc(yenile) {
  const bugun = gun(0); S.denetimKontrol = S.denetimKontrol && S.denetimKontrol.tarih === bugun ? S.denetimKontrol : { tarih: bugun, isaret: {} };
  const ciz = () => {
    const a = anlik(), kl = kontroller(a), ik2 = S.denetimKontrol.isaret;
    return `<p style="font-size:14px">${tarih(bugun)} · saat ${simdi()} · bugün ${a.dersler.length} direksiyon dersi, ${a.kalan} tanesi henüz başlamadı.</p>
      <h4 style="margin-top:12px">Şu an yapılan direksiyon dersleri</h4>${a.suan.length ? a.suan.map(dersSatir).join('') : `<p class="og-not">Şu an direksiyon dersi yok.${a.dersler.length ? ' Sıradaki: ' + e((a.dersler.find(d => dk(d.saat) > dk(simdi())) || {}).saat || '—') : ''}</p>`}
      <h4 style="margin-top:12px">Şu an yapılan teorik dersler</h4>${a.teorik.length ? a.teorik.map(t => `<div class="kart" style="padding:12px 14px;margin-bottom:10px"><b>${e(t.saat)} · ${e(t.salon || '')} · ${e(t.konu || '')}</b><div style="margin-top:6px"><button class="dg dg-cizgi dg-kucuk" data-dn-yazdir="dersdefteri|${e(t.grup || '')}">${ik('belge')}Ders defteri ve yoklama</button></div></div>`).join('') : '<p class="og-not">Şu an teorik ders yok.</p>'}
      <h4 style="margin-top:12px">Öz kontrol</h4><ul class="dn-oz">${kl.map(([id, metin, oto, not, belge]) => { const v = oto === true ? true : oto === false ? false : ik2[id]; return `<li class="${v === true ? 'ok' : v === false ? 'no' : ''}"><button type="button" data-dn-isaret="${id}" ${oto != null ? 'disabled' : ''} aria-label="${e(metin)}">${v === true ? '✓' : v === false ? '!' : ''}</button><span>${e(metin)}${v === false && not ? `<small>${e(not)}</small>` : ''}${oto != null ? '<small>Sinyal kayıtlarından kontrol edildi</small>' : ''}</span>${belge ? `<button class="dg dg-hafif dg-kucuk" data-dn-yazdir="${belge}|">${ik('belge')}Yazdır</button>` : ''}</li>`; }).join('')}</ul>
      <p class="og-not" style="margin-top:8px">Denetçi EK-16 (teorik) ve EK-17 (direksiyon) kontrol formlarını doldurur; bu liste o formlardaki ve m.17/3, m.42, m.46/A’daki maddelerden hazırlandı.</p>`;
  };
  pencere({
    baslik: 'Denetim modu', genis: true, icerik: `<div data-dn>${ciz()}</div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-dn-kayit>Denetimi kaydet</button>`,
    onAc(p) {
      const g = p.querySelector('[data-dn]');
      g.addEventListener('click', ev => {
        const i = ev.target.closest('[data-dn-isaret]'); if (i && !i.disabled) { const x = S.denetimKontrol.isaret; x[i.dataset.dnIsaret] = x[i.dataset.dnIsaret] === true ? false : x[i.dataset.dnIsaret] === false ? undefined : true; kaydet(); g.innerHTML = ciz(); return; }
        const y = ev.target.closest('[data-dn-yazdir]'); if (y) { const [tur, id] = y.dataset.dnYazdir.split('|'); return import('./sayfalar3.js?v=96').then(m => m.belgeAc(tur, id || undefined)); }
      });
      const zaman = setInterval(() => { if (!document.body.contains(p)) return clearInterval(zaman); if (!g.querySelector(':focus')) g.innerHTML = ciz(); }, 60000);
      p.querySelector('[data-dn-kayit]').addEventListener('click', () => { kapatPencere(); setTimeout(() => denetimKaydiAc(yenile), 200); });
    },
  });
}

// geçmiş denetimler, eksik giderme süresi, ceza ve tekerrür
export function tekerrur(bent, tarih0 = gun(0)) { const [, , , yil] = BENT[bent] || []; return (S.denetimler || []).filter(x => x.bent === bent && x.ceza && fark(x.tarih) > -365 * yil && x.tarih <= tarih0).length; }
export function denetimKaydiAc(yenile) {
  pencere({
    baslik: 'Denetim kaydı', genis: true,
    icerik: `<form id="f-denetim" class="form-izgara">
      <div class="alan"><label>Tarih</label><input name="tarih" type="date" value="${gun(0)}"></div>
      <div class="alan"><label>Tür</label><select name="tur"><option>Habersiz kontrol</option><option>Yıllık denetim</option><option>Şikâyet üzerine</option></select></div>
      <div class="alan tam"><label>Bulgular / eksikler</label><textarea name="bulgu" rows="3" placeholder="Örn. 34 ABC 12 aracında EK-8 izin formu yoktu"></textarea></div>
      <div class="alan"><label>Eksik giderme süresi</label><select name="sure"><option value="20">20 gün (m.46)</option><option value="90">3 ay (ceza sebebi giderme)</option><option value="0">Süre verilmedi</option></select></div>
      <div class="alan"><label>İdari para cezası</label><select name="bent"><option value="">Ceza yok</option>${Object.values(BENT).map(([b, ad, kat]) => `<option value="${b}">5580 m.7/2-${b} · ${e(ad)} (brüt asgari ücretin ${kat} katı)</option>`).join('')}</select></div>
      <div class="alan"><label>Ceza tutarı (₺)</label><input name="tutar" inputmode="numeric" placeholder="tebliğdeki tutar"></div>
      <p class="tam" data-tek style="font-size:13.5px"></p></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-denetim">Kaydet</button>`,
    onAc(d) {
      const f = d.querySelector('form'), tek = d.querySelector('[data-tek]');
      const goster = () => { const b = f.bent.value; if (!b) return (tek.innerHTML = ''); const n = tekerrur(b, f.tarih.value), [, , , yil] = BENT[b]; tek.innerHTML = n ? `<span class="ipucu uyari">${isaret('uyari', 18)}<span>Son ${yil} yılda bu bentten ${n} ceza var: bu ${n + 1}. ceza. 7590 sayılı Kanunla tekrarda ceza 5 katına çıkar${n + 1 >= 3 ? '; üçüncü kez işlenen fiilde kurum açma izni iptal edilir' : ''}.</span></span>` : `İlk ceza (tekerrür süresi ${yil} yıl).`; };
      f.addEventListener('change', goster);
      f.addEventListener('submit', ev => {
        ev.preventDefault(); if (!f.bulgu.value.trim() && !f.bent.value) return bildir('Bulgu yazın ya da ceza seçin', 'uyari');
        const sure = +f.sure.value, x = { id: 'dn' + Date.now(), tarih: f.tarih.value || gun(0), tur: f.tur.value, bulgu: f.bulgu.value.trim(), son: sure ? (() => { const t = new Date((f.tarih.value || gun(0)) + 'T12:00'); t.setDate(t.getDate() + sure); return t.toISOString().slice(0, 10); })() : null, bent: f.bent.value || null, ceza: !!f.bent.value, tutar: +String(f.tutar.value).replace(/\D/g, '') || null, kim: oturum.kullanici ? oturum.kullanici.ad : '', giderildi: null };
        x.sira = x.bent ? tekerrur(x.bent, x.tarih) + 1 : null;
        S.denetimler = [x, ...(S.denetimler || [])]; islem('Denetim kaydı ekledi', x.tur + (x.bent ? ' · ceza m.7/2-' + x.bent : '')); kaydet(); kapatPencere(); bildir('Denetim kaydedildi'); if (yenile) yenile();
      });
    },
  });
}
export function denetimKaydiKarti() {
  const l = S.denetimler || [];
  return `<div class="kart"><div class="kart-bas"><h3>Denetim kayıtları</h3><small>Eksik giderme süreleri ve ceza tekerrürü</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-denetim-kayit>${ik('arti')}Kayıt ekle</button></div></div>
    ${l.length ? `<ul class="liste" style="margin-top:8px">${l.slice(0, 8).map(x => `<li style="align-items:flex-start">${isaret(x.giderildi ? 'tamam' : x.son && fark(x.son) < 0 ? 'dur' : x.ceza ? 'yasak' : 'uyari', 24)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${tarih(x.tarih)} · ${e(x.tur)}${x.bent ? ` · ceza m.7/2-${x.bent}${x.sira > 1 ? ` (${x.sira}. kez)` : ''}` : ''}</b><small style="display:block;color:var(--metin)">${e(x.bulgu || '')}</small>${x.son && !x.giderildi ? `<small style="display:block;color:${fark(x.son) < 0 ? 'var(--kirmizi)' : 'var(--soluk)'}">Eksik giderme son günü ${tarih(x.son)}${fark(x.son) < 0 ? ' · geçti' : ' · ' + fark(x.son) + ' gün kaldı'}</small>` : ''}</div>${x.son && !x.giderildi ? `<button class="dg dg-hafif dg-kucuk" data-denetim-giderildi="${x.id}">Giderildi</button>` : ''}</li>`).join('')}</ul>` : '<p class="kart-govde" style="color:var(--soluk);font-size:14px">Henüz denetim kaydı yok. Denetim olunca bulguları ve verilen süreyi girin; Sinyal son günü hatırlatır, cezalarda tekerrürü sayar.</p>'}</div>`;
}
// MEB kuralları listesine: süresi yaklaşan eksik giderme ve tekerrür riski
export function denetimUyarilari() {
  const l = [];
  (S.denetimler || []).filter(x => x.son && !x.giderildi).forEach(x => { const k = fark(x.son); if (k <= 7) l.push([k < 0 ? 'dur' : 'yasak', `Denetim eksiği: giderme süresi ${k < 0 ? -k + ' gün önce doldu' : k + ' gün içinde doluyor'}`, (x.bulgu || x.tur).slice(0, 140) + ' (MTSK Yönetmeliği m.46: eksikler 20 gün içinde giderilir; giderilmezse 5580 m.7 uygulanır).', '#/meb/denetim']); });
  Object.keys(BENT).forEach(b => { const n = tekerrur(b); if (n >= 2) l.push(['dur', `5580 m.7/2-${b} bendinden ${n} ceza var`, `Aynı fiil bir kez daha tespit edilirse kurum açma izni iptal edilir (7590 sayılı Kanun). Tekerrür süresi ${BENT[b][3]} yıl.`, '#/meb/denetim']); });
  return l;
}
