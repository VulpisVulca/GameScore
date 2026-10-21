import { GOODS, integer } from './rules.js';

export const hasMeal = (house) =>
  GOODS.some(([key]) => house[key] > 0) || house.noodles > 0 || house.sushi > 0;
export const sushiAvailable = (house) => Boolean(house.number) && house.type === 'garden';

// Changing one product always leaves a compatible meal, or an empty selection.
export function selectGoods(house, key, value) {
  const next = { ...house, [key]: integer(value) };
  if (key === 'sushi' && !sushiAvailable(next)) next.sushi = 0;
  if (next[key] > 0) {
    if (key === 'noodles' || key === 'sushi') {
      for (const [other] of GOODS) next[other] = 0;
      next[key === 'noodles' ? 'sushi' : 'noodles'] = 0;
    } else if (GOODS.some(([other]) => other === key)) next.noodles = next.sushi = 0;
  }
  if (!hasMeal(next)) next.kimchi = 0;
  return next;
}

export function normalizeMeal(house) {
  let next = { ...house };
  if (!sushiAvailable(next)) next.sushi = 0;
  if (next.sushi > 0) next = selectGoods(next, 'sushi', next.sushi);
  else if (next.noodles > 0) next = selectGoods(next, 'noodles', next.noodles);
  if (!hasMeal(next)) next.kimchi = 0;
  return next;
}
