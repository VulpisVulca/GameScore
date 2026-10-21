import { t, html } from './i18n.js';
import { houseOptions, houseId, isNativeGarden, isApartment } from './houses.js';
export const GOODS = [
  ['burger', 'Burger', '🍔'], ['pizza', 'Pizza', '🍕'],
  ['beer', 'Bier · braun', '🟤'], ['lemonade', 'Limonade · gelb', '🟡'], ['soda', 'Softdrinks · rot', '🔴']
];
export const COFFEE = ['coffee','Kaffee','☕'];
export const allGoods = [...GOODS,COFFEE];
export const isCoffeeSale = house => (house.coffee ?? 0)>0;
export const sameHouse = (a,b) => (houseId(a) ?? String(a).trim())===(houseId(b) ?? String(b).trim());
export function validateCoffeeSales(rows) {
  if (rows.some(row=>(row.coffee ?? 0)>0&&!Array.isArray(row.houses))) throw new Error(t('Kaffee benötigt erfasste Hausverkäufe.'));
  const houses=rows.flatMap(row=>row.houses || []);
  for (const house of houses.filter(isCoffeeSale)) {
    const meals=houses.filter(other=>!isCoffeeSale(other)&&sameHouse(other.number,house.number));
    if (!meals.length) throw new Error(t('Kaffee benötigt einen erfassten Essensverkauf für dieses Haus.'));
    if (meals.some(meal=>meal.type!==house.type)) throw new Error(t('Kaffee und Essen müssen denselben Gartenstatus haben.'));
  }
}
export const MILESTONES = [
  ['burger', 'Erster Burger vermarktet', '+5 $ je Burger'],
  ['pizza', 'Erste Pizza vermarktet', '+5 $ je Pizza'],
  ['drink', 'Erstes Getränk vermarktet', '+5 $ je Getränk'],
  ['waitress', 'Erste Bedienung eingesetzt', '5 $ statt 3 $ je Bedienung'],
  ['price', 'Als Erster Preise gesenkt', '−1 $ auf den Stückpreis'],
  ['cfo', 'Als Erster 100 $ erreicht', 'CFO immer aktiv · ab nächster Runde']
];
export const NEW_MILESTONES = [
  ['marketeer','Erster Marketeer eingesetzt','5 $ je Nachfragemarker · Entfernung −2'],
  ['salary','Erste Bedienung eingesetzt','3 $ Lohn je Mitarbeiter'],
  ['beer','Erstes Bier verkauft','Warenzahlung selbst berücksichtigen'],
  ['discount','Erster Discount Manager eingesetzt','Ab 3 $ Preisnachlass: 100 $ aus der Bank entfernen']
];
export const milestoneList = m => m?.newSet ? NEW_MILESTONES : MILESTONES;
export function emptyMilestones(set='base') {
  return {...Object.fromEntries([...MILESTONES,...NEW_MILESTONES].map(([key])=>[key,false])),newSet:set==='new'};
}
export const salaryRate = row => row?.milestones?.salary ? 3 : 5;
export const marketingIncome = row => row?.milestones?.marketeer ? integer(row.demand ?? 0)*5 : 0;
export const bankRemoval = row => row.milestones.discount && row.price<=7 ? 100 : 0;
export const COLORS = ['#b34335', '#d3a323', '#336f9b', '#4e8052', '#75548c', '#c55b86'];
export function integer(value, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw new Error(t('Bitte eine gültige, nicht negative ganze Zahl eingeben.'));
  return value;
}
export function emptySale(milestones = {}) {
  return { burger: 0, pizza: 0, beer: 0, lemonade: 0, soda: 0, coffee:0, coffeeGarden:0, waitresses: 0, price: 10, garden: 0, cfo: false, demand:0, milestones: { ...milestones } };
}
export function calculateHouse(house, milestones = {}) {
  if (!house || !['normal', 'garden'].includes(house.type) || typeof house.number !== 'string' || house.number.length > 24) throw new Error(t('Bitte ein gültiges Haus auswählen.'));
  if (isApartment(house.number) && house.type==='garden') throw new Error(t('Apartments können keinen Garten haben.'));
  if (house.order !== undefined) integer(house.order);
  const quantity = GOODS.reduce((sum, [key]) => sum + integer(house[key]), 0);
  const coffee = integer(house.coffee ?? 0);
  if (!quantity && !coffee) throw new Error(t('Bitte mindestens eine verkaufte Ware eingeben.'));
  if (quantity && coffee) throw new Error(t('Kaffee bitte als eigenen Verkauf erfassen.'));
  const price = integer(house.price, 100) - (milestones.price ? 1 : 0);
  if (price < 0) throw new Error(t('Der Stückpreis darf nach dem Meilenstein nicht negativ sein.'));
  const revenue = quantity * price * (house.type === 'garden' ? 2 : 1);
  const coffeeRevenue = coffee * price * (house.type === 'garden' ? 2 : 1);
  const bonus = (milestones.burger ? house.burger * 5 : 0) + (milestones.pizza ? house.pizza * 5 : 0) + (milestones.drink ? (house.beer + house.lemonade + house.soda) * 5 : 0);
  return { quantity, coffee, revenue, coffeeRevenue, bonus, total: revenue + coffeeRevenue + bonus };
}
export function houseRows(configs, houses) {
  if (!Array.isArray(houses) || houses.length > 1000) throw new Error(t('Zu viele Hausverkäufe.'));
  const rows = configs.map(config => ({ ...emptySale(config.milestones), waitresses: config.waitresses, cfo: config.cfo, price: config.price, demand:config.demand ?? 0, houses: [] }));
  for (const house of houses) {
    const player = integer(house.player, rows.length - 1);
    const row = rows[player];
    const result = calculateHouse(house, row.milestones);
    row.houses.push(structuredClone(house));
    GOODS.forEach(([key]) => { row[key] += house[key]; });
    row.coffee += result.coffee;
    if (house.type === 'garden') row.garden += result.quantity;
    if (house.type === 'garden') row.coffeeGarden += result.coffee;
  }
  validateCoffeeSales(rows);
  return rows;
}
export function calculateSale(sale) {
  const m = sale.milestones;
  const quantity = GOODS.reduce((sum, [key]) => sum + integer(sale[key]), 0);
  integer(sale.demand ?? 0);
  const price = integer(sale.price, 100) - (m.price ? 1 : 0);
  if (price < 0) throw new Error(t('Der Stückpreis darf nach dem Meilenstein nicht negativ sein.'));
  const garden = integer(sale.garden);
  const coffee=integer(sale.coffee ?? 0), coffeeGarden=integer(sale.coffeeGarden ?? 0);
  if (coffeeGarden>coffee) throw new Error(t('Ungültige Garten-Kaffeemenge.'));
  if (garden > quantity) throw new Error(t('Gartenwaren dürfen die verkaufte Gesamtmenge nicht übersteigen.'));
  let revenue = (quantity + garden) * price;
  let coffeeRevenue=(coffee+coffeeGarden)*price;
  if (sale.houses !== undefined) {
    if (!Array.isArray(sale.houses) || sale.houses.length > 1000) throw new Error(t('Ungültige Hausverkäufe.'));
    const counts = Object.fromEntries(GOODS.map(([key]) => [key, 0]));
    let gardenCount = 0;
    let coffeeCount=0, gardenCoffee=0;
    coffeeRevenue=0;
    revenue = sale.houses.reduce((sum, house) => {
      const result = calculateHouse(house, m);
      GOODS.forEach(([key]) => { counts[key] += house[key]; });
      if (house.type === 'garden') gardenCount += result.quantity;
      coffeeCount+=result.coffee;
      if (house.type==='garden') gardenCoffee+=result.coffee;
      coffeeRevenue+=result.coffeeRevenue;
      return sum + result.revenue;
    }, 0);
    if (GOODS.some(([key]) => counts[key] !== sale[key]) || gardenCount !== garden) throw new Error(t('Hausverkäufe und Warenübersicht stimmen nicht überein.'));
    if (coffeeCount!==coffee || gardenCoffee!==coffeeGarden) throw new Error(t('Kaffeeverkäufe und Übersicht stimmen nicht überein.'));
  }
  const bonus = (m.burger ? sale.burger * 5 : 0) + (m.pizza ? sale.pizza * 5 : 0) + (m.drink ? (sale.beer + sale.lemonade + sale.soda) * 5 : 0);
  const tips = integer(sale.waitresses) * (m.waitress ? 5 : 3);
  const cfo = sale.cfo || m.cfo ? Math.ceil((revenue + coffeeRevenue + bonus + tips) / 2) : 0;
  return { quantity, coffee, price, revenue, coffeeRevenue, bonus, tips, cfo, total: revenue + coffeeRevenue + bonus + tips + cfo };
}
export function account(game) {
  const balances = game.players.map(() => 0);
  let bank = game.players.length * 50;
  let firstBreak = null;
  let secondBreak = null;
  const issues = [];
  for (let index = 0; index < game.events.length; index++) {
    const event = game.events[index];
    if (secondBreak !== null) issues.push(t('Nach dem Spielende liegen weitere Buchungen vor. Bitte spätere Runden entfernen.'));
    if (event.type === 'sale') {
      // Restructuring precedes Dinnertime. Removed cash never belongs to a player.
      bank -= event.rows.reduce((sum,row)=>sum+bankRemoval(row),0);
      event.rows.forEach((row, player) => { const total = calculateSale(row).total; balances[player] += total; bank -= total; });
      if (bank <= 0 && firstBreak === null) {
        firstBreak = index;
        if (game.reserves) bank += game.reserves.reduce((sum, value) => sum + value, 0);
      }
      if (bank <= 0 && firstBreak !== null && game.reserves && secondBreak === null) secondBreak = index;
    } else {
      event.rows.forEach((count, player) => {
        const row=game.events[index-1]?.rows[player];
        const cost = integer(count) * salaryRate(row);
        if (cost > balances[player]) issues.push(html`${game.players[player].name}: Lohn übersteigt das Guthaben in Runde ${event.round}.`);
        balances[player] -= cost;
        bank += cost;
      });
      // Marketing follows Payday: these earnings cannot fund this round's wages.
      event.rows.forEach((_,player)=>{
        const income=marketingIncome(game.events[index-1]?.rows[player]);
        balances[player]+=income; bank-=income;
      });
      if (bank<=0 && firstBreak===null) {
        firstBreak=index;
        if (game.reserves) bank+=game.reserves.reduce((sum,n)=>sum+n,0);
      }
      // A later bank break during Marketing ends the game at the next Dinnertime.
    }
  }
  return { bank, balances, firstBreak, secondBreak, needsReserve: firstBreak !== null && !game.reserves, issues: [...new Set(issues)] };
}
export function roundSettlement(game, rows, wages, index = null, reserves = game.reserves) {
  if (rows.length !== game.players.length || wages.length !== game.players.length) throw new Error(t('Ungültige Anzahl Spieler.'));
  wages.forEach(n => integer(n));
  rows.forEach(row=>validateCoffeeModule(row,game));
  validateCoffeeSales(rows);
  const position = index === null ? game.events.length : index;
  integer(position, game.events.length);
  if (position % 2 !== 0 || position > game.events.length || (index !== null && game.events[position]?.type !== 'sale')) throw new Error(t('Ungültige Verkaufsrunde.'));
  if (reserves !== null && (!Array.isArray(reserves) || reserves.length !== game.players.length || reserves.some(n => ![100,200,300].includes(n)))) throw new Error(t('Ungültige Reservekarten.'));
  const round = Math.floor(position / 2) + 1;
  const oldSale = game.events[position];
  const oldSalary = game.events[position + 1]?.type === 'salary' ? game.events[position + 1] : null;
  const prefix = game.events.slice(0, position);
  const suffix = game.events.slice(position + (oldSalary ? 2 : oldSale ? 1 : 0));
  const time = new Date().toISOString();
  const sale = { ...oldSale, type:'sale', round, rows:structuredClone(rows), createdAt:oldSale?.createdAt || time, combined:true, ...(oldSale ? {updatedAt:time} : {}) };
  const candidate = { ...structuredClone(game), reserves:reserves && [...reserves] };
  const before = account({ ...candidate, events:prefix });
  const afterSales = account({ ...candidate, events:[...prefix,sale] });
  const incomes = rows.map(row => calculateSale(row).total);
  if (afterSales.needsReserve) return {candidate:null,before,afterSales,incomes,expenses:null,balances:null,needsReserve:true,ended:false,issues:[]};
  const ended = afterSales.secondBreak !== null;
  const expenses = wages.map((n,i) => ended ? 0 : n * salaryRate(rows[i]));
  const marketing = rows.map(row=>ended?0:marketingIncome(row));
  const removed = rows.map(bankRemoval);
  const salary = { ...oldSalary, type:'salary', round, rows:[...wages], createdAt:oldSalary?.createdAt || time, combined:true, ...(oldSalary ? {updatedAt:time} : {}) };
  const events = [...prefix,sale,...(ended ? [] : [salary])];
  const after = account({ ...candidate, events });
  if (after.needsReserve) return {candidate:null,before,afterSales,incomes,expenses,marketing,removed,balances:null,needsReserve:true,ended:false,issues:[]};
  candidate.events = [...events,...suffix];
  if (index === null || (position === game.events.length - 1 && game.draft?.type === 'salary')) candidate.draft = null;
  const issues = account(candidate).issues;
  return {candidate,before,afterSales,incomes,expenses,marketing,removed,balances:after.balances,needsReserve:false,ended,issues};
}
export function validateGame(game) {
  if (!game || game.version !== 1 || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 6) throw new Error(t('Kein gültiger GameScores-Spielstand.'));
  if (game.modules!==undefined && (!game.modules || typeof game.modules!=='object' || Array.isArray(game.modules) || Object.entries(game.modules).some(([key,value])=>!['newDistricts','apartments','coffee'].includes(key)||typeof value!=='boolean'))) throw new Error(t('Ungültige Erweiterungsmodule.'));
  const gardenNumbers=houseOptions(game).filter(number=>typeof number==='number'&&!isNativeGarden(number));
  if (game.milestoneSet!==undefined && !['base','new'].includes(game.milestoneSet)) throw new Error(t('Ungültiger Meilensteinsatz.'));
  if (game.builtGardens !== undefined && (!Array.isArray(game.builtGardens) || game.builtGardens.length > gardenNumbers.length || new Set(game.builtGardens).size !== game.builtGardens.length || game.builtGardens.some(number => !gardenNumbers.includes(number)))) throw new Error(t('Ungültige gebaute Gärten.'));
  if (game.builtGardenRounds !== undefined && (!game.builtGardenRounds || typeof game.builtGardenRounds!=='object' || Array.isArray(game.builtGardenRounds) || Object.keys(game.builtGardenRounds).length>gardenNumbers.length || Object.entries(game.builtGardenRounds).some(([number,round])=>String(Number(number))!==number || !gardenNumbers.includes(Number(number)) || !Number.isSafeInteger(round) || round<1 || round>10001))) throw new Error(t('Ungültige Garten-Baurunden.'));
  game.players.forEach(p => {
    if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40 || !COLORS.includes(p.color)) throw new Error(t('Ungültige Spielerdaten.'));
    validateMilestones(p.milestones,game.milestoneSet==='new');
  });
  if (new Set(game.players.map(p => p.color)).size !== game.players.length) throw new Error(t('Jede Farbe darf nur einmal vergeben sein.'));
  if (game.reserves !== null && (!Array.isArray(game.reserves) || game.reserves.length !== game.players.length || game.reserves.some(n => ![100, 200, 300].includes(n)))) throw new Error(t('Ungültige Reservekarten.'));
  if (!Array.isArray(game.events) || game.events.length > 10000) throw new Error(t('Ungültiges Protokoll.'));
  game.events.forEach((event, index) => {
    if (event.type !== (index % 2 ? 'salary' : 'sale') || event.round !== Math.floor(index / 2) + 1 || !Array.isArray(event.rows) || event.rows.length !== game.players.length) throw new Error(t('Ungültige Rundenfolge.'));
    if (event.type === 'sale') event.rows.forEach((row, player) => {
      validateMilestones(row.milestones,game.milestoneSet==='new');
      if (typeof row.cfo !== 'boolean') throw new Error(t('Ungültiger CFO-Wert.'));
      calculateSale(row);
      validateCoffeeModule(row,game);
      if (row.houses?.some(h => h.player !== player)) throw new Error(t('Ungültige Spielerzuordnung eines Hauses.'));
    });
    else event.rows.forEach(n => integer(n));
    if (event.type==='sale') validateCoffeeSales(event.rows);
  });
  if (game.draft) {
    const type = game.events.length % 2 ? 'salary' : 'sale';
    if (game.draft.type !== type || !Array.isArray(game.draft.rows) || game.draft.rows.length !== game.players.length) throw new Error(t('Ungültige laufende Eingabe.'));
    game.draft.rows.forEach((row, player) => {
      if (type === 'salary') integer(row);
      else {
        validateMilestones(row.milestones,game.milestoneSet==='new');
        if (typeof row.cfo !== 'boolean') throw new Error(t('Ungültiger CFO-Wert.'));
        calculateSale(row);
        validateCoffeeModule(row,game);
        if (row.houses?.some(h => h.player !== player)) throw new Error(t('Ungültige Spielerzuordnung eines Hauses.'));
      }
    });
    if (type==='sale') validateCoffeeSales(game.draft.rows);
    if (game.draft.wages !== undefined) {
      if (type !== 'sale' || !Array.isArray(game.draft.wages) || game.draft.wages.length !== game.players.length) throw new Error(t('Ungültiger Lohnentwurf.'));
      game.draft.wages.forEach(n => integer(n));
    }
    if (game.draft.reserves !== undefined && game.draft.reserves !== null && (!Array.isArray(game.draft.reserves) || game.draft.reserves.length !== game.players.length || game.draft.reserves.some(n => ![100,200,300].includes(n)))) throw new Error(t('Ungültige Reservekarten im Entwurf.'));
    if (game.draft.removedGardens !== undefined && (!Array.isArray(game.draft.removedGardens) || game.draft.removedGardens.length>gardenNumbers.length || new Set(game.draft.removedGardens).size!==game.draft.removedGardens.length || game.draft.removedGardens.some(number=>!gardenNumbers.includes(number)))) throw new Error(t('Ungültige Gartenkorrektur.'));
    if (game.draft.houseForm !== undefined) {
      const h = game.draft.houseForm;
      if (type !== 'sale' || !h || typeof h.number !== 'string' || h.number.length > 24 || !['normal','garden'].includes(h.type)) throw new Error(t('Ungültiger Hausentwurf.'));
      if (isApartment(h.number)&&h.type==='garden') throw new Error(t('Apartments können keinen Garten haben.'));
      if (h.player !== null) integer(h.player, game.players.length - 1);
      integer(h.price,100);
      GOODS.forEach(([key]) => integer(h[key]));
      integer(h.coffee ?? 0);
      if (h.coffees!==undefined) {
        if (!Array.isArray(h.coffees)||h.coffees.length!==game.players.length) throw new Error(t('Ungültiger Kaffeeentwurf.'));
        h.coffees.forEach(n=>integer(n));
        if (h.coffees.some(n=>n>0)&&!game.modules?.coffee) throw new Error(t('Das Kaffeemodul ist nicht aktiviert.'));
      }
      if ((h.coffee ?? 0)>0&&!game.modules?.coffee) throw new Error(t('Das Kaffeemodul ist nicht aktiviert.'));
    }
    if (game.draft.completion !== undefined) {
      const completion = game.draft.completion;
      if (type !== 'salary' || !completion || game.events.at(-1)?.type !== 'sale') throw new Error(t('Ungültiger Rundenentwurf.'));
      validateGame({...game,events:game.events.slice(0,-1),draft:{type:'sale',rows:completion.rows,houseForm:completion.houseForm,reserves:completion.reserves,wages:game.draft.rows,removedGardens:completion.removedGardens}});
    }
  }
  account(game);
  return game;
}
function validateMilestones(m,newSet) {
  if (!m || MILESTONES.some(([key]) => typeof m[key] !== 'boolean')) throw new Error(t('Ungültige Meilensteine.'));
  if (['newSet','coffee',...NEW_MILESTONES.map(([key])=>key)].some(key=>m[key]!==undefined&&typeof m[key]!=='boolean')) throw new Error(t('Ungültige Meilensteine.'));
  if (Boolean(m.newSet)!==newSet || (!m.newSet && NEW_MILESTONES.some(([key])=>m[key]))) throw new Error(t('Ungültige Meilensteine.'));
  if (m.newSet && (MILESTONES.some(([key])=>m[key]) || NEW_MILESTONES.some(([key])=>typeof m[key]!=='boolean'))) throw new Error(t('Ungültige Meilensteine.'));
}
function validateCoffeeModule(row,game) {
  if ((row.coffee ?? 0)>0 && !game.modules?.coffee) throw new Error(t('Das Kaffeemodul ist nicht aktiviert.'));
}
