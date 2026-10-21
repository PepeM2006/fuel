'use strict';
/* ============ AI assistant: Claude via the local server proxy, tools run in the browser ============ */
const findBy = (list, q, keys) => {
  const n = norm(q); if (!n) return null;
  const nk = x => keys.map(k => norm(x[k]));
  return list.find(x => nk(x).includes(n)) || list.find(x => nk(x).some(v => v.startsWith(n))) || list.find(x => nk(x).some(v => v.includes(n))) || null;
};
const findIng = q => ing(q) || findBy(S.ingredients, q, ['name', 'nl']);
const findRec = q => rec(q) || findBy(S.recipes, q, ['name']);
const wkOf = a => a && a.week_start ? weekStart(a.week_start) : UI.week;
const slotKey = s => { const n = norm(s); return { sniadanie: 'breakfast', breakfast: 'breakfast', lunch: 'lunch', obiad: 'lunch', kolacja: 'dinner', dinner: 'dinner', przekaska: 'snack', snack: 'snack' }[n] || s; };

const AI_TOOLS = [
  { name: 'get_state', description: 'Zwraca profil, dzisiejsze cele, ustawienia i plan wybranego tygodnia (data → posiłek → przepis, porcje, kcal).', input_schema: { type: 'object', properties: { week_start: { type: 'string', description: 'Poniedziałek tygodnia YYYY-MM-DD (domyślnie tydzień otwarty w aplikacji)' } } } },
  { name: 'list_recipes', description: 'Lista wszystkich przepisów z makro na porcję, kosztem i tagami.', input_schema: { type: 'object', properties: {} } },
  { name: 'list_ingredients', description: 'Lista składników z makro na 100 g/ml (lub na sztukę), ceną opakowania i poziomem przetworzenia.', input_schema: { type: 'object', properties: {} } },
  { name: 'add_ingredient', description: 'Dodaje składnik. Makro na 100 g / 100 ml (lub na 1 sztukę, gdy unit=pcs). proc: 0 nieprzetworzone, 1 lekko, 2 mocno przetworzone/cukier.', input_schema: { type: 'object', required: ['name', 'unit', 'kcal', 'protein', 'carbs', 'fat'], properties: { name: { type: 'string' }, nl: { type: 'string', description: 'Holenderska nazwa w sklepie' }, unit: { type: 'string', enum: ['g', 'ml', 'pcs'] }, kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, aisle: { type: 'string' }, pack_size: { type: 'number' }, pack_price: { type: 'number', description: 'EUR' }, proc: { type: 'integer' } } } },
  { name: 'update_ingredient', description: 'Zmienia pola istniejącego składnika (cena, opakowanie, makro, nazwa NL itp.).', input_schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, new_name: { type: 'string' }, nl: { type: 'string' }, kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, pack_size: { type: 'number' }, pack_price: { type: 'number' }, proc: { type: 'integer' }, aisle: { type: 'string' } } } },
  { name: 'add_recipe', description: 'Dodaje przepis (na 1 porcję; domyślnie ilości są automatycznie dopasowane do celu kalorii i białka użytkownika dla tego posiłku – ustaw fit=false, żeby tego nie robić). Składniki podawane nazwą z listy składników (najpierw dodaj brakujące). slots: breakfast, lunch, dinner, snack.', input_schema: { type: 'object', required: ['name', 'slots', 'items'], properties: { name: { type: 'string' }, slots: { type: 'array', items: { type: 'string' } }, items: { type: 'array', items: { type: 'object', required: ['ingredient', 'amount'], properties: { ingredient: { type: 'string' }, amount: { type: 'number' } } } }, fit: { type: 'boolean', description: 'dopasuj ilości do celu użytkownika (domyślnie true)' }, how: { type: 'string', description: 'Krótka instrukcja' }, prep: { type: 'string', description: 'Co przygotować z wyprzedzeniem' }, tags: { type: 'array', items: { type: 'string' } } } } },
  { name: 'delete_recipe', description: 'Usuwa przepis.', input_schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } },
  { name: 'set_meal', description: 'Ustawia posiłek w planie. recipe="none" czyści slot. Po ustawieniu slot jest zablokowany przed generatorem.', input_schema: { type: 'object', required: ['date', 'slot', 'recipe'], properties: { date: { type: 'string' }, slot: { type: 'string', enum: ['breakfast', 'snack', 'lunch', 'dinner'] }, recipe: { type: 'string' }, servings: { type: 'number' } } } },
  { name: 'set_week_menu', description: 'Ustawia listę przepisów, z których generator ma korzystać w danym tygodniu (pusta lista = wszystkie).', input_schema: { type: 'object', required: ['recipes'], properties: { week_start: { type: 'string' }, recipes: { type: 'array', items: { type: 'string' } } } } },
  { name: 'generate_week', description: 'Generuje plan tygodnia (tylko dni od dziś). keep_existing=true uzupełnia tylko puste sloty.', input_schema: { type: 'object', properties: { week_start: { type: 'string' }, keep_existing: { type: 'boolean' } } } },
  { name: 'get_shopping_list', description: 'Lista zakupów na tydzień (po odjęciu spiżarni) z kosztem.', input_schema: { type: 'object', properties: { week_start: { type: 'string' } } } },
  { name: 'add_to_pantry', description: 'Dodaje składnik do lodówki/spiżarni (to, co użytkownik już ma w domu). Planer zużyje to najpierw, a lista zakupów odliczy.', input_schema: { type: 'object', required: ['ingredient', 'amount'], properties: { ingredient: { type: 'string' }, amount: { type: 'number' }, expires: { type: 'string', description: 'data ważności RRRR-MM-DD (opcjonalnie)' } } } },
  { name: 'get_fridge', description: 'Co użytkownik ma w domu (ilości i daty ważności).', input_schema: { type: 'object', properties: {} } },
  { name: 'suggest_from_fridge', description: 'Przepisy, które da się zrobić z tego, co jest w lodówce (z procentem pokrycia i brakami).', input_schema: { type: 'object', properties: {} } },
  { name: 'log_food', description: 'Loguje zjedzone jedzenie (poza planem).', input_schema: { type: 'object', required: ['name', 'kcal'], properties: { date: { type: 'string' }, name: { type: 'string' }, kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, slot: { type: 'string' } } } },
  { name: 'log_cheat_meal', description: 'Loguje cheat meal i rozkłada nadwyżkę kalorii na kolejne dni.', input_schema: { type: 'object', required: ['name', 'kcal'], properties: { date: { type: 'string' }, name: { type: 'string' }, kcal: { type: 'number' }, replaces_slot: { type: 'string', enum: ['breakfast', 'snack', 'lunch', 'dinner'] } } } },
  { name: 'set_training', description: 'Oznacza dzień jako treningowy lub nie i opcjonalnie zapisuje trening.', input_schema: { type: 'object', required: ['date', 'trained'], properties: { date: { type: 'string' }, trained: { type: 'boolean' }, name: { type: 'string' }, sets: { type: 'number' }, minutes: { type: 'number' } } } },
  { name: 'update_profile', description: 'Zmienia ustawienia: weight, bodyFat, height, age, surplus (% nadwyżki), proteinPerKg, trainDelta, trainDays (0=Pn..6=Nd), budget (EUR/tydz.), store, snack (bool), clean (bool), prepDays (1-4), packFit (strong|normal|off: czy planer ma dopasowywać porcje i dania, żeby wykorzystać całe opakowania).', input_schema: { type: 'object', properties: { weight: { type: 'number' }, bodyFat: { type: 'number' }, height: { type: 'number' }, age: { type: 'number' }, surplus: { type: 'number' }, proteinPerKg: { type: 'number' }, trainDelta: { type: 'number' }, trainDays: { type: 'array', items: { type: 'integer' } }, budget: { type: 'number' }, store: { type: 'string' }, snack: { type: 'boolean' }, clean: { type: 'boolean' }, prepDays: { type: 'integer' }, packFit: { type: 'string', enum: ['strong', 'normal', 'off'] } } } },
];

function planSummary(week) {
  const out = {};
  for (let i = 0; i < 7; i++) {
    const d = addDays(week, i), dp = S.plan[d] || {}, row = {};
    for (const s of SL()) if (dp[s]) { const r = rec(dp[s].rid), m = itemMacros(dp[s]); row[s] = { recipe: r ? r.name : '?', servings: dp[s].serv, kcal: r0(m.kcal), protein: r0(m.p), eaten: !!dp[s].eaten, skipped: !!dp[s].skipped, locked: !!dp[s].locked }; }
    const t = targets(d); out[d] = { weekday: DAYN[i], train: isTrain(d), target_kcal: r0(t.kcal), target_protein: r0(t.p), meals: row };
  }
  return out;
}
const ok = (o = {}) => Object.assign({ ok: true }, o);
const fail = m => ({ ok: false, error: m });

const AI_RUN = {
  get_state: a => { const p = S.profile, w = wkOf(a); return { today: today(), week_start: w, profile: p, maintenance_kcal: r0(tdee()), week_menu: (S.menus[w] || []).map(id => rec(id)?.name).filter(Boolean), plan: planSummary(w) }; },
  list_recipes: () => S.recipes.map(r => { const m = recipeMacros(r); return { name: r.name, slots: r.slots, kcal: r0(m.kcal), protein: r0(m.p), cost_eur: r1(recipeCost(r)), clean: isClean(r), tags: r.tags }; }),
  list_ingredients: () => S.ingredients.map(i => ({ name: i.name, nl: i.nl, unit: i.unit, kcal: i.kcal, protein: i.p, carbs: i.c, fat: i.f, pack: i.pack, price: i.price, proc: i.proc, pantry: i.pantry || 0 })),
  add_ingredient: a => {
    if (findBy(S.ingredients, a.name, ['name']) && norm(findBy(S.ingredients, a.name, ['name']).name) === norm(a.name)) return fail('Składnik już istnieje – użyj update_ingredient');
    const o = { id: uid(), name: a.name, nl: a.nl || '', unit: a.unit, kcal: a.kcal, p: a.protein, c: a.carbs, f: a.fat, aisle: a.aisle || 'Inne', pack: a.pack_size || 0, price: a.pack_price || 0, proc: a.proc || 0, pantry: 0 };
    S.ingredients.push(o); return ok({ added: o.name });
  },
  update_ingredient: a => {
    const i = findIng(a.name); if (!i) return fail('Nie ma takiego składnika: ' + a.name);
    const map = { new_name: 'name', nl: 'nl', kcal: 'kcal', protein: 'p', carbs: 'c', fat: 'f', pack_size: 'pack', pack_price: 'price', proc: 'proc', aisle: 'aisle' };
    for (const [k, v] of Object.entries(map)) if (a[k] !== undefined) i[v] = a[k];
    delete i.starter; return ok({ updated: i.name });
  },
  add_recipe: a => {
    const items = [], missing = [];
    for (const it of a.items || []) { const i = findIng(it.ingredient); if (i) items.push({ ing: i.id, amt: it.amount }); else missing.push(it.ingredient); }
    if (missing.length) return fail('Nieznane składniki (najpierw je dodaj): ' + missing.join(', '));
    const slots = (a.slots || []).map(slotKey).filter(s => SLOTS_ALL.includes(s)); if (!slots.length) return fail('Podaj poprawne slots');
    let fitNote = '';
    if (a.fit !== false) { const t = slotTarget(slots.includes('dinner') ? 'dinner' : slots.includes('lunch') ? 'lunch' : slots.includes('breakfast') ? 'breakfast' : slots[0]), f = fitItems(items, t.kcal, t.p); items.splice(0, items.length, ...f.items); fitNote = f.note; }
    const r = { id: uid(), name: a.name, slots, items, how: a.how || '', prep: a.prep || '', tags: a.tags || [] };
    S.recipes.push(r); const m = recipeMacros(r); return ok({ added: r.name, per_serving: { kcal: r0(m.kcal), protein: r0(m.p) }, fitted_to_user_target: fitNote || undefined });
  },
  delete_recipe: a => { const r = findRec(a.name); if (!r) return fail('Nie znaleziono przepisu'); removeRecipe(r.id); return ok({ deleted: r.name }); },
  set_meal: a => {
    const s = slotKey(a.slot), dp = S.plan[a.date] || (S.plan[a.date] = {});
    if (norm(a.recipe) === 'none') { delete dp[s]; return ok({ cleared: s }); }
    const r = findRec(a.recipe); if (!r) return fail('Nie znaleziono przepisu: ' + a.recipe);
    const serv = a.servings ? Math.max(.25, a.servings) : clampServ(targets(a.date).kcal * shareOf(s) / recipeMacros(r).kcal);
    dp[s] = { rid: r.id, serv, locked: true }; const m = itemMacros(dp[s]); return ok({ date: a.date, slot: s, recipe: r.name, servings: serv, kcal: r0(m.kcal), protein: r0(m.p) });
  },
  set_week_menu: a => {
    const ids = [], missing = [];
    for (const n of a.recipes || []) { const r = findRec(n); if (r) ids.push(r.id); else missing.push(n); }
    if (missing.length) return fail('Nie znaleziono: ' + missing.join(', '));
    S.menus[wkOf(a)] = ids; return ok({ menu: ids.length });
  },
  generate_week: a => { const w = wkOf(a), warn = generate(w, { keep: !!a.keep_existing }); return ok({ warnings: warn, plan: planSummary(w) }); },
  get_shopping_list: a => { const rows = shopSorted(shopList(wkOf(a))); return { store: S.profile.store, items: rows.map(r => ({ item: r.i.name, nl: r.i.nl, aisle: r.i.aisle, exact_need: fmtAmt(r.exact, r.i.unit), packs: r.packs ? `${r.packs} x ${fmtAmt(r.i.pack, r.i.unit)}` : null, freeze_part: r.freeze || undefined, cost_eur: r1(r.cost) })), total_eur: r1(rows.reduce((x, r) => x + r.cost, 0)) }; },
  get_fridge: () => pantryItems().map(i => ({ item: i.name, amount: fmtAmt(i.pantry, i.unit), expires: i.pantryExp || null })),
  suggest_from_fridge: () => pantryIdeas(6).map(x => ({ recipe: x.r.name, slots: x.r.slots, covered_percent: r0(x.cover * 100), missing: x.missing })),
  add_to_pantry: a => { const i = findIng(a.ingredient); if (!i) return fail('Nie ma składnika'); i.pantry = (i.pantry || 0) + a.amount; if (a.expires) i.pantryExp = a.expires; return ok({ pantry: i.pantry }); },
  log_food: a => { const d = a.date || today(); (S.log[d] = S.log[d] || []).push({ id: uid(), name: a.name, slot: a.slot || 'extra', kcal: a.kcal, p: a.protein || 0, c: a.carbs || 0, f: a.fat || 0 }); return ok(); },
  log_cheat_meal: a => { const r = applyCheat(a.date || today(), { name: a.name, kcal: a.kcal, replaces: a.replaces_slot || null }); return ok({ surplus_kcal: r0(r.surplus), absorbed_kcal: r0(r.absorbed), over_days: r.n }); },
  set_training: a => { if (!a.trained) { S.workouts[a.date] = { done: false, manual: true }; return ok(); } logWorkout(a.date, { name: a.name || 'Trening', sets: a.sets, min: a.minutes }); return ok(); },
  update_profile: a => { for (const [k, v] of Object.entries(a)) if (k in S.profile) S.profile[k] = v; return ok({ profile: S.profile }); },
};
function runTool(name, input) {
  try { const f = AI_RUN[name]; if (!f) return fail('Nieznane narzędzie'); return f(input || {}); }
  catch (e) { return fail(String(e.message || e)); }
}

function aiSystem() {
  const p = S.profile, t = targets(today());
  return `Jesteś asystentem żywieniowym wbudowanym w aplikację Fuel. Użytkownik to student mieszkający w Holandii, robi lekki bulk, trenuje na siłowni, ma mało czasu na gotowanie i dzieli lodówkę ze współlokatorami. Rozmawiaj po polsku, krótko i konkretnie.
Zasady: jedzenie jak najmniej przetworzone, bez dodanego cukru; zakupy w holenderskich sklepach (${p.store}); ceny w EUR; Posiłki: śniadanie (zwykle shake do zabrania), posiłek na uczelnię (szybki albo kupny, slot "lunch") i duża obiadokolacja (slot "dinner"), gotowana raz na kilka dni. Porcje są zawsze całe (bez ułamków). Zakupy planuj tak, żeby kończyć opakowania, a świeże mięso i ryby zużywać w kilka kolejnych dni od zakupu.
Dziś: ${today()} (${DAYFULL[wdIdx(today())]}). Użytkownik: ${p.weight} kg, ${p.height} cm, ${p.bodyFat}% tł. Cel dziś: ${r0(t.kcal)} kcal, ${r0(t.p)} g białka, ${isTrain(today()) ? 'dzień treningowy' : 'dzień wolny'}. Tydzień otwarty w aplikacji zaczyna się ${UI.week}.
Zmian w aplikacji dokonujesz WYŁĄCZNIE narzędziami. Zanim zmienisz plan, w razie potrzeby sprawdź stan (get_state, list_recipes). Przy nowych przepisach najpierw upewnij się, że składniki istnieją (list_ingredients) i dodaj brakujące z realistycznymi makro i holenderską nazwą. Po zmianach podsumuj w 1–3 zdaniach, co zrobiłeś. Nie wymyślaj danych, których nie masz – zapytaj.`;
}

async function aiSend(text) {
  if ((UI.cfg || {}).mode === 'cli') return aiSendCli(text);
  S.chat.push({ role: 'user', text }); UI.aiBusy = true; render(); scrollChat();
  const msgs = []; // alternate roles, start with user
  for (const m of S.chat.slice(-14)) { if (!msgs.length && m.role !== 'user') continue; if (msgs.length && msgs[msgs.length - 1].role === m.role) msgs[msgs.length - 1].content += '\n' + m.text; else msgs.push({ role: m.role, content: m.text }); }
  let changed = false, final = '';
  try {
    for (let i = 0; i < 12; i++) {
      const r = await callApi({ system: aiSystem(), tools: AI_TOOLS, messages: msgs, max_tokens: 2048 });
      const j = await r.json();
      if (!r.ok) { final = '⚠ ' + (j.error && (j.error.message || j.error) || 'Błąd API'); break; }
      msgs.push({ role: 'assistant', content: j.content });
      const uses = j.content.filter(b => b.type === 'tool_use');
      const txt = j.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (j.stop_reason !== 'tool_use' || !uses.length) { final = txt || '(brak odpowiedzi)'; break; }
      const results = uses.map(u => { const res = runTool(u.name, u.input); if (!/^(get_|list_)/.test(u.name) && res.ok !== false) changed = true; return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(res).slice(0, 12000), is_error: res.ok === false }; });
      msgs.push({ role: 'user', content: results });
      if (i === 11) final = txt || 'Zrobiłem, co mogłem – sprawdź plan.';
    }
  } catch (e) { final = '⚠ Błąd połączenia: ' + e.message; }
  S.chat.push({ role: 'assistant', text: final }); S.chat = S.chat.slice(-40);
  UI.aiBusy = false; if (changed) toast('Asystent zmienił dane w aplikacji'); save(); render(); scrollChat();
}
function scrollChat() { requestAnimationFrame(() => { const c = $('#chatlog'); if (c) c.scrollTop = c.scrollHeight; }); }


/* ---- Claude Code backend: no API key, uses the user's own Claude login on the PC.
   The model cannot call tools directly here, so it answers with JSON {say, calls[]} that we execute. ---- */
function toolDocs() {
  return AI_TOOLS.map(t => { const p = t.input_schema.properties || {}, req = t.input_schema.required || []; return `- ${t.name}(${Object.keys(p).map(k => k + (req.includes(k) ? '*' : '')).join(', ')}): ${t.description}`; }).join('\n');
}
function aiContext() {
  const menu = (S.menus[UI.week] || []).map(id => rec(id)?.name).filter(Boolean);
  return JSON.stringify({
    recipes: S.recipes.map(r => { const m = recipeMacros(r); return { n: r.name, s: r.slots.map(x => x[0]).join(''), kcal: r0(m.kcal), p: r0(m.p) }; }),
    ingredients: S.ingredients.map(i => i.name), week_start: UI.week, menu, plan: planSummary(UI.week),
  });
}
function extractJson(text) {
  const m = /```(?:json)?\s*([\s\S]*?)```/.exec(text), cand = m ? m[1] : text, st = cand.indexOf('{');
  if (st < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = st; i < cand.length; i++) {
    const ch = cand[i];
    if (inStr) { esc = ch === '\\' && !esc; if (ch === '"' && !esc) inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}' && --depth === 0) { try { return JSON.parse(cand.slice(st, i + 1)); } catch (e) { return null; } }
  }
  return null;
}
async function aiSendCli(text) {
  S.chat.push({ role: 'user', text }); UI.aiBusy = true; render(); scrollChat();
  const convo = S.chat.slice(-12).map(m => `${m.role === 'user' ? 'Użytkownik' : 'Asystent'}: ${m.text}`).join('\n');
  let extra = '', final = '', changed = false;
  try {
    for (let round = 0; round < 4; round++) {
      const prompt = `${aiSystem()}\n\nTwoje narzędzia (parametry z * są wymagane). NIE masz dostępu do żadnych innych narzędzi ani plików – aplikację zmieniasz wyłącznie wywołaniami poniżej:\n${toolDocs()}\n\nSTAN APLIKACJI (JSON):\n${aiContext()}\n\nROZMOWA:\n${convo}${extra}\n\nOdpowiedz WYŁĄCZNIE jednym obiektem JSON, bez żadnego tekstu poza nim:\n{"say":"<krótka odpowiedź po polsku dla użytkownika>","calls":[{"tool":"nazwa","input":{...}}]}\n"calls" może być puste, jeśli nic nie zmieniasz. Możesz podać kilka wywołań naraz (wykonam je po kolei). Wyniki narzędzi get_*/list_* dostaniesz w następnej wiadomości – używaj ich tylko, gdy stan powyżej nie wystarcza.`;
      const r = await fetch('/api/ai/cli', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const j = await r.json();
      if (!r.ok) { final = '⚠ ' + ((j.error && (j.error.message || j.error)) || 'Błąd'); break; }
      const obj = extractJson(j.text || '');
      if (!obj) { final = (j.text || '').trim() || '(brak odpowiedzi)'; break; }
      const calls = Array.isArray(obj.calls) ? obj.calls : [], say = String(obj.say || '').trim();
      if (!calls.length) { final = say || '(brak odpowiedzi)'; break; }
      const results = calls.map(c => { const res = runTool(c.tool, c.input); if (!/^(get_|list_)/.test(c.tool) && res.ok !== false) changed = true; return { tool: c.tool, result: res }; });
      const failed = results.filter(x => x.result.ok === false), reads = results.some(x => /^(get_|list_)/.test(x.tool));
      if ((!reads && !failed.length) || round === 3) { final = (say || 'Gotowe.') + (failed.length ? `\n(Nie udało się: ${failed.map(f => f.tool + ' – ' + f.result.error).join('; ')})` : ''); break; }
      extra += `\nAsystent (wywołał narzędzia): ${JSON.stringify(calls)}\nWYNIKI NARZĘDZI: ${JSON.stringify(results).slice(0, 15000)}\n`;
    }
  } catch (e) { final = '⚠ Błąd połączenia: ' + e.message; }
  S.chat.push({ role: 'assistant', text: final }); S.chat = S.chat.slice(-40);
  UI.aiBusy = false; if (changed) toast('Asystent zmienił dane w aplikacji'); save(); render(); scrollChat();
}

/* API call: via the Fuel server (PC) or, in standalone phone mode, straight from the browser with the user's own key */
async function callApi(payload) {
  if (!UI.local) return fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const key = localStorage.getItem('fuel-key');
  if (!key) return new Response(JSON.stringify({ error: { message: 'Brak klucza API – dodaj go w zakładce Asystent.' } }), { status: 400 });
  return fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: localStorage.getItem('fuel-model') || 'claude-sonnet-5-5', max_tokens: payload.max_tokens || 2048, system: payload.system, tools: payload.tools, messages: payload.messages }) });
}

/* one-shot question to Claude (PC login or API key); returns text */
async function aiAsk(prompt, system = 'Odpowiadaj wyłącznie jednym obiektem JSON.') {
  const cfg = UI.cfg || {};
  if (cfg.mode === 'cli') { const r = await fetch('/api/ai/cli', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: system + '\n\n' + prompt }) }), j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'błąd'); return j.text || ''; }
  if (cfg.mode === 'api') { const r = await callApi({ system, messages: [{ role: 'user', content: prompt }], max_tokens: 500 }), j = await r.json(); if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || 'błąd'); return (j.content || []).map(b => b.text || '').join(''); }
  throw new Error('Asystent nie jest połączony');
}
