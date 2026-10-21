import { setLanguage, t } from '../i18n.js';
import { appState } from '../state.js';
import { milestones, readSetupPlayers } from '../ui/home.js';
import { COLORS, account, validateGame } from '../rules.js';
import { app } from '../ui/common.js';
import { save } from '../persistence.js';
export const SESSION_ACTIONS = [
  'language',
  'home',
  'setup',
  'setup-module',
  'setup-milestones',
  'setup-count',
  'setup-color',
  'start',
  'resume',
  'table',
  'log',
  'statistics',
  'awards',
  'statistics-metric',
  'toggle-log-details',
];
export function handleSessionAction(button) {
  switch (button.dataset.action) {
    case 'language': {
      setLanguage(button.dataset.language);
      document.querySelector('#notice').classList.remove('visible');
      break;
    }
    case 'home':
      appState.screen = 'home';
      appState.editor = null;
      break;
    case 'setup':
      appState.setupCount = appState.game?.players.length ?? 3;
      appState.setupMilestones = 'base';
      appState.setupModules = {
        newDistricts: false,
        apartments: false,
        coffee: false,
        fryChef: false,
        lobbyist: false,
        reservePrices: false,
        kimchi: false,
        noodles: false,
        rural: false,
        ketchup: false,
        sushi: false,
      };
      appState.setupPlayers = Array.from({ length: 6 }, (_, i) => ({ name: '', color: null }));
      appState.screen = 'setup';
      break;
    case 'setup-module':
      readSetupPlayers();
      if (
        ![
          'newDistricts',
          'apartments',
          'coffee',
          'fryChef',
          'lobbyist',
          'reservePrices',
          'kimchi',
          'noodles',
          'rural',
          'ketchup',
          'sushi',
        ].includes(button.dataset.module)
      )
        return;
      appState.setupModules[button.dataset.module] = !appState.setupModules[button.dataset.module];
      break;
    case 'setup-milestones':
      readSetupPlayers();
      if (!['base', 'new'].includes(button.dataset.set)) return;
      appState.setupMilestones = button.dataset.set;
      break;
    case 'setup-count': {
      readSetupPlayers();
      const count = +button.dataset.count;
      if (![2, 3, 4, 5, 6].includes(count)) return;
      appState.setupCount = count;
      appState.setupPlayers.slice(count).forEach((player) => {
        player.color = null;
      });
      break;
    }
    case 'setup-color': {
      readSetupPlayers();
      const index = +button.dataset.index,
        color = button.dataset.color;
      if (
        !COLORS.includes(color) ||
        index < 0 ||
        index >= appState.setupCount ||
        appState.setupPlayers.slice(0, appState.setupCount).some((p, i) => i !== index && p.color === color)
      )
        return;
      appState.setupPlayers[index].color = appState.setupPlayers[index].color === color ? null : color;
      break;
    }
    case 'start': {
      // Autofill and some mobile keyboards do not reliably emit input events.
      // The visible setup fields are authoritative when starting the game.
      readSetupPlayers();
      const missingName = [...app.querySelectorAll('[data-setup-name]')].find((input) => !input.value.trim());
      if (missingName) {
        missingName.setCustomValidity(t('Bitte für jeden Spieler einen Namen eingeben.'));
        missingName.reportValidity();
        return;
      }
      if (appState.setupPlayers.slice(0, appState.setupCount).some((player) => !player.color))
        throw new Error(t('Bitte für jeden Spieler eine Farbe auswählen.'));
      const players = appState.setupPlayers
        .slice(0, appState.setupCount)
        .map((p) => ({ name: p.name.trim(), color: p.color, milestones: milestones() }));
      const next = validateGame({
        version: 1,
        players,
        milestoneSet: appState.setupMilestones,
        modules: { ...appState.setupModules },
        reserves: null,
        events: [],
        draft: null,
        builtGardens: [],
      });
      if (
        appState.game &&
        !confirm(t('Die bisherige Partie auf diesem Gerät ersetzen? Vorher bei Bedarf exportieren.'))
      )
        return;
      appState.game = next;
      save();
      appState.screen = 'table';
      appState.editor = null;
      break;
    }
    case 'resume':
    case 'table':
      appState.screen = 'table';
      appState.editor = null;
      appState.review = false;
      break;
    case 'log':
      appState.screen = 'log';
      appState.editor = null;
      break;
    case 'statistics':
    case 'awards':
      if (account(appState.game).secondBreak === null) return;
      appState.screen = button.dataset.action;
      appState.editor = null;
      break;
    case 'statistics-metric':
      if (!['balance', 'income', 'net', 'wages'].includes(button.dataset.metric)) return;
      appState.statisticsMetric = button.dataset.metric;
      break;
    case 'toggle-log-details': {
      const details = document.querySelector(`#log-details-${button.dataset.index}`);
      details.hidden = !details.hidden;
      button.setAttribute('aria-expanded', String(!details.hidden));
      button.textContent = details.hidden ? t('Details') : t('Schließen');
      return;
    }
  }
  return true;
}
