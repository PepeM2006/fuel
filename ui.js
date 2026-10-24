'use strict';
/* ============ views ============ */
const IC = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  plan: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  shop: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  foods: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.3 5-6.4"/>',
  ai: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
};
const NAV = [['today', 'Dziś'], ['plan', 'Plan'], ['shop', 'Zakupy'], ['foods', 'Jedzenie'], ['ai', 'Asystent'], ['me', 'Ja']];
const svg = k => `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const bar = (v, max, col) => `<div class="bar"><div style="width:${Math.min(100, max ? v / max * 100 : 0)}%;background:${col}"></div></div>`;
const macroLine = m => `${r0(m.kcal)} kcal · B${r0(m.p)} W${r0(m.c)} T${r0(m.f)}`;
const tagHtml = r => (r.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('');
const cleanBadge = r => isClean(r) ? '' : '<span class="tag warn">przetworzone</span>';

function viewToday() {
  const d = UI.date, t = targets(d), c = consumed(d), left = plannedLeft(d), dp = S.plan[d] || {};
  const remain = t.kcal - c.kcal, pct = Math.max(0, Math.min(1, c.kcal / t.kcal));
  const train = isTrain(d), wk = S.workouts[d], isToday = d === today();
  let h = '';
  if (S.starter && !S.welcomeSeen) h += `<div class="banner"><b>Witaj.</b> Masz już ponad 140 przepisów bez cukru i mało przetworzonych oraz typowe holenderskie produkty. Sprawdź makro i ceny w <b>Jedzenie</b> (to wartości przybliżone). <div class="row wrap" style="margin-top:8px"><button class="pri sm" data-act="nav" data-v="plan">Zaplanuj tydzień →</button><button class="sm" data-act="welcomeOk">Rozumiem</button><button class="sm ghost" data-act="clearStarter">Usuń wszystkie startowe</button></div></div>`;
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent), isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  const bdays = UI.local ? Math.floor((parseD(today()) - parseD(S.lastBackup || today())) / 864e5) : 0;
  let hide = ''; try { hide = localStorage.getItem('fuel-hide-install') || ''; } catch (e) { }
  if (UI.local && isMobile && !standalone && !hide && !S.starter && bdays < 7) h += `<div class="banner sm"><b>Zrób z tego aplikację.</b> ${isIOS ? 'W Safari dotknij „Udostępnij" → „Do ekranu początkowego".' : UI.installEvt ? 'Dodaj Fuel do ekranu głównego, żeby działał jak zwykła aplikacja, także offline.' : 'W menu przeglądarki (⋮) wybierz „Zainstaluj aplikację" lub „Dodaj do ekranu głównego".'}<div class="row wrap" style="margin-top:8px">${UI.installEvt ? '<button class="pri sm" data-act="installApp">Zainstaluj</button>' : ''}<button class="sm" data-act="hideInstall">Nie teraz</button></div></div>`;
  if (UI.local && bdays >= 7 && !S.starter) h += `<div class="warnbox">Ostatnia kopia zapasowa: ${bdays} dni temu. Dane są tylko na tym telefonie – <button class="sm" data-act="export">Pobierz kopię</button></div>`;
  h += `<div class="top"><div><div class="eyebrow">${esc(fmtLong(d))}</div><h1>${isToday ? 'Dziś' : esc(DAYFULL[wdIdx(d)])}</h1></div><div class="row"><button class="icon" aria-label="Poprzedni dzień" data-act="day" data-n="-1">‹</button>${isToday ? '' : '<button class="sm" data-act="dayToday">Dziś</button>'}<button class="icon" aria-label="Następny dzień" data-act="day" data-n="1">›</button></div></div>`;
  if (isToday && wdIdx(d) >= 4) {   // Friday–Sunday: plan and shop for the coming week
    const nxt = addDays(weekStart(today()), 7), hasNext = Array.from({ length: 7 }, (_, k) => (S.plan[addDays(nxt, k)] || {})).some(dp => SL().some(s => dp[s]));
    h += `<div class="banner sm"><b>${hasNext ? 'Przyszły tydzień jest zaplanowany.' : 'Czas zaplanować przyszły tydzień.'}</b> ${hasNext ? 'Sprawdź listę zakupów i idź na zakupy.' : 'Ułóż menu i listę zakupów z wyprzedzeniem – zakupy zrobisz już dziś.'}<div class="row wrap" style="margin-top:8px"><button class="pri sm" data-act="planNext">${hasNext ? 'Zobacz plan' : 'Zaplanuj przyszły tydzień'}</button><button class="sm" data-act="shopNext">Lista zakupów</button></div></div>`;
  }
  const fmt = n => r0(n).toLocaleString('pl-PL'), over = remain < -150;
  let L = '', Rt = '';
  L += `<div class="card main"><div class="row sp" style="align-items:flex-end;gap:12px"><div><div class="num ${over ? 'over' : ''}">${fmt(Math.abs(remain))}</div><div class="lab">${remain >= 0 ? 'kcal do celu na dziś' : 'kcal ponad cel'}</div></div><button class="${train ? 'on' : ''}" data-act="toggleTrain">${train ? 'Dzień treningowy' : 'Dzień wolny'}</button></div>
    <div class="track"><div class="${over ? 'over' : ''}" style="width:${pct * 100}%"></div></div>
    <div class="row sp xs mut"><span>zjedzone ${fmt(c.kcal)}</span><span>cel ${fmt(t.kcal)}${S.adjust[d] ? ` (${r0(S.adjust[d])} po cheat meal)` : ''}${left.kcal ? ` · w planie ${fmt(left.kcal)}` : ''}</span></div>
    <div class="macros">${[['Białko', c.p, t.p, 'p'], ['Węglowodany', c.c, t.c, 'c'], ['Tłuszcz', c.f, t.f, 'f']].map(([l, v, mx, k]) => `<div><div class="ml">${l}</div><div class="mv">${r0(v)}<span> / ${r0(mx)} g</span></div><div class="mini"><div class="${k}" style="width:${Math.min(100, v / mx * 100)}%"></div></div></div>`).join('')}</div></div>`;
  // training card
  Rt += `<div class="card"><div class="row sp"><h2 style="margin:0">Trening</h2><button class="sm" data-act="logWorkout">+ Zapisz trening</button></div>`;
  if (wk && wk.done !== false && (wk.name || wk.sets || wk.min || wk.volume)) Rt += `<div style="margin-top:8px"><b>${esc(wk.name || 'Trening')}</b> <span class="mut sm">${wk.sets ? '· ' + wk.sets + ' serii ' : ''}${wk.volume ? '· ' + r0(wk.volume) + ' kg objętości ' : ''}${wk.min ? '· ' + wk.min + ' min ' : ''}· ${({ csv: 'import CSV', webhook: 'automatycznie', link: 'z linku', manual: 'ręcznie' })[wk.source] || ''}</span></div>`;
  else Rt += `<div class="mut sm" style="margin-top:6px">${train ? 'Dzień treningowy – cel kalorii podniesiony. Po treningu zapisz go tutaj (albo zrób to automatycznie: Ja → Trening).' : 'Dzień wolny od treningu – cel kalorii obniżony. Trenowałeś mimo to? Dotknij „Zapisz trening".'}</div>`;
  if (train && isToday) Rt += `<div class="xs mut" style="margin-top:6px">Węglowodany (owsianka, banan) 1–2 h przed treningiem, a po treningu kolacja z białkiem.</div>`;
  Rt += `</div>`;
  // protein gap
  const pgap = t.p - c.p - left.p;
  if (pgap > 12) {
    const ideas = S.ingredients.filter(i => i.p >= 10 && i.kcal > 0 && i.unit !== 'pcs' && (S.profile.clean ? (i.proc || 0) < 2 : true)).sort((a, b) => b.p / b.kcal - a.p / a.kcal).slice(0, 2);
    Rt += `<div class="warnbox">Do celu białka brakuje ~${r0(pgap)} g${ideas.length ? ' – np. ' + ideas.map(i => `${r0(pgap / (i.p / 100))} ${i.unit} ${esc(i.name.toLowerCase())}`).join(' albo ') : ''}.</div>`;
  }
  // prep
  const prep = [];
  for (const dd of [d, addDays(d, 1)]) for (const s of SL()) { const it = (S.plan[dd] || {})[s], r = live(it) && rec(it.rid); if (r && r.prep && !it.eaten && !prep.find(p => p.r === r.id)) prep.push({ r: r.id, txt: r.prep, name: r.name, day: dd === d ? 'dziś' : 'jutro' }); }
  if (prep.length) Rt += `<div class="card"><h2>Przygotowanie</h2>${prep.map(p => `<div class="sm" style="margin:4px 0"><b>${esc(p.txt)}</b> <span class="mut">– ${esc(p.name)} (${p.day})</span></div>`).join('')}</div>`;
  // meals
  L += `<div class="card mealscard"><h2>Posiłki</h2>`;
  if (!SL().some(s => dp[s])) L += `<div class="banner sm" style="margin:0 0 8px"><b>Nie masz jeszcze planu na ten tydzień.</b> Wybierz dania albo pozwól aplikacji ułożyć tydzień – lista zakupów powstanie sama.<div class="row wrap" style="margin-top:10px"><button class="pri sm" data-act="genWeekHere">Wygeneruj tydzień</button><button class="sm" data-act="menuHere">Wybierz dania</button></div></div>`;
  for (const s of SL()) {
    const it = dp[s];
    if (live(it)) {
      const r = rec(it.rid), m = itemMacros(it);
      L += `<div class="meal ${it.eaten ? 'done' : ''}"><input type="checkbox" ${it.eaten ? 'checked' : ''} data-act="eat" data-d="${d}" data-s="${s}"><div class="sl">${SLOT_PL[s]}</div>
        <div class="grow nm" data-act="viewMeal" data-d="${d}" data-s="${s}"><div class="b">${esc(r.name)}</div><div class="mut xs">${macroLine(m)}</div></div>${it.eaten ? '' : `<button class="ghost sm" data-act="editSlot" data-d="${d}" data-s="${s}">Zmień</button>`}</div>${it.eaten ? '' : optsHtml(d, s)}`;
    } else L += `<div class="meal"><span style="width:20px"></span><div class="sl">${SLOT_PL[s]}</div><div class="grow mut sm">${it && it.skipped ? 'pominięte (cheat meal)' : 'brak w planie'}</div><button class="sm" data-act="editSlot" data-d="${d}" data-s="${s}">Wybierz</button></div>${it && it.skipped ? '' : optsHtml(d, s)}`;
  }
  for (const e of S.log[d] || []) L += `<div class="meal"><span style="width:20px"></span><div class="sl">${e.cheat ? 'Cheat' : 'Extra'}</div><div class="grow"><div class="b">${esc(e.name)}</div><div class="mut xs">${macroLine(e)}</div></div><button class="ghost danger" data-act="delLog" data-d="${d}" data-id="${e.id}">✕</button></div>`;
  L += `<div class="row wrap" style="margin-top:12px"><button class="pri" data-act="addFood">+ Dodaj jedzenie</button><button data-act="cheat">Cheat meal</button><button data-act="refit">Dopasuj porcje</button></div></div>`;
  return h + `<div class="today2"><div class="tl">${L}</div><div class="tr">${Rt}</div></div>`;
}

function saveBar() {   // nothing to press: everything is remembered automatically
  const t = UI.savedAt || S.savedAt, when = t ? new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
  return `<div class="savebar"><div class="xs mut">✓ Pamiętam wszystko, co ustawiłeś – zapisuje się samo${UI.local ? ' na tym telefonie' : ' na komputerze'}${when ? ' (' + when + ')' : ''}. Pomyłkę cofniesz przyciskiem „Cofnij".</div></div>`;
}
function weekSwitch() {   // always visible: this week / next week
  const cur = weekStart(today()), nxt = addDays(cur, 7), w = UI.week;
  const lab = s => { const a = parseD(s), b = parseD(addDays(s, 6)); return `${a.getDate()}.${pad(a.getMonth() + 1)}–${b.getDate()}.${pad(b.getMonth() + 1)}`; };
  return `<div class="seg" style="margin:0 0 12px"><button class="${w === cur ? 'sel' : ''}" data-act="weekSet" data-w="${cur}">Ten tydzień · ${lab(cur)}</button><button class="${w === nxt ? 'sel' : ''}" data-act="weekSet" data-w="${nxt}">Następny · ${lab(nxt)}</button></div>`;
}
function viewPlan() {
  const wk = UI.week, tot = { kcal: 0, cost: 0, days: 0, clean: 0, meals: 0 }, menu = S.menus[wk] || [];
  let h = `<div class="top"><div><div class="eyebrow">${esc(fmtDay(wk))} – ${esc(fmtDay(addDays(wk, 6)))}</div><h1>Plan tygodnia</h1></div><div class="row"><button class="icon" aria-label="Poprzedni tydzień" data-act="week" data-n="-1">‹</button><button class="icon" aria-label="Następny tydzień" data-act="week" data-n="1">›</button></div></div>`;
  h += weekSwitch();
  h += saveBar();
  h += `<div class="card"><div class="row wrap"><button class="pri" data-act="menuPicker">Wybierz dania na tydzień</button><button data-act="basePicker">Półprodukty na tydzień</button><button data-act="gen">Wygeneruj tydzień</button><button data-act="genFill">Uzupełnij puste</button><button class="ghost danger" data-act="clearWeek">Wyczyść</button></div>
    <div class="mut sm" style="margin-top:8px">${menu.length ? `Twoje menu: ${menu.map(id => rec(id)).filter(Boolean).map(r => `<span class="tag">${esc(r.name)}</span>`).join(' ')}` : 'Nie wybrałeś menu – generator użyje wszystkich przepisów. Wybierz dania, a lista zakupów powstanie z nich.'}</div>
    ${(S.bases[wk] || []).length ? `<div class="mut sm" style="margin-top:8px"><b>Zestaw półproduktów (${S.bases[wk].length}):</b> ${S.bases[wk].map(k => ing(k)).filter(Boolean).map(i => `<span class="tag">${esc(i.name.toLowerCase())}</span>`).join(' ')} <button class="ghost sm" data-act="basePicker">zmień</button></div>` : `<div class="mut xs" style="margin-top:6px">Półprodukty: wybierz kilka produktów, a z nich ułożę wiele różnych dań – kupujesz mało rzeczy.</div>`}
    <div class="grid2" style="margin-top:10px">
      <div><label>Gotuję raz na</label><select data-bind="profile.prepDays">${[1, 2, 3, 4].map(n => `<option value="${n}" ${S.profile.prepDays === n ? 'selected' : ''}>${n === 1 ? 'codziennie' : n + ' dni'}</option>`).join('')}</select></div>
      <div><label>Przekąska</label><select data-bind="profile.snack"><option value="false" ${!S.profile.snack ? 'selected' : ''}>nie – śniadanie, uczelnia, obiadokolacja</option><option value="true" ${S.profile.snack ? 'selected' : ''}>tak – dodatkowa przekąska</option></select></div>
      <div><label>Tryb czysty</label><select data-bind="profile.clean"><option value="true" ${S.profile.clean ? 'selected' : ''}>bez przetworzonych</option><option value="false" ${!S.profile.clean ? 'selected' : ''}>dowolne</option></select></div>
      <div><label>Zakupy: kończ opakowania</label><select data-bind="profile.packFit">${[['strong', 'tak – mało odpadu, mało produktów'], ['normal', 'trochę'], ['off', 'nie, tylko urozmaicenie']].map(([v, l]) => `<option value="${v}" ${(S.profile.packFit || 'strong') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label>Dania</label><select data-bind="profile.mealStyle">${[['mix', 'przepisy i składane z półproduktów'], ['recipes', 'tylko gotowe przepisy'], ['combos', 'tylko składane z półproduktów']].map(([v, l]) => `<option value="${v}" ${(S.profile.mealStyle || 'mix') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label>Mięso i ryby na obiadokolację</label><select data-bind="profile.meatPref">${[['less', 'rzadziej'], ['normal', 'normalnie'], ['more', 'często']].map(([v, l]) => `<option value="${v}" ${(S.profile.meatPref || 'normal') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label>Zakupy w tygodniu</label><select data-bind="profile.shopTrips"><option value="1" ${(S.profile.shopTrips | 0) < 2 ? 'selected' : ''}>raz (świeże mięso tylko na pierwsze dni)</option><option value="2" ${(S.profile.shopTrips | 0) >= 2 ? 'selected' : ''}>dwa razy (świeże przez cały tydzień)</option></select></div>
      ${(S.profile.shopTrips | 0) >= 2 ? `<div><label>Drugie zakupy</label><select data-bind="profile.trip2Day">${[2, 3, 4].map(n => `<option value="${n}" ${(S.profile.trip2Day ?? 3) === n ? 'selected' : ''}>${DAYFULL[n]}</option>`).join('')}</select></div>` : ''}</div></div>`;
  const priced = [];
  h += `<div class="daygrid">`;
  for (let i = 0; i < 7; i++) {
    const d = addDays(wk, i), dp = S.plan[d] || {}, t = targets(d), dm = ZERO(); let dc = 0, any = false;
    for (const s of SL()) { const it = dp[s]; if (live(it)) { any = true; addM(dm, itemMacros(it)); dc += itemCost(it); tot.meals++; if (isClean(rec(it.rid))) tot.clean++; priced.push({ d, s, it, cost: itemCost(it) }); } }
    for (const e of S.log[d] || []) addM(dm, e);
    if (any) { tot.kcal += dm.kcal; tot.cost += dc; tot.days++; }
    if (d < today() && !any) { h += `<div class="card day" style="opacity:.55;padding:10px 16px"><b>${DAYFULL[i]}</b> <span class="mut sm">${parseD(d).getDate()}.${pad(parseD(d).getMonth() + 1)} · minął</span></div>`; continue; }
    h += `<div class="card day ${d === today() ? 'istoday' : ''}"><div class="dayhead"><div><b>${DAYFULL[i]}</b> <span class="mut sm">${parseD(d).getDate()}.${pad(parseD(d).getMonth() + 1)}</span> ${isTrain(d) ? '<span class="tag">trening</span>' : ''}</div><button class="ghost sm" data-act="genDay" data-d="${d}" title="Losuj ten dzień">↻</button></div>
      ${any ? `<div class="xs mut">${r0(dm.kcal)} / ${r0(t.kcal)} kcal · białko ${r0(dm.p)}/${r0(t.p)} g</div>${bar(dm.kcal, t.kcal, 'var(--acc)')}` : '<div class="xs mut">Pusto</div>'}`;
    for (const s of SL()) {
      const it = dp[s], r = live(it);
      h += `<div class="slotrow" data-act="editSlot" data-d="${d}" data-s="${s}"><span class="sl">${SLOT_PL[s]}</span><div class="grow ${it && (it.eaten || it.skipped) ? 'done' : ''}">${r ? `<div class="nm sm b">${esc(r.name)} ${it.locked ? '<span class="tag">przypięte</span>' : ''}</div><div class="mut xs">${macroLine(itemMacros(it))}</div>` : `<span class="mut sm">${it && it.skipped ? 'pominięte' : '+ wybierz'}</span>`}</div><span class="mut" aria-hidden="true">✎</span></div>`;
    }
    h += `</div>`;
  }
  h += `</div>`;
  // cook sessions: whole portions, exact totals
  const ses = cookSessions(wk);
  if (ses.length) {
    h += `<div class="card"><h2>Gotowanie i przygotowanie</h2>`;
    for (const x of ses) {
      const r = rec(x.rid), a = x.days[0], b = x.days[x.days.length - 1], days = a === b ? DAYN[wdIdx(a)] : DAYN[wdIdx(a)] + '–' + DAYN[wdIdx(b)];
      h += `<div class="meal" style="align-items:flex-start" data-act="viewRec" data-id="${r.id}" data-serv="${x.items[0].serv}"><div class="sl">${SLOT_PL[x.slot]}</div><div class="grow"><div class="b">${esc(r.name)}</div>
        <div class="xs"><b>${x.portions} ${x.portions === 1 ? 'porcja' : x.portions < 5 ? 'porcje' : 'porcji'}</b> na ${days}${r.prep ? ' · ' + esc(r.prep) : ''}</div>
        <div class="mut xs">${x.totals.map(t => `${esc(t.i.name.toLowerCase())} ${fmtAmt(cookQty(t.a, t.i.unit), t.i.unit)}`).join(' · ')}</div></div></div>`;
    }
    h += `</div>`;
  }
  const _sl = shopList(wk).filter(r => r.buy > .01), nItems = _sl.length, shopCost = _sl.reduce((a, r) => a + r.cost, 0), leftVal = _sl.reduce((a, r) => a + Math.max(0, r.qty - r.buy) * unitCost(r.i), 0);
  h += `<div class="card"><h2>Podsumowanie</h2><div class="sm">${tot.days ? `Średnio <b>${r0(tot.kcal / tot.days)} kcal/dzień</b> · zakupy: <b>${nItems} produktów</b>, ok. <b>${money(shopCost)}</b>${S.profile.budget ? ` (budżet ${money(S.profile.budget)})` : ''} · po tygodniu zostanie ok. <b>${money(leftVal)}</b> (${r0(leftVal / Math.max(1, shopCost) * 100)}% zakupów) · ${r0(tot.clean / Math.max(1, tot.meals) * 100)}% posiłków bez przetworzonych` : 'Jeszcze nic nie zaplanowano.'}</div>`;
  if (S.profile.budget && tot.cost > S.profile.budget && priced.length) {
    const top = priced.filter(x => !x.it.locked && !x.it.eaten).sort((a, b) => b.cost - a.cost)[0];
    if (top) {
      const cur = rec(top.it.rid), curM = itemMacros(top.it);
      const alt = S.recipes.filter(r => r.id !== cur.id && r.slots.includes(top.s) && (!S.profile.clean || isClean(r))).map(r => { const m = recipeMacros(r), serv = clampServ(curM.kcal / m.kcal); return { r, serv, cost: recipeCost(r) * serv }; }).filter(a => a.cost < top.cost - .3).sort((a, b) => a.cost - b.cost)[0];
      if (alt) h += `<div class="warnbox">Ponad budżet. Zamień ${DAYN[wdIdx(top.d)]} (${SLOT_PL[top.s].toLowerCase()}) <b>${esc(cur.name)}</b> → <b>${esc(alt.r.name)}</b> i zaoszczędź ~${money(top.cost - alt.cost)} <button class="sm" data-act="applySwap" data-d="${top.d}" data-s="${top.s}" data-rid="${alt.r.id}" data-serv="${alt.serv}">Zamień</button></div>`;
    }
  }
  return h + `</div>`;
}

function shopRow(r, chk) {
  const key = r.i.id + '|' + r.trip, span = r.last - r.first + 1;
  const parts = [r.i.nl ? `<b>${esc(r.i.nl)}</b>` : '', r.packs ? `opakowania: ${r.packs} × ${fmtAmt(r.i.pack, r.i.unit)}${r.qty - r.buy > r.i.pack * .08 ? ` (zostanie ${fmtAmt(r.qty - r.buy, r.i.unit)})` : ''}` : '', r.have ? `masz w domu ${fmtAmt(r.have, r.i.unit)}` : '', r.freeze ? `<span class="tag warn">użyjesz przez ${span} dni – zamroź część</span>` : ''].filter(Boolean);
  return `<div class="shop ${chk[key] ? 'chk' : ''}"><input type="checkbox" data-act="shopChk" data-id="${key}" ${chk[key] ? 'checked' : ''}>
    <div class="grow nm"><div class="b">${esc(r.i.name)}</div><div class="mut xs">${parts.join(' · ')}</div></div>
    <div class="r"><div class="b">${fmtAmt(r.exact, r.i.unit)}</div><div class="xs mut">${r.cost ? money(r.cost) : ''}</div></div></div>`;
}
function viewShop() {
  const wk = UI.week, nT = (S.profile.shopTrips | 0) >= 2 ? 2 : 1, chk = S.shopChecked[wk] || (S.shopChecked[wk] = {});
  let h = `<div class="top"><div><div class="eyebrow">${esc(S.profile.store)} · tydzień od ${esc(fmtDay(wk))}</div><h1>Lista zakupów</h1></div><div class="row"><button class="icon" aria-label="Poprzedni tydzień" data-act="week" data-n="-1">‹</button><button class="icon" aria-label="Następny tydzień" data-act="week" data-n="1">›</button></div></div>`;
  h += weekSwitch();
  const all = shopList(wk), buy = shopSorted(all), covered = all.filter(r => r.buy <= .01);
  if (!all.length) return h + `<div class="card mut">Brak planu na ten tydzień. Przejdź do <b>Plan</b>, wybierz dania i wygeneruj tydzień – lista zakupów powstanie sama.</div>`;
  const total = buy.reduce((a, r) => a + r.cost, 0), done = buy.filter(r => chk[r.i.id + '|' + r.trip]).length;
  h += saveBar();
  h += `<div class="row wrap" style="margin-bottom:8px"><span class="pill">${buy.length} pozycji · ~${money(total)}</span><span class="pill soft">${done}/${buy.length} w koszyku</span>${covered.length ? `<span class="pill soft">${covered.length} masz w domu</span>` : ''}<select data-bind="profile.store" style="width:auto">${STORES.map(s => `<option ${S.profile.store === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="row wrap"><button class="pri" data-act="toReminders">Do Przypomnień</button><button data-act="copyList">Kopiuj / udostępnij</button></div>
    <div class="row wrap" style="margin-top:8px"><button class="sm" data-act="checkAll">Zaznacz wszystko</button><button class="sm" data-act="boughtToPantry">Dodaj zaznaczone do lodówki</button><button class="sm" data-act="ftabFridge">Co mam w domu</button></div>
    <div class="mut xs" style="margin-top:8px">Duża liczba po prawej to dokładnie tyle, ile potrzebujesz. Opakowania to propozycja, jak to kupić.</div>`;
  if (covered.length) h += `<div class="card" style="margin-top:12px;padding-top:4px"><div class="aisle">Masz w domu – nic nie kupujesz</div>${covered.map(r => `<div class="shop chk"><input type="checkbox" checked disabled><div class="grow nm"><div class="b">${esc(r.i.name)}</div><div class="mut xs">potrzeba ${fmtAmt(niceQty(r.need, r.i.unit), r.i.unit)}</div></div><div class="r xs mut">z lodówki</div></div>`).join('')}</div>`;
  for (let tr = 0; tr < nT; tr++) {
    const rows = shopSorted(all.filter(r => r.trip === tr));
    if (nT === 2) h += `<h2 style="margin:18px 0 0">${tripLabel(tr)} · ${rows.length} pozycji · ~${money(rows.reduce((a, r) => a + r.cost, 0))}</h2>`;
    if (!rows.length) { if (nT === 2) h += '<div class="mut sm">Nic do kupienia.</div>'; continue; }
    h += `<div class="card" style="margin-top:8px;padding-top:4px">`;
    let last = null;
    for (const r of rows) { if (r.i.aisle !== last) { h += `<div class="aisle">${esc(r.i.aisle || 'Inne')}</div>`; last = r.i.aisle; } h += shopRow(r, chk); }
    h += `</div>`;
  }
  return h;
}

/* ---- fridge / pantry ---- */
function viewFridge() {
  const items = pantryItems().sort((a, b) => ((daysLeft(a) ?? 999) - (daysLeft(b) ?? 999)) || a.name.localeCompare(b.name, 'pl')), ideas = pantryIdeas(8);
  let h = `<div class="card"><div class="row sp"><h2 style="margin:0">Co mam w domu</h2><button class="pri sm" data-act="fridgeAdd">+ Dodaj</button></div>`;
  h += items.length ? items.map(i => { const dl = daysLeft(i); return `<div class="meal" data-act="fridgeEdit" data-id="${i.id}"><div class="grow"><div class="b">${esc(i.name)}</div><div class="mut xs">${i.pantryExp ? `ważne do ${esc(fmtDay(i.pantryExp))}${dl != null && dl <= 2 ? ' – <b style="color:var(--clay)">zużyj szybko</b>' : ''}` : 'bez daty ważności'}</div></div><div class="b">${fmtAmt(i.pantry, i.unit)}</div></div>`; }).join('')
    : `<div class="mut sm" style="margin-top:10px">Dodaj to, co masz w lodówce i szafkach. Planer zużyje to najpierw, lista zakupów pokaże te produkty jako odhaczone, a poniżej dostaniesz pomysły, co z tego zrobić.</div>`;
  h += `</div>`;
  if (items.length) {
    h += `<div class="card"><h2>Co z tego zrobić</h2>`;
    h += ideas.length ? ideas.map(x => `<div class="meal" style="align-items:flex-start"><div class="grow nm" data-act="viewRec" data-id="${x.r.id}" data-serv="1"><div class="b">${esc(x.r.name)}</div><div class="mut xs">masz ${r0(x.cover * 100)}% składników${x.missing.length ? ' · brakuje: ' + esc(x.missing.slice(0, 3).join(', ').toLowerCase()) + (x.missing.length > 3 ? '…' : '') : ' – wszystko jest!'}${x.urgent ? ' · <b style="color:var(--clay)">szybko się zepsuje</b>' : ''}</div></div><button class="sm" data-act="ideaPlan" data-id="${x.r.id}">Do planu</button></div>`).join('') : '<div class="mut sm">Na razie żaden przepis nie pasuje w co najmniej 30% – dodaj więcej produktów.</div>';
    h += `</div>`;
  }
  return h;
}
function fridgeAdd() {
  const list = S.ingredients.slice().sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const exp = () => { const e = val('fa_e'); return e || ''; };
  modal('Dodaj do domu', `<label>Produkt</label><select id="fa_i">${list.map(i => `<option value="${i.id}">${esc(i.name)} (${i.unit})</option>`).join('')}</select>
    <div class="grid2"><div><label>Ile masz</label><input id="fa_a" inputmode="decimal" placeholder="np. 400"></div><div><label>Ważne do (opcjonalnie)</label><input id="fa_e" type="date"></div></div>
    <div class="mut xs" style="margin-top:8px">Ilość w jednostce produktu (g, ml lub szt.). Nie ma produktu? Dodaj go w „Składniki".</div><div id="fa_log" class="sm" style="margin-top:8px"></div>`,
    [{ label: 'Dodaj i kolejny', fn: () => { const i = ing(val('fa_i')), a = num(val('fa_a')); if (!i || a <= 0) return toast('Wpisz ilość'); i.pantry = (i.pantry || 0) + a; if (exp()) i.pantryExp = exp(); save(); $('#fa_log').innerHTML += `✓ ${esc(i.name)} ${fmtAmt(a, i.unit)}<br>`; $('#fa_a').value = ''; $('#fa_a').focus(); } },
    { label: 'Gotowe', cls: 'pri', fn: () => { const i = ing(val('fa_i')), a = num(val('fa_a')); if (i && a > 0) { i.pantry = (i.pantry || 0) + a; if (exp()) i.pantryExp = exp(); } save(); closeModal(); render(); } }]);
}
function fridgeEdit(id) {
  const i = ing(id); if (!i) return;
  modal(i.name, `<div class="grid2"><div><label>Ile masz (${i.unit})</label><input id="fe_a" inputmode="decimal" value="${i.pantry || 0}"></div><div><label>Ważne do</label><input id="fe_e" type="date" value="${i.pantryExp || ''}"></div></div>`,
    [{ label: 'Nie mam już', cls: 'danger', fn: () => { i.pantry = 0; delete i.pantryExp; save(); closeModal(); render(); } },
    { label: 'Zapisz', cls: 'pri', fn: () => { i.pantry = Math.max(0, num(val('fe_a'))); if (val('fe_e')) i.pantryExp = val('fe_e'); else delete i.pantryExp; save(); closeModal(); render(); } }]);
}
function ideaPlan(rid) {
  const r = rec(rid); if (!r) return;
  const days = Array.from({ length: 7 }, (_, k) => addDays(today(), k)), slots = r.slots.filter(s => SL().includes(s));
  modal(`Do planu: ${r.name}`, `<div class="grid2"><div><label>Dzień</label><select id="ip_d">${days.map(d => `<option value="${d}">${esc(fmtDay(d))}</option>`).join('')}</select></div><div><label>Posiłek</label><select id="ip_s">${slots.map(s => `<option value="${s}">${SLOT_PL[s]}</option>`).join('')}</select></div></div>
    <div class="mut xs" style="margin-top:8px">Wielkość porcji dobiorę do Twojego celu kalorii.</div>`,
    [{ label: 'Dodaj do planu', cls: 'pri', fn: () => { const d = val('ip_d'), s = val('ip_s'), m = recipeMacros(r); if (!slots.length) return toast('Ten przepis nie pasuje do żadnego z Twoich posiłków'); closeModal(); UI.week = weekStart(d); withUndo(() => { swapMeal(d, s, r.id, clampServ(targets(d).kcal * shareOf(s) / m.kcal)); return `Dodano: ${SLOT_PL[s]} ${fmtDay(d)}`; }); } }]);
}

function viewFoods() {
  const q = norm(UI.q);
  let h = `<div class="top"><div><div class="eyebrow">Twoja baza</div><h1>Jedzenie</h1></div><button class="pri" data-act="${UI.foodsTab === 'ing' ? 'editIng' : UI.foodsTab === 'fridge' ? 'fridgeAdd' : 'editRec'}">+ ${UI.foodsTab === 'fridge' ? 'Dodaj' : 'Nowy'}</button></div>
    <div class="seg" style="margin-bottom:10px"><button class="${UI.foodsTab === 'rec' ? 'sel' : ''}" data-act="ftab" data-t="rec">Przepisy (${S.recipes.length})</button><button class="${UI.foodsTab === 'ing' ? 'sel' : ''}" data-act="ftab" data-t="ing">Składniki (${S.ingredients.length})</button><button class="${UI.foodsTab === 'fridge' ? 'sel' : ''}" data-act="ftab" data-t="fridge">W domu (${pantryItems().length})</button></div>
    ${UI.foodsTab === 'fridge' ? '' : `<input id="q" placeholder="Szukaj…" value="${esc(UI.q)}" data-bind-q>`}`;
  if (UI.foodsTab === 'fridge') return h + viewFridge();
  if (UI.foodsTab === 'rec') {
    h += `<div class="chips" style="margin:10px 0">${[['', 'Wszystkie'], ['breakfast', 'Śniadania'], ['lunch', 'Na uczelnię'], ['dinner', 'Obiadokolacje'], ['snack', 'Przekąski']].map(([k, l]) => `<button class="sm ${UI.slotFilter === k ? 'sel' : ''}" data-act="sfilter" data-k="${k}">${l}</button>`).join('')}</div><div class="cards">`;
    const f = r => (!UI.slotFilter || r.slots.includes(UI.slotFilter)) && (!q || norm(r.name + ' ' + r.tags.join(' ')).includes(q));
    h += S.recipes.filter(f).sort((a, b) => a.name.localeCompare(b.name, 'pl')).map(r => { const m = recipeMacros(r); return `<div class="card rc" data-act="viewRec" data-id="${r.id}" data-serv="${fitServ(r)}"><div class="row sp"><div class="b">${esc(r.name)}</div><div class="row" style="gap:2px"><span class="mut sm">${money(recipeCost(r))}</span><button class="ghost sm danger" data-act="delRec" data-id="${r.id}" aria-label="Usuń przepis">✕</button></div></div><div class="mut xs" style="margin:3px 0 6px">${r.slots.map(s => SLOT_PL[s]).join(' / ')} · ${macroLine(m)}</div><div>${tagHtml(r)} ${cleanBadge(r)}${pantryCover(r) >= .5 ? '<span class="tag">masz w domu</span>' : ''}</div></div>`; }).join('') || '<div class="mut">Brak przepisów</div>';
    h += `</div>`;
  } else {
    h += `<div class="card" style="margin-top:10px">`;
    h += S.ingredients.filter(i => !q || norm(i.name + ' ' + i.nl).includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'pl')).map(i => `<div class="meal" data-act="editIng" data-id="${i.id}"><div class="grow"><div class="b">${esc(i.name)} ${(i.proc || 0) >= 2 ? '<span class="tag warn">przetworzone</span>' : ''}</div><div class="mut xs">${i.nl ? esc(i.nl) + ' · ' : ''}na ${i.unit === 'pcs' ? '1 szt.' : '100 ' + i.unit}: ${r0(i.kcal)} kcal · B${i.p} W${i.c} T${i.f}</div></div><div class="r xs mut">${i.price ? money(i.price) + ' / ' + fmtAmt(i.pack, i.unit) : ''}${i.pantry ? '<br>spiżarnia: ' + fmtAmt(i.pantry, i.unit) : ''}</div></div>`).join('') || '<div class="mut">Brak składników</div>';
    h += `</div>`;
  }
  return h;
}

const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^[-*] /gm, '• ').replace(/\n/g, '<br>');
function aiConnectCard() {
  const cfg = UI.cfg || {}, cli = cfg.cli || {};
  if (cfg.local) {
    let pc = ''; try { pc = localStorage.getItem('fuel-pc') || ''; } catch (e) { }
    return `<div class="card"><h3>Claude na telefonie</h3>
      <p class="sm mut" style="margin:8px 0 12px">Ta wersja działa samodzielnie na telefonie, więc sama nie może użyć Twojego konta Claude. Masz dwie drogi:</p>
      <div class="sm"><b>1. Przez komputer – bez klucza, w ramach Twojej subskrypcji.</b> Otwórz Fuel z komputera: adres znajdziesz na komputerze w „Ja → Telefon" (np. http://192.168.1.20:8780). Działa na tym samym Wi-Fi, a poza domem po zainstalowaniu darmowego Tailscale na komputerze i telefonie.</div>
      <label>Adres Fuel z komputera</label><input id="pc_url" value="${esc(pc)}" placeholder="http://192.168.1.20:8780"><button class="pri sm" style="margin-top:8px" data-act="openPc">Otwórz Fuel z komputera</button>
      <div class="sm" style="margin-top:16px"><b>2. Własny klucz API</b> (płatny osobno, zwykle grosze za rozmowę; zapisuje się tylko w tej przeglądarce):</div>
      <label>Klucz API z console.anthropic.com</label><input id="ai_key" type="password" placeholder="sk-ant-…" autocomplete="off"><button class="sm" style="margin-top:8px" data-act="aiSaveKey">Zapisz klucz</button></div>`;
  }
  return `<div class="card"><h3>Połącz z kontem Claude</h3>
    <p class="sm mut" style="margin:8px 0 12px">Nie potrzebujesz klucza API. Fuel używa Twojego konta Claude przez Claude Code zainstalowany na tym komputerze – w ramach subskrypcji.</p>
    ${cli.found ? `<ol class="sm" style="margin:0 0 12px;padding-left:20px"><li>Kliknij „Zaloguj się do Claude" – na komputerze otworzy się okno logowania.</li><li>Zaloguj się w przeglądarce, wróć tutaj i kliknij „Sprawdź połączenie".</li></ol>
    <div class="row wrap"><button class="pri" data-act="aiLogin">Zaloguj się do Claude</button><button data-act="aiRecheck">Sprawdź połączenie</button></div>`
      : `<div class="warnbox" style="margin:0">Serwer Fuel nie widzi Claude Code na tym komputerze. Zainstaluj aplikację Claude (zawiera Claude Code), zaloguj się w niej, potem kliknij poniżej.</div><button style="margin-top:10px" data-act="aiRecheck">Sprawdź ponownie</button>`}
    <details style="margin-top:16px"><summary class="sm mut" style="cursor:pointer">Albo użyj klucza API (płatny osobno, opcjonalnie)</summary>
    <label>Klucz API z console.anthropic.com</label><input id="ai_key" type="password" placeholder="sk-ant-…" autocomplete="off"><button class="sm" style="margin-top:8px" data-act="aiSaveKey">Zapisz klucz</button></details></div>`;
}
function viewAI() {
  const cfg = UI.cfg || {}, mode = cfg.mode || 'none';
  let h = `<div class="top"><div><div class="eyebrow">Claude</div><h1>Asystent</h1></div><div class="row">${S.chat.length ? '<button class="sm" data-act="aiClear">Wyczyść czat</button>' : ''}<button class="sm" data-act="aiTest">Test połączenia</button></div></div>`;
  if (!UI.cfgLoaded || mode === 'checking') {   // never claim "not found" before we actually know
    if (!viewAI.t) viewAI.t = setTimeout(async () => { viewAI.t = null; await loadCfg(); if (UI.view === 'ai') render(); }, 1800);
    return h + `<div class="card"><div class="row"><div class="typing" style="display:inline-block"><span></span><span></span><span></span></div><span class="sm mut">Sprawdzam połączenie z Claude…</span></div></div>`;
  }
  if (cfg.error) return h + `<div class="card"><h3>Brak połączenia z serwerem Fuel</h3><p class="sm mut">Nie mogę zapytać serwera o Claude (${esc(cfg.error)}). Upewnij się, że Fuel działa na komputerze (start.bat) i że telefon jest w tej samej sieci.</p><button class="pri sm" data-act="aiRecheck">Spróbuj ponownie</button></div>`;
  if (mode === 'none') return h + aiConnectCard();
  const sugg = ['Zaplanuj mi ten tydzień: 3 różne śniadania-shake i 4 dania na lunch/kolację, tanio', 'Dodaj przepis na szybkie jajka z warzywami do zabrania na uczelnię', 'Zjadłem dziś pizzę, ok. 1100 kcal zamiast kolacji', 'Dziś był Push, 18 serii – zapisz trening', 'Czego brakuje mi do celu białka w tym tygodniu?'];
  h += `<div class="card chat"><div id="chatlog">${S.chat.length ? S.chat.map(m => `<div class="msg ${m.role}">${mdLite(m.text)}</div>`).join('') : `<div class="mut sm">Zapytaj o cokolwiek albo poproś o zmianę w planie, przepisach, zakupach i treningach. Asystent widzi Twoje dane i może je zmieniać.${mode === 'cli' ? ' Połączono z Twoim kontem Claude – odpowiedź trwa zwykle 10–25 sekund.' : ''}</div><div class="chips" style="margin-top:12px">${sugg.map((s, i) => `<button class="sm" data-act="aiSuggest" data-i="${i}">${esc(s)}</button>`).join('')}</div>`}${UI.aiBusy ? `<div class="msg assistant typing"><span></span><span></span><span></span></div>${mode === 'cli' ? '<div class="xs mut">Claude myśli – to potrwa kilkanaście sekund…</div>' : ''}` : ''}</div>
    <div class="row" style="align-items:flex-end;margin-top:12px"><textarea id="aiin" rows="2" placeholder="Napisz do asystenta…" style="resize:none"></textarea><button class="pri" data-act="aiSend" ${UI.aiBusy ? 'disabled' : ''}>Wyślij</button></div></div>`;
  UI.sugg = sugg; return h;
}

function weekChart() {
  const ws = weekStart(today()); let b = '';
  const W = 320, H = 120, bw = 26, gap = (W - 7 * bw) / 8;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i), t = targets(d).kcal, c = consumed(d).kcal, x = gap + i * (bw + gap), max = 4200;
    const th = t / max * 90, ch = Math.min(c / max * 90, 100);
    b += `<rect x="${x}" y="${100 - th}" width="${bw}" height="${th}" rx="5" fill="none" stroke="var(--line)" stroke-width="1.5"/><rect x="${x}" y="${100 - ch}" width="${bw}" height="${ch}" rx="5" fill="${c > t * 1.05 ? 'var(--warn)' : 'var(--acc)'}" opacity="${d > today() ? .25 : .95}"/><text x="${x + bw / 2}" y="116" font-size="10" text-anchor="middle" fill="var(--mut)">${DAYN[i]}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${b}</svg>`;
}

function storageCard() {
  if (!UI.local) return '';
  if (!UI.snapsLoaded) { UI.snapsLoaded = true; idbKeys().then(k => { UI.snaps = (k || []).filter(x => String(x).startsWith('snap-')).sort().reverse(); if (UI.view === 'me') render(); }); }
  const snaps = UI.snaps || [], t = UI.savedAt || S.savedAt, when = t ? new Date(t).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–';
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  return `<div class="card"><h2>Zapis danych</h2><div class="sm">Wszystko, co ustawiasz, zapisuje się <b>samo</b> na tym telefonie – w dwóch miejscach przeglądarki naraz${UI.persisted ? ', z ochroną przed skasowaniem' : ''}. Nie musisz niczego zapisywać ręcznie.</div>
    <div class="xs mut" style="margin:6px 0">Ostatni zapis: ${esc(when)}. Co 30 minut zachowuję też wcześniejszą wersję (${snaps.length}), do której możesz wrócić:</div>
    ${snaps.slice(0, 6).map(k => `<div class="meal" style="padding:8px 0"><div class="grow sm">${esc(new Date(+String(k).slice(5)).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</div><button class="sm" data-act="snapRestore" data-k="${k}">Przywróć</button></div>`).join('') || '<div class="xs mut">Pierwsza wersja pojawi się po kilkunastu minutach używania.</div>'}
    ${isIOS && !standalone ? '<div class="warnbox" style="margin:10px 0 0">Na iPhonie zwykła karta Safari może skasować dane strony po ok. 7 dniach bez otwarcia. Dodaj Fuel do ekranu głównego („Udostępnij → Do ekranu początkowego") i zawsze otwieraj go stamtąd – wtedy dane zostają.</div>' : ''}</div>`;
}
function viewMe() {
  const p = S.profile, cfg = UI.cfg || {}, origin = location.origin;
  const hookUrl = UI.local ? location.origin + location.pathname + '?workout=Trening' : `${origin}/api/workout?token=${cfg.hookToken || ''}&name=Trening`;
  const field = (l, path, v, extra = '') => `<div><label>${l}</label><input type="number" step="any" inputmode="decimal" value="${v}" data-bind="${path}" ${extra}></div>`;
  let h = `<div class="top"><div><div class="eyebrow">Ustawienia</div><h1>Ja</h1></div></div>`;
  h += `<div class="card"><h2>Ciało i cel</h2><div class="grid3">${field('Waga (kg)', 'profile.weight', p.weight)}${field('Wzrost (cm)', 'profile.height', p.height)}${field('% tłuszczu', 'profile.bodyFat', p.bodyFat)}</div>
    <div class="grid2"><div><label>Aktywność poza treningiem</label><select data-bind="profile.activity">${ACT.map(([v, l]) => `<option value="${v}" ${p.activity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${field('Nadwyżka kalorii (%)', 'profile.surplus', p.surplus)}</div>
    <div class="grid3">${field('Białko g/kg', 'profile.proteinPerKg', p.proteinPerKg)}${field('Tłuszcz % kcal', 'profile.fatPct', p.fatPct)}${field('Bonus w dni treningowe (kcal)', 'profile.trainDelta', p.trainDelta)}</div>
    <div class="grid3">${field('Budżet tygodniowy (€)', 'profile.budget', p.budget)}${field('Max cięcie po cheat meal (%/dzień)', 'profile.cheatCap', p.cheatCap)}${field('Wiek (gdy brak % tłuszczu)', 'profile.age', p.age)}</div>
    <div class="mut xs" style="margin-top:8px">Podstawowa przemiana (z masy beztłuszczowej): ${r0(bmr())} kcal. Utrzymanie ≈ ${r0(tdee())} kcal, średnia z nadwyżką: <b>${r0(weeklyAvg())} kcal/dzień</b>. 7% to spokojny, „czysty" bulk – jeśli przybierasz za szybko, zmniejsz do 4–5%.</div></div>`;
  h += `<div class="card"><h2>Cele dzienne</h2><table><tr><th></th><th>kcal</th><th>białko</th><th>węgle</th><th>tłuszcz</th></tr>${[['Dzień treningowy', true], ['Dzień wolny', false]].map(([l, tr]) => { const t = macrosFor(dayKcal(tr)); return `<tr><td>${l}</td><td>${r0(t.kcal)}</td><td>${r0(t.p)} g</td><td>${r0(t.c)} g</td><td>${r0(t.f)} g</td></tr>`; }).join('')}</table></div>`;
  h += `<div class="card"><h2>Trening</h2><div class="chips">${DAYN.map((n, i) => `<button class="${p.trainDays.includes(i) ? 'sel' : ''}" data-act="trainDay" data-i="${i}">${n}</button>`).join('')}</div>
    <div class="mut xs" style="margin:6px 0 12px">Domyślny harmonogram do planowania. Zapisane treningi (poniżej) mają pierwszeństwo.</div>
    <h3 style="font-size:17px">Gravitus i inne aplikacje treningowe</h3>
    <p class="sm mut" style="margin:6px 0 10px">Gravitus (według sklepu App Store) synchronizuje się z Apple Health, ale nie znalazłem oficjalnego API ani eksportu, więc bezpośredniego połączenia nie obiecuję. Fuel potrzebuje jednej informacji: <b>że danego dnia był trening</b> (wtedy podnosi cel kalorii). Masz trzy sposoby – od najprostszego:</p>
    <div class="sm"><b>1. Ręcznie, 5 sekund.</b> Po treningu otwórz Fuel → „Dziś" → „Zapisz trening". Działa zawsze, nawet poza domem.</div>
    <div class="sm" style="margin-top:10px"><b>2. Automatycznie po zamknięciu Gravitusa.</b> Skrót (iPhone: aplikacja Skróty → Automatyzacja → „Aplikacja" → Gravitus → „Jest zamknięta" → akcja „Pobierz zawartość URL"; Android: Tasker lub MacroDroid) otwiera ten adres i trening zapisuje się sam:</div>
    <div class="code" id="hook">${esc(hookUrl)}</div>
    <button class="sm" data-act="copyHook">Kopiuj adres</button>
    <div class="mut xs" style="margin-top:6px">${UI.local ? 'Skrót otwiera Fuel na telefonie i zapisuje trening – komputer nie jest potrzebny, działa wszędzie. Zmień „Trening" w adresie na nazwę treningu. Dodatkowe parametry: sets, minutes, date.' : 'Telefon musi wtedy „widzieć" komputer (to samo Wi-Fi albo Tailscale). Poza domem skrót się nie uda – wtedy użyj sposobu 1. Dodatkowe parametry: name, sets, minutes, volume, kcal, date.'}</div>
    <div class="sm" style="margin-top:10px"><b>3. Import CSV</b> – jeśli w Gravitusie znajdziesz eksport treningów do pliku:</div>
    <input type="file" id="csv" accept=".csv,text/csv" style="margin:6px 0">
    ${(() => { const rec_ = Object.entries(S.workouts).filter(([, w]) => w.done !== false && (w.name || w.sets)).sort().slice(-6).reverse(); return rec_.length ? `<div class="sm" style="margin-top:12px"><b>Ostatnie treningi:</b><br>${rec_.map(([d, w]) => `${esc(fmtDay(d))} – ${esc(w.name || 'Trening')}${w.sets ? ', ' + w.sets + ' serii' : ''}`).join('<br>')}</div>` : ''; })()}</div>`;
  let rowsH = '', sk = 0, sp = 0, nd = 0, hit = 0, ns = 0;
  const ws = weekStart(today());
  for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d > today()) break; const c = consumed(d), t = targets(d); if (c.kcal < 1) continue; nd++; sk += c.kcal; sp += c.p; if (c.p >= t.p * .95) hit++; if (isTrain(d)) ns++; }
  h += `<div class="card"><h2>Ten tydzień</h2>${weekChart()}<div class="sm">${nd ? `Średnio ${r0(sk / nd)} kcal i ${r0(sp / nd)} g białka · cel białka trafiony ${hit}/${nd} dni · treningi: ${ns}` : 'Odhaczaj posiłki w „Dziś", a tu pojawi się podsumowanie.'}</div><div class="mut xs">Pełne słupki = zjedzone, obrys = cel.</div></div>`;
  const ips = cfg.ips || [], ip = ips.find(x => x.startsWith('192.168.')) || ips[0], phoneUrl = ip ? `http://${ip}:${cfg.port || 8780}` : '';
  if (!UI.local && typeof qrcode !== 'function' && !UI.qrLoading) { UI.qrLoading = true; const sc = document.createElement('script'); sc.src = 'qrcode.js'; sc.onload = () => { if (UI.view === 'me') render(); }; document.head.appendChild(sc); }
  let qr = ''; try { if (phoneUrl && typeof qrcode === 'function') { const q = qrcode(0, 'M'); q.addData(phoneUrl); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } } catch (e) { qr = ''; }
  if (UI.local) h += `<div class="card"><h2>Ta aplikacja</h2><div class="sm">Działa samodzielnie na tym urządzeniu, także bez internetu i bez komputera. Twoje dane są tylko tutaj – pobieraj kopię (na dole), żeby ich nie stracić.</div><div class="xs mut" style="margin-top:8px">Chcesz przenieść dane z komputera? Na komputerze: Ja → „Pobierz kopię”, wyślij plik na telefon i tu użyj „Przywróć kopię”.</div></div>`;
  else {
  h += `<div class="card"><h2>Telefon</h2><div class="row" style="align-items:flex-start;gap:16px"><div class="qr">${qr}</div><div class="grow sm">${phoneUrl ? `Zeskanuj kod aparatem telefonu albo wpisz w przeglądarce:<div class="code">${esc(phoneUrl)}</div>` : 'Nie wykryłem adresu komputera w sieci.'}
    <ol class="xs mut" style="padding-left:18px;margin:6px 0 0"><li>Telefon i komputer w tej samej sieci Wi-Fi, a Fuel uruchomiony (start.bat).</li><li>Jeśli się nie otwiera: uruchom <b>allow-phone.bat</b> (jednorazowo) i ustaw sieć Wi-Fi jako „prywatną".</li><li>W przeglądarce telefonu: „Dodaj do ekranu głównego" – wtedy działa jak aplikacja.</li><li>Poza domem: zainstaluj darmowy <b>Tailscale</b> na komputerze i telefonie i otwórz Fuel pod adresem komputera z Tailscale (100.x.x.x:8780) – asystent Claude też wtedy działa.</li></ol></div></div></div>`;
  }
  h += syncCard();
  h += storageCard();
  h += `<div class="card"><h2>Asystent Claude</h2>${cfg.mode === 'api' ? `<div class="sm">Używa klucza API (${esc(cfg.hint)}), model <b>${esc(cfg.model)}</b>.</div>` : cfg.mode === 'cli' ? '<div class="sm">Połączony z Twoim kontem Claude przez Claude Code – bez klucza API.</div>' : '<div class="sm mut">Niepołączony – przejdź do zakładki Asystent.</div>'}</div>`;
  h += `<div class="card"><h2>Dane</h2><div class="row wrap"><button data-act="export">Pobierz kopię</button><button data-act="import">Przywróć kopię</button><input type="file" id="bk" accept=".json" hidden></div>
    <div class="mut xs" style="margin-top:8px">${UI.local ? 'Dane są zapisane tylko w tej przeglądarce, na tym urządzeniu. Pobieraj kopię co jakiś czas i zawsze przed czyszczeniem danych przeglądarki.' : 'Wszystko jest w <code>data.json</code> na komputerze (codzienne kopie w <code>backups/</code>). Telefon i komputer korzystają z tych samych danych przez serwer.'}</div></div>`;
  return h;
}

function render() {
  const v = { today: viewToday, plan: viewPlan, shop: viewShop, foods: viewFoods, ai: viewAI, me: viewMe }[UI.view];
  const y = window.scrollY, focus = document.activeElement && document.activeElement.id;
  const aiText = $('#aiin') ? $('#aiin').value : '';
  $('#app').innerHTML = v();
  if (aiText && $('#aiin')) $('#aiin').value = aiText;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === UI.view));
  try { document.title = UI.view === 'today' ? `${r0(targets(UI.date).kcal - consumed(UI.date).kcal).toLocaleString('pl-PL')} kcal · Fuel` : 'Fuel'; } catch (e) { }
  if (UI.view !== 'ai') window.scrollTo(0, y); else scrollChat();
  if (focus === 'q') { const q = $('#q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
}

/* ============ modal ============ */
function modal(title, body, buttons = []) {
  const m = $('#modal');
  m.onclick = m.oninput = m.onchange = null;
  m.innerHTML = `<div class="mh"><h3>${esc(title)}</h3><button class="ghost" aria-label="Zamknij" data-act="mclose">✕</button></div><div class="mb">${body}</div>${buttons.length ? `<div class="mf">${buttons.map((b, i) => `<button class="${b.cls || ''}" data-mbtn="${i}">${esc(b.label)}</button>`).join('')}</div>` : ''}`;
  modal.btns = buttons;
  if (!m.open) m.showModal();
}
const closeModal = () => { const m = $('#modal'); if (m.open) m.close(); if (UI.needRender) { UI.needRender = false; render(); } };
const val = id => $('#' + id)?.value;

/* ============ editors ============ */
function howHtml(txt) { const L = String(txt).split('\n').map(x => x.trim()).filter(Boolean); return L.length > 1 ? `<ol class="steps">${L.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : `<div class="sm">${esc(L[0] || '')}</div>`; }
function optsHtml(d, s) {
  const k = d + s, rot = (UI.rot && UI.rot[k]) || 0, seen = (UI.optSeen && UI.optSeen[k]) || [], o = optionsFor(d, s, 3, rot, seen); if (!o.length) return '';
  return `<div class="opts"><div class="olab">Inne opcje <button class="ghost sm" data-act="rotOpt" data-d="${d}" data-s="${s}">↻ pokaż inne</button></div><div class="orow">${o.map(x => { const r = rec(x.rid); return `<button class="opt" data-act="swapOpt" data-d="${d}" data-s="${s}" data-rid="${x.rid}" data-serv="${x.serv}"><b>${esc(r.name)}</b><span>${r0(x.kcal)} kcal · B${r0(x.p)}</span><span class="${x.cover >= .25 || x.nw === 0 ? 'ok' : ''}">${x.cover >= .25 ? 'masz w domu ' + r0(x.cover * 100) + '%' : x.nw === 0 ? 'bez nowych zakupów' : '+' + x.nw + ' nowe prod.'}</span></button>`; }).join('')}</div></div>`;
}
function saveCombo(r) { S.recipes.push({ id: uid(), name: r.name, slots: r.slots.slice(), items: r.items.map(x => ({ ...x })), how: r.how, prep: r.prep, tags: r.tags.filter(t => t !== 'składane').concat('własny') }); save(); toast('Zapisano w Twoich przepisach (Jedzenie → Przepisy)'); }
function viewRec(id, serv = 1, ctx) {
  const r = rec(id); if (!r) return;
  const m = addM(ZERO(), recipeMacros(r), serv), mine = serv !== 1 || ctx;
  modal(r.name, `<div class="mut sm">${r.slots.map(s => SLOT_PL[s]).join(' / ')} · ${mine ? 'Twoja porcja: ' : 'porcja standardowa: '}${macroLine(m)} · ${money(recipeCost(r) * serv)}</div><div style="margin:6px 0">${tagHtml(r)} ${cleanBadge(r)}</div>
    <h2 style="margin-top:12px">Składniki ${mine ? 'na Twoją porcję' : 'na 1 porcję'}</h2>${r.items.map(x => { const i = ing(x.ing), a = cookQty(x.amt * serv, i ? i.unit : 'g'); return i ? `<div class="row sp sm" style="padding:5px 0;border-top:1px solid var(--line)"><span>${esc(i.name)}${i.nl ? ` <span class="mut xs">(${esc(i.nl)})</span>` : ''}${(i.pantry || 0) >= a ? ' <span class="tag">masz w domu</span>' : ''}</span><b>${fmtAmt(a, i.unit)}</b></div>` : ''; }).join('')}
    ${r.how ? `<h2 style="margin-top:14px">Jak zrobić</h2>${howHtml(r.how)}` : ''}${r.prep ? `<div class="sm" style="margin-top:8px"><b>Z wyprzedzeniem:</b> ${esc(r.prep)}</div>` : ''}`,
    [r.combo ? { label: 'Zapisz jako mój przepis', fn: () => saveCombo(r) } : { label: 'Edytuj przepis', fn: () => editRec(id) }, ...(ctx ? [{ label: 'Zmień posiłek', cls: 'pri', fn: () => editSlot(ctx.d, ctx.s) }] : [])]);
}

function editIng(id, opts = {}) {
  const i = id ? ing(id) : { name: opts.name || '', nl: '', unit: 'g', kcal: '', p: '', c: '', f: '', aisle: 'Inne', pack: '', price: '', pantry: 0, proc: 0 };
  const aiOn = UI.cfg && (UI.cfg.mode === 'cli' || UI.cfg.mode === 'api');
  modal(id ? 'Edytuj składnik' : 'Nowy składnik', `
    <label>Nazwa</label><input id="e_name" value="${esc(i.name)}">
    ${aiOn ? '<button class="sm" style="margin-top:8px" data-aifill>Uzupełnij wartości (Claude)</button><span class="xs mut" id="e_ai"></span>' : '<div class="xs mut" style="margin-top:6px">Wartości odżywcze wpisz z opakowania.</div>'}
    <label>Nazwa w sklepie (NL) – pomaga przy zakupach</label><input id="e_nl" value="${esc(i.nl || '')}" placeholder="np. Kipfilet">
    <div class="grid2"><div><label>Jednostka</label><select id="e_unit">${['g', 'ml', 'pcs'].map(u => `<option ${i.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <div><label>Dział</label><select id="e_aisle">${AISLES.map(a => `<option ${i.aisle === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div></div>
    <div class="mut xs" style="margin-top:8px">Makro na <b>100 g / 100 ml</b> (lub na <b>1 sztukę</b>, gdy jednostka to pcs) – tak jak na opakowaniu. Puste kcal policzę z makro.</div>
    <div class="grid2"><div><label>Kalorie</label><input id="e_kcal" inputmode="decimal" value="${i.kcal}"></div><div><label>Białko g</label><input id="e_p" inputmode="decimal" value="${i.p}"></div>
    <div><label>Węglowodany g</label><input id="e_c" inputmode="decimal" value="${i.c}"></div><div><label>Tłuszcz g</label><input id="e_f" inputmode="decimal" value="${i.f}"></div></div>
    <div class="grid3"><div><label>Opakowanie (w tej jednostce)</label><input id="e_pack" inputmode="decimal" value="${i.pack}"></div><div><label>Cena opakowania €</label><input id="e_price" inputmode="decimal" value="${i.price}"></div><div><label>Teraz w domu</label><input id="e_pantry" inputmode="decimal" value="${i.pantry || 0}"></div></div>
    <label>Świeżość po zakupie (dni, puste = domyślnie)</label><input id="e_life" inputmode="numeric" value="${i.life ?? ''}" placeholder="np. 3 dla surowego kurczaka"><label>Przetworzenie</label><select id="e_proc">${[[0, '0 – nieprzetworzone'], [1, '1 – lekko (pieczywo, puszka, ser)'], [2, '2 – mocno / cukier / suplement']].map(([v, l]) => `<option value="${v}" ${(i.proc || 0) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`,
    [...(id ? [{ label: 'Usuń', cls: 'danger', fn: () => { if (S.recipes.some(r => r.items.some(x => x.ing === id)) && !confirm('Składnik jest w przepisach – usunąć mimo to?')) return; S.ingredients = S.ingredients.filter(x => x.id !== id); S.recipes.forEach(r => r.items = r.items.filter(x => x.ing !== id)); done(); } }] : []),
    { label: 'Zapisz', cls: 'pri', fn: () => {
      const o = id ? i : { id: uid() }, p = num(val('e_p')), c = num(val('e_c')), f = num(val('e_f'));
      if (!val('e_name').trim()) return toast('Podaj nazwę');
      Object.assign(o, { name: val('e_name').trim(), nl: val('e_nl').trim(), unit: val('e_unit'), aisle: val('e_aisle'), p, c, f, kcal: val('e_kcal').trim() ? num(val('e_kcal')) : r0(4 * p + 4 * c + 9 * f), pack: num(val('e_pack')), price: num(val('e_price')), pantry: num(val('e_pantry')), proc: +val('e_proc') }); if (val('e_life').trim()) o.life = num(val('e_life')); else delete o.life;
      delete o.starter; if (!id) S.ingredients.push(o);
      if (opts.onDone) { save(); opts.onDone(o); } else done();
    } }]);
  $('#modal').onclick = async e => {
    if (!e.target.closest('[data-aifill]')) return;
    const name = val('e_name').trim(); if (!name) return toast('Najpierw wpisz nazwę produktu');
    $('#e_ai').textContent = ' Pytam Claude…';
    try {
      const txt = await aiAsk(`Podaj typowe wartości odżywcze produktu spożywczego "${name}" (sprzedawanego w holenderskim supermarkecie) na 100 g albo 100 ml (lub na 1 sztukę, jeśli naturalnie liczy się w sztukach). Odpowiedz tylko JSON: {"unit":"g|ml|pcs","kcal":0,"protein":0,"carbs":0,"fat":0,"nl":"holenderska nazwa w sklepie","aisle":"jedno z: ${AISLES.join(', ')}","proc":0,"pack":0,"price":0} gdzie proc: 0 nieprzetworzone, 1 lekko przetworzone, 2 mocno; pack: typowa wielkość opakowania w tej samej jednostce; price: typowa cena opakowania w EUR.`);
      const j = extractJson(txt); if (!j) throw new Error('nie rozumiem odpowiedzi');
      if (['g', 'ml', 'pcs'].includes(j.unit)) $('#e_unit').value = j.unit;
      for (const [k, f] of [['kcal', 'e_kcal'], ['protein', 'e_p'], ['carbs', 'e_c'], ['fat', 'e_f'], ['pack', 'e_pack'], ['price', 'e_price']]) if (j[k] != null) $('#' + f).value = j[k];
      if (j.nl) $('#e_nl').value = j.nl; if (AISLES.includes(j.aisle)) $('#e_aisle').value = j.aisle; if (j.proc != null) $('#e_proc').value = Math.max(0, Math.min(2, +j.proc || 0));
      $('#e_ai').textContent = ' Uzupełnione – sprawdź wartości z opakowaniem.';
    } catch (err) { $('#e_ai').textContent = ' Nie udało się: ' + (err.message || err); }
  };
  function done() { save(); closeModal(); render(); }
}

function editRec(id, draftIn) {
  const r = id ? rec(id) : null;
  const draft = draftIn || (r ? JSON.parse(JSON.stringify(r)) : { name: '', slots: ['dinner'], tags: [], how: '', prep: '', items: [] });
  if (!draft.items.length) draft.items.push({ ing: S.ingredients[0]?.id, amt: 100 });
  const sortedIng = () => S.ingredients.slice().sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  const sync = () => { draft.name = val('r_name'); draft.prep = val('r_prep'); draft.how = val('r_how'); draft.tags = val('r_tags').split(',').map(x => x.trim()).filter(Boolean); draft.slots = SLOTS_ALL.filter(s => $('#r_s_' + s).checked); draft.items.forEach((it, k) => { it.ing = val('r_i' + k); it.amt = num(val('r_a' + k)); }); draft.fitOnSave = $('#r_fitsave') ? $('#r_fitsave').checked : draft.fitOnSave; draft.ts = val('r_ts') || draft.ts; };
  const tslot = () => draft.ts || (draft.slots.includes('dinner') ? 'dinner' : draft.slots.includes('lunch') ? 'lunch' : draft.slots.includes('breakfast') ? 'breakfast' : 'dinner');
  const fitInfo = () => { const T = slotTarget(tslot()), m = recipeMacros(draft); return `cel dla tego posiłku: <b>${T.kcal} kcal · ${T.p} g białka</b> &nbsp;|&nbsp; teraz: <b>${r0(m.kcal)} kcal · ${r0(m.p)} g</b>`; };
  const body = () => `<label>Nazwa</label><input id="r_name" value="${esc(draft.name)}" placeholder="np. Kurczak z ryżem i brokułami">
    <label>Na jaki posiłek</label><div class="chips">${SLOTS_ALL.map(s => `<label class="row chk"><input type="checkbox" id="r_s_${s}" ${draft.slots.includes(s) ? 'checked' : ''}> ${SLOT_PL[s]}</label>`).join('')}</div>
    <details ${draft.items.length <= 1 && !id ? 'open' : ''} style="margin-top:10px"><summary class="sm" style="cursor:pointer"><b>Wklej listę składników</b> (np. „200 g kurczak")</summary>
      <textarea id="r_paste" rows="4" placeholder="200 g pierś z kurczaka&#10;80 g ryż&#10;150 g brokuły&#10;2 łyżki oliwy" style="margin-top:6px"></textarea>
      <button class="sm" style="margin-top:6px" data-rparse>Rozpoznaj składniki</button>
      ${(draft._unknown || []).length ? `<div class="warnbox" style="margin:8px 0 0">Nie znam: ${draft._unknown.map(n => `<button class="sm" data-rnew="${esc(n)}">Dodaj „${esc(n)}"</button>`).join(' ')}</div>` : ''}</details>
    <label>Składniki (na 1 porcję)</label>
    ${draft.items.map((it, k) => `<div class="row" style="margin-bottom:6px"><select id="r_i${k}" style="flex:2">${sortedIng().map(i => `<option value="${i.id}" ${i.id === it.ing ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select><input id="r_a${k}" inputmode="decimal" value="${it.amt}" style="flex:1;min-width:0"><span class="mut xs" style="width:30px">${ing(it.ing)?.unit || ''}</span><button class="ghost danger" data-rdel="${k}" aria-label="Usuń składnik">✕</button></div>`).join('')}
    <div class="row wrap"><button class="sm" data-radd>+ składnik</button><button class="sm" data-rnew="">+ nowy produkt</button></div>
    <div class="card" style="margin:12px 0;padding:12px"><h2>Dopasuj ilości do mojego celu</h2>
      <div class="row wrap"><select id="r_ts" style="width:auto">${['breakfast', 'lunch', 'dinner'].map(s => `<option value="${s}" ${tslot() === s ? 'selected' : ''}>${SLOT_PL[s]}</option>`).join('')}</select></div>
      <div class="xs" id="r_fit" style="margin:8px 0">${fitInfo()}</div>
      <div class="row wrap"><button class="sm" data-rfit="k">Dopasuj kalorie</button><button class="sm" data-rfit="kp">Dopasuj kalorie i białko</button></div></div>
    <label>Jak przygotować (krótko)</label><textarea id="r_how" rows="3" placeholder="Każdy krok w nowej linii">${esc(draft.how)}</textarea>
    <label>Co przygotować z wyprzedzeniem</label><input id="r_prep" value="${esc(draft.prep)}" placeholder="np. Ugotuj ryż na 2–3 dni">
    <label>Tagi (po przecinku)</label><input id="r_tags" value="${esc(draft.tags.join(', '))}" placeholder="meal prep, szybkie, wegetariańskie…">
    ${id ? '' : `<label class="row chk" style="margin-top:12px"><input type="checkbox" id="r_fitsave" ${draft.fitOnSave !== false ? 'checked' : ''}> Po zapisaniu dopasuj porcję do mojego celu (kalorie i białko)</label>`}
    <div class="banner sm" id="r_sum" style="margin-top:10px"></div>`;
  const sumHtml = () => `<b>Na porcję:</b> ${macroLine(recipeMacros(draft))} · ${money(recipeCost(draft))}`;
  const clean = () => { const d = { ...draft }; delete d._unknown; delete d.fitOnSave; delete d.ts; return d; };
  const btns = [...(id ? [{ label: 'Usuń przepis', cls: 'danger', fn: () => { closeModal(); withUndo(() => { const x = removeRecipe(id); return `Usunięto: ${x ? x.name : 'przepis'}`; }); } }] : []),
  { label: 'Zapisz', cls: 'pri', fn: () => {
    sync(); if (!draft.name.trim()) return toast('Podaj nazwę'); if (!draft.slots.length) return toast('Wybierz posiłek');
    draft.items = draft.items.filter(x => x.ing && x.amt > 0); if (!draft.items.length) return toast('Dodaj co najmniej jeden składnik');
    let note = '';
    if (!id && draft.fitOnSave !== false) { const T = slotTarget(tslot()), f = fitItems(draft.items, T.kcal, T.p); draft.items = f.items; note = ` – dopasowano do Twojego celu (${f.kcal} kcal, ${f.p} g białka)`; }
    const out = clean(); delete out.starter;
    if (id) Object.assign(r, out); else { out.id = uid(); S.recipes.push(out); }
    save(); closeModal(); render(); toast('Zapisano przepis' + note);
  } }];
  const refresh = () => { $('#r_sum').innerHTML = sumHtml(); $('#r_fit').innerHTML = fitInfo(); };
  const paint = () => {
    modal(id ? 'Edytuj przepis' : 'Nowy przepis', body(), btns);
    const m = $('#modal'); refresh();
    m.onclick = e => {
      const t = e.target.closest('[data-radd],[data-rdel],[data-rfit],[data-rparse],[data-rnew]'); if (!t) return;
      sync();
      if (t.hasAttribute('data-radd')) { draft.items.push({ ing: S.ingredients[0]?.id, amt: 100 }); paint(); }
      else if (t.hasAttribute('data-rdel')) { draft.items.splice(+t.dataset.rdel, 1); paint(); }
      else if (t.hasAttribute('data-rfit')) { const T = slotTarget(tslot()), f = fitItems(draft.items, T.kcal, t.dataset.rfit === 'kp' ? T.p : 0); draft.items = f.items; paint(); toast(`Dopasowano: ${f.kcal} kcal, ${f.p} g białka (${f.note})`); }
      else if (t.hasAttribute('data-rparse')) {
        const res = parseIngredientLines(val('r_paste'));
        if (res.items.length) { const untouched = draft.items.length === 1 && draft.items[0].amt === 100; draft.items = (untouched ? [] : draft.items).concat(res.items); }
        draft._unknown = res.unknown; paint(); toast(res.items.length ? `Rozpoznano ${res.items.length} składników${res.unknown.length ? ', ' + res.unknown.length + ' nieznanych' : ''}` : 'Nie rozpoznałem żadnego składnika');
      } else if (t.hasAttribute('data-rnew')) {
        const nm = t.dataset.rnew; draft._unknown = (draft._unknown || []).filter(x => x !== nm);
        editIng(null, { name: nm, onDone: o => { const only = draft.items.length === 1 && draft.items[0].amt === 100 && draft.items[0].ing === S.ingredients[0]?.id; draft.items = (only ? [] : draft.items).concat([{ ing: o.id, amt: o.unit === 'pcs' ? 1 : 100 }]); editRec(id, draft); } });
      }
      e.stopPropagation();
    };
    m.oninput = m.onchange = e => { if (/^r_[ai]\d/.test(e.target.id) || e.target.id === 'r_ts') { sync(); refresh(); } };
  };
  paint();
}

/* days around d that share the same cooked dish in this slot (one cooking session) */
function blockDays(d, s) {
  const it = (S.plan[d] || {})[s]; if (!it) return [d];
  const out = [d];
  for (const dir of [-1, 1]) for (let x = addDays(d, dir); ; x = addDays(x, dir)) { const y = (S.plan[x] || {})[s]; if (y && y.rid === it.rid && !y.eaten && x >= today()) out.push(x); else break; }
  return out.sort();
}
/* draw a different dish for just this meal; the rest of the week stays exactly as it is */
function regenSlot(d, s) {
  const dp = S.plan[d] || (S.plan[d] = {}); delete dp[s];
  if (d < today()) return [];
  const w = generate(weekStart(d), { keep: true, only: d });
  UI.optSeen && delete UI.optSeen[d + s]; return w;
}
function editSlot(d, s) {
  const dp = S.plan[d] || (S.plan[d] = {}), it = dp[s] || null, r = it && live(it) ? rec(it.rid) : null, week = weekStart(d), days = it ? blockDays(d, s) : [d];
  const draft = { serv: it ? it.serv : 1 }, tgtK = it && r ? itemMacros(it).kcal : targets(d).kcal * shareOf(s);
  const info = () => r ? `${macroLine(addM(ZERO(), recipeMacros(r), draft.serv))}` : '';
  const results = q => {
    const nq = norm(q); if (nq.length < 2) return '<div class="mut xs">Wpisz co najmniej 2 litery (np. „kurczak", „soczewica", „wrap").</div>';
    const seen = new Set(), all = [];
    for (const x of optionPool(s, week).concat(S.recipes)) { if (seen.has(x.id) || !x.items.length) continue; seen.add(x.id); if (norm(x.name + ' ' + (x.tags || []).join(' ')).includes(nq)) all.push(x); }
    return all.slice(0, 24).map(x => { const m = recipeMacros(x), sv = clampServ(tgtK / m.kcal); return `<button class="opt wide" data-pickrid="${x.id}" data-serv="${sv}"><b>${esc(x.name)}</b><span>${r0(m.kcal * sv)} kcal · ${x.slots.map(z => SLOT_PL[z]).join(' / ')}</span></button>`; }).join('') || '<div class="mut xs">Nic nie znalazłem.</div>';
  };
  modal(`${fmtDay(d)} · ${SLOT_PL[s]}`, `${r ? `<div class="b" style="font-size:17px">${esc(r.name)}</div><div class="mut xs" id="es_info">${info()}</div>` : '<div class="mut sm">Nic nie zaplanowano na ten posiłek.</div>'}
    <div class="row wrap" style="margin:10px 0"><button class="sm" data-es="regen">↻ Wylosuj inny</button>${it ? '<button class="sm danger" data-es="clear">Usuń ten posiłek</button>' : ''}</div>
    ${it && it.eaten ? '' : optsHtml(d, s)}
    <label>Wyszukaj danie</label><input id="es_q" placeholder="np. kurczak, soczewica, wrap…" autocomplete="off"><div id="es_list" class="olist">${results('')}</div>
    ${r ? `<h2 style="margin-top:14px">Ten posiłek</h2><div class="row sp" style="margin-bottom:6px"><button class="sm" data-es="smaller">− mniejsza porcja</button><button class="sm" data-es="bigger">większa porcja +</button></div>
    <label class="row chk"><input type="checkbox" id="s_l" ${it.locked ? 'checked' : ''}> Przypnij (generowanie tygodnia tego nie ruszy)</label>
    <label class="row chk"><input type="checkbox" id="s_k" ${it.skipped ? 'checked' : ''}> Pomiń ten posiłek (nie wchodzi na listę zakupów)</label>
    ${days.length > 1 ? `<label class="row chk"><input type="checkbox" id="es_block"> Zastosuj do całego bloku gotowania (${DAYN[wdIdx(days[0])]}–${DAYN[wdIdx(days[days.length - 1])]})</label>` : ''}` : ''}`,
    r ? [{ label: 'Zapisz', cls: 'pri', fn: () => withUndo(() => { const tdays = ($('#es_block') && $('#es_block').checked) ? days : [d]; for (const x of tdays) { const y = (S.plan[x] || {})[s]; if (!y) continue; y.serv = draft.serv; y.locked = $('#s_l').checked; y.skipped = $('#s_k').checked; } closeModal(); return 'Zapisano zmiany posiłku'; }) }] : []);
  const m = $('#modal');
  m.onclick = e => {
    const pr = e.target.closest('[data-pickrid]'), es = e.target.closest('[data-es]');
    if (pr) { const rid = pr.dataset.pickrid, sv = +pr.dataset.serv; closeModal(); withUndo(() => { swapMeal(d, s, rid, sv); UI.optSeen && delete UI.optSeen[d + s]; return 'Zmieniono posiłek'; }); return; }
    if (!es) return; const act = es.dataset.es;
    if (act === 'regen') { closeModal(); withUndo(() => { const w = regenSlot(d, s); return w.length ? w[0] : 'Wylosowano inny posiłek'; }); }
    else if (act === 'clear') { closeModal(); withUndo(() => { delete (S.plan[d] || {})[s]; return 'Usunięto posiłek'; }); }
    else if (act === 'smaller' || act === 'bigger') { draft.serv = clampServ(draft.serv + (act === 'bigger' ? .25 : -.25)); $('#es_info').textContent = info(); }
  };
  m.oninput = e => { if (e.target.id === 'es_q') $('#es_list').innerHTML = results(e.target.value); };
}
function setEatenReset(it) { for (const [id, q] of Object.entries(it.used || {})) { const i = ing(id); if (i) i.pantry = (i.pantry || 0) + q; } }

function basePicker() {
  const wk = UI.week, sel = new Set(S.bases[wk] || []);
  const roles = [['p', 'Białko'], ['c', 'Baza węglowodanowa'], ['v', 'Warzywa'], ['x', 'Dodatki (opcjonalne)']];
  const sec = ([role, title]) => `<h2 style="margin-top:12px">${title}</h2><div class="chips">${Object.keys(COMBO[role]).filter(k => ing(k)).map(k => `<label class="row chk chip"><input type="checkbox" data-base="${k}" ${sel.has(k) ? 'checked' : ''}> ${esc(ing(k).name.replace(/ \(.*\)/, '').toLowerCase())}</label>`).join('')}</div>`;
  const read = () => $$('[data-base]').filter(x => x.checked).map(x => x.dataset.base);
  const sum = () => { const ids = new Set(read()), el = $('#bs_sum'); if (!el) return; el.innerHTML = ids.size ? `Wybrane: <b>${ids.size}</b> produktów · możliwych obiadokolacji: <b>${comboPool('dinner', wk, ids, 9999).length}</b> · na uczelnię: <b>${comboPool('lunch', wk, ids, 9999).length}</b>` : 'Nic nie wybrano – użyję wszystkich produktów i przepisów.'; };
  const set = ids => { const s = new Set(ids); $$('[data-base]').forEach(x => x.checked = s.has(x.dataset.base)); sum(); };
  modal('Półprodukty na tydzień', `<div class="mut sm">Wybierz kilka produktów (np. 2–3 białka, 2 bazy, 3 warzywa). Dania obiadokolacji i „na uczelnię" ułożę tylko z nich, więc kupujesz mało rzeczy, a dania i tak są różne. Śniadania i inne przepisy bez zmian.</div>
    <div class="banner sm" id="bs_sum" style="position:sticky;top:0;margin:8px 0"></div>${roles.map(sec).join('')}`,
    [{ label: 'Zaproponuj zestaw', fn: () => set(suggestBaseSet()) }, { label: 'Wyczyść', fn: () => set([]) },
    { label: 'Zapisz', fn: () => { S.bases[wk] = read(); save(); closeModal(); render(); } },
    { label: 'Zapisz i wygeneruj', cls: 'pri', fn: () => { S.bases[wk] = read(); closeModal(); withUndo(() => { const w = generate(wk); return w.length ? w[0] : 'Plan ułożony z wybranych półproduktów'; }); } }]);
  $('#modal').onchange = sum; sum();
}
function menuPicker() {
  const wk = UI.week, sel = new Set(S.menus[wk] || []);
  const groups = [['Śniadania', r => r.slots.includes('breakfast')], ['Na uczelnię (szybkie albo kupne)', r => r.slots.includes('lunch') && !r.slots.includes('breakfast')], ['Obiadokolacje', r => r.slots.includes('dinner')], ['Przekąski', r => r.slots.length === 1 && r.slots[0] === 'snack']];
  const list = (title, f) => { const rs = S.recipes.filter(f).sort((a, b) => a.name.localeCompare(b.name, 'pl')); return rs.length ? `<h2 style="margin-top:12px">${title}</h2>` + rs.map(r => `<label class="row chk pick"><input type="checkbox" data-pick="${r.id}" ${sel.has(r.id) ? 'checked' : ''}><span class="grow"><b>${esc(r.name)}</b> <span class="mut xs">${r0(recipeMacros(r).kcal)} kcal · ${money(recipeCost(r))}</span><br>${tagHtml(r)} ${cleanBadge(r)}</span></label>`).join('') : ''; };
  const read = () => $$('[data-pick]').filter(x => x.checked).map(x => x.dataset.pick);
  modal(`Menu na tydzień od ${fmtDay(wk)}`, `<div class="mut sm">Zaznacz, co chcesz jeść w tym tygodniu (np. 3 śniadania, 2–3 rzeczy na uczelnię i 2–3 obiadokolacje). Generator rozłoży je na dni, a lista zakupów zrobi się z nich. Gdy nic nie zaznaczysz w danej grupie, użyje wszystkich.</div><div class="banner sm" id="pk_sum" style="position:sticky;top:0;margin:8px 0"></div>${groups.map(([t, f]) => list(t, f)).join('')}`,
    [{ label: 'Losuj za mnie', fn: () => { const pickN = (f, n) => S.recipes.filter(f).filter(r => !S.profile.clean || isClean(r)).sort(() => Math.random() - .5).slice(0, n).map(r => r.id); const ids = new Set([...pickN(groups[0][1], 3), ...pickN(groups[1][1], Math.ceil(7 / S.profile.prepDays)), ...pickN(groups[2][1], Math.ceil(7 / S.profile.prepDays))]); $$('[data-pick]').forEach(x => x.checked = ids.has(x.dataset.pick)); } },
    { label: 'Zapisz', fn: () => { S.menus[wk] = read(); save(); closeModal(); render(); } },
    { label: 'Zapisz i wygeneruj', cls: 'pri', fn: () => { S.menus[wk] = read(); const w = generate(wk); save(); closeModal(); render(); toast(w.length ? w[0] : 'Plan gotowy – sprawdź listę zakupów'); } }]);
  const upd = () => { const ids = read(), set = new Set(); ids.forEach(id => rec(id).items.forEach(x => set.add(x.ing))); const el = $('#pk_sum'); if (el) el.innerHTML = ids.length ? `Wybrane: <b>${ids.length}</b> dań · razem <b>${set.size}</b> różnych produktów do kupienia` : 'Nic nie wybrano – generator użyje wszystkich przepisów.'; };
  $('#modal').onchange = upd; upd();
}

function addFood() {
  const d = UI.date;
  modal('Dodaj jedzenie', `<div class="seg" style="margin-bottom:8px"><button class="sel" data-ftab2="ing">Składnik</button><button data-ftab2="rec">Przepis</button><button data-ftab2="cus">Własne</button></div>
    <div id="af_body"></div><label>Posiłek</label><select id="af_slot">${SLOTS_ALL.map(s => `<option value="${s}">${SLOT_PL[s]}</option>`).join('')}</select>`,
    [{ label: 'Dodaj', cls: 'pri', fn: () => {
      const slot = val('af_slot'), mode = addFood.mode || 'ing'; let e;
      if (mode === 'ing') { const i = ing(val('af_i')), a = num(val('af_a')); if (!i || !a) return toast('Wybierz składnik i ilość'); e = { name: `${i.name} ${fmtAmt(a, i.unit)}`, ...ingMacros(i, a) }; }
      else if (mode === 'rec') { const r = rec(val('af_r')), sv = num(val('af_a')) || 1; if (!r) return toast('Wybierz przepis'); e = { name: `${r.name} ×${sv}`, ...addM(ZERO(), recipeMacros(r), sv) }; }
      else { if (!num(val('af_k'))) return toast('Podaj kalorie'); e = { name: val('af_n') || 'Jedzenie', kcal: num(val('af_k')), p: num(val('af_p')), c: num(val('af_c')), f: num(val('af_f')) }; }
      e.id = uid(); e.slot = slot; (S.log[d] = S.log[d] || []).push(e); save(); closeModal(); render();
    } }]);
  const paint = mode => {
    addFood.mode = mode; $$('[data-ftab2]').forEach(b => b.classList.toggle('sel', b.dataset.ftab2 === mode));
    $('#af_body').innerHTML = mode === 'ing' ? `<label>Składnik</label><select id="af_i">${S.ingredients.slice().sort((a, b) => a.name.localeCompare(b.name, 'pl')).map(i => `<option value="${i.id}">${esc(i.name)} (${i.unit})</option>`).join('')}</select><label>Ilość</label><input id="af_a" inputmode="decimal" placeholder="np. 150">`
      : mode === 'rec' ? `<label>Przepis</label><select id="af_r">${S.recipes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><label>Porcje</label><input id="af_a" inputmode="decimal" value="1">`
        : `<label>Nazwa</label><input id="af_n"><div class="grid2"><div><label>Kalorie</label><input id="af_k" inputmode="decimal"></div><div><label>Białko g</label><input id="af_p" inputmode="decimal"></div><div><label>Węgle g</label><input id="af_c" inputmode="decimal"></div><div><label>Tłuszcz g</label><input id="af_f" inputmode="decimal"></div></div>`;
  };
  addFood.mode = 'ing'; paint('ing');
  $('#modal').onclick = e => { const t = e.target.closest('[data-ftab2]'); if (t) paint(t.dataset.ftab2); };
}

function cheatDialog() {
  const d = UI.date, dp = S.plan[d] || {};
  const prev = () => {
    const k = num(val('c_k')), rep = val('c_rep') || null; if (!k) return $('#c_prev').textContent = 'Wpisz kalorie, a pokażę plan';
    const { surplus, days } = cheatPreview(d, k, rep), per = Math.min(surplus / Math.max(1, days.length), S.profile.cheatCap / 100 * baseKcal(d));
    $('#c_prev').innerHTML = surplus <= 0 ? 'Zastępuje zaplanowany posiłek – bez nadwyżki. Porcje zostaną dopasowane.' : `Nadwyżka względem planu: <b>${r0(surplus)} kcal</b>. Rozłożę ją na ${days.length} dni: ok. −${r0(per)} kcal/dzień (max ${S.profile.cheatCap}% dziennie). Porcje w planie dopasuję automatycznie.`;
  };
  modal('Cheat meal', `<label>Co to było?</label><input id="c_n" placeholder="Pizza, burger, lody…">
    <div class="grid2"><div><label>Kalorie (szacunek)</label><input id="c_k" inputmode="decimal"></div><div><label>Białko g (opcj.)</label><input id="c_p" inputmode="decimal"></div><div><label>Węgle g</label><input id="c_c" inputmode="decimal"></div><div><label>Tłuszcz g</label><input id="c_f" inputmode="decimal"></div></div>
    <label>Zastępuje zaplanowany posiłek?</label><select id="c_rep"><option value="">Nie, to dodatek</option>${SL().filter(s => live(dp[s]) && !dp[s].eaten).map(s => `<option value="${s}">${SLOT_PL[s]} (${r0(itemMacros(dp[s]).kcal)} kcal)</option>`).join('')}</select>
    <div class="banner sm" id="c_prev">Wpisz kalorie, a pokażę plan</div>`,
    [{ label: 'Zapisz i rozłóż kalorie', cls: 'pri', fn: () => {
      const k = num(val('c_k')); if (!k) return toast('Podaj kalorie');
      const r = applyCheat(d, { name: val('c_n') || 'Cheat meal', kcal: k, p: num(val('c_p')), c: num(val('c_c')), f: num(val('c_f')), replaces: val('c_rep') || null });
      save(); closeModal(); render(); toast(r.surplus > 0 ? `Gotowe: −${r0(r.absorbed)} kcal rozłożone na ${r.n} dni` : 'Zapisane – plan dopasowany');
    } }]);
  $('#modal').oninput = prev; $('#modal').onchange = prev;
}

function workoutDialog() {
  const d = UI.date, w = S.workouts[d] || {};
  modal('Zapisz trening', `<div class="chips" style="margin-bottom:8px">${['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body', 'Cardio'].map(n => `<button class="sm" data-wn="${n}">${n}</button>`).join('')}</div>
    <label>Nazwa</label><input id="w_n" value="${esc(w.name || '')}" placeholder="np. Push">
    <div class="grid3"><div><label>Serie</label><input id="w_s" inputmode="numeric" value="${w.sets || ''}"></div><div><label>Czas (min)</label><input id="w_m" inputmode="numeric" value="${w.min || ''}"></div><div><label>Objętość (kg, opcj.)</label><input id="w_v" inputmode="numeric" value="${w.volume || ''}"></div></div>`,
    [...(S.workouts[d] ? [{ label: 'Usuń trening', cls: 'danger', fn: () => { delete S.workouts[d]; save(); closeModal(); render(); } }] : []),
    { label: 'Zapisz', cls: 'pri', fn: () => { logWorkout(d, { name: val('w_n').trim() || 'Trening', sets: num(val('w_s')) || undefined, min: num(val('w_m')) || undefined, volume: num(val('w_v')) || undefined }); save(); closeModal(); render(); toast('Trening zapisany – cel kalorii na ten dzień podniesiony'); } }]);
  $('#modal').onclick = e => { const t = e.target.closest('[data-wn]'); if (t) $('#w_n').value = t.dataset.wn; };
}


/* ============ Reminders (iPhone): runs a Shortcut that turns each line into a reminder ============ */
function launchReminders() {
  const txt = remindersText(UI.week);
  location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent('Fuel zakupy') + '&input=text&text=' + encodeURIComponent(txt);
}
function remindersSetup() {
  modal('Lista zakupów w Przypomnieniach', `<p class="sm" style="margin-top:0">Fuel nie może sam pisać do aplikacji Przypomnienia, ale iPhone ma do tego Skróty. Zrobisz jeden skrót raz (ok. 1 minuty), a potem lista zakupów trafia do Przypomnień jednym dotknięciem – każdy produkt jako osobna pozycja do odhaczenia.</p>
    <h2 style="margin-top:14px">Raz: stwórz skrót</h2>
    <ol class="steps"><li>Otwórz aplikację <b>Skróty</b> → <b>+</b> (nowy skrót) i nazwij go dokładnie <b>Fuel zakupy</b>.</li>
    <li>Dodaj akcję <b>Podziel tekst</b>: tekst = <b>Dane wejściowe skrótu</b>, separator = <b>Nowe wiersze</b>.</li>
    <li>Dodaj akcję <b>Powtórz z każdym</b> (dla wyniku podziału).</li>
    <li>W środku dodaj <b>Dodaj nowe przypomnienie</b>: tytuł = <b>Element powtórzenia</b>, lista = <b>Zakupy</b> (lub inna).</li>
    <li>W ustawieniach skrótu (ⓘ) w „Odbieraj" zostaw tylko <b>Tekst</b>. Gotowe.</li></ol>
    <div class="mut xs" style="margin-top:8px">Nie mam iPhone'a pod ręką, więc nie sprawdziłem tego skrótu na urządzeniu – opisałem go zgodnie z dokumentacją Apple. Jeśli coś się nie zgadza, użyj „Kopiuj listę" i wklej do Przypomnień lub Notatek. Na Androidzie użyj „Udostępnij" → Google Keep / Tasks.</div>`,
    [{ label: 'Kopiuj listę', fn: async () => { try { await navigator.clipboard.writeText(remindersText(UI.week)); toast('Skopiowano – wklej w Przypomnieniach'); } catch (e) { prompt('Skopiuj:', remindersText(UI.week)); } } },
    { label: 'Mam skrót – uruchom', cls: 'pri', fn: () => { try { localStorage.setItem('fuel-rem-ready', '1'); } catch (e) { } closeModal(); launchReminders(); } }]);
}

/* ============ first-run setup ============ */
function onboarding() {
  const p = S.profile;
  modal('Zacznijmy od Ciebie', `<p class="sm mut" style="margin-top:0">Kilka danych, żeby policzyć Twoje kalorie i białko. Wszystko zmienisz później w zakładce „Ja".</p>
    <div class="grid3"><div><label>Waga (kg)</label><input id="ob_w" inputmode="decimal" value="${p.weight}"></div><div><label>Wzrost (cm)</label><input id="ob_h" inputmode="decimal" value="${p.height}"></div><div><label>% tłuszczu (opcj.)</label><input id="ob_bf" inputmode="decimal" value="${p.bodyFat || ''}"></div></div>
    <div class="grid2"><div><label>Wiek</label><input id="ob_a" inputmode="numeric" value="${p.age}"></div><div><label>Cel</label><select id="ob_g">${[[0, 'Utrzymanie wagi'], [5, 'Lekki przyrost (+5%)'], [7, 'Spokojny bulk (+7%)'], [10, 'Bulk (+10%)'], [-12, 'Redukcja (−12%)']].map(([v, l]) => `<option value="${v}" ${p.surplus === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <label>Dni treningowe</label><div class="chips">${DAYN.map((n, i) => `<label class="row chk" style="margin:0"><input type="checkbox" class="ob_d" value="${i}" ${p.trainDays.includes(i) ? 'checked' : ''}> ${n}</label>`).join('')}</div>
    <div class="grid2"><div><label>Sklep</label><select id="ob_s">${STORES.map(s => `<option ${p.store === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div><label>Budżet na tydzień (€)</label><input id="ob_b" inputmode="decimal" value="${p.budget}"></div></div>
    <label>Gotuję</label><select id="ob_p">${[[1, 'codziennie'], [2, 'co 2 dni'], [3, 'co 3 dni (polecam)'], [4, 'co 4 dni']].map(([v, l]) => `<option value="${v}" ${p.prepDays === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`,
    [{ label: 'Później', fn: () => { S.profileSet = true; save(); closeModal(); } },
    { label: 'Zapisz', cls: 'pri', fn: () => {
      const bf = num(val('ob_bf'));
      Object.assign(S.profile, { weight: num(val('ob_w')) || p.weight, height: num(val('ob_h')) || p.height, age: num(val('ob_a')) || p.age, bodyFat: bf >= 3 && bf <= 50 ? bf : 0, surplus: +val('ob_g'), trainDays: $$('.ob_d').filter(x => x.checked).map(x => +x.value), store: val('ob_s'), budget: num(val('ob_b')), prepDays: +val('ob_p') });
      S.profileSet = true; save(); closeModal(); render(); toast('Zapisane – teraz wygeneruj swój pierwszy tydzień');
    } }]);
}

/* ============ actions ============ */
const ACTIONS = {
  nav: ds => { UI.view = ds.v; render(); window.scrollTo(0, 0); },
  mclose: closeModal,
  weekSet: ds => { UI.week = ds.w; render(); },
  planNext: () => { UI.week = addDays(weekStart(today()), 7); UI.view = 'plan'; render(); window.scrollTo(0, 0); },
  shopNext: () => { UI.week = addDays(weekStart(today()), 7); UI.view = 'shop'; render(); window.scrollTo(0, 0); },
  delRec: ds => withUndo(() => { const x = removeRecipe(ds.id); return `Usunięto: ${x ? x.name : 'przepis'}`; }),
  welcomeOk: () => { S.welcomeSeen = true; save(); render(); },
  snapRestore: async ds => { const json = await idbGet(ds.k); if (!json) return toast('Nie mogę wczytać tej wersji'); let d; try { d = JSON.parse(json); } catch (e) { return toast('Ta wersja jest uszkodzona'); } withUndo(() => { const rev = S.rev, chat = S.chat; S = d; S.rev = rev; S.chat = S.chat || chat; migrate(); return 'Przywrócono wersję z ' + new Date(+String(ds.k).slice(5)).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }); },
  undo: () => { if (UI.undoFn) { UI.undoFn(); UI.undoFn = null; } },
  hideInstall: () => { try { localStorage.setItem('fuel-hide-install', '1'); } catch (e) { } render(); },
  installApp: async () => { const e = UI.installEvt; if (!e) return; e.prompt(); try { await e.userChoice; } catch (x) { } UI.installEvt = null; render(); },
  day: ds => { UI.date = addDays(UI.date, +ds.n); render(); },
  dayToday: () => { UI.date = today(); render(); },
  week: ds => { UI.week = addDays(UI.week, 7 * +ds.n); render(); },
  toggleTrain: () => { const d = UI.date, w = S.workouts[d]; S.workouts[d] = { ...(w || {}), done: !isTrain(d), manual: true }; save(); render(); toast(isTrain(d) ? 'Dzień treningowy – cel podniesiony' : 'Dzień wolny – cel obniżony'); },
  eat: (ds, el) => { setEaten(ds.d, ds.s, el.checked); save(); render(); },
  viewMeal: ds => { const it = (S.plan[ds.d] || {})[ds.s]; if (live(it)) viewRec(it.rid, it.serv, { d: ds.d, s: ds.s }); },
  viewRec: ds => viewRec(ds.id, +ds.serv || 1),
  delLog: ds => withUndo(() => { removeLog(ds.d, ds.id); return 'Usunięto wpis'; }),
  addFood, cheat: cheatDialog, logWorkout: workoutDialog, menuPicker,
  refit: () => { refitDay(UI.date); save(); render(); toast('Porcje dopasowane do dzisiejszego celu'); },
  clearStarter: () => { if (!confirm('Usunąć wszystkie startowe składniki i przepisy? (Twoje własne zostaną.)')) return; S.ingredients = S.ingredients.filter(i => !i.starter); S.recipes = S.recipes.filter(r => !r.starter); S.starter = false; S.plan = {}; S.menus = {}; save(); render(); },
  gen: () => withUndo(() => { const w = generate(UI.week); return w.length ? w[0] : 'Plan wygenerowany'; }),
  genFill: () => withUndo(() => { const w = generate(UI.week, { keep: true }); return w.length ? w[0] : 'Uzupełniono puste miejsca'; }),
  genDay: ds => withUndo(() => { generate(UI.week, { only: ds.d }); return 'Wylosowano ten dzień'; }),
  clearWeek: () => withUndo(() => { for (let i = 0; i < 7; i++) { const dp = S.plan[addDays(UI.week, i)]; if (dp) for (const s of SLOTS_ALL) if (dp[s] && !dp[s].eaten) delete dp[s]; } return 'Plan wyczyszczony'; }),
  editSlot: ds => editSlot(ds.d, ds.s),
  swapOpt: ds => { closeModal(); withUndo(() => { swapMeal(ds.d, ds.s, ds.rid, +ds.serv); if (UI.optSeen) delete UI.optSeen[ds.d + ds.s]; return 'Zmieniono posiłek'; }); },
  rotOpt: ds => { const k = ds.d + ds.s; UI.rot = UI.rot || {}; UI.optSeen = UI.optSeen || {}; const rot = UI.rot[k] || 0, seen = UI.optSeen[k] || []; UI.optSeen[k] = seen.concat(optionsFor(ds.d, ds.s, 3, rot, seen).map(x => x.rid)); UI.rot[k] = rot + 1; if ($('#modal').open) { const q = ds.d, w = ds.s; closeModal(); editSlot(q, w); } else render(); },
  applySwap: ds => withUndo(() => { const it = S.plan[ds.d][ds.s]; it.rid = ds.rid; it.serv = +ds.serv; return 'Zamieniono danie'; }),
  ftab: ds => { UI.foodsTab = ds.t; UI.q = ''; render(); },
  ftabFridge: () => { UI.foodsTab = 'fridge'; UI.view = 'foods'; render(); window.scrollTo(0, 0); },
  fridgeAdd, fridgeEdit: ds => fridgeEdit(ds.id), ideaPlan: ds => ideaPlan(ds.id),
  sfilter: ds => { UI.slotFilter = ds.k; render(); },
  editIng: ds => editIng(ds.id), editRec: ds => editRec(ds.id),
  trainDay: ds => { const a = S.profile.trainDays, i = +ds.i; S.profile.trainDays = a.includes(i) ? a.filter(x => x !== i) : [...a, i].sort(); save(); render(); },
  shopChk: (ds, el) => { (S.shopChecked[UI.week] = S.shopChecked[UI.week] || {})[ds.id] = el.checked; save(); render(); },
  genWeekHere: () => { UI.week = weekStart(UI.date); withUndo(() => { const w = generate(UI.week); return w.length ? w[0] : 'Plan wygenerowany – sprawdź listę zakupów'; }); },
  menuHere: () => { UI.week = weekStart(UI.date); menuPicker(); },
  checkAll: () => { const chk = S.shopChecked[UI.week] = S.shopChecked[UI.week] || {}; const rows = shopSorted(shopList(UI.week)); const all = rows.every(r => chk[r.i.id + '|' + r.trip]); rows.forEach(r => chk[r.i.id + '|' + r.trip] = !all); save(); render(); },
  toReminders: () => { if (!remindersText(UI.week)) return toast('Lista zakupów jest pusta'); if (!localStorage.getItem('fuel-rem-ready')) remindersSetup(); else launchReminders(); },
  copyList: async () => {
    const txt = shopText(UI.week);
    try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); toast('Skopiowano'); } } catch (e) { try { await navigator.clipboard.writeText(txt); toast('Skopiowano'); } catch (e2) { prompt('Skopiuj:', txt); } }
  },
  boughtToPantry: () => {
    const chk = S.shopChecked[UI.week] || {}; let n = 0;
    for (const r of shopSorted(shopList(UI.week))) { const key = r.i.id + '|' + r.trip; if (chk[key]) { r.i.pantry = (r.i.pantry || 0) + r.qty; n++; delete chk[key]; } }
    save(); render(); toast(n ? `${n} pozycji dodano do lodówki (zużyją się z planem)` : 'Najpierw zaznacz kupione rzeczy');
  },
  copyHook: async () => { try { await navigator.clipboard.writeText($('#hook').textContent); toast('Skopiowano adres'); } catch (e) { prompt('Skopiuj:', $('#hook').textContent); } },
  export: async () => {
    S.lastBackup = today(); save();
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), name = `fuel-kopia-${today()}.json`;
    try { const f = new File([blob], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Kopia Fuel' }); render(); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); render();
  },
  import: () => $('#bk').click(),
  saveBackup: async () => { await ACTIONS.export(); toast('Kopia zapisana – zawiera plan, zakupy i ustawienia'); },
  aiSend: () => { const t = $('#aiin'); const v = t && t.value.trim(); if (!v || UI.aiBusy) return; t.value = ''; aiSend(v); },
  aiSuggest: ds => { aiSend(UI.sugg[+ds.i]); },
  aiClear: () => { S.chat = []; save(); render(); },
  aiTest, openPc: () => { let v = (val('pc_url') || '').trim(); if (!v) return toast('Wpisz adres komputera'); if (!/^https?:\/\//.test(v)) v = 'http://' + v; try { localStorage.setItem('fuel-pc', v); } catch (e) { } location.href = v; },
  aiLogin: async () => { await fetch('/api/ai/login', { method: 'POST', body: '{}' }); toast('Okno logowania otwarte na komputerze – zaloguj się, potem kliknij „Sprawdź połączenie"'); },
  aiRecheck: async () => { UI.cfgLoaded = false; render(); try { await fetch('/api/ai/recheck', { method: 'POST', body: '{}' }); } catch (e) { } await loadCfg(); render(); toast((UI.cfg || {}).mode === 'none' ? 'Jeszcze niepołączony' : 'Połączono!'); },
  aiSaveKey: async () => { const k = val('ai_key').trim(); if (!k) return toast('Wklej klucz'); if (UI.local) localStorage.setItem('fuel-key', k); else await fetch('/api/ai/config', { method: 'PUT', body: JSON.stringify({ key: k }) }); await loadCfg(); render(); toast('Klucz zapisany'); },
  aiSaveCfg: async () => { const b = { model: val('ai_model') }; if (val('ai_key2').trim()) b.key = val('ai_key2').trim(); await fetch('/api/ai/config', { method: 'PUT', body: JSON.stringify(b) }); await loadCfg(); render(); toast('Zapisano'); },
};
async function loadCfg() {
  if (UI.local) { let k = ''; try { k = localStorage.getItem('fuel-key') || ''; } catch (e) { } UI.cfg = { local: true, hasKey: !!k, hint: k ? '…' + k.slice(-4) : '', model: 'claude-sonnet-5-5', mode: k ? 'api' : 'none' }; UI.cfgLoaded = true; return; }
  try { const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000); UI.cfg = await (await fetch('/api/ai/config', { signal: ctl.signal })).json(); clearTimeout(tm); UI.cfgLoaded = true; }
  catch (e) { UI.cfg = { error: e.name === 'AbortError' ? 'serwer nie odpowiada' : String(e.message || e) }; UI.cfgLoaded = true; }
}
async function aiTest() {   // step-by-step diagnosis so a failure always says WHY
  const steps = []; const show = () => modal('Test połączenia z Claude', `<div class="sm">${steps.map(s => `<div style="padding:4px 0">${s}</div>`).join('')}</div>`);
  show();
  await loadCfg(); const cfg = UI.cfg || {};
  if (cfg.error) { steps.push('✗ Serwer Fuel: ' + esc(cfg.error)); return show(); }
  steps.push(UI.local ? '✓ Wersja samodzielna (bez serwera komputera)' : '✓ Serwer Fuel odpowiada');
  if (!UI.local) {
    steps.push(cfg.cli && cfg.cli.found ? '✓ Claude Code znaleziony na komputerze' : '✗ Claude Code nie znaleziony na komputerze');
    if (cfg.mode !== 'api') steps.push(cfg.cli && cfg.cli.loggedIn ? '✓ Zalogowany na konto Claude' : '✗ Niezalogowany (kliknij „Zaloguj się do Claude")');
  }
  if (cfg.mode === 'none' || cfg.mode === 'checking') { steps.push('✗ Asystent nie jest połączony'); return show(); }
  steps.push('… wysyłam krótkie pytanie (do 25 s)'); show();
  const t0 = Date.now();
  try {
    let text = '';
    if (cfg.mode === 'cli') { const r = await fetch('/api/ai/cli', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Odpowiedz tylko słowem: ok' }) }); const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'błąd'); text = j.text; }
    else { const r = await callApi({ system: 'Odpowiadaj krótko.', messages: [{ role: 'user', content: 'Odpowiedz tylko słowem: ok' }], max_tokens: 20 }); const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || 'błąd'); text = (j.content || []).map(b => b.text || '').join(''); }
    steps.pop(); steps.push(`✓ Claude odpowiedział „${esc(String(text).trim().slice(0, 40))}" w ${Math.round((Date.now() - t0) / 1000)} s`);
  } catch (e) { steps.pop(); steps.push('✗ ' + esc(e.message || String(e))); }
  show();
}

document.addEventListener('click', e => {
  const mb = e.target.closest('[data-mbtn]'); if (mb) { const b = modal.btns[+mb.dataset.mbtn]; if (b && b.fn) b.fn(); return; }
  const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'DIALOG') return;
  if (t.type === 'checkbox') return;
  ACTIONS[t.dataset.act]?.(t.dataset, t, e);
});
document.addEventListener('keydown', e => { if (e.target.id === 'aiin' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ACTIONS.aiSend(); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.type === 'checkbox' && t.dataset.act) return ACTIONS[t.dataset.act](t.dataset, t, e);
  if (t.dataset.bind) {
    const path = t.dataset.bind.split('.'); let o = S; for (const k of path.slice(0, -1)) o = o[k];
    const k = path[path.length - 1];
    let v = t.value;
    if (t.type === 'number') v = num(v); else if (v === 'true') v = true; else if (v === 'false') v = false; else if (v !== '' && !isNaN(+v)) v = +v;
    o[k] = v; save(); render(); return;
  }
  if (t.id === 'csv' && t.files[0]) t.files[0].text().then(txt => { const r = importWorkouts(txt); if (r.err) toast(r.err); else { save(); render(); toast(`Zaimportowano ${r.n} dni treningowych`); } });
  if (t.id === 'bk' && t.files[0]) t.files[0].text().then(txt => {
    let d; try { d = JSON.parse(txt); if (!d.profile) throw 0; } catch (e) { return toast('To nie jest poprawna kopia'); }
    const when = d.lastBackup || '?', days = Object.keys(d.plan || {}).length;
    modal('Wczytać kopię?', `<p class="sm" style="margin-top:0">Kopia z ${esc(when)} · plan na ${days} dni, ${Object.keys(d.log || {}).length} dni z wpisami.</p>
      <div class="sm"><b>Scal</b> – dołącza z kopii plan, zakupy, wpisy i ustawienia do tego, co masz tutaj (przy tym samym polu wygrywa kopia). Najbezpieczniejsze.</div>
      <div class="sm" style="margin-top:8px"><b>Zastąp</b> – wszystko tutaj zostanie zamienione na zawartość kopii.</div>`,
      [{ label: 'Zastąp wszystko', cls: 'danger', fn: () => withUndo(() => { d.rev = S.rev; const chat = S.chat; S = d; S.chat = S.chat || chat; migrate(); closeModal(); return 'Kopia wczytana (zastąpiono)'; }) },
      { label: 'Scal', cls: 'pri', fn: () => withUndo(() => { const keep = { chat: S.chat, rev: S.rev }; S = Object.assign({}, merge3({}, syncView(d), syncView(S)), keep); migrate(); closeModal(); return 'Kopia scalona z tym, co tu masz'; }) }]);
    t.value = '';
  });
});
document.addEventListener('input', e => { if (e.target.id === 'q' && e.target.hasAttribute('data-bind-q')) { UI.q = e.target.value; render(); } });
document.addEventListener('visibilitychange', () => syncFromServer());

function withUndo(fn) {
  const snap = snapshot(); let msg;
  try { msg = fn(); } catch (e) { restore(snap); toast('Coś poszło nie tak: ' + e.message); return; }
  save(); render();
  UI.undoFn = () => { restore(snap); save(); render(); toast('Cofnięto'); };
  toast(msg || 'Gotowe', true);
}
async function syncFromServer() {   // pick up changes made on another device (phone <-> PC) or by the workout webhook
  if (UI.local || document.visibilityState !== 'visible' || UI.dirty || saving || $('#modal').open) return;
  try {
    const { rev } = await (await fetch('/api/rev')).json();
    if (rev === S.rev) return;
    const d = await (await fetch('/api/data')).json();
    if (d.profile && !UI.dirty && !$('#modal').open) { S = d; migrate(); render(); }
  } catch (e) { }
}
setInterval(syncFromServer, 20000);
document.addEventListener('keydown', e => {   // desktop: ← → move between days / weeks
  if (e.target.matches('input,textarea,select') || $('#modal').open || e.metaKey || e.ctrlKey || e.altKey) return;
  const n = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0; if (!n) return;
  if (UI.view === 'today') ACTIONS.day({ n }); else if (UI.view === 'plan' || UI.view === 'shop') ACTIONS.week({ n });
});
let tch = null;   // phone: swipe left/right on Today = next/previous day
document.addEventListener('touchstart', e => { const t = e.touches[0]; tch = { x: t.clientX, y: t.clientY, t: Date.now() }; }, { passive: true });
document.addEventListener('touchend', e => {
  if (!tch || UI.view !== 'today' || $('#modal').open || e.target.closest('.orow,input,select,textarea,.chat')) return;
  const t = e.changedTouches[0], dx = t.clientX - tch.x, dy = t.clientY - tch.y;
  if (Math.abs(dx) > 80 && Math.abs(dy) < 40 && Date.now() - tch.t < 450) ACTIONS.day({ n: dx < 0 ? 1 : -1 });
  tch = null;
}, { passive: true });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); UI.installEvt = e; if (UI.view === 'today') render(); });

/* ============ boot ============ */
$('#nav').innerHTML = `<div class="brand">Fuel</div>` + NAV.map(([k, l]) => `<button data-act="nav" data-v="${k}">${svg(k)}<span>${l}</span></button>`).join('');
function handleQuery() { // https://…/?workout=Push&sets=18  (from a phone shortcut) logs a workout
  const q = new URLSearchParams(location.search); if (!q.has('workout')) return;
  logWorkout(q.get('date') || today(), { name: q.get('workout') || 'Trening', sets: +q.get('sets') || undefined, min: +q.get('minutes') || undefined, source: 'link' });
  history.replaceState(null, '', location.pathname); save(); toast('Trening zapisany');
}
load().then(() => { UI.cfg = UI.cfg || {}; handleQuery(); render(); initSync(); if (!S.profileSet) setTimeout(onboarding, 350); if (!S.rev && !S.setupDone) { S.setupDone = true; save(); } loadCfg().then(() => { if (UI.view === 'ai' || UI.view === 'me') render(); }); })
  .catch(e => { $('#app').innerHTML = '<div class="card">Coś poszło nie tak przy starcie: ' + esc(e && e.message) + '</div>'; });
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });

Object.assign(ACTIONS, SYNC_ACTIONS);
ACTIONS.basePicker = basePicker;

try { if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { UI.persisted = p; }); } catch (e) { }
