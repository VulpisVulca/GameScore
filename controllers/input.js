import { appState } from '../state.js';
import { persistDraft, save } from '../persistence.js';
import { coffeeSequenceFor, syncHouseRows } from '../round-state.js';
import { app, money } from '../ui/common.js';
import { coffeeOrderList, houseList, refreshHousePrices } from '../ui/houses.js';
import { refreshWages } from '../ui/salaries.js';
import { calculateHouse, isCoffeeSale, milestoneList } from '../rules.js';
import { selectGoods } from '../selection.js';
import { html } from '../i18n.js';
import { refreshSaleCard } from '../ui/employees.js';
export function handleCancel(event) {
  if (event.target.id === 'coffee-dialog' && appState.editor) appState.editor.coffeeDialog = null;
}
export function handleInput(event) {
  event.target.setCustomValidity?.('');
  const input = event.target;
  if (input.dataset.setupName !== undefined) {
    appState.setupPlayers[+input.dataset.setupName].name = input.value;
    return;
  }
  if (input.dataset.achievement !== undefined) {
    appState.game.players[+input.dataset.player].milestones[input.dataset.achievement] = input.checked;
    save();
    return;
  }
  if (input.dataset.dialogCoffee !== undefined && appState.editor?.coffeeDialog) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    appState.editor.coffeeDialog.quantities[+input.dataset.dialogCoffee] = input.valueAsNumber;
    appState.editor.coffeeDialog.sequence = coffeeSequenceFor(
      appState.editor.coffeeDialog.quantities,
      appState.editor.coffeeDialog.sequence || [],
    );
    app.querySelector('#coffee-order-list').innerHTML = coffeeOrderList();
    return;
  }
  if (input.dataset.demand !== undefined && appState.editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    appState.editor.rows[+input.dataset.demand].demand = input.valueAsNumber;
    refreshWages();
    persistDraft();
    return;
  }
  if (input.dataset.salaryDiscount !== undefined && appState.editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    const row = appState.editor.rows[+input.dataset.index];
    row.salaryDiscounts = { ...row.salaryDiscounts, [input.dataset.salaryDiscount]: input.valueAsNumber };
    refreshWages();
    persistDraft();
    return;
  }
  if (input.dataset.wage !== undefined && appState.editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    appState.editor.wages[+input.dataset.wage] = input.valueAsNumber;
    refreshWages();
    persistDraft();
    return;
  }
  if (input.dataset.comparisonPrice !== undefined && appState.editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    const i = +input.dataset.comparisonPrice;
    appState.editor.rows[i].price = input.valueAsNumber;
    appState.editor.rows[i].basePrice = appState.editor.houseForm.basePrice ?? 10;
    if (appState.editor.houseForm.player === i) {
      appState.editor.houseForm.price = input.valueAsNumber;
    }
    if (appState.game.modules?.coffee) {
      appState.editor.houses
        .filter((h) => isCoffeeSale(h) && h.player === i)
        .forEach((h) => {
          h.price = input.valueAsNumber;
          h.basePrice = appState.editor.houseForm.basePrice ?? 10;
        });
      syncHouseRows();
      const list = app.querySelector('.house-list');
      if (list) list.outerHTML = houseList();
      app.querySelector('.sidebar-total strong').textContent = money(
        appState.editor.houses.reduce(
          (sum, h) => sum + calculateHouse(h, appState.editor.rows[h.player].milestones).total,
          0,
        ),
      );
    }
    refreshHousePrices();
    persistDraft();
    return;
  }
  if (input.dataset.house !== undefined && appState.editor?.wizard) {
    const key = input.dataset.house;
    if (key === 'number') appState.editor.houseForm.number = input.value;
    else {
      if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
      appState.editor.houseForm = selectGoods(appState.editor.houseForm, key, input.valueAsNumber);
    }
    refreshHousePrices();
    persistDraft();
    return;
  }
  if (input.dataset.row === undefined || !appState.editor) return;
  const i = +input.dataset.row;
  if (input.dataset.milestone) {
    appState.editor.rows[i].milestones[input.dataset.milestone] = input.checked;
    // Explicit CFO selection remains independent of the permanent milestone.
    const card = input.closest('.player-entry');
    card.querySelector('summary span').textContent =
      html`${milestoneList(appState.editor.rows[i].milestones, appState.game).filter(([key]) => appState.editor.rows[i].milestones[key]).length}
      aktiv`;
  } else {
    const value = input.type === 'checkbox' ? input.checked : input.valueAsNumber;
    if (typeof value === 'number' && (!input.validity.valid || !Number.isFinite(value))) return;
    if (appState.editor.type === 'salary') appState.editor.rows[i] = value;
    else appState.editor.rows[i][input.dataset.field] = value;
  }
  if (appState.editor.type === 'sale') refreshSaleCard(i);
  else document.querySelector(`#row-total-${i}`).textContent = money(appState.editor.rows[i] * 5);
  persistDraft();
}
export function handleChange(event) {
  const input = event.target;
  if (input.dataset.setupName !== undefined)
    appState.setupPlayers[+input.dataset.setupName].name = input.value;
}
