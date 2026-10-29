// Ordre des missions, pour passer facilement d'un jeu au suivant.
import { h, backButton } from './ui.js';

export const MISSIONS = [
  { key: 'reacteur', name: 'Réacteur' },
  { key: 'rivaux', name: 'Rivaux Marvel' },
  { key: 'flair', name: 'Flair' },
  { key: 'chaussette', name: 'Opération Osmose' },
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

// Barre du haut commune aux jeux : retour (+ boutons utiles) à gauche, titre, « Jeu suivant » à droite.
export function gameBar(key, title, ...left) {
  const n = nextMission(key);
  return h('header', { class: 'g-bar' },
    h('div', { class: 'g-left' }, backButton(), ...left),
    h('div', { class: 'g-title' }, title),
    h('a', { class: 'g-next', href: '#/' + n.key, 'aria-label': `Jeu suivant : ${n.name}`, title: `Jeu suivant : ${n.name}` },
      h('span', {}, 'Jeu suivant'),
      h('span', { class: 'chev', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>' })));
}
