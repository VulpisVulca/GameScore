import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySale,emptyMilestones,houseRows,calculateSale,validateGame,roundSettlement,COLORS,account} from '../rules.js';
import {gameStatistics} from '../statistics.js';
import {renderStatistics} from '../statistics-view.js';
import {setLanguage} from '../i18n.js';
const game=()=>({version:1,modules:{fryChef:true,coffee:true},players:COLORS.slice(0,2).map((color,i)=>({name:'P'+i,color,milestones:emptyMilestones()})),events:[],reserves:null,draft:null});
const house=extra=>({number:'2',type:'normal',player:0,price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,...extra});
const configs=g=>g.players.map(p=>emptySale(p.milestones));
test('Fry Chefs earn per meal house, stack, ignore item count and garden multiplier, and enter CFO once',()=>{
 const g=game(),c=configs(g);Object.assign(c[0],{fryChefs:2,waitresses:1,cfo:true});
 const rows=houseRows(c,[house({burger:3}),house({number:'3',type:'garden',soda:1}),house({coffee:2}),house({player:1,coffee:1})]);
 const s=calculateSale(rows[0]);assert.equal(s.fryHouses,2);assert.equal(s.fry,40);assert.equal(s.cfo,57);assert.equal(s.total,170);assert.equal(rows[0].fryChefs,2);
 const coffeeOnly=houseRows([{...c[0],fryChefs:3},c[1]],[house({player:1,burger:1}),house({coffee:3})]);assert.equal(calculateSale(coffeeOnly[0]).fry,0);
 assert.equal(calculateSale({...emptySale(emptyMilestones()),fryChefs:2}).fry,0);
});
test('Fry Chef bonus breaks the bank, survives final settlement and is corrected in stats without inflating product income',()=>{
 const g=game(),c=configs(g);c[0].fryChefs=6;
 const rows=houseRows(c,[house({burger:1}),house({number:'4',beer:1})]);
 const final=roundSettlement(g,rows,[2,0],null,[100,100]);assert.equal(final.ended,false);assert.equal(final.balances[0],130);
 g.events=[{type:'sale',round:1,rows},{type:'salary',round:1,rows:[2,0]}];g.reserves=[100,100];validateGame(g);
 const stats=gameStatistics(g);assert.equal(stats.players[0].fry,120);assert.equal(stats.players[0].goods.burger.income,10);assert.equal(stats.players[0].balance,130);assert.deepEqual(stats.players.map(p=>p.balance),account(g).balances);
 setLanguage('en');assert.match(renderStatistics(g),/Fry Chefs/);setLanguage('de');
 g.events[0].rows[0].fryChefs=1;assert.equal(gameStatistics(g).players[0].fry,20);
 const ended=roundSettlement({...g,events:[],reserves:[100,100]},houseRows([{...c[0],fryChefs:20},c[1]],[house({burger:1}),house({number:'4',beer:1})]),[99,0]);assert.equal(ended.ended,true);assert.equal(ended.balances[0],420);assert.equal(ended.expenses[0],0);
});
test('Fry Chef drafts and imports validate counts and enabled modules while old saves remain compatible',()=>{
 const g=game(),c=configs(g);c[0].fryChefs=2;g.draft={type:'sale',rows:houseRows(c,[house({pizza:2})])};validateGame(JSON.parse(JSON.stringify(g)));
 for(const count of [-1,1.5,1000001]){const bad=structuredClone(g);bad.draft.rows[0].fryChefs=count;assert.throws(()=>validateGame(bad));}
 assert.throws(()=>validateGame({...g,modules:{coffee:true}}),/Friteusenkoch/);
 const old=game();delete old.modules;const row=emptySale(emptyMilestones());delete row.fryChefs;old.events=[{type:'sale',round:1,rows:[row,structuredClone(row)]}];validateGame(old);assert.equal(calculateSale(row).total,0);
 assert.throws(()=>calculateSale({...row,burger:1,fryChefs:1}),/Hausverkäufe/);
});
