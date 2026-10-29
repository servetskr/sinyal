import { S, kaydet, gun, fark, kursiyer, egitmen, tamAd, eksikEvrak, kalanBorc, gecikenler, islem, gonderimEkle, SINIFLAR, ustaAraci, isGunuIleri, yerelZaman } from './veri.js?v=38';
import { e, ik, isaret, bildir, tl, tamTarih, tarihUzun, saatDe, saatE, apiAcik, belgeWhatsApp, giden, waSirali, waAc, ekranNotu } from './ui.js?v=38';
import { wpGonder, bildirimler, odemeBilgisi, yorumMetni } from './sayfalar1.js?v=38';
import { belgeHtml, dosyaAdi } from './sayfalar3.js?v=38';
import { ornekGonder } from './zamanlayici.js?v=38';
import { imzaIste } from './imza.js?v=38';

/* ================= DEMO SENARYOLARI =================
   Kursun gerçek işlemlerini örnek kayıtlar üzerinde çalıştırır; her senaryonun mesajları
   (öğrenci, hoca, müdür, aday) WhatsApp API ile kurs sahibinin telefonuna rol etiketiyle gelir. */

const SAATLER = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const bul = {
  direksiyon: () => S.kursiyerler.find(k => k.asama === 'Direksiyon' && ustaAraci(k.egitmen, k.sinif) && k.tel),
  teorik: () => S.kursiyerler.find(k => k.asama === 'Teorik') || S.kursiyerler[0],
  borclu: () => S.kursiyerler.find(k => k.odeme.taksitler.some(t => !t.odendi)),
  geciken: () => S.kursiyerler.find(k => gecikenler(k).length) || bul.borclu(),
  evraksiz: () => S.kursiyerler.find(k => eksikEvrak(k).length) || S.kursiyerler[0],
  senetli: () => S.kursiyerler.find(k => k.odeme.senetli && k.odeme.taksitler.some(t => !t.odendi)) || bul.borclu(),
  sinavda: () => S.kursiyerler.find(k => k.asama === 'Sınav') || bul.direksiyon(),
};
let demoDers = null;
const bosSaat = (k, t) => { const ar = ustaAraci(k.egitmen, k.sinif); return SAATLER.find(s => !S.dersler.some(d => d.tarih === t && d.saat === s && (d.egitmen === k.egitmen || d.kursiyer === k.id || (ar && d.arac === ar.id)))); };
const hocaAd = h => h.ad.split(' ')[0] + ' Hoca';

const SENARYOLAR = [
  ['Kayıt ve evrak', [
    { id: 'hos', ad: 'Yeni kayıt: hoş geldin ve ödeme planı', kim: ['Öğrenci'], ne: 'Kayıt tamamlanınca', calis: () => { const k = bul.borclu(), g = S.gruplar.find(x => x.id === k.teorikGrup); wpGonder(k, `Merhaba ${k.ad}, ${S.kurs.ad} ailesine hoş geldin! Sınıfın: ${SINIFLAR[k.sinif].ad}.${g ? ` Teorik derslerin ${tamTarih(g.baslangic)} tarihinde ${g.ad.toLocaleLowerCase('tr')} ile başlıyor.` : ''} Ödeme planın: peşinat ${tl(k.odeme.pesin)}; ${k.odeme.taksitler.map((t, i) => `${i + 1}) ${tamTarih(t.vade)} · ${tl(t.tutar)}`).join(', ')}. ${odemeBilgisi()}`, 'Hoş geldin'); } },
    { id: 'imza', ad: 'Sözleşmeyi telefondan imzalat', kim: ['Öğrenci', 'Kursa gelen'], ne: 'Öğrenci kursta imzalamadıysa', ipucu: 'Telefonuna gelen linki aç, sözleşmeyi oku ve parmağınla imzala. İmza sana “KURSA GELEN” olarak döner. O dönüş linkine bilgisayardaki WhatsApp Web’den tıkla: imza Sinyal’e işlenir ve sözleşmenin PDF’i öğrenciye gider.', calis: async () => { const k = S.kursiyerler.find(x => !x.evrak.sozlesme) || bul.teorik(); await imzaIste('sozlesme', k); } },
    { id: 'sozpdf', ad: 'Sözleşmenin PDF’i öğrenciye', kim: ['Öğrenci'], ne: 'İmza sonrası ya da istenince', belge: true, calis: () => { const k = bul.borclu(); return belgeWhatsApp(belgeHtml('sozlesme', k.id), dosyaAdi('Sözleşme', tamAd(k)), `Merhaba ${k.ad}, kurs sözleşmenin kopyası ekte. ${S.kurs.ad}`, tamAd(k), 'ÖĞRENCİ'); } },
    { id: 'evrak', ad: 'Eksik evrak hatırlatması', kim: ['Öğrenci'], ne: 'Kayıttan 3 ve 10 gün sonra 11:00', calis: () => ornekGonder('o4') },
  ]],
  ['Teorik dersler', [
    { id: 'grup', ad: 'Teorik grup başlıyor', kim: ['Öğrenci'], ne: 'Gruptan 2 gün önce 10:00', calis: () => ornekGonder('o14') },
    { id: 'tgelmedi', ad: 'Teorik derse gelmedi', kim: ['Öğrenci'], ne: 'Yoklama kaydedilince', calis: () => { const k = bul.teorik(); wpGonder(k, `Merhaba ${k.ad}, bugünkü teorik derse (Trafik ve çevre bilgisi) katılmadın. Devamsızlık sınırına yaklaştın; bir derse daha gelmezsen sınava giremeyebilirsin.`, 'Yoklama'); } },
  ]],
  ['Direksiyon dersleri', [
    { id: 'planla', ad: 'Ders planlandı', kim: ['Öğrenci', 'Hoca'], ne: 'Plana ders eklenince', calis: () => { const k = bul.direksiyon(), h = egitmen(k.egitmen), ar = ustaAraci(k.egitmen, k.sinif); let t = isGunuIleri(gun(1)), s = bosSaat(k, t); if (!s) { t = isGunuIleri(gun(2)); s = bosSaat(k, t); } if (!s) return bildir('Yarın boş saat yok', 'uyari'); const d = { id: 'd' + Date.now(), kursiyer: k.id, egitmen: h.id, arac: ar.id, tarih: t, saat: s, durum: 'Planlandı', eklendi: gun(0) }; S.dersler.push(d); demoDers = d.id; islem('Ders ekledi', tamAd(k) + ' · ' + tamTarih(t) + ' ' + s); kaydet(); bildirimler([{ kim: k, metin: `Merhaba ${k.ad}, ${tarihUzun(t)} ${saatDe(s)} ${h.ad} ile direksiyon dersin planlandı. Araç: ${ar.model} · ${ar.plaka}.`, tur: 'Ders bildirimi' }, { kim: h, metin: `${hocaAd(h)}, ${tarihUzun(t)} ${saatDe(s)} ${tamAd(k)} (${SINIFLAR[k.sinif].ad}) ile direksiyon dersiniz var. Kursiyerin ${k.direksiyon + 1}. dersi.`, tur: 'Ders bildirimi' }], 'Ders planlandı'); } },
    { id: 'tasi', ad: 'Ders saati değişti', kim: ['Öğrenci', 'Hoca'], ne: 'Ders sürüklenince ya da taşınınca', calis: () => { const d = S.dersler.find(x => x.id === demoDers) || S.dersler.find(x => x.durum === 'Planlandı' && fark(x.tarih) >= 1); if (!d) return bildir('Taşınacak ders yok', 'uyari'); const k = kursiyer(d.kursiyer), h = egitmen(d.egitmen), eski = d.saat, yeni = SAATLER.find(s => s !== eski && !S.dersler.some(x => x !== d && x.tarih === d.tarih && x.saat === s && (x.egitmen === d.egitmen || x.kursiyer === d.kursiyer))); if (!yeni) return bildir('Boş saat yok', 'uyari'); d.saat = yeni; demoDers = d.id; islem('Dersi taşıdı', tamAd(k) + ' · ' + eski + ' → ' + yeni); kaydet(); bildirimler([{ kim: k, metin: `Merhaba ${k.ad}, ${tarihUzun(d.tarih)} direksiyon dersin ${eski} yerine ${saatE(yeni)} alındı.`, tur: 'Saat değişikliği' }, { kim: h, metin: `${hocaAd(h)}, ${tarihUzun(d.tarih)} ${tamAd(k)} dersi ${eski} yerine ${saatE(yeni)} alındı.`, tur: 'Saat değişikliği' }], 'Ders saati değişti'); } },
    { id: 'iptal', ad: 'Ders iptal + boş saat teklifi', kim: ['Öğrenci', 'Hoca', 'Bekleme listesi'], ne: 'Ders iptal edilince', calis: () => { const d = S.dersler.find(x => x.id === demoDers) || S.dersler.find(x => x.durum === 'Planlandı' && fark(x.tarih) >= 1); if (!d) return bildir('İptal edilecek ders yok', 'uyari'); const k = kursiyer(d.kursiyer), h = egitmen(d.egitmen); S.dersler = S.dersler.filter(x => x !== d); demoDers = null; islem('Ders iptal etti', tamAd(k) + ' · ' + tamTarih(d.tarih) + ' ' + d.saat); const aday = S.kursiyerler.find(x => x.id !== k.id && x.asama === 'Direksiyon' && x.sinif === k.sinif); if (aday) { S.bosTeklif = S.bosTeklif || []; S.bosTeklif.push({ id: 'b' + Date.now(), tarih: d.tarih, saat: d.saat, egitmen: d.egitmen, arac: d.arac, adaylar: [aday.id], gonderildi: yerelZaman() }); } kaydet(); bildirimler([{ kim: k, metin: `Merhaba ${k.ad}, ${tarihUzun(d.tarih)} ${d.saat} direksiyon dersin iptal edildi. Yeni saat için bize yazabilirsin.`, tur: 'Ders iptali' }, { kim: h, metin: `${hocaAd(h)}, ${tarihUzun(d.tarih)} ${d.saat} ${tamAd(k)} dersi iptal edildi; o saat boş.`, tur: 'Ders iptali' }, aday && { kim: aday, metin: `Merhaba ${aday.ad}, ${tarihUzun(d.tarih)} ${saatDe(d.saat)} ${h.ad} ile direksiyon saati boşaldı. İstersen “evet” yaz; ilk yazan alır.`, tur: 'Boş saat teklifi' }], 'Ders iptal edildi'); } },
    { id: 'hatirlat', ad: 'Dersten bir gün önce hatırlatma', kim: ['Öğrenci'], ne: 'Her akşam 18:00', calis: () => ornekGonder('o1') },
    { id: 'program', ad: 'Hocaya yarınki program', kim: ['Hoca'], ne: 'Her akşam 18:00', calis: () => ornekGonder('o10') },
    { id: 'dersimza', ad: 'Ders sonu: öğrencinin imzası WhatsApp’tan', kim: ['Öğrenci', 'Kursa gelen'], ne: 'Öğrenci imzalamadan ayrıldıysa', ipucu: 'Hoca dersi kendi imzasıyla kapattı; öğrencinin imzası WhatsApp’tan istenir. Linki aç, imzala; dönüş linkine bilgisayardan tıkla. İmza takip formuna “uzaktan” diye işlenir, formun PDF’i öğrenciye gider.', calis: async () => { const k = bul.direksiyon(), h = egitmen(k.egitmen), ar = ustaAraci(k.egitmen, k.sinif); const d = { id: 'd' + Date.now(), kursiyer: k.id, egitmen: h.id, arac: ar.id, tarih: gun(0), saat: '10:00', bas: '10:00', bit: '10:50', sure: 50, durum: 'Yapıldı', imza: { zaman: gun(0) + 'T10:50', kursiyer: null, kursiyerBekliyor: true, usta: null } }; S.dersler.push(d); k.direksiyon = Math.min(SINIFLAR[k.sinif].direksiyon, k.direksiyon + 1); kaydet(); await imzaIste('ders', k, [d.id]); } },
    { id: 'gelmedi', ad: 'Öğrenci derse gelmedi', kim: ['Öğrenci', 'Müdür'], ne: 'Hoca “gelmedi” işaretleyince', calis: () => { const k = bul.direksiyon(), h = egitmen(k.egitmen); bildirimler([{ kim: k, metin: `Merhaba ${k.ad}, 10:00 direksiyon dersinde seni bekledim ama gelmedin. Yeni saat için kursa yazabilirsin. ${h.ad}`, tur: 'Gelmedi bildirimi' }, { kim: 'mudur', metin: `${tamAd(k)} 10:00 dersine gelmedi; ${h.ad} işaretledi.`, tur: 'Gelmedi bildirimi' }], 'Derse gelmedi'); } },
    { id: 'takippdf', ad: 'Direksiyon takip formu PDF’i', kim: ['Öğrenci'], ne: 'İstenince ya da imza sonrası', belge: true, calis: () => { const k = S.kursiyerler.find(x => x.direksiyon >= 6) || bul.direksiyon(); return belgeWhatsApp(belgeHtml('takip', k.id), dosyaAdi('Takip formu', tamAd(k)), `Merhaba ${k.ad}, direksiyon eğitimi takip formun ekte. ${S.kurs.ad}`, tamAd(k), 'ÖĞRENCİ'); } },
  ]],
  ['Ödemeler', [
    { id: 'taksit3', ad: 'Taksit 3 gün kala hatırlatma', kim: ['Öğrenci'], ne: 'Vadeden 3 gün önce ve vade günü 10:00', calis: () => ornekGonder('o2') },
    { id: 'gecikme', ad: 'Taksit gecikti', kim: ['Öğrenci'], ne: 'Vadenin ertesi günü', calis: () => { const k = bul.geciken(), tk = gecikenler(k)[0] || k.odeme.taksitler.find(t => !t.odendi); wpGonder(k, `Merhaba ${k.ad}, ${tamTarih(tk.vade)} vadeli ${tl(tk.tutar)} taksidin henüz ödenmedi. ${odemeBilgisi()}`, 'Taksit hatırlatması'); } },
    { id: 'odeme', ad: 'Ödeme alındı + makbuz PDF’i', kim: ['Öğrenci'], ne: 'Tahsilat yapılınca', belge: true, calis: async () => { const k = bul.borclu(), i = k.odeme.taksitler.findIndex(t => !t.odendi), t = k.odeme.taksitler[i], v = t.tutar - (t.kismi || 0); t.odendi = gun(0); t.yontem = 'Kart'; delete t.kismi; const hid = 'h' + Date.now(); S.hareket.unshift({ id: hid, tarih: gun(0), tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + (i + 1) + '. taksit', tutar: v, yontem: 'Kart', kursiyer: k.id }); islem('Tahsilat aldı', tamAd(k) + ' · ' + tl(v)); kaydet(); return belgeWhatsApp(belgeHtml('makbuz', k.id, hid), dosyaAdi('Makbuz', tamAd(k)), `Merhaba ${k.ad}, ${tl(v)} ödemen alındı, teşekkürler. Kalan borcun ${tl(kalanBorc(k))}. Makbuzun ekte. ${S.kurs.ad}`, tamAd(k), 'ÖĞRENCİ'); } },
    { id: 'fatura', ad: 'e-Arşiv fatura PDF’i (entegratör yoksa taslak)', kim: ['Öğrenci'], ne: 'Fatura kesilince', belge: true, calis: () => { const h = S.hareket.find(x => x.tur === 'Gelir' && x.kursiyer && kursiyer(x.kursiyer)); const k = kursiyer(h.kursiyer); S.faturalar = S.faturalar || []; let f = S.faturalar.find(x => x.hareket === h.id); if (!f) { const yil = gun(0).slice(0, 4), seri = ((S.entegrasyon.earsiv || {}).seri || 'SNY'); f = { no: seri + yil + String(S.faturalar.length + 1).padStart(9, '0'), ettn: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())).toUpperCase(), tarih: gun(0), kursiyer: k.id, hareket: h.id, tutar: h.tutar, kdv: S.entegrasyon.kdv ?? 20, aciklama: SINIFLAR[k.sinif].ad + ' sertifika sınıfı sürücü kursu eğitim hizmeti', yontem: h.yontem, odemeTarih: h.tarih, durum: S.entegrasyon.earsiv.bagli ? 'sira' : 'taslak' }; S.faturalar.push(f); h.fatura = f.no; islem('Fatura kesti', f.no); kaydet(); } return belgeWhatsApp(belgeHtml('fatura', f.no), f.no + '.pdf', `Merhaba ${k.ad}, ${tl(f.tutar)} tutarındaki e-Arşiv faturan ekte. ${S.kurs.ad}`, tamAd(k), 'ÖĞRENCİ'); } },
    { id: 'senet', ad: 'Senet PDF’i', kim: ['Öğrenci'], ne: 'Senetli satışta', belge: true, calis: () => { const k = bul.senetli(); return belgeWhatsApp(belgeHtml('senet', k.id), dosyaAdi('Senet', tamAd(k)), `Merhaba ${k.ad}, ödeme planına ait senetler ekte; kursa gelirken imzalayıp getirebilirsin. ${S.kurs.ad}`, tamAd(k), 'ÖĞRENCİ'); } },
  ]],
  ['Sınavlar ve ehliyet', [
    { id: 'sinavhat', ad: 'Sınav hatırlatması (öğrenci + hoca listesi)', kim: ['Hoca', 'Öğrenci'], ne: 'Sınava 3 ve 1 gün kala 10:00', calis: () => ornekGonder('o3') },
    { id: 'gecti', ad: 'Direksiyon sınavını geçti', kim: ['Öğrenci', 'Hoca'], ne: 'Sonuç girilince', calis: () => { const k = bul.sinavda(), h = egitmen(k.egitmen); bildirimler([{ kim: k, metin: yorumMetni(k), tur: 'Sınav sonucu' }, { kim: h, metin: `${hocaAd(h)}, ${tamAd(k)} direksiyon sınavını geçti. Tebrikler!`, tur: 'Sınav sonucu' }], 'Sınav sonucu'); } },
    { id: 'kaldi', ad: 'Sınavdan kaldı + ek ders teklifi', kim: ['Öğrenci', 'Hoca'], ne: 'Sonuç girilince', calis: () => { const k = bul.sinavda(), h = egitmen(k.egitmen), f = 2 * (S.kurs.ekDersUcreti || 900); bildirimler([{ kim: k, metin: `Merhaba ${k.ad}, direksiyon sınavı bu sefer olmadı. Üzülme, 3 hakkın daha var. Sınavdan önce 2 ek direksiyon dersi (${tl(f)}) öneriyoruz; “evet” yazarsan planlayalım.`, tur: 'Sınav sonucu' }, { kim: h, metin: `${hocaAd(h)}, ${tamAd(k)} direksiyon sınavından kaldı; 2 ek ders teklif edildi.`, tur: 'Sınav sonucu' }], 'Sınav sonucu'); } },
    { id: 'sertifika', ad: 'Sertifika düzenlendi', kim: ['Öğrenci'], ne: 'MEBBİS’te sertifika düzenlenince', calis: () => { const k = S.kursiyerler.find(x => x.asama === 'Ehliyet') || bul.sinavda(); wpGonder(k, `Tebrikler ${k.ad}! Sertifikan MEBBİS’te düzenlendi. Nüfus müdürlüğünden randevu alıp kimliğinle sürücü belgeni teslim alabilirsin.`, 'Sertifika bildirimi'); } },
  ]],
  ['Kurs yönetimi', [
    { id: 'ozet', ad: 'Müdüre akşam özeti', kim: ['Müdür'], ne: 'Her akşam 19:00', calis: () => ornekGonder('o12') },
    { id: 'belgesure', ad: 'Araç / belge süresi uyarısı', kim: ['Müdür'], ne: 'Bitmeden 30, 7, 1 gün önce 09:00', calis: () => ornekGonder('o13') },
    { id: 'gunsonu', ad: 'Gün sonu kasa özeti', kim: ['Müdür'], ne: 'Gün kapatılınca', calis: () => { const bh = S.hareket.filter(h => h.tarih === gun(0)), gel = bh.filter(h => h.tur === 'Gelir').reduce((a, h) => a + h.tutar, 0), gid = bh.filter(h => h.tur === 'Gider').reduce((a, h) => a + h.tutar, 0); waAc(S.kurs.wp, `${S.kurs.ad} · ${tamTarih(gun(0))} gün sonu\nTahsilat: ${tl(gel)} (${bh.filter(h => h.tur === 'Gelir').length} işlem)\nGider: ${tl(gid)}\nKasa sayımı: fark yok\nKapatan: Selda Korkmaz`, 'WhatsApp', '', false, 'MÜDÜR'); } },
  ]],
  ['Adaylar ve duyurular', [
    { id: 'gorusme', ad: 'Kayıt görüşmesi hatırlatması', kim: ['Aday'], ne: 'Görüşmeden 1 gün önce 18:00', calis: () => ornekGonder('o11') },
    { id: 'adaytakip', ad: 'Düşünen adaya takip', kim: ['Aday'], ne: 'Bilgi aldıktan 2 gün sonra', calis: () => ornekGonder('o7') },
    { id: 'duyuru', ad: 'Toplu duyuru (bayram tatili)', kim: ['Öğrenciler'], ne: 'Elle, gruba', calis: () => { const l = S.kursiyerler.filter(k => k.asama !== 'Ehliyet').slice(0, 2), m = k => `Merhaba ${k.ad}, Cumhuriyet Bayramı nedeniyle 29 Ekim’de kursumuz kapalı. 30 Ekim’den itibaren dersler normal saatinde devam ediyor. İyi bayramlar! ${S.kurs.ad}`; waSirali(l.map(k => ({ ad: tamAd(k), tel: k.tel, rol: 'ÖĞRENCİ', metin: m(k) })), 'Toplu duyuru', { sessiz: true }); } },
  ]],
];

const ROL_RENK = { 'ÖĞRENCİ': '#0a4da2', 'HOCA': '#0f8a5f', 'MÜDÜR': '#b45309', 'ADAY': '#7c3aed', 'KURSA GELEN': '#c2410c' };
function telefonHtml() {
  if (!giden.length) return `<div class="tel-bos">${ik('wp')}<p>Senaryo çalıştırınca telefonuna giden mesajlar burada da görünür.</p></div>`;
  return giden.slice(-30).map(x => { const m = x.metin.match(/^\[([^\]]+)\]\n/), et = m ? m[1] : '', rol = et.split(' · ')[0], govde = m ? x.metin.slice(m[0].length) : x.metin; return `<div class="tel-balon">${et ? `<span class="tel-etiket" style="background:${ROL_RENK[rol] || '#555'}">${e(et)}</span>` : ''}${x.dosya ? `<div class="tel-dosya">${ik('belge')}<span>${e(x.dosya)}<small>PDF</small></span></div>` : ''}<p>${e(govde).replace(/\n/g, '<br>').replace(/(https?:\/\/\S+)/g, '<u>bağlantı</u>')}</p><small>${x.zaman} ${x.durum === 'iletildi' ? '✓✓' : x.durum === 'hata' ? '· gitmedi' : '· gidiyor'}</small></div>`; }).join('');
}

export function senaryolar() {
  const api = apiAcik();
  return {
    baslik: 'Demo senaryoları', alt: 'Kursun her mesaj durumunu tek tuşla canlı göster',
    html: `${ekranNotu('Her senaryo kursun gerçek bir işlemini örnek kayıtlar üzerinde çalıştırır. Öğrenciye, hocaya, müdüre ve adaya gidecek mesajlar WhatsApp’tan senin telefonuna gelir; mesajın başında kimin telefonuna gittiği yazar. Belgeler PDF dosyası olarak gelir.')}
    ${api ? '' : `<div class="ipucu uyari" style="margin-bottom:14px">${isaret('uyari', 20)}<span>WhatsApp otomatik gönderim bağlı değil. Ayarlar › Kurs bilgileri’nde API adresini girin; bağlı değilken mesajlar WhatsApp’ta açılır, belgeler PDF olarak gitmez.</span></div>`}
    <div class="senaryo-yerlesim">
      <div>${SENARYOLAR.map(([g, l]) => `<div class="kart" style="margin-bottom:14px"><div class="kart-bas"><h3>${e(g)}</h3><small>${l.length} senaryo</small></div><ul class="liste senaryo-liste">${l.map(x => `<li><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(x.ad)}${x.belge ? ' <span class="rozet rozet-mavi">PDF</span>' : ''}</b><small style="display:block;color:var(--soluk)">${e(x.ne)} · ${x.kim.map(k => `<span style="color:${ROL_RENK[k.toLocaleUpperCase('tr')] || 'inherit'};font-weight:700">${e(k)}</span>`).join(', ')}</small>${x.ipucu ? `<small style="display:block;margin-top:4px;color:var(--metin)">${e(x.ipucu)}</small>` : ''}</div><button class="dg dg-wp dg-kucuk" data-senaryo="${x.id}">${ik('wp')}Gönder</button></li>`).join('')}</ul></div>`).join('')}</div>
      <aside class="telefon"><div class="tel-ust"><b>${e(S.kurs.ad)}</b><small>WhatsApp · ${api ? 'otomatik gönderim açık' : 'bağlı değil'}</small></div><div class="tel-akis" id="tel-akis">${telefonHtml()}</div></aside>
    </div>`,
    baglan(kap) {
      const ciz = () => { const a = kap.querySelector('#tel-akis'); if (!a) return; a.innerHTML = telefonHtml(); a.scrollTop = 1e6; };
      window.addEventListener('sinyal-giden', ciz); ciz();
      kap.addEventListener('click', async ev => {
        const b = ev.target.closest('[data-senaryo]'); if (!b) return;
        const sc = SENARYOLAR.flatMap(([, l]) => l).find(x => x.id === b.dataset.senaryo);
        b.disabled = true; const eski = b.innerHTML; b.textContent = sc.belge ? 'PDF hazırlanıyor…' : 'Gönderiliyor…';
        try { await sc.calis(); } catch (x) { console.error(x); bildir('Senaryo çalışmadı: ' + x.message, 'uyari'); }
        setTimeout(() => { b.disabled = false; b.innerHTML = eski; }, 1200);
      });
    },
  };
}
