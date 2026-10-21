import { account, allGoods, calculateSale, houseUnitPrice, mealGoods, productBonus } from './rules.js';
import { houseMultiplier } from './houses.js';

// Display-independent breakdown shared by previews, the ledger and statistics.
// Unpaid negative income remains a separate adjustment, rather than changing
// the agreed product prices in the historical record.
export function saleBreakdown(row, detail = null) {
  const calculated = calculateSale(row);
  const products = Object.fromEntries(allGoods.map(([key]) => [key, { quantity: row[key] ?? 0, income: 0 }]));
  let discount = 0;
  if (Array.isArray(row.houses)) {
    for (const house of row.houses) {
      for (const [key] of allGoods)
        products[key].income += (house[key] ?? 0) * houseUnitPrice(house, key, row.milestones);
      const quantity = mealGoods.reduce((sum, [key]) => sum + (house[key] ?? 0), 0) + (house.coffee ?? 0);
      discount +=
        quantity *
        Math.max(
          0,
          (house.basePrice ?? row.basePrice ?? 10) - (house.price - (row.milestones.price ? 1 : 0)),
        ) *
        houseMultiplier(house);
    }
  } else {
    for (const [key] of mealGoods) {
      products[key].income =
        (calculated.quantity ? (calculated.revenue * (row[key] ?? 0)) / calculated.quantity : 0) +
        (row[key] ?? 0) * productBonus(key, row.milestones);
    }
    products.coffee.income = calculated.coffeeRevenue;
    discount =
      (calculated.quantity + row.garden + calculated.coffee + (row.coffeeGarden ?? 0)) *
      Math.max(0, (row.basePrice ?? 10) - calculated.price);
  }
  const tips = detail?.tips ?? calculated.tips;
  const fry = detail?.fry ?? calculated.fry;
  const cfo = detail?.cfo ?? calculated.cfo;
  const total = detail?.paid ?? calculated.total;
  return {
    ...calculated,
    tips,
    fry,
    cfo,
    total,
    products,
    discount,
    cfoBase: detail?.cfoBase ?? calculated.total - calculated.cfo,
    unpaidLoss: detail?.unpaid ?? 0,
    estimated:
      !Array.isArray(row.houses) &&
      row.garden > 0 &&
      mealGoods.filter(([key]) => (row[key] ?? 0) > 0).length > 1,
  };
}

// Sum actual engine payments once. Consumers never independently calculate
// salaries, marketing income, insolvency adjustments or round balances.
export function gameReport(input, ledger = account(input)) {
  const game = {
    ...input,
    events: input.events.map((event, index) =>
      event.type === 'sale' ? { ...event, rows: ledger.saleRows[index] } : event,
    ),
  };
  const balances = game.players.map(() => 0);
  const rounds = [];
  for (let index = 0; index < game.events.length; index++) {
    const sale = game.events[index];
    if (sale.type !== 'sale' || !ledger.salePayments[index]) continue;
    const salary = game.events[index + 1]?.type === 'salary' ? game.events[index + 1] : null;
    const marketing = game.players.map((_, i) => ledger.marketingPayments[index + 1]?.[i] ?? 0);
    const expenses = game.players.map((_, i) => ledger.salaryPayments[index + 1]?.[i] ?? 0);
    const incomes = ledger.salePayments[index].map((income, i) => income + marketing[i]);
    const players = incomes.map((income, i) => {
      const wages = expenses[i],
        net = income - wages;
      balances[i] += net;
      return { income, wages, net, balance: balances[i] };
    });
    const dates = [sale.updatedAt, salary?.updatedAt, salary?.createdAt, sale.createdAt]
      .map((value) => new Date(value))
      .filter((date) => Number.isFinite(date.getTime()));
    rounds.push({
      number: sale.round,
      sale,
      salary,
      index,
      players,
      incomes,
      expenses,
      marketing,
      balances: [...balances],
      bankrupt: ledger.bankrupt,
      details: ledger.saleDetails[index],
      breakdowns: sale.rows.map((row, i) => saleBreakdown(row, ledger.saleDetails[index][i])),
      salaryDetails: ledger.salaryDetails[index + 1],
      breakAt: ledger.firstBreakAt,
      date: dates.sort((a, b) => b - a)[0],
      ended: ledger.secondBreak === index,
      reserve: ledger.firstBreak === index || Boolean(salary && ledger.firstBreak === index + 1),
    });
  }
  return { game, ledger, rounds };
}
