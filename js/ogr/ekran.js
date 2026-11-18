// Öğrenci uygulaması yönlendiricisi (yeni tasarım). portal.js ogrenciPortal() öğrencinin kendi telefonunda buraya sorar;
// bir ekran modülü null dönerse eski düzen gösterilir (geçiş sırasında hiçbir ekran boş kalmaz).
//
// Ekran modülleri: ekran(ctx) → { html, baglan?(kap), tam?: true, rozet?: {sekme: sayı} } | null
//   tam: true → tam ekran akış (üst çubuk ve alt sekme çubuğu gizlenir; örn. deneme sorusu)
// ctx: { k, S0, sd, sinav, yenile(kaydir), git(sekme, alt?), genelTik(target), odemeYap(i), temaUst }
//
// Ortak gezinme öznitelikleri (her ekranda çalışır, modüllerin ayrıca bağlamasına gerek yok):
//   data-ogs="<sekme>"            alt sekme değiştir (durum | ders | sinav | odeme | evrak)
//   data-ox-git="<sekme>[:<alt>]" başka sekmenin alt ekranına git (örn. "sinav:deneme")
//   data-ox-alt="<alt>"           Öğren sekmesinde alt ekran aç; data-ox-alt="" Öğren ana ekranına döner
//   data-og-ders="<konu-id>"      kısa dersi aç (ogrenci.js ogBagla), data-ode / data-iste / data-kursa-yaz / data-degis / data-og-iptal (portal.js ogGenelTik)
import { sekmeCubugu, ustCubuk } from './ui.js?v=234';
import { altEkran, altAc, altKapat } from './ogrveri.js?v=234';
import * as OG from '../ogrenci.js?v=234';
import * as ANA from './anasayfa.js?v=234';
import * as DRS from './derslerim.js?v=234';
import * as ODE from './odeme.js?v=234';
import * as BLG from './belgeler.js?v=234';
import * as SNV from './sinav.js?v=234';
import * as ARC from './araclar.js?v=234';
import * as OGRN from '../ogren.js?v=234';
export { altEkran, altAc, altKapat, ustCubuk };

const SINAV_ALT = /^(deneme|araclar|test-ayar|tekrar|yanlislar)(:|$)/, ARAC_ALT = /^(tehlike|etkilesim|direksiyon)(:|$)/;

function sec(sekme, ctx) {
  if (sekme === 'durum') return ANA.ekran(ctx);
  if (sekme === 'ders') return DRS.ekran(ctx);
  if (sekme === 'odeme') return ODE.ekran(ctx);
  if (sekme === 'evrak') return BLG.ekran(ctx);
  if (sekme === 'sinav') {
    if (SNV.aktif(ctx)) return SNV.ekran(ctx);
    const a = altEkran() || '';
    if (SINAV_ALT.test(a)) return SNV.altEkran(a, ctx);
    if (ARAC_ALT.test(a)) return ARC.altEkran(a, ctx);
    return OGRN.ekran ? OGRN.ekran(ctx) : null;
  }
  return null;
}

const MODUL = { durum: ANA, ders: DRS, odeme: ODE, evrak: BLG };
// başka sekmeye gitmeden önce hedefin görünümünü hazırla: alt verilmişse o görünüm, verilmemişse sekmenin başı
// (Öğren'de alt ekran, diğer sekmelerde modülün kendi ac()/sifirla() kancası)
function hazirla(sk, alt) {
  if (sk === 'sinav') { if (alt !== undefined) altAc(alt); else altKapat(); return; }
  const m = MODUL[sk]; if (!m) return;
  if (alt !== undefined && m.ac) m.ac(alt); else if (m.sifirla) m.sifirla();
}

export function ciz(sekme, ctx0) {
  const ctx = { ...ctx0, git: (sk, alt) => { hazirla(sk, alt); ctx0.git(sk); } };
  let y = null;
  try { y = sec(sekme, ctx); } catch (x) { console.error(x); y = null; }
  if (!y) return null;
  return {
    baslik: 'Öğrenci', alt: '',
    html: `<div class="ox${y.tam ? ' ox-tam' : ''}" data-ox-sekme="${sekme}">${y.html}</div>${y.tam ? '' : sekmeCubugu(sekme, y.rozet || {})}`,
    baglan(kap) {
      document.body.classList.add('ox-modu');
      document.body.classList.toggle('ox-tam-acik', !!y.tam);
      document.body.classList.remove('hero-acik', 'hero-gunduz');
      const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = y.tam ? '#ffffff' : '#f7f8fa';
      OG.ogBagla(kap, ctx.k, ctx.yenile);
      kap.addEventListener('click', ev => {
        const t = ev.target;
        // sekme düğmesi: her zaman o sekmenin başına gider (iOS'taki gibi; açık kalan alt ekran karışıklık yaratmasın)
        const s = t.closest('[data-ogs]'); if (s) return ctx.git(s.dataset.ogs);
        const g = t.closest('[data-ox-git]'); if (g) { const [sk, ...a] = g.dataset.oxGit.split(':'); return ctx.git(sk, a.length ? a.join(':') : undefined); }
        const al = t.closest('[data-ox-alt]'); if (al) { altAc(al.dataset.oxAlt); ctx.yenile(true); return; }
        // taksit ödeme: eski pencere yerine yeni Ödeme ekranındaki taksit ayrıntısı
        const od = t.closest('[data-ode]'); if (od && ODE.ac) return ctx.git('odeme', 't:' + od.dataset.ode);
        ctx.genelTik(t);
      });
      if (y.baglan) { try { y.baglan(kap); } catch (x) { console.error(x); } }
    },
  };
}
