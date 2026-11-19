// YON-077: önkoşul haritası — her özelliğin dayandığı bilgiler tek tabloda.
// Kurulum listesindeki ek adımlar (sayfalar5 kurulumAdimlari) ve özelliğin ekranındaki "Önce şunu tamamla →" şeridi buradan üretilir.
// Yeni özellik bir bilgiye dayanıyorsa buraya satır eklenir (kabul ölçütü); düzey: zorunlu (özellik onsuz çalışmaz / yanlış çıkar) · onerilen · istege.
import { S, kimlikEksikleri } from './veri.js?v=235';
import { pencere, kapatPencere } from './ui.js?v=235';

const aktifUsta = () => (S.egitmenler || []).filter(x => !x.ayrildi && !x.pasif);
const aktifArac = () => (S.araclar || []).filter(a => !a.ayrildi && !a.pasif && !a.satildi);
const kimlikVar = re => !kimlikEksikleri().some(x => re.test(x));

export const ONKOSUL = [
  { id: 'kurumKodu', ad: 'Şube MEB kurum kodu', duzey: 'zorunlu', yer: '#/ayarlar/kimlik', ok: () => kimlikVar(/kurum kodu/), ozellik: ['MEBBİS’e yazma', 'MEBBİS ders programı', 'MEB formları'] },
  { id: 'unvanVkn', ad: 'Ticari unvan, VKN ve vergi dairesi', duzey: 'zorunlu', yer: '#/ayarlar/kimlik', ok: () => kimlikVar(/ticari unvan|VKN|vergi dairesi/), ozellik: ['Sözleşme', 'Makbuz', 'e-Arşiv fatura', 'KVKK aydınlatma metni'] },
  { id: 'adres', ad: 'Kurumun açık adresi ve müdürü', duzey: 'zorunlu', yer: '#/ayarlar/kimlik', ok: () => kimlikVar(/açık adres|kurum müdürü/), ozellik: ['Sözleşme', 'MEB formları', 'Makbuz'] },
  { id: 'personelMeb', ad: 'Usta öğreticilerin TC ve çalışma izni no', duzey: 'onerilen', yer: '#/filo', ok: () => aktifUsta().every(x => x.tc && (x.calismaIzinNo || x.izinNo)), ozellik: ['MEBBİS ders programı', 'Direksiyon takip formu'] },
  { id: 'aracIzin', ad: 'Araçların MEB izin no', duzey: 'onerilen', yer: '#/filo', ok: () => aktifArac().every(a => a.mebIzinNo), ozellik: ['MEBBİS ders programı', 'Araç dosyası'] },
  { id: 'donem', ad: 'Dönem ve gruplar', duzey: 'onerilen', yer: '#/ayarlar/donem', ok: () => (S.gruplar || []).length > 0, ozellik: ['MEBBİS’e yazma', 'Teorik program'] },
  { id: 'sozlesme', ad: 'Sözleşme metni gözden geçirildi', duzey: 'onerilen', yer: '#/ayarlar/sozlesme', onayla: true, ok: () => !!S.kurs.sozlesmeTarih, ozellik: ['Sözleşme'] },
  { id: 'kvkk', ad: 'KVKK aydınlatma metni ve VERBİS kaydı', duzey: 'onerilen', yer: '#/ayarlar/kvkk', onayla: true, ok: () => false, ozellik: ['KVKK aydınlatma metni'], not: 'Aydınlatma metni kursun unvanıyla çıkar; VERBİS’e kayıt gerekip gerekmediğini müşavirinize sorun, sonra “Tamam” deyin.' },
  { id: 'makbuz', ad: 'Makbuz numarası ayarı', duzey: 'onerilen', yer: '#/ayarlar/kurs/banka', onayla: true, ok: () => !!S.kurs.makbuz, ozellik: ['Makbuz'], not: 'Eski programdaki son makbuz numarasından devam etmek için başlangıç numarasını girin.' },
  { id: 'eposta', ad: 'Kurs e-postası', duzey: 'onerilen', yer: '#/ayarlar/kimlik', ok: () => !!S.kurs.eposta, ozellik: ['Rapor ve yedek e-postası', 'Makbuz'] },
  { id: 'mudurCep', ad: 'Müdürün cep telefonu', duzey: 'onerilen', yer: '#/ayarlar/kurs/iletisim', ok: () => !!S.kurs.mudurTel, ozellik: ['WhatsApp bildirimleri', 'İmza ve talep yönlendirme'] },
  { id: 'guvenlik', ad: 'Oturum süresi ve iki adımlı giriş', duzey: 'istege', yer: '#/ayarlar/guvenlik', onayla: true, ok: () => !!(S.guvenlik || {}).oturumDk, ozellik: ['Hesap güvenliği'] },
  { id: 'ogrApp', ad: 'Öğrenci uygulaması seçenekleri', duzey: 'istege', yer: '#/ayarlar/ogrenciapp', onayla: true, ok: () => !!S.kurs.ogrOzellik, ozellik: ['Öğrenci uygulaması'] },
  { id: 'simulator', ad: 'Simülatör seri no ve derslikler', duzey: 'istege', yer: '#/meb', ok: () => (S.simulatorler || []).length > 0 || (S.derslikler || []).length > 0, ozellik: ['Simülatör dersi', 'Teorik derslik'] },
];
const onaylandi = x => !!(((S.kurs || {}).kurulum || {})[x.id] || {}).onay;
export const onkosulTamam = x => { try { return !!x.ok() || (x.onayla && onaylandi(x)); } catch (z) { return false; } };
// bir özelliğin eksik önkoşulları (zorunlu önce)
export const onkosulEksik = (...ozellik) => ONKOSUL.filter(x => x.ozellik.some(o => ozellik.includes(o)) && !onkosulTamam(x)).sort((a, b) => (a.duzey !== 'zorunlu') - (b.duzey !== 'zorunlu'));
// özelliğin ekranında: "Önce şunu tamamla →" (yalnız müdür düzeltebilir; ön büroya bilgi olarak)
export function onkosulSeridi(...ozellik) {
  const l = onkosulEksik(...ozellik).filter(x => x.duzey !== 'istege'); if (!l.length) return '';
  const es = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `<p class="ipucu uyari onkosul-serit" style="margin-bottom:12px"><span><b>Önce şunu tamamla:</b> ${l.map(x => `<a href="${x.yer}">${es(x.ad)} →</a>`).join(' · ')}</span></p>`;
}
// özellik → dayandığı bilgiler (Kurulum sayfasındaki harita)
export function onkosulHaritasi() {
  const m = new Map(); ONKOSUL.forEach(x => x.ozellik.forEach(o => { if (!m.has(o)) m.set(o, []); m.get(o).push(x); }));
  return [...m.entries()].map(([ozellik, l]) => ({ ozellik, l: l.map(x => ({ ...x, tamam: onkosulTamam(x) })) }));
}
// zorunlu önkoşul eksikse işi başlatmadan "Önce şunu tamamla" penceresi; true dönerse iş durur
export function onkosulEngel(...ozellik) {
  const l = onkosulEksik(...ozellik).filter(x => x.duzey === 'zorunlu'); if (!l.length) return false;
  const es = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  pencere({ baslik: 'Önce şunu tamamla', icerik: `<p style="font-size:14.5px">${es(ozellik[0])} için şu bilgi gerekiyor:</p><ul class="liste">${l.map(x => `<li><span style="flex:1"><b>${es(x.ad)}</b>${x.not ? `<small style="display:block;color:var(--soluk)">${es(x.not)}</small>` : ''}</span><a class="dg dg-ana dg-kucuk" href="${x.yer}" data-onk-git>Tamamla →</a></li>`).join('')}</ul>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>', onAc(p) { p.querySelectorAll('[data-onk-git]').forEach(a => a.addEventListener('click', () => kapatPencere())); } });
  return true;
}
