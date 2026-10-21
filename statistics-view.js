import { t, html, htmlText, locale } from './i18n.js';
import { GOODS } from './rules.js';
import { isApartment } from './houses.js';
import { gameStatistics, gameAwards } from './statistics.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const number = n => n.toLocaleString(locale(),{maximumFractionDigits:2});
const money = n => html`${number(n)} $`;
const name = p => html`<span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}`;
const houseName = id => isApartment(id) ? html`Apartment ${id}` : html`Haus ${id}`;
const sources = [...GOODS.map(([key,label],i) => ({key,label:label.split(' · ')[0],color:['#b34335','#d3a323','#75548c','#4e8052','#336f9b'][i]})),
  {key:'tips',label:'Bedienungen',color:'#359b96'},{key:'cfo',label:'CFO',color:'#cc7749'},{key:'marketing',label:'Marketing',color:'#8c586f'}];
const metrics = {balance:'Kontostand',income:'Rundeneinnahmen',net:'Gewinn nach Löhnen',wages:'Löhne pro Runde'};

function timeline(stats, metric) {
  const points = metric === 'balance' ? [{number:0,players:stats.players.map(() => ({balance:0}))},...stats.rounds] : stats.rounds;
  const values = points.flatMap(r => r.players.map(p => p[metric]));
  const min = Math.min(0,...values), max = Math.max(1,...values);
  const x = i => 65 + i * 660 / Math.max(1,points.length-1);
  const y = value => 260 - (value-min)/(max-min)*220;
  const ticks = Array.from({length:5},(_,i) => min+(max-min)*i/4);
  const tickStep = Math.max(1,Math.ceil(points.length/9));
  return html`<div class="stats-chart-scroll"><svg class="timeline-chart" viewBox="0 0 755 305" role="img" aria-label="${t(metrics[metric])} aller Spieler nach Runde"><title>${t(metrics[metric])} aller Spieler nach Runde</title>
    ${ticks.map(v => html`<line x1="65" y1="${y(v)}" x2="725" y2="${y(v)}" class="chart-grid"/><text x="55" y="${y(v)+5}" text-anchor="end">${number(Math.round(v))}</text>`).join('')}
    ${points.map((r,i) => i%tickStep===0 || i===points.length-1 ? html`<text x="${x(i)}" y="289" text-anchor="middle">${r.number===0?t('Start'):html`R${r.number}`}</text>`:'').join('')}
    ${stats.players.map((p,i) => html`<polyline fill="none" stroke="${p.color}" stroke-width="3" points="${points.map((r,j) => html`${x(j)},${y(r.players[i][metric])}`).join(' ')}"/>${points.map((r,j) => html`<circle cx="${x(j)}" cy="${y(r.players[i][metric])}" r="5" fill="${p.color}"><title>${esc(p.name)} · Runde ${r.number}: ${money(r.players[i][metric])}</title></circle>`).join('')}`).join('')}</svg></div>`;
}

function pie(p) {
  const entries = sources.map(s => ({...s,value:['tips','cfo','marketing'].includes(s.key)?p[s.key]:p.goods[s.key].income})).filter(s => s.value>0);
  let offset = 0;
  const slices = entries.map(s => {
    const part=s.value/p.income*100;
    const slice=html`<circle cx="60" cy="60" r="44" fill="none" stroke="${s.color}" stroke-width="24" pathLength="100" stroke-dasharray="${part} ${100-part}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"><title>${t(s.label)}: ${money(s.value)} (${number(part)} %)</title></circle>`;
    offset+=part;return slice;
  }).join('');
  return html`<article class="panel income-pie"><h3>${name(p)}</h3><div class="pie-layout"><svg viewBox="0 0 120 120" role="img" aria-label="Einnahmequellen von ${esc(p.name)}"><title>Einnahmequellen von ${esc(p.name)}</title><circle cx="60" cy="60" r="44" fill="none" stroke="#dfdfcf" stroke-width="24"/>${slices}<text x="60" y="58" text-anchor="middle">Gesamt</text><text x="60" y="73" text-anchor="middle" class="pie-total">${money(p.income)}</text></svg><dl>${entries.map(s => html`<div><dt><span class="chart-dot" style="background:${s.color}"></span>${t(s.label)}</dt><dd>${money(s.value)} <small>${number(s.value/p.income*100)} %</small></dd></div>`).join('') || htmlText('<p>Noch keine Einnahmen.</p>')}</dl></div></article>`;
}

export function renderStatistics(game, metric='balance') {
  const stats=gameStatistics(game);
  if(!stats.rounds.length)return htmlText('<section class="panel"><h2>Statistiken</h2><p>Nach der ersten gebuchten Runde erscheinen hier eure Diagramme.</p></section>');
  const max=Math.max(1,...stats.players.map(p=>p.income));
  return html`<div class="stats-heading"><h2>Die Partie in Zahlen.</h2><p>Nur bestätigte Runden · Korrekturen werden automatisch berücksichtigt.</p></div>
    <section class="panel stats-timeline"><h3>Rundenverlauf</h3><div class="chart-controls" role="group" aria-label="Verlauf auswählen">${Object.entries(metrics).map(([key,label])=>html`<button class="secondary ${key===metric?'is-active':''}" data-action="statistics-metric" data-metric="${key}" aria-pressed="${key===metric}">${t(label)}</button>`).join('')}</div>${timeline(stats,metric)}<div class="chart-legend">${stats.players.map(p=>html`<span>${name(p)}</span>`).join('')}</div><details><summary>Werte als Tabelle anzeigen</summary><div class="table-scroll"><table><thead><tr><th>Runde</th>${stats.players.map(p=>html`<th>${name(p)}</th>`).join('')}</tr></thead><tbody>${stats.rounds.map(r=>html`<tr><th>${r.number}</th>${r.players.map(p=>html`<td>${money(p[metric])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></section>
    <section class="panel wage-comparison"><h3>Einnahmen und Löhne im Vergleich</h3><p class="hint">Gesamte Partie · der verbleibende Betrag ist der Kontostand.</p>${stats.players.map(p=>html`<div class="comparison-player"><strong>${name(p)}</strong><div class="stat-bar"><span style="width:${p.income/max*100}%;background:${p.color}"></span></div><span>Einnahmen <b>${money(p.income)}</b></span><div class="stat-bar wage-bar"><span style="width:${p.wages/max*100}%"></span></div><span>Löhne <b>${money(p.wages)}</b> · ${p.income?number(p.wages/p.income*100):'0'} % der Einnahmen</span></div>`).join('')}</section>
    <h2>Womit habt ihr Geld verdient?</h2><p class="hint">Waren inklusive Garten- und Meilensteinboni. CFO und Bedienungen werden separat ausgewiesen.</p>${stats.estimated?htmlText('<p class="round-warning">Bei älteren Buchungen ohne einzelne Häuser wird der Gartenumsatz anteilig auf die Waren verteilt. Die Aufteilung nach Waren ist dort geschätzt; Gesamteinnahmen bleiben exakt.</p>'):''}<div class="stats-pies">${stats.players.map(pie).join('')}</div>`;
}

export function renderAwards(game) {
  const stats=gameStatistics(game), awards=gameAwards(stats);
  return html`<div class="stats-heading"><h2>Eure Achievements.</h2><p>Auszeichnungen für diese Partie · bei Gleichstand werden alle ausgezeichnet.</p></div><div class="award-grid">${awards.map(a=>html`<article class="panel award-card"><span class="award-medal" aria-hidden="true">★</span><h3>${a.title}</h3><p>${a.detail}</p><strong class="award-value">${a.positive?'+':''}${a.house?houseName(a.house):a.unit==='$'?money(a.value):html`${number(a.value)} ${a.unit}`}</strong><div class="award-winners">${a.winners.map(i=>html`<span>${name(stats.players[i])}</span>`).join('')}</div>${a.rounds?html`<small>Runde ${a.rounds.join(', ')}</small>`:''}${a.houseRecords?html`<div class="award-context">${a.houseRecords.map(record=>html`<small>${name(stats.players[record.player])} · ${record.number?houseName(record.number):esc(record.label)} · ${html`Runde ${record.rounds.join(', ')}`}</small>`).join('')}</div>`:''}</article>`).join('')||htmlText('<section class="panel"><p>Nach den ersten Verkäufen erscheinen hier eure Auszeichnungen.</p></section>')}</div>${stats.estimated?htmlText('<p class="hint">Warenumsätze älterer Buchungen mit gemischten Gartenwaren sind anteilig geschätzt.</p>'):''}${stats.housesIncomplete||stats.firstSaleUnavailable?htmlText('<p class="hint">Bei älteren Summenbuchungen fehlen Hausdaten. Hausbezogene Auszeichnungen berücksichtigen nur erfasste Einzelhäuser; der erste Verkauf wird nur bei eindeutigen Hausnummern vergeben.</p>'):''}`;
}
