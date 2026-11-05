// Sinyal MEBBİS Yardımcısı · arka plan: Sinyal sekmesi ile MEBBİS sekmesi arasında köprü.
// Kişisel veriler chrome.storage.session’da durur (tarayıcı kapanınca silinir); kalıcı olarak yalnız öğretilen alan eşlemeleri saklanır.
chrome.runtime.onInstalled.addListener(() => chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => { }));
const al = k => chrome.storage.session.get(k).then(x => x[k]);
const koy = (k, v) => chrome.storage.session.set({ [k]: v });
chrome.runtime.onMessage.addListener((m, kimden, cevap) => {
  (async () => {
    if (m.tur === 'kuyruk-koy') { await koy('kuyruk', { kurs: m.kurs || '', zaman: Date.now(), isler: m.isler || [] }); return { ok: true, n: (m.isler || []).length }; }
    if (m.tur === 'kuyruk-al') return (await al('kuyruk')) || { isler: [] };
    if (m.tur === 'is-bitti') { const q = (await al('kuyruk')) || { isler: [] }; const x = q.isler.find(y => y.id === m.id); if (x) x.bitti = Date.now(); await koy('kuyruk', q); const b = (await al('bitenler')) || []; b.push({ id: m.id, ref: x && x.ref, tur: x && x.tur, zaman: Date.now() }); await koy('bitenler', b); return { ok: true }; }
    if (m.tur === 'bitenler-al') { const b = (await al('bitenler')) || []; await koy('bitenler', []); return b; }
    if (m.tur === 'kuyruk-temizle') { await chrome.storage.session.remove(['kuyruk', 'bitenler', 'tablo']); return { ok: true }; }
    if (m.tur === 'tablo-koy') { await koy('tablo', { zaman: Date.now(), ...m.tablo }); return { ok: true }; }
    if (m.tur === 'tablo-al') { const t = await al('tablo'); await chrome.storage.session.remove('tablo'); return t || null; }
    // formun MEBBİS adresi (kişisel veri yok) ve panel ayarları kalıcı saklanır
    if (m.tur === 'sayfa-al') return (await chrome.storage.local.get('sayfa')).sayfa || {};
    if (m.tur === 'sayfa-koy') { const s = (await chrome.storage.local.get('sayfa')).sayfa || {}; s[m.is] = { yol: m.yol, adres: m.adres }; await chrome.storage.local.set({ sayfa: s }); return { ok: true }; }
    if (m.tur === 'ayar-al') return ((await chrome.storage.local.get('ayar')).ayar || {})[m.ad];
    if (m.tur === 'ayar-koy') { const a = (await chrome.storage.local.get('ayar')).ayar || {}; a[m.ad] = m.deger; await chrome.storage.local.set({ ayar: a }); return { ok: true }; }
    if (m.tur === 'esleme-al') return (await chrome.storage.local.get('esleme')).esleme || {};
    if (m.tur === 'esleme-koy') { const e = (await chrome.storage.local.get('esleme')).esleme || {}; e[m.anahtar] = m.secici; await chrome.storage.local.set({ esleme: e }); return { ok: true }; }
    return null;
  })().then(cevap);
  return true;
});
