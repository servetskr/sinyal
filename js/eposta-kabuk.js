// E-posta gövdesi için ortak kabuk: marka başlığı, özet kutucukları, bölümler, satırlar, düğme, alt bilgi.
// E-posta programları dış stil dosyası, flex ya da grid okumaz: yalnız tablo ve satır içi stil. Genişlik 600px, telefonda daralır.
// Worker'daki onay e-postası (cloudflare/sinyal-wa.js epKabuk) aynı görünümü kendi içinde kurar; renk değişirse ikisini birlikte değiştir.
const k = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const R = { lacivert: '#0f1729', sari: '#ffc21a', murekkep: '#111827', soluk: '#6b7280', cizgi: '#e8ebf1', zemin: '#f3f5f9', kirmizi: '#b91c1c', yesil: '#15803d', amber: '#b45309' };
export const SITE = 'https://mdsinyal.com';
const YAZI = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// özet kutucukları: [[etiket, değer, alt yazı, renk?], ...] ikişer ikişer satıra dizilir (telefonda da okunur)
export function kutular(l) {
  const hucre = x => x ? `<td width="50%" style="padding:6px;vertical-align:top"><div style="background:${R.zemin};border-radius:12px;padding:12px 14px">
<div style="font-size:12px;color:${R.soluk};line-height:1.3">${k(x[0])}</div>
<div style="font-size:22px;font-weight:800;color:${x[3] || R.lacivert};line-height:1.25;margin-top:4px;letter-spacing:-.3px">${k(x[1])}</div>
${x[2] ? `<div style="font-size:12px;color:${R.soluk};margin-top:2px">${k(x[2])}</div>` : ''}</div></td>` : '<td width="50%" style="padding:6px"></td>';
  const satirlar = []; for (let i = 0; i < l.length; i += 2) satirlar.push(`<tr>${hucre(l[i])}${hucre(l[i + 1])}</tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 4px">${satirlar.join('')}</table>`;
}
// bölüm: başlık (sayı rozetiyle) + içerik
export const bolum = (baslik, ic, sayi) => `<div style="margin-top:24px"><div style="font-size:15px;font-weight:800;color:${R.lacivert};padding-bottom:8px;border-bottom:2px solid ${R.lacivert}">${k(baslik)}${sayi != null ? ` <span style="display:inline-block;min-width:18px;padding:1px 7px;border-radius:999px;background:${R.zemin};color:${R.soluk};font-size:12px;font-weight:700;text-align:center;vertical-align:1px">${k(sayi)}</span>` : ''}</div>${ic}</div>`;
// satırlar: [sol (html), sağ (html), { soluk: true, alt: 'html' }]
export function satirlar(l) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px">${l.map(([a, b, o = {}]) => `<tr>
<td style="padding:9px 8px 9px 0;border-bottom:1px solid ${R.cizgi};color:${o.soluk ? R.soluk : R.murekkep};vertical-align:top${o.girinti ? ';padding-left:14px' : ''}">${a}${o.alt ? `<div style="font-size:12.5px;color:${R.soluk};margin-top:2px">${o.alt}</div>` : ''}</td>
<td style="padding:9px 0;border-bottom:1px solid ${R.cizgi};text-align:right;white-space:nowrap;font-weight:700;color:${o.renk || R.murekkep};vertical-align:top">${b}</td></tr>`).join('')}</table>`;
}
export const bos = metin => `<p style="margin:10px 0 0;font-size:14px;color:${R.soluk}">${k(metin)}</p>`;
export const devam = metin => `<p style="margin:8px 0 0;font-size:13px;color:${R.soluk}">${k(metin)}</p>`;
// dikkat kutusu: tur 'kirmizi' | 'amber' | 'mavi'
export function not(metin, tur = 'mavi') {
  const r = { kirmizi: ['#fef2f2', R.kirmizi], amber: ['#fffbeb', R.amber], mavi: ['#eff6ff', '#1d4ed8'] }[tur] || ['#eff6ff', '#1d4ed8'];
  return `<div style="background:${r[0]};border-left:4px solid ${r[1]};border-radius:8px;padding:11px 14px;font-size:14px;color:${R.murekkep};margin:10px 0 0">${metin}</div>`;
}
export const nokta = renk => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${renk};margin-right:8px;vertical-align:1px"></span>`;
export const dugme = (yazi, link) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px"><tr><td style="border-radius:10px;background:${R.sari}"><a href="${k(link)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:800;color:${R.lacivert};text-decoration:none;border-radius:10px">${k(yazi)}</a></td></tr></table>`;

// tam e-posta: ust = başlığın üstündeki küçük satır (kurs · dönem), baslik, govde (html), alt = alt bilgi metni (düz metin)
export function kabuk({ ust = '', baslik, govde, alt = '', onizleme = '' }) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${k(baslik)}</title></head>
<body style="margin:0;padding:0;background:${R.zemin};-webkit-text-size-adjust:100%">
${onizleme ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${k(onizleme)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${R.zemin}"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:${YAZI};color:${R.murekkep}">
<tr><td style="background:${R.lacivert};padding:16px 24px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img src="${SITE}/img/simge/mdsinyal-192.png" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px"></td>
<td style="vertical-align:middle;padding-left:10px;font-size:19px;color:#ffffff;letter-spacing:-.2px"><span style="opacity:.55;font-weight:500">md</span><b style="font-weight:800">Sinyal</b></td>
</tr></table></td></tr>
<tr><td style="height:4px;background:${R.sari};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:24px 24px 28px">
${ust ? `<div style="font-size:13px;color:${R.soluk};font-weight:600">${k(ust)}</div>` : ''}
<h1 style="margin:4px 0 16px;font-size:24px;line-height:1.25;color:${R.lacivert};font-weight:800;letter-spacing:-.4px">${k(baslik)}</h1>
${govde}
</td></tr>
<tr><td style="padding:16px 24px 20px;background:#fafbfc;border-top:1px solid ${R.cizgi};font-size:12.5px;line-height:1.5;color:${R.soluk}">
${alt ? `<div>${k(alt)}</div>` : ''}
<div style="margin-top:6px"><a href="${SITE}" style="color:${R.soluk};font-weight:700;text-decoration:none">mdSinyal</a> · sürücü kursu yönetim programı</div>
</td></tr></table>
</td></tr></table></body></html>`;
}
