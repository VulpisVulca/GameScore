import { updateChrome } from './chrome.js';
import { appState } from '../state.js';
import { home, setup } from './home.js';
import { renderSales, roundHeader } from './round.js';
import { app } from './common.js';
import { html } from '../i18n.js';
import { renderEditor } from './legacy.js';
import { dashboard } from './dashboard.js';

export function render() {
  updateChrome();
  document.body.classList.toggle('fcm-theme', appState.screen !== 'home');
  document.body.classList.toggle('sales-round', appState.screen === 'sale');
  document.body.classList.toggle('playing', !['home', 'setup'].includes(appState.screen));
  if (appState.screen === 'home') home();
  else if (appState.screen === 'setup') setup();
  else if (appState.game && appState.editor && appState.screen === 'sale') renderSales();
  else if (appState.game && appState.editor && appState.screen === 'entry') {
    app.innerHTML = html`${roundHeader()}<div id="workspace"></div>`;
    renderEditor(document.querySelector('#workspace'));
  } else if (appState.game) dashboard();
  else {
    appState.screen = 'home';
    home();
  }
}
