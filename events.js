import { app, notify } from './ui/common.js';
import { render } from './ui/render.js';
import { appState } from './state.js';
import { handleCancel, handleInput, handleChange } from './controllers/input.js';
import { SESSION_ACTIONS, handleSessionAction } from './controllers/session-actions.js';
import { ROUND_ACTIONS, handleRoundAction } from './controllers/round-actions.js';
import { GAME_ACTIONS, handleGameAction } from './controllers/game-actions.js';
const actions = new Map([
  ...SESSION_ACTIONS.map((a) => [a, handleSessionAction]),
  ...ROUND_ACTIONS.map((a) => [a, handleRoundAction]),
  ...GAME_ACTIONS.map((a) => [a, handleGameAction]),
]);
export function bindEvents() {
  app.addEventListener('cancel', handleCancel, true);
  app.addEventListener('input', handleInput);
  app.addEventListener('change', handleChange);
  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const handler = actions.get(button.dataset.action);
    if (!handler) return;
    try {
      if (handler(button)) render();
    } catch (error) {
      notify(error.message);
    }
  });
  window.addEventListener('hashchange', () => {
    if (location.hash === '#home') {
      appState.screen = 'home';
      appState.editor = null;
      render();
    }
  });
}
