import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyMilestones,emptySale,houseRows,roundSettlement,account,validateGame,bankRemoval,COLORS} from '../rules.js';
import {gameStatistics} from '../statistics.js';
import {renderStatistics} from '../statistics-view.js';

const game=()=>({version:1,milestoneSet:'new',players:['Alex','Kim'].map((name,i)=>({name,color:COLORS[i],milestones:emptyMilestones('new')})),events:[],reserves:null,draft:null});
const row=extra=>({...emptySale(emptyMilestones('new')),...extra});
const milestones=extra=>({...emptyMilestones('new'),...extra});
const rows=(a={},b={})=>houseRows([row(a),row(b)],[]);

test('New milestones use $3 wages, standard tips, optional CFO and separate marketing after salaries',()=>{
  const g=game();
  const sales=[row({burger:2,waitresses:1,cfo:true,demand:4,milestones:milestones({salary:true,marketeer:true})}),row()];
  const result=roundSettlement(g,sales,[2,0]);
  assert.deepEqual(result.incomes,[35,0]);
  assert.deepEqual(result.expenses,[6,0]);
  assert.deepEqual(result.marketing,[20,0]);
  assert.deepEqual(result.balances,[49,0]);
  assert.deepEqual(result.issues,[]);
  assert.equal(account(result.candidate).bank,51);
  const stats=gameStatistics(result.candidate);
  assert.equal(stats.players[0].marketing,20);
  assert.equal(stats.players[0].cfo,12);
  assert.equal(stats.players[0].tips,3);
  assert.equal(stats.players[0].income,55);
  assert.equal(stats.players[0].balance,49);
  assert.deepEqual(stats.rounds[0].players[0],{income:55,wages:6,net:49,balance:49});
  assert.match(renderStatistics(result.candidate),/Marketing/);
  assert.doesNotThrow(()=>validateGame(result.candidate));
});

test('Marketing cannot pay the same round’s salaries; beer remains display only',()=>{
  const result=roundSettlement(game(),rows({demand:10,milestones:milestones({marketeer:true,salary:true,beer:true})}),[1,0]);
  assert.equal(result.expenses[0],3);
  assert.equal(result.marketing[0],50);
  assert.ok(result.issues.some(issue=>issue.includes('Lohn übersteigt')));
  assert.equal(roundSettlement(game(),rows({milestones:milestones({beer:true})}),[1,0]).expenses[0],5);
});

test('Discount bank removal includes every qualifying player, the exact $3 threshold, and zero sales',()=>{
  assert.equal(bankRemoval(row({price:8,milestones:milestones({discount:true})})),0);
  assert.equal(bankRemoval(row({price:7,milestones:milestones({discount:true})})),100);
  assert.equal(bankRemoval(row({price:0})),0);
  const sales=rows({price:7,milestones:milestones({discount:true})},{price:6,milestones:milestones({discount:true})});
  assert.equal(roundSettlement(game(),sales,[0,0]).needsReserve,true);
  const first=roundSettlement(game(),sales,[0,0],null,[100,100]);
  assert.deepEqual(first.removed,[100,100]);
  assert.deepEqual(first.balances,[0,0]);
  assert.equal(account(first.candidate).bank,100);
  const final=roundSettlement(first.candidate,sales,[5,5]);
  assert.equal(final.ended,true);
  assert.deepEqual(final.expenses,[0,0]);
  assert.equal(account(final.candidate).bank,-100);
});

test('Marketing triggers reserve selection but a second break waits until next Dinnertime',()=>{
  const sales=rows({demand:50,milestones:milestones({marketeer:true})});
  assert.equal(roundSettlement(game(),sales,[0,0]).needsReserve,true);
  const first=roundSettlement(game(),sales,[0,0],null,[100,100]);
  assert.equal(account(first.candidate).firstBreak,1);
  assert.equal(first.ended,false);
  assert.equal(account(first.candidate).bank,50);
  sales[0].demand=20;
  const second=roundSettlement(first.candidate,sales,[0,0]);
  assert.equal(second.ended,false);
  assert.equal(account(second.candidate).bank,-50);
  assert.equal(account(second.candidate).secondBreak,null);
  const final=roundSettlement(second.candidate,sales,[100,100]);
  assert.equal(final.ended,true);
  assert.deepEqual(final.marketing,[0,0]);
  assert.deepEqual(final.expenses,[0,0]);
  assert.equal(final.candidate.events.length,5);
  assert.equal(gameStatistics(final.candidate).players[0].marketing,350);
});

test('Ledger corrections recalculate later wages and marketing without changing sale or CFO amounts',()=>{
  const sales=[row({burger:3,cfo:true,demand:2,milestones:milestones({marketeer:true,salary:true})}),row()];
  const first=roundSettlement(game(),sales,[1,0]);
  const second=roundSettlement(first.candidate,rows(),[0,0]);
  sales[0].demand=4;
  sales[0].milestones.salary=false;
  const corrected=roundSettlement(second.candidate,sales,[1,0],0);
  assert.equal(corrected.balances[0],60);
  assert.equal(account(corrected.candidate).balances[0],60);
  assert.equal(gameStatistics(corrected.candidate).players[0].balance,60);
  assert.equal(corrected.incomes[0],45);
});

test('Import validates milestone sets, historical variants and demand-token drafts',()=>{
  const g=game();
  g.draft={type:'sale',rows:rows({demand:2,milestones:milestones({marketeer:true})})};
  assert.doesNotThrow(()=>validateGame(g));
  g.draft.rows[0].demand=-1;
  assert.throws(()=>validateGame(g));
  g.draft=null;
  g.players[0].milestones.burger=true;
  assert.throws(()=>validateGame(g));
  g.players[0].milestones.burger=false;
  g.milestoneSet='bad';
  assert.throws(()=>validateGame(g));
  delete g.milestoneSet;
  assert.throws(()=>validateGame(g));
});
