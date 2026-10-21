import test from 'node:test';
import assert from 'node:assert/strict';
import { readGame, writeGame, parseGame, serializeGame, captureDraft, GAME_KEY } from '../storage.js';
import { emptyMilestones, emptySale, COLORS } from '../rules.js';

const game = () => ({
  version: 1,
  players: COLORS.slice(0, 2).map((color, i) => ({ name: 'P' + i, color, milestones: emptyMilestones() })),
  events: [],
  reserves: null,
  draft: null,
});
const memory = (raw) => {
  const values = new Map(raw === undefined ? [] : [[GAME_KEY, raw]]);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('Storage round-trips the existing schema and never overwrites unreadable data', () => {
  const store = memory(),
    original = game();
  writeGame(original, store);
  assert.deepEqual(readGame(store), { game: original, warning: null });
  assert.deepEqual(parseGame(serializeGame(original)), original);
  const corrupted = memory('{broken');
  assert.equal(readGame(corrupted).game, null);
  assert.ok(readGame(corrupted).warning);
  assert.equal(corrupted.getItem(GAME_KEY), '{broken');
  assert.ok(readGame(undefined).warning);
});
test('An invalid draft is discarded while confirmed game data survives unchanged', () => {
  const original = game();
  original.draft = { type: 'sale', rows: [] };
  const store = memory(JSON.stringify(original));
  const loaded = readGame(store);
  assert.equal(loaded.game.draft, null);
  assert.ok(loaded.warning);
  assert.deepEqual(loaded.game.players, original.players);
  assert.equal(store.getItem(GAME_KEY), JSON.stringify(original));
});
test('Draft capture copies editable inputs but never persists a historical correction before confirmation', () => {
  const original = game(),
    row = emptySale(emptyMilestones());
  const editor = {
    index: null,
    type: 'sale',
    wizard: true,
    rows: [row, row],
    houseForm: { number: '2', burger: 1 },
    step: 'houses',
    editingHouse: null,
    returnToSummary: false,
    wages: [0, 0],
    reserves: null,
    wagesReviewed: false,
    removedGardens: [],
    removedParks: [],
  };
  assert.equal(captureDraft(original, editor), true);
  editor.rows[0].burger = 99;
  editor.houseForm.number = '4';
  assert.equal(original.draft.rows[0].burger, 0);
  assert.equal(original.draft.houseForm.number, '2');
  const saved = structuredClone(original.draft);
  assert.equal(captureDraft(original, { ...editor, index: 0 }), false);
  assert.deepEqual(original.draft, saved);
});
test('Storage write errors propagate to the UI boundary instead of reporting a successful save', () => {
  assert.throws(
    () =>
      writeGame(game(), {
        setItem() {
          throw Error('quota');
        },
      }),
    /quota/,
  );
});
