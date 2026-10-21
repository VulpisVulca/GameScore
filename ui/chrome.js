import { getLanguage, html, t } from '../i18n.js';
import { appState } from '../state.js';

export function updateChrome() {
  document.documentElement.lang = getLanguage();
  document.title = t('GameScores · Dein Spieltisch');
  document
    .querySelector('link[rel="manifest"]')
    .setAttribute('href', getLanguage() === 'en' ? './manifest.en.webmanifest' : './manifest.webmanifest');
  document.querySelector('meta[name="description"]').content = t(
    'Dein digitaler Spieltisch. Food Chain Magnate ohne Bargeld, auch offline.',
  );
  document.querySelector('.brand-tag').textContent = t('AM SPIELTISCH');
  document.querySelector('#connection').textContent = appState.storageFailed
    ? t('Speichern fehlgeschlagen')
    : appState.game
      ? t('● Auf diesem Gerät gespeichert')
      : t('Lokal gespeichert');
  const storageStatus = appState.storageFailed
    ? t('Speichern fehlgeschlagen')
    : appState.game
      ? t('● Auf diesem Gerät gespeichert')
      : t('Lokal gespeichert');
  const offlineStatus = html`<span id="offline-status"
    >${appState.offlineState === 'ready' ? t('◇ Offline bereit') : appState.offlineState === 'failed' ? t('Offline-Cache nicht verfügbar') : ''}</span
  >`;
  document.querySelector('footer').innerHTML =
    appState.screen === 'home'
      ? html`Für gemeinsame Abende. <span>Spielstände bleiben auf diesem Gerät.</span>${offlineStatus}`
      : html`<span id="storage-status" role="status">${storageStatus}</span>${offlineStatus}`;
}
