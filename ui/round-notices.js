import { appState } from '../state.js';
import { bankRemoval } from '../rules.js';
import { html, t } from '../i18n.js';
import { money, playerName } from './common.js';

export function bankNotice() {
  const removed = appState.editor.rows.map(bankRemoval);
  if (!removed.some(Boolean)) return '';
  return html`<section class="round-warning bank-removal"
    ><strong>Discount Manager · Geld wird aus dem Spiel entfernt</strong
    ><p>Mindestens 3 $ Preisnachlass: je 100 $ pro berechtigtem Spieler.</p
    >${removed.map((value, i) => (value ? html`<div>${playerName(appState.game.players[i])}: −${money(value)} aus der Bank</div>` : '')).join('')}<p
      >Keine Spielereinnahmen. Gilt auch in der letzten Runde und kann einen Bankbruch auslösen.</p
    ></section
  >`;
}

export function insolvencyNotice(settlement) {
  const out = settlement.afterSales.bankrupt;
  return out.some((round) => round !== null)
    ? html`<div class="round-warning"
        >${out.map((round, i) => (round !== null ? html`<p>${playerName(appState.game.players[i])}: ${t('Zahlungsunfähig und ausgeschieden. Das verbleibende Guthaben geht an die Bank; es entstehen keine Schulden.')}</p>` : '')).join('')}</div
      >`
    : '';
}
