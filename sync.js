'use strict';
/* ============ cross-device sync through a PRIVATE GitHub repository ============
   Phone and computer both keep their own copy; changes are merged (3-way, per field) through one JSON file in a
   private repo you own. A fine-grained token limited to that single repo is the only secret and stays in each browser. */
const SYNC_KEY = 'fuel-sync', BASE_KEY = 'fuel-sync-base';
const syncCfg = () => { try { return JSON.parse(localStorage.getItem(SYNC_KEY) || 'null'); } catch (e) { return null; } };
const setSyncCfg = c => { try { c ? localStorage.setItem(SYNC_KEY, JSON.stringify(c)) : localStorage.removeItem(SYNC_KEY); } catch (e) { } };
const getBase = () => { try { return JSON.parse(localStorage.getItem(BASE_KEY) || 'null'); } catch (e) { return null; } };
const setBase = o => { try { o ? localStorage.setItem(BASE_KEY, JSON.stringify(o)) : localStorage.removeItem(BASE_KEY); } catch (e) { } };
const syncView = s => { const c = Object.assign({}, s); delete c.chat; delete c.rev; return c; };   // chat history and server revision stay local
const b64enc = s => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); };
const b64dec = s => { const bin = atob(s.replace(/\s/g, '')), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new TextDecoder().decode(b); };

/* 3-way merge of JSON: `a` = this device (wins ties), `b` = remote, `base` = state at the last sync.
   Objects merge key by key, arrays of {id} merge per id, a change beats "unchanged", a deletion beats "unchanged". */
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const jeq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const idMap = arr => { if (!Array.isArray(arr) || !arr.length || !arr.every(x => isObj(x) && x.id != null)) return null; const m = {}; arr.forEach(x => m[x.id] = x); return m; };
function merge3(base, a, b) {
  if (jeq(a, b)) return a;
  if (jeq(base, a)) return b;
  if (jeq(base, b)) return a;
  if (isObj(a) && isObj(b)) {
    const bs = isObj(base) ? base : {}, out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(bs)])) {
      const inA = k in a, inB = k in b, inBase = k in bs;
      if (inA && inB) out[k] = merge3(bs[k], a[k], b[k]);
      else if (inA) { if (inBase && jeq(bs[k], a[k])) continue; out[k] = a[k]; }      // removed elsewhere and untouched here -> removed
      else if (inB) { if (inBase && jeq(bs[k], b[k])) continue; out[k] = b[k]; }
    }
    return out;
  }
  const ma = idMap(a), mb = idMap(b);
  if (ma && mb) {
    const merged = merge3(idMap(base) || {}, ma, mb);
    const ids = [...a.map(x => x.id), ...b.map(x => x.id).filter(id => !(id in ma))];
    return ids.filter(id => id in merged).map(id => merged[id]);
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === 0) return b;
  return a;
}

async function ghFetch(cfg, path, method = 'GET', body) {
  const url = (cfg.api || 'https://api.github.com') + path + (method === 'GET' ? (path.includes('?') ? '&' : '?') + 't=' + Date.now() : '');
  return fetch(url, { method, cache: 'no-store', headers: Object.assign({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + cfg.token, 'X-GitHub-Api-Version': '2022-11-28' }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
}
const fileUrl = cfg => `/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path || 'data.json'}`;
const httpErr = r => r.status === 401 ? 'Token odrzucony (401) – sprawdź, czy jest poprawny i nie wygasł' : r.status === 403 ? 'Brak dostępu (403) – token musi mieć uprawnienie „Contents: Read and write" do tego repozytorium' : r.status === 404 ? 'Nie znalazłem repozytorium – sprawdź nazwę i uprawnienia tokena' : 'GitHub odpowiedział: HTTP ' + r.status;

let syncBusy = false, syncTimer = null;
UI.sync = UI.sync || { state: 'off' };
function scheduleSync() { if (!syncCfg() || UI.syncApplying) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow('change'), 3500); }
async function syncNow(reason) {
  const cfg = syncCfg(); if (!cfg || syncBusy || !S) return;
  if (navigator.onLine === false) { UI.sync = { state: 'offline', at: UI.sync.at }; return; }
  syncBusy = true; UI.sync = { state: 'syncing', at: UI.sync.at }; if (UI.view === 'me') render();
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await ghFetch(cfg, fileUrl(cfg));
      let remote = null, sha = null;
      if (r.status === 404) { const rr = await ghFetch(cfg, `/repos/${cfg.owner}/${cfg.repo}`); if (!rr.ok) throw new Error(httpErr(rr)); }
      else if (!r.ok) throw new Error(httpErr(r));
      else { const j = await r.json(); sha = j.sha; remote = JSON.parse(b64dec(j.content)); }
      const local = syncView(S), base = getBase();
      const merged = !remote ? local : base ? merge3(base, local, remote) : merge3({}, remote, local);   // first sync here: the other device's data wins conflicts
      const changedRemote = !remote || !jeq(merged, remote), changedLocal = !jeq(merged, local);
      if (changedRemote) {
        const body = { message: 'Fuel sync ' + new Date().toISOString().slice(0, 19), content: b64enc(JSON.stringify(merged)) }; if (sha) body.sha = sha;
        const w = await ghFetch(cfg, fileUrl(cfg), 'PUT', body);
        if (w.status === 409 || w.status === 422) continue;       // someone else wrote in between: fetch again and re-merge
        if (!w.ok) throw new Error(httpErr(w));
      }
      if (changedLocal) {
        const keep = { chat: S.chat, rev: S.rev };
        S = Object.assign({}, merged, keep); migrate();
        UI.syncApplying = true; try { await doSave(); } finally { UI.syncApplying = false; }
        if ($('#modal').open) UI.needRender = true; else render();
      }
      setBase(merged); cfg.last = Date.now(); setSyncCfg(cfg); UI.sync = { state: 'ok', at: cfg.last, pulled: changedLocal };
      return;
    }
    throw new Error('Konflikt zapisu – spróbuj jeszcze raz za chwilę');
  } catch (e) { UI.sync = { state: 'error', err: (e && e.message) || String(e), at: UI.sync.at }; }
  finally { syncBusy = false; if (UI.view === 'me') render(); }
}
function initSync() {
  const m = /^#sync=(.+)$/.exec(location.hash || '');
  if (m) {   // phone setup link / QR from the computer
    try { const o = JSON.parse(decodeURIComponent(escape(atob(m[1])))); if (o.o && o.r && o.t) { setSyncCfg({ owner: o.o, repo: o.r, token: o.t, path: 'data.json' }); setBase(null); toast('Synchronizacja połączona'); } } catch (e) { toast('Nieprawidłowy link synchronizacji'); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (syncCfg()) { startSyncLoops(); syncNow('boot'); }
}
function startSyncLoops() {
  if (startSyncLoops.on) return; startSyncLoops.on = true;
  setInterval(() => syncNow('timer'), 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow('visible'); });
  window.addEventListener('online', () => syncNow('online'));
}
const syncLink = cfg => `https://${cfg.owner.toLowerCase()}.github.io/fuel/#sync=${btoa(unescape(encodeURIComponent(JSON.stringify({ o: cfg.owner, r: cfg.repo, t: cfg.token }))))}`;
const ago = t => { if (!t) return 'jeszcze nie'; const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'przed chwilą' : s < 3600 ? Math.round(s / 60) + ' min temu' : s < 86400 ? Math.round(s / 3600) + ' godz. temu' : Math.round(s / 86400) + ' dni temu'; };

function syncCard() {
  const cfg = syncCfg(), st = UI.sync || { state: 'off' };
  if (!cfg) return `<div class="card"><h2>Synchronizacja telefon ⇄ komputer</h2>
    <p class="sm" style="margin-top:0">Zmiana na komputerze pojawia się na telefonie i odwrotnie – <b>bez włączonego komputera</b>. Dane trafiają do Twojego <b>prywatnego</b> repozytorium na GitHubie.</p>
    <details><summary class="sm" style="cursor:pointer"><b>Jak to ustawić (raz, ok. 3 minuty)</b></summary>
    <ol class="sm" style="padding-left:20px"><li>Na GitHubie załóż <b>prywatne</b> repozytorium, np. <code>fuel-data</code> (z plikiem README).</li>
    <li>GitHub → Settings → Developer settings → <b>Fine-grained tokens</b> → Generate new token. Dostęp: <b>Only select repositories</b> → tylko <code>fuel-data</code>. Uprawnienia: <b>Contents → Read and write</b>.</li>
    <li>Wklej dane poniżej. Na drugim urządzeniu pokaż kod QR z tego miejsca (po połączeniu) albo wpisz te same trzy rzeczy.</li></ol></details>
    <div class="grid3"><div><label>Konto GitHub</label><input id="sy_o" placeholder="PepeM2006" autocapitalize="off"></div><div><label>Repozytorium</label><input id="sy_r" value="fuel-data" autocapitalize="off"></div><div><label>Token</label><input id="sy_t" type="password" placeholder="github_pat_…" autocomplete="off"></div></div>
    <button class="pri" style="margin-top:10px" data-act="syncConnect">Połącz</button>
    <div class="mut xs" style="margin-top:8px">Token ma dostęp tylko do tego jednego repozytorium i zapisuje się wyłącznie w tej przeglądarce. Przy pierwszym połączeniu urządzenia dane z drugiego urządzenia mają pierwszeństwo przy konfliktach.</div></div>`;
  const stText = { ok: `Zsynchronizowano ${ago(st.at)}`, syncing: 'Synchronizuję…', offline: 'Brak internetu – zsynchronizuję, gdy wróci', error: 'Błąd: ' + esc(st.err || ''), off: 'Gotowe do synchronizacji' }[st.state] || '';
  return `<div class="card"><h2>Synchronizacja telefon ⇄ komputer</h2>
    <div class="sm"><b style="color:${st.state === 'error' ? 'var(--clay)' : 'var(--acc)'}">●</b> Połączono z <b>${esc(cfg.owner)}/${esc(cfg.repo)}</b></div>
    <div class="sm ${st.state === 'error' ? '' : 'mut'}" style="margin:4px 0 10px;${st.state === 'error' ? 'color:var(--clay)' : ''}">${stText}</div>
    <div class="row wrap"><button class="pri sm" data-act="syncNow">Synchronizuj teraz</button><button class="sm" data-act="syncShare">Podłącz drugie urządzenie (QR)</button><button class="sm danger" data-act="syncOff">Rozłącz</button></div></div>`;
}
const SYNC_ACTIONS = {
  syncNow: () => syncNow('manual'),
  syncConnect: async () => {
    const cfg = { owner: val('sy_o').trim(), repo: val('sy_r').trim(), token: val('sy_t').trim(), path: 'data.json' };
    if (!cfg.owner || !cfg.repo || !cfg.token) return toast('Wpisz konto, repozytorium i token');
    toast('Sprawdzam połączenie…');
    try {
      const r = await ghFetch(cfg, `/repos/${cfg.owner}/${cfg.repo}`);
      if (!r.ok) return toast(httpErr(r));
      setSyncCfg(cfg); setBase(null); UI.sync = { state: 'syncing' }; render(); await syncNow('connect');
      startSyncLoops();
      toast(UI.sync.state === 'ok' ? 'Połączono i zsynchronizowano' : 'Połączono – ' + (UI.sync.err || ''));
    } catch (e) { toast('Nie mogę połączyć się z GitHubem: ' + (e.message || e)); }
  },
  syncOff: () => { if (!confirm('Rozłączyć synchronizację na tym urządzeniu? Dane zostaną tu, ale przestaną się wymieniać.')) return; setSyncCfg(null); setBase(null); UI.sync = { state: 'off' }; render(); },
  syncShare: () => {
    const cfg = syncCfg(); if (!cfg) return; const link = syncLink(cfg);
    const show = () => { let qr = ''; try { const q = qrcode(0, 'L'); q.addData(link); q.make(); qr = q.createSvgTag({ cellSize: 3, margin: 2, scalable: true }); } catch (e) { } modal('Podłącz drugie urządzenie', `<p class="sm" style="margin-top:0">Zeskanuj kodem aparatu telefonu – otworzy Fuel i połączy synchronizację (bez wpisywania tokena).</p><div class="qr" style="width:220px;margin:8px auto">${qr || '<div class="sm">Nie udało się narysować kodu – użyj linku.</div>'}</div><div class="code" style="max-height:80px;overflow:auto">${esc(link)}</div><div class="mut xs">Link zawiera token – nie udostępniaj go nikomu. Kod pokazuje się tylko na tym ekranie.</div>`, [{ label: 'Kopiuj link', fn: async () => { try { await navigator.clipboard.writeText(link); toast('Skopiowano'); } catch (e) { prompt('Skopiuj:', link); } } }]); };
    if (typeof qrcode === 'function') show(); else { const sc = document.createElement('script'); sc.src = 'qrcode.js'; sc.onload = show; document.head.appendChild(sc); }
  },
};
