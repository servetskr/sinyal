// YON-028: açık onaylı bilgilendirmeler — sözleşme, KVKK metni, iş belgeleri, önemli bilgiler.
// Metin ilgili roldeki kişiye her girişte çıkar; kişi "Bir daha gösterme" diyene kadar sürer. Onay yalnız açık tıklamayla kaydedilir
// (pencerenin açılması onay sayılmaz). Kayıt kişi başına ve metnin sürümüyle kurs verisinde tutulur (cihazlar arası):
// S.onaylar[kişi][metin] = { surum, gordu, onay?, gosterme, ad }. Metin değişince (sürüm artınca) yeniden sorulur.
import { S, kaydet, islem, oturum } from './veri.js?v=235';
import { pencere, kapatPencere, e, isaret, bildir } from './ui.js?v=235';

// YON-069: metnin SHA-256 özeti (onay kaydında metnin o anki hâli kanıtlanır)
export async function ozet(metin) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(metin))); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (x) { return ''; } }
const duzMetin = html => { const d = document.createElement('div'); d.innerHTML = html; return (d.innerText || d.textContent || '').replace(/\s+/g, ' ').trim(); };
export const ROL_AD = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici' };
export const HAZIR_BILGI = [
  // YON-069: mdSinyal hizmet sözleşmesi ve Veri İşleme Sözleşmesi müdüre uygulama içinde açık onayla; kurs adına onay S.kurs.sozlesmeOnay'a (kim, zaman, sürüm, SHA-256)
  { id: 'hizmet', baslik: 'mdSinyal hizmet sözleşmesi', kime: ['mudur'], onay: true, surum: 1, hazir: true, kurs: true, belge: 'hizmet', metin: 'Kurs ile mdSinyal arasındaki hizmet sözleşmesi; kurs adına kurs müdürü onaylar.' },
  { id: 'vis', baslik: 'Veri İşleme Sözleşmesi (KVKK)', kime: ['mudur'], onay: true, surum: 1, hazir: true, kurs: true, belge: 'vis', metin: 'Kurs veri sorumlusu, mdSinyal veri işleyendir; kurs adına kurs müdürü onaylar.' },
  { id: 'gizlilik', baslik: 'Personel gizlilik taahhüdü (KVKK)', kime: ['sekreter'], onay: true, surum: 1, hazir: true,
    metin: 'Görevim gereği öğrencilerin, adayların ve personelin kimlik, iletişim, sağlık raporu, ödeme ve sınav bilgilerine erişiyorum.\n\nBu bilgileri yalnız işimi yapmak için kullanacağımı; kurs dışına, sosyal medyaya ya da kişisel mesajlaşma gruplarına aktarmayacağımı; ekran görüntüsü, fotoğraf ya da kopya almayacağımı kabul ederim.\n\nŞifremi kimseyle paylaşmayacağım; bilgisayardan kalkarken oturumu kilitleyeceğim. Bir veri sızıntısı ya da yanlış gönderim fark edersem hemen kurs müdürüne bildireceğim.\n\nBu yükümlülük görevim bittikten sonra da sürer (6698 sayılı KVKK md.12).' },
];
const kimlik = () => { const u = oturum.kullanici || {}; return String(u.uid || u.id || ''); };
export const bilgiler = (hepsi) => { const l = S.bilgilendirmeler || []; return [...HAZIR_BILGI.filter(h => !l.some(x => x.id === h.id)), ...l].filter(x => hepsi || !x.kapali); };
const kayit = (kisi, id) => ((S.onaylar || {})[kisi] || {})[id] || null;
export function bekleyenBilgiler() {
  const u = oturum.kullanici; if (!u || !kimlik()) return [];
  return bilgiler().filter(b => (b.kime || []).includes(u.rol) && !(kayit(kimlik(), b.id) && kayit(kimlik(), b.id).surum === b.surum && kayit(kimlik(), b.id).gosterme));
}
async function bilgiKaydet(b, onay, gosterme, metin) {
  const u = oturum.kullanici || {}, id = kimlik(), simdi = new Date().toISOString(), eski = kayit(id, b.id) || {};
  const onayli = onay || (eski.surum === b.surum && eski.onay);
  S.onaylar = { ...(S.onaylar || {}), [id]: { ...((S.onaylar || {})[id] || {}), [b.id]: { surum: b.surum, gordu: simdi, ...(onayli ? { onay: onay ? simdi : eski.onay } : {}), gosterme: !!gosterme, ad: u.ad || '' } } };
  if (onay && !(eski.surum === b.surum && eski.onay)) islem('Bilgilendirmeyi onayladı', b.baslik + ' · sürüm ' + b.surum);
  if (onay && b.kurs && S.kurs) { const oz = await ozet(metin || b.metin); S.kurs.sozlesmeOnay = { ...(S.kurs.sozlesmeOnay || {}), [b.id]: { kim: u.ad || '', uid: id, eposta: u.eposta || '', zaman: simdi, surum: b.surum, ozet: oz } }; islem('Sözleşmeyi kurs adına e-onayladı', b.baslik + ' · sürüm ' + b.surum + ' · SHA-256 ' + oz.slice(0, 12));
    // YON-069: metin + SHA-256 kopyası e-postayla (onaylayanın hesap e-postası ve kursun onaylı adresleri; adres yoksa sessizce geçilir)
    const mt = String(metin || b.metin); import('./eposta.js?v=235').then(m => m.sozlesmeKopyasi({ id: b.id, baslik: b.baslik, surum: b.surum, metin: mt, ozet: oz, kim: u.ad || '', zaman: simdi }))
      .then(r => { if (r && r.ok && !r.zatenGitti) bildir('Onay kopyası e-postayla gönderildi'); }).catch(() => {}); }
  kaydet();
}
// bekleyen metinleri sırayla gösterir; başka pencere açıksa beklemez, sonraki girişe kalır
export function bilgiGoster(l = bekleyenBilgiler()) {
  if (!l.length || document.querySelector('.perde')) return;
  if (l[0].belge && !l[0]._html) return import('./sayfalar3.js?v=235').then(m => { l[0]._html = m.belgeHtml(l[0].belge); bilgiGoster(l); });
  const b = l[0], k = kayit(kimlik(), b.id), onayli = !!(k && k.surum === b.surum && k.onay);
  pencere({ baslik: b.baslik, genis: true, taslak: false, icerik: `${b.surum > 1 && k && k.surum !== b.surum ? `<p class="ipucu" style="margin-bottom:10px">${isaret('bilgi', 18)}<span>Metin güncellendi; yeniden okuyun.</span></p>` : ''}
      <div class="bilgi-metin ${b._html ? 'a4-onizleme' : ''}">${b._html || e(b.metin).replace(/\n/g, '<br>')}</div>
      ${b.onay ? `<label class="ind-tik" style="margin-top:12px"><input type="checkbox" data-bi-onay ${onayli ? 'checked disabled' : ''}> ${b.kurs ? 'Okudum, kurs adına onaylıyorum' : 'Okudum, onaylıyorum'}${onayli ? ` <small style="color:var(--soluk)">(${new Date(k.onay).toLocaleDateString('tr-TR')})</small>` : ''}</label>` : ''}
      <label class="ind-tik"><input type="checkbox" data-bi-gosterme> Bir daha gösterme</label>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:6px">${l.length > 1 ? `${l.length - 1} metin daha var · ` : ''}Seçiminiz hesabınıza kaydedilir; başka cihazdan girince de geçerlidir.</p>`,
    altlik: `<button class="dg dg-cizgi" data-bi-kapat>Sonra</button><button class="dg dg-ana" data-bi-tamam ${b.onay && !onayli ? 'disabled' : ''}>${b.onay && !onayli ? 'Onayla' : 'Tamam'}</button>`,
    onAc(p) {
      const on = p.querySelector('[data-bi-onay]'), tm = p.querySelector('[data-bi-tamam]'), gs = p.querySelector('[data-bi-gosterme]');
      if (on && !onayli) on.addEventListener('change', () => { tm.disabled = !on.checked; });
      const bitir = async onay => { tm.disabled = true; await bilgiKaydet(b, onay, gs.checked, b._html ? duzMetin(b._html) : b.metin); kapatPencere(); setTimeout(() => bilgiGoster(l.slice(1)), 250); };
      tm.addEventListener('click', () => bitir(!!(on && on.checked && !onayli)));
      p.querySelector('[data-bi-kapat]').addEventListener('click', () => bitir(false));
    } });
}
// müdür: metinler ve kimin onayladığı (Ayarlar › Kullanıcılar)
export function bilgiKarti() {
  const u = oturum.kullanici; if (!u || u.rol !== 'mudur') return '';
  const kisiler = (S.kullanicilar || []).filter(x => x.rol !== 'ortak');
  const durum = (b, x) => { const k = kayit(String(x.uid || x.id || ''), b.id); if (!k || k.surum !== b.surum) return `<span class="rozet rozet-uyari">bekliyor</span>`; return b.onay ? (k.onay ? `<span class="rozet rozet-yesil">onayladı ${new Date(k.onay).toLocaleDateString('tr-TR')}</span>` : `<span class="rozet rozet-uyari">okudu, onaylamadı</span>`) : `<span class="rozet rozet-yesil">okudu</span>`; };
  return `<div class="kart" style="margin-top:16px"><div class="kart-bas"><h3>Bilgilendirme ve onaylar</h3><small>Seçilen role her girişte gösterilir; kişi “Bir daha gösterme” diyene kadar</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-bi-yeni>Metin ekle</button></div></div>
    <ul class="liste">${bilgiler(true).map(b => { const hedef = kisiler.filter(x => (b.kime || []).includes(x.rol)); return `<li style="align-items:flex-start"><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(b.baslik)}</b><small style="display:block;color:var(--soluk)">${(b.kime || []).map(r => ROL_AD[r] || r).join(', ')} · ${b.onay ? 'açık onay ister' : 'yalnız bilgi'} · sürüm ${b.surum}${b.kapali ? ' · <b>gösterilmiyor</b> (Düzenle › Kaydet ile yeniden açılır)' : ''}</small>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${hedef.map(x => `<span style="font-size:13px">${e(x.ad || '')} ${durum(b, x)}</span>`).join('') || '<small style="color:var(--soluk)">Bu rolde kullanıcı yok</small>'}</div>
      ${b.kurs ? (k0 => k0 ? `<small style="display:block;margin-top:6px;color:var(--metin)">Kurs adına e-onay: ${e(k0.kim)} · ${new Date(k0.zaman).toLocaleString('tr-TR')} · sürüm ${k0.surum}${k0.surum !== b.surum ? ' <b style="color:var(--kirmizi)">(eski sürüm)</b>' : ''} · SHA-256 <span class="mono">${e(String(k0.ozet).slice(0, 16))}…</span></small>` : '<small style="display:block;margin-top:6px;color:var(--kirmizi)">Kurs adına henüz e-onaylanmadı</small>')(((S.kurs || {}).sozlesmeOnay || {})[b.id]) : ''}</div>
      ${b.kurs ? `<span class="sag"><button class="dg dg-hafif dg-kucuk" data-bi-oku="${e(b.id)}">Oku</button></span>` : `<span class="sag"><button class="dg dg-hafif dg-kucuk" data-bi-duzen="${e(b.id)}">Düzenle</button></span>`}</li>`; }).join('')}</ul>${(a => a ? `<p style="font-size:13px;color:var(--soluk);padding:0 20px 14px">Hesap açılışındaki onay: ${e(a.kim)} · ${new Date(a.zaman).toLocaleString('tr-TR')} · “${e(String(a.metin).slice(0, 90))}…” · SHA-256 <span class="mono">${e(String(a.ozet).slice(0, 16))}…</span></p>` : '')((S.kurs || {}).acilisOnay)}</div>`;
}
export function bilgiDuzenle(id, sonra) {
  const b = bilgiler(true).find(x => x.id === id) || { id: 'b' + Date.now().toString(36), baslik: '', metin: '', kime: ['sekreter'], onay: true, surum: 0 };
  pencere({ baslik: id ? 'Bilgilendirmeyi düzenle' : 'Yeni bilgilendirme', genis: true, icerik: `<form class="form-izgara" id="f-bi">
      <div class="alan tam"><label for="bi-b">Başlık</label><input id="bi-b" name="b" maxlength="80" required value="${e(b.baslik)}" placeholder="Ör. Kasa kapanış talimatı"></div>
      <div class="alan tam"><label for="bi-m">Metin</label><textarea id="bi-m" name="m" rows="9" maxlength="6000" required>${e(b.metin)}</textarea></div>
      <fieldset class="alan tam"><legend>Kime gösterilsin</legend>${Object.entries(ROL_AD).map(([r, a]) => `<label class="ind-tik"><input type="checkbox" name="kime" value="${r}" ${(b.kime || []).includes(r) ? 'checked' : ''}> ${a}</label>`).join('')}<small style="color:var(--soluk)">Usta öğreticilere gösterim öğretmen uygulamasına ayrıca eklenecek; şimdilik kurs ekranında giren kişilere çıkar.</small></fieldset>
      <label class="ind-tik alan tam"><input type="checkbox" name="onay" ${b.onay ? 'checked' : ''}> Açık onay istensin (“Okudum, onaylıyorum”)</label>
      ${b.surum ? '<p class="alan tam" style="font-size:13px;color:var(--soluk)">Metni değiştirirseniz herkese yeniden sorulur (sürüm artar).</p>' : ''}</form>`,
    altlik: `${id && !b.hazir ? '<button class="dg dg-hafif" data-bi-sil style="margin-right:auto;color:var(--kirmizi)">Kaldır</button>' : id && b.hazir ? '<button class="dg dg-hafif" data-bi-sil style="margin-right:auto">Gösterme</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-bi-kaydet>Kaydet</button>`,
    onAc(p) {
      const f = p.querySelector('#f-bi'), l = () => [...(S.bilgilendirmeler || [])];
      p.querySelector('[data-bi-kaydet]').addEventListener('click', () => {
        const baslik = f.b.value.trim(), metin = f.m.value.trim(), kime = [...f.querySelectorAll('[name=kime]:checked')].map(x => x.value);
        if (!baslik || !metin) return f.reportValidity(); if (!kime.length) return alert('En az bir rol seçin');
        const degisti = !b.surum || metin !== b.metin || baslik !== b.baslik || !!f.onay.checked !== !!b.onay;
        const y = { id: b.id, baslik, metin, kime, onay: !!f.onay.checked, surum: degisti ? (b.surum || 0) + 1 : b.surum, ...(b.hazir ? { hazir: true } : {}) };
        S.bilgilendirmeler = [...l().filter(x => x.id !== b.id), y]; islem(id ? 'Bilgilendirmeyi değiştirdi' : 'Bilgilendirme ekledi', baslik + ' · sürüm ' + y.surum); kaydet(); kapatPencere(); sonra && sonra();
      });
      const sil = p.querySelector('[data-bi-sil]'); if (sil) sil.addEventListener('click', () => { S.bilgilendirmeler = [...l().filter(x => x.id !== b.id), ...(b.hazir ? [{ ...b, kapali: true }] : [])]; islem('Bilgilendirmeyi kaldırdı', b.baslik); kaydet(); kapatPencere(); sonra && sonra(); });
    } });
}
