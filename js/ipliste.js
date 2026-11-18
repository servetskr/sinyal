// YON-021: IP yetkilendirme — ön büroyu kurs bilgisayarına bağlama. S.kurs.ipListe = { acik, kayitlar: [{ id, ip, kim: 'hepsi' | kullanıcı kimliği, not, aktif }] }.
// DENETİM K6: güvenlik önlemi değil, hatırlatma (ekranda yazar). Kurs müdürü her IP'den girer. Ön büro girişte denetlenir: liste açık ve kişiye (ya da 'tüm ön büro'ya) ait etkin kayıt varsa IP bunlardan biri olmalı.
// IP'yi worker'ın /ip ucu verir (CF-Connecting-IP; kayıt tutulmaz). Worker'a ulaşılamazsa giriş engellenmez, işlem kaydına yazılır (kurs dışarıda kilitli kalmasın).
import { S, kaydet, islem, oturum } from './veri.js?v=234';
import { e, bildir, ik, isaret, onaySor } from './ui.js?v=234';
import { WORKER } from './bulut.js?v=234';

const liste = () => (S.kurs && S.kurs.ipListe) || { acik: false, kayitlar: [] };
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]{3,39}$/i;
export async function benimIp() { try { const r = await fetch(WORKER + '/ip', { cache: 'no-store' }); const j = await r.json(); return j && j.ok ? String(j.ip || '') : ''; } catch (x) { return ''; } }
const kimAd = kim => kim === 'hepsi' ? 'Bütün ön büro' : ((S.kullanicilar || []).find(u => String(u.id || u.uid) === kim) || {}).ad || 'Kaldırılmış kullanıcı';
export function ipKarti() {
  const u = oturum.kullanici; if (!u || u.rol !== 'mudur') return '';
  const L = liste(), onb = (S.kullanicilar || []).filter(x => x.rol === 'sekreter');
  return `<div class="kart" style="margin-top:16px"><div class="kart-bas"><h3>IP yetkilendirme</h3><small>Ön büro yalnız listedeki internet adreslerinden girer · kurs müdürü her yerden</small>
      <div class="sag"><label class="anahtar" title="IP denetimini aç / kapat"><input type="checkbox" data-ip-acik ${L.acik ? 'checked' : ''}><i></i></label></div></div>
    <ul class="liste">${L.kayitlar.map(x => `<li><div style="flex:1;min-width:0"><b class="mono" style="color:var(--murekkep)">${e(x.ip)}</b>${x.aktif ? '' : ' <span class="rozet rozet-uyari">duraklatıldı</span>'}<small style="display:block;color:var(--soluk)">${e(kimAd(x.kim))}${x.not ? ' · ' + e(x.not) : ''}</small></div>
      <span class="sag"><button class="dg dg-hafif dg-kucuk" data-ip-duraklat="${e(x.id)}">${x.aktif ? 'Duraklat' : 'Başlat'}</button><button class="dg dg-hafif dg-kucuk" data-ip-sil="${e(x.id)}" style="color:var(--kirmizi)">Sil</button></span></li>`).join('') || '<li><small style="color:var(--soluk)">Kayıt yok. Liste boşken denetim açık olsa da kimse engellenmez.</small></li>'}</ul>
    <form data-ip-ekle class="kart-govde" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;border-top:1px solid var(--cizgi-2)">
      <label class="vr-alan"><span>IP adresi</span><input class="girdi mono" name="ip" required maxlength="39" placeholder="Yükleniyor…" data-ip-simdiki style="width:170px"></label>
      <label class="vr-alan"><span>Kullanıcı</span><select class="girdi" name="kim"><option value="hepsi">Bütün ön büro</option>${onb.map(x => `<option value="${e(String(x.id || x.uid))}">${e(x.ad)}</option>`).join('')}</select></label>
      <label class="vr-alan" style="flex:1;min-width:140px"><span>Not</span><input class="girdi" name="not" maxlength="60" placeholder="Ör. ön büro bilgisayarı"></label>
      <button class="dg dg-cizgi" type="submit">${ik('arti')}Ekle</button></form>
    <p class="ipucu" style="margin:0 20px 10px">${isaret('bilgi', 18)}<span><b>Bu bir hatırlatmadır, güvenlik önlemi değildir.</b> Denetim tarayıcıda yapılır; IP adresi öğrenilemezse (internet kesintisi gibi) giriş engellenmez, işlem kaydına yazılır. Ön büroyu gerçekten sınırlamak için kullanıcının şifresini ve hesabını yönetin.</span></p>
    <p style="font-size:12.5px;color:var(--soluk);padding:0 20px 14px">Yeni kayıtta bu bilgisayarın şu anki IP adresi dolu gelir. Kurs internetinin IP’si sağlayıcıya göre zamanla değişebilir; değişirse ön büro girişte uyarı görür, buradan güncellersiniz.</p></div>`;
}
export function ipBagla(k) {
  const al = k.querySelector('[data-ip-simdiki]'); if (al) benimIp().then(ip => { al.placeholder = ip ? '' : 'Ör. 88.230.12.34'; if (ip && !al.value) al.value = ip; });
  const yaz = (ne, ay) => { islem(ne, ay); kaydet(); };
  k.addEventListener('change', ev => { const c = ev.target.closest('[data-ip-acik]'); if (!c) return; S.kurs.ipListe = { ...liste(), acik: c.checked }; yaz(c.checked ? 'IP yetkilendirmeyi açtı' : 'IP yetkilendirmeyi kapattı', liste().kayitlar.length + ' kayıt'); bildir(c.checked ? 'Ön büro yalnız listedeki IP’lerden girer' : 'IP denetimi kapandı'); });
  k.addEventListener('submit', ev => { const f = ev.target.closest('[data-ip-ekle]'); if (!f) return; ev.preventDefault();
    const ip = f.ip.value.trim(); if (!IP_RE.test(ip)) return bildir('Geçerli bir IP adresi yazın (ör. 88.230.12.34)', 'uyari');
    const L = liste(); if (L.kayitlar.some(x => x.ip === ip && x.kim === f.kim.value)) return bildir('Bu kayıt zaten var', 'uyari');
    S.kurs.ipListe = { ...L, kayitlar: [...L.kayitlar, { id: 'ip' + Date.now().toString(36), ip, kim: f.kim.value, not: f.not.value.trim(), aktif: true }] }; yaz('IP yetkisi ekledi', ip + ' · ' + kimAd(f.kim.value)); import('./app.js?v=234').then(m => m.yenile()); });
  k.addEventListener('click', async ev => { const d = ev.target.closest('[data-ip-duraklat],[data-ip-sil]'); if (!d) return; const L = liste(), id = d.dataset.ipDuraklat || d.dataset.ipSil, x = L.kayitlar.find(y => y.id === id); if (!x) return;
    if (d.dataset.ipSil) { if (!(await onaySor(x.ip + ' · ' + kimAd(x.kim), { baslik: 'IP yetkisi silinsin mi?', evet: 'Sil', tehlike: true }))) return; S.kurs.ipListe = { ...L, kayitlar: L.kayitlar.filter(y => y.id !== id) }; yaz('IP yetkisini sildi', x.ip + ' · ' + kimAd(x.kim)); }
    else { S.kurs.ipListe = { ...L, kayitlar: L.kayitlar.map(y => y.id === id ? { ...y, aktif: !y.aktif } : y) }; yaz(x.aktif ? 'IP yetkisini duraklattı' : 'IP yetkisini başlattı', x.ip); }
    import('./app.js?v=234').then(m => m.yenile()); });
}
// ön büro girişinde: izin yoksa { izin: false, ip }; denetim gerekmiyorsa ya da IP öğrenilemediyse izin verilir
export async function ipDenetle() {
  const u = oturum.kullanici, L = liste(); if (!u || u.rol !== 'sekreter' || !L.acik) return { izin: true };
  const kim = String(u.id || u.uid || ''), ilgili = L.kayitlar.filter(x => x.aktif && (x.kim === 'hepsi' || x.kim === kim)); if (!ilgili.length) return { izin: true };
  const ip = await benimIp(); if (!ip) { islem('IP denetlenemedi', 'IP adresi öğrenilemedi; giriş engellenmedi'); kaydet(); return { izin: true, bilinmiyor: true };
  }
  return ilgili.some(x => x.ip === ip) ? { izin: true, ip } : { izin: false, ip };
}
