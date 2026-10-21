import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySale,emptyMilestones,houseRows,calculateSale,roundSettlement,account,validateGame,COLORS,reserveOptions,reserveAmount,reserveBasePrice,applyReservePrices,bankRemoval} from '../rules.js';
import {gameStatistics} from '../statistics.js';
const game=()=>({version:1,modules:{reservePrices:true,coffee:true,lobbyist:true,fryChef:true},players:COLORS.slice(0,2).map((color,i)=>({name:'P'+i,color,milestones:emptyMilestones()})),events:[],reserves:null,draft:null});
const configs=g=>g.players.map(p=>emptySale(p.milestones));
const house=extra=>({number:'2',type:'normal',player:0,price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,coffee:0,...extra});
const burst=g=>houseRows(configs(g),[house({burger:10})]);
test('Reserve-price cards use plurality, every tie rule, and a fixed 200 dollars per player',()=>{
 assert.equal(reserveBasePrice([5,5,20]),5);assert.equal(reserveBasePrice([10,10,5]),10);assert.equal(reserveBasePrice([20,20,10]),20);
 for(const values of [[5,10],[5,20],[10,20],[5,10,20],[5,5,10,10],[5,5,20,20],[5,5,10,10,20,20]])assert.equal(reserveBasePrice(values),values.includes(20)?20:5);
 assert.equal(reserveBasePrice([5,0]),null);assert.equal(reserveBasePrice([]),null);
 const g=game();assert.deepEqual(reserveOptions(g),[5,10,20]);assert.equal(reserveAmount(g,[5,20]),400);assert.deepEqual(reserveOptions({...g,modules:{}}),[100,200,300]);assert.equal(reserveAmount({...g,modules:{}},[100,300]),400);
});
test('The breaking dinner retains its prices; later rounds preserve adjustments, gardens, parks, coffee, Fry Chefs and CFO',()=>{
 const g=game();const first=roundSettlement(g,burst(g),[0,0],null,[5,20]);assert.equal(first.incomes[0],100);assert.equal(first.afterSales.bank,400);assert.equal(first.afterSales.basePrice,20);
 const c=configs(g);Object.assign(c[0],{price:7,cfo:true,waitresses:1,fryChefs:1});c[0].milestones.price=true;c[0].milestones.burger=true;
 const nextRows=houseRows(c,[house({burger:1,price:7,type:'garden',park:true}),house({player:1,coffee:1,price:8,type:'garden',park:true})]);
 const next=roundSettlement(first.candidate,nextRows,[0,0]);assert.deepEqual(next.incomes,[99,54]);assert.deepEqual(next.balances,[199,54]);assert.equal(account(next.candidate).bank,247);
 assert.equal(next.candidate.events[2].rows[0].price,17);assert.equal(next.candidate.events[2].rows[0].houses[0].price,17);assert.equal(next.candidate.events[2].rows[0].basePrice,20);
 assert.deepEqual(applyReservePrices(next.candidate),next.candidate);assert.equal(gameStatistics(next.candidate).players[1].goods.coffee.income,54);
 const final=roundSettlement(next.candidate,houseRows(configs(g),[house({burger:100})]),[99,99]);assert.equal(final.ended,true);assert.deepEqual(final.expenses,[0,0]);
});
test('A historical correction moves the first bank break and rebases all later sales, statistics and drafts once',()=>{
 const g=game(),first=roundSettlement(g,burst(g),[0,0],null,[5,20]);
 const next=roundSettlement(first.candidate,houseRows(configs(g),[house({burger:1})]),[0,0]).candidate;
 next.draft={type:'sale',rows:configs(next).map(row=>({...row,price:18,basePrice:20})),houseForm:house({price:18,player:0})};
 const fixed=roundSettlement(next,houseRows(configs(g),[house({burger:1})]),[0,0],0).candidate;
 assert.equal(account(fixed).firstBreak,null);assert.equal(account(fixed).basePrice,10);assert.equal(fixed.events[2].rows[0].price,10);assert.equal(fixed.draft.rows[0].price,8);assert.equal(fixed.draft.houseForm.price,8);
 assert.deepEqual(gameStatistics(fixed).players.map(p=>p.balance),account(fixed).balances);assert.equal(account(fixed).balances[0],20);
 assert.deepEqual(validateGame(JSON.parse(JSON.stringify(fixed))),fixed);
});
test('A marketing bank break activates the new price for the following dinner; discount thresholds follow the base price',()=>{
 const g=game();g.milestoneSet='new';g.players.forEach(p=>p.milestones=emptyMilestones('new'));
 const rows=configs(g);rows[0].milestones.marketeer=true;rows[0].demand=20;
 const result=roundSettlement(g,rows,[0,0],null,[5,5]);assert.equal(account(result.candidate).firstBreak,1);assert.equal(account(result.candidate).basePrice,5);assert.equal(account(result.candidate).bank,400);
 assert.equal(bankRemoval({...emptySale({discount:true},5),price:2}),100);assert.equal(bankRemoval({...emptySale({discount:true},5),price:3}),0);assert.equal(bankRemoval({...emptySale({discount:true},20),price:17}),100);assert.equal(bankRemoval({...emptySale({discount:true},20),price:18}),0);
 const next=roundSettlement(result.candidate,houseRows(configs(g),[house({burger:1})]),[0,0]);assert.equal(next.incomes[0],5);
});
test('Imports and reserve drafts enforce the selected module while ordinary games retain cash reserve cards',()=>{
 const g=game();g.reserves=[5,20];validateGame(g);assert.throws(()=>validateGame({...g,reserves:[100,200]}));
 g.draft={type:'sale',rows:configs(g),reserves:[10,5]};validateGame(g);assert.throws(()=>validateGame({...g,draft:{...g.draft,reserves:[100,200]}}));
 assert.throws(()=>roundSettlement(g,burst(g),[0,0],null,[100,200]));
 const ordinary={...game(),modules:{},reserves:[100,200]};validateGame(ordinary);assert.throws(()=>validateGame({...ordinary,reserves:[5,20]}));
});

