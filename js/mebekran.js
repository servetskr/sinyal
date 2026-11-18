// MEB-187: MEBBİS aktarımı ekranının yeni iskeleti — üst şerit (Yardımcı · MEBBİS oturumu · şu an), takvime bağlı "açık MEBBİS pencereleri",
// aday × adım matrisi (MEBBİS'in giriş sırasıyla). Yalnız gösterir; yazma ve okuma mebtoplu.js / eklenti.js üzerinden, onaylı.
import { S, gun, fark, iso, sb, tamAd, kuralAyar, cokSube, seciliSube } from './veri.js?v=234';
import { e, tarih, ik } from './ui.js?v=234';
import * as GR from './gruplar.js?v=234';
import * as EK from './eklenti.js?v=234';
import * as MT from './mebtoplu.js?v=234';
import * as ME from './mebevrak.js?v=234';

const saat = t => new Date(t).toTimeString().slice(0, 5);
const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/* ---------- üst şerit: üç durum ---------- */
export function durumSeridi() {
  const E = EK.eklenti, o = E.oturum, yas = o ? Date.now() - o.zaman : Infinity, calisiyor = MT.suruyor();
  const nokta = r => `<i class="mx-nokta" style="background:${r}"></i>`;
  const kurulu = E.var ? (MT.surumEnAz(MT.ONERILEN_SURUM, E.surum) ? `${nokta('var(--yesil)')}Yardımcı kurulu${E.surum ? ' · ' + e(E.surum) : ''}` : `${nokta('var(--sari)')}Yardımcı ${e(E.surum || 'eski sürüm')} · ${MT.surumEnAz(MT.GEREKEN_SURUM, E.surum) ? 'yeni okumalar için' : 'MEBBİS işleri için'} ${MT.ONERILEN_SURUM} gerekli · <button type="button" class="mx-bag" data-meb-arac-kur>Güncelle</button>`) : `${nokta('var(--kirmizi)')}Yardımcı bu tarayıcıda kurulu değil · <button type="button" class="mx-bag" data-meb-arac-kur>Nasıl kurulur?</button> <span class="mx-soluk">(kurulana kadar Elle giriş)</span>`;
  const sb_ = cokSube() && seciliSube(), kurum = sb_ ? `<span>${nokta('var(--levha)')}MEBBİS kurumu: <b>${e(sb_.ad)}</b>${sb_.kurumKodu ? ` · <span class="mono">${e(sb_.kurumKodu)}</span>` : ''}</span>` : '';
  const oturum = !E.var ? `${nokta('var(--cizgi)')}MEBBİS oturumu bilinmiyor`
    : !o ? `${nokta('var(--cizgi)')}MEBBİS oturumu: MEBBİS’e girin`
      : !o.acik ? `${nokta('var(--kirmizi)')}MEBBİS oturumu kapandı · yeniden girin`
        : yas > 6 * 60e3 ? `${nokta('var(--sari)')}MEBBİS oturumu son görülme ${saat(o.zaman)}`
          : `${nokta('var(--yesil)')}MEBBİS oturumu açık · ${saat(o.zaman)}`;
  const simdi = calisiyor ? `${nokta('var(--levha)')}Şu an: ${e(MT.durum.adim || 'çalışıyor')}` : `${nokta('var(--cizgi)')}Şu an boşta`;
  const z = (S.mebCekim || {}).toplu;
  return `<div class="mx-durum">${kurum}<span>${kurulu}</span><span>${oturum}</span><span>${simdi}</span>${z ? `<span class="mx-soluk">Son güncelleme ${e(z.slice(8, 10) + '.' + z.slice(5, 7) + ' ' + z.slice(11))}</span>` : ''}</div>`;
}

/* ---------- açık MEBBİS pencereleri (takvim) ---------- */
// Kayıt ve grup penceresi: dönem ayından önceki ayın 15'i → dönem ayının 10'u (MEBBİS duyurusuyla uzayabilir)
export function kayitPenceresi(t = gun(0)) {
  const d = GR.acilabilirDonem(t), y = +d.slice(0, 4), a = +d.slice(4, 6), onceki = new Date(y, a - 2, 15, 12), bit = `${d.slice(0, 4)}-${d.slice(4, 6)}-10`;
  const bas = iso(onceki); return { donem: d, ad: AY[a - 1], bas, bit, acik: t >= bas && t <= bit };
}
// son gün metni (tarihe ek getirilmez): 'Süresi geçti · son gün 15 Kas' / 'Bugün son gün' / 'Son gün 22 Kas · 4 gün'
const sureMetin = (son, kural) => { if (!son) return kural || ''; const k = fark(son), n = k < 0 ? `Süresi geçti · son gün ${tarih(son)}` : k === 0 ? 'Bugün son gün' : k === 1 ? 'Yarın son gün' : `Son gün ${tarih(son)} · ${k} gün`; return kural ? `${n} (${kural})` : n; };
export function pencereler(hepsi) {
  const ac = hepsi.filter(x => !x.bitti), tur = t => ac.filter(x => x.tur === t), enYakin = l => l.map(x => x.son).filter(Boolean).sort()[0] || '';
  const l = [], ekle = (o) => { if (o) l.push(o); };
  { const p = tur('program'), c = (S.dersler || []).filter(d => d.mebHata && !d.meb).length;
    if (p.length) { const s = enYakin(p); ekle({ tur: 'program', baslik: 'Direksiyon programı', sure: sureMetin(s, `dersten ${kuralAyar('programOnGun')} gün önce`), sayi: `${p.length} ders bekliyor${c ? ` · ${c} çakışmalı` : ''}`, dugme: `${p.length} dersi gör`, son: s }); } }
  { const r = tur('sinav'); if (r.length) { const s = enYakin(r), gunler = [...new Set(r.map(x => x.meta && x.meta.tarih).filter(Boolean))].sort();
    ekle({ tur: 'sinav', baslik: `Sınav randevusu${gunler[0] ? ' · ' + tarih(gunler[0]) : ''}`, sure: sureMetin(s, `sınavdan ${kuralAyar('sinavBildirimIsGunu')} iş günü önce`), sayi: `${r.length} aday${gunler.length > 1 ? ` · ${gunler.length} sınav günü` : ''}`, dugme: 'Randevuları gör', son: s }); } }
  { const kp = kayitPenceresi(), k = tur('kayit'), ev = tur('evrak');
    if (k.length || ev.length) ekle({ tur: k.length ? 'kayit' : 'evrak', baslik: `${kp.ad} kaydı ${kp.acik ? 'açık' : 'henüz açılmadı'}`, sure: kp.acik ? sureMetin(kp.bit) : `Açılış ${tarih(kp.bas)}`, sayi: [k.length && `${k.length} kayıt`, ev.length && `${ev.length} evrak`].filter(Boolean).join(' · ') + ' bekliyor', dugme: 'Kayıtları gör', son: kp.acik ? kp.bit : '', sakin: !kp.acik }); }
  { const bl = GR.mebDurumuBilinmeyenGruplar(); if (bl.length) ekle({ tur: 'grup', baslik: 'Dönem gruplarını eşleyin', sure: 'kayıtlardan önce', sayi: `${bl.length} grubun MEBBİS’te açık olduğu doğrulanmadı (${bl.slice(0, 3).map(g => g.ad).join(', ')}${bl.length > 3 ? '…' : ''})`, dugme: 'MEBBİS’ten güncelle', guncelle: true, son: gun(0) }); }   // DENETİM Ö5
  { const g = tur('grup'); if (g.length) ekle({ tur: 'grup', baslik: 'Dönem grubu aç', sure: 'kayıttan önce', sayi: `${g.length} grup/şube MEBBİS’te yok`, dugme: 'Grupları gör', son: enYakin(g) }); }
  { const t = tur('teorik'); if (t.length) { const s = enYakin(t); ekle({ tur: 'teorik', baslik: 'Teorik ders programı', sure: sureMetin(s, 'ders gününden önce'), sayi: `${t.length} ders bekliyor`, dugme: 'Dersleri gör', son: s }); } }
  { const es = tur('esinav'); if (es.length) { const y = es.filter(x => !(x.meta && x.meta.ucretYok)).length; ekle({ tur: 'esinav', baslik: 'e-Sınav başvurusu', sure: 'ücret yatınca', sayi: `ücreti yatan ${y} · yatmayan ${es.length - y}`, dugme: 'Başvuruları gör', son: enYakin(es) }); } }
  { const o = tur('onay'); if (o.length) ekle({ tur: 'onay', baslik: 'Kurum onayı', sure: 'yalnız kurs müdürü · geri alınamaz', sayi: `${o.length} aday onaya hazır`, dugme: 'Onayları gör', son: '', sakin: true }); }
  { const f = tur('fatura'); if (f.length) ekle({ tur: 'fatura', baslik: 'Fatura kaydı', sure: '', sayi: `${f.length} fatura`, dugme: 'Faturaları gör', son: enYakin(f), sakin: true }); }
  return l.sort((a, b) => (a.sakin ? 1 : 0) - (b.sakin ? 1 : 0) || (a.son || '9999').localeCompare(b.son || '9999'));
}
export function pencerelerHtml(hepsi) {
  const l = pencereler(hepsi);
  if (!l.length) return `<div class="mx-pencereler"><div class="mx-pk mx-sakin"><b>Açık MEBBİS işi yok</b><div class="mx-sure">Bütün kayıtlar, dersler ve randevular MEBBİS’te</div></div></div>`;
  return `<div class="mx-pencereler">${l.map(x => { const k = x.son ? fark(x.son) : null, acil = k != null && k <= 1;
    return `<div class="mx-pk${acil ? ' mx-acil' : x.sakin ? ' mx-sakin' : ''}"><b>${e(x.baslik)}</b>${x.sure ? `<div class="mx-sure">${e(x.sure)}</div>` : ''}<div class="mx-sayi">${e(x.sayi)}</div><button type="button" class="dg ${acil ? 'dg-ana' : 'dg-cizgi'} dg-kucuk" ${x.guncelle ? 'data-mm-guncelle' : `data-mx-tur="${e(x.tur)}"`}>${e(x.dugme)}</button></div>`; }).join('')}</div>`;
}

/* ---------- aday × adım matrisi ---------- */
// hücre: ['ok' MEBBİS'te | 'hazir' gönderime hazır | 'eksik' | 'hata' | 'bos' sırası gelmedi | 'elle' MEBBİS'te elle], açıklama
const SUTUN = [['grup', 'Grup/şube'], ['kayit', 'Kayıt'], ['foto', 'Fotoğraf'], ['ogrenim', 'Öğrenim'], ['saglik', 'Sağlık'], ['adli', 'Sabıka'], ['parmak', 'Parmak izi'], ['sozlesme', 'Sözleşme'], ['adres', 'Adres'], ['fatura', 'Fatura'], ['onay', 'Kurum onayı'], ['ilce', 'İlçe onayı']];
export const matrisDonemleri = () => {
  const d = new Set((S.gruplar || []).filter(g => GR.mebGrubuMu(g) && (S.kursiyerler || []).some(k => k.teorikGrup === g.id)).map(g => g.donem));
  return [...d].sort().reverse();
};
function hucreler(k) {
  const g = (S.gruplar || []).find(x => x.id === k.teorikGrup), D = S.mebDurum || {}, hk = D['kayit-' + k.id], he = D['evrak-' + k.id];
  const ad = Object.fromEntries(ME.mebAdimKontrol(k).map(x => [x.ad, x])), eksik = grp => (ad[grp] ? ad[grp].l.filter(y => !y.ok).map(y => `${y.ad}: ${y.eksik}`) : []);
  const evrakHucre = (grp, kalem) => {
    if (k.mebEvrakGirildi) return ['ok', 'MEBBİS’e girildi ' + tarih(k.mebEvrakGirildi)];
    if (he && he.durum === 'hata') return ['hata', he.not || 'Yazılamadı'];
    const m = kalem ? (ad['Evrak'] || { l: [] }).l.filter(y => y.ad === kalem && !y.ok).map(y => `${y.ad}: ${y.eksik}`) : eksik(grp);
    return !k.mebIslendi ? (m.length ? ['eksik', m.join(' · ')] : ['bos', 'Önce aday kaydı']) : m.length ? ['eksik', m.join(' · ')] : ['hazir', 'Gönderime hazır'];
  };
  const fat = (S.faturalar || []).filter(f => f.kursiyer === k.id && f.no && !['iptal', 'taslak'].includes(f.durum));
  const ilce = String((k.meb || {}).ilceOnay || ((k.meb || {}).liste || {}).ilceOnay || '');
  const evrakTamam = !!k.mebEvrakGirildi;
  return {
    grup: !g ? ['eksik', 'Dönem grubu seçilmedi'] : g.meb ? ['ok', g.ad + ' MEBBİS’te'] : ['hazir', g.ad + ' MEBBİS’te açılacak'],
    kayit: k.mebIslendi ? ['ok', 'MEBBİS’te kayıtlı'] : hk && hk.durum === 'hata' ? ['hata', hk.not || 'Yazılamadı'] : eksik('Dönem kaydı').length ? ['eksik', eksik('Dönem kaydı').join(' · ')] : ['hazir', 'Kayda hazır'],
    foto: k.mebIslendi && k.foto ? ['ok', 'Kayıtla gitti'] : !k.foto ? ['eksik', 'Biyometrik fotoğraf yüklenmemiş'] : ['hazir', 'Kayıtla gider'],
    ogrenim: evrakHucre('Öğrenim'), saglik: evrakHucre('Sağlık'), adli: evrakHucre('Adli sicil'), parmak: evrakHucre(null, 'Parmak izi / imza'),
    sozlesme: k.mebIslendi && (k.sozlesmeImza || (k.evrak || {}).sozlesme) ? ['ok', 'Kayıtla gitti'] : (k.sozlesmeImza || (k.evrak || {}).sozlesme) ? ['hazir', 'İmzalı'] : ['eksik', 'Sözleşme imzalanmamış'],
    adres: k.adres ? ['elle', 'Adres beyanı MEBBİS’te UAVT listelerinden elle seçilir'] : ['eksik', 'Adres girilmemiş'],
    fatura: !fat.length ? ['bos', 'Fatura yok'] : fat.every(f => f.meb) ? ['ok', fat.length + ' fatura MEBBİS’te'] : ['hazir', fat.filter(f => !f.meb).length + ' fatura gönderilecek'],
    onay: k.mebOnay ? ['ok', 'Kurum onayı verildi ' + tarih(k.mebOnay)] : k.mebIslendi && evrakTamam ? ['hazir', 'Onaya hazır (yalnız müdür)'] : ['bos', 'Önce kayıt ve evrak'],
    ilce: /onayland/i.test(ilce) ? ['ok', 'İlçe onayladı'] : /bekl/i.test(ilce) || k.mebOnay ? ['bos', 'İlçe onayı bekleniyor'] : ['bos', ''],
  };
}
const ISARET = { ok: '✓', hazir: '●', eksik: '!', hata: '✕', bos: '·', elle: '✎' };
export function matrisHtml(donem) {
  const dl = matrisDonemleri(); if (!dl.length) return `<div class="kart-govde"><p style="color:var(--soluk)">Dönem grubuna atanmış öğrenci yok. Öğrencileri dönem gruplarına atayınca adım adım durum burada görünür.</p></div>`;
  const d = dl.includes(donem) ? donem : dl[0], gids = new Set((S.gruplar || []).filter(g => GR.mebGrubuMu(g) && g.donem === d).map(g => g.id));
  const ks = sb(S.kursiyerler).filter(k => gids.has(k.teorikGrup) && !(k.kapali && /silin/i.test(String(k.kapanisNeden || k.kapanis || '')))).sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
  const satir = ks.map(k => [k, hucreler(k)]), say = (s, c) => satir.filter(([, h]) => h[s][0] === c).length;
  const onayaHazir = say('onay', 'hazir');
  return `<div class="kb-arac"><label for="mx-donem"><b>Dönem</b></label><select id="mx-donem" class="girdi" data-mx-donem>${dl.map(x => `<option value="${x}" ${x === d ? 'selected' : ''}>${e(GR.donemAdi(x))}</option>`).join('')}</select>
      <span class="mx-soluk">${ks.length} öğrenci</span><span style="flex:1"></span>${onayaHazir ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mx-tur="onay">${onayaHazir} öğrenci onaya hazır</button>` : ''}</div>
    <div class="tablo-kap mx-matris"><table class="tablo"><thead><tr><th>Öğrenci</th>${SUTUN.map(([s, a]) => { const n = say(s, 'hazir'); return `<th>${e(a)}${n ? `<small>${n} hazır</small>` : ''}</th>`; }).join('')}</tr></thead>
    <tbody>${satir.map(([k, h]) => `<tr><td><a href="#/kursiyer/${e(k.id)}"><b>${e(tamAd(k))}</b></a><small>${e(k.sinif || '')}</small></td>${SUTUN.map(([s]) => { const [c, n] = h[s]; return `<td><span class="mx-h mx-${c}" title="${e(n)}" aria-label="${e(n)}">${ISARET[c]}</span></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="mx-lejant">${[['ok', 'MEBBİS’te'], ['hazir', 'gönderime hazır'], ['eksik', 'eksik (üstüne gelin)'], ['hata', 'MEBBİS hata verdi'], ['elle', 'MEBBİS’te elle'], ['bos', 'sırası gelmedi']].map(([c, a]) => `<span><span class="mx-h mx-${c}">${ISARET[c]}</span> ${a}</span>`).join('')}</div>`;
}
