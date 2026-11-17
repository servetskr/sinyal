// MEBBİS güvencesi (mdSinyal tarafı): kurum bilgilendirmesi ve kabulü, her "MEBBİS'e yaz" için iş onayı penceresi,
// kayıt başına işlem kaydı (kim, ne zaman, hangi kayıt, hangi ekran, sonuç, MEBBİS mesajı), ekranda kalan iz,
// ~30 dakikalık parçalara bölme ve süre tahmini, Yardımcı'nın "MEBBİS ekranı değişti" bildirimi, her iş türü için elle giriş.
// İşlem kaydı mevcut islem() ile sunucudaki yalnız eklenebilir kayda (kurslar/{k}/kayit) gider; TC ve değerlerin açık hâli yazılmaz.
// Yardımcı'dan gelen iletilerin alanları: js/eklenti.js başındaki ileti sözleşmesi tablosu (ekranDegisti, mebKurum, kurum, olcum, veri.denetim, harita-durum).
import { S, kaydet, islem, oturum, tamAd, kursiyer, tcMaskele, seciliSube, cokSube, kuralAyar } from './veri.js?v=219';
import { pencere, kapatPencere, bildir, e, ik, isaret, rozet } from './ui.js?v=219';
import * as GR from './gruplar.js?v=219';

/* ---------- sabitler ---------- */
export const MEB_KABUL_SURUM = 'mk-2026-11-1';   // metin değişince artırılır; kurs yeniden onaylar
export const SIRA = ['grup', 'kayit', 'evrak', 'onay', 'teorik', 'program', 'esinav', 'randevu', 'fatura'];
export const TUR_AD = { grup: 'Dönem grubu', kayit: 'Kayıt', evrak: 'Evrak', onay: 'Kurum onayı', teorik: 'Teorik program', program: 'Direksiyon programı', esinav: 'e-Sınav başvurusu', randevu: 'Sınav randevusu', sinav: 'Sınav randevusu', fatura: 'Fatura' };
const MEB = 'https://mebbis.meb.gov.tr/SKT/';
// MEBBİS ekranları (motor.js'teki yollarla aynı)
export const EKRAN = {
  grup: [['SKT03001', 'Grup açma', MEB + 'skt03001.aspx'], ['SKT03002', 'Şube tanımlama', MEB + 'skt03002.aspx']],
  kayit: [['SKT02001', 'Aday dönem kaydı', MEB + 'skt02001.aspx'], ['SKT02002', 'Fotoğraf', MEB + 'skt02002.aspx'], ['SKT02011', 'Sözleşme tarihi', MEB + 'skt02011.aspx']],
  evrak: [['SKT02003', 'Öğrenim belgesi', MEB + 'skt02003.aspx'], ['SKT02004', 'Sağlık raporu', MEB + 'skt02004.aspx'], ['SKT02005', 'Adli sicil', MEB + 'skt02005.aspx'], ['SKT02010', 'Parmak izi', MEB + 'SKT02010.aspx']],
  onay: [['SKT02006', 'Kurum onayı', MEB + 'skt02006.aspx']],
  teorik: [['SKT03003', 'Teorik ders programı', MEB + 'skt03003.aspx']],
  program: [['SKT03004', 'Direksiyon eğitim programı', MEB + 'skt03004.aspx']],
  esinav: [['SKT02007', 'e-Sınav başvurusu', MEB + 'skt02007.aspx']],
  randevu: [['SKT01005', 'Uygulama sınavı randevusu', MEB + 'skt01005.aspx']],
  fatura: [['SKT02013', 'Fatura', MEB + 'skt02013.aspx']],
};
export const ekranAdi = tur => (EKRAN[tur] || []).map(x => x[0]).join(', ');
const ROL_AD = { mudur: 'Kurs müdürü', sekreter: 'Ön büro', usta: 'Usta öğretici', ortak: 'Ortak' };
export const rolAdi = r => ROL_AD[r] || r || '';
const DOGRULAMA_AD = { liste: 'MEBBİS listesinden doğrulandı', alan: 'MEBBİS ekranından okundu', dosya: 'aday dosyasından doğrulandı', zaten: 'MEBBİS’te zaten vardı', mesaj: 'yalnız MEBBİS mesajı görüldü', kullanici: 'elle girildi', yok: 'doğrulanamadı' };
export const dogrulamaAdi = d => DOGRULAMA_AD[d] || '';

// 11 haneli sayılar (TC) ve 10 haneli cep numaraları kayda açık yazılmaz
export const maskele = s => String(s || '').replace(/\b\d{11}\b/g, m => tcMaskele(m)).replace(/\b5\d{9}\b/g, '5*********');
const kisalt = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const saatMetni = z => { const d = new Date(z); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${d.toTimeString().slice(0, 5)}`; };
export const zamanMetni = saatMetni;
const adaySayisi = l => l.reduce((a, x) => a + (x.adaylar ? x.adaylar.length : 1), 0);
export const isKimlikleri = x => x.adaylar ? x.adaylar.map(a => a.id) : [x.id];

/* ---------- kim onaylayabilir ---------- */
// Müdür ve ön büro onaylayabilir; onaylayanın rolü kayda yazılır (yalnız müdür mü sorusu açık: Eyüp Bey'e soruldu)
export function onaylayabilir() { const u = oturum.kullanici; return !!u && ['mudur', 'sekreter'].includes(u.rol); }
export function kim() { const u = oturum.kullanici || {}; return { ad: u.ad || 'Bilinmiyor', rol: u.rol || '', rolAd: rolAdi(u.rol), uid: u.uid || u.id || '' }; }
function kurum() {
  const s = seciliSube() || (!cokSube() && (S.subeler || [])[0]) || {};
  return { kurs: S.kurs.ad || '', sube: cokSube() ? s.ad || '' : '', kod: s.kurumKodu || '', mudur: s.mudur || S.kurs.yetkili || '', hesap: s.mebbis || '' };
}
// seçili şubenin kurum kodu: çekme ve ekran denetiminde de Yardımcı açık MEBBİS hesabını bununla karşılaştırır
export const kurumBilgi = kurum;

/* ---------- (a) katman 1: kurum bilgilendirmesi ve kabulü (kurs başına bir kez, metin sürümü değişince yeniden) ---------- */
export const kabulVar = () => { const k = S.kurs.mebKabul; return !!(k && k.karar === 'kabul' && k.surum === MEB_KABUL_SURUM); };
export const elleSecildi = () => { const k = S.kurs.mebKabul; return !!(k && k.karar === 'elle'); };
const MADDELER = [
  'Yardımcı yalnız bu bilgisayarda, kurs yetkilisinin kendi açtığı MEBBİS oturumunda çalışır. MEBBİS şifresini istemez, görmez, saklamaz.',
  'Kayıtları kurs yetkilisi mdSinyal’de kontrol eder ve “MEBBİS’e yaz” ile bir kez onaylar. Onay penceresi neyin, kimin adına yazılacağını gösterir.',
  'Yardımcı onaylanan kayıtları sırayla ilgili MEBBİS formlarına yazar, kaydeder ve MEBBİS’ten okuyarak doğrular.',
  'Güvenlik kodunu her zaman yetkili girer. Silme ve geri alınamaz işlemler otomatik yapılmaz; kurum onayı ayrı sekmeden ayrıca verilir.',
  'İstekler insan hızında, yaklaşık 1 saniye arayla gider. Yetkili istediği an durdurabilir.',
  'Onaylayanın adı, rolü ve zamanı; her kaydın sonucu ve MEBBİS’in verdiği mesaj mdSinyal’in silinemeyen işlem kaydına yazılır.',
  'MEBBİS’e girilen bilgilerin doğruluğu, resmî süreler ve son karar kursun sorumluluğundadır.',
];
export function kabulPenceresi(sonra, elleSonra) {
  if (!onaylayabilir()) return bildir('MEBBİS Yardımcısı kullanım onayını kurs müdürü ya da ön büro verir', 'uyari');
  const k = kim();
  pencere({
    baslik: 'MEBBİS Yardımcısı nasıl çalışır, sorumluluk kimde', genis: true,
    icerik: `<ul class="liste" style="margin:0 0 12px">${MADDELER.map(m => `<li style="align-items:flex-start">${isaret('bilgi', 20)}<span style="font-size:14px;color:var(--metin)">${e(m)}</span></li>`).join('')}</ul>
      <p class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 18)}<span>MEB Bilgi İşlem Genel Müdürlüğü’nün 29.06.2026 tarihli yazısı, Bakanlık sistemlerinde yetkisiz üçüncü taraf yazılım ve tarayıcı eklentisi kullanılmamasını istiyor ve erişimlerin kaydedildiğini bildiriyor. Yardımcı’yı kullanma kararı kurumunuza aittir. Yardımcı’yı kullanmadan da her işi “Elle gir” ile yapabilirsiniz. <a href="https://tokat.meb.gov.tr/meb_iys_dosyalar/2026_07/6a4f7d21eca7c750614742_Kisisel_verilerin_korrunmasi_kapsaminde_alinacak_tedbirler_29_06_26.pdf" target="_blank" rel="noopener" style="color:inherit;font-weight:700">Yazıyı açın</a></span></p>
      <div style="display:grid;gap:4px;font-size:14px;margin-bottom:10px"><span><b style="color:var(--murekkep)">Onaylayan:</b> ${e(k.ad)} · ${e(k.rolAd)}</span><span><b style="color:var(--murekkep)">Kurum:</b> ${e(S.kurs.ad || '')}</span></div>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:14.5px;cursor:pointer"><input type="checkbox" data-mk-oku style="margin-top:3px;width:18px;height:18px"><span>Okudum; kurumumuz adına Yardımcı’nın bu şekilde kullanılmasını kabul ediyorum.</span></label>
      <small style="display:block;color:var(--soluk);margin-top:8px">Metin sürümü ${MEB_KABUL_SURUM}. Adınız, rolünüz ve zaman işlem kaydına yazılır.</small>`,
    altlik: `<button class="dg dg-cizgi" data-mk-elle>Yardımcı’yı kullanmayacağım, elle gireceğim</button><button class="dg dg-ana" data-mk-kabul disabled>${ik('ok')}Kabul et</button>`,
    onAc(d) {
      const b = d.querySelector('[data-mk-kabul]');
      d.querySelector('[data-mk-oku]').addEventListener('change', ev => { b.disabled = !ev.target.checked; });
      b.addEventListener('click', () => {
        S.kurs.mebKabul = { karar: 'kabul', surum: MEB_KABUL_SURUM, kim: k.ad, uid: k.uid, rol: k.rol, zaman: new Date().toISOString() };
        islem('MEBBİS Yardımcısı kullanım onayı', `${MEB_KABUL_SURUM} · ${k.ad} (${k.rolAd})`); kaydet(); kapatPencere(); bildir('Onay kaydedildi');
        if (sonra) sonra();
      });
      d.querySelector('[data-mk-elle]').addEventListener('click', () => {
        S.kurs.mebKabul = { karar: 'elle', surum: MEB_KABUL_SURUM, kim: k.ad, uid: k.uid, rol: k.rol, zaman: new Date().toISOString() };
        S.kurs.mebYontem = 'sirali';   // mevcut ayar: Ayarlar › MEB kuralları ve özet kartı "Sıralı giriş" gösterir
        islem('MEBBİS Yardımcısı kullanılmayacak', `${MEB_KABUL_SURUM} · ${k.ad} (${k.rolAd}) · elle giriş seçildi`); kaydet(); kapatPencere();
        bildir('Elle giriş seçildi. İşlerin yanındaki “Elle gir” düğmesi değerleri MEBBİS sırasıyla kopyalatır.');
        if (elleSonra) elleSonra();
      });
    },
  });
}
// Kabul yoksa (ya da metin sürümü eskiyse) pencereyi açar ve false döner; kabul gelince sonra() çağrılır
// elleSonra: kurum "Yardımcı'yı kullanmayacağım" derse çağrılır (ör. aynı işler elle giriş penceresinde açılır)
export function kabulDenetle(sonra, elleSonra) { if (kabulVar()) return true; kabulPenceresi(sonra, elleSonra); return false; }

/* ---------- (g) süre tahmini ve ~30 dakikalık parçalar ---------- */
// İstek sayıları motor.js'ten çıkarıldı (istek başına ~1,1 sn bekleme + MEBBİS yanıtı); gerçek süre ölçülmedi.
// Yardımcı kayıt başına süre (sure, ms) bildirirse S.mebOlcum[tur] kayan ortalaması kullanılır.
const ISTEK_SN = 1.9;
const ISTEK = { grup: () => 8, kayit: x => 35 + (x.evrak ? 20 : 0), evrak: () => 20, onay: () => 4, teorik: x => 7.5 * Math.max(1, (x.saatler || []).length), program: () => 9, esinav: () => 6, randevu: x => 4 + (x.adaylar || []).length * 0.5, fatura: () => 4 };
export function isSn(x) {
  const o = (S.mebOlcum || {})[x.tur];
  if (o && o.n >= 3 && o.ortMs > 0) return (o.ortMs / 1000) * (x.adaylar ? Math.max(1, x.adaylar.length / 4) : 1);
  return (ISTEK[x.tur] ? ISTEK[x.tur](x) : 6) * ISTEK_SN;
}
export const parcaDk = () => Math.max(10, +S.kurs.mebParcaDk || 30);
// Sıra korunur (grup → kayıt → evrak → onay → ders → sınav → fatura); parçalar sırayla yürür, bağımlılık bozulmaz
export function parcala(l) {
  const butce = parcaDk() * 60, p = []; let cur = [], t = 0;
  l.forEach(x => { const s = isSn(x); if (cur.length && t + s > butce) { p.push(cur); cur = []; t = 0; } cur.push(x); t += s; });
  if (cur.length) p.push(cur);
  return p;
}
export const tahminDk = l => Math.max(1, Math.round(l.reduce((a, x) => a + isSn(x), 0) / 60));
export function olcumIsle(x) {
  if (!x || !(x.sure > 0) || !x.tur) return;
  const o = (S.mebOlcum = S.mebOlcum || {})[x.tur] || { n: 0, ortMs: 0 };
  o.ortMs = o.n ? Math.round(o.ortMs * 0.8 + x.sure * 0.2) : x.sure; o.n = Math.min(o.n + 1, 999);
  if (x.kod != null) o.kodOrani = Math.round(((o.kodOrani || 0) * 0.8 + (x.kod ? 1 : 0) * 0.2) * 100) / 100;
  S.mebOlcum[x.tur] = o;
}

/* ---------- yük özeti: sonradan "o gün şu değer mi gitti" sorusu için (değerler kayda yazılmaz) ---------- */
export async function yukOzeti(v) {
  const m = JSON.stringify(v);
  try { if (crypto && crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m)); return [...new Uint8Array(h)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''); } } catch (x) { }
  let h = 2166136261; for (let i = 0; i < m.length; i++) { h ^= m.charCodeAt(i); h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16);
}

/* ---------- (a) katman 2: iş onayı penceresi (her "MEBBİS'e yaz" basışında) ---------- */
const deger = (k, v) => v ? `<span style="white-space:nowrap"><small style="color:var(--soluk)">${e(k)}</small> <b class="mono" style="color:var(--murekkep)">${e(v)}</b></span>` : '';
// randevu ve kurum onayında aday sayısı: onay penceresi bırakılan adaylar çıkınca günceller (data-mk-aday)
const adayDeger = x => `<span style="white-space:nowrap"><small style="color:var(--soluk)">Aday</small> <b class="mono" style="color:var(--murekkep)" data-mk-aday="${e(x.id)}">${x.adaylar.length} kişi</b></span>`;
const personelMetni = x => x.izinNo ? `İzin No:${x.izinNo}${x.personelAd ? ' ' + x.personelAd : ''}` : (x.personelAd || '');
function gidecekler(x) {
  const tc = x.tc ? tcMaskele(x.tc) : '';
  if (x.tur === 'program') return [deger('TC', tc), deger('Tarih', x.tarih + ' ' + x.saat), deger('Yer', x.yer), deger(x.plaka ? 'Araç' : 'Simülatör', x.plaka || x.simulator), deger('Personel', personelMetni(x)), deger('Eğitim', x.egitimTuru)];
  if (x.tur === 'teorik') return [deger('Tarih', x.tarih), deger('Saat', (x.saatler || []).join(', ')), deger('Ders', x.dersTuru), deger('Derslik', x.derslik), deger('Personel', personelMetni(x))];
  if (x.tur === 'kayit') return [deger('TC', tc), deger('Dönem', GR.donemAdi(x.donem) + ` · Grup ${x.grupNo}`), deger('İstenen', x.istenen), deger('Mevcut', x.mevcut), deger('Cep', x.cep ? 'var' : ''), deger('Fotoğraf', x.foto ? 'var' : 'yok'), deger('Sözleşme', x.sozlesme), deger('Evrak', x.evrak ? Object.keys(x.evrak).length + ' ekran' : '')];
  if (x.tur === 'evrak') return [deger('TC', tc), deger('Ekranlar', Object.keys(x.evrak || {}).map(k => ({ ogrenim: 'öğrenim', saglik: 'sağlık', adli: 'adli sicil', parmak: 'parmak izi' }[k] || k)).join(', '))];
  if (x.tur === 'grup') return [deger('Dönem', x.donemAd), deger('Grup', 'Grup ' + x.grupNo), deger('Şube', x.sube + ' Şubesi'), deger('Başlangıç', x.baslangic)];
  if (x.tur === 'onay') return [deger('Dönem', GR.donemAdi(x.donem)), adayDeger(x)];
  if (x.tur === 'esinav') return [deger('TC', tc), deger('İstenen', x.istenen), deger('Gün tercihi', { 0: 'En erken', 1: 'Hafta içi', 2: 'Hafta sonu' }[x.gun] || x.gun)];
  if (x.tur === 'randevu') return [deger('Sınav', x.tarih), deger('Sertifika', x.sertifika), adayDeger(x), deger('Araçlar', [...new Set(x.adaylar.map(a => a.plaka))].join(', '))];
  if (x.tur === 'fatura') return [deger('TC', tc), deger('No', x.no), deger('Tarih', x.tarih), deger('Tutar', x.tutar + ' ₺')];
  return [];
}
// randevu ve kurum onayında adaylar da tek tek görünür (ad, TC maskeli, araç, saat)
// Kural motoru bulguları (mebtoplu.js kuralDenetimi; kural: { id: { engel: [{kural, metin}], uyari: [...] } }): engel kırmızı, uyarı turuncu.
// Engelli kayıt varsayılan olarak gönderilmez; yetkili "Kural engeline rağmen MEBBİS’e yaz" kutusunu bilerek işaretleyebilir.
const KR_KIRMIZI = '#a8241a';
const engelli = (kural, id) => !!(kural[id] && kural[id].engel && kural[id].engel.length);
const kuralSatiri = (b, engel) => `<span style="display:flex;gap:6px;align-items:flex-start;font-size:12.5px;margin-top:4px;color:${engel ? KR_KIRMIZI : 'var(--turuncu)'}">${isaret(engel ? 'yasak' : 'uyari', 15)}<span><b class="mono">${e(b.kural)}</b> ${e(engel ? 'Engel' : 'Uyarı')}: ${e(maskele(b.metin))}</span></span>`;
function kuralKutusu(id, kr) {
  if (!kr || (!(kr.engel || []).length && !(kr.uyari || []).length)) return '';
  return [...(kr.engel || []).map(b => kuralSatiri(b, true)), ...(kr.uyari || []).map(b => kuralSatiri(b, false))].join('')
    + ((kr.engel || []).length ? `<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:6px;color:${KR_KIRMIZI};font-weight:700;cursor:pointer"><input type="checkbox" data-mk-engel="${e(id)}" style="width:17px;height:17px;flex:none"><span>Kural engeline rağmen MEBBİS’e yaz</span></label>` : '');
}
const engelCizgi = on => on ? `;border-left:3px solid ${KR_KIRMIZI};padding-left:10px` : '';
// "Ekranda doldur" ve "Elle gir" yollarında aynı bulgular yalnız bilgi olarak görünür (işaret kutusu yok, kayıt durdurulmaz)
const kuralBilgiKutusu = kr => kr ? [...(kr.engel || []).map(b => kuralSatiri(b, true)), ...(kr.uyari || []).map(b => kuralSatiri(b, false))].join('') : '';
const bulguVar = kr => !!(kr && ((kr.engel || []).length || (kr.uyari || []).length));
// ogeler: [[kimlik, başlık]] (bulgusu olmayanlar gösterilmez). devam: "Devam et"te çağrılır; Vazgeç'te hiçbir şey yapılmaz.
export function kuralBilgiPenceresi({ ogeler, kural = {}, dugme = 'Devam et', devam }) {
  const l = ogeler.filter(([id]) => bulguVar(kural[id])), ne = l.filter(([id]) => (kural[id].engel || []).length).length;
  pencere({
    baslik: `Kural bulguları · ${l.length} kayıt`, genis: true,
    icerik: `<p class="ipucu${ne ? '' : ' uyari'}" style="margin-bottom:12px${ne ? ';background:var(--kirmizi-acik);color:#8a1d14' : ''}">${isaret(ne ? 'yasak' : 'uyari', 18)}<span>${ne ? `<b>${ne} kayıtta kural engeli var.</b> ` : ''}Bu yolda kayıtlar durdurulmaz; bulgular bilgi içindir. MEBBİS’e girmeden önce kontrol edin.</span></p>
      <ul style="list-style:none;padding:0;margin:0">${l.map(([id, b]) => `<li style="display:block;padding:8px 0;border-bottom:1px solid var(--cizgi)${engelCizgi(engelli(kural, id))}"><b style="color:var(--murekkep);display:block">${e(maskele(b || kisiAdi(id) || id))}</b>${kuralBilgiKutusu(kural[id])}</li>`).join('')}</ul>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-mk-bilgi-devam>${ik('ok')}${e(dugme)}</button>`,
    onAc(d) { d.querySelector('[data-mk-bilgi-devam]').addEventListener('click', () => { kapatPencere(); devam(); }); },
  });
}
// randevuda saat, onayda bırakılan aday çıkınca yeniden verilir: data-mk-saat ile güncellenir (bırakılan adayda "gönderilmez")
const adaySatiri = (x, a, kural = {}) => `<span style="display:block;padding-left:12px;border-left:2px solid var(--cizgi);margin-top:3px${engelCizgi(engelli(kural, a.id))}"><span style="display:flex;gap:4px 14px;flex-wrap:wrap;font-size:12.5px"><b style="color:var(--metin)">${e(kisiAdi(a.id) || '—')}</b>${deger('TC', tcMaskele(a.tc))}${x.tur === 'randevu' ? deger('Araç', a.plaka) + `<span style="white-space:nowrap"><small style="color:var(--soluk)">Saat</small> <b class="mono" style="color:var(--murekkep)" data-mk-saat="${e(a.id)}">${e(a.saat)}</b></span>` + deger('Usta öğretici', personelMetni(a)) : ''}</span>${kuralKutusu(a.id, kural[a.id])}</span>`;
function satirlar(x, kural = {}) {
  return `<li style="display:block;padding:8px 0;border-bottom:1px solid var(--cizgi)${engelCizgi(!x.adaylar && engelli(kural, x.id))}"><b style="color:var(--murekkep);display:block">${e(maskele(x.baslik || TUR_AD[x.tur]))}</b><span style="display:flex;gap:4px 14px;flex-wrap:wrap;font-size:13px">${gidecekler(x).filter(Boolean).join('')}</span>${x.adaylar ? x.adaylar.map(a => adaySatiri(x, a, kural)).join('') : kuralKutusu(x.id, kural[x.id])}</li>`;
}
// Onay penceresindeki süre satırı: yalnız gönderilecek kayıtların tahmini süresi ve parça sayısı
const sureMetni = (dk, pn) => `<b>${dk ? `Tahmini ${dk} dk` : 'Gönderilecek kayıt yok'}${pn > 1 ? `, ${pn} parça` : ''}.</b> ${pn > 1 ? `İş yaklaşık ${parcaDk()} dakikalık parçalara bölündü; her parça bitince sonraki parçadan önce MEBBİS’ten çıkıp yeniden girmeniz istenir. ` : ''}`;
// Onayda bırakılan (kural engeli işaretlenmemiş) kayıtlar çıkarılır; randevu ve kurum onayında aday aday
export function engelliCikar(l, haric = []) {
  if (!haric.length) return l; const h = new Set(haric);
  return l.map(x => x.adaylar ? { ...x, adaylar: x.adaylar.filter(a => !h.has(a.id)) } : x).filter(x => x.adaylar ? x.adaylar.length : !h.has(x.id));
}
// Döner: Promise<{ onay, haric, bilerek } | null>. l: hazirla() çıktısı (MEBBİS'e gidecek değerlerin ta kendisi), hata: gönderilmeyecekler [[id, neden]]
// kural: kural motoru bulguları (mebtoplu.js kuralDenetimi). haric: engelli olup işaretlenmeyen kimlikler (gönderilmez);
// bilerek: [{ id, kurallar }] kural engeline rağmen işaretlenenler (işlem kaydına yazılır)
// sikistir(haric): gönderilecek liste (bırakılanlar çıkmış, randevu saatleri yeniden verilmiş; mebtoplu.js). Süre, parça, "N iş" rozeti ve saatler bundan.
export function isOnayPenceresi({ l, hata = [], basliklar = {}, kural = {}, sikistir }) {
  return new Promise(ok => {
    let sonuc = null;
    const kimlikler = l.flatMap(isKimlikleri), engelIds = kimlikler.filter(id => engelli(kural, id)), uyariIds = kimlikler.filter(id => !engelli(kural, id) && kural[id] && (kural[id].uyari || []).length);
    const gidecek = h => (sikistir ? sikistir(h) : engelliCikar(l, h)).filter(x => !x.adaylar || x.adaylar.length);
    const ilkGiden = gidecek(engelIds), giden0 = new Set(ilkGiden.flatMap(isKimlikleri));
    const k = kim(), kr = kurum(), sayi = adaySayisi(l) - engelIds.length, dk = tahminDk(ilkGiden), pn = parcala(ilkGiden).length;
    // tür grubu başlığındaki "N iş": yalnız gönderilecekler
    const isSayisi = (y, g) => y.flatMap(isKimlikleri).filter(id => g.has(id)).length;
    const grupSay = y => { const ids = y.flatMap(isKimlikleri); return [ids.filter(id => engelli(kural, id)).length, ids.filter(id => uyariIds.includes(id)).length]; };
    const gruplar = SIRA.map(t => [t, l.filter(x => x.tur === t)]).filter(([, y]) => y.length);
    const turlar = new Set(l.map(x => x.tur));
    const uyarilar = [
      turlar.has('onay') ? 'Kurum onayından sonra MEBBİS’te fotoğraf ve evrak bilgileri düzeltilemez. Yardımcı yalnız MEBBİS’te fotoğrafı ve evrakı “Tamam” görünen adayları onaylar.' : '',
      // gün sayısı kursun mevzuat ayarından; teorik program için ayrı bir gün kuralı teyit edilmedi, yazılmaz
      turlar.has('program') ? `Direksiyon dersleri MEBBİS’e en az ${kuralAyar('programOnGun')} gün önce girilmeli (kurs ayarı, MTSK Yönetmeliği).` : '',
      turlar.has('randevu') ? `Sınav randevusu sınavdan en geç ${kuralAyar('sinavBildirimIsGunu')} iş günü önce girilmeli; her sınav aracına en çok 10 aday (kurs ayarı, MTSK Yönetmeliği md.30/2).` : '',
      'MEBBİS güvenlik kodu isterse Yardımcı kod resmini gösterir; kodu siz yazarsınız.',
    ].filter(Boolean);
    pencere({
      baslik: `MEBBİS’e yazılacaklar · ${sayi} iş`, genis: true, korumali: true,
      icerik: `<div style="display:grid;gap:12px">
        <div class="kart" style="box-shadow:none;margin:0"><div class="kart-govde" style="display:grid;gap:4px;font-size:14px">
          <span><b style="color:var(--murekkep)">Kimin adına:</b> ${e(kr.kurs)}${kr.sube ? ' · ' + e(kr.sube) + ' şubesi' : ''}${kr.kod ? ` · kurum kodu <span class="mono">${e(kr.kod)}</span>` : ''}${kr.mudur ? ' · müdür ' + e(kr.mudur) : ''}</span>
          <span><b style="color:var(--murekkep)">MEBBİS kullanıcısı:</b> şu an MEBBİS’e giriş yapmış hesap${kr.hesap ? ' (' + e(kr.hesap) + ')' : ''}. Kayıtlar MEBBİS’te bu hesabın adıyla görünür; Yardımcı şifreyi görmez.</span>
          <span><b style="color:var(--murekkep)">Onaylayan:</b> ${e(k.ad)} · ${e(k.rolAd)} · ${saatMetni(Date.now())}</span>
        </div></div>
        <div><b style="display:block;color:var(--murekkep);margin-bottom:6px">Ne yazılacak</b>
          ${engelIds.length ? `<div class="ipucu" style="background:var(--kirmizi-acik);color:#8a1d14;margin-bottom:8px">${isaret('yasak', 18)}<span><b>${engelIds.length} kayıtta kural engeli var; bu kayıtlar gönderilmeyecek.</b> Kaydı yine de göndermek istiyorsanız altındaki “Kural engeline rağmen MEBBİS’e yaz” kutusunu işaretleyin. İşaretlediğiniz kayıt ve kural işlem kaydına yazılır.</span></div>` : ''}
          ${uyariIds.length ? `<div class="ipucu uyari" style="margin-bottom:8px">${isaret('uyari', 18)}<span><b>${uyariIds.length} kayıtta kural uyarısı var.</b> Uyarılı kayıtlar gönderilir; göndermeden önce kontrol edin.</span></div>` : ''}
          ${gruplar.map(([t, y]) => { const [ne, nu] = grupSay(y), uzun = y.length > 120, ilk = uzun ? y.filter(x => isKimlikleri(x).some(id => engelli(kural, id) || uyariIds.includes(id))).concat(y.filter(x => !isKimlikleri(x).some(id => engelli(kural, id) || uyariIds.includes(id)))).slice(0, 120) : y; return `<details style="border:1.5px solid var(--cizgi);border-radius:10px;padding:0 12px;margin-bottom:6px" ${ne || nu ? 'open' : ''}><summary style="cursor:pointer;padding:10px 0;display:flex;gap:10px;align-items:center;justify-content:space-between"><span><b style="color:var(--murekkep)">${e(TUR_AD[t])}</b> <small style="color:var(--soluk)">${e(ekranAdi(t))}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${ne ? rozet(ne + ' engel', 'kirmizi') : ''}${nu ? rozet(nu + ' uyarı', 'turuncu') : ''}<span data-mk-is-sayi="${e(t)}">${rozet(isSayisi(y, giden0) + ' iş', 'mavi')}</span></span></summary><ul style="list-style:none;padding:0;margin:0 0 8px">${ilk.map(x => satirlar(x, kural)).join('')}</ul>${uzun ? `<small style="display:block;color:var(--soluk);padding-bottom:8px">İlk 120 satır gösteriliyor${ne || nu ? '; engelli ve uyarılı kayıtlar başta' : ''}.</small>` : ''}</details>`; }).join('')}
          <small style="display:block;color:var(--soluk)">Değerler MEBBİS’e gidecek hâliyle gösteriliyor. TC kimlik numaraları burada maskeli.</small></div>
        ${hata.length ? `<div class="ipucu uyari">${isaret('uyari', 18)}<span><b>Gönderilmeyecek ${hata.length} iş</b> (eksik bilgi): ${hata.slice(0, 3).map(([id, n]) => `${e(maskele(basliklar[id] || id))}: ${e(n)}`).join(' · ')}${hata.length > 3 ? ` ve ${hata.length - 3} iş daha` : ''}</span></div>` : ''}
        <div class="ipucu">${isaret('bilgi', 18)}<span><span data-mk-sure>${sureMetni(dk, pn)}</span>MEBBİS oturumu yaklaşık 40 dakikada kapanabiliyor; kapanırsa yeniden girin, iş kaldığı yerden sürer. Süre MEBBİS’in hızına göre değişir.</span></div>
        <ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px">${uyarilar.map(u => `<li style="display:flex;gap:8px;font-size:13.5px;color:var(--metin)">${isaret('uyari', 16)}<span>${e(u)}</span></li>`).join('')}</ul>
        <div style="border-top:1.5px solid var(--cizgi);padding-top:10px;font-size:13.5px;color:var(--metin)">Kayıtları kurs yetkilisi kontrol eder. Güvenlik kodunu ve geri alınamaz işleri yetkili yapar; istediği an durdurabilir. Onaylayanın adı, rolü ve zamanı ile her kaydın sonucu işlem kaydına yazılır.</div>
        <label style="display:flex;gap:10px;align-items:flex-start;font-size:14.5px;cursor:pointer"><input type="checkbox" data-mk-kontrol style="margin-top:3px;width:18px;height:18px"><span>Listeyi kontrol ettim; kurumum adına MEBBİS’e yazılmasını onaylıyorum.</span></label>
      </div>`,
      altlik: `<button class="dg dg-cizgi" data-mk-vazgec>Vazgeç</button><button class="dg dg-ana" data-mk-onay disabled>${ik('ok')}Onayla ve MEBBİS’e yaz (${sayi} iş)</button>`,
      onAc(d) {
        const b = d.querySelector('[data-mk-onay]'), kontrol = d.querySelector('[data-mk-kontrol]'), h2 = d.querySelector('header h2');
        const isaretli = () => [...d.querySelectorAll('[data-mk-engel]')].filter(x => x.checked).map(x => x.dataset.mkEngel);
        // gönderilecek sayı: engelsizler + bilerek işaretlenen engelliler; hiç kayıt kalmazsa onay düğmesi açılmaz
        // süre, parça, grup rozetleri ve randevu saatleri de yalnız gönderilecek kayıtlardan (bırakılan adayın saati boşalır, sonrakiler kayar)
        const guncelle = () => {
          const sec = new Set(isaretli()), g = gidecek(engelIds.filter(id => !sec.has(id))), gs = new Set(g.flatMap(isKimlikleri)), n = gs.size;
          b.disabled = !kontrol.checked || !n; b.innerHTML = `${ik('ok')}Onayla ve MEBBİS’e yaz (${n} iş)`; if (h2) h2.textContent = `MEBBİS’e yazılacaklar · ${n} iş`;
          const sr = d.querySelector('[data-mk-sure]'); if (sr) sr.innerHTML = sureMetni(n ? tahminDk(g) : 0, parcala(g).length);
          gruplar.forEach(([t, y]) => { const r0 = d.querySelector(`[data-mk-is-sayi="${t}"]`); if (r0) r0.innerHTML = rozet(isSayisi(y, gs) + ' iş', 'mavi'); });
          const saat = new Map(g.filter(x => x.adaylar).flatMap(x => x.adaylar.map(a => [a.id, a.saat])));
          const adaySay = new Map(g.filter(x => x.adaylar).map(x => [x.id, x.adaylar.length]));
          d.querySelectorAll('[data-mk-aday]').forEach(el => { el.textContent = (adaySay.get(el.dataset.mkAday) || 0) + ' kişi'; });
          d.querySelectorAll('[data-mk-saat]').forEach(el => { const v = saat.get(el.dataset.mkSaat); el.textContent = v || 'gönderilmez'; el.style.color = v ? '' : 'var(--soluk)'; });
        };
        guncelle();
        kontrol.addEventListener('change', guncelle);
        d.querySelectorAll('[data-mk-engel]').forEach(x => x.addEventListener('change', guncelle));
        // ilk odak eskisi gibi onay kutusunda kalsın (engel kutusu yanlışlıkla boşlukla işaretlenmesin)
        if (engelIds.length) setTimeout(() => kontrol.focus(), 80);
        const bitir = v => { sonuc = v; kapatPencere(); ok(v); };
        d.querySelector('[data-mk-vazgec]').addEventListener('click', () => bitir(null));
        d.querySelector('[data-kapat]').addEventListener('click', () => { if (!sonuc) ok(null); });
        b.addEventListener('click', () => { const sec = new Set(isaretli());
          bitir({ onay: { kim: k.ad, uid: k.uid, rol: k.rol, zaman: new Date().toISOString(), kurum: kr.kod, sube: kr.sube, surum: MEB_KABUL_SURUM },
            haric: engelIds.filter(id => !sec.has(id)), bilerek: engelIds.filter(id => sec.has(id)).map(id => ({ id, kurallar: [...new Set(kural[id].engel.map(x => x.kural))] })) }); });
      },
    });
  });
}

/* ---------- (b) işlem kaydı: iş fişi ve kayıt başına sonuç (sunucuda yalnız eklenebilir kayıt) ---------- */
export function sayilar(l) { const o = {}; l.forEach(x => { o[x.tur] = (o[x.tur] || 0) + (x.adaylar ? x.adaylar.length : 1); }); return o; }
export function fisYaz({ id, onay, l, parca, ozet, hata, engelli: eng = 0, bilerek = 0 }) {
  const say = sayilar(l), k = rolAdi(onay.rol);
  const metin = `İş ${id} · ${onay.kim} (${k}) · ${onay.sube ? onay.sube + ' · ' : ''}kurum kodu ${onay.kurum || '—'} · ${SIRA.filter(t => say[t]).map(t => TUR_AD[t].toLocaleLowerCase('tr') + ' ' + say[t]).join(', ')}${hata ? ` · ${hata} iş gönderilmedi` : ''}${eng ? ` · ${eng} iş kural engeli yüzünden bırakıldı` : ''}${bilerek ? ` · ${bilerek} iş kural engeline rağmen` : ''} · ${parca} parça · metin ${onay.surum} · yük ${ozet}`;
  islem('MEBBİS işi onaylandı', kisalt(maskele(metin), 300));
}
// Yetkili kural engeline rağmen işaretlediyse kayıt başına bir satır: "kural engeline rağmen: M06, M12"
const kimlikTuru = id => { const t = String(id).split('-')[0]; return t === 'ders' ? 'program' : t === 'sinav' ? 'randevu' : t; };
export function engelRaginaYaz(isId, bilerek = [], basliklar = {}) {
  bilerek.forEach(b => islem('MEBBİS’e kural engeline rağmen onaylandı', kisalt(maskele(`İş ${isId} · ${TUR_AD[kimlikTuru(b.id)] || kimlikTuru(b.id)} · ${kisalt(basliklar[b.id] || kisiAdi(b.id) || b.id, 60)} · kural engeline rağmen: ${(b.kurallar || []).join(', ')}`), 300)));
}
// x: { id, ok, not, dogrulama, ekran, mebMesaj, sure, kod } · Yardımcı bu alanları göndermezse not'tan çıkarılır
// engel: onayda "kural engeline rağmen" işaretlenen kayıtta kural kimlikleri (ör. 'M06, M12'); sonuç satırına da yazılır
export function sonucYaz(x, { isId, tur, baslik, kaynak, engel = '' }) {
  const zaten = /zaten vard/i.test(x.not || '') || x.dogrulama === 'zaten';
  const ne = kaynak === 'elle' ? 'MEBBİS’e elle girildi' : !x.ok ? 'MEBBİS’e yazılamadı' : zaten ? 'MEBBİS’te zaten vardı' : 'MEBBİS’e yazıldı';
  const parca = [
    `İş ${isId}`, TUR_AD[tur] || tur, kisalt(baslik || x.id, 60), x.ekran || ekranAdi(tur === 'sinav' ? 'randevu' : tur),
    dogrulamaAdi(x.dogrulama) || (x.ok ? '' : 'hata'), x.hataTur === 'ekran' ? 'MEBBİS ekranı değişti' : '', engel ? 'kural engeline rağmen: ' + engel : '',
    // Yardımcı'nın notu MEBBİS mesajıdır; elle ve "Ekranda doldur" yolunda başarı notu bizim açıklamamızdır
    // başarıda not MEBBİS'in mesajıdır; hatada Yardımcı'nın nedenidir (MEBBİS mesajı varsa içinde tırnakla geçer).
    // "Ekranda doldur" yolunda (kaynak 'ekranda') hata notu MEBBİS sayfasında görünen hata satırıdır (mebbis.js is-hata).
    !(x.mebMesaj || x.not) ? '' : x.mebMesaj ? 'MEBBİS: “' + kisalt(x.mebMesaj, 110) + '”' : !x.ok ? (kaynak === 'yardimci' ? 'Yardımcı: “' : kaynak === 'ekranda' ? 'MEBBİS: “' : 'Neden: “') + kisalt(x.not, 110) + '”' : kaynak === 'yardimci' ? 'MEBBİS: “' + kisalt(x.not, 110) + '”' : kaynak === 'elle' ? '' : kisalt(x.not, 110),
    x.sure > 0 ? (x.sure < 1000 ? '1 sn’den az' : Math.round(x.sure / 1000) + ' sn') : '', x.kod ? x.kod + ' güvenlik kodu' : '',
  ].filter(Boolean);
  islem(ne, kisalt(maskele(parca.join(' · ')), 300));
}
// Ekranda iz: başarıda silinmez; 45 günden eski ya da 2.000'den fazla iz budanır (ana belge 1 MB sınırı)
export function izBuda() {
  const d = S.mebDurum || {}, sinir = Date.now() - 45 * 864e5;
  const iz = Object.entries(d).filter(([, v]) => v && v.durum === 'tamam');
  iz.forEach(([id, v]) => { if ((v.zaman || 0) < sinir) delete d[id]; });
  const kalan = iz.filter(([id]) => d[id]).sort((a, b) => (b[1].zaman || 0) - (a[1].zaman || 0));
  kalan.slice(2000).forEach(([id]) => delete d[id]);
}
export function izMetni(v) {
  if (!v || v.durum !== 'tamam') return '';
  return [saatMetni(v.zaman), v.kim, dogrulamaAdi(v.dogrulama) || (v.kaynak === 'elle' ? 'elle girildi' : 'Yardımcı girdi')].filter(Boolean).join(' · ');
}

/* ---------- (g) "MEBBİS ekranı değişti" bildirimi: kursa açık uyarı, kayıt ve MEB işlemleri ekranında kırmızı kart ---------- */
// l: [{ ekran: 'SKT03004', eksik: ['cmbDersSaati'], parmakIzi, yardimci, harita }]
export function ekranDegisti(l, isId) {
  if (!Array.isArray(l) || !l.length) return false;
  const a = S.mebEkranAlarm = S.mebEkranAlarm || { ekranlar: {} }; let yeni = 0;
  l.forEach(x => {
    const kod = String(x.ekran || '').toUpperCase().slice(0, 20) || 'bilinmeyen ekran', eski = a.ekranlar[kod];
    if (eski && eski.is === isId) return;   // aynı işin sonucu her yoklamada yeniden gelir: bir kez uyarılır (gizlendikten sonra da)
    a.ekranlar[kod] = { eksik: (x.eksik || []).map(String).slice(0, 12), zaman: Date.now(), is: isId, goruldu: false };
    islem('MEBBİS ekranı değişti', kisalt(`${kod} · eksik: ${(x.eksik || []).join(', ') || '—'}${x.yardimci ? ' · Yardımcı ' + x.yardimci : ''}${x.harita ? ' · harita ' + x.harita : ''}${isId ? ' · iş ' + isId : ''}`, 300));
    yeni++;
  });
  if (!yeni) return false;
  Object.entries(a.ekranlar).forEach(([k, v]) => { if (!v || Date.now() - (v.zaman || 0) > 30 * 864e5) delete a.ekranlar[k]; });   // 30 günden eski uyarılar silinir
  a.zaman = Date.now(); kaydet();
  bildir(`MEBBİS ekranı değişti (${Object.keys(a.ekranlar).filter(k => !a.ekranlar[k].goruldu).join(', ')}). Bu ekranın işleri gönderilmedi; MEB işlemleri › MEBBİS aktarımı ekranına bakın.`, 'uyari');
  return true;
}
const haritaKarti = h => `<div class="kart" style="margin-bottom:14px;border:2px solid var(--kirmizi);background:var(--kirmizi-acik)" role="alert"><div class="kart-govde" style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">${isaret('dur', 26)}<div style="flex:1;min-width:240px"><b style="font-family:var(--baslik);font-size:17px;color:#8a1d14;display:block">${h.guncelle ? 'MEBBİS Yardımcısı’nı güncelleyin' : 'Yardımcı ekran haritasını kabul etmedi'}</b>
    <p style="font-size:14px;color:#8a1d14;margin-top:2px">${h.guncelle ? 'mdSinyal’in yeni MEBBİS ekran haritası daha yeni bir Yardımcı sürümü istiyor. Yardımcı şimdilik kendi gömülü haritasıyla çalışıyor; MEBBİS ekranları değiştiyse bazı işler “ekran değişti” diye durabilir.' : 'Yardımcı, mdSinyal’den gelen MEBBİS ekran haritasını denetimden geçiremedi ve kullanmadı; kendi gömülü haritasıyla çalışıyor.'} <span class="mono" style="font-size:12.5px">${e(h.neden)}</span></p>
    <p style="font-size:13.5px;color:#8a1d14;margin-top:4px">${h.guncelle ? `<a href="eklenti/mdsinyal-mebbis.zip" download style="color:inherit;font-weight:700">Yeni sürümü indirin</a> ya da Chrome Web Mağazası güncellemesini bekleyin. ` : 'Durumu mdSinyal’e bildirin (Hesabım › Destek). '}Kayıt işlem geçmişine düştü · ${saatMetni(h.zaman)}</p></div>
    <button class="dg dg-cizgi dg-kucuk" data-mk-alarm-gizle>Gördüm, gizle</button></div></div>`;
export function alarmKarti() {
  const a = S.mebEkranAlarm, h = a && a.harita && !a.harita.goruldu && !a.harita.cozuldu ? haritaKarti(a.harita) : '';
  const l = Object.entries((a && a.ekranlar) || {}).filter(([, v]) => v && !v.goruldu); if (!l.length) return h;
  return h + `<div class="kart" style="margin-bottom:14px;border:2px solid var(--kirmizi);background:var(--kirmizi-acik)" role="alert"><div class="kart-govde" style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">${isaret('dur', 26)}<div style="flex:1;min-width:240px"><b style="font-family:var(--baslik);font-size:17px;color:#8a1d14;display:block">MEBBİS ekranı değişti</b>
    <p style="font-size:14px;color:#8a1d14;margin-top:2px">Yardımcı şu ekranlarda beklediği alanı bulamadı ve bu ekranlara hiçbir şey yazmadı: ${l.map(([k, v]) => `<b class="mono">${e(k)}</b>${v.eksik.length ? ' (' + e(v.eksik.join(', ')) + ')' : ''}`).join(', ')}. Diğer işler sürdü.</p>
    <p style="font-size:13.5px;color:#8a1d14;margin-top:4px">Bu işleri şimdilik “Elle gir” ile girin ve durumu mdSinyal’e bildirin (Hesabım › Destek). Kayıt işlem geçmişine düştü · ${saatMetni(Math.max(...l.map(([, v]) => v.zaman || 0)))}</p></div>
    <button class="dg dg-cizgi dg-kucuk" data-mk-alarm-gizle>Gördüm, gizle</button></div></div>`;
}
// gizlenen uyarı silinmez, "görüldü" olur: aynı işin yeniden gelen sonucu uyarıyı geri açmaz; yeni bir işte aynı ekran yine bozuksa yeniden uyarır
export function alarmGizle() {
  const a = S.mebEkranAlarm; if (!a) return;
  const l = Object.entries(a.ekranlar || {}).filter(([, v]) => v && !v.goruldu), h = a.harita && !a.harita.goruldu && !a.harita.cozuldu ? a.harita : null; if (!l.length && !h) return;
  l.forEach(([, v]) => { v.goruldu = true; }); if (h) h.goruldu = true;
  islem('MEBBİS ekran uyarısını gördü', [...l.map(([k]) => k), h ? 'ekran haritası' : ''].filter(Boolean).join(', ')); kaydet();
}

/* ---------- kurum uyuşmazlığı, iş özeti ve ölçüm (Yardımcı 1.12: sonuc.hataTur 'kurum', sonuc.mebKurum, sonuc.kurum, sonuc.olcum) ---------- */
// ölçüm satırı: "12 istek · 2 güvenlik kodu · ortalama kayıt 7 sn · 3 dk" (motor.js olcumYazi ile aynı biçim)
export function olcumMetni(o, yazilan = []) {
  if (!o || !o.basla) return '';
  const k = o.kod || {}, kayit = (yazilan || []).filter(x => x && x.sure > 0), ort = kayit.length ? kayit.reduce((a, x) => a + x.sure, 0) / kayit.length : 0;
  const dk = ((o.bitis || Date.now()) - o.basla) / 60000;
  return [`${+o.istek || 0} istek`, `${+k.istenen || 0} güvenlik kodu${k.atlanan ? ` (${k.atlanan} atlandı)` : ''}`, kayit.length ? `ortalama kayıt ${Math.max(1, Math.round(ort / 1000))} sn` : '', dk < 1 ? '1 dk’dan az' : Math.round(dk) + ' dk', (o.oturumDusme || []).length ? `${o.oturumDusme.length} kez oturum düştü` : ''].filter(Boolean).join(' · ');
}
const ESLESME_AD = { tam: 'MEBBİS’ten okunup doğrulandı', onayli: 'bu tarayıcıda önceden onaylanmış', yetkili: 'yetkili onayladı' };
export const kurumMetni = k => k && k.kod ? `kurum ${k.kod}${k.eslesme ? ' (' + (ESLESME_AD[k.eslesme] || k.eslesme) + ')' : ''}` : '';
// Yardımcı açık MEBBİS hesabının kurum kodunu işinkiyle uyuşmaz bulunca hiçbir şey yazmaz; bu kayda ve iş kartına düşer (iş başına bir kez)
// (Yardımcı duran işin sonucunu her açılışta yeniden verir: son uyuşmazlık S.mebKurumUyari'da tutulur, aynısı ikinci kez yazılmaz)
// zaman: Yardımcı'nın teslim zamanı. Aynı teslim yeniden gelince zaman aynıdır (yazılmaz); "Kaldığı yerden devam et" yine yanlış hesapta durursa yeni zaman gelir (yeniden yazılır).
export function kurumUyusmazligi({ isId, acik, beklenen, hata, zaman }) {
  const anahtar = `${isId}|${acik || ''}|${zaman || ''}`; if (S.mebKurumUyari && S.mebKurumUyari.anahtar === anahtar) return false;
  S.mebKurumUyari = { anahtar, zaman: Date.now() }; kaydet();
  islem('MEBBİS kurum uyuşmazlığı', kisalt(maskele(`İş ${isId || '—'} · açık MEBBİS hesabı ${acik || 'doğrulanamadı'} · iş kurum kodu ${beklenen || '—'} · hiçbir şey yazılmadı${hata ? ' · Yardımcı: “' + hata + '”' : ''}`), 300));
  bildir(acik && beklenen && acik !== beklenen ? `MEBBİS’te başka bir kurumun hesabı açık (${acik}); bu iş ${beklenen} kurum kodu için. Hiçbir şey yazılmadı. Doğru şubenin hesabıyla girin.` : `MEBBİS işi durdu: kurum doğrulanmadı. Hiçbir şey yazılmadı.`, 'uyari');
  return true;
}
// Yardımcı'nın teslim ettiği sonucun işlendiği bu tarayıcıda kalıcı tutulur (localStorage; iş kimliği ve zaman, kişisel veri yok).
// mdSinyal sayfası teslim onayından önce yenilenirse Yardımcı aynı sonucu yeniden verir: "MEBBİS işi bitti" ve "toplu veri aldı" ikinci kez yazılmasın.
// En çok 80 kimlik, 14 günden eskiler silinir. Depo açılamazsa (gizli pencere, engelli site verisi) bellekteki işaret kullanılır (eski davranış).
const GORULEN = 'sinyal-meb-teslim-gorulen', GORULEN_SAYI = 80, GORULEN_GUN = 14;
function gorulenOku() { try { const v = JSON.parse(localStorage.getItem(GORULEN) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (x) { return {}; } }
export function teslimGoruldu(ne, id) { const v = gorulenOku()[ne + ':' + id]; return typeof v === 'number' && Date.now() - v < GORULEN_GUN * 864e5; }
export function teslimIsaretle(ne, id) {
  try { const o = gorulenOku(), sinir = Date.now() - GORULEN_GUN * 864e5; o[ne + ':' + id] = Date.now();
    const l = Object.entries(o).filter(([, z]) => typeof z === 'number' && z > sinir).sort((a, b) => b[1] - a[1]).slice(0, GORULEN_SAYI);
    localStorage.setItem(GORULEN, JSON.stringify(Object.fromEntries(l))); } catch (x) { }
}
// İş bitince tek satırlık özet: kaç kayıt, kurum doğrulaması, istek ve güvenlik kodu sayısı, süre
const bitenGorulen = new Set();
export function isBittiYaz(r) {
  if (!r || !r.id || bitenGorulen.has(r.id) || teslimGoruldu('bitti', r.id)) return; bitenGorulen.add(r.id); teslimIsaretle('bitti', r.id);
  const sn = r.sonuc || {}, y = sn.yazilan || [], ok = y.filter(x => x.ok).length, hata = y.length - ok, kontrol = y.filter(x => x.ok && x.dogrulama === 'mesaj').length;
  const cek = Object.keys(sn.veri || {}).filter(k => k !== 'denetim');
  const parca = [`İş ${r.id}`, y.length ? `${ok} yazıldı${kontrol ? ` (${kontrol} yalnız mesajla)` : ''}${hata ? `, ${hata} yazılamadı` : ''}` : '', cek.length ? 'okunan: ' + cek.join(', ') : '', kurumMetni(sn.kurum), olcumMetni(sn.olcum, y), sn.yardimci ? 'Yardımcı ' + sn.yardimci : ''].filter(Boolean);
  islem('MEBBİS işi bitti', kisalt(maskele(parca.join(' · ')), 300));
}

/* ---------- "Ekranları denetle" (Yardımcı 1.12, is.denetle): yalnız okuma; her ekranın durumu ---------- */
const DENETIM_AD = { uygun: ['Uygun', 'yesil'], degismis: ['Değişmiş olabilir', 'uyari'], eksik: ['Alan eksik', 'kirmizi'], kapali: ['Girişe kapalı', 'uyari'], hata: ['Açılamadı', 'kirmizi'] };
// d: sonuc.veri.denetim {harita, yardimci, kurum, ekranlar[{kod, ad, durum, eksik, iz, not}]}; S.mebDenetim'de kişisel veri yok (ekran kodu ve alan adları)
export function denetimSonucu(d, isId, goster = true) {
  if (!d || !Array.isArray(d.ekranlar)) return false;
  const ekr = d.ekranlar.slice(0, 80).map(x => ({ kod: String(x.kod || '').toUpperCase().slice(0, 20), ad: kisalt(x.ad || '', 60), durum: DENETIM_AD[x.durum] ? x.durum : 'hata', eksik: (x.eksik || []).map(String).slice(0, 12) }));
  const once = S.mebDenetim;
  if (once && once.is === isId) { if (goster) denetimPenceresi(); return false; }   // aynı sonuç yeniden geldi
  const say = t => ekr.filter(x => x.durum === t).length, bozuk = ekr.filter(x => ['eksik', 'hata'].includes(x.durum));
  S.mebDenetim = { zaman: Date.now(), is: isId, harita: d.harita || '', yardimci: d.yardimci || '', kurum: d.kurum && d.kurum.kod ? { kod: d.kurum.kod, eslesme: d.kurum.eslesme || '' } : null, ekranlar: ekr, kim: kim().ad };
  // yenilemeden sonra aynı sonuç yeniden gelirse (bu tarayıcıda işaretli) kayıt ikinci kez yazılmaz; ekran durumları yine güncellenir
  if (!teslimGoruldu('denetim', isId)) { teslimIsaretle('denetim', isId); islem('MEBBİS ekranlarını denetledi', kisalt(`İş ${isId} · ${ekr.length} ekran: ${say('uygun')} uygun${say('degismis') ? `, ${say('degismis')} değişmiş olabilir` : ''}${say('kapali') ? `, ${say('kapali')} girişe kapalı` : ''}${bozuk.length ? `, ${bozuk.length} sorunlu (${bozuk.map(x => x.kod).join(', ')})` : ''} · ${kurumMetni(S.mebDenetim.kurum) || 'kurum —'} · harita ${d.harita || '—'} · Yardımcı ${d.yardimci || '—'}`, 300)); }
  // alanı eksik ekranlar kırmızı karta; denetimde uygun çıkan ekranın eski uyarısı kalkar
  const a = S.mebEkranAlarm = S.mebEkranAlarm || { ekranlar: {} };
  ekr.filter(x => x.durum === 'uygun').forEach(x => { if (a.ekranlar[x.kod] && !a.ekranlar[x.kod].goruldu) { a.ekranlar[x.kod].goruldu = true; a.ekranlar[x.kod].cozuldu = Date.now(); } });
  const eksikler = ekr.filter(x => x.durum === 'eksik').map(x => ({ ekran: x.kod, eksik: x.eksik, yardimci: d.yardimci, harita: d.harita }));
  if (!ekranDegisti(eksikler, isId)) kaydet();
  if (goster) denetimPenceresi();
  return true;
}
export function denetimOzeti() {
  const d = S.mebDenetim; if (!d || !d.ekranlar) return '';
  const sorun = d.ekranlar.filter(x => x.durum !== 'uygun').length;
  return `Son ekran denetimi ${saatMetni(d.zaman)} · ${d.ekranlar.length - sorun}/${d.ekranlar.length} ekran uygun${sorun ? ` · <b style="color:var(--kirmizi)">${sorun} ekranda sorun</b>` : ''}`;
}
export function denetimPenceresi() {
  const d = S.mebDenetim; if (!d) return;
  const sira = ['eksik', 'hata', 'kapali', 'degismis', 'uygun'], l = [...d.ekranlar].sort((a, b) => sira.indexOf(a.durum) - sira.indexOf(b.durum)), sorun = l.filter(x => x.durum !== 'uygun').length;
  pencere({
    baslik: `MEBBİS ekran denetimi · ${sorun ? sorun + ' ekranda sorun' : 'hepsi uygun'}`, genis: true,
    icerik: `<p style="font-size:14px;margin-bottom:10px">Yardımcı ${e(d.yardimci || '')} her MEBBİS ekranını açıp beklediği alanları aradı; hiçbir şey yazılmadı. ${e(kurumMetni(d.kurum) || '')}${d.harita ? ` · ekran haritası ${e(d.harita)}` : ''} · ${saatMetni(d.zaman)}</p>
      ${sorun ? `<p class="ipucu uyari" style="margin-bottom:10px">${isaret('uyari', 18)}<span>Alanı eksik ekranlara Yardımcı yazmaz; o işleri şimdilik “Elle gir” ile girin ve durumu mdSinyal’e bildirin (Hesabım › Destek). “Değişmiş olabilir” ekranlarda alanlar yerinde ama form değişmiş; yazmayı sürdürür.</span></p>` : ''}
      <ul class="liste" style="margin:0">${l.map(x => { const [t, rk] = DENETIM_AD[x.durum] || DENETIM_AD.hata; return `<li style="padding:8px 0"><span style="flex:1;min-width:0"><b class="mono" style="color:var(--murekkep)">${e(x.kod)}</b> <span style="color:var(--metin)">${e(x.ad)}</span>${x.eksik.length ? `<small style="display:block;color:var(--kirmizi)">Bulunamayan: ${e(x.eksik.join(', '))}</small>` : ''}</span>${rozet(t, rk)}</li>`; }).join('')}</ul>`,
    altlik: '<button class="dg dg-ana" data-kapat>Tamam</button>',
  });
}

/* ---------- ekran haritası durumu (harita-durum): mdSinyal'in yayınladığı alan haritası Yardımcı'da reddedilirse ---------- */
// v: {ok, surum, ayni?} | {ok:false, neden}. Ağ hatası ve eski sürüm uyarı değildir (Yardımcı gömülü ya da yeni haritayla çalışır).
export function haritaDurum(v) {
  if (!v || typeof v !== 'object') return false;
  const a = S.mebEkranAlarm = S.mebEkranAlarm || { ekranlar: {} }, h = a.harita, neden = kisalt(String(v.neden || ''), 160);
  if (v.ok) {
    let n = 0;
    if (h && !h.cozuldu) { h.cozuldu = Date.now(); h.goruldu = true; islem('MEBBİS ekran haritası düzeldi', `sürüm ${v.surum || '—'}`); n++; }
    if (!v.ayni && v.surum && S.mebHaritaSurum !== v.surum) { S.mebHaritaSurum = v.surum; islem('MEBBİS ekran haritası güncellendi', `Yardımcı yeni haritayı aldı · sürüm ${v.surum}`); n++; }
    if (n) kaydet(); return !!n;
  }
  if (/alınamadı|yanıt yok|eski sürüm/i.test(neden)) return false;
  if (h && !h.cozuldu && h.neden === neden) return false;   // aynı ret her açılışta yeniden gelir: bir kez kaydedilir
  const guncelle = /Yardımcı .* istiyor/.test(neden);
  a.harita = { neden, guncelle, zaman: Date.now(), goruldu: false };
  islem('MEBBİS ekran haritası reddedildi', kisalt(`Yardımcı mdSinyal’in ekran haritasını kabul etmedi: ${neden}`, 300));
  kaydet();
  bildir(guncelle ? 'MEBBİS Yardımcısı’nı güncelleyin: yeni ekran haritası daha yeni bir sürüm istiyor' : 'MEBBİS Yardımcısı ekran haritasını kabul etmedi; MEB işlemleri › MEBBİS aktarımı ekranına bakın', 'uyari');
  return true;
}

/* ---------- (c) elle giriş: Yardımcı olmadan aynı değerler, kopyalanabilir satırlar ---------- */
// Değerler hazirla() çıktısından gelir; Yardımcı'nın yazacağıyla birebir aynıdır.
const GUN_AD = { 0: 'En erken tarih', 1: 'Hafta içi', 2: 'Hafta sonu' };
// onay-<kursiyer> ya da sinav-<sınav>-<kursiyer>: kursiyer kimliği son parçadır (randevu satırında da ad görünsün)
const kisiAdi = id => { const p = String(id).split('-'), k = kursiyer(p.slice(1).join('-')) || kursiyer(p[p.length - 1]); return k ? tamAd(k) : ''; };
// her tür: [[ekranKodu, adımlar metni, [[etiket, değer]]]]
export const ELLE = {
  grup: x => [
    ['SKT03001', 'Dönem → Grup → Başlangıç tarihi → Kurum onay durumu “Onaylandı” → Kaydet.', [['Dönem', x.donemAd], ['Grup', 'Grup ' + x.grupNo], ['Başlangıç tarihi', x.baslangic], ['Kurum onay durumu', 'Onaylandı']]],
    ['SKT03002', 'Sonra şube: Dönem → Grup → Şube → Kurum onay durumu “Onaylandı” → Kaydet.', [['Dönem', x.donemAd], ['Grup', 'Grup ' + x.grupNo], ['Şube', x.sube + ' Şubesi'], ['Kurum onay durumu', 'Onaylandı']]],
  ],
  evrak: x => {
    const v = x.evrak || {}, ortak = [['Dönem', GR.donemAdi(x.donem)], ['Aday', x.adSoyad], ['Aday TC kimlik no', x.tc]], l = [];
    if (v.ogrenim) l.push(['SKT02003', 'Dönem → Aday → alanlar → Kaydet.', [...ortak, ['Belgeyi veren', v.ogrenim.veren], ['Belge türü', v.ogrenim.tur], ['Belge tarihi', v.ogrenim.tarih], ['Belge sayısı', v.ogrenim.sayi]]]);
    if (v.saglik) l.push(['SKT02004', 'Dönem → Aday → özür durumu (varsa rapor referans no) → Kaydet.', [...ortak, ['Özür durumu', v.saglik.ozur], ['Rapor referans no', v.saglik.refNo]]]);
    if (v.adli) l.push(['SKT02005', 'Dönem → Aday → alanlar → Kaydet.', [...ortak, ['Belgeyi veren', v.adli.veren], ['Belge tarihi', v.adli.tarih], ['Belge sayısı', v.adli.sayi]]]);
    if (v.parmak) l.push(['SKT02010', 'Dönem → Aday → alanlar → Kaydet.', [...ortak, ['Belgeyi veren', v.parmak.veren], ['Belge tarihi', v.parmak.tarih], ['Belge sayısı', v.parmak.sayi]]]);
    return l;
  },
  onay: x => [['SKT02006', 'Dönem, Durumu “Onay Bekleyen” → Listele. Her adayın satırında fotoğraf ve evrak “Tamam” mı bakın; tamamsa onay kutusunu işaretleyin → Kaydet. Geri alınamaz.', [['Dönem', GR.donemAdi(x.donem)], ['Durumu', 'Onay Bekleyen'], ...x.adaylar.map(a => ['Aday · ' + kisiAdi(a.id), a.tc])]]],
  teorik: x => [['SKT03003', 'Dönem → Grup → Şube → Listele → Ders türü → Derslik → Tarih → Saat → Personel → Eğitim türü → Kaydet. Her saat ayrı kayıttır; saat başına tekrarlayın.', [['Dönem', GR.donemAdi(x.donem)], ['Grup', 'Grup ' + x.grupNo], ['Şube', (GR.SUBELER[x.subeNo - 1] || x.subeNo) + ' Şubesi'], ['Ders türü', x.dersTuru], ['Derslik', x.derslik], ['Tarih', x.tarih], ...(x.saatler || []).map(s => ['Ders saati', s]), ['Dersi veren personel', personelMetni(x)], ['Eğitim türü', x.egitimTuru || 'Normal']]]],
  esinav: x => [['SKT02007', '“Ücret Yatıran Aday Listesi”nde TC var mı bakın → TC → Bilgileri getir → Gün tercihi → Dönem → İstenen sınıf → Kaydet.', [['TC kimlik no', x.tc], ['Gün tercihi', GUN_AD[x.gun] || x.gun], ['Dönem', GR.donemAdi(x.donem)], ['İstenen sertifika sınıfı', x.istenen]]]],
  fatura: x => [['SKT02013', 'Dönem → TC → Getir → Sayı → Tarih → Tutar → Kaydet.', [['Dönem', GR.donemAdi(x.donem)], ['TC kimlik no', x.tc], ['Fatura sayısı', x.no], ['Fatura tarihi', x.tarih], ['Tutar', x.tutar]]]],
};
export const ELLE_TURLER = Object.keys(ELLE);
function panoya(metin) {
  try { if (navigator.clipboard) return navigator.clipboard.writeText(metin).then(() => true, () => yedek()); } catch (x) { }
  return Promise.resolve(yedek());
  function yedek() { const t = document.createElement('textarea'); t.value = metin; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { } t.remove(); return ok; }
}
const ekranUrl = kod => { for (const l of Object.values(EKRAN)) { const x = l.find(y => y[0] === kod); if (x) return x; } return [kod, kod, MEB]; };
// l: hazirla() çıktısı; girdim(ids): "MEBBİS'e elle girdim" denince çağrılır (aynı bayraklar, kaynak: elle)
// kural: kural motoru bulguları (mebtoplu.js kuralDenetimi); her kartta bilgi olarak görünür, girişi durdurmaz
export function ellePencere(l, hata, girdim, basliklar = {}, kural = {}) {
  const isler = l.filter(x => ELLE[x.tur]);
  const kart = (x, i) => {
    const ekr = ELLE[x.tur](x), ids = isKimlikleri(x), kb = ids.filter(id => bulguVar(kural[id])).map(id => `<div${engelCizgi(engelli(kural, id))}>${x.adaylar ? `<b style="font-size:13px;color:var(--metin)">${e(kisiAdi(id) || id)}</b>` : ''}${kuralBilgiKutusu(kural[id])}</div>`).join('');
    return `<div class="kart" style="margin-bottom:12px;box-shadow:none" data-elle-is="${i}"><div class="kart-bas"><h3 style="text-transform:none;letter-spacing:0">${e(x.baslik || TUR_AD[x.tur])}</h3><small>${e(TUR_AD[x.tur])}</small><div class="sag"><button class="dg dg-cizgi dg-kucuk" data-elle-sirali="${i}">Sırayla kopyala</button><button class="dg dg-ana dg-kucuk" data-elle-girdim="${i}">${ik('ok')}MEBBİS’e elle girdim</button></div></div>
      <div class="kart-govde" style="display:grid;gap:10px">${kb ? `<div style="display:grid;gap:4px">${kb}<small style="color:var(--soluk)">Kural bulguları bilgi içindir; elle giriş durdurulmaz.</small></div>` : ''}${ekr.map(([kod, adim, alanlar]) => { const [, ad, url] = ekranUrl(kod); return `<div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px"><b style="color:var(--murekkep)">${e(kod)} · ${e(ad)}</b><a href="${e(url)}" target="_blank" rel="noopener" style="color:var(--levha);font-weight:700;font-size:13.5px">MEBBİS’te aç</a></div><p style="font-size:13.5px;color:var(--soluk);margin:0 0 6px">${e(adim)}</p>
        <ul class="liste" style="margin:0">${alanlar.filter(a => a[1] != null && a[1] !== '').map(([et, v]) => `<li style="padding:6px 0"><span style="flex:1;min-width:0"><small style="display:block;color:var(--soluk)">${e(et)}</small><b class="mono" style="color:var(--murekkep);word-break:break-all">${e(v)}</b></span><button class="dg dg-cizgi dg-kucuk" data-elle-kopya="${e(v)}">Kopyala</button></li>`).join('')}</ul></div>`; }).join('')}
      ${x.tur === 'onay' ? `<p class="ipucu uyari" style="margin:0">${isaret('uyari', 18)}<span>Kurum onayı geri alınamaz; onaydan sonra fotoğraf ve evrak düzeltilemez.</span></p>` : ''}<small style="color:var(--soluk)">${ids.length > 1 ? ids.length + ' kayıt' : ''}</small></div></div>`;
  };
  pencere({
    baslik: `Elle giriş · ${adaySayisi(isler)} iş`, genis: true,
    icerik: `<p style="font-size:14px;margin-bottom:12px">MEBBİS’i yanda açın. Değerler Yardımcı’nın yazacağıyla aynıdır; her birini kopyalayıp MEBBİS’teki alana yapıştırın, sonra MEBBİS’te kaydedin. Kaydettiğiniz işte “MEBBİS’e elle girdim”e basın; adınız ve zaman işlem kaydına yazılır.</p>
      ${hata.length ? `<div class="ipucu uyari" style="margin-bottom:12px">${isaret('uyari', 18)}<span><b>${hata.length} iş hazırlanamadı:</b> ${hata.slice(0, 6).map(([id, n]) => `${e(maskele(basliklar[id] || id))}: ${e(n)}`).join(' · ')}</span></div>` : ''}
      ${isler.map(kart).join('') || '<p>Elle girilecek iş yok.</p>'}`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${isler.length > 1 ? `<button class="dg dg-ana" data-elle-hepsi>${ik('ok')}Hepsini MEBBİS’e elle girdim</button>` : ''}`,
    onAc(d) {
      d.addEventListener('click', ev => {
        const c = ev.target.closest('[data-elle-kopya]'); if (c) { panoya(c.dataset.elleKopya).then(ok => bildir(ok === false ? 'Kopyalanamadı; değeri elle seçin' : 'Kopyalandı', ok === false ? 'uyari' : 'tamam')); return; }
        const s = ev.target.closest('[data-elle-sirali]'); if (s) { const x = isler[+s.dataset.elleSirali], alanlar = ELLE[x.tur](x).flatMap(([kod, , a]) => a.filter(y => y[1] != null && y[1] !== '').map(([et, v]) => [kod, et, String(v)])); import('./sayfalar5.js?v=219').then(m => m.siraliPencere(x.baslik || TUR_AD[x.tur], alanlar, () => girdim(isKimlikleri(x)))); return; }
        const g = ev.target.closest('[data-elle-girdim]'); if (g) { const x = isler[+g.dataset.elleGirdim]; girdim(isKimlikleri(x)); const k = g.closest('[data-elle-is]'); if (k) k.remove(); if (!d.querySelector('[data-elle-is]')) kapatPencere(); return; }
        if (ev.target.closest('[data-elle-hepsi]')) { girdim(isler.flatMap(isKimlikleri)); kapatPencere(); }
      });
    },
  });
}
