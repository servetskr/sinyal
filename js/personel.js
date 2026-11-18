// Personel kartı (PER-017, PER-018, PER-019, PER-020, PER-021): usta öğretici, teorik öğretmen ve büro personeli için tek kart.
// Sekmeler: Genel (görevler çoklu, branşlar, statü, iletişim, maaş) · Evraklar (tür, alınma, bitiş, dosya; bitişe 30 gün kala uyarı, kural P04)
// · Zimmet (araç, anahtar, diğer; veriliş, planlanan teslim, iade) · İzin (izin listesi, yıllık izin hakkı ve kalanı, İş Kanunu md.53).
// Usta öğreticinin sertifika, sağlık raporu ve adli sicil tarihleri (eg.belgeler; M13 kuralı) evrak eklenince güncellenir.
import { S, kaydet, gun, fark, tarihOku, islem, sb, tutarOku, tcGecerli, mebIsGunuMu } from './veri.js?v=234';
import { e, ik, rozet, tarih, isaret, pencere, kapatPencere, bildir, fotoKucult, sekmeler } from './ui.js?v=234';
import { ustaAlacak } from './risk.js?v=234';

export const GOREVLER = ['Kurucu', 'Kurs Müdürü', 'Müdür Yardımcısı', 'Usta Öğretici', 'Uzman Öğretici', 'Psikolog', 'Büro Personeli', 'Muhasebe', 'Pist Sorumlusu', 'Şoför', 'Araç Bakım', 'Temizlik Personeli', 'Güvenlik', 'Diğer'];
export const BRANSLAR = ['Trafik ve Çevre', 'İlk Yardım', 'Araç Tekniği', 'Trafik Adabı', 'Direksiyon Eğitimi'];
export const STATULER = [['1', 'Kadrolu (aylık ücretli)'], ['0', 'Ders ücretli'], ['2', 'Diğer']];
// evrak türü → usta kartındaki tarih alanı (M13 kuralı bunu denetler)
export const EVRAK_TURLERI = [['saglik', 'Sağlık raporu'], ['adli', 'Adli sicil kaydı'], ['sertifika', 'Usta öğretici sertifikası'], ['ek21', 'Hizmet içi eğitim tamamlama belgesi (EK-21)'], ['ogrenim', 'Diploma / öğrenim belgesi'], ['ehliyet', 'Sürücü belgesi'], ['sozlesme', 'İş sözleşmesi'], ['sgk', 'SGK işe giriş bildirgesi'], ['kimlik', 'Nüfus cüzdanı sureti'], ['ikamet', 'Yerleşim yeri belgesi'], ['askerlik', 'Askerlik durum belgesi'], ['ilkyardim', 'İlk yardım sertifikası'], ['diger', 'Diğer']];
const evrakAd = t => (EVRAK_TURLERI.find(x => x[0] === t) || [0, t])[1];
const ZIMMET_TUR = ['Araç', 'Anahtar', 'Bilgisayar / tablet', 'Telefon', 'Diğer'];

// tür: 'usta' | 'ogretmen' | 'personel'
export const personelBul = (tur, id) => (tur === 'usta' ? S.egitmenler : tur === 'ogretmen' ? (S.ogretmenler || []) : (S.personel || [])).find(x => x.id === id) || null;
export const varsayilanGorev = tur => tur === 'usta' ? ['Usta Öğretici'] : tur === 'ogretmen' ? ['Uzman Öğretici'] : [];
export const gorevleri = (x, tur) => Array.isArray(x.gorevler) && x.gorevler.length ? x.gorevler : x.gorev ? String(x.gorev).split(/\s*[,/]\s*/).filter(Boolean) : varsayilanGorev(tur);

// İzin günü: hafta tatili (Pazar) ve resmî tatiller sayılmaz (İş Kanunu md.56); Cumartesi sayılır
const izinGunu = (bas, bit) => { let n = 0; for (let d = tarihOku(bas); d <= tarihOku(bit || bas); d.setDate(d.getDate() + 1)) { const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const g = d.getDay(); if (g === 0) continue; if (g === 6 || mebIsGunuMu(t)) n++; } return n; };
// Yıllık izin hakkı (İş Kanunu md.53): 1–5 yıl 14, 5–15 yıl 20, 15 yıl ve üstü 26 gün; kartta elle yazılan önce gelir
export function yillikIzin(x) {
  const yil = new Date().getFullYear(), bas = String(x.baslama || '').slice(0, 4), kidem = /^\d{4}$/.test(bas) ? yil - +bas : null;
  const hak = +x.yillikIzinGun > 0 ? +x.yillikIzinGun : kidem == null ? 14 : kidem < 1 ? 0 : kidem < 5 ? 14 : kidem < 15 ? 20 : 26;
  const kullanilan = (S.izinler || []).filter(i => i.kim === x.id && /yıllık/i.test(i.tur || '') && String(i.bas).slice(0, 4) === String(yil)).reduce((a, i) => a + izinGunu(i.bas, i.bit), 0);
  return { hak, kullanilan, kalan: hak - kullanilan, kidem, elle: +x.yillikIzinGun > 0 };
}
// PER-023: EK-21 (MTSK Direksiyon Usta Öğreticileri Hizmet İçi Eğitim Tamamlama Belgesi, md.31/A-5). Geçici md.16/2: 9/7/2024'ten
// itibaren 2 yıl içinde tamamlanır (9 Temmuz 2026); belgesi olmayanın çalışma izni uzatılmaz. Belge 10 yılda bir yenilenir.
export const EK21_SON = '2026-07-09';
export const ek21 = x => (x.evraklar || []).filter(v => v.tur === 'ek21').sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')))[0] || null;
// P04 ve kart için: bitişi geçmiş ya da 30 gün içinde biten evraklar
// PER-022: aylık hakediş. Ders ücretli (statü '0'): yapılan ders saati × ders ücreti (usta: direksiyon dersi; teorik öğretmen: teorik ders saati).
// Aylık ücretli: maaş + (ustada) ders primi. Avans ve hakediş ödemeleri düşülür → bakiye. ay: 'YYYY-MM'
export function hakedis(x, tur, ay) {
  // usta öğretici: ofisin hakediş tablosu ve öğretmenin 'Kazancım' ekranıyla aynı hesap (risk.js ustaAlacak, ödemeler S.ustaOdemeleri)
  if (tur === 'usta') { const [y0, m0] = gun(0).split('-').map(Number), geri = (y0 - +ay.slice(0, 4)) * 12 + (m0 - +ay.slice(5, 7)), a = ustaAlacak(x, geri);
    return { ay, dersUcretli: a.dersUcretli, ders: a.ders, birim: a.primBirim, maas: a.maas, dersTutar: a.prim, toplam: a.brut, avans: a.avans, odenen: a.odenen, odemeler: a.odemeler, bakiye: a.brut - a.avans - a.odenen }; }
  const ayin = t => String(t || '').slice(0, 7) === ay, dersUcretli = String(x.mebStatu) === '0';
  const ders = tur === 'usta' ? S.dersler.filter(d => d.egitmen === x.id && d.durum === 'Yapıldı' && ayin(d.tarih)).length : tur === 'ogretmen' ? (S.teorik || []).filter(t => t.ogretmen === x.id && ayin(t.tarih) && t.tarih <= gun(0)).reduce((a, t) => a + (+t.sure || 1), 0) : 0;
  const birim = dersUcretli ? (+x.dersUcreti || 0) : tur === 'usta' ? (+x.prim || 0) : 0;
  const maas = dersUcretli ? 0 : (+x.maas || 0), dersTutar = ders * birim;
  const avans = (S.avanslar || []).filter(a => a.kim === x.ad && ayin(a.tarih)).reduce((a, v) => a + (+v.tutar || 0), 0);
  const odemeler = (S.personelOdemeler || []).filter(o => o.kim === x.id && o.ay === ay), odenen = odemeler.reduce((a, v) => a + (+v.tutar || 0), 0);
  const toplam = maas + dersTutar;
  return { ay, dersUcretli, ders, birim, maas, dersTutar, toplam, avans, odenen, odemeler, bakiye: toplam - avans - odenen };
}
const AY_AD = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const ayAdi = ay => AY_AD[+ay.slice(5, 7) - 1] + ' ' + ay.slice(0, 4);
const ayKay = (ay, n) => { const d = new Date(+ay.slice(0, 4), +ay.slice(5, 7) - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const TL = n => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' ₺';
export const evrakDurumu = v => !v.bitis ? null : fark(v.bitis) < 0 ? 'bitti' : fark(v.bitis) <= 30 ? 'yakin' : null;

// PER-028: ana sayfadaki 'Personel tarihleri': 60 gün içinde biten (ya da bitmiş) çalışma izni ve sözleşmeler; 'denk gelenler': izin bitişinden sonraya
// (ya da tam bitiş gününe) düşen planlı direksiyon dersi, sınav randevusu (adayı götüren öğretmen) ve teorik ders. Bitiş günü sınavı il MEM'e soruldu (SOR-037): sarı.
export function personelTarihleri(sinavUstasi) {
  const kisiler = [...S.egitmenler.map(x => ({ x, tur: 'usta' })), ...(S.ogretmenler || []).map(x => ({ x, tur: 'ogretmen' })), ...(S.personel || []).map(x => ({ x, tur: 'personel' }))].filter(({ x }) => x && !x.pasif && !x.ayrildi);
  const yakin = [], denk = [];
  kisiler.forEach(({ x, tur }) => {
    const izin = x.mebIzinBitis || (x.meb || {}).izinBit, soz = ((x.evraklar || []).filter(v => v.tur === 'sozlesme' && v.bitis).sort((a, b) => b.bitis.localeCompare(a.bitis))[0] || {}).bitis;
    [['çalışma izni', izin], ['sözleşme', soz]].forEach(([ne, t]) => { if (t && fark(t) <= 60) yakin.push({ x, tur, ne, t, g: fark(t) }); });
    if (!izin) return;
    const d = S.dersler.filter(y => y.egitmen === x.id && y.durum === 'Planlandı' && y.tarih >= izin && fark(y.tarih) >= 0).sort((a, b) => a.tarih.localeCompare(b.tarih));
    const sonra = d.filter(y => y.tarih > izin), ayni = d.filter(y => y.tarih === izin);
    if (sonra.length) denk.push({ x, tur, ciddi: true, metin: `${sonra.length} direksiyon dersi izin bitişinden sonra (ilki ${tarih(sonra[0].tarih)})`, link: '#/plan' });
    if (ayni.length) denk.push({ x, tur, ciddi: false, metin: `${ayni.length} direksiyon dersi tam izin bitiş gününde (${tarih(izin)})`, link: '#/plan' });
    if (tur === 'usta' && sinavUstasi) (S.sinavlar || []).filter(sn => sn.tur === 'Direksiyon' && fark(sn.tarih) >= 0 && sn.tarih >= izin).forEach(sn => { const n = (sn.kursiyerler || []).filter(id => { const k = S.kursiyerler.find(z => z.id === id); return k && sinavUstasi(k) === x; }).length; if (n) denk.push({ x, tur, ciddi: sn.tarih > izin, metin: `${tarih(sn.tarih)} uygulama sınavına ${n} adayı götürecek${sn.tarih === izin ? ' (izin o gün bitiyor; il MEM’e soruldu)' : ''}`, link: '#/sinavlar' }); });
    const te = (S.teorik || []).filter(t => t.ogretmen === x.id && t.tarih >= izin && fark(t.tarih) >= 0);
    if (te.length) denk.push({ x, tur, ciddi: te.some(t => t.tarih > izin), metin: `${te.length} teorik ders izin bitişinde ya da sonrasında (ilki ${tarih(te.map(t => t.tarih).sort()[0])})`, link: '#/teorik' });
  });
  return { yakin: yakin.sort((a, b) => a.g - b.g), denk: denk.sort((a, b) => (b.ciddi ? 1 : 0) - (a.ciddi ? 1 : 0)) };
}
const durum = { sekme: 'genel', ay: gun(0).slice(0, 7) };
export function personelKarti(tur, id, sekme) {
  const x = personelBul(tur, id); if (!x) return bildir('Kişi bulunamadı', 'uyari');
  if (sekme) durum.sekme = sekme;
  const yenidenAc = s => { kapatPencere(); personelKarti(tur, id, s); };
  const gorev = gorevleri(x, tur), branslar = Array.isArray(x.branslar) ? x.branslar : x.brans ? [x.brans] : [];
  const SEKME = [['genel', 'Genel'], ['evrak', 'Evraklar', (x.evraklar || []).filter(evrakDurumu).length], ['zimmet', 'Zimmet', (x.zimmet || []).filter(z => !z.iade).length], ['izin', 'İzin'], ['hakedis', 'Hakediş']];
  const ust = `<div style="margin:-4px 0 14px">${sekmeler(SEKME.map(([k, ad, n]) => [k, ad, n || null]), durum.sekme, 'pk-sekme')}</div>`;
  let govde = '', altlik = '<button class="dg dg-cizgi" data-kapat>Kapat</button>';
  if (durum.sekme === 'genel') {
    const ozel = tur === 'personel';
    govde = `<form class="form-izgara" id="f-pk">
      ${ozel ? `<div class="alan"><label>Ad soyad</label><input name="ad" value="${e(x.ad || '')}" required></div><div class="alan"><label>Telefon</label><input name="tel" inputmode="tel" value="${e(x.tel || '')}"></div>
      <div class="alan"><label>T.C. kimlik no</label><input name="tc" inputmode="numeric" maxlength="11" value="${e(x.tc || '')}" placeholder="isteğe bağlı" autocomplete="off"></div><div class="alan"><label>Net maaş (₺)</label><input name="maas" inputmode="numeric" value="${e(x.maas || '')}"></div>
      <div class="alan"><label>İşe başlama</label><input name="baslama" type="date" value="${/^\d{4}-\d{2}-\d{2}$/.test(x.baslama || '') ? x.baslama : ''}"></div>` : `<p class="tam" style="font-size:13.5px;color:var(--soluk);margin:0">${e(x.ad)} · ad, telefon, izin no ve sınıflar ${tur === 'usta' ? 'usta öğretici' : 'teorik öğretmen'} kartında. <button type="button" class="dg dg-hafif dg-kucuk" data-pk-asil>${ik('kalem')}Kartı aç</button></p>`}
      <div class="alan tam"><span class="et">Görevleri</span><div class="secim">${GOREVLER.map(g => `<label><input type="checkbox" name="gorev" value="${e(g)}" ${gorev.includes(g) ? 'checked' : ''}><span>${e(g)}</span></label>`).join('')}</div></div>
      <div class="alan tam"><span class="et">Branşları</span><div class="secim">${BRANSLAR.map(g => `<label><input type="checkbox" name="brans" value="${e(g)}" ${branslar.some(b => b.toLocaleLowerCase('tr') === g.toLocaleLowerCase('tr')) ? 'checked' : ''}><span>${e(g)}</span></label>`).join('')}</div></div>
      <div class="alan"><label>Statü</label><select name="statu"><option value="">Seçilmedi</option>${STATULER.map(([v, t]) => `<option value="${v}" ${String(x.mebStatu ?? '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="alan"><label>Ders ücreti (₺/saat)</label><input name="dersUcreti" inputmode="numeric" value="${e(x.dersUcreti || '')}" placeholder="ders ücretli statüde"><small style="color:var(--soluk)">Ders ücretli personelin hakedişi yapılan ders saati × bu ücret.</small></div>
      <div class="alan"><label>Yıllık izin hakkı (gün)</label><input name="yillik" inputmode="numeric" value="${e(x.yillikIzinGun || '')}" placeholder="kıdeme göre ${yillikIzin({ ...x, yillikIzinGun: 0 }).hak}"></div>
      ${tur !== 'personel' ? (() => { const o = x.ogrenim || {}; return `<div class="alan tam" style="border-top:1px solid var(--cizgi-2);padding-top:10px"><b style="color:var(--murekkep)">Öğrenim bilgileri</b><small style="display:block;color:var(--soluk)">MEBBİS’te yeni çalışma izninin 2. aşaması (OOK13006) bu bilgilerle doldurulur.</small></div>
      <div class="alan"><label>Mezuniyet okul cinsi</label><select name="o_okulCinsi"><option value="">Seçilmedi</option>${['Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'].map(t => `<option ${o.okulCinsi === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="alan"><label>Üniversite / okul</label><input name="o_okul" value="${e(o.okul || '')}"></div><div class="alan"><label>Fakülte</label><input name="o_fakulte" value="${e(o.fakulte || '')}"></div>
      <div class="alan"><label>Yüksekokul</label><input name="o_yuksekokul" value="${e(o.yuksekokul || '')}"></div><div class="alan"><label>Ana bilim dalı</label><input name="o_anabilim" value="${e(o.anabilim || '')}"></div>
      <div class="alan"><label>Bölüm</label><input name="o_bolum" value="${e(o.bolum || '')}"></div><div class="alan"><label>Mezuniyet tarihi</label><input name="o_mezuniyet" type="date" value="${e(o.mezuniyet || '')}"></div>
      <div class="alan"><label>Belge cinsi</label><select name="o_belgeCinsi"><option value="">Seçilmedi</option>${['Diploma', 'Geçici Mezuniyet Belgesi', 'Çıkış Belgesi'].map(t => `<option ${o.belgeCinsi === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="alan"><label>Belge sayısı</label><input name="o_belgeSayi" value="${e(o.belgeSayi || '')}"></div><div class="alan"><label>Belge tarihi</label><input name="o_belgeTarih" type="date" value="${e(o.belgeTarih || '')}"></div>`; })() : ''}</form>`;
    altlik = `${ozel ? '<button class="dg dg-hafif" data-pk-sil style="margin-right:auto">Personeli çıkar</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-pk">Kaydet</button>`;
  } else if (durum.sekme === 'evrak') {
    const l = (x.evraklar || []).slice().sort((a, b) => (a.bitis || '9999').localeCompare(b.bitis || '9999'));
    const kartTarih = tur === 'usta' ? Object.entries({ sertifika: 'Usta öğretici sertifikası', saglik: 'Sağlık raporu', adli: 'Adli sicil kaydı' }).filter(([b]) => (x.belgeler || {})[b] && !l.some(v => v.tur === b)) : [];
    govde = `<ul class="liste">${kartTarih.map(([b, ad]) => { const t = x.belgeler[b], d = evrakDurumu({ bitis: t }); return `<li>${isaret(d === 'bitti' ? 'yasak' : d ? 'uyari' : 'tamam', 22)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${ad}</b><small style="color:var(--soluk)">Bitiş ${tarih(t)} · kartta yazılı (dosya yok)</small></div>${d === 'bitti' ? rozet('Süresi doldu', 'kirmizi') : d ? rozet(fark(t) + ' gün kaldı', 'uyari') : ''}</li>`; }).join('')}
      ${l.map(v => { const d = evrakDurumu(v); return `<li>${isaret(d === 'bitti' ? 'yasak' : d ? 'uyari' : 'tamam', 22)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(evrakAd(v.tur))}${v.not ? ' · ' + e(v.not) : ''}</b><small style="color:var(--soluk)">${v.tarih ? 'Alındı ' + tarih(v.tarih) : ''}${v.bitis ? (v.tarih ? ' · ' : '') + 'bitiş ' + tarih(v.bitis) : ' · süresiz'}${v.dosya ? ' · ' + e(v.dosya.ad || 'dosya') : ''}</small></div><span class="sag" style="gap:6px">${d === 'bitti' ? rozet('Süresi doldu', 'kirmizi') : d ? rozet(fark(v.bitis) + ' gün kaldı', 'uyari') : ''}${v.dosya ? `<button class="dg dg-hafif dg-kucuk" data-pk-evrak-ac="${e(v.id)}">Aç</button>` : ''}<button class="dg dg-hafif dg-kucuk" data-pk-evrak-sil="${e(v.id)}" aria-label="Sil">${ik('kapat')}</button></span></li>`; }).join('')}
      ${!l.length && !kartTarih.length ? '<li><small style="color:var(--soluk)">Evrak eklenmedi.</small></li>' : ''}</ul>
      <form class="form-izgara" id="f-pk-evrak" style="margin-top:12px;border-top:1px solid var(--cizgi-2);padding-top:12px">
        <div class="alan"><label>Evrak</label><select name="tur">${EVRAK_TURLERI.map(([k, ad]) => `<option value="${k}">${ad}</option>`).join('')}</select></div>
        <div class="alan"><label>Not</label><input name="not" placeholder="isteğe bağlı"></div>
        <div class="alan"><label>Alındığı tarih</label><input name="tarih" type="date" value="${gun(0)}" max="${gun(0)}"></div>
        <div class="alan"><label>Bitiş (varsa)</label><input name="bitis" type="date"></div>
        <div class="alan tam"><label>Dosya (isteğe bağlı)</label><input name="dosya" type="file" accept="image/*,application/pdf"><small style="color:var(--soluk)">Fotoğraf küçültülür; PDF en çok 1,5 MB.</small></div></form>`;
    altlik = `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" type="submit" form="f-pk-evrak">${ik('arti')}Evrak ekle</button>`;
  } else if (durum.sekme === 'zimmet') {
    const l = (x.zimmet || []).slice().sort((a, b) => (a.iade ? 1 : 0) - (b.iade ? 1 : 0) || String(b.verildi).localeCompare(String(a.verildi)));
    const bagli = tur === 'usta' ? sb(S.araclar).filter(a => a.egitmen === x.id) : [];
    govde = `${bagli.length ? `<p class="ipucu" style="margin:0 0 10px">${isaret('bilgi', 18)}<span>Ekip ve araçlar’da bu öğretmene bağlı araç: <b>${bagli.map(a => e(a.plaka)).join(', ')}</b>. Teslim tutanağı için aşağıdan zimmet olarak da ekleyebilirsiniz.</span></p>` : ''}
      <ul class="liste">${l.map(z => { const gec = !z.iade && z.teslim && fark(z.teslim) < 0; return `<li>${isaret(z.iade ? 'tamam' : gec ? 'uyari' : 'bilgi', 22)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(z.tur)} · ${e(z.ne)}</b><small style="color:var(--soluk)">Verildi ${tarih(z.verildi)}${z.teslim ? ' · teslim ' + tarih(z.teslim) : ''}${z.iade ? ' · iade ' + tarih(z.iade) : ''}</small></div><span class="sag" style="gap:6px">${z.iade ? rozet('İade edildi', 'yesil') : gec ? rozet('Teslim günü geçti', 'kirmizi') : ''}${z.iade ? '' : `<button class="dg dg-cizgi dg-kucuk" data-pk-iade="${e(z.id)}">İade alındı</button>`}</span></li>`; }).join('') || '<li><small style="color:var(--soluk)">Zimmet yok.</small></li>'}</ul>
      <form class="form-izgara" id="f-pk-zimmet" style="margin-top:12px;border-top:1px solid var(--cizgi-2);padding-top:12px">
        <div class="alan"><label>Tür</label><select name="tur">${ZIMMET_TUR.map(t => `<option>${t}</option>`).join('')}</select></div>
        <div class="alan" data-z-arac><label>Araç</label><select name="arac">${sb(S.araclar).map(a => `<option value="${e(a.plaka)}">${e(a.plaka)} · ${e(a.model || '')}</option>`).join('')}</select></div>
        <div class="alan" data-z-ne hidden><label>Ne verildi</label><input name="ne" placeholder="ör. ofis anahtarı, laptop seri no"></div>
        <div class="alan"><label>Veriliş</label><input name="verildi" type="date" value="${gun(0)}"></div>
        <div class="alan"><label>Planlanan teslim</label><input name="teslim" type="date"></div></form>`;
    altlik = `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" type="submit" form="f-pk-zimmet">${ik('arti')}Zimmet ekle</button>`;
  } else if (durum.sekme === 'hakedis') {
    const h = hakedis(x, tur, durum.ay), od = h.odemeler || [];
    const satir = (a, b, c = '') => `<div class="belge-satir"><span>${a}</span><b class="sayi">${b}</b>${c ? `<small style="color:var(--soluk);margin-left:6px">${c}</small>` : ''}</div>`;
    govde = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><button class="dg dg-hafif dg-kucuk" data-pk-ay="-1" aria-label="Önceki ay">‹</button><b style="min-width:120px;text-align:center">${ayAdi(durum.ay)}</b><button class="dg dg-hafif dg-kucuk" data-pk-ay="1" aria-label="Sonraki ay" ${durum.ay >= gun(0).slice(0, 7) ? 'disabled' : ''}>›</button></div>
      ${h.dersUcretli && !h.birim ? `<p class="ipucu uyari" style="margin:0 0 10px">${isaret('uyari', 18)}<span>Ders ücretli, ama ders ücreti girilmemiş. Genel sekmesinde “Ders ücreti” yazın.</span></p>` : ''}
      ${h.maas ? satir('Aylık ücret', TL(h.maas)) : ''}
      ${tur !== 'personel' ? satir(h.dersUcretli ? 'Ders ücreti' : 'Ders primi', TL(h.dersTutar), `${h.ders} ${tur === 'usta' ? 'direksiyon dersi' : 'teorik ders saati'} × ${TL(h.birim)}`) : ''}
      ${satir('Hakediş', TL(h.toplam))}${satir('Avans', h.avans ? '− ' + TL(h.avans) : '—')}${satir('Ödenen', h.odenen ? '− ' + TL(h.odenen) : '—', od.map(o => tarih(o.tarih)).join(', '))}
      <div class="belge-satir" style="border-top:1px solid var(--cizgi);margin-top:4px;padding-top:8px"><span><b>Kalan</b></span><b class="sayi" style="color:${h.bakiye < 0 ? 'var(--kirmizi)' : 'var(--murekkep)'}">${TL(h.bakiye)}</b></div>
      <p style="font-size:12.5px;color:var(--soluk);margin-top:8px">Tutarlar mdSinyal’deki ders kayıtları ve kartta yazılı ücretlerle hesaplanır; SGK ve vergi kesintileri bordroda yapılır.</p>
      ${h.bakiye > 0 ? `<form class="form-izgara" id="f-pk-ode" style="margin-top:12px;border-top:1px solid var(--cizgi-2);padding-top:12px"><div class="alan"><label>Ödenen tutar (₺)</label><input name="tutar" inputmode="numeric" value="${Math.round(h.bakiye)}"></div><div class="alan"><label>Ödeme</label><select name="yontem"><option>Havale</option><option>Nakit</option></select></div></form>` : ''}`;
    altlik = `<button class="dg dg-cizgi" data-kapat>Kapat</button>${h.bakiye > 0 ? `<button class="dg dg-ana" type="submit" form="f-pk-ode">Ödemeyi kaydet</button>` : ''}`;
  } else {
    const y = yillikIzin(x), l = (S.izinler || []).filter(i => i.kim === x.id).sort((a, b) => b.bas.localeCompare(a.bas));
    govde = `<div class="izgara iz-3" style="margin-bottom:12px">${[['Yıllık izin hakkı', y.hak + ' gün', y.elle ? 'kartta yazılı' : y.kidem == null ? 'başlama yılı yok, 14' : y.kidem + ' yıl kıdem (İş K. md.53)'], ['Bu yıl kullanılan', y.kullanilan + ' gün', 'Pazar ve resmî tatil sayılmaz'], ['Kalan', y.kalan + ' gün', y.kalan < 0 ? 'hak aşıldı' : '']].map(([a, b, c], i) => `<div class="kart gosterge"><small>${a}</small><b style="${i === 2 && y.kalan < 0 ? 'color:var(--kirmizi)' : ''}">${b}</b><span>${e(c)}</span></div>`).join('')}</div>
      <ul class="liste">${l.map(i => `<li>${isaret(fark(i.bit || i.bas) < 0 ? 'tamam' : 'uyari', 22)}<div style="flex:1;min-width:0"><b style="color:var(--murekkep);display:block">${e(i.tur)}</b><small style="color:var(--soluk)">${tarih(i.bas)}${i.bit && i.bit !== i.bas ? ' – ' + tarih(i.bit) : ''} · ${izinGunu(i.bas, i.bit)} gün</small></div></li>`).join('') || '<li><small style="color:var(--soluk)">İzin kaydı yok.</small></li>'}</ul>
      <form class="form-izgara" id="f-pk-izin" style="margin-top:12px;border-top:1px solid var(--cizgi-2);padding-top:12px">
        <div class="alan"><label>Tür</label><select name="tur"><option>Yıllık izin</option><option>Mazeret izni</option><option>Rapor</option><option>Ücretsiz izin</option></select></div>
        <div class="alan"><label>Başlangıç</label><input name="bas" type="date" value="${gun(1)}"></div><div class="alan"><label>Bitiş</label><input name="bit" type="date" value="${gun(1)}"></div></form>`;
    altlik = `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" type="submit" form="f-pk-izin">${ik('arti')}İzin ekle</button>`;
  }
  pencere({
    baslik: x.ad + ' · personel kartı', genis: true, icerik: ust + govde, altlik,
    onAc(d) {
      d.addEventListener('click', ev => {
        const s = ev.target.closest('[data-pk-sekme]'); if (s) { durum.sekme = s.dataset.pkSekme; return yenidenAc(); }
        const ay = ev.target.closest('[data-pk-ay]'); if (ay) { durum.ay = ayKay(durum.ay, +ay.dataset.pkAy); return yenidenAc(); }
        if (ev.target.closest('[data-pk-asil]')) { kapatPencere(); return tur === 'usta' ? import('./sayfalar2.js?v=234').then(m => m.ustaDuzenle(x.id)) : import('./gruplar.js?v=234').then(m => m.ogretmenPencere(x, () => import('./app.js?v=234').then(a => a.yenile()))); }
        const ea = ev.target.closest('[data-pk-evrak-ac]'); if (ea) { const v = (x.evraklar || []).find(z => z.id === ea.dataset.pkEvrakAc); if (v && v.dosya) { const w = window.open(); if (w) { w.document.title = evrakAd(v.tur); w.document.body.style.margin = '0'; w.document.body.innerHTML = v.dosya.tur === 'pdf' ? `<iframe src="${v.dosya.veri}" style="border:0;width:100vw;height:100vh"></iframe>` : `<img src="${v.dosya.veri}" style="max-width:100%">`; } islem('Personel evrakını açtı', x.ad + ' · ' + evrakAd(v.tur)); kaydet(); } return; }
        const es = ev.target.closest('[data-pk-evrak-sil]'); if (es) { const v = (x.evraklar || []).find(z => z.id === es.dataset.pkEvrakSil); if (!v) return; x.evraklar = x.evraklar.filter(z => z !== v); islem('Personel evrakını sildi', x.ad + ' · ' + evrakAd(v.tur)); kaydet(); return yenidenAc(); }
        const zi = ev.target.closest('[data-pk-iade]'); if (zi) { const z = (x.zimmet || []).find(q => q.id === zi.dataset.pkIade); if (!z) return; z.iade = gun(0); islem('Zimmet iadesi aldı', `${x.ad} · ${z.tur} ${z.ne}`); kaydet(); bildir('İade kaydedildi'); return yenidenAc(); }
        if (ev.target.closest('[data-pk-sil]')) { const izinde = (S.izinler || []).some(i => i.kim === x.id && fark(i.bit || i.bas) >= 0), acikZ = (x.zimmet || []).filter(z => !z.iade).length;
          if (acikZ) return bildir(`${x.ad} üzerinde ${acikZ} iade edilmemiş zimmet var; önce iadeyi kaydedin`, 'uyari');
          S.cikanlar = S.cikanlar || { egitmen: [], arac: [] }; S.cikanlar.personel = S.cikanlar.personel || []; S.cikanlar.personel.push({ ...x, cikis: gun(0) });
          S.personel = S.personel.filter(y => y !== x); islem('Personeli çıkardı', x.ad + (izinde ? ' (ileri tarihli izni vardı)' : '')); kaydet(); kapatPencere(); bildir(gorevleri(x, tur).some(g => /müdür|öğretici/i.test(g)) ? x.ad + ' çıkarıldı. Eğitim personeli ayrılışı 5 iş günü içinde MEM’e bildirilir (ÖÖKY md.44/4)' : x.ad + ' personel listesinden çıkarıldı; kayıtları arşivde', 'uyari'); import('./app.js?v=234').then(a => a.yenile()); }
      });
      const z = d.querySelector('#f-pk-zimmet'); if (z) { const tg = () => { const a = z.tur.value === 'Araç'; d.querySelector('[data-z-arac]').hidden = !a; d.querySelector('[data-z-ne]').hidden = a; }; z.tur.addEventListener('change', tg); tg(); }
      d.addEventListener('submit', async ev => {
        ev.preventDefault(); const f = ev.target;
        if (f.id === 'f-pk') {
          const gorevler = [...f.querySelectorAll('[name=gorev]:checked')].map(i => i.value), br = [...f.querySelectorAll('[name=brans]:checked')].map(i => i.value);
          if (tur === 'personel') {
            const ad = f.ad.value.trim(); if (ad.length < 3) return bildir('Ad soyad girin', 'uyari');
            const tc = f.tc.value.replace(/\D/g, ''); if (tc && !tcGecerli(tc)) return bildir('T.C. kimlik numarası geçersiz', 'uyari');
            if (!gorevler.length) return bildir('En az bir görev seçin', 'uyari');
            Object.assign(x, { ad, tel: f.tel.value.trim(), tc: tc || null, maas: tutarOku(f.maas.value) || 0, baslama: f.baslama.value || x.baslama || '', gorev: gorevler.join(', ') });
          }
          Object.assign(x, { gorevler, branslar: br, dersUcreti: tutarOku(f.dersUcreti.value) || null, mebStatu: f.statu.value === '' ? null : f.statu.value, yillikIzinGun: Math.min(60, Math.max(0, parseInt(f.yillik.value, 10) || 0)) || null });
          if (tur !== 'personel') { const o = {}; ['okulCinsi', 'okul', 'fakulte', 'yuksekokul', 'anabilim', 'bolum', 'mezuniyet', 'belgeCinsi', 'belgeSayi', 'belgeTarih'].forEach(k => { const v = (f['o_' + k].value || '').trim(); if (v) o[k] = v; }); x.ogrenim = Object.keys(o).length ? o : null; }
          if (tur === 'ogretmen' && br.length && !br.some(b => b.toLocaleLowerCase('tr') === String(x.brans || '').toLocaleLowerCase('tr'))) x.brans = br[0];
          islem('Personel kartını düzenledi', x.ad); kaydet(); bildir('Kaydedildi'); kapatPencere(); return import('./app.js?v=234').then(a => a.yenile());
        }
        if (f.id === 'f-pk-evrak') {
          if (f.bitis.value && f.tarih.value && f.bitis.value < f.tarih.value) return bildir('Bitiş alındığı tarihten önce olamaz', 'uyari');
          let dosya = null; const fl = f.dosya.files[0];
          if (fl) { const pdf = fl.type === 'application/pdf'; if (pdf && fl.size > 1.5e6) return bildir('PDF 1,5 MB’tan büyük; küçültüp yeniden seçin', 'uyari');
            try { const veri = pdf ? await new Promise((ok, red) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = red; r.readAsDataURL(fl); }) : await fotoKucult(fl, 1600); dosya = { ad: fl.name.slice(0, 80), tur: pdf ? 'pdf' : 'resim', veri }; } catch (x2) { return bildir('Dosya okunamadı', 'uyari'); } }
          // EK-21 on yıl geçerli (md.31/A-5): bitiş yazılmadıysa alınma + 10 yıl
          const on = t => { const d = tarihOku(t); d.setFullYear(d.getFullYear() + 10); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
          if (f.tur.value === 'ek21' && !f.tarih.value) return bildir('EK-21 belgesinin tarihini yazın', 'uyari');
          const v = { id: 'pe' + Date.now().toString(36), tur: f.tur.value, not: f.not.value.trim(), tarih: f.tarih.value || null, bitis: f.bitis.value || (f.tur.value === 'ek21' ? on(f.tarih.value) : null), ...(dosya ? { dosya } : {}) };
          x.evraklar = [...(x.evraklar || []), v];
          // usta öğreticinin kart tarihleri (M13 kuralı): sağlık, adli sicil, sertifika bitişi
          if (tur === 'usta' && ['saglik', 'adli', 'sertifika'].includes(v.tur) && v.bitis) { x.belgeler = { ...(x.belgeler || {}), [v.tur]: v.bitis }; }
          islem('Personel evrakı ekledi', `${x.ad} · ${evrakAd(v.tur)}`); kaydet(); bildir('Evrak eklendi'); return yenidenAc();
        }
        if (f.id === 'f-pk-zimmet') {
          const ne = f.tur.value === 'Araç' ? f.arac.value : f.ne.value.trim(); if (!ne) return bildir('Ne verildiğini yazın', 'uyari');
          if (f.teslim.value && f.teslim.value < f.verildi.value) return bildir('Teslim günü verilişten önce olamaz', 'uyari');
          x.zimmet = [...(x.zimmet || []), { id: 'z' + Date.now().toString(36), tur: f.tur.value, ne, verildi: f.verildi.value || gun(0), teslim: f.teslim.value || null, iade: null }];
          islem('Zimmet verdi', `${x.ad} · ${f.tur.value} ${ne}`); kaydet(); bildir('Zimmet kaydedildi'); return yenidenAc();
        }
        if (f.id === 'f-pk-ode') {
          const tutar = tutarOku(f.tutar.value); if (!tutar) return bildir('Tutarı yazın', 'uyari');
          if (tur === 'usta') { S.ustaOdemeleri = S.ustaOdemeleri || []; S.ustaOdemeleri.unshift({ id: 'uo' + Date.now(), egitmen: x.id, ay: durum.ay, tutar, tarih: gun(0), yontem: f.yontem.value }); }
          else S.personelOdemeler = [...(S.personelOdemeler || []), { id: 'po' + Date.now().toString(36), kim: x.id, ay: durum.ay, tutar, tarih: gun(0), yontem: f.yontem.value }];
          S.hareket.unshift({ id: 'h' + Date.now(), tarih: gun(0), tur: 'Gider', kategori: 'Maaş', aciklama: `${x.ad} · ${ayAdi(durum.ay)} hakedişi`, tutar, yontem: f.yontem.value });
          islem('Personel hakedişi ödedi', `${x.ad} · ${ayAdi(durum.ay)} · ${TL(tutar)}`); kaydet(); bildir('Ödeme kasaya gider olarak işlendi'); return yenidenAc();
        }
        if (f.id === 'f-pk-izin') {
          const bit = f.bit.value < f.bas.value ? f.bas.value : f.bit.value; S.izinler.push({ id: 'z' + Date.now().toString(36), kim: x.id, bas: f.bas.value, bit, tur: f.tur.value });
          const etk = tur === 'usta' ? S.dersler.filter(y => y.egitmen === x.id && y.durum === 'Planlandı' && y.tarih >= f.bas.value && y.tarih <= bit).length : 0;
          const y = yillikIzin(x); islem('İzin ekledi', `${x.ad} · ${f.tur.value} · ${tarih(f.bas.value)}`); kaydet();
          bildir(etk ? `İzin kaydedildi. O günlerde ${etk} ders var; planda başka öğretmene taşıyın` : /yıllık/i.test(f.tur.value) && y.kalan < 0 ? `İzin kaydedildi; yıllık izin hakkı ${-y.kalan} gün aşıldı` : 'İzin kaydedildi', etk || y.kalan < 0 ? 'uyari' : 'tamam'); return yenidenAc();
        }
      });
    },
  });
}
// Yeni büro personeli: boş kart (Genel sekmesi)
export function personelEkle() {
  const x = { id: 'p' + Date.now().toString(36), ad: '', tel: '', maas: 0, gorevler: [], sube: (S.subeler || [{}])[0].id };
  pencere({ baslik: 'Personel ekle', genis: true, icerik: `<form class="form-izgara" id="f-pe"><div class="alan"><label>Ad soyad</label><input name="ad" required></div><div class="alan"><label>Telefon</label><input name="tel" inputmode="tel"></div>
      <div class="alan"><label>Net maaş (₺)</label><input name="maas" inputmode="numeric"></div><div class="alan"><label>İşe başlama</label><input name="baslama" type="date" value="${gun(0)}"></div>
      <div class="alan tam"><span class="et">Görevleri</span><div class="secim">${GOREVLER.filter(g => g !== 'Usta Öğretici').map(g => `<label><input type="checkbox" name="gorev" value="${e(g)}"><span>${e(g)}</span></label>`).join('')}</div></div></form>
      <p style="font-size:13px;color:var(--soluk);margin-top:8px">Usta öğretici ve teorik öğretmen kendi kartından eklenir (Usta öğreticiler sekmesi, Teorik dersler › Öğretmenler).</p>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-pe">Ekle</button>',
    onAc(d) { d.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); const f = ev.target, ad = f.ad.value.trim(), g = [...f.querySelectorAll('[name=gorev]:checked')].map(i => i.value);
      if (ad.length < 3) return bildir('Ad soyad girin', 'uyari'); if (!g.length) return bildir('En az bir görev seçin', 'uyari');
      Object.assign(x, { ad, tel: f.tel.value.trim(), maas: tutarOku(f.maas.value) || 0, baslama: f.baslama.value || '', gorevler: g, gorev: g.join(', ') });
      S.personel = [...(S.personel || []), x]; islem('Personel ekledi', ad + ' · ' + x.gorev); kaydet(); kapatPencere(); bildir(ad + ' eklendi'); import('./app.js?v=234').then(a => a.yenile()); }); },
  });
}
