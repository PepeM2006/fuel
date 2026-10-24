'use strict';
/* Starter data: whole-food, no added sugar, typical Dutch supermarket (Lidl / AH / Jumbo) products.
   Macros are typical values per 100 g / 100 ml (or per piece for 'pcs') – check them against your packaging.
   proc: 0 = unprocessed, 1 = lightly processed (bread, canned, cheese), 2 = highly processed / added sugar / supplement. */
const AISLES = ['Warzywa i owoce', 'Pieczywo', 'Mięso i ryby', 'Nabiał i jajka', 'Produkty suche', 'Mrożonki', 'Napoje', 'Suplementy', 'Gotowe', 'Inne'];

const SEED_VERSION = 7;

function seedData() {
  const A = AISLES;
  // key, PL name, NL name (to find in the shop), unit, kcal, p, c, f, aisle, pack size, pack price (EUR), proc
  const rows = [
    ['kip', 'Pierś z kurczaka (surowa)', 'Kipfilet', 'g', 110, 23, 0, 1.5, A[2], 500, 5.5, 0],
    ['kipdij', 'Filet z udka kurczaka', 'Kipdijfilet', 'g', 121, 19, 0, 5, A[2], 500, 5.0, 0],
    ['gehakt', 'Mielona wołowina 10% tł.', 'Rundergehakt', 'g', 175, 20, 0, 10, A[2], 500, 5.5, 0],
    ['kalkoen', 'Pierś z indyka', 'Kalkoenfilet', 'g', 105, 24, 0, 1, A[2], 400, 5.5, 0],
    ['zalm', 'Łosoś (filet)', 'Zalmfilet', 'g', 200, 20, 0, 13, A[2], 230, 6.0, 0],
    ['tonijn', 'Tuńczyk w wodzie (puszka)', 'Tonijn op water', 'g', 110, 25, 0, 1, A[2], 110, 1.6, 1],
    ['eieren', 'Jajko', 'Eieren', 'pcs', 72, 6.3, 0.4, 5, A[3], 10, 3.2, 0],
    ['kwark', 'Twaróg chudy (kwark)', 'Magere kwark', 'g', 57, 10, 4, 0.2, A[3], 500, 1.5, 0],
    ['skyr', 'Skyr naturalny', 'Skyr naturel', 'g', 63, 11, 4, 0.2, A[3], 450, 2.3, 0],
    ['hutten', 'Serek wiejski', 'Hüttenkäse', 'g', 98, 11, 3.4, 4.3, A[3], 200, 1.7, 0],
    ['melk', 'Mleko 3,5%', 'Volle melk', 'ml', 64, 3.4, 4.8, 3.6, A[3], 1000, 1.3, 0],
    ['kaas', 'Ser żółty młody', 'Jonge kaas (stuk)', 'g', 356, 25, 2, 28, A[3], 400, 4.5, 1],
    ['feta', 'Feta', 'Feta', 'g', 264, 14, 4, 21, A[3], 200, 2.0, 1],
    ['tofu', 'Tofu naturalne', 'Tofu naturel', 'g', 120, 13, 2, 7, A[3], 400, 2.5, 1],
    ['linzen', 'Soczewica (sucha)', 'Linzen (droog)', 'g', 350, 25, 50, 1.5, A[4], 500, 2.0, 0],
    ['kikker', 'Ciecierzyca z puszki (odsączona)', 'Kikkererwten (blik)', 'g', 120, 7, 17, 2.5, A[4], 240, 0.9, 1],
    ['bonen', 'Czarna fasola z puszki (odsączona)', 'Zwarte bonen (blik)', 'g', 91, 6, 14, 0.5, A[4], 240, 1.0, 1],
    ['haver', 'Płatki owsiane', 'Havermout', 'g', 372, 13.5, 59, 7, A[4], 500, 1.3, 0],
    ['rijst', 'Ryż brązowy (suchy)', 'Zilvervliesrijst', 'g', 350, 7.5, 72, 2.7, A[4], 1000, 2.8, 0],
    ['pasta', 'Makaron pełnoziarnisty (suchy)', 'Volkoren pasta', 'g', 350, 13, 66, 2.5, A[4], 500, 1.6, 0],
    ['quinoa', 'Quinoa (sucha)', 'Quinoa', 'g', 370, 14, 64, 6, A[4], 400, 3.5, 0],
    ['couscous', 'Kuskus pełnoziarnisty (suchy)', 'Volkoren couscous', 'g', 350, 12, 68, 2, A[4], 500, 2.2, 1],
    ['aardappel', 'Ziemniaki', 'Aardappelen', 'g', 77, 2, 17, 0.1, A[0], 2500, 3.0, 0],
    ['zoete', 'Batat', 'Zoete aardappel', 'g', 86, 1.6, 20, 0.1, A[0], 1000, 2.5, 0],
    ['brood', 'Chleb 100% pełnoziarnisty (bez cukru)', 'Volkorenbrood', 'g', 240, 9.5, 41, 3, A[1], 800, 2.2, 1],
    ['broccoli', 'Brokuły', 'Broccoli', 'g', 34, 2.8, 7, 0.4, A[0], 500, 1.9, 0],
    ['spinazie', 'Szpinak świeży', 'Spinazie', 'g', 23, 2.9, 3.6, 0.4, A[0], 300, 1.7, 0],
    ['spinaziedk', 'Szpinak mrożony', 'Spinazie (diepvries)', 'g', 25, 3, 1.5, 0.5, A[5], 450, 1.3, 0],
    ['paprika', 'Papryka', 'Paprika', 'g', 31, 1, 6, 0.3, A[0], 450, 2.5, 0],
    ['tomaat', 'Pomidory', 'Tomaten', 'g', 18, 0.9, 3.9, 0.2, A[0], 500, 1.9, 0],
    ['tomatenblik', 'Pomidory z puszki (bez dodatków)', 'Gepelde tomaten (blik)', 'g', 20, 1, 3.5, 0.1, A[4], 400, 0.7, 1],
    ['ui', 'Cebula', 'Uien', 'g', 40, 1.1, 9, 0.1, A[0], 1000, 1.3, 0],
    ['wortel', 'Marchew', 'Wortelen', 'g', 41, 0.9, 10, 0.2, A[0], 1000, 1.2, 0],
    ['courgette', 'Cukinia', 'Courgette', 'g', 17, 1.2, 3.1, 0.3, A[0], 500, 1.6, 0],
    ['champ', 'Pieczarki', 'Champignons', 'g', 22, 3.1, 3.3, 0.3, A[0], 400, 1.7, 0],
    ['komkommer', 'Ogórek', 'Komkommer', 'g', 15, 0.7, 3.6, 0.1, A[0], 400, 0.9, 0],
    ['bloemkool', 'Kalafior', 'Bloemkool', 'g', 25, 1.9, 5, 0.3, A[0], 600, 2.0, 0],
    ['groentemix', 'Mrożona mieszanka warzyw na patelnię', 'Roerbakgroenten (diepvries)', 'g', 40, 2.5, 6, 0.5, A[5], 1000, 2.5, 0],
    ['rucola', 'Rukola', 'Rucola', 'g', 25, 2.6, 3.7, 0.7, A[0], 100, 1.6, 0],
    ['banaan', 'Banan', 'Bananen', 'pcs', 105, 1.3, 27, 0.4, A[0], 1, 0.28, 0],
    ['appel', 'Jabłko', 'Appels', 'pcs', 94, 0.5, 25, 0.3, A[0], 1, 0.4, 0],
    ['avocado', 'Awokado', 'Avocado', 'pcs', 240, 3, 13, 22, A[0], 1, 1.0, 0],
    ['rood', 'Owoce leśne mrożone (bez cukru)', 'Rood fruit (diepvries)', 'g', 50, 1, 10, 0.3, A[5], 450, 2.5, 0],
    ['dadels', 'Daktyle', 'Dadels', 'g', 280, 2.5, 65, 0.4, A[4], 250, 2.6, 0],
    ['pinda', 'Masło orzechowe 100% orzechów', 'Pindakaas 100% pinda', 'g', 600, 25, 12, 50, A[4], 350, 2.8, 1],
    ['amandel', 'Migdały', 'Amandelen', 'g', 579, 21, 22, 50, A[4], 200, 2.8, 0],
    ['walnoot', 'Orzechy włoskie', 'Walnoten', 'g', 654, 15, 14, 65, A[4], 200, 3.2, 0],
    ['pompoen', 'Pestki dyni', 'Pompoenpitten', 'g', 559, 30, 11, 49, A[4], 200, 2.6, 0],
    ['chia', 'Nasiona chia', 'Chiazaad', 'g', 486, 17, 42, 31, A[4], 200, 3.0, 0],
    ['olijf', 'Oliwa z oliwek', 'Olijfolie', 'ml', 820, 0, 0, 91, A[4], 500, 4.5, 1],
    ['cacao', 'Kakao ciemne (niesłodzone)', 'Cacaopoeder (ongezoet)', 'g', 380, 20, 12, 22, A[4], 250, 3.0, 1],
    ['whey', 'Odżywka białkowa serwatkowa', 'Whey-eiwit', 'g', 400, 78, 6, 6, A[7], 900, 25, 2],
  ];
  const extra = seedExtras(A);
  rows.push(...extra.rows);
  const extra2 = seedExtras2(A);
  rows.push(...extra2.rows);
  const extra3 = seedExtras3(A);
  rows.push(...extra3.rows);
  const ingredients = rows.map(([key, name, nl, unit, kcal, p, c, f, aisle, pack, price, proc]) =>
    ({ id: key, name, nl, unit, kcal, p, c, f, aisle, pack, price, proc, pantry: 0, starter: true }));
  const has = new Set(ingredients.map(i => i.id));

  // name, slots, tags, how, prep, items [[key, amount]]
  const R = (name, slots, tags, how, prep, items) => {  // tags include 'kupne' for ready-made shop food
    items.forEach(([k]) => { if (!has.has(k)) throw new Error('seed: unknown ingredient ' + k); });
    return { id: 'r_' + name.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/g, '-').slice(0, 30), name, slots, tags, how, prep, starter: true, items: items.map(([ing, amt]) => ({ ing, amt })) };
  };
  const recipes = [
    // --- Breakfast: shakes first (quick, take-away in a bottle), then a few non-shake options
    R('Shake: banan, owsianka, masło orzechowe', ['breakfast'], ['shake', 'do zabrania'], 'Wszystko do blendera na 40 s. Wlej do bidonu i zabierz.', '', [['melk', 300], ['haver', 50], ['banaan', 1], ['pinda', 20], ['kwark', 150]]),
    R('Shake: jagodowy z twarogiem', ['breakfast'], ['shake', 'do zabrania'], 'Mrożone owoce nie muszą się rozmrażać – blender poradzi.', '', [['kwark', 250], ['melk', 250], ['rood', 150], ['haver', 50], ['amandel', 20]]),
    R('Shake: czekoladowo-orzechowy', ['breakfast'], ['shake', 'do zabrania'], 'Kakao + banan dają słodycz bez cukru.', '', [['melk', 300], ['banaan', 1], ['cacao', 10], ['pinda', 25], ['haver', 50], ['kwark', 150]]),
    R('Shake: awokado i szpinak', ['breakfast'], ['shake', 'do zabrania'], 'Szpinaku nie czuć, a daje witaminy i błonnik.', '', [['melk', 300], ['avocado', 0.5], ['banaan', 1], ['spinazie', 40], ['haver', 50], ['kwark', 200]]),
    R('Shake: skyr, jabłko i orzechy', ['breakfast'], ['shake', 'do zabrania'], 'Dodaj szczyptę cynamonu.', '', [['skyr', 250], ['melk', 250], ['appel', 1], ['haver', 50], ['walnoot', 20]]),
    R('Shake: daktyle i pestki dyni', ['breakfast'], ['shake', 'do zabrania'], 'Daktyle namocz 5 min w mleku, jeśli blender słaby.', '', [['melk', 300], ['kwark', 200], ['dadels', 25], ['haver', 50], ['pompoen', 15], ['banaan', 1]]),
    R('Shake białkowy z odżywką', ['breakfast'], ['shake', 'do zabrania', 'odżywka'], 'Klasyk – wyłączony w trybie „czysto".', '', [['whey', 30], ['melk', 400], ['banaan', 1], ['haver', 50], ['pinda', 15]]),
    R('Overnight oats z twarogiem', ['breakfast'], ['bez gotowania', 'do zabrania'], 'Wymieszaj w słoiku, do lodówki na noc. Rano zabierz ze sobą.', 'Wieczorem przygotuj słoik owsianki', [['haver', 70], ['kwark', 200], ['melk', 150], ['chia', 10], ['appel', 1], ['walnoot', 15]]),
    R('Jajecznica z awokado na chlebie', ['breakfast'], ['szybkie'], 'Jajka na patelnię 3 min, chleb, plasterki awokado.', '', [['eieren', 4], ['brood', 90], ['avocado', 0.5], ['tomaat', 80], ['olijf', 5]]),
    R('Owsianka z bananem i orzechami', ['breakfast'], ['szybkie'], 'Płatki z mlekiem 3 min na kuchence lub 2 min w mikrofali.', '', [['haver', 80], ['melk', 300], ['banaan', 1], ['walnoot', 25], ['chia', 10]]),
    // --- Lunch / dinner (cook once, eat 2-3 days)
    R('Kurczak, ryż i brokuły', ['lunch', 'dinner'], ['meal prep', 'wysokobiałkowe'], 'Ryż w garnku, kurczak na patelni/w piekarniku, brokuły 5 min na parze.', 'Ugotuj ryż i upiecz kurczaka na 2–3 dni', [['kip', 180], ['rijst', 90], ['broccoli', 150], ['olijf', 10]]),
    R('Kurczak, batat i szpinak', ['lunch', 'dinner'], ['meal prep'], 'Batat w kostkach do piekarnika 25 min, kurczak obok, szpinak na koniec.', 'Upiecz batat i kurczaka naraz', [['kip', 180], ['zoete', 250], ['spinazie', 100], ['olijf', 10]]),
    R('Tuńczyk, makaron i feta', ['lunch', 'dinner'], ['na zimno', 'szybkie', 'do zabrania'], 'Makaron ugotuj, ostudź, wymieszaj z resztą. Świetny na zimno.', '', [['tonijn', 160], ['pasta', 100], ['tomaat', 150], ['komkommer', 100], ['olijf', 10], ['feta', 40]]),
    R('Zupa z soczewicy z chlebem', ['lunch', 'dinner'], ['meal prep', 'wegetariańskie', 'tanie'], 'Wszystko do garnka na 25 min, zblenduj jak lubisz. Zamraża się.', 'Zrób duży garnek na kilka dni', [['linzen', 90], ['wortel', 100], ['ui', 50], ['tomatenblik', 200], ['olijf', 10], ['brood', 80]]),
    R('Ciecierzyca, quinoa i feta', ['lunch', 'dinner'], ['na zimno', 'wegetariańskie', 'do zabrania'], 'Quinoa ugotuj, resztę pokrój i wymieszaj. Dobra na zimno.', 'Ugotuj quinoa na 2–3 dni', [['kikker', 200], ['quinoa', 70], ['paprika', 100], ['komkommer', 100], ['feta', 40], ['olijf', 10]]),
    R('Indyk, kuskus i warzywa', ['lunch', 'dinner'], ['meal prep', 'szybkie'], 'Indyk i warzywa na patelnię 10 min, kuskus zalej wrzątkiem.', '', [['kalkoen', 170], ['couscous', 90], ['courgette', 150], ['paprika', 100], ['olijf', 10]]),
    R('Chili con carne z ryżem', ['lunch', 'dinner'], ['meal prep', 'wysokobiałkowe'], 'Mięso podsmaż, dodaj resztę, gotuj 20 min. Lepsze następnego dnia.', 'Ugotuj duży garnek chili', [['gehakt', 130], ['bonen', 150], ['rijst', 80], ['tomatenblik', 200], ['paprika', 100], ['ui', 50]]),
    R('Tofu stir-fry z ryżem', ['lunch', 'dinner'], ['wegetariańskie', 'szybkie'], 'Tofu na patelnię do zrumienienia, mrożonka, 8 min, na końcu masło orzechowe jako sos.', '', [['tofu', 200], ['rijst', 90], ['groentemix', 200], ['olijf', 10], ['pinda', 20]]),
    R('Łosoś, ziemniaki i brokuły', ['lunch', 'dinner'], ['szybkie', 'omega-3'], 'Wszystko do piekarnika/na parze. 20 min.', '', [['zalm', 150], ['aardappel', 300], ['broccoli', 150], ['olijf', 8]]),
    R('Udka z piekarnika, ziemniaki i marchew', ['lunch', 'dinner'], ['meal prep', 'tanie'], 'Wszystko na jednej blasze, 200°C 35 min.', 'Jedna blacha na 2–3 dni', [['kipdij', 200], ['aardappel', 300], ['wortel', 150], ['olijf', 10]]),
    R('Makaron bolognese pełnoziarnisty', ['lunch', 'dinner'], ['meal prep', 'tanie'], 'Sos z mięsa i pomidorów 20 min, makaron osobno.', 'Zrób duży garnek sosu', [['pasta', 100], ['gehakt', 130], ['tomatenblik', 250], ['ui', 40], ['olijf', 5]]),
    R('Frittata z warzywami i chlebem', ['lunch', 'dinner'], ['szybkie', 'wegetariańskie'], 'Jajka z warzywami na patelni pod przykryciem 10 min.', '', [['eieren', 4], ['champ', 100], ['spinazie', 80], ['feta', 30], ['brood', 80], ['olijf', 5]]),
    R('Szakszuka z chlebem', ['lunch', 'dinner'], ['szybkie', 'wegetariańskie', 'tanie'], 'Sos z pomidorów i papryki, wbij jajka, przykryj 6 min.', '', [['eieren', 3], ['tomatenblik', 300], ['paprika', 100], ['ui', 50], ['brood', 80], ['feta', 30]]),
    R('Kurczak, quinoa i awokado', ['lunch', 'dinner'], ['na zimno', 'do zabrania'], 'Quinoa i kurczak z wyprzedzeniem; awokado pokrój tuż przed jedzeniem.', 'Ugotuj quinoa i kurczaka', [['kip', 160], ['quinoa', 80], ['avocado', 0.5], ['tomaat', 100], ['olijf', 5]]),
    R('Łosoś, quinoa i szpinak', ['lunch', 'dinner'], ['szybkie', 'omega-3'], 'Łosoś na patelni 8 min, szpinak wrzuć na ostatnią minutę.', '', [['zalm', 150], ['quinoa', 80], ['spinazie', 120], ['olijf', 8]]),
    R('Indyk, makaron i szpinak', ['lunch', 'dinner'], ['meal prep'], 'Indyk w kostkach, sos pomidorowy ze szpinakiem, starty ser na wierzch.', 'Ugotuj makaron i sos na 2 dni', [['kalkoen', 150], ['pasta', 100], ['spinazie', 150], ['tomatenblik', 150], ['olijf', 10], ['kaas', 20]]),
    R('Dal z soczewicy i ryż', ['lunch', 'dinner'], ['meal prep', 'wegetariańskie', 'tanie'], 'Soczewica z pomidorami i cebulą 20 min, szpinak na koniec.', 'Zrób duży garnek dalu', [['linzen', 80], ['rijst', 70], ['spinaziedk', 100], ['tomatenblik', 150], ['ui', 50], ['olijf', 10]]),
    R('Wołowina, batat i kalafior', ['lunch', 'dinner'], ['meal prep'], 'Mięso na patelni, batat i kalafior z piekarnika.', 'Upiecz batat i kalafior na 2–3 dni', [['gehakt', 150], ['zoete', 250], ['bloemkool', 200], ['olijf', 8]]),
    R('Sałatka z kurczakiem i ciecierzycą', ['lunch', 'dinner'], ['na zimno', 'bez gotowania', 'do zabrania'], 'Kurczak z poprzedniego dnia + reszta w pojemniku. Dressing: oliwa i cytryna.', '', [['kip', 150], ['kikker', 150], ['rucola', 50], ['tomaat', 100], ['komkommer', 100], ['olijf', 15], ['feta', 30]]),
    R('Twaróg z warzywami i chlebem', ['lunch', 'dinner'], ['bez gotowania', 'szybkie', 'tanie', 'do zabrania'], 'Zero gotowania – 3 minuty.', '', [['hutten', 250], ['brood', 100], ['komkommer', 100], ['tomaat', 100], ['pompoen', 15]]),
    // --- Optional snacks (turn on in Plan → settings)
    R('Skyr z migdałami', ['snack'], ['bez gotowania'], '', '', [['skyr', 200], ['amandel', 25]]),
    R('Jabłko z masłem orzechowym', ['snack'], ['bez gotowania', 'do zabrania'], '', '', [['appel', 1], ['pinda', 25]]),
    R('Twaróg z owocami', ['snack'], ['bez gotowania'], '', '', [['kwark', 250], ['rood', 100]]),
    R('Orzechy i daktyle', ['snack'], ['do zabrania'], 'Garść migdałów, orzechów i 2–3 daktyle.', '', [['amandel', 25], ['walnoot', 20], ['dadels', 30]]),
    R('Jajka na twardo z ogórkiem', ['snack'], ['do zabrania', 'bez cukru'], 'Ugotuj kilka jajek na zapas.', 'Ugotuj jajka na twardo', [['eieren', 3], ['komkommer', 100]]),
  ];
  for (const x of extra.recipes) recipes.push(R(...x));
  for (const x of extra2.recipes) recipes.push(R(...x));
  for (const x of extra3.recipes) recipes.push(R(...x));
  for (const r of recipes) { const st = RECIPE_STEPS[r.name]; if (st) r.how = st.join('\n'); }
  /* Two real meals a day: breakfast (shake) and a big cooked "obiadokolacja"; in between something to take to uni
     (quick to make with the breakfast, or ready-made from a shop). Cooked mains became dinner-only and get bigger portions. */
  const LUNCH_ONLY = new Set(['Wrap z tuńczykiem i awokado', 'Sałatka z tuńczykiem i białą fasolą', 'Twaróg z warzywami i chlebem', 'Wrap z kurczakiem i warzywami', 'Sałatka z kurczakiem i ciecierzycą', 'Sałatka z kaszą gryczaną, jajkiem i fetą', 'Ciecierzyca, quinoa i feta', 'Kurczak, quinoa i awokado', 'Bowl z edamame, tofu i ryżem', 'Makrela wędzona, ziemniaki i sałatka', 'Tuńczyk, makaron i feta']);
  const LUNCH_ALSO = new Set(['Jogurt grecki z owocami i orzechami', 'Skyr bowl z bananem', 'Overnight oats z twarogiem', 'Pudding chia z mango', 'Kanapki z jajkiem i awokado', 'Serek wiejski na pieczywie']);
  const nice = (a, u) => u === 'pcs' ? Math.max(.5, Math.round(a * 2) / 2) : (a < 20 ? Math.round(a) : Math.round(a / 5) * 5);
  for (const r of recipes) {
    if (LUNCH_ONLY.has(r.name) || r.slots.includes('lunch') && r.tags.includes('kupne')) r.slots = ['lunch'];
    else if (LUNCH_ALSO.has(r.name)) r.slots = [...new Set([...r.slots, 'lunch'])];
    else if (r.slots.includes('dinner') && !r.slots.includes('breakfast') && !r.slots.includes('snack')) r.slots = ['dinner'];
    if (r.slots.length === 1 && r.slots[0] === 'dinner' && !r.big) { r.big = 1; for (const it of r.items) { const i = ingredients.find(x => x.id === it.ing); it.amt = nice(it.amt * 1.6, i ? i.unit : 'g'); } }
  }
  return {
    rev: 0, setupDone: false, starter: true, seedVersion: SEED_VERSION,
    profile: {
      weight: 75, height: 180, age: 22, sex: 'm', bodyFat: 15, activity: 1.5, surplus: 7,
      proteinPerKg: 1.8, fatPct: 25, trainDelta: 250, trainDays: [0, 2, 4],
      budget: 90, packFit: 'strong', mealStyle: 'mix', breakfastQuick: true, noSpill: true, meatPref: 'normal', shopTrips: 1, trip2Day: 3, store: 'Lidl', snack: false, clean: true, prepDays: 3, cheatCap: 12, aiOn: true,
    },
    ingredients, recipes, plan: {}, menus: {}, log: {}, workouts: {}, adjust: {}, shopChecked: {}, chat: [],
  };
}
