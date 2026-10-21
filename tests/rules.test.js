import test from 'node:test';
import assert from 'node:assert/strict';
import { MILESTONES, COLORS, emptySale, calculateSale, calculateHouse, houseRows, account, roundSettlement, validateGame } from '../rules.js';

const milestones = extra => ({ ...Object.fromEntries(MILESTONES.map(([key]) => [key, false])), ...extra });
const sale = extra => ({ ...emptySale(milestones()), ...extra });
const game = events => ({ version: 1, players: ['Alex','Kim'].map((name,i) => ({name,color:COLORS[i],milestones:milestones()})), reserves: null, events, draft: null });
const sales = (round, a, b = {}) => ({type:'sale',round,rows:[sale(a),sale(b)]});
const wages = (round, a, b) => ({type:'salary',round,rows:[a,b]});

test('Umsatz je Warenart, alle Boni, Trinkgeld und einmaliger aufgerundeter CFO', () => {
  const result = calculateSale(sale({ burger: 2, pizza: 1, beer: 1, lemonade: 2, soda: 3, waitresses: 1, cfo: true, milestones: milestones({burger:true,pizza:true,drink:true}) }));
  assert.deepEqual(result, {quantity:9,coffee:0,price:10,revenue:90,coffeeRevenue:0,bonus:45,tips:3,cfo:69,total:207});
});
test('permanenter CFO wird ohne Checkbox angewandt und nicht mit CFO gestapelt', () => {
  const row = sale({ waitresses:1,milestones:milestones({cfo:true}) });
  assert.equal(calculateSale(row).total, 5);
  assert.equal(calculateSale({...row,cfo:true}).total, 5);
});
test('Bedienungsmeilenstein und Preisnachlass', () => {
  assert.equal(calculateSale(sale({burger:2,waitresses:2,milestones:milestones({waitress:true,price:true})})).total,28);
});
test('Garten verdoppelt nur den Stückpreis, nicht die Warenboni', () => {
  const r = calculateSale(sale({burger:1,beer:2,price:20,garden:3,milestones:milestones({burger:true})}));
  assert.equal(r.total,125);
});
test('Unmögliche Mengen, negative Preise und nicht ganzzahlige Werte werden abgewiesen', () => {
  for (const row of [sale({burger:-1}),sale({beer:0.5}),sale({burger:NaN}),sale({garden:1}),sale({price:0,milestones:milestones({price:true})})]) assert.throws(() => calculateSale(row));
});
test('Startbank und vollständige Geldkonservierung bei Verkauf und Lohn', () => {
  const state = game([sales(1,{burger:3},{pizza:2}),wages(1,2,1)]);
  const a = account(state);
  assert.deepEqual(a.balances,[20,15]);
  assert.equal(a.bank,65);
  assert.equal(a.bank + a.balances.reduce((s,n) => s+n,0),100);
  assert.deepEqual(a.issues,[]);
});
test('Erster Bankbruch fragt Reserve erst bei verbrauchter Bank ab', () => {
  const state = game([sales(1,{burger:12},{})]);
  assert.equal(account(state).needsReserve,true);
  assert.equal(account(state).bank,-20);
  state.reserves = [100,300];
  assert.equal(account(state).needsReserve,false);
  assert.equal(account(state).bank,380);
  assert.equal(account(state).secondBreak,null);
});
test('Bankbruch bei genau leerer Bank und zwei Bankbrüche in einer Verkaufsphase', () => {
  assert.equal(account(game([sales(1,{burger:10})])).needsReserve,true);
  const state = game([sales(1,{burger:40},{pizza:10})]);
  state.reserves = [100,100];
  const a = account(state);
  assert.deepEqual(a.balances,[400,100]);
  assert.equal(a.bank,-200);
  assert.equal(a.firstBreak,0);
  assert.equal(a.secondBreak,0);
});
test('Zweiter Bankbruch zahlt alles aus und erlaubt keinen folgenden Lohn', () => {
  const state = game([sales(1,{burger:12}),wages(1,2,0),sales(2,{burger:20},{pizza:1})]);
  state.reserves = [100,100];
  assert.equal(account(state).secondBreak,2);
  assert.deepEqual(account(state).balances,[310,10]);
  state.events.push(wages(2,1,0));
  assert.match(account(state).issues.join(' '),/Spielende/);
});
test('Historische Korrektur rechnet folgende Kontostände neu und findet ungedeckte Löhne', () => {
  const state = game([sales(1,{burger:3}),wages(1,2,0),sales(2,{pizza:2})]);
  assert.deepEqual(account(state).balances,[40,0]);
  state.events[0].rows[0].burger = 2;
  assert.deepEqual(account(state).balances,[30,0]);
  state.events[0].rows[0].burger = 0;
  assert.match(account(state).issues.join(' '),/Lohn übersteigt/);
});
test('Historische Meilensteine bleiben unabhängig vom aktuellen Spielerprofil', () => {
  const state = game([sales(1,{burger:1})]);
  state.players[0].milestones.burger = true;
  state.players[0].milestones.cfo = true;
  assert.equal(account(state).balances[0],10);
});
test('Import validiert Farben, Spieler, Reservekarten, Rundensequenz und Eingaben', () => {
  assert.equal(validateGame(game([])).players.length,2);
  const invalid = [game([wages(1,0,0)]), {...game([]),version:2}, {...game([]),reserves:[0,200]},game([sales(2,{})])];
  const duplicate = game([]); duplicate.players[1].color = duplicate.players[0].color; invalid.push(duplicate);
  const badMilestone = game([]); badMilestone.players[0].milestones = {}; invalid.push(badMilestone);
  invalid.forEach(state => assert.throws(() => validateGame(state)));
});

const house = extra => ({number:'Haus 1',player:0,type:'normal',price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,...extra});
test('Hausverkäufe mit unterschiedlichen Preisen und Garten korrekt pro Spieler summieren', () => {
  const configs = [sale({waitresses:1,cfo:true,milestones:milestones({burger:true,waitress:true})}),sale({milestones:milestones({pizza:true})})];
  const rows = houseRows(configs,[house({burger:1}),house({number:'Haus 2',burger:1,type:'garden',price:20}),house({number:'Haus 3',player:1,pizza:2,type:'garden',price:7})]);
  assert.equal(rows[0].burger,2);
  assert.equal(rows[0].garden,1);
  assert.deepEqual(calculateSale(rows[0]),{quantity:2,coffee:0,price:10,revenue:50,coffeeRevenue:0,bonus:10,tips:5,cfo:33,total:98});
  assert.equal(calculateSale(rows[1]).total,38);
});
test('CFO wird über alle Häuser und Trinkgelder einmal aufgerundet', () => {
  const [row] = houseRows([sale({cfo:true,waitresses:1})],[house({burger:1,price:11}),house({number:'Haus 2',pizza:1,price:11})]);
  assert.equal(calculateSale(row).cfo,13);
  assert.equal(calculateSale(row).total,38);
});
test('Hausbearbeitung und Spielerwechsel verändern beide Konten nachvollziehbar', () => {
  const houses = [house({burger:2}),house({number:'Haus 2',player:1,pizza:1,type:'garden'})];
  const configs = [sale({}),sale({})];
  const state = game([{type:'sale',round:1,rows:houseRows(configs,houses)}]);
  assert.deepEqual(account(state).balances,[20,20]);
  houses[0].player=1; houses[0].burger=3;
  state.events[0].rows=houseRows(configs,houses);
  assert.deepEqual(account(state).balances,[0,50]);
  assert.equal(account(state).bank,50);
  assert.equal(validateGame(state),state);
});
test('Leere Häuser, fremde Spieler und widersprüchliche Hausdaten werden abgewiesen', () => {
  assert.throws(()=>calculateHouse(house({})));
  assert.throws(()=>calculateHouse(house({type:'unknown',burger:1})));
  assert.throws(()=>houseRows([sale({})],[house({player:1,burger:1})]));
  const [row]=houseRows([sale({})],[house({burger:1})]);
  row.burger=2;
  assert.throws(()=>calculateSale(row));
});
test('Nur Bedienungen ohne Hausverkäufe bleiben möglich', () => {
  const [row]=houseRows([sale({waitresses:3,cfo:true})],[]);
  assert.equal(calculateSale(row).total,14);
});

test('Rundenbestätigung bucht Verkäufe und Löhne gemeinsam und erhält den Geldbestand', () => {
  const state=game([]);
  const r=roundSettlement(state,[sale({burger:3}),sale({pizza:2})],[2,1]);
  assert.deepEqual(r.incomes,[30,20]);
  assert.deepEqual(r.expenses,[10,5]);
  assert.deepEqual(r.balances,[20,15]);
  assert.equal(state.events.length,0);
  assert.equal(r.candidate.events.length,2);
  assert.equal(account(r.candidate).bank,65);
  assert.deepEqual(r.issues,[]);
  validateGame(r.candidate);
});
test('Löhne wirken erst nach der Prüfung auf Bankbruch', () => {
  const state=game([]);
  const pending=roundSettlement(state,[sale({burger:10}),sale({})],[1,0]);
  assert.equal(pending.needsReserve,true);
  assert.equal(pending.candidate,null);
  const resolved=roundSettlement(state,[sale({burger:10}),sale({})],[1,0],null,[100,100]);
  assert.equal(resolved.afterSales.firstBreak,0);
  assert.equal(account(resolved.candidate).bank,205);
  assert.deepEqual(resolved.balances,[95,0]);
});
test('Beim zweiten Bankbruch werden eingegebene Löhne nicht abgezogen', () => {
  const state=game([]);
  const r=roundSettlement(state,[sale({burger:30}),sale({})],[50,1],null,[100,100]);
  assert.equal(r.ended,true);
  assert.deepEqual(r.expenses,[0,0]);
  assert.deepEqual(r.balances,[300,0]);
  assert.equal(r.candidate.events.length,1);
  assert.deepEqual(r.issues,[]);
  validateGame(r.candidate);
});
test('Historische Rundenvorschau berücksichtigt alten Stand und berechnet spätere Runden neu', () => {
  const state=game([sales(1,{burger:3},{pizza:2}),wages(1,1,1),sales(2,{burger:1}),wages(2,1,0)]);
  const r=roundSettlement(state,[sale({burger:2}),sale({pizza:1})],[2,1],0);
  assert.deepEqual(r.before.balances,[0,0]);
  assert.deepEqual(r.balances,[10,5]);
  assert.deepEqual(account(r.candidate).balances,[15,5]);
  assert.equal(r.candidate.events.length,4);
  validateGame(r.candidate);
  const next=roundSettlement(r.candidate,[sale({burger:1}),sale({})],[1,0],2);
  assert.deepEqual(next.before.balances,[10,5]);
  assert.deepEqual(next.balances,[15,5]);
});
test('Überhöhte Löhne verhindern Buchung und neue Löhne stapeln keinen CFO-Bonus', () => {
  const r=roundSettlement(game([]),[sale({burger:1,cfo:true}),sale({})],[4,0]);
  assert.deepEqual(r.incomes,[15,0]);
  assert.match(r.issues.join(' '),/Lohn übersteigt/);
});
test('Bereits gebuchte alte Verkäufe werden beim Ergänzen der Löhne nicht doppelt gutgeschrieben', () => {
  const state=game([sales(1,{burger:3},{pizza:2})]);
  const r=roundSettlement(state,state.events[0].rows,[1,2],0);
  assert.deepEqual(r.balances,[25,10]);
  assert.equal(r.candidate.events.length,2);
  assert.deepEqual(account(r.candidate).balances,[25,10]);
});
test('Lohn- und Reserveentwürfe werden beim Import validiert', () => {
  const state=game([]);
  state.draft={type:'sale',rows:[sale({}),sale({})],wages:[2,1],reserves:[100,200],step:'wages'};
  validateGame(state);
  state.draft.wages[0]=-1;
  assert.throws(()=>validateGame(state));
});
