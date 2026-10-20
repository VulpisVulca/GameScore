import { GOODS, MILESTONES, COLORS, emptySale, calculateSale, calculateHouse, houseRows, account, roundSettlement, validateGame } from './rules.js';

const KEY = 'gamescores.fcm.v1';
const app = document.querySelector('#app');
const money = n => `${n.toLocaleString('de-DE')} $`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const milestones = () => Object.fromEntries(MILESTONES.map(([key]) => [key, false]));
let game = null;
let screen = 'home';
let setupCount = 3;
let setupPlayers = Array.from({ length: 5 }, (_, i) => ({ name: `Spieler ${i + 1}`, color: COLORS[i] }));
let editor = null;
let review = false;
let storageFailed = false;
try {
  const stored = localStorage.getItem(KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    const draft = parsed.draft;
    parsed.draft = null;
    game = validateGame(parsed);
    if (draft) {
      try { validateGame({ ...game, draft }); game.draft = draft; }
      catch { notify('Eine unvollständige Eingabe wurde verworfen. Alle bestätigten Buchungen sind erhalten.'); }
    }
  }
} catch { notify('Der gespeicherte Spielstand konnte nicht geladen werden. Er bleibt im Browserspeicher erhalten.'); }

function notify(message) {
  const el = document.querySelector('#notice');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.classList.remove('visible'), 6500);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(game)); storageFailed = false; }
  catch { storageFailed = true; notify('Speichern nicht möglich. Bitte den Spielstand jetzt exportieren.'); }
  document.querySelector('#connection').textContent = storageFailed ? 'Speichern fehlgeschlagen' : '● Auf diesem Gerät gespeichert';
}
function title(kicker, heading, text = '') {
  return `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1>${heading}</h1>${text ? `<p class="subtitle">${text}</p>` : ''}</div>`;
}
function playerName(p) { return `<span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}`; }
function readSetupPlayers() {
  app.querySelectorAll('[data-setup-name]').forEach(input => { setupPlayers[+input.dataset.setupName].name = input.value; });
  app.querySelectorAll('[data-setup-color]').forEach(input => { setupPlayers[+input.dataset.setupColor].color = input.value; });
}
function home() {
  app.innerHTML = `${title('WENIGER RECHNEN. MEHR SPIELEN.', 'Dein Abend. Dein Spieltisch.', 'Wähle ein Spiel und lass das Kleingeld in der Schachtel.')}
    ${game ? `<section class="resume"><div><span class="eyebrow">DEINE LETZTE PARTIE</span><h2>Food Chain Magnate</h2><p>${game.players.map(p => esc(p.name)).join(' · ')} · Runde ${Math.floor(game.events.length / 2) + 1}</p></div><button data-action="resume">Partie fortsetzen <span>→</span></button></section>` : ''}
    <div class="section-label">DEINE SPIELE <span>01</span></div>
    <section class="game-grid"><article class="game-card"><div class="game-art"><div class="art-tag">DAS GRUNDSPIEL</div><div class="diner-sign">FOOD CHAIN<br><strong>MAGNATE</strong><span>BURGERS · PIZZA · BIG BUSINESS</span></div><div class="awning"></div><div class="art-bottom"><span>OPEN</span><span>🍔 &nbsp; 🍕 &nbsp; 🥤</span></div></div><div class="game-info"><div class="eyebrow">WIRTSCHAFT · 2–5 SPIELER</div><h2>Food Chain Magnate</h2><p>Verkäufe, Gehälter und die ganze Bank.<br>Alles auf einem Spieltisch.</p><button data-action="setup">Neue Partie <span>↗</span></button></div></article><article class="coming"><span class="coming-icon">＋</span><h2>Platz für mehr Spielabende</h2><p>Weitere Spiele kommen nach und nach dazu.</p></article></section>
    <div class="home-features"><span>◉ Ein Gerät für alle</span><span>↺ Jederzeit korrigieren</span><span>◇ Auch offline spielbar</span></div><div class="file-actions"><button class="text-button" data-action="import">Spielstand importieren</button>${game ? '<button class="text-button" data-action="export">Spielstand exportieren</button>' : ''}</div>`;
}
function setup() {
  app.innerHTML = `<button class="text-button" data-action="home">← Spielauswahl</button>${title('FOOD CHAIN MAGNATE · NEUE PARTIE', 'Wer sitzt am Tisch?', 'Namen und Farben wählen. Die Bank bereiten wir vor.')}
    <section class="panel setup"><label class="count-label">Anzahl der Spieler <select id="player-count">${[2,3,4,5].map(n => `<option ${n === setupCount ? 'selected' : ''}>${n}</option>`).join('')}</select></label><div class="setup-players">${setupPlayers.slice(0, setupCount).map((p,i) => `<div class="setup-row"><span class="row-number">0${i+1}</span><label>Name<input data-setup-name="${i}" maxlength="40" value="${esc(p.name)}" required></label><label>Farbe<select data-setup-color="${i}" style="border-left:6px solid ${p.color}">${COLORS.map((color,j) => `<option value="${color}" ${p.color === color ? 'selected' : ''}>${['Rot','Gelb','Blau','Grün','Violett'][j]}</option>`).join('')}</select></label></div>`).join('')}</div><div class="bank-start"><div><span class="eyebrow">DIE BANK STARTET MIT</span><strong>${money(setupCount * 50)}</strong></div><p>50 $ pro Spieler · Spielerkonten starten bei 0 $.<br>Reservekarten bleiben bis zum ersten Bankbruch geheim.</p></div>${game ? '<p class="hint">Beim Start wird die bisherige Partie ersetzt. Exportiere sie vorher, wenn du sie behalten möchtest.</p><button class="text-button" data-action="export">Bisherige Partie exportieren</button>' : ''}<button data-action="start">Partie starten →</button></section>`;
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
  const last = game.events.at(-1);
  const round = last ? last.round + (last.type === 'salary' ? 1 : 0) : 1;
  app.innerHTML = `<div class="table-top"><div><p class="eyebrow">DEIN SPIELTISCH</p><h1 class="table-title">Food Chain Magnate</h1></div><div class="table-actions"><button class="text-button" data-action="export">↓ Export</button><button class="text-button" data-action="home">Spielauswahl</button></div></div>
    <div class="bank-bar"><div><span class="eyebrow">BANKBESTAND</span><strong>${money(a.bank)}</strong></div><span>${a.firstBreak === null ? 'Reserve noch verdeckt' : a.needsReserve ? 'Reservekarten aufdecken' : `Reserve: ${money(game.reserves.reduce((s,n) => s+n,0))} · ${a.secondBreak === null ? '1. Bankbruch' : '2. Bankbruch'}`}</span><span class="round-pill">${ended ? 'Partie beendet' : `Runde ${round}`}</span></div>
    <section class="accounts">${game.players.map((p,i) => `<div class="account" style="--player-color:${p.color}"><span>${playerName(p)}</span><strong>${money(a.balances[i])}</strong></div>`).join('')}</section>
    <nav class="tabs"><button class="${screen === 'table' ? 'active' : ''}" data-action="table">${ended ? 'Ergebnis' : 'Spieltisch'}</button><button class="${screen === 'log' ? 'active' : ''}" data-action="log">Protokoll <span>${Math.ceil(game.events.length / 2)}</span></button></nav><div id="workspace"></div>`;
  const workspace = document.querySelector('#workspace');
  if (screen === 'log') { renderLog(workspace); return; }
  if (a.needsReserve) { renderReserve(workspace); return; }
  if (ended && !editor) {
    const ranked = game.players.map((p,i) => ({ ...p, balance: a.balances[i] })).sort((x,y) => y.balance - x.balance);
    workspace.innerHTML = `<section class="panel"><p class="eyebrow">DIE BANK IST ZUM ZWEITEN MAL GEBROCHEN</p><h2>Das Geschäft ist gemacht.</h2><p>Alle Einnahmen sind ausgezahlt. In dieser Runde werden keine Löhne mehr gezahlt.</p>${ranked.map((p,i) => `<div class="result-row"><span>${i+1}. ${playerName(p)}</span><strong>${money(p.balance)}</strong></div>`).join('')}<p class="hint">Bei Gleichstand entscheidet die frühere Position in der Spielreihenfolge.</p><button data-action="export">Partie sichern</button></section>`;
    return;
  }
  renderTable(workspace);
}
function renderTable(target) {
  const salaryDue = game.events.length % 2 === 1;
  target.innerHTML = `<section class="round-launch"><div><span class="eyebrow">${salaryDue ? 'VERKAUF ABGESCHLOSSEN' : 'BEREIT FÜR DIE NÄCHSTE VERKAUFSRUNDE'}</span><h2>${salaryDue ? 'Jetzt die Löhne abrechnen.' : 'Der Spieltisch ist bereit.'}</h2><p>${salaryDue ? 'Die Einnahmen sind gutgeschrieben. Als Nächstes folgen die tatsächlich zu bezahlenden Mitarbeiter.' : 'Meilensteine unten auswählen. Verkäufe werden separat Haus für Haus erfasst.'}</p></div><button data-action="open-round">${game.draft ? 'Eingabe fortsetzen' : salaryDue ? 'Lohnrunde öffnen' : 'Verkaufsrunde öffnen'} →</button></section>
    <div class="milestone-heading"><h2>Meilensteine</h2><span>Auswahl wird automatisch gespeichert · gilt für die nächste Verkaufsbuchung</span></div>
    <section class="achievement-grid">${game.players.map((p,i) => `<article class="panel achievement-card" style="--player-color:${p.color}"><h3>${playerName(p)}</h3><div class="milestones">${MILESTONES.map(([key,label,hint]) => `<label class="check"><input type="checkbox" data-player="${i}" data-achievement="${key}" ${p.milestones[key] ? 'checked' : ''}><span>${label}<small>${hint}</small></span></label>`).join('')}</div></article>`).join('')}</section><p class="hint">Den 100-$-Meilenstein nach der erreichten Verkaufsrunde auswählen: Der CFO-Bonus zählt ab dem nächsten Verkauf. Mehrere Spieler können denselben Meilenstein erhalten.</p>`;
}
function roundHeader() {
  return `<div class="round-top"><button class="text-button" data-action="leave-round">← ${editor.index === null || editor.completing ? 'Spieltisch' : 'Protokoll'}</button><span>Food Chain Magnate · Runde ${currentRound()}</span><span class="draft-badge">${editor.index === null ? 'Entwurf · noch nicht gebucht' : editor.completing ? 'Löhne noch nicht gebucht' : 'Runde bearbeiten'}</span></div>`;
}
function newHouse() {
  return { number: '', player: null, type: 'normal', price: 10, ...Object.fromEntries(GOODS.map(([key]) => [key, 0])) };
}
function syncHouseRows() {
  editor.rows = houseRows(editor.rows, editor.houses);
}
function houseDescription(house) {
  return GOODS.filter(([key]) => house[key]).map(([key,label]) => `${house[key]} ${label.split(' · ')[0]}`).join(' · ');
}
function houseList(editable = true) {
  return editor.houses.length ? `<div class="house-list">${editor.houses.map((house,i) => `<article class="house-item"><div class="house-number"><span>${house.type === 'garden' ? '♧' : '⌂'}</span><strong>${esc(house.number || `Haus ${i + 1}`)}</strong><small>${house.type === 'garden' ? 'Mit Garten' : 'Ohne Garten'}</small></div><div class="house-detail"><strong>${playerName(game.players[house.player])}</strong><span>${houseDescription(house)}</span></div><strong>${money(calculateHouse(house, editor.rows[house.player].milestones).total)}</strong>${editable ? `<div class="house-actions"><button class="text-button" data-action="edit-house" data-index="${i}" aria-label="${esc(house.number || `Haus ${i + 1}`)} bearbeiten">Bearbeiten</button><button class="text-button danger" data-action="remove-house" data-index="${i}" aria-label="${esc(house.number || `Haus ${i + 1}`)} entfernen">Entfernen</button></div>` : ''}</article>`).join('')}</div>` : '<div class="empty-houses"><span>⌂</span><p>Noch kein Haus erfasst.</p><small>Verkäufe hinzufügen oder nur Bedienungen abrechnen.</small></div>';
}
function housePreview() {
  if (editor.houseForm.player === null) return 'Spieler auswählen';
  try { return money(calculateHouse(editor.houseForm, editor.rows[editor.houseForm.player].milestones).total); }
  catch { return '0 $'; }
}
function renderSales() {
  const step = editor.step;
  app.innerHTML = `${roundHeader()}<div class="sales-heading"><div><p class="eyebrow">RUNDE ABRECHNEN</p><h1>${step === 'houses' ? 'Ein Haus nach dem anderen.' : step === 'extras' ? 'Bedienungen & CFO.' : step === 'wages' ? 'Jetzt die Löhne erfassen.' : 'Ein letzter Blick auf die Runde.'}</h1><p>${step === 'houses' ? 'Wer hat geliefert, was wurde verkauft und hat das Haus einen Garten?' : step === 'extras' ? 'Trinkgeld und CFO werden einmal je Spieler für die gesamte Runde berechnet.' : step === 'wages' ? 'Wie viele Mitarbeiter müssen tatsächlich bezahlt werden? Je Person werden 5 $ abgezogen.' : 'Einnahmen, Ausgaben und neue Kontostände prüfen. Erst mit deiner Bestätigung wird die Runde gebucht.'}</p></div></div>
    <nav class="wizard-steps" aria-label="Rundenabrechnung">${[['houses','Häuser'],['extras','Bedienung & CFO'],['wages','Löhne'],['summary','Übersicht']].map(([key,label],i) => `<button data-action="sales-step" data-step="${key}" class="${step === key ? 'active' : ''}" ${step === key ? 'aria-current="step"' : ''}><b>${i + 1}</b>${label}</button>`).join('')}</nav>
    <div id="sales-workspace"></div>`;
  const target = document.querySelector('#sales-workspace');
  if (step === 'houses') {
    const h = editor.houseForm;
    target.innerHTML = `<div class="house-layout"><section class="panel house-form"><div class="form-title"><h2>${editor.editingHouse === null ? `Verkauf ${editor.houses.length + 1}` : 'Verkauf bearbeiten'}</h2><label>Hausnummer / Bezeichnung<input maxlength="24" data-house="number" value="${esc(h.number)}" placeholder="z. B. Haus 7"></label></div><fieldset><legend>1. Wer beliefert das Haus?</legend><div class="player-choices">${game.players.map((p,i) => `<button class="choice ${h.player === i ? 'selected' : ''}" style="--player-color:${p.color}" data-action="house-player" data-index="${i}" aria-pressed="${h.player === i}">${playerName(p)}</button>`).join('')}</div></fieldset><fieldset><legend>2. Was wurde verkauft?</legend><div class="house-goods">${GOODS.map(([key,label,icon]) => `<label><span>${icon} ${label}</span><div class="stepper"><button data-action="house-count" data-field="${key}" data-delta="-1" aria-label="${label} weniger">−</button><input type="number" inputmode="numeric" min="0" max="1000000" step="1" required data-house="${key}" value="${h[key]}" aria-label="Anzahl ${label}"><button data-action="house-count" data-field="${key}" data-delta="1" aria-label="${label} mehr">+</button></div></label>`).join('')}</div></fieldset><fieldset><legend>3. Welches Haus?</legend><div class="house-types">${[['normal','⌂','Ohne Garten','Einfacher Stückpreis'],['garden','♧','Mit Garten','Doppelter Stückpreis']].map(([type,icon,label,hint]) => `<button class="choice ${h.type === type ? 'selected' : ''}" data-action="house-type" data-type="${type}" aria-pressed="${h.type === type}"><span class="type-icon">${icon}</span><span>${label}<small>${hint}</small></span></button>`).join('')}</div></fieldset><div class="house-price"><label>Stückpreis vor −1-$-Meilenstein<input type="number" inputmode="numeric" min="0" max="100" step="1" required data-house="price" value="${h.price}"></label><div><span>Verkauf inkl. Meilensteinen</span><strong id="house-income">${housePreview()}</strong><small>Trinkgeld und CFO folgen in Schritt 2.</small></div></div><div class="house-form-actions">${editor.editingHouse !== null ? '<button class="secondary" data-action="cancel-house">Abbrechen</button>' : ''}<button data-action="save-house">${editor.editingHouse !== null ? 'Verkauf speichern' : 'Haus übernehmen & nächstes'} →</button></div></section><aside class="house-sidebar"><div class="sidebar-heading"><h2>Diese Runde</h2><span>${editor.houses.length} ${editor.houses.length === 1 ? 'Haus' : 'Häuser'}</span></div>${houseList()}<div class="sidebar-total"><span>Warenumsatz inkl. Meilensteinen</span><strong>${money(editor.houses.reduce((sum, house) => sum + calculateHouse(house, editor.rows[house.player].milestones).total, 0))}</strong></div><button class="secondary" data-action="sales-step" data-step="extras">Häuser fertig · weiter →</button></aside></div>`;
  } else if (step === 'extras') {
    target.innerHTML = `<div class="entry-grid">${game.players.map((p,i) => `<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3>${waitressField(editor.rows[i],i)}${cfoButton(editor.rows[i],i)}${roundCalculation(editor.rows[i],i)}</article>`).join('')}</div><div class="commit-bar"><button class="secondary" data-action="sales-step" data-step="houses">← Häuser</button><button data-action="sales-step" data-step="wages">Weiter zu den Löhnen →</button></div>`;
  } else if (step === 'wages') {
    renderRoundWages(target);
  } else {
    const settlement = previewRound();
    target.innerHTML = `<section class="panel summary-houses"><div class="sidebar-heading"><h2>Alle Hausverkäufe</h2><button class="secondary" data-action="add-house">+ Weiteres Haus</button></div>${houseList()}</section><div class="summary-heading"><h2>Rundenabrechnung pro Spieler</h2><div><button class="text-button" data-action="sales-step" data-step="extras">Bedienungen & CFO bearbeiten</button><button class="text-button" data-action="sales-step" data-step="wages">Löhne bearbeiten</button></div></div>${settlement.ended ? '<p class="round-warning">Zweiter Bankbruch: Alle Einnahmen werden ausgezahlt, Löhne entfallen.</p>' : ''}${renderReview()}<div class="commit-bar"><span>${editor.index === null ? 'Einnahmen und Löhne werden zusammen gebucht.' : 'Die Korrektur berechnet alle folgenden Kontostände neu.'}</span><button data-action="commit">${editor.index === null ? 'Runde bestätigen' : 'Änderung speichern'} ✓</button></div>`;
  }
}
function previewRound() { return roundSettlement(game,editor.rows,editor.wages,editor.index,editor.reserves); }
function wageCardCalculation(i, settlement = previewRound()) {
  const cost = settlement.expenses[i];
  return `<dl><div><dt>Bisheriger Stand</dt><dd>${money(settlement.before.balances[i])}</dd></div><div><dt>+ Einnahmen</dt><dd>${money(settlement.incomes[i])}</dd></div><div><dt>− Ausgaben / Löhne</dt><dd>${money(cost)}</dd></div><div class="calculation-total"><dt>Neuer Stand</dt><dd>${money(settlement.balances[i])}</dd></div></dl>`;
}
function renderRoundWages(target) {
  const settlement = previewRound();
  if (settlement.needsReserve) {
    renderReserve(target, true);
    return;
  }
  target.innerHTML = `${settlement.ended ? '<p class="round-warning">Zweiter Bankbruch: In dieser Runde werden keine Löhne mehr gezahlt. Alle Einnahmen werden vollständig gutgeschrieben.</p>' : ''}<div class="entry-grid">${game.players.map((p,i) => `<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3>${settlement.ended ? '<p class="hint">Löhne entfallen bei Spielende.</p>' : `<label class="waitress-field"><span>Zu bezahlende Mitarbeiter</span><div class="stepper"><button data-action="wage-count" data-index="${i}" data-delta="-1" aria-label="Ein Mitarbeiter weniger für ${esc(p.name)}">−</button><input type="number" inputmode="numeric" min="0" max="1000000" step="1" required data-wage="${i}" value="${editor.wages[i]}" aria-label="Zu bezahlende Mitarbeiter für ${esc(p.name)}"><button data-action="wage-count" data-index="${i}" data-delta="1" aria-label="Ein Mitarbeiter mehr für ${esc(p.name)}">+</button></div><small>5 $ je Mitarbeiter · Rabatte vorher selbst berücksichtigen</small></label>`}<div class="round-calculation" id="wage-calculation-${i}" aria-live="polite">${wageCardCalculation(i,settlement)}</div></article>`).join('')}</div><p class="round-warning" id="wage-issues" ${settlement.issues.length ? '' : 'hidden'}>${esc(settlement.issues.join(' '))}</p><div class="commit-bar"><button class="secondary" data-action="sales-step" data-step="extras">← Bedienung & CFO</button><button data-action="sales-step" data-step="summary">Gesamtübersicht prüfen →</button></div>`;
}
function refreshWages() {
  const settlement = previewRound();
  editor.wages.forEach((_,i) => { document.querySelector(`#wage-calculation-${i}`).innerHTML = wageCardCalculation(i,settlement); });
  const issues = document.querySelector('#wage-issues');
  issues.textContent = settlement.issues.join(' ');
  issues.hidden = !settlement.issues.length;
}
function houseHasGoods() { return GOODS.some(([key]) => editor.houseForm[key] > 0); }
function validInputs() {
  const invalid = app.querySelector('input:invalid');
  if (invalid) { invalid.reportValidity(); return false; }
  return true;
}
function storeHouse() {
  if (!validInputs()) return false;
  const house = editor.houseForm;
  if (house.player === null || !game.players[house.player]) throw new Error('Bitte den Spieler auswählen, der dieses Haus beliefert.');
  calculateHouse(house, editor.rows[house.player].milestones);
  const order = editor.editingHouse === null ? Math.max(-1, ...editor.houses.map(h => h.order ?? 0)) + 1 : editor.houses[editor.editingHouse].order;
  const saved = { ...house, order, number: house.number.trim() || `Haus ${(order ?? editor.editingHouse) + 1}` };
  if (editor.editingHouse === null) editor.houses.push(saved);
  else editor.houses[editor.editingHouse] = saved;
  editor.houseForm = newHouse();
  editor.editingHouse = null;
  syncHouseRows();
  return true;
}
function numberField(label, key, row, value, max = 1000000) {
  return `<label>${label}<input type="number" inputmode="numeric" min="0" max="${max}" step="1" required data-row="${row}" data-field="${key}" value="${value}"></label>`;
}
function waitressField(row, i) {
  return `<label class="waitress-field"><span>Bedienungen / Waitresses</span><div class="stepper"><button data-action="waitress-count" data-index="${i}" data-delta="-1" aria-label="Eine Waitress weniger für ${esc(game.players[i].name)}">−</button><input type="number" inputmode="numeric" min="0" max="1000000" step="1" required data-row="${i}" data-field="waitresses" value="${row.waitresses}" aria-label="Anzahl Waitresses für ${esc(game.players[i].name)}"><button data-action="waitress-count" data-index="${i}" data-delta="1" aria-label="Eine Waitress mehr für ${esc(game.players[i].name)}">+</button></div><small>${row.milestones.waitress ? 'Meilenstein aktiv: 5 $' : '3 $'} Trinkgeld je Waitress</small></label>`;
}
function cfoContent(row) {
  const active = row.cfo || row.milestones.cfo;
  return `<span class="cfo-icon" aria-hidden="true">${row.milestones.cfo ? '◆' : active ? '✓' : '+'}</span><span class="cfo-label"><strong>CFO +50 %</strong><small>${row.milestones.cfo ? 'Meilenstein · dauerhaft aktiv' : active ? 'Bonus auf Einnahmen und Trinkgeld' : 'Bonus für diese Runde einschalten'}</small></span><span class="cfo-state">${active ? 'Aktiv' : 'Inaktiv'}</span>`;
}
function cfoButton(row, i) {
  const active = row.cfo || row.milestones.cfo;
  return `<button class="cfo-toggle ${active ? 'is-active' : ''} ${row.milestones.cfo ? 'is-milestone' : ''}" data-action="toggle-cfo" data-index="${i}" aria-pressed="${Boolean(active)}" aria-label="CFO für ${esc(game.players[i].name)}${row.milestones.cfo ? ', durch Meilenstein dauerhaft aktiv' : ''}" ${row.milestones.cfo ? 'disabled' : ''}>${cfoContent(row)}</button>`;
}
function calculationLines(row, i) {
  try {
    const c = calculateSale(row);
    const active = row.cfo || row.milestones.cfo;
    return `<dl><div><dt>Einnahmen<small>Waren inkl. Meilensteinboni</small></dt><dd>${money(c.revenue + c.bonus)}</dd></div><div><dt>+ Waitresses<small>${row.waitresses} × ${money(row.milestones.waitress ? 5 : 3)}</small></dt><dd>${money(c.tips)}</dd></div><div><dt>+ CFO<small>${active ? `50 % auf ${money(c.revenue + c.bonus + c.tips)} · aufgerundet` : 'Inaktiv'}</small></dt><dd>${money(c.cfo)}</dd></div><div class="calculation-total"><dt>Gesamtergebnis</dt><dd id="row-total-${i}">${money(c.total)}</dd></div></dl>`;
  } catch { return '<p class="hint">Bitte die Verkaufseingaben prüfen.</p>'; }
}
function roundCalculation(row, i) {
  return `<div class="round-calculation" id="row-calculation-${i}" aria-live="polite">${calculationLines(row,i)}</div>`;
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
  rate.textContent = `${row.milestones.waitress ? 'Meilenstein aktiv: 5 $' : '3 $'} Trinkgeld je Waitress`;
}
function renderEditor(target) {
  const sale = editor.type === 'sale';
  const editing = editor.index !== null;
  target.innerHTML = `<div class="phase-heading"><div><p class="eyebrow">RUNDE ${currentRound()} · ${editing ? 'BUCHUNG BEARBEITEN' : sale ? '01 / VERKAUF' : '02 / LÖHNE'}</p><h2>${review ? 'Alles richtig erfasst?' : sale ? 'Was ging über die Theke?' : 'Zeit für die Gehälter.'}</h2><p>${sale ? 'Verkaufte Waren und Bedienungen je Spieler erfassen.' : 'Die tatsächlich zu bezahlenden Mitarbeiter eingeben. Je Person werden 5 $ abgezogen.'}</p></div>${editing ? '<button class="text-button" data-action="cancel-edit">Abbrechen</button>' : ''}</div>
    ${review ? renderReview() : `<div class="entry-grid">${game.players.map((p,i) => `<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3>${sale ? saleFields(editor.rows[i], i) : `${numberField('Zu bezahlende Mitarbeiter', 'salary', i, editor.rows[i])}<div class="salary-total" id="row-total-${i}">${money(editor.rows[i]*5)}</div><p class="hint">Rabatte und kostenlose Mitarbeiter vorher selbst berücksichtigen.</p>`}</article>`).join('')}</div>`}
    <div class="commit-bar"><span>${editing ? 'Die Änderung berechnet alle folgenden Kontostände neu.' : 'Erst bestätigen, dann wird gebucht.'}</span><div>${review ? '<button class="secondary" data-action="back-input">← Eingaben</button>' : ''}<button data-action="${review ? 'commit' : 'review'}">${review ? editing ? 'Änderung speichern' : sale ? 'Verkauf bestätigen ✓' : 'Löhne bestätigen ✓' : 'Übersicht prüfen →'}</button></div></div>`;
}
function saleFields(row, i) {
  return `<div class="goods-grid">${GOODS.map(([key,label,icon]) => numberField(`${icon} ${label}`,key,i,row[key])).join('')}${waitressField(row,i)}</div>
    <div class="pricing">${numberField('Stückpreis vor −1-$-Meilenstein','price',i,row.price,100)}</div>${cfoButton(row,i)}
    <details><summary>Meilensteine <span>${MILESTONES.filter(([key]) => row.milestones[key]).length} aktiv</span></summary><div class="milestones">${MILESTONES.map(([key,label,hint]) => `<label class="check"><input type="checkbox" data-row="${i}" data-milestone="${key}" ${row.milestones[key] ? 'checked' : ''}><span>${label}<small>${hint}</small></span></label>`).join('')}</div><p class="hint">Den 100-$-Meilenstein erst ab der Folgerunde aktivieren. Meilensteine werden beim Buchen für kommende Runden übernommen.</p></details>
    <details><summary>Gartenbonus</summary>${numberField('Davon an Häuser mit Garten verkauft','garden',i,row.garden)}<p class="hint">Nur die Gesamtzahl der Gartenwaren. Ihr Stückpreis zählt doppelt, Meilensteinboni zählen einfach. Keine Häuserverwaltung.</p></details>
    ${roundCalculation(row,i)}`;
}
function safeTotal(row) { try { return money(calculateSale(row).total); } catch { return 'Eingabe prüfen'; } }
function renderReview() {
  const sale = editor.type === 'sale';
  const settlement = sale && editor.wizard ? previewRound() : null;
  return `<section class="panel review"><div class="table-scroll"><table><thead><tr><th>Spieler</th>${sale ? GOODS.map(([,label]) => `<th>${label}</th>`).join('') + '<th>Bedienungen</th><th>Warenumsatz¹</th><th>Meilensteine</th><th>Trinkgeld</th><th>CFO</th>' : '<th>Mitarbeiter</th>'}<th>${sale ? 'Einnahmen' : 'Lohn'}</th>${settlement ? '<th>Ausgaben / Löhne</th><th>Neuer Stand</th>' : ''}</tr></thead><tbody>${game.players.map((p,i) => {
    const r = editor.rows[i]; const c = sale ? calculateSale(r) : null;
    return `<tr><th>${playerName(p)}</th>${sale ? GOODS.map(([key]) => `<td>${r[key]}</td>`).join('') + `<td>${r.waitresses}</td><td>${money(c.revenue)}</td><td>${money(c.bonus)}</td><td>${money(c.tips)}</td><td>${money(c.cfo)}</td>` : `<td>${r}</td>`}<td class="${settlement ? 'income-amount' : 'amount'}">${money(sale ? c.total : r*5)}</td>${settlement ? `<td class="expense-amount">${money(settlement.expenses[i])}</td><td class="amount new-balance">${money(settlement.balances[i])}</td>` : ''}</tr>`;
  }).join('')}</tbody></table></div>${sale ? '<p class="hint">¹ Mit eingestelltem Stückpreis und gegebenenfalls Gartenbonus. CFO wird einmal auf alle Rundeneinnahmen berechnet und aufgerundet.</p>' : ''}</section>`;
}
function renderReserve(target, preview = false) {
  target.innerHTML = `<section class="panel reserve"><p class="eyebrow">ERSTER BANKBRUCH</p><h2>Zeit, die Reserve aufzudecken.</h2><p>Wählt den Geldbetrag der zu Beginn verdeckt gewählten Karte jedes Spielers. ${preview ? 'Die Bank reicht für die erfassten Verkäufe nicht aus. Die Reserve wird für die Vorschau berücksichtigt und erst mit der Runde gebucht.' : 'Noch ausstehende Einnahmen werden vollständig ausgezahlt.'}</p><div class="reserve-grid">${game.players.map((p,i) => `<label>${playerName(p)}<select data-reserve="${i}"><option value="">Karte wählen …</option>${[100,200,300].map(n => `<option value="${n}">${money(n)}</option>`).join('')}</select></label>`).join('')}</div><button data-action="${preview ? 'round-reserve' : 'reserve'}">${preview ? 'Reserve für Vorschau übernehmen' : 'Reserve der Bank hinzufügen'}</button></section>`;
}
function renderLog(target) {
  const balances = game.players.map(() => 0);
  const rounds = [];
  const state = account(game);
  for (let index = 0; index < game.events.length; index++) {
    const sale = game.events[index];
    const salary = game.events[index + 1]?.type === 'salary' ? game.events[index + 1] : null;
    const incomes = sale.rows.map(row => calculateSale(row).total);
    const expenses = game.players.map((_,i) => salary ? salary.rows[i] * 5 : 0);
    game.players.forEach((_,i) => { balances[i] += incomes[i] - expenses[i]; });
    const dates = [sale.updatedAt,salary?.updatedAt,salary?.createdAt,sale.createdAt].map(value => new Date(value)).filter(date => Number.isFinite(date.getTime()));
    const date = dates.sort((a,b) => b-a)[0];
    rounds.push({sale,salary,index,incomes,expenses,balances:[...balances],date,ended:state.secondBreak === index,reserve:state.firstBreak === index});
    if (salary) index++;
  }
  target.innerHTML = `<div class="ledger-heading"><h2>Protokoll</h2><p>+ Einnahmen <span>− Löhne</span> <strong>Neuer Stand</strong> · neueste Runde zuerst</p></div>${!rounds.length ? '<section class="panel"><p>Noch keine Buchungen. Los geht’s mit dem ersten Verkauf.</p></section>' : `<div class="ledger-scroll"><table class="ledger-table"><caption class="sr-only">Einnahmen, Lohnausgaben und Kontostand pro Spieler nach jeder Runde</caption><thead><tr><th scope="col">Runde</th>${game.players.map(p => `<th scope="col">${playerName(p)}<small>Einnahmen · Löhne · Stand</small></th>`).join('')}<th scope="col"><span class="sr-only">Aktionen</span></th></tr></thead>${rounds.reverse().map(round => `<tbody class="ledger-round" data-round="${round.sale.round}"><tr class="ledger-main"><th scope="row" class="ledger-meta"><strong>Runde ${round.sale.round}</strong><small>${round.date ? esc(round.date.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})) : 'Ohne Zeitangabe'}${round.sale.updatedAt || round.salary?.updatedAt ? ' · korrigiert' : ''}</small>${round.ended ? '<em>Spielende</em>' : !round.salary ? '<em>Löhne offen</em>' : ''}</th>${game.players.map((p,i) => `<td class="ledger-player-cell"><span class="ledger-player-mobile">${playerName(p)}</span><div class="ledger-amounts"><span class="ledger-income" aria-label="Einnahmen">+${money(round.incomes[i])}</span><span class="ledger-expense" aria-label="Löhne">${round.salary || round.ended ? '−' + money(round.expenses[i]) : 'offen'}</span><strong aria-label="Neuer Stand">${money(round.balances[i])}</strong></div></td>`).join('')}<td class="ledger-actions"><button class="text-button" data-action="toggle-log-details" data-index="${round.index}" aria-expanded="false" aria-controls="log-details-${round.index}">Details</button><button class="secondary" data-action="edit" data-index="${round.index}" aria-label="Runde ${round.sale.round} bearbeiten">Bearbeiten</button></td></tr><tr class="ledger-detail-row" id="log-details-${round.index}" hidden><td colspan="${game.players.length + 2}">${logRoundDetails(round)}</td></tr></tbody>`).join('')}</table></div><button class="text-button danger ledger-undo" data-action="undo">${game.events.at(-1).combined ? 'Letzte Runde' : 'Letzte Buchung'} zurücknehmen</button>`}`;
}
function logRoundDetails(round) {
  return `${round.reserve ? `<p class="ledger-bank-note">Erster Bankbruch${game.reserves ? ` · Reserve: ${money(game.reserves.reduce((sum,n) => sum+n,0))}` : ' · Reserve noch offen'}</p>` : ''}<div class="ledger-detail-grid">${game.players.map((p,i) => {
    const row = round.sale.rows[i];
    const c = calculateSale(row);
    const goods = GOODS.filter(([key]) => row[key]).map(([key,label]) => `${row[key]} ${label.split(' · ')[0]}`).join(' · ') || 'Keine Waren verkauft';
    return `<section class="ledger-detail-player"><h3>${playerName(p)}</h3><p>${goods}</p><dl><div><dt>Warenumsatz</dt><dd>${money(c.revenue)}</dd></div><div><dt>Meilensteinboni</dt><dd>+${money(c.bonus)}</dd></div><div><dt>${row.waitresses} Waitresses</dt><dd>+${money(c.tips)}</dd></div><div><dt>CFO${row.cfo || row.milestones.cfo ? ' · aktiv' : ' · inaktiv'}</dt><dd>+${money(c.cfo)}</dd></div><div><dt>${round.salary ? `${round.salary.rows[i]} Mitarbeiter × 5 $` : round.ended ? 'Löhne entfallen' : 'Löhne noch offen'}</dt><dd>−${money(round.expenses[i])}</dd></div></dl>${row.houses?.length ? `<ul class="ledger-houses">${row.houses.map(h => `<li><div><strong>${esc(h.number)}</strong><small>${h.type === 'garden' ? 'Mit Garten' : 'Ohne Garten'} · ${houseDescription(h)} · Stückpreis ${money(h.price - (row.milestones.price ? 1 : 0))}</small></div><span>${money(calculateHouse(h,row.milestones).total)}</span></li>`).join('')}</ul>` : ''}</section>`;
  }).join('')}</div>${round.salary && !round.sale.rows.every(row => Array.isArray(row.houses)) ? `<button class="text-button" data-action="edit" data-index="${round.index + 1}">Alte Lohnbuchung bearbeiten</button>` : ''}`;
}
function render() {
  document.body.classList.toggle('playing', !['home','setup'].includes(screen));
  if (screen === 'home') home();
  else if (screen === 'setup') setup();
  else if (game && editor && screen === 'sale') renderSales();
  else if (game && editor && screen === 'entry') {
    app.innerHTML = `${roundHeader()}<div id="workspace"></div>`;
    renderEditor(document.querySelector('#workspace'));
  }
  else if (game) dashboard();
  else { screen = 'home'; home(); }
}
function persistDraft() {
  if (editor?.completing) {
    game.draft = { type:'salary', rows:[...editor.wages], completion:{rows:structuredClone(editor.rows),houseForm:structuredClone(editor.houseForm),step:editor.step,editingHouse:editor.editingHouse,returnToSummary:editor.returnToSummary,reserves:editor.reserves,wagesReviewed:editor.wagesReviewed} };
    save(); return;
  }
  if (editor?.index === null) {
    game.draft = { type: editor.type, rows: structuredClone(editor.rows) };
    if (editor.wizard) Object.assign(game.draft, { houseForm: structuredClone(editor.houseForm), step: editor.step, editingHouse: editor.editingHouse, returnToSummary: editor.returnToSummary, wages:[...editor.wages], reserves:editor.reserves, wagesReviewed:editor.wagesReviewed });
    save();
  }
}
function checkEditor() {
  if (editor.wizard) {
    const settlement = previewRound();
    if (settlement.needsReserve) throw new Error('Bitte zuerst im Lohnschritt die Reservekarten aufdecken.');
    if (settlement.issues.length) throw new Error(settlement.issues.join(' '));
    return settlement.candidate;
  }
  if (editor.type === 'sale') editor.rows.forEach(calculateSale);
  else editor.rows.forEach(n => { if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new Error('Bitte eine gültige Mitarbeiterzahl eingeben.'); });
  const candidate = structuredClone(game);
  const event = { type: editor.type, round: currentRound(), rows: structuredClone(editor.rows), createdAt: new Date().toISOString() };
  if (editor.index === null) candidate.events.push(event);
  else candidate.events[editor.index] = { ...candidate.events[editor.index], ...event, createdAt: candidate.events[editor.index].createdAt, updatedAt: new Date().toISOString() };
  if (editor.index === null) candidate.draft = null;
  const result = account(candidate);
  if (result.issues.length) throw new Error(result.issues.join(' '));
  if (editor.index !== null && result.needsReserve && editor.index !== candidate.events.length - 1) throw new Error('Diese Änderung benötigt Reservekarten. Bitte zuerst die späteren Buchungen zurücknehmen.');
  return candidate;
}
app.addEventListener('input', event => {
  const input = event.target;
  if (input.dataset.setupName !== undefined) { setupPlayers[+input.dataset.setupName].name = input.value; return; }
  if (input.dataset.achievement !== undefined) {
    game.players[+input.dataset.player].milestones[input.dataset.achievement] = input.checked;
    save(); return;
  }
  if (input.dataset.wage !== undefined && editor?.wizard) {
    if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return;
    editor.wages[+input.dataset.wage] = input.valueAsNumber;
    refreshWages(); persistDraft(); return;
  }
  if (input.dataset.house !== undefined && editor?.wizard) {
    const key = input.dataset.house;
    if (key === 'number') editor.houseForm.number = input.value;
    else { if (!input.validity.valid || !Number.isFinite(input.valueAsNumber)) return; editor.houseForm[key] = input.valueAsNumber; }
    document.querySelector('#house-income').textContent = housePreview();
    persistDraft(); return;
  }
  if (input.dataset.row === undefined || !editor) return;
  const i = +input.dataset.row;
  if (input.dataset.milestone) {
    editor.rows[i].milestones[input.dataset.milestone] = input.checked;
    // Explicit CFO selection remains independent of the permanent milestone.
    const card = input.closest('.player-entry');
    card.querySelector('summary span').textContent = `${MILESTONES.filter(([key]) => editor.rows[i].milestones[key]).length} aktiv`;
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
  if (input.id === 'player-count') { readSetupPlayers(); setupCount = +input.value; setup(); }
  if (input.dataset.setupColor !== undefined) { setupPlayers[+input.dataset.setupColor].color = input.value; input.style.borderLeftColor = input.value; }
});
app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  try {
    switch (button.dataset.action) {
      case 'home': screen = 'home'; editor = null; break;
      case 'setup':
        if (game) {
          setupCount = game.players.length;
          game.players.forEach((player, i) => { setupPlayers[i] = { name: player.name, color: player.color }; });
        }
        screen = 'setup'; break;
      case 'start': {
        // Autofill and some mobile keyboards do not reliably emit input events.
        // The visible setup fields are authoritative when starting the game.
        readSetupPlayers();
        const players = setupPlayers.slice(0,setupCount).map(p => ({ name: p.name.trim(), color: p.color, milestones: milestones() }));
        const next = validateGame({ version: 1, players, reserves: null, events: [], draft: null });
        if (game && !confirm('Die bisherige Partie auf diesem Gerät ersetzen? Vorher bei Bedarf exportieren.')) return;
        game = next; save(); screen = 'table'; editor = null; break;
      }
      case 'resume': case 'table': screen = 'table'; editor = null; review = false; break;
      case 'log': screen = 'log'; editor = null; break;
      case 'toggle-log-details': {
        const details = document.querySelector(`#log-details-${button.dataset.index}`);
        details.hidden = !details.hidden;
        button.setAttribute('aria-expanded', String(!details.hidden));
        button.textContent = details.hidden ? 'Details' : 'Schließen';
        return;
      }
      case 'open-round':
        beginEditor(); screen = editor.wizard ? 'sale' : 'entry'; persistDraft(); window.scrollTo(0,0); break;
      case 'leave-round':
        persistDraft(); screen = editor.index === null || editor.completing ? 'table' : 'log'; editor = null; break;
      case 'house-player':
        if (!validInputs()) return;
        editor.houseForm.player = +button.dataset.index; persistDraft(); break;
      case 'house-type':
        if (!validInputs()) return;
        editor.houseForm.type = button.dataset.type; persistDraft(); break;
      case 'house-count': {
        if (!validInputs()) return;
        const key = button.dataset.field;
        editor.houseForm[key] = Math.max(0,Math.min(1000000,editor.houseForm[key] + +button.dataset.delta)); persistDraft(); break;
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
      case 'add-house':
        editor.houseForm = newHouse(); editor.editingHouse = null; editor.returnToSummary = true; editor.step = 'houses'; persistDraft(); window.scrollTo(0,0); break;
      case 'edit-house':
        if (editor.step === 'houses' && (houseHasGoods() || editor.editingHouse !== null)) throw new Error('Bitte den aktuellen Verkauf zuerst speichern oder abbrechen.');
        editor.returnToSummary = editor.step === 'summary'; editor.editingHouse = +button.dataset.index; editor.houseForm = structuredClone(editor.houses[editor.editingHouse]); editor.step = 'houses'; persistDraft(); window.scrollTo(0,0); break;
      case 'cancel-house':
        editor.houseForm = newHouse(); editor.editingHouse = null; if (editor.returnToSummary) editor.step = 'summary'; editor.returnToSummary = false; persistDraft(); break;
      case 'remove-house':
        if (editor.step === 'houses' && (houseHasGoods() || editor.editingHouse !== null)) throw new Error('Bitte den aktuellen Verkauf zuerst speichern oder abbrechen.');
        if (!confirm('Diesen Hausverkauf aus der Runde entfernen?')) return;
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
        game = candidate; editor = null; save(); screen = editing ? 'log' : 'table'; notify(editing ? 'Buchung korrigiert. Alle Kontostände wurden neu berechnet.' : 'Buchung gespeichert.'); break;
      }
      case 'edit': beginEditor(+button.dataset.index); screen = editor.wizard ? 'sale' : 'entry'; window.scrollTo(0,0); break;
      case 'cancel-edit': editor = null; screen = 'log'; break;
      case 'reserve': {
        const values = [...app.querySelectorAll('[data-reserve]')].map(input => +input.value);
        if (values.some(n => ![100,200,300].includes(n))) throw new Error('Bitte die Reservekarte jedes Spielers auswählen.');
        game.reserves = values; editor = null; save(); break;
      }
      case 'round-reserve': {
        const values = [...app.querySelectorAll('[data-reserve]')].map(input => +input.value);
        if (values.length !== game.players.length || values.some(n => ![100,200,300].includes(n))) throw new Error('Bitte die Reservekarte jedes Spielers auswählen.');
        editor.reserves = values; editor.wagesReviewed = false; persistDraft(); break;
      }
      case 'undo':
        if (!confirm(`${game.events.at(-1).combined ? 'Die letzte Runde mit Verkäufen und Löhnen' : 'Die letzte Buchung'} zurücknehmen? Danach kannst du die Eingaben neu erfassen.`)) return;
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
        const link = document.createElement('a'); link.href = url; link.download = `gamescores-fcm-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); return;
      }
      case 'import': {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
        input.addEventListener('change', async () => {
          try {
            const file = input.files[0]; if (!file) return;
            if (file.size > 5000000) throw new Error('Die Datei ist zu groß (maximal 5 MB).');
            const imported = validateGame(JSON.parse(await file.text()));
            if (account(imported).issues.length) throw new Error('Der Spielstand enthält widersprüchliche Buchungen.');
            if (game && !confirm('Die aktuelle Partie durch diesen Import ersetzen?')) return;
            game = imported; editor = null; save(); screen = 'table'; render(); notify('Spielstand importiert.');
          } catch (error) { notify(`Import fehlgeschlagen: ${error.message}`); }
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
    const showReady = () => { document.querySelector('#offline-status').textContent = '◇ Offline bereit'; };
    if (registration.active) showReady();
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', function () { if (this.state === 'activated') showReady(); });
    });
    await navigator.serviceWorker.ready; showReady();
  }).catch(() => { document.querySelector('#offline-status').textContent = 'Offline-Cache nicht verfügbar'; });
}
