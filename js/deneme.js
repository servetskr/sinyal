// Deneme direksiyon sınavı: öğretmen telefonda MEB değerlendirme formunun (EK-4 otomobil / EK-3 motosiklet) maddelerini işaretler.
// Formdaki kurallar uygulanır: 5 mavi madde, toplam 2 sarı ihlal ya da 1 kırmızı ihlal → sınav biter, başarısız.
import { S, kaydet, gun, SINIFLAR, tamAd, egitmen, arac, islem, motorSinif, ek3Sinif, oturum } from './veri.js?v=102';
import { e, pencere, kapatPencere, bildir, belgeYazdir } from './ui.js?v=102';
import { EK3, EK4 } from './formlar.js?v=102';

const RENK = { m: 'Mavi', s: 'Sarı', k: 'Kırmızı' };
const maddeler = sinif => (ek3Sinif(sinif) ? EK3 : EK4).flatMap(([b, bas, l], bi) => l.map(([sira, metin, renk], mi) => ({ id: bi + '.' + mi, bol: b, bas, sira, metin, renk })));
export function sonucHesap(isaret, sinif) {
  const l = maddeler(sinif), say = { m: 0, s: 0, k: 0 }, neden = [];
  l.forEach(x => { const n = isaret[x.id] || 0; if (!n) return; say[x.renk] += x.renk === 's' ? n : 1; });
  if (say.k) neden.push(say.k + ' kırmızı madde');
  if (say.s >= 2) neden.push(say.s + ' sarı ihlal');
  if (say.m >= 5) neden.push(say.m + ' mavi madde');
  return { say, bitti: neden.length > 0, neden: neden.join(', ') };
}
export function denemeAc(k, yenile) {
  const l = maddeler(k.sinif), ar = (() => { const d = S.dersler.filter(x => x.kursiyer === k.id && x.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return arac(d && d.arac) || S.araclar.find(a => a.egitmen === k.egitmen && a.sinif === k.sinif); })();
  const isaret = {}; let bolum = '';
  const satirlar = l.map(x => {
    const ust = x.bol + x.bas !== bolum ? `<li class="dn-bas">${x.bol === 'I' ? 'I. Bölüm · Araç bilgisi sorgulama' : (x.bol === 'II' ? 'II. Bölüm · ' : 'III. Bölüm · ') + e(x.bas.replace(/^\d+\.\s*/, ''))}</li>` : ''; bolum = x.bol + x.bas;
    return ust + `<li class="dn-m" data-m="${x.id}" data-r="${x.renk}"><span class="dn-renk dn-${x.renk}">${x.renk === 's' ? '<i></i><i></i>' : ''}</span><span class="dn-metin"><b>${e(x.sira)})</b> ${e(x.metin)}</span></li>`;
  }).join('');
  pencere({
    baslik: 'Deneme direksiyon sınavı · ' + tamAd(k), genis: true,
    icerik: `<p style="font-size:13.5px;color:var(--soluk);margin-bottom:8px">${e(SINIFLAR[k.sinif] ? SINIFLAR[k.sinif].ad : k.sinif)}${ar ? ' · ' + e(ar.plaka) : ''} · ${motorSinif(k.sinif) ? 'EK-3' : 'EK-4'} maddeleri. Hatalı davranışa dokunun; sarı maddeye ikinci kez dokunmak ikinci ihlali işaretler, üçüncüsü siler.</p>
      <div class="dn-durum" data-durum></div>
      <ul class="dn-liste">${satirlar}</ul>
      <label class="alan" style="margin-top:12px;display:block"><span class="et">Öğretmenin notu</span><input class="girdi" data-not placeholder="Örn. geri parkta direksiyonu geç kırıyor"></label>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-bitir>Sınavı bitir ve kaydet</button>`,
    onAc(d) {
      const durum = () => { const r = sonucHesap(isaret, k.sinif); d.querySelector('[data-durum]').innerHTML = `<span class="dn-sayac dn-m">Mavi ${r.say.m}/5</span><span class="dn-sayac dn-s">Sarı ${r.say.s}/2</span><span class="dn-sayac dn-k">Kırmızı ${r.say.k}/1</span><b class="${r.bitti ? 'dn-kaldi' : 'dn-devam'}">${r.bitti ? 'Gerçek sınavda burada biterdi: BAŞARISIZ (' + r.neden + ')' : 'Devam ediyor · şu an başarılı'}</b>`; };
      d.querySelector('.dn-liste').addEventListener('click', ev => {
        const li = ev.target.closest('[data-m]'); if (!li) return;
        const id = li.dataset.m, sari = li.dataset.r === 's', n = ((isaret[id] || 0) + 1) % (sari ? 3 : 2);
        if (n) isaret[id] = n; else delete isaret[id];
        li.dataset.n = n || ''; li.classList.toggle('secili', !!n); durum();
      });
      durum();
      d.querySelector('[data-bitir]').addEventListener('click', () => {
        const r = sonucHesap(isaret, k.sinif), hatalar = l.filter(x => isaret[x.id]).map(x => ({ id: x.id, sira: x.sira, metin: x.metin, renk: x.renk, n: isaret[x.id], bas: x.bas }));
        const kayit = { id: 'dd' + Date.now(), tarih: gun(0), egitmen: k.egitmen, kim: oturum.kullanici ? oturum.kullanici.ad : '', arac: ar ? ar.id : null, sonuc: r.bitti ? 'Kaldı' : 'Geçti', neden: r.neden, say: r.say, isaret: { ...isaret }, hatalar, not: d.querySelector('[data-not]').value.trim().slice(0, 300) };
        k.dDeneme = [...(k.dDeneme || []), kayit].slice(-10);
        islem('Deneme direksiyon sınavı yaptı', tamAd(k) + ' · ' + kayit.sonuc + (r.neden ? ' (' + r.neden + ')' : ''));
        kaydet(); kapatPencere(); bildir(`${tamAd(k)} deneme sınavı: ${kayit.sonuc === 'Geçti' ? 'geçerdi' : 'kalırdı'}${r.neden ? ' · ' + r.neden : ''}`, kayit.sonuc === 'Geçti' ? '' : 'uyari'); if (yenile) yenile();
      });
    },
  });
}
// Kayıtlı denemenin işaretli EK-3/EK-4 çıktısı
export async function denemeYazdir(k, kayit) {
  const R = await import('./resmi.js?v=102');
  const html = R.resmiHtml('ek34', k, false, kayit.isaret);
  belgeYazdir(html, 'Deneme direksiyon sınavı · ' + tamAd(k) + ' · ' + kayit.tarih);
}
export const sonDeneme = k => (k.dDeneme || []).slice(-1)[0] || null;
export const denemeOzet = x => `${x.tarih.split('-').reverse().join('.')} · ${x.sonuc === 'Geçti' ? 'geçerdi' : 'kalırdı'}${x.neden ? ' (' + x.neden + ')' : ''}${x.hatalar && x.hatalar.length ? ' · ' + x.hatalar.length + ' hata' : ''}`;
export const egitmenAd = id => (egitmen(id) || {}).ad || '';
