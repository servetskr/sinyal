// MEBBİS aktarım merkezi: MEBBİS'e gidecek işler türlerine göre sekmelerde, filtrelenir, seçilir, toplu aktarılır.
// Aktarımı MEBBİS Yardımcısı (Chrome eklentisi) kursun kendi MEBBİS oturumunda yürütür; MEBBİS'ten veri çekme de buradan başlar.
import { S, fark, SINIFLAR, egitmen, sb, seciliSube, cokSube, kursiyer, tamAd, islem, kaydet } from './veri.js?v=132';
import { e, tarih, rozet, isaret, ik, sekmeler, bos } from './ui.js?v=132';
import * as EK from './eklenti.js?v=132';

const TURLER = [['kayit', 'Kursiyer kaydı'], ['program', 'Direksiyon programı'], ['sinav', 'Sınav bildirimi'], ['odeme', 'Tahsilat'], ['al', 'MEBBİS’ten al']];
const CEK = [
  ['sinav', 'Sınav sonuçları', 'e-Sınav ve direksiyon sonuçları Sinyal’in sonuç penceresine dolar; siz kaydedersiniz.'],
  ['mutabakat', 'MEBBİS ile karşılaştır', 'MEBBİS’teki kursiyer listesi Sinyal’le karşılaştırılır, farklar gösterilir.'],
  ['kursiyer', 'Kursiyer listesi', 'Geçişte MEBBİS’teki kursiyerleri Sinyal’e alır.'],
  ['taksit', 'Ödemeler', 'MEBBİS’teki ödeme kayıtlarını alır.'],
  ['ogretmen', 'Usta öğreticiler', 'Personel listesini alır.'],
  ['arac', 'Araçlar', 'Araç listesini plakalarıyla alır.'],
];
const m = { tur: 'kayit', ara: '', durum: 'bekleyen', tarih: '', sinif: '', egitmen: '', secili: new Set() };

const sonEtiket = t => { if (!t) return ['—', '']; const k = fark(t); return k < 0 ? ['Süresi geçti', 'kirmizi'] : k === 0 ? ['Bugün son gün', 'kirmizi'] : k <= 3 ? [k + ' gün kaldı', 'uyari'] : [tarih(t), 'notr']; };
function durumu(x) {
  if (x.bitti) return ['Aktarıldı', 'yesil', ''];
  const d = (S.mebDurum || {})[x.id];
  if (d && d.durum === 'hata') return ['Hata', 'kirmizi', d.not || ''];
  // Gönderilen iş, Yardımcı "bitti" ya da "hata" diyene kadar (en çok 7 gün) Gönderildi kalır; kendiliğinden Bekliyor'a dönüp iki kez girilmesin
  if (d && d.durum === 'gonderildi' && Date.now() - d.zaman < 7 * 864e5) return ['Gönderildi', 'mavi', 'Yardımcı sonucu bildirmedi; MEBBİS’te kontrol edip gerekirse yeniden gönderin'];
  return ['Bekliyor', 'notr', ''];
}
function suzulmus(hepsi) {
  const a = m.ara.toLocaleLowerCase('tr').trim();
  return hepsi.filter(x => x.tur === m.tur)
    .filter(x => { const d = durumu(x)[0]; return m.durum === 'hepsi' ? true : m.durum === 'aktarildi' ? d === 'Aktarıldı' : m.durum === 'hata' ? d === 'Hata' : d !== 'Aktarıldı'; })
    .filter(x => !m.tarih || (x.meta && x.meta.tarih && (m.tarih === 'bugun' ? fark(x.meta.tarih) === 0 : Math.abs(fark(x.meta.tarih)) <= (m.tarih === 'hafta' ? 7 : 31))))
    .filter(x => !m.sinif || (x.meta && x.meta.sinif === m.sinif))
    .filter(x => !m.egitmen || (x.meta && x.meta.egitmen === m.egitmen))
    .filter(x => !a || (x.baslik + ' ' + (x.meta ? x.meta.detay : '') + ' ' + x.alanlar.map(y => y.deger).join(' ')).toLocaleLowerCase('tr').includes(a))
    .sort((p, q) => (p.bitti - q.bitti) || (p.son || '9999').localeCompare(q.son || '9999') || String(p.meta && p.meta.tarih).localeCompare(String(q.meta && q.meta.tarih)));
}

export function merkezSayisi() { return EK.mebIsleri().length; }

export function merkezSekme() {
  const hepsi = EK.mebIsleri(true), sayi = t => hepsi.filter(x => x.tur === t && !x.bitti).length;
  const subeSorun = cokSube() && !seciliSube();
  let h = '';
  if (!EK.eklenti.var) h += `<div class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span><b>MEBBİS Yardımcısı bu tarayıcıda kurulu değil.</b> Aktarım için Chrome’a bir kez kurun; kurulana kadar “Elle giriş” sekmesinden sırayla girebilirsiniz. <button type="button" data-meb-arac-kur style="background:none;border:0;padding:0;color:var(--levha);font-weight:700;cursor:pointer;font:inherit">Nasıl kurulur?</button></span></div>`;
  if (subeSorun) h += `<div class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span>Her şubenin MEBBİS hesabı ayrı. Aktarmak için yukarıdan şube seçin.</span></div>`;
  // MEBBİS'e girildikten sonra iptal edilen ya da silinen dersler: MEBBİS'teki programdan elle silinmeli (denetimde program ile fiili ders uyuşsun)
  const silinecek = [...new Map((S.mebSilinecek || []).map(x => [x.id, x])).values()];
  if (silinecek.length) h += `<div class="kart" style="margin-bottom:14px;border-color:var(--sari)"><div class="kart-bas"><h3>MEBBİS’ten silinecek dersler</h3><small>MEBBİS’e girildikten sonra iptal edildi ya da silindi · ${silinecek.length}</small></div><ul class="liste" style="margin-top:6px">${silinecek.map(x => { const kk = kursiyer(x.kursiyer); return `<li><span style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(kk ? tamAd(kk) : 'Silinmiş kursiyer')}</b><small style="display:block;color:var(--soluk)">${tarih(x.tarih)} ${e(x.saat)} · ${e((egitmen(x.egitmen) || {}).ad || '')}</small></span><button class="dg dg-cizgi dg-kucuk" data-meb-sildim="${e(x.id)}">MEBBİS’ten sildim</button></li>`; }).join('')}</ul><p class="og-not" style="margin:0 16px 14px">Taşınan dersler ise “Direksiyon programı” listesine “DEĞİŞTİ” notuyla yeniden düştü; MEBBİS’te eski kaydı düzeltin.</p></div>`;
  h += `<div class="kart"><div style="padding:12px 16px 0">${sekmeler(TURLER.map(([k, ad]) => [k, ad, k === 'al' ? null : sayi(k)]), m.tur, 'mm-tur')}</div>`;
  if (m.tur === 'al') {
    h += `<div class="kart-govde"><p style="font-size:14px;color:var(--metin);margin-bottom:14px">Yardımcı MEBBİS sekmesine geçer, ilgili listeyi kendisi açar ve buraya getirir. Sinyal hiçbir şeyi onayınız olmadan kaydetmez.</p>
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
  else h += `<div class="tablo-kap"><table class="tablo"><thead><tr><th style="width:36px"><input type="checkbox" data-mm-hepsi ${hepsiSecili ? 'checked' : ''} ${secilebilir.length ? '' : 'disabled'} aria-label="Tümünü seç"></th><th>Kursiyer</th><th>Ayrıntı</th><th>Son gün</th><th>Durum</th></tr></thead><tbody>${l.slice(0, 200).map(x => { const [st, sr] = sonEtiket(x.bitti ? null : x.son), [dt, dr, dn] = durumu(x); return `<tr data-mm-satir="${e(x.id)}" style="cursor:${x.bitti ? 'default' : 'pointer'}"><td><input type="checkbox" data-mm-sec="${e(x.id)}" ${m.secili.has(x.id) ? 'checked' : ''} ${x.bitti ? 'disabled' : ''} aria-label="${e(x.baslik)} seç"></td><td><b style="color:var(--murekkep)">${e(x.meta ? x.meta.ad : x.baslik)}</b></td><td style="color:var(--metin);font-size:13.5px">${e(x.meta ? x.meta.detay : '')}</td><td>${x.bitti ? '' : rozet(st, sr)}</td><td>${rozet(dt, dr)}${dn ? `<small style="display:block;color:var(--kirmizi);margin-top:3px;max-width:260px">${e(dn)}</small>` : ''}</td></tr>`; }).join('')}</tbody></table></div>${l.length > 200 ? `<p style="padding:10px 16px;color:var(--soluk);font-size:13px">İlk 200 satır gösteriliyor; filtreyi daraltın.</p>` : ''}`;
  const n = m.secili.size;
  h += `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 16px;border-top:1.5px solid var(--cizgi);position:sticky;bottom:0;background:#fff;border-radius:0 0 12px 12px">
    <span style="flex:1;color:var(--soluk);font-size:14px">${n ? `<b style="color:var(--murekkep)">${n}</b> iş seçili` : `${secilebilir.length} iş aktarılmayı bekliyor`}</span>
    ${secilebilir.length ? `<button class="dg dg-cizgi" data-mm-tumu>${hepsiSecili ? 'Seçimi kaldır' : 'Tümünü seç'}</button>` : ''}
    <button class="dg dg-ana" style="height:46px;padding:0 20px;font-size:15.5px" data-mm-aktar ${n && !subeSorun ? '' : 'disabled'}>${ik('ok')}Seçilenleri MEBBİS’e aktar${n ? ` (${n})` : ''}</button></div></div>`;
  return h;
}

export function merkezBaglan(k, yenile) {
  const odakla = sec => setTimeout(() => { const el = k.querySelector(sec); if (el) { el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } }, 0);
  k.addEventListener('click', ev => {
    const t = ev.target;
    const ms = t.closest('[data-meb-sildim]'); if (ms) { const x = (S.mebSilinecek || []).find(y => y.id === ms.dataset.mebSildim); S.mebSilinecek = (S.mebSilinecek || []).filter(y => y.id !== ms.dataset.mebSildim); islem('MEBBİS’ten dersi sildi', x ? x.tarih + ' ' + x.saat : ''); kaydet(); return yenile(); }
    const sk = t.closest('[data-mm-tur]'); if (sk) { m.tur = sk.dataset.mmTur; m.secili.clear(); m.sinif = m.egitmen = ''; return yenile(); }
    const cb = t.closest('[data-mm-sec]'); if (cb) { const id = cb.dataset.mmSec; cb.checked ? m.secili.add(id) : m.secili.delete(id); return yenile(); }
    const sat = t.closest('[data-mm-satir]'); if (sat && !t.closest('input')) { const id = sat.dataset.mmSatir, x = EK.mebIsleri().find(y => y.id === id); if (!x) return; m.secili.has(id) ? m.secili.delete(id) : m.secili.add(id); return yenile(); }
    const hp = t.closest('[data-mm-hepsi], [data-mm-tumu]'); if (hp) { const l = suzulmus(EK.mebIsleri(true)).filter(x => !x.bitti), hepsi = l.length && l.every(x => m.secili.has(x.id)); l.forEach(x => hepsi ? m.secili.delete(x.id) : m.secili.add(x.id)); return yenile(); }
    if (t.closest('[data-mm-aktar]')) { const ids = [...m.secili]; m.secili.clear(); EK.yardimciyaGonder(ids); return yenile(); }
  });
  k.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('[data-mm-durum]')) { m.durum = t.value; return yenile(); }
    if (t.matches('[data-mm-tarih]')) { m.tarih = t.value; return yenile(); }
    if (t.matches('[data-mm-sinif]')) { m.sinif = t.value; return yenile(); }
    if (t.matches('[data-mm-egitmen]')) { m.egitmen = t.value; return yenile(); }
  });
  k.addEventListener('input', ev => { if (ev.target.matches('[data-mm-ara]')) { m.ara = ev.target.value; yenile(); odakla('[data-mm-ara]'); } });
}
