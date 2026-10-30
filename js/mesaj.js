// Mesaj merkezi: grup ya da tek tek seçilen kişilere kişiye özel WhatsApp mesajı, planlı gönderim, iletildi/okundu takibi
import { S, kaydet, gun, fark, kursiyer, egitmen, tamAd, kalanBorc, gecikenler, gecikenTutar, eksikEvrak, sonrakiDers, risk, islem, sb, aktifSiniflar, SINIFLAR, selam, kursAdi, adEk, yerelZaman, bulutKanca } from './veri.js?v=98';
import { e, tl, ik, rozet, bos, pencere, kapatPencere, bildir, tarihUzun, apiAcik, apiGonder, etiket, waSirali, ziyaretci, isaret, waIstek } from './ui.js?v=98';

const durum = { grup: 'aktif', sinif: '', ogretmen: '', secili: null, sira: 0, zaman: 'simdi', metin: null, sablon: '', ek: null, cevapIste: false };
// Ekli dosyalar localStorage’a yazılmaz (büyük olabilir); gönderim süresince bellekte durur
const EKLER = {};
const CEVAP_NOTU = '“Evet” ya da “Hayır” yazarak cevaplayabilirsiniz.';
const sonMetin = m => durum.cevapIste && !/evet/i.test(m) ? m.trim() + '\n\n' + CEVAP_NOTU : m.trim();

// Kime: akıllı gruplar (öğrenci listesi süzülür; öğretmen ve aday ayrı kişi türü)
const GRUPLAR = [
  ['aktif', 'Tüm aktif öğrenciler', k => k.asama !== 'Ehliyet'],
  ['yeni', 'Kayıt ve evrak aşaması', k => ['Kayıt', 'Evrak'].includes(k.asama)],
  ['Teorik', 'Teorik derste', k => k.asama === 'Teorik'],
  ['Direksiyon', 'Direksiyon derste', k => k.asama === 'Direksiyon'],
  ['Sınav', 'Sınav bekleyen', k => k.asama === 'Sınav'],
  ['borclu', 'Taksiti geciken', k => gecikenler(k).length > 0],
  ['evrak', 'Evrakı eksik', k => k.asama !== 'Ehliyet' && eksikEvrak(k).length > 0],
  ['sinavHafta', 'Bu hafta sınavı olan', k => S.sinavlar.some(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && fark(s.tarih) <= 7)],
  ['risk', 'Kalma riski yüksek', k => { const r = risk(k); return !!(r && r.puan >= 50); }],
  ['mezun', 'Ehliyet alanlar', k => k.asama === 'Ehliyet'],
  ['ogretmen', 'Öğretmenler', null],
  ['aday', 'Adaylar', null],
];
// Kişiye özel alanlar: metinde {ad} gibi yazılır, her kişi için ayrı dolar
const ALANLAR = [['selam', 'Hitap'], ['ad', 'Ad'], ['kurs', 'Kurs adı'], ['borc', 'Kalan borç'], ['geciken', 'Geciken tutar'], ['ders', 'Sıradaki ders'], ['ogretmen', 'Öğretmeni'], ['sinav', 'Sınavı'], ['evrak', 'Eksik evrak']];
const SABLONLAR = [
  ['Kapalı gün', '{selam} resmî tatil nedeniyle yarın {kurs} kapalı olacaktır. Yarınki dersleriniz yeniden planlanacak; yeni saatiniz size ayrıca bildirilecek.'],
  ['Sıradaki ders', '{selam} sıradaki direksiyon dersiniz {ders}, öğretmeniniz {ogretmen}. Gelemeyecekseniz bu mesajı yanıtlamanız yeterli.'],
  ['Ödeme hatırlatma', '{selam} {geciken} tutarında vadesi geçmiş taksitiniz bulunuyor; toplam kalan borcunuz {borc}. Ödeme için bu mesajı yanıtlayabilir ya da {kursa} uğrayabilirsiniz.'],
  ['Eksik evrak', '{selam} kaydınızın tamamlanması için {evrak} eksik. Belgelerin fotoğrafını bu mesaja yanıt olarak gönderebilir ya da {kursa} getirebilirsiniz.'],
  ['Sınav hatırlatma', '{selam} {sinav}. Kimliğinizi yanınıza almayı unutmayın. Başarılar!'],
  ['Katılım sorusu', '{selam} {ders} direksiyon dersinize gelebilecek misiniz?', true],
  ['Ders iptali (hava)', '{selam} bugün hava koşulları nedeniyle direksiyon dersleri yapılamayacaktır. Dersiniz için size yeni saat bildireceğiz. {kurs}'],
  ['Arkadaşını getir', '{selam} yeni teorik grubumuz önümüzdeki hafta başlıyor. Ehliyet almak isteyen bir tanıdığınız varsa bu mesajı iletebilirsiniz. {kurs}'],
  ['Öğretmen toplantısı', '{selam} yarın 08:30’da kısa bir ekip toplantımız var; katılımınızı rica ederiz. {kurs}'],
];

const sonrakiSinav = k => S.sinavlar.filter(s => s.kursiyerler.includes(k.id) && fark(s.tarih) >= 0 && !(s.sonuc || {})[k.id]).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat))[0];
// Kişi listesi: { anahtar, ad, tel, rol, tip, kisi, alt }
export function kisiler(grup = durum.grup, sinif = durum.sinif, ogr = durum.ogretmen) {
  if (grup === 'ogretmen') return S.egitmenler.map(h => ({ anahtar: 'h' + h.id, ad: h.ad, tel: h.tel, rol: 'HOCA', tip: 'ogretmen', kisi: h, alt: 'Öğretmen' }));
  if (grup === 'aday') return S.adaylar.filter(a => !['Kayıt', 'Kaybedildi'].includes(a.asama)).map(a => ({ anahtar: 'a' + a.id, ad: a.ad, tel: a.tel, rol: 'ADAY', tip: 'aday', kisi: a, alt: 'Aday · ' + a.asama }));
  const f = (GRUPLAR.find(g => g[0] === grup) || GRUPLAR[0])[2];
  return sb(S.kursiyerler).filter(k => !k.kapali && f(k) && (!sinif || k.sinif === sinif) && (!ogr || k.egitmen === ogr))
    .map(k => ({ anahtar: 'k' + k.id, ad: tamAd(k), tel: k.tel, rol: 'ÖĞRENCİ', tip: 'ogrenci', kisi: k, alt: SINIFLAR[k.sinif].ad + ' · ' + k.asama }));
}
// Bir kişi için alan değerleri (öğrenci olmayanlarda öğrenciye özel alanlar boştur)
function degerler(r) {
  const k = r.tip === 'ogrenci' ? r.kisi : null, d = k && sonrakiDers(k), s = k && sonrakiSinav(k), h = k && egitmen(k.egitmen);
  return {
    selam: r.tip === 'aday' ? selam({ ad: r.ad }) : selam(r.kisi), ad: String(r.ad).split(' ')[0], kurs: S.kurs.ad, kursa: kursAdi('e'), kursta: kursAdi('de'),
    borc: k ? tl(kalanBorc(k)) : '', geciken: k && gecikenler(k).length ? tl(gecikenTutar(k)) : '',
    ders: d ? `${tarihUzun(d.tarih)} saat ${d.saat}` : '', ogretmen: h ? h.ad : '',
    sinav: s ? `${s.tur === 'e-Sınav' ? 'e-sınavınız' : 'direksiyon sınavınız'} ${tarihUzun(s.tarih)} saat ${s.saat}, yer: ${s.yer}` : '',
    evrak: k ? eksikEvrak(k).map(x => x[1].toLocaleLowerCase('tr')).join(', ') : '',
  };
}
export const kisiyeOzel = (metin, r) => { const v = degerler(r); return metin.replace(/\{(\w+)\}/g, (x, a) => v[a] != null ? v[a] : x).replace(/\s+([.,;])/g, '$1').trim(); };
const bosKalan = (metin, r) => { const v = degerler(r); return [...new Set((metin.match(/\{(\w+)\}/g) || []).map(x => x.slice(1, -1)).filter(a => a in v && !v[a]))]; };

// Seçili kişiler: grup değişince hepsi seçili başlar; kullanıcı tek tek çıkarıp ekleyebilir
const liste = () => kisiler();
const seciliListe = () => { const l = liste(); if (!durum.secili) durum.secili = new Set(l.map(r => r.anahtar)); return l.filter(r => durum.secili.has(r.anahtar)); };

/* ---------- iletildi / okundu ---------- */
const DURUM_SIRA = { sent: 1, delivered: 2, read: 3, failed: 9 };
const DURUM_AD = { sent: 'Gönderildi', delivered: 'İletildi', read: 'Okundu', failed: 'İletilemedi' };
export const tik = id => { const d = (S.waDurum || {})[id]; if (!id) return ''; return `<span class="tik tik-${d || 'bekliyor'}" title="${DURUM_AD[d] || 'Gönderildi'}">${d === 'failed' ? '!' : d === 'delivered' || d === 'read' ? '✓✓' : '✓'}</span>`; };
let durumda = false, sonSorgu = 0;
export async function durumlariGuncelle() {
  if (durumda || !apiAcik() || Date.now() - sonSorgu < 8000) return false;
  sonSorgu = Date.now();
  const ids = [...new Set([...(S.kampanyalar || []).filter(c => fark(c.tarih) >= -7).flatMap(c => (c.sonuc || []).map(x => x.id)), ...((S.zamanli && S.zamanli.kayit) || []).map(x => x.id)])].filter(id => id && !['read', 'failed'].includes((S.waDurum || {})[id])).slice(0, 80);
  if (!ids.length) return false;
  durumda = true;
  try {
    const j = await (await waIstek('/durum?ids=' + encodeURIComponent(ids.join(',')))).json();
    if (!j.ok) return false;
    S.waDurum = S.waDurum || {}; let degisti = false;
    Object.entries(j.durum || {}).forEach(([id, d]) => { if ((DURUM_SIRA[d] || 0) > (DURUM_SIRA[S.waDurum[id]] || 0)) { S.waDurum[id] = d; degisti = true; } });
    if (degisti) kaydet();
    return degisti;
  } catch (x) { return false; } finally { durumda = false; }
}
const sayac = c => { const l = c.sonuc || [], d = x => (S.waDurum || {})[x.id]; return { gitti: l.filter(x => x.id).length, iletildi: l.filter(x => ['delivered', 'read'].includes(d(x))).length, okundu: l.filter(x => d(x) === 'read').length, hata: l.filter(x => !x.id && x.durum !== 'demo sınırı').length, sinir: l.filter(x => x.durum === 'demo sınırı').length, evet: l.filter(x => x.cevap && x.cevap.tur === 'olumlu').length, hayir: l.filter(x => x.cevap && x.cevap.tur === 'olumsuz').length, cevap: l.filter(x => x.cevap).length }; };

// Gönderildiği hâlde okunmayanlar (cevap verenler okunmuş sayılır)
const okumayan = c => (c.sonuc || []).filter(x => x.id && !x.cevap && (S.waDurum || {})[x.id] !== 'read');
// WhatsApp’tan gelen kısa cevabı (evet/hayır) gönderdiğimiz mesaja bağlar.
// Önce “yanıtla” ile hangi mesaja cevap verildiği (yanit = mesaj kimliği), yoksa son 3 günde “cevap iste” ile giden mesaj.
export function cevapIsle(x) {
  const cevap = { metin: x.metin, tur: x.cevapTur || null, zaman: x.zaman };
  const kl = S.kampanyalar || [];
  if (x.yanit) {
    for (const c of kl) { const r = (c.sonuc || []).find(y => y.id === x.yanit); if (r) { r.cevap = cevap; return { ad: r.ad, baslik: c.baslik }; } }
    const z = (S.zamanli && S.zamanli.kayit || []).find(y => y.id === x.yanit); if (z) { z.cevap = cevap; return { ad: z.kime, baslik: 'Otomatik mesaj' }; }
  }
  if (!x.cevapTur) return null;
  const c = kl.find(c => c.cevapIste && c.durum === 'gönderildi' && fark(c.tarih) >= -3 && (c.sonuc || []).some(y => y.id && !y.cevap));
  if (!c) return null;
  const r = c.sonuc.find(y => y.id && !y.cevap); r.cevap = cevap;
  return { ad: r.ad, baslik: c.baslik };
}

/* ---------- gönderim ---------- */
async function gonder(c) {
  const DEMO_SINIR = 5, sinirli = S.zamanli && S.zamanli.sinir;
  c.sonuc = [];
  for (let i = 0; i < c.kisiler.length; i++) {
    const r = c.kisiler[i];
    if (sinirli && i >= DEMO_SINIR) { c.sonuc.push({ ad: r.ad, rol: r.rol, durum: 'demo sınırı' }); continue; }
    const ek = EKLER[c.id] || c.ekVeri;
    const s = await apiGonder(etiket(r.ad, r.rol) + r.metin, ek ? { base64: ek.base64, dosya: ek.dosya, tur: ek.tur } : undefined, undefined, r);
    c.sonuc.push({ ad: r.ad, rol: r.rol, id: s.id || null, durum: s.ok ? 'gönderildi' : 'hata: ' + s.hata });
    if (!s.ok && /24 saat|ulaşılamadı/.test(s.hata || '')) { bildir(s.hata, 'uyari'); break; }
    await new Promise(z => setTimeout(z, 300));
  }
  c.durum = 'gönderildi'; c.gonderim = yerelZaman(); delete EKLER[c.id]; delete c.ekVeri; kaydet();
  const n = sayac(c);
  bildir(`${n.gitti} mesaj WhatsApp’tan gönderildi ✓${n.sinir ? ` · demo sınırı: ${n.sinir} kişi atlandı` : ''}`, 'wp');
}
// Zamanı gelen planlı mesajlar (zamanlayıcı her dakika çağırır)
export async function planlilariGonder() {
  if (!apiAcik()) return 0;
  const simdi = yerelZaman().slice(0, 16), l = (S.kampanyalar || []).filter(c => c.durum === 'planlandı' && c.planli <= simdi);
  for (const c of l) { if (bulutKanca.sahiplen && !(await bulutKanca.sahiplen('k|' + c.id))) continue; c.durum = 'gönderiliyor'; kaydet(); await gonder(c); islem('Planlı mesaj gönderildi', c.baslik + ' · ' + c.kisiler.length + ' kişi'); }
  return l.length;
}

/* ---------- ekran ---------- */
export function yeniMesajHtml() {
  const l = liste(), sec = seciliListe(), ogrenciGrubu = !['ogretmen', 'aday'].includes(durum.grup);
  if (durum.metin == null) durum.metin = SABLONLAR[0][1];
  const r = sec[Math.min(durum.sira, Math.max(0, sec.length - 1))];
  const bosOlan = sec.filter(x => bosKalan(durum.metin, x).length);
  const kmp = (S.kampanyalar || []).slice(0, 12);
  return `<div class="izgara iz-21 mm">
  <div class="kart"><div class="kart-bas"><h3>Yeni mesaj</h3><small>Kişiye özel, WhatsApp’tan</small></div><div class="kart-govde mm-govde">
    <div class="mm-adim"><span class="et">1 · Kime?</span>
      <div class="secim mm-gruplar">${GRUPLAR.map(([v, t]) => `<label><input type="radio" name="mm-grup" value="${v}" ${durum.grup === v ? 'checked' : ''}><span>${t}<b>${kisiler(v, durum.sinif, durum.ogretmen).length}</b></span></label>`).join('')}</div>
      ${ogrenciGrubu ? `<div class="mm-suz"><select class="girdi" data-mm-sinif aria-label="Sınıf"><option value="">Bütün sınıflar</option>${aktifSiniflar().map(([k, v]) => `<option value="${k}" ${durum.sinif === k ? 'selected' : ''}>${e(v.ad)}</option>`).join('')}</select><select class="girdi" data-mm-ogretmen aria-label="Öğretmen"><option value="">Bütün öğretmenler</option>${S.egitmenler.map(h => `<option value="${h.id}" ${durum.ogretmen === h.id ? 'selected' : ''}>${e(h.ad)}</option>`).join('')}</select></div>` : ''}
      <details class="mm-kisiler" ${l.length <= 8 ? 'open' : ''}><summary><b>${sec.length}</b> / ${l.length} kişi seçili · listeyi gör, tek tek çıkar</summary>
        <div class="mm-kisi-ust"><button type="button" class="dg dg-hafif dg-kucuk" data-mm-hepsi="1">Hepsini seç</button><button type="button" class="dg dg-hafif dg-kucuk" data-mm-hepsi="0">Hiçbirini</button></div>
        <ul>${l.map(x => `<li><label><input type="checkbox" data-mm-kisi="${x.anahtar}" ${durum.secili.has(x.anahtar) ? 'checked' : ''}><span><b>${e(x.ad)}</b><small>${e(x.alt)}</small></span></label></li>`).join('') || `<li>${bos('Bu grupta kimse yok', 'Başka bir grup seçin.')}</li>`}</ul></details>
    </div>
    <div class="mm-adim"><span class="et">2 · Ne yazalım?</span>
      <div class="mm-sablonlar">${SABLONLAR.map(([ad], i) => `<button type="button" class="dg dg-cizgi dg-kucuk ${durum.sablon === ad ? 'secili' : ''}" data-mm-sablon="${i}">${e(ad)}</button>`).join('')}</div>
      <textarea class="girdi mm-metin" data-mm-metin aria-label="Mesaj metni">${e(durum.metin)}</textarea>
      <div class="mm-alanlar"><small>Kişiye özel alan ekle:</small>${ALANLAR.map(([a, t]) => `<button type="button" data-mm-alan="${a}">${t}</button>`).join('')}</div>
      <div class="mm-ek-satir">${durum.ek ? `<span class="mm-ek">${ik('belge')}<b>${e(durum.ek.dosya)}</b><small>${Math.round(durum.ek.boyut / 1024)} KB</small><button type="button" class="dg-ikon" data-mm-ek-sil aria-label="Eki kaldır">${ik('kapat')}</button></span>` : `<label class="dg dg-cizgi dg-kucuk mm-ek-ekle">${ik('belge')}Dosya ekle<input type="file" accept="application/pdf,image/jpeg,image/png" data-mm-ek hidden></label><small>PDF ya da görsel · ders programı, duyuru afişi…</small>`}
        <label class="mm-cevap"><input type="checkbox" data-mm-cevap ${durum.cevapIste ? 'checked' : ''}><span>Cevap iste <small>(Evet / Hayır)</small></span></label></div>
      ${bosOlan.length ? `<p class="ipucu mm-uyari">${isaret('uyari', 18)}<span>${bosOlan.length} kişide ${[...new Set(bosOlan.flatMap(x => bosKalan(durum.metin, x)))].map(a => '“' + (ALANLAR.find(z => z[0] === a) || [a, a])[1].toLocaleLowerCase('tr') + '”').join(', ')} boş kalıyor. <button type="button" class="dg-baglanti" data-mm-bosu-cikar>Onları listeden çıkar</button></span></p>` : ''}
    </div>
    <div class="mm-adim"><span class="et">3 · Ne zaman?</span>
      <div class="secim"><label><input type="radio" name="mm-zaman" value="simdi" ${durum.zaman === 'simdi' ? 'checked' : ''}><span>Şimdi</span></label><label><input type="radio" name="mm-zaman" value="plan" ${durum.zaman === 'plan' ? 'checked' : ''}><span>İleri bir saate planla</span></label></div>
      ${durum.zaman === 'plan' ? `<input class="girdi mm-saat" type="datetime-local" data-mm-saat value="${durum.planli || gun(1) + 'T09:00'}" min="${yerelZaman().slice(0, 16)}">` : ''}
    </div>
    <div class="mm-gonder"><span>${sec.length} kişiye${durum.zaman === 'plan' ? ' planlanacak' : ' gidecek'}${S.zamanli && S.zamanli.sinir && apiAcik() && sec.length > 5 && durum.zaman !== 'plan' ? ' · demo: ilk 5’i gönderilir' : ''}</span><button type="button" class="dg dg-wp" data-mm-gonder ${sec.length ? '' : 'disabled'}>${ik('wp')}${durum.zaman === 'plan' ? 'Planla' : 'Gönder'}</button></div>
  </div></div>
  <div class="mm-sag">
    <div class="kart mm-onizleme"><div class="kart-bas"><h3>Önizleme</h3><small>${r ? e(r.ad) : '—'}</small>${sec.length > 1 ? `<div class="sag mm-oklar"><button type="button" class="dg-ikon" data-mm-sira="-1" aria-label="Önceki kişi">‹</button><span>${Math.min(durum.sira, sec.length - 1) + 1}/${sec.length}</span><button type="button" class="dg-ikon" data-mm-sira="1" aria-label="Sonraki kişi">›</button></div>` : ''}</div>
      <div class="mm-telefon">${r ? `<div class="balon giden">${durum.ek ? `<span class="mm-balon-ek">${ik('belge')}${e(durum.ek.dosya)}</span>` : ''}<span class="mm-balon-metin">${e(sonMetin(kisiyeOzel(durum.metin, r)))}</span></div>` : `<p style="color:var(--soluk);text-align:center">Kişi seçin</p>`}</div>
      <p class="mm-not">Her kişiye kendi adı ve bilgileriyle gider. SMS programındaki gibi tek tek yazmanız gerekmez.</p></div>
    <div class="kart"><div class="kart-bas"><h3>Gönderilen mesajlar</h3><small>İletildi ve okundu bilgisiyle</small></div>
      <ul class="liste mm-gecmis">${kmp.map(c => { const n = sayac(c); return `<li><button type="button" data-mm-kampanya="${c.id}"><span><b>${e(c.baslik)}</b><small>${c.durum === 'planlandı' ? 'Planlandı · ' + tarihUzun(c.planli.slice(0, 10)) + ' ' + c.planli.slice(11, 16) : (c.gonderim || '').slice(11, 16) + ' · ' + c.kisiler.length + ' kişi'}</small></span>${c.durum === 'planlandı' ? rozet('Planlı', 'mavi') : c.durum === 'demo' ? rozet('Demo', 'notr') : c.cevapIste && n.cevap ? `<span class="mm-say"><i class="mm-evet">Evet ${n.evet}</i><i class="mm-hayir">Hayır ${n.hayir}</i></span>` : `<span class="mm-say"><i title="Gönderildi">✓ ${n.gitti}</i><i class="tik-delivered" title="İletildi">✓✓ ${n.iletildi}</i><i class="tik-read" title="Okundu">✓✓ ${n.okundu}</i></span>`}</button></li>`; }).join('') || `<li>${bos('Henüz mesaj gönderilmedi', 'Gönderdiğiniz her mesajın kime iletildiğini ve kimin okuduğunu burada görürsünüz.')}</li>`}</ul></div>
  </div></div>`;
}

export function yeniMesajBagla(k, yenile) {
  const kok = k.querySelector('.mm'); if (!kok) return;
  const ta = kok.querySelector('[data-mm-metin]');
  kok.addEventListener('change', ev => {
    const t = ev.target;
    if (t.name === 'mm-grup') { durum.grup = t.value; durum.secili = null; durum.sira = 0; return yenile(); }
    if (t.matches('[data-mm-sinif]')) { durum.sinif = t.value; durum.secili = null; durum.sira = 0; return yenile(); }
    if (t.matches('[data-mm-ogretmen]')) { durum.ogretmen = t.value; durum.secili = null; durum.sira = 0; return yenile(); }
    if (t.matches('[data-mm-kisi]')) { durum.secili[t.checked ? 'add' : 'delete'](t.dataset.mmKisi); durum.sira = 0; return yenile(); }
    if (t.name === 'mm-zaman') { durum.zaman = t.value; return yenile(); }
    if (t.matches('[data-mm-saat]')) durum.planli = t.value;
    if (t.matches('[data-mm-cevap]')) { durum.cevapIste = t.checked; return yenile(); }
    if (t.matches('[data-mm-ek]') && t.files[0]) {
      const f = t.files[0];
      if (!/^(application\/pdf|image\/(jpeg|png))$/.test(f.type)) return bildir('Yalnız PDF, JPG ya da PNG eklenebilir', 'uyari');
      if (f.size > 5 * 1024 * 1024) return bildir('Dosya 5 MB’tan büyük olamaz (WhatsApp sınırı)', 'uyari');
      const rd = new FileReader(); rd.onload = () => { durum.ek = { base64: String(rd.result).split(',')[1], dosya: f.name, tur: f.type, boyut: f.size }; yenile(); }; rd.readAsDataURL(f);
    }
  });
  // yazarken önizleme anında güncellenir (sayfa yeniden çizilmeden)
  ta.addEventListener('input', () => { durum.metin = ta.value; durum.sablon = ''; const sec = seciliListe(), r = sec[Math.min(durum.sira, sec.length - 1)], b = kok.querySelector('.mm-telefon .mm-balon-metin'); if (b && r) b.textContent = sonMetin(kisiyeOzel(durum.metin, r)); });
  ta.addEventListener('blur', () => { if (seciliListe().some(x => bosKalan(durum.metin, x).length) !== !!kok.querySelector('.mm-uyari')) yenile(); });
  kok.addEventListener('click', ev => {
    const t = ev.target;
    const sb2 = t.closest('[data-mm-sablon]'); if (sb2) { const [ad, m, cvp] = SABLONLAR[+sb2.dataset.mmSablon]; durum.metin = m; durum.sablon = ad; if (cvp) durum.cevapIste = true; return yenile(); }
    if (t.closest('[data-mm-ek-sil]')) { durum.ek = null; return yenile(); }
    const al = t.closest('[data-mm-alan]'); if (al) { const s = ta.selectionStart ?? ta.value.length, x = '{' + al.dataset.mmAlan + '}'; ta.value = ta.value.slice(0, s) + x + ta.value.slice(ta.selectionEnd ?? s); durum.metin = ta.value; durum.sablon = ''; return yenile(); }
    const hp = t.closest('[data-mm-hepsi]'); if (hp) { durum.secili = new Set(hp.dataset.mmHepsi === '1' ? liste().map(r => r.anahtar) : []); durum.sira = 0; return yenile(); }
    const sr = t.closest('[data-mm-sira]'); if (sr) { const n = seciliListe().length; durum.sira = (durum.sira + +sr.dataset.mmSira + n) % n; return yenile(); }
    if (t.closest('[data-mm-bosu-cikar]')) { seciliListe().forEach(x => { if (bosKalan(durum.metin, x).length) durum.secili.delete(x.anahtar); }); durum.sira = 0; return yenile(); }
    const kp = t.closest('[data-mm-kampanya]'); if (kp) return kampanyaAc(kp.dataset.mmKampanya, yenile);
    if (t.closest('[data-mm-gonder]')) return gonderTikla(yenile);
  });
}

function gonderTikla(yenile) {
  const sec = seciliListe(), m = durum.metin.trim();
  if (!sec.length) return bildir('Önce kişi seçin', 'uyari');
  if (!m) return bildir('Mesajı yazın', 'uyari');
  // kişiye özel alanı boş kalan varsa yarım cümle gitmesin: önce sor
  const bosOlan = sec.filter(r => bosKalan(m, r).length);
  if (bosOlan.length) {
    return pencere({ baslik: 'Bazı kişilerde bilgi eksik', icerik: `<p style="font-size:14.5px">${bosOlan.length} kişide mesajdaki ${[...new Set(bosOlan.flatMap(r => bosKalan(m, r)))].map(a => '“' + (ALANLAR.find(z => z[0] === a) || [a, a])[1].toLocaleLowerCase('tr') + '”').join(', ')} bilgisi yok; bu kişilere mesaj yarım cümleyle gider.</p><ul class="liste" style="max-height:36vh;overflow:auto;margin-top:10px">${bosOlan.map(r => `<li>${e(r.ad)}</li>`).join('')}</ul>`,
      altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${bosOlan.length < sec.length ? `<button class="dg dg-ana" data-bos-cikar>Onları çıkar, ${sec.length - bosOlan.length} kişiye gönder</button>` : ''}`,
      onAc(d) { const b = d.querySelector('[data-bos-cikar]'); if (b) b.addEventListener('click', () => { bosOlan.forEach(r => durum.secili.delete(r.anahtar)); kapatPencere(); gonderTikla(yenile); }); } });
  }
  const kisilerL = sec.map(r => ({ ad: r.ad, tel: r.tel, rol: r.rol, metin: sonMetin(kisiyeOzel(m, r)) }));
  const baslik = durum.sablon || (GRUPLAR.find(g => g[0] === durum.grup) || [0, 'Mesaj'])[1];
  const c = { id: 'm' + Date.now(), tarih: gun(0), baslik, sablon: sonMetin(m), grup: durum.grup, kisiler: kisilerL, durum: 'hazır', cevapIste: durum.cevapIste, ekAd: durum.ek ? durum.ek.dosya : null };
  if (durum.ek) EKLER[c.id] = durum.ek;
  S.kampanyalar = S.kampanyalar || [];
  if (durum.zaman === 'plan') {
    const p = (durum.planli || gun(1) + 'T09:00');
    if (p <= yerelZaman().slice(0, 16)) return bildir('İleri bir tarih ve saat seçin', 'uyari');
    if (durum.ek && durum.ek.boyut > 900 * 1024) return bildir('Planlı mesaja en çok 900 KB dosya eklenebilir; daha büyük dosyayı hemen gönderin', 'uyari');
    if (durum.ek) { c.ekVeri = durum.ek; delete EKLER[c.id]; }
    Object.assign(c, { durum: 'planlandı', planli: p }); S.kampanyalar.unshift(c); islem('Mesaj planladı', baslik + ' · ' + sec.length + ' kişi'); kaydet();
    bildir(`${sec.length} kişiye ${tarihUzun(p.slice(0, 10))} ${p.slice(11, 16)}’de gidecek`); return yenile();
  }
  S.kampanyalar.unshift(c); islem('Mesaj gönderdi', baslik + ' · ' + sec.length + ' kişi');
  if (ziyaretci() || !apiAcik()) { c.durum = ziyaretci() ? 'demo' : 'elle'; c.gonderim = yerelZaman(); kaydet(); waSirali(kisilerL.map(x => ({ ...x, tur: baslik })), baslik, { bitince: () => yenile() }); return yenile(); }
  c.durum = 'gönderiliyor'; durum.ek = null; kaydet(); yenile();
  gonder(c).then(() => yenile());
}

function kampanyaAc(id, yenile) {
  const c = (S.kampanyalar || []).find(x => x.id === id); if (!c) return;
  const n = sayac(c), dd = x => (S.waDurum || {})[x.id];
  pencere({
    baslik: c.baslik, genis: true,
    icerik: `${c.durum === 'planlandı' ? `<p class="ipucu" style="margin-bottom:12px">${isaret('bilgi', 18)}<span>${tarihUzun(c.planli.slice(0, 10))} ${c.planli.slice(11, 16)}’de ${c.kisiler.length} kişiye gidecek. Sinyal açık bir cihazda o saatte kendiliğinden gönderilir.</span></p>` : `<div class="mm-ozet"><div><b>${n.gitti}</b><small>Gönderildi</small></div><div><b>${n.iletildi}</b><small>İletildi</small></div><div><b>${n.okundu}</b><small>Okundu</small></div>${n.sinir ? `<div><b>${n.sinir}</b><small>Demo sınırı</small></div>` : ''}</div>`}
      ${c.cevapIste && c.durum !== 'planlandı' ? `<div class="mm-ozet" style="margin-top:10px"><div class="mm-evet"><b>${n.evet}</b><small>Evet</small></div><div class="mm-hayir"><b>${n.hayir}</b><small>Hayır</small></div><div><b>${Math.max(0, n.gitti - n.cevap)}</b><small>Cevap vermedi</small></div></div>` : ''}
      <p class="et" style="margin-top:14px">${c.kisiler[0] ? 'Örnek: ' + e(adEk(c.kisiler[0].ad, 'e')) + ' giden mesaj' : 'Mesaj'}${c.ekAd ? ' · ek: ' + e(c.ekAd) : ''}</p><div class="balon giden" style="max-width:100%;white-space:pre-line;margin-bottom:14px">${e(c.kisiler[0] ? c.kisiler[0].metin : c.sablon)}</div>
      <ul class="liste" style="max-height:44vh;overflow:auto">${(c.sonuc && c.sonuc.length ? c.sonuc : c.kisiler.map(x => ({ ad: x.ad, rol: x.rol, durum: c.durum }))).map(x => `<li><span style="flex:1"><b style="color:var(--murekkep)">${e(x.ad)}</b><small style="display:block;color:var(--soluk)">${e(x.rol === 'ÖĞRENCİ' ? 'Öğrenci' : x.rol === 'HOCA' ? 'Öğretmen' : x.rol === 'ADAY' ? 'Aday' : x.rol)}</small></span><span class="sag">${x.cevap ? `<span class="mm-cevap-rozet ${x.cevap.tur === 'olumlu' ? 'mm-evet' : x.cevap.tur === 'olumsuz' ? 'mm-hayir' : ''}" title="${e(x.cevap.metin)}">“${e(x.cevap.metin.slice(0, 24))}”</span>` : ''}${x.id ? `${tik(x.id)} <small>${DURUM_AD[dd(x)] || 'Gönderildi'}</small>` : rozet(x.durum, /sınır|planlandı|demo|elle/.test(x.durum) ? 'notr' : 'kirmizi')}</span></li>`).join('')}</ul>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:10px">“Okundu” bilgisi, kişi WhatsApp’ta okundu bilgisini kapatmadıysa görünür.</p>`,
    altlik: c.durum === 'planlandı' ? `<button class="dg dg-cizgi" data-mm-iptal>Planı iptal et</button><button class="dg dg-ana" data-kapat>Tamam</button>` : `${okumayan(c).length ? `<button class="dg dg-cizgi" data-mm-hatirlat>${ik('wp')}Okumayanlara hatırlat (${okumayan(c).length})</button>` : ''}<button class="dg dg-ana" data-kapat>Tamam</button>`,
    onAc(d) {
      const ht = d.querySelector('[data-mm-hatirlat]'); if (ht) ht.addEventListener('click', () => {
        const l = okumayan(c), k2 = { id: 'm' + Date.now(), tarih: gun(0), baslik: 'Hatırlatma · ' + c.baslik, sablon: 'Hatırlatma: ' + c.sablon, grup: c.grup, cevapIste: c.cevapIste, kisiler: l.map(x => { const k0 = c.kisiler.find(y => y.ad === x.ad) || x; return { ad: k0.ad, tel: k0.tel, rol: k0.rol, metin: 'Hatırlatma: ' + (k0.metin || c.sablon) }; }), durum: 'gönderiliyor' };
        S.kampanyalar.unshift(k2); islem('Okumayanlara hatırlattı', c.baslik + ' · ' + l.length + ' kişi'); kaydet(); kapatPencere(); yenile();
        if (ziyaretci() || !apiAcik()) { k2.durum = 'demo'; kaydet(); return waSirali(k2.kisiler.map(x => ({ ...x, tur: k2.baslik })), k2.baslik, { bitince: () => yenile() }); }
        gonder(k2).then(() => yenile());
      });
      const ip = d.querySelector('[data-mm-iptal]'); if (ip) ip.addEventListener('click', () => { S.kampanyalar = S.kampanyalar.filter(x => x !== c); islem('Planlı mesajı iptal etti', c.baslik); kaydet(); kapatPencere(); bildir('Planlı mesaj iptal edildi'); yenile(); }); },
  });
}
