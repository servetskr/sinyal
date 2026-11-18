// UYG-021: öğrenci kurs koduyla kendi hesabını açar (e-posta + şifre); istek ofise düşer. Ofis (müdür, ön büro) burada isteği
// kurstaki öğrenci kaydıyla eşleştirip onaylar ya da siler. Onaylanınca öğrenci aynı e-posta ve şifreyle kendi verisiyle girer.
// Kurs kodu (kursKodlari/{KOD}) QR afişte ve kayıt linkinde durur; kodu kurs müdürü bir kez oluşturur.
import { S, kaydet, tamAd, islem, sb, oturum } from './veri.js?v=234';
import { e, pencere, pencereSor, bildir, tarih } from './ui.js?v=234';
import * as B from './bulut.js?v=234';

export let bekleyenSayi = 0;
export async function talepSay() { try { bekleyenSayi = (await B.hesapTalepleri()).length; } catch (x) { } return bekleyenSayi; }

// istekle kayıt ne kadar benziyor: telefon ve e-posta güçlü, ad ve soyad zayıf işaret
const kucuk = x => String(x || '').toLocaleLowerCase('tr').trim();
const puan = (t, k) => (B.telNorm(t.tel) && B.telNorm(t.tel) === B.telNorm(k.tel) ? 10 : 0) + (k.eposta && kucuk(k.eposta) === kucuk(t.eposta) ? 10 : 0)
  + (kucuk(k.ad) === kucuk(t.ad) ? 3 : 0) + (kucuk(k.soyad) === kucuk(t.soyad) ? 3 : 0);
const gun = z => z ? tarih(z.toISOString().slice(0, 10)) : '';

function satir(t, kayitlar) {
  const sirali = kayitlar.map(k => [puan(t, k), k]).sort((a, b) => b[0] - a[0] || tamAd(a[1]).localeCompare(tamAd(b[1]), 'tr'));
  const en = sirali[0] && sirali[0][0] >= 10 ? sirali[0][1] : null;
  const sec = sirali.map(([p, k]) => `<option value="${e(k.id)}" ${en === k ? 'selected' : ''}>${e(tamAd(k))} · ${e(B.telGoster(B.telNorm(k.tel)) || k.tel || '')}${k.hesap ? ' · hesabı var' : ''}${p >= 10 ? ' · eşleşiyor' : ''}</option>`).join('');
  return `<li class="ht-satir" data-ht="${e(t.uid)}" style="display:grid;gap:8px">
    <div><b>${e(t.ad)} ${e(t.soyad)}</b><small style="display:block;color:var(--soluk)">${e(B.telGoster(t.tel))} · ${e(t.eposta)}${t.zaman ? ' · ' + e(gun(t.zaman)) : ''}</small></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label style="flex:1;min-width:200px"><span class="gizli-et">Öğrenci kaydı</span><select data-ht-kayit style="width:100%"><option value="">Öğrenci kaydını seçin</option>${sec}</select></label>
      <button type="button" class="dg dg-ana dg-kucuk" data-ht-onay>Onayla ve bağla</button><button type="button" class="dg dg-hafif dg-kucuk" data-ht-sil>Sil</button></div></li>`;
}

export async function talepPenceresi(yenile) {
  const yetkili = oturum.kullanici && ['mudur', 'sekreter', 'subemudur'].includes(oturum.kullanici.rol);
  if (!B.bulutta() || !yetkili) return bildir('Uygulama isteklerini kurs müdürü ve ön büro görür', 'uyari');
  let l = [], kod = S.kurs.ogrKod || '';
  try { l = await B.hesapTalepleri(); } catch (x) { return bildir(B.hataMetni(x), 'uyari'); }
  bekleyenSayi = l.length;
  const ciz = d => {
    const kayitlar = sb(S.kursiyerler).filter(k => !k.kapali);
    d.querySelector('.pencere-govde').innerHTML = `<p style="font-size:14px;margin-bottom:10px">Öğrenci kurs koduyla kendi hesabını açar (e-posta ve şifre). İsteği burada kendi kaydıyla eşleştirip onaylayın; öğrenci aynı e-posta ve şifreyle girer. Tanımadığınız isteği silin.</p>
      <p class="ipucu" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span style="flex:1;min-width:180px">${kod ? `Kurs kodu: <b class="mono" style="font-size:16px;letter-spacing:.08em">${e(kod)}</b><small style="display:block;color:var(--soluk)">${e(B.ogrenciKayitLinki(kod).replace(/^https?:\/\//, ''))}</small>` : 'Kurs kodu henüz yok.'}</span>${kod ? '<button type="button" class="dg dg-cizgi dg-kucuk" data-ht-kopyala>Linki kopyala</button><button type="button" class="dg dg-cizgi dg-kucuk" data-ht-afis>QR afişi yazdır</button>' : '<button type="button" class="dg dg-ana dg-kucuk" data-ht-kod>Kurs kodu oluştur</button>'}</p>
      ${l.length ? `<ul class="liste" style="max-height:380px;overflow:auto">${l.map(t => satir(t, kayitlar)).join('')}</ul>` : '<p style="color:var(--soluk);font-size:14px">Bekleyen istek yok.</p>'}`;
  };
  pencere({
    baslik: 'Uygulama istekleri', genis: true, icerik: '', altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>',
    onAc(d) {
      ciz(d);
      d.addEventListener('click', ev => {
        if (ev.target.closest('[data-ht-kod]')) { const b = ev.target.closest('[data-ht-kod]'); b.disabled = true; return B.kursKoduAl().then(k => { kod = k; ciz(d); bildir('Kurs kodu hazır: ' + k); }).catch(x => { b.disabled = false; bildir(B.hataMetni(x), 'uyari'); }); }
        if (ev.target.closest('[data-ht-kopyala]')) { const link = B.ogrenciKayitLinki(kod); try { navigator.clipboard.writeText(link); bildir('Link kopyalandı'); } catch (x) { bildir(link); } return; }
        if (ev.target.closest('[data-ht-afis]')) { islem('Öğrenci uygulaması QR afişini yazdırdı'); return import('./hesap.js?v=234').then(H => H.qrAfis()).catch(x => bildir(x.message || 'Afiş hazırlanamadı', 'uyari')); }
        const li = ev.target.closest('[data-ht]'); if (!li) return;
        const t = l.find(x => x.uid === li.dataset.ht); if (!t) return;
        if (ev.target.closest('[data-ht-sil]')) {
          return B.hesapTalebiSil(t.uid).then(() => { islem('Öğrenci hesap isteğini sildi', t.ad + ' ' + t.soyad); kaydet(); l = l.filter(x => x !== t); bekleyenSayi = l.length; ciz(d); bildir('İstek silindi'); yenile && yenile(); }).catch(x => bildir(B.hataMetni(x), 'uyari'));
        }
        const ob = ev.target.closest('[data-ht-onay]'); if (!ob) return;
        const kid = li.querySelector('[data-ht-kayit]').value, k = S.kursiyerler.find(x => String(x.id) === kid);
        if (!k) return bildir('Önce öğrencinin kaydını seçin; kaydı yoksa önce öğrenciyi kaydedin', 'uyari');
        const onayla = () => { ob.disabled = true; ob.textContent = 'Bağlanıyor…';
          B.hesapTalebiOnayla(t, k).then(() => { islem('Öğrenci hesap isteğini onayladı', tamAd(k) + ' · ' + t.eposta); kaydet(); l = l.filter(x => x !== t); bekleyenSayi = l.length; ciz(d); bildir(tamAd(k) + ' bağlandı; öğrenci e-postasıyla girebilir'); yenile && yenile(); })
            .catch(x => { ob.disabled = false; ob.textContent = 'Onayla ve bağla'; bildir(B.hataMetni(x), 'uyari'); }); };
        if (k.hesap && k.hesap.uid) return pencereSor(d, { baslik: 'Öğrencinin hesabı var', metin: `${e(tamAd(k))} öğrencisinin açık bir hesabı var. Onaylarsanız eski hesap kapanır, öğrenci bundan sonra ${e(t.eposta)} ile girer.`,
          secenekler: [['vazgec', 'Vazgeç'], ['evet', 'Eski hesabı kapat ve bağla', 'dg-ana']] }, v => { if (v === 'evet') onayla(); });
        onayla();
      });
    },
  });
}
