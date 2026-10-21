import { captureDraft, readGame, writeGame } from './storage.js';
import { appState } from './state.js';
import { notify } from './ui/common.js';
import { t } from './i18n.js';
import { updateChrome } from './ui/chrome.js';

export function loadSession() {
  // Accessing the storage property itself may be denied by the browser.
  let storage;
  try {
    storage = localStorage;
  } catch {}
  const result = readGame(storage);
  appState.game = result.game;
  if (result.warning) notify(result.warning);
}
export function save() {
  try {
    writeGame(appState.game, localStorage);
    appState.storageFailed = false;
  } catch {
    appState.storageFailed = true;
    notify(t('Speichern nicht möglich. Bitte den Spielstand jetzt exportieren.'));
  }
  updateChrome();
}
export function persistDraft() {
  if (captureDraft(appState.game, appState.editor)) save();
}
