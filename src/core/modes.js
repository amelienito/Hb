// Niveau de difficulté par jeu (facile, normal, difficile), modifiable à tout moment.
import { get, set } from './store.js';
import { h } from './ui.js';

export const MODES = [
  { id: 'facile', label: 'Facile' },
  { id: 'normal', label: 'Normal' },
  { id: 'difficile', label: 'Difficile' },
];

export function getMode(game) { return (get('modes', {})[game]) || 'normal'; }
export function setMode(game, m) { const all = get('modes', {}); all[game] = m; set('modes', all); }

// Petit sélecteur à trois positions. onChange(mode) est appelé à chaque changement.
export function modeSwitch(game, onChange) {
  const box = h('div', { class: 'mode-switch', role: 'radiogroup', 'aria-label': 'Difficulté' });
  const paint = () => {
    const cur = getMode(game);
    box.querySelectorAll('button').forEach(b => {
      const on = b.dataset.m === cur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  };
  for (const m of MODES) {
    box.append(h('button', { type: 'button', role: 'radio', 'data-m': m.id, onclick: () => { setMode(game, m.id); paint(); onChange && onChange(m.id); } }, m.label));
  }
  paint();
  box.refresh = paint;
  return box;
}
