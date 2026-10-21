'use strict';
/* ============ constants & utils ============ */
const SLOTS_ALL = ['breakfast', 'snack', 'lunch', 'dinner'];
const SLOT_PL = { breakfast: 'Śniadanie', snack: 'Przekąska', lunch: 'Lunch', dinner: 'Kolacja' };
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
  for (const k of ['plan', 'log', 'workouts', 'adjust', 'shopChecked', 'menus']) S[k] = S[k] || {};
  S.chat = S.chat || []; S.ingredients = S.ingredients || []; S.recipes = S.recipes || [];
  S.profile = Object.assign({}, d.profile, S.profile || {});
  if (S.profileSet === undefined && (S.setupDone || S.rev > 0)) S.profileSet = true;   // existing users are not asked again
  S.recipes.forEach(r => { r.tags = r.tags || []; r.how = r.how || ''; r.prep = r.prep || ''; });
  S.ingredients.forEach(i => { if (i.proc == null) i.proc = 0; if (i.nl == null) i.nl = ''; });
  S.ingredients.forEach(i => { if (i.starter) i.name = i.name.replace(' (1 szt.)', ''); });
  if (S.starter !== false && (S.seedVersion || 1) < SEED_VERSION) { // add newly shipped starter food, never touching existing items
    for (const i of d.ingredients) if (!S.ingredients.some(x => x.id === i.id)) S.ingredients.push(i);
    for (const r of d.recipes) if (!S.recipes.some(x => x.id === r.id || x.name === r.name)) S.recipes.push(r);
    for (const sr of d.recipes) { const x = S.recipes.find(y => y.name === sr.name && y.starter); if (x && sr.how) x.how = sr.how; } // richer cooking steps
    S.seedVersion = SEED_VERSION; setTimeout(() => save(), 0);
  }
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
  }
  S = d && d.profile ? d : Object.assign(seedData(), { rev: (d && d.rev) || 0 });
  migrate();
}
let saveT = null, saving = false, pending = false;
function save() { UI.dirty = true; clearTimeout(saveT); saveT = setTimeout(doSave, 250); }
async function doSave() {
  if (UI.local) { try { localStorage.setItem('fuel-data', JSON.stringify(S)); UI.dirty = false; } catch (e) { toast('Nie można zapisać danych w przeglądarce!'); } return; }
  if (saving) { pending = true; return; }
  saving = true;
  try {
    const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S) });
    if (r.status === 409) { await load(); UI.dirty = false; toast('Dane zmieniono na innym urządzeniu – odświeżono. Powtórz ostatnią zmianę.'); render(); }
    else { S.rev = (await r.json()).rev; UI.dirty = false; }
  } catch (e) { toast('Brak połączenia z serwerem Fuel – zmiany NIE zapisane!'); }
  saving = false;
  if (pending) { pending = false; doSave(); }
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3600); }

/* ============ nutrition model ============ */
const SL = () => S.profile.snack ? ['breakfast', 'snack', 'lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner'];
const SHARES3 = { breakfast: .27, lunch: .35, dinner: .38 }, SHARES4 = { breakfast: .23, snack: .12, lunch: .30, dinner: .35 };
const shareOf = s => (S.profile.snack ? SHARES4 : SHARES3)[s] || .25;
const ing = id => S.ingredients.find(i => i.id === id);
const rec = id => S.recipes.find(r => r.id === id);
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
      waste += (packs * i.pack - n) * unitCost(i) * (LONG_LIFE.has(i.aisle) ? .35 : 1);
    } else cost += n * unitCost(i);
  }
  return { cost, distinct, waste };
}
const clampServ = x => Math.min(2.5, Math.max(.5, Math.round(x * 4) / 4));
function candidates(slot, week) {
  let c = S.recipes.filter(r => r.slots.includes(slot) && r.items.length && recipeMacros(r).kcal > 0);
  if (S.profile.clean) c = c.filter(isClean);
  const menu = S.menus[week] || [], m = c.filter(r => menu.includes(r.id));
  return m.length ? m : c;
}
function splitRun(run, N) {
  const n = Math.max(1, Math.ceil(run.length / Math.max(1, N))), base = Math.floor(run.length / n), extra = run.length % n, out = [];
  let i = 0; for (let b = 0; b < n; b++) { const sz = base + (b < extra ? 1 : 0); out.push(run.slice(i, i + sz)); i += sz; }
  return out;
}
/* Week-level generator: lunch & dinner recipes are cooked once and repeated for `prepDays` consecutive days. */
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
  const baseNeed = {};
  for (let i = 0; i < 7; i++) { const dd = addDays(week, i), dp = S.plan[dd] || {}; if (dd < start) continue; for (const s of slots) { const it = dp[s]; if (!live(it) || it.eaten) continue; for (const x of rec(it.rid).items) baseNeed[x.ing] = (baseNeed[x.ing] || 0) + x.amt * it.serv; } }
  const blockList = [];
  for (const s of bslots) for (const bl of blocks[s]) blockList.push({ s, days: bl });
  const evalAssign = assign => {
    const pick = {}, cnt = {}; let sc = 0;
    blockList.forEach((bl, k) => {
      const r = assign[k];
      for (const d of bl.days) (pick[d] = pick[d] || {})[bl.s] = r;
      const key = bl.s + '|' + r.id; cnt[key] = (cnt[key] || 0) + 1;
      if (prevSet.has(r.id)) sc -= W.keep;
    });
    for (const k in cnt) { const rid = k.split('|')[1]; sc += (cnt[k] - 1) * W.repeat + (prevUse[rid] || 0) * .15; }
    const need = Object.assign({}, baseNeed); let prevB = null;
    for (const d of days) {
      const c2 = ctx[d], tot = ZERO();
      for (const s of c2.free) { const r = pick[d] && pick[d][s]; if (!r) continue; const m = recipeMacros(r), sv = clampServ(c2.kLeft * shareOf(s) / c2.shareSum / m.kcal); addM(tot, m, sv); for (const x of r.items) need[x.ing] = (need[x.ing] || 0) + x.amt * sv; if (sv > 1.75) sc += (sv - 1.75) * .35; }
      sc += Math.abs(tot.kcal - c2.kLeft) / Math.max(c2.kLeft, 1) * 3 + Math.max(0, c2.pLeft - tot.p) / Math.max(c2.pLeft, 1) * 4;
      const pk = pick[d] || {};
      if (pk.lunch && pk.dinner && pk.lunch.id === pk.dinner.id) sc += .9;
      if (pk.breakfast && prevB && pk.breakfast.id === prevB) sc += .35;
      prevB = pk.breakfast ? pk.breakfast.id : null;
    }
    const sh = basketOf(need);
    if (weekBudget) sc += Math.max(0, sh.cost - weekBudget) / weekBudget * 5;
    sc += sh.cost * .04;
    sc += sh.distinct * W.distinct + sh.waste * W.waste;
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
    for (const s of c.free) { const r = best.pick[d] && best.pick[d][s]; if (!r) continue; c.dp[s] = { rid: r.id, serv: clampServ(c.kLeft * shareOf(s) / c.shareSum / recipeMacros(r).kcal) }; }
  }
  /* Fine-tune portions so packages get used up: nudge servings by a quarter, alone or as a pair inside one day
     (one up, one down keeps the calories), and keep a change only if the whole week scores better. */
  if (best && W.waste > 0) {
    const used = days.filter(d => ctx[d].free.some(s => ctx[d].dp[s]));
    const objective = () => {
      const need = Object.assign({}, baseNeed); let sc = 0;
      for (const d of used) {
        const c2 = ctx[d], tot = ZERO();
        for (const s of c2.free) { const it = c2.dp[s]; if (!it) continue; addM(tot, itemMacros(it)); for (const x of rec(it.rid).items) need[x.ing] = (need[x.ing] || 0) + x.amt * it.serv; }
        sc += Math.abs(tot.kcal - c2.kLeft) / Math.max(c2.kLeft, 1) * 10 + Math.max(0, c2.pLeft - tot.p) / Math.max(c2.pLeft, 1) * 4;
      }
      const sh = basketOf(need);
      return sc + sh.waste * W.waste + sh.distinct * W.distinct + (weekBudget ? Math.max(0, sh.cost - weekBudget) / weekBudget * 5 : 0) + sh.cost * .04;
    };
    const step = (it, dlt) => { const ns = Math.round((it.serv + dlt) * 4) / 4; if (ns < .5 || ns > 2.5) return false; it.serv = ns; return true; };
    let cur = objective();
    for (let n = 0; n < 1800 && used.length; n++) {
      const c2 = ctx[used[Math.floor(Math.random() * used.length)]], its = c2.free.map(s => c2.dp[s]).filter(Boolean);
      if (!its.length) continue;
      const x = its[Math.floor(Math.random() * its.length)], dx = Math.random() < .5 ? .25 : -.25;
      if (!step(x, dx)) continue;
      let y = null, dy = 0;
      if (its.length > 1 && Math.random() < .6) { y = its.filter(z => z !== x)[Math.floor(Math.random() * (its.length - 1))]; dy = -dx; if (!step(y, dy)) { x.serv -= dx; continue; } }
      const o = objective();
      if (o < cur - 1e-9) cur = o; else { x.serv -= dx; if (y) y.serv -= dy; }
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
/* Cook sessions: consecutive days with the same lunch/dinner recipe = cook once */
function cookSessions(week) {
  const out = [], start = today();
  for (const s of ['lunch', 'dinner']) {
    if (!SL().includes(s)) continue;
    let cur = null;
    for (let i = 0; i < 7; i++) {
      const d = addDays(week, i), it = (S.plan[d] || {})[s];
      if (it && live(it) && !it.eaten && d >= start) {
        if (cur && cur.rid === it.rid && cur.last === addDays(d, -1)) { cur.days.push(d); cur.serv += it.serv; cur.last = d; }
        else { cur = { rid: it.rid, slot: s, days: [d], serv: it.serv, last: d }; out.push(cur); }
      } else cur = null;
    }
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
function shopList(week) {
  const start = week < today() && addDays(week, 6) >= today() ? today() : week, need = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(week, i); if (d < start) continue;
    const dp = S.plan[d] || {};
    for (const s of SL()) { const it = dp[s]; if (!it || it.eaten || it.skipped) continue; const r = rec(it.rid); if (!r) continue; for (const x of r.items) need[x.ing] = (need[x.ing] || 0) + x.amt * it.serv; }
  }
  const rows = [];
  for (const [id, n] of Object.entries(need)) {
    const i = ing(id); if (!i) continue;
    const have = i.pantry || 0, buy = Math.max(0, n - have);
    let qty = buy, packs = null, cost = buy * unitCost(i);
    if (buy > 0.01 && i.pack > 1) { packs = Math.ceil(buy / i.pack - 1e-9); qty = packs * i.pack; cost = i.price ? packs * i.price : 0; }
    if (i.unit === 'pcs' && !packs && buy > .01) { qty = Math.ceil(buy - 1e-9); cost = qty * unitCost(i); }
    rows.push({ i, need: n, have, buy, qty, packs, cost });
  }
  return rows;
}
const shopSorted = rows => rows.filter(r => r.buy > .01).sort((a, b) => (AISLES.indexOf(a.i.aisle) - AISLES.indexOf(b.i.aisle)) || a.i.name.localeCompare(b.i.name, 'pl'));
const shopLine = r => `${r.i.name}${r.i.nl ? ' (' + r.i.nl + ')' : ''} – ${r.packs ? r.packs + '× ' + fmtAmt(r.i.pack, r.i.unit) : fmtAmt(r.qty, r.i.unit)}`;
function shopText(week) {
  let txt = `Zakupy ${S.profile.store} – tydzień od ${fmtDay(week)}\n`, last = null;
  for (const r of shopSorted(shopList(week))) { if (r.i.aisle !== last) { txt += `\n${r.i.aisle}\n`; last = r.i.aisle; } txt += `☐ ${shopLine(r)}\n`; }
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

/* ============ meal options (rotating alternatives for a slot) ============ */
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seededRand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
/* Alternatives to what is planned: similar calories, not recently eaten, stable per day (changes when `rot` is bumped). */
function optionsFor(d, s, n = 3, rot = 0) {
  const cur = (S.plan[d] || {})[s], week = weekStart(d);
  const tgtK = cur && live(cur) ? itemMacros(cur).kcal : targets(d).kcal * shareOf(s);
  const use = {}, recent = {};
  for (let i = 0; i < 7; i++) {
    const dd = addDays(week, i), dp = S.plan[dd] || {};
    for (const sl of SL()) if (live(dp[sl])) { use[dp[sl].rid] = (use[dp[sl].rid] || 0) + 1; if (sl === s && Math.abs(i - wdIdx(d)) <= 2) recent[dp[sl].rid] = 1; }
  }
  const have = new Set();
  for (let i = 0; i < 7; i++) { const dp = S.plan[addDays(week, i)] || {}; for (const sl of SL()) if (live(dp[sl])) rec(dp[sl].rid).items.forEach(x => have.add(x.ing)); }
  const W = varietyW(), rnd = seededRand(hashStr(d + s + rot));
  const pool = S.recipes.filter(r => r.slots.includes(s) && r.items.length && (!cur || r.id !== cur.rid) && (!S.profile.clean || isClean(r)));
  const scored = pool.map(r => {
    const m = recipeMacros(r); if (m.kcal <= 0) return null;
    const serv = clampServ(tgtK / m.kcal), got = m.kcal * serv, nw = r.items.filter(x => !have.has(x.ing)).length;
    return { rid: r.id, serv, kcal: got, p: m.p * serv, nw, sc: Math.abs(got - tgtK) / tgtK * 3 + (use[r.id] || 0) * .3 + (recent[r.id] ? .6 : 0) + rnd() * .7 + (serv > 1.75 ? (serv - 1.75) * .35 : 0) + nw * W.distinct * 2.5 };
  }).filter(Boolean).sort((a, b) => a.sc - b.sc);
  return scored.slice(0, n);
}
function swapMeal(d, s, rid, serv) { const dp = S.plan[d] || (S.plan[d] = {}); dp[s] = { rid, serv, locked: true }; }

/* ============ shopping list for Reminders / notes apps ============ */
const remLine = r => `${r.i.nl || r.i.name} – ${r.packs ? r.packs + '× ' + fmtAmt(r.i.pack, r.i.unit) : fmtAmt(r.qty, r.i.unit)}${r.i.nl ? ' (' + r.i.name + ')' : ''}`;
const remindersText = week => shopSorted(shopList(week)).map(remLine).join('\n');
