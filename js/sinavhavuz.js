// SNV-031..036, SNV-051, SNV-061: Sınavlar › "Sınava girecekler" havuzu. Yeni veri alanı yok: hepsi hakDurumu, dersBitisi, sinavaUygunluk,
// telafiDurumu ve k.meb.dosyaOkuma'dan. Seçim kaydedilmez; seçilenler "Sınava yaz" alt sayfasında oturum seçilip uygunluk denetimiyle yazılır.
import { S, kaydet, gun, fark, tamAd, kursiyer, egitmen, arac, SINIFLAR, sb, hakDurumu, dersBitisi, islem, oturum, kuralAyar } from './veri.js?v=234';
import { e, ik, rozet, avatar, tarih, tarihUzun, pencere, kapatPencere, bildir, bos, isaret } from './ui.js?v=234';
import * as KR from './kurallar.js?v=234';

const D = { suz: 'hepsi', usta: '', yazili: false, sira: 'bitis', secim: new Set() };
const MOTO = /^(M|A1|A2|A)$/;
const BOLUM = [['ilk', 'İlk sınavına girecek'], ['tekrar', 'Tekrar sınavına girecek'], ['ikinci', 'İkinci dört hak'], ['plansiz', 'Dersleri planlanmamış'], ['dolan', 'Hakkı dolanlar · ikinci dört hak']];
const yaziliOturum = k => (S.sinavlar || []).filter(x => x.tur === 'Direksiyon' && x.tarih >= gun(0) && (x.kursiyerler || []).includes(k.id) && !(x.sonuc || {})[k.id]).sort((a, b) => a.tarih.localeCompare(b.tarih))[0] || null;
const sinavAraci = k => { const d = (S.dersler || []).filter(x => x.kursiyer === k.id && x.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return arac(d && d.arac) || null; };
// aday satırının verisi ve bölümü
export function havuzSatiri(k) {
  const h = hakDurumu(k, 'Direksiyon'); if (h.gecti) return null;
  const db = dersBitisi(k), y = yaziliOturum(k), t = KR.telafiDurumu(k, y ? y.tarih : null);
  let bolum = !h.kalan ? (k.ikinciHak ? null : 'dolan') : !db.tarih && !db.yok && /^Program/.test(db.gerekce || '') ? 'plansiz' : h.dilim === 2 ? 'ikinci' : h.kullanilan ? 'tekrar' : 'ilk';
  if (!bolum) return null;
  const ilk = bolum === 'plansiz' || bolum === 'dolan' ? null : KR.ilkUygunSinav(k);
  return { k, h, db, y, t, ilk, bolum, ar: sinavAraci(k), eg: egitmen(k.egitmen) };
}
export function havuz() {
  return sb(S.kursiyerler).filter(k => !k.kapali && ['Direksiyon', 'Sınav'].includes(k.asama) && (SINIFLAR[k.sinif] || {}).direksiyon).map(havuzSatiri).filter(Boolean);
}
const filtrele = l => l.filter(x => (D.suz === 'hepsi' || (D.suz === 'moto' ? MOTO.test(x.k.sinif) : !MOTO.test(x.k.sinif))) && (!D.usta || x.k.egitmen === D.usta) && (D.yazili || !x.y || x.bolum === 'dolan'))
  .sort((a, b) => D.sira === 'ad' ? tamAd(a.k).localeCompare(tamAd(b.k), 'tr') : D.sira === 'hak' ? b.h.kullanilan - a.h.kullanilan : String(a.db.tarih || '9').localeCompare(String(b.db.tarih || '9')));
// SNV-007: Genel bakış göstergeleri bu sayılardan
export const havuzSayilari = () => { const l = havuz().filter(x => !x.y); return { ilk: l.filter(x => x.bolum === 'ilk' && x.db.tarih).length, tekrar: l.filter(x => x.bolum === 'tekrar' || x.bolum === 'ikinci').length, dolan: havuz().filter(x => x.bolum === 'dolan').length }; };

function satir(x) {
  const { k, h, db, y, t, ilk } = x, tn = kuralAyar('telafiSaat'), M = k.meb || {};
  const r = [];
  if (y) r.push(rozet('Yazılı: ' + tarih(y.tarih), 'mavi'));
  if (y && ((k.odeme || {}).ekler || []).some(z => z.sinav === y.id && !z.odendi)) r.push(rozet('Ücret ödenmedi', 'kirmizi'));
  if (t.gerekli && x.bolum !== 'dolan') r.push(rozet(`Telafi ${t.yapildi}/${tn}${t.yapildi >= tn ? ' ✓' : t.planli ? ` (${t.planli} planlı)` : ''}`, t.yapildi >= tn ? 'yesil' : 'uyari'));
  r.push(!M.dosyaOkuma ? rozet('MEBBİS okunmadı', 'notr') : fark(M.dosyaOkuma) < -30 ? rozet(`MEBBİS ${-fark(M.dosyaOkuma)} günlük`, 'uyari') : '');
  if (x.bolum === 'dolan') {   // SNV-051: 60 günlük yasal süre sayacı ve arama notu
    const son = KR.ikinciHakSonGun(k), kalan = son ? fark(son) : null, gecen = son ? 60 - kalan : null, ar = ((k.hakBitti || {}).aramalar || []).slice(-1)[0];
    const cip = kalan == null ? rozet('Son sınav tarihi yok', 'notr') : kalan < 0 ? rozet('Süre doldu', 'kirmizi') : gecen >= 30 && !(ar && fark(ar.tarih) > -7) ? rozet(`${gecen} gün geçti · arayın`, 'uyari') : rozet(`${kalan} gün kaldı`, 'notr');
    return `<li class="hv-satir"><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1;min-width:0">${avatar(k.ad, k.soyad, k.foto)}<div><b>${e(tamAd(k))}</b><small>${e((SINIFLAR[k.sinif] || {}).ad || k.sinif)} · son sınav ${k.hakBitti && k.hakBitti.tarih ? tarih(k.hakBitti.tarih) : '—'}${ar ? ` · ${tarih(ar.tarih)}: ${e(ar.sonuc)}${ar.not ? ' (' + e(ar.not) + ')' : ''}` : ''}</small></div></a>
      <span class="sag hv-rozet">${cip}${M.ikinciDireksiyon ? rozet('MEBBİS: 2. direksiyonda', 'mavi') : ''}<button class="dg dg-ana dg-kucuk" data-hv-karar="ikinci:${k.id}">Kayıt oldu — 4 hak daha</button><button class="dg dg-cizgi dg-kucuk" data-hv-aradi="${k.id}">Arandı</button><button class="dg dg-hafif dg-kucuk" data-hv-karar="${kalan != null && kalan < 0 ? 'istemiyor' : 'istemiyor'}:${k.id}">${kalan != null && kalan < 0 ? 'Süresi doldu' : 'İstemiyor'}</button></span></li>`;
  }
  const ikinci = `${h.dilim === 2 ? 'İkinci dört hak · ' : ''}Sıradaki ${h.siradaki}. hak${db.tarih ? ` · Ders bitişi ${tarih(db.tarih)}${db.tarih <= gun(0) ? ' (bitti)' : ''}` : db.gerekce ? ' · ' + e(db.gerekce) : ''}`;
  const ucuncu = x.bolum === 'plansiz' ? '' : ilk ? (ilk.s ? `İlk uygun: ${tarih(ilk.tarih)}` : ilk.metin || '') : '';
  const ayr = [x.eg ? e(x.eg.ad) : '', x.ar ? e(x.ar.plaka) : ''].filter(Boolean).join(' · ');
  return `<li class="hv-satir"><label class="hv-sec" aria-label="${e(tamAd(k))} seç"><input type="checkbox" data-hv-sec="${k.id}" ${D.secim.has(k.id) ? 'checked' : ''}></label><a class="kisi" href="#/kursiyer/${k.id}" style="flex:1;min-width:0">${avatar(k.ad, k.soyad, k.foto)}<div><b>${e(tamAd(k))}</b> ${rozet(((SINIFLAR[k.sinif] || {}).ad || k.sinif).split(' ·')[0])}<small>${ikinci}</small>${ucuncu || ayr ? `<small>${[ucuncu, ayr].filter(Boolean).join(' · ')}</small>` : ''}</div></a>
    <span class="sag hv-rozet">${r.join('')}${x.bolum === 'plansiz' ? '<a class="dg dg-cizgi dg-kucuk" href="#/plan">Ders planla</a>' : ''}</span></li>`;
}
export function havuzHtml() {
  const tum = havuz(), l = filtrele(tum), ustalar = [...new Set(tum.map(x => x.k.egitmen).filter(Boolean))].map(egitmen).filter(Boolean);
  const cip = (k, a) => `<button class="cip ${D.suz === k ? 'secili' : ''}" data-hv-suz="${k}">${a}</button>`;
  return `<div class="hv-suzgec">${cip('hepsi', 'Tümü')}${cip('oto', 'Otomobil')}${cip('moto', 'Motosiklet')}
      <select class="girdi" data-hv-usta aria-label="Usta"><option value="">Bütün ustalar</option>${ustalar.map(x => `<option value="${e(x.id)}" ${D.usta === x.id ? 'selected' : ''}>${e(x.ad)}</option>`).join('')}</select>
      <button class="cip ${D.yazili ? 'secili' : ''}" data-hv-yazili>Yazılanları göster</button>
      <select class="girdi" data-hv-sira aria-label="Sıralama"><option value="bitis" ${D.sira === 'bitis' ? 'selected' : ''}>Ders bitişine göre</option><option value="hak" ${D.sira === 'hak' ? 'selected' : ''}>Hakka göre</option><option value="ad" ${D.sira === 'ad' ? 'selected' : ''}>Ada göre</option></select></div>
    ${BOLUM.map(([b, ad]) => { const x = l.filter(y => y.bolum === b); if (!x.length) return ''; return `<div class="kart hv-bolum" id="hv-${b}"><div class="kart-bas"><h3>${ad}</h3><small>${x.length} aday</small>${b === 'plansiz' ? '<div class="sag"><a class="dg dg-cizgi dg-kucuk" href="#/plan">Hepsine plan öner</a></div>' : ''}</div><ul class="liste">${x.map(satir).join('')}</ul></div>`; }).join('') || `<div class="kart">${bos('Sınava girecek aday yok', D.yazili ? 'Direksiyon ya da sınav aşamasında, hakkı olan aday bulunmuyor.' : 'Yazılı adayları görmek için “Yazılanları göster”.')}</div>`}
    <div class="hv-cubuk" data-hv-cubuk ${D.secim.size ? '' : 'hidden'}><b data-hv-say>${D.secim.size} aday</b><button class="dg dg-ana" data-hv-yaz>Sınava yaz ▸</button><button class="dg dg-hafif dg-kucuk" data-hv-temizle>Seçimi bırak</button></div>`;
}
export function havuzBaglan(kap, yenile) {
  const cubuk = () => { const c = kap.querySelector('[data-hv-cubuk]'); if (!c) return; c.hidden = !D.secim.size; c.querySelector('[data-hv-say]').textContent = D.secim.size + ' aday'; };
  kap.addEventListener('change', ev => { const t = ev.target;
    if (t.matches('[data-hv-sec]')) { if (t.checked) D.secim.add(t.dataset.hvSec); else D.secim.delete(t.dataset.hvSec); return cubuk(); }
    if (t.matches('[data-hv-usta]')) { D.usta = t.value; return yenile(); }
    if (t.matches('[data-hv-sira]')) { D.sira = t.value; return yenile(); } });
  kap.addEventListener('click', ev => { const t = ev.target;
    const s = t.closest('[data-hv-suz]'); if (s) { D.suz = s.dataset.hvSuz; return yenile(); }
    if (t.closest('[data-hv-yazili]')) { D.yazili = !D.yazili; return yenile(); }
    if (t.closest('[data-hv-temizle]')) { D.secim.clear(); return yenile(); }
    if (t.closest('[data-hv-yaz]')) return sinavaYazSayfasi([...D.secim].map(kursiyer).filter(Boolean), yenile);
    const kr = t.closest('[data-hv-karar]'); if (kr) { const [karar, id] = kr.dataset.hvKarar.split(':'); return import('./sayfalar1.js?v=234').then(m => m.hakKarar(kursiyer(id), karar)); }
    const ar = t.closest('[data-hv-aradi]'); if (ar) return aramaSayfasi(kursiyer(ar.dataset.hvAradi), yenile); });
}
// SNV-036: "Sınava yaz" alt sayfası — gelecekteki Direksiyon oturumları, her birinde "N adaydan M'si uygun"; oturum seçilince aday aday uygunluk
export function sinavaYazSayfasi(ks, yenile, onSecili) {
  const ot = (S.sinavlar || []).filter(s => s.tur === 'Direksiyon' && s.tarih >= gun(0)).sort((a, b) => a.tarih.localeCompare(b.tarih));
  if (!ot.length) return bildir('Gelecekte Direksiyon sınav oturumu yok; önce Sınavlar’dan oturum açın', 'uyari');
  const uy = s => ks.map(k => ({ k, u: KR.sinavaUygunluk(k, s) }));
  pencere({ baslik: 'Sınava yaz · ' + ks.length + ' aday', genis: true,
    icerik: `<div class="hv-oturumlar">${ot.map(s => { const l = uy(s), n = l.filter(x => x.u.uygun).length; return `<button type="button" class="hv-oturum ${onSecili === s.id ? 'secili' : ''}" data-hv-ot="${s.id}"><b>${tarihUzun(s.tarih)}</b><small>${e(s.saat || '')} · ${e(s.yer || '')} · ${(s.kursiyerler || []).length} yazılı</small><span>Uygun: ${n} / ${ks.length} aday</span></button>`; }).join('')}</div><div data-hv-adaylar></div>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-hv-onay disabled>Sınava yaz</button>',
    onAc(p) {
      let secS = null;
      const goster = id => { secS = ot.find(x => x.id === id); p.querySelectorAll('[data-hv-ot]').forEach(b => b.classList.toggle('secili', b.dataset.hvOt === id));
        const l = uy(secS); p.querySelector('[data-hv-adaylar]').innerHTML = `<p style="font-size:13.5px;color:var(--soluk);margin:10px 0 6px">${tarihUzun(secS.tarih)} için uygunluk</p><ul class="liste">${l.map(({ k, u }) => `<li class="${u.uygun ? '' : 'sinav-uygun-degil'}"><label style="display:flex;gap:10px;align-items:flex-start;flex:1;min-width:0"><input type="checkbox" data-hv-aday="${k.id}" ${u.uygun ? 'checked' : 'disabled'}><span style="min-width:0"><b>${e(tamAd(k))}</b><small style="display:block;color:${u.uygun ? 'var(--soluk)' : 'var(--kirmizi)'}">${u.uygun ? e(hakDurumu(k, 'Direksiyon').cumle) : e(u.engel.join(' · '))}</small>${u.uyari.length ? `<small style="display:block;color:var(--sari-koyu,#a15c00)">${e(u.uyari.join(' · '))}</small>` : ''}</span></label></li>`).join('')}</ul>`;
        p.querySelector('[data-hv-onay]').disabled = !l.some(x => x.u.uygun); };
      p.querySelectorAll('[data-hv-ot]').forEach(b => b.addEventListener('click', () => goster(b.dataset.hvOt)));
      if (onSecili) goster(onSecili);
      p.querySelector('[data-hv-onay]').addEventListener('click', async () => {
        if (!secS) return bildir('Oturum seçin', 'uyari');
        const ids = [...p.querySelectorAll('[data-hv-aday]:checked:not(:disabled)')].map(x => x.dataset.hvAday); if (!ids.length) return bildir('Uygun aday seçin', 'uyari');
        const atlanan = ks.filter(k => !ids.includes(k.id)).map(k => ({ k, u: KR.sinavaUygunluk(k, secS) })), S2 = await import('./sayfalar2.js?v=234');
        secS.kursiyerler.push(...ids); ids.map(kursiyer).forEach(k => { k.dsinavPlan = secS.tarih; S2.sinavUcreti(k, secS); D.secim.delete(k.id); });
        islem('Sınava kursiyer yazdı', 'Direksiyon · ' + tarih(secS.tarih) + ' · ' + ids.map(kursiyer).map(tamAd).join(', ')); kaydet(); kapatPencere();
        bildir(`${ids.length} aday ${tarih(secS.tarih)} sınavına yazıldı${atlanan.length ? ` · ${atlanan.length} aday atlandı: ${atlanan.slice(0, 2).map(x => tamAd(x.k).split(' ')[0] + ' (' + (x.u.engel[0] || 'seçilmedi') + ')').join(', ')}` : ''}`, atlanan.length ? 'uyari' : 'tamam', true);
        yenile && yenile();
      });
    } });
}

// SNV-053: "Arandı" — hakkı dolan adayla görüşmenin sonucu k.hakBitti.aramalar'a (ikinci dört hak başlamadan)
export const ARAMA_SONUC = ['Ulaşılamadı', 'Düşünüyor', 'Gelecek', 'İstemiyor'];
export function aramaSayfasi(k, yenile) {
  if (!k || !k.hakBitti) return;
  pencere({ baslik: 'Arandı · ' + tamAd(k), icerik: `<div class="secim" style="margin-bottom:10px">${ARAMA_SONUC.map((x, i) => `<label><input type="radio" name="as" value="${x}" ${i === 0 ? 'checked' : ''}><span>${x}</span></label>`).join('')}</div>
      <div class="alan"><label for="as-not">Not</label><input id="as-not" class="girdi" name="not" maxlength="140" placeholder="Ör. hafta sonu karar verecek"></div>
      ${(k.hakBitti.aramalar || []).length ? `<p style="font-size:13px;color:var(--soluk);margin-top:10px">Önceki aramalar: ${k.hakBitti.aramalar.slice(-3).reverse().map(a => `${tarih(a.tarih)} · ${e(a.sonuc)}${a.not ? ' (' + e(a.not) + ')' : ''}`).join(' · ')}</p>` : ''}`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-as-kaydet>Kaydet</button>',
    onAc(p) { p.querySelector('[data-as-kaydet]').addEventListener('click', () => { const sonuc = p.querySelector('[name=as]:checked').value, not = p.querySelector('[name=not]').value.trim();
      k.hakBitti.aramalar = [...(k.hakBitti.aramalar || []), { tarih: gun(0), kim: (oturum.kullanici || {}).ad || '', sonuc, ...(not ? { not } : {}) }];
      if (sonuc === 'İstemiyor') k.hakBitti.istemiyor = gun(0);
      islem('Hakkı dolan adayı aradı', `${tamAd(k)} · ${sonuc}${not ? ' · ' + not : ''}`); kaydet(); kapatPencere(); bildir('Arama kaydedildi'); yenile && yenile(); }); } });
}
