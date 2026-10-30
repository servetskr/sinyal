// Öğrenci hesapları (kurs tarafı): müdür ya da ön büro hesabı açar, giriş bilgileri öğrenciye WhatsApp'tan gider,
// öğrenci ilk girişte kendi şifresini belirler. Şifresini unutan öğrencinin talebi buraya düşer; tek dokunuşla yeni geçici şifre gider.
import { S, kaydet, gun, tamAd, islem, selam, oturum, sb, SINIFLAR, egitmen, eksikEvrak, kursAdi } from './veri.js?v=97';
import { e, ik, tarih, pencere, kapatPencere, bildir, waSirali, tl, tamTarih } from './ui.js?v=97';
import * as B from './bulut.js?v=97';
import { wpGonder, alici, odemeBilgisi } from './sayfalar1.js?v=97';

const yetkili = () => oturum.kullanici && ['mudur', 'sekreter'].includes(oturum.kullanici.rol);
const talepVar = k => B.bulutta() && !!k.hesap && (B.bulut.sifreTalep || []).some(t => t.tel === k.hesap.tel);
export const talepEdenler = () => (B.bulutta() ? (B.bulut.sifreTalep || []) : []).map(t => S.kursiyerler.find(k => k.hesap && k.hesap.tel === t.tel && !k.kapali)).filter(Boolean);

export const mesaj = (k, r) => `${selam(k)} ${S.kurs.ad} öğrenci uygulamasında ${r.yeniden ? 'şifreniz yenilendi' : 'hesabınız açıldı'}. Giriş: ${B.ogrenciGirisLinki()} Telefon: ${B.telGoster(r.tel)} Geçici şifre: ${r.sifre} İlk girişte kendi şifrenizi belirleyeceksiniz.${r.yeniden ? '' : ' Ders programınızı, derslerinizi, ödemelerinizi ve sınavlarınızı buradan görebilir, evraklarınızı yükleyebilir, direksiyon dersi alabilirsiniz.'} Şifrenizi kimseyle paylaşmayın.`;

// Demoda gerçek hesap açılmaz: akış ve mesaj aynıdır, mesaj yalnız demo numarasına gider
async function ac(k) {
  if (B.bulutta()) return B.ogrenciHesapAc(k);
  const tel = B.telNorm(k.tel); if (!tel) throw Object.assign(new Error(), { kullanici: 'Öğrencinin cep telefonu numarası geçersiz; önce bilgilerini düzeltin' });
  const yeniden = !!k.hesap; k.hesap = { tel, uid: 'demo', acildi: gun(0), kim: oturum.kullanici ? oturum.kullanici.ad : '', sifirlandi: yeniden ? gun(0) : null, demo: true }; delete k.hesapAktif;
  return { tel, sifre: B.geciciSifre(), yeniden };
}
async function kapat(k) { if (B.bulutta()) return B.ogrenciHesapKapat(k); k.hesap = null; delete k.hesapAktif; }

export function hesapSeridi(k) {
  if (!yetkili() || k.kapali) return '';
  const h = k.hesap, t = talepVar(k);
  const durum = h ? [B.telGoster(h.tel), 'açıldı ' + tarih(h.acildi), h.sifirlandi ? 'şifre yenilendi ' + tarih(h.sifirlandi) : '', k.hesapAktif ? 'kullanıyor' + (k.sonGiris ? ' · son giriş ' + tarih(k.sonGiris) : '') : 'ilk giriş bekleniyor'].filter(Boolean).join(' · ') : 'Öğrenci kendi telefonundan program, ders, ödeme, sınav ve evraklarını görsün; ders alsın, evrak yüklesin, deneme sınavı çözsün';
  return `<div class="panel-serit"${t ? ' style="border-color:var(--kirmizi)"' : ''}><span>${ik('tel')}<b>Öğrenci hesabı</b><small>${e(durum)}${t ? ' · <b style="color:var(--kirmizi)">şifresini unuttu</b>' : ''}</small></span><span class="sag" style="gap:6px">${h
    ? `<button type="button" class="dg ${t ? 'dg-ana' : 'dg-hafif'} dg-kucuk" data-hesap-sifre>Yeni geçici şifre gönder</button><button type="button" class="dg dg-hafif dg-kucuk" data-hesap-kapat>Hesabı kapat</button>`
    : `<button type="button" class="dg dg-ana dg-kucuk" data-hesap-ac>Hesap aç ve WhatsApp’tan gönder</button>`}</span></div>`;
}
// kayıt sırasında: hesap arka planda açılır, giriş bilgileri gönderilir
// Kayıt sonrası karşılama: öğrenciye konusuna göre ayrı mesajlar (hoş geldin, eksik evrak, uygulama girişi, ödeme planı, teorik ders),
// usta öğreticiye yeni öğrenci bildirimi. İstenirse öğrenci hesabı önce açılır, geçici şifre 3. mesajla gider.
export async function karsilama(k, { hos = true, hesap = true } = {}) {
  let r = null;
  if (hesap && !k.hesap) r = await ac(k).then(x => { islem('Öğrenci hesabı açtı', tamAd(k)); kaydet(); return x; }).catch(x => { bildir('Öğrenci hesabı açılamadı: ' + B.hataMetni(x) + '. Öğrenci dosyasından tekrar deneyin', 'uyari'); return null; });
  const a = alici(k), ogr = metin => ({ ad: a.ad, tel: a.tel, rol: a.rol, metin, tur: 'Hoş geldin' }), l = [];
  if (hos) {
    l.push(ogr(`${selam(k)} ${kursAdi('e')} hoş geldiniz! Kaydınız tamamlandı. Sınıfınız: ${SINIFLAR[k.sinif].ad}.`));
    const ek = eksikEvrak(k).filter(([x]) => x !== 'sozlesme');
    if (ek.length) l.push(ogr(`Kaydınızı tamamlamak için şu belgeler eksik:\n${ek.map(([, ad]) => '• ' + ad).join('\n')}\nBelgelerin fotoğrafını ya da PDF'ini bu numaraya WhatsApp'tan gönderebilirsiniz; her belge doğrudan dosyanıza işlenir.`));
  }
  if (r) l.push(ogr(`Öğrenci uygulamanız hazır.\nGiriş: ${B.ogrenciGirisLinki()}\nKullanıcı adı: ${B.telGoster(r.tel)}\nGeçici şifre: ${r.sifre}\nİlk girişte şifrenizi değiştirmeyi unutmayın. Ders programınızı, ödemelerinizi ve sınavlarınızı buradan görebilir, sınava çalışabilirsiniz.`));
  if (hos) {
    const o = k.odeme, t = o.taksitler.filter(x => !x.iptal);
    l.push(ogr(t.length ? `Ödeme planınız (toplam ${tl(o.toplam)}):\n${o.pesin ? `• Peşinat: ${tl(o.pesin)} (ödendi)\n` : ''}${t.map((x, i) => `• ${x.aciklama || (i + 1) + '. taksit'}: ${tamTarih(x.vade)} · ${tl(x.tutar)}${x.odendi ? ' (ödendi)' : ''}`).join('\n')}\n${odemeBilgisi()}` : `Kurs ücretiniz ${tl(o.toplam)}${o.pesin >= o.toplam ? ' peşin ödendi, teşekkürler.' : '. ' + odemeBilgisi()}`));
    const g = (S.gruplar || []).find(x => x.id === k.teorikGrup);
    if (g) l.push(ogr(`Teorik dersleriniz ${tamTarih(g.baslangic)} tarihinde başlıyor: ${g.ad}${g.saat ? ', ' + g.saat : ''}. Derslere kimliğinizle gelin.`));
    const h = egitmen(k.egitmen);
    if (h) { const b = alici(h); l.push({ ad: b.ad, tel: b.tel, rol: b.rol, tur: 'Yeni öğrenci', metin: `${h.ad.split(' ')[0]} Hoca, yeni öğrenciniz: ${tamAd(k)} · ${SINIFLAR[k.sinif].ad} · ${k.tel}. Direksiyon dersleri e-sınavdan sonra planlanacak; planlanınca size ayrıca bildirim gelir.` }); }
  }
  if (!l.length) return;
  waSirali(l, 'Kayıt mesajları', { sessiz: true });
}
export function hesapAcSessiz(k) {
  if (k.hesap) return;
  ac(k).then(r => { islem('Öğrenci hesabı açtı', tamAd(k)); kaydet(); wpGonder(k, mesaj(k, r), 'Öğrenci hesabı'); }).catch(x => bildir('Öğrenci hesabı açılamadı: ' + B.hataMetni(x) + '. Öğrenci dosyasından tekrar deneyin', 'uyari'));
}
// öğrenci dosyasındaki tıklamalar; işlendiyse true
export function hesapTikla(ev, k, yenile) {
  const b = ev.target.closest('[data-hesap-ac], [data-hesap-sifre]');
  if (b) {
    b.disabled = true;
    ac(k).then(r => {
      islem(r.yeniden ? 'Öğrenciye yeni geçici şifre gönderdi' : 'Öğrenci hesabı açtı', tamAd(k)); kaydet();
      wpGonder(k, mesaj(k, r), 'Öğrenci hesabı');
      bildir(r.yeniden ? 'Yeni geçici şifre WhatsApp’tan gönderildi' : 'Hesap açıldı; giriş bilgileri WhatsApp’tan gönderildi' + (B.bulutta() ? '' : ' (demo: gerçek hesap açılmaz)'));
      yenile();
    }).catch(x => { b.disabled = false; bildir(B.hataMetni(x), 'uyari'); });
    return true;
  }
  if (ev.target.closest('[data-hesap-kapat]')) {
    pencere({ baslik: 'Öğrenci hesabı kapatılsın mı?', icerik: `<p>${e(tamAd(k))} artık uygulamaya giremez. Öğrenci kurstan ayrıldıysa ya da telefonu başkasının eline geçtiyse kapatın; gerekirse yeniden açabilirsiniz.</p>`,
      altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Hesabı kapat</button>',
      onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => kapat(k).then(() => { islem('Öğrenci hesabını kapattı', tamAd(k)); kaydet(); kapatPencere(); bildir('Hesap kapatıldı'); yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari'))); } });
    return true;
  }
  return false;
}
// Hesabı olmayan öğrencilere toplu hesap: hesaplar sırayla açılır, mesajlar sıralı gönderim ekranından gider
export function topluHesap(yenile) {
  const l = sb(S.kursiyerler).filter(k => !k.kapali && k.asama !== 'Ehliyet' && !k.hesap), gecersiz = l.filter(k => !B.telNorm(k.tel)), uygun = l.filter(k => B.telNorm(k.tel));
  if (!l.length) return bildir('Aktif öğrencilerin hepsinin hesabı açık');
  pencere({
    baslik: 'Öğrenci hesapları', genis: true,
    icerik: `<p style="font-size:14px;margin-bottom:10px"><b>${uygun.length}</b> aktif öğrencinin hesabı yok. Hesaplar açılır, her öğrenciye giriş bilgileri WhatsApp’tan sırayla gönderilir; öğrenci ilk girişte kendi şifresini belirler.</p>
      ${gecersiz.length ? `<p class="ipucu uyari" style="margin-bottom:10px">${ik('uyari')}<span>${gecersiz.length} öğrencinin cep telefonu geçersiz, atlanacak: ${e(gecersiz.slice(0, 5).map(tamAd).join(', '))}${gecersiz.length > 5 ? '…' : ''}</span></p>` : ''}
      <ul class="liste" style="max-height:260px;overflow:auto">${uygun.map(k => `<li><label style="display:flex;gap:8px;align-items:center;width:100%"><input type="checkbox" checked data-ogr="${k.id}"><span style="flex:1">${e(tamAd(k))}</span><small style="color:var(--soluk)">${e(B.telGoster(B.telNorm(k.tel)))} · ${e(k.asama)}</small></label></li>`).join('')}</ul>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Hesapları aç</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', async ev => {
        const sec = uygun.filter(k => d.querySelector(`[data-ogr="${k.id}"]`).checked); if (!sec.length) return bildir('Öğrenci seçin', 'uyari');
        const b = ev.target; b.disabled = true; const giden = [], hata = [];
        for (const [i, k] of sec.entries()) { b.textContent = `Açılıyor ${i + 1}/${sec.length}…`; try { const r = await ac(k); const a = alici(k); giden.push({ ad: a.ad, tel: a.tel, rol: a.rol, tur: 'Öğrenci hesabı', metin: mesaj(k, r) }); } catch (x) { hata.push(tamAd(k) + ': ' + B.hataMetni(x)); } }
        islem('Toplu öğrenci hesabı açtı', giden.length + ' öğrenci'); kaydet(); kapatPencere(); yenile();
        if (hata.length) bildir(hata.length + ' hesap açılamadı: ' + hata[0], 'uyari');
        if (giden.length) waSirali(giden, 'Öğrenci hesapları · giriş bilgileri');
      });
    },
  });
}
