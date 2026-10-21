import test from 'node:test';
import assert from 'node:assert/strict';
import { gameReport, saleBreakdown } from '../accounting.js';
import {
  COLORS,
  emptyMilestones,
  emptySale,
  houseRows,
  roundSettlement,
  account,
  validateGame,
} from '../rules.js';
import { gameStatistics } from '../statistics.js';
const game = () => ({
  version: 1,
  milestoneSet: 'new',
  modules: { coffee: true, reservePrices: true },
  players: COLORS.slice(0, 2).map((color, i) => ({
    name: 'P' + i,
    color,
    milestones: emptyMilestones('new'),
  })),
  events: [],
  reserves: null,
  draft: null,
});
const rows = (g) => g.players.map((p) => emptySale(p.milestones));
const house = (extra) => ({
  number: '2',
  type: 'normal',
  player: 0,
  price: 10,
  burger: 1,
  pizza: 0,
  beer: 0,
  lemonade: 0,
  soda: 0,
  ...extra,
});

test('Preview, committed report and statistics agree across a reserve change between coffees and dinner', () => {
  let g = game();
  g = roundSettlement(g, houseRows(rows(g), [house({ burger: 9 })]), [0, 0]).candidate;
  const c = rows(g);
  c[0].milestones.marketeer = true;
  c[0].demand = 1;
  const sale = houseRows(c, [
    house({ number: '4', coffeeSequence: [1, 0] }),
    house({ number: '4', player: 1, burger: 0, coffee: 1 }),
    house({ number: '4', burger: 0, coffee: 1 }),
  ]);
  const preview = roundSettlement(g, sale, [1, 0], null, [20, 5]);
  const report = gameReport(preview.candidate),
    last = report.rounds.at(-1),
    stats = gameStatistics(preview.candidate, report);
  assert.deepEqual(
    last.breakdowns.map((c) => c.total),
    preview.incomes,
  );
  assert.deepEqual(last.expenses, preview.expenses);
  assert.deepEqual(last.balances, preview.balances);
  assert.deepEqual(stats.rounds.at(-1).players, last.players);
  assert.deepEqual(
    stats.players.map((p) => p.balance),
    account(preview.candidate).balances,
  );
  assert.deepEqual(
    last.breakdowns.map((c) => c.products.coffee.income),
    [20, 10],
  );
  assert.equal(last.breakdowns[0].products.burger.income, 20);
  assert.equal(last.marketing[0], 5);
  validateGame(preview.candidate);
});
test('Trainer salary caps and historical corrections use exactly the same cash payments everywhere', () => {
  let g = game();
  g.modules = {};
  g = roundSettlement(g, houseRows(rows(g), [house({ price: 7 })]), [0, 0]).candidate;
  const c = rows(g);
  Object.assign(c[0].milestones, { salary: true, trainer: true });
  c[0].salaryDiscounts = { recruiting: 1, hr: 1 };
  const preview = roundSettlement(g, houseRows(c, []), [6, 0]);
  const report = gameReport(preview.candidate);
  assert.equal(report.rounds.at(-1).expenses[0], 7);
  assert.equal(report.rounds.at(-1).salaryDetails[0].shortfall, 1);
  assert.equal(gameStatistics(preview.candidate, report).players[0].wages, 7);
  const fixed = roundSettlement(preview.candidate, preview.candidate.events[2].rows, [3, 0], 2).candidate;
  assert.equal(gameReport(fixed).rounds.at(-1).expenses[0], 0);
  assert.equal(gameStatistics(fixed).players[0].balance, 7);
});
test('Signed product sources plus actual bonuses and unpaid loss reconcile with an insolvent chain', () => {
  let g = game();
  g.modules = {};
  g = roundSettlement(g, houseRows(rows(g), [house({ price: 5 })]), [0, 0]).candidate;
  const c = rows(g);
  c[0].cfo = true;
  const result = roundSettlement(g, houseRows(c, [house({ price: -4 })]), [0, 0]);
  const b = gameReport(result.candidate).rounds.at(-1).breakdowns[0];
  assert.equal(b.cfoBase, -4);
  assert.equal(b.cfo, -2);
  assert.equal(b.unpaidLoss, 1);
  assert.equal(b.total, -5);
  assert.equal(
    Object.values(b.products).reduce((sum, p) => sum + p.income, 0) + b.tips + b.fry + b.cfo + b.unpaidLoss,
    b.total,
  );
});
test('Legacy aggregate garden income remains estimated and uses the same source breakdown', () => {
  const row = { ...emptySale(emptyMilestones()), burger: 1, pizza: 1, garden: 1 };
  row.milestones.burger = true;
  const b = saleBreakdown(row);
  assert.equal(b.estimated, true);
  assert.equal(b.products.burger.income, 20);
  assert.equal(b.products.pizza.income, 15);
  assert.equal(
    Object.values(b.products).reduce((sum, p) => sum + p.income, 0),
    b.total,
  );
});

test('Sparse legacy aggregate rows keep omitted goods at zero instead of producing NaN', () => {
  const row = { burger: 2, price: 10, garden: 0, waitresses: 0, cfo: false, milestones: emptyMilestones() };
  const b = saleBreakdown(row);
  assert.equal(b.total, 20);
  assert.equal(b.bonus, 0);
  assert.equal(b.products.burger.income, 20);
  for (const product of Object.values(b.products)) assert.ok(Number.isFinite(product.income));
});
