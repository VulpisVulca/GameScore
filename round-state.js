import { appState } from './state.js';
import {
  COFFEE,
  GOODS,
  NOODLES,
  SUSHI,
  account,
  allGoods,
  calculateSale,
  emptySale,
  houseRows,
  houseSettlement,
  integer,
  isCoffeeSale,
  mealGoods,
  roundSettlement,
  sameHouse,
} from './rules.js';
import {
  addBuiltPark,
  builtParkOrigins,
  canRemoveBuiltGarden,
  canRemoveBuiltPark,
  gardenKindAtRound,
  houseOptions,
  houseOrder,
  parkAtRound,
  removeBuiltGarden,
  removeBuiltPark,
} from './houses.js';
import { normalizeMeal } from './selection.js';
import { t } from './i18n.js';

export function beginEditor(index = null) {
  // Complete older, already booked sales in the same four-step round editor.
  let completing = false;
  if (
    index === null &&
    appState.game.events.length % 2 &&
    appState.game.events.at(-1).rows.every((row) => Array.isArray(row.houses))
  ) {
    completing = true;
    index = appState.game.events.length - 1;
  } else if (
    index !== null &&
    appState.game.events[index].type === 'salary' &&
    appState.game.events[index - 1]?.rows.every((row) => Array.isArray(row.houses))
  )
    index--;
  const roundDraft = completing
    ? appState.game.draft?.completion
    : index === null
      ? appState.game.draft
      : null;
  const type =
    index === null ? (appState.game.events.length % 2 ? 'salary' : 'sale') : appState.game.events[index].type;
  appState.editor = {
    index,
    type,
    rows: structuredClone(
      completing && roundDraft?.rows
        ? roundDraft.rows
        : index !== null
          ? appState.game.events[index].rows
          : appState.game.draft?.type === type
            ? appState.game.draft.rows
            : appState.game.players.map((p) =>
                type === 'sale' ? emptySale(p.milestones, account(appState.game).basePrice) : 0,
              ),
    ),
  };
  appState.review = false;
  if (type === 'sale') {
    // Old aggregate-only records stay editable without inventing house details.
    const legacy = appState.editor.rows.some(
      (row) => !Array.isArray(row.houses) && GOODS.some(([key]) => row[key] > 0),
    );
    appState.editor.wizard = !legacy;
    if (appState.editor.wizard) {
      appState.editor.houses = appState.editor.rows
        .flatMap((row, player) => (row.houses || []).map((house) => ({ ...house, player })))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (index === null)
        appState.editor.rows.forEach((row, i) => {
          row.milestones = { ...appState.game.players[i].milestones };
        });
      appState.editor.removedGardens = [...(roundDraft?.removedGardens || [])];
      appState.editor.removedParks = [...(roundDraft?.removedParks || [])];
      appState.editor.houseForm = roundDraft?.houseForm ? structuredClone(roundDraft.houseForm) : newHouse();
      appState.editor.wages = structuredClone(
        completing && appState.game.draft?.type === 'salary'
          ? appState.game.draft.rows
          : index !== null
            ? appState.game.events[index + 1]?.rows || appState.game.players.map(() => 0)
            : appState.game.draft?.wages || appState.game.players.map(() => 0),
      );
      appState.editor.reserves = roundDraft?.reserves ?? appState.game.reserves;
      appState.editor.wagesReviewed = roundDraft?.wagesReviewed === true || (!completing && index !== null);
      appState.editor.completing = completing;
      appState.editor.step = ['houses', 'extras', 'wages', 'summary'].includes(roundDraft?.step)
        ? roundDraft.step
        : completing
          ? 'wages'
          : index !== null
            ? 'summary'
            : 'houses';
      appState.editor.returnToSummary = roundDraft?.returnToSummary === true;
      appState.editor.editingHouse =
        Number.isInteger(roundDraft?.editingHouse) && appState.editor.houses[roundDraft.editingHouse]
          ? roundDraft.editingHouse
          : null;
      syncHouseRows();
      if (
        appState.editor.step === 'summary' &&
        (!appState.editor.wagesReviewed || previewRound().needsReserve)
      )
        appState.editor.step = 'wages';
    }
  }
}

export function outBeforeRound(i) {
  return (
    account({
      ...appState.game,
      events: appState.game.events.filter((e) => e.round < currentRound()),
      draft: null,
    }).bankrupt[i] !== null
  );
}

export function playerOut(i) {
  if (!appState.editor?.wizard || !appState.editor.houses)
    return (
      account({
        ...appState.game,
        events: appState.game.events.filter((e) => e.round < currentRound()),
        draft: null,
      }).bankrupt[i] !== null
    );
  const number = appState.editor.houseForm?.number;
  const previous = number
    ? appState.editor.houses.filter((h) => houseOrder(h.number) < houseOrder(number))
    : appState.editor.houses;
  return previewHouses(previous).bankrupt[i] !== null;
}

export function currentRound() {
  return appState.editor?.index !== null && appState.editor
    ? appState.game.events[appState.editor.index].round
    : Math.floor(appState.game.events.length / 2) + 1;
}

export function previewHouses(houses = appState.editor.houses) {
  return houseSettlement(
    gardenGame(),
    houseRows(appState.editor.rows, houses),
    appState.editor.index,
    appState.editor.reserves ?? appState.game.reserves,
  );
}

export function houseBaseBefore(number) {
  const prefix = number
    ? appState.editor.houses.filter((h) => houseOrder(h.number) < houseOrder(number))
    : appState.editor.houses;
  const before = previewHouses(prefix);
  if (!number) return before.basePrice;
  const pending =
    appState.editor.houseForm?.number && sameHouse(appState.editor.houseForm.number, number)
      ? appState.editor.houseForm
      : null;
  const existing = appState.editor.houses.find((h) => sameHouse(h.number, number) && !isCoffeeSale(h));
  const parent = pending || existing;
  if (!parent) return before.basePrice;
  let coffees = appState.editor.houses.filter((h) => sameHouse(h.number, number) && isCoffeeSale(h));
  if (pending?.coffees)
    coffees = pending.coffees.flatMap((coffee, player) =>
      coffee
        ? [
            {
              ...parent,
              burger: 0,
              pizza: 0,
              beer: 0,
              lemonade: 0,
              soda: 0,
              noodles: 0,
              sushi: 0,
              kimchi: 0,
              coffee,
              player,
              price: appState.editor.rows[player].price,
              basePrice: appState.editor.rows[player].basePrice ?? 10,
              coffeeSequence: undefined,
            },
          ]
        : [],
    );
  if (!coffees.length) return before.basePrice;
  // The pending garden/park selection also applies to this house's coffees.
  // Keep the saved records untouched until the edited house is confirmed.
  coffees = coffees.map((h) => ({ ...h, type: parent.type, park: Boolean(parent.park) }));
  const placeholder = {
    ...parent,
    number: String(number),
    player: parent.player ?? 0,
    burger: 1,
    pizza: 0,
    beer: 0,
    lemonade: 0,
    soda: 0,
    noodles: 0,
    sushi: 0,
    kimchi: 0,
    coffee: 0,
  };
  const rows = houseRows(appState.editor.rows, [...prefix, placeholder, ...coffees]);
  return houseSettlement(
    gardenGame(),
    rows,
    appState.editor.index,
    appState.editor.reserves ?? appState.game.reserves,
    { beforeMeal: number },
  ).basePrice;
}

export function normalizeHouseDraft() {
  appState.editor.houseForm = normalizeMeal(appState.editor.houseForm);
  const old =
    appState.editor.editingHouse === null ? null : appState.editor.houses[appState.editor.editingHouse];
  const state = previewHouses();
  appState.editor.rows = state.rows;
  appState.editor.houses = state.rows
    .flatMap((row) => row.houses || [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (old)
    appState.editor.editingHouse = appState.editor.houses.findIndex(
      (h) => !isCoffeeSale(h) && sameHouse(h.number, old.number),
    );
  const target = houseBaseBefore(appState.editor.houseForm.number);
  const previous =
    appState.editor.houseForm.basePrice ??
    appState.editor.rows[appState.editor.houseForm.player ?? 0].basePrice ??
    10;
  appState.editor.houseForm.price += target - previous;
  appState.editor.houseForm.basePrice = target;
  return state;
}

export function rawPlayerPrice(i) {
  return appState.editor.houseForm.player === i
    ? appState.editor.houseForm.price
    : appState.editor.rows[i].price +
        (appState.editor.houseForm.basePrice ?? 10) -
        (appState.editor.rows[i].basePrice ?? 10);
}

export function newHouse(kind = 'meal') {
  const basePrice =
    kind === 'coffee'
      ? (appState.editor.houseForm?.basePrice ?? account(appState.game).basePrice)
      : appState.editor?.houses
        ? houseBaseBefore(null)
        : account(appState.game).basePrice;
  return {
    number: '',
    player: null,
    type: 'normal',
    park: false,
    basePrice,
    price: basePrice,
    coffee: 0,
    kind,
    ...Object.fromEntries(mealGoods.map(([key]) => [key, 0])),
  };
}

export function syncHouseRows() {
  appState.editor.rows = houseRows(appState.editor.rows, appState.editor.houses);
}

export function coffeeRecords(house, player = null) {
  return appState.editor.houses.filter(
    (h) => isCoffeeSale(h) && sameHouse(h.number, house.number) && (player === null || h.player === player),
  );
}

export function coffeeQuantity(house, player) {
  return coffeeRecords(house, player).reduce((sum, h) => sum + h.coffee, 0);
}

export function coffeeDraftQuantities() {
  if (appState.editor.houseForm.coffees) return [...appState.editor.houseForm.coffees];
  const parent =
    appState.editor.editingHouse === null ? null : appState.editor.houses[appState.editor.editingHouse];
  return appState.game.players.map((_, i) => (parent ? coffeeQuantity(parent, i) : 0));
}

export function setCoffeeQuantity(house, player, quantity) {
  integer(quantity);
  const records = coffeeRecords(house, player);
  let delta = quantity - records.reduce((sum, h) => sum + h.coffee, 0);
  if (delta > 0) {
    const last = records.at(-1);
    if (last) last.coffee += delta;
    else
      appState.editor.houses.push({
        ...newHouse('coffee'),
        number: house.number,
        type: house.type,
        park: Boolean(house.park),
        player,
        price:
          appState.editor.rows[player].price +
          (house.basePrice ?? 10) -
          (appState.editor.rows[player].basePrice ?? 10),
        basePrice: house.basePrice ?? 10,
        coffee: delta,
        order: Math.max(-1, ...appState.editor.houses.map((h) => h.order ?? 0)) + 1,
      });
  } else
    for (const record of [...records].reverse()) {
      const removed = Math.min(-delta, record.coffee);
      record.coffee -= removed;
      delta += removed;
      if (!delta) break;
    }
  appState.editor.houses = appState.editor.houses.filter((h) => !records.includes(h) || h.coffee > 0);
}

export function coffeeSequenceFor(quantities, existing = []) {
  if (quantities.reduce((a, b) => a + b, 0) > 200) return undefined;
  const remaining = [...quantities],
    sequence = [];
  for (const player of existing)
    if (remaining[player] > 0) {
      sequence.push(player);
      remaining[player]--;
    }
  remaining.forEach((count, player) => {
    for (let i = 0; i < count; i++) sequence.push(player);
  });
  return sequence;
}

export const editablePark = (label) => canRemoveBuiltPark(appState.game, label, currentRound());

export const visiblePark = (label) => parkAtRound(gardenGame(), label, currentRound());

export function gardenGame() {
  let preview = appState.game;
  for (const [id, round] of Object.entries(builtParkOrigins(appState.game)))
    if (round === currentRound()) preview = addBuiltPark(preview, id, round);
  for (const id of appState.editor?.removedParks || [])
    if (canRemoveBuiltPark(preview, id, currentRound()))
      preview = removeBuiltPark(preview, id, currentRound());
  for (const number of appState.editor?.removedGardens || []) {
    if (canRemoveBuiltGarden(preview, number, currentRound()))
      preview = removeBuiltGarden(preview, number, currentRound());
  }
  return preview;
}

export function visibleGardenKind(label) {
  return gardenKindAtRound(gardenGame(), label, currentRound());
}

export function editableGarden(label) {
  return canRemoveBuiltGarden(gardenGame(), label, currentRound());
}

export const coffeeForm = () =>
  appState.editor.houseForm.kind === 'coffee' || isCoffeeSale(appState.editor.houseForm);

export const mealHouses = () => appState.editor.houses.filter((h) => !isCoffeeSale(h));

export const availableHouses = () =>
  houseOptions(appState.game).filter(
    (id) => !coffeeForm() || mealHouses().some((h) => sameHouse(h.number, id)),
  );

export const houseAlreadyUsed = (number) =>
  !coffeeForm() &&
  appState.editor.houses.some(
    (house, index) =>
      index !== appState.editor.editingHouse && !isCoffeeSale(house) && sameHouse(house.number, number),
  );

export const formGoods = () =>
  coffeeForm()
    ? [COFFEE]
    : [
        ...GOODS,
        ...(appState.game.modules?.noodles ? [NOODLES] : []),
        ...(appState.game.modules?.sushi ? [SUSHI] : []),
      ];

export function previewRound() {
  return roundSettlement(
    gardenGame(),
    appState.editor.rows,
    appState.editor.wages,
    appState.editor.index,
    appState.editor.reserves,
  );
}

export function houseHasGoods() {
  return (
    allGoods.some(([key]) => appState.editor.houseForm[key] > 0) ||
    appState.editor.houseForm.coffees?.some((n) => n > 0)
  );
}

export function checkEditor() {
  if (appState.editor.wizard) {
    const settlement = previewRound();
    if (settlement.needsReserve) throw new Error(t('Bitte zuerst die Reservekarten aufdecken.'));
    if (settlement.issues.length) throw new Error(settlement.issues.join(' '));
    return settlement.candidate;
  }
  if (appState.editor.type === 'sale') appState.editor.rows.forEach(calculateSale);
  else
    appState.editor.rows.forEach((n) => {
      if (!Number.isSafeInteger(n) || n < 0 || n > 1000000)
        throw new Error(t('Bitte eine gültige Mitarbeiterzahl eingeben.'));
    });
  const candidate = structuredClone(appState.game);
  const event = {
    type: appState.editor.type,
    round: currentRound(),
    rows: structuredClone(appState.editor.rows),
    createdAt: new Date().toISOString(),
  };
  if (appState.editor.index === null) candidate.events.push(event);
  else
    candidate.events[appState.editor.index] = {
      ...candidate.events[appState.editor.index],
      ...event,
      createdAt: candidate.events[appState.editor.index].createdAt,
      updatedAt: new Date().toISOString(),
    };
  if (appState.editor.index === null) candidate.draft = null;
  const result = account(candidate);
  if (result.issues.length) throw new Error(result.issues.join(' '));
  if (
    appState.editor.index !== null &&
    result.needsReserve &&
    appState.editor.index !== candidate.events.length - 1
  )
    throw new Error(
      t('Diese Änderung benötigt Reservekarten. Bitte zuerst die späteren Buchungen zurücknehmen.'),
    );
  return candidate;
}
