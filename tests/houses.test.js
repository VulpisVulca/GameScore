import test from 'node:test';
import assert from 'node:assert/strict';
import { HOUSE_NUMBERS, NATIVE_GARDENS, houseNumber, builtGardenNumbers, gardenKind } from '../houses.js';
import { COLORS, MILESTONES, emptySale, houseRows, roundSettlement, validateGame, account } from '../rules.js';

const makeGame = () => ({version:1,players:COLORS.map((color,i)=>({name:'Player '+(i+1),color,milestones:Object.fromEntries(MILESTONES.map(([key])=>[key,false]))})),events:[],reserves:null,draft:null,builtGardens:[]});
const house = extra => ({number:'2',type:'garden',player:0,price:10,burger:1,pizza:0,beer:0,lemonade:0,soda:0,...extra});

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
