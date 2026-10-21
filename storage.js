import { account, validateGame } from './rules.js';
import { t } from './i18n.js';

export const GAME_KEY = 'gamescores.fcm.v1';
export function readGame(storage) {
  try {
    const raw = storage.getItem(GAME_KEY);
    if (!raw) return { game: null, warning: null };
    const parsed = JSON.parse(raw),
      draft = parsed.draft;
    parsed.draft = null;
    const game = validateGame(parsed);
    let warning = null;
    if (draft) {
      try {
        validateGame({ ...game, draft });
        game.draft = draft;
      } catch {
        warning = t('Eine unvollständige Eingabe wurde verworfen. Alle bestätigten Buchungen sind erhalten.');
      }
    }
    return { game, warning };
  } catch {
    return {
      game: null,
      warning: t(
        'Der gespeicherte Spielstand konnte nicht geladen werden. Er bleibt im Browserspeicher erhalten.',
      ),
    };
  }
}
export function writeGame(game, storage) {
  storage.setItem(GAME_KEY, JSON.stringify(game));
}
export function serializeGame(game) {
  return JSON.stringify(game, null, 2);
}
export function parseGame(text) {
  const game = validateGame(JSON.parse(text));
  if (account(game).issues.length) throw new Error(t('Der Spielstand enthält widersprüchliche Buchungen.'));
  return game;
}

export function captureDraft(game, editor) {
  if (editor?.completing) {
    game.draft = {
      type: 'salary',
      rows: [...editor.wages],
      completion: {
        rows: structuredClone(editor.rows),
        houseForm: structuredClone(editor.houseForm),
        step: editor.step,
        editingHouse: editor.editingHouse,
        returnToSummary: editor.returnToSummary,
        reserves: editor.reserves,
        wagesReviewed: editor.wagesReviewed,
        removedGardens: [...editor.removedGardens],
        removedParks: [...editor.removedParks],
      },
    };
    return true;
  }
  if (editor?.index === null) {
    game.draft = { type: editor.type, rows: structuredClone(editor.rows) };
    if (editor.wizard)
      Object.assign(game.draft, {
        houseForm: structuredClone(editor.houseForm),
        step: editor.step,
        editingHouse: editor.editingHouse,
        returnToSummary: editor.returnToSummary,
        wages: [...editor.wages],
        reserves: editor.reserves,
        wagesReviewed: editor.wagesReviewed,
        removedGardens: [...editor.removedGardens],
        removedParks: [...editor.removedParks],
      });
    return true;
  }
  return false;
}
