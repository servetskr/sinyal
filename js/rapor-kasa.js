// Kasa raporları: vade raporu (RAP-002). Kasa › "Vade raporu" sekmesinde çizilir.
// Bütün geçmiş: kursiyerlerin bütün taksitleri (kapanan kayıtlar dahil), vade aralığı, yalnız ödenmeyenler, avukatta olanlar, kayıt durumu ve sınıf süzgeci.
import { S, gun, fark, SINIFLAR, tamAd, sb, tcMaskele, oturum, sinifEtiket, ekTur, varsayilanHesap, hareketHesabi, gorunum } from './veri.js?v=234';
import { e, tl, rozet, tarih, ik, csvIndir } from './ui.js?v=234';

// süzgeç durumu sayfa yenilense de bu oturumda kalır
export const vadeSuzgec = { bas: '', bit: '', odenmemis: true, avukat: false, avBas: '', avBit: '', kayit: 'hepsi', sinif: '' };
const ODENEN = t => t.odendi ? +t.tutar || 0 : Math.min(+t.tutar || 0, +t.kismi || 0);
// Avukata verildi: senedin son takip adımı "Avukatta" ya da öğrenci dosyası avukata verilmiş (k.avukat)
const avukattaMi = (k, t) => !!(k.avukat && !k.avukat.kapandi) || ((t.senetTakip || [])[0] || {}).durum === 'Avukatta';
// PAR-037: avukata verilme tarihi (dosya ya da senet)
const avukatTarihi = (k, t) => (k.avukat && !k.avukat.kapandi && k.avukat.tarih) || (((t.senetTakip || [])[0] || {}).durum === 'Avukatta' ? t.senetTakip[0].tarih : '') || '';
const kayitDurumu = k => k.kapali ? 'kapali' : k.asama === 'Ehliyet' ? 'bitti' : 'suruyor';
export const KAYIT_DURUM = [['hepsi', 'Bütün kayıtlar'], ['suruyor', 'Kursu sürenler'], ['bitti', 'Bitirenler'], ['kapali', 'Kaydı kapananlar']];

export function vadeDurumu(k, t) {
  if (t.iptal) return ['İptal', 'notr'];
  if (t.odendi) return ['Ödendi', 'yesil'];
  if (avukattaMi(k, t)) return ['Avukatta', 'kirmizi'];
  const g = fark(t.vade);
  if (g < 0) return [(t.kismi ? 'Kısmi · ' : '') + -g + ' gün gecikti', 'kirmizi'];
  return [(t.kismi ? 'Kısmi · ' : '') + (g === 0 ? 'Bugün' : g + ' gün var'), g <= 3 ? 'sari' : 'notr'];
}

export function vadeSatirlari(f = vadeSuzgec) {
  return sb(S.kursiyerler).flatMap(k => ((k.odeme || {}).taksitler || []).map((t, i) => ({ k, t, i })))
    .filter(({ k, t }) => !!t.vade
      && (!f.bas || t.vade >= f.bas) && (!f.bit || t.vade <= f.bit)
      && (!f.odenmemis || (!t.odendi && !t.iptal))
      && (!f.avukat || (avukattaMi(k, t) && (!f.avBas || avukatTarihi(k, t) >= f.avBas) && (!f.avBit || avukatTarihi(k, t) <= f.avBit)))
      && (f.kayit === 'hepsi' || kayitDurumu(k) === f.kayit)
      && (!f.sinif || k.sinif === f.sinif))
    .sort((a, b) => a.t.vade.localeCompare(b.t.vade) || tamAd(a.k).localeCompare(tamAd(b.k), 'tr'));
}

const SINIR = 300;   // ekranda gösterilen satır; hepsi Excel'de
const tcGoster = tc => oturum.kullanici && oturum.kullanici.rol === 'mudur' ? (tc || '—') : tcMaskele(tc);

export function vadeHtml() {
  const f = vadeSuzgec, l = vadeSatirlari(f);
  // iptal edilen taksit borca ve kalana girmez
  const top = l.reduce((a, { t }) => { if (t.iptal) return a; a.borc += +t.tutar || 0; a.odenen += ODENEN(t); return a; }, { borc: 0, odenen: 0 });
  const siniflar = [...new Set(sb(S.kursiyerler).map(k => k.sinif))].filter(x => SINIFLAR[x]);
  const secim = (ad, liste, v, et) => `<label class="vr-alan"><span>${et}</span><select class="girdi" data-vr="${ad}">${liste.map(([k, t]) => `<option value="${e(k)}" ${k === v ? 'selected' : ''}>${e(t)}</option>`).join('')}</select></label>`;
  const satir = ({ k, t, i }) => { const [d, r] = vadeDurumu(k, t), od = ODENEN(t), kal = t.iptal ? 0 : Math.max(0, (+t.tutar || 0) - od);
    return `<tr><td><a class="kisi" href="#/kursiyer/${k.id}"><div><b>${e(tamAd(k))}</b><small class="mono">${e(tcGoster(k.tc))}</small></div></a></td><td class="m-gizle">${i + 1}. taksit${k.odeme.senetli ? ' · senet' : ''}</td><td class="rf-nw">${tarih(t.vade)} ${String(t.vade).slice(0, 4)}</td><td class="sag sayi">${tl(+t.tutar || 0)}</td><td class="sag sayi m-gizle">${od ? tl(od) : '—'}</td><td class="sag sayi"><b>${kal ? tl(kal) : '—'}</b></td><td>${rozet(d, r)}</td></tr>`; };
  return `<div class="kart"><div class="kart-bas"><h3>Vade raporu</h3><small>${l.length} taksit · borç ${tl(top.borc)} · ödenen ${tl(top.odenen)} · kalan <b>${tl(Math.max(0, top.borc - top.odenen))}</b></small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-vr-excel>${ik('indir')}Excel</button></div></div>
    <div class="vr-suzgec">
      <label class="vr-alan"><span>Vade başı</span><input class="girdi" type="date" data-vr="bas" value="${e(f.bas)}"></label>
      <label class="vr-alan"><span>Vade sonu</span><input class="girdi" type="date" data-vr="bit" value="${e(f.bit)}"></label>
      ${secim('kayit', KAYIT_DURUM, f.kayit, 'Kayıt')}
      ${secim('sinif', [['', 'Bütün sınıflar'], ...siniflar.map(x => [x, sinifEtiket(x)])], f.sinif, 'Sınıf')}
      <label class="vr-tik"><input type="checkbox" data-vr="odenmemis" ${f.odenmemis ? 'checked' : ''}> Yalnız ödenmeyenler</label>
      <label class="vr-tik"><input type="checkbox" data-vr="avukat" ${f.avukat ? 'checked' : ''}> Avukata verilenler</label>
      ${f.avukat ? `<label class="vr-alan"><span>Avukata veriliş başı</span><input class="girdi" type="date" data-vr="avBas" value="${e(f.avBas)}"></label><label class="vr-alan"><span>Avukata veriliş sonu</span><input class="girdi" type="date" data-vr="avBit" value="${e(f.avBit)}"></label>` : ''}
      ${f.bas || f.bit ? '<button class="dg dg-hafif dg-kucuk" data-vr-temizle>Tarihi temizle</button>' : ''}
    </div>
    ${l.length ? `<div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Kursiyer</th><th class="m-gizle">Taksit</th><th>Vade</th><th class="sag">Borç</th><th class="sag m-gizle">Ödenen</th><th class="sag">Kalan</th><th>Durum</th></tr></thead><tbody>${l.slice(0, SINIR).map(satir).join('')}</tbody></table></div>${l.length > SINIR ? `<p class="ipucu" style="margin-top:10px">İlk ${SINIR} satır gösteriliyor; ${l.length} satırın hepsi Excel’de.</p>` : ''}`
      : `<p class="ipucu" style="margin:14px 0 4px">Bu süzgeçle taksit yok.</p>`}
  </div>`;
}

export function vadeExcel() {
  const l = vadeSatirlari();
  csvIndir('vade-raporu-' + gun(0) + '.csv', [['TC', 'Ad soyad', 'Sınıf', 'Taksit', 'Vade', 'Borç', 'Ödenen', 'Kalan', 'Durum', 'Ödeme tarihi'],
    ...l.map(({ k, t, i }) => { const od = ODENEN(t); return [k.tc || '', tamAd(k), sinifEtiket(k.sinif), (i + 1) + '. taksit', t.vade, +t.tutar || 0, od, t.iptal ? 0 : Math.max(0, (+t.tutar || 0) - od), vadeDurumu(k, t)[0], t.odendi || '']; })]);
}

// Kasa sayfasındaki süzgeç olayları; değişince yeniden çizer
export function vadeBaglan(k, yenile) {
  k.addEventListener('change', ev => { const x = ev.target.closest('[data-vr]'); if (!x) return; vadeSuzgec[x.dataset.vr] = x.type === 'checkbox' ? x.checked : x.value; yenile(); });
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-vr-excel]')) vadeExcel();
    if (ev.target.closest('[data-vr-temizle]')) { vadeSuzgec.bas = ''; vadeSuzgec.bit = ''; yenile(); }
  });
}

/* ---------- Gün sonu (RAP-001) ----------
   Ciro = kurs tahsilatı − tahsilat iptali − iade (sınav ücreti, harç gibi resmî emanetler ciroya girmez; il taban listesi not 5).
   Masraf = gider (iade, tahsilat iptali ve döner sermayeye ödenen harç hariç).
   Günlük kasa = o gün kasaya giren nakit − kasadan çıkan nakit (gider, iade, iptal) − bankaya yatırılan nakit.
   Devreden (genel) kasa = gün sonunda kasada olması gereken nakit (açılış bakiyesi + o güne kadarki bütün nakit hareketler). */
const RESMI_GIDER = h => h.tur === 'Gider' && h.kategori === 'Sınav harcı';
const IPTAL = h => h.tur === 'Gider' && h.kategori === 'Tahsilat iptali';
const IADE = h => h.tur === 'Gider' && h.kategori === 'İade';
const BANKA = y => y && y !== 'Nakit';
const topla = (l, f = () => true) => l.filter(f).reduce((a, h) => a + (+h.tutar || 0), 0);
// resmî (emanet) tahsilat: sınav ücreti, harç, kart; ek kalemin türünden (veri.js ekTur)
const resmiGelir = h => { if (h.tur !== 'Gelir' || ['Kurs ücreti', 'Taksit', 'Peşinat'].includes(h.kategori)) return false; const k = h.kursiyer && S.kursiyerler.find(x => x.id === h.kursiyer), x = k && ((k.odeme || {}).ekler || []).find(y => y.ad === h.kategori); return ekTur(x || { ad: h.kategori }) === 'resmi'; };
// PAR-040: seçili şubenin kasası varsa o (veri.js varsayilanHesap)
const kasaHesabi = () => (S.hesaplar || []).find(h => h.id === varsayilanHesap('Nakit', gorunum.sube)) || (S.hesaplar || []).find(h => h.id === 'kasa') || (S.hesaplar || [])[0] || { bakiye: 0 };
// PAR-042: kasadan çıkan / kasaya giren hesaplar arası transfer de kasa nakdini değiştirir
const transferNet = (bas, bit) => { const id = kasaHesabi().id; return (S.transferler || []).reduce((a, x) => x.tarih >= bas && x.tarih <= bit ? a + (x.hedef === id ? +x.tutar || 0 : 0) - (x.kaynak === id ? +x.tutar || 0 : 0) : a, 0); };
// PAR-040: kasanın nakdi, hareketin düştüğü hesaba göre (şube kasası varsa o şubenin nakdi ortak kasaya girmez)
const nakitNet = (l, bas, bit) => { const kid = kasaHesabi().id, bu = h => h.yontem === 'Nakit' && (!kid || hareketHesabi(h) === kid); return transferNet(bas, bit) + l.reduce((a, h) => { if (bu(h) && h.tarih >= bas && h.tarih <= bit) a += h.tur === 'Gelir' ? +h.tutar || 0 : -(+h.tutar || 0); if (h.bankaya && bu(h) && h.tur === 'Gelir' && h.bankaya >= bas && h.bankaya <= bit) a -= +h.tutar || 0; return a; }, 0); };
// t günü sonunda kasada olması gereken nakit. Açılış girilmişse açılıştan ileri, girilmemişse bugünkü bakiyeden geriye doğru hesaplanır.
export function nakitBakiye(t) {
  const hs = kasaHesabi(), l = sb(S.hareket), bugun = gun(0);
  if (hs.acilis) return t < hs.acilis ? null : (+hs.bakiye || 0) + nakitNet(l, hs.acilis, t);
  const simdi = (+hs.bakiye || 0) + nakitNet(l, bugun, bugun);   // sayfalar2.js hesapBakiye ile aynı: sabit bakiye + bugünün neti
  return t >= bugun ? simdi : simdi - nakitNet(l, gunSonra(t), bugun);
}
const gunSonra = t => { const d = new Date(t + 'T12:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
export function gunSonuHesap(t) {
  const l = sb(S.hareket).filter(h => h.tarih === t), gel = l.filter(h => h.tur === 'Gelir'), gid = l.filter(h => h.tur === 'Gider');
  const kursGel = gel.filter(h => !resmiGelir(h));
  const satis = { fatura: topla(sb(S.faturalar || []).filter(f => f.tarih === t)), kasa: topla(gel, h => h.yontem === 'Nakit'), banka: topla(gel, h => BANKA(h.yontem)),
    odemesiz: sb(S.kursiyerler).filter(k => k.kayit === t && k.odeme).reduce((a, k) => a + Math.max(0, (+k.odeme.sozlesme || +k.odeme.toplam || 0) - (+k.odeme.pesin || 0)), 0) };
  const masrafL = gid.filter(h => !IPTAL(h) && !IADE(h) && !RESMI_GIDER(h));
  const gider = { kasa: topla(gid, h => h.yontem === 'Nakit'), banka: topla(gid, h => BANKA(h.yontem)) };
  const iptal = topla(gid, IPTAL), iade = topla(gid, IADE);
  const ciro = topla(kursGel) - iptal - iade, masraf = topla(masrafL);
  const bankaya = topla(sb(S.hareket).filter(h => h.bankaya === t && h.yontem === 'Nakit' && h.tur === 'Gelir'));
  const gunluk = satis.kasa - gider.kasa - bankaya;
  return { t, satis, gider, iptal, iade, ciro, masraf, bankaya, gunluk, devreden: nakitBakiye(t), islem: l.length, kapali: (S.gunSonu || []).includes(t) };
}

// Gün sonu analizi: ayın (ya da aralığın) her günü bir satır
export const analizSuzgec = { ay: '', bas: '', bit: '', aralik: false };
const ayGunleri = ay => { const [y, m] = ay.split('-').map(Number), n = new Date(y, m, 0).getDate(); return Array.from({ length: n }, (_, i) => `${ay}-${String(i + 1).padStart(2, '0')}`); };
const aralikGunleri = (a, b) => { const l = []; let t = a; while (t <= b && l.length < 366) { l.push(t); t = gunSonra(t); } return l; };
export function analizGunleri(f = analizSuzgec) {
  const bugun = gun(0);
  if (f.aralik && f.bas && f.bit) return aralikGunleri(f.bas <= f.bit ? f.bas : f.bit, f.bas <= f.bit ? f.bit : f.bas).filter(t => t <= bugun);
  return ayGunleri(f.ay || bugun.slice(0, 7)).filter(t => t <= bugun);
}
const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const haftaSonu = t => [0, 6].includes(new Date(t + 'T12:00').getDay());
const SUTUN = [['satis.fatura', 'Fatura'], ['satis.kasa', 'Kasa'], ['satis.banka', 'Banka'], ['satis.odemesiz', 'Ödemesiz'], ['gider.kasa', 'Kasa'], ['gider.banka', 'Banka'], ['bankaya', 'Bankaya yatan'], ['ciro', 'Ciro'], ['masraf', 'Masraf'], ['gunluk', 'Günlük kasa'], ['devreden', 'Devreden kasa']];
const deger = (r, yol) => yol.split('.').reduce((x, k) => x == null ? x : x[k], r);
export function analizHtml() {
  const f = analizSuzgec, gl = analizGunleri(f), satirlar = gl.map(gunSonuHesap);
  const top = SUTUN.slice(0, -1).map(([y]) => satirlar.reduce((a, r) => a + (+deger(r, y) || 0), 0)), T = y => top[SUTUN.findIndex(x => x[0] === y)];
  const son = satirlar.length ? satirlar[satirlar.length - 1].devreden : null;
  const para = v => v ? tl(v) : '<span style="color:var(--soluk)">—</span>';
  const ay = f.ay || gun(0).slice(0, 7);
  return `<div class="kart"><div class="kart-bas"><h3>Gün sonu analizi</h3><small>${gl.length} gün · ciro ${tl(T('ciro'))} · masraf ${tl(T('masraf'))}${son != null ? ' · devreden kasa <b>' + tl(son) + '</b>' : ''}</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-ga-excel>${ik('indir')}Excel</button></div></div>
    <div class="vr-suzgec">
      <label class="vr-tik"><input type="checkbox" data-ga="aralik" ${f.aralik ? 'checked' : ''}> Tarih aralığı</label>
      ${f.aralik ? `<label class="vr-alan"><span>Başlangıç</span><input class="girdi" type="date" data-ga="bas" value="${e(f.bas)}" max="${gun(0)}"></label><label class="vr-alan"><span>Bitiş</span><input class="girdi" type="date" data-ga="bit" value="${e(f.bit)}" max="${gun(0)}"></label>`
        : `<label class="vr-alan"><span>Ay</span><input class="girdi" type="month" data-ga="ay" value="${e(ay)}" max="${gun(0).slice(0, 7)}"></label>`}
    </div>
    <p class="ipucu" style="margin:0 0 10px;font-size:12.5px">Ciro = kurs tahsilatı − iptal − iade (sınav ücreti, harç gibi emanetler hariç) · Günlük kasa = giren nakit − çıkan nakit − bankaya yatırılan · Devreden kasa = gün sonunda kasada olması gereken. Hafta sonları renkli; ✓ gün kapatıldı.</p>
    ${gl.length ? `<div class="tablo-kap"><table class="tablo ga-tablo"><thead><tr><th rowspan="2">Gün</th><th colspan="4" class="ga-grup">Satış ve gelir</th><th colspan="3" class="ga-grup">Gider ve nakit çıkışı</th><th colspan="4" class="ga-grup">Toplam</th></tr><tr>${SUTUN.map(([, a]) => `<th class="sag">${a}</th>`).join('')}</tr></thead>
      <tbody>${satirlar.map(r => `<tr class="${haftaSonu(r.t) ? 'ga-hs' : ''}"><td class="rf-nw">${String(+r.t.slice(8))} ${GUN_KISA[new Date(r.t + 'T12:00').getDay()]}${r.kapali ? ' <span title="Gün kapatıldı" style="color:var(--yesil)">✓</span>' : ''}</td>${SUTUN.map(([y]) => `<td class="sag sayi">${y === 'devreden' ? (r.devreden == null ? '—' : tl(r.devreden)) : para(deger(r, y))}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td><b>Toplam</b></td>${top.map(v => `<td class="sag sayi"><b>${tl(v)}</b></td>`).join('')}<td class="sag sayi"><b>${son == null ? '—' : tl(son)}</b></td></tr></tfoot></table></div>`
      : '<p class="ipucu">Bu aralıkta gün yok.</p>'}
  </div>`;
}
export function analizExcel() {
  const satirlar = analizGunleri().map(gunSonuHesap);
  csvIndir('gun-sonu-analizi-' + (analizSuzgec.aralik ? analizSuzgec.bas + '_' + analizSuzgec.bit : (analizSuzgec.ay || gun(0).slice(0, 7))) + '.csv', [['Tarih', 'Gelir · fatura', 'Gelir · kasa', 'Gelir · banka', 'Ödemesiz satış', 'Gider · kasa', 'Gider · banka', 'İptal', 'İade', 'Ciro', 'Masraf', 'Bankaya yatırılan', 'Günlük kasa', 'Devreden kasa', 'Gün kapatıldı'],
    ...satirlar.map(r => [r.t, r.satis.fatura, r.satis.kasa, r.satis.banka, r.satis.odemesiz, r.gider.kasa, r.gider.banka, r.iptal, r.iade, r.ciro, r.masraf, r.bankaya, r.gunluk, r.devreden ?? '', r.kapali ? 'evet' : ''])]);
}
export function analizBaglan(k, yenile) {
  k.addEventListener('change', ev => { const x = ev.target.closest('[data-ga]'); if (!x) return; analizSuzgec[x.dataset.ga] = x.type === 'checkbox' ? x.checked : x.value; if (x.dataset.ga === 'aralik' && x.checked && !analizSuzgec.bas) { analizSuzgec.bas = gun(0).slice(0, 8) + '01'; analizSuzgec.bit = gun(0); } yenile(); });
  k.addEventListener('click', ev => { if (ev.target.closest('[data-ga-excel]')) analizExcel(); });
}
