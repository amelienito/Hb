// Réacteur : faire pivoter les miroirs pour allumer tous les cœurs sans toucher les capteurs.
// 7 niveaux principaux, puis 2 niveaux bonus au choix. Talya trotte jusqu'à la colonne touchée.
import { h, backButton, soundButton, sheet, ICONS, buzz, reducedMotion } from '../../core/ui.js';
import { get, set } from '../../core/store.js';
import { sfx } from '../../core/sound.js';
import { drawTalya } from '../../core/talya.js';
import { parse, trace, solve } from './engine.js';
import { drawBoard, targetAngle } from './render.js';
import { LEVELS } from './levels.js';
import { nextMissionButton } from '../../core/nav.js';

// 7 niveaux principaux qui montent régulièrement (une mécanique nouvelle à la fois),
// puis les 2 circuits les plus corsés en bonus.
const MAIN_IDX = [0, 1, 3, 6, 7, 8, 9];
const BONUS_IDX = [10, 11];
export const MAIN = MAIN_IDX.map((k, n) => ({ ...LEVELS[k], label: String(n + 1).padStart(2, '0') }));
export const BONUS = BONUS_IDX.map((k, n) => ({ ...LEVELS[k], bonus: true, label: 'B' + (n + 1) }));
export const ALL = [...MAIN, ...BONUS];
export const SAVE_KEY = 'reacteur-v3';

// Sauvegarde par nom de niveau (et reprise de l'ancienne sauvegarde rangée par numéro).
export function loadSave() {
  let save = get(SAVE_KEY, null);
  if (!save) {
    save = { best: {}, answered: {} };
    const old = get('reacteur-v2', null);
    if (old && old.best) {
      const OLD = [...LEVELS.slice(0, 8), LEVELS[9], LEVELS[11]];
      for (const [k, v] of Object.entries(old.best)) if (OLD[k]) save.best[OLD[k].name] = v;
      save.intro = old.intro;
    }
    set(SAVE_KEY, save);
  }
  save.best = save.best || {}; save.answered = save.answered || {};
  return save;
}

const SPEED = 22; // vitesse de propagation du faisceau, en cases par seconde
const HINT_AFTER = 35;     // secondes avant de proposer un indice
const ANSWER_AFTER = 90;   // secondes avant de proposer la réponse

const HINTS = {
  0: 'Touche un miroir pour le faire pivoter. Allume chaque cœur avant que Flo rentre.',
  1: 'À chaque coup, le faisceau repart de l’émetteur : regarde où il file.',
  2: 'Un socle vide accepte un miroir. Touche-le pour en poser un.',
  3: 'Les capteurs rouges coupent tout. Le faisceau ne doit pas les toucher.',
  4: 'La balle de Talya divise le faisceau en deux.',
  5: 'Les miroirs vissés ne bougent pas. Fais avec.',
  6: 'Dernier circuit. Si tu bloques, un indice finira par arriver.',
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
  const save = loadSave();
  const done = n => save.best[ALL[n].name] != null || !!save.answered[ALL[n].name];
  const mainDone = () => MAIN.filter((_, n) => done(n)).length;
  const isOpen = n => {
    if (n < MAIN.length) return n === 0 || done(n - 1) || done(n);
    return done(MAIN.length - 1);
  };

  const firstTodo = Math.max(0, MAIN.findIndex((_, n) => !done(n)));
  let li = save.last != null && ALL[save.last] && isOpen(save.last) ? save.last : firstTodo;
  let g, tr, moves, history, angles, scales, pressed = null, won = false, focus = null;
  const talya = { x: 0, tx: 0, face: 1, run: 0, hop: 0, hopV: 0, ears: 1, wag: 0 };
  let boost = 0;
  let reveal = { t0: 0, done: true }, ghost = null, pending = [];
  let alarmShown = false;
  // aide : chrono de blocage, indices utilisés, case à montrer, réponse affichée
  let stuck = 0, hintsUsed = 0, hintCell = null, answered = false, solving = null;

  const levelEl = h('div', { class: 'rx-level' });
  const movesEl = h('b', {}, '0');
  const parEl = h('b', {}, '0');
  const hintEl = h('p', { class: 'rx-hint', 'aria-live': 'polite' });
  const canvas = h('canvas', { role: 'application', 'aria-label': 'Plateau du réacteur', tabindex: '0' });
  const undoBtn = h('button', { class: 'btn ghost', type: 'button', onclick: undo }, 'Annuler');
  const resetBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => load(li) }, 'Recommencer');
  const levelsBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Choisir un niveau', html: ICONS.grid, onclick: openLevels });
  const hintBtn = h('button', { class: 'btn rx-help', type: 'button', onclick: giveHint }, 'Un indice ?');
  const answerBtn = h('button', { class: 'btn ghost rx-help', type: 'button', onclick: showAnswer }, 'Voir la réponse');
  const helpRow = h('div', { class: 'rx-helprow' }, hintBtn, answerBtn);

  root.append(
    h('header', { class: 'g-bar' }, backButton(), h('div', { class: 'g-title' }, 'Réacteur'), levelsBtn),
    h('div', { class: 'rx-head' }, levelEl,
      h('div', { class: 'rx-counts' },
        h('div', {}, movesEl, h('span', {}, 'coups')),
        h('div', { class: 'par' }, parEl, h('span', {}, 'par')))),
    h('div', { class: 'rx-board' }, canvas),
    hintEl,
    helpRow,
    h('div', { class: 'rx-tools' }, undoBtn, resetBtn, soundButton()),
  );

  const ctx = canvas.getContext('2d');
  let cs = 48, ox = 0, oy = 0, cw = 0, chh = 0, stripH = 0;

  function sizeCanvas() {
    const boardBox = canvas.parentElement.getBoundingClientRect();
    const availW = Math.min(boardBox.width, 520) - 4;
    const availH = Math.max(260, window.innerHeight - 360);
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
    stuck = 0; hintsUsed = 0; hintCell = null; answered = false; clearInterval(solving); solving = null;
    angles = new Map(); scales = new Map();
    for (const i of g.mut) angles.set(i, targetAngle(g.cells[i]));
    tr = trace(g);
    ghost = null; pending = [];
    reveal = { t0: performance.now(), done: false };
    alarmShown = false;
    levelEl.innerHTML = '';
    levelEl.append(h('small', {}, L.bonus ? 'Bonus : ' + L.name : L.name), L.label);
    parEl.textContent = L.par;
    hintEl.textContent = HINTS[n] || (L.bonus ? 'Niveau bonus. Prends ton temps : un indice arrive si tu bloques.' : '');
    sizeCanvas();
    talya.x = talya.tx = ox + cs * 0.9;
    talya.face = 1;
    refresh();
  }

  function refresh() {
    movesEl.textContent = moves;
    undoBtn.disabled = history.length === 0 || won;
    const L = ALL[li];
    // l'aide apparaît quand on bloque : après un moment, ou après beaucoup de coups
    const showHint = !won && !solving && (stuck > HINT_AFTER || moves > L.par + 8);
    const showAnswer = !won && !solving && (stuck > ANSWER_AFTER || hintsUsed >= 3);
    hintBtn.hidden = !showHint;
    answerBtn.hidden = !showAnswer;
    helpRow.classList.toggle('on', showHint || showAnswer);
  }

  // Résout depuis l'état actuel et renvoie, pour chaque pièce mobile, l'état visé.
  function solutionFromHere() {
    const r = solve(g);
    if (!r.best) return null;
    return g.mut.map((i, j) => ({ i, want: r.best[j], cur: g.cells[i].s }));
  }

  function giveHint() {
    const sol = solutionFromHere();
    if (!sol) return;
    const wrong = sol.filter(o => o.want !== o.cur);
    if (!wrong.length) return;
    const o = wrong[0];
    hintCell = o.i;
    hintsUsed++;
    const c = g.cells[o.i];
    const taps = c.t === 'socket' ? (o.want - o.cur + 3) % 3 : 1;
    const n = taps === 2 ? 'deux touches' : 'une touche';
    hintEl.textContent = c.t === 'socket' && o.want === 0 ? `Indice : le socle qui clignote doit être vide (${n}).` : taps === 2 ? 'Indice : la pièce qui clignote, deux touches.' : 'Indice : touche la pièce qui clignote.';
    walkTo(o.i);
    sfx.tap();
    refresh();
  }

  // Joue la solution pièce par pièce. Le niveau compte comme réussi, sans record.
  function showAnswer() {
    const sol = solutionFromHere();
    if (!sol || solving) return;
    answered = true;
    hintCell = null;
    hintEl.textContent = 'Voilà la réponse. Talya ne dira rien à personne.';
    const steps = [];
    for (const o of sol) {
      const c = g.cells[o.i];
      const taps = c.t === 'socket' ? (o.want - o.cur + 3) % 3 : (o.want !== o.cur ? 1 : 0);
      for (let k = 0; k < taps; k++) steps.push(o.i);
    }
    solving = setInterval(() => {
      if (!steps.length || won) { clearInterval(solving); solving = null; refresh(); return; }
      act(steps.shift(), true);
    }, reducedMotion() ? 120 : 380);
    refresh();
  }

  function act(i, auto = false) {
    if (won || (solving && !auto)) return;
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
    if (hintCell === i) {
      // indice suivi : on efface le repère dès que la pièce est dans le bon état
      const sol = solutionFromHere();
      const o = sol && sol.find(q => q.i === i);
      if (!o || o.want === o.cur) { hintCell = null; hintEl.textContent = 'Bien. Continue comme ça.'; }
    }
    after();
  }

  function undo() {
    if (!history.length || won || solving) return;
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
    if (tr.solved) { won = true; hintCell = null; pending.push({ d: tr.maxDist, fn: win }); }
    refresh();
  }

  function walkTo(i) {
    const x = ox + ((i % g.w) + 0.5) * cs;
    talya.face = x >= talya.x ? 1 : -1;
    talya.tx = x;
  }

  function win() {
    const L = ALL[li];
    const prev = save.best[L.name];
    if (answered) save.answered[L.name] = true;
    else if (prev == null || moves < prev) save.best[L.name] = moves;
    set(SAVE_KEY, save);
    sfx.win();
    buzz(30);
    talya.hopV = 7;
    refresh();
    setTimeout(() => showWin(L, prev), reducedMotion() ? 200 : 1000);
  }

  function showWin(L, prev) {
    const perfect = !answered && moves <= L.par;
    const endOfMain = li === MAIN.length - 1;
    const bonusLeft = BONUS.map((_, k) => MAIN.length + k).filter(n => n !== li && !done(n));
    let close;
    const go = n => { close(); load(n); };
    const actions = [];
    const replay = h('button', { class: 'btn ghost', type: 'button', onclick: () => go(li) }, answered ? 'Rejouer sans aide' : perfect ? 'Rejouer' : `Rejouer pour viser ${L.par}`);
    if (endOfMain || L.bonus) {
      // un seul bonus proposé à la fois (l'autre reste dans la grille des niveaux)
      if (bonusLeft.length) actions.push(h('button', { class: 'btn', type: 'button', onclick: () => go(bonusLeft[0]) }, 'Bonus : ' + ALL[bonusLeft[0]].name));
      actions.push(nextMissionButton('reacteur', !bonusLeft.length));
      if (!perfect) actions.push(replay);
      actions.push(h('a', { class: 'btn ghost', href: '#/missions' }, 'Retour aux missions'));
    } else {
      actions.push(h('button', { class: 'btn', type: 'button', onclick: () => go(li + 1) }, 'Niveau suivant'));
      actions.push(replay);
    }
    let title = answered ? 'Réacteur rétabli.' : perfect ? 'Au millimètre.' : 'Réacteur stabilisé.';
    let line = answered ? 'Avec la réponse, mais rétabli. La prochaine fois, sans aide ?' : WIN_LINES[li % WIN_LINES.length];
    if (endOfMain && !answered) { title = 'Réacteur rallumé.'; line = `Les ${MAIN.length} circuits tiennent. Deux niveaux bonus t’attendent, si tu as encore des neurones.`; }
    else if (L.bonus && !bonusLeft.length) { line = 'Bonus terminés. Talya peut retourner dormir sur le canapé.'; }
    close = sheet([
      h('h2', {}, title),
      h('p', {}, line),
      h('div', { class: 'stat-row' },
        h('div', { class: 'stat' }, h('b', {}, moves), h('span', {}, 'coups')),
        h('div', { class: 'stat' }, h('b', {}, L.par), h('span', {}, 'par')),
        hintsUsed ? h('div', { class: 'stat' }, h('b', {}, hintsUsed), h('span', {}, hintsUsed > 1 ? 'indices' : 'indice')) : null,
        prev != null && !answered ? h('div', { class: 'stat' }, h('b', {}, Math.min(prev, moves)), h('span', {}, 'record')) : null),
      h('div', { class: 'actions' }, actions),
    ], 'rx-sheet');
  }

  function openLevels() {
    let close;
    const btn = (L, n) => {
      const b = save.best[L.name];
      const cls = ['lv', done(n) ? 'done' : '', b != null && b <= L.par ? 'perfect' : '', n === li ? 'current' : '', L.bonus ? 'bonus' : ''].join(' ');
      return h('button', { class: cls, type: 'button', disabled: !isOpen(n), 'aria-label': `${L.bonus ? 'Bonus' : 'Niveau'} ${L.label}, ${L.name}`, onclick: () => { close(); load(n); } }, L.bonus ? L.label : n + 1);
    };
    close = sheet([
      h('h2', {}, 'Niveaux'),
      h('p', {}, `${mainDone()} sur ${MAIN.length} réussis. Un point bleu : réussi au par ou mieux, sans aide.`),
      h('div', { class: 'lv-grid' }, MAIN.map((L, n) => btn(L, n))),
      h('p', { class: 'lv-bonus-title' }, isOpen(MAIN.length) ? 'Bonus, dans l’ordre que tu veux' : `Bonus : termine le niveau ${MAIN.length} pour les ouvrir`),
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
    // chrono de blocage : seulement quand on joue (pas de fenêtre ouverte, onglet visible)
    if (!won && !document.hidden && !document.querySelector('.overlay')) {
      const before = stuck;
      stuck += dt;
      if ((before <= HINT_AFTER && stuck > HINT_AFTER) || (before <= ANSWER_AFTER && stuck > ANSWER_AFTER)) refresh();
    }
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
    if (hintCell != null && !won) {
      // repère de l'indice : un anneau doré qui respire autour de la pièce
      const hx = ox + ((hintCell % g.w) + 0.5) * cs, hy = oy + (Math.floor(hintCell / g.w) + 0.5) * cs;
      const p = reducedMotion() ? 0.5 : 0.5 + 0.5 * Math.sin(t / 220);
      ctx.save();
      ctx.strokeStyle = `rgba(227,176,75,${0.55 + 0.4 * p})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(227,176,75,.8)'; ctx.shadowBlur = 10 * p;
      ctx.beginPath(); ctx.arc(hx, hy, cs * (0.5 + 0.06 * p), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const gy = oy + g.h * cs + stripH * 0.86;
    ctx.fillStyle = 'rgba(125,235,255,.06)';
    ctx.fillRect(ox, gy, g.w * cs, 1);
    drawTalya(ctx, talya.x, gy, { s: cs / 46, face: talya.face, run: talya.run, hop: talya.hop, ears: talya.ears, wag: talya.wag });
    raf = requestAnimationFrame(frame);
  }

  load(li);
  raf = requestAnimationFrame(frame);
  // accès pour les tests automatiques
  window.__rx = { setStuck(v) { stuck = v; refresh(); }, get hintCell() { return hintCell; }, get level() { return li; }, load };
  // petite mise en contexte, la première fois
  if (!save.intro) {
    let close;
    close = sheet([
      h('h2', {}, 'Le câble du Mac mini.'),
      h('p', {}, 'Talya a mangé le câble du Mac mini de Florian. Heureusement, elle s’y connaît en informatique : si elle rétablit le courant avant que Flo rentre, il ne saura jamais rien.'),
      h('p', {}, 'Fais pivoter les miroirs pour guider le laser jusqu’à chaque cœur. Les capteurs rouges coupent tout.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: () => { save.intro = true; set(SAVE_KEY, save); close(); } }, 'Au boulot')),
    ], 'rx-sheet');
  }
  if (window.matchMedia('(pointer: fine)').matches) canvas.focus({ preventScroll: true });

  return {
    unmount() { alive = false; clearInterval(solving); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); },
  };
}
