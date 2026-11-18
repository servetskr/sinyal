// SRC ders programı ekranları (DIR-044): grubun SRC programı, sayaç, ders ekleme, otomatik doldurma ve MEBBİS'e gönderilecek liste.
// Dersler teorik derslerle aynı koleksiyonda (S.teorik) durur, srcModul alanıyla ayrılır: yoklama ve ders defteri aynı çalışır.
// MEBBİS'e yazmaz; liste yalnız gösterilir (MEBBİS Özel Mesleki Yeterlilik modülüne girilecek satırlar).
import { S, kaydet, gun, fark, islem, kapaliGun, derslikListesi, geriAlNoktasi } from './veri.js?v=234';
import { e, pencere, kapatPencere, bildir, isaret, tarih, belgeYazdir, csvIndir, onaySor } from './ui.js?v=234';
import * as SRC from './src.js?v=234';

const EGITICI_AD = { ulasim: 'Trafik/ulaşım', hukuk: 'Hukuk/iktisat', psikoloji: 'Psikoloji', ilkyardim: 'İlk yardım eğitmeni' };
const ogretmenBul = id => (S.ogretmenler || []).find(o => o.id === id) || null;
const kisiSay = g => (S.kursiyerler || []).filter(k => k.teorikGrup === g.id && !k.kapali).length;
const saatNo = s => +String(s || '').slice(0, 2);
const trT = t => t ? t.split('-').reverse().join('.') : '';
const hazirlik = g => { const kod = SRC.srcProgramKodu(g), prog = SRC.srcProgrami(kod), ders = SRC.srcDersleri(g, S.teorik); return { kod, prog, ders, say: SRC.srcSayac(prog, ders) }; };
const gunToplam = (g, t) => (S.teorik || []).filter(x => x.grup === g.id && x.tarih === t).reduce((a, x) => a + (+x.sure || 1), 0);
const cakisir = (x, t, bas, sure) => x.tarih === t && saatNo(x.saat) < bas + sure && bas < saatNo(x.saat) + (+x.sure || 1);

// Grup kartındaki kısa sayaç metni ("SRC2 · 12/36 saat"); programı seçilmemiş grupta boş
export function srcKartMetni(g) {
  const { kod, say } = hazirlik(g); if (!kod) return 'SRC programı seçilmedi';
  return `${kod} · ${say.atanan}/${say.toplam} saat`;
}
export const srcToplam = g => { const p = SRC.srcProgrami(SRC.srcProgramKodu(g)); return p ? p.toplam : 0; };

/* ---------- program penceresi: sayaç, öğretici sayacı, dersler ---------- */
export function srcProgramPencere(g, sonra) {
  const { kod, prog, ders, say } = hazirlik(g);
  if (!prog) return programSec(g, sonra);
  const adlar = SRC.srcDersAdlari(prog, ders);
  const tablo = `<div class="tablo-kap"><table class="tablo"><thead><tr><th>Ders grubu (ünite)</th><th>Toplam</th><th>Atanan</th><th>Kalan</th><th>Öğretici niteliği</th></tr></thead><tbody>
    ${say.satir.map(m => `<tr><td><b>${e(m.kod)}.</b> ${e(m.ad)}</td><td>${m.saat}</td><td>${m.atanan}${m.telafi ? ` <small style="color:var(--soluk)">+${m.telafi} telafi</small>` : ''}</td><td>${m.fazla ? `<span style="color:var(--kirmizi)">${m.fazla} fazla</span>` : m.kalan ? `<b style="color:#8a5a00">${m.kalan}</b>` : '✓'}</td><td title="${e(SRC.SRC_EGITICI[m.egitici])}"><small>${e(EGITICI_AD[m.egitici])}</small></td></tr>`).join('')}
    <tr><td><b>Toplam</b></td><td><b>${say.toplam}</b></td><td><b>${say.atanan}</b></td><td><b>${say.kalan || '✓'}</b></td><td></td></tr></tbody></table></div>`;
  const ogr = Object.entries(say.ogretici).map(([id, n]) => `${e((ogretmenBul(id) || { ad: 'Silinmiş öğretici' }).ad)} <b>${n}</b> saat`).join(' · ');
  const liste = ders.length ? `<ul class="liste" style="margin-top:6px">${ders.map(t => { const o = ogretmenBul(t.ogretmen); return `<li><span class="zaman">${e(t.saat)}</span><div style="flex:1;min-width:0"><b style="color:var(--murekkep)">${e(adlar[t.id])}</b><small style="display:block;color:var(--soluk)">${trT(t.tarih)} · ${+t.sure || 1} saat · ${e(o ? o.ad : 'öğretici yok')} · ${e(t.salon || 'derslik yok')}${t.egitimTuru === 'telafi' ? ' · telafi' : ''}</small></div>${t.meb || t.yoklama ? '' : `<button class="dg dg-hafif dg-kucuk" data-src-sil="${e(t.id)}" aria-label="Dersi sil">Sil</button>`}</li>`; }).join('')}</ul>` : `<p style="color:var(--soluk)">Henüz ders yok. “Otomatik doldur” bütün programı günlere dağıtır; “Ders ekle” tek tek ekler.</p>`;
  pencere({
    baslik: `${g.ad} · SRC ders programı`, genis: true,
    icerik: `<p class="ipucu">${isaret('bilgi', 18)}<span><b>${e(prog.ad)}</b> sürücü mesleki yeterlilik kurs programı · TTK ${e(prog.karar)} · toplam ${prog.toplam} ders saati, yalnız teorik. Günde hafta içi 2–6, hafta sonu 2–8 ders saati.</span></p>
      ${!say.atanan ? '' : say.eksik.length ? `<p class="ipucu uyari" style="margin-top:8px">${isaret('uyari', 18)}<span>Ders programında eksik ders kaydı kalmıştır: ${e(say.eksik.map(m => `${m.kod} ${m.kalan} saat`).join(', '))}.</span></p>` : `<p class="ipucu" style="margin-top:8px">${isaret('tamam', 18)}<span>Bütün üniteler resmî saatleriyle planlandı.</span></p>`}
      <div style="margin-top:12px">${tablo}</div>
      ${ogr ? `<p style="margin-top:10px;font-size:14px"><span style="color:var(--soluk)">Öğretici sayacı:</span> ${ogr}</p>` : ''}
      <h4 style="margin-top:16px">Dersler (${ders.length})</h4>${liste}
      <p style="margin-top:12px;font-size:13px;color:var(--soluk)">Program ${e(kod)} · <button type="button" class="dg dg-hafif dg-kucuk" data-src-degis>Programı değiştir</button></p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Kapat</button><button class="dg dg-cizgi" data-src-meb>MEBBİS listesi</button><button class="dg dg-cizgi" data-src-oto ${say.kalan ? '' : 'disabled'}>Otomatik doldur</button><button class="dg dg-ana" data-src-ekle>Ders ekle</button>`,
    onAc(p) {
      const yeniden = () => { sonra && sonra(); srcProgramPencere(g, sonra); };
      p.addEventListener('click', async ev => {
        if (ev.target.closest('[data-src-ekle]')) { kapatPencere(); return srcDersPencere(g, yeniden); }
        if (ev.target.closest('[data-src-oto]')) { kapatPencere(); return srcOtoPencere(g, yeniden); }
        if (ev.target.closest('[data-src-meb]')) { kapatPencere(); return srcMebPencere(g, () => srcProgramPencere(g, sonra)); }
        if (ev.target.closest('[data-src-degis]')) { if (ders.length) return bildir('Grubun SRC dersleri varken program değiştirilemez; önce dersleri silin', 'uyari'); kapatPencere(); return programSec(g, sonra, true); }
        const s = ev.target.closest('[data-src-sil]'); if (s) {
          const t = (S.teorik || []).find(x => x.id === s.dataset.srcSil); if (!t) return;
          if (!await onaySor(`${trT(t.tarih)} ${t.saat} · ${adlar[t.id]} dersi silinsin mi?`, { evet: 'Sil', tehlike: true })) return;
          geriAlNoktasi(); S.teorik = S.teorik.filter(x => x !== t); islem('SRC dersini sildi', `${g.ad} · ${adlar[t.id]} · ${trT(t.tarih)}`); kaydet(); kapatPencere(); bildir('Ders silindi', 'tamam', true); yeniden();
        }
      });
    },
  });
}

// Grubun sınıfı SRC1–4 değilse (ör. "Bütün sınıflar") program bir kez seçilir ve grupta saklanır
function programSec(g, sonra, degis) {
  const kodlar = Object.keys(SRC.SRC_PROGRAMLARI);
  pencere({
    baslik: `${g.ad} · SRC programı seçin`,
    icerik: `<p>${degis ? 'Grubun izleyeceği SRC programını seçin.' : 'Bu grubun sınıfı belirli bir SRC programı değil. Grubun izleyeceği resmî programı seçin; ders grupları ve saatler buna göre gelir.'}</p>
      <div class="secim" style="margin-top:10px;display:grid;gap:6px">${kodlar.map(k => { const p = SRC.SRC_PROGRAMLARI[k]; return `<label><input type="radio" name="src-p" value="${k}" ${SRC.srcProgramKodu(g) === k ? 'checked' : ''}><span>${e(p.ad)} · ${p.toplam} saat</span></label>`; }).join('')}</div>
      <p style="margin-top:10px;font-size:13px;color:var(--soluk)">SRC5 (tehlikeli madde) ve SRC Kurye için resmî MEB programı bu sürümde yok.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-src-sec>Seç</button>`,
    onAc(p) {
      p.querySelector('[data-src-sec]').addEventListener('click', () => {
        const v = p.querySelector('[name=src-p]:checked'); if (!v) return bildir('Bir program seçin', 'uyari');
        if (SRC.SRC_PROGRAMLARI[g.sinif] && g.sinif !== v.value) return bildir(`Grubun sınıfı ${g.sinif}; programı değiştirmek için grubun sınıfını değiştirin`, 'uyari');
        g.srcProgram = v.value; islem('SRC programını seçti', `${g.ad} · ${v.value}`); kaydet(); kapatPencere(); sonra && sonra(); srcProgramPencere(g, sonra);
      });
    },
  });
}

/* ---------- tek ünite için ders ekleme ---------- */
export function srcDersPencere(g, sonra) {
  const { prog, say } = hazirlik(g);
  if (!prog) return programSec(g, sonra);
  const og = S.ogretmenler || [], ilk = say.satir.find(m => m.kalan > 0) || say.satir[0];
  if (!og.length) return pencere({ baslik: g.ad + ' · SRC dersi', icerik: '<p>SRC dersi eklemek için önce bir öğretici ekleyin (Teorik dersler › Öğretmenler).</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
  pencere({
    baslik: g.ad + ' · SRC dersi ekle',
    icerik: `<form id="f-src" class="form-izgara" novalidate>
      <div class="alan tam"><label for="sd-m">Ders grubu (ünite)</label><select id="sd-m" name="modul">${say.satir.map(m => `<option value="${e(m.kod)}" ${m === ilk ? 'selected' : ''}>${e(SRC.modulAdi(m))} · ${m.kalan ? m.kalan + ' saat kaldı' : 'tamam'}</option>`).join('')}</select></div>
      <p class="tam" id="sd-ad" style="font-size:14px;color:var(--metin)"></p>
      <div class="alan"><label for="sd-o">Öğretici</label><select id="sd-o" name="ogretmen"><option value="">Seçin</option>${og.map(o => `<option value="${e(o.id)}">${e(o.ad)}${o.calismaIzinNo ? '' : ' · izin no yok'}</option>`).join('')}</select></div>
      <div class="alan"><label for="sd-dl">Derslik</label><input id="sd-dl" name="derslik" value="${e(g.derslik || '')}" placeholder="Derslik 1" list="sd-dl-l"><datalist id="sd-dl-l">${derslikListesi().map(x => `<option value="${e(x.ad)}">`).join('')}</datalist></div>
      <small class="tam" id="sd-nit" style="color:var(--soluk)"></small>
      <div class="alan"><label for="sd-t">İlk ders günü</label><input id="sd-t" name="tarih" type="date" value="${e(g.baslangic && fark(g.baslangic) >= 0 ? g.baslangic : gun(1))}"></div>
      <div class="alan"><label for="sd-s">Başlangıç saati</label><select id="sd-s" name="saat">${Array.from({ length: 16 }, (_, i) => String(7 + i).padStart(2, '0') + ':00').map(x => `<option ${x === '18:00' ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="alan"><label for="sd-u">Kaç saat</label><select id="sd-u" name="sure">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}">${n} saat</option>`).join('')}</select></div>
      <div class="alan"><label for="sd-g">Kaç gün</label><select id="sd-g" name="tekrar">${[1, 2, 3, 4, 5].map(n => `<option value="${n}">${n === 1 ? 'Yalnız bu gün' : n + ' gün art arda'}</option>`).join('')}</select></div>
      <div class="alan"><label for="sd-e">Eğitim türü</label><select id="sd-e" name="egitim"><option value="normal">Normal</option><option value="telafi">Telafi eğitimi</option></select></div>
      <label class="tam" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="haftasonu" checked style="width:18px;height:18px"> Hafta sonu da ders yapılır</label>
      <div id="sd-uyari" class="tam" style="display:grid;gap:6px"></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-src">Dersleri ekle</button>`,
    onAc(dl) {
      const f = dl.querySelector('form'), m = () => say.satir.find(x => x.kod === f.modul.value);
      const gunler = () => { const l = [], d0 = new Date(f.tarih.value + 'T12:00:00'); let n = +f.tekrar.value; for (let i = 0; n > 0 && i < 30; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const hs = d.getDay() === 0 || d.getDay() === 6; if (!f.haftasonu.checked && hs) continue; const kp = kapaliGun(t); if (kp && kp !== 'Pazar') continue; l.push(t); n--; } return l; };
      const denetle = () => {
        const l = f.tarih.value ? gunler() : [], bas = saatNo(f.saat.value), sure = +f.sure.value, mm = m(), engel = [], uyari = [];
        if (!l.length) engel.push('İlk ders gününü seçin.');
        if (bas + sure > 23) engel.push('Dersler 23:00’e kadar bitmeli.');
        if (f.egitim.value !== 'telafi' && mm && l.length * sure > mm.kalan) engel.push(`${mm.kod} ünitesinin resmî süresi ${mm.saat} saat, ${mm.kalan} saat kaldı; ${l.length * sure} saat eklenemez.`);
        if (l[0] && g.baslangic && l[0] < g.baslangic) engel.push(`Dersler grubun başlangıcından (${tarih(g.baslangic)}) önce olamaz.`);
        const c = l.filter(t => (S.teorik || []).some(x => x.grup === g.id && cakisir(x, t, bas, sure))); if (c.length) engel.push(`${c.length} günde bu saatlerde grubun dersi var: ${c.map(trT).join(', ')}.`);
        if (f.ogretmen.value) {
          const oc = l.filter(t => (S.teorik || []).some(x => x.ogretmen === f.ogretmen.value && x.grup !== g.id && cakisir(x, t, bas, sure))); if (oc.length) engel.push(`Öğretici bu saatlerde başka grupta derste: ${oc.map(trT).join(', ')}.`);
          const o = ogretmenBul(f.ogretmen.value), bit = o && (o.mebIzinBitis || (o.meb || {}).izinBit); if (bit && l.some(t => t > bit)) engel.push(`${o.ad}: çalışma izni ${tarih(bit)} günü bitiyor.`);
        }
        l.forEach(t => { const top = gunToplam(g, t) + sure, [, ec] = SRC.gunSiniri(t), msg = SRC.srcGunKontrol(t, top); if (msg) (top > ec ? engel : uyari).push(msg); });
        return { l, bas, sure, engel, uyari };
      };
      const yaz = () => {
        const mm = m(), d = denetle(), sira = (mm ? mm.atanan : 0) + 1;
        dl.querySelector('#sd-ad').innerHTML = mm ? `Ders adı (otomatik): <b>${e(SRC.modulAdi(mm))} · ${f.egitim.value === 'telafi' ? 'telafi' : sira + (d.sure > 1 ? '–' + (sira + d.sure - 1) : '') + '/' + mm.saat + '. saat'}</b>` : '';
        dl.querySelector('#sd-nit').textContent = mm ? 'Öğretici niteliği (programa göre): ' + SRC.SRC_EGITICI[mm.egitici] : '';
        dl.querySelector('#sd-uyari').innerHTML = d.engel.map(x => `<p class="ipucu uyari">${isaret('dur', 18)}<span>${e(x)}</span></p>`).join('') + d.uyari.map(x => `<p class="ipucu">${isaret('uyari', 18)}<span>${e(x)} Gün içinde başka ünite eklenince tamamlanır.</span></p>`).join('');
      };
      f.addEventListener('change', yaz); f.addEventListener('input', yaz); yaz();
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        if (!f.modul.value || !f.ogretmen.value || !f.derslik.value.trim()) return bildir('Ders grubu, öğretici ve derslik seçilmeden ders eklenmez', 'uyari');
        const d = denetle(); if (d.engel.length) { yaz(); return bildir(d.engel[0], 'uyari'); }
        const mm = m(), z = Date.now(); geriAlNoktasi(); S.teorik = S.teorik || [];
        d.l.forEach((t, i) => S.teorik.push({ id: 't' + z + i, tarih: t, saat: String(d.bas).padStart(2, '0') + ':00', sure: d.sure, konu: SRC.modulAdi(mm), srcModul: mm.kod, salon: f.derslik.value.trim(), grup: g.id, ogretmen: f.ogretmen.value, katilim: 0, mevcut: kisiSay(g), ...(f.egitim.value === 'telafi' ? { egitimTuru: 'telafi' } : {}) }));
        islem('SRC dersi planladı', `${g.ad} · ${SRC.modulAdi(mm)} · ${d.l.length} gün × ${d.sure} saat`); kaydet(); kapatPencere();
        bildir(`${d.l.length * d.sure} saat ${mm.kod} ünitesi dersi eklendi`, 'tamam'); sonra && sonra();
      });
    },
  });
}

/* ---------- otomatik doldurma: kalan saatleri ünite sırasıyla günlere dağıtır ---------- */
export function srcOtoPencere(g, sonra) {
  const { prog, say } = hazirlik(g);
  if (!prog) return programSec(g, sonra);
  const og = S.ogretmenler || [], gruplar = [...new Set(say.satir.filter(m => m.kalan > 0).map(m => m.egitici))];
  if (!og.length) return pencere({ baslik: g.ad + ' · SRC programı', icerik: '<p>Önce bir öğretici ekleyin (Teorik dersler › Öğretmenler).</p>', altlik: '<button class="dg dg-cizgi" data-kapat>Kapat</button>' });
  pencere({
    baslik: g.ad + ' · SRC programını otomatik doldur', genis: true,
    icerik: `<form id="f-srco" class="form-izgara" novalidate>
      <p class="ipucu tam">${isaret('bilgi', 18)}<span>Kalan ${say.kalan} saat, ünite sırasıyla (A, B, C, Ç, D…) günlere dağıtılır. Grubun dersi olan günler ve resmî tatiller atlanır. Eklemeden önce önizleme görünür.</span></p>
      <div class="alan"><label for="so-t">İlk ders günü</label><input id="so-t" name="tarih" type="date" value="${e(g.baslangic && fark(g.baslangic) >= 0 ? g.baslangic : gun(1))}"></div>
      <div class="alan"><label for="so-s">Başlangıç saati</label><select id="so-s" name="saat">${Array.from({ length: 15 }, (_, i) => String(7 + i).padStart(2, '0') + ':00').map(x => `<option ${x === '18:00' ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="alan"><label for="so-g">Günde kaç saat</label><select id="so-g" name="gunluk">${[2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${n === 4 ? 'selected' : ''}>${n} saat${n > 6 ? ' (yalnız hafta sonu)' : ''}</option>`).join('')}</select></div>
      <div class="alan"><label for="so-dl">Derslik</label><input id="so-dl" name="derslik" value="${e(g.derslik || '')}" placeholder="Derslik 1" list="so-dl-l"><datalist id="so-dl-l">${derslikListesi().map(x => `<option value="${e(x.ad)}">`).join('')}</datalist></div>
      <label class="tam" style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="haftasonu" checked style="width:18px;height:18px"> Hafta sonu da ders yapılır</label>
      ${gruplar.map(k => `<div class="alan"><label for="so-o-${k}">Öğretici · ${e(EGITICI_AD[k])}</label><select id="so-o-${k}" name="o_${k}"><option value="">Seçin</option>${og.map(o => `<option value="${e(o.id)}">${e(o.ad)}</option>`).join('')}</select><small style="color:var(--soluk)">${(u => `${e(u.join(', '))} ${u.length > 1 ? 'üniteleri' : 'ünitesi'}`)(say.satir.filter(m => m.egitici === k && m.kalan).map(m => m.kod))}</small></div>`).join('')}
      <div id="so-on" class="tam"></div></form>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" type="submit" form="f-srco">Programı ekle</button>`,
    onAc(dl) {
      const f = dl.querySelector('form');
      const oner = () => f.tarih.value ? SRC.srcPlanOner(prog, say, { bas: f.tarih.value, saat: saatNo(f.saat.value), gunluk: +f.gunluk.value, haftasonu: f.haftasonu.checked, doluGun: (S.teorik || []).filter(x => x.grup === g.id).map(x => x.tarih), kapali: kapaliGun }) : [];
      const yaz = () => {
        const l = oner(), gunSay = new Set(l.map(x => x.tarih)).size;
        dl.querySelector('#so-on').innerHTML = l.length ? `<p style="font-size:14px;margin-bottom:6px"><b>${gunSay} gün</b> · ${l.reduce((a, x) => a + x.sure, 0)} saat · ${trT(l[0].tarih)} – ${trT(l[l.length - 1].tarih)}</p><div class="tablo-kap" style="max-height:260px;overflow:auto"><table class="tablo"><thead><tr><th>Gün</th><th>Saat</th><th>Ünite</th><th>Süre</th></tr></thead><tbody>${l.map(x => `<tr><td>${trT(x.tarih)}</td><td>${x.saat}</td><td>${e(SRC.modulAdi(SRC.modulBul(prog, x.srcModul)))}</td><td>${x.sure}</td></tr>`).join('')}</tbody></table></div>` : '<p style="color:var(--soluk)">İlk ders gününü seçin.</p>';
      };
      f.addEventListener('change', yaz); f.addEventListener('input', yaz); yaz();
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const l = oner(); if (!l.length) return bildir('İlk ders gününü seçin', 'uyari');
        if (!f.derslik.value.trim()) return bildir('Derslik seçilmeden program eklenmez', 'uyari');
        const eksik = gruplar.filter(k => !f['o_' + k].value); if (eksik.length) return bildir(`Öğretici seçin: ${eksik.map(k => EGITICI_AD[k]).join(', ')}`, 'uyari');
        if (g.baslangic && l[0].tarih < g.baslangic) return bildir(`Dersler grubun başlangıcından (${tarih(g.baslangic)}) önce olamaz`, 'uyari');
        const ogrOf = kod => f['o_' + SRC.modulBul(prog, kod).egitici].value;
        const oc = l.filter(x => (S.teorik || []).some(y => y.ogretmen === ogrOf(x.srcModul) && y.grup !== g.id && cakisir(y, x.tarih, saatNo(x.saat), x.sure)));
        if (oc.length) return bildir(`Öğretici ${oc.length} derste başka grupta derste (${trT(oc[0].tarih)} ${oc[0].saat}); başka saat ya da öğretici seçin`, 'uyari');
        const z = Date.now(); geriAlNoktasi(); S.teorik = S.teorik || [];
        l.forEach((x, i) => S.teorik.push({ id: 't' + z + i, tarih: x.tarih, saat: x.saat, sure: x.sure, konu: SRC.modulAdi(SRC.modulBul(prog, x.srcModul)), srcModul: x.srcModul, salon: f.derslik.value.trim(), grup: g.id, ogretmen: ogrOf(x.srcModul), katilim: 0, mevcut: kisiSay(g) }));
        islem('SRC programını otomatik doldurdu', `${g.ad} · ${l.length} ders · ${l.reduce((a, x) => a + x.sure, 0)} saat`); kaydet(); kapatPencere();
        bildir(`${l.reduce((a, x) => a + x.sure, 0)} saat SRC dersi eklendi`, 'tamam'); sonra && sonra();
      });
    },
  });
}

/* ---------- MEBBİS'e gönderilecek liste (yalnız görüntü) ---------- */
export function srcMebPencere(g, geri) {
  const { kod, prog, ders, say } = hazirlik(g);
  if (!prog) return programSec(g, geri);
  const l = SRC.srcMebListesi(prog, ders, ogretmenBul), bugun = gun(0);
  const izinsiz = [...new Set(l.filter(x => x.ogretici && !x.izinNo).map(x => x.ogretici))], gecmis = l.filter(x => x.tarih <= bugun && !x.gonderildi).length;
  const uyar = [
    say.eksik.length ? `Ders programında eksik ders kaydı kalmıştır: ${say.eksik.map(m => `${m.kod} ${m.kalan} saat`).join(', ')}.` : '',
    say.fazla ? `${say.fazla} saat resmî ünite süresini aşıyor.` : '',
    izinsiz.length ? `MEBBİS izin numarası girilmemiş öğretici: ${izinsiz.join(', ')} (MEBBİS'te öğretici izin no ile seçilir).` : '',
    gecmis ? `${gecmis} satırın tarihi bugün ya da geçmiş; MEBBİS'e ders gününden önce girilir.` : '',
  ].filter(Boolean);
  const html = `<table class="tablo"><thead><tr><th>Tarih</th><th>Saat</th><th>Ders grubu</th><th>Ders adı</th><th>Öğretici</th><th>Derslik</th><th>Tür</th></tr></thead><tbody>${l.map(x => `<tr${x.gonderildi ? ' style="opacity:.6"' : ''}><td>${trT(x.tarih)}</td><td>${x.saat}</td><td>${e(x.grup)}</td><td>${e(x.dersAdi)}</td><td>${e(x.ogretici)}${x.izinNo ? ` <small>(${e(x.izinNo)})</small>` : ''}</td><td>${e(x.derslik)}</td><td>${x.tur}</td></tr>`).join('')}</tbody></table>`;
  pencere({
    baslik: `${g.ad} · MEBBİS’e gönderilecek liste`, genis: true,
    icerik: `<p class="ipucu">${isaret('bilgi', 18)}<span>${e(kod)} programı, ${l.length} ders saati satırı (MEBBİS dilimi 50 dk). mdSinyal bu listeyi MEBBİS’e yazmaz; MEBBİS Özel Mesleki Yeterlilik modülüne bu sırayla girilir.</span></p>
      ${uyar.map(x => `<p class="ipucu uyari" style="margin-top:8px">${isaret('uyari', 18)}<span>${e(x)}</span></p>`).join('')}
      ${l.length ? `<div class="tablo-kap" style="margin-top:12px">${html}</div>` : '<p style="margin-top:12px;color:var(--soluk)">Henüz ders yok.</p>'}`,
    altlik: `<button class="dg dg-cizgi" data-geri>Programa dön</button><button class="dg dg-cizgi" data-csv ${l.length ? '' : 'disabled'}>Excel (CSV)</button><button class="dg dg-ana" data-yazdir ${l.length ? '' : 'disabled'}>Yazdır</button>`,
    onAc(p) {
      p.querySelector('[data-geri]').addEventListener('click', () => { kapatPencere(); geri && geri(); });
      p.querySelector('[data-yazdir]').addEventListener('click', () => belgeYazdir(`<h2>${e(g.ad)} · ${e(prog.ad)} · SRC ders programı</h2>${uyar.map(x => `<p>${e(x)}</p>`).join('')}${html}`, 'SRC ders programı'));
      p.querySelector('[data-csv]').addEventListener('click', () => csvIndir(`src-ders-programi-${g.id}.csv`, [['Tarih', 'Saat', 'Ders grubu', 'Ders adı', 'Öğretici', 'İzin no', 'Derslik', 'Tür'], ...l.map(x => [trT(x.tarih), x.saat, x.grup, x.dersAdi, x.ogretici, x.izinNo, x.derslik, x.tur])]));
    },
  });
}
