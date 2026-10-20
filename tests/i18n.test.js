import test from 'node:test';
import assert from 'node:assert/strict';
import { t, html, htmlText, locale, setLanguage, getLanguage } from '../i18n.js';
import { en } from '../locales/en.js';
import { calculateSale, emptySale, account } from '../rules.js';
import { gameStatistics, gameAwards } from '../statistics.js';
import { renderStatistics } from '../statistics-view.js';

test('Language switches texts and formats, rejects unsupported languages and works without storage', () => {
  try {
    setLanguage('en');
    assert.equal(getLanguage(),'en');
    assert.equal(t('Meilensteine'),'Milestones');
    assert.equal((1234.5).toLocaleString(locale()),'1,234.5');
    setLanguage('invalid');
    assert.equal(getLanguage(),'en');
    setLanguage('de');
    assert.equal(t('Meilensteine'),'Meilensteine');
    assert.equal((1234.5).toLocaleString(locale()),'1.234,5');
  } finally { setLanguage('de'); }
});

test('Templates translate source text and accessibility attributes while preserving interpolated user data', () => {
  try {
    setLanguage('en');
    assert.equal(html(['<p>Runde ','</p><strong>','</strong>'],2,'Meilensteine'),'<p>Round 2</p><strong>Meilensteine</strong>');
    assert.equal(html(['<button aria-label="Runde ',' bearbeiten">Bearbeiten</button>'],3),'<button aria-label="Edit round 3">Edit</button>');
    assert.equal(html(['<input value="','" placeholder="z. B. Haus 7">'],'Haus Runde Protokoll'),'<input value="Haus Runde Protokoll" placeholder="e.g. House 7">');
    assert.equal(html(['<span>','</span>'],html(['Runde ',''],5)),'<span>Round 5</span>');
    assert.equal(htmlText('<p>Keine Meilensteine</p>'),'<p>No milestones</p>');
    assert.equal(t('Gewinner &middot; '),'Winner · ');
    assert.equal(t(' · aktiv'),' · active');
  } finally { setLanguage('de'); }
});

test('Every translation retains all source placeholders', () => {
  const slots=text => [...text.matchAll(/\{\d+\}/g)].map(match=>match[0]).sort();
  for (const [source,translation] of Object.entries(en)) {
    assert.ok(translation.length>0,source);
    assert.deepEqual(slots(translation),slots(source),source);
  }
});

test('English validation preserves player names and leaves financial results unchanged', () => {
  const sale={...emptySale({burger:true}),burger:2,waitresses:1,cfo:true};
  const expected=calculateSale(sale);
  try {
    setLanguage('en');
    assert.deepEqual(calculateSale(sale),expected);
    assert.throws(()=>calculateSale({...sale,burger:-1}),/valid, non-negative whole number/);
    const game={players:[{name:'Löhne'},{name:'Kim'}],events:[{type:'sale',round:1,rows:[sale,emptySale()]},{type:'salary',round:1,rows:[100,0]}],reserves:null};
    assert.match(account(game).issues[0],/^Löhne: salaries exceed the balance in round 1\.$/);
  } finally { setLanguage('de'); }
});

test('Statistics and awards follow language changes without modifying the ledger', () => {
  const game={players:[{name:'Meilensteine',color:'#b34335'},{name:'Kim',color:'#336f9b'}],events:[{type:'sale',round:1,rows:[{...emptySale(),beer:2},emptySale()]}]};
  const original=JSON.stringify(game);
  try {
    setLanguage('en');
    assert.ok(gameAwards(gameStatistics(game)).some(a=>a.title==='Beer magnate'));
    assert.match(renderStatistics(game),/The game in numbers/);
    assert.match(renderStatistics(game),/Meilensteine/);
    setLanguage('de');
    assert.ok(gameAwards(gameStatistics(game)).some(a=>a.title==='Bier-Magnat'));
    assert.match(renderStatistics(game),/Die Partie in Zahlen/);
    assert.equal(JSON.stringify(game),original);
  } finally { setLanguage('de'); }
});
