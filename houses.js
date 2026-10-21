export const HOUSE_NUMBERS = Array.from({length:19},(_,i) => i+1);
export const NATIVE_GARDENS = [1,3,6,9,11,14,17,19];

// Accept labels used by earlier versions without rewriting saved house names.
export function houseNumber(label) {
  const match = String(label).trim().match(/^(?:(?:Haus|House)\s+)?(\d{1,2})$/i);
  const number = match ? Number(match[1]) : null;
  return HOUSE_NUMBERS.includes(number) ? number : null;
}

export function builtGardenNumbers(game) {
  const numbers = new Set(game.builtGardens || []);
  const rows = [...game.events.filter(event=>event.type==='sale').flatMap(event=>event.rows),
    ...(game.draft?.type==='sale'?game.draft.rows:[]),...(game.draft?.completion?.rows || [])];
  const houses = rows.flatMap(row=>row.houses || []);
  if (game.draft?.houseForm) houses.push(game.draft.houseForm);
  if (game.draft?.completion?.houseForm) houses.push(game.draft.completion.houseForm);
  for (const house of houses) {
    const number = houseNumber(house.number);
    if (number && house.type==='garden' && !NATIVE_GARDENS.includes(number)) numbers.add(number);
  }
  return [...numbers].sort((a,b)=>a-b);
}

export function gardenKind(game, label) {
  const number = houseNumber(label);
  if (!number) return 'none';
  if (NATIVE_GARDENS.includes(number)) return 'native';
  return builtGardenNumbers(game).includes(number) ? 'built' : 'none';
}
