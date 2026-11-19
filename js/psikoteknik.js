// Psikoteknik randevusu (DIR-043, karar SOR-055): kursun yan hizmeti. Kaynak (oda/cihaz) × gün × saat randevu; kişi kursiyer ya da kurs dışından biri.
// Kurallar (Çizgi #95): sonucu "Başarılı" olan kişiye yeni randevu verilmez; bir kişinin aynı anda tek açık (Planlandı) randevusu olur;
// aynı kaynakta aynı gün ve saate iki randevu verilmez; geçmiş güne randevu verilmez.
// Model: S.psikoteknik = [{ id, kursiyer?, ad, tel, tc?, tarih, saat, kaynak, psikolog, test, durum: Planlandı|Geldi|Gelmedi|İptal, sonuc: ''|Başarılı|Başarısız, not, kaydeden, eklendi }]
import { S, gun, fark, kursiyer, tamAd, islem, kaydet, sb, oturum, selam, kursAdi, tcGecerli } from './veri.js?v=235';
import { e, ik, rozet, pencere, kapatPencere, bildir, tarih, tarihUzun, goreli, bos, isaret } from './ui.js?v=235';
import { bildirimler } from './sayfalar1.js?v=235';

export const TESTLER = ['Psikoteknik değerlendirme', 'Tekrar değerlendirme'];
const SAATLER = Array.from({ length: 20 }, (_, i) => String(9 + Math.floor(i / 2)).padStart(2, '0') + (i % 2 ? ':30' : ':00'));
export const ayar = () => { const p = S.kurs.psikoteknik || {}; return { kaynaklar: (p.kaynaklar && p.kaynaklar.length ? p.kaynaklar : ['Psikoteknik 1']), sure: +p.sure || 30 }; };
const liste = () => (S.psikoteknik = S.psikoteknik || []);
const kisiAnahtar = x => x.kursiyer ? 'k:' + x.kursiyer : x.tc ? 't:' + x.tc : 'a:' + String(x.ad || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim() + '|' + String(x.tel || '').replace(/\D/g, '').slice(-10);
const kisiAd = x => x.kursiyer && kursiyer(x.kursiyer) ? tamAd(kursiyer(x.kursiyer)) : x.ad || '';
// Yeni randevu engeli: boş ise verilebilir
export function engel(kisi, { tarih: t, saat, kaynak, haric = null } = {}) {
  const a = kisiAnahtar(kisi), l = liste().filter(x => x.id !== haric && kisiAnahtar(x) === a);
  const basarili = l.filter(x => x.sonuc === 'Başarılı').sort((p, q) => q.tarih.localeCompare(p.tarih))[0];
  if (basarili) return `${kisiAd(kisi) || 'Bu kişi'} ${tarih(basarili.tarih)} değerlendirmesinde başarılı; yeni randevu verilmez.`;
  const acik = l.find(x => x.durum === 'Planlandı' && x.tarih >= gun(0));
  if (acik) return `${kisiAd(kisi) || 'Bu kişinin'} ${tarih(acik.tarih)} ${acik.saat} için açık randevusu var; önce onu sonuçlandırın ya da iptal edin.`;
  if (t && t < gun(0)) return 'Geçmiş bir güne randevu verilmez.';
  if (t && saat && kaynak && liste().some(x => x.id !== haric && x.durum !== 'İptal' && x.kaynak === kaynak && x.tarih === t && x.saat === saat)) return `${kaynak} için ${tarih(t)} ${saat} dolu.`;
  return '';
}
export const kursiyerRandevusu = k => liste().filter(x => x.kursiyer === k.id).sort((a, b) => (b.tarih + b.saat).localeCompare(a.tarih + a.saat))[0] || null;

export function randevuPenceresi({ kursiyerId = '', sonra } = {}) {
  const A = ayar(), ks = sb(S.kursiyerler).filter(k => !k.kapali).sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
  const psikologlar = [...new Set(liste().map(x => x.psikolog).filter(Boolean))];
  pencere({
    baslik: 'Psikoteknik randevusu',
    icerik: `<form id="f-psiko" class="form-izgara" novalidate>
      <div class="alan tam"><label for="ps-k">Kişi</label><select id="ps-k" name="kursiyer"><option value="">Kurs dışından biri</option>${ks.map(k => `<option value="${e(k.id)}" ${k.id === kursiyerId ? 'selected' : ''}>${e(tamAd(k))}${k.tel ? ' · ' + e(k.tel) : ''}</option>`).join('')}</select></div>
      <div class="alan ps-dis"><label for="ps-ad">Ad soyad</label><input id="ps-ad" name="ad" maxlength="60"></div>
      <div class="alan ps-dis"><label for="ps-tel">Telefon</label><input id="ps-tel" name="tel" inputmode="tel" placeholder="05xx xxx xx xx"></div>
      <div class="alan ps-dis"><label for="ps-tc">T.C. kimlik no <small style="font-weight:400">isteğe bağlı</small></label><input id="ps-tc" name="tc" inputmode="numeric" maxlength="11"></div>
      <div class="alan"><label for="ps-tarih">Gün</label><input id="ps-tarih" name="tarih" type="date" min="${gun(0)}" value="${gun(1)}"></div>
      <div class="alan"><label for="ps-saat">Saat</label><select id="ps-saat" name="saat">${SAATLER.map(s => `<option ${s === '10:00' ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="alan"><label for="ps-kaynak">Oda / cihaz</label><select id="ps-kaynak" name="kaynak">${A.kaynaklar.map(x => `<option>${e(x)}</option>`).join('')}</select></div>
      <div class="alan"><label for="ps-psikolog">Psikolog</label><input id="ps-psikolog" name="psikolog" list="ps-pl" maxlength="60"><datalist id="ps-pl">${psikologlar.map(x => `<option value="${e(x)}">`).join('')}</datalist></div>
      <div class="alan"><label for="ps-test">Test</label><select id="ps-test" name="test">${TESTLER.map(x => `<option>${e(x)}</option>`).join('')}</select></div>
      <div class="alan tam"><label for="ps-not">Not</label><input id="ps-not" name="not" maxlength="160"></div>
      <div id="ps-uyari" class="tam"></div>
      <label class="tam" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="hat" checked style="width:18px;height:18px"> Randevuyu WhatsApp’tan bildir</label></form>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-psiko">Randevu ver</button>',
    onAc(p) {
      const f = p.querySelector('#f-psiko'), uy = p.querySelector('#ps-uyari');
      const kisi = () => f.kursiyer.value ? { kursiyer: f.kursiyer.value } : { ad: f.ad.value.trim(), tel: f.tel.value.trim(), tc: f.tc.value.replace(/\D/g, '') };
      const guncel = () => { p.querySelectorAll('.ps-dis').forEach(x => { x.hidden = !!f.kursiyer.value; });
        const k = kisi(), m = (f.kursiyer.value || k.ad) ? engel(k, { tarih: f.tarih.value, saat: f.saat.value, kaynak: f.kaynak.value }) : '';
        uy.innerHTML = m ? `<p class="ipucu uyari" style="margin:0">${isaret('dur', 18)}<span>${e(m)}</span></p>` : ''; };
      f.addEventListener('change', guncel); f.addEventListener('input', guncel); guncel();
      f.addEventListener('submit', ev => { ev.preventDefault();
        const k = kisi(); if (!f.kursiyer.value && (k.ad.length < 3 || k.tel.replace(/\D/g, '').length < 10)) return bildir('Ad soyad ve telefon yazın', 'uyari');
        if (k.tc && !tcGecerli(k.tc)) return bildir('T.C. kimlik numarası geçersiz', 'uyari');
        if (!f.tarih.value) return bildir('Gün seçin', 'uyari');
        const m = engel(k, { tarih: f.tarih.value, saat: f.saat.value, kaynak: f.kaynak.value }); if (m) return bildir(m, 'uyari');
        const x = { id: 'ps' + Date.now(), ...k, tarih: f.tarih.value, saat: f.saat.value, kaynak: f.kaynak.value, psikolog: f.psikolog.value.trim(), test: f.test.value, durum: 'Planlandı', sonuc: '', not: f.not.value.trim(), kaydeden: (oturum.kullanici && oturum.kullanici.ad) || '', eklendi: gun(0) };
        liste().push(x); islem('Psikoteknik randevusu verdi', `${kisiAd(x)} · ${tarih(x.tarih)} ${x.saat} · ${x.kaynak}`); kaydet(); kapatPencere();
        const kr = x.kursiyer && kursiyer(x.kursiyer), metin = `${kr ? selam(kr) : 'Merhaba,'} psikoteknik değerlendirme randevunuz ${tarihUzun(x.tarih)} saat ${x.saat}. Kimliğinizi yanınıza alın. ${kursAdi()}`;
        if (f.hat.checked && kr) bildirimler([{ kim: kr, metin, tur: 'Psikoteknik randevusu' }], 'Randevu verildi'); else bildir('Randevu verildi' + (f.hat.checked && !kr ? '; kurs dışı kişiye mesajı kendiniz gönderin' : ''));
        sonra && sonra(); });
    },
  });
}
function sonucPenceresi(id, sonra) {
  const x = liste().find(y => y.id === id); if (!x) return;
  pencere({ baslik: `${kisiAd(x)} · ${tarih(x.tarih)} ${x.saat}`, icerik: `<p style="font-size:14px;margin-bottom:10px">${e(x.test)} · ${e(x.kaynak)}${x.psikolog ? ' · ' + e(x.psikolog) : ''}</p>
      <div class="secim">${['Başarılı', 'Başarısız'].map(v => `<label><input type="radio" name="ps-sonuc" value="${v}" ${x.sonuc === v ? 'checked' : ''}><span>${v}</span></label>`).join('')}</div>
      <div class="alan" style="margin-top:10px"><label for="ps-snot">Not</label><input id="ps-snot" class="girdi" maxlength="160" value="${e(x.not || '')}"></div>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-ps-kaydet>Kaydet</button>',
    onAc(p) { p.querySelector('[data-ps-kaydet]').addEventListener('click', () => { const v = p.querySelector('[name=ps-sonuc]:checked'); if (!v) return bildir('Sonucu seçin', 'uyari');
      x.sonuc = v.value; x.durum = 'Geldi'; x.not = p.querySelector('#ps-snot').value.trim(); islem('Psikoteknik sonucunu girdi', `${kisiAd(x)} · ${x.sonuc}`); kaydet(); kapatPencere(); bildir('Kaydedildi'); sonra && sonra(); }); } });
}

export function psikoHtml() {
  const l = liste().slice().sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat)), yak = l.filter(x => x.durum === 'Planlandı' && x.tarih >= gun(0)), gec = l.filter(x => !(x.durum === 'Planlandı' && x.tarih >= gun(0))).reverse().slice(0, 40);
  const bekleyen = l.filter(x => x.durum === 'Planlandı' && x.tarih < gun(0));
  const satir = x => `<li><span class="zaman">${x.saat}</span><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${x.kursiyer ? `<a href="#/kursiyer/${e(x.kursiyer)}" style="color:inherit">${e(kisiAd(x))}</a>` : e(kisiAd(x))}</b>${x.kursiyer ? '' : ' ' + rozet('Kurs dışı', 'notr')}<small style="display:block;color:var(--soluk)">${goreli(x.tarih)} · ${e(x.kaynak)}${x.psikolog ? ' · ' + e(x.psikolog) : ''} · ${e(x.test)}${x.not ? ' · ' + e(x.not) : ''}</small></div>
    <span class="sag" style="gap:6px;flex-wrap:wrap">${x.sonuc ? rozet(x.sonuc, x.sonuc === 'Başarılı' ? 'yesil' : 'kirmizi') : x.durum !== 'Planlandı' ? rozet(x.durum, x.durum === 'İptal' ? 'notr' : 'kirmizi') : ''}${x.durum === 'Planlandı' ? `${x.tarih <= gun(0) ? `<button class="dg dg-ana dg-kucuk" data-ps-sonuc="${e(x.id)}">Sonuç gir</button><button class="dg dg-cizgi dg-kucuk" data-ps-durum="${e(x.id)}:Gelmedi">Gelmedi</button>` : ''}<button class="dg dg-hafif dg-kucuk" data-ps-durum="${e(x.id)}:İptal">İptal</button>` : x.durum === 'Geldi' ? `<button class="dg dg-hafif dg-kucuk" data-ps-sonuc="${e(x.id)}">${ik('kalem')}Düzelt</button>` : ''}</span></li>`;
  return `<div class="kart"><div class="kart-bas"><h3>Psikoteknik randevuları</h3><small>Kursun yan hizmeti · sonucu başarılı olana yeni randevu verilmez, kişi başına tek açık randevu</small><div class="sag"><button class="dg dg-ana dg-kucuk" data-ps-yeni>${ik('arti')}Randevu ver</button></div></div>
    ${bekleyen.length ? `<p class="ipucu uyari" style="margin:10px 16px 0">${isaret('uyari', 18)}<span>${bekleyen.length} randevunun günü geçti, sonucu girilmedi.</span></p>` : ''}
    ${yak.length || bekleyen.length ? `<ul class="liste" style="margin-top:6px">${[...bekleyen, ...yak].map(satir).join('')}</ul>` : `<div class="kart-govde">${bos('Yaklaşan randevu yok', '“Randevu ver” ile kursiyere ya da kurs dışından birine randevu verin.')}</div>`}
    ${gec.filter(x => !bekleyen.includes(x)).length ? `<div class="kart-bas" style="padding-top:14px"><h3>Geçmiş</h3><small>son 40</small></div><ul class="liste" style="margin-top:6px">${gec.filter(x => !bekleyen.includes(x)).map(satir).join('')}</ul>` : ''}
  </div>`;
}
export function psikoBaglan(k, yenile) {
  k.addEventListener('click', ev => {
    if (ev.target.closest('[data-ps-yeni]')) return randevuPenceresi({ sonra: yenile });
    const s = ev.target.closest('[data-ps-sonuc]'); if (s) return sonucPenceresi(s.dataset.psSonuc, yenile);
    const d = ev.target.closest('[data-ps-durum]'); if (d) { const [id, v] = d.dataset.psDurum.split(':'), x = liste().find(y => y.id === id); if (!x) return; x.durum = v; islem(v === 'İptal' ? 'Psikoteknik randevusunu iptal etti' : 'Psikoteknik: gelmedi işaretledi', `${kisiAd(x)} · ${tarih(x.tarih)} ${x.saat}`); kaydet(); bildir(v === 'İptal' ? 'Randevu iptal edildi' : 'Gelmedi işaretlendi'); return yenile(); }
  });
}
