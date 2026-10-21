import { gameReport } from '../accounting.js';
import { milestoneList, reserveAmount } from '../rules.js';
import { appState } from '../state.js';
import { html, htmlText, locale, t } from '../i18n.js';
import { app, esc, money, playerName, signedMoney } from './common.js';
import { renderLog } from './ledger.js';
import { renderAwards, renderStatistics } from '../statistics-view.js';
import { renderReserve } from './reserve.js';

export function dashboard() {
  const report = gameReport(appState.game),
    a = report.ledger;
  const ended = a.secondBreak !== null;
  const distribution = ended && appState.screen === 'statistics';
  const totalMoney = a.balances.reduce((sum, value) => sum + value, 0);
  const shares = a.balances.map((value) => (totalMoney ? (value / totalMoney) * 100 : 0));
  const percent = (value) =>
    value.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
  const roundChanges = report.rounds.map((r) => ({ number: r.number, amounts: r.players.map((p) => p.net) }));
  const last = appState.game.events.at(-1);
  const round = last ? last.round + (last.type === 'salary' ? 1 : 0) : 1;
  app.innerHTML = html`<div class="table-top"
      ><div><p class="eyebrow">DEIN SPIELTISCH</p><h1 class="table-title">Food Chain Magnate</h1></div
      ><div class="table-actions"
        ><button class="text-button" data-action="export">↓ Export</button
        ><button class="text-button" data-action="home">Spielauswahl</button></div
      ></div
    >
    ${
      distribution
        ? html`<section class="money-distribution" aria-label="Prozentuale Verteilung des Endgeldes"
            ><div class="distribution-heading"
              ><strong>Geldverteilung am Spielende</strong><span>Gesamt: ${money(totalMoney)}</span></div
            ><div class="distribution-bar"
              >${appState.game.players.map((p, i) => html`<div style="width:${shares[i]}%;background:${p.color}" role="img" aria-label="${esc(p.name)}: ${percent(shares[i])}" title="${esc(p.name)}: ${money(a.balances[i])} (${percent(shares[i])})">${shares[i] >= 10 ? percent(shares[i]) : ''}</div>`).join('')}</div
            ></section
          >`
        : html`<div class="bank-bar"
            ><div><span class="eyebrow">BANKBESTAND</span><strong>${money(a.bank)}</strong></div
            ><span
              >${a.firstBreak === null ? t('Reserve noch verdeckt') : a.needsReserve ? t('Reservekarten aufdecken') : html`Reserve: ${money(reserveAmount(appState.game))} · ${a.secondBreak === null ? t('1. Bankbruch') : t('2. Bankbruch')}${appState.game.modules?.reservePrices ? html` · ${t('Grundpreis')}: ${money(a.basePrice)}` : ''}`}</span
            ><span class="round-pill">${ended ? t('Partie beendet') : html`Runde ${round}`}</span></div
          >`
    }
    <section class="accounts"
      >${appState.game.players
        .map(
          (p, i) =>
            html`<div class="account" style="--player-color:${p.color}"
              ><span
                >${playerName(p)}${a.bankrupt[i] !== null ? html`<small class="eliminated-label">${t('Ausgeschieden')}</small>` : ''}</span
              >${roundChanges.length ? html`<dl class="account-rounds" aria-label="Gewinn oder Verlust pro Runde">${roundChanges.map((r) => html`<div><dt>Runde ${r.number}</dt><dd>${signedMoney(r.amounts[i])}</dd></div>`).join('')}</dl>` : ''}<div
                class="account-total"
                ><span>Aktueller Stand</span
                >${distribution ? html`<div class="account-share"><strong>${money(a.balances[i])}</strong><small>${percent(shares[i])}</small></div>` : html`<strong>${money(a.balances[i])}</strong>`}</div
              ></div
            >`,
        )
        .join('')}</section
    >
    <nav class="tabs"
      ><button class="${appState.screen === 'table' ? 'active' : ''}" data-action="table"
        >${ended ? t('Ergebnis') : t('Spieltisch')}</button
      ><button class="${appState.screen === 'log' ? 'active' : ''}" data-action="log"
        >Protokoll <span>${Math.ceil(appState.game.events.length / 2)}</span></button
      >${ended ? html`<button class="${appState.screen === 'statistics' ? 'active' : ''}" data-action="statistics">Statistiken</button><button class="${appState.screen === 'awards' ? 'active' : ''}" data-action="awards">Achievements</button>` : ''}</nav
    ><div id="workspace"></div>`;
  const workspace = document.querySelector('#workspace');
  if (appState.screen === 'log') {
    renderLog(workspace, report);
    return;
  }
  if (ended && appState.screen === 'statistics') {
    workspace.innerHTML = renderStatistics(appState.game, appState.statisticsMetric, report);
    return;
  }
  if (ended && appState.screen === 'awards') {
    workspace.innerHTML = renderAwards(appState.game, report);
    return;
  }
  if (a.needsReserve) {
    renderReserve(workspace);
    return;
  }
  if (ended && !appState.editor) {
    const ranked = appState.game.players
      .map((p, i) => ({ ...p, balance: a.balances[i] }))
      .sort((x, y) => y.balance - x.balance);
    const tied = ranked.filter((p) => p.balance === ranked[0].balance).length > 1;
    workspace.innerHTML = html`<section class="panel"
      ><p class="eyebrow">DIE BANK IST ZUM ZWEITEN MAL GEBROCHEN</p><h2>Das Geschäft ist gemacht.</h2
      ><p>Alle Einnahmen sind ausgezahlt. In dieser Runde werden keine Löhne mehr gezahlt.</p
      >${ranked.map((p, i) => html`<div class="result-row ${p.balance === ranked[0].balance ? 'winning-result' : ''}"><span>${p.balance === ranked[0].balance ? (tied ? t('Gleichstand &middot; ') : t('Gewinner &middot; ')) : html`${i + 1}. `}${playerName(p)}</span><strong>${money(p.balance)}</strong></div>`).join('')}<p
        class="hint"
        >Bei Gleichstand entscheidet die frühere Position in der Spielreihenfolge.</p
      ><button data-action="export">Partie sichern</button></section
    >`;
    return;
  }
  renderTable(workspace);
}

export function renderTable(target) {
  const salaryDue = appState.game.events.length % 2 === 1;
  target.innerHTML = html`${salaryDue ? htmlText('<p class="salary-pending">Jetzt die Löhne abrechnen.</p>') : ''}<div
      class="milestone-heading round-toolbar"
      ><div
        ><h2>Meilensteine</h2
        ><span>Auswahl wird automatisch gespeichert · gilt für die nächste Verkaufsbuchung</span></div
      ><button data-action="open-round"
        >${appState.game.draft ? t('Eingabe fortsetzen') : salaryDue ? t('Lohnrunde öffnen') : t('Verkaufsrunde öffnen')}
        →</button
      ></div
    >
    <section class="achievement-grid"
      >${appState.game.players
        .map(
          (p, i) =>
            html`<article class="panel achievement-card" style="--player-color:${p.color}"
              ><h3>${playerName(p)}</h3
              ><div class="milestones"
                >${milestoneList(p.milestones, appState.game)
                  .map(
                    ([key, label, hint]) =>
                      html`<label class="check"
                        ><input
                          type="checkbox"
                          data-player="${i}"
                          data-achievement="${key}"
                          ${p.milestones[key] ? 'checked' : ''}
                        /><span>${t(label)}<small>${t(hint)}</small></span></label
                      >`,
                  )
                  .join('')}</div
              ></article
            >`,
        )
        .join('')}</section
    >${appState.game.milestoneSet === 'new' ? htmlText('<p class="hint">Neue Meilensteine: Marketing erst nach den Löhnen, Bedienung senkt den Lohn auf 3 $. Bier wird nur angezeigt. CFO bleibt optional.</p>') : htmlText('<p class="hint">Den 100-$-Meilenstein nach der erreichten Verkaufsrunde auswählen: Der CFO-Bonus zählt ab dem nächsten Verkauf. Mehrere Spieler können denselben Meilenstein erhalten.</p>')}`;
}
