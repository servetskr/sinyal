// mdSinyal MEBBİS Yardımcısı · arka plan: mdSinyal sekmesi ile MEBBİS sekmesi arasında köprü.
// Kişisel veriler chrome.storage.session’da durur (tarayıcı kapanınca silinir); kalıcı olarak yalnız öğretilen alan eşlemeleri saklanır.
chrome.runtime.onInstalled.addListener(() => chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => { }));
const al = k => chrome.storage.session.get(k).then(x => x[k]);
const koy = (k, v) => chrome.storage.session.set({ [k]: v });
chrome.runtime.onMessage.addListener((m, kimden, cevap) => {
  (async () => {
    if (m.tur === 'kuyruk-koy') { await koy('kuyruk', { kurs: m.kurs || '', zaman: Date.now(), isler: m.isler || [], oto: !!m.oto }); return { ok: true, n: (m.isler || []).length }; }
    if (m.tur === 'kuyruk-basladi') { const q = (await al('kuyruk')) || { isler: [] }; q.oto = false; await koy('kuyruk', q); return { ok: true }; }
    if (m.tur === 'is-hata') { const h = (await al('hatalar')) || []; h.push({ id: m.id, not: m.not || '', zaman: Date.now() }); await koy('hatalar', h); return { ok: true }; }
    if (m.tur === 'hatalar-al') { const h = (await al('hatalar')) || []; await chrome.storage.session.remove('hatalar'); return h; }
    if (m.tur === 'mebbis-ac') {
      const l = await chrome.tabs.query({ url: 'https://mebbis.meb.gov.tr/*' });
      await koy('yeni', true);
      if (l.length) { const s = l.find(x => x.active) || l[0]; await chrome.tabs.update(s.id, { active: true }); await chrome.windows.update(s.windowId, { focused: true }).catch(() => { }); chrome.tabs.sendMessage(s.id, { tur: 'yeniden-bak' }).catch(() => { }); return { sekme: 'gecildi' }; }
      // MEBBİS sekmesi yoksa mdSinyal sekmesinin hemen yanında, aynı pencerede açılır ve öne gelir
      const yan = kimden && kimden.tab;
      const yeniSekme = await chrome.tabs.create({ url: 'https://mebbis.meb.gov.tr/', active: true, ...(yan ? { windowId: yan.windowId, index: yan.index + 1, openerTabId: yan.id } : {}) });
      await chrome.windows.update(yeniSekme.windowId, { focused: true }).catch(() => { });
      return { sekme: 'acildi' };
    }
    if (m.tur === 'hedef-koy') { await koy('hedef', m.hedef); return { ok: true }; }
    if (m.tur === 'hedef-al') return (await al('hedef')) || null;
    if (m.tur === 'hedef-sil') { await chrome.storage.session.remove('hedef'); return { ok: true }; }
    if (m.tur === 'sinyal-burada' && kimden.tab) { await koy('sinyalSekme', { id: kimden.tab.id, pencere: kimden.tab.windowId }); return { ok: true }; }
    if (m.tur === 'sinyal-ac') { const s = await al('sinyalSekme'); if (!s) return { ok: false }; try { await chrome.tabs.update(s.id, { active: true }); await chrome.windows.update(s.pencere, { focused: true }); return { ok: true }; } catch (x) { return { ok: false }; } }
    if (m.tur === 'yeni-al') { const y = await al('yeni'); await chrome.storage.session.remove('yeni'); return !!y; }
    if (m.tur === 'aktif-al') return (await al('aktif')) || null;
    if (m.tur === 'aktif-koy') { await koy('aktif', m.aktif); return { ok: true }; }
    if (m.tur === 'kuyruk-al') return (await al('kuyruk')) || { isler: [] };
    if (m.tur === 'is-bitti') { const q = (await al('kuyruk')) || { isler: [] }; const x = q.isler.find(y => y.id === m.id); if (x) x.bitti = Date.now(); await koy('kuyruk', q); const b = (await al('bitenler')) || []; b.push({ id: m.id, ref: x && x.ref, tur: x && x.tur, zaman: Date.now() }); await koy('bitenler', b); return { ok: true }; }
    // biten işler mdSinyal işleyip "aldım" deyince silinir (sayfa henüz hazır değilse kaybolmasın)
    if (m.tur === 'bitenler-al') return (await al('bitenler')) || [];
    if (m.tur === 'bitenler-sil') { const ids = new Set(m.ids || []); const b = ((await al('bitenler')) || []).filter(x => !ids.has(x.id)); await koy('bitenler', b); return { ok: true }; }
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
