import { GOODS, MILESTONES, COLORS, emptySale, calculateSale, account, validateGame } from './rules.js';

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
  const type = index === null ? (game.events.length % 2 ? 'salary' : 'sale') : game.events[index].type;
  editor = { index, type, rows: structuredClone(index !== null ? game.events[index].rows : game.draft?.type === type ? game.draft.rows : game.players.map(p => type === 'sale' ? emptySale(p.milestones) : 0)) };
  review = false;
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
    <nav class="tabs"><button class="${screen === 'table' ? 'active' : ''}" data-action="table">${ended ? 'Ergebnis' : 'Aktuelle Runde'}</button><button class="${screen === 'log' ? 'active' : ''}" data-action="log">Protokoll <span>${game.events.length}</span></button></nav><div id="workspace"></div>`;
  const workspace = document.querySelector('#workspace');
  if (screen === 'log') { renderLog(workspace); return; }
  if (a.needsReserve) { renderReserve(workspace); return; }
  if (ended && !editor) {
    const ranked = game.players.map((p,i) => ({ ...p, balance: a.balances[i] })).sort((x,y) => y.balance - x.balance);
    workspace.innerHTML = `<section class="panel"><p class="eyebrow">DIE BANK IST ZUM ZWEITEN MAL GEBROCHEN</p><h2>Das Geschäft ist gemacht.</h2><p>Alle Einnahmen sind ausgezahlt. In dieser Runde werden keine Löhne mehr gezahlt.</p>${ranked.map((p,i) => `<div class="result-row"><span>${i+1}. ${playerName(p)}</span><strong>${money(p.balance)}</strong></div>`).join('')}<p class="hint">Bei Gleichstand entscheidet die frühere Position in der Spielreihenfolge.</p><button data-action="export">Partie sichern</button></section>`;
    return;
  }
  if (!editor) beginEditor();
  renderEditor(workspace);
}
function numberField(label, key, row, value, max = 1000000) {
  return `<label>${label}<input type="number" inputmode="numeric" min="0" max="${max}" step="1" required data-row="${row}" data-field="${key}" value="${value}"></label>`;
}
function renderEditor(target) {
  const sale = editor.type === 'sale';
  const editing = editor.index !== null;
  target.innerHTML = `<div class="phase-heading"><div><p class="eyebrow">RUNDE ${currentRound()} · ${editing ? 'BUCHUNG BEARBEITEN' : sale ? '01 / VERKAUF' : '02 / LÖHNE'}</p><h2>${review ? 'Alles richtig erfasst?' : sale ? 'Was ging über die Theke?' : 'Zeit für die Gehälter.'}</h2><p>${sale ? 'Verkaufte Waren und Bedienungen je Spieler erfassen.' : 'Die tatsächlich zu bezahlenden Mitarbeiter eingeben. Je Person werden 5 $ abgezogen.'}</p></div>${editing ? '<button class="text-button" data-action="cancel-edit">Abbrechen</button>' : ''}</div>
    ${review ? renderReview() : `<div class="entry-grid">${game.players.map((p,i) => `<article class="panel player-entry" style="--player-color:${p.color}"><h3>${playerName(p)}</h3>${sale ? saleFields(editor.rows[i], i) : `${numberField('Zu bezahlende Mitarbeiter', 'salary', i, editor.rows[i])}<div class="salary-total" id="row-total-${i}">${money(editor.rows[i]*5)}</div><p class="hint">Rabatte und kostenlose Mitarbeiter vorher selbst berücksichtigen.</p>`}</article>`).join('')}</div>`}
    <div class="commit-bar"><span>${editing ? 'Die Änderung berechnet alle folgenden Kontostände neu.' : 'Erst bestätigen, dann wird gebucht.'}</span><div>${review ? '<button class="secondary" data-action="back-input">← Eingaben</button>' : ''}<button data-action="${review ? 'commit' : 'review'}">${review ? editing ? 'Änderung speichern' : sale ? 'Verkauf bestätigen ✓' : 'Löhne bestätigen ✓' : 'Übersicht prüfen →'}</button></div></div>`;
}
function saleFields(row, i) {
  return `<div class="goods-grid">${GOODS.map(([key,label,icon]) => numberField(`${icon} ${label}`,key,i,row[key])).join('')}${numberField('Bedienungen / Waitresses','waitresses',i,row.waitresses)}</div>
    <div class="pricing">${numberField('Stückpreis vor −1-$-Meilenstein','price',i,row.price,100)}<label class="check"><input type="checkbox" data-row="${i}" data-field="cfo" ${row.cfo || row.milestones.cfo ? 'checked' : ''} ${row.milestones.cfo ? 'disabled' : ''}> CFO +50 %${row.milestones.cfo ? ' · Meilenstein' : ''}</label></div>
    <details><summary>Meilensteine <span>${MILESTONES.filter(([key]) => row.milestones[key]).length} aktiv</span></summary><div class="milestones">${MILESTONES.map(([key,label,hint]) => `<label class="check"><input type="checkbox" data-row="${i}" data-milestone="${key}" ${row.milestones[key] ? 'checked' : ''}><span>${label}<small>${hint}</small></span></label>`).join('')}</div><p class="hint">Den 100-$-Meilenstein erst ab der Folgerunde aktivieren. Meilensteine werden beim Buchen für kommende Runden übernommen.</p></details>
    <details><summary>Gartenbonus</summary>${numberField('Davon an Häuser mit Garten verkauft','garden',i,row.garden)}<p class="hint">Nur die Gesamtzahl der Gartenwaren. Ihr Stückpreis zählt doppelt, Meilensteinboni zählen einfach. Keine Häuserverwaltung.</p></details>
    <div class="entry-total"><span>Einnahmen</span><strong id="row-total-${i}">${safeTotal(row)}</strong></div>`;
}
function safeTotal(row) { try { return money(calculateSale(row).total); } catch { return 'Eingabe prüfen'; } }
function renderReview() {
  const sale = editor.type === 'sale';
  return `<section class="panel review"><div class="table-scroll"><table><thead><tr><th>Spieler</th>${sale ? GOODS.map(([,label]) => `<th>${label}</th>`).join('') + '<th>Bedienungen</th><th>Warenumsatz¹</th><th>Meilensteine</th><th>Trinkgeld</th><th>CFO</th>' : '<th>Mitarbeiter</th>'}<th>${sale ? 'Einnahmen' : 'Lohn'}</th></tr></thead><tbody>${game.players.map((p,i) => {
    const r = editor.rows[i]; const c = sale ? calculateSale(r) : null;
    return `<tr><th>${playerName(p)}</th>${sale ? GOODS.map(([key]) => `<td>${r[key]}</td>`).join('') + `<td>${r.waitresses}</td><td>${money(c.revenue)}</td><td>${money(c.bonus)}</td><td>${money(c.tips)}</td><td>${money(c.cfo)}</td>` : `<td>${r}</td>`}<td class="amount">${money(sale ? c.total : r*5)}</td></tr>`;
  }).join('')}</tbody></table></div>${sale ? '<p class="hint">¹ Mit eingestelltem Stückpreis und gegebenenfalls Gartenbonus. CFO wird einmal auf alle Rundeneinnahmen berechnet und aufgerundet.</p>' : ''}</section>`;
}
function renderReserve(target) {
  target.innerHTML = `<section class="panel reserve"><p class="eyebrow">ERSTER BANKBRUCH</p><h2>Zeit, die Reserve aufzudecken.</h2><p>Wählt den Geldbetrag der zu Beginn verdeckt gewählten Karte jedes Spielers. Noch ausstehende Einnahmen werden vollständig ausgezahlt.</p><div class="reserve-grid">${game.players.map((p,i) => `<label>${playerName(p)}<select data-reserve="${i}"><option value="">Karte wählen …</option>${[100,200,300].map(n => `<option value="${n}">${money(n)}</option>`).join('')}</select></label>`).join('')}</div><button data-action="reserve">Reserve der Bank hinzufügen</button></section>`;
}
function renderLog(target) {
  target.innerHTML = `<div class="phase-heading"><div><p class="eyebrow">JEDE BUCHUNG BLEIBT NACHVOLLZIEHBAR</p><h2>Das Geschäftsbuch</h2><p>Vergangene Eingaben bearbeiten. Konten und Bank werden neu berechnet.</p></div></div>${!game.events.length ? '<section class="panel"><p>Noch keine Buchungen. Los geht’s mit dem ersten Verkauf.</p></section>' : [...game.events].reverse().map((event, reverseIndex) => {
    const index = game.events.length - 1 - reverseIndex;
    const sale = event.type === 'sale';
    return `<section class="panel log-event"><div class="log-heading"><div><span class="eyebrow">RUNDE ${event.round}</span><h3>${sale ? 'Verkauf' : 'Lohnzahlung'}</h3></div><span>${event.updatedAt ? 'Bearbeitet · ' : ''}${esc(new Date(event.updatedAt || event.createdAt).toLocaleString('de-DE'))}</span><button class="secondary" data-action="edit" data-index="${index}">Bearbeiten</button></div>${game.players.map((p,i) => `<div class="log-row"><span>${playerName(p)}</span><span class="log-detail">${sale ? GOODS.map(([key,label]) => `${event.rows[i][key]} ${label}`).join(' · ') + ` · ${event.rows[i].waitresses} Bedienungen · CFO ${event.rows[i].cfo || event.rows[i].milestones.cfo ? 'ja' : 'nein'}` : `${event.rows[i]} Mitarbeiter × 5 $`}</span><strong class="${sale ? 'positive' : ''}">${sale ? '+' : '−'}${money(sale ? calculateSale(event.rows[i]).total : event.rows[i]*5)}</strong></div>`).join('')}</section>`;
  }).join('')}${game.events.length ? '<button class="text-button danger" data-action="undo">Letzte Buchung zurücknehmen</button>' : ''}`;
}
function render() {
  if (screen === 'home') home();
  else if (screen === 'setup') setup();
  else if (game) dashboard();
  else { screen = 'home'; home(); }
}
function persistDraft() {
  if (editor?.index === null) { game.draft = { type: editor.type, rows: structuredClone(editor.rows) }; save(); }
}
function checkEditor() {
  if (editor.type === 'sale') editor.rows.forEach(calculateSale);
  else editor.rows.forEach(n => { if (!Number.isSafeInteger(n) || n < 0 || n > 1000000) throw new Error('Bitte eine gültige Mitarbeiterzahl eingeben.'); });
  const candidate = structuredClone(game);
  const event = { type: editor.type, round: currentRound(), rows: structuredClone(editor.rows), createdAt: new Date().toISOString() };
  if (editor.index === null) candidate.events.push(event);
  else candidate.events[editor.index] = { ...candidate.events[editor.index], ...event, createdAt: candidate.events[editor.index].createdAt, updatedAt: new Date().toISOString() };
  candidate.draft = null;
  const result = account(candidate);
  if (result.issues.length) throw new Error(result.issues.join(' '));
  if (editor.index !== null && result.needsReserve && editor.index !== candidate.events.length - 1) throw new Error('Diese Änderung benötigt Reservekarten. Bitte zuerst die späteren Buchungen zurücknehmen.');
  return candidate;
}
app.addEventListener('input', event => {
  const input = event.target;
  if (input.dataset.setupName !== undefined) { setupPlayers[+input.dataset.setupName].name = input.value; return; }
  if (input.dataset.row === undefined || !editor) return;
  const i = +input.dataset.row;
  if (input.dataset.milestone) {
    editor.rows[i].milestones[input.dataset.milestone] = input.checked;
    // Explicit CFO selection remains independent of the permanent milestone.
    const card = input.closest('.player-entry');
    const cfo = card.querySelector('[data-field="cfo"]');
    cfo.checked = editor.rows[i].cfo || editor.rows[i].milestones.cfo;
    cfo.disabled = editor.rows[i].milestones.cfo;
    card.querySelector('summary span').textContent = `${MILESTONES.filter(([key]) => editor.rows[i].milestones[key]).length} aktiv`;
  } else {
    const value = input.type === 'checkbox' ? input.checked : input.valueAsNumber;
    if (typeof value === 'number' && (!input.validity.valid || !Number.isFinite(value))) return;
    if (editor.type === 'salary') editor.rows[i] = value;
    else editor.rows[i][input.dataset.field] = value;
  }
  document.querySelector(`#row-total-${i}`).textContent = editor.type === 'sale' ? safeTotal(editor.rows[i]) : money(editor.rows[i]*5);
  persistDraft();
});
app.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'player-count') { setupCount = +input.value; setup(); }
  if (input.dataset.setupColor !== undefined) { setupPlayers[+input.dataset.setupColor].color = input.value; input.style.borderLeftColor = input.value; }
});
app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  try {
    switch (button.dataset.action) {
      case 'home': screen = 'home'; editor = null; break;
      case 'setup': screen = 'setup'; break;
      case 'start': {
        const players = setupPlayers.slice(0,setupCount).map(p => ({ name: p.name.trim(), color: p.color, milestones: milestones() }));
        const next = validateGame({ version: 1, players, reserves: null, events: [], draft: null });
        if (game && !confirm('Die bisherige Partie auf diesem Gerät ersetzen? Vorher bei Bedarf exportieren.')) return;
        game = next; save(); screen = 'table'; editor = null; break;
      }
      case 'resume': case 'table': screen = 'table'; editor = null; review = false; break;
      case 'log': screen = 'log'; editor = null; break;
      case 'review': {
        const invalid = app.querySelector('input:invalid');
        if (invalid) { invalid.reportValidity(); return; }
        checkEditor(); review = true; break;
      }
      case 'back-input': review = false; break;
      case 'commit': {
        const editing = editor.index !== null;
        const candidate = checkEditor();
        if (!editing && editor.type === 'sale') candidate.players.forEach((p,i) => { p.milestones = { ...editor.rows[i].milestones }; });
        game = candidate; editor = null; save(); screen = editing ? 'log' : 'table'; notify(editing ? 'Buchung korrigiert. Alle Kontostände wurden neu berechnet.' : 'Buchung gespeichert.'); break;
      }
      case 'edit': beginEditor(+button.dataset.index); screen = 'table'; break;
      case 'cancel-edit': editor = null; screen = 'log'; break;
      case 'reserve': {
        const values = [...app.querySelectorAll('[data-reserve]')].map(input => +input.value);
        if (values.some(n => ![100,200,300].includes(n))) throw new Error('Bitte die Reservekarte jedes Spielers auswählen.');
        game.reserves = values; editor = null; save(); break;
      }
      case 'undo':
        if (!confirm('Die letzte Buchung zurücknehmen? Danach kannst du die Eingaben neu erfassen.')) return;
        { const last = game.events.pop(); game.draft = { type: last.type, rows: structuredClone(last.rows) }; }
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
