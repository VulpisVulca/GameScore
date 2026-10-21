import { save } from './persistence.js';
import {
  builtGardenOrigins,
  builtGardenNumbers,
  builtParkOrigins,
  houseOptions,
  gardenKind,
} from './houses.js';
import { validInputs } from './ui/common.js';
import { appState } from './state.js';
import { html, t } from './i18n.js';
import {
  coffeeForm,
  coffeeRecords,
  currentRound,
  houseAlreadyUsed,
  mealHouses,
  newHouse,
  playerOut,
  setCoffeeQuantity,
  syncHouseRows,
} from './round-state.js';
import { calculateHouse, isCoffeeSale, sameHouse } from './rules.js';
import { canRemoveBuiltGarden, canRemoveBuiltPark, houseId, houseNumber } from './houses.js';

export function storeHouse() {
  if (!validInputs()) return false;
  const house = appState.editor.houseForm;
  if (house.player === null || !appState.game.players[house.player])
    throw new Error(t('Bitte den Spieler auswählen, der dieses Haus beliefert.'));
  if (!house.number.trim()) throw new Error(t('Bitte eine Hausnummer auswählen.'));
  if (houseAlreadyUsed(house.number))
    throw new Error(t('Dieses Haus wurde in dieser Runde bereits erfasst.'));
  if (playerOut(house.player)) throw new Error(t('Ausgeschiedene Spieler können nicht mehr verkaufen.'));
  calculateHouse(house, appState.editor.rows[house.player].milestones);
  const old =
    appState.editor.editingHouse === null ? null : appState.editor.houses[appState.editor.editingHouse];
  if (old && !isCoffeeSale(old) && !sameHouse(old.number, house.number))
    coffeeRecords(old).forEach((h) => {
      h.number = house.number;
      h.type = house.type;
      h.park = Boolean(house.park);
    });
  if (coffeeForm()) {
    const parent = mealHouses().find((h) => sameHouse(h.number, house.number));
    if (!parent) throw new Error(t('Kaffee benötigt einen erfassten Essensverkauf für dieses Haus.'));
    house.type = parent.type;
    house.park = Boolean(parent.park);
  } else
    appState.editor.houses
      .filter((h) => isCoffeeSale(h) && sameHouse(h.number, house.number))
      .forEach((h) => {
        h.type = house.type;
        h.park = Boolean(house.park);
      });
  const number = houseNumber(house.number);
  if (house.type === 'normal' && canRemoveBuiltGarden(appState.game, number, currentRound())) {
    appState.editor.removedGardens = [...new Set([...appState.editor.removedGardens, number])];
    appState.editor.houses.forEach((saved) => {
      if (houseNumber(saved.number) === number) saved.type = 'normal';
    });
  } else if (house.type === 'garden' && appState.editor.removedGardens.includes(number)) {
    appState.editor.removedGardens = appState.editor.removedGardens.filter((value) => value !== number);
    appState.editor.houses.forEach((saved) => {
      if (houseNumber(saved.number) === number) saved.type = 'garden';
    });
  }
  const parkId = houseId(house.number);
  if (!house.park && canRemoveBuiltPark(appState.game, parkId, currentRound())) {
    appState.editor.removedParks = [...new Set([...appState.editor.removedParks, parkId])];
    appState.editor.houses.forEach((saved) => {
      if (sameHouse(saved.number, house.number)) saved.park = false;
    });
  } else if (house.park && appState.editor.removedParks.includes(parkId))
    appState.editor.removedParks = appState.editor.removedParks.filter((id) => id !== parkId);
  const order =
    appState.editor.editingHouse === null
      ? Math.max(-1, ...appState.editor.houses.map((h) => h.order ?? 0)) + 1
      : appState.editor.houses[appState.editor.editingHouse].order;
  const { coffees, ...houseValues } = house;
  const saved = {
    ...houseValues,
    order,
    number: house.number.trim() || html`Haus ${(order ?? appState.editor.editingHouse) + 1}`,
  };
  if (appState.editor.editingHouse === null) appState.editor.houses.push(saved);
  else appState.editor.houses[appState.editor.editingHouse] = saved;
  if (coffees) coffees.forEach((quantity, i) => setCoffeeQuantity(saved, i, quantity));
  appState.editor.houseForm = newHouse();
  appState.editor.editingHouse = null;
  syncHouseRows();
  return true;
}

export function rememberBuiltPark(label) {
  const id = houseId(label);
  if (!appState.game.modules?.lobbyist || !houseOptions(appState.game).includes(id)) return;
  appState.game.builtParkRounds = {
    ...builtParkOrigins(appState.game),
    [id]: Math.min(builtParkOrigins(appState.game)[id] ?? Infinity, currentRound()),
  };
  appState.game.builtParks = houseOptions(appState.game).filter((value) =>
    Object.hasOwn(appState.game.builtParkRounds, value),
  );
  save();
}

export function rememberBuiltGarden(label) {
  const number = houseNumber(label);
  if (!number || gardenKind(appState.game, number) === 'native') return;
  const origin = builtGardenOrigins(appState.game)[number] ?? currentRound();
  appState.game.builtGardens = [...new Set([...builtGardenNumbers(appState.game), number])].sort(
    (a, b) => a - b,
  );
  appState.game.builtGardenRounds = {
    ...builtGardenOrigins(appState.game),
    [number]: Math.min(origin, currentRound()),
  };
  save();
}
