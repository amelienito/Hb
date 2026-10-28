// Réacteur : faire pivoter les miroirs pour allumer tous les cœurs sans toucher les capteurs.
// Talya fait le travail : elle trotte jusqu'à la colonne touchée.
import { h, backButton, soundButton, sheet, ICONS, buzz, reducedMotion } from '../../core/ui.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { drawTalya } from '../../core/talya.js';
import { parse, trace } from './engine.js';
import { drawBoard, targetAngle } from './render.js';
import { LEVELS } from './levels.js';

const HINTS = {
  0: 'Touche un miroir pour le faire pivoter. Allume chaque cœur.',
  3: 'Un socle vide accepte un miroir. Touche-le pour en poser un.',
  4: 'La balle de Talya divise le faisceau en deux.',
  5: 'Les capteurs rouges coupent tout. Le faisceau ne doit pas les toucher.',
  8: 'Les miroirs vissés ne bougent pas. Fais avec.',
};

const WIN_LINES = [
  'Florian ne saura jamais.',
  'Talya nie toute implication.',
  'Aucune preuve. Aucun témoin.',
  'Le courant revient, la chaussette reste introuvable.',
  'Réparé avec les dents, mais réparé.',
];

export function mount(root) {
  root.classList.add('g-screen', 'reacteur');
  const save = get('reacteur', { best: {}, last: 0 });
  save.best = save.best || {};
  const unlockedUpTo = () => Math.min(LEVELS.length - 1, Object.keys(save.best).reduce((m, k) => Math.max(m, +k + 1), 0));

  let li = Math.min(save.last || 0, unlockedUpTo());
  let g, tr, moves, history, angles, scales, pressed = null, won = false, focus = null;
  let talya = { x: 0, tx: 0, face: 1, run: 0, hop: 0, hopV: 0, ears: 1, wag: 0 };
  let litBefore = new Set(), alarmBefore = false, boost = 0;

  const levelEl = h('div', { class: 'rx-level' });
  const movesEl = h('b', {}, '0');
  const parEl = h('b', {}, '0');
  const hintEl = h('p', { class: 'rx-hint', 'aria-live': 'polite' });
  const canvas = h('canvas', { role: 'application', 'aria-label': 'Plateau du réacteur', tabindex: '0' });
  const undoBtn = h('button', { class: 'btn ghost', type: 'button', onclick: undo }, 'Annuler');
  const resetBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => load(li) }, 'Recommencer');
  const levelsBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Choisir un niveau', html: ICONS.grid, onclick: openLevels });

  root.append(
    h('header', { class: 'g-bar' }, backButton(), h('div', { class: 'g-title' }, 'Réacteur'), levelsBtn),
    h('div', { class: 'rx-head' }, levelEl,
      h('div', { class: 'rx-counts' },
        h('div', {}, movesEl, h('span', {}, 'coups')),
        h('div', { class: 'par' }, parEl, h('span', {}, 'par')))),
    h('div', { class: 'rx-board' }, canvas),
    hintEl,
    h('div', { class: 'rx-tools' }, undoBtn, resetBtn, soundButton()),
  );

  const ctx = canvas.getContext('2d');
  let cs = 48, ox = 0, oy = 0, cw = 0, chh = 0, stripH = 0;

  function sizeCanvas() {
    const boardBox = canvas.parentElement.getBoundingClientRect();
    const availW = Math.min(boardBox.width, 520) - 4;
    const availH = Math.max(260, window.innerHeight - 330);
    cs = Math.floor(Math.min(availW / (g.w + 0.4), availH / (g.h + 1.3)));
    cs = Math.max(34, Math.min(cs, 72));
    stripH = Math.round(cs * 1.15);
    cw = Math.round(cs * g.w + 16);
    chh = Math.round(cs * g.h + 16 + stripH);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cw * dpr; canvas.height = chh * dpr;
    canvas.style.width = cw + 'px'; canvas.style.height = chh + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ox = 8; oy = 8;
  }

  function load(n) {
    li = n; save.last = n; set('reacteur', save);
    const L = LEVELS[n];
    g = parse(L.rows);
    moves = 0; history = []; won = false; pressed = null; focus = null;
    angles = new Map(); scales = new Map();
    for (const i of g.mut) angles.set(i, targetAngle(g.cells[i]));
    tr = trace(g);
    litBefore = new Set(tr.lit); alarmBefore = tr.alarmHit.size > 0;
    levelEl.innerHTML = '';
    levelEl.append(h('small', {}, L.name), String(n + 1).padStart(2, '0'));
    parEl.textContent = L.par;
    hintEl.textContent = HINTS[n] || '';
    sizeCanvas();
    talya.x = talya.tx = ox + cs * 0.9;
    talya.face = 1;
    refresh();
  }

  function refresh() {
    movesEl.textContent = moves;
    undoBtn.disabled = history.length === 0;
    root.classList.toggle('alarm-on', tr.alarmHit.size > 0);
  }

  function act(i) {
    if (won) return;
    const c = g.cells[i];
    if (c.t !== 'mirror' && c.t !== 'socket') { sfx.tap(); return; }
    history.push([i, c.s]);
    if (c.t === 'mirror') {
      c.s = 1 - c.s;
      angles.set(i, angles.get(i) + 90);
      sfx.rotate();
    } else {
      c.s = (c.s + 1) % 3;
      if (c.s === 1) { angles.set(i, -45); scales.set(i, 0.2); sfx.place(); }
      else if (c.s === 2) { angles.set(i, angles.get(i) + 90); sfx.rotate(); }
      else { sfx.tap(); }
    }
    moves++;
    buzz(8);
    walkTo(i);
    after();
  }

  function undo() {
    if (!history.length || won) return;
    const [i, s] = history.pop();
    const c = g.cells[i];
    if (c.t === 'mirror') angles.set(i, angles.get(i) - 90);
    c.s = s;
    if (c.t === 'socket' && s > 0) angles.set(i, targetAngle(c));
    moves = Math.max(0, moves - 1);
    sfx.tap();
    after();
  }

  function after() {
    tr = trace(g);
    let n = 0;
    for (const t of tr.lit) if (!litBefore.has(t)) { sfx.lit(tr.lit.size + n); n++; }
    const alarmNow = tr.alarmHit.size > 0;
    if (alarmNow && !alarmBefore) { sfx.alarm(); buzz(40); talya.ears = 0.2; }
    litBefore = new Set(tr.lit); alarmBefore = alarmNow;
    refresh();
    if (tr.solved) win();
  }

  function walkTo(i) {
    const x = ox + ((i % g.w) + 0.5) * cs;
    talya.face = x >= talya.x ? 1 : -1;
    talya.tx = x;
  }

  function win() {
    won = true;
    const L = LEVELS[li];
    const prev = save.best[li];
    if (prev == null || moves < prev) save.best[li] = moves;
    set('reacteur', save);
    sfx.win();
    buzz(30);
    talya.hopV = 7;
    setTimeout(() => showWin(L, prev), reducedMotion() ? 200 : 1100);
  }

  function showWin(L, prev) {
    const perfect = moves <= L.par;
    const last = li === LEVELS.length - 1;
    const line = WIN_LINES[li % WIN_LINES.length];
    let close;
    const next = () => { close(); load(li + 1); };
    const again = () => { close(); load(li); };
    close = sheet([
      h('h2', {}, perfect ? 'Au millimètre.' : 'Réacteur stabilisé.'),
      h('p', {}, last ? 'Tous les circuits sont rétablis. Talya peut retourner dormir sur le canapé.' : line),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, moves), h('span', {}, 'coups')),
        h('div', { class: 'stat' }, h('b', {}, L.par), h('span', {}, 'par')),
        prev != null ? h('div', { class: 'stat' }, h('b', {}, Math.min(prev, moves)), h('span', {}, 'record')) : null),
      h('div', { class: 'actions' },
        last ? h('a', { class: 'btn', href: '#/' }, 'Retour aux missions') : h('button', { class: 'btn', type: 'button', onclick: next }, 'Niveau suivant'),
        h('button', { class: 'btn ghost', type: 'button', onclick: again }, perfect ? 'Rejouer' : `Rejouer pour viser ${L.par}`)),
    ], 'rx-sheet');
  }

  function openLevels() {
    const max = unlockedUpTo();
    let close;
    const grid = h('div', { class: 'lv-grid' }, LEVELS.map((L, n) => {
      const b = save.best[n];
      const cls = ['lv', b != null ? 'done' : '', b != null && b <= L.par ? 'perfect' : '', n === li ? 'current' : ''].join(' ');
      return h('button', { class: cls, type: 'button', disabled: n > max, 'aria-label': `Niveau ${n + 1}, ${L.name}`, onclick: () => { close(); load(n); } }, n + 1);
    }));
    close = sheet([h('h2', {}, 'Niveaux'), h('p', {}, 'Un point bleu : niveau réussi en dessous du par.'), grid,
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Fermer'))], 'rx-sheet');
  }

  // --- saisie ---
  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - ox) / cs), y = Math.floor((e.clientY - r.top - oy) / cs);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return -1;
    return y * g.w + x;
  }
  canvas.addEventListener('pointerdown', e => {
    const i = cellAt(e);
    if (i < 0) return;
    e.preventDefault();
    focus = null;
    pressed = i;
    act(i);
    setTimeout(() => { if (pressed === i) pressed = null; }, 160);
  });
  canvas.addEventListener('keydown', e => {
    const moveKeys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (focus == null && (moveKeys[e.key] || e.key === 'Enter' || e.key === ' ')) { focus = g.mut[0] ?? 0; e.preventDefault(); return; }
    if (moveKeys[e.key]) {
      const [dx, dy] = moveKeys[e.key];
      const x = Math.max(0, Math.min(g.w - 1, (focus % g.w) + dx)), y = Math.max(0, Math.min(g.h - 1, Math.floor(focus / g.w) + dy));
      focus = y * g.w + x; e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') { act(focus); e.preventDefault(); }
    else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) { undo(); e.preventDefault(); }
  });
  const onResize = () => { const keep = talya.tx - ox; sizeCanvas(); talya.x = talya.tx = ox + Math.min(keep, cs * g.w); };
  window.addEventListener('resize', onResize);

  // --- boucle de rendu ---
  let raf = 0, last = performance.now(), alive = true;
  const displayAngles = new Map();
  function frame(t) {
    if (!alive) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    // rotations adoucies
    for (const [i, a] of angles) {
      const cur = displayAngles.has(i) ? displayAngles.get(i) : a;
      displayAngles.set(i, reducedMotion() ? a : cur + (a - cur) * Math.min(1, dt * 22));
    }
    for (const [i, s] of scales) { const n = s + (1 - s) * Math.min(1, dt * 16); if (n > 0.995) scales.delete(i); else scales.set(i, n); }
    boost += ((won ? 1 : 0) - boost) * Math.min(1, dt * 4);
    // Talya
    const d = talya.tx - talya.x;
    if (Math.abs(d) > 1) { talya.x += Math.sign(d) * Math.min(Math.abs(d), dt * cs * 7); talya.run += dt * 18; }
    talya.hop += talya.hopV; talya.hopV -= dt * 40;
    if (talya.hop <= 0) { talya.hop = 0; talya.hopV = won && !reducedMotion() ? (talya.hopV < -1 ? 4 : 0) : 0; }
    talya.ears += (1 - talya.ears) * Math.min(1, dt * (tr.alarmHit.size ? 0.4 : 3));
    talya.wag += dt * (won ? 22 : 5);

    ctx.clearRect(0, 0, cw, chh);
    const view = { cs, ox, oy, t, angles: displayAngles, scales, pressed, focus, boost };
    drawBoard(ctx, g, tr, view);
    // bande où Talya se déplace
    const gy = oy + g.h * cs + stripH * 0.86;
    ctx.fillStyle = 'rgba(125,235,255,.06)';
    ctx.fillRect(ox, gy, g.w * cs, 1);
    drawTalya(ctx, talya.x, gy, { s: cs / 46, face: talya.face, run: talya.run, hop: talya.hop, ears: talya.ears, wag: talya.wag });
    raf = requestAnimationFrame(frame);
  }

  load(li);
  raf = requestAnimationFrame(frame);
  if (window.matchMedia('(pointer: fine)').matches) canvas.focus({ preventScroll: true });

  return {
    unmount() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); },
  };
}
