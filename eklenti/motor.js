// mdSinyal MEBBİS Yardımcısı · arka plan motoru (yalnız üst çerçeve, MEBBİS sekmesinde).
// Yetkili işi mdSinyal'de bir kez onaylar; motor onaylanan işi kursun kendi MEBBİS oturumunda, ekran açmadan yürütür:
//  - Çekme: dönem grupları, bütün kursiyerler (her öğrenci durumu ayrı sorgulanır), aday dosyaları, personel, araçlar, sınav sonuçları.
//  - Yazma: kayıtları sırayla ilgili formlara yazar, kaydeder ve mümkün olan yerde MEBBİS listesinden geri okuyarak doğrular.
// Güvenlik kodunu her zaman yetkili yazar (kod otomatik çözülmez). Yetkili istediği an durdurur; durdurulan iş kendiliğinden yeniden başlamaz.
// Güvenceler (1.12.0; 1.13.0 ile düğme beyaz listesi, seçenek denetimi, 09 ile kayıt denetimi, 04003 bütün kodlar + Excel):
//  - Başarı: önce olumsuz mesaj aranır ("başarısız", "kaydedilemedi", "hata"…), sonra olumlu; yalnız mesajla biten kayıt "mesaj" doğrulamasıyla işaretlenir.
//  - Ekran: beklenen alan, düğme ya da tablo yoksa hiçbir değer yanlış adla gönderilmez; iş o ekranda durur ve mdSinyal'e "ekran değişti" bildirilir.
//  - Kurum: açık MEBBİS hesabının kurum kodu işin kurum koduyla uyuşmazsa hiçbir şey yazılmaz; okunamazsa yetkiliye sorulur.
//  - Alan haritası: ekran yolları ve alan kimlikleri aşağıdaki gömülü haritadadır; mdSinyal'den gelen daha yeni harita (yalnız veri) arka planda denetlenip kullanılır.
// MEBBİS ASP.NET WebForms: her istek formun bütün alanlarını (ViewState dahil) geri gönderir; seçim kutularının bir kısmı sayfayı yeniler (postback).
// İstekler insan hızında, sırayla gider.
// İleti sözleşmesi (toplu iş yükü, toplu-durum sonucu, hataTur, olcum, ekranDegisti, veri.denetim): eklenti/sinyal.js başındaki tablo.
(() => {
  if (window !== window.top || window.__sinyalMotor) return; window.__sinyalMotor = true;
  const KOK = location.origin;
  const SURUM = (() => { try { return chrome.runtime.getManifest().version; } catch (x) { return '0'; } })();
  const gonder = m => new Promise(ok => { try { chrome.runtime.sendMessage(m, ok); } catch (x) { ok(null); } });
  const uyku = ms => new Promise(ok => setTimeout(ok, ms));
  const ARA = 1100;   // iki istek arası bekleme (ms)
  const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
  const kucuk = s => String(s || '').toLocaleLowerCase('tr');
  const metin = el => String(el ? el.textContent : '').replace(/\s+/g, ' ').trim();

  /* ---------- alan haritası (gömülü). Yalnız ekran yolları, alan kimlikleri, seçenek değerleri ve kısa eşleme metinleri; kod yok ---------- */
  // zorunlu: ekran ilk açıldığında (GET) bulunması gereken alanlar; ön denetim bunlara bakar. alan: { kodda geçen ad: MEBBİS'teki gerçek ad }
  const HARITA_VARSAYILAN = {
    surum: '2026.11.18-1', enAzYardimci: '1.12.0',
    ekran: {
      skt01001: { ad: 'SKT01001 Kurum Bilgileri', yol: '/SKT/skt01001.aspx', zorunlu: [] },
      skt01002: { ad: 'SKT01002 Kurum Araç Giriş', yol: '/SKT/skt01002.aspx', zorunlu: ['dropTurSecim'] },
      skt01005: { ad: 'SKT01005 Uygulama Sınavı Randevu Girişi', yol: '/SKT/skt01005.aspx', zorunlu: ['cmbSinavTarihi', 'cmbSertifika', 'btnListele', 'btnRandevu', 'hiddenKaydet'] },
      skt02001: { ad: 'SKT02001 Aday Dönem Kayıt', yol: '/SKT/skt02001.aspx', zorunlu: ['Button1'] },
      skt02002: { ad: 'SKT02002 Aday Fotoğraf Kayıt', yol: '/SKT/skt02002.aspx', zorunlu: ['cmbEgitimDonemi', 'cmbAdayAdSoyad', 'ButtonSave'] },
      skt02003: { ad: 'SKT02003 Öğrenim Bilgisi', yol: '/SKT/skt02003.aspx', zorunlu: ['cmbEgitimDonemi', 'cmbAdayAdSoyad'] },
      skt02004: { ad: 'SKT02004 Sağlık Raporu', yol: '/SKT/skt02004.aspx', zorunlu: ['cmbEgitimDonemi', 'cmbAdayAdSoyad'] },
      skt02005: { ad: 'SKT02005 Adli Sicil', yol: '/SKT/skt02005.aspx', zorunlu: ['cmbEgitimDonemi', 'cmbAdayAdSoyad'] },
      skt02006: { ad: 'SKT02006 Dönem Adaylarını Onaylama', yol: '/SKT/skt02006.aspx', zorunlu: ['cmbEgitimDonemi', 'cmbDurumu', 'cmbOgrenciDurumu', 'btnListele'] },
      skt02007: { ad: 'SKT02007 e-Sınav Başvuru', yol: '/SKT/skt02007.aspx', zorunlu: ['btnUcretListe', 'txtTcKimlikNo', 'btnTCGetir', 'cmbEgitimDonemi', 'cmbIstenenEhliyetSinifi', 'hiddenKaydet'] },
      skt02009: { ad: 'SKT02009 Aday Durum Görüntüleme', yol: '/SKT/skt02009.aspx', zorunlu: ['txtTcKimlikNo', 'ImageButton1'] },
      skt02010: { ad: 'SKT02010 Parmak İzi', yol: '/SKT/SKT02010.aspx', zorunlu: ['cmbEgitimDonemi', 'cmbAdayAdSoyad'] },
      skt02011: { ad: 'SKT02011 Sözleşme', yol: '/SKT/skt02011.aspx', zorunlu: ['cmbEgitimDonemi', 'cmbAdayAdSoyad'] },
      skt02013: { ad: 'SKT02013 Fatura Kayıt', yol: '/SKT/skt02013.aspx', zorunlu: ['cmbEgitimDonemi', 'txtTC', 'btnTC', 'hiddenKaydet'] },
      skt03001: { ad: 'SKT03001 Dönem Grup Açılış', yol: '/SKT/skt03001.aspx', zorunlu: ['cmbDonemi', 'cmbGrupAdi', 'Us_tarih1_txtTarihGiris', 'cmbKurumOnayDurumu', 'hiddenKaydet'] },
      skt03002: { ad: 'SKT03002 Grup Şube Tanımlama', yol: '/SKT/skt03002.aspx', zorunlu: ['cmbDonemi', 'cmbGrupAdi', 'cmbSubesi', 'cmbKurumOnayDurumu', 'hiddenKaydet'] },
      skt03003: { ad: 'SKT03003 Teorik Ders Programı Giriş', yol: '/SKT/skt03003.aspx', zorunlu: ['cmbDonemi', 'cmbGrupAdi', 'cmbSubesi', 'btnListeleGrid', 'hiddenKaydet'] },
      skt03004: { ad: 'SKT03004 Direksiyon Ders Programı Giriş', yol: '/SKT/skt03004.aspx', zorunlu: ['cmbDonem', 'cmbGrup', 'cmbSube', 'btnAdayGetir', 'hiddenKaydet'] },
      skt04003: { ad: 'SKT04003 Sınav Bilgileri Görüntüleme', yol: '/SKT/skt04003.aspx', zorunlu: ['cmbSinavTuru'] },
      skt04001: { ad: 'SKT04001 Teorik Ders Programı Görüntüleme', yol: '/SKT/skt04001.aspx', zorunlu: ['cmbDonemi', 'btnListeleGrid'] },
      skt04002: { ad: 'SKT04002 Direksiyon Ders Programı Görüntüleme', yol: '/SKT/skt04002.aspx', zorunlu: ['cmbKurum'] },
      ook00001: { ad: 'OOK00001', yol: '/Ookgm/ook00001.aspx', zorunlu: [] },
      ook12001: { ad: 'OOK12001 Personel Arama', yol: '/Ookgm/ook12001.aspx', zorunlu: [] },
      ook54001: { ad: 'OOK54001 Personel', yol: '/Ookgm/ook54001.aspx', zorunlu: [] },
    },
    // cmbDurumu: 0 kurum onay bekliyor, 1 kurum onaylandı, 4 döneme kayıtlı tüm adaylar · cmbOgrenciDurumu 0 = "Kursa Başvuru Aşamasında" ("tümü" seçeneği YOK; 17 Kas canlı)
    // cmbEgitimDonemi 1 = "-Tüm Dönemler-" · dropTurSecim 1 araç, 2 simülatör · cmbSinavTuru 2 uygulama, 3 e-sınav · OOK12001 cmbPersonelDurum 1 Görevde
    deger: { durumKurumBekliyor: '0', durumKurumOnayli: '1', durumTumu: '4', ogrenciBasvuru: '0', tumDonemler: '1', turArac: '1', turSimulator: '2', sinavUygulama: '2', sinavEsinav: '3', sonDurumlar: '5,6,11', personelGorevde: '1' },
    metin: { izinNo: 'İzin No:', onaylandi: 'Onaylandı', tamam: 'Tamam', grup: 'Grup ', grupTire: 'Grup-', sube: ' Ş', subeUzun: ' ŞUBES', normal: 'Normal' },
  };
  const surumSayi = s => { const m = String(s || '').match(/^(\d{4})\.(\d{2})\.(\d{2})-(\d{1,3})$/); return m ? m.slice(1).map(Number) : [0, 0, 0, 0]; };
  const surumKarsilastir = (a, b) => { const x = surumSayi(a), y = surumSayi(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  function birlestir(a, b) {
    const ekran = {};
    for (const k of new Set([...Object.keys(a.ekran), ...Object.keys(b.ekran || {})])) { const x = a.ekran[k] || {}, y = (b.ekran || {})[k] || {}; ekran[k] = { ...x, ...y, alan: { ...(x.alan || {}), ...(y.alan || {}) } }; }
    return { surum: b.surum, enAzYardimci: b.enAzYardimci, ekran, deger: { ...a.deger, ...(b.deger || {}) }, metin: { ...a.metin, ...(b.metin || {}) } };
  }
  let H = HARITA_VARSAYILAN, haritaKaynak = 'gömülü';
  // arka plan yalnız denetimden geçmiş haritayı verir; gömülüden eskiyse kullanılmaz (geri alma olmasın)
  async function haritaYukle() {
    H = HARITA_VARSAYILAN; haritaKaynak = 'gömülü';
    const r = await gonder({ tur: 'harita-al' });
    if (r && r.harita && surumKarsilastir(r.harita.surum, HARITA_VARSAYILAN.surum) > 0) { H = birlestir(HARITA_VARSAYILAN, r.harita); haritaKaynak = 'web'; }
  }
  const D = k => String(H.deger[k] ?? HARITA_VARSAYILAN.deger[k]);
  const M = k => String(H.metin[k] ?? HARITA_VARSAYILAN.metin[k]);
  const ekranKodu = yol => String(yol || '').split('?')[0].split('/').pop().replace(/\.aspx$/i, '').toLowerCase();
  const ekranAd = kod => String((H.ekran[kod] || {}).ad || String(kod || '').toUpperCase() || 'MEBBİS');
  const yolOf = yol => { const e = H.ekran[ekranKodu(yol)]; return e && e.yol ? e.yol : yol; };
  const A = (doc, ad) => { const e = H.ekran[doc && doc.__ekran]; return (e && e.alan && e.alan[ad]) || ad; };

  /* ---------- hata sınıfları ---------- */
  // oturum: yeniden girişte sürer · ekran: alan/düğme/tablo/form yok · veri: seçenek ya da aday yok, MEBBİS reddetti · mebbis: genel hata sayfası
  // kod: güvenlik kodu girilmedi · dogrulama: kaydedildi ama listede yok · kurum: yanlış kurum hesabı · dur/iptal: yetkili durdurdu
  class MebHata extends Error { constructor(m, tur, ek) { super(m); this.tur = tur || 'hata'; Object.assign(this, ek || {}); } }
  const DURDURAN = new Set(['oturum', 'dur', 'iptal', 'kurum', 'ekran-dur']);
  const durduran = x => !!x && DURDURAN.has(x.tur);
  const KAPALI = /giri[şs]e kapal|giri[şs]ine kapal|kapal[ıi]d[ıi]r|i[şs]leme kapal|kapat[ıi]lm[ıi][şs]/;
  const formAdlari = doc => { const f = anaForm(doc); return f ? [...new Set([...f.querySelectorAll('input, select, textarea, table[id]')].map(el => el.name || el.id).filter(x => x && !/^__/.test(x)))].sort() : []; };
  function ekranHata(doc, ad, ne = 'alanı') {
    const govde = kucuk(metin(doc && doc.body)), kap = govde.match(KAPALI);
    if (kap) { const i = Math.max(0, kap.index - 60); return new MebHata(`MEBBİS ${ekranAd(doc.__ekran)} ekranını şu an girişe kapatmış: “${metin(doc.body).slice(i, i + 140)}”`, 'veri'); }
    return new MebHata(`MEBBİS ekranı değişmiş görünüyor: ${ekranAd(doc && doc.__ekran)} ekranında “${ad}” ${ne} bulunamadı. Bu kayıt gönderilmedi; mdSinyal’e bildirildi.`, 'ekran', { ekran: doc && doc.__ekran, eksik: [ad], alanlar: formAdlari(doc).slice(0, 150) });
  }
  // iş sırasında görülen ekran değişiklikleri (değer yok, yalnız alan adları) sonuca eklenir
  let ekranOlaylari = [];
  const ekranKaydet = h => { if (!h || h.tur !== 'ekran') return; if (ekranOlaylari.some(x => x.ekran === h.ekran && x.eksik.join() === (h.eksik || []).join())) return; ekranOlaylari.push({ ekran: h.ekran || '', ad: ekranAd(h.ekran), eksik: h.eksik || [], alanlar: h.alanlar || [], kaynak: 'is', zaman: Date.now() }); };

  /* ---------- istek katmanı ---------- */
  // MEBBİS sayfaları windows-1254; form verisi de aynı kodlamayla gönderilir (tarayıcının kendi form gönderimi gibi)
  const TR = { 'ç': 0xE7, 'Ç': 0xC7, 'ğ': 0xF0, 'Ğ': 0xD0, 'ı': 0xFD, 'İ': 0xDD, 'ö': 0xF6, 'Ö': 0xD6, 'ş': 0xFE, 'Ş': 0xDE, 'ü': 0xFC, 'Ü': 0xDC };
  const hex = b => '%' + b.toString(16).toUpperCase().padStart(2, '0');
  function kodla(s) {
    let o = '';
    for (const c of String(s ?? '')) {
      const k = c.codePointAt(0);
      if (/[A-Za-z0-9*\-._]/.test(c)) o += c; else if (c === ' ') o += '+'; else if (k < 128) o += hex(k);
      else if (TR[c] != null) o += hex(TR[c]); else if (k < 256) o += hex(k); else o += '%3F';
    }
    return o;
  }
  async function coz(r) {
    const b = await r.arrayBuffer(), ct = r.headers.get('content-type') || '';
    const kod = /utf-8/i.test(ct) ? 'utf-8' : 'windows-1254';
    let h = new TextDecoder(kod).decode(b);
    if (kod !== 'utf-8' && /<meta[^>]+charset=["']?utf-8/i.test(h.slice(0, 2000))) h = new TextDecoder('utf-8').decode(b);
    return { html: h, url: r.url };
  }
  function denetle({ html, url }, yol) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (/oturumsonu|giris\.aspx|login/i.test(url) || doc.querySelector('input[type=password]') || /Oturum S[üu]reniz Dolmu/i.test(html)) throw new MebHata('MEBBİS oturumu kapandı. MEBBİS’e yeniden girin; iş kaldığı yerden devam eder.', 'oturum');
    if (/Hata Kayna/i.test(html) && /MEBB/i.test(html) && !doc.querySelector('form[id^="FRM" i]')) throw new MebHata('MEBBİS genel hata sayfası döndü (geçersiz değer ya da geçici sorun).', 'mebbis');
    doc.__url = url; doc.__ekran = ekranKodu(yol); return doc;
  }
  let sonIstek = 0, olc = null;
  async function bekle() { const k = ARA - (Date.now() - sonIstek); if (k > 0) await uyku(k); sonIstek = Date.now(); if (olc) olc.istek++; }
  async function getir(yol) {
    await bekle();
    const r = await fetch(new URL(yolOf(yol), KOK).href, { credentials: 'include', redirect: 'follow' });
    return { doc: denetle(await coz(r), yol), yol };
  }
  const anaForm = doc => doc.querySelector('form[id^="FRM" i]') || [...doc.forms].find(f => f.querySelector('[name="__VIEWSTATE"], [name="__VIEWSTATEFIELDCOUNT"]')) || doc.forms[0];
  const elBul = (doc, ad0) => { const ad = A(doc, ad0); return doc.getElementById(ad) || doc.querySelector(`[name="${CSS.escape(ad)}"]`) || doc.querySelector(`[id$="${CSS.escape(ad)}"]`); };
  // Alan sayfada yoksa değer başka bir adla gönderilmez: iş açık hatayla durur (B2)
  const adOf = (doc, ad) => { const el = elBul(doc, ad); if (!el) throw ekranHata(doc, ad); return el.name || el.id; };
  const SERBEST = new Set(['txtGirisResmi']);   // güvenlik kodu kutusu yalnız kod istenince görünür
  function alanlar(doc) {
    const f = anaForm(doc), l = []; if (!f) return l;
    f.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.name || el.disabled) return; const t = (el.type || '').toLowerCase();
      if (['submit', 'button', 'image', 'reset', 'file'].includes(t)) return;
      if ((t === 'checkbox' || t === 'radio') && !el.checked) return;
      if (el.tagName === 'SELECT') { const o = el.querySelector('option[selected]') || el.options[0]; if (o) l.push([el.name, o.value]); return; }
      l.push([el.name, el.value || el.getAttribute('value') || '']);
    });
    return l;
  }
  /* ---------- düğme beyaz listesi (1.13.0; KAPSAM.md §3, 17–18 Kas canlı envanter) ---------- */
  // Motor yalnız bu listede adı geçen düğmelere basar. Liste koddadır; web'den gelen alan haritası değiştiremez
  // (harita bir adı başka bir alana yönlendirse bile denetim sayfadaki gerçek öğenin adına yapılır).
  //  OKUMA: canlıda basılıp kayıt yapmadığı kanıtlanmış düğmeler (her işte basılabilir).
  //  YAZMA: kayıt yapan ya da MERNİS sorgulayan düğmeler; yalnız onaylanmış yazma işi sürerken (yazmaIzni) basılabilir.
  //  ASLA: hiçbir yoldan basılmaz, tetiklenmez, gizli alanla da gönderilmez. 17 Kas 23:23'te btnAdayEkle okuma sanılıp basıldı ve kayıt yaptı.
  // Listede olmayan düğmeye basılmak istenirse basılmaz; iş "ekran" hatasıyla durur.
  const DUGME_OKUMA = {
    skt01005: ['btnListele', 'btnRandevu'], skt01006: ['btnListele'],
    skt02001: ['Button1', 'btnSertifikali', 'Button2', 'btnImageButton'], skt02006: ['btnListele'], skt02007: ['btnUcretListe'], skt02008: ['btnListele'],
    skt02009: ['ImageButton1'], skt02013: ['btnTC'], skt03003: ['btnListeleGrid'], skt03004: ['btnAdayGetir', 'ImageButton1'],
    skt04001: ['btnListeleGrid'], skt04002: ['btnListele'], skt04003: ['btnListeleGrid', 'btnExcel'],
    ook12001: ['btnAra'], ook15001: ['btnAra'], rsi01001: ['btnList'],
  };
  // YAZMA: skt02001 "Bilgileri Getir" (MERNİS; adı sayfadan metinle bulunur), skt02002 fotoğraf kaydı, skt02007 MERNİS kimlik sorgusu
  const DUGME_YAZMA = { skt02001: ['btnBilgileriGetir'], skt02002: ['ButtonSave'], skt02007: ['btnTCGetir'] };
  const DUGME_YAZMA_METIN = { skt02001: /^bilgileri ?getir$/ };
  // gizli "eylem" alanları: Kaydet (hiddenKaydet) yazmadır; OOK12001 Ara düğmesinin betiği hdnPageMode='Sorgulama' ile gönderir (okuma)
  const EYLEM_ALAN = { hiddenKaydet: 'yazma', hdnPageMode: 'okuma' };
  const ASLA_AD = ['btnAdayEkle', 'btnOnayGonder', 'btnOnay', 'btnDegisiklik', 'imgHataBildirim', 'btnKareKod', 'mazeretliBtn', 'mazeretsizBtn', 'btnArsiv', 'btnSifre', 'silme_b', 'yeniKayit_b', 'hdnSilme', 'hdnSil'];
  const ASLA_METIN = /listede g[öo]r[üu]nmeyen|t[ıi]klay[ıi]n[ıi]z|onay kodu|[şs]anz[ıi]man kayd[ıi]|hata bildir|karekod|mazeretli|mazeretsiz|ar[şs]iv|[şs]ifre|^sil$|^yeni$/i;
  let yazmaIzni = false;
  const sonAd = s => String(s || '').split(/[$:]/).pop();
  const adEsit = (el, ad) => [el.name, el.id].some(x => x && (x === ad || sonAd(x) === ad || x.endsWith('_' + ad)));
  const dugmeYazi = el => String(el.value || el.title || el.alt || el.textContent || '').replace(/\s+/g, ' ').trim();
  // metin denetimi yalnız düğmelerde (seçim kutusunun seçenek metinleri "Kaydı Silindi" gibi sözcükler taşır)
  const dugmeMi = el => el.tagName === 'BUTTON' || el.tagName === 'A' || (el.tagName === 'INPUT' && ['submit', 'button', 'image', 'reset'].includes((el.type || '').toLowerCase()));
  const aslaMi = el => ASLA_AD.some(a => adEsit(el, a)) || (dugmeMi(el) && ASLA_METIN.test(dugmeYazi(el)));
  // MebHata yasak: denetim hatası durdurucudur ("ekran-dur"); hiçbir istek gönderilmez
  const yasak = (doc, el, neden) => new MebHata(`Güvenlik: ${ekranAd(doc && doc.__ekran)} ekranında “${dugmeYazi(el) || el.name || el.id}” düğmesine basılmadı (${neden}). Hiçbir şey gönderilmedi.`, 'ekran-dur', { ekran: doc && doc.__ekran, eksik: [el.name || el.id || '?'] });
  function dugmeDenetle(doc, el) {
    if (aslaMi(el)) throw yasak(doc, el, 'asla listesinde');
    const kod = doc.__ekran || '';
    if ((DUGME_OKUMA[kod] || []).some(a => adEsit(el, a))) return 'okuma';
    if ((DUGME_YAZMA[kod] || []).some(a => adEsit(el, a)) || (DUGME_YAZMA_METIN[kod] && DUGME_YAZMA_METIN[kod].test(kucuk(dugmeYazi(el))))) {
      if (yazmaIzni) return 'yazma';
      throw yasak(doc, el, 'kayıt yapan düğme; yalnız onaylanmış yazma işinde');
    }
    throw yasak(doc, el, 'beyaz listede yok');
  }
  // autopostback tetikleyicisi yalnız seçim kutusu ya da işaret kutusu olabilir (düğme __EVENTTARGET ile de basılmasın)
  function tetikDenetle(doc, el) {
    if (aslaMi(el)) throw yasak(doc, el, 'asla listesinde');
    const t = (el.type || '').toLowerCase();
    if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && (t === 'checkbox' || t === 'radio'))) return;
    throw yasak(doc, el, 'tetikleyici seçim kutusu değil');
  }
  // Seçim kutusuna gönderilecek değer seçeneklerde olmalı; seçeneksiz kutu hiç gönderilmez (MEBBİS genel hata sayfası, 04003'te iki kez)
  function secimDenetle(doc, el, v) {
    if (!el || el.tagName !== 'SELECT') return;
    const o = [...el.options];
    if (!o.length) throw new MebHata(`${ekranAd(doc.__ekran)} ekranında “${el.name || el.id}” listesinin seçeneği yok; boş değer gönderilmedi`, 'veri');
    if (!o.some(x => x.value === String(v))) throw new MebHata(`“${v}” değeri ${ekranAd(doc.__ekran)} ekranındaki “${el.name || el.id}” listesinde yok; gönderilmedi`, 'veri');
  }
  // Formu gönderir. degis: { alanKimliğiYaAdı: değer }. tetik: autopostback yapan alan. dugme: basılan düğme (görselse .x/.y)
  // arguman: yalnız liste tablosunun satır seçimi ('Select$N', ör. OOK15003 'Aç'); başka bağımsız değişkenle postback gitmez
  async function postla({ doc, yol }, degis = {}, { tetik = null, dugme = null, arguman = '' } = {}) {
    const f = anaForm(doc); if (!f) throw ekranHata(doc, 'form', 'formu');
    const hedef = new URL(f.getAttribute('action') || yolOf(yol), doc.__url || new URL(yolOf(yol), KOK).href).href;
    const m = new Map(alanlar(doc));
    Object.entries(degis).forEach(([k, v]) => {
      const el = elBul(doc, k);
      if (el && aslaMi(el)) throw yasak(doc, el, 'asla listesinde');
      const eylem = el ? Object.keys(EYLEM_ALAN).find(a => adEsit(el, a)) : null;
      if (eylem && EYLEM_ALAN[eylem] === 'yazma' && !yazmaIzni) throw yasak(doc, el, 'Kaydet yalnız onaylanmış yazma işinde');
      if (SERBEST.has(k)) { m.set(el ? el.name || el.id : k, v); return; }
      const ad = adOf(doc, k); secimDenetle(doc, el, v); m.set(ad, v);
    });
    if (tetik) { const t = elBul(doc, tetik); if (!t) throw ekranHata(doc, tetik); if (arguman) { if (!(t.tagName === 'TABLE' && /^Select\$\d{1,3}$/.test(arguman)) || aslaMi(t)) throw yasak(doc, t, 'yalnız liste satırı seçilebilir'); } else tetikDenetle(doc, t); }
    // satır seçiminde hedef, satırdaki bağlantının __doPostBack('hedef','Select$N') çağrısından okunur (UniqueID; id'deki '_' ile tahmin edilmez)
    const satirHedef = () => { const a = [...elBul(doc, tetik).querySelectorAll('a[href*="__doPostBack"]')].map(x => /__doPostBack\('([^']+)','([^']+)'\)/.exec(x.getAttribute('href') || '')).find(x => x && x[2] === arguman); if (!a) throw ekranHata(doc, tetik + ' ' + arguman, 'satırı'); return a[1]; };
    m.set('__EVENTTARGET', tetik ? (arguman ? satirHedef() : adOf(doc, tetik)) : ''); m.set('__EVENTARGUMENT', arguman || '');
    const govde = [...m].map(([k, v]) => kodla(k) + '=' + kodla(v));
    if (dugme) { const d = elBul(doc, dugme); if (!d) throw ekranHata(doc, dugme, 'düğmesi'); dugmeDenetle(doc, d); const ad = d.name || d.id; if ((d.type || '').toLowerCase() === 'image') govde.push(kodla(ad + '.x') + '=7', kodla(ad + '.y') + '=7'); else govde.push(kodla(ad) + '=' + kodla(d.value || '')); }
    await bekle();
    const r = await fetch(hedef, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: govde.join('&') });
    return { doc: denetle(await coz(r), yol), yol };
  }
  // Seçim kutusunda değeri bul: önce değer, sonra metin (tam, baş, içerir); yoksa açık hata (MEBBİS'e geçersiz değer gitmez)
  // sinif: sertifika sınıfı listesi. Önce Program ID değeriyle seçilir (2504 B, 2502 A1, 2503 A2, 2514 A; 01005 ve 02007'de canlı doğrulandı);
  // yalnız o değerli seçenek metni de aynı sınıfı söylüyorsa (ve Manuel/Otomatik istendiyse onu da içeriyorsa) tek seçeneğe düşer. Yoksa metinle seçilir.
  // M 2513 (DIR-007, kaynak: MEB program listesi; canlıda görülmedi): değeri tutan seçeneğin metni de 'M SINIFI' demiyorsa metinle seçilir
  const PROGRAM_ID = { A: '2514', A1: '2502', A2: '2503', B: '2504', M: '2513' };
  const sinifKodu = t => { const m = String(t || '').toLocaleUpperCase('tr').replace(/İ/g, 'I').match(/^\s*(A1|A2|B1|BE|C1E|C1|CE|D1E|D1|DE|[ABCDFGMK])\s+SINIFI/); return m ? m[1] : ''; };
  function sinifSecenegi(o, aranan) {
    const k = sinifKodu(aranan), pid = PROGRAM_ID[k]; if (!pid) return null;
    const n = norm(aranan), sz = /otomatik/.test(n) ? 'otomatik' : /manuel/.test(n) ? 'manuel' : '';
    const l = o.filter(y => y.value === pid && sinifKodu(y.textContent) === k && (!sz || norm(y.textContent).includes(sz)));
    return l.length === 1 ? l[0] : null;
  }
  // DIR-009: eğitim türü değerle (1 Normal, 2 Telafi, 3 2.Direksiyon, 4 Başarısız Aday) seçilir; seçeneğin metni de aynı türü söylemiyorsa metinle
  function egitimSecenegi(o, kod, metin) { const k = norm(metin).slice(0, 6); if (!kod || !k) return null; const l = o.filter(y => y.value === String(kod) && norm(y.textContent).startsWith(k)); return l.length === 1 ? l[0] : null; }
  function secenek(doc, ad, aranan, { metinle = false, sinif = false, egitim = null } = {}) {
    const el = elBul(doc, ad); if (!el || el.tagName !== 'SELECT') throw ekranHata(doc, ad);
    const o = [...el.options], a = String(egitim ? egitim.metin : aranan), n = norm(a);
    const x = (egitim && egitimSecenegi(o, egitim.kod, egitim.metin)) || (sinif && sinifSecenegi(o, a)) || (!metinle && o.find(y => y.value === a)) || o.find(y => norm(y.textContent) === n) || o.find(y => n && norm(y.textContent).startsWith(n)) || o.find(y => n && norm(y.textContent).includes(n));
    if (!x || x.value === '-1' || x.value === '') throw new MebHata(`“${a}” MEBBİS’te seçeneklerde yok (${ad})`, 'veri');
    return x.value;
  }
  const autopostback = (doc, ad) => { const el = elBul(doc, ad); return !!(el && /__doPostBack/.test(el.getAttribute('onchange') || '')); };
  // Seçim yapar; seçim sayfayı yeniliyorsa postback ile yeni sayfayı döndürür, yenilemiyorsa bekleyen değişikliklere ekler
  async function sec(s, bekleyen, ad, deger, opt) {
    const v = secenek(s.doc, ad, deger, opt);
    if (autopostback(s.doc, ad)) { const y = await postla(s, { ...bekleyen, [ad]: v }, { tetik: ad }); Object.keys(bekleyen).forEach(k => delete bekleyen[k]); return y; }
    bekleyen[ad] = v; return s;
  }

  /* ---------- tablo okuma ---------- */
  function tabloOku(t) {
    if (!t) return null;
    const satirlar = [...t.rows].filter(r => r.closest('table') === t).map(r => [...r.cells].map(c => metin(c)));
    const stiller = [...t.rows].filter(r => r.closest('table') === t).map(r => r.getAttribute('style') || r.getAttribute('bgcolor') || '');
    const l = satirlar.map((r, i) => ({ r, s: stiller[i] })).filter(x => x.r.some(Boolean));
    if (!l.length) return null;
    return { baslik: l[0].r, satirlar: l.slice(1).map(x => x.r), stil: l.slice(1).map(x => x.s) };
  }
  const tabloEl = (doc, id) => doc.querySelector(`table[id$="${CSS.escape(A(doc, id))}"]`);
  const tabloId = (doc, id) => tabloOku(tabloEl(doc, id));
  const tabloBaslikla = (doc, ...desen) => { for (const t of doc.querySelectorAll('table')) { if (t.querySelector('table')) continue; const b = norm(metin(t.rows[0])); if (desen.every(d => d.test(b))) return tabloOku(t); } return null; };
  // MEBBİS'in yanıt sayfasındaki mesajlar: alert(...), IslemSonucu("OK"|"IPTAL"), uyarı etiketleri
  function mesajlar(doc, html) {
    const l = []; html = html || doc.documentElement.innerHTML;
    html.replace(/alert\(\s*(['"])([\s\S]*?)\1\s*\)/g, (_, __, m) => { l.push(m.replace(/\\n/g, ' ').replace(/\\'/g, "'")); return ''; });
    const ok = /IslemSonucu\(\s*["']OK["']/.test(html), iptal = /IslemSonucu\(\s*["']IPTAL["']/.test(html);
    doc.querySelectorAll('[id*="lblHata" i], [id*="lblMesaj" i], [id*="lblUyari" i], .hata, .uyari').forEach(el => { const t = metin(el); if (t) l.push(t); });
    return { l, ok, iptal };
  }
  // Kaydet yanıtı: kaydetmeden önceki sayfada da bulunan mesajlar (sayfanın sabit betiği, sabit etiketler) yeni sayılmaz.
  // Böylece sabit betikte IslemSonucu("OK") ya da alert('...') varsa her yanıt "başarılı" görünmez.
  function sonucOku(once, doc) {
    const m = mesajlar(doc), o = new Set(once.l);
    return { ...m, yeni: m.l.filter(x => !o.has(x)), okYeni: m.ok && !once.ok, iptalYeni: m.iptal && !once.iptal };
  }
  // B1: önce olumsuz desen ("başarısız", "kaydedilemedi", "tamamlanamadı", "hata"…), sonra olumlu desen
  const OLUMSUZ = /ba[şs]ar[ıi]s[ıi]z|(?:ama|eme)(?:d[ıi]|m[ıi][şs]|z|yacak)|(?:ilme|ılma|ulma|ülme|nme|nma|lme|lma)(?:d[ıi]|m[ıi][şs])|\bhata(?!y)|ge[çc]ersiz|bulunamad|bulunmamaktad|zorunlu|bo[şs] b[ıi]rak|iptal edil|reddedil|yetkiniz yok|yetkisiz|[çc]ak[ıi][şs]/;
  const OLUMLU = /ba[şs]ar[ıi](?:yla|l[ıi]| ile)|kayded[ıi]ld[ıi]|kayded[ıi]lm[ıi][şs]|kaydoldu|kayd[ıi]n[ıi]z al[ıi]nd|ba[şs]vurunuz al[ıi]n(?:d|m[ıi][şs])|tamamland[ıi]|tamamlanm[ıi][şs]|eklendi|eklenmi[şs]|g[üu]ncellendi|g[üu]ncellenmi[şs]|i[şs]lem(?:iniz)? tamam|onayland[ıi]/;
  const KOD = /g[üu]venlik|kod|resim/i;
  const olumsuz = k => !!k.iptalYeni || k.yeni.some(x => OLUMSUZ.test(kucuk(x)));
  const basari = k => !olumsuz(k) && (!!k.okYeni || k.yeni.some(x => OLUMLU.test(kucuk(x))));
  const kodGerekli = k => (k.yeni.length ? k.yeni : k.l).some(m => KOD.test(m));

  /* ---------- çekme ---------- */
  const CEKME = {
    async gruplar() {
      const a = await getir('/SKT/skt03002.aspx'), b = await getir('/SKT/skt03001.aspx');
      return { sube: tabloBaslikla(a.doc, /sube/, /baslama/), acilis: tabloBaslikla(b.doc, /grup/, /aday/) };
    },
    async kursiyerler(ilerle) {
      const t = await getir('/SKT/skt02006.aspx'), SON = new Set(D('sonDurumlar').split(','));   // sertifika, sertifika iptal, kaydı silindi: yalnız son dönemler
      const durum = [...(elBul(t.doc, 'cmbOgrenciDurumu') || { options: [] }).options].map(o => [o.value, metin(o)]).filter(([v]) => v !== '' && v !== '-1');
      const donemler = [...(elBul(t.doc, 'cmbEgitimDonemi') || { options: [] }).options].map(o => o.value).filter(v => /^\d{6}$/.test(v)).sort().reverse().slice(0, 6);
      if (!durum.length) throw new MebHata('Dönem Adaylarını Onaylama ekranında öğrenci durumu listesi okunamadı', 'ekran', { ekran: 'skt02006', eksik: ['cmbOgrenciDurumu'] });
      const onay = secenek(t.doc, 'cmbDurumu', D('durumTumu'));
      const sonuc = []; let i = 0, tum = D('tumDonemler');
      secimDenetle(t.doc, elBul(t.doc, 'cmbEgitimDonemi'), tum);   // "-Tüm Dönemler-" seçeneği gerçekten var mı (yoksa hiçbir sorgu gitmez)
      for (const [dv, dad] of durum) {
        const dl = SON.has(dv) ? donemler : [tum];
        for (const dn of dl) {
          ilerle(`Kursiyerler: ${dad}${dn !== tum ? ' · ' + dn.slice(0, 4) + '/' + dn.slice(4) : ''}`, ++i / (durum.length + 3 * donemler.length));
          const r = await postla(t, { cmbEgitimDonemi: dn, cmbDurumu: onay, cmbOgrenciDurumu: dv }, { dugme: 'btnListele' });
          const tb = tabloId(r.doc, 'dgListele'); if (tb) sonuc.push({ durum: dv, durumAd: dad, donemSuzgec: dn, ...tb });
        }
      }
      return sonuc;
    },
    async personel() {
      try {
        // "Personel Durumu = Görevde" süzgeci: yalnız güncel personel (Haller 17 Kas: 8). Süzgeç yoksa eski yol: bütün liste + pembe satır (ffdcdc) = geçmiş
        const t = await getir('/Ookgm/ook12001.aspx'), pd = elBul(t.doc, 'cmbPersonelDurum'), gorevde = pd && [...pd.options].some(o => o.value === D('personelGorevde'));
        const r = await postla(t, { hdnPageMode: 'Sorgulama', ...(gorevde ? { cmbPersonelDurum: D('personelGorevde') } : {}) });
        const tb = tabloId(r.doc, 'dgPersonelArama'); if (tb) return { kaynak: 'ook12001', suzgec: gorevde ? 'gorevde' : '', ...tb, gecmis: tb.stil.map(s => /ffdcdc/i.test(s)) };
      } catch (x) { if (durduran(x)) throw x; }
      let t = await getir('/Ookgm/ook54001.aspx'), tb = tabloBaslikla(t.doc, /izinno/);
      if (!tb) { await getir('/Ookgm/ook00001.aspx'); t = await getir('/Ookgm/ook54001.aspx'); tb = tabloBaslikla(t.doc, /izinno/); }
      return tb ? { kaynak: 'ook54001', ...tb, gecmis: tb.satirlar.map(() => false) } : null;
    },
    async araclar() {
      const t = await getir('/SKT/skt01002.aspx'), o = {};
      try { const a = await postla(t, { dropTurSecim: secenek(t.doc, 'dropTurSecim', D('turArac')) }, { tetik: 'dropTurSecim' }); o.arac = tabloId(a.doc, 'dgAracBilgileri') || tabloBaslikla(a.doc, /plaka/, /muayene/); } catch (x) { if (durduran(x)) throw x; ekranKaydet(x); }
      try { const s = await postla(t, { dropTurSecim: secenek(t.doc, 'dropTurSecim', D('turSimulator')) }, { tetik: 'dropTurSecim' }); o.simulator = tabloId(s.doc, 'dgSimulatorBilgileri'); } catch (x) { if (durduran(x)) throw x; ekranKaydet(x); }
      return o;
    },
    // Sınav Bilgileri Görüntüleme (skt04003). Canlı (17 Kas): uygulamada seçenekler yalnız SON İKİ sınav kodu, gün gün, sıra karışık ve kod tekrarlı
    // (değer = sınav kodu; bir kod o sınav döneminin bütün günlerini döndürür); e-sınavda değer AY numarası (son 4 ay, yıl yok).
    // Her tekil değer bir kez sorgulanır. Satırlar "Excel'e Aktar" çıktısından okunur (sabit sütun adları, fotoğrafsız; ekrandakiyle birebir);
    // Excel alınamazsa ekrandaki tablo kullanılır. ekranSatir: ekrandaki tablonun satır sayısı (karşılaştırma için).
    async sinavlar(ilerle) {
      const t = await getir('/SKT/skt04003.aspx'), o = { uygulama: [], esinav: [] };
      for (const [tur, tablo] of [[D('sinavUygulama'), 'dgDonemler1'], [D('sinavEsinav'), 'dgDonemler2']]) {
        const uyg = tur === D('sinavUygulama'), ne = uyg ? 'uygulama' : 'esinav';
        const a = await postla(t, { cmbSinavTuru: secenek(t.doc, 'cmbSinavTuru', tur) }, { tetik: 'cmbSinavTuru' });
        const sec_ = elBul(a.doc, 'cmbSinavTarihi');
        if (!sec_ || sec_.tagName !== 'SELECT') throw ekranHata(a.doc, 'cmbSinavTarihi');
        const etiket = new Map(); [...sec_.options].forEach(x => { if (x.value && !/^(0|-1)$/.test(x.value)) etiket.set(x.value, [...(etiket.get(x.value) || []), metin(x)]); });
        const deger = [...etiket.keys()];   // seçenek sırasıyla, tekil
        for (const [j, v] of deger.entries()) {
          ilerle(`Sınav sonuçları (${uyg ? 'uygulama' : 'e-sınav'} ${j + 1}/${deger.length})`, 0.5);
          const r = await postla(a, { cmbSinavTarihi: v }, { dugme: 'btnListeleGrid' });
          const ekran = tabloId(r.doc, tablo);
          let excel = null;
          // Excel isteği aynı seçimle gider; satır sayısı ekrandakiyle tutmazsa ekrandaki tablo kullanılır
          if (ekran && elBul(r.doc, 'btnExcel')) { try { excel = tabloBaslikla((await postla(r, { cmbSinavTarihi: v }, { dugme: 'btnExcel' })).doc, /kimlik/); } catch (x) { if (durduran(x)) throw x; } }
          const excelUygun = !!excel && excel.satirlar.length === ekran.satirlar.length, tb = excelUygun ? excel : ekran;
          const ek = { kod: v, secenek: etiket.get(v), kaynak: excelUygun ? 'excel' : ekran ? 'ekran' : 'yok', ekranSatir: ekran ? ekran.satirlar.length : 0, ...(excel && !excelUygun ? { excelSatir: excel.satirlar.length } : {}) };
          o[ne].push(tb ? { ...ek, ...tb } : { ...ek, baslik: [], satirlar: [], stil: [] });
        }
      }
      return o;
    },
  };
  // 1.13.0 okuma işleri (yalnız beyaz listedeki okuma düğmeleri; site henüz göstermiyor, sonuç sonuc.veri'de):
  //  randevular: skt01005 "Randevu Verilmiş Aday Listesi" (seçimden bağımsız, bütün verilmiş randevular) + sıradaki sınav günü × sertifika "Listele" (randevu verilebilecekler)
  //  ucretler: skt02007 "Ücret Yatıran Aday Listesi" · teorik: skt04001 son 4 dönemin teorik programı
  Object.assign(CEKME, {
    async randevular(ilerle) {
      const t = await getir('/SKT/skt01005.aspx');
      const v = await postla(t, {}, { dugme: 'btnRandevu' });
      const o = { verilmis: tabloId(v.doc, 'dgListele1') || { baslik: [], satirlar: [], stil: [] }, uygun: [] };
      const tar = [...((elBul(t.doc, 'cmbSinavTarihi') || { options: [] }).options)].filter(x => x.value && x.value !== '-1');
      const ser = [...((elBul(t.doc, 'cmbSertifika') || { options: [] }).options)].filter(x => x.value && x.value !== '-1');
      for (const x of tar.slice(0, 1)) for (const y of ser) {
        ilerle(`Randevu listesi ${metin(x)} · ${metin(y)}`, 0.5);
        const r = await postla(t, { cmbSinavTarihi: x.value, cmbSertifika: y.value }, { dugme: 'btnListele' });
        const tb = tabloId(r.doc, 'dgListele');
        o.uygun.push({ tarih: metin(x), sertifika: metin(y), sertifikaDeger: y.value, ...(tb || { baslik: [], satirlar: [], stil: [] }) });
      }
      return o;
    },
    async ucretler() {
      const t = await getir('/SKT/skt02007.aspx'), r = await postla(t, {}, { dugme: 'btnUcretListe' });
      return tabloId(r.doc, 'gvUcretListe') || { baslik: [], satirlar: [], stil: [] };
    },
    async teorik(ilerle) {
      const t = await getir('/SKT/skt04001.aspx'), el = elBul(t.doc, 'cmbDonemi'); if (!el) throw ekranHata(t.doc, 'cmbDonemi');
      const ay = new Date(), simdi = ay.getFullYear() * 100 + ay.getMonth() + 1;
      const dl = [...el.options].map(o => o.value).filter(v => /^\d{6}$/.test(v) && +v <= simdi + 1).sort().reverse().slice(0, 4), o = [];
      for (const d of dl) { ilerle(`Teorik program ${d.slice(0, 4)}/${d.slice(4)}`, 0.5); const r = await postla(t, { cmbDonemi: d }, { dugme: 'btnListeleGrid' }); const tb = tabloBaslikla(r.doc, /ders/, /saat/) || tabloId(r.doc, 'dgDonemler'); o.push({ donem: d, ...(tb || { baslik: [], satirlar: [], stil: [] }) }); }
      return o;
    },
  });
  // 1.16.0 (DIR-026): SKT04002 Direksiyon Ders Programı Görüntüleme — kurumun bütün direksiyon dersleri, dönemden bağımsız 7 günlük tarih aralıklarıyla
  //  (tarih verilince dönem süzgeci kalkar; ~400 satırda "Kayıt Sayısı Fazla…" → aralık ikiye bölünür). Yalnız Listele (okuma) basılır.
  //  Varsayılan aralık: 6 hafta geri, 5 hafta ileri. TC sütunu yok; aday adıyla eşleşir (mdSinyal tarafı).
  const isoGun = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isoTr = t => t.split('-').reverse().join('/');
  const gunKaydir = (t, n) => { const d = new Date(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)); d.setDate(d.getDate() + n); return isoGun(d); };
  const gunFark = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  Object.assign(CEKME, {
    async direksiyonProgrami(ilerle, { geri = 42, ileri = 35 } = {}) {
      let t = await getir('/SKT/skt04002.aspx');
      const kr = elBul(t.doc, 'cmbKurum'); if (!kr) throw ekranHata(t.doc, 'cmbKurum');
      const kv = [...kr.options].map(o => o.value).find(v => v && v !== '-1'); if (!kv) throw new MebHata('Direksiyon programı ekranında kurum seçeneği yok', 'ekran', { ekran: 'skt04002', eksik: ['cmbKurum'] });
      if (kr.value !== kv) t = await postla(t, { cmbKurum: kv }, { tetik: 'cmbKurum' });
      const dEl = elBul(t.doc, 'cmbDonemi'); if (!dEl) throw ekranHata(t.doc, 'cmbDonemi');
      const donem = [...dEl.options].map(o => o.value).find(v => /^\d{6}$/.test(v)) || dEl.value; if (!donem) throw ekranHata(t.doc, 'cmbDonemi', 'seçenekleri');
      const a1 = adOf(t.doc, 'Us_tarih1_txtTarihGiris'), a2 = adOf(t.doc, 'Us_tarih2_txtTarihGiris');
      const bugun = isoGun(new Date()), bas = gunKaydir(bugun, -geri), son = gunKaydir(bugun, ileri);
      const out = { bas, son, baslik: null, satirlar: [], parca: 0, bolunen: 0 };
      const oku = async (a, b) => {
        const r = await postla(t, { cmbDonemi: donem, [a1]: isoTr(a), [a2]: isoTr(b) }, { dugme: 'btnListele' }); out.parca++;
        const gv = norm(metin(r.doc.body));
        if (/kayitsayisifazla/.test(gv)) { if (a === b) throw new MebHata(`${isoTr(a)} günü için MEBBİS “Kayıt sayısı fazla” diyor; bu gün okunamadı`, 'veri'); out.bolunen++; const m = gunKaydir(a, Math.floor(gunFark(a, b) / 2)); await oku(a, m); await oku(gunKaydir(m, 1), b); return; }
        const tb = tabloBaslikla(r.doc, /aday/, /plaka/, /tarih/); if (!tb) return;   // "Kurumunuz Tarafından Girilmiş Ders Kaydı Bulunamadı."
        out.baslik = out.baslik || tb.baslik; out.satirlar.push(...tb.satirlar);
      };
      for (let a = bas, i = 0; a <= son; a = gunKaydir(a, 7), i++) { const b = gunKaydir(a, 6) > son ? son : gunKaydir(a, 6); ilerle(`Direksiyon programı ${isoTr(a)}–${isoTr(b)}`, Math.min(.95, i / Math.ceil((geri + ileri + 1) / 7))); await oku(a, b); }
      out.baslik = out.baslik || [];
      return out;
    },
  });
  // 1.14.0 (RAP-006): SKT01001 Kurum Bilgileri salt okunur ekran; yalnız GET, hiçbir düğmeye basılmaz.
  //  Bina kontenjanı (etiket hücresinin yanındaki sayı), kurum alt programları (sertifika sınıfı, ruhsat alma, kapanma, durum), derslikler, araçlar.
  Object.assign(CEKME, {
    async kurum() {
      const t = await getir('/SKT/skt01001.aspx'), d = t.doc;
      let bina = '';
      for (const c of d.querySelectorAll('td, th, span, label')) { if (!/^binakontenjan/.test(norm(metin(c)))) continue;
        const ic = metin(c).match(/(\d{1,4})\s*$/); if (ic) { bina = ic[1]; break; }
        const yan = c.nextElementSibling || (c.parentElement && c.parentElement.nextElementSibling); const m = yan && metin(yan).match(/^\s*(\d{1,4})\b/); if (m) { bina = m[1]; break; } }
      if (!bina) { const m = metin(d.body).match(/Bina\s*Kontenjan[ıi]?\s*:?\s*(\d{1,4})/i); if (m) bina = m[1]; }
      const programlar = tabloId(d, 'dgProgramlar') || tabloBaslikla(d, /sinifi/, /ruhsat/);
      if (!programlar && !bina) throw ekranHata(d, 'dgProgramlar', 'tablosu');
      return { binaKontenjan: bina, programlar: programlar || { baslik: [], satirlar: [], stil: [] }, derslikler: tabloId(d, 'dgDerslikBilgileri') || { baslik: [], satirlar: [], stil: [] }, araclar: tabloId(d, 'dgAracBilgileri') || { baslik: [], satirlar: [], stil: [] } };
    },
  });
  // 1.15.0 (SIT-006): OOK01002 kurum künyesindeki dgUcret (MEB onaylı ücret ilanı). Yalnız GET: bu sayfada künye düzenlenebilir,
  //  Kaydet'e (hiddenKaydet) ve hiçbir düğmeye basılmaz. OOK modülüne ilk girişte sayfa ana sayfaya dönerse önce modül sayfası açılır.
  Object.assign(CEKME, {
    // PER-012: öğretmenin derse gireceği programlar (sınıf × teorik/uygulama). OOK15003 'Toplu Onay İzin İstek Listesi' (yalnız toplu onayla izin
    // alınmış personel) → satır 'Aç' (Select$N) → OOK15004 'Personel Bilgi Girişi' salt okunur okunur; Kaydet'e asla basılmaz.
    async yetki(ilerle) {
      const t = await getir('/Ookgm/ook15003.aspx'), el = tabloEl(t.doc, 'dgIstekOnaylanan');
      if (!el) throw ekranHata(t.doc, 'dgIstekOnaylanan', 'tablosu');
      const liste = tabloOku(el) || { baslik: [], satirlar: [] }, kisiler = [];
      const hucre = c => { const k = c.querySelector('input[type=checkbox]'); return k ? (k.checked || k.hasAttribute('checked') ? '1' : '0') : metin(c); };
      const izgara = (d, id) => { const tb = tabloEl(d, id); if (!tb) return null; const rows = [...tb.rows].filter(x => x.closest('table') === tb); return rows.length ? { baslik: [...rows[0].cells].map(c => metin(c)), satirlar: rows.slice(1).map(x => [...x.cells].map(hucre)).filter(x => x.some(Boolean)) } : null; };
      for (let i = 0; i < liste.satirlar.length && i < 60; i++) {
        ilerle && ilerle(`Öğretmen yetkileri: ${i + 1}/${liste.satirlar.length}`, (i + 1) / liste.satirlar.length);
        try {
          const r = await postla(t, {}, { tetik: 'dgIstekOnaylanan', arguman: 'Select$' + i }), d = r.doc;
          const kayitNo = (metin(d.body).match(/Kay[ıi]t\s*No\s*:?\s*(\d{5,9})/i) || [])[1] || '';
          kisiler.push({ satir: liste.satirlar[i], kayitNo, secilen: izgara(d, 'dgDerseGirecegiProgram'), acik: izgara(d, 'gvKurumdaAcikProgramlar') });
        } catch (x) { if (durduran(x)) throw x; kisiler.push({ satir: liste.satirlar[i], hata: x.message || String(x) }); }
      }
      return { baslik: liste.baslik, kisiler };
    },
    async ucretIlani() {
      const oku = d => tabloId(d, 'dgUcret') || tabloBaslikla(d, /sinifi/, /toplam/);
      let t = await getir('/Ookgm/ook01002.aspx'), tb = oku(t.doc);
      if (!tb) { await getir('/Ookgm/ook00001.aspx'); t = await getir('/Ookgm/ook01002.aspx'); tb = oku(t.doc); }
      if (!tb) throw ekranHata(t.doc, 'dgUcret', 'tablosu');
      return tb;
    },
  });
  const CEKME_EKRAN = { kurum: ['skt01001'], gruplar: ['skt03002', 'skt03001'], kursiyerler: ['skt02006'], personel: [], araclar: ['skt01002'], sinavlar: ['skt04003'], dosya: ['skt02009'], randevular: ['skt01005'], ucretler: ['skt02007'], teorik: ['skt04001'], ucretIlani: [], yetki: ['ook15003', 'ook15004'], direksiyonProgrami: ['skt04002'] };
  // Aday Durum Görüntüleme: tek adayın bütün dosyası
  async function adayDosyasi(taban, tc) {
    const r = await postla(taban, { txtTcKimlikNo: tc }, { dugme: 'ImageButton1' });
    const d = r.doc, govde = metin(d.body);
    const tarihSonra = et => { const m = govde.match(new RegExp(et + '[^0-9]{0,40}(\\d{2}[./]\\d{2}[./]\\d{4})', 'i')); return m ? m[1] : ''; };
    return {
      tc, donem: tabloId(d, 'dgDonemBilgileri'), esinav: tabloId(d, 'dgTeorikSinavlar'), uygulama: tabloId(d, 'dgUygulamaNot'),
      dersler: tabloId(d, 'dgDersProgrami'), sertifika: tabloId(d, 'dgSertifika'),
      ikinciDireksiyon: tarihSonra('İkinci Direksiyon Aşamasına Geçtiği Tarih'), uygunluk: tarihSonra('Uygulama Sınavına Uygunluk Tarihi'),
    };
  }

  /* ---------- ortak: kaydet, güvenlik kodu, doğrulama ---------- */
  // Araç çubuğundaki Kaydet: hiddenKaydet="Kaydet" ile formu gönderir. Güvenlik kodu istenirse yetkiliye sorulur (en çok 3 kez).
  // dogrula(doc, k): geri okuma (liste/tablo) ya da mesaj. Olumsuz mesaj varsa doğrulama hiç yapılmaz, kayıt başarısız sayılır.
  async function kaydetDogrula(s, b, dogrula, kodIste, ek = {}, yontem = 'liste') {
    const once = mesajlar(s.doc);
    const kaydet = async kod => { const r = await postla(s, { ...b, ...ek, hiddenKaydet: 'Kaydet', ...(kod ? { txtGirisResmi: kod } : {}) }); return { r, ...sonucOku(once, r.doc) }; };
    const degerlendir = async k => !olumsuz(k) && !!(await dogrula(k.r.doc, k));
    let k = await kaydet(null), d = await degerlendir(k);
    for (let i = 0; i < 3 && !d && kodGerekli(k); i++) {
      const kod = await kodIste(s.doc); if (!kod) throw new MebHata('Güvenlik kodu girilmedi', 'kod');
      k = await kaydet(kod); d = await degerlendir(k);
    }
    if (d) return { ok: true, not: k.yeni.join(' · '), r: k.r, dogrulama: yontem };
    throw new MebHata(k.yeni.join(' · ') || (yontem === 'mesaj' ? 'MEBBİS kaydın yapıldığını bildirmedi' : 'Kayıt MEBBİS listesinde görünmedi'), olumsuz(k) ? 'veri' : 'dogrulama');
  }
  // Satır metni form denetimlerinin yazısını içermez: seçim kutusunun seçenekleri ("2026 - Kasım", "Grup 1", "A ŞUBESİ") liste satırı sanılmasın.
  // Tablo verilmezse yalnız iç içe tablo taşımayan satırlara bakılır: düzen tablosunun dış satırı bütün listeyi içerir, parçalar ayrı satırlardan eşleşirdi.
  const KONTROL = 'select, option, script, style, textarea, noscript';
  const satirMetni = tr => { if (!tr.querySelector(KONTROL)) return metin(tr); const c = tr.cloneNode(true); c.querySelectorAll(KONTROL).forEach(x => x.remove()); return metin(c); };
  const satirlarOf = (d, tablo) => { const t = tablo ? tabloEl(d, tablo) : d; return t ? [...t.querySelectorAll('tr')].filter(tr => tablo || !tr.querySelector('table')) : []; };
  const satirVar = (d, tablo, ...parca) => satirlarOf(d, tablo).some(tr => { const x = satirMetni(tr); return parca.every(p => x.includes(p)); });
  const satirBul = (d, tablo, tc) => satirlarOf(d, tablo).find(r => metin(r).includes(tc)) || null;
  const secenekEl = (el, aranan) => { const n = norm(aranan); const o = [...el.options].find(y => y.value === aranan) || [...el.options].find(y => norm(y.textContent).startsWith(n)) || [...el.options].find(y => n && norm(y.textContent).includes(n)); if (!o || o.value === '-1' || o.value === '') throw new MebHata(`“${aranan}” seçeneklerde yok`, 'veri'); return o.value; };
  async function zincir(yol, adimlar, dugme) {
    let s = await getir(yol); const b = {};
    for (const [ad, deger, opt] of adimlar) s = await sec(s, b, ad, deger, opt);
    if (dugme) { s = await postla(s, b, { dugme }); Object.keys(b).forEach(k => delete b[k]); }
    return { s, b };
  }
  const personelMetni = is => is.izinNo ? M('izinNo') + is.izinNo : is.personelAd;

  /* ---------- yazma: direksiyon ders programı (SKT03004) ---------- */
  // is: { id, tc, donem, grupNo, subeNo, tarih (gg/aa/yyyy), saat (SS:DD), yer ('Akan Trafik'|'Simülatör'), plaka, simulator, izinNo, personelAd, egitimTuru (metin), egitimTuruKod (değer 1-4) }
  async function programYaz(is, kodIste) {
    let s = await getir('/SKT/skt03004.aspx'); const b = {};
    s = await sec(s, b, 'cmbDonem', is.donem); s = await sec(s, b, 'cmbGrup', String(is.grupNo)); s = await sec(s, b, 'cmbSube', String(is.subeNo));
    s = await postla(s, b, { dugme: 'btnAdayGetir' }); Object.keys(b).forEach(k => delete b[k]);
    const aday = elBul(s.doc, 'cmbAday');
    if (aday && ![...aday.options].some(o => o.value === is.tc)) throw new MebHata('Aday bu dönem/grup/şubenin direksiyon listesinde yok (MEBBİS’te direksiyona geçmemiş ya da başka şubede)', 'veri');
    s = await postla(s, { txtTC: is.tc }, { dugme: 'ImageButton1' });
    if (!elBul(s.doc, 'cmbEgitimYeri')) throw ekranHata(s.doc, 'cmbEgitimYeri');
    const varMi = d => satirVar(d, 'dgDonemler', is.tarih, is.saat);
    if (varMi(s.doc)) return { ok: true, not: 'MEBBİS’te zaten vardı', dogrulama: 'zaten' };   // aynı ders iki kez girilmez
    s = await sec(s, b, 'cmbEgitimYeri', is.yer, { metinle: true });
    // simülatör: seçenek değeri cihazın MEBBİS "Cihazın Sicil Numarası" (13 hane; skt01002 simülatör listesi "Seri Numarası"). Aracın şasi no'su değil.
    // is.simulator boşsa ve listede tek simülatör varsa o seçilir; birden çoksa sicil no şart.
    if (/sim/i.test(norm(is.yer))) {
      const so = elBul(s.doc, 'cmbSimulatorSeriNo'); if (!so) throw ekranHata(s.doc, 'cmbSimulatorSeriNo');
      const tek = [...so.options].filter(x => x.value && x.value !== '-1'), sicil = String(is.simulator || '').replace(/\s/g, '');
      if (!sicil && tek.length !== 1) throw new MebHata(`Simülatörün MEBBİS sicil numarası yok (MEBBİS’te ${tek.length} simülatör var); önce MEBBİS’ten araçları güncelleyin`, 'veri');
      s = await sec(s, b, 'cmbSimulatorSeriNo', sicil || tek[0].value);
    }
    else s = await sec(s, b, 'cmbAracBilgileri', is.plaka, { metinle: true });
    b[adOf(s.doc, 'Ustarih1_txtTarihGiris')] = is.tarih;
    s = await sec(s, b, 'cmbDersSaati', is.saat, { metinle: true });
    s = await sec(s, b, 'cmbDersiVerenPersonel', personelMetni(is), { metinle: true });
    s = await sec(s, b, 'cmbEgitimTuru', is.egitimTuru || M('normal'), { metinle: true, egitim: { kod: is.egitimTuruKod || '', metin: is.egitimTuru || M('normal') } });
    return kaydetDogrula(s, b, varMi, kodIste);
  }

  /* ---------- teorik ders programı (SKT03003): bir dersin her saati ayrı kayıt ---------- */
  // is: { donem, grupNo, subeNo, tarih, saatler: ['18:00','19:00'], dersTuru, derslik, izinNo, personelAd, egitimTuru }
  async function teorikYaz(is, kodIste) {
    const notlar = []; let yeni = 0;
    for (const saat of is.saatler) {
      let { s, b } = await zincir('/SKT/skt03003.aspx', [['cmbDonemi', is.donem], ['cmbGrupAdi', String(is.grupNo)], ['cmbSubesi', String(is.subeNo)]], 'btnListeleGrid');
      if (satirVar(s.doc, 'dgDonemler', is.tarih, saat) || satirVar(s.doc, null, is.tarih, saat + ' -')) { notlar.push(saat + ' zaten vardı'); continue; }
      s = await sec(s, b, 'cmbDersTuru', is.dersTuru, { metinle: true });
      if (is.derslik) s = await sec(s, b, 'cmbDerslikAdi', is.derslik, { metinle: true });
      b[adOf(s.doc, 'Us_tarih1_txtTarihGiris')] = is.tarih;
      s = await sec(s, b, 'cmbDersSaati', saat, { metinle: true });
      s = await sec(s, b, 'cmbDersiVerenPersonel', personelMetni(is), { metinle: true });
      s = await sec(s, b, 'cmbEgitimTuru', is.egitimTuru || M('normal'), { metinle: true, egitim: { kod: is.egitimTuruKod || '', metin: is.egitimTuru || M('normal') } });
      await kaydetDogrula(s, b, d => satirVar(d, null, is.tarih, saat + ' -'), kodIste); notlar.push(saat + ' girildi'); yeni++;
    }
    return { ok: true, not: notlar.join(' · '), dogrulama: yeni ? 'liste' : 'zaten' };
  }

  /* ---------- uygulama sınavı randevusu (SKT01005): bir sınavın bütün adayları tek kayıtta ---------- */
  // is: { tarih (gg/aa/yyyy), sertifika ('B SINIFI' vb.), adaylar: [{ id, tc, plaka, izinNo, personelAd, saat }] }
  async function randevuYaz(is, kodIste) {
    const t = await getir('/SKT/skt01005.aspx');
    const tv = secenek(t.doc, 'cmbSinavTarihi', is.tarih, { metinle: true });
    let s = await postla(t, { cmbSinavTarihi: tv, cmbSertifika: secenek(t.doc, 'cmbSertifika', is.sertifika, { metinle: true, sinif: true }) }, { dugme: 'btnListele' });
    const b = {}, alt = [];
    for (const a of is.adaylar) {
      try {
        const tr = satirBul(s.doc, 'dgListele', a.tc); if (!tr) throw new MebHata('Aday randevu listesinde yok (ilçe kontenjanı, sınıf ya da aday durumu)', 'veri');
        // B3: satırda beklenen alan yoksa boş değere erişilmez; "ekran değişti" olarak durur
        const alan = son => { const el = tr.querySelector(`[id$="${CSS.escape(A(s.doc, son))}"]`); if (!el || !el.name) throw ekranHata(s.doc, son); return el; };
        const ar = alan('cmbAracPlaka'); b[ar.name] = secenekEl(ar, a.plaka);
        const us = alan('cmbUstaOgretici'); b[us.name] = secenekEl(us, personelMetni(a));
        const sa = alan('cmbSinavSaati'); b[sa.name] = secenekEl(sa, a.saat);
        const on = tr.querySelector(`[id$="${CSS.escape(A(s.doc, 'ChkOnayDurum'))}"], [id$="chkOnayDurum"]`); if (on) b[on.name] = on.value;
        alt.push({ id: a.id, ok: null, tc: a.tc });
      } catch (h) { if (durduran(h) || h.tur === 'ekran') throw h; alt.push({ id: a.id, ok: false, not: h.message }); }
    }
    const gidecek = alt.filter(x => x.ok === null); if (!gidecek.length) return { ok: false, alt: alt.map(({ tc, ...x }) => x), not: 'Randevu verilecek aday kalmadı' };
    await kaydetDogrula(s, b, async (d, k) => basari(k) || !d.querySelector('[id$="ChkOnayDurum"]:checked'), kodIste);
    // doğrulama: "Randevu Verilmiş Aday Listesi"
    const v = await postla(t, { cmbSinavTarihi: tv }, { dugme: 'btnRandevu' });
    gidecek.forEach(x => { const var_ = satirVar(v.doc, 'dgListele1', x.tc); x.ok = var_; x.not = var_ ? '' : 'Randevu listesinde görünmedi'; x.dogrulama = 'liste'; });
    return { ok: true, alt: alt.map(({ tc, ...x }) => x) };
  }

  /* ---------- fatura (SKT02013) ---------- */
  // is: { donem, tc, no, tarih, tutar }
  async function faturaYaz(is, kodIste) {
    let { s, b } = await zincir('/SKT/skt02013.aspx', [['cmbEgitimDonemi', is.donem]]);
    s = await postla(s, { ...b, txtTC: is.tc }, { dugme: 'btnTC' }); Object.keys(b).forEach(k => delete b[k]);
    if (!elBul(s.doc, 'txtSayi')) throw new MebHata('Fatura formu açılmadı (aday bu dönemde yok)', 'veri');
    if (satirVar(s.doc, null, is.no, is.tarih)) return { ok: true, not: 'MEBBİS’te zaten vardı', dogrulama: 'zaten' };
    Object.assign(b, { [adOf(s.doc, 'txtSayi')]: is.no, [adOf(s.doc, 'Us_tarih1_txtTarihGiris')]: is.tarih, [adOf(s.doc, 'txtTutar')]: is.tutar });
    return kaydetDogrula(s, b, d => satirVar(d, null, is.no), kodIste);
  }

  /* ---------- e-sınav başvurusu (SKT02007) ---------- */
  // is: { tc, donem, istenen, mevcut, belgeNo, gun: '0'|'1'|'2' }
  async function esinavYaz(is, kodIste) {
    const t = await getir('/SKT/skt02007.aspx');
    const u = await postla(t, {}, { dugme: 'btnUcretListe' });
    if (!satirVar(u.doc, 'gvUcretListe', is.tc)) throw new MebHata('e-Sınav ücreti yatmamış görünüyor (Ücret Yatıran Aday Listesi’nde yok)', 'veri');
    let s = await postla(t, { txtTcKimlikNo: is.tc }, { dugme: 'btnTCGetir' });
    const ad = elBul(s.doc, 'lblAd'); if (!ad || !metin(ad)) throw new MebHata('Kimlik bilgileri gelmedi (MERNİS)', 'veri');
    const b = {}; const r = s.doc.querySelector(`input[type=radio][id*="${CSS.escape(A(s.doc, 'rblEsinav'))}"][value="${CSS.escape(is.gun || '0')}"]`); if (!r) throw ekranHata(s.doc, 'rblEsinav'); b[r.name] = r.value;
    s = await sec(s, b, 'cmbEgitimDonemi', is.donem);
    if (is.mevcut) { s = await sec(s, b, 'cmbMevcutEhliyetSinifi', is.mevcut, { metinle: true, sinif: true }); if (!is.belgeNo) throw new MebHata('Mevcut belge numarası yok', 'veri'); b[adOf(s.doc, 'txtEhliyetBelgeNo')] = is.belgeNo; }
    s = await sec(s, b, 'cmbIstenenEhliyetSinifi', is.istenen, { metinle: true, sinif: true });
    return kaydetDogrula(s, b, async (d, k) => basari(k), kodIste, {}, 'mesaj');
  }

  /* ---------- dönem grubu ve şube (SKT03001, SKT03002) ---------- */
  // is: { donem, donemAd ('2026 - Aralık'), grupNo, subeNo, sube ('A'), baslangic (gg/aa/yyyy) }
  // B5: kayıttan sonra liste tablosunun aynı satırında dönem + grup + başlangıç (şubede dönem + grup + şube) aranır.
  // Ön denetim ("zaten var mı") eskisi gibi geniş kalır (çift giriş olmasın); liste tablosu bulunamazsa doğrulama da eski geniş aramaya döner.
  const grupEt = n => [M('grup') + n, M('grupTire') + n], subeEt = s => [s + M('sube'), s + M('subeUzun')];
  const ayniSatir = (tb, ...parca) => tb.satirlar.some(r => { const x = r.join(' '); return parca.every(p => (Array.isArray(p) ? p : [p]).some(y => x.includes(y))); });
  async function grupYaz(is, kodIste) {
    const notlar = []; let yeni = 0;
    const grupVar = d => grupEt(is.grupNo).some(g => satirVar(d, null, is.donemAd, g));
    const grupDogrula = d => { const tb = tabloBaslikla(d, /grup/, /aday/); return tb ? ayniSatir(tb, is.donemAd, grupEt(is.grupNo), is.baslangic) : grupVar(d) && satirVar(d, null, is.baslangic); };
    // şube satırında grup da aranır: aynı dönemde Grup 2'nin A şubesi varken Grup 1'in A şubesi "zaten var" sayılmasın
    const subeVar = d => grupEt(is.grupNo).some(g => subeEt(is.sube).some(x => satirVar(d, null, is.donemAd, g, x)));
    const subeDogrula = d => { const tb = tabloBaslikla(d, /sube/, /baslama/); return tb ? ayniSatir(tb, is.donemAd, grupEt(is.grupNo), subeEt(is.sube)) : subeVar(d); };
    let { s, b } = await zincir('/SKT/skt03001.aspx', []);
    if (!grupVar(s.doc)) {
      s = await sec(s, b, 'cmbDonemi', is.donem); s = await sec(s, b, 'cmbGrupAdi', String(is.grupNo));
      b[adOf(s.doc, 'Us_tarih1_txtTarihGiris')] = is.baslangic;
      s = await sec(s, b, 'cmbKurumOnayDurumu', M('onaylandi'), { metinle: true });
      await kaydetDogrula(s, b, grupDogrula, kodIste); notlar.push('grup açıldı'); yeni++;
    } else notlar.push('grup zaten vardı');
    ({ s, b } = await zincir('/SKT/skt03002.aspx', []));
    if (!subeVar(s.doc)) {
      s = await sec(s, b, 'cmbDonemi', is.donem); s = await sec(s, b, 'cmbGrupAdi', String(is.grupNo)); s = await sec(s, b, 'cmbSubesi', String(is.subeNo));
      s = await sec(s, b, 'cmbKurumOnayDurumu', M('onaylandi'), { metinle: true });
      await kaydetDogrula(s, b, subeDogrula, kodIste); notlar.push('şube tanımlandı'); yeni++;
    } else notlar.push('şube zaten vardı');
    return { ok: true, not: notlar.join(' · '), dogrulama: yeni ? 'liste' : 'zaten' };
  }

  /* ---------- kurum onayı (SKT02006): onay bekleyen adaylar, evrakı MEBBİS'te tamamsa ---------- */
  // is: { donem, adaylar: [{ id, tc }] }
  async function onayYaz(is, kodIste) {
    const t = await getir('/SKT/skt02006.aspx');
    const s = await postla(t, { cmbEgitimDonemi: is.donem, cmbDurumu: D('durumKurumBekliyor'), cmbOgrenciDurumu: D('ogrenciBasvuru') }, { dugme: 'btnListele' });
    const b = {}, alt = [];
    for (const a of is.adaylar) {
      const tr = satirBul(s.doc, 'dgListele', a.tc) || satirBul(s.doc, null, a.tc);
      if (!tr) { alt.push({ id: a.id, ok: false, not: 'Kurum onayı bekleyenler arasında yok' }); continue; }
      const x = metin(tr);
      if (!kucuk(x).includes(kucuk(M('tamam'))) || tr.querySelectorAll('img[src^="data:image"], img[id$="imgResim"], img[id$="imgWebcam"]').length < 2) { alt.push({ id: a.id, ok: false, not: 'MEBBİS’te fotoğraf ya da evrak kontrolü eksik; onay verilmedi (onaydan sonra düzeltilemez)' }); continue; }
      const on = tr.querySelector('[id$="chkOnayDurum"], [id$="ChkOnayDurum"]'); if (!on) throw ekranHata(s.doc, 'chkOnayDurum');
      b[on.name] = on.value; alt.push({ id: a.id, ok: null, tc: a.tc });
    }
    const gidecek = alt.filter(x => x.ok === null); if (!gidecek.length) return { ok: false, alt: alt.map(({ tc, ...x }) => x), not: 'Onaylanacak aday yok' };
    // B4: kaydedildi diye varsayılmaz; olumsuz mesaj ya da güvenlik kodu isteği varsa yeniden denenir, sonra "onaylananlar" listesinden okunur
    await kaydetDogrula(s, b, async (d, k) => basari(k) || !k.yeni.some(m => KOD.test(m)), kodIste);
    const v = await postla(t, { cmbEgitimDonemi: is.donem, cmbDurumu: D('durumKurumOnayli'), cmbOgrenciDurumu: D('ogrenciBasvuru') }, { dugme: 'btnListele' });
    gidecek.forEach(x => { x.ok = satirVar(v.doc, 'dgListele', x.tc); x.not = x.ok ? '' : 'Onaylananlar listesinde görünmedi'; x.dogrulama = 'liste'; });
    return { ok: true, alt: alt.map(({ tc, ...x }) => x) };
  }

  /* ---------- aday evrak ekranları (yalnız kurum onayı bekleyen adaylar listelenir) ---------- */
  // Aday seçimi: seçenek değeri TC ya da metinde ad soyad
  async function adayEkrani(yol, is) {
    let s = await getir(yol); const b = {};
    s = await sec(s, b, 'cmbEgitimDonemi', is.donem);
    const el = elBul(s.doc, 'cmbAdayAdSoyad'); if (!el) throw ekranHata(s.doc, 'cmbAdayAdSoyad');
    const n = norm(is.adSoyad), o = [...el.options].find(x => x.value === is.tc) || [...el.options].find(x => x.textContent.includes(is.tc)) || [...el.options].find(x => n && norm(x.textContent).includes(n));
    if (!o) throw new MebHata('Aday bu ekranda listelenmiyor (kurum onayı verilmiş olabilir; onaydan sonra evrak değiştirilemez)', 'veri');
    s = await sec(s, b, 'cmbAdayAdSoyad', o.value);
    return { s, b };
  }
  const EVRAK = {
    ogrenim: ['/SKT/skt02003.aspx', 'öğrenim', async (s, b, v) => { b[adOf(s.doc, 'txtOgrenimBelgesiVeren')] = v.veren; s = await sec(s, b, 'cmbOgrenimBelgesiTuru', v.tur, { metinle: true }); b[adOf(s.doc, 'Us_tarih1_txtTarihGiris')] = v.tarih; b[adOf(s.doc, 'txtOgrenimBelgeSayi')] = v.sayi; return s; }],
    saglik: ['/SKT/skt02004.aspx', 'sağlık raporu', async (s, b, v) => {
      // e-Nabız rapor referans numarası ile giriş (alan, kutu işaretlenince açılıyor olabilir); numara varsa alanı bulunmadan gönderilmez
      if (v.refNo) {
        const k = elBul(s.doc, 'chkRefNo'); if (!k) throw ekranHata(s.doc, 'chkRefNo');
        b[k.name] = k.value || 'on'; if (/__doPostBack/.test(k.getAttribute('onclick') || k.getAttribute('onchange') || '')) { s = await postla(s, b, { tetik: 'chkRefNo' }); }
        const r = [...anaForm(s.doc).querySelectorAll('input[type=text]')].find(x => /ref/i.test(x.id || x.name)); if (!r) throw ekranHata(s.doc, 'rapor referans no');
        b[r.name] = v.refNo;
      }
      const oz = elBul(s.doc, 'cmbAdayOzurDurumu'); if (!oz) throw ekranHata(s.doc, 'cmbAdayOzurDurumu');
      const ara = v.ozur === 'Var' ? ['özürlü', 'engelli', 'var'] : ['yok', 'özürsüz', 'engelsiz', 'sağlam'];
      const o = [...oz.options].find(x => x.value !== '-1' && ara.some(a => norm(x.textContent).includes(norm(a)))); if (!o) throw new MebHata('Özür durumu seçeneği eşleşmedi: ' + [...oz.options].map(x => metin(x)).join(', '), 'veri');
      b[oz.name] = o.value; return s;
    }],
    adli: ['/SKT/skt02005.aspx', 'adli sicil', async (s, b, v) => { b[adOf(s.doc, 'txtSavcilikBelgesiVeren')] = v.veren; b[adOf(s.doc, 'Us_tarih1_txtTarihGiris')] = v.tarih; b[adOf(s.doc, 'txtSavcilikBelgeSayi')] = v.sayi; return s; }],
    parmak: ['/SKT/SKT02010.aspx', 'parmak izi', async (s, b, v) => { b[adOf(s.doc, 'txtParmakİziBelgesiVeren')] = v.veren; b[adOf(s.doc, 'Us_tarih1_txtTarihGiris')] = v.tarih; b[adOf(s.doc, 'txtParmakİziSayi')] = v.sayi; return s; }],
  };
  // is: { donem, tc, adSoyad, evrak: { ogrenim, saglik, adli, parmak } } → her ekran ayrı kaydedilir; hata verenler not edilir
  async function evrakYaz(is, kodIste, sessiz) {
    const tamam = [], hata = [];
    for (const [ne, [yol, ad, doldur]] of Object.entries(EVRAK)) {
      const v = (is.evrak || {})[ne]; if (!v) continue;
      try { let { s, b } = await adayEkrani(yol, is); s = await doldur(s, b, v); await kaydetDogrula(s, b, async (d, k) => basari(k), kodIste, {}, 'mesaj'); tamam.push(ad); }
      catch (h) { if (durduran(h)) throw h; ekranKaydet(h); hata.push(ad + ': ' + h.message); }
    }
    const not = [tamam.length ? tamam.join(', ') + ' girildi' : '', ...hata].filter(Boolean).join(' · ');
    if (hata.length && !sessiz) throw new MebHata(not, 'veri');
    return { ok: true, not, dogrulama: 'mesaj' };
  }
  /* ---------- yeni aday kaydı (SKT02001) + fotoğraf (SKT02002) + sözleşme tarihi (SKT02011) ---------- */
  // Kayıt yazmadan önce ve sonra adayın bu dönemde kaydı var mı (çift kayıt olmasın, kayıt gerçekten oluşsun).
  // 1.13.0: SKT02009 Aday Durum (TC) dönem satırlarından okunur. Eskiden 02006'da cmbOgrenciDurumu '0' "tümü" sanılıyordu; 0 = "Kursa Başvuru Aşamasında"
  // ve belgeli aday kayıttan hemen sonra "Uygulama Sınav Aşamasında" (durum 2) göründüğü için kayıtlı sayılmıyor, yeniden kaydedilmeye çalışılıyordu.
  const AYLAR = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
  const donemUyar = (yazi, kod) => { const n = norm(yazi), k = String(kod || ''); if (!/^\d{6}$/.test(k)) return false; return n === k || n === k.slice(0, 4) + AYLAR[+k.slice(4) - 1]; };
  async function kayitliMi(is) {
    const r = await postla(await getir('/SKT/skt02009.aspx'), { txtTcKimlikNo: is.tc }, { dugme: 'ImageButton1' });
    const tb = tabloId(r.doc, 'dgDonemBilgileri');
    if (!tb) {
      // tablo yoksa yalnız MEBBİS "bulunamadı" diyorsa kayıtsız sayılır; başka bir sayfa geldiyse kayıt denenmez
      if (/bulunama|kay[ıi]t yok|bulunmamaktad/.test(kucuk(metin(r.doc.body)))) return false;
      throw ekranHata(r.doc, 'dgDonemBilgileri', 'tablosu');
    }
    const b = tb.baslik.map(norm), di = b.findIndex(h => /^donemi?$/.test(h)), si = b.findIndex(h => /^durumu$/.test(h));
    if (di < 0) throw ekranHata(r.doc, 'dgDonemBilgileri › Dönemi', 'sütunu');
    return tb.satirlar.some(row => donemUyar(row[di], is.donem) && !(si >= 0 && /kaydisilindi/.test(norm(row[si]))));
  }
  // is: { donem, grupNo, subeNo, tc, istenen, mevcut, belgeNo, cep, foto (dataURL 350×450), sozlesme (gg/aa/yyyy) }
  async function kayitYaz(is, kodIste) {
    const notlar = []; let dogrulama = 'liste';
    if (await kayitliMi(is)) { notlar.push('kayıt MEBBİS’te zaten vardı'); dogrulama = 'zaten'; }
    else {
      const t = await getir('/SKT/skt02001.aspx');
      let s = await postla(t, {}, { dugme: 'Button1' }); const b = {};
      s = await sec(s, b, 'cmbEgitimDonemi', is.donem); s = await sec(s, b, 'cmbGrubu', String(is.grupNo)); s = await sec(s, b, 'cmbSubesi', String(is.subeNo));
      s = await postla(s, b, { dugme: 'btnImageButton' }); Object.keys(b).forEach(k => delete b[k]);
      if (!elBul(s.doc, 'txt_TcKimlikNo')) throw new MebHata('Aday kayıt formu açılmadı (dönem kayda kapalı olabilir)', 'veri');
      const getirD = [...anaForm(s.doc).querySelectorAll('input[type=submit], input[type=image], input[type=button]')].find(x => /getir/i.test(x.value || x.title || x.alt || x.id));
      s = await postla(s, { txt_TcKimlikNo: is.tc }, { dugme: getirD ? (getirD.name || getirD.id) : 'btnBilgileriGetir' });
      const ad = elBul(s.doc, 'lblAd'); if (!ad || !metin(ad)) throw new MebHata('Kimlik bilgileri gelmedi (MERNİS); TC’yi kontrol edin', 'veri');
      b[adOf(s.doc, 'txt_TcKimlikNo')] = is.tc;
      s = await sec(s, b, 'cmbIstenenEhliyetSinifi', is.istenen, { metinle: true, sinif: true });
      if (is.mevcut) { s = await sec(s, b, 'cmbMevcutEhliyetSinifi', is.mevcut, { metinle: true, sinif: true }); if (!is.belgeNo) throw new MebHata('Mevcut belge numarası yok', 'veri'); b[adOf(s.doc, 'txtEhliyetBelgeNo')] = is.belgeNo; }
      b[adOf(s.doc, 'txtCepTelefonNo')] = is.cep;
      await kaydetDogrula(s, b, async () => kayitliMi(is), kodIste);
      notlar.push('kayıt girildi');
    }
    // evrak ekranları yalnız kurum onayı bekleyen adayları listeler: kayıttan hemen sonra
    if (is.foto) {
      try {
        const f = await zincir('/SKT/skt02002.aspx', [['cmbEgitimDonemi', is.donem], ['cmbAdayAdSoyad', is.tc]]); f.b[adOf(f.s.doc, 'resField')] = is.foto;
        const once = mesajlar(f.s.doc), r = await postla(f.s, f.b, { dugme: 'ButtonSave' }), m = sonucOku(once, r.doc);   /* fotoğraf ekranının kendi Kaydet düğmesi: ButtonSave */
        if (!basari(m)) throw new MebHata(m.yeni.join(' · ') || 'fotoğraf kaydı doğrulanamadı', 'dogrulama');
        notlar.push('fotoğraf yüklendi');
      } catch (h) { if (durduran(h)) throw h; ekranKaydet(h); notlar.push('fotoğraf: ' + h.message); }
    }
    if (is.sozlesme) { try { const f = await zincir('/SKT/skt02011.aspx', [['cmbEgitimDonemi', is.donem], ['cmbAdayAdSoyad', is.tc]]); f.b[adOf(f.s.doc, 'Us_tarih1_txtTarihGiris')] = is.sozlesme; await kaydetDogrula(f.s, f.b, async (d, k) => basari(k), kodIste, {}, 'mesaj'); notlar.push('sözleşme tarihi girildi'); } catch (h) { if (durduran(h)) throw h; ekranKaydet(h); notlar.push('sözleşme: ' + h.message); } }
    if (is.evrak) { const r = await evrakYaz(is, kodIste, true); if (r.not) notlar.push(r.not); }
    return { ok: true, not: notlar.join(' · '), dogrulama };
  }

  const YAZMA = { evrak: (is, k) => evrakYaz(is, k, false), program: programYaz, teorik: teorikYaz, randevu: randevuYaz, fatura: faturaYaz, esinav: esinavYaz, grup: grupYaz, onay: onayYaz, kayit: kayitYaz };
  const EVRAK_EKRAN = { ogrenim: 'skt02003', saglik: 'skt02004', adli: 'skt02005', parmak: 'skt02010' };
  const ekranlariOf = x => ({ program: ['skt03004'], teorik: ['skt03003'], randevu: ['skt01005'], fatura: ['skt02013'], esinav: ['skt02007'], grup: ['skt03001', 'skt03002'], onay: ['skt02006'], kayit: ['skt02001', 'skt02006'], evrak: Object.keys(x.evrak || {}).map(k => EVRAK_EKRAN[k]).filter(Boolean) }[x.tur] || []);
  const idlerOf = x => x.adaylar ? x.adaylar.map(a => a.id) : [x.id];

  /* ---------- ön denetim: işte kullanılacak her ekran bir kez açılır, zorunlu alanlar aranır (kayıt yapılmaz) ---------- */
  async function parmakIzi(doc) {
    try { const b = new TextEncoder().encode(formAdlari(doc).join('\n')); const h = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(h)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(''); } catch (x) { return ''; }
  }
  async function onUcus(kodlar, ilerle) {
    const o = {};
    for (const [i, kod] of [...new Set(kodlar)].filter(k => H.ekran[k]).entries()) {
      if (ilerle) ilerle(`MEBBİS ekranları denetleniyor: ${ekranAd(kod)}`, (i + 1) / kodlar.length);
      try {
        const s = await getir(H.ekran[kod].yol);
        const eksik = (H.ekran[kod].zorunlu || []).filter(ad => !elBul(s.doc, ad)), iz = await parmakIzi(s.doc), bekIz = H.ekran[kod].iz || '';
        if (!eksik.length) { o[kod] = { kod, ok: true, durum: bekIz && iz && bekIz !== iz ? 'degismis' : 'uygun', iz }; continue; }
        const h = ekranHata(s.doc, eksik.join(', '), eksik.length > 1 ? 'alanları' : 'alanı');
        o[kod] = { kod, ok: false, durum: h.tur === 'ekran' ? 'eksik' : 'kapali', tur: h.tur, eksik, iz, not: h.message };
        if (h.tur === 'ekran') ekranOlaylari.push({ ekran: kod, ad: ekranAd(kod), eksik, alanlar: formAdlari(s.doc).slice(0, 150), iz, kaynak: 'on-denetim', zaman: Date.now() });
      } catch (x) { if (durduran(x)) throw x; o[kod] = { kod, ok: false, durum: 'hata', tur: x.tur || 'hata', eksik: [], not: `${ekranAd(kod)} açılamadı: ${x.message}` }; }
    }
    return o;
  }
  // "Ekranları denetle": yalnız okuma; her ekranın durumu (uygun / eksik / kapalı / değişmiş olabilir)
  async function ekranlariDenetle(ilerle) {
    const kodlar = Object.keys(H.ekran).filter(k => (H.ekran[k].zorunlu || []).length);
    const o = await onUcus(kodlar, ilerle);
    return kodlar.map(k => ({ kod: k, ad: ekranAd(k), durum: o[k] ? o[k].durum : 'hata', eksik: o[k] ? o[k].eksik || [] : [], iz: o[k] ? o[k].iz || '' : '', not: o[k] && !o[k].ok ? o[k].not : '' }));
  }

  /* ---------- kurum denetimi (B13): açık MEBBİS hesabının kurum kodu ---------- */
  // SKT01001 Kurum Bilgileri salt okunur: "Kurum Kodu | Kurum Adı | …" başlıklı tablo. Yoksa gizli hdnKurumKodu alanı.
  async function kurumOku() {
    try {
      const s = await getir('/SKT/skt01001.aspx');
      for (const t of s.doc.querySelectorAll('table')) {
        if (t.querySelector('table')) continue;
        const rows = [...t.rows];
        for (let i = 0; i < rows.length; i++) {
          const b = [...rows[i].cells].map(c => norm(metin(c))), j = b.indexOf('kurumkodu'); if (j < 0) continue;
          const yan = [...rows[i].cells].map(c => metin(c)); if (/^\d{6,8}$/.test(yan[j + 1] || '')) return { kod: yan[j + 1], ad: '', kaynak: 'skt01001' };   // dikey düzen: etiket | değer
          const v = rows[i + 1] ? [...rows[i + 1].cells].map(c => metin(c)) : [], ai = b.indexOf('kurumadi');
          if (/^\d{6,8}$/.test(v[j] || '')) return { kod: v[j], ad: ai >= 0 ? (v[ai] || '').slice(0, 80) : '', kaynak: 'skt01001' };
        }
      }
      const h = s.doc.querySelector('[id$="hdnKurumKodu"], [name$="hdnKurumKodu"]'); if (h && /^\d{6,8}$/.test(h.value || '')) return { kod: h.value, ad: '', kaynak: 'hdnKurumKodu' };
    } catch (x) { if (durduran(x)) throw x; }
    const h = document.querySelector('[id$="hdnKurumKodu"], [name$="hdnKurumKodu"]'); if (h && /^\d{6,8}$/.test(h.value || '')) return { kod: h.value, ad: '', kaynak: 'sayfa' };
    return null;
  }
  const kurumYazi = k => k.kod + (k.ad ? ' · ' + k.ad : '');
  async function kurumDenetle(is, sonuc) {
    const beklenen = String(is.kurum || is.kurumKodu || '').replace(/\D/g, '');
    const k = await kurumOku();
    if (beklenen) {
      if (k && k.kod === beklenen) { sonuc.kurum = { ...k, eslesme: 'tam' }; return; }
      if (k) throw new MebHata(`MEBBİS’te açık hesap ${kurumYazi(k)} kurumuna ait; bu iş ${beklenen} kurum kodu için. Doğru şubenin MEBBİS hesabıyla girin; kurum kodu mdSinyal’de yanlış yazılıysa Ayarlar › Şubeler’den düzeltin. Hiçbir şey yazılmadı.`, 'kurum', { acik: k.kod, beklenen });
      const c = await sor('Kurum kodu MEBBİS’ten okunamadı', `Bu iş ${beklenen} kurum kodu için. Açık MEBBİS hesabının bu kuruma ait olduğundan emin misiniz?`, [['hayir', 'Hayır, durdur'], ['evet', 'Evet, bu kurum']]); kontrol();
      if (c !== 'evet') throw new MebHata('Kurum kodu doğrulanamadığı için iş durduruldu. Hiçbir şey yazılmadı.', 'kurum', { beklenen });
      sonuc.kurum = { kod: beklenen, ad: '', kaynak: 'yetkili', eslesme: 'yetkili' }; return;
    }
    // mdSinyal kurum kodu göndermedi: aynı iş başka hesapla sürdürülemez; yeni kurum bu tarayıcıda bir kez yetkiliye sorulur
    if (sonuc.kurum && sonuc.kurum.kod && k) { if (k.kod === sonuc.kurum.kod) return; throw new MebHata(`Bu iş ${kurumYazi(sonuc.kurum)} hesabında başlamıştı; şu an MEBBİS’te ${kurumYazi(k)} açık. Aynı kurumun hesabıyla girin. Hiçbir şey yazılmadı.`, 'kurum', { acik: k.kod, beklenen: sonuc.kurum.kod }); }
    const onayli = (await gonder({ tur: 'ayar-al', ad: 'onayli-kurumlar' })) || [];
    if (k && onayli.includes(k.kod)) { sonuc.kurum = { ...k, eslesme: 'onayli' }; return; }
    const c = await sor(k ? `MEBBİS hesabı: ${kurumYazi(k)}` : 'MEBBİS’te açık kurum okunamadı', k ? 'İş bu kurumun MEBBİS hesabına yazılacak. Doğru kurum mu? (Her kurum için bu tarayıcıda bir kez sorulur.)' : 'Açık MEBBİS hesabının kurum kodu okunamadı. Doğru kurumun hesabıyla girdiğinizden emin misiniz?', [['hayir', 'Hayır, durdur'], ['evet', 'Evet, doğru kurum']]); kontrol();
    if (c !== 'evet') throw new MebHata('Kurum doğrulanmadığı için iş durduruldu. Hiçbir şey yazılmadı.', 'kurum', { acik: k ? k.kod : '' });
    if (k) await gonder({ tur: 'ayar-koy', ad: 'onayli-kurumlar', deger: [...new Set([...onayli, k.kod])].slice(-20) });
    sonuc.kurum = { ...(k || { kod: '', ad: '' }), eslesme: 'yetkili' };
  }

  /* ---------- durum kartı (sayfanın sol altında) ---------- */
  const kok = document.createElement('div'); kok.id = 'sinyal-motor';
  const g = kok.attachShadow({ mode: 'open' });
  g.innerHTML = `<style>:host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0}
    .k{position:fixed;left:16px;bottom:16px;z-index:2147483647;width:340px;background:#0f1d33;color:#fff;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.35);padding:14px 16px;font-size:13.5px;line-height:1.45}
    .k.gizli{display:none}b{font-weight:700}.ust{display:flex;align-items:center;gap:8px;margin-bottom:6px}.ust i{width:10px;height:10px;border-radius:50%;background:#ffc21a;flex:none}.k.dur .ust i{background:#ff8a7a}.k.tamam .ust i{background:#5fd38d}.ust b{flex:1}.ust .yz{font-size:12px;color:#b9c3d6;font-variant-numeric:tabular-nums}.ust .kc{width:24px;height:24px;padding:0;border-radius:6px;background:rgba(255,255,255,.12);color:#fff;font-size:15px;line-height:1;transition:transform .3s}
    .k{transition:width .3s cubic-bezier(.2,.8,.2,1),padding .3s}.gv{max-height:520px;transition:max-height .32s cubic-bezier(.2,.8,.2,1),opacity .2s;overflow:hidden}.k.kucuk{width:250px;padding-bottom:10px}.k.kucuk .ust{margin-bottom:0}.k.kucuk .gv{max-height:0;opacity:0}.k.kucuk .kc{transform:rotate(180deg)}
    @media (prefers-reduced-motion:reduce){.k,.gv,.kc{transition:none}}
    .bar{height:6px;background:rgba(255,255,255,.15);border-radius:3px;margin:10px 0 6px;overflow:hidden}.bar i{display:block;height:100%;background:#ffc21a;transition:width .3s}
    small{color:#b9c3d6;display:block}.olc{margin-top:4px;font-variant-numeric:tabular-nums}.kod{margin-top:10px;background:#fff;color:#14284b;border-radius:10px;padding:10px}.kod p{margin:4px 0 0;font-size:13px}.kod img{display:block;max-width:100%;margin:6px 0;border:1px solid #ddd;border-radius:6px}
    input{width:100%;height:38px;border:1.5px solid #c8d0de;border-radius:8px;padding:0 10px;font-size:16px;letter-spacing:2px}
    button{cursor:pointer;border:0;border-radius:8px;height:34px;padding:0 12px;font-weight:700;font-size:13px}.ana{background:#ffc21a;color:#14284b}.cz{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.35)}.kod .cz{color:#14284b;border-color:#c8d0de}
    .alt{display:flex;gap:8px;margin-top:10px;justify-content:flex-end;flex-wrap:wrap}.alt:empty{display:none}</style>
    <div class="k gizli"><div class="ust" title="Sürükleyerek taşıyın · çift tıklayınca köşesine döner"><i></i><b data-baslik>mdSinyal · MEBBİS’te çalışıyor</b><span class="yz" data-yz></span><button class="kc" data-kucult aria-label="Küçült ya da büyüt">▾</button></div><div class="gv"><div data-adim></div><div class="bar"><i style="width:0"></i></div><small data-alt></small><small class="olc" data-olcum></small><div data-kod></div><div class="alt" data-dugmeler></div></div></div>`;
  const kart = g.querySelector('.k'), q = s => g.querySelector(s);
  if (window.__sinyalTasi) window.__sinyalTasi(kart, g.querySelector('.ust'), 'is');   // tasi.js
  q('[data-kucult]').addEventListener('click', () => { kart.classList.toggle('kucuk'); gonder({ tur: 'ayar-koy', ad: 'is-kucuk', deger: kart.classList.contains('kucuk') }); });
  gonder({ tur: 'ayar-al', ad: 'is-kucuk' }).then(v => { if (v) kart.classList.add('kucuk'); });
  const goster = (adim, oran, alt, baslik) => {
    if (kart.classList.contains('gizli')) dispatchEvent(new Event('sinyal-is-basladi'));
    kart.classList.remove('gizli'); if (baslik != null) q('[data-baslik]').textContent = baslik;
    if (adim != null) q('[data-adim]').textContent = adim;
    if (oran != null) { q('.bar i').style.width = Math.round(Math.min(1, oran) * 100) + '%'; q('[data-yz]').textContent = '%' + Math.round(Math.min(1, oran) * 100); }
    if (alt != null) q('[data-alt]').textContent = alt;
  };
  const durumSinif = s => { kart.classList.toggle('dur', s === 'dur'); kart.classList.toggle('tamam', s === 'tamam'); };
  let dugmeIsle = {};
  const dugmeler = l => { dugmeIsle = {}; q('[data-dugmeler]').innerHTML = l.map(([ad, yazi, sinif, f]) => { dugmeIsle[ad] = f; return `<button class="${sinif}" data-d="${ad}">${yazi}</button>`; }).join(''); };
  q('[data-dugmeler]').addEventListener('click', ev => { const b = ev.target.closest('[data-d]'); if (b && dugmeIsle[b.dataset.d]) dugmeIsle[b.dataset.d](); });
  // f5: güvenlik kodu sayacı ve süre ölçümü
  const sn = ms => Math.max(1, Math.round(ms / 1000));
  const olcumYazi = (o, sonuc) => {
    if (!o) return '';
    const kayit = (sonuc.yazilan || []).filter(x => x.sure != null), ort = kayit.length ? kayit.reduce((a, x) => a + x.sure, 0) / kayit.length : 0;
    const gecen = ((o.bitis || Date.now()) - o.basla) / 60000;
    return [`${o.istek} istek`, `${o.kod.istenen} güvenlik kodu${o.kod.atlanan ? ` (${o.kod.atlanan} atlandı)` : ''}`, kayit.length ? `ortalama kayıt ${sn(ort)} sn` : '', `${gecen < 1 ? '1 dk’dan az' : Math.round(gecen) + ' dk'}`, o.oturumDusme.length ? `${o.oturumDusme.length} kez oturum düştü` : ''].filter(Boolean).join(' · ');
  };
  // Yetkiliye soru (kurum doğrulama gibi): yanıt gelene kadar iş bekler; durdurulursa "hayir" döner
  let soruKapat = null;
  function sor(baslik, yazi, secimler) {
    return new Promise(ok => {
      kart.classList.remove('kucuk', 'gizli'); const k = q('[data-kod]');
      k.innerHTML = `<div class="kod"><b></b><p></p><div class="alt">${secimler.map(([d, y], i) => `<button class="${i === secimler.length - 1 ? 'ana' : 'cz'}" data-s="${d}">${y}</button>`).join('')}</div></div>`;
      k.querySelector('b').textContent = baslik; k.querySelector('p').textContent = yazi;
      const bit = v => { soruKapat = null; k.innerHTML = ''; ok(v); };
      soruKapat = () => bit('hayir');
      k.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => bit(b.dataset.s)));
    });
  }
  // Güvenlik kodu: MEBBİS'in o anki kod resmi gösterilir, yetkili yazar (kod otomatik çözülmez)
  function kodIste(doc) {
    return new Promise(async (ok, red) => {
      if (olc) olc.kod.istenen++; const t0 = Date.now();
      const giris = elBul(doc, 'txtGirisResmi'); let src = '';
      const img = doc.querySelector('img[src*="uvenlik" i], img[src*="aptcha" i], img[src*="Resim" i][src*=".aspx" i], img[id*="Guvenlik" i], img[id*="Resim" i]') || (giris && giris.parentElement && giris.parentElement.querySelector('img'));
      if (img) { try { const r = await fetch(new URL(img.getAttribute('src'), doc.__url || location.href).href, { credentials: 'include' }); src = URL.createObjectURL(await r.blob()); } catch (x) { } }
      kart.classList.remove('kucuk'); const k = q('[data-kod]');
      k.innerHTML = `<div class="kod"><b>MEBBİS güvenlik kodu istiyor</b>${src ? `<img src="${src}" alt="Güvenlik kodu">` : '<small style="color:#a12a20">Kod resmi alınamadı; MEBBİS sayfasının üstündeki kodu yazın.</small>'}<input maxlength="6" autocomplete="off" aria-label="Güvenlik kodu"><div class="alt"><button class="cz" data-iptal>Atla</button><button class="ana" data-tamam>Devam</button></div></div>`;
      const inp = k.querySelector('input'); inp.focus();
      const bit = v => { soruKapat = null; k.innerHTML = ''; if (olc) { olc.kod.bekleme_ms += Date.now() - t0; if (v) olc.kod.girilen++; else olc.kod.atlanan++; } ok(v); };
      soruKapat = () => { soruKapat = null; k.innerHTML = ''; if (olc) olc.kod.bekleme_ms += Date.now() - t0; red(new MebHata(iptal ? 'İş iptal edildi' : 'Durduruldu', iptal ? 'iptal' : 'dur')); };
      k.querySelector('[data-tamam]').addEventListener('click', () => bit(inp.value.trim()));
      k.querySelector('[data-iptal]').addEventListener('click', () => bit(''));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') bit(inp.value.trim()); });
    });
  }

  /* ---------- toplu işi yürütme ---------- */
  // Durdur kalıcıdır (B6): depoya "durduruldu" yazılır, sonraki MEBBİS sayfası işi yeniden başlatmaz; yalnız "Devam et" sürdürür.
  // İptal (B7): mdSinyal'den ya da karttan; motor her işten önce ve çalışırken aralıklarla depoya bakar.
  // Aynı iş iki MEBBİS sekmesinde aynı anda yürümez (kilit).
  let calisiyor = false, durdur = false, iptal = false, aktifId = null, yeniden = null;
  const SAHIP = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const kalanOf = is => { const y = new Set(((is.sonuc || {}).yazilan || []).map(x => x.id)); return (is.yaz || []).flatMap(idlerOf).filter(id => !y.has(id)).length; };
  const kontrol = () => { if (iptal) throw new MebHata('İş iptal edildi', 'iptal'); if (durdur) throw new MebHata('Durduruldu', 'dur'); };
  const durdurBas = id => { durdur = true; q('[data-alt]').textContent = 'Durduruluyor… (süren kayıt bitince durur)'; gonder({ tur: 'toplu-durdur', id }); if (soruKapat) soruKapat(); };
  const iptalEt = async id => { await gonder({ tur: 'toplu-iptal', id, kaynak: 'mebbis' }); goster('İş iptal edildi', null, 'O ana kadar yazılanlar mdSinyal’e aktarılır. Kalan işler MEBBİS’e gönderilmedi.', 'mdSinyal · MEBBİS'); durumSinif('dur'); dugmeler([]); setTimeout(() => kart.classList.add('gizli'), 8000); };
  // Bekleyen (durdurulmuş ya da hatayla durmuş) iş: kart açık kalır, yetkili seçer
  function bekleyenGoster(is) {
    const kalan = kalanOf(is), s = is.sonuc || {};
    const ana = is.durum === 'durduruldu' ? `Durduruldu${kalan ? ` · ${kalan} iş kaldı` : ''}` : `Durdu${kalan ? ` · ${kalan} iş kaldı` : ''}`;
    goster(ana, null, is.durum === 'durduruldu' ? 'İş kendiliğinden yeniden başlamaz. “Devam et” kaldığı yerden sürdürür.' : (s.hata || 'İş durdu.'), 'mdSinyal · MEBBİS işi bekliyor');
    q('[data-olcum]').textContent = olcumYazi(s.olcum, s); durumSinif('dur');
    dugmeler([['sil', 'İşi iptal et', 'cz', () => iptalEt(is.id)], ['devam', is.durum === 'durduruldu' ? 'Devam et' : 'Yeniden dene', 'ana', async () => { await gonder({ tur: 'toplu-devam', id: is.id }); yurut({ devam: true }); }]]);
  }
  // Tarayıcı kapanıp iş bilgileri silindiyse: yalnız ilerleme (kimlikler) kalır; sonuç mdSinyal'e oradan aktarılır
  async function yarimGoster() {
    const l = (await gonder({ tur: 'ilerleme-al' })) || [];
    const r = l.find(x => !x.oturumda && !['bitti', 'iptal'].includes(x.durum)); if (!r) return;
    const ok = (r.yazilan || []).filter(x => x.ok).length, kalan = (r.kimlikler || []).length - (r.yazilan || []).length;
    goster('Yarım kalan MEBBİS işi', null, `Tarayıcı kapandığı için iş bilgileri silindi. ${ok} iş yazılmıştı${kalan > 0 ? `, ${kalan} iş gönderilmedi` : ''}. mdSinyal sekmesini açın: yazılanlar oraya işlenir, kalanları yeniden gönderin.`, 'mdSinyal · MEBBİS');
    durumSinif('dur'); dugmeler([['kapat', 'Kapat', 'cz', () => kart.classList.add('gizli')], ['ac', 'mdSinyal’i aç', 'ana', () => gonder({ tur: 'sinyal-ac' })]]);
  }
  async function geriSay(saniye) {
    dugmeler([['dur', 'Durdur', 'cz', () => durdurBas(aktifId)]]);
    for (let i = saniye; i > 0; i--) { goster('Kaldığı yerden sürüyor', null, `${i} sn içinde başlıyor. Yazılmış kayıtlar yeniden yazılmaz.`); await uyku(1000); kontrol(); }
  }
  async function yurut({ devam = false } = {}) {
    if (calisiyor) return; const is = await gonder({ tur: 'toplu-al' });
    if (!is || is.bitti) return yarimGoster();
    if (document.querySelector('input[type=password]')) { goster('MEBBİS’e kendi şifrenizle girin', 0, 'Girişten sonra mdSinyal’in işi kendiliğinden başlar.'); return; }
    if (!devam && (is.durum === 'durduruldu' || is.durum === 'durdu')) return bekleyenGoster(is);
    const kilit = await gonder({ tur: 'toplu-kilit', id: is.id, sahip: SAHIP });
    if (kilit && kilit.yok) return yarimGoster();   // iş bu arada iptal edildi ya da teslim edildi
    if (kilit && kilit.ok === false) {
      // kilidi tutan sekme kapandıysa ya da sayfa değiştiyse kilit kısa sürede düşer; o zaman burada yeniden denenir
      goster('İş başka bir MEBBİS sekmesinde sürüyor', null, 'Aynı iş iki sekmede birden yürütülmez. O sekme kapanırsa iş birkaç saniye içinde burada sürer.'); dugmeler([]);
      clearTimeout(yeniden); yeniden = setTimeout(() => yurut({ devam }), 13000); return;
    }
    calisiyor = true; durdur = false; iptal = false; aktifId = is.id; ekranOlaylari = [];
    await haritaYukle();
    const sonuc = is.sonuc || { veri: {}, yazilan: [], hata: null };
    const oncekiTur = sonuc.hataTur; sonuc.hata = null; sonuc.hataTur = null; sonuc.mebKurum = null; sonuc.yardimci = SURUM; sonuc.harita = H.surum + (haritaKaynak === 'web' ? ' (web)' : '');
    olc = sonuc.olcum = sonuc.olcum || { basla: Date.now(), bitis: null, istek: 0, kod: { istenen: 0, girilen: 0, atlanan: 0, bekleme_ms: 0 }, tur: {}, oturumDusme: [] }; olc.bitis = null;
    const olaylariEkle = () => { const l = sonuc.ekranDegisti || []; ekranOlaylari.forEach(x => { if (!l.some(y => y.ekran === x.ekran && y.eksik.join() === x.eksik.join())) l.push(x); }); if (l.length) sonuc.ekranDegisti = l; };
    const kaydet = (durum, bitti) => { olaylariEkle(); return gonder({ tur: 'toplu-durum', id: is.id, sonuc, bitti: !!bitti, durum, sahip: SAHIP }); };
    // her işten önce depoya bakılır (B7): mdSinyal'den iptal ya da başka yerden durdurma hemen görülür
    const denetimle = async () => { const t = await gonder({ tur: 'toplu-al' }); if (!t || t.id !== is.id || t.iptal) iptal = true; else if (t.durum === 'durduruldu') durdur = true; kontrol(); };
    const ilerle = (adim, oran) => { kontrol(); goster(adim, oran, 'Bu sekmeyi kapatmayın; MEBBİS’te başka işlem yapabilirsiniz.', 'mdSinyal · MEBBİS’te çalışıyor'); sonuc.adim = adim; q('[data-olcum]').textContent = olcumYazi(olc, sonuc); };
    // çalışırken depoya bakar: mdSinyal'den iptal, başka sekmeden durdur; kilidi tazeler
    const izle = setInterval(async () => {
      const t = await gonder({ tur: 'toplu-al' });
      if (!t || t.id !== is.id || t.iptal) iptal = true; else if (t.durum === 'durduruldu') durdur = true;
      if ((iptal || durdur) && soruKapat) soruKapat();
      if (!iptal) gonder({ tur: 'toplu-kilit', id: is.id, sahip: SAHIP });
    }, 2500);
    durumSinif(''); dugmeler([['dur', 'Durdur', 'cz', () => durdurBas(is.id)]]);
    try {
      if (oncekiTur === 'oturum' && (sonuc.yazilan.length || Object.keys(sonuc.veri).length || sonuc.suruyor)) await geriSay(5);
      await kaydet('calisiyor');
      ilerle('MEBBİS hesabı denetleniyor', 0);
      await kurumDenetle(is, sonuc); await kaydet('calisiyor');
      if (is.denetle) { sonuc.veri.denetim = { harita: sonuc.harita, yardimci: SURUM, kurum: sonuc.kurum || null, ekranlar: await ekranlariDenetle(ilerle) }; await kaydet('calisiyor'); }
      // çekme: ekranı değişmiş türler hiç sorgulanmaz
      const cekilecek = (is.cek || []).filter(ne => sonuc.veri[ne] === undefined);
      const dosyaVar = (is.dosya || []).length && !Array.isArray(sonuc.veri.dosya) || (Array.isArray(sonuc.veri.dosya) && sonuc.veri.dosya.length < (is.dosya || []).length);
      const cekOn = (cekilecek.length || dosyaVar) ? await onUcus([...cekilecek.flatMap(ne => CEKME_EKRAN[ne] || []), ...(dosyaVar ? CEKME_EKRAN.dosya : [])], ilerle) : {};
      const cekEngel = ekranlar => ekranlar.map(k => cekOn[k]).find(o => o && !o.ok);
      for (const ne of cekilecek) {
        await denetimle(); if (!CEKME[ne]) { sonuc.veri[ne] = { hata: 'Bu sürüm bu çekmeyi tanımıyor: ' + ne }; continue; }
        ilerle({ gruplar: 'Dönem grupları okunuyor', kursiyerler: 'Kursiyerler okunuyor', personel: 'Personel okunuyor', araclar: 'Araçlar okunuyor', sinavlar: 'Sınav sonuçları okunuyor' }[ne] || ne, 0);
        const e = cekEngel(CEKME_EKRAN[ne] || []); if (e) { sonuc.veri[ne] = { hata: e.not, hataTur: e.tur }; await kaydet('calisiyor'); continue; }
        try { sonuc.veri[ne] = await CEKME[ne](ilerle); } catch (x) { if (durduran(x)) throw x; ekranKaydet(x); sonuc.veri[ne] = { hata: x.message, hataTur: x.tur }; }
        await kaydet('calisiyor');
      }
      if (dosyaVar) {
        sonuc.veri.dosya = sonuc.veri.dosya || [];
        const e = cekEngel(CEKME_EKRAN.dosya);
        if (e) { sonuc.veri.dosyaHata = e.not; }
        else {
          const taban = await getir('/SKT/skt02009.aspx');
          const yapilan = new Set(sonuc.veri.dosya.map(x => x.tc));
          for (const [i, tc] of is.dosya.entries()) { if (yapilan.has(tc)) continue; ilerle(`Aday dosyaları ${i + 1}/${is.dosya.length}`, (i + 1) / is.dosya.length); try { sonuc.veri.dosya.push(await adayDosyasi(taban, tc)); } catch (x) { if (durduran(x)) throw x; ekranKaydet(x); sonuc.veri.dosya.push({ tc, hata: x.message }); } if (i % 5 === 4) await kaydet('calisiyor'); }
        }
        await kaydet('calisiyor');
      }
      // yazma
      const yazildi = new Set(sonuc.yazilan.map(y => y.id));
      const yazilacak = (is.yaz || []).filter(x => !idlerOf(x).some(id => yazildi.has(id)));
      // yarıda kalan kayıt (istek gitti, yanıt gelmedi): ön denetimi olan işler denetlenerek sürer, e-sınav yeniden gönderilmez
      const belirsiz = new Set(sonuc.suruyor && !yazildi.has(sonuc.suruyor) ? [sonuc.suruyor] : []); sonuc.suruyor = null;
      const on = yazilacak.length ? await onUcus(yazilacak.flatMap(ekranlariOf), ilerle) : {};
      const ekranHatalari = new Set();
      for (const [i, x] of yazilacak.entries()) {
        await denetimle();
        ilerle(`MEBBİS’e yazılıyor ${i + 1}/${yazilacak.length}: ${x.baslik || x.tur}`, (i + 1) / yazilacak.length);
        const ids = idlerOf(x), ekr = ekranlariOf(x);
        const engel = ekr.map(k => on[k]).find(o => o && !o.ok);
        if (engel) { ids.forEach(id => sonuc.yazilan.push({ id, ok: false, not: engel.not, hataTur: engel.tur, ekran: engel.kod, eksik: engel.eksik || [] })); await kaydet('calisiyor'); continue; }
        if (!YAZMA[x.tur]) { ids.forEach(id => sonuc.yazilan.push({ id, ok: false, not: 'Bu Yardımcı sürümü bu iş türünü tanımıyor: ' + x.tur, hataTur: 'veri' })); continue; }
        if (x.tur === 'esinav' && belirsiz.has(x.id)) { sonuc.yazilan.push({ id: x.id, ok: false, not: 'Önceki denemede yanıt gelmeden kesildi; çift başvuru olmasın diye yeniden gönderilmedi. MEBBİS’te e-sınav başvurusunu kontrol edin.', hataTur: 'belirsiz', ekran: ekr[0] }); await kaydet('calisiyor'); continue; }
        sonuc.suruyor = x.id; await kaydet('calisiyor');
        const t0 = Date.now(), k0 = olc.kod.istenen, ek = () => ({ sure: Date.now() - t0, kod: olc.kod.istenen - k0, ekran: ekr[0] || '' });
        try {
          // yazma düğmeleri ve Kaydet yalnız bu çağrı sürerken açık (beyaz liste: DUGME_YAZMA, EYLEM_ALAN)
          let r; yazmaIzni = true; try { r = await YAZMA[x.tur](x, kodIste); } finally { yazmaIzni = false; }
          if (r.alt) r.alt.forEach(y => sonuc.yazilan.push({ id: y.id, ok: !!y.ok, not: y.not || '', dogrulama: y.ok ? (y.dogrulama || 'liste') : '', ...ek() }));
          else sonuc.yazilan.push({ id: x.id, ok: !!r.ok, not: r.not || '', dogrulama: r.ok ? (r.dogrulama || 'liste') : '', ...ek() });
          const tt = olc.tur[x.tur] = olc.tur[x.tur] || { n: 0, ms: 0 }; tt.n++; tt.ms += Date.now() - t0;
        } catch (h) {
          if (h.tur === 'dur' || h.tur === 'iptal') { sonuc.suruyor = null; throw h; }   // güvenlik kodu beklerken durduruldu: kayıt gitmedi
          if (durduran(h)) throw h;
          ekranKaydet(h); if (h.tur === 'ekran') ekranHatalari.add(h.ekran || ekr[0] || '?');
          ids.forEach(id => sonuc.yazilan.push({ id, ok: false, not: h.message, hataTur: h.tur, ...ek(), ...(h.tur === 'ekran' ? { ekran: h.ekran || ekr[0] || '', eksik: h.eksik || [] } : {}) }));
          if (ekranHatalari.size >= 2) { sonuc.suruyor = null; throw new MebHata(`MEBBİS’te birden çok ekran değişmiş görünüyor (${[...ekranHatalari].map(ekranAd).join(', ')}). İş durduruldu ve mdSinyal’e bildirildi; ekran haritası güncellenince “Yeniden dene” ile sürer.`, 'ekran-dur'); }
        }
        sonuc.suruyor = null; await kaydet('calisiyor');
      }
      olc.bitis = Date.now();
      await kaydet('bitti', true);
      const yz = sonuc.yazilan, say = f => yz.filter(f).length, ok = say(x => x.ok), hata = say(x => !x.ok), mesajla = say(x => x.ok && x.dogrulama === 'mesaj'), zaten = say(x => x.ok && x.dogrulama === 'zaten');
      goster('✓ Bitti', 1, (is.yaz || []).length ? `${ok - mesajla - zaten} kayıt MEBBİS’e girildi ve listeden doğrulandı${mesajla ? `, ${mesajla} kayıt yalnız MEBBİS mesajıyla doğrulandı (MEBBİS’te kontrol edin)` : ''}${zaten ? `, ${zaten} kayıt zaten vardı` : ''}${hata ? `, ${hata} kayıt girilemedi` : ''}. Sonuç mdSinyal’de.` : 'Veriler mdSinyal’e gönderildi.', 'mdSinyal · MEBBİS');
      q('[data-olcum]').textContent = olcumYazi(olc, sonuc); durumSinif('tamam'); dugmeler([]);
      setTimeout(() => gonder({ tur: 'sinyal-ac' }), 1500);
      setTimeout(() => kart.classList.add('gizli'), 12000);
    } catch (x) {
      olc.bitis = Date.now(); sonuc.hata = x.message; sonuc.hataTur = x.tur;
      if (x.tur === 'kurum' && x.acik) sonuc.mebKurum = x.acik;   // sözleşme: sayfa uyuşmazlığı açık hesabın koduyla kaydeder (js/eklenti.js tablosu)
      if (x.tur === 'dur') {
        sonuc.hata = 'Durduruldu. MEBBİS sekmesindeki mdSinyal kartından “Devam et” ile kaldığı yerden sürdürebilirsiniz.';
        await kaydet('durduruldu'); const t = await gonder({ tur: 'toplu-al' }); bekleyenGoster(t && t.id === is.id ? t : { ...is, sonuc, durum: 'durduruldu' });
      } else if (x.tur === 'iptal') {
        sonuc.hata = 'İş iptal edildi.'; await kaydet('iptal');
        goster('İş iptal edildi', null, 'O ana kadar yazılanlar mdSinyal’e aktarılır. Kalan işler MEBBİS’e gönderilmedi.', 'mdSinyal · MEBBİS'); durumSinif('dur'); dugmeler([]); setTimeout(() => kart.classList.add('gizli'), 8000);
      } else if (x.tur === 'oturum') {
        olc.oturumDusme.push({ ms_bastan: Date.now() - olc.basla, istek_no: olc.istek }); await kaydet('oturum');
        goster('MEBBİS oturumu kapandı', null, x.message); durumSinif('dur'); dugmeler([]);
      } else {
        await kaydet('durdu'); const t = await gonder({ tur: 'toplu-al' }); bekleyenGoster(t && t.id === is.id ? t : { ...is, sonuc, durum: 'durdu' });
      }
      q('[data-olcum]').textContent = olcumYazi(olc, sonuc);
    } finally { clearInterval(izle); calisiyor = false; aktifId = null; gonder({ tur: 'toplu-kilit-birak', id: is.id, sahip: SAHIP }); }
  }
  // yerel test (sinyal-kaynak/arac/mebbis-test): yalnız test sayfası bu kancayı tanımlarsa iç işlevler verilir; eklentide tanımsız (içerik betiği yalıtılmış dünyada)
  if (typeof globalThis.__sinyalMotorTest === 'function') globalThis.__sinyalMotorTest({ CEKME, YAZMA, postla, getir, secenek, kayitliMi, adayDosyasi, dugmeDenetle, yazmaAc: async f => { yazmaIzni = true; try { return await f(); } finally { yazmaIzni = false; } } });
  const ekle = () => { if (!document.body) return setTimeout(ekle, 300); document.body.appendChild(kok); yurut(); };
  // sayfa değişirken kilit bırakılır; yeni sayfadaki motor beklemeden sürdürebilsin
  addEventListener('pagehide', () => { if (aktifId) gonder({ tur: 'toplu-kilit-birak', id: aktifId, sahip: SAHIP }); });
  ekle();
  chrome.runtime.onMessage.addListener(m => { if (m && (m.tur === 'yeniden-bak' || m.tur === 'toplu-basla')) yurut(); });
})();
