import { en } from './locales/en.js';

const LANGUAGE_KEY = 'gamescores.language';
let language = 'de';
try {
  if (localStorage.getItem(LANGUAGE_KEY) === 'en') language = 'en';
} catch {}

export const getLanguage = () => language;
export const locale = () => (language === 'en' ? 'en-US' : 'de-DE');
export function setLanguage(value) {
  if (!['de', 'en'].includes(value)) return;
  language = value;
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {}
}
export function t(source) {
  if (language !== 'en') return source;
  if (en[source] !== undefined) return en[source];
  const key = decodeText(source.trim());
  if (en[key] === undefined) return source;
  return (
    source.slice(0, source.indexOf(source.trim())) +
    en[key] +
    source.slice(source.indexOf(source.trim()) + source.trim().length)
  );
}

const entities = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ouml: 'ö',
  auml: 'ä',
  uuml: 'ü',
  Ouml: 'Ö',
  Auml: 'Ä',
  Uuml: 'Ü',
  szlig: 'ß',
  rarr: '→',
  larr: '←',
  middot: '·',
  nbsp: ' ',
};
export const decodeText = (text) =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, key) =>
    key[0] === '#'
      ? String.fromCodePoint(key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : +key.slice(1))
      : (entities[key] ?? match),
  );

// Translate only source text. Interpolated names, house labels, and HTML are
// inserted afterwards and are never searched or replaced by the translator.
function segment(text) {
  const slots = [];
  const source = decodeText(text.trim())
    .replace(/\s+/g, ' ')
    .replace(/\uE000\d+\uE001/g, (token) => `{${slots.push(token) - 1}}`);
  if (!source) return text;
  const translated = t(source).replace(/\{(\d+)\}/g, (match, i) => slots[i] ?? match);
  return (
    text.slice(0, text.indexOf(text.trim())) +
    translated +
    text.slice(text.indexOf(text.trim()) + text.trim().length)
  );
}
export function sourceSegments(source) {
  const result = [];
  for (const part of source.split(/(<[^>]*>)/g)) {
    if (part.startsWith('<')) {
      for (const match of part.matchAll(/\b(?:aria-label|title|placeholder|aria-description)="([^"]*)"/g))
        result.push(match[1]);
    } else result.push(part);
  }
  return result;
}
export function html(strings, ...values) {
  const source = strings.reduce(
    (text, part, i) => text + part + (i < values.length ? `\uE000${i}\uE001` : ''),
    '',
  );
  const translated = source
    .split(/(<[^>]*>)/g)
    .map((part) =>
      part.startsWith('<')
        ? part.replace(
            /\b(aria-label|title|placeholder|aria-description)="([^"]*)"/g,
            (_, attribute, text) => `${attribute}="${segment(text)}"`,
          )
        : segment(part),
    )
    .join('');
  return translated.replace(/\uE000(\d+)\uE001/g, (_, i) => values[i]);
}
export const htmlText = (source) => html([source]);
