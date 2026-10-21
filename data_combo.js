'use strict';
/* ============ Meals assembled from base products ("półprodukty") ============
   protein + carb + vegetable (+ optional topping) = a dish. A handful of products makes dozens of different dishes,
   so one small shopping basket can feed the whole week. Dishes are generated on demand, never stored as recipes
   (the plan only keeps an id like  c:dinner:kip:rijst:broccoli:feta ); "Zapisz jako przepis" copies one into your recipes. */
const COMBO = {
  p: {   // amt = grams (or pieces) for a ~650 kcal portion; `fresh` = raw & perishable
    kip:  { n: 'kurczak', amt: 170, how: 'Kurczaka pokrój w kawałki, dopraw (sól, pieprz, papryka) i smaż 8–10 minut, aż nie będzie różowy w środku – albo piecz w 200°C ok. 20 minut.', prep: 'Upiecz kurczaka na 2–3 dni' },
    kipdij: { n: 'udka kurczaka', amt: 180, how: 'Udka (bez kości) dopraw i piecz w 200°C 25 minut albo smaż 10 minut.', prep: 'Upiecz udka na 2–3 dni' },
    kalkoen: { n: 'indyk', amt: 170, how: 'Indyka w kostkach dopraw i smaż 6–8 minut.', prep: '' },
    gehakt: { n: 'wołowina', amt: 130, how: 'Mięso smaż na patelni 6–7 minut, rozdrabniając; dopraw solą, pieprzem i papryką.', prep: '' },
    kipgehakt: { n: 'mielony kurczak', amt: 170, how: 'Mięso smaż na patelni 6–7 minut, rozdrabniając; dopraw.', prep: '' },
    kalkoengehakt: { n: 'mielony indyk', amt: 170, how: 'Mięso smaż na patelni 6–7 minut, rozdrabniając; dopraw.', prep: '' },
    zalm: { n: 'łosoś', amt: 140, how: 'Łososia dopraw (sól, cytryna) i piecz w 200°C 12–15 minut albo smaż 4 minuty z każdej strony.', prep: '' },
    witvis: { n: 'dorsz', amt: 200, how: 'Rybę dopraw i piecz w 200°C 12–15 minut.', prep: '' },
    garnalen: { n: 'krewetki', amt: 180, how: 'Krewetki smaż 3 minuty z czosnkiem, aż będą różowe.', prep: '' },
    tofu: { n: 'tofu', amt: 200, how: 'Tofu osusz papierowym ręcznikiem, pokrój w kostkę i smaż 8 minut do zrumienienia.', prep: '' },
    tempeh: { n: 'tempeh', amt: 150, how: 'Tempeh w kostkach smaż 5–7 minut na oliwie.', prep: '' },
    eieren: { n: 'jajka', amt: 4, how: 'Jajka usmaż na patelni 3 minuty albo ugotuj na twardo (9–10 minut).', prep: 'Ugotuj jajka na twardo na kilka dni' },
    linzen: { n: 'soczewica', amt: 80, how: 'Soczewicę ugotuj do miękkości (czerwona ok. 15 minut, brązowa ok. 25) i odcedź.', prep: 'Ugotuj soczewicę na 2–3 dni' },
    kikker: { n: 'ciecierzyca', amt: 200, how: 'Ciecierzycę odsącz, przepłucz i podgrzej 5 minut na patelni z przyprawami.', prep: '' },
    bonen: { n: 'czarna fasola', amt: 180, how: 'Fasolę odsącz, przepłucz i podgrzej 5 minut z przyprawą (kumin, papryka).', prep: '' },
    witteb: { n: 'biała fasola', amt: 180, how: 'Fasolę odsącz, przepłucz i podgrzej 5 minut z ziołami.', prep: '' },
    tonijn: { n: 'tuńczyk', amt: 150, how: 'Tuńczyka odsącz i rozdrobnij widelcem.', prep: '' },
  },
  c: {
    rijst: { n: 'ryż', amt: 85, how: 'Ryż przepłucz i gotuj wg opakowania, ok. 25 minut.', prep: 'Ugotuj ryż na 2–3 dni' },
    pasta: { n: 'makaron', amt: 90, how: 'Makaron gotuj ok. 10 minut (al dente) i odcedź.', prep: '' },
    aardappel: { n: 'ziemniaki', amt: 280, how: 'Ziemniaki pokrój i gotuj 15–20 minut albo piecz z oliwą w 200°C ok. 30 minut.', prep: '' },
    zoete: { n: 'bataty', amt: 250, how: 'Batata pokrój w kostkę i piecz w 200°C ok. 25 minut.', prep: 'Upiecz batata na 2–3 dni' },
    quinoa: { n: 'quinoa', amt: 70, how: 'Quinoa przepłucz i gotuj 15 minut, odstaw pod przykryciem na 5 minut.', prep: 'Ugotuj quinoa na 2–3 dni' },
    couscous: { n: 'kuskus', amt: 80, how: 'Kuskus zalej wrzątkiem (tyle samo wody), przykryj na 5 minut i rozmieszaj widelcem.', prep: '' },
    boekweit: { n: 'kasza gryczana', amt: 75, how: 'Kaszę gotuj 15 minut w dwukrotnej ilości wody.', prep: 'Ugotuj kaszę na 2–3 dni' },
    parelgort: { n: 'kasza jęczmienna', amt: 80, how: 'Kaszę gotuj 25–30 minut.', prep: 'Ugotuj kaszę na 2–3 dni' },
    brood: { n: 'chleb', amt: 100, how: 'Chleb pokrój w kromki.', prep: '', lunchOnly: true },
  },
  v: {
    broccoli: { n: 'brokuły', amt: 170, how: 'Brokuły podziel na różyczki i gotuj na parze 5 minut.' },
    spinazie: { n: 'szpinak', amt: 120, how: 'Szpinak wrzuć na patelnię na 1–2 minuty, aż zwiędnie.' },
    paprika: { n: 'papryka', amt: 130, how: 'Paprykę pokrój i podsmaż 5 minut.' },
    courgette: { n: 'cukinia', amt: 200, how: 'Cukinię pokrój i podsmaż 5 minut.' },
    bloemkool: { n: 'kalafior', amt: 220, how: 'Kalafior podziel na różyczki i piecz w 200°C 20 minut albo gotuj 8 minut.' },
    wortel: { n: 'marchew', amt: 160, how: 'Marchew pokrój i gotuj 8 minut albo piecz razem z resztą.' },
    tomaat: { n: 'pomidory', amt: 160, how: 'Pomidory pokrój (na surowo albo krótko podsmaż).', raw: true },
    champ: { n: 'pieczarki', amt: 150, how: 'Pieczarki pokrój i smaż 5 minut.' },
    groentemix: { n: 'warzywa z patelni', amt: 200, how: 'Mrożoną mieszankę warzyw smaż 6–8 minut.' },
    spruit: { n: 'brukselka', amt: 180, how: 'Brukselkę przekrój i piecz w 200°C 20–25 minut.' },
    aubergine: { n: 'bakłażan', amt: 200, how: 'Bakłażana pokrój w kostkę i piecz w 200°C 20 minut.' },
    boerenkool: { n: 'jarmuż', amt: 150, how: 'Jarmuż (mrożony) gotuj 8 minut.' },
    erwten: { n: 'groszek', amt: 120, how: 'Groszek zalej wrzątkiem lub gotuj 3 minuty.' },
    butternut: { n: 'dynia', amt: 220, how: 'Dynię pokrój w kostkę i piecz w 200°C 20 minut.' },
    prei: { n: 'por', amt: 150, how: 'Por pokrój w półplasterki i podsmaż 6 minut.' },
    komkommer: { n: 'ogórek', amt: 120, how: 'Ogórka pokrój (na surowo).', raw: true },
    rucola: { n: 'rukola', amt: 50, how: 'Rukolę dodaj na surowo przed jedzeniem.', raw: true },
  },
  x: {   // optional topping / sauce
    feta: { n: 'fetą', amt: 30 }, kaas: { n: 'żółtym serem', amt: 25 }, pompoen: { n: 'pestkami dyni', amt: 15 }, amandel: { n: 'migdałami', amt: 15 },
    avocado: { n: 'awokado', amt: 0.5 }, griek: { n: 'jogurtem greckim', amt: 60 }, tahin: { n: 'tahini', amt: 12 }, mozz: { n: 'mozzarellą', amt: 40 },
  },
};
/* fast, handed-over-to-the-bag choices for the university lunch (no cooking at 7 a.m.) */
const COMBO_LUNCH = { p: ['tonijn', 'eieren', 'kikker', 'witteb', 'kip', 'tofu'], c: ['brood', 'couscous', 'quinoa', 'rijst', 'pasta'], v: ['komkommer', 'tomaat', 'paprika', 'rucola', 'wortel'] };
const COMBO_STAPLES = new Set(['olijf', 'ui', 'knoflook']);   // always allowed, never "an extra product"
const comboCache = new Map();
const comboNice = (a, u) => u === 'pcs' ? Math.max(.5, Math.round(a * 2) / 2) : (a < 20 ? Math.round(a) : Math.round(a / 5) * 5);
const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
const comboId = (slot, p, c, v, x) => `c:${slot}:${p}:${c}:${v}:${x || '-'}`;
const isCombo = id => typeof id === 'string' && id.charCodeAt(0) === 99 && id.charCodeAt(1) === 58;

function comboRec(id) {
  if (comboCache.has(id)) return comboCache.get(id);
  const [, slot, p, c, v, x] = id.split(':'), P = COMBO.p[p], C = COMBO.c[c], V = COMBO.v[v], X = x && x !== '-' ? COMBO.x[x] : null;
  let r = null;
  if (P && C && V) {
    const k = slot === 'dinner' ? 1.6 : 1, unitOf = key => (typeof ing === 'function' && ing(key)) ? ing(key).unit : 'g';
    const items = [[p, P.amt], [c, C.amt], [v, V.amt]].map(([key, a]) => ({ ing: key, amt: comboNice(a * k, unitOf(key)) }));
    if (X) items.push({ ing: x, amt: comboNice(X.amt * k, unitOf(x)) });
    items.push({ ing: 'olijf', amt: slot === 'dinner' ? 15 : 5 });
    const steps = [C.how, P.how, V.how].filter(Boolean);
    steps.push('Wszystko połącz na talerzu' + (X ? ' i dodaj ' + X.n : '') + '. Dopraw solą, pieprzem i oliwą.');
    r = { id, name: `${capFirst(P.n)}, ${C.n} i ${V.n}${X ? ' z ' + X.n : ''}`, slots: [slot], items, how: steps.join('\n'), prep: P.prep || C.prep || '', tags: ['składane', ...(slot === 'lunch' ? ['na uczelnię', 'szybkie'] : [])], combo: true, big: slot === 'dinner' ? 1 : 0, parts: { p, c, v, x: X ? x : null } };
  }
  comboCache.set(id, r);
  return r;
}
/* all valid ingredient ids a combo may use, filtered by what exists / is clean / is in the chosen base set */
function comboParts(slot, baseSet) {
  const okIng = key => { const i = ing(key); return i && (!S.profile.clean || (i.proc || 0) < 2) && (!baseSet || baseSet.has(key)); };
  const ids = role => Object.keys(COMBO[role]).filter(k => (slot !== 'lunch' || !COMBO_LUNCH[role] || COMBO_LUNCH[role].includes(k)) && (slot === 'lunch' || !COMBO[role][k].lunchOnly) && okIng(k));
  return { p: ids('p'), c: ids('c'), v: ids('v'), x: Object.keys(COMBO.x).filter(okIng) };
}
/* a stable (seeded) sample of combos for a slot – at most `max` of them */
function comboPool(slot, seed, baseSet, max = 220) {
  const parts = comboParts(slot, baseSet); if (!parts.p.length || !parts.c.length || !parts.v.length) return [];
  const all = [];
  for (const p of parts.p) for (const c of parts.c) for (const v of parts.v) {
    const h = hashStr(p + c + v + seed), x = parts.x.length && h % 3 ? parts.x[h % parts.x.length] : null;
    all.push({ id: comboId(slot, p, c, v, x), h });
  }
  all.sort((a, b) => a.h - b.h);
  return all.slice(0, max).map(o => comboRec(o.id)).filter(Boolean);
}
const comboKey = r => r.parts ? r.parts.p : (r.items[0] && r.items[0].ing) || r.id;
