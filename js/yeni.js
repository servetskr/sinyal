// "+ Yeni": kursa eklenebilecek her şey tek pencereden (öğrenci, aday, ödeme, ders, sınav, mesaj, öğretmen, araç, şube, gelir/gider)
import { S, oturum, gun, fark, tamAd, gecikenler, sb, kapaliGun } from './veri.js?v=56';
import { e, ik, tl, pencere, kapatPencere, bildir, tarihUzun } from './ui.js?v=56';
import { kursiyerFormu, tahsilAl, adayEkle, dersPlanlaAc } from './sayfalar1.js?v=56';
import { oturumEkle, aracDuzenle, ustaDuzenle, hareketEkle } from './sayfalar2.js?v=56';

const HERKES = ['mudur', 'sekreter'], MUDUR = ['mudur'];
const SECENEKLER = [
  ['Öğrenci işleri', [
    ['kayit', 'kursiyer', 'Öğrenci kaydı', 'Yeni kayıt, taksit planı, sözleşme', HERKES, () => kursiyerFormu()],
    ['aday', 'aday', 'Aday', 'Bilgi almaya gelen, henüz kaydolmayan', HERKES, () => adayEkle()],
    ['odeme', 'kasa', 'Ödeme al', 'Taksit tahsilatı ve makbuz', HERKES, () => odemeSec()],
    ['ders', 'direksiyon', 'Direksiyon dersi', 'Öğretmen, gün ve saat seçip planla', HERKES, () => dersSec()],
  ]],
  ['Sınav ve mesaj', [
    ['sinav', 'sinav', 'Sınav oturumu', 'e-Sınav ya da direksiyon sınavı', HERKES, () => oturumEkle()],
    ['mesaj', 'wp', 'Mesaj gönder', 'Bir gruba ya da tek tek kişilere', HERKES, () => { location.hash = '#/mesajlar/yeni'; }],
  ]],
  ['Kurum', [
    ['ogretmen', 'kursiyer', 'Öğretmen', 'Direksiyon ya da teorik öğretmen', MUDUR, () => ustaDuzenle()],
    ['arac', 'filo', 'Araç', 'Plaka, sınıf, muayene ve sigorta', MUDUR, () => aracDuzenle()],
    ['sube', 'genel', 'Şube', 'Yeni şube ve MEB kurum kodu', MUDUR, () => subeEkle()],
    ['gider', 'kasa', 'Gelir / gider', 'Yakıt, kira, fatura, diğer gelir', HERKES, () => hareketEkle()],
  ]],
];
const izinli = x => oturum.kullanici && x[4].includes(oturum.kullanici.rol);

export function yeniMenu() {
  if (!oturum.kullanici || oturum.kullanici.rol === 'usta') return;
  const gruplar = SECENEKLER.map(([g, l]) => [g, l.filter(izinli)]).filter(([, l]) => l.length);
  pencere({
    baslik: 'Yeni ekle', genis: true,
    icerik: `<div class="yeni-menu">${gruplar.map(([g, l]) => `<section><h3>${e(g)}</h3><div class="yeni-izgara">${l.map(([id, i, b, a]) => `<button type="button" class="yeni-kart" data-yeni-sec="${id}"><span class="yeni-ik">${ik(i)}</span><span><b>${e(b)}</b><small>${e(a)}</small></span></button>`).join('')}</div></section>`).join('')}</div>
      <p class="yeni-ipucu">Kısayol: klavyede <kbd>N</kbd></p>`,
    onAc(d) {
      d.querySelectorAll('[data-yeni-sec]').forEach(b => b.addEventListener('click', () => {
        const x = SECENEKLER.flatMap(g => g[1]).find(z => z[0] === b.dataset.yeniSec);
        kapatPencere(); x[5]();
      }));
    },
  });
}

// Ödeme al: önce öğrenci (gecikenler başta), sonra mevcut tahsilat penceresi
function odemeSec() {
  const l = sb(S.kursiyerler).filter(k => !k.kapali).map(k => ({ k, i: k.odeme.taksitler.findIndex(t => !t.odendi && !t.iptal) })).filter(x => x.i >= 0)
    .sort((a, b) => (gecikenler(b.k).length - gecikenler(a.k).length) || a.k.odeme.taksitler[a.i].vade.localeCompare(b.k.odeme.taksitler[b.i].vade));
  const satir = ({ k, i }) => { const t = k.odeme.taksitler[i], gec = fark(t.vade) < 0; return `<li data-ad="${e(tamAd(k).toLocaleLowerCase('tr'))}"><button type="button" class="yeni-satir" data-odeme="${k.id}|${i}"><span><b>${e(tamAd(k))}</b><small>${i + 1}. taksit · vade ${tarihUzun(t.vade)}</small></span><span class="sag"><b class="sayi" style="color:${gec ? 'var(--kirmizi)' : 'var(--murekkep)'}">${tl(t.tutar - (t.kismi || 0))}</b>${gec ? '<small style="color:var(--kirmizi)">gecikti</small>' : ''}</span></button></li>`; };
  pencere({
    baslik: 'Ödeme al · öğrenci seçin',
    icerik: `<input class="girdi" data-yeni-ara placeholder="Ad ya da soyadla arayın" aria-label="Öğrenci ara" autofocus><ul class="liste yeni-liste">${l.map(satir).join('') || '<li>Ödenmemiş taksiti olan öğrenci yok.</li>'}</ul>`,
    onAc(d) {
      const ara = d.querySelector('[data-yeni-ara]'); ara.focus();
      ara.addEventListener('input', () => { const q = ara.value.trim().toLocaleLowerCase('tr'); d.querySelectorAll('.yeni-liste li[data-ad]').forEach(li => { li.hidden = !!q && !li.dataset.ad.includes(q); }); });
      d.querySelectorAll('[data-odeme]').forEach(b => b.addEventListener('click', () => { const [id, i] = b.dataset.odeme.split('|'); const k = S.kursiyerler.find(x => x.id === id); kapatPencere(); tahsilAl(k, +i); }));
    },
  });
}

// Direksiyon dersi: öğretmen + gün + saat → takvimdeki ders ekleme penceresi (öğrenci seçimi ve bütün kurallar orada)
const SAATLER = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
function dersSec() {
  let g = gun(1); for (let n = 1; n < 8 && kapaliGun(g); n++) g = gun(n + 1);
  const egler = sb(S.egitmenler);
  pencere({
    baslik: 'Direksiyon dersi planla',
    icerik: `<form class="form-izgara" id="f-yeni-ders">
      <div class="alan tam"><label>Öğretmen</label><select name="eg">${egler.map(h => `<option value="${h.id}">${e(h.ad)} · ${h.siniflar.join(', ')}</option>`).join('')}</select></div>
      <div class="alan"><label>Gün</label><input type="date" name="tarih" value="${g}" min="${gun(0)}" max="${gun(13)}"></div>
      <div class="alan"><label>Saat</label><select name="saat"></select></div>
      <p class="tam" data-ders-not style="font-size:13px;color:var(--soluk)"></p></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-devam>Öğrenci seç</button>`,
    onAc(d) {
      const f = d.querySelector('#f-yeni-ders'), not = d.querySelector('[data-ders-not]');
      const doldur = () => {
        const t = f.tarih.value, eg = f.eg.value, iz = (S.izinler || []).find(i => i.kim === eg && t >= i.bas && t <= i.bit), k = kapaliGun(t) || (iz && 'öğretmen izinli (' + iz.tur + ')');
        const dolu = s => S.dersler.some(x => x.egitmen === eg && x.tarih === t && x.saat === s && x.durum !== 'İptal');
        const bos = SAATLER.filter(s => !dolu(s));
        f.saat.innerHTML = bos.map(s => `<option>${s}</option>`).join('');
        not.textContent = k ? `${tarihUzun(t)} ${k.toLocaleLowerCase('tr')}; kurs kapalı.` : bos.length ? `${bos.length} boş saat var.` : 'Bu öğretmenin o gün boş saati yok.';
        d.querySelector('[data-devam]').disabled = !!k || !bos.length;
      };
      f.addEventListener('change', ev => { if (ev.target.name !== 'saat') doldur(); }); doldur();
      d.querySelector('[data-devam]').addEventListener('click', () => { const { eg, tarih, saat } = { eg: f.eg.value, tarih: f.tarih.value, saat: f.saat.value }; if (!saat) return bildir('Saat seçin', 'uyari'); kapatPencere(); dersPlanlaAc(eg, tarih, saat); });
    },
  });
}

// Şube: Ayarlar › Şubeler’e gidip yeni şube satırını açar
function subeEkle() {
  location.hash = '#/ayarlar/subeler';
  setTimeout(() => { const b = document.querySelector('[data-sube-ekle]'); if (b) b.click(); else bildir('Ayarlar › Şubeler’den ekleyebilirsiniz'); }, 350);
}
