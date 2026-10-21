import { app, notify } from '../ui/common.js';
import { account, reserveOptions } from '../rules.js';
import { appState } from '../state.js';
import { html, t } from '../i18n.js';
import { persistDraft, save } from '../persistence.js';
import { parseGame, serializeGame } from '../storage.js';
import { render } from '../ui/render.js';
export const GAME_ACTIONS = ['reserve', 'round-reserve', 'undo', 'export', 'import'];
export function handleGameAction(button) {
  switch (button.dataset.action) {
    case 'reserve': {
      const values = [...app.querySelectorAll('[data-reserve]')].map((input) => +input.value);
      if (values.some((n) => !reserveOptions(appState.game).includes(n)))
        throw new Error(t('Bitte die Reservekarte jedes Spielers auswählen.'));
      appState.game.reserves = values;
      appState.editor = null;
      save();
      break;
    }
    case 'round-reserve': {
      const values = [...app.querySelectorAll('[data-reserve]')].map((input) => +input.value);
      if (
        values.length !== appState.game.players.length ||
        values.some((n) => !reserveOptions(appState.game).includes(n))
      )
        throw new Error(t('Bitte die Reservekarte jedes Spielers auswählen.'));
      appState.editor.reserves = values;
      appState.editor.wagesReviewed = false;
      persistDraft();
      break;
    }
    case 'undo':
      if (
        !confirm(
          html`${appState.game.events.at(-1).combined ? t('Die letzte Runde mit Verkäufen und Löhnen') : t('Die letzte Buchung')}
          zurücknehmen? Danach kannst du die Eingaben neu erfassen.`,
        )
      )
        return;
      {
        const last = appState.game.events.pop();
        if (last.type === 'salary' && last.combined && appState.game.events.at(-1)?.combined) {
          const sale = appState.game.events.pop();
          appState.game.draft = {
            type: 'sale',
            rows: structuredClone(sale.rows),
            wages: [...last.rows],
            wagesReviewed: true,
            step: 'summary',
          };
        } else appState.game.draft = { type: last.type, rows: structuredClone(last.rows), step: 'summary' };
      }
      save();
      appState.screen = 'table';
      appState.editor = null;
      break;
    case 'export': {
      const blob = new Blob([serializeGame(appState.game)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = html`gamescores-fcm-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    case 'import': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', async () => {
        try {
          const file = input.files[0];
          if (!file) return;
          if (file.size > 5000000) throw new Error(t('Die Datei ist zu groß (maximal 5 MB).'));
          const imported = parseGame(await file.text());
          if (account(imported).issues.length)
            throw new Error(t('Der Spielstand enthält widersprüchliche Buchungen.'));
          if (appState.game && !confirm(t('Die aktuelle Partie durch diesen Import ersetzen?'))) return;
          appState.game = imported;
          appState.editor = null;
          save();
          appState.screen = 'table';
          render();
          notify(t('Spielstand importiert.'));
        } catch (error) {
          notify(html`Import fehlgeschlagen: ${error.message}`);
        }
      });
      input.click();
      return;
    }
  }
  return true;
}
