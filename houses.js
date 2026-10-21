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

export function builtGardenOrigins(game) {
  const origins={...game.builtGardenRounds};
  const currentRound=Math.floor(game.events.length/2)+1;
  function record(house,round) {
    const number=houseNumber(house.number);
    if (number && house.type==='garden' && !NATIVE_GARDENS.includes(number)) origins[number]=Math.min(origins[number] ?? Infinity,round);
  }
  for (const event of game.events) if (event.type==='sale') {
    for (const row of event.rows) for (const house of row.houses || []) record(house,event.round);
  }
  const draft=game.draft?.completion || (game.draft?.type==='sale'?game.draft:null);
  if (draft) {
    for (const row of draft.rows || []) for (const house of row.houses || []) record(house,currentRound);
    if (draft.houseForm) record(draft.houseForm,currentRound);
  }
  for (const number of builtGardenNumbers(game)) origins[number] ??= currentRound;
  return origins;
}

export function canRemoveBuiltGarden(game,label,round) {
  const number=houseNumber(label);
  return number!==null && gardenKind(game,number)==='built' && builtGardenOrigins(game)[number]===round;
}

export function gardenKindAtRound(game,label,round) {
  const kind=gardenKind(game,label);
  return kind==='built' && builtGardenOrigins(game)[houseNumber(label)]>round ? 'none' : kind;
}

// Correct the construction decision and all automatically inherited house sales.
// Work on a copy so leaving the round editor never changes confirmed history.
export function removeBuiltGarden(game,label,round) {
  const number=houseNumber(label);
  if (!canRemoveBuiltGarden(game,number,round)) throw new Error('Garden can only be removed in its construction round.');
  const next=structuredClone(game);
  next.builtGardens=builtGardenNumbers(game).filter(value=>value!==number);
  next.builtGardenRounds=builtGardenOrigins(game);
  delete next.builtGardenRounds[number];
  function correctHouse(house) {
    if (houseNumber(house.number)===number && house.type==='garden') { house.type='normal'; return true; }
    return false;
  }
  function correctRows(rows) {
    let changed=false;
    for (const row of rows) if (Array.isArray(row.houses)) {
      for (const house of row.houses) if (correctHouse(house)) changed=true;
      row.garden=row.houses.filter(house=>house.type==='garden').reduce((sum,house)=>sum+['burger','pizza','beer','lemonade','soda'].reduce((count,key)=>count+house[key],0),0);
    }
    return changed;
  }
  for (const event of next.events) if (event.type==='sale' && event.round>=round && correctRows(event.rows)) event.updatedAt=new Date().toISOString();
  const draft=next.draft?.completion || (next.draft?.type==='sale'?next.draft:null);
  if (draft) {
    correctRows(draft.rows);
    if (draft.houseForm) correctHouse(draft.houseForm);
  }
  return next;
}
