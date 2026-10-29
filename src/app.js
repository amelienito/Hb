// Routage minimal : chaque écran est un module qui exporte mount(racine) → { unmount }.
import { unlock } from './core/sound.js';

const ROUTES = {
  '': () => import('./hub.js'),
  reacteur: () => import('./games/reacteur/game.js'),
  rivaux: () => import('./games/rivaux/game.js'),
  chaussette: () => import('./games/chaussette/game.js'),
  flair: () => import('./games/flair/game.js'),
  prefs: () => import('./games/prefs/game.js'),
  interview: () => import('./games/interview/game.js'),
};

const app = document.getElementById('app');
let current = null;
let token = 0;

async function route() {
  const key = location.hash.replace(/^#\/?/, '').split('?')[0];
  const load = ROUTES[key] || ROUTES[''];
  const mine = ++token;
  const mod = await load();
  if (mine !== token) return;
  if (current && current.unmount) current.unmount();
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  app.innerHTML = '';
  const screen = document.createElement('main');
  screen.className = 'screen';
  app.append(screen);
  window.scrollTo(0, 0);
  current = mod.mount(screen) || null;
}

window.addEventListener('hashchange', route);
window.addEventListener('pointerdown', unlock, { once: true });
route();
