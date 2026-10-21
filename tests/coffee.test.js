import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMilestones,emptySale,houseRows,calculateSale,roundSettlement,account,validateGame,COLORS,milestoneList} from '../rules.js';
import {removeBuiltGarden} from '../houses.js';
import {gameStatistics,gameAwards} from '../statistics.js';
import {renderStatistics,renderAwards} from '../statistics-view.js';
import {setLanguage} from '../i18n.js';

const game=(set='base')=>({version:1,milestoneSet:set,modules:{coffee:true},players:COLORS.slice(0,3).map((color,i)=>({name:'Player '+i,color,milestones:emptyMilestones(set)})),events:[],reserves:null,draft:null});
const house=extra=>({number:'3',type:'garden',player:0,price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,coffee:0,...extra});

test('Coffee belongs to each seller, uses their price and garden multiplier, ignores drink bonuses, and is included in CFO once',()=>{
  const g=game();
  const configs=g.players.map(p=>emptySale(p.milestones));
  configs[0].milestones.burger=true;
  Object.assign(configs[1],{cfo:true,waitresses:1});
  configs[1].milestones.drink=true;configs[1].milestones.price=true;
  const rows=houseRows(configs,[house({burger:2}),house({player:1,price:8,coffee:2}),house({player:2,coffee:1})]);
  const c=calculateSale(rows[1]);
  assert.equal(c.revenue,0);assert.equal(c.bonus,0);assert.equal(c.coffeeRevenue,28);assert.equal(c.cfo,16);assert.equal(c.total,47);
  assert.equal(rows[1].garden,0);assert.equal(rows[1].coffeeGarden,2);
  const result=roundSettlement(g,rows,[1,1,0]);
  assert.deepEqual(result.incomes,[50,47,20]);
  assert.deepEqual(result.balances,[45,42,20]);
  assert.equal(account(result.candidate).bank,43);
  assert.doesNotThrow(()=>validateGame(JSON.parse(JSON.stringify(result.candidate))));
  const stats=gameStatistics(result.candidate);
  assert.deepEqual(stats.players[1].goods.coffee,{quantity:2,income:28});
  assert.equal(stats.players[1].houses,0);
  assert.equal(stats.players[1].uniqueHouses,1);
  assert.deepEqual(stats.firstSale.winners,[1,2]); // Coffee at the first house is sold before its meal.
  assert.ok(gameAwards(stats).some(a=>a.title==='Kaffee-Verkaufsprofi'&&a.value===2));
  assert.match(renderStatistics(result.candidate),/Kaffee/);
  try {setLanguage('en');assert.match(renderAwards(result.candidate),/Coffee/);} finally {setLanguage('de');}
});

test('Coffee requires a dining house, consistent garden state and separate records',()=>{
  const configs=game().players.map(p=>emptySale(p.milestones));
  assert.throws(()=>houseRows(configs,[house({player:1,coffee:1})]));
  assert.throws(()=>houseRows(configs,[house({burger:1,coffee:1})]));
  assert.throws(()=>houseRows(configs,[house({burger:1}),house({player:1,type:'normal',coffee:1})]));
  assert.throws(()=>houseRows(configs,[house({burger:1}),house({player:1,coffee:-1})]));
  const rows=houseRows(configs,[house({burger:1}),house({player:1,coffee:1})]);
  rows[1].coffee=2;
  assert.throws(()=>calculateSale(rows[1]));
});

test('Garden correction changes coffee and CFO in every subsequent round and preserves the separate quantities',()=>{
  const g=game();
  const configs=g.players.map(p=>emptySale(p.milestones));configs[1].cfo=true;
  const rows=houseRows(configs,[house({number:'2',burger:1}),house({number:'2',player:1,coffee:2})]);
  const first=roundSettlement(g,rows,[0,0,0]);
  const second=roundSettlement(first.candidate,rows,[0,0,0],null,[100,100,100]);
  const corrected=removeBuiltGarden(second.candidate,'2',1);
  assert.deepEqual(account(corrected).balances,[20,60,0]);
  for(const sale of corrected.events.filter(e=>e.type==='sale')) assert.equal(sale.rows[1].coffeeGarden,0);
  assert.doesNotThrow(()=>validateGame(corrected));
  assert.equal(gameStatistics(corrected).players[1].goods.coffee.income,40);
});

test('Coffee may cause the final bank break and is still paid fully, without wages or marketing',()=>{
  const g=game('new');
  const configs=g.players.map(p=>emptySale(p.milestones));
  configs[1].milestones.marketeer=true;configs[1].demand=20;configs[1].cfo=true;
  const rows=houseRows(configs,[house({burger:1}),house({player:1,coffee:20})]);
  const result=roundSettlement(g,rows,[100,100,100],null,[100,100,100]);
  assert.equal(result.ended,true);
  assert.equal(result.incomes[1],600);
  assert.deepEqual(result.marketing,[0,0,0]);assert.deepEqual(result.expenses,[0,0,0]);
  assert.equal(result.candidate.events.length,1);
  assert.equal(gameStatistics(result.candidate).players[1].goods.coffee.quantity,20);
});

test('Legacy coffee milestone flags remain loadable and have no financial effect, but are not offered in either set',()=>{
  for(const set of ['base','new']) {
    const g=game(set);g.players[0].milestones.coffee=true;
    const configs=g.players.map(p=>emptySale(p.milestones));
    const rows=houseRows(configs,[house({burger:1}),house({player:1,coffee:1})]);
    const result=roundSettlement(g,rows,[0,0,0]);
    assert.deepEqual(result.incomes,[20,20,0]);
    assert.equal(milestoneList(g.players[0].milestones,g).some(([key])=>key==='coffee'),false);
    assert.doesNotThrow(()=>validateGame(result.candidate));
    g.modules.coffee=false;
    assert.doesNotThrow(()=>validateGame(g));
    assert.throws(()=>roundSettlement(g,rows,[0,0,0]));
  }
});

test('Coffee combines with alternative wages and marketing while keeping marketing outside CFO and after wages',()=>{
  const g=game('new');
  const configs=g.players.map(p=>emptySale(p.milestones));
  configs[1].milestones.salary=true;configs[1].milestones.marketeer=true;
  configs[1].demand=2;configs[1].cfo=true;
  const rows=houseRows(configs,[house({type:'normal',burger:1}),house({type:'normal',player:1,coffee:2})]);
  const result=roundSettlement(g,rows,[0,1,0]);
  assert.equal(result.incomes[1],30);
  assert.equal(result.expenses[1],3);
  assert.equal(result.marketing[1],10);
  assert.equal(result.balances[1],37);
  assert.deepEqual(result.issues,[]);
  assert.equal(gameStatistics(result.candidate).players[1].cfo,10);
});

test('Import checks coffee quantities, availability and drafts while older saves remain valid',()=>{
  const g=game();
  const configs=g.players.map(p=>emptySale(p.milestones));
  const rows=houseRows(configs,[house({burger:1}),house({player:1,coffee:1})]);
  g.draft={type:'sale',rows,houseForm:house({coffee:1,burger:0,player:1})};
  assert.doesNotThrow(()=>validateGame(g));
  g.draft.houseForm.coffee=-1;assert.throws(()=>validateGame(g));
  g.draft.houseForm.coffee=1;g.modules.coffee=false;assert.throws(()=>validateGame(g));
  g.draft=null;g.modules={};assert.doesNotThrow(()=>validateGame(g));
});

test('Confirmed coffee quantities on an unfinished house are validated and preserved without booking money',()=>{
  const g=game();
  g.draft={type:'sale',rows:g.players.map(p=>emptySale(p.milestones)),houseForm:house({player:null,burger:1,coffees:[0,2,1]})};
  const restored=validateGame(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(restored.draft.houseForm.coffees,[0,2,1]);
  assert.deepEqual(account(restored).balances,[0,0,0]);
  for (const quantities of [[1],[-1,0,0],[0,1.5,0],[0,1000001,0],null]) {
    g.draft.houseForm.coffees=quantities;
    assert.throws(()=>validateGame(g));
  }
  g.draft.houseForm.coffees=[0,2,1];g.modules.coffee=false;
  assert.throws(()=>validateGame(g));
});
