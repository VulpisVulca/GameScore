import { html, htmlText, t } from '../i18n.js';
import { esc, money, playerName } from './common.js';
import { appState } from '../state.js';
import { previewRound } from '../round-state.js';
import { salaryPayment, salaryRate } from '../rules.js';
import { renderReserve } from './reserve.js';
import { bankNotice, insolvencyNotice } from './round-notices.js';

export function demandField(row, i) {
  if (!row.milestones.marketeer) return '';
  return html`<label class="waitress-field"
    ><span>Nachfragemarker durch eigenes Marketing</span
    ><div class="stepper"
      ><button
        data-action="demand-count"
        data-index="${i}"
        data-delta="-1"
        aria-label="Ein Nachfragemarker weniger"
        >−</button
      ><input
        type="number"
        inputmode="numeric"
        min="0"
        max="1000000"
        step="1"
        required
        data-demand="${i}"
        value="${row.demand ?? 0}"
        aria-label="Nachfragemarker für ${esc(appState.game.players[i].name)}"
      /><button
        data-action="demand-count"
        data-index="${i}"
        data-delta="1"
        aria-label="Ein Nachfragemarker mehr"
        >+</button
      ></div
    ><small
      >5 $ je Marker · nach Löhnen, ohne CFO. Nur durch eigene Marketeers platzierte Marker zählen.</small
    ></label
  >`;
}

export function wageCardCalculation(i, settlement = previewRound()) {
  if (settlement.ended) return '';
  if (settlement.afterSales.bankrupt[i] !== null)
    return htmlText('<p class="hint">Ausgeschieden · keine weiteren Löhne oder Marketingeinnahmen.</p>');
  const cost = settlement.expenses[i];
  return html`<dl
    ><div><dt>Bisheriger Stand</dt><dd>${money(settlement.before.balances[i])}</dd></div
    ><div><dt>+ Einnahmen</dt><dd>${money(settlement.incomes[i])}</dd></div
    ><div><dt>− Ausgaben / Löhne</dt><dd>${money(cost)}</dd></div
    >${settlement.marketing[i] ? html`<div><dt>+ Marketing nach Löhnen</dt><dd>${money(settlement.marketing[i])}</dd></div>` : ''}<div
      class="calculation-total"
      ><dt>Neuer Stand</dt><dd>${money(settlement.balances[i])}</dd></div
    ></dl
  >`;
}

export function salaryDiscountFields(row, i) {
  if (appState.game.milestoneSet !== 'new') return '';
  return html`<div class="salary-discounts"
    >${[
      ['recruiting', t('Recruiting Manager')],
      ['hr', t('HR Director')],
    ]
      .map(
        ([key, label]) =>
          html`<label
            ><span>${label}</span><small>Ungenutzte Recruiting-Aktionen · je 5 $ Rabatt</small
            ><div class="stepper"
              ><button
                data-action="salary-discount-count"
                data-index="${i}"
                data-key="${key}"
                data-delta="-1"
                aria-label="${label} weniger"
                >−</button
              ><input
                type="number"
                inputmode="numeric"
                min="0"
                max="1000000"
                step="1"
                required
                data-salary-discount="${key}"
                data-index="${i}"
                value="${row.salaryDiscounts?.[key] ?? 0}"
                aria-label="Ungenutzte Recruiting-Aktionen: ${label}"
              /><button
                data-action="salary-discount-count"
                data-index="${i}"
                data-key="${key}"
                data-delta="1"
                aria-label="${label} mehr"
                >+</button
              ></div
            ></label
          >`,
      )
      .join('')}</div
  >`;
}

export function salaryCalculation(i, settlement) {
  if (appState.game.milestoneSet !== 'new' || settlement.afterSales.bankrupt[i] !== null) return '';
  const row = appState.editor.rows[i],
    c =
      settlement.salaryDetails?.[i] ??
      salaryPayment(row, appState.editor.wages[i], settlement.afterSales.balances[i]);
  return html`<p class="salary-equation"
      >${appState.editor.wages[i]} × ${money(salaryRate(row))} − ${money(c.discount)} =
      <strong>${money(c.due)}</strong></p
    >${row.milestones.trainer ? html`<p class="hint trainer-note">${c.shortfall ? html`Trainer-Meilenstein: Ihr zahlt nur ${money(c.paid)} verfügbares Geld. ${money(c.shortfall)} entfallen; niemand muss entlassen werden.` : t('Trainer-Meilenstein: Bei Geldmangel zahlt ihr nur das verfügbare Geld; niemand muss entlassen werden.')}</p>` : ''}${row.milestones.trainer && row.milestones.beer ? htmlText('<p class="hint">Mit Waren bezahlte Mitarbeiter vorher abziehen. Falls Bargeld nicht reicht, müssen verfügbare Waren ebenfalls zum Bezahlen eingesetzt werden.</p>') : ''}`;
}

export function renderRoundWages(target) {
  const settlement = previewRound();
  if (settlement.needsReserve) {
    renderReserve(target, true);
    return;
  }
  if (settlement.ended) {
    target.innerHTML =
      bankNotice() +
      htmlText(
        '<section class="panel final-round-notice"><span class="final-round-icon" aria-hidden="true">&#9733;</span><h2>Das Spiel ist zu Ende.</h2><p>Die Bank ist zum zweiten Mal gebrochen. Es werden keine L&ouml;hne mehr gezahlt.</p><p>Pr&uuml;ft jetzt die letzte Runde. Gewinner und Endst&auml;nde werden nach der Best&auml;tigung aufgedeckt.</p></section><div class="commit-bar"><button class="secondary" data-action="sales-step" data-step="extras">&larr; Bedienung &amp; CFO</button><button data-action="sales-step" data-step="summary">Letzte Runde pr&uuml;fen &rarr;</button></div>',
      );
    if (appState.game.milestoneSet === 'new')
      target
        .querySelector('.final-round-notice')
        .insertAdjacentHTML(
          'beforeend',
          htmlText(
            '<p>Es folgt keine Marketingphase: Nachfragemarker bringen in dieser letzten Runde kein weiteres Geld.</p>',
          ),
        );
    return;
  }
  target.innerHTML = html`${insolvencyNotice(settlement)}<div class="entry-grid"
      >${appState.game.players
        .map(
          (p, i) =>
            html`<article class="panel player-entry" style="--player-color:${p.color}"
              ><h3>${playerName(p)}</h3
              ><fieldset
                class="employee-fields"
                ${settlement.afterSales.bankrupt[i] !== null ? 'disabled' : ''}
                ><label class="waitress-field"
                  ><span
                    >${appState.game.milestoneSet === 'new' ? t('Mit Bargeld zu bezahlende Mitarbeiter · vor Rabatten') : t('Zu bezahlende Mitarbeiter')}</span
                  ><div class="stepper"
                    ><button
                      data-action="wage-count"
                      data-index="${i}"
                      data-delta="-1"
                      aria-label="Ein Mitarbeiter weniger für ${esc(p.name)}"
                      >−</button
                    ><input
                      type="number"
                      inputmode="numeric"
                      min="0"
                      max="1000000"
                      step="1"
                      required
                      data-wage="${i}"
                      value="${appState.editor.wages[i]}"
                      aria-label="Zu bezahlende Mitarbeiter für ${esc(p.name)}"
                    /><button
                      data-action="wage-count"
                      data-index="${i}"
                      data-delta="1"
                      aria-label="Ein Mitarbeiter mehr für ${esc(p.name)}"
                      >+</button
                    ></div
                  ><small
                    >${money(salaryRate(appState.editor.rows[i]))}
                    ${appState.game.milestoneSet === 'new' ? t('je Mitarbeiter · Warenzahlungen vorher abziehen') : t('je Mitarbeiter · Rabatte vorher selbst berücksichtigen')}</small
                  ></label
                >${salaryDiscountFields(appState.editor.rows[i], i)}${demandField(appState.editor.rows[i], i)}</fieldset
              ><div id="salary-details-${i}">${salaryCalculation(i, settlement)}</div
              ><div class="round-calculation" id="wage-calculation-${i}" aria-live="polite"
                >${wageCardCalculation(i, settlement)}</div
              ></article
            >`,
        )
        .join('')}</div
    ><p class="round-warning" id="wage-issues" ${settlement.issues.length ? '' : 'hidden'}
      >${esc(settlement.issues.join(' '))}</p
    ><div class="commit-bar"
      ><button class="secondary" data-action="sales-step" data-step="extras">← Bedienung & CFO</button
      ><button data-action="sales-step" data-step="summary">Gesamtübersicht prüfen →</button></div
    >`;
}

export function refreshWages() {
  const settlement = previewRound();
  if (settlement.ended || settlement.needsReserve) {
    renderRoundWages(document.querySelector('#sales-workspace'));
    return;
  }
  appState.editor.wages.forEach((_, i) => {
    document.querySelector(`#wage-calculation-${i}`).innerHTML = wageCardCalculation(i, settlement);
    document.querySelector(`#salary-details-${i}`).innerHTML = salaryCalculation(i, settlement);
  });
  const issues = document.querySelector('#wage-issues');
  issues.textContent = settlement.issues.join(' ');
  issues.hidden = !settlement.issues.length;
}
