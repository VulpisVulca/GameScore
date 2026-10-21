import {
  availableHouses,
  beginEditor,
  checkEditor,
  coffeeForm,
  coffeeRecords,
  editableGarden,
  editablePark,
  houseAlreadyUsed,
  houseBaseBefore,
  houseHasGoods,
  mealHouses,
  newHouse,
  playerOut,
  previewHouses,
  previewRound,
  rawPlayerPrice,
  setCoffeeQuantity,
  syncHouseRows,
  visibleGardenKind,
  visiblePark,
} from '../round-state.js';
import { appState } from '../state.js';
import { persistDraft, save } from '../persistence.js';
import { app, money, notify, validInputs } from '../ui/common.js';
import { houseId, houseOptions, isApartment, isRural } from '../houses.js';
import { integer, sameHouse } from '../rules.js';
import { hasMeal, normalizeMeal, selectGoods } from '../selection.js';
import { rememberBuiltGarden, rememberBuiltPark, storeHouse } from '../round-controller.js';
import { refreshSaleCard } from '../ui/employees.js';
import { refreshWages } from '../ui/salaries.js';
import { coffeeOrderList, openCoffeeDialog } from '../ui/houses.js';
import { html, t } from '../i18n.js';
import { reservePriceSummary } from '../ui/reserve.js';
export const ROUND_ACTIONS = [
  'open-round',
  'leave-round',
  'house-player',
  'open-house-picker',
  'close-house-picker',
  'select-house',
  'house-park',
  'house-type',
  'house-kimchi',
  'house-count',
  'price-count',
  'fry-chef-count',
  'waitress-count',
  'toggle-cfo',
  'demand-count',
  'salary-discount-count',
  'wage-count',
  'save-house',
  'sales-step',
  'open-coffee-dialog',
  'coffee-order',
  'coffee-dialog-count',
  'cancel-coffee-dialog',
  'confirm-coffee-dialog',
  'add-house',
  'edit-house',
  'cancel-house',
  'remove-house',
  'review',
  'back-input',
  'commit',
  'edit',
  'cancel-edit',
  'reserve-card',
];
export function handleRoundAction(button) {
  switch (button.dataset.action) {
    case 'open-round':
      beginEditor();
      appState.screen = appState.editor.wizard ? 'sale' : 'entry';
      persistDraft();
      window.scrollTo(0, 0);
      break;
    case 'leave-round':
      persistDraft();
      appState.screen = appState.editor.index === null || appState.editor.completing ? 'table' : 'log';
      appState.editor = null;
      break;
    case 'house-player':
      if (playerOut(+button.dataset.index)) return;
      if (!validInputs()) return;
      if (appState.editor.houseForm.player !== +button.dataset.index)
        appState.editor.houseForm.price = rawPlayerPrice(+button.dataset.index);
      appState.editor.houseForm.player = +button.dataset.index;
      persistDraft();
      break;
    case 'open-house-picker':
      if (!validInputs()) return;
      app.querySelector('#house-picker').showModal();
      return;
    case 'close-house-picker':
      app.querySelector('#house-picker').close();
      return;
    case 'select-house': {
      const number = houseId(button.dataset.number);
      if (!availableHouses().includes(number) || houseAlreadyUsed(number)) return;
      const targetBase = houseBaseBefore(number);
      appState.editor.houseForm.price += targetBase - (appState.editor.houseForm.basePrice ?? 10);
      appState.editor.houseForm.basePrice = targetBase;
      appState.editor.houseForm.number = String(number);
      appState.editor.houseForm.park = coffeeForm()
        ? Boolean(mealHouses().find((h) => sameHouse(h.number, number)).park)
        : visiblePark(number);
      appState.editor.houseForm.type = coffeeForm()
        ? mealHouses().find((h) => sameHouse(h.number, number)).type
        : visibleGardenKind(number) === 'none'
          ? 'normal'
          : 'garden';
      appState.editor.houseForm = normalizeMeal(appState.editor.houseForm);
      persistDraft();
      requestAnimationFrame(() => app.querySelector('[data-action="open-house-picker"]')?.focus());
      break;
    }
    case 'house-park':
      if (
        !appState.game.modules?.lobbyist ||
        isRural(appState.editor.houseForm.number) ||
        coffeeForm() ||
        !validInputs() ||
        !houseOptions(appState.game).includes(houseId(appState.editor.houseForm.number))
      )
        return;
      if (appState.editor.houseForm.park && !editablePark(appState.editor.houseForm.number)) return;
      appState.editor.houseForm.park = !appState.editor.houseForm.park;
      if (appState.editor.houseForm.park) rememberBuiltPark(appState.editor.houseForm.number);
      persistDraft();
      break;
    case 'house-type':
      if (!validInputs() || coffeeForm()) return;
      if (
        button.dataset.type === 'garden' &&
        (isApartment(appState.editor.houseForm.number) || isRural(appState.editor.houseForm.number))
      )
        return;
      if (
        button.dataset.type === 'normal' &&
        visibleGardenKind(appState.editor.houseForm.number) !== 'none' &&
        !editableGarden(appState.editor.houseForm.number)
      )
        return;
      appState.editor.houseForm.type = button.dataset.type;
      appState.editor.houseForm = normalizeMeal(appState.editor.houseForm);
      if (button.dataset.type === 'garden') rememberBuiltGarden(appState.editor.houseForm.number);
      persistDraft();
      break;
    case 'house-kimchi':
      if (
        !appState.game.modules?.kimchi ||
        coffeeForm() ||
        !validInputs() ||
        !hasMeal(appState.editor.houseForm)
      )
        return;
      appState.editor.houseForm.kimchi = appState.editor.houseForm.kimchi ? 0 : 1;
      persistDraft();
      break;
    case 'house-count': {
      if (!validInputs()) return;
      const key = button.dataset.field;
      appState.editor.houseForm = selectGoods(
        appState.editor.houseForm,
        key,
        Math.max(0, Math.min(1000000, (appState.editor.houseForm[key] ?? 0) + +button.dataset.delta)),
      );
      persistDraft();
      break;
    }
    case 'price-count': {
      if (!validInputs()) return;
      const input = app.querySelector(`[data-comparison-price="${button.dataset.index}"]`);
      input.value = Math.max(+input.min, Math.min(+input.max, input.valueAsNumber + +button.dataset.delta));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    case 'fry-chef-count': {
      if (!validInputs()) return;
      const i = +button.dataset.index;
      appState.editor.rows[i].fryChefs = Math.max(
        0,
        Math.min(1000000, (appState.editor.rows[i].fryChefs ?? 0) + +button.dataset.delta),
      );
      app.querySelector(`[data-row="${i}"][data-field="fryChefs"]`).value = appState.editor.rows[i].fryChefs;
      refreshSaleCard(i);
      persistDraft();
      return;
    }
    case 'waitress-count': {
      if (!validInputs()) return;
      const i = +button.dataset.index;
      appState.editor.rows[i].waitresses = Math.max(
        0,
        Math.min(1000000, appState.editor.rows[i].waitresses + +button.dataset.delta),
      );
      app.querySelector(`[data-row="${i}"][data-field="waitresses"]`).value =
        appState.editor.rows[i].waitresses;
      refreshSaleCard(i);
      persistDraft();
      return;
    }
    case 'toggle-cfo': {
      const i = +button.dataset.index;
      if (appState.editor.rows[i].milestones.cfo) return;
      appState.editor.rows[i].cfo = !appState.editor.rows[i].cfo;
      refreshSaleCard(i);
      persistDraft();
      return;
    }
    case 'demand-count': {
      if (!validInputs()) return;
      const input = app.querySelector(`[data-demand="${button.dataset.index}"]`);
      input.value = Math.max(0, Math.min(1000000, input.valueAsNumber + +button.dataset.delta));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    case 'salary-discount-count': {
      if (!validInputs()) return;
      const input = app.querySelector(
        '[data-salary-discount="' + button.dataset.key + '"][data-index="' + button.dataset.index + '"]',
      );
      input.value = Math.max(0, Math.min(1000000, input.valueAsNumber + +button.dataset.delta));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    case 'wage-count': {
      if (!validInputs()) return;
      const i = +button.dataset.index;
      appState.editor.wages[i] = Math.max(
        0,
        Math.min(1000000, appState.editor.wages[i] + +button.dataset.delta),
      );
      app.querySelector(`[data-wage="${i}"]`).value = appState.editor.wages[i];
      refreshWages();
      persistDraft();
      return;
    }
    case 'save-house': {
      const returnToSummary = appState.editor.returnToSummary;
      if (!storeHouse()) return;
      if (returnToSummary) {
        appState.editor.step = previewHouses().needsReserve
          ? 'houses'
          : previewRound().needsReserve
            ? 'wages'
            : 'summary';
        appState.editor.returnToSummary = false;
      }
      persistDraft();
      window.scrollTo(0, 0);
      break;
    }
    case 'sales-step': {
      if (!validInputs()) return;
      if (appState.editor.step === 'houses' && (houseHasGoods() || appState.editor.editingHouse !== null)) {
        if (!storeHouse()) return;
      }
      syncHouseRows();
      let nextStep = button.dataset.step;
      if (nextStep === 'summary') {
        if (appState.editor.step === 'wages') appState.editor.wagesReviewed = true;
        if (!appState.editor.wagesReviewed || previewRound().needsReserve) nextStep = 'wages';
        else checkEditor();
      }
      appState.editor.step = nextStep;
      appState.editor.returnToSummary = false;
      persistDraft();
      window.scrollTo(0, 0);
      break;
    }
    case 'open-coffee-dialog':
      if (!validInputs()) return;
      openCoffeeDialog(button.dataset.index === undefined ? null : +button.dataset.index);
      return;
    case 'coffee-order': {
      const sequence = appState.editor.coffeeDialog?.sequence,
        i = +button.dataset.index,
        j = i + +button.dataset.delta;
      if (!sequence || j < 0 || j >= sequence.length) return;
      [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
      app.querySelector('#coffee-order-list').innerHTML = coffeeOrderList();
      return;
    }
    case 'coffee-dialog-count': {
      const input = app.querySelector('[data-dialog-coffee="' + button.dataset.player + '"]');
      if (!input.validity.valid) {
        input.reportValidity();
        return;
      }
      input.value = Math.max(0, Math.min(1000000, input.valueAsNumber + +button.dataset.delta));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    case 'cancel-coffee-dialog':
      app.querySelector('#coffee-dialog').close();
      appState.editor.coffeeDialog = null;
      return;
    case 'confirm-coffee-dialog': {
      const invalid = app.querySelector('#coffee-dialog input:invalid');
      if (invalid) {
        invalid.reportValidity();
        return;
      }
      const state = appState.editor.coffeeDialog;
      if (!state) return;
      const quantities = [...app.querySelectorAll('[data-dialog-coffee]')].map((input) =>
        integer(input.valueAsNumber),
      );
      if (state.index === null) {
        appState.editor.houseForm.coffees = quantities;
        appState.editor.houseForm.coffeeSequence = state.sequence;
      } else {
        const parent = appState.editor.houses[state.index];
        parent.coffeeSequence = state.sequence;
        const editingParent =
          appState.editor.editingHouse === null ? null : appState.editor.houses[appState.editor.editingHouse];
        quantities.forEach((quantity, i) => setCoffeeQuantity(parent, i, quantity));
        if (editingParent) appState.editor.editingHouse = appState.editor.houses.indexOf(editingParent);
        syncHouseRows();
        if (appState.editor.step === 'summary' && previewRound().needsReserve) {
          appState.editor.step = 'wages';
          appState.editor.wagesReviewed = false;
        }
      }
      appState.editor.coffeeDialog = null;
      persistDraft();
      break;
    }
    case 'add-house':
      appState.editor.houseForm = newHouse();
      appState.editor.editingHouse = null;
      appState.editor.returnToSummary = true;
      appState.editor.step = 'houses';
      persistDraft();
      window.scrollTo(0, 0);
      break;
    case 'edit-house':
      if (appState.editor.step === 'houses' && (houseHasGoods() || appState.editor.editingHouse !== null))
        throw new Error(t('Bitte den aktuellen Verkauf zuerst speichern oder abbrechen.'));
      appState.editor.returnToSummary = appState.editor.step === 'summary';
      appState.editor.editingHouse = +button.dataset.index;
      appState.editor.houseForm = structuredClone(appState.editor.houses[appState.editor.editingHouse]);
      appState.editor.step = 'houses';
      persistDraft();
      window.scrollTo(0, 0);
      break;
    case 'cancel-house':
      appState.editor.houseForm = newHouse();
      appState.editor.editingHouse = null;
      if (appState.editor.returnToSummary) appState.editor.step = 'summary';
      appState.editor.returnToSummary = false;
      persistDraft();
      break;
    case 'remove-house':
      if (appState.editor.step === 'houses' && (houseHasGoods() || appState.editor.editingHouse !== null))
        throw new Error(t('Bitte den aktuellen Verkauf zuerst speichern oder abbrechen.'));
      {
        const parent = appState.editor.houses[+button.dataset.index],
          coffees = coffeeRecords(parent);
        if (
          !confirm(
            coffees.length
              ? t('Dieses Haus samt Kaffeeverkäufen aus der Runde entfernen?')
              : t('Diesen Hausverkauf aus der Runde entfernen?'),
          )
        )
          return;
        appState.editor.houses = appState.editor.houses.filter((h) => h !== parent && !coffees.includes(h));
        syncHouseRows();
        persistDraft();
        break;
      }
    case 'review': {
      const invalid = app.querySelector('input:invalid');
      if (invalid) {
        invalid.reportValidity();
        return;
      }
      checkEditor();
      appState.review = true;
      break;
    }
    case 'back-input':
      appState.review = false;
      break;
    case 'commit': {
      const editing = appState.editor.index !== null && !appState.editor.completing;
      const candidate = checkEditor();
      if (appState.editor.index === null && appState.editor.type === 'sale')
        candidate.players.forEach((p, i) => {
          p.milestones = { ...appState.editor.rows[i].milestones };
        });
      appState.game = candidate;
      appState.editor = null;
      save();
      appState.screen = editing ? 'log' : 'table';
      notify(
        editing ? t('Buchung korrigiert. Alle Kontostände wurden neu berechnet.') : t('Buchung gespeichert.'),
      );
      break;
    }
    case 'edit':
      beginEditor(+button.dataset.index);
      appState.screen = appState.editor.wizard ? 'sale' : 'entry';
      window.scrollTo(0, 0);
      break;
    case 'cancel-edit':
      appState.editor = null;
      appState.screen = 'log';
      break;
    case 'reserve-card': {
      const index = +button.dataset.index;
      app.querySelector('[data-reserve="' + index + '"]').value = button.dataset.value;
      app.querySelectorAll('[data-action="reserve-card"][data-index="' + index + '"]').forEach((option) => {
        const selected = option === button;
        option.classList.toggle('is-selected', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      const values = [...app.querySelectorAll('[data-reserve]')].map((input) => +input.value);
      const selected = values.filter((value) => value > 0);
      if (appState.game.modules?.reservePrices)
        document.querySelector('#reserve-price').textContent = reservePriceSummary(values);
      document.querySelector('#reserve-total').textContent = money(
        appState.game.modules?.reservePrices
          ? appState.game.players.length * 200
          : selected.reduce((sum, value) => sum + value, 0),
      );
      document.querySelector('#reserve-equation').textContent = appState.game.modules?.reservePrices
        ? html`${appState.game.players.length} × 200 $ · ${selected.length}/${appState.game.players.length}
          Karten gewählt`
        : selected.map(money).join(' + ') + ' (' + selected.length + '/' + appState.game.players.length + ')';
      return;
    }
  }
  return true;
}
