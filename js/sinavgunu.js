// SNV-037..046, SNV-060, SNV-005: "Sınav günü" ekranı (#/sinav/<oturum>) — komisyonlar, saat dilimleri, satır alt sayfası, yazdır, süreler şeridi, kalanları aktar.
// Atama (SNV-040): s.atama = { [kursiyerId]: { kom, saat, plaka, egitmen, elle } } yalnız elle değiştirilenleri tutar; ötekiler her açılışta yeniden hesaplanır.
import { ulusalSinav, aracUygun, S, kaydet, gun, fark, tamAd, kursiyer, egitmen, arac, SINIFLAR, hakDurumu, islem, oturum, kuralAyar, mebIsGunuGeri, tcMaskele, izinDurumu } from './veri.js?v=235';
import { e, ik, rozet, avatar, tarih, tarihUzun, pencere, kapatPencere, bildir, bos, isaret, belgeYazdir, onaySor } from './ui.js?v=235';
import * as KR from './kurallar.js?v=235';
import * as MEB from './eklenti.js?v=235';

// SNV-041: dilimler 40 dk + 5 dk ara, öğle arası 12:10–13:00 (mebtoplu.js'teki MEBBİS randevu dilimleriyle aynı)
export const SINAV_SAATLERI = ['08:30', '09:15', '10:00', '10:45', '11:30', '13:00', '13:45', '14:30', '15:15', '16:00'];
// sınıf grupları (MTSK Yön. md.31/1-d; SOR-042): B grubu araçta, C/D grubu takip aracına geçerek, motosiklet ve B1/F takip aracında yapılır; aynı komisyona girmez
const GRUP = { moto: /^(M|A1|A2|A|B1|F)$/, agir: /^(C1?E?|D1?E?|CE|DE)$/ }, GRUP_AD = { oto: 'Otomobil', agir: 'Kamyon ve otobüs', moto: 'Motosiklet' };
const grupOf = k => GRUP.moto.test(k.sinif) ? 'moto' : GRUP.agir.test(k.sinif) ? 'agir' : 'oto';
const sinavAraci = k => { const d = (S.dersler || []).filter(x => x.kursiyer === k.id && x.arac).sort((a, b) => b.tarih.localeCompare(a.tarih))[0]; return arac(d && d.arac) || (S.araclar || []).find(a => a.egitmen === k.egitmen) || null; };
// SNV-040: sınıf grubuna göre (motosiklet ayrı komisyonda), elle olanlar yerinde, sonra usta, sonra ad; komisyonBoy'luk komisyonlar; komisyon içinde dilim; aynı araç aynı saatte iki komisyonda olamaz
export function sinavAtamasi(s) {
  const at = s.atama || {}, boy = kuralAyar('komisyonBoy'), ks = (s.kursiyerler || []).map(kursiyer).filter(Boolean), l = [];
  // elle komisyonu verilenler yerinde; kalanlar grup grup (otomobil, motosiklet) usta ve ad sırasıyla komisyonBoy'luk komisyonlara
  const elle = k => at[k.id] && at[k.id].elle && at[k.id].kom;
  ks.filter(elle).forEach(k => l.push({ k, kom: +at[k.id].kom, grup: grupOf(k) }));
  let kom = 0;
  ['oto', 'agir', 'moto'].forEach(g => {
    const grup = ks.filter(k => !elle(k) && grupOf(k) === g).sort((a, b) => String(a.egitmen || '').localeCompare(String(b.egitmen || '')) || tamAd(a).localeCompare(tamAd(b), 'tr'));
    for (let i = 0; i < grup.length; i += boy) { kom++; grup.slice(i, i + boy).forEach(k => l.push({ k, kom, grup: g })); }
  });
  // önce saati sabit olanlar (MEBBİS'te doğrulanmış randevu, elle verilen saat), sonra kalanlar boş dilimlere
  const dolu = new Map(), komSaat = {}, md = S.mebDurum || {};
  l.sort((a, b) => a.kom - b.kom).forEach(x => { const a = at[x.k.id] || {}, ar = a.plaka ? { plaka: a.plaka } : sinavAraci(x.k), v = md['sinav-' + s.id + '-' + x.k.id];
    x.plaka = ar ? ar.plaka : ''; x.eg = egitmen(a.egitmen) || KR.sinavUstasi(x.k); x.elle = !!a.elle;
    x.mebSaat = v && v.durum === 'tamam' && /^\d{2}:\d{2}$/.test(v.saat || '') ? v.saat : ''; x.meb = !!x.mebSaat; x.sabit = x.mebSaat || (a.elle && a.saat) || ''; });
  // çakışan iki aday da işaretlenir
  const yerles = (x, saat) => { const ks = komSaat[x.kom] = komSaat[x.kom] || new Map(), a = x.plaka + '|' + saat;
    x.saat = saat || ''; if (!saat) return;
    if (ks.has(saat)) { x.ciftSaat = true; ks.get(saat).ciftSaat = true; } else ks.set(saat, x);
    if (x.plaka) { if (dolu.has(a)) { x.cakisma = true; dolu.get(a).cakisma = true; } else dolu.set(a, x); } };
  l.filter(x => x.sabit).forEach(x => yerles(x, x.sabit));
  l.filter(x => !x.sabit).forEach(x => { const ks = komSaat[x.kom] || new Map(); yerles(x, SINAV_SAATLERI.find(t => !ks.has(t) && !(x.plaka && dolu.has(x.plaka + '|' + t)))); });
  return l;
}
// SNV-046: o3 (sınav hatırlatması) ve o18 (saat kesinleşti) bu oturum için; gidenler S.zamanli.gonderilen anahtarlarından
function otoSatiri(s) {
  const o = id => (S.otomasyonlar || []).find(x => x.id === id), g = (S.zamanli || {}).gonderilen || {}, say = on => Object.keys(g).filter(a => a.startsWith(on + '|' + s.id + '|')).map(a => a.split('|')[2]);
  const o3 = o('o3'), o18 = o('o18'), n3 = new Set(say('o3')).size, n18 = new Set(say('o18')).size;
  const p = (x, ad, n, ek) => x ? `<span>${rozet(x.acik ? 'açık' : 'kapalı', x.acik ? 'yesil' : 'notr')} ${ad}${n ? ` · ${n} adaya gitti` : ek ? ' · ' + ek : ''}</span>` : '';
  return `<div class="sgn-oto">${p(o3, 'Sınav hatırlatması', n3, '3 ve 1 gün önce')}${s.tur === 'Direksiyon' ? p(o18, 'Saat kesinleşti', n18, 'MEBBİS randevusu doğrulanınca') : ''}<a href="#/mesajlar/oto">Otomatik mesajlar</a></div>`;
}
// SNV-038: süreler şeridi — ücret yatırma, MEBBİS son giriş, ilçe MEM onayı (MEB iş günüyle)
function sureler(s) {
  const cip = (ad, t) => { const f = fark(t), ton = f < 0 ? 'kirmizi' : f === 0 || mebIsGunuGeri(t, 1) <= gun(0) ? 'uyari' : 'notr'; return rozet(`${ad} · ${f === 0 ? 'bugün' : tarih(t)}`, ton); };
  return `<div class="sgn-sureler">${cip('Ücret yatırma', mebIsGunuGeri(s.tarih, kuralAyar('sinavUcretIsGunu')))}${cip('MEBBİS’e son giriş', mebIsGunuGeri(s.tarih, kuralAyar('sinavBildirimIsGunu')))}${cip('İlçe MEM onayı', mebIsGunuGeri(s.tarih, kuralAyar('memOnayIsGunu')))}</div>`;
}
function mebDugme(s) {
  let ids = []; try { ids = s.tur === 'Direksiyon' && fark(s.tarih) >= 0 && MEB ? MEB.mebIsleri().filter(x => x.tur === 'sinav' && x.ref.sinav === s.id).map(x => x.id) : []; } catch (x) { }
  return ids.length ? `<button class="dg dg-ana dg-kucuk" data-meb-gonder="${ids.join(',')}">MEBBİS’e bildir (${ids.length})</button>` : `<a class="dg dg-hafif dg-kucuk" href="#/meb">MEBBİS işleri</a>`;
}
function satir(s, x) {
  const { k, eg } = x, dir = s.tur === 'Direksiyon', h = hakDurumu(k, s.tur), sonuc = (s.sonuc || {})[k.id], tn = kuralAyar('telafiSaat'), r = [];
  if (dir && eg && !sonuc) { const d = izinDurumu(eg, s.tarih), izin = (S.izinler || []).find(i => i.kim === eg.id && i.bas <= s.tarih && (i.bit || i.bas) >= s.tarih);
    if (d.tur === 'bitti') r.push(rozet(`Çalışma izni ${tarih(d.bit)} bitti — sınava giremez`, 'kirmizi')); else if (d.kalan != null && d.kalan <= 15) r.push(rozet(`İzni ${tarih(d.bit)} bitiyor`, 'uyari'));
    if (izin) r.push(rozet('Usta o gün izinli', 'uyari')); }
  if (dir) { if (!x.saat) r.push(rozet('Boş saat kalmadı', 'kirmizi')); else { if (x.cakisma) r.push(rozet('Araç çakışıyor', 'kirmizi')); if (x.ciftSaat) r.push(rozet('Komisyonda bu saatte başka aday var', 'kirmizi')); }
    if (x.meb) r.push(rozet('MEBBİS randevusu', 'yesil')); }
  const t = dir && !sonuc ? KR.telafiDurumu(k, s.tarih) : {};
  if (t.gerekli) r.push(rozet(`Telafi ${Math.min(t.yapildi, tn)}/${tn}${t.yapildi >= tn ? ' ✓' : ''}${t.planli ? ` (${t.planli} planlı)` : ''}${t.mebSayi != null && t.mebSayi !== t.yapildi ? ` · MEBBİS’te ${t.mebSayi}` : ''}`, t.yapildi >= tn ? 'yesil' : 'uyari'));
  const ek = !sonuc && ((k.odeme || {}).ekler || []).find(y => y.sinav === s.id); if (ek) r.push(rozet(ek.odendi ? 'Ücret ödendi' : 'Ücret ödenmedi', ek.odendi ? 'yesil' : 'kirmizi'));
  const md = (S.mebDurum || {})['sinav-' + s.id + '-' + k.id]; if (dir && !sonuc) r.push(md && md.durum === 'tamam' ? rozet('MEBBİS’e yazıldı', 'yesil') : rozet('MEBBİS bekliyor', 'notr'));
  if (!sonuc && !h.kalan && !h.gecti) r.push(rozet('hakkı dolu', 'kirmizi'));
  const hakMetni = sonuc || h.gecti ? '' : `${h.siradaki || h.sinir}. hak`;
  const alt = dir ? [eg ? e(eg.ad) + (eg.calismaIzinNo || eg.izinNo ? ' · izin ' + e(eg.calismaIzinNo || eg.izinNo) : '') : 'usta yok', x.plaka ? e(x.plaka) : 'araç yok', hakMetni] : [k.tc ? e(tcMaskele(k.tc)) : '', hakMetni];
  return `<li class="sgn-satir${dir ? ' sgn-tik' : ''}" ${dir ? `data-sg-aday="${k.id}" tabindex="0" aria-label="${e(tamAd(k))} · atamayı değiştir"` : ''}><span class="sgn-saat ${x.elle ? 'elle' : ''}">${e(x.saat || '—')}</span>${avatar(k.ad, k.soyad, k.foto)}<div style="flex:1;min-width:0"><b>${e(tamAd(k))}</b> ${rozet(((SINIFLAR[k.sinif] || {}).ad || k.sinif).split(' ·')[0])}${sonuc ? ' ' + rozet(sonuc, sonuc === 'Geçti' ? 'yesil' : 'kirmizi') : ''}
    <small>${alt.filter(Boolean).join(' · ')}</small>${r.length ? `<span class="sgn-rozet">${r.join('')}</span>` : ''}</div>${dir ? '' : `<a class="dg dg-hafif dg-kucuk" href="#/kursiyer/${k.id}">Dosya</a>`}</li>`;
}
export function sinavGunu(id) {
  const s = (S.sinavlar || []).find(x => x.id === id);
  if (!s) return { baslik: 'Sınav günü', html: `<a class="dg dg-hafif" href="#/sinavlar">${ik('sol')}Sınavlar</a><div class="kart">${bos('Oturum bulunamadı', 'Silinmiş ya da başka şubede olabilir.')}</div>` };
  const es = s.tur === 'e-Sınav', l = es ? (s.kursiyerler || []).map(kursiyer).filter(Boolean).map((k, i) => ({ k, kom: 1, saat: s.saat, plaka: '', eg: egitmen(k.egitmen) })) : sinavAtamasi(s);
  const koms = [...new Set(l.map(x => x.kom))].sort((a, b) => a - b), bekleyen = l.filter(x => !(s.sonuc || {})[x.k.id]).length, sonucVar = Object.keys(s.sonuc || {}).length;
  const dagilim = Object.entries(l.reduce((o, x) => { const c = ((SINIFLAR[x.k.sinif] || {}).ad || x.k.sinif).split(' ·')[0]; o[c] = (o[c] || 0) + 1; return o; }, {})).map(([c, n]) => `${c} ${n}`).join(' · ');
  const kalanlar = sonucVar ? l.filter(x => ['Kaldı', 'Girmedi'].includes((s.sonuc || {})[x.k.id])) : [];
  return { baslik: s.tur + ' sınavı · ' + tarih(s.tarih), alt: 'Sınav günü',
    html: `<a class="dg dg-hafif" href="#/sinavlar" style="margin:-6px 0 10px -8px">${ik('sol')}Sınavlar</a>
    <div class="kart sgn-ust"><div class="kart-govde"><div class="sgn-baslik"><b>${tarihUzun(s.tarih)}</b><span>${e(s.saat || '')} · ${e(s.yer || '')}</span></div>
      <p class="sgn-ozet">${!l.length ? 'Henüz aday yok' : l.length + ' aday'}${!es && l.length ? ` · ${koms.length} komisyon (${koms.map(c => l.filter(x => x.kom === c).length).join(' + ')})` : ''}${bekleyen && fark(s.tarih) <= 0 ? ` · ${bekleyen} sonuç bekliyor` : ''}</p>
      ${dagilim ? `<p class="sgn-dagilim">${e(dagilim)}</p>` : ''}${!es && fark(s.tarih) >= 0 && l.length ? `<span class="rg-cipler">${KR.randevuGrubu(s).map(g => `<span class="rg-cip ${g.n >= kuralAyar('randevuEnAz') ? 'tamam' : 'eksik'}">${e(g.sinif)} · ${g.n} aday${g.n < kuralAyar('randevuEnAz') ? ' · en az ' + kuralAyar('randevuEnAz') : ''}</span>`).join('')}</span>` : ''}${ulusalSinav(s.tarih) ? `<p class="ipucu" style="margin-top:10px">${isaret('uyari', 18)}<span>Aynı gün ulusal sınav var (${e(ulusalSinav(s.tarih))}); bu günlerde MTSK sınavı planlanmaz. Tarihi ilçe MEM ile doğrulayın.</span></p>` : ''}${!es && fark(s.tarih) >= 0 ? sureler(s) : ''}${fark(s.tarih) >= 0 ? otoSatiri(s) : ''}
      <div class="sgn-dugmeler">${fark(s.tarih) <= 0 && bekleyen ? `<button class="dg dg-ana dg-kucuk" data-sg-sonuc>Sonuçları gir</button>` : ''}${fark(s.tarih) >= 0 ? `<button class="dg dg-cizgi dg-kucuk" data-sg-ekle>${ik('arti')}Kursiyer ekle</button>${l.length ? `<button class="dg dg-wp dg-kucuk" data-sg-hatir>${ik('wp')}Hepsine hatırlat</button>` : ''}` : ''}${l.length ? `<button class="dg dg-cizgi dg-kucuk" data-sg-yazdir>${ik('belge')}Yazdır</button>` : ''}${!es && l.length ? `<button class="dg dg-cizgi dg-kucuk" data-sg-komisyon>${ik('indir')}Komisyon listesi</button>` : ''}${mebDugme(s)}</div></div></div>
    ${l.length ? koms.map(c => { const x = l.filter(y => y.kom === c); return `<div class="kart sgn-kom"><div class="kart-bas"><h3>${es ? 'Adaylar' : c + '. komisyon'}</h3><small>${x.length} aday${!es ? ' · ' + (new Set(x.map(y => y.grup)).size > 1 ? 'karışık sınıf grubu' : GRUP_AD[x[0].grup]) : ''}</small>${!es && new Set(x.map(y => y.grup)).size > 1 ? `<div class="sag">${rozet('Sınıf grupları ayrı komisyonda olmalı', 'kirmizi')}</div>` : ''}</div><ul class="liste">${x.sort((a, b) => String(a.saat).localeCompare(String(b.saat))).map(y => satir(s, y)).join('')}</ul></div>`; }).join('') : `<div class="kart">${bos('Bu oturumda aday yok', 'Kursiyer ekle ya da Sınava girecekler’den yazın.')}</div>`}
    ${kalanlar.length ? kalanlarHtml(s, kalanlar) : ''}`,
    baglan(kap) { baglan(kap, s); } };
}
// SNV-005: Kalanlar (N) — hedef gelecek oturum, uygunluk; hakkı dolan aktarılmaz
function kalanlarHtml(s, l) {
  const ot = (S.sinavlar || []).filter(x => x.tur === s.tur && x.id !== s.id && x.tarih >= gun(0)).sort((a, b) => a.tarih.localeCompare(b.tarih));
  return `<div class="kart sgn-kalan" data-sg-kalanlar><div class="kart-bas"><h3>Kalanlar (${l.length})</h3><small>Kalan ve girmeyen adaylar başka sınava aktarılır</small></div><div class="kart-govde">
    ${ot.length ? `<label class="vr-alan" style="max-width:320px"><span>Hedef oturum</span><select class="girdi" data-sg-hedef>${ot.map(x => `<option value="${x.id}">${tarihUzun(x.tarih)} · ${(x.kursiyerler || []).length} yazılı</option>`).join('')}</select></label><div data-sg-kalan-liste></div><button class="dg dg-ana dg-kucuk" data-sg-aktar style="margin-top:8px">Seçilenleri aktar</button>` : `<p class="ipucu">${isaret('bilgi', 18)}<span>Gelecekte ${e(s.tur)} oturumu yok; önce oturum açın.</span></p>`}</div></div>`;
}
function kalanListesi(kap, s) {
  const yer = kap.querySelector('[data-sg-kalan-liste]'), sel = kap.querySelector('[data-sg-hedef]'); if (!yer || !sel) return;
  const hedef = S.sinavlar.find(x => x.id === sel.value), l = (s.kursiyerler || []).filter(id => ['Kaldı', 'Girmedi'].includes((s.sonuc || {})[id])).map(kursiyer).filter(Boolean);
  yer.innerHTML = `<ul class="liste">${l.map(k => { const h = hakDurumu(k, s.tur); if (!h.kalan) return `<li><span style="flex:1"><b>${e(tamAd(k))}</b><small style="display:block;color:var(--kirmizi)">Hakkı doldu</small></span><a class="dg dg-cizgi dg-kucuk" href="#/kursiyer/${k.id}">İkinci dört hak · karar ver</a></li>`;
    const zaten = (hedef.kursiyerler || []).includes(k.id), u = s.tur === 'Direksiyon' ? KR.sinavaUygunluk(k, hedef) : { uygun: true, engel: [], uyari: [] }, ac = u.uygun && !zaten;
    const gec = (u.uyari || []).find(x => /son giriş/i.test(x)), metin = zaten ? 'Bu oturuma zaten yazılı' : !u.uygun ? u.engel.join(' · ') : gec ? gec : h.cumle;
    return `<li class="${ac && !gec ? '' : 'sinav-uygun-degil'}"><label style="display:flex;gap:10px;flex:1;min-width:0"><input type="checkbox" data-sg-kalan="${k.id}" ${ac ? (gec ? '' : 'checked') : 'disabled'}><span><b>${e(tamAd(k))}</b><small style="display:block;color:${ac && !gec ? 'var(--soluk)' : 'var(--kirmizi)'}">${e(metin)}</small></span></label>${u.engel.some(x => /Başarısız aday eğitimi/.test(x)) ? `<button class="dg dg-cizgi dg-kucuk" data-sg-ekders="${k.id}">Telafi dersi öner</button>` : ''}</li>`; }).join('')}</ul>`;
}
// SNV-043: satıra dokununca alt sayfa — komisyon, saat, araç, usta; Sınavdan çıkar (yalnız s.atama'ya yazılır)
function satirSayfasi(s, k, yenile) {
  const l = sinavAtamasi(s), x = l.find(y => y.k.id === k.id) || {}, koms = [...new Set(l.map(y => y.kom))].sort((a, b) => a - b);
  pencere({ baslik: tamAd(k) + ' · sınav günü', icerik: `<form class="form-izgara" id="f-sg">
      <div class="alan"><label for="sg-k">Komisyon</label><select id="sg-k" name="kom" class="girdi">${[...koms, koms.length + 1].map(c => `<option value="${c}" ${c === x.kom ? 'selected' : ''}>${c}. komisyon</option>`).join('')}</select></div>
      <div class="alan"><label for="sg-s">Saat</label><select id="sg-s" name="saat" class="girdi">${SINAV_SAATLERI.map(t => `<option ${t === x.saat ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="alan"><label for="sg-a">Araç</label><select id="sg-a" name="plaka" class="girdi">${(() => { const l = (S.araclar || []).filter(a => !a.pasif), uy = l.filter(a => aracUygun(a, k.sinif)), di = l.filter(a => !aracUygun(a, k.sinif)), op = a => `<option value="${e(a.plaka)}" ${a.plaka === x.plaka ? 'selected' : ''}>${e(a.plaka)} · ${e(a.sinif || '')}${a.model ? ' · ' + e(a.model) : ''}</option>`;
        return `<optgroup label="${e(k.sinif)} sınıfına uygun">${uy.map(op).join('')}</optgroup>${di.length ? `<optgroup label="Diğer araçlar">${di.map(op).join('')}</optgroup>` : ''}`; })()}</select></div>
      <div class="alan"><label for="sg-u">Usta öğretici</label><select id="sg-u" name="eg" class="girdi">${(S.egitmenler || []).filter(y => !y.ayrildi).map(y => `<option value="${e(y.id)}" ${x.eg && y.id === x.eg.id ? 'selected' : ''}>${e(y.ad)}</option>`).join('')}</select></div>
      <p class="alan tam" style="font-size:13px;color:var(--soluk)">Değişiklik yalnız bu sınavın atamasına yazılır; öğrencinin genel kaydı değişmez. Elle değiştirilen aday yeniden hesaplamada yerinde kalır.</p></form>`,
    altlik: `<button class="dg dg-hafif" data-sg-cikar style="margin-right:auto;color:var(--kirmizi)">Sınavdan çıkar</button>${x.elle ? '<button class="dg dg-cizgi" data-sg-sifirla>Kendiliğinden ata</button>' : ''}<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-sg-kaydet>Kaydet</button>`,
    onAc(p) { const f = p.querySelector('#f-sg');
      p.querySelector('[data-sg-kaydet]').addEventListener('click', () => { s.atama = { ...(s.atama || {}), [k.id]: { kom: +f.kom.value, saat: f.saat.value, plaka: f.plaka.value, egitmen: f.eg.value, elle: true } }; islem('Sınav gününde atamayı değiştirdi', `${tamAd(k)} · ${tarih(s.tarih)} · ${f.kom.value}. komisyon ${f.saat.value} · ${f.plaka.value}`); kaydet(); kapatPencere(); yenile(); });
      const sf = p.querySelector('[data-sg-sifirla]'); if (sf) sf.addEventListener('click', () => { const a = { ...(s.atama || {}) }; delete a[k.id]; s.atama = a; kaydet(); kapatPencere(); yenile(); });
      p.querySelector('[data-sg-cikar]').addEventListener('click', async () => { if (!(await onaySor(tamAd(k) + ' bu sınavdan çıkarılsın mı?', { baslik: 'Sınavdan çıkar', evet: 'Çıkar', tehlike: true }))) return; s.kursiyerler = s.kursiyerler.filter(i => i !== k.id); const a = { ...(s.atama || {}) }; delete a[k.id]; s.atama = a; if (k.dsinavPlan === s.tarih) delete k.dsinavPlan; if (k.odeme && k.odeme.ekler) k.odeme.ekler = k.odeme.ekler.filter(y => !(y.sinav === s.id && !y.odendi)); islem('Sınavdan çıkardı', tamAd(k) + ' · ' + s.tur + ' ' + tarih(s.tarih)); kaydet(); kapatPencere(); yenile(); });
    } });
}
// SNV-045: A4, komisyon başına bölüm; T.C. maskeli
function yazdir(s) {
  const l = s.tur === 'e-Sınav' ? (s.kursiyerler || []).map(kursiyer).filter(Boolean).map(k => ({ k, kom: 1, saat: s.saat, plaka: '', eg: egitmen(k.egitmen) })) : sinavAtamasi(s), koms = [...new Set(l.map(x => x.kom))].sort((a, b) => a - b);
  belgeYazdir(`<h1>${e(s.tur)} sınavı · ${tarihUzun(s.tarih)}</h1><p class="a4-alt">${e(S.kurs.ad || '')} · ${e(s.yer || '')} · ${l.length} aday</p>
    ${koms.map(c => `<h2 style="font-size:15px;margin:14px 0 6px">${s.tur === 'e-Sınav' ? 'Adaylar' : c + '. komisyon'}</h2><table><tr><th>Sıra</th><th>Saat</th><th>Ad soyad</th><th>T.C.</th><th>Sınıf</th><th>Usta</th><th>Plaka</th><th style="width:110px">İmza</th></tr>${l.filter(x => x.kom === c).sort((a, b) => String(a.saat).localeCompare(String(b.saat))).map((x, i) => `<tr><td>${i + 1}</td><td>${e(x.saat || '')}</td><td>${e(tamAd(x.k))}</td><td>${e(tcMaskele(x.k.tc || ''))}</td><td>${e(((SINIFLAR[x.k.sinif] || {}).ad || x.k.sinif).split(' ·')[0])}</td><td>${e(x.eg ? x.eg.ad : '')}</td><td>${e(x.plaka || '')}</td><td></td></tr>`).join('')}</table>`).join('')}`, `${s.tur} sınavı · ${tarih(s.tarih)}`);
}
function baglan(kap, s) {
  const yenile = () => import('./app.js?v=235').then(m => m.yenile());
  kalanListesi(kap, s);
  kap.addEventListener('change', ev => { if (ev.target.closest('[data-sg-hedef]')) kalanListesi(kap, s); });
  kap.addEventListener('click', async ev => { const t = ev.target;
    const sa = t.closest('[data-sg-aday]'); if (sa && !t.closest('a,button') && s.tur === 'Direksiyon') return satirSayfasi(s, kursiyer(sa.dataset.sgAday), yenile);
    if (t.closest('[data-sg-yazdir]')) return yazdir(s);
    if (t.closest('[data-sg-komisyon]')) return (await import('./komisyon.js?v=235')).komisyonPenceresi(s);
    const ed = t.closest('[data-sg-ekders]'); if (ed) return (await import('./sayfalar1.js?v=235')).ekDersOner(kursiyer(ed.dataset.sgEkders), yenile);
    if (t.closest('[data-sg-sonuc]')) return (await import('./sayfalar2.js?v=235')).sonucGir(s);
    if (t.closest('[data-sg-ekle]')) return (await import('./sayfalar2.js?v=235')).sinavaEkle(s);
    if (t.closest('[data-sg-hatir]')) return (await import('./sayfalar2.js?v=235')).sinavHatirlat(s);
    if (t.closest('[data-sg-aktar]')) { const hedef = S.sinavlar.find(x => x.id === kap.querySelector('[data-sg-hedef]').value), ids = [...kap.querySelectorAll('[data-sg-kalan]:checked:not(:disabled)')].map(x => x.dataset.sgKalan);
      if (!ids.length) return bildir('Aktarılacak aday seçin', 'uyari'); const S2 = await import('./sayfalar2.js?v=235');
      hedef.kursiyerler.push(...ids); ids.map(kursiyer).forEach(k => { if (hedef.tur === 'Direksiyon') k.dsinavPlan = hedef.tarih; S2.sinavUcreti(k, hedef); });
      islem('Kalanları aktardı', `${s.tur} ${tarih(s.tarih)} → ${tarih(hedef.tarih)} · ${ids.map(kursiyer).map(tamAd).join(', ')}`); kaydet(); bildir(`${ids.length} aday ${tarih(hedef.tarih)} sınavına aktarıldı`); return yenile(); }
  });
  kap.addEventListener('keydown', ev => { const sa = ev.target.closest('[data-sg-aday]'); if (sa && ev.key === 'Enter' && s.tur === 'Direksiyon') satirSayfasi(s, kursiyer(sa.dataset.sgAday), () => import('./app.js?v=235').then(m => m.yenile())); });
}

// SNV-041: kursun uygulama sınavı günleri (ilçe MEM'in verdiği; MTSKY 28/2-3: hafta sonu). S.kurs.sinavGunleri = ['YYYY-AA-GG', …]
export const sinavGunleri = (hepsi = false) => (((S.kurs || {}).sinavGunleri) || []).filter(t => hepsi || t >= gun(0)).sort();
export function gunlerKarti() {
  const l = sinavGunleri(), dolu = t => (S.sinavlar || []).find(s => s.tur === 'Direksiyon' && s.tarih === t);
  return `<div class="kart sgn-gunler" style="margin-bottom:16px"><div class="kart-bas"><h3>Uygulama sınavı günleri</h3><small>İlçe MEM’in verdiği günler · hafta sonu · oturum açarken ve ilk uygun sınav hesabında kullanılır</small></div>
    <div class="kart-govde"><div class="sgn-gun-cipler">${l.map(t => { const o = dolu(t); return `<span class="sgn-gun-cip">${o ? `<a href="#/sinav/${o.id}">${e(tarih(t))} · ${(o.kursiyerler || []).length} aday</a>` : `<span>${e(tarih(t))}${ulusalSinav(t) ? ` <b style="color:var(--kirmizi)" title="Ulusal sınav günü">· ${e(ulusalSinav(t))}</b>` : ''}</span><button class="sgn-gun-ac" data-sg-gun-ac="${t}" title="Bu güne oturum aç">Oturum aç</button>`}<button class="sgn-gun-sil" data-sg-gun-sil="${t}" aria-label="${e(tarih(t))} sil">×</button></span>`; }).join('') || '<small style="color:var(--soluk)">Gün tanımlanmadı. Tanımlanana kadar ilk uygun sınav Cumartesiye göre hesaplanır.</small>'}</div>
      <form data-sg-gun-ekle style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:12px"><label class="vr-alan"><span>Gün ekle</span><input class="girdi" type="date" name="t" min="${gun(0)}" required></label><button class="dg dg-cizgi dg-kucuk" type="submit">${ik('arti')}Ekle</button></form></div></div>`;
}
export function gunlerBagla(kap) {
  const yenile = () => import('./app.js?v=235').then(m => m.yenile());
  const f = kap.querySelector('[data-sg-gun-ekle]');
  if (f) f.addEventListener('submit', ev => { ev.preventDefault(); const t = f.t.value; if (!t) return; const l = sinavGunleri(true);
    if (l.includes(t)) return bildir('Bu gün zaten ekli', 'uyari');
    const us = ulusalSinav(t); if (us && f.dataset.onay !== 'u' + t) { f.dataset.onay = 'u' + t; return bildir(`${tarihUzun(t)} ulusal sınav günü (${us}); bu günlerde MTSK sınavı planlanmaz. İlçe MEM yine de verdiyse yeniden “Ekle”ye basın.`, 'uyari'); }
    const g = new Date(t + 'T12:00').getDay(); if (g !== 0 && g !== 6 && f.dataset.onay !== t) { f.dataset.onay = t; return bildir('Uygulama sınavı hafta sonu yapılır (MTSKY 28/3). İlçe MEM bu günü verdiyse yeniden “Ekle”ye basın.', 'uyari'); }
    S.kurs.sinavGunleri = [...l, t].sort(); islem('Uygulama sınavı günü ekledi', tarih(t)); kaydet(); bildir(tarihUzun(t) + ' eklendi'); yenile(); });
  kap.addEventListener('click', ev => { const sl = ev.target.closest('[data-sg-gun-sil]'), ac = ev.target.closest('[data-sg-gun-ac]');
    if (sl) { const t = sl.dataset.sgGunSil; S.kurs.sinavGunleri = sinavGunleri(true).filter(x => x !== t); islem('Uygulama sınavı gününü sildi', tarih(t)); kaydet(); yenile(); }
    if (ac) { const t = ac.dataset.sgGunAc, son = (S.sinavlar || []).filter(x => x.tur === 'Direksiyon' && x.yer).sort((a, b) => b.tarih.localeCompare(a.tarih))[0];
      const s = { id: 's' + Date.now(), tur: 'Direksiyon', tarih: t, saat: '08:30', yer: son ? son.yer : 'Uygulama sınav alanı', kursiyerler: [], sonuc: {} };
      S.sinavlar.push(s); islem('Sınav oturumu açtı', 'Direksiyon · ' + tarih(t)); kaydet(); bildir(tarihUzun(t) + ' uygulama sınavı oturumu açıldı'); location.hash = '#/sinav/' + s.id; } });
}
// SNV-005: sonuç girildikten sonra kalanlar bölümüne (eski "Kalanlar için sonraki adım" penceresinin yerine)
export function kalanlaraGit(s) {
  // sayfa çizilip üste kaydırıldıktan sonra bölüme in (en çok 3 sn bekler)
  const git = (n = 0) => { const b = document.querySelector('[data-sg-kalanlar]'); if (b && n > 1) return b.scrollIntoView({ block: 'start' }); if (n < 20) setTimeout(() => git(n + 1), 150); };
  if (location.hash !== '#/sinav/' + s.id) location.hash = '#/sinav/' + s.id; git();
}
