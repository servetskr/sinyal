// Gösterge paneli ikaz lambaları (öğrenci ekranı › Araç tekniği): lambaya dokun → adı, rengi, ne yapılır; ardından kısa test.
// Renk anlamı ve “motorun derhal durdurulması gereken arızalar” MEB araç tekniği dersi öğretim programına göre (2020, D bölümü);
// semboller ISO 2575’teki yaygın biçimlerin sadeleştirilmiş çizimidir. Aracın kendi kullanım kılavuzu her zaman önceliklidir.
import { e, pencere } from './ui.js?v=106';

const RENK = { k: ['#e0362c', 'Kırmızı', 'Tehlike: güvenli bir yerde hemen dur'], s: ['#f2a20c', 'Sarı / turuncu', 'Arıza ya da uyarı: en kısa sürede kontrol ettir'], y: ['#2fae5a', 'Yeşil', 'Bilgi: sistem açık'], m: ['#2f6fde', 'Mavi', 'Bilgi: uzun far açık'] };
const c = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
export const LAMBALAR = [
  { id: 'yag', r: 'k', ad: 'Motor yağ basıncı', svg: `<path d="M4 15h11l5-5-3 .5-2 1.5H9l-2-2H4z" ${c}/><path d="M7 10V8h4M9 8V6.5" ${c}/><path d="M20.5 13.5c0 .8-.5 1.3-1 1.3s-1-.5-1-1.3.6-1.3 1-2c.4.7 1 1.2 1 2z" fill="currentColor"/>`,
    anlam: 'Motorda yağ basıncı düştü: yağ çok azalmış ya da yağ pompası çalışmıyor.', yap: 'Hemen güvenli bir yerde dur ve motoru durdur. Motor soğuyunca yağ seviyesini kontrol et. Yağ basıncı olmadan motor kısa sürede ağır hasar görür; lamba sönmeden yola devam etme.' },
  { id: 'hararet', r: 'k', ad: 'Motor hararet (soğutma suyu sıcaklığı)', svg: `<path d="M12 4v9" ${c}/><circle cx="12" cy="15" r="2" ${c}/><path d="M12 6h2.5M12 8.5h2.5M12 11h2.5" ${c}/><path d="M4 19c1.3-1 2.7 1 4 0s2.7 1 4 0 2.7 1 4 0 2.7 1 4 0" ${c}/>`,
    anlam: 'Motor aşırı ısındı: soğutma suyu azalmış, fan ya da termostat arızalı olabilir.', yap: 'Güvenli bir yerde dur, motoru durdur. Motor sıcakken radyatör ya da genleşme kabı kapağını açma; basınçlı sıcak su yakar. Soğuyunca suyu kontrol ettir.' },
  { id: 'sarj', r: 'k', ad: 'Akü şarj', svg: `<rect x="4" y="8" width="16" height="10" rx="1" ${c}/><path d="M7 8V6.5h2.5V8M14.5 8V6.5H17V8M7.5 13h3M15 11.5v3M13.5 13h3" ${c}/>`,
    anlam: 'Akü şarj olmuyor: alternatör ya da alternatör kayışı arızalı olabilir.', yap: 'Radyo, klima gibi gereksiz elektrikli alıcıları kapat ve en yakın servise git. Uzun süre devam edersen akü boşalır ve motor durur.' },
  { id: 'fren', r: 'k', ad: 'Fren sistemi / el freni', svg: `<circle cx="12" cy="12" r="5.5" ${c}/><path d="M12 9v3.5" ${c}/><circle cx="12" cy="14.8" r=".9" fill="currentColor"/><path d="M5 7.5a7 7 0 0 0 0 9M19 7.5a7 7 0 0 1 0 9" ${c}/>`,
    anlam: 'El freni çekili ya da fren hidroliği eksik.', yap: 'Önce el frenini kontrol et. El freni inik olduğu hâlde yanıyorsa frenler zayıflayabilir: güvenli yerde dur ve fren hidroliğini kontrol ettirmeden sürme.' },
  { id: 'kemer', r: 'k', ad: 'Emniyet kemeri', svg: `<circle cx="11" cy="5" r="1.9" ${c}/><path d="M9.5 8.5h3l1 6h2.5l1.5 5M9.5 8.5l-1 7h5" ${c}/><path d="M8 8.5l7.5 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
    anlam: 'Sürücünün ya da bir yolcunun emniyet kemeri takılı değil.', yap: 'Kemeri tak, yolculara da taktır. Direksiyon sınavında kemeri takmamak sınavı bitirir.' },
  { id: 'airbag', r: 'k', ad: 'Hava yastığı', svg: `<circle cx="8" cy="5.5" r="1.8" ${c}/><path d="M7 9l-1 6h4.5l1.5 4M7 9h2.5l1 4.5" ${c}/><circle cx="16" cy="11" r="3.5" ${c}/>`,
    anlam: 'Hava yastığı sisteminde arıza var; kazada hava yastığı açılmayabilir.', yap: 'Servise götürüp kontrol ettir. Bu sırada kemerin her zaman takılı olsun.' },
  { id: 'motor', r: 's', ad: 'Motor arıza', svg: `<path d="M5 10h2V8h7l1.5 2H18v2h1.5v-1.5H21v6h-1.5V15H18v2h-6l-2-2H7v-1.5H5z" ${c}/><path d="M9.5 8V6.5h3" ${c}/>`,
    anlam: 'Motor yönetimi ya da egzoz emisyonuyla ilgili bir arıza algılandı.', yap: 'En kısa sürede servise götür. Lamba yanıp sönüyorsa arıza ciddidir: hızını düşür, motoru zorlamadan servise ulaş.' },
  { id: 'abs', r: 's', ad: 'ABS', svg: `<circle cx="12" cy="12" r="6" ${c}/><text x="12" y="13.8" text-anchor="middle" font-size="4.6" font-weight="700" fill="currentColor" font-family="system-ui,sans-serif">ABS</text><path d="M4.5 7.5a8.5 8.5 0 0 0 0 9M19.5 7.5a8.5 8.5 0 0 1 0 9" ${c}/>`,
    anlam: 'ABS (kilitlenme önleyici fren) arızalı. Normal fren çalışır ama ani frende tekerlekler kilitlenebilir.', yap: 'Takip mesafesini artır, ani frenden kaçın ve servise götür.' },
  { id: 'esp', r: 's', ad: 'ESP (denge kontrolü)', svg: `<path d="M6 12l1.5-3.5h9L18 12v3H6z" ${c}/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/><path d="M7 18.5c1 1 1.5-1 2.5 0M14 18.5c1 1 1.5-1 2.5 0" ${c}/>`,
    anlam: 'Yanıp sönüyorsa ESP o an devrede: araç kaymaya başladı. Sürekli yanıyorsa sistem kapalı ya da arızalı.', yap: 'Yanıp sönerken hızını azalt, sert direksiyon hareketinden kaçın. Sürekli yanıyorsa servise götür.' },
  { id: 'lastik', r: 's', ad: 'Lastik basıncı', svg: `<path d="M6.5 7.5c-1.5 2-1.5 7 0 9l1 1.5h9l1-1.5c1.5-2 1.5-7 0-9" ${c}/><path d="M6 19.5h12" ${c}/><path d="M12 9v4.5" ${c}/><circle cx="12" cy="16" r=".9" fill="currentColor"/>`,
    anlam: 'Bir ya da daha çok lastiğin basıncı düşük.', yap: 'Güvenli bir yerde durup lastikleri kontrol et; patlak yoksa ilk fırsatta hava bas. Düşük basınç yol tutuşunu bozar, yakıt tüketimini artırır.' },
  { id: 'yakit', r: 's', ad: 'Yakıt azaldı', svg: `<path d="M5 19V6h8v13M4 19h10M7 9h4" ${c}/><path d="M13 10h2l1.5 1.5V16a1 1 0 0 0 2 0v-6l-2-2" ${c}/>`,
    anlam: 'Yakıt yedek seviyeye indi.', yap: 'İlk istasyonda yakıt al. Yakıtı tamamen bitirmek yakıt pompasına zarar verebilir.' },
  { id: 'kizdirma', r: 's', ad: 'Kızdırma (dizel)', svg: `<path d="M3 12h2M19 12h2" ${c}/><ellipse cx="7.5" cy="12" rx="2.3" ry="3.5" ${c}/><ellipse cx="12" cy="12" rx="2.3" ry="3.5" ${c}/><ellipse cx="16.5" cy="12" rx="2.3" ry="3.5" ${c}/>`,
    anlam: 'Dizel motorda kızdırma bujileri ısınıyor.', yap: 'Kontağı açınca yanar; sönmesini bekleyip marşa bas. Seyir hâlinde yanar ya da yanıp sönerse servise götür.' },
  { id: 'arkasis', r: 's', ad: 'Arka sis lambası', svg: `<path d="M12 6.5c-3.5 0-5 2.5-5 5.5s1.5 5.5 5 5.5z" ${c}/><path d="M14 8.5h5.5M14 12h5.5M14 15.5h5.5" ${c}/><path d="M17 5.5c-1 1.5 1 3 0 4.5s1 3 0 4.5 1 3 0 4.5" ${c} stroke-width="1.2"/>`,
    anlam: 'Arka sis lambası açık.', yap: 'Yalnız sis, yoğun yağış ya da kar gibi görüşün çok azaldığı durumlarda kullan; açık havada arkadaki sürücünün gözünü alır, kapat.' },
  { id: 'sinyal', r: 'y', ad: 'Sinyal / dörtlü flaşör', svg: `<path d="M3.5 12 8 7.5V10h3v4H8v2.5z" fill="currentColor"/><path d="M20.5 12 16 7.5V10h-3v4h3v2.5z" fill="currentColor"/>`,
    anlam: 'Sinyal ya da dörtlü flaşör açık.', yap: 'Dönüş ya da şerit değiştirme bitince sinyalin kapandığından emin ol. Normalden hızlı yanıp sönüyorsa bir sinyal ampulü yanmış olabilir.' },
  { id: 'kisa', r: 'y', ad: 'Kısa far', svg: `<path d="M12 6.5c3.5 0 5 2.5 5 5.5s-1.5 5.5-5 5.5z" ${c}/><path d="M10 8.5l-5 1.5M10 12l-5 1.5M10 15.5l-5 1.5" ${c}/>`,
    anlam: 'Kısa (yakını aydınlatma) farlar açık.', yap: 'Gece, tünelde ve görüş azaldığında kısa farla sür; karşıdan araç gelirken uzun fardan kısa fara geç.' },
  { id: 'uzun', r: 'm', ad: 'Uzun far', svg: `<path d="M12 6.5c3.5 0 5 2.5 5 5.5s-1.5 5.5-5 5.5z" ${c}/><path d="M10 8.5H4.5M10 12H4.5M10 15.5H4.5" ${c}/>`,
    anlam: 'Uzun (uzağı aydınlatma) farlar açık.', yap: 'Karşıdan araç gelirken ve öndeki aracı yakından izlerken kısa fara geç; uzun far diğer sürücünün gözünü alır.' },
  { id: 'onsis', r: 'y', ad: 'Ön sis farı', svg: `<path d="M12 6.5c3.5 0 5 2.5 5 5.5s-1.5 5.5-5 5.5z" ${c}/><path d="M10 8.5l-6 1.5M10 12l-6 1.5M10 15.5l-6 1.5" ${c}/><path d="M7 5.5c-1 1.5 1 3 0 4.5s1 3 0 4.5 1 3 0 4.5" ${c} stroke-width="1.2"/>`,
    anlam: 'Ön sis farları açık.', yap: 'Sis, yoğun yağış ya da karda kullan; görüş düzelince kapat.' },
];
const lamba = (x, buyuk) => `<span class="ikaz-lamba" style="color:${RENK[x.r][0]};${buyuk ? 'width:84px;height:84px' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${x.svg}</svg></span>`;
export const lambaSvg = lamba;
const karistir = l => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function ikazAc() {
  const durum = { mod: 'panel', sec: null, test: null };
  const panel = () => `<p style="font-size:14px;margin-bottom:10px">Lambaya dokun: adını, rengin ne anlama geldiğini ve ne yapman gerektiğini gör.</p>
    <div class="ikaz-renk">${Object.values(RENK).map(([r, ad, an]) => `<span><i style="background:${r}"></i><b>${ad}</b> ${e(an)}</span>`).join('')}</div>
    <div class="ikaz-panel">${LAMBALAR.map(x => `<button type="button" data-lamba="${x.id}" class="${durum.sec === x.id ? 'secili' : ''}" aria-label="${e(x.ad)}">${lamba(x)}</button>`).join('')}</div>
    ${durum.sec ? (() => { const x = LAMBALAR.find(y => y.id === durum.sec); return `<div class="ikaz-bilgi">${lamba(x, true)}<div><small style="color:${RENK[x.r][0]};font-weight:700">${RENK[x.r][1]}</small><b>${e(x.ad)}</b><p>${e(x.anlam)}</p><p><b>Ne yapmalı:</b> ${e(x.yap)}</p></div></div>`; })() : ''}
    <p class="og-kaynak">Kaynak: MEB Araç Tekniği Dersi Öğretim Programı (2020), D. Sık yaşanan araç arızaları. Semboller araçtan araca biraz farklı olabilir; aracının kullanım kılavuzuna da bak.</p>`;
  const testHtml = () => {
    const t = durum.test;
    if (t.i >= t.l.length) return `<div style="text-align:center"><b style="display:block;font-family:var(--baslik);font-size:40px;color:${t.d >= t.l.length - 1 ? 'var(--yesil)' : 'var(--kirmizi)'}">${t.d}/${t.l.length}</b><p>${t.d >= t.l.length - 1 ? 'Lambaları tanıyorsun.' : 'Paneli bir kez daha incele, sonra tekrar dene.'}</p></div>`;
    const x = t.l[t.i], sik = t.sik[t.i];
    return `<p style="font-size:13px;color:var(--soluk)">${t.i + 1}/${t.l.length} · Bu lamba ne anlama gelir?</p><div style="display:grid;place-items:center;margin:10px 0">${lamba(x, true)}</div>
      ${sik.map(y => `<button class="secenek ${t.cevap ? (y.id === x.id ? 'dogru' : y.id === t.cevap ? 'yanlis' : '') : ''}" data-ikaz-cevap="${y.id}" ${t.cevap ? 'disabled' : ''}>${e(y.ad)}</button>`).join('')}
      ${t.cevap ? `<p class="soru-aciklama"><b>${t.cevap === x.id ? 'Doğru.' : 'Bu lamba: ' + e(x.ad) + '.'}</b> ${e(x.yap)}</p><button class="dg dg-koyu" style="width:100%;margin-top:6px" data-ikaz-sonraki>Sonraki</button>` : ''}`;
  };
  pencere({
    baslik: 'Gösterge paneli: ikaz lambaları', genis: true,
    icerik: `<div data-ikaz-govde></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-ikaz-mod>Kendini test et</button>`,
    onAc(p) {
      const g = p.querySelector('[data-ikaz-govde]'), mb = p.querySelector('[data-ikaz-mod]');
      const ciz = () => { g.innerHTML = durum.mod === 'panel' ? panel() : testHtml(); mb.textContent = durum.mod === 'panel' ? 'Kendini test et' : 'Panele dön'; };
      mb.addEventListener('click', () => {
        if (durum.mod === 'panel') { const l = karistir(LAMBALAR).slice(0, 8); durum.test = { l, i: 0, d: 0, cevap: null, sik: l.map(x => karistir([x, ...karistir(LAMBALAR.filter(y => y.id !== x.id)).slice(0, 2)])) }; durum.mod = 'test'; }
        else durum.mod = 'panel';
        ciz();
      });
      g.addEventListener('click', ev => {
        const l = ev.target.closest('[data-lamba]'); if (l) { durum.sec = l.dataset.lamba; ciz(); return; }
        const cv = ev.target.closest('[data-ikaz-cevap]'); if (cv && !durum.test.cevap) { durum.test.cevap = cv.dataset.ikazCevap; if (durum.test.cevap === durum.test.l[durum.test.i].id) durum.test.d++; ciz(); return; }
        if (ev.target.closest('[data-ikaz-sonraki]')) { durum.test.i++; durum.test.cevap = null; ciz(); }
      });
      ciz();
    },
  });
}
