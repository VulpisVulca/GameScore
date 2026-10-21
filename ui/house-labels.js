import { houseId, houseNumber, isApartment, isRural } from '../houses.js';
import { html, t } from '../i18n.js';
import { esc } from './common.js';
import { allGoods } from '../rules.js';

export function houseLabel(label) {
  if (isRural(label)) return t('Ländliches Gebiet');
  if (isApartment(label)) return html`Apartment ${houseId(label)}`;
  const number = houseNumber(label);
  return number ? html`Haus ${number}` : esc(label);
}

export function houseDescription(house) {
  return allGoods
    .filter(([key]) => house[key])
    .map(([key, label]) => html`${house[key]} ${t(label.split(' · ')[0])}`)
    .join(' · ');
}

export function houseSetting(h) {
  return html`${h.type === 'garden' ? t('Mit Garten') : t('Ohne Garten')}${h.park ? html` · 🌳 ${t('Park')}` : ''}`;
}
