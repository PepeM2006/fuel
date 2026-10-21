'use strict';
/* ============ constants & utils ============ */
const SLOTS_ALL = ['breakfast', 'snack', 'lunch', 'dinner'];
const SLOT_PL = { breakfast: 'Śniadanie', snack: 'Przekąska', lunch: 'Na uczelnię', dinner: 'Obiadokolacja' };
const DAYN = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
const DAYFULL = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const ACT = [[1.2, 'Siedzący tryb życia'], [1.375, 'Lekka (1–2 treningi/tydz.)'], [1.5, 'Umiarkowana (3–4 treningi, dużo siedzenia)'], [1.65, 'Wysoka (5–6 treningów)'], [1.8, 'Bardzo wysoka']];
const STORES = ['Lidl', 'Albert Heijn', 'Jumbo', 'Aldi', 'Plus', 'Inny'];
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
const wdIdx = s => (parseD(s).getDay() + 6) % 7;
const weekStart = s => addDays(s, -wdIdx(s));
const r0 = Math.round;
const r1 = x => Math.round(x * 10) / 10;
const fmtDay = s => parseD(s).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtLong = s => parseD(s).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
const money = x => '€' + (Math.round(x * 100) / 100).toFixed(2).replace('.', ',');
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const fmtAmt = (a, u) => u === 'pcs' ? (Math.round(a * 10) / 10 + '').replace('.', ',') + ' szt.' : (a >= 1000 ? (Math.round(a / 10) / 100 + '').replace('.', ',') + (u === 'ml' ? ' l' : ' kg') : r0(a) + ' ' + u);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/* ============ state & persistence ============ */
let S;
const UI = { view: 'today', date: today(), week: weekStart(today()), foodsTab: 'rec', q: '', slotFilter: '', dirty: false, aiBusy: false };

function migrate() {
  const d = seedData();
  for (const k of ['plan', 'log', 'workouts', 'adjust', 'shopChecked', 'menus', 'bases', 'optSeen']) S[k] = S[k] || {};
  S.chat = S.chat || []; S.ingredients = S.ingredients || []; S.recipes = S.recipes || [];
  S.profile = Object.assign({}, d.profile, S.profile || {});
  if (!S.lastBackup) S.lastBackup = today();
  if (S.profileSet === undefined && (S.setupDone || S.rev > 0)) S.profileSet = true;   // existing users are not asked again
  S.recipes.forEach(r => { r.tags = r.tags || []; r.how = r.how || ''; r.prep = r.prep || ''; });
  S.ingredients.forEach(i => { if (i.proc == null) i.proc = 0; if (i.nl == null) i.nl = ''; });
  S.ingredients.forEach(i => { if (i.starter) i.name = i.name.replace(' (1 szt.)', ''); });
  if (S.starter !== false && (S.seedVersion || 1) < SEED_VERSION) { // add newly shipped starter food, never touching existing items
    for (const i of d.ingredients) if (!S.ingredients.some(x => x.id === i.id)) S.ingredients.push(i);
    for (const r of d.recipes) if (!S.recipes.some(x => x.id === r.id || x.name === r.name)) S.recipes.push(r);
    for (const sr of d.recipes) { const x = S.recipes.find(y => y.name === sr.name && y.starter); if (x) { x.slots = sr.slots; x.items = sr.items; x.tags = sr.tags; x.how = sr.how || x.how; x.prep = sr.prep; x.big = sr.big; } } // refresh untouched starter recipes (edited ones lose the starter flag and are kept)
    S.seedVersion = SEED_VERSION; setTimeout(() => save(), 0);
  }
}
/* ---- durable local storage: localStorage + an IndexedDB mirror + rolling snapshots (so one cleared store never loses your plan) ---- */
const idbOpen = () => new Promise((res, rej) => { if (!('indexedDB' in window)) return rej(new Error('no idb')); const q = indexedDB.open('fuel', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
async function idbRun(mode, fn) { try { const db = await idbOpen(); const out = await new Promise((res, rej) => { const tx = db.transaction('kv', mode), st = tx.objectStore('kv'); let val; const rq = fn(st); if (rq) rq.onsuccess = () => val = rq.result; tx.oncomplete = () => res(val); tx.onerror = () => rej(tx.error); }); db.close(); return out; } catch (e) { return undefined; } }
const idbSet = (k, v) => idbRun('readwrite', st => st.put(v, k)), idbGet = k => idbRun('readonly', st => st.get(k)), idbDel = k => idbRun('readwrite', st => st.delete(k)), idbKeys = () => idbRun('readonly', st => st.getAllKeys());
async function snapshotMaybe(json) {   // at most one snapshot per 30 minutes, keep the 12 newest
  const now = Date.now(); if (now - (UI.lastSnap || 0) < 30 * 60 * 1000) return; UI.lastSnap = now;
  await idbSet('snap-' + now, json);
  const keys = ((await idbKeys()) || []).filter(k => String(k).startsWith('snap-')).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 12))) await idbDel(k);
}
/* Two storage modes: with the Fuel server (PC, shared with phone) or standalone in this browser (phone without PC). */
async function load() {
  let d = null;
  try {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch('/api/data', { signal: ctl.signal }); clearTimeout(tm);
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('no server');
    d = await r.json(); UI.local = false;
  } catch (e) {
    UI.local = true;
    try { d = JSON.parse(localStorage.getItem('fuel-data') || 'null'); } catch (e2) { d = null; }
    try { const alt = JSON.parse((await idbGet('data')) || 'null'); if (alt && alt.profile && (!d || !d.profile || (alt.savedAt || 0) > (d.savedAt || 0))) { if (!d || !d.profile) UI.recovered = true; d = alt; } } catch (e3) { }
  }
  S = d && d.profile ? d : Object.assign(seedData(), { rev: (d && d.rev) || 0 });
  migrate();
}
let saveT = null, saving = false, pending = false;
function save() { UI.dirty = true; clearTimeout(saveT); saveT = setTimeout(doSave, 250); }
async function doSave() {
  if (UI.local) { S.savedAt = Date.now(); const json = JSON.stringify(S); let ok = false; try { localStorage.setItem('fuel-data', json); ok = true; } catch (e) { } idbSet('data', json).then(() => { snapshotMaybe(json); }); UI.dirty = false; UI.savedAt = S.savedAt; if (!ok && !UI.warnedStore) { UI.warnedStore = true; toast('Przeglądarka ogranicza zapis – dane trzymam w zapasowym magazynie'); } if (typeof scheduleSync === 'function') scheduleSync(); return; }
  if (saving) { pending = true; return; }
  saving = true;
  try {
    const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S) });
    if (r.status === 409) { await load(); UI.dirty = false; toast('Dane zmieniono na innym urządzeniu – odświeżono. Powtórz ostatnią zmianę.'); render(); }
    else { S.rev = (await r.json()).rev; UI.dirty = false; if (typeof scheduleSync === 'function') scheduleSync(); }
  } catch (e) { toast('Brak połączenia z serwerem Fuel – zmiany NIE zapisane!'); }
  saving = false;
  if (pending) { pending = false; doSave(); }
}
function toast(msg, undo) { const t = $('#toast'); t.innerHTML = esc(msg) + (undo ? ' <button class="tbtn" data-act="undo">Cofnij</button>' : ''); t.classList.add('on'); t.classList.toggle('act', !!undo); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), undo ? 7000 : 3600); }
/* Undo: snapshot before a destructive change, offer "Cofnij" in the toast */
const snapshot = () => JSON.stringify(S);
function restore(snap) { const rev = S.rev; S = JSON.parse(snap); S.rev = rev; migrate(); }

/* ============ nutrition model ============ */
const SL = () => S.profile.snack ? ['breakfast', 'snack', 'lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner'];
const SHARES3 = { breakfast: .28, lunch: .22, dinner: .50 }, SHARES4 = { breakfast: .24, snack: .10, lunch: .20, dinner: .46 };
const shareOf = s => (S.profile.snack ? SHARES4 : SHARES3)[s] || .25;
let _ingSrc = null, _ingMap = null;   // id -> ingredient, rebuilt when the list changes (called thousands of times by the planner)
const ing = id => { if (_ingSrc !== S.ingredients || _ingMap.size !== S.ingredients.length) { _ingSrc = S.ingredients; _ingMap = new Map(S.ingredients.map(i => [i.id, i])); } return _ingMap.get(id); };
const rec = id => (typeof isCombo === 'function' && isCombo(id)) ? comboRec(id) : S.recipes.find(r => r.id === id);
const ZERO = () => ({ kcal: 0, p: 0, c: 0, f: 0 });
function addM(a, b, k = 1) { a.kcal += b.kcal * k; a.p += b.p * k; a.c += b.c * k; a.f += b.f * k; return a; }
function ingMacros(i, amt) { const f = i.unit === 'pcs' ? amt : amt / 100; return { kcal: i.kcal * f, p: i.p * f, c: i.c * f, f: i.f * f }; }
function recipeMacros(r) { const m = ZERO(); for (const it of r.items) { const i = ing(it.ing); if (i) addM(m, ingMacros(i, it.amt)); } return m; }
const unitCost = i => (i.price && i.pack) ? i.price / i.pack : 0;
function recipeCost(r) { let c = 0; for (const it of r.items) { const i = ing(it.ing); if (i) c += unitCost(i) * it.amt; } return c; }
function recipeProc(r) { let m = 0; for (const it of r.items) { const i = ing(it.ing); if (i) m = Math.max(m, i.proc || 0); } return m; }
const isClean = r => recipeProc(r) < 2;
const itemMacros = it => { const r = rec(it.rid); return r ? addM(ZERO(), recipeMacros(r), it.serv) : ZERO(); };
const itemCost = it => { const r = rec(it.rid); return r ? recipeCost(r) * it.serv : 0; };
const live = it => it && !it.skipped && rec(it.rid);

function bmr() {
  const p = S.profile;
  if (p.bodyFat > 0) return 370 + 21.6 * p.weight * (1 - p.bodyFat / 100); // Katch-McArdle (uses lean mass)
  return 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
}
const tdee = () => bmr() * S.profile.activity;
const weeklyAvg = () => tdee() * (1 + S.profile.surplus / 100);
function isTrain(d) { const w = S.workouts[d]; if (w) return w.done !== false; return S.profile.trainDays.includes(wdIdx(d)); }
function dayKcal(train) {
  const p = S.profile, n = p.trainDays.length, avg = weeklyAvg();
  if (n === 0 || n === 7) return avg;
  return avg + (train ? p.trainDelta * (7 - n) / 7 : -p.trainDelta * n / 7);
}
const baseKcal = d => dayKcal(isTrain(d));
function macrosFor(kcal) {
  const p = S.profile, pr = p.proteinPerKg * p.weight, fat = p.fatPct / 100 * kcal / 9;
  return { kcal, p: pr, f: fat, c: Math.max(0, (kcal - 4 * pr - 9 * fat) / 4) };
}
const targets = d => macrosFor(Math.max(1500, baseKcal(d) + (S.adjust[d] || 0)));
function consumed(d) {
  const m = ZERO(), dp = S.plan[d] || {};
  for (const s of SL()) if (dp[s] && dp[s].eaten && !dp[s].skipped) addM(m, itemMacros(dp[s]));
  for (const e of S.log[d] || []) addM(m, e);
  return m;
}
function plannedLeft(d) {
  const m = ZERO(), dp = S.plan[d] || {};
  for (const s of SL()) if (dp[s] && !dp[s].eaten && !dp[s].skipped) addM(m, itemMacros(dp[s]));
  return m;
}
function setEaten(d, slot, val) {
  const it = S.plan[d][slot]; if (!!it.eaten === val) return;
  it.eaten = val; const r = rec(it.rid);
  if (val) { it.used = {}; if (r) for (const x of r.items) { const i = ing(x.ing); if (!i) continue; const dec = Math.min(i.pantry || 0, x.amt * it.serv); i.pantry = (i.pantry || 0) - dec; it.used[i.id] = (it.used[i.id] || 0) + dec; } }
  else { for (const [id, q] of Object.entries(it.used || {})) { const i = ing(id); if (i) i.pantry = (i.pantry || 0) + q; } it.used = {}; }
}

/* ============ planner ============ */
/* How long food keeps after buying (days, in the fridge). Chicken bought on Sunday should not be eaten on Friday:
   the planner keeps every perishable ingredient within its window and eats it on consecutive days. */
const LIFE_AISLE = { 'Mięso i ryby': 3, 'Warzywa i owoce': 7, 'Pieczywo': 4, 'Nabiał i jajka': 8 };
const LIFE_ID = { gehakt: 2, kipgehakt: 2, kalkoengehakt: 2, zalm: 2, kip: 3, kipdij: 3, kalkoen: 3, makreel: 4, spinazie: 4, rucola: 3, avocado: 4, banaan: 6, champ: 5, broccoli: 6, bloemkool: 6,
  komkommer: 6, tomaat: 6, paprika: 8, wortel: 20, ui: 30, aardappel: 30, zoete: 21, butternut: 21, appel: 14, peer: 7, kiwi: 10, prei: 10, spruit: 8, courgette: 8, aubergine: 7,
  eieren: 21, kaas: 21, feta: 14, mozz: 5, tofu: 6, tempeh: 7, kwark: 7, skyr: 8, hutten: 7, griek: 8, melk: 6, karnemelk: 6, brood: 4, roggebrood: 7, wrap: 10, bosbes: 5,
  kup_kanapka: 2, kup_wrap: 3, kup_salade: 3, zuurkool: 30, hummus: 10, pastinaak: 14, rodekool: 20 };
const lifeOf = i => (i.life != null && i.life !== '' && !isNaN(+i.life)) ? +i.life : (LIFE_ID[i.id] ?? LIFE_AISLE[i.aisle] ?? 999);
const tripOf = di => ((S.profile.shopTrips | 0) >= 2 && di >= (S.profile.trip2Day ?? 3)) ? 1 : 0;
const SPOIL = .8, GAP = .12, PANTRY_EXP = .6;
/* Pack-fit: the planner tries to use up whole packages by the end of the week (little waste, few different products).
   strong = finish packs (cheapest), normal = balanced, off = ignore. Dishes may change completely from week to week. */
const varietyW = () => ({
  strong: { distinct: .06, waste: .75, repeat: .12, keep: -.06 },
  normal: { distinct: .035, waste: .30, repeat: .30, keep: -.06 },
  off: { distinct: 0, waste: 0, repeat: .50, keep: -.06 },
})[S.profile.packFit || 'strong'];
const LONG_LIFE = new Set(['Produkty suche', 'Mrożonki', 'Suplementy']);
/* Real shopping basket for a need map: whole packs, pantry subtracted. waste = value of the unused rest of each pack
   (perishables count fully, dry/frozen goods count less because they keep). */
function basketOf(need) {
  let cost = 0, distinct = 0, waste = 0;
  for (const [id, n0] of Object.entries(need)) {
    const i = ing(id); if (!i) continue;
    const n = Math.max(0, n0 - (i.pantry || 0)); if (n <= .01) continue;
    distinct++;
    if (i.pack > 1 && i.price) {
      const packs = Math.ceil(n / i.pack - 1e-9); cost += packs * i.price;
      waste += (packs * i.pack - n) * unitCost(i) * (LONG_LIFE.has(i.aisle) ? .35 : i.aisle === 'Mięso i ryby' ? .4 : 1);   // dry/frozen goods keep, meat/fish can be frozen
    } else cost += n * unitCost(i);
  }
  return { cost, distinct, waste };
}
/* Practical amounts: shopping rounds UP (never too little), cooking rounds to the nearest sensible step */
const qStep = a => a < 30 ? 1 : a < 150 ? 5 : a < 1000 ? 10 : 50;
const niceQty = (a, u) => u === 'pcs' ? (a <= 3 ? Math.ceil(a * 2 - 1e-9) / 2 : Math.ceil(a - 1e-9)) : Math.ceil(a / qStep(a) - 1e-9) * qStep(a);
const cookQty = (a, u) => u === 'pcs' ? (a < 3 ? Math.round(a * 2) / 2 : Math.round(a)) : (a < 20 ? Math.round(a) : a < 200 ? Math.round(a / 5) * 5 : Math.round(a / 10) * 10);
const basketAll = need => { const a = basketOf(need[0]); if ((S.profile.shopTrips | 0) < 2) return a; const b = basketOf(need[1]); return { cost: a.cost + b.cost, distinct: a.distinct + b.distinct, waste: a.waste + b.waste }; };   // one basket per shopping trip
const clampServ = x => Math.min(3, Math.max(.5, Math.round(x * 4) / 4));
const baseSetOf = week => { const b = S.bases && S.bases[week]; return b && b.length ? new Set(b) : null; };
/* every dish that may be offered for a slot: your recipes + dishes assembled from base products.
   With a chosen base set only dishes made of those products (plus staples and what is already at home) are offered. */
function optionPool(slot, week, ignoreSet = false) {
  const set = ignoreSet ? null : baseSetOf(week), style = S.profile.mealStyle || 'mix';
  let pool = S.recipes.filter(r => r.slots.includes(slot) && r.items.length && recipeMacros(r).kcal > 0 && (!S.profile.clean || isClean(r) || (r.tags || []).includes('kupne')));
  if (set) pool = pool.filter(r => r.items.every(x => set.has(x.ing) || COMBO_STAPLES.has(x.ing) || ((ing(x.ing) || {}).pantry || 0) > 0));
  if (style === 'combos') pool = pool.filter(r => (r.tags || []).includes('kupne'));
  const combos = style === 'recipes' ? [] : comboPool(slot, week, set);
  return pool.concat(combos);
}
function candidates(slot, week) {
  let c = optionPool(slot, week);
  if (!c.length && baseSetOf(week)) c = optionPool(slot, week, true);          // the chosen base set cannot make this meal: do not leave it empty
  const menu = S.menus[week] || [], m = c.filter(r => menu.includes(r.id));
  return m.length ? m : c;
}
function splitRun(run, N) {
  const n = Math.max(1, Math.ceil(run.length / Math.max(1, N))), base = Math.floor(run.length / n), extra = run.length % n, out = [];
  let i = 0; for (let b = 0; b < n; b++) { const sz = base + (b < extra ? 1 : 0); out.push(run.slice(i, i + sz)); i += sz; }
  return out;
}
const bigPen = sv => Math.max(0, sv - 1.5) * .25 + Math.max(0, sv - 2) * .6;   // huge multipliers of a recipe = silly portions (a litre of soup)
/* Week-level generator: lunch & dinner recipes are cooked once and eaten on `prepDays` consecutive days (same portion size each day). */
function generate(week, opts = {}) {
  const start = today(), warnings = [], slots = SL(), N = Math.max(1, S.profile.prepDays | 0);
  const days = [];
  for (let i = 0; i < 7; i++) { const d = addDays(week, i); if (d >= start && (!opts.only || opts.only === d)) days.push(d); }
  if (!days.length) return ['Ten tydzień jest już za nami'];
  const ctx = {}, prevUse = {};
  for (let i = 0; i < 7; i++) { const dp = S.plan[addDays(week, i)] || {}; for (const s of slots) if (dp[s] && (dp[s].eaten || dp[s].locked)) prevUse[dp[s].rid] = (prevUse[dp[s].rid] || 0) + 1; }
  for (const d of days) {
    const dp = S.plan[d] || (S.plan[d] = {}), tgt = targets(d), lg = ZERO();
    for (const e of S.log[d] || []) addM(lg, e);
    const fixed = slots.filter(s => dp[s] && (dp[s].eaten || dp[s].locked || dp[s].skipped || opts.keep));
    const free = slots.filter(s => !fixed.includes(s));
    for (const s of free) delete dp[s];
    const fx = ZERO(); for (const s of fixed) if (live(dp[s])) addM(fx, itemMacros(dp[s]));
    ctx[d] = { dp, free, kLeft: Math.max(0, tgt.kcal - lg.kcal - fx.kcal), pLeft: Math.max(0, tgt.p - lg.p - fx.p), shareSum: free.reduce((a, s) => a + shareOf(s), 0) || 1 };
  }
  const cand = {}, blocks = {};
  for (const s of slots) {
    cand[s] = candidates(s, week);
    if (!cand[s].length) { if (days.some(d => ctx[d].free.includes(s))) warnings.push(`Brak przepisów na: ${SLOT_PL[s].toLowerCase()} – dodaj je w zakładce Jedzenie`); continue; }
    const runs = []; let cur = [];
    for (const d of days) { if (ctx[d].free.includes(s)) cur.push(d); else { if (cur.length) runs.push(cur); cur = []; } }
    if (cur.length) runs.push(cur);
    blocks[s] = [];
    for (const run of runs) for (const b of ((s === 'lunch' || s === 'dinner') ? splitRun(run, N) : run.map(d => [d]))) blocks[s].push(b);
  }
  const bslots = slots.filter(s => blocks[s] && blocks[s].length);
  const weekBudget = S.profile.budget > 0 ? S.profile.budget * days.length / 7 : 0, W = varietyW();
  const prevSet = new Set();
  for (let i = -7; i < 0; i++) { const dp = S.plan[addDays(week, i)] || {}; for (const s of slots) if (live(dp[s])) prevSet.add(dp[s].rid); }
  const baseNeed = [{}, {}];
  for (let i = 0; i < 7; i++) { const dd = addDays(week, i), dp = S.plan[dd] || {}; if (dd < start) continue; const bn = baseNeed[tripOf(i)]; for (const s of slots) { const it = dp[s]; if (!live(it) || it.eaten) continue; for (const x of rec(it.rid).items) bn[x.ing] = (bn[x.ing] || 0) + x.amt * it.serv; } }
  const mc = new Map(), rm = r => { let v = mc.get(r.id); if (!v) mc.set(r.id, v = recipeMacros(r)); return v; };
  const lc = {}, lifeC = id => (id in lc ? lc[id] : (lc[id] = ing(id) ? lifeOf(ing(id)) : 999));
  const pantryExp = S.ingredients.filter(i => (i.pantry || 0) > 0 && i.pantryExp && i.pantryExp <= addDays(week, 6));
  const meatPref = ({ less: -.15, normal: .22, more: .4 })[S.profile.meatPref || 'normal'], hmc = {}, hasMeat = r => (r.id in hmc ? hmc[r.id] : (hmc[r.id] = r.items.some(x => ing(x.ing) && ing(x.ing).aisle === 'Mięso i ryby')));
  const blockList = [];
  for (const s of bslots) for (const bl of blocks[s]) blockList.push({ s, days: bl });
  const evalAssign = assign => {
    const pick = {}, cnt = {}; let sc = 0;
    blockList.forEach((bl, k) => {
      const r = assign[k], m = rm(r);
      let f = 0; for (const d of bl.days) { const c2 = ctx[d]; f += c2.kLeft * shareOf(bl.s) / c2.shareSum / m.kcal; }
      const sv = clampServ(f / bl.days.length);               // one portion size for the whole cooking session
      for (const d of bl.days) (pick[d] = pick[d] || {})[bl.s] = { r, sv };
      const key = bl.s + '|' + r.id; cnt[key] = (cnt[key] || 0) + 1;
      if (prevSet.has(r.id)) sc -= W.keep;
      sc += bigPen(sv) * bl.days.length;
      if (bl.s === 'dinner') sc -= meatPref * (hasMeat(r) ? 1 : 0) * bl.days.length;   // taste: how often meat/fish for dinner
    });
    for (const k in cnt) { const rid = k.split('|')[1]; sc += (cnt[k] - 1) * W.repeat + (prevUse[rid] || 0) * .15; }
    const need = [Object.assign({}, baseNeed[0]), Object.assign({}, baseNeed[1])], usage = {}; let prevB = null;
    for (const d of days) {
      const c2 = ctx[d], tot = ZERO(), pk = pick[d] || {}, di = wdIdx(d);
      for (const s of c2.free) {
        const p = pk[s]; if (!p) continue;
        addM(tot, rm(p.r), p.sv);
        for (const x of p.r.items) { const nt = need[tripOf(di)]; nt[x.ing] = (nt[x.ing] || 0) + x.amt * p.sv; if (lifeC(x.ing) < 8) { const key = x.ing + '|' + tripOf(di); (usage[key] = usage[key] || new Set()).add(di); } }
      }
      sc += Math.abs(tot.kcal - c2.kLeft) / Math.max(c2.kLeft, 1) * 3 + Math.max(0, c2.pLeft - tot.p) / Math.max(c2.pLeft, 1) * 4;
      if (pk.lunch && pk.dinner && pk.lunch.r.id === pk.dinner.r.id) sc += .9;
      if (pk.breakfast && pk.lunch && pk.breakfast.r.id === pk.lunch.r.id) sc += .9;
      if (pk.breakfast && prevB && pk.breakfast.r.id === prevB) sc += .35;
      prevB = pk.breakfast ? pk.breakfast.r.id : null;
    }
    // perishables must be used within their shelf life and on consecutive days (no gaps = nothing goes off in the fridge)
    for (const key in usage) {
      const id = key.split('|')[0], ds = [...usage[key]].sort((a, b) => a - b), life = lifeC(id), span = ds[ds.length - 1] - ds[0] + 1;
      if (span > life) sc += (span - life) * SPOIL * (ing(id) && ing(id).aisle === 'Mięso i ryby' ? .3 : 1);   // meat and fish can be frozen, so a long span costs less (the list says: freeze part)
      else if (life <= 4) sc += (span - ds.length) * GAP;
    }
    const sh = basketAll(need);
    if (weekBudget) sc += Math.max(0, sh.cost - weekBudget) / weekBudget * 5;
    sc += sh.cost * .015 + sh.distinct * W.distinct + sh.waste * W.waste;
    for (const i of pantryExp) sc += Math.max(0, (i.pantry || 0) - ((need[0][i.id] || 0) + (need[1][i.id] || 0))) * unitCost(i) * PANTRY_EXP;   // food in the fridge that expires this week should be used
    return { sc, pick };
  };
  const rnd1 = s => cand[s][Math.floor(Math.random() * cand[s].length)];
  let best = null;
  if (blockList.length) for (let restart = 0; restart < 10; restart++) {   // random start, then hill-climb: swap one block's recipe if the whole week gets better
    let cur = blockList.map(bl => rnd1(bl.s)), curE = evalAssign(cur);
    for (let it = 0; it < 450; it++) {
      const k = Math.floor(Math.random() * blockList.length), r = rnd1(blockList[k].s);
      if (r === cur[k]) continue;
      const nxt = cur.slice(); nxt[k] = r; const e = evalAssign(nxt);
      if (e.sc < curE.sc) { cur = nxt; curE = e; }
    }
    if (!best || curE.sc < best.sc) best = curE;
  }
  if (best) for (const d of days) {
    const c = ctx[d];
    for (const s of c.free) { const p = best.pick[d] && best.pick[d][s]; if (p) c.dp[s] = { rid: p.r.id, serv: p.sv }; }
  }
  /* Fine-tune portion sizes so packages get used up: nudge a whole cooking session by a quarter, alone or paired with
     another meal of the same day (one up, one down keeps the calories); keep a change only if the whole week scores better. */
  if (best && (W.waste > 0 || W.distinct > 0)) {
    const units = blockList.map(bl => ({ days: bl.days, items: bl.days.map(d => ctx[d].dp[bl.s]).filter(Boolean) })).filter(u => u.items.length);
    const byDay = {}; units.forEach(u => u.days.forEach(d => (byDay[d] = byDay[d] || []).push(u)));
    const used = days.filter(d => byDay[d]);
    const objective = () => {
      const need = [Object.assign({}, baseNeed[0]), Object.assign({}, baseNeed[1])]; let sc = 0;
      for (const d of used) {
        const c2 = ctx[d], tot = ZERO();
        for (const s of c2.free) { const it = c2.dp[s]; if (!it) continue; addM(tot, itemMacros(it)); const nt = need[tripOf(wdIdx(d))]; for (const x of rec(it.rid).items) nt[x.ing] = (nt[x.ing] || 0) + x.amt * it.serv; }
        sc += Math.abs(tot.kcal - c2.kLeft) / Math.max(c2.kLeft, 1) * 22 + Math.max(0, c2.pLeft - tot.p) / Math.max(c2.pLeft, 1) * 4;
      }
      const sh = basketAll(need);
      return sc + sh.waste * W.waste + sh.distinct * W.distinct + (weekBudget ? Math.max(0, sh.cost - weekBudget) / weekBudget * 5 : 0) + sh.cost * .015;
    };
    const setU = (u, v) => u.items.forEach(it => it.serv = v);
    const tryStep = (u, dlt) => { const old = u.items[0].serv, ns = Math.round((old + dlt) * 4) / 4; if (ns < .5 || ns > 3) return null; setU(u, ns); return old; };
    let cur = objective();
    for (let n = 0; n < 1800 && used.length; n++) {
      const us = byDay[used[Math.floor(Math.random() * used.length)]];
      const x = us[Math.floor(Math.random() * us.length)], dx = Math.random() < .5 ? .25 : -.25, ox = tryStep(x, dx);
      if (ox === null) continue;
      let y = null, oy = null;
      if (us.length > 1 && Math.random() < .6) { y = us.filter(z => z !== x)[Math.floor(Math.random() * (us.length - 1))]; oy = tryStep(y, -dx); if (oy === null) { setU(x, ox); continue; } }
      const o = objective();
      if (o < cur - 1e-9) cur = o; else { setU(x, ox); if (y) setU(y, oy); }
    }
  }
  return warnings;
}
function refitDay(d) {
  const dp = S.plan[d]; if (!dp) return;
  const need = targets(d).kcal - consumed(d).kcal, cur = plannedLeft(d).kcal;
  if (cur <= 0) return;
  const f = need > 0 ? need / cur : .5;
  for (const s of SL()) if (dp[s] && !dp[s].eaten && !dp[s].skipped) dp[s].serv = clampServ(dp[s].serv * f);
}
/* Cook sessions: consecutive days with the same lunch/dinner recipe = cook once. Portions = number of meals (whole numbers). */
function cookSessions(week) {
  const out = [], start = today();
  for (const s of ['lunch', 'dinner']) {
    if (!SL().includes(s)) continue;
    let cur = null;
    for (let i = 0; i < 7; i++) {
      const d = addDays(week, i), it = (S.plan[d] || {})[s];
      if (it && live(it) && !it.eaten && d >= start) {
        if (cur && cur.rid === it.rid && cur.last === addDays(d, -1)) { cur.days.push(d); cur.last = d; cur.items.push(it); }
        else { cur = { rid: it.rid, slot: s, days: [d], last: d, items: [it] }; out.push(cur); }
      } else cur = null;
    }
  }
  for (const x of out) {
    x.portions = x.days.length; const r = rec(x.rid), tot = {};
    for (const it of x.items) for (const y of r.items) tot[y.ing] = (tot[y.ing] || 0) + y.amt * it.serv;
    x.totals = Object.entries(tot).map(([id, a]) => ({ i: ing(id), a })).filter(t => t.i);
  }
  return out.sort((a, b) => a.days[0].localeCompare(b.days[0]));
}

/* ============ cheat meal ============ */
function spreadDays(d, replaces) {
  const dp = S.plan[d] || {}, days = [];
  if (SL().filter(s => dp[s] && !dp[s].eaten && !dp[s].skipped && s !== replaces).length) days.push(d);
  for (let k = 1; k <= 6; k++) days.push(addDays(d, k));
  return days;
}
function cheatPreview(d, kcal, replaces) {
  let surplus = kcal;
  const it = replaces && S.plan[d] && S.plan[d][replaces];
  if (it && !it.eaten && !it.skipped) surplus -= itemMacros(it).kcal;
  return { surplus, days: spreadDays(d, replaces) };
}
function applyCheat(d, c) {
  const e = { id: uid(), name: c.name || 'Cheat meal', slot: 'cheat', cheat: true, kcal: c.kcal, p: c.p || 0, c: c.c || 0, f: c.f || 0, replaces: c.replaces || null, spread: {} };
  const { surplus, days } = cheatPreview(d, c.kcal, c.replaces);
  if (c.replaces && S.plan[d] && S.plan[d][c.replaces] && !S.plan[d][c.replaces].eaten) S.plan[d][c.replaces].skipped = true;
  (S.log[d] = S.log[d] || []).push(e);
  let absorbed = 0;
  if (surplus > 0 && days.length) {
    const share = surplus / days.length, cap = S.profile.cheatCap / 100;
    for (const x of days) { const red = Math.min(share, cap * baseKcal(x)); S.adjust[x] = (S.adjust[x] || 0) - red; e.spread[x] = red; absorbed += red; }
    for (const x of days) refitDay(x);
  } else refitDay(d);
  return { surplus, absorbed, n: days.length };
}
function removeLog(d, id) {
  const arr = S.log[d] || [], e = arr.find(x => x.id === id); if (!e) return;
  S.log[d] = arr.filter(x => x.id !== id);
  if (e.cheat) {
    for (const [x, v] of Object.entries(e.spread || {})) S.adjust[x] = (S.adjust[x] || 0) + v;
    if (e.replaces && S.plan[d] && S.plan[d][e.replaces]) S.plan[d][e.replaces].skipped = false;
    for (const x of Object.keys(e.spread || {})) refitDay(x);
  }
  refitDay(d);
}

/* ============ shopping ============ */
/* rows: exact need (rounded up to a practical amount) + the packs that cover it. With two shopping trips a week,
   each trip only holds the days it feeds, so perishables are bought fresh. Pantry stock is used up first. */
function shopList(week, trip = null) {
  const start = week < today() && addDays(week, 6) >= today() ? today() : week, nT = (S.profile.shopTrips | 0) >= 2 ? 2 : 1;
  const need = [{}, {}], uses = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(week, i); if (d < start) continue;
    const tr = nT === 2 ? tripOf(i) : 0, dp = S.plan[d] || {};
    for (const s of SL()) {
      const it = dp[s]; if (!it || it.eaten || it.skipped) continue; const r = rec(it.rid); if (!r) continue;
      for (const x of r.items) { need[tr][x.ing] = (need[tr][x.ing] || 0) + x.amt * it.serv; (uses[x.ing + '|' + tr] = uses[x.ing + '|' + tr] || []).push(i); }
    }
  }
  const left = {}; S.ingredients.forEach(i => left[i.id] = i.pantry || 0);
  const rows = [];
  for (let tr = 0; tr < nT; tr++) for (const [id, n] of Object.entries(need[tr])) {
    const i = ing(id); if (!i) continue;
    const have = Math.min(left[id], n); left[id] -= have;
    const buy = Math.max(0, n - have);
    let qty = buy, packs = null, cost = buy * unitCost(i);
    if (buy > 0.01 && i.pack > 1) { packs = Math.ceil(buy / i.pack - 1e-9); qty = packs * i.pack; cost = i.price ? packs * i.price : 0; }
    if (i.unit === 'pcs' && !packs && buy > .01) { qty = Math.ceil(buy - 1e-9); cost = qty * unitCost(i); }
    const ds = uses[id + '|' + tr] || [0], first = Math.min(...ds), last = Math.max(...ds), life = lifeOf(i);
    rows.push({ i, need: n, have, buy, qty, packs, cost, trip: tr, first, last, life, exact: buy > .01 ? niceQty(buy, i.unit) : 0, freeze: buy > .01 && life <= 5 && (last - first + 1) > life });
  }
  return trip == null ? rows : rows.filter(r => r.trip === trip);
}
const shopSorted = rows => rows.filter(r => r.buy > .01).sort((a, b) => (AISLES.indexOf(a.i.aisle) - AISLES.indexOf(b.i.aisle)) || a.i.name.localeCompare(b.i.name, 'pl'));
const packNote = r => r.packs ? `${r.packs}× ${fmtAmt(r.i.pack, r.i.unit)}` : '';
const shopLine = r => `${r.i.name}${r.i.nl ? ' (' + r.i.nl + ')' : ''} – ${fmtAmt(r.exact, r.i.unit)}${r.packs ? ' (' + packNote(r) + ')' : ''}`;
const tripLabel = tr => tr === 0 ? `Zakupy 1 (${DAYN[0]}–${DAYN[(S.profile.trip2Day ?? 3) - 1]})` : `Zakupy 2 (${DAYN[S.profile.trip2Day ?? 3]}–${DAYN[6]})`;
function shopText(week) {
  const nT = (S.profile.shopTrips | 0) >= 2 ? 2 : 1;
  let txt = `Zakupy ${S.profile.store} – tydzień od ${fmtDay(week)}\n`;
  for (let tr = 0; tr < nT; tr++) {
    if (nT === 2) txt += `\n=== ${tripLabel(tr)} ===\n`;
    let last = null;
    for (const r of shopSorted(shopList(week, tr))) { if (r.i.aisle !== last) { txt += `\n${r.i.aisle}\n`; last = r.i.aisle; } txt += `☐ ${shopLine(r)}${r.freeze ? ' – część zamroź' : ''}\n`; }
  }
  return txt;
}

/* ============ workouts / csv ============ */
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some(x => x.trim())) rows.push(row);
  return rows;
}
function normDate(s) {
  s = (s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/))) { let a = +m[1], b = +m[2]; if (b > 12) [a, b] = [b, a]; return `${m[3]}-${pad(b)}-${pad(a)}`; }
  const t = Date.parse(s); return isNaN(t) ? null : ymd(new Date(t));
}
function importWorkouts(text) {
  const rows = parseCSV(text); if (rows.length < 2) return { err: 'Plik wygląda na pusty' };
  const h = rows[0].map(x => x.trim().toLowerCase());
  const col = re => h.findIndex(x => re.test(x));
  const cd = col(/date|data|day|time|start/), cn = col(/workout|title|routine|session|name|nazwa/), cw = col(/weight|kg|lbs|ciężar/), cr = col(/rep|powt/);
  if (cd < 0) return { err: 'Nie znalazłem kolumny z datą. Kolumny: ' + h.join(', ') };
  const days = {};
  for (const r of rows.slice(1)) {
    const d = normDate(r[cd]); if (!d) continue;
    const w = days[d] || (days[d] = { done: true, name: '', sets: 0, volume: 0, source: 'csv' });
    w.sets++; if (cn >= 0 && !w.name) w.name = (r[cn] || '').trim();
    if (cw >= 0 && cr >= 0) w.volume += num(r[cw]) * num(r[cr]);
  }
  let n = 0; for (const [d, w] of Object.entries(days)) { S.workouts[d] = Object.assign(S.workouts[d] || {}, w); n++; }
  return { n };
}
function logWorkout(d, w) { S.workouts[d] = Object.assign({ source: 'manual' }, S.workouts[d] || {}, w, { done: true }); }

/* ============ fridge / pantry ============ */
/* how much of a recipe portion is already at home (value-weighted, 0..1) */
function pantryCover(r, serv = 1) {
  let n = 0, d = 0;
  for (const x of r.items) { const i = ing(x.ing); if (!i) continue; const need = x.amt * serv, w = Math.max(.05, unitCost(i) * need); d += w; n += w * Math.min(1, (i.pantry || 0) / need); }
  return d ? n / d : 0;
}
const pantryItems = () => S.ingredients.filter(i => (i.pantry || 0) > 0.01);
const daysLeft = i => i.pantryExp ? Math.round((parseD(i.pantryExp) - parseD(today())) / 864e5) : null;
/* ideas: dishes you can (almost) make from what you have – soonest-expiring food first */
function pantryIdeas(n = 8) {
  const have = pantryItems(); if (!have.length) return [];
  const wk = weekStart(today());
  return S.recipes.concat(comboPool('dinner', wk, null, 160), comboPool('lunch', wk, null, 80)).filter(r => r.items.length && !r.slots.every(s => s === 'snack')).map(r => {
    const serv = 1, cover = pantryCover(r, serv);
    const missing = r.items.filter(x => { const i = ing(x.ing); return i && (i.pantry || 0) < x.amt * serv * .8; }).map(x => ing(x.ing).name);
    let urgent = 0; for (const x of r.items) { const i = ing(x.ing), dl = i && daysLeft(i); if (dl != null && (i.pantry || 0) > 0 && dl <= 4) urgent += 1; }
    return { r, cover, missing, urgent, sc: cover + urgent * .25 };
  }).filter(x => x.cover >= .3).sort((a, b) => b.sc - a.sc).slice(0, n);
}

/* ============ meal options (rotating alternatives for a slot) ============ */
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seededRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
/* Alternatives to what is planned: similar calories, different main ingredients, using what is at home and what is
   already in this week's basket. `seen` = options you already looked at: each refresh shows NEW ones until the pool is used up. */
function optionsFor(d, s, n = 3, rot = 0, seen = []) {
  const cur = (S.plan[d] || {})[s], week = weekStart(d);
  const tgtK = cur && live(cur) ? itemMacros(cur).kcal : targets(d).kcal * shareOf(s);
  const use = {}, recent = {}, have = new Set();
  for (let i = 0; i < 7; i++) {
    const dd = addDays(week, i), dp = S.plan[dd] || {};
    for (const sl of SL()) if (live(dp[sl])) { const r = rec(dp[sl].rid); use[dp[sl].rid] = (use[dp[sl].rid] || 0) + 1; if (sl === s && Math.abs(i - wdIdx(d)) <= 2) recent[dp[sl].rid] = 1; r.items.forEach(x => have.add(x.ing)); }
  }
  const W = varietyW(), rnd = seededRand(hashStr(d + s + rot)), seenSet = new Set(seen);
  const scored = optionPool(s, week).filter(r => !cur || r.id !== cur.rid).map(r => {
    const m = recipeMacros(r); if (m.kcal <= 0) return null;
    const serv = clampServ(tgtK / m.kcal), got = m.kcal * serv, nw = r.items.filter(x => !have.has(x.ing) && !COMBO_STAPLES.has(x.ing)).length, cover = pantryCover(r, serv);
    return { rid: r.id, serv, kcal: got, p: m.p * serv, nw, cover, key: comboKey(r), sc: Math.abs(got - tgtK) / tgtK * 3 + (use[r.id] || 0) * .3 + (recent[r.id] ? .6 : 0) + rnd() * .5 + bigPen(serv) + nw * Math.max(.05, W.distinct * 2.5) - cover * 1.4 };
  }).filter(Boolean);
  let fresh = scored.filter(o => !seenSet.has(o.rid));
  if (fresh.length < n) fresh = scored;                                   // everything seen: start again
  fresh.sort((a, b) => a.sc - b.sc);
  const out = [], keys = new Set();
  for (const o of fresh) { if (out.length >= n) break; if (keys.has(o.key) && fresh.length > n * 4) continue; out.push(o); keys.add(o.key); }   // different main ingredient each
  for (const o of fresh) { if (out.length >= n) break; if (!out.includes(o)) out.push(o); }
  return out;
}
function swapMeal(d, s, rid, serv) { const dp = S.plan[d] || (S.plan[d] = {}); dp[s] = { rid, serv, locked: true }; }

/* ============ shopping list for Reminders / notes apps ============ */
const remLine = r => `${r.i.nl || r.i.name} – ${fmtAmt(r.exact, r.i.unit)}${r.packs ? ' (' + packNote(r) + ')' : ''}${r.i.nl ? ' · ' + r.i.name : ''}`;
const remindersText = week => { const nT = (S.profile.shopTrips | 0) >= 2 ? 2 : 1; return shopSorted(shopList(week, nT === 2 ? (week <= today() && addDays(week, 6) >= today() && wdIdx(today()) >= (S.profile.trip2Day ?? 3) ? 1 : 0) : null)).map(remLine).join('\n'); };

/* ============ base-product sets ("półprodukty na tydzień") ============ */
/* Pick the set of products (about 8–12) that feeds the whole week most cheaply: whole packs, little waste, few products. */
function suggestBaseSet(tries = 500) {
  const D = comboParts('dinner', null), L = comboParts('lunch', null);
  const pick = (arr, n, prefer) => { const pool = arr.slice(), out = []; while (out.length < n && pool.length) { const pr = prefer && prefer.filter(x => pool.includes(x)); const src = pr && pr.length && Math.random() < .7 ? pr : pool; const x = src[Math.floor(Math.random() * src.length)]; out.push(x); pool.splice(pool.indexOf(x), 1); } return out; };
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  let best = null;
  for (let t = 0; t < tries; t++) {
    const dp = pick(D.p, rint(2, 3)), dc = pick(D.c, 2), dv = pick(D.v, 3), x = pick(D.x, rint(1, 2));
    const lp = pick(L.p, rint(1, 2), dp), lc = pick(L.c, rint(1, 2), dc), lv = pick(L.v, rint(1, 2), dv);
    const need = {}, add = (id, a) => need[id] = (need[id] || 0) + a;
    for (let i = 0; i < 7; i++) { const P = COMBO.p[dp[i % dp.length]], C = COMBO.c[dc[i % dc.length]], V = COMBO.v[dv[i % dv.length]]; add(dp[i % dp.length], P.amt * 2.5); add(dc[i % dc.length], C.amt * 2.5); add(dv[i % dv.length], V.amt * 2.5); add('olijf', 15); if (x.length && i % 2 === 0) add(x[i % x.length], COMBO.x[x[i % x.length]].amt * 2.5);
      const lP = COMBO.p[lp[i % lp.length]], lC = COMBO.c[lc[i % lc.length]], lV = COMBO.v[lv[i % lv.length]]; add(lp[i % lp.length], lP.amt * 1.1); add(lc[i % lc.length], lC.amt * 1.1); add(lv[i % lv.length], lV.amt * 1.1); }
    const sh = basketOf(need);
    let pen = 0; for (const id of dp) { const i = ing(id); if (i && lifeOf(i) < 5 && 7 / dp.length > lifeOf(i)) pen += .5; }
    let sc = sh.cost * .02 + sh.waste * .75 + sh.distinct * .08 + pen;
    if (!dp.some(id => ing(id) && ing(id).aisle === 'Mięso i ryby')) sc += ({ less: 0, normal: .6, more: 1.2 })[S.profile.meatPref || 'normal'];   // respect the meat preference
    if (!best || sc < best.sc) best = { sc, ids: [...new Set([...dp, ...dc, ...dv, ...x, ...lp, ...lc, ...lv])] };
  }
  return best ? best.ids : [];
}
