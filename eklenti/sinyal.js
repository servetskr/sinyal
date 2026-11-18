// mdSinyal MEBBİS Yardımcısı · mdSinyal sayfası tarafı: sayfa ile eklenti arasında mesaj taşır.
// Yalnız aynı penceredeki mdSinyal sayfasından gelen mesajlar kabul edilir.
//
// ===== İLETİ SÖZLEŞMESİ (Yardımcı 1.12.0 ↔ mdSinyal v208) — aynı tablo js/eklenti.js başında da var; biri değişirse ikisi birlikte =====
// Taşıma: sayfa window.postMessage({kaynak:'sinyal-sayfa', tur, veri}) → bu dosya → chrome.runtime → arka.js (iş deposu) ↔ motor.js (MEBBİS sekmesi)
//         eklenti → sayfa: window.postMessage({kaynak:'sinyal-eklenti', tur, veri}). Bütün alanlar isteğe bağlıdır; bilinmeyen alan yok sayılır.
// Sayfa → Yardımcı
//   ping              {}                                   → merhaba {surum, ozellik[]} (+ biliniyorsa son harita-durum yeniden)
//   toplu             {id, isId?, kurum, cek[], dosya[], yaz[], denetle?, onay?{kim,rol,zaman,surum,kurum,sube}, parca?{no,toplam,butceDk},
//                      ayar?{<okuma>:{…}} (1.17: okuma seçenekleri, ör. fotograf {tc}, sonuclar {gun}), izle? (1.17: MEB-173 İzle kipi)}
//                     arka 'toplu-koy' → toplu-alindi {ok, id, sekme} | {mesgul:true, id (yarım iş), reddedilen (yeni iş), kalan, durum, mesaj}
//                     denetle:true → "Ekranları denetle": motor yalnız GET yapar, sonuç sonuc.veri.denetim'de
//                     kurum: motor açık MEBBİS hesabının kurum kodunu bununla karşılaştırır; uyuşmazsa hiçbir şey yazmaz (hataTur 'kurum')
//   toplu-durdur      {id}                                 → kalıcı durdurma (yalnız "Devam" sürdürür); yanıt yok, durum toplu-durum'la gelir
//   toplu-devam       {id}                                 → durdurulmuş/duran işi sürdürür ve MEBBİS sekmesini öne getirir
//   toplu-iptal       {id?}                                → iş depodan kalkar; o ana kadar yazılanlar toplu-durum {son, iptal} ile teslim edilir
//   toplu-yuk-koy     {id, yaz[]}                          → toplu-yuk-alindi {id, ok, durum, n} | {id, ok:false, neden} | {id, ok:false, mesgul, kalan}
//   toplu-sonuc-onay  {id, zaman}                          → teslim kaydı silinir (eski zamanlı onay silmez)
//   kuyruk / cek / bitenler-onay / temizle                 → "Ekranda doldur" ve tek liste yolu (mebbis.js), değişmedi
// Yardımcı → sayfa
//   merhaba           {surum, ozellik[]}
//   toplu-durum       {id, bitti, son, iptal, durum: calisiyor|durduruldu|durdu|oturum|iptal|bitti, zaman,
//                      sonuc:{adim, hata, hataTur, mebKurum? (uyuşmazlıkta açık hesabın kodu), kurum?{kod, ad, kaynak, eslesme: tam|onayli|yetkili},
//                             yardimci, harita, suruyor, olcum{basla, bitis, istek, kod{istenen, girilen, atlanan, bekleme_ms}, tur{<tür>:{n, ms}}, oturumDusme[]},
//                             ekranDegisti[{ekran, ad, eksik[], iz, kaynak, alanlar[]}],
//                             yazilan[{id, ok, not (MEBBİS mesajı ya da neden), dogrulama: liste|zaten|mesaj|alan|dosya, ekran, sure (ms), kod (sayı), hataTur, eksik[]}],
//                             veri{gruplar, kursiyerler, dosya, personel, araclar, sinavlar, denetim?{harita, yardimci, kurum, ekranlar[{kod, ad, durum: uygun|degismis|eksik|kapali|hata, eksik[], iz, not}]}},
//                             kalan? (yalnız tarayıcı kapanınca kurulan yerel teslimde)}}
//                     hataTur: oturum · ekran · ekran-dur · veri · mebbis · kod · dogrulama · kurum · dur · iptal · belirsiz · yarim
//   toplu-yuk-iste    {id, kalan[]}                        tarayıcı kapanıp kişisel yük silinince; sayfa yalnız onaylı kimlikleri yeniden hazırlar
//   ekran-degisti     {id, ekranlar[{ekran, ad, eksik[], iz, kaynak, yardimci, harita}]}   toplu-durum.sonuc.ekranDegisti'nin ayrı bildirimi
//   harita-durum      {ok, surum, ayni?} | {ok:false, neden}   mdSinyal'in /eklenti/harita.json'u arka planda denetlendi
//   toplu-alindi · toplu-yuk-alindi · kuyruk-alindi · cek-alindi · tablo · bitenler · hatalar · temizlendi
// =====
const SURUM = chrome.runtime.getManifest().version;
const OZELLIK = ['onayli-teslim', 'mesgul', 'durdur-kalici', 'harita', 'kurum', 'denetle', 'ekran-degisti', 'olcum', 'izle', 'ayar'];
const KOKLER = ['https://mdsinyal.com', 'https://www.mdsinyal.com', 'https://servetskr.github.io'];
const sayfaya = (tur, veri) => window.postMessage({ kaynak: 'sinyal-eklenti', tur, veri }, location.origin);
const gonder = m => new Promise(ok => { try { chrome.runtime.sendMessage(m, ok); } catch (x) { ok(null); } });
const mesgulMetni = r => r.durum === 'calisiyor' || r.durum === 'bekliyor'
  ? `MEBBİS’te süren bir iş var${r.kalan ? ` (${r.kalan} iş kaldı)` : ''}. Bitince yenisini gönderin.`
  : `MEBBİS’te yarım kalan bir iş var${r.kalan ? ` (${r.kalan} iş kaldı)` : ''}. MEBBİS sekmesindeki mdSinyal kartından “Devam et” ya da “İşi iptal et”i seçin, sonra yeniden gönderin.`;
let haritaSon = null;   // son harita-durum: sayfa sonradan (girişten sonra) ping atarsa yeniden verilir
window.addEventListener('message', async ev => {
  if (ev.source !== window || ev.origin !== location.origin || !ev.data || ev.data.kaynak !== 'sinyal-sayfa') return;
  const { tur, veri } = ev.data;
  if (tur === 'ping') { sayfaya('merhaba', { surum: SURUM, ozellik: OZELLIK }); if (haritaSon) sayfaya('harita-durum', haritaSon); return; }
  if (tur === 'kuyruk') { const r = await gonder({ tur: 'kuyruk-koy', isler: veri.isler, kurs: veri.kurs, oto: !!veri.oto }); const s = await gonder({ tur: 'mebbis-ac' }); return sayfaya('kuyruk-alindi', { ...r, sekme: s && s.sekme }); }
  if (tur === 'cek') { await gonder({ tur: 'hedef-koy', hedef: { tip: 'al', amac: veri.amac, zaman: Date.now(), tik: [], dogrudan: false, durum: 'gidiyor' } }); const s = await gonder({ tur: 'mebbis-ac' }); return sayfaya('cek-alindi', { sekme: s && s.sekme }); }
  if (tur === 'toplu') {
    const r = await gonder({ tur: 'toplu-koy', is: veri });
    // B9: yarım iş varken yeni iş reddedilir; sayfa "devam et ya da iptal et" diye sorar (id: yarım iş, reddedilen: yeni iş).
    // Bu durumda MEBBİS sekmesine geçilmez: yetkili soruyu mdSinyal'de görür; "Devam et" seçerse sekme o zaman açılır.
    if (r && r.mesgul) return sayfaya('toplu-alindi', { mesgul: true, id: r.id, reddedilen: veri && veri.id, kalan: r.kalan, durum: r.durum, mesaj: mesgulMetni(r) });
    const s = await gonder({ tur: 'mebbis-ac' });
    return sayfaya('toplu-alindi', { ok: !!(r && r.ok), id: veri && veri.id, sekme: s && s.sekme });
  }
  if (tur === 'toplu-iptal') { await gonder({ tur: 'toplu-iptal', id: veri && veri.id }); return; }
  if (tur === 'toplu-durdur') { await gonder({ tur: 'toplu-durdur', id: veri && veri.id }); return; }
  if (tur === 'toplu-devam') { const r = await gonder({ tur: 'toplu-devam', id: veri && veri.id }); if (r && r.ok) await gonder({ tur: 'mebbis-ac' }); return; }
  // tarayıcı kapanıp iş yükü silindiyse mdSinyal kalan işleri yeniden hazırlar; yalnız ilk onaydaki iş kimlikleri kabul edilir
  if (tur === 'toplu-yuk-koy') { const r = await gonder({ tur: 'toplu-yuk-koy', id: veri && veri.id, yaz: (veri && veri.yaz) || [] }); return sayfaya('toplu-yuk-alindi', { id: veri && veri.id, ...(r || { ok: false, neden: 'Yardımcı yanıt vermedi' }) }); }
  if (tur === 'toplu-sonuc-onay') { if (veri && veri.id) await gonder({ tur: 'toplu-sonuc-onay', id: veri.id, zaman: veri.zaman }); return; }
  if (tur === 'bitenler-onay') { await gonder({ tur: 'bitenler-sil', ids: (veri && veri.ids) || [] }); return; }
  if (tur === 'temizle') { await gonder({ tur: 'kuyruk-temizle' }); return sayfaya('temizlendi', {}); }
});
// mdSinyal'de bir kullanıcı girişli mi (giriş, tanıtım ve yükleme ekranı değil; kurs paneli açık)
const girisli = () => {
  const b = document.body; if (!b || ['ox-modu', 'portal-modu', 'sahip-modu', 'usta-modu'].some(c => b.classList.contains(c))) return false;
  return !!document.querySelector('#uyg #icerik') && !document.querySelector('#uyg .giris, #uyg .tanitim, #uyg .yukleme');
};
// B8: iş sonucu sayfaya her değiştiğinde ve sayfa girişli hâle geçince yeniden verilir; sayfa girişliyken aldıktan sonra silinir
const verilen = new Map(), teslimde = new Set();
function teslimEt(x) {
  if (teslimde.has(x.id)) return; teslimde.add(x.id);
  setTimeout(async () => { teslimde.delete(x.id); if (girisli() && verilen.get(x.id) === x.zaman + '|1') await gonder({ tur: 'teslim-tamam', id: x.id, zaman: x.zaman }); }, 2500);
}
// "ekran değişti" ayrı ileti olarak da verilir (değer yok, yalnız ekran ve alan adları); formun bütün alan listesi taşınmaz
const ekranOzeti = (x, s) => ({ ekran: String(x.ekran || '').toUpperCase(), ad: x.ad || '', eksik: (x.eksik || []).slice(0, 12), iz: x.iz || '', kaynak: x.kaynak || '', yardimci: s.yardimci || SURUM, harita: s.harita || '' });
let canliSon = null;
// MEBBİS’ten gelen tablo ve biten işler: sayfa görünür olunca ve aralıklarla sorulur
async function yokla() {
  { const c = await gonder({ tur: 'canli-al' }), d = c ? JSON.stringify(c) : ''; if (d !== canliSon) { canliSon = d; sayfaya('mebbis-oturum', c || { acik: null }); } }   // MEB-187
  const t = await gonder({ tur: 'tablo-al' }); if (t) sayfaya('tablo', t);
  const b = await gonder({ tur: 'bitenler-al' }); if (b && b.length) sayfaya('bitenler', b);
  const h = await gonder({ tur: 'hatalar-al' }); if (h && h.length) sayfaya('hatalar', h);
  const l = await gonder({ tur: 'teslim-al' });
  for (const x of l || []) {
    const g = girisli(), anahtar = x.zaman + '|' + (g ? 1 : 0);
    if (verilen.get(x.id) !== anahtar && !(g === false && verilen.get(x.id) === x.zaman + '|1')) {
      const s = x.sonuc || {};
      sayfaya('toplu-durum', { id: x.id, sonuc: x.sonuc, bitti: !!x.bitti, son: !!x.son, iptal: !!x.iptal, durum: x.durum || '', zaman: x.zaman });
      if (Array.isArray(s.ekranDegisti) && s.ekranDegisti.length) sayfaya('ekran-degisti', { id: x.id, ekranlar: s.ekranDegisti.map(y => ekranOzeti(y, s)) });
      if (x.yerel && (s.kalan || []).length) sayfaya('toplu-yuk-iste', { id: x.id, kalan: s.kalan });
      verilen.set(x.id, anahtar);
    }
    if (x.son && g) teslimEt(x);
  }
}
// Ekran alan haritası: mdSinyal kendi adresinde yayınlar (yalnız veri: ekran yolları ve alan kimlikleri). Arka plan kaynağı, sürümü ve şemayı denetler.
async function haritaGetir() {
  if (!KOKLER.includes(location.origin)) return;
  const adres = location.origin + (location.origin === 'https://servetskr.github.io' ? '/sinyal' : '') + '/eklenti/harita.json';
  try {
    const r = await fetch(adres, { cache: 'no-cache', credentials: 'omit' }); if (!r.ok) throw new Error(String(r.status));
    const metin = await r.text(); if (metin.length > 64000) throw new Error('çok büyük');
    const s = await gonder({ tur: 'harita-koy', harita: JSON.parse(metin) });
    haritaSon = s || { ok: false, neden: 'yanıt yok' };
  } catch (x) { haritaSon = { ok: false, neden: 'harita alınamadı; Yardımcı’nın gömülü haritası kullanılır' }; }
  sayfaya('harita-durum', haritaSon);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) yokla(); });
setInterval(yokla, 4000);
gonder({ tur: 'sinyal-burada' });
window.addEventListener('DOMContentLoaded', () => { sayfaya('merhaba', { surum: SURUM, ozellik: OZELLIK }); yokla(); haritaGetir(); });
