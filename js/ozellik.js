import { cevapIsle } from './mesaj.js?v=97';
import { S, kaydet, gun, fark, SINIFLAR, kursiyer, egitmen, arac, tamAd, islem, sb, aktifSiniflar, tcGecerli } from './veri.js?v=97';
import { e, tl, ik, rozet, isaret, bildir, pencere, kapatPencere, tarih, tarihUzun, gunKisa, saatDe, csvIndir, ekranNotu, bos, waIstek } from './ui.js?v=97';
import { yenile } from './app.js?v=97';
import { bildirimler } from './sayfalar1.js?v=97';
import { denetimEksikleri } from './sayfalar3.js?v=97';
import { sinifKari, dersMaliyeti, bosKapasite, hakedis, KAPASITE_SAAT, randevuEngeli, bosSlotlar } from './risk.js?v=97';

/* ================= DENETİM SKORU ================= */
export function denetimSkoru() {
  const l = denetimEksikleri();
  const puan = Math.max(0, 100 - l.reduce((a, x) => a + (x[0] === 'dur' ? 15 : x[0] === 'yasak' ? 8 : 3), 0));
  return { puan, kritik: l.filter(x => x[0] !== 'uyari').length, madde: l.length, ilk: l[0] };
}

/* ================= KÂRLILIK VE KAPASİTE ================= */
const renkIsi = (n, max) => n ? `background:color-mix(in srgb, var(--yesil) ${Math.round(18 + n / max * 62)}%, #fff);color:${n / max > .55 ? '#fff' : 'var(--murekkep)'}` : 'background:var(--kagit, #f4f4f2);color:var(--soluk)';
export function karlilik() {
  const m = S.kurs.maliyet, mal = dersMaliyeti(), kap = bosKapasite(6), hk = hakedis(0);
  const siniflar = aktifSiniflar().filter(([, v]) => v.ucret && v.direksiyon).map(([k, v]) => ({ k, v, x: sinifKari(k) }));
  const ekKar = S.kurs.ekDersUcreti - mal.toplam, maxB = S.egitmenler.length || 1;
  const ayAd = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const ayar = (a, ad, birim, adim = 1) => `<div class="alan" style="width:150px"><label>${ad}</label><div style="display:flex;align-items:center;gap:6px"><input class="girdi" type="number" min="0" step="${adim}" data-maliyet="${a}" value="${m[a]}"><small style="color:var(--soluk);white-space:nowrap">${birim}</small></div></div>`;
  return {
    baslik: 'Kârlılık ve kapasite', alt: 'Ders başına ne kazanıyorsunuz, hangi saatler boş, ustalara ne ödenecek',
    html: `${ekranNotu('Bir direksiyon dersinin size bıraktığı para, önümüzdeki günlerin boş usta saatleri ve bu ayın usta hakedişi. Maliyet değerlerini kendi rakamlarınızla değiştirin; hesaplar anında yenilenir.')}
    <div class="kart"><div class="kart-bas"><h3>Ders başı kâr</h3><small>Kurs ücretinin %${m.pay}’i direksiyon eğitimine ayrılır, ders sayısına bölünür</small></div>
      <div class="tablo-kap"><table class="tablo"><thead><tr><th>Sınıf</th><th style="text-align:right">Ders geliri</th><th style="text-align:right">Yakıt</th><th style="text-align:right">Usta primi</th><th style="text-align:right">Bakım ve lastik</th><th style="text-align:right">Ders başı kâr</th><th style="text-align:right">Marj</th></tr></thead><tbody>
        ${siniflar.map(({ k, v, x }) => `<tr><td><b>${e(v.ad)}</b><small style="display:block;color:var(--soluk)">${tl(v.ucret)} · ${v.direksiyon} ders</small></td><td class="sayi" style="text-align:right">${tl(x.gelir)}</td><td class="sayi" style="text-align:right">${tl(x.maliyet.yakit)}</td><td class="sayi" style="text-align:right">${tl(x.maliyet.prim)}</td><td class="sayi" style="text-align:right">${tl(x.maliyet.bakim)}</td><td class="sayi" style="text-align:right;font-weight:800;color:${x.kar > 0 ? 'var(--yesil)' : 'var(--kirmizi)'}">${tl(x.kar)}</td><td style="text-align:right">${rozet('%' + x.marj, x.marj >= 40 ? 'yesil' : x.marj >= 20 ? 'sari' : 'kirmizi')}</td></tr>`).join('')}
        <tr><td><b>Ek direksiyon dersi</b><small style="display:block;color:var(--soluk)">Kursiyerin ayrıca ödediği ders</small></td><td class="sayi" style="text-align:right">${tl(S.kurs.ekDersUcreti)}</td><td class="sayi" style="text-align:right">${tl(mal.yakit)}</td><td class="sayi" style="text-align:right">${tl(mal.prim)}</td><td class="sayi" style="text-align:right">${tl(mal.bakim)}</td><td class="sayi" style="text-align:right;font-weight:800;color:${ekKar > 0 ? 'var(--yesil)' : 'var(--kirmizi)'}">${tl(ekKar)}</td><td style="text-align:right">${rozet('%' + Math.round(ekKar / S.kurs.ekDersUcreti * 100), 'yesil')}</td></tr>
      </tbody></table></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;padding:6px 20px 18px">${ayar('yakit', 'Yakıt fiyatı', '₺/litre', 0.5)}${ayar('tuketim', 'Tüketim', 'L/100 km', 0.1)}${ayar('km', 'Ders başı yol', 'km')}${ayar('bakim', 'Bakım ve lastik', '₺/ders')}${ayar('pay', 'Direksiyon payı', '% ücret')}</div>
      <p style="font-size:13px;color:var(--soluk);padding:0 20px 18px">Usta primi, ustaların ders başı primlerinin ortalamasıdır (${tl(mal.prim)}). Sabit maaş, kira ve sigorta bu tabloda yok; aşağıdaki hakediş tablosunda görünür.</p></div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Önümüzdeki 6 iş günü · boş usta saatleri</h3><small>${kap.toplam} boş usta-saat · her biri satılabilir bir ders</small></div>
      <div class="kart-govde"><div class="isi" role="table" aria-label="Boş kapasite">
        <div role="row"><span class="bas"></span>${KAPASITE_SAAT.map(s => `<span class="bas">${s.slice(0, 2)}</span>`).join('')}</div>
        ${kap.gunler.map((g, i) => `<div role="row"><span class="bas" style="text-align:left">${gunKisa(g)} ${+g.slice(8)}</span>${kap.hucre[i].map(c => `<span style="${renkIsi(c.bos, maxB)}" title="${tarih(g)} ${c.sa} · ${c.bos} usta boş">${c.bos || '·'}</span>`).join('')}</div>`).join('')}
      </div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:16px;align-items:flex-end">
        <div><small style="color:var(--soluk)">Boş saatlerin ders değeri (ek ders fiyatıyla)</small><b style="display:block;font-family:var(--baslik);font-size:28px;color:var(--murekkep)">${tl(kap.toplam * S.kurs.ekDersUcreti)}</b></div>
        <div><small style="color:var(--soluk)">Yalnız %20’si dolsa kalan kâr</small><b style="display:block;font-family:var(--baslik);font-size:28px;color:var(--yesil)">${tl(Math.round(kap.toplam * 0.2) * ekKar)}</b></div>
        <a class="dg dg-cizgi dg-kucuk" style="margin-left:auto" href="#/sinavlar/risk">Riskli kursiyerlere ek ders öner</a><a class="dg dg-ana dg-kucuk" href="#/plan">Planı aç</a></div>
      <p style="font-size:13px;color:var(--soluk);margin-top:10px">Kutudaki sayı o saatte boş olan usta öğretici sayısı. İzinli ustalar, resmî tatiller ve pazar günleri sayılmaz.</p></div></div>
    <div class="ara-bosluk"></div>
    <div class="kart"><div class="kart-bas"><h3>Usta hakedişi · ${ayAd}</h3><small>Yapılan ve imzalanan dersler üzerinden, brüt</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-hakedis-csv>${ik('indir')}Bordroya aktar</button></div></div>
      <div class="tablo-kap"><table class="tablo"><thead><tr><th>Usta öğretici</th><th style="text-align:right">Ders</th><th style="text-align:right">Maaş</th><th style="text-align:right">Ders primi</th><th style="text-align:right">Toplam</th><th style="text-align:right">Ders başı maliyet</th><th>Kontrol</th></tr></thead><tbody>
        ${hk.map(x => `<tr><td><b>${e(x.h.ad)}</b><small style="display:block;color:var(--soluk)">${tl(x.h.prim || 0)} prim/ders</small></td><td class="sayi" style="text-align:right">${x.ders}</td><td class="sayi" style="text-align:right">${tl(x.maas)}</td><td class="sayi" style="text-align:right">${tl(x.prim)}</td><td class="sayi" style="text-align:right;font-weight:800">${tl(x.toplam)}</td><td class="sayi" style="text-align:right">${x.dersBasi ? tl(x.dersBasi) : '—'}</td><td>${x.imzasiz ? rozet(x.imzasiz + ' imzasız', 'kirmizi') + ' ' : ''}${x.kisa ? rozet(x.kisa + ' kısa ders', 'sari') : ''}${!x.imzasiz && !x.kisa ? rozet('Tamam', 'yesil') : ''}</td></tr>`).join('')}
        <tr><td><b>Toplam</b></td><td class="sayi" style="text-align:right">${hk.reduce((a, x) => a + x.ders, 0)}</td><td class="sayi" style="text-align:right">${tl(hk.reduce((a, x) => a + x.maas, 0))}</td><td class="sayi" style="text-align:right">${tl(hk.reduce((a, x) => a + x.prim, 0))}</td><td class="sayi" style="text-align:right;font-weight:800">${tl(hk.reduce((a, x) => a + x.toplam, 0))}</td><td></td><td></td></tr>
      </tbody></table></div>
      <p style="font-size:13px;color:var(--soluk);padding:4px 20px 18px">İmzasız ve 40 dakikadan kısa dersler primden önce kontrol edilmeli; MEB denetiminde de sorulur.</p></div>`,
    baglan(k) {
      k.addEventListener('change', ev => {
        const t = ev.target; if (!t.matches('[data-maliyet]')) return;
        const v = +t.value; if (!(v >= 0) || (t.dataset.maliyet === 'pay' && v > 100)) return bildir('Geçerli bir değer girin', 'uyari');
        S.kurs.maliyet[t.dataset.maliyet] = v; islem('Maliyet ayarını değiştirdi', t.dataset.maliyet + ' = ' + v); kaydet(); yenile(true);
      });
      k.addEventListener('click', ev => {
        if (!ev.target.closest('[data-hakedis-csv]')) return;
        csvIndir('usta-hakedisi.csv', [['Usta öğretici', 'Yapılan ders', 'İmzasız ders', 'Kısa ders', 'Brüt maaş', 'Ders primi', 'Brüt toplam'], ...hk.map(x => [x.h.ad, x.ders, x.imzasiz, x.kisa, x.maas, x.prim, x.toplam])]);
        islem('Usta hakedişini indirdi'); kaydet();
      });
    },
  };
}

/* ================= MEBBİS MUTABAKATI =================
   MEBBİS’ten alınan kursiyer listesi (Excel/CSV) yüklenir; Sinyal’deki kayıtlarla TC bazında karşılaştırılır. */
const mebdeOlmali = () => sb(S.kursiyerler).filter(k => !k.kapali && (k.mebIslendi || !['Kayıt', 'Evrak'].includes(k.asama)));
const yapilanDers = k => S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Yapıldı').length;
function csvOku(metin) {
  const satirlar = metin.replace(/^﻿/, '').split(/\r?\n/).filter(x => x.trim());
  if (!satirlar.length) return [];
  const ayrac = (satirlar[0].match(/;/g) || []).length >= (satirlar[0].match(/,/g) || []).length ? ';' : ',';
  const bol = s => { const o = []; let cur = '', q = false; for (const ch of s) { if (ch === '"') q = !q; else if (ch === ayrac && !q) { o.push(cur.trim()); cur = ''; } else cur += ch; } o.push(cur.trim()); return o; };
  return satirlar.map(bol);
}
export function mutabakatHesapla(metin) {
  const rows = csvOku(metin); if (rows.length < 2) return { hata: 'Dosyada satır bulunamadı' };
  const bas = rows[0].map(x => x.toLocaleLowerCase('tr'));
  const bul = (...l) => bas.findIndex(h => l.some(x => h.includes(x)));
  const iTc = bul('tc', 'kimlik'), iAd = bul('adı', 'ad'), iSoy = bul('soyad'), iSinif = bul('sınıf', 'sinif', 'sertifika'), iDers = bul('direksiyon', 'ders');
  if (iTc < 0) return { hata: 'TC kimlik numarası sütunu bulunamadı. İlk satırda “TC” başlığı olmalı.' };
  const meb = rows.slice(1).map(r => ({ tc: (r[iTc] || '').replace(/\D/g, ''), ad: [r[iAd >= 0 && iAd !== iSoy ? iAd : -1], r[iSoy]].filter(Boolean).join(' '), sinif: iSinif >= 0 ? (r[iSinif] || '').toUpperCase().replace(/\s/g, '') : null, ders: iDers >= 0 && r[iDers] !== '' ? +r[iDers] : null })).filter(x => x.tc);
  const tcMeb = new Map(meb.map(x => [x.tc, x])), olmali = mebdeOlmali(), tcSinyal = new Map(S.kursiyerler.map(k => [k.tc, k]));
  const sonuc = { yalnizSinyal: [], yalnizMeb: [], sinif: [], ders: [], gecersiz: [], eslesen: 0 };
  olmali.forEach(k => {
    const x = tcMeb.get(k.tc); if (!x) return sonuc.yalnizSinyal.push(k.id);
    sonuc.eslesen++;
    if (x.sinif && x.sinif.split('-')[0] !== k.sinif.toUpperCase().split('-')[0]) sonuc.sinif.push({ id: k.id, meb: x.sinif });
    if (x.ders != null && !isNaN(x.ders) && x.ders !== yapilanDers(k)) sonuc.ders.push({ id: k.id, meb: x.ders, sinyal: yapilanDers(k) });
  });
  meb.forEach(x => { if (!tcGecerli(x.tc)) sonuc.gecersiz.push(x); else if (!tcSinyal.has(x.tc) || tcSinyal.get(x.tc).kapali) sonuc.yalnizMeb.push(x); });
  return { satir: meb.length, sonuc };
}
export function mutabakatSekme() {
  const m = S.mutabakat, r = m && m.sonuc, fark_ = r ? r.yalnizSinyal.length + r.yalnizMeb.length + r.sinif.length + r.ders.length : 0;
  const ks = id => kursiyer(id);
  return `<div class="izgara iz-21"><div class="kart"><div class="kart-bas"><h3>MEBBİS mutabakatı</h3><small>${m ? `Son karşılaştırma ${tarih(m.tarih)} ${m.saat} · ${e(m.dosya)} · ${m.satir} satır` : 'Henüz karşılaştırma yapılmadı'}</small></div>
    <div class="kart-govde">
      <p style="font-size:14.5px">MEBBİS’ten kursiyer listesini Excel (CSV) olarak indirip buraya yükleyin. Sinyal TC kimlik numarasına göre eşleştirir; MEBBİS’te eksik kaydı, Sinyal’de olmayan kişiyi, sınıf ve ders sayısı farkını gösterir.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><label class="dg dg-ana" style="cursor:pointer">${ik('indir')}MEBBİS listesini yükle<input type="file" accept=".csv,.txt,text/csv" data-mutabakat-dosya hidden></label><button class="dg dg-cizgi" data-mutabakat-sablon>${ik('indir')}Sinyal listesini indir</button></div>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:8px">Beklenen sütunlar: TC, Adı, Soyadı, Sınıf, Direksiyon ders. Sütun sırası önemli değil; “;” ya da “,” ayraç olabilir.</p>
    </div>
    ${r ? `<ul class="liste">
      ${r.yalnizSinyal.map(id => ks(id)).filter(Boolean).map(k => `<li>${isaret('dur', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(tamAd(k))} · MEBBİS’te yok</b><small style="color:var(--soluk)">${SINIFLAR[k.sinif] ? SINIFLAR[k.sinif].ad : k.sinif} · ${k.asama}. Derse başlamış kursiyerin MEBBİS kaydı olmalı.</small></div><a class="dg dg-ana dg-kucuk" href="#/mebbis/${k.id}">MEBBİS’e gir</a></li>`).join('')}
      ${r.yalnizMeb.map(x => `<li>${isaret('yasak', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(x.ad || x.tc)} · Sinyal’de yok</b><small style="color:var(--soluk)">TC ${x.tc.slice(0, 3)}*****${x.tc.slice(-3)}${x.sinif ? ' · ' + e(x.sinif) : ''}. MEBBİS’te kayıtlı ama kursiyer listenizde değil.</small></div><a class="dg dg-cizgi dg-kucuk" href="#/kursiyerler">Kursiyer ekle</a></li>`).join('')}
      ${r.sinif.map(x => ({ k: ks(x.id), x })).filter(y => y.k).map(({ k, x }) => `<li>${isaret('uyari', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(tamAd(k))} · sınıf farklı</b><small style="color:var(--soluk)">Sinyal: ${k.sinif} · MEBBİS: ${e(x.meb)}</small></div><a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}">Dosyayı aç</a></li>`).join('')}
      ${r.ders.map(x => ({ k: ks(x.id), x })).filter(y => y.k).map(({ k, x }) => `<li>${isaret('uyari', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(tamAd(k))} · direksiyon ders sayısı farklı</b><small style="color:var(--soluk)">Sinyal’de ${x.sinyal} yapılan ders · MEBBİS’te ${x.meb}. ${x.sinyal > x.meb ? 'Programı MEBBİS’e girmeyi unutmuş olabilirsiniz.' : 'MEBBİS’teki fazla ders Sinyal’de imzalı değil.'}</small></div><a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}/dersler">Dersleri aç</a></li>`).join('')}
      ${r.gecersiz.length ? `<li>${isaret('bilgi', 24)}<span style="flex:1">${r.gecersiz.length} satırda TC kimlik numarası geçersiz; atlandı.</span></li>` : ''}
      ${!fark_ ? `<li>${isaret('tamam', 24)}<b style="flex:1;color:var(--yesil)">Fark yok: ${r.eslesen} kursiyer MEBBİS ile birebir aynı.</b></li>` : ''}
    </ul>` : ''}</div>
    <div><div class="kart" style="padding:20px"><small class="et" style="color:var(--soluk)">EŞLEŞEN</small><b style="display:block;font-family:var(--baslik);font-size:48px;font-weight:900;color:var(--murekkep);line-height:1.1">${r ? r.eslesen : '—'}</b><p style="font-size:14px">${r ? `${fark_} fark bulundu` : 'MEBBİS’te olması gereken ' + mebdeOlmali().length + ' kursiyer var'}</p></div>
    <div class="ara-bosluk"></div><div class="kart" style="padding:20px"><small class="et" style="color:var(--soluk)">NEDEN ÖNEMLİ</small><p style="font-size:14px;margin-top:6px">Denetimde MEBBİS kayıtları esas alınır. Sinyal’de yapılmış ama MEBBİS’e girilmemiş ders, kursiyerin sınav başvurusunu ve usta hakedişini etkiler.</p></div></div></div>`;
}
export function mutabakatBaglan(k) {
  k.addEventListener('change', ev => {
    const t = ev.target; if (!t.matches('[data-mutabakat-dosya]')) return;
    const f = t.files[0]; if (!f) return;
    if (f.size > 2e6) return bildir('Dosya çok büyük (en fazla 2 MB)', 'uyari');
    const rd = new FileReader();
    rd.onload = () => {
      const x = mutabakatHesapla(String(rd.result)); if (x.hata) return bildir(x.hata, 'uyari');
      S.mutabakat = { tarih: gun(0), saat: new Date().toTimeString().slice(0, 5), dosya: f.name, satir: x.satir, sonuc: x.sonuc };
      const n = x.sonuc.yalnizSinyal.length + x.sonuc.yalnizMeb.length + x.sonuc.sinif.length + x.sonuc.ders.length;
      islem('MEBBİS mutabakatı yaptı', f.name + ' · ' + n + ' fark'); kaydet(); bildir(n ? n + ' fark bulundu' : 'MEBBİS ile Sinyal birebir aynı', n ? 'uyari' : undefined); yenile();
    };
    rd.readAsText(f, 'utf-8');
  });
  k.addEventListener('click', ev => {
    if (!ev.target.closest('[data-mutabakat-sablon]')) return;
    csvIndir('sinyal-mebbis-listesi.csv', [['TC', 'Adı', 'Soyadı', 'Sınıf', 'Direksiyon ders'], ...mebdeOlmali().map(k => [k.tc, k.ad, k.soyad, k.sinif, yapilanDers(k)])]);
  });
}

/* ================= KURSİYERİN KENDİ RANDEVUSU ================= */
export function randevuAl(k, sonra) {
  const engel = randevuEngeli(k);
  if (engel) return pencere({ baslik: 'Direksiyon dersi al', icerik: `<p class="ipucu">${isaret('bilgi', 20)}<span>${e(engel)}</span></p>`, altlik: `<button class="dg dg-cizgi" data-kapat>Tamam</button>` });
  const l = bosSlotlar(k, 7), h = egitmen(k.egitmen);
  if (!l.length) return pencere({ baslik: 'Direksiyon dersi al', icerik: `<p class="ipucu">${isaret('bilgi', 20)}<span>${e(h.ad)} hocanın önümüzdeki günlerde boş saati yok. Kursa yazarsan bekleme listesine alınırsın; saat boşalınca haber gelir.</span></p>`, altlik: `<button class="dg dg-cizgi" data-kapat>Tamam</button>` });
  const gunler = [...new Set(l.map(x => x.tarih))];
  const S0 = SINIFLAR[k.sinif], planli = S.dersler.filter(d => d.kursiyer === k.id && d.durum === 'Planlandı').length;
  pencere({
    baslik: 'Direksiyon dersi al',
    icerik: `<p style="color:var(--soluk);margin-bottom:12px">${e(h.ad)} hocanın boş saatleri. Seçtiğin saat hemen senin olur; hoca ve kurs bilgilendirilir. ${k.direksiyon + planli}/${S0.direksiyon} dersin planlı.</p>
      ${gunler.map(g => `<p class="et" style="margin:10px 0 6px">${tarihUzun(g)}</p><div class="secim">${l.filter(x => x.tarih === g).map(x => `<label><input type="radio" name="slot" value="${x.tarih}|${x.saat}"><span>${x.saat}</span></label>`).join('')}</div>`).join('')}
      <p style="font-size:12.5px;color:var(--soluk);margin-top:12px">Dersten 24 saat öncesine kadar Derslerim’den iptal edebilirsin.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Dersi al</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        const v = d.querySelector('[name=slot]:checked'); if (!v) return bildir('Bir saat seç', 'uyari');
        const [tg, sa] = v.value.split('|'), x = bosSlotlar(k, 10).find(y => y.tarih === tg && y.saat === sa);
        if (!x) { kapatPencere(); bildir('Bu saat az önce doldu; başka bir saat seç', 'uyari'); return yenile(); }
        const ar = arac(x.arac);
        S.dersler.push({ id: 'd' + Date.now(), kursiyer: k.id, egitmen: x.egitmen, arac: x.arac, tarih: tg, saat: sa, durum: 'Planlandı', eklendi: gun(0), kaynak: 'kursiyer' });
        islem('Kursiyer kendi dersini aldı', tamAd(k) + ' · ' + tarih(tg) + ' ' + sa); kaydet(); kapatPencere(); yenile();
        bildir(`${tarihUzun(tg)} ${saatDe(sa)} dersin planlandı`);
        bildirimler([{ kim: h, metin: `${h.ad.split(' ')[0]} Hoca, ${tamAd(k)} kursiyer ekranından ${tarihUzun(tg)} ${saatDe(sa)} direksiyon dersi aldı${ar ? ' (' + ar.plaka + ')' : ''}. Kursiyerin ${k.direksiyon + planli + 1}. dersi.`, tur: 'Kursiyer randevusu' }, { kim: 'mudur', metin: `${tamAd(k)} ${tarihUzun(tg)} ${saatDe(sa)} ${h.ad} ile direksiyon dersini kendisi aldı.`, tur: 'Kursiyer randevusu' }], 'Kursiyer ders aldı');
        if (sonra) sonra();
      });
    },
  });
}
export function randevuIptal(k, id) {
  const d = S.dersler.find(x => x.id === id); if (!d || d.kursiyer !== k.id || d.durum !== 'Planlandı') return;
  if (fark(d.tarih) < 1) return bildir('Dersten 24 saatten az kaldı; iptal için kursu ara', 'uyari');
  const h = egitmen(d.egitmen);
  pencere({
    baslik: 'Ders iptal edilsin mi?', icerik: `<p>${tarihUzun(d.tarih)} ${saatDe(d.saat)} ${e(h.ad)} ile dersin iptal edilecek. Saat başka bir kursiyere açılır.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>İptal et</button>`,
    onAc(p) {
      p.querySelector('[data-k]').addEventListener('click', () => {
        S.dersler = S.dersler.filter(x => x !== d); islem('Kursiyer dersini iptal etti', tamAd(k) + ' · ' + tarih(d.tarih) + ' ' + d.saat); kaydet(); kapatPencere(); yenile();
        bildir('Dersin iptal edildi');
        bildirimler([{ kim: h, metin: `${h.ad.split(' ')[0]} Hoca, ${tamAd(k)} ${tarihUzun(d.tarih)} ${saatDe(d.saat)} dersini iptal etti; saatiniz boşaldı.`, tur: 'Ders iptali' }, { kim: 'mudur', metin: `${tamAd(k)} ${tarihUzun(d.tarih)} ${saatDe(d.saat)} dersini kursiyer ekranından iptal etti. Saat bekleme listesine teklif edilebilir.`, tur: 'Ders iptali' }], 'Ders iptal edildi');
      });
    },
  });
}
export { bos };

/* ================= WHATSAPP'TAN GELEN MESAJLAR =================
   Kursun hattına yazan kişiye asistan Worker'da cevap verir; mesaj burada adaya dönüşür
   (aynı numara tekrar yazarsa aynı adayın sohbetine eklenir). Asistanın bilemediği soru "Size devredilen"e düşer. */
let gelenDe = false;
export async function gelenKontrol() {
  if (gelenDe || !S.kurs.waApi) return 0;
  gelenDe = true; let n = 0;
  try {
    const j = await (await waIstek('/gelen')).json();
    if (!j.ok) return 0;
    S.gelenAlinan = S.gelenAlinan || [];
    for (const x of (j.liste || []).slice().reverse()) {
      if (S.gelenAlinan.includes(x.id)) continue;
      S.gelenAlinan.push(x.id); n++;
      // fotoğraf ya da PDF: öğrencinin evrakı (indirilemezse sonraki turda yeniden denenir)
      if (x.medya) { const ok = await (await import('./evrak.js?v=97')).evrakGeldi(x).catch(() => false); if (!ok) { S.gelenAlinan.pop(); n--; } continue; }
      const saat = new Date(x.zaman).toTimeString().slice(0, 5);
      // gönderdiğimiz mesaja verilen cevap (evet/hayır ya da “yanıtla”) adaya değil o mesaja işlenir
      const cv = cevapIsle(x);
      if (cv) { islem('Mesaja cevap geldi', cv.ad + ' · ' + cv.baslik + ' · ' + x.metin); bildir(`${cv.ad} cevap verdi: “${x.metin.slice(0, 40)}”`, 'wp'); continue; }
      // gerçek kurs hattında numara tam gelir: kayıtlı kursiyerse mesaj ona yazılır, aday açılmaz
      const tel10 = x.tel ? String(x.tel).slice(-10) : '', ogr = tel10 && S.kursiyerler.find(k => String(k.tel || '').replace(/\D/g, '').slice(-10) === tel10);
      if (ogr) { const ad = ogr.ad + ' ' + ogr.soyad; S.devredilen.unshift({ ad, kanal: 'WhatsApp', konu: 'Kursiyer mesajı', mesaj: x.metin, neden: 'Kursiyer kursun WhatsApp hattına yazdı', saat, bildirim: [[saat, S.kurs.yetkili || 'Kurs müdürü', 'Sinyal']] }); islem('WhatsApp’tan kursiyer mesajı', ad + ' · ' + x.metin.slice(0, 60)); bildir(`${ad} WhatsApp’tan yazdı: “${x.metin.slice(0, 40)}”`, 'wp'); continue; }
      let a = S.adaylar.find(y => (tel10 && String(y.tel || '').replace(/\D/g, '').slice(-10) === tel10) || (y.waSon4 === x.son4 && !['Kayıt', 'Kaybedildi'].includes(y.asama)));
      if (!a) { a = { id: 'l' + Date.now() + n, ad: x.ad || 'WhatsApp adayı · ···' + x.son4, tel: tel10 ? '0' + tel10 : '', waSon4: x.son4, kaynak: 'WhatsApp', kanal: 'WhatsApp', sinif: 'B', asama: 'Yeni', tarih: gun(0), saat, takip: null, not: x.cevap ? 'Kursun WhatsApp hattına yazdı; asistan cevapladı' : 'Kursun WhatsApp hattına yazdı', devir: null, mesajlar: [] }; S.adaylar.unshift(a); }
      a.mesajlar.push({ kim: 'aday', metin: x.metin }, ...(x.cevap ? [{ kim: 'asistan', metin: x.cevap }] : [])); a.saat = saat;
      if (x.devir) { a.devir = x.cevap ? 'Bilinmeyen soru' : 'Yeni mesaj'; S.devredilen.unshift({ ad: a.ad, aday: a.id, kanal: 'WhatsApp', konu: x.cevap ? 'Bilinmeyen soru' : 'Yeni mesaj', mesaj: x.metin, neden: x.cevap ? 'Asistan bilmediği için size devretti' : 'Kursun WhatsApp hattına yazdı; cevabı siz verin', saat, bildirim: [[saat, S.kurs.yetkili || 'Kurs müdürü', 'Sinyal']] }); }
      islem('WhatsApp’tan mesaj geldi', a.ad + ' · ' + (x.konu || 'yeni mesaj'));
      bildir(`WhatsApp’tan yeni mesaj: “${x.metin.slice(0, 40)}”${!x.cevap ? '' : x.devir ? ' · size devredildi' : ' · asistan cevapladı'}`, x.devir && x.cevap ? 'uyari' : 'wp');
    }
    if (n) { S.gelenAlinan = S.gelenAlinan.slice(-200); kaydet(); yenile(); }
  } catch (e) { } finally { gelenDe = false; }
  return n;
}
