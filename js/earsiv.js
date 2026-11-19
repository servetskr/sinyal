// PAR-011: e-Arşiv entegratör bağlantısı (Ayarlar › Entegrasyon › e-Arşiv kartı) ve fatura işlemleri için istemci.
// Entegratör hesabı (API anahtarı ya da kullanıcı adı/şifre) yalnız bir kez sunucuya (api.mdsinyal.com/earsiv/hesap) gider; orada şifreli
// saklanır, tarayıcıya ve kurs verisine (Firestore) yazılmaz. Kurs verisinde yalnız hangi entegratörün seçildiği durur (S.entegrasyon.earsiv.entegrator).
// Deneme kipi: entegratöre hiç istek gitmez; numara, durum, iptal ve PDF sunucuda benzetilir.
// Fatura kesme ekranı için (sayfalar2): earsivFaturaKes, earsivIptal (neden: EARSIV_IPTAL_NEDEN anahtarı), earsivSorgu, earsivPdf.
// S.entegrasyon.earsiv.bagli bu modülde değişmez: fatura kesme gerçekten bu uçlara bağlandığında o ekran açar.
import { S, kaydet, islem, oturum, bulutKanca } from './veri.js?v=235';
import { e, bildir, rozet, onaySor } from './ui.js?v=235';
import { WORKER, bulutta } from './bulut.js?v=235';

export const EARSIV_IPTAL_NEDEN = { alici_ad: 'Alıcı adı / unvanı hatalı', alici_vkn: 'Alıcı VKN / T.C. kimlik no hatalı' };
async function istek(yol, govde) {
  if (!bulutta() || !bulutKanca.yetki) throw new Error('e-Arşiv bağlantısı kurs hesabıyla girildiğinde çalışır');
  const r = await fetch(WORKER + '/' + yol, govde === undefined ? { headers: await bulutKanca.yetki() } : { method: 'POST', headers: { ...(await bulutKanca.yetki()), 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
  if ((r.headers.get('Content-Type') || '').includes('application/pdf')) return r.blob();
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) throw Object.assign(new Error(j.hata || 'e-Arşiv servisine ulaşılamadı'), { durum: r.status, cevap: j });
  return j;
}
export const earsivDurumu = () => istek('earsiv');
// fatura: { uuid?, no?, seri?, tarih, saat?, not?, alici: { ad, soyad?, vkn|tckn, il, ilce, adres?, eposta?, tel? }, satirlar: [{ ad, miktar, birimFiyat (KDV hariç), kdv }], satici: { vkn, unvan, vergiDairesi?, il?, ilce?, adres? } }
// dönüş: { uuid, no, durum: 'bekliyor'|'tamam', deneme, matrah, kdv, toplam }
export const earsivFaturaKes = fatura => istek('earsiv/fatura', { fatura });
export const earsivIptal = (uuid, neden) => { if (!EARSIV_IPTAL_NEDEN[neden]) return Promise.reject(new Error('e-Arşiv fatura yalnız alıcı adı ya da VKN/TCKN hatasıyla iptal edilir')); return istek('earsiv/iptal', { uuid, neden }); };
export const earsivSorgu = uuid => istek('earsiv/durum', { uuid });
export const earsivPdf = uuid => istek('earsiv/pdf', { uuid });   // Blob

// ---- Ayarlar kartı ----
const durum = { veri: null, hata: '', secim: null, mesgul: false };
const mudur = () => !!(oturum.kullanici && oturum.kullanici.rol === 'mudur' && !oturum.kullanici.gorev);
const kok = () => document.querySelector('[data-earsiv-baglanti]');
const zaman = t => { try { return new Date(t).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }); } catch (x) { return ''; } };
function ciz() {
  const k = kok(); if (!k) return;
  if (!bulutta()) { k.innerHTML = `<b style="color:var(--murekkep)">Entegratör bağlantısı</b><p style="font-size:13.5px;color:var(--soluk);margin-top:4px">Kurs hesabıyla girildiğinde buradan e-Arşiv entegratörünüzü (Nilvera, Uyumsoft, İzibiz) bağlarsınız.</p>`; return; }
  if (!durum.veri) { k.innerHTML = durum.hata ? `<p class="ipucu uyari" style="font-size:13.5px">${e(durum.hata)} <button class="dg dg-cizgi dg-kucuk" data-ea-yenile>Tekrar dene</button></p>` : '<small style="color:var(--soluk)">Entegratör bilgisi yükleniyor…</small>'; return; }
  const v = durum.veri, h = v.hesap, l = v.entegratorler, sec = durum.secim || (h && h.entegrator) || (l[0] && l[0].id), E = l.find(x => x.id === sec) || l[0], yaz = mudur();
  const ayni = h && h.entegrator === E.id;
  const ozetSatir = h ? `${rozet(h.ad, h.deneme ? 'mavi' : 'yesil')} ${h.deneme ? rozet('Deneme kipi', 'notr') : ''} ${h.test && !h.deneme ? rozet('Entegratörün test ortamı', 'notr') : ''}${h.son ? ` <small style="color:var(--soluk)">Son deneme ${zaman(h.son.zaman)}: ${h.son.ok ? 'başarılı' : 'başarısız'}${h.son.ileti ? ' · ' + e(h.son.ileti) : ''}</small>` : ''}` : rozet('Entegratör seçilmedi', 'notr');
  k.innerHTML = `<div style="display:grid;gap:10px">
    <div><b style="color:var(--murekkep)">Entegratör bağlantısı</b><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">${ozetSatir}</div></div>
    ${!v.sunucuAnahtari ? `<p class="ipucu uyari" style="font-size:13px">Sunucuda şifreleme anahtarı henüz tanımlı değil; gerçek entegratör hesabı kaydedilemez. Deneme kipi çalışır.</p>` : ''}
    ${yaz ? `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
      <div class="alan" style="width:230px;max-width:100%"><label for="ea-ent">Entegratör</label><select id="ea-ent" class="girdi" data-ea-ent>${l.map(x => `<option value="${e(x.id)}" ${x.id === E.id ? 'selected' : ''}>${e(x.ad)}${x.hazir ? '' : ' (hazırlanıyor)'}</option>`).join('')}</select></div>
      ${E.alanlar.map(a => `<div class="alan" style="width:230px;max-width:100%"><label for="ea-${e(a.ad)}">${e(a.etiket)}</label><input id="ea-${e(a.ad)}" class="girdi" data-ea-alan="${e(a.ad)}" type="${a.gizli ? 'password' : 'text'}" autocomplete="off" spellcheck="false" placeholder="${ayni && h.ozet[a.ad] ? e('Kayıtlı: ' + h.ozet[a.ad] + ' (değiştirmek için yazın)') : ''}"></div>`).join('')}
    </div>
    ${E.not ? `<small style="color:var(--soluk)">${e(E.not)}</small>` : ''}
    <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px"><input type="checkbox" data-ea-deneme ${!h || h.deneme || !E.hazir ? 'checked' : ''} ${E.hazir ? '' : 'disabled'}><span><b>Deneme kipi</b><small style="display:block;color:var(--soluk)">Entegratöre hiç istek gitmez; numara, durum, iptal ve PDF sunucuda benzetilir. Resmî fatura kesilmez.</small></span></label>
    <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px"><input type="checkbox" data-ea-test ${h && h.test ? 'checked' : ''}><span>Entegratörün test ortamını kullan<small style="display:block;color:var(--soluk)">Entegratör size test hesabı verdiyse canlıya geçmeden önce açın.</small></span></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="dg dg-ana" data-ea-kaydet ${durum.mesgul ? 'disabled' : ''}>Kaydet</button><button class="dg dg-cizgi" data-ea-dene ${!h || durum.mesgul ? 'disabled' : ''}>Bağlantıyı dene</button>${h ? `<button class="dg dg-cizgi" data-ea-kaldir ${durum.mesgul ? 'disabled' : ''}>Bağlantıyı kaldır</button>` : ''}</div>
    <small style="color:var(--soluk)">API anahtarı ve şifre mdSinyal sunucusunda şifreli saklanır; bu cihaza, kurs verisine ve size geri gösterilmez.</small>
    ${(v.gunluk || []).length ? `<details><summary style="cursor:pointer;font-size:13.5px">Son e-Arşiv işlemleri</summary><ul style="font-size:13px;margin:6px 0 0 18px">${v.gunluk.slice(0, 10).map(x => `<li>${zaman(x.zaman)} · ${e(x.islem)}${x.no ? ' · ' + e(x.no) : ''}${x.deneme ? ' (deneme)' : ''} · ${x.ok ? 'tamam' : 'hata: ' + e(x.hata || '')}</li>`).join('')}</ul></details>` : ''}`
    : '<small style="color:var(--soluk)">Entegratörü kurs müdürü bağlar.</small>'}
  </div>`;
}
async function yukle() { durum.hata = ''; try { durum.veri = await earsivDurumu(); } catch (x) { durum.hata = x.message; } ciz(); }
// Ayarlar sayfası kartın yerini koyar; içerik sayfa çizildikten sonra dolar
export function earsivKart() { setTimeout(() => { if (durum.veri) ciz(); else yukle(); }, 0); return '<div data-earsiv-baglanti style="margin-top:14px;padding-top:12px;border-top:1px solid var(--cizgi, #e3e7ee)"></div>'; }
function entegrasyonYaz(h) {
  S.entegrasyon = S.entegrasyon || {}; S.entegrasyon.earsiv = S.entegrasyon.earsiv || {};
  if (h) S.entegrasyon.earsiv.entegrator = { id: h.entegrator, ad: h.ad, deneme: !!h.deneme, test: !!h.test }; else delete S.entegrasyon.earsiv.entegrator;
  kaydet();
}
async function kaydetTikla(k) {
  const id = k.querySelector('[data-ea-ent]').value, kimlik = {};
  k.querySelectorAll('[data-ea-alan]').forEach(i => { if (i.value.trim()) kimlik[i.dataset.eaAlan] = i.value.trim(); });
  durum.mesgul = true; ciz();
  try {
    const j = await istek('earsiv/hesap', { entegrator: id, deneme: !!(k.querySelector('[data-ea-deneme]') || {}).checked, test: !!(k.querySelector('[data-ea-test]') || {}).checked, kimlik });
    durum.veri.hesap = j.hesap; durum.secim = null; entegrasyonYaz(j.hesap);
    islem('e-Arşiv entegratörünü kaydetti', j.hesap.ad + (j.hesap.deneme ? ' (deneme kipi)' : ''));
    bildir(j.hesap.deneme ? 'Kaydedildi · deneme kipi açık' : 'Entegratör hesabı kaydedildi; “Bağlantıyı dene” ile doğrulayın');
  } catch (x) { bildir(x.message, 'uyari'); }
  durum.mesgul = false; ciz();
}
async function deneTikla() {
  durum.mesgul = true; ciz();
  try { const j = await istek('earsiv/dene', {}); durum.veri.hesap = j.hesap; bildir(j.ileti || 'Bağlantı çalışıyor'); }
  catch (x) { if (x.cevap && x.cevap.hesap) durum.veri.hesap = x.cevap.hesap; bildir('Bağlantı denemesi başarısız: ' + x.message, 'uyari'); }
  durum.mesgul = false; yukle();
}
async function kaldirTikla() {
  if (!(await onaySor('Kayıtlı API anahtarı ya da şifre sunucudan silinir. Kesilmiş faturalar etkilenmez.', { baslik: 'e-Arşiv bağlantısı kaldırılsın mı?', evet: 'Kaldır', tehlike: true }))) return;
  durum.mesgul = true; ciz();
  try { await istek('earsiv/hesap', { sil: true }); durum.veri.hesap = null; entegrasyonYaz(null); islem('e-Arşiv bağlantısını kaldırdı'); bildir('e-Arşiv bağlantısı kaldırıldı'); }
  catch (x) { bildir(x.message, 'uyari'); }
  durum.mesgul = false; ciz();
}
// tek dinleyici: kart her çizildiğinde yeniden bağlanmaz
if (typeof document !== 'undefined' && !window.__earsivDinleyici) {
  window.__earsivDinleyici = true;
  document.addEventListener('click', ev => {
    const k = ev.target.closest && ev.target.closest('[data-earsiv-baglanti]'); if (!k || durum.mesgul) return;
    if (ev.target.closest('[data-ea-kaydet]')) kaydetTikla(k);
    else if (ev.target.closest('[data-ea-dene]')) deneTikla();
    else if (ev.target.closest('[data-ea-kaldir]')) kaldirTikla();
    else if (ev.target.closest('[data-ea-yenile]')) yukle();
  });
  document.addEventListener('change', ev => { if (ev.target.matches && ev.target.matches('[data-ea-ent]')) { durum.secim = ev.target.value; ciz(); } });
}
