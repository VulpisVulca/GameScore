import { appState } from './state.js';
import { updateChrome } from './ui/chrome.js';

export function registerOffline() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then(async (registration) => {
        const showReady = () => {
          appState.offlineState = 'ready';
          updateChrome();
        };
        if (registration.active) showReady();
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', function () {
            if (this.state === 'activated') showReady();
          });
        });
        await navigator.serviceWorker.ready;
        showReady();
      })
      .catch(() => {
        appState.offlineState = 'failed';
        updateChrome();
      });
  }
}
