// KAY-086: mükerrer kayıt birleştirme ekranları. Kurallar ve hesap js/birlestir.js'te (DOM'suz, Node testi: sinyal-kaynak/arac/birlestir-test).
// Öğrenci listesinde "olası mükerrer" şeridi → çiftler penceresi → önizleme (iki kayıt yan yana, alan seçimi, taşınacaklar, para
// mutabakatı) → hassas işlem onayı → birleştir. Birleştirme 30 gün içinde öğrenci dosyasından ya da çiftler penceresinden geri alınır.
// Yetki: kurs müdürü, şube müdürü ve ön büro (18 Kas kararı). Her birleştirme ve geri alma işlem kaydına yazılır.
import { S, kaydet, islem, oturum, gun, tamAd, SINIFLAR } from './veri.js?v=234';
import { e, tl, ik, isaret, pencere, kapatPencere, bildir, pinSor, onaySor, tarih } from './ui.js?v=234';
import * as BR from './birlestir.js?v=234';

export const yetkili = () => { const u = oturum.kullanici; return !!u && (u.rol === 'mudur' || u.rol === 'sekreter' || u.gorev === 'subemudur'); };
const KOL_AD = { dersler: 'direksiyon dersi', hareket: 'kasa hareketi (tahsilat)', sinavlar: 'sınav kaydı', imzaTalepleri: 'imza isteği', gonderimler: 'mesaj', teorik: 'teorik yoklama',
  gorusmeler: 'görüşme notu', faturalar: 'fatura', bekleme: 'bekleme listesi kaydı', dersIptaller: 'iptal edilen ders izi', evrakDefteri: 'evrak defteri satırı', psikoteknik: 'psikoteknik kaydı', transferler: 'nakil kaydı' };
const ozetMetin = say => Object.entries(say).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${KOL_AD[k] || 'diğer kayıt (' + k + ')'}`).join(', ');
const no = k => k.no ? 'No ' + k.no : 'numarasız';
const tcGizle = t => t ? String(t).slice(0, 3) + '•••••' + String(t).slice(-3) : 'T.C. yok';

// öğrenci listesi şeridi: olası mükerrer çift sayısı ve geri alınabilir birleştirmeler
export function mukerrerSeridi() {
  if (!yetkili()) return '';
  try { BR.izTemizle(S); } catch (x) { }
  const n = BR.mukerrerCiftler(S.kursiyerler).length, g = (S.birlestirmeler || []).filter(x => BR.izGecerli(x)).length;
  if (!n && !g) return '';
  return `<p class="ekran-notu mk-serit">${isaret(n ? 'uyari' : 'bilgi', 20)}<span>${n ? `<b>${n} olası mükerrer kayıt</b> var: aynı kişi iki kez kaydedilmiş olabilir.` : ''}${g ? ` ${g} birleştirme 30 gün içinde geri alınabilir.` : ''}</span><button type="button" class="dg dg-cizgi dg-kucuk" data-mukerrer>İncele</button></p>`;
}

export function mukerrerPenceresi(yenile) {
  const l = BR.mukerrerCiftler(S.kursiyerler), iz = (S.birlestirmeler || []).filter(x => BR.izGecerli(x));
  const satir = (c, i) => `<li class="mk-cift"><div><b>${e(tamAd(c.a))} <small>${no(c.a)}</small></b><b>${e(tamAd(c.b))} <small>${no(c.b)}</small></b><span>${c.tur === 'kesin' ? '<em class="mk-et kesin">Kesin</em>' : '<em class="mk-et">Olası</em>'} ${e(c.neden)} · ${e((SINIFLAR[c.a.sinif] || {}).ad || c.a.sinif)}${c.a.sinif !== c.b.sinif ? ' / ' + e((SINIFLAR[c.b.sinif] || {}).ad || c.b.sinif) : ''}</span></div><button type="button" class="dg dg-cizgi dg-kucuk" data-mk-ac="${i}">Karşılaştır</button></li>`;
  const izSatir = x => `<li class="mk-cift"><div><b>${e(x.anaAd)} ← ${e(x.onceB ? tamAd(x.onceB) : '')} <small>${x.eskiNo ? 'No ' + e(x.eskiNo) : ''}</small></b><span>${e(tarih(x.zaman.slice(0, 10)))} · ${e(x.kim || '')} · ${BR.izKalanGun(x)} gün içinde geri alınabilir</span></div><button type="button" class="dg dg-cizgi dg-kucuk" data-mk-geri="${e(x.id)}">Geri al</button></li>`;
  pencere({ baslik: 'Mükerrer kayıtlar', genis: true,
    icerik: `<p class="mk-not">Aynı T.C. ile iki açık kayıt <b>kesin</b>; T.C. eksik ya da hatalıyken ad, soyad, doğum tarihi ve telefon (ya da baba adı) aynıysa <b>olası</b> mükerrer sayılır. Yalnız adı aynı, T.C.’leri farklı kişiler listelenmez.</p>
      ${l.length ? `<ul class="mk-liste">${l.map(satir).join('')}</ul>` : `<p class="mk-bos">Olası mükerrer kayıt yok.</p>`}
      ${iz.length ? `<h3 class="mk-bas">Son birleştirmeler <small>30 gün</small></h3><ul class="mk-liste">${iz.map(izSatir).join('')}</ul>` : ''}`,
    altlik: '<button class="dg dg-koyu" data-kapat>Kapat</button>',
    onAc(d) { d.addEventListener('click', ev => {
      const a = ev.target.closest('[data-mk-ac]'); if (a) { const c = l[+a.dataset.mkAc]; const [ana, ob] = BR.anaKayit(c.a, c.b, S); kapatPencere(); return onizle(ana.id, ob.id, yenile); }
      const g = ev.target.closest('[data-mk-geri]'); if (g) { kapatPencere(); return geriAlAkis(g.dataset.mkGeri, yenile); }
    }); } });
}

// iki kayıt yan yana; farklı kimlik alanında hangisinin kalacağı seçilir
export function onizle(anaId, otekiId, yenile) {
  const A = S.kursiyerler.find(x => x.id === anaId), B = S.kursiyerler.find(x => x.id === otekiId);
  if (!A || !B) return bildir('Kayıt bulunamadı', 'uyari');
  const engel = BR.birlestirmeEngeli(A, B), bag = BR.bagOzeti(S, B.id), para = BR.odemeBirlestir(A.odeme, B.odeme, gun(0)).rapor;
  const dersSay = k => (S.dersler || []).filter(d => d.kursiyer === k.id).length;
  const dolu = (k, al) => !!String(k[al] || '').trim();
  // iki kayıtta da dolu ve farklıysa seçim sorulur; biri boşsa dolu olan kendiliğinden kalır
  const fark = BR.ALANLAR.filter(([al]) => dolu(A, al) && dolu(B, al) && String(A[al]).trim() !== String(B[al]).trim());
  const deger = (k, al) => al === 'tc' ? e(k.tc || '—') : al === 'dogumTarihi' && k[al] ? e(tarih(k[al])) : e(k[al] || '—');
  const kimlikSatir = ([al, ad]) => { const f = fark.some(x => x[0] === al), varsayB = false, bdenGelir = !dolu(A, al) && dolu(B, al);
    return `<tr${f ? ' class="mk-farkli"' : ''}><th>${ad}</th><td>${f ? `<label><input type="radio" name="mk-${al}" value="a" ${varsayB ? '' : 'checked'}> ${deger(A, al)}</label>` : deger(A, al)}</td><td>${f ? `<label><input type="radio" name="mk-${al}" value="b" ${varsayB ? 'checked' : ''}> ${deger(B, al)}</label>` : deger(B, al) + (bdenGelir ? ' <small class="mk-gelir">kalan kayda geçer</small>' : '')}</td></tr>`; };
  const satir = (ad, a, b) => `<tr><th>${ad}</th><td>${a}</td><td>${b}</td></tr>`;
  const o = p => p.odeme || {};
  const tasinan = ozetMetin(bag);
  const paraMetin = `Ödenen tutarların hepsi ana kayda geçer: <b>${tl(para.once.a.odenen + para.once.b.odenen)}</b>. Ödenmemiş taksitler de taşınır ama <b>çift sayılmaz</b>: ana kaydın kurs ücreti (${tl(+o(A).toplam || 0)}) esas alınır; birleşik kalan borç <b>${tl(para.sonra.kalan)}</b> olur (önce: ${tl(para.once.a.kalan)} + ${tl(para.once.b.kalan)}).`
    + (para.iptalEdilen.length || para.azaltilan.length ? ` Çift borç olan ${para.iptalEdilen.length + para.azaltilan.length} taksit iptal edilir ya da azaltılır; kayıtta görünür kalır.` : '')
    + (para.ciftEk.length ? ` Ana kayıtta aynısı olan ${para.ciftEk.length} ödenmemiş ek kalem taşınmaz.` : '')
    + (para.fazlaTahsilat ? `<br><b class="mk-kirmizi">Fazla tahsilat ${tl(para.fazlaTahsilat)}:</b> iki kayıtta toplam ödenen kurs ücretini aşıyor. Birleştirmeden sonra iade edin ya da bir ek kaleme bağlayın.` : '')
    + (para.ucretFarki != null ? `<br>Öbür kaydın kurs ücreti farklıydı (${tl(para.ucretFarki)}); ana kaydınki geçerli olur.` : '');
  pencere({ baslik: 'Kayıtları birleştir', genis: true,
    icerik: `${engel ? `<p class="ipucu uyari">${isaret('uyari', 20)}<span><b>Birleştirilemez.</b> ${e(engel)}</span></p>` : ''}
      <table class="mk-tablo"><thead><tr><th></th><th>Kalan kayıt <small>${no(A)}</small><button type="button" class="dg dg-hafif dg-kucuk" data-mk-degis>${ik('sifirla')}Öbürü kalsın</button></th><th>Birleşecek kayıt <small>${no(B)}</small></th></tr></thead><tbody>
        ${BR.ALANLAR.map(kimlikSatir).join('')}
        ${satir('Sınıf', e((SINIFLAR[A.sinif] || {}).ad || A.sinif), e((SINIFLAR[B.sinif] || {}).ad || B.sinif))}
        ${satir('Kayıt tarihi', e(A.kayit ? tarih(A.kayit) : '—'), e(B.kayit ? tarih(B.kayit) : '—'))}
        ${satir('MEBBİS', A.mebIslendi ? 'İşlendi' : 'İşlenmedi', B.mebIslendi ? 'İşlendi' : 'İşlenmedi')}
        ${satir('Kurs ücreti', tl(+o(A).toplam || 0), tl(+o(B).toplam || 0))}
        ${satir('Ödenen', tl(para.once.a.odenen), tl(para.once.b.odenen))}
        ${satir('Kalan borç', tl(para.once.a.kalan), tl(para.once.b.kalan))}
        ${satir('Direksiyon dersi', dersSay(A), dersSay(B))}
      </tbody></table>
      ${fark.length ? `<p class="mk-not">Farklı alanlarda kalacak değeri seçin. Ana kayıtta boş olan alan öbür kayıttan dolar; farklı telefon “Cep telefonu 2” olarak eklenir.</p>` : ''}
      <div class="mk-ozet"><h3>Ne olacak</h3><ul>
        <li>${isaret('bilgi', 16)}<span><b>Taşınacak:</b> ${tasinan || 'bağlı başka kayıt yok'}; ayrıca notlar, evrak işaretleri ve deneme sonuçları.</span></li>
        <li>${isaret('bilgi', 16)}<span><b>Para:</b> ${paraMetin}</span></li>
        <li>${isaret('bilgi', 16)}<span><b>Değişmeyen:</b> makbuz ve fatura numaraları, tahsilat tutar ve tarihleri, kapanmış gün sonu tutarları, MEBBİS’teki kayıtlar (mdSinyal MEBBİS’te birleştirme ya da silme yapmaz).</span></li>
        ${B.hesap || B.hesapAktif ? `<li>${isaret('uyari', 16)}<span><b>Öğrenci uygulaması:</b> birleşecek kaydın hesabı açık. Öğrenci kalan kaydın hesabıyla girer; öbür hesabı Öğrenci hesapları’ndan kapatın.</span></li>` : ''}
        <li>${isaret('bilgi', 16)}<span><b>Geri alma:</b> ${BR.GERI_ALMA_GUN} gün içinde öğrenci dosyasından geri alınabilir. İşlem kaydına yazılır.</span></li>
      </ul></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button>${engel ? '' : '<button class="dg dg-tehlike" data-mk-birlestir>Birleştir</button>'}`,
    onAc(d) { d.addEventListener('click', async ev => {
      if (ev.target.closest('[data-mk-degis]')) { kapatPencere(); return onizle(otekiId, anaId, yenile); }
      if (!ev.target.closest('[data-mk-birlestir]')) return;
      if (!yetkili()) return bildir('Birleştirmeyi kurs müdürü ya da ön büro yapar', 'uyari');
      const secim = Object.fromEntries(fark.map(([al]) => [al, (d.querySelector(`[name="mk-${al}"]:checked`) || {}).value || 'a']));
      if (!(await pinSor('Kayıt birleştirme'))) return;
      let sonuc; const anaAd = tamAd(A), obAd = tamAd(B), obNo = B.no;
      try { sonuc = BR.birlestir(S, A.id, B.id, { secim, kim: (oturum.kullanici || {}).ad || '', zaman: new Date().toISOString(), bugun: gun(0) }); }
      catch (x) { return bildir(x.message, 'uyari'); }
      islem('Kayıtlar birleştirildi', `${anaAd} (${no(A)}) ← ${obAd} (${obNo ? 'No ' + obNo : 'numarasız'}) · ${ozetMetin(sonuc.rapor.ozet) || 'bağ yok'} · kalan borç ${tl(sonuc.rapor.para.sonra.kalan)}${sonuc.rapor.secilen.length ? ' · ' + sonuc.rapor.secilen.join(', ') : ''}`);
      kaydet(); kapatPencere(); bildir('Kayıtlar birleştirildi; 30 gün içinde geri alınabilir');
      location.hash = '#/kursiyer/' + A.id; if (yenile) yenile();
    }); } });
}

// öğrenci dosyasının başında: bu kayda yapılmış, geri alınabilir birleştirme
export function birlestirmeNotu(k) {
  const iz = (S.birlestirmeler || []).find(x => x.ana === k.id && BR.izGecerli(x)); if (!iz) return '';
  return `<p class="ekran-notu mk-serit">${isaret('bilgi', 20)}<span>Bu kayıt ${e(tarih(iz.zaman.slice(0, 10)))} günü ${e(iz.onceB ? tamAd(iz.onceB) : 'başka bir kayıt')} (${iz.eskiNo ? 'No ' + e(iz.eskiNo) : 'numarasız'}) ile birleştirildi. ${BR.izKalanGun(iz)} gün içinde geri alınabilir.</span>${yetkili() ? `<button type="button" class="dg dg-cizgi dg-kucuk" data-mk-geri="${e(iz.id)}">Geri al</button>` : ''}</p>`;
}
export async function geriAlAkis(izId, yenile) {
  const iz = (S.birlestirmeler || []).find(x => x.id === izId); if (!iz) return bildir('Birleştirme izi bulunamadı', 'uyari');
  if (!yetkili()) return bildir('Geri almayı kurs müdürü ya da ön büro yapar', 'uyari');
  const deg = BR.sonradanDegisti(S, iz);
  const ok = await onaySor(`İki kayıt birleştirme öncesindeki hâline döner; taşınan ders, tahsilat ve sınav kayıtları eski kayda geri bağlanır.${deg ? '\n\nDikkat: birleştirmeden sonra bu kayıtta değişiklik yapılmış (ör. yeni tahsilat ya da not). Kayıttaki değişiklikler birleştirme öncesine döner; yeni tahsilat ve dersler bu kayıtta kalır, kontrol edin.' : ''}`, { baslik: 'Birleştirme geri alınsın mı?', evet: 'Geri al', tehlike: true });
  if (!ok || !(await pinSor('Birleştirmeyi geri alma'))) return;
  try { const r = BR.geriAl(S, izId); islem('Birleştirme geri alındı', `${tamAd(r.ana)} → ${tamAd(r.eski)} ayrıldı${deg ? ' · sonradan değişiklik vardı' : ''}`); }
  catch (x) { return bildir(x.message, 'uyari'); }
  kaydet(); bildir('Birleştirme geri alındı; iki kayıt ayrı'); if (yenile) yenile();
}
