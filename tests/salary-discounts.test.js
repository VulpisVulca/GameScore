import test from 'node:test';
import assert from 'node:assert/strict';
import {COLORS,emptyMilestones,emptySale,houseRows,salaryPayment,roundSettlement,account,validateGame,milestoneList} from '../rules.js';
import {gameStatistics} from '../statistics.js';
const game=()=>({version:1,milestoneSet:'new',players:COLORS.slice(0,2).map((color,i)=>({name:'P'+i,color,milestones:emptyMilestones('new')})),events:[],reserves:null,draft:null});
const rows=g=>g.players.map(p=>emptySale(p.milestones));
const earned=(g,amount)=>roundSettlement(g,houseRows(rows(g),[{number:'2',type:'normal',player:0,price:amount,burger:1,pizza:0,beer:0,lemonade:0,soda:0}]),[0,0]).candidate;

test('Unused recruiting actions each deduct five dollars even with three-dollar salaries, capped at zero',()=>{
  const row=emptySale({...emptyMilestones('new'),salary:true});row.salaryDiscounts={recruiting:1,hr:0};
  assert.deepEqual(salaryPayment(row,2),{gross:6,discount:5,due:1,paid:1,shortfall:0});
  row.salaryDiscounts.hr=2;assert.equal(salaryPayment(row,6).paid,3);assert.equal(salaryPayment(row,1).paid,0);
});
test('Trainer protection pays only available cash without debt, and marketing still follows salary payment',()=>{
  const g=earned(game(),7),c=rows(g);Object.assign(c[0].milestones,{trainer:true,marketeer:true});c[0].demand=2;
  const result=roundSettlement(g,houseRows(c,[]),[2,0]);assert.deepEqual(result.expenses,[7,0]);assert.deepEqual(result.balances,[10,0]);
  assert.equal(result.afterSales.bankrupt[0],null);assert.deepEqual(result.issues,[]);assert.equal(result.candidate.events[3].rows[0],2);
  const state=account(result.candidate);assert.equal(state.salaryPayments[3][0],7);assert.equal(state.bank,90);
  assert.equal(gameStatistics(result.candidate).players[0].wages,7);validateGame(result.candidate);
  c[0].milestones.trainer=false;assert.ok(roundSettlement(g,houseRows(c,[]),[2,0]).issues.length);
});
test('Discount inputs survive drafts, export/import, and historical corrections recalculate actual salary and statistics',()=>{
  const g=earned(game(),30),c=rows(g);c[0].milestones.salary=true;c[0].salaryDiscounts={recruiting:1,hr:0};
  const first=roundSettlement(g,houseRows(c,[]),[2,0]).candidate;assert.equal(account(first).balances[0],29);
  const edit=structuredClone(first.events[2].rows);edit[0].salaryDiscounts.recruiting=0;
  const fixed=roundSettlement(first,edit,[2,0],2).candidate;assert.equal(account(fixed).balances[0],24);assert.equal(gameStatistics(fixed).players[0].wages,6);
  fixed.draft={type:'sale',rows:c,wages:[2,0]};const restored=validateGame(JSON.parse(JSON.stringify(fixed)));assert.equal(restored.draft.rows[0].salaryDiscounts.recruiting,1);
  for(const bad of [-1,1.5]){const invalid=structuredClone(fixed);invalid.draft.rows[0].salaryDiscounts.hr=bad;assert.throws(()=>validateGame(invalid));}
});
test('Trainer protection and discounts never cause salaries in the final round',()=>{
  const g=game(),c=rows(g);Object.assign(c[0].milestones,{trainer:true,salary:true});c[0].salaryDiscounts={recruiting:1,hr:1};c[0].burger=40;
  const result=roundSettlement(g,c,[100,100],null,[100,100]);assert.equal(result.ended,true);assert.deepEqual(result.expenses,[0,0]);assert.equal(result.candidate.events.length,1);
});
test('Old new-milestone saves without the Trainer flag remain valid, while the flag is restricted to the new set',()=>{
  const g=game();g.players.forEach(p=>delete p.milestones.trainer);assert.doesNotThrow(()=>validateGame(g));
  assert.ok(milestoneList(emptyMilestones('new'),g).some(([key])=>key==='trainer'));
  const base={...g,milestoneSet:'base',players:g.players.map(p=>({...p,milestones:emptyMilestones()}))};base.players[0].milestones.trainer=true;assert.throws(()=>validateGame(base));
});
