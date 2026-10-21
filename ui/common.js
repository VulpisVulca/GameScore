import { html, locale, t } from '../i18n.js';
import { goodsForGame } from '../rules.js';
import { appState } from '../state.js';

export const app = document.querySelector('#app');

export const money = (n) => html`${n.toLocaleString(locale())} $`;

export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

export function notify(message) {
  const el = document.querySelector('#notice');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.classList.remove('visible'), 6500);
}

export function title(kicker, heading, text = '') {
  return html`<div class="page-heading"
    ><p class="eyebrow">${kicker}</p
    ><h1>${heading}</h1>${text ? html`<p class="subtitle">${text}</p>` : ''}</div
  >`;
}

export function playerName(p) {
  return html`<span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}`;
}

export function visibleGoods() {
  return goodsForGame(appState.game);
}

export function signedMoney(value) {
  return value < 0 ? html`−${money(-value)}` : html`+${money(value)}`;
}

export function validInputs() {
  const invalid = [...app.querySelectorAll('input:invalid')].find(
    (input) => !input.closest('#coffee-dialog'),
  );
  if (invalid) {
    invalid.setCustomValidity(t('Bitte eine gültige Zahl im angezeigten Bereich eingeben.'));
    invalid.reportValidity();
    return false;
  }
  return true;
}
