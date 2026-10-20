import test from 'node:test';
import assert from 'node:assert/strict';
import { MILESTONES, COLORS, emptySale, calculateSale, account, validateGame } from '../rules.js';

const milestones = extra => ({ ...Object.fromEntries(MILESTONES.map(([key]) => [key, false])), ...extra });
const sale = extra => ({ ...emptySale(milestones()), ...extra });
const game = events => ({ version: 1, players: ['Alex','Kim'].map((name,i) => ({name,color:COLORS[i],milestones:milestones()})), reserves: null, events, draft: null });
const sales = (round, a, b = {}) => ({type:'sale',round,rows:[sale(a),sale(b)]});
const wages = (round, a, b) => ({type:'salary',round,rows:[a,b]});

test('Umsatz je Warenart, alle Boni, Trinkgeld und einmaliger aufgerundeter CFO', () => {
  const result = calculateSale(sale({ burger: 2, pizza: 1, beer: 1, lemonade: 2, soda: 3, waitresses: 1, cfo: true, milestones: milestones({burger:true,pizza:true,drink:true}) }));
  assert.deepEqual(result, {quantity:9,price:10,revenue:90,bonus:45,tips:3,cfo:69,total:207});
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
