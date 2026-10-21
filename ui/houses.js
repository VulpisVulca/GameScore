import { houseUnitPrice } from '../rules.js';
import { html, htmlText, t } from '../i18n.js';
import { app, esc, money, playerName } from './common.js';
import { appState } from '../state.js';
import {
  availableHouses,
  coffeeDraftQuantities,
  coffeeForm,
  coffeeQuantity,
  coffeeRecords,
  coffeeSequenceFor,
  currentRound,
  editableGarden,
  editablePark,
  formGoods,
  houseAlreadyUsed,
  mealHouses,
  normalizeHouseDraft,
  playerOut,
  rawPlayerPrice,
  visibleGardenKind,
  visiblePark,
} from '../round-state.js';
import { houseDescription, houseLabel, houseSetting } from './house-labels.js';
import { hasMeal, sushiAvailable } from '../selection.js';
import { COFFEE, GOODS, NOODLES, SUSHI, calculateHouse, isCoffeeSale, milestoneList } from '../rules.js';
import { houseId, houseOptions, isApartment, isRural } from '../houses.js';
import { renderReserve } from './reserve.js';

export function houseBankStatus(state) {
  return html`<div class="sales-bank-status" aria-live="polite"
      ><span>${t('Bank während der Verkäufe')}: <strong>${money(state.bank)}</strong></span
      ><span
        >${t('Grundpreis')}:
        <strong>${money(appState.editor.houseForm.basePrice ?? state.basePrice)}</strong></span
      ></div
    >${state.firstBreakAt?.round === currentRound() ? html`<p class="hint">${state.firstBreakAt.house ? html`Erster Bankbruch bei ${houseLabel(state.firstBreakAt.house)}.` : t('Die erste Bankreserve wurde geöffnet.')} ${appState.game.modules?.reservePrices ? html`Neuer Grundpreis für folgende Verkäufe: ${money(state.basePrice)}.` : ''}</p>` : ''}${state.secondBreak !== null ? htmlText('<p class="round-warning">Die Bank ist zum zweiten Mal gebrochen. Alle verbleibenden Häuser noch abrechnen; danach entfallen die Löhne.</p>') : ''}${state.issues.length ? html`<p class="round-warning">${esc(state.issues.join(' '))}</p>` : ''}${appState.game.modules?.fryChef ? html`<p class="hint">Friteusenköche vor den Verkäufen einstellen: Ihr Bonus wird direkt je Haus bezahlt. <button class="text-button" data-action="sales-step" data-step="extras">Friteusenköche einstellen</button></p>` : ''}<p
      class="hint"
      >Häuser werden nach Hausnummer abgerechnet, das ländliche Gebiet zuletzt. Kaffee wird vor dem Essen
      bezahlt.</p
    >`;
}

export function kimchiButton() {
  if (!appState.game.modules?.kimchi || coffeeForm()) return '';
  const active = Boolean(appState.editor.houseForm.kimchi);
  return html`<button
      type="button"
      class="secondary kimchi-toggle ${active ? 'is-active' : ''}"
      data-action="house-kimchi"
      aria-pressed="${active}"
      title="Ein zusätzliches Stück zum Stückpreis"
      ${hasMeal(appState.editor.houseForm) ? '' : 'disabled'}
      >🥬 Kimchi${active ? ' ✓' : ''}</button
    ><small class="food-rule-hint kimchi-rule"
      >1 extra zur vollständigen Bestellung; wird immer bevorzugt.</small
    >`;
}

export function coffeeFormButton() {
  if (!appState.game.modules?.coffee || coffeeForm()) return '';
  const quantities = coffeeDraftQuantities(),
    total = quantities.reduce((sum, n) => sum + n, 0);
  return html`<button
      type="button"
      class="secondary coffee-form-button"
      data-action="open-coffee-dialog"
      aria-haspopup="dialog"
      >☕ Kaffee${total ? html`<span class="coffee-count-badge">${total}</span>` : ''}</button
    >${total ? html`<div class="coffee-form-summary">${quantities.map((n, i) => (n ? html`<span>${playerName(appState.game.players[i])} <b>${n} ☕</b></span>` : '')).join('')}</div>` : ''}`;
}

export function coffeePanel(house) {
  if (!appState.game.modules?.coffee || !coffeeRecords(house).length) return '';
  return html`<section class="house-coffee-summary" aria-label="Kaffee für ${esc(house.number)}"
    ><div class="house-coffee-heading"><strong>☕ Kaffee</strong><small>Erlös ohne CFO</small></div
    ><div class="house-coffee-chips"
      >${appState.game.players
        .map((p, player) => {
          const quantity = coffeeQuantity(house, player);
          if (!quantity) return '';
          const income = coffeeRecords(house, player).reduce(
            (sum, h) => sum + calculateHouse(h, appState.editor.rows[player].milestones).total,
            0,
          );
          return html`<span class="house-coffee-chip"
            >${playerName(p)} <b>${quantity} ☕</b><small>${money(income)}</small></span
          >`;
        })
        .join('')}</div
    ></section
  >`;
}

export function coffeeOrderList() {
  const sequence = appState.editor.coffeeDialog?.sequence;
  return sequence
    ? sequence
        .map(
          (player, i) =>
            html`<div class="coffee-order-item"
              ><span>${i + 1}. ${playerName(appState.game.players[player])}</span
              ><button
                type="button"
                class="secondary"
                data-action="coffee-order"
                data-index="${i}"
                data-delta="-1"
                ${i === 0 ? 'disabled' : ''}
                aria-label="Kaffee früher"
                >↑</button
              ><button
                type="button"
                class="secondary"
                data-action="coffee-order"
                data-index="${i}"
                data-delta="1"
                ${i === sequence.length - 1 ? 'disabled' : ''}
                aria-label="Kaffee später"
                >↓</button
              ></div
            >`,
        )
        .join('')
    : '';
}

export function coffeeOrderControls() {
  return html`<details class="coffee-order"
    ><summary>Reihenfolge der Kaffees</summary
    ><p class="hint"
      >In Reihenfolge entlang des Weges anordnen. Bei einem Bankbruch kann sich der Preis zwischen zwei
      Kaffees ändern.</p
    ><div id="coffee-order-list">${coffeeOrderList()}</div></details
  >`;
}

export function renderCoffeeDialog() {
  const state = appState.editor.coffeeDialog;
  const house = state?.index === null ? appState.editor.houseForm : appState.editor.houses[state?.index];
  return html`<dialog
    id="coffee-dialog"
    class="house-picker coffee-dialog"
    aria-labelledby="coffee-dialog-title"
    ><div class="house-picker-heading"
      ><div
        ><h2 id="coffee-dialog-title">☕ Kaffee</h2
        ><small>${house?.number ? houseLabel(house.number) : t('Für dieses Haus')}</small></div
      ><button class="text-button" data-action="cancel-coffee-dialog" aria-label="Schließen">×</button></div
    ><div class="coffee-dialog-players"
      >${appState.game.players
        .map(
          (p, i) =>
            html`<label class="coffee-dialog-player"
              ><strong>${playerName(p)}</strong
              ><div class="stepper"
                ><button
                  type="button"
                  data-action="coffee-dialog-count"
                  ${playerOut(i) ? 'disabled' : ''}
                  data-player="${i}"
                  data-delta="-1"
                  aria-label="Ein Kaffee weniger für ${esc(p.name)}"
                  >−</button
                ><input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="1000000"
                  step="1"
                  required
                  ${playerOut(i) ? 'disabled' : ''}
                  data-dialog-coffee="${i}"
                  value="${state?.quantities[i] ?? 0}"
                  aria-label="Kaffees für ${esc(p.name)}"
                /><button
                  type="button"
                  data-action="coffee-dialog-count"
                  data-player="${i}"
                  data-delta="1"
                  aria-label="Ein Kaffee mehr für ${esc(p.name)}"
                  >+</button
                ></div
              ></label
            >`,
        )
        .join('')}</div
    >${coffeeOrderControls()}<div class="coffee-dialog-actions"
      ><button class="secondary" data-action="cancel-coffee-dialog">Abbrechen</button
      ><button data-action="confirm-coffee-dialog">Übernehmen ✓</button></div
    ></dialog
  >`;
}

export function openCoffeeDialog(index = null) {
  if (!appState.game.modules?.coffee) return;
  if (index === appState.editor.editingHouse) index = null;
  const parent = index === null ? null : appState.editor.houses[index];
  if (index !== null && (!parent || isCoffeeSale(parent))) return;
  const quantities =
    index === null ? coffeeDraftQuantities() : appState.game.players.map((_, i) => coffeeQuantity(parent, i));
  const meal = index === null ? appState.editor.houseForm : parent;
  appState.editor.coffeeDialog = {
    index,
    quantities,
    sequence: coffeeSequenceFor(quantities, meal.coffeeSequence || []),
  };
  app.querySelector('#coffee-dialog').outerHTML = renderCoffeeDialog();
  app.querySelector('#coffee-dialog').showModal();
}

export function houseList(editable = true) {
  const meals = appState.editor.houses
    .map((house, i) => ({ house, i }))
    .filter(({ house }) => !isCoffeeSale(house));
  return meals.length
    ? html`<div class="house-list"
        >${meals
          .map(
            ({ house, i }) =>
              html`<article class="house-item" data-house-card="${i}"
                ><div class="house-number"
                  ><span>${house.type === 'garden' ? '♧' : '⌂'}</span
                  ><strong>${houseLabel(house.number || html`Haus ${i + 1}`)}</strong
                  ><small>${houseSetting(house)}</small></div
                ><div class="house-detail"
                  ><div class="house-detail-heading"
                    ><strong>${playerName(appState.game.players[house.player])}</strong
                    >${editable ? html`<div class="house-actions"><button class="text-button" data-action="edit-house" data-index="${i}" aria-label="${esc(house.number || html`Haus ${i + 1}`)} bearbeiten">Bearbeiten</button><button class="text-button danger" data-action="remove-house" data-index="${i}" aria-label="${esc(house.number || html`Haus ${i + 1}`)} entfernen">Entfernen</button></div>` : ''}</div
                  ><span>${houseDescription(house)}</span></div
                ><strong
                  >${money(calculateHouse(house, appState.editor.rows[house.player].milestones).total)}</strong
                >${coffeePanel(house, i, editable)}</article
              >`,
          )
          .join('')}</div
      >`
    : htmlText(
        '<div class="empty-houses"><span>⌂</span><p>Noch kein Haus erfasst.</p><small>Verkäufe hinzufügen oder nur Bedienungen abrechnen.</small></div>',
      );
}

export function parkControl(h) {
  if (!appState.game.modules?.lobbyist || isRural(h.number)) return '';
  const enabled = Boolean(h.park);
  return html`<button
      class="choice park-toggle ${enabled ? 'selected' : ''}"
      data-action="house-park"
      aria-pressed="${enabled}"
      ${!houseOptions(appState.game).includes(houseId(h.number)) || (enabled && !editablePark(h.number)) ? 'disabled' : ''}
      ><span class="type-icon" aria-hidden="true">🌳</span
      ><span
        >Park angrenzend<small
          >${h.type === 'garden' ? t('Dreifacher Stückpreis mit Garten') : t('Doppelter Stückpreis mit Park')}</small
        ></span
      ></button
    >${editablePark(h.number) ? htmlText('<p class="hint">In dieser Baurunde kannst du den Park korrigieren. Spätere Verkäufe dieses Hauses werden neu berechnet.</p>') : ''}`;
}

export function goodsCounter([key, label, icon]) {
  const h = appState.editor.houseForm,
    disabled = key === 'sushi' && !sushiAvailable(h);
  const hint =
    key === 'sushi'
      ? t('Nur Garten: gesamte Nachfrage 1:1; vor normalen Waren. Kimchi hat Vorrang.')
      : key === 'noodles'
        ? t('Gesamte Nachfrage 1:1; normale Waren gehen vor. Kimchi hat Vorrang.')
        : '';
  return html`<label class="goods-counter"
    ><span>${icon} ${t(label)}</span
    ><small class="goods-unit-price" data-goods-price="${key}">${goodsUnitPrice(key)}</small
    ><div class="stepper"
      ><button
        data-action="house-count"
        data-field="${key}"
        data-delta="-1"
        aria-label="${t(label)} weniger"
        ${disabled ? 'disabled' : ''}
        >−</button
      ><input
        type="number"
        inputmode="numeric"
        min="0"
        max="1000000"
        step="1"
        required
        data-house="${key}"
        value="${h[key] ?? 0}"
        aria-label="Anzahl ${t(label)}"
        ${disabled ? 'disabled' : ''}
      /><button
        data-action="house-count"
        data-field="${key}"
        data-delta="1"
        aria-label="${t(label)} mehr"
        ${disabled ? 'disabled' : ''}
        >+</button
      ></div
    >${hint ? html`<small class="food-rule-hint">${hint}</small>` : ''}</label
  >`;
}

export function goodsSelection() {
  if (coffeeForm()) return html`<div class="house-goods">${goodsCounter(COFFEE)}</div>`;
  return html`<div class="house-goods">${GOODS.map(goodsCounter).join('')}</div
    ><div class="food-addons-row"
      >${appState.game.modules?.sushi ? goodsCounter(SUSHI) : ''}${appState.game.modules?.noodles ? goodsCounter(NOODLES) : ''}${appState.game.modules?.kimchi ? html`<div class="food-addon-control">${kimchiButton()}</div>` : ''}${appState.game.modules?.coffee ? html`<div class="food-addon-control">${coffeeFormButton()}<small class="food-rule-hint">Unterwegs zum Restaurant; 1 je passierter Filiale.</small></div>` : ''}</div
    >`;
}

export function refreshGoodsControls() {
  for (const [key] of formGoods()) {
    const input = app.querySelector('[data-house="' + key + '"]');
    if (input) {
      input.value = appState.editor.houseForm[key] ?? 0;
      input.disabled = key === 'sushi' && !sushiAvailable(appState.editor.houseForm);
    }
    app
      .querySelectorAll('[data-action="house-count"][data-field="' + key + '"]')
      .forEach((b) => (b.disabled = key === 'sushi' && !sushiAvailable(appState.editor.houseForm)));
  }
  const kimchi = app.querySelector('[data-action="house-kimchi"]');
  if (kimchi) {
    kimchi.disabled = !hasMeal(appState.editor.houseForm);
    kimchi.classList.toggle('is-active', Boolean(appState.editor.houseForm.kimchi));
    kimchi.setAttribute('aria-pressed', String(Boolean(appState.editor.houseForm.kimchi)));
    kimchi.innerHTML = html`🥬 Kimchi${appState.editor.houseForm.kimchi ? ' ✓' : ''}`;
  }
}

export function renderHousePicker() {
  const selected = houseId(appState.editor.houseForm.number);
  return html`<dialog id="house-picker" class="house-picker" aria-labelledby="house-picker-title"
    ><div class="house-picker-heading"
      ><h2 id="house-picker-title">Haus wählen</h2
      ><button class="text-button" data-action="close-house-picker" aria-label="Schließen">×</button></div
    ><div class="house-picker-legend"
      ><span><i class="house-key"></i>Ohne Garten</span><span><i class="house-key native"></i>Mit Garten</span
      ><span><i class="house-key built"></i>Garten gebaut</span></div
    ><div class="house-number-grid"
      >${availableHouses()
        .map((number) => {
          const kind = visibleGardenKind(number),
            used = houseAlreadyUsed(number),
            park = visiblePark(number);
          return html`<button
            class="house-tile ${kind === 'native' ? 'native-garden' : kind === 'built' ? 'built-garden' : ''} ${selected === number ? 'selected' : ''}"
            data-action="select-house"
            data-number="${number}"
            aria-label="Haus ${number} · ${kind === 'native' ? t('Mit Garten') : kind === 'built' ? t('Garten gebaut') : t('Ohne Garten')}"
            aria-pressed="${selected === number}"
            ${used ? 'disabled' : ''}
            ><strong
              >${isRural(number) ? t('Land') : number}${park ? html` <span class="park-marker" aria-label="Park">🌳</span>` : ''}</strong
            ><small
              >${used ? t('Bereits erfasst') : isRural(number) ? t('Zuletzt beliefern') : isApartment(number) ? t('Apartment') : kind === 'built' ? t('Garten gebaut') : kind === 'native' ? t('Mit Garten') : t('Ohne Garten')}</small
            ></button
          >`;
        })
        .join('')}</div
    ><p class="hint">Gebaute Gärten bleiben für diese Partie gespeichert.</p></dialog
  >`;
}

export function housePreview() {
  if (appState.editor.houseForm.player === null) return t('Spieler auswählen');
  try {
    return money(
      calculateHouse(
        appState.editor.houseForm,
        appState.editor.rows[appState.editor.houseForm.player].milestones,
      ).total,
    );
  } catch {
    return '0 $';
  }
}

export const MILESTONE_TAGS = {
  burger: 'Burger +5 $',
  pizza: 'Pizza +5 $',
  drink: 'Getränke +5 $',
  waitress: 'Waitress 5 $',
  price: 'Stückpreis −1 $',
  cfo: 'CFO +50 %',
  marketeer: 'Marketing +5 $ · Entfernung −2',
  salary: 'Löhne 3 $',
  beer: 'Warenzahlung',
  discount: 'Bank −100 $ ab 3 $ Rabatt',
  trainer: 'Trainer · Mitarbeiter bleiben',
  ketchup: 'Ketchup · Entfernung −1',
};

export function comparisonPrice(i) {
  const raw = rawPlayerPrice(i);
  return raw - (appState.editor.rows[i].milestones.price ? 1 : 0);
}

export function comparisonValue(i) {
  const price = comparisonPrice(i);
  const reduction =
    (appState.editor.rows[i].milestones.marketeer ? 2 : 0) +
    (appState.editor.rows[i].milestones.ketchup ? 1 : 0);
  return reduction && !coffeeForm()
    ? html`${money(price - reduction)}<small>Vergleich · Zahlung: ${money(price)}</small>`
    : money(price);
}

export function playerChoices() {
  return html`<div class="player-options"
    >${appState.game.players
      .map(
        (p, i) =>
          html`<div class="player-option"
            ><button
              class="choice ${appState.editor.houseForm.player === i ? 'selected' : ''}"
              style="--player-color:${p.color}"
              data-action="house-player"
              data-index="${i}"
              aria-pressed="${appState.editor.houseForm.player === i}"
              ${playerOut(i) ? 'disabled' : ''}
              ><span class="player-choice-name">${playerName(p)}</span
              ><small class="player-unit-price" data-player-price="${i}"
                >${money(comparisonPrice(i))} / Ware</small
              ></button
            ><div class="milestone-tags" aria-label="Meilensteine von ${esc(p.name)}"
              >${
                milestoneList(appState.editor.rows[i].milestones, appState.game)
                  .filter(([key]) => appState.editor.rows[i].milestones[key])
                  .map(
                    ([key, label, hint]) =>
                      html`<span class="milestone-tag" title="${esc(t(label))}: ${esc(t(hint))}"
                        >${t(MILESTONE_TAGS[key])}</span
                      >`,
                  )
                  .join('') || htmlText('<span class="no-milestones">Keine Meilensteine</span>')
              }</div
            ></div
          >`,
      )
      .join('')}</div
  >`;
}

export function goodsUnitPrice(key) {
  const i = appState.editor.houseForm.player;
  if (i === null) return t('Spieler wählen');
  const m = appState.editor.rows[i].milestones;
  return html`${money(houseUnitPrice({ ...appState.editor.houseForm, price: rawPlayerPrice(i) }, key, m))} /
  Stück`;
}

export function priceComparison() {
  return html`<section class="price-comparison"
    ><div class="sidebar-heading"><h2>${coffeeForm() ? t('Kaffeepreise') : t('Preisvergleich')}</h2></div
    ><p class="comparison-intro"
      >Stückpreise aller Spieler auf einen
      Blick.${appState.game.modules?.reservePrices ? html` ${t('Grundpreis')}: ${money(appState.editor.houseForm.basePrice ?? appState.editor.rows[0].basePrice ?? 10)}` : ''}</p
    ><div class="comparison-columns"
      ><span>Spieler</span><span>Basispreis</span
      ><span
        >${(appState.game.milestoneSet === 'new' || appState.game.modules?.ketchup) && !coffeeForm() ? t('Vergleichspreis') : t('Stückpreis')}</span
      ></div
    >${appState.game.players
      .map(
        (p, i) =>
          html`<div class="comparison-row"
            ><span>${playerName(p)}</span
            ><label
              ><span class="sr-only">Basispreis vor Preis-Meilenstein für ${esc(p.name)}</span
              ><div class="stepper"
                ><button
                  type="button"
                  data-action="price-count"
                  data-index="${i}"
                  data-delta="-1"
                  aria-label="Basispreis für ${esc(p.name)} um 1 Dollar senken"
                  >−</button
                ><input
                  type="number"
                  inputmode="numeric"
                  min="-100"
                  max="100"
                  step="1"
                  required
                  data-comparison-price="${i}"
                  value="${rawPlayerPrice(i)}"
                /><button
                  type="button"
                  data-action="price-count"
                  data-index="${i}"
                  data-delta="1"
                  aria-label="Basispreis für ${esc(p.name)} um 1 Dollar erhöhen"
                  >+</button
                ></div
              ></label
            ><strong data-comparison-unit="${i}">${comparisonValue(i)}</strong></div
          >`,
      )
      .join(
        '',
      )}${coffeeForm() ? htmlText('<p class="hint">Kaffee wird entlang der am Brett bestimmten Route gekauft. Preis und Marketeer-Entfernungsbonus ändern diese Route nicht.</p>') : appState.game.milestoneSet === 'new' ? html`<p class="hint">${t('Marketeer: −2 nur für den Vergleich Preis + Entfernung, nicht für die Zahlung.')} ${html`Discount Manager: Bei mindestens 3 $ Mitarbeiter-Rabatt auf den Grundpreis von ${money(appState.editor.rows[0].basePrice ?? 10)} werden 100 $ aus der Bank entfernt, auch ohne Verkauf.`}</p>` : htmlText('<p class="hint">Basispreis an Mitarbeiter anpassen. Der −1-$-Meilenstein ist im Stückpreis bereits enthalten. Warenboni und CFO erhöhen die Einnahmen.</p>')}</section
  >`;
}

export function refreshHousePrices() {
  refreshGoodsControls();
  appState.game.players.forEach((_, i) => {
    document.querySelector(`[data-player-price="${i}"]`).textContent = html`${money(comparisonPrice(i))} /
    Ware`;
    document.querySelector(`[data-comparison-unit="${i}"]`).innerHTML = comparisonValue(i);
  });
  formGoods().forEach(([key]) => {
    document.querySelector(`[data-goods-price="${key}"]`).textContent = goodsUnitPrice(key);
  });
  document.querySelector('#house-income').textContent = housePreview();
  document.querySelector('#house-payment-label').textContent = housePreview().startsWith('-')
    ? t('Zahlung an die Bank')
    : t('Verkauf inkl. Meilensteinen');
}

export function renderHouseStep(target) {
  const live = normalizeHouseDraft();
  if (live.needsReserve) {
    renderReserve(target, true);
    return;
  }

  const h = appState.editor.houseForm;
  target.innerHTML = html`${houseBankStatus(live)}<div class="house-layout"
      ><section class="panel house-form"
        ><div class="form-title"
          ><h2
            >${coffeeForm() ? t('Kaffee verkaufen') : appState.editor.editingHouse === null ? html`Verkauf ${mealHouses().length + 1}` : t('Verkauf bearbeiten')}</h2
          ><div class="house-selector"
            ><span>Hausnummer</span
            ><button
              class="secondary house-picker-trigger"
              data-action="open-house-picker"
              aria-haspopup="dialog"
              >${h.number ? houseLabel(h.number) : t('Haus wählen')}<small
                >${h.park ? html`🌳 ${t('Park')} · ` : ''}${visibleGardenKind(h.number) === 'built' ? t('Garten gebaut') : visibleGardenKind(h.number) === 'native' ? t('Mit Garten') : t('Hausnummer auswählen')}</small
              ></button
            ></div
          ></div
        ><fieldset
          ><legend
            >${coffeeForm() ? t('1. Wer verkauft den Kaffee?') : t('1. Wer beliefert das Haus?')}</legend
          >${playerChoices()}</fieldset
        ><fieldset
          ><legend>2. Was wurde verkauft?</legend
          >${goodsSelection()}${coffeeForm() ? htmlText('<p class="goods-price-note">Kaffee: ein Stück je passierter Filiale. Route am Brett bestimmen. Der Zielbetrieb verkauft keinen Kaffee. Kein Getränkemeilenstein.</p>') : htmlText(appState.game.modules?.lobbyist ? '<p class="goods-price-note">Erlös je Stück inkl. Meilenstein-, Garten- und Parkbonus, ohne CFO.</p>' : '<p class="goods-price-note">Erlös je Stück inkl. Meilenstein- und Gartenbonus, ohne CFO.</p>')}</fieldset
        >${
          !coffeeForm()
            ? html`<fieldset
                ><legend>3. Welches Haus?</legend
                ><div class="house-types"
                  >${[
                    [
                      'normal',
                      '⌂',
                      t('Ohne Garten'),
                      t(h.park ? 'Doppelter Stückpreis' : 'Einfacher Stückpreis'),
                    ],
                    [
                      'garden',
                      '♧',
                      t('Mit Garten'),
                      t(h.park ? 'Dreifacher Stückpreis' : 'Doppelter Stückpreis'),
                    ],
                  ]
                    .map(
                      ([type, icon, label, hint]) =>
                        html`<button
                          class="choice ${h.type === type ? 'selected' : ''}"
                          data-action="house-type"
                          data-type="${type}"
                          aria-pressed="${h.type === type}"
                          ${coffeeForm() || (type === 'normal' && visibleGardenKind(h.number) !== 'none' && !editableGarden(h.number)) || (type === 'garden' && (isApartment(h.number) || isRural(h.number))) ? 'disabled' : ''}
                          ><span class="type-icon">${icon}</span
                          ><span>${t(label)}<small>${t(hint)}</small></span></button
                        >`,
                    )
                    .join('')}</div
                >${parkControl(h)}${coffeeForm() ? htmlText('<p class="hint">Der Gartenstatus wird vom Essensverkauf dieses Hauses übernommen.</p>') : ''}${isRural(h.number) ? htmlText('<p class="hint">Das ländliche Gebiet wird zuletzt beliefert und hat weder Garten noch Park.</p>') : ''}${isApartment(h.number) ? htmlText('<p class="hint">Apartments können keinen Garten haben.</p>') : ''}${editableGarden(h.number) ? htmlText('<p class="hint">In dieser Baurunde kannst du den Garten korrigieren. Die Änderung wird mit der Runde bestätigt; spätere Verkäufe dieses Hauses werden neu berechnet.</p>') : ''}</fieldset
              >`
            : ''
        }<div class="house-price"
          ><div
            ><span id="house-payment-label"
              >${housePreview().startsWith('-') ? t('Zahlung an die Bank') : t('Verkauf inkl. Meilensteinen')}</span
            ><strong id="house-income">${housePreview()}</strong
            ><small>Trinkgeld und CFO folgen in Schritt 2.</small></div
          ></div
        ><div class="house-form-actions"
          >${appState.editor.editingHouse !== null || coffeeForm() ? htmlText('<button class="secondary" data-action="cancel-house">Abbrechen</button>') : ''}<button
            data-action="save-house"
            >${coffeeForm() ? t('Kaffee speichern') : appState.editor.editingHouse !== null ? t('Verkauf speichern') : t('Haus übernehmen & nächstes')}
            →</button
          ></div
        ></section
      ><aside class="house-sidebar"
        >${priceComparison()}<div class="sidebar-heading"
          ><h2>Diese Runde</h2
          ><span>${mealHouses().length} ${mealHouses().length === 1 ? t('Haus') : t('Häuser')}</span></div
        >${houseList()}<div class="sidebar-total"
          ><span>Warenumsatz inkl. Meilensteinen</span
          ><strong
            >${money(appState.editor.houses.reduce((sum, house) => sum + calculateHouse(house, appState.editor.rows[house.player].milestones).total, 0))}</strong
          ></div
        ><button class="secondary" data-action="sales-step" data-step="extras"
          >Essenszeit abschließen →</button
        ></aside
      ></div
    >`;
}
