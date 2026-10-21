import test from 'node:test';
import assert from 'node:assert/strict';
import { HOUSE_NUMBERS, NATIVE_GARDENS, houseNumber, houseId, houseOptions, isApartment, houseOrder, builtGardenNumbers, gardenKind, builtGardenOrigins, canRemoveBuiltGarden, removeBuiltGarden, gardenKindAtRound } from '../houses.js';
import { COLORS, MILESTONES, emptySale, houseRows, roundSettlement, validateGame, account } from '../rules.js';
import { gameStatistics, gameAwards } from '../statistics.js';

const makeGame = () => ({version:1,players:COLORS.map((color,i)=>({name:'Player '+(i+1),color,milestones:Object.fromEntries(MILESTONES.map(([key])=>[key,false]))})),events:[],reserves:null,draft:null,builtGardens:[]});
const house = extra => ({number:'2',type:'garden',player:0,price:10,burger:1,pizza:0,beer:0,lemonade:0,soda:0,...extra});

test('District and apartment switches independently add the correct house options and ordering',()=>{
  const g=makeGame();
  assert.deepEqual(houseOptions(g),HOUSE_NUMBERS);
  g.modules={newDistricts:true,apartments:false};
  assert.deepEqual(houseOptions(g),[...HOUSE_NUMBERS,21,22,25]);
  assert.equal(gardenKind(g,21),'none');
  assert.equal(gardenKind(g,22),'none');
  assert.equal(gardenKind(g,25),'native');
  g.modules={newDistricts:false,apartments:true};
  assert.equal(houseOptions(g).length,21);
  assert.equal(houseOptions(g).includes(25),false);
  assert.deepEqual(houseOptions(g).slice(2,5),[3,'π',4]);
  assert.deepEqual(houseOptions(g).slice(9,12),[9,'9¾',10]);
  g.modules.newDistricts=true;
  assert.equal(houseOptions(g).length,24);
  assert.equal(houseId('Pi'),'π');
  assert.equal(houseId('House π'),'π');
  assert.equal(houseId('9 3/4'),'9¾');
  assert.equal(isApartment('9¾'),true);
  assert.equal(houseOrder('π')>3&&houseOrder('π')<4,true);
});

test('District gardens retain construction-round correction and house 25 always has a native garden',()=>{
  const g=makeGame();g.modules={newDistricts:true,apartments:true};
  const rows=houseRows(g.players.map(p=>emptySale(p.milestones)),[house({number:'21'}),house({number:'25'})]);
  const next=roundSettlement(g,rows,[0,0,0,0,0,0]).candidate;
  assert.doesNotThrow(()=>validateGame(JSON.parse(JSON.stringify(next))));
  assert.equal(gardenKind(next,21),'built');
  assert.equal(canRemoveBuiltGarden(next,21,1),true);
  assert.equal(canRemoveBuiltGarden(next,25,1),false);
  const corrected=removeBuiltGarden(next,21,1);
  assert.equal(gardenKind(corrected,21),'none');
  assert.equal(account(corrected).balances[0],30);
  assert.equal(gardenKind(corrected,25),'native');
  assert.doesNotThrow(()=>validateGame(corrected));
  g.builtGardens=[21,22];g.builtGardenRounds={21:1,22:1};
  assert.doesNotThrow(()=>validateGame(g));
  g.modules.newDistricts=false;
  assert.throws(()=>validateGame(g));
});

test('Apartments cannot have gardens, remain distinct in statistics and follow house order for first sale',()=>{
  const g=makeGame();g.modules={apartments:true,newDistricts:false};
  const configs=g.players.map(p=>emptySale(p.milestones));
  assert.throws(()=>houseRows(configs,[house({number:'π'})]));
  assert.throws(()=>houseRows(configs,[house({number:'9 3/4'})]));
  const rows=houseRows(configs,[house({number:'4',type:'normal'}),house({number:'π',player:1,type:'normal'}),house({number:'9¾',player:1,type:'normal'})]);
  g.events=[{type:'sale',round:1,rows},{type:'salary',round:1,rows:[0,0,0,0,0,0]},{type:'sale',round:2,rows}];
  assert.doesNotThrow(()=>validateGame(g));
  const stats=gameStatistics(g);
  assert.equal(stats.firstSale.number,'π');
  assert.deepEqual(stats.firstSale.winners,[1]);
  assert.equal(stats.players[1].uniqueHouses,2);
  assert.equal(stats.players[1].gardens,0);
  assert.equal(gameAwards(stats).find(a=>a.title==='Stammkundschaft').value,2);
  g.draft={type:'salary',rows:[0,0,0,0,0,0],completion:{rows,houseForm:house({number:'π'})}};
  assert.throws(()=>validateGame(g));
});

test('Import rejects invalid module settings and preserves old games without module fields',()=>{
  const g=makeGame();
  for (const modules of [null,[],true,{newDistricts:'yes'},{apartments:1},{unknown:true}]) {
    g.modules=modules;assert.throws(()=>validateGame(g));
  }
  delete g.modules;
  assert.doesNotThrow(()=>validateGame(g));
});

test('Exactly 19 numbered houses with the eight specified native gardens', () => {
  assert.deepEqual(HOUSE_NUMBERS,Array.from({length:19},(_,i)=>i+1));
  assert.deepEqual(NATIVE_GARDENS,[1,3,6,9,11,14,17,19]);
  for (const number of HOUSE_NUMBERS) assert.equal(gardenKind(makeGame(),number),NATIVE_GARDENS.includes(number)?'native':'none');
  assert.equal(houseNumber('Haus 7'),7);
  assert.equal(houseNumber('House 19'),19);
  assert.equal(houseNumber('07'),7);
  for (const label of ['House 20','0','Haus Runde Protokoll','2.5','foo7']) assert.equal(houseNumber(label),null);
});

test('Six players have distinct colors, a 300-dollar starting bank, and normal settlement', () => {
  const game=makeGame();
  assert.equal(COLORS.length,6);
  assert.equal(new Set(COLORS).size,6);
  assert.equal(validateGame(game),game);
  assert.equal(account(game).bank,300);
  const rows=houseRows(game.players.map(p=>emptySale(p.milestones)),[house({player:5,type:'normal'})]);
  const settled=roundSettlement(game,rows,[0,0,0,0,0,1]);
  assert.equal(settled.balances[5],5);
  assert.equal(settled.candidate.events[0].rows.length,6);
  assert.equal(account(settled.candidate).bank,295);
  const invalid=makeGame();invalid.players.push({...invalid.players[0],name:'Seventh'});
  assert.throws(()=>validateGame(invalid));
  const duplicate=makeGame();duplicate.players[5].color=duplicate.players[0].color;
  assert.throws(()=>validateGame(duplicate));
});

test('Built gardens persist independently of sales and survive settlement, export/import and undo', () => {
  const game=makeGame();game.builtGardens=[2,12];
  const rows=houseRows(game.players.map(p=>emptySale(p.milestones)),[house()]);
  const next=roundSettlement(game,rows,[0,0,0,0,0,0]).candidate;
  assert.deepEqual(next.builtGardens,[2,12]);
  const imported=validateGame(JSON.parse(JSON.stringify(next)));
  imported.events=[];
  assert.equal(gardenKind(imported,2),'built');
  assert.equal(gardenKind(imported,12),'built');
  assert.equal(gardenKind(makeGame(),2),'none');
});

test('Older house sales and drafts recover built gardens without changing historical entries', () => {
  const game=makeGame();delete game.builtGardens;
  game.events=[{type:'sale',round:1,rows:houseRows(game.players.map(p=>emptySale(p.milestones)),[house({number:'Haus 12'}),house({number:'1'}),house({number:'Old custom label'})])}];
  game.draft={type:'salary',rows:[0,0,0,0,0,0],completion:{rows:houseRows(game.players.map(p=>emptySale(p.milestones)),[house({number:'7'})])}};
  assert.deepEqual(builtGardenNumbers(game),[7,12]);
  assert.equal(gardenKind(game,1),'native');
  assert.equal(game.events[0].rows[0].houses[0].number,'Haus 12');
});

test('Import rejects impossible or duplicate built garden entries and accepts older games', () => {
  for(const value of [null,'2',[1],[20],[2,2],['2']]) {
    const game=makeGame();game.builtGardens=value;
    assert.throws(()=>validateGame(game));
  }
  const legacy=makeGame();delete legacy.builtGardens;legacy.players.pop();
  assert.equal(validateGame(legacy),legacy);
});

test('A built garden can be corrected only in its construction round, including older records', () => {
  const game=makeGame();game.builtGardens=[2];
  const rows=houseRows(game.players.map(p=>emptySale(p.milestones)),[house()]);
  game.events=[{type:'sale',round:1,rows},{type:'salary',round:1,rows:[0,0,0,0,0,0]},
    {type:'sale',round:2,rows:structuredClone(rows)}];
  assert.equal(builtGardenOrigins(game)[2],1);
  assert.equal(canRemoveBuiltGarden(game,2,1),true);
  assert.equal(canRemoveBuiltGarden(game,2,2),false);
  assert.equal(canRemoveBuiltGarden(game,1,1),false);
  assert.throws(()=>removeBuiltGarden(game,2,2));
  assert.throws(()=>removeBuiltGarden(game,1,1));
  const pending=makeGame();pending.builtGardens=[2];pending.builtGardenRounds={2:1};
  assert.equal(canRemoveBuiltGarden(pending,2,1),true);
  pending.builtGardenRounds[2]=3;
  assert.equal(gardenKindAtRound(pending,2,2),'none');
  assert.equal(gardenKindAtRound(pending,2,3),'built');
  assert.equal(gardenKindAtRound(pending,1,1),'native');
});

test('Removing a mistaken garden corrects later sales, garden quantities and CFO without mutating saved history', () => {
  const game=makeGame();game.builtGardens=[2,7];game.builtGardenRounds={2:1,7:1};
  game.players[0].milestones.burger=true;game.players[0].milestones.cfo=true;
  const configs=game.players.map(p=>emptySale(p.milestones));
  const first=houseRows(configs,[house(),house({number:'1',burger:0,pizza:1})]);
  const second=houseRows(configs,[house({burger:2})]);
  game.events=[{type:'sale',round:1,rows:first},{type:'salary',round:1,rows:[0,0,0,0,0,0]},
    {type:'sale',round:2,rows:second},{type:'salary',round:2,rows:[0,0,0,0,0,0]}];
  const original=JSON.stringify(game);
  assert.equal(account(game).balances[0],143);
  const corrected=removeBuiltGarden(game,2,1);
  assert.equal(JSON.stringify(game),original);
  assert.deepEqual(corrected.builtGardens,[7]);
  assert.equal(corrected.builtGardenRounds[2],undefined);
  assert.equal(gardenKind(corrected,2),'none');
  assert.equal(gardenKind(corrected,7),'built');
  assert.equal(corrected.events[0].rows[0].garden,1);
  assert.equal(corrected.events[2].rows[0].garden,0);
  assert.equal(corrected.events[0].rows[0].houses[1].type,'garden');
  assert.equal(account(corrected).balances[0],98);
  assert.equal(validateGame(corrected),corrected);
  const wages=structuredClone(game);wages.events[3].rows[0]=20;
  assert.deepEqual(account(wages).issues,[]);
  assert.equal(account(removeBuiltGarden(wages,2,1)).issues.length,1);
});

test('Garden correction updates an unfinished later round while retaining its other input', () => {
  const game=makeGame();game.builtGardens=[2];game.builtGardenRounds={2:1};
  game.draft={type:'sale',rows:houseRows(game.players.map(p=>emptySale(p.milestones)),[house()]),
    houseForm:house({burger:3}),wages:[1,0,0,0,0,0],removedGardens:[2]};
  const corrected=removeBuiltGarden(game,2,1);
  assert.equal(corrected.draft.rows[0].houses[0].type,'normal');
  assert.equal(corrected.draft.rows[0].garden,0);
  assert.equal(corrected.draft.houseForm.type,'normal');
  assert.equal(corrected.draft.houseForm.burger,3);
  assert.deepEqual(corrected.draft.wages,[1,0,0,0,0,0]);
  assert.equal(validateGame(corrected),corrected);
});

test('Import validates garden construction rounds and correction drafts', () => {
  for(const value of [null,[],{2:0},{1:1},{20:1},{'02':1},{2:'1'}]) {
    const game=makeGame();game.builtGardenRounds=value;
    assert.throws(()=>validateGame(game));
  }
  for(const value of [[1],[20],[2,2],null]) {
    const game=makeGame();game.draft={type:'sale',rows:game.players.map(p=>emptySale(p.milestones)),removedGardens:value};
    assert.throws(()=>validateGame(game));
  }
});
