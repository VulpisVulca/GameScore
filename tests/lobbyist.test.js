import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMilestones,emptySale,houseRows,calculateSale,calculateHouse,COLORS,validateGame,account} from '../rules.js';
import {addBuiltPark,removeBuiltPark,canRemoveBuiltPark,parkAtRound,builtParkHouses,removeBuiltGarden} from '../houses.js';
import {gameStatistics} from '../statistics.js';
const game=()=>({version:1,modules:{lobbyist:true,coffee:true,fryChef:true,apartments:true},players:COLORS.slice(0,3).map((color,i)=>({name:'P'+i,color,milestones:emptyMilestones()})),events:[],reserves:[300,300,300],draft:null});
const house=extra=>({number:'2',type:'normal',park:false,player:0,price:10,burger:0,pizza:0,beer:0,lemonade:0,soda:0,coffee:0,...extra});
const rows=g=>g.players.map(p=>emptySale(p.milestones));
test('Parks add one base-price multiplier, combine with gardens, support apartments and coffee, and leave bonuses unchanged',()=>{
 const g=game(),c=rows(g);Object.assign(c[0],{fryChefs:1,cfo:true,waitresses:1});c[0].milestones.burger=true;c[1].cfo=true;
 const r=houseRows(c,[house({type:'garden',park:true,burger:2}),house({type:'garden',park:true,player:1,coffee:2})]);
 assert.equal(calculateSale(r[0]).total,125);assert.equal(calculateSale(r[0]).fry,10);assert.equal(calculateSale(r[1]).total,90);
 assert.equal(calculateHouse(house({number:'π',park:true,pizza:3})).revenue,60);
 assert.equal(calculateHouse(house({number:'1',type:'garden',park:true,beer:1}),{drink:true}).total,35);
 assert.equal(calculateHouse(house({park:true,soda:1,price:8}),{price:true}).total,14);
});
test('Park construction persists and corrections replay all later meal and coffee sales, CFO and statistics without changing gardens',()=>{
 let g=game();const c=rows(g);Object.assign(c[0],{fryChefs:1,cfo:true,waitresses:1});c[0].milestones.burger=true;c[1].cfo=true;
 const r=houseRows(c,[house({type:'garden',park:true,burger:2}),house({type:'garden',park:true,player:1,coffee:2})]);
 g.events=[{type:'sale',round:1,rows:r},{type:'salary',round:1,rows:[1,0,0]},{type:'sale',round:2,rows:structuredClone(r)},{type:'salary',round:2,rows:[1,0,0]}];g.builtParks=[2];g.builtParkRounds={2:1};g.builtGardens=[2];g.builtGardenRounds={2:1};
 validateGame(g);assert.deepEqual(builtParkHouses(g),[2]);assert.equal(canRemoveBuiltPark(g,2,1),true);assert.equal(canRemoveBuiltPark(g,2,2),false);assert.throws(()=>removeBuiltPark(g,2,2));
 const fixed=removeBuiltPark(g,2,1);validateGame(fixed);assert.equal(fixed.events[2].rows[0].houses[0].type,'garden');assert.equal(fixed.events[2].rows[1].houses[0].park,false);assert.equal(calculateSale(fixed.events[2].rows[0]).total,95);assert.equal(calculateSale(fixed.events[2].rows[1]).total,60);
 assert.equal(gameStatistics(fixed).players[0].goods.burger.income,100);assert.deepEqual(gameStatistics(fixed).players.map(p=>p.balance),account(fixed).balances);
 assert.equal(g.events[0].rows[0].houses[0].park,true);
 const onlyPark=removeBuiltGarden(g,2,1);assert.equal(calculateSale(onlyPark.events[2].rows[0]).total,95);assert.equal(onlyPark.events[2].rows[0].houses[0].park,true);
 const restored=addBuiltPark(fixed,2,1);assert.deepEqual(account(restored).balances,account(g).balances);
});
test('Parks retain apartment identity, respect construction rounds and update drafts without booking money',()=>{
 let g=game();g=addBuiltPark(g,'π',2);assert.equal(parkAtRound(g,'π',1),false);assert.equal(parkAtRound(g,'π',2),true);assert.equal(parkAtRound(g,'9¾',2),false);
 g.builtParkRounds={'π':1};g.draft={type:'sale',rows:houseRows(rows(g),[house({number:'π',park:true,burger:1})]),houseForm:house({number:'π',park:true})};validateGame(JSON.parse(JSON.stringify(g)));
 const fixed=removeBuiltPark(g,'π',1);assert.equal(fixed.draft.houseForm.park,false);assert.equal(fixed.draft.rows[0].houses[0].park,false);assert.equal(account(fixed).balances[0],0);
});
test('Import validates park metadata and flags, disabled modules, coffee consistency and older saves',()=>{
 const g=game();g.events=[{type:'sale',round:1,rows:houseRows(rows(g),[house({park:true,pizza:1})])}];validateGame(g);
 assert.throws(()=>validateGame({...g,modules:{...g.modules,lobbyist:false}}),/Lobbyist/);
 for(const value of [null,[2,2],[20],['2']])assert.throws(()=>validateGame({...g,builtParks:value}));
 for(const value of [null,{'20':1},{'2':0},{'2':1.2}])assert.throws(()=>validateGame({...g,builtParkRounds:value}));
 assert.throws(()=>calculateHouse(house({burger:1,park:1})),/Parkstatus/);
 assert.throws(()=>houseRows(rows(g),[house({park:true,burger:1}),house({player:1,coffee:1})]));
 const old=game();delete old.modules;validateGame(old);assert.equal(parkAtRound(old,2,1),false);
});
