import { html, t } from '../i18n.js';
import { appState } from '../state.js';
import { currentRound } from '../round-state.js';
import { app } from './common.js';
import { renderCoffeeDialog, renderHousePicker, renderHouseStep } from './houses.js';
import { renderExtrasStep } from './employees.js';
import { renderRoundWages } from './salaries.js';
import { renderSummaryStep } from './review.js';

export function roundHeader() {
  return html`<div class="round-top"
    ><button class="text-button" data-action="leave-round"
      >←
      ${appState.editor.index === null || appState.editor.completing ? t('Spieltisch') : t('Protokoll')}</button
    ><span>Food Chain Magnate · Runde ${currentRound()}</span
    ><span class="draft-badge"
      >${appState.editor.index === null ? t('Entwurf · noch nicht gebucht') : appState.editor.completing ? t('Löhne noch nicht gebucht') : t('Runde bearbeiten')}</span
    ></div
  >`;
}

export function renderSales() {
  const step = appState.editor.step;
  app.innerHTML = html`${roundHeader()}<h1 class="round-title">Runde abrechnen</h1>
    <nav class="wizard-steps" aria-label="Rundenabrechnung"
      >${[
        ['houses', t('Häuser')],
        ['extras', t('Bedienung & CFO')],
        ['wages', t('Löhne')],
        ['summary', t('Übersicht')],
      ]
        .map(
          ([key, label], i) =>
            html`<button
              data-action="sales-step"
              data-step="${key}"
              class="${step === key ? 'active' : ''}"
              ${step === key ? 'aria-current="step"' : ''}
              ><b>${i + 1}</b>${t(label)}</button
            >`,
        )
        .join('')}</nav
    >
    <div id="sales-workspace"></div>`;
  const target = document.querySelector('#sales-workspace');
  if (step === 'houses') renderHouseStep(target);
  else if (step === 'extras') renderExtrasStep(target);
  else if (step === 'wages') renderRoundWages(target);
  else renderSummaryStep(target);
  app.insertAdjacentHTML(
    'beforeend',
    renderHousePicker() + (appState.game.modules?.coffee ? renderCoffeeDialog() : ''),
  );
}
