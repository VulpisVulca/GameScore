import { saleBreakdown } from '../accounting.js';
import { appState } from '../state.js';
import { previewRound } from '../round-state.js';
import { html, htmlText, t } from '../i18n.js';
import { money, playerName, visibleGoods } from './common.js';

import { houseList } from './houses.js';
import { bankNotice, insolvencyNotice } from './round-notices.js';

export function renderReview() {
  const sale = appState.editor.type === 'sale';
  const settlement = sale && appState.editor.wizard ? previewRound() : null;
  const revealBalance = settlement && !settlement.ended;
  return html`<section class="panel review"
    ><div class="table-scroll"
      ><table
        ><thead
          ><tr
            ><th>Spieler</th>${
              sale
                ? visibleGoods()
                    .map(([, label]) => html`<th>${t(label)}</th>`)
                    .join('') +
                  htmlText(
                    '<th>Bedienungen</th><th>Warenumsatz¹</th><th>Meilensteine</th><th>Trinkgeld</th>',
                  ) +
                  (appState.game.modules?.fryChef ? htmlText('<th>Friteusenköche</th>') : '') +
                  htmlText('<th>CFO</th>')
                : htmlText('<th>Mitarbeiter</th>')
            }<th>${sale ? t('Einnahmen') : t('Lohn')}</th>${settlement ? htmlText('<th>Ausgaben / Löhne</th>') + (appState.game.milestoneSet === 'new' ? htmlText('<th>Marketing nach Löhnen</th>') : '') + (revealBalance ? htmlText('<th>Neuer Stand</th>') : '') : ''}</tr
          ></thead
        ><tbody
          >${appState.game.players
            .map((p, i) => {
              const r = settlement?.rows?.[i] ?? appState.editor.rows[i];
              const c = sale ? saleBreakdown(r, settlement?.details?.[i]) : null;
              return html`<tr
                ><th>${playerName(p)}</th>${
                  sale
                    ? visibleGoods()
                        .map(([key]) => html`<td>${r[key] ?? 0}</td>`)
                        .join('') +
                      html`<td>${r.waitresses}</td><td>${money(c.revenue + c.coffeeRevenue)}</td
                        ><td>${money(c.bonus)}</td
                        ><td>${money(c.tips)}</td
                        >${appState.game.modules?.fryChef ? html`<td>${money(c.fry)}</td>` : ''}<td
                          >${money(c.cfo)}</td
                        >`
                    : html`<td>${r}</td>`
                }<td class="${settlement ? 'income-amount' : 'amount'}"
                  >${money(sale ? (settlement ? settlement.incomes[i] : c.total) : r * 5)}</td
                >${settlement ? html`<td class="expense-amount">${money(settlement.expenses[i])}</td>${appState.game.milestoneSet === 'new' ? html`<td>${money(settlement.marketing[i])}</td>` : ''}${revealBalance ? html`<td class="amount new-balance">${money(settlement.balances[i])}</td>` : ''}` : ''}</tr
              >`;
            })
            .join('')}</tbody
        ></table
      ></div
    >${sale ? htmlText('<p class="hint">¹ Mit eingestelltem Stückpreis und gegebenenfalls Gartenbonus. CFO zählt auf Waren und Trinkgeld, nicht auf Marketing, und wird einmal aufgerundet.</p>') : ''}</section
  >`;
}

export function renderSummaryStep(target) {
  const settlement = previewRound();
  target.innerHTML = html`<section class="panel summary-houses"
      ><div class="sidebar-heading"
        ><h2>Alle Hausverkäufe</h2
        ><button class="secondary" data-action="add-house">+ Weiteres Haus</button></div
      >${houseList()}</section
    ><div class="summary-heading"
      ><h2>Rundenabrechnung pro Spieler</h2
      ><div
        ><button class="text-button" data-action="sales-step" data-step="extras"
          >Bedienungen & CFO bearbeiten</button
        ><button class="text-button" data-action="sales-step" data-step="wages">Löhne bearbeiten</button></div
      ></div
    >${settlement.ended ? htmlText('<p class="round-warning">Zweiter Bankbruch: Alle Einnahmen werden ausgezahlt, Löhne entfallen.</p>') : ''}${bankNotice()}${insolvencyNotice(settlement)}${renderReview()}<div
      class="commit-bar"
      ><span
        >${appState.editor.index === null ? t('Einnahmen und Löhne werden zusammen gebucht.') : t('Die Korrektur berechnet alle folgenden Kontostände neu.')}</span
      ><button data-action="commit"
        >${appState.editor.index === null ? t('Runde bestätigen') : t('Änderung speichern')} ✓</button
      ></div
    >`;
}
