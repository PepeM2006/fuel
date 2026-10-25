'use strict';
/* Seed version 8: frozen ready-to-cook products (no peeling, chopping or thawing) + quick recipes built on them. */
function seedExtras4(A) {
  const H = (...s) => s.join('\n');
  const F = A[5];   // 'Mrożonki'
  const rows = [
    ['broccoli_fr', 'Brokuły (mrożone)', 'Broccoli (diepvries)', 'g', 34, 2.8, 7, 0.4, F, 600, 1.8, 0],
    ['bloemkool_fr', 'Kalafior (mrożony)', 'Bloemkool (diepvries)', 'g', 25, 1.9, 5, 0.3, F, 600, 1.6, 0],
    ['sperzie_fr', 'Fasolka szparagowa (mrożona)', 'Sperziebonen (diepvries)', 'g', 31, 1.8, 7, 0.2, F, 600, 1.7, 0],
    ['paprika_fr', 'Papryka w paskach (mrożona)', 'Paprikarepen (diepvries)', 'g', 31, 1, 6, 0.3, F, 450, 2.0, 0],
    ['champ_fr', 'Pieczarki (mrożone)', 'Champignons (diepvries)', 'g', 22, 3.1, 3.3, 0.3, F, 450, 2.0, 0],
    ['courgette_fr', 'Cukinia (mrożona)', 'Courgette (diepvries)', 'g', 17, 1.2, 3.1, 0.3, F, 450, 1.8, 0],
    ['zoete_fr', 'Bataty w kostkach (mrożone)', 'Zoete aardappel blokjes (diepvries)', 'g', 86, 1.6, 20, 0.1, F, 750, 2.6, 0],
    ['aardappel_fr', 'Ziemniaki w kostkach (mrożone, bez dodatków)', 'Aardappelblokjes (diepvries)', 'g', 77, 2, 17, 0.1, F, 750, 2.0, 1],
    ['butternut_fr', 'Dynia w kostkach (mrożona)', 'Pompoenblokjes (diepvries)', 'g', 45, 1, 10, 0.1, F, 450, 2.2, 0],
    ['spruit_fr', 'Brukselka (mrożona)', 'Spruitjes (diepvries)', 'g', 43, 3.4, 9, 0.3, F, 750, 2.0, 0],
    ['wortel_fr', 'Marchew (mrożona)', 'Wortelen (diepvries)', 'g', 41, 0.9, 10, 0.2, F, 750, 1.6, 0],
    ['mais_fr', 'Kukurydza (mrożona)', 'Mais (diepvries)', 'g', 85, 3, 16, 1.2, F, 750, 1.8, 0],
    ['kip_fr', 'Pierś z kurczaka (mrożona)', 'Kipfilet (diepvries)', 'g', 110, 23, 0, 1.5, F, 1000, 8.0, 0],
    ['kipstrips_fr', 'Kurczak w paskach (mrożony, naturalny)', 'Kipstrips naturel (diepvries)', 'g', 125, 22, 2, 3, F, 600, 7.0, 1],
    ['zalm_fr', 'Łosoś (filet, mrożony)', 'Zalmfilet (diepvries)', 'g', 200, 20, 0, 13, F, 400, 7.5, 0],
    ['avocado_fr', 'Awokado w kawałkach (mrożone)', 'Avocado stukjes (diepvries)', 'g', 160, 2, 9, 15, F, 500, 5.0, 0],
    ['frites_fr', 'Frytki do piekarnika (mrożone, same ziemniaki)', 'Oven frites naturel (diepvries)', 'g', 150, 2.4, 24, 4.5, F, 750, 2.0, 1],
    ['zoetefrites_fr', 'Frytki z batatów do piekarnika (mrożone)', 'Zoete aardappel frites (diepvries)', 'g', 130, 1.8, 22, 4, F, 600, 2.5, 1],
  ];
  // name, slots, tags, how, prep, items
  const recipes = [
    // ---------- dinners from the freezer (little chopping, 15–25 minutes)
    ['Łosoś z mrożonymi batatami i brokułami (20 minut)', ['dinner'], ['z mrożonek', 'szybkie', 'omega-3'], H('Piekarnik 200°C. Mrożone bataty wymieszaj z oliwą i piecz 25 minut (bez rozmrażania).', 'Mrożonego łososia dołóż na blachę na ostatnie 20 minut.', 'Mrożone brokuły gotuj na parze lub w mikrofali 5–6 minut.'), '', [['zalm_fr', 150], ['zoete_fr', 250], ['broccoli_fr', 150], ['olijf', 8]]],
    ['Kurczak z mrożoną papryką i ryżem', ['dinner'], ['z mrożonek', 'szybkie'], H('Ryż ugotuj (25 minut).', 'Kurczaka w paskach smaż 8 minut na mocnym ogniu, dodaj mrożoną paprykę i smaż 6 minut.', 'Dopraw papryką i kuminem, podaj z ryżem.'), 'Ugotuj ryż na 2–3 dni', [['kipstrips_fr', 170], ['rijst', 80], ['paprika_fr', 150], ['olijf', 8]]],
    ['Stir-fry z mrożonych warzyw i kurczaka', ['dinner'], ['z mrożonek', 'szybkie', 'wysokobiałkowe'], H('Kurczaka rozmroź w mikrofali i pokrój w paski.', 'Smaż 6 minut, dodaj mrożoną mieszankę warzyw i smaż 7 minut.', 'Na koniec masło orzechowe rozrzedzone wodą jako sos. Ryż ugotuj osobno.'), 'Ugotuj ryż na 2–3 dni', [['kip_fr', 160], ['groentemix', 250], ['rijst', 75], ['pinda', 15]]],
    ['Makaron z mrożonymi krewetkami i szpinakiem', ['dinner'], ['z mrożonek', 'szybkie'], H('Makaron ugotuj 10 minut.', 'Krewetki (rozmrożone pod zimną wodą) smaż 3 minuty z czosnkiem, dodaj mrożony szpinak i duś 4 minuty.', 'Wymieszaj z makaronem, posyp fetą.'), '', [['garnalen', 180], ['pasta', 90], ['spinaziedk', 150], ['knoflook', 5], ['feta', 30], ['olijf', 10]]],
    ['Dorsz z mrożonymi ziemniakami i fasolką', ['dinner'], ['z mrożonek', 'szybkie', 'chude'], H('Piekarnik 200°C. Mrożone ziemniaki z oliwą piecz 25 minut.', 'Dorsza (prosto z zamrażarki) dołóż na 15–18 minut.', 'Mrożoną fasolkę gotuj 6 minut.'), '', [['witvis', 220], ['aardappel_fr', 350], ['sperzie_fr', 150], ['olijf', 15]]],
    ['Chili z mrożoną kukurydzą i papryką', ['dinner'], ['z mrożonek', 'meal prep', 'wegetariańskie', 'tanie'], H('Paprykę i kukurydzę z mrożonki wrzuć na patelnię, smaż 5 minut.', 'Dodaj fasolę, pomidory, kumin i chili; gotuj 15 minut.', 'Ryż ugotuj osobno.'), 'Ugotuj duży garnek chili', [['bonen', 150], ['kidney', 150], ['mais_fr', 80], ['paprika_fr', 100], ['tomatenblik', 200], ['rijst', 70]]],
    ['Curry z mrożonych warzyw i ciecierzycy', ['dinner'], ['z mrożonek', 'meal prep', 'wegetariańskie'], H('Cebulę podsmaż z curry 3 minuty.', 'Dodaj mrożone warzywa, ciecierzycę i mleko kokosowe, gotuj 12 minut.', 'Podaj z ryżem.'), 'Ugotuj duży garnek curry', [['kikker', 200], ['kokosmelk', 100], ['groentemix', 200], ['rijst', 70], ['ui', 40]]],
    ['Kurczak z mrożonym kalafiorem i kaszą', ['dinner'], ['z mrożonek', 'meal prep'], H('Kalafior (mrożony) i kurczaka na blachę, 200°C 25 minut.', 'Kaszę ugotuj 15 minut.', 'Sos: tahini rozrzedzone wodą.'), 'Upiecz blachę na 2–3 dni', [['kip_fr', 160], ['bloemkool_fr', 250], ['boekweit', 70], ['tahin', 15], ['olijf', 8]]],
    ['Zapiekanka z mrożonych warzyw i jajek', ['dinner'], ['z mrożonek', 'szybkie', 'wegetariańskie'], H('Mrożone warzywa podsmaż 6 minut.', 'Zalej roztrzepanymi jajkami, posyp mozzarellą.', 'Piecz 15 minut w 200°C, podaj z chlebem.'), '', [['eieren', 4], ['groentemix', 200], ['mozz', 50], ['brood', 80]]],
    ['Łosoś z kaszą jęczmienną i mrożoną fasolką', ['dinner'], ['z mrożonek', 'omega-3'], H('Kaszę ugotuj 25–30 minut.', 'Mrożonego łososia piecz 20 minut w 200°C.', 'Mrożoną fasolkę gotuj 6 minut.'), 'Ugotuj kaszę na 2 dni', [['zalm_fr', 140], ['parelgort', 80], ['sperzie_fr', 150], ['olijf', 8]]],
    ['Wołowina z mrożoną brukselką i ziemniakami', ['dinner'], ['z mrożonek', 'meal prep'], H('Piekarnik 200°C. Mrożoną brukselkę i ziemniaki z oliwą piecz 25 minut.', 'Mięso smaż 7 minut, dopraw.', 'Podaj razem.'), 'Jedna blacha na 2–3 dni', [['gehakt', 140], ['spruit_fr', 180], ['aardappel_fr', 300], ['olijf', 8]]],
    ['Makaron z mrożonymi pieczarkami i kurczakiem', ['dinner'], ['z mrożonek', 'szybkie'], H('Makaron ugotuj 10 minut.', 'Kurczaka (rozmrożonego) i mrożone pieczarki smaż 10 minut.', 'Dodaj jogurt grecki na koniec i wymieszaj z makaronem.'), '', [['pasta', 90], ['kip_fr', 150], ['champ_fr', 200], ['griek', 60], ['olijf', 8]]],
    ['Curry z dyni z mrożonki i ciecierzycy', ['dinner'], ['z mrożonek', 'meal prep', 'wegetariańskie'], H('Mrożoną dynię piecz 25 minut w 200°C albo gotuj w mleku kokosowym 15 minut.', 'Dodaj ciecierzycę i curry.', 'Ryż ugotuj osobno.'), 'Ugotuj duży garnek curry', [['butternut_fr', 300], ['kikker', 150], ['kokosmelk', 100], ['rijst', 50]]],
    ['Tofu z mrożonymi warzywami i ryżem', ['dinner'], ['z mrożonek', 'szybkie', 'wegetariańskie'], H('Tofu osusz, pokrój i zrumień 8 minut.', 'Dodaj mrożone warzywa, smaż 7 minut.', 'Sos z masła orzechowego rozrzedzonego wodą. Ryż ugotuj osobno.'), 'Ugotuj ryż na 2 dni', [['tofu', 180], ['groentemix', 250], ['rijst', 75], ['pinda', 15]]],
    ['Kurczak z marchewką i groszkiem z mrożonek (jeden garnek)', ['dinner'], ['z mrożonek', 'meal prep', 'szybkie'], H('Wszystko do jednego garnka: ryż, mrożona marchew, groszek i kurczak w kawałkach.', 'Zalej wodą (ok. 2,5 razy więcej niż ryżu), dopraw i gotuj pod przykryciem 25 minut.'), 'Ugotuj garnek na 2–3 dni', [['kip_fr', 160], ['wortel_fr', 150], ['erwten', 100], ['rijst', 85], ['olijf', 8]]],
    // ---------- fries from the freezer (oven, no peeling or deep frying)
    ['Kurczak z frytkami z piekarnika i surówką', ['dinner'], ['z mrożonek', 'szybkie'], H('Piekarnik 220°C. Mrożone frytki rozłóż na blasze i piecz 20–25 minut, w połowie przewróć.', 'Kurczaka w kawałkach dopraw i smaż 8–10 minut.', 'Surówka: starta marchew i kapusta z jogurtem greckim.'), '', [['kip', 160], ['frites_fr', 250], ['rodekool', 100], ['wortel', 80], ['griek', 40]]],
    ['Burgery z wołowiny z frytkami z piekarnika', ['dinner'], ['z mrożonek', 'szybkie', 'wysokobiałkowe'], H('Piekarnik 220°C, frytki piecz 20–25 minut.', 'Mięso uformuj w 2 burgery, dopraw i smaż po 4–5 minut z każdej strony.', 'Podaj z pomidorem, ogórkiem i chlebem.'), '', [['gehakt', 140], ['frites_fr', 200], ['tomaat', 100], ['komkommer', 60], ['brood', 60]]],
    ['Łosoś z frytkami z piekarnika i groszkiem', ['dinner'], ['z mrożonek', 'szybkie', 'omega-3'], H('Frytki piecz w 220°C 20–25 minut.', 'Łososia dołóż na blachę na ostatnie 12–15 minut.', 'Mrożony groszek zalej wrzątkiem lub gotuj 3 minuty.'), '', [['zalm', 140], ['frites_fr', 200], ['erwten', 100]]],
    ['Jajka sadzone z frytkami z piekarnika i sałatką', ['dinner'], ['z mrożonek', 'szybkie', 'wegetariańskie'], H('Frytki piecz w 220°C 20–25 minut.', 'Jajka usmaż 3–4 minuty.', 'Sałatka: pomidor, rukola, oliwa.'), '', [['eieren', 3], ['frites_fr', 220], ['tomaat', 120], ['rucola', 30], ['olijf', 8]]],
    ['Kurczak z frytkami z batatów i jogurtem', ['dinner'], ['z mrożonek', 'szybkie'], H('Frytki z batatów piecz w 220°C 20–25 minut.', 'Kurczaka usmaż 8–10 minut.', 'Podaj z jogurtem greckim jako sosem i rukolą.'), '', [['kip', 160], ['zoetefrites_fr', 250], ['griek', 60], ['rucola', 30]]],
    // ---------- uni lunch (no cooking in the morning)
    ['Kanapka z mrożonym awokado i jajkiem', ['lunch'], ['z mrożonek', 'na uczelnię', 'szybkie'], H('Awokado z mrożonki rozmraża się w kilka minut – rozgnieć na chlebie.', 'Dodaj jajko na twardo (ugotowane wcześniej) i pomidora.'), 'Ugotuj jajka na twardo na kilka dni', [['brood', 120], ['avocado_fr', 80], ['eieren', 2], ['tomaat', 80]]],
    ['Wrap z mrożonym awokado i tuńczykiem', ['lunch'], ['z mrożonek', 'na uczelnię', 'bez gotowania', 'szybkie'], H('Awokado rozgnieć widelcem (po kilku minutach rozmrożenia).', 'Wrap posmaruj, dodaj tuńczyka i rukolę, zawiń w folię.'), '', [['wrap', 110], ['avocado_fr', 80], ['tonijn', 110], ['rucola', 30]]],
    ['Quinoa z mrożonymi warzywami na zimno', ['lunch'], ['z mrożonek', 'na uczelnię', 'na zimno', 'wegetariańskie'], H('Quinoa ugotuj 15 minut (na 2–3 dni).', 'Mrożone warzywa gotuj 3 minuty, ostudź.', 'Wymieszaj z ciecierzycą, fetą i oliwą.'), 'Ugotuj quinoa na 2–3 dni', [['quinoa', 70], ['groentemix', 150], ['kikker', 100], ['feta', 40], ['olijf', 10]]],
    ['Ryż z tuńczykiem i mrożoną kukurydzą', ['lunch'], ['z mrożonek', 'na uczelnię', 'na zimno', 'szybkie'], H('Ugotowany wcześniej ryż wymieszaj z tuńczykiem i kukurydzą (zalej wrzątkiem na minutę).', 'Dodaj ogórka, jogurt i oliwę.'), 'Ugotuj ryż na 2–3 dni', [['rijst', 80], ['tonijn', 130], ['mais_fr', 80], ['komkommer', 80], ['olijf', 10], ['griek', 50]]],
    // ---------- breakfasts with frozen fruit
    ['Shake: mrożone mango, banan i skyr', ['breakfast'], ['z mrożonek', 'shake', 'do zabrania'], H('Mrożone mango i reszta do blendera, blenduj minutę.'), '', [['mango', 150], ['banaan', 1], ['skyr', 200], ['melk', 250], ['haver', 40]]],
    ['Shake: mrożone awokado i szpinak', ['breakfast'], ['z mrożonek', 'shake', 'do zabrania'], H('Wszystko prosto z zamrażarki do blendera, blenduj minutę – wychodzi gęsty i kremowy.'), '', [['avocado_fr', 100], ['spinaziedk', 60], ['melk', 300], ['haver', 50], ['kwark', 150], ['banaan', 1]]],
    ['Owsianka z mrożonymi owocami', ['breakfast'], ['z mrożonek', 'szybkie'], H('Płatki z mlekiem gotuj 3 minuty, w ostatniej minucie dodaj mrożone owoce.', 'Posyp orzechami i chia.'), '', [['haver', 80], ['melk', 300], ['rood', 150], ['walnoot', 20], ['chia', 8]]],
  ];
  return { rows, recipes };
}
