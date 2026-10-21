import { saleBreakdown } from '../accounting.js';
import { appState } from '../state.js';
import { html, htmlText, t } from '../i18n.js';
import { milestoneList } from '../rules.js';
import { app, esc, money, playerName } from './common.js';
import { outBeforeRound, previewRound } from '../round-state.js';

export function roundMilestones(row, i) {
  if (!row.milestones.newSet && !appState.game.modules?.coffee && !appState.game.modules?.ketchup) return '';
  return html`<details
    ><summary
      >Meilensteine dieser Runde
      <span
        >${milestoneList(row.milestones, appState.game).filter(([key]) => row.milestones[key]).length}
        aktiv</span
      ></summary
    ><div class="milestones"
      >${milestoneList(row.milestones, appState.game)
        .map(
          ([key, label, hint]) =>
            html`<label class="check"
              ><input
                type="checkbox"
                data-row="${i}"
                data-milestone="${key}"
                ${row.milestones[key] ? 'checked' : ''}
              /><span>${t(label)}<small>${t(hint)}</small></span></label
            >`,
        )
        .join('')}</div
    ></details
  >`;
}

export function numberField(label, key, row, value, max = 1000000) {
  return html`<label
    >${t(label)}<input
      type="number"
      inputmode="numeric"
      min="${key === 'price' ? -100 : 0}"
      max="${max}"
      step="1"
      required
      data-row="${row}"
      data-field="${key}"
      value="${value}"
  /></label>`;
}

export function fryChefField(row, i) {
  if (!appState.game.modules?.fryChef) return '';
  return html`<label class="waitress-field fry-chef-field"
    ><span>Friteusenköche</span><small>10 $ je beliefertem Haus und Koch · kein Kaffee</small
    ><div class="stepper"
      ><button
        data-action="fry-chef-count"
        data-index="${i}"
        data-delta="-1"
        aria-label="Ein Friteusenkoch weniger für ${esc(appState.game.players[i].name)}"
        >−</button
      ><input
        type="number"
        inputmode="numeric"
        min="0"
        max="1000000"
        step="1"
        required
        data-row="${i}"
        data-field="fryChefs"
        value="${row.fryChefs ?? 0}"
        aria-label="Anzahl Friteusenköche für ${esc(appState.game.players[i].name)}"
      /><button
        data-action="fry-chef-count"
        data-index="${i}"
        data-delta="1"
        aria-label="Ein Friteusenkoch mehr für ${esc(appState.game.players[i].name)}"
        >+</button
      ></div
    ></label
  >`;
}

export function waitressField(row, i) {
  return html`<label class="waitress-field"
    ><span>Bedienungen / Waitresses</span
    ><div class="stepper"
      ><button
        data-action="waitress-count"
        data-index="${i}"
        data-delta="-1"
        aria-label="Eine Waitress weniger für ${esc(appState.game.players[i].name)}"
        >−</button
      ><input
        type="number"
        inputmode="numeric"
        min="0"
        max="1000000"
        step="1"
        required
        data-row="${i}"
        data-field="waitresses"
        value="${row.waitresses}"
        aria-label="Anzahl Waitresses für ${esc(appState.game.players[i].name)}"
      /><button
        data-action="waitress-count"
        data-index="${i}"
        data-delta="1"
        aria-label="Eine Waitress mehr für ${esc(appState.game.players[i].name)}"
        >+</button
      ></div
    ><small
      >${row.milestones.waitress ? t('Meilenstein aktiv: 5 $') : '3 $'} Trinkgeld je Waitress</small
    ></label
  >`;
}

export function cfoContent(row) {
  const active = row.cfo || row.milestones.cfo;
  return html`<span class="cfo-icon" aria-hidden="true">${row.milestones.cfo ? '◆' : active ? '✓' : '+'}</span
    ><span class="cfo-label"
      ><strong>CFO +50 %</strong
      ><small
        >${row.milestones.cfo ? t('Meilenstein · dauerhaft aktiv') : active ? t('Bonus auf Einnahmen und Trinkgeld') : t('Bonus für diese Runde einschalten')}</small
      ></span
    ><span class="cfo-state">${active ? t('Aktiv') : t('Inaktiv')}</span>`;
}

export function cfoButton(row, i) {
  const active = row.cfo || row.milestones.cfo;
  return html`<button
    class="cfo-toggle ${active ? 'is-active' : ''} ${row.milestones.cfo ? 'is-milestone' : ''}"
    data-action="toggle-cfo"
    data-index="${i}"
    aria-pressed="${Boolean(active)}"
    aria-label="CFO für ${esc(appState.game.players[i].name)}${row.milestones.cfo ? t(', durch Meilenstein dauerhaft aktiv') : ''}"
    ${row.milestones.cfo ? 'disabled' : ''}
    >${cfoContent(row)}</button
  >`;
}

export function calculationLines(row, i) {
  try {
    const settlement = appState.editor.wizard ? previewRound() : null;
    if (settlement?.needsReserve)
      return htmlText('<p class="hint">Bitte zuerst die Reservekarten aufdecken.</p>');
    row = settlement?.rows?.[i] ?? row;
    const c = saleBreakdown(row, settlement?.details?.[i]);
    const active = row.cfo || row.milestones.cfo;
    return html`<dl
      ><div
        ><dt>Einnahmen<small>Waren inkl. Meilensteinboni</small></dt
        ><dd>${money(c.revenue + c.bonus)}</dd></div
      >${
        appState.game.modules?.coffee
          ? html`<div
              ><dt>+ Kaffee<small>${row.coffee ?? 0} Stück · ohne Getränkebonus</small></dt
              ><dd>${money(c.coffeeRevenue)}</dd></div
            >`
          : ''
      }<div
        ><dt>+ Waitresses<small>${row.waitresses} × ${money(row.milestones.waitress ? 5 : 3)}</small></dt
        ><dd>${money(c.tips)}</dd></div
      >${
        appState.game.modules?.fryChef
          ? html`<div
              ><dt>+ Friteusenköche<small>${row.fryChefs ?? 0} × ${c.fryHouses} Häuser × 10 $</small></dt
              ><dd>${money(c.fry)}</dd></div
            >`
          : ''
      }<div
        ><dt
          >+ CFO<small>${active ? html`50 % auf ${money(c.cfoBase)} · aufgerundet` : t('Inaktiv')}</small></dt
        ><dd>${money(c.cfo)}</dd></div
      ><div class="calculation-total"
        ><dt>Gesamtergebnis</dt><dd id="row-total-${i}">${money(c.total)}</dd></div
      ></dl
    >`;
  } catch {
    return htmlText('<p class="hint">Bitte die Verkaufseingaben prüfen.</p>');
  }
}

export function roundCalculation(row, i) {
  return html`<div class="round-calculation" id="row-calculation-${i}" aria-live="polite"
    >${calculationLines(row, i)}</div
  >`;
}

export function refreshSaleCard(i) {
  const row = appState.editor.rows[i];
  document.querySelector(`#row-calculation-${i}`).innerHTML = calculationLines(row, i);
  const button = app.querySelector(`[data-action="toggle-cfo"][data-index="${i}"]`);
  const active = Boolean(row.cfo || row.milestones.cfo);
  button.classList.toggle('is-active', active);
  button.classList.toggle('is-milestone', row.milestones.cfo);
  button.disabled = row.milestones.cfo;
  button.setAttribute('aria-pressed', String(active));
  button.innerHTML = cfoContent(row);
  const rate = app
    .querySelector(`[data-row="${i}"][data-field="waitresses"]`)
    .closest('label')
    .querySelector('small');
  rate.textContent = html`${row.milestones.waitress ? t('Meilenstein aktiv: 5 $') : '3 $'} Trinkgeld je
  Waitress`;
}

export function renderExtrasStep(target) {
  target.innerHTML = html`<div class="entry-grid"
      >${appState.game.players.map((p, i) => html`<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3><fieldset class="employee-fields" ${outBeforeRound(i) ? 'disabled' : ''}>${outBeforeRound(i) ? htmlText('<p class="hint">Ausgeschieden</p>') : ''}${roundMilestones(appState.editor.rows[i], i)}${waitressField(appState.editor.rows[i], i)}${fryChefField(appState.editor.rows[i], i)}${cfoButton(appState.editor.rows[i], i)}${roundCalculation(appState.editor.rows[i], i)}</fieldset></article>`).join('')}</div
    ><div class="commit-bar"
      ><button class="secondary" data-action="sales-step" data-step="houses">← Häuser</button
      ><button data-action="sales-step" data-step="wages">Weiter zu den Löhnen →</button></div
    >`;
}
