import { gameReport } from '../accounting.js';
import { appState } from '../state.js';
import {
  allGoods,
  bankRemoval,
  calculateHouse,
  reserveAmount,
  reserveBasePrice,
  salaryRate,
} from '../rules.js';
import { html, htmlText, locale, t } from '../i18n.js';
import { esc, money, playerName, signedMoney } from './common.js';
import { houseDescription, houseLabel, houseSetting } from './house-labels.js';

export function renderLog(target, report = gameReport(appState.game)) {
  const rounds = [...report.rounds];
  target.innerHTML = html`<div class="ledger-heading"
      ><h2>Protokoll</h2
      ><p>+ Einnahmen <span>− Löhne</span> <strong>Neuer Stand</strong> · neueste Runde zuerst</p></div
    >${
      !rounds.length
        ? htmlText(
            '<section class="panel"><p>Noch keine Buchungen. Los geht’s mit dem ersten Verkauf.</p></section>',
          )
        : html`<div class="ledger-scroll"
              ><table class="ledger-table"
                ><caption class="sr-only"
                  >Einnahmen, Lohnausgaben und Kontostand pro Spieler nach jeder Runde</caption
                ><thead
                  ><tr
                    ><th scope="col">Runde</th
                    >${appState.game.players.map((p) => html`<th scope="col">${playerName(p)}<small>Einnahmen · Löhne · Stand</small></th>`).join('')}<th
                      scope="col"
                      ><span class="sr-only">Aktionen</span></th
                    ></tr
                  ></thead
                >${rounds
                  .reverse()
                  .map(
                    (round) =>
                      html`<tbody class="ledger-round" data-round="${round.sale.round}"
                        ><tr class="ledger-main"
                          ><th scope="row" class="ledger-meta"
                            ><strong>Runde ${round.sale.round}</strong
                            ><small
                              >${round.date ? esc(round.date.toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) : t('Ohne Zeitangabe')}${round.sale.updatedAt || round.salary?.updatedAt ? t(' · korrigiert') : ''}</small
                            >${round.ended ? htmlText('<em>Spielende</em>') : !round.salary ? htmlText('<em>Löhne offen</em>') : ''}</th
                          >${appState.game.players
                            .map(
                              (p, i) =>
                                html`<td class="ledger-player-cell"
                                  ><span class="ledger-player-mobile">${playerName(p)}</span
                                  ><div class="ledger-amounts"
                                    ><span class="ledger-income" aria-label="Einnahmen"
                                      >${signedMoney(round.incomes[i])}</span
                                    ><span class="ledger-expense" aria-label="Löhne"
                                      >${round.salary || round.ended ? '−' + money(round.expenses[i]) : t('offen')}</span
                                    ><strong aria-label="Neuer Stand"
                                      >${money(round.balances[i])}</strong
                                    ></div
                                  ></td
                                >`,
                            )
                            .join('')}<td class="ledger-actions"
                            ><button
                              class="text-button"
                              data-action="toggle-log-details"
                              data-index="${round.index}"
                              aria-expanded="false"
                              aria-controls="log-details-${round.index}"
                              >Details</button
                            ><button
                              class="secondary"
                              data-action="edit"
                              data-index="${round.index}"
                              aria-label="Runde ${round.sale.round} bearbeiten"
                              >Bearbeiten</button
                            ></td
                          ></tr
                        ><tr class="ledger-detail-row" id="log-details-${round.index}" hidden
                          ><td colspan="${appState.game.players.length + 2}"
                            >${logRoundDetails(round)}</td
                          ></tr
                        ></tbody
                      >`,
                  )
                  .join('')}</table
              ></div
            ><button class="text-button danger ledger-undo" data-action="undo"
              >${appState.game.events.at(-1).combined ? t('Letzte Runde') : t('Letzte Buchung')}
              zurücknehmen</button
            >`
    }`;
}

export function logRoundDetails(round) {
  return html`${round.sale.rows.some((row) => bankRemoval(row)) ? html`<p class="ledger-bank-note">Discount Manager: −${money(round.sale.rows.reduce((sum, row) => sum + bankRemoval(row), 0))} aus der Bank · keine Spielereinnahmen</p>` : ''}${round.reserve ? html`<p class="ledger-bank-note">Erster Bankbruch${appState.game.reserves ? html` · Reserve: ${money(reserveAmount(appState.game))}${appState.game.modules?.reservePrices ? html` · ${t('Neuer Grundpreis')}: ${money(reserveBasePrice(appState.game.reserves))}` : ''}` : t(' · Reserve noch offen')}</p>` : ''}<div
      class="ledger-detail-grid"
      >${appState.game.players
        .map((p, i) => {
          const row = round.sale.rows[i];
          const c = round.breakdowns[i],
            detail = round.details[i];
          const goods =
            allGoods
              .filter(([key]) => row[key])
              .map(([key, label]) => html`${row[key]} ${t(label.split(' · ')[0])}`)
              .join(' · ') || t('Keine Waren verkauft');
          return html`<section class="ledger-detail-player"
            ><h3>${playerName(p)}</h3><p>${goods}</p
            ><dl
              ><div><dt>Warenumsatz</dt><dd>${money(c.revenue)}</dd></div
              >${round.bankrupt[i] === round.sale.round ? html`<div><dt>Ungedeckter Verlust bei Insolvenz</dt><dd>${money(detail.unpaid)}</dd></div>` : ''}${appState.game.modules?.coffee ? html`<div><dt>Kaffee</dt><dd>${signedMoney(c.coffeeRevenue)}</dd></div>` : ''}<div
                ><dt>Meilensteinboni</dt><dd>+${money(c.bonus)}</dd></div
              ><div><dt>${row.waitresses} Waitresses</dt><dd>+${money(detail.tips)}</dd></div
              >${appState.game.modules?.fryChef ? html`<div><dt>${row.fryChefs ?? 0} Friteusenköche · ${c.fryHouses} Häuser</dt><dd>+${money(detail.fry)}</dd></div>` : ''}<div
                ><dt>CFO${row.cfo || row.milestones.cfo ? t(' · aktiv') : t(' · inaktiv')}</dt
                ><dd>${signedMoney(detail.cfo)}</dd></div
              ><div
                ><dt
                  >${round.salary ? html`Löhne · ${round.salary.rows[i]} Mitarbeiter × ${money(salaryRate(row))}` : round.ended ? t('Löhne entfallen') : t('Löhne noch offen')}</dt
                ><dd>−${money(round.expenses[i])}</dd></div
              >${
                round.salary && appState.game.milestoneSet === 'new'
                  ? html`<div
                        ><dt>Lohnrabatt · Recruiting Manager</dt
                        ><dd>−${money((row.salaryDiscounts?.recruiting ?? 0) * 5)}</dd></div
                      ><div
                        ><dt>Lohnrabatt · HR Director</dt
                        ><dd>−${money((row.salaryDiscounts?.hr ?? 0) * 5)}</dd></div
                      >${row.milestones.trainer ? html`<div><dt>Trainer · entfallener Lohn</dt><dd>${money(Math.max(0, (round.salaryDetails[i]?.due ?? 0) - round.expenses[i]))}</dd></div>` : ''}`
                  : ''
              }${round.salary && (round.bankrupt[i] === null || round.bankrupt[i] > round.sale.round) && round.marketing[i] ? html`<div><dt>Marketing nach Löhnen</dt><dd>+${money(round.marketing[i])}</dd></div>` : ''}</dl
            >${
              row.houses?.length
                ? html`<ul class="ledger-houses"
                    >${row.houses
                      .map(
                        (h) =>
                          html`<li
                            ><div
                              ><strong>${houseLabel(h.number)}</strong
                              ><small
                                >${houseSetting(h)} · ${houseDescription(h)} · Stückpreis
                                ${money(h.price - (row.milestones.price ? 1 : 0))}</small
                              ></div
                            ><span>${money(calculateHouse(h, row.milestones).total)}</span></li
                          >`,
                      )
                      .join('')}</ul
                  >`
                : ''
            }</section
          >`;
        })
        .join('')}</div
    >${round.salary && !round.sale.rows.every((row) => Array.isArray(row.houses)) ? html`<button class="text-button" data-action="edit" data-index="${round.index + 1}">Alte Lohnbuchung bearbeiten</button>` : ''}`;
}
