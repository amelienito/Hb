// Ordre des missions, pour passer facilement d'un jeu au suivant.
import { h } from './ui.js';

export const MISSIONS = [
  { key: 'reacteur', name: 'Réacteur' },
  { key: 'rivaux', name: 'Rivaux Marvel' },
  { key: 'flair', name: 'Flair' },
  { key: 'chaussette', name: 'Opération chaussette' },
  { key: 'prefs', name: 'Tu préfères ?' },
  { key: 'interview', name: 'L’interview' },
];

export function nextMission(key) {
  const i = MISSIONS.findIndex(m => m.key === key);
  return MISSIONS[(i + 1) % MISSIONS.length];
}

// Bouton « Mission suivante : … » pour les fenêtres de fin.
export function nextMissionButton(key, primary = false) {
  const n = nextMission(key);
  return h('a', { class: 'btn' + (primary ? '' : ' ghost') + ' next-mission', href: '#/' + n.key, 'aria-label': `Mission suivante : ${n.name}` },
    h('small', {}, 'Mission suivante'), h('span', {}, n.name));
}
