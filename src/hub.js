// Écran d'accueil : le titre aux oreilles de Talya, puis les missions.
import { h, soundButton, ICONS, fmt, reducedMotion } from './core/ui.js';
import { bustSVG, earSVG, pinesSVG } from './core/talya.js';
import { get } from './core/store.js';
import { sfx } from './core/sound.js';
import { parse, trace } from './games/reacteur/engine.js';
import { drawBoard } from './games/reacteur/render.js';
import { LEVELS } from './games/reacteur/levels.js';

let booted = false;

export function mount(root) {
  root.classList.add('hub');
  if (!booted) { root.classList.add('boot'); booted = true; }

  const word = h('h1', { class: 'wordmark', 'aria-label': 'Talya' },
    h('span', { class: 'ch', 'aria-hidden': 'true' }, 'T'),
    h('span', { class: 'ear l', 'aria-hidden': 'true', html: earSVG() }),
    h('span', { class: 'ch', 'aria-hidden': 'true' }, 'L'),
    h('span', { class: 'ch', 'aria-hidden': 'true' }, 'Y'),
    h('span', { class: 'ear r', 'aria-hidden': 'true', html: earSVG() }),
  );
  word.addEventListener('click', () => {
    word.classList.remove('twitch'); void word.offsetWidth; word.classList.add('twitch');
    sfx.ears();
  });

  const missions = h('section', { class: 'missions', id: 'missions' },
    h('h2', {}, 'Missions'),
    h('div', { class: 'mission-list' }, reacteurCard(), rivauxCard(),
      lockedCard('Flair', 'Une enquête menée au nez.', ICONS.nose),
      lockedCard('Opération chaussette', 'Voler sans se faire voir.', ICONS.sock)),
  );

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero-top' }, h('span', { class: 'rp-tag', title: 'Role play' }, 'RP'), soundButton()),
    h('div', { class: 'wordmark-wrap' }, word),
    h('p', { class: 'tagline', html: 'Un jeu de rôle où <strong>Talya décide de tout.</strong> Comme d’habitude.' }),
    h('div', { class: 'bust', html: bustSVG() }),
    h('div', { class: 'pines', html: pinesSVG() }),
    h('div', { class: 'hero-cta' },
      h('button', { class: 'btn', type: 'button', onclick: () => missions.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }) }, 'Choisir une mission')),
  );

  const foot = h('footer', { class: 'hub-foot' },
    h('p', {}, 'Pour les 30 ans de Florian.'),
    h('p', {}, 'Conçu par Amélien. Approuvé par Talya, sous réserve.'),
  );

  root.append(hero, missions, foot);
  if (location.hash === '#/missions') missions.scrollIntoView();

  const stop = startPreview(root.querySelector('.m-reacteur canvas'));
  return { unmount() { stop(); } };
}

function reacteurCard() {
  const save = get('reacteur', { best: {} });
  const done = Object.keys(save.best || {}).length;
  const progress = done === 0 ? `${LEVELS.length} niveaux` : done >= LEVELS.length ? 'Tous les niveaux réussis' : `${done} sur ${LEVELS.length} réussis`;
  return h('a', { class: 'mission playable m-reacteur', href: '#/reacteur' },
    h('div', { class: 'm-art' }, h('canvas', { 'aria-hidden': 'true' })),
    h('div', { class: 'm-body' },
      h('h3', {}, 'Réacteur'),
      h('p', {}, 'Talya a rongé les câbles de l’atelier. Rallume le réacteur avant que Florian rentre.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, progress), h('span', { class: 'm-play' }, done ? 'Continuer' : 'Jouer'))));
}

function rivauxCard() {
  const save = get('rivaux', {});
  const best = save.best || 0;
  return h('a', { class: 'mission playable m-rivaux', href: '#/rivaux' },
    h('div', { class: 'm-art' },
      h('div', { class: 'm-art-inner rv-art', 'aria-hidden': 'true' },
        h('div', { class: 'rv-card a' }, h('span', {}, 'Iron Man 3'), h('span', { class: 'v' }, '1,21 Md$')),
        h('div', { class: 'rv-vs' }, 'OU'),
        h('div', { class: 'rv-card b' }, h('span', {}, 'Thor : Ragnarok'), h('span', { class: 'v' }, '?')))),
    h('div', { class: 'm-body' },
      h('h3', {}, 'Rivaux Marvel'),
      h('p', {}, 'Soixante secondes, deux choix à chaque fois, et un rival qui ne lâche rien.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, best ? `Record ${fmt(best)}` : 'Aucun duel joué'), h('span', { class: 'm-play' }, 'Jouer'))));
}

function lockedCard(title, line, icon) {
  return h('div', { class: 'mission locked', 'aria-disabled': 'true' },
    h('span', { class: 'lock', html: icon }),
    h('div', {}, h('h3', {}, title), h('p', {}, line)),
    h('span', { class: 'soon' }, 'Bientôt'));
}

// Aperçu vivant d'un petit circuit déjà résolu.
function startPreview(canvas) {
  if (!canvas) return () => {};
  const g = parse([
    '>..\\..#',
    '...T...',
    '...\\.T/',
    '.......',
  ]);
  const tr = trace(g);
  let raf = 0, alive = true;
  const ctx = canvas.getContext('2d');
  const paint = (t) => {
    if (!alive) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(r.width * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    const cs = Math.min((r.width - 40) / g.w, (r.height - 36) / g.h);
    const ox = (r.width - cs * g.w) / 2, oy = (r.height - cs * g.h) / 2 + 6;
    drawBoard(ctx, g, tr, { cs, ox, oy, t });
    if (!reducedMotion()) raf = requestAnimationFrame(paint);
  };
  raf = requestAnimationFrame(paint);
  return () => { alive = false; cancelAnimationFrame(raf); };
}
