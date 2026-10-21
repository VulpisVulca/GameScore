import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySale, houseRows, calculateSale } from '../rules.js';
import { gameStatistics, gameAwards } from '../statistics.js';
import { renderStatistics, renderAwards } from '../statistics-view.js';

const players = [{name:'Alex',color:'#b34335'},{name:'Kim',color:'#336f9b'}];
const game = events => ({players,events});
const house = extra => ({player:0,number:'7',type:'normal',price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,...extra});

test('Statistics allocate product revenue using each house price, garden and milestones; CFO stays separate', () => {
  const configs=[{...emptySale({burger:true,drink:true}),waitresses:2,cfo:true},emptySale()];
  const rows=houseRows(configs,[house({burger:2,pizza:1}),house({type:'garden',price:8,burger:1,beer:2})]);
  const stats=gameStatistics(game([{type:'sale',round:1,rows},{type:'salary',round:1,rows:[3,0]}]));
  const p=stats.players[0];
  assert.equal(p.goods.burger.income,51);
  assert.equal(p.goods.pizza.income,10);
  assert.equal(p.goods.beer.income,42);
  assert.equal(p.tips,6);
  assert.equal(p.cfo,55);
  assert.equal(p.income,164);
  assert.equal(p.balance,149);
  assert.equal(p.wages,15);
  assert.equal(p.houses,2);
  assert.equal(p.gardens,1);
  assert.equal(p.bonus,25);
  assert.equal(Object.values(p.goods).reduce((s,g)=>s+g.income,0)+p.tips+p.cfo,p.income);
  assert.deepEqual(stats.rounds[0].players[0],{income:164,wages:15,net:149,balance:149});
  assert.equal(stats.estimated,false);
});

test('Round balances, final sale without salary, and historical corrections are rebuilt from the ledger', () => {
  const events=[{type:'sale',round:1,rows:[{...emptySale(),burger:2},emptySale()]},{type:'salary',round:1,rows:[1,0]},
    {type:'sale',round:2,rows:[{...emptySale(),pizza:40},emptySale()]}];
  const stats=gameStatistics(game(events));
  assert.equal(stats.players[0].balance,415);
  assert.equal(stats.rounds[1].players[0].wages,0);
  assert.equal(stats.rounds[1].players[0].balance,415);
  events[0].rows[0].burger=3;
  assert.equal(gameStatistics(game(events)).players[0].balance,425);
  assert.equal(gameAwards(stats).find(a=>a.title==='Rekordrunde').value,400);
});

test('Legacy mixed garden revenue is explicitly estimated, totals remain exact', () => {
  const row={...emptySale({burger:true}),burger:1,pizza:2,garden:1};
  const stats=gameStatistics(game([{type:'sale',round:1,rows:[row,emptySale()]}]));
  assert.equal(stats.estimated,true);
  const p=stats.players[0];
  assert.ok(Math.abs(Object.values(p.goods).reduce((s,g)=>s+g.income,0)-calculateSale(row).total)<1e-9);
  assert.match(renderStatistics(game([{type:'sale',round:1,rows:[row,emptySale()]}])),/geschätzt/);
});

test('Awards share tied records, include tied rounds, and do not award zero sales', () => {
  const rows=[{...emptySale(),burger:2},{...emptySale(),burger:2}];
  const stats=gameStatistics(game([{type:'sale',round:1,rows},{type:'sale',round:2,rows}]));
  const awards=gameAwards(stats);
  assert.deepEqual(awards.find(a=>a.title==='Burger-Verkaufsprofi').winners,[0,1]);
  assert.deepEqual(awards.find(a=>a.title==='Rekordrunde').rounds,[1,2]);
  assert.equal(awards.some(a=>a.title==='Finanzgenie'),false);
  assert.equal(gameAwards(gameStatistics(game([]))).length,0);
});

test('Charts and awards escape player names, handle zero earnings and empty ledgers', () => {
  const g={players:[{name:'<script>',color:'#b34335'},players[1]],events:[{type:'sale',round:1,rows:[emptySale(),{...emptySale(),burger:1}]}]};
  for(const metric of ['balance','income','net','wages']) {
    const html=renderStatistics(g,metric);
    assert.ok(!html.includes('NaN'));
    assert.ok(!html.includes('Infinity'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  }
  assert.ok(!renderAwards(g).includes('<script>'));
  assert.match(renderStatistics(game([])),/ersten gebuchten Runde/);
});

test('First sale follows house-number order in the earliest product-selling round, excluding tips', () => {
  const configs=[emptySale(),emptySale()];
  const rows=houseRows(configs,[house({number:'7',order:0,burger:1}),house({player:1,number:'2',order:1,pizza:1})]);
  const stats=gameStatistics(game([{type:'sale',round:1,rows:[{...emptySale(),waitresses:2},emptySale()]},
    {type:'sale',round:2,rows}]));
  const first=gameAwards(stats).find(a=>a.title==='Erster Verkauf des Spiels');
  assert.deepEqual(first.winners,[1]);
  assert.equal(first.house,2);
  assert.deepEqual(first.rounds,[2]);
  const old=gameStatistics(game([{type:'sale',round:1,rows:[{...emptySale(),burger:1},emptySale()]},{type:'sale',round:2,rows}]));
  assert.equal(old.firstSaleUnavailable,true);
  assert.equal(gameAwards(old).some(a=>a.title==='Erster Verkauf des Spiels'),false);
});

test('Growth compares consecutive round earnings including tips and CFO, with shared ties and no first-round baseline', () => {
  const events=[{type:'sale',round:1,rows:[{...emptySale(),burger:1},emptySale()]},
    {type:'sale',round:2,rows:[{...emptySale(),burger:3,waitresses:1,cfo:true},{...emptySale(),burger:4}]},
    {type:'sale',round:3,rows:[{...emptySale(),burger:1},{...emptySale(),burger:1}]}];
  const growth=gameAwards(gameStatistics(game(events))).find(a=>a.title==='Wachstumsschub');
  assert.equal(growth.value,40);
  assert.equal(growth.positive,true);
  assert.deepEqual(growth.winners,[0,1]);
  assert.deepEqual(growth.rounds,[2]);
  assert.equal(gameAwards(gameStatistics(game(events.slice(0,1)))).some(a=>a.title==='Wachstumsschub'),false);
});

test('Regular customers count distinct rounds; neighborhood counts distinct houses; gardens count quantities', () => {
  const configs=[emptySale(),emptySale()];
  const events=[{type:'sale',round:1,rows:houseRows(configs,[
    house({number:'7',type:'garden',burger:2}),house({number:'7',burger:1}),house({number:'2',type:'garden',pizza:3}),
    house({player:1,number:'2',type:'garden',burger:3})])},
    {type:'sale',round:2,rows:houseRows(configs,[house({number:'House 7',burger:1}),
      house({player:1,number:'4',type:'garden',pizza:2}),house({player:1,number:'5',burger:1}),house({player:1,number:'6',burger:1})])},
    {type:'sale',round:3,rows:houseRows(configs,[house({number:'Haus 7',burger:1}),house({player:1,number:'4',burger:1})])}];
  const stats=gameStatistics(game(events)), awards=gameAwards(stats);
  const regular=awards.find(a=>a.title==='Stammkundschaft');
  assert.equal(regular.value,3);
  assert.deepEqual(regular.winners,[0]);
  assert.equal(regular.houseRecords[0].number,7);
  assert.deepEqual(regular.houseRecords[0].rounds,[1,2,3]);
  const neighbor=awards.find(a=>a.title==='Liebling der Nachbarschaft');
  assert.equal(neighbor.value,4);
  assert.deepEqual(neighbor.winners,[1]);
  const garden=awards.find(a=>a.title==='Gartenliebling');
  assert.equal(garden.value,5);
  assert.deepEqual(garden.winners,[0,1]);
  assert.equal(gameAwards(gameStatistics(game(events.slice(0,1)))).some(a=>a.title==='Stammkundschaft'),false);
});

test('House award details escape old custom labels and update after ledger corrections', () => {
  const configs=[emptySale(),emptySale()];
  const rows=houseRows(configs,[house({number:'<script>',type:'garden',burger:2})]);
  const g=game([{type:'sale',round:1,rows:structuredClone(rows)},{type:'sale',round:2,rows:structuredClone(rows)}]);
  const html=renderAwards(g);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.equal(gameAwards(gameStatistics(g)).find(a=>a.title==='Gartenliebling').value,4);
  g.events[1].rows=houseRows(configs,[house({number:'<script>',type:'normal',burger:2})]);
  assert.equal(gameAwards(gameStatistics(g)).find(a=>a.title==='Gartenliebling').value,2);
  g.events.pop();
  assert.equal(gameAwards(gameStatistics(g)).some(a=>a.title==='Stammkundschaft'),false);
});
