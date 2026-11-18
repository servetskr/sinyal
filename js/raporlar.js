// Raporlar merkezi (RAP-009, SOR-085 kararı): Analiz, Raporlar ve Kârlılık tek sayfada sekmelerle.
// Adres #/raporlar/<sekme>; eski #/analiz/<alt> ve #/karlilik adresleri app.js rota() içinde buraya yönlenir.
import { sekmeler } from './ui.js?v=234';
import * as Y2 from './sayfalar2.js?v=234';
import * as AN from './analiz.js?v=234';
import * as OZ from './ozellik.js?v=234';

export const RAPOR_SEKMELERI = [['genel', 'Genel'], ['ogrenci', 'Öğrenciler'], ['usta', 'Usta öğreticiler'], ['kurs', 'Bu ay'], ['karlilik', 'Kârlılık ve kapasite']];
let sekme = 'genel';
export function raporMerkezi(alt) {
  if (alt && RAPOR_SEKMELERI.some(([k]) => k === alt)) sekme = alt;
  const ic = sekme === 'genel' ? Y2.raporlar() : sekme === 'karlilik' ? OZ.karlilik() : AN.analiz(sekme, { gomulu: true });
  return {
    ...ic, baslik: 'Raporlar', alt: ic.alt,
    html: `<div class="rm-sekme" id="rm-sek">${sekmeler(RAPOR_SEKMELERI, sekme, 'rapor')}</div>${ic.html}`,
    baglan(k) {
      k.addEventListener('click', ev => { const s = ev.target.closest('[data-rapor]'); if (s) location.hash = '#/raporlar/' + s.dataset.rapor; });
      if (ic.baglan) ic.baglan(k);
    },
  };
}
