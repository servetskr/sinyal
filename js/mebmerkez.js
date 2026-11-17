// MEBBİS aktarım merkezi: MEBBİS'e gidecek işler türlerine göre sekmelerde, filtrelenir, seçilir, toplu aktarılır.
// Aktarımı MEBBİS Yardımcısı (Chrome eklentisi) kursun kendi MEBBİS oturumunda yürütür; MEBBİS'ten veri çekme de buradan başlar.
import { S, fark, SINIFLAR, egitmen, sb, seciliSube, cokSube, kursiyer, tamAd, islem, kaydet } from './veri.js?v=218';
import { e, tarih, rozet, isaret, ik, sekmeler, bos } from './ui.js?v=218';
import * as EK from './eklenti.js?v=218';
import * as MT from './mebtoplu.js?v=218';
import * as MK from './mebkayit.js?v=218';

const TURLER = [['kayit', 'Kayıt'], ['evrak', 'Evrak'], ['grup', 'Dönem grubu'], ['onay', 'Kurum onayı'], ['teorik', 'Teorik program'], ['program', 'Direksiyon programı'], ['esinav', 'e-Sınav başvurusu'], ['sinav', 'Sınav randevusu'], ['fatura', 'Fatura'], ['al', 'MEBBİS’ten al']];
const butunIsler = hepsi => [...EK.mebIsleri(hepsi), ...MT.ekIsler(hepsi)];
const CEK = [
  ['grup', 'Dönem grupları', 'MEBBİS’teki dönem, grup ve şubeler (ör. Kasım 1A) mdSinyal’e grup kartı olarak gelir. İlk kurulumda önce bunu çekin.'],
  ['sinav', 'Sınav sonuçları', 'e-Sınav ve direksiyon sonuçları mdSinyal’in sonuç penceresine dolar; siz kaydedersiniz.'],
  ['mutabakat', 'MEBBİS ile karşılaştır', 'MEBBİS’teki kursiyer listesi mdSinyal’le karşılaştırılır, farklar gösterilir.'],
  ['kursiyer', 'Kursiyer listesi', 'Geçişte MEBBİS’teki kursiyerleri mdSinyal’e alır.'],
  ['ogretmen', 'Usta öğreticiler', 'Personel listesini alır.'],
  ['arac', 'Araçlar', 'Araç listesini plakalarıyla alır.'],
];
const m = { tur: 'kayit', ara: '', durum: 'bekleyen', tarih: '', sinif: '', egitmen: '', secili: new Set() };

const sonEtiket = t => { if (!t) return ['—', '']; const k = fark(t); return k < 0 ? ['Süresi geçti', 'kirmizi'] : k === 0 ? ['Bugün son gün', 'kirmizi'] : k <= 3 ? [k + ' gün kaldı', 'uyari'] : [tarih(t), 'notr']; };
// [etiket, renk, not, iz] · iz: aktarılan işte kim, ne zaman, nasıl doğrulandı (S.mebDurum başarıda da kalır)
function durumu(x) {
  const d = (S.mebDurum || {})[x.id];
  if (x.bitti) {
    if (d && d.durum === 'tamam' && d.dogrulama === 'mesaj') return ['Kontrol edin', 'uyari', 'Yardımcı yalnız MEBBİS’in mesajını gördü; kaydı MEBBİS listesinde kontrol edin', MK.izMetni(d)];
    return ['Aktarıldı', 'yesil', '', MK.izMetni(d)];
  }
  if (d && d.durum === 'hata' && d.hataTur === 'ekran') return ['Ekran değişti', 'kirmizi', 'MEBBİS ekranı değiştiği için gönderilmedi; “Elle gir” ile girin', ''];
  if (d && d.durum === 'hata') return ['Hata', 'kirmizi', MK.maskele(d.not || ''), ''];
  // Gönderilen iş, Yardımcı "bitti" ya da "hata" diyene kadar (en çok 7 gün) Gönderildi kalır; kendiliğinden Bekliyor'a dönüp iki kez girilmesin
  if (d && d.durum === 'gonderildi' && Date.now() - d.zaman < 7 * 864e5) return ['Gönderildi', 'mavi', 'Yardımcı sonucu bildirmedi; MEBBİS’te kontrol edip gerekirse yeniden gönderin'];
  return ['Bekliyor', 'notr', ''];
}
function suzulmus(hepsi) {
  const a = m.ara.toLocaleLowerCase('tr').trim();
  return hepsi.filter(x => x.tur === m.tur)
    .filter(x => { const d = durumu(x)[0]; return m.durum === 'hepsi' ? true : m.durum === 'aktarildi' ? x.bitti : m.durum === 'hata' ? ['Hata', 'Ekran değişti'].includes(d) : !x.bitti; })
    .filter(x => !m.tarih || (x.meta && x.meta.tarih && (m.tarih === 'bugun' ? fark(x.meta.tarih) === 0 : Math.abs(fark(x.meta.tarih)) <= (m.tarih === 'hafta' ? 7 : 31))))
    .filter(x => !m.sinif || (x.meta && x.meta.sinif === m.sinif))
    .filter(x => !m.egitmen || (x.meta && x.meta.egitmen === m.egitmen))
    .filter(x => !a || (x.baslik + ' ' + (x.meta ? x.meta.detay : '') + ' ' + x.alanlar.map(y => y.deger).join(' ')).toLocaleLowerCase('tr').includes(a))
    .sort((p, q) => (p.bitti - q.bitti) || (p.son || '9999').localeCompare(q.son || '9999') || String(p.meta && p.meta.tarih).localeCompare(String(q.meta && q.meta.tarih)));
}

export function merkezSayisi() { return butunIsler().length; }

export function merkezSekme() {
  const hepsi = butunIsler(true), sayi = t => hepsi.filter(x => x.tur === t && !x.bitti).length;
  const subeSorun = cokSube() && !seciliSube();
  EK.bekleyenleriIsle();   // girişten önce gelen Yardımcı bildirimi (harita-durum) varsa şimdi işlenir; kırmızı kart aşağıda çıkar
  let h = MK.alarmKarti() + MT.isKarti(m.tur === 'al');
  if (!EK.eklenti.var) h += `<div class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span><b>MEBBİS Yardımcısı bu tarayıcıda kurulu değil.</b> Aktarım için Chrome’a bir kez kurun; kurulana kadar “Elle giriş” sekmesinden sırayla girebilirsiniz. <button type="button" data-meb-arac-kur style="background:none;border:0;padding:0;color:var(--levha);font-weight:700;cursor:pointer;font:inherit">Nasıl kurulur?</button></span></div>`;
  if (subeSorun) h += `<div class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span>Her şubenin MEBBİS hesabı ayrı. Aktarmak için yukarıdan şube seçin.</span></div>`;
  // MEBBİS'e girildikten sonra iptal edilen ya da silinen dersler: MEBBİS'teki programdan elle silinmeli (denetimde program ile fiili ders uyuşsun)
  const silinecek = [...new Map((S.mebSilinecek || []).map(x => [x.id, x])).values()];
  if (silinecek.length) h += `<div class="kart" style="margin-bottom:14px;border-color:var(--sari)"><div class="kart-bas"><h3>MEBBİS’ten silinecek dersler</h3><small>MEBBİS’e girildikten sonra iptal edildi ya da silindi · ${silinecek.length}</small></div><ul class="liste" style="margin-top:6px">${silinecek.map(x => { const kk = kursiyer(x.kursiyer); return `<li><span style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(kk ? tamAd(kk) : 'Silinmiş kursiyer')}</b><small style="display:block;color:var(--soluk)">${tarih(x.tarih)} ${e(x.saat)} · ${e((egitmen(x.egitmen) || {}).ad || '')}</small></span><button class="dg dg-cizgi dg-kucuk" data-meb-sildim="${e(x.id)}">MEBBİS’ten sildim</button></li>`; }).join('')}</ul><p class="og-not" style="margin:0 16px 14px">Taşınan dersler ise “Direksiyon programı” listesine “DEĞİŞTİ” notuyla yeniden düştü; MEBBİS’te eski kaydı düzeltin.</p></div>`;
  // Günlük akış: önce MEBBİS'ten güncelle, sonra hepsini tek onayla MEBBİS'e yaz (kurum onayı hariç: geri alınamaz, ayrıca bakılır)
  { const bekleyen = hepsi.filter(x => !x.bitti && x.tur !== 'onay'), z = (S.mebCekim || {}).toplu;
    const ozet = TURLER.filter(([k]) => k !== 'al' && k !== 'onay').map(([k, ad]) => [ad, sayi(k)]).filter(x => x[1]);
    const enYakin = bekleyen.map(x => x.son).filter(Boolean).sort()[0];
    h += `<div class="kart" style="margin-bottom:14px"><div class="kart-govde" style="display:grid;gap:12px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:240px"><b style="font-family:var(--baslik);font-size:20px;color:var(--murekkep);display:block">${bekleyen.length ? `MEBBİS’e girilecek ${bekleyen.length} iş` : 'MEBBİS’e girilecek iş yok'}</b>
          <small style="color:var(--soluk)">${ozet.length ? ozet.map(([ad, n]) => `${e(ad)} ${n}`).join(' · ') : 'Hepsi girildi'}${enYakin ? ` · en yakın son gün ${tarih(enYakin)}` : ''}</small></div>
        ${EK.eklenti.var ? `<button class="dg dg-cizgi" data-mt-denetle ${subeSorun ? 'disabled' : ''} title="Yardımcı her MEBBİS ekranını açıp beklediği alanları arar; hiçbir şey yazılmaz">${ik('goz')}Ekranları denetle</button>` : ''}
        <button class="dg dg-cizgi" data-mm-guncelle ${subeSorun ? 'disabled' : ''} title="Gruplar, öğrenciler, öğrenci dosyaları, personel, araçlar ve sınav sonuçları">${ik('indir')}MEBBİS’ten güncelle</button>
        <button class="dg dg-ana" data-mm-hepsini ${bekleyen.length && !subeSorun ? '' : 'disabled'} style="height:46px;padding:0 20px;font-size:15.5px">${ik('ok')}Hepsini MEBBİS’e yaz${bekleyen.length ? ` (${bekleyen.length})` : ''}</button></div>
      <small style="color:var(--soluk)">Önerilen akış: MEBBİS’e girin, burada önce <b>MEBBİS’ten güncelle</b>, sonra <b>Hepsini MEBBİS’e yaz</b>. Yazılacakları tek pencerede görüp bir kez onaylarsınız; Yardımcı işleri MEBBİS’in istediği sırayla (grup, kayıt, evrak, teorik ve direksiyon programı, e-sınav, randevu, fatura) yazar, kaydeder ve MEBBİS’ten okuyarak doğrular. Güvenlik kodunu siz yazarsınız; istediğiniz an durdurabilirsiniz. Kurum onayı geri alınamadığı için ayrı sekmeden verilir. Yardımcı’sız her işi “Elle gir” ile girebilirsiniz.${z ? ` Son güncelleme ${tarih(z.slice(0, 10))} ${z.slice(11, 16)}.` : ''}</small>
      ${S.mebDenetim ? `<small style="color:var(--soluk)">${MK.denetimOzeti()} · <button type="button" data-mt-denetim-goster style="background:none;border:0;padding:0;color:var(--levha);font-weight:700;cursor:pointer;font:inherit">Ayrıntı</button></small>` : ''}</div></div>`; }
  h += `<div class="kart"><div style="padding:12px 16px 0">${sekmeler(TURLER.map(([k, ad]) => [k, ad, k === 'al' ? null : sayi(k)]), m.tur, 'mm-tur')}</div>`;
  if (m.tur === 'esinav') h += `<div style="padding:12px 16px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label for="mm-esgun" style="font-weight:700;color:var(--murekkep)">Gün tercihi</label><select id="mm-esgun" class="girdi" data-mm-esgun>${[['0', 'En erken tarih'], ['1', 'Hafta içi'], ['2', 'Hafta sonu']].map(([v, t]) => `<option value="${v}" ${String(S.kurs.esinavGun || '0') === v ? 'selected' : ''}>${t}</option>`).join('')}</select><small style="color:var(--soluk)">MEBBİS randevuyu bu tercihe göre verir. Ücreti yatmamış öğrenci gönderilmez.</small></div>`;
  if (m.tur === 'onay') h += `<p class="ipucu uyari" style="margin:12px 16px 0">${isaret('uyari', 18)}<span>Kurum onayından sonra MEBBİS’te fotoğraf ve bilgiler düzeltilemez. Yardımcı yalnız MEBBİS’te fotoğrafı ve evrak kontrolü tamam olanları onaylar.</span></p>`;
  if (m.tur === 'al') {
    h += `<div class="kart-govde">${MT.topluKart(subeSorun)}<b style="display:block;margin:6px 0 8px;color:var(--murekkep)">Tek liste (açık ekrandan)</b><p style="font-size:14px;color:var(--metin);margin-bottom:14px">Yardımcı MEBBİS sekmesine geçer, ilgili listeyi kendisi açar ve buraya getirir. mdSinyal hiçbir şeyi onayınız olmadan kaydetmez.</p>
      <div class="izgara iz-3">${CEK.map(([k, ad, a]) => { const z = (S.mebCekim || {})[k]; return `<div class="kart" style="box-shadow:none"><div class="kart-govde"><b style="color:var(--murekkep);font-size:15.5px;display:block">${ad}</b><p style="font-size:13.5px;color:var(--metin);margin:4px 0 12px">${a}</p><button class="dg dg-ana dg-kucuk" data-meb-cekbtn="${k}" ${subeSorun ? 'disabled' : ''}>${ik('indir')}MEBBİS’ten çek</button>${z ? `<small style="display:block;color:var(--soluk);margin-top:8px">Son: ${tarih(z.slice(0, 10))} ${z.slice(11, 16)}</small>` : ''}</div></div>`; }).join('')}</div></div></div>`;
    return h;
  }
  const l = suzulmus(hepsi), egler = [...new Set(hepsi.filter(x => x.tur === m.tur && x.meta && x.meta.egitmen).map(x => x.meta.egitmen))].map(egitmen).filter(Boolean);
  const siniflar = [...new Set(hepsi.filter(x => x.tur === m.tur && x.meta).map(x => x.meta.sinif))].filter(Boolean);
  [...m.secili].forEach(id => { if (!l.some(x => x.id === id && !x.bitti)) m.secili.delete(id); });
  const secilebilir = l.filter(x => !x.bitti), hepsiSecili = secilebilir.length && secilebilir.every(x => m.secili.has(x.id));
  h += `<div class="filtre"><div class="ara-kutu"><input class="girdi" data-mm-ara placeholder="Ara: ad, TC, plaka, tarih" value="${e(m.ara)}" style="width:100%"></div>
    <select class="girdi" data-mm-durum>${[['bekleyen', 'Aktarılacaklar'], ['hata', 'Hata verenler'], ['aktarildi', 'Aktarılanlar'], ['hepsi', 'Hepsi']].map(([v, t]) => `<option value="${v}" ${m.durum === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <select class="girdi" data-mm-tarih>${[['', 'Tüm tarihler'], ['bugun', 'Bugün'], ['hafta', '±7 gün'], ['ay', '±30 gün']].map(([v, t]) => `<option value="${v}" ${m.tarih === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    ${siniflar.length > 1 ? `<select class="girdi" data-mm-sinif><option value="">Tüm sınıflar</option>${siniflar.map(s => `<option value="${e(s)}" ${m.sinif === s ? 'selected' : ''}>${e((SINIFLAR[s] || {}).ad || s)}</option>`).join('')}</select>` : ''}
    ${egler.length > 1 ? `<select class="girdi" data-mm-egitmen><option value="">Tüm öğretmenler</option>${egler.map(g => `<option value="${e(g.id)}" ${m.egitmen === g.id ? 'selected' : ''}>${e(g.ad)}</option>`).join('')}</select>` : ''}</div>`;
  if (!l.length) h += `<div class="kart-govde">${bos(m.durum === 'bekleyen' ? 'Aktarılacak iş yok' : 'Sonuç yok', m.durum === 'bekleyen' ? 'Bu türde MEBBİS’e girilmemiş kayıt kalmadı.' : 'Filtreleri değiştirmeyi deneyin.')}</div>`;
  else h += `<div class="tablo-kap"><table class="tablo"><thead><tr><th style="width:36px"><input type="checkbox" data-mm-hepsi ${hepsiSecili ? 'checked' : ''} ${secilebilir.length ? '' : 'disabled'} aria-label="Tümünü seç"></th><th>Kursiyer</th><th>Ayrıntı</th><th>Son gün</th><th>Durum</th></tr></thead><tbody>${l.slice(0, 200).map(x => { const [st, sr] = sonEtiket(x.bitti ? null : x.son), [dt, dr, dn, di] = durumu(x); return `<tr data-mm-satir="${e(x.id)}" style="cursor:${x.bitti ? 'default' : 'pointer'}"><td><input type="checkbox" data-mm-sec="${e(x.id)}" ${m.secili.has(x.id) ? 'checked' : ''} ${x.bitti ? 'disabled' : ''} aria-label="${e(x.baslik)} seç"></td><td><b style="color:var(--murekkep)">${e(x.meta ? x.meta.ad : x.baslik)}</b></td><td style="color:var(--metin);font-size:13.5px">${e(x.meta ? x.meta.detay : '')}</td><td>${x.bitti ? '' : rozet(st, sr)}</td><td>${rozet(dt, dr)}${dn ? `<small style="display:block;color:${dr === 'uyari' ? '#7a5200' : dr === 'mavi' ? 'var(--soluk)' : 'var(--kirmizi)'};margin-top:3px;max-width:260px">${e(dn)}</small>` : ''}${di ? `<small style="display:block;color:var(--soluk);margin-top:3px;max-width:260px">${e(di)}</small>` : ''}</td></tr>`; }).join('')}</tbody></table></div>${l.length > 200 ? `<p style="padding:10px 16px;color:var(--soluk);font-size:13px">İlk 200 satır gösteriliyor; filtreyi daraltın.</p>` : ''}`;
  const n = m.secili.size;
  h += `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 16px;border-top:1.5px solid var(--cizgi);position:sticky;bottom:0;background:#fff;border-radius:0 0 12px 12px">
    <span style="flex:1;color:var(--soluk);font-size:14px">${n ? `<b style="color:var(--murekkep)">${n}</b> iş seçili` : `${secilebilir.length} iş aktarılmayı bekliyor`}</span>
    ${secilebilir.length ? `<button class="dg dg-cizgi" data-mm-tumu>${hepsiSecili ? 'Seçimi kaldır' : 'Tümünü seç'}</button>` : ''}
    <button class="dg dg-cizgi" data-mm-elle ${n && !subeSorun ? '' : 'disabled'} title="Yardımcı olmadan: değerleri MEBBİS sırasıyla kopyalatır, siz girersiniz">Elle gir</button>${['kayit', 'program', 'sinav'].includes(m.tur) && EK.eklenti.var ? `<button class="dg dg-cizgi" data-mm-aktar ${n && !subeSorun ? '' : 'disabled'} title="Yedek yol: MEBBİS'te formu açar, siz kaydedersiniz">Ekranda doldur</button>` : ''}<button class="dg dg-ana" style="height:46px;padding:0 20px;font-size:15.5px" data-mm-yaz ${n && !subeSorun ? '' : 'disabled'}>${ik('ok')}MEBBİS’e yaz${n ? ` (${n})` : ''}</button></div><p style="padding:0 16px 14px;font-size:13px;color:var(--soluk)">“MEBBİS’e yaz” önce yazılacakları gösterir; onaylayınca Yardımcı seçilen işleri MEBBİS’te ekran açmadan girer, kaydeder ve MEBBİS’ten okuyup doğrular. Güvenlik kodunu siz yazarsınız. “Elle gir” aynı değerleri Yardımcı olmadan kopyalatır.</p></div>`;
  return h;
}

// Elle gir: kayıt, direksiyon programı ve sınav randevusu mevcut sıralı giriş ekranlarına; diğer altı tür kopyalanabilir alan penceresine
// Kural bulguları önce bilgi olarak gösterilir (MT.kuralBilgi; bulgu yoksa doğrudan); altı türde bulgular elle giriş kartlarında görünür
function elleGir(ids) {
  const t = m.tur;
  if (t === 'kayit') return MT.kuralBilgi(ids, () => { const kid = ids[0] && ids[0].replace(/^kayit-/, ''); if (ids.length === 1) { location.hash = '#/mebbis/' + kid; return; } import('./sayfalar3.js?v=218').then(x => x.mebSiraBaslat(true)); }, { dugme: 'Elle girişe geç' });
  if (t === 'program') return MT.kuralBilgi(ids, () => import('./sayfalar3.js?v=218').then(x => x.programPenceresi()), { dugme: 'Elle girişe geç' });
  if (t === 'sinav') { const x0 = butunIsler(true).find(y => y.id === ids[0]); return MT.kuralBilgi(ids, () => import('./sayfalar3.js?v=218').then(x => x.sinavBildirimPenceresi(x0 && x0.ref.sinav)), { dugme: 'Elle girişe geç' }); }
  MT.elleGir(ids);
}
export function merkezBaglan(k, yenile) {
  MT.topluBaglan(k, yenile);
  const odakla = sec => setTimeout(() => { const el = k.querySelector(sec); if (el) { el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } }, 0);
  k.addEventListener('click', ev => {
    const t = ev.target;
    const ms = t.closest('[data-meb-sildim]'); if (ms) { const x = (S.mebSilinecek || []).find(y => y.id === ms.dataset.mebSildim); S.mebSilinecek = (S.mebSilinecek || []).filter(y => y.id !== ms.dataset.mebSildim); islem('MEBBİS’ten dersi sildi', x ? x.tarih + ' ' + x.saat : ''); kaydet(); return yenile(); }
    const sk = t.closest('[data-mm-tur]'); if (sk) { m.tur = sk.dataset.mmTur; m.secili.clear(); m.sinif = m.egitmen = ''; return yenile(); }
    const cb = t.closest('[data-mm-sec]'); if (cb) { const id = cb.dataset.mmSec; cb.checked ? m.secili.add(id) : m.secili.delete(id); return yenile(); }
    const sat = t.closest('[data-mm-satir]'); if (sat && !t.closest('input')) { const id = sat.dataset.mmSatir, x = butunIsler().find(y => y.id === id); if (!x) return; m.secili.has(id) ? m.secili.delete(id) : m.secili.add(id); return yenile(); }
    const hp = t.closest('[data-mm-hepsi], [data-mm-tumu]'); if (hp) { const l = suzulmus(butunIsler(true)).filter(x => !x.bitti), hepsi = l.length && l.every(x => m.secili.has(x.id)); l.forEach(x => hepsi ? m.secili.delete(x.id) : m.secili.add(x.id)); return yenile(); }
    // Ekranda doldur: seçim yalnız iş Yardımcı'ya gerçekten gidince temizlenir (bilgi penceresinde Vazgeç denirse kalır)
    if (t.closest('[data-mm-aktar]')) { const ids = [...m.secili]; EK.yardimciyaGonder(ids, () => ids.forEach(id => m.secili.delete(id))); return yenile(); }
    if (t.closest('[data-mm-elle]')) { const ids = [...m.secili]; elleGir(ids); return; }
    if (t.closest('[data-mm-guncelle]')) return MT.topluCek(['gruplar', 'kursiyerler', 'dosya', 'personel', 'araclar', 'sinavlar']);
    if (t.closest('[data-mm-hepsini]')) { const ids = butunIsler(true).filter(x => !x.bitti && x.tur !== 'onay').map(x => x.id); MT.yaz(ids).then(r => { if (r) m.secili.clear(); yenile(); }); return; }
    // seçim yalnız iş Yardımcı'ya gidince temizlenir; onay penceresinde vazgeçilirse seçim kalır
    if (t.closest('[data-mm-yaz]')) { const ids = [...m.secili]; MT.yaz(ids).then(r => { if (r) ids.forEach(id => m.secili.delete(id)); yenile(); }); return; }
  });
  k.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('[data-mm-durum]')) { m.durum = t.value; return yenile(); }
    if (t.matches('[data-mm-esgun]')) { S.kurs.esinavGun = t.value; kaydet(); return; }
    if (t.matches('[data-mm-tarih]')) { m.tarih = t.value; return yenile(); }
    if (t.matches('[data-mm-sinif]')) { m.sinif = t.value; return yenile(); }
    if (t.matches('[data-mm-egitmen]')) { m.egitmen = t.value; return yenile(); }
  });
  k.addEventListener('input', ev => { if (ev.target.matches('[data-mm-ara]')) { m.ara = ev.target.value; yenile(); odakla('[data-mm-ara]'); } });
}
