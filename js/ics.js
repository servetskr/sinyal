// Takvim dosyası (.ics, RFC 5545): telefonun ya da bilgisayarın takvimine etkinlik ekler (PER-008).
// Satırlar 75 baytta katlanır (devam satırı boşlukla başlar; çok baytlı Türkçe harf bölünmez), metin kaçışları (\ ; , satır sonu) yapılır.
// UID sabit verilir: aynı dosya yeniden açılınca takvim etkinliği çoğaltmaz, günceller (SEQUENCE her üretimde artar). Geçmiş tarihli etkinlik üretilmez.
const kac = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const bayt = c => { const n = c.codePointAt(0); return n < 0x80 ? 1 : n < 0x800 ? 2 : n < 0x10000 ? 3 : 4; };
export function katla(satir) {
  const out = []; let cur = '', n = 0, sinir = 75;
  for (const c of satir) { const b = bayt(c); if (n + b > sinir) { out.push(cur); cur = ' '; n = 1; sinir = 75; } cur += c; n += b; }
  out.push(cur); return out.join('\r\n');
}
const gunStr = t => t.replace(/-/g, '');
const damga = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
// olaylar: [{ uid, tarih: 'YYYY-MM-DD', saat: 'HH:MM', sure (dk, vars. 15), baslik, aciklama, alarm (dk önce, vars. 0) }]
export function icsOlustur(olaylar, ad = 'mdSinyal') {
  const bugun = new Date(); const bg = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}-${String(bugun.getDate()).padStart(2, '0')}`;
  const st = damga(), seq = Math.floor(Date.now() / 1000) - 1.7e9;
  const l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//mdSinyal//Takvim//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + kac(ad)];
  olaylar.filter(o => o && o.tarih >= bg).forEach(o => {
    const [h, m] = (o.saat || '09:00').split(':').map(Number), bit = h * 60 + m + (o.sure || 15);
    const bas = gunStr(o.tarih) + 'T' + String(h).padStart(2, '0') + String(m).padStart(2, '0') + '00', son = gunStr(o.tarih) + 'T' + String(Math.floor(bit / 60) % 24).padStart(2, '0') + String(bit % 60).padStart(2, '0') + '00';
    l.push('BEGIN:VEVENT', 'UID:' + o.uid, 'DTSTAMP:' + st, 'SEQUENCE:' + Math.max(0, Math.floor(seq)), 'DTSTART:' + bas, 'DTEND:' + son, 'SUMMARY:' + kac(o.baslik), ...(o.aciklama ? ['DESCRIPTION:' + kac(o.aciklama)] : []), 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + kac(o.baslik), 'TRIGGER:-PT' + (o.alarm || 0) + 'M', 'END:VALARM', 'END:VEVENT');
  });
  l.push('END:VCALENDAR');
  return { metin: l.map(katla).join('\r\n') + '\r\n', sayi: l.filter(x => x === 'BEGIN:VEVENT').length };
}
export function icsIndir(dosya, olaylar, ad) {
  const { metin, sayi } = icsOlustur(olaylar, ad); if (!sayi) return 0;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([metin], { type: 'text/calendar;charset=utf-8' })); a.download = dosya; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return sayi;
}
// PER-008: öğretmenin çalışma izni bitişi için 30 ve 15 gün önce ve bitiş günü, 09:00 hatırlatma
export function izinOlaylari(eg, bit, kurs = '') {
  const ekle = (t, n) => { const d = new Date(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10) - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const acik = `Çalışma izni ${bit.split('-').reverse().join('.')} tarihinde bitiyor. Uzatma için yeni sözleşme bitişten en geç 30 gün önce il/ilçe MEM’e verilir (ÖÖKY md.27/1). İzin yenilenince mdSinyal’de MEB işlemleri › MEBBİS’ten güncelle.${kurs ? ' · ' + kurs : ''}`;
  return [[30, `${eg.ad} · çalışma izni 30 gün sonra bitiyor`], [15, `${eg.ad} · çalışma izni 15 gün sonra bitiyor`], [0, `${eg.ad} · çalışma izni bugün bitiyor`]]
    .map(([n, baslik]) => ({ uid: `mdsinyal-izin-${eg.id}-${n}@mdsinyal.com`, tarih: ekle(bit, n), saat: '09:00', sure: 15, baslik, aciklama: acik, alarm: 0 }));
}
