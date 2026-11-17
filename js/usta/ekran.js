// Öğretmen (usta öğretici) uygulaması yönlendiricisi (yeni tasarım). portal.js egitmenPortal() öğretmenin kendi telefonunda buraya sorar;
// bir ekran modülü null dönerse eski düzen gösterilir. Tasarım dili öğrenci uygulamasıyla ortak: js/ogr/ui.js.
//
// Ekran modülleri: ekran(ctx) → { html, baglan?(kap), tam?: true, rozet? } | null
//   tam: true → tam ekran akış (üst çubuk ve alt sekmeler gizli; örn. "Dersi bitir" adımları)
// ctx: { eg, sekme, alt, benim, bugun, kapanmamis, siradaki, ar, ogrenciler, yenile(kaydir), git(sekme, alt?), altAc(alt), P }
//   P: portal.js'teki öğretmen iş mantığı (dersBaslat, dersKapat, dersIptal, gelmediIsaretle, dersDiger, egOgrAc, progIndir, IPTAL_NEDEN,
//      konuOku, beceriOku, dersNo, progDurum, riskKontrol, izBaslat, izBitir, konumOku). Mantığı kopyalama, buradan çağır.
//
// Ortak öznitelikler (her ekranda çalışır, modülün ayrıca bağlamasına gerek yok):
//   data-egs="<sekme>"             alt sekme (bugun | hafta | kursiyer | kazanc); her zaman o sekmenin başına gider
//   data-ux-git="<sekme>[:<alt>]"  başka sekmenin alt ekranına git (örn. "kursiyer:ogr:k12", "bugun:arac")
//   data-ux-alt="<alt>"            bu sekmede alt ekran aç; data-ux-alt="" sekmenin başına döner
//   data-ders-basla="<ders-id>"    dersi başlat;  data-yapildi="<id>" dersi bitir akışı;  data-gelmedi="<id>" gelmedi onayı
//   data-ders-diger="<id>"         ders menüsü (ara, not, iptal, gelmedi);  data-ders-iptal="<id>" iptal
//   data-imza-tekrar="<id>"        imza linkini yeniden gönder;  data-ogr-ac="<öğrenci-id>" öğrenci ayrıntısı;  data-prog-indir Excel
import { S, gun, kursiyer, tamAd } from '../veri.js?v=229';
import { sekmeCubugu, USTA_SEKMELER } from '../ogr/ui.js?v=229';
import * as P from '../portal.js?v=229';
import * as BGN from './bugun.js?v=229';
import * as PRG from './program.js?v=229';
import * as OGR from './ogrenciler.js?v=229';
import * as KZN from './kazanc.js?v=229';
import * as DRS from './ders.js?v=229';
import * as ARC from './arac.js?v=229';

const oku = (a, d) => { try { return sessionStorage.getItem(a) || d; } catch (x) { return d; } };
const yaz = (a, v) => { try { if (v) sessionStorage.setItem(a, v); else sessionStorage.removeItem(a); } catch (x) { } };
let sekme = oku('sinyal-eg-sekme', 'bugun'), alt = oku('sinyal-eg-alt', '');
if (!USTA_SEKMELER.some(x => x[0] === sekme)) sekme = 'bugun';
export const altAc = a => { alt = a || ''; yaz('sinyal-eg-alt', alt); };
// üst çubuktaki avatar (data-hesap): öğretmende yeni Hesabım ekranı
export const hesapAc = () => { sekme = 'bugun'; yaz('sinyal-eg-sekme', 'bugun'); altAc('hesap'); };
export const sekmeAc = s => { sekme = s; yaz('sinyal-eg-sekme', s); };
export const sekmeSimdi = () => sekme;
const MODUL = { bugun: BGN, hafta: PRG, kursiyer: OGR, kazanc: KZN };
const ARAC_ALT = /^(arac|guzergah|hesap)(:|$)/;

function veri(eg) {
  const benim = S.dersler.filter(d => d.egitmen === eg.id);
  const bugun = benim.filter(d => d.tarih === gun(0)).sort((a, b) => a.saat.localeCompare(b.saat));
  const kapanmamis = benim.filter(d => d.durum === 'Planlandı' && d.tarih < gun(0) && d.tarih >= gun(-60)).sort((a, b) => (a.tarih + a.saat).localeCompare(b.tarih + b.saat));
  const ASIRA = { Direksiyon: 0, 'Sınav': 1, Teorik: 2, Evrak: 3, 'Kayıt': 4 };
  const ogrenciler = S.kursiyerler.filter(k => k.egitmen === eg.id && k.asama !== 'Ehliyet' && !k.kapali).sort((a, b) => (ASIRA[a.asama] ?? 9) - (ASIRA[b.asama] ?? 9) || tamAd(a).localeCompare(tamAd(b), 'tr'));
  const siradaki = bugun.find(d => d.durum === 'Planlandı' && d.bas) || bugun.find(d => d.durum === 'Planlandı');
  const ar = S.araclar.find(a => a.egitmen === eg.id);
  return { benim, bugun, kapanmamis, ogrenciler, siradaki, ar };
}

function sec(ctx) {
  if (DRS.aktif && DRS.aktif(ctx)) return DRS.ekran(ctx);
  if (ARAC_ALT.test(ctx.alt)) return ARC.altEkran(ctx.alt, ctx);
  const m = MODUL[ctx.sekme]; return m && m.ekran ? m.ekran(ctx) : null;
}
const bul = id => S.dersler.find(x => x.id === id);

export function ciz(eg, dis) {
  const ctx = {
    eg, sekme, alt, P, ...veri(eg), yenile: dis.yenile,
    altAc: a => { altAc(a); dis.yenile(true); },
    git: (s, a) => { const deg = s !== sekme; sekmeAc(s); altAc(a !== undefined ? a : ''); if (deg || a === undefined) { const m = MODUL[s]; if (m && m.sifirla) m.sifirla(); } dis.yenile(true); },
  };
  let y = null;
  try { y = sec(ctx); } catch (x) { console.error(x); y = null; }
  if (!y) return null;
  const rozet = { ...(ctx.kapanmamis.length ? { bugun: ctx.kapanmamis.length } : {}), ...(y.rozet || {}) };
  return {
    baslik: (USTA_SEKMELER.find(x => x[0] === sekme) || [])[1] || 'Bugün', alt: 'Öğretmen ekranı',
    html: `<div class="ox ox-usta${y.tam ? ' ox-tam' : ''}" data-ux-sekme="${sekme}">${y.html}</div>${y.tam ? '' : sekmeCubugu(sekme, rozet, USTA_SEKMELER, 'data-egs')}`,
    baglan(kap) {
      document.body.classList.add('ox-modu');
      document.body.classList.toggle('ox-tam-acik', !!y.tam);
      document.body.classList.remove('hero-acik', 'hero-gunduz');
      const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = y.tam ? '#ffffff' : '#f7f8fa';
      kap.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-egs]'); if (s) return ctx.git(s.dataset.egs);
        const g = t.closest('[data-ux-git]'); if (g) { const [sk, ...a] = g.dataset.uxGit.split(':'); return ctx.git(sk, a.join(':')); }
        const al = t.closest('[data-ux-alt]'); if (al) return ctx.altAc(al.dataset.uxAlt);
        const db = t.closest('[data-ders-basla]'); if (db) return P.dersBaslat(bul(db.dataset.dersBasla), eg);
        const yp = t.closest('[data-yapildi]'); if (yp) { const d = bul(yp.dataset.yapildi); return DRS.bitirAc ? DRS.bitirAc(d, ctx) : P.dersKapat(d); }
        const gm = t.closest('[data-gelmedi]'); if (gm) { const d = bul(gm.dataset.gelmedi); return DRS.gelmedi ? DRS.gelmedi(d, ctx) : P.gelmediIsaretle(d); }
        const dg = t.closest('[data-ders-diger]'); if (dg) { const d = bul(dg.dataset.dersDiger); return DRS.menu ? DRS.menu(d, ctx) : P.dersDiger(d); }
        const ip = t.closest('[data-ders-iptal]'); if (ip) { const d = bul(ip.dataset.dersIptal); return DRS.iptal ? DRS.iptal(d, ctx) : P.dersIptal(d); }
        const it = t.closest('[data-imza-tekrar]'); if (it) { const d = bul(it.dataset.imzaTekrar); return import('../imza.js?v=229').then(m => m.imzaIste('ders', kursiyer(d.kursiyer), [d.id])); }
        const oa = t.closest('[data-ogr-ac]'); if (oa) return ctx.git('kursiyer', 'ogr:' + oa.dataset.ogrAc);
        if (t.closest('[data-prog-indir]')) return P.progIndir(eg);
      });
      if (y.baglan) { try { y.baglan(kap); } catch (x) { console.error(x); } }
    },
  };
}
