import test from 'node:test';
import assert from 'node:assert/strict';
import {emptySale,emptyMilestones,houseRows,houseSettlement,replayGame,account,calculateSale,calculateHouse,roundSettlement,validateGame,COLORS} from '../rules.js';
import {gameStatistics} from '../statistics.js';
const game=(modules={reservePrices:true})=>({version:1,modules,players:COLORS.slice(0,2).map((color,i)=>({name:'P'+i,color,milestones:emptyMilestones()})),events:[],reserves:null,draft:null});
const configs=g=>g.players.map(p=>emptySale(p.milestones));
const house=extra=>({number:'2',player:0,type:'normal',price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,coffee:0,...extra});
test('The live house preview stops at the first bank break and reprices only subsequent houses in board order',()=>{
 const g=game(),rows=houseRows(configs(g),[house({number:'4',player:1,pizza:1}),house({burger:10})]);
 const pending=houseSettlement(g,rows);assert.equal(pending.needsReserve,true);assert.equal(pending.firstBreakAt.house,'2');assert.deepEqual(pending.salePayments[0],[100,0]);
 const paid=houseSettlement(g,rows,null,[20,5]);assert.equal(paid.needsReserve,false);assert.equal(paid.rows[0].houses[0].price,10);assert.equal(paid.rows[1].houses[0].price,20);assert.equal(paid.rows[1].houses[0].basePrice,20);assert.deepEqual(paid.balances,[100,20]);assert.equal(paid.bank,380);assert.equal(rows[1].houses[0].price,10);
});
test('A bank break splits coffee at the correct cup, before the meal of the same house',()=>{
 const g=game({reservePrices:true,coffee:true});const rows=houseRows(configs(g),[house({burger:1}),house({player:1,coffee:11})]);
 const preview=houseSettlement(g,rows,null,[20,5]);assert.equal(preview.firstBreakAt.phase,'coffee');assert.equal(preview.firstBreakAt.house,'2');assert.deepEqual(preview.balances,[20,120]);assert.deepEqual(preview.rows[1].houses.map(h=>[h.coffee,h.price]),[[10,10],[1,20]]);
 const next=roundSettlement(g,rows,[0,0],null,[20,5]).candidate;assert.deepEqual(replayGame(next).game,next);validateGame(next);
});
test('Explicit coffee-route order controls who is paid before and after the reserve change and survives replay',()=>{
 const g=game({reservePrices:true,coffee:true});const first=roundSettlement(g,houseRows(configs(g),[house({burger:9})]),[0,0],null,[20,5]).candidate;
 const make=sequence=>houseRows(configs(g),[house({number:'4',burger:1,coffeeSequence:sequence}),house({number:'4',coffee:1}),house({number:'4',player:1,coffee:1})]);
 const a=roundSettlement(first,make([0,1]),[0,0]);const b=roundSettlement(first,make([1,0]),[0,0]);assert.deepEqual(a.balances,[120,20]);assert.deepEqual(b.balances,[130,10]);assert.deepEqual(account(validateGame(JSON.parse(JSON.stringify(b.candidate)))).balances,[130,10]);
 assert.throws(()=>make([0,0]),/Reihenfolge/);
});
test('A later house, Waitresses and CFO cannot fund an earlier unaffordable negative sale',()=>{
 const g=game({}),first=roundSettlement(g,houseRows(configs(g),[house({burger:1})]),[0,0]).candidate;
 const c=configs(g);c[0].waitresses=100;c[0].cfo=true;
 const rows=houseRows(c,[house({number:'4',burger:10}),house({number:'2',price:-20,burger:1}),house({number:'5',player:1,burger:2})]);
 const state=houseSettlement(first,rows);assert.equal(state.bankrupt[0],2);assert.equal(state.balances[0],0);assert.ok(state.issues.some(s=>s.includes('4')));
 const settled=roundSettlement(first,rows,[0,0]);assert.deepEqual(settled.incomes,[-10,20]);assert.equal(settled.details[0].tips,0);assert.equal(settled.details[0].cfo,0);assert.ok(settled.issues.length>0);
});
test('Negative CFO is paid only after houses and tips, and insolvency returns only remaining cash',()=>{
 const g=game({}),c=configs(g);c[0].milestones.waitress=true;c[0].waitresses=1;
 const first=roundSettlement(g,houseRows(c,[]),[0,0]).candidate;
 const next=configs(g);next[0].cfo=true;
 const settled=roundSettlement(first,houseRows(next,[house({price:-4,burger:1})]),[0,0]);assert.equal(settled.afterSales.bankrupt[0],2);assert.equal(settled.details[0].cfo,-2);assert.equal(settled.details[0].unpaid,1);assert.equal(settled.incomes[0],-5);assert.equal(settled.balances[0],0);
 assert.deepEqual(gameStatistics(settled.candidate).players.map(p=>p.balance),account(settled.candidate).balances);
});
test('House preview excludes later Waitress/CFO payments, and the second bank break stays final despite later returns',()=>{
 const g=game({}),c=configs(g);c[0].waitresses=40;const rows=houseRows(c,[]);
 assert.equal(houseSettlement(g,rows).needsReserve,false);assert.equal(roundSettlement(g,rows,[0,0]).afterSales.firstBreakAt.phase,'waitresses');
 const final=roundSettlement(g,houseRows(configs(g),[house({burger:30}),house({number:'4',price:-10,burger:1})]),[10,10],null,[100,100]);assert.equal(final.ended,true);assert.equal(final.afterSales.secondBreakAt.house,'2');assert.equal(final.afterSales.bank,10);assert.deepEqual(final.expenses,[0,0]);
});
test('Discount removal can open reserves before the first house, applying the new price immediately',()=>{
 const g=game();g.milestoneSet='new';g.players.forEach(p=>p.milestones=emptyMilestones('new'));const c=configs(g);c[0].milestones.discount=true;c[0].price=7;
 const result=houseSettlement(g,houseRows(c,[house({price:7,burger:1})]),null,[20,5]);assert.equal(result.firstBreakAt.phase,'restructuring');assert.equal(result.rows[0].houses[0].price,17);assert.equal(result.bank,383);
});
test('Sushi is a separate garden-only product without substituted-product bonuses, including Kimchi, CFO and statistics',()=>{
 const g=game({sushi:true,kimchi:true,fryChef:true}),c=configs(g);Object.assign(c[0],{cfo:true,fryChefs:1});Object.assign(c[0].milestones,{burger:true,pizza:true,drink:true});
 const rows=houseRows(c,[house({number:'3',type:'garden',sushi:2,kimchi:1})]);assert.equal(calculateSale(rows[0]).total,105);assert.equal(calculateSale(rows[0]).bonus,0);
 const result=roundSettlement(g,rows,[0,0],null,[100,100]);const stats=gameStatistics(result.candidate);assert.equal(stats.players[0].goods.sushi.income,40);assert.equal(stats.players[0].goods.kimchi.income,20);validateGame(result.candidate);
 assert.throws(()=>calculateHouse(house({sushi:1,park:true})),/Garten/);assert.throws(()=>calculateHouse(house({type:'garden',sushi:1,burger:1})),/gesamte Bestellung/);assert.throws(()=>calculateHouse(house({type:'garden',sushi:1,noodles:1})),/gesamte Bestellung/);assert.throws(()=>validateGame({...result.candidate,modules:{kimchi:true,fryChef:true}}));
});
test('Historical changes replay the bank-break boundary inside the round without drifting stored price adjustments',()=>{
 const g=game();const rows=houseRows(configs(g),[house({burger:8}),house({number:'4',player:1,burger:2}),house({number:'5',player:1,pizza:1})]);
 const original=roundSettlement(g,rows,[0,0],null,[20,5]);assert.deepEqual(original.incomes,[80,40]);
 const changed=structuredClone(original.candidate.events[0].rows);changed[0].burger=1;changed[0].houses[0].burger=1;
 const fixed=roundSettlement(original.candidate,changed,[0,0],0);assert.deepEqual(fixed.incomes,[10,30]);assert.equal(account(fixed.candidate).firstBreak,null);assert.equal(fixed.candidate.events[0].rows[1].houses[1].price,10);assert.deepEqual(replayGame(fixed.candidate).game,fixed.candidate);assert.deepEqual(gameStatistics(fixed.candidate).players.map(p=>p.balance),fixed.balances);
});
