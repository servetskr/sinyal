import { S, kaydet, gun, islem } from './veri.js';
import { e, ik, rozet, isaret, ekranNotu, sekmeler, olcumler, yonLevhasi, cubukGrafik, halka, pencere, kapatPencere, bildir, sayi, tl, goreli } from './ui.js';
import { yenile } from './app.js';

/* ================= SOSYAL MEDYA ASİSTANI (DengChat modülü) =================
   Gelen kutusu "Mesajlar"da kalır. Bu modül kanalları bağlar, Instagram
   yorumlarını yönetir, asistanın davranışını ayarlar ve sonucunu ölçer. */

const durum = { sekme: 'ozet', kanal: 'igm', deneme: [] };
const KANAL_IK = { igm: 'ig', igy: 'ig', wp: 'wp', fb: 'fb' };
const KANAL_KISA = { igm: 'Instagram', igy: 'Instagram yorum', wp: 'WhatsApp', fb: 'Facebook' };
const ORT_UCRET = 25_000;

const sos = () => S.sosyal;
const bekleyenDevir = () => sos().yorumlar.filter(y => y.durum === 'devir').length + S.devredilen.length;

/* --- Asistanı dene: kurs bilgilerinden cevap (canlıda dil modeli; demo kural tabanlı) --- */
const KURALLAR = [
  { devir: 'saglik', k: /protez|engel|sağlık sorun|ilaç|hastalı|epilep|şeker hast|görme|duyma/i, n: 'Sağlık durumu' },
  { devir: 'sikayet', k: /rezalet|şikayet|memnun değil|berbat|mağdur|dolandır/i, n: 'Şikâyet' },
  { devir: 'indirim', k: /indirim|pazarlık|son fiyat|kardeş|arkadaşla gel|daha ucuz|başka yerde/i, n: 'İndirim pazarlığı' },
  { devir: 'insan', k: /yetkili|insanla|biriyle görüş|müdür|sizi arayayım|telefonla görüş/i, n: 'Yetkili istedi' },
  { bilgi: 'Süre', k: /kaç gün|kaç ay|ne kadar sür|süre|ne zaman biter|hızlı/i },
  { bilgi: 'Sınav ücretleri', k: /sınav ücret|e-?sınav|harç|tekrar sınav/i },
  { bilgi: 'Fiyat ve taksit', k: /fiyat|ücret|kaç para|ne kadar|taksit|peşin|kredi kart/i },
  { bilgi: 'Evraklar', k: /evrak|belge|rapor|fotoğraf|kimlik|ne lazım|neler gerek/i },
  { bilgi: 'Ders saatleri', k: /saat|akşam|hafta ?sonu|cumartesi|pazar|gündüz|çalışıyorum/i },
];
const TEL = /(\+?90|0)?\s*5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/;

function cevapUret(soru, ilk) {
  const a = sos().ayar, kurs = S.kurs.ad;
  const beyan = ilk ? `Merhaba, ben ${kurs} adına yanıt veren yapay zekâ asistanıyım. ` : '';
  const tel = soru.match(TEL);
  if (tel) return { metin: beyan + 'Teşekkürler, numaranızı aldım. Ekibimiz mesai saatinde sizi arayacak. Ön kaydınızı oluşturdum.', kaynak: 'Aday kaydı', aday: tel[0] };
  if (/kaç yaş|yaş sınır|17 yaş|16 yaş|yaşındayım/i.test(soru)) return { metin: beyan + `Sürücü belgesi için ${S.kurs.asgariYas} yaşını doldurmuş olmak gerekiyor. Bu yaşı doldurduğunuz gün kaydınızı yapabiliriz; numaranızı yazarsanız o tarihte size hatırlatalım.`, kaynak: 'Kurs ayarı: asgari yaş' };
  for (const r of KURALLAR) {
    if (!r.k.test(soru)) continue;
    if (r.devir) {
      if (!a.devir[r.devir]) continue;
      return { metin: beyan + 'Bu konuyu kurs yetkilimizin cevaplaması daha doğru olur. Sizi bir arkadaşıma aktarıyorum; telefon numaranızı yazarsanız daha hızlı ulaşırız.', kaynak: 'Size devredildi · ' + r.n, devir: r.n };
    }
    const b = S.asistanBilgi.find(x => x.konu === r.bilgi);
    if (b) return { metin: beyan + b.metin + (r.bilgi === 'Fiyat ve taksit' ? ' Hangi sınıf için düşünüyorsunuz?' : ''), kaynak: b.konu };
  }
  if (/merhaba|selam|iyi günler|iyi akşamlar/i.test(soru) && soru.length < 25) return { metin: (ilk ? beyan : 'Merhaba! ') + 'Kurs ücreti, evraklar, ders saatleri ya da kayıtla ilgili ne sormak istersiniz?', kaynak: 'Karşılama' };
  if (a.devir.bilinmeyen) return { metin: beyan + 'Bu konuda elimde kesin bilgi yok, yanlış bilgi vermek istemem. Kurs sizi arayacak; telefon numaranızı yazar mısınız?', kaynak: 'Bilinmeyen soru · size devredildi', devir: 'Bilinmeyen soru' };
  return { metin: beyan + 'Bu konuda elimde kesin bilgi yok. Kurs bilgilerine eklenirse hemen cevaplayabilirim.', kaynak: 'Bilinmeyen soru' };
}

/* --- Sekmeler --- */
function ozet() {
  const a = sos().ay, k = sos().kanalDagilim;
  const ciro = a.kayit * ORT_UCRET;
  const saat = sos().saatlik.map((v, i) => ({ e: i % 3 === 0 ? String(i).padStart(2, '0') : '', v, vurgu: i < 9 || i >= 19 }));
  const sonAday = S.adaylar.filter(x => ['Instagram'].includes(x.kanal) || x.kaynak === 'Instagram').slice(0, 5);
  return `${olcumler([
    ['Bu ay gelen mesaj', sayi(a.mesaj), sayi(a.kisi) + ' kişiden'],
    ['Asistanın cevapladığı', '%' + a.otomatik, 'Kalanı size devredildi'],
    ['İlk cevap', a.sure + ' sn', 'Gece dahil, ortalama'],
    ['Mesai dışında gelen', '%' + a.mesaiDisi, '19:00–09:00 arası'],
  ])}
  <div class="ara-bosluk"></div>
  <div class="izgara iz-21">
    <div class="kart"><div class="kart-bas"><h3>Mesajlar hangi saatte geliyor?</h3><small>Bu ay, saat başına · koyu çubuklar mesai dışı</small></div><div class="kart-govde">${cubukGrafik(saat, { yukseklik: 170 })}
      <p style="margin-top:10px;font-size:14px">Mesajların en yoğun olduğu saat <b>21:00</b>. Kurs kapalıyken gelen ${sayi(Math.round(a.mesaj * a.mesaiDisi / 100))} mesajın hepsine ortalama ${a.sure} saniyede cevap verildi.</p></div></div>
    <div class="kart"><div class="kart-bas"><h3>Kanallar</h3><small>Bu ayki mesajlar</small></div><div class="kart-govde" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
      ${halka([{ v: k.igm, renk: '#0a4da2' }, { v: k.igy, renk: '#f2b705' }, { v: k.wp, renk: '#1f7a3e' }, { v: k.fb, renk: '#767c84' }], { boyut: 120, kalinlik: 16, orta: `<b class="mono">${sayi(a.mesaj)}</b>` })}
      <ul style="list-style:none;font-size:14px;display:grid;gap:6px">${[['igm', '#0a4da2'], ['igy', '#f2b705'], ['wp', '#1f7a3e'], ['fb', '#767c84']].map(([id, r]) => `<li style="display:flex;gap:8px;align-items:center"><i style="width:12px;height:12px;border-radius:3px;background:${r}"></i>${KANAL_KISA[id]} <b class="mono" style="margin-left:auto">%${k[id]}</b></li>`).join('')}</ul></div></div>
  </div>
  <div class="ara-bosluk"></div>
  <div class="izgara iz-2">
    <div>${yonLevhasi([
      ['Sohbet başlatan', sayi(a.kisi), '#/mesajlar', 'Instagram, WhatsApp, yorumlar'],
      ['Aday kaydı açılan', sayi(a.aday), '#/adaylar', 'Telefonunu veya kayıt niyetini bıraktı'],
      ['Kayıt görüşmesine gelen', sayi(a.gorusme), '#/adaylar', 'Asistanın ayarladığı randevular'],
      ['Kaydolan', sayi(a.kayit), '#/kursiyerler', 'Yaklaşık ' + tl(ciro) + ' kurs ücreti'],
    ], 'Sosyal medyadan kayda · bu ay')}</div>
    <div class="kart"><div class="kart-bas"><h3>Sosyal medyadan son adaylar</h3><a class="sag dg dg-cizgi dg-kucuk" href="#/adaylar">Tümü</a></div><ul class="liste" style="margin-top:8px">${sonAday.map(x => `<li><a class="kisi" href="#/adaylar/${x.id}" style="flex:1;min-width:0"><div style="min-width:0"><b>${e(x.ad)}</b><small style="display:block;color:var(--soluk);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">“${e(x.mesajlar[0].metin)}”</small></div></a><span class="sag">${rozet(x.asama, x.asama === 'Kayıt' ? 'yesil' : 'mavi')}</span></li>`).join('')}</ul>
      <div style="padding:4px 20px 18px"><a class="dg dg-hafif dg-kucuk" href="#/sosyal/devir">${isaret('uyari', 18)}Size devredilen ${bekleyenDevir()} konuşma</a></div></div>
  </div>`;
}

function kanallar() {
  const l = sos().kanallar;
  return `<div class="izgara iz-2">${l.map(c => `<div class="kart"><div class="kart-bas" style="padding-bottom:4px">${isaret(c.bagli ? 'tamam' : 'uyari', 26)}<div><h3 style="display:flex;gap:6px;align-items:center">${ik(KANAL_IK[c.id])}${e(c.ad)}</h3><small>${c.bagli ? e(c.hesap) + (c.son ? ' · son mesaj ' + e(c.son) : '') : 'Bağlı değil'}</small></div>
      <span class="sag">${c.bagli ? rozet('Bağlı', 'yesil') : `<button class="dg dg-ana dg-kucuk" data-bagla="${c.id}">Bağla</button>`}</span></div>
    ${c.bagli ? `<div class="kart-govde" style="display:grid;gap:12px">
      <label style="display:flex;align-items:center;gap:12px"><span class="anahtar"><input type="checkbox" data-cevap="${c.id}" ${c.cevap ? 'checked' : ''} aria-label="${e(c.ad)} asistan cevaplasın"><i></i></span><span><b style="color:var(--murekkep)">Asistan cevaplasın</b><small style="display:block;color:var(--soluk)">${c.id === 'igy' ? 'Fiyat gibi kişisel sorularda yoruma kısa davet, cevap özelden' : 'Kapalıyken mesajlar yalnızca gelen kutusuna düşer'}</small></span></label>
      <div><span class="et" style="font-size:13px;font-weight:700;color:var(--soluk)">Ne zaman?</span><div class="secim" style="margin-top:6px">${['7/24', 'Mesai dışı'].map(m => `<label><input type="radio" name="mod-${c.id}" value="${m}" data-mod="${c.id}" ${c.mod === m ? 'checked' : ''}><span>${m === '7/24' ? 'Her zaman' : 'Yalnızca mesai dışında'}</span></label>`).join('')}</div></div>
    </div>` : `<div class="kart-govde"><p style="font-size:14px">Bağlandığında bu kanaldan gelen mesajlar da aynı asistanla ve aynı kurs bilgileriyle cevaplanır.</p></div>`}</div>`).join('')}</div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Kurulum nasıl oluyor?</h3><small>Kurulumu biz yapıyoruz, yaklaşık 30 dakika</small></div><ul class="liste" style="margin-top:8px">${[
    ['zorunlu', 'Hesaplar sizin kalır', 'Instagram ve Facebook hesaplarınıza şifrenizi bize vermeden, Meta’nın kendi giriş ekranından izin verirsiniz.'],
    ['zorunlu', 'Kursa özel bağlantı', 'Her kurs için ayrı Meta uygulaması kurulur; başka bir işletmenin onay sürecini beklemezsiniz.'],
    ['zorunlu', 'Asistan kendini tanıtır', 'İlk mesajda yapay zekâ olduğunu söyler. Meta kuralı gereği bu kapatılamaz.'],
    ['bilgi', 'İstediğiniz an siz yazarsınız', 'Telefonunuzdan cevap yazdığınızda asistan o konuşmada susar (Kurallar sekmesinde süre ayarlanır).'],
  ].map(([t, b, a]) => `<li style="align-items:flex-start">${isaret(t, 22)}<div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${a}</small></div></li>`).join('')}</ul></div>`;
}

const YORUM_DURUM = {
  dm: ['Yoruma davet + özelden cevap', 'mavi'],
  acik: ['Herkese açık cevaplandı', 'yesil'],
  devir: ['Size devredildi', 'kirmizi'],
  gizli: ['Gizlendi · reklam', 'notr'],
};
function yorumlar() {
  const g = sos().gonderiler, y = sos().yorumlar;
  return `${olcumler([
    ['Bu hafta yorum', sayi(y.length), 'Son 3 gönderi'],
    ['Cevaplanan', sayi(y.filter(x => x.cevap).length), 'Ortalama 4 dk içinde'],
    ['Özelden devam eden', sayi(y.filter(x => x.durum === 'dm').length), 'Fiyat ve kişisel sorular'],
    ['Size kalan', sayi(y.filter(x => x.durum === 'devir').length), 'Şikâyetler asistana bırakılmaz'],
  ])}<div class="ara-bosluk"></div>
  ${g.map(p => {
    const ly = y.filter(x => x.gonderi === p.id);
    return `<div class="kart gonderi-kart" data-gonderi>
      <figure style="margin:0;background:#000"><img src="${p.gorsel}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;aspect-ratio:4/5;display:block"></figure>
      <div style="min-width:0"><div class="kart-bas" style="padding-bottom:6px"><div style="min-width:0"><b style="color:var(--murekkep)">${e(p.metin)}</b><small style="display:block">${goreli(gun(p.gun))} · ${sayi(p.begeni)} beğeni · ${ly.length} yorum</small></div></div>
      <ul class="liste">${ly.map(x => `<li style="align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:200px"><b style="color:var(--murekkep)">${e(x.kim)}</b> <span>${e(x.metin)}</span><small style="display:block;color:var(--soluk)">${goreli(gun(x.gun))} ${x.saat}</small>
        ${x.cevap ? `<div style="margin-top:6px;padding:6px 10px;background:#fff;border-left:3px solid var(--levha);border-radius:0 6px 6px 0;font-size:13.5px">${ik('robot')} ${e(x.cevap)}</div>` : ''}</div>
        <span class="sag" style="flex-wrap:wrap">${rozet(...YORUM_DURUM[x.durum])}${x.durum === 'devir' ? `<button class="dg dg-ana dg-kucuk" data-yorum-cevap="${x.id}">Cevapla</button>` : ''}${x.durum === 'gizli' ? `<button class="dg dg-cizgi dg-kucuk" data-yorum-goster="${x.id}">Göster</button>` : ''}</span></li>`).join('')}</ul></div></div>`;
  }).join('')}`;
}

function dene() {
  const ilkSoru = ['Fiyat ne kadar?', 'Hangi evraklar lazım?', 'Akşam dersi var mı?', '17 yaşındayım kaydolabilir miyim?', 'Üç kardeş gelirsek indirim olur mu?', 'Sol ayağımda protez var', 'Numaram 0532 111 22 33'];
  const mesajlar = durum.deneme;
  const kanal = durum.kanal;
  return `${ekranNotu('Asistanı müşteri gibi deneyin. Cevaplar yalnızca “Mesajlar › Asistanın bildikleri” sayfasındaki onaylı bilgilerden gelir; bilmediği soruyu uydurmaz, size devreder.')}
  <div class="kart" style="overflow:hidden"><div class="sohbet dene-sohbet">
    <div class="sohbet-liste dene-yan">
      <b style="color:var(--murekkep);font-size:13px;letter-spacing:.06em;text-transform:uppercase">Kanal</b>
      <div class="secim">${['igm', 'wp', 'fb'].map(c => `<label><input type="radio" name="dene-kanal" value="${c}" data-dene-kanal ${kanal === c ? 'checked' : ''}><span>${ik(KANAL_IK[c])}${KANAL_KISA[c]}</span></label>`).join('')}</div>
      <b style="color:var(--murekkep);font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin-top:6px">Hazır sorular</b>
      ${ilkSoru.map(q => `<button class="dg dg-cizgi dg-kucuk" style="justify-content:flex-start;text-align:left;height:auto;min-height:34px;padding:6px 10px;white-space:normal;line-height:1.3" data-hazir="${e(q)}">${e(q)}</button>`).join('')}
      <button class="dg dg-hafif dg-kucuk" style="margin-top:auto" data-dene-sifirla>${ik('sifirla')}Sohbeti temizle</button>
    </div>
    <div class="sohbet-pencere"><div class="sohbet-ust">${ik(KANAL_IK[kanal])}<div><b style="color:var(--murekkep)">${e(S.kurs.ad)}</b><small style="display:block;color:var(--soluk);font-size:12px">${KANAL_KISA[kanal]} · ${e(sos().ayar.ad)} · yapay zekâ</small></div></div>
      <div class="sohbet-akis" style="min-height:380px">${mesajlar.length ? mesajlar.map(m => `<div class="balon ${m.kim === 'asistan' ? '' : 'giden'}" style="${m.kim === 'asistan' ? '' : 'background:#e2eaf5'}">${e(m.metin)}${m.kim === 'asistan' ? `<small>${ik('robot')} ${e(m.kaynak)}</small>` : '<small>Müşteri</small>'}</div>`).join('') : `<div style="margin:auto;text-align:center;color:var(--soluk);max-width:320px">${isaret('bilgi', 34)}<p style="margin-top:10px">Soldaki hazır sorulardan birine tıklayın ya da aşağıya müşteri gibi yazın.</p></div>`}</div>
      <form class="sohbet-yaz" data-dene><input class="girdi" name="m" placeholder="Müşteri gibi yazın…" aria-label="Deneme mesajı" autocomplete="off"><button class="dg dg-ana" type="submit">${ik('gonder')}Gönder</button></form></div>
  </div></div>`;
}

function kurallar() {
  const a = sos().ayar;
  const satir = (anah, b, alt) => `<li style="align-items:flex-start"><span class="anahtar" style="margin-top:2px"><input type="checkbox" data-devir-ayar="${anah}" ${a.devir[anah] ? 'checked' : ''} aria-label="${e(b)}"><i></i></span><div><b style="color:var(--murekkep);display:block">${b}</b><small style="color:var(--metin);font-size:13.5px">${alt}</small></div></li>`;
  return `<div class="izgara iz-2">
    <div class="kart"><div class="kart-bas"><h3>Asistanın kimliği</h3></div><div class="kart-govde"><form class="form-izgara" data-kimlik>
      <div class="alan tam"><label for="as-ad">Asistanın adı</label><input id="as-ad" class="girdi" name="ad" value="${e(a.ad)}" maxlength="40"></div>
      <div class="alan tam"><span class="et">Konuşma tonu</span><div class="secim">${['Samimi', 'Resmi'].map(t => `<label><input type="radio" name="ton" value="${t}" ${a.ton === t ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div></div>
      <label class="tam" style="display:flex;align-items:center;gap:12px;font-size:14.5px"><span class="anahtar"><input type="checkbox" name="emoji" ${a.emoji ? 'checked' : ''}><i></i></span><span>Emoji kullanabilir</span></label>
      <label class="tam" style="display:flex;align-items:center;gap:12px;font-size:14.5px;opacity:.75"><span class="anahtar"><input type="checkbox" checked disabled><i></i></span><span>İlk mesajda yapay zekâ olduğunu söyler <small style="display:block;color:var(--soluk)">Meta kuralı, kapatılamaz</small></span></label>
      <div class="tam"><button class="dg dg-ana" type="submit">Kaydet</button></div></form></div></div>
    <div class="kart"><div class="kart-bas"><h3>Ne zaman size devreder?</h3><small>Devredilen konuşmada asistan susar, size bildirim gelir</small></div><ul class="liste" style="margin-top:8px">
      ${satir('indirim', 'İndirim ve pazarlık', 'Kurs bilgisindeki indirimler dışında fiyat sözü vermez.')}
      ${satir('sikayet', 'Şikâyet ve kızgın müşteri', 'Yorumda da DM’de de cevabı siz yazarsınız.')}
      ${satir('saglik', 'Sağlık ve özel durum', 'Protez, ilaç, engel durumu gibi sorular.')}
      ${satir('insan', 'Yetkiliyle görüşmek isteyen', '“Biriyle konuşabilir miyim?” dendiğinde.')}
      ${satir('bilinmeyen', 'Bilmediği soru', 'Kapalıysa yalnızca “bilmiyorum” der, size bildirim gelmez.')}
    </ul>
    <div class="kart-govde" style="border-top:1px solid var(--cizgi-2)"><b style="color:var(--murekkep)">Siz yazınca asistan ne kadar sussun?</b><div class="secim" style="margin-top:8px">${[6, 12, 24, 48].map(h => `<label><input type="radio" name="susma" value="${h}" data-susma ${a.susma === h ? 'checked' : ''}><span>${h} saat</span></label>`).join('')}</div>
      <p style="font-size:13.5px;color:var(--soluk);margin-top:8px">Telefonunuzdan bir müşteriye cevap yazdığınızda asistan o konuşmaya bu süre boyunca karışmaz.</p></div></div>
  </div>
  <div class="ara-bosluk"></div>
  <div class="kart"><div class="kart-bas"><h3>Asistanın bildikleri</h3><small>Fiyat, evrak, ders saatleri…</small><a class="sag dg dg-cizgi dg-kucuk" href="#/mesajlar/bilgi">Bilgileri düzenle</a></div>
    <ul class="liste" style="margin-top:8px">${S.asistanBilgi.map(b => `<li>${isaret('tamam', 20)}<b style="color:var(--murekkep);min-width:130px">${e(b.konu)}</b><small style="color:var(--metin);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1">${e(b.metin)}</small></li>`).join('')}</ul></div>`;
}

function devirler() {
  const y = sos().yorumlar.filter(x => x.durum === 'devir');
  return `${ekranNotu('Asistanın kendisi cevaplamadığı, size bıraktığı konuşmalar. Cevapladığınızda listeden düşer.', 'uyari')}
  <div class="kart"><ul class="liste">${[
    ...S.devredilen.map((d, i) => `<li style="align-items:flex-start">${isaret('uyari', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(d.ad)} · ${e(d.konu)}</b><p style="font-size:14px">“${e(d.mesaj)}”</p><small style="color:var(--soluk)">${e(d.kanal)} mesajı · ${d.saat} · ${e(d.neden)}</small></div><a class="dg dg-ana dg-kucuk" href="#/mesajlar/bilgi">Cevapla</a></li>`),
    ...y.map(x => `<li style="align-items:flex-start">${isaret('uyari', 24)}<div style="flex:1"><b style="color:var(--murekkep);display:block">${e(x.kim)} · Instagram yorumu</b><p style="font-size:14px">“${e(x.metin)}”</p><small style="color:var(--soluk)">${goreli(gun(x.gun))} ${x.saat} · Şikâyet: asistan cevaplamadı</small></div><button class="dg dg-ana dg-kucuk" data-yorum-cevap="${x.id}">Cevapla</button></li>`),
  ].join('') || '<li style="color:var(--soluk)">Size devredilmiş konuşma yok.</li>'}</ul></div>`;
}

export function sosyal(alt) {
  const SEK = ['ozet', 'kanal', 'yorum', 'dene', 'kural', 'devir'];
  if (alt && SEK.includes(alt)) durum.sekme = alt;
  const govde = { ozet, kanal: kanallar, yorum: yorumlar, dene, kural: kurallar, devir: devirler }[durum.sekme]();
  const bagli = sos().kanallar.filter(c => c.bagli).length;
  return {
    baslik: 'Sosyal medya asistanı',
    alt: `${bagli} kanal bağlı · Instagram, WhatsApp ve yorumlara 7/24 cevap`,
    html: `${durum.sekme === 'ozet' ? ekranNotu('Instagram mesajları, gönderi yorumları ve WhatsApp’a gece gündüz saniyeler içinde cevap verilir; kayda dönen her sohbet aday olarak açılır. Konuşmaların kendisi “Mesajlar”da.') : ''}
      <div id="sek">${sekmeler([['ozet', 'Özet'], ['kanal', 'Kanallar', bagli], ['yorum', 'Instagram yorumları'], ['dene', 'Asistanı dene'], ['kural', 'Kurallar'], ['devir', 'Size devredilen', bekleyenDevir()]], durum.sekme)}</div>${govde}`,
    baglan(k) {
      k.addEventListener('click', ev => {
        const t = ev.target;
        const s = t.closest('[data-sekme]'); if (s) { location.hash = '#/sosyal/' + s.dataset.sekme; return; }
        const h = t.closest('[data-hazir]'); if (h) return gonder(h.dataset.hazir);
        if (t.closest('[data-dene-sifirla]')) { durum.deneme = []; yenile(); }
        const b = t.closest('[data-bagla]'); if (b) return baglaSihirbazi(b.dataset.bagla);
        const yc = t.closest('[data-yorum-cevap]'); if (yc) return yorumCevapla(yc.dataset.yorumCevap);
        const yg = t.closest('[data-yorum-goster]'); if (yg) { const y = sos().yorumlar.find(x => x.id === yg.dataset.yorumGoster); y.durum = 'devir'; kaydet(); bildir('Yorum görünür yapıldı; cevabı size bırakıldı'); yenile(); }
      });
      k.addEventListener('change', ev => {
        const t = ev.target;
        if (t.matches('[data-cevap]')) { const c = sos().kanallar.find(x => x.id === t.dataset.cevap); c.cevap = t.checked; islem('Asistan ayarını değiştirdi', c.ad + (t.checked ? ' açık' : ' kapalı')); kaydet(); bildir(c.ad + ': asistan ' + (t.checked ? 'cevaplıyor' : 'cevaplamıyor')); }
        if (t.matches('[data-mod]')) { const c = sos().kanallar.find(x => x.id === t.dataset.mod); c.mod = t.value; kaydet(); bildir(c.ad + ': ' + (t.value === '7/24' ? 'her zaman' : 'yalnızca mesai dışında')); }
        if (t.matches('[data-devir-ayar]')) { sos().ayar.devir[t.dataset.devirAyar] = t.checked; kaydet(); bildir('Devir kuralı kaydedildi'); }
        if (t.matches('[data-susma]')) { sos().ayar.susma = +t.value; kaydet(); bildir('Siz yazınca asistan ' + t.value + ' saat susacak'); }
        if (t.matches('[data-dene-kanal]')) { durum.kanal = t.value; yenile(); }
      });
      const f = k.querySelector('[data-dene]');
      if (f) { f.addEventListener('submit', ev => { ev.preventDefault(); const m = f.m.value.trim(); if (m) gonder(m); }); const ak = k.querySelector('.sohbet-akis'); if (ak) ak.scrollTop = 1e5; }
      const ki = k.querySelector('[data-kimlik]');
      if (ki) ki.addEventListener('submit', ev => { ev.preventDefault(); const a = sos().ayar; a.ad = ki.ad.value.trim() || a.ad; a.ton = ki.ton.value; a.emoji = ki.emoji.checked; islem('Asistan kimliğini güncelledi', a.ad + ' · ' + a.ton); kaydet(); bildir('Asistan ayarları kaydedildi'); yenile(); });
    },
  };
}

function gonder(metin) {
  const ilk = !durum.deneme.some(m => m.kim === 'asistan');
  durum.deneme.push({ kim: 'musteri', metin });
  const c = cevapUret(metin, ilk);
  durum.deneme.push({ kim: 'asistan', metin: c.metin, kaynak: c.kaynak });
  if (c.aday) {
    S.adaylar.unshift({ id: 'l' + Date.now(), ad: 'Deneme adayı (' + KANAL_KISA[durum.kanal] + ')', tel: c.aday, kaynak: durum.kanal === 'wp' ? 'WhatsApp' : 'Instagram', kanal: durum.kanal === 'wp' ? 'WhatsApp' : 'Instagram', sinif: 'B', asama: 'Yeni', tarih: gun(0), saat: new Date().toTimeString().slice(0, 5), takip: null, not: 'Sosyal medya asistanı açtı', mesajlar: durum.deneme.map(m => ({ kim: m.kim === 'asistan' ? 'asistan' : 'aday', metin: m.metin })) });
    kaydet(); bildir('Yeni aday açıldı · Yeni öğrenciler listesinde');
  }
  if (c.devir) bildir('Konuşma size devredildi: ' + c.devir, 'uyari');
  yenile();
}

function baglaSihirbazi(id) {
  const c = sos().kanallar.find(x => x.id === id);
  pencere({
    baslik: c.ad + ' bağla',
    icerik: `<ol style="padding-left:18px;display:grid;gap:10px;font-size:14.5px">
      <li><b>Meta ile giriş</b><br><small style="color:var(--soluk)">Kurs sayfasının yöneticisi kendi Facebook hesabıyla giriş yapar. Şifre Sinyal’e gelmez.</small></li>
      <li><b>Sayfayı seç ve izin ver</b><br><small style="color:var(--soluk)">Yalnızca mesajları okuma ve cevaplama izni istenir; gönderi paylaşma izni istenmez.</small></li>
      <li><b>Deneme mesajı</b><br><small style="color:var(--soluk)">Sayfaya bir mesaj atılır, asistanın cevabı birlikte kontrol edilir.</small></li></ol>
      <p style="margin-top:12px;font-size:13px;color:var(--soluk)">Demo: bağlantı taklit edilir, gerçek hesaba dokunulmaz.</p>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>${ik('fb')}Meta ile bağlan</button>`,
    onAc(d) { d.querySelector('[data-k]').addEventListener('click', () => { c.bagli = true; c.cevap = true; c.son = null; islem('Kanal bağladı', c.ad); kaydet(); kapatPencere(); bildir(c.ad + ' bağlandı; asistan cevaplamaya başladı'); yenile(); }); },
  });
}

function yorumCevapla(id) {
  const y = sos().yorumlar.find(x => x.id === id);
  pencere({
    baslik: y.kim + ' yorumuna cevap',
    icerik: `<div class="balon" style="max-width:100%;margin-bottom:12px">${e(y.metin)}</div>
      <div class="secim" style="margin-bottom:10px"><label><input type="radio" name="yer" value="acik" checked><span>Yoruma cevap yaz</span></label><label><input type="radio" name="yer" value="dm"><span>Özelden yaz</span></label></div>
      <div class="alan"><label>Cevabınız</label><textarea>Yaşadığınız sorun için özür dileriz. Detayları konuşmak için size özelden yazdık.</textarea></div>`,
    altlik: `<button class="dg dg-cizgi" data-kapat>Vazgeç</button><button class="dg dg-ana" data-k>Gönder</button>`,
    onAc(d) {
      d.querySelector('[data-k]').addEventListener('click', () => {
        y.cevap = d.querySelector('textarea').value.trim() || y.cevap; y.durum = d.querySelector('input[name=yer]:checked').value;
        islem('Instagram yorumunu cevapladı', y.kim); kaydet(); kapatPencere(); bildir('Cevap gönderildi'); yenile();
      });
    },
  });
}
