import { t, html } from './i18n.js';
import { GOODS, allGoods, isCoffeeSale, calculateSale, salaryRate, marketingIncome } from './rules.js';
import { houseId, houseOrder } from './houses.js';

// Rebuild from the ledger so historical corrections also update every chart.
export function gameStatistics(game) {
  const players = game.players.map(p => ({ ...p, income:0, wages:0, balance:0, tips:0, fry:0, cfo:0, marketing:0, quantity:0, houses:0, gardens:0, bonus:0, discount:0,
    goods:Object.fromEntries(allGoods.map(([key]) => [key,{quantity:0,income:0}])) }));
  const rounds = [];
  const visits=game.players.map(()=>new Map());
  let saleRows=[];
  let firstSale=null, firstSaleChecked=false, firstSaleUnavailable=false, housesIncomplete=false;
  const firstGoodsRound=event=>event.rows.some(row=>GOODS.some(([key])=>row[key]>0));
  let estimated = false;
  for (const event of game.events) {
    if (event.type === 'sale') {
      saleRows=event.rows;
      const round = { number:event.round, players:[] };
      if (!firstSaleChecked && firstGoodsRound(event)) {
        firstSaleChecked=true;
        const entries=event.rows.flatMap((row,player)=>(row.houses || []).map(house=>({player,number:houseId(house.number),coffee:isCoffeeSale(house)})));
        const complete=event.rows.every(row=>!GOODS.some(([key])=>row[key]>0)||Array.isArray(row.houses));
        if (complete && entries.length && entries.every(house=>house.number!==null)) {
          const number=[...entries.map(house=>house.number)].sort((a,b)=>houseOrder(a)-houseOrder(b))[0];
          const earliest=entries.filter(house=>house.number===number);
          const coffee=earliest.filter(house=>house.coffee);
          firstSale={number,round:event.round,winners:[...new Set((coffee.length?coffee:earliest).map(house=>house.player))]};
        } else firstSaleUnavailable=true;
      }
      event.rows.forEach((row,i) => {
        const p = players[i], c = calculateSale(row);
        const goods = Object.fromEntries(allGoods.map(([key]) => [key,0]));
        if (Array.isArray(row.houses)) {
          for (const house of row.houses) {
            const price = (house.price - (row.milestones.price ? 1 : 0)) * (house.type === 'garden' ? 2 : 1);
            const quantity = GOODS.reduce((sum,[key])=>sum+house[key],0)+(house.coffee ?? 0);
            p.discount += quantity * Math.max(0,10-(house.price-(row.milestones.price?1:0))) * (house.type==='garden'?2:1);
            for (const [key] of allGoods) goods[key] += (house[key] ?? 0) * price;
            const number=houseId(house.number);
            const label=house.number.trim();
            const key=number!==null?'number:'+number:'label:'+label;
            if (!visits[i].has(key)) visits[i].set(key,{number,label,rounds:new Set()});
            visits[i].get(key).rounds.add(event.round);
          }
          p.houses += row.houses.filter(h=>!isCoffeeSale(h)).length;
          p.gardens += row.houses.filter(h => h.type === 'garden'&&!isCoffeeSale(h)).length;
        } else {
          p.discount += (c.quantity+row.garden+c.coffee+(row.coffeeGarden ?? 0)) * Math.max(0,10-c.price);
          if (c.quantity>0) housesIncomplete=true;
          // Old records know only the total garden quantity, not its products.
          if (row.garden && GOODS.filter(([key]) => row[key] > 0).length > 1) estimated = true;
          for (const [key] of GOODS) goods[key] = c.quantity ? c.revenue * row[key] / c.quantity : 0;
        }
        goods.coffee=c.coffeeRevenue;
        for (const [key] of allGoods) {
          const bonus = key!=='coffee'&&row.milestones[['burger','pizza'].includes(key) ? key : 'drink'] ? row[key] * 5 : 0;
          goods[key] += bonus;
          p.goods[key].quantity += row[key] ?? 0;
          p.goods[key].income += goods[key];
        }
        p.income += c.total; p.balance += c.total; p.tips += c.tips; p.fry += c.fry; p.cfo += c.cfo;
        p.quantity += c.quantity+c.coffee; p.bonus += c.bonus;
        p.gardenQuantity=(p.gardenQuantity || 0)+row.garden+(row.coffeeGarden ?? 0);
        round.players.push({income:c.total,wages:0,net:c.total,balance:p.balance});
      });
      rounds.push(round);
    } else {
      const round = rounds.at(-1);
      event.rows.forEach((count,i) => {
        const cost = count * salaryRate(saleRows[i]), income=marketingIncome(saleRows[i]);
        players[i].wages += cost; players[i].balance += income-cost;
        players[i].marketing += income; players[i].income += income;
        if (round) Object.assign(round.players[i],{income:round.players[i].income+income,wages:cost,net:round.players[i].income+income-cost,balance:players[i].balance});
      });
    }
  }
  players.forEach((player,i)=>{
    player.gardenQuantity ??= 0;
    player.uniqueHouses=visits[i].size;
    player.houseVisits=[...visits[i].values()].map(visit=>({...visit,rounds:[...visit.rounds].sort((a,b)=>a-b)}));
  });
  return {players,rounds,estimated,firstSale,firstSaleUnavailable,housesIncomplete};
}

export function gameAwards(stats) {
  const result = [];
  function award(title, values, unit = '$', detail = '') {
    const best = Math.max(0,...values);
    if (best <= 0) return;
    result.push({title,value:best,unit,detail,winners:values.flatMap((value,i) => value === best ? [i] : [])});
  }
  const {players,rounds} = stats;
  const finalBest=Math.max(0,...players.map(p=>p.balance));
  const champions=players.flatMap((p,i)=>p.balance===finalBest?[i]:[]);
  if (players.length>=2 && finalBest>0) {
    const runnerUp=[...players.map(p=>p.balance)].sort((a,b)=>b-a)[1];
    const gap=finalBest-runnerUp;
    if (gap*20<=finalBest) result.push({title:t('Fotofinish'),detail:t('Abstand zu Platz 2: höchstens 5 % des Gewinnervermögens'),
      value:gap,unit:'$',winners:champions});
  }
  const comebacks=champions.flatMap(player=>rounds.map(round=>({player,round:round.number,
    value:Math.max(...round.players.map(p=>p.balance))-round.players[player].balance})));
  const comebackBest=Math.max(0,...comebacks.map(record=>record.value));
  if (comebackBest>0) {
    const records=comebacks.filter(record=>record.value===comebackBest);
    result.push({title:t('Comeback des Abends'),detail:t('Größten Rückstand am Rundenende nach Löhnen aufgeholt und die Partie gewonnen'),
      value:comebackBest,unit:'$',winners:[...new Set(records.map(record=>record.player))],rounds:[...new Set(records.map(record=>record.round))]});
  }
  const leaders=rounds.map(round=>Math.max(...round.players.map(p=>p.balance)));
  const streaks=players.flatMap((_,player)=>{
    let run=[];
    const records=[];
    for (const [index,round] of rounds.entries()) {
      if (round.players[player].balance!==leaders[index] || leaders[index]<=0) {run=[];continue;}
      if (round.number===run.at(-1)+1) run.push(round.number);
      else {run=[round.number];records.push({player,rounds:run});}
    }
    return records.map(record=>({...record,value:record.rounds.length}));
  });
  const streakBest=Math.max(0,...streaks.map(record=>record.value));
  if (streakBest>=2) {
    const records=streaks.filter(record=>record.value===streakBest);
    result.push({title:t('Dauerbrenner'),detail:t('Längste Serie an der Spitze am Rundenende nach Löhnen, geteilte Führung zählt, mindestens zwei Runden'),value:streakBest,unit:t('Runden'),
      winners:[...new Set(records.map(record=>record.player))],rounds:[...new Set(records.flatMap(record=>record.rounds))].sort((a,b)=>a-b)});
  }
  if (stats.firstSale) result.push({title:t('Erster Verkauf des Spiels'),detail:t('Erster Warenverkauf in Hausnummern-Reihenfolge'),
    value:stats.firstSale.number,house:stats.firstSale.number,winners:stats.firstSale.winners,rounds:[stats.firstSale.round]});
  award(t('Finanzgenie'),players.map(p => p.cfo),'$',t('Meistes Geld mit CFO'));
  award(t('Größter Preisnachlass'),players.map(p=>p.discount),'$',t('Kumulierte Rabatte gegenüber 10 $ pro Ware, inklusive Preis-Meilenstein und doppeltem Rabatt bei Gärten'));
  award(t('Trinkgeldkönig'),players.map(p => p.tips),'$',t('Am meisten Trinkgeld verdient'));
  award(t('Gartenliebling'),players.map(p=>p.gardenQuantity),t('Stück'),t('Meiste Waren an Häuser mit Garten verkauft'));
  award(t('Liebling der Nachbarschaft'),players.map(p=>p.uniqueHouses),t('Häuser'),t('Meiste unterschiedliche Häuser beliefert'));
  const regulars=players.flatMap((p,player)=>p.houseVisits.map(visit=>({...visit,player})));
  const regularBest=Math.max(0,...regulars.map(visit=>visit.rounds.length));
  if (regularBest>=2) {
    const records=regulars.filter(visit=>visit.rounds.length===regularBest);
    result.push({title:t('Stammkundschaft'),detail:t('Dasselbe Haus in den meisten verschiedenen Runden beliefert'),value:regularBest,unit:t('Runden'),
      winners:[...new Set(records.map(record=>record.player))],houseRecords:records});
  }
  const growth=rounds.slice(1).flatMap((round,index)=>round.players.map((p,player)=>({player,round:round.number,value:p.income-rounds[index].players[player].income})));
  const growthBest=Math.max(0,...growth.map(record=>record.value));
  if (growthBest>0) {
    const records=growth.filter(record=>record.value===growthBest);
    result.push({title:t('Wachstumsschub'),detail:t('Größter Zuwachs der Rundeneinnahmen inklusive Trinkgeld und CFO'),value:growthBest,unit:'$',positive:true,
      winners:[...new Set(records.map(record=>record.player))],rounds:[...new Set(records.map(record=>record.round))]});
  }
  for (const [key,label] of allGoods) {
    const name = t(label.split(' · ')[0]);
    award(html`${name}-Verkaufsprofi`,players.map(p => p.goods[key].quantity),t('Stück'),html`Meiste ${name} verkauft`);
    award(html`${name}-Magnat`,players.map(p => p.goods[key].income),'$',html`Meistes Geld mit ${name}`);
  }
  award(t('Umsatzriese'),players.map(p => p.income),'$',t('Höchste Gesamteinnahmen'));
  award(t('Personalchef'),players.map(p => p.wages),'$',t('Meiste Löhne gezahlt'));
  award(t('Lieferheld'),players.map(p => p.houses),t('Häuser'),t('Meiste Häuser beliefert'));
  award(t('Gartenprofi'),players.map(p => p.gardens),t('Häuser'),t('Meiste Häuser mit Garten beliefert'));
  award(t('Meilensteinprofi'),players.map(p => p.bonus),'$',t('Meistes Geld durch Waren-Meilensteine'));
  for (const [key,title,detail] of [['income',t('Rekordrunde'),t('Höchste Einnahmen in einer Runde')],['net',t('Gewinnsprung'),t('Höchster Rundengewinn nach Löhnen')]]) {
    const best = Math.max(0,...rounds.flatMap(r => r.players.map(p => p[key])));
    if (best > 0) result.push({title,value:best,unit:'$',detail,winners:players.flatMap((_,i) => rounds.some(r => r.players[i][key] === best) ? [i] : []),
      rounds:rounds.filter(r => r.players.some(p => p[key] === best)).map(r => r.number)});
  }
  return result;
}
