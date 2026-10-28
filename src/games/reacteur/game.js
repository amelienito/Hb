// Réacteur : faire pivoter les miroirs pour allumer tous les cœurs sans toucher les capteurs.
// 8 niveaux principaux, puis 2 niveaux bonus au choix. Talya trotte jusqu'à la colonne touchée.
import { h, backButton, soundButton, sheet, ICONS, buzz, reducedMotion } from '../../core/ui.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { drawTalya } from '../../core/talya.js';
import { parse, trace } from './engine.js';
import { drawBoard, targetAngle } from './render.js';
import { LEVELS } from './levels.js';

// 8 niveaux principaux + 2 bonus (choisis parmi les plus corsés)
export const MAIN = LEVELS.slice(0, 8).map((L, n) => ({ ...L, label: String(n + 1).padStart(2, '0') }));
export const BONUS = [LEVELS[9], LEVELS[11]].map((L, n) => ({ ...L, bonus: true, label: 'B' + (n + 1) }));
export const ALL = [...MAIN, ...BONUS];
export const SAVE_KEY = 'reacteur-v2';

const SPEED = 22; // vitesse de propagation du faisceau, en cases par seconde

const HINTS = {
  0: 'Touche un miroir pour le faire pivoter. Allume chaque cœur.',
  1: 'À chaque coup, le faisceau repart de l’émetteur : regarde où il file.',
  3: 'Un socle vide accepte un miroir. Touche-le pour en poser un.',
  4: 'La balle de Talya divise le faisceau en deux.',
  5: 'Les capteurs rouges coupent tout. Le faisceau ne doit pas les toucher.',
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
  const save = get(SAVE_KEY, { best: {}, last: 0 });
  save.best = save.best || {};
  const mainDone = () => MAIN.filter((_, n) => save.best[n] != null).length;
  const isOpen = n => {
    if (n < MAIN.length) return n === 0 || save.best[n - 1] != null || save.best[n] != null;
    return save.best[MAIN.length - 1] != null;
  };

  let li = isOpen(save.last || 0) ? (save.last || 0) : 0;
  let g, tr, moves, history, angles, scales, pressed = null, won = false, focus = null;
  const talya = { x: 0, tx: 0, face: 1, run: 0, hop: 0, hopV: 0, ears: 1, wag: 0 };
  let boost = 0;
  let reveal = { t0: 0, done: true }, ghost = null, pending = [];
  let alarmShown = false;

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
    li = n; save.last = n; set(SAVE_KEY, save);
    const L = ALL[n];
    g = parse(L.rows);
    moves = 0; history = []; won = false; pressed = null; focus = null;
    angles = new Map(); scales = new Map();
    for (const i of g.mut) angles.set(i, targetAngle(g.cells[i]));
    tr = trace(g);
    ghost = null; pending = [];
    reveal = { t0: performance.now(), done: false };
    alarmShown = false;
    levelEl.innerHTML = '';
    levelEl.append(h('small', {}, L.bonus ? 'Bonus : ' + L.name : L.name), L.label);
    parEl.textContent = L.par;
    hintEl.textContent = HINTS[n] || (L.bonus ? 'Niveau bonus. Prends ton temps.' : '');
    sizeCanvas();
    talya.x = talya.tx = ox + cs * 0.9;
    talya.face = 1;
    refresh();
  }

  function refresh() {
    movesEl.textContent = moves;
    undoBtn.disabled = history.length === 0 || won;
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

  // Recalcule le faisceau et relance sa propagation depuis l'émetteur.
  function after() {
    const prev = tr;
    tr = trace(g);
    ghost = { paths: prev.paths, alpha: 1 };
    reveal = { t0: performance.now(), done: false };
    alarmShown = false;
    // les sons suivent le faisceau : un cœur sonne quand le laser l'atteint
    pending = [];
    let n = 0;
    for (const [i, d] of tr.litDist) if (!prev.lit.has(i)) pending.push({ d, fn: () => sfx.lit(tr.lit.size + n++) });
    const wasAlarm = prev.alarmHit.size > 0;
    for (const [, d] of tr.alarmDist) pending.push({ d, fn: () => { if (!alarmShown) { alarmShown = true; if (!wasAlarm) { sfx.alarm(); buzz(40); } talya.ears = 0.2; } } });
    pending.sort((a, b) => a.d - b.d);
    if (tr.solved) { won = true; pending.push({ d: tr.maxDist, fn: win }); }
    refresh();
  }

  function walkTo(i) {
    const x = ox + ((i % g.w) + 0.5) * cs;
    talya.face = x >= talya.x ? 1 : -1;
    talya.tx = x;
  }

  function win() {
    const L = ALL[li];
    const prev = save.best[li];
    if (prev == null || moves < prev) save.best[li] = moves;
    set(SAVE_KEY, save);
    sfx.win();
    buzz(30);
    talya.hopV = 7;
    refresh();
    setTimeout(() => showWin(L, prev), reducedMotion() ? 200 : 1000);
  }

  function showWin(L, prev) {
    const perfect = moves <= L.par;
    const endOfMain = li === MAIN.length - 1;
    const bonusLeft = BONUS.map((_, k) => MAIN.length + k).filter(n => n !== li && save.best[n] == null);
    let close;
    const go = n => { close(); load(n); };
    const actions = [];
    if (endOfMain || L.bonus) {
      bonusLeft.forEach(n => actions.push(h('button', { class: 'btn', type: 'button', onclick: () => go(n) }, 'Bonus : ' + ALL[n].name)));
      actions.push(h('a', { class: 'btn' + (bonusLeft.length ? ' ghost' : ''), href: '#/' }, 'Retour aux missions'));
    } else {
      actions.push(h('button', { class: 'btn', type: 'button', onclick: () => go(li + 1) }, 'Niveau suivant'));
    }
    actions.push(h('button', { class: 'btn ghost', type: 'button', onclick: () => go(li) }, perfect ? 'Rejouer' : `Rejouer pour viser ${L.par}`));
    let title = perfect ? 'Au millimètre.' : 'Réacteur stabilisé.';
    let line = WIN_LINES[li % WIN_LINES.length];
    if (endOfMain) { title = 'Réacteur rallumé.'; line = 'Les 8 circuits tiennent. Deux niveaux bonus t’attendent, si tu as encore des neurones.'; }
    else if (L.bonus && !bonusLeft.length) { line = 'Bonus terminés. Talya peut retourner dormir sur le canapé.'; }
    close = sheet([
      h('h2', {}, title),
      h('p', {}, line),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, moves), h('span', {}, 'coups')),
        h('div', { class: 'stat' }, h('b', {}, L.par), h('span', {}, 'par')),
        prev != null ? h('div', { class: 'stat' }, h('b', {}, Math.min(prev, moves)), h('span', {}, 'record')) : null),
      h('div', { class: 'actions' }, actions),
    ], 'rx-sheet');
  }

  function openLevels() {
    let close;
    const btn = (L, n) => {
      const b = save.best[n];
      const cls = ['lv', b != null ? 'done' : '', b != null && b <= L.par ? 'perfect' : '', n === li ? 'current' : '', L.bonus ? 'bonus' : ''].join(' ');
      return h('button', { class: cls, type: 'button', disabled: !isOpen(n), 'aria-label': `${L.bonus ? 'Bonus' : 'Niveau'} ${L.label}, ${L.name}`, onclick: () => { close(); load(n); } }, L.bonus ? L.label : n + 1);
    };
    close = sheet([
      h('h2', {}, 'Niveaux'),
      h('p', {}, `${mainDone()} sur ${MAIN.length} réussis. Un point bleu : réussi au par ou mieux.`),
      h('div', { class: 'lv-grid' }, MAIN.map((L, n) => btn(L, n))),
      h('p', { class: 'lv-bonus-title' }, isOpen(MAIN.length) ? 'Bonus, dans l’ordre que tu veux' : 'Bonus : termine le niveau 8 pour les ouvrir'),
      h('div', { class: 'lv-grid' }, BONUS.map((L, k) => btn(L, MAIN.length + k))),
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Fermer')),
    ], 'rx-sheet');
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
    for (const [i, a] of angles) {
      const cur = displayAngles.has(i) ? displayAngles.get(i) : a;
      displayAngles.set(i, reducedMotion() ? a : cur + (a - cur) * Math.min(1, dt * 22));
    }
    for (const [i, s] of scales) { const n = s + (1 - s) * Math.min(1, dt * 16); if (n > 0.995) scales.delete(i); else scales.set(i, n); }

    // propagation du faisceau
    const reach = reducedMotion() ? Infinity : ((t - reveal.t0) / 1000) * SPEED;
    while (pending.length && pending[0].d <= reach) pending.shift().fn();
    if (ghost) ghost.alpha = Math.max(0, ghost.alpha - dt * 2.6);
    root.classList.toggle('alarm-on', alarmShown);

    boost += ((won && !pending.length ? 1 : 0) - boost) * Math.min(1, dt * 4);
    const d = talya.tx - talya.x;
    if (Math.abs(d) > 1) { talya.x += Math.sign(d) * Math.min(Math.abs(d), dt * cs * 7); talya.run += dt * 18; }
    talya.hop += talya.hopV; talya.hopV -= dt * 40;
    if (talya.hop <= 0) { talya.hop = 0; talya.hopV = won && !pending.length && !reducedMotion() ? (talya.hopV < -1 ? 4 : 0) : 0; }
    talya.ears += (1 - talya.ears) * Math.min(1, dt * (alarmShown ? 0.4 : 3));
    talya.wag += dt * (won ? 22 : 5);

    ctx.clearRect(0, 0, cw, chh);
    drawBoard(ctx, g, tr, { cs, ox, oy, t, angles: displayAngles, scales, pressed, focus, boost, reach, ghost });
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
