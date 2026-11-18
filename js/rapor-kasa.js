// Kasa raporları: vade raporu (RAP-002). Kasa › "Vade raporu" sekmesinde çizilir.
// Bütün geçmiş: kursiyerlerin bütün taksitleri (kapanan kayıtlar dahil), vade aralığı, yalnız ödenmeyenler, avukatta olanlar, kayıt durumu ve sınıf süzgeci.
import { S, gun, fark, SINIFLAR, tamAd, sb, tcMaskele, oturum, sinifEtiket } from './veri.js?v=234';
import { e, tl, rozet, tarih, ik, csvIndir } from './ui.js?v=234';

// süzgeç durumu sayfa yenilense de bu oturumda kalır
export const vadeSuzgec = { bas: '', bit: '', odenmemis: true, avukat: false, kayit: 'hepsi', sinif: '' };
const ODENEN = t => t.odendi ? +t.tutar || 0 : Math.min(+t.tutar || 0, +t.kismi || 0);
// Avukata verildi: senedin son takip adımı "Avukatta" ya da öğrenci dosyası avukata verilmiş (k.avukat)
const avukattaMi = (k, t) => !!(k.avukat && !k.avukat.kapandi) || ((t.senetTakip || [])[0] || {}).durum === 'Avukatta';
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
      && (!f.avukat || avukattaMi(k, t))
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
