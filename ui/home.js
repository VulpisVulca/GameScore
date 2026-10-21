import { COLORS, emptyMilestones } from '../rules.js';
import { appState } from '../state.js';
import { getLanguage, html, htmlText, t } from '../i18n.js';
import { app, esc, money, title } from './common.js';

export const milestones = () => emptyMilestones(appState.setupMilestones);

export function languagePicker() {
  return html`<div class="language-picker" role="group" aria-label="Sprache / Language"
    ><span>Sprache / Language</span
    ><button
      class="secondary"
      data-action="language"
      data-language="de"
      lang="de"
      aria-pressed="${getLanguage() === 'de'}"
      >Deutsch</button
    ><button
      class="secondary"
      data-action="language"
      data-language="en"
      lang="en"
      aria-pressed="${getLanguage() === 'en'}"
      >English</button
    ></div
  >`;
}

export function home() {
  app.innerHTML = html`${languagePicker()}${title(t('WENIGER RECHNEN. MEHR SPIELEN.'), t('Dein Abend. Dein Spieltisch.'), t('Wähle ein Spiel und lass das Kleingeld in der Schachtel.'))}
    ${
      appState.game
        ? html`<section class="resume"
            ><div
              ><span class="eyebrow">DEINE LETZTE PARTIE</span><h2>Food Chain Magnate</h2
              ><p
                >${appState.game.players.map((p) => esc(p.name)).join(' · ')} ·
                ${html`Runde ${Math.floor(appState.game.events.length / 2) + 1}`}</p
              ></div
            ><button data-action="resume">Partie fortsetzen <span>→</span></button></section
          >`
        : ''
    }
    <div class="section-label">DEINE SPIELE <span>01</span></div>
    <section class="game-grid"
      ><article class="game-card"
        ><div class="game-art"
          ><div class="art-tag">DAS GRUNDSPIEL</div
          ><div class="diner-sign"
            >FOOD CHAIN<br /><strong>MAGNATE</strong><span>BURGERS · PIZZA · BIG BUSINESS</span></div
          ><div class="awning"></div
          ><div class="art-bottom"><span>OPEN</span><span>🍔 &nbsp; 🍕 &nbsp; 🥤</span></div></div
        ><div class="game-info"
          ><div class="eyebrow">WIRTSCHAFT · 2–6 SPIELER</div><h2>Food Chain Magnate</h2
          ><p>Verkäufe, Gehälter und die ganze Bank.<br />Alles auf einem Spieltisch.</p
          ><button data-action="setup">Neue Partie <span>↗</span></button></div
        ></article
      ><article class="coming"
        ><span class="coming-icon">＋</span><h2>Platz für mehr Spielabende</h2
        ><p>Weitere Spiele kommen nach und nach dazu.</p></article
      ></section
    >
    <div class="home-features"
      ><span>◉ Ein Gerät für alle</span><span>↺ Jederzeit korrigieren</span
      ><span>◇ Auch offline spielbar</span></div
    ><div class="file-actions"
      ><button class="text-button" data-action="import">Spielstand importieren</button
      >${appState.game ? htmlText('<button class="text-button" data-action="export">Spielstand exportieren</button>') : ''}</div
    >`;
}

export function setup() {
  app.innerHTML = html`<div class="setup-heading"
      ><div class="setup-top"
        ><p class="eyebrow">${t('FOOD CHAIN MAGNATE · NEUE PARTIE')}</p
        ><button class="text-button" data-action="home">← Spielauswahl</button></div
      ><h1>Wer sitzt am Tisch?</h1></div
    >
    <section class="panel setup"
      ><div class="count-label"
        ><span>Anzahl der Spieler</span
        ><div class="player-count-options" role="group" aria-label="Anzahl der Spieler"
          >${[2, 3, 4, 5, 6].map((n) => html`<button class="secondary" data-action="setup-count" data-count="${n}" aria-pressed="${n === appState.setupCount}">${n}</button>`).join('')}</div
        ></div
      ><div class="count-label milestone-set"
        ><span>Meilensteine</span
        ><div class="player-count-options" role="group" aria-label="Meilensteinsatz"
          >${[
            ['base', t('Grundspiel')],
            ['new', t('Neue Meilensteine')],
          ]
            .map(
              ([set, label]) =>
                html`<button
                  class="secondary"
                  data-action="setup-milestones"
                  data-set="${set}"
                  aria-pressed="${appState.setupMilestones === set}"
                  >${label}</button
                >`,
            )
            .join('')}</div
        ></div
      ><div class="count-label module-settings"
        ><span>Erweiterungsmodule</span
        ><div class="player-count-options" role="group" aria-label="Erweiterungsmodule"
          >${[
            ['newDistricts', t('Neue Bezirke')],
            ['apartments', t('Apartments')],
            ['coffee', t('Kaffee')],
            ['fryChef', t('Friteusenkoch')],
            ['lobbyist', t('Lobbyist')],
            ['reservePrices', t('Alternative Reservekarten')],
            ['kimchi', t('Kimchi')],
            ['noodles', t('Nudeln')],
            ['rural', t('Landleben')],
            ['ketchup', t('Ketchup')],
            ['sushi', t('Sushi')],
          ]
            .map(
              ([key, label]) =>
                html`<button
                  class="secondary"
                  data-action="setup-module"
                  data-module="${key}"
                  aria-pressed="${appState.setupModules[key]}"
                  >${label}</button
                >`,
            )
            .join('')}</div
        ></div
      ><div class="setup-players"
        >${appState.setupPlayers
          .slice(0, appState.setupCount)
          .map(
            (p, i) =>
              html`<div class="setup-row"
                ><span class="row-number">0${i + 1}</span
                ><label
                  >Name<input
                    data-setup-name="${i}"
                    maxlength="40"
                    value="${esc(p.name)}"
                    placeholder="Spieler ${i + 1}"
                    autocomplete="off"
                    required /></label
                ><div class="setup-color-field"
                  ><span>Farbe</span
                  ><div class="setup-colors" role="group" aria-label="Farbe für Spieler ${i + 1}"
                    >${COLORS.map((color, j) => {
                      const used = appState.setupPlayers
                        .slice(0, appState.setupCount)
                        .some((other, k) => k !== i && other.color === color);
                      return html`<button
                        class="secondary color-choice"
                        style="--choice-color:${color}"
                        data-action="setup-color"
                        data-index="${i}"
                        data-color="${color}"
                        aria-pressed="${p.color === color}"
                        ${used ? 'disabled' : ''}
                        ><span class="color-swatch" aria-hidden="true"></span
                        >${t(['Rot', 'Gelb', 'Blau', 'Grün', 'Violett', 'Rosa'][j])}</button
                      >`;
                    }).join('')}</div
                  ></div
                ></div
              >`,
          )
          .join('')}</div
      ><p class="hint">Eine gewählte Farbe erneut anklicken, um sie freizugeben.</p
      >${appState.setupCount === 6 ? htmlText('<p class="hint">Für sechs Spieler wird die Erweiterung benötigt.</p>') : ''}<div
        class="bank-start"
        ><div
          ><span class="eyebrow">DIE BANK STARTET MIT</span
          ><strong>${money(appState.setupCount * 50)}</strong></div
        ><p
          >50 $ pro Spieler · Spielerkonten starten bei 0 $.<br />Reservekarten bleiben bis zum ersten
          Bankbruch geheim.</p
        ></div
      >${appState.game ? htmlText('<p class="hint">Beim Start wird die bisherige Partie ersetzt. Exportiere sie vorher, wenn du sie behalten möchtest.</p><button class="text-button" data-action="export">Bisherige Partie exportieren</button>') : ''}<button
        data-action="start"
        >Partie starten →</button
      ></section
    >`;
}

export function readSetupPlayers() {
  app.querySelectorAll('[data-setup-name]').forEach((input) => {
    appState.setupPlayers[+input.dataset.setupName].name = input.value;
  });
}
