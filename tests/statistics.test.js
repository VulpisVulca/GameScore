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
