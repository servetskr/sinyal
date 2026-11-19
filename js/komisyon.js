// SNV-063..071: MEM'e dekontla verilen "Özel MTSK Sınav Komisyon Listesi" (Excel). Kaynak: temiz şablon veri/sablon/komisyon-listesi.xlsx
// (kurum logosu, yardımcı sütunlar ve formüller çıkarılmış; SNV-068). Şablon bozulmadan doldurulur: ZIP girdileri olduğu gibi kopyalanır,
// yalnız sheet1.xml değişir ve saklanmış (sıkıştırmasız) yazılır. Dış kütüphane yok.
import { S, kaydet, tamAd, kursiyer, egitmen, SINIFLAR, islem, mebSinavUcretiGoster, ibanBicim, ibanGecerli, tcMaskele, sbSinav, fark } from './veri.js?v=235';
import { e, tl, tarih, tarihUzun, pencere, kapatPencere, bildir, rozet, belgeYazdir, isaret, ik } from './ui.js?v=235';
import { sinavAtamasi } from './sinavgunu.js?v=235';

/* ---------- ZIP (SNV-069) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
async function inflate(b) { const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(b); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
// merkez dizinden okur; saklanan (0) ve deflate (8) girdiler
export async function zipOku(buf) {
  const u = new Uint8Array(buf), v = new DataView(u.buffer, u.byteOffset, u.byteLength), td = new TextDecoder();
  let eo = -1; for (let i = u.length - 22; i >= Math.max(0, u.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error('ZIP sonu bulunamadı');
  const n = v.getUint16(eo + 10, true); let p = v.getUint32(eo + 16, true); const l = [];
  for (let i = 0; i < n; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP merkez dizini bozuk');
    const yon = v.getUint16(p + 10, true), boy = v.getUint32(p + 20, true), adB = v.getUint16(p + 28, true), ekB = v.getUint16(p + 30, true), notB = v.getUint16(p + 32, true), yer = v.getUint32(p + 42, true);
    const ad = td.decode(u.subarray(p + 46, p + 46 + adB)), lo = yer + 30 + v.getUint16(yer + 26, true) + v.getUint16(yer + 28, true), ham = u.subarray(lo, lo + boy);
    l.push({ ad, veri: yon === 0 ? ham.slice() : yon === 8 ? await inflate(ham) : (() => { throw new Error('Desteklenmeyen sıkıştırma: ' + yon); })() });
    p += 46 + adB + ekB + notB;
  }
  return l;
}
// saklanmış girdilerle ZIP (Excel açar); girdi sırası korunur ([Content_Types].xml başta)
export function zipYaz(l) {
  const te = new TextEncoder(), parca = [], merkez = []; let ofs = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const zaman = [0, 0, ...u16(((2026 - 1980) << 9) | (11 << 5) | 18)];
  l.forEach(({ ad, veri }) => { const a = te.encode(ad), c = crc32(veri);
    const bas = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...zaman, ...u32(c), ...u32(veri.length), ...u32(veri.length), ...u16(a.length), ...u16(0)]);
    parca.push(bas, a, veri);
    merkez.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...zaman, ...u32(c), ...u32(veri.length), ...u32(veri.length), ...u16(a.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(ofs)]), a);
    ofs += bas.length + a.length + veri.length; });
  const mb = merkez.reduce((t, x) => t + x.length, 0);
  return new Blob([...parca, ...merkez, new Uint8Array([...u32(0x06054b50), 0, 0, 0, 0, ...u16(l.length), ...u16(l.length), ...u32(mb), ...u32(ofs), 0, 0])], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* ---------- hücre yazma (SNV-070) ---------- */
const xmlE = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sutunNo = r => r.replace(/\d+/g, '').split('').reduce((t, c) => t * 26 + c.charCodeAt(0) - 64, 0);
// tip: 'n' sayı, 's' metin (inlineStr), '' boş. Stil (s=) korunur; formül silinir; hücre yoksa satırda sütun sırasına eklenir, satır yoksa satır açılır.
export function hucreYaz(xml, ref, tip, deger) {
  const ic = tip === 'n' ? `><v>${+deger}</v></c>` : tip === 's' && deger !== '' && deger != null ? ` t="inlineStr"><is><t xml:space="preserve">${xmlE(deger)}</t></is></c>` : '/>';
  const re = new RegExp(`<c r="${ref}"((?:\\s+[\\w:]+="[^"]*")*)\\s*(?:/>|>[\\s\\S]*?</c>)`);
  const m = xml.match(re);
  if (m) { const st = (m[1].match(/\ss="\d+"/) || [''])[0]; return xml.replace(re, `<c r="${ref}"${st}${ic}`); }
  const satir = ref.replace(/[A-Z]+/, ''), rr = new RegExp(`<row r="${satir}"([^>]*?)(/>|>([\\s\\S]*?)</row>)`), rm = xml.match(rr), yeni = `<c r="${ref}"${ic}`;
  if (!rm) { const sonra = [...xml.matchAll(/<row r="(\d+)"/g)].find(x => +x[1] > +satir); const ek = `<row r="${satir}">${yeni}</row>`; return sonra ? xml.slice(0, sonra.index) + ek + xml.slice(sonra.index) : xml.replace('</sheetData>', ek + '</sheetData>'); }
  if (rm[2] === '/>') return xml.replace(rr, `<row r="${satir}"${rm[1]}>${yeni}</row>`);
  const hucreler = [...rm[3].matchAll(/<c r="([A-Z]+)\d+"/g)], once = hucreler.find(x => sutunNo(x[1]) > sutunNo(ref));
  const govde = once ? rm[3].slice(0, once.index) + yeni + rm[3].slice(once.index) : rm[3] + yeni;
  return xml.replace(rr, `<row r="${satir}"${rm[1]}>${govde}</row>`);
}
// Excel tarih seri numarası (1900 sistemi)
export const excelTarih = t => Math.round((Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);

/* ---------- satırlar (SNV-071) ---------- */
export const BLOKLAR = [{ tarih: 'C6', tutar: 'G6', ilk: 8, boy: 10 }, { tarih: 'C19', tutar: 'G19', ilk: 21, boy: 10 }, { tarih: 'C32', tutar: 'G32', ilk: 34, boy: 12 }, { tarih: 'C47', tutar: 'G47', ilk: 49, boy: 12 }];
export const plakaBicim = p => { const t = String(p || '').replace(/\s/g, '').toLocaleUpperCase('tr'), m = t.match(/^(\d{2})([A-ZÇĞİÖŞÜ]{1,3})(\d{2,5})$/); return m ? `${m[1]} ${m[2]} ${m[3]}` : String(p || '').trim(); };
// MEBBİS sertifika türü metni (şablondaki açılır listeyle aynı): "B (Manuel)", "B (Otomatik)", "A2 (Manuel)"
export const sertifikaTuru = sinif => { const s = String(sinif || ''); if (s === 'B-O') return 'B (Otomatik)'; if (s === 'B-EN') return 'B (Otomatik)'; return s.replace(/-.*/, '') + ' (Manuel)'; };
export function komisyonSatirlari(s, kom) {
  return sinavAtamasi(s).filter(x => x.kom === kom).sort((a, b) => String(a.saat).localeCompare(String(b.saat))).map(x => ({ k: x.k, usta: x.eg ? x.eg.ad : '', plaka: plakaBicim(x.plaka), sertifika: sertifikaTuru(x.k.sinif), tc: String(x.k.tc || '').replace(/\D/g, ''), ad: x.k.ad || '', soyad: x.k.soyad || '' }));
}
const eksikleri = r => [!r.usta && 'usta', !r.plaka && 'plaka', !/^\d{11}$/.test(r.tc) && 'T.C.', !r.ad && 'ad', !r.soyad && 'soyad'].filter(Boolean);
const komisyonlar = s => [...new Set(sinavAtamasi(s).map(x => x.kom))].sort((a, b) => a - b);
const banka = () => S.kurs.donerBanka || { ad: '', iban: '' };

/* ---------- Excel üret (SNV-065) ---------- */
let SABLON = null;
async function sablon() { if (SABLON) return SABLON; const r = await fetch('veri/sablon/komisyon-listesi.xlsx', { cache: 'force-cache' }); if (!r.ok) throw new Error('Şablon alınamadı'); return (SABLON = await zipOku(await r.arrayBuffer())); }
export async function komisyonExcel(s, koms, { dekontNo, dekontTutar, ucret }) {
  const l = await sablon(), te = new TextEncoder(), td = new TextDecoder(), b = banka();
  let x = td.decode(l.find(g => g.ad === 'xl/worksheets/sheet1.xml').veri);
  x = hucreYaz(x, 'C2', 's', S.kurs.resmiAd || S.kurs.ad || '');
  x = hucreYaz(x, 'C3', 's', b.ad || ''); x = hucreYaz(x, 'F3', 's', b.iban ? ibanBicim(b.iban) : '');
  x = hucreYaz(x, 'C4', 's', dekontNo || ''); x = dekontTutar ? hucreYaz(x, 'G4', 'n', dekontTutar) : hucreYaz(x, 'G4', '', '');
  BLOKLAR.forEach((bl, i) => { const kom = koms[i], rows = kom != null ? komisyonSatirlari(s, kom) : [];
    x = hucreYaz(x, bl.tarih, rows.length ? 'n' : '', excelTarih(s.tarih)); x = rows.length && ucret ? hucreYaz(x, bl.tutar, 'n', rows.length * ucret) : hucreYaz(x, bl.tutar, '', '');
    for (let j = 0; j < bl.boy; j++) { const r = rows[j], n = bl.ilk + j;
      x = hucreYaz(x, 'B' + n, 's', r ? r.usta : ''); x = hucreYaz(x, 'C' + n, 's', r ? r.plaka : ''); x = hucreYaz(x, 'D' + n, 's', r ? r.sertifika : '');
      x = r && r.tc ? hucreYaz(x, 'E' + n, 'n', r.tc) : hucreYaz(x, 'E' + n, '', ''); x = hucreYaz(x, 'F' + n, 's', r ? r.ad : ''); x = hucreYaz(x, 'G' + n, 's', r ? r.soyad : ''); } });
  return zipYaz(l.map(g => g.ad === 'xl/worksheets/sheet1.xml' ? { ad: g.ad, veri: te.encode(x) } : g));
}
const dosyaAdi = (s, n) => `Komisyon Listesi ${s.tarih.slice(8, 10)}.${s.tarih.slice(5, 7)}.${s.tarih.slice(0, 4)}${n > 1 ? ` (${n})` : ''}.xlsx`;
function indir(blob, ad) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

/* ---------- yazdır (SNV-067) ---------- */
function yazdir(s, ucret, dekontNo, dekontTutar) {
  const b = banka(), koms = komisyonlar(s);
  belgeYazdir(`<h1>Özel MTSK sınav komisyon listesi</h1><table><tr><th style="width:150px">MTSK adı</th><td colspan="3">${e(S.kurs.resmiAd || S.kurs.ad || '')}</td></tr><tr><th>Banka adı ve IBAN</th><td>${e(b.ad || '')}</td><td colspan="2">${e(b.iban ? ibanBicim(b.iban) : '')}</td></tr><tr><th>Dekont no</th><td>${e(dekontNo || '')}</td><th>Dekont tutarı</th><td>${dekontTutar ? e(tl(dekontTutar)) : ''}</td></tr></table>
    ${koms.map((c, i) => { const r = komisyonSatirlari(s, c); return `<h2 style="font-size:13px;margin:14px 0 4px">${i + 1}. komisyon · Sınav tarihi ${e(tarih(s.tarih))}${ucret ? ' · Liste tutarı ' + e(tl(r.length * ucret)) : ''}</h2><table><tr><th>S. No</th><th>Usta öğretici</th><th>Araç plakası</th><th>Sertifika türü</th><th>Kimlik no</th><th>Aday adı</th><th>Aday soyadı</th></tr>${r.map((y, j) => `<tr><td>${j + 1}</td><td>${e(y.usta)}</td><td class="nw">${e(y.plaka)}</td><td>${e(y.sertifika)}</td><td>${e(y.tc)}</td><td>${e(y.ad)}</td><td>${e(y.soyad)}</td></tr>`).join('')}</table>`; }).join('')}`, 'Komisyon listesi · ' + tarih(s.tarih));
}

/* ---------- pencere (SNV-063, SNV-064, SNV-066) ---------- */
export function komisyonPenceresi(s) {
  if (!s || s.tur !== 'Direksiyon') return bildir('Komisyon listesi uygulama sınavı içindir', 'uyari');
  const koms = komisyonlar(s); if (!koms.length) return bildir('Bu oturumda aday yok', 'uyari');
  const ucret = mebSinavUcretiGoster(s.tarih), d = s.dekont || {}, b = banka();
  const dosyalar = []; for (let i = 0; i < koms.length; i += 4) dosyalar.push(koms.slice(i, i + 4));
  const satirlar = koms.map(c => komisyonSatirlari(s, c)), eksik = satirlar.flat().filter(r => eksikleri(r).length), toplam = satirlar.flat().length * ucret;
  const tasma = koms.map((c, i) => ({ c, n: satirlar[i].length, boy: BLOKLAR[i % 4].boy })).filter(x => x.n > x.boy);
  pencere({ baslik: 'Komisyon listesi · ' + tarihUzun(s.tarih), genis: true, icerik: `<form class="form-izgara" id="f-kom">
      <div class="alan"><label for="km-no">Dekont no</label><input id="km-no" name="no" class="girdi" value="${e(d.no || '')}" placeholder="Döner sermaye dekontu"></div>
      <div class="alan"><label for="km-t">Dekont tutarı (₺)</label><input id="km-t" name="tutar" class="girdi" inputmode="numeric" value="${d.tutar || ''}"></div>
      <div class="alan"><label for="km-b">Banka adı ve şubesi</label><input id="km-b" name="banka" class="girdi" value="${e(b.ad || '')}" placeholder="MEM döner sermaye hesabının bankası"></div>
      <div class="alan"><label for="km-i">IBAN</label><input id="km-i" name="iban" class="girdi mono" value="${e(b.iban ? ibanBicim(b.iban) : '')}" placeholder="TR.."></div>
      <p class="alan tam" style="font-size:13px;color:var(--soluk);margin:0">Aday başı ücret <b>${ucret ? tl(ucret) : 'girilmedi'}</b> (Ayarlar › Sınıf ve ücretler’den değişir) · ${satirlar.flat().length} aday · liste tutarı ${tl(toplam)}. Banka ve IBAN bir kez yazılır, sonraki listelerde dolu gelir.</p></form>
    <div data-km-uyari></div>
    ${dosyalar.length > 1 ? `<p class="ipucu" style="margin-top:10px">${isaret('bilgi', 18)}<span>Bu gün ${koms.length} komisyon var; şablonda 4 blok olduğu için ${dosyalar.length} dosya indirilecek.</span></p>` : ''}
    ${tasma.length ? `<p class="ipucu" style="margin-top:10px">${isaret('uyari', 18)}<span>${tasma.map(x => `${x.c}. komisyonda ${x.n} aday var, blokta ${x.boy} satır`).join(' · ')}. Sınav gününden komisyonları bölün.</span></p>` : ''}
    ${eksik.length ? `<p class="ipucu" style="margin-top:10px;border-color:var(--kirmizi)">${isaret('uyari', 18)}<span><b>${eksik.length} satırda eksik bilgi var:</b> ${eksik.slice(0, 4).map(r => e(tamAd(r.k)) + ' (' + eksikleri(r).join(', ') + ')').join(' · ')}${eksik.length > 4 ? ' …' : ''}</span></p>` : ''}
    <div class="km-bloklar">${koms.map((c, i) => `<div class="km-blok"><div class="km-blok-bas"><b>Blok ${(i % 4) + 1}${dosyalar.length > 1 ? ' · dosya ' + (Math.floor(i / 4) + 1) : ''}</b><span>${c}. komisyon · ${satirlar[i].length}/${BLOKLAR[i % 4].boy}</span><button type="button" class="dg dg-hafif dg-kucuk" data-km-kopya="${c}">Satırları kopyala</button></div>
      <table class="km-tablo"><tr><th>#</th><th>Usta öğretici</th><th>Plaka</th><th>Sertifika</th><th>Kimlik no</th><th>Ad</th><th>Soyad</th></tr>${satirlar[i].map((r, j) => { const ek = eksikleri(r); return `<tr class="${ek.length ? 'km-eksik' : ''}"><td>${j + 1}</td><td>${e(r.usta || '—')}</td><td class="mono">${e(r.plaka || '—')}</td><td>${e(r.sertifika)}</td><td class="mono">${e(r.tc ? tcMaskele(r.tc) : '—')}</td><td>${e(r.ad)}</td><td>${e(r.soyad)}</td></tr>`; }).join('')}</table></div>`).join('')}</div>`,
    altlik: `<button class="dg dg-cizgi" data-km-yazdir>${ik('belge')}Yazdır</button><button class="dg dg-cizgi" data-kapat style="margin-left:auto">Kapat</button><button class="dg dg-ana" data-km-indir>${ik('indir')}Excel’i indir</button>`,
    onAc(p) {
      const f = p.querySelector('#f-kom'), uy = p.querySelector('[data-km-uyari]'), deger = () => ({ dekontNo: f.no.value.trim(), dekontTutar: +String(f.tutar.value).replace(/[^\d,]/g, '').replace(',', '.') || 0, ucret });
      const denetle = () => { const v = deger(); uy.innerHTML = v.dekontTutar && toplam && v.dekontTutar !== toplam ? `<p class="ipucu" style="margin-top:10px">${isaret('uyari', 18)}<span>Dekont tutarı (${tl(v.dekontTutar)}) liste tutarını (${satirlar.flat().length} × ${tl(ucret)} = ${tl(toplam)}) tutmuyor.</span></p>` : ''; };
      f.addEventListener('input', denetle); denetle();
      const sakla = () => { const v = deger(), iban = f.iban.value.replace(/\s/g, '').toLocaleUpperCase('tr');
        if (iban && !ibanGecerli(iban)) { bildir('IBAN geçerli görünmüyor', 'uyari'); return false; }
        S.kurs.donerBanka = { ad: f.banka.value.trim(), iban }; if (v.dekontNo || v.dekontTutar) s.dekont = { ...(s.dekont || {}), no: v.dekontNo, tutar: v.dekontTutar || (s.dekont || {}).tutar }; kaydet(); return true; };
      p.querySelector('[data-km-indir]').addEventListener('click', async ev => {
        if (eksik.length && !ev.currentTarget.dataset.onay) { ev.currentTarget.dataset.onay = '1'; ev.currentTarget.textContent = 'Yine de indir'; return bildir(`${eksik.length} satırda eksik bilgi var; yine de indirmek için tekrar basın`, 'uyari'); }
        if (!sakla()) return; const v = deger();
        try { for (let i = 0; i < dosyalar.length; i++) indir(await komisyonExcel(s, dosyalar[i], v), dosyaAdi(s, i + 1));
          islem('Komisyon listesini indirdi', `${tarih(s.tarih)} · ${koms.length} komisyon · ${satirlar.flat().length} aday`); kaydet(); bildir(dosyalar.length > 1 ? `${dosyalar.length} dosya indirildi` : 'Komisyon listesi indirildi'); }
        catch (x) { console.error(x); bildir('Excel hazırlanamadı: ' + x.message, 'hata'); } });
      p.querySelector('[data-km-yazdir]').addEventListener('click', () => { if (!sakla()) return; const v = deger(); yazdir(s, ucret, v.dekontNo, v.dekontTutar); });
      p.addEventListener('click', async ev => { const kp = ev.target.closest('[data-km-kopya]'); if (!kp) return;
        const r = komisyonSatirlari(s, +kp.dataset.kmKopya), metin = r.map(y => [y.usta, y.plaka, y.sertifika, y.tc, y.ad, y.soyad].join('\t')).join('\r\n');
        try { await navigator.clipboard.writeText(metin); bildir(`${r.length} satır kopyalandı; Excel’de usta sütununun ilk hücresine yapıştırın`); } catch (x) { bildir('Kopyalanamadı; tarayıcı panoya izin vermedi', 'uyari'); } });
    } });
}
// MEB işlemleri › Resmî evrak: oturum seçtirir
export function komisyonSec() {
  const l = sbSinav(S.sinavlar).filter(s => s.tur === 'Direksiyon' && (s.kursiyerler || []).length && fark(s.tarih) >= -30).sort((a, b) => a.tarih.localeCompare(b.tarih));
  if (!l.length) return bildir('Adayı olan uygulama sınavı oturumu yok', 'uyari');
  if (l.length === 1) return komisyonPenceresi(l[0]);
  const ilk = l.find(s => fark(s.tarih) >= 0) || l[l.length - 1];
  pencere({ baslik: 'Komisyon listesi · oturum seç', icerik: `<div class="secim" style="flex-direction:column;align-items:stretch">${l.map(s => `<label><input type="radio" name="o" value="${s.id}" ${s === ilk ? 'checked' : ''}><span>${tarihUzun(s.tarih)} · ${(s.kursiyerler || []).length} aday</span></label>`).join('')}</div>`,
    altlik: '<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Devam</button>',
    onAc(p) { p.querySelector('[data-k]').addEventListener('click', () => { const s = l.find(x => x.id === (p.querySelector('[name=o]:checked') || {}).value); kapatPencere(); if (s) setTimeout(() => komisyonPenceresi(s), 50); }); } });
}
