// PAR-055: banka ekstresi (CSV / Excel) içe aktarma ve ödeme koduyla eşleştirme.
// Gelen havaleler okunur; açıklamada öğrencinin ödeme kodu (veri.js odemeKodu, "MD" + 5 harf) ya da TC kimlik numarası varsa öğrenci bulunur.
// Eşleşen satırlar tahsilat taslağıdır: müdür ya da ön büro işaretleyip onaylar; tahsilat açık taksitlere vade sırasıyla dağılır (tahsilAl ile aynı kural),
// seçilen banka hesabına (h.hesap) yazılır. Aynı ekstre satırı ikinci kez işlenmez (h.ekstre anahtarı). Eşleşmeyenler listede kalır, elle işlenir.
import { S, kaydet, gun, kursiyer, tamAd, odemeKodu, tutarOku, islem, geriAlNoktasi, bankaHesaplari, varsayilanHesap, makbuzNoVer, kalanBorc } from './veri.js?v=235';
import { e, tl, rozet, tarih, pencere, kapatPencere, bildir, isaret } from './ui.js?v=235';

const sade = s => String(s ?? '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '');
const anahtar = r => [r.tarih, r.tutar, sade(r.aciklama).slice(0, 60)].join('|');
const acik = k => (k.odeme.taksitler || []).map((t, i) => ({ t, i })).filter(x => !x.t.odendi && !x.t.iptal).sort((a, b) => String(a.t.vade).localeCompare(b.t.vade));
const kalanT = t => (+t.tutar || 0) - (t.kismi || 0);

// Tablo → satırlar: başlıkta tarih, açıklama ve tutar (ya da alacak) sütunu aranır; gelen para (pozitif / alacak) alınır
export function ekstreSatirlari(tablo, tarihCoz) {
  const bi = tablo.findIndex(r => r.some(c => /tarih/.test(sade(c))) && r.some(c => /aciklama|detay|islem/.test(sade(c))) && r.some(c => /tutar|alacak|miktar/.test(sade(c))));
  if (bi < 0) return { hata: 'Başlık satırı bulunamadı: Tarih, Açıklama ve Tutar (ya da Alacak) sütunları gerekli' };
  const b = tablo[bi].map(sade), col = re => b.findIndex(c => re.test(c));
  const ti = col(/tarih/), ai = col(/aciklama|detay|islem/), ali = col(/alacak/), tu = col(/^tutar|islemtutari|miktar/), bo = col(/borc/);
  const l = [];
  tablo.slice(bi + 1).forEach(r => {
    const t = tarihCoz(r[ti]); if (!t) return;
    let v = ali >= 0 ? tutarOku(r[ali]) : tutarOku(String(r[tu] || '').replace(/^\+/, ''));
    if (ali < 0 && /^-/.test(String(r[tu] || '').trim())) return;  // giden para
    if (ali >= 0 && bo >= 0 && tutarOku(r[bo])) return;
    if (!v || v <= 0) return;
    l.push({ tarih: t, aciklama: String(r[ai] || '').trim(), tutar: Math.round(v * 100) / 100 });
  });
  return { l };
}
export function eslestir(r) {
  const ust = String(r.aciklama).toLocaleUpperCase('tr').replace(/İ/g, 'I'), kod = (ust.match(/MD[A-Z0-9]{5}/) || [])[0], tc = (String(r.aciklama).match(/\b[1-9]\d{10}\b/) || [])[0];
  const l = (S.kursiyerler || []).filter(k => !k.kapali);
  const k = (kod && l.find(x => odemeKodu(x) === kod)) || (tc && l.find(x => String(x.tc) === tc)) || null;
  return { k, neden: k ? (kod && odemeKodu(k) === kod ? 'ödeme kodu ' + kod : 'TC') : '' };
}
const islendi = () => new Set((S.hareket || []).filter(h => h.ekstre).map(h => h.ekstre));

export function ekstrePenceresi(satirlar, sonra) {
  const ise = islendi(), l = satirlar.map(r => ({ ...r, ...eslestir(r), anahtar: anahtar(r) })).map(r => ({ ...r, onceden: ise.has(r.anahtar), fazla: r.k ? r.tutar > acik(r.k).reduce((a, x) => a + kalanT(x.t), 0) : false }));
  const es = l.filter(r => r.k && !r.onceden), yok = l.filter(r => !r.k && !r.onceden), once = l.filter(r => r.onceden), bl = bankaHesaplari();
  pencere({ baslik: 'Banka ekstresi', genis: true, taslak: false, icerik: `<p style="font-size:14px;margin-bottom:8px">${l.length} gelen havale · <b>${es.length}</b> öğrenciyle eşleşti · ${yok.length} eşleşmedi${once.length ? ` · ${once.length} daha önce işlendi` : ''}</p>
      ${bl.length > 1 ? `<div class="alan" style="max-width:320px;margin-bottom:8px"><label for="ek-hs">Hangi banka hesabının ekstresi?</label><select id="ek-hs" class="girdi" data-ek-hesap>${bl.map(h => `<option value="${e(h.id)}" ${h.id === varsayilanHesap('Havale') ? 'selected' : ''}>${e(h.ad)}</option>`).join('')}</select></div>` : ''}
      ${es.length ? `<div class="tablo-kap"><table class="tablo"><thead><tr><th></th><th>Tarih</th><th>Öğrenci</th><th>Açıklama</th><th class="sag">Tutar</th></tr></thead><tbody>${es.map((r, i) => `<tr><td><input type="checkbox" data-ek-i="${i}" ${r.fazla ? '' : 'checked'} aria-label="İşle"></td><td>${tarih(r.tarih)}</td><td><b>${e(tamAd(r.k))}</b><small style="display:block;color:var(--soluk)">${e(r.neden)} · kalan ${tl(kalanBorc(r.k))}</small>${r.fazla ? rozet('Açık taksitten fazla', 'uyari') : ''}</td><td style="max-width:280px;word-break:break-word">${e(r.aciklama)}</td><td class="sag sayi">${tl(r.tutar)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="ipucu">Eşleşen havale yok.</p>'}
      ${yok.length ? `<details style="margin-top:10px"><summary>Eşleşmeyenler (${yok.length})</summary><ul class="liste">${yok.map(r => `<li><div style="flex:1;min-width:0"><b>${tl(r.tutar)}</b> · ${tarih(r.tarih)}<small style="display:block;color:var(--soluk);word-break:break-word">${e(r.aciklama)}</small></div></li>`).join('')}</ul><p style="font-size:13px;color:var(--soluk)">Açıklamada ödeme kodu ya da TC yok. Öğrenci dosyasından “Ödeme al” ile Havale olarak elle girin.</p></details>` : ''}
      <p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>Öğrenciye ödeme bilgisinde açıklamaya yazacağı kod gider (ör. ${e(odemeKodu((S.kursiyerler || [])[0]) || 'MDXXXXX')}). İşlenen havaleler açık taksitlere vade sırasıyla dağılır ve makbuz numarası alır.</span></p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button>${es.length ? '<button class="dg dg-ana" data-ek-isle>Seçilenleri tahsilat olarak işle</button>' : ''}`,
    onAc(p) { const b = p.querySelector('[data-ek-isle]'); if (!b) return; b.addEventListener('click', () => {
      const sec = [...p.querySelectorAll('[data-ek-i]:checked')].map(x => es[+x.dataset.ekI]); if (!sec.length) return bildir('İşlenecek satır seçin', 'uyari');
      const hesap = (p.querySelector('[data-ek-hesap]') || {}).value || varsayilanHesap('Havale'); geriAlNoktasi(); let n = 0, top = 0, atla = 0;
      sec.forEach((r, j) => { const k = r.k, l2 = acik(k), az = l2.reduce((a, x) => a + kalanT(x.t), 0); if (r.tutar > az + 0.001 || (S.gunSonu || []).includes(r.tarih)) { atla++; return; }
        let kal = r.tutar; const dagilim = [], parca = [];
        for (const x of l2) { if (kal <= 0) break; const al = Math.min(kal, kalanT(x.t)); kal -= al; dagilim.push({ i: x.i, al, vade: x.t.vade }); x.t.kismi = (x.t.kismi || 0) + al; if (x.t.kismi >= x.t.tutar) { x.t.odendi = r.tarih; x.t.yontem = 'Havale'; delete x.t.kismi; } parca.push((x.i + 1) + '. taksit' + (x.t.odendi ? '' : ' (kısmi)')); }
        const h = { id: 'h' + (Date.now() + j), tarih: r.tarih, tur: 'Gelir', kategori: 'Taksit', aciklama: tamAd(k) + ' · ' + parca.join(', ') + ' · banka havalesi', tutar: r.tutar, yontem: 'Havale', ...(hesap ? { hesap } : {}), kursiyer: k.id, dagilim, ekstre: r.anahtar, not: r.aciklama.slice(0, 120) };
        S.hareket.unshift(h); makbuzNoVer(h); n++; top += r.tutar; });
      islem('Banka ekstresinden tahsilat işledi', `${n} havale · ${tl(top)}${atla ? ' · ' + atla + ' atlandı' : ''}`); kaydet(); kapatPencere();
      bildir(`${n} havale işlendi (${tl(top)})${atla ? `; ${atla} satır açık taksitten fazla ya da günü kapalı, elle bakın` : ''}`, atla ? 'uyari' : 'tamam', true); sonra && sonra(); }); } });
}
export async function ekstreYukle(dosya, sonra) {
  const S5 = await import('./sayfalar5.js?v=235');
  let tablo; try { tablo = /\.xlsx?$/i.test(dosya.name) ? await S5.excelOku(dosya) : S5.csvOku(await S5.csvMetin(dosya)); } catch (x) { return bildir('Dosya okunamadı: ' + (x.message || x), 'uyari'); }
  const r = ekstreSatirlari(tablo, S5.tarihCoz); if (r.hata) return bildir(r.hata, 'uyari'); if (!r.l.length) return bildir('Ekstrede gelen havale bulunamadı', 'uyari');
  ekstrePenceresi(r.l, sonra);
}
