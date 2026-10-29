// Écran d'accueil : le titre aux oreilles de Talya, puis les missions.
import { h, soundButton, ICONS, fmt, reducedMotion } from './core/ui.js';
import { bustSVG, earSVG, pinesSVG } from './core/talya.js';
import { get } from './core/store.js';
import { sfx } from './core/sound.js';
import { parse, trace } from './games/reacteur/engine.js';
import { drawBoard } from './games/reacteur/render.js';
import { MAIN, BONUS, loadSave } from './games/reacteur/game.js';
import { SAVE_KEY as FLAIR_KEY, COUNT as FLAIR_COUNT } from './games/flair/game.js';
import { SAVE_KEY as CS_KEY, COUNT as CS_COUNT } from './games/chaussette/game.js';
import { SAVE_KEY as PF_KEY, COUNTS as PF_COUNTS } from './games/prefs/game.js';
import { SAVE_KEY as IV_KEY, COUNT as IV_COUNT } from './games/interview/game.js';

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
    h('div', { class: 'mission-list' }, reacteurCard(), rivauxCard(), flairCard(), chaussetteCard(), prefsCard(), interviewCard()),
  );

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero-top' }, h('span', { class: 'rp-tag' }, 'Joyeux anniversaire Flo'), soundButton()),
    h('div', { class: 'wordmark-wrap' }, word),
    h('p', { class: 'tagline', html: 'Un jeu où <strong>Talya décide de tout.</strong> Comme d’habitude.' }),
    h('div', { class: 'bust', html: bustSVG() }),
    h('div', { class: 'pines', html: pinesSVG() }),
    h('div', { class: 'hero-cta' },
      h('button', { class: 'btn', type: 'button', onclick: () => missions.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }) }, 'Choisir une mission')),
  );

  const foot = h('footer', { class: 'hub-foot' },
    h('p', {}, 'Pour les 30 ans de Florian.'),
    h('p', {}, 'Conçu par Amélien, approuvé par Talya.'),
    h('p', { class: 'osb' }, h('a', { href: 'https://amelienito.github.io/', target: '_blank', rel: 'noopener' }, 'OSB Corporation')),
  );

  root.append(hero, missions, musicSection(), foot);
  if (location.hash === '#/missions') missions.scrollIntoView();

  const stop = startPreview(root.querySelector('.m-reacteur canvas'));
  return { unmount() { stop(); } };
}

function reacteurCard() {
  const save = loadSave();
  const ok = L => save.best[L.name] != null || !!save.answered[L.name];
  const done = MAIN.filter(ok).length;
  const bonus = BONUS.filter(ok).length;
  const progress = done === 0 ? `${MAIN.length} niveaux et ${BONUS.length} bonus` : done < MAIN.length ? `${done} sur ${MAIN.length} réussis` : bonus < BONUS.length ? `Terminé, bonus ${bonus} sur ${BONUS.length}` : 'Tout est réussi, bonus compris';
  return h('a', { class: 'mission playable m-reacteur', href: '#/reacteur' },
    h('div', { class: 'm-art' }, h('canvas', { 'aria-hidden': 'true' })),
    h('div', { class: 'm-body' },
      h('h3', {}, 'Réacteur'),
      h('p', {}, 'Talya a mangé le câble du Mac mini. Elle a jusqu’au retour de Flo pour tout réparer, l’air de rien.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, progress), h('span', { class: 'm-play' }, done ? 'Continuer' : 'Jouer'))));
}

function rivauxCard() {
  const save = get('rivaux', {});
  const best = save.best || 0;
  return h('a', { class: 'mission playable m-rivaux', href: '#/rivaux' },
    h('div', { class: 'm-art' },
      h('div', { class: 'm-art-inner rv-art', 'aria-hidden': 'true' },
        h('p', { class: 'rv-art-q' }, 'Lequel a le plus rapporté\u00A0?'),
        h('div', { class: 'rv-row' },
          h('div', { class: 'rv-card a' }, h('span', {}, 'Iron Man 3'), h('span', { class: 'v' }, '1,21 Md$')),
          h('div', { class: 'rv-vs' }, 'OU'),
          h('div', { class: 'rv-card b' }, h('span', {}, 'Thor : Ragnarok'), h('span', { class: 'v' }, '?'))))),
    h('div', { class: 'm-body' },
      h('h3', {}, 'Rivaux Marvel'),
      h('p', {}, 'Deux films ou deux héros, une question : lequel l’emporte ? Soixante secondes pour battre ton rival.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, best ? `Record ${fmt(best)}` : 'Aucun duel joué'), h('span', { class: 'm-play' }, 'Jouer'))));
}

// Lecteur de l'album Mode Créatif : YouTube par défaut (écoute complète sans compte),
// Spotify en option. Rien ne se charge avant le clic.
const ALBUM = {
  link: 'https://distrokid.com/hyperfollow/amlien/mode-cratif',
  youtube: 'https://www.youtube-nocookie.com/embed/videoseries?list=PL42zoNp9dj5BCSalsdGRNH0rQ8HqKd7cY',
  spotify: 'https://open.spotify.com/embed/album/2XBxyaoRctkr9uteKifL4Z?utm_source=generator&theme=0',
  cover: 'https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F10598506--9A21CD12-16C9-422F-87F4B22D118FB30B--0--4928066--MODECREATIF.jpg?fm=jpg&q=75&w=800&s=60972a3227b566cdb9fd6fe272b8da98',
};
function musicSection() {
  const slot = h('div', { class: 'mc-slot' });
  const frames = {
    youtube: () => h('iframe', { src: ALBUM.youtube, title: 'Mode Créatif sur YouTube', class: 'mc-yt', loading: 'lazy', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share', referrerpolicy: 'strict-origin-when-cross-origin', allowfullscreen: true, frameborder: '0' }),
    spotify: () => h('iframe', { src: ALBUM.spotify, title: 'Mode Créatif sur Spotify', class: 'mc-sp', height: '352', loading: 'lazy', allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture', frameborder: '0' }),
  };
  const tabs = h('div', { class: 'mc-tabs', role: 'tablist', 'aria-label': 'Lecteur' });
  const show = which => {
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.p === which ? 'true' : 'false'));
    const old = slot.querySelector('iframe');
    const f = frames[which]();
    if (old) old.replaceWith(f); else slot.append(f);
  };
  tabs.append(
    h('button', { type: 'button', role: 'tab', 'data-p': 'youtube', onclick: () => show('youtube') }, 'YouTube'),
    h('button', { type: 'button', role: 'tab', 'data-p': 'spotify', onclick: () => show('spotify') }, 'Spotify'));
  const play = h('button', { class: 'btn mc-play', type: 'button', onclick: () => {
    slot.append(tabs);
    show('youtube');
    play.remove();
  } }, h('span', { class: 'mc-tri', 'aria-hidden': 'true' }), 'Écouter ici');
  return h('section', { class: 'music' },
    h('div', { class: 'mc-card' },
      h('div', { class: 'mc-cover' }, h('span', { 'aria-hidden': 'true' }, 'MC'), h('img', { src: ALBUM.cover, alt: 'Pochette de Mode Créatif', width: '96', height: '96', loading: 'lazy', onerror: e => e.target.remove() })),
      h('div', { class: 'mc-info' },
        h('h2', {}, 'Mode Créatif'),
        h('p', {}, 'L’album d’Amélien, la bande-son officieuse de tes 30 ans.'),
        h('div', { class: 'mc-actions' }, play, h('a', { class: 'btn ghost', href: ALBUM.link, target: '_blank', rel: 'noopener' }, 'Toutes les plateformes')))),
    slot);
}

function progressOf(key, count) {
  const best = (get(key, {}).best) || {};
  const done = Object.keys(best).length;
  return done === 0 ? null : done >= count ? 'Tout est résolu' : `${done} sur ${count}`;
}

function flairCard() {
  const p = progressOf(FLAIR_KEY, FLAIR_COUNT);
  // une piste de ronds qui file, et une fausse piste de triangles qui bifurque
  const dots = [], tris = [];
  for (let k = 0; k < 16; k++) {
    const t = k / 15, x = 40 + t * 320, y = 150 - Math.sin(t * 3.1) * 70 - t * 30;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3.4 + t * 1.6).toFixed(1)}" fill="#ffc94d" opacity="${(0.35 + t * 0.6).toFixed(2)}"/>`);
  }
  for (let k = 0; k < 8; k++) {
    const t = k / 7, x = 180 + t * 150, y = 92 + t * 70;
    tris.push(`<polygon points="${x},${y - 5} ${x + 5},${y + 4} ${x - 5},${y + 4}" fill="#ff7aa8" opacity="${(0.25 + t * 0.4).toFixed(2)}"/>`);
  }
  const art = `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="flglow" cx="20%" cy="75%" r="70%"><stop offset="0" stop-color="#2a2048"/><stop offset="1" stop-color="#0a1311" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="220" fill="url(#flglow)"/>
    <g fill="#0e1f19">${[30, 110, 250, 330, 380].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 30 : 205}" r="${36 + i * 4}"/>`).join('')}</g>
    ${tris.join('')}${dots.join('')}
  </svg>`;
  return h('a', { class: 'mission playable m-flair', href: '#/flair' },
    h('div', { class: 'm-art', html: art }),
    h('div', { class: 'm-body' },
      h('h3', {}, 'Flair'),
      h('p', {}, 'Une enquête au nez dans la forêt de nuit. Suis la bonne odeur, ignore les saucisses.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, p ? `Affaires : ${p}` : `${FLAIR_COUNT} affaires`), h('span', { class: 'm-play' }, p ? 'Continuer' : 'Jouer'))));
}

function chaussetteCard() {
  const p = progressOf(CS_KEY, CS_COUNT);
  const planks = [...Array(9)].map((_, k) => `<rect x="0" y="${k * 26}" width="400" height="25" fill="${k % 2 ? '#2b2521' : '#2f2823'}"/>`).join('');
  const art = `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    ${planks}
    <defs><radialGradient id="cscone" cx="0" cy="0.5" r="1"><stop offset="0" stop-color="#ffd696" stop-opacity=".45"/><stop offset="1" stop-color="#ffd696" stop-opacity="0"/></radialGradient></defs>
    <polygon points="92,110 300,30 300,190" fill="url(#cscone)"/>
    <g transform="translate(80 110)"><ellipse cx="0" cy="0" rx="11" ry="17" fill="#3f8a52"/><circle cx="2" cy="0" r="9" fill="#3a2a20"/></g>
    <rect x="250" y="150" width="90" height="56" rx="8" fill="#8c6340"/>
    <g transform="translate(325 62)"><circle r="20" fill="#c9ced3"/><path d="M0 0L18 -9A20 20 0 0 1 20 3z" fill="#a0dcff" opacity=".6"/><circle r="9" fill="#d23c2c"/><circle r="3" fill="#1b1816"/></g>
    <g transform="translate(200 128) rotate(-12) scale(.8)"><rect x="-17" y="-22" width="34" height="44" fill="#f1ebdf"/><rect x="-17" y="-22" width="34" height="10" fill="#1d1a16"/><rect x="-12" y="-7" width="24" height="22" fill="#c8362b"/></g>
    <g transform="translate(372 118) rotate(18) scale(.8)"><rect x="-15" y="-15" width="30" height="30" rx="6" fill="#ffd23f"/><circle r="6" fill="none" stroke="#1d1a16" stroke-width="3.5"/></g>
  </svg>`;
  return h('a', { class: 'mission playable m-chaussette', href: '#/chaussette' },
    h('div', { class: 'm-art', html: art }),
    h('div', { class: 'm-body' },
      h('h3', {}, 'Opération Osmose'),
      h('p', {}, 'Voler les CD de Seta, les magazines et les stickers Osmose sans croiser le regard de Florian. Puis rentrer au panier, l’air de rien.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, p ? `Niveaux : ${p}` : `${CS_COUNT} niveaux`), h('span', { class: 'm-play' }, p ? 'Continuer' : 'Jouer'))));
}

function prefsCard() {
  const last = get(PF_KEY, null);
  return h('a', { class: 'mission playable m-prefs', href: '#/prefs' },
    h('div', { class: 'm-art' }, h('div', { class: 'm-art-inner pf-art', 'aria-hidden': 'true' },
      h('div', { class: 'x' }, 'L’armure Mark 85'), h('div', { class: 'o' }, 'OU'), h('div', { class: 'y' }, 'Soulever Mjolnir'))),
    h('div', { class: 'm-body' },
      h('h3', {}, 'Tu préfères ?'),
      h('p', {}, 'Des dilemmes Marvel, légers ou cornéliens, à toi de choisir. À la fin, ton profil de fan, à défendre devant Amélien.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, last && last.match ? `Avenger intérieur : ${last.match}` : `${PF_COUNTS.dilemmas + PF_COUNTS.corneliens} dilemmes`), h('span', { class: 'm-play' }, last ? 'Rejouer' : 'Jouer'))));
}

function interviewCard() {
  const read = !!get(IV_KEY, {}).read;
  return h('a', { class: 'mission playable m-interview', href: '#/interview' },
    h('div', { class: 'm-art' }, h('div', { class: 'm-art-inner iv-art', 'aria-hidden': 'true' },
      h('span', { class: 'k' }, 'Cul7ure · Entretien'),
      h('span', { class: 't' }, 'Woof.'),
      h('span', { class: 's' }, 'Talya se confie comme jamais.'))),
    h('div', { class: 'm-body' },
      h('h3', {}, 'L’interview'),
      h('p', {}, 'Figure majeure de la pop lyrique franco-canine, Talya répond enfin aux questions d’Amélien. Sans langue de bois.'),
      h('div', { class: 'm-foot' }, h('span', { class: 'm-progress' }, read ? 'Déjà lue' : `${IV_COUNT} questions`), h('span', { class: 'm-play' }, read ? 'Relire' : 'Lire'))));
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
