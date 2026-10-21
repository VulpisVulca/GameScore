import { appState } from '../state.js';
import { html, htmlText, t } from '../i18n.js';
import { currentRound } from '../round-state.js';
import { renderReview } from './review.js';
import { money, playerName } from './common.js';
import { cfoButton, fryChefField, numberField, roundCalculation, waitressField } from './employees.js';
import { GOODS, calculateSale, milestoneList } from '../rules.js';

export function renderEditor(target) {
  const sale = appState.editor.type === 'sale';
  const editing = appState.editor.index !== null;
  target.innerHTML = html`<div class="phase-heading"
      ><div
        ><p class="eyebrow"
          >RUNDE ${currentRound()} ·
          ${editing ? t('BUCHUNG BEARBEITEN') : sale ? t('01 / VERKAUF') : t('02 / LÖHNE')}</p
        ><h2
          >${appState.review ? t('Alles richtig erfasst?') : sale ? t('Was ging über die Theke?') : t('Zeit für die Gehälter.')}</h2
        ><p
          >${sale ? t('Verkaufte Waren und Bedienungen je Spieler erfassen.') : t('Die tatsächlich zu bezahlenden Mitarbeiter eingeben. Je Person werden 5 $ abgezogen.')}</p
        ></div
      >${editing ? htmlText('<button class="text-button" data-action="cancel-edit">Abbrechen</button>') : ''}</div
    >
    ${appState.review ? renderReview() : html`<div class="entry-grid">${appState.game.players.map((p, i) => html`<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3>${sale ? saleFields(appState.editor.rows[i], i) : html`${numberField(t('Zu bezahlende Mitarbeiter'), 'salary', i, appState.editor.rows[i])}<div class="salary-total" id="row-total-${i}">${money(appState.editor.rows[i] * 5)}</div><p class="hint">Rabatte und kostenlose Mitarbeiter vorher selbst berücksichtigen.</p>`}</article>`).join('')}</div>`}
    <div class="commit-bar"
      ><span
        >${editing ? t('Die Änderung berechnet alle folgenden Kontostände neu.') : t('Erst bestätigen, dann wird gebucht.')}</span
      ><div
        >${appState.review ? htmlText('<button class="secondary" data-action="back-input">← Eingaben</button>') : ''}<button
          data-action="${appState.review ? 'commit' : 'review'}"
          >${appState.review ? (editing ? t('Änderung speichern') : sale ? t('Verkauf bestätigen ✓') : t('Löhne bestätigen ✓')) : t('Übersicht prüfen →')}</button
        ></div
      ></div
    >`;
}

export function saleFields(row, i) {
  return html`<div class="goods-grid"
      >${GOODS.map(([key, label, icon]) => numberField(html`${icon} ${t(label)}`, key, i, row[key])).join('')}${waitressField(row, i)}${fryChefField(row, i)}</div
    >
    <div class="pricing">${numberField(t('Stückpreis vor −1-$-Meilenstein'), 'price', i, row.price, 100)}</div
    >${cfoButton(row, i)}
    <details
      ><summary
        >Meilensteine
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
      ><p class="hint"
        >Den 100-$-Meilenstein erst ab der Folgerunde aktivieren. Meilensteine werden beim Buchen für kommende
        Runden übernommen.</p
      ></details
    >
    <details
      ><summary>Gartenbonus</summary
      >${numberField(t('Davon an Häuser mit Garten verkauft'), 'garden', i, row.garden)}<p class="hint"
        >Nur die Gesamtzahl der Gartenwaren. Ihr Stückpreis zählt doppelt, Meilensteinboni zählen einfach.
        Keine Häuserverwaltung.</p
      ></details
    >
    ${roundCalculation(row, i)}`;
}

export function safeTotal(row) {
  try {
    return money(calculateSale(row).total);
  } catch {
    return t('Eingabe prüfen');
  }
}
