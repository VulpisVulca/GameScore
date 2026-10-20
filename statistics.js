import { GOODS, calculateSale } from './rules.js';

// Rebuild from the ledger so historical corrections also update every chart.
export function gameStatistics(game) {
  const players = game.players.map(p => ({ ...p, income:0, wages:0, balance:0, tips:0, cfo:0, quantity:0, houses:0, gardens:0, bonus:0,
    goods:Object.fromEntries(GOODS.map(([key]) => [key,{quantity:0,income:0}])) }));
  const rounds = [];
  let estimated = false;
  for (const event of game.events) {
    if (event.type === 'sale') {
      const round = { number:event.round, players:[] };
      event.rows.forEach((row,i) => {
        const p = players[i], c = calculateSale(row);
        const goods = Object.fromEntries(GOODS.map(([key]) => [key,0]));
        if (Array.isArray(row.houses)) {
          for (const house of row.houses) {
            const price = (house.price - (row.milestones.price ? 1 : 0)) * (house.type === 'garden' ? 2 : 1);
            for (const [key] of GOODS) goods[key] += house[key] * price;
          }
          p.houses += row.houses.length;
          p.gardens += row.houses.filter(h => h.type === 'garden').length;
        } else {
          // Old records know only the total garden quantity, not its products.
          if (row.garden && GOODS.filter(([key]) => row[key] > 0).length > 1) estimated = true;
          for (const [key] of GOODS) goods[key] = c.quantity ? c.revenue * row[key] / c.quantity : 0;
        }
        for (const [key] of GOODS) {
          const bonus = row.milestones[['burger','pizza'].includes(key) ? key : 'drink'] ? row[key] * 5 : 0;
          goods[key] += bonus;
          p.goods[key].quantity += row[key];
          p.goods[key].income += goods[key];
        }
        p.income += c.total; p.balance += c.total; p.tips += c.tips; p.cfo += c.cfo;
        p.quantity += c.quantity; p.bonus += c.bonus;
        round.players.push({income:c.total,wages:0,net:c.total,balance:p.balance});
      });
      rounds.push(round);
    } else {
      const round = rounds.at(-1);
      event.rows.forEach((count,i) => {
        const cost = count * 5;
        players[i].wages += cost; players[i].balance -= cost;
        if (round) Object.assign(round.players[i],{wages:cost,net:round.players[i].income-cost,balance:players[i].balance});
      });
    }
  }
  return {players,rounds,estimated};
}

export function gameAwards(stats) {
  const result = [];
  function award(title, values, unit = '$', detail = '') {
    const best = Math.max(0,...values);
    if (best <= 0) return;
    result.push({title,value:best,unit,detail,winners:values.flatMap((value,i) => value === best ? [i] : [])});
  }
  const {players,rounds} = stats;
  award('Finanzgenie',players.map(p => p.cfo),'$','Meistes Geld mit CFO');
  award('Trinkgeldkönig',players.map(p => p.tips),'$','Meistes Geld mit Bedienungen');
  for (const [key,label] of GOODS) {
    const name = label.split(' · ')[0];
    award(`${name}-Verkaufsprofi`,players.map(p => p.goods[key].quantity),'Stück',`Meiste ${name} verkauft`);
    award(`${name}-Magnat`,players.map(p => p.goods[key].income),'$',`Meistes Geld mit ${name}`);
  }
  award('Umsatzriese',players.map(p => p.income),'$','Höchste Gesamteinnahmen');
  award('Personalchef',players.map(p => p.wages),'$','Meiste Löhne gezahlt');
  award('Lieferheld',players.map(p => p.houses),'Häuser','Meiste Häuser beliefert');
  award('Gartenprofi',players.map(p => p.gardens),'Häuser','Meiste Häuser mit Garten beliefert');
  award('Meilensteinprofi',players.map(p => p.bonus),'$','Meistes Geld durch Waren-Meilensteine');
  for (const [key,title,detail] of [['income','Rekordrunde','Höchste Einnahmen in einer Runde'],['net','Gewinnsprung','Höchster Rundengewinn nach Löhnen']]) {
    const best = Math.max(0,...rounds.flatMap(r => r.players.map(p => p[key])));
    if (best > 0) result.push({title,value:best,unit:'$',detail,winners:players.flatMap((_,i) => rounds.some(r => r.players[i][key] === best) ? [i] : []),
      rounds:rounds.filter(r => r.players.some(p => p[key] === best)).map(r => r.number)});
  }
  return result;
}
