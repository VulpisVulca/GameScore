import { t, html } from './i18n.js';
import {
  houseOptions,
  houseId,
  isNativeGarden,
  isApartment,
  isRural,
  houseOrder,
  houseMultiplier,
} from './houses.js';
export const GOODS = [
  ['burger', 'Burger', '🍔'],
  ['pizza', 'Pizza', '🍕'],
  ['beer', 'Bier · braun', '🟤'],
  ['lemonade', 'Limonade · gelb', '🟡'],
  ['soda', 'Softdrinks · rot', '🔴'],
];
export const COFFEE = ['coffee', 'Kaffee', '☕'];
export const NOODLES = ['noodles', 'Nudeln', '🍜'];
export const SUSHI = ['sushi', 'Sushi', '🍣'];
export const KIMCHI = ['kimchi', 'Kimchi', '🥬'];
export const mealGoods = [...GOODS, NOODLES, SUSHI, KIMCHI];
export const allGoods = [...mealGoods, COFFEE];
export const goodsForGame = (game) => [
  ...GOODS,
  ...(game.modules?.noodles ? [NOODLES] : []),
  ...(game.modules?.sushi ? [SUSHI] : []),
  ...(game.modules?.kimchi ? [KIMCHI] : []),
  ...(game.modules?.coffee ? [COFFEE] : []),
];
export function unitPrice(value) {
  if (!Number.isSafeInteger(value) || value < -100 || value > 100)
    throw new Error(t('Bitte einen ganzzahligen Preis zwischen −100 und 100 eingeben.'));
  return value;
}
export const isCoffeeSale = (house) => (house.coffee ?? 0) > 0;
export const sameHouse = (a, b) => (houseId(a) ?? String(a).trim()) === (houseId(b) ?? String(b).trim());
export function validateCoffeeSales(rows) {
  if (rows.some((row) => (row.coffee ?? 0) > 0 && !Array.isArray(row.houses)))
    throw new Error(t('Kaffee benötigt erfasste Hausverkäufe.'));
  const houses = rows.flatMap((row) => row.houses || []);
  for (const house of houses.filter((h) => !isCoffeeSale(h) && h.coffeeSequence !== undefined)) {
    const sequence = house.coffeeSequence;
    if (
      !Array.isArray(sequence) ||
      sequence.length > 200 ||
      sequence.some((i) => !Number.isSafeInteger(i) || i < 0 || i >= rows.length)
    )
      throw new Error(t('Ungültige Kaffee-Reihenfolge.'));
    for (let i = 0; i < rows.length; i++)
      if (
        sequence.filter((player) => player === i).length !==
        houses
          .filter((h) => isCoffeeSale(h) && h.player === i && sameHouse(h.number, house.number))
          .reduce((n, h) => n + h.coffee, 0)
      )
        throw new Error(t('Kaffee-Reihenfolge und Mengen stimmen nicht überein.'));
  }
  for (const house of houses.filter(isCoffeeSale)) {
    const meals = houses.filter((other) => !isCoffeeSale(other) && sameHouse(other.number, house.number));
    if (!meals.length) throw new Error(t('Kaffee benötigt einen erfassten Essensverkauf für dieses Haus.'));
    if (meals.some((meal) => meal.type !== house.type || Boolean(meal.park) !== Boolean(house.park)))
      throw new Error(t('Kaffee und Essen müssen denselben Garten- und Parkstatus haben.'));
  }
}
export const MILESTONES = [
  ['burger', 'Erster Burger vermarktet', '+5 $ je Burger'],
  ['pizza', 'Erste Pizza vermarktet', '+5 $ je Pizza'],
  ['drink', 'Erstes Getränk vermarktet', '+5 $ je Getränk'],
  ['waitress', 'Erste Bedienung eingesetzt', '5 $ statt 3 $ je Bedienung'],
  ['price', 'Als Erster Preise gesenkt', '−1 $ auf den Stückpreis'],
  ['cfo', 'Als Erster 100 $ erreicht', 'CFO immer aktiv · ab nächster Runde'],
];
export const NEW_MILESTONES = [
  ['marketeer', 'Erster Marketeer eingesetzt', '5 $ je Nachfragemarker · Entfernung −2'],
  ['salary', 'Erste Bedienung eingesetzt', '3 $ Lohn je Mitarbeiter'],
  ['trainer', 'Erster Trainer eingesetzt', 'Bei Geldmangel nur verfügbares Geld zahlen · keine Entlassung'],
  ['beer', 'Erstes Bier verkauft', 'Warenzahlung selbst berücksichtigen'],
  ['discount', 'Erster Discount Manager eingesetzt', 'Ab 3 $ Preisnachlass: 100 $ aus der Bank entfernen'],
];
export const KETCHUP_MILESTONE = [
  'ketchup',
  'Jemand verkauft deine Nachfrage',
  'Vergleich Preis + Entfernung −1',
];
export const milestoneList = (m, game) => [
  ...(m?.newSet ? NEW_MILESTONES : MILESTONES),
  ...(game?.modules?.ketchup ? [KETCHUP_MILESTONE] : []),
];
export function emptyMilestones(set = 'base') {
  return {
    ...Object.fromEntries([...MILESTONES, ...NEW_MILESTONES, KETCHUP_MILESTONE].map(([key]) => [key, false])),
    newSet: set === 'new',
  };
}
export const salaryRate = (row) => (row?.milestones?.salary ? 3 : 5);
export function salaryPayment(row, count, balance = Infinity) {
  const gross = integer(count) * salaryRate(row);
  const discounts = row.salaryDiscounts ?? {};
  const discount = (integer(discounts.recruiting ?? 0) + integer(discounts.hr ?? 0)) * 5;
  const due = Math.max(0, gross - discount);
  const paid = row.milestones?.trainer ? Math.min(Math.max(0, balance), due) : due;
  return { gross, discount, due, paid, shortfall: due - paid };
}
export const marketingIncome = (row) => (row?.milestones?.marketeer ? integer(row.demand ?? 0) * 5 : 0);
export const bankRemoval = (row) =>
  row.milestones.discount && row.price <= (row.basePrice ?? 10) - 3 ? 100 : 0;
export const reserveOptions = (game) => (game.modules?.reservePrices ? [5, 10, 20] : [100, 200, 300]);
export function reserveBasePrice(cards) {
  if (!Array.isArray(cards) || !cards.length || cards.some((n) => ![5, 10, 20].includes(n))) return null;
  const counts = Object.fromEntries([5, 10, 20].map((n) => [n, cards.filter((value) => value === n).length]));
  const max = Math.max(...Object.values(counts));
  return [20, 5, 10].find((n) => counts[n] === max);
}
export const reserveAmount = (game, cards = game.reserves) =>
  !cards ? 0 : game.modules?.reservePrices ? game.players.length * 200 : cards.reduce((sum, n) => sum + n, 0);
export const COLORS = ['#b34335', '#d3a323', '#336f9b', '#4e8052', '#75548c', '#c55b86'];
export function integer(value, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max)
    throw new Error(t('Bitte eine gültige, nicht negative ganze Zahl eingeben.'));
  return value;
}
export function emptySale(milestones = {}, basePrice = 10) {
  return {
    burger: 0,
    pizza: 0,
    beer: 0,
    lemonade: 0,
    soda: 0,
    noodles: 0,
    sushi: 0,
    kimchi: 0,
    coffee: 0,
    coffeeGarden: 0,
    waitresses: 0,
    fryChefs: 0,
    basePrice,
    price: basePrice,
    garden: 0,
    cfo: false,
    demand: 0,
    salaryDiscounts: { recruiting: 0, hr: 0 },
    milestones: { ...milestones },
  };
}
export function productBonus(key, milestones = {}) {
  const flag =
    key === 'burger'
      ? 'burger'
      : key === 'pizza'
        ? 'pizza'
        : ['beer', 'lemonade', 'soda'].includes(key)
          ? 'drink'
          : null;
  return flag && milestones[flag] ? 5 : 0;
}
export function houseUnitPrice(house, key, milestones = {}) {
  return (
    (unitPrice(house.price) - (milestones.price ? 1 : 0)) * houseMultiplier(house) +
    productBonus(key, milestones)
  );
}
export function calculateHouse(house, milestones = {}) {
  if (
    !house ||
    !['normal', 'garden'].includes(house.type) ||
    typeof house.number !== 'string' ||
    house.number.length > 24
  )
    throw new Error(t('Bitte ein gültiges Haus auswählen.'));
  if (house.park !== undefined && typeof house.park !== 'boolean')
    throw new Error(t('Ungültiger Parkstatus.'));
  if (isRural(house.number) && (house.type === 'garden' || house.park))
    throw new Error(t('Das ländliche Gebiet hat weder Garten noch Park.'));
  if (isApartment(house.number) && house.type === 'garden')
    throw new Error(t('Apartments können keinen Garten haben.'));
  if (house.order !== undefined) integer(house.order);
  if (house.coffeeOrder !== undefined) integer(house.coffeeOrder);
  if (house.basePrice !== undefined && ![5, 10, 20].includes(house.basePrice))
    throw new Error(t('Ungültiger Grundpreis.'));
  const ordinary = GOODS.reduce((sum, [key]) => sum + integer(house[key]), 0);
  const noodles = integer(house.noodles ?? 0),
    sushi = integer(house.sushi ?? 0),
    kimchi = integer(house.kimchi ?? 0, 1);
  if (sushi && house.type !== 'garden') throw new Error(t('Sushi wird nur an Häuser mit Garten verkauft.'));
  if (sushi && (ordinary || noodles))
    throw new Error(t('Sushi ersetzt die gesamte Bestellung. Bitte nicht mit anderen Waren mischen.'));
  if (noodles && ordinary)
    throw new Error(t('Nudeln ersetzen die gesamte Bestellung. Bitte nicht mit anderen Waren mischen.'));
  if (kimchi && !ordinary && !noodles && !sushi)
    throw new Error(t('Kimchi kann nur zusätzlich zu einer Bestellung verkauft werden.'));
  const quantity = ordinary + noodles + sushi + kimchi;
  const coffee = integer(house.coffee ?? 0);
  if (!quantity && !coffee) throw new Error(t('Bitte mindestens eine verkaufte Ware eingeben.'));
  if (quantity && coffee) throw new Error(t('Kaffee bitte als eigenen Verkauf erfassen.'));
  const price = unitPrice(house.price) - (milestones.price ? 1 : 0);
  const revenue = quantity * price * houseMultiplier(house);
  const coffeeRevenue = coffee * price * houseMultiplier(house);
  const bonus = GOODS.reduce((sum, [key]) => sum + house[key] * productBonus(key, milestones), 0);
  return { quantity, coffee, revenue, coffeeRevenue, bonus, total: revenue + coffeeRevenue + bonus };
}
export function houseRows(configs, houses) {
  if (!Array.isArray(houses) || houses.length > 1000) throw new Error(t('Zu viele Hausverkäufe.'));
  const rows = configs.map((config) => ({
    ...emptySale(config.milestones),
    waitresses: config.waitresses,
    fryChefs: config.fryChefs ?? 0,
    basePrice: config.basePrice ?? 10,
    cfo: config.cfo,
    price: config.price,
    demand: config.demand ?? 0,
    salaryDiscounts: { ...config.salaryDiscounts },
    houses: [],
  }));
  for (const house of houses) {
    const player = integer(house.player, rows.length - 1);
    const row = rows[player];
    const result = calculateHouse(house, row.milestones);
    row.houses.push(structuredClone(house));
    mealGoods.forEach(([key]) => {
      row[key] += house[key] ?? 0;
    });
    row.coffee += result.coffee;
    if (house.type === 'garden') row.garden += result.quantity;
    if (house.type === 'garden') row.coffeeGarden += result.coffee;
  }
  validateCoffeeSales(rows);
  return rows;
}
export function calculateSale(sale) {
  const m = sale.milestones;
  if (sale.basePrice !== undefined && ![5, 10, 20].includes(sale.basePrice))
    throw new Error(t('Ungültiger Grundpreis.'));
  const quantity = mealGoods.reduce((sum, [key]) => sum + integer(sale[key] ?? 0), 0);
  integer(sale.demand ?? 0);
  salaryPayment(sale, 0);
  const price = unitPrice(sale.price) - (m.price ? 1 : 0);
  if (
    ((sale.noodles ?? 0) > 0 || (sale.sushi ?? 0) > 0 || (sale.kimchi ?? 0) > 0) &&
    !Array.isArray(sale.houses)
  )
    throw new Error(t('Neue Waren benötigen erfasste Hausverkäufe.'));
  const garden = integer(sale.garden);
  const coffee = integer(sale.coffee ?? 0),
    coffeeGarden = integer(sale.coffeeGarden ?? 0);
  if (coffeeGarden > coffee) throw new Error(t('Ungültige Garten-Kaffeemenge.'));
  if (garden > quantity)
    throw new Error(t('Gartenwaren dürfen die verkaufte Gesamtmenge nicht übersteigen.'));
  let revenue = (quantity + garden) * price;
  let coffeeRevenue = (coffee + coffeeGarden) * price;
  if (sale.houses !== undefined) {
    if (!Array.isArray(sale.houses) || sale.houses.length > 1000)
      throw new Error(t('Ungültige Hausverkäufe.'));
    const counts = Object.fromEntries(mealGoods.map(([key]) => [key, 0]));
    let gardenCount = 0;
    let coffeeCount = 0,
      gardenCoffee = 0;
    coffeeRevenue = 0;
    revenue = sale.houses.reduce((sum, house) => {
      const result = calculateHouse(house, m);
      mealGoods.forEach(([key]) => {
        counts[key] += house[key] ?? 0;
      });
      if (house.type === 'garden') gardenCount += result.quantity;
      coffeeCount += result.coffee;
      if (house.type === 'garden') gardenCoffee += result.coffee;
      coffeeRevenue += result.coffeeRevenue;
      return sum + result.revenue;
    }, 0);
    if (mealGoods.some(([key]) => counts[key] !== (sale[key] ?? 0)) || gardenCount !== garden)
      throw new Error(t('Hausverkäufe und Warenübersicht stimmen nicht überein.'));
    if (coffeeCount !== coffee || gardenCoffee !== coffeeGarden)
      throw new Error(t('Kaffeeverkäufe und Übersicht stimmen nicht überein.'));
  }
  const bonus = GOODS.reduce((sum, [key]) => sum + (sale[key] ?? 0) * productBonus(key, m), 0);
  const fryChefs = integer(sale.fryChefs ?? 0);
  if (fryChefs && !Array.isArray(sale.houses) && quantity)
    throw new Error(t('Friteusenköche benötigen erfasste Hausverkäufe.'));
  const fryHouses = new Set(
    (sale.houses || []).filter((h) => !isCoffeeSale(h)).map((h) => houseId(h.number) ?? h.number.trim()),
  ).size;
  const fry = fryChefs * fryHouses * 10;
  const tips = integer(sale.waitresses) * (m.waitress ? 5 : 3);
  const cfo = sale.cfo || m.cfo ? Math.ceil((revenue + coffeeRevenue + bonus + tips + fry) / 2) || 0 : 0;
  return {
    quantity,
    coffee,
    price,
    revenue,
    coffeeRevenue,
    bonus,
    tips,
    fry,
    fryHouses,
    cfo,
    total: revenue + coffeeRevenue + bonus + tips + fry + cfo,
  };
}
// Replay cash in board order. No draft input or future income can fund an earlier payment.
export function replayGame(
  input,
  { partialSaleIndex = null, pauseOnReserve = false, stopBeforeMeal = null } = {},
) {
  const game = structuredClone(input),
    n = game.players.length;
  const balances = game.players.map(() => 0),
    bankrupt = game.players.map(() => null),
    salePayments = {},
    saleDetails = {},
    salaryPayments = {},
    salaryDetails = {},
    marketingPayments = {},
    issues = [];
  let bank = n * 50,
    basePrice = 10,
    firstBreak = null,
    secondBreak = null,
    firstBreakAt = null,
    secondBreakAt = null,
    needsReserve = false;
  let eventIndex = 0,
    event = null;
  const halted = () => needsReserve && (pauseOnReserve || game.modules?.reservePrices);
  function checkBank(at, mayEnd = true) {
    if (bank > 0) return;
    if (firstBreak === null) {
      firstBreak = eventIndex;
      firstBreakAt = { ...at, round: event.round };
      if (!game.reserves) {
        needsReserve = true;
        return;
      }
      bank += reserveAmount(game);
      if (game.modules?.reservePrices) basePrice = reserveBasePrice(game.reserves);
    }
    if (bank <= 0 && game.reserves && mayEnd && secondBreak === null) {
      secondBreak = eventIndex;
      secondBreakAt = { ...at, round: event.round };
    }
  }
  function pay(player, amount, at, detail, category) {
    if (bankrupt[player] !== null) return 0;
    const paid = Math.max(amount, -balances[player]);
    if (paid !== amount) bankrupt[player] = event.round;
    balances[player] += paid;
    bank -= paid;
    if (detail) {
      detail.paid += paid;
      detail[category] += amount;
      detail.unpaid += paid - amount;
    }
    checkBank({ ...at, player });
    return paid;
  }
  for (eventIndex = 0; eventIndex < game.events.length; eventIndex++) {
    event = game.events[eventIndex];
    if (secondBreak !== null && secondBreak !== eventIndex)
      issues.push(t('Nach dem Spielende liegen weitere Buchungen vor. Bitte spätere Runden entfernen.'));
    if (event.type === 'sale') {
      const startBase = basePrice;
      const details = event.rows.map(() => ({
        paid: 0,
        goods: 0,
        fry: 0,
        tips: 0,
        cfo: 0,
        unpaid: 0,
        houses: [],
      }));
      saleDetails[eventIndex] = details;
      salePayments[eventIndex] = details.map(() => 0);
      // Employee adjustments are fixed in Restructuring, independently of later reserve changes.
      for (const row of event.rows) {
        const oldBase = row.basePrice ?? 10;
        if (row.houses) for (const h of row.houses) h.basePrice ??= oldBase;
        row.price += startBase - oldBase;
        row.basePrice = startBase;
      }
      for (let i = 0; i < n; i++)
        if (bankrupt[i] === null) {
          bank -= bankRemoval(event.rows[i]);
          checkBank({ phase: 'restructuring' }, true);
          if (halted()) break;
        }
      if (halted()) break;
      checkBank({ phase: 'houses' }, true);
      if (halted()) break;
      const sequential = event.rows.every((row) => Array.isArray(row.houses));
      if (sequential) {
        let sales = event.rows.flatMap((row, player) => row.houses.map((h, index) => ({ h, player, index })));
        for (const parent of sales.filter((s) => !isCoffeeSale(s.h) && s.h.coffeeSequence !== undefined)) {
          const coffee = sales.filter((s) => isCoffeeSale(s.h) && sameHouse(s.h.number, parent.h.number));
          const remaining = coffee.map((s) => ({ sale: s, left: s.h.coffee }));
          const ordered = parent.h.coffeeSequence.map((player, order) => {
            const record = remaining.find((r) => r.left > 0 && r.sale.player === player);
            if (!record) throw new Error(t('Kaffee-Reihenfolge und Mengen stimmen nicht überein.'));
            record.left--;
            return { ...record.sale, h: { ...record.sale.h, coffee: 1, coffeeOrder: order } };
          });
          sales = sales.filter((s) => !coffee.includes(s));
          sales.push(...ordered);
        }
        sales.sort(
          (a, b) =>
            houseOrder(a.h.number) - houseOrder(b.h.number) ||
            Number(isCoffeeSale(b.h)) - Number(isCoffeeSale(a.h)) ||
            (a.h.coffeeOrder ?? a.h.order ?? a.index) - (b.h.coffeeOrder ?? b.h.order ?? b.index) ||
            a.player - b.player,
        );
        const normalized = event.rows.map(() => []);
        for (const { h, player } of sales) {
          if (
            stopBeforeMeal &&
            eventIndex === partialSaleIndex &&
            sameHouse(h.number, stopBeforeMeal) &&
            !isCoffeeSale(h)
          )
            break;
          const detail = details[player],
            row = event.rows[player];
          if (bankrupt[player] !== null) {
            normalized[player].push(h);
            issues.push(
              html`${game.players[player].name}: Verkauf bei ${h.number} nach Zahlungsunfähigkeit entfernen
              oder neu zuordnen; Spieler bereits ausgeschieden.`,
            );
            continue;
          }
          const offset = h.price - (h.basePrice ?? startBase);
          let remaining = h.coffee ?? 0;
          const chunks = [];
          if (!isCoffeeSale(h)) {
            const sale = { ...h, price: offset + basePrice, basePrice };
            const result = calculateHouse(sale, row.milestones);
            const fry = (row.fryChefs ?? 0) * 10;
            const paid = pay(
              player,
              result.total + fry,
              { phase: 'houses', house: h.number },
              detail,
              'goods',
            );
            detail.goods -= fry;
            detail.fry += fry;
            detail.houses.push({
              number: h.number,
              coffee: false,
              amount: result.total + fry,
              paid,
              basePrice: sale.basePrice,
            });
            chunks.push(sale);
          } else {
            // Coffee is bought before dinner. Split a batch at the exact reserve boundary.
            while (remaining > 0 && !halted() && bankrupt[player] === null) {
              const unit = (offset + basePrice - (row.milestones.price ? 1 : 0)) * houseMultiplier(h);
              const count =
                firstBreak === null && unit > 0
                  ? Math.min(remaining, Math.max(1, Math.ceil(bank / unit)))
                  : remaining;
              const sale = { ...h, coffee: count, price: offset + basePrice, basePrice };
              const result = calculateHouse(sale, row.milestones);
              const paid = pay(player, result.total, { phase: 'coffee', house: h.number }, detail, 'goods');
              detail.houses.push({
                number: h.number,
                coffee: true,
                amount: result.total,
                paid,
                basePrice: sale.basePrice,
              });
              chunks.push(sale);
              remaining -= count;
            }
            if (remaining > 0) {
              chunks.push({ ...h, coffee: remaining, price: offset + basePrice, basePrice });
              if (!needsReserve)
                issues.push(
                  html`${game.players[player].name}: Weitere Kaffees nach Zahlungsunfähigkeit entfernen.`,
                );
            }
          }
          normalized[player].push(...chunks);
          if (halted()) break;
        }
        if (!halted())
          event.rows.forEach((row, i) => {
            row.houses = normalized[i];
          });
      } else {
        // Aggregate-only old saves cannot reconstruct individual houses; preserve their amounts.
        event.rows.forEach((row, i) => {
          if (halted()) return;
          if (bankrupt[i] !== null) {
            if (calculateSale(row).total)
              issues.push(t('Ausgeschiedene Spieler können nicht mehr verkaufen.'));
            return;
          }
          const oldTotal = calculateSale(row);
          const goods = oldTotal.total - oldTotal.tips - oldTotal.cfo;
          pay(i, goods, { phase: 'legacy' }, details[i], 'goods');
        });
      }
      salePayments[eventIndex] = details.map((d) => d.paid);
      if (halted()) break;
      if (partialSaleIndex !== eventIndex) {
        // Waitresses are paid only after all houses. CFO is then paid once on actual round income.
        for (let i = 0; i < n; i++)
          if (bankrupt[i] === null) {
            pay(
              i,
              (event.rows[i].waitresses ?? 0) * (event.rows[i].milestones.waitress ? 5 : 3),
              { phase: 'waitresses' },
              details[i],
              'tips',
            );
            if (halted()) break;
          }
        if (!halted())
          for (let i = 0; i < n; i++)
            if (bankrupt[i] === null && (event.rows[i].cfo || event.rows[i].milestones.cfo)) {
              details[i].cfoBase = details[i].paid;
              const bonus = Math.ceil(details[i].cfoBase / 2) || 0;
              pay(i, bonus, { phase: 'cfo' }, details[i], 'cfo');
              if (halted()) break;
            }
      }
      salePayments[eventIndex] = details.map((d) => d.paid);
      if (halted()) break;
    } else {
      const rows = game.events[eventIndex - 1].rows;
      salaryPayments[eventIndex] = event.rows.map(() => 0);
      salaryDetails[eventIndex] = event.rows.map(() => null);
      marketingPayments[eventIndex] = event.rows.map(() => 0);
      event.rows.forEach((count, i) => {
        if (bankrupt[i] !== null) {
          if (count) issues.push(t('Ausgeschiedene Spieler zahlen keine weiteren Löhne.'));
          return;
        }
        const payment = salaryPayment(rows[i], count, balances[i]);
        salaryDetails[eventIndex][i] = payment;
        const cost = payment.paid;
        salaryPayments[eventIndex][i] = cost;
        if (cost > balances[i])
          issues.push(html`${game.players[i].name}: Lohn übersteigt das Guthaben in Runde ${event.round}.`);
        balances[i] -= cost;
        bank += cost;
      });
      // Marketing cannot fund earlier salary payments. A second break here ends next dinner.
      event.rows.forEach((_, i) => {
        if (bankrupt[i] !== null || halted()) return;
        const cash = marketingIncome(rows[i]);
        marketingPayments[eventIndex][i] = cash;
        balances[i] += cash;
        bank -= cash;
        checkBank({ phase: 'marketing', player: i }, false);
      });
      if (halted()) break;
    }
  }
  return {
    game,
    saleRows: Object.fromEntries(game.events.flatMap((e, i) => (e.type === 'sale' ? [[i, e.rows]] : []))),
    bank,
    balances,
    firstBreak,
    secondBreak,
    firstBreakAt,
    secondBreakAt,
    bankrupt,
    salePayments,
    saleDetails,
    salaryPayments,
    salaryDetails,
    marketingPayments,
    basePrice,
    needsReserve,
    issues: [...new Set(issues)],
  };
}
export function account(game) {
  const { game: normalized, ...state } = replayGame(game);
  return state;
}
function normalizeDraftPrices(next, state) {
  if (!next.modules?.reservePrices) return next;
  const draft = next.draft?.type === 'sale' ? next.draft : next.draft?.completion;
  if (draft) {
    const target = next.draft.type === 'sale' ? state.basePrice : (draft.rows[0].basePrice ?? 10);
    const oldBase = draft.rows[draft.houseForm?.player ?? 0]?.basePrice ?? 10;
    draft.rows.forEach((row) => {
      for (const h of row.houses || []) h.basePrice ??= row.basePrice ?? 10;
      row.price += target - (row.basePrice ?? 10);
      row.basePrice = target;
    });
    if (draft.houseForm) {
      const old = draft.houseForm.basePrice ?? oldBase;
      draft.houseForm.price += target - old;
      draft.houseForm.basePrice = target;
    }
  }
  return next;
}
export function applyReservePrices(game) {
  if (!game.modules?.reservePrices) return game;
  const state = replayGame(game);
  return normalizeDraftPrices(state.game, state);
}
export function houseSettlement(
  game,
  rows,
  index = null,
  reserves = game.reserves,
  { beforeMeal = null } = {},
) {
  const position = index ?? game.events.length;
  const candidate = {
    ...game,
    reserves,
    draft: null,
    events: [...game.events.slice(0, position), { type: 'sale', round: Math.floor(position / 2) + 1, rows }],
  };
  const result = replayGame(candidate, {
    partialSaleIndex: position,
    pauseOnReserve: true,
    stopBeforeMeal: beforeMeal,
  });
  return { ...result, rows: result.game.events[position].rows };
}

export function roundSettlement(game, rows, wages, index = null, reserves = game.reserves) {
  if (rows.length !== game.players.length || wages.length !== game.players.length)
    throw new Error(t('Ungültige Anzahl Spieler.'));
  wages.forEach((n) => integer(n));
  rows.forEach((row) => validateCoffeeModule(row, game));
  validateCoffeeSales(rows);
  const position = index === null ? game.events.length : index;
  integer(position, game.events.length);
  if (
    position % 2 !== 0 ||
    position > game.events.length ||
    (index !== null && game.events[position]?.type !== 'sale')
  )
    throw new Error(t('Ungültige Verkaufsrunde.'));
  if (
    reserves !== null &&
    (!Array.isArray(reserves) ||
      reserves.length !== game.players.length ||
      reserves.some((n) => !reserveOptions(game).includes(n)))
  )
    throw new Error(t('Ungültige Reservekarten.'));
  const round = Math.floor(position / 2) + 1;
  const oldSale = game.events[position];
  const oldSalary = game.events[position + 1]?.type === 'salary' ? game.events[position + 1] : null;
  const prefix = game.events.slice(0, position);
  const suffix = game.events.slice(position + (oldSalary ? 2 : oldSale ? 1 : 0));
  const time = new Date().toISOString();
  const sale = {
    ...oldSale,
    type: 'sale',
    round,
    rows: structuredClone(rows),
    createdAt: oldSale?.createdAt || time,
    combined: true,
    ...(oldSale ? { updatedAt: time } : {}),
  };
  let candidate = { ...structuredClone(game), reserves: reserves && [...reserves] };
  const before = account({ ...candidate, events: prefix });
  const afterSales = account({ ...candidate, events: [...prefix, sale] });
  const incomes = afterSales.salePayments[position];
  if (afterSales.needsReserve)
    return {
      candidate: null,
      before,
      afterSales,
      incomes,
      expenses: null,
      balances: null,
      needsReserve: true,
      ended: false,
      issues: [],
    };
  const ended = afterSales.secondBreak !== null;
  const expenses = wages.map((n, i) =>
    ended || afterSales.bankrupt[i] !== null ? 0 : salaryPayment(rows[i], n, afterSales.balances[i]).paid,
  );
  const marketing = rows.map((row, i) =>
    ended || afterSales.bankrupt[i] !== null ? 0 : marketingIncome(row),
  );
  const removed = rows.map((row, i) => (before.bankrupt[i] !== null ? 0 : bankRemoval(row)));
  const salary = {
    ...oldSalary,
    type: 'salary',
    round,
    rows: wages.map((n, i) => (afterSales.bankrupt[i] !== null ? 0 : n)),
    createdAt: oldSalary?.createdAt || time,
    combined: true,
    ...(oldSalary ? { updatedAt: time } : {}),
  };
  const events = [...prefix, sale, ...(ended ? [] : [salary])];
  const after = account({ ...candidate, events });
  if (after.needsReserve)
    return {
      candidate: null,
      before,
      afterSales,
      incomes,
      expenses,
      marketing,
      removed,
      balances: null,
      needsReserve: true,
      ended: false,
      issues: [],
    };
  candidate.events = [...events, ...suffix];
  if (index === null || (position === game.events.length - 1 && game.draft?.type === 'salary'))
    candidate.draft = null;
  const settled = replayGame(candidate);
  candidate = normalizeDraftPrices(settled.game, settled);
  const issues = settled.issues;
  return {
    candidate,
    rows: afterSales.saleRows[position],
    details: afterSales.saleDetails[position],
    salaryDetails: after.salaryDetails[position + 1],
    before,
    afterSales,
    incomes,
    expenses,
    marketing,
    removed,
    balances: after.balances,
    needsReserve: false,
    ended,
    issues,
  };
}
export function validateGame(game) {
  if (
    !game ||
    game.version !== 1 ||
    !Array.isArray(game.players) ||
    game.players.length < 2 ||
    game.players.length > 6
  )
    throw new Error(t('Kein gültiger GameScores-Spielstand.'));
  if (
    game.modules !== undefined &&
    (!game.modules ||
      typeof game.modules !== 'object' ||
      Array.isArray(game.modules) ||
      Object.entries(game.modules).some(
        ([key, value]) =>
          ![
            'newDistricts',
            'apartments',
            'coffee',
            'fryChef',
            'lobbyist',
            'reservePrices',
            'kimchi',
            'noodles',
            'rural',
            'ketchup',
            'sushi',
          ].includes(key) || typeof value !== 'boolean',
      ))
  )
    throw new Error(t('Ungültige Erweiterungsmodule.'));
  const options = houseOptions(game);
  const parkOptions = options.filter((id) => !isRural(id));
  if (
    game.builtParks !== undefined &&
    (!Array.isArray(game.builtParks) ||
      new Set(game.builtParks).size !== game.builtParks.length ||
      game.builtParks.some((id) => !parkOptions.includes(id)))
  )
    throw new Error(t('Ungültige Parks.'));
  if (
    game.builtParkRounds !== undefined &&
    (!game.builtParkRounds ||
      typeof game.builtParkRounds !== 'object' ||
      Array.isArray(game.builtParkRounds) ||
      Object.entries(game.builtParkRounds).some(
        ([id, round]) =>
          !parkOptions.some((option) => String(option) === id) ||
          !Number.isSafeInteger(round) ||
          round < 1 ||
          round > 10001,
      ))
  )
    throw new Error(t('Ungültige Park-Baurunden.'));
  if (
    !game.modules?.lobbyist &&
    ((game.builtParks?.length ?? 0) > 0 || Object.keys(game.builtParkRounds || {}).length)
  )
    throw new Error(t('Das Lobbyist-Modul ist nicht aktiviert.'));
  const gardenNumbers = houseOptions(game).filter(
    (number) => typeof number === 'number' && !isNativeGarden(number),
  );
  if (game.milestoneSet !== undefined && !['base', 'new'].includes(game.milestoneSet))
    throw new Error(t('Ungültiger Meilensteinsatz.'));
  if (
    game.builtGardens !== undefined &&
    (!Array.isArray(game.builtGardens) ||
      game.builtGardens.length > gardenNumbers.length ||
      new Set(game.builtGardens).size !== game.builtGardens.length ||
      game.builtGardens.some((number) => !gardenNumbers.includes(number)))
  )
    throw new Error(t('Ungültige gebaute Gärten.'));
  if (
    game.builtGardenRounds !== undefined &&
    (!game.builtGardenRounds ||
      typeof game.builtGardenRounds !== 'object' ||
      Array.isArray(game.builtGardenRounds) ||
      Object.keys(game.builtGardenRounds).length > gardenNumbers.length ||
      Object.entries(game.builtGardenRounds).some(
        ([number, round]) =>
          String(Number(number)) !== number ||
          !gardenNumbers.includes(Number(number)) ||
          !Number.isSafeInteger(round) ||
          round < 1 ||
          round > 10001,
      ))
  )
    throw new Error(t('Ungültige Garten-Baurunden.'));
  game.players.forEach((p) => {
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40 || !COLORS.includes(p.color))
      throw new Error(t('Ungültige Spielerdaten.'));
    validateMilestones(p.milestones, game.milestoneSet === 'new');
    validateExtraModules({ milestones: p.milestones }, game);
  });
  if (new Set(game.players.map((p) => p.color)).size !== game.players.length)
    throw new Error(t('Jede Farbe darf nur einmal vergeben sein.'));
  if (
    game.reserves !== null &&
    (!Array.isArray(game.reserves) ||
      game.reserves.length !== game.players.length ||
      game.reserves.some((n) => !reserveOptions(game).includes(n)))
  )
    throw new Error(t('Ungültige Reservekarten.'));
  if (!Array.isArray(game.events) || game.events.length > 10000) throw new Error(t('Ungültiges Protokoll.'));
  game.events.forEach((event, index) => {
    if (
      event.type !== (index % 2 ? 'salary' : 'sale') ||
      event.round !== Math.floor(index / 2) + 1 ||
      !Array.isArray(event.rows) ||
      event.rows.length !== game.players.length
    )
      throw new Error(t('Ungültige Rundenfolge.'));
    if (event.type === 'sale')
      event.rows.forEach((row, player) => {
        validateMilestones(row.milestones, game.milestoneSet === 'new');
        if (typeof row.cfo !== 'boolean') throw new Error(t('Ungültiger CFO-Wert.'));
        calculateSale(row);
        validateCoffeeModule(row, game);
        if (row.houses?.some((h) => h.player !== player))
          throw new Error(t('Ungültige Spielerzuordnung eines Hauses.'));
      });
    else event.rows.forEach((n) => integer(n));
    if (event.type === 'sale') validateCoffeeSales(event.rows);
  });
  if (game.draft) {
    const type = game.events.length % 2 ? 'salary' : 'sale';
    if (
      game.draft.type !== type ||
      !Array.isArray(game.draft.rows) ||
      game.draft.rows.length !== game.players.length
    )
      throw new Error(t('Ungültige laufende Eingabe.'));
    game.draft.rows.forEach((row, player) => {
      if (type === 'salary') integer(row);
      else {
        validateMilestones(row.milestones, game.milestoneSet === 'new');
        if (typeof row.cfo !== 'boolean') throw new Error(t('Ungültiger CFO-Wert.'));
        calculateSale(row);
        validateCoffeeModule(row, game);
        if (row.houses?.some((h) => h.player !== player))
          throw new Error(t('Ungültige Spielerzuordnung eines Hauses.'));
      }
    });
    if (type === 'sale') validateCoffeeSales(game.draft.rows);
    if (game.draft.wages !== undefined) {
      if (
        type !== 'sale' ||
        !Array.isArray(game.draft.wages) ||
        game.draft.wages.length !== game.players.length
      )
        throw new Error(t('Ungültiger Lohnentwurf.'));
      game.draft.wages.forEach((n) => integer(n));
    }
    if (
      game.draft.reserves !== undefined &&
      game.draft.reserves !== null &&
      (!Array.isArray(game.draft.reserves) ||
        game.draft.reserves.length !== game.players.length ||
        game.draft.reserves.some((n) => !reserveOptions(game).includes(n)))
    )
      throw new Error(t('Ungültige Reservekarten im Entwurf.'));
    if (
      game.draft.removedGardens !== undefined &&
      (!Array.isArray(game.draft.removedGardens) ||
        game.draft.removedGardens.length > gardenNumbers.length ||
        new Set(game.draft.removedGardens).size !== game.draft.removedGardens.length ||
        game.draft.removedGardens.some((number) => !gardenNumbers.includes(number)))
    )
      throw new Error(t('Ungültige Gartenkorrektur.'));
    if (
      game.draft.removedParks !== undefined &&
      (!Array.isArray(game.draft.removedParks) ||
        new Set(game.draft.removedParks).size !== game.draft.removedParks.length ||
        game.draft.removedParks.some((id) => !options.includes(id)) ||
        (game.draft.removedParks.length && !game.modules?.lobbyist))
    )
      throw new Error(t('Ungültige Parkkorrektur.'));
    if (game.draft.houseForm !== undefined) {
      const h = game.draft.houseForm;
      if (h?.park !== undefined && typeof h.park !== 'boolean') throw new Error(t('Ungültiger Parkstatus.'));
      if (h?.park && !options.includes(houseId(h.number)))
        throw new Error(t('Ungültiges Haus für einen Park.'));
      if (h?.park && !game.modules?.lobbyist) throw new Error(t('Das Lobbyist-Modul ist nicht aktiviert.'));
      if (
        type !== 'sale' ||
        !h ||
        typeof h.number !== 'string' ||
        h.number.length > 24 ||
        !['normal', 'garden'].includes(h.type)
      )
        throw new Error(t('Ungültiger Hausentwurf.'));
      if (isApartment(h.number) && h.type === 'garden')
        throw new Error(t('Apartments können keinen Garten haben.'));
      if (h.player !== null) integer(h.player, game.players.length - 1);
      unitPrice(h.price);
      if (h.basePrice !== undefined && ![5, 10, 20].includes(h.basePrice))
        throw new Error(t('Ungültiger Grundpreis.'));
      if (h.coffeeSequence !== undefined) {
        if (
          !Array.isArray(h.coffeeSequence) ||
          h.coffeeSequence.length > 200 ||
          h.coffeeSequence.some((i) => !Number.isSafeInteger(i) || i < 0 || i >= game.players.length)
        )
          throw new Error(t('Ungültige Kaffee-Reihenfolge.'));
        if (h.coffees && h.coffees.some((n, i) => h.coffeeSequence.filter((p) => p === i).length !== n))
          throw new Error(t('Kaffee-Reihenfolge und Mengen stimmen nicht überein.'));
      }
      GOODS.forEach(([key]) => integer(h[key]));
      integer(h.noodles ?? 0);
      integer(h.sushi ?? 0);
      integer(h.kimchi ?? 0, 1);
      validateExtraModules(h, game);
      integer(h.coffee ?? 0);
      if (h.coffees !== undefined) {
        if (!Array.isArray(h.coffees) || h.coffees.length !== game.players.length)
          throw new Error(t('Ungültiger Kaffeeentwurf.'));
        h.coffees.forEach((n) => integer(n));
        if (h.coffees.some((n) => n > 0) && !game.modules?.coffee)
          throw new Error(t('Das Kaffeemodul ist nicht aktiviert.'));
      }
      if ((h.coffee ?? 0) > 0 && !game.modules?.coffee)
        throw new Error(t('Das Kaffeemodul ist nicht aktiviert.'));
    }
    if (game.draft.completion !== undefined) {
      const completion = game.draft.completion;
      if (type !== 'salary' || !completion || game.events.at(-1)?.type !== 'sale')
        throw new Error(t('Ungültiger Rundenentwurf.'));
      validateGame({
        ...game,
        events: game.events.slice(0, -1),
        draft: {
          type: 'sale',
          rows: completion.rows,
          houseForm: completion.houseForm,
          reserves: completion.reserves,
          wages: game.draft.rows,
          removedGardens: completion.removedGardens,
          removedParks: completion.removedParks,
        },
      });
    }
  }
  account(game);
  return applyReservePrices(game);
}
function validateMilestones(m, newSet) {
  if (!m || MILESTONES.some(([key]) => typeof m[key] !== 'boolean'))
    throw new Error(t('Ungültige Meilensteine.'));
  if (
    ['newSet', 'coffee', 'ketchup', ...NEW_MILESTONES.map(([key]) => key)].some(
      (key) => m[key] !== undefined && typeof m[key] !== 'boolean',
    )
  )
    throw new Error(t('Ungültige Meilensteine.'));
  if (Boolean(m.newSet) !== newSet || (!m.newSet && NEW_MILESTONES.some(([key]) => m[key])))
    throw new Error(t('Ungültige Meilensteine.'));
  if (
    m.newSet &&
    (MILESTONES.some(([key]) => m[key]) ||
      NEW_MILESTONES.some(
        ([key]) => typeof m[key] !== 'boolean' && !(key === 'trainer' && m[key] === undefined),
      ))
  )
    throw new Error(t('Ungültige Meilensteine.'));
}
function validateExtraModules(row, game) {
  if (row.salaryDiscounts !== undefined) {
    const d = row.salaryDiscounts;
    if (
      !d ||
      typeof d !== 'object' ||
      Array.isArray(d) ||
      Object.keys(d).some((key) => !['recruiting', 'hr'].includes(key))
    )
      throw new Error(t('Ungültige Lohnrabatte.'));
    integer(d.recruiting ?? 0);
    integer(d.hr ?? 0);
    if (game.milestoneSet !== 'new' && ((d.recruiting ?? 0) || (d.hr ?? 0)))
      throw new Error(t('Lohnrabatte einzeln eingeben ist nur mit neuen Meilensteinen möglich.'));
  }
  for (const key of ['kimchi', 'noodles', 'sushi'])
    if ((row[key] ?? 0) > 0 && !game.modules?.[key])
      throw new Error(t('Das Modul für diese Ware ist nicht aktiviert.'));
  if (row.milestones?.ketchup && !game.modules?.ketchup)
    throw new Error(t('Das Ketchup-Modul ist nicht aktiviert.'));
  if ((row.number === 'rural' || row.houses?.some((h) => h.number === 'rural')) && !game.modules?.rural)
    throw new Error(t('Das Landleben-Modul ist nicht aktiviert.'));
}
function validateCoffeeModule(row, game) {
  validateExtraModules(row, game);
  for (const house of row.houses || []) validateExtraModules(house, game);
  if (!game.modules?.reservePrices && row.basePrice !== undefined && row.basePrice !== 10)
    throw new Error(t('Alternative Reservekarten sind nicht aktiviert.'));
  if (row.houses?.some((h) => h.park && !houseOptions(game).includes(houseId(h.number))))
    throw new Error(t('Ungültiges Haus für einen Park.'));
  if (!game.modules?.lobbyist && row.houses?.some((h) => h.park))
    throw new Error(t('Das Lobbyist-Modul ist nicht aktiviert.'));
  integer(row.fryChefs ?? 0);
  if ((row.fryChefs ?? 0) > 0 && !game.modules?.fryChef)
    throw new Error(t('Das Friteusenkoch-Modul ist nicht aktiviert.'));
  if ((row.coffee ?? 0) > 0 && !game.modules?.coffee)
    throw new Error(t('Das Kaffeemodul ist nicht aktiviert.'));
}
