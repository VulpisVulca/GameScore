import { appState } from '../state.js';
import { reserveBasePrice, reserveOptions } from '../rules.js';
import { esc, money, playerName } from './common.js';
import { html, t } from '../i18n.js';

export function reservePriceSummary(values) {
  const complete =
    values.length === appState.game.players.length &&
    values.every((value) => reserveOptions(appState.game).includes(value));
  return complete ? money(reserveBasePrice(values)) : t('Bitte alle Karten wählen.');
}

export function renderReserve(target, preview = false) {
  target.innerHTML = html`<section class="panel reserve"
    ><p class="eyebrow">ERSTER BANKBRUCH</p><h2>Zeit, die Reserve aufzudecken.</h2
    ><p
      >${appState.game.modules?.reservePrices ? t('Wählt den Grundpreis auf der verdeckt gewählten Karte jedes Spielers. Die Bank erhält 200 $ pro Spieler. Der neue Grundpreis gilt sofort für alle folgenden Verkäufe.') : t('Wählt den Geldbetrag der zu Beginn verdeckt gewählten Karte jedes Spielers.')}
      ${preview ? t('Die Bank ist während der Abrechnung leer geworden. Wählt jetzt die Reservekarten und setzt danach die Verkäufe fort. Gebucht wird erst beim Bestätigen der Runde.') : t('Noch ausstehende Einnahmen werden vollständig ausgezahlt.')}</p
    ><div class="reserve-grid"
      >${appState.game.players
        .map(
          (p, i) =>
            html`<div class="reserve-player" role="group" aria-label="Reservekarte f&uuml;r ${esc(p.name)}"
              ><strong>${playerName(p)}</strong><input type="hidden" data-reserve="${i}" value="" /><div
                class="reserve-options"
                >${reserveOptions(appState.game)
                  .map(
                    (n) =>
                      html`<button
                        class="secondary"
                        data-action="reserve-card"
                        data-index="${i}"
                        data-value="${n}"
                        aria-pressed="false"
                        >${money(n)}</button
                      >`,
                  )
                  .join('')}</div
              ></div
            >`,
        )
        .join('')}</div
    ><div class="reserve-total" aria-live="polite"
      ><span
        >Neue Bankreserve<small id="reserve-equation">Bitte pro Spieler eine Karte w&auml;hlen.</small></span
      ><strong id="reserve-total"
        >${money(appState.game.modules?.reservePrices ? appState.game.players.length * 200 : 0)}</strong
      ></div
    >${
      appState.game.modules?.reservePrices
        ? html`<div class="reserve-total"
            ><span>Neuer Grundpreis<small>Häufigste Karte · bei Gleichstand: 20 vor 5 vor 10 $</small></span
            ><strong id="reserve-price">${t('Bitte alle Karten wählen.')}</strong></div
          >`
        : ''
    }<button data-action="${preview ? 'round-reserve' : 'reserve'}"
      >${preview ? t('Reserve für Vorschau übernehmen') : t('Reserve der Bank hinzufügen')}</button
    ></section
  >`;
}
