import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySale,emptyMilestones,houseRows,calculateHouse,calculateSale,account,roundSettlement,validateGame,COLORS,milestoneList} from '../rules.js';
import {houseOptions,houseId,houseOrder,removeBuiltGarden,removeBuiltPark} from '../houses.js';
import {gameStatistics} from '../statistics.js';
import {renderStatistics,renderAwards} from '../statistics-view.js';
import {setLanguage} from '../i18n.js';
const game=()=>({version:1,modules:{kimchi:true,noodles:true,rural:true,ketchup:true,coffee:true,lobbyist:true,fryChef:true},players:COLORS.slice(0,3).map((color,i)=>({name:'P'+i,color,milestones:emptyMilestones()})),reserves:null,events:[],draft:null});
const configs=g=>g.players.map(p=>emptySale(p.milestones));
const house=extra=>({number:'2',player:0,type:'normal',park:false,price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,coffee:0,noodles:0,kimchi:0,...extra});
test('Kimchi adds exactly one item per meal at the seller price, uses house factors and CFO, and receives no burger/drink bonus',()=>{
 const g=game(),c=configs(g);Object.assign(c[0],{cfo:true});Object.assign(c[0].milestones,{burger:true,drink:true});
 const rows=houseRows(c,[house({burger:2,kimchi:1,type:'garden',park:true,price:9}),house({player:1,coffee:1,type:'garden',park:true,price:8})]);
 const calc=calculateSale(rows[0]);assert.equal(calc.total,137);assert.equal(calc.quantity,3);assert.equal(calc.bonus,10);assert.equal(rows[0].kimchi,1);
 g.events=[{type:'sale',round:1,rows}];g.reserves=[200,200,200];const stats=gameStatistics(g);assert.equal(stats.players[0].goods.kimchi.income,27);assert.equal(stats.players[0].goods.burger.income,64);
 assert.throws(()=>calculateHouse(house({kimchi:1})));assert.throws(()=>calculateHouse(house({burger:1,kimchi:2})));assert.throws(()=>calculateHouse(house({coffee:1,kimchi:1})));
});
test('Noodles replace all demand, combine with Kimchi and Fry Chefs, and never inherit replaced product milestones',()=>{
 const g=game(),c=configs(g);Object.assign(c[0],{fryChefs:2,cfo:true});Object.assign(c[0].milestones,{burger:true,pizza:true,drink:true});
 const rows=houseRows(c,[house({noodles:3,kimchi:1,type:'garden',park:true})]);assert.equal(calculateSale(rows[0]).total,210);assert.equal(calculateSale(rows[0]).bonus,0);
 assert.throws(()=>calculateHouse(house({noodles:2,burger:1})),/gesamte Bestellung/);
 g.events=[{type:'sale',round:1,rows}];g.reserves=[200,200,200];assert.equal(gameStatistics(g).players[0].goods.noodles.income,90);
});
test('Rural area is optional, has a stable identity, resolves last and cannot receive a garden or park',()=>{
 const g=game();assert.equal(houseOptions(g).at(-1),'rural');assert.equal(houseId('rural'),'rural');assert.ok(houseOrder('rural')>houseOrder(25));assert.equal(houseOptions({...g,modules:{}}).includes('rural'),false);
 assert.equal(calculateHouse(house({number:'rural',noodles:2,kimchi:1})).total,30);
 for(const changes of [{type:'garden'},{park:true}])assert.throws(()=>calculateHouse(house({number:'rural',burger:1,...changes})),/weder Garten noch Park/);
});
test('Ketchup appears with either milestone set only when enabled, and imports reject inactive module data',()=>{
 for(const set of ['base','new']){const g=game();g.milestoneSet=set;g.players.forEach(p=>p.milestones=emptyMilestones(set));g.players[0].milestones.ketchup=true;validateGame(g);assert.ok(milestoneList(g.players[0].milestones,g).some(([k])=>k==='ketchup'));assert.ok(!milestoneList(g.players[0].milestones).some(([k])=>k==='ketchup'));assert.throws(()=>validateGame({...g,modules:{}}));}
 const g=game();g.draft={type:'sale',rows:houseRows(configs(g),[house({noodles:1,kimchi:1})]),houseForm:house({noodles:1,kimchi:1})};validateGame(JSON.parse(JSON.stringify(g)));assert.throws(()=>validateGame({...g,modules:{}}));
});
test('Negative prices, house factors, Kimchi and CFO return cash to the bank; salaries remain separate',()=>{
 const g=game();const first=roundSettlement(g,houseRows(configs(g),[house({burger:10})]),[0,0,0]).candidate;
 const c=configs(g);Object.assign(c[0],{price:-2,cfo:true,waitresses:1});c[0].milestones.price=true;
 const rows=houseRows(c,[house({noodles:2,kimchi:1,type:'garden',park:true,price:-2})]);assert.equal(calculateSale(rows[0]).total,-36);
 const second=roundSettlement(first,rows,[1,0,0]);assert.equal(second.incomes[0],-36);assert.equal(second.balances[0],59);assert.equal(account(second.candidate).bank,91);assert.deepEqual(account(second.candidate).issues,[]);
 const stats=gameStatistics(second.candidate);assert.equal(stats.players[0].goods.noodles.income,-18);assert.deepEqual(stats.players.map(p=>p.balance),account(second.candidate).balances);
 assert.equal(calculateSale({...emptySale(emptyMilestones()),burger:1,price:-1,cfo:true}).cfo,0);
 for(const language of ['de','en']){setLanguage(language);const html=renderStatistics(second.candidate)+renderAwards(second.candidate);assert.doesNotMatch(html,/NaN|Infinity|width:-/);}setLanguage('de');
});
test('Bankrupt chains return only their remaining cash, incur no debt or salary, are excluded later, and recover after historical correction',()=>{
 const g=game(),first=roundSettlement(g,houseRows(configs(g),[house({burger:3})]),[0,0,0]).candidate;
 const loss=houseRows(configs(g),[house({burger:5,price:-10})]);const second=roundSettlement(first,loss,[7,0,0]);const state=account(second.candidate);
 assert.equal(second.incomes[0],-30);assert.equal(state.bankrupt[0],2);assert.equal(state.balances[0],0);assert.equal(state.bank,150);assert.equal(second.expenses[0],0);assert.equal(second.candidate.events[3].rows[0],0);assert.deepEqual(state.issues,[]);
 const stats=gameStatistics(second.candidate);assert.equal(stats.players[0].unpaidLoss,20);assert.equal(stats.players[0].balance,0);
 const illegal=roundSettlement(second.candidate,houseRows(configs(g),[house({burger:1})]),[0,0,0]);assert.ok(illegal.issues.some(s=>s.includes('ausgeschieden')));
 const corrected=roundSettlement(second.candidate,houseRows(configs(g),[]),[0,0,0],2).candidate;assert.equal(account(corrected).bankrupt[0],null);assert.equal(account(corrected).balances[0],30);
});
test('Garden and park corrections retain the new products and recalculate their totals in future rounds',()=>{
 const g=game(),rows=houseRows(configs(g),[house({noodles:2,kimchi:1,type:'garden',park:true})]);
 g.events=[{type:'sale',round:1,rows},{type:'salary',round:1,rows:[0,0,0]}];g.builtGardens=[2];g.builtGardenRounds={2:1};g.builtParks=[2];g.builtParkRounds={2:1};
 const fixed=removeBuiltGarden(g,2,1);assert.equal(fixed.events[0].rows[0].garden,0);assert.equal(calculateSale(fixed.events[0].rows[0]).total,60);
 const plain=removeBuiltPark(fixed,2,1);assert.equal(calculateSale(plain.events[0].rows[0]).total,30);validateGame(plain);
});
