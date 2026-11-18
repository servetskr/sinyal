// MTSK Yönetmeliği md.42 defterleri (RAP-004): gelen-giden evrak kayıt defteri, sertifika defteri, kursiyer yoklama defteri ve dönem sonu yedeği.
// md.42/3: defter ve dosyalar her eğitim dönemi sonunda yedeklenmek koşuluyla elektronik ortamda tutulabilir. Kayıtlar silinmez; düzeltme işlem kaydına yazılır.
import { S, kaydet, gun, islem, tamAd, sinifEtiket, oturum, sb, kursiyer } from './veri.js?v=234';
import { e, pencere, kapatPencere, bildir, belgeYazdir, ik, csvIndir, tarih, rozet, sekmeler } from './ui.js?v=234';
import * as GR from './gruplar.js?v=234';

export const DEFTERLER = [
  ['evrakdefteri', 'Gelen-giden evrak kayıt defteri (md.42)', 'Kursa gelen ve kurstan giden resmî yazılar; yıl içinde sıra numaralı', 'defter'],
  ['sertifikadefteri', 'Sertifika defteri', 'Verilen sertifika ve eğitim belgeleri; teslim tarihi ve imza sütunuyla', 'defter'],
  ['yoklamadefteri', 'Kursiyer yoklama defteri (md.42)', 'Teorik derslerin yoklaması, grup ve ders ders', 'defter'],
  ['yoklamacizelge', 'Yoklama çizelgesi (imzalı)', 'Grubun dersleri için imza sütunlu çizelge; sütun ve sayfa başına kursiyer ayarlı', 'defter'],
  ['teorikprogram', 'Teorik ders programı', 'Grubun teorik programı: tarih, saat, ders, öğretici, derslik; ders başına saat özeti', 'defter'],
  ['donemyedek', 'Dönem sonu yedeği (md.42/3)', 'Defterlerin ve ders defterinin dönem sonu yedeği tek dosyada', 'defter'],
];
export function defterAc(tur) {
  if (tur === 'evrakdefteri') return evrakDefteri();
  if (tur === 'sertifikadefteri') return sertifikaDefteri();
  if (tur === 'yoklamadefteri') return yoklamaDefteri();
  if (tur === 'donemyedek') return donemYedegi();
  if (tur === 'yoklamacizelge') return yoklamaCizelgesi();
  if (tur === 'teorikprogram') return teorikProgram();
}

const trT = t => t ? String(t).slice(0, 10).split('-').reverse().join('.') : '';
const kurumAd = () => S.kurs.resmiAd || S.kurs.ad || '';
const kim = () => (oturum.kullanici && oturum.kullanici.ad) || '';
const BAS = (baslik, alt) => `<div style="text-align:center;font-weight:700;font-size:15px;margin-bottom:2px">${e(baslik)}</div><div style="text-align:center;font-size:12px;margin-bottom:12px">${e(kurumAd())}${alt ? ' · ' + e(alt) : ''}</div>`;
const NOT = `<p style="font-size:10.5px;margin-top:10px">MTSK Yönetmeliği md.42: defterin sayfaları numaralandırılır, kurs kaşesiyle tasdik edilir, son sayfaya sayfa adedi yazılarak kurs müdürünce onaylanır; silinti ve kazıntı yapılmaz. Elektronik ortamda tutulan defter her eğitim dönemi sonunda yedeklenir.</p>`;
const yillar = l => [...new Set([String(new Date().getFullYear()), ...l.map(x => String(x).slice(0, 4))])].filter(x => /^\d{4}$/.test(x)).sort().reverse();

/* ---------- Gelen-giden evrak kayıt defteri ---------- */
// kayıt: { id, yil, yon: 'Gelen'|'Giden', no (yıl ve yön içinde sıra), tarih (deftere giriş), belgeTarih, sayi, kurum (gönderen ya da gönderilen), konu, ek, havale, not, kim, kaynak }
export const evrakKayitlari = () => (S.evrakDefteri = S.evrakDefteri || []);
const sonrakiNo = (yil, yon) => 1 + Math.max(0, ...evrakKayitlari().filter(x => x.yil === yil && x.yon === yon).map(x => +x.no || 0));
export function evrakEkle(o) {
  const yil = String(o.tarih || gun(0)).slice(0, 4), r = { id: 'ev' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), yil, no: sonrakiNo(yil, o.yon), tarih: o.tarih || gun(0), kim: kim(), ...o, yil };
  r.no = sonrakiNo(yil, r.yon); evrakKayitlari().push(r); islem('Evrak defterine kaydetti', `${r.yon} ${r.yil}/${r.no} · ${r.kurum || ''} · ${r.konu || ''}`.slice(0, 160)); kaydet(); return r;
}
const durumE = { yil: String(new Date().getFullYear()), yon: 'hepsi' };
function evrakSatirlari() { return evrakKayitlari().filter(x => x.yil === durumE.yil && (durumE.yon === 'hepsi' || x.yon === durumE.yon)).sort((a, b) => a.yon.localeCompare(b.yon, 'tr') || a.no - b.no); }
function evrakYazdirHtml() {
  const l = evrakSatirlari(), grup = yon => l.filter(x => x.yon === yon);
  const tablo = yon => { const g = grup(yon); if (!g.length && durumE.yon !== 'hepsi' && durumE.yon !== yon) return ''; return `<p style="font-weight:700;margin:10px 0 4px">${yon === 'Gelen' ? 'GELEN EVRAK' : 'GİDEN EVRAK'}</p><table><tr><th style="width:34px">Sıra</th><th>Kayıt tarihi</th><th>${yon === 'Gelen' ? 'Gönderen' : 'Gönderilen'}</th><th>Belge tarihi</th><th>Sayısı</th><th>Konusu</th><th>Ek</th><th>${yon === 'Gelen' ? 'Havale' : 'Açıklama'}</th></tr>${g.map(x => `<tr><td>${x.no}</td><td>${trT(x.tarih)}</td><td>${e(x.kurum || '')}</td><td>${trT(x.belgeTarih)}</td><td>${e(x.sayi || '')}</td><td>${e(x.konu || '')}</td><td>${e(x.ek || '')}</td><td>${e(yon === 'Gelen' ? x.havale || '' : x.not || '')}</td></tr>`).join('') || '<tr><td colspan="8">Kayıt yok</td></tr>'}</table>`; };
  return `<div data-yatay>${BAS('GELEN-GİDEN EVRAK KAYIT DEFTERİ', durumE.yil + ' yılı')}${durumE.yon !== 'Giden' ? tablo('Gelen') : ''}${durumE.yon !== 'Gelen' ? tablo('Giden') : ''}${NOT}<div style="display:flex;justify-content:flex-end;margin-top:22px;text-align:center"><div>Kurs müdürü<br>${e(S.kurs.yetkili || '')}<br>İmza / kaşe</div></div></div>`;
}
function evrakDefteri() {
  const govde = () => { const l = evrakSatirlari(), yl = yillar(evrakKayitlari().map(x => x.yil));
    return `<div class="vr-suzgec" style="margin-top:0"><label class="vr-alan"><span>Yıl</span><select class="girdi" data-ed="yil">${yl.map(y => `<option ${y === durumE.yil ? 'selected' : ''}>${y}</option>`).join('')}</select></label>${sekmeler([['hepsi', 'Hepsi'], ['Gelen', 'Gelen', evrakKayitlari().filter(x => x.yil === durumE.yil && x.yon === 'Gelen').length], ['Giden', 'Giden', evrakKayitlari().filter(x => x.yil === durumE.yil && x.yon === 'Giden').length]], durumE.yon, 'ed-yon')}<span style="flex:1"></span><button type="button" class="dg dg-ana dg-kucuk" data-ed-yeni>${ik('arti')}Evrak kaydet</button></div>
      ${l.length ? `<div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>No</th><th>Tarih</th><th>Kurum</th><th>Konu</th><th class="m-gizle">Sayı</th><th></th></tr></thead><tbody>${l.map(x => `<tr><td class="rf-nw">${rozet(x.yon, x.yon === 'Gelen' ? 'mavi' : 'notr')} ${x.yil}/${x.no}</td><td class="rf-nw">${trT(x.tarih)}</td><td>${e(x.kurum || '—')}</td><td>${e(x.konu || '')}${x.kaynak === 'mevzuat' ? ' <small style="color:var(--soluk)">· Mevzuat’a yüklendi</small>' : ''}</td><td class="m-gizle">${e(x.sayi || '')}</td><td><button type="button" class="dg dg-hafif dg-kucuk" data-ed-duz="${x.id}">Düzelt</button></td></tr>`).join('')}</tbody></table></div>`
        : `<p class="ipucu" style="margin:14px 0">Bu yıl ${durumE.yon === 'hepsi' ? '' : durumE.yon.toLocaleLowerCase('tr') + ' '}evrak kaydı yok. İl/ilçe milli eğitimden gelen ya da kurstan giden her resmî yazıyı buradan kaydedin; sıra numarası yıl içinde kendiliğinden verilir.</p>`}`; };
  pencere({
    baslik: 'Gelen-giden evrak kayıt defteri', genis: true,
    icerik: `<div data-ed-govde>${govde()}</div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-ed-excel>${ik('indir')}Excel</button><button class="dg dg-ana" data-ed-yazdir>${ik('belge')}Yazdır / PDF</button>`,
    onAc(d) {
      const ciz = () => { d.querySelector('[data-ed-govde]').innerHTML = govde(); };
      d.addEventListener('change', ev => { const s = ev.target.closest('[data-ed="yil"]'); if (s) { durumE.yil = s.value; ciz(); } });
      d.addEventListener('click', ev => {
        const y = ev.target.closest('[data-ed-yon]'); if (y) { durumE.yon = y.dataset.edYon; return ciz(); }
        if (ev.target.closest('[data-ed-yeni]')) return evrakFormu(null, ciz);
        const dz = ev.target.closest('[data-ed-duz]'); if (dz) return evrakFormu(evrakKayitlari().find(x => x.id === dz.dataset.edDuz), ciz);
      });
      d.querySelector('[data-ed-yazdir]').addEventListener('click', () => { belgeYazdir(evrakYazdirHtml(), 'Gelen-giden evrak kayıt defteri ' + durumE.yil); islem('Evrak defterini yazdırdı', durumE.yil); kaydet(); });
      d.querySelector('[data-ed-excel]').addEventListener('click', () => csvIndir('evrak-defteri-' + durumE.yil + '.csv', [['Yön', 'Sıra', 'Kayıt tarihi', 'Kurum', 'Belge tarihi', 'Sayı', 'Konu', 'Ek', 'Havale', 'Açıklama', 'Kaydeden'], ...evrakSatirlari().map(x => [x.yon, x.no, x.tarih, x.kurum || '', x.belgeTarih || '', x.sayi || '', x.konu || '', x.ek || '', x.havale || '', x.not || '', x.kim || ''])]));
    },
  });
}
function evrakFormu(x, sonra) {
  const v = x || { yon: 'Gelen', tarih: gun(0) };
  pencere({
    ust: true, baslik: x ? `Evrak ${x.yon.toLocaleLowerCase('tr')} ${x.yil}/${x.no} · düzelt` : 'Evrak kaydet',
    icerik: `<form class="form-izgara" id="f-evrak" novalidate>
      <div class="alan"><span class="et">Yön</span><div class="secim">${['Gelen', 'Giden'].map(y => `<label><input type="radio" name="yon" value="${y}" ${v.yon === y ? 'checked' : ''} ${x ? 'disabled' : ''}><span>${y}</span></label>`).join('')}</div></div>
      <div class="alan"><label for="ev-t">Kayıt tarihi</label><input id="ev-t" type="date" name="tarih" value="${e(v.tarih || '')}" max="${gun(0)}" ${x ? 'disabled' : ''}></div>
      <div class="alan tam"><label for="ev-k" data-ev-kurum-et>${v.yon === 'Giden' ? 'Gönderilen kurum' : 'Gönderen kurum'}</label><input id="ev-k" name="kurum" value="${e(v.kurum || '')}" maxlength="160" list="ev-kurumlar" placeholder="Ör. Eskişehir İl Milli Eğitim Müdürlüğü"><datalist id="ev-kurumlar">${[...new Set(evrakKayitlari().map(y => y.kurum).filter(Boolean))].slice(0, 30).map(y => `<option value="${e(y)}">`).join('')}</datalist></div>
      <div class="alan"><label for="ev-bt">Belge tarihi</label><input id="ev-bt" type="date" name="belgeTarih" value="${e(v.belgeTarih || '')}"></div>
      <div class="alan"><label for="ev-s">Sayısı</label><input id="ev-s" name="sayi" value="${e(v.sayi || '')}" maxlength="80" placeholder="Ör. E-12345678-100-99999999"></div>
      <div class="alan tam"><label for="ev-konu">Konusu</label><input id="ev-konu" name="konu" value="${e(v.konu || '')}" maxlength="240"></div>
      <div class="alan"><label for="ev-ek">Ek</label><input id="ev-ek" name="ek" value="${e(v.ek || '')}" maxlength="60" placeholder="Ör. 2 sayfa"></div>
      <div class="alan"><label for="ev-h" data-ev-havale-et>${v.yon === 'Giden' ? 'Açıklama' : 'Havale edilen'}</label><input id="ev-h" name="havale" value="${e(v.yon === 'Giden' ? v.not || '' : v.havale || '')}" maxlength="120"></div>
    </form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-evrak">${x ? 'Kaydet' : 'Deftere kaydet'}</button>`,
    onAc(d) {
      const f = d.querySelector('form');
      f.addEventListener('change', () => { const y = (f.querySelector('[name=yon]:checked') || {}).value; d.querySelector('[data-ev-kurum-et]').textContent = y === 'Giden' ? 'Gönderilen kurum' : 'Gönderen kurum'; d.querySelector('[data-ev-havale-et]').textContent = y === 'Giden' ? 'Açıklama' : 'Havale edilen'; });
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const yon = x ? x.yon : (f.querySelector('[name=yon]:checked') || {}).value, kurum = f.kurum.value.trim(), konu = f.konu.value.trim();
        if (!kurum) { f.kurum.focus(); return bildir(yon === 'Giden' ? 'Gönderilen kurumu yazın' : 'Gönderen kurumu yazın', 'uyari'); }
        if (!konu) { f.konu.focus(); return bildir('Evrakın konusunu yazın', 'uyari'); }
        const ort = { kurum, konu, belgeTarih: f.belgeTarih.value, sayi: f.sayi.value.trim(), ek: f.ek.value.trim(), ...(yon === 'Giden' ? { not: f.havale.value.trim() } : { havale: f.havale.value.trim() }) };
        if (x) { const eski = `${x.kurum} · ${x.konu}`; Object.assign(x, ort, { duzelten: kim(), duzeltme: gun(0) }); islem('Evrak defteri kaydını düzeltti', `${x.yon} ${x.yil}/${x.no} · önce: ${eski}`.slice(0, 200)); kaydet(); }
        else { if (!f.tarih.value) { f.tarih.focus(); return bildir('Kayıt tarihini girin', 'uyari'); } const r = evrakEkle({ yon, tarih: f.tarih.value, ...ort }); bildir(`${r.yon} evrak ${r.yil}/${r.no} numarayla kaydedildi`); }
        kapatPencere(); if (sonra) sonra();
      });
    },
  });
}

/* ---------- Sertifika defteri ---------- */
const durumS = { yil: String(new Date().getFullYear()) };
const sertifikalilar = () => S.kursiyerler.filter(k => k.kapanis && k.kapanis.sertifika && String(k.kapanis.sertifika).slice(0, 4) === durumS.yil).sort((a, b) => String(a.kapanis.sertifika).localeCompare(String(b.kapanis.sertifika)) || tamAd(a).localeCompare(tamAd(b), 'tr'));
const donemOf = k => { const g = GR.kursiyerGrubu(k); return g && g.donem ? GR.donemAdi(g.donem) : ''; };
function sertifikaYazdirHtml() {
  const l = sertifikalilar();
  return `<div data-yatay>${BAS('SERTİFİKA DEFTERİ', durumS.yil + ' yılı')}<table><tr><th style="width:34px">Sıra</th><th>Veriliş tarihi</th><th>T.C. kimlik no</th><th>Adı soyadı</th><th>Baba adı</th><th>Doğum tarihi</th><th>Sertifika sınıfı</th><th>Dönem</th><th>Teslim tarihi</th><th style="width:90px">Teslim alanın imzası</th></tr>
    ${l.map((k, i) => `<tr><td>${i + 1}</td><td>${trT(k.kapanis.sertifika)}</td><td>${e(k.tc || '')}</td><td>${e(tamAd(k))}</td><td>${e(k.babaAdi || (k.nufus || {}).baba || '')}</td><td>${trT(k.dogumTarihi)}</td><td>${e(sinifEtiket(k.sinif, k))}</td><td>${e(donemOf(k))}</td><td>${trT((k.kapanis.teslim || {}).tarih)}</td><td></td></tr>`).join('') || '<tr><td colspan="10">Bu yıl sertifika kaydı yok</td></tr>'}</table>${NOT}<div style="display:flex;justify-content:flex-end;margin-top:22px;text-align:center"><div>Kurs müdürü<br>${e(S.kurs.yetkili || '')}<br>İmza / kaşe</div></div></div>`;
}
function sertifikaDefteri() {
  const govde = () => { const l = sertifikalilar(), yl = yillar(S.kursiyerler.filter(k => k.kapanis && k.kapanis.sertifika).map(k => k.kapanis.sertifika));
    return `<div class="vr-suzgec" style="margin-top:0"><label class="vr-alan"><span>Yıl</span><select class="girdi" data-sd="yil">${yl.map(y => `<option ${y === durumS.yil ? 'selected' : ''}>${y}</option>`).join('')}</select></label><small style="color:var(--soluk)">${l.length} sertifika · ${l.filter(k => k.kapanis.teslim).length} teslim edildi</small></div>
    ${l.length ? `<div class="tablo-kap"><table class="tablo tablo-mobil"><thead><tr><th>Sıra</th><th>Veriliş</th><th>Kursiyer</th><th class="m-gizle">Sınıf</th><th>Teslim</th></tr></thead><tbody>${l.map((k, i) => `<tr><td>${i + 1}</td><td class="rf-nw">${trT(k.kapanis.sertifika)}</td><td><a href="#/kursiyer/${k.id}" data-kapat>${e(tamAd(k))}</a></td><td class="m-gizle">${e(sinifEtiket(k.sinif, k))}</td><td>${k.kapanis.teslim ? rozet('Teslim · ' + trT(k.kapanis.teslim.tarih), 'yesil') : `<button type="button" class="dg dg-cizgi dg-kucuk" data-sd-teslim="${k.id}">Teslim edildi</button>`}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="ipucu" style="margin:14px 0">Bu yıl sertifika kaydı yok. Öğrenci dosyasında “Dosya kapanışı › Sertifika düzenlendi” işaretlenen her öğrenci buraya sıra numarasıyla girer.</p>'}`; };
  pencere({
    baslik: 'Sertifika defteri', genis: true, icerik: `<div data-sd-govde>${govde()}</div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-sd-excel>${ik('indir')}Excel</button><button class="dg dg-ana" data-sd-yazdir>${ik('belge')}Yazdır / PDF</button>`,
    onAc(d) {
      const ciz = () => { d.querySelector('[data-sd-govde]').innerHTML = govde(); };
      d.addEventListener('change', ev => { const s = ev.target.closest('[data-sd="yil"]'); if (s) { durumS.yil = s.value; ciz(); } });
      d.addEventListener('click', ev => { const t = ev.target.closest('[data-sd-teslim]'); if (!t) return; const k = kursiyer(t.dataset.sdTeslim); if (!k) return; k.kapanis.teslim = { tarih: gun(0), kim: kim() }; islem('Sertifikayı teslim etti', tamAd(k)); kaydet(); ciz(); });
      d.querySelector('[data-sd-yazdir]').addEventListener('click', () => { belgeYazdir(sertifikaYazdirHtml(), 'Sertifika defteri ' + durumS.yil); islem('Sertifika defterini yazdırdı', durumS.yil); kaydet(); });
      d.querySelector('[data-sd-excel]').addEventListener('click', () => csvIndir('sertifika-defteri-' + durumS.yil + '.csv', [['Sıra', 'Veriliş tarihi', 'TC', 'Ad soyad', 'Baba adı', 'Doğum tarihi', 'Sınıf', 'Dönem', 'Teslim tarihi'], ...sertifikalilar().map((k, i) => [i + 1, k.kapanis.sertifika, k.tc || '', tamAd(k), k.babaAdi || (k.nufus || {}).baba || '', k.dogumTarihi || '', sinifEtiket(k.sinif, k), donemOf(k), (k.kapanis.teslim || {}).tarih || ''])]));
    },
  });
}

/* ---------- Kursiyer yoklama defteri (teorik) ---------- */
const durumY = { grup: '' };
const gruplar = () => { const l = (S.gruplar || []).filter(g => S.teorik.some(t => (t.grup || 'aksam') === g.id)); return l.length ? l : [{ id: 'aksam', ad: 'Akşam grubu' }, { id: 'sabah', ad: 'Sabah grubu' }].filter(g => S.teorik.some(t => (t.grup || 'aksam') === g.id)); };
function yoklamaVerisi(gid) {
  const oturumlar = S.teorik.filter(t => (t.grup || 'aksam') === gid && t.tarih <= gun(0)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const kisiler = sb(S.kursiyerler).filter(k => (k.teorikGrup || '') === gid).sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
  const hucre = (k, t) => !t.yoklama ? '' : t.tarih < (k.kayit || '') ? '·' : t.yoklama.includes(k.id) ? '✓' : '–';
  return { oturumlar, kisiler, hucre };
}
function yoklamaYazdirHtml() {
  const g = gruplar().find(x => x.id === durumY.grup) || {}, { oturumlar, kisiler, hucre } = yoklamaVerisi(durumY.grup), PARCA = 16;
  const parcalar = []; for (let i = 0; i < Math.max(1, oturumlar.length); i += PARCA) parcalar.push(oturumlar.slice(i, i + PARCA));
  return `<div data-yatay>${parcalar.map((p, j) => `<div style="${j ? 'page-break-before:always' : ''}">${BAS('KURSİYER YOKLAMA DEFTERİ', (g.ad || '') + (parcalar.length > 1 ? ` · ${j + 1}/${parcalar.length}` : ''))}<table style="font-size:10px"><tr><th style="width:24px">#</th><th style="min-width:130px">Adı soyadı</th>${p.map(t => `<th style="writing-mode:vertical-rl;transform:rotate(180deg);height:86px;font-weight:400">${trT(t.tarih)} ${e(t.saat || '')}<br>${e(String(t.konu || '').slice(0, 18))}</th>`).join('')}<th>Gelmediği</th></tr>
    ${kisiler.map((k, i) => `<tr><td>${i + 1}</td><td>${e(tamAd(k))}</td>${p.map(t => `<td style="text-align:center">${hucre(k, t)}</td>`).join('')}<td style="text-align:center">${oturumlar.filter(t => hucre(k, t) === '–').length}</td></tr>`).join('') || `<tr><td colspan="${p.length + 3}">Bu grupta kursiyer yok</td></tr>`}
    <tr><td></td><td>Öğreticinin imzası</td>${p.map(() => '<td style="height:26px"></td>').join('')}<td></td></tr></table></div>`).join('')}<p style="font-size:10.5px">✓ katıldı · – katılmadı · · kayıttan önceki ders · boş: yoklama alınmadı.</p>${NOT}</div>`;
}
function yoklamaDefteri() {
  const gl = gruplar(); if (!gl.length) return pencere({ baslik: 'Kursiyer yoklama defteri', icerik: '<p>Henüz teorik ders yok. Teorik dersler sayfasından ders ekleyip yoklama alınca defter dolar.</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
  if (!gl.some(g => g.id === durumY.grup)) durumY.grup = gl[0].id;
  const govde = () => { const { oturumlar, kisiler, hucre } = yoklamaVerisi(durumY.grup);
    return `<div class="vr-suzgec" style="margin-top:0"><label class="vr-alan"><span>Grup</span><select class="girdi" data-yd="grup">${gl.map(g => `<option value="${e(g.id)}" ${g.id === durumY.grup ? 'selected' : ''}>${e(g.ad || g.id)}</option>`).join('')}</select></label><small style="color:var(--soluk)">${oturumlar.length} ders · ${kisiler.length} kursiyer · ${oturumlar.filter(t => t.yoklama).length} derste yoklama alındı</small></div>
    <div class="tablo-kap"><table class="tablo yd-tablo"><thead><tr><th>Kursiyer</th>${oturumlar.map(t => `<th title="${e(t.konu || '')}">${trT(t.tarih).slice(0, 5)}</th>`).join('')}<th>Gelmedi</th></tr></thead><tbody>${kisiler.map(k => `<tr><td class="rf-nw">${e(tamAd(k))}</td>${oturumlar.map(t => { const h = hucre(k, t); return `<td class="${h === '–' ? 'yd-yok' : ''}" style="text-align:center">${h}</td>`; }).join('')}<td style="text-align:center"><b>${oturumlar.filter(t => hucre(k, t) === '–').length}</b></td></tr>`).join('') || `<tr><td colspan="${oturumlar.length + 2}">Bu grupta kursiyer yok</td></tr>`}</tbody></table></div>
    <p class="ipucu" style="margin-top:8px;font-size:12.5px">✓ katıldı · – katılmadı · · kayıttan önceki ders · boş: o derste yoklama alınmadı. Yoklama Teorik dersler sayfasından alınır.</p>`; };
  pencere({
    baslik: 'Kursiyer yoklama defteri', genis: true, icerik: `<div data-yd-govde>${govde()}</div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-yd-excel>${ik('indir')}Excel</button><button class="dg dg-ana" data-yd-yazdir>${ik('belge')}Yazdır / PDF</button>`,
    onAc(d) {
      d.addEventListener('change', ev => { const s = ev.target.closest('[data-yd="grup"]'); if (s) { durumY.grup = s.value; d.querySelector('[data-yd-govde]').innerHTML = govde(); } });
      d.querySelector('[data-yd-yazdir]').addEventListener('click', () => { belgeYazdir(yoklamaYazdirHtml(), 'Kursiyer yoklama defteri'); islem('Yoklama defterini yazdırdı', (gl.find(g => g.id === durumY.grup) || {}).ad || ''); kaydet(); });
      d.querySelector('[data-yd-excel]').addEventListener('click', () => { const { oturumlar, kisiler, hucre } = yoklamaVerisi(durumY.grup); csvIndir('yoklama-defteri-' + durumY.grup + '.csv', [['Kursiyer', 'TC', ...oturumlar.map(t => t.tarih + ' ' + (t.saat || '') + ' ' + (t.konu || '')), 'Gelmediği'], ...kisiler.map(k => [tamAd(k), k.tc || '', ...oturumlar.map(t => hucre(k, t)), oturumlar.filter(t => hucre(k, t) === '–').length])]); });
    },
  });
}

/* ---------- Dönem sonu yedeği (md.42/3) ---------- */
function donemYedegi() {
  const dl = [...new Set((S.gruplar || []).map(g => g.donem).filter(Boolean))].sort().reverse();
  pencere({
    baslik: 'Dönem sonu yedeği',
    icerik: `<p style="font-size:14px;margin-bottom:12px">MTSK Yönetmeliği md.42/3: defterler elektronik ortamda tutulduğunda her eğitim dönemi sonunda yedeklenir. Seçtiğiniz dönemin gelen-giden evrak, sertifika, yoklama ve teorik ders defteri kayıtları tek dosyada iner; dosyayı kurs bilgisayarında ve harici bir diskte saklayın.</p>
      <div class="alan"><label>Dönem</label><select class="girdi" data-dy="donem">${dl.map(x => `<option value="${x}">${e(GR.donemAdi(x))}</option>`).join('') || `<option value="${gun(0).slice(0, 4) + gun(0).slice(5, 7)}">${e(GR.donemAdi(gun(0).slice(0, 4) + gun(0).slice(5, 7)))}</option>`}</select></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-dy-indir>${ik('indir')}Yedeği indir</button>`,
    onAc(d) {
      d.querySelector('[data-dy-indir]').addEventListener('click', () => {
        const donem = d.querySelector('[data-dy="donem"]').value, bas = donem.slice(0, 4) + '-' + donem.slice(4, 6) + '-01', gl = (S.gruplar || []).filter(g => g.donem === donem).map(g => g.id);
        const bit = (() => { const t = new Date(bas + 'T12:00'); t.setMonth(t.getMonth() + 4); return t.toISOString().slice(0, 10); })();   // dönem grubu en çok ~4 ay sürer
        const veri = { tur: 'mdSinyal dönem sonu yedeği (MTSK Yön. md.42/3)', kurs: kurumAd(), donem: GR.donemAdi(donem), alindi: new Date().toISOString(), alan: kim(),
          evrakDefteri: evrakKayitlari().filter(x => x.tarih >= bas && x.tarih <= bit),
          sertifikaDefteri: S.kursiyerler.filter(k => k.kapanis && k.kapanis.sertifika && gl.includes(k.teorikGrup)).map(k => ({ tarih: k.kapanis.sertifika, tc: k.tc || '', ad: tamAd(k), sinif: sinifEtiket(k.sinif, k), teslim: (k.kapanis.teslim || {}).tarih || '' })),
          yoklamaDefteri: gl.map(id => { const { oturumlar, kisiler, hucre } = yoklamaVerisi(id); return { grup: (GR.grupBul(id) || {}).ad || id, dersler: oturumlar.map(t => ({ tarih: t.tarih, saat: t.saat, konu: t.konu, ogretmen: t.ogretmen || '' })), kursiyerler: kisiler.map(k => ({ ad: tamAd(k), tc: k.tc || '', yoklama: oturumlar.map(t => hucre(k, t)).join('') })) }; }),
          dersDefteri: S.teorik.filter(t => gl.includes(t.grup)).map(t => ({ grup: t.grup, tarih: t.tarih, saat: t.saat, sure: t.sure, konu: t.konu, ogretmen: t.ogretmen || '', katilim: t.yoklama ? t.yoklama.length : t.katilim })) };
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(veri, null, 1)], { type: 'application/json' })); a.download = `donem-sonu-yedegi-${donem}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        S.kurs.donemYedek = { ...(S.kurs.donemYedek || {}), [donem]: gun(0) }; islem('Dönem sonu yedeğini indirdi', GR.donemAdi(donem)); kaydet(); kapatPencere(); bildir('Dönem sonu yedeği indirildi');
      });
    },
  });
}
// önizleme ve test için yazdırma çıktıları
export const yazdirHtml = { evrak: () => evrakYazdirHtml(), sertifika: () => sertifikaYazdirHtml(), yoklama: () => yoklamaYazdirHtml() };

/* ---------- Yoklama çizelgesi ve teorik ders programı çıktısı (TEO-013; Çizgi 'Belge Çıkart') ---------- */
const durumC = { grup: '', sutun: 8, sayfa: 25, bas: '' };
const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const ogretmenAd = id => ((S.ogretmenler || []).find(o => o.id === id) || {}).ad || '';
const grupDersleri = gid => S.teorik.filter(t => (t.grup || 'aksam') === gid).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
const grupSecimi = (gl, v) => `<label class="vr-alan"><span>Grup</span><select class="girdi" data-c="grup">${gl.map(g => `<option value="${e(g.id)}" ${g.id === v ? 'selected' : ''}>${e(g.ad || g.id)}</option>`).join('')}</select></label>`;
function cizelgeHtml() {
  const g = gruplar().find(x => x.id === durumC.grup) || {}, kisiler = sb(S.kursiyerler).filter(k => (k.teorikGrup || '') === durumC.grup && !k.kapali).sort((a, b) => tamAd(a).localeCompare(tamAd(b), 'tr'));
  const ders = grupDersleri(durumC.grup).filter(t => !durumC.bas || t.tarih >= durumC.bas).slice(0, durumC.sutun);
  const bosSutun = Math.max(0, durumC.sutun - ders.length), sayfalar = []; for (let i = 0; i < Math.max(1, kisiler.length); i += durumC.sayfa) sayfalar.push(kisiler.slice(i, i + durumC.sayfa));
  return `<div data-yatay>${sayfalar.map((l, j) => `<div style="${j ? 'page-break-before:always' : ''}">${BAS('KURSİYER YOKLAMA ÇİZELGESİ', (g.ad || '') + (sayfalar.length > 1 ? ` · sayfa ${j + 1}/${sayfalar.length}` : ''))}
    <table style="font-size:10.5px"><tr><th style="width:24px">#</th><th style="width:88px">T.C. kimlik no</th><th style="min-width:130px">Adı soyadı</th>${ders.map(t => `<th style="font-weight:400">${trT(t.tarih)}<br>${e(t.saat || '')} · ${e(String(t.konu || '').slice(0, 14))}</th>`).join('')}${Array.from({ length: bosSutun }, () => '<th style="font-weight:400">…/…/……</th>').join('')}</tr>
    ${l.map((k, i) => `<tr><td>${j * durumC.sayfa + i + 1}</td><td>${e(k.tc || '')}</td><td>${e(tamAd(k))}</td>${Array.from({ length: durumC.sutun }, () => '<td style="height:24px"></td>').join('')}</tr>`).join('') || `<tr><td colspan="${durumC.sutun + 3}">Bu grupta kursiyer yok</td></tr>`}
    <tr><td></td><td></td><td>Öğreticinin adı ve imzası</td>${Array.from({ length: durumC.sutun }, (_, i) => `<td style="height:30px;font-size:9.5px">${ders[i] ? e(ogretmenAd(ders[i].ogretmen)) : ''}</td>`).join('')}</tr></table></div>`).join('')}${NOT}</div>`;
}
function yoklamaCizelgesi() {
  const gl = gruplar(); if (!gl.length) return pencere({ baslik: 'Yoklama çizelgesi', icerik: '<p>Henüz teorik dersi olan grup yok.</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
  if (!gl.some(g => g.id === durumC.grup)) durumC.grup = gl[0].id;
  if (!durumC.bas) durumC.bas = gun(0);
  const ust = () => `<div class="vr-suzgec" style="margin-top:0">${grupSecimi(gl, durumC.grup)}<label class="vr-alan"><span>İlk ders</span><input class="girdi" type="date" data-c="bas" value="${e(durumC.bas)}"></label><label class="vr-alan"><span>Sütun (ders)</span><select class="girdi" data-c="sutun">${[4, 6, 8, 10, 12].map(n => `<option ${n === durumC.sutun ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="vr-alan"><span>Sayfa başına kursiyer</span><select class="girdi" data-c="sayfa">${[15, 20, 25, 30].map(n => `<option ${n === durumC.sayfa ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>`;
  pencere({
    baslik: 'Yoklama çizelgesi', genis: true,
    icerik: `<div data-c-ust>${ust()}</div><div style="background:var(--zemin);padding:14px;border-radius:8px;max-height:56vh;overflow:auto"><div class="a4" data-c-a4>${cizelgeHtml()}</div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-ana" data-c-yazdir>${ik('belge')}Yazdır / PDF</button>`,
    onAc(d) {
      d.addEventListener('change', ev => { const x = ev.target.closest('[data-c]'); if (!x) return; durumC[x.dataset.c] = ['sutun', 'sayfa'].includes(x.dataset.c) ? +x.value : x.value; d.querySelector('[data-c-a4]').innerHTML = cizelgeHtml(); });
      d.querySelector('[data-c-yazdir]').addEventListener('click', () => { belgeYazdir(cizelgeHtml(), 'Yoklama çizelgesi'); islem('Yoklama çizelgesini yazdırdı', (gl.find(g => g.id === durumC.grup) || {}).ad || ''); kaydet(); });
    },
  });
}
const DERS_HEDEF = [['Trafik ve Çevre', 16], ['İlk Yardım', 8], ['Araç Tekniği', 6], ['Trafik Adabı', 4]];
// konu adından ders (gruplar.js konuNo ile aynı mantık; Türkçe büyük İ için önce küçük harfe çevrilir)
const dersTuru = t => { const n = String(t.konu || '').toLocaleLowerCase('tr'); return /ilk ?yard/.test(n) ? 'İlk Yardım' : /araç|arac|motor|teknik/.test(n) ? 'Araç Tekniği' : /adab|adap/.test(n) ? 'Trafik Adabı' : 'Trafik ve Çevre'; };
function programHtml() {
  const g = gruplar().find(x => x.id === durumC.grup) || {}, l = grupDersleri(durumC.grup);
  const top = DERS_HEDEF.map(([ad, hedef]) => [ad, hedef, l.filter(t => dersTuru(t) === ad).reduce((a, t) => a + (+t.sure || 1), 0)]);
  return BAS('TEORİK DERS PROGRAMI', (g.ad || '') + (g.baslangic ? ' · ' + trT(g.baslangic) + ' başlangıç' : '')) + `<table style="font-size:11px"><tr><th style="width:26px">#</th><th>Tarih</th><th>Gün</th><th>Saat</th><th>Süre</th><th>Ders</th><th>Konu</th><th>Öğretici</th><th>Derslik</th></tr>
    ${l.map((t, i) => `<tr><td>${i + 1}</td><td>${trT(t.tarih)}</td><td>${GUN[new Date(t.tarih + 'T12:00').getDay()]}</td><td>${e(t.saat || '')}</td><td>${t.sure || 1} saat</td><td>${e(dersTuru(t))}</td><td>${e(t.konu || '')}</td><td>${e(ogretmenAd(t.ogretmen))}</td><td>${e(t.salon || g.derslik || '')}</td></tr>`).join('') || '<tr><td colspan="9">Bu gruba teorik ders girilmemiş</td></tr>'}</table>
    <p style="font-weight:700;margin:12px 0 4px">Ders başına saat</p><table style="font-size:11px;max-width:420px"><tr><th>Ders</th><th>Programda</th><th>Gereken</th></tr>${top.map(([ad, h, n]) => `<tr><td>${ad}</td><td>${n}</td><td>${h}${n < h ? ' <b>(' + (h - n) + ' eksik)</b>' : ''}</td></tr>`).join('')}<tr><td><b>Toplam</b></td><td><b>${top.reduce((a, x) => a + x[2], 0)}</b></td><td><b>34</b></td></tr></table>
    <p style="font-size:10.5px;margin-top:10px">MTSK Yön. md.12/4, 23/1: teorik program dönem başlamadan MEBBİS’e girilir; günde 2–6 saat teorik ders (md.16/4).</p>`;
}
function teorikProgram() {
  const gl = gruplar(); if (!gl.length) return pencere({ baslik: 'Teorik ders programı', icerik: '<p>Henüz teorik dersi olan grup yok.</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
  if (!gl.some(g => g.id === durumC.grup)) durumC.grup = gl[0].id;
  pencere({
    baslik: 'Teorik ders programı', genis: true,
    icerik: `<div class="vr-suzgec" style="margin-top:0">${grupSecimi(gl, durumC.grup)}</div><div style="background:var(--zemin);padding:14px;border-radius:8px;max-height:56vh;overflow:auto"><div class="a4" data-p-a4>${programHtml()}</div></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-p-excel>${ik('indir')}Excel</button><button class="dg dg-ana" data-p-yazdir>${ik('belge')}Yazdır / PDF</button>`,
    onAc(d) {
      d.addEventListener('change', ev => { const x = ev.target.closest('[data-c="grup"]'); if (!x) return; durumC.grup = x.value; d.querySelector('[data-p-a4]').innerHTML = programHtml(); });
      d.querySelector('[data-p-yazdir]').addEventListener('click', () => { belgeYazdir(programHtml(), 'Teorik ders programı'); islem('Teorik ders programını yazdırdı', (gl.find(g => g.id === durumC.grup) || {}).ad || ''); kaydet(); });
      d.querySelector('[data-p-excel]').addEventListener('click', () => csvIndir('teorik-program-' + durumC.grup + '.csv', [['Tarih', 'Saat', 'Süre', 'Ders', 'Konu', 'Öğretici', 'Derslik'], ...grupDersleri(durumC.grup).map(t => [t.tarih, t.saat || '', t.sure || 1, dersTuru(t), t.konu || '', ogretmenAd(t.ogretmen), t.salon || ''])]));
    },
  });
}
