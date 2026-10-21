import { houseOptions, houseId, isApartment, gardenKind, houseNumber, builtGardenNumbers, builtGardenOrigins, canRemoveBuiltGarden, removeBuiltGarden, gardenKindAtRound } from './houses.js';
import { t, html, htmlText, locale, getLanguage, setLanguage } from './i18n.js';
import { renderStatistics, renderAwards } from './statistics-view.js';
import { GOODS, COFFEE, allGoods, isCoffeeSale, sameHouse, milestoneList, emptyMilestones, salaryRate, marketingIncome, bankRemoval, COLORS, emptySale, calculateSale, calculateHouse, houseRows, account, roundSettlement, validateGame } from './rules.js';

const KEY = 'gamescores.fcm.v1';
const app = document.querySelector('#app');
const money = n => html`${n.toLocaleString(locale())} $`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const milestones = () => emptyMilestones(setupMilestones);
let game = null;
let screen = 'home';
let setupCount = 3;
let setupMilestones = 'base';
let setupModules = {newDistricts:false,apartments:false,coffee:false};
let setupPlayers = Array.from({ length: 6 }, (_, i) => ({ name: '', color: null }));
let editor = null;
let review = false;
let statisticsMetric = 'balance';
let storageFailed = false;
let offlineState = "";
try {
  const stored = localStorage.getItem(KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    const draft = parsed.draft;
    parsed.draft = null;
    game = validateGame(parsed);
    if (draft) {
      try { validateGame({ ...game, draft }); game.draft = draft; }
      catch { notify(t('Eine unvollständige Eingabe wurde verworfen. Alle bestätigten Buchungen sind erhalten.')); }
    }
  }
} catch { notify(t('Der gespeicherte Spielstand konnte nicht geladen werden. Er bleibt im Browserspeicher erhalten.')); }

function notify(message) {
  const el = document.querySelector('#notice');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.classList.remove('visible'), 6500);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(game)); storageFailed = false; }
  catch { storageFailed = true; notify(t('Speichern nicht möglich. Bitte den Spielstand jetzt exportieren.')); }
  document.querySelector('#connection').textContent = storageFailed ? t('Speichern fehlgeschlagen') : t('● Auf diesem Gerät gespeichert');
  const footerStatus = document.querySelector('#storage-status');
  if (footerStatus) footerStatus.textContent = storageFailed ? t('Speichern fehlgeschlagen') : t('● Auf diesem Gerät gespeichert');
}
function title(kicker, heading, text = '') {
  return html`<div class="page-heading"><p class="eyebrow">${kicker}</p><h1>${heading}</h1>${text ? html`<p class="subtitle">${text}</p>` : ''}</div>`;
}
function playerName(p) { return html`<span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}`; }
function readSetupPlayers() {
  app.querySelectorAll('[data-setup-name]').forEach(input => { setupPlayers[+input.dataset.setupName].name = input.value; });
}
function updateChrome() {
  document.documentElement.lang = getLanguage();
  document.title = t('GameScores · Dein Spieltisch');
  document.querySelector('link[rel="manifest"]').setAttribute('href',getLanguage() === 'en' ? './manifest.en.webmanifest' : './manifest.webmanifest');
  document.querySelector('meta[name="description"]').content = t('Dein digitaler Spieltisch. Food Chain Magnate ohne Bargeld, auch offline.');
  document.querySelector('.brand-tag').textContent = t('AM SPIELTISCH');
  document.querySelector('#connection').textContent = storageFailed ? t('Speichern fehlgeschlagen') : game ? t('● Auf diesem Gerät gespeichert') : t('Lokal gespeichert');
  const storageStatus = storageFailed ? t('Speichern fehlgeschlagen') : game ? t('● Auf diesem Gerät gespeichert') : t('Lokal gespeichert');
  const offlineStatus = html`<span id="offline-status">${offlineState === 'ready' ? t('◇ Offline bereit') : offlineState === 'failed' ? t('Offline-Cache nicht verfügbar') : ''}</span>`;
  document.querySelector('footer').innerHTML = screen === 'home'
    ? html`Für gemeinsame Abende. <span>Spielstände bleiben auf diesem Gerät.</span>${offlineStatus}`
    : html`<span id="storage-status" role="status">${storageStatus}</span>${offlineStatus}`;
}
function languagePicker() {
  return html`<div class="language-picker" role="group" aria-label="Sprache / Language"><span>Sprache / Language</span><button class="secondary" data-action="language" data-language="de" lang="de" aria-pressed="${getLanguage()==='de'}">Deutsch</button><button class="secondary" data-action="language" data-language="en" lang="en" aria-pressed="${getLanguage()==='en'}">English</button></div>`;
}
function home() {
  app.innerHTML = html`${languagePicker()}${title(t('WENIGER RECHNEN. MEHR SPIELEN.'), t('Dein Abend. Dein Spieltisch.'), t('Wähle ein Spiel und lass das Kleingeld in der Schachtel.'))}
    ${game ? html`<section class="resume"><div><span class="eyebrow">DEINE LETZTE PARTIE</span><h2>Food Chain Magnate</h2><p>${game.players.map(p => esc(p.name)).join(' · ')} · ${html`Runde ${Math.floor(game.events.length / 2) + 1}`}</p></div><button data-action="resume">Partie fortsetzen <span>→</span></button></section>` : ''}
    <div class="section-label">DEINE SPIELE <span>01</span></div>
    <section class="game-grid"><article class="game-card"><div class="game-art"><div class="art-tag">DAS GRUNDSPIEL</div><div class="diner-sign">FOOD CHAIN<br><strong>MAGNATE</strong><span>BURGERS · PIZZA · BIG BUSINESS</span></div><div class="awning"></div><div class="art-bottom"><span>OPEN</span><span>🍔 &nbsp; 🍕 &nbsp; 🥤</span></div></div><div class="game-info"><div class="eyebrow">WIRTSCHAFT · 2–6 SPIELER</div><h2>Food Chain Magnate</h2><p>Verkäufe, Gehälter und die ganze Bank.<br>Alles auf einem Spieltisch.</p><button data-action="setup">Neue Partie <span>↗</span></button></div></article><article class="coming"><span class="coming-icon">＋</span><h2>Platz für mehr Spielabende</h2><p>Weitere Spiele kommen nach und nach dazu.</p></article></section>
    <div class="home-features"><span>◉ Ein Gerät für alle</span><span>↺ Jederzeit korrigieren</span><span>◇ Auch offline spielbar</span></div><div class="file-actions"><button class="text-button" data-action="import">Spielstand importieren</button>${game ? htmlText('<button class="text-button" data-action="export">Spielstand exportieren</button>') : ''}</div>`;
}
function setup() {
  app.innerHTML = html`<div class="setup-heading"><div class="setup-top"><p class="eyebrow">${t('FOOD CHAIN MAGNATE · NEUE PARTIE')}</p><button class="text-button" data-action="home">← Spielauswahl</button></div><h1>Wer sitzt am Tisch?</h1></div>
    <section class="panel setup"><div class="count-label"><span>Anzahl der Spieler</span><div class="player-count-options" role="group" aria-label="Anzahl der Spieler">${[2,3,4,5,6].map(n => html`<button class="secondary" data-action="setup-count" data-count="${n}" aria-pressed="${n===setupCount}">${n}</button>`).join('')}</div></div><div class="count-label milestone-set"><span>Meilensteine</span><div class="player-count-options" role="group" aria-label="Meilensteinsatz">${[['base',t('Grundspiel')],['new',t('Neue Meilensteine')]].map(([set,label])=>html`<button class="secondary" data-action="setup-milestones" data-set="${set}" aria-pressed="${setupMilestones===set}">${label}</button>`).join('')}</div></div><div class="count-label module-settings"><span>Erweiterungsmodule</span><div class="player-count-options" role="group" aria-label="Erweiterungsmodule">${[['newDistricts',t('Neue Bezirke')],['apartments',t('Apartments')],['coffee',t('Kaffee')]].map(([key,label])=>html`<button class="secondary" data-action="setup-module" data-module="${key}" aria-pressed="${setupModules[key]}">${label}</button>`).join('')}</div></div><div class="setup-players">${setupPlayers.slice(0, setupCount).map((p,i) => html`<div class="setup-row"><span class="row-number">0${i+1}</span><label>Name<input data-setup-name="${i}" maxlength="40" value="${esc(p.name)}" placeholder="Spieler ${i+1}" autocomplete="off" required></label><div class="setup-color-field"><span>Farbe</span><div class="setup-colors" role="group" aria-label="Farbe für Spieler ${i+1}">${COLORS.map((color,j) => {const used=setupPlayers.slice(0,setupCount).some((other,k)=>k!==i&&other.color===color);return html`<button class="secondary color-choice" style="--choice-color:${color}" data-action="setup-color" data-index="${i}" data-color="${color}" aria-pressed="${p.color===color}" ${used?'disabled':''}><span class="color-swatch" aria-hidden="true"></span>${t(['Rot','Gelb','Blau','Grün','Violett','Rosa'][j])}</button>`;}).join('')}</div></div></div>`).join('')}</div><p class="hint">Eine gewählte Farbe erneut anklicken, um sie freizugeben.</p>${setupCount===6 ? htmlText('<p class="hint">Für sechs Spieler wird die Erweiterung benötigt.</p>') : ''}<div class="bank-start"><div><span class="eyebrow">DIE BANK STARTET MIT</span><strong>${money(setupCount * 50)}</strong></div><p>50 $ pro Spieler · Spielerkonten starten bei 0 $.<br>Reservekarten bleiben bis zum ersten Bankbruch geheim.</p></div>${game ? htmlText('<p class="hint">Beim Start wird die bisherige Partie ersetzt. Exportiere sie vorher, wenn du sie behalten möchtest.</p><button class="text-button" data-action="export">Bisherige Partie exportieren</button>') : ''}<button data-action="start">Partie starten →</button></section>`;
}
function beginEditor(index = null) {
  // Complete older, already booked sales in the same four-step round editor.
  let completing = false;
  if (index === null && game.events.length % 2 && game.events.at(-1).rows.every(row => Array.isArray(row.houses))) {
    completing = true;
    index = game.events.length - 1;
  } else if (index !== null && game.events[index].type === 'salary' && game.events[index - 1]?.rows.every(row => Array.isArray(row.houses))) index--;
  const roundDraft = completing ? game.draft?.completion : index === null ? game.draft : null;
  const type = index === null ? (game.events.length % 2 ? 'salary' : 'sale') : game.events[index].type;
  editor = { index, type, rows: structuredClone(completing && roundDraft?.rows ? roundDraft.rows : index !== null ? game.events[index].rows : game.draft?.type === type ? game.draft.rows : game.players.map(p => type === 'sale' ? emptySale(p.milestones) : 0)) };
  review = false;
  if (type === 'sale') {
    // Old aggregate-only records stay editable without inventing house details.
    const legacy = editor.rows.some(row => !Array.isArray(row.houses) && GOODS.some(([key]) => row[key] > 0));
    editor.wizard = !legacy;
    if (editor.wizard) {
      editor.houses = editor.rows.flatMap((row, player) => (row.houses || []).map(house => ({ ...house, player }))).sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
      if (index === null) editor.rows.forEach((row, i) => { row.milestones = { ...game.players[i].milestones }; });
      editor.removedGardens = [...(roundDraft?.removedGardens || [])];
      editor.houseForm = roundDraft?.houseForm ? structuredClone(roundDraft.houseForm) : newHouse();
      editor.wages = structuredClone(completing && game.draft?.type === 'salary' ? game.draft.rows : index !== null ? game.events[index + 1]?.rows || game.players.map(() => 0) : game.draft?.wages || game.players.map(() => 0));
      editor.reserves = roundDraft?.reserves ?? game.reserves;
      editor.wagesReviewed = roundDraft?.wagesReviewed === true || (!completing && index !== null);
      editor.completing = completing;
      editor.step = ['houses', 'extras', 'wages', 'summary'].includes(roundDraft?.step) ? roundDraft.step : completing ? 'wages' : index !== null ? 'summary' : 'houses';
      editor.returnToSummary = roundDraft?.returnToSummary === true;
      editor.editingHouse = Number.isInteger(roundDraft?.editingHouse) && editor.houses[roundDraft.editingHouse] ? roundDraft.editingHouse : null;
      syncHouseRows();
      if (editor.step === 'summary' && (!editor.wagesReviewed || previewRound().needsReserve)) editor.step = 'wages';
    }
  }
}
function currentRound() { return editor?.index !== null && editor ? game.events[editor.index].round : Math.floor(game.events.length / 2) + 1; }
function dashboard() {
  const a = account(game);
  const ended = a.secondBreak !== null;
  const distribution = ended && screen === 'statistics';
  const totalMoney = a.balances.reduce((sum,value) => sum + value,0);
  const shares = a.balances.map(value => totalMoney ? value / totalMoney * 100 : 0);
  const percent = value => value.toLocaleString(locale(),{minimumFractionDigits:1,maximumFractionDigits:1}) + ' %';
  const last = game.events.at(-1);
  const round = last ? last.round + (last.type === 'salary' ? 1 : 0) : 1;
  app.innerHTML = html`<div class="table-top"><div><p class="eyebrow">DEIN SPIELTISCH</p><h1 class="table-title">Food Chain Magnate</h1></div><div class="table-actions"><button class="text-button" data-action="export">↓ Export</button><button class="text-button" data-action="home">Spielauswahl</button></div></div>
    ${distribution ? html`<section class="money-distribution" aria-label="Prozentuale Verteilung des Endgeldes"><div class="distribution-heading"><strong>Geldverteilung am Spielende</strong><span>Gesamt: ${money(totalMoney)}</span></div><div class="distribution-bar">${game.players.map((p,i) => html`<div style="width:${shares[i]}%;background:${p.color}" role="img" aria-label="${esc(p.name)}: ${percent(shares[i])}" title="${esc(p.name)}: ${money(a.balances[i])} (${percent(shares[i])})">${shares[i]>=10 ? percent(shares[i]) : ''}</div>`).join('')}</div></section>` : html`<div class="bank-bar"><div><span class="eyebrow">BANKBESTAND</span><strong>${money(a.bank)}</strong></div><span>${a.firstBreak === null ? t('Reserve noch verdeckt') : a.needsReserve ? t('Reservekarten aufdecken') : html`Reserve: ${money(game.reserves.reduce((s,n) => s+n,0))} · ${a.secondBreak === null ? t('1. Bankbruch') : t('2. Bankbruch')}`}</span><span class="round-pill">${ended ? t('Partie beendet') : html`Runde ${round}`}</span></div>`}
    <section class="accounts">${game.players.map((p,i) => html`<div class="account" style="--player-color:${p.color}"><span>${playerName(p)}</span>${distribution ? html`<div class="account-share"><strong>${money(a.balances[i])}</strong><small>${percent(shares[i])}</small></div>` : html`<strong>${money(a.balances[i])}</strong>`}</div>`).join('')}</section>
    <nav class="tabs"><button class="${screen === 'table' ? 'active' : ''}" data-action="table">${ended ? t('Ergebnis') : t('Spieltisch')}</button><button class="${screen === 'log' ? 'active' : ''}" data-action="log">Protokoll <span>${Math.ceil(game.events.length / 2)}</span></button>${ended ? html`<button class="${screen === 'statistics' ? 'active' : ''}" data-action="statistics">Statistiken</button><button class="${screen === 'awards' ? 'active' : ''}" data-action="awards">Achievements</button>` : ''}</nav><div id="workspace"></div>`;
  const workspace = document.querySelector('#workspace');
  if (screen === 'log') { renderLog(workspace); return; }
  if (ended && screen === 'statistics') { workspace.innerHTML = renderStatistics(game,statisticsMetric); return; }
  if (ended && screen === 'awards') { workspace.innerHTML = renderAwards(game); return; }
  if (a.needsReserve) { renderReserve(workspace); return; }
  if (ended && !editor) {
    const ranked = game.players.map((p,i) => ({ ...p, balance: a.balances[i] })).sort((x,y) => y.balance - x.balance);
    const tied = ranked.filter(p => p.balance === ranked[0].balance).length > 1;
    workspace.innerHTML = html`<section class="panel"><p class="eyebrow">DIE BANK IST ZUM ZWEITEN MAL GEBROCHEN</p><h2>Das Geschäft ist gemacht.</h2><p>Alle Einnahmen sind ausgezahlt. In dieser Runde werden keine Löhne mehr gezahlt.</p>${ranked.map((p,i) => html`<div class="result-row ${p.balance === ranked[0].balance ? 'winning-result' : ''}"><span>${p.balance === ranked[0].balance ? (tied ? t('Gleichstand &middot; ') : t('Gewinner &middot; ')) : html`${i+1}. `}${playerName(p)}</span><strong>${money(p.balance)}</strong></div>`).join('')}<p class="hint">Bei Gleichstand entscheidet die frühere Position in der Spielreihenfolge.</p><button data-action="export">Partie sichern</button></section>`;
    return;
  }
  renderTable(workspace);
}
function renderTable(target) {
  const salaryDue = game.events.length % 2 === 1;
  target.innerHTML = html`${salaryDue ? htmlText('<p class="salary-pending">Jetzt die Löhne abrechnen.</p>') : ''}<div class="milestone-heading round-toolbar"><div><h2>Meilensteine</h2><span>Auswahl wird automatisch gespeichert · gilt für die nächste Verkaufsbuchung</span></div><button data-action="open-round">${game.draft ? t('Eingabe fortsetzen') : salaryDue ? t('Lohnrunde öffnen') : t('Verkaufsrunde öffnen')} →</button></div>
    <section class="achievement-grid">${game.players.map((p,i) => html`<article class="panel achievement-card" style="--player-color:${p.color}"><h3>${playerName(p)}</h3><div class="milestones">${milestoneList(p.milestones,game).map(([key,label,hint]) => html`<label class="check"><input type="checkbox" data-player="${i}" data-achievement="${key}" ${p.milestones[key] ? 'checked' : ''}><span>${t(label)}<small>${t(hint)}</small></span></label>`).join('')}</div></article>`).join('')}</section>${game.milestoneSet==='new'?htmlText('<p class="hint">Neue Meilensteine: Marketing erst nach den Löhnen, Bedienung senkt den Lohn auf 3 $. Bier wird nur angezeigt. CFO bleibt optional.</p>'):htmlText('<p class="hint">Den 100-$-Meilenstein nach der erreichten Verkaufsrunde auswählen: Der CFO-Bonus zählt ab dem nächsten Verkauf. Mehrere Spieler können denselben Meilenstein erhalten.</p>')}`;
}
function roundHeader() {
  return html`<div class="round-top"><button class="text-button" data-action="leave-round">← ${editor.index === null || editor.completing ? t('Spieltisch') : t('Protokoll')}</button><span>Food Chain Magnate · Runde ${currentRound()}</span><span class="draft-badge">${editor.index === null ? t('Entwurf · noch nicht gebucht') : editor.completing ? t('Löhne noch nicht gebucht') : t('Runde bearbeiten')}</span></div>`;
}
function newHouse(kind='meal') {
  return { number: '', player: null, type: 'normal', price: 10, coffee:0, kind, ...Object.fromEntries(GOODS.map(([key]) => [key, 0])) };
}
function syncHouseRows() {
  editor.rows = houseRows(editor.rows, editor.houses);
}
function houseLabel(label) {
  if (isApartment(label)) return html`Apartment ${houseId(label)}`;
  const number=houseNumber(label);
  return number ? html`Haus ${number}` : esc(label);
}
function houseDescription(house) {
  return allGoods.filter(([key]) => house[key]).map(([key,label]) => html`${house[key]} ${t(label.split(' · ')[0])}`).join(' · ');
}
function houseList(editable = true) {
  return editor.houses.length ? html`<div class="house-list">${editor.houses.map((house,i) => html`<article class="house-item"><div class="house-number"><span>${isCoffeeSale(house)?'☕':house.type === 'garden' ? '♧' : '⌂'}</span><strong>${houseLabel(house.number || html`Haus ${i + 1}`)}</strong><small>${house.type === 'garden' ? t('Mit Garten') : t('Ohne Garten')}</small></div><div class="house-detail"><strong>${playerName(game.players[house.player])}</strong><span>${houseDescription(house)}</span></div><strong>${money(calculateHouse(house, editor.rows[house.player].milestones).total)}</strong>${editable ? html`<div class="house-actions">${game.modules?.coffee&&!isCoffeeSale(house)?html`<button class="secondary coffee-house-action" data-action="add-coffee" data-index="${i}">+ Kaffee</button>`:''}<button class="text-button" data-action="edit-house" data-index="${i}" aria-label="${esc(house.number || html`Haus ${i + 1}`)} bearbeiten">Bearbeiten</button><button class="text-button danger" data-action="remove-house" data-index="${i}" aria-label="${esc(house.number || html`Haus ${i + 1}`)} entfernen">Entfernen</button></div>` : ''}</article>`).join('')}</div>` : htmlText('<div class="empty-houses"><span>⌂</span><p>Noch kein Haus erfasst.</p><small>Verkäufe hinzufügen oder nur Bedienungen abrechnen.</small></div>');
}
function rememberBuiltGarden(label) {
  const number=houseNumber(label);
  if (!number || gardenKind(game,number)==='native') return;
  const origin=builtGardenOrigins(game)[number] ?? currentRound();
  game.builtGardens=[...new Set([...builtGardenNumbers(game),number])].sort((a,b)=>a-b);
  game.builtGardenRounds={...builtGardenOrigins(game),[number]:Math.min(origin,currentRound())};
  save();
}
function gardenGame() {
  let preview=game;
  for (const number of editor?.removedGardens || []) {
    if (canRemoveBuiltGarden(preview,number,currentRound())) preview=removeBuiltGarden(preview,number,currentRound());
  }
  return preview;
}
function visibleGardenKind(label) { return gardenKindAtRound(gardenGame(),label,currentRound()); }
function editableGarden(label) { return canRemoveBuiltGarden(gardenGame(),label,currentRound()); }
const coffeeForm = () => editor.houseForm.kind==='coffee'||isCoffeeSale(editor.houseForm);
const mealHouses = () => editor.houses.filter(h=>!isCoffeeSale(h));
const availableHouses = () => houseOptions(game).filter(id=>!coffeeForm()||mealHouses().some(h=>sameHouse(h.number,id)));
const formGoods = () => coffeeForm()?[COFFEE]:GOODS;
function renderHousePicker() {
  const selected=houseId(editor.houseForm.number);
  return html`<dialog id="house-picker" class="house-picker" aria-labelledby="house-picker-title"><div class="house-picker-heading"><h2 id="house-picker-title">Haus wählen</h2><button class="text-button" data-action="close-house-picker" aria-label="Schließen">×</button></div><div class="house-picker-legend"><span><i class="house-key"></i>Ohne Garten</span><span><i class="house-key native"></i>Mit Garten</span><span><i class="house-key built"></i>Garten gebaut</span></div><div class="house-number-grid">${availableHouses().map(number=>{const kind=visibleGardenKind(number);return html`<button class="house-tile ${kind==='native'?'native-garden':kind==='built'?'built-garden':''} ${selected===number?'selected':''}" data-action="select-house" data-number="${number}" aria-label="Haus ${number} · ${kind==='native'?t('Mit Garten'):kind==='built'?t('Garten gebaut'):t('Ohne Garten')}" aria-pressed="${selected===number}"><strong>${number}</strong><small>${isApartment(number)?t('Apartment'):kind==='built'?t('Garten gebaut'):kind==='native'?t('Mit Garten'):t('Ohne Garten')}</small></button>`;}).join('')}</div><p class="hint">Gebaute Gärten bleiben für diese Partie gespeichert.</p></dialog>`;
}
function housePreview() {
  if (editor.houseForm.player === null) return t('Spieler auswählen');
  try { return money(calculateHouse(editor.houseForm, editor.rows[editor.houseForm.player].milestones).total); }
  catch { return '0 $'; }
}
const MILESTONE_TAGS = {burger:'Burger +5 $',pizza:'Pizza +5 $',drink:'Getränke +5 $',waitress:'Waitress 5 $',price:'Stückpreis −1 $',cfo:'CFO +50 %',marketeer:'Marketing +5 $ · Entfernung −2',salary:'Löhne 3 $',beer:'Warenzahlung',discount:'Bank −100 $ ab 3 $ Rabatt',coffee:'Erster Kaffee verkauft'};
function comparisonPrice(i) {
  const raw = editor.houseForm.player === i ? editor.houseForm.price : editor.rows[i].price;
  return raw - (editor.rows[i].milestones.price ? 1 : 0);
}
function comparisonValue(i) {
  const price=comparisonPrice(i);
  return editor.rows[i].milestones.marketeer && !coffeeForm() ? html`${money(price-2)}<small>Vergleich · Zahlung: ${money(price)}</small>` : money(price);
}
function playerChoices() {
  return html`<div class="player-options">${game.players.map((p,i) => html`<div class="player-option"><button class="choice ${editor.houseForm.player === i ? 'selected' : ''}" style="--player-color:${p.color}" data-action="house-player" data-index="${i}" aria-pressed="${editor.houseForm.player === i}"><span class="player-choice-name">${playerName(p)}</span><small class="player-unit-price" data-player-price="${i}">${money(comparisonPrice(i))} / Ware</small></button><div class="milestone-tags" aria-label="Meilensteine von ${esc(p.name)}">${milestoneList(editor.rows[i].milestones,game).filter(([key]) => editor.rows[i].milestones[key]).map(([key,label,hint]) => html`<span class="milestone-tag" title="${esc(t(label))}: ${esc(t(hint))}">${t(MILESTONE_TAGS[key])}</span>`).join('') || htmlText('<span class="no-milestones">Keine Meilensteine</span>')}</div></div>`).join('')}</div>`;
}
function goodsUnitPrice(key) {
  const i = editor.houseForm.player;
  if (i === null) return t('Spieler wählen');
  const m = editor.rows[i].milestones;
  const bonus = key==='coffee'?false:key === 'burger' ? m.burger : key === 'pizza' ? m.pizza : m.drink;
  return html`${money(comparisonPrice(i) * (editor.houseForm.type === 'garden' ? 2 : 1) + (bonus ? 5 : 0))} / Stück`;
}
function priceComparison() {
  return html`<section class="price-comparison"><div class="sidebar-heading"><h2>${coffeeForm()?t('Kaffeepreise'):t('Preisvergleich')}</h2></div><p class="comparison-intro">Stückpreise aller Spieler auf einen Blick.</p><div class="comparison-columns"><span>Spieler</span><span>Basispreis</span><span>${game.milestoneSet==='new'&&!coffeeForm()?t('Vergleichspreis'):t('Stückpreis')}</span></div>${game.players.map((p,i) => html`<div class="comparison-row"><span>${playerName(p)}</span><label><span class="sr-only">Basispreis vor Preis-Meilenstein für ${esc(p.name)}</span><div class="stepper"><button type="button" data-action="price-count" data-index="${i}" data-delta="-1" aria-label="Basispreis für ${esc(p.name)} um 1 Dollar senken">−</button><input type="number" inputmode="numeric" min="${editor.rows[i].milestones.price ? 1 : 0}" max="100" step="1" required data-comparison-price="${i}" value="${editor.houseForm.player === i ? editor.houseForm.price : editor.rows[i].price}"><button type="button" data-action="price-count" data-index="${i}" data-delta="1" aria-label="Basispreis für ${esc(p.name)} um 1 Dollar erhöhen">+</button></div></label><strong data-comparison-unit="${i}">${comparisonValue(i)}</strong></div>`).join('')}${coffeeForm()?htmlText('<p class="hint">Kaffee wird entlang der am Brett bestimmten Route gekauft. Preis und Marketeer-Entfernungsbonus ändern diese Route nicht.</p>'):game.milestoneSet==='new'?htmlText('<p class="hint">Marketeer: −2 nur für den Vergleich Preis + Entfernung, nicht für die Zahlung. Discount Manager: Bei Basispreis 7 $ oder weniger werden 100 $ aus der Bank entfernt, auch ohne Verkauf.</p>'):htmlText('<p class="hint">Basispreis an Mitarbeiter anpassen. Der −1-$-Meilenstein ist im Stückpreis bereits enthalten. Warenboni und CFO erhöhen die Einnahmen.</p>')}</section>`;
}
function refreshHousePrices() {
  game.players.forEach((_,i) => {
    document.querySelector(`[data-player-price="${i}"]`).textContent = html`${money(comparisonPrice(i))} / Ware`;
    document.querySelector(`[data-comparison-unit="${i}"]`).innerHTML = comparisonValue(i);
  });
  formGoods().forEach(([key]) => { document.querySelector(`[data-goods-price="${key}"]`).textContent = goodsUnitPrice(key); });
  document.querySelector('#house-income').textContent = housePreview();
}
function renderSales() {
  const step = editor.step;
  app.innerHTML = html`${roundHeader()}<h1 class="round-title">Runde abrechnen</h1>
    <nav class="wizard-steps" aria-label="Rundenabrechnung">${[['houses',t('Häuser')],['extras',t('Bedienung & CFO')],['wages',t('Löhne')],['summary',t('Übersicht')]].map(([key,label],i) => html`<button data-action="sales-step" data-step="${key}" class="${step === key ? 'active' : ''}" ${step === key ? 'aria-current="step"' : ''}><b>${i + 1}</b>${t(label)}</button>`).join('')}</nav>
    <div id="sales-workspace"></div>`;
  const target = document.querySelector('#sales-workspace');
  if (step === 'houses') {
    const h = editor.houseForm;
    target.innerHTML = html`<div class="house-layout"><section class="panel house-form"><div class="form-title"><h2>${coffeeForm()?t('Kaffee verkaufen'):editor.editingHouse === null ? html`Verkauf ${mealHouses().length + 1}` : t('Verkauf bearbeiten')}</h2><div class="house-selector"><span>Hausnummer</span><button class="secondary house-picker-trigger" data-action="open-house-picker" aria-haspopup="dialog">${h.number ? houseLabel(h.number) : t('Haus wählen')}<small>${visibleGardenKind(h.number)==='built'?t('Garten gebaut'):visibleGardenKind(h.number)==='native'?t('Mit Garten'):t('Hausnummer auswählen')}</small></button></div></div><fieldset><legend>${coffeeForm()?t('1. Wer verkauft den Kaffee?'):t('1. Wer beliefert das Haus?')}</legend>${playerChoices()}</fieldset><fieldset><legend>2. Was wurde verkauft?</legend><div class="house-goods">${formGoods().map(([key,label,icon]) => html`<label><span>${icon} ${t(label)}</span><small class="goods-unit-price" data-goods-price="${key}">${goodsUnitPrice(key)}</small><div class="stepper"><button data-action="house-count" data-field="${key}" data-delta="-1" aria-label="${t(label)} weniger">−</button><input type="number" inputmode="numeric" min="0" max="1000000" step="1" required data-house="${key}" value="${h[key]}" aria-label="Anzahl ${t(label)}"><button data-action="house-count" data-field="${key}" data-delta="1" aria-label="${t(label)} mehr">+</button></div></label>`).join('')}</div>${coffeeForm()?htmlText('<p class="goods-price-note">Kaffee: ein Stück je passierter Filiale. Route am Brett bestimmen. Der Zielbetrieb verkauft keinen Kaffee. Kein Getränkemeilenstein.</p>'):htmlText('<p class="goods-price-note">Erlös je Stück inkl. Meilenstein- und Gartenbonus, ohne CFO.</p>')}</fieldset>${!coffeeForm()?html`<fieldset><legend>3. Welches Haus?</legend><div class="house-types">${[['normal','⌂',t('Ohne Garten'),t('Einfacher Stückpreis')],['garden','♧',t('Mit Garten'),t('Doppelter Stückpreis')]].map(([type,icon,label,hint]) => html`<button class="choice ${h.type === type ? 'selected' : ''}" data-action="house-type" data-type="${type}" aria-pressed="${h.type === type}" ${coffeeForm() || (type==='normal'&&visibleGardenKind(h.number)!=='none'&&!editableGarden(h.number)) || (type==='garden'&&isApartment(h.number))?'disabled':''}><span class="type-icon">${icon}</span><span>${t(label)}<small>${t(hint)}</small></span></button>`).join('')}</div>${coffeeForm()?htmlText('<p class="hint">Der Gartenstatus wird vom Essensverkauf dieses Hauses übernommen.</p>'):''}${isApartment(h.number)?htmlText('<p class="hint">Apartments können keinen Garten haben.</p>'):''}${editableGarden(h.number) ? htmlText('<p class="hint">In dieser Baurunde kannst du den Garten korrigieren. Die Änderung wird mit der Runde bestätigt; spätere Verkäufe dieses Hauses werden neu berechnet.</p>') : ''}</fieldset>`:''}<div class="house-price"><div><span>Verkauf inkl. Meilensteinen</span><strong id="house-income">${housePreview()}</strong><small>Trinkgeld und CFO folgen in Schritt 2.</small></div></div><div class="house-form-actions">${editor.editingHouse !== null || coffeeForm() ? htmlText('<button class="secondary" data-action="cancel-house">Abbrechen</button>') : ''}<button data-action="save-house">${coffeeForm()?t('Kaffee speichern'):editor.editingHouse !== null ? t('Verkauf speichern') : t('Haus übernehmen & nächstes')} →</button></div></section><aside class="house-sidebar">${priceComparison()}<div class="sidebar-heading"><h2>Diese Runde</h2><span>${mealHouses().length} ${mealHouses().length === 1 ? t('Haus') : t('Häuser')}</span></div>${houseList()}<div class="sidebar-total"><span>Warenumsatz inkl. Meilensteinen</span><strong>${money(editor.houses.reduce((sum, house) => sum + calculateHouse(house, editor.rows[house.player].milestones).total, 0))}</strong></div><button class="secondary" data-action="sales-step" data-step="extras">Essenszeit abschließen →</button></aside></div>`;
  } else if (step === 'extras') {
    target.innerHTML = html`<div class="entry-grid">${game.players.map((p,i) => html`<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3>${roundMilestones(editor.rows[i],i)}${waitressField(editor.rows[i],i)}${cfoButton(editor.rows[i],i)}${roundCalculation(editor.rows[i],i)}</article>`).join('')}</div><div class="commit-bar"><button class="secondary" data-action="sales-step" data-step="houses">← Häuser</button><button data-action="sales-step" data-step="wages">Weiter zu den Löhnen →</button></div>`;
  } else if (step === 'wages') {
    renderRoundWages(target);
  } else {
    const settlement = previewRound();
    target.innerHTML = html`<section class="panel summary-houses"><div class="sidebar-heading"><h2>Alle Hausverkäufe</h2><button class="secondary" data-action="add-house">+ Weiteres Haus</button></div>${houseList()}</section><div class="summary-heading"><h2>Rundenabrechnung pro Spieler</h2><div><button class="text-button" data-action="sales-step" data-step="extras">Bedienungen & CFO bearbeiten</button><button class="text-button" data-action="sales-step" data-step="wages">Löhne bearbeiten</button></div></div>${settlement.ended ? htmlText('<p class="round-warning">Zweiter Bankbruch: Alle Einnahmen werden ausgezahlt, Löhne entfallen.</p>') : ''}${bankNotice()}${renderReview()}<div class="commit-bar"><span>${editor.index === null ? t('Einnahmen und Löhne werden zusammen gebucht.') : t('Die Korrektur berechnet alle folgenden Kontostände neu.')}</span><button data-action="commit">${editor.index === null ? t('Runde bestätigen') : t('Änderung speichern')} ✓</button></div>`;
  }
  app.insertAdjacentHTML('beforeend', renderHousePicker());
}
function bankNotice() {
  const removed=editor.rows.map(bankRemoval);
  if (!removed.some(Boolean)) return '';
  return html`<section class="round-warning bank-removal"><strong>Discount Manager · Geld wird aus dem Spiel entfernt</strong><p>Mindestens 3 $ Preisnachlass: je 100 $ pro berechtigtem Spieler.</p>${removed.map((value,i)=>value?html`<div>${playerName(game.players[i])}: −${money(value)} aus der Bank</div>`:'').join('')}<p>Keine Spielereinnahmen. Gilt auch in der letzten Runde und kann einen Bankbruch auslösen.</p></section>`;
}
function roundMilestones(row,i) {
  if (!row.milestones.newSet&&!game.modules?.coffee) return '';
  return html`<details><summary>Meilensteine dieser Runde <span>${milestoneList(row.milestones,game).filter(([key])=>row.milestones[key]).length} aktiv</span></summary><div class="milestones">${milestoneList(row.milestones,game).map(([key,label,hint])=>html`<label class="check"><input type="checkbox" data-row="${i}" data-milestone="${key}" ${row.milestones[key]?'checked':''}><span>${t(label)}<small>${t(hint)}</small></span></label>`).join('')}</div></details>`;
}
function demandField(row,i) {
  if (!row.milestones.marketeer) return '';
  return html`<label class="waitress-field"><span>Nachfragemarker durch eigenes Marketing</span><div class="stepper"><button data-action="demand-count" data-index="${i}" data-delta="-1" aria-label="Ein Nachfragemarker weniger">−</button><input type="number" inputmode="numeric" min="0" max="1000000" step="1" required data-demand="${i}" value="${row.demand ?? 0}" aria-label="Nachfragemarker für ${esc(game.players[i].name)}"><button data-action="demand-count" data-index="${i}" data-delta="1" aria-label="Ein Nachfragemarker mehr">+</button></div><small>5 $ je Marker · nach Löhnen, ohne CFO. Nur durch eigene Marketeers platzierte Marker zählen.</small></label>`;
}
function previewRound() { return roundSettlement(gardenGame(),editor.rows,editor.wages,editor.index,editor.reserves); }
function wageCardCalculation(i, settlement = previewRound()) {
  if (settlement.ended) return "";
  const cost = settlement.expenses[i];
  return html`<dl><div><dt>Bisheriger Stand</dt><dd>${money(settlement.before.balances[i])}</dd></div><div><dt>+ Einnahmen</dt><dd>${money(settlement.incomes[i])}</dd></div><div><dt>− Ausgaben / Löhne</dt><dd>${money(cost)}</dd></div>${settlement.marketing[i]?html`<div><dt>+ Marketing nach Löhnen</dt><dd>${money(settlement.marketing[i])}</dd></div>`:''}<div class="calculation-total"><dt>Neuer Stand</dt><dd>${money(settlement.balances[i])}</dd></div></dl>`;
}
function renderRoundWages(target) {
  const settlement = previewRound();
  if (settlement.needsReserve) {
    renderReserve(target, true);
    return;
  }
  if (settlement.ended) {
    target.innerHTML = bankNotice() + htmlText('<section class="panel final-round-notice"><span class="final-round-icon" aria-hidden="true">&#9733;</span><h2>Das Spiel ist zu Ende.</h2><p>Die Bank ist zum zweiten Mal gebrochen. Es werden keine L&ouml;hne mehr gezahlt.</p><p>Pr&uuml;ft jetzt die letzte Runde. Gewinner und Endst&auml;nde werden nach der Best&auml;tigung aufgedeckt.</p></section><div class="commit-bar"><button class="secondary" data-action="sales-step" data-step="extras">&larr; Bedienung &amp; CFO</button><button data-action="sales-step" data-step="summary">Letzte Runde pr&uuml;fen &rarr;</button></div>');
    if (game.milestoneSet==='new') target.querySelector('.final-round-notice').insertAdjacentHTML('beforeend',htmlText('<p>Es folgt keine Marketingphase: Nachfragemarker bringen in dieser letzten Runde kein weiteres Geld.</p>'));
    return;
  }
  target.innerHTML = html`<div class="entry-grid">${game.players.map((p,i) => html`<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3><label class="waitress-field"><span>Zu bezahlende Mitarbeiter</span><div class="stepper"><button data-action="wage-count" data-index="${i}" data-delta="-1" aria-label="Ein Mitarbeiter weniger für ${esc(p.name)}">−</button><input type="number" inputmode="numeric" min="0" max="1000000" step="1" required data-wage="${i}" value="${editor.wages[i]}" aria-label="Zu bezahlende Mitarbeiter für ${esc(p.name)}"><button data-action="wage-count" data-index="${i}" data-delta="1" aria-label="Ein Mitarbeiter mehr für ${esc(p.name)}">+</button></div><small>${money(salaryRate(editor.rows[i]))} je Mitarbeiter · Rabatte vorher selbst berücksichtigen</small></label>${demandField(editor.rows[i],i)}<div class="round-calculation" id="wage-calculation-${i}" aria-live="polite">${wageCardCalculation(i,settlement)}</div></article>`).join('')}</div><p class="round-warning" id="wage-issues" ${settlement.issues.length ? '' : 'hidden'}>${esc(settlement.issues.join(' '))}</p><div class="commit-bar"><button class="secondary" data-action="sales-step" data-step="extras">← Bedienung & CFO</button><button data-action="sales-step" data-step="summary">Gesamtübersicht prüfen →</button></div>`;
}
function refreshWages() {
  const settlement = previewRound();
  if (settlement.ended || settlement.needsReserve) {
    renderRoundWages(document.querySelector('#sales-workspace'));
    return;
  }
  editor.wages.forEach((_,i) => { document.querySelector(`#wage-calculation-${i}`).innerHTML = wageCardCalculation(i,settlement); });
  const issues = document.querySelector('#wage-issues');
  issues.textContent = settlement.issues.join(' ');
  issues.hidden = !settlement.issues.length;
}
function houseHasGoods() { return allGoods.some(([key]) => editor.houseForm[key] > 0); }
function validInputs() {
  const invalid = app.querySelector('input:invalid');
  if (invalid) { invalid.setCustomValidity(t('Bitte eine gültige Zahl im angezeigten Bereich eingeben.')); invalid.reportValidity(); return false; }
  return true;
}
function storeHouse() {
  if (!validInputs()) return false;
  const house = editor.houseForm;
  if (house.player === null || !game.players[house.player]) throw new Error(t('Bitte den Spieler auswählen, der dieses Haus beliefert.'));
  if (!house.number.trim()) throw new Error(t('Bitte eine Hausnummer auswählen.'));
  calculateHouse(house, editor.rows[house.player].milestones);
  const old=editor.editingHouse===null?null:editor.houses[editor.editingHouse];
  if (old&&!isCoffeeSale(old)&&!sameHouse(old.number,house.number)&&editor.houses.some(h=>isCoffeeSale(h)&&sameHouse(h.number,old.number))) throw new Error(t('Bitte zugehörige Kaffeeverkäufe zuerst entfernen, bevor du das Haus änderst.'));
  if (coffeeForm()) {
    const parent=mealHouses().find(h=>sameHouse(h.number,house.number));
    if (!parent) throw new Error(t('Kaffee benötigt einen erfassten Essensverkauf für dieses Haus.'));
    house.type=parent.type;
  } else editor.houses.filter(h=>isCoffeeSale(h)&&sameHouse(h.number,house.number)).forEach(h=>{h.type=house.type;});
  const number=houseNumber(house.number);
  if (house.type==='normal' && canRemoveBuiltGarden(game,number,currentRound())) {
    editor.removedGardens=[...new Set([...editor.removedGardens,number])];
    editor.houses.forEach(saved=>{if(houseNumber(saved.number)===number) saved.type='normal';});
  } else if (house.type==='garden' && editor.removedGardens.includes(number)) {
    editor.removedGardens=editor.removedGardens.filter(value=>value!==number);
    editor.houses.forEach(saved=>{if(houseNumber(saved.number)===number) saved.type='garden';});
  }
  const order = editor.editingHouse === null ? Math.max(-1, ...editor.houses.map(h => h.order ?? 0)) + 1 : editor.houses[editor.editingHouse].order;
  const saved = { ...house, order, number: house.number.trim() || html`Haus ${(order ?? editor.editingHouse) + 1}` };
  if (editor.editingHouse === null) editor.houses.push(saved);
  else editor.houses[editor.editingHouse] = saved;
  editor.houseForm = newHouse();
  editor.editingHouse = null;
  syncHouseRows();
  return true;
}
function numberField(label, key, row, value, max = 1000000) {
  return html`<label>${t(label)}<input type="number" inputmode="numeric" min="0" max="${max}" step="1" required data-row="${row}" data-field="${key}" value="${value}"></label>`;
}
function waitressField(row, i) {
  return html`<label class="waitress-field"><span>Bedienungen / Waitresses</span><div class="stepper"><button data-action="waitress-count" data-index="${i}" data-delta="-1" aria-label="Eine Waitress weniger für ${esc(game.players[i].name)}">−</button><input type="number" inputmode="numeric" min="0" max="1000000" step="1" required data-row="${i}" data-field="waitresses" value="${row.waitresses}" aria-label="Anzahl Waitresses für ${esc(game.players[i].name)}"><button data-action="waitress-count" data-index="${i}" data-delta="1" aria-label="Eine Waitress mehr für ${esc(game.players[i].name)}">+</button></div><small>${row.milestones.waitress ? t('Meilenstein aktiv: 5 $') : '3 $'} Trinkgeld je Waitress</small></label>`;
}
function cfoContent(row) {
  const active = row.cfo || row.milestones.cfo;
  return html`<span class="cfo-icon" aria-hidden="true">${row.milestones.cfo ? '◆' : active ? '✓' : '+'}</span><span class="cfo-label"><strong>CFO +50 %</strong><small>${row.milestones.cfo ? t('Meilenstein · dauerhaft aktiv') : active ? t('Bonus auf Einnahmen und Trinkgeld') : t('Bonus für diese Runde einschalten')}</small></span><span class="cfo-state">${active ? t('Aktiv') : t('Inaktiv')}</span>`;
}
function cfoButton(row, i) {
  const active = row.cfo || row.milestones.cfo;
  return html`<button class="cfo-toggle ${active ? 'is-active' : ''} ${row.milestones.cfo ? 'is-milestone' : ''}" data-action="toggle-cfo" data-index="${i}" aria-pressed="${Boolean(active)}" aria-label="CFO für ${esc(game.players[i].name)}${row.milestones.cfo ? t(', durch Meilenstein dauerhaft aktiv') : ''}" ${row.milestones.cfo ? 'disabled' : ''}>${cfoContent(row)}</button>`;
}
function calculationLines(row, i) {
  try {
    const c = calculateSale(row);
    const active = row.cfo || row.milestones.cfo;
    return html`<dl><div><dt>Einnahmen<small>Waren inkl. Meilensteinboni</small></dt><dd>${money(c.revenue + c.bonus)}</dd></div>${game.modules?.coffee?html`<div><dt>+ Kaffee<small>${row.coffee ?? 0} Stück · ohne Getränkebonus</small></dt><dd>${money(c.coffeeRevenue)}</dd></div>`:''}<div><dt>+ Waitresses<small>${row.waitresses} × ${money(row.milestones.waitress ? 5 : 3)}</small></dt><dd>${money(c.tips)}</dd></div><div><dt>+ CFO<small>${active ? html`50 % auf ${money(c.revenue + c.coffeeRevenue + c.bonus + c.tips)} · aufgerundet` : t('Inaktiv')}</small></dt><dd>${money(c.cfo)}</dd></div><div class="calculation-total"><dt>Gesamtergebnis</dt><dd id="row-total-${i}">${money(c.total)}</dd></div></dl>`;
  } catch { return htmlText('<p class="hint">Bitte die Verkaufseingaben prüfen.</p>'); }
}
function roundCalculation(row, i) {
  return html`<div class="round-calculation" id="row-calculation-${i}" aria-live="polite">${calculationLines(row,i)}</div>`;
}
function refreshSaleCard(i) {
  const row = editor.rows[i];
  document.querySelector(`#row-calculation-${i}`).innerHTML = calculationLines(row,i);
  const button = app.querySelector(`[data-action="toggle-cfo"][data-index="${i}"]`);
  const active = Boolean(row.cfo || row.milestones.cfo);
  button.classList.toggle('is-active',active);
  button.classList.toggle('is-milestone',row.milestones.cfo);
  button.disabled = row.milestones.cfo;
  button.setAttribute('aria-pressed',String(active));
  button.innerHTML = cfoContent(row);
  const rate = app.querySelector(`[data-row="${i}"][data-field="waitresses"]`).closest('label').querySelector('small');
  rate.textContent = html`${row.milestones.waitress ? t('Meilenstein aktiv: 5 $') : '3 $'} Trinkgeld je Waitress`;
}
function renderEditor(target) {
  const sale = editor.type === 'sale';
  const editing = editor.index !== null;
  target.innerHTML = html`<div class="phase-heading"><div><p class="eyebrow">RUNDE ${currentRound()} · ${editing ? t('BUCHUNG BEARBEITEN') : sale ? t('01 / VERKAUF') : t('02 / LÖHNE')}</p><h2>${review ? t('Alles richtig erfasst?') : sale ? t('Was ging über die Theke?') : t('Zeit für die Gehälter.')}</h2><p>${sale ? t('Verkaufte Waren und Bedienungen je Spieler erfassen.') : t('Die tatsächlich zu bezahlenden Mitarbeiter eingeben. Je Person werden 5 $ abgezogen.')}</p></div>${editing ? htmlText('<button class="text-button" data-action="cancel-edit">Abbrechen</button>') : ''}</div>
    ${review ? renderReview() : html`<div class="entry-grid">${game.players.map((p,i) => html`<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3>${sale ? saleFields(editor.rows[i], i) : html`${numberField(t('Zu bezahlende Mitarbeiter'), 'salary', i, editor.rows[i])}<div class="salary-total" id="row-total-${i}">${money(editor.rows[i]*5)}</div><p class="hint">Rabatte und kostenlose Mitarbeiter vorher selbst berücksichtigen.</p>`}</article>`).join('')}</div>`}
    <div class="commit-bar"><span>${editing ? t('Die Änderung berechnet alle folgenden Kontostände neu.') : t('Erst bestätigen, dann wird gebucht.')}</span><div>${review ? htmlText('<button class="secondary" data-action="back-input">← Eingaben</button>') : ''}<button data-action="${review ? 'commit' : 'review'}">${review ? editing ? t('Änderung speichern') : sale ? t('Verkauf bestätigen ✓') : t('Löhne bestätigen ✓') : t('Übersicht prüfen →')}</button></div></div>`;
}
function saleFields(row, i) {
  return html`<div class="goods-grid">${GOODS.map(([key,label,icon]) => numberField(html`${icon} ${t(label)}`,key,i,row[key])).join('')}${waitressField(row,i)}</div>
    <div class="pricing">${numberField(t('Stückpreis vor −1-$-Meilenstein'),'price',i,row.price,100)}</div>${cfoButton(row,i)}
    <details><summary>Meilensteine <span>${milestoneList(row.milestones,game).filter(([key]) => row.milestones[key]).length} aktiv</span></summary><div class="milestones">${milestoneList(row.milestones,game).map(([key,label,hint]) => html`<label class="check"><input type="checkbox" data-row="${i}" data-milestone="${key}" ${row.milestones[key] ? 'checked' : ''}><span>${t(label)}<small>${t(hint)}</small></span></label>`).join('')}</div><p class="hint">Den 100-$-Meilenstein erst ab der Folgerunde aktivieren. Meilensteine werden beim Buchen für kommende Runden übernommen.</p></details>
    <details><summary>Gartenbonus</summary>${numberField(t('Davon an Häuser mit Garten verkauft'),'garden',i,row.garden)}<p class="hint">Nur die Gesamtzahl der Gartenwaren. Ihr Stückpreis zählt doppelt, Meilensteinboni zählen einfach. Keine Häuserverwaltung.</p></details>
    ${roundCalculation(row,i)}`;
}
function safeTotal(row) { try { return money(calculateSale(row).total); } catch { return t('Eingabe prüfen'); } }
function renderReview() {
  const sale = editor.type === 'sale';
  const settlement = sale && editor.wizard ? previewRound() : null;
  const revealBalance = settlement && !settlement.ended;
  return html`<section class="panel review"><div class="table-scroll"><table><thead><tr><th>Spieler</th>${sale ? (game.modules?.coffee?allGoods:GOODS).map(([,label]) => html`<th>${t(label)}</th>`).join('') + htmlText('<th>Bedienungen</th><th>Warenumsatz¹</th><th>Meilensteine</th><th>Trinkgeld</th><th>CFO</th>') : htmlText('<th>Mitarbeiter</th>')}<th>${sale ? t('Einnahmen') : t('Lohn')}</th>${settlement ? htmlText('<th>Ausgaben / Löhne</th>') + (game.milestoneSet==='new'?htmlText('<th>Marketing nach Löhnen</th>'):'') + (revealBalance ? htmlText('<th>Neuer Stand</th>') : '') : ''}</tr></thead><tbody>${game.players.map((p,i) => {
    const r = editor.rows[i]; const c = sale ? calculateSale(r) : null;
    return html`<tr><th>${playerName(p)}</th>${sale ? (game.modules?.coffee?allGoods:GOODS).map(([key]) => html`<td>${r[key] ?? 0}</td>`).join('') + html`<td>${r.waitresses}</td><td>${money(c.revenue+c.coffeeRevenue)}</td><td>${money(c.bonus)}</td><td>${money(c.tips)}</td><td>${money(c.cfo)}</td>` : html`<td>${r}</td>`}<td class="${settlement ? 'income-amount' : 'amount'}">${money(sale ? c.total : r*5)}</td>${settlement ? html`<td class="expense-amount">${money(settlement.expenses[i])}</td>${game.milestoneSet==='new'?html`<td>${money(settlement.marketing[i])}</td>`:''}${revealBalance ? html`<td class="amount new-balance">${money(settlement.balances[i])}</td>` : ''}` : ''}</tr>`;
  }).join('')}</tbody></table></div>${sale ? htmlText('<p class="hint">¹ Mit eingestelltem Stückpreis und gegebenenfalls Gartenbonus. CFO zählt auf Waren und Trinkgeld, nicht auf Marketing, und wird einmal aufgerundet.</p>') : ''}</section>`;
}
function renderReserve(target, preview = false) {
  target.innerHTML = html`<section class="panel reserve"><p class="eyebrow">ERSTER BANKBRUCH</p><h2>Zeit, die Reserve aufzudecken.</h2><p>Wählt den Geldbetrag der zu Beginn verdeckt gewählten Karte jedes Spielers. ${preview ? t('Die Bank reicht für die erfassten Verkäufe nicht aus. Die Reserve wird für die Vorschau berücksichtigt und erst mit der Runde gebucht.') : t('Noch ausstehende Einnahmen werden vollständig ausgezahlt.')}</p><div class="reserve-grid">${game.players.map((p,i) => html`<div class="reserve-player" role="group" aria-label="Reservekarte f&uuml;r ${esc(p.name)}"><strong>${playerName(p)}</strong><input type="hidden" data-reserve="${i}" value=""><div class="reserve-options">${[100,200,300].map(n => html`<button class="secondary" data-action="reserve-card" data-index="${i}" data-value="${n}" aria-pressed="false">${money(n)}</button>`).join('')}</div></div>`).join('')}</div><div class="reserve-total" aria-live="polite"><span>Neue Bankreserve<small id="reserve-equation">Bitte pro Spieler eine Karte w&auml;hlen.</small></span><strong id="reserve-total">${money(0)}</strong></div><button data-action="${preview ? 'round-reserve' : 'reserve'}">${preview ? t('Reserve für Vorschau übernehmen') : t('Reserve der Bank hinzufügen')}</button></section>`;
}
function renderLog(target) {
  const balances = game.players.map(() => 0);
  const rounds = [];
  const state = account(game);
  for (let index = 0; index < game.events.length; index++) {
    const sale = game.events[index];
    const salary = game.events[index + 1]?.type === 'salary' ? game.events[index + 1] : null;
    const incomes = sale.rows.map(row => calculateSale(row).total+(salary?marketingIncome(row):0));
    const expenses = game.players.map((_,i) => salary ? salary.rows[i] * salaryRate(sale.rows[i]) : 0);
    game.players.forEach((_,i) => { balances[i] += incomes[i] - expenses[i]; });
    const dates = [sale.updatedAt,salary?.updatedAt,salary?.createdAt,sale.createdAt].map(value => new Date(value)).filter(date => Number.isFinite(date.getTime()));
    const date = dates.sort((a,b) => b-a)[0];
    rounds.push({sale,salary,index,incomes,expenses,balances:[...balances],date,ended:state.secondBreak === index,reserve:state.firstBreak === index || (salary && state.firstBreak === index+1)});
    if (salary) index++;
  }
  target.innerHTML = html`<div class="ledger-heading"><h2>Protokoll</h2><p>+ Einnahmen <span>− Löhne</span> <strong>Neuer Stand</strong> · neueste Runde zuerst</p></div>${!rounds.length ? htmlText('<section class="panel"><p>Noch keine Buchungen. Los geht’s mit dem ersten Verkauf.</p></section>') : html`<div class="ledger-scroll"><table class="ledger-table"><caption class="sr-only">Einnahmen, Lohnausgaben und Kontostand pro Spieler nach jeder Runde</caption><thead><tr><th scope="col">Runde</th>${game.players.map(p => html`<th scope="col">${playerName(p)}<small>Einnahmen · Löhne · Stand</small></th>`).join('')}<th scope="col"><span class="sr-only">Aktionen</span></th></tr></thead>${rounds.reverse().map(round => html`<tbody class="ledger-round" data-round="${round.sale.round}"><tr class="ledger-main"><th scope="row" class="ledger-meta"><strong>Runde ${round.sale.round}</strong><small>${round.date ? esc(round.date.toLocaleString(locale(),{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})) : t('Ohne Zeitangabe')}${round.sale.updatedAt || round.salary?.updatedAt ? t(' · korrigiert') : ''}</small>${round.ended ? htmlText('<em>Spielende</em>') : !round.salary ? htmlText('<em>Löhne offen</em>') : ''}</th>${game.players.map((p,i) => html`<td class="ledger-player-cell"><span class="ledger-player-mobile">${playerName(p)}</span><div class="ledger-amounts"><span class="ledger-income" aria-label="Einnahmen">+${money(round.incomes[i])}</span><span class="ledger-expense" aria-label="Löhne">${round.salary || round.ended ? '−' + money(round.expenses[i]) : t('offen')}</span><strong aria-label="Neuer Stand">${money(round.balances[i])}</strong></div></td>`).join('')}<td class="ledger-actions"><button class="text-button" data-action="toggle-log-details" data-index="${round.index}" aria-expanded="false" aria-controls="log-details-${round.index}">Details</button><button class="secondary" data-action="edit" data-index="${round.index}" aria-label="Runde ${round.sale.round} bearbeiten">Bearbeiten</button></td></tr><tr class="ledger-detail-row" id="log-details-${round.index}" hidden><td colspan="${game.players.length + 2}">${logRoundDetails(round)}</td></tr></tbody>`).join('')}</table></div><button class="text-button danger ledger-undo" data-action="undo">${game.events.at(-1).combined ? t('Letzte Runde') : t('Letzte Buchung')} zurücknehmen</button>`}`;
}
function logRoundDetails(round) {
  return html`${round.sale.rows.some(row=>bankRemoval(row))?html`<p class="ledger-bank-note">Discount Manager: −${money(round.sale.rows.reduce((sum,row)=>sum+bankRemoval(row),0))} aus der Bank · keine Spielereinnahmen</p>`:''}${round.reserve ? html`<p class="ledger-bank-note">Erster Bankbruch${game.reserves ? html` · Reserve: ${money(game.reserves.reduce((sum,n) => sum+n,0))}` : t(' · Reserve noch offen')}</p>` : ''}<div class="ledger-detail-grid">${game.players.map((p,i) => {
    const row = round.sale.rows[i];
    const c = calculateSale(row);
    const goods = allGoods.filter(([key]) => row[key]).map(([key,label]) => html`${row[key]} ${t(label.split(' · ')[0])}`).join(' · ') || t('Keine Waren verkauft');
    return html`<section class="ledger-detail-player"><h3>${playerName(p)}</h3><p>${goods}</p><dl><div><dt>Warenumsatz</dt><dd>${money(c.revenue)}</dd></div>${game.modules?.coffee?html`<div><dt>Kaffee</dt><dd>+${money(c.coffeeRevenue)}</dd></div>`:''}<div><dt>Meilensteinboni</dt><dd>+${money(c.bonus)}</dd></div><div><dt>${row.waitresses} Waitresses</dt><dd>+${money(c.tips)}</dd></div><div><dt>CFO${row.cfo || row.milestones.cfo ? t(' · aktiv') : t(' · inaktiv')}</dt><dd>+${money(c.cfo)}</dd></div><div><dt>${round.salary ? html`${round.salary.rows[i]} Mitarbeiter × ${money(salaryRate(row))}` : round.ended ? t('Löhne entfallen') : t('Löhne noch offen')}</dt><dd>−${money(round.expenses[i])}</dd></div>${round.salary&&marketingIncome(row)?html`<div><dt>Marketing nach Löhnen</dt><dd>+${money(marketingIncome(row))}</dd></div>`:''}</dl>${row.houses?.length ? html`<ul class="ledger-houses">${row.houses.map(h => html`<li><div><strong>${houseLabel(h.number)}</strong><small>${h.type === 'garden' ? t('Mit Garten') : t('Ohne Garten')} · ${houseDescription(h)} · Stückpreis ${money(h.price - (row.milestones.price ? 1 : 0))}</small></div><span>${money(calculateHouse(h,row.milestones).total)}</span></li>`).join('')}</ul>` : ''}</section>`;
  }).join('')}</div>${round.salary && !round.sale.rows.every(row => Array.isArray(row.houses)) ? html`<button class="text-button" data-action="edit" data-index="${round.index + 1}">Alte Lohnbuchung bearbeiten</button>` : ''}`;
}
function render() {
  updateChrome();
  document.body.classList.toggle('fcm-theme', screen !== 'home');
  document.body.classList.toggle('sales-round', screen === 'sale');
  document.body.classList.toggle('playing', !['home','setup'].includes(screen));
  if (screen === 'home') home();
  else if (screen === 'setup') setup();
  else if (game && editor && screen === 'sale') renderSales();
  else if (game && editor && screen === 'entry') {
    app.innerHTML = html`${roundHeader()}<div id="workspace"></div>`;
    renderEditor(document.querySelector('#workspace'));
  }
  else if (game) dashboard();
  else { screen = 'home'; home(); }
}
function persistDraft() {
  if (editor?.completing) {
    game.draft = { type:'salary', rows:[...editor.wages], completion:{rows:structuredClone(editor.rows),houseForm:structuredClone(editor.houseForm),step:editor.step,editingHouse:editor.editingHouse,returnToSummary:editor.returnToSummary,reserves:editor.reserves,wagesReviewed:editor.wagesReviewed,removedGardens:[...editor.removedGardens]} };
    save(); return;
  }
  if (editor?.index === null) {
    game.draft = { type: editor.type, rows: structuredClone(editor.rows) };
    if (editor.wizard) Object.assign(game.draft, { houseForm: structuredClone(editor.houseForm), step: editor.step, editingHouse: editor.editingHouse, returnToSummary: editor.returnToSummary, wages:[...editor.wages], reserves:editor.reserves, wagesReviewed:editor.wagesReviewed, removedGardens:[...editor.removedGardens] });
    save();
  }
}
function checkEditor() {
  if (editor.wizard) {
    const settlement = previewRound();
    if (settlement.needsReserve) throw new Error(t('Bitte zuerst im Lohnschritt die Reservekarten aufdecken.'));
    if (settlement.issues.length) throw new Error(settlement.issues.join(' '));
    return settlement.candidate;
  }
  if (editor.type === 'sale') editor.rows.forEach(calculateSale);
  else editor.rows.forEach(n => { if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new Error(t('Bitte eine gültige Mitarbeiterzahl eingeben.')); });
  const candidate = structuredClone(game);
  const event = { type: editor.type, round: currentRound(), rows: structuredClone(editor.rows), createdAt: new Date().toISOString() };
  if (editor.index === null) candidate.events.push(event);
  else candidate.events[editor.index] = { ...candidate.events[editor.index], ...event, createdAt: candidate.events[editor.index].createdAt, updatedAt: new Date().toISOString() };
  if (editor.index === null) candidate.draft = null;
  const result = account(candidate);
  if (result.issues.length) throw new Error(result.issues.join(' '));
  if (editor.index !== null && result.needsReserve && editor.index !== candidate.events.length - 1) throw new Error(t('Diese Änderung benötigt Reservekarten. Bitte zuerst die späteren Buchungen zurücknehmen.'));
  return candidate;
}
app.addEventListener('input', event => {
  event.target.setCustomValidity?.('');
  const input = event.target;
  if (input.dataset.setupName !== undefined) { setupPlayers[+input.dataset.setupName].name = input.value; return; }
  if (input.dataset.achievement !== undefined) {
    game.players[+input.dataset.player].milestones[input.dataset.achievement] = input.checked;
    save(); return;
  }
  if (input.dataset.demand !== undefined && editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    editor.rows[+input.dataset.demand].demand=input.valueAsNumber;
    refreshWages(); persistDraft(); return;
  }
  if (input.dataset.wage !== undefined && editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    editor.wages[+input.dataset.wage] = input.valueAsNumber;
    refreshWages(); persistDraft(); return;
  }
  if (input.dataset.comparisonPrice !== undefined && editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    const i = +input.dataset.comparisonPrice;
    editor.rows[i].price = input.valueAsNumber;
    if (editor.houseForm.player === i) {
      editor.houseForm.price = input.valueAsNumber;
    }
    refreshHousePrices(); persistDraft(); return;
  }
  if (input.dataset.house !== undefined && editor?.wizard) {
    const key = input.dataset.house;
    if (key === 'number') editor.houseForm.number = input.value;
    else { if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return; editor.houseForm[key] = input.valueAsNumber; }
    refreshHousePrices();
    persistDraft(); return;
  }
  if (input.dataset.row === undefined || !editor) return;
  const i = +input.dataset.row;
  if (input.dataset.milestone) {
    editor.rows[i].milestones[input.dataset.milestone] = input.checked;
    // Explicit CFO selection remains independent of the permanent milestone.
    const card = input.closest('.player-entry');
    card.querySelector('summary span').textContent = html`${milestoneList(editor.rows[i].milestones,game).filter(([key]) => editor.rows[i].milestones[key]).length} aktiv`;
  } else {
    const value = input.type === 'checkbox' ? input.checked : input.valueAsNumber;
    if (typeof value === 'number' && (!input.validity.valid || !Number.isFinite(value))) return;
    if (editor.type === 'salary') editor.rows[i] = value;
    else editor.rows[i][input.dataset.field] = value;
  }
  if (editor.type === 'sale') refreshSaleCard(i);
  else document.querySelector(`#row-total-${i}`).textContent = money(editor.rows[i]*5);
  persistDraft();
});
app.addEventListener('change', event => {
  const input = event.target;
  if (input.dataset.setupName !== undefined) setupPlayers[+input.dataset.setupName].name = input.value;
});
app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  try {
    switch (button.dataset.action) {
      case 'language': {
        setLanguage(button.dataset.language);
        document.querySelector('#notice').classList.remove('visible');
        break;
      }
      case 'home': screen = 'home'; editor = null; break;
      case 'setup':
        setupCount = game?.players.length ?? 3;
        setupMilestones = 'base';
        setupModules = {newDistricts:false,apartments:false,coffee:false};
        setupPlayers = Array.from({ length: 6 }, (_,i) => ({ name:'', color:null }));
        screen = 'setup'; break;
      case 'setup-module':
        readSetupPlayers();
        if (!['newDistricts','apartments','coffee'].includes(button.dataset.module)) return;
        setupModules[button.dataset.module]=!setupModules[button.dataset.module]; break;
      case 'setup-milestones':
        readSetupPlayers();
        if (!['base','new'].includes(button.dataset.set)) return;
        setupMilestones=button.dataset.set; break;
      case 'setup-count': {
        readSetupPlayers();
        const count=+button.dataset.count;
        if (![2,3,4,5,6].includes(count)) return;
        setupCount=count;
        setupPlayers.slice(count).forEach(player=>{player.color=null;});
        break;
      }
      case 'setup-color': {
        readSetupPlayers();
        const index=+button.dataset.index, color=button.dataset.color;
        if (!COLORS.includes(color) || index<0 || index>=setupCount || setupPlayers.slice(0,setupCount).some((p,i)=>i!==index&&p.color===color)) return;
        setupPlayers[index].color=setupPlayers[index].color===color?null:color;
        break;
      }
      case 'start': {
        // Autofill and some mobile keyboards do not reliably emit input events.
        // The visible setup fields are authoritative when starting the game.
        readSetupPlayers();
        const missingName = [...app.querySelectorAll('[data-setup-name]')].find(input => !input.value.trim());
        if (missingName) {
          missingName.setCustomValidity(t('Bitte für jeden Spieler einen Namen eingeben.'));
          missingName.reportValidity();
          return;
        }
        if (setupPlayers.slice(0,setupCount).some(player=>!player.color)) throw new Error(t('Bitte für jeden Spieler eine Farbe auswählen.'));
        const players = setupPlayers.slice(0,setupCount).map(p => ({ name: p.name.trim(), color: p.color, milestones: milestones() }));
        const next = validateGame({ version: 1, players, milestoneSet:setupMilestones, modules:{...setupModules}, reserves: null, events: [], draft: null, builtGardens:[] });
        if (game && !confirm(t('Die bisherige Partie auf diesem Gerät ersetzen? Vorher bei Bedarf exportieren.'))) return;
        game = next; save(); screen = 'table'; editor = null; break;
      }
      case 'resume': case 'table': screen = 'table'; editor = null; review = false; break;
      case 'log': screen = 'log'; editor = null; break;
      case 'statistics': case 'awards':
        if (account(game).secondBreak === null) return;
        screen = button.dataset.action; editor = null; break;
      case 'statistics-metric':
        if (!['balance','income','net','wages'].includes(button.dataset.metric)) return;
        statisticsMetric = button.dataset.metric; break;
      case 'toggle-log-details': {
        const details = document.querySelector(`#log-details-${button.dataset.index}`);
        details.hidden = !details.hidden;
        button.setAttribute('aria-expanded', String(!details.hidden));
        button.textContent = details.hidden ? t('Details') : t('Schließen');
        return;
      }
      case 'open-round':
        beginEditor(); screen = editor.wizard ? 'sale' : 'entry'; persistDraft(); window.scrollTo(0,0); break;
      case 'leave-round':
        persistDraft(); screen = editor.index === null || editor.completing ? 'table' : 'log'; editor = null; break;
      case 'house-player':
        if (!validInputs()) return;
        if (editor.houseForm.player !== +button.dataset.index) editor.houseForm.price = editor.rows[+button.dataset.index].price;
        editor.houseForm.player = +button.dataset.index; persistDraft(); break;
      case 'open-house-picker':
        if (!validInputs()) return;
        app.querySelector('#house-picker').showModal();
        return;
      case 'close-house-picker': app.querySelector('#house-picker').close(); return;
      case 'select-house': {
        const number=houseId(button.dataset.number);
        if (!availableHouses().includes(number)) return;
        editor.houseForm.number=String(number);
        editor.houseForm.type=coffeeForm()?mealHouses().find(h=>sameHouse(h.number,number)).type:visibleGardenKind(number)==='none'?'normal':'garden';
        persistDraft();
        requestAnimationFrame(()=>app.querySelector('[data-action="open-house-picker"]')?.focus());
        break;
      }
      case 'house-type':
        if (!validInputs() || coffeeForm()) return;
        if (button.dataset.type==='garden' && isApartment(editor.houseForm.number)) return;
        if (button.dataset.type==='normal' && visibleGardenKind(editor.houseForm.number)!=='none' && !editableGarden(editor.houseForm.number)) return;
        editor.houseForm.type = button.dataset.type;
        if (button.dataset.type==='garden') rememberBuiltGarden(editor.houseForm.number);
        persistDraft(); break;
      case 'house-count': {
        if (!validInputs()) return;
        const key = button.dataset.field;
        editor.houseForm[key] = Math.max(0,Math.min(1000000,editor.houseForm[key] + +button.dataset.delta)); persistDraft(); break;
      }
      case 'price-count': {
        if (!validInputs()) return;
        const input = app.querySelector(`[data-comparison-price="${button.dataset.index}"]`);
        input.value = Math.max(+input.min,Math.min(+input.max,input.valueAsNumber + +button.dataset.delta));
        input.dispatchEvent(new Event('input',{bubbles:true}));
        return;
      }
      case 'waitress-count': {
        if (!validInputs()) return;
        const i = +button.dataset.index;
        editor.rows[i].waitresses = Math.max(0,Math.min(1000000,editor.rows[i].waitresses + +button.dataset.delta));
        app.querySelector(`[data-row="${i}"][data-field="waitresses"]`).value = editor.rows[i].waitresses;
        refreshSaleCard(i); persistDraft(); return;
      }
      case 'toggle-cfo': {
        const i = +button.dataset.index;
        if (editor.rows[i].milestones.cfo) return;
        editor.rows[i].cfo = !editor.rows[i].cfo;
        refreshSaleCard(i); persistDraft(); return;
      }
      case 'demand-count': {
        if (!validInputs()) return;
        const input=app.querySelector(`[data-demand="${button.dataset.index}"]`);
        input.value=Math.max(0,Math.min(1000000,input.valueAsNumber + +button.dataset.delta));
        input.dispatchEvent(new Event('input',{bubbles:true})); return;
      }
      case 'wage-count': {
        if (!validInputs()) return;
        const i = +button.dataset.index;
        editor.wages[i] = Math.max(0,Math.min(1000000,editor.wages[i] + +button.dataset.delta));
        app.querySelector(`[data-wage="${i}"]`).value = editor.wages[i];
        refreshWages(); persistDraft(); return;
      }
      case 'save-house': {
        const returnToSummary = editor.returnToSummary;
        if (!storeHouse()) return;
        if (returnToSummary) { editor.step = previewRound().needsReserve ? 'wages' : 'summary'; editor.returnToSummary = false; }
        persistDraft(); window.scrollTo(0,0); break;
      }
      case 'sales-step': {
        if (!validInputs()) return;
        if (editor.step === 'houses' && (houseHasGoods() || editor.editingHouse !== null)) {
          if (!storeHouse()) return;
        }
        syncHouseRows();
        let nextStep = button.dataset.step;
        if (nextStep === 'summary') {
          if (editor.step === 'wages') editor.wagesReviewed = true;
          if (!editor.wagesReviewed || previewRound().needsReserve) nextStep = 'wages';
          else checkEditor();
        }
        editor.step = nextStep;
        editor.returnToSummary = false;
        persistDraft(); window.scrollTo(0,0); break;
      }
      case 'add-coffee': {
        if (!game.modules?.coffee) return;
        if (editor.step==='houses'&&(houseHasGoods()||editor.editingHouse!==null)) throw new Error(t('Bitte den aktuellen Verkauf zuerst speichern oder abbrechen.'));
        const parent=editor.houses[+button.dataset.index];
        if (!parent || isCoffeeSale(parent)) return;
        editor.returnToSummary=editor.step==='summary'; editor.editingHouse=null;
        editor.houseForm={...newHouse('coffee'),number:parent.number,type:parent.type};
        editor.step='houses';persistDraft();window.scrollTo(0,0);break;
      }
      case 'add-house':
        editor.houseForm = newHouse(); editor.editingHouse = null; editor.returnToSummary = true; editor.step = 'houses'; persistDraft(); window.scrollTo(0,0); break;
      case 'edit-house':
        if (editor.step === 'houses' && (houseHasGoods() || editor.editingHouse !== null)) throw new Error(t('Bitte den aktuellen Verkauf zuerst speichern oder abbrechen.'));
        editor.returnToSummary = editor.step === 'summary'; editor.editingHouse = +button.dataset.index; editor.houseForm = structuredClone(editor.houses[editor.editingHouse]); editor.step = 'houses'; persistDraft(); window.scrollTo(0,0); break;
      case 'cancel-house':
        editor.houseForm = newHouse(); editor.editingHouse = null; if (editor.returnToSummary) editor.step = 'summary'; editor.returnToSummary = false; persistDraft(); break;
      case 'remove-house':
        if (editor.step === 'houses' && (houseHasGoods() || editor.editingHouse !== null)) throw new Error(t('Bitte den aktuellen Verkauf zuerst speichern oder abbrechen.'));
        if (!isCoffeeSale(editor.houses[+button.dataset.index]) && editor.houses.some(h=>isCoffeeSale(h)&&sameHouse(h.number,editor.houses[+button.dataset.index].number))) throw new Error(t('Bitte zuerst die Kaffeeverkäufe dieses Hauses entfernen.'));
        if (!confirm(t('Diesen Hausverkauf aus der Runde entfernen?'))) return;
        editor.houses.splice(+button.dataset.index,1); syncHouseRows(); persistDraft(); break;
      case 'review': {
        const invalid = app.querySelector('input:invalid');
        if (invalid) { invalid.reportValidity(); return; }
        checkEditor(); review = true; break;
      }
      case 'back-input': review = false; break;
      case 'commit': {
        const editing = editor.index !== null && !editor.completing;
        const candidate = checkEditor();
        if (editor.index === null && editor.type === 'sale') candidate.players.forEach((p,i) => { p.milestones = { ...editor.rows[i].milestones }; });
        game = candidate; editor = null; save(); screen = editing ? 'log' : 'table'; notify(editing ? t('Buchung korrigiert. Alle Kontostände wurden neu berechnet.') : t('Buchung gespeichert.')); break;
      }
      case 'edit': beginEditor(+button.dataset.index); screen = editor.wizard ? 'sale' : 'entry'; window.scrollTo(0,0); break;
      case 'cancel-edit': editor = null; screen = 'log'; break;
      case 'reserve-card': {
        const index = +button.dataset.index;
        app.querySelector('[data-reserve="' + index + '"]').value = button.dataset.value;
        app.querySelectorAll('[data-action="reserve-card"][data-index="' + index + '"]').forEach(option => {
          const selected = option === button;
          option.classList.toggle('is-selected', selected);
          option.setAttribute('aria-pressed', String(selected));
        });
        const values = [...app.querySelectorAll('[data-reserve]')].map(input => +input.value);
        const selected = values.filter(value => value > 0);
        document.querySelector('#reserve-total').textContent = money(selected.reduce((sum,value) => sum + value,0));
        document.querySelector('#reserve-equation').textContent = selected.map(money).join(' + ') + ' (' + selected.length + '/' + game.players.length + ')';
        return;
      }
      case 'reserve': {
        const values = [...app.querySelectorAll('[data-reserve]')].map(input => +input.value);
        if (values.some(n => ![100,200,300].includes(n))) throw new Error(t('Bitte die Reservekarte jedes Spielers auswählen.'));
        game.reserves = values; editor = null; save(); break;
      }
      case 'round-reserve': {
        const values = [...app.querySelectorAll('[data-reserve]')].map(input => +input.value);
        if (values.length !== game.players.length || values.some(n => ![100,200,300].includes(n))) throw new Error(t('Bitte die Reservekarte jedes Spielers auswählen.'));
        editor.reserves = values; editor.wagesReviewed = false; persistDraft(); break;
      }
      case 'undo':
        if (!confirm(html`${game.events.at(-1).combined ? t('Die letzte Runde mit Verkäufen und Löhnen') : t('Die letzte Buchung')} zurücknehmen? Danach kannst du die Eingaben neu erfassen.`)) return;
        {
          const last = game.events.pop();
          if (last.type === 'salary' && last.combined && game.events.at(-1)?.combined) {
            const sale = game.events.pop();
            game.draft = {type:'sale',rows:structuredClone(sale.rows),wages:[...last.rows],wagesReviewed:true,step:'summary'};
          } else game.draft = { type: last.type, rows: structuredClone(last.rows), step: 'summary' };
        }
        save(); screen = 'table'; editor = null; break;
      case 'export': {
        const blob = new Blob([JSON.stringify(game,null,2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = html`gamescores-fcm-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); return;
      }
      case 'import': {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
        input.addEventListener('change', async () => {
          try {
            const file = input.files[0]; if (!file) return;
            if (file.size > 5000000) throw new Error(t('Die Datei ist zu groß (maximal 5 MB).'));
            const imported = validateGame(JSON.parse(await file.text()));
            if (account(imported).issues.length) throw new Error(t('Der Spielstand enthält widersprüchliche Buchungen.'));
            if (game && !confirm(t('Die aktuelle Partie durch diesen Import ersetzen?'))) return;
            game = imported; editor = null; save(); screen = 'table'; render(); notify(t('Spielstand importiert.'));
          } catch (error) { notify(html`Import fehlgeschlagen: ${error.message}`); }
        }); input.click(); return;
      }
    }
    render();
  } catch (error) { notify(error.message); }
});
window.addEventListener('hashchange', () => { if (location.hash === '#home') { screen = 'home'; editor = null; render(); } });
render();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(async registration => {
    const showReady = () => { offlineState = 'ready'; updateChrome(); };
    if (registration.active) showReady();
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', function () { if (this.state === 'activated') showReady(); });
    });
    await navigator.serviceWorker.ready; showReady();
  }).catch(() => { offlineState = 'failed'; updateChrome(); });
}
