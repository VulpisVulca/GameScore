export const GOODS = [
  ['burger', 'Burger', '🍔'], ['pizza', 'Pizza', '🍕'],
  ['beer', 'Bier · braun', '🟤'], ['lemonade', 'Limonade · gelb', '🟡'], ['soda', 'Softdrinks · rot', '🔴']
];
export const MILESTONES = [
  ['burger', 'Erster Burger vermarktet', '+5 $ je Burger'],
  ['pizza', 'Erste Pizza vermarktet', '+5 $ je Pizza'],
  ['drink', 'Erstes Getränk vermarktet', '+5 $ je Getränk'],
  ['waitress', 'Erste Bedienung eingesetzt', '5 $ statt 3 $ je Bedienung'],
  ['price', 'Als Erster Preise gesenkt', '−1 $ auf den Stückpreis'],
  ['cfo', 'Als Erster 100 $ erreicht', 'CFO immer aktiv · ab nächster Runde']
];
export const COLORS = ['#b34335', '#d3a323', '#336f9b', '#4e8052', '#75548c'];
export function integer(value, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error('Bitte eine gültige, nicht negative ganze Zahl eingeben.');
  return value;
}
export function emptySale(milestones = {}) {
  return { burger: 0, pizza: 0, beer: 0, lemonade: 0, soda: 0, waitresses: 0, price: 10, garden: 0, cfo: false, milestones: { ...milestones } };
}
export function calculateHouse(house, milestones = {}) {
  if (!house || !['normal', 'garden'].includes(house.type) || typeof house.number !== 'string' || house.number.length > 24) throw new Error('Bitte ein gültiges Haus auswählen.');
  if (house.order !== undefined) integer(house.order);
  const quantity = GOODS.reduce((sum, [key]) => sum + integer(house[key]), 0);
  if (!quantity) throw new Error('Bitte mindestens eine verkaufte Ware eingeben.');
  const price = integer(house.price, 100) - (milestones.price ? 1 : 0);
  if (price < 0) throw new Error('Der Stückpreis darf nach dem Meilenstein nicht negativ sein.');
  const revenue = quantity * price * (house.type === 'garden' ? 2 : 1);
  const bonus = (milestones.burger ? house.burger * 5 : 0) + (milestones.pizza ? house.pizza * 5 : 0) + (milestones.drink ? (house.beer + house.lemonade + house.soda) * 5 : 0);
  return { quantity, revenue, bonus, total: revenue + bonus };
}
export function houseRows(configs, houses) {
  if (!Array.isArray(houses) || houses.length > 1000) throw new Error('Zu viele Hausverkäufe.');
  const rows = configs.map(config => ({ ...emptySale(config.milestones), waitresses: config.waitresses, cfo: config.cfo, price: config.price, houses: [] }));
  for (const house of houses) {
    const player = integer(house.player, rows.length - 1);
    const row = rows[player];
    const result = calculateHouse(house, row.milestones);
    row.houses.push(structuredClone(house));
    GOODS.forEach(([key]) => { row[key] += house[key]; });
    if (house.type === 'garden') row.garden += result.quantity;
  }
  return rows;
}
export function calculateSale(sale) {
  const m = sale.milestones;
  const quantity = GOODS.reduce((sum, [key]) => sum + integer(sale[key]), 0);
  const price = integer(sale.price, 100) - (m.price ? 1 : 0);
  if (price < 0) throw new Error('Der Stückpreis darf nach dem Meilenstein nicht negativ sein.');
  const garden = integer(sale.garden);
  if (garden > quantity) throw new Error('Gartenwaren dürfen die verkaufte Gesamtmenge nicht übersteigen.');
  let revenue = (quantity + garden) * price;
  if (sale.houses !== undefined) {
    if (!Array.isArray(sale.houses) || sale.houses.length > 1000) throw new Error('Ungültige Hausverkäufe.');
    const counts = Object.fromEntries(GOODS.map(([key]) => [key, 0]));
    let gardenCount = 0;
    revenue = sale.houses.reduce((sum, house) => {
      const result = calculateHouse(house, m);
      GOODS.forEach(([key]) => { counts[key] += house[key]; });
      if (house.type === 'garden') gardenCount += result.quantity;
      return sum + result.revenue;
    }, 0);
    if (GOODS.some(([key]) => counts[key] !== sale[key]) || gardenCount !== garden) throw new Error('Hausverkäufe und Warenübersicht stimmen nicht überein.');
  }
  const bonus = (m.burger ? sale.burger * 5 : 0) + (m.pizza ? sale.pizza * 5 : 0) + (m.drink ? (sale.beer + sale.lemonade + sale.soda) * 5 : 0);
  const tips = integer(sale.waitresses) * (m.waitress ? 5 : 3);
  const cfo = sale.cfo || m.cfo ? Math.ceil((revenue + bonus + tips) / 2) : 0;
  return { quantity, price, revenue, bonus, tips, cfo, total: revenue + bonus + tips + cfo };
}
export function account(game) {
  const balances = game.players.map(() => 0);
  let bank = game.players.length * 50;
  let firstBreak = null;
  let secondBreak = null;
  const issues = [];
  for (let index = 0; index < game.events.length; index++) {
    const event = game.events[index];
    if (secondBreak !== null) issues.push('Nach dem Spielende liegen weitere Buchungen vor. Bitte spätere Runden entfernen.');
    if (event.type === 'sale') {
      event.rows.forEach((row, player) => { const total = calculateSale(row).total; balances[player] += total; bank -= total; });
      if (bank <= 0 && firstBreak === null) {
        firstBreak = index;
        if (game.reserves) bank += game.reserves.reduce((sum, value) => sum + value, 0);
      }
      if (bank <= 0 && firstBreak !== null && game.reserves && secondBreak === null) secondBreak = index;
    } else {
      event.rows.forEach((count, player) => {
        const cost = integer(count) * 5;
        if (cost > balances[player]) issues.push(`${game.players[player].name}: Lohn übersteigt das Guthaben in Runde ${event.round}.`);
        balances[player] -= cost;
        bank += cost;
      });
    }
  }
  return { bank, balances, firstBreak, secondBreak, needsReserve: firstBreak !== null && !game.reserves, issues: [...new Set(issues)] };
}
export function validateGame(game) {
  if (!game || game.version !== 1 || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 5) throw new Error('Kein gültiger GameScores-Spielstand.');
  game.players.forEach(p => {
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40 || !COLORS.includes(p.color)) throw new Error('Ungültige Spielerdaten.');
    validateMilestones(p.milestones);
  });
  if (new Set(game.players.map(p => p.color)).size !== game.players.length) throw new Error('Jede Farbe darf nur einmal vergeben sein.');
  if (game.reserves !== null && (!Array.isArray(game.reserves) || game.reserves.length !== game.players.length || game.reserves.some(n => ![100, 200, 300].includes(n)))) throw new Error('Ungültige Reservekarten.');
  if (!Array.isArray(game.events) || game.events.length > 10000) throw new Error('Ungültiges Protokoll.');
  game.events.forEach((event, index) => {
    if (event.type !== (index % 2 ? 'salary' : 'sale') || event.round !== Math.floor(index / 2) + 1 || !Array.isArray(event.rows) || event.rows.length !== game.players.length) throw new Error('Ungültige Rundenfolge.');
    if (event.type === 'sale') event.rows.forEach((row, player) => {
      validateMilestones(row.milestones);
      if (typeof row.cfo !== 'boolean') throw new Error('Ungültiger CFO-Wert.');
      calculateSale(row);
      if (row.houses?.some(h => h.player !== player)) throw new Error('Ungültige Spielerzuordnung eines Hauses.');
    });
    else event.rows.forEach(n => integer(n));
  });
  if (game.draft) {
    const type = game.events.length % 2 ? 'salary' : 'sale';
    if (game.draft.type !== type || !Array.isArray(game.draft.rows) || game.draft.rows.length !== game.players.length) throw new Error('Ungültige laufende Eingabe.');
    game.draft.rows.forEach((row, player) => {
      if (type === 'salary') integer(row);
      else {
        validateMilestones(row.milestones);
        if (typeof row.cfo !== 'boolean') throw new Error('Ungültiger CFO-Wert.');
        calculateSale(row);
        if (row.houses?.some(h => h.player !== player)) throw new Error('Ungültige Spielerzuordnung eines Hauses.');
      }
    });
    if (game.draft.houseForm !== undefined) {
      const h = game.draft.houseForm;
      if (type !== 'sale' || !h || typeof h.number !== 'string' || h.number.length > 24 || !['normal','garden'].includes(h.type)) throw new Error('Ungültiger Hausentwurf.');
      if (h.player !== null) integer(h.player, game.players.length - 1);
      integer(h.price,100);
      GOODS.forEach(([key]) => integer(h[key]));
    }
  }
  account(game);
  return game;
}
function validateMilestones(m) {
  if (!m || MILESTONES.some(([key]) => typeof m[key] !== 'boolean')) throw new Error('Ungültige Meilensteine.');
}
